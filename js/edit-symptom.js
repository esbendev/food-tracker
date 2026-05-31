(function () {
  var app = window.foodTracker;
  var RECORD_KEY = "symptom_records";
  var HISTORY_KEY = "global_symptom_history";
  var VALUES_KEY = "symptoms";
  var MAX_SUGGESTIONS = 5;
  var recordIndex = app.getNumericParam("index");
  var recordState = app.findRecordByIndex(RECORD_KEY, recordIndex, VALUES_KEY);
  var record = recordState.record;
  var viewDate = app.getViewDateParam() || (record ? record.date : "") || app.formatDate(new Date());
  var mealGroup = document.getElementById("mealGroup");
  var inputsStack = document.getElementById("inputsStack");
  var dateLabel = document.getElementById("dateLabel");
  var backLink = document.getElementById("backLink");
  var addAnotherBtn = document.getElementById("addAnotherBtn");
  var deleteBtn = document.getElementById("deleteBtn");
  var saveBtn = document.getElementById("saveBtn");
  var pendingBlurSave = false;
  var submitInProgress = false;

  if (!record) {
    window.alert("No se encontro el sintoma que queres editar.");
    redirectHome();
    return;
  }

  backLink.href = buildHomeHref();
  dateLabel.textContent = "Editando sintoma de " + app.prettyDate(record.date);
  app.setSelectedMeal("meal", record.meal);
  record.symptoms.forEach(function (value) {
    addInputField(value);
  });
  app.bindMealFocus(mealGroup, inputsStack);
  app.focusLastInput(inputsStack);

  addAnotherBtn.addEventListener("click", function () {
    var input = addInputField("");
    input.focus();
  });

  deleteBtn.addEventListener("click", function () {
    if (!window.confirm("Eliminar este sintoma?")) {
      return;
    }

    recordState.records.splice(recordState.index, 1);
    app.writeArray(RECORD_KEY, recordState.records);
    redirectHome();
  });

  document.addEventListener("touchstart", queueBlurSave, true);
  document.addEventListener("pointerdown", queueBlurSave, true);
  document.addEventListener("mousedown", queueBlurSave, true);

  inputsStack.addEventListener("focusout", function (event) {
    if (!pendingBlurSave || !event.target.classList.contains("text-input")) {
      return;
    }

    window.setTimeout(function () {
      var activeElement = document.activeElement;
      var isAnotherInputFocused = activeElement && activeElement.classList && activeElement.classList.contains("text-input");

      if (pendingBlurSave && !isAnotherInputFocused) {
        commitSave();
      }
    }, 0);
  }, true);

  saveBtn.addEventListener("click", function () {
    pendingBlurSave = false;
    commitSave();
  });

  function queueBlurSave(event) {
    var trigger = event.target.closest && event.target.closest("#saveBtn");
    pendingBlurSave = Boolean(trigger);
  }

  function commitSave() {
    if (submitInProgress) {
      return;
    }

    submitInProgress = true;

    if (!saveEntries()) {
      submitInProgress = false;
    }
  }

  function saveEntries() {
    var values = Array.prototype.slice.call(document.querySelectorAll(".text-input"))
      .map(function (input) {
        return app.sanitizeValue(input.value);
      })
      .filter(Boolean);

    if (!values.length) {
      window.alert("Escribi al menos un sintoma antes de guardar.");
      app.focusLastInput(inputsStack);
      return false;
    }

    var meal = app.getSelectedMeal("meal");
    var history = app.readArray(HISTORY_KEY);

    recordState.records[recordState.index] = {
      date: record.date,
      meal: meal,
      symptoms: values
    };

    values.forEach(function (value) {
      if (history.indexOf(value) === -1) {
        history.push(value);
      }
    });

    app.writeArray(RECORD_KEY, recordState.records);
    app.writeArray(HISTORY_KEY, history);
    redirectHome();
    return true;
  }

  function addInputField(initialValue) {
    return app.createSuggestionInput({
      container: inputsStack,
      placeholder: "Ej: hinchazon",
      historyKey: HISTORY_KEY,
      maxSuggestions: MAX_SUGGESTIONS,
      initialValue: initialValue,
      onSelect: function () {
        addInputField("");
        app.focusLastInput(inputsStack);
      }
    });
  }

  function buildHomeHref() {
    return "index.html?viewDate=" + encodeURIComponent(viewDate);
  }

  function redirectHome() {
    window.location.href = buildHomeHref();
  }
}());