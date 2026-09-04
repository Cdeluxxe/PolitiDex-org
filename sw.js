/* ═══════════════════════════════════════════════════════════════════════
   PolitiDex Service Worker
   ────────────────────────────────────────────────────────────────────────
   Makes PolitiDex installable and offline-capable without changing any
   existing behaviour. The site is a single index.html plus a handful of
   static JS/CSS assets, so the strategy is deliberately simple:

     • APP SHELL  — index.html + the static JS/CSS/icons are precached on
                    install so the app boots with no network at all.
     • NAVIGATION — stale-while-revalidate: serve the cached shell INSTANTLY when
                    we have it (repeat visits skip re-downloading the large HTML
                    document) and refresh it in the background so the next load is
                    fresh; fall back to the network on first visit, then to a tiny
                    inline "you're offline" page. A shipped shell update reaches
                    users either on their next navigation (this cache was already
                    refreshed in the background) or via the registration's
                    reload-when-idle path in index.html — which, by design, never
                    fires on a first install and never interrupts an open modal or
                    a half-typed form.
     • STATIC     — stale-while-revalidate: serve instantly from cache and
                    refresh in the background, so repeat loads are fast and
                    self-healing.
     • API        — every /api/* (Netlify Functions) and /.netlify/* request
                    is NEVER intercepted or cached. Dynamic data stays live;
                    when offline these simply fail and the app's existing
                    offline handling (dirty-sync, cached catalog) takes over.

   Saved personal data (My Team, saved receipts/evidence) already lives in
   localStorage via PDXStore, so it is available offline the moment the shell
   loads — this worker just guarantees the shell itself loads offline.

   Bump CACHE_VERSION to ship a new shell; old caches are pruned on activate.
   ═══════════════════════════════════════════════════════════════════════ */

'use strict';

