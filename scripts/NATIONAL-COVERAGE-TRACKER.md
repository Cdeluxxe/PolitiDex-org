# National / Federal Coverage — Tracker (Batch 7, July 2026)

A targeted national push expanding PolitiDex's coverage of the highest-profile
federal players and connecting sourced evidence to priority-issue stances. Unlike
the county passes (where the unit is a local *fight*), the federal tier is
organized around the **individual's recorded acts and words on national priority
issues**, using the same `evidence`+`source` fields and the ISSUE_MAP national
vocabulary. The facet style is used where a record is genuinely two-sided. Data
lives in `scripts/deep-dive-national-batch7-jul2026.mjs` and the `ISSUE_STANCE_DATA`
mirror in `politician-stances.js`.

## What was built

| Figure | Office | Action | Cards | Notes |
|---|---|---|---|---|
| **Donald Trump** | President (R) | **ENRICH** `trump` | +5 | H.R.1 three-axis facet family (tax cuts / deficit / Medicaid-SNAP) + birthright-citizenship & Trump v. CASA + ending the Ukraine war |
| **J.D. Vance** | Vice President (R) | **CREATE** `vance` | 4 | Tie-breaking H.R.1 vote, Munich speech, Oval Office clash with Zelensky, immigration enforcement |
| **John Thune** | Senate Majority Leader (R-SD) | **CREATE** `thune` | 3 | Shepherded H.R.1 + rescissions; **resisted Trump's push to end the filibuster**; judicial-confirmation blitz |
| **Hakeem Jeffries** | House Minority Leader (D-NY) | **CREATE** `jeffries` | 3 | Record 8h44m "magic minute" speech vs. H.R.1; "budgets are moral documents"; unified opposition |
| **Chuck Schumer** | Senate Minority Leader (D-NY) | **CREATE** `schumer` | 3 | March 2025 filibuster-clearing funding vote (then voted no); fall 2025 shutdown reversal; H.R.1 opposition |

## Totals (this batch)
- **Figures:** 1 enriched (Trump) + 4 created (Vance, Thune, Jeffries, Schumer)
- **New stance cards:** 18 (5 appended to `trump` + 13 across the four new figures)
- **New stances (Firestore):** 15; **spotlight receipts:** 18
- Every card carries a verifiable `{evidence, source}`.

## The organizing thread: H.R.1 (the One Big Beautiful Bill Act)
The 2025 reconciliation law is the connective tissue across all five records — a
single event seen from five vantage points, which makes the alignment and
"connected evidence" surfaces light up coherently:
- **Trump** signed it (July 4, 2025) — modeled as a facet family so tax cuts,
  the CBO's ~$3.4T deficit estimate, and the Medicaid/SNAP cuts (~12M more
  uninsured by 2034) all show at once.
- **Vance** cast the tie-breaking 51-50 Senate vote (his fifth).
- **Thune** shepherded it through the Senate as Majority Leader.
- **Jeffries** gave the longest speech in House history opposing it.
- **Schumer** led unified Senate Democratic opposition to it.

## Facet / nuance modeling
- **Trump — H.R.1:** three axes (`lower_taxes` support / `national_debt` oppose / `healthcare` mixed) so the law's benefits and costs are both visible, mirroring the existing tariffs facet family.
- **Trump — Ukraine** (`restraint`, mixed) and **Vance — Ukraine** (`restraint`, mixed): pushing a negotiated end while pressuring an ally.
- **Thune — filibuster/judges** (`democracy_balance`): delivering the agenda while defending a Senate norm against his own party's president — an independent, cross-pressured record.
- **Schumer — March 2025 vote** (`democracy_balance`, mixed): the minority leader's dilemma, captured without editorializing.

## Balance & treatment
The set spans the current federal power structure — President, VP, Senate
Majority + Minority Leaders, House Minority Leader (3 Republicans, 2 Democrats).
Per `CONTENT_STYLE.md`, every card describes the **individual's** own recorded act
or words; vote tallies are plain facts (Senate 51-50 with the VP breaking the tie;
House 218-214), never party-line characterizations; and contested effects (the
CBO's deficit and coverage estimates) are attributed to the CBO rather than
asserted editorially.

## Non-duplicative
- `trump` already had 17 cards (including a tariffs facet family) → enriched, not rebuilt.
- `lee` and `curtis` already carry deep records — including Lee's 2025 public-lands sale saga and Curtis's Conservative Climate Caucus energy record — so they were **intentionally left untouched** to avoid duplication.

## Honest gaps (tracked, NOT built — no fabrication)
- **Speaker Mike Johnson** and other high-profile members (committee chairs, prominent senators like Rand Paul or John Fetterman, and figures such as AOC) are named for a later national wave, not stubbed here.
- **WIRING (carry-over from the coverage audit):** the four newly created federal figures are added to `ISSUE_STANCE_DATA` (stance cards) and, via `--apply`, to Firestore. They should also be added to the bundled `CMP_DATA` roster in `index.html` so they surface in search and the comparison tool — the same roster-wiring gap flagged for new county officials. Trump/Lee/Curtis already have roster entries; Vance/Thune/Jeffries/Schumer need a roster entry added in a follow-up.

## Recommendations for continuing efficiently (next)
1. **Add the four new figures to the `CMP_DATA` roster** so search/compare/ballot surfaces pick them up, closing the wiring gap.
2. **A House/Senate leadership + committee-chair wave** — Speaker Johnson, Whip and committee leadership, plus a few high-profile members from each party — anchored to the same priority issues (H.R.1, immigration, foreign policy) for cross-figure alignment.
3. **Deepen the Utah delegation's federal record** (Maloy, Moore, Owens, Kennedy) with H.R.1 votes and Core National Issue stances, tying the national push back to PolitiDex's Utah launchpad.
4. **Keep the facet style for genuinely two-sided records** and attribute all contested effects to their source (CBO, courts), preserving the nonpartisan, verifiable standard.
