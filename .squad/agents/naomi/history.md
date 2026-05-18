# Naomi — History

## Project Context
Deep sky astronomy website (deepskygottlieb.com) being restructured from single-page to multi-page. Static site on GitHub Pages, deployed from src/. Dan is the user.

## Learnings
- Session started 2025-07-14
- Created src/articles/index.html — Articles listing page following the same structure as reports and explorer pages. Simpler than reports (no search/filter UI), just a section with articles-list div for app.js to populate. Uses data-base-path="../", absolute nav paths, class="active" on Articles link. No Aladin, no loading overlay, no object-detail divs.
- Stripped src/index.html for multi-page migration: removed explorer section (filters, results, legends, detail panel), blog section, articles section, associated cosmic dividers, loading overlay, and Aladin Lite script. Updated nav/footer links to use absolute paths (/explorer/, /reports/, /articles/). Added data-base-path="" to html element. Bumped CSS/JS versions to v=25. Page now flows: hero → about → bio modal → introduction → resources → footer.
- Bulk-updated nav links across all 114 blog post HTML files in src/blog/. Replaced relative ../index.html#section hrefs with absolute paths (/ for home, /#introduction, /explorer/, /reports/, /articles/). Changed logo icon from 🔭 to ✦. Changed "About" nav text to "Introduction". Also updated blog-back and btn-secondary back-links to /reports/. Zero old patterns remain. PowerShell bulk find-and-replace was the right tool — clean and fast for 114 files.
