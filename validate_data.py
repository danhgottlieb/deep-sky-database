#!/usr/bin/env python3
"""
Comprehensive cross-check: compare data.json against the raw CSV source.
Checks every record for field mismatches, missing observations, truncated text, etc.
"""
import json
import re
import csv
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
MAIN_CSV = os.path.join(DATA_DIR, "deep_sky_notes_full.csv")
OLD_CSV  = os.path.join(DATA_DIR, "deep_sky_notes.csv")
JSON_FILE = os.path.join(DATA_DIR, "data.json")

# ---------- Load JSON ----------
with open(JSON_FILE, "r", encoding="utf-8") as f:
    json_data = json.load(f)
json_index = {obj["name"]: obj for obj in json_data}

# ---------- Load old CSV (27 cols, no header) ----------
old_rows = {}
with open(OLD_CSV, "r", encoding="utf-8", errors="replace") as f:
    for row in csv.reader(f):
        if row:
            old_rows[row[0]] = row

# ---------- Load full CSV raw text for obs counting ----------
with open(MAIN_CSV, "r", encoding="utf-8", errors="replace") as f:
    full_text = f.read()

# ---------- Count observation headers in raw CSV per object ----------
# Build ordered name list from old CSV
ordered_names = list(old_rows.keys())

# Find record boundaries in full CSV
header_end = full_text.index("\n") + 1
body = full_text[header_end:]

def find_boundaries(body, names):
    positions = []
    search_from = 0
    seen = set()
    for name in names:
        escaped = re.escape(name)
        pat = re.compile(r"^" + escaped + r"(?=[,\n\r])", re.MULTILINE)
        m = pat.search(body, search_from)
        if m:
            positions.append((m.start(), name))
            seen.add(m.start())
            search_from = m.start() + 1
        else:
            m = pat.search(body, 0)
            if m and m.start() not in seen:
                positions.append((m.start(), name))
                seen.add(m.start())
    positions.sort(key=lambda x: x[0])
    return positions

positions = find_boundaries(body, ordered_names)

# For each record, count observation headers in the raw CSV text
# An observation header is: aperture" (something):
OBS_HEADER_PAT = re.compile(r'(?<![.\d])\d+\.?\d*"\s*\([^)]+\)\s*:')

csv_obs_counts = {}
csv_raw_texts = {}
for i, (pos, name) in enumerate(positions):
    end = positions[i + 1][0] if i + 1 < len(positions) else len(body)
    raw = body[pos:end]
    csv_raw_texts[name] = raw
    
    # Find the visual observations portion (after the last structured field)
    # Count observation headers in the raw text
    headers = OBS_HEADER_PAT.findall(raw)
    csv_obs_counts[name] = len(headers)

# ---------- Cross-check ----------
issues = {
    "obs_count_mismatch": [],
    "missing_from_json": [],
    "type_suspicious": [],
    "empty_name": [],
    "field_mismatch": [],
    "empty_obs_text": [],
    "truncated_obs": [],
    "con_mismatch": [],
    "ra_mismatch": [],
}

# Check 1: Every old CSV name should be in JSON
for name in ordered_names:
    if name not in json_index:
        issues["missing_from_json"].append(name)

# Check 2: Observation count mismatches
total_missing_obs = 0
for name, csv_count in csv_obs_counts.items():
    if name not in json_index:
        continue
    obj = json_index[name]
    json_count = len(obj.get("observations", []))
    if csv_count != json_count:
        issues["obs_count_mismatch"].append({
            "name": name,
            "csv_obs": csv_count,
            "json_obs": json_count,
            "diff": csv_count - json_count,
        })
        total_missing_obs += max(0, csv_count - json_count)

# Check 3: Suspicious type values (too long = likely observation text leakage)
for obj in json_data:
    t = obj.get("type", "")
    if t and len(t) > 15:
        issues["type_suspicious"].append({"name": obj["name"], "type": t[:80]})

