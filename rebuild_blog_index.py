"""Refresh searchable observing-report text without changing index metadata."""

import json
import re
from html.parser import HTMLParser
from pathlib import Path


BLOG_DIR = Path(__file__).resolve().parent / "src" / "blog"
INDEX_PATH = BLOG_DIR / "blog_index.json"


class ReportSearchTextParser(HTMLParser):
    """Extract visible report text, including names only mentioned in prose."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.content_depth = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "div":
            classes = attrs.get("class", "").split()
            if self.content_depth:
                self.content_depth += 1
            elif "blog-content" in classes:
                self.content_depth = 1

        if not self.content_depth:
            return

        if tag == "img" and attrs.get("alt"):
            self.parts.append(attrs["alt"])

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if tag == "div" and self.content_depth:
            self.content_depth -= 1

    def handle_data(self, data):
        if self.content_depth:
            self.parts.append(data)


def extract_search_text(html_text, existing_objects=""):
    parser = ReportSearchTextParser()
    parser.feed(html_text)
    report_text = re.sub(r"\s+", " ", " ".join(parser.parts)).strip()
    return " | ".join(term for term in (existing_objects, report_text) if term)


def validate_report_file_set(entries):
    indexed_filenames = {
        entry.get("filename")
        for entry in entries
        if entry.get("filename")
    }
    report_filenames = {path.name for path in BLOG_DIR.glob("*.html")}
    missing_reports = sorted(indexed_filenames - report_filenames)
    unindexed_reports = sorted(report_filenames - indexed_filenames)
    if missing_reports or unindexed_reports:
        raise ValueError(
            "Observing-report index does not match report files; "
            f"missing={missing_reports}, unindexed={unindexed_reports}"
        )


def refresh_index(entries):
    validate_report_file_set(entries)
    refreshed = []
    for entry in entries:
        filename = entry.get("filename")
        if not filename:
            raise ValueError(f"Index entry has no filename: {entry!r}")
        report_path = BLOG_DIR / filename
        if not report_path.is_file():
            raise FileNotFoundError(f"Indexed report does not exist: {filename}")

        updated = dict(entry)
        updated["search_text"] = extract_search_text(
            report_path.read_text(encoding="utf-8"),
            entry.get("objects", ""),
        )
        refreshed.append(updated)
    return refreshed


def main():
    entries = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    refreshed = refresh_index(entries)

    slugs = [entry.get("slug") for entry in refreshed]
    filenames = [entry.get("filename") for entry in refreshed]
    if len(slugs) != len(set(slugs)):
        raise ValueError("Duplicate report slugs found")
    if len(filenames) != len(set(filenames)):
        raise ValueError("Duplicate report filenames found")

    with INDEX_PATH.open("w", encoding="utf-8", newline="\n") as index_file:
        index_file.write(json.dumps(refreshed, indent=2, ensure_ascii=False) + "\n")
    print(f"Refreshed search text for {len(refreshed)} reports.")


if __name__ == "__main__":
    main()
