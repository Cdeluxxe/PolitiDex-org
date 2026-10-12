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
are on file for **13** people. PolitiDex carries profiles for **800**. A red
"Special-Interest Heavy" badge against that denominator is a judgement about a
person derived from data the site does not have — and the 787 people with no
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

And the section **leads with counts, not shares.** `PDXFinanceLane.countsHtml()`
opens the on-file state with four plain cells — reported sources, named
contributors, industry sectors, candidate self-funding — before any percentage
appears. A count is anchored to a unit and to a filing; it is not comparable
across two people the way a bare percentage is, so it cannot be lifted off the
page and read as a rank. The composition percentages still follow, each welded
to its own bucket name and dollar figure.

The one composition fact PolitiDex does **not** hold is the in-state versus
out-of-state split, and the counts footer says so in those words. The filings
report it; the records this site carries do not transcribe it. Naming that gap
is cheaper than the alternative, which is a reader assuming a lane that reports
industry but never geography has a reason for the omission.

### The filing index has to be reachable, and for a while it was not

Worth recording, because the symptom looked like a coverage problem and was a
wiring problem. `/p/trump` showed "No money file yet" on its letterhead while the
money section a few hundred pixels below it drew a $780M composition. Trump has a
filing; the chip could not see it.

`FTM_DATA` and its `_FTM_BY_ID` index were built inside the Follow-the-Money IIFE
that was inlined in `index.html`, so `_FTM_BY_ID` was a local that never reached
`window`. (The block is `ftm-data.js` now — see *One owner for the filings*
below — but the index is still a closure local there, deliberately, for the
reason the fix below gives.)
`finance-lane.js` read `W._FTM_BY_ID`, got `undefined` for every person on the
roster, and rendered the empty chip for all 800 of them — including the 13 with
filings. `coverage()` counted the same `undefined` and reported **0 filings on
file**. The section below was unaffected only because it reads a different,
separately-exposed accessor.

The fix is two exported readers — `window._pdxFinanceFiling(pid)` and
`window._pdxFinanceIds()` — and a `recordFor()` in the lane that prefers the
accessor and falls back to the global index. Both return copies, so no surface
can mutate the shipped record.

**Both fences missed it, and the reason generalises.** `test-finance-lane.mjs`
and `test-money-theme.mjs` each attach their own `win._FTM_BY_ID` before booting
the lane, so both were testing a wiring that existed only in the harness. A test
that supplies the seam it is checking cannot fail when production stops
providing it. The probe that found this lifts the real shipped accessor block out of
`ftm-data.js` and runs that.

### One owner for the filings

The block described above was **inline HTML**, and it was inline three times:
once in `index.html`, once in `money.html` and once in `person.html`. The three
copies were held together by a byte-identity fence — `test-money-shell.mjs` and
`test-person-shell.mjs` re-read line ranges out of `index.html` on every run and
character-compared them against the pastes. The fence worked. It was still a
fence around three copies of every hand-verified dollar figure, and the
`person.html` copy was deliberately **truncated** six lines early, because the
bootstrap it ended with called a grid renderer that assumed a `#ftm-grid` that
document does not have. A copy with a hand-maintained cut in it is a trap with a
test around it.

It is one file now: **`ftm-data.js`**, loaded by all three documents with a
single `<script defer src="/ftm-data.js">` placed **immediately before**
`finance-lane.js`. `defer` runs in document order, so that placement is the
guarantee that the index exists before the lane reads it. On `money.html` this is
load-bearing rather than tidy: the lane is in `<head>` and the section is in
`<body>`, so a tag where the old inline block sat would run too late.

What the move changed, and what it did not:

* **The seam wall got more precise, not weaker.** `test-finance-lane.mjs` now
  asserts two things instead of one: the sweep over every shipped `.js` must
  return exactly `finance-lane.js,ftm-data.js`, *and* only `ftm-data.js` may
  **declare** `FTM_DATA` / `FTM_FUNDING` / `FTM_AS_OF`. Seeing a filing and owning
  one are different permissions and are now checked separately.
* **The three documents carry zero filings literals**, and the same test asserts
  that too, per document, alongside the load and the ordering.
* **The renderer asks for its mount.** `renderFTM()` returns early when there is
  no `#ftm-grid`, and the count element is null-guarded. That is what retires the
  truncated copy: `person.html` gets the accessors and paints no grid, because it
  has none.
* **`FTM_AS_OF` is published on `window` now, and that is a visible fix.**
  `finance-lane.js`'s `compose()` has always read `W.FTM_AS_OF` to stamp a filing
  that carries no date of its own. It was a closure `var`, so that read found
  `undefined` in every browser and the cycle line fell through to *"filing date on
  source"* — while the grid a few inches away, reading the same closure variable
  directly, printed *"Data last reviewed July 2026"*. Same dataset, two answers.
  None of the thirteen `FTM_FUNDING` records carries its own `asOf` and `compose()`
  prefers a per-record date, so this is a fallback stamp, never an override.
* **`_FTM_BY_ID` is still NOT published as an object**, on purpose. Readers get
  `_pdxFinanceFiling` / `_pdxFinanceIds`, which hand back copies, so a display
  module cannot mutate the record it is reporting on. The lane tries those
  accessors first and only names the raw index as a harness fallback.
* **The curator pipeline moved with the data.** `finance-integrity-refresh.mjs`
  brace-matches the funding seed out of `ftm-data.js`, and the curator
  instructions that used to sit above the literal in `index.html` sit above it
  there. `test-finance-refresh.mjs` checks that comment in its new home and adds
  `ftm-data.js` to the list of files the refresh script must never write to.

## The money theme: one pair, wayfinding, not a grade

Finance now has a colour of its own — **a deep forest fill with a gold outline, a
gold 💰 and gold dollar marks** — and it means exactly one thing: *this is the
money lane*. It is a signpost. It is not a reading.

The token is declared once, as `:root` custom properties in `finance-lane.css`,
and mirrored in `finance-lane.js` as `PDXFinanceLane.THEME` for the blocks that
travel into surfaces with their own inline styles and never load the stylesheet.
`scripts/test-money-theme.mjs` asserts the two copies agree value for value,
because two copies of a token that can drift silently are worse than one that
cannot travel.

| | |
|---|---|
| `--pdx-money-fill` | `rgba(15, 61, 46, 0.55)` — deep forest |
| `--pdx-money-line` | `#c9992f` — the outline, the 💰, the dollar marks |
| `--pdx-money-ink` | `#e3c176` — dollar figures |
| `--pdx-money-text` | `#bcd3c6` — words on a money surface that are not dollars |
| `--pdx-money-rest` | `#3d4f66` — "the rest" of a composition bar |

**What the pair is not allowed to encode.** Not donor mix: a grassroots filing
and a PAC-heavy filing wear the identical pair, and there is no second variant to
escalate to. Not presence of data: **the empty file and the $8.6M file are the
same green-gold door at the same weight** — same fill, same border width, same
ink, same glyph. Not amount: nothing scales, brightens or saturates with a dollar
figure. Not rank, tier, ballot order, Direction Match or ⚖️ Word vs Action.

**Why gold, when amber is the objection.** Gold here is metallic and deep
(`#c9992f`), not the bright signal amber this codebase uses for a middling
verdict (`#f5c842`). More to the point, the gold is attached to the **constant** —
the lane itself — and never to a level. There is no state in which a money
surface is not gold, and a colour that never varies cannot grade.

**Where the pair is allowed, and the list is closed:** the letterhead 💰 chip, an
on-page money section header, Follow-the-Money and library money entries, and the
dollar fill of a composition bar. It appears on no issue chip (`issue-colors.js`
owns those and the money work never touched it), on no Yea/Nay pill, and not on
the ⚖️ Word vs Action badge sitting inches away in the same letterhead.

### The donor-mix pill and the war-chest tier are deleted

Two more survivors of the retired grade were still rendering inside
`_pdxFundingSection`, below the fold rather than in it. `_pdxFundWord()` printed
**"Grassroots" / "Mixed" / "Big-money" / "Unclassified"** as a labelled pill with
an explanation under it — the three retired levels, renamed. Beside it,
`scaleTag` printed **"Large war chest" / "Modest war chest"** off a dollar
threshold: a second grade, on a second axis, of a figure the page had already
stated plainly.

