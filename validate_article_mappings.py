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
SKY_TELESCOPE_PATH = ROOT / "src" / "articles" / "index.html"
ASTRONOMY_PATH = ROOT / "src" / "astronomy-articles" / "index.html"

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
    "astronomy-2007-04": 15,
    "astronomy-2007-03": 10,
    "astronomy-2006-02": 6,
    "astronomy-1999-05": 21,
}
EXPECTED_ARTICLE_IDS = [
    "sky-telescope-2025-04",
    "sky-telescope-2024-04",
    "sky-telescope-2022-06",
    "sky-telescope-2017-05",
    "sky-telescope-2014-09",
    "sky-telescope-2014-05",
    "sky-telescope-2013-07",
    "sky-telescope-2011-05",
    "sky-telescope-2010-04",
    "sky-telescope-2003-11",
    "sky-telescope-2002-04",
    "sky-telescope-2001-01",
    "sky-telescope-2000-08",
    "sky-telescope-2000-05",
    "sky-telescope-1999-10",
    "astronomy-2007-04",
    "astronomy-2007-03",
    "astronomy-2006-02",
    "astronomy-1999-05",
]
EXPECTED_PUBLICATION_IDS = {
    "Sky & Telescope": EXPECTED_ARTICLE_IDS[:15],
    "Astronomy": EXPECTED_ARTICLE_IDS[15:],
}
EXPECTED_FILTER_LABELS = {
    "sky-telescope-2025-04": "SHK galaxy groups",
    "sky-telescope-2024-04": "David Todd’s search",
    "sky-telescope-2022-06": "Merging spirals",
    "sky-telescope-2017-05": "Galaxies in collision",
    "sky-telescope-2014-09": "Interacting galaxies",
    "sky-telescope-2014-05": "Within M83",
    "sky-telescope-2013-07": "Within NGC 6946",
    "sky-telescope-2011-05": "Superthin galaxies",
    "sky-telescope-2010-04": "Variable blazars",
    "sky-telescope-2003-11": "NGC/IC Project",
    "sky-telescope-2002-04": "Hya-Cen galaxy cluster",
    "sky-telescope-2001-01": "Psc-Per galaxy cluster",
    "sky-telescope-2000-08": "Faint summer GCs",
    "sky-telescope-2000-05": "CrB GX cluster",
    "sky-telescope-1999-10": "Abell 4038 cluster",
    "astronomy-2007-04": "Non-Messier galaxies",
    "astronomy-2007-03": "Winter planetary nebulae",
    "astronomy-2006-02": "Wolf-Rayet Bubbles",
    "astronomy-1999-05": "Spring GX sampler",
}
EXPECTED_ASSOCIATIONS = 299
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
    "astronomy-2007-04": 16,
    "astronomy-2007-03": 10,
    "astronomy-2006-02": 6,
    "astronomy-1999-05": 21,
}