// v57 — the mobile hero BRAND LOCKUP fix (the PX/LIVE badge no longer being
// display:none on any phone, plus the runtime audit that tops the hero's padding
// up from the measured bottom of .pdx-eye-row). Same reason as every bump in this
// comment's history, restated because it keeps being the reason the fix is
// reported as not shipped. This bump is part of the fix, not
// bookkeeping: navigations are stale-while-revalidate (handleNavigate below), so a
// phone with a warm shell cache is served the PREVIOUS index.html on a hard
// refresh and only gets the new one on the load after that. There is no
// shift-reload on a handset, so "hard refresh and the hero is still under the
// bar" is exactly what a shipped-but-not-yet-swapped shell looks like. Renaming
// the cache makes the shell cache empty on activate, so the first navigation
// after this worker takes control goes to the network and the fix is visible on
// the refresh that was supposed to show it.
// v59 — ONE BROWSE PATH. 🧭 Stances & Connections is unmounted (it was a second
// full issue browser over the same rows 🌳 All Issues by Topic lists), the tree
// gained an Order control, and the tree now answers to #pdxsec-stances. Bumped for
// the reason stated above: a phone holding the v58 shell is served the previous
// profiles-full.js and stance-tree.js on a hard refresh, which looks exactly like
// the second section never having been removed.
// v60 — WORD VS ACTION FOLDS ITS APPARATUS. The score argument stays open (the
// figure, the tally, what it measures, the term slice, the shape graph and the
// sentence that reads it); the score's own tabbed issue index and the whole of the
// machinery behind the number — basis table, sample rows, coverage ask, feed map,
// method note — sit behind two closed controls, so 🌳 All Issues by Topic is the
// next thing after the shape. Bumped because word-action.js, gaps.js and
// word-action.css all changed together: a phone holding v59 that picks up only one
// of the three gets a method block styled as a <details> that is no longer one.
// v61 — THE LETTERHEAD TALLY GETS A PUBLIC LINE AND A LANDING. The four formal
// counts beside Direction Match now route their tap through the page's own
// chrome-aware jump, so a bucket opened from the letterhead lands below the sticky
// section rail rather than under it; a counts-only public line sits under them,
// tagged Not in Direction Match. Bumped because consistency.js, word-action.js and
// word-action.css all changed together: a phone holding v60 that picks up only
// word-action.js calls a publicShape() its consistency.js does not export, and one
// that picks up only the CSS reserves space under a line that never renders.
// v62 — PROFILE IA MERGE. The topic tree became the gateway: it holds a stage of
// its own between the record summary and Word vs Action, and the flat "every issue
// on the formal record" list stopped being a wall above it and became a collapsed
// control under it. Bumped because profiles-full.js, profile-spine.js,
// profile-spine.css, word-action.js and consistency.js all changed together: a
// phone holding v61 that picks up only profiles-full.js emits an <!--PDXSP:explore-->
// sentinel its profile-spine.js has no stage for, and one that picks up only the
// markup renders the new disclosure with no .pdxfpi-flat rules to style it.
// v63 — THE TOPIC TREE ROOTS AT THE 13 CORE NATIONAL ISSUES. The tree now paints
// fully collapsed: the first screen is the core-issue map — one row per core the
// person has a tracked issue under, plus Other — and no issue row appears until a
// reader opens the core it is filed under. The auto-open branch is gone. Only
// stance-tree.js changed, so this bump is about the served file rather than a
// cross-file contract: a phone holding v62 keeps serving the cached tree and would
// go on expanding a branch nobody asked it to.
// v64 — THE EXECUTIVE LANE GETS A FORMAL SUMMARY OF ITS OWN. The slot above the
// topic tree is filled on the one profile that casts no votes: an inventory line
// (orders · signed laws · vetoes, only the classes on file), at most two standout
// issue chips, and one control into the tree. Four files moved together —
// exec-record.js now publishes the per-issue rows its own counting pass already
// made, exec-record-ui.js reads the class nouns from there instead of keeping a
// copy, consistency.js renders the block, and profiles-full.js mounts it ahead of
// the member strip and feeds the rail pill. A shell holding v63 would pair a new
// consistency.js with an exec-record.js that publishes no rows, so the summary
// would silently decline to mount.
// v69 — HONESTY PACK. Two surfaces stopped claiming more than the data carries.
// my-stances.js and alignment-tool.js no longer promise a record-backed reading
// for "every politician … wherever they appear" — 181 of 756 profiles publish a
// Direction Match and the rest fail closed, so the promise now names the floor.
// consistency.js grew one shared definition of "thin" (_stThinNote) that the
// composition line and the dossier door's accessible name both read, and one
// scope-comparison helper (_stExecScopeSplit) that names the current-term read on
// an exec row whose two scopes disagree. Presentation only — no score moved. The
// three files ship together: a shell holding v68 would pair the new consistency.js
// with the old copy, which is the exact inconsistency this pass exists to remove.
// v70 — THE RACE SHEET. A voter can now open one office on their ballot and see
// every candidate the roster knows for that seat side by side, ordered BY DEFAULT
// on how each one's formal record fits the positions the voter set — Direction
// Match stays on the sheet as an integrity read and never as the sort key. Two new
// files (race-sheet.js / race-sheet.css) plus four wired hosts: alignment-tool.js
// exports its vote-pack warmer and repaints an open sheet from _alignRefreshAll,
// and who-represents-me.js, voter-hub-location.js and ballot-breakdown.js each
// render the one "Compare field for this seat" entry. Nothing was scored twice:
// the sheet calls the shipped _calcAlignmentScore / _calcAlignmentBreakdown with a
// mode flag and adds no arithmetic. The bump matters because a shell holding v69
// would serve the new hosts (their entry helper returns '' with no sheet loaded,
// so the button silently never appears) or the new alignment-tool.js against no
// race-sheet.js at all — a feature that half-exists reads as a broken one.
// v71 — THE STAR IS A REAL CONTROL. My Stances' priority moved out of a <select>
// nobody found and into a visible one-tap High / Normal / Low group, and a star now
// actually propagates: setPriority calls the newly-exported window._alignRefreshAll,
// which repaints every alignment surface and, at its tail, an already-open race
// sheet. The bump matters because the halves ship in different files — a shell
// holding v70 would pair the new my-stances.js with an alignment-tool.js that never
// exported _alignRefreshAll (stars would set a weight nothing re-read, which is the
// exact bug this pass fixes) or the new race-sheet.js rank line with an old
// my-stances.js that cannot produce a star to justify it. my-stances.js and
// my-stances.css are not shell assets, so they arrive fresh on their own; the two
// that ARE precached, alignment-tool.js and race-sheet.js, both changed.
// v72 — THE SEAT SPINE. Every surface that lists a voter's seats now paints the
// same three-part strip under each one — team state, "Compare field for this seat",
// and (only for a visitor with no positions) one line saying how to rank the race —
// from a single new helper, window.pdxSeatStrip in race-sheet.js. The Voter Hub's
// seat block also stopped hiding itself when no location is set: it holds its place
// and asks for one, naming no officeholder, because with no location there is no
// honest answer to "who is my House member". The bump matters because the halves
// are split across the precache boundary: race-sheet.js and race-sheet.css (which
// own the helper and its styles) ARE shell assets, while who-represents-me.js,
// voter-hub-location.js and ballot-breakdown.js are not — a shell holding v71 would
// serve fresh hosts calling a pdxSeatStrip that does not exist yet (they fall back
// to the bare compare button, so the team chip and the stance line would silently
// never appear) or the new race-sheet.js styles against hosts that never render the
// strip. index.html and app.css also changed — the Door-2 spine line and the
// research-list handoff — and both are precached.
// v73 — SHARE THIS RACE / SHARE MY TEAM. A compared seat and a filled slate can
// now leave the device as a link that opens the same thing on arrival. The new
// ?race= address is parsed in share-links.js (PARAMS, hashFor, cleanedSearch) and
// opened in race-sheet.js (openFromHash, pinned candidate ids, the "opened from a
// shared link" note); the existing ?team= address kept its wire format and lost
// its location.pathname anchor. The bump matters because the halves are split
// across the precache boundary AGAIN, and this time in the direction that fails
// loudest: share-links.js and race-sheet.js ARE shell assets, ballot-breakdown.js
// and who-represents-me.js are not. A shell holding v72 would serve a fresh
// ballot-breakdown.js calling PDXShareLinks.team() against a share-links.js that
// has no team() — it falls back, so links still build, but the ?race= param would
// be neither stripped nor converted, and a shared race link would land on the
// front page with a stale query hanging off it. index.html and app.css also
// changed (import-banner seat rows, the shared-race landing mark) and both are
// precached.
// v74 — BALLOT SEAT PACK. Two shell assets moved for it. cmp-data.js gained the
// roster record for SD-24's officeholder, who held the seat in the ballot
// resolver with no record behind the id, so that field painted "no candidates on
// file" — a claim about the world, and a false one. race-sheet.js narrowed its
// officeholder-only line to fields whose one candidate actually IS the
// incumbent, so a lone challenger is no longer described as the sitting member.
// The bump matters because these two are the SAME fact seen from two sides: a
// shell holding v73 would serve the old cmp-data.js, SD-24 would resolve to a pid
// the roster still cannot find, and the field would read empty — or, with a fresh
// cmp-data.js against a stale race-sheet.js, the one person now on file would be
// announced as the officeholder without the check that says so. Both are
// precached, so neither half arrives alone. The mapping half of this pass is
// database-side (S. 2's border_security relation becomes primary) and ships
// through the migration, not the shell.
// v77 — THE COVERAGE INVENTORY AND THE CITABLE GAPS SECTION. A new shell asset,
// inventory.js, prints one line of counts beside the headline findings (formal acts
// and issues held, stated positions held and tested, gaps still open, when the file
// last grew) and gaps.js grew a named, linkable "What the record can't test yet"
// section at /p/<pid>#gaps. Bumped because eight files move together and every
// partial pickup is a visible half-feature: a phone holding v76 that takes only
// consistency.js loses the depth chip from the record strip and gets no inventory
// line in its place (the module it calls is not on the device); one that takes only
// profiles-full.js emits a gaps section whose gaps.js has no sectionHtml to render;
// one that takes only person-file.js maps a #gaps hash to an anchor no profile
// emits. Six of the eight are precached below (inventory.js, gaps.js,
// consistency.js, word-action.js, profile-card.js, profile-spine.js); the other two
// — person-file.js and profiles-full.js — are stale-while-revalidate RUNTIME_CACHE
// entries. Both cache names carry CACHE_VERSION, so this rename empties the shell
// AND the runtime cache on activate and neither half of the feature can arrive
// alone on the load after it.
// v78 — THE RECORD CARD, THE FOLLOW CATEGORIES AND THE BALLOT BOUNDARY. Phase 5
// added record-card.js and record-card.css (the shareable person-issue card) and
// moved four files that already shipped: share-links.js gained the personRecord()
// address every share path now builds, self-defection.js mounts a per-item share
// control that calls the new module, ballot-workspace.js renders the
// official-ballot boundary sentence it borrows from your-ballot.js, and
// index.html registers the card plus the four follow-category switches. Bumped
// because a partial pickup is a broken share rather than a missing one: a phone
// holding v77 that takes only self-defection.js paints share buttons whose
// PDXRecordCard is not on the device, so the tap does nothing; one that takes
// only record-card.js has a card builder and a share-links.js with no
// personRecord(), so the card falls back to the origin and the link a reader
// sends lands on the homepage instead of the person file. record-card.js,
// record-card.css, share-links.js and ballot-workspace.js are precached below;
// self-defection.js and your-ballot.js are stale-while-revalidate runtime
// entries. Both cache names carry CACHE_VERSION, so this rename empties the
// shell AND the runtime cache on activate and no half of the share path can
// arrive alone. The follow-category half is database-side (four columns on
// pdx_notification_prefs) and ships through the migration, not the shell.
// v79 — THE FORMAL DOOR ON THE PUBLICATION FLOOR. formal-index.js is a new,
// generated shell asset (scripts/gen-formal-index.mjs): a per-person count of
// sourced formal acts on file, plus the reviewed one-line reason a file is empty.
// publication-floor.js reads it as a third source and person-file.js reads it to
// choose which of three things the file kicker says. Bumped because a partial
// pickup is a file that lies in the old way: a phone holding v78 that takes the
// new publication-floor.js and person-file.js but not formal-index.js finds no
// PDXFormalIndex on the device, reads zero formal measures for everybody, and
// goes back to printing "record still being built" over the deepest records in
// the Utah lane — which is the exact defect this pass exists to remove, arriving
// silently. It is ~7 KB and both of its readers are runtime-cache entries rather
// than shell assets, so it is left with them; the version rename empties the
// runtime cache on activate, and the three then arrive together on the load
// after. Nothing about this half is database-side.
// v80 — PERF PASS 1: THE COLD /p/<pid> RECORD REQUEST MOVED INTO THE HEAD.
// index.html changed above the fold (an inline script that starts
// GET /api/voting-record/member/<pid> before any module executes, and publishes
// the promise for voting-record.js to adopt), and '/' is precached — so a repeat
// visitor served the old shell would keep the old waterfall no matter how many
// times they reloaded. The rename empties both caches on activate, which is also
// what carries the four changed modules (voting-record.js, person-file.js,
// word-action.js) and the new pdx-perf.js as one set: a phone that took the new
// index.html but kept the old voting-record.js would issue the head prefetch and
// then a SECOND request from fetchMember, which is worse than either version.
// pdx-perf.js is deliberately NOT added to SHELL_ASSETS — it is a deferred
// reporting module, nothing a first paint depends on, and the shell budget for
// this pass is unchanged by design.
// v81 — THE FORMAL BRIEF'S ROWS BECAME DOORS, AND THE ISSUE KEYS EXPLAIN
// THEMSELVES. issue-scope.js is a new shell asset: the scope prose from the
// comments over ISSUE_MAP, plus the ⓘ control that opens it. index.html changed to
// load it, and word-action.js now renders every row of the formal-record brief as
// a dossier door with the issue's two-sided tally and that control beside it.
// Bumped because a partial pickup is the one failure worth avoiding here: a phone
// holding v80 that takes the new word-action.js but not issue-scope.js renders a
// row whose ⓘ never appears, while one that takes the new index.html but keeps the
// old word-action.js loads a glossary nothing calls. The rename empties both
// caches on activate so index.html, word-action.js, word-action.css,
// consistency.js, stance-helpers.js and issue-scope.js arrive as one set.
// issue-scope.js IS precached rather than left to the runtime cache, unlike
// pdx-perf.js: it is the only way to read what an issue key covers, and an offline
// repeat visit that renders the ⓘ and then has nothing behind it is a control that
// eats taps. Nothing about this pass is database-side, and no floor, tier, count
// or score moved.
// v82 — PRESENT AND DID NOT VOTE STOPPED BEING INVISIBLE. The formal brief's
// two-integer tally was always judged sides only — _recordDirectionIndex drops a
// Present, a Did Not Vote and any act with no mapped direction in pass 1, before a
// floor, a tier or a lead is computed — but nothing said so, and the dossier under
// the same chip enumerates everything on file, so a reader who subtracted five
// listed from four advanced got a Yea that does not exist. stance-helpers.js now
// counts those acts as `noSide` and publishes the phrase ("1 no side"),
// word-action.js prints it beside the tally and never inside it, and consistency.js
// gives the row itself a dashed, dimmed frame with a first-line "Did not vote" /
// "Present" / "No side" label and drops the polarity paragraph that used to explain
// what a Yea here would have counted as. Bumped because the one bad pickup is the
// reported bug wearing a fix: a phone holding v81 that takes the new
// word-action.js but keeps the old stance-helpers.js reads a `noSide` nothing
// publishes, so the chip prints the same unexplained tally it printed before while
// the dossier beside it has already changed. All three files are precached below,
// so the rename delivers them as one set. No floor, mapping, weight or Direction
// Match input moved, and nothing here is database-side.
//   AND THE MEASURE LIST UNDER IT NOW LISTS EVERY MAPPED ACT. Same bump, same
// deploy, because it is the same reader's same complaint one section further down:
// the dossier's list was built through _orProofPicks — the function that picks the
// one or two representative votes a profile row quotes — and its fallback dedupe
// key was seven optional identifier fields, so two distinct acts that agreed on all
// seven collapsed to one card while every count around them went on counting two.
// consistency.js now dedupes that pick by object identity alone, measures the list
// against the record's own inventory and says on the face when it comes up short,
// carries the leftover into the closed face's integers ("5 votes listed here · 4
// advancing · 1 no side") and prints each measure's title and sitting on its card.
// One version covers both halves; a phone that takes one file and not the other is
// the case this bump exists to prevent either way.
// v83 — THE NO-SIDE CARD STOPPED BEING A FAINTER YEA. v82 gave the dossier's
// absences a dashed grey frame at 0.74 opacity, on the theory that "solid means
// counted"; on a live sheet that made the one card in the list which is NOT a vote
// read as the least important vote in it, which is the opposite of what an absence
// is. consistency.js now distinguishes it by hue instead of by weight — a violet
// rail, a banner that fades across the card, a filled "Did not vote" / "Present"
// pill, and the bill number and title back at full contrast — and groups the
// no-side rows after the judged sides behind one divider line ("1 recorded
// absence") so they arrive as a category rather than as a surprise at the bottom.
// Presentation only, and one file: the sort lives in the renderer, `_dosItems`
// returns what it always returned in the order it always returned it, every row
// keeps its original index so its body and the roll-up's door still open onto the
// right card, and the header integers, the coverage check and the enumeration count
// the same acts as before. Bumped for delivery rather than for consistency — there
// is no half-pickup to prevent here, the CSS and the markup are in the same file —
// so a repeat visitor gets the corrected card on the next load instead of the one
// after. No floor, mapping, weight or Direction Match input moved, and nothing here
// is database-side.
// v84 — THE LETTERHEAD STOPPED CALLING A LOADING FILE EMPTY. On a cold
// /p/chew_h68 the identity strip printed "📋 LIMITED RECORD" and "◷ NO VOTING
// RECORD YET" two lines under the name, and the brief directly below it then
// painted 44 issues, 83 acts and 8 characterised. Neither chip was reading the
// formal record: the depth badge is computed from the pledge columns and a score,
// the monitoring pill from the pledge state, so a member with an empty ledger and
// one of the deepest roll calls in the product was introduced as a person with
// nothing on file. profiles-full.js now mounts both chips through one gate that
// asks the two questions the rest of the app already asks — PDXWordAction's
// formalKnown() (newly exported from word-action.js, the same three-valued read
// the brief uses) and PDXConsistency.recordSettled() — and prints the absence
// wording only for a file that is knowably empty and settled. app.css carries the
// host and the "Record loading" state it shows while a request is genuinely
// outstanding. compare-hub.js rides along with the Utah HD-68 headshot, keyed to
// the canonical pid rather than the retired stub it was stranded on.
// Bumped because this one IS a half-pickup risk in both directions: a phone
// holding v83 that takes the new profiles-full.js but not app.css mounts a
// display:contents host that is still an ordinary flex item, which bunches the
// status pills into one another; one that takes it but not word-action.js finds no
// formalKnown() to ask, falls to the "cannot tell" branch, and goes back to
// printing the absence wording over a deep file for as long as the fetch is open —
// the exact defect this pass removes, arriving silently. app.css and
// word-action.js are precached below; profiles-full.js and compare-hub.js are
// stale-while-revalidate runtime entries. Both cache names carry CACHE_VERSION, so
// the rename empties the shell AND the runtime cache on activate and the four
// arrive together on the load after. Presentation and load-state
// only: no floor, mapping, weight, Direction Match input or dossier arithmetic
// moved, no key or ingest was added, and nothing here is database-side.
// v85 — FEDERAL WAVE F3 SHIPPED THREE JUDGED MAPPINGS, SO THE CURATED MECHANISM
// PROSE HAS TO ARRIVE WITH THEM. The wave's substance is database-side: migration
// 20261017000000 admits three Senate/House roll calls, creates S.J.Res. 7 and
// H.J.Res. 140, and files three issue mappings (broadband w100 PRIMARY,
// lands_preserve w90 PRIMARY, lands_energy w75 secondary). The only shipped
// browser file it touches is consistency.js, which gained the three matching
// _DOS_MECH entries runbook rule 33 requires — the curated did/why pair the
// mechanism pane prints instead of the derived sentence.
// Bumped for delivery rather than to prevent a half-pickup: one file changed, so
// there is no pair that can arrive out of step. What a phone still holding v84
// would show is worth stating exactly, because it is a degradation and not a
// breakage — the three new rows appear as soon as the migration lands (they come
// from the API, not from the bundle), and their mechanism pane falls back to the
// derived voice, which on a one-sentence joint resolution reads "counted on the
// broadband chip because that is the primary subject of this measure" over a
// document whose subject a reader cannot infer from its number. Correct, useless,
// and the reason the entries were written. The rename empties the shell and the
// runtime cache on activate so the curated prose arrives on the load after.
// No floor moved (_RD_MIN_PRIMARY, _RD_MIN_JUDGED, _RD_SPLIT_*, _PDX_RD_MEMBER_FLOOR
// are byte-identical), no issue key was added, no Direction Match or Word-vs-Action
// input changed, and every issue row in the product is byte-identical to HEAD on a
// twin boot — pinned by scripts/test-vr-federal-wave-f3.mjs.
// v86 — THE MONEY DOOR MOVED TO THE LETTERHEAD, AT CHIP SCALE. The person file's
// only compact money surface is now one pill in the identity block beside the ⚖️
// badge: the itemized total, the small-dollar share, the top pile and the coverage
// counts, and a jump down to 💰 Money & Funding (#pdxsec-funding) on the same
// file. finance-lane.js owns it (letterheadChipMount / chipRead / openSection), a
// new finance-lane.css styles it, profiles-full.js mounts it, and index.html links
// the sheet. It renders in all three states — on file, partial file, and nothing
// on file — because filings exist for 13 of the 757 people the site carries, and a
// chip that appeared only where one exists would leave "no chip" to be read as
// "clean".
// Bumped because this is a half-pickup risk of exactly the v84 kind: a phone
// holding v85 that takes the new profiles-full.js but not the new index.html has
// no <link> to finance-lane.css, so .pdx-mchip-host loses `display: contents` and
// becomes an ordinary flex item wrapping an unstyled default-chrome <button> — the
// same bunching of the letterhead's status pills v84 was bumped to prevent, with a
// browser-default button in the middle of it. index.html is precached as '/';
// profiles-full.js and finance-lane.js are stale-while-revalidate runtime entries.
// Both cache names carry CACHE_VERSION, so the rename empties the shell AND the
// runtime cache on activate and the four arrive together on the load after.
// Presentation and reachability only. No finance figure is new, no arithmetic was
// added (every number on the chip comes off the lane's one composition read), and
// the wall is untouched: finance still feeds no Direction Match input, no formal
// tier, no publication floor and no ordering of one person against another —
// pinned by scripts/test-finance-lane.mjs.
// v87 — THE EVIDENCE LOCKER LEFT THE HOMEPAGE STACK. The front page carried the
// whole locker workspace — a sticky quick-jump map, a filter toolbar, a discovery
// showcase and a grid of every receipt on file — mounted and open on every visit,
// which is a workspace nobody asked for and thousands of pixels everybody paid
// for. What ships on '/' now is a closed door and one honest line ("N receipts on
// file"); the workspace markup sits inert inside <template id="el-workspace-tpl">
// and evidence-locker.js clones it in on request. Three addresses open it and all
// three land in the same place: the door's control, the #evidence-locker hash
// every existing nav entry and deep-link already sets, and the new /locker path
// (netlify.toml rewrites it to index.html, 200). The workspace gained a
// bill-number filter, and a receipt that names a measure now shows a door to that
// measure's own profile — handed to PDXBillDetail, the same panel every other bill
// door in the app uses, so no roll call and no bill record is copied in here.
// Bumped because this is a half-pickup risk of the v84/v86 kind, and a total one:
// a phone holding v86 that takes the new index.html but keeps the old
// evidence-locker.js gets a door with nothing behind it — the old file has no
// mount step, so the template is never cloned and the locker cannot be opened at
// all. The reverse split is just as bad: the new evidence-locker.js against the
// old index.html looks for a template that isn't there. index.html is precached as
// '/'; evidence-locker.js and app-2.css are stale-while-revalidate runtime
// entries. Both cache names carry CACHE_VERSION, so the rename empties the shell
// AND the runtime cache on activate and the three arrive together on the load
// after.
// Reachability and presentation only. No evidence item, count, strength grade or
// issue mapping changed — the same index is still built from the same spotlight
// data, and the data-only consumers of it (the People's Mandate on-record counts,
// the profile depth pills, My Team's evidence tallies) still warm in the
// background on '/' with no workspace mounted.
// ─────────────────────────────────────────────────────────────────────────────
// THE OFFLINE PACK URL NOW CARRIES THE MAPPING VERSION, and CACHE_VERSION is
// DELIBERATELY NOT BUMPED FOR IT. Read the next paragraph before bumping it.
//
// The pack is a per-member blob built from the measure→issue mapping table. The
// live /member/:id read is a query and reflects that table instantly; the pack was
// a blob on a six-hour TTL, so after a mapping wave landed the two disagreed for
// up to six hours — and they disagreed about `isPrimary`, among other fields.
// Federal wave F4's housing PRIMARY flip was live in Postgres while the pack still
// served isPrimary: false. (That flag no longer decides whether a row may be read —
// since August 2026 it words the package disclosure only — but a stale snapshot is
// stale about acts, mappings and counts too, and those do move a published read.) The
// server now puts a fingerprint of the mapping table in the blob key AND in the
// pack URL (302 from /pack to /pack/m<n>-<hash>), so a mapping change makes the
// URL different and the copy cached here is bypassed rather than served.
//
// WHY NOT BUMP. Renaming the caches empties the runtime cache on activate, and the
// runtime cache is where every previously-viewed member's offline pack lives.
// Bumping would delete all of them on upgrade, taking offline record coverage with
// it — to fix a staleness bug whose whole point is that offline coverage should
// survive. Nothing in the shell changed (no precached asset moved, and the browser
// installs a new worker on byte difference, not on cache name), so there is nothing
// a rename would deliver. Instead the pack handler below treats the pre-upgrade
// unversioned entries as valid offline fallbacks, which is exactly what they are:
// the version that existed when the device last built its cache.
//   So: bump CACHE_VERSION when a SHELL ASSET changes, as before. Not for this.
// v88 - the issue overlay learned to close and the Eye's bill row learned to
// wrap. Bumped because the Eye's fix is split across two files: index.html
// carries the wrapping rules and all-seeing-eye.js emits the classes they
// select. A device that took one and kept the other gets a bill row that is
// merely unstyled rather than broken, but there is no reason to ship that
// state to anyone when a version bump lands both together.
// v89 - the executive letterhead. /p/trump's top block lists its formal patterns
// itself now (the rows, the two group headings, the route out, the demoted match
// block) instead of pointing a rung down at the standouts strip, and its census is
// one line rather than two. Bumped because that block is assembled from four files
// that have to land together: consistency.js publishes the exec shape, word-action.js
// draws the brief from it, profiles-full.js stands the mid-page strip down when the
// brief named the patterns, and word-action.css sizes the one-line census. A device
// that took some and kept others gets the worst version of this change — the strip
// suppressed with no rows above it, or two copies of the same list at two heights.
// The source for it shipped without a bump, so warm devices kept serving the
// pre-brief bundle and the letterhead read as unchanged; this is the bump that
// delivers it.
// v90 - the executive letterhead's rows, which v89 shipped and production never
// showed. The brief was reading the MEMBER-lane row model and keeping the rows it
// had marked exec; that model is memoised per politician and its exec lane is built
// from the action pool, which arrives in a later script than consistency.js. One
// read inside that window pinned an exec-blind row model for the life of the page,
// so /p/trump published a shape with zero issues, printed its census-and-a-door
// fallback, and let the mid-page standouts strip mount with the very rows the
// letterhead had failed to find. The brief now selects from PDXExecRecord's own row
// list — the same list the strip selects its chips from — and the row cache heals
// when the pool lands. Bumped because the change is in consistency.js alone but the
// surface it repairs is assembled with word-action.js and profiles-full.js, and a
// device holding v89's consistency.js keeps the empty letterhead no matter how many
// times it reloads: there is no repaint event on an executive file to recover on.
// v91 - the formal-record brief's pattern rows take their issue's colour. The
// letterhead and the below-gate brief were the last rows in the product that named
// an issue and then painted it house grey, so a stack of seven read as seven
// identical steel lines and the only way to navigate it was to read it. Each row
// now carries `[data-ic]` and issue-colors.js's inline properties — the spelling a
// bill letterhead chip uses — so Border is the same teal as /issue/border_security
// and the Library's Immigration filter, and Energy the same green. Bumped because
// the change is a renderer/stylesheet pair: word-action.js emits the attribute and
// word-action.css draws the rail, and a device holding v90's stylesheet against a
// v91 script would carry the properties with nothing to consume them.
// v92 - the offline pack refuses to store a pack of no known mapping. The Function
// answers /pack/m0-unknown when it cannot read vr_measure_issues, and it neither
// reads nor writes a blob in that state; the Cache API ignores the `no-store` it
// sends, so handleVrPack now skips both the put and the prune for that version.
// Without the bump a warm device keeps the v91 handler, which would cache such a
// response and then delete this member's good versioned entry in favour of it.
// v93 - every surface that names a politician paints a real /p/<canonicalPid>
// link. person-link.js is a NEW SHELL ASSET, which is the whole reason for the
// bump: index.html now carries a parser-blocking <script src="/person-link.js">,
// and a device holding v92's precached '/' would either take the new document
// against a shell that has never heard of that file or keep the old document
// while the file sits uncached. Every consumer guards on window.PDXPersonLink and
// falls back to the markup it emitted before, so a half-pickup costs the href and
// nothing else — but a shell asset changed, so the rule above applies.
// v94 - THE SHELL CACHE ITSELF WAS HOLDING THE WRONG DOCUMENT, so the bump is not
// about a changed asset this time: it is about DISCARDING WHAT IS ALREADY STORED.
// Through v93 handleNavigate wrote every navigation's document to the single '/'
// key, so any device that ever opened a /p/<pid> link has a '/' entry that is not
// the homepage — it is the last person file it fetched, crawl header and all — and
// served it for the homepage and for every other person address. That is the
// /p/khanna-paints-Mike-Lee defect. handleNavigate now keys a document by the
// address it was generated at (see the note over it), and index.html carries an
// inline guard that neutralises a crawl header whose stamp is not the address in
// the bar. Neither of those can clean up a poisoned entry that is already on the
// device, and the entry lives in a cache named after this constant: renaming it
// means activate() deletes politidex-shell-v93 outright and install() refetches
// '/' from the network, so the first thing the new worker does is throw the wrong
// document away. index.html changed too (the guard is in it) and '/' is precached,
// which is the ordinary reason for a bump as well.
// v101 - FEDERAL ROSTER WAVE R1, and the reason is compare-hub.js again — this time
// 315 faces, not two. R1 admits every sitting voting member of the 119th House the
// roster did not already carry. It has to, because the House corpus already on disk
// held 7,298 recorded positions with nowhere to go: present in the Clerk's XML, read
// by the ingest, and dropped, because attribution is fail-closed through
// db/vr-member-map.json and the map carried 116 of the House's 431 sitting members.
// Roughly 315 rows on every one of 23 rolls. Widening the roster recovers 7,138 of
// them; re-reading the documents recovers nothing.
//   TWO SHIPPED FILES MOVE, AND BOTH ARE RUNTIME ENTRIES RATHER THAN PRECACHED ONES,
// which is exactly why this bump exists rather than being skippable. compare-hub.js
// carries BROWSE_PHOTOS and gained 315 portrait URLs. cmp-data.js carries CMP_DATA and
// gained 308 identity rows — name, office, state with district, party chip, empty issues
// list, and nothing else. The runtime cache NAME carries CACHE_VERSION, so without a
// move a warm device keeps serving a photo map with no face for any of them AND a roster
// with no row for any of them.
//   The consequence on a warm device is specific and it is worse than a missing face.
// A pid the app has no CMP_DATA row for is not a member with a blank card; it is a
// member the browse and compare surfaces cannot name at all, while the database is
// serving that same pid 7,138 freshly attributed roll-call cells. So a reader following
// a vote row to a page would land on a formal record attached to nothing — the exact
// shape of the "record still being built" state, but arrived at by staleness rather
// than by the publication floor, which is a bug wearing the floor's clothes. With the
// row present and no portrait, the card falls back to the monogram, which is honest but
// wrong 315 times over on the two surfaces where faces are how people find anybody.
//   WHAT THIS BUMP DOES NOT SHIP. No score, no package percentage, no stance, no floor
// change, no new issue key and no new _DOS_MECH pair: no judged act newly became
// readable in this wave, so there is no mechanism copy to write. consistency.js is
// untouched. Direction Match is untouched. Every one of the 308 new files carries score
// null rather than 0 — a 0 is a claim and null is the absence of one — and sits BELOW
// the publication floor, so it reads "record still being built" until cited content
// lands on it. Nothing was marked publishable by hand.
//   Party is on the bio chip because it is identity: it is what the Clerk's roster and
// the congress-legislators dataset both print next to the name. It is never a sort and
// never a score, and no reader copy is generated from it.
//   db/share-index.json and sitemap.xml are regenerated for the same arithmetic and are
// neither precached nor versioned here — a formal row may now appear on a newly admitted
// pid, which is the wave working. /p/lee is byte-identical: a senator cannot move on a
// House-only wave. The per-person admission ledger, and the written refusals — four
// vacant seats, six delegates, seven former members the rolls name — are in
// db/vr-federal-roster-r1-census.json.
// v100 - THE F9 MECHANISM LINES, and the one row that must never print a
// direction. Federal wave F9 reads the pool F7 bridged and deliberately left
// unread: the contested House amendment rolls of the 119th. The census was
// rebuilt rather than inherited and came back at 51 rather than F7's 54; of
// those, 38 are refused in writing because a FAILED House amendment's operative
// text is published nowhere this corpus can reach, and seven are admitted on
// text read out of the parent bill's engrossed copy section by section. The
// ingest, the seven measures and the seven issue rows are database-side and bump
// nothing on their own. What is client-side is consistency.js: _DOS_MECH gained
// seven curated pairs, keyed 'H.Amdt. NN|119|<key>'.
//   The warm-device combination worth avoiding is specific. Six of the seven
// pairs sit on keys that print a direction (lgbtq_rights, climate_action,
// tough_on_crime), and every one of those six reads AGAINST the key on a yea
// while its parent bill is the annual defense authorization or the farm bill. On
// a device holding v99's consistency.js those rows arrive with the derived
// restatement beside them — "counted on this chip because that is the primary
// subject of this measure" — on a face whose only other text is "On Agreeing to
// the Amendment" and a number. A reader seeing an NDAA amendment counted against
// a civil rights chip with no words explaining the reading has been handed the
// restuffing question and no answer to it. The curated pairs answer it: each
// 'did' names the vehicle, each 'why' argues from the amendment's own section,
// and each 'more' records the engrossed section it was read at and the keys that
// were considered and declined.
//   The seventh is the reason a bump and not a note: H.Amdt. 196 is filed on
// states_federal_power, which sits in _RD_NO_POLE, so the row is inventory and
// renders no direction at all. Its curated pair is the only text on the face
// saying so. A 280-142 vote showing up with no stance and no explanation reads
// as a bug, and it is the widest margin in the wave — the row most likely to be
// looked at.
//   THE SECOND SHIPPED FILE IS NOT A SCRIPT, and no version here reaches it.
// db/share-index.json is regenerated in this wave: it carries personRecord, the
// up-to-six formal-record lines the share-preview edge injects as the crawl block
// on /p/<pid> before any JavaScript boots, and gen-crawl-record.mjs builds it by
// booting the real consistency.js over the migrations on disk. So seven new judged
// acts re-rank that window whether or not anyone regenerates the file. They move
// 100 of the 332 people who have a block, every one of them a House member, and
// the lines gained carry only the three chips this wave argues a direction on —
// /p/bmoore's block gains "Strongly supports · Tough on Crime · 9 advanced · 0
// against" and drops Expand Voting Access out of the six, while /p/lee's six lines
// are byte-identical because a senator cannot move on a House-only wave.
// states_federal_power gains no line at all, which is _RD_NO_POLE working. It is
// not a precached shell asset and no service worker version can invalidate it; it
// is named here because this bump is the only place the two shipped artifacts are
// listed together, and the mapping seed's theOfflineSnapshotThisWaveAlsoMoves says
// what a stale copy would serve. sitemap.xml is regenerated for the same
// arithmetic — seven openable /b/119/H.Amdt. addresses — and is neither cached nor
// versioned here.
//   No floor, tier, weight, score or verdict moved, and no existing cell was
// rewritten. consistency.js and db/share-index.json are the shipped files:
// everything else in the wave is a migration, a census script, two seeds, a
// sitemap and a harness. The append is append-only and nothing above the
// _DOS_MECH literal changed, which the wave harness asserts by diffing the file's
// two halves separately.
// v99 - FEDERAL WAVE F8, and the reason is compare-hub.js. It carries
// BROWSE_PHOTOS and gained two portraits — Cindy Hyde-Smith and Alan Armstrong,
// the senators the wave admitted so their Senate votes could be attributed at all.
// compare-hub.js is a RUNTIME entry rather than a precached one, which is exactly why
// it needs this bump rather than being exempt from it: the runtime cache NAME carries
// CACHE_VERSION, so without a move a warm device keeps serving the copy of the map
// that has no face for either of them. That is not cosmetic here. A member who
// attributes a roll call is a member an Official Record share card can be drawn for,
// and the card renders the portrait — so the same person would appear with a photo on
// the card and as a party-tinted monogram on the page it came from. Wave F6 bumped
// this constant for this file for this reason; F8 is the same change and gets the
// same treatment.
// v98 - THE F7 MECHANISM LINES, and the eight rows that must never print a
// direction. Federal wave F7 opens the pool F6 left unread: fourteen privileged
// war-powers joint resolutions that only ever reached the Senate floor as a motion
// to discharge the Foreign Relations Committee, four District of Columbia bills
// keyed to an existing SUBJECT (border security, removals, criminal exposure) rather
// than to the venue they happened in, and one NDAA amendment repealing the 2002 and
// 1991 authorizations. Twelve of the nineteen measures carry mappings; twenty-eight
// issue rows in all. The ingest and the mapping are database-side and bump nothing.
// What is client-side is consistency.js: _DOS_MECH gained twenty-eight curated pairs,
// so a member row reading Contradicted or Mixed on restraint, war_powers,
// strong_defense, border_security, deportations or tough_on_crime says what the
// instrument commanded and which way the ballot cut, instead of "counted on this chip
// because that is the primary subject of this measure" on a face whose only other text
// is "On the Motion to Discharge" and a number.
//   The warm-device combination worth avoiding is sharper than usual here. Eight of
// the twenty-eight rows are war_powers rows, and war_powers sits in _RD_NO_POLE: the
// row is inventory and renders no direction at all. On a device holding v97's
// consistency.js those rows arrive from the database with the derived restatement
// beside them and nothing on the face explaining why no stance is shown — a reader
// looking at a run of identical procedural questions with no direction and no
// explanation would reasonably read it as a bug (and the eight sit beside eight
// restraint rows on the same instruments, which do print one). The new pairs say it in words: this
// chip records that the member voted on a war-powers instrument and prints no stance
// either way. Every one of the twenty-eight carries a `more` as well, which the
// appended-entry wall in scripts/test-person-crawl-block.mjs requires and which is not
// a restatement: a curated `more` DISPLACES the mapping rationale in the L4 fold, so
// these hold the roll and the tally, the theatre, whether the discharge carried and
// what followed it, and what the instrument does not reach.
//   THE SECOND SHIPPED FILE IS NOT A SCRIPT. db/share-index.json is regenerated in this
// wave: it carries personRecord, the up-to-six formal-record lines the share-preview
// edge function injects as the crawl block on /p/<pid> before any JavaScript boots. The
// wave's Senate rolls move 35 of those rows a tier and re-rank the six-line window for
// 172 of the 332 people who have one, so a device or an edge cache holding the old copy
// serves a person's old six lines — Mike Lee leading on Peace Through Strength at 0
// advanced and 7 against, where the regenerated snapshot reads Split at 7 and 7. It is
// not a precached shell asset and no service worker version can invalidate it; it is
// named here because the bump is the only place the two shipped artifacts are listed
// together, and the mapping seed's theOfflineSnapshotThisWaveAlsoMoves says why that
// lane moves further than the live one does.
//   No floor, tier, weight, score or verdict moved. The three mechanism harnesses
// re-derive every verdict and every Direction Match reading with the prose in and with
// _DOS_MECH emptied and require them identical, and the wave harness boots HEAD and
// this tree side by side and requires the same rows out of both except the keys this
// wave writes. consistency.js and db/share-index.json are the shipped files;
// everything else is a migration, two seeds, a sitemap and a harness.
//
// v97 - ELEVEN NEW JUDGED BILLS ARRIVED WITH THEIR MECHANISM LINES, and the lines
// live in a precached asset. Federal wave F6 ingests eleven contested House passage
// votes and maps eleven PRIMARY issue rows on four keys that were already live, all
// of it database-side — which on its own bumps nothing. What is client-side is the
// curated pair each of those judged acts needs: _DOS_MECH in consistency.js gained
// eleven entries so that a row reading Contradicted or Mixed on the energy,
// permitting, lands or climate chip says what the bill did and which way the ballot
// cut, instead of "counted on this chip because that is the primary subject of this
// measure" on a face whose only other text is a long title. A warm device holding
// v96's consistency.js takes the new rows from the database and renders every one of
// them in the derived voice, which is the one combination worth avoiding: the mapping
// is live, the explanation is not, and the reader sees the restatement on eleven
// bills nobody can identify from a number. No floor, tier, weight, score or verdict
// moved — the three mechanism harnesses re-derive every verdict and every Direction
// Match reading with the prose in and out and require them identical, and the wave
// harness boots HEAD and this tree side by side and requires the same.
//   The second shipped file is compare-hub.js, which carries BROWSE_PHOTOS and gained
// eight official congressional portraits: the eight thin House files this wave finally
// attributes votes to. Any member who attributes a roll call can be the subject of an
// Official Record share card, and that card is an image with a face on it whose
// #record= link paints before — or entirely without — a Firestore round trip. Without a
// bundled portrait the card showed a face and the page it opened showed a party-tinted
// monogram of the same person. compare-hub.js is a stale-while-revalidate runtime entry
// rather than a precached one, but the runtime cache name carries CACHE_VERSION too, so
// the rename drops the copy holding the old map and the portraits arrive with the rows
// they belong to. Same public-domain source and same allowlisted host as every other
// federal portrait in that map; no roster, no address and no photo tier order changed.
//
// v96 - voting-record.js learned which mapping generation a payload is of, and
// refuses to file a cached pack built from a superseded one over a live read this
// device has already been shown. That is the last shape of the F4 bug the
// versioned pack key cannot reach: on the section's offline fallback the pack is
// answered from THIS cache, so no request is made, no redirect happens and no
// header is read — the only thing standing between an old mapping and the reader
// is the comparison inside the shipped file. Which means a warm device running the
// v95 copy of voting-record.js still has the hole, out of politidex-shell-v95,
// until the shell is renamed. Hence this bump: the fix is entirely in a precached
// asset. (The packs themselves need no sweep — prunePacks already drops superseded
// versions, and handleVrPack has always tried the network first.)
//
// v95 - THE BUMP THAT THREE SHIPPED FIXES DID NOT GET, and the reason the empty
// letterhead was still on screen after every one of them. /word-action.js is a
// precached SHELL ASSET on stale-while-revalidate: a warm device is served the
// copy in politidex-shell-<version> INSTANTLY and the network copy only replaces
// it in the background, for the NEXT load. Three consecutive passes rewrote that
// file — the seed-yields-to-record fix, the first-paint honesty fix and the
// cold-arrival fix, all of which added the readers that forbid the contradiction —
// and not one of them renamed this cache. So every device that had opened
// PolitiDex since v94 landed kept running a word-action.js from before the first
// of those fixes, and reproduced the exact defect the source had already made
// impossible: "No formal pattern on file yet" beside a chip reading VOTES · 68.
// The source was right and the bytes in the browser were three fixes old.
//
// THE STANDING RULE, RESTATED BECAUSE IT WAS THE THING THAT FAILED: a change to
// any file in SHELL_ASSETS is not shipped until this constant moves. The list
// below is a precache manifest, not a hint — an unbumped edit to anything on it
// reaches nobody who has already visited.
//
// AND THE BRIEF'S OWN DEPENDENCIES JOIN THE LIST. word-action.js decides which
// true sentence the letterhead gets by asking three modules, and only one of them
// was precached: PDXVotingRecord (voting-record.js, on the list) for the payload
// and the chip count, PDXFormalIndex (formal-index.js) for the shipped act counts
// and the reviewed empty notes, and PDXPerson.crawlRecord (person-file.js) for the
// rows the edge printed into this document's own header. On a cached boot the two
// unlisted ones arrived from the network or not at all, so the brief lost two of
// its four "is there a record here" readers on exactly the slow connection where
// it needed them — and a reader that cannot speak looks identical to a reader
// saying there is nothing on file. person-file.css ships with its script for the
// usual reason: the header and kicker it styles are hidden-by-default blocks, and
// unstyled they are loose text above the fold.
// v102 - FEDERAL ROSTER WAVE R2, and the reason is cmp-data.js. It is on the precache
// manifest below and this wave adds twelve members to it: the nine House members and
// three senators whose votes have been resolving through db/vr-member-map.json for waves
// while the roster had no row to name them. On a warm device the shell copy is served
// instantly and the network copy only lands for the NEXT load, so without this bump every
// returning reader would keep a cmp-data.js with no row for /p/hyde_smith, /p/jon_husted,
// /p/alan_armstrong or the nine House files — the person page would render the
// unknown-pid state for people the source now names, and search would not find them.
// It also carries the mullin office correction: an unbumped device would keep showing
// "U.S. Senator · Oklahoma" for a seat Alan Armstrong now holds, i.e. three sitting
// senators in one state, which is precisely the contradiction the wave fixed.
// v103 - PERSON-FILE CHROME, and the reason is four shell modules at once. All
// four are cached copies on a returning device:
// person-file.js (the unknown-pid notice now waits for the roster wait it was
// outrunning, and the tab + trail follow the person a file was opened for),
// profiles-full.js and stance-helpers.js (the mid-page record CTA no longer
// says "still being built" over a formal record it had not finished reading),
// and consistency.js (an empty Official Record roll-up says "No stated position
// to test" instead of borrowing the wording of missing votes). Without the bump
// a warm device keeps serving the old copies from the shell cache for the whole
// of the next load, so the returning reader — the reader most likely to hit the
// cold /p/ path from a bookmark — would still be told we do not carry a person
// whose row is sitting in the very same cached cmp-data.js.
// v104 - THE BRIEF'S SLICE LINE, and the reason is a renderer and its stylesheet
// that have to land together. word-action.js prints one new sentence under the
// pattern list on a file whose whole readable formal lane is a small set of House
// rolls from one Congress — "Pattern from 23 House rolls on file — not a career
// score." — and word-action.css sizes it as the muted note it is. Both are on the
// precache list below. A device that takes the new renderer against v103's
// stylesheet has an unstyled paragraph at body size sitting between the chips and
// the route out, which is the one shape this sentence must not have: a full-size
// line reading "not a career score" beside three one-sided chips reads as a
// verdict on the record rather than a description of the file. A device that takes
// the new stylesheet against the old renderer has a rule for a node nothing emits.
// Nothing else moved — no count, no chip, no tier, no Direction Match figure — so
// the bump exists purely so the pair arrives as a pair.
// v105 - THE DOOR 1 WORKSPACE, and the reason is a new pair plus the four
// surfaces it relabels. door1-workspace.js and door1-workspace.css are both new
// entries on the manifest below, and they are the same kind of pair as v104's:
// the script paints a two-region desk — a mode rail beside one open mode — and
// the stylesheet is what makes it two regions. A device that takes the script
// without the sheet gets the rail, the desk, the shelves and the four view
// strips as one undifferentiated column of buttons and paragraphs, which is
// precisely the stacked-surfaces shape the feature exists to replace: the
// reader would meet MORE stacked prose than before the change, not less.
//
// The bump also matters for the surfaces the script does not own. It writes a
// one-line "a view of the Door 1 workspace" strip into #hero-receipt,
// #say-vs-do, #issue-front-door and #hr1-showcase. On a warm device serving a
// v104 index.html there is no #pdx-door1-workspace mount, so the script's own
// gate keeps it silent and those four strips are never painted — correct, but it
// means the whole feature is invisible until index.html itself refreshes, and
// index.html is on this manifest too. One bump ships the mount, the script, the
// stylesheet and the relabelling together, which is the only combination in
// which a surface calling itself "a view" has a desk to be a view of.
//
// Nothing else moved: no floor, no count, no mapping, no roster row and no
// figure of any kind. The desk reads the modules already on this list.
// v106 - THE FOUR VIEWS COLLAPSE, and the reason is that the pair from v105 has
// to move together a second time. v105 shipped the desk and left the four old
// Door 1 chapters standing at full height underneath it, each wearing a label
// saying it was a view. A cold homepage was therefore the proof band, then the
// whole loop on one desk, then the same four products again — more stacked prose
// than before, which is the shape the desk exists to remove.
//
// door1-workspace.js now sets one attribute on each of those four sections once
// sync() has actually painted a desk, and door1-workspace.css is what turns that
// attribute into a one-line stub: title, "A VIEW of the Door 1 workspace", one
// control back to the desk. THE TWO FILES ARE USELESS APART IN OPPOSITE
// DIRECTIONS. A device with the new script and the v105 sheet sets an attribute
// no rule matches: nothing collapses, and the homepage is the stack again. A
// device with the new sheet and the v105 script has a rule nothing triggers:
// also the stack, harmlessly. Neither is wrong, but neither is the feature, and
// the pairing is the only way a reader gets it. Both entries are already on the
// manifest below under the same names, so this bump is the whole delivery
// mechanism — there is no new file to add.
//
// The same bump carries a third file, issue-view.js, and a fix that needs all
// three. An issue key that no curated bundle happens to list — public lands is
// the live example, a real key with a label, a chip and formal acts filed against
// it — used to resolve to nothing on this desk, and the desk then printed the
// record lane's own no-vehicle sentence over what was actually a failed lookup.
// A failure wearing the floor's words is the worst version of that bug, because
// it reads as a finding. A shipped key now opens as itself.
//
// Making it open was only half of it. PDXIssueView.warmVotes took a key and
// resolved the bundle behind it internally — and that resolve is exactly what
// returns nothing for an unbundled key, so the roll-call record was never
// requested for the one case the desk had resolved by hand, and the issue ranked
// on receipts and stated positions alone. The export now also accepts an
// already-resolved target, the desk hands over the one it built, and the repaint
// rides the 'pdx-issue-votes' event the ledger already fires once per batch.
// Every other caller still passes a bare key and still gets the old behaviour.
// issue-view.js is on the manifest below already, under the same name.
//
// Nothing else moved. No floor, no mapping, no weight, no roster row, no slice
// sentence and no figure of any kind; index.html is untouched by this pass.
//
// v107 - Door 1's arrival: the hash and the stub now open the mode they name.
// A cold #say-vs-do scrolled to the SECTION named say-vs-do — which, once the
// desk has painted, is a one line stub sitting directly above Door 2's "There's
// an election coming". So a reader who asked for the receipts library got a
// label and somebody else's door. Tapping "Open in Door 1" on that same stub
// did reach the desk and left it on "Open a measure / vehicle", so the URL read
// #say-vs-do while the rail highlighted measure.
//
// One cause under both: the mode and the landing were decided in two places
// that did not have to agree. index.html's fromHash opened the work layer and
// scrolled to the section; the desk mode was set only as a side effect of a
// wrapper on that same call, so on a cold boot the rail kept whatever
// sessionStorage was last left on; and each stub carried a mode literal baked
// into its own markup rather than reading the shared table. door1-workspace.js
// now holds ONE arrival table (modeForWorkId) and ONE landing (scrollDesk, with
// an explicit wall against Door 2's surfaces and against the four stubs), and
// exports arrive(id) for the hash. index.html routes every WORK_ID entrance —
// fromHash, hashchange and pdxOpenSurface — through one land() helper, and
// openWork() honours an opts.noScroll so the desk can take the landing without
// the router scrolling to the section first.
//
// THE TWO FILES HAVE TO MOVE TOGETHER, which is the whole reason for this bump.
// The fix is a handshake: index.html supplies land() and the noScroll contract,
// door1-workspace.js supplies arrive() and the desk-only landing. Both are in
// the precache list below ('/' and '/door1-workspace.js'), so a device holding
// one half from the old version and the other half from the new one gets a
// broken arrival either way: an old index.html with a new desk never calls
// arrive() and lands on the stub again, and a new index.html with an old desk
// finds no arrive(), falls back to openWork(), and lands on the stub as well —
// while pdxOpenSurface's noScroll path would go unanswered. door1-workspace.css
// did NOT change in this pass — the stub's layout and the collapse rule are
// exactly as v106 shipped them — but it is precached under the same key, so this
// bump refetches it too, which is the honest cost of versioning a shell rather
// than a file. Nothing else changed: no floor, no mapping, no weight, no figure,
// and the collapse attribute is exactly as it shipped.
// v108 - The issue desk became a record ledger. Picking a key now prints what
// the formal record on it DID — advanced it / cut against it / ran both ways /
// thin / no side read — off the formal-pattern index's own published row, plus
// the measures that map to the key. Four files move as one change and a stale
// copy of any of them is a broken pane:
//   · consistency.js       — one row of the formal-pattern index is now reachable
//                            on its own (rowFor / band / LEDGER_BANDS / TAIL_MIN).
//                            Extraction only: the row the ledger asks for is the
//                            row the person file's list already contained.
//   · door1-workspace.js   — the ledger itself, plus "Open any tracked key", the
//                            typeahead over every shipped ISSUE_MAP key, so
//                            lands_preserve opens as itself rather than being
//                            unreachable behind a shelf of thirteen bundles.
//   · door1-workspace.css  — the bands, the census, the seek control, the folded
//                            tail. New classes; nothing existing restyled.
//   · all-seeing-eye.js    — a query that resolves to a tracked key now leads with
//                            that key's formal record and a door into the ledger,
//                            and the consistency ranking does not run on that path.
//                            NOT on the precache list: it is a RUNTIME entry, and
//                            the runtime cache name carries CACHE_VERSION, so this
//                            bump is what drops the stale copy. Without the bump a
//                            warm device would serve the old Eye against the new
//                            desk — the resolver it now calls (PDXDoor1.issueKeyFor)
//                            would simply be absent and the key hit would silently
//                            not appear.
//   · index.html           — styling for that one Eye block (and it is precached
//                            as the shell's own entry, '/', so it travels here).
// No floor, no mapping, no weight, no roster row, no slice sentence and no figure
// of any kind moved. Direction Match is untouched and reads byte-identically with
// this pane loaded and without it.
//
// v123 - THE ISSUE FILE GREW A LETTERHEAD. /i/climate_action printed the key's
// NAME and then went straight into the census: a reader who followed a citation
// to that address was never told what the key MEANS, how much is filed under it,
// or how to get back to the shelf it came off - and the family half of the crumb
// on the bar was a caption, so the one control that would have answered the last
// question was not a control. The record below it is unchanged and is still the
// desk's own builder, byte for byte.
//   · door1-workspace.js   - publishes the census it already computed as integers
//                            (PDXDoor1.issueCensus) so the file's inventory line
//                            is the same read as the prose two inches below it.
//                            Stale here means the letterhead finds no census and
//                            prints no figures at all, which is the refusal it is
//                            written around - but the new file panel would then
//                            be shipping without the one line this pass is for.
//   · issue-file.js        - the letterhead itself: key chip, the locked scope
//                            prose (or issue-scope.js's own "no definition on
//                            file yet"), the inventory, and two jumps. Plus the
//                            family crumb, which is now a button onto the desk.
//   · issue-file.css       - those blocks, and the crumb's core half restyled
//                            from caption to control. No hex, same as before.
// No floor, no mapping, no weight, no roster row and no percentage of any kind
// appeared. Every integer on the new line arrived from the desk's census as an
// integer, and while the roll-call read is still out the line prints no figure at
// all - it says it is reading, exactly as the ledger under it does.
//
// v122 - TWO DOORS THAT DID NOT OPEN, AND A FILE WITH NO WAY IN. The Eye's
// answer to "climate" paints a family row and its leaf rows, and on a page with
// the desk already mounted neither one did what it said. The family row called
// pdxDoor1Issue(core), which re-syncs the desk in place and does NOT scroll when
// the desk is already in issue mode - so the panel closed, the desk repainted
// below the fold, and the reader saw nothing change. The leaf row called that
// same desk door FIRST, so it never reached its own file: the desk scoped itself
// to the key while the row's own href said /i/<key>. And a reader already scoped
// to a leaf on the desk was looking at the file's body with no control anywhere
// that said it had an address.
//   · pdx-issue-profile.js - the sequence adopt() runs was reachable only from
//                            the path, so every surface that wanted to send a
//                            reader to a file had to reassemble it. It is one
//                            named door now, PDXIssueProfile.open(key): resolve,
//                            refuse a family (a core has no single ledger), raise
//                            an already-open file rather than swallowing the tap,
//                            else commit the pick quietly, mount the panel, stamp
//                            the address and title the tab. It answers false and
//                            never writes location - this module hands the
//                            address out, it does not take the document over -
//                            so a caller whose page has no stage still owns its
//                            own <a href>.
//   · issue-file.js        - focus(), for a tap on a file that is already open:
//                            re-assert hidden/display, re-take the body lock and
//                            focus the panel. Nothing repainted, nothing scrolled
//                            back to the top, no census built here as ever.
//   · all-seeing-eye.js    - issueDoorTry() splits by shape properly. A family
//                            picks AND lands: pdxDoor1Issue(core) then the desk's
//                            own lander, PDXDoor1.toDesk('issue'), with the Eye
//                            panel lowered on the way past so the desk it opened
//                            is the thing on screen. A leaf goes to the file's
//                            door first and to its /i/ address second, which is
//                            the string the row already carried. The bounded cold
//                            ladder is unchanged.
//   · door1-workspace.js   - one control on the lede of a LEAF scope, "Open issue
//                            file", a real anchor on the path asked of the module
//                            that owns /i/ (never spelled here), answered in place
//                            by the same opener the Eye's leaf row uses and handed
//                            back to the browser on a modified or middle click.
//                            A family scope gets none: the child shelf is the way
//                            in, and a control promising a file for a core would
//                            be the same broken promise this pass came to fix.
//                            The control sits ABOVE the shared body, so what the
//                            desk paints below it is still byte-for-byte what
//                            /i/<key> serves.
//   · door1-workspace.css  - .d1-filedoor, that control: a quiet link with the
//                            address printed beside the label, deliberately not a
//                            chip - the chips change the scope, this one opens the
//                            scope already chosen.
// netlify.toml's /i/* rewrite and issue-file.css are unchanged by this pass and
// still carry that address; they are named here because the address, its stage
// and its stylesheet ship together or not at all. No percentage, no Direction
// Match change, no new key, no roster row, no party control anywhere, and no
// PDXIssueView for a family. 8245 warming and the Mandate lane were not touched.
//
// v121 - A FAMILY IS A DOOR, NOT A LEAGUE TABLE OF PEOPLE. "open the full Climate,
// Energy & Land ledger" and the topic chip on a person's file both mounted the
// consistency overlay: politicians ranked head to head, with Any party / R / D /
// Ind pills over the list. A family holds seventeen tracked keys and is not a leaf
// file, so the ranking was person-vs-record on a question nobody asked, and the
// party pills sorted the people answering it by caucus.
//   · issue-view.js      - ONE GATE, in open(): a key that resolves to a family
//                          (empty focusKey) never paints a ranking. It hands the
//                          key to window.pdxDoor1Issue() and the desk reads out
//                          that family's keys; a deferred desk is waited for on
//                          the same ladder the Eye uses, and the last resort is
//                          the family's own address, never a substitute ranking.
//                          renderChrome() carries the same wall, so a view that
//                          got there another way still leaves. The old fallback
//                          that re-parented an unclaimed key into coreIssues()[0]
//                          is gone — a stranger's family is not an answer. The
//                          overlay's own switcher chips and its widen control now
//                          open the desk instead of clearing focusKey in place.
//                          Every party control is deleted: the four pills, their
//                          handler, and the party clause in applyFilter(). The
//                          front door names what it opens — families of tracked
//                          keys, with each card's key count and documented count.
//   · issue-view.css     - the three caucus-tinted pill rules removed; nothing in
//                          this file paints a party any more.
//   · door1-workspace.js - the bundle footer's ledger link calls pdxDoor1Issue()
//                          with the family key and says what is behind it ("open
//                          its 17 keys"), counted off the same childKeys() the
//                          family note reads. window.pdxDoor1IssueFace, whose
//                          middle branch was the ranked overlay, had no caller
//                          left and is gone: this desk has one issue door.
//   · stance-helpers.js  - the topic chip on a person's file printed the FAMILY
//                          label and handed the LEAF key to the overlay. It now
//                          reads out the key's own label and opens the desk on it.
//   · index.html         - the front door's label, the quick-jump chip and the
//                          three nav entries said "Issues Ranked"; they name the
//                          record now. Precached as the shell's own '/'.
// Consistency ranking still exists and still computes the same way — Door 1 reads
// buildRanking(core, '') for its family inventory, unchanged — it is simply no
// longer a destination a formal bundle footer or a person's chip can open. No
// percentage, no Direction Match change, no new key, no roster row and no figure
// moved, and Eye Formal still paints no 882 block.
//
// v120 - THE MEASURES SLICE IS NOT GOVERNED BY A CLOCK. 8245 was still denied in
// preview: typing it painted "Formal 0" and "The eye finds nothing for 8245", and
// then the same query painted Legislation & Bills · Emergency price relief
// memorandum. The first frame was a denial of a record already on the wire.
//   · all-seeing-eye.js — v119 moved the warming ceiling's clock to
//                         DOMContentLoaded, which was right and not enough. The
//                         memo lives ONLY in the paged /measures list, a hundred
//                         rows a request, and on a cold function that walk runs
//                         well past eight seconds — so the deadline expired while
//                         the pages were still landing and the panel reported an
//                         index it had not finished reading. The measures lane is
//                         off the clock now: it is warm when its own request has
//                         ENDED (rows, none, or a failure) and cold until then,
//                         and a cold slice gets a loading line in the measures
//                         group instead of a zero. Two facts about the request can
//                         still end the wait — it went quiet for thirty seconds,
//                         or bills.js never executed at all — and neither is a
//                         parse clock: the window is stamped when the request goes
//                         out and re-stamped by every page that lands, so a long
//                         walk that is still delivering never trips it. The ceiling
//                         is unchanged for the three lanes that need it (the
//                         roster, the register, the issue library wait on passive
//                         globals that never announce their own absence). Also:
//                         PDXBills.list() swallows a failed request and hands back
//                         the INLINE marquee index, which the eye stored as the
//                         live measures list and then reported on — a silent
//                         permanent denial of every measure that lives only in the
//                         database. A fallback is no longer mistaken for a
//                         response; it is asked once more, then settled. And the
//                         lane control's count reads "…" rather than 0 while a
//                         lane feeding it is still loading, because "Formal 0" is
//                         the denial sentence printed as a number.
//   · index.html        — one class for that count's waiting state. Nothing else
//                         restyled, and it is precached as the shell's own '/'.
// No floor, no mapping, no weight, no roster row and no figure moved. Readiness
// governs WHEN a zero may be published, never what ranks: the same query against a
// loaded index returns the same rows in the same order as before this bump.
//
// v119 - THE EYE DOES NOT DENY A RECORD THAT HAS NOT ARRIVED, AND AN ISSUE ROW
// WAITS FOR ITS DOOR. Three files travel together, and the bump is the only way a
// warm device gets any of it:
//   · all-seeing-eye.js — the warming ceiling was measured from a mid-parse boot
//                         while every source it waits on is deferred, so on a slow
//                         load it expired before any lane had a turn and the panel
//                         printed "The eye finds nothing" for a measure the record
//                         holds (8245 was denied that way). The clock now starts at
//                         DOMContentLoaded; the deadline itself is unchanged. The
//                         issue REGISTER became its own lane — every issue FILE row
//                         is built from ISSUE_MAP, which no other lane's readiness
//                         spoke for — so a cold register gets its own loading line
//                         in the group the answer will appear in, and the all-empty
//                         panel now prints one such line per warming category
//                         instead of a bare sentence. And the family/leaf rows wait
//                         for the deferred desk and address book on the same
//                         cold-arrival schedule door1-workspace.js already uses,
//                         because a tap that reached for a module the page had not
//                         executed yet did nothing at all.
//   · bill-detail.js    — the topic and provision chips on an EXECUTIVE measure
//                         said "A Yea advances this". Nobody voted on an executive
//                         order; the sheet's own letterhead says so an inch above.
//                         The direction is unchanged and so are the classes every
//                         count and colour reads — only the actor: "As issued,
//                         advances this".
// No floor, no mapping, no weight, no roster row and no figure moved. Nothing that
// ranks, scores or counts was touched: the eye's readiness governs WHEN a zero may
// be published, never what ranks, and the chips restate a direction the curators
// already recorded.
// v118 - THE TITLE STOPS DOING THE TALKING. A measure sheet opened on a number,
// a title, a date and a link, and on a presidential memorandum the title is
// "Delivering Emergency Price Relief for American Families and Defeating the
// Cost-of-Living Crisis" — a name that lists no lever at all: no rule, no
// deadline, no dollar, nothing a reader could check. The archive's own
// description was on the page the whole time, printed only inside a closed
// disclosure BELOW the census, which is where a reader looks last. A reader who
// took the title as the description was handed a slogan and told it was a
// finding.
//   · bill-detail.js       - the description now leads the identity block, above
//                            the topic chips, printed verbatim with the official
//                            URL repeated beside the prose ("Read from Federal
//                            Register ↗") — because a plain-language summary is a
//                            reading of a document and a reading with no document
//                            next to it is an assertion in a nicer font. ONE
//                            FIELD, ONE PRINTING: the identity row and the prose
//                            fold read the same vr_measures.summary column and
//                            exactly one of them renders it. A description short
//                            enough to read as a list of levers goes up; the
//                            ingested section-by-section wall of an omnibus stays
//                            folded, verbatim, because promoting two thousand
//                            characters into an identity row would bury the five
//                            facts that block exists to state. NOTHING IS
//                            GENERATED: no summary is ever derived from a title,
//                            and a description column holding nothing but the
//                            measure's own name is read as EMPTY, so the locked
//                            line "No plain-language summary on file yet" prints
//                            instead of a title wearing a summary's label. That
//                            line, the executive-act copy, the disapproval-measure
//                            clarifier and "Standing describes the instrument, not
//                            its effect." are all untouched, and a floor bill with
//                            an empty chamber file still says no vote is on file.
//   · index.html           — UNCHANGED, and precached as '/', so a warm shell
//                            pairs the new sheet with the same page it always did.
//   · door1-workspace.js  — UNCHANGED. The desk did not move for this pass, but
//                            it is named here because it is re-fetched anyway:
//                            the bump renames both cache buckets, so every
//                            precached shell asset travels together whether or
//                            not its bytes changed.
//   · door1-workspace.css — UNCHANGED, and travels for the same reason. A desk
//                            served from the old bucket beside a sheet served
//                            from the new one is the one mismatch a version
//                            bump exists to prevent.
// The prose itself is data, not code: one migration
// (20261027000000_vr_instrument_lever_summaries_w1) fills vr_measures.summary for
// exactly two already-mapped executive instruments — Presidential Memorandum,
// 90 FR 8245 and Executive Order 14162 — written from the Federal Register text
// each sheet already cites, levers only, with the document URL recorded beside
// the prose in the migration. A stale shell here would show the new summaries in
// the old place (folded) rather than show anything false, which is why the bump
// is small; it is still a bump because bill-detail.js is a precached shell asset
// and the reader who benefits from the fix is the one who never re-fetches it.
// No floor, no mapping, no weight, no roster row, no issue key and no figure of
// any kind moved. No percentage, no party and no effect claim entered any copy:
// standing describes the writing, not its effect. Every person brief and every
// Direction Match read is byte-identical across a twin boot.
//
// v117 - A FAMILY IS A DOOR, NOT AN ADDRESS; AND A RANKING IS NOT A FORMAL
// ANSWER. Two defects with one shape: a surface promising a document that does
// not exist. (1) The All-Seeing Eye painted a core issue row — "Climate, Energy
// & Land" — as <a href="/i/climate_energy">. A core is a FAMILY of keys, not a
// key: resolveIssue() gives a core an empty focusKey and issueProfileHtml()
// scopes a census to ONE key, so there is no file at that path to mount. Tapping
// the row navigated, the panel refused the empty body, and the reader was left on
// the front page having been told a file was there. (2) In the FORMAL lane the
// Eye led with the Word-vs-Action ranking — "Climate, Energy & Land · Ranked by
// consistency · who backs up their words first", party letters down the rows and
// "See all 882 people ranked" beneath it — which is a characterisation of 882
// people and not the formal file the query asked for.
//   · all-seeing-eye.js    - a family row is a <button> now, not an anchor: same
//                            body, same family tint, same tap, no citation. The
//                            new issueFileHref() answers "is there a file at this
//                            address" — published ISSUE_MAP leaf AND not one of
//                            the thirteen cores — and a row only becomes an <a>
//                            when it says yes, so a leaf row (Protect Public
//                            Lands) still carries href="/i/lands_preserve"
//                            exactly as before. Activating a family row calls the
//                            desk's one issue entry point, window.pdxDoor1Issue
//                            (core), which is the same pick the desk's own chip
//                            makes — the family shelf with its child keys visible
//                            — and never PDXIssueView. The consistency ranking
//                            block does not render in FORMAL at all now (it was
//                            already absent from MANDATE); PUBLIC still holds it,
//                            unchanged, because that lane is where a reading of
//                            who backs up their words belongs. Formal's order is
//                            untouched otherwise: issue files, then families,
//                            then people with a formal row, then measures. The
//                            key card keeps its address for copy and new-tab —
//                            see pdx-issue-profile.js, which is what makes that
//                            address honest for a core.
//   · pdx-issue-profile.js - the cold arrival at /i/<coreKey> stops pretending.
//                            Before the stamp, before the title and before the
//                            canonical, a core id opens the desk on that family
//                            and raises the app's own honest notice: "<label> is
//                            a family of N keys, not a single file — its records
//                            are the keys filed under it." Nothing about that
//                            address claims a file exists at it: no replaceState,
//                            no canonical rewrite, no document title, no empty
//                            panel. A leaf address is completely unchanged and
//                            still stamps, titles and mounts the one census.
//   · door1-workspace.js   - the desk says the same sentence the notice does,
//                            above the bundle inventory, so a reader who arrived
//                            by tap and a reader who arrived by link are told the
//                            same thing. issueProfileHtml(key) is UNTOUCHED and
//                            is still the one leaf census; no key was minted.
//   · door1-workspace.css  - one small note style for that sentence.
//   · sw.js                - this note and the bump. The desk, the address module
//                            and the desk's stylesheet are precached and the Eye
//                            is a runtime entry, so the bump renames both buckets
//                            and a warm device cannot pair the new arrival with
//                            the old rows or the reverse.
// NOTHING ELSE MOVED. No score, no percentage, no tier, no party sort, no new
// ISSUE_MAP key and no Direction Match change: every person brief and every DM
// read is byte-identical across a twin boot. The Mandate lane is exactly as v116
// left it, the executive-act copy is untouched, and /i/<leaf> files render the
// same markup they did before this pass.
//
// v116 - A MANDATE IS A THIRD LANE, NOT PUBLIC AND NOT FORMAL. v115 gave the
// All-Seeing Eye two lanes, and that left the site's third kind of document with
// nowhere honest to sit. A People's Mandate item is a PROPOSED VEHICLE. In the
// public lane it reads as a quote — a thing somebody SAID — when a reform nobody
// has spoken about yet is not that. In the formal lane it reads as a measure — a
// thing that was VOTED ON — when a proposed vehicle has no tally at all, not even
// a failed one. Both readings lend the document a standing it has not got, and
// both are the same error in opposite directions, so the reform gets a lane of
// its own with its own label and its own empty sentence.
//   · all-seeing-eye.js    - the control is three-state now: Formal record
//                            (default) | Public & spotlights | Mandate. FORMAL
//                            and PUBLIC are unchanged in what they hold and how
//                            they rank, and now hold ZERO mandate rows; MANDATE
//                            holds People's Mandate reforms and nothing else — no
//                            /i/ file row, no family row, no spotlight, no person.
//                            The index gained a FOURTH category, read from the one
//                            registry the bridge already publishes
//                            (window._pdxMandateItems in index.html); no second
//                            copy of the list and no key minted here. A mandate
//                            row carries the reform, the word "proposed vehicle"
//                            and the tracked issues it is filed against — and by
//                            construction no formal pattern chip, no Word-vs-
//                            Action figure, no percentage, no party letter, no
//                            action strip and no "See who backs it up", because
//                            relBlock(), actionsFor() and savedKeyFor() all
//                            decline a kind they do not know. The row's door is
//                            the mandate surface that ALREADY EXISTS —
//                            _pdxMandateFocusReform(agendaId), then
//                            _pdxMandateFocus(issueKey), then #agenda — so no new
//                            workshop was invented this pass. The count under the
//                            control now names the OTHER TWO lanes and how many
//                            hits sit in each; the mandate count lives in its own
//                            slot and is added to neither of the others, so no
//                            formal denominator grew by one because a reform was
//                            filed. Switching lanes still does not touch the query
//                            string: input.value and curQ are untouched, and an
//                            expanded group survives the switch.
//   · index.html           — the third control's styling (a dashed violet spine,
//                            the visual form of "proposed", against the solid
//                            spine an issue file gets for a record that exists),
//                            plus the empty state's own block. The mandate bridge
//                            itself is UNCHANGED: MANDATE_ITEMS, _pdxMandateItems,
//                            _pdxMandateFocus and _pdxMandateFocusReform are all
//                            exactly as they were, and this pass only reads them.
//                            Precached as '/', so it travels here.
//   · sw.js                — this note and the bump. The Eye is a runtime entry
//                            rather than a precached one, which is this file's own
//                            long-standing choice for it; the bump renames both
//                            buckets so a warm device cannot pair the new page
//                            styling with the two-lane script or the reverse.
// THE EMPTY LANE IS SHIPPED, NOT HIDDEN. A search no reform answers prints "No
// mandate on file for this search. A mandate is a proposed vehicle — not a vote
// and not a quote." and the lane stays in the control, because empty is the
// honest state and a missing lane is not an answer. Sentence or cards; never both.
// NOTHING ELSE MOVED. No score, no percentage, no tier and no pattern was added
// or changed. A mandate cannot enter formalPatternIndex, Direction Match or Word
// vs Action, and none of the three was touched: every person brief and every
// Direction Match read is byte-identical across a twin boot. issueProfileHtml(key)
// is still the one issue census. Finance is untouched, the DM floors did not move,
// and linking a mandate to a later roll call is deliberately NOT in this pass.
// v115 - ONE BOX, TWO LANES; AND AN EXECUTIVE ACT STOPS PRETENDING IT NEEDED A
// VOTE. Two defects, one cause: a surface answering two different questions into
// one shape. (1) The All-Seeing Eye ranked issue files, core bundles, spotlights
// and name hits into a single list called "Issues & Hot Topics", where a sourced
// investigation and a formal issue file competed on the same score for the same
// slot — so "land pres" could put a wildfire spotlight above Protect Public Lands,
// and a reader looking for the record got a story. (2) A presidential memorandum
// was greeted with "No recorded roll-call votes for this measure yet", which tells
// a reader a vote was due and that this archive is missing it. Both are false, and
// the "yet" promises a tally that will never arrive.
//   · all-seeing-eye.js    - the results carry a two-state control: Formal record
//                            (default) | Public & spotlights. FORMAL holds issue
//                            files and the families they sit in, then people with
//                            a formal row first, then measures; PUBLIC holds
//                            spotlights, quotes and stated positions. Neither lane
//                            can paint the other's rows, cross-link chips
//                            included, and every group is labelled. The index
//                            gained a THIRD category over the issue library where
//                            it had one: every published ISSUE_MAP key is now a
//                            file row addressed at /i/<key>, a core is a FAMILY
//                            row that opens the child shelf, and a spotlight is
//                            neither. NO NEW SCORE: rank(), the comparator and the
//                            personal boost are byte-for-byte v114's, the toggle
//                            re-ranks what was already indexed, and switching lanes
//                            does not touch the query string. NO PARTY SORT: the
//                            party letter is a haystack term and an avatar chip and
//                            is asserted inert by rotating every letter in the
//                            roster and comparing the painted order. A runtime
//                            entry rather than a precached one, and the runtime
//                            cache is keyed to this version, so the bump is what
//                            retires the old copy.
//   · bill-detail.js       - a measure-level isExecutiveAct(m) (measure type
//                            executive_order | proclamation | memorandum, or
//                            chamber executive, mirroring
//                            db/exec-action-types.json and held to it by
//                            scripts/test-exec-vocab.mjs). On such an act the
//                            letterhead's teaching line and the vote section print
//                            the process instead of the absence: one official
//                            issued it, it does not go to a House or Senate roll
//                            call, the formal record is the issuance and any later
//                            revoke/supersede rather than a yea/nay, a later vote
//                            on a related disapproval resolution belongs to that
//                            measure, and standing describes the instrument and not
//                            its effect. The section heading changes with the copy,
//                            because "Roll-call votes" over a paragraph saying
//                            there are none is a promise it cannot keep. A BILL IS
//                            STILL A BILL: a chamber measure whose roll-call file
//                            is genuinely empty goes on saying so, which is the
//                            guard that stops the fix becoming a blanket excuse for
//                            every missing tally in the archive. And where no
//                            plain-language description is on file, the identity
//                            block says "No plain-language summary on file yet"
//                            beside the official source link — nothing is
//                            generated from the title, because a title is what an
//                            act is called and not what its text does.
//   · index.html           - the lane control's stylesheet: the two-button group,
//                            the per-lane count, the sentence saying where the
//                            other half went, and the [data-ic] rail on a file or
//                            family row. Precached as the shell's '/', so it
//                            travels here. STALE HERE IS THE WHOLE REASON FOR THE
//                            BUMP: v114's stylesheet has no rule for
//                            .pdx-eye-lane, so a warm device would receive two
//                            unstyled buttons above the results with no indication
//                            which lane is on — the one-list panel again, with a
//                            control the reader cannot read.
//   · issue-colors.js      - UNCHANGED, and named because the formal lane's file
//                            and family rows now ask it for their tint through the
//                            same styleFor(key, familyLookup) call Door 1's chips
//                            already make. Stale here and the Eye's family row and
//                            the desk's core chip would be answered by two
//                            different tables.
//   · pdx-issue-family.js  - UNCHANGED, and still the single reader of the single
//                            parent table. coreOf(key) is what names a file row's
//                            family, childrenOf(core) is what a family row counts,
//                            and profileUrl(key) is still the one place /i/<key>
//                            is spelled.
//   · alignment-tool.js    - UNCHANGED. No key was added, moved, reparented or
//                            relabelled; ISSUE_MAP is simply now enumerated by the
//                            Eye as well as by the desk.
//   · pdx-issue-profile.js - UNCHANGED. A file row is an address, and this is the
//                            module that answers it.
//   · issue-file.js        - UNCHANGED. The stage a file row opens onto.
//   · issue-file.css       - UNCHANGED. That stage's chrome.
//   · door1-workspace.js   - UNCHANGED, and still the ONE builder.
//                            issueProfileHtml(key) is the one issue census; the
//                            Eye gained no second one, and a family row opens the
//                            child shelf through pdxDoor1Issue exactly as a chip
//                            tap does.
//   · door1-workspace.css  - UNCHANGED. No desk markup moved.
//   · stance-tree.js       - UNCHANGED. The person file's topic tree still groups
//                            by the same coreOf() the new family rows read.
//   · netlify.toml         - UNCHANGED. The /i/* → /index.html 200 rewrite is what
//                            makes a file row's address resolve, and is named here
//                            so a reader of this note can see the whole path.
// No key, no reparent, no mapping, no floor, no weight and no figure of any kind
// moved. No percentage entered either lane, no party string is a sort key in
// either, no new research was written for the summary hole, and Finance, Mandate
// and Direction Match are untouched. issueProfileHtml(key) is still the one issue
// census, and every person brief reads byte-identically with these modules loaded
// and without them.
//
// v114 - THE ISSUE FILE WEARS THE FAMILY'S COLOUR, AND TWO LABELS STOP OVERCLAIMING.
// Three defects in one pass, and they share a cause: a surface printing something
// it had not asked the owning module for. (1) v113 gave /i/<key> a stage, and the
// stage's identity bar was the panel's own grey — so a reader who tapped a green
// child chip on the desk arrived at a file that looked like a different subject.
// (2) lands_preserve is an issue-file-first key whose boundary has been argued in
// writing for a while — in the mapping rationales in consistency.js — while its ⓘ
// still printed "No definition on file yet." (3) The issue overlay's "who the
// record reads" block listed every published position under that heading, including
// rows the formal-pattern index cannot read at all, which is the heading claiming a
// formal read for a member who has none.
//   · issue-file.js        - the identity bar now asks PDXIssueColors.skin(key)
//                            with the family table as its lookup and emits the
//                            shared [data-ic] gate plus the four inline custom
//                            properties — the SAME call and the same string Door 1
//                            already emits on a child chip, so the two surfaces
//                            cannot become two different greens. It still computes
//                            nothing and still holds no palette: a key that lands
//                            on no Core National Issue gets no attribute and the
//                            bar is exactly the bar v113 shipped.
//   · issue-file.css       - spends those properties on three things and no more:
//                            a 4px rail down the left of the block, the title's
//                            ink, and the crumb's arrow and child half (the split
//                            the live crumb under the census already uses). Every
//                            rule is [data-ic]-gated, so the fallback is the
//                            absence of the attribute rather than an "unthemed"
//                            hue. NO HEX IS AUTHORED IN EITHER FILE — the chrome
//                            greys are written in this sheet's own rgb() notation,
//                            which makes a `#` here a palette colour re-typed by
//                            hand. Stale in either file and the reader gets a bar
//                            with a rail and no colour to paint it, or a colour
//                            token nothing spends.
//   · issue-scope.js       - three keys gained a locked entry, each TRANSCRIBED
//                            from the mapping rationales that already argue its
//                            boundary and from nowhere else. lands_preserve: what
//                            a protection kept in place is, why the same acres
//                            read on the resource-development key when they are
//                            opened up instead, and why wildlife and wilderness
//                            measures file here. lands_energy: the other half of
//                            that mirror, and what separates it from Expand
//                            Domestic Energy Production, which takes no view on
//                            who owns the ground. restraint: an order removing
//                            forces from an unauthorised engagement against an
//                            appropriation that sustains one, and why the
//                            who-decides half is war_powers and not this key.
//                            The wall gained the clause that admits a
//                            mapping-site rationale as a source — only where it
//                            argues a boundary, and only with the rows it came
//                            from named in a comment. Nothing else was filled in:
//                            every scope comment over ISSUE_MAP was already
//                            transcribed, and the keys still blank have only
//                            single-measure rationales or nothing argued at all.
//                            Inventing a scope for those is the thing this module
//                            exists to refuse.
//   · issue-page.js        - the "who the record reads" block now lists only rows
//                            PDXConsistency.formalPatternIndex.rowFor(pid, key)
//                            can actually read — one function, the same one the
//                            bands above it are built from, asked directly. A row
//                            still checking (the warm lane has not settled) stays,
//                            because "still looking" is not a claim; a row with
//                            nothing formal on file leaves, and the count of rows
//                            held back is printed under the block in plain words
//                            pointing at each member's own file. The inventory it
//                            counts is unchanged and the warm repaint now repaints
//                            the tally with the block, so the figure cannot go
//                            stale a second behind the rows. Runtime-cached rather
//                            than precached, and the runtime cache is keyed to this
//                            version, so the bump is what retires the old copy.
//   · issue-colors.js      - UNCHANGED, and named because it is the ONE palette
//                            both surfaces now ask. Stale here and the file's bar
//                            and the desk's chip would be answered by two
//                            different tables.
//   · consistency.js       - UNCHANGED, and named twice over: it is where the
//                            transcribed boundary was argued, and formalPatternIndex
//                            is the reader the overlay's heading now defers to.
//   · door1-workspace.js   - UNCHANGED. Still the one builder of the census the
//                            panel mounts, and still the surface the new bar is
//                            asserted to MATCH byte-for-byte on colour.
//   · pdx-issue-family.js  - UNCHANGED. coreOf(key) is the lookup the bar hands the
//                            palette, so the file and the chip resolve one family.
// No key, no reparent, no mapping, no floor, no weight and no figure of any kind
// moved. No percentage, no party and no Direction Match entered any of these
// surfaces. issueProfileHtml(key) is still the one census, and every person brief
// reads byte-identically with these modules loaded and without them.
//
// v113 - /i/<key> OPENS A FILE, NOT THE HOMEPAGE DESK. v112 gave the child ledger
// an address and it resolved correctly — /i/lands_preserve found the key, committed
// the same pick a chip tap commits and painted the same census. What it had no
// destination for: the arrival went through window.pdxDoor1Issue and stopped, and
// that function's job is to paint THE DESK. So a reader who followed a citation
// landed on the homepage — the hero ("Live from the record"), the whole of Door 1's
// chrome ("One desk…", the four ways in, the core shelf), the ledger they were sent
// to below the fold, and a "Next in Door 1" footer under it. /p/<pid> hides that
// shell and opens a file. This bump is the pass that makes /i/ do the same job.
//   · issue-file.js        - NEW SHELL ASSET, and the reason the bump is not
//                            optional. A warm device holding v112 would be served
//                            the new document (index.html is precached as '/', and
//                            the /i/* rewrite is server-side and cannot be stale)
//                            with no panel module on the page — which is v112's
//                            behaviour exactly: the homepage, silently. It is the
//                            stage only: one overlay in the person modal's family
//                            at z-index 50, inserted before #modal-overlay — the
//                            number clears the homepage's own fixed z-50 nav, and
//                            the position keeps the profile modal (also 50) above
//                            it, so a person opened from a ledger row lands on top
//                            and reveals the file again on close. One chrome bar
//                            of identity, one body. It computes nothing.
//   · issue-file.css       - that panel and that chrome bar. It styles NO ledger
//                            markup: every .d1-* rule the body needs is
//                            door1-workspace.css's, already precached, because the
//                            body of the panel is byte-for-byte the string the desk
//                            paints.
//   · pdx-issue-profile.js - the arrival now selects the desk's mode QUIETLY (so
//                            the desk's own open() cannot scroll the homepage into
//                            view), commits the identical pick through
//                            pdxDoor1Issue, and mounts the result in the panel. It
//                            also gained the other half of the address it takes:
//                            restore(), which puts back the surface the reader was
//                            on — the front door for a cold arrival — exactly as
//                            person-file.js answers for /p/. Stale here means the
//                            panel ships with nothing that opens it.
//   · door1-workspace.js   - UNCHANGED, and named because it is still the ONE
//                            builder. issueProfileHtml(key) is what the panel
//                            mounts; there is no second census, no issue-shaped
//                            skin and no fork to drift. Stale here means the panel
//                            finds no builder, answers false, and the arrival falls
//                            back to the desk.
//   · issue-scope.js       - UNCHANGED. The file's chrome carries its ⓘ, and only
//                            where controlHtml() already holds prose for the key.
//   · pdx-issue-family.js  - UNCHANGED. crumb(key) is where the chrome's core →
//                            child caption comes from, and profileUrl(key) is still
//                            the one place the address is spelled.
//   · netlify.toml         - UNCHANGED. The /i/* → /index.html 200 rewrite is what
//                            makes any of this reachable and is named here so a
//                            reader of this note can see the whole path.
//   · index.html           - the one new <script defer>, the one new stylesheet,
//                            and precached as '/'.
// A Door 1 chip tap on / is untouched and still opens the desk in place: that is a
// VIEW of the file, and the desk is where views live. No key, no reparent, no
// floor, no mapping, no weight and no figure moved. The panel's body is asserted
// byte-equal to PDXIssueProfile.html(key), the census contract is asserted equal to
// the desk's, and every person brief and Direction Match read is byte-identical
// with this module loaded and without it.
//
// v112 - /i/<key> IS THE ISSUE FILE. Door 1's issue mode has painted the child
// ledger for a while — the Core → Child crumb, the census, the five formal-pattern
// bands, the measures on file, the honesty lines — and seek, OPEN and a chip tap
// all mount it. None of them produced a citation. There was no /i/lands_preserve,
// so the Eye's own issue hit, the person file's topic tree and every share control
// could point at a person, a bill or a roll call and never at THE ISSUE. This pass
// gives that reading an address, and it does it by EXTRACTING the paint rather
// than building a second one: one function, two doors.
//   · pdx-issue-profile.js — NEW SHELL ASSET, and the reason the bump is not
//                            optional. A warm device holding v111 would be served
//                            /i/lands_preserve by the new rewrite (netlify.toml is
//                            server-side and cannot be stale) with no module on
//                            the page that reads the path — a 200 that shows the
//                            homepage, which is the exact defect the /vote/*
//                            rewrite shipped with and the one this closes.
//   · door1-workspace.js   — issueProfileHtml(key) is the extraction: the scope
//                            sentence, crumb, census, bands, tail, measures and
//                            the formal lane's wall, lifted out of issueDeskHtml
//                            unchanged and exported as PDXDoor1.issueProfile.
//                            Stale here means the new module finds no builder and
//                            mounts nothing at all.
//   · pdx-issue-family.js   — profileUrl(key) stopped being a naming hook that
//                            returned '#issue=' and became the child's address,
//                            /i/<key>. It is now the one place that string is
//                            spelled, and the tree's link is built from it.
//   · stance-tree.js       — the person file's topic tree carries the new door.
//                            The leaf's own tap still opens that person's issue
//                            dossier; the issue file is a SEPARATE control beside
//                            it, so nothing was stolen from the row.
//   · stance-tree.css      — that one control. Nothing restyled.
//   · all-seeing-eye.js    — the issue hit's primary button is now an anchor on
//                            /i/<key>. The tap still opens in place through
//                            pdxDoor1Issue (no reload); what changed is that the
//                            address is now real, copyable and middle-clickable.
//   · index.html           — the one new <script defer>, precached as '/'.
// No new key, no reparent, no floor, no mapping, no weight and no figure moved.
// The extraction is display-only and provably neutral: the desk's painted HTML
// for a key is byte-identical to v111's, and every person brief and Direction
// Match read is byte-identical with this module loaded and without it.
//
// v111 - THE HOMEPAGE RECORD CARD WEARS THE PERSON FILE'S FACE. Card N of 6 in
// the carousel is the first person-file a stranger sees, and it was the last
// surface still painting the old card language: three untyped issue rows and a
// loud Word-vs-Action percent as the hero. The person file had long since moved
// on — coloured issue rows, a 🏛 RECORD badge per characterised row, split counts
// spelled out — so a reader who learned that face on /p/lee arrived at the front
// door and found an earlier version of the same claim, with the percent shouting
// over the record it was derived from. The card now prints THAT face, and prints
// it from the same tokens rather than a second copy of them. FOUR FILES CHANGED
// AND MUST TRAVEL TOGETHER, which is what this bump is for:
//   · hero-showcase.js     — the carousel renderer. Each "what the record points
//                            to" row now carries the shared [data-ic] gate and
//                            the four inline custom properties for its key, and
//                            the badge under it prints the label, the lane word
//                            and the tally the engine already published. It still
//                            owns no judgement: it renders what profile-card.js
//                            hands it and computes nothing.
//   · profile-card.js      — the card's only judgement source. It now passes the
//                            badge payload through beside the side word it always
//                            passed. No pick, no cap and no order changed.
//   · consistency.js       — five declared spans (see scripts/v103-chrome-seams.mjs).
//                            The badge's lane word and its fill rule stopped being
//                            inline at the person file's chip and became named
//                            beside the tone table, and two row builders publish
//                            the fields a caller needs to paint the badge — the
//                            tier's weight, and the two-sided phrase a Split row
//                            was withholding while both numbers sat one field
//                            away. Nothing characterises anything twice.
//   · index.html           — the card's own CSS: the coloured left rail and dot
//                            per row, the badge block (mirroring .pdxst-pat), and
//                            the Word-vs-Action figure demoted to footer type at
//                            every width. Precached as the shell's '/', so it
//                            travels here. STALE HERE IS THE WHOLE REASON FOR THE
//                            BUMP: v110's stylesheet has no rule for the card's
//                            [data-ic] rail or its badge, so a warm device would
//                            receive rows carrying a correct hue that nothing
//                            spends and a badge with no pill — the untyped row
//                            again, silently, and the percent still shouting.
//   · issue-colors.js      — one declared span. styleFor() + isCore() in the one
//                            shape a renderer wants, because three surfaces had
//                            already written that composition privately and the
//                            card needed the SAME token the topic tree prints for
//                            the same key, byte for byte. No fourteenth hue, no
//                            hex, no key: every colour still comes from
//                            CORE_ISSUE_COLORS through getIssueColor().
// DISPLAY ONLY, and the walls are the reason: word-action.js's arithmetic and the
// formal-pattern index are untouched, no new score exists, the carousel is not
// sorted by party, the party letter stays identity on the avatar and colours
// nothing, and a card with nothing to test still prints the honest empty sentence
// instead of a percent. The six showcase cards' issues, side words and
// Word-vs-Action figures are byte-identical across a twin boot.
// v110 - DOOR 1'S ISSUE CHIPS WEAR THE ISSUE'S OWN HUE. v109 gave the issue desk
// a chip for every child key; it painted them as untyped dark pills. Every other
// surface that names an issue — the person file's topic tree, the formal brief
// rows, the compare table, the Eye's issue hits — had been colouring by
// issue-colors.js for a long time, so a reader who had learned Climate, Energy &
// Land as green on /p/lee arrived at Door 1 and found its children in no family
// at all, and an empty child like Keep Public Lands Public read as a failed tap
// rather than as an honest "nothing on file yet". The desk now asks the same
// module they all ask and paints what it is handed. TWO FILES CHANGED AND MUST
// TRAVEL TOGETHER, and three more are named because they are what the new hue is
// asserted to MATCH:
//   · door1-workspace.js   — asks PDXIssueColors.styleFor(key, familyLookup) for
//                            the core chips, the child chips and the crumb, and
//                            emits the shared [data-ic] gate with the four inline
//                            custom properties. No palette, no hex, no per-issue
//                            branch: the module never learns which issue it got.
//   · door1-workspace.css  — spends var(--pdx-ic) / -soft / -wash / -ink. Unlit
//                            is the quiet fill of that hue, lit is the loud one,
//                            and the chips gained a visible keyboard focus ring
//                            (hue-tinted where a hue is present). Stale here
//                            against the new markup is the whole reason for the
//                            bump: v109's stylesheet has no [data-ic] rule, so a
//                            warm device would receive chips carrying a correct
//                            hue that nothing spends — the untyped pill again,
//                            silently.
//   · issue-colors.js      — UNCHANGED. It already resolved a leaf key to its
//                            core's colour, so there is no fourteenth hue and no
//                            core-id lookup was added. Named here because it is
//                            precached and it is now what Door 1's chips depend
//                            on for their colour.
//   · pdx-issue-family.js  — UNCHANGED, and still the single reader of the single
//                            parent table. It is the lookup handed to styleFor(),
//                            which is what guarantees a chip's hue and its place
//                            on the shelf come off one read.
//   · alignment-tool.js    — UNCHANGED. No key moved, no core was added or
//                            merged, no label changed.
//   · stance-tree.js       — UNCHANGED, and the surface the new chips are measured
//                            against: the desk's chip for lands_preserve carries
//                            the identical token the tree's leaf for that key
//                            emits on /p/lee.
//   · index.html           — UNCHANGED; precached as '/' and still loads both.
// Copy is untouched. An empty child still says "0 people have a readable formal
// row on <that key>" and "No measure on file is mapped to this key yet.", still
// carries the menu's own blank-calendar sentence, and is still a themed, tappable
// chip rather than a hidden one. No ledger was repointed: rowFor(pid, key) is
// still the exact key. No percentage, no grade and no party colour reached a chip
// or a crumb, and every person brief and every Direction Match read is
// byte-identical across a twin boot.
// v109 - ONE ISSUE FAMILY: CORES BROWSE, CHILDREN ARE THE PROFILE. The site had
// three groupings of the same issue vocabulary and only one of them read the
// parent table, so twenty-four published keys — the whole public-lands cluster
// among them — had a record ledger you could open by typing its name and no chip
// on any branch. The table in alignment-tool.js is now the whole register (every
// published ISSUE_MAP key has exactly one core), and one new module is the single
// reader of it. FIVE FILES MUST TRAVEL TOGETHER, which is what this bump is for:
//   · pdx-issue-family.js  — NEW SHELL ASSET, and the reason the bump is not
//                            optional: a warm device holding v108 would pair the
//                            new desk and the new tree with no family module at
//                            all. Both are guarded and would fall back, so the
//                            failure would be silent — the lands_* chips simply
//                            absent again — which is the exact bug this pass
//                            closes.
//   · alignment-tool.js    — the parent table itself: 24 keys given a parent,
//                            three core LABELS widened in copy so a core cannot
//                            deny what is filed under it (Climate now says Land).
//                            Precached, and stale here means the new desk asks for
//                            children the old table does not list.
//   · door1-workspace.js   — the issue desk paints its child chips from the table
//                            and prints the core → child crumb under the census.
//   · door1-workspace.css  — that crumb. One new block; nothing restyled.
//   · stance-tree.js       — the person file's topic tree groups by the same
//                            coreOf() the desk uses, instead of reaching the
//                            answer its own way.
//   · index.html           — the one new <script defer>, and precached as '/'.
// No floor, no mapping, no weight, no roster row and no figure of any kind moved.
// Every person brief and every Direction Match read is byte-identical with this
// table and without it — the table names families, it does not read records.
const CACHE_VERSION = 'v123';
const SHELL_CACHE = `politidex-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `politidex-runtime-${CACHE_VERSION}`;

// Same-origin assets that make up the bootable app shell. Kept to files we
// know exist and ship on every deploy — dynamic endpoints are excluded.
// NOTE: the code-split libraries (Chart.js, Leaflet) are intentionally NOT
// precached. They load on demand via window.PDXLazy the first time a feature
// needs them and are then kept by the stale-while-revalidate RUNTIME_CACHE
// below, so they cost nothing on first paint and still work offline after
// their first (online) use.
const SHELL_ASSETS = [
  '/',
  '/css/tailwind.css',
  // The above-the-fold record card. Parser-blocking in index.html, so on a
  // repeat visit these two must come from the cache or they add latency to the
  // very first paint they exist to improve. Both are tiny.
  '/hero-showcase-data.js',
  '/hero-showcase.js',
  // The single receipt, now deferred below the fold as a Say-vs-Do lead-in.
  // Still precached: it is ~2.7 KB for the pair and the band it introduces is
  // one of the first things a returning visitor scrolls to.
  '/hero-receipt-data.js',
  '/hero-receipt.js',
  // Main site CSS, externalized out of index.html (Run 1 perf pass) so it is
  // cached independently and no longer re-parsed with the 7 MB document.
  '/app.css',
  '/app-2.css',
  '/alignment-tool.css',
  '/stance-library.css',
  // The race sheet overlay's stylesheet. Precached with its script below for the
  // same reason the two are shipped together: the sheet is a comparison grid, and
  // an unstyled one is a vertical wall of text that compares nothing.
  '/race-sheet.css',
  // The Door 2 ballot workspace's stylesheet. Same rule as the sheet above and
  // the same reason: the workspace is a rail plus a seat panel, and unstyled it
  // is a list of buttons with no rail and no sense of progress — which is the
  // exact failure the feature exists to fix. Shipped with its script below.
  '/ballot-workspace.css',
  // The Door 1 workspace's stylesheet, for the reason the version log above
  // gives at length: the sheet is what makes the desk two regions instead of a
  // column. Shipped with its script below.
  '/door1-workspace.css',
  // The two-axis elections lens (🔐 safeguards / 📩 access). Tiny, and it renders a
  // section inside the profile and a header inside the Stance Library — both of which
  // are precached — so leaving it to the runtime cache would mean the first offline
  // profile view silently dropped the two-axis read.
  '/ballot-axes.css',
  // Additive mobile performance & flow polish layer.
  '/mobile-polish.css',
  // App-shell layout-stability hardening. Precached because it is the first
  // script in <body> and installs the shared scroll-lock seam that every modal
  // in the app now routes through — an offline boot must not skip it.
  '/pdx-stability.js',
  // First run — the module that ranks the homepage for a stranger: it runs the
  // two cold-start paths behind the hero CTAs and flips the one attribute that
  // defers the second tier until a real task is finished. Precached rather than
  // left to the runtime cache because an offline boot is exactly the slow, bad
  // connection where a first-time visitor most needs the ranked homepage. Its
  // CSS is not listed here — those rules are inline in index.html (above-the-fold
  // critical, and the render-blocking sheet budget is full), so they ship with
  // the '/' entry at the top of this list.
  '/first-run.js',
  '/say-vs-do.css',
  '/issue-view.css',
  '/journey.css',
  // Stance data is split (see scripts/split-stances.mjs): the CORE chunk boots the
  // app shell offline; the long-tail EXT chunk is left to the runtime cache
  // (stale-while-revalidate) so it costs nothing on first paint but still works
  // offline after its first load.
  '/politician-stances-core.js',
  // Tiny on-demand data loader (Run 3 perf). Precached because it is the boot
  // path that fetches the large Spotlight / accountability / cmp-detail modules
  // when they are actually needed; those modules themselves stay on the runtime
  // stale-while-revalidate cache so they cost nothing on first paint.
  '/pdx-lazy-data.js',
  // Deep-link resolution for shared links (?bill=/?receipt=/?record=/?rank= and
  // the edge-resolved /vote/… address). Tiny, and it runs before every feature
  // module, so a shared link opened offline still lands on the right record.
  '/share-links.js',
  // Roster data (Run 2 perf: extracted from index.html). Precached because the
  // home directory/search needs it to boot; the larger Spotlight/accountability
  // data modules are left to the runtime stale-while-revalidate cache.
  '/cmp-data.js',
  '/stance-helpers.js',
  '/alignment-tool.js',
  // The issue family table. Tiny, and precached WITH alignment-tool.js rather
  // than left to the runtime cache because it is that file's parent table with an
  // API on it: the Door 1 child chips and the person file's topic branches are
  // both built from it, and a device that had one file and not the other would
  // quietly group issues two different ways.
  '/pdx-issue-family.js',
  // The issue file's address, /i/<key>. Precached WITH pdx-issue-family.js
  // because that module is where the address string is spelled (profileUrl) and
  // this one is what reads it back off location.pathname: a device holding one
  // and not the other would either paint a link to a path nothing adopts, or
  // adopt a path no surface links. Tiny, and it paints nothing itself — the
  // ledger it mounts is door1-workspace.js's, which is already on this list.
  '/pdx-issue-profile.js',
  // The stage that address opens on, and its stylesheet. Both travel with the
  // module above for the reason the note at the top of this file gives: a device
  // holding the address module and not the panel is a device that resolves
  // /i/<key> correctly and then lands the reader on the homepage — the exact
  // defect the v113 pass closes. The sheet is on this list rather than left to
  // the runtime cache because an unstyled overlay is a full-bleed block of loose
  // text ON TOP of the page, which is worse than no overlay at all.
  '/issue-file.js',
  '/issue-file.css',
  // Issue color tokens. Tiny, and precached with alignment-tool.js so an offline
  // repeat visit keeps issues colour-coded instead of falling back to slate
  // everywhere, which would read as "nothing is a core issue".
  '/issue-colors.js',
  // What an issue key covers, in the words its scope was locked in. Precached with
  // alignment-tool.js and issue-colors.js because it reads the same vocabulary and
  // is the same order of magnitude, and because the control it powers is rendered
  // by the profile brief — a shell surface — rather than by anything lazy.
  '/issue-scope.js',
  // "Compare field for this seat" — one office, the whole field, ranked by the
  // formal record against the visitor's own positions. Precached alongside
  // alignment-tool.js because it is that engine's ballot-side surface: the entry
  // button its three hosts render returns nothing at all when this file is
  // missing, so an offline repeat visit would lose the feature without a trace.
  '/race-sheet.js',
  // Door 2's ballot workspace: the seat rail, the running "N of 6 decided"
  // count, and the one-seat-at-a-time panel that carries the field and the pick.
  // Precached with race-sheet.js because it reads that file's model helpers for
  // every fact it prints — offline with one and not the other, the mount paints
  // nothing at all.
  '/ballot-workspace.js',
  // Door 1's workspace: the mode rail, the one open desk, and the view strips
  // on the four older Door 1 surfaces. Precached with the modules it reads —
  // claim-check.js, issue-view.js, consistency.js, bill-detail.js and
  // person-file.js are all already on this list — because it prints no fact of
  // its own: offline with the desk and without them, every mode paints its own
  // honest "not loaded on this page" line and the reader gets a working rail
  // over four empty modes.
  '/door1-workspace.js',
  '/stance-library.js',
  '/ballot-axes.js',
  '/voting-record.js',
  '/say-vs-do.js',
  // Unified Say-vs-Do consistency (reconciles curated receipts + voting record
  // into one verdict). Precached with the shell so every surface can render the
  // shared verdict offline after first load.
  '/consistency.js',
  '/issue-view.js',
  '/journey.js',
  // The one share resolver every surface now asks (window.PDXShareAnywhere).
  // Precached because it renders the share control on the mobile compact sheets,
  // the share sheet and the search action strips; without it those controls fall
  // back to a link-only share, which is a visible loss of function on a repeat
  // visit. Tiny, and it depends on nothing being cached alongside it.
  '/share-anywhere.js',
  // The whole-person record card (window.PDXProfileCard) — the top share tier.
  // Precached alongside the resolver above for exactly the same reason: without
  // it every share on a repeat visit silently drops to a single-receipt image,
  // which is the anecdote the card was built to replace. Its portrait comes from
  // /.netlify/images, which this worker never intercepts — so offline the card
  // draws its monogram instead of a face, and everything else on it is unchanged.
  '/profile-card.js',
  // The profile ordering layer (window.PDXProfileSpine) and its stylesheet.
  // Precached together: without the script a repeat visitor gets the profile in
  // its unordered build order, and without the stylesheet the stage rails,
  // drawers and first-screen brief render unstyled. Both are small, and neither
  // has a dependency that needs caching alongside it.
  '/profile-spine.js',
  '/profile-spine.css',
  // ⚖️ Word vs Action (window.PDXWordAction) and its stylesheet — the primary
  // accountability read on every profile. Precached for the same reason as the
  // spine: without the script the profile silently loses its main section and
  // falls back to leading with the pledge-only number, and without the
  // stylesheet the tier ladder and the joined word/action rows render as
  // unstyled lists. Its dependencies (consistency.js, stance-helpers.js,
  // voting-record.js) are read through guarded optional lookups, so a cached
  // copy is useful on its own.
  '/word-action.js',
  '/word-action.css',
  // 🏛 THE BRIEF'S OTHER TWO FACT SOURCES. word-action.js above is the letterhead;
  // these are two of the four readers it asks before it is allowed to print an
  // absence. formal-index.js publishes the shipped per-member act counts and the
  // hand-reviewed empty-file notes (PDXFormalIndex.has / .measures / .emptyNote);
  // person-file.js publishes the rows the edge wrote into this document's own
  // header (PDXPerson.crawlRecord) and owns the person-file surface itself. Both
  // are read through guarded optional lookups, so a cached copy is useful on its
  // own — but a MISSING copy is the failure mode that matters here: it does not
  // degrade to "cannot tell", it degrades to "nothing answered", which is the
  // door the empty-file paragraph comes through. Precached with the module that
  // reads them so the brief's inputs and the brief itself can never be a version
  // apart. person-file.css ships with its script: the crawl header and the
  // kicker it styles are display-controlled blocks, and unstyled they are loose
  // text above the fold.
  '/formal-index.js',
  '/person-file.js',
  '/person-file.css',
  // 🌳 The topic tree of stances (window.PDXStanceTree) and its stylesheet — the
  // profile's browse-all-stances surface, mounted directly under Word vs Action.
  // Precached with it for the same reason: without the script the profile loses
  // the only surface that lists every tracked issue, and without the stylesheet
  // the branches render as an unstyled nest of buttons in which a pattern-only
  // row is indistinguishable from a stated position — the one distinction this
  // surface is not allowed to lose. Everything it reads (PDXConsistency,
  // PDXIssueColors, CORE_NATIONAL_ISSUES) is a guarded optional lookup.
  '/stance-tree.js',
  '/stance-tree.css',
  // 🧩 The dossier join layer (window.PDXDossier) and its stylesheet — the single
  // place that threads one issue through word → action → evidence → issue and
  // spotlight → outcome, and the source of the compact Spotlight rail and digest.
  // Precached alongside word-action because they are two halves of one reading:
  // without the script, Connecting the Dots falls back to three-step rows and the
  // Spotlight block re-expands to its full-card layout, so a repeat visitor would
  // get a materially different profile offline than online. Everything it reads is
  // a guarded optional lookup, so a cached copy is useful on its own.
  '/profile-dossier.js',
  '/profile-dossier.css',
  '/coverage.js',
  // Coverage gaps. Cached alongside coverage.js for the same reason: without it a
  // repeat visitor offline sees a Word vs Action panel that quietly stops saying
  // what we have not documented, which reads as fuller coverage than we have.
  '/gaps.js',
  // The coverage inventory line. Cached with gaps.js for the same reason gaps.js is
  // cached with coverage.js: without it a repeat visitor offline gets a record strip
  // and a Direction Match card with no statement of how much is actually on file,
  // which reads as fuller coverage than we have.
  '/inventory.js',
  // 🗂️ The record card — the share primitive. Cached for a reason the other
  // entries do not have: this is the module a reader arrives THROUGH. Someone taps
  // a shared /p/<pid> link on a train, the shell serves from cache, and if
  // record-card.js is missing the card they were sent is the one thing on the page
  // that does not render. Its stylesheet ships with it because an unstyled card
  // still says every sentence but loses the visual equality of the five blocks —
  // and a card where one block looks like the verdict is a card that reads as a
  // grade.
  '/record-card.js',
  '/record-card.css',
  // 🔗 The person link primitive. Cached with the shell for the same reason
  // record-card.js is: it is a module the reader arrives THROUGH. Every card, row
  // and cell that names a politician asks it for href="/p/<canonicalPid>", so
  // without it an offline repeat visitor gets a list of names that cannot be
  // opened in a new tab, cannot be copied as an address, and — for the retired
  // handful — would have no canonical id to advertise at all.
  '/person-link.js',
  '/manifest.json',
  '/assets/icon.svg',
  '/assets/icon-maskable.svg'
];

// Minimal offline page, used only if the cached shell itself is unavailable.
const OFFLINE_FALLBACK = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PolitiDex — Offline</title>
<style>
  html,body{height:100%;margin:0}
  body{background:#0a0f1e;color:#e5e9f0;font-family:system-ui,-apple-system,'Barlow',sans-serif;
       display:flex;align-items:center;justify-content:center;text-align:center;padding:24px}
  .box{max-width:22rem}
  .mark{width:72px;height:72px;border-radius:18px;background:#c0152a;color:#fff;font-weight:900;
        font-size:34px;line-height:72px;letter-spacing:-2px;margin:0 auto 20px;
        font-family:'Arial Black',Arial,sans-serif}
  h1{font-size:1.35rem;margin:0 0 .5rem}
  p{color:#9aa4bf;line-height:1.5;margin:0 0 1.25rem;font-size:.95rem}
  button{background:#c0152a;color:#fff;border:0;border-radius:10px;padding:.7rem 1.4rem;
         font-size:1rem;font-weight:600;cursor:pointer}
</style></head>
<body><div class="box">
  <div class="mark">PX</div>
  <h1>You're offline</h1>
  <p>PolitiDex can't reach the network right now. Reconnect to load the latest — your saved team and evidence are still on this device.</p>
  <button onclick="location.reload()">Try again</button>
</div></body></html>`;

