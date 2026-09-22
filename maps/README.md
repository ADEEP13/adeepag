# Maps Library

Static map file library for [adeepag.com/maps/](https://adeepag.com/maps/).

No backend required. All map metadata lives in `data/maps.json`.
Adding a new map takes ~5 minutes and requires **no changes to HTML, CSS, or JS**.

---

## Repository structure

```
maps/
├── index.html              ← main page (don't edit for new maps)
├── style.css               ← all styles (don't edit for new maps)
├── script.js               ← all JS logic (don't edit for new maps)
├── README.md               ← this file
│
├── data/
│   └── maps.json           ← ✏️  EDIT THIS to add a new map
│
└── assets/
    ├── sample-india-outline/
    │   ├── preview.png       ← required thumbnail (~600×400px)
    │   ├── map.svg           ← downloadable SVG
    │   ├── map.png           ← downloadable PNG
    │   ├── map.geojson       ← downloadable GeoJSON
    │   └── README.md         ← optional per-map notes
    │
    └── sample-world-countries/
        ├── preview.png
        ├── map.svg
        ├── map.png
        ├── map.geojson
        └── README.md
```

---

## How to add a new map (step-by-step)

### Step 1 — Choose a slug

Pick a short, lowercase, hyphenated identifier. This becomes the folder name and the URL key.

```
good:  karnataka-districts   india-rivers-major   world-time-zones
bad:   Karnataka Districts    map001               my map
```

### Step 2 — Create the asset folder

```
maps/assets/<your-slug>/
```

### Step 3 — Add the required preview image

```
maps/assets/<your-slug>/preview.png
```

- **Dimensions:** 600 × 400 px (3:2 ratio) — the card uses this aspect ratio
- **Format:** PNG or JPG (PNG preferred for maps)
- **Content:** A representative view of the map — full extent, clean background
- **File size:** Aim for under 200 KB; run through [squoosh.app](https://squoosh.app) if needed

### Step 4 — Add downloadable files

Add whichever formats you have. Filenames must match exactly:

| File | Format key in JSON |
|------|-------------------|
| `map.svg`     | `"svg"`     |
| `map.png`     | `"png"`     |
| `map.geojson` | `"geojson"` |
| `map.gpkg`    | `"gpkg"`    |
| `map.pdf`     | `"pdf"`     |
| `map.kml`     | `"kml"`     |

Only list formats in the JSON that you actually have a file for — the download button links directly to the file.

### Step 5 — Add a metadata entry to `data/maps.json`

Open `data/maps.json` and add an object to the `"maps"` array:

```jsonc
{
  "slug": "karnataka-districts",           // must match folder name
  "title": "Karnataka — Districts",
  "description": "Administrative district boundaries for Karnataka state, India. Suitable for thematic mapping and data visualisation.",
  "category": "Country",                   // pick from the categories list at bottom of maps.json
  "region": "South Asia",                  // pick from the regions list
  "tags": ["Karnataka", "India", "districts", "administrative"],
  "source": {
    "name": "Survey of India",
    "url": "https://surveyofindia.gov.in/"
  },
  "license": {
    "name": "Government Open Data License — India",
    "spdx": "GODL-India",                  // optional — SPDX ID if one exists
    "url": "https://data.gov.in/government-open-data-license-india",
    "acknowledgementText": "This map is based on data provided by Survey of India under the Government Open Data License — India. Please credit Survey of India / data.gov.in when using this map."
  },
  "formats": ["svg", "png", "geojson"],    // only list formats you have files for
  "addedDate": "2025-06-15"               // ISO date, shown in the detail panel
}
```

### Step 6 — Commit and push

```bash
git add maps/assets/karnataka-districts/ maps/data/maps.json
git commit -m "Add Karnataka districts map"
git push
```

The map will appear on the site automatically. No rebuilding needed.

---

## Licence system

Each map has its own `license` object. The `acknowledgementText` field is shown in the modal before download — write this in plain language explaining what credit or attribution the user needs to give.

**Common licence templates:**

```jsonc
// Public Domain (Natural Earth, most government data)
"license": {
  "name": "Public Domain (CC0 1.0)",
  "spdx": "CC0-1.0",
  "url": "https://creativecommons.org/publicdomain/zero/1.0/",
  "acknowledgementText": "This map is in the public domain. No attribution is legally required, but crediting the source is appreciated."
}

// Creative Commons Attribution
"license": {
  "name": "Creative Commons Attribution 4.0",
  "spdx": "CC-BY-4.0",
  "url": "https://creativecommons.org/licenses/by/4.0/",
  "acknowledgementText": "This map is licensed under CC BY 4.0. You must give appropriate credit, provide a link to the licence, and indicate if changes were made."
}

// OpenStreetMap
"license": {
  "name": "ODbL 1.0 (OpenStreetMap contributors)",
  "spdx": "ODbL-1.0",
  "url": "https://opendatacommons.org/licenses/odbl/1-0/",
  "acknowledgementText": "© OpenStreetMap contributors. This map contains data from OpenStreetMap, available under the Open Database Licence. Any derived works must carry the same licence."
}
```

---

## Adding new categories or regions

Edit the `"categories"` and `"regions"` arrays at the bottom of `data/maps.json`. They populate the filter dropdowns automatically.

---

## Hosting

This site works as a static site on any host. For GitHub Pages:

1. In your repo settings → Pages → Source: Deploy from branch → `main` → `/` (root) or `/docs`
2. The page is deployed at `adeepag.com/maps`. The HTML and JavaScript use `/maps/...`
root-relative paths so both `/maps` and `/maps/` resolve the same assets.

For Cloudflare Pages, just connect the repo; no build step needed.

---

## Preview image guidelines

| Property | Recommendation |
|----------|---------------|
| Dimensions | 600 × 400 px |
| Ratio | 3:2 |
| Format | PNG (lossless) or high-quality JPG |
| Background | Dark background (`#0E1B2E` or similar) matches the site theme |
| Max file size | 200 KB |
| Content | Show the full map extent with a small margin |
| Text | Avoid overlay text; title comes from the metadata |