ASTRONOMY_SOURCE_ROWS = {
    "astronomy-2007-04": [
        "NGC 2903", "NGC 3115", "NGC 3521", "NGC 4244", "NGC 4244",
        "NGC 4485", "NGC 4490", "NGC 4559", "NGC 4605", "NGC 4631",
        "NGC 4656", "NGC 4657", "NGC 5253", "NGC 5981", "NGC 5982",
        "NGC 5985",
    ],
    "astronomy-2007-03": [
        "NGC 650", "NGC 1501", "NGC 1514", "NGC 1535", "IC 418",
        "NGC 2346", "NGC 2371", "NGC 2392", "NGC 2438", "NGC 2440",
    ],
    "astronomy-2006-02": [
        "Sh 2-308", "NGC 2359", "NGC 3199", "NGC 6357", "NGC 6888",
        "Sh 2-157",
    ],
    "astronomy-1999-05": [
        "IC 10", "M31", "Maffei 1", "NGC 2685", "M81", "M82", "NGC 4038",
        "NGC 4039", "M84", "M86", "NGC 4485", "NGC 4490", "M87", "M104",
        "NGC 4889", "NGC 5128", "M83", "NGC 6045", "NGC 6166",
        "NGC 6240", "NGC 7320",
    ],
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


def resolve_designation(objects, designation):
    """Resolve one exact source designation, preferring a canonical primary name."""
    primary_matches = [obj for obj in objects if obj["name"] == designation]
    if len(primary_matches) == 1:
        return primary_matches[0]["name"], "primary name", []
    if len(primary_matches) > 1:
        return None, None, [obj["name"] for obj in primary_matches]

    matches = {}
    for obj in objects:
        matched_fields = []
        aliases = [
            part.strip()
            for part in obj.get("other", "").split(" = ")
            if part.strip()
        ]
        if designation in aliases:
            matched_fields.append("alias")
        if obj.get("nickname") == designation:
            matched_fields.append("nickname")
        if obj.get("messierNumber") == designation:
            matched_fields.append("messierNumber")
        if matched_fields:
            matches[obj["name"]] = matched_fields

    if len(matches) != 1:
        return None, None, sorted(matches)

    primary_name, matched_fields = next(iter(matches.items()))
    return primary_name, " and ".join(matched_fields), []


def main():
    errors = []
    mapping_data = load_json(MAPPINGS_PATH)
    objects = load_json(DATA_PATH)
    articles = mapping_data.get("articles", [])
    article_by_id = {article["id"]: article for article in articles}
    object_name_counts = collections.Counter(obj["name"] for obj in objects)

    if mapping_data.get("version") != 1:
        fail(errors, "Mapping version must be 1.")
    if len(articles) != 19:
        fail(errors, f"Expected 19 articles, found {len(articles)}.")
    if len(article_by_id) != len(articles):
        fail(errors, "Article IDs must be unique.")
    if set(article_by_id) != set(EXPECTED_COUNTS):
        missing = sorted(set(EXPECTED_COUNTS) - set(article_by_id))
        extra = sorted(set(article_by_id) - set(EXPECTED_COUNTS))
        fail(errors, f"Canonical article ID mismatch; missing={missing}, extra={extra}.")

    mapping_article_ids = [article["id"] for article in articles]
    if mapping_article_ids != EXPECTED_ARTICLE_IDS:
        fail(
            errors,
            "Articles must remain grouped as Sky & Telescope then Astronomy, "
            "with each publication in reverse chronological order; "
            f"expected={EXPECTED_ARTICLE_IDS}, found={mapping_article_ids}.",
        )

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
        expected_publication = next(
            (
                publication
                for publication, article_ids in EXPECTED_PUBLICATION_IDS.items()
                if article_id in article_ids
            ),
            None,
        )
        if article.get("publication") != expected_publication:
            fail(
                errors,
                f"{article_id}: expected publication {expected_publication!r}, "
                f"found {article.get('publication')!r}.",
            )
        if article.get("filterLabel") != EXPECTED_FILTER_LABELS.get(article_id):
            fail(
                errors,
                f"{article_id}: expected filterLabel "
                f"{EXPECTED_FILTER_LABELS.get(article_id)!r}, "
                f"found {article.get('filterLabel')!r}.",
            )
        if not re.fullmatch(r"\d{4}-\d{2}", article.get("date", "")):
            fail(errors, f"{article_id}: date must use YYYY-MM.")
        expected_prefix = (
            "sky-telescope"
            if expected_publication == "Sky & Telescope"
            else "astronomy"
        )
        if article_id != f"{expected_prefix}-{article.get('date', '')}":
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
        if any(
            not isinstance(row, str) or not row.strip()
            for row in source_rows
        ):
            fail(errors, f"{article_id}: sourceEvidence.rows must be non-empty strings.")
        if article_id not in ASTRONOMY_SOURCE_ROWS and len(source_rows) != len(set(source_rows)):
            fail(errors, f"{article_id}: sourceEvidence.rows must be unique.")
        if article_id in ASTRONOMY_SOURCE_ROWS:
            expected_rows = ASTRONOMY_SOURCE_ROWS[article_id]
            if source_rows != expected_rows:
                fail(
                    errors,
                    f"{article_id}: supplied source designation sequence changed; "
                    f"expected={expected_rows}, found={source_rows}.",
                )
            if source_evidence.get("statedObjectCount") != len(expected_rows):
                fail(
                    errors,
                    f"{article_id}: statedObjectCount must be {len(expected_rows)}.",
                )

            resolutions = article.get("designationResolutions", [])
            if not isinstance(resolutions, list) or len(resolutions) != len(source_rows):
                fail(
                    errors,
                    f"{article_id}: designationResolutions must contain one row "
                    "for every supplied token occurrence.",
                )
                resolutions = []

            resolved_primary_names = []
            for index, designation in enumerate(source_rows):
                primary_name, matched_by, ambiguities = resolve_designation(
                    objects, designation
                )
                if ambiguities:
                    fail(
                        errors,
                        f"{article_id}: {designation!r} is ambiguous across "
                        f"canonical records {ambiguities}.",
                    )
                    continue
                if primary_name is None:
                    fail(
                        errors,
                        f"{article_id}: {designation!r} does not resolve exactly.",
                    )
                    continue

                resolved_primary_names.append(primary_name)
                if index >= len(resolutions) or not isinstance(resolutions[index], dict):
                    continue
                resolution = resolutions[index]
                expected_resolution = {
                    "designation": designation,
                    "primaryName": primary_name,
                    "matchedBy": matched_by,
                }
                if resolution != expected_resolution:
                    fail(
                        errors,
                        f"{article_id}: resolution row {index + 1} must be "
                        f"{expected_resolution}, found {resolution}.",
                    )

            if set(resolved_primary_names) != set(object_names):
                fail(
                    errors,
                    f"{article_id}: resolved canonical names and objectNames differ; "
                    f"resolved={sorted(set(resolved_primary_names))}, "
                    f"mapped={sorted(set(object_names))}.",
                )
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
    sky_telescope_html = SKY_TELESCOPE_PATH.read_text(encoding="utf-8")
    astronomy_html = ASTRONOMY_PATH.read_text(encoding="utf-8")
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
    if 'aria-label="Publication articles"' not in explorer_html:
        fail(errors, "ARTICLE dropdown must have publication-generic accessible terminology.")
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
    if "const publicationOrder = ['Sky & Telescope', 'Astronomy'];" not in app_js:
        fail(errors, "ARTICLE dropdown headings must be Sky & Telescope then Astronomy.")
    if "publication.toUpperCase()" not in app_js:
        fail(errors, "ARTICLE dropdown publication headings must be uppercase.")
    if "${escHtml(article.filterLabel)}</div>" not in app_js:
        fail(errors, "ARTICLE dropdown options must display filterLabel values.")
    expected_search_text = (
        "`${article.filterLabel} ${article.displayDate} ${article.title}`"
    )
    if expected_search_text not in app_js:
        fail(errors, "ARTICLE search must include filter label, date, and full title.")
    if "articleSelectionLabel(article)" not in app_js:
        fail(errors, "Selected ARTICLE tags must use publication-aware labels.")
    if "article.publication === 'Sky & Telescope'" not in app_js:
        fail(errors, "Article labels must derive their prefix from publication metadata.")
    if "article ? `S&T ${article.displayDate}`" in app_js:
        fail(errors, "Print descriptions must not hard-code every article as S&T.")
    if "aria-activedescendant" not in app_js or "e.key === 'ArrowDown'" not in app_js:
        fail(errors, "ARTICLE dropdown keyboard navigation is missing.")

    linked_article_ids = re.findall(
        r"\['\d+',\s*'((?:sky-telescope|astronomy)-\d{4}-\d{2})'\]",
        article_search_js,
    )
    if linked_article_ids != mapping_article_ids:
        fail(
            errors,
            "Publication Objects list IDs must match the mapping manifest order; "
            f"expected={mapping_article_ids}, found={linked_article_ids}.",
        )
    if (
        "publicationConfigs" not in article_search_js
        or "#articles-list" not in article_search_js
        or "#astronomy-articles-list" not in article_search_js
    ):
        fail(errors, "Objects list wiring must use generic per-publication configuration.")
    if "link.textContent = 'Objects list'" not in article_search_js:
        fail(errors, "Publication buttons must use Objects list terminology.")
    if "`Objects list for ${" not in article_search_js:
        fail(errors, "Publication button aria labels must use Objects list terminology.")
    legacy_button_label = "Search " + "objects"
    if legacy_button_label in article_search_js:
        fail(errors, "Legacy publication-button terminology remains in the wiring.")
    if "encodeURIComponent(articleId)" not in article_search_js:
        fail(errors, "Publication Objects list links must URL-encode canonical IDs.")
    if (
        "articleIdsWith(articleId)" not in article_search_js
        or "persistArticleIds(ids)" not in article_search_js
    ):
        fail(errors, "Publication Objects list links must preserve cumulative selections.")
    if 'id="astronomy-articles-list"' not in astronomy_html:
        fail(errors, "Astronomy publication list must expose its Objects list target.")
    if "article-search.js?v=3" not in sky_telescope_html or "article-search.js?v=3" not in astronomy_html:
        fail(errors, "Both publication pages must load the current Objects list wiring.")
    if astronomy_html.count("article-pdf-link") != 4:
        fail(errors, "Astronomy page must retain exactly four PDF-backed entries.")
    if '<span class="article-num">#3</span>' not in astronomy_html:
        fail(errors, "Astronomy Sep 2006 entry must remain present without a mapping.")

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
        source_rows = article["sourceEvidence"]["rows"]
        if article["id"] in ASTRONOMY_SOURCE_ROWS:
            matched = len(article.get("designationResolutions", []))
            print(
                f"  {article['publication']} {article['displayDate']} "
                f"({article['filterLabel']}): supplied={len(source_rows)}, "
                f"unique supplied={len(set(source_rows))}, matched={matched}, "
                f"unique mapped={len(article['objectNames'])}{suffix}"
            )
        else:
            print(
                f"  {article['publication']} {article['displayDate']} "
                f"({article['filterLabel']}): source rows={len(source_rows)}, "
                f"unique mapped={len(article['objectNames'])}{suffix}"
            )


if __name__ == "__main__":
    main()
