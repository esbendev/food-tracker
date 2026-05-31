# Correlation Engine

The correlation engine lives entirely in `js/shared.js` and is exposed as `window.foodTracker.buildCorrelationReport(options)`. It is a pure function over the data in localStorage — it reads, computes, and returns results without any side effects.

---

## Entry point

```js
var report = app.buildCorrelationReport({
  meal: "all" | "d" | "s" | "a" | "m" | "c",  // food filter (default: all)
  startDate: "YYYY-MM-DD",                       // earliest date inclusive
  endDate:   "YYYY-MM-DD",                       // latest date inclusive
  windowPreset: "meal" | "day" | "next-day"      // time window (default: next-day)
});
```

Returns:

```js
{
  trackedDates:     number,         // total unique dates in the dataset
  foodsTracked:     number,         // unique normalized food labels
  symptomsTracked:  number,         // unique normalized symptom labels
  windowPreset:     string,         // active preset key
  windowLabel:      string,         // human-readable window description
  pairs:            PairResult[],   // ranked list of food→symptom pairs
  safeFoods:        SafeFood[],     // foods with zero symptom follows
  symptomPairs:     CoOccurrence[]  // symptom pairs that appeared on the same day
}
```

---

## Time windows

The window preset controls which meal slots after the food entry are scanned for symptoms.

| Preset | `sameMeal` | `laterDay` | `nextDay` | Description |
|---|---|---|---|---|
| `"meal"` | ✓ | | | Only symptoms at the same meal slot |
| `"day"` | ✓ | ✓ | | Same meal + all later meal slots on the same day |
| `"next-day"` | ✓ | ✓ | ✓ | Same meal + later that day + all meal slots the following day |

`"next-day"` is the default because some food reactions (e.g. digestive symptoms) can appear hours later.

---

## Processing pipeline

### Step 1 — Group records

`groupRecords` and `groupSymptomRecords` transform the flat `food_records` / `symptom_records` arrays into nested maps:

```
grouped[date][mealKey] = [normalizedLabel, ...]          // food
grouped[date][mealKey] = [{ label, severity, note }, ...]  // symptom
```

Food and symptom labels are normalized with `normalizeLabel` before being stored in the map. Duplicate normalized labels within the same date+meal slot are deduplicated (for food), or merged by keeping the highest severity (for symptoms).

Date and meal filters are applied at this stage.

### Step 2 — Build symptom date map

A separate map `symptomDateMap[symptomLabel][date] = true` is built from the grouped symptom records. This is used later to compute the baseline rate (how often the symptom appears on any tracked day, regardless of what was eaten).

### Step 3 — Pair counting

For each `(date, mealKey)` combination that has food entries:

1. The active window config determines which subsequent meal slots and days are scanned for symptoms (`collectSymptomsForWindow`, `collectNextDaySymptoms`).
2. A `windowStates` map accumulates the symptoms found, tracking which window tier they appeared in (`sameMeal`, `laterDay`, `nextDay`) and the maximum severity.
3. For each food item in the meal and each symptom in `windowStates`, a `PairResult` object is retrieved or created (`ensurePair`) and its counters are incremented.

### Step 4 — Compute metrics

After all records are processed, each `PairResult` gets its derived metrics:

| Metric | Formula | Meaning |
|---|---|---|
| `foodCount` | count of days+meals food appears | How often the food was logged |
| `followCount` | count of times the symptom appeared in the window after the food | Raw co-occurrence count |
| `followRate` | `followCount / foodCount` | Fraction of food occurrences followed by the symptom |
| `baselineRate` | `symptomDayCount / totalTrackedDates` | Background rate: how often the symptom appears regardless of food |
| `riskDelta` | `followRate − baselineRate` | Absolute increase in symptom rate when the food is present |
| `lift` | `followRate / baselineRate` | Relative multiplier vs. baseline (lift > 1 means elevated risk) |
| `averageSeverity` | `totalSeverity / followCount` | Mean severity across all follow occurrences |
| `confidence` | see below | Data quality label |

#### Confidence label

| Label | Condition |
|---|---|
| `"alta"` | `foodCount >= 8` and `followCount >= 4` |
| `"media"` | `foodCount >= 4` and `followCount >= 2` |
| `"baja"` | anything else |

#### Strength score (sort key)

```
strength = followCount × lift
```

Pairs are sorted descending by `strength`, then by `followCount`, then alphabetically by food name. This means high-frequency, high-lift pairs rank first.

### Step 5 — Safe foods

Foods that appear in `foodCounts` but have no pair with `followCount > 0` are collected into `safeFoods`. These are foods that were logged but never followed by any symptom in the active window.

### Step 6 — Symptom co-occurrence

`buildSymptomCooccurrencePairs` scans the symptom groups and finds pairs of symptoms that appeared on the same calendar day (across any meal). For each unique pair it records:

- `coCount` — number of days both appeared.
- `rateAtoB` — `coCount / countA` (fraction of symptom A's days that also had symptom B).
- `rateBtoA` — `coCount / countB`.

Pairs are sorted descending by `coCount`.

---

## PairResult object

```js
{
  food:             string,   // normalized food label
  symptom:          string,   // normalized symptom label
  foodCount:        number,
  followCount:      number,
  sameMealCount:    number,   // how many follows were in the same meal slot
  laterDayCount:    number,   // how many follows were later the same day
  nextDayCount:     number,   // how many follows were the next day
  followRate:       number,   // 0–1
  baselineRate:     number,   // 0–1
  riskDelta:        number,   // signed, can be negative
  lift:             number,   // ≥ 0; 0 if baselineRate is 0
  averageSeverity:  number,
  confidence:       "baja" | "media" | "alta",
  strength:         number,   // sort key
  examples:         Example[] // up to 5 dated occurrences
}
```

### Example object

```js
{
  date:     "YYYY-MM-DD",
  meal:     "d" | "s" | "a" | "m" | "c",
  window:   "Misma comida" | "Mas tarde ese dia" | "Al dia siguiente",
  severity: number,
  note:     string
}
```

---

## Interpreting results

- **`riskDelta > 0` and `lift > 1`** — the symptom appears more often after this food than its baseline frequency suggests.
- **`lift ≈ 1`** — no apparent association; the symptom occurs at roughly its normal background rate.
- **`lift < 1`** — the symptom appears less often after this food (possible protective association, but typically just noise with low counts).
- Always check `confidence`. With only a few observations (`"baja"`) any pattern can easily be coincidental.

---

## Limitations

- The engine is entirely observational. Correlation is not causation.
- With small datasets (few weeks of data), `confidence` will be `"baja"` for almost all pairs.
- The baseline rate uses all tracked dates in the filtered dataset as the denominator, which is a rough approximation.
- Food labels are normalized but not deduplicated semantically (e.g. `"pan integral"` and `"pan"` are distinct foods).
