# Cache County — Controversy Tracker

A controversy-first accountability tracker for Cache County (Logan / Cache Valley),
built to give northern Utah's education-and-water corner the same structured
coverage as Box Elder, Weber, and Davis. The unit is the **fight**, not the
politician — sourced records on the issues that currently matter most to Cache
Valley residents, structured to feed future Issue Spotlights.

Unlike the earlier county passes, Cache County starts from an unusually **strong
existing base**: its core officials already carry full profiles and sourced stance
cards in `index.html` (Snider, Wilson, Sandall, Draxler, Moore). This tracker's job
is therefore different from Box Elder's — it does not build profiles from scratch;
it **maps the county's defining controversies onto the records that already exist**,
identifies where those records are thin, and honestly flags the 2026 challenger
fields that are still being certified.

Scope discipline: sitting or incoming officials, and **active** 2026 candidates,
tied to real controversies or real races. Per the project's honesty standard,
**no invented positions for candidates with no public record** — named-but-empty
challengers are tracked here, not stubbed.

---

## Districts that cover Cache County (verified against `index.html`)

Cache County is split across three state House districts and shares a Senate seat
with the rest of the northern top-of-the-state.

- **Utah House Districts 2, 3, 4** — all Cache County (`_UTAH_HOUSE_COUNTY`
  mapping). District 5 (Paradise/southern Cache) is held by **Casey Snider (R)**.
- **Utah Senate District 1** (Box Elder, Cache, Tooele) — inc. **Scott Sandall (R)**.
- **Utah State Senate — Cache/Logan seat** — **Chris Wilson (R)**, the Logan-based
  senator whose record centers on USU oversight, tax, and behavioral-health funding.
- **U.S. Congressional District 1** — inc. **Blake Moore (R)**.

The `cache` browse-tree entry in `index.html` already surfaces House District 5
(Snider), Senate District 1 (Sandall), and Congressional District 1 (Moore), each
with an honest "2026 challenger filings still being certified" note.

---

## The defining Cache County controversies (mapped to built records)

The unit here is the fight. Each row ties a live Cache Valley controversy to the
official(s) already carrying a sourced record on it in `index.html`, and rates how
Spotlight-ready that coverage is.

