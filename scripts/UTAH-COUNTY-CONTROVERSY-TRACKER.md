# Utah County — Controversy Tracker (Batch 1, June 2026)

A controversy-first tracker for the deliberately-scoped Utah County accountability
pass. The unit is the **fight**, not the politician — the goal is sourced records on
the issues that currently matter most to Utah County residents, structured to feed
future Issue Spotlights. Data lives in `scripts/deep-dive-utah-county-batch1-jun2026.mjs`
(full profiles + spotlight receipts → Firestore) and the `ISSUE_STANCE_DATA` mirror in
`index.html` (stance cards).

Scope discipline: only sitting officials tied to **active/recent high-attention**
controversies. No blanket pass over every council member or small-town mayor.

| Controversy | Key Officials (this batch) | Stances Added | Receipts Added | Spotlight Potential | Status |
|---|---|---|---|---|---|
| **Eagle Mountain data centers & water** (Meta water-secrecy deal, $6B QTS campus, HB 76 exemption) | Jared Gray (Mayor) | 4 | 4 | **Strong** — multi-source (Grist/SLTrib, Daily Herald, KSL NewsRadio, KUTV); clean Utah County angle distinct from Box Elder's Stratos | ✅ Built |
| **Vineyard "Utah City" growth + spending scandal** (State Auditor $35M+ unreported, purchase-card audit, Prop 10, leadership turnover) | Julie Fullmer (former Mayor), Jacob Holdaway (Council), Zack Stratton (Mayor) | 9 | 12 | **Strong** — deep primary/local sourcing (Utah State Auditor, SLTrib, KSL, Daily Herald); clear pledge-vs-record + reform arc | ✅ Built |
| **Utah County Commission ~48% property-tax increase** (Dec 2024 budget, Aug 2024 Truth-in-Taxation backlash, two commissioners retiring) | Skyler Beltran (Chair), Amelia Powers Gardner (Seat A), Brandon Gordon (Seat B) | 12 | 10 | **Strong** — recorded split vote (2 yes / 1 abstain), named quotes, KSL/Daily Herald/KUER/Lehi Free Press | ✅ Built |
| **UVU / Charlie Kirk shooting + public-safety review** (Sept 2025 assassination, capital prosecution, campus-security gaps) | Jeff Gray (County Attorney) | 3 | 4 | **Strong (handle with care)** — PBS, CNN, Utah News Dispatch, SLTrib; ongoing case, presumption-of-innocence framing required | ✅ Built |
| **Saratoga Springs growth-driven property-tax increase** (first since 2008, public-safety funding) | Mayor Chris Carn *(office verified; no personal on-record quote found)* | 0 | 0 | Moderate — Lehi Free Press, KUTV, city .gov, but no attributable individual stance yet | ⏳ Tracked, not built (honest gap) |
| **Alpine School District split + Aug 2025 tax hike + $238M bond** (Props 11/14; Aspen Peaks / Lake Mountain / Timpanogos) | Sitting ASD board (Beeson, Peterson dissented; Bateman, Wilson supported) — nonpartisan board seats | 0 | 0 | **Strong** as a spotlight; lower-priority *role* (school board) than commissioners/mayors. Legislative side already covered by existing `keith_grover` record | ⏳ Tracked, not built (next batch) |
| **Utah Lake "islands" / Lake Restoration Solutions** (dredging proposal, defamation SLAPP vs. BYU's Ben Abbott, 2024 repeal) | Sen. Mike McKell (R-Spanish Fork) — **already has a profile (`mike_mckell`)** | 0 | 0 | Moderate — largely *resolved* 2022–2024 (LRS dissolved, law repealed, Abbott won). Recommend enriching existing McKell record rather than a new profile | ⏳ Tracked, recommend enrichment |

## Totals (built this batch)
- **Officials with new records:** 8
- **Stances added:** 28
- **Spotlight receipts added:** 30
- **Stance cards mirrored into `index.html`:** 27
- **Controversies covered:** 4 built + 3 tracked

## Spotlight-ready controversies (sourcing strong enough now)
1. **Eagle Mountain data centers & water** — the cleanest Utah County counterpart to Box Elder's Stratos fight.
2. **Vineyard "Utah City" spending scandal** — strongest pledge-vs-record + reform arc in the batch.
3. **Utah County Commission ~48% tax hike** — recorded split vote with named quotes and an open 2026 race built on it.
4. **UVU / Kirk public-safety accountability** — highest attention; requires sober, presumption-of-innocence framing.

## How Utah County compares to Box Elder (data-center fights)
- **Box Elder (Stratos):** one decisive *event* — a unanimous 3–0 commission vote that triggered a fast, electoral backlash (two commissioners and the sheriff unseated in the June 2026 primary). Accountability flows through a single vote.
- **Utah County (Eagle Mountain):** a slower, *structural* dependence — multiple approved data centers (Meta, Google, QTS), a city budget that "literally" leans on them, a 2018 secrecy deal, and a state transparency law (HB 76) deliberately written to exempt the existing facility. Accountability flows through ongoing fiscal incentives and disclosure gaps, not one ballot-box moment. Municipal terms are odd-year, so no Eagle Mountain seat is on the 2026 ballot — the pressure is regulatory and journalistic, not electoral.

## Recommendations for continuing Utah County efficiently
1. **Build the ASD-split board records next** (Aspen Peaks / Lake Mountain / Timpanogos) — strong sourcing, top-tier property-tax salience; pair with the existing `keith_grover` legislative record for a full Issue Spotlight.
2. **Enrich, don't duplicate, `mike_mckell`** with the Utah Lake repeal arc rather than creating a new profile.
3. **Add Saratoga Springs only once a personal, on-record stance is verified** (Mayor Chris Carn) — avoid building on a generic city action.
4. **Layer the 2026 commission candidates onto these same controversies** — challenger records (Kaufusi, Spencer, plus Westmoreland/Paxman/Bowles) already exist or are partially sourced; tie each to the tax-hike and growth fights for clean pledge-vs-record contrast.
5. **Keep the controversy-first structure** — one fight, the officials on each side, 3–5 receipts apiece, consistent `issueKey` tagging (`property_tax`, `water`, `gov_transparency`, `housing_build`, `back_police`, `justice_balance`), so each cluster drops straight into an Issue Spotlight.
