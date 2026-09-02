# Lesko Help · Quick Guide Library

One searchable home for every Lesko Help quick guide and lesson that lives in the
[Lesko Help community](https://lesko-help-2.mn.co). Members can filter by topic
(Business, Nonprofit, Career, or everything), open a guide, download the PDF,
tick off the organizations they contacted, keep notes, bookmark the guides they
need, and ask the team for a new guide.

Everything a member does (bookmarks, notes, check-marks, requests) is stored in
their own browser. Nothing is sent anywhere. That matches the "100% private"
promise of the other Lesko Help apps.

## Run it

It is a static site. Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8080
```

To host it, publish the repository root with GitHub Pages (or drop the folder on
any static host). No build step is needed for the site itself.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | The app shell: hero, tabs, library, my guides, request form, guide drawer |
| `assets/styles.css` | Lesko Help brand styling (cream ground, navy ink, suit colours, serif display, mono labels), light and dark themes |
| `assets/app.js` | Search, filters, sorting, bookmarks, done-state, notes, link check-marks, requests, deep links (`#guide/<id>`) |
| `data/guides.js` / `data/guides.json` | The generated catalogue the app reads (same content, JS wrapper for `file://` use) |
| `data/source/` | Raw export from the community: coursework manifest, per-space post details, Google Drive folder listing |
| `data/INVENTORY.md` | Human-readable inventory of every space, series and guide, including gaps and content issues |
| `scripts/build_data.py` | Rebuilds `data/guides.*` from `data/source/` |
| `scripts/build_single_file.py` | Inlines everything into `dist/index.html` for previews |

## Updating the catalogue

1. Re-export the community posts into `data/source/posts_*.json` (same shape as the existing files).
2. Update `data/source/drive_folder.json` if PDFs were added to the shared Google Drive folder.
3. Run `python3 scripts/build_data.py`.

Topic mapping (which community section lands in which topic chip) lives at the
top of `scripts/build_data.py`.

## Where requests go

The "Request a Guide" tab saves the request on the member's device and offers two
ways to send it: post it in the community Questions Channel (the text is copied
to the clipboard) or email the team. The channel link and email address are the
two constants at the top of `assets/app.js`.
