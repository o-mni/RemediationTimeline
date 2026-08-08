/**
 * Small hand-drawn line-icon set, keyed by outcome id, shared by the wizard
 * result badge and the tree explorer's outcome pills. Centralized here so
 * both views stay visually consistent and there is one place to change an
 * icon. Markup only — sizing/color is controlled by CSS via currentColor.
 */
(function (global) {
  "use strict";

  var ICONS = {
    // 3 Days & Forensic Triage — magnifying glass with a small clock hand,
    // pairing "investigate" with "time-critical".
    "3DF":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/>' +
      '<path d="M10.5 7.5v3l2 1.5"/><path d="M15.5 15.5 21 21"/></svg>',

    // 3 Days — a bolt, for "urgent / act now".
    "3D":
      '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none">' +
      '<path d="M12.5 3 5 13h5l-1 8 8-11h-5.5z"/></svg>',

    // 14 Days — a clock face.
    "14D":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/>' +
      '<path d="M12 8v4l3 2"/></svg>',

    // 60 Days — a calendar page.
    "60D":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="2"/>' +
      '<path d="M4 10h16M8 3v4M16 3v4"/></svg>',

    // Fix on System Upgrade — a wrench, for scheduled maintenance.
    FSU:
      '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none">' +
      '<path d="M17 3a4 4 0 0 0-4.9 4.9L4 16l4 4 8.1-8.1A4 4 0 0 0 21 7l-3 3-2-2z"/></svg>',
  };

  global.RTIcons = {
    markup: function (outcomeId) {
      return ICONS[outcomeId] || "";
    },
  };
})(window);
