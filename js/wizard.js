/**
 * Step-by-step assessment wizard. Owns rendering and interaction for
 * #wizard-root; reads questions/outcomes from RTModel and icons from
 * RTIcons, but has no knowledge of the tree explorer view.
 */
(function (global) {
  "use strict";

  var QUESTIONS = global.RTModel.QUESTIONS;

  var root = null;
  var state = { answers: {} };

  function answeredCount() {
    return QUESTIONS.reduce(function (n, q) {
      return Object.prototype.hasOwnProperty.call(state.answers, q.id) ? n + 1 : n;
    }, 0);
  }

  function isComplete() {
    return answeredCount() === QUESTIONS.length;
  }

  // ---- rendering -----------------------------------------------------

  function render() {
    if (isComplete()) {
      renderResult();
    } else {
      renderQuestion(QUESTIONS[answeredCount()]);
    }
  }

  function renderQuestion(question) {
    var stepIndex = question.step - 1;

    root.innerHTML =
      stepperMarkup(stepIndex) +
      '<div class="question-card">' +
      '<p class="question-card__eyebrow">Question ' + question.step + " of " + QUESTIONS.length + "</p>" +
      '<h2 class="question-card__title">' + question.title + " " + infoBubbleMarkup(question) + "</h2>" +
      '<div class="options" role="group" aria-label="' + question.title + '">' +
      question.options.map(optionButtonMarkup).join("") +
      "</div>" +
      '<div class="question-card__nav">' +
      '<button class="btn btn--text" data-action="back" type="button"' +
      (stepIndex === 0 ? " disabled" : "") +
      ">Back</button>" +
      "</div>" +
      "</div>";

    var firstOption = root.querySelector(".option");
    if (firstOption) firstOption.focus();
  }

  function infoBubbleMarkup(question) {
    var tipId = "tip-" + question.id;
    return (
      '<span class="info-bubble">' +
      '<button class="info-bubble__trigger" type="button" data-action="toggle-tip" ' +
      'aria-expanded="false" aria-controls="' + tipId + '">' +
      "i" +
      '<span class="sr-only">More about &ldquo;' + question.shortLabel + "&rdquo;</span>" +
      "</button>" +
      '<div class="info-bubble__tip" id="' + tipId + '" role="note" hidden>' +
      "<p>" + question.subtitle + "</p>" +
      '<p class="info-bubble__tip-meta"><strong>Typically assessed by:</strong> ' + question.assessedBy + "</p>" +
      "</div>" +
      "</span>"
    );
  }

  function optionButtonMarkup(opt, i) {
    return (
      '<button class="option" data-action="answer" data-value="' + opt.value + '" type="button">' +
      '<span class="option__kbd" aria-hidden="true">' + (i + 1) + "</span>" +
      '<span class="option__text">' +
      '<span class="option__label">' + opt.label + "</span>" +
      '<span class="option__hint">' + opt.hint + "</span>" +
      "</span>" +
      "</button>"
    );
  }

  function stepperMarkup(currentIndex) {
    return (
      '<ol class="stepper" aria-label="Progress">' +
      QUESTIONS.map(function (q, i) {
        var label = q.shortLabel;
        if (i < currentIndex) {
          var chosen = chosenOption(q);
          var editLabel = "Step " + (i + 1) + ", " + label + ": " + (chosen ? chosen.label : "") + ". Answered, click to change.";
          return (
            '<li><button class="step-dot step-dot--done" data-action="edit" data-index="' + i + '" type="button" aria-label="' + editLabel + '">' +
            '<span class="step-dot__num" aria-hidden="true">&#10003;</span><span class="step-dot__label">' + label + "</span>" +
            "</button></li>"
          );
        }
        if (i === currentIndex) {
          return (
            '<li><span class="step-dot step-dot--current" aria-current="step">' +
            '<span class="step-dot__num" aria-hidden="true">' + (i + 1) + '</span><span class="step-dot__label">' + label + "</span>" +
            "</span></li>"
          );
        }
        return (
          '<li><span class="step-dot step-dot--upcoming">' +
          '<span class="step-dot__num" aria-hidden="true">' + (i + 1) + '</span><span class="step-dot__label">' + label + "</span>" +
          "</span></li>"
        );
      }).join("") +
      "</ol>"
    );
  }

  function renderResult() {
    var outcome = global.RTModel.resolveOutcome(state.answers);
    if (!outcome) {
      // Not reachable in normal use: model.js validates OUTCOME_TABLE at
      // load time, and isComplete() guarantees all four answers are set.
      root.innerHTML =
        '<p class="result__summary">Something went wrong resolving a result. Please start over.</p>' +
        '<button class="btn btn--primary" data-action="restart" type="button">Start over</button>';
      return;
    }

    root.innerHTML =
      stepperMarkup(QUESTIONS.length) +
      '<div class="result">' +
      '<div class="result__badge" data-outcome="' + outcome.id + '">' +
      '<span class="result__badge-icon" aria-hidden="true">' + global.RTIcons.markup(outcome.id) + "</span>" +
      '<h2 class="result__badge-text" id="result-heading" tabindex="-1">' +
      '<span class="result__badge-eyebrow">Remediation deadline</span>' +
      '<span class="result__badge-label">' + outcome.label + "</span>" +
      "</h2>" +
      "</div>" +
      '<p class="result__summary">' + outcome.summary + "</p>" +
      (outcome.forensic ? forensicMarkup(outcome) : "") +
      '<div class="result__recap">' +
      "<h3>Your answers</h3>" +
      '<ol class="recap-list">' +
      QUESTIONS.map(recapRowMarkup).join("") +
      "</ol>" +
      "</div>" +
      '<div class="result__actions">' +
      '<button class="btn btn--primary" data-action="restart" type="button">Start over</button>' +
      "</div>" +
      "</div>";

    var heading = document.getElementById("result-heading");
    if (heading) heading.focus();
  }

  function forensicMarkup(outcome) {
    return (
      '<div class="forensic-box">' +
      "<h3>Forensic triage checklist</h3>" +
      "<ol>" +
      outcome.forensicSteps.map(function (s) {
        return '<li><span class="forensic-box__window">' + s.window + "</span>" + s.detail + "</li>";
      }).join("") +
      "</ol>" +
      "</div>"
    );
  }

  function chosenOption(question) {
    return question.options.filter(function (o) {
      return o.value === state.answers[question.id];
    })[0];
  }

  function recapRowMarkup(q, i) {
    var chosen = chosenOption(q);
    return (
      '<li class="recap-row">' +
      '<span class="recap-row__text">' +
      '<span class="recap-row__q">' + q.title + "</span>" +
      '<span class="recap-row__a">' + (chosen ? chosen.label : "&mdash;") + "</span>" +
      "</span>" +
      '<button class="btn btn--text" data-action="edit" data-index="' + i + '" type="button">Edit</button>' +
      "</li>"
    );
  }

  // ---- info bubble (per-question "explain this term" popover) ----------

  function setTipOpen(trigger, open) {
    var tip = document.getElementById(trigger.getAttribute("aria-controls"));
    if (!tip) return;
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    tip.hidden = !open;
  }

  function closeOpenTip() {
    var openTrigger = root.querySelector('.info-bubble__trigger[aria-expanded="true"]');
    if (openTrigger) setTipOpen(openTrigger, false);
  }

  // ---- interaction -----------------------------------------------------

  function handleClick(e) {
    var actionEl = e.target.closest("[data-action]");
    if (!actionEl || actionEl.disabled) return;

    switch (actionEl.getAttribute("data-action")) {
      case "answer":
        state.answers[QUESTIONS[answeredCount()].id] = actionEl.getAttribute("data-value");
        render();
        break;
      case "back": {
        var count = answeredCount();
        if (count > 0) delete state.answers[QUESTIONS[count - 1].id];
        render();
        break;
      }
      case "edit": {
        var index = parseInt(actionEl.getAttribute("data-index"), 10);
        QUESTIONS.slice(index).forEach(function (q) {
          delete state.answers[q.id];
        });
        render();
        break;
      }
      case "restart":
        state.answers = {};
        render();
        break;
      case "toggle-tip":
        setTipOpen(actionEl, actionEl.getAttribute("aria-expanded") !== "true");
        break;
      default:
        break;
    }
  }

  // Closes an open info-tip on any click outside it, wherever on the page
  // it lands (including outside the wizard root entirely).
  function handleDocumentClick(e) {
    if (!e.target.closest(".info-bubble")) closeOpenTip();
  }

  // Keyboard accelerators, active only while the wizard question view is showing.
  function handleKeydown(e) {
    var panel = document.getElementById("panel-wizard");
    if (!panel || panel.hidden) return;

    if (e.key === "Escape") {
      closeOpenTip();
      return;
    }

    if (isComplete()) return;

    if (e.key === "Backspace") {
      var backBtn = root.querySelector('[data-action="back"]');
      if (backBtn && !backBtn.disabled) {
        e.preventDefault();
        backBtn.click();
      }
      return;
    }

    if (e.key === "1" || e.key === "2") {
      var options = root.querySelectorAll(".option");
      var target = options[Number(e.key) - 1];
      if (target) {
        e.preventDefault();
        target.click();
      }
    }
  }

  function init(rootEl) {
    root = rootEl;
    root.addEventListener("click", handleClick);
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleKeydown);
    render();
  }

  global.RTWizard = { init: init };
})(window);
