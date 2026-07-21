# PolitiDex Distributional Impact Ledger ("Who It Affects")

PolitiDex's "promises, money, receipts" mission has a class-and-economic dimension:
*who does a policy actually help or cost?* This document covers the **Distributional
Impact Ledger** — a transparent, sourced, per-cohort read of how a measure's costs and
benefits fall across income and economic groups.

It is the third sibling of the Evidence Locker's
[`_strength()`](./EVIDENCE_STRENGTH.md) and the Follow-the-Money
[Constituents-First signal](./FINANCE_INTEGRITY.md): it reports a **structural fact**
— who is affected and which way — **not** whether we agree with the policy, and every
figure lists the scorekeeper and links to the source so it never reads as a black box.
The data lives in the `vr_distributional_impacts` table and is served, read-only, by
the Voting Record Function at `GET /api/voting-record/measure/:id`.

## The rule: report distribution, never render a verdict

For every impact, ask:

> **"According to a named nonpartisan scorekeeper, whose costs or benefits does this
> change — and in which direction?"**

Report **cohort + direction + magnitude + source**. Never editorialize.

- ✅ "CBO estimates the lowest income decile loses about $1,200/year (3.1% of income), mainly from Medicaid and SNAP changes."
- ❌ "A giveaway to the rich that guts the safety net."
- ✅ "The Tax Policy Center estimates about 60% of the tax cut goes to the top income quintile."
- ❌ "Rigged for the wealthy."

This follows [`CONTENT_STYLE.md`](./CONTENT_STYLE.md): describe the measure and the
recorded facts, keep language neutral, and never substitute a party or a motive for a
sourced number.

## The cohorts

Cohorts are anchored to how official scorekeepers already slice the data, so each
bucket is auditable rather than rhetorical. Every cohort carries a one-line definition
in the UI.

| Cohort key | Meaning | Anchored to |
|---|---|---|
| `working_middle` | Working & middle-income households | Income quintiles / deciles (Census, CBO, JCT) |
| `small_biz_contractors` | Small businesses & independent contractors | Pass-through / Schedule-C / 1099 filers (JCT, SBA, Treasury OTA) |
| `large_corporations` | Large corporations | C-corp / large-filer categories (JCT, CBO) |
| `high_income_wealth` | High-income & high-wealth individuals | Top 5% / 1% / 0.1% brackets (JCT, Tax Policy Center) |
| `government_insiders` | Government & insiders | Agencies, incumbents, and concentrated federal contractors (USASpending, GAO) |

## Direction and magnitude

- `direction` is one of `benefit`, `cost`, `mixed`, `neutral`. It is **descriptive**,
  not a value judgement. Both cost and benefit rows are expected for a real measure —
  a one-sided ledger is a review red flag.
- `magnitude_value` + `magnitude_unit` hold a comparable quantity when one exists
  (e.g. `-3.1` with unit `pct_income`). `magnitude_label` carries a human-readable
  figure when no clean number applies (e.g. "about 10 million more uninsured"). The UI
  scales its bars only from the comparable `pct_income` rows; qualitative rows render
  as a clearly marked, not-to-scale chip.

## Evidence strength

Every row is graded, mirroring the Evidence Locker's ladder:

| Grade | Meaning |
|---|---|
| **strong** | An official CBO / JCT / Treasury distributional table. |
| **moderate** | A single named independent model (e.g. Tax Policy Center, Penn Wharton). |
| **limited** | A directional inference where a per-cohort magnitude was not published. |

The grade and its reason are shown on every impact, so an upgrade or a caveat always
explains itself.

## Sourcing and verifiability

- **Every row carries a NOT NULL `source_url` and `source_label`.** The Function
  refuses to emit any impact that lacks a source — the same posture every other `vr_*`
  record takes.
- **Nonpartisan / official sources first**: Congressional Budget Office (CBO), Joint
  Committee on Taxation (JCT), Treasury Office of Tax Analysis, GAO, CRS. Independent
  models (Tax Policy Center, Penn Wharton) add breadth.
- **Show divergence, don't resolve it.** When scorekeepers disagree, store each
  estimate as its own row with its own `source_label`. The panel shows the range; it
  never picks a winner.
- **Freshness is visible.** Every row carries an `as_of` date that surfaces in the UI.

## The standing disclaimer

The panel always shows, verbatim in spirit:

> This shows **who** a measure's estimated costs and benefits fall on, by economic
> group, using nonpartisan scorekeepers. It describes **distribution and access** —
> not corruption, motive, or whether the policy is good or bad.

This is the same posture as the finance signal: an estimated distributional effect is
a structural fact that public analysis exists to reveal. It does not, on its own,
imply intent or wrongdoing.

## Where it shows up

- **Bill detail → "⚖️ Who It Affects"** — the cohort bar, per-cohort impact rows with
  evidence badges, a "Why this reading" disclosure, and a "Verify at source" link on
  every figure. Rendered by `impact-ledger.js` (`window.PDXImpactLedger`), styled by
  `impact-ledger.css` (`.pdx-il-*`).
- **Promise Tracker → "Say vs. Do" for claimed beneficiaries** — see below.

## Promise Tracker integration (Say vs. Do)

A tracked promise may carry two OPTIONAL fields (both additive; absence changes
nothing):

- `claimedBeneficiary` — a cohort key (the same five keys above) naming who the
  promise *says* it helps. This is the "Say".
- `impactMeasureId` — the `vr_measures` id whose Distributional Impact Ledger is the
  receipt for the promise. This unlocks the "Do".

