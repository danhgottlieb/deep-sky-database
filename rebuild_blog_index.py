"""Rebuild blog_index.json by reading each HTML file to extract actual dates.
Also remove duplicate entries and articles_index.json."""

import json
import os
import re

BLOG_DIR = r"C:\Users\dagottl\deep-sky-website\src\blog"

MONTHS_FULL = ['January','February','March','April','May','June',
               'July','August','September','October','November','December']
MONTHS_ABB = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
MON_TO_NUM = {}
for i, m in enumerate(MONTHS_FULL):
    MON_TO_NUM[m.lower()] = i + 1
for i, m in enumerate(MONTHS_ABB):
    MON_TO_NUM[m.lower()] = i + 1
MON_TO_NUM['sept'] = 9

def month_name(num):
    return MONTHS_FULL[num - 1]


def extract_date_from_html(filepath):
    """Read an HTML blog post and extract the actual observing date.
    
    Strategy:
    1. First check the <span class="blog-date"> tag (original scraped date)
    2. Then check the title for date clues
    3. Then scan the first ~2000 chars of body content for date references
    
    Returns a date string like "August 10, 2023" or "July 2008"
    """
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        html = f.read()
    
    # Get title
    title_m = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.S)
    title = title_m.group(1).strip() if title_m else ''
    
    # Get existing blog-date
    date_m = re.search(r'blog-date["\']?>(.*?)</span>', html)
    existing_date = date_m.group(1).strip() if date_m else ''
    
    # Get body content (first 3000 chars after blog-content)
    body_start = html.find('blog-content')
    body_text = ''
    if body_start > 0:
        body_text = html[body_start:body_start+3000]
        # Strip HTML tags for easier searching
        body_text = re.sub(r'<[^>]+>', ' ', body_text)
        body_text = re.sub(r'\s+', ' ', body_text)
    
    # Strategy 1: Extract date from title
    date_from_title = _date_from_text(title)
    if date_from_title:
        return title, date_from_title, existing_date
    
    # Strategy 2: Extract date from body content
    date_from_body = _date_from_body(body_text)
    if date_from_body:
        return title, date_from_body, existing_date
    
    # Strategy 3: Keep existing date
    return title, existing_date, existing_date


def _date_from_text(text):
    """Extract a date from a title string."""
    if not text:
        return None
    
    # "Month DD, YYYY" or "Month. DD, YYYY" (e.g., "Feb. 25, 2025")
    m = re.search(
        r'\b(Jan(?:uary)?\.?|Feb(?:ruary)?\.?|Mar(?:ch)?\.?|Apr(?:il)?\.?|'
        r'May\.?|Jun(?:e)?\.?|Jul(?:y)?\.?|Aug(?:ust)?\.?|'
        r'Sep(?:t(?:ember)?)?\.?|Oct(?:ober)?\.?|Nov(?:ember)?\.?|Dec(?:ember)?\.?)'
        r'\s+(\d{1,2})(?:[/,\-]\s*\d{1,2})*[,\s]+(\d{4})\b', text)
    if m:
        mon = m.group(1).rstrip('.')
        day = int(m.group(2))
        year = m.group(3)
        mon_key = mon[:3].lower()
        if mon_key in MON_TO_NUM:
            return f"{month_name(MON_TO_NUM[mon_key])} {day}, {year}"
    
    # "Month DD YYYY" no comma (e.g., "July 21 2007")
    m = re.search(
        r'\b(January|February|March|April|May|June|July|August|September|October|November|December)'
        r'\s+(\d{1,2})\s+(\d{4})\b', text)
    if m:
        return f"{m.group(1)} {int(m.group(2))}, {m.group(3)}"
    
    # "DD-DD Month YYYY" (e.g., "26-27 Aug 2006")
    m = re.search(r'(\d{1,2})[-/]\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\.?\s+(\d{4})', text)
    if m:
        day = int(m.group(1))
        mon_key = m.group(2)[:3].lower()
        year = m.group(3)
        if mon_key in MON_TO_NUM:
            return f"{month_name(MON_TO_NUM[mon_key])} {day}, {year}"
    
    # MM/DD/YY (e.g., "12/8/07", "4/15/21")
    m = re.search(r'\b(\d{1,2})/(\d{1,2})/(\d{2,4})\b', text)
    if m:
        mon = int(m.group(1))
        day = int(m.group(2))
        yr = m.group(3)
        if len(yr) == 2:
            yr_int = int(yr)
            yr = str(2000 + yr_int) if yr_int < 50 else str(1900 + yr_int)
        if 1 <= mon <= 12 and 1 <= day <= 31:
            return f"{month_name(mon)} {day}, {yr}"
    
    # "Month YYYY" alone (e.g., "October 2017")
    m = re.search(r'\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b', text)
    if m:
        return f"{m.group(1)} {m.group(2)}"
    
    return None


