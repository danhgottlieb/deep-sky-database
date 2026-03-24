"""Convert Outlook MSG email files to blog HTML posts."""

import extract_msg
import os
import re
import json
import html
from html.parser import HTMLParser

SRC_DIR = r"C:\Users\dagottl\OneDrive - Microsoft\Documents\articles"
BLOG_DIR = r"C:\Users\dagottl\deep-sky-website\src\blog"
IMG_DIR = os.path.join(BLOG_DIR, "img")

# Manual metadata: (corrected_title, display_date, slug)
# User wants "OR Dec 6, 2025" changed to "OR October 17, 2025"
OVERRIDES = {
    "OR Dec 6, 2025: Not your usual observing list finished!": {
        "title": "OR October 17, 2025: Not your usual observing list finished!",
        "date": "October 17, 2025",
    },
}

DATE_FROM_SUBJECT = {
    "OR July 2, 2025": "July 2, 2025",
    "OR: Lake Sonoma Feb. 25, 2025": "February 25, 2025",
    "OR: Lake Sonoma on Dec. 30, 2024": "December 30, 2024",
    "OR: Lake Sonoma on Jan. 19, 2026": "January 19, 2026",
    "OR: Two nights (Nov. 20/21, 2025) on the Lowrey 48\" (Part 1)": "November 20, 2025",
    "OR: Two nights (Nov. 20/21) on the Lowrey 48\" (Part 2)": "November 20, 2025",
    "OR: Two nights (Nov. 20/21) on the Lowrey 48\" (Final Part 3)": "November 20, 2025",
}


