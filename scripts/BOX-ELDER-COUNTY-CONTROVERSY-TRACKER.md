# Box Elder County — Controversy Tracker

A controversy-first accountability tracker for Box Elder County, built to give the
northern-Utah top-of-the-state the same structured coverage as Davis and Weber. The
unit is the **fight**, not the politician — sourced records on the issues that
currently matter most to Box Elder residents, structured to feed future Issue
Spotlights. County-tier data lives in
`scripts/deep-dive-box-elder-county-batch1-jun2026.mjs` and
`…-batch2-jun2026.mjs`; the state-legislative tier lives in
`scripts/deep-dive-box-elder-legislative-jul2026.mjs`. Every full profile + its
spotlight receipts write to Firestore, and the stance cards mirror into the
`ISSUE_STANCE_DATA` block in `index.html`.

Scope discipline: sitting or incoming officials, and **active** 2026 candidates,
tied to real controversies or real races. No blanket pass over every filer, and —
per the project's honesty standard — **no invented positions for candidates with
no public record**. Named-but-empty candidates are tracked here, not stubbed.

---

## The defining Box Elder controversy: the Stratos data center (county tier — built earlier)

A ~9 GW / ~40,000-acre data-center campus in rural northwest Box Elder, advanced
via the state's Military Installation Development Authority (MIDA) in a way that
sidestepped county zoning, and approved 3–0 by the county commission. The backlash
was fast and electoral: in the June 23, 2026 primary, both commissioners who voted
yes (Lee Perry, Boyd Bingham) and the sheriff (Kevin Potter) lost their seats.

| Controversy | Key Officials (built) | Where | Status |
|---|---|---|---|
| **Stratos data center — the 3–0 vote and its fallout** | Tyler Vincent (Chair), Lee Perry, Boyd Bingham (voted yes), Kevin Potter (Sheriff), + Attorney Stephen Hadfield, Clerk Marla Young | Batch 1 (sitting officials) | ✅ Built |
| **The 2026 replacements who ran on the backlash** | Nathan Tueller (Comm. Seat B, unopposed), Vance Smith (Comm. Seat A, contested), Mike Allred (Sheriff, contested) | Batch 2 (incoming winners) | ✅ Built |

County-tier officials carry 100%-sourced stance cards; that layer is considered
solid. This tracker's newest section extends the picture **up to the state
legislature**.

---

# Box Elder — State-Legislative Pass (Batch 3, July 2026)

Batch 3 finishes the northern-Utah picture at the **legislative tier**, so Box
Elder reaches parity with Davis and Weber (which already have legislative
challenger coverage). It builds records for the **active, non-incumbent 2026
challengers** in the three districts that cover Box Elder County, prioritising
those with thin or no existing records.

### Districts that cover Box Elder County (verified July 2026)

- **Utah Senate District 1** (Box Elder, Cache, Tooele) — inc. **Scott Sandall (R)**
- **Utah House District 1** (all of Box Elder + NE Cache) — inc. **Thomas Peterson (R)**
- **Utah House District 6** (NW Weber + part of Box Elder incl. eastern Brigham
  City) — inc. **Rob Bishop (R)**, seated via the April 2026 special election for
  Matthew Gwynn's seat

> **On the brief's "Senate District 17":** no Utah Senate district numbered 17
> covers Box Elder County. Box Elder's Senate seat is **District 1** (Sandall).
> The brief's number is treated as a mislabel; this pass builds the verified
> District 1 field and says so plainly rather than inventing a "District 17."

