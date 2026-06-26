"""Convert .docx observing reports to blog HTML posts for deep-sky-database.

Clones an existing post's exact template (head/nav/footer) and swaps in the
new title, date, and body so output matches this repo's conventions exactly.
Also extracts an `objects` list (catalog designations) for blog search and
appends entries to blog_index.json.

Each source .docx starts with two non-empty paragraphs: date, then title.
"""

import os
import re
import json
import html

from docx import Document

SRC_DIR = r"C:\Users\dagottl\Downloads\observing reports"
BLOG_DIR = r"C:\Users\dagottl\Projects\deep-sky-database\src\blog"
IMG_DIR = os.path.join(BLOG_DIR, "img")
REFERENCE = os.path.join(BLOG_DIR, "or-lake-sonoma-on-jan-19-2026.html")

A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"

EXT_FROM_CT = {
    "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png",
    "image/gif": ".gif", "image/webp": ".webp", "image/bmp": ".bmp",
    "image/x-emf": ".emf", "image/x-wmf": ".wmf",
}

# Catalog designation patterns for the `objects` field (matches existing style).
OBJ_PATTERNS = [
    r"\bNGC\s?\d{1,4}[A-C]?\b",
    r"\bIC\s?\d{1,4}\b",
    r"\bUGC(?:A)?\s?\d{1,5}\b",
    r"\bPGC\s?\d{1,7}\b",
    r"\bMCG\s?[+\-]?\d{1,2}-\d{1,2}-\d{1,4}\b",
    r"\bCGCG\s?\d{1,3}-\d{1,3}\b",
    r"\bESO\s?\d{1,3}-\d{1,3}[A-Z]?\b",
    r"\bAbell\s?\d{1,4}\b",
    r"\bArp\s?\d{1,3}\b",
    r"\bVV\s?\d{1,4}\b",
    r"\bHCG\s?\d{1,3}\b",
    r"\bHickson\s?\d{1,3}\b",
    r"\bSh2-\d{1,3}\b",
    r"\bM\s?\d{1,3}\b",
    r"\bMinkowski\s?\d-\d{1,2}\b",
    r"\bStephan\u2019?s?\s?Quintet\b",
]
OBJ_RE = re.compile("|".join(OBJ_PATTERNS), re.IGNORECASE)


def make_slug(title):
    s = title.lower()
    s = re.sub(r'["\':,!?()\u00b0\[\]\u2013\u2014]+', '', s)
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = s.strip('-')
    if len(s) > 60:
        s = s[:60].rstrip('-')
    return s


def run_to_html(run):
    text = run.text
    if not text:
        return ""
    out = html.escape(text)
    if run.italic:
        out = f"<i>{out}</i>"
    if run.bold:
        out = f"<b>{out}</b>"
    if run.underline:
        out = f"<u>{out}</u>"
    return out


def run_image_ids(run):
    ids = []
    for blip in run._element.iter(f"{A}blip"):
        rid = blip.get(f"{R}embed") or blip.get(f"{R}link")
        if rid:
            ids.append(rid)
    return ids


def extract_objects(plain_text):
    seen = []
    seen_norm = set()
    for m in OBJ_RE.finditer(plain_text):
        raw = m.group(0)
        # Normalize internal whitespace to a single space.
        norm = re.sub(r"\s+", " ", raw).strip()
        # Skip bare "M" matches that are actually magnitudes etc. handled by \b already.
        key = norm.upper()
        if key not in seen_norm:
            seen_norm.add(key)
            seen.append(norm)
    return ", ".join(seen)


def build_post_html(reference_html, title, date, content_inner):
    t_esc = html.escape(title)
    d_esc = html.escape(date)
    out = re.sub(r"<title>.*?</title>",
                 lambda m: f"<title>{t_esc} \u2014 Steve Gottlieb's Deep Sky</title>",
                 reference_html, count=1, flags=re.S)
    out = re.sub(r'(<h1 class="blog-title">).*?(</h1>)',
                 lambda m: m.group(1) + t_esc + m.group(2), out, count=1, flags=re.S)
    out = re.sub(r'(<span class="blog-date">).*?(</span>)',
                 lambda m: m.group(1) + d_esc + m.group(2), out, count=1, flags=re.S)
    out = re.sub(r'(<div class="blog-content">).*?(</div>\s*</div>\s*</article>)',
                 lambda m: m.group(1) + "\n" + content_inner + "\n            " + m.group(2),
                 out, count=1, flags=re.S)
    return out


