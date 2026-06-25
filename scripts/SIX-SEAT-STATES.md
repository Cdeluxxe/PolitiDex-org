# PolitiDex — 6-seat states (next rung of the bottom-up House expansion)

This file is the **staging playbook** for the 6-seat tier of the systematic,
bottom-up U.S. House rollout. It captures every structural fact that does *not*
depend on a primary result, so profiles can be authored the moment nominees are
confirmed — without re-researching the basics.

**Do not author live profiles from this file alone, and do not edit `index.html`
or push to the data store yet.** This is preparation only. Authoring happens per
state, after that state's primary settles and **both** major-party nominees are
confirmed (the "confirmed nominees only" gate used in every prior wave).

Companion skeleton script: [`add-house-6seat-states-2026.mjs`](./add-house-6seat-states-2026.mjs)
— a copy-ready scaffold with the roster array left empty, the 6-seat structural
facts pre-staged, an automatic `issueKey` validator, and a hard `--apply` guard
until the roster is filled.

Bottom-up discipline: the 6-seat tier is the rung **above** the 4- and 5-seat
tiers staged in the August 2026 wave ([`AUGUST-2026-PRIMARY-WAVE.md`](./AUGUST-2026-PRIMARY-WAVE.md)).
Finish Kansas (4), Connecticut (5), and Oklahoma OK-01 before promoting any
6-seat state from staging to authoring.

---

## 1. The exact 6-seat list (2020 apportionment)

Under the 2020 Census apportionment (in effect 2023–2033), **exactly three
states hold six U.S. House seats**:

| State | Seats | Primary | Status as of June 2026 |
|---|---|---|---|
| **Kentucky** | 6 | **May 19, 2026** | **Concluded** — nominees set |
| **Louisiana** | 6 | *Suspended* (was May 16, 2026) | **Blocked** — map struck down, elections postponed |
| **Oregon** | 6 | **May 19, 2026** | **Concluded** — nominees set |

This list was confirmed by reconciling the full 50-state apportionment to 435
seats: the only states allocated six seats are Kentucky, Louisiana, and Oregon.
Oregon gained its sixth seat in the 2020 reapportionment.

**Note on Oklahoma:** Oklahoma is a **5-seat** state, not a 6-seat state. It was
handled in the June 5-seat wave (OK-02 through OK-05 live; OK-01 held back to the
August wave). It does **not** belong to this tier — any reference to "Oklahoma"
in the 6-seat context is a mislabel.

---

## 2. Structural facts per state (do NOT depend on the primary result)

Incumbent = the member currently holding the seat (the 119th Congress). Where a
primary has already resolved the 2026 nominee, that is noted — but a nominee is
only *authored* after both major parties' nominees in a district are confirmed.

### Kentucky — 6 seats · primary **May 19, 2026** (concluded)

District numbering runs KY-01 (far west) to KY-06 (central). Five seats are held
by Republicans; KY-03 (Louisville) is the lone Democratic seat.

| District | Area | Incumbent (party) | 2026 status | Notes |
|---|---|---|---|---|
| **KY-01** | Far western Kentucky (Paducah, Pennyrile, southern Bluegrass spur) | **James Comer (R)** | Running for re-election | Chairs the House Oversight Committee; won 2024 with ~75%. Safe R. |
| **KY-02** | South-central Kentucky (Bowling Green, Elizabethtown) | **Brett Guthrie (R)** | Running for re-election | Chairs House Energy & Commerce. Safe R. |
| **KY-03** | Louisville / Jefferson County | **Morgan McGarvey (D)** | Running for re-election | The delegation's only Democratic seat; no primary challenger. Safe D. |
| **KY-04** | Northern Kentucky (Cincinnati suburbs, Ohio River counties) | **Thomas Massie (R)** | **Lost primary** | Defeated in the GOP primary by **Ed Gallrein (R)** ~54.9–45.1; record-spending Trump-backed race. **2026 R nominee is Gallrein, not the incumbent.** Seat stays R-leaning. |
| **KY-05** | Eastern Kentucky / Appalachian coalfields (Pikeville, Somerset) | **Harold "Hal" Rogers (R)** | Running for re-election | Dean of the House (most senior member); ran unopposed in 2024. Re-verify he reaches the general before authoring. Safe R. |
| **KY-06** | Central Kentucky (Lexington, Georgetown, Richmond, Nicholasville) | **OPEN** (Andy Barr, R, vacated) | **Open seat** | Barr left to run for U.S. Senate (won the May 19 GOP Senate primary; faces Charles Booker in November). 12 candidates filed for KY-06 (7 D / 5 R); DCCC lists it among "44 Districts in Play." **Most competitive Kentucky House seat** — confirm both nominees before authoring. |