Both are gone from the section, along with the CSS that painted them
(`.pdx-fund-base` and its four state classes, `.pdx-fund-baserow`,
`.pdx-fund-scale.is-high/.is-low`). Deleting the markup and leaving the
stylesheet is how the ramp came back the last two times: a class with live paint
and no caller is a grade waiting for a caller. `test-money-theme.mjs` now
requires the `pdx-fund-base` family to resolve to **zero** rules, and checks the
`_pdxFundingSection` body specifically for `pdx-fund-scale`, `war chest`,
`pdx-fund-baserow` and `_pdxFundWord(` — scoped to that function, because one
candidate's record narrative legitimately mentions "incumbent war chests" and a
whole-file grep would have flagged a sourced sentence as a retired tier.

The compact card chip (`_pdxFundingChip`) is a different surface with its own
fence and was left alone.

### The donor-mix ramp is deleted

Four surfaces used to paint a **green → amber → red ladder keyed to donor mix** —
`is-grass` green, `is-mixed` amber, `is-big` red — behind a matching 🌱 / ⚖️ / 🏦
glyph ramp: the funding chip, the profile funding section, the Compare table's
funding rows, and the profile nav rail's funding dot. That is the retired
Constituents-First grade — its three levels, its three colours, its cut-offs —
surviving as CSS and emoji after the arithmetic above was deleted. Nobody needed
the tooltip to know which pill they were meant to disapprove of.

All states now take the one pair at one weight, and `_fundingCharacter` returns
💰 for every level. The mix is still reported, with its percentage, **in words**.
The ⚖️ in the middle of the glyph ramp was the worse offence of the two: that
glyph is Word vs Action's own badge, so a donor mix had borrowed the vocabulary
of a promise-keeping measure.

### Missing data stays words

Missing data stays words — "No money file on hand", "No in-office wealth file on
hand", "Not on file" — never a dimmer pill, a dashed frame or a greyer glyph. An
undigitised filing is a fact about the archive, and a door that weakens when the
room behind it is empty reports it as a fact about the person.

That rule was written before the CSS obeyed it. `.pdx-fund-none` — the profile
section's empty state — carried `border: 1px dashed` and an `opacity: 0.8` glyph:
a dashed frame and a dimmed 💰, which is the sentence above describing exactly
what the stylesheet was doing. It now takes the money fill and a solid gold
left rule at full weight, the same as the state with a filing in it.

**"Yet" is gone too, and that was not a wording preference.** The empty state
used to read "No campaign-finance record for Lee YET. This section fills in
automatically as filings are added." Both halves described a queue. "Yet" tells a
reader somebody looked and the archive is still arriving; "fills in
automatically" promised an ingest that does not exist — there is no live FEC
feed here and Utah publishes no API, so a curator transcribes filings by hand.
For most of this roster nobody has looked and nothing is scheduled to look. The
copy is now **"No money file on hand"**: a statement about what PolitiDex holds
today, which is the only thing it can honestly report.

### The bucket palette went from five hues to one

**This reverses an earlier doctrine decision, deliberately.** `PDXFinanceLane.COLORS`
used to hold five distinguishable hues, one per bucket, and this document defended
them as categorical: they distinguished buckets and ranked none of them. That
defence was true of the *order* of the colours. It was not true of the colours
themselves — `selfFunded` was `#ffb86c`, an amber whose meaning was a donor-mix
category, and a palette cannot disclaim the connotations of its own members. Five
hues on the most prominent money visual on the site also could not coexist with
one money pair.

So every bucket is the gold, and a composition is drawn as **one bar per bucket:
gold for that bucket's dollars, slate for the rest of the receipts.** Length
carries the share, which is the honest channel for a proportion; the label and the
dollar figure carry which bucket it is, which is what text is for. Nothing is
distinguished by hue, so nothing can be over-read as ranked by hue.

The single stacked bar went with the palette, and it deserved to. In `compose()`
the five buckets sum to `receipts` by construction, so that bar **always filled
100%** — it looked like a measurement while measuring nothing, and the only
variable a reader could see in it was which colour happened to be widest. The
same change landed on the Money Tree's mix bars (`my-profile.js`) and the ledger
recap's finance column (`impact-ledger.js`), whose near-black track also became
slate: that track is the *other dollars in the filing*, so it has to read as a
quantity the gold is a share of rather than as empty background.

This codebase's yes/no colours (`#4ade80`, `#f87171`), the retired grade's ramp
(`#6ee7a0`, `#f5c842`, `#86efac`, `#fca5a5`) and the outside-spending orange
(`#fb923c`) appear on no money surface — not in the lane, the Money Tree, or the
impact-ledger recap. The outside-spending eyebrow used to report a *level* in
orange before the sentence underneath got to report it in words; the level is
still printed, as text.

## Coverage, disclosed every time

`PDXFinanceLane.coverage()` reads both counts off the shipped index — never
hard-coded — and returns the sentence every surface prints:

> Itemized filings are on file for 13 of the 800 people PolitiDex carries. Where
> a filing is missing, that is missing data — it is not a finding about the
> person, and nothing on this lane is read as one.

The disclosure is attached to **every** composition read (`read().coverage`), so
a surface cannot render the chart and forget the caveat. This is the same
posture `publication-floor.js` takes when it refuses to publish a Direction
Match read: state the rule, state what you do not have, in words, unprompted.

**And the lane renders in both states.** `PDXFinanceLane.entryHtml(pid, p)`
returns a row whether or not a filing exists. On file it names the largest
reported source and opens the door to the full breakdown. Off file it says
plainly that no filing is on file and that this is missing data. The absent state
is a sentence about the data; it is never a sentence about the person, and it
uses none of the words "clean", "clear", "good" or "bad".

### The empty state names the archive it is missing from

An absence with no stated cause is the one a reader explains for themselves, and
"no money file" invites the wrong explanation. So `PDXFinanceLane.sourceGap()`
reads the person's office and state and returns one line naming the disclosure
system the filing would have come from. Three branches, and the third is the
important one:

| Office shape | Authority | What the line says |
|---|---|---|
| Federal — president, senator, representative | **FEC** | the filings are public there, and PolitiDex has not opened a file from them for this person |
| Utah state or local | **Utah state disclosures** | the state publishes no API to read them from, and no curator has transcribed this one |
| Everything else | **none opened** | PolitiDex has no disclosure source open for this office, so no filing has been looked for |

The third branch links nowhere, deliberately: there is no honest URL to offer,
and pointing at an archive the site has not searched would imply it had. Every
branch ends by distinguishing an **unopened archive** from a search that came
back empty — the two states a missing file collapses into if nobody separates
them. No branch invents a donor, a committee, a filing date or a dollar figure,
which `scripts/test-finance-lane.mjs` asserts per branch.

## Two money pills on the letterhead, and they are not one number twice

The person-file letterhead carries two 💰 chips, side by side, in the same pill
row as ⚖️, in the same green-and-gold pair:

```
💰 $774M itemized receipts · 2024 · FEC
💰 FD on file · 2025 · House Clerk
```

