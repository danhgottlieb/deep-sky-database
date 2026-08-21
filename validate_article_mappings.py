#!/usr/bin/env python3
"""Validate Database Explorer article filters against the shipped dataset."""

import collections
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MAPPINGS_PATH = ROOT / "src" / "article-object-mappings.json"
DATA_PATH = ROOT / "src" / "data.json"
EXPLORER_PATH = ROOT / "src" / "explorer" / "index.html"
APP_PATH = ROOT / "src" / "js" / "app.js"
ARTICLE_SEARCH_PATH = ROOT / "src" / "js" / "article-search.js"

EXPECTED_COUNTS = {
    "sky-telescope-2025-04": 49,
    "sky-telescope-2024-04": 14,
    "sky-telescope-2022-06": 15,
    "sky-telescope-2017-05": 14,
    "sky-telescope-2014-09": 6,
    "sky-telescope-2014-05": 1,
    "sky-telescope-2013-07": 3,
    "sky-telescope-2011-05": 4,
    "sky-telescope-2010-04": 8,
    "sky-telescope-2003-11": 26,
    "sky-telescope-2002-04": 27,
    "sky-telescope-2001-01": 50,
    "sky-telescope-2000-08": 7,
    "sky-telescope-2000-05": 8,
    "sky-telescope-1999-10": 15,
}
EXPECTED_ASSOCIATIONS = 247
EXPECTED_SOURCE_ROW_COUNTS = {
    "sky-telescope-2025-04": 6,
    "sky-telescope-2024-04": 14,
    "sky-telescope-2022-06": 7,
    "sky-telescope-2017-05": 7,
    "sky-telescope-2014-09": 3,
    "sky-telescope-2014-05": 1,
    "sky-telescope-2013-07": 1,
    "sky-telescope-2011-05": 4,
    "sky-telescope-2010-04": 8,
    "sky-telescope-2003-11": 27,
    "sky-telescope-2002-04": 11,
    "sky-telescope-2001-01": 6,
    "sky-telescope-2000-08": 7,
    "sky-telescope-2000-05": 7,
    "sky-telescope-1999-10": 11,
}

EXPECTED_UNMATCHED = {
    article_id: set()
    for article_id in EXPECTED_COUNTS
}
EXPECTED_UNMATCHED.update(
    {
        "sky-telescope-2003-11": {"IC 4613", "IC 2120", "PGC 38278"},
        "sky-telescope-1999-10": {"PGC 72393", "PGC 72451"},
    }
)

EXPLICIT_EXCLUSIONS = {
    "sky-telescope-2025-04": {
        "PGC 2817454",
        "NGC 4251",
        "IC 777",
        "NGC 3640",
        "NGC 3644",
    },
    "sky-telescope-2022-06": {"IC 694"},
    "sky-telescope-2017-05": {"Arp 142 NED1", "NGC 4038S"},
    "sky-telescope-2000-08": {"UGC 10310"},
}

TODD_OBJECTS = {
    "IC 591",
    "NGC 4073",
    "NGC 4045",
    "NGC 4077",
    "NGC 4075",
    "NGC 4063",
    "NGC 4045A",
    "CGCG 013-049",
    "NGC 4139",
    "UGC 7034",
    "CGCG 013-058",
    "CGCG 013-052",
    "UGC 7057",
    "PGC 38205",
}

SYSTEM_FAMILIES = {
    "sky-telescope-2022-06": {
        "designations": {
            "Arp 302",
            "Arp 240",
            "Arp 238",
            "Arp 299",
            "NGC 5256",
            "VV 705",
            "Mrk 273",
        },
        "excluded": {
            "IC 694",
        },
    },
    "sky-telescope-2017-05": {
        "designations": {
            "Arp 142",
            "Arp 188",
            "Arp 84",
            "Arp 242",
            "Arp 55",
            "Arp 244",
            "Arp 81",
        },
        "excluded": {
            "Arp 142 NED1",
        },
    },
    "sky-telescope-2014-09": {
        "designations": {
            "VV 254",
            "VV 323",
            "VV 102",
        },
        "excluded": set(),
    },
}


def load_json(path):
    with path.open(encoding="utf-8") as source:
        return json.load(source)


def fail(errors, message):
    errors.append(message)


