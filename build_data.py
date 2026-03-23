#!/usr/bin/env python3
"""
Build data pipeline for Gottlieb's Deep Sky Observations website.
Merges main CSV + Historical text + References into a single JSON file.

The full CSV has unquoted commas in several fields and multi-line
VisualObservations. We use a two-strategy approach:
  1. RA/Dec coordinate pattern as anchor to split columns
  2. Name-based record boundaries (ordered names from old CSV)
     to catch records with non-standard coordinate formats.
"""

import re
import json
import csv
import os
import sys
from datetime import date

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
MAIN_CSV = os.path.join(DATA_DIR, "deep_sky_notes_full.csv")
HISTORICAL = os.path.join(DATA_DIR, "historical.txt")
OLD_CSV = os.path.join(DATA_DIR, "deep_sky_notes.csv")
OUTPUT_JSON = os.path.join(DATA_DIR, "data.json")
METADATA_JSON = os.path.join(DATA_DIR, "metadata.json")

# Permissive RA/Dec: RA is HH MM [SS[.s]], Dec is +/-DD [MM [SS]][.d]
# Separator between RA and Dec can be comma or space (some data-entry errors)
RA_DEC_RE = re.compile(
    r"[, ]"
    r"(\d{2} \d{2}(?:\s+\d{1,2})?(?:\.\d{1,3})?)"   # RA
    r"\s*[, ]\s*"
    r"([\+\-]\d{1,2}(?:\s+\d{2})?(?:\s+\d{1,2})?(?:\.\d{0,3})?)"  # Dec
    r"\s*,"
)

# Observation header: aperture" (date):
# Negative lookbehind ensures the aperture isn't part of a larger number (no digit or dot before)
OBS_SPLIT_RE = re.compile(
    r'(?<![\d.])(?=\d+\.?\d*"\s*\(\d{1,2}/\d{1,2}/\d{2,4}\))'
)
OBS_HEADER_RE = re.compile(
    r'^(\d+\.?\d*)"\s*\((\d{1,2}/\d{1,2}/\d{2,4})\)\s*:\s*'
)


# -- helpers -----------------------------------------------------------

def read_old_csv():
    """Read old CSV -> (ordered_names list, refs dict, old_rows dict)."""
    names = []
    refs = {}
    old_rows = {}
    with open(OLD_CSV, "r", encoding="utf-8", errors="replace") as f:
        for row in csv.reader(f):
            if not row:
                continue
            name = row[0]
            names.append(name)
            if len(row) > 22:
                refs[name] = row[22]
            old_rows[name] = row
    return names, refs, old_rows


def find_record_boundaries(body, ordered_names):
    """Find where each record starts in the full-CSV body text.

    Searches for each name sequentially at a line start, preserving
    the ordering from the old CSV so we never match out of order.
    Returns (positions list, not_found list).
    """
    positions = []
    search_from = 0
    not_found = []
    seen_positions = set()

    for name in ordered_names:
        escaped = re.escape(name)
        pat = re.compile(r"^" + escaped + r"(?=[,\n\r])", re.MULTILINE)
        m = pat.search(body, search_from)
        if m:
            positions.append((m.start(), name))
            seen_positions.add(m.start())
            search_from = m.start() + 1
        else:
            # Retry from the beginning (ordering may differ slightly)
            m = pat.search(body, 0)
            if m and m.start() not in seen_positions:
                positions.append((m.start(), name))
                seen_positions.add(m.start())
            else:
                not_found.append(name)

    positions.sort(key=lambda x: x[0])
    return positions, not_found


