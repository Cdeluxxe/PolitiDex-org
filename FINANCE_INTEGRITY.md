# PolitiDex Campaign-Finance Lane

PolitiDex's "promises, money, receipts" mission has three legs. This document
covers the **money** leg — and the first thing it has to say is what that leg
stopped being.

## The score is retired

This page used to document a **0–100 "Constituents-First signal"**: a number
that started at 50, added up to +50 for a small-dollar share, subtracted up to
−30 for large-individual and PAC money, −20 for self-funding and −12/6/2 for
outside-spending exposure, clamped the result to 3–97, and printed it as one of
three graded levels — **Constituents-First** (65+), **Mixed Funding** (45–64) or
**Special-Interest Heavy** (below 45) — in green, amber or red, with a "Why this
score" list of ±point badges.

It is gone. Not behind a flag and not computed-but-unread: the arithmetic, the
clamp, the level cut-offs, the colour ramp and the reason list are **deleted**
from `index.html`. A dormant grade with a live accessor is how a retired grade
comes back, which this codebase has already learned twice with the
Accountability of Truth composite.

Two reasons it had to go.

**It read as a third match %.** Beside ⚖️ Word vs Action's percentage and Your
Match's percentage, a third 0–100 tile about the same person is a blended
overall score in everything but name. And unlike those two, it rested on no
formal record and cleared no publication floor — the one honest thing about it
was the list of reasons, which is not the same as being grounded.

**The coverage made it a verdict built from almost no data.** Itemized filings
are on file for **13** people. PolitiDex carries profiles for **757**. A red
"Special-Interest Heavy" badge against that denominator is a judgement about a
person derived from data the site does not have — and the 744 people with no
badge at all could not tell "checked, nothing concentrated" from "never
checked", because the money section rendered *nothing* for them.

## What is published instead

`finance-lane.js` owns one composition read — `PDXFinanceLane` — and every
finance surface goes through it. For a person with an itemized filing it reports
what the filing says:

```
$2.4M in itemized receipts · 2024 cycle
  small-dollar contributions        $1.5M   62%
  large individual contributions    $0.6M   25%
  PAC contributions                 $0.3M   13%
  Moderate outside spending reported on their behalf. → verify at source
```

Dollars per bucket, each bucket's share **of that base**, and the largest
reported source named as a fact about a sorted list. No headline number, no
level, no letter, no verb. A share of a composition is composition; what is
forbidden is a single figure standing in for the whole person.

**The palette is categorical, and that is a doctrine decision, not a style one.**
The old chart keyed small-dollar to green and PAC to red, so the colours
delivered the verdict after the words stopped — a reader did not have to read
the legend to know which bucket they were meant to disapprove of. The five hues
in `PDXFinanceLane.COLORS` distinguish buckets and rank none of them, and this
codebase's yes/no colours (`#4ade80`, `#f87171`) do not appear in the lane, in
the Money Tree's palette, or in the impact-ledger recap.

## Coverage, disclosed every time

`PDXFinanceLane.coverage()` reads both counts off the shipped index — never
hard-coded — and returns the sentence every surface prints:

> Itemized filings are on file for 13 of the 757 people PolitiDex carries. Where
> a filing is missing, that is missing data — it is not a finding about the
> person, and nothing on this lane is read as one.

The disclosure is attached to **every** composition read (`read().coverage`), so
a surface cannot render the chart and forget the caveat. This is the same
posture `publication-floor.js` takes when it refuses to publish a Direction
Match read: state the rule, state what you do not have, in words, unprompted.

**And the lane renders in both states.** `PDXFinanceLane.entryHtml(pid)` returns
a row whether or not a filing exists. On file it names the largest reported
source and opens the door to the full breakdown. Off file it says plainly that
no filing is on file and that this is missing data. The absent state is a
sentence about the data; it is never a sentence about the person, and it uses
none of the words "clean", "clear", "good" or "bad".

## The wall

