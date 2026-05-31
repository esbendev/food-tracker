(function () {
  var app = window.foodTracker;
  var RECORD_KEY = "food_records";
  var HISTORY_KEY = "global_food_history";
  var MAX_SUGGESTIONS = 5;
  var selectedDate = app.getDateParam();
  var mealGroup = document.getElementById("mealGroup");
  var inputsStack = document.getElementById("inputsStack");
  var dateLabel = document.getElementById("dateLabel");
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

    if (!saveEntries()) {
      saveTriggered = false;
    }
  }

  function saveEntries() {
    var values = Array.prototype.slice.call(document.querySelectorAll(".text-input"))
      .map(function (input) {
        return app.sanitizeValue(input.value);
      })
      .filter(Boolean);

    if (!values.length) {
      window.alert("Escribi al menos una comida antes de guardar.");
      app.focusLastInput(inputsStack);
      return false;
    }

    var meal = app.getSelectedMeal("meal");
    var records = app.readArray(RECORD_KEY);
    var history = app.readArray(HISTORY_KEY);

    records.push({
      date: selectedDate,
      meal: meal,
      items: values
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
      placeholder: "Ej: yogurt con arandanos",
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
