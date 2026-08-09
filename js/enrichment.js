/**
 * Optional result enrichment, layered on top of an RTModel outcome: blends
 * the outcome's timeline severity with an optional CVSS base score into RPI
 * (Risk Priority Index), a single 0-100 number for ranking several
 * vulnerabilities that land on the same tier. A pure function only — no
 * DOM — so it stays independent of how/when wizard.js calls it.
 */
(function (global) {
  "use strict";

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
    computeRPI: computeRPI,
  };
})(window);
