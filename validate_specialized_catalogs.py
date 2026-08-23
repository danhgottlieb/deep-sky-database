#!/usr/bin/env python3
"""Validate specialized Explorer catalogs against the canonical dataset."""

import collections
import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MANIFEST_PATH = ROOT / "src" / "specialized-catalogs.json"
DATA_PATH = ROOT / "src" / "data.json"
APP_PATH = ROOT / "src" / "js" / "app.js"
STYLE_PATH = ROOT / "src" / "css" / "style.css"

EXPECTED_CATALOGS = {
    "coma-gx-cluster": {
        "filterLabel": "Coma GX Cluster",
        "detailLabel": "Coma GX Cluster",
        "badgeClass": "badge-coma-gx-cluster",
        "badgeColor": "#f472b6",
        "statedCount": 138,
        "sourceCount": 137,
        "orderedSourceSha256": "7aa7a270d7cb161c7b8f2e13e55a239ede0792d584d1885428b15542179653f4",
    },
    "hercules-gx-cluster": {
        "filterLabel": "Hercules GX Cluster",
        "detailLabel": "Hercules Galaxy Cluster",
        "badgeClass": "badge-hercules-gx-cluster",
        "badgeColor": "#a3e635",
        "statedCount": 74,
        "sourceCount": 74,
        "orderedSourceSha256": "ee1b1046527e6cd7cacc299696f6ed36c5d1acb826f2c9d6c2fa1c980d7e93fd",
    },
    "night-vision": {
        "filterLabel": "Night Vision",
        "detailLabel": "Night Vision",
        "badgeClass": "badge-night-vision",
        "badgeColor": "#4ade80",
        "statedCount": 327,
        "sourceCount": 327,
        "orderedSourceSha256": "18ae9e5cb7a978f70efcb24ac54662b6bcb8ab84e5afb61a33c2e41d02bf941c",
    },
}

EXPECTED_SPECIALIZED_OPTIONS = [
    "Abell planetary nebulae",
    "Barnard Dark Nebulae",
    "Coma GX Cluster",
    "Galaxy Trios (KTG)",
    "Hercules GX Cluster",
    "Hickson Compact Groups (HCG)",
    "Night Vision",
    "STF Double Stars",
    "Uppsala Galaxy Catalog (UGC)",
]

EXISTING_BADGE_COLORS = {
    "#38bdf8",
    "#60a5fa",
    "#a78bfa",
    "#f59e0b",
}


def load_json(path):
    with path.open(encoding="utf-8") as source:
        return json.load(source)


def fail(errors, message):
    errors.append(message)


def ordered_source_digest(names):
    return hashlib.sha256("\n".join(names).encode()).hexdigest()


