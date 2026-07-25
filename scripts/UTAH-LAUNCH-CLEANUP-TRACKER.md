# Utah Launch Cleanup + Depth — Tracker (July 2026)

The final Utah pass before launch: a data-integrity cleanup (merging duplicate
person records) plus a small, strictly-sourced depth batch, with the remaining
gaps documented honestly rather than stubbed. Scripts:

- `scripts/cleanup-utah-duplicate-records-jul2026.mjs` — merge duplicates
- `scripts/deep-dive-launch-depth-jul2026.mjs` — West Jordan + Clearfield mayors

Both are idempotent and dry-run by default; both edit the source of truth
(`politician-stances.js`) and `index.html`, after which
`node scripts/split-stances.mjs` regenerates the shipped `-core`/`-ext` chunks.

---

## 1. Duplicate records merged (5 people → 1 record each)

A full-dataset scan (not just Utah) found five people carrying two stance-card
arrays each. The client resolves `SD[pid] || SD[alias(pid)]`, so two ids for one
person meant each surface saw only half the cards — and three of the duplicates
shipped **unsourced** placeholder cards beside a clean sourced record.

| Retired key | Canonical key | Disposition |
|---|---|---|
| `rosie_rivera_slco` | `rosie_rivera` | **Union** — both sourced; 6 + 3 → **9** cards |
| `mike_smith_utco` | `mike_smith_sheriff` | **Union** — both sourced; 5 + 4 → **9** cards |
| `mhogan` | `michelle_kaufusi` | **Drop** — 4 unsourced dup cards removed; canonical stays 5 |
| `dwatts` | `monica_zoltanski_sandy` | **Drop** — 3 unsourced dup cards removed; canonical stays 3 |
| `rwood` | `troy_walker_draper` | **Drop** — 3 unsourced dup cards removed; canonical stays 3 |

Policy: keep every **sourced** card (union, de-duplicated by stance text); drop
retired cards that are unsourced or duplicate. `ACCT_ALIAS` in `index.html` now
bridges each retired id to its canonical key (the `rosie_rivera_slco` bridge
already existed), so any browse/roster/evidence reference to a retired id still
resolves. Roster count dropped from 527 → 522 stance records.

### Dropped unsourced facts (real, but no source URL — re-add WITH sourcing later)

Nothing was invented and no sourced card was lost, but these legacy claims were
retired for lacking a source and should be re-added only once sourced:

- **Michelle Kaufusi** (was `mhogan`): WalletHub 2025 "best-run city"; Milken
  best-performing U.S. city 2021–2023; chaired the Utah Lake Authority / vice
  chair of the Utah Water Quality Board; "public safety among her priorities."
  (The Utah Lake Authority role in particular is worth sourcing — it ties her to
  the existing Utah Lake "islands" cluster.)
- **Monica Zoltanski** (was `dwatts`): Sandy Civic Center TRAX multimodal
  connections; transit-oriented affordable housing; I-15 interchange work with UDOT.
- **Troy Walker** (was `rwood`): tech employers in Draper business parks /
  Innovation District; rising commute times; Draper–Point of the Mountain transit.

---

## 2. Depth added (2 mayors, every card source-verified)

Two named gaps from the audit — the largest Salt Lake suburb without stance
coverage, and a second Davis city beyond Layton:

| City / County | Official | Cards | Sourcing |
|---|---|---|---|
| **West Jordan** (Salt Lake) | **Dirk Burton** (Mayor) — *enriched existing `dirk_burton_wjordan`* | +3 | Mayor's Message (May 2026), direct quotes |
| **Clearfield** (Davis) | **Mark Shepherd** (Mayor) — *new record* | 3 | Standard-Examiner (direct quote); KSL (tax-rejection facts) |

- **West Jordan / Burton** already existed in the roster with one data-center
  Evidence Locker card (the $2B NOVVA expansion) but **zero stance cards**, so his
  stance-only scan slot was empty. This batch **enriched the existing key** rather
  than creating a second record — the new fiscal-discipline / growth / revenue
  cards pair naturally with his existing "data centers keep taxes low" evidence.
  (A first pass mistakenly created a `dirk_burton_wj` duplicate; it was caught in
  verification and consolidated into `dirk_burton_wjordan`.)