// ─── Install: precache the shell (resilient — one missing file won't abort) ─
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.all(SHELL_ASSETS.map(async (url) => {
      try {
        const res = await fetch(url, { cache: 'reload' });
        if (res && (res.ok || res.type === 'opaque')) await cache.put(url, res.clone());
      } catch (_) { /* asset unavailable at install time — fetched at runtime */ }
    }));
    await self.skipWaiting();
  })());
});

// ─── Activate: drop caches from previous versions, take control ─────────────
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, RUNTIME_CACHE]);
    const names = await caches.keys();
    await Promise.all(names.map((n) => (keep.has(n) ? null : caches.delete(n))));
    await self.clients.claim();
  })());
});

// Allow the page to trigger an immediate update when a new worker is waiting.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || (event.data && event.data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

// ─── Fetch: route by request kind ───────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only GET is cacheable; everything else goes straight to the network.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Voting-record offline packs are what let a previously-viewed member's record
  // render with no network, so — unlike the rest of /api/* — they are cached.
  // Their own handler, not handleStatic: the pack URL carries a mapping version
  // now, so the request the page makes and the entry that answers it offline are
  // not the same URL. Must be checked BEFORE the /api/ skip below.
  if (url.origin === self.location.origin) {
    const packHit = VR_PACK_RE.exec(url.pathname);
    if (packHit) {
      event.respondWith(handleVrPack(req, packHit[1]));
      return;
    }
  }

  // Dynamic backend — never intercept. Keeps live data live and lets the
  // app's own offline handling deal with failures.
  if (url.origin === self.location.origin &&
      (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/'))) {
    return;
  }

  // Full-page navigations: stale-while-revalidate with offline fallback.
  if (req.mode === 'navigate') {
    event.respondWith(handleNavigate(req));
    return;
  }

  // Static assets (same-origin and CDN): stale-while-revalidate.
  event.respondWith(handleStatic(req));
});

