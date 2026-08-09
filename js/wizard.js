/**
 * Step-by-step assessment wizard. Owns rendering and interaction for
 * #wizard-root; reads questions/outcomes from RTModel, RPI math from
 * RTEnrichment, and icons from RTIcons. Has no knowledge of the tree
 * explorer or info panel views.
 *
 * Flow: an optional CVSS score is entered once, up front, and locked in as
 * soon as the user continues (no way back to change it) — then the four
 * CISA questions proceed as normal.
 */
(function (global) {
  "use strict";

  var QUESTIONS = global.RTModel.QUESTIONS;

  var root = null;
  var state = {
    cvss: null,
    cvssEntered: false,
    answers: {},
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
    if (!state.cvssEntered) {
      root.innerHTML = cvssStepMarkup();
      var cvssInput = document.getElementById("cvss-input");
      if (cvssInput) cvssInput.focus();
    } else if (isComplete()) {
      root.innerHTML = resultMarkup();
      var heading = document.getElementById("result-heading");
      if (heading) heading.focus();
    } else {
      root.innerHTML = questionMarkup(QUESTIONS[answeredCount()]);
      var firstOption = root.querySelector(".option");
      if (firstOption) firstOption.focus();
    }
  }

  function cvssStepMarkup() {
    return (
      '<div class="question-card">' +
      '<p class="question-card__eyebrow">Before you start</p>' +
      '<h2 class="question-card__title">What&rsquo;s the CVSS base score? ' +
      bubbleMarkup(
        "cvss",
        "About CVSS and RPI",
        "<p>This is only used to compute RPI (Risk Priority Index), a bonus score that blends " +
        "it with your result below. The CISA timeline result itself never depends on CVSS.</p>"
      ) +
      "</h2>" +
      '<div class="cvss-field">' +
      '<input type="number" id="cvss-input" min="0" max="10" step="0.1" placeholder="e.g. 8.6">' +
      '<p class="cvss-field__hint">Optional &mdash; leave it blank to skip. It&rsquo;s locked in as soon as you continue.</p>' +
      "</div>" +
      '<div class="question-card__nav">' +
      '<button class="btn btn--primary" data-action="cvss-continue" type="button">Continue</button>' +
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
      '<p class="result__summary">' + outcome.summary + "</p>" +
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

  function rpiSectionMarkup(outcome) {
    var rpi = global.RTEnrichment.computeRPI(outcome, state.cvss);

    if (!rpi) {
      return (
        '<div class="rpi-section rpi-section--empty" id="rpi-section">' +
        '<p class="rpi-section__prompt">No CVSS score was provided, so no RPI (Risk Priority Index) ' +
        "applies to this assessment.</p>" +
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

  // ---- interaction -----------------------------------------------------

  function commitCvss() {
    var input = document.getElementById("cvss-input");
    var raw = input ? input.value.trim() : "";
    state.cvss = raw === "" ? null : parseFloat(raw);
    state.cvssEntered = true;
    render();
  }

  function restart() {
    state.answers = {};
    state.cvss = null;
    state.cvssEntered = false;
    render();
  }

  function handleClick(e) {
    var actionEl = e.target.closest("[data-action]");
    if (!actionEl || actionEl.disabled) return;

    switch (actionEl.getAttribute("data-action")) {
      case "cvss-continue":
        commitCvss();
        break;
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
        restart();
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

  // Keyboard accelerators. Suppressed while the info panel is open, since
  // that owns keyboard input (and its own focus trap) at that point.
  function handleKeydown(e) {
    var infoPanel = document.getElementById("info-panel");
    if (infoPanel && !infoPanel.hidden) return;

    if (e.key === "Escape") {
      closeOpenTip();
      return;
    }

    if (!state.cvssEntered) {
      if (e.key === "Enter" && e.target.id === "cvss-input") commitCvss();
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

    var options = root.querySelectorAll(".option");
    if (options.length === 0) return;

    // Arrow keys move focus between the two options; Enter/Space then
    // activates whichever is focused (native <button> behavior — no extra
    // code needed for that part). Any arrow direction works both ways,
    // since the two options can sit side by side or stacked depending on
    // viewport width.
    var isArrow = e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowLeft";
    if (isArrow) {
      var list = Array.prototype.slice.call(options);
      var forward = e.key === "ArrowDown" || e.key === "ArrowRight";
      var currentIndex = list.indexOf(document.activeElement);
      var nextIndex = currentIndex === -1 ? 0 : (currentIndex + (forward ? 1 : -1) + list.length) % list.length;
      e.preventDefault();
      list[nextIndex].focus();
      return;
    }

    if (e.key === "1" || e.key === "2") {
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

  global.RTWizard = { init: init, restart: restart };
})(window);
