#!/usr/bin/env python3
"""Import the August 2026 object and visual-description Word datasets."""

import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from copy import deepcopy
from pathlib import Path
from xml.etree import ElementTree
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from build_data import determine_catalog, should_show_historical, split_observations


DATA_JSON = ROOT / "data" / "data.json"
SRC_DATA_JSON = ROOT / "src" / "data.json"
METADATA_JSON = ROOT / "data" / "metadata.json"
SRC_METADATA_JSON = ROOT / "src" / "metadata.json"
MANIFEST_JSON = ROOT / "data" / "august_2026_import.json"
COLLISION_BASELINE_JSON = ROOT / "data" / "august_2026_collision_baseline.json"

NEW_FIELDS = (
    "Name",
    "Other",
    "Type",
    "Nickname",
    "Class",
    "RA2000",
    "Dec2000",
    "Size",
    "PA",
    "VMag",
    "BMag",
    "SB",
    "Con",
    "NGC Description",
    "Discovery Date",
    "Historical",
    "Visual Description",
)
UPDATE_FIELDS = ("Name", "Visual Description")
FAVORITES_TO_REMOVE = ("IC 2613", "NGC 3550", "K 3-67", "NGC 3")
PRIMARY_RENAMES = {
    "Herbig-Haro 398": "V375 Lac Nebula",
    "Hoag's Ring": "Hoag's Object",
    "MWC 1080": "Herbig 26",
}
SOURCE_REPLACEMENTS = {
    "6 Ser": "6 Ser",
    "UGC 11804": "UGC 11804",
}
CONFIRMED_KEEP_BOTH_COLLISIONS = {
    "Gum 55": {
        "replacementTarget": "NGC 6231",
        "retainIncomingRecord": True,
        "safeTargetOther": "Cr 315 = Mel 153",
        "status": "keepBothConfirmed",
        "decision": "keepBoth",
        "reason": (
            "User confirmed that Gum 55 and NGC 6231 are separate records; "
            "preserve all 11 NGC 6231 observations."
        ),
    },
    "Gum 56": {
        "replacementTarget": "IC 4628",
        "retainIncomingRecord": True,
        "status": "keepBothConfirmed",
        "decision": "keepBoth",
        "reason": (
            "User confirmed that Gum 56 must be imported as a separate record "
            "with its two supplied observations while IC 4628 remains unchanged, "
            "even though both records refer to the same object."
        ),
    },
    "Sh 2-116": {
        "replacementTarget": "Abell 71",
        "retainIncomingRecord": True,
        "status": "keepBothConfirmed",
        "decision": "keepBoth",
        "reason": (
            "User confirmed that Sh 2-116 must be imported as a separate record "
            "with its supplied observation while Abell 71 remains unchanged, "
            "even though both records refer to the same object."
        ),
    },
}
UNRESOLVED_COLLISIONS = {}
COLLISION_STATES = {
    **CONFIRMED_KEEP_BOTH_COLLISIONS,
    **UNRESOLVED_COLLISIONS,
}
VISUAL_UPDATE_OVERRIDES = {"S 698"}
DUPLICATE_PRIMARY_MERGES = {
    "UGC 1859": {
        "canonicalObservationDate": "1/14/26",
        "requiredObservationDates": ("1/14/26", "12/3/24"),
        "reason": (
            "The baseline contains two rows with identical coordinates and aliases; "
            "retain the newer structured fields and both observations."
        ),
    },
}
EXPECTED_NEW_RECORDS = 111
EXPECTED_VISUAL_UPDATES = 141
DEFAULT_UPDATE_DATE = "2026-08-19"
MANUAL_NEW_OBJECTS = (
    {
        "Name": "S 698",
        "Other": "",
        "Type": "**",
        "Nickname": "",
        "Class": "",
        "RA2000": "18 04 12.6",
        "Dec2000": "-22 30 03",
        "Size": '30"',
        "PA": "",
        "VMag": "7.2/8.5",
        "BMag": "",
        "SB": "",
        "Con": "Sgr",
        "NGC Description": "",
        "Discovery Date": "",
        "Historical": "",
        "Visual Description": (
            '14.5" (7/25/26): wide, bright pair of mag 7.2/8.5 star '
            "at the center of M21 using 66x."
        ),
    },
)
MANUAL_OBSERVATION_REPLACEMENTS = {
    "UGC 11804": (
        '24" (8/11/26): at 327x and 375x; faint, fairly large low surface '
        "brightness oval glow, elongated 2:1 or 5:2 ~E-W. A pair of mag "
        '13-13.5 stars with a separation of ~12" is at the S edge. UGC 11804 '
        'forms an interacting 30" pair with UGC 11805 at the NE edge '
        "(perhaps they were merged in the eyepiece). UGC 11800 is 7' W in a "
        "very rich Cygnus star field."
        "\n\n"
        '17.5" (6/28/00): this interacting double system (with UGC 11805) '
        "appeared very faint, small (probably viewed core only). Closely "
        "bracketed by a close pair of mag 13 stars at the SW edge and a mag "
        "12.5 star to the NE. At moments, there was a strong impression of "
        "the close companion attached to the mag 12.5 star [just 32\" between "
        "centers]. UGC 11804 was very difficult to track down as it is "
        "situated in a rich Milky Way field with a patchy background."
    ),
    "S 698": (
        '14.5" (7/25/26): wide, bright pair of mag 7.2/8.5 stars at the '
        "center of M21 using 66x."
        "\n\n"
        '18" (8/12/10): In the center of M21 is the brightest member; mag '
        '7.2 HD 164863. This star forms a 30" pair (S 698) with mag 8.7 '
        "HD 313693. A third bright star, mag 8.8 HD 164883 lies 1.2' NE of "
        "the brightest star and a short line of stars extending NE contains "
        "two additional mag 10 and 11 stars."
    ),
}

WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
WORD_TEXT = f"{{{WORD_NS}}}t"
WORD_TAB = f"{{{WORD_NS}}}tab"
WORD_BREAKS = {f"{{{WORD_NS}}}br", f"{{{WORD_NS}}}cr"}


def _paragraph_text(paragraph):
    pieces = []
    for node in paragraph.iter():
        if node.tag == WORD_TEXT:
            pieces.append(node.text or "")
        elif node.tag == WORD_TAB:
            pieces.append("\t")
        elif node.tag in WORD_BREAKS:
            pieces.append("\n")
    return "".join(pieces)


