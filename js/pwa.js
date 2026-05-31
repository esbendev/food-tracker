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
}());