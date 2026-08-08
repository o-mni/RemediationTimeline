/**
 * Full decision tree reference view. Renders every one of the 16 paths
 * through RTModel's tree as nested, collapsible <details> elements, in the
 * same branch order as the source chart (Exposure -> KEV -> Automatable ->
 * Technical Impact). Read-only: this view never mutates RTModel state.
 */
(function (global) {
  "use strict";

  var QUESTIONS = global.RTModel.QUESTIONS;
  var OUTCOMES = global.RTModel.OUTCOMES;

  var root = null;

  function outcomeCounts() {
    var counts = {};
    Object.keys(OUTCOMES).forEach(function (id) {
      counts[id] = 0;
    });
    Object.keys(global.RTModel.OUTCOME_TABLE).forEach(function (key) {
      counts[global.RTModel.OUTCOME_TABLE[key]]++;
    });
    return counts;
  }

  function legendMarkup() {
    var counts = outcomeCounts();
    return (
      '<ul class="legend">' +
      Object.keys(OUTCOMES).map(function (id) {
        var outcome = OUTCOMES[id];
        var n = counts[id];
        return (
          '<li class="legend__item" data-outcome="' + id + '">' +
          '<span class="legend__icon" aria-hidden="true">' + global.RTIcons.markup(id) + "</span>" +
          '<span class="legend__label">' + outcome.label + "</span>" +
          '<span class="legend__count">' + n + " path" + (n === 1 ? "" : "s") + "</span>" +
          "</li>"
        );
      }).join("") +
      "</ul>"
    );
  }

  function leafMarkup(outcome) {
    return (
      '<div class="tree-leaf" data-outcome="' + outcome.id + '">' +
      '<span class="tree-leaf__icon" aria-hidden="true">' + global.RTIcons.markup(outcome.id) + "</span>" +
      '<span class="tree-leaf__label">' + outcome.label + "</span>" +
      (outcome.forensic ? '<span class="tree-leaf__flag">+ forensic triage</span>' : "") +
      "</div>"
    );
  }

  function nodeMarkup(node) {
    if (node.leaf) return leafMarkup(node.outcome);

    var questionLabel = node.question.shortLabel;
    return (
      '<ul class="tree-branch">' +
      node.children.map(function (child) {
        return (
          "<li>" +
          '<details class="tree-node">' +
          "<summary>" +
          '<span class="tree-node__q">' + questionLabel + "</span>" +
          '<span class="tree-node__a">' + child.option.label + "</span>" +
          "</summary>" +
          '<div class="tree-node__body">' + nodeMarkup(child.node) + "</div>" +
          "</details>" +
          "</li>"
        );
      }).join("") +
      "</ul>"
    );
  }

  function render() {
    var tree = global.RTModel.buildTree();
    root.innerHTML =
      '<div class="tree-explorer__intro">' +
      "<h2>Full decision tree</h2>" +
      "<p>All 16 paths through the remediation decision tree, in the same branch order as the source " +
      "chart: " + QUESTIONS.map(function (q) { return q.shortLabel; }).join(" &rarr; ") + ". " +
      "Expand a branch to follow it through.</p>" +
      legendMarkup() +
      '<div class="tree-explorer__controls">' +
      '<button class="btn btn--text" data-action="expand-all" type="button">Expand all</button>' +
      '<button class="btn btn--text" data-action="collapse-all" type="button">Collapse all</button>' +
      "</div>" +
      "</div>" +
      nodeMarkup(tree);
  }

  function handleClick(e) {
    var actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;
    var action = actionEl.getAttribute("data-action");
    if (action !== "expand-all" && action !== "collapse-all") return;

    var open = action === "expand-all";
    root.querySelectorAll("details.tree-node").forEach(function (details) {
      details.open = open;
    });
  }

  function init(rootEl) {
    root = rootEl;
    root.addEventListener("click", handleClick);
    render();
  }

  global.RTTreeExplorer = { init: init };
})(window);