# Check 4: Cross-check fields with old CSV where available
for name, old_row in old_rows.items():
    if name not in json_index:
        continue
    obj = json_index[name]
    
    # Type check (old CSV col 1)
    old_type = old_row[1] if len(old_row) > 1 else ""
    json_type = obj.get("type", "")
    if old_type and json_type and old_type != json_type and len(json_type) > 15:
        issues["field_mismatch"].append({
            "name": name, "field": "type",
            "old_csv": old_type, "json": json_type[:60]
        })
    
    # Constellation check (old CSV col 15)
    old_con = old_row[15] if len(old_row) > 15 else ""
    json_con = obj.get("con", "")
    if old_con and json_con and old_con != json_con:
        issues["con_mismatch"].append({
            "name": name, "old_csv": old_con, "json": json_con
        })

# Check 5: Empty observation text in observations that have aperture/date
for obj in json_data:
    for obs in obj.get("observations", []):
        if obs.get("aperture") and not obs.get("text", "").strip():
            issues["empty_obs_text"].append({
                "name": obj["name"],
                "aperture": obs["aperture"],
                "date": obs.get("date", ""),
            })

# Check 6: Look for observations where text seems truncated
# (ends mid-word or mid-sentence without punctuation)
for obj in json_data:
    for obs in obj.get("observations", []):
        text = obs.get("text", "").strip()
        if text and len(text) > 50:
            last_char = text[-1]
            if last_char not in ".!?)\"'0123456789":
                # Check if it ends mid-word
                if not text[-1].isspace():
                    issues["truncated_obs"].append({
                        "name": obj["name"],
                        "aperture": obs.get("aperture", ""),
                        "text_end": text[-60:],
                    })

# ---------- Report ----------
print("=" * 70)
print("COMPREHENSIVE DATA CROSS-CHECK REPORT")
print("=" * 70)

print(f"\nJSON records: {len(json_data)}")
print(f"Old CSV records: {len(ordered_names)}")
print(f"Full CSV record boundaries: {len(positions)}")

print(f"\n--- Missing from JSON: {len(issues['missing_from_json'])} ---")
for name in issues["missing_from_json"][:10]:
    print(f"  {name}")

print(f"\n--- Observation Count Mismatches: {len(issues['obs_count_mismatch'])} ---")
print(f"    Total missing observations: {total_missing_obs}")
# Sort by diff descending
mismatches = sorted(issues["obs_count_mismatch"], key=lambda x: -x["diff"])
for m in mismatches[:30]:
    print(f"  {m['name']}: CSV={m['csv_obs']} JSON={m['json_obs']} (missing {m['diff']})")
if len(mismatches) > 30:
    print(f"  ... and {len(mismatches) - 30} more")

# Show distribution of mismatches
if mismatches:
    diffs = [m["diff"] for m in mismatches if m["diff"] > 0]
    print(f"\n  Distribution of missing obs (CSV > JSON):")
    print(f"    Missing 1 obs: {sum(1 for d in diffs if d == 1)}")
    print(f"    Missing 2 obs: {sum(1 for d in diffs if d == 2)}")
    print(f"    Missing 3+ obs: {sum(1 for d in diffs if d >= 3)}")

print(f"\n--- Suspicious Type Values: {len(issues['type_suspicious'])} ---")
for t in issues["type_suspicious"][:10]:
    print(f"  {t['name']}: '{t['type']}'")

print(f"\n--- Type Field Mismatches vs Old CSV: {len(issues['field_mismatch'])} ---")
for m in issues["field_mismatch"][:10]:
    print(f"  {m['name']}: old='{m['old_csv']}' json='{m['json']}'")

print(f"\n--- Constellation Mismatches: {len(issues['con_mismatch'])} ---")
for m in issues["con_mismatch"][:10]:
    print(f"  {m['name']}: old='{m['old_csv']}' json='{m['json']}'")

print(f"\n--- Empty Observation Text: {len(issues['empty_obs_text'])} ---")
for e in issues["empty_obs_text"][:10]:
    print(f"  {e['name']}: {e['aperture']} ({e['date']})")

print(f"\n--- Potentially Truncated Observations: {len(issues['truncated_obs'])} ---")
for t in issues["truncated_obs"][:10]:
    print(f"  {t['name']} ({t['aperture']}): ...{t['text_end']}")

print(f"\n{'=' * 70}")
print("SUMMARY")
print(f"{'=' * 70}")
total_issues = sum(len(v) for v in issues.values())
print(f"Total issues found: {total_issues}")
for key, val in issues.items():
    if val:
        print(f"  {key}: {len(val)}")
