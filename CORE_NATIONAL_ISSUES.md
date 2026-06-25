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

Source of truth: `CORE_NATIONAL_ISSUES` in `index.html` (published on
`window.CORE_NATIONAL_ISSUES`, with `window.coreIssueForKey(issueKey)` for reverse
lookup). Validated by `scripts/define-core-national-issues-jun2026.mjs`.

## The ten core issues (ordered by 2026 salience)

| # | Core National Issue | Component `ISSUE_MAP` keys |
|---|---|---|
| 1 | **Economy, Inflation & Cost of Living** | `cost_living`, `tax_middle_class`, `econ_growth`, `econ_smallbiz`, `econ_trade`, `econ_balance`, `econ_workers`, `econ_corp_account`, `rural_ag`, `housing_build`, `housing_support`, `housing_first_time`, `property_tax` |
| 2 | **Immigration & Border Security** | `border_security`, `immig_legal`, `immig_balance`, `immigration_reform`, `immig_fentanyl` |
| 3 | **Healthcare Costs & Access** | `healthcare_market`, `health_drug_prices`, `health_balance`, `healthcare`, `health_mental`, `health_rural`, `medical_freedom`, `social_security` |
| 4 | **Government Spending, Debt & Waste** | `lower_taxes`, `gov_waste`, `gov_balance`, `national_debt`, `audit_spending`, `gov_regulation` |
| 5 | **Abortion / Reproductive Rights** | `pro_life`, `repro_balance`, `pro_choice` |
| 6 | **Gun Rights & Gun Control** | `gun_rights`, `gun_balance`, `gun_safety` |
| 7 | **Climate Change & Energy Policy** | `climate_action`, `enviro_energy`, `enviro_balance`, `lands_energy`, `disaster_resilience`, `water`, `water_storage` |
| 8 | **Crime & Public Safety** | `back_police`, `justice_balance`, `justice_reform`, `cannabis_reform` |
| 9 | **Election Integrity** | `election_integrity`, `democracy_balance`, `voting_access` |
| 10 | **Education & Parental Rights** | `school_choice`, `edu_balance`, `public_schools`, `edu_college_cost`, `edu_parental` |

## How it surfaces

- **Evidence Locker → By Politician:** the footprint summary shows an
  `X/10 core issues` stat and a chip row naming which core national issues a
  politician's record touches.
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
