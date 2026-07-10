# Rural / Small Counties — Controversy Tracker (Batch 8, July 2026)

The final major push of the county-by-county pass, into rural Utah — the last big
coverage gap named in the audit. Controversy-first, anchored on the fights that
actually define these counties: **energy, federal lands, water, and the coal
transition.** Every record is a currently seated, elected **county commissioner**
(the natural locus of these resource fights), with a sourced, quoted position.
Data lives in `scripts/deep-dive-rural-counties-batch8-jul2026.mjs` and the
`ISSUE_STANCE_DATA` mirror in `politician-stances.js`.

| County | Controversy | Official Built | Stances | Receipts | Spotlight Readiness | Status |
|---|---|---|---|---|---|---|
| **Beaver** | The **Pine Valley water** fight — from the opposing side; Beaver opposes Iron County's ~$260M pipeline to pump West Desert groundwater to Cedar City | **Tammy Pearson** (Commission, R) | 3 | 3 | **Strong** — direct quotes + the 2026 BLM-approval appeal; the counterpart to Iron County's Cozzens (Batch 5); St. George News, KSL | ✅ Built |
| **Duchesne** | The **Uinta Basin Railway** — a $1.5B crude-by-rail line that cleared the Supreme Court 8-0 in 2025 | **Greg Miles** (Commission, R; Seven County Coalition board) | 3 | 3 | **Strong** — his "win for the United States" quote + the $2.4B bond push; Salt Lake Tribune, Utah News Dispatch | ✅ Built |
| **Emery** | The **coal-to-nuclear transition** — coal plants are ~60% of the tax base as the county courts new nuclear | **Jordan Leonard** (Commission, R) | 3 | 3 | **Strong** — ~63% resident survey, June 2025 nuclear hearing, Valar Atomics reactor; ETV News, Deseret, Utah News Dispatch | ✅ Built |
| **Grand (Moab)** | **Tourism economics vs. housing** — a state-forced restructuring walls tourism-tax dollars off from housing and roads | **Mary McGann** (Commission, D) | 3 | 3 | **Strong** — her housing-earmark quote + the post-audit restructuring; Moab Sun News, Times-Independent | ✅ Built |
| **Millard** | The **IPP coal-to-hydrogen** rebuild — one of the West's largest energy hubs converting to hydrogen | **Dean Draper** (Commission, R) | 3 | 3 | **Strong** — his "boon for Millard County" quote + IPP Renewed status; Salt Lake Tribune, IPP Renewed | ✅ Built |

## Totals (this batch)
- **Officials with new records:** 5 created across 5 counties
- **Stances added:** 15; **spotlight receipts:** 15; **stance cards mirrored:** 15
- **Rural counties moved from zero coverage to a built commission tier:** 5 (Beaver, Duchesne, Emery, Grand, Millard)

## The cross-county thread: energy & water shape rural Utah
These records connect to each other and to earlier batches:
- **Water:** Beaver's Pearson (oppose) is the direct counterpart to Iron County's Cozzens (support, Batch 5) — the same Pine Valley pipeline, both sides now on the record.
- **Energy:** Duchesne's oil railway, Emery's coal-to-nuclear, and Millard's coal-to-hydrogen are three faces of the same rural-Utah energy transition, all tied to the state's "Operation Gigawatt" build-out (which Gov. Cox's record already covers).
- **Land/tourism:** Grand/Moab's tourism-vs-housing bind rounds out the resource picture with the recreation economy.

## Facet / nuance modeling
Two-sided records use `mixed` so tradeoffs stay visible:
- **Miles** — economic-lifeline railway vs. the environmental-review questions that drove the lawsuit.
- **Leonard** — coal legacy (60% of the tax base) held together with a nuclear future.
- **McGann** — a housing champion working within a budget where the biggest revenue stream is legally walled off from housing.
- **Draper** — a hydrogen-hub "boon" alongside honest coal-unit uncertainty.
- **Pearson** — a clear `oppose` on the pipeline, with the regional-sustainability nuance marked `mixed`.

## Honest gaps (tracked, NOT built — no fabrication)
- **San Juan County** — the highest-profile rural controversy (the Native-majority commission, Bears Ears, and a 2025 Trump boundary review), but this pass found **no current, individually-sourced quote** from a sitting commissioner (Stubbs / Maughan / Harvey) on it; the historic representation record belongs to former commissioners (Maryboy / Grayeyes). Named and tracked; not built on invented current positions. Both Stubbs and Harvey are on the 2026 ballot — a natural time to build once fall coverage quotes them.
- **Carbon County** shares the coal-transition story and is a Seven County Coalition member, but its most-quoted commissioner (Lynn Sitterud) is **retired**; tracked, not stubbed on a former official.
- **Sanpete, Sevier, Juab, Kane, Garfield, Daggett, Wayne, Piute, Rich, Morgan** — smaller populations without a defining, individually-sourced current controversy in this pass. Named for later waves.
- **Sheriff / mayor / school-board tiers:** in these counties the defining fights are resource/land/energy matters that run through the **commission**; no sourced sheriff/mayor/school-board controversy surfaced, so none was fabricated to fill the office list.

## How Batch 8 compares to the earlier passes
- **Commission-centric by design:** rural fights over water, oil, coal, and tourism are decided at the county-commission level, so this batch is all commissioners — the right unit, honestly chosen over padding out sheriff/mayor/school-board stubs.
- **Cross-county connective tissue:** more than any prior batch, these records interlock (Pine Valley's two sides; three energy-transition counties; Operation Gigawatt), which lights up the alignment and connected-evidence surfaces across counties.
- **Sourcing discipline under scarcity:** rural officials are quoted far less often than urban ones, so the honest-gap list is longer here — San Juan and Carbon are consciously tracked rather than fabricated, keeping the nonpartisan, verifiable standard intact.

## Recommendations for continuing efficiently (next)
1. **Build San Juan once the 2026 race yields quotes** — Stubbs and Harvey are on the ballot; a fall voter guide should surface current, sourced positions on Bears Ears and the form-of-government question.
2. **Revisit Carbon** when a current commissioner is quoted on the coal transition (the story is shared with Emery and the Seven County Coalition).
3. **Track the live outcomes** — the Pine Valley appeal, the Uinta Basin Railway's bond financing and construction, Emery's Valar Atomics reactor, and IPP's coal-unit decision — converting emerging postures into recorded outcomes.
4. **Keep the controversy-first, commission-centric, elected-only discipline** and the `issueKey` vocabulary (`water`, `energy_production`, `enviro_energy`, `enviro_balance`, `rural_ag`, `housing_support`, `econ_growth`, `property_tax`) so each cluster drops straight into an Issue Spotlight.
