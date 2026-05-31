# PWA — Service Worker, Caching, Install & Reminders

The app is wired as a Progressive Web App. The relevant files are:

| File | Role |
|---|---|
| `manifest.webmanifest` | Web App Manifest — name, icons, display mode |
| `service-worker.js` | Cache-first service worker |
| `js/pwa.js` | SW registration, install prompt, reminder fallback |

---

## Web App Manifest

Key properties:

| Property | Value |
|---|---|
| `display` | `"standalone"` (+ fullscreen / minimal-ui override) |
| `orientation` | `"portrait-primary"` |
| `start_url` | `"./index.html"` |
| `theme_color` | `"#9d8df1"` (purple) |
| `background_color` | `"#f8f7fc"` |
| Icons | 192 × 192, 512 × 512, and a 512 × 512 maskable variant |

---

## Service worker (`service-worker.js`)

### Cache name
`CACHE_NAME` is a versioned string (`"food-tracker-v<date>-<n>"`). **Bump this string whenever any cached asset changes** so that installed clients pick up the new files.

### APP_SHELL
A hardcoded array of all HTML pages, CSS, JS files, manifest, and icons. Every asset the app needs to run offline is listed here. **When you add a new route or script, add it to this list and bump `CACHE_NAME`.**

### Install event
Pre-caches all `APP_SHELL` entries into `CACHE_NAME`, then calls `self.skipWaiting()` so the new worker activates immediately without waiting for old clients to close.

### Activate event
Deletes any cache whose name is not equal to `CACHE_NAME` (removes old versions), then calls `self.clients.claim()` so the freshly activated worker takes control of all open tabs immediately.

### Fetch event
Cache-first strategy for all `GET` requests:

1. Look up the request in the cache.
2. If found → return cached response.
3. If not found → fetch from network, clone the response, store the clone in the cache, return the original.
4. On network failure for a navigation request → fall back to the cached `index.html`.
5. On network failure for any other request → return `Response.error()`.

Non-GET requests (POST, etc.) are not intercepted.

### Message handler
Responds to `{ type: "GET_CACHE_NAME" }` messages via `MessageChannel`. The Settings page uses this to display the current cache version as the app version string.

---

## PWA helper (`js/pwa.js`)

Exposes `window.foodTrackerPwa` with three methods:

### `canPromptInstall()`
Returns `true` if the browser has fired a `beforeinstallprompt` event that has not yet been consumed.

### `promptInstall()`
Calls `.prompt()` on the deferred `beforeinstallprompt` event and returns a Promise that resolves with the user's choice. Rejects if no prompt is available.

### `isStandalone()`
Returns `true` if the app is currently running in standalone display mode (installed to home screen) by checking the `(display-mode: standalone)` media query and `navigator.standalone`.

### `foodtracker:installavailability` event
Dispatched on `window` whenever the install availability changes (after `beforeinstallprompt`, after the user accepts/dismisses, and after install completes). Payload:
```js
{ available: boolean, standalone: boolean }
```

---

## Daily reminder

The reminder feature allows users to opt in to a daily notification to log their meals.

### Storage keys
- `reminder_enabled` — `"true"` when enabled.
- `reminder_time` — `"HH:MM"` string (default `"09:00"`).
- `reminder_last_date` — `"YYYY-MM-DD"` of the last day a fallback reminder was shown.

### Periodic Background Sync (ideal path)
The Settings page registers a `periodicSync` task named `"daily-reminder"` with a `minInterval` of 86400000 ms (24 hours) when Notification permission is granted and the reminder is enabled. The service worker's `periodicsync` handler (if present in the browser) fires `self.registration.showNotification(...)` with the configured time check.

### Fallback path
`checkAndShowReminderFallback()` in `js/pwa.js` runs on every page load. If:
- Notifications are granted,
- `reminder_enabled` is `"true"`,
- `periodicSync` is **not** available in the service worker registration,
- The reminder has not already fired today (`reminder_last_date !== today`),
- The current time is at or past the configured `reminder_time`,

…then the service worker is asked to show a notification via `reg.active.postMessage({ type: "SHOW_REMINDER" })` and `reminder_last_date` is written to today.

This ensures users on browsers without Periodic Background Sync (e.g. most desktop browsers) still receive a reminder on days when they open the app.

---

## Adding a new page or script

1. Add the HTML file and its JS file to the `APP_SHELL` array in `service-worker.js`.
2. Increment the version suffix in `CACHE_NAME`.
3. Load `js/shared.js` and `js/pwa.js` before the page script in the new HTML file.

---

## Installability requirements

The browser will only offer the install prompt when:
- The app is served over **HTTPS** or **`localhost`**.
- The manifest is valid and linked from the page.
- The service worker is registered and active.
- The user has engaged with the page (browser heuristic — typically a brief interaction).

Opening `index.html` directly via `file://` satisfies none of these and the install prompt will never appear.
