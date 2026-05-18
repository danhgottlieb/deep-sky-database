# Decisions

## Decision: 404 Page Permalink Redirect Strategy

**Author:** Amos (Backend Dev)  
**Date:** 2025-07-14  
**Status:** Implemented

### Context
GitHub Pages needs a 404.html to handle missing URLs. We also want `/object/NGC-891` style permalinks to redirect to the explorer.

### Decision
The 404 page does double duty:
1. **Permalink redirects**: If the URL starts with `/object/`, it extracts the object name, replaces hyphens with spaces, and redirects to `/explorer/#object/<encoded name>` using `window.location.replace()` (so the 404 never appears in browser history).
2. **Actual 404s**: For all other missing URLs, it shows a styled error page with navigation links.

Error content is hidden via CSS (`display: none`) and only revealed by JS after confirming the URL isn't an `/object/` redirect. This prevents a flash of the 404 content during redirects.

### Impact
- Frontend team: The explorer must handle `#object/<name>` hash routes for this to work end-to-end.
- All asset paths in 404.html use absolute paths (`/css/style.css`) since the page can be served from any URL depth.

---

## Decision: app.js Multi-Page Edge Case Findings and Fixes

**Author:** Amos (Backend Dev)  
**Date:** 2025-07-14  
**Status:** Implemented

### Summary
Reviewed app.js for multi-page compatibility. Found 2 real bugs and 1 visual concern.

### Bug 1: `hashchange` listener crashes on non-explorer pages (HIGH)

**Line 2040:**
```js
if (!window.location.hash.startsWith('#object/') && $('#object-detail').classList.contains('open')) {
```

`$('#object-detail')` returns `null` on reports, articles, and home pages (the element only exists in `explorer/index.html`). Any hash change on those pages will throw `TypeError: Cannot read properties of null (reading 'classList')`.

**Trigger:** User clicks any `#hash` link on a non-explorer page, or browser fires a hashchange event.

**Fix:** Add null check: `const detail = $('#object-detail'); if (detail && detail.classList.contains('open')) ...`

### Bug 2: `popstate` → `handleHashNavigation()` → `closeDetailPanel()` crashes on non-explorer pages (HIGH)

**Line 2037:** `window.addEventListener('popstate', () => handleHashNavigation());`

This is registered globally (outside any conditional). On non-explorer pages, if hash doesn't start with `#object/`, `handleHashNavigation()` calls `closeDetailPanel(false)` at line 2033, which does `$('#object-detail').classList.remove('open')` at line 1921 — same null reference crash.

**Trigger:** Browser back/forward navigation on any non-explorer page.

**Fix:** Guard `closeDetailPanel()` with a null check on `#object-detail` at line 1919-1921:
```js
const detail = $('#object-detail');
if (!detail) return;
detail.classList.remove('open');
```

### Concern: IntersectionObserver strips `active` class from sub-page nav links (MEDIUM)

**Lines 322-329:** When ANY `section[id]` scrolls into view, the observer removes `active` from ALL nav links, then tries to find `a[href="#sectionId"]`. On sub-pages, nav links use absolute paths (`/explorer/`, `/reports/`, `/articles/`), not hash links. So the observer can't re-apply `active` to the correct link, and the active state is lost.

**Example:** On `explorer/index.html`, when `<section id="explorer">` enters the viewport, the observer removes `active` from the Database link (`href="/explorer/"`), looks for `a[href="#explorer"]` (doesn't exist), and the nav has no active item.

**Fix:** Skip the observer entirely on sub-pages if `data-base-path` is set, or only run it on the home page: `if (!basePath) sections.forEach(s => observer.observe(s));`

### Recommended fixes applied

**For closeDetailPanel:**
```js
function closeDetailPanel(updateUrl) {
    if (updateUrl === undefined) updateUrl = true;
    const detail = $('#object-detail');
    if (!detail) return;  // <-- guard for non-explorer pages
    const backdrop = $('#detail-backdrop');
    detail.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    document.body.style.overflow = '';
    if (updateUrl && window.location.hash.startsWith('#object/')) {
        history.replaceState(null, '', window.location.pathname + window.location.search + '#explorer');
    }
}
```

**For hashchange:**
```js
window.addEventListener('hashchange', () => {
    const detail = $('#object-detail');
    if (!window.location.hash.startsWith('#object/') && detail && detail.classList.contains('open')) {
        closeDetailPanel(false);
    }
});
```

---

## Decision: Articles Page Structure

**Author:** Naomi (Frontend Dev)  
**Date:** 2025-07-14  
**Status:** Implemented

### What
Created `src/articles/index.html` as a simpler variant of the reports page — no search/filter UI, no load-more button. Just the `#articles-list` container div that app.js populates.

### Why
The articles page doesn't need the search/filter infrastructure that reports has. 46 articles is a small enough list to render all at once. Kept the page minimal so app.js handles all the rendering logic.

### Impact
- app.js needs to handle the `#articles-list` element when present on this page
- The meta description mirrors the section-desc text for SEO consistency
