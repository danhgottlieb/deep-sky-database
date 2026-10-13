#!/usr/bin/env python3
"""Validate every October data update, preservation guard, and new report."""

import re
import sys
from copy import deepcopy
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from import_october_2026_updates import (
    ARTICLES_PATH,
    CATALOGS_PATH,
    MANIFEST_PATH,
    UPDATE_DATE,
    affected_names,
    apply_updates,
    build_metadata,
    index_by_name,
    load_json,
    parse_records,
    source_to_object,
    split_aliases,
    split_observations,
    unchanged_records_digest,
    unique_object,
    validate_manifest,
)
from rebuild_blog_index import extract_search_text, validate_report_file_set


EXPECTED_REPORTS = (
    ("or-lake-sonoma-on-sep-5-2026", "OR: Lake Sonoma on Sep. 5, 2026", "September 5, 2026", 8),
    ("or-lake-sonoma-on-sep-7-2026", "OR: Lake Sonoma on Sep. 7, 2026", "September 7, 2026", 5),
)


class ReportImages(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images = []

    def handle_starttag(self, tag, attrs):
        if tag == "img":
            self.images.append(dict(attrs))


def expect_value_error(action, label):
    try:
        action()
    except ValueError:
        return
    raise AssertionError(f"{label}: invalid input was accepted")


def main():
    manifest = load_json(MANIFEST_PATH)
    validate_manifest(manifest)
    objects = load_json(ROOT / "data" / "data.json")
    assert objects == load_json(ROOT / "src" / "data.json"), "Data copies differ"
    names = index_by_name(objects)
    metadata = build_metadata(objects, UPDATE_DATE)
    assert metadata == load_json(ROOT / "data" / "metadata.json")
    assert metadata == load_json(ROOT / "src" / "metadata.json")
    assert metadata["totalRecords"] == 25077
    assert metadata["totalObservations"] == 33733
    summary = manifest["summary"]
    assert metadata["totalRecords"] == manifest["baseline"]["totalRecords"] + 69
    assert metadata["totalObservations"] == (
        manifest["baseline"]["totalObservations"]
        + summary["newObjectObservationCount"]
        + summary["visualObservationDelta"]
    )

    historical_new_names = {"IC 1550", "IC 1571", "IC 5376"}
    for record in manifest["newObjects"]:
        obj = unique_object(names, record["Name"])
        assert obj == source_to_object(record), f"{record['Name']}: new fields differ"
        assert obj["showHistorical"] == (obj["name"] in historical_new_names)
        assert bool(obj["ngcDescription"]) == (obj["name"] in historical_new_names)
    for record in manifest["historicalUpdates"]:
        obj = unique_object(names, record["Name"])
        assert obj["historical"] == record["Historical"], record["Name"]
        assert obj["showHistorical"], record["Name"]
    for record in manifest["visualUpdates"]:
        assert unique_object(names, record["Name"])["observations"] == split_observations(
            record["Visual Description"]
        ), record["Name"]
    for record in manifest["otherUpdates"]:
        target = manifest["otherUpdateTargets"].get(record["Name"], record["Name"])
        assert unique_object(names, target)["other"] == record["Other"], target
    for record in manifest["nicknameUpdates"]:
        assert unique_object(names, record["Name"])["nickname"] == record["Nickname"]
    for rename in manifest["primaryRenames"]:
        assert rename["oldName"].casefold() not in names
        obj = unique_object(names, rename["newName"])
        assert rename["oldName"].casefold() in {
            alias.casefold() for alias in split_aliases(obj["other"])
        }, f"{rename['newName']}: old designation is not searchable"
    assert unique_object(names, "LBN 544")
    assert "simeis 16" not in names, "LBN 544 was unexpectedly renamed"
    assert unchanged_records_digest(objects, manifest) == (
        manifest["baseline"]["unchangedRecordCount"],
        manifest["baseline"]["unchangedRecordsSha256"],
    )
    print("PASS all 69 new, 6 historical, 55 visual, 114 alias, 4 rename and 1 nickname updates")
    print("PASS historical visibility: only the three requested new IC objects")
    print("PASS totals: 25,077 objects and 33,733 observations; unchanged records preserved")

    catalogs = load_json(CATALOGS_PATH)
    articles = load_json(ARTICLES_PATH)
    night_vision = next(catalog for catalog in catalogs["catalogs"] if catalog["id"] == "night-vision")
    assert night_vision["sourceCount"] == night_vision["statedCount"] == 358
    assert set(manifest["nightVisionNames"]) <= set(night_vision["objectNames"])
    assert "Simeis 68" in night_vision["objectNames"]
    assert "DWB 70" not in night_vision["objectNames"]
    replayed, replayed_catalogs, replayed_articles, replay_summary = apply_updates(
        objects, catalogs, articles, manifest
    )
    assert replayed == objects
    assert replayed_catalogs == catalogs
    assert replayed_articles == articles
    assert not replay_summary["insertedThisRun"]
    assert not replay_summary["nightVisionAddedThisRun"]
    assert replay_summary["visualObservationDelta"] == 0
    print("PASS Night Vision: all 31 additions and renamed membership; replay is idempotent")

    for invalid in ("Example\u00f7alias", "Example\u00f7alias\u00f7extra\u00bf"):
        expect_value_error(
            lambda: parse_records(invalid, ("Name", "Other"), 1, "test"),
            "Malformed record",
        )
    expect_value_error(
        lambda: parse_records(
            "Example\u00f7alias\u00bf\nExample\u00f7alias\u00bf",
            ("Name", "Other"),
            2,
            "test",
        ),
        "Duplicate source",
    )
    altered_manifest = deepcopy(manifest)
    altered_manifest["newObjects"][0]["Other"] += " changed"
    expect_value_error(lambda: validate_manifest(altered_manifest), "Source integrity")
    duplicate_objects = objects + [dict(unique_object(names, "UGC 12904"))]
    expect_value_error(
        lambda: apply_updates(duplicate_objects, catalogs, articles, manifest),
        "Existing primary collision",
    )
    protected_objects = list(objects)
    affected = affected_names(manifest)
    protected_index = next(i for i, obj in enumerate(objects) if obj["name"] not in affected)
    protected_objects[protected_index] = dict(objects[protected_index], nickname="unrequested edit")
    expect_value_error(
        lambda: apply_updates(protected_objects, catalogs, articles, manifest),
        "Unrelated record protection",
    )
    later_objects = list(objects)
    later_index = next(i for i, obj in enumerate(objects) if obj["name"] == "Simeis 22")
    later_objects[later_index] = dict(objects[later_index], nickname="A later nickname")
    expect_value_error(
        lambda: apply_updates(later_objects, catalogs, articles, manifest),
        "Later targeted record protection",
    )
    later_catalogs = deepcopy(catalogs)
    later_night_vision = next(
        catalog for catalog in later_catalogs["catalogs"] if catalog["id"] == "night-vision"
    )
    later_night_vision["objectNames"].remove(manifest["nightVisionNames"][0])
    later_night_vision["sourceCount"] -= 1
    later_night_vision["statedCount"] -= 1
    expect_value_error(
        lambda: apply_updates(objects, later_catalogs, articles, manifest),
        "Later catalog membership protection",
    )
    print("PASS fail-closed checks: malformed records, duplicates, source tampering, unrelated edits")
    print("PASS already-imported protection: later edits to targeted objects and catalogs")

    entries = load_json(ROOT / "src" / "blog" / "blog_index.json")
    validate_report_file_set(entries)
    assert len(entries) == 136
    for slug, title, date, image_count in EXPECTED_REPORTS:
        matching = [entry for entry in entries if entry["slug"] == slug]
        assert len(matching) == 1, slug
        entry = matching[0]
        assert entry["title"] == title and entry["date"] == date
        assert entry["images"] == image_count
        path = ROOT / "src" / "blog" / entry["filename"]
        report_html = path.read_text(encoding="utf-8")
        assert f'<h1 class="blog-title">{title}</h1>' in report_html
        assert f'<span class="blog-date">{date}</span>' in report_html
        assert "../css/blog.css" in report_html
        assert 'class="blog-figure"' in report_html
        images = ReportImages()
        images.feed(report_html)
        assert len(images.images) == image_count
        for image in images.images:
            assert image["loading"] == "lazy"
            assert (path.parent / image["src"]).is_file(), image["src"]
        assert entry["search_text"] == extract_search_text(report_html, entry.get("objects", ""))

    home = (ROOT / "src" / "index.html").read_text(encoding="utf-8")
    explorer = (ROOT / "src" / "explorer" / "index.html").read_text(encoding="utf-8")
    reports = (ROOT / "src" / "reports" / "index.html").read_text(encoding="utf-8")
    for element_id, expected in (
        ("stat-records", "25,077"),
        ("stat-observations", "33,733"),
        ("stat-reports", "136"),
    ):
        assert re.search(rf'id="{element_id}">{re.escape(expected)}<', home)
    assert "25,077 deep sky objects with 33,733 detailed visual observations" in explorer
    assert "Database updated on October 10, 2026." in explorer
    assert 'id="blog-report-count">136 reports</div>' in reports
    print("PASS reports: 136 indexed reports; both new titles, dates and all 13 images")
    print("PASS Home/Explorer/Reports totals and October 10, 2026 update date")


if __name__ == "__main__":
    main()
