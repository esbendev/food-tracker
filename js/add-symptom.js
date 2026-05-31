(function () {
  var app = window.foodTracker;
  var RECORD_KEY = "symptom_records";
  var HISTORY_KEY = "global_symptom_history";
  var MAX_SUGGESTIONS = 5;
  var selectedDate = app.getDateParam();
  var mealGroup = document.getElementById("mealGroup");
  var inputsStack = document.getElementById("inputsStack");
  var dateLabel = document.getElementById("dateLabel");
  var severityInput = document.getElementById("severityInput");
  var noteInput = document.getElementById("noteInput");
  var addAnotherBtn = document.getElementById("addAnotherBtn");
  var saveBtn = document.getElementById("saveBtn");

  dateLabel.textContent = "Guardando para " + app.prettyDate(selectedDate);
  addInputField("");
  app.bindMealFocus(mealGroup, inputsStack);
  app.focusLastInput(inputsStack);

  addAnotherBtn.addEventListener("click", function () {
    var input = addInputField("");
    input.focus();
  });

  var pendingBlurSave = false;
  var saveTriggered = false;

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
    if (saveTriggered) {
      return;
    }

    saveTriggered = true;
    saveEntries();
  }

  function saveEntries() {
    var values = Array.prototype.slice.call(document.querySelectorAll(".text-input"))
      .filter(function (input) {
        return input !== severityInput && input !== noteInput;
      })
      .map(function (input) {
        return app.sanitizeValue(input.value);
      })
      .filter(Boolean);

    if (!values.length) {
      window.alert("Escribi al menos un sintoma antes de guardar.");
      app.focusLastInput(inputsStack);
      return;
    }

    var meal = app.getSelectedMeal("meal");
    var records = app.readArray(RECORD_KEY);
    var history = app.readArray(HISTORY_KEY);
    var severity = app.normalizeSeverity(severityInput ? severityInput.value : 3);
    var note = app.sanitizeValue(noteInput ? noteInput.value : "");

    records.push({
      date: selectedDate,
      meal: meal,
      symptoms: values,
      severity: severity,
      note: note
    });

    values.forEach(function (value) {
      if (history.indexOf(value) === -1) {
        history.push(value);
      }
    });

    app.writeArray(RECORD_KEY, records);
    app.writeArray(HISTORY_KEY, history);
    window.location.href = "index.html?viewDate=" + encodeURIComponent(selectedDate);
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
}());