**Redistricting:** Kentucky's map is settled and not in active litigation for 2026.

### Louisiana — 6 seats · primary **SUSPENDED** (was May 16, 2026)

> ⚠ **Blocked tier — do not stage a primary date or author profiles.** Louisiana's
> U.S. House elections are postponed pending a new map. Treat the district
> boundaries and numbering below as the *2024 map only* — they are expected to
> change before the rescheduled 2026 election.

Background (all structural, none of it authoring-ready):
- Louisiana adopted **closed party primaries** for congressional races for the
  first time since 1975 (replacing the "jungle" primary), originally set for
  **May 16, 2026** with a **June 27** runoff.
- In **Louisiana v. Callais** the Supreme Court ruled **6–3 on April 29, 2026**
  (majority opinion by Justice Alito) that the state's 2024 congressional map —
  which added a second majority-Black district (LA-06) — was an illegal racial
  gerrymander.
- On **April 30, 2026** Gov. Jeff Landry **suspended** the May 16 U.S. House
  primaries (and the June 27 runoff) to give the Legislature time to redraw the
  map. Other May 16 offices and ballot measures proceeded; only the U.S. House
  races are suspended.
- Expectation: the redrawn map likely **eliminates at least one majority-Black
  district** (possibly two), which would reshape LA-06 (and potentially LA-02).
  A return to the all-party "jungle" format for 2026 is also possible. The new
  primary date and structure are **not yet set**.

Current incumbents (2024 map — boundaries subject to change):

| District | Area (2024 map) | Incumbent (party) | Notes |
|---|---|---|---|
| **LA-01** | Northshore / suburban Jefferson, southeast Louisiana | **Steve Scalise (R)** | House Majority Leader. |
| **LA-02** | New Orleans → Baton Rouge corridor (majority-Black) | **Troy Carter (D)** | Long-standing majority-Black seat; could be affected by remap. |
| **LA-03** | Acadiana — Lafayette, Lake Charles, southwest | **Clay Higgins (R)** | |
| **LA-04** | Northwest — Shreveport and west-central | **Mike Johnson (R)** | **Speaker of the House.** |
| **LA-05** | Northeast / central — Monroe, Alexandria | **Julia Letlow (R)** | |
| **LA-06** | Baton Rouge ↔ Shreveport (second majority-Black district) | **Cleo Fields (D)** | The district **at the center of *Callais*** — most likely to be redrawn or eliminated. |

### Oregon — 6 seats · primary **May 19, 2026** (concluded)

Oregon gained its sixth seat in 2020. Five seats are held by Democrats; OR-02 is
the lone Republican seat. **All six incumbents sought re-election** and won their
primaries. OR-04, OR-05, and OR-06 are the recurring battlegrounds; only OR-05 is
on the DCCC "Frontline" (most-vulnerable) list.

