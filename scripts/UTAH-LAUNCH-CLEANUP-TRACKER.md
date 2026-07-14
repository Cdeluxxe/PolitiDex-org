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
