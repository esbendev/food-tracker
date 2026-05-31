(function () {
  var app = window.foodTracker;
  var FOOD_KEY = "food_records";
  var SYMPTOM_KEY = "symptom_records";
  var selectedDateLabel = document.getElementById("selectedDateLabel");
  var monthLabel = document.getElementById("monthLabel");
  var calendarGrid = document.getElementById("calendarGrid");
  var timelineList = document.getElementById("timelineList");
  var timelineCount = document.getElementById("timelineCount");
  var newFoodLink = document.getElementById("newFoodLink");
  var newSymptomLink = document.getElementById("newSymptomLink");
  var selectedDate = app.getViewDateParam() || app.formatDate(new Date());
  var visibleMonth = new Date();

  visibleMonth.setDate(1);

  document.getElementById("prevMonthBtn").addEventListener("click", function () {
    visibleMonth.setMonth(visibleMonth.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById("nextMonthBtn").addEventListener("click", function () {
    visibleMonth.setMonth(visibleMonth.getMonth() + 1);
    renderCalendar();
  });

  window.addEventListener("storage", function () {
    renderCalendar();
    renderTimeline();
  });

  renderCalendar();
  renderTimeline();
  refreshActions();

  function getEntriesForDate(dateValue) {
    var foodEntries = app.readArray(FOOD_KEY)
      .map(function (entry, index) {
        return {
          entry: entry,
          index: index
        };
      })
      .filter(function (record) {
        var entry = record.entry;
        return entry && entry.date === dateValue && Array.isArray(entry.items) && entry.items.length;
      })
      .map(function (record) {
        var entry = record.entry;
        return {
          type: "food",
          meal: entry.meal,
          values: entry.items,
          recordIndex: record.index
        };
      });

    var symptomEntries = app.readArray(SYMPTOM_KEY)
      .map(function (entry, index) {
        return {
          entry: entry,
          index: index
        };
      })
      .filter(function (record) {
        var entry = record.entry;
        return entry && entry.date === dateValue && Array.isArray(entry.symptoms) && entry.symptoms.length;
      })
      .map(function (record) {
        var entry = record.entry;
        return {
          type: "symptom",
          meal: entry.meal,
          values: entry.symptoms,
          recordIndex: record.index
        };
      });

    return foodEntries.concat(symptomEntries).sort(function (left, right) {
      var mealDifference = app.MEAL_ORDER.indexOf(left.meal) - app.MEAL_ORDER.indexOf(right.meal);
      if (mealDifference !== 0) {
        return mealDifference;
      }
      if (left.type === right.type) {
        return 0;
      }
      return left.type === "food" ? -1 : 1;
    });
  }

  function getMonthMarkers() {
    var markers = {};

    app.readArray(FOOD_KEY).forEach(function (entry) {
      if (!entry || typeof entry.date !== "string") {
        return;
      }
      ensureMarker(entry.date, markers);
      if (Array.isArray(entry.items) && entry.items.length) {
        markers[entry.date].food = true;
      }
    });

    app.readArray(SYMPTOM_KEY).forEach(function (entry) {
      if (!entry || typeof entry.date !== "string") {
        return;
      }
      ensureMarker(entry.date, markers);
      if (Array.isArray(entry.symptoms) && entry.symptoms.length) {
        markers[entry.date].symptom = true;
      }
    });

    return markers;
  }

  function renderCalendar() {
    var markers = getMonthMarkers();
    var firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    var gridStart = new Date(firstDay);

    gridStart.setDate(firstDay.getDate() - firstDay.getDay());
    calendarGrid.innerHTML = "";
    monthLabel.textContent = visibleMonth.toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric"
    });

    for (var i = 0; i < 42; i += 1) {
      var current = new Date(gridStart);
      current.setDate(gridStart.getDate() + i);
      var isoDate = app.formatDate(current);
      var state = markers[isoDate] || { food: false, symptom: false };
      var button = document.createElement("button");

      button.type = "button";
      button.className = "day-button";
      if (current.getMonth() !== visibleMonth.getMonth()) {
        button.classList.add("outside-month");
      }
      if (isoDate === selectedDate) {
        button.classList.add("selected");
      }
      if (isoDate === app.formatDate(new Date())) {
        button.classList.add("today");
      }
      button.setAttribute("aria-label", current.toLocaleDateString("es-ES", {
        weekday: "long",
        month: "long",
        day: "numeric"
      }));
      button.innerHTML = '<span class="day-number">' + current.getDate() + '</span>' +
        '<span class="day-markers">' +
          (state.food ? '<span class="marker food" aria-hidden="true"></span>' : "") +
          (state.symptom ? '<span class="marker symptom" aria-hidden="true"></span>' : "") +
        '</span>';
      button.addEventListener("click", createDateSelectionHandler(isoDate, current));
      calendarGrid.appendChild(button);
    }
  }

  function createDateSelectionHandler(isoDate, dateObject) {
    return function () {
      selectedDate = isoDate;
      visibleMonth = new Date(dateObject.getFullYear(), dateObject.getMonth(), 1);
      refreshActions();
      renderCalendar();
      renderTimeline();
    };
  }

  function renderTimeline() {
    var entries = getEntriesForDate(selectedDate);

    selectedDateLabel.textContent = app.prettyDate(selectedDate);
    timelineCount.textContent = entries.length ? entries.length + (entries.length === 1 ? " registro" : " registros") : "Sin registros";
    timelineList.innerHTML = "";

    if (!entries.length) {
      var emptyState = document.createElement("div");
      emptyState.className = "timeline-empty";
      emptyState.textContent = "Todavia no hay comidas ni sintomas registrados para este dia.";
      timelineList.appendChild(emptyState);
      return;
    }

    entries.forEach(function (entry) {
      var card = document.createElement("a");
      var topLine = document.createElement("div");
      var typeLabel = document.createElement("span");
      var mealLabel = document.createElement("span");
      var list = document.createElement("ul");
      var cardLabel = entry.type === "food" ? "Editar comida" : "Editar sintoma";

      card.className = "timeline-entry " + entry.type;
      card.href = buildEditHref(entry);
      card.setAttribute("aria-label", cardLabel + " de " + (app.MEAL_LABELS[entry.meal] || entry.meal));
      topLine.className = "timeline-topline";
      typeLabel.className = "entry-type";
      mealLabel.className = "entry-meal";
      list.className = "entry-items";

      typeLabel.textContent = entry.type === "food" ? "Comida" : "Sintoma";
      mealLabel.textContent = app.MEAL_LABELS[entry.meal] || entry.meal;

      topLine.appendChild(typeLabel);
      topLine.appendChild(mealLabel);

      entry.values.forEach(function (value) {
        var item = document.createElement("li");
        item.textContent = value;
        list.appendChild(item);
      });

      card.appendChild(topLine);
      card.appendChild(list);
      timelineList.appendChild(card);
    });
  }

  function refreshActions() {
    newFoodLink.href = "add-item.html?date=" + encodeURIComponent(selectedDate);
    newSymptomLink.href = "add-symptom.html?date=" + encodeURIComponent(selectedDate);
  }

  function buildEditHref(entry) {
    var page = entry.type === "food" ? "edit-item.html" : "edit-symptom.html";

    return page + "?index=" + encodeURIComponent(entry.recordIndex) +
      "&viewDate=" + encodeURIComponent(selectedDate);
  }

  function ensureMarker(dateKey, markers) {
    if (!markers[dateKey]) {
      markers[dateKey] = { food: false, symptom: false };
    }
  }
}());
