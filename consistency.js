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

  // ── In-context education (window.PDXLearn, pdx-learn.js) ────────────────────
  // Guarded exactly as in voting-record.js: with the education layer absent, LT()
  // is plain escaped text and LHOWTO() is nothing, so every surface below renders
  // as it did before. No verdict, score or scope boundary depends on these.
  function LT(key, text) {
    var L = window.PDXLearn;
    return (L && L.term) ? L.term(key, text) : esc(text);
  }
  function LHOWTO(id, label) {
    var L = window.PDXLearn;
    return (L && L.howto) ? L.howto(id, label) : '';
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
    'carl_albrecht||reliable rancher and water advocate for central utah': 'water',
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
    'emendenhall||delivered on the environmental brand': 'climate_action',
    // Phase 10 coverage recovery — two previously no-key formal actions with a clear,
    // single-issue nexus (both landmark health-coverage measures → healthcare). The
    // other ~21 no-key voting items stay UNRESOLVED on purpose: they are electoral,
    // leadership, biographical, pattern-summary or multi-issue, with no defensible
    // single ISSUE_MAP key — forcing them would be exactly the false coverage we avoid.
    'gwbush||pepfar a global aids program credited with saving millions': 'healthcare',
    'snider_h5||passed firefighter cancer coverage law as a volunteer firefighter himself': 'healthcare'
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

  // ── how much record sits behind ONE issue's percentage ──────────────────────
  // The count of JUDGED items — exactly the denominator scoreFromRecord divides by
  // (and, for the formal-actions branch, the denominator that branch divides by), so
  // a weight can never disagree with the percentage it is weighting. Returns null
  // when nothing was judged; those issues carry score null and the roll-up already
  // skips them.
  function judgedCountOf(v) {
    if (!v) return null;
    if (v.record) {
      var n = (v.record.consistent || 0) + (v.record.contradicts || 0);
      if (n > 0) return n;
    }
    if (v.officialActions) {
      var a = (v.officialActions.consistent || 0) + (v.officialActions.contradicts || 0);
      if (a > 0) return a;
    }
    return null;
  }

  // ── the overall roll-up: ONE verdict per politician, per scope ──────────────
  function scopedOverall(scope, pid, issueKeys) {
    var per = scope === 'official' ? officialIssue : scope === 'saydo' ? saydoIssue : issueVerdict;
    var keys = (issueKeys && issueKeys.length) ? issueKeys : issuesWithSignal(pid, scope);
    var counts = { consistent: 0, contradicts: 0, mixed: 0, flag: 0, limited: 0, none: 0, pending: 0 };
    var scoreSum = 0, scoreN = 0, contradictions = 0, anyPending = false;
    var wSum = 0, wN = 0;      // judged-vote-weighted numerator / denominator
    var sdSup = 0, sdCon = 0; // Say-vs-Do pooled directional evidence (Phase 7)
    keys.forEach(function (k) {
      var v = per(pid, k);
      counts[bucketOf(v.token)]++;
      contradictions += v.contradictions || 0;
      if (v.pending) anyPending = true;
      if (typeof v.score === 'number') {
        scoreSum += v.score; scoreN++;
        // An issue counts in proportion to the record behind it. Fall back to 1 (the
        // old equal-weight behaviour) rather than dropping the issue, so a scored
        // issue is never silently excluded from its own member's number.
        var w = judgedCountOf(v);
        if (!(typeof w === 'number' && w > 0)) w = 1;
        wSum += v.score * w; wN += w;
      }
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
      // Official/combined = the vote-based average, WEIGHTED BY JUDGED VOTES so an
      // issue decided by one vote no longer counts as much as one decided by ten.
      // (Say-vs-Do keeps its own pooled public-record integrity % — never blended.)
      score: (scope === 'saydo') ? (sdScore ? sdScore.pct : null) : (wN ? Math.round(wSum / wN) : null),
      // The old equal-weight mean, kept alongside so the change is disclosable rather
      // than silent: the composition line shows both when they disagree, and the
      // self-test asserts on the difference.
      unweightedScore: (scope === 'saydo') ? null : (scoreN ? Math.round(scoreSum / scoreN) : null),
      judgedTotal: (scope === 'saydo') ? null : wN,
      weighting: (scope === 'saydo') ? null : 'judged-votes',
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
      // Phase 11 — gateway "How we score this" link.
      '.pdxc-gate-method{display:inline-block;margin-top:0.7rem;font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.68rem;letter-spacing:0.03em;text-transform:uppercase;color:#9fb4d4;cursor:pointer;background:none;border:none;padding:0.1rem 0;text-decoration:underline;text-underline-offset:2px;}' +
      '.pdxc-gate-method:hover{color:#c6d4ec;}' +
      '.pdxc-gate-method:focus-visible{outline:2px solid #7fb4ff;outline-offset:2px;}' +
      // Row holding the two footer links: our own methodology explainer and the
      // education layer's "How to read this" pill. margin-top lives here now, so
      // the two never collide when the pill is present (and the row collapses
      // harmlessly to just the one button when it is not).
      '.pdxc-gate-actions{display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem 0.9rem;margin-top:0.7rem;}' +
      '.pdxc-gate-actions .pdxc-gate-method{margin-top:0;}' +
      // By-issue Official Record view (the organized dive-in).
      '.pdxor{font-family:"Barlow Condensed",sans-serif;}' +
      '.pdxor-head{display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem;}' +
      '.pdxor-title{display:inline-flex;align-items:center;gap:0.4rem;font-family:"Bebas Neue",sans-serif;font-size:1.2rem;letter-spacing:0.03em;color:#e8eefc;}' +
      '.pdxor-q{font-style:italic;font-size:0.76rem;color:#c6d4ec;margin:0.2rem 0 0.6rem;line-height:1.3;}' +
      // Phase 10 honest coverage disclosure line (Official Record / Say-vs-Do / divergence).
      '.pdxcov{font-size:0.68rem;color:#8fa2c0;line-height:1.4;margin:0 0 0.6rem;padding:0.3rem 0.5rem;border-radius:0.5rem;background:rgba(159,180,212,0.06);border:1px solid rgba(159,180,212,0.14);cursor:help;}' +
      '.pdxcov b{color:#c6d4ec;font-weight:700;}' +
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
      // Omnibus provenance: a quiet second line under an act, disclosing that the
      // verdict above came from a bill that also did other things. Muted on purpose —
      // it qualifies the receipt, it does not compete with it.
      '.pdxor-omni{display:block;font-size:0.64rem;color:#93a6c4;line-height:1.4;margin-top:0.2rem;}' +
      '.pdxor-omni b{color:#c6d4ec;font-weight:700;}' +
      '.pdxor-omnichip{display:inline-flex;align-items:center;gap:0.2rem;font-size:0.6rem;font-weight:700;color:#93a6c4;border:1px dashed rgba(147,166,196,0.4);border-radius:999px;padding:0.05rem 0.4rem;white-space:nowrap;cursor:help;}' +
      // ── Stance-row proof (Says · Record · which vote) ────────────────────────
      // The row is a <details>: the summary carries the scannable answer (stated
      // position, what the record shows, the decisive bill), the body carries every
      // mapped vote and the deep links. Native disclosure, so keyboard, screen-reader
      // and find-in-page behaviour come for free and no JS is needed to open a row.
      '.pdxor-row>summary{list-style:none;cursor:pointer;display:block;}' +
      '.pdxor-row>summary::-webkit-details-marker{display:none;}' +
      '.pdxor-row>summary::marker{content:"";}' +
      '.pdxor-row>summary:focus-visible{outline:2px solid #7fb4ff;outline-offset:3px;border-radius:0.4rem;}' +
      '.pdxor-row[open]{border-color:rgba(255,255,255,0.16);background:rgba(10,15,30,0.5);}' +
      '.pdxor-caret{margin-left:auto;flex-shrink:0;font-size:0.7rem;color:#7e93b3;transition:transform .15s ease;}' +
      '.pdxor-row[open] .pdxor-caret{transform:rotate(180deg);}' +
      '@media (prefers-reduced-motion:reduce){.pdxor-caret{transition:none;}}' +
      // The "Says: Supports" chip's honest counterpart — no stated position to check
      // the mapped votes against. Dashed so it never reads as a stated stance.
      '.pdxor-stance-none{border-style:dashed;font-weight:600;}' +
      // "Record: …" chip. Slightly wider tracking than a bare verdict chip because it
      // now carries a label AND a value, and the two must not run together.
      '.pdxor-recchip{cursor:help;}' +
      // The proof line: which bill, which question, which way they voted. Always
      // visible — this is the whole point of the row, not a detail behind a tap.
      '.pdxor-proofs{margin-top:0.35rem;display:flex;flex-direction:column;gap:0.2rem;}' +
      '.pdxor-proof{display:flex;align-items:baseline;gap:0.35rem;font-size:0.7rem;color:#c6d4ec;line-height:1.4;}' +
      '.pdxor-proof-ico{flex-shrink:0;font-size:0.72rem;}' +
      '.pdxor-proof-txt{min-width:0;}' +
      '.pdxor-proof-bill{color:#e8eefc;font-weight:700;letter-spacing:0.01em;}' +
      '.pdxor-proof-txt b{color:#e8eefc;font-weight:700;}' +
      // The multi-issue slice, e.g. "Yea counted for Lower Taxes / against Health
      // Care". Its own line so a long pairing never squeezes the bill name.
      '.pdxor-proof-multi{display:block;font-size:0.64rem;color:#93a6c4;line-height:1.4;margin-top:0.1rem;}' +
      // A proof line that names a roll call is also the way TO that roll call. It sits
      // inside the row's <summary>, so it must not look like the row's own expand
      // control: the arrow only appears on hover/tap, and the whole line gets a soft
      // hover plate so the tap target is obvious without adding a border to every row.
      '.pdxor-proof-act{cursor:pointer;border-radius:0.4rem;margin:0 -0.3rem;padding:0.12rem 0.3rem;transition:background 0.12s ease;}' +
      '.pdxor-proof-act:hover{background:rgba(127,180,255,0.1);}' +
      '.pdxor-proof-act:hover .pdxor-proof-bill{color:#bcd8ff;}' +
      '.pdxor-proof-go{flex-shrink:0;margin-left:auto;font-size:0.68rem;color:#7fb4ff;opacity:0;transition:opacity 0.12s ease;}' +
      '.pdxor-proof-act:hover .pdxor-proof-go{opacity:1;}' +
      '@media (hover:none){.pdxor-proof-go{opacity:0.6;}}' +
      '@media (prefers-reduced-motion:reduce){.pdxor-proof-act,.pdxor-proof-go{transition:none;}}' +
      // Why a verdict is a shrug — shown inside the opened row, where there is room.
      '.pdxor-why{font-size:0.68rem;color:#9fb4d4;line-height:1.5;margin:0.45rem 0 0.1rem;padding:0.35rem 0.5rem;border-radius:0.45rem;background:rgba(159,180,212,0.06);border:1px solid rgba(159,180,212,0.14);}' +
      '.pdxor-acts-open{margin-top:0.35rem;}' +
      '.pdxor-act-more{color:#7e93b3;font-style:italic;}' +
      // The keyboard-reachable twin of the proof line: each mapped vote's bill number,
      // inside the opened row, as a real button to that exact card. Styled as the text
      // it replaced so the list still scans as a list.
      '.pdxor-act-go{background:none;border:none;padding:0;margin:0;font:inherit;color:#cfe0f8;cursor:pointer;text-align:left;}' +
      '.pdxor-act-go:hover{color:#a9ceff;text-decoration:underline;text-underline-offset:2px;}' +
      '.pdxor-act-go:focus-visible{outline:2px solid #7fb4ff;outline-offset:2px;border-radius:0.25rem;}' +
      // Deep link out of the row into the full Voting Record, pre-filtered to the issue.
      '.pdxor-vrlink{display:inline-block;margin-top:0.45rem;background:none;border:none;padding:0.2rem 0;cursor:pointer;font-family:inherit;font-size:0.68rem;font-weight:700;letter-spacing:0.02em;color:#7fb4ff;text-align:left;}' +
      '.pdxor-vrlink:hover{color:#a9ceff;text-decoration:underline;text-underline-offset:2px;}' +
      '.pdxor-vrlink:focus-visible{outline:2px solid #7fb4ff;outline-offset:2px;border-radius:0.3rem;}' +
      // "No votes yet" stances, listed rather than only counted.
      '.pdxor-awaiting-d>summary{list-style:none;cursor:pointer;}' +
      '.pdxor-awaiting-d>summary::-webkit-details-marker{display:none;}' +
      '.pdxor-await-body{margin-top:0.45rem;}' +
      '.pdxor-issue-await{padding:0.4rem 0.55rem;margin-bottom:0.35rem;background:rgba(10,15,30,0.25);}' +
      // The section's entry line: how much record there is, and the way into it. Full
      // width and left-aligned so the count reads as a sentence, with the call to
      // action pinned right on wide screens and wrapping under it on narrow ones.
      '.pdxor-mapsum{display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;width:100%;margin:0.5rem 0 0.1rem;padding:0.4rem 0.55rem;background:rgba(127,180,255,0.07);border:1px solid rgba(127,180,255,0.18);border-radius:0.5rem;font-family:inherit;font-size:0.72rem;color:#cfe0f8;text-align:left;cursor:pointer;}' +
      '.pdxor-mapsum:hover{background:rgba(127,180,255,0.12);border-color:rgba(127,180,255,0.3);}' +
      '.pdxor-mapsum:focus-visible{outline:2px solid #7fb4ff;outline-offset:2px;}' +
      '.pdxor-mapsum-flat{cursor:default;}' +
      '.pdxor-mapsum-ico{flex-shrink:0;font-size:0.8rem;}' +
      '.pdxor-mapsum-txt{min-width:0;}' +
      '.pdxor-mapsum-go{margin-left:auto;flex-shrink:0;font-weight:700;letter-spacing:0.02em;color:#7fb4ff;white-space:nowrap;}' +
      // Mobile: keep rows scannable. The issue name takes its own full-width line so
      // the chips below it stay on one row instead of each wrapping to its own, the
      // caret pins to the name's line, and every tap target keeps a comfortable
      // height without growing the row.
      '@media (max-width:480px){' +
        '.pdxor-issue{padding:0.5rem 0.55rem;}' +
        '.pdxor-issue-top{gap:0.3rem 0.35rem;}' +
        '.pdxor-issue-lbl{flex:1 0 100%;min-width:0;font-size:0.8rem;}' +
        '.pdxor-caret{margin-left:0;position:absolute;right:0.55rem;top:0.5rem;}' +
        '.pdxor-row{position:relative;}' +
        '.pdxor-row>summary .pdxor-issue-lbl{padding-right:1.1rem;}' +
        '.pdxor-proof{font-size:0.68rem;}' +
        '.pdxor-proof-multi{font-size:0.62rem;}' +
        // The proof line is a tap target, so give it height and keep the arrow
        // permanently visible — there is no hover to reveal it on.
        '.pdxor-proof-act{padding:0.3rem 0.3rem;margin:0 -0.3rem;}' +
        '.pdxor-proof-go{opacity:0.6;align-self:center;}' +
        // Entry line: the count on its own line, the call to action beneath it, both
        // full width so neither is squeezed to two words per line.
        '.pdxor-mapsum{padding:0.5rem 0.55rem;font-size:0.7rem;}' +
        '.pdxor-mapsum-txt{flex:1 1 auto;}' +
        '.pdxor-mapsum-go{margin-left:0;flex:1 0 100%;}' +
        '.pdxor-vrlink{padding:0.35rem 0;}' +
      '}' +
      '.pdxor-empty{font-size:0.76rem;color:#9fb4d4;padding:0.7rem 0.2rem;line-height:1.4;}' +
      // Second, quieter line under an empty state: what an empty record actually
      // means. Muted on purpose — it explains the absence, it isn't a finding.
      '.pdxor-empty-why{font-size:0.68rem;color:#7d90ad;line-height:1.5;margin-top:0.35rem;}' +
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
      // Composition / confidence indicator ON the Official Record % (annotation only —
      // it never changes the number). Three-segment depth meter + an optional short
      // word when the read is thin or mostly multi-issue.
      '.pdxor-comp{display:inline-flex;align-items:center;gap:0.25rem;cursor:help;}' +
      '.pdxor-comp-bar{display:inline-flex;align-items:flex-end;gap:1.5px;height:0.62rem;}' +
      '.pdxor-comp-bar i{display:block;width:3px;border-radius:1px;background:rgba(159,180,212,0.22);}' +
      '.pdxor-comp-bar i:nth-child(1){height:45%;}' +
      '.pdxor-comp-bar i:nth-child(2){height:72%;}' +
      '.pdxor-comp-bar i:nth-child(3){height:100%;}' +
      '.pdxor-comp-bar i.pdxor-comp-on{background:#8fa9cf;}' +
      '.pdxor-comp-single .pdxor-comp-bar i.pdxor-comp-on{background:#e0a458;}' +
      '.pdxor-comp-limited .pdxor-comp-bar i.pdxor-comp-on{background:#d8c169;}' +
      '.pdxor-comp-solid .pdxor-comp-bar i.pdxor-comp-on{background:#7fbf9a;}' +
      '.pdxor-comp-note{font-family:"Barlow Condensed",sans-serif;font-size:0.58rem;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;line-height:1.2;color:#c6a15b;}' +
      '.pdxor-comp-solid .pdxor-comp-note{color:#8fa2c0;}' +
      // Composition, not just depth: mark the reads that are mainly multi-issue bills
      // with the same 🧩 the omnibus surfaces already use.
      '.pdxor-comp-omni .pdxor-comp-note::before{content:"\\01F9E9 ";}' +
      '.pdxor-compsum{font-family:"Barlow Condensed",sans-serif;font-size:0.58rem;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;line-height:1.25;color:#8fa2c0;max-width:9rem;text-align:left;cursor:help;}' +
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
      // The Official Record panel's composition markup, reused verbatim in the tighter
      // comparison rows (Phase 12). Only the footprint is constrained — the note stays
      // visible text rather than becoming hover-only, it just can't crowd out the two
      // numbers the row exists to compare.
      '.pdxdv-nums .pdxor-comp{flex:0 0 auto;}' +
      '.pdxdv-nums .pdxor-comp-note{max-width:5.4rem;white-space:normal;}' +
      '.pdxdv-sum-nums .pdxor-compsum{max-width:11rem;}' +
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
      // Phase 9 — tappable comparison rows + cross-links + the focused gap sheet.
      '.pdxdv-row-tap{display:block;width:100%;text-align:left;font:inherit;color:inherit;cursor:pointer;-webkit-appearance:none;appearance:none;}' +
      '.pdxdv-row-tap:hover{border-color:rgba(255,255,255,0.22);background:rgba(10,15,30,0.55);}' +
      '.pdxdv-row-tap:focus-visible{outline:2px solid #7fb4ff;outline-offset:2px;}' +
      '.pdxdv-row-why{display:block;margin-top:0.4rem;font-weight:700;font-size:0.66rem;letter-spacing:0.03em;text-transform:uppercase;color:#9fdbd0;}' +
      '.pdxdv-open{display:inline-flex;align-items:center;gap:0.25rem;margin-top:0.5rem;font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.66rem;letter-spacing:0.03em;text-transform:uppercase;color:var(--c,#9fdbd0);cursor:pointer;background:rgba(10,15,30,0.4);border:1px solid var(--c,#9fdbd0);border-radius:999px;padding:0.16rem 0.55rem;}' +
      '.pdxdv-open:hover{filter:brightness(1.15);}' +
      '.pdxdv-open:focus-visible{outline:2px solid #7fb4ff;outline-offset:2px;}' +
      '.pdxgap-back{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;background:rgba(4,7,16,0.72);backdrop-filter:blur(2px);}' +
      '.pdxgap-back[hidden]{display:none;}' +
      '.pdxgap-sheet{position:relative;width:100%;max-width:640px;max-height:88vh;overflow-y:auto;-webkit-overflow-scrolling:touch;background:linear-gradient(180deg,#141a2c,#0c111e);border:1px solid rgba(255,255,255,0.12);border-radius:1rem 1rem 0 0;padding:1rem 0.95rem 1.4rem;box-shadow:0 -12px 40px rgba(0,0,0,0.5);font-family:"Barlow Condensed",sans-serif;animation:pdxgapUp .18s ease;}' +
      '@keyframes pdxgapUp{from{transform:translateY(14px);opacity:0.6;}to{transform:translateY(0);opacity:1;}}' +
      '@media (prefers-reduced-motion:reduce){.pdxgap-sheet{animation:none;}}' +
      '@media (min-width:560px){.pdxgap-back{align-items:center;}.pdxgap-sheet{border-radius:1rem;}}' +
      '.pdxgap-x{position:absolute;top:0.6rem;right:0.7rem;width:2rem;height:2rem;border-radius:50%;border:1px solid rgba(255,255,255,0.15);background:rgba(10,15,30,0.6);color:#c6d4ec;font-size:1.2rem;line-height:1;cursor:pointer;}' +
      '.pdxgap-x:hover{background:rgba(10,15,30,0.9);}' +
      '.pdxgap-eyebrow{font-weight:700;font-size:0.62rem;letter-spacing:0.06em;text-transform:uppercase;color:#7e93b3;}' +
      '.pdxgap-title{font-family:"Bebas Neue",sans-serif;font-size:1.5rem;letter-spacing:0.02em;color:#e8eefc;line-height:1;margin:0.15rem 0 0.4rem;padding-right:2rem;}' +
      '.pdxgap-meta{display:flex;flex-wrap:wrap;align-items:center;gap:0.4rem;}' +
      '.pdxgap-note{font-size:0.74rem;color:#c6d4ec;line-height:1.4;margin-top:0.45rem;}' +
      '.pdxgap-note b{color:#f5d9a0;}' +
      '.pdxgap-sides{display:flex;flex-direction:column;gap:0.6rem;margin-top:0.8rem;}' +
      '@media (min-width:560px){.pdxgap-sides{flex-direction:row;}.pdxgap-side{flex:1;min-width:0;}}' +
      '.pdxgap-side{border:1px solid rgba(255,255,255,0.1);border-radius:0.7rem;padding:0.65rem 0.7rem;background:rgba(10,15,30,0.4);}' +
      '.pdxgap-side-h{display:flex;align-items:center;justify-content:space-between;gap:0.5rem;}' +
      '.pdxgap-side-name{display:inline-flex;align-items:center;gap:0.35rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;font-size:0.76rem;color:#e8eefc;}' +
      '.pdxgap-pct{font-family:"Bebas Neue",sans-serif;font-size:1.4rem;line-height:0.9;}' +
      '.pdxgap-side-sub{font-size:0.66rem;color:#8fa2c0;line-height:1.35;margin:0.25rem 0 0.5rem;}' +
      '.pdxgap-omni{color:#93a6c4;border-left:2px solid rgba(147,166,196,0.3);padding-left:0.45rem;}' +
      '.pdxgap-acts{display:flex;flex-direction:column;}' +
      '.pdxgap-acts .pdxor-act{border-top:1px solid rgba(255,255,255,0.06);}' +
      '.pdxgap-acts .pdxor-act:first-child{border-top:none;}' +
      '.pdxgap-side-empty{font-size:0.72rem;color:#9fb4d4;line-height:1.4;padding:0.3rem 0;}' +
      '.pdxgap-foot{font-size:0.66rem;color:#7e93b3;line-height:1.4;margin-top:0.85rem;padding-top:0.6rem;border-top:1px solid rgba(255,255,255,0.08);}' +
      // Phase 11 — methodology explainer content (rendered inside the shared sheet).
      '.pdxm-lead{font-size:0.8rem;color:#c6d4ec;line-height:1.45;margin:0.5rem 0 0.8rem;}' +
      '.pdxm-row{border-top:1px solid rgba(255,255,255,0.08);padding:0.6rem 0;}' +
      '.pdxm-row-h{display:flex;align-items:center;gap:0.4rem;font-weight:700;font-size:0.82rem;color:#e8eefc;}' +
      '.pdxm-row-b{font-size:0.75rem;color:#c6d4ec;line-height:1.5;margin-top:0.3rem;}' +
      '.pdxm-row-b b{color:#e8eefc;font-weight:700;}' +
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
        // Terms live in this line, not inside the two cards below: each card is a
        // <button>, and a definition button nested inside it would be invalid
        // markup and would swallow the card's own tap.
        '<div class="pdxc-gate-sub">Two separate ways to check whether their word holds up — kept apart on purpose. ' +
          '<b>🏛️ ' + LT('officialrecord', 'Official Record') + '</b> is the institutional score from their votes; ' +
          '<b>🧾 ' + LT('saydo', 'Say-vs-Do') + '</b> is the broader public picture. ' +
          'Discrete promises are tracked on their own.</div>' +
        '<div class="pdxc-gate-cards">' + _gateCard('official', pid) + _gateCard('saydo', pid) + '</div>' +
        '<div class="pdxc-gate-actions">' +
          '<button type="button" class="pdxc-gate-method" data-pdxc-method aria-label="How we score this — methodology">ⓘ How we score this</button>' +
          LHOWTO('say-vs-do', 'How to read this') +
        '</div>' +
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
      // Deep link from a named proof line to that ONE roll call. Checked before the
      // issue link because a proof line carries both: the vote it names, and the issue
      // to fall back to. preventDefault also stops the <summary> it sits in from
      // toggling, so tapping a bill opens the receipt instead of the row.
      var vrv = e.target.closest && e.target.closest('[data-pdxc-vrvote]');
      if (vrv) {
        e.preventDefault();
        _openVotingVote(vrv.getAttribute('data-pdxc-vrissue') || '',
          vrv.getAttribute('data-pdxc-vrvote') || '');
        return;
      }
      // Deep link from a stance row into the full Voting Record, filtered to that
      // issue. Checked before the gap link so a row can carry both.
      var vrl = e.target.closest && e.target.closest('[data-pdxc-vrissue]');
      if (vrl) {
        e.preventDefault();
        _openVotingIssue(vrl.getAttribute('data-pdxc-vrissue') || '');
        return;
      }
      // The section's own entry point: the whole record, no issue filter.
      var vra = e.target.closest && e.target.closest('[data-pdxc-vrall]');
      if (vra) { e.preventDefault(); _openVotingIssue(''); return; }
      var gap = e.target.closest && e.target.closest('[data-pdxc-gap]');
      if (gap) {
        e.preventDefault();
        openGap(gap.getAttribute('data-pdxc-gap-pid') || '', gap.getAttribute('data-pdxc-gap') || '');
        return;
      }
      var method = e.target.closest && e.target.closest('[data-pdxc-method]');
      if (method) { e.preventDefault(); openMethodology(); return; }
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
      // …and the Say-vs-Do feed, so its "compare vs the record" cross-links resolve
      // once the vote-based side has a % to compare against (Phase 9).
      var sds = document.querySelectorAll('[data-pdxc-saydo-pid]');
      for (var q = 0; q < sds.length; q++) {
        if (sds[q].getAttribute('data-pdxc-saydo-pid') !== String(pid)) continue;
        sds[q].innerHTML = _sdInner(pid);
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
  // Omnibus provenance chip for one (pid, issue): how much of this issue's verdict
  // rests on votes that were also about other things. Reads the shared helper the
  // Voting Record exposes (window._pdxRecordOmnibusStats), which in turn reads the
  // engine — so no scoring happens here and nothing shows when the record is
  // single-issue or not warm yet.
  function _orOmniChip(pid, issueKey) {
    try {
      if (typeof window._pdxRecordOmnibusStats !== 'function') return '';
      var st = window._pdxRecordOmnibusStats(pid, issueKey);
      if (!st || !st.any) return '';
      var tip = 'A multi-issue bill is judged separately on each issue it touched, so this ' +
        'verdict and a different verdict on another issue can come from the same roll call.' +
        (st.otherLabels.length ? ' Those bills also covered: ' + st.otherLabels.join(', ') + '.' : '');
      // The count is provenance (keep it on the title for pointer users); the phrase
      // "multi-issue bills" is the concept, so that part becomes a term — otherwise
      // this chip would be hover-only and dead on touch.
      return '<span class="pdxor-omnichip" title="' + esc(tip) + '">🧩 ' + st.omnibus + ' of ' + st.total +
        ' from ' + LT('omnibus', 'multi-issue bills') + '</span>';
    } catch (e) { return ''; }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SAY-VS-DO PROOF ON A STANCE ROW
  // ═══════════════════════════════════════════════════════════════════════════
  // A stance row used to end at a verdict label, so a thin record rendered as
  // "Limited voting record · 🧩 1 of 1 from multi-issue bills" — a count with no
  // subject. The reader never learned WHICH bill, which slice of it was mapped to
  // this issue, or which way the member actually voted. Everything below names that
  // proof, so each row answers four questions in order: what they say, what the
  // record shows, which vote backs it, and how confident that reading is.
  //
  // Nothing here scores, re-weights, filters or invents anything. Every field is read
  // from the SAME warm vr_* records and the SAME engine primitives the Official
  // Record % is already built from (_pdxRecordIssueSummary, _pdxRecordIssueItems,
  // _measureComponentBreakdown, _measureOmnibusContext). Each helper returns '' when
  // its source is unavailable, so a row degrades to exactly what it rendered before.
  function escAttr(v) { return esc(v).replace(/`/g, '&#96;'); }
  function _tc(s) {
    return String(s == null ? '' : s).replace(/[_-]+/g, ' ').trim()
      .replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
  }

  // ── Row-level record vocabulary ─────────────────────────────────────────────
  // Deliberately shorter and more concrete than the section-level SCOPES.empty copy:
  // a row is scanned, not read, and it already carries the issue name beside it. So
  // "Limited voting record" (which reads as a verdict on the member) becomes
  // "Record: Limited · 1 vote" (which reads as a fact about our data), and the reason
  // moves to the proof line underneath where there is room to state it.
  var _OR_ROW = {
    consistent:  { ico: '✓', label: 'Backed it up',   cls: 'consistent' },
    contradicts: { ico: '⚠', label: 'Contradicts',    cls: 'contradicts' },
    mixed:       { ico: '◑', label: 'Cuts both ways', cls: 'mixed' },
    limited:     { ico: '…', label: 'Limited',        cls: 'limited' },
    no_record:   { ico: '—', label: 'No votes yet',   cls: 'none' },
    no_stance:   { ico: '—', label: 'No votes yet',   cls: 'none' },
    pending:     { ico: '⏳', label: 'Checking record…', cls: 'pending' }
  };
  // Pure: an officialIssue() read → what the row's record chip should say, plus the
  // one-line reason when the verdict is a shrug. `why` is the piece that used to be
  // missing entirely: "Limited" has several distinct causes and they are not
  // interchangeable to a reader deciding whether to trust the row.
  function _orRowVerdict(ov) {
    var token = (ov && ov.token) || 'no_record';
    var m = _OR_ROW[token] || _OR_ROW.no_record;
    var rec = (ov && ov.record) || null;
    var acts = (ov && ov.officialActions) || null;
    var total = rec ? (rec.total || 0) : (acts ? (acts.total || 0) : 0);
    var why = '';
    if (token === 'limited') {
      if (rec && !rec.hasStance) {
        why = total === 1
          ? 'One vote is mapped to this issue, but they have not stated a position on it — so there is nothing to check the vote against.'
          : total + ' votes are mapped to this issue, but they have not stated a position on it — so there is nothing to check them against.';
      } else if (rec && rec.noPosition >= total && total > 0) {
        why = total === 1
          ? 'The one vote mapped here took no clear position on this issue.'
          : 'The ' + total + ' votes mapped here took no clear position on this issue.';
      } else {
        why = 'Not enough directional votes on this issue to call it either way yet.';
      }
    } else if (token === 'no_record' || token === 'no_stance') {
      why = 'They have stated a position, but no qualifying vote has been mapped to this issue yet. That is our coverage, not a verdict.';
    }
    return {
      key: token, ico: m.ico, label: m.label, cls: m.cls, why: why, total: total,
      // "1 vote" / "3 votes" beside a thin label turns a shrug into a fact.
      count: total ? (total + (total === 1 ? ' vote' : ' votes')) : ''
    };
  }
  function _orRecordChipHtml(ov) {
    var rv = _orRowVerdict(ov);
    var tail = (rv.key === 'limited' && rv.count) ? ' · ' + rv.count : '';
    var tip = rv.why || 'What their formal record shows on this issue, checked against the position they state.';
    return '<span class="pdxc-chip pdxc-' + rv.cls + ' pdxor-recchip" title="' + escAttr(tip) + '">' +
      rv.ico + ' Record: ' + esc(rv.label) + esc(tail) + '</span>';
  }
  // "What they say", with an honest fallback. When there is no stated position but
  // votes ARE mapped, the absence is usually the reason the verdict reads "Limited",
  // so name it instead of dropping the chip and leaving the reader to guess.
  function _orSaysChipHtml(pid, issueKey, ov) {
    var chip = _orStanceChip(pid, issueKey);
    if (chip) return chip;
    if (!(ov && ov.record && ov.record.total)) return '';
    return '<span class="pdxor-stance pdxor-stance-none" style="--c:#9fb4d4"' +
      ' title="Votes are mapped to this issue, but they have not stated a position we can check them against.">' +
      '💬 Says: Nothing stated yet</span>';
  }

  // ── One record → its printable proof fields ─────────────────────────────────
  // Pure; reads only fields the voting-record normalizer already sets. `question` is
  // the roll-call question a vote actually answered ("On Motion to Recommit"), which
  // is the piece that decides how a Yea should be read — a position's `action` is a
  // slug, so that one gets title-cased.
  function _orProofBits(item) {
    if (!item) return null;
    var src = item.source;
    var url = item.sourceUrl || (src && typeof src === 'object' ? src.url : '') || '';
    var lbl = item.sourceLabel || (src && typeof src === 'object' ? src.label : '') ||
      (typeof src === 'string' ? src : '') || 'Congress.gov';
    return {
      bill: item.number ? String(item.number) : '',
      title: item.title ? String(item.title) : '',
      question: item.action ? (item.kind === 'position' ? _tc(item.action) : String(item.action)) : '',
      position: item.position ? _tc(item.position) : '',
      date: item.date ? String(item.date) : '',
      url: url, label: lbl
    };
  }
  // The key the Voting Record card list labels its cards with, so a proof line can
  // point at ONE roll call rather than at the issue it belongs to. Owned by
  // voting-record.js (window._pdxRecordKey) precisely so the two sides cannot drift;
  // '' when that file isn't loaded, in which case the proof line still deep-links to
  // the issue-filtered list and nothing is lost but the ring.
  function _orVoteKey(item) {
    try {
      if (typeof window._pdxRecordKey !== 'function') return '';
      return window._pdxRecordKey(item) || '';
    } catch (e) { return ''; }
  }
  // "H.R. 22 · On Motion to Recommit · Voted Yea" — the bill, the question, the vote.
  // Falls back to the measure title when a record carries no number, so a row never
  // prints an empty proof. Pure, no HTML.
  function _orProofText(item) {
    var b = _orProofBits(item);
    if (!b) return '';
    var parts = [];
    if (b.bill) parts.push(b.bill);
    else if (b.title) parts.push(b.title);
    if (b.question) parts.push(b.question);
    if (b.position) parts.push('Voted ' + b.position);
    return parts.join(' · ');
  }
  // The multi-issue disclosure, compressed to row scale: "Yea counted for Lower
  // Taxes / against Health Care". Reads the same _measureOmnibusContext primitive the
  // longer prose note uses, so a single roll call landing opposite ways on two issues
  // is stated the same wherever it appears. '' for single-issue votes.
  function _orRowMultiNote(item, issueKey) {
    if (!item || typeof window._measureOmnibusContext !== 'function') return '';
    var ctx;
    try { ctx = window._measureOmnibusContext(item, issueKey, {}, { labelFn: _issueLabel }); }
    catch (e) { return ''; }
    if (!ctx) return '';
    var adv = [], opp = [];
    if (ctx.thisIssue) {
      if (ctx.thisIssue.effect === 'advances') adv.push(ctx.thisIssue);
      else if (ctx.thisIssue.effect === 'opposes') opp.push(ctx.thisIssue);
    }
    ctx.advances.forEach(function (c) { adv.push(c); });
    ctx.opposes.forEach(function (c) { opp.push(c); });
    var names = function (list) {
      var out = list.slice(0, 2).map(function (c) { return String(c.label); });
      if (list.length > 2) out.push('+' + (list.length - 2) + ' more');
      return out.join(', ');
    };
    var parts = [];
    if (adv.length) parts.push('for ' + names(adv));
    if (opp.length) parts.push('against ' + names(opp));
    if (!parts.length) return 'One vote, ' + ctx.count + ' issues — no clear position on any of them.';
    var lead = item.position ? _tc(item.position) + ' counted' : 'This vote counted';
    return lead + ' ' + parts.join(' / ');
  }
  // This record's verdict on THIS issue, via the same breakdown primitive the
  // aggregate uses — so a per-vote icon can never disagree with the row's own maths.
  function _orItemVerdict(item, issueKey, stance) {
    try {
      if (typeof window._measureComponentBreakdown !== 'function') return 'limited';
      var pm = {};
      if (stance) pm[issueKey] = { stance: stance };
      var brk = window._measureComponentBreakdown(item, pm, { labelFn: _issueLabel });
      for (var i = 0; i < brk.components.length; i++) {
        if (brk.components[i].issueKey !== issueKey) continue;
        var v = brk.components[i].verdict;
        return (v === 'consistent' || v === 'contradicts' || v === 'mixed') ? v : 'limited';
      }
    } catch (e) {}
    return 'limited';
  }
  // Which records a row should quote, decisive-first. The engine summary keeps only
  // the strongest vote each way, and on a thin row it keeps NEITHER — that is exactly
  // the case that used to render as a bare count, so we fall back to the raw mapped
  // records and name the bill anyway. De-duplicated, never re-ordered by verdict
  // beyond "contradiction before confirmation" (the sharper signal first).
  function _orProofPicks(pid, issueKey, ov, limit) {
    var picks = [], seen = {};
    var rec = (ov && ov.record) || null;
    if (!rec) return picks;
    var stance = rec.stance || null;
    var key = function (it) {
      return [it.rollcallId || '', it.measureId || '', it.number || '', it.date || '', it.action || ''].join('|');
    };
    var push = function (item, verdict) {
      if (!item || (limit && picks.length >= limit)) return;
      var k = key(item);
      if (seen[k]) return;
      seen[k] = 1;
      picks.push({ item: item, verdict: verdict || _orItemVerdict(item, issueKey, stance) });
    };
    push(rec.topContradiction, 'contradicts');
    push(rec.topConsistent, 'consistent');
    if (!limit || picks.length < limit) {
      var items = [];
      try {
        if (typeof window._pdxRecordIssueItems === 'function') items = window._pdxRecordIssueItems(pid, issueKey) || [];
      } catch (e) { items = []; }
      for (var i = 0; i < items.length; i++) push(items[i], null);
    }
    return picks;
  }
  // The compact, always-visible proof line(s) under a row's chips. `limit` is small on
  // purpose: one line for a deep record (the decisive vote), two when the whole record
  // IS one or two votes — those rows are precisely the ones that used to hide behind a
  // weak label, so they show their entire evidence base up front.
  //   Each line is also the shortest path to the receipt: a pointer click opens the
  // full Voting Record on that exact roll call. It is deliberately NOT focusable — it
  // lives inside a <summary>, where a second tab stop per row would compete with the
  // row's own expand control for the keyboard. Keyboard and screen-reader users get the
  // same destination from real buttons in the expanded body (see _orRowEvidenceHtml),
  // so the shortcut is additive rather than the only way through.
  function _orProofHtml(pid, issueKey, ov, limit) {
    var picks = _orProofPicks(pid, issueKey, ov, limit || 1);
    if (!picks.length) return '';
    return '<div class="pdxor-proofs">' + picks.map(function (p) {
      var mv = VERDICTS[p.verdict] || VERDICTS.limited;
      var txt = _orProofText(p.item);
      if (!txt) return '';
      var multi = _orRowMultiNote(p.item, issueKey);
      var b = _orProofBits(p.item);
      var bill = b.bill ? '<b class="pdxor-proof-bill">' + esc(b.bill) + '</b>' : '';
      var restBits = [];
      if (!b.bill && b.title) restBits.push(esc(b.title));
      if (b.question) restBits.push(esc(b.question));
      if (b.position) restBits.push('Voted <b>' + esc(b.position) + '</b>');
      var rest = restBits.length ? (bill ? ' · ' : '') + restBits.join(' · ') : '';
      return '<div class="pdxor-proof pdxor-proof-act"' +
          ' data-pdxc-vrvote="' + escAttr(_orVoteKey(p.item)) + '"' +
          ' data-pdxc-vrissue="' + escAttr(issueKey) + '"' +
          ' title="' + escAttr('Open ' + (txt || 'this vote') + ' in the full voting record') + '">' +
          '<span class="pdxor-proof-ico" style="color:' + mv.color + '" aria-hidden="true">' + mv.ico + '</span>' +
          '<span class="pdxor-proof-txt">' + bill + rest +
            (multi ? '<span class="pdxor-proof-multi">🧩 ' + esc(multi) + '</span>' : '') +
          '</span>' +
          '<span class="pdxor-proof-go" aria-hidden="true">→</span>' +
        '</div>';
    }).join('') + '</div>';
  }
  // Every record behind the row, expanded — the full mapped list rather than the
  // summary's strongest-each-way pair, so the count in the chip and the number of
  // lines here agree. Falls back to _orEvidenceItems when the raw records are not
  // reachable, so this can only ever add detail, never remove it.
  var _OR_ROW_EVIDENCE_MAX = 8;
  function _orRowEvidenceHtml(pid, issueKey, ov) {
    var lines = [], extra = '';
    if (ov && ov.officialActions && ov.officialActions.items) {
      ov.officialActions.items.forEach(function (a) {
        lines.push(_orActLine(a.verdict, a.headline || 'Formal action', a.date || '', a.sourceUrl, a.sourceLabel));
      });
    }
    var picks = _orProofPicks(pid, issueKey, ov, 0);
    if (picks.length > _OR_ROW_EVIDENCE_MAX) {
      extra = '<div class="pdxor-act pdxor-act-more">' +
        esc('+ ' + (picks.length - _OR_ROW_EVIDENCE_MAX) + ' more mapped ' +
          (picks.length - _OR_ROW_EVIDENCE_MAX === 1 ? 'vote' : 'votes') + ' — open the full record below.') + '</div>';
      picks = picks.slice(0, _OR_ROW_EVIDENCE_MAX);
    }
    picks.forEach(function (p) {
      var b = _orProofBits(p.item);
      var meta = [b.question, b.position ? 'Voted ' + b.position : '', b.date].filter(Boolean).join(' · ');
      lines.push(_orActLine(p.verdict, b.bill || b.title || 'Recorded vote',
        meta, b.url, b.label, _orOmniNote(p.item, issueKey),
        // Every mapped vote in the open row is a button to that exact roll call —
        // the keyboard-reachable version of the collapsed row's proof-line shortcut.
        { issue: issueKey, key: _orVoteKey(p.item) }));
    });
    if (!lines.length) lines = _orEvidenceItems(ov);
    if (!lines.length) return '';
    return '<div class="pdxor-acts-open">' + lines.join('') + extra + '</div>';
  }
  // "See all N mapped votes on <issue> →" — the deep link out of the row into the full
  // Voting Record, pre-filtered to this issue (see _pdxVotingRecordFocusIssue in
  // voting-record.js). Rendered only when that list actually has something to show.
  //   When the whole record on this issue IS one vote, the button says "open this vote"
  // and means it: it carries that vote's key and lands on the card itself, so the copy
  // and the destination agree.
  function _orRowVrLinkHtml(pid, issueKey, ov) {
    var total = (ov && ov.record) ? (ov.record.total || 0) : 0;
    if (!total) return '';
    var one = '';
    if (total === 1) {
      var picks = _orProofPicks(pid, issueKey, ov, 1);
      if (picks.length) one = _orVoteKey(picks[0].item);
    }
    var label = total === 1
      ? 'Open this vote in the full record →'
      : 'See all ' + total + ' mapped votes on ' + _issueLabel(issueKey) + ' →';
    return '<button type="button" class="pdxor-vrlink"' +
      (one ? ' data-pdxc-vrvote="' + escAttr(one) + '"' : '') +
      ' data-pdxc-vrissue="' + escAttr(issueKey) + '"' +
      ' data-pdxc-vrpid="' + escAttr(pid) + '">' + esc(label) + '</button>';
  }
  function _orWhyHtml(ov) {
    var rv = _orRowVerdict(ov);
    return rv.why ? '<div class="pdxor-why">' + esc(rv.why) + '</div>' : '';
  }
  // Jump into the full Voting Record, filtered to one issue when that section is live.
  // Falls back to a plain jump, then to a scroll — the link is never a dead end.
  // '' asks for the whole record, which also clears a filter an earlier row left set.
  function _openVotingIssue(issueKey) {
    try {
      if (typeof window._pdxVotingRecordFocusIssue === 'function' &&
          window._pdxVotingRecordFocusIssue(issueKey)) return;
    } catch (e) {}
    if (typeof window._pdxNavJump === 'function') { window._pdxNavJump('pdxsec-voting'); return; }
    var el = document.getElementById('pdxsec-voting');
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  // The same journey, aimed at ONE roll call: scroll to and ring that card. Every step
  // of the chain degrades to the next rather than to nothing —
  //   exact card → issue-filtered list → section jump → plain scroll
  // — so a reader who taps a named bill always arrives somewhere that explains itself,
  // even when the record for that vote hasn't been painted yet.
  function _openVotingVote(issueKey, voteKey) {
    try {
      if (voteKey && typeof window._pdxVotingRecordFocusVote === 'function' &&
          window._pdxVotingRecordFocusVote(issueKey, voteKey)) return;
    } catch (e) {}
    _openVotingIssue(issueKey);
  }

  // ── Composition / confidence indicator ON the Official Record % ─────────────
  // The % is consistent ÷ (consistent + contradicts), so a member whose entire
  // percentage on an issue rests on ONE omnibus vote used to render identically to a
  // member with several single-issue votes. This annotates the number — it never
  // changes it: a three-segment depth meter plus a short word when the read is thin
  // or mostly multi-issue. Every figure comes from _recordComposition, which is pure
  // counting over the same _issueRecordSummary counts and the same
  // _pdxRecordOmnibusStats tallies the chip beside it already uses.
  function _orCompMeterHtml(comp, lead) {
    var seg = '';
    for (var i = 1; i <= 3; i++) {
      seg += '<i class="' + (i <= comp.strength ? 'pdxor-comp-on' : 'pdxor-comp-off') + '"></i>';
    }
    var sentence = lead + ' ' + comp.detail;
    var note = comp.note
      ? '<span class="pdxor-comp-note">' + esc(comp.note) + '</span>'
      : '';
    // aria-label carries the whole sentence so this is not a hover-only signal;
    // the meter itself is decorative once the label says the same thing in words.
    return '<span class="pdxor-comp pdxor-comp-' + comp.level + (comp.omnibusDriven ? ' pdxor-comp-omni' : '') + '"' +
        ' title="' + esc(sentence) + '" aria-label="' + esc(sentence) + '">' +
      '<span class="pdxor-comp-bar" aria-hidden="true">' + seg + '</span>' + note +
    '</span>';
  }
  // Per-issue indicator, rendered immediately after that issue's %.
  function _orCompositionHtml(pid, issueKey, ov) {
    try {
      if (typeof window._recordComposition !== 'function') return '';
      if (!ov || typeof ov.score !== 'number' || !ov.record) return ''; // no % → nothing to qualify
      var stats = (typeof window._pdxRecordOmnibusStats === 'function')
        ? window._pdxRecordOmnibusStats(pid, issueKey) : null;
      var comp = window._recordComposition(ov.record, stats);
      if (!comp) return '';
      return _orCompMeterHtml(comp, 'How much record is behind this percentage:');
    } catch (e) { return ''; }
  }
  // Whole-panel indicator for the overall %. The overall is the judged-vote-WEIGHTED
  // mean of the per-issue percentages, so its confidence question is different from a
  // single issue's: how many issues went into it, how many of those are themselves
  // thin or omnibus-driven, and — when weighting actually moved the number — what the
  // old equal-weight mean would have said.
  function _orOverallCompositionHtml(pid, scored, overall) {
    try {
      if (typeof window._recordComposition !== 'function') return '';
      var rated = 0, thin = 0, omni = 0, single = 0;
      (scored || []).forEach(function (s) {
        if (!s || !s.ov || typeof s.ov.score !== 'number' || !s.ov.record) return;
        var stats = (typeof window._pdxRecordOmnibusStats === 'function')
          ? window._pdxRecordOmnibusStats(pid, s.key) : null;
        var c = window._recordComposition(s.ov.record, stats);
        if (!c) return;
        rated++;
        if (c.thin) thin++;
        if (c.level === 'single') single++;
        if (c.omnibusDriven) omni++;
      });
      if (!rated) return '';
      var judged = overall && typeof overall.judgedTotal === 'number' ? overall.judgedTotal : null;
      var unw = overall && typeof overall.unweightedScore === 'number' ? overall.unweightedScore : null;
      var moved = (unw !== null && overall && typeof overall.score === 'number' && unw !== overall.score);
      var parts = ['weighted over ' + rated + ' issue' + (rated === 1 ? '' : 's')];
      if (thin) parts.push(thin + ' on 1–2 votes');
      if (omni) parts.push(omni + ' mostly multi-issue');
      if (moved) parts.push('unweighted ' + unw + '%');
      var tip = 'The Official Record % averages the per-issue percentages, weighted by how many ' +
        'judged votes sit behind each one — so an issue decided by a single vote counts less ' +
        'than one decided by ten. ' + rated + ' issue' + (rated === 1 ? '' : 's') +
        ' had a percentage to average' +
        (judged ? ', over ' + judged + ' judged vote' + (judged === 1 ? '' : 's') + ' in total' : '') +
        (single ? '; ' + single + ' of those issues rest on a single judged vote' : '') +
        (thin ? '; ' + thin + ' rest on two or fewer' : '') +
        (omni ? '; ' + omni + ' are driven mainly by multi-issue bills' : '') + '. ' +
        (moved
          ? 'Counting every issue equally, regardless of depth, would give ' + unw + '% instead.'
          : 'Weighting does not change the figure here.');
      return '<span class="pdxor-compsum" title="' + esc(tip) + '" aria-label="' + esc(tip) + '">' +
        esc(parts.join(' · ')) + '</span>';
    } catch (e) { return ''; }
  }
  function _orActLine(verdict, title, meta, url, label, omniNote, focus) {
    var mv = VERDICTS[verdict] || VERDICTS.limited;
    var src = url ? ' <a href="' + esc(url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">' + esc(label || 'Source') + ' ↗</a>' : '';
    // `omniNote` (optional) discloses that this line came from a multi-issue bill —
    // calm and factual, so a contradiction from an omnibus never reads like a
    // single-issue one. Never invented here: see _orOmniNote below.
    var omni = omniNote ? '<span class="pdxor-omni">🧩 ' + omniNote + '</span>' : '';
    // `focus` (optional) makes the headline the keyboard-reachable twin of the proof
    // line's pointer shortcut: a real <button> that opens the full Voting Record on
    // this exact roll call. Omitted → the headline stays plain text, exactly as before,
    // which is what the Say-vs-Do feed's non-vote receipts still want.
    var head = esc(title);
    if (focus && focus.issue) {
      head = '<button type="button" class="pdxor-act-go"' +
        ' data-pdxc-vrvote="' + escAttr(focus.key || '') + '"' +
        ' data-pdxc-vrissue="' + escAttr(focus.issue) + '"' +
        ' title="' + escAttr('Open ' + title + ' in the full voting record') + '">' + esc(title) + '</button>';
    }
    return '<div class="pdxor-act"><span class="pdxor-act-ico" style="color:' + mv.color + '" aria-hidden="true">' + mv.ico + '</span>' +
      '<span>' + head + (meta ? ' <span style="color:#7e93b3;">· ' + esc(meta) + '</span>' : '') + src + omni + '</span></div>';
  }
  // "This came from an omnibus, not a single-issue vote" for ONE vr_* record, read
  // through the SAME engine primitive the Voting Record cards use
  // (_measureOmnibusContext in stance-helpers.js). Returns '' for a single-issue vote
  // or when the engine isn't loaded, so ordinary rows are untouched. Escaped HTML;
  // the only markup is the <b> around issue labels.
  function _orOmniNote(item, issueKey) {
    if (!item || typeof window._measureOmnibusContext !== 'function') return '';
    var ctx;
    try {
      ctx = window._measureOmnibusContext(item, issueKey, {}, { labelFn: _issueLabel });
    } catch (e) { return ''; }
    if (!ctx) return ''; // single-issue vote — nothing to disclose
    var names = function (list) {
      return list.map(function (c) { return '<b>' + esc(c.label) + '</b>'; }).join(', ');
    };
    var parts = [];
    if (ctx.advances.length) parts.push('advanced ' + names(ctx.advances));
    if (ctx.opposes.length) parts.push('cut against ' + names(ctx.opposes));
    var tail = parts.length
      ? ' The same vote also ' + parts.join(' and ') + '.'
      : (ctx.otherLabels.length ? ' It also covered ' + names(ctx.others) + '.' : '');
    return 'Multi-issue bill — one vote, ' + ctx.count + ' issues.' + tail;
  }
  // Evidence lines behind an Official Record issue verdict, as an array of row HTML
  // (migrated curated formal actions + the strongest vr_* votes each way). Shared by
  // the feed's collapsible <details> and the Phase 9 gap drawer (rendered expanded).
  function _orEvidenceItems(ov) {
    var lines = [];
    // Migrated curated formal actions (each sourced).
    if (ov && ov.officialActions && ov.officialActions.items) {
      ov.officialActions.items.forEach(function (a) {
        lines.push(_orActLine(a.verdict, a.headline || 'Formal action', a.date || '', a.sourceUrl, a.sourceLabel));
      });
    }
    // vr_* roll-call summary: the strongest consistent / contradicting measure. Each
    // line discloses when it came from a multi-issue bill, so the reader can see that
    // the same roll call was also a verdict on other issues.
    if (ov && ov.record) {
      var issueKey = ov.record.issueKey;
      var mk = function (item, verdict) {
        if (!item) return;
        var url = item.sourceUrl || (item.source && item.source.url) || '';
        var lbl = item.sourceLabel || (item.source && item.source.label) || 'Congress.gov';
        var title = item.title || item.shortTitle || item.number || item.question || 'Recorded vote';
        var pos = item.position ? ('Voted ' + item.position) : (item.actionType || '');
        lines.push(_orActLine(verdict, title, pos, url, lbl, _orOmniNote(item, issueKey)));
      };
      mk(ov.record.topContradiction, 'contradicts');
      mk(ov.record.topConsistent, 'consistent');
    }
    return lines;
  }
  function _orSupportingHtml(ov) {
    var lines = _orEvidenceItems(ov);
    if (!lines.length) return '';
    var n = lines.length;
    return '<details class="pdxor-acts"><summary>' + n + ' supporting ' + (n === 1 ? 'action' : 'actions') + ' ▾</summary>' + lines.join('') + '</details>';
  }
  // Retained for any surface still collapsing evidence behind a summary; the profile's
  // Official Record rows now open their own evidence in place (see _orRowEvidenceHtml).
  void _orSupportingHtml;
  // Phase 10 honest coverage line: "Based on N of ~M tracked issues …". N = issues
  // actually scored on this side; M ≈ issues in play (scored + those with a stated
  // position still awaiting a record). Approximate by design ("~", "tracked so far")
  // so a thin record never reads as a full verdict. Empty when nothing is scored yet
  // (the section's own empty state already explains that case).
  function _coverageLine(scored, awaiting, noun) {
    if (!scored) return '';
    var denom = scored + awaiting;
    return '<div class="pdxcov" title="Coverage is partial and grows as more record is added. Shows how many of the issues they have taken a position on so far actually have a ' + esc(noun) + ' to check.">' +
      '📊 Based on <b>' + scored + '</b> of ~' + denom + ' tracked issue' + (denom === 1 ? '' : 's') + ' with a ' + esc(noun) + ' so far.</div>';
  }
  // ── "12 mapped votes across 5 issues · See full record →" ────────────────────
  // The section's own always-visible entry point into the Voting Record. Everything a
  // reader needed before this existed was behind a row they had to think to expand,
  // which left the honest answer to "where are the receipts?" one guess away.
  //   Counted, never estimated: window._pdxRecordMappedCounts reads the same warm
  // cache the rows do, and counts only records that carry an issue mapping. Empty
  // string when nothing is warm or nothing is mapped, so a member with no record shows
  // no claim about one.
  function _orMappedSummaryText(counts) {
    if (!counts || !counts.votes) return '';
    var v = counts.votes, i = counts.issues;
    var txt = v + ' mapped vote' + (v === 1 ? '' : 's') +
      (i === 1 ? ' on 1 issue' : ' across ' + i + ' issues');
    // One or two votes cannot carry a pattern. Saying so keeps the count from reading
    // as depth it does not have — the same honesty the row-level "Limited" chip owes.
    if (v <= 2) txt += ' so far — still a thin record';
    return txt;
  }
  function _orMappedSummaryTip(counts) {
    var tip = 'Counted from the voting record loaded for this member: records carrying at ' +
      'least one issue mapping, which are the ones a stated position can be checked against.';
    var un = (counts.total || 0) - counts.votes;
    if (un > 0) {
      tip += ' ' + un + ' further record' + (un === 1 ? '' : 's') + ' ' + (un === 1 ? 'is' : 'are') +
        ' in the full list with no issue mapping yet.';
    }
    return tip;
  }
  function _orMappedSummaryHtml(pid) {
    var counts = null;
    try {
      if (typeof window._pdxRecordMappedCounts === 'function') counts = window._pdxRecordMappedCounts(pid);
    } catch (e) { counts = null; }
    var txt = _orMappedSummaryText(counts);
    if (!txt) return '';
    var tip = _orMappedSummaryTip(counts);
    var body = '<span class="pdxor-mapsum-ico" aria-hidden="true">🗂️</span>' +
      '<span class="pdxor-mapsum-txt">' + esc(txt) + '</span>';
    // No Voting Record section on the page → keep the count, drop the promise. A line
    // that cannot go anywhere should not look like a link.
    var live = document.getElementById && document.getElementById('pdxsec-voting');
    if (!live) return '<div class="pdxor-mapsum pdxor-mapsum-flat" title="' + escAttr(tip) + '">' + body + '</div>';
    return '<button type="button" class="pdxor-mapsum" data-pdxc-vrall="1"' +
        ' title="' + escAttr(tip) + '">' + body +
        '<span class="pdxor-mapsum-go">See full record →</span>' +
      '</button>';
  }
  function _orInner(pid) {
    var keys = issuesWithSignal(pid, 'official');
    var scored = [], awaiting = 0, anyPending = false, awaitingKeys = [];
    keys.forEach(function (k) {
      var ov = officialIssue(pid, k);
      if (ov.token === 'pending') { anyPending = true; awaiting++; return; }
      if (ov.token === 'consistent' || ov.token === 'contradicts' || ov.token === 'mixed' || ov.token === 'limited') {
        scored.push({ key: k, ov: ov });
      } else {
        awaiting++; // no_record / no_stance — stated position with nothing to score yet
        // Kept so the count can name the issues instead of only tallying them.
        awaitingKeys.push(k);
      }
    });

    var overall = scopedOverall('official', pid);
    var om = overall.verdict;
    // Composition on the overall % — how many issues it averages and how many of them
    // are thin or omnibus-driven. Annotation only; overall.score is untouched.
    var overallComp = _orOverallCompositionHtml(pid, scored, overall);
    var overallHtml = (typeof overall.score === 'number')
      ? '<span class="pdxor-pct" style="color:' + om.color + '">' + overall.score + '%</span>' + overallComp + '<span class="pdxc-chip pdxc-' + om.cls + '">' + om.ico + ' ' + esc(om.label) + '</span>'
      : '<span class="pdxc-chip pdxc-' + om.cls + '">' + (overall.token === 'pending' ? '<span class="pdxc-spin"></span>' : om.ico + ' ') + esc(om.label) + '</span>';

    var head =
      '<div class="pdxor-head"><span class="pdxor-title"><span aria-hidden="true">🏛️</span> ' +
          LT('officialrecord', 'Official Record') + '</span>' +
        // Before .pdxor-overall, which carries margin-left:auto — so the pill sits
        // beside the title and the score stays pinned right.
        LHOWTO('voting-record', 'How to read this') +
        '<span class="pdxor-overall">' + overallHtml + '</span></div>' +
      '<div class="pdxor-q">“When they had to vote, did they stand by what they said?”</div>';

    if (!scored.length) {
      var emptyMsg = anyPending
        ? 'Checking the voting record…'
        : (awaiting > 0
            ? 'No qualifying votes on record yet — ' + awaiting + ' stated position' + (awaiting === 1 ? '' : 's') + ' ' + (awaiting === 1 ? 'is' : 'are') + ' still awaiting a formal record.'
            : 'No stated positions or formal record on file yet.');
      // "No record" is a coverage statement, not a finding. Say why it happens
      // rather than leaving an empty panel to be read as an accusation.
      var emptyWhy = anyPending ? '' :
        '<div class="pdxor-empty-why">' + LT('norecord', 'Why a record can be empty') +
          ': the issue may have been handled by ' + LT('voicevote', 'voice vote') +
          ' (no per-member record exists), or we have not documented that area yet.</div>';
      return head + '<div class="pdxor-empty">' + esc(emptyMsg) + emptyWhy + '</div>' +
        // After the empty message, not before it: nothing here is checkable yet, so the
        // record that DOES exist reads as "and here is what we have" rather than as a
        // contradiction of the line above it.
        _orMappedSummaryHtml(pid) + _orRawLink();
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
        // Depth/composition of the record behind that %, immediately after it.
        var comp = _orCompositionHtml(pid, s.key, s.ov);
        // A row whose ENTIRE record is one or two votes shows both up front — those
        // are exactly the rows that used to read as "Limited voting record" with the
        // bill unnamed. Deeper rows quote the decisive vote and keep the rest one tap
        // away, so the list stays scannable.
        var total = (s.ov.record && s.ov.record.total) || 0;
        var inline = (total && total <= 2) ? 2 : 1;
        return '<details class="pdxor-issue pdxor-row" data-pdxc-row="' + escAttr(s.key) + '">' +
            '<summary class="pdxor-row-sum">' +
              '<div class="pdxor-issue-top">' +
                '<span class="pdxor-issue-lbl">' + esc(issueLabel(s.key)) + '</span>' +
                _orSaysChipHtml(pid, s.key, s.ov) +
                _orRecordChipHtml(s.ov) + pct + comp +
                _orOmniChip(pid, s.key) +
                '<span class="pdxor-caret" aria-hidden="true">▾</span>' +
              '</div>' +
              _orProofHtml(pid, s.key, s.ov, inline) +
            '</summary>' +
            '<div class="pdxor-row-body">' +
              _orWhyHtml(s.ov) +
              _orRowEvidenceHtml(pid, s.key, s.ov) +
              _orRowVrLinkHtml(pid, s.key, s.ov) +
              _gapLinkHtml(pid, s.key) +
            '</div>' +
          '</details>';
      }).join('');
      return '<div class="pdxor-cat"><div class="pdxor-cat-h">' + esc(grp.label) + '</div>' + rows + '</div>';
    }).join('');

    // Stated positions with nothing mapped to them yet. Previously a bare count, which
    // left "which issues?" unanswerable without leaving the profile. Now the count
    // opens the list, each row labelled with the same Says / Record vocabulary as a
    // scored row — so "No votes yet" reads as the coverage gap it is, in the same
    // language, rather than as a different kind of silence.
    var awaitingNote = '';
    if (awaiting > 0) {
      var awaitRows = awaitingKeys.map(function (k) {
        var ov = officialIssue(pid, k);
        return '<div class="pdxor-issue pdxor-issue-await">' +
            '<div class="pdxor-issue-top">' +
              '<span class="pdxor-issue-lbl">' + esc(issueLabel(k)) + '</span>' +
              _orStanceChip(pid, k) +
              _orRecordChipHtml(ov) +
            '</div>' +
          '</div>';
      }).join('');
      var head2 = '➕ ' + awaiting + ' more stated position' + (awaiting === 1 ? '' : 's') + ' ' +
        (awaiting === 1 ? 'has' : 'have') + ' no qualifying votes on record yet';
      awaitingNote = awaitRows
        ? '<details class="pdxor-awaiting-d"><summary class="pdxor-awaiting">' + esc(head2) + ' ▾</summary>' +
            '<div class="pdxor-await-body">' + awaitRows + '</div></details>'
        : '<div class="pdxor-awaiting">' + esc(head2) + '.</div>';
    }

    return head + _orMappedSummaryHtml(pid) + _coverageLine(scored.length, awaiting, 'formal record') +
      body + awaitingNote + _orRawLink();
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
  // Public-record receipts behind a Say-vs-Do stance, as an array of row HTML (each
  // sourced, contradictions first). Shared by the feed's <details> and the gap drawer.
  function _sdEvidenceItems(cur) {
    if (!cur || !cur.items || !cur.items.length) return [];
    var items = cur.items.slice().sort(function (a, b) {
      var ak = (a.verdict && a.verdict.key) || 'flag', bk = (b.verdict && b.verdict.key) || 'flag';
      return (_SD_ITEM_RANK[ak] == null ? 9 : _SD_ITEM_RANK[ak]) - (_SD_ITEM_RANK[bk] == null ? 9 : _SD_ITEM_RANK[bk]);
    });
    return items.map(function (r) {
      var mv = VERDICTS[(r.verdict && r.verdict.key)] || VERDICTS.flag;
      var url = r.source && r.source.url;
      var src = url ? ' <a href="' + esc(url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">' + esc((r.source && r.source.label) || 'Source') + ' ↗</a>' : '';
      var meta = [];
      if (r.date) meta.push(esc(r.date));
      if (r.category) meta.push(esc(r.category));
      var metaHtml = meta.length ? ' <span style="color:#7e93b3;">· ' + meta.join(' · ') + '</span>' : '';
      return '<div class="pdxor-act"><span class="pdxor-act-ico" style="color:' + mv.color + '" aria-hidden="true">' + mv.ico + '</span>' +
        '<span>' + esc(r.headline || 'Public-record item') + metaHtml + src + '</span></div>';
    });
  }
  function _sdEvidenceHtml(cur) {
    var lines = _sdEvidenceItems(cur);
    if (!lines.length) return '';
    var n = lines.length;
    return '<details class="pdxor-acts"><summary>' + n + ' public-record ' + (n === 1 ? 'item' : 'items') + ' ▾</summary>' + lines.join('') + '</details>';
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
      '<div class="pdxor-head"><span class="pdxor-title"><span aria-hidden="true">🧾</span> ' +
          LT('saydo', 'Say-vs-Do') + '</span>' +
        LHOWTO('say-vs-do', 'How to read this') +
        '<span class="pdxor-overall">' + headPct + '<span class="pdxc-chip pdxc-' + om.cls + '">' + om.ico + ' ' + esc(om.label) + '</span></span></div>' +
      '<div class="pdxor-q">“Does the full public picture match what they claim?”</div>' +
      '<div class="pdxor-method">Integrity&nbsp;% = public-record actions that back their words ÷ all checkable public-record evidence (backing&nbsp;+&nbsp;against). Shown only where there are ' + MIN_SAYDO_EVIDENCE + '+ checkable items — this is public-record integrity, <b>not</b> a formal voting score. ' +
        LT('norecord', 'Why some of these show “—”') + '</div>';

    if (!scored.length) {
      var msg = awaiting > 0
        ? 'No public-record confirmations or contradictions surfaced yet — ' + awaiting + ' stated position' + (awaiting === 1 ? '' : 's') + ' with nothing on the public record so far.'
        : 'No public-record evidence on file yet.';
      return head + '<div class="pdxor-empty">' + esc(msg) +
        '<div class="pdxor-empty-why">' + LT('norecord', 'That is our coverage, not a verdict') +
          ' — and it is deliberately separate from their ' + LT('officialrecord', 'Official Record') +
          ', which is built from votes only.</div>' +
        '</div>' + _sdRawLink();
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
            '</div>' + _sdEvidenceHtml(s.ov.curated) + _gapLinkHtml(pid, s.key) +
          '</div>';
      }).join('');
      return '<div class="pdxor-cat"><div class="pdxor-cat-h">' + esc(grp.label) + '</div>' + rows + '</div>';
    }).join('');

    var awaitingNote = awaiting > 0
      ? '<div class="pdxor-awaiting">➕ ' + awaiting + ' more stated position' + (awaiting === 1 ? '' : 's') + ' ' + (awaiting === 1 ? 'has' : 'have') + ' no public-record evidence yet.</div>'
      : '';

    return head + _coverageLine(scored.length, awaiting, 'public-record score') + body + awaitingNote + _sdRawLink();
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
    var both = [], oneSide = 0, offScored = [];
    Object.keys(set).forEach(function (k) {
      var o = officialIssue(pid, k), s = saydoIssue(pid, k);
      var oNum = typeof o.score === 'number', sNum = typeof s.score === 'number';
      // Every officially-scored issue, comparable or not, in the shape
      // _orOverallCompositionHtml wants. Collected here because this loop already
      // built each officialIssue() — the composition summary beside the overall %
      // would otherwise recompute all of them.
      if (oNum) offScored.push({ key: k, ov: o });
      if (oNum && sNum) both.push({ key: k, off: o, say: s, gap: o.score - s.score });
      else if (oNum || sNum) oneSide++;
    });
    both.sort(function (a, b) { return Math.abs(b.gap) - Math.abs(a.gap); });
    var counts = { aligned: 0, mixed: 0, diverges: 0 };
    both.forEach(function (p) { counts[divRel(p.gap).key]++; });
    return { both: both, oneSide: oneSide, counts: counts, offScored: offScored };
  }

  function _divNum(icon, pct, color, label) {
    return '<span class="pdxdv-num" title="' + esc(label) + '"><span class="pdxdv-num-ic" aria-hidden="true">' + icon + '</span>' +
      '<span class="pdxdv-num-pct" style="color:' + color + '">' + pct + '%</span></span>';
  }
  function _divRelChip(rel) {
    return '<span class="pdxdv-rel" style="color:' + rel.color + ';border-color:' + rel.color + '55;background:' + rel.color + '1f;" title="' + esc(rel.blurb) + '">' + rel.ico + ' ' + rel.label + '</span>';
  }
  function _divRow(p, pid) {
    var rel = divRel(p.gap), dir = _divDir(p.gap), g = Math.abs(p.gap);
    // Diverging & mixed rows are the tell — make them tappable to open the focused
    // gap view. Aligned rows have no gap to explain, so they stay static.
    var actionable = (rel.key === 'diverges' || rel.key === 'mixed');
    var body =
        '<div class="pdxdv-row-lbl">' + esc(_issueLabel(p.key)) + '</div>' +
        '<div class="pdxdv-row-body">' +
          '<span class="pdxdv-nums">' +
            _divNum('🏛️', p.off.score, p.off.verdict.color, 'Official Record — vote-based') +
            // Same composition treatment the Official Record panel puts on this issue's
            // %, on the same helper, so a 100% built on one vote reads the same way in
            // both places. Only the 🏛️ side gets it: Say-vs-Do has its own evidence
            // depth and is not built from votes at all.
            _orCompositionHtml(pid, p.key, p.off) +
            '<span class="pdxdv-vs" aria-hidden="true">vs</span>' +
            _divNum('🧾', p.say.score, p.say.verdict.color, 'Say-vs-Do — public-record integrity') +
          '</span>' +
          _divRelChip(rel) +
          (g > DIV_ALIGN_MAX ? '<span class="pdxdv-gap">' + g + ' pt gap' + (dir ? ' · ' + dir : '') + '</span>' : '') +
        '</div>';
    if (actionable) {
      return '<button type="button" class="pdxdv-row pdxdv-row-tap" data-pdxc-gap="' + esc(p.key) + '" data-pdxc-gap-pid="' + esc(pid) + '"' +
          ' aria-label="' + esc('See the votes and public-record evidence behind the ' + rel.label.toLowerCase() + ' relationship on ' + _issueLabel(p.key)) + '">' +
          body + '<span class="pdxdv-row-why">See what’s behind the gap <span aria-hidden="true">→</span></span></button>';
    }
    return '<div class="pdxdv-row">' + body + '</div>';
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
          // The whole-profile Official Record % is now a judged-vote-weighted mean, so
          // the same disclosure that sits beside it on the Official Record panel belongs
          // here too — otherwise the comparison invites a reader to weigh two numbers
          // without knowing how much record is under either.
          _orOverallCompositionHtml(pid, d.offScored, oOv) +
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

    var rows = d.both.map(function (p) { return _divRow(p, pid); }).join('');
    var covDv = '<div class="pdxcov" title="Only issues with a real score on BOTH sides can be compared head-to-head. The rest are one-sided so far and are summarised below.">' +
      '📊 Comparable on <b>' + d.both.length + '</b> of ~' + (d.both.length + d.oneSide) + ' issue' + ((d.both.length + d.oneSide) === 1 ? '' : 's') + ' with a score on either side.</div>';
    var note = d.oneSide > 0
      ? '<div class="pdxdv-note">➕ ' + d.oneSide + ' more issue' + (d.oneSide === 1 ? '' : 's') + ' ' + (d.oneSide === 1 ? 'has' : 'have') + ' a score on only one side — kept in their own feeds, not compared here.</div>'
      : '';

    return head + covDv + tally + '<div class="pdxdv-rows">' + rows + '</div>' + note;
  }
  var _divergenceInner = _dvInner; // alias used by the warm-refresh listener
  function divergenceSectionHtml(pid) {
    ensureStyles();
    bindGateway();
    if (!pid) return '';
    return '<section class="pdxdv" data-pdxc-divergence-pid="' + esc(pid) + '" aria-label="Official Record vs Say-vs-Do divergence">' + _dvInner(pid) + '</section>';
  }

  // ── Focused gap view (Phase 9) — "here is exactly why they diverge" ─────────
  // A tap on a diverging/mixed comparison row (or a cross-link in either feed) opens
  // a mobile-first bottom-sheet showing, clearly SECTIONED (never merged):
  //   🏛️ Official Record — the formal votes/actions driving that issue's score
  //   🧾 Say-vs-Do        — the public-record receipts driving that issue's integrity
  // The stated stance sits up top so the contrast stays grounded in what they claim.
  // Each side keeps its own label, score and source links; a missing/thin side shows
  // its honest empty state rather than inventing content. The two systems are never
  // blended into one list or one score — the sheet just puts them side by side.
  function _gapScorePill(numeric, score, meta, color) {
    if (numeric) return '<span class="pdxgap-pct" style="color:' + color + '">' + score + '%</span>';
    // Say-vs-Do with some evidence but below the threshold → honest "—" (never 0/100).
    if (meta && meta.judged) return '<span class="pdxor-pct pdxor-pct-na" title="Not enough public record yet to score">—</span>';
    return '';
  }
  function _gapViewHtml(pid, issueKey) {
    var off = officialIssue(pid, issueKey);
    var say = saydoIssue(pid, issueKey);
    var oNum = typeof off.score === 'number', sNum = typeof say.score === 'number';
    var lbl = _issueLabel(issueKey);
    var stance = _orStanceChip(pid, issueKey);

    // Relationship — only when BOTH sides carry a real %. Otherwise say so plainly.
    var relHtml, gapNote;
    if (oNum && sNum) {
      var gap = off.score - say.score, rel = divRel(gap), g = Math.abs(gap), dir = _divDir(gap);
      relHtml = _divRelChip(rel);
      gapNote = '<div class="pdxgap-note">' + (g > DIV_ALIGN_MAX ? '<b>' + g + ' pt gap</b>' + (dir ? ' · ' + esc(dir) : '') + ' — ' : '') + esc(rel.blurb) + '</div>';
    } else {
      relHtml = '<span class="pdxdv-rel" style="color:#9fb4d4;border-color:#9fb4d455;background:#9fb4d41f;">— One side only</span>';
      gapNote = '<div class="pdxgap-note">Only one side has a score on this issue so far — there\'s nothing to line up head-to-head yet.</div>';
    }

    var head =
      '<div class="pdxgap-h">' +
        '<div class="pdxgap-eyebrow">⚖️ Record vs. Public Picture</div>' +
        '<div class="pdxgap-title">' + esc(lbl) + '</div>' +
        '<div class="pdxgap-meta">' + (stance || '') + relHtml + '</div>' +
        gapNote +
      '</div>';

    // 🏛️ Official Record side
    var offItems = _orEvidenceItems(off);
    var offEmpty = off.token === 'pending' ? 'Checking the voting record…'
                 : (SCOPES.official.empty[off.token] || 'No qualifying votes on record yet');
    var offBody = offItems.length
      ? '<div class="pdxgap-acts">' + offItems.join('') + '</div>'
      : '<div class="pdxgap-side-empty">' + esc(offEmpty) + '</div>';
    // Provenance for this side: when part of the formal record came from multi-issue
    // bills, say so here rather than letting a gap read as a single-issue disagreement.
    var offOmni = '';
    var _os = (typeof window._pdxRecordOmnibusStats === 'function')
      ? window._pdxRecordOmnibusStats(pid, issueKey) : null;
    if (_os && _os.any && typeof window._pdxOmnibusProvenanceNote === 'function') {
      offOmni = '<div class="pdxgap-side-sub pdxgap-omni">🧩 ' +
        esc(window._pdxOmnibusProvenanceNote(_os)) +
        ' A multi-issue bill is scored separately on each issue it touched.</div>';
    }
    var offSide =
      '<div class="pdxgap-side">' +
        '<div class="pdxgap-side-h"><span class="pdxgap-side-name"><span aria-hidden="true">🏛️</span> ' +
          LT('officialrecord', 'Official Record') + '</span>' +
          _gapScorePill(oNum, off.score, null, off.verdict.color) + '</div>' +
        '<div class="pdxgap-side-sub">Formal ' + LT('rollcall', 'roll-call votes') +
          ' &amp; actions — the institutional record</div>' +
        offOmni +
        offBody +
      '</div>';

    // 🧾 Say-vs-Do side
    var sayItems = _sdEvidenceItems(say.curated);
    var sayEmpty = SCOPES.saydo.empty[say.token] || 'Nothing on the public record yet';
    var sayCounts = _sdCounts(say.curated);
    var sayBody = sayItems.length
      ? '<div class="pdxgap-acts">' + sayItems.join('') + '</div>'
      : '<div class="pdxgap-side-empty">' + esc(sayEmpty) + '</div>';
    var saySide =
      '<div class="pdxgap-side">' +
        '<div class="pdxgap-side-h"><span class="pdxgap-side-name"><span aria-hidden="true">🧾</span> ' +
          LT('saydo', 'Say-vs-Do') + '</span>' +
          _gapScorePill(sNum, say.score, say.scoreMeta, say.verdict.color) + '</div>' +
        '<div class="pdxgap-side-sub">Public-record evidence — statements, news, controversies' + (sayCounts ? ' · ' + sayCounts : '') + '</div>' +
        sayBody +
      '</div>';

    return head +
      '<div class="pdxgap-sides">' + offSide + saySide + '</div>' +
      '<div class="pdxgap-foot">🏛️ formal record and 🧾 public record are kept separate — this shows both side by side, it never blends them into one score. ' +
        LT('contradiction', 'What counts as a contradiction') + ' · ' +
        LHOWTO('say-vs-do', 'How to read this') + '</div>';
  }

  // A compact "compare the two records" cross-link, shown on a feed row ONLY when the
  // issue has a real % on BOTH sides (so the sheet always has something to compare).
  function _gapLinkHtml(pid, issueKey) {
    var o = officialIssue(pid, issueKey), s = saydoIssue(pid, issueKey);
    if (typeof o.score !== 'number' || typeof s.score !== 'number') return '';
    var rel = divRel(o.score - s.score);
    return '<button type="button" class="pdxdv-open" data-pdxc-gap="' + esc(issueKey) + '" data-pdxc-gap-pid="' + esc(pid) + '"' +
      ' style="--c:' + rel.color + '" title="Compare the votes and the public record behind this issue">⚖️ ' + rel.label + ' — compare →</button>';
  }

  // ── gap sheet: a single lazily-built bottom-sheet, reused for every issue ────
  var _gapSheet = null;
  function _ensureGapSheet() {
    if (_gapSheet) return _gapSheet;
    ensureStyles();
    var back = document.createElement('div');
    back.className = 'pdxgap-back'; back.id = 'pdxc-gap-back'; back.hidden = true;
    back.innerHTML = '<div class="pdxgap-sheet" role="dialog" aria-modal="true" tabindex="-1" aria-label="Issue divergence detail">' +
        '<button type="button" class="pdxgap-x" aria-label="Close">×</button>' +
        '<div class="pdxgap-body"></div>' +
      '</div>';
    (document.body || document.documentElement).appendChild(back);
    back.addEventListener('click', function (e) {
      if (e.target === back || (e.target.closest && e.target.closest('.pdxgap-x'))) closeGap();
    });
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.keyCode === 27) && !back.hidden) closeGap();
    });
    _gapSheet = back.querySelector('.pdxgap-sheet');
    return _gapSheet;
  }
  function openGap(pid, issueKey) {
    if (!pid || !issueKey || !document.body) return;
    var sheet = _ensureGapSheet();
    var body = sheet.querySelector('.pdxgap-body');
    if (body) body.innerHTML = _gapViewHtml(pid, issueKey);
    if (sheet.parentNode) sheet.parentNode.hidden = false;
    try { sheet.scrollTop = 0; sheet.focus(); } catch (e) {}
  }
  function closeGap() {
    var back = document.getElementById('pdxc-gap-back');
    if (back) back.hidden = true;
  }

  // ── Methodology & boundary explainer (Phase 11) ─────────────────────────────
  // A short, plain-language "how we score this" surface, reachable from the Promise
  // Tracker gateway. Reuses the same bottom-sheet as the gap view. Non-defensive:
  // states what each number means, the thin-data rules, why the two systems stay
  // separate, and exactly what the divergence labels do and don't claim.
  function methodologyHtml() {
    var row = function (icon, title, body) {
      return '<div class="pdxm-row"><div class="pdxm-row-h"><span aria-hidden="true">' + icon + '</span> ' + esc(title) + '</div>' +
        '<div class="pdxm-row-b">' + body + '</div></div>';
    };
    return '<div class="pdxm">' +
      '<div class="pdxgap-eyebrow">📋 Promise Tracker</div>' +
      '<div class="pdxgap-title">How we score this</div>' +
      '<div class="pdxm-lead">Two separate reads on whether someone\'s word holds up. We keep them apart on purpose and never blend them into a single “honesty” score.</div>' +
      row('🏛️', 'Official Record %', 'What their <b>formal record</b> shows: the share of their votes and formal legislative or legal actions on an issue that <b>match the position they\'ve stated</b>. Built only from roll-call votes and formal actions — never from statements or news.') +
      row('🧾', 'Say-vs-Do integrity %', 'What the <b>broader public record</b> shows: the share of checkable public-record items on an issue — statements, interviews, news, controversies — that <b>back up what they say</b>. Built only from public evidence — never from votes.') +
      row('…', 'When the record is thin', 'We don\'t turn a couple of items into a confident number. Below a small minimum we show “—” or “not enough record yet” instead of a misleading 0% or 100%. A coverage line on each section shows how much of their record we actually have so far.') +
      // The overall % is a real scoring decision a reader can check us on, so it is
      // stated here and not only in the composition line's tooltip.
      row('📊', 'How the overall % is built', 'The overall Official Record % averages the per-issue percentages, <b>weighted by how many judged votes sit behind each issue</b> — so an issue decided by a single vote counts less than one decided by ten. No issue is dropped for being thin: the depth behind every number is shown beside it, and the overall figure tells you what the plain unweighted average would have been whenever the two differ.') +
      row('⚖️', 'Why two separate scores', 'Votes and public statements answer different questions, so mixing them would hide more than it reveals. We show both, side by side, and let the <b>contrast</b> be the signal.') +
      row('🧩', 'One vote, several issues', 'Omnibus and reconciliation bills bundle many unrelated policies into one measure, so a member gets a single yes-or-no on all of it. We score <b>each issue on its own</b>, which means one roll call can keep a promise on taxes and break one on healthcare at the same time. That isn\'t double-counting: it\'s one vote, judged once per issue it actually touched. Anywhere a verdict rests on a multi-issue bill, we label it 🧩 and list the other issues that vote covered.') +
      row('↔️', 'What Aligned / Mixed / Diverges mean', 'They compare the two scores, nothing more. <b>Aligned</b> — the two records tell the same story. <b>Mixed</b> — mostly, with some daylight. <b>Diverges</b> — they tell different stories. The label describes how much the two records <b>agree with each other</b> — not whether the person is good or bad. The numbers themselves carry that.') +
      // The procedural down-weight is a real scoring decision a reader can check
      // us on, so it belongs in the methodology sheet rather than only in a
      // tooltip on the card that happens to carry the tag.
      row('⚙️', 'Why some votes count less', 'A ' + LT('procedural', 'procedural vote') +
        ' — whether to debate a bill, send it back, or move on — counts at <b>a quarter</b> of the weight of a vote on the policy itself. These are real votes with real outcomes, but party leadership drives them more than personal conviction, so one of them never outweighs a member\'s actual vote on the bill. On a ' +
        LT('recommit', 'motion to recommit') + ' or a ' + LT('table', 'motion to table') +
        ' a Yea is a vote <b>against</b> the measure, and we read it that way — scoring it the other way round would produce exactly backwards verdicts.') +
      row('📖', 'If a term is unfamiliar', 'Anything with a dotted underline anywhere in PolitiDex opens a short, plain-language definition — ' +
        LT('hr', 'H.R.') + ', ' + LT('rollcall', 'roll-call vote') + ', ' + LT('omnibus', 'omnibus') +
        ', ' + LT('cloture', 'cloture') + '. Definitions describe the process, never a party or a policy.' +
        (window.PDXLearn ? ' <button type="button" class="pdxl-link" data-pdxl-glossary>Open the full glossary →</button>' : '')) +
      '<div class="pdxgap-foot">No blended score. No vote counted twice. Every item links to its source.</div>' +
      '</div>';
  }
  function openMethodology() {
    if (!document.body) return;
    var sheet = _ensureGapSheet();
    var body = sheet.querySelector('.pdxgap-body');
    if (body) body.innerHTML = methodologyHtml();
    if (sheet.parentNode) sheet.parentNode.hidden = false;
    try { sheet.scrollTop = 0; sheet.focus(); } catch (e) {}
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
    // Pure thin-data rule, exposed read-only. The education layer's glossary
    // states these thresholds in words ("below two directional items…"), so
    // scripts/test-glossary-honesty.mjs probes THIS function to derive the real
    // thresholds and fails if the explainer copy has drifted from them. Exposing
    // it keeps that check behavioural instead of scraping source for a literal.
    saydoScore: saydoScore,
    // Pure row-proof helpers behind the profile's Official Record stance rows, exposed
    // read-only so scripts/test-or-proof.mjs can gate the LANGUAGE and the proof
    // formatting without a DOM: rowVerdict(ov) → the row's Record chip vocabulary +
    // the reason a thin verdict is thin; proofText(item) → "H.R. 22 · On Motion to
    // Recommit · Voted Yea"; multiNote(item, issueKey) → "Yea counted for X / against
    // Y". None of them score, weight or fetch anything.
    //   mappedSummary(counts) → the section's entry-line copy ("12 mapped votes across
    // 5 issues"), from counts window._pdxRecordMappedCounts already produced; it only
    // words a count, it never derives one.
    proof: {
      rowVerdict: _orRowVerdict,
      proofText: _orProofText,
      multiNote: _orRowMultiNote,
      mappedSummary: _orMappedSummaryText,
      LABELS: _OR_ROW
    },
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
    // Phase 9: open the focused gap view for one (pid, issue) from anywhere — the
    // comparison rows and both feeds wire to this; exposed for any other surface too.
    openGap: openGap,
    closeGap: closeGap,
    // Phase 11: the plain-language methodology / boundary explainer (opened from the
    // gateway's "How we score this" link; exposed so any surface can open it too).
    openMethodology: openMethodology,
    methodologyHtml: methodologyHtml,
    // Phase 12: the composition / confidence meter, exposed so surfaces outside this
    // module render the SAME markup rather than copying the classes. Takes the object
    // _recordComposition() returns plus the lead sentence for the label. Any surface
    // that shows — or explains — a vote-built number should be able to say how much
    // record is under it in one voice.
    compositionMeterHtml: _orCompMeterHtml,
    warm: queueWarm,
    label: function (t) { return (VERDICTS[t] || VERDICTS.no_record).label; },
    icon: function (t) { return (VERDICTS[t] || VERDICTS.no_record).ico; },
    meta: function (t) { return VERDICTS[t] || VERDICTS.no_record; }
  };

  try { if (document.readyState !== 'loading') ensureStyles(); else document.addEventListener('DOMContentLoaded', ensureStyles); } catch (e) {}
})();
