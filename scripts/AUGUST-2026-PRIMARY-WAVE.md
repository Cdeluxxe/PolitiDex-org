# PolitiDex — August 2026 Primary Wave (ready-to-execute framework)

This file is the **execution playbook** for the next U.S. House expansion wave. It
finishes the bottom-up, delegation-size rollout: the last 4-seat state (Kansas)
and the remaining 5-seat state (Connecticut), plus the one Oklahoma district held
back from the 5-seat wave (OK-01).

**Do not author live profiles from this file alone.** Profiles are added only after
each state's primary settles and **both** major-party nominees are confirmed. This
file pre-stages everything that does *not* depend on the result so the wave can move
the day nominees are official.

Companion skeleton script: [`add-house-august-2026-primary-wave.mjs`](./add-house-august-2026-primary-wave.mjs)
— a copy-ready scaffold with the roster array left empty and a hard `--apply` guard
until it is filled.

---

## The three sub-waves, in order

| Sub-wave | Primary | Trigger to author | Notes |
|---|---|---|---|
| **Kansas** (4 seats) | **Aug 4, 2026** | Both nominees confirmed in all 4 districts | Closes out the 4-seat tier |
| **Connecticut** (5 seats) | **Aug 11, 2026** | Both nominees confirmed in all 5 districts | The other 5-seat state |
| **Oklahoma OK-01** (1 district) | **Aug 25, 2026 runoff** | GOP runoff resolved **and** withdrawal formally settled | Held back from the June 5-seat wave |

Run each sub-wave independently as its primary resolves — do not wait for all three.
The "confirmed nominees only" rule (used in every prior wave) is the gate.

---

## Structural facts that do NOT depend on the primary result

These are stable as of mid-2026 and can be staged now. **Re-verify each incumbent is
actually seeking re-election before authoring** — several listed members are senior and
a retirement reopens the seat (changes classification from incumbent to open).

### Kansas — 4 seats (primary Aug 4, 2026)
- **KS-01** — "Big First," western/central Kansas (rural, agricultural). Incumbent: **Tracey Mann (R)**.
- **KS-02** — eastern Kansas (Topeka). Incumbent: **Derek Schmidt (R)** (won the 2024 open seat; former state attorney general).
- **KS-03** — Kansas City suburbs (Johnson/Wyandotte). Incumbent: **Sharice Davids (D)** — the delegation's most competitive seat and the marquee race.
- **KS-04** — south-central Kansas (Wichita). Incumbent: **Ron Estes (R)**.

### Connecticut — 5 seats (primary Aug 11, 2026)
All five seats are currently held by Democrats.
- **CT-01** — Hartford. Incumbent: **John Larson (D)** (senior — verify re-election).
- **CT-02** — eastern Connecticut. Incumbent: **Joe Courtney (D)**.
- **CT-03** — New Haven. Incumbent: **Rosa DeLauro (D)** (senior, Appropriations ranking member — verify re-election).
- **CT-04** — Fairfield County / Greenwich. Incumbent: **Jim Himes (D)** (Intelligence Committee ranking member).
- **CT-05** — northwest / central Connecticut. Incumbent: **Jahana Hayes (D)** — the most competitive Connecticut seat.

### Oklahoma — OK-01 only (Aug 25, 2026 runoff)
- **OK-01** — Tulsa-anchored. **OPEN** (Kevin Hern vacated to run for U.S. Senate).
- The 11-candidate June 16 Republican primary produced no majority winner and advanced
  to the **Aug 25 runoff** (Tedford ~32% / Lahmeyer ~26%); the second-place finisher
  then withdrew. **Do not author until the Republican nominee is officially settled.**
- Confirm the **Democratic** nominee for OK-01 as well (was not set in the June wave).
- When added, OK-01 joins the four Oklahoma districts already live (OK-02 Brecheen,
  OK-03 Lucas, OK-04 Cole, OK-05 Bice).

---

## Per-candidate data structure to collect (mirror of the existing waves)

For **each** confirmed nominee, gather the fields the renderer expects. The shape is
identical to the June waves — see `add-house-5seat-states-oklahoma-jun2026.mjs` for a
worked example. Required:

- `id` (snake_case), `name`, `party`, `state`, `district` (e.g. `'Kansas — 3rd District'`)
- `status`: `'office'` for a sitting member seeking re-election, `'candidate'` for a nominee for a seat they do not hold
- `candidacyStatus: 'active'` (every general-election nominee), `rank: 'nominee'` for non-incumbents
- `nextElection: '2026-11-03'`, `icon`, `score`, `office` text
- `bio` — a real, sourced biography (no placeholders)
- `keyIssues[]` — 4–5 short labels
- `accountability: { overallScore, summary }`
- `promises[]` — each `{ title, verdict, issueKey, detail, sources[] }`. **`verdict: 'kept'` only**
  for a documented completed action with a citation (an enacted law, a recorded floor
  vote that fulfills a stated pledge). Forward-looking pledges are `'pending'`.
- `positions[]` — each `{ topic, icon, pos, issueKey, issueStance, text, evidence?, source }`.
  These become both the `ISSUE_STANCE_DATA` cards and the Firestore `stances` mirror.
- `spotlight[]` (Connected Evidence, optional but preferred for incumbents) — each
  `{ impact, category, date, tags[], issueKey, headline, facts, why, source }`.

### Evidence sourcing checklist (for sitting incumbents)
Pull from primary records so every claim is citable:
- **Recorded floor votes** — House Clerk roll calls (`clerk.house.gov/Votes/<congress><rollcall>`).
  The two highest-salience 2025 votes already used across the roster: **H.R. 1** (the 2025
  reconciliation/tax law, Roll Call 190, 218–214, July 3, 2025) and the **Laken Riley Act**
  (H.R. 29, Roll Call 6, Jan 7, 2025).
- **Sponsored/enacted bills** — `congress.gov` member pages and `govtrack.us`. Distinguish
  *introduced* vs *passed one chamber* vs *enacted* — only an enacted law (or a vote that
  fulfills a pledge) earns `verdict: 'kept'`.
- **Committee/leadership roles** — the member's `house.gov` site and the committee site.
- For **challengers with no federal record**, do **not** invent positions or overstate the
  record. Use only documented campaign positions, and keep scores reflecting record depth
  for the office sought (not approval).

---

## Validation gate (every issueKey must be real)

Every `issueKey` used in `promises`, `positions`, and `spotlight` must exist in the live
`ISSUE_MAP` vocabulary in `index.html` (86 keys as of June 2026). The skeleton script
validates this automatically on a dry run; never `--apply` with an invalid key.

To list the current vocabulary:

```bash
node -e 'const fs=require("fs");const h=fs.readFileSync("index.html","utf8");const s=h.slice(h.indexOf("var ISSUE_MAP = {"),h.indexOf("try { window.ISSUE_MAP"));console.log([...s.matchAll(/^\s{6}([a-z_]+):\s+\{ label:/gm)].map(m=>m[1]).join(" "))'
```

---

## Execution steps (per sub-wave)

1. **Confirm nominees** for every district in the sub-wave (both major parties). For OK-01,
   also confirm the GOP runoff result and any withdrawal is officially resolved.
2. **Fill the roster** in `add-house-august-2026-primary-wave.mjs` (replace the empty
   `PEOPLE` array; remove the `--apply` guard's empty-roster block).
3. **Dry run**: `node scripts/add-house-august-2026-primary-wave.mjs` — confirm all
   issueKeys validate.
4. **Emit blocks**: `node scripts/add-house-august-2026-primary-wave.mjs --emit` — writes the
   `ISSUE_STANCE_DATA` and `ACCT_SPOTLIGHT` blocks to `/tmp`.
5. **Apply to index.html**: paste the emitted blocks into `ISSUE_STANCE_DATA` (near the other
   2026 House entries) and `ACCT_SPOTLIGHT`. Re-verify both objects still parse.
6. **Apply to Firestore**: `node scripts/add-house-august-2026-primary-wave.mjs --apply`
   (idempotent — existing records are skipped unless `--force`).
7. **Classification check**: sitting members seeking re-election → `status: 'office'`,
   green "In Office" badge, `nextElection: '2026-11-03'`; nominees for a new seat →
   `status: 'candidate'`, `rank: 'nominee'`, office text contains "Nominee".

---

## After this wave

With Kansas and Connecticut done, every 1- through 5-seat state is covered, and OK-01
completes Oklahoma. The next rung up the bottom-up ladder is the **6-seat tier**
(states with six districts whose primaries have closed). Stage that the same way:
structural facts first, profiles once nominees are confirmed.
