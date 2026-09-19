# District maps — the one place a second state lands

PolitiDex ships two products over one roster.

**The archive** is national and has no geometry. It answers *"what is this
person's record?"* and it slices by chamber and state, which is all the archive
ever claims. `archive-browse.js` and Door 1's browse tree are archive surfaces;
neither one has a district dimension, and neither may acquire one.

**The ballot** is geometric. It answers *"who holds power over you?"*, and that
question cannot be answered honestly without knowing which district the reader
is in. Two seat classes fall out of that:

| Class | Seats | Needs geometry? | Coverage today |
|---|---|---|---|
| Statewide | U.S. Senate ×2, Governor | No — a state is enough | All 50 states |
| District | U.S. House, State Senate, State House | Yes | **Utah only** |

Utah is the reference implementation. Everything below is what it would take to
make a second state true — written down so nobody has to reverse-engineer it,
and so nobody ships half of it.

## The single honesty flag

`window.pdxRepsForMe()` (in `voter-hub-location.js`) returns
`districtsResolvable`. It is the app's only answer to *"may this reader be told
a district number is theirs?"*, and today it is computed as "is this reader in
Utah".

Every surface that could print a district as the reader's own goes through it:

- `voter-hub-location.js` — the seat rows themselves; district levels are
  omitted rather than filled when the flag is false.
- `ballot-workspace.js` — `fieldGate()` returns `'district'` and the workspace
  explains why the district fields are absent.
- `who-represents-me.js` — the unresolved-district row copy and the scope note.
- `scope-chrome.js` — the two-scope statement in Door 2's chrome.
- `compare-hub.js` — `_pdxDistrictsMine()`, which gates both
  `_myteamDistrictNum()` (Door 2's slate seat scopes and focus line) and
  `_myteamOwnDistricts()` (the "your seat" marks in Door 1's browse tree).

**The extension point is `districtsResolvable` and nothing else.** A second
state is added by making that flag true for that state once the data below
exists. It is not added by special-casing a surface — a surface that decides
for itself which districts are the reader's is a bug, and the tests treat it as
one.

## What has to be true before that flag can widen

Utah's district resolution is not one table. Adding a state means all of it:

1. **District geometry.** Something that turns an address or a map pin into a
   U.S. House district, a state senate district and a state house district for
   that state. Utah's lives behind the district map modal and
   `_pdxHouseRedistrict`, and it is real geometry, not a city-name lookup.
2. **A per-district officeholder roster,** keyed the way
   `KEY_RACES_BY_LOCATION` is, with every pid resolving to a real record. A
   district whose incumbent is unknown must resolve to *nothing*, never to a
   nearby name.
3. **State-qualified area inference.** `_krInferLocation()` matches on bare
   city and county names — `clearfield`, `centerville`, `riverdale`, `sandy`,
   `davis` — with no state check, which is safe only because its output is
   never read outside Utah. Any second state makes those names ambiguous, so
   inference must become state-qualified *in the same change* that widens the
   flag.
4. **Redistricting handling** equivalent to `redrawn` / `_pdxHouseRedistrict`,
   so a reader whose lines moved is told so instead of shown the old seat.
5. **Resolver tests,** by name: `pdxRepsForMe()` returns the new state's
   district seats for an address in it, returns *blank* district seats for an
   address in a state still unmapped, and never returns a person from a
   different state under a district heading. Plus the existing suite green —
   `test-two-scope-chrome.mjs` and `test-archive-browse.mjs` both assert the
   Utah-only shape and will fail loudly on a half-mapped state, which is the
   intended behaviour.

## The rule

**No half-mapped state.** A state with geometry but no roster, or a roster but
no state-qualified inference, is worse than no state at all: it produces a
confident wrong district instead of an honest blank. Until all five items above
are done for a state, `districtsResolvable` stays false there and the district
rows stay empty — which is a true statement, and the one the product is built
to make.

---

## SD-3 is the first district with a board at its own address

`/district/ut-sd-3` — Utah Senate District 3, North Ogden and the rest of Weber
County — is the first **District Voice reader**: a district read as a *place*
rather than as a person or as a router. Three bands, in order: the seat (the
`john_johnson` roster row and a link to `/p/john_johnson`), who is in the room
(counts only), and what is on the table (the measures already in this archive
for the seat).

**It does not widen the map, and that is deliberate.** Nothing in the five items
above moved. This is one hand-written address in `netlify.toml` — three exact
`200` rules for the bare path, the trailing-slash form and the `.html` form,
and **no `/district/*` splat**, because a splat would publish a board at every
address in the state and every one of them would render three bands of zeroes
over a seat nobody had mapped. A second district is three more lines and a
second entry in one allow-list, in both `district-board.js` and
`netlify/functions/district-board.mts`. It is not a pattern yet.

**The counts are structurally zero, and the page says which kind of zero.**
Nothing was seeded: no `dd_districts` row, no residency record, no poll, no
migration. So band 2 answers in one of three grammars, never two — a real
integer from a store; `0` beside the money lane's "on hand" when the store does
not exist; or "we could not read the room" when the read *failed*, which is
never painted as a zero. There is no integer literal in the render path, which
`scripts/test-district-voice-sd3.mjs` pins two ways: it mounts the page against
a fixture holding nothing and asserts every figure is `0`, then against one
holding seven and asserts it prints seven.

**A later pass owns three things this one does not.** The **paid composer** —
tonight's posting seam is a disabled field and one sentence, because a box that
kept a reader's sentence on their own device would look like a post to their
district and would not be one. The **identity vendor** — no Stripe Identity, no
Veriff, nothing wired; verified residency is described as *how a voice is
counted, not how a page is read*, and until a vendor lands the verified count is
whatever the store holds, which is zero. And the **residency flag on the
visitor** — there is no client-side one today, so this page resolves no personal
standing at all and prints no "you appear to be in SD-3" line. That line belongs
to the one owner of "where does this reader vote", `voter-hub-location.js`,
which is deliberately not on this document.

**Member equity is not this surface.** No units, no shares, no dues, no
instrument, no percentage, no price. The suite sweeps the served document and
both new files for that vocabulary and fails the build on a single match: the
one thing a public district board cannot afford to look like is a place to buy
into.
