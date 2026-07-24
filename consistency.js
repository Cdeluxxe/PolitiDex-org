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
        • Verdict + receipts led. Phase 7 adds a stance-level PUBLIC-RECORD integrity
          % — supporting / (supporting + contradicting) receipts — plus a pooled
          overall read in the section header. This % is derived ONLY from Say-vs-Do
          evidence: it is never blended with, nor allowed to compete with, the
          vote-based Official Record %, and never touches vote-consistency surfaces.
          It stays honest under thin data (no number below MIN_SAYDO_EVIDENCE, so a
          lone item can't fake a 0% / 100%).

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
     • sayVsDo(pid, issue|overall)        → the public-integrity verdict + a
       public-record integrity % (receipts only; never a vote-based score).
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

  // ── SAY-VS-DO stance integrity score (Phase 7) ──────────────────────────────
  // A stance-level, PUBLIC-RECORD-ONLY support percentage. It is derived solely
  // from the Say-vs-Do-eligible receipts already counted for the stance (formal
  // votes/actions and promises are excluded upstream by curatedFor), so it can
  // never touch the vote-based Official Record % or the Alignment Tool.
  //
  //   integrity % = supporting / (supporting + contradicting)
  //
  // where "supporting" = receipts whose verdict backs their word (consistent) and
  // "contradicting" = receipts that run against it. Flags are a documented red flag
  // but not a clean say-vs-do direction, so they are shown as a caveat and kept OUT
  // of the denominator (they'd otherwise distort a transparent support ratio).
  //
  // Honest thin-data rules (never a false 0% / 100% from near-empty evidence):
  //   • fewer than MIN_SAYDO_EVIDENCE directional items  → no number ("—"), because
  //     a single item can only ever read 0% or 100%.
  //   • MIN..SAYDO_THIN_MAX directional items            → number shown, flagged as
  //     "thin" so the UI/tooltip can caveat it.
  var MIN_SAYDO_EVIDENCE = 2;   // minimum directional (supporting+contradicting) items to show a %
  var SAYDO_THIN_MAX     = 3;   // 2–3 directional items → shown but marked thin
  function saydoScore(supporting, contradicting, min) {
    min = min || MIN_SAYDO_EVIDENCE;
    supporting = supporting || 0; contradicting = contradicting || 0;
    var judged = supporting + contradicting;
    if (judged < min) {
      return { pct: null, judged: judged, supporting: supporting, contradicting: contradicting, thin: false, enough: false };
    }
    return {
      pct: Math.round(100 * supporting / judged),
      judged: judged, supporting: supporting, contradicting: contradicting,
      thin: judged <= SAYDO_THIN_MAX, enough: true
    };
  }

  // ── Migrated formal-action feeder (Phase 3) ─────────────────────────────────
  // Curated receipts categorized 'voting' are FORMAL LEGISLATIVE ACTIONS (votes,
  // sponsorships) — they belong to the Official Record, not the broader Say-vs-Do
  // side. Rather than fabricate roll-call rows we don't have, we read them straight
  // from the same curated source and expose them as an Official Record feeder: each
  // sourced item becomes a per-(pid, issue) consistency signal (positive impact →
  // consistent with their word; negative → contradicts; neutral → context, unscored).
  // These fill Official Record coverage for members with no vr_* roll-call rows yet
  // (mostly state / local), and are EXCLUDED from every Say-vs-Do surface (see
  // say-vs-do.js collect()), so one event is never scored on both sides. Verifiability
  // is preserved — an item without a source link is dropped, exactly like vr_* rows.
  var _oaCache = null, _oaKey = -1;

  // Phase 4 issue-key backfill for migrated voting receipts that shipped WITHOUT an
  // issueKey. Each entry was assigned by hand only where the issue is clear and
  // defensible from the item's headline/context, and every value is a live ISSUE_MAP
  // key (validated below). Keyed by "<pid>||<normalized headline>" so curly-vs-straight
  // apostrophes and punctuation can't break the match. Items whose issue was ambiguous,
  // multi-issue, or purely electoral/leadership are intentionally ABSENT — they stay
  // unresolved rather than take a weak mapping. Centralised here (not edited into the
  // 683 KB data file) so the Phase 4 mapping is auditable in one place; a later pass
  // can fold these back into the source data.
  var OFFICIAL_ACTION_ISSUE_BACKFILL = {
    'lyman||carried his public lands fight from protest into the statehouse': 'lands_local',
    'rand_paul||blocked fast track passage of the 9 11 victim compensation fund': 'national_debt',
    'kriebe||a steady public education through line': 'public_schools',
    'jdailey||year after year steward of utah s medical cannabis program': 'cannabis_reform',
    'nthurston||multi year push to send drug rebates to patients': 'health_drug_prices',
    'cbramble||two decades as the senate s tax and budget engine': 'lower_taxes',
    'gwynn_h6||carries first responder and public safety measures': 'back_police',
    'kwan_s12||sponsored hate crime police training law amid a 339 rise in anti aapi crime': 'rights_balance',
    'kwan_s12||carried a resolution condemning anti aapi attacks': 'rights_balance',
    'koford_h10||pattern a weber republican who turns conservation talk into votes': 'water',
    'koford_h10||a first term lead on great salt lake conservation': 'water',
    'cory_maloy_h52||a consistent multi session second amendment record': 'gun_rights',
    'janderegg||a decade long low drama privacy throughline': 'privacy_rights',
    'dhinkins||backed public worker bargaining rights against the partisan grain': 'econ_workers',
    'dowens_st||guarded private property against eminent domain overreach': 'property_rights',
    'jbriscoe||kept pushing free transit even as the bills died': 'transit',
    'swaldrip||a single sustained obsession housing supply': 'housing_build',
    'jburton||turned service ethic into education benefits for the guard': 'veterans',
    'tyler_clancy||turned a lived issue into the state s homelessness portfolio': 'homeless',
    'jferry||put real money behind the rhetoric': 'water',
    'calbrecht||reliable rancher and water advocate for central utah': 'water',
    'stewart_e_barlow||reformed public health order authority after living the pandemic': 'medical_freedom',
    'cheryl_acton||pushes disclosure rules that bind candidates like herself': 'gov_transparency',
    'ryan_d_wilcox||modernized child safety law for the ai era': 'tech_balance',
    'jon_hawkins||co chairs the kids and tech safety commission': 'tech_balance',
    'doug_fiefia||took an election transparency loss and kept the receipt public': 'election_integrity',
    'kay_christofferson||willing to retire his own side s outdated program': 'transit',
    'massie||one of congress s most reliable no votes on principle even alone': 'cut_spending',
    'hegseth||delivered on his stated anti woke pentagon agenda': 'end_dei',
    'nhaley||led the removal of the confederate flag in south carolina': 'rights_balance',
    'biden||turned campaign promises into major enacted laws': 'infrastructure',
    'obama||delivered his signature promise the affordable care act': 'healthcare',
    'emendenhall||delivered on the environmental brand': 'climate_action'
  };
  function _normHead(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  // Resolve an item's issueKey: its own, else the Phase 4 backfill. Only accept a key
  // that exists in the live ISSUE_MAP when it's loaded, so a stale backfill entry can
  // never introduce an invalid key.
  function _resolveActionIssue(pid, it) {
    var ik = it.issueKey;
    var viaBackfill = false;
    if (!ik) { ik = OFFICIAL_ACTION_ISSUE_BACKFILL[pid + '||' + _normHead(it.headline)] || ''; viaBackfill = !!ik; }
    if (!ik) return null;
    try { if (window.ISSUE_MAP && !window.ISSUE_MAP[ik]) return null; } catch (e) {}
    return { key: ik, backfilled: viaBackfill };
  }
  function buildOfficialActions() {
    var key = 0;
    try { key = window.ACCT_SPOTLIGHT ? Object.keys(window.ACCT_SPOTLIGHT).length : 0; } catch (e) { key = 0; }
    if (_oaCache && key === _oaKey) return _oaCache;
    _oaKey = key;
    var byPid = {}, byNorm = {}, count = 0, pols = 0, backfilled = 0;
    try {
      var ACCT = window.ACCT_SPOTLIGHT || {};
      Object.keys(ACCT).forEach(function (pid) {
        var items = ACCT[pid];
        if (!Array.isArray(items)) return;
        var had = false;
        items.forEach(function (it) {
          if (!it || String(it.category || '').toLowerCase() !== 'voting') return; // formal actions only
          if (!it.source || !it.source.url) return;                                 // verifiability rule
          var verdict = it.impact === 'positive' ? 'consistent' : it.impact === 'negative' ? 'contradicts' : null;
          if (!verdict) return;                                                     // neutral = context, unscored
          var res = _resolveActionIssue(pid, it);                                   // own issueKey, else Phase 4 backfill
          if (!res) return;                                                         // still unmapped → leave unresolved
          if (res.backfilled) backfilled++;
          var iss = (byPid[pid] = byPid[pid] || {});
          var slot = (iss[res.key] = iss[res.key] || { consistent: 0, contradicts: 0, total: 0, items: [] });
          slot[verdict]++; slot.total++;
          slot.items.push({ headline: it.headline || '', date: it.date || '', sourceUrl: it.source.url, sourceLabel: (it.source.label || 'Source'), verdict: verdict });
          count++; had = true;
        });
        if (had) { byNorm[norm(pid)] = byPid[pid]; pols++; }
      });
    } catch (e) {}
    _oaCache = { byPid: byPid, byNorm: byNorm, count: count, politicians: pols, backfilled: backfilled };
    return _oaCache;
  }
  function officialActionsFor(pid, issueKey) {
    var idx = buildOfficialActions();
    var iss = idx.byPid[pid] || idx.byNorm[norm(pid)];
    var slot = iss && iss[issueKey];
    return slot || { consistent: 0, contradicts: 0, total: 0, items: [] };
  }
  function officialActionIssues(pid) {
    var idx = buildOfficialActions();
    var iss = idx.byPid[pid] || idx.byNorm[norm(pid)];
    return iss ? Object.keys(iss) : [];
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
  // fabricated 0. Two feeders, in strict priority so nothing double-counts:
  //   1. vr_* roll-call record — AUTHORITATIVE where it exists (used alone).
  //   2. migrated curated formal actions — fill issues with no roll-call record yet.
  function officialIssue(pid, issueKey) {
    var rec = recordSummary(pid, issueKey);
    var warm = recordsWarm(pid);
    var stance = positionStance(pid, issueKey);
    var act = officialActionsFor(pid, issueKey);
    var hasStance = !!stance || (rec && rec.netVerdict && rec.netVerdict !== 'no_stance' && rec.netVerdict !== 'no_record') || act.total > 0;

    // 1. Systematic roll-call record is authoritative — use it alone, so a curated
    //    echo of the same vote can never be counted twice.
    if (rec && rec.total) {
      var t = rec.netVerdict === 'contradicts' ? 'contradicts'
            : rec.netVerdict === 'consistent' ? 'consistent'
            : rec.netVerdict === 'mixed' ? 'mixed' : 'limited';
      return {
        scope: 'official', token: t, verdict: scopeVerdict('official', t),
        score: scoreFromRecord(rec), record: rec, officialActions: null, curated: null,
        contradictions: rec.contradicts || 0, flags: 0,
        hasStance: hasStance, pending: false, sources: ['record']
      };
    }

    // 2. No roll-call on this issue → the migrated curated formal actions fill it
    //    (the Phase 3 coverage win). Scored honestly: all-contradiction is a real 0%,
    //    not a false one.
    if (act.total > 0) {
      var tok = (act.contradicts > 0 && act.consistent > 0) ? 'mixed'
              : act.contradicts > 0 ? 'contradicts' : 'consistent';
      return {
        scope: 'official', token: tok, verdict: scopeVerdict('official', tok),
        score: Math.round(100 * act.consistent / (act.consistent + act.contradicts)),
        record: null, officialActions: act, curated: null,
        contradictions: act.contradicts, flags: 0,
        hasStance: true, pending: false, sources: ['formal-actions']
      };
    }

    // 3. Nothing on either feeder — honest empty (never a false 0%).
    var token, pending = false;
    if (!warm && hasStance) { pending = true; token = 'pending'; queueWarm(pid); }
    else token = hasStance ? 'no_record' : 'no_stance';
    return {
      scope: 'official', token: token, verdict: scopeVerdict('official', token),
      score: null, record: null, officialActions: null, curated: null,
      contradictions: 0, flags: 0, hasStance: hasStance, pending: pending, sources: []
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
    // Phase 7: a transparent, public-record-only support % (null under the thin-data
    // threshold so it never fakes a 0/100). This is Say-vs-Do's OWN integrity read —
    // it is never fed into the Official Record % or any vote-based surface.
    var sc = saydoScore(cur.consistent, cur.contradicts);
    return {
      scope: 'saydo', token: token, verdict: scopeVerdict('saydo', token),
      score: sc.pct, scoreMeta: sc, record: null, curated: cur,
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
    // warm votes + migrated formal actions — official + combined.
    if (scope !== 'saydo') {
      try {
        var recs = (window.PDXVotingRecord && typeof window.PDXVotingRecord.memberRecords === 'function') ? window.PDXVotingRecord.memberRecords(pid) : null;
        if (recs) recs.forEach(function (it) { (it.issues || []).forEach(function (m) { if (m && m.issueKey) set[m.issueKey] = 1; }); });
      } catch (e) {}
      try { officialActionIssues(pid).forEach(function (k) { set[k] = 1; }); } catch (e) {}
    }
    return Object.keys(set);
  }

  // ── the overall roll-up: ONE verdict per politician, per scope ──────────────
  function scopedOverall(scope, pid, issueKeys) {
    var per = scope === 'official' ? officialIssue : scope === 'saydo' ? saydoIssue : issueVerdict;
    var keys = (issueKeys && issueKeys.length) ? issueKeys : issuesWithSignal(pid, scope);
    var counts = { consistent: 0, contradicts: 0, mixed: 0, flag: 0, limited: 0, none: 0, pending: 0 };
    var scoreSum = 0, scoreN = 0, contradictions = 0, anyPending = false;
    var sdSup = 0, sdCon = 0; // Say-vs-Do pooled directional evidence (Phase 7)
    keys.forEach(function (k) {
      var v = per(pid, k);
      counts[bucketOf(v.token)]++;
      contradictions += v.contradictions || 0;
      if (v.pending) anyPending = true;
      if (typeof v.score === 'number') { scoreSum += v.score; scoreN++; }
      if (scope === 'saydo' && v.curated) { sdSup += v.curated.consistent || 0; sdCon += v.curated.contradicts || 0; }
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
    // Phase 7: Say-vs-Do carries its OWN pooled public-record integrity % (supporting
    // ÷ directional evidence across every stance). It is NOT a blend of vote data and
    // never competes with the Official Record — it's the public-record answer only,
    // pooled by evidence volume and held to a higher floor so a whole-profile read
    // never rests on one or two items. The gateway card still shows a verdict chip only.
    var sdScore = (scope === 'saydo') ? saydoScore(sdSup, sdCon, MIN_SAYDO_EVIDENCE + 1) : null;
    return {
      scope: scope, token: token, verdict: scopeVerdict(scope, token),
      // Official/combined = the vote-based average; Say-vs-Do = its pooled public-record
      // integrity % (still on its own scope — never blended into Official Record).
      score: (scope === 'saydo') ? (sdScore ? sdScore.pct : null) : (scoreN ? Math.round(scoreSum / scoreN) : null),
      saydoScore: sdScore,
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
      '@media (max-width:380px){.pdxc-gate-pct{font-size:1.3rem;}}' +
      // By-issue Official Record view (the organized dive-in).
      '.pdxor{font-family:"Barlow Condensed",sans-serif;}' +
      '.pdxor-head{display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem;}' +
      '.pdxor-title{display:inline-flex;align-items:center;gap:0.4rem;font-family:"Bebas Neue",sans-serif;font-size:1.2rem;letter-spacing:0.03em;color:#e8eefc;}' +
      '.pdxor-q{font-style:italic;font-size:0.76rem;color:#c6d4ec;margin:0.2rem 0 0.6rem;line-height:1.3;}' +
      '.pdxor-overall{display:inline-flex;align-items:center;gap:0.5rem;padding:0.35rem 0.6rem;border-radius:0.6rem;background:rgba(10,15,30,0.45);border:1px solid rgba(255,255,255,0.1);margin-left:auto;}' +
      '.pdxor-overall .pdxor-pct{font-family:"Bebas Neue",sans-serif;font-size:1.5rem;line-height:0.9;}' +
      '.pdxor-tally{font-size:0.7rem;color:#9fb4d4;margin:0.35rem 0 0.75rem;line-height:1.35;}' +
      '.pdxor-cat{margin-top:0.7rem;}' +
      '.pdxor-cat-h{font-weight:700;text-transform:uppercase;letter-spacing:0.06em;font-size:0.62rem;color:#7e93b3;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:0.2rem;margin-bottom:0.4rem;}' +
      '.pdxor-issue{border:1px solid rgba(255,255,255,0.08);border-radius:0.6rem;padding:0.55rem 0.65rem;margin-bottom:0.45rem;background:rgba(10,15,30,0.35);}' +
      '.pdxor-issue-top{display:flex;flex-wrap:wrap;align-items:center;gap:0.45rem;}' +
      '.pdxor-issue-lbl{font-weight:700;font-size:0.82rem;color:#e8eefc;flex:1;min-width:8rem;}' +
      '.pdxor-stance{display:inline-flex;align-items:center;gap:0.25rem;font-size:0.64rem;font-weight:700;padding:0.08rem 0.45rem;border-radius:999px;border:1px solid var(--c);color:var(--c);background:rgba(10,15,30,0.4);white-space:nowrap;}' +
      '.pdxor-pct{font-family:"Bebas Neue",sans-serif;font-size:1.15rem;line-height:0.9;}' +
      '.pdxor-acts{margin-top:0.4rem;}' +
      '.pdxor-acts>summary{cursor:pointer;font-size:0.66rem;color:#9fdbd0;font-weight:700;letter-spacing:0.03em;list-style:none;}' +
      '.pdxor-acts>summary::-webkit-details-marker{display:none;}' +
      '.pdxor-act{display:flex;align-items:baseline;gap:0.4rem;font-size:0.7rem;color:#c6d4ec;padding:0.28rem 0 0.28rem 0.2rem;border-top:1px solid rgba(255,255,255,0.05);line-height:1.35;}' +
      '.pdxor-act-ico{flex-shrink:0;}' +
      '.pdxor-act a{color:#7fb4ff;text-decoration:none;white-space:nowrap;}' +
      '.pdxor-empty{font-size:0.76rem;color:#9fb4d4;padding:0.7rem 0.2rem;line-height:1.4;}' +
      '.pdxor-awaiting{font-size:0.68rem;color:#7e93b3;margin-top:0.6rem;padding-top:0.5rem;border-top:1px solid rgba(255,255,255,0.08);}' +
      '.pdxor-count{font-size:0.66rem;color:#9fb4d4;white-space:nowrap;}' +
      // Say-vs-Do feed shares the layout but takes a distinct gold/amber left accent
      // so it never reads as the Official Record (which has no accent bar).
      '.pdxsd .pdxor-title{color:#f5d9a0;}' +
      '.pdxsd .pdxor-issue{border-left:2px solid rgba(245,200,66,0.35);}' +
      // Say-vs-Do integrity % (Phase 7): reserved score slot on each stance row +
      // the pooled overall read in the header. Kept visually distinct from a bare
      // vote %, always captioned/tooltipped as public-record integrity.
      '.pdxor-pct-na{color:#7e93b3;font-family:"Bebas Neue",sans-serif;font-size:1.05rem;line-height:0.9;opacity:0.85;cursor:help;}' +
      '.pdxor-thin{font-family:"Barlow Condensed",sans-serif;font-size:0.5em;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:#c6a15b;margin-left:0.12em;vertical-align:super;}' +
      '.pdxor-integrity{display:inline-flex;align-items:center;gap:0.3rem;cursor:help;}' +
      '.pdxor-integrity-cap{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.5rem;line-height:1;letter-spacing:0.04em;text-transform:uppercase;color:#c6a15b;text-align:left;}' +
      '.pdxor-method{font-size:0.66rem;color:#8fa2c0;line-height:1.4;margin:0 0 0.7rem;padding:0.4rem 0.55rem;border-radius:0.5rem;background:rgba(245,200,66,0.06);border:1px solid rgba(245,200,66,0.14);}' +
      '.pdxor-method b{color:#c6d4ec;}' +
      // Divergence section (Phase 8): Official Record vs Say-vs-Do, side by side.
      // Neutral, comparison-first styling; the relationship chip carries the colour.
      '.pdxdv{font-family:"Barlow Condensed",sans-serif;border:1px solid rgba(255,255,255,0.1);border-radius:0.9rem;padding:0.85rem;background:linear-gradient(180deg,rgba(18,24,42,0.5),rgba(10,15,30,0.3));}' +
      '.pdxdv-head{display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem 0.75rem;}' +
      '.pdxdv-title{display:inline-flex;align-items:center;gap:0.4rem;font-family:"Bebas Neue",sans-serif;font-size:1.2rem;letter-spacing:0.03em;color:#e8eefc;}' +
      '.pdxdv-sum{display:inline-flex;flex-wrap:wrap;align-items:center;gap:0.4rem 0.6rem;margin-left:auto;padding:0.3rem 0.55rem;border-radius:0.6rem;background:rgba(10,15,30,0.45);border:1px solid rgba(255,255,255,0.1);}' +
      '.pdxdv-sum-na{font-size:0.68rem;color:#9fb4d4;line-height:1.3;max-width:17rem;}' +
      '.pdxdv-sum-nums,.pdxdv-nums{display:inline-flex;align-items:center;gap:0.35rem;}' +
      '.pdxdv-num{display:inline-flex;align-items:center;gap:0.22rem;white-space:nowrap;}' +
      '.pdxdv-num-ic{font-size:0.8rem;opacity:0.9;}' +
      '.pdxdv-num-pct{font-family:"Bebas Neue",sans-serif;font-size:1.25rem;line-height:0.9;}' +
      '.pdxdv-vs{font-size:0.6rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#7e93b3;}' +
      '.pdxdv-q{font-style:italic;font-size:0.74rem;color:#c6d4ec;margin:0.4rem 0 0.55rem;line-height:1.4;}' +
      '.pdxdv-q b{font-style:normal;}' +
      '.pdxdv-tally{font-size:0.72rem;color:#c6d4ec;margin:0 0 0.6rem;line-height:1.35;}' +
      '.pdxdv-rows{display:flex;flex-direction:column;gap:0.45rem;}' +
      '.pdxdv-row{border:1px solid rgba(255,255,255,0.08);border-radius:0.6rem;padding:0.5rem 0.6rem;background:rgba(10,15,30,0.35);}' +
      '.pdxdv-row-lbl{font-weight:700;font-size:0.82rem;color:#e8eefc;margin-bottom:0.32rem;}' +
      '.pdxdv-row-body{display:flex;flex-wrap:wrap;align-items:center;gap:0.4rem 0.6rem;}' +
      '.pdxdv-rel{display:inline-flex;align-items:center;gap:0.25rem;font-weight:700;font-size:0.68rem;letter-spacing:0.02em;padding:0.12rem 0.5rem;border-radius:999px;border:1px solid;white-space:nowrap;}' +
      '.pdxdv-gap{font-size:0.66rem;color:#9fb4d4;white-space:nowrap;}' +
      '.pdxdv-note,.pdxdv-empty{font-size:0.7rem;color:#9fb4d4;line-height:1.4;}' +
      '.pdxdv-note{margin-top:0.6rem;padding-top:0.5rem;border-top:1px solid rgba(255,255,255,0.08);}' +
      '.pdxdv-empty{padding:0.7rem 0.2rem;}' +
      '@media (max-width:440px){.pdxdv-sum{margin-left:0;width:100%;}.pdxdv-num-pct{font-size:1.1rem;}}' +
      '.pdxor-rawlink{display:inline-block;margin-top:0.7rem;font-size:0.68rem;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:#7fb4ff;cursor:pointer;background:none;border:none;padding:0;}';
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
    return '<button type="button" class="pdxc-gate-card" data-pdxc-open="' + scope + '" data-pdxc-pid="' + esc(pid) + '" aria-label="' + esc(sc.label + ' — ' + sc.question) + '">' +
        '<div class="pdxc-gate-top"><span class="pdxc-gate-name"><span aria-hidden="true">' + sc.icon + '</span>' + esc(sc.label) + '</span>' + _scopeSummaryHtml(scope, pid) + '</div>' +
        '<div class="pdxc-gate-q">“' + esc(sc.question) + '”</div>' +
        '<div class="pdxc-gate-foot"><span class="pdxc-gate-sub">' + esc(sc.blurb) + '</span><span class="pdxc-gate-go">View →</span></div>' +
      '</button>';
  }
  function gatewayHtml(pid, opts) {
    ensureStyles();
    bindGateway();
    opts = opts || {};
    return '<section class="pdxc-gate" data-pdxc-gate-pid="' + esc(pid) + '" aria-label="Promise Tracker">' +
        '<div class="pdxc-gate-h"><span aria-hidden="true">📋</span> Promise Tracker</div>' +
        '<div class="pdxc-gate-sub">Two separate ways to check whether their word holds up — kept apart on purpose. ' +
          '<b>🏛️ Official Record</b> is the institutional score from their votes; <b>🧾 Say-vs-Do</b> is the broader public picture. ' +
          'Discrete promises are tracked on their own.</div>' +
        '<div class="pdxc-gate-cards">' + _gateCard('official', pid) + _gateCard('saydo', pid) + '</div>' +
      '</section>';
  }

  // Gateway navigation + live refresh. The two dive-in cards route to the deeper
  // views the app already ships: Official Record → the profile's Voting Record
  // section; Say-vs-Do → the politician's receipts (lightbox, else the flashpoints
  // feed). We also re-render a mounted gateway's cards when that member's votes
  // finish warming, so the Official Record summary resolves from "Checking…" to its
  // real % in place.
  function _gateNav(scope, pid) {
    if (scope === 'official') {
      // Land on the organized by-issue Official Record view; fall back to the raw
      // Voting Record list if the by-issue section isn't mounted.
      var target = document.getElementById('pdxsec-official-record') ? 'pdxsec-official-record' : 'pdxsec-voting';
      if (typeof window._pdxNavJump === 'function') { window._pdxNavJump(target); return; }
      var el = document.getElementById(target); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    // say-vs-do → the dedicated stance-first feed; fall back to the general receipts
    // lightbox / flashpoints only if the section isn't mounted.
    if (document.getElementById && document.getElementById('pdxsec-saydo')) {
      if (typeof window._pdxNavJump === 'function') { window._pdxNavJump('pdxsec-saydo'); return; }
      var sd = document.getElementById('pdxsec-saydo'); if (sd && sd.scrollIntoView) { sd.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    }
    try {
      var R = window.PDXReceipts;
      if (R && typeof R.forPolitician === 'function' && R.forPolitician(pid) && typeof R.open === 'function') { R.open(pid); return; }
    } catch (e) {}
    if (typeof window._pdxNavJump === 'function') { window._pdxNavJump('pdxsec-controversies'); return; }
    var el2 = document.getElementById('pdxsec-controversies'); if (el2 && el2.scrollIntoView) el2.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  var _gateBound = false;
  function bindGateway() {
    if (_gateBound || !document.addEventListener) return;
    _gateBound = true;
    document.addEventListener('click', function (e) {
      var card = e.target.closest && e.target.closest('[data-pdxc-open]');
      if (!card) return;
      e.preventDefault();
      _gateNav(card.getAttribute('data-pdxc-open'), card.getAttribute('data-pdxc-pid') || '');
    });
    window.addEventListener('pdx-consistency-warm', function (ev) {
      var pid = ev && ev.detail && ev.detail.pid; if (!pid) return;
      // Refresh the gateway cards…
      var gates = document.querySelectorAll('[data-pdxc-gate-pid]');
      for (var i = 0; i < gates.length; i++) {
        if (gates[i].getAttribute('data-pdxc-gate-pid') !== String(pid)) continue;
        var cards = gates[i].querySelector('.pdxc-gate-cards');
        if (cards) cards.innerHTML = _gateCard('official', pid) + _gateCard('saydo', pid);
      }
      // …and the by-issue Official Record section, so it fills in as votes warm.
      var secs = document.querySelectorAll('[data-pdxc-official-pid]');
      for (var j = 0; j < secs.length; j++) {
        if (secs[j].getAttribute('data-pdxc-official-pid') !== String(pid)) continue;
        secs[j].innerHTML = _officialInner(pid);
      }
      // …and the divergence section, so the comparison appears once the vote-based
      // side has a real % to line up against the public-record side.
      var dvs = document.querySelectorAll('[data-pdxc-divergence-pid]');
      for (var d = 0; d < dvs.length; d++) {
        if (dvs[d].getAttribute('data-pdxc-divergence-pid') !== String(pid)) continue;
        dvs[d].innerHTML = _divergenceInner(pid);
      }
    });
  }

  // ── By-issue Official Record view (the organized dive-in) ───────────────────
  // Groups this politician's formal-action record by issue category. For each issue
  // it shows their STATED stance (the shared source of truth), the Official Record
  // verdict + %, and the supporting votes/actions behind it — with an honest empty
  // state and never a false 0%. Reads officialRecord() only: no Say-vs-Do content,
  // vr_* authoritative over the curated feeder (no double-counting).
  var _OR_STANCE = {
    support: { lb: 'Supports', c: '#4ade80', ico: '👍' },
    oppose:  { lb: 'Opposes',  c: '#f87171', ico: '👎' },
    mixed:   { lb: 'Mixed',    c: '#f5c842', ico: '⚖️' }
  };
  function _orStanceChip(pid, issueKey) {
    var s = positionStance(pid, issueKey);
    var m = _OR_STANCE[s]; if (!m) return '';
    return '<span class="pdxor-stance" style="--c:' + m.c + '" title="Their stated position">' + m.ico + ' Says: ' + m.lb + '</span>';
  }
  function _orActLine(verdict, title, meta, url, label) {
    var mv = VERDICTS[verdict] || VERDICTS.limited;
    var src = url ? ' <a href="' + esc(url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">' + esc(label || 'Source') + ' ↗</a>' : '';
    return '<div class="pdxor-act"><span class="pdxor-act-ico" style="color:' + mv.color + '" aria-hidden="true">' + mv.ico + '</span>' +
      '<span>' + esc(title) + (meta ? ' <span style="color:#7e93b3;">· ' + esc(meta) + '</span>' : '') + src + '</span></div>';
  }
  function _orSupportingHtml(ov) {
    var lines = [];
    // Migrated curated formal actions (each sourced).
    if (ov.officialActions && ov.officialActions.items) {
      ov.officialActions.items.forEach(function (a) {
        lines.push(_orActLine(a.verdict, a.headline || 'Formal action', a.date || '', a.sourceUrl, a.sourceLabel));
      });
    }
    // vr_* roll-call summary: the strongest consistent / contradicting measure.
    if (ov.record) {
      var mk = function (item, verdict) {
        if (!item) return;
        var url = item.sourceUrl || (item.source && item.source.url) || '';
        var lbl = item.sourceLabel || (item.source && item.source.label) || 'Congress.gov';
        var title = item.title || item.shortTitle || item.number || item.question || 'Recorded vote';
        var pos = item.position ? ('Voted ' + item.position) : (item.actionType || '');
        lines.push(_orActLine(verdict, title, pos, url, lbl));
      };
      mk(ov.record.topContradiction, 'contradicts');
      mk(ov.record.topConsistent, 'consistent');
    }
    if (!lines.length) return '';
    var n = lines.length;
    return '<details class="pdxor-acts"><summary>' + n + ' supporting ' + (n === 1 ? 'action' : 'actions') + ' ▾</summary>' + lines.join('') + '</details>';
  }
  function _orInner(pid) {
    var keys = issuesWithSignal(pid, 'official');
    var scored = [], awaiting = 0, anyPending = false;
    keys.forEach(function (k) {
      var ov = officialIssue(pid, k);
      if (ov.token === 'pending') { anyPending = true; awaiting++; return; }
      if (ov.token === 'consistent' || ov.token === 'contradicts' || ov.token === 'mixed' || ov.token === 'limited') {
        scored.push({ key: k, ov: ov });
      } else {
        awaiting++; // no_record / no_stance — stated position with nothing to score yet
      }
    });

    var overall = scopedOverall('official', pid);
    var om = overall.verdict;
    var overallHtml = (typeof overall.score === 'number')
      ? '<span class="pdxor-pct" style="color:' + om.color + '">' + overall.score + '%</span><span class="pdxc-chip pdxc-' + om.cls + '">' + om.ico + ' ' + esc(om.label) + '</span>'
      : '<span class="pdxc-chip pdxc-' + om.cls + '">' + (overall.token === 'pending' ? '<span class="pdxc-spin"></span>' : om.ico + ' ') + esc(om.label) + '</span>';

    var head =
      '<div class="pdxor-head"><span class="pdxor-title"><span aria-hidden="true">🏛️</span> Official Record</span>' +
        '<span class="pdxor-overall">' + overallHtml + '</span></div>' +
      '<div class="pdxor-q">“When they had to vote, did they stand by what they said?”</div>';

    if (!scored.length) {
      var emptyMsg = anyPending
        ? 'Checking the voting record…'
        : (awaiting > 0
            ? 'No qualifying votes on record yet — ' + awaiting + ' stated position' + (awaiting === 1 ? '' : 's') + ' ' + (awaiting === 1 ? 'is' : 'are') + ' still awaiting a formal record.'
            : 'No stated positions or formal record on file yet.');
      return head + '<div class="pdxor-empty">' + esc(emptyMsg) + '</div>' + _orRawLink();
    }

    // Group by broad issue category.
    var catOf = function (k) { try { return (typeof window._pdxCategoryOf === 'function' ? window._pdxCategoryOf(k) : '') || 'other'; } catch (e) { return 'other'; } };
    var catLabel = function (k) { try { return (typeof window._pdxCategoryLabelOf === 'function' ? window._pdxCategoryLabelOf(k) : '') || 'Other'; } catch (e) { return 'Other'; } };
    var issueLabel = function (k) { try { return (window.ISSUE_MAP && window.ISSUE_MAP[k] && window.ISSUE_MAP[k].label) || k; } catch (e) { return k; } };
    var rank = { contradicts: 0, mixed: 1, limited: 2, consistent: 3 };
    var byCat = {};
    scored.forEach(function (s) { var c = catOf(s.key); (byCat[c] = byCat[c] || { label: catLabel(s.key), items: [] }).items.push(s); });
    // Categories with a contradiction first; issues within a category contradiction-first.
    var catKeys = Object.keys(byCat).sort(function (a, b) {
      var ac = byCat[a].items.some(function (s) { return s.ov.token === 'contradicts'; }) ? 0 : 1;
      var bc = byCat[b].items.some(function (s) { return s.ov.token === 'contradicts'; }) ? 0 : 1;
      if (ac !== bc) return ac - bc;
      return byCat[a].label < byCat[b].label ? -1 : 1;
    });

    var body = catKeys.map(function (ck) {
      var grp = byCat[ck];
      grp.items.sort(function (a, b) { return (rank[a.ov.token] || 9) - (rank[b.ov.token] || 9); });
      var rows = grp.items.map(function (s) {
        var v = s.ov.verdict;
        var pct = (typeof s.ov.score === 'number') ? '<span class="pdxor-pct" style="color:' + v.color + '">' + s.ov.score + '%</span>' : '';
        return '<div class="pdxor-issue">' +
            '<div class="pdxor-issue-top">' +
              '<span class="pdxor-issue-lbl">' + esc(issueLabel(s.key)) + '</span>' +
              _orStanceChip(pid, s.key) +
              '<span class="pdxc-chip pdxc-' + v.cls + '">' + v.ico + ' ' + esc(v.label) + '</span>' + pct +
            '</div>' + _orSupportingHtml(s.ov) +
          '</div>';
      }).join('');
      return '<div class="pdxor-cat"><div class="pdxor-cat-h">' + esc(grp.label) + '</div>' + rows + '</div>';
    }).join('');

    var awaitingNote = awaiting > 0
      ? '<div class="pdxor-awaiting">➕ ' + awaiting + ' more stated position' + (awaiting === 1 ? '' : 's') + ' ' + (awaiting === 1 ? 'has' : 'have') + ' no qualifying votes on record yet.</div>'
      : '';

    return head + body + awaitingNote + _orRawLink();
  }
  function _orRawLink() {
    // Keep the raw Voting Record list one tap away (it still has value as a full list).
    if (!document.getElementById || !document.getElementById('pdxsec-voting')) return '';
    return '<button type="button" class="pdxor-rawlink" onclick="if(window._pdxNavJump)window._pdxNavJump(\'pdxsec-voting\');else{var e=document.getElementById(\'pdxsec-voting\');if(e)e.scrollIntoView({behavior:\'smooth\',block:\'start\'});}">See the full voting record →</button>';
  }
  var _officialInner = _orInner; // alias used by the warm-refresh listener
  function officialRecordSectionHtml(pid) {
    ensureStyles();
    bindGateway();
    if (!pid) return '';
    return '<section class="pdxor" data-pdxc-official-pid="' + esc(pid) + '" aria-label="Official Record by issue">' + _orInner(pid) + '</section>';
  }

  // ── Dedicated Say-vs-Do feed (the stance-first public-record dive-in) ────────
  // The sibling of the Official Record view, for the OTHER accountability question.
  // Same organized, stance-first shape (grouped by category, contradictions first),
  // but it reads Say-vs-Do ONLY — broader public-record receipts (statements,
  // interviews, news, controversies, rhetoric, transparency), never formal votes.
  // NO percentage by design: verdict + supporting/contradicting counts + the sourced
  // evidence behind each. Distinct 🧾 icon and copy so it never reads as the 🏛️
  // Official Record. Curated receipts are synchronous, so no warm/pending state.
  function _catOf(k) { try { return (typeof window._pdxCategoryOf === 'function' ? window._pdxCategoryOf(k) : '') || 'other'; } catch (e) { return 'other'; } }
  function _catLabel(k) { try { return (typeof window._pdxCategoryLabelOf === 'function' ? window._pdxCategoryLabelOf(k) : '') || 'Other'; } catch (e) { return 'Other'; } }
  function _issueLabel(k) { try { return (window.ISSUE_MAP && window.ISSUE_MAP[k] && window.ISSUE_MAP[k].label) || k; } catch (e) { return k; } }
  var _SD_ITEM_RANK = { contradicts: 0, flag: 1, consistent: 2 };
  function _sdEvidenceHtml(cur) {
    if (!cur || !cur.items || !cur.items.length) return '';
    var items = cur.items.slice().sort(function (a, b) {
      var ak = (a.verdict && a.verdict.key) || 'flag', bk = (b.verdict && b.verdict.key) || 'flag';
      return (_SD_ITEM_RANK[ak] == null ? 9 : _SD_ITEM_RANK[ak]) - (_SD_ITEM_RANK[bk] == null ? 9 : _SD_ITEM_RANK[bk]);
    });
    var lines = items.map(function (r) {
      var mv = VERDICTS[(r.verdict && r.verdict.key)] || VERDICTS.flag;
      var url = r.source && r.source.url;
      var src = url ? ' <a href="' + esc(url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">' + esc((r.source && r.source.label) || 'Source') + ' ↗</a>' : '';
      var meta = [];
      if (r.date) meta.push(esc(r.date));
      if (r.category) meta.push(esc(r.category));
      var metaHtml = meta.length ? ' <span style="color:#7e93b3;">· ' + meta.join(' · ') + '</span>' : '';
      return '<div class="pdxor-act"><span class="pdxor-act-ico" style="color:' + mv.color + '" aria-hidden="true">' + mv.ico + '</span>' +
        '<span>' + esc(r.headline || 'Public-record item') + metaHtml + src + '</span></div>';
    }).join('');
    var n = items.length;
    return '<details class="pdxor-acts"><summary>' + n + ' public-record ' + (n === 1 ? 'item' : 'items') + ' ▾</summary>' + lines + '</details>';
  }
  function _sdCounts(cur) {
    var parts = [];
    if (cur.consistent) parts.push('<b style="color:' + VERDICTS.consistent.color + '">' + cur.consistent + '</b> backing');
    if (cur.contradicts) parts.push('<b style="color:' + VERDICTS.contradicts.color + '">' + cur.contradicts + '</b> against');
    if (cur.flag) parts.push('<b style="color:' + VERDICTS.flag.color + '">' + cur.flag + '</b> flag' + (cur.flag === 1 ? '' : 's'));
    return parts.length ? '<span class="pdxor-count">' + parts.join(' · ') + '</span>' : '';
  }
  // Phase 7: render the stance-level public-record integrity % into the reserved
  // score slot. `sc` is a saydoScore() breakdown. Honest by construction — shows a
  // real number only above the thin-data floor, an explained "—" otherwise, and a
  // tooltip that always states this is public-record integrity, NOT a voting score.
  function _sdPctHtml(sc, color, opts) {
    opts = opts || {};
    if (!sc) return '';
    if (!sc.enough) {
      if (!opts.showDash) return '';
      var natip = sc.judged <= 0
        ? 'Not enough public record yet — no supporting or contradicting items to score.'
        : 'Not enough public record yet — only ' + sc.judged + ' checkable item' + (sc.judged === 1 ? '' : 's') + '; needs at least ' + MIN_SAYDO_EVIDENCE + ' to show a fair percentage.';
      return '<span class="pdxor-pct pdxor-pct-na" title="' + esc(natip) + '" aria-label="Not enough public record yet">—</span>';
    }
    var tip = 'Public-record integrity: ' + sc.supporting + ' of ' + sc.judged + ' checkable public-record item' + (sc.judged === 1 ? '' : 's') + ' back up what they say'
      + (sc.contradicting ? ' · ' + sc.contradicting + ' run against' : '') + '.'
      + (sc.thin ? ' Thin evidence — read with caution.' : '')
      + ' This is public-record integrity, not their formal voting record.';
    return '<span class="pdxor-pct" style="color:' + color + '" title="' + esc(tip) + '">' + sc.pct + '%'
      + (sc.thin ? '<sup class="pdxor-thin" aria-hidden="true">thin</sup>' : '') + '</span>';
  }
  function _sdRawLink() {
    if (!document.getElementById || !document.getElementById('pdxsec-controversies')) return '';
    return '<button type="button" class="pdxor-rawlink" onclick="if(window._pdxNavJump)window._pdxNavJump(\'pdxsec-controversies\');else{var e=document.getElementById(\'pdxsec-controversies\');if(e)e.scrollIntoView({behavior:\'smooth\',block:\'start\'});}">See flashpoints &amp; full receipts →</button>';
  }
  function _sdInner(pid) {
    var keys = issuesWithSignal(pid, 'saydo');
    var scored = [], awaiting = 0;
    keys.forEach(function (k) {
      var ov = saydoIssue(pid, k);
      if (ov.curated && ov.curated.total > 0) scored.push({ key: k, ov: ov });
      else awaiting++; // stated position with nothing on the public record yet
    });

    var overall = scopedOverall('saydo', pid);
    var om = overall.verdict;
    // Phase 7: Say-vs-Do now carries its OWN pooled public-record integrity % beside
    // the verdict chip — NOT a blended score and never the vote-based Official Record
    // number. When evidence is below the floor we simply keep the chip (no fake %),
    // so divergence from the Official Record % stays honest and readable.
    var headPct = '';
    if (typeof overall.score === 'number') {
      var sd = overall.saydoScore || {};
      var htip = 'Public-record integrity across every stance: ' + sd.supporting + ' of ' + sd.judged
        + ' checkable public-record items back up their word'
        + (sd.contradicting ? ' · ' + sd.contradicting + ' run against' : '') + '.'
        + (sd.thin ? ' Thin evidence — read with caution.' : '')
        + ' Public-record integrity only — separate from the vote-based Official Record %.';
      headPct = '<span class="pdxor-integrity" title="' + esc(htip) + '">' +
          '<span class="pdxor-pct" style="color:' + om.color + '">' + overall.score + '%' + (sd.thin ? '<sup class="pdxor-thin" aria-hidden="true">thin</sup>' : '') + '</span>' +
          '<span class="pdxor-integrity-cap">public-record<br>integrity</span></span>';
    }
    var head =
      '<div class="pdxor-head"><span class="pdxor-title"><span aria-hidden="true">🧾</span> Say-vs-Do</span>' +
        '<span class="pdxor-overall">' + headPct + '<span class="pdxc-chip pdxc-' + om.cls + '">' + om.ico + ' ' + esc(om.label) + '</span></span></div>' +
      '<div class="pdxor-q">“Does the full public picture match what they claim?”</div>' +
      '<div class="pdxor-method">Integrity&nbsp;% = public-record actions that back their words ÷ all checkable public-record evidence (backing&nbsp;+&nbsp;against). Shown only where there are ' + MIN_SAYDO_EVIDENCE + '+ checkable items — this is public-record integrity, <b>not</b> a formal voting score.</div>';

    if (!scored.length) {
      var msg = awaiting > 0
        ? 'No public-record confirmations or contradictions surfaced yet — ' + awaiting + ' stated position' + (awaiting === 1 ? '' : 's') + ' with nothing on the public record so far.'
        : 'No public-record evidence on file yet.';
      return head + '<div class="pdxor-empty">' + esc(msg) + '</div>' + _sdRawLink();
    }

    var rank = { contradicts: 0, mixed: 1, flag: 2, consistent: 3 };
    var byCat = {};
    scored.forEach(function (s) { var c = _catOf(s.key); (byCat[c] = byCat[c] || { label: _catLabel(s.key), items: [] }).items.push(s); });
    var catKeys = Object.keys(byCat).sort(function (a, b) {
      var ac = byCat[a].items.some(function (s) { return s.ov.token === 'contradicts'; }) ? 0 : 1;
      var bc = byCat[b].items.some(function (s) { return s.ov.token === 'contradicts'; }) ? 0 : 1;
      if (ac !== bc) return ac - bc;
      return byCat[a].label < byCat[b].label ? -1 : 1;
    });

    var body = catKeys.map(function (ck) {
      var grp = byCat[ck];
      grp.items.sort(function (a, b) { return (rank[a.ov.token] || 9) - (rank[b.ov.token] || 9); });
      var rows = grp.items.map(function (s) {
        var v = s.ov.verdict;
        return '<div class="pdxor-issue">' +
            '<div class="pdxor-issue-top">' +
              '<span class="pdxor-issue-lbl">' + esc(_issueLabel(s.key)) + '</span>' +
              _orStanceChip(pid, s.key) +
              '<span class="pdxc-chip pdxc-' + v.cls + '">' + v.ico + ' ' + esc(v.label) + '</span>' +
              _sdPctHtml(s.ov.scoreMeta, v.color, { showDash: true }) +
              _sdCounts(s.ov.curated) +
            '</div>' + _sdEvidenceHtml(s.ov.curated) +
          '</div>';
      }).join('');
      return '<div class="pdxor-cat"><div class="pdxor-cat-h">' + esc(grp.label) + '</div>' + rows + '</div>';
    }).join('');

    var awaitingNote = awaiting > 0
      ? '<div class="pdxor-awaiting">➕ ' + awaiting + ' more stated position' + (awaiting === 1 ? '' : 's') + ' ' + (awaiting === 1 ? 'has' : 'have') + ' no public-record evidence yet.</div>'
      : '';

    return head + body + awaitingNote + _sdRawLink();
  }
  function saydoSectionHtml(pid) {
    ensureStyles();
    bindGateway();
    if (!pid) return '';
    return '<section class="pdxor pdxsd" data-pdxc-saydo-pid="' + esc(pid) + '" aria-label="Say-vs-Do by stance">' + _sdInner(pid) + '</section>';
  }

  // ── Official Record vs Say-vs-Do DIVERGENCE (Phase 8) ───────────────────────
  // The explicit accountability tell: do a member's formal voting record (🏛️
  // Official Record %) and their broader public-record integrity (🧾 Say-vs-Do %)
  // tell the SAME story, or different ones? We NEVER blend the two into a single
  // "honesty" number — we place the two honest percentages side by side and label
  // only the RELATIONSHIP between them. Each side keeps its own boundary and its own
  // thin-data floor (a side with no real % simply isn't compared), so the contrast
  // can never manufacture false certainty. Neutral labels describe agreement between
  // the two records, not whether the politician is "good" — the raw numbers, always
  // shown, carry that.
  //   |gap| ≤ 15            → Aligned   (same story)
  //   15 < |gap| ≤ 35       → Mixed     (mostly lines up, some daylight)
  //   |gap| > 35            → Diverges  (different stories — the tell)
  var DIV_ALIGN_MAX = 15, DIV_MIXED_MAX = 35;
  var DIV_REL = {
    aligned:  { key: 'aligned',  label: 'Aligned',  ico: '=', color: '#6ee7a0', blurb: 'Their votes and their public record tell the same story here.' },
    mixed:    { key: 'mixed',    label: 'Mixed',    ico: '≈', color: '#93c5fd', blurb: 'Their votes and public record mostly line up, with some daylight.' },
    diverges: { key: 'diverges', label: 'Diverges', ico: '≠', color: '#f5c842', blurb: 'Their votes and their public record tell different stories here.' }
  };
  function divRel(gap) {
    var g = Math.abs(gap);
    if (g <= DIV_ALIGN_MAX) return DIV_REL.aligned;
    if (g <= DIV_MIXED_MAX) return DIV_REL.mixed;
    return DIV_REL.diverges;
  }
  // Which side reads higher (only meaningful once past "Aligned"). gap = official − saydo.
  function _divDir(gap) {
    if (Math.abs(gap) <= DIV_ALIGN_MAX) return '';
    return gap > 0 ? 'Official Record reads higher' : 'Say-vs-Do reads higher';
  }
  // Pair every issue where BOTH systems produced a real % (missing/thin sides are
  // excluded from the head-to-head and only counted as "one-sided"). Biggest gap first.
  function divergenceData(pid) {
    var set = {};
    try { issuesWithSignal(pid, 'official').forEach(function (k) { set[k] = 1; }); } catch (e) {}
    try { issuesWithSignal(pid, 'saydo').forEach(function (k) { set[k] = 1; }); } catch (e) {}
    var both = [], oneSide = 0;
    Object.keys(set).forEach(function (k) {
      var o = officialIssue(pid, k), s = saydoIssue(pid, k);
      var oNum = typeof o.score === 'number', sNum = typeof s.score === 'number';
      if (oNum && sNum) both.push({ key: k, off: o, say: s, gap: o.score - s.score });
      else if (oNum || sNum) oneSide++;
    });
    both.sort(function (a, b) { return Math.abs(b.gap) - Math.abs(a.gap); });
    var counts = { aligned: 0, mixed: 0, diverges: 0 };
    both.forEach(function (p) { counts[divRel(p.gap).key]++; });
    return { both: both, oneSide: oneSide, counts: counts };
  }

  function _divNum(icon, pct, color, label) {
    return '<span class="pdxdv-num" title="' + esc(label) + '"><span class="pdxdv-num-ic" aria-hidden="true">' + icon + '</span>' +
      '<span class="pdxdv-num-pct" style="color:' + color + '">' + pct + '%</span></span>';
  }
  function _divRelChip(rel) {
    return '<span class="pdxdv-rel" style="color:' + rel.color + ';border-color:' + rel.color + '55;background:' + rel.color + '1f;" title="' + esc(rel.blurb) + '">' + rel.ico + ' ' + rel.label + '</span>';
  }
  function _divRow(p) {
    var rel = divRel(p.gap), dir = _divDir(p.gap), g = Math.abs(p.gap);
    return '<div class="pdxdv-row">' +
        '<div class="pdxdv-row-lbl">' + esc(_issueLabel(p.key)) + '</div>' +
        '<div class="pdxdv-row-body">' +
          '<span class="pdxdv-nums">' +
            _divNum('🏛️', p.off.score, p.off.verdict.color, 'Official Record — vote-based') +
            '<span class="pdxdv-vs" aria-hidden="true">vs</span>' +
            _divNum('🧾', p.say.score, p.say.verdict.color, 'Say-vs-Do — public-record integrity') +
          '</span>' +
          _divRelChip(rel) +
          (g > DIV_ALIGN_MAX ? '<span class="pdxdv-gap">' + g + ' pt gap' + (dir ? ' · ' + dir : '') + '</span>' : '') +
        '</div>' +
      '</div>';
  }
  function _dvInner(pid) {
    var d = divergenceData(pid);
    var oOv = scopedOverall('official', pid), sOv = scopedOverall('saydo', pid);
    var oNum = typeof oOv.score === 'number', sNum = typeof sOv.score === 'number';

    // Whole-profile summary: the two overall numbers side by side + a relationship
    // label. Explicitly NOT a blended score — both numbers stay visible and separate.
    var sumInner;
    if (oNum && sNum) {
      sumInner = '<span class="pdxdv-sum-nums">' +
          _divNum('🏛️', oOv.score, oOv.verdict.color, 'Official Record overall — vote-based') +
          '<span class="pdxdv-vs" aria-hidden="true">vs</span>' +
          _divNum('🧾', sOv.score, sOv.verdict.color, 'Say-vs-Do overall — public-record integrity') +
        '</span>' + _divRelChip(divRel(oOv.score - sOv.score));
    } else {
      sumInner = '<span class="pdxdv-sum-na">Only one side has a percentage so far — no whole-profile comparison yet.</span>';
    }

    var head =
      '<div class="pdxdv-head"><span class="pdxdv-title"><span aria-hidden="true">⚖️</span> Record vs. Public Picture</span>' +
        '<span class="pdxdv-sum">' + sumInner + '</span></div>' +
      '<div class="pdxdv-q">Do their <b>🏛️ Official Record</b> (votes) and their <b>🧾 Say-vs-Do</b> (public record) tell the same story? This only compares the two honest scores — it never blends them into one.</div>';

    if (!d.both.length) {
      var msg = d.oneSide > 0
        ? 'Not enough overlap yet — ' + d.oneSide + ' issue' + (d.oneSide === 1 ? '' : 's') + ' ' + (d.oneSide === 1 ? 'has' : 'have') + ' a percentage on only one side so far, so there\'s nothing to line up head-to-head.'
        : 'No issues carry both a voting record and a public-record integrity score yet.';
      return head + '<div class="pdxdv-empty">' + esc(msg) + '</div>';
    }

    var c = d.counts, chips = [];
    if (c.aligned) chips.push('<b style="color:' + DIV_REL.aligned.color + '">' + c.aligned + '</b> aligned');
    if (c.mixed) chips.push('<b style="color:' + DIV_REL.mixed.color + '">' + c.mixed + '</b> mixed');
    if (c.diverges) chips.push('<b style="color:' + DIV_REL.diverges.color + '">' + c.diverges + '</b> diverging');
    var tally = chips.length
      ? '<div class="pdxdv-tally">Across ' + d.both.length + ' issue' + (d.both.length === 1 ? '' : 's') + ' on both records: ' + chips.join(' · ') + '.</div>'
      : '';

    var rows = d.both.map(_divRow).join('');
    var note = d.oneSide > 0
      ? '<div class="pdxdv-note">➕ ' + d.oneSide + ' more issue' + (d.oneSide === 1 ? '' : 's') + ' ' + (d.oneSide === 1 ? 'has' : 'have') + ' a score on only one side — kept in their own feeds, not compared here.</div>'
      : '';

    return head + tally + '<div class="pdxdv-rows">' + rows + '</div>' + note;
  }
  var _divergenceInner = _dvInner; // alias used by the warm-refresh listener
  function divergenceSectionHtml(pid) {
    ensureStyles();
    bindGateway();
    if (!pid) return '';
    return '<section class="pdxdv" data-pdxc-divergence-pid="' + esc(pid) + '" aria-label="Official Record vs Say-vs-Do divergence">' + _dvInner(pid) + '</section>';
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
    // Migrated formal-action feeder (Phase 3): the curated 'voting' receipts, now
    // reassigned to the Official Record. Exposed for reporting / debugging.
    officialActions: {
      stats: function () { var i = buildOfficialActions(); return { count: i.count, politicians: i.politicians, backfilled: i.backfilled }; },
      forIssue: officialActionsFor,
      issues: officialActionIssues
    },
    chipHtml: chipHtml,
    dot: dot,
    legendHtml: legendHtml,
    gatewayHtml: gatewayHtml,
    officialRecordSectionHtml: officialRecordSectionHtml,
    saydoSectionHtml: saydoSectionHtml,
    // Phase 8: the explicit Official Record vs Say-vs-Do divergence. divergence()
    // returns the raw comparison data; divergenceSectionHtml() the mountable view.
    divergence: divergenceData,
    divergenceSectionHtml: divergenceSectionHtml,
    warm: queueWarm,
    label: function (t) { return (VERDICTS[t] || VERDICTS.no_record).label; },
    icon: function (t) { return (VERDICTS[t] || VERDICTS.no_record).ico; },
    meta: function (t) { return VERDICTS[t] || VERDICTS.no_record; }
  };

  try { if (document.readyState !== 'loading') ensureStyles(); else document.addEventListener('DOMContentLoaded', ensureStyles); } catch (e) {}
})();