def parse_record(name, raw_text):
    """Parse one record's raw text into a 16-field dict using RA/Dec anchor."""
    # Collapse newlines to spaces for field-splitting
    text = re.sub(r"\r?\n", " ", raw_text)
    text = re.sub(r"  +", " ", text)

    m = RA_DEC_RE.search(text)
    if not m:
        return None

    ra = m.group(1).strip()
    dec = m.group(2).strip()
    before_ra = text[: m.start()]
    after_dec = text[m.end() :]

    # -- Before RA: Name, Other, Type, Nickname, Class --
    bp = before_ra.split(",")
    parsed_name = bp[0].strip() or name
    if len(bp) >= 5:
        other = bp[1].strip()
        type_val = bp[2].strip()
        nickname = bp[3].strip()
        class_val = ",".join(bp[4:]).strip()
    elif len(bp) == 4:
        other, type_val, nickname = bp[1].strip(), bp[2].strip(), bp[3].strip()
        class_val = ""
    elif len(bp) == 3:
        other, type_val = bp[1].strip(), bp[2].strip()
        nickname = class_val = ""
    else:
        other = bp[1].strip() if len(bp) > 1 else ""
        type_val = nickname = class_val = ""

    # -- After Dec: Size, PA, VMag, BMag, SB, Con, remainder --
    ap = after_dec.split(",", 6)
    size     = ap[0].strip() if len(ap) > 0 else ""
    pa       = ap[1].strip() if len(ap) > 1 else ""
    vmag     = ap[2].strip() if len(ap) > 2 else ""
    bmag     = ap[3].strip() if len(ap) > 3 else ""
    sb       = ap[4].strip() if len(ap) > 4 else ""
    con      = ap[5].strip() if len(ap) > 5 else ""
    remainder = ap[6].strip() if len(ap) > 6 else ""

    ngc_desc, disc_date, vis_obs = split_remainder(remainder)

    return {
        "name": parsed_name, "other": other, "type": type_val,
        "nickname": nickname, "class": class_val,
        "ra": ra, "dec": dec, "size": size, "pa": pa,
        "vmag": vmag, "bmag": bmag, "sb": sb, "con": con,
        "ngcDescription": ngc_desc, "discoveryDate": disc_date,
        "visualObservations": vis_obs,
    }


def split_remainder(remainder):
    """Split NGCDescription,DiscoveryDate,VisualObservations.

    VisualObservations starts with an aperture+date pattern (e.g. 24" (10/12/20):).
    DiscoveryDate is like '30 Sep 1861' or empty.
    NGCDescription is everything before DiscoveryDate and can contain commas.
    """
    if not remainder:
        return "", "", ""

    # Locate start of VisualObservations
    obs_match = re.search(r'(\d+\.?\d*)"[ \t]*\(\d{1,2}/\d{1,2}/\d{2,4}\)', remainder)

    if obs_match:
        obs_pos = obs_match.start()
        comma_before = remainder.rfind(",", 0, obs_pos)
        if comma_before >= 0:
            vis_obs = remainder[comma_before + 1 :].strip()
            before_obs = remainder[:comma_before]
        else:
            vis_obs = remainder.strip()
            before_obs = ""

        # Separate NGCDescription from DiscoveryDate
        last_c = before_obs.rfind(",")
        if last_c >= 0:
            ngc_desc = before_obs[:last_c].strip()
            disc_date = before_obs[last_c + 1 :].strip()
        else:
            # Single value: could be date or description
            if re.match(r"\d{1,2}\s+[A-Z][a-z]+\s+\d{4}$", before_obs.strip()):
                ngc_desc, disc_date = "", before_obs.strip()
            elif re.match(r"- \d{4}$", before_obs.strip()):
                ngc_desc, disc_date = "", before_obs.strip()
            else:
                ngc_desc, disc_date = before_obs.strip(), ""

        return ngc_desc, disc_date, vis_obs
    else:
        # No observations: split into desc, date, empty obs
        last_c = remainder.rfind(",")
        if last_c >= 0:
            tail = remainder[last_c + 1 :].strip()
            head = remainder[:last_c]
            if re.search(r"\d{3,4}$", tail) and len(tail) < 50:
                second_c = head.rfind(",")
                if second_c >= 0:
                    return head[:second_c].strip(), head[second_c + 1 :].strip(), tail
                return head.strip(), tail, ""
            else:
                second_c = head.rfind(",")
                if second_c >= 0:
                    return head[:second_c].strip(), head[second_c + 1 :].strip(), tail
                return head.strip(), "", tail
        return remainder.strip(), "", ""


