# Pages

Each page is a standalone HTML file that loads `js/shared.js`, `js/pwa.js`, and its own script. All page scripts are IIFEs so they do not leak variables into the global scope.

---

## `index.html` — Dashboard (`js/index.js`)

The home page. It has three sections:

- **Top card** — selected date label and action links (add food, add symptom, go to correlations/history/summary).
- **Calendar card** — a monthly calendar grid with colored dot markers for days that have entries.
- **Timeline card** — a chronological list of all entries for the selected date.

### State
- `selectedDate` — the currently highlighted date (`YYYY-MM-DD`). Initialized from `?viewDate=` or today.
- `visibleMonth` — the `Date` object for the first day of the displayed calendar month. Initialized to the current month.

### Calendar rendering
`renderCalendar()` builds a 42-cell grid (6 rows × 7 columns) starting from the Sunday before the first day of `visibleMonth`. Each cell is a `<button>`. A cell gets:
- `.outside-month` if it belongs to a different month.
- `.today` if it is today's date.
- `.selected` if it matches `selectedDate`.
- Dot markers (`.marker.food`, `.marker.symptom`) based on whether the date has food or symptom records.

Day markers are computed by `getMonthMarkers()`, which scans all records in localStorage and builds a map of `{ [date]: { food: bool, symptom: bool } }`.

### Timeline rendering
`renderTimeline()` calls `getEntriesForDate(selectedDate)` which merges food and symptom records for that date, then sorts them by meal order (food before symptom within the same meal). Each entry is rendered as an anchor `<a>` pointing to the appropriate edit page.

### Edit links
`buildEditHref(entry)` constructs URLs like:
```
edit-item.html?index=3&date=2025-06-01&viewDate=2025-06-01
```
The `index` parameter is the record's position in the `food_records` or `symptom_records` array. This is the only identifier; there are no UUIDs.

### Cross-tab sync
A `storage` event listener re-renders the calendar and timeline when localStorage changes in another tab.

---

## `add-item.html` — Add food (`js/add-item.js`)

Allows the user to log one or more food items for a specific meal and date.

- The target date comes from `?date=YYYY-MM-DD` (set by the "new food" link on the dashboard).
- Meal is selected via radio buttons; clicking a label automatically focuses the last text input (`bindMealFocus`).
- Each text input is created by `createSuggestionInput` backed by `global_food_history`.
- The "Add another" button appends a new input and focuses it.
- On save, all non-empty inputs are collected, validated (at least one required), and pushed as a new `FoodRecord` to `food_records`. New values are also appended to `global_food_history`.
- After saving, the page redirects to `index.html?viewDate=<date>`.

### Save deduplication
A `saveTriggered` flag prevents double-saves if the "save" button fires both `pointerdown` and `click`. A `pendingBlurSave` mechanism triggers a save when focus leaves the input stack toward the save button (supports mobile keyboards that dismiss on save).

---

## `add-symptom.html` — Add symptom (`js/add-symptom.js`)

Identical structure to `add-item.js` with two additions:

- A `severityInput` (number input, 1–5) for symptom intensity.
- A `noteInput` for a free-text note.

The saved `SymptomRecord` includes `severity` (clamped via `normalizeSeverity`) and `note` (trimmed via `sanitizeValue`). The severity and note inputs are excluded from the "at least one symptom" validation check.

---

## `edit-item.html` — Edit food (`js/edit-item.js`)

Loads an existing `FoodRecord` identified by `?index=N`. The record is fetched with `findRecordByIndex`. If not found, the user is alerted and redirected home.

On load the existing meal and items are pre-filled. The user can:
- Change the meal selection.
- Edit, remove, or add items.
- **Save** — overwrites the record at the same index in-place; new values are added to history.
- **Delete** — after a confirm dialog, splices the record out of the array.

The `?viewDate=` parameter is preserved through the back link and post-action redirects so the calendar returns to the correct month.

---

## `edit-symptom.html` — Edit symptom (`js/edit-symptom.js`)

