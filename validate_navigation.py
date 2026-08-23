#!/usr/bin/env python3
"""Validate shipped Articles dropdowns and publication page headings."""

import argparse
import re
import sys
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"

EXPECTED_LINKS = (
    (b"Sky &amp; Telescope", b"/articles/"),
    (b"Astronomy Magazine", b"/astronomy-articles/"),
    (b"Deep Sky Magazine", b"/deep-sky-magazine/"),
    (b"Deep Sky Forum", b"/ootw/"),
)
EXPECTED_MENU_PATHS = {
    "src/articles/index.html",
    "src/astronomy-articles/index.html",
    "src/contact/index.html",
    "src/deep-sky-magazine/index.html",
    "src/explorer/index.html",
    "src/index.html",
    "src/library/index.html",
    "src/ootw/index.html",
    "src/reports/index.html",
    "src/resources/index.html",
    *(f"src/ootw/ootw-{number:02}.html" for number in range(1, 77)),
}
PUBLICATION_HEADINGS = {
    "src/articles/index.html": (
        b"Sky &amp; Telescope articles",
        b"Published Articles (Sky &amp; Telescope)",
    ),
    "src/astronomy-articles/index.html": (
        b"Astronomy Magazine articles",
        b"Published Articles (Astronomy Magazine)",
    ),
    "src/deep-sky-magazine/index.html": (
        b"Deep Sky Magazine articles",
        b"Published Articles (Deep Sky Magazine)",
    ),
}

UL_RE = re.compile(rb"<ul\b(?P<attrs>[^>]*)>(?P<body>.*?)</ul>", re.DOTALL)
CLASS_RE = re.compile(rb"\bclass=[\"'](?P<value>[^\"']*)[\"']")
ANCHOR_RE = re.compile(rb"<a\b(?P<attrs>[^>]*)>(?P<label>.*?)</a>", re.DOTALL)
HREF_RE = re.compile(rb"\bhref=[\"'](?P<value>[^\"']*)[\"']")
TAG_RE = re.compile(rb"<[^>]+>")
TITLE_RE = re.compile(rb"<title>(.*?)</title>", re.DOTALL)
HEADING_RE = re.compile(
    rb"<h2\b[^>]*\bclass=[\"'][^\"']*\bsection-title\b[^\"']*[\"'][^>]*>"
    rb"(.*?)</h2>",
    re.DOTALL,
)
OLD_MENU_ORDER_RE = re.compile(
    rb"(?m)^(?P<indent>[ \t]*)<li><a(?P<forum_attrs>[^>]*)>"
    rb"Deep Sky Forum</a></li>(?P<eol>\r?\n)"
    rb"(?P=indent)<li><a(?P<magazine_attrs>[^>]*)>"
    rb"Deep Sky Magazine</a></li>"
)


def relative_path(path):
    return path.relative_to(ROOT).as_posix()


def article_menus(data):
    menus = []
    for match in UL_RE.finditer(data):
        class_match = CLASS_RE.search(match.group("attrs"))
        classes = class_match.group("value").split() if class_match else []
        entries, _ = menu_entries(match.group("body"))
        has_expected_four_hrefs = (
            len(entries) == 4
            and {href for _, href in entries} == {href for _, href in EXPECTED_LINKS}
        )
        if b"nav-dropdown-menu-articles" in classes or has_expected_four_hrefs:
            menus.append(match)
    return menus


def menu_entries(body):
    entries = []
    active_count = 0
    for anchor in ANCHOR_RE.finditer(body):
        href_match = HREF_RE.search(anchor.group("attrs"))
        label = TAG_RE.sub(b"", anchor.group("label")).strip()
        href = href_match.group("value") if href_match else None
        entries.append((label, href))

        class_match = CLASS_RE.search(anchor.group("attrs"))
        if class_match and b"active" in class_match.group("value").split():
            active_count += 1
    return tuple(entries), active_count


def validate_site():
    errors = []
    actual_menu_paths = set()
    menu_count = 0

    for path in sorted(SRC.rglob("*.html")):
        data = path.read_bytes()
        menus = article_menus(data)
        if menus:
            actual_menu_paths.add(relative_path(path))
        if len(menus) > 1:
            errors.append(f"{relative_path(path)}: found {len(menus)} Articles dropdowns")

        for menu in menus:
            menu_count += 1
            entries, active_count = menu_entries(menu.group("body"))
            if entries != EXPECTED_LINKS:
                errors.append(
                    f"{relative_path(path)}: unexpected Articles links/order: {entries!r}"
                )
            if active_count > 1:
                errors.append(
                    f"{relative_path(path)}: Articles dropdown has {active_count} active links"
                )

    missing = sorted(EXPECTED_MENU_PATHS - actual_menu_paths)
    extra = sorted(actual_menu_paths - EXPECTED_MENU_PATHS)
    if missing:
        errors.append(f"missing Articles dropdowns: {', '.join(missing)}")
    if extra:
        errors.append(f"unexpected Articles dropdowns: {', '.join(extra)}")
    if menu_count != len(EXPECTED_MENU_PATHS):
        errors.append(
            f"expected {len(EXPECTED_MENU_PATHS)} Articles dropdowns, found {menu_count}"
        )

    for rel_path, (heading, old_heading) in PUBLICATION_HEADINGS.items():
        data = (ROOT / rel_path).read_bytes()
        title_matches = TITLE_RE.findall(data)
        heading_matches = HEADING_RE.findall(data)
        expected_title = heading + b" \xe2\x80\x94 Steve Gottlieb's Deep Sky"
        if title_matches != [expected_title]:
            errors.append(
                f"{rel_path}: expected title {expected_title!r}, found {title_matches!r}"
            )
        if heading_matches != [heading]:
            errors.append(
                f"{rel_path}: expected section heading {heading!r}, "
                f"found {heading_matches!r}"
            )
        if old_heading in data:
            errors.append(f"{rel_path}: old Published Articles text remains")

    return errors, menu_count


