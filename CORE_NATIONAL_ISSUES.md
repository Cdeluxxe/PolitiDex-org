# PolitiDex Core National Issues (2026)

PolitiDex prioritizes the highest-salience **national** issues so federal
profiles and the Evidence Locker go deep on what voters weigh most, rather than
spreading thin across many smaller or generic topics. This is the priority
framework that should guide federal content going forward.

Each core issue is a **bundle of existing `ISSUE_MAP` issueKeys** — the same
vocabulary every stance, evidence item, and Alignment pick already uses. A
politician "covers" a core issue when any of their documented stances or evidence
is keyed to one of that issue's keys. The framework is additive metadata: it never
changes how an individual stance is written or scored.

**This table is the site's only issue taxonomy, and it has exactly two levels.**

- A **core** is a *table of contents*. It is somewhere to browse from. It has no
  record of its own, nothing on this site characterises a person "on" a core, and
  no surface ranks people inside one.
- A **child** — an `ISSUE_MAP` key — *is* the issue profile. Its record ledger
  (census, bands, mapped measures) is read by exact key through
  `PDXConsistency.formalPatternIndex.rowFor(pid, key)`. There is no third level and
  no second map.

Every published `ISSUE_MAP` key (one with a label) has **exactly one** parent here.
That is an invariant, not an aspiration: `scripts/test-issue-family.mjs` fails on an
orphan and fails on a key two cores claim.

Source of truth: `CORE_NATIONAL_ISSUES` in `alignment-tool.js` (published on
`window.CORE_NATIONAL_ISSUES`, with `window.coreIssueForKey(issueKey)` for reverse
lookup). Every surface reads it through **`window.PDXIssueFamily`**
(`pdx-issue-family.js`) rather than grouping keys its own way:

| Read | Answers |
|---|---|
| `coreOf(key)` | the key's one parent core id, or `''` if off-register |
| `childrenOf(coreId)` | that core's published child keys, in display order |
| `label(coreId)` | the core's own declared label |
| `crumb(key)` | `{ coreLabel, childLabel, text }` — "Core label → Child label" |
| `orphans()` / `duplicates()` | the audit reads the test hangs on; both are meant to stay empty |
| `profileUrl(key)` | a **naming hook only** — the address a later permalink pass would use. Nothing routes it, and no chip or ledger waits on it. |

Validated by `scripts/define-core-national-issues-jun2026.mjs` and
`scripts/test-issue-family.mjs`.

## The thirteen core issues (ordered by 2026 salience)

| # | Core National Issue | Component `ISSUE_MAP` keys |
|---|---|---|
| 1 | **Economy, Cost of Living & Infrastructure** | `cost_living`, `tax_middle_class`, `prop_tax`, `econ_growth`, `econ_smallbiz`, `econ_trade`, `econ_balance`, `econ_workers`, `econ_corp_account`, `rural_ag`, `housing`, `housing_build`, `housing_support`, `housing_first_time`, `homeless`, `property_tax`, `tariffs_china`, `tariffs_growth`, `tariffs_prices`, `tariffs_authority`, `crypto_cbdc`, `sound_money` ★, `dev_district_finance` ★, `child_care` ★, `paid_leave` ★, `family_support` ★, `infrastructure` ★, `transit` ★, `broadband` ★, `tech_innovation` ★, `tech_balance` ★ |
| 2 | **Immigration & Border Security** | `border_security`, `immig_legal`, `immig_balance`, `immigration_reform`, `immig_fentanyl`, `deportations` |
| 3 | **Healthcare Costs & Access** | `healthcare_market`, `health_drug_prices`, `health_balance`, `healthcare`, `health_mental`, `health_rural`, `medical_freedom`, `social_security`, `healthcare_costs`, `tobacco_nicotine` ★ |
| 4 | **Government Spending, Debt & Waste** | `lower_taxes`, `gov_waste`, `gov_balance`, `national_debt`, `audit_spending`, `gov_regulation`, `cut_spending`, `gov_services` ★ |
| 5 | **Abortion / Reproductive Rights** | `pro_life`, `repro_balance`, `pro_choice` |
| 6 | **Gun Rights & Gun Control** | `gun_rights`, `gun_balance`, `gun_safety` |
| 7 | **Climate, Energy & Land** | `climate_action`, `enviro_energy`, `enviro_balance`, `lands_energy`, `lands_preserve` ★, `lands_keep_public` ★, `lands_balance` ★, `lands_local` ★, `property_rights` ★, `datacenter_growth`, `datacenter_water`, `datacenter_power`, `disaster_resilience`, `water`, `water_storage`, `energy_production`, `permitting_reform` |
| 8 | **Crime & Public Safety** | `back_police`, `justice_balance`, `justice_reform`, `cannabis_reform`, `tough_on_crime` |
| 9 | **Election Integrity** | `election_integrity`, `election_security`, `democracy_balance`, `voting_access`, `voter_id` |
| 10 | **Checks, Balances & Government Reform** | `checks_balances`, `war_powers`, `judicial_check`, `power_of_purse`, `congress_oversight`, `states_federal_power`, `state_standing`, `guard_authority`, `civil_service_control`, `scotus_reform` ★, `term_limits` ★, `stock_trading_ban` ★, `gov_transparency` ★, `campaign_finance` ★, `reform_balance` ★ |
| 11 | **Education & Parental Rights** | `school_choice`, `edu_balance`, `public_schools`, `edu_college_cost`, `edu_parental` |
| 12 | **Civil Rights, Culture & DEI** | `religious_liberty`, `rights_balance`, `lgbtq_rights`, `free_speech`, `end_dei`, `privacy_rights` ★ |
| 13 | **Foreign Policy & National Security** | `strong_defense`, `foreign_balance`, `restraint`, `america_first`, `america_first_fp`, `israel_support`, `veterans` |

