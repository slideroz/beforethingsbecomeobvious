# Oussama Benbila — Portfolio

Static site. No build step.

## Files
- `index.html` — the site
- `support.js` — runtime (loads React from unpkg CDN)
- `assets/` — project images
- `.nojekyll` — tells GitHub Pages to serve files as-is

## Deploy to GitHub Pages
1. Create a repo (e.g. `portfolio`) and push the contents of this folder to the repo root on `main`.
2. Repo → Settings → Pages → Source: **Deploy from a branch** → Branch `main`, folder `/ (root)` → Save.
3. Live in a minute at `https://<username>.github.io/portfolio/`.

For `https://<username>.github.io/` instead, name the repo `<username>.github.io`.

## Custom domain
Settings → Pages → Custom domain, then point your DNS (`CNAME` → `<username>.github.io`). A `CNAME` file is committed automatically.

## Notes
- Needs internet on first load (React + Geist font come from CDNs).
- Local check: `python3 -m http.server` in this folder, open `http://localhost:8000`.