Declared on the object as `PDXFinanceLane.NEVER_FEEDS` and asserted by
`scripts/test-finance-lane.mjs`:

- Not an input to **Direction Match** / **⚖️ Word vs Action**. Not weighted in,
  not a tiebreak, not a confidence modifier.
- Not an input to a **formal pattern tier**, to the **publication floor**, or to
  any **count of formal acts**.
- Not an input to **ballot sort order**, to **Your Match**, or to any ranking of
  one person against another.
- Reads no party field and has no opinion about one.
- **No motive language.** A filing shows where money came from. It does not show
  why anyone voted for anything, and this lane never says it does.

The suite enforces the wall twice: statically, `word-action.js`,
`publication-floor.js`, `voting-record.js`, `stance-helpers.js` and
`consistency.js` do not name the finance lane or any funding bucket at all; and
at runtime, seeding a full filing onto the member under test leaves the Direction
Match read, the formal pattern tiers, the publication floor and the mapped
counts byte-identical.

## The data

Each tracked politician has an itemized funding breakdown for one representative
cycle in `FTM_FUNDING` (in the Follow-the-Money block of `index.html`), sourced
from public filings:

- **Federal** offices → the **FEC** (`fec.gov/data`) and OpenSecrets.
- **State / local** offices (e.g. Governor Cox) → **Utah's state disclosure
  system** (`disclosures.utah.gov`).

The buckets mirror what the FEC itself reports, so every share shown in the UI
is one raw number divided by others on the same page — auditable end to end:

| Bucket | Meaning |
|---|---|
| `smallDollar` | Unitemized / small individual donors (grassroots, < $200) |
| `largeIndividual` | Large itemized individual contributions |
| `pac` | PAC & committee money (incl. corporate / industry PACs) |
| `selfFunded` | The candidate's own money / loans |
| `party` | Party-committee transfers |
| `outside` | Independent / "dark-money" spending *for* them, reported as a **level** (high / moderate / low / none) and **never** as a dollar figure — outside spending is not itemized to the candidate, so a figure for it would be invented |

All five contribution buckets are summed into the itemized base and reported.
Party transfers are no longer singled out as "neutral, left out of the math"
because there is no longer any math for them to be left out of.

Figures are representative most-recent-cycle totals. The UI links every card to
the live FEC / OpenSecrets / Utah-disclosure page so a visitor can verify.

## Freshness / provenance

Every finance record carries a review date. A module-level `FTM_AS_OF` sets the
default (currently **July 2026**), and any single filing can override it with a
per-record `asOf`. The date surfaces in the Follow the Money section header
("Data last reviewed …") and in the footer of every composition block, next to a
"Verify at source" link to the underlying FEC / OpenSecrets / Utah-disclosure
page.

## Where it shows up

1. **Follow the Money cards** — each card leads with the total itemized
   receipts and the composition, then the outside-spending note.
2. **Profile letterhead → the 💰 chip** (`letterheadChipMount`) — a one-line
   pill among the status pills, sized to the ⚖️ Word vs Action badge beside it.
   It prints the itemized-receipts figure, the small-dollar share, the top pile
   and the coverage words, and it is a button: clicking it reveals and jumps to
   the money section below on the same profile (`pdxsec-funding`). It is a door,
   not a summary — no chart, no donor list, no ring, no colour that grades. It
   renders on every profile, including the 744 with no filing, because a missing
   badge would read as "clean" rather than as "unknown".
3. **Profile → 💰 Follow the Money** — the entry row (both states), the
   composition block, and the coverage disclosure. This is the person file's one
   labelled door into the money lane.
4. **Follow the Money — Side by Side** (`impact-ledger.js`) — the largest
   reported source paired with a distributional summary of who the member's key
   votes affect. It shows financial access and distributional effect, not
   corruption, motive, or causation.
