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
      dmccay:'daniel_mccay', mmckell:'mike_mckell'
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

})();
