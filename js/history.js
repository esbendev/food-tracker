(function () {
  var app = window.foodTracker;
  var searchInput = document.getElementById("historySearchInput");
  var typeFilter = document.getElementById("historyTypeFilter");
  var mealFilter = document.getElementById("historyMealFilter");
  var historyCount = document.getElementById("historyCount");
  var historyResults = document.getElementById("historyResults");

  if (!searchInput || !typeFilter || !mealFilter || !historyResults) {
    return;
  }

  searchInput.addEventListener("input", render);
  typeFilter.addEventListener("change", render);
  mealFilter.addEventListener("change", render);
  window.addEventListener("storage", render);

  render();

  function render() {
    var entries = app.buildHistoryEntries({
      query: searchInput.value,
      type: typeFilter.value
    }).filter(function (entry) {
      return mealFilter.value === "all" || entry.meal === mealFilter.value;
    });
    var currentGroup = "";
    var group = null;

    historyResults.innerHTML = "";
    historyCount.textContent = entries.length
      ? entries.length + (entries.length === 1 ? " resultado" : " resultados")
      : "Sin resultados";

    if (!entries.length) {
      historyResults.innerHTML = '<div class="empty-panel">No hubo coincidencias con esos filtros.</div>';
      return;
    }

    entries.forEach(function (entry) {
      if (entry.date !== currentGroup) {
        currentGroup = entry.date;
        group = createDateGroup(entry.date);
        historyResults.appendChild(group.container);
      }

      group.list.appendChild(createEntryCard(entry));
    });
  }

  function createDateGroup(dateValue) {
    var container = document.createElement("section");
    var heading = document.createElement("p");
    var list = document.createElement("div");

    container.className = "history-group";
    heading.className = "history-date";
    list.className = "history-group-list";
    heading.textContent = app.prettyDate(dateValue);

    container.appendChild(heading);
    container.appendChild(list);

    return {
      container: container,
      list: list
    };
  }

  function createEntryCard(entry) {
    var card = document.createElement("a");
    var topLine = document.createElement("div");
    var typeLabel = document.createElement("span");
    var mealLabel = document.createElement("span");
    var metaLine = document.createElement("div");
    var list = document.createElement("ul");

    card.className = "timeline-entry " + entry.type;
    card.href = entry.href + "&viewDate=" + encodeURIComponent(entry.date);
    topLine.className = "timeline-topline";
    typeLabel.className = "entry-type";
    mealLabel.className = "entry-meal";
    metaLine.className = "timeline-meta";
    list.className = "entry-items";

    typeLabel.textContent = entry.type === "food" ? "Comida" : "Sintoma";
    mealLabel.textContent = app.MEAL_LABELS[entry.meal] || entry.meal;

    topLine.appendChild(typeLabel);
    topLine.appendChild(mealLabel);

    if (entry.type === "symptom") {
      var severityBadge = document.createElement("span");

      severityBadge.className = "entry-severity";
      severityBadge.textContent = "Intensidad " + entry.severity + "/5";
      metaLine.appendChild(severityBadge);
    }

    if (entry.note) {
      var note = document.createElement("p");

      note.className = "entry-note";
      note.textContent = entry.note;
      metaLine.appendChild(note);
    }

    entry.values.forEach(function (value) {
      var item = document.createElement("li");
      item.textContent = value;
      list.appendChild(item);
    });

    card.appendChild(topLine);
    if (metaLine.childNodes.length) {
      card.appendChild(metaLine);
    }
    card.appendChild(list);

    return card;
  }
}());
