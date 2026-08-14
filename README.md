# Oussama Benbila — Portfolio

Static site. No build step, no external requests.

## Files
- `index.html` — the site. Same markup as the Design Component, with the SEO head (canonical, Open Graph, JSON-LD) added.
- `support.js` — runtime, loaded by `index.html`
- `assets/` — project images and video loops
- `favicon.svg` — light/dark aware
- `.nojekyll` — tells GitHub Pages to serve files as-is

## Deploy to GitHub Pages
1. Create a repo (e.g. `portfolio`) and push the contents of this folder to the repo root on `main`.
2. Repo → Settings → Pages → Source: **Deploy from a branch** → Branch `main`, folder `/ (root)` → Save.
3. Live in a minute at `https://<username>.github.io/portfolio/`.

For `https://<username>.github.io/` instead, name the repo `<username>.github.io`.

## Custom domain
Settings → Pages → Custom domain, then point your DNS (`CNAME` → `<username>.github.io`).

## Deep links
Every section and project has its own URL — `#work`, `#accessible-report`, `#policy-community`, and so on. Back and Forward step through them. Paste any of those URLs and the site opens on that view.

## Local check
`python3 -m http.server` in this folder, then open `http://localhost:8000`.

## Notes
- ~66MB total, mostly the project imagery. Well inside the 1GB Pages limit.
- The heaviest single asset is `assets/jooj2-campaign2.mp4` (18MB). Re-encode it smaller if first load feels slow.
- File names are case-sensitive on GitHub Pages but not on macOS. If an image 404s after upload, check its capitalisation.
- `index.html` is generated from `Portfolio v1.dc.html`: the head here stays, and everything from `<x-dc>` to the end of the component script is replaced with the current version. Redo that splice after any design change.
- The Geist font is requested from Google Fonts; on a network that blocks it the site falls back to Helvetica/Arial and still lays out correctly.
- The page holds behind a plain sheet until fonts and load finish, then types the title out before the word starts cycling. Nothing to configure.
