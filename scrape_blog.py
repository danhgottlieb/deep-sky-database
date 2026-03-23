"""
Extract all Steve Gottlieb articles from the Adventures in Deep Space observing reports page,
fetch their content, and generate blog post HTML pages for the website.
"""
import re
import os
import json
import urllib.parse
import urllib.request
import html
from html.parser import HTMLParser
import ssl
import time

BASE_URL = "https://adventuresindeepspace.com/"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "src", "blog")
IMG_DIR = os.path.join(OUTPUT_DIR, "img")

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(IMG_DIR, exist_ok=True)

# SSL context that doesn't verify (some old sites have cert issues)
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch_url(url, retries=2):
    """Fetch URL content with retries."""
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
                return resp.read()
        except Exception as e:
            if attempt == retries:
                print(f"  FAILED to fetch {url}: {e}")
                return None
            time.sleep(1)


class ArticleExtractor(HTMLParser):
    """Extract text content and images from HTML."""
    def __init__(self):
        super().__init__()
        self.content_parts = []
        self.images = []
        self.in_body = False
        self.in_script = False
        self.in_style = False
        self.current_tag = None
        self.tag_stack = []
    
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        self.tag_stack.append(tag)
        
        if tag == 'body':
            self.in_body = True
        if tag == 'script':
            self.in_script = True
        if tag == 'style':
            self.in_style = True
        
        if not self.in_body or self.in_script or self.in_style:
            return
            
        if tag == 'img':
            src = attrs_dict.get('src', '')
            if src and not src.startswith('data:'):
                self.images.append(src)
                self.content_parts.append(('img', src, attrs_dict.get('alt', '')))
        elif tag == 'br':
            self.content_parts.append(('text', '\n'))
        elif tag == 'p':
            self.content_parts.append(('tag_open', 'p'))
        elif tag in ('h1', 'h2', 'h3', 'h4'):
            self.content_parts.append(('tag_open', tag))
        elif tag == 'b' or tag == 'strong':
            self.content_parts.append(('tag_open', 'strong'))
        elif tag == 'i' or tag == 'em':
            self.content_parts.append(('tag_open', 'em'))
        elif tag == 'hr':
            self.content_parts.append(('tag_open', 'hr'))
        elif tag == 'center':
            self.content_parts.append(('tag_open', 'div'))
        elif tag == 'blockquote':
            self.content_parts.append(('tag_open', 'blockquote'))
    
    def handle_endtag(self, tag):
        if self.tag_stack and self.tag_stack[-1] == tag:
            self.tag_stack.pop()
        if tag == 'script':
            self.in_script = False
        if tag == 'style':
            self.in_style = False
            
        if not self.in_body or self.in_script or self.in_style:
            return
            
        if tag == 'p':
            self.content_parts.append(('tag_close', 'p'))
        elif tag in ('h1', 'h2', 'h3', 'h4'):
            self.content_parts.append(('tag_close', tag))
        elif tag == 'b' or tag == 'strong':
            self.content_parts.append(('tag_close', 'strong'))
        elif tag == 'i' or tag == 'em':
            self.content_parts.append(('tag_close', 'em'))
        elif tag == 'center':
            self.content_parts.append(('tag_close', 'div'))
        elif tag == 'blockquote':
            self.content_parts.append(('tag_close', 'blockquote'))
    
    def handle_data(self, data):
        if self.in_body and not self.in_script and not self.in_style:
            text = data.strip()
            if text:
                self.content_parts.append(('text', text))


