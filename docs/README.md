# Food Tracker — Developer Documentation

Food Tracker is a client-side-only Progressive Web App (PWA) for logging daily meals and symptoms and discovering correlations between them. There is no backend, no build step, and no framework — everything runs directly in the browser using vanilla ES5 JavaScript and `localStorage` for persistence.

## Table of Contents

- [Project overview](#project-overview)
- [Repository layout](#repository-layout)
- [Running locally](#running-locally)
- [Detailed docs](#detailed-docs)

---

## Project overview

The app has three main concerns:

1. **Daily logging** — the user records what they ate (food entries) and how they felt (symptom entries), grouped by meal slot (breakfast, snack, lunch, snack, dinner) and by date.
2. **History** — full-text search and filtering across all past entries.
3. **Correlation analysis** — a statistical engine that measures how often a symptom follows a specific food within a configurable time window, and surfaces the strongest associations.

All data is stored exclusively in `localStorage` under four keys. No network requests are ever made for user data; the service worker only caches the app shell for offline use.

---

## Repository layout

```
food-tracker/
├── index.html              # Dashboard / daily view
├── add-item.html           # Add a food entry
├── add-symptom.html        # Add a symptom entry
├── edit-item.html          # Edit/delete a food entry
├── edit-symptom.html       # Edit/delete a symptom entry
├── history.html            # Full-text history search
├── correlations.html       # Correlation matrix and analysis
├── resumen.html            # Summary / insights overview
├── settings.html           # Data management & export/import
├── styles.css              # All styles (mobile-first, desktop layout via media query)
├── manifest.webmanifest    # PWA manifest
├── service-worker.js       # Cache-first service worker
├── assets/
│   └── icons/              # App icons (180, 192, 512 px + maskable)
├── js/
│   ├── shared.js           # Global namespace (window.foodTracker) — shared logic & data layer
│   ├── pwa.js              # PWA install prompt and service worker registration
│   ├── index.js            # Dashboard page logic
│   ├── add-item.js         # Add food page logic
│   ├── add-symptom.js      # Add symptom page logic
│   ├── edit-item.js        # Edit food page logic
│   ├── edit-symptom.js     # Edit symptom page logic
│   ├── history.js          # History search page logic
│   ├── correlations.js     # Correlation page rendering
│   ├── resumen.js          # Summary page rendering
│   └── settings.js         # Settings / data management logic
└── docs/                   # This documentation
```

Each HTML page loads `js/shared.js` and `js/pwa.js` first, then its own page script. No module system is used; scripts communicate via the `window.foodTracker` namespace.

---

## Running locally

Because PWA features (service worker, install prompt) require a secure context, open the app from a local server rather than directly from the filesystem:

```bash
# Python 3
python3 -m http.server 8080

# Node.js (npx)
npx serve .
```

Then open `http://localhost:8080` in a browser.

> Opening `index.html` via `file://` disables service workers and the home-screen install prompt.

---

## Detailed docs

| Document | Contents |
|---|---|
| [data-model.md](data-model.md) | localStorage schema, record shapes, history arrays |
| [shared-api.md](shared-api.md) | Full reference for `window.foodTracker` |
| [pages.md](pages.md) | Per-page logic walkthrough |
| [correlations.md](correlations.md) | Correlation engine algorithm and metrics |
| [pwa.md](pwa.md) | Service worker, caching strategy, install flow, reminders |
