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

Future, additive surfaces (not yet built): a Follow-the-Money side-by-side (who funds
them vs. who their record affects), a promise `claimedBeneficiary` Say-vs-Do check,
and issue-level rollups.

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