def alias_matches_family(alias, designation):
    """Match a complete designation plus an optional component suffix."""
    if not alias.startswith(designation):
        return False
    suffix = alias[len(designation) :]
    return not suffix or suffix[0].isspace() or suffix[0] in ":/ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"


def find_family_records(objects, designations):
    matches = set()
    for obj in objects:
        aliases = [obj["name"]]
        aliases.extend(part.strip() for part in obj.get("other", "").split(" = "))
        if any(
            alias_matches_family(alias, designation)
            for alias in aliases
            for designation in designations
        ):
            matches.add(obj["name"])
    return matches


def main():
    errors = []
    mapping_data = load_json(MAPPINGS_PATH)
    objects = load_json(DATA_PATH)
    articles = mapping_data.get("articles", [])
    article_by_id = {article["id"]: article for article in articles}
    object_name_counts = collections.Counter(obj["name"] for obj in objects)

    if mapping_data.get("version") != 1:
        fail(errors, "Mapping version must be 1.")
    if len(articles) != 15:
        fail(errors, f"Expected 15 articles, found {len(articles)}.")
    if len(article_by_id) != len(articles):
        fail(errors, "Article IDs must be unique.")
    if set(article_by_id) != set(EXPECTED_COUNTS):
        missing = sorted(set(EXPECTED_COUNTS) - set(article_by_id))
        extra = sorted(set(article_by_id) - set(EXPECTED_COUNTS))
        fail(errors, f"Canonical article ID mismatch; missing={missing}, extra={extra}.")

    dates = [article["date"] for article in articles]
    if dates != sorted(dates, reverse=True):
        fail(errors, "Articles must remain in reverse chronological order.")

    association_count = sum(
        len(article.get("objectNames", []))
        for article in articles
    )
    if association_count != EXPECTED_ASSOCIATIONS:
        fail(
            errors,
            f"Expected {EXPECTED_ASSOCIATIONS} article-object associations, "
            f"found {association_count}.",
        )

    for article in articles:
        article_id = article["id"]
        object_names = article.get("objectNames", [])
        unmatched = article.get("unmatchedDesignations", [])
        source_evidence = article.get("sourceEvidence", {})
        intentional_exclusions = article.get("intentionalExclusions", [])
        if not isinstance(source_evidence, dict):
            fail(errors, f"{article_id}: sourceEvidence must be an object.")
            source_evidence = {}
        if not isinstance(intentional_exclusions, list):
            fail(errors, f"{article_id}: intentionalExclusions must be an array.")
            intentional_exclusions = []
        source_rows = source_evidence.get("rows", [])
        if article.get("publication") != "Sky & Telescope":
            fail(errors, f"{article_id}: unexpected publication.")
        if not re.fullmatch(r"\d{4}-\d{2}", article.get("date", "")):
            fail(errors, f"{article_id}: date must use YYYY-MM.")
        if article_id != f"sky-telescope-{article.get('date', '')}":
            fail(errors, f"{article_id}: canonical ID must end with its YYYY-MM date.")
        if len(object_names) != len(set(object_names)):
            fail(errors, f"{article_id}: objectNames contains duplicates.")
        if len(unmatched) != len(set(unmatched)):
            fail(errors, f"{article_id}: unmatchedDesignations contains duplicates.")
        if not isinstance(source_evidence.get("location"), str) or not source_evidence["location"].strip():
            fail(errors, f"{article_id}: sourceEvidence.location is required.")
        if len(source_rows) != EXPECTED_SOURCE_ROW_COUNTS.get(article_id):
            fail(
                errors,
                f"{article_id}: expected "
                f"{EXPECTED_SOURCE_ROW_COUNTS.get(article_id)} source rows, "
                f"found {len(source_rows)}.",
            )
        if len(source_rows) != len(set(source_rows)) or any(
            not isinstance(row, str) or not row.strip()
            for row in source_rows
        ):
            fail(errors, f"{article_id}: sourceEvidence.rows must be unique, non-empty strings.")
        exclusion_names = []
        for exclusion in intentional_exclusions:
            if not isinstance(exclusion, dict):
                fail(errors, f"{article_id}: intentional exclusions must be objects.")
                continue
            designation = exclusion.get("designation")
            reason = exclusion.get("reason")
            if not isinstance(designation, str) or not designation.strip():
                fail(errors, f"{article_id}: exclusion designation is required.")
            else:
                exclusion_names.append(designation)
            if not isinstance(reason, str) or not reason.strip():
                fail(errors, f"{article_id}: exclusion reason is required.")
        if len(exclusion_names) != len(set(exclusion_names)):
            fail(errors, f"{article_id}: intentional exclusions contain duplicates.")
        expected_exclusions = EXPLICIT_EXCLUSIONS.get(article_id, set())
        if set(exclusion_names) != expected_exclusions:
            fail(
                errors,
                f"{article_id}: intentional exclusions changed; "
                f"expected={sorted(expected_exclusions)}, "
                f"found={sorted(exclusion_names)}.",
            )
        if set(unmatched) != EXPECTED_UNMATCHED.get(article_id, set()):
            fail(
                errors,
                f"{article_id}: unmatched source rows changed; "
                f"expected={sorted(EXPECTED_UNMATCHED.get(article_id, set()))}, "
                f"found={sorted(unmatched)}.",
            )
        overlap = sorted(set(object_names) & set(unmatched))
        if overlap:
            fail(errors, f"{article_id}: mapped and unmatched overlap={overlap}.")
        if len(object_names) != EXPECTED_COUNTS.get(article_id):
            fail(
                errors,
                f"{article_id}: expected {EXPECTED_COUNTS.get(article_id)} objects, "
                f"found {len(object_names)}.",
            )

        pdf_path = ROOT / "src" / article["pdf"]
        if not pdf_path.is_file():
            fail(errors, f"{article_id}: missing PDF {article['pdf']}.")

        for name in object_names:
            count = object_name_counts[name]
            if count != 1:
                fail(errors, f"{article_id}: {name!r} resolves to {count} dataset records.")
        for designation in unmatched:
            count = object_name_counts[designation]
            if count:
                fail(
                    errors,
                    f"{article_id}: unmatched designation {designation!r} now resolves "
                    f"to {count} canonical dataset records.",
                )

    todd = set(
        article_by_id[
            "sky-telescope-2024-04"
        ]["objectNames"]
    )
    if todd != TODD_OBJECTS:
        fail(errors, "David Todd mapping must contain exactly the 14 PDF table galaxies.")

    arp_2_objects = set(
        article_by_id["sky-telescope-2000-08"]["objectNames"]
    )
    if "Arp GC 2" not in arp_2_objects:
        fail(errors, "The August 2000 Arp 2 row must map to canonical Arp GC 2.")

    for article_id, family in SYSTEM_FAMILIES.items():
        mapped_names = set(article_by_id[article_id]["objectNames"])
        expected_names = (
            find_family_records(objects, family["designations"]) - family["excluded"]
        )
        missing = sorted(expected_names - mapped_names)
        extra = sorted(mapped_names - expected_names)
        if missing or extra:
            fail(
                errors,
                f"{article_id}: system expansion mismatch; missing={missing}, extra={extra}.",
            )

    for article_id, excluded_names in EXPLICIT_EXCLUSIONS.items():
        mapped_names = set(article_by_id[article_id]["objectNames"])
        included = sorted(mapped_names & excluded_names)
        if included:
            fail(errors, f"{article_id}: explicitly excluded records mapped={included}.")

    shakhbazian_names = set(
        article_by_id["sky-telescope-2025-04"]["objectNames"]
    )
    expected_shakhbazian_names = set()
    for group in ("16", "166", "202", "352", "5", "1"):
        pattern = re.compile(rf"\bSHK {group}(?:$|[-\s])")
        family_names = {
            obj["name"]
            for obj in objects
            if pattern.search(f"{obj['name']} {obj.get('other', '')}")
        }
        expected_shakhbazian_names.update(family_names)
    expected_shakhbazian_names.add("PGC 59182")
    missing = sorted(expected_shakhbazian_names - shakhbazian_names)
    extra = sorted(shakhbazian_names - expected_shakhbazian_names)
    if missing or extra:
        fail(
            errors,
            f"Shakhbazian boundary/component expansion mismatch; "
            f"missing={missing}, extra={extra}.",
        )

    explorer_html = EXPLORER_PATH.read_text(encoding="utf-8")
    app_js = APP_PATH.read_text(encoding="utf-8")
    article_search_js = ARTICLE_SEARCH_PATH.read_text(encoding="utf-8")
    catalog_position = explorer_html.find('id="filter-catalog-container"')
    article_position = explorer_html.find('id="filter-article-container"')
    name_position = explorer_html.find('id="filter-name-container"')
    if not (0 <= catalog_position < article_position < name_position):
        fail(errors, "ARTICLE filter must appear immediately after CATALOG.")
    if 'placeholder="Search articles…"' not in explorer_html:
        fail(errors, "ARTICLE filter placeholder is missing.")
    if '<label for="filter-article-search">Article</label>' not in explorer_html:
        fail(errors, "ARTICLE filter needs an input-associated label.")
    if 'role="combobox"' not in explorer_html or 'aria-controls="article-dropdown"' not in explorer_html:
        fail(errors, "ARTICLE filter combobox semantics are missing.")
    if 'aria-multiselectable="true"' not in explorer_html:
        fail(errors, "ARTICLE dropdown must expose its multi-select semantics.")
    if "fetch(assetPath('article-object-mappings.json'))" not in app_js:
        fail(errors, "Explorer must fetch the standalone article mapping manifest.")
    if "articleMappings = articleMappingData.articles || []" not in app_js:
        fail(errors, "Explorer must consume article records from the mapping manifest.")
    if "getAll('article')" not in app_js:
        fail(errors, "Deep links must accept repeated article query parameters.")
    if "url.searchParams.append('article', id)" not in app_js:
        fail(errors, "Deep links must preserve repeated article query parameters.")
    if "selectedArticleObjectNames.has(o.name)" not in app_js:
        fail(errors, "Article matching must use exact canonical object names.")
    if "appliedArticles = [...selectedArticles]" not in app_js:
        fail(errors, "Draft article selections must only become active on Apply.")
    if "syncArticleSelectionsToUrl('apply')" not in app_js:
        fail(errors, "Apply must synchronize article selections to the URL.")
    if "syncArticleSelectionsToUrl('clear')" not in app_js:
        fail(errors, "Clear All must remove article selections from the URL.")
    if "restoreArticleSelectionsFromHistory();" not in app_js:
        fail(errors, "Back/forward navigation must restore ARTICLE filter state.")
    if "getArticleHistoryAction() === action" not in app_js:
        fail(errors, "Repeated Apply actions must preserve coherent same-URL history.")
    if "Sky &amp; Telescope</div>" not in app_js:
        fail(errors, "ARTICLE dropdown must begin with the Sky & Telescope heading.")
    if 'aria-selected="${isSelected}">${escHtml(article.displayDate)}</div>' not in app_js:
        fail(errors, "ARTICLE dropdown options must display the publication date only.")
    if "aria-activedescendant" not in app_js or "e.key === 'ArrowDown'" not in app_js:
        fail(errors, "ARTICLE dropdown keyboard navigation is missing.")

    linked_article_ids = re.findall(
        r"\['\d+',\s*'(sky-telescope-\d{4}-\d{2})'\]",
        article_search_js,
    )
    mapping_article_ids = [article["id"] for article in articles]
    if linked_article_ids != mapping_article_ids:
        fail(
            errors,
            "Publication Search objects IDs must match the mapping manifest order; "
            f"expected={mapping_article_ids}, found={linked_article_ids}.",
        )
    if "encodeURIComponent(articleId)" not in article_search_js:
        fail(errors, "Publication Search objects links must URL-encode canonical IDs.")

    if errors:
        print("Article mapping validation failed:")
        for error in errors:
            print(f"  - {error}")
        raise SystemExit(1)

    print(
        f"Validated {len(articles)} article mappings with "
        f"{association_count} associations and structured source evidence "
        f"against {len(objects)} objects."
    )
    for article in articles:
        unmatched = article.get("unmatchedDesignations", [])
        suffix = f"; unmatched: {', '.join(unmatched)}" if unmatched else ""
        print(
            f"  {article['displayDate']}: {len(article['objectNames'])} objects"
            f"{suffix}"
        )


if __name__ == "__main__":
    main()