// ─── Voting-record offline packs ────────────────────────────────────────────
// Matches both forms the pack is reachable at:
//   /api/voting-record/member/<pid>/pack                  ← what the page asks for
//   /api/voting-record/member/<pid>/pack/m825-e21bb4b7021e ← what it redirects to
// Capture 1 is the pid AS IT APPEARS IN THE PATH (still percent-encoded), which is
// what the cached entries are keyed by, so it is compared without decoding.
const VR_PACK_RE = /^\/api\/voting-record\/member\/([^/]+)\/pack(?:\/([^/]+))?$/;

// NETWORK FIRST, CROSS-VERSION CACHE FALLBACK — and the inversion is the point.
// This used to be stale-while-revalidate, which returned the cached copy
// immediately and refreshed behind it. That is the right policy for an asset whose
// old version is merely older; it is the wrong one for an artifact whose old
// version can be WRONG, which a pack built from a retired measure→issue mapping is.
// A device with a warm cache and a failing live endpoint fell back to the pack and
// drank the stale one — the residual hole after the client-side guard in
// voting-record.js stopped a stale pack from overwriting a warm live row.
//
// So the network is asked first. The page requests the unversioned URL and the
// server answers 302 → the current version, which costs the warm path a second
// request; that is affordable here and nowhere else, because the pack fetch is
// fire-and-forget (see the note over fetchPack in voting-record.js — the live read
// is what renders, and the pack fetch exists to fill this cache).
//
// WHAT IS STORED is the VERSIONED url the redirect landed on, never the
// unversioned one the page asked for. Storing the unversioned URL is what made a
// stale pack reachable in the first place; there is deliberately no entry at that
// key any more, which is also why every online fetch reaches the network.
//
// OFFLINE, ANY VERSION IS THE RIGHT ANSWER. Neither hop can be reached with no
// network, so the newest pack cached for this member is served whatever mapping
// version it was built from — including an entry left at the pre-upgrade
// unversioned URL. That is not a compromise: a pack is the offline fallback, and
// the version that existed when the device last had a network is the only honest
// thing it could have. The live read, when it comes back, outranks it — the client
// guard sees to that, and it is untouched by any of this.
// The Function's own sentinel for "the mapping table could not be read" (see
// MAPPING_VERSION_UNKNOWN in netlify/lib/vr-pack.ts). Recognised from the response
// header when it is there and from the URL segment when it is not, so a proxy that
// strips the header cannot turn the refusal below into a cache write.
const VR_PACK_UNKNOWN = 'm0-unknown';

