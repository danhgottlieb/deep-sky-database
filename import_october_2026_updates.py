#!/usr/bin/env python3
"""Apply the October 2026 updates without replacing unrelated current records."""

import argparse
import hashlib
import json
import re
import sys
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from import_august_2026_updates import (
    NEW_FIELDS,
    build_metadata,
    index_by_name,
    json_bytes,
    load_json,
    rename_primary,
    source_to_object,
    split_aliases,
    validate_manifest_records,
    write_json,
)
from build_data import split_observations


MANIFEST_PATH = ROOT / "data" / "october_2026_import.json"
CATALOGS_PATH = ROOT / "src" / "specialized-catalogs.json"
ARTICLES_PATH = ROOT / "src" / "article-object-mappings.json"
UPDATE_DATE = "2026-10-10"
SECTION_SCHEMAS = {
    1: ("newObjects", NEW_FIELDS, 68),
    2: ("historicalUpdates", ("Name", "Historical"), 6),
    6: ("visualUpdates", ("Name", "Visual Description"), 55),
    7: ("otherUpdates", ("Name", "Other"), 114),
}
PRIMARY_RENAMES = [
    {
        "oldName": "Simeis 3-132",
        "newName": "M 1-88",
        "other": "Simeis 3-132 = Gum 85 = [Sh 2-54]",
    },
    {"oldName": "DWB 70", "newName": "Simeis 68", "other": "DWB 70"},
    {"oldName": "ADS 13292", "newName": "Espin 202"},
    {"oldName": "vdB 87", "newName": "Simeis 290"},
]
OTHER_UPDATE_TARGETS = {"Simeis 16": "LBN 544"}
NICKNAME_UPDATES = [
    {"Name": "Simeis 22", "Nickname": "Shrimp Nebula = Dolphin Nebula"},
]
SOURCE_KEYS = (
    "schemaVersion",
    "updateDate",
    "sources",
    "newObjects",
    "historicalUpdates",
    "visualUpdates",
    "otherUpdates",
    "primaryRenames",
    "otherUpdateTargets",
    "nicknameUpdates",
    "nightVisionNames",
)


def source_digest(manifest):
    return hashlib.sha256(
        json_bytes({key: manifest[key] for key in SOURCE_KEYS})
    ).hexdigest()


def parse_records(text, fields, expected_count, label):
    start = re.search(r'^[^"\u201c\u201d\r\n\u00f7]+\u00f7', text, re.MULTILINE)
    if start is None:
        raise ValueError(f"{label}: no records found")
    chunks = text[start.start():].split("\u00bf")
    if chunks[-1].strip():
        raise ValueError(f"{label}: text remains after the final record terminator")
    records = []
    for number, chunk in enumerate(chunks[:-1], 1):
        values = [value.strip() for value in chunk.strip().split("\u00f7")]
        if len(values) != len(fields):
            raise ValueError(
                f"{label}: record {number} has {len(values)} fields, "
                f"expected {len(fields)}"
            )
        records.append(dict(zip(fields, values)))
    validate_manifest_records(records, fields, expected_count, label)
    names = [record["Name"].casefold() for record in records]
    if any(not name for name in names) or len(names) != len(set(names)):
        raise ValueError(f"{label}: empty or duplicate primary names")
    return records


