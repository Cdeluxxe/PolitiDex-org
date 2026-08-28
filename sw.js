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
const CACHE_VERSION = 'v79';
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
  // Issue color tokens. Tiny, and precached with alignment-tool.js so an offline
  // repeat visit keeps issues colour-coded instead of falling back to slate
  // everywhere, which would read as "nothing is a core issue".
  '/issue-colors.js',
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

  // Voting-record offline packs are a static-ish artifact (ETagged, rebuilt at
  // most every few hours), so — unlike the rest of /api/* — cache them
  // stale-while-revalidate. This is what lets a previously-viewed member's voting
  // record render with no network. Must be checked BEFORE the /api/ skip below.
  if (url.origin === self.location.origin &&
      /^\/api\/voting-record\/member\/[^/]+\/pack$/.test(url.pathname)) {
    event.respondWith(handleStatic(req));
    return;
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

// Stale-while-revalidate for navigations. Repeat visits are the common case on
// phones, so serve the cached app shell immediately (no waiting on the large HTML
// document over a slow mobile connection) and refresh the cache in the background
// for the next load. Only the first visit — or a visit after the cache was pruned —
// pays the network cost; if that also fails we show the inline offline page.
async function handleNavigate(req) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = (await cache.match(req)) || (await cache.match('/'));

  const network = fetch(req).then((res) => {
    // Refresh the canonical shell entry so '/' and deep links boot with the
    // newest page next time.
    if (res && res.ok) cache.put('/', res.clone()).catch(() => {});
    return res;
  }).catch(() => null);

  if (cached) {
    network; // fire-and-forget background refresh
    return cached;
  }

  const res = await network;
  if (res) return res;

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
