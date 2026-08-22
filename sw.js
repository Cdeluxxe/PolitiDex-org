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
const CACHE_VERSION = 'v64';
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
