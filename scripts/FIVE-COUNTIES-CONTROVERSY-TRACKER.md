# Utah High-Salience Counties — Controversy Tracker (Batch 5, July 2026)

A controversy-first pass extending PolitiDex's county-by-county accountability work
(Utah County batches 1–4, plus Cache, Box Elder, Davis, and Weber) to five more
high-population / high-salience counties that had only **state-legislative**
coverage and no county/city tier: **Washington (St. George), Summit, Tooele, Iron
(Cedar City), and Wasatch (Heber).** The unit is the **fight**, and every record
is a **currently seated, elected official** tied to that county's single defining,
well-sourced controversy. Data lives in
`scripts/deep-dive-five-counties-batch5-jul2026.mjs` (full profiles + spotlight
receipts → Firestore) and the `ISSUE_STANCE_DATA` mirror in `politician-stances.js`
(stance cards).

Scope discipline: one clean controversy per county, anchored on the elected
official most directly on the record — not a blanket sweep of every commissioner,
council member, or small-town mayor.

| County | Controversy | Official(s) Built | Stances | Receipts | Spotlight Readiness | Status |
|---|---|---|---|---|---|---|
| **Washington (St. George)** | Explosive growth, chronic water shortage, and a contested public-safety **property-tax** increase in the 2025 mayoral race | **Jimmie Hughes** (Mayor; won Nov 2025, took office Jan 2026) | 4 | 4 | **Strong** — measured-growth and fiscal-accountability quotes from the race, in a county that has held its rate flat 16 years and calls water its No. 1 issue; KUER, St. George News | ✅ Built |
| **Summit** | **Dakota Pacific / Kimball Junction** — a landmark local-control-vs-state clash; the county sued the state, then had an 885-unit project routed around the elected council and a voter referendum by 2025 state law | **Roger Armstrong** (Council Vice Chair) and **Canice Harte** (Council Chair) | 3 + 2 | 3 + 3 | **Strong** — direct quotes that the Legislature "forced" the project and that traffic must precede more housing; the county's control was overridden and the manager signed July 2025; KPCW, Park Record | ✅ Built |
| **Tooele** | The yearslong **Grantsville "Six Mile" annexation** (~7,800 acres) vs. neighboring Erda — litigated to the Utah Supreme Court and now a suit against the Lt. Governor | **Heidi Hammond** (Grantsville Mayor) | 3 | 4 | **Strong** — her defense of the annexation, the growth/tax-revenue bet, a candid family conflict-of-interest disclosure, and the suit vs. the Lt. Governor; KSL | ✅ Built |
| **Iron (Cedar City)** | The **Pine Valley Water Supply Project** — a 66-mile pipeline to import West Desert groundwater to an over-pumped valley; federally approved early 2026 amid ranch/tribal/Beaver-County opposition | **Paul Cozzens** (Iron County Commissioner; water-district liaison) | 3 | 3 | **Strong** — his "massive milestone" endorsement and long advocacy, honestly set against the aquifer, senior-water-rights, and ~$260M+ cost objections; ABC4, Salt Lake Tribune, KSL | ✅ Built |
| **Wasatch (Heber)** | The **Heber Valley bypass** through the North Fields wetlands, plus developer-driven "new town" incorporations | **Heidi Franco** (Heber City Mayor; re-elected 2025) | 4 | 4 | **Strong** — backs the open-space-sparing route, challenges UDOT's cost/study claims, codifies wetland protections, and is candid about the ~$100M conservation price; KSL-TV, Park Record | ✅ Built |

## Totals (built this batch)
- **Officials with new records:** 6 created across 5 counties (Summit gets two)
- **Stances added:** 19
- **Spotlight receipts added:** 21
- **Stance cards mirrored into `politician-stances.js`:** 21
- **Counties moved from legislative-only to county/city coverage:** 5

## Facet / nuance modeling
Genuinely two-sided positions are marked `mixed` rather than forced into
support/oppose, so the nuance is visible in the UI:
- **Hughes** — growth as "a blessing and a curse"; accountability on a tax he did not originate.
- **Armstrong / Harte** — support good planning while opposing *how* Dakota Pacific was imposed; traffic-first caution on more density.
- **Hammond** — a pro-annexation growth bet paired with an unusual, voluntary family conflict-of-interest disclosure.
- **Cozzens** — a clear pro-supply position explicitly weighed against aquifer, tribal/senior-rights, and cost objections.
- **Franco** — open-space-first opposition to a route, tempered by candor that conservation itself carries a ~$100M price.

