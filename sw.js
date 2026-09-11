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
// v140 - ONE TESTED SET, PRINTED TWICE OR NOT AT ALL. The letterhead chip and the
// mid-page Word vs Action section report the same finding about the same person, a
// screen apart, and they were reporting two different sizes of it: on /p/lee the
// chip read "84% - 5 of 14 tested" beside the name while the section below read 72%
// over 15 of 26. Neither figure was invented. Each was a faithful print of a read
// taken at a different moment - this ledger grows during a page's life as the
// roll-call record and the lazy data bundles land - and that is exactly what made
// the pair a lie, because a reader cannot see which tick a number came from. Two
// "tested" counts on one page is a worse defect than the missing denominator the
// chip was given one for.
//
// So the figure is a thing now and not a habit repeated at each surface. One
// function answers, for one pid: the percentage, the tested count, the eligible
// count, the outcome token, and the one fraction sentence those two integers make.
// The chip and the section both print THAT object, in the visible text and in the
// accessible name, which is the same sentence and not a shortened one. Where both
// halves cannot be said the chip is absent - never a smaller, secret set with a
// percentage still sitting on top of it. And both surfaces now share the repaint
// contract the consistency ring already had (every arrival event, an alias-tolerant
// pid match, one reconciling paint), because two surfaces printing one object still
// drift if they hear about the arrival at different times.
//   · word-action.js       - the shared figure and the shared repaint, the chip, and
//                            three narrow spans in the section that read and stamp
//                            them. Both files' new spans are declared seams, so
//                            everything outside them is still compared byte for byte.
//   · word-action.css      - unchanged this pass; the chip's own skin already had a
//                            slot for the denominator.
// No floor moved. read(), scopedRead(), Direction Match, the tier weights, the
// publication floor and the pair rules are all outside the seams and read
// byte-identically: a twin boot over the whole corpus returns the same ledger and
// the same DM figure for every member. The public lane, finance, the Eye, Door 2
// and the corpus sweep were not touched.
//
// v139 - THE EYE FOUND THE RIGHT PERSON TWICE. A reader who typed "chew" got two
// rows for one representative, and the pass that collapsed them landed in the two
// lanes that mint rows: the people lane and the receipt lane both resolve through
// PDXCanonIds. But the panel has six other emitters that carry a person's id, and
// none of them asked whose id it was - the related chips under a row, the
// Connections map's teammate nodes and its "people near your saved work" siblings,
// the ranked rows of an issue answer, and the polId stored inside a saved receipt.
// Eighteen retired ids are ISSUE_STANCE_DATA keys, so the panel could still print
// `scott_chew` beside the one Chew row it had just kept - and the collapse had
// quietly taken that row's only chip with it, because his curated stance block is
// filed under the stub's name slug and the chip builder read the table by raw key.
//   So the panel now asks the same question at every edge, and asks it of the
// modules that already own the answer.
//   . canonPid()        - PDXPersonLink.pid, then PDXProfilePid: the id a row
//                         PRINTS is the id its handler OPENS, at every emitter,
//                         and it fails open on a page where neither module ran.
//   . stanceListFor()   - _resolveStanceList (stance-helpers.js), the app's own
//                         owner of "whose curated block is this", rather than a
//                         second copy of the alias walk living here.
//   . personDoor()      - ONE person door for the whole panel: PDXPersonLink.open
//                         then PDXPerson.open then showProfile, with the id
//                         resolved BEFORE the hop. A people row, a judge row, a
//                         related chip, a ranked row and a saved receipt all go
//                         through it, so a click and an Enter can no longer
//                         disagree about who they meant.
//   A PERSON HIT OPENS THE PERSON FILE. Not a medium card, not a summary that has
// to be tapped again: /p/<pid>, through the same funnel the row's own href hands
// its clicks to. Issue and bill hits keep the doors they already had - /i/<key>
// and /b/<sitting>/<number> - and no third address shape was invented. The
// overlay's chrome is unchanged: query, results, one clear close. It still paints
// no scrim and takes no scroll lock, so it stays a finder rather than a second
// Door 1 stack behind itself.
//   THE VISITOR'S OWN LISTS ARE READ, NOT REWRITTEN. My Team and the saved-people
// list hold whatever id the surface that made the pick happened to spell,
// including a retired one, and they are resolved on the way out instead of
// migrated in place - so the map is of people while the store stays the reader's,
// and the "on your team" badge and the "Add to My Team" label cannot start
// disagreeing. Canonicalisation happens where this panel prints or opens an id.
// Bumped because all-seeing-eye.js is a RUNTIME cache entry rather than a
// precached one, and the runtime cache NAME carries CACHE_VERSION: without a move
// a returning reader keeps the copy of the eye that prints the retired id, and
// every sentence above is true only of a first-time visit. The eye is the only
// shipped file this pass moves, so a warm device that has not taken the new one
// simply behaves as it did before - there is no half-landed state to ship. No new score, no
// party sort, no floor, mapping, weight, verdict or pack TTL moved, nothing
// interactive is nested, and the twin boot is byte-identical on Direction Match
// and on every formal-record tier.
//
// v138 - THE BILL TITLE IS A DOOR TO THE BILL FILE. Four surfaces printed a
// measure identity as text and only as text: the issue dossier's Official Record
// cards, its "which measures this came from" roll-up, the Official Record proof
// line on a person file, and the ledger's measure cards on /i/<key>. A reader who
// had just been told what H.B. 400 did on school absenteeism could see "H.B. 400"
// and had no way to open it — the whole instrument, all of its members, all of its
// mappings, the vehicle and the stowaway, the roll calls. The education path ended
// at the person-issue pair.
//   So every one of those identities is now the door, and the door is the SHIPPED
// one: data-pdxbill-open → PDXBillDetail.open(number, sitting) on the person file,
// window.pdxDoor1Bill(number, sitting) on the issue desk. No new address shape, no
// new nav item, no new score and no new fetch on the person-file critical path —
// the panel these open is the same panel #bill/<sitting>/<number> and /b/<sitting>/
// <number> have always resolved to.
//   THE SITTING NOW TRAVELS WITH THE NUMBER, which was a real defect on the state
// half of the record rather than a tidiness point: "H.B. 208" names a different
// bill in every Utah general session and "H.R. 22" names a different one in every
// congress, and the issue desk was handing the panel a bare number. Two readers
// own the two shapes the sitting arrives in — window.pdxBillSit for a voting-record
// item (consistency.js), PDXBillDetail.sittingOf for an index card — and the desk
// asks them rather than copying either.
//   THE ROW AROUND THE IDENTITY STILL MEANS WHAT IT MEANT. Tapping a dossier card
// face opens the measure explainer; tapping a roll-up line opens the same
// explainer; tapping a proof line opens that one roll call. Only the number and
// the title changed destination. The delegated gateway therefore tests the bill
// door FIRST — closest() walks outward, so the innermost control has to be checked
// first or the row would keep winning every tap on its own title.
//   AND NOTHING INTERACTIVE IS NESTED. Where a real <button> is legal it is one
// (the dossier card's <summary>, which already held "See all N readings"; the
// ledger card's <li>, which already held "Who voted on it"). The roll-up row could
// not hold one — an interactive element inside another makes the parser close the
// outer one early and drops every following span out of the row — so that row
// follows the shape the stance rows already use: the <li> keeps the door attribute
// and stays a pointer target, while role, tabindex and the accessible name move
// onto the two spans that are the actual controls, the identity and the ↗.
//   A MISSING BILL FILE IS SAID, NOT SUBSTITUTED. The old issue-desk fallback
// opened the bills INDEX when the panel was absent, so a reader who asked for one
// measure got a list of all of them. Both openers now mark the control itself —
// "No bill page on file", once, in place — and navigate nowhere.
// Bumped because the doors are in precached shell files (consistency.js,
// door1-workspace.js, door1-workspace.css) and a warm device would otherwise keep
// serving identities that are not doors. No floor, mapping, weight, verdict,
// Direction Match read or Door 2 holder moved; the twin boot is byte-identical.
//
// v137 - DOOR 2 NAMES THE RIGHT HUMANS. A Layton / Davis County reader resolved
// three of six seats: both "U.S. Senate · Utah" rows and "Governor · Utah"
// printed "No record on file yet — we'd rather leave this blank than name the
// wrong person" over Mike Lee, John Curtis and Spencer Cox, three people with
// full files one tap away at /p/lee, /p/curtis and /p/cox. That sentence is an
// admission about OUR coverage, and printing it over somebody we hold a file for
// is a false statement about the app. Cause: voter-hub-location.js is a SYNC
// script and cmp-data.js is DEFERRED, so the first pdxRepsForMe() of a page ran
// with no roster in the window — and the statewide memo then cached that
// emptiness for the life of the page. The memo is now keyed on the roster it was
// computed against and refuses to store an answer the roster was absent to give.
//   Two more disagreements, both of them the same shape — three surfaces each
// deriving "who holds this seat" for themselves. "Work this seat" on the U.S.
// House tagged Celeste Maloy (UT-2) as HOLDS THIS SEAT for a reader pinned to
// UT-1, because the sheet unioned the resolver with the 2026 ballot's office row
// and Davis County's 2026 district is the one Maloy runs in. And the Senate
// workspace header said "No record on file for the current holder" directly
// above a field listing Curtis and Lee. There is now ONE owner —
// window.pdxSeatHolders(seat) in voter-hub-location.js — and the band, the sheet
// and the workspace all read its pid list. The workspace's three cases are now
// distinct: a resolved pid with a record is named, a resolved pid with no record
// is the only thing "no record on file for the current holder" describes, and no
// pid at all says so instead of asserting a holder whose file is empty.
//   NOTHING MOVED THAT RANKS. The formal record is still the ruler, Direction
// Match is still printed and still orders nothing, no party field is read on any
// of the three surfaces (the owner reads none), no challenger was invented — the
// House field kept every candidate and lost only a false incumbency tag — and a
// non-Utah reader still blanks their House and statehouse seats rather than
// borrowing Utah's district map, while their statewide seats resolve from their
// own state's roster.
//   The bump matters because the halves sit on opposite sides of the precache
// boundary. race-sheet.js and ballot-workspace.js ARE shell assets;
// voter-hub-location.js and who-represents-me.js are not and arrive fresh. A
// shell holding v136 would serve the fresh resolver — which now publishes
// pdxSeatHolders — beside a cached sheet and workspace that never call it. Both
// fall back rather than break, so nothing would throw: the desk would simply go
// on tagging the wrong member as this reader's House seat and the Senate header
// would go on contradicting the pane under it, which is the whole defect.
// scripts/test-door2-holders.mjs pins all three surfaces against the Layton
// fixture.

