/**
 * Decision model for the Remediation Timeline Advisor.
 *
 * This is the single source of truth for the questions, their order, and the
 * 16-outcome lookup table. It is transcribed directly from CISA's Remediation
 * Timelines chart (BOD 26-04 / SSVC-informed decision tree) and has no DOM or
 * rendering code in it, so it can be reused by both the wizard and the tree
 * explorer without duplication.
 *
 * Sources:
 * - CISA BOD 26-04, "Prioritizing Security Updates Based on Risk"
 *   https://www.cisa.gov/news-events/directives/bod-26-04-prioritizing-security-updates-based-risk
 * - CISA Stakeholder-Specific Vulnerability Categorization (SSVC)
 *   https://www.cisa.gov/stakeholder-specific-vulnerability-categorization-ssvc
 */
(function (global) {
  "use strict";

  // Ordered questions, exactly matching the branch order in the source chart:
  // Publicly Exposed -> On the KEV -> Automatable -> Technical Impact.
  var QUESTIONS = [
    {
      id: "exposed",
      step: 1,
      shortLabel: "Exposure",
      title: "Is the affected asset publicly exposed?",
      subtitle:
        "Reachable by unauthenticated or untrusted entities over a public network (the internet), as opposed to sitting behind network controls that limit access to trusted users.",
      assessedBy: "Security / asset management (attack-surface & network visibility)",
      options: [
        {
          value: "Y",
          label: "Publicly exposed",
          hint: "Internet-facing or reachable by untrusted networks",
        },
        {
          value: "N",
          label: "Not publicly exposed",
          hint: "Internal only, or access is restricted to trusted users",
        },
      ],
    },
    {
      id: "kev",
      step: 2,
      shortLabel: "KEV",
      title: "Is the vulnerability on CISA's KEV catalog?",
      subtitle:
        "The Known Exploited Vulnerabilities (KEV) catalog lists CVEs CISA has confirmed are being actively exploited in the wild.",
      assessedBy: "Vulnerability management / threat intelligence (KEV catalog lookup)",
      options: [
        {
          value: "Y",
          label: "On the KEV",
          hint: "Confirmed active exploitation in the wild",
        },
        {
          value: "N",
          label: "Not on the KEV",
          hint: "No confirmed active exploitation on record",
        },
      ],
    },
    {
      id: "automatable",
      step: 3,
      shortLabel: "Automatable",
      title: "Can exploitation be automated?",
      subtitle:
        "Can an attacker reliably script or automate reconnaissance, weaponization, delivery, and exploitation (kill-chain steps 1–4) with no bespoke manual effort per target?",
      assessedBy: "Vulnerability management / exploit intelligence (e.g. CISA Vulnrichment)",
      options: [
        {
          value: "Y",
          label: "Automatable",
          hint: "Scriptable at scale across many targets",
        },
        {
          value: "N",
          label: "Not automatable",
          hint: "Requires significant manual effort or bespoke conditions",
        },
      ],
    },
    {
      id: "impact",
      step: 4,
      shortLabel: "Impact",
      title: "What is the technical impact of exploitation?",
      subtitle:
        "How much control or information exposure does successful exploitation actually hand the attacker?",
      assessedBy: "System/application owner with vulnerability management or security engineering",
      options: [
        {
          value: "T",
          label: "Total",
          hint: "Complete control of the asset, or total loss of confidentiality/integrity/availability",
        },
        {
          value: "P",
          label: "Partial",
          hint: "Limited control or information exposure, short of full compromise",
        },
      ],
    },
  ];

  // Outcome definitions, keyed by short id. Colors/icons are referenced by
  // key from CSS (see [data-outcome] selectors in styles.css) so this stays
  // presentation-agnostic.
  var OUTCOMES = {
    "3DF": {
      id: "3DF",
      label: "3 Days & Forensic Triage",
      days: 3,
      severity: 5,
      forensic: true,
      summary:
        "The most urgent tier: remediate or mitigate within 3 days AND perform a forensic triage of the asset to check for compromise.",
    },
    "3D": {
      id: "3D",
      label: "3 Days",
      days: 3,
      severity: 4,
      forensic: false,
      summary: "Urgent remediation — treat as a top operational priority and remediate or mitigate within 3 days.",
    },
    "14D": {
      id: "14D",
      label: "14 Days",
      days: 14,
      severity: 3,
      forensic: false,
      summary: "Accelerated remediation window — remediate or mitigate within 14 days.",
    },
    "60D": {
      id: "60D",
      label: "60 Days",
      days: 60,
      severity: 2,
      forensic: false,
      summary: "Standard remediation window — remediate or mitigate within 60 days.",
    },
    FSU: {
      id: "FSU",
      label: "Fix on System Upgrade",
      days: null,
      severity: 1,
      forensic: false,
      summary:
        "No accelerated deadline is mandated — remediate at the next scheduled system, platform, or software upgrade cycle.",
    },
  };

  // The 16-row lookup table, transcribed row-by-row from the source chart.
  // Key format: "<exposed><kev><automatable><impact>" using the option
  // values above (Y/N/Y/N and T/P).
  var OUTCOME_TABLE = {
    YYYT: "3DF",
    YYYP: "3D",
    YYNT: "3DF",
    YYNP: "14D",
    YNYT: "3D",
    YNYP: "14D",
    YNNT: "14D",
    YNNP: "60D",
    NYYT: "3DF",
    NYYP: "14D",
    NYNT: "14D",
    NYNP: "14D",
    NNYT: "60D",
    NNYP: "60D",
    NNNT: "FSU",
    NNNP: "FSU",
  };

  // The table above is hand-transcribed from the source chart, so guard
  // against a typo'd key or dangling outcome id silently breaking a branch:
  // every one of the 2^4 combinations must be present and resolve to a
  // known outcome.
  (function validateOutcomeTable() {
    var expectedKeys = [];
    ["Y", "N"].forEach(function (e) {
      ["Y", "N"].forEach(function (k) {
        ["Y", "N"].forEach(function (a) {
          ["T", "P"].forEach(function (i) {
            expectedKeys.push(e + k + a + i);
          });
        });
      });
    });
    expectedKeys.forEach(function (key) {
      var outcomeId = OUTCOME_TABLE[key];
      if (!outcomeId || !OUTCOMES[outcomeId]) {
        throw new Error("RTModel: OUTCOME_TABLE is missing or misconfigured for key '" + key + "'");
      }
    });
    if (Object.keys(OUTCOME_TABLE).length !== expectedKeys.length) {
      throw new Error("RTModel: OUTCOME_TABLE has an unexpected number of entries");
    }
  })();

  /**
   * @param {Object} answers - map of questionId -> option value, e.g.
   *   { exposed: "Y", kev: "N", automatable: "Y", impact: "T" }
   * @returns {Object|null} the outcome object, or null if answers are incomplete/invalid
   */
  function resolveOutcome(answers) {
    // Array#join renders a missing/undefined answer as "" rather than the
    // string "undefined", so an incomplete answer set is caught by the
    // resulting key falling short of one character per question.
    var key = QUESTIONS.map(function (q) {
      return answers[q.id];
    }).join("");

    if (key.length !== QUESTIONS.length) {
      return null;
    }

    var outcomeId = OUTCOME_TABLE[key];
    return outcomeId ? OUTCOMES[outcomeId] : null;
  }

  /**
   * Recursively builds a nested tree (mirroring the source chart's layout)
   * from QUESTIONS + OUTCOME_TABLE, for the full tree explorer view.
   * @returns {Object} root node
   */
  function buildTree() {
    function branch(depth, answers) {
      if (depth === QUESTIONS.length) {
        return { leaf: true, outcome: resolveOutcome(answers) };
      }
      var question = QUESTIONS[depth];
      return {
        leaf: false,
        question: question,
        children: question.options.map(function (opt) {
          var nextAnswers = {};
          Object.keys(answers).forEach(function (k) {
            nextAnswers[k] = answers[k];
          });
          nextAnswers[question.id] = opt.value;
          return {
            option: opt,
            node: branch(depth + 1, nextAnswers),
          };
        }),
      };
    }
    return branch(0, {});
  }

  global.RTModel = {
    QUESTIONS: QUESTIONS,
    OUTCOMES: OUTCOMES,
    OUTCOME_TABLE: OUTCOME_TABLE,
    resolveOutcome: resolveOutcome,
    buildTree: buildTree,
  };
})(window);