| District | Area | Incumbent (party) | 2026 status | Notes |
|---|---|---|---|---|
| **OR-01** | NW Portland suburbs, north coast (Washington Co., Hillsboro) | **Suzanne Bonamici (D)** | Running for re-election | Safe D. |
| **OR-02** | Eastern + southern Oregon (Bend, Medford, the largest, most rural district) | **Cliff Bentz (R)** | Running for re-election | The delegation's only Republican seat. Safe R. |
| **OR-03** | Inner Portland / east Multnomah Co. | **Maxine Dexter (D)** | Running for re-election | First full term (won the 2024 open seat after Earl Blumenauer retired). Safe D. |
| **OR-04** | Eugene, southwest coast (Lane, Douglas) | **Val Hoyle (D)** | Running for re-election | Past battleground; held in 2024. Lean D. |
| **OR-05** | Portland suburbs → Bend (Clackamas, Deschutes) | **Janelle Bynum (D)** | Running for re-election | **Marquee race.** First-termer (beat Lori Chavez-DeRemer in 2024; Chavez-DeRemer is now U.S. Labor Secretary). 2026 R nominee is **Patti Adair** (Deschutes Co. Commissioner). Only Oregon seat on the DCCC Frontline list. **Toss-up / Lean D.** |
| **OR-06** | Willamette Valley — Salem, Polk/Yamhill, parts of Marion/Clackamas/Washington | **Andrea Salinas (D)** | Running for re-election | 2026 R nominee **David Russ**. Re-elected 53.3% in 2024. Lean D. |

**Redistricting:** Oregon's map is settled and not in active litigation for 2026.

---

## 3. Authoring trigger per state (the "confirmed nominees only" gate)

| State | Trigger to author | Earliest realistic timing |
|---|---|---|
| **Oregon** | All six districts have both major-party nominees confirmed (done — primary settled May 19, 2026) | **Ready now** (once the 4-/5-seat tiers close per bottom-up order) |
| **Kentucky** | All six districts confirmed; KY-04 uses **Ed Gallrein (R)** as nominee (Massie defeated); KY-06 open-seat nominees of both parties confirmed | **Ready now** (primary settled May 19, 2026) |
| **Louisiana** | **Blocked** until the new map is enacted, the primary is rescheduled, and both nominees per (new) district are confirmed | **Unknown** — gated on the post-*Callais* remap |

Run each state independently as it clears the gate; do not wait for Louisiana.

---

## 4. Per-candidate data structure to collect (mirror of the prior waves)

Identical to the June and August waves — see
[`add-house-5seat-states-oklahoma-jun2026.mjs`](./add-house-5seat-states-oklahoma-jun2026.mjs)
for a worked incumbent and challenger. For **each** confirmed nominee:

- `id` (snake_case), `name`, `party`, `state`, `district` (e.g. `'Oregon — 5th District'`)
- `status`: `'office'` for a sitting member seeking re-election; `'candidate'` for a
  nominee for a seat they do not currently hold (e.g. KY-04 Gallrein, KY-06 open-seat
  nominees, any challenger).
- `candidacyStatus: 'active'`, `rank: 'nominee'` for non-incumbents
- `nextElection: '2026-11-03'`, `icon`, `score`, `office` text
- `bio` — a real, sourced biography (no placeholders)
- `keyIssues[]` — 4–5 short labels
- `accountability: { overallScore, summary }`
- `promises[]` — each `{ title, verdict, issueKey, detail, sources[] }`.
  **`verdict: 'kept'` only** for a documented completed action with a citation
  (an enacted law, or a recorded floor vote that fulfills a stated pledge).
  Forward-looking pledges are `'pending'`.
- `positions[]` — each `{ topic, icon, pos, issueKey, issueStance, text, evidence?, source }`.
  These become both the `ISSUE_STANCE_DATA` cards and the `stances` mirror.
- `spotlight[]` (Connected Evidence; preferred for incumbents) — each
  `{ impact, category, date, tags[], issueKey, headline, facts, why, source }`.

**Individual-record discipline (CONTENT_STYLE.md):** describe what *this person*
did, said, sponsored, or pledges — never their party. A vote tally is a fact;
"on party lines" is editorializing. Record each member's own actions as
individual records — never batch a party-line vote across a roster.

