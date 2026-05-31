# Shared API — `window.foodTracker`

`js/shared.js` is the first script loaded on every page. It attaches a single namespace object to `window.foodTracker` containing all shared utilities and the data-layer functions used by every page script.

The file is wrapped in an IIFE to keep all helper functions private; only the items explicitly assigned to `window.foodTracker` are public.

---

## Constants

### `MEAL_ORDER`
`string[]` — `["d", "s", "a", "m", "c"]`

The five meal slot keys in chronological order. Used everywhere entries must be sorted by meal.

### `MEAL_LABELS`
`{ [key: string]: string }` — maps each meal key to its Spanish display label.

```js
{ d: "desayuno", s: "snack", a: "almuerzo", m: "merienda", c: "cena" }
```

---

## Storage

### `readArray(key)`
Reads `localStorage.getItem(key)`, parses it as JSON, and returns the result. Returns `[]` if the key is absent, the value is not a valid array, or JSON.parse throws.

### `writeArray(key, value)`
Serializes `value` to JSON and writes it to `localStorage`.

---

## Date utilities

### `formatDate(date)`
Returns an ISO `YYYY-MM-DD` string for a given `Date` object.

### `prettyDate(dateValue)`
Returns a human-readable Spanish date string (e.g. `"domingo, 1 de junio de 2025"`) for a `YYYY-MM-DD` string. Falls back to today if the input is invalid.

### `getDateParam()`
Reads the `date` query-string parameter. Returns it if it is a valid `YYYY-MM-DD` string, otherwise returns today's date formatted with `formatDate`.

### `getViewDateParam()`
Reads the `viewDate` query-string parameter. Returns it if valid, otherwise returns an empty string.

### `getNextDate(dateValue)`
Returns the `YYYY-MM-DD` string for the day after `dateValue`. Returns an empty string if `dateValue` is not a valid date.

---

## URL / navigation helpers

### `getNumericParam(name)`
Reads a query-string parameter by name and returns it as a non-negative integer. Returns `-1` if the parameter is absent, non-numeric, or negative.

### `findRecordByIndex(key, index, valuesKey)`
Loads the array at `key`, validates that `records[index]` is a well-formed record (must have a `date` string and a `valuesKey` array), and returns:

```js
{ records, record, index }
// record is null and index is -1 if not found / invalid
```

Used by the edit pages to locate a record passed via the URL `?index=N` parameter.

---

## Input helpers

### `sanitizeValue(value)`
Returns `String(value || "").trim()`. Used everywhere before storing user input.

### `normalizeLabel(value)`
A lossy normalization of a label string: trims, lowercases, strips Unicode combining characters (accent marks), and collapses whitespace. Used internally by the correlation engine to group equivalent labels.

### `normalizeSeverity(value)`
Converts an arbitrary value to an integer in the range 1–5. Values below 1 or non-numeric default to 3.

---

## Form / UI helpers

### `getSelectedMeal(name)`
Returns the value of the checked radio input with `name="[name]"`, or `"d"` as a fallback.

### `setSelectedMeal(name, value)`
Checks the radio input with the given `name` and `value` attributes.

### `createSuggestionInput(options)`
Creates a text input with a live suggestion dropdown, appends it to `options.container`, and returns the `<input>` element.

Options:

| Property | Type | Description |
|---|---|---|
| `container` | `Element` | Where to append the new input block |
| `placeholder` | `string` | Input placeholder text |
| `historyKey` | `string` | localStorage key for the autocomplete vocabulary |
| `maxSuggestions` | `number` | Max suggestions to show (default 5) |
| `initialValue` | `string` | Initial input value |
| `onSelect` | `function(match, input)` | Called when a suggestion pill is selected |

The dropdown appears on focus and on input. It closes on blur (with a 120 ms delay to allow click events on pills to fire). The `pointerdown` / `click` deduplication pattern (`skipClick` flag) prevents the suggestion from being applied twice on touch devices where both events fire.

### `focusLastInput(container)`
Finds the last `.text-input` inside `container`, scrolls it into view, and focuses it.

### `bindMealFocus(container, inputsContainer)`
Adds a click listener to `container` (the meal radio group). When the user clicks a label or radio, focus is moved to the last text input in `inputsContainer` on the next animation frame.

---

## Analysis functions

### `getCorrelationWindowOptions()`
Returns the three available time-window presets as an array of `{ value, label }` objects. Used to populate the window filter dropdown on the correlations page.

### `buildCorrelationReport(options)`
The main analysis entry point. See [correlations.md](correlations.md) for a full description.

### `buildDashboardSummary(options)`
Builds a lightweight summary used by the `resumen.html` page. Accepts `{ days: number }` (default 56 — 8 weeks). Returns:

```js
{
  suspectedTriggers: PairResult[],   // top 3 pairs from the correlation report
  weeklyTrend: WeekBucket[],         // per-week food/symptom count for the last N days
  symptomLeaders: LabelCount[],      // top 4 most-logged symptoms
  foodLeaders: LabelCount[]          // top 4 most-logged foods
}
```

### `buildHistoryEntries(options)`
Builds a flat, filtered, reverse-chronological list of all entries for the history search page. Options:

| Property | Type | Description |
|---|---|---|
| `query` | `string` | Free-text filter (matched against item/symptom names) |
| `type` | `"all"` \| `"food"` \| `"symptom"` | Entry type filter |

Returns an array of entry objects, each carrying `date`, `meal`, `type`, `values`, `severity`, `note`, `recordIndex`, and a pre-built `href` for the edit page.

### `buildCsvExport(type)`
Builds a CSV string for `"food"` or `"symptom"` records. Columns: `date`, `meal`, and either `items` or `symptoms` (pipe-separated), plus `severity` and `note` for symptoms.

### `showInfoModal(title, body)`
Renders a modal overlay with the given title and body text. Bound automatically to all `.info-btn` elements on page load via a delegated `click` listener on `document`.
