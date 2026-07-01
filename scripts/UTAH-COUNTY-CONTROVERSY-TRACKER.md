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

---

# Utah County — Controversy Tracker (Batch 3, July 2026)

Batch 3 closes out the remaining carried-over recommendations from Batches 1–2,
staying strictly on controversies rather than doing a broad sweep. It **enriches
`mmckell` with the Utah Lake "islands" repeal arc** (Batch 1 rec #2 / Batch 2 rec
#3), **ties a 2026 commission candidate directly to the county tax-hike fight**
(Batch 1 rec #4), and **builds the two Alpine successor-district board presidents
who have clear, sourced positions** on the split's fiscal aftermath (Batch 2 rec
#1). Data lives in `scripts/deep-dive-utah-county-batch3-jul2026.mjs` (full
profiles + spotlight receipts → Firestore) and the `ISSUE_STANCE_DATA` mirror in
`index.html` (stance cards).

| Controversy | Key Officials (this batch) | Stances Added | Receipts Added | Spotlight Readiness | Status |
|---|---|---|---|---|---|
| **Utah Lake "islands" / Lake Restoration Solutions** (2018 law → dredge-and-build-islands plan → state rejection Oct 2022 → LRS's $3M SLAPP suit vs. BYU's Ben Abbott, dismissed Jan 2023 → LRS dissolves/bankrupt 2023 → 2024 repeal) | **Mike McKell** (`mmckell`) — chief House sponsor of HB272 (2018) **and** chief Senate sponsor of the SB242 (2024) repeal — **ENRICHED, not duplicated** | 1 | 2 | **Strong** as a self-contained arc — one legislator authored the enabling law and its repeal, with le.utah.gov bill records + a direct "clean canvas" quote (Daily Herald, SLTrib, le.utah.gov). Resolves the standing Batch 1/2 recommendation | ✅ Enriched |
| **Utah County Commission ~48% property-tax hike → 2026 race** (the Batch 1 controversy, now litigated in the open Seat B race) | **David Spencer** (`david_spencer_utco`, Seat B GOP nominee) — **ENRICHED** with his direct on-record attack on the county's 2019 (~67%) and 2024 (~48%) hikes + commissioner pay | 1 | 1 | **Strong** — the one 2026 candidate who names the specific commission votes; Lehi Free Press debate coverage with verbatim quotes. Clean pledge-vs-record contrast with the retiring incumbents (Powers Gardner/Gordon) | ✅ Enriched |
| **Alpine split — Lake Mountain (West) successor district** (fastest-growth district; inherits the $238M Saratoga/Eagle Mountain bond; the "schools can't charge impact fees" funding gap) | **Julie King** (Board President) | 4 | 4 | **Strong** — a specific, quoted funding-policy position (Fox13) + a clean tie to the Batch 2 $238M bond cluster; nonpartisan office | ✅ Built |
| **Alpine split — Timpanogos successor district** (smallest enrollment; ~$20M projected deficit; ~17% potential tax increase) | **Jennifer Lyman** (Board President) | 4 | 4 | **Moderate–Strong** — a documented district-wide fiscal projection + her own candid framing (Daily Herald), honestly labeled as an *emerging* posture (no tax vote cast yet) | ✅ Built |

## Totals (built this batch)
- **Officials with new records:** 2 created (King, Lyman) + 2 enriched (McKell, Spencer)
- **Stances added:** 10 (8 on 2 new profiles + 1 merged into McKell + 1 into Spencer)
- **Spotlight receipts added:** 11 (8 on 2 new profiles + 2 appended to McKell + 1 to Spencer)
- **Stance cards mirrored into `index.html`:** 10 (8 new + 1 added to McKell's array + 1 to Spencer's array)
- **Controversies covered:** 2 enrichments (Utah Lake, commission tax-fight tie) + 2 built (Lake Mountain, Timpanogos successor boards)

## Spotlight-ready controversies (sourcing strong enough now)
1. **Utah Lake "islands"** — a rare full-arc accountability story carried by one legislator: McKell wrote the 2018 enabling law and the 2024 repeal, both on le.utah.gov, bracketing the LRS collapse and the Abbott SLAPP win. Ready as a stand-alone "how a project died and the law behind it was unwound" spotlight.
2. **Alpine successor-district funding** — King's impact-fee argument and Lyman's inherited deficit are the *next chapter* of the Batch 2 ASD spotlight; together with Bateman/Beeson/Wilson (outgoing Alpine board) and Brammer/keith_grover (legislative), they complete a full before-and-after on the split.

## Honest gaps (tracked, NOT built — no fabrication)
- **Michelle Kaufusi (Seat A GOP nominee)** already has a record, but her fiscal messaging is a *general Provo-mayor* record ("look at my record … eight balanced budgets"), **not** a stance on the county commission's specific ~48% hike. The sourcing does not support attributing an anti-48%-hike position to her, so she was **not** enriched with one. Her opponent even attacked *her* Provo bonded-debt growth — the opposite framing.
- **November 2026 general-election minor-party/Democratic field** — Seat A: **Jeanne Marie Bowen (D)**, **Jacob D. Oaks (Independent American)**; Seat B: **J. Allen (D)**, **David Hinkley (Forward)**. All advanced unopposed to November, but **none has any publicly sourced position** on taxes/growth/pay. Named here; **not built** (no positions invented). Data-hygiene: "J. Allen" full name and the Hinkley/Hinckley spelling are unconfirmed between outlets — verify against the official ballot before any future build.
- **Other ~18 new-district board members + 3 superintendent hires** — procedural/unanimous with only ceremonial quotes; no accountability material. **Not built.**
- **Asset/debt/$238M-bond division among the three districts** — ratified **unanimously (June 26, 2026)**; every named official calls it cooperative ("not about winners and losers"). **No active dispute** to build a record around.
- A subagent draft claimed Julie King "cast the lone vote against" the Aug-2025 Alpine tax hike — **false** (the 5-2 dissenters were Peterson and Beeson; King is not named). That fabrication was caught in verification and **excluded**. King's record is built only on her sourced Fox13 funding position and her new-board role.

## How Batch 3 compares to Batches 1–2
- **Enrich-don't-duplicate, applied twice more:** McKell and Spencer both already existed, so each got appended receipts + merged stances rather than a second profile — the exact discipline Batch 1 recommended for McKell and Batch 2 applied to Brammer. (McKell's canonical Firestore doc is `mmckell`; the stance card mirrors into the aliased `mike_mckell` `ISSUE_STANCE_DATA` array.)
- **Full-arc accountability:** the Utah Lake entry is the first Utah County record where *the same official* owns both the cause (the 2018 law) and the correction (the 2024 repeal) — a cleaner loop than a single contested vote.
- **Candidate ↔ controversy linkage made explicit:** rather than adding thin new candidate stubs, Batch 3 wires an *existing* 2026 nominee (Spencer) straight into the Batch 1 tax-hike fight with his own verbatim numbers ("67% … 48% … killing the citizens").
- **Emerging-record labeling, again:** Lyman's profile is honestly tagged as posture-not-yet-a-vote, mirroring Carn's "proposal in process" from Batch 2.

