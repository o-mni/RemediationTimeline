/**
 * Step-by-step assessment wizard. Owns rendering and interaction for
 * #wizard-root; reads questions/outcomes from RTModel, date/RPI math from
 * RTEnrichment, and icons from RTIcons. Has no knowledge of the tree
 * explorer or info panel views.
 */
(function (global) {
  "use strict";

  var QUESTIONS = global.RTModel.QUESTIONS;

  var root = null;
  var state = {
    answers: {},
    context: { evaluatedOn: null, cvss: null },
  };

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
    var content = isComplete() ? resultMarkup() : questionMarkup(QUESTIONS[answeredCount()]);
    root.innerHTML = contextBarMarkup() + content;

    if (isComplete()) {
      var heading = document.getElementById("result-heading");
      if (heading) heading.focus();
    } else {
      var firstOption = root.querySelector(".option");
      if (firstOption) firstOption.focus();
    }
  }

  function contextBarMarkup() {
    var cvssValue = state.context.cvss === null ? "" : state.context.cvss;
    return (
      '<div class="context-bar">' +
      '<div class="context-field">' +
      '<label for="ctx-date">Evaluated on</label>' +
      '<input type="date" id="ctx-date" data-context="evaluatedOn" value="' + state.context.evaluatedOn + '">' +
      "</div>" +
      '<div class="context-field">' +
      '<label for="ctx-cvss">CVSS base score <span class="context-field__optional">(optional)</span></label>' +
      '<input type="number" id="ctx-cvss" data-context="cvss" min="0" max="10" step="0.1" placeholder="0.0–10.0" value="' + cvssValue + '">' +
      "</div>" +
      "</div>"
    );
  }

  function questionMarkup(question) {
    var stepIndex = question.step - 1;
    return (
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
      "</div>"
    );
  }

  function bubbleMarkup(id, srLabel, bodyHtml, onDark) {
    var tipId = "tip-" + id;
    return (
      '<span class="info-bubble' + (onDark ? " info-bubble--on-dark" : "") + '">' +
      '<button class="info-bubble__trigger" type="button" data-action="toggle-tip" ' +
      'aria-expanded="false" aria-controls="' + tipId + '">' +
      "i" +
      '<span class="sr-only">' + srLabel + "</span>" +
      "</button>" +
      '<div class="info-bubble__tip" id="' + tipId + '" role="note" hidden>' + bodyHtml + "</div>" +
      "</span>"
    );
  }

  function infoBubbleMarkup(question) {
    return bubbleMarkup(
      question.id,
      "More about “" + question.shortLabel + "”",
      "<p>" + question.subtitle + "</p>" +
      '<p class="info-bubble__tip-meta"><strong>Typically assessed by:</strong> ' + question.assessedBy + "</p>"
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

  function resultMarkup() {
    var outcome = global.RTModel.resolveOutcome(state.answers);
    if (!outcome) {
      // Not reachable in normal use: model.js validates OUTCOME_TABLE at
      // load time, and isComplete() guarantees all four answers are set.
      return (
        '<p class="result__summary">Something went wrong resolving a result. Please start over.</p>' +
        '<button class="btn btn--primary" data-action="restart" type="button">Start over</button>'
      );
    }

    return (
      stepperMarkup(QUESTIONS.length) +
      '<div class="result">' +
      '<div class="result__badge" data-outcome="' + outcome.id + '">' +
      '<span class="result__badge-icon" aria-hidden="true">' + global.RTIcons.markup(outcome.id) + "</span>" +
      '<h2 class="result__badge-text" id="result-heading" tabindex="-1">' +
      '<span class="result__badge-eyebrow">Remediation deadline</span>' +
      '<span class="result__badge-label">' + outcome.label + "</span>" +
      "</h2>" +
      "</div>" +
      deadlineCalloutMarkup(outcome) +
      '<p class="result__summary">' + outcome.summary + "</p>" +
      (outcome.forensic ? forensicMarkup(outcome) : "") +
      rpiSectionMarkup(outcome) +
      '<div class="result__recap">' +
      "<h3>Your answers</h3>" +
      '<ol class="recap-list">' +
      QUESTIONS.map(recapRowMarkup).join("") +
      "</ol>" +
      "</div>" +
      '<div class="result__actions">' +
      '<button class="btn btn--primary" data-action="restart" type="button">Start over</button>' +
      "</div>" +
      "</div>"
    );
  }

  function deadlineCalloutMarkup(outcome) {
    var deadline = global.RTEnrichment.computeDeadline(outcome, state.context.evaluatedOn);

    if (!deadline) {
      return (
        '<div class="deadline-callout" id="deadline-callout">' +
        '<p class="deadline-callout__date">No fixed deadline &mdash; remediate at your next scheduled system upgrade.</p>' +
        "</div>"
      );
    }

    var weekendNote = "";
    if (deadline.weekendDaysInWindow > 0) {
      weekendNote =
        '<p class="deadline-callout__weekend">' +
        "<strong>Heads up:</strong> this window includes " + deadline.weekendDaysInWindow + " weekend " +
        (deadline.weekendDaysInWindow === 1 ? "day" : "days") +
        ". Most teams can&rsquo;t remediate over the weekend, so you effectively have " + deadline.workingDays +
        " working " + (deadline.workingDays === 1 ? "day" : "days") + " to act, not " + outcome.days +
        " calendar days." +
        (deadline.deadlineIsWeekend
          ? " The deadline itself falls on a " + deadline.deadlineWeekdayName + ", so treat the prior business day as your real target."
          : "") +
        "</p>";
    }

    return (
      '<div class="deadline-callout" id="deadline-callout">' +
      '<p class="deadline-callout__date"><strong>Due:</strong> ' + deadline.deadlineLabel + "</p>" +
      weekendNote +
      "</div>"
    );
  }

  function rpiSectionMarkup(outcome) {
    var rpi = global.RTEnrichment.computeRPI(outcome, state.context.cvss);

    if (!rpi) {
      return (
        '<div class="rpi-section rpi-section--empty" id="rpi-section">' +
        '<p class="rpi-section__prompt">Add a CVSS base score above to also get an RPI (Risk Priority Index) ' +
        "&mdash; a single 0&ndash;100 number for ranking several vulnerabilities that land on the same timeline tier.</p>" +
        "</div>"
      );
    }

    return (
      '<div class="rpi-section" id="rpi-section" data-rpi-band="' + rpi.band + '">' +
      '<div class="rpi-badge">' +
      '<span class="rpi-badge__score">' + rpi.score + "</span>" +
      '<span class="rpi-badge__text">' +
      '<span class="rpi-badge__label">RPI &middot; Risk Priority Index ' +
      bubbleMarkup(
        "rpi",
        "About the RPI score",
        "<p>RPI blends this result&rsquo;s CISA timeline tier (70% weight) with your CVSS base score " +
        "(30% weight) into one 0&ndash;100 number &mdash; useful for ranking several vulnerabilities that " +
        "land on the same deadline.</p>",
        true
      ) +
      "</span>" +
      '<span class="rpi-badge__band">' + rpi.bandLabel + "</span>" +
      "</span>" +
      "</div>" +
      "</div>"
    );
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

  // ---- info bubble (per-question / per-metric "explain this" popover) --

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

  // ---- derived output (deadline/RPI) live-update, without re-rendering
  // the context inputs themselves, so focus never drops mid-keystroke ----

  function updateDerivedOutputs() {
    var outcome = global.RTModel.resolveOutcome(state.answers);
    if (!outcome) return;
    var deadlineEl = document.getElementById("deadline-callout");
    if (deadlineEl) deadlineEl.outerHTML = deadlineCalloutMarkup(outcome);
    var rpiEl = document.getElementById("rpi-section");
    if (rpiEl) rpiEl.outerHTML = rpiSectionMarkup(outcome);
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

  // Context bar (evaluation date / CVSS) inputs: update state and, if the
  // result is already showing, refresh just the derived-output elements —
  // never the whole view, or the input being typed into would lose focus.
  function handleInput(e) {
    var field = e.target.closest("[data-context]");
    if (!field) return;

    var key = field.getAttribute("data-context");
    if (key === "cvss") {
      var raw = field.value.trim();
      state.context.cvss = raw === "" ? null : parseFloat(raw);
    } else if (key === "evaluatedOn") {
      state.context.evaluatedOn = field.value || global.RTEnrichment.todayISO();
    }

    if (isComplete()) updateDerivedOutputs();
  }

  // Closes an open info-tip on any click outside it, wherever on the page
  // it lands (including outside the wizard root entirely).
  function handleDocumentClick(e) {
    if (!e.target.closest(".info-bubble")) closeOpenTip();
  }

  // Keyboard accelerators, active only while the wizard panel is showing.
  function handleKeydown(e) {
    var panel = document.getElementById("panel-wizard");
    if (!panel || panel.hidden) return;

    if (e.key === "Escape") {
      closeOpenTip();
      return;
    }

    if (isComplete()) return;

    // Don't hijack digit/backspace keys while the user is typing in the
    // context bar's date/CVSS fields.
    if (e.target.closest(".context-bar")) return;

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
    state.context.evaluatedOn = global.RTEnrichment.todayISO();

    root.addEventListener("click", handleClick);
    root.addEventListener("input", handleInput);
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleKeydown);
    render();
  }

  global.RTWizard = { init: init };
})(window);