Two pills, two units, never one number — and only one of the two is money. The
first is what a **campaign** raised and reported to an election authority under
contribution limits. The second reports **which document a person filed** while
holding the office, for which year, in whose archive. It carried a dollar band
until the [first curation wave](#the-first-curation-wave-ran-utah-first-and-shipped-zero-rows)
established that no form in the slice prints one; the claim then moved from *how
much* to *which form*, which is [a document chip](#the-second-pill-is-a-document-chip-not-a-dollar-chip)
and is the subject of its own section below. Different filer, different form,
different span, different archive. The reason they are
two pills and not one is that every shorter form of them is wrong: a single
money pill has to pick one of the two facts and let a reader assume it covers
both, and a combined figure describes nothing that exists on any form.

**Sentence shapes.** Each pill has exactly three segments, and each segment
carries its own unit so neither figure can be read as the other's:

| Pill | On file | Thin | Nothing on file |
|---|---|---|---|
| Campaign receipts | `$774M itemized receipts · 2024 · FEC` | `Partial file · 3 items · FEC` | `No money file on hand` |
| Disclosures while serving | `FD on file · 2025 · House Clerk` / `COI on file · 2024 · Utah` | — | `No in-office wealth file on hand` |

`itemized receipts` and `on file` are unconditional: the unit is what stops a
reader four inches away from reading the second pill as a second figure. The year
on the receipts pill is the filing's own cycle; the year on the disclosure pill
belongs to the form it came off, and the archive beside it is read off that
form's URL host rather than typed by hand. The tenure span comes from the person file's sworn date through today or
their last day in office, read off the site's one tenure owner (`_pdxTenure` in
`voter-hub-location.js`) **and nothing else** — `pdx-finance.js` carries no copy
of that arithmetic, parses no date and never reads the clock. It briefly did, as a
fallback for documents that do not load the homepage module, and the copy was
deleted: two implementations of "how long have they served" is how the money chip
and the letterhead's own 🗓️ tenure pill come to disagree about one person in one
row. Where the owner is absent — person.html today — the chip prints its form, its
year and its archive with no tenure segment, which is what every other tenure
consumer on that document already does; `voter-hub-location.js` is **not** loaded
onto the person file to force a span, and no years are stored beside a row to
stand in for one. The segment trails the three contract tokens rather than
interrupting them. A member sworn in this year reads "under 1 yr in office"
rather than "0 yrs", because a zero on a money-coloured chip reads as a zeroed
figure. A person file with no sworn date prints no span at all rather than an
invented one, and `tenureYears` is `null` rather than `0`.

**Both absences speak one dialect.** "No money file on hand" and "No in-office
wealth file on hand" — the same grammar, for the same reason ["yet" is
gone](#missing-data-stays-words): both are statements about what PolitiDex holds
today, not about a queue and not about the person. Neither pill ever renders
`$0`, a dash, a dimmed glyph or nothing at all; a missing pill in a row of pills
reads as "clean", which is a finding nobody filed.

**Never a single figure out of a range.** Federal disclosures report bands —
`$1,000,001 – $5,000,000` — and the band *is* the disclosure. No band reaches a
pill at all now, because the disclosure pill reports a document; where one is
ever displayed — a transcribed holding in the long block — PolitiDex prints it as
filed and never narrows it: no midpoint, no "about $3M", no parse into a number.
There is no arithmetic operator applied to a disclosed figure anywhere in
`pdx-finance.js`, which `scripts/test-money-two-chips.mjs` asserts against the
source as well as the output. Jurisdictions that publish an exact figure get that
exact figure, unrounded and undressed as a range.

**No sum, and structurally so.** Nothing adds, averages, ranks or divides the two
figures — not "$774M raised against $1–5M held", not a per-year-in-office rate,
not a ratio. `pdx-finance.js` cannot do it even by accident: it never sees a
receipts figure, and the seam fence keeps the filings index visible to exactly
two modules, so the disclosure helper asks the lane rather than opening the index
a second time. Both pills say out loud, in their accessible names, that the two
figures are not added together.

**Two doors, two destinations.** The receipts pill opens the campaign-filings
block (`pdxsec-funding`); the disclosure pill opens the disclosures block
(`pdxsec-wealth`). Same profile, same section, different heading focused on
arrival — which is why `pdxsec-wealth` is registered in `profile-spine.js`'s
`TARGET_STAGE` in its own right. Two pills that landed a reader in the same place
would be two labels on one door.

**Coverage counts moved off the pills and into the section.** The pills carry a
figure, a span and an archive; how many of the roster have a file is a fact about
PolitiDex, and it belongs on the surface with room to state it. Both section
blocks — **Campaign filings** and **Disclosures while serving** — print their own
coverage sentence, including the on-file branch, which used not to: a reader
looking at a real composition is the one most likely to assume everybody else
came back clean. The disclosure block also links the form itself with its year
and its archive. A row whose URL is missing is not a thinner version of the
claim — there is no claim left to make — so the lookup refuses it and the pill
stays in its empty state rather than rendering a dead anchor.

### The dollar table ships empty, on purpose — and stays that way

`PDX_FD_DISCLOSURES` in `pdx-finance.js` is `{}`, and it is not waiting to be
filled. It is the table for a **filed dollar figure**, and the first curation
wave established that the forms in question do not print one: Utah's in-office
statement carries no values at all and a federal FD carries a category of value
per asset with no total. So the zero is the finding, not a stopgap — the table
that can fill is [the document index](#the-second-pill-is-a-document-chip-not-a-dollar-chip),
and `wealth()` does not read this one at all any more. A figure typed in here
lands nowhere: it cannot reach a pill, an accessible name or a block.

The one wealth table that does exist — `WEALTH_DATA` in `wealth-lane.js`, behind
/money — is not a source for this pill and is never read by it. It holds
net-worth *point estimates* with a before/after and a percentage change, sorted
into a board. A point estimate is not a filed figure, a percentage change is the
shape this lane retired, and a sorted board is a ranking. The disclosure pill is
fed by a filed form or by nothing.

`PDXFinance` publishes exactly two reads, and `wealth()` answers `null` rather
than a zeroed object when there is no row:

```js
PDXFinance.filing(pid)   // the lane's filing record, or null — not a second lookup
PDXFinance.wealth(pid)   // { kind, year, formUrl, tenureYears } | null
```

`wealth()` answers off the document index. Not one of its three row fields is a
figure, `year` is a string, and the read exposes no numeric field a consumer
could quietly do arithmetic on — `tenureYears` is the only number on it, and it
comes from the tenure owner rather than from a table. `PDXFinance.scored` is `false` and it
declares the same `NEVER_FEEDS` list as the lane.

### The first curation wave ran Utah-first and shipped zero rows

The first wave went looking for filed in-office figures for the Utah slice the
site already carries — Governor Cox, Senators Lee and Curtis, the four US House
members who represent Utah (Moore, Maloy, Kennedy, Owens), and the Utah
Legislature's District 3 people (John Johnson, SD 3 / North Ogden; Jason
Thompson, HD 3). It shipped **zero rows**. The reason is a fact about the
documents, not a gap in the looking, and it is written here because a zero-row
wave that leaves no trace reads, to the next person, as a wave that never ran:

| What we looked at | What it prints | Why no row |
| --- | --- | --- |
| Utah's in-office disclosure (Utah Code **20A-11-1603** / 1604) | employers, entities held, income sources over a threshold, holdings over a fair-market-value threshold, positions, real property | it reports **what**, not how much — no band, no ladder, no total. There is no figure on the form to quote. |
| House / Senate annual FD | a **category of value** per asset, asset by asset | no aggregate line, no net worth, no summary band. One figure out of a page of ticked boxes is ranges added together. |
| Forbes / OpenSecrets net worth, `WEALTH_DATA` on /money | one number per person | each is somebody's **estimate**, which is the one thing a pill reading "disclosed" must not carry. |

The documents themselves *are* reachable — the clerk's yearly index resolves a
member to a document id and a PDF URL, and the real 2024–25 Utah ids were
captured in this pass. The blocker is the **figure**, not the form: the PDFs are
image-only scans with no text layer, and even fully transcribed they would hand
back a page of categories rather than a total. A row needs a figure and a form.
Where it cannot have both, there is no row, and the pill says *"No in-office
wealth file on hand"* — which for these people is the true sentence.

**The path a later wave takes**, so nobody has to re-find it: the House clerk
publishes a yearly index at
`disclosures-clerk.house.gov/public_disc/financial-pdfs/<year>FD.zip`, which
contains `<year>FD.txt` — tab-separated, one row per filing, ending in a document
id — and the document itself is at
`…/financial-pdfs/<year>/<DocID>.pdf`. The real 2024–25 Utah ids were captured in
this pass. Those PDFs are encrypted, image-only scans with no text layer, so
transcription is hand work with the page open; and what comes out of it is a page
of ticked categories, which is why a row stores the category and the lookup below
exists to display it. Senate filings come off `efdsearch.senate.gov`, Utah's own
forms off `disclosures.utah.gov`, and the gate accepts either because both are
`.gov`.

So the wave's deliverable is the machinery the next one needs, both halves
tested rather than described:

**The filed-category lookup.** A federal FD prints a ticked box, and the box's
own language is the disclosure — so a row stores `$1,000,001 - $5,000,000`
verbatim. A pill cannot hold twenty-three characters of it, so
`PDXFinance.bandLabel()` shortens it to `$1–5M`. It is a **lookup, not a
formatter**: an object of literal keys and literal values, one pair per box on
the form, typed by hand and pinned pair by pair in the suite. Nothing in it reads
a digit — no split on the dash, no strip of the commas, no parse of the bounds,
no rounding rule — so the worst a wrong pair can do is misquote a band a test is
holding value-for-value. Spelling is part of the key: the clerk prints a spaced
hyphen, the same band is written elsewhere with an en dash, and both get their
own literal pair rather than a normaliser, because a normaliser is code that
rewrites somebody's filed string before matching it. Anything that is not a
printed category — an exact figure, a state's own phrasing, the form's own
`None (or less than $1,001)` — is not a key and prints exactly as filed. Every
shortened value keeps two ends or the word that says there is no upper one, so no
compression can produce a single figure.

The compression happens **once per read**, in `finance-lane.js`'s `wealthRead()`,
so the pill, its accessible name and the disclosures block quote one string. The
block prints that string *and*, underneath it, the box the filer actually ticked,
word for word: the short form is a display convenience, the long form is the
document.

**The curation gate.** The table is hand-written, so the thing to defend against
is not a bad parser, it is a tired person at 1am with a news article open.
`PDXFinance.curationDefects()` is those rules as code:

| Rule | Why |
| --- | --- |
| a non-empty `rangeOrExact`, as filed, never `$0` or `0` | a zero is a figure, and the one thing a blank on this lane must never become |
| a four-digit `year` | which document this came off |
| an `https` `formUrl` on a **.gov** host | filed disclosures live on .gov; it is the cheapest check that excludes Forbes, OpenSecrets, a news story and this site's own /money board by construction rather than by a blocklist somebody has to maintain. An official non-.gov host would be a decision made out loud, with a test. |
| no years of service, in any spelling | tenure has exactly one owner — `window._pdxTenure`, off the person file's sworn date. A copy stored beside a dollar figure is how the money chip and the 🗓️ pill start disagreeing about the same person in the same row. |
| three fields, no fourth | a field this lane does not print is a field somebody expected to be printed |

It **reports rather than repairs**, and a defect names the pid and the broken
rule and never echoes the value. Nothing silently drops a row: a row quietly
swallowed is a row nobody fixes. The suite asserts the shipped table has no
defect, and drives thirteen illegal rows through it one broken rule at a time.

### The second pill is a document chip, not a dollar chip

The first wave's finding closed the dollar question and left a second one open:
*we know these people filed — why does the pill say we hold nothing?* It said so
because it was waiting for a total that no form prints. The pill now reports the
thing the archive can actually support:

```
💰 FD on file · 2025 · House Clerk        federal annual financial disclosure
💰 COI on file · 2024 · Utah              Utah conflict-of-interest statement
💰 No in-office wealth file on hand      no document in hand for this person
```

Same letterhead row, same green-and-gold pair, same 💰 glyph, same three-segment
grammar. What changed is the claim: **which form, for which year, in whose
archive.** That is checkable, it is true of people who have filed, and it never
needs a number.

**Neither form can yield a total, and the pill says so out loud.** A Utah
conflict-of-interest statement reports sources and holdings — employers,
entities, income over a threshold, holdings over a fair-market-value threshold,
positions, real property — and no values. A federal FD reports a category of
value per asset, asset by asset, with no aggregate line and no net worth.
PolitiDex will not add those boxes into a figure, and the long block says that
sentence to the reader rather than only to this file. The accessible name states
that the pill is a **filed form**: not a net worth, not a band total, not a
dollar figure of any kind, and — when empty — not a disclosure of `$0` and not a
report that somebody failed to file. The pill is never hidden in either state.

**The table.** `PDX_FD_DOCUMENTS` in `pdx-finance.js`, separate from the dollar
table on purpose: overloading a `rangeOrExact` row with optional document fields
is how a figure field gets read back out of one. Three fields, no fourth:

```js
pid: { kind: "FD" | "COI", year: 2024, formUrl: "https://…" /* .gov document */ }
```

No figure, no band, no tenure, and no assets array in this pass. If holdings are
ever transcribed they are lines **as filed**, in the long block only — never
summed, never copied onto the pill.

**What shipped, and what deliberately did not.** Four rows, each a 2025 House
annual financial disclosure whose PDF was fetched from the clerk's own host
before the row was written:

| pid | kind | year | document |
| --- | --- | --- | --- |
| `bmoore` (Blake Moore, UT-1) | FD | 2025 | `disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/10074823.pdf` |
| `maloy` (Celeste Maloy, UT-2) | FD | 2025 | `…/2025/10081600.pdf` |
| `kennedy` (Mike Kennedy, UT-3) | FD | 2025 | `…/2025/10074834.pdf` |
| `owens` (Burgess Owens, UT-4) | FD | 2025 | `…/2025/9116274.pdf` |

The pids that were looked for and **not** written are as much a part of the wave:

| Not written | Why |
| --- | --- |
| Cox; John Johnson SD-3; Jason Thompson HD-3 | `disclosures.utah.gov` answers a browser challenge, not a document. No member URL was obtainable this pass. |
| Lee; Curtis | the Senate's archive needs an accepted-terms session; Curtis's only 2025 clerk row is a filing-type `E` extension rather than an annual `O`. |
| Trump | no OGE document URL in hand this pass. |

A zip index or a yearly `.txt` index is **not** a chip: it resolves to a
directory of twelve hundred other people, not to this person's form. Where only
an index page was in hand, empty stayed the true sentence.

**SD-3 Johnson is the empty-document proof for the Utah COI** — looked for, not
chipped, because there is no member URL. `scripts/test-johnson-file.mjs` boots
his file and holds that state in place: two money pills, both empty, pill 2
carrying no dollar sign and no digit, no key in either finance table, and the
Utah archive's challenge page absent from both. He is the Utah-first
full-spine fixture the way Trump is the filled federal one — a real legislative record beside an
honestly blank money side — so a future wave that writes a Utah row has to
write a real member document, and a future wave that writes nothing still has a
file proving what nothing looks like.

**The archive label comes off the URL host and is never typed.**
`disclosures-clerk.house.gov` → `House Clerk`, `efdsearch.senate.gov` →
`Senate EFD`, `disclosures.utah.gov` → `Utah`, OGE's hosts → `OGE`. A `.gov`
host nobody mapped is labelled with the host itself rather than with a guess at
which office runs it. A hand-typed archive the URL does not support is a pill
naming an authority its own link does not go to.

**The document gate.** `PDXFinance.documentDefects()` is the same discipline as
the dollar gate, for the shape this table has:

| Rule | Why |
| --- | --- |
| `kind` is exactly `FD` or `COI` | the pill prints it as the name of a form; free text there is a sentence, and a third kind is a decision made out loud with a test |
| a four-digit `year` | which document this came off, not when it was fetched |
| an `https` `formUrl` on a **.gov** host | filed disclosures live on .gov; the cheapest check that excludes Forbes, OpenSecrets, a news story and this site's own /money board by construction |
| no figure field, in any spelling (`rangeOrExact`, `amount`, `total`, `netWorth`, `value`, `assets`, `holdings`, `band`, `figure`) | this is a document index. A number in it is the dollar table growing back in the wrong file. |
| no years of service, in any spelling | tenure has exactly one owner — `window._pdxTenure` |
| three fields, no fourth | a field this lane does not print is a field somebody expected to be printed |

It reports rather than repairs. A defect names the **pid and the rule**, never a
figure, and for a URL it prints **host and path only** — some archives carry a
session id in the query string, and a defect list is read in a terminal and
pasted into a ticket. The suite asserts the shipped index has no defect and
drives twenty-one illegal rows through the gate one broken rule at a time.

**The long block.** Where a row exists: the **Disclosures while serving**
heading, `FD on file` / `COI on file` matching the pill, the year and the
archive, the document as an anchor (`target="_blank" rel="noopener noreferrer"`),
and the one sentence about what these forms report instead of a total. Nothing is
transcribed in that pass; the holdings wave that followed puts lines only in
the range-band graph described below, never in the block's own copy. Where there is no row: the existing empty copy, which says a
blank is missing data on our side, not a disclosure of `$0` and not a finding
that this person failed to file. The campaign filings block is untouched, there
is no third chip, no compare control, no chart and no grade.

## The person file's money section is two blocks, and nothing else

The two pills are doors. What stood behind them until now was three surfaces, not
two: the campaign-filings block, the disclosures block, and a deferred **Full
financial record** drawer holding a card that was authored here rather than
filed anywhere.

That card is deleted. What was in it, and why each piece could not stay:

| What it printed | Why it is gone |
| --- | --- |
| A "FINANCIAL TRANSPARENCY REPORT" with a 0–100 funding-integrity number | The retired Constituents-First grade with a different label. `scripts/test-finance-lane.mjs` sweeps every shipped module for a per-person 0–100 funding number under any name; this was that number, mounted on the person file. |
| A `HIGH` / `MODERATE` / `LOW` badge over it, in green, amber and red | The retired grade's colour ramp and its typography. A one-word verdict beside a dollar figure is a rating of the person, and the ramp told a reader how bad it was before the sentence under it got to say what it was. |
| Three net-worth tiles — before, after, and a **% change** | Point estimates with a percentage change: not filed figures, and the exact shape this lane retired. |
| A "Wealth Over Time" line chart | Drawn from a hardcoded table of five sitting members, written in `profiles-full.js`. Five hand-typed series is not a disclosure lane. |
| A donor list | Not the lines of the filing in the block above it. A donor name that is not in the filing record is an authored donor list. |
| A 💰 **Follow This Money Trail** button | A control on a card that no longer exists, writing a `followMoney` doc no surface reads back. `window.toggleFollowMoney` went with it, under this file's own rule: if the caller is gone the function should be too. |
| An ⚖️ **Compare funding** button in the filings block | The one control in the section that left the person file — it closed the profile and opened the Compare tool with this person selected. A compare launched from a filing is the ranking read this lane refuses. `window._pdxCompareWith` stays defined, because /money scrubs any `.pdx-fund-cmp` it finds rather than assuming none renders; what is gone is the markup that called it. |

What the section contains now, in this order:

1. **Campaign filings** — the existing receipts lane. Composition as filed: the
   buckets, the counts, the named top source, the cycle, the archive link, and
   the coverage sentence. No grade, no rank, no comparison to another person.
2. **Disclosures while serving** — the disclosure block. With the table empty,
   which is the state of the whole roster, it is a heading, the "No in-office
   wealth file on hand" sentence and the paragraph saying a blank is missing data
   and not a disclosure of zero. No chart, no dollar axis, no before-and-after,
   no percent.

There is no third money block and no money drawer. `profile-spine.js` emits no
lid for a drawer spec with no chunks, so deleting both `dw:money` chunks removed
the drawer; the spec went with them, because its subtitle — "Net worth over time,
campaign finance detail and donor breakdown" — was the last copy on the site
promising material that no longer exists.

### /money keeps its estimate board, and says so

The net-worth leaderboard on `/money` is unchanged, and it is an estimate board:
point estimates, a before and after, a percentage change, sorted. Its disclaimer
box now opens with one sentence saying what it is not —

> **Estimates, not a filing:** this board is not the person file's 💰 disclosure
> pill and no figure on it is a filed FD figure.

— because a reader who meets both surfaces has to be told which one is the
filing, in the block that is not. `pdx-finance.js` is still not loaded on that
document; the sentence is copy, not a second pill.

### The range-band graph: filed categories as bands, and an empty table

The disclosures block can now carry a **range-band graph**, drawn only in its
on-file branch: one horizontal bar per line on the form the pill names. Each
bar spans the category of value the filer ticked: its left edge is where that
category begins on the form's own ladder and its right edge is where it ends.
The bars are grouped by those categories, largest first, and each one is
labelled with the asset as named and the band as filed, e.g. `Asset name ·
$1–5M`, with the form's exact spelling in the title.

What it never does: add bars together, print a net-worth line, a per-year
figure or a percent change, or touch the receipts pill. (It first shipped with no
midpoint at all; the disclosed-midpoint rule below is the one, written-down
exception.) A bar's place comes from a literal lookup of the filed band
against `BAND_LADDER`, not from parsing any digit. The top category has no
ceiling on the form, so its bar runs open to the end of the track.

The lines live in a third table, `PDX_FD_HOLDINGS` in `pdx-finance.js`, with its
own gate (`holdingsDefects()`): a row must match the document row's year and
`.gov` form URL exactly, and every line is `{ asset, band }` with a band on the
filed ladder. No figure fields, no tenure fields, nothing else.

**The first transcription covered the four House FDs the site already links**,
and only those. Each Schedule A line was copied off the House Clerk PDF: the
asset name as printed (the parent account chain joined with ⇒, the bracketed
asset-type code kept) and the value box as ticked, in the clerk's spaced-hyphen
spelling. Liabilities, income and transactions are not assets and are not in the
table.

| Member | Lines drawn | Left out, because the box is off the ladder |
| --- | --- | --- |
| Blake Moore | 16 | two spouse lines under H. Roger Boyer Family Partnership, LTD., each `Spouse/DC Over $1,000,000` |
| Celeste Maloy | 3 | none |
| Mike Kennedy | 28 | Kennedy Capital, LLC, filed `$1 - $1,000` |
| Burgess Owens | 0, so no row | all five: a handwritten paper form with three lines in the lowest box and two `Undetermined` |

A line in a box the ladder doesn't hold is left out rather than squeezed onto a
rung, and the graph carries a fixed sentence saying so and pointing to the form,
which lists every line. Some asset names as filed contain words like "Common
Stock", "Shares" or "100% Interest". They are quoted exactly, because the asset
name is the filer's text, not PolitiDex copy. `scripts/test-wealth-bands.mjs`
pins the shipped counts and stored bands, and exercises every other state
through the test-only `_setHoldingsTable` seam.

### Disclosed midpoints, and a year-by-year timeline

**The midpoint rule.** A holdings line may carry one *disclosed point* beside its
filed band, and only these:

| Filed box | Point | Basis |
| --- | --- | --- |
| a closed box, e.g. `$1,000,001 - $5,000,000` | the arithmetic midpoint of its two ends (`3000000.5`, shown `$3M`) | **Midpoint of the filed category** |
| the open top box, `Over $50,000,000` | its floor (`50000000`, shown `$50M`) | **Floor of the open-ended category** |

The points are a literal table, `DISCLOSED_POINTS` in `pdx-finance.js`, with one
entry per rung of the ladder. The module still does no arithmetic.
`scripts/test-wealth-bands.mjs` recomputes every entry from the filed spelling's
own two ends and fails if one drifts. The gate refuses a stored `midpoint` or
`floor` unless it equals the table's entry for that line's band. That rules out
a rounded figure, a point from another box, a midpoint on the open box, a floor
on a closed box, both at once, and a point on a box that is off the ladder.
Display labels are rounded to their unit, because the point is a signal and not
a dollar count. The band stays the finding beside it.

**The disclosure sentence.** Every point prints with the sentence for its basis:
"Midpoint of the filed category" or "Floor of the open-ended category". The
sentence appears in each dot's title, and in a *How each figure was made* source
line under the graph that spells out each basis the graph uses. The only figures
in the graph are filed bands and points that some stored line carries. A row
stored without any point draws exactly as before: bands, no year drawing, and
the original "No middle value is worked out" copy.

**The timeline.** A row is now `{ forms: [ … ] }`, one House Clerk form per
filing year, oldest first. The newest form must equal the document row the pill
names (same year, same URL). Every older form must be an https `.gov` document
filed under its own year's path, with no year or URL appearing twice. The
drawing rule below sets out how the years are drawn. More dots, or dots higher
up, is the accumulation signal. **No point is added to another**, so there is no
per-year figure, no net-worth line and no percent-change tile.

**The drawing rule (year axis).** Where a member's lines carry disclosed
points, the graph's horizontal axis is **filing years**: one column per form the
table holds, oldest on the left and newest (the pill's form) on the right, with
the year under each column. Each column is a link to that year's `.gov` PDF.
Inside a column, every filed line is one dot at its stored midpoint or floor on
a **vertical log scale**. Dots that share a filed box sit side by side.

The vertical axis is labelled only at the points this member's lines actually
carry, each with its basis ("$3M midpoint", "$50M floor"). Each dot's title gives
the asset as filed, its band and its method, and each column states how many
lines it draws. The *How each figure was made* source line stays under the
graph. The only arithmetic is placing a stored point on the scale and spacing
dots that share a box. No point is added to another, so there is still no
per-year figure, no net-worth number and no percent-change tile. A row whose
lines carry no stored point draws the newest form's bands on the category
ladder, exactly as before. `scripts/test-wealth-bands.mjs` checks:
- one column per form year, left to right and oldest first;
- that each column's dots are that year's stored bands;
- each dot's height against its point;
- that the axis ticks are exactly the points the member's lines carry;
- that a single-year profile draws one column.

**One continuous graph.** Each person gets one chart: one plot area with one
background, one set of rules at the stored points, one baseline, and the
labelled vertical axis on its left. The horizontal axis is calendar years, with
one slot per year from the first drawn year to the last, oldest on the left. A
year with no form on file leaves its slot empty instead of closing the gap.

Each year's dots sit in that year's band. The band is a link to that year's
PDF, and the year's summary line sits under it. Nothing about the dots changes:
- the log scale and midpoint/floor placement;
- the 24-dot cap per dense box, with its printed count.

A year with no line on the ladder has no band and no summary.

**Two graphs.** Every person with stored points gets two charts in the
disclosures block, one above the other:

1. **The per-line graph** (unchanged). One dot per stored line at its midpoint
   or floor, in that year's band on the year axis, with dense boxes capped at
   24 dots and a printed line count.
2. **The range graph**, directly under it and above the source line. It uses the
   same year axis (one slot per calendar year, empty slots kept) and the same
   log scale, with the vertical axis labelled only at stored points. Each year
   draws **one vertical bar**:
   - from the **lowest** disclosed point among that year's lines to the
     **highest**;
   - with no dots;
   - linked to that year's PDF, with the same summary line under it.

The range bar is a span read off two stored points. It is not a sum: no line is
added to another, and a bar's length is not a net worth. A year where every line
sits in one box draws a short single-point bar. A year with no line on the
ladder draws neither a band nor a bar.

`scripts/test-wealth-bands.mjs` checks that every person with the first graph
has the second, and checks each bar's two ends against the year's stored points.
It also checks that the per-line graph, source line, overlap section, awards and
pills are byte-identical with the range graph on and off.

**The summary line under each year.** Every year's band ends with one line,
for example:

> 2025 · 4,826 lines · highest band $50M floor

Its three parts:
- **The year** already under the column.
- **The line count:** the stored lines the column draws, the same count a dense
  box prints when it caps its dots.
- **The highest band:** the highest category with at least one line that year,
  named by the disclosed point the vertical axis already uses ("$50M floor",
  "$3M midpoint").

It adds no new figure. The count is of lines, not dollars, and the band label is
a stored point. Nothing is added, compared across years, or turned into a change.

A year with no line on the ladder draws no column and no summary. Before this
pass, Scalise's 2025 form drew an empty column labelled "none on ladder"; it now
draws nothing.

**The first timeline batch** covers the three Utah members already transcribed,
plus a House leadership batch resolved through the clerk's yearly index. It uses
the forms from the clerk's 2021 electronic layout onward. Older forms are left
out because their layout does not keep wrapped asset names in reading order, and
a name that cannot be quoted exactly is not quoted. Each year uses the latest
filed version, i.e. an amendment where one exists, unless the amendment adds no
line on the ladder.

| Member (pid) | Forms | Lines drawn per year |
| --- | --- | --- |
| Blake Moore (`bmoore`) | 2021–2025 (2023 is the amendment) | 89 · 48 · 43 · 17 · 16 |
| Celeste Maloy (`maloy`) | 2023 new-filer, 2024–2025 | 3 · 3 · 3 |
| Mike Kennedy (`kennedy`) | 2024 new-filer, 2025 | 24 · 28 |
| Hakeem Jeffries (`jeffries`) | 2021–2025 | 29 · 24 · 22 · 24 · 32 |
| Steve Scalise (`scalise`) | 2021–2025 (2024's paper amendment adds only an `undetermined` pension line, so the original is used) | 1 · 1 · 1 · 1 · 0 |
| Jim Jordan (`jim_jordan`) | 2021–2025 | 5 · 3 · 3 · 3 · 18 |
| Alexandria Ocasio-Cortez (`aoc`) | 2021–2025 (2025 is the amendment) | 4 · 4 · 3 · 3 · 3 |

New document rows were added for `jeffries`, `scalise`, `jim_jordan`, `aoc` and
`mike_johnson`, each pointing at the member's 2025 House Clerk report. Mike
Johnson has a document row and no holdings row, because every annual report from
2021 to 2025 says "None disclosed" under Schedule A. Owens still has no row.
Lines filed `None`, `Undetermined`, `$1 - $1,000` or `Spouse/DC Over $1,000,000`
are left out, and each form's comment in the table counts what it left out.
Senate, OGE and executive-branch forms are not part of this batch.

### Committee overlap and related awards, under the wealth graph

**The rule.** Under the year-timeline graph, the disclosures block prints one
plain sentence for each overlap:

> Holds BA while on House Armed Services.

Beside the sentence it links the annual reports that carry the line and the
`.gov` roster record that seated the member. Below that, it lists the largest
public contract award signed with that company in each year the graph covers.
Each award line links to its USASpending.gov (or SAM.gov) award page.

**An overlap is derived, never typed.** It exists only where three things meet:
1. A stored holdings line, on the member's own filed form, names a ticker from
   `DEFENSE_CONTRACTORS` (LMT, RTX, BA, GD, NOC, HII, LHX) in parentheses, as
   the clerk prints it. The line may be the filer's, a spouse's or a dependent's.
2. That form's year is one of the years in a seat in `PDX_COMMITTEE_SEATS` on a
   covered committee: House or Senate Armed Services, or the House or Senate
   Appropriations Subcommittee on Defense.
3. The seat carries an https `.gov` roster record.

Holding the company in a year the member was off the committee is not an
overlap, and prints nothing.

**The awards are published figures, quoted.** `PDX_CONTRACT_AWARDS` holds, per
ticker and calendar year, the single largest contract signed that year with the
company, as USASpending.gov published it on the recorded date:
- contract award types A–D;
- date signed within the year;
- sorted by the amount obligated on the award.

Each row carries the award id, recipient, awarding agency, description, the
obligation to the cent, and the award page URL, which must name its own award
id. The obligation is cumulative on that award as of the pull, so it can move
later.

Nothing adds awards together, divides them, or sets them beside the member's
bands as if they were the member's money. There is no profit figure and no
combined line. The section says in words that this is federal money to a
company, not money the member holds.

**Every dollar figure on the disclosures block is now one of three things:** a
filed band, a stored midpoint or floor, or the published obligation on a linked
public award. `scripts/test-money-two-chips.mjs` and
`scripts/test-wealth-bands.mjs` sweep the rendered block for any other figure.

**If either side is missing, the section does not appear.** No overlap, or no
award inside the graph's years, means no heading, no placeholder and no
sentence.

**What is on file.** Among the members in the wealth timeline, only Blake Moore
(`bmoore`) has an overlap. Boeing (BA) and RTX (filed as Raytheon Technologies
in 2021–2022) are lines on his 2021 and 2022 annual reports. H.Res. 63 (117th
Congress, agreed to January 28, 2021) elected "Mr. Moore of Utah" to the
Committee on Armed Services. His 2023 report still lists both companies, but
H.Res. 80 (118th Congress, January 31, 2023), which elected that Congress's
Republican Armed Services members, does not name him, so 2023 is not flagged. The
award list carries one Boeing and one Raytheon contract for each year from 2021
to 2025, pulled 2026-10-12.

None of the other six members holds a listed ticker on a stored line, so none
gets a section. Mike Johnson appears on the same H.Res. 63 Armed Services list,
but his forms list no assets, so there is nothing to overlap.

PolitiDex's own copy here uses "holds", never equity, stock or share language,
and no motive word. Asset names and award descriptions are quoted as filed and
as published. Overlaps are not an input to any score, match, tier, floor,
count or sort, and neither money pill reads them.

### The President's OGE forms, and the executive overlap rule

**The OGE path.** The President's annual OGE Form 278e reports come from OGE's
own presidential index on `extapps2.oge.gov`. The site uses two of them:

| Report | Filed | Calendar year it covers | Lines on the ladder |
| --- | --- | --- | --- |
| [2025 annual 278e](https://extapps2.oge.gov/201/Presiden.nsf/PAS+Index/4EC9A8E6DD078F2985258CA9002C9377/$FILE/Trump,%20Donald%20J.%202025%20Annual%20278.pdf) | June 2025 | 2024 | 1,854 |
| [2026 annual 278e](https://extapps2.oge.gov/201/Presiden.nsf/PAS+Index/69AEAA9D7455ACD585258E27002DDEE1/$FILE/Donald-J-Trump-2026-278ANNUAL.pdf) | June 2026 | 2025 | 4,826 |

Both reports print 2025 in their "Year" field. Each column is dated by the
calendar year the report covers, which is the convention the House Clerk's
"Filing Year" uses:
- The June 2025 report holds bills due in early 2025, so it covers 2024.
- The June 2026 report's transactions and dissolved entities are dated 2025, so
  it covers 2025.

The newer report is the document row the disclosure pill names ("FD on file ·
2025 · OGE"). The pill is a document chip like every other, with no dollar
figure.

**How the lines were read.** The lines come from Part 2 Schedule 1 (the filer's
business entities) and Part 6 (other assets and income), read from the PDFs'
own text layer:
- Rows are split by their position on the page.
- Every asset name is confirmed against a second, independent extraction of the
  same page. That second pass also corrects letter-spacing artifacts, such as
  "V ALUE" becoming "VALUE".
- A row whose name cannot be confirmed, or whose description cannot be read off
  the text layer, is left out. Each form's comment counts what was left out.
- Names are quoted as the text layer gives them. Some pages of the 2026 report
  print names with no spaces ("BOEINGCO"), and they stay that way.

Schedule 1 spells categories with "to" ("$1,000,001 to $5,000,000"). That third
spelling gets its own literal pairs in `FILED_BAND_LABELS`.

Lines in a box off the ladder are left out and counted:
- `None (or less than $1,001)`;
- value not readily ascertainable;
- a "See line" cross-reference with no value;
- non-standard ranges such as `$15,001 to $25,000`.

Every stored point is checked by the same gate as everyone else's.

**Where the lines live.** The two reports carry several thousand lines, so they
ship in their own data file, `pdx-fd-oge.js`. It is not in the service worker's
precached shell, and neither `index.html` nor `person.html` loads it up front.
`finance-lane.js` fetches it only when the President's disclosures block is
drawn, shows a one-line placeholder in words until it lands, then repaints. The
file merges through `PDXFinance._mergeHoldings()`, which accepts only pids listed
for a data file, and only once.

**Dense boxes.** When one year holds more than 24 lines in a single box, that
column draws 24 dots and prints the box's line count beside them (for example
"1,476 lines"). Each column's accessible name lists how many lines it holds in
each box. A count is of lines, never of dollars. Without the cap, thousands of
dots would overlap into one bar and add over a megabyte of markup to one person
file.

**The executive overlap rule.** For the President and executive officials, the
committee seat is replaced by the office itself. `PDX_OFFICE_TERMS` holds the
office, the calendar years it was held, and a `.gov` record. For the President,
that record is the report's own "Date of Appointment 01/2025". The note reads:

> Held LMT while in office.

It appears only where a stored line on a form from a year in office names a
listed contractor's shares.

OGE prints issuer names, not tickers, so each ticker has a literal list of names
in `DEFENSE_NAMES`, matched with spaces ignored. A note, bond or debenture of the
company is debt, not shares, so it does not match. "Held BA" always means shares.

Below the sentences, the section lists the largest contract signed with each of
those companies in each year the graph covers, linked to its USASpending award
page with the obligation as published. USASpending's recipient search also
returns a parent's subsidiaries (General Dynamics' 2024 line is a National Steel
and Shipbuilding Company award), and the recipient is quoted as published.

**What is on file.** The President's 2025 report lists shares of all seven
listed companies: LMT, RTX, BA, GD, NOC, HII and LHX. That gives seven sentences
and fourteen award lines, for 2024 and 2025. His 2024 report also lists several
of them, but he took office in January 2025, so 2024 is not flagged.

As everywhere on this lane, nothing is added together. There is no net-worth
number and no percent-change tile. Every dollar figure is a filed band, a stored
midpoint or floor, or the published amount on a linked public award.

## The wall

Declared on the object as `PDXFinanceLane.NEVER_FEEDS` and asserted by
`scripts/test-finance-lane.mjs`:

- Not an input to **Direction Match** / **⚖️ Word vs Action**. Not weighted in,
  not a tiebreak, not a confidence modifier.
- Not an input to a **formal pattern tier**, to the **publication floor**, or to
  any **count of formal acts**.
- Not an input to **ballot sort order**, to **Your Match**, or to any ranking of
  one person against another.
- Not an input to the **personal alignment read** (the per-issue side-map and its
  coverage) or to a **Door 2 pick** — not the seat list, the field gate, the pick
  store or the running count. These two are named separately from `ballotSort`
  and `yourMatch` because they are where a money figure would stop being a report
  and start being advice: alignment is what the site says a reader has in common
  with a person, and a Door 2 pick is the reader's own ballot.
- Reads no party field and has no opinion about one.
- **No motive language.** A filing shows where money came from. It does not show
  why anyone voted for anything, and this lane never says it does.

The suite enforces the wall three ways.

**Statically** — `word-action.js`, `publication-floor.js`, `voting-record.js`,
`stance-helpers.js` and `consistency.js` do not name the finance lane or any
funding bucket at all, and neither do the alignment engine or any Door 2 surface
that orders a field or holds a pick (`alignment-tool.js`, `door2-spine.js`,
`ballot-workspace.js`, `your-ballot.js`, `ballot-breakdown.js`,
`ballot-actions.js`, `ballot-axes.js`, `my-stances.js`).

**By construction** — `NEVER_FEEDS` is an enumeration, and an enumeration is only
ever as complete as the list someone remembered to extend. So the fence also holds
the *data seam* to a **closed, named set of two files**: `ftm-data.js` **defines**
the filings (`FTM_DATA`, `FTM_FUNDING`, `FTM_AS_OF`, the `_FTM_BY_ID` index) and
`finance-lane.js` **reads** them. No other shipped module may name any of those
four symbols, and only `ftm-data.js` may declare one. A module that cannot see a
filing cannot weigh one, whatever it later decides it wants. The set was one file
while the data was pasted inline into three documents; the number was never the
property worth holding, and widening it is a decision the sweep forces you to
make out loud rather than an accident. Comments are stripped before that sweep, so
the retirement notes explaining what used to read the filings stay legal.

**At runtime** — a twin boot. Seeding a full filing onto the member under test
leaves the Direction Match read, the formal pattern tiers, the publication floor,
the mapped counts, the alignment side-map and its coverage, and every Door 2 pick
read (seat list and order, field gate, pick store, running count) byte-identical.

### The last dormant 0–100 finance number is deleted

`profiles-full.js` carried a `FINANCE_INTEGRITY` map: thirteen hand-set 0–100
scores, one per flagship profile, documented as *"higher = more small-donor, less
special-interest funded"*, which once seeded the **Transparency** and
**Constituents-over-special-interests** principles of the People's Mandate
scorecard.

Its display path went with the Constituents-First ramp, and the comment above it
said so — it shipped unread. Unread was not good enough. It was a per-person
finance grade in the exact shape this codebase has now deleted twice (the
Accountability composite's curated override map, then the Constituents-First
levels), sitting in the bundle one call site away from being a Mandate input
again, against the rule stated at the top of this page: **a dormant grade with a
live accessor is how a retired grade comes back.** Thirteen numbers against a
roster of 1,120 could not have been anything but a verdict drawn from data the
site does not have.

The map is deleted. `scripts/test-finance-lane.mjs` now fences it by **name** and
by **shape** — a bag of bare 0–100 integers keyed by the pids that actually have
filings is the fingerprint, whatever it gets called next time — so a rename is not
a way back in. What stands in its place is the lane: composition and counts from
the itemized filing, the letterhead's 💰 chip as the door to it, and an explicit
coverage line wherever there is no filing.

## The data

Each tracked politician has an itemized funding breakdown for one representative
cycle in `FTM_FUNDING` (in `ftm-data.js`), sourced
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
2. **Profile letterhead → the two 💰 chips** (`letterheadChipMount` and
   `wealthLetterheadChipMount`) — two one-line pills among the status pills,
   sized to the ⚖️ Word vs Action badge beside them, receipts first and both
   before the party pill with nothing between them. The first prints the
   itemized-receipts figure with its unit, the filing's cycle year and the
   archive the filing was transcribed from; the second prints the disclosed
   figure as filed, the tenure span it was filed during, and the form's year.
   Neither carries a `%`. A percentage on the letterhead is the first screen of
   a score: one number, no unit, comparable across people at a glance. The
   receipts chip carried a `38% small-dollar` segment and it does not any more;
   the fence asserts that no state of either chip contains a `%` at all. The
   reported-source count and the coverage sentence also came off the pill — they
   are in the accessible name and in both section blocks now, because the pill's
   job is a figure and a door.
     Both are buttons, and they are **two doors**: the receipts chip reveals and
   jumps to the campaign-filings block (`pdxsec-funding`), the disclosure chip to
   the disclosures block (`pdxsec-wealth`), on the same profile. Doors, not
   summaries — no chart, no donor list, no ring, no colour that grades. Both
   render on every profile, including the 787 with no filing, where the first
   reads **"No money file on hand"**, and including all 1,120 today for the
   second, which reads **"No in-office wealth file on hand"** — because a missing
   badge would read as "clean" rather than as "unknown". See [the two pills
   above](#two-money-pills-on-the-letterhead-and-they-are-not-one-number-twice).
3. **Profile → 💰 Follow the Money** — the entry row (both states), the counts
   lead, the composition block, the source-gap line when there is no filing, and
   the coverage disclosure. This is the person file's one labelled door into the
   money lane, and there is exactly one door: the letterhead 💰 chip and the
   mid-page 💰 Money jump chip both call `PDXFinanceLane.openSection()`, which
   reveals a deferred stage before it measures the scroll and focuses
   `pdxsec-funding` on arrival. The Money chip used to aim at `pdxsp-money`, the
   money *stage* rail, which lands a reader on a header above three sections and
   leaves them to find the filing. Two money controls arriving at two places is
   two doors into what the page calls one lane.
4. **Follow the Money — Side by Side** (`impact-ledger.js`) — the largest
   reported source paired with a distributional summary of who the member's key
   votes affect. It shows financial access and distributional effect, not
   corruption, motive, or causation.
5. **My Profile → Your money tree** (`my-profile.js`) — the team-level blend,
   with its own coverage note stating how many of the team have a filing, since
   a blend over "everyone who happens to have a filing" is a different sentence
   from a blend over the team.
6. **Library money entries** — the Federal Spending Tracker shelf card
   (`digital-library.js`) and the Dig Deeper cards for OpenSecrets, OpenTheBooks
   and FEC.gov. These are dollar trackers, so they wear the pair. LittleSis does
   not: it maps relationships between people rather than amounts, and borrowing
   the pair for it would dilute the one thing the pair is for.

All six wear the money pair, which is the point of having one — a reader who has
seen the 💰 chip on a letterhead can recognise the money section, the ledger
recap, the library row and the Follow-the-Money header as the same lane without
reading any of them first.

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

It reads the shipped `FTM_FUNDING` straight out of `ftm-data.js` (brace-matched
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
complete — refreshing the 13 filings we hold does not change the 13-of-1120
ratio, which the script prints, labelled incomplete, every run. The denominator
moved when roster wave `federal_roster_r1_sep2026` admitted 315 sitting House
members whose recorded votes had nowhere to land, and again when
`federal_roster_r2_sep2026` added the twelve that wave had skipped — nine House
members and three senators whose votes were already resolving through
`db/vr-member-map.json` while the roster had no row to name them. None of the 327
arrived with a filing, so the lane got wider without getting any less complete,
which is the honest shape of it.

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

`scripts/test-finance-lane.mjs` — the fence around the retired score: no score in
any shape, the arithmetic deleted rather than dormant, no verdict palette,
coverage disclosed in words, both render states, no motive language, and the wall
holding both statically and at runtime. Plus, on the letterhead chip: no `%` in
any state, counts and a named top source on file, "No money file on hand" off it,
and one assertion per `sourceGap()` branch that the line names an authority,
invents no dollar figure, says none of "clean" / "nothing to report" / "no
concerns", and does not flip the chip out of its empty state.

`scripts/test-profile-spine.mjs` — checks that the mid-page 💰 Money chip and the
letterhead chip share one destination, that it goes through
`PDXFinanceLane.openSection()` with `_pdxNavJump` as the fallback, and — because
the spine's own rule is that a jump chip must never aim at a self-gating section
anchor — that `_pdxFundingSection` emits the `pdxsec-funding` anchor *above* its
no-filing branch, so the destination exists on the 787 profiles with no file.

`scripts/test-money-two-chips.mjs` — the fence around the pair: both pills mount
in the pill row in order and adjacent, each guarded and each falling back to
nothing rather than a placeholder; the receipts pill keeps its unit and names the
archive its own source URL points at; the disclosure pill reports a document —
form, year, archive, in that order, as one string — with no dollar sign and no
digit on it but the form year, and no figure, midpoint, parse or estimate word in
its text, its accessible name or its block; a missing document renders words with
no digit and no dollar sign on every profile asked, with "not a disclosure of
zero" in the long form; the two click targets are checked by **calling** both
against a document and watching which block takes focus, with neither taking an
exit off the person file; no surface prints a combined read and the disclosure
module cannot see a receipts figure; neither pill's text or accessible name
carries a percentage, a level, a rank or a word about being wealthy; the shipped
dollar table really is empty and its emptiness is the first curation wave's
finding rather than an untouched stub;
and a twin boot that mounts 108 of each pill leaves Direction Match, the formal
pattern index, the publication floor and the mapped counts byte-identical with
both tables filled and a document filed on the member under test, with no new
global on the window.

Its section 11 renders the real `_pdxFundingSection` from the shipped
`ftm-data.js` over the real roster and reads the DOM a person actually receives:
no "transparency report", no wealth- or net-worth-over-time series, no percent
change, no duplicate follow-the-money heading, no x-out-of-100, no `<canvas>`, no
uppercase tier badge and no bare tier word outside the filing's own
outside-spending field — which is carved out by name, and checked to arrive with
the note and source that make it a report rather than a badge. Then: exactly two
labelled money blocks in order, an empty disclosure block with no dollar sign, no
digit and no percent on the 1,116 rostered profiles with no document on file —
and, on the four that have one, a block that reports the form, links the document
and still prints no figure, no percent and nothing drawn — every donor and bucket
label findable in the filing record the lane read for that pid, and no control in
either block that closes the person file or opens the compare tool.

Its section 12 fences the curation wave: the shipped table is empty and carries
no row off an estimate, the finding is on the record in this file and in the
module header, the filed-category ladder is pinned pair by pair with every
shortened value still a band and every unmapped figure passing through verbatim,
`pdx-finance.js` contains no arithmetic that could touch a figure, and five rows
shaped exactly as a curated row must be shaped reach **no pill and no block** —
which is the wall that makes "pill 2 is a document chip" a property of the code
rather than of today's data. Then: no pid without a document prints a dollar
sign, a digit or a zero on its pill in either boot, and no digit but the coverage
counts in its accessible name; Trump stays empty in both tables, because this
pass holds no document URL for him; the filings block quotes pill 1 and the
disclosures block reports pill 2's document with neither carrying the other's;
and thirteen illegal dollar rows — no URL, a Forbes profile, an OpenSecrets page,
a news story, `http`, no figure, `$0`, no year, a half-written year, stored tenure
in two spellings, and two kinds of fourth field — each fail the gate by name.

Its section 13 fences the document index: every shipped row taken apart against
the lifted table — kind, four-digit year, `https` `.gov` document, three fields,
no figure and no tenure field in any spelling, and a member's own PDF rather than
a zip or a `.txt` index; the pill contract on each of those pids, and the empty
copy with no `$` and no digit on the other 1,116; the pill never hidden on any of
the 1,120; the archive label pinned host by host, with an unmapped `.gov` host
named as itself and the lane's label asserted equal to the host's; the long block
reporting the same form, year and archive as the pill, linking the document with
`rel="noopener noreferrer"`, carrying the "not a dollar total … not a net worth"
sentence verbatim and inventing no transcribed lines; pill 1's figure absent from
the disclosure block and pill 2's words absent from the receipts pill; twenty-one
illegal document rows failing the gate by name, with a defect that names the pid
and the rule, echoes no figure and prints host and path rather than a query
string carrying a session token; and the walls — `scored: false`, `NEVER_FEEDS`,
no document index on /money, the shell bumped with the four pids and "zero dollar
rows" in its changelog entry, and this file naming the table and the rows.

`scripts/test-money-theme.mjs` — the fence around the token: the two copies agree
value for value; **Lee's $8.6M chip and an empty Utah chip open with byte-identical
markup** and carry the same 💰 in the same span, as does the disclosure chip
beside them, differing only in its lane attribute and its click target; no surface maps `is-grass` /
`is-mixed` / `is-big` to different paint and no glyph ramp survives; no banned hex
reaches a money surface, in source or in rendered output; every composition bar is
one gold fill on one slate track, as long as its share and encoding nothing in
opacity; the pair reaches no issue chip, Yea pill or Word vs Action badge; and
booting the whole theme moves no Direction Match figure, tier or formal-pattern
row.