def make_stub_from_old_csv(name, row):
    """Create a parsed-record dict from an old-CSV row (fallback)."""
    return {
        "name": name,
        "other": row[2] if len(row) > 2 else "",
        "type": row[1] if len(row) > 1 else "",
        "nickname": row[3] if len(row) > 3 else "",
        "class": row[4] if len(row) > 4 else "",
        "ra": row[5] if len(row) > 5 else "",
        "dec": row[6] if len(row) > 6 else "",
        "size": row[7] if len(row) > 7 else "",
        "pa": row[8] if len(row) > 8 else "",
        "vmag": row[10] if len(row) > 10 else "",
        "bmag": row[11] if len(row) > 11 else "",
        "sb": row[12] if len(row) > 12 else "",
        "con": row[15] if len(row) > 15 else "",
        "ngcDescription": row[17] if len(row) > 17 else "",
        "discoveryDate": row[23] if len(row) > 23 else "",
        "visualObservations": row[26] if len(row) > 26 else "",
    }


# -- historical.txt ---------------------------------------------------

def parse_historical(path, known_names):
    """Parse historical.txt -> {name: text}.

    Entries are separated by 2+ consecutive newlines.
    Each entry is Name,text.
    """
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        raw = f.read()

    records = {}
    entries = re.split(r"\n{2,}", raw)
    for entry in entries:
        entry = entry.strip()
        if not entry:
            continue
        ci = entry.find(",")
        if ci <= 0:
            continue
        ename = entry[:ci].strip()
        text = entry[ci + 1 :].strip()
        if ename:
            records[ename] = text
    return records


# -- observations splitter --------------------------------------------

def split_observations(text):
    """Split VisualObservations into [{aperture, date, text}, ...]."""
    if not text or not text.strip():
        return []
    text = text.strip()

    parts = OBS_SPLIT_RE.split(text)
    observations = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        m = OBS_HEADER_RE.match(part)
        if m:
            observations.append({
                "aperture": m.group(1) + '"',
                "date": m.group(2),
                "text": part[m.end() :].strip(),
            })
        else:
            if observations:
                observations[-1]["text"] += " " + part
            elif part:
                observations.append({"aperture": "", "date": "", "text": part})
    return observations


# -- catalog / flags ---------------------------------------------------

def determine_catalog(name):
    """Return (catalog, catalogNumber)."""
    for prefix in ("NGC", "IC", "UGC"):
        if name.startswith(prefix + " "):
            rest = name[len(prefix) :].strip()
            return prefix, rest
    return "Other", name


def should_show_historical(name, catalog):
    """True for NGC/IC objects whose name is purely numeric after the prefix."""
    if catalog not in ("NGC", "IC"):
        return False
    suffix = name[len(catalog) :].strip()
    return bool(re.match(r"^\d+$", suffix))


# -- main pipeline -----------------------------------------------------

