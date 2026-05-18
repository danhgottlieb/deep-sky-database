# Decisions

## Active Decisions

### 2025-07-14: Multi-page restructuring approach
**By:** Dan
**What:** Split single-page site into separate pages: /explorer/, /reports/, /articles/. Sub-pages use `data-base-path` attribute on `<html>` for app.js asset resolution. Blog posts at /blog/ keep existing URLs.
**Why:** Better organization, faster page loads, cleaner navigation.

### 2025-07-14: Nav link convention
**By:** Dan
**What:** All sub-page nav links use absolute paths (/, /explorer/, /reports/, /articles/). Blog posts updated from relative `../index.html#section` to absolute paths. Logo icon changed from 🔭 to ✦.
**Why:** Consistent navigation across all pages regardless of depth.

### 2025-07-14: Already completed work
**By:** Dan
**What:** Dropdown z-index fix, Quick Lookup digit search fix, page-aware init() refactor, explorer/index.html created, reports/index.html created.
**Why:** Foundation for remaining multi-page work.