// v136 - THE WORD-VS-ACTION CHIP CARRIES ITS DENOMINATOR, AND THE ISSUE DESK
// STATES ITS PENDING COUNT ONCE. Three defects, all of them a figure printed
// without the thing that sizes it or printed more times than it is true.
//   THE CHIP. The identity-block Word vs Action badge said "100% · Backs it up"
// beside a person's name, on a page that also carries a hundred formal acts, and
// most of the time it was standing on three statements: of the 187 chips this
// corpus can paint, 102 sit on exactly MIN_TESTED_ITEMS tested items — the
// publication floor and not one item more. The two integers that size the
// percentage were printed only in the section a screen below, which is the
// section the chip is a door to. It now says them in the same words the
// apparatus lid and the Official Record feed row already use for the same
// fraction: "84% · 5 of 14 tested · Backs it up", and the aria-label carries
// the fraction too. ANNOTATED, NOT SUPPRESSED: no new floor was invented, the
// fail-closed gate below MIN_TESTED_ITEMS is untouched, a three-of-three read is
// labelled rather than hidden, and two integers do not make the chip sortable —
// nothing reads them back, nothing orders on them, and it does not stand in for
// the formal record brief.
//   THE PENDING COUNT. A cold /i/rural_ag printed the same outstanding-rows
// integer four times in one frame: on the headline, in the people-rows sentence,
// in the partial note under it, and in the announced status line at the foot.
// One fact, four numerals, and a reader either reads a page anxious about its own
// fetch or hunts for the difference between four figures that are the same. The
// count is now stated once, in the sentence whose whole subject is the fetch;
// the other three still say a read is out, in the countless branch each of them
// already shipped, so no new copy was written. The v134 rule holds: the measure
// lede still leads with a mapped measure where there is one, and no pane says
// "nothing readable" over a card that lists H.R. 7567.
//   ONE MEASURE COUNT. The Eye's key card read measures off the static index
// while the pane's badge and /i/<key>'s letterhead both read the ledger's union
// of index-mapped and act-discovered measures. They disagreed out loud: warm
// on 29 of the 119 tracked keys the two readers gave different answers, and by
// a lot: climate_action 3 from the Eye against 10 from the ledger,
// border_security 2 against 6, broadband 0 against 2. There is now one
// reader, and it is the union.
//   AND A CLIPPED READ NO LONGER LOOKS COMPLETE. A truncated roll-call batch is
// the one failure of that fetch that arrives looking like a success: nothing is
// pending, nobody is cold, and both surfaces switch to the settled grammar over
// a record the data layer cut off at a row cap. The ranking's existing sentence
// about that cap is now a named constant, readable through the module that made
// the request, and both the desk pane and the file's letterhead print THAT
// sentence rather than a second wording of the same limit.
// FILES IN THIS BUMP:
//   · word-action.js        — compactBadgeHtml prints and announces the
//                              fraction; read(), the floors and the fail-closed
//                              gate are byte-identical.
//   · word-action.css       — .pdxwa-cbadge-den, quieter than the verdict word.
//   · door1-workspace.js    — the pending integer in one sentence; ledgerTrunc()
//                              and `trunc` on the ledger and the census; the
//                              issueMeasures export switched to the ledger union.
//   · door1-workspace.css   — .d1-led-trunc.
//   · issue-file.js         — clipped() and the letterhead's qualifying line,
//                              outside the busy gate that cannot express it.
//   · issue-file.css        — .pdxif-clip.
//   · issue-view.js         — TRUNC_NOTE hoisted to one const; votesTruncated()
//                              and truncNote() exported. The ranking's own markup
//                              is unchanged, character for character.
// ALL OF THESE ARE PRECACHED SHELL ENTRIES, so a warm device keeps serving the
// old chip and the old four-integer pane until CACHE_VERSION moves — which is
// what this line is. No floor, no mapping, no weight, no stance, no party score
// and no roster row moved, and PRIMARY is still a label (see
// test-primary-label-not-gate.mjs).
//
// v135 - PRIMARY IS A LABEL, AND NOW THERE IS A WALL SAYING SO. The engine had
// already been changed: a mapped act that reached an issue as a provision inside
// a larger measure is characterised in full, on the same depth, strength and
// dominance floors a flagged one is held to, and how it arrived is disclosed in a
// sentence beside the finding instead of subtracted from it. What was missing was
// anything stopping that from being undone. The one existing guard proves the
// rule by setting _RD_MIN_PRIMARY to 99 and watching nothing move, which catches
// a gate spelled with the constant and cannot see one spelled `(idx.primary || 0)
// < 1` - and there is a line shaped exactly like that live in consistency.js
// today, wording a sentence, legitimately.
//   So scripts/test-primary-label-not-gate.mjs now names every reference to the
// flag across the sixteen files of the record stack with what each one is for -
// thirty-six of them, of which exactly three ask a question of the primary count
// and all three answer it with a sentence - audits all 5,321 provision-only rows
// that hold a judged act on every surface that prints them, and then puts the
// gate back four times, in the four shapes it historically had, requiring the
// file to fail on each - and it forbids any file in the stack from describing the
// constant as refusing a read unless the sentence around the mention says so in
// the past tense, because a stale comment is a specification to the next author.
// One shipped comment that still described the retired gate as current was
// corrected. A second, in netlify/lib/vr-pack.ts, is knowingly left standing and
// named in the test: three guards freeze that file byte for byte, and the
// reader-facing copy of the same explanation in voting-record.js is correct.
//   · bill-detail.js       — the Big Picture note no longer credits
//                            _recordDirectionIndex with a not-incidental floor
//                            it has not had since August 2026, and says what the
//                            flag buys on that face instead: a printed label.
// NOTHING EXECUTABLE CHANGED: the only edit to a shipped file is the comment
// above. No floor, no mapping, no weight and no roster row moved, and
// the Direction Match ledger is byte-identical across all four mutated boots as
// well as this one - the record lane is not a Direction Match input and none of
// this may make it one.
//
// v134 - EMPTY WHILE LOADING IS A LIE, AND THE ISSUE DESK WAS TELLING IT. On a
// cold /i/rural_ag the page painted H.R. 7567 as the PRIMARY measure on the key
// and, three inches above the card, said "Nothing readable yet" and printed the
// menu's blank-calendar sentence. Both halves came from the same builder. They
// disagreed because they read different things: the measure list comes off the
// static index and is there at the first frame, while the census counts people
// whose formal rows are still in flight, and the busy census had been written as
// if a zero it had not finished earning were a finding about the issue.
//   The rule now is that the desk may not deny what is already on the page. The
// partial census leads with the mapped-measure count whenever no person row has
// landed yet ("1 measure on file maps here"), never with a word for nothing; the
// unfetched rows get their own sentence in their own voice — "People rows still
// loading — N not fetched yet. That is a fact about this read, not a finding
// about this issue." — so the pending read is described as a property of the
// request instead of a property of the key. The busy measure line no longer
// credits index-sourced measures to "the rows back so far", and a SETTLED key
// that holds mapped measures but no readable act says that in those words rather
// than reprinting the empty-calendar floor over a visible card.
//   TWO FILES MUST TRAVEL TOGETHER, which is what this bump is for:
//   · door1-workspace.js   — the census head, the pending-rows sentence and the
//                            measure-aware settled floor. A warm device holding
//                            v133 would keep printing the denial.
//   · door1-workspace.css  — the one new block that sets the pending sentence in
//                            the same weight as the disclosure above it, so it
//                            reads as the same kind of claim. Nothing restyled.
// No band, no floor, no mapping, no weight and no figure moved. The settled
// census HEADLINE is byte-identical to v133's — the only settled string that
// moved is the empty-lane sentence, and only over a key that holds mapped
// measures, where the calendar sentence was false. The bands still come from
// PDXConsistency.formalPatternIndex and nowhere else, the letterhead still
// publishes no integer while a read is out, a key with no mapped instrument at
// all still gets the menu's own blank-calendar sentence verbatim, and every
// person brief and every Direction Match read is byte-identical across a twin
// boot.
//
// v133 - THE ISSUE NAME WAS THE ONE WORD ON THE ROW THAT LED NOWHERE. A reader
// who opened Celeste Maloy on Farmers & Rural Communities got her thin read and
// the number of the bill behind it, H.R. 7567, and no way from there to either
// of the two things they would ask next: what does this key actually cover, and
// what did that measure do. Both answers already existed - the issue file at
// /i/<key> and the measure explainer inside the dossier row - and neither had a
// door on the surface where the question gets asked.
//   Three doors, no new product. The issue title on the dossier header is now a
// link to /i/<key>; the brief's pattern rows and the topic tree's leaves get the
// same file as a small named sibling, because on those two the name IS the
// button that opens the person's own record and an anchor inside a button drops
// the rest of the row on the floor. Every one of them asks pdx-issue-family.js
// for the address rather than spelling a path.
//   The ⓘ glossary now rides the tree leaf and the dossier header as well as the
// brief row, and rural_ag finally has a boundary behind it: two federal waves
// refused to map amendments to that key IN WRITING because it had none, so the
// scope was argued out in alignment-tool.js from the six instruments and three
// refusals on file, then transcribed into issue-scope.js. Not generated - a key
// with no argued boundary still says "No definition on file yet."
//   And the one-measure roll-up. A lane whose whole formal basis is a single
// vote used to render no roll-up at all, on the reasoning that the card below
// already names the bill; naming a bill is not teaching it, and that was the
// exact depth of record where the explainer door did not exist. It now renders
// at one, with a singular heading, the side said in words instead of counted as
// "1 advanced", and one clipped sentence of the curator's own mapping rationale.
// Clipping it required fixing the sentence splitter, which read the stop inside
// "H.R." as the end of a sentence and would have printed the string "R.".
//   sitemap.xml now lists /i/<key> for every key with a locked boundary or a
// formal mapping. No new score, no percentage anywhere new, no party framing, and
// the public lane still stays out of the formal figure.
//
// v132 - THE OUTLINE OFFERED TWO WAYS TO GO TO THE SAME PLACE. The file outline
// shipped with "Letterhead" and "Formal record" as separate rows, which is how
// the spine names those two stages - and on a member file they are one screen.
// The record brief renders immediately under the photo and the office, so the
// two rows scrolled a reader to positions a thumb-width apart, and a reader who
// wanted the top of the file had to guess which of two rows meant it. Two rows
// that go to the same place are not a finer-grained outline; they are a choice
// nobody can win.
//
// They are now ONE row, "Top of file", and it goes to the identity stage: the
// first paint of the file, the photo and the office, with the brief the next
// thing under it. On the phone chip row it is likewise one chip, because the
// chip row and the desktop rail have always been the same node in two skins and
// there is no way for them to disagree.
//
// It resolves to the STAGE and never to the hub inside it. The sticky pill rail
// sits between the letterhead and the status banners and carries figures; the
// share sheet can be over it. Both are chrome, and a jump that answered "take me
// to the top of this file" by parking a reader on a toolbar would be a worse
// answer than no row at all. The hub keeps its place in the scroll and keeps its
// own scroll-spy - the outline simply does not point at it, and headingOf() now
// skips any heading inside it rather than handing it focus. The top row names
// the heading it wants instead of taking the first one in source order: the
// person's name, which is what a reader sees first.
//
// The merged row is lit while EITHER the letterhead or the brief is the section
// on screen, and it releases the moment "All issues by topic" is the heading at
// the reading line. That took the spy from one watched element per row to one
// per stage, each tagged with the row it lights, so a folded stage keeps its
// watch even though it lost its line. The rule that picks the active row is
// unchanged and is still read off rects the IntersectionObserver already
// measured; nothing sweeps layout.
//
// The fold is conditional, not hardcoded. "Formal record" is dropped only when
// the top row actually resolved. A file that somehow mounted a brief with no
// letterhead keeps one "Formal record" row, on the brief heading, because then
// the brief IS the top of the file and no other row reaches it. Judge files are
// untouched: the judicial rows are byte-identical, they never had a letterhead
// row, and their formal section is a section rather than a fold.
//
// person-outline.js, scripts/test-person-outline.mjs. No section was added or
// removed, no score, percentage, party or Direction Match reached the outline
// copy, no stage order changed, the gutter scrollbar is untouched and formal
// tiers and Direction Match read byte-identically.
//
// v131 - THE FILE GOT LONG AND NOTHING NAMED ITS PARTS. A person file now runs
// letterhead, brief, strongest patterns, the whole topic tree, Word vs Action,
// money, the public lane and the evidence locker, and the only thing that told a
// reader where they were in it was the gutter ticks on the modal scroller. A
// scrollbar reports a fraction. It has no vocabulary, so it cannot say that a
// topic tree exists three screens down, and the thin rows that only live in the
// tree - Maloy - Farmers & Rural Communities sits under Economy, not in
// Strongest Patterns - were reachable only by scrolling until you recognised
// them. Long files bury thin rows, and the indicator that was supposed to help
// could not name a single one.
//
// So the sections got named. One control, two skins, built once per open from
// the DOM the spine assembler already left behind: at 1024 and up a sticky list
// in the person-file panel's own left column, below that the same rows as a
// wrapping chip row under the letterhead, beneath the status banners and above
// the first claim. The list is DERIVED, never declared twice - it probes for the
// .pdxsp-stage-<key> containers and the #pdxsec-<name> anchors that mounted, so
// a stage the file does not have has no row. Every row goes somewhere; there are
// no dead jumps. The member public lane is listed under the name it ships with -
// nothing has mounted #pdxsec-saydo since the gap sheet moved inside Word vs
// Action, so the row that exists says Flashpoints and lands on the Flashpoints
// heading. A judge file gets the judicial stages off the ids judge-file.js
// now puts on its own blocks - retention, JPEC, how the seat was filled, the
// honest empty formal record, prior retention, about the court - and gets no Word
// vs Action row and no money row, because a retention seat has neither and an
// empty row is a question the file cannot answer. Asking for the formal record
// lands on the brief, where it is stated in a sentence, not on the tree.
//
//   · person-outline.js    — new. The resolver, the two placements, the jump, and
//                            an IntersectionObserver scroll-spy rooted on
//                            #modal-body. Reuses window._pdxNavJump so a
//                            destination inside a deferred drawer is mounted and
//                            every closed lid above it opened before the scroll,
//                            then focuses the section's heading.
//   · person-outline.css   — new. Chip row and rail. The desktop panel grows by
//                            exactly the rail's width, gated with :has() on the
//                            rail being in the DOM, so the reading column keeps
//                            its 48rem and a file with no outline is unchanged.
//                            No position:fixed in the phone rules: the bottom of
//                            that viewport belongs to #modal-footer and the
//                            Add-to-team button in it.
//   · judge-file.js        — block() takes an optional id, the court strip carries
//                            one, and render() arms the outline. Judge files never
//                            called _pdxInitProfileNav, so they needed their own
//                            call. No copy, no gate and no status read changed.
//   · profiles-full.js     — one mount call in openModal's tail, after the pill
//                            rail. The outline rides that rail's existing re-arm
//                            signal, so a drawer mounting late gains its row.
//   · index.html           — the stylesheet on the same non-blocking path as the
//                            rest of the modal chrome, and the one new
//                            <script defer>. Precached as the shell's '/'.
//
// The gutter scrollbar is untouched - the ::-webkit-scrollbar rules on
// #modal-body are exactly what they were, and the outline is additive next to
// them. The pill rail above the hero, which is allowed to carry figures, also
// stays. The outline carries none: its copy is section names and the words "in
// this file", and the current row changes weight and gains an underline rather
// than a colour, because colour on this site means a rating. No score, no
// percentage, no party, no Direction Match promotion, no new site-wide nav
// destination, no stage reordered and no floor, mapping, weight or roster row
// moved. Every formal-record tier and every Direction Match read is
// byte-identical with this outline and without it.
//
// v130 - A DEPARTED JUSTICE'S FILE STILL WORE A LIVE BALLOT. v129 put judges in
// the All-Seeing Eye, and the search row for Diana Hagen said the right thing
// from the first day it shipped: no longer on the court. Tap it and the file
// that opened read UTAH - SUPREME COURT - RETENTION ELECTION across the top,
// over a justice who left the court in May 2026 and does not stand. Two
// surfaces, one fact, two answers - and the wrong one was the louder, in caps,
// above the name. A departed file wearing a live-ballot hero is the same class
// of lie as a partial census wearing a finished heading.
//
// The cause was that the two surfaces asked different questions. The search row
// asked the Lieutenant Governor's filed list whether it named this seat. The
// letterhead asked what court the judge sits on - and every judge on this
// roster sits on a Utah court, so every letterhead said retention election.
// That was wrong for ninety-four of the hundred and twenty-six: the one who
// left, and the ninety-three who sit and are simply not on this year's list.
// Thirty-two stand. Ninety-three do not. One is gone. The letterhead knew none
// of it.
//
// v130 makes the status a single reader. judicial-retention.js now publishes
// standing(pid), which returns exactly one of three locked sentences computed
// once from the filed slate - retention election, not on the 2026 slate, no
// longer on the court - and searchRows() was rewritten to call it rather than
// re-derive the same thing. There is no fourth status and a caller cannot mint
// one: a surface that wants to say anything about a retention seat has to ask
// which of the three it is looking at.
//
// judge-file.js reads that one call and branches the whole hero on it. A seat on
// the filed list is unchanged in every particular - Utah - Supreme Court -
// retention election, "stands for retention", November 3 2026, and the state's
// own filed question verbatim. A sitting judge who is not on the list gets the
// court and the seat and nothing else: no election line, no "stands for
// retention", no "Shall ... be retained?" printed as though a voter will see it
// this November, and a paragraph saying plainly that Utah does not put every
// judge on the same ballot and this seat is not among the names filed. A judge
// who has left gets "Utah Supreme Court - former justice", the roster's own
// leaving sentence, and no ballot chrome at all - the modal's top bar says
// former too, because "Utah Supreme Court - Justice" is a present-tense
// sentence about someone who no longer holds the seat. Her file, her seat
// history and her prior retention results all stay. What she loses is a hero
// that was never hers.
//
// The three states are visibly different rather than only textually different:
// the live eyebrow keeps the brighter ink and its rule, the other two are held
// at the muted weight the rest of the file already uses. Nothing in that colour
// scores a judge - brightness is about whether a ballot is live, and there is no
// direction in which it could read as approval.
//
// One more thing went out with it. Typing "Rawson" into the Eye ranked Brad
// Wilson above Judge Rawson, because "rawson" is a subsequence of "brad wilson"
// - b-R-A-d W-il-SON - and the fuzzy fallback let a name in on that alone.
// "Hagen" reached Hoang Nguyen the same way. Neither legislator's own fields
// hold the query anywhere: not the name, not the office, not the district, not
// the bio. The letters were scavenged across a space. A typo is a property of
// one word being mistyped, so the fallback is now measured one token at a time
// and the best token wins; a match that only exists by crossing from one word
// into the next scores nothing. No name is special-cased - the rule is the word
// boundary. "Massie" still finds Thomas Massie and "healthcre" still finds
// Healthcare.
//
// Judges are still not in CMP_DATA. Nothing here feeds Direction Match, Word vs
// Action, a formal-record tier, the publication floor or any score, no JPEC
// figure was invented, no legislative profile moved, and Hagen is still off the
// Door 2 band. Touched: judicial-retention.js, judge-file.js,
// judicial-retention.css, all-seeing-eye.js.
//
// v129 - THE EYE FOUND A JUDGE'S FILE ONLY IF YOU ALREADY KNEW HER NAME. v128
// built 126 complete judge files and gave them real addresses - /p/jill_pohlman
// renders a letterhead, a retention question, a JPEC line, a seat, an honest
// empty formal record and a prior-retention history - and then left exactly one
// door to them: the Door 2 ballot band, on a ballot page, for a voter whose
// county the map could place. Type "Pohlman" into the All-Seeing Eye and it said
// the eye finds nothing. That is because the Eye's people haystack is the union
// of CMP_DATA and PROFILES, and judges are deliberately in neither - which is
// the right call for the arithmetic and the wrong outcome for a search box. So
// the Eye now has a fourth kind, and it is a lane rather than a tenant.
//   · judicial-retention.js  the retention FACT for a search row, from the one
//                            module that owns it: SEARCH (three locked strings)
//                            and searchRows(), which walks all() and reports
//                            name, court, seat, district, unit, pid and one
//                            status - "retention election" if the Lieutenant
//                            Governor's filed slate carries the question, "not
//                            on the 2026 slate" if it does not, and "no longer
//                            on the court" for the one former justice on file,
//                            because "not on the slate" is true of her and
//                            still leaves a reader thinking she sits. The Eye
//                            asks; it does not infer.
//   · all-seeing-eye.js      kind: 'judge'. That one word is most of the safety:
//                            a judge row is not a 'pol', so it never reaches the
//                            saved/team badge, the cross-link chips, the Add to
//                            My Team / Compare / Share strip, or the formal
//                            partition, and judgeItem() additionally never asks
//                            Word-vs-Action, Receipts or Coverage for a badge.
//                            No party chip, no ring, no score, no photo, no
//                            "thin voting record". The count is a FOURTH slot in
//                            laneCounts that no denominator reads, so Formal,
//                            Public and Mandate genuinely print 0 on a
//                            judge-only search - a judge is not a legislator
//                            miss - while the group still answers the query, so
//                            the panel no longer says nothing was found. The
//                            group prints in the formal and public lanes alike
//                            with a note saying it is counted in neither. The
//                            index memo key gained the registry's row count,
//                            because the Eye is a sync script and the judicial
//                            files are deferred, so the first index is always
//                            built before they exist.
//   · firebase-boot.js       the roster pill stops promising a record that is
//                            not coming. A judge file is served from data that
//                            ships with the page, so "Loading the latest
//                            roster…" over one reads as a half-built file whose
//                            missing half is a voting history. Suppressed while
//                            a judicial pid is open, decided from the pid rather
//                            than a flag, and the error pill is untouched -
//                            "couldn't load the roster" is a true report about
//                            the rest of the app.
//   · judge-file.js          the public lane is hoisted into a court strip.
//                            publicLane() is keyed on courtKey, so every judge
//                            on a court sees the same rows; a section under her
//                            letterhead read as hers whatever the note said.
//                            The strip names the court in its heading and states
//                            the rule above the quotes instead of below them.
//                            Still data-gated, which today means Supreme Court
//                            files only.
//   · judicial-retention.css the court strip's frame.
//   · index.html             the judge row's neutral spine and the group note.
// Judges are still absent from CMP_DATA, from the sitemap publication floor and
// from compare-the-field. No floor, no mapping, no weight, no Direction Match
// input, no Mandate term and no formal tier moved. Legislative search and every
// Direction Match read are byte-identical with this lane and without it.
//
// v128 - ONE JUDGE NAMED, AND FOUR COURTS TOLD TO CHECK ELSEWHERE. v127 added
// judicial retention as an office class and shipped it half-blind: it could name
// one Supreme Court question and then tell a Davis County voter that the Court of
// Appeals had no certified list and that district, juvenile and justice courts had
// no map at all. Honest, and unfinished - a real Utah ballot carries a statewide
// Court of Appeals question and trial-court judges drawn by county, so "your
// actual ballot" was still missing most of the third branch. Two official sources
// the last pass could not reach are now reachable, and this is what they say.
//   · judicial-data.js         the whole roster, generated from official sources
//                              rather than typed: 124 judges from the state courts
//                              directory's own biography pages (6 Supreme Court, 7
//                              Court of Appeals, 78 district, 33 juvenile; court
//                              commissioners deliberately absent, because a
//                              commissioner is not a judge and does not stand for
//                              retention), plus the two rows no reachable source
//                              lists, both flagged and neither on a ballot. New
//                              DISTRICTS: the eight geographical divisions of Utah
//                              Code 78A-1-102, all 29 counties, each once - one map
//                              for the district AND juvenile courts, because that
//                              is how the statute writes it. SLATES[2026] is now
//                              certified: 32 retention questions read verbatim off
//                              the Lieutenant Governor's 2026 candidate filings
//                              (asOf 8/31/2026), each with the office it was filed
//                              under and its filing status. The uncertified caveat
//                              is retired for the courts that list names. Still no
//                              score, no party, no ruling, no holding, no PAC
//                              money, and every jpec is null because the
//                              commission's own site answers 401 on every report
//                              path - "no report on file" is the true answer, not a
//                              placeholder for an invented one.
//   · judicial-retention.js    owns the reading of that map and nothing else owns a
//                              copy: countyIndex() is built from DISTRICTS on first
//                              use, districtForCounty() returns null for anything
//                              the statute does not list, and ballot() now resolves
//                              the voter's district from the county the location
//                              owner publishes. A Utah voter gets the two statewide
//                              courts plus the trial-court judges of THEIR OWN
//                              division and no other. A county the map cannot place
//                              gets the missing-map sentence naming the county; the
//                              justice courts get a missing-ROSTER sentence naming
//                              the county, because that is the different thing that
//                              is missing there. slateQuestion() hands a surface the
//                              state's own wording; filedFor() lets a court with no
//                              rows say that a question WAS filed under it and that
//                              the courts directory places that judge elsewhere.
//                              Both fail-closed drops from v127 are unchanged: an
//                              ambiguous name is dropped and reported, and a judge
//                              with no retention date is not on any ballot.
//   · judicial-ballot.js       each row now says which unit put it there -
//                              "Statewide" or the named judicial district - and the
//                              band names the county and district the trial rows
//                              were resolved from, above them. A source conflict
//                              prints on the row it affects.
//   · judge-file.js            prints the retention question as the state filed it
//                              rather than a composed paraphrase, links the official
//                              biography every identity fact was read off, and
//                              carries the source-conflict and source-typo notes.
//   · judicial-retention.css   four new classes for those labels. Nothing restyled.
//   · voter-hub-location.js    pdxRepsForMe() publishes `county` off the curated
//                              area it already resolved, gated on matched && Utah.
//                              THE HANDSHAKE, and the whole reason for this bump:
//                              the band reads the county from the location owner and
//                              resolves nothing itself, so a device holding one half
//                              of this pair from the old version gets no county and
//                              every trial court reports its map as missing. Wrong
//                              in the safe direction, and still wrong.
//                              NOT on the precache list: it is a RUNTIME entry, and
//                              the runtime cache name carries CACHE_VERSION, so this
//                              bump is what drops the stale copy. Without it a warm
//                              device would serve the old resolver - which publishes
//                              no county at all - against the new band, and every
//                              trial court would report its map as missing on a
//                              ballot the map can actually place.
// The four judicial files and the stylesheet ARE precached ('/judicial-data.js',
// '/judicial-retention.js', '/judge-file.js', '/judicial-ballot.js',
// '/judicial-retention.css'), so the rename is what replaces them together rather
// than one at a time.
// The band is still a SIBLING of #bw-body, still absent from seats(), and still
// not in "N of 6 decided": a yes/no on one name is not a field of candidates and
// has no pick to save. No floor, no mapping, no weight, no Direction Match input,
// no Mandate term and no formal tier moved. The legislative read is byte-identical
// with these files loaded and without them.
//
// v127 - A BALLOT THAT NAMED SIX SEATS AND SKIPPED A BRANCH. A Utah ballot in an
// even year carries yes/no judicial retention - "Shall Justice X be retained?",
// unopposed, no party on the line - and November 3, 2026 is live. Door 2
// resolved two Senate seats, a House seat, a governor and two state chambers,
// called that "your ballot workspace", and said nothing at all about the third
// branch. That is not a missing feature; it is a completeness claim over a hole.
// This version adds retention as a new OFFICE CLASS and adds no scoring engine
// whatsoever.
//   · judicial-data.js         the Utah judicial roster as identity rows only:
//                              name, court, appointing governor, appointment and
//                              confirmation dates, next retention date, pid. No
//                              party, because party is not on the judicial
//                              ballot. No score, because a judge has no promise
//                              ledger to weigh an action against. No judge
//                              written into CMP_DATA, because a record in that
//                              roster inherits a party chip, a score ring, a
//                              promise count and the publication floor's "record
//                              still being built" notice, and every one of those
//                              would say something false about a court. The 2026
//                              slates are marked certified:false and every
//                              surface says the official list is not on file -
//                              one row is verifiable as standing for retention on
//                              that date and only that row claims it. Court of
//                              Appeals, District, Juvenile and Justice courts
//                              carry no rows at all rather than guessed ones.
//   · judicial-retention.js    the one owner of "what does retention say": six
//                              locked phrases (retained / not retained / stands
//                              for retention / JPEC recommends retain / JPEC does
//                              not recommend / no JPEC report on file), the
//                              banned list, the wall, and ballot(reps). No DOM.
//                              Outside Utah it returns before any row is built,
//                              so there is no code path that can put a Utah judge
//                              on an Ohio ballot; inside Utah the district,
//                              juvenile and justice courts report WHICH MAP IS
//                              MISSING instead of offering the nearest judge.
//                              Fails closed on a name collision: both records are
//                              dropped from the ballot and the drop is reported.
//   · judge-file.js            /p/<pid> for a retention seat. Intercepts the one
//                              openModal funnel so a judge never reaches the
//                              roster renderer - the letterhead is the court and
//                              the retention election, not Word vs Action, and
//                              there is nowhere on the surface for a figure. The
//                              formal lane says in words that this office does
//                              not vote bills; the JPEC block either quotes the
//                              commission with its source URL or says no report
//                              on file and points at judges.utah.gov. The address
//                              stays PDXPerson's, which owns it.
//   · judicial-ballot.js       the Door 2 retention band and the Utah-courts
//                              archive listing. The band is a SIBLING of #bw-body
//                              because sync() assigns that element's innerHTML in
//                              one write, and it never joins seats(): a retention
//                              question is a yes/no on one name, not a field to
//                              pick a winner from, so putting it in the "N of 6
//                              decided" denominator would make one counter measure
//                              two different acts.
//   · judicial-retention.css   both surfaces. Flat rules, no fill, no status
//                              colour, no ring and no chip that could read as a
//                              party badge; Retain / Do not retain is drawn as two
//                              inert ballot boxes, because the answer is the
//                              reader's to give at the polls.
//   · person-file.js           two guarded lines. record() consults the judicial
//                              registry LAST, after both rosters, so /p/<judge>
//                              resolves instead of answering a real address with
//                              "isn't someone we currently carry a record for";
//                              and the kicker branches on the file class first, so
//                              a floor built to ask "two cited positions or two
//                              sourced formal acts" cannot stamp "record still
//                              being built" across a record that is complete for
//                              what this office does.
//   · index.html               the four new <script defer> tags, the non-blocking
//                              stylesheet link, and precached as '/'.
// No Direction Match input, no baseline from opinions, no finance figure, no
// Mandate arithmetic and no summary of a holding. No ruling is read as a kept or
// broken promise. The publication floor did not move, the legislative DM and
// formal tiers read byte-identically with these files loaded and without them,
// and the appointing governor stays a fact about the appointment rather than a
// description of the appointee.
//
// v126 - A THIRD OF A REQUEST, WEARING THE GRAMMAR OF A FINISHED CENSUS. On a
// cold /i/climate_action the ledger opened with "3 people have a readable formal
// row on Climate action - 3 cut against", one band on the page, and slice chips
// that matched those same three rows. Every figure was true and the whole page
// was false: the reader had been taught that this issue IS three senators who
// cut against it, while five hundred and sixty records were still on the wire.
// The letterhead already refused to publish an integer under a live read; the
// people line underneath it did not, and a finished heading over a partial
// inventory is the same lie as a thin file wearing a finished one.
//   The gate is now the read, on every block of the pane at once. While any row
// is cold or any batch is in flight the headline names the settled count AND
// says what it is - "3 readable so far - still reading 560", followed by one
// sentence that it is not the count for this key - the split is marked as being
// of the rows back so far, the bands nobody has come back for are NAMED as
// closed rather than dropped as zeroes, and the chip row says its counts are of
// the rows on screen and that a direction with no chip is not a finding that
// nobody advanced it. When the rest lands, warmLedger's one settle repaint
// rebuilds the whole string from the settled ledger, so there is no order of
// arrival in which bands appear under a heading that still says three. Once cold
// and pending are both 0 the settled wording returns unhedged: a key that really
// does hold one band keeps that heading, because an empty band after a finished
// read is a finding and findings are printed straight.
//   · door1-workspace.js   - one ledgerBusy() predicate for the whole pane (the
//                            same cold-or-pending test the file panel's gate is
//                            written on), the partial headline and its
//                            disclosure line, the bands-still-closed sentence,
//                            the measure line's partial wording, the chip row's
//                            "counts the rows on screen" note, and the
//                            data-pdx-slice-part flag the DOM caption reads so
//                            "3 of 3 rows" says "on screen". Stale here means a
//                            warm device paints the old finished-inventory
//                            headline over a partial read.
//   · door1-workspace.css  - the partial census in amber, its two disclosure
//                            lines, and the chip row's matching note. Stale here
//                            means the disclosure paints as body text and the
//                            partial box looks exactly like a settled one, which
//                            is the whole defect back again.
// Nothing else moved: pdx-issue-profile.js, issue-file.js, issue-file.css and
// netlify.toml are unchanged this pass and travel behind the same version, the
// letterhead's busy gate and the measure banding are exactly as v125 shipped,
// and no second census, party token, floor, percentage or Direction Match read
// was added anywhere. Direction Match and the formal tiers read byte-identically
// with this pane loaded and without it.
//
// v125 - ONE LONG COLUMN OF MEASURES, AND THE SAME BILL TWICE IN IT. v124 gave
// the PEOPLE on an issue a filter row and left the MEASURES as they were: on
// /i/climate_action, thirteen cards down one column, H.R. 1 appearing twice
// because the bills index and the roll-call record each contributed a row for
// it, PRIMARY disapproval resolutions and floor amendments interleaved with no
// order a reader could see. Nothing was wrong on any single card; the SHAPE was
// unreadable, which on this pane is the same problem as a wrong figure.
//   The list is now filed into the bands its own cards were already labelled
// with - PRIMARY, provision, and machinery-only - each band showing its first
// four cards over its own "N more measures - same label" fold, and one row per
// instrument, because one row opens one measure. No new reading: the bands are a
// partition of the measures the census had already mapped, and the body the desk
// builds is byte-identical whether or not a fold is open, because a fold is a
// <details> and not a rebuild.
//   · door1-workspace.js   - the fold on the face (one card per instrument, keyed
//                            on the number the card's own door takes, with the
//                            better of the titles the two sources published), the
//                            three bands and their per-band cap, the machinery
//                            pill on a card that had a motion as well as a vote,
//                            and the band anchors published on
//                            PDXDoor1.issueCensus(key).proc.measures.bands. The
//                            procedural TALLY got stricter with them: it counts
//                            measures whose every act on file was machinery,
//                            where it used to count measures carrying any
//                            procedural act at all. Stale here means the file
//                            panel asks for `bands` that are not there and the
//                            measures row on the letterhead prints nothing.
//   · door1-workspace.css  - the measure bands and their folds. Deliberately
//                            quieter than a people band and under their own
//                            class names, which is also what keeps the people
//                            slice's walk from ever reaching a measure card.
//                            Stale here means the fold summary paints as an
//                            unstyled list marker.
//   · issue-file.js        - the measures row on the letterhead is now three
//                            doors rather than three words: each figure jumps to
//                            the band that holds exactly that many cards, using
//                            the anchors the desk published. Same busy gate - no
//                            integer while the record is still being read - and
//                            the note under it now says the three figures SUM to
//                            the total, because they do.
//   · issue-file.css       - those figures, inked and underlined like the "see
//                            the measures" control beside them, because they do
//                            the same job. No hex, same as before.
//   · netlify.toml         - UNCHANGED. Same /i/* → /index.html 200 rewrite.
//   · index.html           - UNCHANGED. No new module and no new script tag.
// No floor, no mapping, no weight, no roster row and no percentage of any kind
// appeared, and no share of a package is printed anywhere. A provision's vote
// still counts and still says so on the card. The slice chips above the people
// do not touch the measure list, because a slice of the people is not a slice of
// the bills. One consequence worth naming: the stricter procedural tally means
// the consistency module's locked "procedural gate" sentence now prints on no
// key at all - it used to print on stock_trading_ban, whose one measure carries
// 37 procedural acts and 179 substantive ones. The phrase stays wired and
// quotable; the record simply no longer meets it.
//
// v124 - A PHONE BOOK, AND NO WORD ON HOW THE ISSUE MOVED. A settled key files
// hundreds of people across five direction bands, and /i/climate_action handed a
// reader all of them in one column with no way to open a slice of it. The file
// also never said how the issue was TESTED - which measures were PRIMARY, which
// were a provision folded inside something larger, which act on file was floor
// machinery - so a reader could count the record without ever learning its shape.
// Both are views of the census the desk already computed. No new score, no second
// ledger, and the body the desk builds is byte-identical when no chip is pressed.
//   · door1-workspace.js   - the filter row above the bands (direction, vehicle,
//                            chamber, name) and the process figures published on
//                            PDXDoor1.issueCensus(key).proc. The slice is a DOM
//                            decoration, not a filtered build: the builder always
//                            emits the same string and the chips always paint
//                            unpressed, which is what keeps the desk and the file
//                            one paint. Stale here means the file panel asks for
//                            a .proc that is not there and prints no process
//                            block at all - the refusal it is written around, but
//                            also the whole point of this bump.
//   · door1-workspace.css  - that row: the chip groups, the pressed state, the
//                            name box, and the [hidden] rules the slice hides
//                            rows with. Stale here is the loud failure of this
//                            pass: v123's stylesheet has no rule for [hidden] on
//                            a person row, so a warm device would paint the chips,
//                            accept a press, and then show every row the slice
//                            had just excluded - a filter that visibly does
//                            nothing.
//   · issue-file.js        - the "how this issue was tested" block on the
//                            letterhead, under the inventory and behind the same
//                            busy gate: measures, people, acts by class, the
//                            consistency module's own locked sentence where it
//                            applies, and a jump to the measure cards rather than
//                            a second copy of them.
//   · issue-file.css       - that block. No hex, same as before.
//   · index.html           - UNCHANGED. No new module and no new script tag; the
//                            filter row and the process block are both built by
//                            files the page already loads.
// No floor, no mapping, no weight, no roster row and no percentage of any kind
// appeared. The slice offers no party chip and no sort - not by consistency, not
// by Direction Match, not by donations and not by likes - and it re-reads no
// record: every axis is a field somebody else already published on the row. A
// sponsorship is never called a vote. While the roll-call read is still out the
// process block prints nothing at all, exactly as the inventory above it does.
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
// v141 - ONE FRACTION BUILDER ON EVERY WORD-VS-ACTION FACE. The letterhead chip
// and the ⚖️ section already printed their "N of M tested" from one owner; three
// other faces of the same reading still spelled it out by hand — the apparatus
// lid label, the Official Record row in the feeds panel, and the hero sub-line.
// Three hand-built spellings of one number are three chances to disagree, and on
// a phone all five sit within a screen of each other. All three now print the
// owner's string and nothing else, under the same rule the chip follows: no
// percentage without the set that sizes it. TWO FILES ARE THE PRECACHED PAIR
// BEHIND THIS BUMP:
//   · word-action.js  — the changed file. figureOf(pid, r) is the owner for a
//                       surface that already holds a read, so the lid, the feed
//                       row and the hero print the section's fraction without
//                       paying for a second scoring pass. No arithmetic, no
//                       floor, no mapping and no weight moved; the hero's
//                       below-floor sentence still names the floor, not the set.
//   · word-action.css — unchanged by this pass, and named here because it is the
//                       other half of the precached pair: the fraction's skin
//                       (the quietened denominator) already shipped, and a warm
//                       device must not hold one of these two files at v140 and
//                       the other at v141.
// Every person brief, every Direction Match read and every formal tier is
// byte-identical across a twin boot — the same number, said once.
// v142 - DOOR 2 ON A PHONE: ONE OWNER, ONE FIGURE, AND A RAIL THAT STAYS PUT.
// Four surfaces were each answering a question they do not own, on one screen.
// WHO REPRESENTS ME said "3 of 6" with "No record on file yet — we'd rather leave
// this blank than name the wrong person" printed over Mike Lee, John Curtis and
// Spencer Cox; the WORKSPACE HEADER said "No current officeholder resolved" above
// a pane listing those same people. Both were right about the roster they could
// see: cmp-data.js is deferred, the first paint of a cold phone happens before it
// lands, and the only thing standing between that paint and the truth was a
// stopwatch (600/1800/4000 ms in the band, 400/1200/3000 ms in the workspace). The
// resolver now announces its own input — window.pdxRosterReady(cb), one owner, one
// moment, immediate when the roster is already there — and both surfaces listen to
// that instead of guessing about somebody's network. The workspace header also
// lost its third branch entirely: every pid the owner returns is NAMED and linked,
// and a display row that has not merged yet is a loading state of one tab, never a
// claim about this app's coverage.
//   THE SEAT RAIL stopped jumping back left. sync() replaces the whole of #bw-body
// and a replaced scroller starts at scrollLeft 0, so the seat the reader had just
// tapped scrolled off the side of the phone. The reader's position is now carried
// across the repaint and the selected chip is revealed only when it is genuinely
// off screen — by scrollLeft arithmetic, not scrollIntoView, which would drag the
// page's vertical scroll with it. A desktop seat column is not a scroller and is
// left completely alone.
//   THE HOMEPAGE RECORD CARD stopped printing two figures for one person. It
// painted 88% over 5 tested and then settled to 72% over 15, because the
// publication floor clears while the roll-call record is still landing and the card
// was composing that pair itself. It now prints PDXWordAction.figure() — the same
// object the letterhead chip and the ⚖️ section print — and withholds the
// percentage until that object says the ledger under it stopped growing. The
// inventory line still says what is on file, so withholding the figure is not
// going blank. FOUR PRECACHED SHELL FILES CHANGED, AND ONE UNCHANGED FILE
// TRAVELS WITH THEM:
//   · word-action.js      — figureOf() gained `warming` and `ready`. Additive: the
//                           chip and the section still gate on `shows`, and their
//                           contract is untouched. figure() also resolves the
//                           person for a pid-only caller, which is all the home
//                           card has, so the two cannot answer differently.
//   · word-action.css     — unchanged by this pass, and named here for the reason
//                           v141 named it: it is the other half of a precached
//                           pair. The chip's skin (the quietened denominator)
//                           already shipped, and a warm device must not hold one
//                           of these two files at v141 and the other at v142.
//   · hero-showcase.js    — the ⚖️ block on the record card prints that figure and
//                           composes nothing: the percentage, the denominator
//                           beside it and the coverage line's tested set are one
//                           object, cached on the same derivation epoch as the
//                           card's read and armed on the engine's own published
//                           repaint list.
//   · ballot-workspace.js — the header reads the owner's pid list only; the rail
//                           keeps its scroll and reveals the selected chip.
//   · ballot-workspace.css— .bw-seats is position:relative so the offsetLeft
//                           fallback measures inside the rail. Named here because
//                           it is the other half of a precached pair: a warm device
//                           must not hold one of these two at v141.
// Two changed files are NOT shell assets and arrive fresh: voter-hub-location.js
// (which now publishes pdxRosterReady) and who-represents-me.js. That split is why
// the bump matters — a shell holding v141 would serve the fresh resolver beside a
// cached workspace that never subscribes to it, which fails back to exactly the
// defect: a header contradicting the pane under it.
// No floor, mapping, weight, verdict, roster row or Direction Match read moved.
// Every person brief, every DM ledger entry and every formal tier is byte-identical
// across a twin boot; what changed is who prints a number and when.
// v143 - A SEAT THAT HAS BEEN NAMED IS NEVER UN-NAMED. Layton / Davis County, on a
// phone: Who Represents Me painted six of six, with John Curtis and Mike Lee on the
// two U.S. Senate rows and Spencer Cox on the Governor row — photos, "See their
// record" — and then the "Loading the latest roster..." pill fired and those same
// three rows became "No record on file yet - we'd rather leave this blank than name
// the wrong person", with the count down to three of six. The blank sentence is an
// admission about OUR coverage, and printing it over three people who each have a
// file is the app calling its own true answer a mistake. It is strictly worse than
// never having answered: the reader had their senators and watched the site take
// them away.
//   THE CAUSE WAS A MERGE, and it is in the precached document. The light Firestore
// index carries only the fields its documents have; the bulk merge in index.html
// defaults the essentials before assigning, so a document with no office and no
// state arrived as office:'' state:'' and Object.assign wrote those two empty
// strings over the bundled roster's "U.S. Senator" and "Utah". Statewide seats
// resolve from exactly those two strings, which is how one merge deleted three
// officeholders. A blank is not an answer and no longer overwrites one: both roster
// merges now go through _pdxMergeRosterRecord, which drops '', null, undefined and
// [] onto a field that is already empty and nowhere else. An arriving VALUE still
// wins, including one that moves somebody out of a seat.
//   AND THE RESOLVER NOW REMEMBERS WHAT IT HAS ANSWERED, so no future payload can
// find another way to do this. pdxRepsForMe() keeps a ledger, per reader location,
// of the seats it has already named; a seat loses its holder only to a DIFFERENT
// pid or to that person leaving the roster outright. An empty window.CMP_DATA is a
// page mid-load, not a page whose officeholders resigned, so it takes nothing away.
// Because the rule lives in the resolver, the band, the workspace header, the race
// sheet's incumbent tag and pdxSeatHolders() all inherit it: the Senate header
// cannot say "no officeholder" over holders the band named a moment earlier.
// Moving to a new address still forgets everything, which is the one way remembering
// could name the wrong human.
//   ONE PRECACHED SHELL FILE CHANGED, AND TWO CHANGED FILES ARRIVE FRESH:
//   · '/' (index.html)      - the bulk roster merge stopped defaulting a field into
//                             existence and then writing it over a curated one.
//                             This is the precached half, and the reason for the
//                             bump: a warm device holding v142's document would
//                             keep the merge that un-named the senators.
//   · voter-hub-location.js - the statewide walk and pdxRepsForMe() carry a named
//                             seat forward; pdxSeatHolders() publishes `sticky` for
//                             diagnostics. Not a shell asset; arrives fresh.
//   · firebase-boot.js      - the full-profile merge follows the same rule. Not a
//                             shell asset; arrives fresh. The retired-pid guard on
//                             the other branch is untouched.
// No floor, mapping, weight, verdict, roster row or Direction Match read moved. No
// score is computed here and no name is guessed: the only pid a seat can carry is
// one this resolver already produced for this reader. A twin boot leaves every
// formal tier and every DM ledger entry byte-identical; what changed is that a row
// which has named somebody keeps them.
// v144 - THE FORMAL FILE OUTRANKS A NAME STUB, AND A CITATION IS A DESTINATION.
// The All-Seeing Eye's formal lane put a lightweight row — a PROFILES stub with a
// photo and a paragraph of bio, a thin roster row, a name a query merely brushed
// — above the person holding the voting file. The lane used to partition people
// on one boolean (does the pattern index hold a row) and that boolean reads "no"
// for both a stub and a member whose lane has not landed, so the two tied and
// relevance broke the tie. The people group now orders on the record: is there a
// formal record at all, then the name the query actually named, then the office it
// named, then the record's own depth (acts on file, then characterised issues).
// score() and rank() are byte-identical — relevance did not move, the tie-break
// did — and nothing in the ordering reads a party letter, a Word-vs-Action
// percentage or a dollar.
//   THE ROW SAYS WHAT IS ON FILE. Office + "N acts · M issues", or "record still
// landing" while the lane is still answering — which is a different sentence from
// "nothing on file" and is now spelled differently. The row's badge chain (an
// outcome word, else a Say-vs-Do verdict, else a coverage chip) is gone: at most
// ONE figure is printed and only when PDXWordAction.figure() reports ready, so the
// row cannot flash a thin percentage and then settle to the live one — the same
// rule the homepage card took in v143.
//   AND A BILL NUMBER OPENS THE BILL. "S. 129" ranked as prose: the digits landed
// in eight legislators' haystacks and the measures group renders last in the lane,
// so the measure sat ninth and Enter opened a person nobody asked about. A query
// that IS a citation — H.R. 6644, H.B. 400, S. 129, H.J.Res. 88, with or without
// the dots, plus a bare number that reaches exactly one measure — now leads the
// lane with that measure's own row. Every other query is unchanged.
//   ONE PRECACHED SHELL FILE CHANGED, AND ONE CHANGED FILE ARRIVES FRESH:
//   · '/' (index.html)     - the person row's one figure chip (.pdx-eye-wva) has
//                            styles, and it carries its tested set beside it. This
//                            is the precached half and the reason for the bump.
//   · all-seeing-eye.js    - the ordering, the row copy and the citation lead. A
//                            runtime cache entry, so a warm device would keep
//                            serving v143's panel without this bump.
// No floor, mapping, weight, verdict, roster row, seat holder or Direction Match
// read moved, and no new score was computed: every number the row prints is a
// count some other module already published. A twin boot leaves every formal tier
// and every Direction Match read byte-identical.
// v145 - ONE DOOR 2, ONE PERSON DOOR, AND THE PICKS ARE NOT A "TEAM". Three
// surfaces disagreed for a Layton reader: Compare Field on the U.S. House seat
// named the UT-2 candidate over the UT-1 member who actually holds it, the state
// seats painted only the holder while Where they stand already listed the rest
// of the field, and a tap on a person in Relevant to Me opened a compact
// Kept/Broken card instead of that person's file. One new function now answers
// "who is on this seat" (seat-field.js) and every field surface reads it; every
// list row, peek and search hit opens /p/<pid>; the picks counter and the
// workspace read one store; and the user-visible "team" vocabulary is gone from
// Door 2's faces in favour of ballot/picks.
//   PRECACHED SHELL FILES CHANGED — ALL OF THEM ARE THE REASON FOR THE BUMP:
//   · '/' (index.html)     - the renamed Door 2 chrome (nav pills, builder
//                            header, dock, saved-slate UI, tour, onboarding) and
//                            the new <script src="/seat-field.js">. A warm shell
//                            keeps the old markup AND never requests the new
//                            file, so the field fix would look unshipped.
//   · seat-field.js        - NEW. Added to the precache list above.
//   · compare-hub.js       - the field handover for Relevant to Me, the person
//                            door, one CTA per seat, the renamed copy.
//   · ballot-breakdown.js  - the field delegation and the per-local-seat field.
//   · race-sheet.js        - the district-named scope label and local seat meta.
//   · ballot-workspace.js  - seats and the decided count read the one store; the
//                            redistricting note; the honest one-pid line.
//   · door2-spine.js       - the picks view's label.
//   · ballot-workspace.css - the status tags and the quiet lines note.
//   · alignment-tool.js    - label only: the match rail's pick button, its
//                            aria-labels and the "where your picks split" rows.
//                            A warm shell would print "Add to my team" beside a
//                            page that everywhere else says ballot.
// ALSO CHANGED BUT RUNTIME-CACHED, SO THEY ARRIVE FRESH WITHOUT THIS BUMP:
// all-seeing-eye.js, compare-table.js, evidence-locker.js, hr1-showcase.js,
// impact-tracker.js, issue-compare.js, my-profile.js, my-stances.js,
// voter-hub-location.js, who-represents-me.js - each carried reader-facing
// "team" copy and now says pick/ballot. Label only; no logic moved in any of
// them.
// No new score, no party sort, no ranking by Direction Match, and no news-scraped
// challengers: every pid the field prints is a roster row that was already on
// file. A twin boot leaves every formal tier and every Direction Match read
// byte-identical.
// v146 - RELEVANT TO ME IS THE READER'S BALLOT, NOT THE NATIONAL DIRECTORY. A
// Layton reader opened Door 2 and found, above the ballot workspace, a CABINET /
// APPOINTED accordion mounted as a race - "Compare the field · 38 in this race" -
// whose members included the secretaries of state of California, Colorado,
// Washington and Texas. Nobody in Layton asked for Jena Griswold. Beneath it sat
// a five-way "race" between Trump, Vance, Biden, Obama and G.W. Bush, and beneath
// THAT a long list of Utah judges wedged between the reader's seat list and the
// workspace where they choose candidates.
//   Three separate causes, one shape: a surface that sits above the picks was
// making seat claims about the reader that no resolver had answered. The cabinet
// bucket is whatever Door 1's classifier files under secretary/director/
// ambassador, which is the federal cabinet AND 34 state officers drawn from 26
// states, and it was added to the reader's slate BEFORE the state check.
//   The fix is scope, not deletion. Relevant to Me now keeps only the seat kinds
// the reader's own slate can name - window.TEAM_POSITIONS, the same per-state
// ballot definition the workspace and the seat counts read - and inside those,
// only their own state's people, with the seat field's answer exempt so it stays
// authoritative about who fills a seat. Utah's slate is six seats, so cabinet and
// president fall away there; Colorado's slate names a Secretary of State, so a
// Colorado reader keeps that group, filtered to Colorado. Every cabinet and
// appointed record is still on file and still readable - it now lives in archive
// browse, under two new chambers, where the kicker says "Archive · not a ballot"
// and a chamber-and-state listing makes no claim about the reader. And judicial
// retention moved out of the pick flow into #judicial-lane, a section of its own
// below the workspace and below the picks; Door 2 keeps one line about it and a
// jump.
//   PRECACHED SHELL FILES CHANGED — ALL OF THEM ARE THE REASON FOR THE BUMP:
//   · '/' (index.html)         - the new #judicial-lane section. Its POSITION is
//                                static markup on purpose, so no module can
//                                decide at runtime to put judges back above the
//                                workspace. A warm shell has no lane, and the
//                                module would fall back to creating one - the
//                                markup, the heading and the copy would all be
//                                missing.
//   · judicial-ballot.js       - both mounts moved into the lane and the Door 2
//                                footprint became one line (#jr-line) plus a
//                                jump. A warm shell keeps the old file, which
//                                appends the courts archive into
//                                #who-represents-me .wrm-inner: the exact wall of
//                                judges between the seat list and the picks that
//                                this pass removed.
//   · judicial-retention.css   - the .jr-line rule and the .jl-* lane header.
//                                Without them the new line and section render
//                                unstyled.
// ALSO CHANGED BUT RUNTIME-CACHED, SO THEY ARRIVE FRESH WITHOUT THIS BUMP:
// compare-hub.js (the ballot-scope gate on all three render paths and the honest
// cabinet subtitle), archive-browse.js + archive-browse.css (the two new
// chambers and the reader-initiated widen-out for an empty slice).
// No cabinet record deleted, no party sort, no ranking by Direction Match, no
// nested interactives, no store renamed, and the local seat count is untouched -
// the rail and the grid stay one expanded ballot. A twin boot leaves every
// Direction Match read and every formal tier byte-identical.
// v150 - TWO FILINGS WERE FILED UNDER A KEY THE PERSON FILE DOES NOT USE. The
// money seed stores thirteen itemized filings, and two of them are keyed to a
// short id the rest of the product retired: `bking` for the person file
// `brian_king` (Brian S. King, former UT House District 23) and `gleich` for
// `caroline_gleich`. Every pid-keyed finance reader dipped straight into the
// `_FTM_BY_ID` index, so BOTH surfaces on those two files - the letterhead 💰
// chip and the 💰 Money & Funding section below it - reported "No money file on
// hand" while the dollars sat one alias away. That is the worst of the three
// possible states: the site holding a filing and telling the reader it does not
// have one, on the surface whose entire job is to say which gaps are real.
//   ONE TABLE, ONE RESOLVER, BOTH READERS. index.html now carries FTM_ID_ALIAS
// beside the index it aliases (profile id on the left, the id the filing is
// stored under on the right) and one `_ftmRecord(pid)` resolver that every
// pid-keyed accessor calls - `_pdxFinanceFiling` (the chip's door),
// `_pdxFinanceSignal` (the section's door), `_pdxFinanceRecord` and
// `_pdxFunding`. The chip and the section therefore cannot answer differently
// for the same person, which is the failure this lane already shipped once.
//   NOT A CHIP-ONLY REMAP, and not a new claim about anybody: the table says two
// ids reach one filing, the same shape as the bridges the product already keeps
// (PDX_PROFILE_ALIAS, db/vr-pid-aliases.json). PDX_PROFILE_ALIAS itself is NOT
// the door, because test-identity-integrity §11 holds every value in it to a
// live cmp-data record and `caroline_gleich` has none.
//   COUNTS DID NOT MOVE. Aliases resolve at lookup time and are never written
// into the index, so `_pdxFinanceIds()` still returns 13 keys and the coverage
// sentence still counts 13 filings out of the roster - 13 people, not 15 keys.
// No dollar figure is new, no percentage was added, and no second Money block or
// second profile exists for either short key.
//   PRECACHED SHELL FILES CHANGED - THEY ARE THE REASON FOR THE BUMP:
//   · '/' (index.html)         - the finance index itself gained FTM_ID_ALIAS,
//                                the `_ftmRecord` resolver and the published
//                                `PDX_FINANCE_ID_ALIAS` mirror. A warm shell
//                                serving the old document keeps the two files
//                                empty no matter how fresh the lane is, because
//                                the index and the accessors both live here.
// ALSO CHANGED BUT RUNTIME-CACHED, SO IT ARRIVES FRESH WITHOUT THIS BUMP:
// finance-lane.js - its second lookup seam (the raw-index fallback used by a
// harness or a future ingest) now reads the same published alias table, so the
// two seams cannot resolve one pid differently.
// A BUMP RENAMES BOTH CACHE BUCKETS, so it invalidates the whole precached shell
// whether or not this pass touched it, and the shell's paired assets therefore
// travel together on this bump as they must. Unchanged here and byte-identical -
// re-fetched only because the bucket was renamed: app.css, word-action.js,
// word-action.css, profiles-full.js, door1-workspace.js, door1-workspace.css,
// pdx-issue-family.js, alignment-tool.js, stance-tree.js and issue-colors.js.
// The retired 0-100 Constituents-First score stays deleted and no finance figure
// feeds Direction Match, the formal pattern tiers, the Word vs Action read, the
// publication floor, any alignment read or any Door 2 pick. No Utah citation,
// pack key, Peterson or WRM surface was touched. A twin boot leaves every
// Direction Match read and every formal tier byte-identical.
//
// v149 - A SEAT IS AN OFFICE PLUS A DISTRICT, AND THE ⚖️ CHIP SAYS THE FIGURE
// OR SAYS NO NUMBER. Two things on the Relevant-to-Me section, both of them a
// surface saying more than it could show.
//   THE SEAT KEY. "Currently holds this seat" for the U.S. House on a Layton
// ballot was reported to name a Utah HOUSE member - Box Elder / Cache County -
// beside Blake Moore, because the two records share the numeral 1: Moore holds
// Utah's 1st congressional district and the other holds Utah House District 1.
// Every link in the chain that answers who fills a seat - pdxSeatField, the
// seat's holder list, the browse group, the curated ballot - was audited end to
// end and every one of them already keys on office AND state AND district, and
// the reported symptom does not reproduce on this tree. What the audit did find
// was one latent path: the relevance test that decides which district number a
// record is measured against let a GUESS taken off the office string override the
// chamber classifier that had already placed the record. No shipped record trips
// it today - all 393 records that guess fires on are genuine U.S. House records -
// but a Utah House record whose office read "Utah State House Candidate" would
// have been measured against the reader's congressional district and worn the
// 📍 Local badge four hours from home. The classifier is now decisive and the
// office string survives only as a fallback for a record nothing else could
// place. No classification changed, no district math moved, and the archive
// still files that member under the chamber they actually sit in.
//   THE ⚖️ CHIP. Under the record line, the Word vs Action chip printed the
// verdict's own word - "Backs it up" - on a card in a list, with neither integer
// that sizes it. Mike Lee's read is 84% standing on five tested statements out of
// fourteen on offer, and the card published the grade and withheld the set. The
// chip now prints PDXWordAction.figure()'s own percentage and its own
// "K of M tested", the same object the person file's letterhead chip prints, and
// carries that figure's stamp so the two surfaces cannot drift into two
// arithmetics. It publishes ONLY once figure() reports the tested set has stopped
// growing: a list card has no ledger beside it for a reader to check a figure
// against, so a read that is still warming prints no number at all - a quiet
// "Reading the record…" or "Not tested yet" - and the section's existing warm
// repaint brings the figure in when it is real. Every coverage sentence the
// shared ledger slot already owned prints unchanged, in its own words. The formal
// record line stays ABOVE the chip as the card's claim; nothing sorts, filters or
// thresholds on the two integers, and the chip is still one door to the
// explainer.
//   PRECACHED SHELL FILES CHANGED - THEY ARE THE REASON FOR THE BUMP:
//   · '/app.css'               - the new .rel-sig-den rule, the quieter sibling
//                                span that carries "5 of 14 tested" beside the
//                                percentage. A warm shell has no rule for it, so
//                                the denominator paints at the value span's
//                                weight and colour and reads as a second figure
//                                rather than as what sizes the first.
// ALSO CHANGED BUT RUNTIME-CACHED, SO IT ARRIVES FRESH WITHOUT THIS BUMP:
// compare-hub.js (the office-key ordering in the relevance test, and the ⚖️ chip
// now printing the shared figure behind its settled gate).
// A BUMP RENAMES BOTH CACHE BUCKETS, so it invalidates the whole precached shell
// whether or not this pass touched it. Unchanged here and last moved at v146:
// index.html, door1-workspace.js and door1-workspace.css - the Door 1 desk and
// its stylesheet are re-fetched by this bump and are byte-identical. word-action.js
// is unchanged too: this pass reads figure() and consistency.js behind it, and
// wrote neither.
// No scope gate moved, no cabinet split changed, no record-line prose reworded,
// no TEAM store renamed, no Direction Match floor touched, no party sort, no
// ranking by Direction Match, no nested interactives, and no seat-field district
// math changed. A twin boot leaves every Direction Match read and every formal
// tier byte-identical.
//
// v148 - THE RECORD LINE ON A CARD IS PROSE, NOT MARKUP. v147 gave every
// Relevant-to-Me card the same one-line finding the person file's brief prints,
// and on a live Layton ballot five of them - Lee, Curtis, Moore, Trump, Rubio -
// read one good sentence and then the source of an HTML tag underneath it. The
// two record lanes publish their rows with a `chip` field, and that field is not
// a token: it is the characterisation engine's already-rendered .pdxst-pat span,
// tone variable, role and aria-label included. recordLine() passed it out with
// the sentence, the card escaped everything it printed - correctly, because a
// sentence about "Strong Border & Enforcement" has to survive the ampersand -
// and the escaping painted the tag as text.
//   The fix is not to stop escaping. recordLine() no longer carries the chip at
// all: every field on the object it returns is now documented and asserted to be
// a plain sentence or a token, so a caller cannot get markup out of it by
// accident, and the card's record block is prose end to end. If that tier's
// visual bar is ever wanted on a card it mounts as a SIBLING node from the
// engine's own helper, with its own innerHTML - not inside the sentence.
//   Two smaller corrections travel with it. A U.S. Senator, the President and the
// federal executive no longer wear the 📍 Local pin: that badge means one of the
// reader's OWN local seats, and a statewide or national office is the opposite of
// local - _pdxIsLocalToUser already refused it to the presidency on exactly that
// ground, and the ballot page's own federal grouping now decides it for the rest.
// And "Formal record still loading…" is bounded. It was gated on the brief's
// briefWaitOver alone, which only ends when a record is filed or when the brief's
// own 6s deadline fires - and a list card arms no deadline, so on a request that
// was started and never filed the sentence was permanent: a spinner for the whole
// life of the page about a person whose record was simply empty. It now ends on
// any of three answers - the brief's, consistency.js's published settled answer
// with its own deadline, or a wall clock this line owns - and then prints the real
// pre-office or empty-record sentence instead.
//   PRECACHED SHELL FILE CHANGED - IT IS THE REASON FOR THE BUMP:
//   · '/word-action.js'        - recordLine() returns text only (no `chip`), and
//                                recordLineWaiting() bounds the loading sentence.
//                                A warm shell has the old export, so the chip
//                                comes back out and the card paints the tag
//                                source again, and its spinner never resolves.
// ALSO CHANGED BUT RUNTIME-CACHED, SO IT ARRIVES FRESH WITHOUT THIS BUMP:
// compare-hub.js (the prose-only record block, and the statewide-federal gate on
// the 📍 Local badge).
// A BUMP RENAMES BOTH CACHE BUCKETS, so it invalidates the whole precached shell
// whether or not this pass touched it. Unchanged here and last moved at v146:
// index.html, door1-workspace.js and door1-workspace.css - the Door 1 desk and
// its stylesheet are re-fetched by this bump and are byte-identical. app.css is
// unchanged since v147, which is where the .rel-rec* rules landed.
// No scope gate moved, no seat-field math, no TEAM store, no Word vs Action
// arithmetic and no change to the cabinet split. A twin boot leaves every
// Direction Match read and every formal tier byte-identical.
// v147 - RELEVANT TO ME IS THE CIVIC STACK, AND A CARD READS RECORD-FIRST. The
// v146 scope gate above was too tight in one direction and the cards inside it
// led with the wrong thing. A Layton reader IS governed by the President and by
// the federal executive; they are simply not governed by another state's
// Secretary of State. So the section now answers two questions instead of one:
// what this reader votes on - the seat kinds their own slate names, and inside
// those only their own state's people, with the seat field's answer exempt - and
// what governs every reader: the presidency, held to its current occupant and
// anyone on file running this cycle, and the federal executive, split out of
// Door 1's secretary/director/ambassador bucket into its own group with the
// sixteen state secretaries left behind in the state one. Neither federal group
// is ever a race, ever state-filtered, or ever a pick slot: the ballot is still
// 0 of 11 with fourteen local seats. Judges stay below the workspace, where v146
// put them.
//   And the cards in that section now lead with the formal record. They used to
// open with a headed two-cell scorecard - a reading of the record - above the
// record itself. Each card now prints the same one-line finding the person file's
// brief prints, from the same two lanes in the same precedence, in the row's own
// published words; Word vs Action and the reader's-issues read are demoted to
// two small chips beneath it. A candidate with nothing in office reads "Record
// begins in office", never a voting pattern, and the ⚖️ chip is suppressed there
// rather than repeating that sentence. Nothing on a card claims an empty file:
// the default is "still loading", and the line repaints when the record warms.
//   PRECACHED SHELL FILES CHANGED - THEY ARE THE REASON FOR THE BUMP:
//   · '/app.css'               - the .rel-rec* record line and the .rel-sig*
//                                chip row that replace the retired .rel-dual*
//                                scorecard. A warm shell has the old rules and
//                                none of the new ones, so the record line paints
//                                unstyled under a stylesheet still reserving
//                                space for a two-cell grid.
//   · '/word-action.js'        - recordLine(), the one-line form of the brief's
//                                finding, and shapeRowSay(), the row sentence
//                                extracted so the card and the profile row have
//                                one author. A warm shell has neither export and
//                                the card falls back to no record line at all.
// ALSO CHANGED BUT RUNTIME-CACHED, SO IT ARRIVES FRESH WITHOUT THIS BUMP:
// compare-hub.js (the federal stack, the two new groups, the record-first card
// and the warm repaint).
// A BUMP RENAMES BOTH CACHE BUCKETS, so it invalidates the whole precached shell
// whether or not this pass touched it. Unchanged here and last moved at v146:
// index.html, door1-workspace.js and door1-workspace.css - the Door 1 desk and
// its stylesheet are re-fetched by this bump and are byte-identical.
// No cabinet record deleted, no state officer re-merged into the federal group,
// no party sort, no ranking by Direction Match, no nested interactives, no store
// renamed, and no seat-field district math touched. A twin boot leaves every
// Direction Match read and every formal tier byte-identical.
// ─────────────────────────────────────────────────────────────────────────────
// v151 - THE FIND-THE-RECORD RESULTS PANE HOLDS STILL
// ─────────────────────────────────────────────────────────────────────────────
// The All-Seeing Eye's result list bounced while a query ran. Not one bug: five
// uncoordinated painters (the 60ms keystroke debounce, the immediate focus paint,
// the 420ms warming recheck, refreshOpenPanel on every measures page / lazy
// bundle / retry, and the saved-collection and issue-vote listeners), each one
// doing a full innerHTML replacement of the scroll container - so each paint
// snapped scrollTop to 0 - over a sort (recordFirst, then personalBoost) whose
// inputs were still arriving, so the SAME query ordered its rows differently on
// paint 1, 2 and 3. Rows swapped under the reader's thumb and the pane collapsed
// and re-inflated around them.
//   PRECACHED SHELL FILES CHANGED - THEY ARE THE REASON FOR THE BUMP:
//   · '/index.html'            - the results pane honours a reserved height
//                                (min-height set by the panel's one writer) and
//                                turns off scroll anchoring so the restored
//                                scrollTop is authoritative; .pdx-eye-item gets
//                                a min-height and contain:layout so a late sub
//                                line, a late Word-vs-Action chip or a late
//                                headshot cannot change a row's height; the
//                                avatar box is flex:none with a declared
//                                min-width. Also the Find the Record copy - the
//                                placeholder, the field's aria-label and both
//                                nav tooltips now describe a search over the
//                                archive rather than a roster of politicians. A
//                                warm shell has the old stylesheet, so the
//                                reserved height is ignored and the rows are
//                                free to reflow again.
// ALSO CHANGED BUT RUNTIME-CACHED, SO IT ARRIVES FRESH WITHOUT THIS BUMP:
// all-seeing-eye.js - commit() is now the panel's ONE DOM write and it may
// neither shrink the pane nor lose the reader's scroll position on a refresh;
// holdOrder() freezes the row order a question has already painted so a late
// source can only append; quietRepaint() collapses every non-keystroke painter
// into a single frame and stands down while the reader's own paint is pending;
// setActive() no longer scrolls a row that is already on screen; the measures
// retry asks for data directly instead of by side effect of a paint; the group
// order follows the SHAPE of the question, so the roster leads only a
// name-shaped query and a topic, an office, a state or a county is answered by
// files, families and measures first.
// NOTHING IN THE RECORD MOVED. score(), rank(), recordFirst(), citeFirst() and
// every lane count are untouched - holdOrder reads only the ids a group printed
// last time and no record, party, score or depth. Judges stay in their own lane
// and enter no legislative count. Direction Match, the formal floors, finance,
// the Mandate lane, Door 2 and the Utah ingest are untouched, and a twin boot
// leaves every Direction Match read and every formal tier byte-identical.
// TRAVELS WITH THIS BUMP, UNCHANGED AND BYTE-IDENTICAL. Renaming the buckets
// re-fetches every precached file whether or not this pass touched it, so the
// log owes a reader the list rather than a surprise: door1-workspace.js and
// door1-workspace.css (the Door 1 desk and the stylesheet its slice hides rows
// with), pdx-issue-family.js, stance-tree.js, alignment-tool.js and
// issue-colors.js (the family table, the topic tree, the alignment reader and
// the palette the desk's chips take their hue from), issue-file.js,
// issue-file.css, issue-view.js and pdx-issue-profile.js (the issue file panel,
// its stylesheet, the stage that mounts it and the /i/<key> address that
// resolves it), word-action.js and word-action.css (the Word-vs-Action chip and
// its stylesheet), consistency.js (the Direction Match arithmetic), and
// netlify.toml (the rewrites that serve index.html 200 for /i/*, /b/* and /p/*).
// Not one of them changed here. The only precached file this pass edited is
// index.html; the only other file it edited at all is all-seeing-eye.js, which
// sw.js has always treated as a runtime entry rather than part of the shell.
// A BUMP RENAMES BOTH CACHE BUCKETS, so it invalidates the whole precached shell
// whether or not this pass touched it.
// ─────────────────────────────────────────────────────────────────────────────
// v152 - THE DISTRICT ROOM EXISTS, AND IT IS READ-ONLY UNTIL RESIDENCY IS REAL
// ─────────────────────────────────────────────────────────────────────────────
// New surface: the District Room at /d/<districtKey>/<issueKey> - verified-
// residency neighbours in ONE district talking about ONE issue. Reading is
// public; writing goes through /api/district-room into the phase 0 dd_* tables
// and is refused on no district, an unknown district, an unknown issue, an
// unverified session, a session verified for a DIFFERENT district, and an empty
// body. RESIDENCY IS A LABELLED STUB IN THIS PASS: this repo has identity
// (Firebase) but no residency verifier anywhere in it, so residencyClaim()
// returns verified:false for every caller, the composer renders for NOBODY, and
// the closed note says so out loud instead of implying a check happened.
//   PRECACHED SHELL FILES CHANGED - THEY ARE THE REASON FOR THE BUMP:
//   · '/'  (index.html)        - the non-blocking district-room.css pair and the
//                                deferred district-room.js tag. A warm shell has
//                                neither, so a /d/<district>/<issue> arrival on
//                                an old shell resolves the rewrite and then finds
//                                no module to open the room - the reader lands on
//                                the homepage after following a citation.
//   · '/issue-file.js'         - headHtml() now prints mount (b), the entry block
//                                on the letterhead. A warm shell paints the
//                                letterhead without it, so the issue file offers
//                                no way into the room for the reader's own
//                                district. The LEDGER HOST IS UNTOUCHED and still
//                                byte-identical to PDXDoor1.issueProfile(key).
//   · '/district-room.js'      - NEW on this list, and its stylesheet with it.
//   · '/district-room.css'       The pair is precached for the reason issue-file's
//                                pair is: an unstyled room is a full-bleed block
//                                of loose text on top of the page, and a device
//                                holding the address rewrite but not the module
//                                is a device that resolves /d/* and shows the
//                                homepage.
// ALSO CHANGED BUT NOT PRECACHED, SO IT ARRIVES FRESH WITHOUT THIS BUMP:
// who-represents-me.js (mount (a), a SIBLING of each district seat row for the
// same nesting reason the compare control is one - it degrades to nothing when
// district-room.js is missing), netlify.toml (the /d/* 200 rewrite that fixes the
// URL shape), netlify/functions/district-room.mts and
// netlify/lib/district-room-core.mjs (the write gate and the pure decision it is
// a wrapper over), scripts/test-district-room.mjs (the suite entry that pins the
// four refusals, the one allow and the empty-room copy).
// NOTHING IN THE RECORD MOVED, AND THE ROOM CANNOT REACH IT. The dd_* tables
// carry no score, no party, no ranking and no count column, and no room read
// touches vr_*, cee_*, pdx_forum_*, Direction Match, Word vs Action, the formal
// floors, finance, the Mandate lane, the Eye, the Utah ingest or pack TTL. A room
// is keyed on (district, issue) and never on a pid, so it is not a comment thread
// on whoever holds the seat; posts from another district are not readable in it;
// there is no like, no sort control and nothing that could order it; and no party,
// caucus or team language appears anywhere in the surface. No migration: every
// column the UI writes already existed at phase 0. A twin boot leaves every
// Direction Match read and every formal tier byte-identical.
// TRAVELS WITH THIS BUMP, UNCHANGED AND BYTE-IDENTICAL. Renaming the buckets
// re-fetches every precached file whether or not this pass touched it, so the log
// owes a reader the list rather than a surprise: door1-workspace.js and
// door1-workspace.css (the Door 1 desk and its stylesheet), pdx-issue-family.js,
// stance-tree.js, alignment-tool.js and issue-colors.js (the family table, the
// topic tree, the alignment reader and the palette), issue-file.css,
// issue-view.js and pdx-issue-profile.js (the issue file's stylesheet, the stage
// that mounts it and the /i/<key> address that resolves it - issue-file.js itself
// DID change, and is listed above), word-action.js and word-action.css (the
// Word-vs-Action chip and its stylesheet), consistency.js (the Direction Match
// arithmetic), and all-seeing-eye.js (Find the Record's panel, which sw.js has
// always treated as a runtime entry rather than part of the shell). Not one of
// them changed here. netlify.toml changed - it carries the new /d/* rewrite - but
// it is served at the edge and is not a precached file, so it arrives with the
// deploy rather than with this rename.
// A BUMP RENAMES BOTH CACHE BUCKETS, so it invalidates the whole precached shell
// whether or not this pass touched it.
// ──────────────────────────────────────────────────────────────────────────────
// v169 - ONE UNREAD CRUMB OUTRANKED SEVEN SOURCED SENTENCES
// ──────────────────────────────────────────────────────────────────────────────
// v168 gave a person with no term a word-first letterhead, and then handed the
// whole class back to the record on a technicality. The SAID brief only mounted
// when the formal pattern index held zero readable acts, so a single mapped row -
// unread, no side taken, nothing on it read as a direction - was enough to keep
// the record-first hero. /p/lyman still opened with "1 issue on the formal record
// - 0 votes and formal actions read - 0 deep enough to characterise": three
// counts, two of them zero, the third a crumb, printed as the headline over seven
// cited stance cards that were pushed below the fold. A reader met an apology for
// an empty record instead of the material the file actually holds.
//   WHAT CHANGED IS THE GATE: /word-action.js now decides the letterhead on acts
// rather than on rows. saidNoTerm(pid) asks the index for characterised acts and
// for acts read with a side, and calls the lane empty when both are zero and
// every row on it is inert - no side taken, nothing pending. It deliberately does
// not ask whether a row was READ, because a read quoted from the member's own
// stated positions is a characterisation of the word lane, not evidence of a
// formal term, and that third rung is exactly what was holding the old veto open.
// The rest of the gate is unchanged: the payload must have landed as an array, at
// least one CITED card must exist, and the empty-brief legality check still
// stands, which is why chew_h68 - a record in the shipped formal index with no
// rows in this reader - keeps its record-first brief.
//   AND ONE MAPPING GHOST IS GONE: /consistency.js no longer backfills an issue
// for lyman's "carried his public lands fight from protest into the statehouse"
// spotlight item. That item is a pattern summary with no measure, no ballot, no
// date and a biography for a source - the kind of item this map's own rule
// excludes - and it was the whole of the "1 issue on the formal record" count.
// Nothing was deleted: the spotlight item itself is untouched and still reads in
// its own lane. No act was invented for anybody, and lyman's formal index now
// honestly reports zero rows.
//   THE EVIDENCE SURFACE SAYS IT ONCE: /gaps.js stops listing every mapped issue
// as an OPEN GAP or a SUGGEST A LEAD for this class, which read as though a
// candidate had ducked votes they were never eligible to cast. One band, one
// sentence - "No formal term to test yet - N documented positions, 0 acts on
// file." - and the askable count drops those rows, so the inventory stops
// advertising fourteen gaps nobody can close. /profile-spine.js runs the two-jobs
// explainer off the same predicate: on this class the word is the main view, and
// the record paragraph now says there is nothing on it to test yet rather than
// implying a missing one.
//   A BUMP RENAMES BOTH CACHE BUCKETS, so the whole precached shell arrives fresh
// whether or not this pass touched it, and the log owes a reader the list rather
// than a surprise: /word-action.css (the side word and the brief's rail),
// /stance-tree.js, /alignment-tool.js, /issue-colors.js and /pdx-issue-family.js
// (the topic tree, the alignment reader, the palette and the family table),
// /issue-file.js, /issue-file.css, /issue-view.js and /pdx-issue-profile.js
// (the issue dossier the brief's doors open, its stylesheet, the stage that
// mounts it and the /i/<key> address that resolves it), /door1-workspace.js and
// /door1-workspace.css (the Door 1 desk and its stylesheet), /index.html (the
// shell itself) and /all-seeing-eye.js (Find the Record's panel, which sw.js
// treats as a runtime entry rather than shell). Not one of them changed here.
// netlify.toml did not change either, and it is served at the edge rather than
// precached, so no rewrite travels with this rename.
//   WHAT IT REFUSES: no percentage, because one half of Word vs Action still
// publishes no figure for a file with no acts; no row labelled RECORD or PATTERN;
// no formal direction invented to fill the lane; and no record-first file moved -
// cox reads on the executive lane, lee's roll calls carry sides, and chew_h68 and
// grant_pace read exactly the brief they read before. NO WEIGHT, MAPPING OR LANE
// MOVED, and a twin boot leaves every formal tier and every Direction Match read
// byte-identical.
// A BUMP RENAMES BOTH CACHE BUCKETS, so it invalidates the whole precached shell
// whether or not this pass touched it.
// ──────────────────────────────────────────────────────────────────────────────
// v168 - A PERSON WITH NO TERM WAS INTRODUCED BY THREE THINGS HE DOES NOT HAVE
// ──────────────────────────────────────────────────────────────────────────────
// /p/lyman opened like a sitting member whose file had gone missing. The kicker
// said "record still being built". The brief under it headlined THE FORMAL RECORD
// and counted one issue on it, zero votes read. Word vs Action, a screen later,
// said "not enough on file". Three absences in a row, and a two-jobs explainer
// underneath still calling the record the main view - for a man who has never
// held the office and therefore has no roll call to be missing. Seven sourced
// stance cards sat on the same page, below the fold, each with a citation. The
// material a reader came for was already there; the letterhead was reporting its
// absence instead.
//   WHAT CHANGED: when the formal pattern index holds zero READABLE acts and at
// least one CITED stance card, the identity zone now leads with a SAID brief -
// the same rows, rail and doors as the strongest-pattern brief, carrying the word
// instead of the record. Issue chip, the card's own side word, the tag SAID, four
// to six of them, a door each into that issue's dossier, one line saying "No roll
// call or signed act on file. These are documented positions, not a voting
// pattern.", and a door to all stated positions. Four precached shell assets
// carry it: /word-action.js (the gate and the brief), /word-action.css (the side
// word, in house grey), /stance-tree.js (showFilter, so the overflow door can put
// the topic tree in its stated view) and /profile-spine.js (the two-jobs note,
// word-first for this class). /cmp-data.js changed too - Phil Lyman's office row
// said Governor Candidate and he is running for UT-3.
//   AND ONE FILE THAT IS NOT PRECACHED: /publication-floor.js now resolves stance
// keys through the same alias chain stance-helpers uses, because lyman's seven
// citations are filed under phil_lyman and the floor was reading zero cited
// positions for a file that renders seven cards. It is a runtime entry rather
// than a shell asset, and that bucket is named after this constant, so the bump
// is what carries it to a warm device.
//   WHAT IT REFUSES, AND WHY THE BUMP IS NOT OPTIONAL: no percentage, because one
// half of Word vs Action publishes no figure; no row labelled RECORD or PATTERN
// and no record chip borrowed, because a stated side is not a verdict; no side
// inferred from party, every word read off the card's own resolved stance; and no
// record-first file moved - cox, lee and chew_h68 read exactly the brief they read
// before. A device holding v167 would take the new cmp-data.js and the new floor
// while still painting the old letterhead, which is the same three absences over
// a file the rest of the shell has already agreed to publish. NO WEIGHT, MAPPING
// OR LANE MOVED, no formal direction was invented for anybody, and a twin boot
// leaves every formal tier and every Direction Match read byte-identical.
// A BUMP RENAMES BOTH CACHE BUCKETS, so it invalidates the whole precached shell
// whether or not this pass touched it.
// ──────────────────────────────────────────────────────────────────────────────
// v167 - A CANDIDATE WITH NO VOTES HAD A PLATFORM NOBODY WROTE DOWN
// ──────────────────────────────────────────────────────────────────────────────
// The word lane is the whole file for a challenger, a statewide hopeful and a
// first-term member whose roll calls have not been ingested. Fifteen Utah records
// on a 2026 ballot field hold zero formal rows between them, and the stance cards
// standing in for that record were carrying sentences with no citation under them
// - a few of them sentences no source says at all. "A constitutional conservative
// who opposes new firearm restrictions" is a party read printed as a person's
// position, which is the one inference this file's doctrine refuses.
//   WHAT CHANGED IS ONE DATA FILE: /politician-stances-ext.js, the lazily-loaded
// half of the stance table. Seven people in it - phil_lyman, rob_bishop,
// jackie_larson, grant_pace, emily_buss, john_arthur and leah_hansen - now carry a
// campaign issues page, a dated on-the-record interview or their own nomination
// statement on every card that makes a claim, and eight cards that rested on
// nothing were removed rather than dressed. politician-stances-core.js is
// byte-identical: none of the seven lives in it.
//   THE EXT CHUNK IS NOT IN SHELL_ASSETS, so it is not precached - but it is a
// same-origin GET, so a warm device holds it in the stale-while-revalidate
// RUNTIME_CACHE, whose bucket name is keyed to this constant. Without the bump a
// reader on an old device keeps being served the uncited sentences this pass
// removed, on people for whom the word lane is the only lane there is.
//   NO FORMAL ROW WAS READ, ADDED OR INFERRED. Not one card here is authored from
// a roll call, a scorecard or a party platform, so nothing enters the record-
// derived holdout and no Direction Match denominator moves. All fifteen worklist
// records still report zero formal rows, and their formal lane stays empty on
// purpose: these people have not served. A twin boot leaves every formal tier and
// every Direction Match read byte-identical.
// A BUMP RENAMES BOTH CACHE BUCKETS, so it invalidates the whole precached shell
// whether or not this pass touched it.
// ──────────────────────────────────────────────────────────────────────────────
// v166 - A GOVERNOR DID NOT VOTE, AND THE SENTENCES AROUND THE CARDS SAID HE DID
// ──────────────────────────────────────────────────────────────────────────────
// v165 put a governor's signed and vetoed bills on the formal record and labelled
// the cards Signed and Vetoed. It left the prose between them written for a floor.
// A reader on /p/cox with 'Tough on Crime' open met eleven correctly labelled acts
// wrapped in three roll-call sentences: "On 🚔 Tough on Crime A YEA counts as
// support for the issue's direction, and they signed" - a polarity lesson about a
// ballot that is not in the record, attributed to someone who was never on a
// floor; a door reading "See all 11 mapped VOTES on 🚔 Tough on Crime" over a list
// of signatures; and a note explaining that "A ROLL CALL carries its question, its
// ballot and its source" printed above a list holding no roll call, no question
// and no ballot.
//   ONE PRECACHED SHELL FILE CHANGED: '/consistency.js'. The polarity line now
// reads "this measure passing counts as support for the issue's direction, and
// they signed it", the door counts "mapped acts" (and offers "Open this act in the
// full record" where the issue holds one), and the roll-call note is not printed
// where there is no roll call to explain. What it did already read "Signed." and
// was not touched - a position item never picks up a floor question, so that line
// could not have been wrong.
//   WHY THE BUMP IS NOT SKIPPABLE. The copy and the cards it surrounds ship in the
// same file, so a device holding v165 renders the old wording against the same
// rows - which is exactly the mismatch that was reported.
//   TWO PREDICATES CARRY IT, BOTH FAILING CLOSED to the congressional wording:
// _isExecAct() reads the act key off the shared act table in stance-helpers.js
// (unchanged), and _anyRollCall() asks _anyBallot() about the issue's own items.
// _isExecAct is an explicit pair rather than "anything that is not a floor vote"
// on purpose: a COMMITTEE VOTE is a ballot the member cast, where "a Yea counts
// as" is the correct lesson, so widening it would have rewritten legislators'
// committee and co-sponsorship rows too. The row-level gate and the list-level
// gate stay separate, which is what makes a mixed list behave - one roll call and
// one signature keeps the note and the "votes" noun, and the signature beside it
// still refuses the ballot vocabulary.
//   NO WEIGHT, MAPPING, SUPPORT MEANING OR DIRECTION MATCH MEMBERSHIP MOVED, and
// no act changed lane, order or direction. The ✒️ federal executive lane is not in
// this pass at all: both doors return '' on lane === 'exec' by design and still
// do, and it never carried the roll-call note. Every one of trump's 37 exec-lane
// dossiers is asserted unchanged in scripts/test-vr-utah-exec.mjs section 12,
// alongside cox's eleven act rows, three injected roll-call rows on a legislator
// and the mixed list.
// ALSO CHANGED BUT NOT PRECACHED, SO IT ARRIVES FRESH WITHOUT THIS BUMP:
// scripts/test-vr-utah-exec.mjs (section 12, which reads the rendered dossier
// rather than the source), scripts/test-eye-find-the-record.mjs (its pin on this
// file, re-declared over the lane router and the panel's entry point rather than
// the whole file) and db/vr-ingest-runbook.md (what each of the three sentences
// said before and after, and why the act test is an explicit pair).
// A BUMP RENAMES BOTH CACHE BUCKETS, so it invalidates the whole precached shell
// whether or not this pass touched it. Nothing else changed here, and the log owes
// a reader the list rather than a surprise: index.html, all-seeing-eye.js,
// door1-workspace.js, door1-workspace.css, pdx-issue-family.js, stance-tree.js,
// alignment-tool.js, issue-colors.js, issue-file.js, issue-file.css, issue-view.js,
// pdx-issue-profile.js, word-action.js, word-action.css, stance-helpers.js and
// formal-index.js are all re-fetched here without having changed.
// ──────────────────────────────────────────────────────────────────────────────
// v164 - A NAME IS MATCHED AT ITS EDGE, AND ONE FACE ON FILE WAS SOMEBODY ELSE
// ──────────────────────────────────────────────────────────────────────────────
// Two readings of a person that were not readings of that person at all, and one
// menu row that was already there.
//   TYPING "cox" LED WITH WILCOX. A name hit in the All-Seeing Eye was a raw
// substring test, so "cox" matched Ryan D. Wilcox exactly as strongly as it
// matched Governor Spencer Cox - and the formal lane then broke the tie the way it
// is supposed to, on whether a formal record is on file. Wilcox holds a seeded
// state record and a governor casts no roll calls, so recordFirst() hoisted the
// person whose name merely CONTAINS the query above the person whose name IS it.
// Nothing was mis-ranked by its own rule; the rule was being handed a match that
// should not have been one.
//   The fix is a lane, not a score. nameEdge()/nameLane()/nameEdgeSplit() in
// all-seeing-eye.js partition the roster answer AFTER ranking into the people
// whose name starts a word with what you typed and the people who only carry it
// inside a longer word, and the second group prints under its own heading, "Also
// in the name", with a sentence saying plainly that these are not who you typed.
// score() and rank() are BYTE-IDENTICAL to the previous revision, recordFirst()
// is unedited and now simply runs inside each group instead of across both, and no
// party string entered a sort key anywhere. THE SPLIT ONLY HAPPENS WHEN THERE IS
// SOMETHING TO LEAD WITH: if nobody matches at a word edge - "man", "ell", any
// fragment query - the list is returned exactly as it was ranked, because a
// secondary group above an empty primary one would be a worse answer than the
// substring match it replaced.
//   AND /p/kennedy WORE THE WRONG PERSON'S FACE. Mike Kennedy, UT-03, is Bioguide
// K000403. The live roster document filed him with K000404 - Kimberlyn King-Hinds,
// the delegate for the Northern Mariana Islands - one digit away, and an image
// that LOADS, so no onerror fired, no monogram appeared, the share card proxied it
// happily, and her portrait printed over his record. PROFILES[pid].photo outranks
// every bundled tier in _getPhotoUrl(), which is the right order and the reason
// BROWSE_PHOTOS could not repair it: the curated map already held the correct
// K000403 url and was losing to the roster. firebase-boot.js now carries
// PDX_PHOTO_FIX and applies it to every document as it lands - the light index,
// the full-collection fallback and the lazy full fetch - so the letterhead, the
// quick-view, the cards, the Eye's rows and the share proxy are all corrected from
// one place. NO SECOND PID, no alias, no new image host: the value is the official
// congressional portrait on a host already in the trusted set, and
// scripts/test-photo-coverage.mjs pins the correction to BROWSE_PHOTOS, to the
// ALLOWED host set and to every PROFILES write site, so the three copies cannot
// drift and a future ingest path cannot quietly skip the corrector. Nothing else
// on the document is touched - name, office, party, district, tenure and every
// formal-record field arrive as the roster sent them, and no gender was inferred
// from the file that was wrong.
//   THE ACCOUNT MENU ALREADY OPENED YOUR FILE, and this pass left it that way.
// The signed-in dropdown in compare-hub.js prints a real <a href="#your-file">
// with data-pdxyf-open in both the desktop rows and the mobile account block, and
// your-file.js owns that address, so the avatar reaches the SAME eight-issue
// overlay Who Represents Me opens. No second form was built, no ninth row was
// added and no nav pill appeared.
//   FILES CHANGED, AND WHY THE RENAME IS PART OF THE FIX. None of the three is a
// precached shell asset - they are stale-while-revalidate RUNTIME entries, and the
// runtime cache name carries CACHE_VERSION, which is exactly why this bump is not
// bookkeeping: a warm device would keep serving the old copies beside a fresh
// document and the pass would read as not shipped.
//   · all-seeing-eye.js       - the name-edge lane, the "Also in the name" group
//                              and its note, and the paint-order hold for it. The
//                              stale copy is the panel that led with Wilcox.
//   · firebase-boot.js        - PDX_PHOTO_FIX and _pdxFixPhoto(), applied at the
//                              three PROFILES ingest sites. The stale copy is the
//                              one that decides which face the person file paints.
//   · compare-hub.js          - the kennedy BROWSE_PHOTOS entry now carries the
//                              K000403-vs-K000404 collision in writing, so the
//                              value is never re-derived from a neighbouring id.
//                              The account-menu rows are unchanged.
// index.html itself did not change in this pass - it is precached as '/' and is
// named here because the panel and the roster boot it loads did move, and a
// navigation is stale-while-revalidate, so the document and its scripts have to
// come out of the same generation of cache or the fix reads as not shipped.
// DIRECTION MATCH DID NOT MOVE, and neither did anything it is computed from: no
// stance, weight, issue key or alignment read was touched, the formal-record
// ranking and the party filters are exactly as they shipped, and Forum, the
// District Room, the floors, the offline pack and DM were not opened.
// A BUMP RENAMES BOTH CACHE BUCKETS, so it invalidates the whole precached shell
// whether or not this pass touched it.
// ──────────────────────────────────────────────────────────────────────────────
// v165 - A GOVERNOR'S FORMAL RECORD IS SIGNED BILLS AND VETOED BILLS
// ──────────────────────────────────────────────────────────────────────────────
// v163 stopped /p/cox printing a Word-vs-Action percentage over a formal lane that
// was empty. It was the right silence and it was still a silence: the 🏛 brief said
// "No formal pattern on file yet" about a governor who had signed 1,104 bills and
// vetoed 13 across two Utah general sessions. The lane was empty because the
// pattern engine only ate floor votes, committee votes and sponsorships, and a
// governor casts none of those. THE FILE FOR THAT OFFICE IS SIGNATURES AND VETOES,
// and this pass ingests them: 140 recorded gubernatorial acts - 138 signed, 2
// vetoed - each one a bill number, a date and a le.utah.gov citation, on the 140
// Utah measures that already carry a human-reviewed issue mapping.
//   TWO NEW ACT TYPES, DELIBERATELY NOT THE PRESIDENT'S. gov_signed and gov_vetoed
// enter the stance-helpers act table at 0.70, labelled "Signed" and "Vetoed",
// ranked below a floor roll call (1.00) and above a committee vote (0.60). The
// pre-existing federal 'signed' / 'vetoed' / 'issued' types are UNTOUCHED and stay
// out of that table, which is what keeps a president routing to the separate ✒️
// Executive Enactment Record: reusing them would have double-counted 12 federal
// enactment measures into the 🏛 lane and relabelled the ✒️ one. /p/trump reads
// byte-identically - the lane, the ratio and the 71% are the same objects.
//   NEITHER ACT IS A VOTE, AND NO SURFACE MAY CALL IT ONE. They are vr_positions
// rows: no roll call, no member vote, no seat in Direction Match, no ballot verb in
// any of the three phrasings a row can print ("Signed", "signed bill", "signed
// bills" / "Vetoed", "veto", "vetoes"). Depth only, in the record lane only - the
// same wall committee votes and sponsorships already stand behind.
//   THE SECOND SILENCE, WHICH IS NEW. A lane that is ON FILE is not a lane that
// TESTS SOMETHING. All 140 acts are recorded and not one of them yet lines up with
// a documented Cox position, so publishing a ratio off the pledge ledger alone
// would have reproduced v163's 56% with a full lane as its alibi. read() now holds
// a second veto beside the first: `laneUntested` fires when the lane is positively
// readable and nothing in the tested set rests on a formal act, and the ⚖️ block
// prints NO_TESTED_FORMAL_COPY instead of a number. It asks the three indexes
// DIRECTLY rather than through formalLaneReadable(), which fails OPEN by design -
// a fetch in flight must never be read as "tests nothing". Same scope as the first
// veto (castsNoFloorVotes), so no legislator is reachable by either.
//   NOBODY WAS GUESSED. le.utah.gov never prints the governor's name on a bill
// action - it prints "Governor Signed" and a code - so the identification is
// (session, office) → roster id in db/vr-utah-exec-map.json, accepted by a human
// and failing closed. The Lieutenant Governor, the Attorney General and the other
// statewide execs are on the roster with NO key, on purpose: those offices neither
// sign nor veto, their lanes stay empty, and v163's empty-office sentence is still
// the correct thing on those pages. Line-item vetoes (GVETOLI, the bill became law)
// and "Became Law w/o Governor Signature" (GNOSIGN, the absence of an act) are
// refused by design; 977 signed and vetoed acts on bills with no reviewed mapping
// are refused as unmapped and characterise nothing.
//   NO FLOOR MOVED. MIN_TESTED_ITEMS is still 3, MIN_TESTED_WEIGHT still 4, and
// _RD_MIN_STRENGTH / _RD_THIN_MIN_STRENGTH / _RD_LEAN_MIN_STRENGTH / _RD_FLOOR_LED
// are where waves 1-3 left them. A twin boot against HEAD leaves lee, chew_h68,
// defay_h15 and trump identical on the Word-vs-Action read, the record verdict,
// the lane routing and every per-issue formal tier.
//   PRECACHED SHELL FILES CHANGED - THEY ARE THE REASON FOR THE BUMP:
//   · '/stance-helpers.js'     - the two act-table rows, their place in
//                                _ACT_ORDER and their nouns. A warm shell has an
//                                act table with no gov_signed in it, so every
//                                gubernatorial row it is handed reads as
//                                unclassified and the brief stays mute.
//   · '/word-action.js'        - the second veto (formalActsTestNothing,
//                                untestedFormalLane), NO_TESTED_FORMAL_COPY and
//                                the hero sub-line. Without it a warm device
//                                paints a pledge-ledger percentage over the newly
//                                full lane, which is the v163 bug with a better
//                                disguise.
//   · '/consistency.js'        - the row wording for the two acts and the
//                                doctrine note on _anyWeighedAct that keeps the
//                                federal three out of the act table.
//   · '/formal-index.js'       - cox gains 'cox': [140, 140]. This is the file the
//                                lane gates ask, so an old copy of it is exactly
//                                the state where the acts exist and no surface
//                                will open them.
// ALSO CHANGED BUT NOT PRECACHED, SO IT ARRIVES FRESH WITHOUT THIS BUMP:
// compare-hub.js (the ledger slot's untested-lane sub-line) - a
// stale-while-revalidate runtime entry - netlify/functions/voting-record.mts (the
// two POS_LABEL entries, server-side), the 20261102000000_vr_utah_exec_e1 migration
// and its three db/ JSON files, db/vr-ingest-runbook.md, the harnesses
// (scripts/test-vr-utah-exec.mjs, scripts/test-wva-empty-formal-lane.mjs), and
// sitemap.xml, which gains exactly one <url>: H.B. 306 becomes an openable bill
// address the moment its measure row exists, and the committed sitemap is checked
// against the data rather than regenerated at deploy time.
// NOTHING ELSE MOVED. No party score, no package percentage, no invented stance,
// no House or Senate roll attached to a governor, and no pledge-ledger item turned
// into a formal act. Your file, Forum, the District Room, District Voice, pack
// TTL, the Kennedy photo and search rank were not opened.
// A BUMP RENAMES BOTH CACHE BUCKETS, so it invalidates the whole precached shell
// whether or not this pass touched it.
// ─────────────────────────────────────────────────────────────────────────────
// v163 - AN EMPTY FORMAL LANE CANNOT CARRY A WORD VS ACTION PERCENTAGE
// ─────────────────────────────────────────────────────────────────────────────
// /p/cox printed two facts about one record, a screen apart. The 🏛 brief said,
// correctly, "No formal pattern on file yet." The letterhead and the ⚖️ block said
// "56% Word vs Action · 9 of 25 tested" with a MIXED RECORD chip beside it. A
// governor casts no roll calls, and until Utah signed/vetoed ingest lands there
// are no ✒️ executive acts on file for one either - so the percentage was not a
// reading of a formal record at all. All nine tested items came from the PLEDGE
// LEDGER, where testOf() resolves a tracked promise from its own kept/broken
// verdict and never consults officialRecord(). Five kept over nine resolved is
// 55.6%, which is the number that shipped. The arithmetic was right; the record it
// claimed to be over was not there.
//   THE FIX IS ONE VETO AT THE ONE OWNER. read() now asks whether a formal lane
// exists for the pid at all before it publishes anything, and every downstream
// face - the letterhead chip, the hero ring, the ⚖️ number, the search row, the
// compare slot, the record card - goes quiet through the `publishable` gate it
// already reads. FOUR OWNERS ARE ASKED AND ANY OF THEM SAYING YES IS ENOUGH: the
// formal-pattern index (any row, not just a `read` one), the executive lane's own
// index, the generated PDXFormalIndex act counts, and the read's own tested set.
// /p/trump carries 37 pattern rows, none of them `read`, over 34 readable
// executive acts - gating on `read` alone would have deleted a president's
// legitimate 71%, which is floor-lowering pointing the other way.
//   AND THE OFFICE HAS TO CAST NO FLOOR VOTES, or the gate does not apply. An
// empty index is two different facts depending on the office: for a governor it is
// the standing state of the world, for a senator it is a fetch still in flight,
// because roll calls are fetched per member and any page that renders before that
// resolves reads zero rows. Firing there would have printed "this office's formal
// acts are not on file yet" onto a member of Congress whose votes were in the air.
// The scope is requirement 2's own - "any statewide exec" - and legislative and
// local titles take themselves out of it first, so "State Senate President" and a
// school-board seat are never read as executive.
// NO FLOOR MOVED, IN EITHER DIRECTION. MIN_TESTED_ITEMS is still 3 and
// MIN_TESTED_WEIGHT is still 4. No House or Senate vote was invented for a
// governor, no stance was mapped into a formal act, and the pledge ledger is still
// counted as coverage - it just cannot be the whole test any more. Swept over the
// shipped roster of 1120 profiles, not one published percentage moved.
//   PRECACHED SHELL FILES CHANGED - THEY ARE THE REASON FOR THE BUMP:
//   · '/word-action.js'        - formalLaneReadable() and its four readers,
//                                castsNoFloorVotes() and the scope it holds, the
//                                `laneEmpty` veto in front of the two floors, the
//                                reviewed sentence (NO_FORMAL_LANE_COPY) in
//                                thinCopy() and the ring's own sub-line.
//                                Precached, which is how a warm device would
//                                otherwise keep painting 56%.
// ALSO CHANGED BUT NOT PRECACHED, SO IT ARRIVES FRESH WITHOUT THIS BUMP:
// compare-hub.js (window._pdxLedgerSlot now says "No formal record on file" before
// it counts tested items, so nine resolved pledges no longer read as "Not enough
// record yet") - a stale-while-revalidate runtime entry - and
// scripts/test-wva-empty-formal-lane.mjs, which pins all of it.
//   FIVE EXISTING HARNESSES HELD PINS THAT ONLY EVER STOOD IN FOR A CLAIM, and
// the pins are re-declared rather than loosened. scripts/v103-chrome-seams.mjs
// carries the six spans this pass adds to word-action.js as named WA_SEAMS, so
// every wave suite still compares the whole rest of that file byte for byte
// against HEAD and each span is ARGUED - both floors are asserted inside the veto
// span character for character, and the only shape the new term may take is a
// negated conjunction, which can subtract a percentage and never add one.
// test-stance-worklist pinned the publication line whole and now pins both floor
// comparisons and both constants with the same allowance. test-eye-find-the-record
// held word-action.js on a whole-file do-not-touch list and now freezes the three
// entry points the All-Seeing Eye panel actually calls. The two roster-wave
// suites that keep a declared-file list name the two harness files this pass
// touched.
// A BUMP RENAMES BOTH CACHE BUCKETS, so it invalidates the whole precached shell
// whether or not this pass touched it.
// ─────────────────────────────────────────────────────────────────────────────
// v162 - YOUR FILE OPENS FROM ITS ADDRESS
// ─────────────────────────────────────────────────────────────────────────────
// v161 shipped the overlay and one control, and #your-file still painted the
// homepage. The address was REACHABLE and it did not OPEN. The module's arrival
// was a setTimeout(0) plus a 'load' listener, and a macrotask runs after every
// DOMContentLoaded handler on a 2 MB document - so a pasted /#your-file resolved
// its hash long before your-file.js looked at one. There was also no visible way
// in for most readers: the only "Your file" control lived in .wrm-cold, and
// `.wrm[data-located] .wrm-cold{display:none}` hides that band for everyone whose
// location the app already knows, which is every returning visitor.
// The panel now opens SYNCHRONOUSLY the moment the deferred module parses,
// through the same arrive() that hashchange and popstate call, and it waits on
// nothing: not the roster, not auth, not the alignment engine. A close restores
// whatever address the reader came from, read off the hashchange's oldURL rather
// than only off a click the module saw, so an ordinary anchor is enough.
//   PRECACHED SHELL FILE CHANGED - IT IS THE REASON FOR THE BUMP:
//   · '/' (index.html)         - the .wrm-next-btn rule is anchor-safe now, so
//                                the new link matches its sibling buttons.
//   ALSO CHANGED, RUNTIME-CACHED UNDER THE VERSIONED NAME RATHER THAN PRECACHED:
//   · '/who-represents-me.js'  - prints "Your file" in the RESOLVED action row,
//                                beside Compare them on an issue / Work your
//                                ballot / My local officials. This is the fix for
//                                the band having no control at all.
//   · '/compare-hub.js'        - the same href in the signed-in account menu,
//                                desktop dropdown and mobile strip.
//   · '/your-file.js'          - the arrival, and nothing else about the file.
// The RUNTIME cache name carries CACHE_VERSION too, so this bump is what stops a
// warm device serving those three modules from the v161 shell while it reads the
// new page. ALSO CHANGED AND NOT A SERVED FILE: scripts/test-your-file.mjs.
// EIGHT LOCKED ISSUES, COPY UNCHANGED, AND NOTHING ELSE MOVED. The overlay still
// says "Your positions. Used to compare formal records. Not a vote. Not a
// district poll.", still offers Support / Oppose / Mixed / Not sure on the same
// eight hard-coded keys, and signed out still shows all eight disabled. Nothing
// here touches Direction Match, Word vs Action, consistency.js, the formal
// floors, the record, the Forum, the District Room, the Utah ingest or pack TTL.
// Not one of the other precached files changed: door1-workspace.js,
// door1-workspace.css, pdx-issue-family.js, stance-tree.js, alignment-tool.js,
// issue-colors.js, issue-file.js, issue-file.css, issue-view.js,
// pdx-issue-profile.js, word-action.js, word-action.css and all-seeing-eye.js are
// byte-identical here, and netlify.toml did not move either - a bump renames both
// cache buckets, so the log owes a reader that list rather than a surprise.
// A BUMP RENAMES BOTH CACHE BUCKETS, so it invalidates the whole precached shell
// whether or not this pass touched it.
// ─────────────────────────────────────────────────────────────────────────────
// v161 - YOUR FILE: THE READER'S OWN EIGHT, AND THE MATCH READS THEM FIRST
// ─────────────────────────────────────────────────────────────────────────────
// Alignment and every ballot comparison in this app need one fact the app had
// nowhere honest to hold: WHERE THE READER STANDS. Two surfaces looked like they
// were asking and neither was. A Forum chip is a thread's topic - what a
// conversation is about, not a position anybody holds. The District Room poll is
// (district x issue), tallied, behind residency - a neighbourhood's answer to one
// question, not a personal file and not portable to a candidate comparison. So
// the reader's own side was either absent or inferred, and the Alignment
// Signature - a bare set of picked issues - was the closest thing to it.
// Your file is the third thing, at #your-file, and it is deliberately the small
// one: EIGHT issues, one answer each (Support / Oppose / Mixed / Not sure), saved
// to the signed-in uid. Not a survey, not a quiz, not a score. ISSUE_MAP carries
// 100-odd keys and the list here is eight of them, hard-coded - the file does not
// read the vocabulary, so it cannot grow a ninth row, and a snapshot pulled from
// another device carrying one has it dropped on the way in.
//   PRECACHED SHELL FILES CHANGED - THEY ARE THE REASON FOR THE BUMP:
//   · '/' (index.html)         - the your-file.css link, the deferred
//                                /your-file.js tag (after alignment-tool.js,
//                                because the projection calls into it), the one
//                                "Your file" control added to the EXISTING Who
//                                Represents Me action row, and 'yourFile' added
//                                to both account-sync collection lists. A warm
//                                shell loads neither file, so the overlay does
//                                not exist and the control opens nothing; it
//                                also would not sync the collection.
//   · '/alignment-tool.js'     - one 10-line insertion, and no scoring lane was
//                                touched: a Signature pulled from Firestore is a
//                                full REPLACEMENT of the picked set, so after it
//                                is applied the file re-projects its eight and a
//                                cross-device replacement cannot drop them. The
//                                match consumes the file by projection through
//                                the tool's existing public entry points, not by
//                                a second resolver. A warm shell has the old
//                                engine, which never re-projects - so the reader
//                                answers eight questions and the match ignores
//                                every one of them. That mismatch is the whole
//                                reason this bump is load-bearing.
// NEW AND DELIBERATELY NOT PRECACHED, SO THEY ARRIVE FRESH WITHOUT THIS BUMP:
// your-file.js and your-file.css. Keeping them out of SHELL_ASSETS means a stale
// shell can never serve an old copy of the file's own logic.
// ALSO CHANGED BUT NOT A PRECACHED FILE: netlify/functions/pdx-sync.mts (one
// collection name added to ALLOWED_COLLECTIONS - no schema change and no
// migration, since a snapshot is one more opaque JSON row in pdx_snapshots keyed
// by (user_id, collection)) and scripts/test-your-file.mjs.
// NOTHING IN THE RECORD MOVED, AND THE FILE ASKS FOR NOTHING. There is no POST in
// your-file.js at all: the only network it can cause is PDXStore's own snapshot
// push for its own collection. It does not write dd_poll_answers, dd_threads, a
// district room, the forum, a public profile or a share link, and it never
// navigates to #open-forum. Nothing here touches vr_*, cee_*, pdx_forum_*,
// Direction Match, Word vs Action, the formal floors, finance, the Mandate lane,
// the Eye, the Utah ingest, residency or pack TTL. No party prior, no 0-100 "my
// match" redesign, no grade, no ranking and none of the verdict palette - a
// reader's own position cannot come out right or wrong, so Support gets no green
// and Oppose gets no red.
// LOCALLY THE KEY IS NAMESPACED PER ACCOUNT, like 'saved': two people sharing one
// browser can neither see nor merge each other's file, which also stops the pull
// reconciler from pushing one person's answers up under the other's name.
// A BUMP RENAMES BOTH CACHE BUCKETS, so it invalidates the whole precached shell
// whether or not this pass touched it.
// ─────────────────────────────────────────────────────────────────────────────
// v160 - HD-68 HAS A SEATED MEMBER, AND THE ADDRESS IS ENOUGH TO NAME HIM
// ─────────────────────────────────────────────────────────────────────────────
// v159 shipped the District File and it printed "We have not resolved who holds
// this seat." over Utah State House District 68 - a seat the curated incumbent
// map has held all along (68 -> chew_h68, whose person file at /p/chew_h68 works
// and is unchanged by this pass). Nothing was missing from the data. The LOOKUP
// was asked in one argument shape only: the page handed
// window.pdxSeatedMemberFor the payload's ('statehouse', 68) pair and threw the
// answer away when that pair was not the shape to hand, so a fact about the
// district was printed as an admission about it.
//   THE FIX IS THE LOOKUP, NOT THE DISTRICT. The resolver now reads every shape
// this one seat is spelled in - the pair, the composed district key
// 'ut-statehouse-68' on its own (the key carries the chamber and the number), the
// key with the pair, and a number written 'HD-68' - and the page falls back to
// the address it arrived on. No district is hardcoded and no second Chew was
// invented: one entry in one map, read through one resolver. The seat vocabulary
// stays honest, so 'statehouse' is the Utah chamber and 'house' is the U.S.
// House, and neither borrows the other's map: pdxSeatedMemberFor('house', 68) is
// still nobody, because there is no 68th U.S. House district in Utah.
//   AND AN UNMAPPED DISTRICT STILL SAYS SO. The unresolved sentence is not
// removed - it is what a district whose officeholder is not curated gets, which
// is the honest answer for that district and was never the honest answer for
// HD-68.
//   PRECACHED SHELL FILES CHANGED - THEY ARE THE REASON FOR THE BUMP:
//   · '/district-file.js'      - the seated member resolves from the district key
//                                as well as from the payload, and it moved from
//                                the scrolling body onto the LETTERHEAD, under
//                                the district's own title. It is painted from the
//                                address on arrival, so the name is there before
//                                either GET returns and a read that never lands
//                                cannot cost a neighbour the officeholder. A warm
//                                shell keeps the old module and keeps the wrong
//                                sentence, which is the whole reason for the
//                                rename.
//   · '/district-file.css'     - the seat block's margin (it has a header's
//                                spacing now, not a body's) and the room list's
//                                heading, which is the first thing in the body.
//                                No new rule, no colour, no chip: there is still
//                                nowhere in this stylesheet for a party letter or
//                                a number to go.
// ALSO CHANGED BUT NOT PRECACHED, SO IT ARRIVES FRESH WITHOUT THIS BUMP:
// ballot-breakdown.js (window.pdxSeatedMemberFor reads the composed district key
// and a loosely written number; the three incumbent maps themselves are
// byte-identical) and scripts/test-district-file.mjs (which now boots the REAL
// resolver instead of a stub written to match one argument shape - the suite had
// agreed with the caller, and neither agreed with the resolver, which is how this
// shipped).
// NOTHING ELSE MOVED. No room, no thread, no post, no poll, no residency, no
// grant and no migration: the lands_preserve row and the open room are exactly
// as they were, and this pass writes nothing anywhere. It does not touch the
// forum, the floors, the offline pack, Stripe, DMs, party framing, finance, the
// Mandate lane, the Eye or the Utah ingest, and it prints no party letter, no
// score, no grade and no percentage - the percent sign still does not occur in
// district-file.js at all. A twin boot leaves every Direction Match read and
// every formal tier byte-identical.
// A BUMP RENAMES BOTH CACHE BUCKETS, so it invalidates the whole precached shell
// whether or not this pass touched it.
// ─────────────────────────────────────────────────────────────────────────────
// v159 - THE DISTRICT FILE: ONE PAGE PER DISTRICT, AND IT IS A LIST OF DOORS
// ─────────────────────────────────────────────────────────────────────────────
// New surface: the District File at /d/<districtKey> - one page per Utah
// district, and every row on it is a door into a room. Until this pass the only
// way into District Voice was a pasted /d/<district>/<issue> URL somebody had
// already been sent, or the open forum, which is not a district and not an
// issue. A neighbour who knew their district existed had nowhere to find out
// which rooms were in it. ONE DISTRICT SHIPS: ut-statehouse-68. Every other
// well-shaped Utah key resolves the rewrite and is told there is no district
// file yet, out loud, rather than being shown an empty page that looks broken.
// THE PAGE ASKS FOR NOTHING. Two GETs, no Authorization header on either, no
// account, no residency read and no write path at all - no post, no Ask, no
// Grant, no poll answer. A signed-out visitor reads the whole list. Residency is
// untouched: the same pending/verified/revoked rows, the same admin_grant as the
// only verifying method, the same Utah-only gate.
//   PRECACHED SHELL FILES CHANGED - THEY ARE THE REASON FOR THE BUMP:
//   · '/'  (index.html)        - the non-blocking district-file.css pair and the
//                                deferred district-file.js tag, both root-
//                                absolute and both AFTER the district-room pair.
//                                A warm shell has neither, so a cold arrival at
//                                /d/ut-statehouse-68 resolves the existing /d/*
//                                rewrite and then finds no module that owns a
//                                one-segment /d/ address - the reader follows a
//                                link to their own district and lands on the
//                                homepage.
//   · '/district-file.js'      - NEW on this list, and its stylesheet with it.
//   · '/district-file.css'       The pair is precached for the reason the room's
//                                pair is: an unstyled file is a full-bleed column
//                                of loose text over the page, and a device
//                                holding the rewrite but not the module resolves
//                                /d/* and shows the homepage.
//   · '/district-room.js'      - the seat mount gained ONE control, "District
//                                rooms →", pointing at /d/<districtKey>. It is
//                                built through PDXDistrictFile.path(), so it
//                                returns the empty string - and paints nothing -
//                                when the file module is absent or the district
//                                has no file. A warm shell keeps a seat row with
//                                the room chips and no way to the file. The
//                                control does NOT go to the open forum, and
//                                neither module names one. Its two style rules
//                                are in district-file.css rather than
//                                district-room.css, because the control only
//                                exists when this pair is loaded - so a device
//                                holding the room's stylesheet but not the pair
//                                has no unstyled control on the seat row, it has
//                                no control. district-room.css is unchanged.
// ALSO CHANGED BUT NOT PRECACHED, SO IT ARRIVES FRESH WITHOUT THIS BUMP:
// ballot-breakdown.js (window.pdxSeatedMemberFor - the seat's officeholder
// resolved from a seat key and a district number, WITHOUT a reader location, so
// a visitor with no address still reads who holds HD-68),
// netlify/functions/district-room.mts (GET /district - one district's rooms,
// their poll counts as integers and the shipped issue vocabulary; it verifies
// nobody and writes nothing), netlify/functions/voting-record.mts
// (GET /member/:pid/issue-keys - the issue keys this member has at least three
// formal acts on, roll-call votes and positions both, every key checked against
// the shipped allow-list), the new data-only migration
// 20261101000000_seed_dd_hd68_district_file_room.sql (ONE dd_threads row,
// ut-statehouse-68 × lands_preserve, guarded on both parents and ON CONFLICT DO
// NOTHING - a fresh branch database is seeded by migrations alone, so the room
// the file must list cannot depend on somebody having posted), and
// scripts/test-district-file.mjs.
// NOT A SCORECARD, AND NO ROOM PER ISSUE KEY. The seated member is a name and a
// /p/<pid> link and nothing else - no party letter, no score, no grade, no
// composite percentage; the percent sign does not occur in district-file.js at
// all. The list is the rooms that EXIST plus the issues the seat has a readable
// formal pattern on, and nothing else: the issue vocabulary comes back so a
// record key can be CHECKED against it, never so a row can be painted for each
// of its keys. Counts are three integers from the room's own shared tally, the
// list is ordered by the issue's printed label, and neither the server's order
// nor how busy a room is can move a row. Nothing here touches Stripe, DMs, the
// forum, the floors, the offline pack, party framing, finance, the Mandate lane,
// the Eye or the Utah ingest. A twin boot leaves every Direction Match read and
// every formal tier byte-identical.
// TRAVELS WITH THIS BUMP, UNCHANGED AND BYTE-IDENTICAL. Renaming the buckets
// re-fetches every precached file whether or not this pass touched it, so the log
// owes a reader the list rather than a surprise: door1-workspace.js and
// door1-workspace.css (the Door 1 desk and its stylesheet), pdx-issue-family.js,
// stance-tree.js, alignment-tool.js and issue-colors.js (the family table, the
// topic tree, the alignment reader and the palette), issue-file.js,
// issue-file.css, issue-view.js and pdx-issue-profile.js (the issue file, its
// stylesheet, the stage that mounts it and the /i/<key> address that resolves
// it), word-action.js and word-action.css (the Word-vs-Action chip and its
// stylesheet), consistency.js (the Direction Match arithmetic), and
// all-seeing-eye.js (Find the Record's panel, which sw.js has always treated as
// a runtime entry rather than part of the shell). Not one of them changed here.
// netlify.toml did not change either: the /d/* 200 rewrite this address rides was
// already in it from the room's pass, which is why the district file needed no
// redirect of its own. index.html DID change and is listed above.
// A BUMP RENAMES BOTH CACHE BUCKETS, so it invalidates the whole precached shell
// whether or not this pass touched it.
// ─────────────────────────────────────────────────────────────────────────────
// v158 - THE ONE READER WHO COULD APPROVE A NEIGHBOUR WAS THE ONE SHOWN NO GRANT
// ─────────────────────────────────────────────────────────────────────────────
// Two precached shell files changed, so the bucket is renamed.
//
// district-room.js:
//   THE FOOTER WAS HIDDEN FROM THE PERSON IT IS FOR. On production
//   /d/ut-statehouse-68/lands_preserve, a reviewer who is ALSO verified in
//   ut-statehouse-68 read the room with an open composer and no reviewer footer
//   anywhere in it, so the pending neighbour sitting in dd_residency had nobody
//   who could see the control that approves them. The server was offering the
//   grant the whole time: /api/district-room returns residency.canGrant for a
//   moderator in a state this pass verifies, and it was true for this reader.
//   reviewerHtml() then ANDed it with a test of its own - canPost !== true - on
//   the phase 3 reasoning that somebody who can already post has nothing to
//   grant themselves.
//
//   WHICH WAS TRUE ONLY BECAUSE THE GRANT USED TO MEAN 'ME'. The subject
//   defaulted to the caller's own uid, so in a room whose composer was open the
//   control really did have nothing left to do. A grant is a decision about
//   SOMEBODY ELSE, and a reviewer verified in the district they review is
//   precisely the reviewer with neighbours to approve - so being able to post is
//   not an opinion about anybody's residency and it decides nothing here now.
//   canGrant is the whole condition.
//
//   SO THE SUBJECT IS TYPED OUT, AND IT IS NEVER THE REVIEWER. The footer
//   carries a required one-line field for the uid being verified. An empty field
//   is refused before the request and the reviewer's own uid is refused too -
//   both again at the Function, which no longer defaults the subject to whoever
//   is asking and returns 400 for either. Without that, the room's last button
//   would have been a silent self-verification.
//
//   WHAT IS NOW TRUE, AND IS PINNED. Reviewer bit plus a verified row: composer
//   AND the grant, the footer still last in the room under the thread and under
//   its own 'Reviewer tools' heading. Pressing it POSTs the district and the
//   typed uid to the existing /residency/grant route and nothing else. A
//   neighbour with a pending row and no reviewer bit gets no footer, no field
//   and no label - unchanged, and asserted in both directions. The neighbour's
//   ask, the composer and the poll are untouched.
//
// district-room.css:
//   The field and its label, quiet like the rest of the footer - it is a tool
//   for one person, not the room's call to action, and it wears no accent fill.
//
// ALSO CHANGED BUT NOT PRECACHED, SO IT ARRIVES FRESH WITHOUT THIS BUMP:
// netlify/lib/district-room-core.mjs (three copy strings: the field's label and
// the two refusals), netlify/functions/district-room.mts (canGrant is documented
// as carrying nothing about canPost, the read sends the field's label, and the
// grant route requires a subject that is not the caller) and
// scripts/test-district-room.mjs.
// NOTHING IN THE RECORD MOVED. No schema change and no migration: the grant
// writes the same dd_residency row through the same statement it always did. No
// uid leaves the Function in any response. Nothing here touches vr_*, cee_*,
// pdx_forum_*, Direction Match, Word vs Action, the formal floors, finance, the
// Mandate lane, the Eye, the Utah ingest or pack TTL.
// A BUMP RENAMES BOTH CACHE BUCKETS, so it invalidates the whole precached shell
// whether or not this pass touched it.
// ─────────────────────────────────────────────────────────────────────────────
// v157 - THE ROOM TOLD A NEIGHBOUR THEY WERE NOT VERIFIED AND GAVE THEM NO WAY TO ASK
// ─────────────────────────────────────────────────────────────────────────────
// One precached shell file changed, so the bucket is renamed.
//
// district-room.js:
//   v156 GOT THE STANDING RIGHT AND THE CONTROL WRONG. On production
//   /d/ut-statehouse-68/lands_preserve, a Google reader signed in on the account
//   chip read exactly the true sentence - "Verify you live in this district to
//   post. We have not established that you live in this district." - with no
//   control of any kind under it. The composer was correctly shut and the poll
//   correctly offered no Support/Oppose/Mixed, because nothing about them had
//   been established. What was missing was the ONE thing that reader can do:
//   ask.
//
//   WHY. The server was already offering it. /api/district-room returns
//   residency.canAttest, true for a signed-in caller with no dd_residency row
//   for this district in a state this pass verifies, and it was true for this
//   reader. The client then ANDed that flag with a test of its own - was the
//   room's district one myDistricts() placed the reader in - and myDistricts()
//   reads window.pdxRepsForMe(), which answers "not located" until somebody
//   types a zip into Who Represents Me. Most readers never type one. So the ask
//   was hidden from precisely the people it exists for, and hidden silently:
//   there was no note explaining the absence, because the absence was not
//   supposed to be a state.
//
//   THE CHECK WAS NEVER THE SAFEGUARD, which is why removing it costs nothing.
//   Asking writes status 'pending', method 'self_attest' - both literals in the
//   Function, neither readable off a request body - and residencyClaim() honours
//   a verified status only from a verifying method, of which 'self_attest' is
//   not one. A pending row cannot post and cannot vote whatever district it
//   names. The only path to verified is still a reviewer's grant.
//
//   WHAT IS NOW TRUE, AND IS PINNED. Signed in with no row: the ask is the
//   primary control, full width and 46px, directly under the note that said why
//   the composer is shut, with no location consulted on either side. Pressing it
//   POSTs the district and nothing else to /residency/attest, and the room the
//   reader is left looking at says pending, offers no second ask, has no
//   composer and has no poll button. Pending: the pending sentence alone.
//   Verified for THIS district: composer and the three poll buttons, and no ask.
//   The reviewer's grant is unmoved - still below the conversation under its own
//   "Reviewer tools" heading, still gone entirely once the composer is open.
//   Google is still a way of signing in and not a residency, and no ID vendor is
//   called.
//
//   NO COPY WAS ADDED OR CHANGED. Every sentence in play is the gate's, already
//   shipped in netlify/lib/district-room-core.mjs.
//
// TRAVELS WITH THIS BUMP, UNCHANGED AND BYTE-IDENTICAL. district-room.css (the
// ask's full-width 46px rule was already there, waiting for a button to paint),
// the two mounts (who-represents-me.js and issue-file.js) and every other
// precached file are untouched by this pass; renaming the buckets re-fetches
// them anyway.
// ─────────────────────────────────────────────────────────────────────────────
// v156 - AND A GOOGLE SESSION IS ONE OF THE ACCOUNTS IT FOLLOWS
// ─────────────────────────────────────────────────────────────────────────────
// One precached shell file changed, so the bucket is renamed.
//
// district-room.js:
//   v155 MADE THE ROOM FOLLOW THE CHIP, AND IT ONLY FOLLOWED HALF OF IT. On
//   production /d/ut-statehouse-68/lands_preserve opened correctly for an
//   email/password member - the poll and the composer painted - and still said
//   "Sign in first, then ask to be verified for this district" to a reader who
//   had signed in with Google, while the account chip in the top-right was
//   painting that same Google user. One question, two answers, again.
//
//   WHY, AND IT IS THREE THINGS A GOOGLE SESSION DOES THAT A PASSWORD SIGN-IN
//   DOES NOT.
//     1. THE TOKEN ARRIVES AFTER THE USER DOES. The popup (or the redirect)
//        hands the SDK a user a beat before it can mint an ID token for them.
//        v155 resolved auth on the state callback alone, so a standing read
//        could go out in that beat with no Authorization header - and a request
//        the server cannot name is answered, correctly, "we cannot name you".
//     2. THE POPUP CAN RESOLVE WHILE THE READ IS IN FLIGHT. The room resolved
//        "signed out", sent the unauthenticated read, and the account existed by
//        the time the answer came back - with no state change in between that
//        the room could have heard.
//     3. THE BOOT'S ANONYMOUS SIGN-IN CAN LAND AFTER THE POPUP. That leaves the
//        SDK presenting the per-browser anonymous session while the reader is
//        signed in to a real account. v155 read that as a sign-out and painted
//        the signed-out sentence over the Google chip.
//
//   WHAT CHANGED, ALL OF IT IN THE ONE "who is this request" HELPER.
//     · AUTH IS NOT RESOLVED UNTIL THERE IS A TOKEN. The room now waits for the
//       state callback AND a real getIdToken() for that uid before the standing
//       read goes out. A cold Google arrival holds on "Opening the room..." for
//       that beat instead of printing a sentence it does not yet know to be
//       true.
//     · AN UNATTRIBUTED ANSWER IS CHECKED AGAINST THE SDK BEFORE IT IS PAINTED.
//       If the read came back unattributed and the SDK now has an account the
//       room never heard about, that account is adopted, its token is minted
//       fresh, and the standing is asked exactly once more as that reader.
//     · AN ANONYMOUS LEFTOVER IS SWITCHED AWAY FROM, NOT OBEYED. An anonymous
//       session arriving under a resolved account is the leftover rather than a
//       sign-out - a real sign-out reports null first - so the room switches the
//       SDK back to the account (updateCurrentUser, which signs nothing out) and
//       keeps its standing. There is now no path by which an anonymous ID token
//       becomes this room's Authorization header.
//     · AND THE PROVIDER IS NOT PART OF THE TEST. The chip's test is
//       `user && !user.isAnonymous`; the room required a uid AND an email, which
//       is a second notion of "signed in" the chip does not have. The email
//       requirement is gone and no provider id is read anywhere on this surface,
//       so Google and email/password are one case here rather than two.
//   If all of that still disagrees with the server, the room says "You're
//   signed in, but we could not confirm it for this room" - the sentence
//   netlify/lib/district-room-core.mjs already owned. It never leaves "sign in
//   first" up in front of an account that is signed in.
//
//   WHAT DID NOT CHANGE. Nothing was granted to anybody. Residency is still a
//   row a reviewer writes and an admin grant is still the only method that
//   reaches verified, so knowing WHO somebody is still says nothing about WHERE
//   they live: a Google reader with no row gets the Ask, a pending row still
//   says pending, and the composer still opens on canPost === true and nothing
//   else. A self-typed location is still not an identity and is not read by the
//   helper, and no ID vendor is called. No copy was added - the four sentences
//   in play are the gate's.
//
// TRAVELS WITH THIS BUMP, UNCHANGED AND BYTE-IDENTICAL. district-room.css, the
// two mounts (who-represents-me.js and issue-file.js) and every other precached
// file are untouched by this pass; renaming the buckets re-fetches them anyway.
// ─────────────────────────────────────────────────────────────────────────────
// v155 - THE ROOM'S AUTH FOLLOWS THE NAV CHIP
// ─────────────────────────────────────────────────────────────────────────────
// One precached shell file changed, so the bucket is renamed.
//
// district-room.js:
//   THE ROOM SAID "SIGN IN FIRST" TO A SIGNED-IN READER. On production,
//   /d/ut-statehouse-68/lands_preserve painted "Sign in first, then ask to be
//   verified for this district" while the account chip in the top-right already
//   showed a signed-in member, and the poll block underneath it printed the same
//   sentence. The Ask, the reviewer's grant and the composer never appeared,
//   because the room's signed-in bit was false.
//
//   WHY. The room asked Firebase for auth.currentUser at the instant of each
//   call. That is a different question from "who is signed in": on a cold
//   arrival at /d/<district>/<issue> the SDK has not restored the session yet,
//   so currentUser is null, the standing read went out with no Authorization
//   header, the Function correctly answered "we cannot name this caller", and
//   the room printed the signed-out sentence over a signed-in account - and then
//   never asked again, because nothing was listening for the auth state to
//   arrive a beat later. The nav chip, which does listen, painted the member.
//   Two answers to one question, and the room had the wrong one.
//
//   WHAT CHANGED. One "who is this request" helper, and every call in the module
//   goes through it: the standing read, the residency request, the reviewer's
//   grant, the poll answer and the post. It RESOLVES auth rather than sampling
//   it - it answers only once Firebase has said something either way - and it
//   calls a reader signed in on the same test the account chip uses, a uid and
//   an email that are not the per-browser anonymous session. A cold open now
//   holds on "Opening the room..." until that answer arrives instead of
//   printing a sentence it does not yet know to be true, and a sign-in or
//   sign-out under an open room re-reads the standing rather than leaving the
//   last answer up.
//
//   AND A DISAGREEMENT IS NOT DRESSED AS A SIGN-OUT. If the chip has somebody
//   signed in and the standing read still comes back unattributed, the room
//   mints a fresh token and asks exactly once more; if the second answer is the
//   same it says what is actually wrong. It never leaves "sign in first" up in
//   front of an account that is already signed in.
//
//   WHAT DID NOT CHANGE. Residency is still a row a reviewer writes, and the
//   only path to verified is still the admin grant: knowing who somebody is has
//   never been the same as knowing where they live. A self-typed location is
//   still not an identity and is not read by the helper. No ID vendor is called.
//   The composer still opens on canPost === true and nothing else, the copy
//   still has one owner in netlify/lib/district-room-core.mjs (which gains the
//   one sentence for the disagreement above), and the room still carries no
//   score, no party, no ranking and no pid.
//
// TRAVELS WITH THIS BUMP, UNCHANGED AND BYTE-IDENTICAL. district-room.css, the
// two mounts (who-represents-me.js and issue-file.js) and every other precached
// file are untouched by this pass; renaming the buckets re-fetches them anyway.
// ─────────────────────────────────────────────────────────────────────────────
// v154 - THE ROOM HAS ONE POLL, AND THE WAY IN IS THE LOUD CONTROL
// ─────────────────────────────────────────────────────────────────────────────
// Two precached shell files changed, so the bucket is renamed.
//
// district-room.js and district-room.css:
//   1. THE WAY IN IS NOW THE PRIMARY CONTROL. v153 painted the reviewer's
//      "Grant residency" as the filled button and the neighbour's request as a
//      thin outline beside it - which put the loudest thing on the way into the
//      room behind a permission almost nobody has. The request is now "Ask to be
//      verified for this district", full width, directly under the closed note,
//      and the grant moved to a "Reviewer tools" footer under the posts where a
//      neighbour looking for the way in will not read it as one. It renders for a
//      reviewer only, and never at all once the composer is already open.
//   2. ONE POLL PER ROOM, above the composer. Fixed question, three fixed poles
//      (support / oppose / mixed - the same poles as My Stances), and results
//      printed as counts: "N support - N oppose - N mixed". No percentage, no
//      bar, no meter: there is no element in the poll whose length is set from a
//      result, because a proportion drawn as a length reads as a grade. Only a
//      neighbour verified for THIS district can answer; everybody else, signed
//      out included, still reads the numbers. Voting again replaces the answer
//      rather than adding one, and nothing in the room is ordered by it - the
//      posts are still newest first, and a post is never read as a vote.
//
// The two precached shell files are the only ones that changed. dd_poll_votes is
// a new table and the vote route is a new Function path; neither is a precached
// asset, so both arrive with the deploy.
// ─────────────────────────────────────────────────────────────────────────────
// v153 - RESIDENCY IS A FACT NOW, SO A VERIFIED NEIGHBOUR CAN POST
// ─────────────────────────────────────────────────────────────────────────────
// v152 shipped the District Room read-only: residencyClaim() returned
// verified:false for every caller on purpose, so the composer rendered for
// nobody. This pass replaces that stub with a read of a new table, dd_residency
// - one row per (person, district) carrying a status (pending | verified |
// revoked) and the method it was reached by. The gate now honours a claim only
// when BOTH are true: status 'verified' AND a method allowed to verify, which in
// this pass is an admin grant alone.
//   TWO HONEST PATHS, LABELLED DIFFERENTLY. A site reviewer can mark one person
// verified (or revoked) for ONE Utah district - the only route to 'verified'. A
// signed-in reader can submit "I live in this district" for a seat their OWN
// resolver already places them in, which records a PENDING row: the composer
// stays shut, the copy says pending, and the badge is not printed. Utah only,
// refused elsewhere with a sentence rather than an absent control.
//   A SELF-TYPED LOCATION IS STILL NOT VERIFICATION. window._currentVoterLocation
// never reaches the Function, and a location_pin row could not publish even if
// something marked it verified - that is a property of the gate, not a promise
// about which routes exist. No ID vendor is called: verifyVendor() is a seam
// nothing references, and there is no Stripe or Veriff call in this repo.
//   PRECACHED SHELL FILES CHANGED - THEY ARE THE REASON FOR THE BUMP:
//   · '/district-room.js'      - the two residency controls (the request and the
//                                reviewer's grant) and the pending copy. A warm
//                                shell has neither, so a verified neighbour on an
//                                old shell sees a closed room with the phase 1
//                                sentence that nothing can open it - which is no
//                                longer true.
//   · '/district-room.css'     - the styles for that pair, deliberately unalike
//                                so a pending request cannot look like a granted
//                                one, and neither wears the verdict palette.
// ALSO CHANGED BUT NOT PRECACHED, SO IT ARRIVES FRESH WITHOUT THIS BUMP:
// netlify/lib/district-room-core.mjs (residencyClaim now reads a row; the copy
// for pending, revoked and out-of-scope), netlify/functions/district-room.mts
// (the row read plus the attest and grant routes), db/schema.ts and the
// 20261030000000_create_dd_residency migration (the table itself), and
// scripts/test-district-room.mjs (pending, revoked, wrong-district, location-pin
// and admin-grant, all pinned).
// NOTHING IN THE RECORD MOVED. dd_residency is a uid, a district key the app
// already maps, a status, a method and two timestamps - no name, no address, no
// zip, no coordinate and no document. No room or residency read touches vr_*,
// cee_*, pdx_forum_*, Direction Match, Word vs Action, the formal floors,
// finance, the Mandate lane, the Eye, the Utah ingest or pack TTL, and no count
// from it reaches a person file. A twin boot leaves every Direction Match read
// and every formal tier byte-identical.
// A BUMP RENAMES BOTH CACHE BUCKETS, so it invalidates the whole precached shell
// whether or not this pass touched it.
// v161 — Your file (#your-file). Two precached shell assets changed: `/` carries
// the new stylesheet link, the deferred /your-file.js tag and the "Your file"
// control in the Who Represents Me action row, and /alignment-tool.js now reads
// that file first on its eight issue keys. /your-file.js and /your-file.css are
// deliberately NOT in SHELL_ASSETS, so they arrive from the network on first use
// and cannot be served stale from an older shell.
// v165 — The Utah executive formal lane. Four precached shell assets changed:
// /stance-helpers.js (the gov_signed / gov_vetoed act rows), /word-action.js (the
// untested-lane veto and its sentence), /consistency.js (the row wording) and
// /formal-index.js (cox's 140 acts on 140 measures). A shell holding v164 that
// takes the new formal-index.js but not the new word-action.js would print a
// pledge-ledger percentage over a lane it can now see, which is the one thing
// this pass exists to prevent — so the four travel together or not at all.
// v166 — Exec-act copy on a governor's dossier. ONE precached shell asset
// changed: /consistency.js, which now asks whether a row is a signature and
// whether the issue holds a roll call before it teaches a ballot. The sentences
// around the cards were still floor sentences — "a Yea counts as support" over an
// act nobody cast, "A roll call carries its question" over a list with no roll
// call in it, and "See all 11 mapped votes" on a door that opens onto signed
// bills. Bumped rather than left to arrive on its own because the copy and the
// cards it surrounds ship in the same file: a device holding v165 renders the old
// wording against the same rows, which is exactly the mismatch a reader reported.
// NO WEIGHT, MAPPING OR LANE MOVED, and the ✒️ lane is not in this pass at all —
// both doors return '' there by design and still do. A twin boot leaves every
// formal tier and every Direction Match read byte-identical.
// v167 — Sourced word for people with no formal lane. NO precached shell asset
// changed: the one file in this pass is /politician-stances-ext.js, the lazily-
// loaded half of the stance table, which now carries a citation on every claim
// made for seven Utah candidates and first-term members whose roll-call file is
// empty. It is not in SHELL_ASSETS, but a warm device keeps it in the
// stale-while-revalidate RUNTIME_CACHE, and that bucket is named after this
// constant — so without the bump a reader is still served the uncited sentences
// this pass removed, on people for whom the word lane is the only lane. NO
// WEIGHT, MAPPING OR LANE MOVED, and no formal row was read, added or inferred.
// v168 — The word-first letterhead. FOUR precached shell assets changed:
// /word-action.js (the SAID brief and the gate that only opens on an empty formal
// lane with a cited card behind it), /word-action.css (the side word's chip),
// /stance-tree.js (showFilter, the stated view the overflow door asks for) and
// /profile-spine.js (the word-first two-jobs note), plus /cmp-data.js for one
// corrected office row. /publication-floor.js changed as well and is a runtime
// entry, not a shell asset — its alias fix is what lets lyman's citations count
// at all, and this constant names the bucket that would otherwise keep serving
// the old copy. A device holding v167 would read the new floor and the new office
// through the old letterhead, printing an absent record over a file the rest of
// the shell already publishes, so the six travel together. NO WEIGHT, MAPPING OR
// LANE MOVED and no formal direction was inferred for anyone.
// v169 - An unread crumb is not a formal term. FOUR precached shell assets
// changed: /word-action.js (the gate now reads saidNoTerm — no characterised
// read, no judged act, every index row inert — instead of refusing on any read
// at all), /consistency.js (one official-action backfill entry removed: a
// Ballotpedia biography line was being carried into the formal pattern index as
// an act on public lands), /gaps.js (the N "No action on file — <issue>" cards
// on a file with no term collapse into one sentence, and stop soliciting leads
// for votes that cannot exist) and /profile-spine.js (the two-jobs note no
// longer calls the record "empty on this file" now that the class admits a file
// holding one unread row). A device holding v168 would take the new gate through
// the old gaps list, printing a word-first letterhead over seven Open gap cards
// that read as ducked votes on the same page — so the four travel together. NO
// WEIGHT, MAPPING OR LANE MOVED, no formal direction was inferred for anyone,
// and no act was invented: the spotlight item behind the removed mapping is
// untouched and still reads on the profile.
//   AND WHAT THE BUMP CARRIES WITH IT, unchanged. Renaming the buckets refetches
// every shell asset, so /door1-workspace.js, /door1-workspace.css and /index.html
// arrive fresh in this pass as well without a line of them having moved — the
// issue desk, its stylesheet and the page it paints on are byte-identical here.
// Direction Match is byte-identical too: no floor, weight, mapping or lane read
// changed, and the one thing that did change about a percentage is that a file
// with no formal term now prints none at all, because it never had two halves to
// compute one from.
// v170 - ONE UTAH SEAT GETS A PLACE, AND THE PLACE IS NOT A SECOND RECORD
// EIGHT precached shell assets changed and two of them are new. /district-voice.js
// and /district-voice.css are the seat's one live question, its verified
// neighbours' takes and the composer that gates on residency. /district-file.js
// and /district-file.css moved with them: the file's scroller is two containers
// now, District Voice first and the issue rooms under it, which is the order the
// brief asked for. /district-room.js moved because the one link into that file is
// named for what is at the top of it — "Neighbors in this seat" where Voice has
// opened, "District rooms" everywhere else, asked of PDXVoice so the room holds
// no second copy of the allow-list. /person-file.js and /person-file.css carry the
// same quiet link on the sitting member's file, one line, no chip and no count.
// /index.html is where the new pair is registered — a deferred script tag and a
// non-blocking stylesheet — and it is why this bump is load-bearing rather than
// tidy: a warm device holding v169 serves the CACHED index.html, which has no tag
// for either new file, so District Voice would never load on the devices most
// likely to have saved a /d/<seatKey> address. The eight travel together because a
// device that took the new district file without the Voice module opens a saved
// seat and paints a page whose first block is missing. The module fails soft when
// it is absent, so the rooms still paint — that is the honest fallback, not the
// shipped page.
//   AND WHAT THE BUMP CARRIES WITH IT, unchanged. Renaming SHELL_CACHE refetches
// every precached asset and renaming RUNTIME_CACHE drops every runtime one, so
// the whole shell arrives fresh in this pass whether or not a line of it moved.
// The log owes a reader the version each file is holding, so they are named here
// with what did NOT happen to them:
//     · the issue desk and every pane it opens — /door1-workspace.js,
//       /door1-workspace.css, /issue-file.js, /issue-file.css, /issue-view.js,
//       /pdx-issue-profile.js, /pdx-issue-family.js, /issue-colors.js,
//       /stance-tree.js and /alignment-tool.js — are byte-identical here. No
//       count, order, boundary or measure read on the desk moved, and Voice
//       added no row to any of them;
//     · the Word vs Action chip and its skin, /word-action.js and
//       /word-action.css, with /consistency.js behind them, are byte-identical
//       here: the same index rows, the same denominator, the same refusal on a
//       file with no formal term;
//     · /all-seeing-eye.js is a RUNTIME entry rather than a precached one, so it
//       is dropped by the runtime bucket's rename rather than by SHELL_ASSETS —
//       and it is byte-identical too. Voice publishes no searchable person, so
//       the panel has nothing new to rank;
//     · /netlify.toml did not change at all. The /d/* 200 rewrite that serves
//       index.html for a district address was already there for the district
//       file, and District Voice lives inside that address rather than claiming
//       a route, a top-nav destination or a Voice URL per person.
//   That is measured rather than asserted: the district-voice suite twin-boots
// cox, lee and chew_h68 through Direction Match, Word vs Action and the finance
// lane with district-voice.js loaded and without it, and every read matches byte
// for byte.
//   NO WEIGHT, MAPPING, FLOOR OR LANE MOVED. Direction Match is byte-identical —
// no floor, weight, mapping or lane read changed, and no formal direction was
// inferred for anyone. District Voice writes no formal act, stance, Direction
// Match figure, finance row or baseline; it holds no pid and no party field; and
// it publishes one integer per poll option rather than any percentage, so nothing
// on this bump can change what a record reads.
// v171 - ONE INERT ROW MUST NOT TAKE A FILE'S LETTERHEAD AWAY FROM IT
// ONE precached shell asset changed: /word-action.js. /p/lyman first-painted the
// word-first letterhead — seven sourced positions, the honest line about the
// formal record under them — and then the roster warmed, noteMember landed a
// single curated narrative row the official-actions feeder had mapped to public
// lands, and the file re-rendered as record-first EMPTY: courthouse art, CURRENT
// CANDIDATE, "No formal pattern on file yet", the position chips gone. Nothing
// about the person had changed. Three things in that one file moved, and nothing
// else in the repo did.
//   FIRST, THE GATE'S OWN EMPTY-FILE DOOR. The letterhead was asking
// briefEmptyLegal, which is the empty-file PARAGRAPH's door, and inheriting that
// paragraph's four vetoes. Two of the four are payload COUNTS — the raw
// memberRecords length and the nav chip's mapped total — and they are correct
// about the paragraph, which says "nothing we hold for them is a vote or a
// formal action" and must never say it beside a chip reading VOTES · 68. They
// are the wrong test for this letterhead, which claims one thing only: no roll
// call or signed act on file. So the lane now asks its own door. It keeps the
// two vetoes that see what the acts test cannot — the formal-record rows the
// edge printed into the served document, and the shipped static index — keeps
// the bounded wait, and replaces the two counts with the payload's own
// predicate: is there a ballot on any row, or an act the act layer can weigh.
// That is the record lane's test, asked of the whole payload instead of one
// issue at a time, so a roll call the issue mapping never reached still refuses
// the block rather than passing unseen under a sentence that denies it. A
// recorded absence counts as a ballot: they were at the roll call.
//   SECOND, ONE PERSON'S TWO KEYS. The curated stance cards are filed under
// phil_lyman and the file's address is lyman, so the gate — which resolved cards
// through the roster's own display name and nothing else — could be handed a
// warm person object whose name field had not landed yet and count zero cited
// positions for a file that has seven. It now walks the same hop chain the
// publication floor walks (direct id, alias table, slug of the display name,
// alias of that slug), and it walks it ONLY when the direct read comes back
// empty, so no file that resolves today resolves differently.
//   THIRD, THE FACE. /ballot-breakdown.js's photo reader resolves the same two
// keys now, for the reason the letterhead does: a headshot filed under one key
// must not be replaced by the eagle placeholder because the file was addressed
// by the other. It is NOT a precached shell asset — it never has been — so it
// does not need this bump to reach a warm device, and it is named here anyway
// because the two halves of the identity fix are one change.
//   NO WEIGHT, MAPPING, FLOOR OR LANE MOVED, and no act was invented.
// /consistency.js is byte-identical: no arithmetic, no floor, no band, no
// mechanism entry and no export of the formal pattern index changed, and the
// ballot vocabulary the gate now reads is asserted equal to that engine's own
// table at source rather than allowed to drift from it. Direction Match is
// byte-identical, and the word-first block still prints no percentage at all,
// because a file with no formal term never had two halves to compute one from.
// No second roster row was created for either key, no stance was mapped to a
// formal act, and nothing about /p/pace, /p/larson, /p/chew_h68 or /p/lee moved.
//   AND WHAT THE BUMP CARRIES WITH IT, UNCHANGED. Renaming both buckets
// refetches every shell asset, so a warm device takes fresh copies of files that
// did not move a line in this pass: /word-action.css (the chip's skin — the
// figure it sizes is not printed on this class of file), /door1-workspace.js and
// /door1-workspace.css (the issue desk and its stylesheet), /issue-file.js,
// /issue-file.css and /issue-view.js (the issue file's panel, its skin and the
// view behind it), /pdx-issue-profile.js (the /i/* address module) with the /i/*
// 200 rewrite in /netlify.toml behind it, /pdx-issue-family.js,
// /alignment-tool.js, /stance-tree.js and /issue-colors.js (the family table,
// the issue vocabulary, the stance tree and the one hue per key),
// /all-seeing-eye.js (a runtime entry rather than a precached one, dropped by the
// runtime bucket's rename) and /index.html, which registers all of them and is
// byte-identical here: this pass adds no script tag, no stylesheet and no route.
// v172 - ONE LEDE, ONE ADDRESS, AND A RECORD STRIP THAT SAYS WHICH IT MEANS
// TWO precached shell assets changed: /district-file.js and /district-voice.js.
// Nothing new shipped in this pass — no replies, no likes, no events, no vendor,
// no nav item, and not one seat was added to either allow-list. Four leftovers
// from v170/v171 on the one seat that has a Voice, /d/ut-statehouse-68.
//   FIRST, ONE LEDE. /district-file.js printed the rooms sentence — "Neighbors,
// issue by issue. Reading is open. Posting takes a reviewer grant." — and then
// District Voice printed its own required frame sentence under it, so the top of
// a Voice seat's file was two ledes and the reader had to arbitrate between them.
// NEITHER SENTENCE WAS REWRITTEN. The rooms lede simply stops leading a page it
// does not describe: where Voice is mounted, Voice's frame is the frame, and the
// rooms sentence stays exactly where it belongs on a rooms-only file. Which
// answer applies is asked of PDXVoice rather than kept as a second copy of the
// allow-list, and it FAILS SOFT TO FALSE — so a device that took this file and
// not the Voice module, or any seat Voice has not opened, is a rooms-only file
// that prints the rooms lede byte-identically to before Voice existed. That is
// the whole twin-boot guarantee for this change, and it is the case the
// district-file suite boots.
//   SECOND, THE SHORT SPELLING OF ONE SEAT. /d/ut-hd-68 and /d/ut-statehouse-68
// are one place, and both modules already normalized every spelling before
// anything looked at it. What they could not do is save a COLD visit: the client
// only gets to settle the address if the client loads, and a pasted short link
// with only the /d/* wildcard rewrite in front of it is served index.html at 200
// — leaving a second permanent address for one seat in somebody's history and in
// a search index. So /netlify.toml gained an exact 301 from the alias to the
// canonical seat (and one for the alias form of a room address, keeping its issue
// segment), ordered AHEAD of the wildcard because Netlify takes the first match.
// The client's own normalization is unchanged and still moves the bar for a
// reader who arrived by a route the rule never saw, so the two agree rather than
// one covering for the other. /netlify.toml is NOT a precached shell asset and
// does not need this bump to take effect — it is named here because the two
// halves of one address rule should be read together.
//   THIRD, "THIS WEEK" NOW SAYS WHICH OF THREE THINGS IT MEANS. The strip had
// one sentence for three different facts about the formal record — the read is
// still out, the read landed and the record is empty, the read never landed — and
// printed it the instant the block painted, before anything had been asked. Its
// wording made that read like a fetch still on its way. It is now a three-state
// strip and EVERY branch repaints: checking (said only while a read is genuinely
// in flight), an act (printed as a link to the record's own source), a final
// one-sentence empty that names the issue, and its own sentence for a read that
// could not be made or did not come back. For HD-68 today the honest answer is
// the empty one, and it is final rather than hedged: the seated member has no
// formal act on the poll's issue, and every measure in the index on that key is a
// U.S. House measure a state representative cannot vote on. NO FALLBACK KEY, no
// nearest neighbour and no invented mapping — the strip is keyed to the poll's
// issue and an act that comes back on any other key is dropped rather than
// printed under a heading the poll owns. THE POLL WAS NOT RETARGETED and no
// percentage appears on the strip in any of its four states.
//   FOURTH, THE ONE QUIET LINK ON A PERSON FILE IS NOW A WORKING CONTROL.
// "Neighbors in this seat" was already a real anchor with a real address; what it
// was not was a control, and the reason was stacking rather than markup. The
// person modal and the district file share z-index 50 — the number both need to
// clear the site's fixed nav — so document order decides which covers which, and
// the file is deliberately inserted BEFORE #modal-overlay so that a ROOM opened
// from a FILE lands on top of the file. The same order put the file UNDER the
// person modal the link was tapped in. Rather than reorder the overlays and trade
// this defect for that one, the file now hands the person file off on the way in,
// which is what the reader asked for: the homepage's Spotlight settled the same
// question the same way years earlier. closeModal() is NOT edited and is called
// once, only when the overlay is actually displayed — it rewrites the address on
// its way out through /person-file.js, so calling it for a reader who never
// opened a person file would move a bar that is nobody's to move — and it is
// called BEFORE this file takes the address, so a close and then an open happen
// in the order a reader would describe them. The link itself is untouched: one
// line, no chip, no count, no activity dot, and absent from every file but the
// sitting member's.
//   AND WHAT THE BUMP CARRIES WITH IT, UNCHANGED. Renaming SHELL_CACHE refetches
// every precached asset and renaming RUNTIME_CACHE drops every runtime one, so a
// warm device takes fresh copies of files that did not move a line in this pass.
// The log owes a reader the version each file is holding, so the ones a reader
// might expect to have moved here are named with what did NOT happen to them:
//     · /district-voice.css did not change. The strip's four states reuse the
//       classes that were already there — the empty sentence and the act link —
//       so no rule, hue, size or spacing moved, and there is no new element for
//       one to style;
//     · /index.html did not change. This pass registers no script, no stylesheet
//       and no route, adds no nav item and mounts nothing itself: both mounts are
//       still inside Door 2's own modules;
//     · /person-file.js and /person-file.css did not change. The link they render
//       was already a real anchor pointing at the canonical seat; the defect was
//       never in its markup, and /person-file.css keeps the one quiet class it
//       had — dimmer than the address beside it, no pill and no count;
//     · /district-room.js did not change. Its seat mount lives in Who Represents
//       Me rather than in an overlay, it still asks PDXVoice which label to print,
//       and nothing about the room's own two-segment address moved;
//     · the issue desk and every pane it opens — /door1-workspace.js,
//       /door1-workspace.css, /issue-file.js, /issue-file.css, /issue-view.js,
//       /pdx-issue-profile.js (the /i/* address module), /pdx-issue-family.js,
//       /issue-colors.js, /stance-tree.js and /alignment-tool.js — are
//       byte-identical here. No count, order, band, boundary or measure read on
//       the desk moved, this pass mapped no issue and added no row to any of
//       them, and a provision's vote still counts and still says so;
//     · the Word vs Action chip and its skin, /word-action.js and
//       /word-action.css, are byte-identical here: the same index rows, the same
//       denominator, the same refusal on a file with no formal term. Nothing in
//       this pass reads a formal term, and the strip's empty is a fact about one
//       issue rather than a figure about a career;
//     · /all-seeing-eye.js is a RUNTIME entry rather than a precached one, so it
//       is dropped by the runtime bucket's rename rather than by SHELL_ASSETS —
//       and it is byte-identical too. District Voice publishes no searchable
//       person, so the panel has nothing new to find and nothing new to rank;
//     · /netlify/lib/district-voice-core.mjs and
//       /netlify/functions/district-voice.mts are neither of them precached shell
//       assets and do not need this bump. The core lib is where the strip's three
//       sentences are owned — one owner, so the page and the server cannot drift —
//       and the Function now ships all three with the payload so the client never
//       has to invent the two it was not sent. No table, column, gate, refusal or
//       claim field changed in either.
//   NO WEIGHT, MAPPING, FLOOR OR LANE MOVED, and no act was invented. Nothing in
// this pass writes a formal act, stance, Direction Match figure, finance row or
// baseline; nothing here holds a pid or a party field; the record is read through
// the same public GET a signed-out reader can make, and it is read-only. Direction
// Match, Word vs Action and the finance lane are byte-identical, which is measured
// rather than asserted: the district-voice suite twin-boots cox, lee and chew_h68
// through all three with district-voice.js loaded and without it, and every read
// matches byte for byte.
// v173 - THE LETTERHEAD MUST NOT NEED A DISPLAY NAME TO KNOW WHOSE FILE IT IS
// TWO precached shell assets changed: /word-action.js and /gaps.js. /p/lyman was
// reported flipping again — the SAID brief on first paint, then "Loading the
// latest roster…" resolves and the same address re-renders record-first empty:
// courthouse/eagle art, CURRENT CANDIDATE, "No formal pattern on file yet", the
// position chips gone. Pace, Larson, Chew and Lee did not flip. v171 fixed the
// NAMED frame of this: the cards are filed under phil_lyman, the address is
// lyman, and the gate learned the publication floor's hop chain — direct id,
// alias table, slug of the display name, alias of that slug. What v171 left is
// the frame with NO DISPLAY NAME IN IT, and the warm path produces it three ways.
// The hero repaints with the person object captured at MOUNT, which on a cold
// arrival is a bare { id } assembled before the roster answered; firebase-boot.js
// will not let a blank document field overwrite a curated one, so a roster row
// can legitimately sit in memory with `name` empty; and the merged Firestore
// document reaches PROFILES before CMP_DATA has a row at all. In each of those
// the slug hop had nothing to slug, the cited count fell to zero, and the brief
// was refused for a file whose seven sourced positions never moved.
//   SO THE HOP NO LONGER DEPENDS ON A NAME. Two readers were added to it, both of
// tables this repo already writes. The merged profile's name is read AHEAD of the
// roster's, because the warm path puts the name there first — the headshot
// resolver has read it in exactly that order since v171, for exactly this reason.
// And then the alias tables are read BACKWARDS: they are written pointing AT the
// roster id (PDX_PROFILE_ALIAS maps phil_lyman → lyman), the id in hand IS the
// roster id, so the useful direction is the reverse one, found by scanning for
// entries that point here. That hop needs no display name at all, which is what
// makes the nameless frame safe. STANCE_ALIASES and PDX_PID_ALIASES are read the
// same way, because a curated card block can be filed under any key one of those
// three tables has already declared to be this person.
//   IT STILL CANNOT INVENT ANYBODY. Every candidate key must carry a non-empty
// stance list of its own before it is returned; the direct read is taken first and
// kept; an id with no list, no alias and no matching name resolves to itself and
// reads nothing. That is measured rather than asserted: the lyman suite sweeps all
// 673 roster ids whose cards are filed under their own id and every one of them
// still resolves to itself with no person object in hand, and it sweeps all 70
// bridged keys in the three shipped alias tables and requires each hop to land on
// a key this repo both holds cards under and declares to be the same person.
//   /gaps.js IS THE SECOND FILE, AND FOR THE SAME SENTENCE. The evidence locker's
// absent-term band prints the letterhead's own cited total — "No formal term to
// test yet — 7 documented positions, 0 acts on file." — and it was asking for that
// total without passing the person object it already holds. On the nameless frame
// the band and the brief would have printed two different counts for one file, so
// the object now travels with the pid. One predicate, one answer; no new source of
// fact and no new sentence.
//   NOTHING ELSE MOVED, AND NOTHING WAS LOOSENED. The four refusals in the gate
// are untouched: saidNoTerm still refuses the moment the pattern index weighs an
// act, this lane's own door still refuses on a ballot or a weighable act anywhere
// in the payload, on the rows the edge printed into the served document, and on
// the shipped static index — so an empty payload stays SAID, an unread or deferred
// or backfill row stays SAID, and a roll call or signed act still takes the file
// back to its record. chew_h68 keeps its record-first letterhead through a
// noteMember on the strength of the shipped index, lee's roll calls still refuse
// the word lane, and Pace, Larson and Bishop still lead with their words. The
// photo hop shipped in v171 is byte-identical and its 715-headshot regression
// sweep still moves nothing, so the eagle is still never painted over a loaded
// face. No second roster row is created for either spelling, no act is invented,
// and no percentage reaches a letterhead with one half of Word vs Action.
//   AND WHAT THE BUMP CARRIES WITH IT, UNCHANGED. Renaming SHELL_CACHE refetches
// every precached asset and renaming RUNTIME_CACHE drops every runtime one, so a
// warm device takes fresh copies of files that did not move a line in this pass:
//     · /word-action.css did not change. No element, class, hue or spacing on the
//       brief moved — the fix is which cards the gate can SEE, not what the block
//       looks like once it prints;
//     · /consistency.js is byte-identical. No arithmetic, no floor, no band, no
//       mapping, no mechanism entry and no export of the formal pattern index
//       moved, and the ballot vocabulary the gate reads is still asserted equal to
//       that engine's own private table at source;
//     · /stance-helpers.js and /publication-floor.js are byte-identical. The floor
//       hops the same four hops it always did and the sitemap's decision about
//       either spelling is unchanged; this pass ADDS a hop at the letterhead
//       rather than editing the floor;
//     · /profile-evidence.js and /cmp-data.js did not change. PDX_PROFILE_ALIAS
//       already said phil_lyman is lyman and the roster still holds exactly one
//       row for them, which is why the correct amount of new data here is none;
//     · /ballot-breakdown.js did not change. Its photo hop is v171's and is not a
//       precached shell asset in any case;
//     · /index.html did not change. This pass registers no script, no stylesheet
//       and no route, adds no nav item and mounts nothing itself: both readers are
//       new lines inside a module the page already loads, and /netlify.toml is
//       untouched too — neither spelling of this file's address moved, and the one
//       that redirects is still the one that redirected before;
//     · the issue desk and every pane it opens — /door1-workspace.js,
//       /door1-workspace.css, /issue-file.js, /issue-file.css, /issue-view.js,
//       /pdx-issue-profile.js (the /i/* address module), /pdx-issue-family.js,
//       /issue-colors.js, /stance-tree.js and /alignment-tool.js — are
//       byte-identical here. No count, order, band, boundary or measure read on
//       the desk moved, this pass mapped no issue and added no row to any of them,
//       and the desk never asked the SAID gate anything in the first place;
//     · /district-voice.js, /district-file.js, /district-room.js and every Voice
//       surface are byte-identical: no poll, option, tally, claim field or seat
//       allow-list was touched, and Voice adds no person and no formal act;
//     · /all-seeing-eye.js is a RUNTIME entry rather than a precached one, so it
//       is dropped by the runtime bucket's rename rather than by SHELL_ASSETS —
//       and it is byte-identical too: this pass publishes no searchable person and
//       changes nothing about how one is ranked.
//   NO WEIGHT, MAPPING, FLOOR OR LANE MOVED, no nav item, route, score or Voice
// row changed, and Direction Match is byte-identical — it still publishes no
// figure at all on a file with no formal term, because a file with one half of the
// test never had two halves to compute one from.
// v174 - AN EMPTY ANSWER IS STILL AN ANSWER, AND A LANDED RECORD IS NEVER A
// LOADING FAILURE
// TWO precached shell assets changed: /word-action.js and /voting-record.js. A
// HARD REFRESH ON /p/lyman settled empty — eagle placeholder, "No formal pattern
// on file yet", the seven sourced position chips gone — while the SAME SESSION,
// homepage first and then Lyman opened in-app, painted the word-first letterhead
// with its chips. Nothing about the person differed between those two readings.
// v171 and v173 fixed WHICH CARDS THE GATE CAN SEE, and that work is intact and
// byte-identical in its reasoning: the hop from the address lyman to the cards
// filed under phil_lyman still needs no display name and still cannot invent
// anybody. This pass is about something else entirely — not what the gate answers
// when asked, but WHETHER ANYTHING EVER ASKED IT AGAIN. The cold page is not one
// render. It is a mount and then a sequence of repaints driven by events, and two
// links in that sequence were broken for exactly one class of member: the one
// whose roll-call record is genuinely empty.
//   THE ARRIVAL WAS FILED IN SILENCE. memberRecords() answers null until
// noteMember has run and an array — POSSIBLY EMPTY — forever after, and that flip
// is the whole difference between "the answer is not here" and "the answer is
// none". The letterhead's saidLanded asks for precisely it, because a lane nobody
// has heard from is not an empty lane and a file must not be called wordless
// while its record is still in flight. But noteMember's arrival event was guarded
// on `items.length`, so the single member class whose answer IS empty announced
// that flip to nobody. On a cold /p/ arrival the hero mounts on an honest wait
// ("Still loading the roll-call record"), the answer lands 120ms later with
// totalRecords 0, and no surface in the tab was told. The wait stayed on screen
// over a payload already in memory. NOW A FIRST ARRIVAL ANNOUNCES ITSELF WHATEVER
// ITS LENGTH, and a later empty call over rows already held still does not — the
// event remains a transition rather than a per-call broadcast, and no caller that
// was already hearing it hears it a second time.
//   THEN THE 6s DEADLINE CALLED IT A LOADING FAILURE. armBriefDeadline exists so
// that a request which never comes back cannot leave "still loading" on a page
// forever, and that honesty is not negotiable. But it fired here over a record
// that had been filed five and a half seconds earlier, set the give-up flag, and
// the give-up is a hard veto on the word-first lane. From that moment the brief
// was unreachable for the life of the document and the record-first lane printed
// its empty-file paragraph over seven sourced positions — the settled frame in
// the report. A GIVE-UP IS A STATEMENT ABOUT A REQUEST, NOT ABOUT A PERSON: it
// now yields to the payload's own answer, because once the rows are filed — rows
// or none — there is nothing left to have given up on. The deadline still
// dispatches its repaint either way, since whatever is on screen is a wait that
// is over and the frame is owed regardless of which lane wins it.
//   A REQUEST THAT GENUINELY NEVER ANSWERS STILL SAYS SO. That is the reason the
// deadline exists and the one thing this pass could have quietly destroyed. It is
// measured rather than asserted: the new suite boots the identical cold document
// with the member answer WITHHELD, lets the real 6s timer come due, and requires
// the settled frame to read "The roll-call record did not load" and not an empty
// file. A network failure and an empty record are two different sentences and
// both are still sayable.
//   THE HOMEPAGE-FIRST PATH NEVER MET EITHER BUG, which is the whole asymmetry in
// the report: something else in the tab had already noted lyman, so the lane's
// answer was in hand at the FIRST paint, no wait was ever armed, and no deadline
// had anything to fire over. Both boots are now held side by side in one file —
// warm-then-open, and a fresh document on /p/lyman with no roster row, no
// Firestore document and no display name anywhere, mounted from a bare { id } —
// and every frame from the answer onward must be the word-first letterhead, with
// the empty-file paragraph appearing in no frame the reader ever held.
//   NOTHING WAS LOOSENED AND NOTHING WAS INVENTED. The four refusals in the gate
// are untouched: saidNoTerm still refuses the moment the pattern index weighs an
// act, and the lane's own door still refuses on a ballot or weighable act anywhere
// in the payload, on the rows the edge printed into the served document, and on
// the shipped static index. chew_h68 and lee keep their record-first letterhead
// through the identical cold boot. No act was added to any index, the roster still
// holds exactly ONE row for this person — phil_lyman is a card key and is not
// minted as a second roster id — and no rows are filed under the second spelling.
// The photo resolver is byte-identical and the key list a cold /p/ arrival asks is
// asserted equal to the list an in-app open asks, so a headshot under either
// spelling resolves in both states and the eagle is still only ever the honest
// answer for a person the bundle carries no face for.
//   AND WHAT THE BUMP CARRIES WITH IT, UNCHANGED. Renaming SHELL_CACHE refetches
// every precached asset and renaming RUNTIME_CACHE drops every runtime one, so a
// warm device takes fresh copies of files that did not move a line in this pass:
//     · /ballot-breakdown.js did not change. Its photo hop is v171's, and this
//       pass reads that hop in a harness rather than editing it;
//     · /word-action.css did not change. No element, class, hue or spacing on the
//       brief moved — the fix is WHEN the block is recomputed, not what it looks
//       like once it prints, and it adds no sentence to the letterhead;
//     · /consistency.js is byte-identical, including the deliberate choice not to
//       note a zero-row member from the matrix warm: that caller holds no answer
//       for such a member and must not claim one. No arithmetic, floor, band,
//       mapping or mechanism entry moved;
//     · /profile-evidence.js and /cmp-data.js did not change. PDX_PROFILE_ALIAS
//       already said phil_lyman is lyman, so the correct amount of new data in
//       this pass is none;
//     · /index.html did not change. No script, stylesheet or route is registered,
//       nothing new is mounted, and /netlify.toml is untouched — the head's
//       prefetch box this pass depends on is the one that already shipped;
//     · /stance-helpers.js, /publication-floor.js, /formal-index.js and
//       /gaps.js are byte-identical. The floor hops the same hops, the static
//       index judges exactly the people it judged before — it holds no reviewed
//       empty note for this person and none was added — and the evidence locker's
//       absent-term band still prints the letterhead's own cited total;
//     · the issue desk and every pane it opens — /door1-workspace.js,
//       /door1-workspace.css, /issue-file.js, /issue-file.css, /issue-view.js,
//       /pdx-issue-profile.js, /pdx-issue-family.js, /issue-colors.js,
//       /stance-tree.js and /alignment-tool.js — are byte-identical. This pass
//       mapped no issue, added no row and changed no count, and the desk never
//       asked the SAID gate anything in the first place;
//     · /district-voice.js, /district-file.js and /district-room.js are
//       byte-identical: no poll, option, tally, claim field or seat allow-list was
//       touched, and Voice adds no person and no formal act;
//     · /all-seeing-eye.js is a RUNTIME entry, dropped by the runtime bucket's
//       rename rather than by SHELL_ASSETS, and it is byte-identical too: this
//       pass publishes no searchable person and changes nothing about ranking.
//   NO WEIGHT, MAPPING, FLOOR OR LANE MOVED, no nav item, route, score or Voice
// row changed, and Direction Match is byte-identical — it still publishes no
// figure on a file with no formal term, because a file with one half of the test
// never had two halves to compute one from.
const CACHE_VERSION = 'v174';
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
  // The District Room and its stylesheet, /d/<districtKey>/<issueKey>. On this
  // list for both of the reasons the issue-file pair above is: a device that
  // holds the /d/* rewrite (it ships in netlify.toml, at the edge) but not this
  // module resolves a neighbour's citation and then shows them the homepage, and
  // an unstyled room is a full-bleed wall of text over the page rather than a
  // panel. The pair is small and it paints nothing on the front page — the two
  // entry blocks only exist on a district seat row and on an issue letterhead,
  // and both answer '' for a reader we cannot place.
  '/district-room.js',
  '/district-room.css',
  // The district file and its stylesheet, /d/<districtKey>. On this list for the
  // same two reasons as the pair above, and for one more: it is the surface a
  // neighbour is most likely to have SAVED. A device holding the /d/* rewrite
  // without this module resolves a saved district address and then shows the
  // homepage, which is the exact failure this page exists to fix. The pair is
  // small and paints nothing on the front page — the panel only builds when the
  // address names a district that has a file.
  '/district-file.js',
  '/district-file.css',
  // District Voice and its stylesheet — the seat's live question, its neighbours'
  // takes and the composer, mounted INSIDE the district file above the issue rooms.
  // On this list because it travels with the pair above and for one reason of its
  // own: a device holding district-file.js WITHOUT this module opens a saved
  // /d/<seatKey> and paints a file whose first block is missing, which reads as
  // "this seat has nothing" over a seat with a live poll. The module fails soft
  // when it is absent, so the rooms still paint — but the two are shipped as one
  // page and are cached as one. It paints nothing anywhere else: the mount only
  // runs for a seat on Voice's own allow-list, and there is no front-page work.
  '/district-voice.js',
  '/district-voice.css',
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
  // The one field function: office + state + district -> every roster pid on
  // that seat key, with the holders taken from pdxSeatHolders and nobody on the
  // key omitted. Precached ahead of race-sheet.js / ballot-breakdown.js because
  // those two now ASK it who is on a seat before falling back to their own
  // keying — offline without this file the Compare Field of a redistricted seat
  // reverts to the curated ballot's district and names the wrong member.
  '/seat-field.js',
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
  '/person-outline.js',
  '/person-outline.css',
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
  // ⚖ Judicial retention — the third branch, on both doors. Precached as a set
  // of four plus a stylesheet because they are only ever useful together and
  // because two of them are modules a reader arrives THROUGH: a shared
  // /p/<judge_pid> link resolves through judge-file.js, and if judge-file.js is
  // missing the pid falls to the roster renderer, which holds no record for a
  // judge and would answer a real address with "isn't someone we currently
  // carry a record for". judicial-data.js and judicial-retention.js are its
  // inputs — the roster rows and the locked vocabulary — so a version skew
  // between them is a file that renders with no court and no retention date.
  // judicial-ballot.js is the Door 2 band, which is the surface that tells a
  // Utah voter their ballot has judges on it at all. The stylesheet ships with
  // them because unstyled, the Retain / Do not retain pair loses the framing
  // that makes it read as the ballot's own inert question rather than two
  // buttons the reader is being asked to press.
  '/judicial-data.js',
  '/judicial-retention.js',
  '/judge-file.js',
  '/judicial-ballot.js',
  '/judicial-retention.css',
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
