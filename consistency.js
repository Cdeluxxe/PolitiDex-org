/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Promise Tracker consistency engine  ·  window.PDXConsistency
   ────────────────────────────────────────────────────────────────────────────
   LOCKED PRODUCT MODEL (do NOT add a blended third percentage):

   "Promise Tracker" is a SECTION / GATEWAY name only — no percentage is attached
   to the name itself. Inside it live TWO clearly separated systems that answer
   two different questions and never merge into one score:

     1. OFFICIAL RECORD  (scope: 'official')
        • Hard, institutional, vote / formal-action based percentage.
        • Core question: "When they had to vote, did they stand by what they said?"
        • Built from votes + formal legislative actions (the vr_* voting engine)
          checked against the member's stated stances.
        • Organized by affected issue categories on the profile.
        • HONEST EMPTY STATE: "No qualifying votes on record yet" — never a false 0%.

     2. SAY-VS-DO  (scope: 'saydo')
        • Broader public-integrity layer.
        • Core question: "Does the full public picture match what they claim?"
        • Built from the wider public record — interviews, statements, news,
          controversies, social posts and other verified NON-legislative evidence.
        • Verdict + receipts led; NOT forced into a hard competing percentage
          (score is intentionally null on this scope).

     Real, discrete PROMISES ("I will / I will not" pledges) are their OWN narrower
     system and are NOT blended into either percentage. This engine never scores them.

   THE DATA BOUNDARY (being drawn — see curatedFor / isSaydoReceipt):
     A formal vote or legislative action belongs to OFFICIAL RECORD; broader
     public-record items belong to SAY-VS-DO; one real-world event is never scored
     on both sides. The curated receipts today still contain legislative ('voting')
     and 'promise' items — those are EXCLUDED from the Say-vs-Do scope here so the
     vote isn't double-counted (it is already represented by the voting engine) and
     promises stay in their own system.

   HOW TO READ THIS FILE:
     • officialRecord(pid, issue|overall) → the institutional %, votes only.
     • sayVsDo(pid, issue|overall)        → the public-integrity verdict, receipts only.
     • issueVerdict / overallVerdict      → the pre-existing COMBINED read, kept intact
       for surfaces already wired to it (additive, non-breaking). New surfaces should
       prefer the two scoped reads above.
     All three share ONE vocabulary (VERDICTS) and ONE set of renderers, so the two
     systems look like one coherent product while answering different questions.

   Reads (all optional / guarded — load order never matters):
     window._pdxRecordIssueSummary(pid, issueKey)  → voting-record summary | null
     window.PDXReceipts.collect()                  → curated receipts (verdict.key, category)
     window._polPositionMap(pid, CMP_DATA[pid])    → { issueKey → { stance } }  (one shared stance source)
     window.PDXVotingRecord.{memberRecords,fetchMember,noteMember}
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXConsistency) return; // idempotent

  // ── The single, canonical vocabulary ───────────────────────────────────────
  // Every surface renders from THIS map, so the language/icons/colours are
  // identical on the profile, alignment cards, Issue Comparison, receipts and the
  // comparison board. Colours match the app's existing consistency palette so the
  // unified signal looks native everywhere it lands.
  var FRAME = { icon: '⚖️', label: 'Say-vs-Do', question: 'Do their actions match their words?' };
  var VERDICTS = {
    consistent:  { key: 'consistent',  ico: '✓', label: 'Backs it up',                 short: 'Their record backs up what they say.',                              tone: 'good',  color: '#6ee7a0', cls: 'consistent' },
    contradicts: { key: 'contradicts', ico: '⚠', label: 'Says one thing, does another', short: 'Their record runs against what they say.',                           tone: 'bad',   color: '#f89b9b', cls: 'contradicts' },
    mixed:       { key: 'mixed',       ico: '◑', label: 'Mixed record',                short: 'Their record cuts both ways on this.',                              tone: 'warn',  color: '#93c5fd', cls: 'mixed' },
    flag:        { key: 'flag',        ico: '⚑', label: 'Red flag on record',          short: 'A documented red flag on their record.',                            tone: 'bad',   color: '#f89b9b', cls: 'flag' },
    limited:     { key: 'limited',     ico: '…', label: 'Limited record',              short: 'They\'ve stated a position, but there isn\'t enough record to check it yet.', tone: 'muted', color: '#9fb4d4', cls: 'limited' },
    no_record:   { key: 'no_record',   ico: '—', label: 'No record yet',               short: 'No record to check against yet.',                                   tone: 'muted', color: '#9fb4d4', cls: 'none' },
    no_stance:   { key: 'no_stance',   ico: '—', label: 'No stated stance',            short: 'No stated position to check against.',                              tone: 'muted', color: '#9fb4d4', cls: 'none' },
    pending:     { key: 'pending',     ico: '⏳', label: 'Checking record…',            short: 'Checking their voting record…',                                     tone: 'muted', color: '#9fb4d4', cls: 'pending' }
  };
  // token → coarse bucket used by the overall roll-up.
  function bucketOf(t) {
    if (t === 'consistent') return 'consistent';
    if (t === 'contradicts') return 'contradicts';
    if (t === 'mixed') return 'mixed';
    if (t === 'flag') return 'flag';
    if (t === 'pending') return 'pending';
    if (t === 'limited') return 'limited';
    return 'none';
  }

  // ── The two scoped systems inside the Promise Tracker gateway ───────────────
  // Each carries its own name, icon and CORE QUESTION (printed verbatim in the UI),
  // plus scope-specific copy for the muted / empty states so an Official Record with
  // no votes reads "No qualifying votes on record yet" (never a false 0%), while a
  // Say-vs-Do with nothing surfaced reads differently and honestly.
  var SCOPES = {
    official: {
      key: 'official', icon: '🏛️', label: 'Official Record',
      question: 'When they had to vote, did they stand by what they said?',
      blurb: 'The hard, institutional score — their votes and formal legislative actions checked against what they say they stand for.',
      empty: { no_record: 'No qualifying votes on record yet', no_stance: 'No stated stance to check', limited: 'Limited voting record' }
    },
    saydo: {
      key: 'saydo', icon: '🧾', label: 'Say-vs-Do',
      question: 'Does the full public picture match what they claim?',
      blurb: 'The broader public-integrity picture — interviews, statements, news, controversies and other verified public evidence, sourced and receipt-led.',
      empty: { no_record: 'Nothing on the public record yet', no_stance: 'No stated stance to check', limited: 'Limited public record' }
    },
    combined: {
      key: 'combined', icon: '⚖️', label: 'Say-vs-Do',
      question: 'Do their actions match their words?',
      blurb: '',
      empty: { no_record: 'No record yet', no_stance: 'No stated stance', limited: 'Limited record' }
    }
  };

  // Categories of curated receipt that DO NOT belong to the Say-vs-Do scope:
  //   'voting'  → a formal vote/action; belongs to Official Record (the vr_* engine
  //               already represents it — counting it here too would double-count).
  //   'promise' → a discrete pledge; belongs to the separate Promises system.
  var SAYDO_EXCLUDE = { voting: 1, promise: 1 };
  function isSaydoReceipt(r) {
    if (!r) return false;
    return !SAYDO_EXCLUDE[String(r.category || '').toLowerCase()];
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(id) { return String(id == null ? '' : id).trim().toLowerCase(); }

  // ── source readers (guarded; each returns a neutral empty when unavailable) ──
  function recordSummary(pid, issueKey) {
    try { return (typeof window._pdxRecordIssueSummary === 'function') ? window._pdxRecordIssueSummary(pid, issueKey) : null; }
    catch (e) { return null; }
  }
  function recordsWarm(pid) {
    try { return !!(window.PDXVotingRecord && typeof window.PDXVotingRecord.memberRecords === 'function' && window.PDXVotingRecord.memberRecords(pid)); }
    catch (e) { return false; }
  }
  function positionStance(pid, issueKey) {
    try {
      if (typeof window._polPositionMap !== 'function' || !window.CMP_DATA) return null;
      var pm = window._polPositionMap(pid, window.CMP_DATA[pid]) || {};
      return pm[issueKey] ? pm[issueKey].stance : null;
    } catch (e) { return null; }
  }
  function samePol(a, b) {
    if (a === b) return true;
    return norm(a) === norm(b);
  }
  // Curated receipts for exactly this politician + issue, tallied by verdict kind.
  // The DATA BOUNDARY lives here: by default only Say-vs-Do-eligible receipts are
  // counted (formal 'voting' items and discrete 'promise' items are excluded, so a
  // vote is never scored on both sides). Pass { all: true } for the raw tally.
  function curatedFor(pid, issueKey, opts) {
    opts = opts || {};
    var res = { consistent: 0, contradicts: 0, flag: 0, total: 0, items: [], excludedVoting: 0 };
    try {
      var R = window.PDXReceipts;
      if (!R || typeof R.collect !== 'function' || !issueKey) return res;
      var all = R.collect() || [];
      for (var i = 0; i < all.length; i++) {
        var r = all[i];
        if (!r || r.issueKey !== issueKey || !samePol(r.pid, pid)) continue;
        if (!opts.all && !isSaydoReceipt(r)) {
          if (String(r.category || '').toLowerCase() === 'voting') res.excludedVoting++;
          continue; // belongs to Official Record / Promises, not Say-vs-Do
        }
        var k = r.verdict && r.verdict.key;
        if (k === 'contradicts') res.contradicts++;
        else if (k === 'consistent') res.consistent++;
        else if (k === 'flag') res.flag++;
        res.items.push(r); res.total++;
      }
    } catch (e) {}
    return res;
  }

  // Honest 0–100 score from the voting record only (null when nothing is judged).
  // Curated contradictions can't produce a number (they aren't scored), but they DO
  // pull the verdict token toward "contradicts" below — so the token stays honest
  // even when the number is null.
  function scoreFromRecord(rec) {
    if (!rec) return null;
    var judged = (rec.consistent || 0) + (rec.contradicts || 0);
    if (!judged) return null;
    return Math.round(100 * (rec.consistent || 0) / judged);
  }

  // ── the core reconciler: ONE verdict for (pid, issueKey) ────────────────────
  function issueVerdict(pid, issueKey) {
    var rec = recordSummary(pid, issueKey);           // voting engine (null = none warm)
    var cur = curatedFor(pid, issueKey);              // curated receipts
    var warm = recordsWarm(pid);
    var stance = positionStance(pid, issueKey);
    var hasStance = !!stance || (rec && rec.netVerdict && rec.netVerdict !== 'no_stance' && rec.netVerdict !== 'no_record') || cur.total > 0;

    var recCon = !!(rec && rec.netVerdict === 'contradicts');
    var recConsist = !!(rec && rec.netVerdict === 'consistent');
    var recMixed = !!(rec && rec.netVerdict === 'mixed');

    var hasContra = recCon || cur.contradicts > 0;
    var hasConsist = recConsist || cur.consistent > 0;

    var token, pending = false;
    var hasAnySignal = !!(rec && rec.total) || cur.total > 0;

    if (!hasAnySignal) {
      // Nothing to judge yet. If the votes simply aren't loaded, say "checking"
      // (and warm them); otherwise it's an honest "no record" / "no stance".
      if (!warm && hasStance) { pending = true; token = 'pending'; queueWarm(pid); }
      else token = hasStance ? 'no_record' : 'no_stance';
    } else if (hasContra && hasConsist) {
      token = 'mixed';                                 // both directions documented
    } else if (hasContra) {
      token = 'contradicts';
    } else if (hasConsist) {
      token = 'consistent';
    } else if (recMixed) {
      token = 'mixed';
    } else if (cur.flag > 0) {
      token = 'flag';                                  // documented negative, not a say-vs-do contradiction
    } else if (rec && rec.total) {
      token = 'limited';                               // has votes but no clear direction (present/not-voting)
    } else {
      token = hasStance ? 'limited' : 'no_record';
    }

    var contradictions = (rec ? (rec.contradicts || 0) : 0) + cur.contradicts;
    var sources = [];
    if (rec && rec.total) sources.push('record');
    if (cur.total) sources.push('receipts');

    return {
      token: token,
      verdict: VERDICTS[token],
      score: scoreFromRecord(rec),
      record: rec,
      curated: cur,
      contradictions: contradictions,
      flags: cur.flag,
      hasStance: hasStance,
      pending: pending,
      sources: sources
    };
  }

  // ── scope-aware copy ────────────────────────────────────────────────────────
  // Apply a scope's own wording to the muted/empty states (Official Record →
  // "No qualifying votes on record yet", etc.) WITHOUT forking the shared vocabulary
  // — same icon/colour/token, scope-honest label.
  function scopeVerdict(scope, token) {
    var base = VERDICTS[token] || VERDICTS.no_record;
    var sc = SCOPES[scope] || SCOPES.combined;
    var over = sc.empty && sc.empty[token];
    if (!over) return base;
    return { key: base.key, ico: base.ico, label: over, short: base.short, tone: base.tone, color: base.color, cls: base.cls };
  }

  // ── OFFICIAL RECORD (scope 'official') — votes + formal actions ONLY ─────────
  // The institutional "when it counted" answer: a real % or an honest null, never a
  // fabricated 0. Reads the voting engine only; curated receipts never enter here.
  function officialIssue(pid, issueKey) {
    var rec = recordSummary(pid, issueKey);
    var warm = recordsWarm(pid);
    var stance = positionStance(pid, issueKey);
    var hasStance = !!stance || (rec && rec.netVerdict && rec.netVerdict !== 'no_stance' && rec.netVerdict !== 'no_record');
    var token, pending = false;
    if (!(rec && rec.total)) {
      if (!warm && hasStance) { pending = true; token = 'pending'; queueWarm(pid); }
      else token = hasStance ? 'no_record' : 'no_stance';
    } else if (rec.netVerdict === 'contradicts') token = 'contradicts';
    else if (rec.netVerdict === 'consistent') token = 'consistent';
    else if (rec.netVerdict === 'mixed') token = 'mixed';
    else token = 'limited';   // has votes but no clear direction (present / not voting)
    return {
      scope: 'official', token: token, verdict: scopeVerdict('official', token),
      score: scoreFromRecord(rec), record: rec, curated: null,
      contradictions: rec ? (rec.contradicts || 0) : 0, flags: 0,
      hasStance: hasStance, pending: pending, sources: (rec && rec.total) ? ['record'] : []
    };
  }

  // ── SAY-VS-DO (scope 'saydo') — broader public record ONLY ──────────────────
  // Verdict + receipts led; score is intentionally null so it never competes with
  // the Official Record %. Reads Say-vs-Do-eligible curated receipts only (formal
  // 'voting' and discrete 'promise' items are excluded by curatedFor's boundary).
  function saydoIssue(pid, issueKey) {
    var cur = curatedFor(pid, issueKey);
    var stance = positionStance(pid, issueKey);
    var hasStance = !!stance || cur.total > 0;
    var token;
    if (cur.total === 0) token = hasStance ? 'no_record' : 'no_stance';
    else if (cur.contradicts > 0 && cur.consistent > 0) token = 'mixed';
    else if (cur.contradicts > 0) token = 'contradicts';
    else if (cur.consistent > 0) token = 'consistent';
    else if (cur.flag > 0) token = 'flag';
    else token = 'no_record';
    return {
      scope: 'saydo', token: token, verdict: scopeVerdict('saydo', token),
      score: null, record: null, curated: cur,
      contradictions: cur.contradicts, flags: cur.flag,
      hasStance: hasStance, pending: false, sources: cur.total ? ['receipts'] : []
    };
  }

  // Every issue we have ANY signal on for this politician (stance, receipt, or a
  // warm vote), for the given scope. `scope` controls which sources count so the
  // official / saydo roll-ups never pull in the other side's issues.
  function issuesWithSignal(pid, scope) {
    scope = scope || 'combined';
    var set = {};
    // stated stances (the one shared source of truth) count for every scope.
    try {
      if (typeof window._polPositionMap === 'function' && window.CMP_DATA) {
        var pm = window._polPositionMap(pid, window.CMP_DATA[pid]) || {};
        Object.keys(pm).forEach(function (k) { set[k] = 1; });
      }
    } catch (e) {}
    // curated public-record receipts (Say-vs-Do-eligible only) — saydo + combined.
    if (scope !== 'official') {
      try {
        var R = window.PDXReceipts;
        if (R && typeof R.collect === 'function') {
          (R.collect() || []).forEach(function (r) { if (r && r.issueKey && samePol(r.pid, pid) && isSaydoReceipt(r)) set[r.issueKey] = 1; });
        }
      } catch (e) {}
    }
    // warm votes — official + combined.
    if (scope !== 'saydo') {
      try {
        var recs = (window.PDXVotingRecord && typeof window.PDXVotingRecord.memberRecords === 'function') ? window.PDXVotingRecord.memberRecords(pid) : null;
        if (recs) recs.forEach(function (it) { (it.issues || []).forEach(function (m) { if (m && m.issueKey) set[m.issueKey] = 1; }); });
      } catch (e) {}
    }
    return Object.keys(set);
  }

  // ── the overall roll-up: ONE verdict per politician, per scope ──────────────
  function scopedOverall(scope, pid, issueKeys) {
    var per = scope === 'official' ? officialIssue : scope === 'saydo' ? saydoIssue : issueVerdict;
    var keys = (issueKeys && issueKeys.length) ? issueKeys : issuesWithSignal(pid, scope);
    var counts = { consistent: 0, contradicts: 0, mixed: 0, flag: 0, limited: 0, none: 0, pending: 0 };
    var scoreSum = 0, scoreN = 0, contradictions = 0, anyPending = false;
    keys.forEach(function (k) {
      var v = per(pid, k);
      counts[bucketOf(v.token)]++;
      contradictions += v.contradictions || 0;
      if (v.pending) anyPending = true;
      if (typeof v.score === 'number') { scoreSum += v.score; scoreN++; }
    });
    var token;
    if (counts.contradicts > 0 && counts.consistent > 0) token = 'mixed';
    else if (counts.contradicts > 0) token = 'contradicts';
    else if (counts.consistent > 0) token = 'consistent';
    else if (counts.mixed > 0) token = 'mixed';
    else if (counts.flag > 0) token = 'flag';
    else if (counts.limited > 0) token = 'limited';
    else if (anyPending) token = 'pending';
    else token = 'no_record';
    return {
      scope: scope, token: token, verdict: scopeVerdict(scope, token),
      // Say-vs-Do never carries a competing % (verdict + receipts only).
      score: (scope === 'saydo') ? null : (scoreN ? Math.round(scoreSum / scoreN) : null),
      counts: counts, contradictions: contradictions,
      pending: anyPending, rated: scoreN, issues: keys.length
    };
  }
  // Pre-existing COMBINED roll-up — kept intact for surfaces already wired to it.
  function overallVerdict(pid, issueKeys) { return scopedOverall('combined', pid, issueKeys); }

  // ── warm the voting record (once) so pending verdicts resolve ───────────────
  // Mirrors the Alignment Tool's warm queue: debounced, one attempt per member,
  // and fires a 'pdx-consistency-warm' event so any surface can re-render.
  var _tried = {}, _queue = [], _timer = null;
  function queueWarm(pid) {
    if (!pid || _tried[pid]) return;
    if (!(window.PDXVotingRecord && typeof window.PDXVotingRecord.fetchMember === 'function')) return;
    _tried[pid] = true; _queue.push(pid);
    if (!_timer) _timer = setTimeout(flushWarm, 150);
  }
  function flushWarm() {
    _timer = null;
    var batch = _queue.splice(0, _queue.length);
    batch.forEach(function (pid) {
      try {
        window.PDXVotingRecord.fetchMember(pid, { pageSize: 100 }).then(function (data) {
          if (data && data.items && data.items.length && typeof window.PDXVotingRecord.noteMember === 'function') {
            window.PDXVotingRecord.noteMember(pid, data.items);
          }
          try { window.dispatchEvent(new CustomEvent('pdx-consistency-warm', { detail: { pid: pid } })); } catch (e) {}
        }).catch(function () {});
      } catch (e) {}
    });
  }

  // ── shared renderers — the SAME chip/dot/legend everywhere ──────────────────
  function ensureStyles() {
    if (document.getElementById('pdx-consistency-css')) return;
    var css =
      '.pdxc-chip{display:inline-flex;align-items:center;gap:0.28rem;font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.66rem;letter-spacing:0.02em;line-height:1.2;padding:0.14rem 0.5rem;border-radius:999px;white-space:nowrap;border:1px solid rgba(255,255,255,0.1);background:rgba(10,15,30,0.55);}' +
      '.pdxc-chip .pdxc-frame{opacity:0.8;font-weight:700;}' +
      '.pdxc-chip .pdxc-flag{margin-left:0.15rem;font-weight:800;}' +
      '.pdxc-consistent{color:#6ee7a0;border-color:rgba(74,222,128,.38);background:rgba(74,222,128,.12);}' +
      '.pdxc-contradicts{color:#f89b9b;border-color:rgba(248,113,113,.42);background:rgba(248,113,113,.12);}' +
      '.pdxc-mixed{color:#93c5fd;border-color:rgba(147,197,253,.4);background:rgba(147,197,253,.12);}' +
      '.pdxc-flag{color:#f89b9b;border-color:rgba(248,113,113,.4);background:rgba(248,113,113,.1);}' +
      '.pdxc-limited,.pdxc-none{color:#9fb4d4;border-color:rgba(159,180,212,.28);background:rgba(159,180,212,.08);}' +
      '.pdxc-pending{color:#9fb4d4;border-color:rgba(159,180,212,.28);background:rgba(159,180,212,.08);}' +
      '.pdxc-spin{display:inline-block;width:0.62em;height:0.62em;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:pdxcSpin 0.7s linear infinite;vertical-align:-1px;}' +
      '@keyframes pdxcSpin{to{transform:rotate(360deg);}}' +
      '@media (prefers-reduced-motion: reduce){.pdxc-spin{animation:none;}}' +
      '.pdxc-legend{display:flex;flex-direction:column;gap:0.35rem;font-family:"Barlow Condensed",sans-serif;}' +
      '.pdxc-legend-row{display:flex;align-items:baseline;gap:0.4rem;font-size:0.7rem;color:#c6d4ec;}' +
      '.pdxc-legend-row b{white-space:nowrap;}' +
      // Promise Tracker gateway — the section name (no %) + two dive-in cards.
      '.pdxc-gate{border:1px solid rgba(255,255,255,0.1);border-radius:0.9rem;padding:0.85rem;background:linear-gradient(180deg,rgba(18,24,42,0.6),rgba(10,15,30,0.35));}' +
      '.pdxc-gate-h{display:flex;align-items:center;gap:0.4rem;font-family:"Bebas Neue",sans-serif;font-size:1.15rem;letter-spacing:0.03em;color:#e8eefc;line-height:1;}' +
      '.pdxc-gate-sub{font-family:"Barlow Condensed",sans-serif;font-size:0.72rem;color:#9fb4d4;margin-top:0.25rem;line-height:1.3;}' +
      '.pdxc-gate-cards{display:flex;flex-direction:column;gap:0.6rem;margin-top:0.75rem;}' +
      '.pdxc-gate-card{display:flex;flex-direction:column;gap:0.4rem;width:100%;text-align:left;cursor:pointer;border:1px solid rgba(255,255,255,0.1);border-radius:0.75rem;padding:0.7rem 0.8rem;background:rgba(10,15,30,0.4);transition:transform .12s ease,border-color .2s ease,background .2s ease;}' +
      '.pdxc-gate-card:hover{transform:translateY(-1px);border-color:rgba(255,255,255,0.2);background:rgba(10,15,30,0.6);}' +
      '.pdxc-gate-card:active{transform:scale(0.995);}' +
      '.pdxc-gate-top{display:flex;align-items:center;justify-content:space-between;gap:0.5rem;}' +
      '.pdxc-gate-name{display:inline-flex;align-items:center;gap:0.4rem;font-family:"Barlow Condensed",sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;font-size:0.82rem;color:#e8eefc;}' +
      '.pdxc-gate-pct{font-family:"Bebas Neue",sans-serif;font-size:1.5rem;line-height:0.9;}' +
      '.pdxc-gate-q{font-family:"Barlow Condensed",sans-serif;font-style:italic;font-size:0.74rem;color:#c6d4ec;line-height:1.3;}' +
      '.pdxc-gate-foot{display:flex;align-items:center;justify-content:space-between;gap:0.5rem;}' +
      '.pdxc-gate-go{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.66rem;letter-spacing:0.05em;text-transform:uppercase;color:#9fdbd0;}' +
      '@media (max-width:380px){.pdxc-gate-pct{font-size:1.3rem;}}';
    var st = document.createElement('style');
    st.id = 'pdx-consistency-css';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  // Compact, mobile-first chip for a single (pid, issue). opts.frame:false hides the
  // "⚖️ Say-vs-Do" prefix; opts.showFlag:false hides the ⚑ contradiction count.
  function chipHtml(pidOrVerdict, issueKey, opts) {
    ensureStyles();
    opts = opts || {};
    var v = (pidOrVerdict && pidOrVerdict.verdict) ? pidOrVerdict : issueVerdict(pidOrVerdict, issueKey);
    var m = v.verdict || VERDICTS.no_record;
    // Dense surfaces (profile rows, comparison cells) can drop the muted
    // "no record / no stance / limited" states to stay clean, while still showing
    // every meaningful verdict and the live "checking…" state.
    if (opts.hideEmpty && (v.token === 'no_record' || v.token === 'no_stance' || v.token === 'limited')) return '';
    var frame = (opts.frame === false) ? '' : '<span class="pdxc-frame" aria-hidden="true">' + FRAME.icon + '</span>';
    var body = (v.token === 'pending')
      ? '<span class="pdxc-spin" aria-hidden="true"></span><span>' + esc(m.label) + '</span>'
      : '<span aria-hidden="true">' + m.ico + '</span><span>' + esc(opts.label || m.label) + '</span>';
    var flag = (opts.showFlag !== false && v.contradictions > 0 && v.token !== 'contradicts')
      ? '<span class="pdxc-flag" title="' + v.contradictions + ' contradiction' + (v.contradictions === 1 ? '' : 's') + ' on record">⚑' + v.contradictions + '</span>'
      : '';
    var title = FRAME.label + ' — ' + m.short + (v.sources.length ? ' (' + v.sources.join(' + ') + ')' : '');
    return '<span class="pdxc-chip pdxc-' + m.cls + '" title="' + esc(title) + '" aria-label="' + esc(FRAME.label + ': ' + m.label) + '">' + frame + body + flag + '</span>';
  }

  // Comparison-board dot. Maps the unified token onto the app's existing vrdot
  // classes so the board's CSS keeps working, but the answer now includes receipts.
  var _DOT = {
    consistent:  { ch: '✓', cls: 'vrdot-consistent', tip: 'Their record backs up what they say' },
    contradicts: { ch: '⚠', cls: 'vrdot-contradicts', tip: 'Their record runs against what they say' },
    mixed:       { ch: '~', cls: 'vrdot-mixed',       tip: 'Mixed record on this issue' },
    flag:        { ch: '⚑', cls: 'vrdot-contradicts', tip: 'A documented red flag on their record' },
    limited:     { ch: '•', cls: 'vrdot-record',      tip: 'Has some record, not enough to judge yet' },
    pending:     { ch: '·', cls: 'vrdot-record',      tip: 'Checking their record…' }
  };
  function dot(pid, issueKey) {
    var v = (pid && pid.verdict) ? pid : issueVerdict(pid, issueKey);
    return _DOT[v.token] || null;
  }

  // One shared legend, so "what do these mean" reads the same wherever it's shown.
  function legendHtml(tokens) {
    ensureStyles();
    var keys = tokens || ['consistent', 'mixed', 'contradicts', 'limited'];
    var rows = keys.map(function (t) {
      var m = VERDICTS[t]; if (!m) return '';
      return '<div class="pdxc-legend-row"><b style="color:' + m.color + ';">' + m.ico + ' ' + esc(m.label) + '</b><span>' + esc(m.short) + '</span></div>';
    }).join('');
    return '<div class="pdxc-legend"><div class="pdxc-legend-row" style="opacity:.75;">' + FRAME.icon + ' <b>' + FRAME.label + '</b> — ' + esc(FRAME.question) + '</div>' + rows + '</div>';
  }

  // ── Promise Tracker gateway ─────────────────────────────────────────────────
  // The SECTION name only — no percentage attached to "Promise Tracker" itself.
  // Presents the philosophy line + two clearly separated dive-in cards, each with
  // its own icon, name, core question, and a scoped summary (Official Record shows
  // its % or an honest empty state; Say-vs-Do shows its verdict, never a %).
  // Additive: returns HTML any profile surface can mount. The cards carry
  // data-pdxc-open="official|saydo" so the host can wire the dive-in navigation.
  function _scopeSummaryHtml(scope, pid) {
    var ov = scopedOverall(scope, pid);
    var m = ov.verdict;
    if (scope === 'official') {
      var pct = (typeof ov.score === 'number')
        ? '<span class="pdxc-gate-pct" style="color:' + m.color + ';">' + ov.score + '%</span>'
        : '<span class="pdxc-chip pdxc-' + m.cls + '">' + m.ico + ' ' + esc(m.label) + '</span>';
      return pct;
    }
    // Say-vs-Do — verdict chip, never a percentage.
    return '<span class="pdxc-chip pdxc-' + m.cls + '">' + (ov.token === 'pending' ? '<span class="pdxc-spin"></span>' : m.ico + ' ') + esc(m.label) + '</span>';
  }
  function _gateCard(scope, pid) {
    var sc = SCOPES[scope];
    return '<button type="button" class="pdxc-gate-card" data-pdxc-open="' + scope + '" aria-label="' + esc(sc.label + ' — ' + sc.question) + '">' +
        '<div class="pdxc-gate-top"><span class="pdxc-gate-name"><span aria-hidden="true">' + sc.icon + '</span>' + esc(sc.label) + '</span>' + _scopeSummaryHtml(scope, pid) + '</div>' +
        '<div class="pdxc-gate-q">“' + esc(sc.question) + '”</div>' +
        '<div class="pdxc-gate-foot"><span class="pdxc-gate-sub">' + esc(sc.blurb) + '</span><span class="pdxc-gate-go">View →</span></div>' +
      '</button>';
  }
  function gatewayHtml(pid, opts) {
    ensureStyles();
    opts = opts || {};
    return '<section class="pdxc-gate" aria-label="Promise Tracker">' +
        '<div class="pdxc-gate-h"><span aria-hidden="true">📋</span> Promise Tracker</div>' +
        '<div class="pdxc-gate-sub">Two honest reads on whether they mean what they say — kept separate on purpose. ' +
          '<b>Official Record</b> is the institutional score from their votes; <b>Say-vs-Do</b> is the broader public picture. ' +
          'Discrete promises are tracked on their own.</div>' +
        '<div class="pdxc-gate-cards">' + _gateCard('official', pid) + _gateCard('saydo', pid) + '</div>' +
      '</section>';
  }

  window.PDXConsistency = {
    FRAME: FRAME,
    SCOPES: SCOPES,
    VERDICTS: VERDICTS,
    // Two scoped reads — the locked product model. Pass an issueKey for a single
    // issue, or omit it for the politician's overall roll-up in that scope.
    officialRecord: function (pid, issue) { return issue ? officialIssue(pid, issue) : scopedOverall('official', pid); },
    sayVsDo: function (pid, issue) { return issue ? saydoIssue(pid, issue) : scopedOverall('saydo', pid); },
    // Pre-existing COMBINED reads — kept for surfaces already wired to them.
    issueVerdict: issueVerdict,
    overallVerdict: overallVerdict,
    scopedOverall: scopedOverall,
    issuesWithSignal: issuesWithSignal,
    isSaydoReceipt: isSaydoReceipt,
    chipHtml: chipHtml,
    dot: dot,
    legendHtml: legendHtml,
    gatewayHtml: gatewayHtml,
    warm: queueWarm,
    label: function (t) { return (VERDICTS[t] || VERDICTS.no_record).label; },
    icon: function (t) { return (VERDICTS[t] || VERDICTS.no_record).ico; },
    meta: function (t) { return VERDICTS[t] || VERDICTS.no_record; }
  };

  try { if (document.readyState !== 'loading') ensureStyles(); else document.addEventListener('DOMContentLoaded', ensureStyles); } catch (e) {}
})();
