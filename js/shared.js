(function () {
  window.foodTracker = {
    MEAL_ORDER: ["d", "s", "a", "m", "c"],
    MEAL_LABELS: {
      d: "desayuno",
      s: "snack",
      a: "almuerzo",
      m: "merienda",
      c: "cena"
    },
    readArray: readArray,
    writeArray: writeArray,
    formatDate: formatDate,
    prettyDate: prettyDate,
    getDateParam: getDateParam,
    getViewDateParam: getViewDateParam,
    sanitizeValue: sanitizeValue,
    normalizeLabel: normalizeLabel,
    getSelectedMeal: getSelectedMeal,
    setSelectedMeal: setSelectedMeal,
    createSuggestionInput: createSuggestionInput,
    focusLastInput: focusLastInput,
    bindMealFocus: bindMealFocus,
    getNextDate: getNextDate,
    getNumericParam: getNumericParam,
    findRecordByIndex: findRecordByIndex,
    buildCorrelationReport: buildCorrelationReport,
    normalizeSeverity: normalizeSeverity,
    getCorrelationWindowOptions: getCorrelationWindowOptions,
    buildDashboardSummary: buildDashboardSummary,
    buildHistoryEntries: buildHistoryEntries,
    buildCsvExport: buildCsvExport,
    showInfoModal: showInfoModal
  };

  // Small suppression window to avoid accidental taps on suggestion pills
  // that are rendered for a newly-created input after selecting a suggestion.
  var _suppressSuggestionClicks = false;
  var SUGGESTION_SUPPRESSION_MS = 1000;

  function readArray(key) {
    try {
      var raw = localStorage.getItem(key);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeArray(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function formatDate(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function parseDateValue(dateValue) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue || ""));

    if (!match) {
      return null;
    }

    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    var date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  function prettyDate(dateValue) {
    var date = parseDateValue(dateValue) || new Date();

    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }

  function getDateParam() {
    var params = new URLSearchParams(window.location.search);
    var value = params.get("date");
    return parseDateValue(value) ? value : formatDate(new Date());
  }

  function getViewDateParam() {
    var params = new URLSearchParams(window.location.search);
    var value = params.get("viewDate");
    return parseDateValue(value) ? value : "";
  }

  function sanitizeValue(value) {
    return String(value || "").trim();
  }

  function normalizeLabel(value) {
    return sanitizeValue(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getSelectedMeal(name) {
    var checked = document.querySelector('input[name="' + name + '"]:checked');
    return checked ? checked.value : "d";
  }

  function setSelectedMeal(name, value) {
    var input = document.querySelector('input[name="' + name + '"][value="' + value + '"]');

    if (input) {
      input.checked = true;
    }
  }

  function getNumericParam(name) {
    var params = new URLSearchParams(window.location.search);
    var rawValue = params.get(name);
    var value = Number(rawValue);

    if (!rawValue || !Number.isInteger(value) || value < 0) {
      return -1;
    }

    return value;
  }

  function findRecordByIndex(key, index, valuesKey) {
    var records = readArray(key);
    var record = records[index];

    if (!record || typeof record.date !== "string" || !Array.isArray(record[valuesKey])) {
      return {
        records: records,
        record: null,
        index: -1
      };
    }

    return {
      records: records,
      record: record,
      index: index
    };
  }

  function createSuggestionInput(options) {
    var block = document.createElement("div");
    block.className = "input-block";

    var input = document.createElement("input");
    input.type = "text";
    input.className = "text-input";
    input.placeholder = options.placeholder;
    input.autocomplete = "off";
    input.value = options.initialValue || "";

    var suggestions = document.createElement("div");
    suggestions.className = "suggestions";

    input.addEventListener("input", function () {
      renderSuggestions();
    });

    input.addEventListener("focus", function () {
      renderSuggestions();
    });

    input.addEventListener("blur", function () {
      window.setTimeout(function () {
        suggestions.classList.remove("visible");
        suggestions.innerHTML = "";
      }, 120);
    });

    block.appendChild(input);
    block.appendChild(suggestions);
    options.container.appendChild(block);

    function renderSuggestions() {
      var applied = false;
      var query = sanitizeValue(input.value).toLowerCase();
      var history = readArray(options.historyKey)
        .filter(function (entry) {
          return typeof entry === "string" && entry.trim();
        });

      var matches = history.filter(function (entry) {
        return !query || entry.toLowerCase().indexOf(query) !== -1;
      }).slice(0, options.maxSuggestions || 5);

      suggestions.innerHTML = "";
      if (!matches.length || (matches.length === 1 && matches[0].toLowerCase() === query)) {
        suggestions.classList.remove("visible");
        return;
      }

      matches.forEach(function (match) {
        var pill = document.createElement("button");
        pill.type = "button";
        pill.className = "suggestion-pill";
        pill.textContent = match;
        var skipClick = false;

        function applySuggestion(event) {
          // Guard: if a selection was recently made, suppress this event so
          // ghost clicks / delayed touch events don't trigger newly-rendered
          // pills for the input that was just created.
          if (_suppressSuggestionClicks) {
            if (event) { event.preventDefault(); }
            return;
          }

          // Immediately enable suppression to prevent other suggestion
          // handlers (possibly for newly-rendered inputs) from applying
          // while we finish processing this selection.
          _suppressSuggestionClicks = true;
          window.setTimeout(function () {
            _suppressSuggestionClicks = false;
          }, SUGGESTION_SUPPRESSION_MS);

          if (applied) {
            return;
          }

          if (event) {
            if (event.type === "click" && skipClick) {
              skipClick = false;
              event.preventDefault();
              return;
            }

            skipClick = event.type === "pointerdown";
            event.preventDefault();
          }

          applied = true;
          suggestions.style.pointerEvents = "none";
          input.value = match;
          suggestions.innerHTML = "";
          suggestions.classList.remove("visible");

          if (typeof options.onSelect === "function") {
            // Defer calling onSelect so any pointerup/click from the current
            // interaction doesn't hit suggestion pills rendered for a newly
            // created input. This avoids accidental double-selection.
            window.setTimeout(function () {
              options.onSelect(match, input);
            }, 0);
            return;
          }

          input.focus();
        }

        pill.addEventListener("pointerdown", applySuggestion);
        pill.addEventListener("click", applySuggestion);
        suggestions.appendChild(pill);
      });
      suggestions.classList.add("visible");
    }

    return input;
  }

  function focusLastInput(container) {
    var inputs = container.querySelectorAll(".text-input");
    var lastInput = inputs.length ? inputs[inputs.length - 1] : null;

    if (!lastInput) {
      return;
    }

    lastInput.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
    lastInput.focus();
  }

  function bindMealFocus(container, inputsContainer) {
    container.addEventListener("click", function (event) {
      var trigger = event.target.closest("label, input");

      if (!trigger || !container.contains(trigger)) {
        return;
      }

      window.requestAnimationFrame(function () {
        focusLastInput(inputsContainer);
      });
    });
  }

  function getNextDate(dateValue) {
    var parts = String(dateValue || "").split("-").map(function (segment) {
      return Number(segment);
    });

    if (parts.length !== 3 || parts.some(function (value) { return Number.isNaN(value); })) {
      return "";
    }

    var date = new Date(parts[0], parts[1] - 1, parts[2]);

    date.setDate(date.getDate() + 1);
    return formatDate(date);
  }

  function normalizeSeverity(value) {
    var severity = Number(value);

    if (!severity || severity < 1) {
      return 3;
    }

    if (severity > 5) {
      return 5;
    }

    return Math.round(severity);
  }

  function getCorrelationWindowOptions() {
    return [
      {
        value: "meal",
        label: "Solo misma comida"
      },
      {
        value: "day",
        label: "Mismo dia"
      },
      {
        value: "next-day",
        label: "Mismo dia + dia siguiente"
      }
    ];
  }

  function buildCorrelationReport(options) {
    var config = options || {};
    var mealFilter = config.meal && config.meal !== "all" ? config.meal : null;
    var startDate = config.startDate || "";
    var endDate = config.endDate || "";
    var windowConfig = getCorrelationWindowConfig(config.windowPreset);
    var foodRecords = readArray("food_records");
    var symptomRecords = readArray("symptom_records");
    var foodGroups = groupRecords(foodRecords, "items", mealFilter, startDate, endDate);
    var symptomGroups = groupSymptomRecords(symptomRecords, startDate, endDate);
    var trackedDatesMap = {};
    var symptomDateMap = {};
    var foodCounts = {};
    var pairs = {};
    var pairList = [];

    collectTrackedDates(foodGroups, trackedDatesMap);
    collectTrackedDates(symptomGroups, trackedDatesMap);

    Object.keys(symptomGroups).forEach(function (dateKey) {
      Object.keys(symptomGroups[dateKey]).forEach(function (mealKey) {
        symptomGroups[dateKey][mealKey].forEach(function (symptom) {
          if (!symptomDateMap[symptom.label]) {
            symptomDateMap[symptom.label] = {};
          }

          symptomDateMap[symptom.label][dateKey] = true;
        });
      });
    });

    Object.keys(foodGroups).forEach(function (dateKey) {
      window.foodTracker.MEAL_ORDER.forEach(function (mealKey, mealIndex) {
        var foodsAtMeal = (foodGroups[dateKey] && foodGroups[dateKey][mealKey]) || [];
        var windowStates = {};

        if (!foodsAtMeal.length) {
          return;
        }

        if (windowConfig.sameMeal) {
          collectSymptomsForWindow((symptomGroups[dateKey] && symptomGroups[dateKey][mealKey]) || [], windowStates, "sameMeal", "Misma comida");
        }

        if (windowConfig.laterDay) {
          window.foodTracker.MEAL_ORDER.slice(mealIndex + 1).forEach(function (laterMealKey) {
            collectSymptomsForWindow((symptomGroups[dateKey] && symptomGroups[dateKey][laterMealKey]) || [], windowStates, "laterDay", "Mas tarde ese dia");
          });
        }

        if (windowConfig.nextDay) {
          collectNextDaySymptoms(symptomGroups, dateKey, windowStates);
        }

        foodsAtMeal.forEach(function (food) {
          foodCounts[food] = (foodCounts[food] || 0) + 1;

          Object.keys(windowStates).forEach(function (symptomKey) {
            var state = windowStates[symptomKey];
            var pair = ensurePair(food, symptomKey, pairs, pairList);

            if (state.sameMeal) {
              pair.sameMealCount += 1;
            }
            if (state.laterDay) {
              pair.laterDayCount += 1;
            }
            if (state.nextDay) {
              pair.nextDayCount += 1;
            }

            pair.followCount += 1;
            pair.totalSeverity += state.maxSeverity;
            addExample(pair, dateKey, mealKey, state.windowLabel, {
              severity: state.maxSeverity,
              note: state.note
            });
          });
        });
      });
    });

    var totalTrackedDates = trackedDateCount(trackedDatesMap);

    pairList.forEach(function (pair) {
      var symptomDates = symptomDateMap[pair.symptom] || {};
      var symptomDateCount = Object.keys(symptomDates).length;
      pair.foodCount = foodCounts[pair.food] || 0;
      pair.followRate = pair.foodCount ? pair.followCount / pair.foodCount : 0;
      pair.baselineRate = totalTrackedDates ? symptomDateCount / totalTrackedDates : 0;
      pair.lift = pair.baselineRate ? pair.followRate / pair.baselineRate : 0;
      pair.riskDelta = pair.followRate - pair.baselineRate;
      pair.averageSeverity = pair.followCount ? pair.totalSeverity / pair.followCount : 0;
      pair.confidence = getConfidenceLabel(pair.foodCount, pair.followCount);
      pair.strength = pair.followCount * pair.lift;
    });

    pairList.sort(function (left, right) {
      if (right.strength !== left.strength) {
        return right.strength - left.strength;
      }
      if (right.followCount !== left.followCount) {
        return right.followCount - left.followCount;
      }
      return left.food.localeCompare(right.food, "es");
    });

    var foodsWithAnyFollows = {};

    pairList.forEach(function (pair) {
      if (pair.followCount > 0) {
        foodsWithAnyFollows[pair.food] = true;
      }
    });

    var safeFoodList = Object.keys(foodCounts)
      .filter(function (food) { return !foodsWithAnyFollows[food]; })
      .map(function (food) { return { food: food, foodCount: foodCounts[food] }; })
      .sort(function (left, right) { return right.foodCount - left.foodCount; });

    return {
      trackedDates: totalTrackedDates,
      foodsTracked: Object.keys(foodCounts).length,
      symptomsTracked: Object.keys(symptomDateMap).length,
      windowPreset: windowConfig.value,
      windowLabel: windowConfig.label,
      pairs: pairList,
      safeFoods: safeFoodList,
      symptomPairs: buildSymptomCooccurrencePairs(symptomGroups)
    };
  }

  function buildSymptomCooccurrencePairs(symptomGroups) {
    var symptomDayCounts = {};
    var coOccurrenceCounts = {};
    var i;
    var j;

    Object.keys(symptomGroups).forEach(function (dateKey) {
      var daySymptoms = [];

      Object.keys(symptomGroups[dateKey]).forEach(function (mealKey) {
        symptomGroups[dateKey][mealKey].forEach(function (event) {
          if (daySymptoms.indexOf(event.label) === -1) {
            daySymptoms.push(event.label);
          }
        });
      });

      daySymptoms.forEach(function (sym) {
        symptomDayCounts[sym] = (symptomDayCounts[sym] || 0) + 1;
      });

      for (i = 0; i < daySymptoms.length; i++) {
        for (j = i + 1; j < daySymptoms.length; j++) {
          var symA = daySymptoms[i];
          var symB = daySymptoms[j];
          var key = symA < symB ? symA + "::" + symB : symB + "::" + symA;

          coOccurrenceCounts[key] = (coOccurrenceCounts[key] || 0) + 1;
        }
      }
    });

    var pairs = [];

    Object.keys(coOccurrenceCounts).forEach(function (key) {
      var parts = key.split("::");
      var symA = parts[0];
      var symB = parts[1];
      var coCount = coOccurrenceCounts[key];
      var countA = symptomDayCounts[symA] || 1;
      var countB = symptomDayCounts[symB] || 1;

      pairs.push({
        symA: symA,
        symB: symB,
        coCount: coCount,
        countA: countA,
        countB: countB,
        rateAtoB: coCount / countA,
        rateBtoA: coCount / countB
      });
    });

    pairs.sort(function (left, right) {
      if (right.coCount !== left.coCount) {
        return right.coCount - left.coCount;
      }
      return left.symA.localeCompare(right.symA, "es");
    });

    return pairs;
  }

  function getCorrelationWindowConfig(windowPreset) {
    if (windowPreset === "meal") {
      return {
        value: "meal",
        label: "solo misma comida",
        sameMeal: true,
        laterDay: false,
        nextDay: false
      };
    }

    if (windowPreset === "day") {
      return {
        value: "day",
        label: "mismo dia",
        sameMeal: true,
        laterDay: true,
        nextDay: false
      };
    }

    return {
      value: "next-day",
      label: "mismo dia + dia siguiente",
      sameMeal: true,
      laterDay: true,
      nextDay: true
    };
  }

  function groupRecords(records, valueKey, mealFilter, startDate, endDate) {
    var grouped = {};

    records.forEach(function (entry) {
      if (!entry || typeof entry.date !== "string" || !Array.isArray(entry[valueKey]) || !entry[valueKey].length) {
        return;
      }
      if (mealFilter && entry.meal !== mealFilter) {
        return;
      }
      if (startDate && entry.date < startDate) {
        return;
      }
      if (endDate && entry.date > endDate) {
        return;
      }

      if (!grouped[entry.date]) {
        grouped[entry.date] = {};
      }
      if (!grouped[entry.date][entry.meal]) {
        grouped[entry.date][entry.meal] = [];
      }

      entry[valueKey].forEach(function (rawValue) {
        var normalized = normalizeLabel(rawValue);

        if (!normalized || grouped[entry.date][entry.meal].indexOf(normalized) !== -1) {
          return;
        }

        grouped[entry.date][entry.meal].push(normalized);
      });
    });

    return grouped;
  }

  function groupSymptomRecords(records, startDate, endDate) {
    var grouped = {};

    records.forEach(function (entry) {
      var severity;
      var note;

      if (!entry || typeof entry.date !== "string" || !Array.isArray(entry.symptoms) || !entry.symptoms.length) {
        return;
      }
      if (startDate && entry.date < startDate) {
        return;
      }
      if (endDate && entry.date > endDate) {
        return;
      }

      severity = normalizeSeverity(entry.severity);
      note = sanitizeValue(entry.note);

      if (!grouped[entry.date]) {
        grouped[entry.date] = {};
      }
      if (!grouped[entry.date][entry.meal]) {
        grouped[entry.date][entry.meal] = [];
      }

      entry.symptoms.forEach(function (rawValue) {
        var normalized = normalizeLabel(rawValue);
        var existing;

        if (!normalized) {
          return;
        }

        existing = grouped[entry.date][entry.meal].find(function (event) {
          return event.label === normalized;
        }) || null;

        if (existing) {
          if (severity > existing.severity) {
            existing.severity = severity;
            existing.note = note || existing.note;
          }
          return;
        }

        grouped[entry.date][entry.meal].push({
          label: normalized,
          severity: severity,
          note: note
        });
      });
    });

    return grouped;
  }

  function collectSymptomsForWindow(events, target, key, label) {
    events.forEach(function (event) {
      var state;

      if (!event || !event.label) {
        return;
      }

      state = target[event.label];
      if (!state) {
        state = {
          sameMeal: false,
          laterDay: false,
          nextDay: false,
          maxSeverity: 0,
          note: "",
          windowLabel: label
        };
        target[event.label] = state;
      }

      state[key] = true;
      if (!state.windowLabel || getWindowPriority(label) < getWindowPriority(state.windowLabel)) {
        state.windowLabel = label;
      }
      if (event.severity >= state.maxSeverity) {
        state.maxSeverity = event.severity;
        state.note = event.note || state.note;
      }
    });
  }

  function collectNextDaySymptoms(symptomGroups, dateKey, target) {
    var nextDate = getNextDate(dateKey);

    if (!symptomGroups[nextDate]) {
      return;
    }

    Object.keys(symptomGroups[nextDate]).forEach(function (nextMealKey) {
      collectSymptomsForWindow(symptomGroups[nextDate][nextMealKey], target, "nextDay", "Al dia siguiente");
    });
  }

  function getWindowPriority(label) {
    if (label === "Misma comida") {
      return 1;
    }
    if (label === "Mas tarde ese dia") {
      return 2;
    }
    return 3;
  }

  function uniqueValues(values) {
    return values.filter(function (value, index) {
      return values.indexOf(value) === index;
    });
  }

  function collectTrackedDates(groups, target) {
    Object.keys(groups).forEach(function (dateKey) {
      target[dateKey] = true;
    });
  }

  function trackedDateCount(trackedDatesMap) {
    return Object.keys(trackedDatesMap).length;
  }

  function ensurePair(food, symptom, pairs, pairList) {
    var key = food + "::" + symptom;

    if (!pairs[key]) {
      pairs[key] = {
        food: food,
        symptom: symptom,
        foodCount: 0,
        sameMealCount: 0,
        laterDayCount: 0,
        nextDayCount: 0,
        followCount: 0,
        followRate: 0,
        baselineRate: 0,
        lift: 0,
        riskDelta: 0,
        averageSeverity: 0,
        totalSeverity: 0,
        confidence: "baja",
        strength: 0,
        examples: []
      };
      pairList.push(pairs[key]);
    }

    return pairs[key];
  }

  function getConfidenceLabel(foodCount, followCount) {
    if (foodCount >= 8 && followCount >= 4) {
      return "alta";
    }

    if (foodCount >= 4 && followCount >= 2) {
      return "media";
    }

    return "baja";
  }

  function addExample(pair, dateKey, mealKey, label, details) {
    var alreadyIncluded = pair.examples.some(function (example) {
      return example.date === dateKey && example.meal === mealKey && example.window === label;
    });

    if (alreadyIncluded || pair.examples.length >= 5) {
      return;
    }

    pair.examples.push({
      date: dateKey,
      meal: mealKey,
      window: label,
      severity: details && details.severity ? details.severity : 0,
      note: details && details.note ? details.note : ""
    });
  }

  function buildDashboardSummary(options) {
    var config = options || {};
    var days = Number(config.days || 56);
    var foodRecords = readArray("food_records");
    var symptomRecords = readArray("symptom_records");
    var correlationReport = buildCorrelationReport({
      meal: "all",
      startDate: getRelativeDate(days),
      endDate: formatDate(new Date()),
      windowPreset: "next-day"
    });

    return {
      suspectedTriggers: correlationReport.pairs.slice(0, 3),
      weeklyTrend: buildWeeklyTrend(foodRecords, symptomRecords, days),
      symptomLeaders: buildTopLabels(symptomRecords, "symptoms", days, 4),
      foodLeaders: buildTopLabels(foodRecords, "items", days, 4)
    };
  }

  function buildWeeklyTrend(foodRecords, symptomRecords, days) {
    var startDate = getRelativeDate(days);
    var buckets = {};

    foodRecords.forEach(function (record) {
      if (!record || !record.date || record.date < startDate) {
        return;
      }

      incrementWeeklyBucket(buckets, record.date, "food", Array.isArray(record.items) ? record.items.length : 0);
    });

    symptomRecords.forEach(function (record) {
      if (!record || !record.date || record.date < startDate) {
        return;
      }

      incrementWeeklyBucket(buckets, record.date, "symptom", Array.isArray(record.symptoms) ? record.symptoms.length : 0);
      incrementWeeklyBucket(buckets, record.date, "severity", normalizeSeverity(record.severity));
    });

    return Object.keys(buckets).sort().map(function (weekKey) {
      return {
        week: weekKey,
        foods: buckets[weekKey].food || 0,
        symptoms: buckets[weekKey].symptom || 0,
        severity: buckets[weekKey].severity || 0
      };
    }).slice(-8);
  }

  function buildTopLabels(records, valueKey, days, limit) {
    var startDate = getRelativeDate(days);
    var scores = {};

    records.forEach(function (record) {
      if (!record || !record.date || record.date < startDate || !Array.isArray(record[valueKey])) {
        return;
      }

      uniqueValues(record[valueKey].map(normalizeLabel).filter(Boolean)).forEach(function (value) {
        scores[value] = (scores[value] || 0) + 1;
      });
    });

    return Object.keys(scores).sort(function (left, right) {
      if (scores[right] !== scores[left]) {
        return scores[right] - scores[left];
      }
      return left.localeCompare(right, "es");
    }).slice(0, limit).map(function (value) {
      return {
        label: value,
        count: scores[value]
      };
    });
  }

  function incrementWeeklyBucket(buckets, dateValue, key, amount) {
    var weekKey = getWeekKey(dateValue);

    if (!weekKey) {
      return;
    }

    if (!buckets[weekKey]) {
      buckets[weekKey] = {
        food: 0,
        symptom: 0,
        severity: 0
      };
    }

    buckets[weekKey][key] = (buckets[weekKey][key] || 0) + amount;
  }

  function getWeekKey(dateValue) {
    var date = parseDateValue(dateValue);
    var day;

    if (!date) {
      return "";
    }

    day = date.getDay() || 7;
    date.setDate(date.getDate() + 4 - day);

    return String(date.getFullYear()) + "-W" + String(getWeekNumber(date)).padStart(2, "0");
  }

  function getWeekNumber(date) {
    var yearStart = new Date(date.getFullYear(), 0, 1);
    return Math.ceil((((date - yearStart) / 86400000) + yearStart.getDay() + 1) / 7);
  }

  function getRelativeDate(days) {
    var date = new Date();

    date.setDate(date.getDate() - Math.max(0, Number(days || 0) - 1));
    return formatDate(date);
  }

  function buildHistoryEntries(options) {
    var config = options || {};
    var query = normalizeLabel(config.query || "");
    var typeFilter = config.type && config.type !== "all" ? config.type : "all";
    var results = [];

    readArray("food_records").forEach(function (record, index) {
      var values = Array.isArray(record && record.items) ? record.items : [];

      if (typeFilter !== "all" && typeFilter !== "food") {
        return;
      }

      pushHistoryResult(results, {
        type: "food",
        date: record && record.date,
        meal: record && record.meal,
        values: values,
        note: "",
        severity: 0,
        href: "edit-item.html?index=" + encodeURIComponent(index),
        query: query
      });
    });

    readArray("symptom_records").forEach(function (record, index) {
      var values = Array.isArray(record && record.symptoms) ? record.symptoms : [];

      if (typeFilter !== "all" && typeFilter !== "symptom") {
        return;
      }

      pushHistoryResult(results, {
        type: "symptom",
        date: record && record.date,
        meal: record && record.meal,
        values: values,
        note: sanitizeValue(record && record.note),
        severity: normalizeSeverity(record && record.severity),
        href: "edit-symptom.html?index=" + encodeURIComponent(index),
        query: query
      });
    });

    return results.sort(function (left, right) {
      if (left.date !== right.date) {
        return right.date.localeCompare(left.date);
      }

      return window.foodTracker.MEAL_ORDER.indexOf(right.meal) - window.foodTracker.MEAL_ORDER.indexOf(left.meal);
    });
  }

  function pushHistoryResult(results, config) {
    var haystack;

    if (!config.date || !config.values.length) {
      return;
    }

    haystack = config.values.join(" ") + " " + (config.note || "");
    if (config.query && normalizeLabel(haystack).indexOf(config.query) === -1) {
      return;
    }

    results.push({
      type: config.type,
      date: config.date,
      meal: config.meal,
      values: config.values.slice(),
      note: config.note,
      severity: config.severity,
      href: config.href
    });
  }

  function buildCsvExport(type) {
    var MEAL_LABELS = window.foodTracker.MEAL_LABELS;

    if (type === "food") {
      var foodRecords = readArray("food_records");
      var rows = [["fecha", "momento", "alimentos"]];

      foodRecords.forEach(function (record) {
        if (!record || typeof record.date !== "string" || !Array.isArray(record.items)) {
          return;
        }
        rows.push([
          record.date,
          MEAL_LABELS[record.meal] || record.meal || "",
          record.items.join(", ")
        ]);
      });

      return { fileName: "comidas.csv", csv: rowsToCsv(rows) };
    }

    if (type === "symptom") {
      var symptomRecords = readArray("symptom_records");
      var rows = [["fecha", "momento", "sintomas", "intensidad", "nota"]];

      symptomRecords.forEach(function (record) {
        if (!record || typeof record.date !== "string" || !Array.isArray(record.symptoms)) {
          return;
        }
        rows.push([
          record.date,
          MEAL_LABELS[record.meal] || record.meal || "",
          record.symptoms.join(", "),
          record.severity != null ? String(record.severity) : "",
          sanitizeValue(record.note)
        ]);
      });

      return { fileName: "sintomas.csv", csv: rowsToCsv(rows) };
    }

    return { fileName: "export.csv", csv: "" };
  }

  function rowsToCsv(rows) {
    return rows.map(function (row) {
      return row.map(function (cell) {
        var value = String(cell == null ? "" : cell);

        if (value.indexOf(",") !== -1 || value.indexOf('"') !== -1 || value.indexOf("\n") !== -1) {
          return '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
      }).join(",");
    }).join("\n");
  }

  function showInfoModal(title, body) {
    var existing = document.querySelector(".info-modal-overlay");

    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    var overlay = document.createElement("div");
    overlay.className = "info-modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    var modal = document.createElement("div");
    modal.className = "info-modal";

    var header = document.createElement("div");
    header.className = "info-modal-header";

    var titleEl = document.createElement("p");
    titleEl.className = "info-modal-title";
    titleEl.textContent = title;

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "info-modal-close";
    closeBtn.setAttribute("aria-label", "Cerrar");
    closeBtn.textContent = "\xd7";

    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    var bodyEl = document.createElement("p");
    bodyEl.className = "info-modal-body";
    bodyEl.textContent = body;

    modal.appendChild(header);
    modal.appendChild(bodyEl);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function closeModal() {
      overlay.classList.add("is-closing");

      function handleAnimEnd(event) {
        if (event.target !== overlay) { return; }
        overlay.removeEventListener("animationend", handleAnimEnd);

        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }

      overlay.addEventListener("animationend", handleAnimEnd);
    }

    closeBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      closeModal();
    });

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) {
        closeModal();
      }
    });

    function handleKey(event) {
      if (event.key === "Escape") {
        document.removeEventListener("keydown", handleKey);
        closeModal();
      }
    }

    document.addEventListener("keydown", handleKey);
  }

  document.addEventListener("click", function (event) {
    var btn = event.target.closest(".info-btn");

    if (!btn) { return; }

    event.stopPropagation();
    showInfoModal(
      btn.getAttribute("data-info-title") || "",
      btn.getAttribute("data-info-body") || ""
    );
  });
}());
