(function () {
  var deferredInstallPrompt = null;

  window.foodTrackerPwa = {
    canPromptInstall: canPromptInstall,
    promptInstall: promptInstall,
    isStandalone: isStandalone
  };

  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    deferredInstallPrompt = event;
    dispatchInstallAvailability();
  });

  window.addEventListener("appinstalled", function () {
    deferredInstallPrompt = null;
    dispatchInstallAvailability();
  });

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./service-worker.js").catch(function () {
      return null;
    });

    checkAndShowReminderFallback();
  });

  function canPromptInstall() {
    return Boolean(deferredInstallPrompt);
  }

  function promptInstall() {
    if (!deferredInstallPrompt) {
      return Promise.reject(new Error("Install prompt unavailable"));
    }

    var promptEvent = deferredInstallPrompt;

    deferredInstallPrompt = null;
    dispatchInstallAvailability();

    return promptEvent.prompt().then(function () {
      return promptEvent.userChoice;
    }).then(function (choice) {
      dispatchInstallAvailability();
      return choice;
    });
  }

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function dispatchInstallAvailability() {
    window.dispatchEvent(new CustomEvent("foodtracker:installavailability", {
      detail: {
        available: canPromptInstall(),
        standalone: isStandalone()
      }
    }));
  }

  function checkAndShowReminderFallback() {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    if (window.localStorage.getItem("reminder_enabled") !== "true") {
      return;
    }

    navigator.serviceWorker.ready.then(function (reg) {
      if ("periodicSync" in reg) {
        return;
      }

      var now = new Date();
      var today = now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0");
      var lastDate = window.localStorage.getItem("reminder_last_date") || "";

      if (lastDate === today) {
        return;
      }

      var timeValue = window.localStorage.getItem("reminder_time") || "09:00";
      var parts = timeValue.split(":");
      var reminderHour = Number(parts[0] || 9);
      var reminderMinute = Number(parts[1] || 0);

      if (now.getHours() < reminderHour ||
          (now.getHours() === reminderHour && now.getMinutes() < reminderMinute)) {
        return;
      }

      window.localStorage.setItem("reminder_last_date", today);
      reg.showNotification("Food Tracker", {
        body: "No te olvides de registrar tus comidas de hoy.",
        icon: "./assets/icons/icon-192.png",
        badge: "./assets/icons/icon-192.png",
        tag: "daily-reminder"
      });
    }).catch(function () {});
  }
}());