| Race / fight | Candidate (this batch) | Stances | Receipts | Spotlight readiness | Status |
|---|---|---|---|---|---|
| **Senate District 1 — a two-party contest in a ~88% GOP county** (rural water/agriculture seat held by Sandall) | **Claudia Bigler** (D) — retired 33-yr Box Elder HS educator; education-funding + two-party-representation platform | 3 | 5 | **Moderate** — a focused, well-sourced *challenger pledge* record (KSL, Box Elder County .gov, HJ News, Box Elder News Journal, Ballotpedia, Wikipedia's 2026 Senate record) with an honest, stated limit: no position found on water/GSL, taxes, growth, ag, or public safety | ✅ Built |
| Senate District 1 (third choice) | Julie Quinlan (Forward) | 0 | 0 | n/a — confirmed Forward nominee, but no sourced individual positions or bio found | ⏳ Tracked, not built (honest gap) |
| House District 1 (Peterson's seat) | Chris Reid (D) | 0 | 0 | n/a — presumptive 2026 D nominee (sole D filer; also ran 2024), no sourced positions; name spelling Reid/Reed unresolved | ⏳ Tracked, not built (honest gap) |
| House District 1 (third party) | Jason O'Dell (Constitution) | 0 | 0 | n/a — filed, no sourced positions | ⏳ Tracked, not built (honest gap) |
| House District 6 (Bishop's seat) | James Rich (Forward) | 0 | 0 | n/a — confirmed Forward nominee vs Bishop; no sourced bio/positions (the Ballotpedia "James Rich" is a different Arizona person — do not conflate) | ⏳ Tracked, not built (honest gap) |
| Senate District 1 (eliminated) | Fred Hayes (R) | 0 | 0 | n/a — lost the GOP nod at convention (Sandall ~81% of delegates); write-in disqualified; not on the general ballot | 🚫 Skipped (eliminated) |

## Totals (built this batch)
- **Candidates with new records:** 1 created (Claudia Bigler)
- **Stances added:** 3 (on the new profile)
- **Spotlight receipts added:** 5 (all sourced, HTTP-verified)
- **Stance cards mirrored into `index.html`:** 4
- **Active challengers tracked as honest gaps (named, not built):** 4 (Quinlan, Reid, O'Dell, Rich) + 1 eliminated (Hayes)

## Honesty notes (why only one build)
- **Bigler is the only challenger with a substantive, sourced public record.** Her
  33-year Box Elder High School teaching career, her education-funding plank, her
  two-party-representation rationale, her Ballotpedia survey answers, and her 2024
  House-1 result (a 11,677–2,552 loss to Peterson, with UEA and Women's Democratic
  Club backing) are all verifiable. Everything is labeled **campaign pledge** — she
  has no legislative voting record — and her profile states openly that no sourced
  position was found on water/Great Salt Lake, taxes, growth, agriculture, or
  public safety, so none is asserted.
- **The other active challengers were left as honest gaps, not stubs.** Quinlan,
  Reid, O'Dell, and Rich are confirmed on the ballot, but no sourced individual
  positions or biographies were found. Consistent with how the Utah County tracker
  handled empty general-election fields (Bowen/Allen/Oaks/Hinkley), they are named
  here and not built — no positions were invented to pad volume.
- **Incumbents were left unchanged.** Sandall (full profile), Peterson (stance
  cards), and Bishop (stance cards) already have records and are outside this
  challenger-first pass.

## How Box Elder now compares to Davis and Weber
- **County tier:** solid — sitting officials, the Stratos backlash, and the 2026
  incoming winners are all built and fully sourced (Batches 1–2).
- **Legislative tier:** the seats are now *mapped and contested-record-aware*.
  Every district covering Box Elder has its incumbent on file and its active
  challengers accounted for — one built (Bigler) and the rest honestly tracked.
  This is reasonable completeness for July 2026: the built record matches the
  available sourcing, and the gaps are documented rather than hidden.

## Recommendations for continuing efficiently (next)
1. **Revisit Quinlan, Reid, O'Dell, and Rich after the fall voter guides land**
   (League of Women Voters / Utah voter guides / candidate debates). Build each
   only once a sourced individual position exists — do not stub them before then.
2. **Confirm the "Reid" vs "Reed" spelling from the official Box Elder ballot**
   before building Chris Reid.
3. **Enrich the incumbents' thin stance cards with sources** — Rob Bishop's cards
   (House 6) currently carry no source links, and there is verified reporting on
   his platform (growth management, teacher-regulation relief, northern-Utah water
   rights, and the redistricting fight) in KSL and Deseret News that could source
   them without inventing anything.
4. **Watch Sandall–Bigler for a debate or head-to-head** that puts Bigler on the
   record on water/taxes/growth; convert any sourced statement into new receipts
   and lift her from a pledge-only to a positioned record.
5. **Keep the controversy-first discipline and `issueKey` vocabulary** —
   `public_schools`, `democracy_balance`, `gov_balance`, `water`, `rural_ag`,
   `property_tax`, and `back_police` are the workhorses for this region, so each
   record drops straight into an Issue Spotlight.