function isUnknownPackVersion(res, finalUrl) {
  let header = '';
  try { header = res.headers.get('x-pdx-mapping-version') || ''; } catch (e) { header = ''; }
  if (header) return header === VR_PACK_UNKNOWN;
  let p = '';
  try { p = new URL(finalUrl, self.location.origin).pathname; } catch (e) { return false; }
  return (VR_PACK_RE.exec(p) || [])[2] === VR_PACK_UNKNOWN;
}

async function handleVrPack(req, pid) {
  const cache = await caches.open(RUNTIME_CACHE);

  let res = null;
  try { res = await fetch(req); } catch (e) { res = null; }

  if (res && res.ok) {
    // res.url is the URL the response actually came from — the versioned one,
    // after the redirect. Falls back to the request URL if a browser ever hands
    // back an empty url (opaque responses do; a same-origin JSON GET does not).
    const finalUrl = res.url || req.url;
    // A PACK OF NO KNOWN MAPPING IS SERVED AND NOT STORED. The Function answers
    // under VR_PACK_UNKNOWN when it could not read the mapping table, and it
    // neither writes nor reads a blob in that state; the Cache API ignores
    // `no-store`, so the same refusal has to be spelled here. Storing it would be
    // the worse half of the bargain twice over: the body may carry no issue tags
    // at all (the builder reads the table that just failed), and prunePacks would
    // drop this member's good versioned entry in favour of it — turning a
    // momentary database blip into a lastingly wrong offline pack.
    if (!isUnknownPackVersion(res, finalUrl)) {
      try {
        await cache.put(new Request(finalUrl, { headers: { accept: 'application/json' } }), res.clone());
        await prunePacks(cache, pid, finalUrl);
      } catch (e) { /* a cache write failure must not fail the fetch */ }
    }
    return res;
  }

  const cached = await newestCachedPack(cache, pid);
  if (cached) return cached;

  // Nothing cached and network failed — same benign 504 handleStatic returns, so
  // fetchPack's catch turns it into "no pack for this member" rather than an error.
  return res || new Response('', { status: 504, statusText: 'Offline' });
}