## Recommendations for continuing Utah County efficiently (next)
1. **Track Timpanogos and Lake Mountain to their first real money votes** — when Lyman's board actually sets a rate against the ~$20M deficit, or King's board acts on the impact-fee gap, convert the emerging posture into a recorded outcome (kept/broken vs. the framing captured here).
2. **Only build the general-election Democrats/third-party candidates once a sourced position exists** — Bowen, Allen, Oaks, Hinkley are named but empty; wait for a fall voter guide (League of Women Voters / Utah Policy) rather than stubbing them. Confirm "J. Allen" and the Hinkley/Hinckley spelling from the official ballot first.
3. **Do not force a county-tax-hike stance onto Kaufusi** — keep her record to her documented Provo/general-fiscal framing unless she addresses the commission's increase directly.
4. **Assemble the ASD Issue Spotlight now** — the cluster is complete enough for one page: outgoing Alpine board (Bateman/Beeson/Wilson), legislative drivers (Brammer/HB3003, McKell-adjacent), and the two successor presidents (King/Lyman). That's the highest-value synthesis left on the board.
5. **Watch Saratoga Springs to resolution** (carried from Batch 2) — Carn's first-since-2008 increase still needs its council vote recorded.
6. **Keep the controversy-first discipline** — resist volume: the remaining Utah County additions are mostly *outcomes to record later*, not new officials to create now.

