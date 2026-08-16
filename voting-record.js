/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Voting Record (profile section)  ·  Phase 3
   ────────────────────────────────────────────────────────────────────────────
   The "what they actually DID" panel on a politician profile. Where the Key
   Issue Stances section shows what someone SAYS, this shows the receipts — the
   roll-call votes and non-vote actions (co-sponsorships, amicus briefs) pulled
   live from the /api/voting-record Function (the vr_* tables), keyed to the same
   ISSUE_MAP issueKeys the rest of the app uses.

   It is deliberately ADDITIVE and SELF-GATING: the section renders hidden and
   only reveals itself once a member is confirmed to have a record. A profile
   with no voting data looks exactly as it did before (no empty card, no flash),
   and a network/offline failure fails quietly — nothing else on the profile is
   affected.

   Data it leans on (all already global, loaded before this file):
     • window.ISSUE_MAP                 — issue labels/icons for chips + groups
     • window._polPositionMap(id, p)    — the member's stated stances by issueKey
     • window._voteEffectiveSupport     — Phase-2 engine (stance-vs-record)
     • window._stanceVoteVerdict        —   "
     • window._issueRecordSummary       —   "
     • window._polRecordMap             —   "  per-issue "say vs. do" rollup

   Styling reuses the Stance Library visual language (.sl-* look — dark navy
   panels, blue primary, gold active) via a small injected .vr-* stylesheet so
   the panel reads as a sibling of the Library and the Evidence Locker.

   Public surface:
     window.PDXVotingRecord.fetchMember(id, opts) -> Promise<data|null>  (cached)
     window.PDXVotingRecord.fetchIssueRecords(keys) -> Promise<{byPid,…}|null>
         one batched request for EVERY member's record on a set of issueKeys, for
         surfaces that must rank a whole field (issue-first ranking) rather than
         read one profile. Rehydrates into the same item shape fetchMember returns.
     window._renderVotingRecord(id, p)            -> shell HTML string
     window._pdxInitVotingRecord()                -> hydrate after modal render
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var API_BASE = '/api/voting-record';
  // One profile modal is open at a time, so a single module-level state is safe.
  var _state = null;
  // Guard so a stale fetch (user closed/opened another profile) can't paint.
  var _openToken = 0;

  // ── HTML escape — every dynamic string that lands in innerHTML goes through it ──
  function esc(v) {
    if (v === null || typeof v === 'undefined') return '';
    return String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  // Safe attribute value (used inside single-quoted onclick handlers etc.).
  function escAttr(v) { return esc(v).replace(/`/g, '&#96;'); }

  // ── In-context education (window.PDXLearn, pdx-learn.js) ────────────────────
  // Every hook is guarded so this file behaves exactly as it did before if the
  // education layer is absent or fails to load: a term falls back to plain
  // escaped text, and the "How to read this" affordances render as nothing.
  function LT(key, text) {
    var L = window.PDXLearn;
    return (L && L.term) ? L.term(key, text) : esc(text);
  }
  // Measure numbers are the single best teaching spot in this file: they appear
  // on every card, and the type prefix ("H.R.", "S.", "H.Res.") is exactly the
  // thing a first-time visitor cannot decode. Only the prefix becomes a term.
  function LNUM(num) {
    var L = window.PDXLearn;
    return (L && L.numberHtml) ? L.numberHtml(num) : esc(num);
  }
  function LHOWTO(id, label) {
    var L = window.PDXLearn;
    return (L && L.howto) ? L.howto(id, label) : '';
  }

  // ── Styles (injected once) ──────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('pdx-vr-css')) return;
    var css = [
      '#pdx-voting-record .vr-sub{color:#9fb4d4;font-size:.82rem;line-height:1.5;margin:.15rem 0 .9rem;}',
      '#pdx-voting-record .vr-howto-row{margin:-.55rem 0 .85rem;}',
      /* summary strip */
      '.vr-summary{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:.85rem;}',
      '.vr-stat{flex:1 1 5.2rem;min-width:5.2rem;background:rgba(10,15,30,.5);border:1px solid rgba(255,255,255,.07);border-radius:.7rem;padding:.55rem .5rem;text-align:center;}',
      '.vr-stat-v{font-family:"Bebas Neue","Barlow Condensed",sans-serif;font-size:1.5rem;line-height:1;color:#eef4ff;}',
      '.vr-stat-l{font-family:"Barlow Condensed",sans-serif;font-size:.56rem;letter-spacing:.08em;text-transform:uppercase;color:#7596c0;margin-top:.2rem;line-height:1.2;}',
      /* say-vs-do meter */
      '.vr-meter{background:rgba(10,15,30,.5);border:1px solid rgba(255,255,255,.07);border-radius:.7rem;padding:.7rem .75rem;margin-bottom:.9rem;}',
      '.vr-meter-top{display:flex;align-items:baseline;justify-content:space-between;gap:.5rem;margin-bottom:.5rem;}',
      '.vr-meter-title{font-family:"Barlow Condensed",sans-serif;font-size:.66rem;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:#c4b5fd;}',
      '.vr-meter-sub{font-size:.7rem;color:#7596c0;}',
      '.vr-bar{display:flex;height:.5rem;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.06);}',
      '.vr-bar-seg{height:100%;}',
      '.vr-bar-consistent{background:#4ade80;}.vr-bar-contradicts{background:#f87171;}.vr-bar-mixed{background:#60a5fa;}',
      '.vr-legend{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:.5rem;font-size:.72rem;color:#9fb4d4;}',
      '.vr-legend b{color:#eef4ff;font-weight:700;}',
      '.vr-dot{display:inline-block;width:.55rem;height:.55rem;border-radius:50%;margin-right:.3rem;vertical-align:middle;}',
      /* filters */
      '.vr-filters{margin-bottom:.9rem;}',
      '.vr-chips{display:flex;gap:.4rem;overflow-x:auto;padding-bottom:.35rem;-webkit-overflow-scrolling:touch;}',
      '.vr-chip{flex:none;cursor:pointer;background:rgba(10,15,30,.5);border:1px solid rgba(255,255,255,.12);color:#c8d6ec;border-radius:999px;padding:.32rem .7rem;font-size:.78rem;white-space:nowrap;transition:all .15s;}',
      '.vr-chip:hover{border-color:rgba(96,165,250,.5);color:#eaf1ff;}',
      '.vr-chip.is-active{background:rgba(96,165,250,.16);border-color:rgba(96,165,250,.6);color:#dbeafe;font-weight:600;}',
      '.vr-chip-n{opacity:.6;margin-left:.28rem;font-size:.72rem;}',
      '.vr-controls{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.55rem;align-items:center;}',
      '.vr-select,.vr-date{background:rgba(10,15,30,.6);border:1px solid rgba(255,255,255,.12);color:#cbd9ec;border-radius:.55rem;padding:.35rem .5rem;font-size:.76rem;font-family:inherit;max-width:100%;}',
      '.vr-select:focus,.vr-date:focus{outline:none;border-color:rgba(96,165,250,.55);}',
      '.vr-toggle{display:inline-flex;align-items:center;gap:.35rem;cursor:pointer;background:rgba(10,15,30,.5);border:1px solid rgba(255,255,255,.12);color:#c8d6ec;border-radius:.55rem;padding:.35rem .6rem;font-size:.76rem;user-select:none;}',
      '.vr-toggle.is-active{background:rgba(245,200,66,.14);border-color:rgba(245,200,66,.5);color:#f5c842;}',
      '.vr-toggle input{accent-color:#f5c842;}',
      /* groups + cards */
      '.vr-group{margin-bottom:1rem;}',
      '.vr-group-head{display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem;flex-wrap:wrap;}',
      '.vr-group-title{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:.98rem;letter-spacing:.02em;color:#eef4ff;}',
      '.vr-group-n{font-size:.68rem;color:#7596c0;background:rgba(255,255,255,.06);border-radius:999px;padding:.06rem .45rem;}',
      '.vr-group-omni{font-size:.68rem;color:#c4b5fd;background:rgba(124,58,237,.14);border:1px solid rgba(124,58,237,.3);border-radius:999px;padding:.06rem .45rem;}',
      '.vr-card{background:rgba(10,15,30,.5);border:1px solid rgba(255,255,255,.07);border-radius:.75rem;padding:.65rem .75rem;margin-bottom:.5rem;}',
      // The card a proof-line deep link landed on. The ring persists (it is what
      // answers "which one did I click?"); it clears on the next paint, because the
      // markup is rebuilt. The flash is the only motion, and it is opt-out.
      '.vr-card-focus{border-color:rgba(147,197,253,.75);box-shadow:0 0 0 2px rgba(147,197,253,.28);animation:vrFocusIn 1.1s ease-out 1;scroll-margin:5rem 0;}',
      '@keyframes vrFocusIn{0%{box-shadow:0 0 0 6px rgba(147,197,253,0);}35%{box-shadow:0 0 0 6px rgba(147,197,253,.4);}100%{box-shadow:0 0 0 2px rgba(147,197,253,.28);}}',
      '@media (prefers-reduced-motion:reduce){.vr-card-focus{animation:none;}}',
      '.vr-card-top{display:flex;align-items:center;gap:.5rem;justify-content:space-between;margin-bottom:.3rem;flex-wrap:wrap;}',
      '.vr-num{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:.8rem;letter-spacing:.04em;color:#93c5fd;}',
      '.vr-date-txt{font-size:.72rem;color:#7596c0;}',
      '.vr-card-title{font-size:.86rem;color:#e5ecf7;line-height:1.4;margin:.1rem 0 .4rem;}',
      '.vr-meta{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;}',
      '.vr-pill{font-family:"Barlow Condensed",sans-serif;font-size:.66rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:.12rem .5rem;white-space:nowrap;}',
      '.vr-pos-yea{background:rgba(74,222,128,.16);color:#6ee7a0;border:1px solid rgba(74,222,128,.35);}',
      '.vr-pos-nay{background:rgba(248,113,113,.16);color:#fca5a5;border:1px solid rgba(248,113,113,.35);}',
      '.vr-pos-neutral{background:rgba(159,180,212,.14);color:#9fb4d4;border:1px solid rgba(159,180,212,.3);}',
      '.vr-pos-action{background:rgba(124,58,237,.16);color:#c4b5fd;border:1px solid rgba(124,58,237,.35);}',
      '.vr-tag{font-size:.68rem;color:#8ea4c6;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:999px;padding:.1rem .45rem;}',
      '.vr-result-passed{color:#6ee7a0;}.vr-result-failed{color:#fca5a5;}',
      /* verdict badges */
      '.vr-verdict{font-family:"Barlow Condensed",sans-serif;font-size:.66rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;border-radius:999px;padding:.12rem .5rem;white-space:nowrap;}',
      '.vr-v-consistent{background:rgba(74,222,128,.16);color:#6ee7a0;border:1px solid rgba(74,222,128,.35);}',
      '.vr-v-contradicts{background:rgba(248,113,113,.18);color:#fca5a5;border:1px solid rgba(248,113,113,.4);}',
      '.vr-v-mixed{background:rgba(96,165,250,.16);color:#93c5fd;border:1px solid rgba(96,165,250,.35);}',
      '.vr-v-neutral{background:rgba(159,180,212,.12);color:#9fb4d4;border:1px solid rgba(159,180,212,.28);}',
      '.vr-src{display:inline-block;margin-top:.4rem;font-size:.74rem;color:#93c5fd;text-decoration:none;}',
      '.vr-src:hover{text-decoration:underline;}',
      '.vr-stance-note{font-size:.74rem;color:#9fb4d4;margin-top:.35rem;line-height:1.45;}',
      '.vr-stance-note b{color:#cbd9ec;}',
      /* always-visible multi-issue summary beside the verdict badge (no hover needed) */
      '.vr-verdict-stack{display:flex;flex-direction:column;align-items:flex-end;gap:.2rem;text-align:right;flex-shrink:0;max-width:62%;}',
      '.vr-verdict-scope{font-size:.66rem;color:#8ea4c6;line-height:1.35;}',
      '.vr-verdict-scope-q{color:#6b86b0;}',
      '.vr-spread{display:inline-flex;align-items:center;gap:.25rem;font-size:.66rem;font-weight:700;letter-spacing:.02em;' +
        'border-radius:999px;padding:.1rem .45rem;line-height:1.4;white-space:normal;}',
      '.vr-spread-mixed{background:rgba(251,146,60,.15);color:#fdba74;border:1px solid rgba(251,146,60,.34);}',
      '.vr-spread-match{background:rgba(74,222,128,.14);color:#6ee7a0;border:1px solid rgba(74,222,128,.32);}',
      '.vr-spread-against{background:rgba(248,113,113,.15);color:#fca5a5;border:1px solid rgba(248,113,113,.36);}',
      '.vr-spread-neutral{background:rgba(159,180,212,.12);color:#9fb4d4;border:1px solid rgba(159,180,212,.28);}',
      /* omnibus component breakdown — one vote, many per-issue verdicts */
      '.vr-omni{margin-top:.5rem;border-top:1px dashed rgba(255,255,255,.09);padding-top:.45rem;}',
      '.vr-omni-lead{font-family:"Barlow Condensed",sans-serif;font-size:.68rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#8ea4c6;margin-bottom:.35rem;}',
      /* the plain-language split: "This vote touched: taxes · healthcare · border" */
      '.vr-omni-touch{font-size:.78rem;color:#cbd9ec;line-height:1.5;margin:0 0 .4rem;}',
      '.vr-omni-touch b{color:#e6eefc;font-weight:700;}',
      '.vr-omni-sep{color:#5f7aa8;padding:0 .1rem;}',
      '.vr-omni-rows{border-top:1px solid rgba(255,255,255,.06);padding-top:.3rem;}',
      '.vr-omni-cap{font-size:.66rem;color:#7596c0;letter-spacing:.03em;margin-bottom:.15rem;}',
      '.vr-omni-row{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;padding:.2rem 0;font-size:.75rem;color:#cbd9ec;line-height:1.4;}',
      '.vr-omni-issue{font-weight:600;color:#e6eefc;}',
      '.vr-omni-eff{font-size:.64rem;letter-spacing:.03em;border-radius:999px;padding:.06rem .4rem;white-space:nowrap;}',
      '.vr-omni-eff-adv{background:rgba(96,165,250,.14);color:#93c5fd;border:1px solid rgba(96,165,250,.3);}',
      '.vr-omni-eff-opp{background:rgba(251,146,60,.14);color:#fdba74;border:1px solid rgba(251,146,60,.32);}',
      '.vr-omni-v{font-size:.62rem;font-weight:700;letter-spacing:.03em;text-transform:uppercase;border-radius:999px;padding:.06rem .4rem;white-space:nowrap;}',
      '.vr-omni-tag{color:#c4b5fd;border-color:rgba(124,58,237,.35);background:rgba(124,58,237,.14);}',
      /* dismissible "what an omnibus vote does" teaching note */
      '.vr-teach{position:relative;display:flex;gap:.5rem;align-items:flex-start;background:rgba(96,165,250,.07);border:1px solid rgba(96,165,250,.22);border-radius:.6rem;padding:.55rem .65rem;margin:0 0 .7rem;font-size:.75rem;color:#bfd3ee;line-height:1.5;}',
      '.vr-teach-ico{flex:0 0 auto;font-size:.95rem;line-height:1.3;}',
      '.vr-teach b{color:#e6eefc;}',
      '.vr-teach-body{padding-right:1.2rem;}',
      '.vr-teach-x{position:absolute;top:.3rem;right:.3rem;width:1.4rem;height:1.4rem;border:0;border-radius:50%;background:transparent;color:#7596c0;font-size:.95rem;line-height:1;cursor:pointer;}',
      '.vr-teach-x:hover{background:rgba(255,255,255,.08);color:#cbd9ec;}',
      '.vr-teach-x:focus-visible{outline:2px solid #7fb4ff;outline-offset:1px;}',
      '@media (pointer:coarse){.vr-teach-x{width:1.9rem;height:1.9rem;}}',
      /* amendments (collapsible) */
      '.vr-amends{margin:.1rem 0 .5rem .6rem;border-left:2px solid rgba(255,255,255,.08);padding-left:.6rem;}',
      '.vr-amends>summary{cursor:pointer;color:#8ea4c6;font-size:.75rem;padding:.15rem 0;list-style:none;}',
      '.vr-amends>summary::-webkit-details-marker{display:none;}',
      '.vr-amends>summary:before{content:"▸ ";color:#5f7aa8;}',
      '.vr-amends[open]>summary:before{content:"▾ ";}',
      /* misc states */
      '.vr-loading,.vr-empty{padding:1rem;text-align:center;color:#7596c0;font-size:.82rem;}',
      '.vr-empty-ico{font-size:1.6rem;display:block;margin-bottom:.4rem;opacity:.7;}',
      '.vr-empty-sub{display:block;margin:.3rem auto 0;max-width:22rem;font-size:.74rem;color:#5f7aa8;line-height:1.5;}',
      '.vr-empty-btn{margin-top:.7rem;display:inline-flex;align-items:center;gap:.35rem;background:rgba(96,165,250,.12);border:1px solid rgba(96,165,250,.3);color:#bfdbfe;border-radius:.6rem;padding:.5rem .9rem;font-size:.76rem;font-weight:600;cursor:pointer;}',
      '.vr-empty-btn:hover{background:rgba(96,165,250,.2);}',
      '@media (pointer:coarse){.vr-empty-btn{padding:.65rem 1rem;}}',
      '.vr-more{width:100%;margin-top:.4rem;background:rgba(96,165,250,.12);border:1px solid rgba(96,165,250,.3);color:#bfdbfe;border-radius:.6rem;padding:.55rem;font-size:.78rem;font-weight:600;cursor:pointer;}',
      '.vr-more:hover{background:rgba(96,165,250,.2);}',
      '.vr-note{font-size:.66rem;color:#4e72a0;text-align:center;margin:.5rem 0 0;line-height:1.5;}',
      /* Phase 5 — consistency dots on comparison boards (seat board + compare table) */
      '.pdx-sib-vdot,.cmp-vdot{display:inline-block;margin-left:.18rem;font-size:.72rem;line-height:1;vertical-align:middle;font-weight:700;}',
      '.pdx-sib-vdot:empty,.cmp-vdot:empty{display:none;}',
      '.cmp-vdot{display:block;margin:.15rem auto 0;text-align:center;}',
      '.cmp-vdot:empty{display:none;}',
      '.vrdot-consistent{color:#6ee7a0;}',
      '.vrdot-contradicts{color:#f89b9b;}',
      '.vrdot-mixed{color:#93c5fd;}',
      '.vrdot-record{color:#9fb4d4;}',
      '.pdx-sib-lg-vdot{opacity:.85;}',
      /* Phase 6 — offline note + polish */
      '.vr-offline{display:flex;align-items:center;gap:.4rem;background:rgba(245,200,66,.1);border:1px solid rgba(245,200,66,.3);color:#f5d77a;border-radius:.6rem;padding:.5rem .65rem;margin-bottom:.7rem;font-size:.76rem;line-height:1.4;}',
      /* Larger tap targets on coarse pointers (mobile) */
      '@media (pointer:coarse){.vr-chip,.vr-toggle{padding-top:.5rem;padding-bottom:.5rem;}.vr-select,.vr-date{padding-top:.5rem;padding-bottom:.5rem;}.vr-more{padding:.7rem;}}',
      /* Narrow phones: let the filter selects share rows evenly instead of wrapping
         unevenly or squishing, and give the chip row a stable height so its scroll
         padding never collapses the layout. */
      '@media (max-width:480px){.vr-controls{gap:.4rem;}.vr-controls .vr-select,.vr-controls .vr-date{flex:1 1 8.5rem;min-width:0;}.vr-chips{scrollbar-width:none;}.vr-chips::-webkit-scrollbar{display:none;}}',
      /* Respect reduced-motion: no transitions on interactive vr elements */
      '@media (prefers-reduced-motion:reduce){#pdx-voting-record *{transition:none!important;animation:none!important;scroll-behavior:auto!important;}}'
    ].join('');
    var s = document.createElement('style');
    s.id = 'pdx-vr-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // Every politician id entering the data layer is canonicalized first. A person can
  // have accumulated vr_* rows under two ids (politician_id is free text); once a
  // merge migration folds one away, the record only exists under the survivor. The
  // API canonicalizes too, but the client caches BY ID — so without this a stale
  // `susan_collins` request would fetch Collins's record and then file it under
  // `collins`, and the lookup that asked for it would never find it. Alias table:
  // PDX_PID_ALIASES in stance-helpers.js (mirrors db/vr-pid-aliases.json). Guarded
  // because script order between the two files is not contractual.
  function canonPid(id) {
    try { return (window.PDXCanonicalPid && window.PDXCanonicalPid(id)) || id; } catch (e) { return id; }
  }

  // ── Data layer: PDXVotingRecord.fetchMember(id, opts) with in-memory cache ────
  var PDXVotingRecord = {
    _cache: new Map(),

    // Build a stable query string from the filter opts (only non-empty params).
    _query: function (opts) {
      opts = opts || {};
      var p = new URLSearchParams();
      var pass = ['issue', 'chamber', 'actionType', 'position', 'result', 'q', 'from', 'to', 'sort', 'page', 'pageSize'];
      pass.forEach(function (k) {
        if (opts[k] !== undefined && opts[k] !== null && opts[k] !== '') p.set(k, opts[k]);
      });
      // hideProcedural maps to the API's procedural=0 flag.
      if (opts.hideProcedural) p.set('procedural', '0');
      var s = p.toString();
      return s ? ('?' + s) : '';
    },

    // How long a single member request is given before it is treated as a failure.
    // A stalled connection is the one outcome the catch below cannot rescue: it
    // never resolves and never rejects, so the promise memoised under `key` stays
    // pending forever and every surface awaiting it waits forever with it. There is
    // no network condition where a caller is better off waiting past this than
    // being told there is nothing — the cache entry is dropped either way, so a
    // later attempt re-fetches from scratch.
    _timeoutMs: 12000,

    fetchMember: function (id, opts) {
      id = canonPid(id);
      var qs = this._query(opts);
      var key = id + qs;
      if (this._cache.has(key)) return this._cache.get(key);
      var url = API_BASE + '/member/' + encodeURIComponent(id) + qs;
      var ctl = null, timer = null;
      try { if (typeof AbortController === 'function') ctl = new AbortController(); } catch (e) { ctl = null; }
      var init = { headers: { accept: 'application/json' } };
      if (ctl) init.signal = ctl.signal;
      try {
        timer = setTimeout(function () {
          try { if (ctl) ctl.abort(); } catch (e) {}
        }, this._timeoutMs);
      } catch (e) { timer = null; }
      var clear = function () { if (timer) { try { clearTimeout(timer); } catch (e) {} timer = null; } };
      var promise = fetch(url, init)
        .then(function (r) {
          if (!r.ok) throw new Error('voting-record ' + r.status);
          return r.json();
        })
        // Disarmed only once the BODY has been read. Headers arriving is not the
        // request completing: a response that stops mid-body leaves r.json()
        // pending, which is the same stall one step later. The abort covers both.
        .then(function (data) { clear(); return data; })
        .catch(function (e) {
          // On failure, drop the cache entry so a later (online) retry re-fetches,
          // and resolve to null so callers degrade quietly instead of throwing. An
          // abort from the deadline above arrives here and is handled as any other
          // failure — callers cannot tell the difference and do not need to.
          clear();
          PDXVotingRecord._cache.delete(key);
          if (window.console && console.warn) console.warn('PDXVotingRecord.fetchMember:', e && e.message);
          return null;
        });
      this._cache.set(key, promise);
      return promise;
    },

    clearCache: function () {
      this._cache.clear(); this._compareCache.clear(); this._packCache.clear(); this._issueRecCache.clear();
      this._records = {};
      // Dropping the records changes every derived read that used them.
      try { if (typeof window.PDXDataChanged === 'function') window.PDXDataChanged(); } catch (e) {}
    },

    // ── Resolved per-member records (sync accessor) ─────────────────────────────
    // A member's full, unfiltered record items, cached the moment any surface loads
    // them (the profile section on open, or a /compare call). The Alignment Tool
    // reads this SYNCHRONOUSLY via _alignmentVotesAdapter — it never triggers its
    // own fetch, so there is no request storm when scoring a big field; it simply
    // uses whatever is already warm and falls back to the legacy source otherwise.
    _records: {},
    // The other of the two data boundaries the derivation epoch tracks (the first
    // is a full profile document arriving in firebase-boot.js). Every issue row,
    // verdict and bucket on a profile is derived partly from this record, and the
    // caches that hold those derivations are only allowed to be stale until this
    // line runs. See THE DERIVATION EPOCH in stance-helpers.js.
    noteMember: function (id, items) {
      if (!id || !Array.isArray(items)) return;
      this._records[canonPid(id)] = items.slice();
      try { if (typeof window.PDXDataChanged === 'function') window.PDXDataChanged(); } catch (e) {}
    },
    memberRecords: function (id) { return this._records[canonPid(id)] || null; },

    // ── Batched side-by-side fetch for the comparison surfaces ──────────────────
    // GET /api/voting-record/compare?members=a,b,c → { members, issue, matrix }.
    // Cached by the sorted member list; also seeds the per-member _records cache so
    // a later Alignment computation for any of these members is already warm.
    _compareCache: new Map(),
    fetchCompare: function (pids) {
      // De-duplicated after canonicalization: two ids that used to be different
      // people-shaped rows can now resolve to the same person, and asking the API for
      // the same member twice would waste a slot in its 8-member cap.
      var members = (pids || []).filter(Boolean).map(canonPid)
        .filter(function (id, i, a) { return a.indexOf(id) === i; }).sort();
      if (!members.length) return Promise.resolve(null);
      var key = members.join(',');
      if (this._compareCache.has(key)) return this._compareCache.get(key);
      var self = this;
      var url = API_BASE + '/compare?members=' + encodeURIComponent(members.join(','));
      var promise = fetch(url, { headers: { accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('compare ' + r.status); return r.json(); })
        .then(function (data) {
          if (data && data.matrix) {
            Object.keys(data.matrix).forEach(function (pid) { self.noteMember(pid, data.matrix[pid]); });
          }
          return data;
        })
        .catch(function (e) {
          self._compareCache.delete(key);
          if (window.console && console.warn) console.warn('PDXVotingRecord.fetchCompare:', e && e.message);
          return null;
        });
      this._compareCache.set(key, promise);
      return promise;
    },

    // ── Offline pack ────────────────────────────────────────────────────────────
    // GET /member/:id/pack — the compact, SW-cached record. Fetching it while online
    // warms the service-worker cache so the SAME member renders offline later. Used
    // as the graceful fallback when the live /member/:id endpoint can't be reached.
    _packCache: new Map(),
    fetchPack: function (id) {
      id = canonPid(id);
      if (this._packCache.has(id)) return this._packCache.get(id);
      var self = this;
      var url = API_BASE + '/member/' + encodeURIComponent(id) + '/pack';
      var promise = fetch(url, { headers: { accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('pack ' + r.status); return r.json(); })
        .then(function (data) {
          if (data && Array.isArray(data.items)) self.noteMember(id, data.items);
          return data;
        })
        .catch(function () { self._packCache.delete(id); return null; });
      this._packCache.set(id, promise);
      return promise;
    },

    // ── Batched issue-scoped read for RANKING ───────────────────────────────────
    // GET /issue-records?issues=k1,k2 → every tracked member's record on that issue
    // bundle in ONE request. Built for issue-first ranking, which has to know the
    // whole field before it can order anyone: fetching per member would be dozens of
    // requests, and reading whatever happens to be warm in _records would make the
    // ordering depend on which profiles the visitor had already opened.
    //
    // The wire format de-duplicates bill and roll-call metadata (each appears once,
    // with a thin per-member ref list pointing at it), so this rehydrates the refs
    // back into the SAME record-item shape /member/:id returns. Callers therefore
    // feed the result straight into the shared stance-vs-record engine
    // (_issueRecordSummary / _polRecordMap) with no special-casing.
    //
    // Deliberately does NOT call noteMember(): _records is documented as a member's
    // FULL, unfiltered record, and seeding it from an issue-scoped read would make
    // every other surface conclude the member has voted on nothing else. This cache
    // is separate and additive.
    _issueRecCache: new Map(),
    fetchIssueRecords: function (issueKeys) {
      var keys = (issueKeys || [])
        .map(function (k) { return String(k == null ? '' : k).trim(); })
        .filter(Boolean)
        .filter(function (k, i, a) { return a.indexOf(k) === i; })
        .sort();
      if (!keys.length) return Promise.resolve(null);
      var qs = keys.join(',');
      if (this._issueRecCache.has(qs)) return this._issueRecCache.get(qs);
      var self = this;
      var url = API_BASE + '/issue-records?issues=' + encodeURIComponent(qs);
      var promise = fetch(url, { headers: { accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('issue-records ' + r.status); return r.json(); })
        .then(function (data) { return self.hydrateIssueRecords(data); })
        .catch(function (e) {
          // Drop the entry so a later (online) attempt retries, and resolve to null so
          // a ranking degrades to its receipt-only behaviour instead of throwing.
          self._issueRecCache.delete(qs);
          if (window.console && console.warn) console.warn('PDXVotingRecord.fetchIssueRecords:', e && e.message);
          return null;
        });
      this._issueRecCache.set(qs, promise);
      return promise;
    },

    // Expand the de-duplicated wire format into canonical record items per member.
    // Pure; exposed so the shape can be tested without a network round trip.
    hydrateIssueRecords: function (data) {
      if (!data || !data.byPolitician) return null;
      var measures = data.measures || {};
      var rollcalls = data.rollcalls || {};
      var byPid = {};
      var pids = Object.keys(data.byPolitician);
      for (var i = 0; i < pids.length; i++) {
        var refs = data.byPolitician[pids[i]];
        if (!Array.isArray(refs)) continue;
        var items = [];
        for (var j = 0; j < refs.length; j++) {
          var ref = refs[j];
          if (!ref) continue;
          if (ref.kind === 'vote') {
            var rc = rollcalls[ref.rollcallId];
            if (!rc) continue;
            var m = measures[rc.measureId];
            if (!m) continue;
            items.push({
              kind: 'vote',
              measureId: rc.measureId,
              measureType: m.measureType,
              number: m.number,
              title: m.title,
              // The roll call's own chamber is authoritative for a vote; the measure's
              // is only a fallback (it can differ on a bill that moved chambers).
              chamber: rc.chamber || m.chamber || null,
              status: m.status,
              date: rc.date || null,
              action: rc.action || null,
              actionType: rc.actionType,
              position: ref.position,
              result: rc.result || null,
              // Carried because it is part of the API's item shape, never rendered.
              // The flag is ingest provenance — it records how a roll call was
              // attributed against the full chamber tally. Nothing reader-facing
              // reads it, and nothing should: party agreement is not a measure of
              // what someone said against what they did.
              isParty: ref.isParty || null,
              supports: null,
              isProcedural: !!rc.isProcedural,
              advanceInverted: !!rc.advanceInverted,
              isAmendment: m.measureType === 'amendment',
              parentMeasureId: (m.parentMeasureId == null) ? null : m.parentMeasureId,
              rollcallId: ref.rollcallId,
              // The roll-call tuple, when the server carries it. receipt-cards.js
              // builds the canonical clerk.house.gov / senate.gov page from it, and
              // falls back to parsing rc.source.url when an older payload omits it.
              congress: (rc.congress == null) ? null : rc.congress,
              session: (rc.session == null) ? null : rc.session,
              rollNumber: (rc.rollNumber == null) ? null : rc.rollNumber,
              issues: m.issues || [],
              source: rc.source || null
            });
          } else {
            var pm = measures[ref.measureId];
            if (!pm) continue;
            items.push({
              kind: 'position',
              measureId: ref.measureId,
              measureType: pm.measureType,
              number: pm.number,
              title: pm.title,
              chamber: pm.chamber || null,
              status: pm.status,
              date: ref.date || null,
              action: ref.action || null,
              actionType: ref.action || '',
              position: ref.action || '',
              result: null,
              isParty: null,
              supports: (typeof ref.supports === 'boolean') ? ref.supports : null,
              isProcedural: false,
              advanceInverted: false,
              isAmendment: pm.measureType === 'amendment',
              parentMeasureId: (pm.parentMeasureId == null) ? null : pm.parentMeasureId,
              rollcallId: null,
              congress: null,
              session: null,
              rollNumber: null,
              issues: pm.issues || [],
              source: ref.source || null
            });
          }
        }
        if (!items.length) continue;
        // Two source ids can canonicalize to the same person; merge rather than clobber.
        var id = canonPid(pids[i]);
        byPid[id] = byPid[id] ? byPid[id].concat(items) : items;
      }
      return {
        issues: data.issues || [],
        byPid: byPid,
        counts: data.counts || { politicians: 0, votes: 0, positions: 0 },
        truncated: !!data.truncated
      };
    }
  };
  window.PDXVotingRecord = PDXVotingRecord;

  // ── Small formatting helpers ──────────────────────────────────────────────────
  function issueLabel(key) {
    var m = (window.ISSUE_MAP && window.ISSUE_MAP[key]) || null;
    return m && m.label ? m.label : key;
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    try {
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return iso.slice(0, 10); }
  }
  function titleCase(s) {
    if (!s) return '';
    return String(s).replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  // Position pill (yea / nay / present / not voting, or a non-vote action label).
  function positionPill(item) {
    if (item.kind === 'position') {
      return '<span class="vr-pill vr-pos-action">' + esc(titleCase(item.position)) + '</span>';
    }
    var pos = item.position;
    var cls = pos === 'yea' ? 'vr-pos-yea' : pos === 'nay' ? 'vr-pos-nay' : 'vr-pos-neutral';
    var label = pos === 'yea' ? 'Voted Yea' : pos === 'nay' ? 'Voted Nay'
      : pos === 'present' ? 'Present' : pos === 'not_voting' ? 'Did Not Vote' : titleCase(pos);
    // The pill itself carries the definition of Yea/Nay/Present — what a Yea
    // actually accomplished depends on the question, which is the single most
    // misread thing on this card.
    return '<span class="vr-pill ' + cls + '">' + LT('yea', label) + '</span>';
  }

  // Stance-vs-record verdict for one item against its PRIMARY issue, using the
  // shared Phase-2 engine. Returns { cls, label } or null (nothing to show).
  function verdictBadge(item, positionMap) {
    var primary = (item.issues && item.issues[0]) || null;
    if (!primary) return null;
    var pm = positionMap[primary.issueKey];
    var stance = pm ? pm.stance : null;
    if (!stance) return null; // no stated stance on this issue → nothing to compare
    var eff = window._voteEffectiveSupport
      ? window._voteEffectiveSupport(item, primary.supportMeaning)
      : null;
    var verdict = window._stanceVoteVerdict
      ? window._stanceVoteVerdict(stance, eff)
      : null;
    switch (verdict) {
      case 'consistent':  return { cls: 'vr-v-consistent', label: '✓ Matches stance' };
      case 'contradicts': return { cls: 'vr-v-contradicts', label: '⚠ Against stance' };
      case 'mixed':       return { cls: 'vr-v-mixed', label: 'Mixed stance' };
      case 'no_position': return { cls: 'vr-v-neutral', label: 'No position taken' };
      default:            return null;
    }
  }

  // ── Omnibus component breakdown for one record ─────────────────────────────
  // When a single measure maps to two or more issues (an omnibus / multi-issue
  // bill), one vote is really a verdict on each bundled policy. This renders that
  // split inline, in two layers:
  //   1. the plain-language line a voter can read at a glance —
  //      "This vote touched: taxes · healthcare · border security";
  //   2. underneath it, per issue, whether THIS vote advanced or cut against that
  //      issue and — when the member has a stated stance on it — the per-issue
  //      say-vs-do verdict.
  // So the same "yea" can read "✓ matches" on the issues the member campaigned for
  // and "⚠ against" on the ones it undercuts. Built entirely from the shared, tested
  // _measureComponentBreakdown primitive; empty for single-issue records so ordinary
  // votes are unchanged.
  var _OMNI_VERDICT = {
    consistent:  { cls: 'vr-v-consistent',  label: '✓ matches stance' },
    contradicts: { cls: 'vr-v-contradicts', label: '⚠ against stance' },
    mixed:       { cls: 'vr-v-mixed',        label: 'mixed stance' },
    no_position: { cls: 'vr-v-neutral',      label: 'no position' }
  };
  // True when a record maps to two or more issues. Cheap enough to call per card;
  // matches _measureComponentBreakdown's own isOmnibus rule exactly.
  function isOmnibusItem(item) {
    return !!(item && item.issues && item.issues.length >= 2);
  }
  // Calm, factual explanation of what a multi-issue vote means, used as the tooltip
  // on the touched-issues line and as the copy in the dismissible teaching note.
  var OMNI_EXPLAINER = 'Omnibus and reconciliation bills bundle many unrelated policies ' +
    'into one measure, so a member gets a single yes-or-no on all of it. Each issue is ' +
    'scored on its own: the same vote can advance one and cut against another.';

  function componentBreakdownHtml(item, positionMap) {
    if (typeof window._measureComponentBreakdown !== 'function') return '';
    var brk = window._measureComponentBreakdown(item, positionMap || {}, { labelFn: issueLabel });
    if (!brk.isOmnibus) return ''; // single-issue vote → nothing extra to show

    // Layer 1 — the split, stated plainly. Issue labels only, primary first, so the
    // reader sees what one vote covered before any verdict language.
    var touched = brk.components.map(function (c) {
      return '<b>' + esc(c.label) + '</b>';
    }).join('<span class="vr-omni-sep" aria-hidden="true"> · </span>');

    // Layer 2 — what this vote did to each of them.
    var rows = brk.components.map(function (c) {
      var eff = '';
      if (c.effect === 'advances') eff = '<span class="vr-omni-eff vr-omni-eff-adv">this vote advances it</span>';
      else if (c.effect === 'opposes') eff = '<span class="vr-omni-eff vr-omni-eff-opp">this vote cuts against it</span>';
      var v = c.hasStance && _OMNI_VERDICT[c.verdict]
        ? '<span class="vr-omni-v ' + _OMNI_VERDICT[c.verdict].cls + '">' + esc(_OMNI_VERDICT[c.verdict].label) + '</span>'
        : '';
      return '<div class="vr-omni-row">' +
        '<span class="vr-omni-issue">' + esc(c.label) + '</span>' + eff + v +
      '</div>';
    }).join('');

    // The lead now carries the same spread the badge summarises, so the two never
    // disagree — both read from _multiIssueSpread over these very components.
    var sp = (typeof window._multiIssueSpread === 'function') ? window._multiIssueSpread(brk) : null;
    var lead = sp ? ('Multi-issue bill · ' + esc(sp.label)) : ('Multi-issue bill · one vote, ' + brk.count + ' issues');

    return '<div class="vr-omni">' +
      '<div class="vr-omni-lead">' + lead + '</div>' +
      '<p class="vr-omni-touch" title="' + escAttr(OMNI_EXPLAINER) + '">This vote touched: ' + touched + '</p>' +
      '<div class="vr-omni-rows">' +
        '<div class="vr-omni-cap">What this one vote did for each:</div>' +
        rows +
      '</div>' +
    '</div>';
  }

  // ── Always-visible multi-issue summary beside the verdict badge ─────────────
  // The badge only ever judged the measure's PRIMARY issue, and the fact that five
  // other issues were riding on the same vote lived in a `title` — invisible on
  // touch and inconsistently announced by screen readers. This renders that summary
  // as real text: which issue the badge is about, and how the whole vote broke down
  // ("🧩 3 issues · 1 match · 2 against"). Every number comes from
  // _multiIssueSpread over the components already on the card — no new scoring.
  // Degrades to the bare badge if either helper is absent.
  function verdictStackHtml(item, positionMap, verdictHtml) {
    if (!isOmnibusItem(item)) return verdictHtml; // single-issue card unchanged
    if (typeof window._measureComponentBreakdown !== 'function' ||
        typeof window._multiIssueSpread !== 'function') return verdictHtml;
    var brk = window._measureComponentBreakdown(item, positionMap || {}, { labelFn: issueLabel });
    var sp = window._multiIssueSpread(brk);
    if (!sp) return verdictHtml;

    // Name the issue the badge is actually about, so the badge stops reading as the
    // verdict on the whole bill. Only shown when there IS a badge to qualify.
    var scope = '';
    var primaryIssue = (item.issues && item.issues[0]) || null;
    if (verdictHtml && primaryIssue) {
      scope = '<span class="vr-verdict-scope">on ' + esc(issueLabel(primaryIssue.issueKey)) +
        ' <span class="vr-verdict-scope-q">(main issue of ' + sp.count + ')</span></span>';
    }

    var tip = sp.stanceBased
      ? 'This one vote is judged separately on each of the ' + sp.count + ' issues it touched: ' +
        sp.detail.replace(/ · /g, ', ') + '.'
      : 'This one vote touched ' + sp.count + ' issues. No stated stance is on file for them, so ' +
        'what it did is shown instead: ' + sp.detail.replace(/ · /g, ', ') + '.';
    // The split is a property of the VOTE, not of the stances, so it is disclosed
    // either way — a member with no stance on file still cast one vote two ways.
    if (sp.splits) tip += ' The same vote pushed one issue forward and another back.';
    var token = '<span class="vr-spread vr-spread-' + sp.tone + '" title="' + escAttr(tip) + '">' +
      '<span aria-hidden="true">🧩</span> ' + esc(sp.label) + '</span>';

    return '<div class="vr-verdict-stack">' + verdictHtml + scope + token + '</div>';
  }

  // ── Dismissible "what an omnibus vote does" note ───────────────────────────
  // Shown once above the list when the visible record actually contains a
  // multi-issue measure, so the split below has context the first time someone
  // meets it. Optional and non-blocking: one tap dismisses it for good (persisted
  // with the other durable view prefs), and it never appears for a record with no
  // multi-issue votes in it.
  function omniTeachHtml(items) {
    if (loadPrefs().omniNoteHidden) return '';
    var n = 0;
    (items || []).forEach(function (it) { if (isOmnibusItem(it)) n++; });
    if (!n) return '';
    return '<div class="vr-teach" data-vr-teach>' +
      '<span class="vr-teach-ico" aria-hidden="true">🧩</span>' +
      '<div class="vr-teach-body"><b>What an omnibus vote does.</b> ' + esc(OMNI_EXPLAINER) +
        ' <b>' + n + '</b> record' + (n === 1 ? '' : 's') + ' below ' + (n === 1 ? 'is' : 'are') +
        ' multi-issue — each shows the full split.</div>' +
      '<button type="button" class="vr-teach-x" data-vr-teach-x aria-label="Dismiss this note">×</button>' +
    '</div>';
  }

  // ── Dismissible "why procedural votes count less" note ─────────────────────
  // The other concept that silently changes how this list should be read. Shown
  // only when the visible record actually contains procedural votes. Dismissal is
  // remembered by PDXLearn. Ordering against the other notes: see teachHtml().
  function procTeachHtml(items) {
    var L = window.PDXLearn;
    if (!L || !L.note) return '';
    var n = 0;
    (items || []).forEach(function (it) { if (it && it.isProcedural) n++; });
    if (!n) return '';
    return L.note('vr-procedural', {
      icon: '⚙️',
      title: 'Why some votes count less.',
      html: '<b>' + n + '</b> record' + (n === 1 ? '' : 's') + ' below ' + (n === 1 ? 'is' : 'are') +
        ' ' + LT('procedural', 'procedural') + ' — a vote about how the chamber handles a bill ' +
        'rather than a vote on the policy. They still count, at a quarter of the weight, because ' +
        'floor-control pressure drives them more than personal conviction. On a ' +
        LT('recommit', 'motion to recommit') + ' or ' + LT('table', 'to table') +
        ' a Yea is a vote <b>against</b> the bill, and we read it that way.'
    });
  }

  // ── First-run orientation note ─────────────────────────────────────────────
  // The voting record is the densest thing a first-time visitor meets, and it is
  // the first place the education layer's dotted underlines appear in bulk — so it
  // is the honest place to say once, quietly, that they are tappable. Everything
  // else in the layer is pull: it only teaches someone who already thought to tap.
  // This is the single push, and it is deliberately the smallest one that works.
  //
  // Three things keep it from reading as onboarding:
  //   • it renders below the filters, beside the record it describes — not as a
  //     gate in front of it, and nothing waits on it;
  //   • it retires itself the moment the visitor opens any definition, without
  //     waiting to be dismissed (retireOnTermUse) — the lesson landed, so the
  //     reminder leaves. Tapping × works too, and is remembered either way;
  //   • it never appears at all unless there is a record on screen to read.
  function orientTeachHtml(items) {
    var L = window.PDXLearn;
    if (!L || !L.note || !L.term) return '';
    if (!(items || []).length) return '';   // nothing to orient anyone around yet
    return L.note('vr-orientation', {
      icon: '📖',
      retireOnTermUse: true,
      title: 'New to voting records?',
      html: 'Anything with a dotted underline explains itself — ' +
        LT('hr', 'H.R.') + ', ' + LT('rollcall', 'roll-call vote') + ', ' +
        LT('procedural', 'procedural') + '. Tap one for a short, plain-language ' +
        'definition. Nothing here is an opinion: every record below links the ' +
        'official source so you can check it yourself.'
    });
  }

  // ── Which teaching note gets the slot ──────────────────────────────────────
  // At most ONE note shows above the list. Two stacked notes stop reading as help
  // and start reading as a wall, and a visitor who dismisses a stack learns only
  // that the product nags. So the notes are an ordered list and the first eligible
  // one wins; each returns '' when it is dismissed or doesn't apply, so a dismissed
  // note hands the slot to the next one on the visitor's NEXT visit rather than
  // stacking underneath. Order is general → specific:
  //   1. orientation — how to read anything at all (once per visitor)
  //   2. omnibus     — only when a multi-issue measure is actually on screen
  //   3. procedural  — only when a procedural vote is actually on screen
  function teachHtml(items) {
    var candidates = [orientTeachHtml, omniTeachHtml, procTeachHtml];
    for (var i = 0; i < candidates.length; i++) {
      var html = candidates[i](items);
      if (html) return html;
    }
    return '';
  }
  // Exposed for scripts/test-vr-teach.mjs, matching the existing convention in
  // stance-helpers.js (window._issueRecordSummary). Pure: items → html.
  window._vrTeachHtml = teachHtml;

  // ── One vote / position card ──────────────────────────────────────────────────
  // ── One record → a stable presentation key ──────────────────────────────────
  // Two surfaces need to agree on "this is the same vote": the card list here, and the
  // profile's Official Record proof line, which deep-links to it. The vr_* feed has no
  // single guaranteed id across kinds (positions carry no rollcallId), so the key is
  // the same tuple both sides already had in hand. Presentation only — nothing is
  // scored, filtered or fetched by it, so a key collision costs at most a scroll to
  // the wrong card of the same bill on the same day.
  window._pdxRecordKey = function (item) {
    if (!item) return '';
    return [item.kind || '', item.rollcallId || '', item.measureId || '',
      item.number || '', item.date || '', item.action || ''].join('|');
  };

  function cardHtml(item, positionMap) {
    var num = item.number ? '<span class="vr-num">' + LNUM(item.number) + '</span>' : '';
    var date = item.date ? '<span class="vr-date-txt">' + esc(fmtDate(item.date)) + '</span>' : '';
    var vb = verdictBadge(item, positionMap);
    // The badge judges the measure's PRIMARY issue. On a multi-issue bill that is one
    // of several answers, so say which issue it belongs to rather than letting it read
    // as the verdict on the whole vote — the breakdown below carries the others.
    var primaryIssue = (item.issues && item.issues[0]) || null;
    var vbTitle = (vb && isOmnibusItem(item) && primaryIssue)
      ? ' title="' + escAttr('Verdict on ' + issueLabel(primaryIssue.issueKey) +
          ' — this bill’s main issue. This one vote is judged separately on each issue it touched; see the split below.') + '"'
      : '';
    var verdictHtml = vb ? '<span class="vr-verdict ' + vb.cls + '"' + vbTitle + '>' + esc(vb.label) + '</span>' : '';
    // On a multi-issue card, wrap the badge with the always-visible scope + spread
    // summary. Single-issue cards get the bare badge back, byte for byte.
    verdictHtml = verdictStackHtml(item, positionMap, verdictHtml);

    var meta = [];
    meta.push(positionPill(item));
    // A vote's `action` is the human-written roll-call question ("On Passage") —
    // show it verbatim; a position's `action` is an actionType slug — title-case it.
    if (item.action) {
      var actLabel = item.kind === 'position' ? titleCase(item.action) : item.action;
      meta.push('<span class="vr-tag">' + esc(actLabel) + '</span>');
    }
    if (item.chamber) {
      // "House" / "Senate" is a chamber, not a party — worth one tap for anyone
      // who does not already know the two are separate votes on the same bill.
      var chKey = /senate/i.test(item.chamber) ? 'senate' : /house/i.test(item.chamber) ? 'house' : '';
      meta.push('<span class="vr-tag">' +
        (chKey ? LT(chKey, titleCase(item.chamber)) : esc(titleCase(item.chamber))) + '</span>');
    }
    if (item.result) {
      var rc = /pass|agree/.test(item.result) ? 'vr-result-passed' : /fail|reject/.test(item.result) ? 'vr-result-failed' : '';
      meta.push('<span class="vr-tag ' + rc + '">' + esc(titleCase(item.result)) + '</span>');
    }
    if (item.isAmendment) meta.push('<span class="vr-tag">' + LT('amendment', 'Amendment') + '</span>');
    // Procedural is the tag that most changes how a record should be read: these
    // votes count at a quarter weight, and a Yea on some of them (recommit, table)
    // is a vote AGAINST the bill. Both facts live in the definition.
    if (item.isProcedural) meta.push('<span class="vr-tag">' + LT('procedural', 'Procedural') + '</span>');
    // Flag the multi-issue case in the pill row too, so it's visible while scanning
    // (and in flat-sort mode, where cards aren't grouped under an issue heading).
    if (isOmnibusItem(item)) {
      // Was a hover-only title, which is dead on touch. Now the tag itself opens
      // the omnibus definition — the concept a first-time visitor needs before
      // the split below makes any sense.
      meta.push('<span class="vr-tag vr-omni-tag">' + LT('omnibus', '🧩 Multi-issue') + '</span>');
    }

    // A one-line "they said X, they did Y" note when we have both sides.
    var note = '';
    var primary = (item.issues && item.issues[0]) || null;
    if (primary && positionMap[primary.issueKey]) {
      var stance = positionMap[primary.issueKey].stance;
      var stanceWord = stance === 'support' ? 'supports' : stance === 'oppose' ? 'opposes' : 'is mixed on';
      note = '<div class="vr-stance-note">Stated stance: <b>' + esc(stanceWord) + '</b> ' +
        esc(issueLabel(primary.issueKey)) + '</div>';
    }

    var src = (item.source && item.source.url)
      ? '<a class="vr-src" href="' + escAttr(item.source.url) + '" target="_blank" rel="noopener">🔗 ' +
          esc(item.source.label || 'View the official record') + '</a>'
      : '';

    return '<div class="vr-card" data-vr-key="' + escAttr(window._pdxRecordKey(item)) + '">' +
      '<div class="vr-card-top"><div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">' + num + date + '</div>' + verdictHtml + '</div>' +
      (item.title ? '<div class="vr-card-title">' + esc(item.title) + '</div>' : '') +
      '<div class="vr-meta">' + meta.join('') + '</div>' +
      note + componentBreakdownHtml(item, positionMap) + src +
      '</div>';
  }
  // Exported for the same reason _vrTeachHtml is: a pure item → HTML function that a
  // node harness can render without a DOM, so the card's markup is testable.
  window._vrCardHtml = cardHtml;

  // ── Empty / no-match state ─────────────────────────────────────────────────
  // Any filter narrowing the set beyond the member's full record (sort is a view
  // preference, not a filter, so it's excluded).
  function hasActiveFilters() {
    if (!_state) return false;
    var f = _state.filters;
    return !!(f.issue || f.chamber || f.actionType || f.position || f.from || f.to || f.hideProcedural);
  }

  // "No records match these filters" — with a Clear filters affordance when the
  // emptiness is filter-induced (so the user isn't left at a dead end).
  function noMatchHtml() {
    var filtered = hasActiveFilters();
    return '<div class="vr-empty"><span class="vr-empty-ico">🔎</span>' +
      (filtered ? 'No records match these filters.' : 'No records to show yet.') +
      (filtered
        ? '<span class="vr-empty-sub">Try widening or clearing the filters to see the full record.</span>' +
          '<button type="button" class="vr-empty-btn" data-vr-clear>Clear filters</button>'
        // Not filter-induced: this is a coverage gap, and saying so plainly is more
        // honest than a bare empty state that reads as "they did nothing."
        : '<span class="vr-empty-sub">' + LT('norecord', 'That means our coverage here is incomplete') +
          ' — not that nothing happened. Business handled by ' + LT('voicevote', 'voice vote') +
          ' leaves no per-member record to publish.</span>') +
      '</div>';
  }

  // Reset every filter (but keep the sort/view preference) and repaint.
  function clearFilters() {
    if (!_state) return;
    var f = _state.filters;
    f.issue = ''; f.chamber = ''; f.actionType = '';
    f.position = ''; f.from = ''; f.to = ''; f.hideProcedural = false;
    savePrefs({ hideProcedural: false });
    applyFilters();
  }

  // ── Group the loaded items by their primary issue, nesting amendments ──────────
  function renderGroups(items, positionMap) {
    if (!items.length) {
      return noMatchHtml();
    }

    // Index by measureId so an amendment can find its parent card within a group.
    var byMeasure = {};
    items.forEach(function (it) { byMeasure[it.measureId] = it; });

    // Bucket by primary issueKey ('_none' for unmapped records).
    var groups = {};
    var order = [];
    items.forEach(function (it) {
      var key = (it.issues && it.issues[0] && it.issues[0].issueKey) || '_none';
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(it);
    });

    // Rank groups: those with a stance contradiction first (that's the story),
    // then by size, then alphabetically by label — always '_none' last.
    var recordMap = (window._polRecordMap ? window._polRecordMap(items, positionMap) : {}) || {};
    order.sort(function (a, b) {
      if (a === '_none') return 1;
      if (b === '_none') return -1;
      var ca = recordMap[a] && recordMap[a].hasContradiction ? 1 : 0;
      var cb = recordMap[b] && recordMap[b].hasContradiction ? 1 : 0;
      if (ca !== cb) return cb - ca;
      if (groups[b].length !== groups[a].length) return groups[b].length - groups[a].length;
      return issueLabel(a).localeCompare(issueLabel(b));
    });

    return order.map(function (key) {
      var list = groups[key];
      // Split into top-level cards and amendments that belong to an in-group parent.
      var childrenByParent = {};
      list.forEach(function (it) {
        if (it.isAmendment && it.parentMeasureId && byMeasure[it.parentMeasureId]) {
          (childrenByParent[it.parentMeasureId] = childrenByParent[it.parentMeasureId] || []).push(it);
        }
      });
      var nested = {};
      Object.keys(childrenByParent).forEach(function (pid) {
        childrenByParent[pid].forEach(function (c) { nested[c.measureId] = true; });
      });

      var summary = recordMap[key];
      // Provenance for the issue as a whole: how much of this verdict rests on votes
      // that were also about other things. Presentation only — the verdict above is
      // computed by the engine and is unchanged by this line.
      var omniHead = '';
      if (key !== '_none' && typeof window._recordOmnibusStats === 'function') {
        var os = window._recordOmnibusStats(key, list, { labelFn: issueLabel });
        if (os.any) {
          var alsoTxt = os.otherLabels.length
            ? ' Those bills also covered: ' + os.otherLabels.join(', ') + '.'
            : '';
          omniHead = '<span class="vr-group-omni" title="' + escAttr(
              'A multi-issue bill is judged separately on each issue it touched, so the same vote can ' +
              'appear here and under another issue with the opposite verdict.' + alsoTxt) + '">🧩 ' +
            os.omnibus + ' of ' + os.total + ' from multi-issue bills</span>';
        }
      }
      var head = '<div class="vr-group-head">' +
        '<span class="vr-group-title">' + esc(key === '_none' ? '📄 Other records' : issueLabel(key)) + '</span>' +
        '<span class="vr-group-n">' + list.length + ' record' + (list.length === 1 ? '' : 's') + '</span>' +
        omniHead +
        (summary && summary.hasStance && summary.label
          ? '<span class="vr-verdict ' +
              (summary.netVerdict === 'consistent' ? 'vr-v-consistent'
                : summary.netVerdict === 'contradicts' ? 'vr-v-contradicts'
                : summary.netVerdict === 'mixed' ? 'vr-v-mixed' : 'vr-v-neutral') +
              '">' + esc(summary.label) + '</span>'
          : '') +
        '</div>';

      var cards = list.filter(function (it) { return !nested[it.measureId]; }).map(function (it) {
        var html = cardHtml(it, positionMap);
        var kids = childrenByParent[it.measureId];
        if (kids && kids.length) {
          html += '<details class="vr-amends"><summary>' + kids.length + ' amendment vote' +
            (kids.length === 1 ? '' : 's') + '</summary>' +
            kids.map(function (k) { return cardHtml(k, positionMap); }).join('') +
            '</details>';
        }
        return html;
      }).join('');

      return '<div class="vr-group">' + head + cards + '</div>';
    }).join('');
  }

  // ── Summary strip (stats + "say vs. do" meter) ────────────────────────────────
  function renderSummary(data, positionMap) {
    var s = data.summary || {};
    var stat = function (v, l) {
      return '<div class="vr-stat"><div class="vr-stat-v">' + esc(v) + '</div><div class="vr-stat-l">' + esc(l) + '</div></div>';
    };
    // Same tile, but the label is a defined term. Used for the counts whose name
    // is itself jargon ("roll-call vote") rather than plain English ("Records").
    var statT = function (v, key, l) {
      return '<div class="vr-stat"><div class="vr-stat-v">' + esc(v) + '</div><div class="vr-stat-l">' + LT(key, l) + '</div></div>';
    };
    // Every tile here counts the record. There is deliberately no tile counting how
    // often the member agreed with their party: the API still returns withParty /
    // againstParty and the database still stores is_party, because the flag is
    // computed from the full chamber tally at ingest and is real provenance for how
    // a roll call was attributed — but a party-agreement rate is not a measure of
    // what someone said against what they did, and printing it here would make it
    // the first number a reader meets on the Official Record. It is internal.
    var strip = '<div class="vr-summary">' +
      stat(s.totalRecords || 0, 'Records') +
      statT(s.votes || 0, 'rollcall', 'Roll-call Votes') +
      (s.positions ? stat(s.positions, 'Other Actions') : '') +
      '</div>';

    // "Say vs. Do" — over issues where the member has BOTH a stance and a record.
    var recordMap = (window._polRecordMap ? window._polRecordMap(data.items || [], positionMap) : {}) || {};
    var consistent = 0, contradicts = 0, mixed = 0;
    Object.keys(recordMap).forEach(function (k) {
      var r = recordMap[k];
      if (!r.hasStance || r.total === 0) return;
      if (r.netVerdict === 'consistent') consistent++;
      else if (r.netVerdict === 'contradicts') contradicts++;
      else if (r.netVerdict === 'mixed') mixed++;
    });
    var totalJudged = consistent + contradicts + mixed;
    var meter = '';
    if (totalJudged > 0) {
      var pct = function (n) { return (n / totalJudged * 100).toFixed(1) + '%'; };
      meter = '<div class="vr-meter">' +
        '<div class="vr-meter-top"><span class="vr-meter-title">' + LT('saydo', 'Say vs. Do') + '</span>' +
          '<span class="vr-meter-sub">' + totalJudged + ' issue' + (totalJudged === 1 ? '' : 's') + ' with a stance &amp; a record</span></div>' +
        '<div class="vr-bar">' +
          (consistent ? '<div class="vr-bar-seg vr-bar-consistent" style="width:' + pct(consistent) + '"></div>' : '') +
          (contradicts ? '<div class="vr-bar-seg vr-bar-contradicts" style="width:' + pct(contradicts) + '"></div>' : '') +
          (mixed ? '<div class="vr-bar-seg vr-bar-mixed" style="width:' + pct(mixed) + '"></div>' : '') +
        '</div>' +
        '<div class="vr-legend">' +
          '<span><span class="vr-dot vr-bar-consistent"></span><b>' + consistent + '</b> back it up</span>' +
          '<span><span class="vr-dot vr-bar-contradicts"></span><b>' + contradicts + '</b> contradict</span>' +
          (mixed ? '<span><span class="vr-dot vr-bar-mixed"></span><b>' + mixed + '</b> mixed</span>' : '') +
        '</div></div>';
    }
    return strip + meter;
  }

  // ── Filter bar. Facets (issue/chamber/action/position options) are built ONCE
  //    from the unfiltered first load so they stay stable as the user narrows. ────
  function renderFilters() {
    var f = _state.filters, facets = _state.facets;

    var issueChips = '<button type="button" class="vr-chip' + (!f.issue ? ' is-active' : '') +
      '" data-vr-issue="">All issues</button>' +
      facets.issues.map(function (k) {
        return '<button type="button" class="vr-chip' + (f.issue === k ? ' is-active' : '') +
          '" data-vr-issue="' + escAttr(k) + '">' + esc(issueLabel(k)) + '</button>';
      }).join('');

    var opt = function (val, label, sel) {
      return '<option value="' + escAttr(val) + '"' + (sel === val ? ' selected' : '') + '>' + esc(label) + '</option>';
    };
    var chamberSel = '<select class="vr-select" data-vr-filter="chamber" aria-label="Chamber">' +
      opt('', 'Any chamber', f.chamber) +
      facets.chambers.map(function (c) { return opt(c, titleCase(c), f.chamber); }).join('') + '</select>';
    var actionSel = facets.actionTypes.length ? '<select class="vr-select" data-vr-filter="actionType" aria-label="Action type">' +
      opt('', 'Any action', f.actionType) +
      facets.actionTypes.map(function (c) { return opt(c, titleCase(c), f.actionType); }).join('') + '</select>' : '';
    var posSel = '<select class="vr-select" data-vr-filter="position" aria-label="Position">' +
      opt('', 'Any position', f.position) +
      ['yea', 'nay', 'present', 'not_voting'].map(function (c) { return opt(c, titleCase(c), f.position); }).join('') + '</select>';
    var sortSel = '<select class="vr-select" data-vr-filter="sort" aria-label="Sort">' +
      opt('', 'Group by issue', f.sort) +
      opt('date', 'Newest first', f.sort) +
      opt('date_asc', 'Oldest first', f.sort) +
      opt('bill', 'By bill number', f.sort) + '</select>';

    var dateInputs = '<input type="date" class="vr-date" data-vr-filter="from" value="' + escAttr(f.from || '') + '" aria-label="From date">' +
      '<input type="date" class="vr-date" data-vr-filter="to" value="' + escAttr(f.to || '') + '" aria-label="To date">';

    var procToggle = '<label class="vr-toggle' + (f.hideProcedural ? ' is-active' : '') + '">' +
      '<input type="checkbox" data-vr-filter="hideProcedural"' + (f.hideProcedural ? ' checked' : '') + '> Hide procedural</label>';

    return '<div class="vr-filters">' +
      '<div class="vr-chips">' + issueChips + '</div>' +
      '<div class="vr-controls">' + chamberSel + actionSel + posSel + sortSel + dateInputs + procToggle + '</div>' +
      '</div>';
  }

  // Render the body (summary + filters + list + load-more) into the section.
  function renderBody() {
    var data = _state.data, pm = _state.positionMap;
    var root = document.getElementById('pdx-vr-body');
    if (!root) return;

    // sort === '' means "group by issue" (client-side grouping). Any real sort
    // value means the server already sorted; render a flat list in that order.
    var listHtml;
    if (!_state.filters.sort) {
      listHtml = renderGroups(_state.items, pm);
    } else {
      listHtml = _state.items.length
        ? _state.items.map(function (it) { return cardHtml(it, pm); }).join('')
        : noMatchHtml();
    }

    var more = (data && data.hasMore)
      ? '<button type="button" class="vr-more" data-vr-more>Load more records</button>'
      : '';

    var offlineNote = _state.offline
      ? '<div class="vr-offline">📡 Showing a saved copy — reconnect for the latest and to filter the full record.</div>'
      : '';

    root.innerHTML =
      offlineNote +
      renderSummary({ summary: data.summary, items: _state.items }, pm) +
      renderFilters() +
      // At most one teaching note, chosen by priority — see teachHtml().
      teachHtml(_state.items) +
      '<div id="pdx-vr-list">' + listHtml + '</div>' +
      more +
      '<p class="vr-note">Every record links to the official ' + LT('rollcall', 'roll call') +
      ' or filing. Stance comparisons weigh a stated position against the actual vote — ' +
      'see the source to judge for yourself.' +
      (window.PDXLearn ? ' <button type="button" class="pdxl-link" data-pdxl-glossary>Glossary →</button>' : '') +
      '</p>';

    // A deep link asked for one exact roll call — this is the paint it was waiting
    // for. Consumed either way: a key that survives one repaint without matching has
    // missed its list, and the reader is already on the issue-filtered section.
    if (_state.focusKey) focusPendingVote(true);
  }

  // ── Scroll to, and ring, the card a deep link named ─────────────────────────
  // Matches on data-vr-key by iterating rather than by attribute selector, so a
  // roll-call question containing quotes can never break the lookup. Returns false
  // when the card isn't in the painted list (a later page, or filtered out) — the
  // caller has already jumped to the section, so a miss degrades to "here is the
  // filtered list", never to nothing.
  function focusPendingVote(consume) {
    var want = _state && _state.focusKey;
    if (consume) _state.focusKey = '';
    if (!want || !document.querySelectorAll) return false;
    var cards = document.querySelectorAll('#pdx-vr-list [data-vr-key]');
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute('data-vr-key') !== want) continue;
      if (!consume) _state.focusKey = '';
      var el = cards[i];
      // 'center' rather than 'start': the profile modal has a sticky nav rail, and
      // centring the card keeps it clear of it without needing to know its height.
      if (el.scrollIntoView) {
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        catch (e) { el.scrollIntoView(); }
      }
      el.className += ' vr-card-focus';
      return true;
    }
    return false;
  }

  // Re-fetch with the current filters (resets to page 1) and repaint the body.
  var _searchTimer = null;
  function applyFilters() {
    var id = _state.id, token = _openToken;
    _state.page = 1;
    // Remember the durable view preferences (sort + hide-procedural) across visits.
    savePrefs({ sort: _state.filters.sort || '', hideProcedural: !!_state.filters.hideProcedural });
    var opts = buildOpts(1);
    var root = document.getElementById('pdx-vr-list');
    if (root) root.innerHTML = '<div class="vr-loading">Loading…</div>';
    PDXVotingRecord.fetchMember(id, opts).then(function (data) {
      if (token !== _openToken || !_state) return; // profile changed under us
      if (!data) { renderErrorInline(); return; }
      _state.offline = false;
      _state.data = data;
      _state.items = (data.items || []).slice();
      renderBody();
    });
  }

  function buildOpts(page) {
    var f = _state.filters;
    return {
      issue: f.issue, chamber: f.chamber, actionType: f.actionType,
      position: f.position, from: f.from, to: f.to,
      sort: f.sort || '', hideProcedural: f.hideProcedural,
      page: page, pageSize: 100
    };
  }

  // ── Deep link: open the full Voting Record filtered to ONE issue ─────────────
  // The profile's Official Record stance rows name the decisive bill inline, but a
  // reader who wants the rest of the votes behind that verdict needs the full list
  // pre-filtered, not a jump to an unfiltered section they then have to filter by
  // hand. Reuses the exact filter path the issue chips already use (set
  // _state.filters.issue → applyFilters → renderBody repaints the chips), then jumps
  // to the section. Returns false when the section isn't live for this member so the
  // caller can fall back to a plain jump — it never throws and never fabricates data.
  //   A falsy issueKey means "the whole record": it CLEARS any issue filter left over
  //   from an earlier row click, so the section's "See full record" entry point shows
  //   what it promises rather than someone else's leftover filter.
  window._pdxVotingRecordFocusIssue = function (issueKey) {
    try {
      if (!_state || !_state.id) return false;
      var sec = document.getElementById('pdx-voting-record');
      if (!sec || sec.style.display === 'none') return false;
      var want = issueKey || '';
      if (_state.filters.issue !== want) {
        _state.filters.issue = want;
        // Grouping mode ('' sort) keeps the issue heading visible above the cards.
        applyFilters();
      }
      if (typeof window._pdxNavJump === 'function') window._pdxNavJump('pdxsec-voting');
      else if (sec.scrollIntoView) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    } catch (e) { return false; }
  };

  // ── Deep link: open the record ON one exact roll call ────────────────────────
  // Same journey as above with one more step: filter to the issue the reader was
  // looking at, then scroll to and ring the specific card. The ring waits for the
  // repaint the filter change triggers (see focusPendingVote, called at the end of
  // renderBody); when the filter is already right there is no repaint, so the focus
  // runs immediately instead. Nothing here fetches a record that the filtered request
  // wouldn't already return, and nothing scores or reorders anything.
  //   Degrades in one direction only: exact card → issue-filtered list → section.
  //   Returns false only when the section isn't live, so the caller's own fallback
  //   chain (a plain nav jump) still applies.
  window._pdxVotingRecordFocusVote = function (issueKey, voteKey) {
    try {
      if (!_state || !_state.id) return false;
      var sec = document.getElementById('pdx-voting-record');
      if (!sec || sec.style.display === 'none') return false;
      _state.focusKey = voteKey || '';
      var want = issueKey || '';
      var repainting = false;
      if (_state.filters.issue !== want) {
        _state.filters.issue = want;
        applyFilters();
        repainting = true;
      }
      if (typeof window._pdxNavJump === 'function') window._pdxNavJump('pdxsec-voting');
      else if (sec.scrollIntoView) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Already painted with the right filter → ring it now. Mid-repaint, leave the
      // key for renderBody: the list is showing "Loading…" and has no cards to match.
      if (!repainting && _state.focusKey) focusPendingVote(false);
      return true;
    } catch (e) { return false; }
  };

  function renderErrorInline() {
    // A failed load means the paint a deep link was waiting for is never coming; drop
    // the pending focus so it can't attach itself to some later, unrelated repaint.
    if (_state) _state.focusKey = '';
    var root = document.getElementById('pdx-vr-list');
    if (root) root.innerHTML = '<div class="vr-empty"><span class="vr-empty-ico">📡</span>Couldn’t load the voting record right now. Check your connection and try again.' +
      '<button type="button" class="vr-empty-btn" data-vr-retry>Try again</button></div>';
  }

  // Load the next page and append (keeps grouping coherent by re-rendering).
  function loadMore() {
    var id = _state.id, token = _openToken;
    _state.page += 1;
    PDXVotingRecord.fetchMember(id, buildOpts(_state.page)).then(function (data) {
      if (token !== _openToken || !_state || !data) return;
      _state.data = data;
      _state.items = _state.items.concat(data.items || []);
      renderBody();
    });
  }

  // ── Event delegation on the section root (survives re-renders of the body) ─────
  function bindEvents(section) {
    if (section.__vrBound) return;
    section.__vrBound = true;

    section.addEventListener('click', function (e) {
      if (e.target.closest('[data-vr-clear]')) { clearFilters(); return; }
      if (e.target.closest('[data-vr-retry]')) { applyFilters(); return; }
      // Dismiss the omnibus explainer for good — remove it in place (no re-render,
      // so the reader keeps their scroll position) and remember the choice.
      if (e.target.closest('[data-vr-teach-x]')) {
        var note = e.target.closest('[data-vr-teach]');
        if (note && note.parentNode) note.parentNode.removeChild(note);
        savePrefs({ omniNoteHidden: true });
        return;
      }
      var chip = e.target.closest('[data-vr-issue]');
      if (chip) { _state.filters.issue = chip.getAttribute('data-vr-issue') || ''; applyFilters(); return; }
      if (e.target.closest('[data-vr-more]')) { loadMore(); return; }
    });

    section.addEventListener('change', function (e) {
      var el = e.target.closest('[data-vr-filter]');
      if (!el) return;
      var name = el.getAttribute('data-vr-filter');
      if (name === 'hideProcedural') _state.filters.hideProcedural = el.checked;
      else _state.filters[name] = el.value;
      applyFilters();
    });
  }

  // ── Public: shell rendered synchronously into the modal (hidden until data) ────
  window._renderVotingRecord = function (id, p) {
    // Not for an office that casts no roll calls. This shell used to mount for every
    // profile — hidden, but present — and its presence was enough: consistency.js
    // asked the document whether a Voting Record existed before offering "See the
    // full voting record →", got a yes for the President, and printed a promise of a
    // roll-call list that can never fill. The office decides here, once, before the
    // anchor exists at all.
    try {
      var E = window.PDXExecRecord;
      if (E && typeof E.eligible === 'function' && E.eligible(id)) return '';
    } catch (e) {}
    injectStyles();
    // Register the pending hydrate job; _pdxInitVotingRecord picks it up post-render.
    window.__pdxVotingPending = { id: id, p: p };
    return '' +
      '<span id="pdxsec-voting" class="pdx-nav-anchor" aria-hidden="true"></span>' +
      '<section id="pdx-voting-record" class="modal-section" style="display:none;">' +
        '<div class="modal-section-title">🗳️ Voting Record</div>' +
        '<p class="vr-sub">What they actually did — ' + LT('rollcall', 'roll-call votes') +
          ' and official actions, each checked against what they say. ' +
          'Filter by issue, chamber, action, or date.</p>' +
        // One calm, optional entry point for anyone who does not already know how
        // to read a voting record. Renders as nothing if the education layer is
        // absent, so the section is unchanged without it.
        (LHOWTO('voting-record') ? '<div class="vr-howto-row">' + LHOWTO('voting-record') + '</div>' : '') +
        '<div id="pdx-vr-body"><div class="vr-loading">Loading voting record…</div></div>' +
      '</section>';
  };

  // Add a "Votes" pill to the profile jump-nav once we know there's a record,
  // then re-arm the rail so it tracks the new anchor. The pill is appended here
  // and SORTED there: _pdxInitProfileNav places it by real document position, so
  // this function does not have to know where in the rail it belongs. Self-gating:
  // no record → no pill.
  //
  // The figure comes from _pdxRecordMappedCounts (below) — the same helper the
  // profile's live Voting Record Highlights panel reads for its "N records on file"
  // headline — rather than from this load's own summary object. Two surfaces naming
  // the same file from two independently derived numbers is a way to be wrong in
  // public; one source cannot disagree with itself. `count`, which came off the
  // response that just landed, is the fallback for the case where that helper is
  // not on the page.
  //
  // With no number from either, the pill renders as a plain label. Never a 0 and
  // never a placeholder digit: the pill's job is to say the record is there and
  // where to find it, and it can do that without a figure. A fabricated one would
  // be the same mistake, in miniature, as the Trust Score.
  function navPillCount(count, pid) {
    try {
      if (pid && typeof window._pdxRecordMappedCounts === 'function') {
        var mc = window._pdxRecordMappedCounts(pid);
        if (mc && mc.total > 0) return mc.total;
      }
    } catch (e) {}
    return (typeof count === 'number' && count > 0) ? count : null;
  }
  function injectNavPill(count, pid) {
    try {
      var track = document.querySelector('#pdx-profile-nav .pdx-pnav-track');
      if (!track || track.querySelector('[data-target="pdxsec-voting"]')) return;
      var n = navPillCount(count, pid);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pdx-pnav-pill';
      btn.setAttribute('data-target', 'pdxsec-voting');
      btn.setAttribute('aria-label', n === null
        ? 'Voting Record'
        : 'Voting Record: ' + n + ' record' + (n === 1 ? '' : 's'));
      btn.onclick = function () { if (window._pdxNavJump) window._pdxNavJump('pdxsec-voting', btn); };
      btn.innerHTML = '<span class="pdx-pnav-ico" aria-hidden="true">🗳️</span>' +
        '<span class="pdx-pnav-txt"><span class="pdx-pnav-label">Votes</span>' +
        (n === null ? ''
          : '<span class="pdx-pnav-val" style="color:#7fb4ff;">' + n + ' Record' + (n === 1 ? '' : 's') + '</span>') +
        '</span>';
      track.appendChild(btn);
      if (window._pdxNavRearmSoon) window._pdxNavRearmSoon();
      else if (window._pdxInitProfileNav) window._pdxInitProfileNav();
    } catch (e) { /* nav is a nicety; never let it break the section */ }
  }

  // ── Public: hydrate after the modal HTML is in the DOM ─────────────────────────
  // Durable view preferences (sort + hide-procedural) via the PDXStore 'votingPrefs'
  // collection, so the section opens the way the visitor last left it. PDXStore.read/
  // write key off the storage key (the owning collection is inferred), and no-op
  // safely when PDXStore isn't present.
  var PREFS_KEY = 'pdx_voting_prefs';
  function loadPrefs() {
    try {
      if (window.PDXStore && typeof window.PDXStore.read === 'function') {
        var v = window.PDXStore.read(PREFS_KEY, null);
        if (v && typeof v === 'object') return v;
      }
    } catch (e) {}
    return {};
  }
  function savePrefs(patch) {
    try {
      if (window.PDXStore && typeof window.PDXStore.write === 'function') {
        window.PDXStore.write(PREFS_KEY, Object.assign({}, loadPrefs(), patch));
      }
    } catch (e) {}
  }

  window._pdxInitVotingRecord = function () {
    var job = window.__pdxVotingPending;
    window.__pdxVotingPending = null;
    if (!job) return;
    // The section is only LOOKED UP here, not required here. It lives inside the
    // profile's deferred "Full voting record" drawer, whose inner markup is held
    // back as a string until something needs it — so on a freshly opened profile
    // this returns null, and the old `if (!section) return` would have quietly
    // switched the live voting record off for every member.
    //
    // What that guard was actually for is "is a profile rendered at all", and
    // hasTarget() answers that without forcing the drawer to mount. The node is
    // resolved after the fetch settles instead, which is strictly better than
    // before: a member with no record on file never mounts this drawer, and a
    // member with one mounts it off the opening frame rather than on it.
    var SP = window.PDXProfileSpine;
    var live = document.getElementById('pdx-voting-record');
    if (!live) {
      var deferred = !!(SP && typeof SP.hasTarget === 'function' && SP.hasTarget('pdx-voting-record'));
      if (!deferred) return;
    }

    var token = ++_openToken;
    // A caller (e.g. the Stance Library "View votes" action) can request the
    // section open pre-filtered to one issue. Captured now (sync) so a later open
    // can't clobber it, applied after the section reveals below.
    var initIssue = window.__pdxVotingInitialIssue || '';
    window.__pdxVotingInitialIssue = null;
    var positionMap = (window._polPositionMap ? window._polPositionMap(job.id, job.p) : {}) || {};
    var prefs = loadPrefs();
    _state = {
      id: job.id, p: job.p, positionMap: positionMap,
      filters: {
        issue: '', chamber: '', actionType: '', position: '', from: '', to: '',
        sort: (prefs.sort || ''), hideProcedural: !!prefs.hideProcedural
      },
      facets: { issues: [], chambers: [], actionTypes: [] },
      // focusKey: a record key (see _pdxRecordKey) that the NEXT paint should scroll
      // to and ring — set by _pdxVotingRecordFocusVote, consumed by renderBody.
      data: null, items: [], page: 1, offline: false, focusKey: ''
    };

    // Warm the offline pack (fire-and-forget) so the service worker caches it and
    // THIS member renders offline next time. Then load the section: live endpoint
    // first, falling back to the (SW-cached) pack when the network can't be reached.
    PDXVotingRecord.fetchPack(job.id);
    var initOpts = { pageSize: 100 };
    if (_state.filters.sort) initOpts.sort = _state.filters.sort;
    if (_state.filters.hideProcedural) initOpts.hideProcedural = true;
    PDXVotingRecord.fetchMember(job.id, initOpts).then(function (data) {
      if (data) return data;
      // Offline / endpoint unreachable → fall back to the cached pack.
      _state.offline = true;
      return PDXVotingRecord.fetchPack(job.id);
    }).then(function (data) {
      if (token !== _openToken || !_state) return; // another profile opened
      if (!data || !data.summary || (data.summary.totalRecords || 0) === 0) {
        // No record (or offline with nothing cached): stay hidden, add no pill —
        // and leave the drawer unmounted, which is the whole point of asking the
        // network before touching the DOM.
        return;
      }
      // There IS a record, so the section has to exist now. Mount the drawer that
      // holds it (no-op when it was never deferred) and resolve the node here
      // rather than reusing one captured before the fetch.
      if (typeof window._pdxRevealTarget === 'function') window._pdxRevealTarget('pdx-voting-record');
      var section = document.getElementById('pdx-voting-record');
      if (!section) return;
      _state.data = data;
      _state.items = (data.items || []).slice();
      // Warm the sync record cache so the Alignment Tool (and its consistency line)
      // can read this member's votes without its own fetch.
      PDXVotingRecord.noteMember(job.id, _state.items);
      // Announce that the sync record cache is now warm for this member, so
      // surfaces built before the fetch landed can read real votes instead of
      // guessing. Deliberately its own event rather than reusing
      // 'pdx-consistency-warm': that one means "consistency's warm queue resolved"
      // and already has several listeners tuned to it, and this is a different
      // moment with a different owner. Listeners today: the profile's Voting Record
      // Highlights live slot (_pdxHydrateVoteHighlights).
      try { window.dispatchEvent(new CustomEvent('pdx-voting-warm', { detail: { pid: job.id } })); } catch (e) {}

      // Build stable facets from this unfiltered set.
      var issues = {}, chambers = {}, actions = {};
      _state.items.forEach(function (it) {
        (it.issues || []).forEach(function (m) { if (m.issueKey) issues[m.issueKey] = true; });
        if (it.chamber) chambers[it.chamber] = true;
        if (it.kind === 'vote' && it.actionType) actions[it.actionType] = true;
      });
      _state.facets.issues = Object.keys(issues).sort(function (a, b) { return issueLabel(a).localeCompare(issueLabel(b)); });
      _state.facets.chambers = Object.keys(chambers).sort();
      _state.facets.actionTypes = Object.keys(actions).sort();

      section.style.display = '';
      renderBody();
      bindEvents(section);
      injectNavPill(data.summary.totalRecords || _state.items.length, job.id);

      // Deep-link: if a caller asked to land on a specific issue and this member
      // actually has a record on it, pre-filter and scroll the section into view,
      // and reflect the shareable ?p=<id>#pdxsec-voting?issue=<key> URL.
      if (initIssue && _state.facets.issues.indexOf(initIssue) !== -1) {
        _state.filters.issue = initIssue;
        applyFilters();
        try {
          history.replaceState(null, '', location.pathname + location.search +
            '#pdxsec-voting?issue=' + encodeURIComponent(initIssue));
        } catch (e) {}
      }
      if (initIssue) {
        try {
          var _rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (window._pdxNavJump) window._pdxNavJump('pdxsec-voting');
          else section.scrollIntoView({ behavior: _rm ? 'auto' : 'smooth', block: 'start' });
        } catch (e) {}
      }
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 5 — shared hooks for the Comparison boards and the Alignment Tool
  // ═══════════════════════════════════════════════════════════════════════════

  // Per-(member, issue) record summary from whatever is warm in the sync cache.
  // Returns the Phase-2 engine summary (total/consistent/contradicts/netVerdict/…)
  // or null when there's no cached record for that member. Pure + synchronous.
  window._pdxRecordIssueSummary = function (pid, issueKey) {
    var recs = PDXVotingRecord.memberRecords(pid);
    if (!recs || !window._issueRecordSummary) return null;
    // Records on this issue only.
    var on = recs.filter(function (it) {
      return it && it.issues && it.issues.some(function (m) { return m.issueKey === issueKey; });
    });
    if (!on.length) return null;
    var cmp = window.CMP_DATA && window.CMP_DATA[pid];
    var pm = (window._polPositionMap && cmp) ? (window._polPositionMap(pid, cmp) || {}) : {};
    var stance = pm[issueKey] ? pm[issueKey].stance : null;
    return window._issueRecordSummary(issueKey, stance, on);
  };

  // The RAW records behind a (member, issue) summary, newest first. Same filter and
  // same warm cache as _pdxRecordIssueSummary above — this simply hands back the
  // items instead of the aggregate, so a surface can NAME the bill and roll-call
  // question a verdict rests on rather than printing a bare count. Pure, synchronous,
  // never fetches: returns null when no record is warm for that member, and [] when
  // the member has a record but nothing mapped to this issue.
  //   Used by the profile's Official Record stance rows (consistency.js) to show the
  //   proof line "H.R. 22 · On Motion to Recommit · Voted Yea", including in the thin
  //   "limited" case where the summary keeps no top-consistent / top-contradicting
  //   item to point at.
  window._pdxRecordIssueItems = function (pid, issueKey) {
    var recs = PDXVotingRecord.memberRecords(pid);
    if (!recs) return null;
    var on = recs.filter(function (it) {
      return it && it.issues && it.issues.some(function (m) { return m && m.issueKey === issueKey; });
    });
    // Newest first, so the proof line quotes the most recent vote on the issue.
    // Undated records sort last rather than being dropped.
    return on.slice().sort(function (a, b) {
      var ad = a.date || '', bd = b.date || '';
      if (ad === bd) return 0;
      if (!ad) return 1;
      if (!bd) return -1;
      return ad < bd ? 1 : -1;
    });
  };

  // How much record there IS for a member, counted from the same warm cache — the
  // numbers behind the Official Record section's "12 mapped votes across 5 issues"
  // entry line. `votes` counts records carrying at least one issue mapping (those are
  // the ones a stated position can be checked against); `total` counts every warm
  // record, so a surface can stay honest about the gap between what is in the full
  // list and what is mappable. Pure, synchronous, never fetches: null when nothing is
  // warm for that member, so callers simply render nothing.
  window._pdxRecordMappedCounts = function (pid) {
    var recs = PDXVotingRecord.memberRecords(pid);
    if (!recs) return null;
    var seen = {}, keys = [], votes = 0;
    recs.forEach(function (it) {
      if (!it) return;
      var mapped = false;
      (it.issues || []).forEach(function (m) {
        if (!m || !m.issueKey) return;
        mapped = true;
        if (!seen[m.issueKey]) { seen[m.issueKey] = 1; keys.push(m.issueKey); }
      });
      if (mapped) votes++;
    });
    return { votes: votes, issues: keys.length, total: recs.length, issueKeys: keys };
  };

  // WHAT THE RECORD ITSELF DID on a (member, issue) pair, with no stated position
  // anywhere in the arithmetic — the companion to _pdxRecordIssueSummary above,
  // which can only answer where a position exists to compare against. Same warm
  // cache, same items, same engine constants; it counts the direction those items
  // already carry instead of scoring them against a claim. Returns null when no
  // record is warm for the member, so a caller simply renders what it rendered
  // before. Pure and synchronous — nothing here is stored or fetched.
  //
  // The COVERAGE FLOOR is supplied here rather than by the caller, because this is
  // the layer that knows how much of a member's record we actually hold: a member
  // attributed on two roll calls must not have those two read as a pattern, and a
  // caller cannot be relied on to remember to ask.
  //   opts.noun  — { one, many } for the office's countable (default: votes)
  //   opts.label — the issue's display label, for the long-form sentence
  window._pdxRecordDirection = function (pid, issueKey, opts) {
    if (typeof window._recordDirectionIndex !== 'function') return null;
    var items = window._pdxRecordIssueItems(pid, issueKey);
    if (!items) return null; // nothing warm for this member
    var counts = window._pdxRecordMappedCounts(pid);
    var o = opts || {};
    return window._recordDirectionIndex(issueKey, items, {
      memberRecordCount: counts ? counts.votes : null,
      noun: o.noun, label: o.label
    });
  };

  // Companion to the summary above: where that (member, issue) verdict CAME from —
  // how many of the votes behind it were multi-issue bills, and which other issues
  // those bills also touched. Pure presentation metadata (see _recordOmnibusStats in
  // stance-helpers.js): it cannot move a verdict, a count or a %. Returns null when
  // no record is warm, so callers can simply skip the disclosure.
  //   Used by the comparison-board dots here and by the Official Record / gap-sheet
  //   surfaces in consistency.js, so "this came from an omnibus" reads the same
  //   wherever a vote-based verdict is shown.
  window._pdxRecordOmnibusStats = function (pid, issueKey) {
    if (typeof window._recordOmnibusStats !== 'function') return null;
    var recs = PDXVotingRecord.memberRecords(pid);
    if (!recs) return null;
    var st = window._recordOmnibusStats(issueKey, recs, { labelFn: issueLabel });
    return st.total ? st : null;
  };

  // One shared sentence for "this verdict rests partly on multi-issue bills", so the
  // dots, the Official Record feed and the gap sheet all phrase it identically.
  // Returns '' when there is nothing to disclose.
  window._pdxOmnibusProvenanceNote = function (stats) {
    if (!stats || !stats.any) return '';
    return stats.omnibus + ' of ' + stats.total + ' record' + (stats.total === 1 ? '' : 's') +
      ' here came from multi-issue bills' +
      (stats.otherLabels.length ? ' that also covered ' + stats.otherLabels.join(', ') : '') + '.';
  };

  // Legacy-shape voting adapter for the Alignment Tool. Returns the member's votes
  // as [{ bill, matter, alignment }] — the EXACT shape the tool already consumes —
  // sourced from the new voting record when it's warm in cache, else falling back
  // verbatim to the old PROFILES[].sections voting_record so behaviour is unchanged
  // until the richer data arrives. Synchronous by design (see _records note above).
  //   alignment mapping (per the record's primary issue's effective support):
  //     supports the issue → 'kept'   (+1.0 in the tool)
  //     opposes  the issue → 'broken' (+0.15)
  //     no clear position  → 'partial'(+0.6)
  window._alignmentVotesAdapter = function (pid) {
    var recs = PDXVotingRecord.memberRecords(pid);
    if (recs && recs.length) {
      var out = [];
      recs.forEach(function (it) {
        var primary = (it.issues && it.issues[0]) || null;
        var alignment = 'partial';
        if (primary && window._voteEffectiveSupport) {
          var eff = window._voteEffectiveSupport(it, primary.supportMeaning);
          alignment = eff === true ? 'kept' : eff === false ? 'broken' : 'partial';
        }
        // Fold issue labels into `matter` so the tool's keyword matcher still lights
        // up the right issue, exactly as it did with the curated matter text.
        var labels = (it.issues || []).map(function (m) { return issueLabel(m.issueKey); }).join(' ');
        out.push({ bill: it.number || '', matter: ((it.title || '') + ' ' + labels).trim(), alignment: alignment });
      });
      return out;
    }
    // Fallback: the original curated source, untouched.
    var legacy = [];
    var profile = window.PROFILES && window.PROFILES[pid];
    if (profile && profile.sections) {
      profile.sections.forEach(function (sec) {
        if (sec.type === 'voting_record' && sec.votes) {
          sec.votes.forEach(function (v) { legacy.push({ bill: v.bill, matter: v.matter, alignment: v.alignment }); });
        }
      });
    }
    return legacy;
  };

  // Fill any [data-vrdot="pid|issueKey"] placeholders a comparison board emitted
  // with a small consistency dot (stance vs. actual votes). Batched: one /compare
  // call for all members in scope. Idempotent (marks filled nodes) and safe — a
  // failure or empty result just leaves the placeholders blank. `scope` optional.
  var _DOT = {
    consistent:  { ch: '✓', cls: 'vrdot-consistent', tip: 'Votes back up the stated stance' },
    contradicts: { ch: '⚠', cls: 'vrdot-contradicts', tip: 'Votes run against the stated stance' },
    mixed:       { ch: '~', cls: 'vrdot-mixed', tip: 'Mixed voting record on this issue' },
    record:      { ch: '•', cls: 'vrdot-record', tip: 'Has votes on record for this issue' }
  };
  window._pdxHydrateVoteDots = function (scope) {
    if (!window._issueRecordSummary) return;
    var root = scope || document;
    var nodes = root.querySelectorAll('[data-vrdot]:not([data-vrdone])');
    if (!nodes.length) return;
    var pids = {}, want = [];
    for (var i = 0; i < nodes.length; i++) {
      var parts = (nodes[i].getAttribute('data-vrdot') || '').split('|');
      if (parts.length !== 2 || !parts[0] || !parts[1]) { nodes[i].setAttribute('data-vrdone', '1'); continue; }
      pids[parts[0]] = true;
      want.push({ el: nodes[i], pid: parts[0], key: parts[1] });
    }
    var pidList = Object.keys(pids);
    if (!pidList.length) return;
    PDXVotingRecord.fetchCompare(pidList).then(function () {
      var PC = window.PDXConsistency;
      want.forEach(function (w) {
        w.el.setAttribute('data-vrdone', '1');
        // Where the verdict came from: a dot backed by omnibus votes says so, so a
        // comparison board never implies a clean single-issue judgement it can't make.
        var prov = '';
        try {
          var st = window._pdxRecordOmnibusStats(w.pid, w.key);
          if (st && st.any) prov = ' · 🧩 ' + window._pdxOmnibusProvenanceNote(st);
        } catch (e) {}
        // Prefer the UNIFIED verdict (curated receipts + voting record) so a dot on
        // the comparison board matches the profile / receipts. Fall back to the
        // voting-record-only summary when the unifier isn't loaded.
        // Comparison dots are the OFFICIAL RECORD axis — votes / formal actions vs.
        // stance. Use the scoped read so curated (Say-vs-Do) receipts never bleed in.
        if (PC && typeof PC.dot === 'function' && typeof PC.officialRecord === 'function') {
          var uv = PC.officialRecord(w.pid, w.key);
          var d = PC.dot(uv);
          if (!d || uv.token === 'no_record' || uv.token === 'no_stance') return; // nothing to show
          w.el.className = (w.el.className ? w.el.className + ' ' : '') + 'vrdot ' + d.cls;
          w.el.textContent = d.ch;
          var extra = uv.contradictions > 0 ? ' · ⚑' + uv.contradictions : (uv.record && uv.record.total ? ' · ' + uv.record.total + ' vote' + (uv.record.total === 1 ? '' : 's') : '');
          w.el.setAttribute('title', d.tip + extra + prov);
          return;
        }
        var s = window._pdxRecordIssueSummary(w.pid, w.key);
        if (!s || !s.total) return; // no record → leave blank
        var meta = _DOT[s.netVerdict] || _DOT.record;
        w.el.className = (w.el.className ? w.el.className + ' ' : '') + 'vrdot ' + meta.cls;
        w.el.textContent = meta.ch;
        w.el.setAttribute('title', meta.tip + ' · ' + s.total + ' vote' + (s.total === 1 ? '' : 's') + ' on record' + prov);
      });
    });
  };

  // Inject the stylesheet at load so the comparison-board consistency dots are
  // styled even when a board renders before any profile has been opened.
  try { injectStyles(); } catch (e) {}
})();
