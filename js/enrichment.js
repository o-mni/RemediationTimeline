/**
 * Optional result enrichment, layered on top of an RTModel outcome:
 *
 * - computeDeadline: turns "3 Days" into an actual calendar date, and flags
 *   how many of those calendar days fall on a weekend (CISA's clock runs in
 *   calendar days and does not pause for weekends, but most teams cannot
 *   remediate then, so the two numbers can differ sharply).
 * - computeRPI: blends the outcome's timeline severity with an optional
 *   CVSS base score into RPI (Risk Priority Index), a single 0-100 number
 *   for ranking several vulnerabilities that land on the same tier.
 *
 * Pure functions only — no DOM — so wizard.js can call these on every
 * keystroke without this module knowing anything about rendering.
 */
(function (global) {
  "use strict";

  var WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Parses a "YYYY-MM-DD" <input type="date"> value as a local-time date.
  // (new Date("YYYY-MM-DD") parses as UTC midnight, which can silently
  // shift a day in either direction once read back with local getters —
  // splitting and using the numeric constructor avoids that entirely.)
  function parseDateInput(value) {
    var parts = value.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function formatDateInput(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, "0");
    var d = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function addDays(date, days) {
    var result = new Date(date.getTime());
    result.setDate(result.getDate() + days);
    return result;
  }

  function isWeekend(date) {
    var day = date.getDay();
    return day === 0 || day === 6;
  }

  function formatLongDate(date) {
    return WEEKDAY_NAMES[date.getDay()] + ", " + MONTH_NAMES[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
  }

  /**
   * @param {Object} outcome - an RTModel outcome (needs .days)
   * @param {string} evaluatedOnISO - "YYYY-MM-DD"
   * @returns {Object|null} null when the outcome has no fixed day count (FSU)
   */
  function computeDeadline(outcome, evaluatedOnISO) {
    if (!outcome.days) return null;

    var start = parseDateInput(evaluatedOnISO);
    var deadline = addDays(start, outcome.days);

    var weekendDays = 0;
    for (var i = 1; i <= outcome.days; i++) {
      if (isWeekend(addDays(start, i))) weekendDays++;
    }

    return {
      deadlineLabel: formatLongDate(deadline),
      deadlineWeekdayName: WEEKDAY_NAMES[deadline.getDay()],
      deadlineIsWeekend: isWeekend(deadline),
      weekendDaysInWindow: weekendDays,
      workingDays: outcome.days - weekendDays,
    };
  }

  // Ordered most-to-least severe; first band whose floor the score clears wins.
  var RPI_BANDS = [
    { min: 85, id: "critical", label: "Critical Priority" },
    { min: 65, id: "high", label: "High Priority" },
    { min: 45, id: "elevated", label: "Elevated Priority" },
    { min: 25, id: "moderate", label: "Moderate Priority" },
    { min: 0, id: "low", label: "Low Priority" },
  ];

  /**
   * RPI (Risk Priority Index): weighted 70% toward the outcome's CISA
   * timeline severity and 30% toward CVSS, so exposure/exploitation
   * context outweighs raw technical severity — the same reasoning BOD
   * 26-04 itself uses to move prioritization off CVSS alone.
   * @param {Object} outcome - an RTModel outcome (needs .severity, 1-5)
   * @param {number|null} cvss - CVSS base score 0-10, or null if unset
   * @returns {Object|null} null when no valid CVSS score was provided
   */
  function computeRPI(outcome, cvss) {
    if (cvss === null || cvss === undefined || isNaN(cvss)) return null;

    var clampedCvss = Math.max(0, Math.min(10, cvss));
    var tierComponent = ((outcome.severity - 1) / 4) * 100;
    var cvssComponent = clampedCvss * 10;
    var score = Math.round(0.7 * tierComponent + 0.3 * cvssComponent);

    var band = RPI_BANDS.filter(function (b) {
      return score >= b.min;
    })[0];

    return { score: score, band: band.id, bandLabel: band.label };
  }

  global.RTEnrichment = {
    todayISO: function () {
      return formatDateInput(new Date());
    },
    computeDeadline: computeDeadline,
    computeRPI: computeRPI,
  };
})(window);
