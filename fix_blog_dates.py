"""Fix blog_index.json dates by extracting actual dates from article titles."""

import json
import re
import os

INDEX_PATH = r"C:\Users\dagottl\deep-sky-website\src\blog\blog_index.json"

MONTHS = {
    'jan': 'January', 'feb': 'February', 'mar': 'March', 'apr': 'April',
    'may': 'May', 'jun': 'June', 'jul': 'July', 'aug': 'August',
    'sep': 'September', 'oct': 'October', 'nov': 'November', 'dec': 'December',
}

def normalize_month(m):
    """Convert abbreviated or full month name to full form."""
    m = m.strip().rstrip('.')
    key = m[:3].lower()
    return MONTHS.get(key, m)


def extract_date_from_title(title):
    """Try to extract a date from the blog post title.
    
    Returns (date_string, year) or (None, None) if no date found.
    Patterns to match:
      - "12/8/07" -> December 8, 2007
      - "9/25/06" -> September 25, 2006  
      - "9/10/07" -> September 10, 2007
      - "7/20 to 7/27" -> July 20 (take first date)
      - "4/4/08-4/12/08" -> April 4, 2008
      - "2/13 and 2/15" -> February 13
      - "on 3/9/13" -> March 9, 2013
      - "May 11, 2013" -> May 11, 2013
      - "June 12, 2010" -> June 12, 2010
      - "4/15/21" -> April 15, 2021
      - "7/17/23" -> July 17, 2023
      - "Aug 10/11/12" -> August 10 (need year from elsewhere)
      - "Lake Sonoma Feb. 25, 2025"
      - "Dec. 30, 2024"
      - "Jan. 19, 2026"
      - "Nov. 20/21, 2025"
      - "July 21 2007"
      - "CalStar 2013"
      - "Golden State Star Party 2019"
    """
    t = title
    
    # Pattern 1: "Month DD, YYYY" or "Month. DD, YYYY"
    m = re.search(r'\b(Jan\.?|Feb\.?|Mar\.?|Apr\.?|May\.?|Jun\.?|Jul\.?|Aug\.?|Sep\.?|Oct\.?|Nov\.?|Dec\.?|January|February|March|April|June|July|August|September|October|November|December)\s+(\d{1,2})(?:/\d+)?,?\s+(\d{4})\b', t)
    if m:
        month = normalize_month(m.group(1))
        day = int(m.group(2))
        year = m.group(3)
        return f"{month} {day}, {year}", year

    # Pattern 2: "Month DD YYYY" without comma
    m = re.search(r'\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s+(\d{4})\b', t)
    if m:
        month = m.group(1)
        day = int(m.group(2))
        year = m.group(3)
        return f"{month} {day}, {year}", year

    # Pattern 3: MM/DD/YY format (e.g., "12/8/07", "9/25/06", "4/15/21", "7/17/23")
    m = re.search(r'\b(\d{1,2})/(\d{1,2})/(\d{2,4})\b', t)
    if m:
        mon = int(m.group(1))
        day = int(m.group(2))
        yr = m.group(3)
        if len(yr) == 2:
            yr_int = int(yr)
            yr = str(2000 + yr_int) if yr_int < 50 else str(1900 + yr_int)
        if 1 <= mon <= 12:
            month_name = list(MONTHS.values())[mon - 1]
            return f"{month_name} {day}, {yr}", yr

    # Pattern 4: "MM/DD" with year elsewhere or in existing date
    # e.g., "Lake Sonoma on 2/13 and 2/15" — need to find year in existing date
    m = re.search(r'\b(\d{1,2})/(\d{1,2})(?:\s+(?:and|to|-)\s+\d{1,2}/\d{1,2})?\b', t)
    if m and not re.search(r'\d{1,2}/\d{1,2}/\d{2,4}', t):
        # MM/DD without year - can't determine year from title alone
        pass

    # Pattern 5: Year in title like "2019", "2013" (for "CalStar 2013", "GSSP 2019")
    m = re.search(r'\b(20\d{2}|19\d{2})\b', t)
    if m:
        return None, m.group(1)  # Just the year, no specific date

    return None, None


def fix_dates():
    with open(INDEX_PATH, 'r', encoding='utf-8') as f:
        entries = json.load(f)

    changes = 0
    for e in entries:
        title = e['title']
        old_date = e['date']
        
        extracted_date, extracted_year = extract_date_from_title(title)
        
        if extracted_date:
            # We have a specific date from the title
            # Check if current date year matches
            old_year_match = re.search(r'\b(20\d{2}|19\d{2})\b', old_date)
            old_year = old_year_match.group(1) if old_year_match else None
            
            if old_year != extracted_year or not old_date.startswith(extracted_date[:3]):
                print(f"  FIX: '{old_date}' -> '{extracted_date}'")
                print(f"       Title: {title[:70]}")
                e['date'] = extracted_date
                changes += 1
        elif extracted_year:
            # Only have a year from the title
            old_year_match = re.search(r'\b(20\d{2}|19\d{2})\b', old_date)
            old_year = old_year_match.group(1) if old_year_match else None
            
            if old_year and old_year != extracted_year:
                # Year mismatch - fix the year in the date
                new_date = re.sub(r'\b' + old_year + r'\b', extracted_year, old_date)
                if new_date != old_date:
                    print(f"  YEAR FIX: '{old_date}' -> '{new_date}'")
                    print(f"       Title: {title[:70]}")
                    e['date'] = new_date
                    changes += 1

    print(f"\n=== Fixed {changes} dates ===")
    
    with open(INDEX_PATH, 'w', encoding='utf-8') as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)


if __name__ == '__main__':
    fix_dates()
