/**
 * PolitiDex Stance Helper Functions
 * Extracted from index.html for maintainability
 * These functions operate on ISSUE_STANCE_DATA and power politician position lookups.
 */
(function() {
    'use strict';

    // ── Shared issue linkage (Alignment Tool ⇄ politician profiles) ──────
    // Build a lookup of a politician's documented positions, keyed by the SAME
    // ISSUE_MAP keys the Alignment Tool uses, so a visitor's saved positions can be
    // matched against the politician one-to-one. The curated ISSUE_STANCE_DATA
    // is the single source of truth: any stance carrying an `issueKey` becomes a
    // comparable position. Extend coverage by adding issueKey/issueStance to a
    // stance — no parallel data structure to keep in sync.
    // Aliases so a record stored under a short id still finds curated data keyed
    // under another id (and vice-versa). Maps id → the ISSUE_STANCE_DATA key.
    var STANCE_ALIASES = {
      blake_moore:'bmoore', burgess_owens:'owens', mike_kennedy:'kennedy',
      celeste_maloy:'maloy', spencer_cox:'cox', mike_lee:'lee', john_curtis:'curtis',
      donald_trump:'trump',
      // Name-variant aliases for the 2026-cycle additions, so a record stored under
      // a slightly different display-name slug still lights up the curated data.
      stuart_adams:'j_stuart_adams', president_adams:'j_stuart_adams',
      jen_dailey_provost:'jennifer_dailey_provost',
      gaylynn_bennion:'gay_lynn_bennion',
      kirk_a_cullimore:'kirk_cullimore', val_l_peterson:'val_peterson',
      deidre_m_henderson:'deidre_henderson',
      // 2026-cycle expansion: map the directory's short ids to the curated
      // name-slug stance keys added above so each profile lights up.
      fillmore:'lincoln_fillmore', harper:'wayne_harper', stevenson:'jerry_stevenson',
      millner:'ann_millner', sandall_s:'scott_sandall', sandall:'scott_sandall',
      grover:'keith_grover', teuscher:'jordan_teuscher', spackman_moss:'carol_spackman_moss',
      cbramble:'curt_bramble', dipson:'don_ipson',
      // After duplicate cleanup, the richer McCay/McKell records are kept under
      // their short ids; point them at the curated name-slug stance keys so their
      // profiles still light up the curated positions.
      //
      // NOTE ON THE mmckell ALIAS CHAIN (fragile — documented so it stays intact):
      //   • Canonical roster/Firestore doc id: `mmckell` (the record kept after a
      //     duplicate cleanup).
      //   • Curated stance cards live under the name-slug key `mike_mckell` in
      //     ISSUE_STANCE_DATA — bridged by the `mmckell:'mike_mckell'` alias below.
      //   • index.html ALSO carries browse-tier aliases for the same person
      //     (e.g. `mmckell:['pm-tier-state', ...]` and an ACCT alias
      //     `mmckell:'mckell_s25'`). Those are a SEPARATE mechanism (browse/ACCT),
      //     not this stance map. When touching McKell, update all three or the
      //     profile/cards/tier can desync. Prefer keeping the stance-card key equal
      //     to the roster id for new records to avoid needing an alias at all.
      dmccay:'daniel_mccay', mmckell:'mike_mckell',
      // Batch 6 (Salt Lake County) stored curated cards under new *_slc / *_slco
      // ids while the roster keeps the pre-existing short ids. Bridge them so the
      // existing roster profiles light up the new curated stance cards. (Officials
      // created fresh in Batches 5/7/8 use the SAME id in the roster and in
      // ISSUE_STANCE_DATA, so they need no alias — the id matches directly.)
      emendenhall:'erin_mendenhall_slc', jwilson:'jenny_wilson_slco'
    };
    window.STANCE_ALIASES = STANCE_ALIASES;

    // Slugify a name the same way the directory import builds its document ids.
    function _stanceSlug(s) {
      return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    }
    // Resolve a politician's curated stance list robustly: try the id directly, an
    // explicit alias, then a slug of their display name. This lets the curated data
    // light up whether a record is stored under a short id ("owens") or the
    // name-slug the importer generates ("burgess_owens").
    function _resolveStanceList(id, p) {
      if (typeof ISSUE_STANCE_DATA === 'undefined') return null;
      if (id && ISSUE_STANCE_DATA[id]) return ISSUE_STANCE_DATA[id];
      if (id && STANCE_ALIASES[id] && ISSUE_STANCE_DATA[STANCE_ALIASES[id]]) return ISSUE_STANCE_DATA[STANCE_ALIASES[id]];
      var nameSlug = (p && p.name) ? _stanceSlug(p.name) : '';
      if (nameSlug && ISSUE_STANCE_DATA[nameSlug]) return ISSUE_STANCE_DATA[nameSlug];
      if (nameSlug && STANCE_ALIASES[nameSlug] && ISSUE_STANCE_DATA[STANCE_ALIASES[nameSlug]]) return ISSUE_STANCE_DATA[STANCE_ALIASES[nameSlug]];
      return null;
    }
    window._resolveStanceList = _resolveStanceList;

    function _polPositionMap(id, p) {
      var out = {};
      var list = _resolveStanceList(id, p);
      if (!list) return out;
      list.forEach(function(s) {
        if (!s || !s.issueKey) return;
        out[s.issueKey] = {
          stance: s.issueStance || s.pos || 'mixed',
          topic: s.topic, text: s.text, icon: s.icon,
          evidence: s.evidence, source: s.source
        };
      });
      return out;
    }
    window._polPositionMap = _polPositionMap;

  // ── Connected-evidence map + Stance-at-a-Glance chips ──────────────────────
  // Moved from index.html. These operate on the same curated ISSUE_STANCE_DATA /
  // _resolveStanceList above, so they live beside the data and helpers they use.
    // ── Connected-evidence map (foundation for a future "evidence view") ─────────
    // Groups everything PolitiDex knows about a politician by ISSUE_MAP key, so a
    // single issue can be shown as a stance PLUS the dots that back or contradict
    // it — without any new data work at render time. This is the structural payoff
    // of giving all three layers a shared 'issueKey':
    //   • position : the documented stance on this issue (from ISSUE_STANCE_DATA)
    //   • promises : tracked promises tagged to this issue. A 'kept' promise is
    //                supporting evidence, 'broken' is contradicting, 'pending' is
    //                in-progress — the raw material for "backed by X, undercut by Y".
    //   • spotlight: Spotlight items tagged to this issue (statements / events).
    //   • counts   : { promisesKept, promisesBroken, promisesPending, spotlight }
    // Returns {} for an unknown/empty record, so callers can render a clean,
    // unconnected view and light up the evidence view only where dots exist. This
    // is intentionally NOT rendered yet — it just makes the relationship queryable.
    function _issueEvidenceMap(id, p) {
      var out = {};
      function bucket(ik) {
        if (!out[ik]) out[ik] = { issueKey: ik, position: null, promises: [], spotlight: [],
          counts: { promisesKept: 0, promisesBroken: 0, promisesPending: 0, spotlight: 0,
            spotlightPositive: 0, spotlightNegative: 0 } };
        return out[ik];
      }
      // Documented positions
      var list = (typeof _resolveStanceList === 'function') ? (_resolveStanceList(id, p) || []) : [];
      list.forEach(function(s) {
        if (!s || !s.issueKey) return;
        var b = bucket(s.issueKey);
        if (!b.position) b.position = { stance: s.issueStance || s.pos || 'mixed', topic: s.topic,
          text: s.text, icon: s.icon, evidence: s.evidence, source: s.source,
          detail: s.detail, issueKey: s.issueKey };
      });
      // Promises. The shared issueKey was patched onto the bundled static roster
      // (CMP_DATA), so a record opened from there is tagged directly. A record
      // loaded live from Firestore may carry the same promises WITHOUT an issueKey,
      // so fall back to the roster's title→issueKey map to recover the link rather
      // than dropping the promise from the evidence view.
      if (p && Array.isArray(p.promises)) {
        var _promKeyByTitle = {};
        try {
          var _roster = (typeof CMP_DATA !== 'undefined' && CMP_DATA[id] && Array.isArray(CMP_DATA[id].promises))
            ? CMP_DATA[id].promises : null;
          if (_roster) _roster.forEach(function(rp) {
            if (rp && rp.title && rp.issueKey) _promKeyByTitle[String(rp.title).trim().toLowerCase()] = rp.issueKey;
          });
        } catch (e) {}
        p.promises.forEach(function(pr) {
          if (!pr) return;
          var ik = pr.issueKey || _promKeyByTitle[String(pr.title || '').trim().toLowerCase()];
          if (!ik) return;
          var b = bucket(ik);
          b.promises.push({ title: pr.title, verdict: pr.verdict, detail: pr.detail, sources: pr.sources });
          var v = String(pr.verdict || '').toLowerCase();
          if (v === 'kept') b.counts.promisesKept++;
          else if (v === 'broken') b.counts.promisesBroken++;
          else b.counts.promisesPending++;
        });
      }
      // Spotlight items — drawn from BOTH the curated news layer (SPOTLIGHT_DATA)
      // and the integrity layer (ACCT_SPOTLIGHT), each resolved through the
      // browse↔CMP_DATA alias (the same _slKey logic _slComputeDrivers uses) so the
      // dots light up on whichever id the surface passed in. Only items carrying an
      // issueKey join the evidence map; ACCT items also bring their ▲/▼ impact, so a
      // future view can show what BACKS a stance (positive) vs. what CUTS AGAINST it
      // (negative) alongside the kept/broken promise ledger. Deduped by headline.
      var _slKey = (id && window.ACCT_SPOTLIGHT && Array.isArray(window.ACCT_SPOTLIGHT[id])) ? id
                 : (id && window.ACCT_ALIAS && window.ACCT_ALIAS[id]) ? window.ACCT_ALIAS[id] : id;
      var _seenSl = {};
      function addSpot(it) {
        if (!it || !it.issueKey) return;
        var hk = String(it.headline || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 70);
        if (hk && _seenSl[hk]) return;
        if (hk) _seenSl[hk] = 1;
        var b = bucket(it.issueKey);
        var impact = (it.impact === 'positive' || it.impact === 'negative') ? it.impact : null;
        // Carry the full evidence payload so a visible view can render the
        // recorded words/actions in place — video & X links with timestamps, the
        // sourced citation, and the supporting/contradicting impact — without any
        // second lookup. Additive: callers that only read headline/date/impact are
        // unaffected.
        b.spotlight.push({ headline: it.headline, date: it.date, impact: impact,
          media: it.media || null, source: it.source || null, sourceType: it.sourceType || null,
          category: it.category || null, facts: it.facts || null, why: it.why || null,
          issueKey: it.issueKey });
        b.counts.spotlight++;
        if (impact === 'positive') b.counts.spotlightPositive++;
        else if (impact === 'negative') b.counts.spotlightNegative++;
      }
      // The live Firestore document's OWN spotlight array is the authoritative
      // source for a profile's recorded statements/actions — it is where the
      // video & X-post evidence (with timestamps) is patched for the sitting Utah
      // legislators. The static SPOTLIGHT_DATA / ACCT_SPOTLIGHT maps key off
      // different browse aliases and don't carry these items, so read p.spotlight
      // FIRST and let its rich media entries win the headline dedupe.
      var slDoc = (p && Array.isArray(p.spotlight)) ? p.spotlight : [];
      slDoc.forEach(addSpot);
      var slNews = (typeof window !== 'undefined' && window.SPOTLIGHT_DATA &&
        (window.SPOTLIGHT_DATA[id] || (_slKey && window.SPOTLIGHT_DATA[_slKey]))) || [];
      slNews.forEach(addSpot);
      var slAcct = (typeof window !== 'undefined' && window.ACCT_SPOTLIGHT && _slKey &&
        Array.isArray(window.ACCT_SPOTLIGHT[_slKey])) ? window.ACCT_SPOTLIGHT[_slKey] : [];
      slAcct.forEach(addSpot);
      return out;
    }
    window._issueEvidenceMap = _issueEvidenceMap;

    // ── At-a-glance stance chips for browse cards ────────────────────────────
    // Compact, color-coded row of a politician's REAL documented positions, drawn
    // straight from ISSUE_STANCE_DATA via _resolveStanceList. Each chip is the
    // issue topic with a direction marker (✓ supports · ✗ opposes · ~ mixed) and a
    // hover tooltip carrying the full sourced one-liner. Returns '' when there are
    // no documented stances, so a card is NEVER given fabricated content — thin
    // profiles with no data simply fall back to their existing "being compiled"
    // note. This is the single chokepoint every card surface reuses, so the same
    // positions read appears on the district tree, All Politicians, Relevant to
    // Me, Key Races, Favorites and the Compare hub.
    //   opts.max    — max chips to show (default 3); the rest collapse to "+N more"
    //   opts.label  — set false to drop the "Where X stands · N positions" eyebrow
    var _PDX_STANCE_DIR = {
      support: { cls: 'is-support', ico: '✓' },
      oppose:  { cls: 'is-oppose',  ico: '✗' },
      mixed:   { cls: 'is-mixed',   ico: '~' }
    };
    function _pdxStanceAttr(s) {
      return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }
    // Verdict marker shown on a chip the visitor ALSO picked in the Alignment Tool:
    // a compact "you" badge — agree (green) · partly (amber) · differ (red) — so a
    // card reads, at a glance, how this official lines up with the visitor's own
    // saved positions. Glyphs are kept distinct from the leading direction icon.
    var _PDX_MINE_DIR = {
      match:    { cls: 'mine-match',  ico: '✓', word: 'You match'  },
      partial:  { cls: 'mine-partial', ico: '≈', word: 'Partial'    },
      mismatch: { cls: 'mine-differ', ico: '✗', word: 'You differ' }
    };
    window._pdxStanceChips = function(pid, d, opts) {
      opts = opts || {};
      if (typeof window._resolveStanceList !== 'function') return '';
      var rec = d || ((typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null);
      var list = window._resolveStanceList(pid, rec) || [];
      // Only genuine topical positions count — skip any malformed entry with no topic.
      list = list.filter(function(s) { return s && String(s.topic || '').trim(); });
      if (!list.length) return '';

      // ── Evidence threading (opt-in) ──────────────────────────────────────────
      // When a caller passes opts.evidence = { id, p } (the medium-card modal does),
      // each stance can carry the SAME video proof and People's Mandate tie the full
      // profile already surfaces — so a stance in the compact modal threads straight
      // to its clip and its reform instead of dead-ending as a static chip. Every
      // other caller omits opts.evidence and renders exactly as before.
      var _evCtx = opts.evidence || null;
      var _evId = (_evCtx && _evCtx.id != null) ? _evCtx.id : pid;
      var _evP = (_evCtx && _evCtx.p) ? _evCtx.p : rec;
      function _stanceVideo(s) {
        if (!_evCtx || !s || !s.issueKey || typeof window._pdxIssueVideo !== 'function') return null;
        try { return window._pdxIssueVideo(_evId, _evP, s.issueKey); } catch (e) { return null; }
      }

      // ── Alignment Tool linkage ───────────────────────────────────────────────
      // When the visitor has saved positions, mark each chip that lands on one of
      // THEIR issues with how the two line up. This is what ties the cards to the
      // Alignment Tool everywhere a voter browses — the same matched/partial/differs
      // read shown in the profile's "How You Compare", now surfaced inline on the
      // card. Everything degrades gracefully: no saved issues → plain stance chips.
      var hasAlign = (typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0);
      function _mineVerdict(s) {
        if (!hasAlign || !s || !s.issueKey || !_alignIssues.has(s.issueKey)) return null;
        var inten = (typeof _alignIntensity !== 'undefined' && _alignIntensity[s.issueKey]) || 'support';
        var polStance = String(s.issueStance || s.pos || 'mixed').toLowerCase();
        return (typeof window._issueVerdict === 'function') ? window._issueVerdict(inten, polStance) : 'partial';
      }
      // Lead with the visitor's own issues so a card opens on what's relevant to them
      // (stable within each group, so curated ordering is otherwise preserved).
      if (hasAlign) {
        var mineList = [], restList = [];
        list.forEach(function(s) { (_mineVerdict(s) ? mineList : restList).push(s); });
        list = mineList.concat(restList);
      }

      var max = opts.max || 3;
      var shown = list.slice(0, max);
      var chips = shown.map(function(s) {
        var pos = String(s.issueStance || s.pos || 'mixed').toLowerCase();
        var meta = _PDX_STANCE_DIR[pos] || _PDX_STANCE_DIR.mixed;
        var topic = String(s.topic || '').trim();
        var label = topic.length > 26 ? topic.slice(0, 24).replace(/\s+\S*$/, '') + '…' : topic;
        var verb = pos === 'support' ? 'Supports' : pos === 'oppose' ? 'Opposes' : 'Mixed record on';
        var tip = verb + ' — ' + (s.text || topic);
        var v = _mineVerdict(s);
        var mineCls = '', youMark = '';
        if (v) {
          var mm = _PDX_MINE_DIR[v] || _PDX_MINE_DIR.partial;
          mineCls = ' pdx-stance-chip--mine ' + mm.cls;
          tip = '🎯 On your issue · ' + mm.word + ' — ' + (s.text || topic);
          youMark = '<span class="pdx-stance-you" aria-hidden="true">' + mm.ico + '<span class="pdx-stance-you-lbl">you</span></span>';
        }
        // A tappable camera-eye when verified video proof backs this exact stance —
        // the most concrete "receipts" cue, now visible right on the stance chip.
        var chipEye = '';
        if (_evCtx) {
          var _cv = _stanceVideo(s);
          if (_cv && typeof window._pdxVideoEye === 'function') chipEye = window._pdxVideoEye(_cv, { asSpan: true, cls: 'pdx-stance-eye' });
        }
        return '<span class="pdx-stance-chip ' + meta.cls + mineCls + '" title="' + _pdxStanceAttr(tip) + '">' +
          '<span class="pdx-stance-ico">' + meta.ico + '</span>' + _pdxStanceAttr(label) + youMark + chipEye + '</span>';
      }).join('');
      var moreN = list.length - shown.length;
      var more = moreN > 0 ? '<span class="pdx-stance-more">+' + moreN + ' more</span>' : '';
      var label = '';
      if (opts.label !== false) {
        var first = (rec && rec.name) ? String(rec.name).split(' ')[0] : 'They';
        // At-a-glance balance of the FULL documented record — a literal count of how
        // many positions lean support vs oppose vs mixed, color-coded to match the
        // chips. The counts are factual (never derived or editorialized), so the
        // summary stays honest while giving a values gist even when the card only has
        // room to show the first few chips. This is the quick read a voter scans to
        // see whether someone's record skews for or against before opening anything.
        var nSup = 0, nOpp = 0, nMix = 0;
        list.forEach(function(s) {
          var p = String(s.issueStance || s.pos || 'mixed').toLowerCase();
          if (p === 'support') nSup++; else if (p === 'oppose') nOpp++; else nMix++;
        });
        var sum = '';
        if (list.length >= 2) {
          sum = '<span class="pdx-stance-sum">' +
            (nSup ? '<span class="pdx-stance-sum-i is-support" title="' + nSup + ' position' + (nSup === 1 ? '' : 's') + ' supported">✓ ' + nSup + '</span>' : '') +
            (nOpp ? '<span class="pdx-stance-sum-i is-oppose" title="' + nOpp + ' position' + (nOpp === 1 ? '' : 's') + ' opposed">✗ ' + nOpp + '</span>' : '') +
            (nMix ? '<span class="pdx-stance-sum-i is-mixed" title="' + nMix + ' mixed / nuanced position' + (nMix === 1 ? '' : 's') + '">~ ' + nMix + '</span>' : '') +
            '</span>';
        }
        // Personalized read: how many of the visitor's own picked issues this
        // official has a documented position on, color-cued to how they line up.
        var mineEb = '';
        if (hasAlign) {
          var mineN = 0, mAgree = 0, mDiff = 0;
          list.forEach(function(s) { var mv = _mineVerdict(s); if (mv) { mineN++; if (mv === 'match') mAgree++; else if (mv === 'mismatch') mDiff++; } });
          if (mineN > 0) {
            var leanCls = mDiff > mAgree ? 'is-differ' : (mAgree >= mDiff && mAgree > 0 ? 'is-agree' : 'is-partial');
            mineEb = '<span class="pdx-stance-mine-eb ' + leanCls + '" title="Has a documented position on ' + mineN +
              ' of the issues you picked in the Alignment Tool">🎯 <b>' + mineN + '</b> of your issues</span>';
          }
        }
        label = '<div class="pdx-stance-eyebrow"><span class="pdx-stance-eyebrow-ico">\u{1F4CC}</span>' +
          '<span class="pdx-stance-eyebrow-txt">Where ' + _pdxStanceAttr(first) + ' stands · <b>' +
          list.length + ' position' + (list.length === 1 ? '' : 's') + '</b></span>' + mineEb + sum + '</div>';
      }

      // ── Signature stance line ────────────────────────────────────────────────
      // The chips are the scannable index of WHICH issues a politician has a record
      // on; this one readable line surfaces WHAT the lead position actually says,
      // quoted verbatim from the sourced `text` of the top stance — the visitor's
      // own aligned issue when they have one, otherwise the first documented
      // position. It turns the hover-only tooltip into visible, touch-friendly
      // substance and gives even a single-position card a real, quotable statement
      // of values. Drawn straight from ISSUE_STANCE_DATA, so nothing is fabricated;
      // when no position carries readable text the line is simply omitted.
      var lead = '';
      var leadMandate = '';
      if (opts.summary !== false) {
        var leadPos = null;
        for (var li = 0; li < list.length; li++) {
          if (list[li] && String(list[li].text || '').trim()) { leadPos = list[li]; break; }
        }
        if (leadPos) {
          var lp = String(leadPos.issueStance || leadPos.pos || 'mixed').toLowerCase();
          var lmeta = _PDX_STANCE_DIR[lp] || _PDX_STANCE_DIR.mixed;
          var ltext = String(leadPos.text).trim();
          if (ltext.length > 116) ltext = ltext.slice(0, 113).replace(/\s+\S*$/, '') + '…';
          var leadMine = (hasAlign && _mineVerdict(leadPos)) ? ' pdx-stance-lead--mine' : '';
          lead = '<div class="pdx-stance-lead ' + lmeta.cls + leadMine + '">' +
            '<span class="pdx-stance-lead-ico" aria-hidden="true">' + lmeta.ico + '</span>' +
            '<span class="pdx-stance-lead-txt">' + _pdxStanceAttr(ltext) + '</span></div>';
          // When this headline stance sits on an issue citizens are voting on, tie
          // it straight to its People's Mandate reform — the stance → Mandate leg of
          // the thread, placed on the stance itself rather than only in a separate
          // section, so the connection reads as natural.
          if (_evCtx && leadPos.issueKey && typeof window._pdxMandateChip === 'function') {
            var _lm = window._pdxMandateChip(leadPos.issueKey, { compact: true });
            if (_lm) leadMandate = '<div class="pdx-stance-lead-mandate">' + _lm + '</div>';
          }
        }
      }
      return '<div class="pdx-snap-stances">' + label + lead + leadMandate + '<div class="pdx-stance-chips">' + chips + more + '</div></div>';
    };

  // ── Seat issue board + "How You Compare" family ────────────────────────────
  // Moved from index.html. These read documented stances (via _polPositionMap /
  // _resolveStanceList above) and compare them against the visitor's Alignment
  // Tool picks, so they live beside the data and helpers they use. Cross-file
  // dependencies (CMP_DATA, ISSUE_MAP, _alignIssues, _calcAlignmentScore, …)
  // resolve as globals exactly as they did in index.html.
  // ── At-a-glance issue comparison for one district seat ─────────────────────
  // Lays a unified seat's WHOLE live field (the sitting officeholder plus every
  // challenger for that same seat) against the SAME key issues in one compact,
  // aligned grid: issues down the side, people across the top, every cell a
  // color-coded ✓ supports · ✗ opposes · ~ mixed · — no-position read. This is
  // what makes the district view answer "where does everyone in this race
  // stand?" without opening a single profile — and, because the rows are shared
  // issues rather than each person's own top tags, a voter can scan straight
  // ACROSS a row to compare the field head-to-head.
  //
  // Everything is drawn from documented ISSUE_STANCE_DATA via _polPositionMap,
  // so nothing is fabricated: a person with no record on an issue simply reads
  // "—". Rows are prioritized by what actually decides the race — the visitor's
  // own Alignment Tool issues first, then issues the field openly disagrees on
  // (support AND oppose both present), then the most widely-held — so the few
  // rows shown are the most distinctive and relevant. Returns '' unless at least
  // two people in the field carry documented positions (no field, no comparison).
  window._pdxSeatIssueBoard = function(fieldPids, opts) {
    opts = opts || {};
    if (typeof window._polPositionMap !== 'function' || typeof CMP_DATA === 'undefined') return '';

    // Gather each person's documented position map, preserving the caller's order
    // (the field arrives incumbent-first), so the columns mirror the cards below.
    var people = [];
    (fieldPids || []).forEach(function(pid) {
      var d = CMP_DATA[pid];
      if (!d) return;
      var map = window._polPositionMap(pid, d) || {};
      people.push({ pid: pid, d: d, map: map, n: Object.keys(map).length });
    });
    if (people.length < 2) return '';
    // A genuine comparison needs documented positions from at least two people —
    // otherwise the grid would be one filled column beside a wall of "—".
    if (people.filter(function(p) { return p.n > 0; }).length < 2) return '';

    var hasAlign = (typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0);

    // Aggregate every documented issue across the field, keyed by canonical
    // issueKey so the same topic from different people lands on one shared row.
    var issues = {};
    people.forEach(function(p) {
      Object.keys(p.map).forEach(function(k) {
        var e = p.map[k] || {};
        var st = String(e.stance || 'mixed').toLowerCase();
        if (st !== 'support' && st !== 'oppose') st = 'mixed';
        if (!issues[k]) issues[k] = { key: k, topics: [], icon: e.icon || '', byPid: {}, txt: {} };
        issues[k].byPid[p.pid] = st;
        issues[k].txt[p.pid] = e.text || '';
        if (e.topic) issues[k].topics.push(String(e.topic).trim());
        if (!issues[k].icon && e.icon) issues[k].icon = e.icon;
      });
    });

    var arr = Object.keys(issues).map(function(k) {
      var it = issues[k];
      var stances = Object.keys(it.byPid).map(function(pid) { return it.byPid[pid]; });
      var distinct = {};
      stances.forEach(function(s) { distinct[s] = 1; });
      it.cov = stances.length;
      it.contested = it.cov >= 2 && distinct.support && distinct.oppose;   // open disagreement
      it.divergent = it.cov >= 2 && Object.keys(distinct).length > 1;      // any difference
      it.mine = !!(hasAlign && _alignIssues.has(k));
      // Representative label: the shortest topic phrasing seen for this issue
      // (keeps the row compact); fall back to a de-slugged key.
      it.label = it.topics.slice().sort(function(a, b) { return a.length - b.length; })[0] ||
        k.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
      if (!it.icon) it.icon = '📌';
      return it;
    });

    // Most decision-relevant first: your issues → openly contested → any
    // divergence → widest coverage → stable alphabetical.
    arr.sort(function(a, b) {
      return (b.mine - a.mine) || (b.contested - a.contested) || (b.divergent - a.divergent) ||
        (b.cov - a.cov) || a.label.localeCompare(b.label);
    });

    var max = opts.max || 4;
    var rows = arr.slice(0, max);
    if (!rows.length) return '';
    var moreIssues = arr.length - rows.length;

    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function partyCol(party) {
      return party === 'R' ? '#f87171' : party === 'D' ? '#60a5fa'
        : (party === 'F' || party === 'Forward') ? '#22d3ee' : '#a78bfa';
    }

    // Person column headers — a small party-tinted avatar + first name, the same
    // people shown as cards below, each tappable to open the full profile.
    var headCells = people.map(function(p) {
      var d = p.d;
      var first = d.name ? String(d.name).split(/\s+/)[0] : '—';
      var url = d.photo ? d.photo
        : ((typeof window._getPhotoUrl === 'function') ? window._getPhotoUrl(p.pid) : ((typeof BROWSE_PHOTOS !== 'undefined' && BROWSE_PHOTOS[p.pid]) ? BROWSE_PHOTOS[p.pid] : ''));
      var col = partyCol(d.party);
      var status = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(d) : 'office';
      var roleIco = status === 'office' ? '★' : status === 'candidate' ? '🗳' : '◷';
      var av = url
        ? '<span class="pdx-sib-av" style="border-color:' + col + '99;"><img src="' + esc(url) + '" alt="' + esc(d.name) + '" loading="lazy" onerror="this.style.display=\'none\'"></span>'
        : '<span class="pdx-sib-av pdx-sib-av-ph" style="border-color:' + col + '99;color:' + col + ';">' + esc(first.slice(0, 1)) + '</span>';
      return '<th class="pdx-sib-person" title="' + esc(d.name) + ' — open profile" ' +
          'onclick="event.stopPropagation();showProfile(\'' + p.pid + '\')">' +
          av +
          '<span class="pdx-sib-name" style="color:' + col + ';">' + esc(first) + '</span>' +
          '<span class="pdx-sib-role" aria-hidden="true">' + roleIco + '</span>' +
        '</th>';
    }).join('');

    var DIR = {
      support: { cls: 'is-support', ico: '✓', verb: 'Supports' },
      oppose:  { cls: 'is-oppose',  ico: '✗', verb: 'Opposes' },
      mixed:   { cls: 'is-mixed',   ico: '~', verb: 'Mixed record on' }
    };
    var bodyRows = rows.map(function(it) {
      var cells = people.map(function(p) {
        var st = it.byPid[p.pid];
        if (!st) return '<td class="pdx-sib-cell is-none" title="No documented position on this issue">·</td>';
        var m = DIR[st] || DIR.mixed;
        var who = p.d.name ? String(p.d.name).split(/\s+/)[0] : 'They';
        var tip = who + ' — ' + m.verb + ' ' + it.label + (it.txt[p.pid] ? ': ' + it.txt[p.pid] : '');
        return '<td class="pdx-sib-cell ' + m.cls + '" title="' + esc(tip) + '"><span class="pdx-sib-ico">' + m.ico + '</span></td>';
      }).join('');
      var rowCls = 'pdx-sib-row' + (it.mine ? ' is-mine' : (it.contested ? ' is-contested' : ''));
      var flag = it.mine
        ? '<span class="pdx-sib-flag is-mine" title="One of your Alignment Tool issues">🎯 yours</span>'
        : (it.contested ? '<span class="pdx-sib-flag" title="The field openly disagrees here">⚡ split</span>' : '');
      return '<tr class="' + rowCls + '">' +
          '<th class="pdx-sib-issue" scope="row">' +
            '<span class="pdx-sib-issue-ico" aria-hidden="true">' + (it.icon || '📌') + '</span>' +
            '<span class="pdx-sib-issue-lbl">' + esc(it.label) + '</span>' + flag +
          '</th>' + cells +
        '</tr>';
    }).join('');

    var sub = moreIssues > 0
      ? rows.length + ' of ' + arr.length + ' issues · most distinctive first'
      : rows.length + ' issue' + (rows.length === 1 ? '' : 's') + ' across this race';

    return '<div class="pdx-seat-board" onclick="event.stopPropagation();">' +
        '<div class="pdx-seat-board-head">' +
          '<span class="pdx-seat-board-ico" aria-hidden="true">📊</span>' +
          '<span class="pdx-seat-board-title">Where they stand</span>' +
          '<span class="pdx-seat-board-sub">' + sub + '</span>' +
        '</div>' +
        '<div class="pdx-seat-board-scroll">' +
          '<table class="pdx-sib-grid"><thead><tr><th class="pdx-sib-corner" scope="col">Key issue</th>' +
            headCells + '</tr></thead><tbody>' + bodyRows + '</tbody></table>' +
        '</div>' +
        '<div class="pdx-seat-board-legend">' +
          '<span class="pdx-sib-lg is-support">✓ Supports</span>' +
          '<span class="pdx-sib-lg is-oppose">✗ Opposes</span>' +
          '<span class="pdx-sib-lg is-mixed">~ Mixed</span>' +
          '<span class="pdx-sib-lg is-none">· No position on record</span>' +
          (moreIssues > 0 ? '<span class="pdx-sib-lg-more">Open a profile for the full record</span>' : '') +
        '</div>' +
      '</div>';
  };

  // Compare one of the visitor's selected positions to the politician's stance.
  //   userIntensity : a 5-point level — strongly_support | support | neutral |
  //                   oppose | strongly_oppose  (legacy strong/moderate/opposed
  //                   are migrated).  polStance : 'support' | 'oppose' | 'mixed'.
  // Returns 'match' | 'partial' | 'mismatch'. A user who opposes a position flips
  // the read — agreeing with a politician who rejects it too. Neutral is 'partial'.
  function _issueVerdict(userIntensity, polStance) {
    var lvl = (typeof window._alignMigrateLevel === 'function') ? window._alignMigrateLevel(userIntensity) : userIntensity;
    if (polStance === 'mixed' || lvl === 'neutral') return 'partial';
    var userAgrees = (lvl === 'support' || lvl === 'strongly_support');
    var polHolds = polStance === 'support';
    return (userAgrees === polHolds) ? 'match' : 'mismatch';
  }
  window._issueVerdict = _issueVerdict;

  var _CMP_VERDICT_META = {
    match:    { cls:'cmp-match',    ico:'✓', link:'=', label:'Match',    full:'Match'         },
    partial:  { cls:'cmp-partial',  ico:'~', link:'≈', label:'Partial',  full:'Partial Match' },
    mismatch: { cls:'cmp-mismatch', ico:'✗', link:'≠', label:'Mismatch', full:'Mismatch'      }
  };
  function _userStanceLabel(intensity) {
    var lvl = (typeof window._alignMigrateLevel === 'function') ? window._alignMigrateLevel(intensity) : intensity;
    if (lvl === 'strongly_support') return 'Strongly support';
    if (lvl === 'oppose')           return 'You oppose';
    if (lvl === 'strongly_oppose')  return 'Strongly oppose';
    if (lvl === 'neutral')          return 'Neutral';
    return 'You support';
  }
  function _polStanceLabel(stance) {
    if (stance === 'support') return 'Supports';
    if (stance === 'oppose')  return 'Opposes';
    return 'Mixed record';
  }
  // The visitor's saved Alignment Tool stance, surfaced as a clear badge across the
  // 5-point scale — exactly the choices offered in the tool.
  function _userIntensityMeta(intensity) {
    var lvl = (typeof window._alignMigrateLevel === 'function') ? window._alignMigrateLevel(intensity) : intensity;
    if (lvl === 'strongly_support') return { cls:'lvl-strong',   icon:'💪', label:'Strongly Support', sub:'You strongly support this' };
    if (lvl === 'neutral')          return { cls:'lvl-neutral',  icon:'😐', label:'Neutral',          sub:'You feel neutral / mixed' };
    if (lvl === 'oppose')           return { cls:'lvl-oppose',   icon:'👎', label:'Oppose',           sub:'You oppose this' };
    if (lvl === 'strongly_oppose')  return { cls:'lvl-opposed',  icon:'✋', label:'Strongly Oppose',   sub:'You strongly oppose this' };
    return                                 { cls:'lvl-moderate', icon:'👍', label:'Support',          sub:'You support this' };
  }
  function _polStanceMeta(stance) {
    if (stance === 'support') return { cls:'pol-support', icon:'✓', label:'Supports', sub:'Backs this position' };
    if (stance === 'oppose')  return { cls:'pol-oppose',  icon:'✗', label:'Opposes',  sub:'Rejects this position' };
    return                           { cls:'pol-mixed',   icon:'~', label:'Mixed',     sub:'Has a mixed record' };
  }
  // Expose the verdict metadata + label/meta helpers so the surfaces still using
  // them by bare name in index.html (Stance at a Glance and friends) keep resolving
  // to these definitions now that they live in this module's scope.
  window._CMP_VERDICT_META = _CMP_VERDICT_META;
  window._userStanceLabel = _userStanceLabel;
  window._polStanceLabel = _polStanceLabel;
  window._userIntensityMeta = _userIntensityMeta;
  window._polStanceMeta = _polStanceMeta;

  // "How You Compare" — the per-issue linkage between a visitor's saved Alignment
  // Tool positions and this politician's documented stances. Shown whenever the
  // visitor has any positions selected (their saved Alignment Signature loads
  // automatically when signed in). Each comparable issue gets a side-by-side read
  // — your view vs. theirs — with a colored match / partial / differs indicator,
  // so it's obvious at a glance where you line up and where you don't.
  window._renderIssueComparison = function(id, p) {
    p = p || {};
    var hasTool = (typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0
                   && typeof ISSUE_MAP !== 'undefined');
    var name = (p.name || 'this official');
    var first = String(name).split(' ')[0] || 'They';

    // No positions chosen yet → a friendly prompt to use the Alignment Tool. This
    // is what most clearly ties the two features together for new visitors.
    if (!hasTool) {
      return '<div class="modal-section">' +
        '<div class="modal-section-title">🤝 How You Compare</div>' +
        '<div class="cmp-empty">' +
          '<p style="font-size:0.82rem;color:#cbd9ec;line-height:1.6;margin:0;">Pick the positions you care about in the <b style="color:#c4b5fd;">Personalized Alignment Tool</b> and this section shows, issue by issue, where you and ' + name + ' agree — and where you part ways.</p>' +
          '<button type="button" class="cmp-empty-cta" onclick="closeModal();setTimeout(function(){if(window.alignTogglePanel)window.alignTogglePanel(true);var el=document.getElementById(\'alignment-panel\')||document.getElementById(\'alignment\');if(el)el.scrollIntoView({behavior:\'smooth\',block:\'start\'});},320);">🎯 Set your alignment</button>' +
        '</div>' +
      '</div>';
    }

    var polMap = _polPositionMap(id, p);
    var documented = [];
    var researching = [];
    _alignIssues.forEach(function(key) {
      var def = ISSUE_MAP[key];
      if (!def) return;
      var intensity = (typeof _alignIntensity !== 'undefined' && _alignIntensity[key]) || 'support';
      if (polMap[key]) documented.push({ key:key, def:def, intensity:intensity, pos:polMap[key] });
      else researching.push({ key:key, def:def, intensity:intensity });
    });

    if (!documented.length && !researching.length) return '';

    documented.forEach(function(r) { r.verdict = _issueVerdict(r.intensity, r.pos.stance); });
    var order = { match:0, partial:1, mismatch:2 };
    documented.sort(function(a, b) { return order[a.verdict] - order[b.verdict]; });

    var nMatch    = documented.filter(function(r){ return r.verdict === 'match'; }).length;
    var nPartial  = documented.filter(function(r){ return r.verdict === 'partial'; }).length;
    var nMismatch = documented.filter(function(r){ return r.verdict === 'mismatch'; }).length;

    // Headline % reuses the existing alignment engine so this read can never drift
    // from the "Personalized Alignment" bar or the card scores. Suppressed entirely
    // when none of the visitor's issues have a documented position to stand on —
    // a precise "% Aligned" with zero comparable positions would be misleading, so
    // the section leads with the honest "no documented position yet" message instead.
    var overall = (documented.length && typeof _calcAlignmentScore === 'function') ? _calcAlignmentScore(id) : null;
    var col = (typeof _alignScoreColor === 'function') ? _alignScoreColor(overall)
              : (overall >= 70 ? '#4ade80' : overall >= 50 ? '#f5c842' : '#f87171');

    var countChip = function(n, kind, label) {
      if (!n) return '';
      return '<span class="cmp-count ' + kind + '">' + n + ' ' + label + '</span>';
    };
    var matchLine = documented.length
      ? 'You line up with ' + first + ' on <b style="color:#4ade80;">' + nMatch + ' of ' + documented.length + '</b> shared issue' + (documented.length > 1 ? 's' : '') + '.'
      : 'None of your selected issues have a documented position for ' + first + ' yet.';

    var summary =
      '<div class="cmp-summary">' +
        (overall !== null
          ? '<div class="cmp-summary-score"><span class="cmp-summary-num" style="color:' + col + ';">' + overall + '%</span><span class="cmp-summary-lab">Aligned</span></div>'
          : '') +
        '<div class="cmp-summary-body">' +
          '<div class="cmp-summary-head">You vs. ' + name + '</div>' +
          '<p style="font-size:0.72rem;color:#9fb4d4;line-height:1.45;margin:0.25rem 0 0;">' + matchLine + '</p>' +
          (documented.length ? '<div class="cmp-counts">' +
            countChip(nMatch, 'cmp-match', 'match' + (nMatch === 1 ? '' : 'es')) +
            countChip(nPartial, 'cmp-partial', 'partial') +
            countChip(nMismatch, 'cmp-mismatch', 'mismatch' + (nMismatch === 1 ? '' : 'es')) +
          '</div>' : '') +
        '</div>' +
      '</div>';

    // Segmented meter + legend: the colored proportion of match / partial /
    // mismatch is the fastest read in the whole section, and the legend spells
    // out exactly what each color (and label) means.
    var meterLegend = '';
    if (documented.length) {
      var pct = function(n) { return (n / documented.length * 100); };
      var seg = function(n, kind) { return n ? '<div class="cmp-meter-seg ' + kind + '" style="width:' + pct(n) + '%;"></div>' : ''; };
      meterLegend =
        '<div class="cmp-meter">' +
          seg(nMatch, 'cmp-match') + seg(nPartial, 'cmp-partial') + seg(nMismatch, 'cmp-mismatch') +
        '</div>' +
        '<div class="cmp-legend">' +
          '<span class="cmp-legend-item"><span class="cmp-legend-dot cmp-match"></span><b>Match</b>&nbsp;— you agree</span>' +
          '<span class="cmp-legend-item"><span class="cmp-legend-dot cmp-partial"></span><b>Partial</b>&nbsp;— mixed record</span>' +
          '<span class="cmp-legend-item"><span class="cmp-legend-dot cmp-mismatch"></span><b>Mismatch</b>&nbsp;— you differ</span>' +
        '</div>';
    }

    var rows = documented.map(function(r) {
      var m = _CMP_VERDICT_META[r.verdict];
      var icon = (r.def.label || '').split(' ')[0] || '🎯';
      var labelText = (r.def.label || '').split(' ').slice(1).join(' ') || r.def.label;
      var youM = _userIntensityMeta(r.intensity);
      var polM = _polStanceMeta(r.pos.stance);
      // The politician's own one-line stance, surfaced right in the comparison so
      // the reader sees WHY it's a match without scrolling to Key Issue Stances.
      var note = r.pos.text
        ? '<p class="cmp-issue-note"><b>' + first + ':</b> ' + r.pos.text + '</p>'
        : '';
      // Direct video proof for this issue + its People's Mandate tie, so the
      // comparison row carries the same evidence cues as Stance at a Glance.
      var _cmpVid = (typeof window._pdxIssueVideo === 'function') ? window._pdxIssueVideo(id, p, r.key) : null;
      var _cmpEye = (_cmpVid && typeof window._pdxVideoEye === 'function') ? window._pdxVideoEye(_cmpVid, { cls: 'sag-eye' }) : '';
      var _cmpMandate = (r.key && typeof window._pdxMandateChip === 'function') ? window._pdxMandateChip(r.key, { compact: true }) : '';
      return '<div class="cmp-issue ' + m.cls + '">' +
        '<div class="cmp-issue-top">' +
          '<span class="cmp-issue-name">' + icon + ' ' + labelText + '</span>' +
          _cmpEye +
          '<span class="cmp-verdict ' + m.cls + '">' + m.ico + ' ' + m.full + '</span>' +
        '</div>' +
        (_cmpMandate ? '<div style="margin:0.1rem 0 0.3rem;">' + _cmpMandate + '</div>' : '') +
        '<div class="cmp-vs">' +
          '<div class="cmp-side cmp-side-you">' +
            '<span class="cmp-side-h">You picked</span>' +
            '<span class="cmp-chip ' + youM.cls + '">' + youM.icon + ' ' + youM.label + '</span>' +
            '<span class="cmp-sub">' + youM.sub + '</span>' +
          '</div>' +
          '<div class="cmp-vs-link ' + m.cls + '" title="' + m.full + '">' + m.link + '</div>' +
          '<div class="cmp-side cmp-side-pol">' +
            '<span class="cmp-side-h">' + first + '</span>' +
            '<span class="cmp-chip ' + polM.cls + '">' + polM.icon + ' ' + polM.label + '</span>' +
            '<span class="cmp-sub">' + polM.sub + '</span>' +
          '</div>' +
        '</div>' +
        note +
      '</div>';
    }).join('');

    // Honest read for the limited-data case: the visitor has picks but none of
    // them line up with a documented position yet (common for new officials and
    // 2026 candidates). Rather than a blank-looking section, explain what's
    // happening and point back to the stated positions that ARE on record.
    var limitedNote = '';
    if (!documented.length) {
      limitedNote =
        '<div class="cmp-limited">' +
          '<span class="cmp-limited-ico" aria-hidden="true">🌱</span>' +
          '<p class="cmp-limited-text">This is expected for a new or 2026 candidate — ' + first + ' doesn\'t have a documented position on your specific issues <em>yet</em>. As statements and votes are verified, each one is matched here automatically. In the meantime, the <strong>Candidate Snapshot</strong> above shows the positions ' + first + ' <em>has</em> stated, so you can still get a read.</p>' +
        '</div>';
    }

    // Selected issues we can't yet compare → listed compactly so it's clear the
    // structure is ready and only the data is still being filled in.
    var researchingBlock = '';
    if (researching.length) {
      var pills = researching.map(function(r) {
        return '<span class="cmp-research-pill">' + r.def.label + '</span>';
      }).join('');
      researchingBlock =
        '<div style="margin-top:0.7rem;">' +
          '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.6rem;letter-spacing:0.08em;text-transform:uppercase;color:#7596c0;">' + researching.length + ' more of your issue' + (researching.length > 1 ? 's' : '') + ' — position being documented</div>' +
          '<div class="cmp-researching">' + pills + '</div>' +
        '</div>';
    }

    return '<div class="modal-section" id="cs-howcompare-anchor">' +
      '<div class="modal-section-title">🤝 How You Compare</div>' +
      '<p class="modal-section-sub">Your saved Alignment Tool picks, matched issue by issue against ' + first + '\'s documented positions.</p>' +
      summary +
      meterLegend +
      limitedNote +
      rows +
      researchingBlock +
      '<p class="src-note">Your saved Alignment Tool positions matched against ' + name + '\'s documented stances. Sign in to save your picks across devices — the comparison updates as more positions are verified.</p>' +
    '</div>';
  };

  // ══════════════════════════════════════════════════════════════════════
  // Stance-at-a-Glance rendering helpers (moved from index.html)
  // The final stance-driven rendering family: the whole-card → Evidence
  // Locker bridges, the camera-eye video-evidence indicator, the Full Stance
  // Record links, and the People's Mandate chip. Pure extraction — the
  // function bodies are unchanged. A few tiny, static internals they relied on
  // in the inline script (the eye SVG, the escapers, the js-id escaper) are
  // duplicated here as private helpers so the moved functions stay
  // self-contained; the originals remain in index.html for the sibling
  // helpers there that still use them.
  // ══════════════════════════════════════════════════════════════════════

  // Bridge an Issue Position card to the Evidence Locker, keyed off the
  // stance's own issueKey. Defers to the shared chip builder in index.html
  // (exposed as window._pdxEvChip) so the connected-evidence cue reads the same
  // everywhere.
  window._pdxStanceEvidenceLink = function(id, p, s) {
    try {
      if (!s || !s.issueKey || typeof window._pdxIsUtahStateLegislator !== 'function' || !window._pdxIsUtahStateLegislator(p)) return '';
      if (typeof window._issueEvidenceMap !== 'function') return '';
      var map = window._issueEvidenceMap(id, p) || {};
      if (!map[s.issueKey]) return '';
      return (typeof window._pdxEvChip === 'function') ? window._pdxEvChip(id, map[s.issueKey], 'stance') : '';
    } catch (e) { return ''; }
  };

  // Whole-card → Evidence Locker bridge for a documented stance. A Key Issue
  // Stance card is the clickable surface (it carries role="button"), so tapping
  // anywhere on it opens the Locker filtered to this politician + issue — the
  // same drill-in the Locker's own stance rows offer. Taps that land on an inner
  // control (source link, video eye, vote buttons, the connected-evidence chip)
  // keep their own behavior; the guard below simply defers to them. pol + issue
  // ride on data attributes so the raw, unsanitized id reaches the Locker filter.
  window._pdxStanceCardOpen = function (el, ev) {
    try {
      if (!el) return;
      if (ev && ev.target && ev.target !== el) {
        var inner = ev.target.closest && ev.target.closest('a,button,input,select,textarea,label');
        if (inner && inner !== el) return;   // let the inner control act
      }
      var pol = el.getAttribute('data-ev-pol');
      var iss = el.getAttribute('data-ev-issue');
      if (pol && typeof window._pdxOpenEvidenceLocker === 'function') {
        window._pdxOpenEvidenceLocker({ pol: pol, issue: iss || '' });
      }
    } catch (e) {}
  };

  // ── Camera-eye · video-evidence indicator ─────────────────────────────────
  // Private internals duplicated from index.html so _pdxVideoEye is
  // self-contained here. Inline SVG: a video camera outline with an eye looking
  // out of the lens — reads instantly as "video evidence available, tap to
  // watch". Uses currentColor so the gold theme + glow come from the .pdx-eye CSS.
  var _PDX_EYE_SVG =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">' +
      '<rect x="2" y="7" width="20" height="13" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
      '<path d="M8.2 7 L9.5 4.6 L14.5 4.6 L15.8 7 Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<circle cx="12" cy="13.6" r="4.7" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
      '<path d="M8.6 13.6 C10 11.9 14 11.9 15.4 13.6 C14 15.3 10 15.3 8.6 13.6 Z" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/>' +
      '<circle cx="12" cy="13.6" r="1.55" fill="currentColor"/>' +
      '<circle cx="18.4" cy="9.6" r="0.95" fill="currentColor"/>' +
    '</svg>';

  function _pdxEyeEsc(s) {
    if (typeof window._slEsc === 'function') return window._slEsc(s);
    return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[c];
    });
  }

  // Resolve a single spotlight/evidence item to a watchable video link, or null.
  // Floor-video records keep the medium + timestamp on `media` but the URL on
  // `source.url`; committee/other clips carry it on `media.url`. Recovers either.
  window._pdxItemVideo = function(it) {
    if (!it) return null;
    var m = it.media || null;
    var st = String(it.sourceType || '');
    var isVideo = (m && m.type === 'video') ||
      st === 'official_floor_video' || st === 'official_committee_video' || /video/.test(st);
    if (!isVideo) return null;
    var url = (m && m.url) ? m.url : (it.source && it.source.url ? it.source.url : '');
    if (!url) return null;
    var kind = (typeof window._slVideoKindWord === 'function') ? String(window._slVideoKindWord(m) || '').trim() : '';
    return { url: url, timestamp: (m && m.timestamp) || '', kind: kind };
  };

  // Best video tied to one issue (for a Promise or Issue Position), or null.
  // Supporting (positive-impact) items and ones with a pinpoint timestamp win,
  // so the cue leads with the strongest, most precise clip.
  window._pdxIssueVideo = function(id, p, issueKey) {
    try {
      if (!issueKey || typeof window._issueEvidenceMap !== 'function') return null;
      var e = (window._issueEvidenceMap(id, p) || {})[issueKey];
      if (!e || !Array.isArray(e.spotlight)) return null;
      var best = null, bestScore = -1;
      e.spotlight.forEach(function(s) {
        var v = window._pdxItemVideo(s);
        if (!v) return;
        var score = (s.impact === 'positive' ? 2 : 1) + (v.timestamp ? 1 : 0);
        if (score > bestScore) { bestScore = score; best = v; }
      });
      return best;
    } catch (e) { return null; }
  };

  // Render the eye for a resolved video link, or '' when there is none.
  //   opts.asSpan — render a <span role="link"> (for use inside a <button>, where
  //                 a nested <a> would be invalid); it opens the video on tap.
  //   opts.stop   — false to drop stopPropagation (default keeps it, so the icon
  //                 never also triggers the card it sits on).
  //   opts.cls    — extra class (e.g. 'sag-eye' for the tighter glance size).
  window._pdxVideoEye = function(video, opts) {
    if (!video || !video.url) return '';
    opts = opts || {};
    var url = _pdxEyeEsc(video.url);
    var tip = 'Watch video evidence' + (video.timestamp ? ' — jumps to ' + _pdxEyeEsc(video.timestamp) : '');
    var cls = 'pdx-eye' + (opts.cls ? ' ' + opts.cls : '');
    var inner = _PDX_EYE_SVG + '<span class="pdx-eye-sr">Video proof available</span>';
    // Open the clip in the in-app player (inline, mobile-friendly), passing the
    // timestamp so the header shows it even before the stream resolves. The
    // raw archive URL stays on the <a href> as a right-click / no-JS fallback.
    var jsUrl = String(video.url).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    var jsTs = String(video.timestamp || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    var open = 'event.stopPropagation();event.preventDefault();window._pdxOpenVideo(\'' + jsUrl + '\',{timestamp:\'' + jsTs + '\'});';
    if (opts.asSpan) {
      return '<span class="' + cls + '" role="link" tabindex="0" title="' + tip + '" aria-label="' + tip +
        '" onclick="' + open + '" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){' + open + '}">' + inner + '</span>';
    }
    var stop = (opts.stop === false) ? '' : 'event.stopPropagation();';
    return '<a href="' + url + '" target="_blank" rel="noopener" onclick="' + stop + '" class="' + cls +
      '" title="' + tip + '" aria-label="' + tip + '">' + inner + '</a>';
  };

  // ── View Full Stance Record ──────────────────────────────────────────
  // The compact stat shown inside the CTA: how many issues the record tracks and
  // how many of those carry real evidence. Drawn from the same cached maps the
  // destination uses, so the promise on the button matches what opens.
  function _pdxStanceRecordStats(id, p) {
    p = p || {};
    var stanceList = (typeof window._resolveStanceList === 'function') ? (window._resolveStanceList(id, p) || []) : [];
    var documented = stanceList.filter(function (s) { return s && s.topic; });
    var evMap = (typeof window._issueEvidenceMap === 'function') ? (window._issueEvidenceMap(id, p) || {}) : {};
    var depth = (typeof window._pdxEvidenceDepthForPerson === 'function') ? window._pdxEvidenceDepthForPerson(id) : null;
    var issueSet = Object.create(null);
    documented.forEach(function (s) { if (s.issueKey) issueSet[s.issueKey] = 1; });
    Object.keys(evMap).forEach(function (k) { issueSet[k] = 1; });
    if (depth) Object.keys(depth).forEach(function (k) { issueSet[k] = 1; });
    var tracked = documented.length || (p.keyIssues ? p.keyIssues.length : 0) || Object.keys(issueSet).length;
    // Issues that appear in the full record but have no documented stance card —
    // the honest "gaps" surfaced only in the Full Stance Record overlay.
    var docKeys = Object.create(null);
    documented.forEach(function (s) { if (s.issueKey) docKeys[s.issueKey] = 1; });
    var withEv = 0, gaps = 0;
    Object.keys(issueSet).forEach(function (k) {
      var e = evMap[k];
      var connected = e && ((e.promises && e.promises.length) || (e.spotlight && e.spotlight.length));
      var rec = depth && depth[k] && depth[k].count;
      if (connected || rec) withEv++;
      if (!docKeys[k]) gaps++;
    });
    return { tracked: tracked, withEvidence: withEv, gaps: gaps };
  }
  window._pdxStanceRecordStats = _pdxStanceRecordStats;

  // js-id escaper (duplicated internal) — makes a raw politician id safe to embed
  // inside a single-quoted inline handler string.
  function _pdxEvJsId(pid) {
    return String(pid == null ? '' : pid).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  // Secondary, quieter jump to the same Full Stance Record overlay, sized to sit
  // inside the "Key Issue Stances" header so a reader already looking at stances
  // can expand to the complete per-issue record (gaps included) without scrolling
  // back up. Same cached sources as the primary CTA — no new network cost.
  window._pdxStanceRecordMiniLink = function (id, p) {
    try {
      p = p || {};
      var s = _pdxStanceRecordStats(id, p);
      var jsId = _pdxEvJsId(id);
      var label = s.tracked
        ? ('See all ' + s.tracked + ' issues + gaps')
        : 'See every issue + gaps';
      return '<button type="button" class="pdx-fsr-mini" ' +
        'onclick="event.stopPropagation();window._pdxOpenStanceRecord&&window._pdxOpenStanceRecord(\'' + jsId + '\');" ' +
        'aria-label="Open the full stance record — every issue, its evidence, and what is still missing">' +
        label + ' <span aria-hidden="true">→</span></button>';
    } catch (e) { return ''; }
  };

  // HTML escaper for the mandate chip (duplicated internal, renamed from the
  // inline script's local `esc` to avoid a generic module-scope name).
  function _pdxMandateEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }

  // The "📜 People's Mandate" chip shown on a stance/evidence surface whose
  // issueKey is part of the Mandate. Rendered as a role=link span so it is
  // valid inside the <button> rows that Stance at a Glance and the Locker use,
  // and it never triggers the row it sits on. Returns '' when the issue isn't
  // tied to any reform, so callers can drop it in unconditionally.
  window._pdxMandateChip = function (issueKey, opts) {
    opts = opts || {};
    var items = window._pdxMandateForIssue(issueKey);
    if (!items.length) return '';
    var primary = items[0];
    var more = items.length - 1;
    var jsKey = String(issueKey).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    var label = primary.name + (more > 0 ? ' +' + more + ' more' : '');
    var tip = 'Part of The People’s Mandate — citizens are voting on this reform. Tap to see it.';
    var cls = 'pdx-mandate-chip' + (opts.compact ? ' is-compact' : '') + (opts.cls ? ' ' + opts.cls : '');
    var open = "event.stopPropagation();event.preventDefault();window._pdxMandateFocus&&window._pdxMandateFocus('" + jsKey + "');";
    return '<span class="' + cls + '" role="link" tabindex="0" title="' + _pdxMandateEsc(tip) + '" aria-label="People’s Mandate reform: ' + _pdxMandateEsc(label) +
      '" onclick="' + open + '" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){' + open + '}">' +
      '<span class="pdx-mandate-chip-ico" aria-hidden="true">📜</span>' +
      '<span class="pdx-mandate-chip-txt">People’s Mandate: ' + _pdxMandateEsc(label) + '</span></span>';
  };

})();
