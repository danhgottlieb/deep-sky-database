# Amos — History

## Project Context
Deep sky astronomy website (deepskygottlieb.com) being restructured from single-page to multi-page. Static site on GitHub Pages, deployed from src/. Dan is the user.

## Learnings
- Session started 2025-07-14
- Created src/404.html: handles /object/NGC-891 style permalink redirects (rewrites to /explorer/#object/NGC%20891 via window.location.replace) and shows a styled 404 page for all other missing URLs. Error content hidden by default, only revealed via JS after confirming it's not a redirect. Uses absolute paths for all assets since 404 can be served from any URL depth. Nav matches explorer/reports/articles pages (no item marked active). GitHub Pages serves 404.html automatically.
- app.js multi-page audit (Task E): Found 2 bugs — `hashchange` and `popstate` listeners crash on non-explorer pages because `closeDetailPanel()` accesses `$('#object-detail')` without null check, and that element only exists in explorer/index.html. Also found IntersectionObserver in `setupNav()` strips `active` class from sub-page nav links because it can't match absolute-path hrefs. `init()` conditional loading, `assetPath()`, and `initResources()` all handle multi-page correctly. Findings written to .squad/decisions/inbox/amos-appjs-findings.md.
- Fixed 3 app.js crash bugs: (1) Added null guard in `closeDetailPanel()` so it early-returns if `#object-detail` doesn't exist. (2) Added null guard in `hashchange` listener before accessing `.classList`. (3) Wrapped `setupNav()` IntersectionObserver in `hasHashNavLinks` check so it only runs on the index page where nav uses `#hash` links, preserving the HTML-set `active` class on sub-pages.