def extract_docx_text(path):
    with ZipFile(path) as archive:
        root = ElementTree.fromstring(archive.read("word/document.xml"))
    paragraphs = root.findall(f".//{{{WORD_NS}}}p")
    return "\n".join(_paragraph_text(paragraph) for paragraph in paragraphs)


def parse_docx(path, fields, expected_records):
    text = extract_docx_text(path)
    field_separator_count = text.count("÷")
    record_separator_count = text.count("¿")
    if record_separator_count != expected_records:
        raise ValueError(
            f"{path.name}: expected {expected_records} record terminators, "
            f"found {record_separator_count}"
        )
    expected_field_separators = expected_records * (len(fields) - 1)
    if field_separator_count != expected_field_separators:
        raise ValueError(
            f"{path.name}: expected {expected_field_separators} field separators, "
            f"found {field_separator_count}"
        )

    chunks = text.split("¿")
    if chunks[-1].strip():
        raise ValueError(f"{path.name}: found non-whitespace text after final terminator")

    records = []
    for record_number, chunk in enumerate(chunks[:-1], 1):
        values = chunk.strip("\r\n").split("÷")
        if len(values) != len(fields):
            raise ValueError(
                f"{path.name}: record {record_number} has {len(values)} fields, "
                f"expected {len(fields)}"
            )
        records.append(dict(zip(fields, values)))

    names = [record["Name"] for record in records]
    duplicate_names = sorted(name for name, count in Counter(names).items() if count > 1)
    if duplicate_names:
        raise ValueError(f"{path.name}: duplicate source names: {duplicate_names}")

    source = {
        "file": path.name,
        "docxSha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "extractedTextSha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
        "recordCount": len(records),
        "fieldSeparatorCount": field_separator_count,
        "recordSeparatorCount": record_separator_count,
    }
    return records, source


