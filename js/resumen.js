(function () {
  var app = window.foodTracker;
  var summaryInsightsPanel = document.getElementById("summaryInsightsPanel");
  var summaryStatus = document.getElementById("summaryStatus");

  if (!summaryInsightsPanel || !summaryStatus) {
    return;
  }

  window.addEventListener("storage", renderSummary);
  renderSummary();

  function renderSummary() {
    var summary = app.buildDashboardSummary({ days: 56 });

    summaryInsightsPanel.innerHTML = "";
    summaryInsightsPanel.appendChild(buildTriggersBlock(summary.suspectedTriggers));
    summaryInsightsPanel.appendChild(buildTrendBlock(summary.weeklyTrend));
    summaryInsightsPanel.appendChild(buildLeaderBlock(summary));
    summaryStatus.textContent = buildStatusLabel(summary);
  }

  function buildStatusLabel(summary) {
    if (!summary.suspectedTriggers.length && !summary.weeklyTrend.length) {
      return "Sin datos suficientes";
    }

    return summary.suspectedTriggers.length
      ? summary.suspectedTriggers.length + (summary.suspectedTriggers.length === 1 ? " sospecha fuerte" : " sospechas fuertes")
      : "Resumen actualizado";
  }

  function buildTriggersBlock(triggers) {
    var section = document.createElement("section");
    var heading = document.createElement("div");
    var title = document.createElement("p");
    var note = document.createElement("p");
    var list = document.createElement("div");

    section.className = "home-insight-block";
    heading.className = "timeline-header";
    title.className = "section-title compact-title";
    title.textContent = "Sospechas";
    note.className = "insight-note";
    note.textContent = "Las combinaciones que mas se repiten en las ultimas 8 semanas.";
    list.className = "trigger-list";

    heading.appendChild(title);
    heading.appendChild(note);
    section.appendChild(heading);

    if (!triggers.length) {
      list.innerHTML = '<div class="empty-panel compact-empty">Necesitas mas dias registrados para empezar a ver sospechas utiles.</div>';
      section.appendChild(list);
      return section;
    }

    triggers.forEach(function (pair) {
      var link = document.createElement("a");
      var strong = document.createElement("strong");
      var span = document.createElement("span");

      link.className = "trigger-card";
      link.href = "correlations.html";
      strong.textContent = pair.food + " -> " + pair.symptom;
      span.textContent = formatPercent(pair.followRate) + " despues · conf " + pair.confidence + ' · delta ' + formatSignedPercent(pair.riskDelta);
      link.appendChild(strong);
      link.appendChild(span);
      list.appendChild(link);
    });

    section.appendChild(list);
    return section;
  }

  function buildTrendBlock(weeklyTrend) {
    var section = document.createElement("section");
    var title = document.createElement("p");
    var chart = document.createElement("div");
    var maxFood = 0;
    var maxSymptom = 0;

    section.className = "home-insight-block";
    title.className = "section-title compact-title";
    title.textContent = "Tendencias";
    chart.className = "trend-chart";

    weeklyTrend.forEach(function (week) {
      maxFood = Math.max(maxFood, week.foods);
      maxSymptom = Math.max(maxSymptom, week.symptoms);
    });

    if (!weeklyTrend.length) {
      chart.innerHTML = '<div class="empty-panel compact-empty">Todavia no hay suficientes semanas para mostrar tendencia.</div>';
    } else {
      weeklyTrend.forEach(function (week) {
        var item = document.createElement("div");
        var bars = document.createElement("div");
        var foodBar = document.createElement("span");
        var symptomBar = document.createElement("span");
        var label = document.createElement("span");

        item.className = "trend-column";
        bars.className = "trend-bars";
        foodBar.className = "trend-bar food";
        symptomBar.className = "trend-bar symptom";
        label.className = "trend-label";

        foodBar.style.height = getTrendHeight(week.foods, maxFood);
        symptomBar.style.height = getTrendHeight(week.symptoms, maxSymptom);
        foodBar.title = week.week + ' · comidas ' + week.foods;
        symptomBar.title = week.week + ' · sintomas ' + week.symptoms;
        label.textContent = week.week.slice(-2);

        bars.appendChild(foodBar);
        bars.appendChild(symptomBar);
        item.appendChild(bars);
        item.appendChild(label);
        chart.appendChild(item);
      });
    }

    section.appendChild(title);
    section.appendChild(chart);
    return section;
  }

  function buildLeaderBlock(summary) {
    var section = document.createElement("section");
    var title = document.createElement("p");
    var grid = document.createElement("div");

    section.className = "home-insight-block";
    title.className = "section-title compact-title";
    title.textContent = "Lo mas repetido";
    grid.className = "leader-grid";

    grid.appendChild(buildLeaderList("Comidas", summary.foodLeaders));
    grid.appendChild(buildLeaderList("Sintomas", summary.symptomLeaders));

    section.appendChild(title);
    section.appendChild(grid);
    return section;
  }

  function buildLeaderList(titleText, entries) {
    var block = document.createElement("div");
    var title = document.createElement("strong");
    var list = document.createElement("ul");

    block.className = "leader-card";
    title.textContent = titleText;
    list.className = "leader-list";

    if (!entries.length) {
      var empty = document.createElement("p");

      empty.className = "insight-note";
      empty.textContent = "Sin datos suficientes.";
      block.appendChild(title);
      block.appendChild(empty);
      return block;
    }

    entries.forEach(function (entry) {
      var item = document.createElement("li");
      item.textContent = entry.label + ' · ' + entry.count;
      list.appendChild(item);
    });

    block.appendChild(title);
    block.appendChild(list);
    return block;
  }

  function getTrendHeight(value, maxValue) {
    var ratio = maxValue ? value / maxValue : 0;
    return Math.max(8, Math.round(ratio * 72)) + "px";
  }

  function formatPercent(value) {
    return Math.round(value * 100) + "%";
  }

  function formatSignedPercent(value) {
    var percent = Math.round(value * 100);
    return (percent > 0 ? "+" : "") + percent + "%";
  }
}());
