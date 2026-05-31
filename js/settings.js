(function () {
  var APP_NAME = "food-tracker";
  var EXPORT_VERSION = 1;
  var FOOD_RECORDS_KEY = "food_records";
  var SYMPTOM_RECORDS_KEY = "symptom_records";
  var FOOD_HISTORY_KEY = "global_food_history";
  var SYMPTOM_HISTORY_KEY = "global_symptom_history";
  var MANAGED_KEYS = [
    FOOD_RECORDS_KEY,
    SYMPTOM_RECORDS_KEY,
    FOOD_HISTORY_KEY,
    SYMPTOM_HISTORY_KEY
  ];
  var STORAGE_KEYS = [
    FOOD_RECORDS_KEY,
    SYMPTOM_RECORDS_KEY,
    FOOD_HISTORY_KEY,
    SYMPTOM_HISTORY_KEY
  ];
  var DATASET_LABELS = {};
  DATASET_LABELS[FOOD_RECORDS_KEY] = "comidas";
  DATASET_LABELS[SYMPTOM_RECORDS_KEY] = "sintomas";
  DATASET_LABELS[FOOD_HISTORY_KEY] = "sugerencias-comidas";
  DATASET_LABELS[SYMPTOM_HISTORY_KEY] = "sugerencias-sintomas";
  var clearFoodSuggestionsButton = document.getElementById("clearFoodSuggestionsBtn");
  var clearSymptomSuggestionsButton = document.getElementById("clearSymptomSuggestionsBtn");
  var clearStorageButton = document.getElementById("clearStorageBtn");
  var exportAllButton = document.getElementById("exportAllBtn");
  var exportCorrelationsButton = document.getElementById("exportCorrelationsBtn");
  var exportFoodRecordsButton = document.getElementById("exportFoodRecordsBtn");
  var exportSymptomRecordsButton = document.getElementById("exportSymptomRecordsBtn");
  var exportFoodSuggestionsButton = document.getElementById("exportFoodSuggestionsBtn");
  var exportSymptomSuggestionsButton = document.getElementById("exportSymptomSuggestionsBtn");
  var importDataButton = document.getElementById("importDataBtn");
  var importFileInput = document.getElementById("importFileInput");
  var settingsStatsGrid = document.getElementById("settingsStatsGrid");
  var storageUsageLabel = document.getElementById("storageUsageLabel");
  var settingsVersion = document.getElementById("settingsVersion");
  var settingsFeedback = document.getElementById("settingsFeedback");

  if (!clearFoodSuggestionsButton && !clearSymptomSuggestionsButton && !clearStorageButton) {
    return;
  }

  loadVersion();
  renderStorageSummary();
  bindExportActions();
  bindImportAction();

  bindClearAction(clearFoodSuggestionsButton, {
    message: "Seguro que queres borrar las sugerencias de comidas? Se van a eliminar todas las sugerencias guardadas para autocompletar comidas.",
    onConfirm: function () {
      window.localStorage.removeItem(FOOD_HISTORY_KEY);
    },
    successMessage: "Se borraron las sugerencias de comidas."
  });

  bindClearAction(clearSymptomSuggestionsButton, {
    message: "Seguro que queres borrar las sugerencias de sintomas? Se van a eliminar todas las sugerencias guardadas para autocompletar sintomas.",
    onConfirm: function () {
      window.localStorage.removeItem(SYMPTOM_HISTORY_KEY);
    },
    successMessage: "Se borraron las sugerencias de sintomas."
  });

  bindClearAction(clearStorageButton, {
    message: "Seguro que queres borrar todo? Se van a eliminar todas las comidas, sintomas y datos guardados.",
    onConfirm: function () {
      STORAGE_KEYS.forEach(function (key) {
        window.localStorage.removeItem(key);
      });
    },
    successMessage: "Se borraron todos los datos guardados."
  });

  function bindClearAction(button, options) {
    if (!button) {
      return;
    }

    button.addEventListener("click", function () {
      var confirmed = window.confirm(options.message);

      if (!confirmed) {
        return;
      }

      options.onConfirm();
      renderStorageSummary();
      window.alert(options.successMessage);
    });
  }

  function renderStorageSummary() {
    if (!settingsStatsGrid || !storageUsageLabel) {
      return;
    }

    var foodRecords = readArray(FOOD_RECORDS_KEY);
    var symptomRecords = readArray(SYMPTOM_RECORDS_KEY);
    var foodSuggestions = readStringArray(FOOD_HISTORY_KEY);
    var symptomSuggestions = readStringArray(SYMPTOM_HISTORY_KEY);
    var storageBytes = getLocalStorageBytes();
    var stats = [
      {
        label: "Registros de comidas",
        value: foodRecords.length
      },
      {
        label: "Items de comida",
        value: countRecordValues(foodRecords, "items")
      },
      {
        label: "Registros de sintomas",
        value: symptomRecords.length
      },
      {
        label: "Sintomas anotados",
        value: countRecordValues(symptomRecords, "symptoms")
      },
      {
        label: "Sugerencias de comidas",
        value: foodSuggestions.length
      },
      {
        label: "Sugerencias de sintomas",
        value: symptomSuggestions.length
      },
      {
        label: "Dias con datos",
        value: countTrackedDays(foodRecords, symptomRecords)
      },
      {
        label: "Claves guardadas",
        value: window.localStorage.length
      }
    ];

    settingsStatsGrid.innerHTML = "";

    stats.forEach(function (stat) {
      var article = document.createElement("article");
      var strong = document.createElement("strong");
      var span = document.createElement("span");

      article.className = "settings-stat-card";
      strong.textContent = String(stat.value);
      span.textContent = stat.label;

      article.appendChild(strong);
      article.appendChild(span);
      settingsStatsGrid.appendChild(article);
    });

    storageUsageLabel.textContent = "Espacio usado: " + formatBytes(storageBytes);
  }

  function readArray(key) {
    if (window.foodTracker && typeof window.foodTracker.readArray === "function") {
      return window.foodTracker.readArray(key);
    }

    try {
      var raw = window.localStorage.getItem(key);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function bindExportActions() {
    bindExportAction(exportAllButton, function () {
      return {
        fileName: buildFileName("backup"),
        payload: {
          app: APP_NAME,
          exportVersion: EXPORT_VERSION,
          exportType: "all",
          exportedAt: new Date().toISOString(),
          datasets: buildManagedDatasetMap()
        },
        successMessage: "Backup completo exportado."
      };
    });

    bindExportAction(exportCorrelationsButton, function () {
      var report = buildCorrelationExport();

      return {
        fileName: buildFileName("correlations"),
        payload: report,
        successMessage: "Reporte de correlaciones exportado."
      };
    });

    bindExportAction(exportFoodRecordsButton, function () {
      return buildDatasetExport(FOOD_RECORDS_KEY);
    });

    bindExportAction(exportSymptomRecordsButton, function () {
      return buildDatasetExport(SYMPTOM_RECORDS_KEY);
    });

    bindExportAction(exportFoodSuggestionsButton, function () {
      return buildDatasetExport(FOOD_HISTORY_KEY);
    });

    bindExportAction(exportSymptomSuggestionsButton, function () {
      return buildDatasetExport(SYMPTOM_HISTORY_KEY);
    });
  }

  function bindExportAction(button, buildExport) {
    if (!button) {
      return;
    }

    button.addEventListener("click", function () {
      var exportConfig = buildExport();

      downloadJson(exportConfig.fileName, exportConfig.payload);
      setFeedback(exportConfig.successMessage, false);
    });
  }

  function bindImportAction() {
    if (!importDataButton || !importFileInput) {
      return;
    }

    importDataButton.addEventListener("click", function () {
      importFileInput.value = "";
      importFileInput.click();
    });

    importFileInput.addEventListener("change", function (event) {
      var file = event.target.files && event.target.files[0];

      if (!file) {
        return;
      }

      readJsonFile(file).then(function (payload) {
        var importConfig = normalizeImportPayload(payload);
        var managedKeyCount = Object.keys(importConfig.datasets).length;
        var prompt = importConfig.message + " Esto va a reemplazar " + managedKeyCount + (managedKeyCount === 1 ? " bloque" : " bloques") + " de datos.";

        if (!window.confirm(prompt)) {
          setFeedback("Importacion cancelada.", false);
          return;
        }

        applyImportedDatasets(importConfig.datasets, importConfig.replaceAll);
        renderStorageSummary();
        setFeedback(importConfig.successMessage, false);
      }).catch(function (error) {
        setFeedback(error && error.message ? error.message : "No se pudo importar el archivo.", true);
      });
    });
  }

  function buildDatasetExport(key) {
    return {
      fileName: buildFileName(DATASET_LABELS[key]),
      payload: {
        app: APP_NAME,
        exportVersion: EXPORT_VERSION,
        exportType: "dataset",
        datasetKey: key,
        exportedAt: new Date().toISOString(),
        data: readArray(key)
      },
      successMessage: "Exportacion lista: " + humanizeDatasetLabel(key) + "."
    };
  }

  function buildCorrelationExport() {
    var filters = {
      meal: "all",
      startDate: "",
      endDate: ""
    };
    var report = window.foodTracker && typeof window.foodTracker.buildCorrelationReport === "function"
      ? window.foodTracker.buildCorrelationReport(filters)
      : { trackedDates: 0, foodsTracked: 0, pairs: [] };

    return {
      app: APP_NAME,
      exportVersion: EXPORT_VERSION,
      exportType: "correlations",
      exportedAt: new Date().toISOString(),
      filters: filters,
      summary: {
        trackedDates: report.trackedDates || 0,
        foodsTracked: report.foodsTracked || 0,
        pairCount: Array.isArray(report.pairs) ? report.pairs.length : 0
      },
      pairs: Array.isArray(report.pairs) ? report.pairs : []
    };
  }

  function buildManagedDatasetMap() {
    return MANAGED_KEYS.reduce(function (result, key) {
      result[key] = readArray(key);
      return result;
    }, {});
  }

  function normalizeImportPayload(payload) {
    if (!payload || typeof payload !== "object") {
      throw new Error("El archivo no contiene un JSON valido.");
    }

    if (payload.exportType === "all") {
      return normalizeFullBackup(payload);
    }

    if (payload.exportType === "dataset") {
      return normalizeDatasetBackup(payload);
    }

    if (payload.exportType === "correlations") {
      throw new Error("Las correlaciones se pueden exportar, pero no importar porque se recalculan desde tus registros.");
    }

    if (looksLikeLegacyBackup(payload)) {
      return normalizeLegacyBackup(payload);
    }

    throw new Error("Formato no reconocido. Usa un JSON exportado desde la app.");
  }

  function normalizeFullBackup(payload) {
    var datasets = {};
    var source = payload.datasets;

    if (!source || typeof source !== "object") {
      throw new Error("El backup completo no trae datasets.");
    }

    MANAGED_KEYS.forEach(function (key) {
      datasets[key] = sanitizeImportedArray(source[key]);
    });

    return {
      datasets: datasets,
      replaceAll: true,
      message: "Importar backup completo?",
      successMessage: "Backup completo importado."
    };
  }

  function normalizeDatasetBackup(payload) {
    if (MANAGED_KEYS.indexOf(payload.datasetKey) === -1) {
      throw new Error("Ese dataset no esta soportado para importar.");
    }

    return {
      datasets: createDatasetMap(payload.datasetKey, sanitizeImportedArray(payload.data)),
      replaceAll: false,
      message: "Importar " + humanizeDatasetLabel(payload.datasetKey) + "?",
      successMessage: "Importacion lista: " + humanizeDatasetLabel(payload.datasetKey) + "."
    };
  }

  function normalizeLegacyBackup(payload) {
    var datasets = {};

    MANAGED_KEYS.forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        datasets[key] = sanitizeImportedArray(payload[key]);
      }
    });

    if (!Object.keys(datasets).length) {
      throw new Error("No se encontraron datos importables en el JSON.");
    }

    return {
      datasets: datasets,
      replaceAll: false,
      message: "Importar datos detectados en el archivo?",
      successMessage: "Datos importados desde JSON compatible."
    };
  }

  function looksLikeLegacyBackup(payload) {
    return MANAGED_KEYS.some(function (key) {
      return Object.prototype.hasOwnProperty.call(payload, key);
    });
  }

  function sanitizeImportedArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function createDatasetMap(key, value) {
    var datasets = {};

    datasets[key] = value;
    return datasets;
  }

  function applyImportedDatasets(datasets, replaceAll) {
    if (replaceAll) {
      MANAGED_KEYS.forEach(function (key) {
        writeArray(key, datasets[key] || []);
      });
      return;
    }

    Object.keys(datasets).forEach(function (key) {
      if (MANAGED_KEYS.indexOf(key) !== -1) {
        writeArray(key, datasets[key] || []);
      }
    });
  }

  function writeArray(key, value) {
    if (window.foodTracker && typeof window.foodTracker.writeArray === "function") {
      window.foodTracker.writeArray(key, value);
      return;
    }

    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function downloadJson(fileName, payload) {
    var blob = new Blob([
      JSON.stringify(payload, null, 2)
    ], { type: "application/json" });
    var url = window.URL.createObjectURL(blob);
    var link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.setTimeout(function () {
      window.URL.revokeObjectURL(url);
    }, 0);
  }

  function readJsonFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();

      reader.onload = function () {
        try {
          resolve(JSON.parse(String(reader.result || "")));
        } catch (error) {
          reject(new Error("El archivo no tiene JSON valido."));
        }
      };

      reader.onerror = function () {
        reject(new Error("No se pudo leer el archivo seleccionado."));
      };

      reader.readAsText(file);
    });
  }

  function buildFileName(label) {
    return [APP_NAME, label, formatDateStamp(new Date())].join("-") + ".json";
  }

  function formatDateStamp(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("");
  }

  function humanizeDatasetLabel(key) {
    if (key === FOOD_RECORDS_KEY) {
      return "comidas";
    }

    if (key === SYMPTOM_RECORDS_KEY) {
      return "sintomas";
    }

    if (key === FOOD_HISTORY_KEY) {
      return "sugerencias de comidas";
    }

    if (key === SYMPTOM_HISTORY_KEY) {
      return "sugerencias de sintomas";
    }

    return key;
  }

  function setFeedback(message, isError) {
    if (!settingsFeedback) {
      return;
    }

    settingsFeedback.textContent = message || "";
    settingsFeedback.classList.toggle("is-error", Boolean(isError));
  }

  function readStringArray(key) {
    return readArray(key).filter(function (entry) {
      return typeof entry === "string" && entry.trim();
    });
  }

  function countRecordValues(records, field) {
    return records.reduce(function (total, entry) {
      var values = entry && Array.isArray(entry[field]) ? entry[field] : [];
      return total + values.length;
    }, 0);
  }

  function countTrackedDays(foodRecords, symptomRecords) {
    var dayMap = {};

    foodRecords.concat(symptomRecords).forEach(function (entry) {
      if (entry && typeof entry.date === "string") {
        dayMap[entry.date] = true;
      }
    });

    return Object.keys(dayMap).length;
  }

  function getLocalStorageBytes() {
    var totalBytes = 0;

    for (var index = 0; index < window.localStorage.length; index += 1) {
      var key = window.localStorage.key(index);
      var value = key ? window.localStorage.getItem(key) || "" : "";

      totalBytes += getByteSize(key || "") + getByteSize(value);
    }

    return totalBytes;
  }

  function getByteSize(value) {
    if (typeof Blob === "function") {
      return new Blob([String(value)]).size;
    }

    return String(value).length;
  }

  function formatBytes(value) {
    var units = ["B", "KB", "MB"];
    var size = value;
    var unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }

    return (unitIndex === 0 ? String(size) : size.toFixed(size < 10 ? 1 : 0)) + " " + units[unitIndex];
  }

  function loadVersion() {
    if (!settingsVersion || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.ready.then(function (registration) {
      var worker = registration.active || navigator.serviceWorker.controller;

      if (!worker) {
        settingsVersion.textContent = "Version: no disponible";
        return;
      }

      requestCacheName(worker).then(function (cacheName) {
        settingsVersion.textContent = "Version: " + formatVersion(cacheName);
      }).catch(function () {
        settingsVersion.textContent = "Version: no disponible";
      });
    }).catch(function () {
      settingsVersion.textContent = "Version: no disponible";
    });
  }

  function requestCacheName(worker) {
    return new Promise(function (resolve, reject) {
      var channel = new MessageChannel();

      channel.port1.onmessage = function (event) {
        if (event.data && typeof event.data.cacheName === "string") {
          resolve(event.data.cacheName);
          return;
        }

        reject(new Error("Cache name unavailable"));
      };

      worker.postMessage({ type: "GET_CACHE_NAME" }, [channel.port2]);
    });
  }

  function formatVersion(cacheName) {
    var match = /(?:^|-)v[^-]+$/i.exec(cacheName);

    if (match) {
      return match[0].replace(/^-/, "");
    }

    return cacheName;
  }
}());