def _date_from_body(body_text):
    """Extract date from the body text of a blog post.
    
    Look for patterns like:
    - "On the night of August 10..." 
    - "observing on 8/10/23..."
    - "last night (12/30/24)"
    """
    if not body_text:
        return None
    
    # "Month DD, YYYY" in body
    m = re.search(
        r'\b(January|February|March|April|May|June|July|August|September|October|November|December)'
        r'\s+(\d{1,2}),?\s+(\d{4})\b', body_text)
    if m:
        return f"{m.group(1)} {int(m.group(2))}, {m.group(3)}"
    
    # MM/DD/YY in body
    m = re.search(r'\b(\d{1,2})/(\d{1,2})/(\d{2,4})\b', body_text)
    if m:
        mon = int(m.group(1))
        day = int(m.group(2))
        yr = m.group(3)
        if len(yr) == 2:
            yr_int = int(yr)
            yr = str(2000 + yr_int) if yr_int < 50 else str(1900 + yr_int)
        if 1 <= mon <= 12 and 1 <= day <= 31:
            return f"{month_name(mon)} {day}, {yr}"
    
    return None


def count_images(filepath):
    """Count images in a blog post."""
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        html = f.read()
    # Count <img in blog-content area
    content_start = html.find('blog-content')
    if content_start < 0:
        return 0
    content = html[content_start:]
    return len(re.findall(r'<img\s', content))


def main():
    index_path = os.path.join(BLOG_DIR, 'blog_index.json')
    
    # Get all HTML files
    html_files = sorted([f for f in os.listdir(BLOG_DIR) if f.endswith('.html')])
    
    entries = []
    seen_files = set()
    
    for fn in html_files:
        filepath = os.path.join(BLOG_DIR, fn)
        title, date, old_date = extract_date_from_html(filepath)
        images = count_images(filepath)
        
        # Create slug from filename
        slug = fn.replace('.html', '')
        
        entry = {
            "title": title,
            "date": date,
            "slug": slug,
            "filename": fn,
            "images": images,
            "content_length": os.path.getsize(filepath),
        }
        
        if date != old_date:
            print(f"  DATE CHANGED: '{old_date}' -> '{date}'")
            print(f"    {fn} | {title[:60]}")
        
        entries.append(entry)
    
    # Check for and report duplicates (same title)
    print(f"\n=== DUPLICATE CHECK ===")
    title_map = {}
    for e in entries:
        t = e['title']
        if t in title_map:
            print(f"  DUP TITLE: '{t[:60]}'")
            print(f"    Keep: {title_map[t]['filename']} date={title_map[t]['date']}")
            print(f"    Remove: {e['filename']} date={e['date']}")
        else:
            title_map[t] = e
    
    # Deduplicate - keep first occurrence
    unique_entries = list(title_map.values())
    removed = len(entries) - len(unique_entries)
    
    # Write index
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(unique_entries, f, indent=2, ensure_ascii=False)
    
    print(f"\n=== RESULT ===")
    print(f"Total HTML files: {len(html_files)}")
    print(f"Unique entries: {len(unique_entries)}")
    print(f"Duplicates removed: {removed}")
    
    # Show final chronological listing
    print(f"\n=== FINAL LISTING (first 20 + last 5) ===")
    from datetime import datetime
    def parse_sort_date(d):
        if not d:
            return datetime(1900, 1, 1)
        d2 = re.sub(r'(\d+)[-/]\d+', r'\1', d)
        for fmt in ['%B %d, %Y', '%B %Y', '%b %d, %Y', '%b %Y']:
            try:
                return datetime.strptime(d2.strip(), fmt)
            except ValueError:
                continue
        return datetime(1900, 1, 1)
    
    sorted_entries = sorted(unique_entries, key=lambda e: parse_sort_date(e['date']), reverse=True)
    for e in sorted_entries[:20]:
        print(f"  {e['date']:30s} | {e['title'][:60]}")
    print("  ...")
    for e in sorted_entries[-5:]:
        print(f"  {e['date']:30s} | {e['title'][:60]}")


if __name__ == '__main__':
    main()
