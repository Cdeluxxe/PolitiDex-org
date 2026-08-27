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
