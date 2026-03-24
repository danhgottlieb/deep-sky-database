# Changelog — Steve Gottlieb's Deep Sky Observation Database

All notable changes to this project are documented in this file.
Maintained as a running log of development work, decisions, and fixes.

---

## 2026-03-24

### SIMBAD Coordinate Query
- Changed SIMBAD button from name-based lookup (`sim-id`) to coordinate-based query (`sim-coo`)
- Uses object RA/Dec with 0.2 arcmin search radius — finds objects regardless of catalogue naming differences
- Commit: `3629e34`

### Object Type Display
- Detail panel type badge now shows only the expanded name (e.g., "Galaxy" instead of "GX — Galaxy")
- Falls back to abbreviation if no expansion exists
- Commit: `14295e9`

### Aladin Lite UI Dark Theme
- Overrode default purple background / grey text on overlay panels
- Applied dark background `rgba(20,20,30,0.95)` with light text `#e0e0e0` using CSS `!important`
- Commit: `bdffcba`

### Orion DeepMap 600 Quick Filter
- Replaced "★ Gottlieb's Top Objects" button with "🗺️ Orion DeepMap 600"
- Filters by `isOrionAtlas` property (reference code "o" in source data)
- Commit: `a7cd0aa`

### Telescope List Update
- Added "C-8 Schmidt-Cassegrain: Finished the Messier list, many NGCs (1980–1984)" to introduction
- Commit: `8d3b90e`

---

## 2026-03-23

### Blog Post Rebuild (4 articles with external images)
- **Root cause:** 4 email-sourced articles had images hosted on Google Groups (not embedded as attachments), so `convert_emails.py` couldn't extract them
- **Affected articles:**
  - Lake Sonoma, Dec 30 2024 (6 images)
  - Lake Sonoma, Jan 19 2026 (10 images)
  - Lowrey 48" Part 2, Nov 20 2025 (8 images)
  - Lowrey 48" Final Part 3, Nov 21 2025 (8 images)
- Downloaded all 32 images from Google Groups URLs
- Completely rebuilt all 4 HTML files from original email source with correct template structure
- Fixed: nested `<html>/<body>` tags, missing author/date meta, `&quot;` entities in body, excessive `<br>` tags, wrong image markup
- Commits: `4040d0f`, `3a98923`, `fec08b9`, `de76f09`

### Galaxy Loading Spinner
- Replaced simple CSS spinner with real NASA M101 Pinwheel Galaxy image (public domain, Wikimedia Commons)
- Processed: cropped to square, 400×400px, brightness boosted, circular soft-edge mask with transparency
- Slow 20-second CSS rotation animation
- File: `src/img/galaxy_spinner.png`
- Commits: `00deacb`, `af0132c`

### Observing Reports Count in Hero Stats
- Added 4th stat box "Observing Reports" between Telescope Range and Published Articles
- Count loads dynamically from `blog_index.json` — auto-updates when reports are added
- Commit: `ce02b4d`

### HTML Entity Encoding Fix
- **Root cause:** `blog_index.json` stored titles with HTML entities (`&quot;`, `&#x27;`) which got double-escaped by `escHtml()` in app.js
- Decoded 9 titles in `blog_index.json` using `html.unescape()`
- Fixed 11 blog HTML files with entities in `<title>` and `<h1>` tags
- Fixed 6 Facebook URLs with `&amp;` in `articles_index.json`
- Reordered Lowrey 48" Nov 2025 parts to correct sequence (Part 1 → Part 2 → Final Part 3)
- Commit: `80df31e`

### Aladin Lite Sky Atlas Integration
- Added Aladin Lite v3 JavaScript viewer to object detail panel
- 15 arcmin field of view, positioned above the data grid
- Survey auto-selection by declination: Dec > −5° → SDSS9, Dec > −30° → PanSTARRS, else → DSS2
- Users can manually switch surveys via layers control
- RA/Dec conversion from sexagesimal ("HH MM SS.S") to decimal degrees
- Added proper CDS attribution in footer with 3 required citations
- Commit: `80df31e`