Identical to `edit-item.js` with the same severity/note extras as `add-symptom.js`. The `severityInput` and `noteInput` fields are pre-filled from the stored record.

---

## `history.html` — History search (`js/history.js`)

Provides a searchable, filterable view of all records sorted reverse-chronologically (newest first).

Filters:
- **Search** — free-text input, matched with `buildHistoryEntries({ query })`.
- **Type** — all / food / symptom dropdown.
- **Meal** — all / specific meal slot dropdown.

The meal filter is applied in `history.js` itself after `buildHistoryEntries` returns (the shared function does not support meal filtering directly).

Results are grouped by date under `<section class="history-group">` headings. Each entry card is an anchor pointing to the edit page, using the same `href` pattern as the dashboard.

---

## `correlations.html` — Correlations (`js/correlations.js`)

The most complex page. It renders the output of `buildCorrelationReport` from `shared.js`.

### Filters (top of page)
- **Range** — last 30 / 90 / 180 / 365 days, or all time.
- **Meal** — filter food records to a single meal slot.
- **Min. count** — hide pairs where the food was seen fewer than N times.
- **Window** — same meal / same day / same day + next day.

Any filter change triggers a full `render()` call.

### Summary grid
Five stat pills: tracked days, unique foods, unique symptoms, strongest correlation pair, active window label.

### Correlation matrix
A `<table>` with foods as rows and symptoms as columns. Up to 12 foods (most associated) and 8 symptoms (most associated) are shown.

Each cell that has data shows:
- **Follow rate** — `followCount / foodCount` as a percentage.
- **Cell meta** — `followCount/foodCount · conf [baja|media|alta]`.
- A CSS `--heat` custom property (0–1) computed from lift, used to colour the cell.
- A `title` attribute with baseline rate, risk delta, and lift.

Cells without data are disabled and show `"-"`. Clicking a cell with data selects it and updates the detail panel.

### Detail panel
Shows for the selected food→symptom pair:
- An explanation of the active window.
- A confidence warning if confidence is "baja".
- Metric pills: follow rate, baseline rate, risk delta, lift, average severity, and window breakdown (same meal / later that day / next day counts).
- Up to 5 dated examples.

### Safe foods panel
Lists foods that appear in the records but have never been followed by any symptom (within the active window and filters).

### Symptom co-occurrence panel
Lists symptom pairs that appeared on the same day, ordered by co-occurrence count.

---

## `resumen.html` — Summary (`js/resumen.js`)

A lightweight dashboard that surfaces a quick read-only overview without requiring the user to interact with the full correlations page.

Calls `buildDashboardSummary({ days: 56 })` and renders three blocks:

1. **Sospechas (Suspicions)** — top 3 food→symptom pairs by correlation strength. Each is a link to `correlations.html`.
2. **Tendencias (Trends)** — a mini bar chart with one column per week showing relative food and symptom counts over the last 8 weeks.
3. **Lo más repetido (Most repeated)** — two ranked lists, one for the top 4 foods and one for the top 4 symptoms.

---

## `settings.html` — Settings (`js/settings.js`)

Data management hub. On load it calls:
- `loadVersion()` — reads the `CACHE_NAME` from the service worker via `MessageChannel` and displays it as the app version.
- `renderStorageSummary()` — counts records, items, days with data, and estimates localStorage usage in bytes.
- `initReminder()` — reads `reminder_enabled` / `reminder_time` from localStorage and wires the toggle and time picker. Requests `Notification` permission when the reminder is enabled.

### Clear actions
Three destructive buttons (clear food suggestions, clear symptom suggestions, clear all data), each guarded by `window.confirm`.

### Export actions
- **Export all** — full JSON export (all four keys).
- **Export per-dataset** — individual JSON for each of the four keys.
- **Export CSV** — food or symptom records as `.csv` files via `buildCsvExport`.
- **Export correlations** — runs `buildCorrelationReport` and downloads the `pairs` array as JSON.

### Import
File input (`application/json`) validated for `{ app: "food-tracker", version: 1 }`. Each key in `data` is merged into localStorage. Existing data is overwritten for matching keys.