- **Clearfield / Shepherd** is a new record. His **redevelopment** card carries a
  direct quote ("Redevelopment is crucial"); the **property-tax** cards state the
  city's FY2026 increase that the Utah State Tax Commission rejected (Sept. 2025)
  and the FY2027 re-attempt as **institutional/administration action**, not as
  personal quotes he did not give.

---

## 3. Final honest gaps (tracked, NOT built — no fabrication)

**Attribution limits on what was just built**
- **Shepherd has no personal quote on the tax fight.** His only verified personal
  quote is on redevelopment; the tax cards are the city's action under his
  administration. Convert to a personal position if/when he is quoted directly on
  the FY2027 increase.
- **Burton's exact FY2027 figure is not asserted in a card.** Budget documents list
  ~2.26% / ~$500,418, but the mayor's message (the verified source) does not state
  the number, so the card cites his framing and the Aug. 11 hearing, not the figure.

**Roster/browse still shows retired short pids (by design, now aliased)**
- `dwatts`, `rwood` (Power-Map browse nodes) and `rosie_rivera_slco` (a CMP_DATA
  roster entry) intentionally remain and now bridge to their canonical record via
  `ACCT_ALIAS` — the established pattern (cf. `tclancy → tyler_clancy`). Fully
  collapsing each person to a single visible node is a roster/browse refactor, out
  of scope for a stance-data cleanup.

**Davis cities still unbuilt** (Layton + Clearfield now built): Bountiful,
Farmington, Kaysville, Syracuse, Centerville, Woods Cross, North Salt Lake. The
2025 statewide truth-in-taxation rejections (SB202/SB29) hit several Davis cities
(Clinton, Kaysville, West Point, Woods Cross) and are a ready, well-sourced anchor
for the next Davis municipal pass.

**Salt Lake suburbs / council still unbuilt** (West Jordan + Sandy + West Valley +
Herriman + Draper now covered): Murray, Millcreek (Jeff Silvestrini), South Jordan,
Riverton, Cottonwood Heights, Taylorsville, plus the Salt Lake County **Council**
beyond the two existing records.

**Small counties with an anchor but thin councils:** Tooele (only Grantsville +
Tooele City mayors solid; council seats are 1–2-card stubs), Wasatch (only Heber
mayor solid). Rural single-commissioner counties (Beaver/Duchesne/Emery/Grand/
Millard) remain one-official-deep by design.

**Still tracked from earlier passes:** San Juan (Bears Ears) and Carbon (coal
transition) — no current sitting official is individually sourced; build once a
2026 fall voter guide quotes them.

