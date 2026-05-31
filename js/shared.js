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
    sanitizeValue: sanitizeValue,
    normalizeLabel: normalizeLabel,
    getSelectedMeal: getSelectedMeal,
    createSuggestionInput: createSuggestionInput,
    focusLastInput: focusLastInput,
    bindMealFocus: bindMealFocus,
    getNextDate: getNextDate,
    buildCorrelationReport: buildCorrelationReport
  };

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
          if (event) {
            if (event.type === "click" && skipClick) {
              skipClick = false;
              event.preventDefault();
              return;
            }

            skipClick = event.type === "pointerdown";
            event.preventDefault();
          }
          input.value = match;
          suggestions.innerHTML = "";
          suggestions.classList.remove("visible");

          if (typeof options.onSelect === "function") {
            options.onSelect(match, input);
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

  function buildCorrelationReport(options) {
    var config = options || {};
    var mealFilter = config.meal && config.meal !== "all" ? config.meal : null;
    var startDate = config.startDate || "";
    var endDate = config.endDate || "";
    var foodRecords = readArray("food_records");
    var symptomRecords = readArray("symptom_records");
    var foodGroups = groupRecords(foodRecords, "items", mealFilter, startDate, endDate);
    var symptomGroups = groupRecords(symptomRecords, "symptoms", null, startDate, endDate);
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
          if (!symptomDateMap[symptom]) {
            symptomDateMap[symptom] = {};
          }
          symptomDateMap[symptom][dateKey] = true;
        });
      });
    });

    Object.keys(foodGroups).forEach(function (dateKey) {
      window.foodTracker.MEAL_ORDER.forEach(function (mealKey, mealIndex) {
        var foodsAtMeal = (foodGroups[dateKey] && foodGroups[dateKey][mealKey]) || [];
        var sameMealSymptoms = uniqueValues((symptomGroups[dateKey] && symptomGroups[dateKey][mealKey]) || []);
        var laterDaySymptoms = [];
        var nextDaySymptoms = [];
        var nextDate = getNextDate(dateKey);

        if (!foodsAtMeal.length) {
          return;
        }

        window.foodTracker.MEAL_ORDER.slice(mealIndex + 1).forEach(function (laterMealKey) {
          laterDaySymptoms = laterDaySymptoms.concat((symptomGroups[dateKey] && symptomGroups[dateKey][laterMealKey]) || []);
        });

        if (symptomGroups[nextDate]) {
          Object.keys(symptomGroups[nextDate]).forEach(function (nextMealKey) {
            nextDaySymptoms = nextDaySymptoms.concat(symptomGroups[nextDate][nextMealKey]);
          });
        }

        laterDaySymptoms = uniqueValues(laterDaySymptoms);
        nextDaySymptoms = uniqueValues(nextDaySymptoms);

        foodsAtMeal.forEach(function (food) {
          foodCounts[food] = (foodCounts[food] || 0) + 1;

          var seenSymptoms = {};

          sameMealSymptoms.forEach(function (symptom) {
            var pair = ensurePair(food, symptom, pairs, pairList);
            pair.sameMealCount += 1;
            seenSymptoms[symptom] = seenSymptoms[symptom] || "sameMeal";
            addExample(pair, dateKey, mealKey, "Misma comida");
          });

          laterDaySymptoms.forEach(function (symptom) {
            var pair = ensurePair(food, symptom, pairs, pairList);
            pair.laterDayCount += 1;
            if (!seenSymptoms[symptom]) {
              seenSymptoms[symptom] = "laterDay";
              addExample(pair, dateKey, mealKey, "Mas tarde ese dia");
            }
          });

          nextDaySymptoms.forEach(function (symptom) {
            var pair = ensurePair(food, symptom, pairs, pairList);
            pair.nextDayCount += 1;
            if (!seenSymptoms[symptom]) {
              seenSymptoms[symptom] = "nextDay";
              addExample(pair, dateKey, mealKey, "Al dia siguiente");
            }
          });

          Object.keys(seenSymptoms).forEach(function (symptom) {
            ensurePair(food, symptom, pairs, pairList).followCount += 1;
          });
        });
      });
    });

    pairList.forEach(function (pair) {
      var symptomDates = symptomDateMap[pair.symptom] || {};
      var symptomDateCount = Object.keys(symptomDates).length;
      pair.foodCount = foodCounts[pair.food] || 0;
      pair.followRate = pair.foodCount ? pair.followCount / pair.foodCount : 0;
      pair.baselineRate = trackedDateCount(trackedDatesMap) ? symptomDateCount / trackedDateCount(trackedDatesMap) : 0;
      pair.lift = pair.baselineRate ? pair.followRate / pair.baselineRate : 0;
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

    return {
      trackedDates: trackedDateCount(trackedDatesMap),
      foodsTracked: Object.keys(foodCounts).length,
      symptomsTracked: Object.keys(symptomDateMap).length,
      pairs: pairList
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
        strength: 0,
        examples: []
      };
      pairList.push(pairs[key]);
    }

    return pairs[key];
  }

  function addExample(pair, dateKey, mealKey, label) {
    var alreadyIncluded = pair.examples.some(function (example) {
      return example.date === dateKey && example.meal === mealKey && example.window === label;
    });

    if (alreadyIncluded || pair.examples.length >= 5) {
      return;
    }

    pair.examples.push({
      date: dateKey,
      meal: mealKey,
      window: label
    });
  }
}());
