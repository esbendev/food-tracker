# Data Model

All user data is persisted exclusively in `localStorage`. There is no remote storage, no IndexedDB, and no cookies. The app uses four keys.

---

## localStorage keys

| Key | Type | Purpose |
|---|---|---|
| `food_records` | `FoodRecord[]` | Every food entry ever saved |
| `symptom_records` | `SymptomRecord[]` | Every symptom entry ever saved |
| `global_food_history` | `string[]` | Autocomplete vocabulary for food inputs |
| `global_symptom_history` | `string[]` | Autocomplete vocabulary for symptom inputs |

Additional keys are written by the settings/reminder feature:

| Key | Type | Purpose |
|---|---|---|
| `reminder_enabled` | `"true"` \| absent | Whether the daily reminder is on |
| `reminder_time` | `"HH:MM"` | Time of the daily reminder |
| `reminder_last_date` | `"YYYY-MM-DD"` | Last date a fallback reminder was shown |

---

## Record shapes

### FoodRecord

```js
{
  date: "YYYY-MM-DD",   // ISO date string
  meal: "d" | "s" | "a" | "m" | "c",  // meal slot key (see Meal slots below)
  items: string[]       // one or more food names as entered by the user
}
```

### SymptomRecord

```js
{
  date: "YYYY-MM-DD",
  meal: "d" | "s" | "a" | "m" | "c",
  symptoms: string[],   // one or more symptom names as entered by the user
  severity: number,     // integer 1–5 (clamped by normalizeSeverity)
  note: string          // optional free-text note (may be empty string)
}
```

---

## Meal slots

The five meal slots are ordered chronologically and used throughout the app to sort entries and to define the correlation time window.

| Key | Spanish label | Order index |
|---|---|---|
| `d` | desayuno (breakfast) | 0 |
| `s` | snack | 1 |
| `a` | almuerzo (lunch) | 2 |
| `m` | merienda (afternoon snack) | 3 |
| `c` | cena (dinner) | 4 |

The canonical order is exposed as `window.foodTracker.MEAL_ORDER` (`["d","s","a","m","c"]`) and the labels as `window.foodTracker.MEAL_LABELS`.

---

## History / autocomplete arrays

`global_food_history` and `global_symptom_history` are flat arrays of strings. Items are appended the first time they are saved; they are never automatically removed. Users can clear them from the Settings page.

---

## Reading and writing

All access goes through two helpers in `shared.js`:

```js
app.readArray(key)       // → parsed array, or [] on parse failure
app.writeArray(key, arr) // → JSON.stringify and store
```

Both functions are safe against malformed JSON — `readArray` catches parse errors and returns an empty array.

---

## Data normalization for analysis

When records are fed into the correlation engine, labels (food names and symptom names) go through `normalizeLabel`:

1. Trim whitespace
2. Lowercase
3. NFD Unicode normalize
4. Strip combining diacritics (accent marks replaced with space)
5. Collapse runs of whitespace

This means `"Hinchazón"` and `"hinchazon"` are treated as the same symptom. The **raw user-entered strings are always stored as-is**; normalization only happens during analysis, not at write time.

---

## Export / import format

The Settings page can export all data as a single JSON file:

```json
{
  "version": 1,
  "app": "food-tracker",
  "exportedAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
  "data": {
    "food_records": [...],
    "symptom_records": [...],
    "global_food_history": [...],
    "global_symptom_history": [...]
  }
}
```

On import the file is validated for the correct `app` identifier and `version` before writing. Individual datasets can also be exported as JSON or CSV (food records and symptom records only).
