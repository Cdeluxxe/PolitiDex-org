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

---

# Utah County — Controversy Tracker (Batch 2, June 2026)

Batch 2 executes the top two Batch-1 recommendations: it **builds the Alpine School
District split** (recommendation #1) and **adds Saratoga Springs now that Mayor Chris
Carn is on the record** (recommendation #3, the resolved "honest gap"). Same
controversy-first discipline — sitting officials tied to active, high-attention fights,
3–5 sourced receipts apiece. Data lives in
`scripts/deep-dive-utah-county-batch2-jun2026.mjs` (full profiles + spotlight receipts →
Firestore) and the `ISSUE_STANCE_DATA` mirror in `index.html` (stance cards).

| Controversy | Key Officials (this batch) | Stances Added | Receipts Added | Spotlight Readiness | Status |
|---|---|---|---|---|---|
| **Alpine School District split — Aug 2025 tax hike (5-2) + $238M bond** (dissolution of Utah's largest district into Aspen Peaks / Lake Mountain / Timpanogos by July 2027; net ~1.76% / ~$28.60 median-home increase behind a ~11.5% county notice) | **Stacy Bateman** (Board VP — voted FOR, lead defender), **Sarah Beeson** (voted AGAINST — fiscal-restraint dissent), **Ada Wilson** (voted FOR — but "we must cut costs"); all nonpartisan board seats | 12 | 12 | **Strong** — recorded 5-2 split vote with named, quoted positions on each side + a unanimous $238M bond; Daily Herald, KSL, Lehi Free Press, KUER, SLTrib. Pairs with the Brammer/`keith_grover` legislative side for a complete spotlight | ✅ Built |
| **HB3003 — legislative driver of the split** (2024 special session; blocked Alpine's board from initiating its own split, routing it through the cities' interlocal measures) | **Brady Brammer** (Utah House — chief sponsor) — **already had a profile (`brady_brammer`)** | 1 | 2 | **Strong** (as the legislative leg of the ASD spotlight) — enriched, not duplicated; SLTrib, Daily Herald | ✅ Enriched |
| **Saratoga Springs growth-driven public-safety tax** (proposed first property-tax increase since 2008; ~$3.1M / ~$200 per household; public-safety coverage ~42% → ~52%; new 2028 fire station) | **Chris Carn** (Mayor) — *now on the record* | 4 | 4 | **Strong** — resolves the Batch 1 gap; Carn quoted directly, clear figures, Truth-in-Taxation process underway (Lehi Free Press). Honestly labeled as a *proposal in process*, not yet an adopted record | ✅ Built |
| **Emily Peterson — second Aug-2025 tax-hike dissenter** | Emily Peterson (Alpine board) | 0 | 0 | n/a — her NO vote is recorded fact, but no coverage quotes her individual reasoning | ⏳ Tracked, not built (honest gap; named, not fabricated) |

## Totals (built this batch)
- **Officials with new records:** 4 created (Bateman, Beeson, Wilson, Carn) + 1 enriched (Brammer)
- **Stances added:** 17 (16 on 4 new profiles + 1 merged into Brammer)
- **Spotlight receipts added:** 18 (16 on 4 new profiles + 2 appended to Brammer)
- **Stance cards mirrored into `index.html`:** 17 (16 new + 1 added to Brammer's array)
- **Controversies covered:** 2 built (ASD split, Saratoga Springs) + 1 enrichment (HB3003) + 1 honest gap tracked

## Spotlight-ready controversies (sourcing strong enough now)
1. **Alpine School District split** — the strongest new cluster: a recorded 5-2 vote with named, quoted officials on *both* sides, a unanimous $238M bond, and a legislative driver (Brammer/HB3003). Ready for a focused Issue Spotlight with one more pass to fold in `keith_grover` and the new-district boards.
2. **Saratoga Springs public-safety tax** — Carn on the record with concrete figures; spotlight-ready as a "growth outruns the 2008 tax base" story, with the honest caveat that the increase is still a proposal.

## How Batch 2 compares to Batch 1
- **Both-sides-of-one-vote, not one-actor:** Batch 1's strongest clusters (Vineyard, county commission) still flowed mostly through a single decision per official. The ASD tax vote is the first Utah County controversy captured as a **recorded split with quoted dissent and quoted support on the same vote** (Bateman for, Beeson against, Wilson for-with-conditions) — the cleanest accountability geometry yet.
- **Nonpartisan, lower-office, high-salience:** like the Vineyard council/mayor records, these are nonpartisan school-board seats — a lower *office* tier than commissioners, but top-tier property-tax salience because the levy hits every household in Utah's largest district.
- **Pledge-vs-record handled explicitly:** Carn's record is honestly tagged as a *proposal in process* (no council vote yet), mirroring how Batch 1 distinguished new-mayor Stratton's early actions from governing records already cast.
- **Enrich-don't-duplicate, applied:** Brammer already existed, so HB3003 was appended to his record rather than spun into a second profile — the same discipline Batch 1 recommended for `mike_mckell`.

## Recommendations for continuing Utah County efficiently (next)
1. **Complete the ASD spotlight in one pass** — fold in `keith_grover` (legislative) alongside the now-built Brammer/board records, and add the **new-district boards** (Aspen Peaks / Lake Mountain / Timpanogos, sworn in Nov 2025) only where a member has a documented vote or position; avoid thin "just elected" stubs.
2. **Track Saratoga to resolution** — when the council actually votes on Carn's increase, convert the proposal receipts into a recorded outcome (kept/broken vs. the public-safety rationale).
3. **Still enrich, don't duplicate, `mike_mckell`** (Utah Lake repeal arc) — carried over from Batch 1, not yet done.
4. **Layer 2026 commission candidates** onto the county tax-hike and growth fights for pledge-vs-record contrast (carried over from Batch 1).
5. **Only open a new data-center fight if a genuinely new one appears** — Eagle Mountain (Meta/Google/QTS) is already covered in Batch 1; resist adding a thin second data-center profile just for volume.
6. **Keep the controversy-first structure and `issueKey` vocabulary** — for the education clusters, `public_schools`, `property_tax`, `gov_waste`, and `housing_build` are the workhorses, so each ASD record drops straight into an Issue Spotlight.