def transform_baseline(rel_path, data):
    menus = article_menus(data)
    replacements = 0
    output = bytearray()
    cursor = 0

    for menu in menus:
        body = menu.group("body")

        def reorder(match):
            nonlocal replacements
            replacements += 1
            return (
                match.group("indent")
                + b"<li><a"
                + match.group("magazine_attrs")
                + b">Deep Sky Magazine</a></li>"
                + match.group("eol")
                + match.group("indent")
                + b"<li><a"
                + match.group("forum_attrs")
                + b">Deep Sky Forum</a></li>"
            )

        reordered_body, count = OLD_MENU_ORDER_RE.subn(reorder, body)
        if count != 1:
            raise ValueError(
                f"{rel_path}: expected one old-order pair in Articles dropdown, found {count}"
            )
        output.extend(data[cursor : menu.start("body")])
        output.extend(reordered_body)
        cursor = menu.end("body")

    output.extend(data[cursor:])
    transformed = bytes(output)

    if rel_path in PUBLICATION_HEADINGS:
        heading, old_heading = PUBLICATION_HEADINGS[rel_path]
        expected_old_title = old_heading + b" \xe2\x80\x94 Steve Gottlieb's Deep Sky"
        expected_new_title = heading + b" \xe2\x80\x94 Steve Gottlieb's Deep Sky"
        if transformed.count(expected_old_title) != 1:
            raise ValueError(f"{rel_path}: baseline title was not the expected old title")
        if transformed.count(old_heading) != 2:
            raise ValueError(
                f"{rel_path}: baseline did not contain exactly two old heading strings"
            )
        transformed = transformed.replace(expected_old_title, expected_new_title, 1)
        transformed = transformed.replace(old_heading, heading, 1)

    return transformed, replacements


def validate_baseline(snapshot_path):
    errors = []
    changed_files = []
    reordered_menus = 0
    current_paths = {
        relative_path(path): path for path in sorted(SRC.rglob("*.html"))
    }

    with zipfile.ZipFile(snapshot_path) as snapshot:
        baseline_paths = {
            name for name in snapshot.namelist() if name.startswith("src/") and name.endswith(".html")
        }
        if baseline_paths != set(current_paths):
            missing = sorted(baseline_paths - set(current_paths))
            extra = sorted(set(current_paths) - baseline_paths)
            errors.append(f"HTML path set changed; missing={missing}, extra={extra}")
            return errors, changed_files, reordered_menus

        for rel_path, path in current_paths.items():
            before = snapshot.read(rel_path)
            try:
                expected, replacements = transform_baseline(rel_path, before)
            except ValueError as exc:
                errors.append(str(exc))
                continue

            after = path.read_bytes()
            if before != after:
                changed_files.append(rel_path)
            reordered_menus += replacements
            if after != expected:
                errors.append(f"{rel_path}: contains changes outside the allowed transforms")

    return errors, changed_files, reordered_menus


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--baseline-zip",
        type=Path,
        help="verify current HTML bytes against a pre-change ZIP snapshot",
    )
    args = parser.parse_args()

    errors, menu_count = validate_site()
    changed_files = []
    reordered_menus = 0
    if args.baseline_zip:
        baseline_errors, changed_files, reordered_menus = validate_baseline(
            args.baseline_zip
        )
        errors.extend(baseline_errors)

    if errors:
        print("Navigation validation FAILED:")
        for error in errors:
            print(f"  - {error}")
        return 1

    print(
        f"Navigation validation passed: {menu_count} Articles dropdowns in "
        f"{len(EXPECTED_MENU_PATHS)} HTML files, with at most one active link each."
    )
    print("Publication titles/headings passed: 3 pages.")
    if args.baseline_zip:
        print(
            f"Byte comparison passed: {len(changed_files)} HTML files changed, "
            f"{reordered_menus} menus reordered, and only 6 approved "
            "title/heading replacements occurred outside navigation blocks."
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
