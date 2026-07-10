# Salt Lake County — Controversy Tracker (Batch 6, July 2026)

A controversy-first pass closing the biggest remaining Utah gap named in the
coverage audit: **Salt Lake County** — roughly a third of the state's population —
had no county/city controversy tier (only two county-council stance records
existed). This batch builds the top of that tier around three tightly
**interlocking** fights plus the largest suburbs. Every record is a currently
seated, elected official on that official's own sourced controversy. Data lives in
`scripts/deep-dive-salt-lake-county-batch6-jul2026.mjs` (full profiles + spotlight
receipts → Firestore) and the `ISSUE_STANCE_DATA` mirror in `politician-stances.js`
(stance cards).

## The interlocking core: homelessness ↔ jail ↔ taxes

The three headline records are one story told from three offices:
- The **county jail** is over capacity (Sheriff Rivera), so **criminal justice eats 74% of the county budget** and drives a property-tax hike (County Mayor Wilson), while **homelessness** fills both the jail and downtown (SLC Mayor Mendenhall). The 2024 failed $507M jail bond, HB312, the SEG district's Public Benefit Fund, and the "high utilizer" framing all cross-reference each other — a clean, spotlight-ready cluster.

| Tier | Controversy | Official Built | Stances | Receipts | Spotlight Readiness | Status |
|---|---|---|---|---|---|---|
| **Salt Lake City** | Downtown **SEG sports/entertainment district** (up to $900M bonds via a 0.5% citywide sales tax), **homelessness** (~$25M/yr, "high utilizers"), and a 2026 **entertainment-tax** float | **Erin Mendenhall** (Mayor, D) | 4 | 4 | **Strong** — named terms and direct quotes; KSL, Deseret News | ✅ Built |
| **Salt Lake County** | The county's first **property-tax hike since 2019** (19.63% → trimmed to 14.6%), driven by criminal justice (74% of the general fund) after the failed 2024 jail bond; resident **referendum** | **Jenny Wilson** (County Mayor, D) | 3 | 4 | **Strong** — "no responsible alternative," Leifman reform model, referendum; KSL, KUER, Fox13, SLTrib | ✅ Built |
| **County jail** | **Overcrowding "early releases"** (100,000+ since 2007; a Dec 2025 audit found 38.4% 90-day recidivism), **HB312**, and ~200+ new Oxbow beds that ended releases in June 2025 | **Rosie Rivera** (County Sheriff, D; 2026 candidate) | 3 | 4 | **Strong** — audit findings + her agreement + "functionally full" caveat; KSL, KSL NewsRadio, Deseret | ✅ Built |
| **Sandy** | A **32% city-line property-tax proposal**, opposition to the **Little Cottonwood gondola**, and ~$1B sports-entertainment growth | **Monica Zoltanski** (Mayor) | 3 | 3 | **Strong** — her own cost clarification and gondola stance; KUTV, Sandy Journal | ✅ Built |
| **West Valley City** | **Public-safety funding** and a stance that local government "is not an arm of federal immigration enforcement," plus the Utah Grizzlies' departure | **Karen Lang** (Mayor) | 3 | 3 | **Strong** — a deliberate contrast to counties expanding ICE cooperation; SLTrib, West Valley Journal | ✅ Built |
| **Herriman** | **Growth that "pays its fair share"** — developers build infrastructure before housing — as the city tripled to ~64,000 in 15 years | **Lorin Palmer** (Mayor) | 3 | 3 | **Strong** — infrastructure-first rule + a decisive re-election mandate; Herriman Journal, SLTrib | ✅ Built |

## Totals (built this batch)
- **Officials with new records:** 6 created (county mayor, county sheriff, capital-city mayor, three large-suburb mayors)
- **Stances added:** 19
- **Spotlight receipts added:** 21
- **Stance cards mirrored into `politician-stances.js`:** 21
- **Salt Lake County moved from ~zero county/city tier to a built top tier.**