Where a promise names a `claimedBeneficiary`, the Promise Tracker shows a
"🗣️ Says this helps: <cohort>" line. Where it *also* links an `impactMeasureId`, a
compact summary is filled in beside it: the **net direction and top sourced figure**
that nonpartisan scorekeepers estimate for that *same* cohort on the linked measure,
with an evidence badge and a "Verify at source" link. The stated beneficiary and the
scored effect sit side by side.

This deliberately stops short of a verdict. It never labels the promise "kept" or
"broken" on the distributional axis (that verdict field stays admin-assigned); it
shows the claim and the sourced estimate and lets the reader see whether they line up.
A standing note repeats that the summary describes **distribution, not motive**.

Implementation: the promise row calls the optional global
`window._pdxPromiseImpactHTML(id, profile, promise)` (defined in `impact-ledger.js`,
same pattern as the existing `_pdxPromiseVideo` / `_pdxPromiseEvidenceLink` helpers).
It emits a placeholder that a self-wiring hydrator fills asynchronously, reusing the
already-cached `PDXBills.get(measureId)` measure fetch (no new API). The cohort's
figures come straight from the measure's `impacts`, so the same sourcing and
evidence-strength rules apply unchanged.

## Follow the Money — Side by Side (profile)

On a politician profile, a dedicated section pairs the two public-record facts the
platform already tracks:

- **Who funds them** — a compact recap of the existing Constituents-First finance
  signal (`window._pdxFinanceSignal(id)`): the 0–100 score, its level, and the
  small-dollar vs. large-individual+PAC shares. Nothing is recomputed; it restates the
  signal object, with a "Full finance breakdown →" link to Follow the Money.
- **Who their key votes affect** — the measures this official has a recorded vote or
  position on that *also* carry Distributional Impact Ledger rows, each shown with the
  official's own recorded action (e.g. "Voted Yea") and a per-cohort net-direction chip
  row, plus a "Verify" link to the measure's source.

The section renders only when a finance signal exists, and the distributional column
fills asynchronously from a new **read-only** route,
`GET /api/voting-record/member/:id/impacts`, which returns only the member's measures
that have ledger data (same source + cohort/direction/strength guards as
`/measure/:id`). If the official has no ledger-scored votes, the section hides itself
rather than showing an empty pairing.

A standing disclaimer makes the boundary explicit: the pairing shows **financial
access and distributional effect — not corruption, motive, or causation**. This is the
same posture as the finance signal itself: co-occurrence of funding and distributional
effect is a matter of public record, and does not, on its own, imply a quid pro quo.
The section computes no "aligned/misaligned" verdict; it places the two sourced facts
side by side and lets the reader draw the connection.

Implementation: `impact-ledger.js` defines `window._pdxMemberImpactsSideBySide(id, sig)`
(the section) and the async hydrator; the profile calls it with the same optional-global
pattern used elsewhere. No new write paths.

## Issue-level summary (Stance Library + Issue Spotlights)

Each tracked issue gets a net, cohort-level read of the measures that concern it. The
**Stance Library** issue detail and the **Issue Spotlight** overlay both drop a
self-hydrating placeholder — `window._pdxIssueImpactsPlaceholder(issueKey)` — that
fills from a new **read-only** route, `GET /api/voting-record/issue/:issueKey/impacts`.

Attribution is precise, not broad: an impact counts toward an issue only when its
provision is tagged to that issue key, or (for a whole-measure impact with no
provision) when the measure's *primary* issue is that key. So a bundled megabill
contributes each impact only to the issue it actually touches — H.R. 1's Medicaid
provision shows under Healthcare, its clean-energy provision under Climate, never
under every issue the bill spans. The route aggregates the matching rows by cohort
into a net direction (benefit / cost / mixed) and lists the contributing measures.

The Stance Library passes a single issue key; the Issue Spotlight passes a core
issue's component keys (comma-joined), which the hydrator merges into one card. Both
placeholders stay hidden until data lands, so an issue with no ledger-scored measures
shows nothing. The card is directional and sourced, repeats the "distribution and
access — not motive or causation" note, and points to the bill panel for the full
breakdown. No new write paths.

Future, additive surfaces (not yet built): issue-level rollups of distributional effect.

## Adding or refreshing data

Impacts are seeded via roll-forward migrations in `netlify/database/migrations/`
(never edit an applied migration). Each row must:

1. Name a real, citable scorekeeper and link to it (`source_label`, `source_url`).
2. Quote the figure as that body published it, with an `as_of` date and a one-line
   `methodology` note.
3. Map to a defined cohort and, where it applies to one bundled piece, the matching
   `provision_id`.
4. Be graded honestly (`strong` / `moderate` / `limited`).

Never invent, round beyond the source, or overstate a figure. When in doubt, grade it
`limited` and say why in the methodology note.

## Seeded coverage

The ledger is data-driven: any measure with `vr_distributional_impacts` rows lights up
the bill panel, the Promise Tracker "Say vs. Do", and the profile side-by-side with no
code change. Seeded so far (all additive, roll-forward migrations):

- **H.R. 1 — One Big Beautiful Bill Act** (CBO, JCT, Tax Policy Center)
- **S. 129 — No Tax on Tips Act** (The Budget Lab at Yale)
- **H.R. 82 — Social Security Fairness Act** (CBO)
- **H.R. 6703 — Lower Health Care Premiums for All Americans Act** (CBO / JCT)

Each carries both benefit and cost rows and spans the relevant cohorts, so no measure
reads one-sided.