def extract_article_html(content_parts, images_map):
    """Convert extracted parts to clean HTML."""
    html_parts = []
    in_paragraph = False
    
    for part in content_parts:
        if part[0] == 'text':
            text = html.escape(part[1])
            if text:
                html_parts.append(text + ' ')
        elif part[0] == 'img':
            src = part[1]
            alt = html.escape(part[2]) if part[2] else ''
            local_src = images_map.get(src, src)
            html_parts.append(f'\n<figure class="blog-figure"><img src="{html.escape(local_src)}" alt="{alt}" loading="lazy"><figcaption>{alt}</figcaption></figure>\n')
        elif part[0] == 'tag_open':
            tag = part[1]
            if tag == 'hr':
                html_parts.append('\n<hr>\n')
            else:
                html_parts.append(f'<{tag}>')
        elif part[0] == 'tag_close':
            html_parts.append(f'</{part[1]}>')
    
    result = ''.join(html_parts)
    
    # Clean up: remove empty paragraphs, fix whitespace
    result = re.sub(r'<p>\s*</p>', '', result)
    result = re.sub(r'\n{3,}', '\n\n', result)
    
    # If no <p> tags, wrap text blocks in paragraphs
    if '<p>' not in result:
        lines = result.split('\n')
        wrapped = []
        current = []
        for line in lines:
            stripped = line.strip()
            if not stripped:
                if current:
                    text = ' '.join(current).strip()
                    if text and not text.startswith('<figure') and not text.startswith('<h') and not text.startswith('<hr'):
                        wrapped.append(f'<p>{text}</p>')
                    else:
                        wrapped.append(text)
                    current = []
            elif stripped.startswith('<figure') or stripped.startswith('<h') or stripped.startswith('<hr'):
                if current:
                    text = ' '.join(current).strip()
                    if text:
                        wrapped.append(f'<p>{text}</p>')
                    current = []
                wrapped.append(stripped)
            else:
                current.append(stripped)
        if current:
            text = ' '.join(current).strip()
            if text:
                wrapped.append(f'<p>{text}</p>')
        result = '\n'.join(wrapped)
    
    return result


def download_image(img_url, article_slug, img_index):
    """Download an image and return local path."""
    try:
        data = fetch_url(img_url)
        if not data:
            return None
        
        # Determine extension
        ext = '.jpg'
        if img_url.lower().endswith('.png'):
            ext = '.png'
        elif img_url.lower().endswith('.gif'):
            ext = '.gif'
        elif img_url.lower().endswith('.jpeg'):
            ext = '.jpeg'
        
        filename = f"{article_slug}_{img_index}{ext}"
        filepath = os.path.join(IMG_DIR, filename)
        with open(filepath, 'wb') as f:
            f.write(data)
        return f"img/{filename}"
    except Exception as e:
        print(f"  Failed to download image {img_url}: {e}")
        return None


def make_slug(title):
    """Create a URL-safe slug from a title."""
    slug = title.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s]+', '-', slug.strip())
    slug = re.sub(r'-+', '-', slug)
    return slug[:80]


def generate_blog_post(title, date_str, content_html, slug):
    """Generate a complete blog post HTML page."""
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{html.escape(title)} — Steve Gottlieb's Deep Sky</title>
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
                <a href="../index.html#blog">Blog</a>
            </div>
        </div>
    </nav>

    <article class="blog-post">
        <div class="container">
            <a href="../index.html#blog" class="blog-back">← Back to Observing Reports</a>
            <header class="blog-header">
                <h1 class="blog-title">{html.escape(title)}</h1>
                <div class="blog-meta">
                    <span class="blog-author">Steve Gottlieb</span>
                    <span class="blog-date">{html.escape(date_str)}</span>
                </div>
            </header>
            <div class="blog-content">
                {content_html}
            </div>
            <footer class="blog-footer">
                <a href="../index.html#blog" class="btn btn-secondary">← Back to Observing Reports</a>
            </footer>
        </div>
    </article>

    <footer class="site-footer">
        <div class="container">
            <p>&copy; Steve Gottlieb's Deep Sky. All observations and descriptions by Steve Gottlieb.</p>
        </div>
    </footer>