### Blog Date Corrections
- Fixed 12 incorrect dates caused by bulk-publishing artifacts
- Key fixes: McArthur → Aug 10 2023, GSSP 2019 → July 2019, Modoc II → June 16 2015, Sierra Buttes → July 20–27 2006, Lunar Eclipse → Feb 20 2008, Australia → April 2008, CalStar → October 2012
- Removed duplicate `sierra-buttes-and-lassen-720-to-727-part-i.html`
- Commit: `80df31e`

---

## 2026-03-22

### Observing Reports Redesign
- Renamed "Blog" section to "Observing Reports"
- Redesigned layout as year-grouped chronological timeline
- Reordered sections: Database → Observing Reports → Articles
- Commits: `8e97d80`, `6e1601e`

### New Observing Reports from Email
- Added 8 new reports (2024–2026) converted from Outlook .msg files
- Created `convert_emails.py` tool for MSG → HTML conversion
- Extracted 24 embedded images from email attachments
- Commits: `9ae8f35`

---

## 2026-03-21

### Encoding & Parsing Overhaul
- **Root cause:** Source files from Panorama DB use Mac Roman encoding (byte 0x8E = é)
- Fixed 3,975 records with accented astronomer names (e.g., Stéphane Javelle)
- Fixed comma-in-field CSV parsing with `_split_desc_date()` 3-tuple helper
- Reduced suspect discovery dates from 693 → 0
- Commit: `d4ba594`

### Visual Upgrade & Blog Integration
- Added Rho Ophiuchi nebula background image (CC BY-SA 3.0, Adam Block)
- Integrated blog/observing reports from adventuresindeepspace.com (112 articles scraped)
- Cleaned hit counters from ~60 blog files
- Added starfield canvas with shooting stars and rare satellites
- Added photo carousel, cosmic dividers, scroll-reveal animations
- Commit: `4bbf49b`

---

## 2026-03-20

### Initial Website Build
- Built complete SPA with dark space theme, client-side search, multi-criteria filtering
- Catalog quick-filter buttons: NGC, IC, UGC
- Object detail slide-over panel with observations split by aperture
- Historical background narratives for NGC/IC objects
- Responsive design for mobile
- Commits: `a888e8c`, `781c9a6`, `763f01d`, `f897949`, `3a5f213`

### Data Pipeline
- Built `build_data.py`: CSV → JSON pipeline for 24,773 records (16-column format)
- Handles: comma-delimited fields, observation header splitting (4 patterns), historical text matching
- References column: `t` = Top Object, `o` = Orion Star Atlas
- Commit: `70ce517`

### Project Setup
- Initial repository creation
- Commit: `65482aa`

---

## Architecture & Key Decisions

| Decision | Rationale |
|----------|-----------|
| Static SPA (no server) | Simple hosting, works on GitHub Pages, all data client-side |
| Mac Roman encoding | Panorama DB exports use this encoding natively |
| `_split_desc_date()` 3-tuple | Only reliable way to parse unquoted CSV with commas in description field |
| Aladin Lite v3 (not ipyaladin) | ipyaladin is for Jupyter notebooks; v3 JS library works in any browser |
| Survey by declination | SDSS9 covers ~35% of sky (dec > −5°), PanSTARRS dec > −30°, DSS2 full sky |
| SIMBAD coordinate query | Name-based lookup fails when catalogue format doesn't match SIMBAD identifiers |
| Title date > email date | Bulk-published emails have wrong send dates; observing date from title is authoritative |
| Blog HTML from email source | Re-parsing original email HTML gives clean structure vs. patching broken output |

## File Map

| Path | Purpose |
|------|---------|
| `build_data.py` | CSV → JSON data pipeline (mac_roman, date parsing) |
| `convert_emails.py` | Outlook .msg → HTML blog converter |
| `src/index.html` | Main HTML — all sections, nav, structure |
| `src/css/style.css` | All styles (dark theme, responsive, Aladin overrides) |
| `src/js/app.js` | All app logic (search, filters, detail panel, Aladin, blog) |
| `src/data.json` | 24,773 records (built output) |
| `src/blog/blog_index.json` | 120 observing report entries |
| `src/blog/articles_index.json` | 46 published article entries |
| `src/blog/*.html` | Individual observing report pages |