**Firestore evidence layer not written by this batch.** These two scripts are
client-side (they edit `politician-stances.js` + `index.html`; no Firestore
credentials). The stance cards, roster entries, browse nodes, and aliases ship;
the richer per-official Firestore `spotlight`/promise docs for Shepherd (and the
merged pairs' evidence consolidation) should be reconciled in a follow-up
`--apply` run of the equivalent Firestore pass.

---

## 4. Recommendations for the next pass

1. **Davis municipal batch** anchored on the SB202/SB29 tax-rejection story
   (Kaysville, Woods Cross, Clinton) — sourced and current.
2. **Salt Lake County Council + remaining suburbs** (Murray, Millcreek, South
   Jordan) around the existing tax/jail/homelessness cluster.
3. **Re-source the three dropped Kaufusi/Zoltanski/Walker fact sets** so they can
   return as sourced cards.
4. **Reconcile the Firestore evidence layer** for the new/merged records.

---

# Utah Launch Polish — Batch (July 2026)

The follow-up polish pass, closing the last easy Davis/Salt Lake city gaps where a
sourced controversy exists and clearing the remaining unsourced attribution stubs
in the local tier. Script: `scripts/deep-dive-launch-polish-jul2026.mjs`
(idempotent, dry-run by default; regenerate chunks with `split-stances.mjs`).

## What this batch did

| Action | Record | Result |
|---|---|---|
| **Enrich (source)** | `dramsey` — Dawn Ramsey (South Jordan Mayor) | Replaced 3 **unsourced** cards with 3 source-verified ones (2026 State of the City: 17,000-sq-ft senior center + ~200 units 75% affordable w/ Ivory Innovations; growth quote; Daybreak/TRAX transit). Added the missing CMP_DATA roster entry (browse node already existed). |
| **Create** | `tamara_tran_kaysville` — Tamara "Tami" Tran (Kaysville Mayor, re-elected ~75% Nov 2025) | New sourced record: the FY2026 property-tax increase **denied by the Utah State Tax Commission** under SB202/SB29 (the same wave as Clearfield), the residential-tax-base squeeze, and the municipal power utility (~15% below Rocky Mountain Power, UAMPS). Added roster + browse node. |
| **Sourcefix** | `anna_graff` — 2026 HD-12 Democratic challenger | Attached the verified QSaltLake source to her two endorsement-based cards; kept the honest "no first-person platform located" caveat. |

## True final state for launch

- **Local county/city tier: 121 officials · 350 stance cards · 100% sourced · 0
  unsourced records.** This is the tier these Utah batches targeted, and it is now
  fully sourced and duplicate-free.
- **Roster:** 524 officials total; **0 duplicate-name groups** (down from 5 before
  the cleanup batch).
- **Davis cities built:** Layton, Clearfield, Kaysville. **Salt Lake suburbs built:**
  West Jordan, Sandy, West Valley, Herriman, Draper, South Jordan (plus the SLC /
  county executive / sheriff tier).

## Final honest gaps (tracked, NOT built — no fabrication)

- **Legislative-candidate sourcing backlog (largest remaining item): ~34 Utah
  *legislative* records** (mostly 2026 House/Senate challenger platforms — e.g.
  `dave_calder`, `angela_choberka`, `rosemary_lesser`, `scott_chew`, `stewart_e_barlow`)
  still carry platform cards with **no source URL**. This is a distinct, sizable
  body of work from the county/city launch tier — it needs per-candidate sourcing
  (campaign sites, Ballotpedia surveys, voter guides), not a quick polish, and was
  deliberately **not** bulk-sourced with guesses.
- **Jeneanne Lock (HD-21):** her two cards assert a specific "UPICEC outreach
  coordinator" role that could **not** be verified against a readable source. Left
  as-is and flagged; verify against her official candidate filing
  (`vote.utah.gov/wp-content/uploads/2026/01/H21-Jeneanne-Lock.pdf`) before sourcing.
- **Bountiful (Davis):** a strong municipal-power-subsidizes-taxes + rare-property-
  tax story exists, but new Mayor **Kate Bradshaw** took office Jan 2026 with no
  sourced quote yet, and Bountiful is council-manager (weaker mayoral attribution).
  Build once she is quoted. Also unbuilt in Davis: Farmington, Syracuse, Centerville,
  Woods Cross, North Salt Lake.
- **Dead Davis browse nodes:** `bperry`, `bscott`, `cpetersen` are Power-Map
  `MAYORS/davis` nodes with **no roster entry, no stance cards, and no alias** —
  they render only the honest "not yet documented" coverage state. Identify and
  build (or remove the nodes) in the next Davis pass.
- **Millcreek:** Mayor **Jeff Silvestrini retired** (Nov 2025); his city-center /
  boundary-deal record belongs to a former official. Build the current Millcreek
  mayor once the Nov 2025 special-election winner is sourced.
- **Salt Lake County Council** beyond the two existing records, and remaining
  suburbs (Murray, Riverton, Cottonwood Heights, Taylorsville), still open.
- **Firestore evidence layer** for the new/enriched records (Ramsey, Tran) is not
  written by this client-side script — reconcile in a follow-up `--apply` pass.

---

# Identity Merge + Duplicate-Topic Collapse + District 6 (July 2026)

Three corrective items, no new content. Script:
`scripts/merge-albrecht-dedupe-topics-jul2026.mjs` (idempotent, dry-run by default;
`--apply` to write, then regenerate chunks with `split-stances.mjs`). The District 6
piece is hand-edited rather than scripted — it is one roster record and four label
surfaces, not a repeatable transform.

## 1. `calbrecht` → `carl_albrecht` (duplicate identity merged)

One person under two ids, split by **surface** rather than by district:

| Layer | Held by |
|---|---|
| Roster record, browse profile, `_UTAH_HOUSE_INFO` d:70, `KR_STATE_HOUSE_INCUMBENTS[70]`, spotlight-cards-data.js, 3 **unsourced** stance cards | `carl_albrecht` |
| 6 **bill-sourced** stance cards, acct-spotlight-data.js Evidence Locker, ACCT_THEME blurb, consistency.js headline, a Power-Map META row mis-tagged `STATE SENATE` | `calbrecht` |

`carl_albrecht` is canonical because it is the **roster** id — making the id with no
cmp-data.js record canonical would mean re-pointing the roster, the browse node and
both Utah House maps at a key that names nobody. Union merge: all six sourced cards
moved into the canonical block **above** its three unsourced ones, so an
issueKey-only `findStance()` lookup resolves the sourced card first (the canonical
block's own `enviro_energy` and `rural_ag` cards are the weak ones). The retired id
is registered in `db/vr-pid-aliases.json` (+ `PDX_PID_ALIASES` / `STANCE_ALIASES`
mirrors) and index.html's `ACCT_ALIAS` keeps an old saved pick resolvable. The
Power-Map row was re-keyed and re-tagged `['pm-tier-state','STATE HOUSE','sevier',
'district2']` — it had never rendered, because `pmInjectDynamicCards` only injects
ids present in `PROFILES`.

**Remaining gap:** `carl_albrecht` still carries the 3 inherited **unsourced** cards
— "Reliable, Affordable Rural Energy" (`enviro_energy`), "Rural Jobs & Economic
Development" (`econ_growth`) and "Agriculture, Water & Rural Communities"
(`rural_ag`), all general-philosophy text. Two of the three duplicate an issueKey
already covered by a sourced card, which is why the sourced cards were grafted above
them. Source or replace them in the legislative-sourcing backlog above.

## 2. District 6 → `rob_bishop` (the content decision the prior pass declined)

Matthew Gwynn resigned effective March 2026; Rob Bishop won the **April 25, 2026** GOP
delegate special election and was seated **May 6, 2026**, filling the remainder of a
term that ends January 2027 (he is also the R nominee in November, vs. James Rich,
Forward Party). He was in the data set only as a *former* U.S. Representative — 6
stance cards, 1 Spotlight card, a portrait — with no roster record, which is why the
seat had been left at "no incumbent".

Chosen representation: **one id, current office.** Two ids for one living person is
exactly the split item 1 had just been merged out of. The cost is that `office` can
only name the seat he holds now (`"Utah State Representative"`) — assertion **10g**
rejects any `/former/` office on a pid in `_UTAH_HOUSE_INFO`, and should, since that
check is what caught `gwynn_h6` outliving its member. So his federal service is
carried where a reader sees it *and* where it can be dated:

| Surface | Value |
|---|---|
| cmp-data.js `rob_bishop` | `office` "Utah State Representative", `state` "UT District 6 (Box Elder / Weber County)", `termStart` 2026-05, **no** `termEnd`, `score`/`kept`/`broken`/`pending` null/0, `issues` lifted verbatim from his own stance topics |
| `_UTAH_HOUSE_INFO` | `{ d: 6, c: 'Weber County' }` — Weber because 10f requires it to equal `_UTAH_HOUSE_COUNTY[6]`; the district spans Box Elder too, which the roster `state` string says |
| `KR_STATE_HOUSE_INCUMBENTS` | `6:'rob_bishop'` (37 of 75 seats now wired) |
| index.html ACCT_THEME blurb | names "former Utah House Speaker and nine-term U.S. Representative (2003–2021)" and the May 2026 return |
| spotlights-data.js | label `Utah State Representative · Former U.S. Representative (2003–2021)` (was `Former U.S. Representative · Utah`) |

**Flagged, not rewritten:** two of his six cards are phrased from the campaign ("Has
worked to *return* to Utah state legislature…", "…a priority *on returning* to the
Utah House"). They are unsourced, so re-tensing them is content work, not identity
repair. Fix them when they get sourced.

## 3. Ten duplicate stance topics collapsed

A repeated `topic` string on one person makes the later card **unreachable** —
`findStance()` returns the first exact topic match. Each pair kept the card with a
source and the stronger text; nothing unique to a person was removed.

| Politician | Topic | Kept (issueKey) | Dropped (issueKey) |
|---|---|---|---|
| `michael_guest` | Taxes & Cost of Living | `tax_middle_class` | `lower_taxes` (verbatim-identical text) |
| `mike_ezell` | Taxes & Cost of Living | `tax_middle_class` | `lower_taxes` (verbatim-identical text) |
| `lee` | Tariffs & Trade Authority | `tariffs_authority` | `econ_trade` |
| `candice_pierucci` | Maternal & Infant Health | `healthcare` | `family_support` |
| `ashlee_matthews` | Pollinator Habitat | `lands_preserve` | `enviro_balance` |
| `doug_welton` | Glass Recycling | `enviro_balance` | `enviro_energy` |
| `hoang_nguyen` | Emergency Medical Services | `healthcare` | `health_rural` |
| `leah_hansen` | Limiting DEI Programs | `end_dei` | `gov_balance` |
| `mballard` | Government Efficiency | `gov_waste` | `reform_balance` |
| `sam_barlow` | Limited Government & Free Markets | `gov_waste` | `econ_growth` |

**Dropped unsourced facts / details worth re-adding WITH sourcing** (per this file's
convention — real, but the surviving card does not carry them):

- `candice_pierucci` — the dropped card cited **HB 537 and HB 42 (2025)** alongside
  HB 363 and mentioned support for **deaf, blind and English-learner students**. The
  keeper covers only the pregnancy-screening / postnatal-board measure.
- `hoang_nguyen` — the dropped card recorded that HB 391 (2025) **passed the House
  68–0**. The keeper describes the bill but not the margin.
- `mballard` — the dropped card's framing that agencies **retain a share of the
  savings** they demonstrate is sharper than the keeper's "identify, reward, and
  measure".
- `doug_welton` — the dropped card said HB 177 was **signed in March 2025**; the
  keeper describes a study-and-report directive with no signing date.
- `leah_hansen` — the dropped card sourced her HB 261 support to **Wikipedia**; the
  keeper sources the same claim to le.utah.gov, so nothing was lost.

Corpus after: **883 stance blocks · 4,426 cards · 0 blocks with a duplicate topic**,
verified by walking every card of all ten politicians back through a `findStance()`
stand-in. `scripts/test-identity-integrity.mjs`: **6,100 assertions, 0 failures**,
and its duplicate-topic note block no longer prints.

## Still open after this pass

- **District 45** (Tracy Miller) is wired to nobody — she is not in the data set.
  Coverage gap, not a wrong label. *(Closed by the pass below.)*
- **District 64** (Jackie Larson, succeeded Jeff Burton May 5, 2026) and **Grant
  Pace's Provo seat**, both seated the same week as Bishop: same coverage gap.
  Neither seat is wired to a stale predecessor (`jburton` has no roster record and
  appears in neither Utah map), so there is nothing to correct — only content to add.
  *(Closed by the pass below.)*
- **38 of 75 House districts** have no id in the data set holding them. With 10e
  bidirectional, the honest state of an uncovered seat is no key at all.
- ~9 historical one-off scripts still contain the literal `calbrecht` key. They are
  already-run passes and were deliberately left untouched.

---

# Last Open House Seats With Confirmed Members (July 2026)

Identity wiring only, hand-edited (three roster records and two map entries each — not
a repeatable transform). All three people were **already content-bearing** here: each
had a curated stance block and no cmp-data.js record, which is exactly what had kept
them out of both Utah House tables, since 10e/10g need an office and a district to
check. Same minimal pattern as `rob_bishop` / `hoang_nguyen` / `ashlee_matthews`:
`score` null, kept/broken/pending 0, `issues` lifted **verbatim** from the person's own
stance-card topics, no `termEnd`.

| Id | District (confirmed) | Roster `state` | `termStart` | Evidence |
|---|---|---|---|---|
| `tracy_miller` | **45** — Salt Lake County | UT District 45 (South Jordan, Salt Lake County) | 2025-01 | R-South Jordan, assumed office Jan 1 2025, succeeded Susan Pulsipher; district covers South Jordan / Sandy / Riverton. 7 years on the Jordan Board of Education, two terms as president — which matches the "former school board president" note already on her stance block. |
| `grant_pace` | **60** — Utah County | UT District 60 (Provo, Utah County) | 2026-05 | R-Provo, sworn in May 2026 (Wikidata start date May 5; oath administered May 6 by Speaker Schultz) after **Tyler Clancy** resigned on appointment as state homelessness coordinator. District 60 covers northern Provo. |
| `jackie_larson` | **64** — Utah County | UT District 64 (Spanish Fork / Salem, Utah County) | 2026-05 | R-Spanish Fork, assumed office May 5 2026 by convention special election for the remainder of **Jefferson Burton**'s term; Burton resigned after moving out of the district. District 64 covers Woodland Hills, Salem, Spanish Fork, Leland, Benjamin, Lake Shore, Palmyra. |

Every `c` value equals `_UTAH_HOUSE_COUNTY[d]`, which 10f requires (45 → Salt Lake, 60
and 64 → Utah County). Nothing else was touched: no stances, no scores, no blurbs.

**Coverage: 40 of 75 House seats** (was 37), still bidirectional and green —
`_UTAH_HOUSE_INFO` and `KR_STATE_HOUSE_INCUMBENTS` have the same 40 pids.

## Confirmed non-bugs

- **No stale predecessor held any of the three seats.** `jburton`, `tyler_clancy` and
  Susan Pulsipher have **no cmp-data.js roster record** and appear in neither Utah
  House table, so districts 45, 60 and 64 were genuinely uncovered rather than
  mis-held. (Susan Pulsipher is not in the data set at all; the only Pulsipher here is
  `roger_pulsipher`, a Cache County school-board member.)
- **The Provo seat is 60, not 61.** District 61 is Lisa Shepherd's and is what the
  `utah_co` KEY_RACES_BY_LOCATION block features — an easy conflation to make while
  wiring a second Provo-area member.

## Mismatches found and deliberately left (content calls, not wiring)

- **`jburton` Power-Map META row** reads `['pm-tier-state','STATE HOUSE','davis',
  'district1']`. *Both* halves are wrong: Salem is Utah County (UT-3, not Davis /
  UT-1), and he has been a former member since March 2026. Fixing the county while
  leaving the sitting-member tier would be half a repair, and retiring the row is a
  decision about how former members appear on the Power Map.
- **`tclancy` Power-Map META row** (`utah_co`/`district3`) is geographically right but
  has the same tier problem — Clancy left the House in May 2026 — and his ACCT_THEME
  blurb still describes him in the present tense as "a working Provo police detective
  and one of the chamber's youngest members". Same content call.
- **Browse directory / `PROFILES`.** None of the Utah House records added by any of
  these passes (Bishop, Nguyen, Matthews, and now Miller, Pace, Larson) is in the
  static directory-backfill list in index.html, so none of them gets a Power-Map card:
  `pmInjectDynamicCards` only injects ids present in `PROFILES`. Adding them there is a
  visibility decision about the public directory, so it was left alone for consistency
  with the earlier passes rather than changed silently here.
- **`grant_pace` and `jackie_larson` stance cards are entirely unsourced** (4 each,
  campaign-platform text), and `tracy_miller`'s 8 are mixed (3 with le.utah.gov bill
  sources: HB 290 (2026), H.B. 76 (2025), H.B. 268 (2025)). They belong to the
  legislative-sourcing backlog above.