Added July 2026: the institutional-power pair. These votes — war powers, the power
of the purse, congressional oversight, nationwide injunctions, National Guard and
state-standing fights — are about *who decides*, not about ballot access or the
deficit, so they need their own core issue rather than being folded into Election
Integrity or Government Spending. Deliberately carries no partisan lean: both
parties invoke institutional limits when they are out of power.

Added August 2026: `civil_service_control`, joining the same core issue. Orders
that reclassify career federal positions out of the competitive service — Schedule
F, Schedule Policy/Career, Schedule G — are a *who decides* question about the
executive branch's own workforce, and they had no honest key at all: they are not
spending, and filing them under a broad government-reform key would have made that
key mean nothing in particular. The scope is one mechanism (personnel
classification and the protections attached to it), written out in the `ISSUE_MAP`
comment so it does not drift into "federal workforce" generally. Also carries no
lean.

Completed September 2026 (★ above): the table named a parent for 97 of the 121
published keys and left **24 with none**. Those were not scaffolding — every one had
a label, a chip, and in several cases a record ledger you could open by typing the
key into the Door 1 seek box. `lands_preserve` (🏔 Protect Public Lands) had four
mapped measures and a readable census and appeared on no branch anywhere on the
site, because no core listed it. Three surfaces were grouping issues into families
and only one of them read this table.

The fix was to finish the table that exists, not to add a second one, and no
fourteenth core was needed. **Three labels widened, in copy only, to name what is
now filed under them:**

| Was | Now | Why |
|---|---|---|
| Economy, Inflation & Cost of Living | Economy, Cost of Living & Infrastructure | it now parents `infrastructure`, `transit`, `broadband` and the care keys |
| Climate Change & Energy Policy | Climate, Energy & Land | it now parents the five `lands_*` keys and `property_rights` |
| Checks, Balances & Who Decides | Checks, Balances & Government Reform | it now parents `term_limits`, `stock_trading_ban`, `campaign_finance` and `scotus_reform` |

A label may only widen where the core gained a child; a label that moves on its own
is a rename, and a rename is refused. Nothing was merged — `lands_preserve`,
`lands_keep_public` and `lands_local` are three different keys with three different
ledgers, and they stay that way. No key was added, renamed or re-scoped, and no
`ISSUE_MAP` entry was touched: the September pass edited this table and nothing else
in `alignment-tool.js`, which is what
`assertParentTableIsTheOnlyMove()` in `scripts/v103-chrome-seams.mjs` proves to the
seven suites that pin that file against `HEAD`.

## How it surfaces

- **Evidence Locker → By Politician:** the footprint summary shows an
  `X/13 core issues` stat and a chip row naming which core national issues a
  politician's record touches.
- **Door 1, the issue desk:** the thirteen cores are the shelf. Selecting one paints
  a chip for **every** child `childrenOf()` returns, in the order this table declares
  them. Tapping a child commits that exact key and paints its own record ledger — the
  same `rowFor(pid, key)` path the seek box reaches, with no fallback to a cousin key.
  A core with no child picked keeps its inventory sentence and gets no census, because
  a core has no record. Under the census sits the crumb:
  `🌱 Climate, Energy & Land → 🏔 Protect Public Lands`.
- **The person file's topic tree** (`stance-tree.js`) groups a member's leaves by
  `coreOf(key)`. It used to decide branches its own way; it now asks this table, so a
  key cannot sit under one heading on `/p/<slug>` and another on Door 1. Its trailing
  "Other" node is kept as a backstop and is expected to stay empty.
- **Stance at a Glance / Connected Evidence:** unchanged in structure — these are
  driven automatically by `ISSUE_STANCE_DATA` and `ACCT_SPOTLIGHT`, so adding a
  core-issue stance card or evidence item lights up these surfaces with no extra
  wiring.

## Writing standard

All additions follow [`CONTENT_STYLE.md`](./CONTENT_STYLE.md): write about the
**individual's** record, never their party. State recorded votes as plain facts
(counts and roll-call numbers), never as "party-line" votes, and keep every piece
of evidence personal to that one politician. Only add a stance or evidence item
that can be clearly sourced; never invent or overstate a position.