## Spotlight-ready controversies (sourcing strong enough now)
1. **Dakota Pacific / local control (Summit)** — the cleanest statewide-significance story: a county that sued the state, lost control by statute, and approved a project "under duress," with quoted councilmembers on both the merits and the process. Pairs naturally with the Legislature's role for a full spotlight.
2. **Pine Valley water (Iron)** — a self-contained Western water-war arc: a decades-in-the-making import pipeline, federally approved in 2026, with a named elected champion and a broad, named opposition coalition.
3. **Heber North Fields bypass (Wasatch)** — a growth-vs-open-space fight with a mayor on the record contesting both the route and the state agency's process, and concrete conservation-cost math.

## Honest gaps (tracked, NOT built — no fabrication)
- **Sheriff tier:** none of these five counties had a *defining, sourced* sheriff controversy comparable to Utah County's 287(g) fight. Tooele Sheriff **Paul Wimmer**'s only sourced 2026 remarks were budget-process concerns — too thin for a record. Named here, not stubbed. (Water, growth, development, and annexation are the real controversies in these counties.)
- **Michele Randall** (outgoing St. George mayor) has a sourced "that was not my idea" line on the public-safety tax, but she left office in January 2026; her position is captured as context inside Hughes' record rather than as a stale former-officeholder profile.
- **Appointed staff, not elected:** water-district GM **Paul Monroe** (Iron) and county managers **Shayne Scott** (Summit) and **Dustin Grabau** (Wasatch) are central to these stories but are appointed, not elected — described as context, not given profiles, since PolitiDex tracks elected officials.
- **Washington County Commission:** the 2026 GOP primary (Gil **Almquist** vs. Bill **Hoster**) over taxes/transparency/tourism is real, but the sourced individual quotes were thinner than the St. George mayoral record; tracked for a later pass rather than stubbed.
- **Summit "under duress" phrasing** is the reporting's paraphrase of the councilmembers' description of the December 2025 vote, and is presented as such — not as a verbatim quote.

## How Batch 5 compares to the earlier county passes
- **Breadth over depth-in-one-place:** where the Utah County batches went four rounds deep on one county, Batch 5 deliberately spreads across five counties to make the *statewide* map feel complete — one solid, current-officeholder record per county (two for Summit), each on that county's biggest fight.
- **Elected-only discipline:** several of these controversies are driven by appointed staff (water-district GMs, county managers); Batch 5 holds to profiling elected officials and treats the appointed drivers as context, keeping the accountability lens on people voters choose.
- **Partisan vs. nonpartisan handled cleanly:** county-council seats here are partisan (Armstrong and Harte are both Democrats) and labeled as plain metadata; municipal offices (St. George, Grantsville, Heber) and Iron County are described by the individual's own record, never a party bloc — consistent with `CONTENT_STYLE.md`.
- **Facet modeling used more heavily:** these are growth/water/land-use fights full of real tradeoffs, so `mixed` stances carry more of the weight than in the school-board and tax-vote clusters of earlier batches.

## Recommendations for continuing efficiently (next)
1. **Track each fight to its next decision** — a St. George public-safety tax vote under Hughes, Summit's handling of the next Kimball Junction project (Junction Commons), the Lt. Governor's certification of the Grantsville annexation, Pine Valley's rate-setting and litigation, and UDOT's final bypass record of decision — and convert each emerging posture into a recorded outcome.
2. **Layer a second official per county only where a sourced position exists** — e.g., a Washington County commissioner once the Almquist/Hoster race yields verbatim quotes, or a Summit councilmember beyond the two built — rather than stubbing thin profiles.
3. **Do not force a sheriff record** in these counties until an actual sourced controversy appears (Wimmer's budget-process comment is not one).
4. **Keep the controversy-first, elected-official discipline** and consistent `issueKey` vocabulary (`housing_build`, `water`, `water_storage`, `property_tax`, `gov_balance`, `gov_transparency`, `lands_preserve`, `lands_local`, `enviro_balance`, `infrastructure`) so each cluster drops straight into an Issue Spotlight.