5. **My Profile → Your money tree** (`my-profile.js`) — the team-level blend,
   with its own coverage note stating how many of the team have a filing, since
   a blend over "everyone who happens to have a filing" is a different sentence
   from a blend over the team.

## Refreshing the data

A pure lane still rots: filings age, cycles close, and a hand-edited dollar
figure inside a 2 MB `index.html` is exactly the number nobody notices going
stale. `scripts/finance-integrity-refresh.mjs` is the maintenance path, and it
has two halves on purpose — only one of them needs a key.

**Audit — no key, no network, always available.**

```
node scripts/finance-integrity-refresh.mjs --audit
node scripts/finance-integrity-refresh.mjs --json
node scripts/finance-integrity-refresh.mjs --audit --today 2026-08   # pin "now"
```

It reads the shipped `FTM_FUNDING` straight out of `index.html` (brace-matched
and evaluated, so the audit is against what actually ships) and checks every
record against what this lane is allowed to say:

- every bucket present, numeric and non-negative — a negative bucket would
  render as a negative share, and a negative share is not a composition;
- an itemized base above zero, and not exceeding reported `receipts` (a base
  over receipts means one of the two figures was mis-transcribed);
- `outside` still a **level** from the fixed vocabulary, with no `amount`, no
  `dollars`, and no dollar figure smuggled into the note;
- an `https` source on the record *and* on the outside note, because the UI
  links both and an unverifiable figure is not publishable here;
- a four-digit `cycle`, and a review date that parses as `Month YYYY`.

Then it reports staleness: review stamps older than 18 months, and records a
whole **closed** cycle behind the public record. Closed, not current — federal
cycles end in even Novembers, so measuring against the cycle in progress would
flag every record all year and a report that is always red is a report nobody
reads. `--today YYYY-MM` pins "now" so the output is reproducible.

The roster is **derived** from the shipped `FTM_FUNDING`, never kept as a second
list in the script. A second list is how a filing gets added to the site and
silently stops being refreshed. The only hand-kept table is `FEC_IDS`, which
holds *identifiers* rather than figures; a shipped record with no FEC id and no
manual source is printed under **BLOCKED** with what to add, rather than skipped
quietly. (`bilzerian` and `gallrein` are in that state today.)

**Fetch — needs `FEC_API_KEY`.**

```
FEC_API_KEY=… node scripts/finance-integrity-refresh.mjs --fetch
```

Pulls current FEC totals for the federal records and **diffs** them against what
ships, printing the `FTM_FUNDING`-shaped draft with per-bucket deltas. Without a
key it refuses and exits non-zero rather than falling back to `DEMO_KEY`, whose
rate limit turns a refresh into a handful of silent 429s that read exactly like
a clean run. Get a free key at <https://api.open.fec.gov/developers/>.

**What it will not do.** It never writes to `index.html`. A fetched figure is a
lead on a document, not a replacement for reading it — a human verifies against
the filing and hand-updates the map, so nothing unverified ships. It touches no
issue key, stated position, formal action, tier or publication floor: there is
no finance → Direction Match path here either. And it cannot make the lane
complete — refreshing the 13 filings we hold does not change the 13-of-757
ratio, which the script prints, labelled incomplete, every run.

**State and local.** `disclosures.utah.gov` publishes no open JSON API, so there
is no live state refresh to wire. The script prints the committee-search URL for
each state record and stops there; a curator reads the filing and fills the
buckets by hand. That is a documented limitation, not a pending feature.

## Writing standard

Follows [`CONTENT_STYLE.md`](./CONTENT_STYLE.md): neutral and record-based. The
lane describes the funding structure, never a party. Contributions are legal and
do not imply corruption — public disclosure exists to reveal *who has financial
access*, and reporting that composition is the whole of what this lane claims.

## Tests

`scripts/test-finance-lane.mjs` — the fence around all of the above: no score in
any shape, the arithmetic deleted rather than dormant, no verdict palette,
coverage disclosed in words, both render states, no motive language, and the wall
holding both statically and at runtime.
