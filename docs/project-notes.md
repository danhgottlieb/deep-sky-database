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
- Tested multiple exports: first CSV (27 cols) and TSV (24 cols) both had TRUNCATED long text fields
- Final working file: `deep_sky_notes_full.csv` — comma-delimited, 16 columns, 24,773 records, FULL untruncated text
- Validated NGC 1: all 5 observations present (24", 17.5" x2, 13.1" x2) ✅
- Ingested meeting transcript, Wikipedia bio, published articles list, existing website, photos
- Created project folder with git repo
- **Next:** Ask clarifying questions, then build website with multi-agent approach

## Primary Data File: deep_sky_notes_full.csv
- **Format:** Comma-delimited, HAS header row, multiline fields (need special parsing)
- **Records:** 24,773
- **Columns (16):**
  1. Name, 2. Other, 3. Type, 4. Nickname, 5. Class, 6. RA2000, 7. Dec2000,
  8. Size, 9. PA, 10. VMag, 11. BMag, 12. SB, 13. Con, 14. NGCDescription,
  15. DiscoveryDate, 16. VisualObservations

## Reference Materials
- Meeting transcript: ~44K chars, covers all requirements
- Wikipedia: https://en.wikipedia.org/wiki/Steve_Gottlieb_(amateur_astronomer)
- Existing site: https://adventuresindeepspace.com/steve.ngc.htm
- SIMBAD link format: https://simbad.cds.unistra.fr/simbad/sim-fid (Name in Identifier box)
- Published articles: 46 articles (1999-2026), mostly Sky & Telescope
- Photos: 7 images in data/ folder

## Website Requirements (from transcript)
### Pages/Sections:
1. **About Steve Gottlieb** — Bio, achievements, why this matters (informative but not braggadocious)
2. **Object Database/Explorer** — Main feature: search, filter, browse 24,773 objects
3. **Published Articles** — List of 46 articles with links where available

### Database Explorer Features:
- **Single object lookup:** Type NGC/IC/UGC number, jump directly to it
- **Multi-criteria filtering:**
  - Catalog type (NGC, IC, UGC, and others in the database)
  - Constellation (88 total — checkboxes or searchable multi-select)
  - Magnitude (less than / greater than)
  - Object type (GX, **, OC, RN, etc.)
  - Special lists: "T" = Gottlieb's top objects, "O" = Orion star atlas objects (from Code field — NOT in this export)
- **Object detail view — card/profile style:**
  - Name, Type, Class, Coordinates, Size, PA, Magnitudes, Constellation
  - NGC Description (historical)
  - Discovery Date
  - Visual Observations (main content — Gottlieb's notes, multiple telescope apertures)
  - SIMBAD link button for each object
- **Results list:** Scrollable list of filtered objects, each expandable or clickable to detail view
- **Visual style:** Modern, dark background, attractive but not gaudy, appropriate for scientific community
  - Card-based layout for individual objects
  - Some astronomical imagery for visual flair
  - Color-coded fields
  - More attractive than current plain text presentation

### SIMBAD Integration:
- Button on each object that opens SIMBAD with the object name pre-filled in Identifier field

### Key Quotes from Steve:
- "I would like to have a set of different filters so that someone could select a subset"
- "It could be more attractive than this... but I don't want to make it gaudy"
- Card-based layout: "a separate box labeled V mag with the number, a separate box for size..."
- Site name suggestion: "Gottlieb's Deep Sky Observations"

## Decisions & Notes
- The full export (deep_sky_notes_full.csv) is missing some fields from the original DB:
  Ratio, Code, Br Star, Date, WH, JH, GC, Other Observers, References, Corwin, Historical
- "Historical" content appears merged into VisualObservations or DiscoveryDate in the full export
- The "Code" field (which has T=top objects, O=Orion atlas) is NOT in this export — may need to get this
- Multiline fields in CSV require special parsing (not standard csv.reader compatible)
- NGC Description field contains commas — needs careful delimiter handling