// Every cached pack entry for one member, any version, plus a pre-upgrade entry at
// the bare /pack path if one is still there.
async function cachedPackKeys(cache, pid) {
  const base = `/api/voting-record/member/${pid}/pack`;
  const keys = await cache.keys();
  return keys.filter((k) => {
    let p = '';
    try { p = new URL(k.url).pathname; } catch (e) { return false; }
    return p === base || p.indexOf(base + '/') === 0;
  });
}

// The newest of them, by the pack's own generatedAt rather than by cache order —
// which the Cache API does not expose, and which would be the wrong question
// anyway: what is wanted is the freshest RECORD, not the most recently written
// entry. A body that will not parse is skipped rather than trusted.
async function newestCachedPack(cache, pid) {
  const keys = await cachedPackKeys(cache, pid);
  let best = null, bestAt = '';
  for (const k of keys) {
    const res = await cache.match(k);
    if (!res) continue;
    let at = '';
    try { at = String((await res.clone().json()).generatedAt || ''); } catch (e) { at = ''; }
    if (!best || at > bestAt) { best = res; bestAt = at; }
  }
  return best;
}

// Drop this member's other pack versions once a newer one is stored. Cache hygiene
// only — it is NOT how a retired pack is invalidated. Invalidation is the version
// in the URL: an entry nobody requests cannot be served, whether or not this
// sweep ever runs. Which is why it is allowed to fail silently.
async function prunePacks(cache, pid, keepUrl) {
  const keep = new URL(keepUrl, self.location.origin).pathname;
  const keys = await cachedPackKeys(cache, pid);
  for (const k of keys) {
    let p = '';
    try { p = new URL(k.url).pathname; } catch (e) { continue; }
    if (p !== keep) await cache.delete(k).catch(() => {});
  }
}

