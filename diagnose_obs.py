"""Diagnose why specific objects have missing observations."""
import re
import csv
import json
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
MAIN_CSV = os.path.join(DATA_DIR, "deep_sky_notes_full.csv")
OLD_CSV  = os.path.join(DATA_DIR, "deep_sky_notes.csv")
JSON_FILE = os.path.join(DATA_DIR, "data.json")

# Load JSON
with open(JSON_FILE, "r") as f:
    json_data = json.load(f)
json_index = {obj["name"]: obj for obj in json_data}

# Load old CSV
old_rows = {}
with open(OLD_CSV, "r", encoding="utf-8", errors="replace") as f:
    for row in csv.reader(f):
        if row:
            old_rows[row[0]] = row

# Load full CSV
with open(MAIN_CSV, "r", encoding="utf-8", errors="replace") as f:
    full_text = f.read()
header_end = full_text.index("\n") + 1
body = full_text[header_end:]

ordered_names = list(old_rows.keys())

# Find boundaries
positions = []
search_from = 0
seen = set()
for name in ordered_names:
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

# Observation header patterns
STRICT_PAT = re.compile(r'(?<![.\d])\d+\.?\d*"\s*\([^)]+\)\s*:')

# Check specific problem objects
problem_objects = ["NGC 104", "Eta Carinae", "NGC 5139", "NGC 4565", "NGC 7331"]

for target in problem_objects:
    print(f"\n{'='*70}")
    print(f"DIAGNOSING: {target}")
    print(f"{'='*70}")
    
    # Find raw CSV text
    for i, (pos, name) in enumerate(positions):
        if name == target:
            end = positions[i+1][0] if i+1 < len(positions) else len(body)
            raw = body[pos:end]
            
            # Find all observation headers
            headers = STRICT_PAT.findall(raw)
            print(f"  CSV observation headers found: {len(headers)}")
            for h in headers:
                print(f"    {h[:80]}")
            
            # JSON observations
            if target in json_index:
                obj = json_index[target]
                obs = obj.get("observations", [])
                print(f"\n  JSON observations: {len(obs)}")
                for o in obs:
                    print(f"    {o['aperture']} ({o['date']}): {o['text'][:60]}...")
            
            # Show the visual observations field
            # After RA/Dec and structured fields, find where obs start
            print(f"\n  Raw CSV obs portion (last 2000 chars):")
            print(f"    {raw[-2000:]}")
            break
    else:
        print(f"  NOT FOUND in CSV boundaries")

# Also check: how many mismatches are JSON > CSV (extra obs in JSON)?
print(f"\n{'='*70}")
print("MISMATCH DIRECTION ANALYSIS")
print(f"{'='*70}")

pos_dict = {name: i for i, (pos, name) in enumerate(positions)}
json_more = 0
csv_more = 0
equal = 0
csv_more_by_1 = 0

for name in ordered_names:
    if name not in json_index or name not in pos_dict:
        continue
    idx = pos_dict[name]
    end = positions[idx+1][0] if idx+1 < len(positions) else len(body)
    raw = body[positions[idx][0]:end]
    csv_count = len(STRICT_PAT.findall(raw))
    json_count = len(json_index[name].get("observations", []))
    
    if csv_count > json_count:
        csv_more += 1
        if csv_count - json_count == 1:
            csv_more_by_1 += 1
    elif json_count > csv_count:
        json_more += 1
    else:
        equal += 1

print(f"  Equal: {equal}")
print(f"  CSV has more obs: {csv_more} (of which off-by-1: {csv_more_by_1})")
print(f"  JSON has more obs: {json_more}")
