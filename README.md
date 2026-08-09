# Remediation Timeline Advisor

A small static web app that answers one question: **given a vulnerability's
exposure, exploitation, and impact, how fast does it actually need to be
fixed?**

Answer four quick questions and it returns the exact CISA-aligned deadline —
plus, optionally, a combined CVSS + timeline priority score. No build step,
no server, no database. Open `index.html` and it works.

> **Unofficial, independent project.** Not affiliated with or endorsed by
> CISA. It implements a public methodology; it is not that methodology's
> source of truth. See [Sources & methodology](#sources--methodology).

---

## Why this exists

CISA's [Binding Operational Directive 26-04](https://www.cisa.gov/news-events/directives/bod-26-04-prioritizing-security-updates-based-risk)
replaced flat, CVSS-only patch deadlines with a risk-based decision tree:
the same "Critical, 9.8" vulnerability can be a 3-day emergency or a 60-day
routine fix depending on context — is it reachable from the internet, is it
already being exploited, can an attacker automate the attack, and how much
control does it actually hand over. That's a real improvement, but it means
the deadline isn't a lookup table anymore — it's a four-branch decision
tree, and tracing it by hand from a static chart is slow and easy to get
wrong under pressure.

This tool turns that chart into something you click through in fifteen
seconds, with the same terminology and branch order as the source chart, so
the answer is both fast and traceable back to how it was reached.

## How it works

You can optionally enter a CVSS base score first — it locks in as soon as
you continue, since it wouldn't make sense to let it change partway through
an assessment. Then come four questions, always in this order, matching
CISA's own decision tree:

1. **Publicly exposed** — reachable by unauthenticated/untrusted users over
   a public network, vs. behind network controls.
2. **On the KEV** — listed in CISA's Known Exploited Vulnerabilities
   catalog (confirmed active exploitation).
3. **Automatable** — can an attacker script reconnaissance through
   exploitation at scale, with no bespoke effort per target?
4. **Technical impact** — does successful exploitation hand over *total*
   control, or something more *partial*?

Each answer branches to the next question; the fourth answer resolves to
one of five outcomes:

| Outcome | Meaning |
|---|---|
| **3 Days & Forensic Triage** | Most urgent tier — remediate in 3 days *and* run a compromise assessment |
| **3 Days** | Urgent — top operational priority |
| **14 Days** | Accelerated remediation window |
| **60 Days** | Standard remediation window |
| **Fix on System Upgrade** | No mandated deadline — bundle with the next scheduled upgrade |

The full 16-path tree (every combination of the four answers) is browsable
in one place via the **ⓘ** button in the top-right corner, alongside the
definition and "who typically assesses this" for each of the four factors.

## RPI — Risk Priority Index

CVSS on its own is exactly what BOD 26-04 moved away from: a 9.8 with no
exposure and no exploitation isn't more urgent than a 6.5 that's KEV-listed
and internet-facing. So RPI doesn't treat CVSS as the main signal — it uses
it as a *tiebreaker* on top of the timeline tier, for the practical case of
ranking several vulnerabilities that all land on the same deadline.

```
RPI = round( 0.7 × tier_component + 0.3 × cvss_component )

tier_component = (severity - 1) / 4 × 100     severity: 1 (FSU) .. 5 (3DF)
cvss_component = cvss_score × 10              cvss_score: 0.0 .. 10.0
```

Visually, the timeline tier does most of the work; CVSS only nudges the
result within that tier:

```
 RPI  =  [ Timeline tier ██████████████████████████████████ 70% ]
        +[ CVSS score    ███████████████                    30% ]
```

**Tier → severity → tier_component:**

| Timeline tier | severity | tier_component |
|---|---|---|
| 3 Days & Forensic Triage | 5 | 100 |
| 3 Days | 4 | 75 |
| 14 Days | 3 | 50 |
| 60 Days | 2 | 25 |
| Fix on System Upgrade | 1 | 0 |

**Worked example** — outcome is "3 Days & Forensic Triage", CVSS is 8.6:

```
tier_component = (5 - 1) / 4 × 100 = 100
cvss_component = 8.6 × 10           = 86

RPI = round(0.7 × 100 + 0.3 × 86)
    = round(70 + 25.8)
    = round(95.8)
    = 96  →  Critical Priority
```

**Score bands:**

| RPI score | Band |
|---|---|
| 85–100 | Critical Priority |
| 65–84 | High Priority |
| 45–64 | Elevated Priority |
| 25–44 | Moderate Priority |
| 0–24 | Low Priority |

CVSS is optional and entered only once, before the four questions — if you
skip it, RPI simply doesn't appear on the result. The formula lives in
[`js/enrichment.js`](js/enrichment.js) if you want to read it as code
instead of prose.

## Running it

There's nothing to install or build. Either:

- Double-click `index.html`, or
- Serve the folder with any static file server (e.g. `python -m http.server`)
  and open it in a browser.

Everything runs client-side. Nothing you enter is transmitted or stored
anywhere — there's no backend to send it to.

## Project structure

| File | Purpose |
|---|---|
| `index.html` | Page shell: header, main, footer, info panel markup |
| `css/styles.css` | All styling — design tokens, components, dark mode |
| `js/model.js` | Source of truth: the 4 questions + 16-outcome table |
| `js/icons.js` | Shared outcome icons (result badge, tree, legend) |
| `js/enrichment.js` | RPI formula (pure function) |
| `js/wizard.js` | The step-by-step question flow + result screen |
| `js/treeExplorer.js` | Full 16-path tree, mounted inside the info panel |
| `js/infoPanel.js` | The ⓘ slide-in panel: methodology, terms, tree, sources |
| `js/app.js` | Bootstraps the wizard + info panel on page load |

`model.js` has no DOM code in it on purpose — the wizard, the tree explorer,
and the info panel all read the same question/outcome data, so the four
factors' definitions can't drift out of sync between where they're shown.

## Sources & methodology

- [CISA BOD 26-04 — Prioritizing Security Updates Based on Risk](https://www.cisa.gov/news-events/directives/bod-26-04-prioritizing-security-updates-based-risk)
- [CISA Stakeholder-Specific Vulnerability Categorization (SSVC)](https://www.cisa.gov/stakeholder-specific-vulnerability-categorization-ssvc)
- [CISA Known Exploited Vulnerabilities (KEV) Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)

In most organizations the four factors aren't judged by one person:
exposure typically comes from security/asset-management teams with
attack-surface visibility, KEV and automatability are usually sourced from
vulnerability management or threat-intel feeds (e.g. CISA's Vulnrichment
data), and technical impact is judged jointly by the system owner and a
security engineer. RPI is this project's own addition, not part of CISA's
methodology.

## Disclaimer

This is an independent, unofficial reference tool. It is a decision aid,
not a replacement for your organization's own policy, legal/compliance
guidance, or a qualified analyst's judgment.
