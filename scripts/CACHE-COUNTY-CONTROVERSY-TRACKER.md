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