### Evidence sourcing checklist (sitting incumbents)
- **Recorded floor votes** — House Clerk roll calls (`clerk.house.gov/Votes/<congress><rollcall>`).
  High-salience 2025 votes already used across the roster: **H.R. 1** (2025
  reconciliation/tax law, Roll Call 190, 218–214, July 3, 2025) and the **Laken
  Riley Act** (H.R. 29, Roll Call 6, Jan 7, 2025).
- **Sponsored/enacted bills** — `congress.gov` member pages, `govtrack.us`.
  Distinguish *introduced* vs *passed one chamber* vs *enacted* — only an enacted
  law (or a vote fulfilling a pledge) earns `verdict: 'kept'`.
- **Committee/leadership roles** — the member's `house.gov` site (e.g. Comer →
  Oversight chair, Guthrie → Energy & Commerce chair, Scalise → Majority Leader,
  Johnson → Speaker, Rogers → House dean).
- For **challengers / open-seat nominees with no federal record** (KY-04 Gallrein,
  KY-06 nominees, Oregon R challengers), do **not** invent positions or overstate
  the record. Use only documented campaign positions; keep the score reflecting
  record depth for the office sought (not approval).

---

## 5. Validation gate (every issueKey must be real)

Every `issueKey` used in `promises`, `positions`, and `spotlight` must exist in
the live `ISSUE_MAP` vocabulary in `index.html` (**86 keys** as of June 2026).
The skeleton script validates this automatically on a dry run; never `--apply`
with an invalid key.

To list the current vocabulary:

```bash
node -e 'const fs=require("fs");const h=fs.readFileSync("index.html","utf8");const s=h.slice(h.indexOf("var ISSUE_MAP = {"),h.indexOf("try { window.ISSUE_MAP"));console.log([...s.matchAll(/^\s{6}([a-z_]+):\s+\{ label:/gm)].map(m=>m[1]).join(" "))'
```

---

## 6. Execution steps (per state, once it clears the gate)

1. **Confirm nominees** for every district in the state (both major parties). For
   Kentucky, use Gallrein (R) for KY-04 and confirm both KY-06 open-seat nominees.
2. **Fill the roster** in `add-house-6seat-states-2026.mjs` (replace the empty
   `PEOPLE` array; remove the `EMPTY_ROSTER_GUARD` block in `main()`).
3. **Dry run**: `node scripts/add-house-6seat-states-2026.mjs` — confirm all
   issueKeys validate.
4. **Emit blocks**: `node scripts/add-house-6seat-states-2026.mjs --emit` — writes
   the `ISSUE_STANCE_DATA` and `ACCT_SPOTLIGHT` blocks to `/tmp`.
5. **Apply to index.html**: paste the emitted blocks into `ISSUE_STANCE_DATA`
   (near the other 2026 House entries) and `ACCT_SPOTLIGHT`. Re-verify both
   objects still parse.
6. **Apply to the data store**: `node scripts/add-house-6seat-states-2026.mjs --apply`
   (idempotent — existing records are skipped unless `--force`).
7. **Classification check**: sitting members seeking re-election → `status:'office'`,
   green "In Office" badge, `nextElection:'2026-11-03'`; nominees for a seat they
   do not hold (Gallrein, KY-06 nominees, challengers) → `status:'candidate'`,
   `rank:'nominee'`, office text contains "Nominee".

---

## 7. After this tier

With Kentucky, Louisiana, and Oregon authored, the 6-seat tier is complete and
the bottom-up ladder reaches the **7-seat tier** (Alabama, South Carolina).
Stage that the same way: structural facts first, profiles once nominees are
confirmed. Louisiana will likely trail the rest of its tier until the
post-*Callais* map and primary schedule are finalized — track it separately and
author it whenever its (new) districts settle.
