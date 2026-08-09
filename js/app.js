/**
 * App bootstrap: initializes the wizard (the single main view) and the info
 * panel, and wires the header logo to act as a "home" button that resets
 * the wizard back to its first screen.
 */
(function (global) {
  "use strict";

  function initHomeButton() {
    var homeBtn = document.getElementById("home-btn");
    if (!homeBtn) return;
    homeBtn.addEventListener("click", function () {
      global.RTInfoPanel.close();
      global.RTWizard.restart();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    global.RTWizard.init(document.getElementById("wizard-root"));
    global.RTInfoPanel.init();
    initHomeButton();
  });
})(window);