def main():
    errors = []
    manifest = load_json(MANIFEST_PATH)
    objects = load_json(DATA_PATH)
    catalogs = manifest.get("catalogs", [])
    catalog_by_id = {catalog.get("id"): catalog for catalog in catalogs}
    object_name_counts = collections.Counter(obj["name"] for obj in objects)

    if manifest.get("version") != 1:
        fail(errors, "Manifest version must be 1.")
    if len(catalog_by_id) != len(catalogs):
        fail(errors, "Catalog IDs must be unique.")
    if set(catalog_by_id) != set(EXPECTED_CATALOGS):
        missing = sorted(set(EXPECTED_CATALOGS) - set(catalog_by_id))
        extra = sorted(set(catalog_by_id) - set(EXPECTED_CATALOGS))
        fail(errors, f"Catalog ID mismatch; missing={missing}, extra={extra}.")

    manifest_labels = [catalog.get("filterLabel") for catalog in catalogs]
    if manifest_labels != sorted(manifest_labels):
        fail(errors, "Manifest catalogs must be ordered alphabetically by filterLabel.")

    for catalog_id, expected in EXPECTED_CATALOGS.items():
        catalog = catalog_by_id.get(catalog_id)
        if not catalog:
            continue

        for field in (
            "filterLabel",
            "detailLabel",
            "badgeClass",
            "statedCount",
            "sourceCount",
        ):
            if catalog.get(field) != expected[field]:
                fail(
                    errors,
                    f"{catalog_id}: {field} must be {expected[field]!r}, "
                    f"found {catalog.get(field)!r}.",
                )

        object_names = catalog.get("objectNames", [])
        unmatched = catalog.get("unmatchedDesignations", [])
        if not isinstance(object_names, list):
            fail(errors, f"{catalog_id}: objectNames must be an array.")
            object_names = []
        if not isinstance(unmatched, list):
            fail(errors, f"{catalog_id}: unmatchedDesignations must be an array.")
            unmatched = []

        supplied_names = object_names + unmatched
        if any(not isinstance(name, str) or not name for name in supplied_names):
            fail(errors, f"{catalog_id}: supplied names must be non-empty strings.")
        if len(supplied_names) != len(set(supplied_names)):
            duplicates = sorted(
                name
                for name, count in collections.Counter(supplied_names).items()
                if count > 1
            )
            fail(errors, f"{catalog_id}: supplied names contain duplicates={duplicates}.")
        if len(supplied_names) != expected["sourceCount"]:
            fail(
                errors,
                f"{catalog_id}: expected {expected['sourceCount']} supplied tokens, "
                f"found {len(supplied_names)}.",
            )
        if catalog.get("sourceCount") != len(supplied_names):
            fail(
                errors,
                f"{catalog_id}: sourceCount does not equal objectNames plus "
                "unmatchedDesignations.",
            )
        digest = ordered_source_digest(supplied_names)
        if digest != expected["orderedSourceSha256"]:
            fail(
                errors,
                f"{catalog_id}: supplied names or their source ordering changed.",
            )

        for name in object_names:
            count = object_name_counts[name]
            if count != 1:
                fail(
                    errors,
                    f"{catalog_id}: mapped name {name!r} resolves to "
                    f"{count} canonical records.",
                )
        for name in unmatched:
            count = object_name_counts[name]
            if count:
                fail(
                    errors,
                    f"{catalog_id}: unmatched designation {name!r} now resolves "
                    f"to {count} canonical records.",
                )

    app_js = APP_PATH.read_text(encoding="utf-8")
    style_css = STYLE_PATH.read_text(encoding="utf-8")

    required_app_wiring = [
        "fetch(assetPath('specialized-catalogs.json'))",
        "!specializedCatalogsRes.ok",
        "Failed to load database. Please refresh.",
        "specializedCatalogs = specializedCatalogData.catalogs || []",
        "new Set(catalog.objectNames || [])",
        "...specializedCatalogs.map(catalog => catalog.filterLabel)",
        "].sort((a, b) => a.localeCompare(b))",
        "{ label: 'SPECIALIZED', items: specializedItems }",
        "selectedCatalogs.includes(catalog.filterLabel)",
        "specializedCatalogMembership.get(catalog.id).has(o.name)",
        "matchesSpecializedCatalog",
        "renderSpecializedCatalogBadges(obj.name)",
        "escHtml(catalog.detailLabel)",
    ]
    for snippet in required_app_wiring:
        if snippet not in app_js:
            fail(errors, f"Explorer wiring is missing {snippet!r}.")
    if not re.search(r"\|\|\s+matchesSpecializedCatalog;", app_js):
        fail(errors, "Specialized catalog matching must preserve catalog OR semantics.")

    specialized_items_match = re.search(
        r"const specializedItems = \[(.*?)\]\.sort\(\(a, b\) => "
        r"a\.localeCompare\(b\)\);",
        app_js,
        re.DOTALL,
    )
    if not specialized_items_match:
        fail(errors, "Unable to inspect SPECIALIZED catalog option construction.")
    else:
        static_options = re.findall(
            r"^\s*'([^']+)',?$",
            specialized_items_match.group(1),
            re.MULTILINE,
        )
        generated_options = sorted(static_options + manifest_labels)
        if generated_options != EXPECTED_SPECIALIZED_OPTIONS:
            fail(
                errors,
                "SPECIALIZED options are not the expected alphabetical sequence; "
                f"found={generated_options}.",
            )

    badge_colors = []
    for catalog_id, expected in EXPECTED_CATALOGS.items():
        badge_class = expected["badgeClass"]
        rule = re.search(
            rf"\.{re.escape(badge_class)}\s*\{{([^}}]+)\}}",
            style_css,
            re.DOTALL,
        )
        if not rule:
            fail(errors, f"{catalog_id}: missing .{badge_class} CSS rule.")
            continue
        if expected["badgeColor"] not in rule.group(1):
            fail(
                errors,
                f"{catalog_id}: .{badge_class} must use "
                f"{expected['badgeColor']}.",
            )
        badge_colors.append(expected["badgeColor"])
    if len(badge_colors) != len(set(badge_colors)):
        fail(errors, "Specialized catalog badge colors must be distinct.")
    if EXPECTED_CATALOGS["night-vision"]["badgeColor"] in EXISTING_BADGE_COLORS:
        fail(errors, "Night Vision badge color must differ from existing badges.")

    if errors:
        print("Specialized catalog validation failed:")
        for error in errors:
            print(f"  - {error}")
        raise SystemExit(1)

    print(
        f"Validated {len(catalogs)} specialized catalogs against "
        f"{len(objects)} canonical objects."
    )
    for catalog in catalogs:
        source_count = len(catalog["objectNames"]) + len(
            catalog["unmatchedDesignations"]
        )
        count_note = (
            " (COUNT MISMATCH)"
            if source_count != catalog["statedCount"]
            else ""
        )
        unmatched_note = (
            ", ".join(catalog["unmatchedDesignations"])
            if catalog["unmatchedDesignations"]
            else "none"
        )
        print(
            f"  {catalog['filterLabel']}: supplied {source_count}, "
            f"stated {catalog['statedCount']}{count_note}; "
            f"matched {len(catalog['objectNames'])}; "
            f"unmatched: {unmatched_note}"
        )


if __name__ == "__main__":
    main()
