# Avasarala — History

## Project Context
Deep sky astronomy website (deepskygottlieb.com) being restructured from single-page to multi-page. Static site on GitHub Pages, deployed from src/. Dan is the user.

## Learnings
- Session started 2025-07-14
- Converted Word doc "Observing report May 9, 2026.docx" to blog post. Used python-docx to extract text (preserving bold object names, coordinates, magnitudes) and 6 embedded JPEG images. Slug: `or-lights-out-at-lake-sonoma-on-may-9-2026`. Created HTML at `src/blog/or-lights-out-at-lake-sonoma-on-may-9-2026.html`, saved 6 images to `src/blog/img/`, updated `blog_index.json` (inserted at position 68 alphabetically). Template pattern: nav with absolute paths + ✦ icon, blog-header/meta/content structure, figure tags for images, GoatCounter script, no app.js, no footer.
