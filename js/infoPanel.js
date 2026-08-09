/**
 * Slide-in "About this tool" panel, opened from the header info button.
 * Content is generated from RTModel so it can never drift from the wizard's
 * own per-question definitions. Owns its own open/close/focus-trap behavior,
 * and mounts the tree explorer into itself (the tree only ever lives here).
 * Knows nothing about the wizard.
 */
(function (global) {
  "use strict";

  var QUESTIONS = global.RTModel.QUESTIONS;

  var openBtn, closeBtn, panel, backdrop, body;
  var closeTimer = null;

  function renderContent() {
    body.innerHTML =
      "<section>" +
      "<h3>How this works</h3>" +
      "<p>Optionally enter a CVSS base score up front &mdash; it locks in once you continue, since " +
      "it shouldn&rsquo;t change partway through an assessment. Then answer four questions, in the " +
      "same order as CISA&rsquo;s remediation decision tree, and this tool tells you the exact " +
      "deadline that applies. Everything runs locally in your browser &mdash; nothing you enter is " +
      "transmitted or stored anywhere.</p>" +
      "</section>" +
      "<section>" +
      "<h3>RPI priority score</h3>" +
      "<p>If you provided a CVSS score, your result also shows RPI (Risk Priority Index) &mdash; a " +
      "0&ndash;100 number blending this result&rsquo;s timeline tier (70% weight) with CVSS severity " +
      "(30% weight). It exists for one practical case: ranking several vulnerabilities that land on " +
      "the same timeline tier.</p>" +
      "</section>" +
      "<section>" +
      "<h3>The four factors</h3>" +
      '<dl class="info-terms">' +
      QUESTIONS.map(function (q) {
        return (
          "<dt>" + q.shortLabel + "</dt>" +
          "<dd>" + q.subtitle +
          '<span class="meta">Typically assessed by: ' + q.assessedBy + "</span>" +
          "</dd>"
        );
      }).join("") +
      "</dl>" +
      "</section>" +
      "<section>" +
      "<h3>Full decision tree</h3>" +
      '<div id="tree-root"></div>' +
      "</section>" +
      "<section>" +
      "<h3>Sources</h3>" +
      '<ul class="info-sources">' +
      '<li><a href="https://www.cisa.gov/news-events/directives/bod-26-04-prioritizing-security-updates-based-risk" target="_blank" rel="noopener noreferrer">CISA BOD 26-04 &mdash; Prioritizing Security Updates Based on Risk</a></li>' +
      '<li><a href="https://www.cisa.gov/stakeholder-specific-vulnerability-categorization-ssvc" target="_blank" rel="noopener noreferrer">CISA Stakeholder-Specific Vulnerability Categorization (SSVC)</a></li>' +
      '<li><a href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog" target="_blank" rel="noopener noreferrer">CISA Known Exploited Vulnerabilities (KEV) Catalog</a></li>' +
      "</ul>" +
      "</section>" +
      '<p class="info-panel__disclaimer">Independent, unofficial reference tool &mdash; not affiliated ' +
      "with or endorsed by CISA. Treat it as a decision aid, not a replacement for your organization&rsquo;s " +
      "own policy or a qualified analyst&rsquo;s judgment.</p>";
  }

  function getFocusable() {
    // Includes <summary> since the tree explorer's collapsible nodes live
    // inside this panel and are natively focusable/interactive too.
    return Array.prototype.slice.call(
      panel.querySelectorAll('a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')
    );
  }

  function open() {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    panel.hidden = false;
    backdrop.hidden = false;
    document.body.classList.add("info-panel-open");
    // Wait a frame so the browser paints the hidden->visible state first;
    // otherwise the transform transition has nothing to animate from.
    requestAnimationFrame(function () {
      panel.classList.add("is-open");
      backdrop.classList.add("is-open");
    });
    openBtn.setAttribute("aria-expanded", "true");
    document.addEventListener("keydown", handleKeydown);
    closeBtn.focus();
  }

  function close() {
    if (panel.hidden) return; // already closed — e.g. called opportunistically from elsewhere
    panel.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    document.body.classList.remove("info-panel-open");
    openBtn.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", handleKeydown);
    openBtn.focus();
    closeTimer = setTimeout(function () {
      panel.hidden = true;
      backdrop.hidden = true;
      closeTimer = null;
    }, 260);
  }

  function handleKeydown(e) {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key !== "Tab") return;

    var focusable = getFocusable();
    if (focusable.length === 0) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function init() {
    openBtn = document.getElementById("info-open-btn");
    closeBtn = document.getElementById("info-close-btn");
    panel = document.getElementById("info-panel");
    backdrop = document.getElementById("info-backdrop");
    body = document.getElementById("info-panel-body");

    renderContent();
    global.RTTreeExplorer.init(document.getElementById("tree-root"));

    openBtn.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", close);
  }

  global.RTInfoPanel = { init: init, close: close };
})(window);
