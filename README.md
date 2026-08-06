# Oussama Benbila — Portfolio

Static site. No build step, no external requests.

## Files
- `index.html` — the site. Self-contained: React and the Geist font are embedded, so it renders on networks that block CDNs and works offline.
- `support.js` — runtime
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
- `index.html` is generated from the Design Component and then has React and the font inlined. Regenerating from source means redoing that inlining step.
