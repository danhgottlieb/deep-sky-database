import re

with open('data/deep_sky_notes_full.csv', 'r', encoding='utf-8', errors='replace') as f:
    text = f.read()

# Find all observation headers: aperture" (something):
pat = re.compile(r'\d+\.?\d*"\s*\([^)]{1,80}\)\s*:')
headers = pat.findall(text)

# Strict pattern
strict = re.compile(r'^\d+\.?\d*"\s*\(\d{1,2}/\d{1,2}/\d{2,4}\)\s*:$')
non_standard = [h for h in headers if not strict.match(h)]

print(f"Total observation headers: {len(headers)}")
print(f"Non-standard date formats: {len(non_standard)}")
for h in sorted(set(non_standard)):
    print(f"  {h}")