def parse_request(request_path, additional_object_path):
    text = request_path.read_text(encoding="utf-8")
    headers = list(re.finditer(r"^\s*(\d+)\)\s*", text, re.MULTILINE))
    section_numbers = [int(header.group(1)) for header in headers]
    if section_numbers != list(range(1, 11)):
        raise ValueError("Request must contain sections 1 through 10 exactly once")
    sections = {
        int(header.group(1)): text[
            header.end():headers[index + 1].start() if index + 1 < len(headers) else len(text)
        ]
        for index, header in enumerate(headers)
    }
    manifest = {
        "schemaVersion": 1,
        "updateDate": UPDATE_DATE,
        "sources": {
            "request": {
                "file": request_path.name,
                "sha256": hashlib.sha256(request_path.read_bytes()).hexdigest(),
            },
            "additionalObject": {
                "file": additional_object_path.name,
                "sha256": hashlib.sha256(additional_object_path.read_bytes()).hexdigest(),
            },
        },
    }
    for section, (key, fields, count) in SECTION_SCHEMAS.items():
        manifest[key] = parse_records(sections[section], fields, count, key)
    additional = parse_records(
        additional_object_path.read_text(encoding="utf-8"),
        NEW_FIELDS,
        1,
        "additional object",
    )
    if additional[0]["Name"] != "M31-G318":
        raise ValueError("The confirmed additional object must be M31-G318")
    manifest["newObjects"].extend(additional)
    manifest["primaryRenames"] = deepcopy(PRIMARY_RENAMES)
    manifest["otherUpdateTargets"] = dict(OTHER_UPDATE_TARGETS)
    manifest["nicknameUpdates"] = deepcopy(NICKNAME_UPDATES)
    _, separator, names = sections[8].partition(":")
    if not separator:
        raise ValueError("Night Vision section has no object list")
    manifest["nightVisionNames"] = [name.strip() for name in names.strip().split(",")]
    manifest["sourceRecordsSha256"] = source_digest(manifest)
    validate_manifest(manifest)
    return manifest


def validate_manifest(manifest):
    if manifest.get("schemaVersion") != 1 or manifest.get("updateDate") != UPDATE_DATE:
        raise ValueError("Unexpected October import schema or update date")
    for key, fields, count in (
        ("newObjects", NEW_FIELDS, 69),
        ("historicalUpdates", ("Name", "Historical"), 6),
        ("visualUpdates", ("Name", "Visual Description"), 55),
        ("otherUpdates", ("Name", "Other"), 114),
    ):
        validate_manifest_records(manifest[key], fields, count, key)
        if any(not isinstance(value, str) for record in manifest[key] for value in record.values()):
            raise ValueError(f"{key}: every field must be text")
    if manifest["primaryRenames"] != PRIMARY_RENAMES:
        raise ValueError("Primary renames differ from the confirmed decisions")
    if manifest["otherUpdateTargets"] != OTHER_UPDATE_TARGETS:
        raise ValueError("Alternate-designation target differs from the confirmed decision")
    if manifest["nicknameUpdates"] != NICKNAME_UPDATES:
        raise ValueError("Nickname update differs from the request")
    names = manifest["nightVisionNames"]
    if len(names) != 31 or any(not isinstance(name, str) or not name for name in names):
        raise ValueError("Expected 31 nonempty Night Vision names")
    if len(set(names)) != len(names):
        raise ValueError("Duplicate Night Vision names")
    if manifest.get("sourceRecordsSha256") != source_digest(manifest):
        raise ValueError("Embedded October source records failed hash validation")


def unique_object(names, name):
    matches = names.get(name.casefold(), [])
    if len(matches) != 1:
        raise ValueError(f"Primary designation {name!r} resolves to {len(matches)} records")
    return matches[0]


def affected_names(manifest):
    names = {
        record["Name"]
        for key in ("newObjects", "historicalUpdates", "visualUpdates", "nicknameUpdates")
        for record in manifest[key]
    }
    names.update(
        manifest["otherUpdateTargets"].get(record["Name"], record["Name"])
        for record in manifest["otherUpdates"]
    )
    for rename in manifest["primaryRenames"]:
        names.update((rename["oldName"], rename["newName"]))
    return names


def unchanged_records_digest(objects, manifest):
    affected = affected_names(manifest)
    records = [obj for obj in objects if obj["name"] not in affected]
    records.sort(key=lambda obj: (obj["name"], json_bytes(obj)))
    return len(records), hashlib.sha256(json_bytes(records)).hexdigest()