def build_data():
    print("=" * 60)
    print("Building data pipeline")
    print("=" * 60)

    # -- 1. Old CSV: names, references, fallback rows --
    print("\n[1] Reading old CSV (names + references)...")
    ordered_names, refs_dict, old_rows = read_old_csv()
    known_names = set(ordered_names)
    name_order = {n: i for i, n in enumerate(ordered_names)}
    t_count = sum(1 for v in refs_dict.values() if "t" in v)
    o_count = sum(1 for v in refs_dict.values() if "o" in v)
    print(f"  Names: {len(ordered_names)}  |  refs 't': {t_count}  'o': {o_count}")

    # -- 2. Parse full CSV using name-based boundaries --
    print("\n[2] Parsing full CSV...")
    with open(MAIN_CSV, "r", encoding="utf-8", errors="replace") as f:
        full_text = f.read()
    header_end = full_text.index("\n") + 1
    body = full_text[header_end:]

    positions, not_found = find_record_boundaries(body, ordered_names)
    print(f"  Record boundaries found: {len(positions)}")
    if not_found:
        print(f"  Not found in full CSV: {len(not_found)}")

    parsed_records = []
    parse_failures = []

    # Known valid type codes (used to detect type-field leakage)
    VALID_TYPES = {
        "", "GX", "OC", "GC", "PN", "**", "Ast", "AST", "*", "RN", "EN", "DN",
        "SNR", "NF", "Dup", "GX?", "PN?", "OC?", "GC?", "RN?", "EN?", "DN?",
        "***", "GXGrp", "GXGRP", "GXPr", "GXTrpl", "GXTrp", "GXTrple",
        "LMC-OC", "LMC-GC", "LMC-GX", "LMC-PN", "LMC-EN", "LMC-RN", "LMC-DN",
        "LMC-Ast", "LMC-SNR", "LMC-**", "LMC-*",
        "SMC-OC", "SMC-GC", "SMC-GX", "SMC-PN", "SMC-EN", "SMC-RN",
        "SMC-Ast", "SMC-SNR", "SMC-**", "SMC-*",
        "M31-OC", "M31-GC", "M31-GX", "M31-PN", "M31-EN", "M31-RN",
        "M31-Ast", "M31-**", "M31-*",
        "M33-OC", "M33-GC", "M33-PN", "M33-EN", "M33-RN", "M33-**",
        "M33-Ast", "M33-HII", "M33-SNR",
        "OC:", "PN:", "GC:", "GX:", "RN:", "EN:", "DN:", "Ast:", "**:",
        "HII", "RV", "WR", "DHII",
        "NonEx", "Non", "QSO", "Neb", "Star", "DStar",
    }

    for i, (pos, name) in enumerate(positions):
        end = positions[i + 1][0] if i + 1 < len(positions) else len(body)
        raw = body[pos:end]
        rec = parse_record(name, raw)
        if rec:
            # Validate type field — if it looks like prose, the parser mis-split
            type_val = rec.get("type", "")
            if type_val and type_val not in VALID_TYPES and len(type_val) > 12:
                # Type field contains observation text — use old CSV fallback
                if name in old_rows:
                    print(f"    Type-field leakage detected for [{name}], using old CSV")
                    parsed_records.append(make_stub_from_old_csv(name, old_rows[name]))
                else:
                    rec["name"] = name
                    parsed_records.append(rec)
            else:
                rec["name"] = name  # authoritative name
                parsed_records.append(rec)
        else:
            parse_failures.append(name)

    print(f"  Parsed via RA/Dec anchor: {len(parsed_records)}")

    # Fallback: records we couldn't find or parse -> use old CSV
    need_stub = set(not_found) | set(parse_failures)
    if need_stub:
        print(f"  Creating stubs for {len(need_stub)} records from old CSV...")
        for name in need_stub:
            if name in old_rows:
                parsed_records.append(make_stub_from_old_csv(name, old_rows[name]))
            else:
                print(f"    WARNING: [{name}] not in old CSV either")

    # Sort to match old-CSV ordering
    parsed_records.sort(key=lambda r: name_order.get(r["name"], 999999))
    print(f"  Total records: {len(parsed_records)}")

    # -- 3. Historical text --
    print("\n[3] Parsing historical text...")
    historical = parse_historical(HISTORICAL, known_names)
    print(f"  Entries: {len(historical)}  "
          f"(with text: {sum(1 for v in historical.values() if len(v) > 10)})")

    # -- 4. Build output --
    print("\n[4] Building output records...")
    output = []
    type_counts = {}
    con_set = set()
    catalog_counts = {}

    for rec in parsed_records:
        name = rec["name"]
        catalog, cat_num = determine_catalog(name)
        ref = refs_dict.get(name, "")
        hist = historical.get(name, "")
        show_hist = should_show_historical(name, catalog) and len(hist) > 0

        observations = split_observations(rec.get("visualObservations", ""))

        if rec.get("type"):
            type_counts[rec["type"]] = type_counts.get(rec["type"], 0) + 1
        if rec.get("con"):
            con_set.add(rec["con"])
        catalog_counts[catalog] = catalog_counts.get(catalog, 0) + 1

        output.append({
            "name": name,
            "other": rec.get("other", ""),
            "type": rec.get("type", ""),
            "nickname": rec.get("nickname", ""),
            "class": rec.get("class", ""),
            "ra": rec.get("ra", ""),
            "dec": rec.get("dec", ""),
            "size": rec.get("size", ""),
            "pa": rec.get("pa", ""),
            "vmag": rec.get("vmag", ""),
            "bmag": rec.get("bmag", ""),
            "sb": rec.get("sb", ""),
            "con": rec.get("con", ""),
            "ngcDescription": rec.get("ngcDescription", ""),
            "discoveryDate": rec.get("discoveryDate", ""),
            "observations": observations,
            "historical": hist,
            "showHistorical": show_hist,
            "catalog": catalog,
            "catalogNumber": cat_num,
            "isTopObject": "t" in ref,
            "isOrionAtlas": "o" in ref,
            "references": ref,
        })

    # -- 5. Write JSON files --
    print(f"\n[5] Writing {len(output)} records...")
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False)
    sz = os.path.getsize(OUTPUT_JSON)
    print(f"  data.json: {sz:,} bytes ({sz / 1024 / 1024:.1f} MB)")

    top_count = sum(1 for o in output if o["isTopObject"])
    orion_count = sum(1 for o in output if o["isOrionAtlas"])

    metadata = {
        "totalRecords": len(output),
        "constellations": sorted(con_set),
        "types": dict(sorted(type_counts.items(), key=lambda x: -x[1])),
        "catalogs": dict(sorted(catalog_counts.items(), key=lambda x: -x[1])),
        "topObjectCount": top_count,
        "orionAtlasCount": orion_count,
        "lastUpdated": str(date.today()),
    }
    with open(METADATA_JSON, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print("  metadata.json written")

    # -- 6. Validation --
    print("\n" + "=" * 60)
    print("VALIDATION")
    print("=" * 60)
    print(f"Total records: {len(output)}")
    if len(output) == 24773:
        print("  OK - matches expected 24,773")
    else:
        print(f"  Expected 24,773 - got {len(output)} (delta {len(output) - 24773})")

    # NGC 1
    ngc1 = next((o for o in output if o["name"] == "NGC 1"), None)
    if ngc1:
        n_obs = len(ngc1["observations"])
        print(f"\nNGC 1:")
        print(f"  Observations: {n_obs}  {'OK' if n_obs == 5 else 'FAIL expected 5'}")
        for obs in ngc1["observations"]:
            print(f"    {obs['aperture']} ({obs['date']}): {obs['text'][:60]}...")
        has_hist = "Arrest" in ngc1.get("historical", "")
        print(f"  Historical about d'Arrest: {'OK' if has_hist else 'FAIL'}")
        print(f"  showHistorical={ngc1['showHistorical']}  catalog={ngc1['catalog']}"
              f"  number={ngc1['catalogNumber']}")
        print(f"  refs=[{ngc1['references']}]")
    else:
        print("  FAIL: NGC 1 NOT FOUND")

    # References spot-check
    print(f"\nTop objects: {top_count}  {'OK' if top_count == 308 else 'CHECK'}")
    print(f"Orion atlas: {orion_count}  {'OK' if orion_count == 441 else 'CHECK'}")
    top_ex = next((o for o in output if o["isTopObject"]), None)
    if top_ex:
        print(f"  Example top: {top_ex['name']} refs=[{top_ex['references']}]")
    ori_ex = next((o for o in output if o["isOrionAtlas"]), None)
    if ori_ex:
        print(f"  Example orion: {ori_ex['name']} refs=[{ori_ex['references']}]")

    print(f"\nCatalogs: {metadata['catalogs']}")
    print(f"Constellations: {len(metadata['constellations'])}")
    top5 = list(metadata["types"].items())[:5]
    print("Types (top 5): " + "  ".join(f"{k}={v}" for k, v in top5))
    print(f"With historical shown: {sum(1 for o in output if o['showHistorical'])}")
    print("\nDone!")


if __name__ == "__main__":
    build_data()
