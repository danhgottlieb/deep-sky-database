"""Validate observing-report glyph and search-index requirements."""

import json
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from rebuild_blog_index import extract_search_text, validate_report_file_set


BLOG_DIR = ROOT / "src" / "blog"
INDEX_PATH = BLOG_DIR / "blog_index.json"
REPORTS_PAGE = ROOT / "src" / "reports" / "index.html"
GSSP_FILENAME = "golden-state-star-party-july-10-14-2026.html"
GSSP_SLUG = GSSP_FILENAME.removesuffix(".html")
QUERIES = ("Barnard", "Barnard's Galaxy", "Barnard’s Galaxy", "NGC 6822")


def normalize_search_text(value):
    value = unicodedata.normalize("NFKC", str(value or "")).casefold()
    return "".join("'" if char in "‘’ʼ＇" else char for char in value)


def report_matches(entry, query):
    haystack = " ".join(
        str(entry.get(field, ""))
        for field in ("title", "date", "objects", "search_text")
    )
    return normalize_search_text(query).strip() in normalize_search_text(haystack)


def main():
    report_html = (BLOG_DIR / GSSP_FILENAME).read_text(encoding="utf-8")
    assert "\u0384" not in report_html, "GSSP report still contains U+0384"
    assert "\u00b4" not in report_html, "GSSP report still contains spacing acute accents"
    assert "&prime;" in report_html, "GSSP report has no browser-safe arcminute entities"
    assert "20” to 25”" in report_html
    assert "2.6&quot; separation" in report_html

    entries = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    assert len(entries) == 134, f"Expected 134 reports, found {len(entries)}"
    assert len({entry["slug"] for entry in entries}) == 134
    assert len({entry["filename"] for entry in entries}) == 134
    validate_report_file_set(entries)
    assert 'app.js?v=66' in REPORTS_PAGE.read_text(encoding="utf-8")

    gssp = next(entry for entry in entries if entry["slug"] == GSSP_SLUG)
    expected_search_text = extract_search_text(report_html, gssp.get("objects", ""))
    assert gssp.get("search_text") == expected_search_text, "GSSP search text is stale"
    normalized_gssp = normalize_search_text(gssp["search_text"])
    assert "barnard's galaxy" in normalized_gssp
    assert "ngc 6822" in normalized_gssp

    for query in QUERIES:
        matches = [entry["slug"] for entry in entries if report_matches(entry, query)]
        assert GSSP_SLUG in matches, f"{query!r} does not select the GSSP report"
        print(f"PASS search {query!r}: GSSP selected ({len(matches)} result(s))")

    print("PASS glyphs: no U+0384/U+00B4; browser-safe &prime; present; arcseconds unchanged")
    print("PASS index: valid JSON, 134 unique slugs and 134 unique filenames")
    print("PASS index coverage: every report HTML file is indexed exactly once")
    print("PASS GSSP search text: Barnard's Galaxy and NGC 6822 indexed")


if __name__ == "__main__":
    main()