// ─── Navigations: one cached document per ADDRESS, never one for all of them ──
// THE BUG THIS REPLACED, STATED AS THE SYMPTOM IT SHIPPED WITH.
//
// /p/khanna's first HTML printed "U.S. Senator · Utah" and Mike Lee's
// formal-record rows, then flipped to Ro Khanna once the roster loaded. Nothing
// was wrong with the document the CDN served: share-preview.ts had built Khanna's
// header correctly. The wrong document was served from HERE.
//
// The old policy above did two things, and each one was half the defect:
//
//   const cached = (await cache.match(req)) || (await cache.match('/'));
//   if (res && res.ok) cache.put('/', res.clone());
//
//   1. IT WROTE EVERY DOCUMENT TO ONE KEY. A navigation to /p/lee fetched Lee's
//      document — crawl header and all — and stored it as '/'. So the '/' entry
//      stopped being the homepage and became "the last person file this device
//      looked at". The homepage itself then served Lee's header too.
//   2. IT READ THAT KEY FOR EVERY ADDRESS. /p/lee was never stored under its own
//      URL, so cache.match(req) always missed and the '/' fallback always
//      answered. Every person address on the device was served whichever person
//      file was fetched last.
//
// Phase B gave 800 person addresses 800 distinct documents. This function handed
// out one of them under all 800 URLs — which is the same duplicate-content problem
// Phase B set out to fix, with a worse failure mode: Google and a slow phone read a
// real senator's office and a real senator's record rows on somebody else's
// address. A unique URL is not a unique document if a cache serves one body for
// all of them.
//
// WHAT REPLACES IT. A cached document is keyed by the ADDRESS IT WAS GENERATED AT,
// which is the only thing that makes two navigations interchangeable now that the
// edge writes per-person bodies:
//
//   · /p/<pid>          → its own key. A repeat visit to the SAME person is still
//                         served instantly from the cache (that is the phone
//                         latency win the old policy was written for, and it is
//                         kept) and can only ever be that person's document.
//   · / and /index.html → the '/' key, and ONLY these two write it. The homepage
//                         entry is the plain homepage document again.
//   · everything else   → NO KEY. /issue/<slug>, /vote/…, /b/…, /locker and any
//                         address carrying a query the edge rewrites the head for
//                         boot from the '/' shell as they always did, and never
//                         write to it. A Spotlight's title must not become the
//                         homepage's the way Lee's header did.
//
// A person address with no entry of its own goes to the NETWORK rather than
// borrowing '/'. Correct identity in the first bytes is the whole point of the
// document; a fast paint of the wrong person is the thing being fixed. Only when
// the network fails does '/' stand in — and '/' names nobody, so it is a bootable
// shell with an empty crawl seam, which index.html's inline guard leaves generic.
//
// THE COST OF THAT, NAMED, because it is the one thing this policy is slower at.
// A cold person address on a warm device used to paint instantly from '/'; it now
// waits for its own document. That is not a regression against any correct
// behaviour — the instant paint was of the WRONG person — and it is not worse than
// the no-service-worker baseline, where the same navigation waits for the same
// bytes. The latency win the old policy was written for is kept where it is
// legitimately available: a REPEAT visit to the same person (a bookmark, a shared
// link opened twice, a back-navigation) is served from that person's own entry
// with no network wait at all. A bounded race between the network and the generic
// shell was considered and left out deliberately: it would put a timing-dependent
// branch on the app's most critical path to buy a faster paint of a document that
// names nobody.
const PERSON_NAV_RE = /^\/p\/([A-Za-z0-9_]+)\/?$/;