class EmailHTMLToClean(HTMLParser):
    """Parse email HTML and produce clean blog HTML, replacing cid: images."""

    BLOCK_TAGS = {'div', 'p', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                  'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'pre', 'hr'}

    def __init__(self, cid_map, slug):
        super().__init__()
        self.cid_map = cid_map  # cid -> local image path
        self.slug = slug
        self.output = []
        self.skip_depth = 0  # depth of tags we're skipping (style/script)
        self.in_body = False

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        tag = tag.lower()

        if tag in ('style', 'script', 'head', 'title', 'meta', 'link'):
            self.skip_depth += 1
            return

        if tag == 'body':
            self.in_body = True
            return

        if self.skip_depth > 0:
            return

        if tag == 'img':
            src = attrs_dict.get('src', '')
            # Replace cid: references with local paths
            if src.startswith('cid:'):
                cid = src[4:].strip()
                local_path = self.cid_map.get(cid, '')
                if local_path:
                    alt = attrs_dict.get('alt', '')
                    self.output.append(
                        f'\n<figure class="blog-figure">'
                        f'<img src="{html.escape(local_path)}" alt="{html.escape(alt)}" loading="lazy">'
                        f'<figcaption></figcaption></figure>\n'
                    )
            return

        if tag == 'br':
            self.output.append('<br>')
            return

        if tag == 'hr':
            self.output.append('<hr>')
            return

        if tag == 'b' or tag == 'strong':
            self.output.append('<strong>')
        elif tag == 'i' or tag == 'em':
            self.output.append('<em>')
        elif tag == 'u':
            self.output.append('<u>')
        elif tag == 'a':
            href = attrs_dict.get('href', '')
            self.output.append(f'<a href="{html.escape(href)}">')
        elif tag in ('p', 'div'):
            self.output.append('<p>')
        elif tag in ('ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'pre'):
            self.output.append(f'<{tag}>')
        elif tag == 'span':
            pass  # strip spans, keep content
        elif tag == 'blockquote':
            self.output.append('<blockquote>')

    def handle_endtag(self, tag):
        tag = tag.lower()

        if tag in ('style', 'script', 'head', 'title', 'meta', 'link'):
            self.skip_depth = max(0, self.skip_depth - 1)
            return

        if tag == 'body':
            return

        if self.skip_depth > 0:
            return

        if tag == 'b' or tag == 'strong':
            self.output.append('</strong>')
        elif tag == 'i' or tag == 'em':
            self.output.append('</em>')
        elif tag == 'u':
            self.output.append('</u>')
        elif tag == 'a':
            self.output.append('</a>')
        elif tag in ('p', 'div'):
            self.output.append('</p>')
        elif tag in ('ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'pre'):
            self.output.append(f'</{tag}>')
        elif tag == 'blockquote':
            self.output.append('</blockquote>')

    def handle_data(self, data):
        if self.skip_depth > 0:
            return
        self.output.append(data)

    def get_html(self):
        raw = ''.join(self.output)
        # Clean up excessive whitespace/empty tags
        raw = re.sub(r'<p>\s*</p>', '', raw)
        raw = re.sub(r'(<br>\s*){3,}', '<br><br>', raw)
        raw = re.sub(r'(<p>\s*<br>\s*</p>)', '', raw)
        # Normalize non-breaking spaces
        raw = raw.replace('\xa0', ' ')
        return raw.strip()


def make_slug(title):
    """Create URL-friendly slug from title."""
    s = title.lower()
    s = re.sub(r'["\':,!?()°\[\]]+', '', s)
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = s.strip('-')
    # Truncate long slugs
    if len(s) > 60:
        s = s[:60].rstrip('-')
    return s


BLOG_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title_escaped} — Steve Gottlieb's Deep Sky</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="../css/blog.css">
</head>
<body>
    <nav class="main-nav">
        <div class="container nav-container">
            <a href="../index.html#home" class="nav-logo">
                <span class="nav-logo-icon">🔭</span>
                <span class="nav-logo-text">Steve Gottlieb's Deep Sky</span>
            </a>
            <div class="nav-links">
                <a href="../index.html#about">About</a>
                <a href="../index.html#explorer">Database</a>
                <a href="../index.html#articles">Articles</a>
                <a href="../index.html#blog">Observing Reports</a>
            </div>
        </div>
    </nav>

    <article class="blog-post">
        <div class="container">
            <a href="../index.html#blog" class="blog-back">← Back to Observing Reports</a>
            <header class="blog-header">
                <h1 class="blog-title">{title_escaped}</h1>
                <div class="blog-meta">
                    <span class="blog-author">Steve Gottlieb</span>
                    <span class="blog-date">{date}</span>
                </div>
            </header>
            <div class="blog-content">
                {content}
            </div>
        </div>
    </article>
</body>
</html>"""


def process_msg(filepath):
    """Extract content and images from an Outlook MSG file."""
    msg = extract_msg.Message(filepath)
    subject = msg.subject or os.path.basename(filepath)
    
    # Get overrides
    override = OVERRIDES.get(subject, {})
    title = override.get('title', subject)
    
    # Extract date from subject or override
    date = override.get('date', '')
    if not date:
        date = DATE_FROM_SUBJECT.get(subject, '')
    if not date:
        # Try to extract from subject
        m = re.search(r'(\w+\.?\s+\d{1,2},?\s+\d{4})', subject)
        if m:
            date = m.group(1)

    slug = make_slug(title)
    filename = slug + '.html'
    
    # Build CID → local path map and save images
    cid_map = {}
    img_count = 0
    for att in msg.attachments:
        att_name = att.longFilename or att.shortFilename or f'image_{img_count}'
        cid = getattr(att, 'cid', None) or getattr(att, 'contentId', None) or ''
        data = att.data
        if not data:
            continue
        
        # Determine extension
        ext = os.path.splitext(att_name)[1].lower()
        if ext not in ('.jpg', '.jpeg', '.png', '.gif', '.webp'):
            ext = '.jpg'
        
        local_name = f"{slug}_{img_count}{ext}"
        local_path = os.path.join(IMG_DIR, local_name)
        
        with open(local_path, 'wb') as f:
            f.write(data)
        
        if cid:
            cid_map[cid] = f"img/{local_name}"
        
        img_count += 1
        print(f"    Saved image: {local_name} ({len(data)} bytes)")
    
    # Parse HTML body
    raw_html = ''
    if msg.htmlBody:
        raw_html = msg.htmlBody.decode('utf-8', errors='replace')
    
    if raw_html:
        parser = EmailHTMLToClean(cid_map, slug)
        parser.feed(raw_html)
        content = parser.get_html()
    else:
        # Fallback to plain text
        body = msg.body or ''
        content = '<p>' + html.escape(body).replace('\n\n', '</p><p>').replace('\n', '<br>') + '</p>'
    
    msg.close()
    
    # Write blog HTML file
    html_out = BLOG_TEMPLATE.format(
        title_escaped=html.escape(title),
        date=html.escape(date),
        content=content,
    )
    
    out_path = os.path.join(BLOG_DIR, filename)
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(html_out)
    
    print(f"  Created: {filename} ({len(content)} chars, {img_count} images)")
    
    return {
        "title": title,
        "date": date,
        "slug": slug,
        "filename": filename,
        "images": img_count,
        "content_length": len(content),
    }


def main():
    os.makedirs(IMG_DIR, exist_ok=True)
    
    # Load existing blog index
    index_path = os.path.join(BLOG_DIR, 'blog_index.json')
    existing = []
    if os.path.exists(index_path):
        with open(index_path, 'r', encoding='utf-8') as f:
            existing = json.load(f)
    
    existing_slugs = {e['slug'] for e in existing}
    
    new_entries = []
    for fname in sorted(os.listdir(SRC_DIR)):
        if not fname.endswith('.msg'):
            continue
        print(f"\nProcessing: {fname}")
        entry = process_msg(os.path.join(SRC_DIR, fname))
        
        if entry['slug'] in existing_slugs:
            print(f"  WARNING: slug '{entry['slug']}' already exists, replacing")
            existing = [e for e in existing if e['slug'] != entry['slug']]
        
        new_entries.append(entry)
    
    # Merge and save
    all_entries = existing + new_entries
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(all_entries, f, indent=2, ensure_ascii=False)
    
    print(f"\n=== Done! Added {len(new_entries)} new posts. Total: {len(all_entries)} ===")


if __name__ == '__main__':
    main()