def apply_updates(objects, catalog_manifest, article_manifest, manifest):
    validate_manifest(manifest)
    before_preservation = unchanged_records_digest(objects, manifest)
    baseline = manifest.get("baseline")
    if baseline and before_preservation != (
        baseline["unchangedRecordCount"],
        baseline["unchangedRecordsSha256"],
    ):
        raise ValueError("Unrelated records differ from the verified import baseline")

    before_state = (objects, catalog_manifest, article_manifest)
    objects = deepcopy(objects)
    catalog_manifest = deepcopy(catalog_manifest)
    article_manifest = deepcopy(article_manifest)
    before_observations = sum(len(obj["observations"]) for obj in objects)
    names = index_by_name(objects)
    has_imported_objects = any(
        names.get(record["Name"].casefold()) for record in manifest["newObjects"]
    )
    inserted = []
    inserted_observations = 0
    new_object_observations = 0
    for record in manifest["newObjects"]:
        incoming = source_to_object(record)
        new_object_observations += len(incoming["observations"])
        matches = names.get(record["Name"].casefold(), [])
        if not matches:
            objects.append(incoming)
            names[record["Name"].casefold()] = [incoming]
            inserted.append(record["Name"])
            inserted_observations += len(incoming["observations"])
        elif len(matches) != 1 or matches[0] != incoming:
            raise ValueError(f"New-object primary designation already exists: {record['Name']}")

    renames = {}
    for rename in manifest["primaryRenames"]:
        old_name, new_name = rename["oldName"], rename["newName"]
        rename_primary(objects, old_name, new_name)
        obj = unique_object(index_by_name(objects), new_name)
        if "other" in rename:
            obj["other"] = rename["other"]
        elif old_name.casefold() not in {alias.casefold() for alias in split_aliases(obj["other"])}:
            aliases = [
                alias for alias in split_aliases(obj["other"])
                if alias.casefold() != new_name.casefold()
            ]
            obj["other"] = " = ".join([old_name] + aliases)
        renames[old_name] = new_name

    names = index_by_name(objects)
    for record in manifest["nicknameUpdates"]:
        unique_object(names, record["Name"])["nickname"] = record["Nickname"]
    for record in manifest["historicalUpdates"]:
        obj = unique_object(names, record["Name"])
        obj["historical"] = record["Historical"]
        obj["showHistorical"] = bool(record["Historical"])
    visual_deltas = []
    for record in manifest["visualUpdates"]:
        obj = unique_object(names, record["Name"])
        before_count = len(obj["observations"])
        obj["observations"] = split_observations(record["Visual Description"])
        visual_deltas.append({
            "name": record["Name"],
            "beforeCount": before_count,
            "afterCount": len(obj["observations"]),
            "delta": len(obj["observations"]) - before_count,
        })
    for record in manifest["otherUpdates"]:
        name = manifest["otherUpdateTargets"].get(record["Name"], record["Name"])
        unique_object(names, name)["other"] = record["Other"]

    for group in catalog_manifest["catalogs"] + article_manifest["articles"]:
        group["objectNames"] = [renames.get(name, name) for name in group["objectNames"]]
        if len(group["objectNames"]) != len(set(group["objectNames"])):
            raise ValueError(f"Renames produced duplicate catalog members: {group['id']}")
        for name in group["objectNames"]:
            unique_object(names, name)

    night_catalogs = [
        catalog for catalog in catalog_manifest["catalogs"] if catalog["id"] == "night-vision"
    ]
    if len(night_catalogs) != 1:
        raise ValueError("Expected exactly one Night Vision catalog")
    night_vision = night_catalogs[0]
    added_night_vision = []
    for name in manifest["nightVisionNames"]:
        unique_object(names, name)
        if name not in night_vision["objectNames"]:
            night_vision["objectNames"].append(name)
            added_night_vision.append(name)
    night_vision["sourceCount"] = (
        len(night_vision["objectNames"]) + len(night_vision["unmatchedDesignations"])
    )
    night_vision["statedCount"] = night_vision["sourceCount"]

    if unchanged_records_digest(objects, manifest) != before_preservation:
        raise ValueError("The import changed unrelated records")
    if has_imported_objects and (objects, catalog_manifest, article_manifest) != before_state:
        raise ValueError(
            "October updates have already been applied; refusing to overwrite later changes"
        )
    total_observations = sum(len(obj["observations"]) for obj in objects)
    visual_delta = sum(item["delta"] for item in visual_deltas)
    if total_observations != before_observations + inserted_observations + visual_delta:
        raise ValueError("Observation totals do not match the import deltas")
    summary = {
        "insertedThisRun": inserted,
        "newObjectCount": len(manifest["newObjects"]),
        "newObjectObservationCount": new_object_observations,
        "historicalUpdateCount": len(manifest["historicalUpdates"]),
        "visualUpdateCount": len(manifest["visualUpdates"]),
        "visualObservationDelta": visual_delta,
        "visualObservationChanges": visual_deltas,
        "otherUpdateCount": len(manifest["otherUpdates"]),
        "primaryRenameCount": len(manifest["primaryRenames"]),
        "nightVisionAddedThisRun": added_night_vision,
        "nightVisionCount": night_vision["sourceCount"],
        "nightVisionOrderedNamesSha256": hashlib.sha256(
            "\n".join(night_vision["objectNames"] + night_vision["unmatchedDesignations"]).encode()
        ).hexdigest(),
        "totalRecords": len(objects),
        "totalObservations": total_observations,
        "unchangedRecordCount": before_preservation[0],
        "unchangedRecordsSha256": before_preservation[1],
    }
    return objects, catalog_manifest, article_manifest, summary