// How many person documents to keep. Each is the whole ~2 MB app shell, so this is
// a storage decision and not a correctness one: correctness is the KEY, and an
// entry that was pruned is simply refetched. Small enough to be polite on a phone,
// big enough that moving between a handful of files stays instant.
const PERSON_DOC_LIMIT = 4;

// The cache key for a navigation, or '' for "serve from the shell, store nothing".
function navDocKey(url) {
  if (!url || url.origin !== self.location.origin) return '';
  const person = PERSON_NAV_RE.exec(url.pathname);
  if (person) return '/p/' + person[1];
  // The plain homepage document, and nothing wearing a query the edge rewrites for
  // (?p=, ?issue=, ?bill=, ?rank=, ?receipt=, ?record=, ?views= all change the head).
  if ((url.pathname === '/' || url.pathname === '/index.html') && !url.search) return '/';
  return '';
}

// Keep the newest few person documents. cache.keys() is insertion-ordered, so the
// front of the list is the oldest. Hygiene only, and allowed to fail silently: a
// document that is still here is still keyed to its own address, so an over-full
// cache is a quota question and never a wrong-person question.
async function prunePersonDocs(cache, keepKey) {
  const keys = await cache.keys();
  const docs = keys.filter((k) => {
    let p = '';
    try { p = new URL(k.url).pathname; } catch (e) { return false; }
    return PERSON_NAV_RE.test(p);
  });
  for (let i = 0; i < docs.length - PERSON_DOC_LIMIT; i++) {
    let p = '';
    try { p = new URL(docs[i].url).pathname; } catch (e) { continue; }
    if (p.replace(/\/$/, '') === keepKey) continue;
    await cache.delete(docs[i]).catch(() => {});
  }
}

async function handleNavigate(req) {
  const cache = await caches.open(SHELL_CACHE);

  let url = null;
  try { url = new URL(req.url); } catch (e) { url = null; }
  const key = navDocKey(url);
  const isPerson = key.slice(0, 3) === '/p/';

  const network = fetch(req).then(async (res) => {
    if (res && res.ok && key) {
      try {
        await cache.put(key, res.clone());
        if (isPerson) await prunePersonDocs(cache, key);
      } catch (e) { /* a cache write failure must not fail the navigation */ }
    }
    return res;
  }).catch(() => null);

  // Stale-while-revalidate, but only against this address's OWN entry.
  const cached = key ? await cache.match(key) : null;
  if (cached) {
    network; // fire-and-forget background refresh
    return cached;
  }

  const res = await network;
  if (res) return res;

  // Offline, with no document of this address's own. '/' is the app shell and it
  // names nobody — the honest stand-in for any address, and the one fallback that
  // cannot claim to be a person we have not resolved.
  const shell = await cache.match('/');
  if (shell) return shell;

  return new Response(OFFLINE_FALLBACK, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// Stale-while-revalidate: return cache immediately when present, and update
// the cache in the background. Falls back to network when not yet cached.
async function handleStatic(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const shell = await caches.open(SHELL_CACHE);

  const cached = (await shell.match(req)) || (await cache.match(req));

  const network = fetch(req).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) {
      cache.put(req, res.clone()).catch(() => {});
    }
    return res;
  }).catch(() => null);

  if (cached) {
    network; // fire-and-forget background refresh
    return cached;
  }

  const res = await network;
  if (res) return res;

  // Nothing cached and network failed — surface a benign, non-breaking error.
  return new Response('', { status: 504, statusText: 'Offline' });
}
