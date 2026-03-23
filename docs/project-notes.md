# Deep Sky Notes Website Project

## Overview
Building a website from a Panorama database (.pan) of deep sky astronomical objects.
The database was exported to CSV format for reliable parsing.

## Data Source
- **Original:** Panorama database (`Samplefile.pan`, ~31.5 MB, proprietary binary format)
- **Working copy:** `data/deep_sky_notes.csv` (comma-delimited export, ~15 MB)
- **Records:** 24,773
- **Columns:** 27

## Database Schema (27 columns)
| # | Column | Description |
|---|--------|-------------|
| 1 | Name | Object designation (e.g., NGC 1, IC 2035, STT 74) |
| 2 | Type | Object type: GX (galaxy), ** (double star), RN (reflection nebula), etc. |
| 3 | Other | Alternate catalog designations (UGC, MCG, ESO, PGC, etc.) |
| 4 | Nickname | Common name if any |
| 5 | Class | Morphological classification (e.g., SA(s)b, SB0 pec?) |
| 6 | RA2000 | Right Ascension (J2000 epoch), format: HH MM SS.s |
| 7 | Dec2000 | Declination (J2000 epoch), format: +/-DD MM SS |
| 8 | Size | Angular size (e.g., 1.6'x1.2') |
| 9 | PA | Position angle in degrees |
| 10 | Ratio | Axis ratio |
| 11 | VMag | Visual magnitude (or component mags for doubles, e.g., 7.4/9.4) |
| 12 | BMag | Blue magnitude |
| 13 | SB | Surface brightness |
| 14 | Code | Internal code |
| 15 | Br Star | Bright star reference |
| 16 | Con | Constellation abbreviation (e.g., Peg, And, Hor) |
| 17 | Date | Observation date (MM/DD/YY) |
| 18 | NGC Description | Original NGC/IC description text |
| 19 | WH | William Herschel catalog number |
| 20 | JH | John Herschel catalog number |
| 21 | GC | General Catalogue number |
| 22 | Other Observers | Historical observers |
| 23 | References | Reference codes |
| 24 | Corwin | Corwin's notes/date |
| 25 | Discovery Date | Discovery history (often detailed narrative) |
| 26 | Historical | Additional historical context |
| 27 | General/Description | Gottlieb's observing notes — the primary descriptive content |

## Session Log

### Session 1 — 2026-03-23
- Analyzed original .pan binary file; confirmed it's a Panorama DB (ProVUE, macOS)
- Identified record structure: length-prefixed fields with 0x80 0x00 0x01 record separators
- Successfully extracted ~23,600 records from binary, but CSV export is cleaner
- Switched to comma-delimited export: 24,773 records, 27 columns, fully parseable
- Validated data: record #55 (BU 281, double star in Pisces) and NGC 1 (galaxy in Pegasus) both read correctly
- Created project folder `C:\Users\dagottl\deep-sky-website\` with git repo
- **Next:** User to provide website design requirements

## Decisions & Notes
- The .pan file has 30 fields; the CSV export has 27 (the "?" field, "NGC" field, and possibly one other were excluded or merged)
- The "General/Description" field (col 27) contains Gottlieb's observing notes
- "Discovery Date" field (col 25) often contains detailed narrative history, not just a date
- File has no header row — field names are known from the .pan schema analysis