| Controversy | Key official(s) — already built | Where it lives now | Spotlight readiness |
|---|---|---|---|
| **The Great Salt Lake / Bear River water fight** — keeping conserved farm and mineral water flowing to the shrinking lake vs. agriculture and growth | **Casey Snider (R, H5)** — House sponsor of the 2024 GSL conservation framework, HB 453 (2024) mineral-extraction water limits, HB 513 (2023) mineral-royalties-to-lake, agricultural water-optimization program, HB 275 (2024) water-wise-landscaping law; **Scott Sandall (R, S1)** — landmark instream-flow / lake-replenishment law and water-law modernization | Full profiles + sourced Evidence Locker facts + `ISSUE_STANCE_DATA` stance cards | **High** — the strongest, best-sourced fight in the county (Utah House, le.utah.gov, Ballotpedia). Ready to anchor an Issue Spotlight now. |
| **USU governance & higher-education accountability** — the Utah State University audit that found financial irregularities, and the Logan senator's push to hand trustees real budget oversight | **Chris Wilson (R, Logan)** — chief-sponsored SB 240 (2025) making USU trustees the institution's internal audit committee; SB 129 higher-education development areas | Sourced stance cards (Cache Valley Daily, HJ News) | **Moderate-High** — a distinctly Cache Valley controversy (USU is the county's economic and civic anchor) with a clear, sourced legislative response. |
| **Behavioral-health crisis care in Cache Valley** — access to mental-health "receiving centers" in a largely rural county | **Chris Wilson (R, Logan)** — funded a Cache County behavioral-health receiving center via HB 66 | Sourced stance card (HJ News) | **Moderate** — a real, sourced local-impact record; would pair well with a statewide rural-mental-health Spotlight. |
| **Tax competitiveness vs. education funding** — the recurring northern-Utah tension between income-tax cuts and school/WPU funding | **Chris Wilson (R)** — chief-sponsored SB 69 (2024) income-tax-rate cut, SB 202 property-tax reform; **Jack Draxler** (former) — WPU per-pupil increases, USU research funding, SR-30/US-89 infrastructure | Sourced stance cards (Utah News Dispatch, HJ News) | **Moderate** — records exist on both sides of the trade-off; a Spotlight could frame the tension directly. |

---

## 2026 races in Cache County (honest gaps)

The county's incumbents are built. The **challenger fields are the open work**, and
per the project's honesty standard they are tracked here rather than stubbed until a
sourced individual position exists.

| Race | Incumbent (built) | Challenger status | Action |
|---|---|---|---|
| **U.S. House District 1** | Blake Moore (R) — built | Field still forming; filings being confirmed | ⏳ Tracked — build each challenger once sourced positions land |
| **Utah Senate District 1** | Scott Sandall (R) — built | 2026 filings still being certified | ⏳ Tracked — no invented positions |
| **Utah House District 5** | Casey Snider (R) — built | 2026 filings still being certified | ⏳ Tracked — no invented positions |
| **Utah House Districts 2–4 (Cache)** | Held by sitting members | Records thin/absent for some seats | 🔎 Next batch — prioritise the district with the least existing coverage |

---

## Batch 2 (July 2026) — the COUNTY + CITY tier

**What changed the plan.** Batch 1 mapped only Cache County's *state-legislative* tier
(Snider, Wilson, Sandall, Draxler, Moore) and concluded the county "started from an
unusually strong existing base." Batch 2 research found the opposite is true one level
down: the county's single highest-attention fight of the last two years — the
**property-tax escalation run by the County Council and Executive** — had **zero built
records** (verified: 0 roster hits for Daines, Erickson, Anderson, Goodlander, Zook).
Cache County is governed by a **Council + Executive**, *not* commissioners — a structure
Batch 1 never engaged. Batch 2 opens that tier.

Data script: `scripts/deep-dive-cache-county-batch2-jul2026.mjs` (idempotent; `--emit`
writes the `index.html` stance-card block, `--apply` writes Firestore). Stance cards for
the three new officials are inlined in `index.html` `ISSUE_STANCE_DATA`.

### Controversies added this batch

| Controversy | Official(s) built (CREATE) | Receipts | Spotlight readiness |
|---|---|---|---|
| **The Cache County property-tax escalation (2024 → 2026)** — a proposed 20% hike in 2024 drew ~100 residents overflowing the chambers (trimmed to 12% + a 0.3% sales tax); Executive Zook resigned Sept. 2025; N. George Daines won the special election on a "protect taxpayers" pledge — then the council **unanimously** approved an **18% increase** for 2026 (~$3.7M) | **N. George Daines (R)** — County Executive; the pledge-vs-record arc (ran to protect taxpayers → inherited $7.6M gap → proposed ~$2.8M cuts incl. the library → 18% hike passed). **David L. Erickson (R)** — Council, North District; 2024 chair who told opponents to "vote us out" | 4 + 3 = 7, all HJ News / Cache Valley Daily / KSL / UPR | **High** — the best-sourced local fight in the county now that the county tier is built; one focused pass (add Goodlander + the resident/former-official opposition voices) makes it Spotlight-ready |
| **Logan growth, housing & land use** — Logan (~50K, projected to double by 2060) turned its 2025 mayoral race into a growth referendum; a Sept. 2025 density rezone near the rec complex was denied over infrastructure | **Mark Anderson (Nonpartisan)** — Logan Mayor (sworn Jan. 6, 2026); supply-first housing ("the more supply we can create, the better the pricing"), regional water/infrastructure, communication pledge (+ an honest early stumble on protest signs) | 4, all UPR | **Moderate-High** — a strong single-official anchor; a Spotlight needs one more source pass (the denied rezone vote + a council-member counterpoint) |

### New/improved records (Batch 2)

- **N. George Daines** — `george_daines` — **CREATE**, Cache County Executive (R). 4 receipts, 3 stances. Flagship pledge-vs-record record.
- **David L. Erickson** — `david_erickson_cache` — **CREATE**, Cache County Council, North District (R). 3 receipts (4 spotlight in the Firestore profile), 2 stances.
- **Mark Anderson** — `mark_anderson_logan` — **CREATE**, Logan Mayor (Nonpartisan). 4 receipts, 3 stances.

**Batch 2 totals:** 3 sitting officials created · **8 stances** · **12 spotlight receipts** /
11 inlined stance cards. Zero fabricated positions; every quote verified against a direct
read of the cited article.

### Honest gaps left this batch (tracked, NOT stubbed)

- **Council Chair Sandi Goodlander** presided over the unanimous 18% vote, but **no
  substantive statement could be verified to her by name** in an accessible source.
  Search-engine summaries attributed a mill-levy explanation and a "lowest revenue per
  capita" line to her, but **neither survived a direct read** of the cited articles. She
  is tracked, not stubbed. Same for members **Nolan Gunnell**, **Barbara Tidwell**
  (verified: backs defunding the Logan library over "double taxation" — a single receipt,
  below the 3–5 bar) and **Keegan Garrity** (suggested asking residents which services
  they'd pay more for).
- **Correction caught by verification:** the "unfunded school-resource-officer mandate"
  line that a search summary attributed to Gunnell is actually **David Zook's** ("new
  school safety staff that the state Legislature mandated"). It was **not** attributed to
  Gunnell and was dropped from his (unbuilt) record.
- **David Zook** (former Executive, resigned Sept. 8, 2025) has a clear, documentable
  role but holds no office and is not a 2026 candidate. His verified role is captured as
  **context inside the Daines and Erickson receipts**, not as a standalone stub.
- **No Cache Valley data center / industrial-water controversy exists.** The data-center
  water fights in the news are **Imperial Valley, California** — not Cache Valley, Utah.
  That suggested focus area does **not** apply here; recorded as "no such controversy,"
  not invented.
- **2026 challenger fields** (the County Executive full term, council seats) are not yet
  sourced — tracked, consistent with Batch 1.

---

## Honesty notes

- **Cache County did not need a from-scratch profile build.** Its central figures —
  Snider, Wilson, and Sandall — already carry full profiles and sourced stance cards.
  Re-building them would have added volume without adding truth. The value here is the
  controversy mapping and the honest gap list, not duplicate records.
- **No positions were invented.** Every controversy row above points to a record and a
  source that already exist in `index.html`. Where the 2026 challenger fields are
  empty, they are named and marked "still being certified," never stubbed with
  placeholder stances.
- **Sandall and Moore are shared, not Cache-exclusive.** Senate District 1 spans Box
  Elder, Cache, and Tooele, and CD1 covers the whole northern tier. Their records are
  counted here because they represent Cache voters, but they also anchor the Box Elder
  tracker — the two trackers intentionally overlap on these two seats.

---

## How Cache County now compares to the other northern counties

- **County/legislative tier:** strong. The defining water fight (Snider + Sandall) is
  the best-sourced controversy in the northern set, and the USU-governance and
  behavioral-health records give Cache a second and third distinct, locally-rooted
  fight that Box Elder and Weber don't have.
- **Challenger tier:** open by design. Consistent with how Box Elder and Utah County
  handled uncertified 2026 fields, the challengers are mapped and flagged, not built,
  until sourcing exists.

---

## Recommendations for continuing efficiently (next)

1. **Ship the Great Salt Lake / Bear River water Issue Spotlight first.** It is the
   most Spotlight-ready fight in the county — Snider and Sandall already carry the
   sourced records, and it connects directly to the existing statewide GSL coverage.
2. **Enrich the thin Cache House seats (Districts 2–4)** before adding new counties —
   build the seat with the least existing coverage, using only sourced positions.
3. **Revisit the 2026 challengers after the fall voter guides land** (League of Women
   Voters / Utah voter guides / candidate debates). Build each only once a sourced
   individual position exists — do not stub them before then.
4. **Keep the `issueKey` vocabulary consistent** — `water`, `lands_balance`,
   `enviro_balance`, `gov_transparency`, `public_schools`, `property_tax`, and
   `healthcare` are the workhorses for Cache Valley, so each record drops straight
   into an Issue Spotlight.

### Post-Batch-2 additions to the queue

5. **Finish the county property-tax cast to make it Spotlight-ready.** The fight now has
   its two anchor records (Daines, Erickson). One focused pass — verifying a direct
   Goodlander quote, adding the resident/former-official opposition voices (Lynn Lemon,
   Jess Bradfield), and Tidwell's "double taxation" library position — turns it into a
   full Issue Spotlight. This is now the **most Spotlight-ready local fight** in Cache.
6. **Build the Logan growth Spotlight around the denied Sept. 2025 rezone.** Anderson is
   the anchor; the missing pieces are the specific rezone vote near the Outdoor Rec
   Complex and a Logan Municipal Council member's counterpoint.
7. **Watch the 2026 County Executive general election.** Daines is filling an unexpired
   term through December 2026 — the full-term race is the next live county contest. Build
   challengers only once sourced positions land.

