/**
 * App bootstrap: wires up tab switching and initializes the wizard, tree
 * explorer, and info panel. Each view renders into its own root element and
 * knows nothing about the others.
 */
(function (global) {
  "use strict";

  function switchTab(tabName) {
    document.querySelectorAll(".tabs__btn").forEach(function (btn) {
      var isActive = btn.getAttribute("data-tab") === tabName;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
    });

    document.getElementById("panel-wizard").hidden = tabName !== "wizard";
    document.getElementById("panel-tree").hidden = tabName !== "tree";
  }

  function initTabs() {
    document.getElementById("tabs").addEventListener("click", function (e) {
      var btn = e.target.closest(".tabs__btn");
      if (!btn) return;
      switchTab(btn.getAttribute("data-tab"));
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTabs();
    global.RTWizard.init(document.getElementById("wizard-root"));
    global.RTTreeExplorer.init(document.getElementById("tree-root"));
    global.RTInfoPanel.init();
  });
})(window);