def process_docx(path, reference_html):
    doc = Document(path)
    rels = doc.part.rels
    img_web_path = {}
    saved_count = [0]

    paragraphs = doc.paragraphs
    nonempty_idx = [i for i, p in enumerate(paragraphs) if p.text.strip()]
    date = paragraphs[nonempty_idx[0]].text.strip()
    title = paragraphs[nonempty_idx[1]].text.strip()
    skip = {nonempty_idx[0], nonempty_idx[1]}
    slug = make_slug(title)

    def save_image(rid):
        if rid in img_web_path:
            return img_web_path[rid]
        rel = rels.get(rid)
        if rel is None or "image" not in rel.reltype:
            return None
        part = rel.target_part
        ct = (getattr(part, "content_type", "") or "").lower()
        ext = EXT_FROM_CT.get(ct, os.path.splitext(part.partname)[1].lower() or ".jpg")
        idx = saved_count[0] + 1
        local_name = f"{slug}_{idx}{ext}"
        with open(os.path.join(IMG_DIR, local_name), "wb") as f:
            f.write(part.blob)
        saved_count[0] = idx
        web = f"img/{local_name}"
        img_web_path[rid] = web
        print(f"    Saved image: {local_name} ({len(part.blob)} bytes)")
        return web

    blocks = []
    plain_parts = []
    for i, p in enumerate(paragraphs):
        para_html = []
        for run in p.runs:
            for rid in run_image_ids(run):
                web = save_image(rid)
                if web:
                    blocks.append(
                        f'<figure class="blog-figure"><img src="{html.escape(web)}" '
                        f'alt="" loading="lazy"></figure>'
                    )
            para_html.append(run_to_html(run))
        if i in skip:
            continue
        text = "".join(para_html).strip()
        text = re.sub(r"</(b|i|u)>(\s*)<\1>", r"\2", text)
        if text:
            blocks.append(f"<p>{text}</p>")
            plain_parts.append(p.text)

    content_inner = "\n".join("                " + b for b in blocks)
    objects = extract_objects("\n".join(plain_parts))

    filename = slug + ".html"
    post_html = build_post_html(reference_html, title, date, content_inner)
    with open(os.path.join(BLOG_DIR, filename), "w", encoding="utf-8") as f:
        f.write(post_html)

    print(f"  Created: {filename} | date='{date}' | {saved_count[0]} images | "
          f"objects=[{objects}]")

    entry = {
        "title": title,
        "date": date,
        "slug": slug,
        "filename": filename,
        "images": saved_count[0],
        "content_length": len(content_inner),
    }
    if objects:
        entry["objects"] = objects
    return entry


def main():
    os.makedirs(IMG_DIR, exist_ok=True)
    with open(REFERENCE, "r", encoding="utf-8") as f:
        reference_html = f.read()

    index_path = os.path.join(BLOG_DIR, "blog_index.json")
    with open(index_path, "r", encoding="utf-8") as f:
        existing = json.load(f)
    existing_slugs = {e["slug"] for e in existing}

    new_entries = []
    for fname in sorted(os.listdir(SRC_DIR)):
        if not fname.lower().endswith(".docx") or fname.startswith("~$"):
            continue
        print(f"\nProcessing: {fname}")
        entry = process_docx(os.path.join(SRC_DIR, fname), reference_html)
        if entry["slug"] in existing_slugs:
            print(f"  WARNING: slug '{entry['slug']}' exists, replacing")
            existing = [e for e in existing if e["slug"] != entry["slug"]]
        new_entries.append(entry)

    # Append-only: keep the existing 115 entries exactly as-is to minimize the
    # diff and risk. The site sorts reports by date in JS, so order here is
    # irrelevant to display.
    all_entries = existing + new_entries
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(all_entries, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"\n=== Done! Added {len(new_entries)} posts. Total: {len(all_entries)} ===")


if __name__ == "__main__":
    main()