def load_json(path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def json_bytes(value, *, indent=None, line_ending="\n"):
    text = json.dumps(value, ensure_ascii=False, indent=indent)
    if indent is not None:
        text += "\n"
    if line_ending != "\n":
        text = text.replace("\n", line_ending)
    return text.encode("utf-8")


def write_json(path, value, *, indent=None, line_ending="\n"):
    temp_path = path.with_name(f"{path.name}.tmp")
    temp_path.write_bytes(
        json_bytes(value, indent=indent, line_ending=line_ending)
    )
    temp_path.replace(path)


def validate_manifest_records(records, fields, expected_records, label):
    if len(records) != expected_records:
        raise ValueError(
            f"{label}: expected {expected_records} records, found {len(records)}"
        )
    for record_number, record in enumerate(records, 1):
        if len(record) != len(fields) or set(record) != set(fields):
            raise ValueError(
                f"{label}: record {record_number} fields differ from schema"
            )
    names = [record["Name"] for record in records]
    duplicate_names = sorted(
        name for name, count in Counter(names).items() if count > 1
    )
    if duplicate_names:
        raise ValueError(f"{label}: duplicate source names: {duplicate_names}")


def index_by_name(objects):
    index = {}
    for obj in objects:
        index.setdefault(obj["name"].casefold(), []).append(obj)
    return index


def split_aliases(value):
    return [
        token.strip()
        for token in re.split(r"\s*=\s*|\s*;\s*", value or "")
        if token.strip()
    ]


def alias_tokens(obj):
    tokens = set()
    for value in (obj.get("other", ""), obj.get("nickname", "")):
        tokens.update(token.casefold() for token in split_aliases(value))
    return tokens


def alias_index(objects):
    index = {}
    for obj in objects:
        for token in alias_tokens(obj):
            index.setdefault(token, set()).add(obj["name"])
    return index


def find_alias_collisions(source_records, objects):
    names = index_by_name(objects)
    aliases = alias_index(objects)
    primary_name_collisions = []
    alternate_collisions = []

    for record in source_records:
        source_name = record["Name"]
        if source_name.casefold() not in names:
            matches = sorted(aliases.get(source_name.casefold(), ()))
            if matches:
                primary_name_collisions.append(
                    {"sourceName": source_name, "existingPrimaryNames": matches}
                )

        collisions = {}
        for source_alias in split_aliases(record["Other"]):
            matches = {
                obj["name"] for obj in names.get(source_alias.casefold(), ())
            }
            matches.update(aliases.get(source_alias.casefold(), ()))
            matches.discard(source_name)
            if matches:
                collisions[source_alias] = sorted(matches)
        if collisions:
            alternate_collisions.append(
                {"sourceName": source_name, "aliases": collisions}
            )

    return primary_name_collisions, alternate_collisions


def rename_primary(objects, old_name, new_name):
    names = index_by_name(objects)
    old_matches = names.get(old_name.casefold(), [])
    new_matches = names.get(new_name.casefold(), [])
    if old_matches and new_matches:
        raise ValueError(f"both old and new primary names exist: {old_name}, {new_name}")
    if len(old_matches) > 1 or len(new_matches) > 1:
        raise ValueError(f"ambiguous primary rename: {old_name} -> {new_name}")
    if old_matches:
        obj = old_matches[0]
        obj["name"] = new_name
        catalog, catalog_number = determine_catalog(new_name)
        obj["catalog"] = catalog
        obj["catalogNumber"] = catalog_number
        return True
    if new_matches:
        return False
    raise ValueError(f"primary rename source not found: {old_name}")


def source_to_object(record):
    name = record["Name"]
    catalog, catalog_number = determine_catalog(name)
    historical = record["Historical"]
    historical_eligible = should_show_historical(name, catalog)
    ngc_description = record["NGC Description"]
    if ngc_description and not historical_eligible:
        raise ValueError(
            f"NGC Description is only valid for original NGC/IC objects: {name}"
        )
    return {
        "name": name,
        "other": record["Other"],
        "type": record["Type"],
        "nickname": record["Nickname"],
        "class": record["Class"],
        "ra": record["RA2000"],
        "dec": record["Dec2000"],
        "size": record["Size"],
        "pa": record["PA"],
        "vmag": record["VMag"],
        "bmag": record["BMag"],
        "sb": record["SB"],
        "con": record["Con"],
        "ngcDescription": ngc_description,
        "discoveryDate": record["Discovery Date"],
        "observations": split_observations(record["Visual Description"]),
        "historical": historical,
        "showHistorical": historical_eligible and bool(historical),
        "catalog": catalog,
        "catalogNumber": catalog_number,
        "isTopObject": False,
        "isOrionAtlas": False,
        "isMessier": False,
        "messierNumber": "",
        "references": "",
    }


def apply_unresolved_collision_states(objects, source_records):
    baseline = load_json(COLLISION_BASELINE_JSON)
    baseline_by_name = {record["name"]: record for record in baseline["records"]}
    source_by_name = {record["Name"]: record for record in source_records}
    resolved = []
    unresolved = []
    ambiguous = []

    for source_name, decision in COLLISION_STATES.items():
        target_name = decision["replacementTarget"]
        names = index_by_name(objects)
        source_matches = names.get(source_name.casefold(), [])
        target_matches = names.get(target_name.casefold(), [])
        if len(source_matches) > 1 or len(target_matches) > 1:
            ambiguous.append(
                {
                    "sourceName": source_name,
                    "replacementTarget": target_name,
                    "sourcePrimaryRows": len(source_matches),
                    "targetPrimaryRows": len(target_matches),
                }
            )
            continue

        original_baseline_record = deepcopy(baseline_by_name[target_name])
        baseline_record = deepcopy(original_baseline_record)
        if "safeTargetOther" in decision:
            baseline_record["other"] = decision["safeTargetOther"]

        if target_matches:
            target_index = objects.index(target_matches[0])
            objects[target_index] = baseline_record
        else:
            insert_at = (
                objects.index(source_matches[0])
                if source_matches
                else len(objects)
            )
            objects.insert(insert_at, baseline_record)

        incoming = source_by_name[source_name]
        incoming_object = source_to_object(incoming)
        if decision["retainIncomingRecord"]:
            if source_matches:
                objects[objects.index(source_matches[0])] = incoming_object
            else:
                objects.append(incoming_object)
        elif source_matches:
            ambiguous.append(
                {
                    "sourceName": source_name,
                    "replacementTarget": target_name,
                    "sourcePrimaryRows": len(source_matches),
                    "targetPrimaryRows": len(target_matches),
                    "reason": (
                        "Unexpected source row exists for a collision whose "
                        "recovered safe state retains only the existing target"
                    ),
                }
            )
            continue

        evidence = replacement_identity_evidence(
            incoming, original_baseline_record
        )
        collision_result = {
            "sourceName": source_name,
            "replacementTarget": target_name,
            "status": decision.get("status", "pendingParentDecision"),
            "safeState": (
                "incoming and existing records both retained"
                if decision["retainIncomingRecord"]
                else "existing target retained; incoming text preserved in manifest"
            ),
            "incomingPresentInOutput": decision["retainIncomingRecord"],
            "existingObservationCount": len(
                baseline_record.get("observations", [])
            ),
            "incomingObservationCount": len(
                incoming_object.get("observations", [])
            ),
            "targetAliasesInBaseline": split_aliases(
                original_baseline_record.get("other", "")
            ),
            "targetAliasesInSafeState": split_aliases(
                baseline_record.get("other", "")
            ),
            "identityEvidence": evidence,
            "reason": decision.get(
                "reason",
                "Replacement would delete distinct existing observations",
            ),
        }
        if source_name in CONFIRMED_KEEP_BOTH_COLLISIONS:
            collision_result["decision"] = decision["decision"]
            resolved.append(collision_result)
        else:
            unresolved.append(collision_result)

    signed_target = "MCG +01-60-011"
    signed_matches = index_by_name(objects).get(signed_target.casefold(), [])
    if len(signed_matches) > 1:
        ambiguous.append(
            {
                "sourceName": "MCG -01-60-011",
                "replacementTarget": signed_target,
                "sourcePrimaryRows": len(
                    index_by_name(objects).get("mcg -01-60-011", [])
                ),
                "targetPrimaryRows": len(signed_matches),
            }
        )
    elif not signed_matches:
        incoming_matches = index_by_name(objects).get("mcg -01-60-011", [])
        insert_at = (
            objects.index(incoming_matches[0]) if len(incoming_matches) == 1
            else len(objects)
        )
        objects.insert(insert_at, baseline_by_name[signed_target])

    return {
        "resolvedCollisions": resolved,
        "unresolvedCollisions": unresolved,
        "ambiguousCollisionMatches": ambiguous,
        "baselineSource": baseline["source"],
    }


def replacement_identity_evidence(record, existing):
    source_designations = {
        record["Name"].casefold(),
        *{
            token.casefold()
            for token in split_aliases(record["Other"])
        },
    }
    existing_designations = {existing["name"].casefold(), *alias_tokens(existing)}
    shared_designations = sorted(source_designations & existing_designations)
    coordinates_match = (
        record["RA2000"] == existing.get("ra", "")
        and record["Dec2000"] == existing.get("dec", "")
    )
    return {
        "sharedDesignations": shared_designations,
        "coordinatesMatch": coordinates_match,
        "sourceCoordinates": [record["RA2000"], record["Dec2000"]],
        "existingCoordinates": [existing.get("ra", ""), existing.get("dec", "")],
    }


def merge_duplicate_primary_records(objects):
    merged = []
    for name, decision in DUPLICATE_PRIMARY_MERGES.items():
        matches = index_by_name(objects).get(name.casefold(), [])
        if not matches:
            raise ValueError(f"duplicate merge target not found: {name}")

        canonical_matches = [
            obj
            for obj in matches
            if any(
                observation.get("date")
                == decision["canonicalObservationDate"]
                for observation in obj.get("observations", [])
            )
        ]
        if len(canonical_matches) != 1:
            raise ValueError(
                f"duplicate merge canonical row is ambiguous: {name}"
            )

        canonical = deepcopy(canonical_matches[0])
        observations = []
        for obj in [canonical_matches[0], *(
            match for match in matches if match is not canonical_matches[0]
        )]:
            for observation in obj.get("observations", []):
                if observation not in observations:
                    observations.append(deepcopy(observation))
        canonical["observations"] = observations

        required_dates = set(decision["requiredObservationDates"])
        actual_dates = {
            observation.get("date", "") for observation in observations
        }
        if not required_dates.issubset(actual_dates):
            raise ValueError(
                f"duplicate merge would lose observations for {name}: "
                f"{sorted(required_dates - actual_dates)}"
            )

        first_index = min(objects.index(match) for match in matches)
        match_ids = {id(match) for match in matches}
        objects[:] = [obj for obj in objects if id(obj) not in match_ids]
        objects.insert(first_index, canonical)

        merged.append(
            {
                "name": name,
                "canonicalObservationDate": decision[
                    "canonicalObservationDate"
                ],
                "observationDates": [
                    observation.get("date", "") for observation in observations
                ],
                "mergedRowsRemoved": len(matches) - 1,
                "alreadyMerged": len(matches) == 1,
                "reason": decision["reason"],
            }
        )
    return merged


def apply_new_objects(objects, source_records, previous_replacements):
    inserted_names = []
    replacements = []
    ambiguous_new_objects = []
    ambiguous_replacements = []
    identity_warnings = []

    for record in source_records:
        names = index_by_name(objects)
        source_name = record["Name"]
        collision = COLLISION_STATES.get(source_name)
        if collision and not collision["retainIncomingRecord"]:
            continue
        source = source_to_object(record)
        replacement_target = SOURCE_REPLACEMENTS.get(source_name)

        if replacement_target:
            source_matches = names.get(source_name.casefold(), [])
            target_matches = names.get(replacement_target.casefold(), [])
            same_primary = source_name.casefold() == replacement_target.casefold()

            if same_primary:
                if len(source_matches) != 1:
                    ambiguous_replacements.append(
                        {
                            "sourceName": source_name,
                            "replacementTarget": replacement_target,
                            "matchingPrimaryRows": len(source_matches),
                        }
                    )
                    continue
                target = source_matches[0]
                evidence = replacement_identity_evidence(record, target)
                objects[objects.index(target)] = source
                duplicate_rows_removed = 0
                already_replaced = False
            elif len(target_matches) > 1:
                ambiguous_replacements.append(
                    {
                        "sourceName": source_name,
                        "replacementTarget": replacement_target,
                        "matchingPrimaryRows": len(target_matches),
                    }
                )
                continue
            elif len(target_matches) == 1:
                target = target_matches[0]
                evidence = replacement_identity_evidence(record, target)
                target_index = objects.index(target)
                duplicate_source_rows = [
                    obj for obj in source_matches if obj is not target
                ]
                duplicate_ids = {id(obj) for obj in duplicate_source_rows}
                objects[target_index] = source
                objects[:] = [
                    obj for obj in objects if id(obj) not in duplicate_ids
                ]
                duplicate_rows_removed = len(duplicate_source_rows)
                already_replaced = False
            elif len(source_matches) == 1:
                target = source_matches[0]
                previous = previous_replacements.get(source_name)
                evidence = (
                    previous["identityEvidence"]
                    if previous
                    else {
                        "sharedDesignations": [source_name.casefold()],
                        "coordinatesMatch": True,
                        "sourceCoordinates": [
                            record["RA2000"],
                            record["Dec2000"],
                        ],
                        "existingCoordinates": [
                            target.get("ra", ""),
                            target.get("dec", ""),
                        ],
                    }
                )
                objects[objects.index(target)] = source
                duplicate_rows_removed = 0
                already_replaced = True
            else:
                ambiguous_replacements.append(
                    {
                        "sourceName": source_name,
                        "replacementTarget": replacement_target,
                        "matchingPrimaryRows": 0,
                    }
                )
                continue

            if not evidence["sharedDesignations"] and not evidence["coordinatesMatch"]:
                identity_warnings.append(
                    {
                        "sourceName": source_name,
                        "replacementTarget": replacement_target,
                        **evidence,
                    }
                )
            replacements.append(
                {
                    "sourceName": source_name,
                    "replacementTarget": replacement_target,
                    "duplicateSourceRowsRemoved": duplicate_rows_removed,
                    "alreadyReplaced": already_replaced,
                    "identityEvidence": evidence,
                }
            )
            continue

        matches = names.get(source_name.casefold(), [])
        if not matches:
            objects.append(source)
            inserted_names.append(source_name)
        elif len(matches) == 1:
            objects[objects.index(matches[0])] = source
        else:
            ambiguous_new_objects.append(
                {
                    "sourceName": source_name,
                    "matches": [obj["name"] for obj in matches],
                }
            )

    return {
        "insertedNames": inserted_names,
        "replacements": replacements,
        "ambiguousNewObjectMatches": ambiguous_new_objects,
        "ambiguousReplacementCollisions": ambiguous_replacements,
        "identityWarnings": identity_warnings,
    }


def apply_manual_objects(objects):
    inserted = []
    replaced = []
    ambiguous = []
    for record in MANUAL_NEW_OBJECTS:
        source = source_to_object(record)
        matches = index_by_name(objects).get(record["Name"].casefold(), [])
        if not matches:
            objects.append(source)
            inserted.append(record["Name"])
        elif len(matches) == 1:
            objects[objects.index(matches[0])] = source
            replaced.append(record["Name"])
        else:
            ambiguous.append(
                {
                    "sourceName": record["Name"],
                    "matches": [obj["name"] for obj in matches],
                }
            )
    return {
        "insertedNames": inserted,
        "replacedNames": replaced,
        "ambiguousMatches": ambiguous,
    }


def apply_visual_updates(objects, update_records):
    names = index_by_name(objects)
    matched = 0
    changed = 0
    missing = []
    ambiguous = []
    overridden = []
    matches_audit = []

    for record in update_records:
        matches = names.get(record["Name"].casefold(), [])
        if not matches:
            missing.append(record["Name"])
            continue
        if len(matches) > 1:
            ambiguous.append(
                {
                    "sourceName": record["Name"],
                    "matches": [obj["name"] for obj in matches],
                }
            )
            continue
        matched += 1
        before_observations = matches[0].get("observations", [])
        source_observations = split_observations(record["Visual Description"])
        if record["Name"] in VISUAL_UPDATE_OVERRIDES:
            overridden.append(record["Name"])
            matches_audit.append(
                {
                    "sourceName": record["Name"],
                    "matchedPrimaryName": matches[0]["name"],
                    "sourceTextSha256": hashlib.sha256(
                        record["Visual Description"].encode("utf-8")
                    ).hexdigest(),
                    "sourceObservationCount": len(source_observations),
                    "beforeObservationCount": len(before_observations),
                    "afterObservationCount": len(before_observations),
                    "changedThisRun": False,
                    "status": "supersededByApprovedRecord",
                }
            )
            continue
        changed_this_run = before_observations != source_observations
        if changed_this_run:
            matches[0]["observations"] = source_observations
            changed += 1
        matches_audit.append(
            {
                "sourceName": record["Name"],
                "matchedPrimaryName": matches[0]["name"],
                "sourceTextSha256": hashlib.sha256(
                    record["Visual Description"].encode("utf-8")
                ).hexdigest(),
                "sourceObservationCount": len(source_observations),
                "beforeObservationCount": len(before_observations),
                "afterObservationCount": len(source_observations),
                "changedThisRun": changed_this_run,
                "status": "matchedAndApplied",
            }
        )

    return {
        "parsedCount": len(update_records),
        "matchedCount": matched,
        "appliedCount": matched - len(overridden),
        "approvedOverrideCount": len(overridden),
        "missingNames": missing,
        "ambiguousMatches": ambiguous,
        "changedCount": changed,
        "overriddenNames": overridden,
        "matches": matches_audit,
    }


def apply_manual_observation_replacements(objects):
    names = index_by_name(objects)
    replacements = []
    for name, visual_description in MANUAL_OBSERVATION_REPLACEMENTS.items():
        matches = names.get(name.casefold(), [])
        if len(matches) != 1:
            raise ValueError(
                f"manual observation replacement {name!r} has "
                f"{len(matches)} matches"
            )
        before = deepcopy(matches[0].get("observations", []))
        after = split_observations(visual_description)
        if len(after) != 2:
            raise ValueError(
                f"manual observation replacement {name!r} must contain "
                f"exactly two observations, found {len(after)}"
            )
        matches[0]["observations"] = after
        replacements.append(
            {
                "name": name,
                "beforeCount": len(before),
                "afterCount": len(after),
                "changedThisRun": before != after,
                "visualDescriptionSha256": hashlib.sha256(
                    visual_description.encode("utf-8")
                ).hexdigest(),
            }
        )
    return replacements


def apply_designation_overrides(objects):
    renamed = []
    for old_name, new_name in PRIMARY_RENAMES.items():
        renamed.append(
            {
                "from": old_name,
                "to": new_name,
                "changedThisRun": rename_primary(objects, old_name, new_name),
            }
        )

    names = index_by_name(objects)
    if len(names.get("herbig 26", [])) != 1:
        raise ValueError("Herbig 26 does not resolve uniquely")
    herbig = names["herbig 26"][0]
    herbig["other"] = "GN 23.15.3 = MWC 1080 = V628 Cas"

    if len(names.get("hoag's object", [])) != 1:
        raise ValueError("Hoag's Object does not resolve uniquely")
    hoag = names["hoag's object"][0]
    for observation in hoag.get("observations", []):
        observation["text"] = observation.get("text", "").replace(
            "Hoag's Ring", "Hoag's Object"
        )

    return renamed


def remove_favorites(objects):
    names = index_by_name(objects)
    baseline = load_json(COLLISION_BASELINE_JSON)
    baseline_references = baseline["favoriteReferences"]
    updated = []
    for name in FAVORITES_TO_REMOVE:
        matches = names.get(name.casefold(), [])
        if len(matches) != 1:
            raise ValueError(f"favorite target {name!r} has {len(matches)} matches")
        obj = matches[0]
        before = obj.get("references", "")
        expected_before = baseline_references[name]
        expected_after = expected_before.replace("t", "")
        if before not in (expected_before, expected_after):
            raise ValueError(
                f"favorite target {name!r} has unexpected references {before!r}"
            )
        obj["references"] = before.replace("t", "")
        obj["isTopObject"] = False
        updated.append(
            {
                "name": name,
                "baselineReferences": expected_before,
                "referencesBeforeThisRun": before,
                "referencesAfter": obj["references"],
                "removedThisRun": "t" in before,
            }
        )
    return updated


def build_metadata(objects, update_date):
    type_counts = Counter(obj.get("type", "") for obj in objects if obj.get("type"))
    catalog_counts = Counter(obj.get("catalog", "") for obj in objects)
    constellations = sorted({obj.get("con", "") for obj in objects if obj.get("con")})
    return {
        "totalRecords": len(objects),
        "totalObservations": sum(len(obj.get("observations", [])) for obj in objects),
        "constellations": constellations,
        "types": dict(type_counts.most_common()),
        "catalogs": dict(catalog_counts.most_common()),
        "topObjectCount": sum(bool(obj.get("isTopObject")) for obj in objects),
        "orionAtlasCount": sum(bool(obj.get("isOrionAtlas")) for obj in objects),
        "lastUpdated": update_date,
    }


def validate_final_state(objects, new_records, update_records):
    names = index_by_name(objects)
    folded_name_counts = Counter(obj["name"].casefold() for obj in objects)
    duplicate_primary_names = sorted(
        name for name, count in folded_name_counts.items() if count > 1
    )
    if duplicate_primary_names:
        raise ValueError(
            f"duplicate primary names after import: {duplicate_primary_names}"
        )

    source_by_name = {record["Name"]: record for record in new_records}
    baseline = load_json(COLLISION_BASELINE_JSON)
    baseline_by_name = {record["name"]: record for record in baseline["records"]}

    verified_replacements = []
    for source_name in SOURCE_REPLACEMENTS:
        matches = names.get(source_name.casefold(), [])
        expected = source_to_object(source_by_name[source_name])
        if source_name in MANUAL_OBSERVATION_REPLACEMENTS:
            expected["observations"] = split_observations(
                MANUAL_OBSERVATION_REPLACEMENTS[source_name]
            )
        if len(matches) != 1 or matches[0] != expected:
            raise ValueError(f"replacement record does not match source: {source_name}")
        verified_replacements.append(source_name)

    verified_manual_objects = []
    for record in MANUAL_NEW_OBJECTS:
        matches = names.get(record["Name"].casefold(), [])
        expected = source_to_object(record)
        if record["Name"] in MANUAL_OBSERVATION_REPLACEMENTS:
            expected["observations"] = split_observations(
                MANUAL_OBSERVATION_REPLACEMENTS[record["Name"]]
            )
        if len(matches) != 1 or matches[0] != expected:
            raise ValueError(
                f"manual object does not match approved record: {record['Name']}"
            )
        verified_manual_objects.append(record["Name"])

    verified_visual_updates = 0
    for record in update_records:
        matches = names.get(record["Name"].casefold(), [])
        if len(matches) != 1:
            raise ValueError(
                f"visual update does not resolve uniquely: {record['Name']}"
            )
        if record["Name"] not in VISUAL_UPDATE_OVERRIDES:
            expected = split_observations(record["Visual Description"])
            if matches[0].get("observations", []) != expected:
                raise ValueError(
                    f"visual update was not preserved exactly: {record['Name']}"
                )
        verified_visual_updates += 1
    if verified_visual_updates != EXPECTED_VISUAL_UPDATES:
        raise ValueError(
            f"expected {EXPECTED_VISUAL_UPDATES} verified visual updates, "
            f"found {verified_visual_updates}"
        )

    verified_observation_replacements = []
    for name, visual_description in MANUAL_OBSERVATION_REPLACEMENTS.items():
        matches = names.get(name.casefold(), [])
        expected = split_observations(visual_description)
        if len(matches) != 1 or matches[0].get("observations", []) != expected:
            raise ValueError(
                f"manual observation replacement was not preserved exactly: {name}"
            )
        verified_observation_replacements.append(
            {
                "name": name,
                "observationCount": len(expected),
                "visualDescriptionSha256": hashlib.sha256(
                    visual_description.encode("utf-8")
                ).hexdigest(),
            }
        )

    verified_renames = []
    for old_name, new_name in PRIMARY_RENAMES.items():
        if names.get(old_name.casefold(), []):
            raise ValueError(f"old primary name remains after rename: {old_name}")
        if len(names.get(new_name.casefold(), [])) != 1:
            raise ValueError(f"renamed primary does not resolve uniquely: {new_name}")
        verified_renames.append({"from": old_name, "to": new_name})

    herbig = names["herbig 26"][0]
    if herbig.get("other") != "GN 23.15.3 = MWC 1080 = V628 Cas":
        raise ValueError("Herbig 26 alternate designations are not exact")
    hoag = names["hoag's object"][0]
    if any(
        "Hoag's Ring" in observation.get("text", "")
        for observation in hoag.get("observations", [])
    ):
        raise ValueError("old Hoag's Ring wording remains in a visual description")

    source_eligibility = []
    for record in new_records:
        catalog, _ = determine_catalog(record["Name"])
        eligible = should_show_historical(record["Name"], catalog)
        if record["NGC Description"] and not eligible:
            raise ValueError(
                "incoming NGC Description is not from an original NGC/IC "
                f"object: {record['Name']}"
            )
        source_eligibility.append(
            {
                "name": record["Name"],
                "historicalDisplayEligible": eligible,
                "hasNgcDescription": bool(record["NGC Description"]),
            }
        )
    ic_4468 = names.get("ic 4468", [])
    if (
        len(ic_4468) != 1
        or not ic_4468[0].get("showHistorical")
        or not ic_4468[0].get("ngcDescription")
    ):
        raise ValueError("IC 4468 display eligibility was not preserved")
    invalid_historical_flags = [
        obj["name"]
        for obj in objects
        if obj.get("showHistorical")
        and not should_show_historical(obj["name"], obj.get("catalog", ""))
    ]
    if invalid_historical_flags:
        raise ValueError(
            "non-NGC/IC objects have historical display eligibility: "
            f"{invalid_historical_flags}"
        )

    verified_favorites = []
    for name in FAVORITES_TO_REMOVE:
        matches = names.get(name.casefold(), [])
        if (
            len(matches) != 1
            or matches[0].get("isTopObject")
            or "t" in matches[0].get("references", "")
        ):
            raise ValueError(f"favorite removal was not preserved: {name}")
        verified_favorites.append(name)

    verified_duplicate_merges = []
    for name, decision in DUPLICATE_PRIMARY_MERGES.items():
        matches = names.get(name.casefold(), [])
        if len(matches) != 1:
            raise ValueError(f"duplicate merge is not unique: {name}")
        observation_dates = {
            observation.get("date", "")
            for observation in matches[0].get("observations", [])
        }
        required_dates = set(decision["requiredObservationDates"])
        if not required_dates.issubset(observation_dates):
            raise ValueError(
                f"duplicate merge is missing observations: {name}"
            )
        verified_duplicate_merges.append(
            {
                "name": name,
                "observationCount": len(matches[0].get("observations", [])),
                "observationDates": sorted(observation_dates),
            }
        )

    verified_resolved_collisions = []
    verified_unresolved_collisions = []
    for source_name, decision in COLLISION_STATES.items():
        target_name = decision["replacementTarget"]
        source_matches = names.get(source_name.casefold(), [])
        target_matches = names.get(target_name.casefold(), [])
        expected_source_count = 1 if decision["retainIncomingRecord"] else 0
        if (
            len(source_matches) != expected_source_count
            or len(target_matches) != 1
        ):
            raise ValueError(
                f"unresolved collision safe state is not unique: "
                f"{source_name}, {target_name}"
            )

        target_obj = target_matches[0]
        expected_target = deepcopy(baseline_by_name[target_name])
        if "safeTargetOther" in decision:
            expected_target["other"] = decision["safeTargetOther"]
        if target_obj != expected_target:
            raise ValueError(
                f"unresolved target differs from recovered safe state: {target_name}"
            )

        incoming = source_by_name[source_name]
        incoming_object = source_to_object(incoming)
        if decision["retainIncomingRecord"]:
            source_obj = source_matches[0]
            if source_obj != incoming_object:
                raise ValueError(
                    f"unresolved incoming row differs from source: {source_name}"
                )
            source_observation_count = len(source_obj.get("observations", []))
        else:
            source_observation_count = len(
                incoming_object.get("observations", [])
            )

        verified_collision = {
            "sourceName": source_name,
            "retainedTarget": target_name,
            "status": decision.get("status", "pendingParentDecision"),
            "incomingPresentInOutput": decision["retainIncomingRecord"],
            "incomingObservationCount": source_observation_count,
            "targetObservationCount": len(
                target_obj.get("observations", [])
            ),
            "incomingVisualDescriptionSha256": hashlib.sha256(
                incoming["Visual Description"].encode("utf-8")
            ).hexdigest(),
            "identityEvidence": replacement_identity_evidence(
                incoming, baseline_by_name[target_name]
            ),
        }
        if source_name in CONFIRMED_KEEP_BOTH_COLLISIONS:
            verified_collision["decision"] = decision["decision"]
            verified_resolved_collisions.append(verified_collision)
        else:
            verified_unresolved_collisions.append(verified_collision)

    signed_names = ("MCG -01-60-011", "MCG +01-60-011")
    signed_records = []
    for name in signed_names:
        matches = names.get(name.casefold(), [])
        if len(matches) != 1:
            raise ValueError(f"signed MCG identity does not resolve uniquely: {name}")
        signed_records.append(matches[0])
    if (
        signed_records[0].get("ra") == signed_records[1].get("ra")
        and signed_records[0].get("dec") == signed_records[1].get("dec")
    ):
        raise ValueError("signed MCG identities unexpectedly share coordinates")

    total_observations = sum(
        len(obj.get("observations", [])) for obj in objects
    )

    return {
        "sourceCounts": {
            "newObjects": len(new_records),
            "visualUpdates": len(update_records),
        },
        "finalCounts": {
            "objects": len(objects),
            "observations": total_observations,
        },
        "uniquePrimaryNames": len(folded_name_counts),
        "verifiedVisualUpdates": verified_visual_updates,
        "visualUpdateOverrides": sorted(VISUAL_UPDATE_OVERRIDES),
        "verifiedObservationReplacements": verified_observation_replacements,
        "verifiedReplacements": verified_replacements,
        "verifiedManualObjects": verified_manual_objects,
        "verifiedRenames": verified_renames,
        "verifiedDesignationOverrides": {
            "Herbig 26": herbig["other"],
            "Hoag's ObjectVisualWording": True,
        },
        "incomingDisplayEligibility": source_eligibility,
        "invalidHistoricalDisplayFlags": invalid_historical_flags,
        "verifiedFavoriteRemovals": verified_favorites,
        "verifiedDuplicateMerges": verified_duplicate_merges,
        "verifiedResolvedCollisions": verified_resolved_collisions,
        "verifiedUnresolvedCollisions": verified_unresolved_collisions,
        "verifiedSignedIdentities": [
            {
                "name": obj["name"],
                "coordinates": [obj.get("ra", ""), obj.get("dec", "")],
            }
            for obj in signed_records
        ],
    }


def load_previous_replacements():
    if not MANIFEST_JSON.exists():
        return {}
    summary = load_json(MANIFEST_JSON).get("summary", {})
    return {
        replacement["sourceName"]: replacement
        for replacement in summary.get("replacements", ())
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("new_objects_docx", type=Path, nargs="?")
    parser.add_argument("visual_updates_docx", type=Path, nargs="?")
    parser.add_argument(
        "--from-manifest",
        action="store_true",
        help="reapply the source records embedded in the durable manifest",
    )
    parser.add_argument("--update-date", default=DEFAULT_UPDATE_DATE)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.from_manifest:
        if args.new_objects_docx or args.visual_updates_docx:
            parser.error("--from-manifest does not accept DOCX paths")
        persisted_manifest = load_json(MANIFEST_JSON)
        new_records = persisted_manifest["newObjects"]
        update_records = persisted_manifest["visualUpdates"]
        new_source = persisted_manifest["sources"]["newObjects"]
        update_source = persisted_manifest["sources"]["visualUpdates"]
        validate_manifest_records(
            new_records, NEW_FIELDS, EXPECTED_NEW_RECORDS, "manifest new objects"
        )
        validate_manifest_records(
            update_records,
            UPDATE_FIELDS,
            EXPECTED_VISUAL_UPDATES,
            "manifest visual updates",
        )
    else:
        if not args.new_objects_docx or not args.visual_updates_docx:
            parser.error(
                "provide both DOCX paths or use --from-manifest"
            )
        new_records, new_source = parse_docx(
            args.new_objects_docx,
            NEW_FIELDS,
            expected_records=EXPECTED_NEW_RECORDS,
        )
        update_records, update_source = parse_docx(
            args.visual_updates_docx,
            UPDATE_FIELDS,
            expected_records=EXPECTED_VISUAL_UPDATES,
        )

    for source, records in (
        (new_source, new_records),
        (update_source, update_records),
    ):
        embedded_records_sha256 = hashlib.sha256(
            json_bytes(records)
        ).hexdigest()
        prior_sha256 = source.get("embeddedRecordsSha256")
        if prior_sha256 and prior_sha256 != embedded_records_sha256:
            raise ValueError("embedded manifest records failed hash validation")
        source["embeddedRecordsSha256"] = embedded_records_sha256

    objects = load_json(DATA_JSON)
    src_objects = load_json(SRC_DATA_JSON)
    input_sync = {
        "copiesEqualBeforeRun": objects == src_objects,
        "dataSha256BeforeRun": hashlib.sha256(
            DATA_JSON.read_bytes()
        ).hexdigest(),
        "srcSha256BeforeRun": hashlib.sha256(
            SRC_DATA_JSON.read_bytes()
        ).hexdigest(),
        "recoveryPolicy": (
            "data/data.json is authoritative; deterministic replacement "
            "operations resynchronize src/data.json"
        ),
    }

    before = {
        "totalRecords": len(objects),
        "totalObservations": sum(
            len(obj.get("observations", [])) for obj in objects
        ),
    }
    primary_alias_collisions, alternate_alias_collisions = find_alias_collisions(
        new_records, objects
    )
    previous_replacements = load_previous_replacements()
    renamed = apply_designation_overrides(objects)
    duplicate_merges = merge_duplicate_primary_records(objects)
    collision_summary = apply_unresolved_collision_states(
        objects, new_records
    )
    new_object_summary = apply_new_objects(
        objects, new_records, previous_replacements
    )
    manual_object_summary = apply_manual_objects(objects)
    visual_summary = apply_visual_updates(objects, update_records)
    manual_observation_replacements = apply_manual_observation_replacements(
        objects
    )

    # The replacement document already uses the new primary name, but enforce
    # the requested wording if an older phrase survived in any observation.
    hoag = index_by_name(objects)["hoag's object"][0]
    for observation in hoag.get("observations", []):
        observation["text"] = observation.get("text", "").replace(
            "Hoag's Ring", "Hoag's Object"
        )

    favorites = remove_favorites(objects)
    metadata = build_metadata(objects, args.update_date)
    validation = validate_final_state(objects, new_records, update_records)

    ambiguous_results = {
        "unresolvedCollisions": collision_summary[
            "ambiguousCollisionMatches"
        ],
        "newObjects": new_object_summary["ambiguousNewObjectMatches"],
        "replacements": new_object_summary["ambiguousReplacementCollisions"],
        "manualObjects": manual_object_summary["ambiguousMatches"],
        "visualUpdates": visual_summary["ambiguousMatches"],
    }
    unresolved_ambiguities = {
        key: value for key, value in ambiguous_results.items() if value
    }
    if unresolved_ambiguities:
        raise ValueError(
            f"ambiguous import matches remain: {unresolved_ambiguities}"
        )

    expected_inserted_names = {
        record["Name"]
        for record in new_records
        if record["Name"] not in SOURCE_REPLACEMENTS
        and (
            record["Name"] not in COLLISION_STATES
            or COLLISION_STATES[record["Name"]][
                "retainIncomingRecord"
            ]
        )
    }
    expected_inserted_names.update(
        record["Name"] for record in MANUAL_NEW_OBJECTS
    )
    source_name_counts = Counter(obj["name"] for obj in objects)
    missing_imported = [
        record["Name"]
        for record in new_records
        if (
            record["Name"] not in COLLISION_STATES
            or COLLISION_STATES[record["Name"]][
                "retainIncomingRecord"
            ]
        )
        if source_name_counts[record["Name"]] != 1
    ]
    missing_imported.extend(
        record["Name"]
        for record in MANUAL_NEW_OBJECTS
        if source_name_counts[record["Name"]] != 1
    )
    if missing_imported:
        raise ValueError(
            f"source names do not resolve uniquely after import: {missing_imported}"
        )
    unresolved_names_unexpectedly_present = [
        name
        for name, decision in UNRESOLVED_COLLISIONS.items()
        if not decision["retainIncomingRecord"] and source_name_counts[name]
    ]
    if unresolved_names_unexpectedly_present:
        raise ValueError(
            "unresolved collision names unexpectedly remain in output: "
            f"{unresolved_names_unexpectedly_present}"
        )

    expected_inserted_count = len(expected_inserted_names)
    after = {
        "totalRecords": metadata["totalRecords"],
        "totalObservations": metadata["totalObservations"],
    }
    summary = {
        "sourceRecordCount": len(new_records),
        "manualRecordCount": len(MANUAL_NEW_OBJECTS),
        "expectedInsertedCount": expected_inserted_count,
        "insertedThisRunCount": (
            len(new_object_summary["insertedNames"])
            + len(manual_object_summary["insertedNames"])
        ),
        "insertedNames": sorted(expected_inserted_names),
        "replacedExistingCount": len(new_object_summary["replacements"]),
        "replacements": new_object_summary["replacements"],
        "manualObjects": manual_object_summary,
        "resolvedCollisions": collision_summary["resolvedCollisions"],
        "unresolvedCollisions": collision_summary["unresolvedCollisions"],
        "ambiguousCollisionMatches": collision_summary[
            "ambiguousCollisionMatches"
        ],
        "collisionBaselineSource": collision_summary["baselineSource"],
        "ambiguousNewObjectMatches": new_object_summary[
            "ambiguousNewObjectMatches"
        ],
        "ambiguousReplacementCollisions": new_object_summary[
            "ambiguousReplacementCollisions"
        ],
        "replacementIdentityWarnings": new_object_summary["identityWarnings"],
        "primaryNameAliasCollisions": primary_alias_collisions,
        "alternateDesignationCollisions": alternate_alias_collisions,
        "visualUpdates": visual_summary,
        "manualObservationReplacements": manual_observation_replacements,
        "renamedPrimaries": renamed,
        "favoritesRemoved": favorites,
        "duplicatePrimaryMerges": duplicate_merges,
        "validation": validation,
        "inputSynchronization": input_sync,
        "before": before,
        "after": after,
    }
    baseline_counts = load_json(COLLISION_BASELINE_JSON)["datasetCounts"]
    summary["authoritativeTotals"] = {
        "baseRecords": baseline_counts["totalRecords"],
        "baseObservations": baseline_counts["totalObservations"],
        "recordDelta": after["totalRecords"] - baseline_counts["totalRecords"],
        "observationDelta": (
            after["totalObservations"]
            - baseline_counts["totalObservations"]
        ),
        "totalRecords": after["totalRecords"],
        "totalObservations": after["totalObservations"],
        "derivedFromFinalData": True,
    }
    data_sha256 = hashlib.sha256(json_bytes(objects)).hexdigest()
    metadata_sha256 = hashlib.sha256(
        json_bytes(metadata, indent=2, line_ending="\r\n")
    ).hexdigest()
    summary["outputs"] = {
        "dataSha256": data_sha256,
        "srcDataSha256": data_sha256,
        "dataCopiesEqual": True,
        "metadataSha256": metadata_sha256,
        "srcMetadataSha256": metadata_sha256,
        "metadataCopiesEqual": True,
    }
    manifest = {
        "sources": {
            "newObjects": new_source,
            "visualUpdates": update_source,
        },
        "summary": summary,
        "newObjects": new_records,
        "manualObjects": list(MANUAL_NEW_OBJECTS),
        "manualObservationReplacements": [
            {
                "Name": name,
                "Visual Description": visual_description,
            }
            for name, visual_description in MANUAL_OBSERVATION_REPLACEMENTS.items()
        ],
        "visualUpdates": update_records,
    }

    if not args.dry_run:
        write_json(DATA_JSON, objects)
        write_json(SRC_DATA_JSON, objects)
        write_json(METADATA_JSON, metadata, indent=2, line_ending="\r\n")
        write_json(SRC_METADATA_JSON, metadata, indent=2, line_ending="\r\n")
        write_json(MANIFEST_JSON, manifest, indent=2)

    print(
        json.dumps(
            {
                "sources": {
                    "newObjects": new_source,
                    "visualUpdates": update_source,
                },
                "sourceRecordCount": summary["sourceRecordCount"],
                "visualUpdates": {
                    key: visual_summary[key]
                    for key in (
                        "parsedCount",
                        "matchedCount",
                        "appliedCount",
                        "approvedOverrideCount",
                        "changedCount",
                        "missingNames",
                        "ambiguousMatches",
                        "overriddenNames",
                    )
                },
                "resolvedCollisions": summary["resolvedCollisions"],
                "unresolvedCollisions": summary["unresolvedCollisions"],
                "authoritativeTotals": summary["authoritativeTotals"],
                "outputs": summary["outputs"],
                "dryRun": args.dry_run,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
