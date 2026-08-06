// ─────────────────────────────────────────────────────────────────────────────
// 🎴 Homepage record card — the shareable summary, in the hero
// ─────────────────────────────────────────────────────────────────────────────
// Paints a politician summary card into #hero-showcase: photo, the one ⚖️ Word vs
// Action read, coverage, the backed-up/mixed/contradicted breakdown, proof in both
// directions, branding — rotating through the best-covered profiles. Replaced a
// single "Says One Thing · Does Another" receipt, because one receipt about one
// person on one issue is an anecdote, and an anecdote read cold looks like a gotcha
// rather than a system. hero-receipt.js is unchanged and still runs, demoted to a
// lead-in above the Say-vs-Do band.
//
// THIS FILE OWNS NO JUDGEMENT. Every word of the read comes from PDXProfileCard —
// the same module that draws the shareable image — via brief()/read(). Verdict,
// counts, coverage, highlights, lowlights, signal sentence and gap prose are all
// ITS output, printed as HTML instead of on a canvas. Nothing is scored, tallied
// or re-labelled here. To change what a card says, change profile-card.js.
//
// THE SEED CARRIES NO VERDICTS AND CANNOT. hero-showcase-data.js is an invitation
// list: ranked pids with name, office, party. The ACTION half of most comparisons
// is the roll-call record, which lives in the database behind /api/voting-record
// and is only warm in a live browser — asked at build time, every marquee profile
// answers "Loading the record…", below the publishing floor with nothing tested. A
// seed built from that would either paint a hero of loading states or freeze a thin
// verdict into a static file and keep showing it after the record filled in.
//
// So: (1) identity paints immediately from the seed, with the signal slot in the
// app's own `pending` state — no data file, no network, no layout shift. (2) The
// read arrives when the engine warms on its existing lazy schedule. (3) Anyone
// whose settled read is not publishable is dropped from the rotation, having never
// shown a hollow signal; if all are dropped the slot hides itself.
//
// Guardrails: nothing on the critical path but the seed and this file; only the
// featured pids are warmed, never the roster; brief() decides eligibility and the
// expensive read() runs for the visible card only. See .netlify/results.md for the
// full rationale, rotation rules and performance notes.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  var host = document.getElementById('hero-showcase');
  if (!host) return;

  // Re-check the shape at render time: a report card on someone the reader cannot
  // place is not checkable, and checking again costs nothing.
  var pool = (Array.isArray(window.PDX_HERO_SHOWCASE) ? window.PDX_HERO_SHOWCASE : [])
    .filter(function (c) { return c && c.pid && c.name && c.office; })
    .map(function (c) {
      return {
        pid: String(c.pid),
        name: String(c.name),
        office: String(c.office),
        party: c.party && c.party.label
          ? { label: String(c.party.label), color: String(c.party.color || '#94a3b8') }
          : null,
        // 'unknown' until a settled read either publishes it or rules it out.
        state: 'unknown'
      };
    });

  if (!pool.length) { host.hidden = true; return; }

  // The seed is deeper than the rotation so a bad day at the database cannot empty
  // the hero, but every extra pid is a request. Past six shown, another card adds a
  // dot to the rail and nothing to the argument.
  var WARM_MAX = 8;
  var SHOW_MAX = 6;
  var AUTO_MS = 9000;

  var warmSet = pool.slice(0, WARM_MAX);

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function reduced() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  }

  function PC() { return window.PDXProfileCard || null; }

  // Day-based entry point, lifted from hero-receipt.js for its reason: a fixed
  // start index makes one person the permanent face of the front page, and since
  // the seed is party-interleaved, one party the permanent first impression.
  // Rotating on the day keeps that fairness while staying stable inside a visit.
  var dayIndex = 0;
  try { dayIndex = Math.floor(Date.now() / 86400000); } catch (e) { dayIndex = 0; }

  var idx = 0;
  var started = false;
  var autoTimer = null;
  var paused = false;

  // Before the engine speaks every candidate is in play; after, only publishable ones.
  function visible() {
    var pub = pool.filter(function (c) { return c.state === 'publishable'; });
    if (pub.length) return pub.slice(0, SHOW_MAX);
    return pool.filter(function (c) { return c.state === 'unknown'; }).slice(0, SHOW_MAX);
  }

  // Cached per pid, dropped whenever a record warms — the only thing that can
  // change an answer. Mirrors profile-card.js's own memo policy.
  var readCache = {};
  function liveRead(pid) {
    if (Object.prototype.hasOwnProperty.call(readCache, pid)) return readCache[pid];
    var d = null;
    try {
      var pc = PC();
      if (pc && typeof pc.read === 'function') d = pc.read(pid);
    } catch (e) { d = null; }
    readCache[pid] = d;
    return d;
  }
  function bustReads() { readCache = {}; }
  // A warm event names ONE member, and a read is per-pid, so only that member's
  // answer can have changed. Throwing the whole cache away on every arrival made
  // the painted card pay for a full PDXProfileCard.read() eight times over a cold
  // load — seven of them recomputing an answer nothing had touched.
  function dropRead(pid) { if (pid) delete readCache[pid]; else bustReads(); }

  // ── CARD · PDXProfileCard's output, in HTML instead of on a canvas ──────────

  // Through the same-origin proxy at the displayed size, so the hero never
  // downloads a 1000px headshot to paint it at 72px. A missing address is not a
  // failure state — the monogram is the same fallback the shared image uses.
  function faceHtml(c) {
    var raw = '';
    try {
      if (typeof window._getPhotoUrl === 'function') raw = String(window._getPhotoUrl(c.pid) || '').trim();
    } catch (e) { raw = ''; }
    var src = '';
    if (/^data:image\//i.test(raw)) src = raw;
    else if (/^\/\//.test(raw)) raw = 'https:' + raw;
    if (!src && /^https?:/i.test(raw)) {
      src = '/.netlify/images?url=' + encodeURIComponent(raw) + '&w=224&h=224&fit=cover';
    } else if (!src && raw.charAt(0) === '/') src = raw;

    if (!src) {
      var parts = String(c.name || '').trim().split(/\s+/).filter(Boolean);
      var ini = ((parts[0] || '')[0] || '') + (parts.length > 1 ? (parts[parts.length - 1][0] || '') : '');
      return '<div class="pdx-hs-face pdx-hs-face-mono" aria-hidden="true">' +
        esc(ini.toUpperCase() || '★') + '</div>';
    }
    // Only the painted card has an <img>, so a rotation of six fetches one portrait.
    return '<img class="pdx-hs-face" src="' + esc(src) + '" width="112" height="112" ' +
           'alt="" decoding="async" loading="eager" ' +
           'onerror="this.classList.add(\'pdx-hs-face-gone\')">';
  }

  // The one signal. Glyph, words and colour are the verdict's own, never re-picked
  // here. The waiting state uses VERDICTS.pending for the same reason consistency.js
  // keeps ONE phrase for one wait: this card, the profile's Voting Record Highlights
  // and word-action.js can all be waiting on the same fetch, and three wordings for
  // one fetch reads as three different states.
  function signalHtml(d) {
    var CS = window.PDXConsistency;
    var pend = (CS && CS.VERDICTS && CS.VERDICTS.pending) || null;
    var v = (d && d.verdict) || pend;
    var ico = (v && v.ico) || '⏳';
    var label = (v && v.label) || 'Loading the record…';
    var tint = d && d.publishable && d.accent ? d.accent : '';
    return '' +
      '<div class="pdx-hs-signal' + (d && d.publishable ? ' is-pub' : '') + '">' +
        '<div class="pdx-hs-sig-eyebrow">⚖️ Word vs Action</div>' +
        '<div class="pdx-hs-sig-read"' + (tint ? ' style="color:' + esc(tint) + ';"' : '') + '>' +
          '<span class="pdx-hs-sig-ico" aria-hidden="true">' + esc(ico) + '</span>' +
          '<span class="pdx-hs-sig-label">' + esc(label) + '</span>' +
        '</div>' +
        (d && d.signal ? '<p class="pdx-hs-sig-line">' + esc(d.signal) + '</p>' : '') +
      '</div>';
  }

  // Counts plus a proportional bar — the verdict showing its work. Never a
  // percentage: a rate needs its denominator beside it, and the denominator is the
  // coverage line directly below.
  function breakdownHtml(d) {
    var b = d && d.breakdown;
    if (!b) return '';
    var total = (b.consistent || 0) + (b.mixed || 0) + (b.contradicts || 0);
    if (!total) return '';
    var seg = function (n, cls) {
      return n ? '<span class="pdx-hs-bar-seg ' + cls + '" style="flex:' + n + ';"></span>' : '';
    };
    var chip = function (n, cls, word) {
      return '<span class="pdx-hs-bd-chip ' + cls + '"><b>' + n + '</b> ' + word + '</span>';
    };
    return '' +
      '<div class="pdx-hs-bd">' +
        '<div class="pdx-hs-bar" role="img" aria-label="' +
          esc(b.consistent + ' backed up, ' + b.mixed + ' mixed, ' + b.contradicts + ' contradicted') + '">' +
          seg(b.consistent, 'is-good') + seg(b.mixed, 'is-mixed') + seg(b.contradicts, 'is-bad') +
        '</div>' +
        '<div class="pdx-hs-bd-chips">' +
          chip(b.consistent || 0, 'is-good', 'backed up') +
          chip(b.mixed || 0, 'is-mixed', 'mixed') +
          chip(b.contradicts || 0, 'is-bad', 'contradicted') +
        '</div>' +
      '</div>';
  }

  // Same words the shared image's caption uses, so a reader who sees both cannot
  // find two accounts of the same profile.
  function coverageHtml(d) {
    var cov = d && d.coverage;
    if (!cov) return '';
    var bits = [cov.stances + ' stance' + (cov.stances === 1 ? '' : 's')];
    if (cov.pledges) bits.push(cov.pledges + ' tracked pledge' + (cov.pledges === 1 ? '' : 's'));
    if (cov.votes !== null && cov.votes !== undefined) {
      bits.push(cov.votes + ' mapped vote' + (cov.votes === 1 ? '' : 's') + ' on record');
    }
    bits.push(cov.tested + ' of ' + cov.scorable + ' testable');
    return '<p class="pdx-hs-cov"><span class="pdx-hs-cov-k">Coverage</span>' + esc(bits.join(' · ')) + '</p>';
  }

  // Proof, both directions. With no contradiction to print, the strongest real GAP
  // goes here rather than nothing — silence in this slot reads as "clean".
  function proofHtml(d) {
    var rows = [];
    var one = function (kind, ico, k, item) {
      if (!item) return;
      rows.push(
        '<li class="pdx-hs-proof-row is-' + kind + '">' +
          '<span class="pdx-hs-proof-ico" aria-hidden="true">' + ico + '</span>' +
          '<span class="pdx-hs-proof-txt">' +
            '<span class="pdx-hs-proof-k">' + k + '</span>' +
            '<b>' + esc(item.title) + '</b>' +
            (item.action ? '<span class="pdx-hs-proof-act">' + esc(item.action) + '</span>' : '') +
          '</span>' +
        '</li>'
      );
    };
    one('good', '&#10003;', 'Record backs them', (d.highlights || [])[0]);
    if ((d.lowlights || []).length) {
      var isMixed = d.lowlightKind === 'mixed';
      one(isMixed ? 'mixed' : 'bad',
          isMixed ? '&#9689;' : '&#9888;',
          isMixed ? 'Cuts both ways' : 'Record contradicts them',
          d.lowlights[0]);
    } else if ((d.gaps || []).length) {
      one('gap', '&#8212;', 'Still missing', d.gaps[0]);
    }
    return rows.length ? '<ul class="pdx-hs-proof">' + rows.join('') + '</ul>' : '';
  }

  function headHtml(c, d) {
    var party = (d && d.party) || c.party;
    return '' +
      '<div class="pdx-hs-head">' +
        faceHtml(c) +
        '<div class="pdx-hs-who">' +
          '<h2 class="pdx-hs-name">' + esc((d && d.name) || c.name) + '</h2>' +
          '<p class="pdx-hs-office">' + esc((d && d.office) || c.office) + '</p>' +
        '</div>' +
        (party
          ? '<span class="pdx-hs-party" style="--p:' + esc(party.color) + '">' +
              esc(String(party.label || '').charAt(0)) + '</span>'
          : '') +
      '</div>';
  }

  // No read yet. Identity is real and printed; the signal slot shows the app's own
  // pending state. Deliberately NO breakdown, NO coverage figures and NO proof rows:
  // an empty bar and a row of zeroes read as a finding of nothing, which is the one
  // thing a card that has not looked yet must not say.
  function pendingCard(c) {
    return headHtml(c, null) + signalHtml(null) +
      '<p class="pdx-hs-cov pdx-hs-cov-wait">Pulling their voting record to test what they have said.</p>';
  }

  function fullCard(c, d) {
    return headHtml(c, d) + signalHtml(d) + breakdownHtml(d) + coverageHtml(d) + proofHtml(d);
  }

  // ── FRAME · chrome that does not change between slides ─────────────────────
  function frame(c, inner, pos, count) {
    var many = count > 1;
    return '' +
      '<div class="pdx-hs-rail">' +
        '<span class="pdx-hs-rail-l">' +
          '<span class="pdx-hs-eyebrow">Record card</span>' +
          // "3 of 6" — makes this an item from a set, not one stranger singled out.
          (many ? '<span class="pdx-hs-pos">' + pos + ' of ' + count + '</span>' : '') +
        '</span>' +
        (many
          ? '<span class="pdx-hs-nav">' +
              '<button type="button" class="pdx-hs-arrow pdx-hs-prev" aria-label="Previous record card">' +
                '<span aria-hidden="true">&#8592;</span></button>' +
              '<button type="button" class="pdx-hs-arrow pdx-hs-next" aria-label="Next record card">' +
                '<span aria-hidden="true">&#8594;</span></button>' +
            '</span>'
          : '') +
      '</div>' +
      '<p class="pdx-hs-intro">' +
        'This is the whole read on one person — what they said, what the record shows, ' +
        'and how much of it we could actually test. ' +
        (many ? 'Every politician here gets the same card.' : '') +
      '</p>' +
      '<article class="pdx-hs-card" role="button" tabindex="0" data-pid="' + esc(c.pid) + '" ' +
        'aria-label="' + esc('Open ' + c.name + '’s full profile') + '">' +
        inner +
        '<div class="pdx-hs-foot">' +
          '<span class="pdx-hs-brand">' +
            '<b>POLITIDEX</b><span class="pdx-hs-brand-tag">Bound by Truth</span>' +
            '<span class="pdx-hs-brand-url">politidex.fyi</span>' +
          '</span>' +
          '<span class="pdx-hs-acts">' +
            '<button type="button" class="pdx-hs-act pdx-hs-share" data-pid="' + esc(c.pid) + '" ' +
              'aria-label="' + esc('Share ' + c.name + '’s record card') + '">Share</button>' +
            '<button type="button" class="pdx-hs-act pdx-hs-open" data-pid="' + esc(c.pid) + '">Full record &#8594;</button>' +
          '</span>' +
        '</div>' +
      '</article>' +
      (many ? '<div class="pdx-hs-dots" role="tablist" aria-label="Choose a record card">' +
                dotsHtml(pos, count) + '</div>' : '');
  }

  function dotsHtml(pos, count) {
    var out = '';
    for (var n = 1; n <= count; n++) {
      out += '<button type="button" class="pdx-hs-dot' + (n === pos ? ' is-on' : '') + '" ' +
             'data-go="' + (n - 1) + '" role="tab" aria-selected="' + (n === pos ? 'true' : 'false') + '" ' +
             'aria-label="Record card ' + n + ' of ' + count + '"></button>';
    }
    return out;
  }

  // ── PAINT ──────────────────────────────────────────────────────────────────
  var rafPending = false;
  function draw() {
    if (rafPending) return;
    rafPending = true;
    var run = function () { rafPending = false; paint(); };
    if (window.requestAnimationFrame) window.requestAnimationFrame(run);
    else run();
  }

  function paint() {
    var list = visible();
    if (!list.length) {
      // Every candidate ruled out. An empty proof slot is honest; a card built on
      // a read that will not publish is not.
      host.hidden = true;
      host.innerHTML = '';
      stopAuto();
      return;
    }
    if (idx >= list.length) idx = 0;
    if (idx < 0) idx = list.length - 1;

    var c = list[idx];
    var d = (c.state === 'publishable') ? liveRead(c.pid) : null;
    host.innerHTML = frame(c, d ? fullCard(c, d) : pendingCard(c), idx + 1, list.length);
    host.hidden = false;

    // Rotating swaps the whole card and a screen-reader user otherwise hears
    // nothing — focus stays on an arrow whose label did not change. The attribute
    // goes on the HOST: paint() replaces this element's contents, and a live region
    // nested in the replaced markup is destroyed and rebuilt with it. Armed only
    // after the first paint, so page load is silent.
    if (!host.__pdxLive) { host.__pdxLive = 1; return; }
    try { host.setAttribute('aria-live', 'polite'); } catch (e) {}
  }

  // ── ROTATION ───────────────────────────────────────────────────────────────
  function go(n) {
    var list = visible();
    if (!list.length) return;
    idx = ((n % list.length) + list.length) % list.length;
    draw();
  }
  function step(delta) { go(idx + delta); }

  function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } }

  // A convenience, never the only way through: off under prefers-reduced-motion,
  // off below two publishable cards, and any deliberate interaction stops it for
  // good — a carousel that resumes under someone who just took hold of it is worse
  // than one that never moved.
  function startAuto() {
    stopAuto();
    if (reduced() || paused) return;
    if (visible().length < 2) return;
    autoTimer = setInterval(function () {
      if (paused || document.hidden) return;
      step(1);
    }, AUTO_MS);
  }
  function pause() { if (!paused) { paused = true; stopAuto(); } }

  // Hover and focus pause without ending it: reading a card should not cost the
  // rotation, but neither should it be interrupted mid-sentence.
  host.addEventListener('mouseenter', stopAuto);
  host.addEventListener('mouseleave', function () { if (!paused) startAuto(); });
  host.addEventListener('focusin', stopAuto);
  host.addEventListener('focusout', function () { if (!paused) startAuto(); });
  host.addEventListener('touchstart', pause, { passive: true });

  host.addEventListener('click', function (e) {
    var t = e.target;
    var hit = function (sel) { return t.closest && t.closest(sel); };

    if (hit('.pdx-hs-prev')) { pause(); step(-1); return; }
    if (hit('.pdx-hs-next')) { pause(); step(1); return; }

    var dot = hit('.pdx-hs-dot');
    if (dot) { pause(); go(parseInt(dot.getAttribute('data-go'), 10) || 0); return; }

    var share = hit('.pdx-hs-share');
    if (share) {
      e.stopPropagation();
      pause();
      var spid = share.getAttribute('data-pid');
      var pc = PC();
      // The card's own share pipeline, unchanged: it warms, RE-READS, draws the
      // 1080×1350 image and hands it to the native sheet. Nothing from this
      // component's read is passed in, so what leaves the site is never a snapshot.
      if (pc && typeof pc.share === 'function') { try { pc.share(spid, share); return; } catch (err) {} }
      if (typeof window.showProfile === 'function') window.showProfile(spid);
      return;
    }

    var open = hit('.pdx-hs-open') || hit('.pdx-hs-card');
    if (open) {
      var pid = open.getAttribute('data-pid');
      if (typeof window.showProfile === 'function') { window.showProfile(pid); return; }
      location.hash = '#compare-hub';
    }
  });

  host.addEventListener('keydown', function (e) {
    var card = e.target.closest && e.target.closest('.pdx-hs-card');
    if (card && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      pause();
      if (typeof window.showProfile === 'function') window.showProfile(card.getAttribute('data-pid'));
      return;
    }
    if (e.key === 'ArrowLeft') { pause(); step(-1); }
    else if (e.key === 'ArrowRight') { pause(); step(1); }
  });

  // Swipe. Threshold + dominance check keep a vertical scroll from reading as a flick.
  (function swipe() {
    var x0 = null, y0 = null;
    host.addEventListener('touchstart', function (e) {
      var t = e.touches && e.touches[0];
      if (t) { x0 = t.clientX; y0 = t.clientY; }
    }, { passive: true });
    host.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var t = e.changedTouches && e.changedTouches[0];
      if (!t) { x0 = null; return; }
      var dx = t.clientX - x0, dy = t.clientY - y0;
      x0 = null; y0 = null;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      step(dx < 0 ? 1 : -1);
    }, { passive: true });
  })();

  // ── ENGINE PHASE · warm, read, rule out ────────────────────────────────────

  var engineStart = 0;
  // How long a candidate is given to start looking before silence counts against
  // it — comfortably longer than warm()'s 150ms debounce plus a slow round trip.
  var GRACE_MS = 2500;

  // FAIL CLOSED, BUT NOT PREMATURELY — the footgun in this component. `warming`
  // alone cannot tell "still arriving" from "never asked": PDXWordAction marks an
  // item warming only while a fetch is in flight (word-action.js, ov.pending), and
  // before it registers the item reports `no_action_yet`, indistinguishable from a
  // genuinely empty record. warm() is debounced 150ms, so for a fraction of a second
  // after beginEngine EVERY candidate looks empty — ruling out there would hide the
  // hero one tick before the data arrived, on every cold load. Hence allowRuleOut,
  // set only once the grace period has elapsed: until then a candidate can be
  // promoted but never eliminated.
  function settle(c, allowRuleOut) {
    // Already answered. brief() is a full PDXWordAction.read(), and a candidate
    // that cleared the publishing floor cannot be argued back below it by a later
    // arrival — re-asking buys nothing and costs one whole read per candidate per
    // pass. The card's CONTENT still refreshes: paint() re-reads through
    // liveRead(), whose entry dropRead() clears when that member's record lands.
    if (c.state === 'publishable') return;
    var pc = PC();
    if (!pc || typeof pc.brief !== 'function') return;
    var b = null;
    try { b = pc.brief(c.pid); } catch (e) { b = null; }
    if (b && b.publishable) { c.state = 'publishable'; return; }
    if (!allowRuleOut) return;
    // Still fetching is not a verdict. Leave it unknown so a later event can
    // publish it, rather than burning a candidate on a slow request.
    if (b && b.coverage && b.coverage.warming) return;
    c.state = 'ruled-out';
  }

  // Hold the reader's place across a state change: stay on their card if it
  // survived, else land on the first survivor, not wherever idx points.
  function holdPlace(mutate) {
    var wasPid = null;
    var list = visible();
    if (list.length) wasPid = list[idx] && list[idx].pid;
    mutate();
    var now = visible();
    var keep = -1;
    for (var n = 0; n < now.length; n++) { if (now[n].pid === wasPid) { keep = n; break; } }
    idx = keep === -1 ? 0 : keep;
  }

  // ONE member's record landed. Settle that member and nobody else.
  //
  // This is the fix for the homepage lock-up. Records arrive one per request, and
  // every arrival used to run the full pass below: flush every cached read, then
  // brief() all eight candidates — eight complete PDXWordAction reads — inside the
  // fetch's own callback. Eight arrivals therefore meant sixty-four reads plus
  // eight full re-reads of the painted card, measured at ~350 ms of blocking work
  // on a desktop CPU and several seconds on a phone, landing in the same frames as
  // eight ~125 KB JSON parses and the roster render. The main thread never got a
  // gap wide enough to answer a tap, which is what Chrome reports as an
  // unresponsive page. One arrival can only change one member's answer, so this
  // does one member's work: a single brief, a single cache entry dropped.
  //
  // Promotion only — ruling a candidate out is still the sweep's job, on the
  // grace-period backstops, so a member whose record simply has not arrived is
  // never burned by another member's event.
  function settleOne(pid) {
    var c = null;
    for (var i = 0; i < warmSet.length; i++) {
      if (warmSet[i].pid === String(pid)) { c = warmSet[i]; break; }
    }
    // Not one of ours. A profile modal elsewhere warms members too, and re-reading
    // the whole hero because some unrelated member settled is pure waste.
    if (!c) return;
    if (c.state === 'publishable') { dropRead(c.pid); draw(); return; }
    dropRead(c.pid);
    holdPlace(function () { settle(c, false); });
    draw();
    startAuto();
  }

  function settleAll() {
    bustReads();
    // Gate on `started`, not on the timestamp — a clock reading is not a flag.
    var allowRuleOut = false;
    if (started) {
      try { allowRuleOut = (Date.now() - engineStart) >= GRACE_MS; } catch (e) { allowRuleOut = true; }
    }

    holdPlace(function () {
      warmSet.forEach(function (c) { settle(c, allowRuleOut); });
      // Past the warm cap they were never fetched, so they can never publish. Ruling
      // them out keeps visible() honest, and is safe even on the first pass.
      pool.forEach(function (c) {
        if (warmSet.indexOf(c) === -1 && c.state === 'unknown') c.state = 'ruled-out';
      });
    });

    draw();
    startAuto();
  }

  function beginEngine() {
    if (started) return;
    started = true;
    try { engineStart = Date.now(); } catch (e) { engineStart = 1; }

    // Only the featured pids, one fetch each, through the queue consistency.js
    // already debounces and de-duplicates. Never the roster.
    warmSet.forEach(function (c) {
      try {
        var pc = PC();
        if (pc && typeof pc.warm === 'function') pc.warm(c.pid);
      } catch (e) {}
    });

    // Records land one at a time; re-settling per event fills the hero in
    // progressively instead of waiting on the slowest request. Both dispatchers
    // name the member in detail.pid (consistency.js flushWarm, voting-record.js
    // _openVoting), so the common path costs one brief. An event with no pid is
    // not a shape either of them emits; it falls back to the full sweep rather
    // than guessing, which is correct but is why the sweep must stay cheap.
    var onWarm = function (ev) {
      var pid = ev && ev.detail && ev.detail.pid;
      if (pid) { settleOne(pid); return; }
      settleAll();
    };
    try {
      window.addEventListener('pdx-consistency-warm', onWarm);
      window.addEventListener('pdx-voting-warm', onWarm);
    } catch (e) {}

    // Publish-only pass — nothing has had time to fail. A returning visitor with a
    // warm cache gets real cards right here.
    settleAll();

    // Backstops for when no warm event ever arrives (offline, failing endpoint, a
    // member with no roll-call rows): promote whoever quietly became publishable and,
    // grace period past, rule out whoever did not. Without these the hero would sit
    // on "Loading the record…" forever instead of showing what it has or standing down.
    try { setTimeout(settleAll, GRACE_MS + 500); } catch (e) {}
    try { setTimeout(settleAll, 12000); } catch (e) {}
  }

  // ── Phase 1 · identity, now. No engine, no data file, no network ────────────
  idx = (((dayIndex % pool.length) + pool.length) % pool.length);
  if (idx >= SHOW_MAX) idx = idx % SHOW_MAX;
  paint();

  // ── Phase 2 · the read, when the engine warms ──────────────────────────────
  // THIS WAITS AND NEVER ASKS — the other footgun. acct-spotlight-data.js is
  // ~154 KB gzipped and stays exactly as lazy as it was; pulling it forward for the
  // hero would move all of it onto the critical path to buy a card that is one
  // interaction away from filling in by itself. So: deliberately NOT
  // PDXLazyData.whenReady(), which guarantees its callback by kicking off the load
  // itself. Listening for the ready event directly gets the same callback with none
  // of the pull, and it still always arrives — pdx-lazy-data.js's third trigger is
  // an unconditional post-load idle fallback for every visitor, including one who
  // never scrolls or taps. #hero-showcase is likewise absent from that file's
  // SECTIONS list: an observer on an above-the-fold element fires instantly, which
  // is an eager load with extra steps.
  function armEngine() {
    var LD = window.PDXLazyData;
    if (LD && typeof LD.loaded === 'function' && LD.loaded('acctSpotlight')) {
      beginEngine();
      return;
    }
    try { document.addEventListener('pdx:data:acctSpotlight', beginEngine, { once: true }); } catch (e) {}
    // Last resort, well after the idle fallback would have fired. If the data never
    // loads the engine still runs, finds nothing publishable, and the slot stands
    // down — honest, and better than a hero stuck waiting because one listener
    // never got its event.
    try { setTimeout(beginEngine, 15000); } catch (e) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', armEngine);
  else armEngine();

  // A record settling later (a profile modal elsewhere warms members too) should
  // upgrade the hero, not leave it stale.
  try {
    document.addEventListener('pdx:data:acctSpotlight', function () { if (started) settleAll(); });
  } catch (e) {}

  // An unseen carousel burns battery and lands the visitor on an arbitrary card.
  try {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopAuto();
      else if (!paused) startAuto();
    });
  } catch (e) {}

  // Someone turning reduced-motion on mid-visit should see it take effect.
  try {
    var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq && mq.addEventListener) {
      mq.addEventListener('change', function () { if (reduced()) stopAuto(); else startAuto(); });
    }
  } catch (e) {}
})();
