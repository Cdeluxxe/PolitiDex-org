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
          overall read available to callers. This % is derived ONLY from Say-vs-Do
          evidence: it is never blended with, nor allowed to compete with, the
          vote-based Official Record %, and never touches vote-consistency surfaces.
          It stays honest under thin data (no number below MIN_SAYDO_EVIDENCE, so a
          lone item can't fake a 0% / 100%).
        • The pooled figure is no longer PRINTED in the section header — see
          "WHAT CHANGED ON THE SURFACE" below. It is still computed.

     Real, discrete PROMISES ("I will / I will not" pledges) are their OWN narrower
     system and are NOT blended into either percentage. This engine never scores them.

   WHAT CHANGED ABOVE THIS ENGINE (⚖️ Word vs Action, word-action.js):

     The profile no longer leads with a promise-only percentage. A politician's
     documented word now counts whichever form it takes — an explicit pledge
     (highest weight), a stated operational position (high), or an issue they
     repeatedly and identifiably campaign on (lower, non-zero) — and their formal
     record is the test of all of it. Word vs Action is that read.

     None of the boundaries above moved. Word vs Action does NOT compute its own
     separate percentage from raw evidence: it POOLS AND WEIGHTS the per-issue
     verdicts this engine already produces via officialRecord(), copies their
     tokens verbatim, and averages them by tier weight × capped evidence. It reads
     this engine; this engine does not read it. Specifically:

       • Official Record stays the vote-based number and the only thing that
         judges an issue. Word vs Action never re-derives a verdict from a score.
       • Say-vs-Do stays the separate public-record layer with its own name, its
         own evidence and its own thin-data floor. It is not folded in.
       • Discrete promises are still unscored HERE. They are scored where they
         always were (Kept ÷ (Kept + Broken), in profiles-full.js), and that
         number now presents itself as the pledge tier of Word vs Action rather
         than as the loudest figure on the profile.
       • Still no blended third percentage: pooling verdicts this engine issued is
         not the same as mixing two evidence bases into one number, which remains
         forbidden.

   WHAT CHANGED ON THE SURFACE (one primary score, several supporting layers):

     A profile now publishes exactly ONE headline percentage — the Word vs Action
     read — and every layer in this file presents as evidence feeding it rather
     than as a rival rating. Concretely, and only in the RENDERERS:

       • The Official Record header prints its verdict chip and its coverage
         disclosure, not its pooled %. Per-issue percentages are untouched: they
         are the working detail a reader checks, not a headline.
       • The Say-vs-Do header prints its verdict chip only. The pooled
         "public-record integrity" number came out of the header; per-stance
         percentages and every receipt stay exactly as they were.
       • The two gateway cards carry verdict chips instead of a percentage.
       • The divergence panel leads with the RELATIONSHIP and the size of the gap
         instead of the two pooled percentages. Per-issue rows still show both
         sides, because a gap is unreadable without them.
       • Each of those surfaces carries a one-line statement of what it feeds,
         linking to the primary read (_feedsPrimaryHtml), and drops the line
         entirely when word-action.js is absent rather than pointing at nothing.

     THE MEASUREMENTS DID NOT CHANGE. scopedOverall(), officialIssue(),
     saydoIssue() and divergenceData() return exactly what they returned before;
     this was a presentation collapse, not a scoring one. Anything that needs a
     pooled figure — the primary read, the divergence gap, the compare surfaces —
     still asks this engine for it and still gets the same answer.

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
    // One phrase for one wait. The hero (word-action.js) and the Voting Record
    // Highlights placeholder (profiles-full.js) already say exactly this, and on a
    // cold profile open all three can be on screen at once, waiting on the same
    // roll-call fetch. Only the copy moves here — key, tone, colour and cls are the
    // taxonomy and stay as they are.
    pending:     { key: 'pending',     ico: '⏳', label: 'Loading the record…',         short: 'Loading the record…',                                               tone: 'muted', color: '#9fb4d4', cls: 'pending' }
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
      empty: { no_record: 'No qualifying votes on record yet', no_stance: 'No stated stance to check', limited: 'Limited voting record' },
      // The ✒️ lane's wording for the same card. A president casts no votes, so every
      // noun above is false on their profile — and the Official Record SECTION below
      // the gateway already asks the executive question (see _orSectionNoun), which
      // left the gateway card contradicting the section it links to. Same scope, same
      // score, same boundary; only the noun changes. Chosen by office, via _scopeFor.
      // The empty/thin states are NOT re-stated here: _EXEC_EMPTY / laneVerdict already
      // own that swap, and a second copy of it would be one more thing to drift.
      exec: {
        question: 'When they could act on their own, did they do what they said?',
        blurb: 'The hard, institutional score — the laws they signed or vetoed and the orders they issued, checked against what they say they stand for.'
      }
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
  // The cache PROBE was the cost, not the build. Object.keys() on the 259-entry
  // spotlight map allocates a fresh array every time, and officialActionsFor() /
  // officialActionIssues() are asked once per (person × issue) — thousands of
  // calls inside a single roster render. Nothing can mutate ACCT_SPOTLIGHT
  // between two calls in the SAME synchronous pass, because its only writers are
  // scripts that have already run, so the probe is taken once per turn of the
  // event loop and released on the next microtask. A data module landing later
  // still invalidates on its own turn, exactly as before.
  var _oaProbe = -1;
  function _acctSize() {
    if (_oaProbe !== -1) return _oaProbe;
    var n = 0;
    try { n = window.ACCT_SPOTLIGHT ? Object.keys(window.ACCT_SPOTLIGHT).length : 0; } catch (e) { n = 0; }
    _oaProbe = n;
    var release = function () { _oaProbe = -1; };
    try { Promise.resolve().then(release); } catch (e) { setTimeout(release, 0); }
    return n;
  }
  function buildOfficialActions() {
    var key = _acctSize();
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

  // ── ✒️ EXECUTIVE ACTIONS as record items — the presidential "did" side ───────
  // A member of Congress has a clean action side: roll calls. A president casts
  // none of those, so before this feeder existed the engine had nothing to test a
  // president's word against and every presidential read came back "pending" — the
  // most-watched office in the product, measured at zero.
  //
  // What a president does instead is sign or veto legislation, issue orders, and
  // direct agencies. db/exec-action-seed.json already holds those actions, mapped
  // to the SAME issue vocabulary as votes and stances, with per-issue directions
  // and weights. This feeder converts them into the record-item shape the
  // congressional lane already understands and hands them to the SAME summariser.
  //
  // WHY THAT IS THE WHOLE INTEGRATION. stance-helpers.js#_issueRecordSummary is
  // generic over items shaped { kind:'position', supports, issues:[{issueKey,
  // supportMeaning, weight}] }. Feeding it exec actions therefore reuses, verbatim:
  // the weighting, the procedural down-weight, the netVerdict precedence, the
  // topConsistent / topContradiction citation picking, and the label vocabulary.
  // No new judgement logic exists in this file, and there is no second score — the
  // result rides in officialIssue's `record` slot, so word-action.js#judgedOf,
  // #testOf and this file's judgedCountOf read it without modification.
  //
  // 'advances' → the action pushed the issue forward → yea_supports.
  // 'opposes'  → it cut against the issue → yea_opposes, which inverts the read
  //              exactly as it does for a multi-issue bill in the 🏛️ lane.
  var _EXEC_MEANING = { advances: 'yea_supports', opposes: 'yea_opposes' };
  // A veto is the one class where the actor pushed the measure BACKWARD, so the
  // per-issue direction has to be read against a blocked measure rather than an
  // enacted one. Everything else advanced the document it is attached to.
  var _EXEC_BLOCKS = { vetoed_law: true };

  function execEligible(pid) {
    try {
      var E = window.PDXExecRecord;
      return !!(E && typeof E.eligible === 'function' && E.eligible(pid));
    } catch (e) { return false; }
  }

  // Every string that would identify this document if a sentence referred to it.
  // Used by the circularity guard below, so it errs toward MORE identifiers: a
  // missed identifier lets a card be tested by the document it was written from,
  // which is the failure this whole mechanism exists to prevent.
  function execIdentifiers(a) {
    var out = [];
    function add(s) {
      s = String(s == null ? '' : s).trim().toLowerCase();
      // Short needles match everything. Four characters is enough for "14257" and
      // "119-1" and short enough to exclude "eo" or a bare chamber letter.
      if (s.length >= 4) out.push(s);
    }
    var docId = String(a.documentId || '');
    add(docId);
    add(a.title);
    add(a.measureNumber);
    // "Executive Order 14257" is cited in prose as "EO 14257" and, in an evidence
    // line, often as the bare number.
    var eo = /(?:executive order|eo)\s*(?:no\.?\s*)?(\d{4,6})/i.exec(docId);
    if (eo) { add('eo ' + eo[1]); add(eo[1]); }
    // "Public Law 119-21" is cited as "119-21" and as "P.L. 119-21".
    var pl = /public law\s*(\d+-\d+)/i.exec(docId);
    if (pl) add(pl[1]);
    return out;
  }

  // Does `hay` name any of `needles`? A needle ending in a digit must not run into
  // more digits, so the identifier for Public Law 119-1 cannot match a sentence
  // about Public Law 119-10.
  function execNamesDocument(hay, needles) {
    if (!hay) return false;
    for (var i = 0; i < needles.length; i++) {
      var n = needles[i];
      if (!n) continue;
      var at = hay.indexOf(n);
      while (at !== -1) {
        var endsDigit = /\d$/.test(n);
        var after = hay.charAt(at + n.length);
        if (!(endsDigit && /\d/.test(after))) return true;
        at = hay.indexOf(n, at + 1);
      }
    }
    return false;
  }

  // Everything this figure SAID about this issue, as one lowercased haystack: the
  // card's topic, its text, its evidence line and its source. Two variants are
  // returned because a card writes "H.R.1" where a seed writes "H.R. 1" — the
  // squeezed pass catches that without loosening the matcher for everything else.
  var _execSaidCache = null, _execSaidKey = '';
  function execSaidText(pid, issueKey) {
    var key = norm(pid);
    if (!_execSaidCache || _execSaidKey !== key) {
      _execSaidCache = {}; _execSaidKey = key;
      try {
        var p = (window.CMP_DATA || {})[pid] || (window.CMP_DATA || {})[key];
        var list = (typeof window._resolveStanceList === 'function') ? (window._resolveStanceList(pid, p) || []) : [];
        for (var i = 0; i < list.length; i++) {
          var s = list[i];
          if (!s || !s.issueKey || _execSaidCache[s.issueKey]) continue;
          var raw = [s.topic, s.text, s.evidence, s.source && s.source.label, s.source && s.source.url]
            .filter(Boolean).join(' ').toLowerCase();
          _execSaidCache[s.issueKey] = { plain: raw, squeezed: raw.replace(/[\s.]/g, '') };
        }
      } catch (e) {}
    }
    return _execSaidCache[issueKey] || null;
  }

  // THE CIRCULARITY GUARD, per action→issue pair. PDXWordAction's third rule is
  // that a position is never its own test. isIndependentWord() already rejects the
  // blatant form — a card that leads with a record verb and cites the clerk. It
  // cannot catch a card that asserts a view in the figure's own voice and then
  // cites the very document that would test it, which is the ordinary shape of a
  // presidential stance card because these cards were largely written FROM this
  // record. Unguarded, this feeder would have manufactured a dense agreement read
  // that measured only the fact that a card agrees with its own source.
  //
  // Two independent signals, and EITHER one suppresses (fail closed):
  //   1. the seed declares circularWithStance on the pair, with its reason; and
  //   2. the card's own prose names the document.
  // Declared flags survive a matcher that misses a phrasing; the matcher survives
  // a new card nobody remembered to flag.
  function execCircular(a, mapping, said) {
    if (mapping && mapping.circularWithStance) {
      return { circular: true, why: 'declared', note: mapping.circularNote || '' };
    }
    if (!said) return { circular: false };
    var ids = execIdentifiers(a);
    if (execNamesDocument(said.plain, ids)) return { circular: true, why: 'card_names_document' };
    var squeezed = [];
    for (var i = 0; i < ids.length; i++) squeezed.push(ids[i].replace(/[\s.]/g, ''));
    if (execNamesDocument(said.squeezed, squeezed)) return { circular: true, why: 'card_names_document' };
    return { circular: false };
  }

  // Every scorable exec action touching ONE issue, as record items — plus what was
  // held back and why, because a filter that hides its own exclusions makes a
  // partial record look complete.
  function execRecordsFor(pid, issueKey) {
    var out = { items: [], held: [], unstated: 0, circular: 0, touched: 0 };
    if (!issueKey || !execEligible(pid)) return out;
    var E = window.PDXExecRecord;
    var pool;
    try { pool = E.actionsFor(pid); } catch (e) { return out; }
    var kept = (pool && pool.kept) || [];
    var said = execSaidText(pid, issueKey);
    for (var i = 0; i < kept.length; i++) {
      var a = kept[i], mapping = null, all = a.issues || [];
      for (var j = 0; j < all.length; j++) {
        if (all[j] && all[j].issueKey === issueKey) { mapping = all[j]; break; }
      }
      if (!mapping) continue;
      out.touched++;
      // A held action is still real, sourced record — the surfaces list it with its
      // reason so a thin row says why it is thin. Flattened to the same citation
      // fields a scored item carries, so no caller has to reach back into `action`.
      var held = function (reason, extra) {
        var h = {
          action: a, reason: reason,
          actionClass: a.actionClass || '',
          documentId: a.documentId || a.measureNumber || '',
          title: a.title || '',
          date: a.actedAt || '',
          sourceUrl: a.sourceUrl || '',
          sourceLabel: a.sourceLabel || ''
        };
        if (extra) for (var kx in extra) if (Object.prototype.hasOwnProperty.call(extra, kx)) h[kx] = extra[kx];
        out.held.push(h);
      };
      var meaning = _EXEC_MEANING[mapping.direction];
      // Fail closed on a direction this file does not understand. A mapping that
      // cannot be read cleanly is coverage, never a guess.
      if (!meaning) { held('unmapped_direction'); continue; }
      // A standing is a citation, not a formality: "struck down" with no ruling is
      // as unpublishable as an unsourced signing, and an action whose standing is
      // unknown cannot carry a verdict. It still counts as coverage.
      var standing = null;
      try { standing = E.standingOf(a); } catch (e) { standing = null; }
      if (!standing) { out.unstated++; held('no_standing'); continue; }
      var circ = execCircular(a, mapping, said);
      if (circ.circular) {
        out.circular++;
        held('circular', { why: circ.why, note: circ.note || '' });
        continue;
      }
      // Carry EVERY mapping, not just this issue's: an omnibus signature reports
      // both of its directions from one document, exactly as one vote on H.R. 1
      // does in the 🏛️ lane, and the surfaces need that context to say so.
      var issues = [];
      for (var k = 0; k < all.length; k++) {
        var m2 = all[k];
        if (!m2 || !m2.issueKey) continue;
        issues.push({
          issueKey: m2.issueKey,
          supportMeaning: _EXEC_MEANING[m2.direction] || 'yea_supports',
          weight: (typeof m2.weight === 'number') ? m2.weight : 100,
          isPrimary: !!m2.isPrimary,
          rationale: m2.rationale || ''
        });
      }
      out.items.push({
        kind: 'position',
        // The president advanced the document they signed or issued. A veto pushed
        // it backward, and advanceInverted is the field the shared summariser
        // already uses for exactly that measure-direction correction.
        supports: true,
        advanceInverted: !!_EXEC_BLOCKS[a.actionClass],
        isProcedural: false,
        issues: issues,
        date: a.actedAt || '',
        // Enough to cite the receipt on a surface without re-reading the seed.
        execAction: true,
        actionClass: a.actionClass,
        documentId: a.documentId || a.measureNumber || '',
        measureNumber: a.measureNumber || '',
        title: a.title || '',
        sourceUrl: a.sourceUrl || '',
        sourceLabel: a.sourceLabel || '',
        standing: standing
      });
    }
    return out;
  }

  // ONE issue's exec summary, in the same shape recordSummary() returns, produced
  // by the same function. Null when nothing scorable touches the issue.
  function execIssueSummary(pid, issueKey) {
    var pool = execRecordsFor(pid, issueKey);
    if (!pool.items.length) return null;
    if (typeof window._issueRecordSummary !== 'function') return null;
    var stance = positionStance(pid, issueKey);
    var sum;
    try { sum = window._issueRecordSummary(issueKey, stance, pool.items); } catch (e) { return null; }
    if (!sum) return null;
    sum.execPool = pool;
    return sum;
  }

  // Issues this figure has ANY exec action on — scorable or held. Held issues are
  // included on purpose: they are coverage, and a coverage gap that does not appear
  // in the roll-up is a gap nobody can see.
  function execIssueKeys(pid) {
    if (!execEligible(pid)) return [];
    var E = window.PDXExecRecord, pool;
    try { pool = E.actionsFor(pid); } catch (e) { return []; }
    var set = {}, kept = (pool && pool.kept) || [];
    for (var i = 0; i < kept.length; i++) {
      var all = kept[i].issues || [];
      for (var j = 0; j < all.length; j++) if (all[j] && all[j].issueKey) set[all[j].issueKey] = 1;
    }
    return Object.keys(set);
  }

  // ── One executive action → its printable proof line ─────────────────────────
  // The 🏛️ lane's proof line names a roll call: "H.R. 22 · On Motion to Recommit ·
  // Voted Yea". This lane's names a DOCUMENT, and it has to carry one field the
  // congressional line does not need — where the action stands today. A roll call is
  // final the moment it is gavelled; an executive order can be blocked, struck down,
  // rescinded or superseded afterwards, and a proof line that read "Executive Order
  // 14160 · Signed Executive Order" while that order sat under an injunction would be
  // overclaiming by omission.
  //   The class of power is named too, rather than flattened into "acted": signing a
  // bill Congress wrote and issuing an order alone are different claims about
  // authorship, and this is the line where that difference is cheapest to state.
  //   A standing PDXExecRecord cannot cite prints nothing at all. That is the same
  // fail-closed rule standingOf() applies — silence, never an assumed "in force".
  function execProofText(item) {
    if (!item) return '';
    var E = window.PDXExecRecord;
    var cls = (E && E.CLASSES && E.CLASSES[item.actionClass]) || null;
    var st = (E && E.STANDING && E.STANDING[item.standing]) || null;
    var parts = [];
    var name = item.documentId || item.measureNumber || item.title || '';
    if (name) parts.push(String(name));
    if (cls) parts.push(cls.verb);
    if (st) parts.push(st.label);
    return parts.join(' · ');
  }

  // The proof lines behind one issue on this lane, in the shape word-action.js's dot
  // rows already render. `kind` is 'exec-action' rather than 'vote' so no caller can
  // mistake one for a roll call and offer a deep link into a voting record this
  // figure does not have.
  function execProofLines(pid, issueKey, limit) {
    var out = [], pool;
    try { pool = execRecordsFor(pid, issueKey); } catch (e) { return out; }
    var max = limit || 2;
    for (var i = 0; i < pool.items.length && out.length < max; i++) {
      var it = pool.items[i], t = execProofText(it);
      if (!t) continue;
      out.push({
        text: t, kind: 'exec-action',
        documentId: it.documentId || '', actionClass: it.actionClass || '',
        standing: it.standing || null,
        url: it.sourceUrl || '', label: it.sourceLabel || '',
        // The record item itself, so a caller that needs the issue mappings (the
        // omnibus disclosure) does not have to re-derive the pool.
        item: it
      });
    }
    return out;
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
      // Nothing to judge yet. If the votes simply aren't loaded, say "loading"
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

  // The official scope's empty copy is written for legislators, and on the executive
  // lane it says the wrong thing: "No qualifying votes on record yet" reads as votes
  // we failed to find, when the truth is that a president casts none at all and the
  // gap is in the action mapping. Only the empty/thin tokens are re-worded — a real
  // consistent/contradicts/mixed verdict is the same finding in either lane and keeps
  // its shared label, because there is one integrity read, not two vocabularies.
  var _EXEC_EMPTY = {
    no_record: 'No qualifying executive action on record yet',
    limited: 'Limited executive record'
  };
  function laneVerdict(scope, token, lane) {
    var base = scopeVerdict(scope, token);
    if (lane !== 'exec') return base;
    var over = _EXEC_EMPTY[token];
    if (!over) return base;
    return { key: base.key, ico: base.ico, label: over, short: base.short, tone: base.tone, color: base.color, cls: base.cls };
  }

  // ── OFFICIAL RECORD (scope 'official') — votes + formal actions ONLY ─────────
  // The institutional "when it counted" answer: a real % or an honest null, never a
  // fabricated 0. Three feeders, in strict priority so nothing double-counts:
  //   1. vr_* roll-call record — AUTHORITATIVE where it exists (used alone).
  //   2. ✒️ executive actions — the presidential "did" side, for figures who hold
  //      the office and therefore cast no roll calls at all.
  //   3. migrated curated formal actions — fill issues neither of the above reaches.
  //
  // WHY EXECUTIVE ACTIONS SIT BELOW THE ROLL CALL. A figure with a roll-call record
  // on an issue was voting on it as a legislator; that is the stronger, systematic
  // evidence and it is used alone. In practice the two never collide today — a
  // president casts no votes and a member issues no orders — but the ordering is
  // declared rather than left to chance, because the day a former member becomes
  // president is the day an undeclared precedence starts double-counting.
  function officialIssue(pid, issueKey) {
    var rec = recordSummary(pid, issueKey);
    var warm = recordsWarm(pid);
    var stance = positionStance(pid, issueKey);
    var act = officialActionsFor(pid, issueKey);
    var exPool = execRecordsFor(pid, issueKey);
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
        hasStance: hasStance, pending: false, lane: 'record', sources: ['record']
      };
    }

    // 2. No roll call on this issue → the ✒️ executive record. Summarised by the
    //    SAME function as the roll-call branch, so this returns in the `record`
    //    slot and every downstream reader (judgedCountOf, word-action's judgedOf
    //    and testOf) works on it unchanged. `sources` names the lane so a surface
    //    can cite the document instead of a vote.
    if (exPool.items.length) {
      var exSum = execIssueSummary(pid, issueKey);
      if (exSum) {
        var xt = exSum.netVerdict === 'contradicts' ? 'contradicts'
               : exSum.netVerdict === 'consistent' ? 'consistent'
               : exSum.netVerdict === 'mixed' ? 'mixed'
               // An action on an issue this figure has never spoken on is coverage,
               // not an inconclusive test. 'limited' would claim there is word here
               // with no clear direction; 'no_stance' says what is actually true.
               : exSum.netVerdict === 'no_stance' ? 'no_stance'
               : 'limited';
        return {
          scope: 'official', token: xt, verdict: laneVerdict('official', xt, 'exec'),
          score: scoreFromRecord(exSum), record: exSum, officialActions: null, curated: null,
          contradictions: exSum.contradicts || 0, flags: 0,
          hasStance: hasStance, pending: false, lane: 'exec',
          execPool: exPool, execTouched: exPool.touched,
          execHeld: exPool.held.length ? exPool : null, sources: ['exec-actions']
        };
      }
    }

    // 3. No roll call and no scorable order → the migrated curated formal actions
    //    fill it (the Phase 3 coverage win). Scored honestly: all-contradiction is
    //    a real 0%, not a false one.
    if (act.total > 0) {
      var tok = (act.contradicts > 0 && act.consistent > 0) ? 'mixed'
              : act.contradicts > 0 ? 'contradicts' : 'consistent';
      return {
        scope: 'official', token: tok, verdict: scopeVerdict('official', tok),
        score: Math.round(100 * act.consistent / (act.consistent + act.contradicts)),
        record: null, officialActions: act, curated: null,
        contradictions: act.contradicts, flags: 0,
        hasStance: true, pending: false, lane: 'formal-actions', sources: ['formal-actions']
      };
    }

    // 4. Nothing on any feeder — honest empty (never a false 0%). An action that was
    //    held back rides along as `execHeld` so the surface can say WHY this reads as
    //    a coverage gap rather than leaving it blank: there is real, sourced record
    //    here, it just cannot be scored.
    var token, pending = false;
    // The lane is the OFFICE's, not the issue's. Reaching branch 4 already means no
    // qualifying roll call was found, so an exec-eligible figure here is one for whom
    // none is coming — and every string downstream must stop saying "votes". Keying
    // this off exPool.touched alone was wrong: it left the dozen issues no action maps
    // to on the congressional lane, where they would settle into "No votes yet" on a
    // president's profile. Roll-call precedence is preserved by construction, since a
    // real voting record would have returned from an earlier branch.
    var emptyLane = (exPool.touched > 0 || execEligible(pid)) ? 'exec' : null;
    if (exPool.touched > 0) {
      // Real record on file, none of it scorable. That is a coverage gap with a
      // reason, not a warming state — never queue a warm for it.
      token = 'no_record';
    } else if (!warm && hasStance) {
      pending = true; token = 'pending'; queueWarm(pid);
    } else {
      token = hasStance ? 'no_record' : 'no_stance';
    }
    return {
      scope: 'official', token: token, verdict: laneVerdict('official', token, emptyLane),
      score: null, record: null, officialActions: null, curated: null,
      contradictions: 0, flags: 0, hasStance: hasStance, pending: pending,
      lane: emptyLane, execTouched: exPool.touched,
      execHeld: exPool.held.length ? exPool : null, sources: []
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
      // ✒️ executive actions — the presidential action side. Included whether or not
      // the pair turned out to be scorable, so a held action still shows up as the
      // coverage it is.
      try { execIssueKeys(pid).forEach(function (k) { set[k] = 1; }); } catch (e) {}
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

  // Every roster card that renders a pending verdict queues its member, so one
  // homepage render queues the WHOLE roster — ~950 people. Firing that batch in a
  // single pass opened ~950 concurrent requests of ~125 KB each, and the browser's
  // per-host limit then served them strictly in the order they were asked: the
  // handful of members the hero showcase actually needs sat behind hundreds of
  // roster fetches, which is why those cards stayed on "Loading the record…"
  // while the page ground through arrivals. Every arrival also dispatches a warm
  // event, so the burst stacked ~950 responses, parses and listener passes into
  // as few tasks as the network would allow.
  //
  // Draining a few at a time drops nothing — every queued member is still fetched,
  // still noted, still announced — it only spreads the work across turns of the
  // event loop instead of stacking it. Four in flight keeps the pipe busy while
  // leaving room for the page's own requests.
  var WARM_CONCURRENCY = 4;
  var _inFlight = 0;
  function pump() {
    while (_inFlight < WARM_CONCURRENCY && _queue.length) warmOne(_queue.shift());
  }
  function warmOne(pid) {
    _inFlight++;
    var settled = false;
    // Hand the next fetch to a fresh task. Starting it inline would put its parse
    // in the same task as the listeners this one just woke.
    var done = function () {
      if (settled) return;
      settled = true;
      _inFlight--;
      try { setTimeout(pump, 0); } catch (e) { pump(); }
    };
    try {
      window.PDXVotingRecord.fetchMember(pid, { pageSize: 100 }).then(function (data) {
        if (data && data.items && data.items.length && typeof window.PDXVotingRecord.noteMember === 'function') {
          window.PDXVotingRecord.noteMember(pid, data.items);
        }
        try { window.dispatchEvent(new CustomEvent('pdx-consistency-warm', { detail: { pid: pid } })); } catch (e) {}
        done();
      }).catch(function () { done(); });
    } catch (e) { done(); }
  }
  function flushWarm() {
    _timer = null;
    pump();
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
      // .pdxc-gate-pct is gone: the gateway cards used to print a pooled percentage
      // beside the lane name, and both are verdict chips now. The rule is removed
      // rather than left dormant so nothing can quietly start emitting it again.
      '.pdxc-gate-q{font-family:"Barlow Condensed",sans-serif;font-style:italic;font-size:0.74rem;color:#c6d4ec;line-height:1.3;}' +
      '.pdxc-gate-foot{display:flex;align-items:center;justify-content:space-between;gap:0.5rem;}' +
      '.pdxc-gate-go{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.66rem;letter-spacing:0.05em;text-transform:uppercase;color:#9fdbd0;}' +
      // Phase 11 — gateway "How we score this" link.
      '.pdxc-gate-method{display:inline-block;margin-top:0.7rem;font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.68rem;letter-spacing:0.03em;text-transform:uppercase;color:#9fb4d4;cursor:pointer;background:none;border:none;padding:0.1rem 0;text-decoration:underline;text-underline-offset:2px;}' +
      '.pdxc-gate-method:hover{color:#c6d4ec;}' +
      '.pdxc-gate-method:focus-visible{outline:2px solid #7fb4ff;outline-offset:2px;}' +
      // Row holding the two footer links: our own methodology explainer and the
      // education layer's "How to read this" pill. margin-top lives here now, so
      // the two never collide when the pill is present (and the row collapses
      // harmlessly to just the one button when it is not).
      '.pdxc-gate-actions{display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem 0.9rem;margin-top:0.7rem;}' +
      // "This feeds the one score" line — every supporting layer states what it
      // contributes to the primary read and links to it. Mobile-first: the button
      // wraps under the sentence on a narrow screen and clears the 44px tap floor.
      '.pdxc-feeds{display:flex;flex-wrap:wrap;align-items:center;gap:0.35rem 0.6rem;margin:0.5rem 0 0.15rem;padding:0.45rem 0.55rem;border-left:2px solid rgba(159,180,212,0.35);background:rgba(159,180,212,0.06);border-radius:0.5rem;}' +
      '.pdxc-feeds-t{flex:1 1 12rem;min-width:0;font-family:"Barlow Condensed",sans-serif;font-size:0.7rem;line-height:1.35;color:#9fb4d4;}' +
      '.pdxc-feeds-go{min-height:2.75rem;padding:0.2rem 0.6rem;font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.68rem;letter-spacing:0.05em;text-transform:uppercase;color:#7fb4ff;background:rgba(127,180,255,0.1);border:1px solid rgba(127,180,255,0.3);border-radius:0.55rem;cursor:pointer;white-space:nowrap;}' +
      '.pdxc-feeds-go:hover{background:rgba(127,180,255,0.2);}' +
      '.pdxc-feeds-go:focus-visible{outline:2px solid #7fb4ff;outline-offset:2px;}' +
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
      // Slot for the 🏛️ Official Record share control (receipt-cards.js). The
      // control itself is styled globally in say-vs-do.css so both feeds' buttons
      // are defined side by side and cannot quietly converge; this only positions
      // it. Collapses to nothing when no card cleared the guards and the button was
      // removed, so an ineligible row shows no empty gap.
      '.pdxor-share{display:flex;flex-wrap:wrap;gap:0.4rem;margin-top:0.5rem;}' +
      '.pdxor-share:empty{display:none;margin:0;}' +
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
      // Top padding is deliberately tight (0.65rem, not 1rem): this sheet is the
      // LANDING PAGE for every shared card, and the first thing a reader saw used to
      // be a band of empty gradient above a 0.62rem eyebrow. The close button is
      // pulled in to match so the identity row starts as high as it can.
      '.pdxgap-sheet{position:relative;width:100%;max-width:640px;max-height:88vh;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;background:linear-gradient(180deg,#141a2c,#0c111e);border:1px solid rgba(255,255,255,0.12);border-radius:1rem 1rem 0 0;padding:0.65rem 0.85rem 1.3rem;box-shadow:0 -12px 40px rgba(0,0,0,0.5);font-family:"Barlow Condensed",sans-serif;animation:pdxgapUp .18s ease;}' +
      '@keyframes pdxgapUp{from{transform:translateY(14px);opacity:0.6;}to{transform:translateY(0);opacity:1;}}' +
      '@media (prefers-reduced-motion:reduce){.pdxgap-sheet{animation:none;}}' +
      '@media (min-width:560px){.pdxgap-back{align-items:center;}.pdxgap-sheet{border-radius:1rem;padding:0.85rem 1.1rem 1.4rem;}}' +
      // ── Arrival mode ────────────────────────────────────────────────────────
      // Opened as a cross-link from inside the app, this is a bottom sheet over a
      // page the reader can still see, and the dim strip above it is the point.
      // Opened from a shared `#record=` link it is the whole destination — there is
      // nothing behind it worth showing — so a short sheet pinned to the bottom
      // reads as a large empty space at the top of the screen. In that case the
      // sheet fills the viewport instead. Desktop keeps the centred card.
      '.pdxgap-back.pdxgap-arrive{align-items:stretch;}' +
      '.pdxgap-arrive .pdxgap-sheet{min-height:100%;max-height:100%;border-radius:0;padding-bottom:2rem;}' +
      '@media (min-width:560px){.pdxgap-back.pdxgap-arrive{align-items:center;}.pdxgap-arrive .pdxgap-sheet{min-height:0;max-height:92vh;border-radius:1rem;padding-bottom:1.4rem;}}' +
      '.pdxgap-x{position:absolute;top:0.45rem;right:0.5rem;width:1.85rem;height:1.85rem;border-radius:50%;border:1px solid rgba(255,255,255,0.15);background:rgba(10,15,30,0.6);color:#c6d4ec;font-size:1.15rem;line-height:1;cursor:pointer;z-index:2;}' +
      '.pdxgap-x:hover{background:rgba(10,15,30,0.9);}' +
      '.pdxgap-eyebrow{font-weight:700;font-size:0.62rem;letter-spacing:0.06em;text-transform:uppercase;color:#7e93b3;}' +
      // ── Header identity block ───────────────────────────────────────────────
      // Face, then name, then office/state/party — the same three cues the shared
      // image leads with, in the same order, so a reader who tapped a card can see
      // in one glance that this is the same person. The photo is the only genuinely
      // new element: it comes from _getPhotoUrl (the app's single headshot source)
      // and degrades to party-tinted initials, never to a broken image frame.
      '.pdxgap-id{display:flex;align-items:center;gap:0.6rem;padding-right:2.1rem;}' +
      '.pdxgap-face{flex:none;position:relative;width:3.1rem;height:3.1rem;border-radius:0.7rem;overflow:hidden;background:#0a0f1e;border:1px solid var(--c,#8fa5c4);box-shadow:0 0 0 1px rgba(0,0,0,0.4);}' +
      '.pdxgap-face img{width:100%;height:100%;object-fit:cover;display:block;}' +
      '.pdxgap-face-ph::after{content:attr(data-fb);position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:"Bebas Neue",sans-serif;font-size:1.2rem;letter-spacing:0.02em;color:var(--c,#8fa5c4);background:linear-gradient(135deg,rgba(255,255,255,0.06),rgba(0,0,0,0.25));}' +
      '.pdxgap-idmain{min-width:0;}' +
      // The member's name leads the block. Wraps rather than truncates — a clipped
      // name on a page whose whole job is identifying someone is worse than a
      // second line.
      '.pdxgap-who{font-weight:700;font-size:1.02rem;color:#e8eefc;line-height:1.15;}' +
      '.pdxgap-who-sub{display:flex;flex-wrap:wrap;align-items:center;gap:0.3rem;font-weight:600;font-size:0.7rem;color:#8fa5c4;line-height:1.3;margin-top:0.1rem;}' +
      '.pdxgap-party{font-weight:700;font-size:0.62rem;letter-spacing:0.04em;padding:0.05rem 0.34rem;border-radius:999px;color:var(--c,#8fa5c4);border:1px solid var(--c,#8fa5c4);background:rgba(10,15,30,0.5);}' +
      '.pdxgap-title{font-family:"Bebas Neue",sans-serif;font-size:1.5rem;letter-spacing:0.02em;color:#e8eefc;line-height:1;margin:0.55rem 0 0.4rem;}' +
      '@media (max-width:380px){.pdxgap-title{font-size:1.3rem;}.pdxgap-face{width:2.75rem;height:2.75rem;}}' +
      '.pdxgap-meta{display:flex;flex-wrap:wrap;align-items:center;gap:0.4rem;}' +
      // The verdict, sized so it is the thing the eye lands on. Same colour and
      // wording as the chip everywhere else; only the scale changes.
      '.pdxgap-rel-hero{display:inline-flex;align-items:center;gap:0.35rem;font-weight:700;font-size:0.8rem;letter-spacing:0.01em;padding:0.24rem 0.6rem;border-radius:999px;color:var(--c,#9fb4d4);border:1px solid var(--c,#9fb4d4);background:rgba(10,15,30,0.55);}' +
      '.pdxgap-relpct{font-family:"Bebas Neue",sans-serif;font-size:1.05rem;line-height:0.9;letter-spacing:0.02em;}' +
      '.pdxgap-note{font-size:0.74rem;color:#c6d4ec;line-height:1.4;margin-top:0.45rem;}' +
      // The header's person-level share row. Sits between the verdict chips and the
      // explanatory note, which is where a reader's thumb already is on a phone.
      '.pdxgap-hshare{margin-top:0.6rem;}' +
      '.pdxgap-note b{color:#f5d9a0;}' +
      '.pdxgap-sides{display:flex;flex-direction:column;gap:0.6rem;margin-top:0.7rem;}' +
      // Official-Record-only arrivals do NOT get a mostly-empty second column: the
      // record takes the full width and the 🧾 side becomes a short note beneath it.
      '.pdxgap-sides-solo{display:block;}' +
      '@media (min-width:560px){.pdxgap-sides{flex-direction:row;}.pdxgap-side{flex:1;min-width:0;}.pdxgap-sides-solo{display:block;}}' +
      '.pdxgap-side{border:1px solid rgba(255,255,255,0.1);border-radius:0.7rem;padding:0.65rem 0.7rem;background:rgba(10,15,30,0.4);}' +
      '.pdxgap-side-h{display:flex;align-items:center;justify-content:space-between;gap:0.5rem;}' +
      '.pdxgap-side-name{display:inline-flex;align-items:center;gap:0.35rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;font-size:0.76rem;color:#e8eefc;}' +
      '.pdxgap-pct{font-family:"Bebas Neue",sans-serif;font-size:1.4rem;line-height:0.9;}' +
      '.pdxgap-side-sub{font-size:0.66rem;color:#8fa2c0;line-height:1.35;margin:0.25rem 0 0.5rem;}' +
      // Section-level omnibus provenance. The count is the headline; the list of
      // other issues those bills covered moves inside the disclosure, because on a
      // member with a broad record that list was a comma cloud sitting directly
      // above the evidence a reader came for.
      '.pdxgap-omni{color:#93a6c4;border-left:2px solid rgba(147,166,196,0.3);padding-left:0.45rem;}' +
      'details.pdxgap-omni{margin:0.25rem 0 0.5rem;}' +
      'details.pdxgap-omni>summary{cursor:pointer;list-style:none;font-size:0.66rem;line-height:1.35;}' +
      'details.pdxgap-omni>summary::-webkit-details-marker{display:none;}' +
      'details.pdxgap-omni>summary::after{content:" ▾";color:#7e93b3;}' +
      'details.pdxgap-omni[open]>summary::after{content:" ▴";}' +
      'details.pdxgap-omni>summary b{color:#cfe0f8;}' +
      'details.pdxgap-omni>summary:focus-visible{outline:2px solid #7fb4ff;outline-offset:2px;border-radius:0.25rem;}' +
      '.pdxgap-omni-b{font-size:0.66rem;color:#93a6c4;line-height:1.45;margin-top:0.3rem;}' +
      '.pdxgap-acts{display:flex;flex-direction:column;}' +
      '.pdxgap-acts .pdxor-act{border-top:1px solid rgba(255,255,255,0.06);}' +
      '.pdxgap-acts .pdxor-act:first-child{border-top:none;}' +
      '.pdxgap-side-empty{font-size:0.72rem;color:#9fb4d4;line-height:1.4;padding:0.3rem 0;}' +
      // ── Per-vote multi-issue block ──────────────────────────────────────────
      // An omnibus vote used to disclose itself as one long sentence naming every
      // other issue it touched ("The same vote also advanced A, B, C and cut against
      // D, E."). On a phone that is a paragraph of bold labels between the reader
      // and the next vote. Same facts, same source (_measureOmnibusContext), now as
      // a one-line header plus counted Advances / Opposes rows, with the labels
      // themselves behind a disclosure.
      '.pdxgap-om{margin:0.3rem 0 0.1rem;padding:0.4rem 0.5rem;border-radius:0.5rem;border:1px solid rgba(147,166,196,0.22);background:rgba(147,166,196,0.07);}' +
      '.pdxgap-om-h{display:flex;flex-wrap:wrap;align-items:center;gap:0.3rem;font-size:0.66rem;font-weight:700;letter-spacing:0.02em;color:#b9c9e4;}' +
      '.pdxgap-om-split{font-weight:700;font-size:0.6rem;letter-spacing:0.03em;text-transform:uppercase;color:#f5c842;border:1px solid rgba(245,200,66,0.45);background:rgba(245,200,66,0.12);border-radius:999px;padding:0.02rem 0.32rem;}' +
      '.pdxgap-om-rows{display:flex;flex-wrap:wrap;gap:0.25rem 0.55rem;margin-top:0.3rem;}' +
      '.pdxgap-om-row{display:inline-flex;align-items:baseline;gap:0.25rem;font-size:0.66rem;color:#9fb4d4;line-height:1.3;}' +
      '.pdxgap-om-row b{font-weight:700;}' +
      '.pdxgap-om-adv b,.pdxgap-om-adv .pdxgap-om-ico{color:#6ee7a0;}' +
      '.pdxgap-om-opp b,.pdxgap-om-opp .pdxgap-om-ico{color:#f89b9b;}' +
      '.pdxgap-om-neu b,.pdxgap-om-neu .pdxgap-om-ico{color:#9fb4d4;}' +
      '.pdxgap-om-all{margin-top:0.35rem;}' +
      '.pdxgap-om-all>summary{cursor:pointer;list-style:none;font-size:0.63rem;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:#7fb4ff;}' +
      '.pdxgap-om-all>summary::-webkit-details-marker{display:none;}' +
      '.pdxgap-om-all>summary::after{content:" ▾";}' +
      '.pdxgap-om-all[open]>summary::after{content:" ▴";}' +
      '.pdxgap-om-all>summary:focus-visible{outline:2px solid #7fb4ff;outline-offset:2px;border-radius:0.25rem;}' +
      '.pdxgap-om-chips{display:flex;flex-wrap:wrap;gap:0.25rem;margin-top:0.35rem;}' +
      '.pdxgap-om-chip{font-size:0.63rem;line-height:1.3;padding:0.08rem 0.4rem;border-radius:999px;border:1px solid rgba(255,255,255,0.14);background:rgba(10,15,30,0.5);color:#c6d4ec;}' +
      '.pdxgap-om-chip.pdxgap-om-c-adv{border-color:rgba(110,231,160,0.4);color:#a9e9c6;}' +
      '.pdxgap-om-chip.pdxgap-om-c-opp{border-color:rgba(248,155,155,0.4);color:#f3bcbc;}' +
      // ── Official-Record-only state (the honest 🧾 empty state) ───────────────
      // Every shared card lands here with a formal record and no curated Say-vs-Do
      // evidence, because the share gate selects on vote depth while the curated
      // layer covers different members and issues. A blank narrow column read
      // as an unfinished page. This is the same absence, stated on purpose: what IS
      // on file, what ISN'T, and that the difference is coverage rather than a
      // verdict. It invents no evidence and carries no score.
      '.pdxgap-solo{margin-top:0.6rem;border:1px dashed rgba(147,166,196,0.4);border-radius:0.7rem;padding:0.6rem 0.7rem;background:rgba(147,166,196,0.06);}' +
      '.pdxgap-solo-h{display:flex;align-items:center;gap:0.35rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;font-size:0.7rem;color:#b9c9e4;}' +
      '.pdxgap-solo-b{font-size:0.72rem;color:#c6d4ec;line-height:1.45;margin-top:0.35rem;}' +
      '.pdxgap-solo-b b{color:#e8eefc;}' +
      '.pdxgap-solo-n{font-size:0.66rem;color:#8fa2c0;line-height:1.45;margin-top:0.4rem;padding-top:0.4rem;border-top:1px solid rgba(255,255,255,0.08);}' +
      // The share control sits INSIDE the 🏛️ side of the sheet, never in the footer
      // and never on the 🧾 side, so what it shares is unambiguous. The separator
      // above it keeps it reading as the section's action rather than as one more
      // evidence row, now that the evidence list above it can be full-width.
      '.pdxgap-share{margin-top:0.6rem;padding-top:0.55rem;border-top:1px solid rgba(255,255,255,0.08);}' +
      '.pdxgap-share:empty{display:none;margin:0;padding:0;border-top:none;}' +
      '.pdxgap-foot{font-size:0.66rem;color:#7e93b3;line-height:1.4;margin-top:0.85rem;padding-top:0.6rem;border-top:1px solid rgba(255,255,255,0.08);}' +
      // ── Next step ───────────────────────────────────────────────────────────
      // A shared #record= link opens this sheet over whatever page the reader
      // happened to land on, so closing it drops them nowhere. This row is the
      // way out: one line of three concrete moves, above the footer's fine print
      // rather than buried in it. Sized for a thumb — the sheet is a mobile
      // bottom sheet first — and wrapping rather than scrolling on narrow
      // screens, so the third option is never the one that falls off the edge.
      '.pdxgap-next{margin-top:0.85rem;padding-top:0.7rem;border-top:1px solid rgba(255,255,255,0.08);}' +
      '.pdxgap-next-h{font-family:"Barlow Condensed",sans-serif;text-transform:uppercase;letter-spacing:0.08em;font-size:0.68rem;color:#8fa2c0;margin-bottom:0.45rem;}' +
      '.pdxgap-next-row{display:flex;flex-wrap:wrap;gap:0.4rem;}' +
      '.pdxgap-nx{display:inline-flex;align-items:center;gap:0.35rem;flex:1 1 auto;min-width:11rem;' +
        'text-align:left;text-decoration:none;cursor:pointer;font-family:"Barlow Condensed",sans-serif;' +
        'font-size:0.82rem;letter-spacing:0.01em;line-height:1.25;color:#dbe6f7;padding:0.5rem 0.6rem;' +
        'border:1px solid rgba(127,180,255,0.28);border-radius:0.55rem;background:rgba(30,58,138,0.18);' +
        'transition:background 0.15s,border-color 0.15s;}' +
      '.pdxgap-nx:hover,.pdxgap-nx:focus-visible{background:rgba(30,58,138,0.34);border-color:rgba(127,180,255,0.5);}' +
      '.pdxgap-nx-ico{flex:none;}' +
      // Phase 11 — methodology explainer content (rendered inside the shared sheet).
      '.pdxm-lead{font-size:0.8rem;color:#c6d4ec;line-height:1.45;margin:0.5rem 0 0.8rem;}' +
      '.pdxm-row{border-top:1px solid rgba(255,255,255,0.08);padding:0.6rem 0;}' +
      '.pdxm-row-h{display:flex;align-items:center;gap:0.4rem;font-weight:700;font-size:0.82rem;color:#e8eefc;}' +
      '.pdxm-row-b{font-size:0.75rem;color:#c6d4ec;line-height:1.5;margin-top:0.3rem;}' +
      '.pdxm-row-b b{color:#e8eefc;font-weight:700;}' +
      // "All of these have to hold" reads as a checklist, not a paragraph.
      '.pdxm-row-b ul.pdxm-steps{list-style:none;margin:0.45rem 0 0.15rem;padding:0;}' +
      '.pdxm-row-b ul.pdxm-steps li{position:relative;padding-left:1.05rem;margin:0.32rem 0;}' +
      '.pdxm-row-b ul.pdxm-steps li::before{content:"→";position:absolute;left:0;color:#7fb4ff;}' +
      // A reader who tapped "how this is judged" on a shared card arrives with one
      // question; the row that answers it is briefly ringed so it is findable.
      '.pdxm-row-focus{border-radius:0.5rem;box-shadow:0 0 0 2px rgba(127,180,255,0.55);background:rgba(127,180,255,0.07);}' +
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
    // every meaningful verdict and the live "loading…" state.
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
    pending:     { ch: '·', cls: 'vrdot-record',      tip: 'Loading the record…' }
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
    // BOTH cards carry a verdict chip and no percentage. The Official Record card used
    // to print its pooled % here, which meant the record stage opened with a number
    // that competed with the profile's one primary score a screen above. These cards
    // are doors into the evidence, so they say what the evidence adds up to in words
    // and leave the arithmetic to the sections they open.
    return '<span class="pdxc-chip pdxc-' + m.cls + '">' + (ov.token === 'pending' ? '<span class="pdxc-spin"></span>' : m.ico + ' ') + esc(m.label) + '</span>';
  }
  // One scope's copy, in the vocabulary of the lane the figure actually acts in.
  // Falls back to the legislative wording for everyone off the executive gate, so
  // this is a no-op on every congressional profile. Only `question` and `blurb` are
  // overridable — the key, icon and label are the same scope either way, because
  // this swaps a noun and not a scoring system.
  function _scopeFor(scope, pid) {
    var sc = SCOPES[scope];
    if (!sc || !sc.exec || !execEligible(pid)) return sc;
    return {
      key: sc.key, icon: sc.icon, label: sc.label, empty: sc.empty,
      question: sc.exec.question || sc.question,
      blurb: sc.exec.blurb || sc.blurb
    };
  }
  function _gateCard(scope, pid) {
    var sc = _scopeFor(scope, pid);
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
        '<div class="pdxc-gate-sub">Two views of the same question, feeding the one score above — kept apart so each keeps its own boundary. ' +
          '<b>🏛️ ' + LT('officialrecord', 'Official Record') + '</b> is the formal test: ' +
          (execEligible(pid) ? 'the laws they signed or vetoed and the orders they issued.' : 'the votes and official acts.') + ' ' +
          '<b>🧾 ' + LT('saydo', 'Say-vs-Do') + '</b> is the broader public picture, held as context rather than counted. ' +
          'Discrete promises are tracked on their own, as the top tier of that score.</div>' +
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
  // finish warming, so the Official Record summary resolves from "Loading the record…" to its
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
      // ── Next-step row inside the gap sheet ────────────────────────────────
      // "Open the full profile" — the step back out for a reader who arrived on
      // a shared #record= link, where the sheet is floating over whatever page
      // the app happened to be showing. The sheet closes first: leaving it up
      // over the profile it just navigated to would look like nothing happened.
      var prof = e.target.closest && e.target.closest('[data-pdxc-profile]');
      if (prof) {
        e.preventDefault();
        var ppid = prof.getAttribute('data-pdxc-profile') || '';
        closeGap();
        if (ppid && typeof window.showProfile === 'function') window.showProfile(ppid);
        return;
      }
      // "Find your own reps" — a real anchor, so it keeps its href for a
      // middle-click or a long-press. The sheet is modal, so it has to come
      // down before the hub it points at is visible; the navigation itself is
      // left to the browser.
      var away = e.target.closest && e.target.closest('[data-pdxc-gapclose]');
      if (away) { closeGap(); return; }
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
        var orOpen = _lidsOpenIn(secs[j]);
        // The ledger is re-rendered with the rows: it lives inside this section now,
        // and re-rendering only the rows would silently delete it on the first warm.
        secs[j].innerHTML = _lidify(_officialInner(pid)) + _orExecLedgerHtml(pid);
        _lidsReopen(orOpen);
      }
      // …and the divergence section, so the comparison appears once the vote-based
      // side has a real % to line up against the public-record side.
      var dvs = document.querySelectorAll('[data-pdxc-divergence-pid]');
      for (var d = 0; d < dvs.length; d++) {
        if (dvs[d].getAttribute('data-pdxc-divergence-pid') !== String(pid)) continue;
        var dvOpen = _lidsOpenIn(dvs[d]);
        dvs[d].innerHTML = _lidify(_divergenceInner(pid));
        _lidsReopen(dvOpen);
      }
      // …and the Say-vs-Do feed, so its "compare vs the record" cross-links resolve
      // once the vote-based side has a % to compare against (Phase 9).
      var sds = document.querySelectorAll('[data-pdxc-saydo-pid]');
      for (var q = 0; q < sds.length; q++) {
        if (sds[q].getAttribute('data-pdxc-saydo-pid') !== String(pid)) continue;
        var sdOpen = _lidsOpenIn(sds[q]);
        sds[q].innerHTML = _lidify(_sdInner(pid));
        _lidsReopen(sdOpen);
      }
      // The repaint above is the moment the vote record actually exists, so it is
      // also the moment a vote-derived share card can first be built. Re-run the
      // reveal pass over the freshly painted rows.
      _rcHydrateSoon();
      _saHydrateSoon();
    });
  }

  // ── Lids across a warm repaint ──────────────────────────────────────────────
  // The three sections below are rebuilt in place when the vote record arrives, which
  // means their HTML is assigned straight to innerHTML and never passes through the
  // spine. Two things have to be done by hand there: resolve the lid markers, or the
  // fold silently disappears and the section grows back to full height; and re-open
  // any lid the reader had already opened, or their own tap is undone under them.
  function _lidify(html) {
    try {
      var SP = window.PDXProfileSpine;
      if (SP && typeof SP.applyLids === 'function') return SP.applyLids(html, true);
    } catch (e) {}
    return html;
  }
  function _lidsOpenIn(host) {
    var out = [];
    try {
      var els = host.querySelectorAll('.dd-body.dd-open[id^="pdxsp-lid-"]');
      for (var i = 0; i < els.length; i++) if (els[i].id) out.push(els[i].id);
    } catch (e) {}
    return out;
  }
  function _lidsReopen(ids) {
    if (!ids || !ids.length) return;
    setTimeout(function () {
      ids.forEach(function (id) {
        try {
          var b = document.getElementById(id);
          if (!b || b.classList.contains('dd-open')) return;
          // Through the same control the reader used, so a deferred body still mounts.
          if (typeof window.toggleDD === 'function') window.toggleDD(id);
        } catch (e) {}
      });
    }, 0);
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
  // ── one lane, one set of nouns ───────────────────────────────────────────────
  // Everything below this line renders the Official Record. Most of its wording is
  // shared, but the countable noun is not: the 🏛️ lane counts roll calls and the ✒️
  // lane counts documents. "No votes yet" on a president's profile is not a softer
  // way of saying "no action on file" — it is a false statement about someone who
  // casts none, and it appears on the row chip, the composition meter and the fold
  // label, which is three chances to say it. So the noun is looked up once, from the
  // lane the read itself declares, and every caller asks for it rather than inlining
  // 'vote'. A read with no lane keeps the congressional wording, which is what every
  // existing surface already renders.
  var _LANE_NOUN = {
    exec: { one: 'action', many: 'actions', multiOne: 'a multi-issue law or order', multiMany: 'multi-issue laws and orders',
            none: 'No action on file yet', noWord: 'No stated position yet', unscorable: 'On file, not scorable',
            qualifying: 'qualifying executive action', qualifyingMany: 'qualifying executive actions' },
    record: { one: 'vote', many: 'votes', multiOne: 'a multi-issue bill', multiMany: 'multi-issue bills',
              none: 'No votes yet', qualifying: 'qualifying vote', qualifyingMany: 'qualifying votes' }
  };
  function _orNoun(ov) {
    return (ov && ov.lane === 'exec') ? _LANE_NOUN.exec : _LANE_NOUN.record;
  }
  // Whether any executive action reaches this issue at all — scorable or held. It is the
  // difference between "we found nothing" and "we found something we cannot score", and
  // only the second one has a reason worth printing.
  function _orExecTouched(ov) {
    if (!ov) return false;
    if (typeof ov.execTouched === 'number') return ov.execTouched > 0;
    return !!(ov.execHeld && ov.execHeld.held && ov.execHeld.held.length);
  }
  // Which lane's vocabulary a WHOLE section should speak. Only when every scored row
  // is on the executive lane — a figure with both a roll-call record and executive
  // actions gets the shared wording, because either lane's nouns would be wrong about
  // some of their rows. With nothing scored yet it falls back to the office gate, so an
  // empty section on a president's profile still does not ask about votes.
  function _orSectionNoun(pid, scored) {
    var anyOther = false, anyExec = false;
    for (var i = 0; i < (scored || []).length; i++) {
      var ln = scored[i] && scored[i].ov && scored[i].ov.lane;
      if (ln === 'exec') anyExec = true; else anyOther = true;
    }
    if (anyExec && !anyOther) return _LANE_NOUN.exec;
    if (anyOther) return _LANE_NOUN.record;
    return execEligible(pid) ? _LANE_NOUN.exec : _LANE_NOUN.record;
  }
  var _OR_ROW = {
    consistent:  { ico: '✓', label: 'Backed it up',   cls: 'consistent' },
    contradicts: { ico: '⚠', label: 'Contradicts',    cls: 'contradicts' },
    mixed:       { ico: '◑', label: 'Cuts both ways', cls: 'mixed' },
    limited:     { ico: '…', label: 'Limited',        cls: 'limited' },
    // The 🏛️ wording, which is also the default. On the ✒️ lane _orRowVerdict swaps
    // these two for _LANE_NOUN.exec.none — they are the only labels in this map that
    // name the countable thing, so they are the only two that can be wrong about a
    // figure who casts no roll calls.
    no_record:   { ico: '—', label: 'No votes yet',   cls: 'none' },
    no_stance:   { ico: '—', label: 'No votes yet',   cls: 'none' },
    // The compressed form of the shared 'Loading the record…' — the same voice this
    // map already uses for every other token ('Backed it up' for 'Backs it up',
    // 'No votes yet' for 'No record yet'). It stays inside the row vocabulary's
    // 16-character scan budget, which the full phrase does not; what matters for one
    // voice across surfaces is that it loads rather than checks.
    pending:     { ico: '⏳', label: 'Loading…', cls: 'pending' }
  };
  // Pure: an officialIssue() read → what the row's record chip should say, plus the
  // one-line reason when the verdict is a shrug. `why` is the piece that used to be
  // missing entirely: "Limited" has several distinct causes and they are not
  // interchangeable to a reader deciding whether to trust the row.
  function _orRowVerdict(ov) {
    var token = (ov && ov.token) || 'no_record';
    var m = _OR_ROW[token] || _OR_ROW.no_record;
    var n = _orNoun(ov);
    var rec = (ov && ov.record) || null;
    var acts = (ov && ov.officialActions) || null;
    var total = rec ? (rec.total || 0) : (acts ? (acts.total || 0) : 0);
    var why = '';
    if (token === 'limited') {
      if (rec && !rec.hasStance) {
        why = total === 1
          ? 'One ' + n.one + ' is mapped to this issue, but they have not stated a position on it — so there is nothing to check the ' + n.one + ' against.'
          : total + ' ' + n.many + ' are mapped to this issue, but they have not stated a position on it — so there is nothing to check them against.';
      } else if (rec && rec.noPosition >= total && total > 0) {
        why = total === 1
          ? 'The one ' + n.one + ' mapped here took no clear position on this issue.'
          : 'The ' + total + ' ' + n.many + ' mapped here took no clear position on this issue.';
      } else {
        why = 'Not enough directional ' + n.many + ' on this issue to call it either way yet.';
      }
    } else if (token === 'no_record' || token === 'no_stance') {
      // On the ✒️ lane this is the case the circularity guard produces most often, so
      // the reason it gives has to be the one that is actually true: the record exists,
      // and what is missing is independent word to check it against.
      why = (ov && ov.execHeld && ov.execHeld.circular > 0)
        ? 'Executive action on this issue is on file, but the stated position was written from that same document — so it cannot also be the test of it. That is our coverage, not a verdict.'
        : token === 'no_stance'
          ? (_orExecTouched(ov)
              ? 'Executive action on this issue is on file, but they have not stated a position for it to be checked against. That is our coverage, not a verdict.'
              : 'They have not stated a position on this issue, so there is nothing to check a record against.')
          : 'They have stated a position, but no ' + n.qualifying + ' has been mapped to this issue yet. That is our coverage, not a verdict.';
    }
    // Keyed off the RESOLVED entry rather than the token, so an unrecognised token —
    // which degrades to no_record — is re-worded on this lane too.
    var label = m.label;
    // WHICH empty string is true depends on which side is missing, and a single
    // override got that wrong in both directions: a row whose evidence list is about
    // to print "Executive Order 14151 / Signed Executive Order / In force" was
    // captioned "No action on file yet", and so was a row where the action is on file
    // and clean and it is the stated position that is absent. A caption that
    // contradicts the evidence printed underneath it is worse than a vague one.
    if (n === _LANE_NOUN.exec && (m === _OR_ROW.no_record || m === _OR_ROW.no_stance)) {
      label = !_orExecTouched(ov) ? n.none
        : (m === _OR_ROW.no_stance) ? n.noWord
        : n.unscorable;
    }
    return {
      key: token, ico: m.ico, label: label,
      cls: m.cls, why: why, total: total,
      // "1 vote" / "3 votes" beside a thin label turns a shrug into a fact.
      count: total ? (total + ' ' + (total === 1 ? n.one : n.many)) : ''
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
  // record IS mapped, the absence is usually the reason the verdict reads "Limited",
  // so name it instead of dropping the chip and leaving the reader to guess. Two
  // things this used to get wrong on a president's row: it said "Votes are mapped to
  // this issue" about someone who casts none, and it led with "Nothing stated yet" —
  // an absence, where the row's actual content is a documented action. The chip now
  // names the lane and says what IS there.
  function _orSaysChipHtml(pid, issueKey, ov) {
    var chip = _orStanceChip(pid, issueKey);
    if (chip) return chip;
    var n = _orNoun(ov);
    var has = !!(ov && ov.record && ov.record.total) || _orExecTouched(ov);
    if (!has) return '';
    return '<span class="pdxor-stance pdxor-stance-none" style="--c:#9fb4d4"' +
      ' title="' + escAttr('We have their ' + n.many + ' on this issue, but no stated position to check them against.') + '">' +
      '💬 Says: no position on record</span>';
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
    // The ✒️ executive lane names a document, not a roll call — so it renders here
    // rather than falling through to the vote line. Two differences carry the whole
    // point of the branch: the standing is printed (an order under an injunction is
    // not the same evidence as one in force), and the line is NOT a tap target,
    // because the destination the congressional line offers — this figure's roll-call
    // list — does not exist for a president. The primary source is one tap away in
    // the expanded row instead, where it can be a real button.
    if (ov && ov.lane === 'exec') {
      var xl = execProofLines(pid, issueKey, limit || 1);
      if (!xl.length) return '';
      var xv = VERDICTS[ov.token] || VERDICTS.limited;
      var E = window.PDXExecRecord;
      return '<div class="pdxor-proofs">' + xl.map(function (l) {
        var clsDef = (E && E.CLASSES && E.CLASSES[l.actionClass]) || null;
        var stDef = (E && E.STANDING && E.STANDING[l.standing]) || null;
        var doc = l.documentId ? '<b class="pdxor-proof-bill">' + esc(l.documentId) + '</b>' : '';
        var bits = [];
        if (clsDef) bits.push(esc(clsDef.verb));
        if (stDef) bits.push('<b>' + esc(stDef.label) + '</b>');
        var body = doc
          ? doc + (bits.length ? ' · ' + bits.join(' · ') : '')
          : esc(l.text);
        var xMulti = _orExecOmniNote(l.item, issueKey);
        return '<div class="pdxor-proof">' +
            '<span class="pdxor-proof-ico" style="color:' + xv.color + '" aria-hidden="true">' + xv.ico + '</span>' +
            '<span class="pdxor-proof-txt">' + body +
              (xMulti ? '<span class="pdxor-proof-multi">🧩 ' + esc(xMulti) + '</span>' : '') +
            '</span>' +
          '</div>';
      }).join('') + '</div>';
    }
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
  // Why a real, sourced executive action is on file but not scored. Every one of these
  // reads as a coverage gap, never as a grade: the action happened, the mapping is
  // true, and what is missing is our ability to use it as evidence about THIS figure's
  // consistency. Stated on the surface for the same reason the engine fails closed —
  // an unexplained absence is indistinguishable from not having looked.
  var _EXEC_HELD_REASON = {
    circular: 'On file — but the stated position on this issue was written from this document, so it cannot also be the test of it',
    no_standing: 'On file — no citable current standing yet, so it carries no verdict',
    unmapped_direction: 'On file — its effect on this issue is not cleanly mapped yet'
  };
  function _orRowEvidenceHtml(pid, issueKey, ov) {
    var lines = [], extra = '';
    // ✒️ executive lane: the documents behind this row, each with its class of power,
    // its date and where it stands, linking to the Federal Register / GPO page rather
    // than to a roll call. Held actions (circular, unmapped direction, no citable
    // standing) are listed underneath with the reason, so the row says WHY it reads
    // thin instead of quietly showing less than is on file.
    if (ov && ov.lane === 'exec') {
      var E0 = window.PDXExecRecord, xPool = null;
      try { xPool = execRecordsFor(pid, issueKey); } catch (e) { xPool = null; }
      if (xPool) {
        var stanceX = (ov.record && ov.record.stance) || positionStance(pid, issueKey) || null;
        xPool.items.forEach(function (it) {
          var clsD = (E0 && E0.CLASSES && E0.CLASSES[it.actionClass]) || null;
          var stD = (E0 && E0.STANDING && E0.STANDING[it.standing]) || null;
          var metaX = [clsD ? clsD.verb : '', stD ? stD.label : '', it.date || ''].filter(Boolean).join(' · ');
          lines.push(_orActLine(_orItemVerdict(it, issueKey, stanceX),
            it.documentId || it.title || 'Executive action',
            metaX, it.sourceUrl, it.sourceLabel, _orExecOmniNote(it, issueKey)));
        });
        xPool.held.forEach(function (h) {
          lines.push(_orActLine('limited',
            h.documentId || h.title || 'Executive action',
            _EXEC_HELD_REASON[h.reason] || 'On file; not usable as evidence here',
            h.sourceUrl, h.sourceLabel, '', null,
            // The declared note, if the seed carries one — passed as pre-rendered
            // omniHtml rather than as an omniNote so it does not pick up the 🧩
            // multi-issue icon, which would claim something different.
            h.note ? '<span class="pdxor-omni">' + esc(h.note) + '</span>' : ''));
        });
      }
      if (!lines.length) return '';
      return '<div class="pdxor-acts-open">' + lines.join('') + '</div>';
    }
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
    // The ✒️ lane has no destination for this button. Offering "Open this vote in the
    // full record" on a president's row would send a reader to a roll-call list that
    // is empty by definition; the primary Federal Register / Congress.gov link in the
    // expanded evidence rows is the real receipt, and it is already there.
    if (ov && ov.lane === 'exec') return '';
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

  // ── Official Record share affordance (receipt-cards.js) ─────────────────────
  // Two slots, both on the 🏛️ side only: one in each profile stance row, one in the
  // gap sheet's Official Record column. Neither decides eligibility — the control is
  // rendered hidden and receipt-cards.js reveals it only for (member, issue) pairs
  // whose card clears every trust guard, or removes it outright. Re-deriving that
  // here would mean a second copy of the guards, and a second copy is one that
  // drifts; so this file offers the slot and asks nothing about the answer.
  function _rcShareHtml(pid, issueKey, opts) {
    try {
      var RC = window.PDXReceiptCards;
      if (!RC || typeof RC.buttonHtml !== 'function' || !pid || !issueKey) return '';
      return RC.buttonHtml({ pid: pid, issueKey: issueKey, block: !!(opts && opts.block) });
    } catch (e) { return ''; }
  }
  // Reveal pass. Idempotent and cheap — hydrate() only looks at buttons still marked
  // pending — so it is safe on every repaint. Scheduled rather than immediate because
  // both callers hand their HTML to someone else to mount.
  function _rcHydrateSoon() {
    try {
      var RC = window.PDXReceiptCards;
      if (!RC || typeof RC.hydrate !== 'function') return;
      setTimeout(function () { try { RC.hydrate(document); } catch (e) {} }, 0);
    } catch (e) {}
  }

  // ── Person-level share affordance (share-anywhere.js) ───────────────────────
  // The complement to _rcShareHtml rather than a replacement for it. That one is
  // about a VOTE and is right to vanish when no vote qualifies; this one is about a
  // PERSON, so it always has something to offer and never leaves the reader with no
  // control at all. It is also fail-open and fixed-size, which is why it can sit in
  // the gap sheet header: hydrating it changes an icon and an accessible name, not
  // the height of a bottom sheet the reader is already looking at.
  function _saShareHtml(pid, issueKey) {
    try {
      var SA = window.PDXShareAnywhere;
      if (!SA || typeof SA.buttonHtml !== 'function' || !pid) return '';
      return '<div class="pdxgap-hshare">' +
        SA.buttonHtml({ pid: pid, issueKey: issueKey || '', block: true, hint: true,
                        text: 'Share this' }) +
        '</div>';
    } catch (e) { return ''; }
  }
  function _saHydrateSoon() {
    try {
      var SA = window.PDXShareAnywhere;
      if (!SA || typeof SA.hydrateSoon !== 'function') return;
      SA.hydrateSoon(document);
    } catch (e) {}
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
      var comp = window._recordComposition(ov.record, stats, { noun: _orNoun(ov) });
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
      var n = _orSectionNoun(pid, scored);
      var rated = 0, thin = 0, omni = 0, single = 0;
      (scored || []).forEach(function (s) {
        if (!s || !s.ov || typeof s.ov.score !== 'number' || !s.ov.record) return;
        var stats = (typeof window._pdxRecordOmnibusStats === 'function')
          ? window._pdxRecordOmnibusStats(pid, s.key) : null;
        var c = window._recordComposition(s.ov.record, stats, { noun: _orNoun(s.ov) });
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
      if (thin) parts.push(thin + ' on 1–2 ' + n.many);
      if (omni) parts.push(omni + ' mostly multi-issue');
      // The unweighted figure is deliberately NOT in the visible pill any more: this
      // section no longer prints a pooled percentage, and a lone "unweighted 71%"
      // beside a verdict chip reads as that missing headline. It stays in the tooltip,
      // where it is an audit note rather than a competing number.
      var tip = 'The per-issue percentages here are pooled for the profile’s one score, weighted by how many ' +
        'judged ' + n.many + ' sit behind each one — so an issue decided by a single ' + n.one + ' counts less ' +
        'than one decided by ten. ' + rated + ' issue' + (rated === 1 ? '' : 's') +
        ' had a percentage to average' +
        (judged ? ', over ' + judged + ' judged ' + (judged === 1 ? n.one : n.many) + ' in total' : '') +
        (single ? '; ' + single + ' of those issues rest on a single judged ' + n.one : '') +
        (thin ? '; ' + thin + ' rest on two or fewer' : '') +
        (omni ? '; ' + omni + ' are driven mainly by ' + n.multiMany : '') + '. ' +
        (moved
          ? 'Counting every issue equally, regardless of depth, would give ' + unw + '% instead.'
          : 'Weighting does not change the figure here.');
      return '<span class="pdxor-compsum" title="' + esc(tip) + '" aria-label="' + esc(tip) + '">' +
        esc(parts.join(' · ')) + '</span>';
    } catch (e) { return ''; }
  }
  function _orActLine(verdict, title, meta, url, label, omniNote, focus, omniHtml) {
    var mv = VERDICTS[verdict] || VERDICTS.limited;
    var src = url ? ' <a href="' + esc(url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">' + esc(label || 'Source') + ' ↗</a>' : '';
    // `omniNote` (optional) discloses that this line came from a multi-issue bill —
    // calm and factual, so a contradiction from an omnibus never reads like a
    // single-issue one. Never invented here: see _orOmniNote below.
    //   `omniHtml` (optional) is the same disclosure pre-rendered as a block by the
    // caller — the gap sheet's scannable Advances / Opposes variant. When supplied it
    // replaces the inline sentence; every other surface keeps the sentence unchanged.
    var omni = omniHtml || (omniNote ? '<span class="pdxor-omni">🧩 ' + omniNote + '</span>' : '');
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
  // The SAME disclosure for the ✒️ lane, in this lane's nouns. A reconciliation bill
  // signed once lands on a dozen issues at different angles, exactly as one roll
  // call on it does — so the disclosure is not optional here either. What changes is
  // only the vocabulary: "one vote" would be false about a signature, and the class of
  // power names itself ("one law", "one order") because that is the honest noun for
  // what was signed.
  var _EXEC_OMNI_NOUN = {
    signed_law: 'law', vetoed_law: 'veto',
    executive_order: 'order', directive: 'directive'
  };
  function _orExecOmniNote(item, issueKey) {
    if (!item || typeof window._measureOmnibusContext !== 'function') return '';
    var ctx;
    try { ctx = window._measureOmnibusContext(item, issueKey, {}, { labelFn: _issueLabel }); }
    catch (e) { return ''; }
    if (!ctx) return ''; // single-issue action — nothing to disclose
    var noun = _EXEC_OMNI_NOUN[item.actionClass] || 'action';
    var names = function (list) {
      var out = list.slice(0, 3).map(function (c) { return String(c.label); });
      if (list.length > 3) out.push('+' + (list.length - 3) + ' more');
      return out.join(', ');
    };
    var parts = [];
    if (ctx.advances.length) parts.push('advanced ' + names(ctx.advances));
    if (ctx.opposes.length) parts.push('cut against ' + names(ctx.opposes));
    var tail = parts.length
      ? ' The same ' + noun + ' also ' + parts.join(' and ') + '.'
      : (ctx.otherLabels.length ? ' It also covered ' + names(ctx.others) + '.' : '');
    return 'Multi-issue action — one ' + noun + ', ' + ctx.count + ' issues.' + tail;
  }
  // The SAME disclosure, laid out to be scanned instead of read — used by the gap
  // sheet, where this line is the arrival surface for a shared card and a paragraph
  // of bold issue labels is the first thing a phone shows.
  //
  // Identical inputs, identical source (_measureOmnibusContext), identical claims:
  // one header line naming the bill's breadth, then Advances / Opposes / no-position
  // rows carrying only COUNTS, then the labels themselves behind a closed disclosure.
  // Nothing is dropped — the full detail is one tap away — and nothing is added.
  // Returns '' for a single-issue vote or an unloaded engine, exactly like the
  // sentence version, so a row degrades to what it rendered before.
  function _orOmniBlockHtml(item, issueKey) {
    if (!item || typeof window._measureOmnibusContext !== 'function') return '';
    var ctx;
    try {
      ctx = window._measureOmnibusContext(item, issueKey, {}, { labelFn: _issueLabel });
    } catch (e) { return ''; }
    if (!ctx) return ''; // single-issue vote — nothing to disclose
    var row = function (cls, ico, verb, list) {
      if (!list || !list.length) return '';
      return '<span class="pdxgap-om-row ' + cls + '">' +
        '<span class="pdxgap-om-ico" aria-hidden="true">' + ico + '</span>' +
        '<span><b>' + verb + '</b> ' + list.length + ' other issue' + (list.length === 1 ? '' : 's') + '</span></span>';
    };
    var rows = row('pdxgap-om-adv', '▲', 'Advances', ctx.advances) +
               row('pdxgap-om-opp', '▼', 'Opposes', ctx.opposes) +
               row('pdxgap-om-neu', '•', 'No position on', ctx.neutral);
    var chips = (ctx.others || []).map(function (c) {
      var k = c.effect === 'advances' ? ' pdxgap-om-c-adv' : c.effect === 'opposes' ? ' pdxgap-om-c-opp' : '';
      var pre = c.effect === 'advances' ? '▲ ' : c.effect === 'opposes' ? '▼ ' : '';
      return '<span class="pdxgap-om-chip' + k + '">' + pre + esc(c.label) + '</span>';
    }).join('');
    var det = chips
      ? '<details class="pdxgap-om-all"><summary>The other ' + ctx.others.length +
          ' issue' + (ctx.others.length === 1 ? '' : 's') + ' this one vote touched</summary>' +
          '<div class="pdxgap-om-chips">' + chips + '</div></details>'
      : '';
    return '<div class="pdxgap-om">' +
      '<div class="pdxgap-om-h"><span aria-hidden="true">🧩</span> <span>Multi-issue bill — one vote, ' +
        ctx.count + ' issues</span>' +
        (ctx.splits ? '<span class="pdxgap-om-split">cuts both ways</span>' : '') + '</div>' +
      (rows ? '<div class="pdxgap-om-rows">' + rows + '</div>' : '') +
      det +
    '</div>';
  }
  // Evidence lines behind an Official Record issue verdict, as an array of row HTML
  // (migrated curated formal actions + the strongest vr_* votes each way). Shared by
  // the feed's collapsible <details> and the Phase 9 gap drawer (rendered expanded).
  //   opts.omniBlock — render each vote's multi-issue disclosure as the scannable
  //   block above instead of the inline sentence. Presentation only; the lines, their
  //   order, their verdicts and their sources are identical either way.
  function _orEvidenceItems(ov, opts) {
    opts = opts || {};
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
        lines.push(opts.omniBlock
          ? _orActLine(verdict, title, pos, url, lbl, '', null, _orOmniBlockHtml(item, issueKey))
          : _orActLine(verdict, title, pos, url, lbl, _orOmniNote(item, issueKey)));
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
  // Is there a Voting Record section to send a reader to? Asking the document is
  // not enough. This runs while the next profile is still a string, so the only
  // evidence ever available was the PREVIOUS render — and that record now waits
  // inside a deferred drawer, which moves the evidence out of the document and
  // into the spine stash. Ask both, or a perfectly live link vanishes for every
  // reader who never happened to open a votes drawer.
  function _vrSectionReachable() {
    try { if (document.getElementById && document.getElementById('pdxsec-voting')) return true; } catch (e) {}
    try {
      var SP = window.PDXProfileSpine;
      if (SP && typeof SP.hasTarget === 'function') return !!SP.hasTarget('pdxsec-voting');
    } catch (e) {}
    return false;
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
    var live = _vrSectionReachable();
    if (!live) return '<div class="pdxor-mapsum pdxor-mapsum-flat" title="' + escAttr(tip) + '">' + body + '</div>';
    return '<button type="button" class="pdxor-mapsum" data-pdxc-vrall="1"' +
        ' title="' + escAttr(tip) + '">' + body +
        '<span class="pdxor-mapsum-go">See full record →</span>' +
      '</button>';
  }
  // ═══════════════════════════════════════════════════════════════════════════
  // THE ISSUE ROW — one stable unit, everywhere
  // ═══════════════════════════════════════════════════════════════════════════
  // Every surface that shows "what they said vs what they did on issue X" now reads
  // the SAME object: the Official Record's rows, the Word vs Action top rows, and
  // whatever ranks issues later. The point is that a future stance ranking should be
  // a new sort over these fields, not another redesign of the row — so the row
  // carries the inputs a ranking needs even where nothing consumes them yet
  // (`weights.salience`, `weights.recency` are declared null placeholders, never
  // invented numbers).
  //
  // Nothing here scores. officialIssue() remains the single verdict engine; this is a
  // projection of one read plus the stance text and the counts that already exist.
  var _EV_STRENGTH = function (n) {
    return n >= 4 ? 'strong' : n >= 2 ? 'moderate' : n >= 1 ? 'thin' : 'none';
  };
  // How many pieces of record sit behind this row, counted from whichever lane the
  // read came back on. Held executive actions count as evidence-on-file even though
  // they carry no verdict — they are why a row can read thin with real receipts.
  function _rowEvidenceCount(ov) {
    if (!ov) return 0;
    if (ov.lane === 'exec') {
      var pool = ov.execPool || ov.execHeld;
      if (pool) return ((pool.items || []).length) + ((pool.held || []).length);
      return (typeof ov.execTouched === 'number') ? ov.execTouched : 0;
    }
    if (ov.record && ov.record.total) return ov.record.total;
    if (ov.officialActions && ov.officialActions.total) return ov.officialActions.total;
    return 0;
  }
  var _STANCE_DIR = { support: 1, oppose: -1, mixed: 0 };
  function _rowStance(pid, issueKey) {
    var key = positionStance(pid, issueKey);
    var text = '', source = null;
    try {
      if (typeof window._polPositionMap === 'function' && window.CMP_DATA) {
        var e = (window._polPositionMap(pid, window.CMP_DATA[pid]) || {})[issueKey];
        if (e) { text = e.text || ''; source = e.source || null; }
      }
    } catch (e2) {}
    var m = _OR_STANCE[key] || null;
    return {
      key: key || null,
      label: m ? m.lb : '',
      // +1 supports / −1 opposes / 0 explicitly mixed / null nothing stated. A number
      // rather than a word because a ranking wants to compare directions, and the
      // word is already available as `label`.
      direction: (key && _STANCE_DIR.hasOwnProperty(key)) ? _STANCE_DIR[key] : null,
      text: text, source: source
    };
  }
  // Tiers are the profile's sort contract, stated once:
  //   0  said + did, and they disagree      (contradiction / cuts both ways)
  //   1  said + did, and they line up       (backed it up / too thin to call)
  //   2  said only — nothing on file that can judge it yet
  //   3  did only — record on file, nothing stated to test it against
  //   4  neither: nothing to show
  var ROW_TIER = { tension: 0, tested: 1, word_only: 2, action_only: 3, empty: 4 };
  var _TIER_LABEL = ['Said + did — in tension', 'Said + did — consistent', 'Said, nothing to judge yet', 'Acted, nothing stated', 'Nothing on file'];
  var _VERDICT_RANK = { contradicts: 0, mixed: 1, consistent: 2, limited: 3 };
  function issueRow(pid, issueKey) {
    var ov = officialIssue(pid, issueKey);
    var stance = _rowStance(pid, issueKey);
    var evCount = _rowEvidenceCount(ov);
    var tok = ov.token;
    var judged = (tok === 'consistent' || tok === 'contradicts' || tok === 'mixed' || tok === 'limited');
    var hasWord = !!stance.key || !!ov.hasStance || !!(ov.record && ov.record.hasStance);
    var hasAction = evCount > 0 || judged;
    var tier, testability;
    if (tok === 'pending') { tier = ROW_TIER.word_only; testability = 'warming'; }
    else if (judged && (tok === 'contradicts' || tok === 'mixed')) { tier = ROW_TIER.tension; testability = 'tested'; }
    else if (judged) { tier = ROW_TIER.tested; testability = (tok === 'limited') ? 'thin' : 'tested'; }
    // A stance wins the tie. A row can hold receipts that no verdict could use —
    // executive actions held back as uncitable or circular are the common case — and
    // filing that under "nothing on file" would bury a stated position behind a
    // technicality the reader never sees. Word present ⇒ the row is waiting on a
    // judgeable record, not empty.
    else if (hasWord) { tier = ROW_TIER.word_only; testability = 'awaiting_record'; }
    else if (hasAction) { tier = ROW_TIER.action_only; testability = 'awaiting_word'; }
    else { tier = ROW_TIER.empty; testability = 'untestable'; }
    var v = ov.verdict || VERDICTS.limited;
    return {
      pid: pid, key: issueKey,
      label: _issueLabel(issueKey),
      category: _catOf(issueKey), categoryLabel: _catLabel(issueKey),
      // ── SAID ──
      stance: stance,
      // ── DID ──
      lane: ov.lane || null,
      actions: { count: evCount, lane: ov.lane || null, judged: judgedCountOf(ov) },
      // ── VERDICT ──
      verdict: { token: tok, label: v.label, cls: v.cls, ico: v.ico, color: v.color, score: ov.score },
      // ── RECEIPTS ──
      evidence: { count: evCount, strength: _EV_STRENGTH(evCount), sources: (ov.sources || []).slice() },
      // ── ranking foundation ──
      tier: tier, tierLabel: _TIER_LABEL[tier], testability: testability,
      scored: judged,
      // Declared, never guessed. A later ranking fills these in; until then a null
      // weight is honest and every sort below treats it as "no opinion".
      weights: { salience: null, recency: null },
      ov: ov
    };
  }
  function issueRows(pid, keys) {
    return (keys || issuesWithSignal(pid, 'official')).map(function (k) { return issueRow(pid, k); });
  }
  // The one sort. Tier first (the contract above), then — inside a tier — the sharper
  // verdict, then the deeper receipt pile, then the declared weights if a caller has
  // set them, then the label so the order is stable across renders.
  function rankIssueRows(rows) {
    return (rows || []).slice().sort(function (a, b) {
      if (a.tier !== b.tier) return a.tier - b.tier;
      var av = _VERDICT_RANK.hasOwnProperty(a.verdict.token) ? _VERDICT_RANK[a.verdict.token] : 9;
      var bv = _VERDICT_RANK.hasOwnProperty(b.verdict.token) ? _VERDICT_RANK[b.verdict.token] : 9;
      if (av !== bv) return av - bv;
      if (a.evidence.count !== b.evidence.count) return b.evidence.count - a.evidence.count;
      var aw = (a.weights.salience == null ? -1 : a.weights.salience);
      var bw = (b.weights.salience == null ? -1 : b.weights.salience);
      if (aw !== bw) return bw - aw;
      return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
    });
  }

  function _orInner(pid) {
    var keys = issuesWithSignal(pid, 'official');
    var scored = [], awaiting = 0, anyPending = false, awaitingKeys = [];
    // Ranked once, up front — so the section's rows, its categories and its fold all
    // agree about what the sharpest issue is instead of each re-deciding.
    var ranked = rankIssueRows(issueRows(pid, keys));
    var rowOf = {};
    ranked.forEach(function (r) { rowOf[r.key] = r; });
    ranked.forEach(function (r) {
      var ov = r.ov;
      if (ov.token === 'pending') { anyPending = true; awaiting++; return; }
      if (r.scored) {
        scored.push({ key: r.key, ov: ov, row: r });
      } else {
        awaiting++; // no_record / no_stance — stated position with nothing to score yet
        // Kept so the count can name the issues instead of only tallying them.
        awaitingKeys.push(r.key);
      }
    });

    var overall = scopedOverall('official', pid);
    var om = overall.verdict;
    // Composition on the section's coverage — how many issues carry a percentage and
    // how many of them are thin or omnibus-driven. Annotation only; overall.score is
    // untouched and still feeds the primary read.
    var overallComp = _orOverallCompositionHtml(pid, scored, overall);
    // Which lane's nouns this whole section speaks. Computed once, from the rows.
    var secN = _orSectionNoun(pid, scored);
    var isExecSection = (secN === _LANE_NOUN.exec);
    // THE POOLED PERCENTAGE IS NOT PRINTED HERE ANY MORE. This section is the TEST
    // behind the profile's one primary score (⚖️ Word vs Action), not a second score
    // of its own: printing "67%" beside a hero reading 82% asked a reader to work out
    // which number was the verdict. The verdict CHIP stays — it is a different kind of
    // statement, and scopedOverall() still computes the number for the primary read
    // and for the per-issue rows below.
    var overallHtml = (typeof overall.score === 'number')
      ? overallComp + '<span class="pdxc-chip pdxc-' + om.cls + '">' + om.ico + ' ' + esc(om.label) + '</span>'
      : '<span class="pdxc-chip pdxc-' + om.cls + '">' + (overall.token === 'pending' ? '<span class="pdxc-spin"></span>' : om.ico + ' ') + esc(om.label) + '</span>';

    var head =
      '<div class="pdxor-head"><span class="pdxor-title"><span aria-hidden="true">🏛️</span> ' +
          LT('officialrecord', 'Official Record') + '</span>' +
        // Before .pdxor-overall, which carries margin-left:auto — so the pill sits
        // beside the title and the score stays pinned right.
        LHOWTO('voting-record', 'How to read this') +
        '<span class="pdxor-overall">' + overallHtml + '</span></div>' +
      // The section's own question, in the lane's terms. "When they had to vote" is the
      // right question for a legislator and a false premise for a president: the power
      // they hold is the power to act without a vote, so the honest version asks what
      // they did with it. Same question underneath — does the doing match the saying.
      '<div class="pdxor-q">“' + (isExecSection
        ? 'When they could act on their own, did they do what they said?'
        : 'When they had to vote, did they stand by what they said?') + '”</div>' +
      _feedsPrimaryHtml('Every issue below tests something they said. These results are what the profile’s one score is built from — weighted by how firmly they said it and how deep the record behind it is.');

    if (!scored.length) {
      var emptyMsg = anyPending
        ? 'Loading the record…'
        : (awaiting > 0
            ? 'No ' + secN.qualifyingMany + ' on record yet — ' + awaiting + ' stated position' + (awaiting === 1 ? '' : 's') + ' ' + (awaiting === 1 ? 'is' : 'are') + ' still awaiting a formal record.'
            : 'No stated positions or formal record on file yet.');
      // "No record" is a coverage statement, not a finding. Say why it happens
      // rather than leaving an empty panel to be read as an accusation. The two
      // reasons are lane-specific: a legislator's record goes missing to a voice
      // vote, a president's to an action whose effect on an issue we have not
      // mapped from a primary document yet.
      var emptyWhy = anyPending ? '' :
        '<div class="pdxor-empty-why">' + LT('norecord', 'Why a record can be empty') +
          (isExecSection
            ? ': the action may not map cleanly to any issue we track, or we have not documented that area yet.'
            : ': the issue may have been handled by ' + LT('voicevote', 'voice vote') +
              ' (no per-member record exists), or we have not documented that area yet.') +
        '</div>';
      return head + '<div class="pdxor-empty">' + esc(emptyMsg) + emptyWhy + '</div>' +
        // After the empty message, not before it: nothing here is checkable yet, so the
        // record that DOES exist reads as "and here is what we have" rather than as a
        // contradiction of the line above it.
        _orMappedSummaryHtml(pid) + _orRawLink(pid);
    }

    // Group by broad issue category.
    var catOf = function (k) { try { return (typeof window._pdxCategoryOf === 'function' ? window._pdxCategoryOf(k) : '') || 'other'; } catch (e) { return 'other'; } };
    var catLabel = function (k) { try { return (typeof window._pdxCategoryLabelOf === 'function' ? window._pdxCategoryLabelOf(k) : '') || 'Other'; } catch (e) { return 'Other'; } };
    var issueLabel = function (k) { try { return (window.ISSUE_MAP && window.ISSUE_MAP[k] && window.ISSUE_MAP[k].label) || k; } catch (e) { return k; } };
    // `scored` arrives in rankIssueRows() order, so grouping only has to PRESERVE it:
    // rows keep their ranked order inside a category, and a category inherits the
    // position of its strongest row. The old local `rank` map put `limited` above
    // `consistent`, which led the section with its thinnest evidence — exactly the
    // rows a reader can do least with. The tier contract now decides instead.
    var byCat = {};
    scored.forEach(function (s, i) {
      var c = catOf(s.key);
      var g = (byCat[c] = byCat[c] || { label: catLabel(s.key), items: [], best: i });
      g.items.push(s);
      if (i < g.best) g.best = i;
    });
    var catKeys = Object.keys(byCat).sort(function (a, b) { return byCat[a].best - byCat[b].best; });

    var bodyParts = catKeys.map(function (ck) {
      var grp = byCat[ck];
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
        return '<details class="pdxor-issue pdxor-row" data-pdxc-row="' + escAttr(s.key) + '"' +
            // The ranking foundation, carried on the element itself: tier, testability
            // and receipt depth. Nothing reads these yet — they are here so a later
            // stance ranking can sort, filter or badge rows without re-deriving what
            // the section already knows.
            ' data-pdxc-tier="' + escAttr(String((s.row && s.row.tier) != null ? s.row.tier : '')) + '"' +
            ' data-pdxc-test="' + escAttr((s.row && s.row.testability) || '') + '"' +
            ' data-pdxc-ev="' + escAttr(String((s.row && s.row.evidence.count) || 0)) + '">' +
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
              '<div class="pdxor-share">' + _rcShareHtml(pid, s.key) + '</div>' +
            '</div>' +
          '</details>';
      }).join('');
      return '<div class="pdxor-cat"><div class="pdxor-cat-h">' + esc(grp.label) + '</div>' + rows + '</div>';
    });

    // The ranking put the sharpest tested issue first, and the category that owns it
    // leads — so the open part of the section is the best evidence and the realest
    // tension, not whichever category sorts first alphabetically. The rest fold behind
    // a lid that names what is inside. A member with nine documented issue areas used
    // to cost nine screens before the next section began, and a reader who wanted only
    // the verdict had no way past it.
    var lead = bodyParts.length ? bodyParts[0] : '';
    var restHtml = bodyParts.slice(1).join('');
    var leadCount = (byCat[catKeys[0]] && byCat[catKeys[0]].items.length) || 0;
    var restCount = scored.length - leadCount;
    var body = lead;
    if (restHtml) {
      body += '<!--PDXSP:lid id="or-rest" label="Show ' + restCount + ' more scored issue' +
          (restCount === 1 ? '' : 's') + '" defer-->' + restHtml + '<!--PDXSP:/lid-->';
    }

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
        (awaiting === 1 ? 'has' : 'have') + ' no ' + secN.qualifyingMany + ' on record yet';
      awaitingNote = awaitRows
        ? '<details class="pdxor-awaiting-d"><summary class="pdxor-awaiting">' + esc(head2) + ' ▾</summary>' +
            '<div class="pdxor-await-body">' + awaitRows + '</div></details>'
        : '<div class="pdxor-awaiting">' + esc(head2) + '.</div>';
    }

    return head + _orMappedSummaryHtml(pid) + _coverageLine(scored.length, awaiting, 'formal record') +
      body + awaitingNote + _orRawLink(pid);
  }
  function _orRawLink(pid) {
    // Keep the raw Voting Record list one tap away (it still has value as a full list).
    //   Not for a president. `_vrSectionReachable()` asks the DOM whether a Voting
    // Record section exists, and the answer used to be yes on an executive profile —
    // profiles-full.js mounts that section for everyone — so "See the full voting
    // record →" printed under a president's Official Record, promising a roll-call
    // list they will never have. The office decides first; the DOM only decides
    // whether a live destination exists for the offices that do vote.
    if (pid && execEligible(pid)) return '';
    if (!_vrSectionReachable()) return '';
    return '<button type="button" class="pdxor-rawlink" onclick="if(window._pdxNavJump)window._pdxNavJump(\'pdxsec-voting\');else{var e=document.getElementById(\'pdxsec-voting\');if(e)e.scrollIntoView({behavior:\'smooth\',block:\'start\'});}">See the full voting record →</button>';
  }
  // ── "this feeds the one score" ───────────────────────────────────────────────
  // Every layer on a profile used to open with a percentage of its own, which left a
  // reader to guess how they related. Each layer now says what it contributes to the
  // ONE primary read and links to it. Self-gating: no claim about a section that
  // isn't there, so a page without the primary engine loses the line, not the layer.
  function _feedsPrimaryHtml(text) {
    try {
      if (!window.PDXWordAction || !window.PDXWordAction.FRAME) return '';
      var f = window.PDXWordAction.FRAME;
      return '<div class="pdxc-feeds">' +
        '<span class="pdxc-feeds-t">' + esc(text) + '</span>' +
        '<button type="button" class="pdxc-feeds-go" onclick="if(window._pdxNavJump)window._pdxNavJump(\'pdxsec-wordaction\');else{var e=document.getElementById(\'pdxsec-wordaction\');if(e&&e.scrollIntoView)e.scrollIntoView({behavior:\'smooth\',block:\'start\'});}">' +
          f.icon + ' ' + esc(f.label) + ' <span aria-hidden="true">→</span></button>' +
      '</div>';
    } catch (e) { return ''; }
  }
  // ── the ✒️ document ledger, inside the one record section ────────────────────
  // A president's profile used to carry two record products: this section, speaking
  // in issue rows, and a standalone Executive Enactment Record, speaking in documents.
  // Both were true and neither was the record. The ledger now renders INSIDE this
  // section, under the rows it is the evidence for — one lane, issue rows first,
  // documents underneath. Returns '' for everyone else, so no congressional profile
  // gains a block.
  function _orExecLedgerHtml(pid) {
    try {
      var U = window.PDXExecRecordUI;
      if (!U || typeof U.embedHtml !== 'function') return '';
      return U.embedHtml(pid) || '';
    } catch (e) { return ''; }
  }
  var _officialInner = _orInner; // alias used by the warm-refresh listener
  function officialRecordSectionHtml(pid) {
    ensureStyles();
    bindGateway();
    if (!pid) return '';
    // The rows carry hidden share controls; reveal the eligible ones once the caller
    // has mounted this string.
    _rcHydrateSoon();
    return '<section class="pdxor" data-pdxc-official-pid="' + esc(pid) + '" aria-label="Official Record by issue">' +
      _orInner(pid) + _orExecLedgerHtml(pid) + '</section>';
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
    // Say-vs-Do is SUPPORTING CONTEXT now, not a scoring frame. It used to print its
    // own pooled "public-record integrity %" beside the verdict chip, which is how a
    // profile ended up with three headline percentages arguing with each other. The
    // pooled number is gone from the head; the verdict chip stays, the per-item and
    // per-issue percentages below stay (they are working detail, not headlines), and
    // scopedOverall('saydo') still computes the figure for anything that needs it —
    // including the divergence read, which is the one place the relationship between
    // the two records is stated on purpose.
    var head =
      '<div class="pdxor-head"><span class="pdxor-title"><span aria-hidden="true">🧾</span> ' +
          LT('saydo', 'Say-vs-Do') + '</span>' +
        LHOWTO('say-vs-do', 'How to read this') +
        '<span class="pdxor-overall"><span class="pdxc-chip pdxc-' + om.cls + '">' + om.ico + ' ' + esc(om.label) + '</span></span></div>' +
      '<div class="pdxor-q">“Does the full public picture match what they claim?”</div>' +
      '<div class="pdxor-method">Receipts, not a rating: each stance below shows what the public record — statements, coverage, filings, events — does and does not back up, with a per-stance percentage where there are ' + MIN_SAYDO_EVIDENCE + '+ checkable items. None of it is folded into the profile’s score, which is built from formal actions only. ' +
        LT('norecord', 'Why some of these show “—”') + '</div>' +
      _feedsPrimaryHtml('Supporting context for the one score, never counted inside it: the score is tested against formal actions, and these are the receipts around them.');

    if (!scored.length) {
      var msg = awaiting > 0
        ? 'No public-record confirmations or contradictions surfaced yet — ' + awaiting + ' stated position' + (awaiting === 1 ? '' : 's') + ' with nothing on the public record so far.'
        : 'No public-record evidence on file yet.';
      return head + '<div class="pdxor-empty">' + esc(msg) +
        '<div class="pdxor-empty-why">' + LT('norecord', 'That is our coverage, not a verdict') +
          ' — and it is deliberately separate from their ' + LT('officialrecord', 'Official Record') +
          ', which is built from ' + (execEligible(pid) ? 'signed laws, vetoes and orders' : 'votes') + ' only.</div>' +
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

    var bodyParts = catKeys.map(function (ck) {
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
    });

    // Same rule as the Official Record: the contradiction-first leading category is
    // the part a reader has to see, and each row here carries its own quoted receipts,
    // so the tail of the list is where most of the height lives.
    var sdLead = bodyParts.length ? bodyParts[0] : '';
    var sdRest = bodyParts.slice(1).join('');
    var sdLeadCount = (byCat[catKeys[0]] && byCat[catKeys[0]].items.length) || 0;
    var sdRestCount = scored.length - sdLeadCount;
    var body = sdLead;
    if (sdRest) {
      body += '<!--PDXSP:lid id="sd-rest" label="Show ' + sdRestCount + ' more stance' +
          (sdRestCount === 1 ? '' : 's') + ' with receipts" defer-->' + sdRest + '<!--PDXSP:/lid-->';
    }

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
  // Official Record) and their broader public-record integrity (🧾 Say-vs-Do)
  // tell the SAME story, or different ones? We NEVER blend the two into a single
  // "honesty" number, and since the profile collapsed onto one primary score this
  // panel no longer headlines the two pooled percentages either — the finding was
  // always the DISTANCE between them, so the whole-profile summary states the
  // relationship and the size of the gap, and the per-issue rows below still show
  // both sides so the gap can be checked. Each side keeps its own boundary and its
  // own thin-data floor (a side with no real % simply isn't compared), so the
  // contrast can never manufacture false certainty. Neutral labels describe
  // agreement between the two records, not whether the politician is "good".
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
            _divNum('🏛️', p.off.score, p.off.verdict.color,
              'Official Record — ' + (p.off.lane === 'exec' ? 'built from signed laws and orders' : 'vote-based')) +
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
          ' aria-label="' + esc('See the ' + (p.off.lane === 'exec' ? 'actions' : 'votes') + ' and public-record evidence behind the ' + rel.label.toLowerCase() + ' relationship on ' + _issueLabel(p.key)) + '">' +
          body + '<span class="pdxdv-row-why">See what’s behind the gap <span aria-hidden="true">→</span></span></button>';
    }
    return '<div class="pdxdv-row">' + body + '</div>';
  }
  function _dvInner(pid) {
    var d = divergenceData(pid);
    var oOv = scopedOverall('official', pid), sOv = scopedOverall('saydo', pid);
    var oNum = typeof oOv.score === 'number', sNum = typeof sOv.score === 'number';

    // Whole-profile summary: the RELATIONSHIP between the two records, not the two
    // pooled percentages. Both numbers used to headline this panel, which added two
    // more percentages to a profile that now publishes exactly one — and the
    // finding here was never either number, it was the distance between them. The gap
    // is still stated in points, the direction is still named, the per-issue rows below
    // still show both sides, and nothing is blended.
    var sumInner;
    if (oNum && sNum) {
      var gapPts = Math.abs(oOv.score - sOv.score);
      var dirAll = _divDir(oOv.score - sOv.score);
      sumInner = '<span class="pdxdv-sum-nums">' +
          _divRelChip(divRel(oOv.score - sOv.score)) +
          // The same disclosure that sits beside the Official Record's own coverage
          // belongs here too: a reader weighing the two records should know how much
          // record is under the vote-based side.
          _orOverallCompositionHtml(pid, d.offScored, oOv) +
        '</span>' +
        (gapPts > DIV_ALIGN_MAX ? '<span class="pdxdv-gap">' + gapPts + ' pt gap' + (dirAll ? ' · ' + dirAll : '') + '</span>' : '');
    } else {
      sumInner = '<span class="pdxdv-sum-na">Only one side has a percentage so far — no whole-profile comparison yet.</span>';
    }

    // The 🏛️ side's noun, in the lane this figure actually acts in. A president's
    // Official Record is built from signed laws and orders, so "(votes)" here would
    // mislabel the very side this panel is comparing.
    var _dvExec = execEligible(pid);
    var _dvSideNoun = _dvExec ? 'signed laws and orders' : 'votes';
    var head =
      '<div class="pdxdv-head"><span class="pdxdv-title"><span aria-hidden="true">⚖️</span> Record vs. Public Picture</span>' +
        '<span class="pdxdv-sum">' + sumInner + '</span></div>' +
      '<div class="pdxdv-q">Do their <b>🏛️ Official Record</b> (' + _dvSideNoun + ') and their <b>🧾 Say-vs-Do</b> (public record) tell the same story? This is a supporting read on the relationship between the two — it never blends them, and it publishes no score of its own.</div>' +
      _feedsPrimaryHtml('A cross-check, not a score: where the ' + (_dvExec ? 'formal record' : 'votes') + ' and the public picture disagree, that is worth knowing before reading the one score above.');

    if (!d.both.length) {
      var msg = d.oneSide > 0
        ? 'Not enough overlap yet — ' + d.oneSide + ' issue' + (d.oneSide === 1 ? '' : 's') + ' ' + (d.oneSide === 1 ? 'has' : 'have') + ' a percentage on only one side so far, so there\'s nothing to line up head-to-head.'
        : 'No issues carry both ' + (_dvExec ? 'an executive-action record' : 'a voting record') + ' and a public-record integrity score yet.';
      return head + '<div class="pdxdv-empty">' + esc(msg) + '</div>';
    }

    var c = d.counts, chips = [];
    if (c.aligned) chips.push('<b style="color:' + DIV_REL.aligned.color + '">' + c.aligned + '</b> aligned');
    if (c.mixed) chips.push('<b style="color:' + DIV_REL.mixed.color + '">' + c.mixed + '</b> mixed');
    if (c.diverges) chips.push('<b style="color:' + DIV_REL.diverges.color + '">' + c.diverges + '</b> diverging');
    var tally = chips.length
      ? '<div class="pdxdv-tally">Across ' + d.both.length + ' issue' + (d.both.length === 1 ? '' : 's') + ' on both records: ' + chips.join(' · ') + '.</div>'
      : '';

    // Rows arrive widest-gap-first, so the divergences and mixed rows — the only ones
    // that are tappable, and the only ones that are a finding — are already at the
    // front. Those stay open. The aligned rows are the ones that say nothing happened,
    // and on a well-documented member they are most of the list, so they fold. The
    // tally above still counts all three kinds, so the shape of the record is visible
    // without opening anything.
    var actionRows = [], alignedRows = [];
    d.both.forEach(function (p) {
      var rowHtml = _divRow(p, pid);
      if (divRel(p.gap).key === 'aligned') alignedRows.push(rowHtml); else actionRows.push(rowHtml);
    });
    var rows = actionRows.length ? '<div class="pdxdv-rows">' + actionRows.join('') + '</div>' : '';
    if (alignedRows.length) {
      rows += '<!--PDXSP:lid id="dv-aligned" label="Show ' + alignedRows.length + ' issue' +
        (alignedRows.length === 1 ? '' : 's') + ' where both records agree" defer-->' +
        '<div class="pdxdv-rows">' + alignedRows.join('') + '</div><!--PDXSP:/lid-->';
    }
    var covDv = '<div class="pdxcov" title="Only issues with a real score on BOTH sides can be compared head-to-head. The rest are one-sided so far and are summarised below.">' +
      '📊 Comparable on <b>' + d.both.length + '</b> of ~' + (d.both.length + d.oneSide) + ' issue' + ((d.both.length + d.oneSide) === 1 ? '' : 's') + ' with a score on either side.</div>';
    var note = d.oneSide > 0
      ? '<div class="pdxdv-note">➕ ' + d.oneSide + ' more issue' + (d.oneSide === 1 ? '' : 's') + ' ' + (d.oneSide === 1 ? 'has' : 'have') + ' a score on only one side — kept in their own feeds, not compared here.</div>'
      : '';

    return head + covDv + tally + rows + note;
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
  // ── Header identity, for the gap sheet ──────────────────────────────────────
  // One read of the roster, shared by every part of the header, so the face, the
  // name and the office line can never disagree with each other. Reads the same two
  // globals every other surface reads (PROFILES then CMP_DATA) and the same single
  // headshot source the profile hero and every card use (window._getPhotoUrl), so a
  // reader who tapped a shared card sees the SAME photo here that the app shows
  // everywhere else. Every field is omitted rather than guessed when the roster has
  // not got it, and the photo is accepted only when it is an actual URL — some
  // records carry an emoji in that slot, and an emoji in an <img> is a broken frame.
  function _gapIdentity(pid) {
    var p = null;
    try { p = (window.PROFILES && window.PROFILES[pid]) || (window.CMP_DATA && window.CMP_DATA[pid]) || null; } catch (e) {}
    var name = (p && (p.name || p.fullName || p.displayName)) ||
      String(pid || '').replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    var photo = '';
    try { if (typeof window._getPhotoUrl === 'function') photo = window._getPhotoUrl(pid) || ''; } catch (e) {}
    if (!photo && p && p.photo) photo = String(p.photo);
    photo = String(photo || '').trim();
    return {
      name: String(name),
      office: String((p && (p.office || p.title || p.role || p.position)) || '').trim(),
      district: String((p && p.district) || '').trim(),
      state: String((p && (p.state || p.stateName)) || '').trim(),
      party: String((p && p.party) || '').trim(),
      photo: /^(https?:\/\/|\/|data:image\/)/i.test(photo) ? photo : ''
    };
  }
  // The member's own name, for the gap sheet header. Falls back to the prettified
  // pid, so it can return an unhelpful string but never an empty one.
  function _gapMemberName(pid) { return _gapIdentity(pid).name; }
  // Party colours match the app's existing convention wherever a party is tinted.
  function _gapPartyColor(party) {
    var s = String(party || '').trim().toUpperCase();
    if (s === 'R' || s.indexOf('REPUB') === 0) return '#f87171';
    if (s === 'D' || s.indexOf('DEMO') === 0) return '#60a5fa';
    if (s === 'I' || s.indexOf('INDEP') === 0) return '#a78bfa';
    if (s === 'F' || s.indexOf('FORWARD') === 0) return '#22d3ee';
    if (s === 'L' || s.indexOf('LIBERTAR') === 0) return '#fbbf24';
    if (s === 'G' || s.indexOf('GREEN') === 0) return '#34d399';
    return '#8fa5c4';
  }
  // Two letters for the no-photo case. Stripped to A–Z so it is safe to print into
  // an attribute, and empty when the name yields nothing usable — the medallion then
  // renders as a plain party-tinted tile rather than as junk.
  function _gapInitials(name) {
    var words = String(name || '').replace(/[^A-Za-z\s'-]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    var first = words[0].charAt(0);
    var last = words.length > 1 ? words[words.length - 1].charAt(0) : '';
    return (first + last).toUpperCase().replace(/[^A-Z]/g, '');
  }
  // The face. A real headshot when the roster has one, otherwise party-tinted
  // initials — never a broken image and never an empty box. The <img> failing is
  // handled the same way the rest of the app handles it: drop the image and let the
  // medallion underneath show through. Decorative by design: the name is printed
  // immediately beside it, so an alt text would just be read twice.
  function _gapFaceHtml(id) {
    var col = _gapPartyColor(id.party);
    var fb = _gapInitials(id.name);
    var attrs = ' style="--c:' + col + '"' + (fb ? ' data-fb="' + fb + '"' : '');
    if (!id.photo) return '<span class="pdxgap-face pdxgap-face-ph"' + attrs + ' aria-hidden="true"></span>';
    return '<span class="pdxgap-face"' + attrs + ' aria-hidden="true">' +
      '<img src="' + esc(id.photo) + '" alt="" loading="lazy" decoding="async"' +
      ' onerror="this.remove();this.parentNode.classList.add(&quot;pdxgap-face-ph&quot;)"></span>';
  }
  // Office · district · state, then the party as its own tinted chip. Omitted
  // entirely rather than guessed — a cold arrival is better served by three true
  // facts than by four with one invented.
  function _gapSubHtml(id) {
    var bits = [];
    if (id.office) bits.push(esc(id.office));
    if (id.district) bits.push(esc(id.district));
    if (id.state) bits.push(esc(id.state));
    var party = id.party
      ? '<span class="pdxgap-party" style="--c:' + _gapPartyColor(id.party) + '">' + esc(id.party) + '</span>'
      : '';
    if (!bits.length && !party) return '';
    return '<div class="pdxgap-who-sub">' +
      (bits.length ? '<span>' + bits.join(' · ') + '</span>' : '') + party + '</div>';
  }

  function _gapViewHtml(pid, issueKey) {
    var off = officialIssue(pid, issueKey);
    var say = saydoIssue(pid, issueKey);
    var oNum = typeof off.score === 'number', sNum = typeof say.score === 'number';
    var lbl = _issueLabel(issueKey);
    var stance = _orStanceChip(pid, issueKey);

    // Relationship — only when BOTH sides carry a real %. Otherwise say so plainly.
    //
    // WHO THIS HEADER IS FOR. This sheet was built as a cross-link from inside the
    // app, where the reader already knows whose profile they are on and chose the
    // comparison. It is now also the LANDING PAGE for every shared 🏛️ Official
    // Record card — receipt-cards.js routes `#record=<pid>~<issue>` straight here —
    // and that reader arrives with nothing but the image they tapped.
    //
    // Two things were wrong for them, and both were measured across the whole
    // public share pool rather than guessed:
    //
    //   · THE MEMBER WAS NEVER NAMED. The header printed an eyebrow, the issue
    //     label and two chips. Someone who tapped a card about Mike Simpson landed
    //     on a page that says "Cut Federal Spending & Reduce Debt" and never says
    //     Mike Simpson. There is no way to tell it is the same object.
    //
    //   · THE COMPARISON FRAME MISFIRES ON EVERY SINGLE SHARED CARD. All 212 core
    //     public cards land here with an Official Record score and NO Say-vs-Do
    //     score — the share gate selects on formal-record depth, and the curated
    //     Say-vs-Do layer covers different members and issues. So all 212 hit the
    //     else-branch: eyebrow "Record vs. Public Picture", chip "— One side only",
    //     and an opening line explaining there is nothing to line up. The image
    //     made a sourced claim; the page opened by apologising for having nothing
    //     to compare. That is the worst possible first sentence for an arrival.
    //
    // So when the Official Record is the side carrying the score, the header leads
    // with the Official Record and states what IS there. Nothing is hidden: the
    // 🧾 side still renders below with its own honest empty state, and the
    // comparison framing returns unchanged the moment both sides have a number.
    var relHtml, gapNote, eyebrow = '⚖️ Record vs. Public Picture';
    if (oNum && sNum) {
      var gap = off.score - say.score, rel = divRel(gap), g = Math.abs(gap), dir = _divDir(gap);
      relHtml = _divRelChip(rel);
      gapNote = '<div class="pdxgap-note">' + (g > DIV_ALIGN_MAX ? '<b>' + g + ' pt gap</b>' + (dir ? ' · ' + esc(dir) : '') + ' — ' : '') + esc(rel.blurb) + '</div>';
    } else if (oNum) {
      // The arrival case. Say what the formal record on this issue actually shows,
      // in the vocabulary the shared card used, and count the votes behind it — the
      // depth is the answer to "why should I believe this", and it is the number
      // the reader cannot get from the image.
      eyebrow = '🏛️ ' + 'Official Record';
      var _rv = _orRowVerdict(off);
      // The verdict carries its number, because the number IS the verdict here and
      // the reader should not have to scan down into the 🏛️ panel to find it. Same
      // score, same source, same colour as the panel's pill below — never a second
      // figure, and the 🏛️ Official Record eyebrow directly above it says which of
      // the two records it belongs to.
      relHtml = '<span class="pdxgap-rel-hero" style="--c:' + off.verdict.color + '">' +
        '<span class="pdxgap-relpct">' + off.score + '%</span> ' + esc(off.verdict.label) + '</span>';
      var _tot = (off.record && off.record.total) || (off.officialActions && off.officialActions.total) || 0;
      // The countable noun is the lane's, not always "vote": a president is judged on
      // signed laws and orders, and "3 judged votes" about someone who casts none is
      // a false statement, not a loose one.
      var _n = _orNoun(off);
      var _depth = _tot ? _tot + ' judged ' + (_tot === 1 ? _n.one : _n.many) + ' on this issue' : '';
      gapNote = '<div class="pdxgap-note">' +
        esc([_depth, _rv && _rv.why ? _rv.why : ''].filter(Boolean).join(' · ') ||
          ('Their formal record on this issue, ' + _n.one + ' by ' + _n.one + ', with every source.')) +
        '</div>';
    } else {
      relHtml = '<span class="pdxdv-rel" style="color:#9fb4d4;border-color:#9fb4d455;background:#9fb4d41f;">— One side only</span>';
      gapNote = '<div class="pdxgap-note">Only one side has a score on this issue so far — there\'s nothing to line up head-to-head yet.</div>';
    }

    // ── The identity block ────────────────────────────────────────────────────
    // Face, name, office/state/party, issue, verdict — in that order, which is the
    // order the shared image itself leads with. The face is the cue the sheet was
    // missing entirely: a reader who tapped a card about Mike Simpson used to land
    // on a page whose first pixels were empty gradient, and had to read a 0.62rem
    // eyebrow and a name in body text before anything confirmed they were in the
    // right place. Recognition is faster than reading, so the photo goes first.
    var _id = _gapIdentity(pid);
    var head =
      '<div class="pdxgap-h">' +
        '<div class="pdxgap-id">' + _gapFaceHtml(_id) +
          '<div class="pdxgap-idmain">' +
            '<div class="pdxgap-eyebrow">' + esc(eyebrow) + '</div>' +
            '<div class="pdxgap-who">' + esc(_id.name) + '</div>' +
            _gapSubHtml(_id) +
          '</div>' +
        '</div>' +
        '<div class="pdxgap-title">' + esc(lbl) + '</div>' +
        // Verdict first, stated position second. The verdict is what the reader came
        // to check; the stance is the thing it was checked against.
        '<div class="pdxgap-meta">' + relHtml + (stance || '') + '</div>' +
        // Person-level share, at the TOP of the sheet. This is the surface a shared
        // card lands on and the surface a phone reader reaches from the profile, and
        // until now its only share sat at the bottom of the 🏛️ column — below the
        // fold, and deleted outright whenever no Official Record card cleared the
        // guards. So a reader who wanted to pass this on either had to scroll for
        // the control or found none at all. PDXShareAnywhere always has an answer
        // (record card → Say-vs-Do receipt → profile link) and says which one it is
        // in the hint, and it never appears or disappears, so adding it here does
        // not make this bottom sheet resize after it opens. The 🏛️ column keeps its
        // own button unchanged: that one promises one specific vote and must stay
        // fail-closed and Official-Record-only.
        _saShareHtml(pid, issueKey) +
        gapNote +
      '</div>';

    // 🏛️ Official Record side. omniBlock: the multi-issue disclosure on each vote
    // renders as a scannable Advances / Opposes summary here rather than as the
    // inline sentence the profile feed uses — same facts, same source.
    var offItems = _orEvidenceItems(off, { omniBlock: true });
    var offEmpty = off.token === 'pending' ? 'Loading the record…'
                 : ((off.lane === 'exec' && _EXEC_EMPTY[off.token]) ||
                    SCOPES.official.empty[off.token] ||
                    (off.lane === 'exec' ? 'No qualifying executive action on record yet' : 'No qualifying votes on record yet'));
    var offBody = offItems.length
      ? '<div class="pdxgap-acts">' + offItems.join('') + '</div>'
      : '<div class="pdxgap-side-empty">' + esc(offEmpty) + '</div>';
    // Provenance for this side: when part of the formal record came from multi-issue
    // bills, say so here rather than letting a gap read as a single-issue disagreement.
    // The COUNT is the summary line; the list of other issues those bills covered sits
    // inside the disclosure, because on a broad record that list was a comma cloud
    // standing between the reader and the evidence they opened the sheet for.
    var offOmni = '';
    var _os = (typeof window._pdxRecordOmnibusStats === 'function')
      ? window._pdxRecordOmnibusStats(pid, issueKey) : null;
    if (_os && _os.any && typeof window._pdxOmnibusProvenanceNote === 'function') {
      offOmni = '<details class="pdxgap-side-sub pdxgap-omni">' +
        '<summary><span aria-hidden="true">🧩</span> <b>' + _os.omnibus + ' of ' + _os.total + '</b> ' +
          (_os.total === 1 ? 'record' : 'records') + ' here came from multi-issue bills</summary>' +
        '<div class="pdxgap-omni-b">' + esc(window._pdxOmnibusProvenanceNote(_os)) +
          ' A multi-issue bill is scored separately on each issue it touched.</div>' +
      '</details>';
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
        // Full-width because this sheet is a mobile bottom sheet first.
        '<div class="pdxgap-share">' + _rcShareHtml(pid, issueKey, { block: true }) + '</div>' +
      '</div>';

    // ── 🧾 Say-vs-Do side ─────────────────────────────────────────────────────
    // Two genuinely different situations were rendering the same way, and only one of
    // them is a column:
    //
    //   · There IS curated public-record evidence → the two-column comparison, which
    //     is what this sheet was built for. Unchanged.
    //
    //   · There is NONE — which is every shared card, because the share gate selects
    //     on formal-record depth while the curated Say-vs-Do layer covers different
    //     members and issues. A narrow panel holding one grey line of "Nothing on
    //     the public record yet", beside a full column of sourced votes, reads as a
    //     page that failed to load. The absence is real and permanent-until-curated,
    //     so it is stated on purpose instead: the Official Record takes the full
    //     width, and the 🧾 side becomes a short note underneath saying what IS on
    //     file, what is NOT, and that the difference is our coverage rather than a
    //     verdict on the member.
    //
    // Nothing is invented and no score appears on this side in either case.
    var sayItems = _sdEvidenceItems(say.curated);
    var sayCounts = _sdCounts(say.curated);
    var sayHas = sayItems.length > 0 || sNum;
    var saySide, sidesCls = '';
    if (sayHas) {
      saySide =
        '<div class="pdxgap-side">' +
          '<div class="pdxgap-side-h"><span class="pdxgap-side-name"><span aria-hidden="true">🧾</span> ' +
            LT('saydo', 'Say-vs-Do') + '</span>' +
            _gapScorePill(sNum, say.score, say.scoreMeta, say.verdict.color) + '</div>' +
          '<div class="pdxgap-side-sub">Public-record evidence — statements, news, controversies' + (sayCounts ? ' · ' + sayCounts : '') + '</div>' +
          '<div class="pdxgap-acts">' + sayItems.join('') + '</div>' +
        '</div>';
    } else {
      sidesCls = ' pdxgap-sides-solo';
      saySide =
        '<div class="pdxgap-solo">' +
          '<div class="pdxgap-solo-h"><span aria-hidden="true">🧾</span> ' +
            LT('saydo', 'Say-vs-Do') + ' — not on file yet</div>' +
          '<div class="pdxgap-solo-b">This is an <b>Official Record</b> read: it is built from ' +
            'formal roll-call votes and legislative actions, and those are ' +
            (oNum || offItems.length ? 'on file here.' : 'what this sheet covers.') +
            ' Curated public-record evidence for <b>' + esc(_id.name) + '</b> on <b>' + esc(lbl) +
            '</b> — statements, interviews, news, controversies — has not been checked in yet.</div>' +
          '<div class="pdxgap-solo-n">That is a gap in our coverage, not a verdict, and it changes ' +
            'nothing above: the two records are scored separately and are never merged into a ' +
            'single number, so the Official Record figure stands on its own either way.</div>' +
        '</div>';
    }

    return head +
      '<div class="pdxgap-sides' + sidesCls + '">' + offSide + saySide + '</div>' +
      _gapNextHtml(pid, issueKey) +
      '<div class="pdxgap-foot">🏛️ formal record and 🧾 public record are kept separate — this shows both side by side, it never blends them into one score. ' +
        LT('contradiction', 'What counts as a contradiction') + ' · ' +
        LHOWTO('say-vs-do', 'How to read this') + '</div>';
  }

  // ── One clear next step out of the gap sheet ────────────────────────────────
  // A reader who followed a shared card's #record= link arrives here with no
  // history: handleHash() in receipt-cards.js opens this sheet directly, so
  // behind it is whatever page the app happened to be on. Dismissing the sheet
  // used to be the only exit, and it led nowhere.
  //
  // Three moves, in widening order — stay on this member and check a second
  // issue, step back to the whole profile, or leave and look up your own
  // delegation. Each one is a real destination that already exists in the app;
  // nothing here invents a surface.
  //
  // The first is offered ONLY when this member actually has another issue with a
  // score behind it, and it names that issue outright. A "check another issue"
  // button that opens an empty comparison is worse than no button, and a generic
  // label makes a reader tap to find out what they get.
  //
  // Preference is by how much the next view will have to show: a diverging or
  // mixed two-sided issue first, then any two-sided issue, then an issue carrying
  // only an Official Record score. That last tier matters more than it looks — a
  // Wave 1 share card IS an Official Record card, and the member behind one often
  // has no curated Say-vs-Do at all, so a both-sides-only rule would leave exactly
  // the arriving reader with no second issue to check.
  function _gapNextHtml(pid, issueKey) {
    var items = [];
    var next = null;
    try {
      var d = divergenceData(pid);
      var both = d.both;                     // already sorted by widest gap first
      for (var i = 0; i < both.length && !next; i++) {
        if (both[i].key !== issueKey && divRel(both[i].gap).key !== 'aligned') next = both[i].key;
      }
      for (var j = 0; j < both.length && !next; j++) {
        if (both[j].key !== issueKey) next = both[j].key;
      }
      var off = d.offScored || [];
      for (var k = 0; k < off.length && !next; k++) {
        if (off[k].key !== issueKey) next = off[k].key;
      }
    } catch (e) {}
    if (next) {
      items.push('<button type="button" class="pdxgap-nx" data-pdxc-gap="' + esc(next) +
        '" data-pdxc-gap-pid="' + esc(pid) + '">' +
        '<span class="pdxgap-nx-ico" aria-hidden="true">⚖️</span>' +
        '<span>Check ' + esc(_issueLabel(next)) + ' <span aria-hidden="true">→</span></span></button>');
    }
    items.push('<button type="button" class="pdxgap-nx" data-pdxc-profile="' + esc(pid) + '">' +
      '<span class="pdxgap-nx-ico" aria-hidden="true">🏛️</span>' +
      '<span>Open the full profile <span aria-hidden="true">→</span></span></button>');
    items.push('<a class="pdxgap-nx" href="#voter-hub" data-pdxc-gapclose="1">' +
      '<span class="pdxgap-nx-ico" aria-hidden="true">📍</span>' +
      '<span>Find your own reps <span aria-hidden="true">→</span></span></a>');
    return '<div class="pdxgap-next"><div class="pdxgap-next-h">Where to next</div>' +
      '<div class="pdxgap-next-row">' + items.join('') + '</div></div>';
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
  // Is this open an ARRIVAL — a reader landing from a shared `#record=` image — or a
  // cross-link tapped from inside the app? The difference is purely presentational
  // and it decides how much of the screen the sheet takes (see .pdxgap-arrive):
  // over a profile the reader can still see, a short bottom sheet is right and the
  // dim strip above it is the point; as the whole destination, that same strip is a
  // large empty space at the top of the page. Callers may state it outright; the
  // hash is the fallback so the behaviour is correct even for a caller that doesn't.
  function _gapIsArrival(opts) {
    if (opts && typeof opts.arrival === 'boolean') return opts.arrival;
    try { return /^#record=/.test(String(location.hash || '')); } catch (e) { return false; }
  }
  // Set or clear the arrival class on the shared backdrop. Guarded: an environment
  // without classList simply keeps the bottom-sheet layout.
  function _gapArrive(back, on) {
    try {
      if (!back || !back.classList) return;
      if (on) back.classList.add('pdxgap-arrive'); else back.classList.remove('pdxgap-arrive');
    } catch (e) {}
  }
  function openGap(pid, issueKey, opts) {
    if (!pid || !issueKey || !document.body) return;
    var sheet = _ensureGapSheet();
    var body = sheet.querySelector('.pdxgap-body');
    if (body) body.innerHTML = _gapViewHtml(pid, issueKey);
    var back = sheet.parentNode;
    if (back) {
      _gapArrive(back, _gapIsArrival(opts));
      back.hidden = false;
    }
    try { sheet.scrollTop = 0; sheet.focus(); } catch (e) {}
    // A reader arriving from a shared card's #record= link can reach this before the
    // vote record is warm, so the reveal pass runs on every open rather than once.
    _rcHydrateSoon();
    // Same reason for the header's person-level control: it is already visible, and
    // this is what upgrades its icon and accessible name from "profile link" to the
    // card it can actually send once the record lands.
    _saHydrateSoon();
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
    var row = function (icon, title, body, id) {
      return '<div class="pdxm-row"' + (id ? ' data-pdxm-row="' + esc(id) + '"' : '') + '>' +
        '<div class="pdxm-row-h"><span aria-hidden="true">' + icon + '</span> ' + esc(title) + '</div>' +
        '<div class="pdxm-row-b">' + body + '</div></div>';
    };
    return '<div class="pdxm">' +
      '<div class="pdxgap-eyebrow">📋 Promise Tracker</div>' +
      '<div class="pdxgap-title">How we score this</div>' +
      '<div class="pdxm-lead">Two separate reads on whether someone\'s word holds up. We keep them apart on purpose and never blend them into a single “honesty” score.</div>' +
      row('🏛️', 'Official Record %', 'What their <b>formal record</b> shows: the share of their votes and formal legislative or legal actions on an issue that <b>match the position they\'ve stated</b>. Built only from roll-call votes and formal actions — never from statements or news.') +
      // The ✒️ lane, stated here because this sheet is opened from a president's
      // gateway too and every other row on it describes a legislature. Without this
      // row a reader on that profile is told the score comes from roll-call votes,
      // which is the one thing the office does not produce. It is a separate row
      // rather than a rewrite of the one above because both lanes are real and the
      // congressional wording is correct for almost everyone the app covers.
      row('✒️', 'Presidents and the formal record', 'A president casts <b>no roll-call votes</b>, so the Official Record above is built from what the office actually does: the <b>laws they signed or vetoed</b>, the <b>executive orders</b> and the formal directives on file, each mapped to the issues it touches and checked against the same stated positions. It is the <b>same score on the same scale</b> — there is no separate presidential rating. Two limits are worth knowing. Where an order was <b>blocked or narrowed by a court</b>, we record that standing beside the action rather than treating the signature as the end of the story. And where a stated position was <b>written from the very document that would test it</b>, we show the two side by side and leave the pair out of the number — a position quoting an order cannot also be the test of that order, and counting it would return 100% for reasons that mean nothing.') +
      row('🧾', 'Say-vs-Do integrity %', 'What the <b>broader public record</b> shows: the share of checkable public-record items on an issue — statements, interviews, news, controversies — that <b>back up what they say</b>. Built only from public evidence — never from votes.') +
      row('…', 'When the record is thin', 'We don\'t turn a couple of items into a confident number. Below a small minimum we show “—” or “not enough record yet” instead of a misleading 0% or 100%. A coverage line on each section shows how much of their record we actually have so far.') +
      // The overall % is a real scoring decision a reader can check us on, so it is
      // stated here and not only in the composition line's tooltip.
      row('📊', 'How the overall % is built', 'The overall Official Record % averages the per-issue percentages, <b>weighted by how many judged votes or actions sit behind each issue</b> — so an issue decided by a single vote counts less than one decided by ten. No issue is dropped for being thin: the depth behind every number is shown beside it, and the overall figure tells you what the plain unweighted average would have been whenever the two differ.') +
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
      // The shareable-card rules. These are stricter than the in-app rules on purpose
      // and a reader can only check us on them if they are written down, so this row
      // is the destination the method line printed on every card points at.
      row('📤', 'Cards you can share — and what has to be true first',
        'Some of these verdicts can leave PolitiDex as an image. A shared card has to stand up with <b>none</b> of this page around it, so the bar is higher than for anything shown inside the app. Every card carries <b>one member, one issue, one vote</b> — and all seven of these have to hold, or there is no card:' +
        '<ul class="pdxm-steps">' +
          '<li><b>A person mapped this bill to this issue.</b> Someone decided, in writing, that this measure speaks to this issue, and recorded why. We never infer it from a bill\'s title or text.</li>' +
          '<li><b>We know which way a Yes points.</b> Each mapping also records whether voting <b>Yes</b> supports the issue or opposes it — plenty of bills advance a cause by being voted down. Without that, a Nay that actually <b>advanced</b> what someone campaigned on would read as opposition to it.</li>' +
          '<li><b>The vote is on the policy, not the process.</b> ' + LT('procedural', 'Procedural votes') +
            ', and any question where a Yea actually blocks the measure — a ' + LT('recommit', 'motion to recommit') +
            ' or a ' + LT('table', 'motion to table') + ' — never become cards at all. In the app they count at a quarter weight; on an image that qualifier cannot travel, so they are excluded outright.</li>' +
          '<li><b>The card judges the issue it names.</b> One card, one issue. A big bill touches several, so each mapping also records whether that issue is what the bill was <b>primarily</b> about or a side effect of it — and the card leads with the issue it names rather than the loudest one. Its verdict has to match what their <b>whole</b> record on that issue says, not just the single vote it quotes; where the two disagree, we don\'t ship the card. When one vote moved several issues at once, the card names the others and which way each one went.</li>' +
          '<li><b>The receipt is printed on the card.</b> Bill number, the exact question the Clerk asked, how they voted, the date, a <b>source URL you can type in yourself</b>, and a link back to this page. That URL is always the chamber\'s own public roll-call page — <b>clerk.house.gov</b> for a House vote, <b>senate.gov</b> for a Senate one — never a developer API endpoint, never a bill page that doesn\'t show the vote, and never shortened with a “…”. It is printed whole or the card doesn\'t ship. Where we hold the vote but not the roll-call number needed to build that address, there is no card.</li>' +
          '<li><b>We say what a Yea actually did.</b> On a resolution that <b>cancels</b> something — a Congressional Review Act disapproval, for instance — the title tells you what it is about, not which way a Yes points. Those cards lead with the curator\'s own plain-English sentence for what passing it did (“a yea rolls back the mandate”). If nobody wrote one, the card doesn\'t ship: a reader shouldn\'t have to know how the CRA works to read a receipt.</li>' +
          '<li><b>We don\'t claim what came first.</b> The stated positions in PolitiDex are <b>undated</b>, so a card never asserts that someone said a thing and then voted the other way — only that the position and the vote point in different directions. The card says so on its face. We will not date a statement we can\'t source a date for.</li>' +
        '</ul>' +
        'Some things are held back on purpose: <b>confirmation votes</b>, because a vote about a <b>person</b> can\'t carry a policy claim once it leaves the app; issues whose wording means opposite things to different members; and any “they said” line that is <b>itself a vote</b>, which would leave the card arguing with its own evidence. ' +
        'Sharing also never moves a number — 🏛️ Official Record cards stay out of the 🧾 Say-vs-Do scores completely, exactly as above.',
        'cards') +
      row('📖', 'If a term is unfamiliar', 'Anything with a dotted underline anywhere in PolitiDex opens a short, plain-language definition — ' +
        LT('hr', 'H.R.') + ', ' + LT('rollcall', 'roll-call vote') + ', ' + LT('omnibus', 'omnibus') +
        ', ' + LT('cloture', 'cloture') + '. Definitions describe the process, never a party or a policy.' +
        (window.PDXLearn ? ' <button type="button" class="pdxl-link" data-pdxl-glossary>Open the full glossary →</button>' : '')) +
      '<div class="pdxgap-foot">No blended score. No vote counted twice. Every item links to its source.</div>' +
      '</div>';
  }
  function openMethodology(focus) {
    if (!document.body) return;
    var sheet = _ensureGapSheet();
    var body = sheet.querySelector('.pdxgap-body');
    if (body) body.innerHTML = methodologyHtml();
    // Same shared backdrop as the gap sheet, so the arrival class has to be decided
    // here too rather than inherited from whatever opened it last. A reader who
    // followed `#methodology` off a shared card is arriving; one who tapped
    // "ⓘ How we score this" inside the app is not.
    if (sheet.parentNode) {
      var arrive = false;
      try { arrive = /^#methodolog/i.test(String(location.hash || '')); } catch (e) {}
      _gapArrive(sheet.parentNode, arrive);
      sheet.parentNode.hidden = false;
    }
    try { sheet.scrollTop = 0; sheet.focus(); } catch (e) {}
    // A reader who tapped "HOW THIS IS JUDGED" on a shared card asked one specific
    // question. Land them on the answer rather than at the top of the sheet — the
    // link is only useful if it resolves to the rules that produced the card.
    if (focus) {
      try {
        var sel = String(focus).replace(/[^a-z0-9_-]/gi, '');
        var row = sel && sheet.querySelector('[data-pdxm-row="' + sel + '"]');
        if (row) {
          row.classList.add('pdxm-row-focus');
          if (row.scrollIntoView) row.scrollIntoView({ block: 'center' });
        }
      } catch (e) {}
    }
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
    // ✒️ The presidential action feeder. Exposed so the surfaces can cite the
    // document behind a read, and so the tests can assert the circularity guard
    // directly rather than inferring it from a percentage.
    execActions: {
      eligible: execEligible,
      forIssue: execRecordsFor,
      summary: execIssueSummary,
      issues: execIssueKeys,
      identifiers: execIdentifiers,
      namesDocument: execNamesDocument,
      saidText: execSaidText,
      proofText: execProofText,
      proofLines: execProofLines
    },
    chipHtml: chipHtml,
    dot: dot,
    legendHtml: legendHtml,
    // ── the issue-row unit ──────────────────────────────────────────────────
    // One stable projection of an issue: said (stance + direction), did (linked
    // actions), the verdict, the receipt count/strength, how testable it is, and
    // declared-null salience/recency weights. rankIssueRows() is the profile's one
    // sort contract. Exported so a later stance ranking is a new consumer rather
    // than a new row model.
    issueRow: issueRow,
    issueRows: issueRows,
    rankIssueRows: rankIssueRows,
    ROW_TIER: ROW_TIER,
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
    // Phase 8 (share): the gap sheet's "where to next" row, exposed as a pure
    // string builder. A reader arriving on a shared #record= link has no history
    // behind this sheet, so the row is the only exit — scripts/test-receipt-cards.mjs
    // asserts it offers real destinations rather than a dead generic button, and
    // it can be asserted without standing up a DOM.
    nextStepHtml: _gapNextHtml,
    // Phase 10 (digital share): the whole landing view, as a pure string builder.
    // This sheet is the destination of every shared 🏛️ card, and its header was
    // wrong for all 212 of them — it never named the member and it opened with
    // "— One side only", because a card is only ever shared when the Official
    // Record has depth the curated Say-vs-Do layer does not. Exposed so
    // scripts/test-receipt-cards.mjs can assert what an arrival actually reads
    // rather than assert on the source text of the function that writes it.
    gapViewHtml: _gapViewHtml,
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