</body>
</html>'''


# ============================================================
# MAIN: Parse the index page and extract Steve Gottlieb articles
# ============================================================

print("Reading observing reports index...")

# We'll parse the raw HTML to extract article links more reliably
index_html = fetch_url("https://adventuresindeepspace.com/observing.reports.htm")
if not index_html:
    print("Failed to fetch index page!")
    exit(1)

index_text = index_html.decode('utf-8', errors='replace')

# Find all Steve Gottlieb articles: look for [Steve Gottlieb](url) pattern
# or links near "Steve Gottlieb" text
# Parse HTML to find links with Steve Gottlieb
steve_articles = []
current_date = ""

# Use regex to find table rows with Steve Gottlieb
# Pattern: date context, title, [Steve Gottlieb](url)
lines = index_text.split('\n')

# Simpler approach: find all links that are near "Steve Gottlieb" text
# Extract from the markdown-like structure we got from web_fetch
# Re-fetch as raw HTML for better parsing
raw_html = index_text

# Find all hrefs near "Steve Gottlieb"
pattern = re.compile(
    r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>([^<]*)</a>[^<]*Steve Gottlieb|'
    r'Steve Gottlieb[^<]*<a[^>]+href=["\']([^"\']+)["\']',
    re.IGNORECASE
)

# Better approach: parse the actual HTML table structure
# Each row: <tr> <th>day</th> <td><div>title</div></td> <td><a href="url">author</a></td> </tr>
# Date headers: <tr><th colspan="3">Month Year</th></tr>

row_re = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
date_header_re = re.compile(r'<th\s+colspan=["\']3["\'][^>]*>\s*(.*?)\s*</th>', re.DOTALL | re.IGNORECASE)
day_re = re.compile(r'<th[^>]*>\s*(\d[\d/\-]*)\s*</th>', re.IGNORECASE)
title_re = re.compile(r'<td[^>]*>\s*(?:<div[^>]*>)?\s*(.*?)\s*(?:</div>)?\s*</td>', re.DOTALL | re.IGNORECASE)
author_re = re.compile(r'<a\s+href=["\']([^"\']+)["\'][^>]*>\s*([^<]+?)\s*</a>', re.IGNORECASE)

current_month_year = ""
for row_match in row_re.finditer(raw_html):
    row = row_match.group(1)
    
    # Check for date header
    dm = date_header_re.search(row)
    if dm:
        date_text = re.sub(r'<[^>]+>', '', dm.group(1)).strip()
        if date_text and re.match(r'[A-Za-z]', date_text):
            current_month_year = date_text
        continue
    
    # Check if this row has Steve Gottlieb
    if 'steve gottlieb' not in row.lower():
        continue
    
    # Extract day
    day = ""
    day_m = day_re.search(row)
    if day_m:
        day = day_m.group(1).strip()
    
    # Extract all <td> elements
    tds = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL | re.IGNORECASE)
    
    if len(tds) < 2:
        continue
    
    # First td = title, second td = author with link
    title_html = tds[0]
    author_html = tds[1] if len(tds) > 1 else ""
    
    # Clean title
    title = re.sub(r'<[^>]+>', '', title_html).strip()
    
    # Get author link
    author_match = author_re.search(author_html)
    if not author_match:
        # Maybe the link is in the title td
        author_match = author_re.search(title_html)
    
    if not author_match:
        continue
    
    article_url = author_match.group(1).strip()
    author_name = author_match.group(2).strip()
    
    # Only Steve Gottlieb articles
    if 'steve gottlieb' not in author_name.lower():
        continue
    
    if not title:
        title = author_name  # fallback
        continue
    
    # Build date
    if current_month_year:
        date_str = current_month_year
        if day:
            parts = current_month_year.split()
            if len(parts) >= 2:
                date_str = f"{parts[0]} {day}, {' '.join(parts[1:])}"
    else:
        date_str = day
    
    # Resolve relative URLs
    if article_url.startswith('/'):
        article_url = BASE_URL.rstrip('/') + article_url
    elif not article_url.startswith('http'):
        article_url = BASE_URL + article_url
    
    # Clean HTML entities from title
    title = html.unescape(title)
    
    steve_articles.append({
        'title': title,
        'url': article_url,
        'date': date_str,
    })

# Deduplicate by URL
seen_urls = set()
unique_articles = []
for a in steve_articles:
    if a['url'] not in seen_urls:
        seen_urls.add(a['url'])
        unique_articles.append(a)
        
steve_articles = unique_articles

print(f"\nFound {len(steve_articles)} Steve Gottlieb articles:")
for i, a in enumerate(steve_articles):
    print(f"  {i+1}. [{a['date']}] {a['title']}")
    print(f"     {a['url']}")

# Save the article index
with open(os.path.join(OUTPUT_DIR, 'articles_index.json'), 'w') as f:
    json.dump(steve_articles, f, indent=2)

print(f"\nArticle index saved. Total: {len(steve_articles)}")
print("\nNow fetching and converting articles...")

# Process each article
blog_index = []
failed = []

for i, article in enumerate(steve_articles):
    title = article['title']
    url = article['url']
    date_str = article['date']
    slug = make_slug(title)
    
    # Skip Facebook links (won't be accessible)
    if 'facebook.com' in url:
        print(f"\n[{i+1}/{len(steve_articles)}] SKIPPING (Facebook): {title}")
        failed.append({'title': title, 'url': url, 'reason': 'Facebook link'})
        continue
    
    print(f"\n[{i+1}/{len(steve_articles)}] Fetching: {title}")
    print(f"  URL: {url}")
    
    raw = fetch_url(url)
    if not raw:
        failed.append({'title': title, 'url': url, 'reason': 'Fetch failed'})
        continue
    
    # Decode HTML
    try:
        page_html = raw.decode('utf-8', errors='replace')
    except:
        page_html = raw.decode('latin-1', errors='replace')
    
    # Extract content
    extractor = ArticleExtractor()
    try:
        extractor.feed(page_html)
    except Exception as e:
        print(f"  Parse error: {e}")
        failed.append({'title': title, 'url': url, 'reason': f'Parse error: {e}'})
        continue
    
    # Download images
    images_map = {}
    for img_idx, img_src in enumerate(extractor.images):
        # Resolve relative image URLs
        if img_src.startswith('/'):
            full_img_url = BASE_URL.rstrip('/') + img_src
        elif not img_src.startswith('http'):
            # Relative to the article URL
            base_dir = url.rsplit('/', 1)[0] + '/'
            full_img_url = base_dir + img_src
        else:
            full_img_url = img_src
        
        local_path = download_image(full_img_url, slug, img_idx)
        if local_path:
            images_map[img_src] = local_path
    
    # Generate content HTML
    content_html = extract_article_html(extractor.content_parts, images_map)
    
    # Check if we got meaningful content
    text_only = re.sub(r'<[^>]+>', '', content_html).strip()
    if len(text_only) < 50:
        print(f"  WARNING: Very little content extracted ({len(text_only)} chars)")
        failed.append({'title': title, 'url': url, 'reason': f'Too little content: {len(text_only)} chars'})
        continue
    
    # Generate blog post HTML
    post_html = generate_blog_post(title, date_str, content_html, slug)
    
    # Write the file
    filename = f"{slug}.html"
    filepath = os.path.join(OUTPUT_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(post_html)
    
    blog_index.append({
        'title': title,
        'date': date_str,
        'slug': slug,
        'filename': filename,
        'images': len(images_map),
        'content_length': len(text_only),
    })
    
    print(f"  OK: {filename} ({len(text_only)} chars, {len(images_map)} images)")

# Save blog index
with open(os.path.join(OUTPUT_DIR, 'blog_index.json'), 'w', encoding='utf-8') as f:
    json.dump(blog_index, f, indent=2)

print(f"\n{'='*60}")
print(f"COMPLETE")
print(f"{'='*60}")
print(f"  Successfully converted: {len(blog_index)}")
print(f"  Failed/skipped: {len(failed)}")
for f_item in failed:
    print(f"    - {f_item['title']}: {f_item['reason']}")
print(f"\nBlog index saved to {os.path.join(OUTPUT_DIR, 'blog_index.json')}")