def write_pretty_json(path, value):
    line_ending = "\r\n" if path.exists() and b"\r\n" in path.read_bytes() else "\n"
    write_json(path, value, indent=2, line_ending=line_ending)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--request-file", type=Path)
    parser.add_argument("--additional-object-file", type=Path)
    parser.add_argument("--from-manifest", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if args.from_manifest:
        if args.request_file or args.additional_object_file:
            parser.error("--from-manifest does not accept source files")
        manifest = load_json(MANIFEST_PATH)
    else:
        if not args.request_file or not args.additional_object_file:
            parser.error("Provide both source files or use --from-manifest")
        manifest = parse_request(args.request_file, args.additional_object_file)

    objects = load_json(ROOT / "data" / "data.json")
    if objects != load_json(ROOT / "src" / "data.json"):
        raise ValueError("Canonical and published data copies differ; no changes written")
    if not args.from_manifest and MANIFEST_PATH.exists():
        previous = load_json(MANIFEST_PATH)
        if previous["sourceRecordsSha256"] != manifest["sourceRecordsSha256"]:
            raise ValueError("A different October import manifest already exists")
        manifest = previous
    current_metadata = load_json(ROOT / "data" / "metadata.json")
    if current_metadata != load_json(ROOT / "src" / "metadata.json"):
        raise ValueError("Canonical and published metadata copies differ; no changes written")
    if current_metadata["lastUpdated"] > UPDATE_DATE:
        raise ValueError("Refusing to replay October updates over a newer canonical database")
    if "baseline" not in manifest:
        unchanged_count, unchanged_sha256 = unchanged_records_digest(objects, manifest)
        manifest["baseline"] = {
            "totalRecords": len(objects),
            "totalObservations": sum(len(obj["observations"]) for obj in objects),
            "unchangedRecordCount": unchanged_count,
            "unchangedRecordsSha256": unchanged_sha256,
        }

    catalogs = load_json(CATALOGS_PATH)
    articles = load_json(ARTICLES_PATH)
    updated, updated_catalogs, updated_articles, summary = apply_updates(
        objects, catalogs, articles, manifest
    )
    metadata = build_metadata(updated, manifest["updateDate"])
    if not args.dry_run:
        for directory in ("data", "src"):
            write_json(ROOT / directory / "data.json", updated)
            write_pretty_json(ROOT / directory / "metadata.json", metadata)
        if updated_catalogs != catalogs:
            write_pretty_json(CATALOGS_PATH, updated_catalogs)
        if updated_articles != articles:
            write_pretty_json(ARTICLES_PATH, updated_articles)
        if not args.from_manifest:
            manifest["summary"] = summary
            write_pretty_json(MANIFEST_PATH, manifest)
    print(json.dumps({"dryRun": args.dry_run, **summary}, indent=2, ensure_ascii=True))


if __name__ == "__main__":
    main()
