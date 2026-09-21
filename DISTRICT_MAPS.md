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
| District · federal | U.S. House | Yes | **All 50 states + DC** |
| District · state | State Senate, State House | Yes | **Utah only** |

The federal row moved. The U.S. House is resolved from real congressional
geometry in every state now, one state's lines at a time; the two state
legislative chambers are still Utah's alone. That split is the whole of what
follows: everything below is what it took to widen one district seat, and what
it would still take to widen the other two — written down so nobody has to
reverse-engineer it, and so nobody ships half of it.

## The U.S. House layer, and why it is loaded one state at a time

`find.html` holds a 51-row state table (name, FIPS, USPS abbreviation) and one
query template against the Census TIGERweb legislative service:

    TIGERweb/Legislative/MapServer/4/query?where=STATE='<fips>'&outFields=CD119

**Layer 4 is the 119th Congress, and the layer number is the vintage.** Layer 0
of the same service serves the 120th, which is a different map: a reader placed
in a 120th-vintage district would be handed the member who holds the
same-numbered seat on the map we actually have a roster for, which is a wrong
answer that looks like a right one. The roster's own keys — `Ohio · OH-15` —
are 119th, so layer 4 is the pairing and the code says so at the URL.

**Utah is the one exception, and it is a newer map rather than an older one.**
Utah keeps its UGRC layer, which carries the court-ordered 2026 boundaries that
the Census service does not serve yet. So Utah's congressional answer comes from
UGRC and every other state's comes from TIGERweb: two sources, each the most
current one for its state, never blended over the same point.

**Nothing national is ever painted.** A congressional layer is fetched only
after a geocode or a tap has produced a *state*, and only for that state. The
finder opens with no boundary drawn at all; the ghost layers behind the active
one are drawn from whatever is actually loaded, which outside Utah is one layer.
A point the loaded lines do not contain is put to the unsimplified service once,
as a point-intersect query, and if that has no answer either the seat stays
blank — there is deliberately no nearest-centroid fallback for congress, because
the nearest centroid across a whole state is a coin toss between two sitting
members.

Utah is still the reference implementation for the two state legislative seats.

## The honesty flags

`window.pdxRepsForMe()` (in `voter-hub-location.js`) returns
`districtsResolvable`. It is the app's answer to *"may this reader be told a
**state legislative** district number is theirs?"*, and it is computed as "is
this reader in Utah". It did not widen when the congressional map did, because
the geometry it gates — Utah's state house and state senate lines — did not.

Two narrower answers sit beside it, and they exist precisely so the broad one
did not have to be loosened into a half-truth:

- `congressMapped` — whether the reader's state is one we can resolve a U.S.
  House district in at all. True for any recognised state.
- `mapped`, per level — whether THIS seat's geography is one we draw for THIS
  reader's state. True on every statewide level, true on the U.S. House level
  anywhere, true on the two legislative levels in Utah only.

`mapped` is what lets one blank row read differently from another: a seat we can
map but have not placed yet says so and points at the district finder, while a
seat we do not map in that state keeps the older, flatter admission. Neither
prints a district number, which is the part that never changes.

Every surface that could print a **state legislative** district as the reader's
own goes through `districtsResolvable`:

- `voter-hub-location.js` — the seat rows themselves; district levels are
  omitted rather than filled when the flag is false.
- `ballot-workspace.js` — `fieldGate()` returns `'district'` and the workspace
  explains why the district fields are absent.
- `who-represents-me.js` — the unresolved-district row copy and the scope note.
- `scope-chrome.js` — the two-scope statement in Door 2's chrome.
- `compare-hub.js` — `_pdxDistrictsMine()`, which gates both
  `_myteamDistrictNum()` (Door 2's slate seat scopes and focus line) and
  `_myteamOwnDistricts()` (the "your seat" marks in Door 1's browse tree).

**The extension point for the state legislative seats is
`districtsResolvable` and nothing else.** A second state is added by making that
flag true for that state once the data below exists. It is not added by
special-casing a surface — a surface that decides for itself which districts are
the reader's is a bug, and the tests treat it as one.

## What has to be true before that flag can widen

The U.S. House widened because items 1 and 2 below were answerable for it
nationally from public data: TIGERweb is real geometry for every state, and the
roster already keys each sitting member to a district (`Ohio · OH-15`), with an
unclaimed or double-claimed district resolving to *nothing*. Items 3 to 5 were
satisfied by scope rather than by coverage — the congressional answer never
reads `_krInferLocation`, and a seat with no map says so.

For the two state legislative chambers, none of this is done, and adding a state
still means all of it:

1. **District geometry.** Something that turns an address or a map pin into a
   state senate district and a state house district for that state. Utah's lives
   behind the district map modal and `_pdxHouseRedistrict`, and it is real
   geometry, not a city-name lookup. (The congressional half of this item is
   done: see the TIGERweb section above.)
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

**No half-mapped state, and no half-mapped seat.** A state with geometry but no
roster, or a roster but no state-qualified inference, is worse than no state at
all: it produces a
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

**The visitor's own sides are read, never stored, and read in one place.** Band
3's stance block asks `stance-sides.js` — the same reader `/me` and the stance
studio ask — and it asks it three questions only: how many sides does this
visitor hold, what are they, and *can you vouch for that number*. The last
question exists because the reader walks **two** stores through their owners:
`pdx_my_stances_v1`, the device-wide key `my-stances.js` owns, and
`pdx_your_file_v1__u_<uid>`, the per-account desk `your-file.js` owns and
refuses to write while signed out. A document that ships one owner and not the
other gets an honest-looking `0` from half a file, and **an empty list from half
a file is indistinguishable from an empty file** — which is exactly how this
board came to tell a reader with three positions that they had none. Two rules
came out of it, and both are pinned by
`scripts/test-district-voice-sd3.mjs` and `scripts/test-my-stances.mjs`:

- **Every surface that asks the question ships both owners**, in that order,
  ahead of anything that paints on first read. The fix for the false zero was
  two `<script>` tags — not a sync, not a third store, not a migration. There is
  no `pdx_my_stances_v2`, nothing copies one store's records into the other, and
  no visitor side is ever `PUT` into the district counts endpoint: band 2 stays
  an aggregate read.
- **A zero the reader cannot vouch for prints nothing.** `PDXStanceSides.complete()`
  is the reader's own statement about its sources, so no surface has to know
  which stores back it. The stance block therefore has three states and not two
  — a count, an honest zero with the add-flow door, and silence with the plain
  `/my-stances` door — which is the same *on hand / present-zero / failed-read*
  grammar band 2 uses for the room, applied to the file instead of the district.

A side is printed on this board only if its issue is on the table that was
actually rendered, from the same function that rendered it; sides on issues this
district carries no measure for stay off the board entirely.