## Facet / nuance modeling
Two-sided positions are `mixed` so the tradeoff is visible:
- **Mendenhall** — a public sales tax funding a largely private arena; enforcement *and* services on homelessness; a cooperate-but-pay-more posture toward the state.
- **Wilson** — raise taxes to *reform* (diversion, Leifman) rather than only to jail; a hike she calls unavoidable but that voters are moving to referendum.
- **Rivera** — ended overcrowding releases, yet runs a "functionally full" jail with capacity funding unresolved.
- **Zoltanski** — a large percentage hike on a small city-line base, defended as historically rare.
- **Lang** — fund police robustly *and* keep the city out of federal immigration enforcement.

## Spotlight-ready controversies (sourcing strong enough now)
1. **Homelessness ↔ jail ↔ taxes** — the strongest cluster in the entire Utah dataset: three offices (city mayor, county mayor, sheriff) on one interlocking crisis, with the failed jail bond, HB312, the audit, and the SEG Public Benefit Fund tying them together. Ready for a single Issue Spotlight.
2. **The SEG downtown district** — a stand-alone "who pays for the arena" story (0.5% sales tax, entertainment-tax float) with a clear public-cost ledger.
3. **Suburban growth-and-taxes** — Zoltanski (Sandy) and Palmer (Herriman) frame the valley-wide "how does fast growth pay for itself" debate.

## Honest gaps (tracked, NOT built — no fabrication)
- **County Council beyond the two existing records** (`suzanne_harrison`, `rosalba_dominguez`) — not touched here; this batch adds the executive/sheriff/city-mayor tier. A council pass is a clean follow-up.
- **More suburbs:** West Jordan (Mayor Dirk Burton), South Jordan, Draper, Murray, Millcreek (Jeff Silvestrini), Riverton, Cottonwood Heights, Taylorsville — named for a follow-up, not stubbed without a sourced controversy.
- **District Attorney Sim Gill's** diversion role is real and referenced as context, but is a separate office not built in this county-executive batch.
- **Live 2026 outcomes to record later:** the referendum on Wilson's tax hike, the 2026 sheriff race, and any renewed jail-capacity bond/lease-revenue vote.

## How Batch 6 compares to the earlier passes
- **Highest-population, highest-stakes:** unlike the mid-size and rural counties of Batch 5, this is the state's largest county, and the fights (a pro-sports arena subsidy, a 20% tax hike, a jail-capacity crisis) are the most consequential in the dataset.
- **Interlocking rather than parallel:** where prior batches captured one fight per county, Batch 6's three headline records deliberately share a single crisis across three offices — the cleanest multi-office accountability geometry yet.
- **Partisan vs. nonpartisan handled cleanly:** county mayor and sheriff are partisan (Wilson and Rivera are Democrats) and labeled as metadata; Salt Lake City is officially nonpartisan but Mendenhall is carried as Democrat consistent with the existing roster; suburb mayors are nonpartisan. Every record is written to the individual's own conduct per `CONTENT_STYLE.md`.
- **Immigration contrast built in:** Lang's "not an arm of federal immigration enforcement" is a deliberate, sourced counterpoint to Utah County Sheriff Mike Smith's 287(g) record (Batch 4) — two ends of the same statewide debate, each on its own terms.

## Recommendations for continuing efficiently (next)
1. **A Salt Lake County Council pass** — build the remaining council members around the same tax/jail/homelessness cluster for a complete county-government picture.
2. **A second-suburb wave** — West Jordan, Millcreek, Murray, Draper, and South Jordan, each only where a sourced controversy exists.
3. **Track the live 2026 outcomes** — the tax-hike referendum, the sheriff race, and the next jail-capacity funding vote — converting emerging postures into recorded outcomes.
4. **Keep the interlocking, controversy-first structure and `issueKey` vocabulary** (`property_tax`, `justice_balance`, `justice_reform`, `back_police`, `housing_support`, `gov_services`, `housing_build`, `lands_local`, `immigration_reform`) so the whole cluster drops straight into Issue Spotlights.
