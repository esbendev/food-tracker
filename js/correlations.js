(function () {
  var app = window.foodTracker;
  var rangeFilter = document.getElementById("rangeFilter");
  var mealFilter = document.getElementById("mealFilter");
  var minCountFilter = document.getElementById("minCountFilter");
  var summaryGrid = document.getElementById("summaryGrid");
  var matrixWrap = document.getElementById("matrixWrap");
  var matrixCount = document.getElementById("matrixCount");
  var detailPanel = document.getElementById("detailPanel");
  var detailBadge = document.getElementById("detailBadge");
  var selectedPairKey = "";
  var currentPairs = [];

  if (!rangeFilter || !mealFilter || !minCountFilter) {
    return;
  }

  rangeFilter.addEventListener("change", render);
  mealFilter.addEventListener("change", render);
  minCountFilter.addEventListener("change", render);
  window.addEventListener("storage", render);

  render();

  function render() {
    var report = app.buildCorrelationReport(getFilters());
    var minCount = Number(minCountFilter.value || 1);

    currentPairs = report.pairs.filter(function (pair) {
      return pair.foodCount >= minCount && pair.followCount > 0;
    });

    if (!currentPairs.length) {
      selectedPairKey = "";
    } else if (!findPairByKey(selectedPairKey, currentPairs)) {
      selectedPairKey = getPairKey(currentPairs[0]);
    }

    renderSummary(report, currentPairs);
    renderMatrix(currentPairs);
    renderDetail(findPairByKey(selectedPairKey, currentPairs));
  }

  function getFilters() {
    var today = app.formatDate(new Date());
    var rangeValue = rangeFilter.value;
    var startDate = "";

    if (rangeValue !== "all") {
      var days = Number(rangeValue);
      var start = new Date();

      start.setDate(start.getDate() - (days - 1));
      startDate = app.formatDate(start);
    }

    return {
      meal: mealFilter.value,
      startDate: startDate,
      endDate: today
    };
  }

  function renderSummary(report, pairs) {
    var topPair = pairs[0] || null;
    var cards = [
      { value: report.trackedDates, label: report.trackedDates === 1 ? "dia analizado" : "dias analizados" },
      { value: report.foodsTracked, label: report.foodsTracked === 1 ? "comida normalizada" : "comidas normalizadas" },
      { value: topPair ? topPair.food + " -> " + topPair.symptom : "-", label: "correlacion mas fuerte" }
    ];

    summaryGrid.innerHTML = "";
    cards.forEach(function (card) {
      var element = document.createElement("div");
      var strong = document.createElement("strong");
      var span = document.createElement("span");

      element.className = "summary-pill";
      strong.textContent = card.value;
      span.textContent = card.label;
      element.appendChild(strong);
      element.appendChild(span);
      summaryGrid.appendChild(element);
    });

    matrixCount.textContent = pairs.length ? pairs.length + (pairs.length === 1 ? " relacion" : " relaciones") : "Sin relaciones";
  }

  function renderMatrix(pairs) {
    var foods = getTopValues(pairs, "food", 12);
    var symptoms = getTopValues(pairs, "symptom", 8);
    var table = document.createElement("table");
    var thead = document.createElement("thead");
    var headerRow = document.createElement("tr");
    var corner = document.createElement("th");
    var tbody = document.createElement("tbody");

    matrixWrap.innerHTML = "";

    if (!pairs.length || !foods.length || !symptoms.length) {
      matrixWrap.innerHTML = '<div class="empty-panel">Todavia no hay suficientes datos para mostrar correlaciones con estos filtros.</div>';
      return;
    }

    table.className = "correlation-matrix";
    corner.className = "row-label";
    corner.textContent = "Comida / Sintoma";
    headerRow.appendChild(corner);

    symptoms.forEach(function (symptom) {
      var th = document.createElement("th");
      th.textContent = symptom;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    foods.forEach(function (food) {
      var row = document.createElement("tr");
      var label = document.createElement("th");

      label.className = "row-label";
      label.textContent = food;
      row.appendChild(label);

      symptoms.forEach(function (symptom) {
        var cell = document.createElement("td");
        var pair = findPair(food, symptom, pairs);
        var button = document.createElement("button");
        var isSelected = pair && getPairKey(pair) === selectedPairKey;

        button.type = "button";
        button.className = "cell-button" + (pair ? "" : " is-empty") + (isSelected ? " is-selected" : "");

        if (!pair) {
          button.disabled = true;
          button.innerHTML = '<span class="cell-rate">-</span><span class="cell-meta">sin datos</span>';
        } else {
          button.style.setProperty("--heat", String(getHeat(pair.lift)));
          button.innerHTML = '<span class="cell-rate">' + formatPercent(pair.followRate) + '</span>' +
            '<span class="cell-meta">' + pair.followCount + '/' + pair.foodCount + ' · lift ' + formatLift(pair.lift) + '</span>';
          button.addEventListener("click", function () {
            selectedPairKey = getPairKey(pair);
            renderMatrix(currentPairs);
            renderDetail(pair);
          });
        }

        cell.appendChild(button);
        row.appendChild(cell);
      });

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    matrixWrap.appendChild(table);
  }

  function renderDetail(pair) {
    detailPanel.innerHTML = "";

    if (!pair) {
      detailBadge.textContent = "";
      detailPanel.innerHTML = '<div class="empty-panel">Selecciona una celda del mapa para ver ejemplos y metricas.</div>';
      return;
    }

    detailBadge.textContent = pair.food + " -> " + pair.symptom;

    var intro = document.createElement("p");
    var metrics = document.createElement("div");
    var examplesTitle = document.createElement("p");
    var examples = document.createElement("ul");

    intro.className = "detail-copy";
    intro.textContent = "Esta relacion mide cuantas veces el sintoma aparecio despues de registrar esa comida en la ventana elegida por la app.";
    detailPanel.appendChild(intro);

    metrics.className = "metric-grid";
    buildMetricCard(metrics, pair.foodCount, pair.foodCount === 1 ? "vez que se registro la comida" : "veces que se registro la comida");
    buildMetricCard(metrics, formatPercent(pair.followRate), "apariciones con sintoma despues");
    buildMetricCard(metrics, formatLift(pair.lift), "lift frente a la linea base");
    buildMetricCard(metrics, pair.sameMealCount, "misma comida");
    buildMetricCard(metrics, pair.laterDayCount, "mas tarde ese dia");
    buildMetricCard(metrics, pair.nextDayCount, "al dia siguiente");
    detailPanel.appendChild(metrics);

    examplesTitle.className = "section-title";
    examplesTitle.textContent = "Ejemplos";
    detailPanel.appendChild(examplesTitle);

    examples.className = "example-list";
    pair.examples.forEach(function (example) {
      var item = document.createElement("li");
      item.textContent = app.prettyDate(example.date) + " · " + (app.MEAL_LABELS[example.meal] || example.meal) + " · " + example.window;
      examples.appendChild(item);
    });

    detailPanel.appendChild(examples);
  }

  function buildMetricCard(container, value, label) {
    var card = document.createElement("div");
    var strong = document.createElement("strong");
    var span = document.createElement("span");

    card.className = "metric-card";
    strong.textContent = value;
    span.textContent = label;
    card.appendChild(strong);
    card.appendChild(span);
    container.appendChild(card);
  }

  function getTopValues(pairs, key, limit) {
    var scores = {};

    pairs.forEach(function (pair) {
      scores[pair[key]] = (scores[pair[key]] || 0) + pair.strength;
    });

    return Object.keys(scores).sort(function (left, right) {
      if (scores[right] !== scores[left]) {
        return scores[right] - scores[left];
      }
      return left.localeCompare(right, "es");
    }).slice(0, limit);
  }

  function getPairKey(pair) {
    return pair ? pair.food + "::" + pair.symptom : "";
  }

  function findPair(food, symptom, pairs) {
    return pairs.find(function (pair) {
      return pair.food === food && pair.symptom === symptom;
    }) || null;
  }

  function findPairByKey(key, pairs) {
    return pairs.find(function (pair) {
      return getPairKey(pair) === key;
    }) || null;
  }

  function formatPercent(value) {
    return Math.round(value * 100) + "%";
  }

  function formatLift(value) {
    return value ? value.toFixed(1) + "x" : "0x";
  }

  function getHeat(lift) {
    return Math.max(0.08, Math.min(0.5, lift / 6));
  }
}());