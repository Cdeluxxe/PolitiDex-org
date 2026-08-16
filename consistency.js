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
  // ── which lane a warm record actually belongs to ────────────────────────────
  // The voting-record endpoint carries two different things in one item type. A roll
  // call arrives as kind 'vote' with a ballot in `position`; a president's signed
  // law, veto or executive order arrives as kind 'position' with its actionType in
  // that same field, because the server (netlify/functions/voting-record.mts) serves
  // vr_rollcalls and vr_positions through one shape. So "this member has records" has
  // never been the same claim as "this member has a voting record", and treating the
  // two as one is what put roll-call vocabulary — "No votes yet", "Recorded vote",
  // "Voted Signed Law", a 🏛️ legend — onto a president's Official Record the moment
  // their formal actions loaded. Every lane decision below asks what the items ARE.
  // A ballot, not a kind. `kind` is what the wire said; the position is what the
  // figure actually cast, and only a real ballot puts an item on the 🏛️ lane.
  function _anyBallot(items) {
    for (var i = 0; i < (items || []).length; i++) {
      var it = items[i];
      if (it && it.kind !== 'position' && _BALLOTS[String(it.position || '').toLowerCase()] === 1) return true;
    }
    return false;
  }
  function recordItems(pid, issueKey) {
    try {
      return (typeof window._pdxRecordIssueItems === 'function')
        ? (window._pdxRecordIssueItems(pid, issueKey) || []) : [];
    } catch (e) { return []; }
  }
  // 'record' when a ballot is among the items on this issue, 'exec' when they are all
  // executive actions. Falls back to the congressional lane, which is what every
  // member surface already renders.
  function recordLaneFor(pid, issueKey) {
    var its = recordItems(pid, issueKey);
    if (its.length && !_anyBallot(its)) return 'exec';
    return 'record';
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
          // `facts` and `why` travel with the item. The spotlight entry has always
          // carried both — a paragraph of what the action actually did, and a
          // sentence on why it matters — and this index used to keep only the
          // headline, which is why a migrated formal action rendered as a bare title
          // with no mechanism behind it. Nothing is rewritten here; the display layer
          // decides how much of `facts` fits on a row face and keeps the rest one tap
          // deeper (see _dosItems' formal branch).
          slot.items.push({ headline: it.headline || '', date: it.date || '', sourceUrl: it.source.url, sourceLabel: (it.source.label || 'Source'), verdict: verdict,
                            facts: it.facts || '', why: it.why || '' });
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

  // ── TERM SCOPE: one read path, two scopes, all-time by default ──────────────
  // THE DEFAULT IS THE WHOLE RECORD. Every executive feeder below used to call
  // PDXExecRecord.actionsFor(pid) with no options, which is the CURRENT-TERM scope —
  // not by decision but by default, back when every seeded action was current-term and
  // the two scopes returned the same set. Once Term 45 landed the default stopped
  // being harmless: the word side of this comparison holds first-term pledges and
  // first-term outcome evidence, so a current-term action scope was testing what
  // someone said across two terms against what they did in one. That is not a narrower
  // read, it is a mismatched one, and it flattered the newer term by construction —
  // every first-term instrument that cut against a stated position was scoped out of
  // the number while the position it cut against stayed in.
  //
  // So: 'all_time' is the default, and it is the number the profile leads with. The
  // current-term slice is still computed, still real, and still shown for figures who
  // are serving — as a SECONDARY read with its own label, never as the headline and
  // never presented as the same quantity.
  //
  // WHY A SCOPE SETTING AND NOT A THREADED PARAMETER. The chain from a rendered
  // percentage down to actionsFor() runs read → testOf → officialRecord →
  // officialIssue → execRecordsFor, and three of those five are shared with the
  // congressional lane, which has no term scope at all. Threading an options bag
  // through all of them would put an exec-only concept into every congressional
  // signature and give every future caller a chance to forget it — and a caller who
  // forgets it silently gets the old behaviour back, which is the exact defect this
  // change exists to remove. One setting, read at the bottom, set only by
  // withExecTermScope() around a complete read, cannot be applied to part of one:
  // either the whole read is one scope or it is the other.
  //
  // It is deliberately NOT a public setter. Callers get a runner that restores the
  // previous scope in a finally block, so a scope can never leak out of the read that
  // asked for it — including when that read throws.
  var EXEC_TERM_SCOPES = {
    all_time: {
      key: 'all_time', allTerms: true,
      label: 'All time', short: 'the full formal record',
      note: 'Every formal action on file, across every term in office.'
    },
    current_term: {
      key: 'current_term', allTerms: false,
      label: 'Current term', short: 'this term only',
      note: 'A slice of the record above — only the formal actions taken in the term now being served.'
    }
  };
  var EXEC_SCOPE_DEFAULT = 'all_time';
  var _execTermScope = EXEC_SCOPE_DEFAULT;

  function execTermScope() { return EXEC_TERM_SCOPES[_execTermScope] || EXEC_TERM_SCOPES[EXEC_SCOPE_DEFAULT]; }
  function execScopeOpts() { return { allTerms: execTermScope().allTerms }; }

  // Run `fn` with the exec lane read at `scope`, then put the scope back. The finally
  // is the point: a read that throws must not leave the next reader on a scope they
  // never asked for.
  function withExecTermScope(scope, fn) {
    var want = EXEC_TERM_SCOPES[scope] ? scope : EXEC_SCOPE_DEFAULT;
    var prev = _execTermScope;
    _execTermScope = want;
    try { return fn(); } finally { _execTermScope = prev; }
  }

  // Is a current-term slice a live scope for this figure? Only for someone serving
  // now — see PDXExecRecord.serving(). A former officeholder's "current term" is last
  // term under a label that says otherwise.
  function execServing(pid) {
    try {
      var E = window.PDXExecRecord;
      return !!(E && typeof E.serving === 'function' && E.serving(pid));
    } catch (e) { return false; }
  }

  // The term label the current-term slice is a slice OF. Surfaced so a caller can
  // say "Term 47" rather than the bare word "current", which is the one word that
  // stops being true the day the roster changes.
  function execCurrentTerm(pid) {
    try {
      var E = window.PDXExecRecord;
      return (E && typeof E.currentTerm === 'function' && E.currentTerm(pid)) || null;
    } catch (e) { return null; }
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
  // The identifier set for one action is a property of the DOCUMENT, not of the
  // issue being tested against it — but the circularity guard runs per (action,
  // issue) pair, so it was rebuilding the same four-or-five-string list, and
  // re-running two regexes over the same document id, once for every issue on the
  // profile. Keyed by the action object itself: the seed's action objects are
  // stable for the life of the page, and a rebuilt pool simply gets fresh entries.
  var _execIdCache = (typeof Map === 'function') ? new Map() : null;
  var _execIdSquashed = (typeof Map === 'function') ? new Map() : null;
  function execIdentifiersCached(a) {
    if (!_execIdCache) return execIdentifiers(a);
    var hit = _execIdCache.get(a);
    if (hit) return hit;
    var v = execIdentifiers(a);
    _execIdCache.set(a, v);
    return v;
  }
  // Same list with whitespace and dots squeezed out — the second pass execCircular
  // runs so a card writing "H.R.1" still matches a seed writing "H.R. 1".
  function execIdentifiersSquashed(a) {
    if (!_execIdSquashed) {
      return execIdentifiersCached(a).map(function (s) { return s.replace(/[\s.]/g, ''); });
    }
    var hit = _execIdSquashed.get(a);
    if (hit) return hit;
    var v = execIdentifiersCached(a).map(function (s) { return s.replace(/[\s.]/g, ''); });
    _execIdSquashed.set(a, v);
    return v;
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
    var ids = execIdentifiersCached(a);
    if (execNamesDocument(said.plain, ids)) return { circular: true, why: 'card_names_document' };
    if (execNamesDocument(said.squeezed, execIdentifiersSquashed(a))) {
      return { circular: true, why: 'card_names_document' };
    }
    return { circular: false };
  }

  // Every scorable exec action touching ONE issue, as record items — plus what was
  // held back and why, because a filter that hides its own exclusions makes a
  // partial record look complete.
  function execRecordsFor(pid, issueKey) {
    var out = { items: [], held: [], unstated: 0, circular: 0, touched: 0 };
    if (!issueKey || !execEligible(pid)) return out;
    var E = window.PDXExecRecord;    var pool;
    try { pool = E.actionsFor(pid, execScopeOpts()); } catch (e) { return out; }
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
          sourceLabel: a.sourceLabel || '',
          // The display-facing explanation for THIS issue. A held action still has to
          // answer "why is this document under this issue at all" — the reason line
          // says why it is not scored, which is a different question.
          plain: (mapping && mapping.plain) || ''
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
          plain: m2.plain || '',
          // The curated "why this document counts on THIS issue" sentence, when the
          // seed carries one. It travels per mapping for the same reason `plain`
          // does: one document reaches two issues for two different reasons, and a
          // sentence hoisted to the document would be right about one of them at
          // most. Empty is normal — the dossier derives a line from the mapping's
          // own fields when nobody has written a better one.
          counts: m2.counts || '',
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
        // The one-sentence, display-facing explanation of what this document did and
        // how that touches THIS issue — curated per (action, issue) pair in the seed.
        // Empty when the seed carries none, and every surface fails closed on that:
        // no sentence rather than the curation rationale, which is a paragraph of
        // quoted subsections written for whoever audits the mapping.
        plain: mapping.plain || '',
        standing: standing
      });
    }
    return out;
  }

  // MEMOIZED — see THE DERIVATION EPOCH in stance-helpers.js.
  //
  // Pure per (pid, issue) given the epoch, and read by the summary, the row model,
  // the dossier and the lane panels — four surfaces asking the same question about
  // the same issue while the reader waits. Assembling it walks the whole kept pool
  // and runs the circularity guard per action, so the repeats were the single most
  // expensive thing this file did on a presidential profile.
  //
  // Returned by reference. `items` / `held` are read-only to every caller here and
  // in exec-record-ui.js — nothing pushes into them after assembly.
  //
  // Invalidated on the epoch AND on the seeded action list for this pid being
  // replaced, for the same reason PDXExecRecord.actionsFor is — see the note there.
  //
  // AND KEYED ON THE ACTIVE TERM SCOPE. execRecordsFor() reads execScopeOpts() at
  // the bottom of its own chain, so "this pid, this issue, this epoch" is not a
  // complete question: asked inside withExecTermScope('current_term', …) it is a
  // different question with a different answer, and the current-term slice sits
  // directly beside the all-time figure it is compared against. A cache blind to
  // the scope publishes the all-time number under the current-term heading.
  var _erfCache = {}, _erfEpoch = 0;
  function _erfRaw(pid) {
    try { return (window.EXEC_ACTIONS || {})[norm(pid)] || null; } catch (e) { return null; }
  }
  function execRecordsForMemo(pid, issueKey) {
    var ep = (typeof window.PDXDataEpoch === 'function') ? window.PDXDataEpoch() : 0;
    if (_erfEpoch !== ep) { _erfCache = {}; _erfEpoch = ep; }
    var raw = _erfRaw(pid);
    var k = norm(pid) + '||' + String(issueKey || '') + '||' + execTermScope().key;
    var hit = _erfCache[k];
    if (hit && hit.raw === raw && hit.len === (raw ? raw.length : -1)) return hit.val;
    var v = execRecordsFor(pid, issueKey);
    _erfCache[k] = { raw: raw, len: (raw ? raw.length : -1), val: v };
    return v;
  }

  // ONE issue's exec summary, in the same shape recordSummary() returns, produced
  // by the same function. Null when nothing scorable touches the issue.
  function execIssueSummary(pid, issueKey) {
    var pool = execRecordsForMemo(pid, issueKey);
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
    try { pool = E.actionsFor(pid, execScopeOpts()); } catch (e) { return []; }
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
    try { pool = execRecordsForMemo(pid, issueKey); } catch (e) { return out; }
    var max = limit || 2;
    for (var i = 0; i < pool.items.length && out.length < max; i++) {
      var it = pool.items[i], t = execProofText(it);
      if (!t) continue;
      out.push({
        text: t, kind: 'exec-action',
        documentId: it.documentId || '', actionClass: it.actionClass || '',
        standing: it.standing || null,
        // What the instrument did and how it touches this issue, in one sentence.
        // Carried alongside `text` rather than folded into it: `text` is the citation
        // line (document · class of power · standing) and callers align on it.
        plain: it.plain || '',
        url: it.sourceUrl || '', label: it.sourceLabel || '',
        // The record item itself, so a caller that needs the issue mappings (the
        // omnibus disclosure) does not have to re-derive the pool.
        item: it
      });
    }
    return out;
  }

  // ── the shared Mixed gate ───────────────────────────────────────────────────
  // Mixed is minted in exactly one place for the whole app: _pdxMixedGate in
  // stance-helpers.js, which every lane below calls through this accessor. The rule
  // is that a split is only Mixed when both directions are materially present and
  // neither holds 2/3 of the weight; a dominant side resolves outright and a
  // directionless record resolves to no_position, never to a soft middle.
  //
  // No local copy of the rule lives here on purpose — a second copy is how the
  // homepage tally and the profile issue rows drifted apart in the first place. If
  // the shared gate is somehow absent this degrades to "the heavier side wins" and
  // simply cannot mint Mixed, which is the safe direction to fail in.
  //
  // `judgedItems` is the headcount behind the two scores, in whatever the lane
  // counts: roll calls, formal actions, curated receipts, or issue rows. Below the
  // shared floor of two the gate resolves the row outright instead of calling it
  // split, so no lane can print "Mixed record" off one piece of evidence.
  function mixedGate(consistentScore, contradictScore, judgedItems) {
    var g = window._pdxMixedGate;
    if (typeof g === 'function') return g(consistentScore, contradictScore, judgedItems);
    return contradictScore > consistentScore ? 'contradicts'
         : consistentScore > contradictScore ? 'consistent' : 'no_position';
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
      // Both directions documented — but "both directions exist" is not the same
      // claim as "neither direction wins". Put the weight through the shared gate:
      // the roll-call/exec lane brings its own weighted scores, and each curated
      // receipt counts as one action at the default mapping weight so the two feeds
      // are compared in the same unit. The headcount travels with the weight, so a
      // row standing on a single both-ways document resolves instead of reading as
      // a split record.
      token = mixedGate(
        (rec && rec.consistentScore ? rec.consistentScore : 0) + cur.consistent * 100,
        (rec && rec.contradictScore ? rec.contradictScore : 0) + cur.contradicts * 100,
        (rec ? ((rec.consistent || 0) + (rec.contradicts || 0)) : 0) +
          cur.consistent + cur.contradicts
      );
      if (token === 'no_position') token = 'limited';
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
    var exPool = execRecordsForMemo(pid, issueKey);
    var hasStance = !!stance || (rec && rec.netVerdict && rec.netVerdict !== 'no_stance' && rec.netVerdict !== 'no_record') || act.total > 0;

    // 1. Systematic roll-call record is authoritative — use it alone, so a curated
    //    echo of the same vote can never be counted twice. "Systematic" is about the
    //    feed, not the office: the same feed carries a president's formal actions, so
    //    the lane is read off the items rather than assumed to be congressional.
    if (rec && rec.total) {
      var t = rec.netVerdict === 'contradicts' ? 'contradicts'
            : rec.netVerdict === 'consistent' ? 'consistent'
            : rec.netVerdict === 'mixed' ? 'mixed' : 'limited';
      var recLane = recordLaneFor(pid, issueKey);
      return {
        scope: 'official', token: t, verdict: laneVerdict('official', t, recLane === 'exec' ? 'exec' : null),
        score: scoreFromRecord(rec), record: rec, officialActions: null, curated: null,
        contradictions: rec.contradicts || 0, flags: 0,
        hasStance: hasStance, pending: false, lane: recLane,
        sources: [recLane === 'exec' ? 'exec-actions' : 'record']
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
      // Curated formal actions are unweighted, so each counts as one action at the
      // default mapping weight and goes through the same Mixed gate as every other
      // lane. A single action that breaks the claim resolves as a contradiction —
      // it holds all of the weight, and it is one action rather than a record
      // pulling two ways — instead of being averaged into a middle.
      var tok = mixedGate(act.consistent * 100, act.contradicts * 100,
        act.consistent + act.contradicts);
      if (tok === 'no_position') tok = 'limited';
      return {
        scope: 'official', token: tok, verdict: scopeVerdict('official', tok),
        score: (act.consistent + act.contradicts)
          ? Math.round(100 * act.consistent / (act.consistent + act.contradicts))
          : null,
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
    } else if (emptyLane === 'exec') {
      // …and neither is an exec-eligible figure on an issue no order maps to. The
      // warm this branch queues fetches a ROLL-CALL record, and a president has
      // none coming: the wait could never end, so the issue sat in 'pending'
      // permanently, re-queueing the same fetch on every read. Two things followed
      // from that, both worse than the wasted request. coverage.warming stayed true
      // forever, so the hero and the thin copy could say "Loading the record…" about
      // a record that had already fully arrived. And issueRow() refuses the
      // public-record basis while a row reads 'pending' — so every issue no
      // executive action happens to map to was blocked from falling through to the
      // broader public record, which is exactly the lane built to cover it.
      token = hasStance ? 'no_record' : 'no_stance';
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
    else if (cur.contradicts > 0 || cur.consistent > 0) {
      // Same gate as every other lane — receipts pointing two ways only read Mixed
      // when neither direction dominates AND there are at least two of them.
      token = mixedGate(cur.consistent * 100, cur.contradicts * 100,
        cur.consistent + cur.contradicts);
      if (token === 'no_position') token = cur.flag > 0 ? 'flag' : 'no_record';
    }
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
    var consW = 0, contraW = 0; // per-side weight, for the shared Mixed gate below
    keys.forEach(function (k) {
      var v = per(pid, k);
      counts[bucketOf(v.token)]++;
      contradictions += v.contradictions || 0;
      if (v.pending) anyPending = true;
      var iw = judgedCountOf(v);
      if (!(typeof iw === 'number' && iw > 0)) iw = 1;
      if (v.token === 'consistent') consW += iw;
      else if (v.token === 'contradicts') contraW += iw;
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
    // Roll-ups use the shared Mixed gate too. Issues weigh in proportion to the
    // record behind them (judgedCountOf, same weight the % uses), so one broken
    // issue beside seven backed ones reads as the record actually reads instead of
    // collapsing the whole scope into "Mixed record". The headcount here is the
    // number of directional ISSUE ROWS, so a whole scope cannot read Mixed off a
    // single issue either.
    if (counts.contradicts > 0 || counts.consistent > 0) {
      token = mixedGate(consW, contraW, counts.consistent + counts.contradicts);
      if (token === 'no_position') token = counts.mixed > 0 ? 'mixed' : 'limited';
    }
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

  // ── has this member's record lane finished asking? ──────────────────────────
  // A surface that publishes a score before the answer is in publishes a DIFFERENT
  // score a moment later. The homepage record card did exactly that: the executive
  // lane is bundled and available cold, so the card cleared the publishing floor on
  // the first pass, painted a percentage and a headline, and then repainted both
  // when the roll-call fetch landed — a summary that argues with itself while the
  // reader is looking at it.
  //
  // `settled` is answered for the WHOLE lane, not per issue: true once this pid's
  // fetch has come back (with rows or with nothing, succeeded or failed), true if
  // the record was already noted from an earlier page, and true when there is no
  // fetcher at all — nothing to wait for is not the same as waiting. False only
  // while a request this page started is genuinely outstanding.
  var _settled = {};
  function recordSettled(pid) {
    pid = String(pid || '');
    if (!pid) return false;
    if (_settled[pid]) return true;
    var vr = null;
    try { vr = window.PDXVotingRecord; } catch (e) { vr = null; }
    if (!vr || typeof vr.fetchMember !== 'function') return true;
    try {
      if (typeof vr.memberRecords === 'function' && vr.memberRecords(pid)) return true;
    } catch (e) {}
    return false;
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
  // A request that never comes back is the worst case this queue has, because it
  // fails in two directions at once: the surface waiting on that member sits on a
  // skeleton forever, AND the slot it occupies is never returned, so four hung
  // requests stall the whole queue behind them and every member still queued
  // waits on a fetch that will never answer. A deadline converts "no answer" into
  // an answer — the lane is marked settled and the slot is handed back — while
  // leaving the request itself alone: if it does land later it still notes the
  // record, still bumps the derivation epoch, and every surface upgrades then.
  var WARM_DEADLINE_MS = 9000;
  var _inFlight = 0;
  function pump() {
    while (_inFlight < WARM_CONCURRENCY && _queue.length) warmOne(_queue.shift());
  }
  function warmOne(pid) {
    _inFlight++;
    var settled = false;
    var deadline = null;
    // Hand the next fetch to a fresh task. Starting it inline would put its parse
    // in the same task as the listeners this one just woke.
    var done = function () {
      if (settled) return;
      settled = true;
      _inFlight--;
      if (deadline) { try { clearTimeout(deadline); } catch (e) {} deadline = null; }
      // Asked and answered — whatever the answer was. A card waiting on this lane
      // needs to know the wait is over even when the request came back empty or
      // failed outright, or it sits on a skeleton until a backstop timer rescues it.
      _settled[String(pid)] = true;
      try { setTimeout(pump, 0); } catch (e) { pump(); }
    };
    try {
      deadline = setTimeout(function () {
        if (settled) return;
        done();
        // Announced as a failure because that is what it is from the reader's side:
        // there is nothing to show for this member. `timedOut` is carried for any
        // surface that wants to distinguish "came back empty" from "never came
        // back" — nothing needs to, and nothing should treat it as a finding.
        try {
          window.dispatchEvent(new CustomEvent('pdx-consistency-warm', {
            detail: { pid: pid, failed: true, timedOut: true }
          }));
        } catch (e) {}
      }, WARM_DEADLINE_MS);
    } catch (e) { deadline = null; }
    try {
      window.PDXVotingRecord.fetchMember(pid, { pageSize: 100 }).then(function (data) {
        var late = settled;
        if (data && data.items && data.items.length && typeof window.PDXVotingRecord.noteMember === 'function') {
          window.PDXVotingRecord.noteMember(pid, data.items);
        }
        done();
        // A response that beat the deadline announces itself as an arrival; one
        // that lost to it still announces, so a surface that fell back to an
        // honest empty state picks the real record up on this pass.
        try {
          window.dispatchEvent(new CustomEvent('pdx-consistency-warm', {
            detail: { pid: pid, late: late || undefined }
          }));
        } catch (e) {}
      }).catch(function () {
        // A failed fetch is still an answer. It used to announce nothing, so every
        // surface waiting on this member stayed in its loading state until a
        // grace-period sweep gave up on it.
        done();
        try { window.dispatchEvent(new CustomEvent('pdx-consistency-warm', { detail: { pid: pid, failed: true } })); } catch (e) {}
      });
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
      // The action's explanation line inside an opened issue row: what the instrument
      // did and how that touches THIS issue. Set brighter than the 🧩 disclosure under
      // it, because it is the part the row is meant to be read from.
      '.pdxor-why-act{display:block;font-size:0.68rem;color:#c6d4ec;line-height:1.5;margin-top:0.25rem;}' +
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
      // The shared dossier door, wherever it sits inside a record row. Same pill as the
      // link it replaced, but sentence-cased and given a real tap target: the bucket
      // word is the readable part and SHOUTING IT WITH THE WHOLE SENTENCE was not.
      '.pdxdos-door{text-transform:none;letter-spacing:0.01em;font-size:0.7rem;min-height:2.15rem;padding:0.3rem 0.7rem;}' +
      '.pdxdos-door .pdxdos-door-b{font-weight:800;}' +
      '.pdxdos-door .pdxdos-door-r{color:#c6d4ec;font-weight:600;}' +
      '.pdxgap-back{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;background:rgba(4,7,16,0.72);backdrop-filter:blur(2px);}' +
      '.pdxgap-back[hidden]{display:none;}' +
      // Top padding is deliberately tight (0.65rem, not 1rem): this sheet is the
      // LANDING PAGE for every shared card, and the first thing a reader saw used to
      // be a band of empty gradient above a 0.62rem eyebrow. The close button is
      // pulled in to match so the first line — the issue itself — starts as high as
      // it can.
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
      // ── Header identity strip ───────────────────────────────────────────────
      // Compact, and BELOW the issue and the result. It used to be a slab at the
      // very top — a 3.1rem face, an eyebrow, the name at 1.02rem and a sub-line —
      // which on a 360px phone pushed the issue title and the verdict chip off the
      // first screen on the one surface whose whole job is to answer "what did the
      // record say about this issue". Same facts, one row, far less height. The
      // photo still comes from _getPhotoUrl (the app's single headshot source) and
      // still degrades to party-tinted initials, never to a broken image frame.
      '.pdxgap-id{display:flex;align-items:center;gap:0.5rem;margin-top:0.5rem;}' +
      '.pdxgap-face{flex:none;position:relative;width:1.85rem;height:1.85rem;border-radius:0.45rem;overflow:hidden;background:#0a0f1e;border:1px solid var(--c,#8fa5c4);box-shadow:0 0 0 1px rgba(0,0,0,0.4);}' +
      '.pdxgap-face img{width:100%;height:100%;object-fit:cover;display:block;}' +
      '.pdxgap-face-ph::after{content:attr(data-fb);position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:"Bebas Neue",sans-serif;font-size:0.72rem;letter-spacing:0.02em;color:var(--c,#8fa5c4);background:linear-gradient(135deg,rgba(255,255,255,0.06),rgba(0,0,0,0.25));}' +
      '.pdxgap-idmain{min-width:0;display:flex;flex-wrap:wrap;align-items:baseline;gap:0.2rem 0.45rem;}' +
      // The member's name. Wraps rather than truncates — a clipped name on a page
      // that has to identify someone is worse than a second line — but it is no
      // longer the largest thing in the header; the issue title is.
      '.pdxgap-who{font-weight:700;font-size:0.84rem;color:#e8eefc;line-height:1.2;}' +
      '.pdxgap-who-sub{display:flex;flex-wrap:wrap;align-items:center;gap:0.3rem;font-weight:600;font-size:0.66rem;color:#8fa5c4;line-height:1.3;margin-top:0;}' +
      // The lane cue, pushed to the end of the strip. It is chrome that names which
      // record is speaking, so it reads last rather than first.
      '.pdxgap-id .pdxgap-eyebrow{margin-left:auto;flex:none;font-size:0.58rem;text-align:right;}' +
      '@media (max-width:420px){.pdxgap-id .pdxgap-eyebrow{display:none;}}' +
      '.pdxgap-party{font-weight:700;font-size:0.62rem;letter-spacing:0.04em;padding:0.05rem 0.34rem;border-radius:999px;color:var(--c,#8fa5c4);border:1px solid var(--c,#8fa5c4);background:rgba(10,15,30,0.5);}' +
      // The issue leads the sheet, so it starts at the top of the header with no
      // margin above it — the tight sheet padding is the only gap.
      '.pdxgap-title{font-family:"Bebas Neue",sans-serif;font-size:1.5rem;letter-spacing:0.02em;color:#e8eefc;line-height:1;margin:0 2.1rem 0.4rem 0;}' +
      // The issue's own colour, carried in from the row that was tapped. Only ever
      // painted when the key resolved to a real core issue — an unmapped key gets no
      // spine rather than a neutral one that looks like a colour that failed.
      '.pdxgap-title.pdxc-ic{border-left:4px solid var(--pdx-ic);padding-left:0.5rem;' +
        'background:linear-gradient(90deg,var(--pdx-ic-wash,transparent),transparent 58%);}' +
      '@media (max-width:380px){.pdxgap-title{font-size:1.3rem;}.pdxgap-face{width:1.65rem;height:1.65rem;}}' +
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
      // The coverage gap and its Suggest-a-lead control, inside the empty 🧾 side. The
      // row itself is a real PDXGaps row and wears PDXGaps' own styles from
      // word-action.css — only the spacing around the list belongs to this sheet.
      '.pdxgap-solo-gap{list-style:none;margin:0.55rem 0 0;padding:0;display:grid;gap:0.45rem;}' +
      // "Not here" is not "not anywhere". Quieter than the gap above it: this is
      // orientation, and the actionable row is the one that should carry the weight.
      '.pdxgap-solo-el{font-size:0.66rem;color:#8fa2c0;line-height:1.45;margin-top:0.5rem;}' +
      '.pdxgap-solo-el b{color:#c6d4ec;}' +
      '.pdxgap-solo-nx{margin-top:0.4rem;flex:0 1 auto;}' +
      // THE WALL, stated in the 🧾 column head. Dimmer than the evidence it sits above
      // — a reader needs it once, and it must never compete with an actual receipt.
      '.pdxgap-side-wall{font-size:0.63rem;color:#8fa2c0;line-height:1.4;margin:-0.2rem 0 0.5rem;' +
        'padding:0.28rem 0.4rem;border-radius:0.4rem;background:rgba(147,166,196,0.08);' +
        'border:1px solid rgba(147,166,196,0.16);}' +
      // THE LANDING FLASH. Set for ~2s on whichever public panel a 🧾 row tap asked
      // the sheet to stop at, then removed. Outline rather than a border or padding
      // change so nothing reflows under a reader mid-scroll, and reduced-motion gets
      // the same outline without the fade — the highlight IS the information here,
      // so it is the animation that is optional, not the marking.
      '.pdxgap-lit{outline:2px solid rgba(147,166,196,0.75);outline-offset:2px;' +
        'animation:pdxgapLit 1.9s ease-out 1;}' +
      '@keyframes pdxgapLit{0%{outline-color:rgba(147,166,196,0.95);}70%{outline-color:rgba(147,166,196,0.6);}100%{outline-color:rgba(147,166,196,0);}}' +
      '@media (prefers-reduced-motion:reduce){.pdxgap-lit{animation:none;}}' +
      // ── the 🧾 item's teachable face ──────────────────────────────────────────
      // The labelled slots are the 🏛️ side's (.pdxdos-rec-why / -wk, reused rather
      // than re-declared so the two lanes can never drift apart typographically);
      // all this adds is the wrap that lets them sit under the headline, and the
      // direction word.
      '.pdxsd-act{flex-wrap:wrap;padding-bottom:0.42rem;}' +
      '.pdxsd-act .pdxdos-rec-why{margin-top:0.18rem;}' +
      '.pdxsd-dir{flex:0 0 auto;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;' +
        'font-size:0.58rem;letter-spacing:0.08em;text-transform:uppercase;border:1px solid currentColor;' +
        'border-radius:0.3rem;padding:0.02rem 0.3rem;opacity:0.85;}' +
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
      // ── The issue dossier ───────────────────────────────────────────────────
      // Four levels, each adding a different KIND of information rather than more
      // of the same: the assembled answer (open), the list of instruments behind it
      // (closed), one instrument's mechanism (closed), and the raw provenance
      // (closed, inside that). Every closed level is a real <details>, so the
      // browser owns the toggle and a reader who opens nothing pays for nothing.
      '.pdxdos{margin-top:0.7rem;border:1px solid rgba(127,180,255,0.18);border-radius:0.7rem;' +
        'background:rgba(10,15,30,0.42);padding:0.55rem 0.7rem 0.6rem;}' +
      '.pdxdos-h{font-family:"Barlow Condensed",sans-serif;text-transform:uppercase;letter-spacing:0.08em;' +
        'font-size:0.66rem;color:#8fa2c0;margin-bottom:0.35rem;}' +
      '.pdxdos-line{display:flex;gap:0.45rem;align-items:baseline;font-size:0.75rem;line-height:1.45;' +
        'color:#c6d4ec;padding:0.2rem 0;border-top:1px solid rgba(255,255,255,0.05);}' +
      '.pdxdos-line:first-of-type{border-top:none;}' +
      '.pdxdos-k{flex:none;min-width:5.2rem;font-size:0.61rem;text-transform:uppercase;' +
        'letter-spacing:0.05em;color:#7e93b3;}' +
      '.pdxdos-v{color:#e8eefc;}' +
      '.pdxdos-vd{font-weight:700;}' +
      '.pdxdos-lane{display:block;font-size:0.66rem;color:#8fa2c0;margin-top:0.08rem;font-weight:400;}' +
      // The row's own composition and depth lines, borrowed verbatim from the
      // stance row so the sheet cannot describe the same record differently.
      '.pdxdos .pdxst-comp,.pdxdos .pdxst-ev{margin-top:0.3rem;}' +
      '.pdxdos-caveat{margin-top:0.35rem;font-size:0.69rem;color:#f0cd8c;line-height:1.45;}' +
      '.pdxdos-score{margin-top:0.4rem;padding-top:0.4rem;border-top:1px solid rgba(255,255,255,0.07);' +
        'font-size:0.69rem;color:#8fa2c0;line-height:1.45;}' +
      '.pdxdos-score .pdxst-go{margin-top:0.35rem;}' +
      // L2 — every instrument on THIS issue, closed. The count is in the summary,
      // so the depth is readable without opening anything.
      '.pdxdos-recs{margin-top:0.55rem;border-top:1px solid rgba(255,255,255,0.08);padding-top:0.15rem;}' +
      '.pdxdos-recs>summary{cursor:pointer;list-style:none;display:flex;flex-wrap:wrap;align-items:center;gap:0.35rem;' +
        'min-height:2.2rem;font-family:"Barlow Condensed",sans-serif;font-size:0.78rem;' +
        'letter-spacing:0.03em;color:#dbe6f7;}' +
      '.pdxdos-recs>summary::-webkit-details-marker{display:none;}' +
      // The enumeration under the count. It wraps to its own full-width line so the
      // count stays scannable, and it is quieter than the count because it is the
      // AUDIT of that number rather than a competing headline — a reader who wants to
      // know how many looks up, a reader who wants to know which ones reads across.
      '.pdxdos-recs-list{flex:1 0 100%;min-width:0;font-family:system-ui,sans-serif;' +
        'font-size:0.66rem;letter-spacing:0;color:#8fa2c0;line-height:1.45;' +
        'overflow-wrap:break-word;padding-bottom:0.2rem;}' +
      '.pdxdos-recs[open]>summary{color:#9fdbff;}' +
      '.pdxdos-empty{font-size:0.72rem;color:#8fa2c0;padding:0.25rem 0 0.4rem;line-height:1.45;}' +
      // ── The continuity line, directly under the issue title ────────────────
      // Named in the index's colour, in the index's word, so the header the tap
      // lands on repeats the header the tap left. Deliberately quieter than the
      // verdict chip below it: this says WHERE the finding was filed, not what it
      // is — the verdict is still the thing being read.
      '.pdxdos-bucket{display:flex;flex-wrap:wrap;align-items:baseline;gap:0.3rem 0.45rem;' +
        'margin:-0.15rem 0 0.45rem;padding-left:0.55rem;border-left:3px solid var(--c,#9fb4d4);}' +
      '.pdxdos-bucket-k{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.58rem;' +
        'letter-spacing:0.09em;text-transform:uppercase;color:#8fa2c0;}' +
      '.pdxdos-bucket-v{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.74rem;' +
        'letter-spacing:0.06em;text-transform:uppercase;color:var(--c,#9fb4d4);}' +
      '.pdxdos-bucket-s{flex:1 1 100%;min-width:0;font-size:0.68rem;line-height:1.45;color:#8fa2c0;' +
        'overflow-wrap:break-word;}' +
      // The lane-asymmetry note. Set apart from the rows so it reads as a statement
      // about the record's shape rather than as another row.
      '.pdxdos-note{font-size:0.68rem;color:#8fa2c0;line-height:1.5;padding:0.4rem 0 0.1rem;' +
        'border-top:1px solid #ffffff10;margin-top:0.35rem;}' +
      // THE COVERAGE GAP, when the list cannot yet show everything the verdict
      // counted. It goes ABOVE the rows, not below them, because it changes how the
      // rows should be read — and it is amber rather than grey, because "some of the
      // receipts are missing" is the one thing on this level a reader must not skim
      // past. It appears only when the gap is real (see _dosCoverage).
      '.pdxdos-gap{font-size:0.68rem;color:#f0cd8c;line-height:1.5;padding:0.35rem 0.5rem;' +
        'border:1px solid rgba(240,205,140,0.3);border-radius:0.4rem;background:rgba(240,205,140,0.06);' +
        'margin:0.35rem 0 0.15rem;}' +
      '.pdxdos-rec{border-top:1px solid rgba(255,255,255,0.06);}' +
      '.pdxdos-rec>summary{cursor:pointer;list-style:none;display:flex;flex-wrap:wrap;align-items:baseline;' +
        'gap:0.3rem;padding:0.4rem 0;min-height:2.2rem;}' +
      '.pdxdos-rec>summary::-webkit-details-marker{display:none;}' +
      '.pdxdos-rec-ico{flex:none;}' +
      '.pdxdos-rec-id{font-weight:700;font-size:0.76rem;color:#e8eefc;}' +
      '.pdxdos-rec-act{font-size:0.72rem;color:#c6d4ec;}' +
      '.pdxdos-rec-vd{font-size:0.68rem;}' +
      '.pdxdos-rec-st{font-size:0.66rem;color:#9fb4d4;}' +
      '.pdxdos-rec-tag{font-size:0.61rem;color:#8fa2c0;border:1px solid rgba(255,255,255,0.14);' +
        'border-radius:999px;padding:0.02rem 0.36rem;}' +
      '.pdxdos-rec-why{flex:1 0 100%;font-size:0.68rem;color:#8fa2c0;line-height:1.4;}' +
      // The mechanism labels. Brighter than the sentence they introduce, so "What it
      // did" and "Why it counts here" read as the two fixed slots they are rather
      // than as the opening words of a paragraph — a reader scanning six rows for
      // one of the two answers finds the same label in the same place every time.
      '.pdxdos-rec-wk{color:#c6d4ec;font-weight:700;}' +
      // ── A DERIVED LINE MUST NOT WEAR A CURATOR'S VOICE ──────────────────────
      // Dimmer than the sentence above it, italic, and set behind a dashed rule —
      // dashed because the solid tinted rule on the veto path already means "read
      // this, it explains the chip", and this means close to the opposite: nobody
      // has read this yet. The label loses the bright colour and the bold weight,
      // so the slot still scans in the same place on every row without claiming the
      // authority the curated label carries.
      '.pdxdos-rec-derived{color:#75879f;font-style:italic;' +
        'border-left:2px dashed rgba(255,255,255,0.13);padding-left:0.45rem;}' +
      '.pdxdos-rec-wk-d{color:#8fa2c0;font-weight:600;font-style:normal;}' +
      '.pdxdos-rec-unex{display:inline-block;margin-left:0.35rem;font-size:0.6rem;font-style:normal;' +
        'color:#9fb4d4;border:1px dashed rgba(159,180,212,0.45);border-radius:999px;' +
        'padding:0.02rem 0.36rem;white-space:nowrap;}' +
      // The queue row under the list. PDXGaps supplies the row's own styling; this
      // only gives its <ul> the spacing a bare list does not have inside the sheet.
      '.pdxdos-queue{list-style:none;margin:0.55rem 0 0;padding:0;}' +
      // The multi-issue disclosure sits under both, dimmer and italic: it is about
      // the SCOPE of the row rather than about this issue, and it should not compete
      // with the two sentences that are.
      '.pdxdos-rec-multi{color:#7f97b8;font-style:italic;}' +
      // The door out of the caveat. Sized and coloured like the link it is, not like
      // a primary action: the trail is context for the row, and the row is still the
      // thing the reader came for.
      '.pdxdos-rec-follow{display:inline-block;margin-left:0.4rem;font-size:0.63rem;font-style:normal;' +
        'color:#7fb4ff;background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;' +
        'text-underline-offset:2px;}' +
      // The trail itself, inside the multi-issue disclosure that already existed.
      '.pdxins{margin:0.3rem 0 0;outline:none;}' +
      '.pdxins-r{padding:0.32rem 0;border-top:1px solid rgba(255,255,255,0.07);}' +
      '.pdxins-r:first-child{border-top:0;}' +
      '.pdxins-here{background:rgba(127,180,255,0.07);border-left:2px solid rgba(127,180,255,0.5);' +
        'padding-left:0.4rem;margin-left:-0.42rem;}' +
      '.pdxins-rh{display:flex;flex-wrap:wrap;align-items:baseline;gap:0.34rem;font-size:0.68rem;}' +
      '.pdxins-dir{font-size:0.6rem;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;}' +
      '.pdxins-adv{color:#6ee7a0;}' +
      '.pdxins-opp{color:#ff9f9f;}' +
      '.pdxins-neu{color:#8fa2c0;}' +
      '.pdxins-off{opacity:0.5;}' +
      '.pdxins-lbl{color:#e8eefc;font-weight:700;}' +
      '.pdxins-v{font-size:0.64rem;}' +
      '.pdxins-hold{color:#f0cd8c;}' +
      '.pdxins-you{font-size:0.58rem;text-transform:uppercase;letter-spacing:0.05em;color:#7fb4ff;' +
        'border:1px solid rgba(127,180,255,0.4);border-radius:999px;padding:0.02rem 0.36rem;}' +
      '.pdxins-go{margin-left:auto;font-size:0.63rem;color:#7fb4ff;background:none;border:0;padding:0;' +
        'cursor:pointer;text-decoration:underline;text-underline-offset:2px;}' +
      '.pdxins-why{display:block;font-size:0.66rem;color:#c6d4ec;line-height:1.45;margin-top:0.14rem;}' +
      // Same two voices as the row face, so a reader who learned the difference one
      // level up does not have to learn it again here.
      '.pdxins-why-d{color:#75879f;font-style:italic;}' +
      '.pdxins-wk{color:#c6d4ec;font-weight:700;}' +
      '.pdxins-why-d .pdxins-wk{color:#8fa2c0;font-weight:600;font-style:normal;}' +
      '.pdxins-foot{margin:0.5rem 0 0;font-size:0.63rem;color:#8fa2c0;line-height:1.5;' +
        'border-top:1px solid rgba(255,255,255,0.07);padding-top:0.4rem;}' +
      // The veto path. Tinted rather than dimmed, because unlike the multi-issue
      // caveat it is not context around the row — it is the only sentence that
      // explains why a bill Congress passed is filed as an action against the
      // President, and a reader who skims it cannot make sense of the chip above it.
      '.pdxdos-rec-veto{color:#c9b6e8;border-left:2px solid rgba(201,182,232,0.35);' +
        'padding-left:0.45rem;}' +
      // THE TWO TEACHING BEATS, on thin contradicted and mixed rows only. They are
      // the bookends of the argument — the claim at the top, the comparison at the
      // bottom — so they are tinted alike and set off from the three machine-assembled
      // lines between them. `said` is quoted speech and leans italic; `gap` is the
      // sentence that does the actual comparing and gets full contrast, because on
      // these rows it is the single most load-bearing line on the face.
      '.pdxdos-rec-said{color:#9fb4d4;font-style:italic;}' +
      '.pdxdos-rec-said .pdxdos-rec-wk{font-style:normal;}' +
      '.pdxdos-rec-gap{color:#e8eefc;border-left:2px solid rgba(127,180,255,0.45);' +
        'padding-left:0.45rem;margin-top:0.12rem;}' +
      '.pdxdos-rec-hold{color:#f0cd8c;}' +
      '.pdxdos-rec-b{padding:0 0 0.5rem;}' +
      // L3 — one instrument's mechanism, mounted on first open.
      '.pdxdos-d{font-size:0.71rem;color:#c6d4ec;line-height:1.5;padding:0.14rem 0;}' +
      '.pdxdos-d b{color:#e8eefc;}' +
      '.pdxdos-tags{display:flex;flex-wrap:wrap;gap:0.25rem;margin:0.3rem 0 0.1rem;}' +
      '.pdxdos-tag{font-size:0.6rem;text-transform:uppercase;letter-spacing:0.04em;border-radius:999px;' +
        'padding:0.04rem 0.42rem;border:1px solid rgba(255,255,255,0.16);color:#c6d4ec;}' +
      '.pdxdos-tag-p{border-color:rgba(110,231,160,0.45);color:#a9e9c6;}' +
      '.pdxdos-tag-n{border-color:rgba(240,205,140,0.45);color:#f0cd8c;}' +
      '.pdxdos-src{display:inline-block;margin-top:0.3rem;font-size:0.68rem;color:#7fb4ff;}' +
      '.pdxdos-rel{margin-top:0.35rem;}' +
      // L4 — the receipt itself. Never opened for the reader.
      '.pdxdos-fine{margin-top:0.35rem;border-top:1px solid rgba(255,255,255,0.06);}' +
      '.pdxdos-fine>summary{cursor:pointer;list-style:none;display:flex;align-items:center;min-height:2.2rem;' +
        'font-size:0.62rem;text-transform:uppercase;letter-spacing:0.06em;color:#7f97b8;}' +
      '.pdxdos-fine>summary::-webkit-details-marker{display:none;}' +
      '.pdxdos-fine-b{font-size:0.69rem;color:#9fb4d4;line-height:1.5;padding-bottom:0.4rem;}' +
      '.pdxdos-fine-b p{margin:0 0 0.35rem;}' +
      // Step to the next issue WITHOUT leaving the dossier — the reason a reader
      // opened one issue is usually that they want to check a second.
      '.pdxdos-step{display:flex;gap:0.4rem;margin-top:0.85rem;}' +
      '.pdxdos-stepb{flex:1 1 0;display:inline-flex;align-items:center;justify-content:center;gap:0.3rem;' +
        'min-height:2.4rem;cursor:pointer;font-family:"Barlow Condensed",sans-serif;font-size:0.76rem;' +
        'line-height:1.2;color:#dbe6f7;background:rgba(30,58,138,0.16);' +
        'border:1px solid rgba(127,180,255,0.24);border-radius:0.55rem;padding:0.4rem 0.5rem;}' +
      '.pdxdos-stepb:hover,.pdxdos-stepb:focus-visible{background:rgba(30,58,138,0.32);}' +
      '.pdxdos-stepn{font-size:0.62rem;color:#8fa2c0;text-transform:uppercase;letter-spacing:0.05em;}' +
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
      '.pdxor-rawlink{display:inline-block;margin-top:0.7rem;font-size:0.68rem;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:#7fb4ff;cursor:pointer;background:none;border:none;padding:0;}' +
      // ── 🧭 Stances & Connections ──────────────────────────────────────────
      // The "what they stand for" layer. Deliberately lighter chrome than the
      // Official Record: this is a map, not a verdict engine, and the verdict it
      // shows is read off the same row model rather than computed here.
      '.pdxst-head{display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.2rem;}' +
      '.pdxst-title{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:0.95rem;letter-spacing:0.04em;text-transform:uppercase;color:#e8eefc;}' +
      '.pdxst-q{font-size:0.74rem;color:#93a9c8;font-style:italic;margin-bottom:0.5rem;}' +
      '.pdxst-grp{margin-bottom:0.6rem;}' +
      '.pdxst-grp-h{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.68rem;letter-spacing:0.06em;text-transform:uppercase;color:#7f97b8;padding-bottom:0.18rem;border-bottom:1px solid rgba(159,180,212,0.14);margin-bottom:0.3rem;}' +
      '.pdxst-row{padding:0.45rem 0;border-bottom:1px solid rgba(159,180,212,0.07);}' +
      '.pdxst-row-top{display:flex;align-items:center;gap:0.35rem;flex-wrap:wrap;}' +
      '.pdxst-lbl{font-weight:700;font-size:0.82rem;color:#dbe6f5;}' +
      // The issue name IS the way in. It was a label; it is now the row's primary
      // tap, and it has to look like one without growing the row — so it keeps the
      // label's own type and colour and adds a single chevron.
      '.pdxst-open{display:inline-flex;align-items:center;gap:0.3rem;font-family:inherit;text-align:left;' +
        'background:none;border:none;padding:0;margin:0;cursor:pointer;}' +
      '.pdxst-open:hover,.pdxst-open:focus-visible{color:#9fdbff;}' +
      '.pdxst-lbl-go{color:#7fb4ff;font-size:0.86rem;line-height:1;}' +
      '.pdxst-txt{font-size:0.74rem;line-height:1.4;color:#9fb4d4;margin-top:0.15rem;}' +
      '.pdxst-links{display:flex;gap:0.3rem;flex-wrap:wrap;margin-top:0.28rem;}' +
      '.pdxst-go{cursor:pointer;font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.6rem;letter-spacing:0.05em;text-transform:uppercase;color:#9fdbd0;background:rgba(159,219,208,0.08);border:1px solid rgba(159,219,208,0.26);border-radius:999px;padding:0.26rem 0.6rem;min-height:1.9rem;}' +
      '.pdxst-go:hover,.pdxst-go:focus-visible{background:rgba(159,219,208,0.18);}' +
      '.pdxst-ev{font-size:0.64rem;color:#6f88ab;}' +
      // ── THE RESULT LINE ────────────────────────────────────────────────────
      // The row used to end its top line at a pastel verdict chip and a receipt
      // count, which is a label, not a finding: a reader scanning six rows could
      // tell that one said "Mixed record" and not what mixed MEANT or how much was
      // behind it. This line is the answer, and it is deliberately louder than the
      // chip it replaces — the number and the outcome word sit on their own line,
      // in the verdict's own colour, above the evidence that produced them.
      '.pdxst-result{display:flex;align-items:baseline;gap:0.3rem;flex-wrap:wrap;margin-top:0.22rem;}' +
      '.pdxst-metric{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.6rem;letter-spacing:0.06em;text-transform:uppercase;color:#7f97b8;}' +
      // THE SCOPE TAG IS NOT DECORATION. A percentage on a profile means the
      // profile's score unless something on the same line says otherwise, and this
      // number is one issue's. The tag says so in two words, next to every one of
      // them, so a row can never be mistaken for a second headline.
      '.pdxst-scope{font-size:0.55rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#8fa6c6;background:rgba(159,180,212,0.12);border-radius:999px;padding:0.06rem 0.34rem;}' +
      // Sized well below the hero ring on purpose — big enough to scan, small
      // enough that it never competes with the one profile score.
      '.pdxst-pct{font-family:"Bebas Neue",sans-serif;font-size:1.05rem;line-height:0.95;}' +
      '.pdxst-pct-na{font-family:"Bebas Neue",sans-serif;font-size:0.95rem;line-height:0.95;color:#7e93b3;}' +
      '.pdxst-vd{font-weight:800;font-size:0.72rem;letter-spacing:0.01em;}' +
      '.pdxst-vd-none{font-weight:700;font-size:0.68rem;color:#8fa6c6;}' +
      '.pdxst-why{font-size:0.64rem;color:#7e93b3;}' +
      // The reason line's own door, drawn only where the row holds instruments to
      // show. Inline with the sentence rather than under it: it is the end of that
      // sentence ("…see the votes →"), not a second control, and a row already
      // carrying a verdict, a tally and a link strip cannot afford another button
      // shape. Same restraint as .pdxst-pub-go — no border, no fill, no verdict
      // colour — because this is a route to evidence, not a result.
      '.pdxst-why-go{cursor:pointer;font-family:inherit;font-size:0.64rem;font-weight:700;color:#9fdbd0;' +
        'background:none;border:0;padding:0.1rem 0.2rem;min-height:1.5rem;text-align:left;}' +
      '.pdxst-why-go:hover,.pdxst-why-go:focus-visible{color:#bdeae1;text-decoration:underline;}' +
      '.pdxst-why-go .pdxst-lbl-go{margin-left:0.2rem;}' +
      // Composition: what "mixed" actually meant, in counts, under the row that
      // said it. Never rendered on a row with nothing to break down.
      '.pdxst-comp{display:flex;align-items:center;gap:0.3rem;flex-wrap:wrap;font-size:0.64rem;color:#8fa6c6;margin-top:0.16rem;}' +
      '.pdxst-comp b{font-weight:800;}' +
      '.pdxst-comp-for{color:#6ee7a0;}' +
      '.pdxst-comp-against{color:#f89b9b;}' +
      '.pdxst-comp-x{color:#f5c842;}' +
      // ── THE PUBLIC LANE, BESIDE THE FORMAL ONE AND NOT DRESSED AS IT ──────────
      // Related, distinct, and cheap to skip. The formal result line owns the
      // verdict colour, the percentage type and the pill-shaped scope tag; this line
      // gets none of the three. What it gets instead is a dotted left rule and a
      // single muted weight, so a reader scanning a column can tell at a glance that
      // it is the same row's second lane rather than a second grade. A coloured chip
      // here would out-shout the number above it within one screen.
      '.pdxst-lane{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:0.58rem;letter-spacing:0.08em;text-transform:uppercase;color:#8fa6c6;min-width:2.6rem;}' +
      '.pdxst-pub{display:flex;align-items:baseline;gap:0.3rem;flex-wrap:wrap;margin-top:0.18rem;' +
        'padding-left:0.4rem;border-left:2px dotted rgba(159,180,212,0.34);font-size:0.66rem;color:#9fb4d4;}' +
      '.pdxst-pub-k{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:0.58rem;letter-spacing:0.08em;text-transform:uppercase;color:#8fa6c6;min-width:2.6rem;}' +
      '.pdxst-pub-t{font-weight:700;color:#c3d3ea;}' +
      '.pdxst-pub-0 .pdxst-pub-t{font-weight:600;color:#7e93b3;font-style:italic;}' +
      // The standing disclosure, on every row. Small, unmissable, and never coloured
      // like a verdict — it is a boundary, not a finding.
      '.pdxst-pub-tag{font-size:0.55rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#8fa6c6;' +
        'border:1px dashed rgba(159,180,212,0.34);border-radius:0.3rem;padding:0.04rem 0.3rem;}' +
      '.pdxst-pub-go{cursor:pointer;font-family:inherit;font-size:0.62rem;font-weight:700;color:#9fdbd0;' +
        'background:none;border:0;padding:0.12rem 0.1rem;min-height:1.6rem;text-align:left;}' +
      '.pdxst-pub-go:hover,.pdxst-pub-go:focus-visible{color:#bdeae1;text-decoration:underline;}' +
      // The whole sentence, once per section, with the lane's own coverage count.
      '.pdxst-wall{font-size:0.64rem;line-height:1.45;color:#8fa6c6;margin:0.1rem 0 0.5rem;' +
        'padding:0.32rem 0.45rem;border-left:2px dotted rgba(159,180,212,0.34);background:rgba(159,180,212,0.05);border-radius:0 0.3rem 0.3rem 0;}' +
      '.pdxst-wall b{color:#c3d3ea;}' +
      // ── THE LANE-DISAGREEMENT LINE, ON A STANCE ROW ──────────────────────────
      // Sits under the 🧾 tally, inside the same dotted rule, because it is a note
      // ABOUT the two lanes above it, not one more lane. No verdict colour and
      // no fill: a coloured band here would read as a finding, and this is a
      // reading aid. The chip is the shape in four words; the button is the door.
      '.pdxst-lanes{display:flex;align-items:baseline;gap:0.35rem;flex-wrap:wrap;margin-top:0.14rem;' +
        'padding-left:0.4rem;border-left:2px dotted rgba(159,180,212,0.34);font-size:0.63rem;color:#8fa6c6;}' +
      '.pdxst-lanes-c{font-weight:700;color:#9fb4d4;}' +
      '.pdxst-lanes-go{cursor:pointer;font-family:inherit;font-size:0.62rem;font-weight:700;color:#9fdbd0;' +
        'background:none;border:0;padding:0.12rem 0.1rem;min-height:1.6rem;text-align:left;}' +
      '.pdxst-lanes-go:hover,.pdxst-lanes-go:focus-visible{color:#bdeae1;text-decoration:underline;}' +
      // ── THE SAME THING IN FULL, UNDER THE TWO COLUMNS OF THE DOSSIER ─────────
      // Full width and neutral. It deliberately borrows neither column's chrome —
      // it belongs to both of them, and matching either would read as that lane
      // explaining itself rather than the boundary being stated once.
      '.pdxlane{margin:0.15rem 0 0.55rem;padding:0.55rem 0.65rem;border-radius:0.5rem;' +
        'background:rgba(147,166,196,0.07);border:1px solid rgba(147,166,196,0.18);}' +
      '.pdxlane-h{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:0.72rem;' +
        'letter-spacing:0.05em;text-transform:uppercase;color:#c3d3ea;margin-bottom:0.24rem;}' +
      '.pdxlane-lead{font-size:0.7rem;line-height:1.5;color:#cbd8ee;}' +
      '.pdxlane-ws{display:grid;gap:0.3rem;margin:0.45rem 0 0.4rem;}' +
      '.pdxlane-w{display:grid;gap:0.08rem;padding-left:0.42rem;border-left:2px solid rgba(159,180,212,0.28);}' +
      '.pdxlane-w-k{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:0.6rem;' +
        'letter-spacing:0.07em;text-transform:uppercase;color:#8fa6c6;}' +
      '.pdxlane-w-v{font-size:0.66rem;line-height:1.45;color:#9fb4d4;}' +
      // The boundary sentence closes the band and is the one line that must survive
      // a reader skimming the rest of it, so it keeps its own rule above.
      '.pdxlane-foot{font-size:0.64rem;line-height:1.45;color:#8fa2c0;padding-top:0.36rem;' +
        'border-top:1px dashed rgba(147,166,196,0.22);}' +
      '@media (min-width:620px){.pdxlane-ws{grid-template-columns:1fr 1fr;gap:0.55rem;}}' +
      // The sub-divider inside the "record backs it up" group: the rows the engine
      // could not judge sit in the same tier as the ones it could, and a thin row
      // under a "backs it up" heading is a claim nobody made.
      '.pdxst-sub{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.62rem;letter-spacing:0.05em;text-transform:uppercase;color:#7e93b3;margin:0.35rem 0 0.1rem;}' +
      // The way back. A jump out of a stance row used to be one-way: the reader
      // landed in the Official Record and had to scroll back up past everything.
      '.pdxst-back{position:fixed;left:50%;transform:translateX(-50%);bottom:1.1rem;z-index:12050;cursor:pointer;' +
        'font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.68rem;letter-spacing:0.05em;text-transform:uppercase;' +
        'color:#0b1020;background:#9fdbd0;border:none;border-radius:999px;padding:0.5rem 0.9rem;min-height:2.2rem;box-shadow:0 6px 18px rgba(0,0,0,0.45);}' +
      '.pdxst-back:hover,.pdxst-back:focus-visible{background:#bdeae1;}' +
      '.pdxst-focus{border-radius:0.5rem;box-shadow:0 0 0 2px rgba(159,219,208,0.6);background:rgba(159,219,208,0.07);}' +
      // ── Core National Issue colours (issue-colors.js) ────────────────────────
      // Every row in this file that names an issue carries `--pdx-ic*` inline via
      // _icSkin(), and gets `.pdxc-ic` when the key resolved to a real core issue.
      // This section is the only place those properties are consumed, so the rules
      // stay free of any per-issue colour: the row supplies the hue, the CSS
      // supplies the treatment.
      //
      // The Official Record used to have none of this. It is the section that
      // prints one row per issue, one after another, for a dozen issues — the
      // single surface where "which issue am I looking at" is hardest and colour
      // helps most — and it was the only issue surface in the app still rendering
      // every row in the same grey. The spine is the issue and nothing else: a
      // verdict has its own chip on the same row, in its own palette, and letting
      // the two share an edge would collapse two vocabularies into one.
      '.pdxor-issue.pdxc-ic{border-left:4px solid var(--pdx-ic);border-top-left-radius:0;border-bottom-left-radius:0;' +
        'background:linear-gradient(90deg,var(--pdx-ic-wash,transparent),transparent 62%),rgba(10,15,30,0.35);}' +
      '.pdxor-row.pdxc-ic[open]{background:linear-gradient(90deg,var(--pdx-ic-wash,transparent),transparent 62%),rgba(10,15,30,0.5);}' +
      // The Say-vs-Do feed's gold accent bar was doing the job an issue colour does
      // better. It keeps its gold title and its own section furniture; the row edge
      // now says which issue the row is about, exactly as it does one section up.
      '.pdxsd .pdxor-issue.pdxc-ic{border-left:4px solid var(--pdx-ic);}' +
      // Awaiting rows are deliberately quieter than scored ones — they keep the
      // colour so the issue is still identifiable, over their own lighter fill.
      '.pdxor-issue-await.pdxc-ic{background:linear-gradient(90deg,var(--pdx-ic-wash,transparent),transparent 62%),rgba(10,15,30,0.25);}' +
      // The same colour said once more where the eye lands — on the issue name.
      '.pdxc-icdot{display:inline-block;width:0.44rem;height:0.44rem;border-radius:999px;margin-right:0.34rem;' +
        'vertical-align:0.06em;background:var(--pdx-ic,#9fb4d4);box-shadow:0 0 0 2px var(--pdx-ic-soft,transparent);}' +
      // Stances & Connections rows and the divergence rows are flat lists and
      // cards respectively, so they take a lighter version of the same treatment.
      // The divergence card keeps its own fill under the wash — the wash is a
      // layer on top of the card, not a replacement for it.
      '.pdxst-row.pdxc-ic{border-left:3px solid var(--pdx-ic);padding-left:0.5rem;' +
        'background:linear-gradient(90deg,var(--pdx-ic-wash,transparent),transparent 55%);}' +
      '.pdxdv-row.pdxc-ic{border-left:3px solid var(--pdx-ic);border-top-left-radius:0;border-bottom-left-radius:0;' +
        'background:linear-gradient(90deg,var(--pdx-ic-wash,transparent),transparent 55%),rgba(10,15,30,0.35);}' +
      '.pdxdv-row-tap.pdxc-ic:hover{border-color:rgba(255,255,255,0.22);border-left-color:var(--pdx-ic);' +
        'background:linear-gradient(90deg,var(--pdx-ic-wash,transparent),transparent 55%),rgba(10,15,30,0.55);}' +
      '@media (max-width:480px){' +
        '.pdxor-issue.pdxc-ic{border-left-width:4px;}' +
        '.pdxst-row.pdxc-ic,.pdxdv-row.pdxc-ic{padding-left:0.45rem;}' +
        // MOBILE: the result must survive the narrow column. The metric caption and
        // its scope tag are allowed to wrap onto their own line, but the number and
        // the outcome word stay together — those two are the answer, and splitting
        // them across a wrap is what turns a result back into a label.
        '.pdxst-result{gap:0.24rem 0.3rem;}' +
        '.pdxst-pct{font-size:1.15rem;}' +
        '.pdxst-vd{font-size:0.74rem;}' +
        // Every jump is a thumb target, not a hover target.
        '.pdxst-go{min-height:2.3rem;padding:0.4rem 0.7rem;font-size:0.62rem;}' +
        '.pdxst-links{gap:0.34rem;}' +
        // MOBILE: the public line stays ONE extra line, not four. The tally and the
        // disclosure tag sit together on the first wrap and the tap drops below them
        // at thumb height — the alternative was a fixed two-column key/value layout
        // that turned every row into a small table.
        '.pdxst-pub{gap:0.18rem 0.3rem;}' +
        '.pdxst-pub-k{min-width:0;}' +
        '.pdxst-pub-go{min-height:2.2rem;padding:0.3rem 0.1rem;font-size:0.66rem;}' +
        '.pdxst-back{bottom:0.8rem;min-height:2.4rem;}' +
        // THE DOSSIER ON A PHONE. Every level's control is a thumb target, the
        // key/value summary stacks rather than squeezing the value into a column
        // two words wide, and the issue stepper wraps instead of scrolling.
        '.pdxst-open{min-height:2.2rem;}' +
        '.pdxdos{padding:0.5rem 0.55rem 0.55rem;}' +
        '.pdxdos-line{flex-direction:column;gap:0.1rem;}' +
        '.pdxdos-k{min-width:0;}' +
        '.pdxdos-recs>summary,.pdxdos-rec>summary,.pdxdos-fine>summary{min-height:2.6rem;}' +
        '.pdxdos-rec-why{margin-top:0.1rem;}' +
        '.pdxdos-step{flex-wrap:wrap;}' +
        '.pdxdos-stepb{flex:1 1 9rem;min-height:2.6rem;}' +
      '}';
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
      // The return pill is the one thing here that lives OUTSIDE the profile it
      // belongs to (it is fixed to the viewport), so it is also the one thing that
      // can outlive it. Any click is a cheap moment to notice that the row it points
      // back to is gone — the modal closed, or a different profile was opened — and
      // take it down before it becomes a button to nowhere.
      _stBackSweep();
      // ── L3, mounted on demand ─────────────────────────────────────────────
      // Deliberately no preventDefault and no return: the <details> keeps its own
      // native toggle, and every branch below still gets the click. All this does is
      // fill the body the first time it is asked for, which is why L3 and L4 cost
      // nothing on a dossier whose rows are never opened.
      var dos = e.target.closest && e.target.closest('[data-pdxdos-i]');
      if (dos) _dosMount(dos);
      // ── Follow one document across every issue it decided ─────────────────
      // Sits directly after the mount above, because the trail it scrolls to is
      // part of L3 and L3 may not exist yet when the caveat is clicked. This branch
      // DOES consume the default: the control lives inside a <summary>, so leaving
      // the native toggle alone would collapse the row we just opened.
      var ins = e.target.closest && e.target.closest('[data-pdxins-open]');
      if (ins) {
        e.preventDefault();
        _insOpen(ins);
        return;
      }
      // The stance row's primary tap: the issue name opens that issue's dossier and
      // remembers the row it came from, so closing puts the reader back where they
      // were reading rather than at the top of the section.
      //   The default is consumed only if a sheet actually went up — see the note on
      // openGap(). Consuming it first and finding out afterwards is how a row that
      // looks like a control becomes a row that eats taps in silence.
      //   data-pdxst-focus is what makes the public tally a way in rather than a
      // dead-end summary. The row's name opens the dossier at the top as it always
      // has; the 🧾 control on the public line opens the same dossier and asks it to
      // land on the public column. Same sheet, same data, one attribute of
      // difference — which is the whole reason the tally does not need its own
      // expander.
      var sdos = e.target.closest && e.target.closest('[data-pdxst-dos]');
      if (sdos) {
        if (openGap(sdos.getAttribute('data-pdxst-pid') || '', sdos.getAttribute('data-pdxst-dos') || '',
              { arrival: false, origin: sdos.getAttribute('data-pdxst-origin') || '',
                focus: sdos.getAttribute('data-pdxst-focus') || '' }) !== false) {
          e.preventDefault();
        }
        return;
      }
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
      // The shared route into the dossier. Every entry surface that is not a stance row
      // or an index row arrives here — the Official Record row's door, a divergence row,
      // and the sheet's own sideways steps.
      //   ORIGIN IS OPTIONAL, AND THAT IS DELIBERATE. A door supplies the id of the row
      // it was drawn on, so closing the sheet returns the reader to it. The in-sheet
      // steppers supply none, and passing no options at all is not the same as passing
      // `{arrival:false}`: it leaves _gapIsArrival() free to read the hash, so a reader
      // who landed on a shared #record= link keeps the arrival presentation when they
      // step sideways instead of being dropped into the profile-reader layout.
      var gap = e.target.closest && e.target.closest('[data-pdxc-gap]');
      if (gap) {
        var gorg = gap.getAttribute('data-pdxc-gap-origin') || '';
        if (openGap(gap.getAttribute('data-pdxc-gap-pid') || '', gap.getAttribute('data-pdxc-gap') || '',
              gorg ? { arrival: false, origin: gorg } : undefined) !== false) {
          e.preventDefault();
        }
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
      // Stance-row jumps. Resolved at click time rather than baked into an href,
      // because the row this points at may live inside a fold that has not been
      // mounted yet — the exact target only exists once the destination section has
      // been revealed, and _stNav() falls back to the section when it does not.
      var sgo = e.target.closest && e.target.closest('[data-pdxst-go]');
      if (sgo) {
        e.preventDefault();
        // A jump fired from INSIDE the dossier has to take the modal down with it —
        // a sheet left sitting over the section it just scrolled to looks like the
        // tap did nothing. The return-to-row trip is dropped on the way out: this
        // reader asked for the score section, not for the row they arrived from.
        if (sgo.closest && sgo.closest('#pdxc-gap-back')) { _gapOpen = null; closeGap(); }
        _stNav(sgo.getAttribute('data-pdxst-go') || '',
               sgo.getAttribute('data-pdxst-target') || '',
               sgo.getAttribute('data-pdxst-pid') || '',
               sgo.getAttribute('data-pdxst-key') || '');
        return;
      }
      var sback = e.target.closest && e.target.closest('[data-pdxst-back]');
      if (sback) { e.preventDefault(); _stBack(sback.getAttribute('data-pdxst-back') || ''); return; }
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
      // …and the stance rows. This was the gap that made the whole section unable to
      // keep its promise on a congressional profile: a member's votes arrive
      // asynchronously, every row is built at mount time, and nothing ever repainted
      // them — so "⏳ Loading the record…" was not a transient state, it was the
      // permanent answer to "what did the record conclude?". The rows now resolve
      // with everything else on the profile.
      var sts = document.querySelectorAll('[data-pdxc-stances-pid]');
      for (var s = 0; s < sts.length; s++) {
        if (sts[s].getAttribute('data-pdxc-stances-pid') !== String(pid)) continue;
        var stOpen = _lidsOpenIn(sts[s]);
        sts[s].innerHTML = _lidify(_stInner(pid));
        _lidsReopen(stOpen);
      }
      // The repaint above is the moment the vote record actually exists, so it is
      // also the moment a vote-derived share card can first be built. Re-run the
      // reveal pass over the freshly painted rows.
      _rcHydrateSoon();
      _saHydrateSoon();
      // ── THE OPEN DOSSIER ──────────────────────────────────────────────────
      // A member's votes arrive AFTER the profile does, and a reader can open a
      // stance row's dossier inside that window — on a president they never can,
      // which is exactly why this path is easy to forget. The sheet paints its
      // honest "⏳ Loading the record…" state, and this is where that state is
      // redeemed. Only the sheet currently showing THIS member is repainted, and
      // only when it is actually on screen; the whole block is guarded because an
      // environment without a live DOM must not turn a warm event into an error.
      try {
        var gb = document.getElementById && document.getElementById('pdxc-gap-back');
        if (_gapOpen && String(_gapOpen.pid) === String(pid) && gb && !gb.hidden) {
          var gbody = gb.querySelector && gb.querySelector('.pdxgap-body');
          if (gbody) gbody.innerHTML = _gapViewHtml(_gapOpen.pid, _gapOpen.key);
        }
      } catch (eDos) {}
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

  // Core National Issue colour for a row, from the one module that owns colour.
  // Returns the inline custom properties to hang on the element, plus the class
  // that turns the treatment on — and `on:false` with an EMPTY class when the key
  // does not resolve to a core issue. That distinction is the whole point: an
  // unresolved key must render as the plain grey row it always was, never as a
  // borrowed colour from some other vocabulary, because a spine the reader can't
  // trust to mean one thing is worse than no spine at all.
  function _icSkin(key) {
    var IC = window.PDXIssueColors;
    if (!IC || typeof IC.styleFor !== 'function' || !key) return { style: '', cls: '', on: false };
    var on = false;
    try {
      on = (typeof IC.isCore === 'function') ? IC.isCore(key) : !!IC.getIssueColor(key).mapped;
    } catch (e) { on = false; }
    return { style: IC.styleFor(key), cls: on ? ' pdxc-ic' : '', on: on };
  }
  // The dot repeats the row's colour next to the issue name, where the eye
  // actually lands. Only ever emitted when the colour is real.
  function _icDot(skin) { return skin && skin.on ? '<span class="pdxc-icdot" aria-hidden="true"></span>' : ''; }

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

  // ── WHICH RECORD LANES THIS PERSON HAS ──────────────────────────────────────
  // The Official Record is ONE gateway, and it is office-aware. There are two kinds
  // of formal record a figure can have:
  //   exec — laws signed or vetoed, executive orders, formal directives
  //   vote — roll-call votes and formal legislative actions
  // Most people have exactly one. Someone who has served in both kinds of office —
  // a senator who became president, a governor who went to Congress — has both, and
  // both belong under this one section rather than in two rival products. The lanes
  // are DERIVED, never declared per-profile: the executive lane comes from the office
  // gate, the legislative lane from whether a roll-call record actually exists. A
  // member of Congress therefore picks up no executive chrome, which is the point.
  function recordLanes(pid, scored) {
    var exec = false, vote = false;
    try { exec = !!execEligible(pid); } catch (e) {}
    for (var i = 0; i < (scored || []).length; i++) {
      var ln = scored[i] && scored[i].ov && scored[i].ov.lane;
      if (ln === 'exec') exec = true; else if (ln) vote = true;
    }
    try {
      var recs = (window.PDXVotingRecord && typeof window.PDXVotingRecord.memberRecords === 'function')
        ? window.PDXVotingRecord.memberRecords(pid) : null;
      // Having rows in the voting-record store is NOT the same as having a
      // legislative record. netlify/functions/voting-record.mts serves a president's
      // vr_positions rows — signed laws, vetoes, orders — through the same endpoint
      // as roll calls, so the store fills up for an office that casts no votes.
      // Counting those toward the 🏛️ lane put a "Roll-call votes · Recorded votes"
      // legend on a president's Official Record the moment their record warmed.
      if (recs && recs.length && _anyBallot(recs)) vote = true;
    } catch (e) {}
    // Neither lane has produced anything yet: fall back to the office gate so an
    // empty section still speaks the right language instead of asking a president
    // about votes.
    if (!exec && !vote) { if (execEligible(pid)) exec = true; else vote = true; }
    var keys = [];
    if (exec) keys.push('exec');
    if (vote) keys.push('vote');
    return { exec: exec, vote: vote, both: exec && vote, keys: keys };
  }
  // THE LANE STRIP IS GONE FROM THE HEADER. It printed a titled box with one row
  // per lane and a footer, only for the handful of figures who have served in both
  // kinds of office — and it printed it above the first issue row, where it was the
  // third of six stacked blocks a reader had to cross to reach the record.
  //
  // Nothing it asserted was lost. The rule a reader cannot infer from the rows
  // themselves — there are two records here and they are never pooled — is now a
  // clause in the header digest, printed on exactly the same condition (lanes.both).
  // The per-lane descriptions moved into the 'voting-record' How-to-read sheet,
  // which this header already links, under "Two kinds of formal record". Every issue
  // row still names its own lane, which is what made the strip redundant prose
  // rather than load-bearing markup.
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
  // is the piece that decides how a Yea should be read.
  //
  // `act` is the one printable phrase for what the figure DID, and it is lane-aware
  // because the wire format is not. A roll call carries a ballot in `position`
  // ('yea'), and a president's formal action carries its actionType in the SAME field
  // ('signed_law') — netlify/functions/voting-record.mts sends both that way so the
  // two lanes share one item shape. Every proof line here used to print that field as
  // 'Voted ' + it, which on a president's Official Record rendered "Voted Signed Law":
  // vote vocabulary on an office that casts no votes, over a document nobody voted on.
  // A ballot gets the congressional verb; an executive action gets exec-record.js's
  // own words for its class, which is the only place those verbs are written down.
  //   The `kind` field is not trusted to make that call on its own. It was, and the
  // result was "H.R. 1 · Signed · Voted Signed" on the president's card: one row
  // whose kind did not survive the trip still went through the congressional
  // formatter, and a single mislabelled item is all it takes. The test is now the
  // BALLOT itself — "Voted X" is printed only when X is something a member can
  // actually vote, and anything else is an action phrase no matter what kind says.
  var _BALLOTS = {
    yea: 1, nay: 1, aye: 1, no: 1, yes: 1, present: 1,
    not_voting: 1, notvoting: 1, 'not voting': 1, abstain: 1, absent: 1, excused: 1
  };
  // Executive slugs as the record actually spells them. exec-record.js keys its
  // verbs on the long form ('signed_law'); vr_positions stores the short one
  // ('signed'), so without this bridge a signed law printed as the bare word
  // "Signed" — true, but not what the document says it is.
  var _EXEC_SLUGS = {
    signed: 'signed_law', signed_into_law: 'signed_law', sign: 'signed_law',
    vetoed: 'vetoed_law', veto: 'vetoed_law',
    eo: 'executive_order', order: 'executive_order', executive_order: 'executive_order',
    directive: 'directive', memorandum: 'directive', proclamation: 'directive'
  };
  function _execVerb(key) {
    var k = String(key || '').toLowerCase();
    var cls = null;
    try {
      var xr = window.PDXExecRecord;
      if (xr && xr.CLASSES) cls = xr.CLASSES[k] || xr.CLASSES[_EXEC_SLUGS[k] || ''] || null;
    } catch (e) { cls = null; }
    return (cls && cls.verb) ? cls.verb : '';
  }
  function _orActionPhrase(item) {
    if (!item) return '';
    // `action` last: hydrateIssueRecords copies the actionType into all three, but a
    // curated position may only carry `action` ("cosponsored"), and that slug is the
    // only thing the row has to say about what was actually done.
    var key = String(item.actionType || item.position || item.action || '');
    if (!key) return '';
    var lower = key.toLowerCase();
    if (item.kind !== 'position' && _BALLOTS[lower] === 1) return 'Voted ' + _tc(key);
    // Not a ballot → an action, whatever the wire called it. Known class → its own
    // verb; unknown → the slug, title-cased and unprefixed. Still never a vote.
    return _execVerb(lower) || _tc(key);
  }
  function _orProofBits(item) {
    if (!item) return null;
    var src = item.source;
    var url = item.sourceUrl || (src && typeof src === 'object' ? src.url : '') || '';
    var lbl = item.sourceLabel || (src && typeof src === 'object' ? src.label : '') ||
      (typeof src === 'string' ? src : '') || 'Congress.gov';
    var isPosition = item.kind === 'position';
    // Is this a ballot at all? Same test the action phrase uses, so the two halves
    // of one proof line cannot disagree about which lane the item is on.
    var isBallot = !isPosition && _BALLOTS[String(item.position || '').toLowerCase()] === 1;
    return {
      bill: item.number ? String(item.number) : '',
      title: item.title ? String(item.title) : '',
      // An action's `action` IS its actionType, so printing it here as well as in
      // `act` produced "Signed Law · Signed into law" on every executive proof line.
      // The question is a roll-call question and prints only for a roll call.
      question: (isBallot && item.action) ? String(item.action) : '',
      act: _orActionPhrase(item),
      isPosition: !isBallot,
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
  // "H.R. 22 · On Motion to Recommit · Voted Yea" for a member; "H.R. 1 · Signed into
  // law" for a president. Falls back to the measure title when a record carries no
  // number, so a row never prints an empty proof. Pure, no HTML.
  function _orProofText(item) {
    var b = _orProofBits(item);
    if (!b) return '';
    var parts = [];
    if (b.bill) parts.push(b.bill);
    else if (b.title) parts.push(b.title);
    if (b.question) parts.push(b.question);
    if (b.act) parts.push(b.act);
    return parts.join(' · ');
  }
  // The multi-issue disclosure, compressed to row scale: "Yea counted for Lower
  // Taxes / against Health Care". Reads the same _measureOmnibusContext primitive the
  // longer prose note uses, so a single roll call landing opposite ways on two issues
  // is stated the same wherever it appears. '' for single-issue votes.
  //
  // The noun follows the lane. An omnibus law a president signed lands on as many
  // issues as one a member voted on, and this line is exactly where that shows up on
  // a presidential profile — so it says "Signed into law counted for … / against …",
  // not "Signed Law counted", and its empty case counts actions rather than votes.
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
    var isPosition = item.kind === 'position';
    var parts = [];
    if (adv.length) parts.push('for ' + names(adv));
    if (opp.length) parts.push('against ' + names(opp));
    if (!parts.length) {
      return 'One ' + (isPosition ? 'action' : 'vote') + ', ' + ctx.count +
        ' issues — no clear position on any of them.';
    }
    var phrase = _orActionPhrase(item);
    var lead = phrase ? phrase + ' counted' : (isPosition ? 'This action counted' : 'This vote counted');
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
    // ── WHAT THIS DEDUPE IS FOR, AND WHAT IT MUST NOT DO ──────────────────────
    // It exists for exactly one collision: the summary's two representative votes
    // (topContradiction, topConsistent) are also members of the full item list, so
    // pushing both sources without a key would list the decisive vote twice.
    //
    // THE BUG. The key was five identifier fields — rollcallId, measureId, number,
    // date, action — and every one of them is OPTIONAL. A record that arrives with
    // blank ids (a `position`-kind formal action, a migrated vote that never carried
    // a roll-call number) keys to '||||' plus its date and action, and so does every
    // one of its siblings. Six distinct divisions voted the same day on the same
    // measure collapsed to ONE listed row while the engine summary went on counting
    // six. The face then printed the count-vs-list mismatch this pass exists to
    // remove — "6 judged votes … 1 of them are listed below; the other 5 arrive with
    // this member's full roll-call record" — which is not merely a wrong number, it
    // is a wrong PROMISE: those five were never going to arrive, they were already
    // loaded and had just been thrown away here.
    //
    // So identity comes first (the two summary picks are literally the same objects
    // as their entries in the item list, so a reference check catches the real
    // collision exactly), and the field key is now a fallback that also carries the
    // two fields which distinguish sibling records — the title and the ballot cast.
    // Losing a row is a far worse failure than listing a true duplicate: an
    // over-eager key hides evidence, a lax one shows the same receipt twice.
    var key = function (it) {
      return [
        it.rollcallId || '', it.measureId || '', it.number || '', it.date || '',
        it.action || '', it.title || it.shortTitle || '', it.position || ''
      ].join('|');
    };
    var pushed = [];
    var push = function (item, verdict) {
      if (!item || (limit && picks.length >= limit)) return;
      if (pushed.indexOf(item) >= 0) return;
      var k = key(item);
      if (seen[k]) return;
      seen[k] = 1;
      pushed.push(item);
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
      // Bolded as the payload of the line either way — the ballot on a roll call,
      // the enactment verb on an executive action. Never 'Voted' + an action type.
      if (b.act) restBits.push(b.isPosition ? '<b>' + esc(b.act) + '</b>' : 'Voted <b>' + esc(b.act.replace(/^Voted /, '')) + '</b>');
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
      try { xPool = execRecordsForMemo(pid, issueKey); } catch (e) { xPool = null; }
      if (xPool) {
        var stanceX = (ov.record && ov.record.stance) || positionStance(pid, issueKey) || null;
        xPool.items.forEach(function (it) {
          var clsD = (E0 && E0.CLASSES && E0.CLASSES[it.actionClass]) || null;
          var stD = (E0 && E0.STANDING && E0.STANDING[it.standing]) || null;
          var metaX = [clsD ? clsD.verb : '', stD ? stD.label : '', it.date || ''].filter(Boolean).join(' · ');
          lines.push(_orActLine(_orItemVerdict(it, issueKey, stanceX),
            it.documentId || it.title || 'Executive action',
            metaX, it.sourceUrl, it.sourceLabel, '', null,
            _orExecWhyHtml(it, issueKey)));
        });
        xPool.held.forEach(function (h) {
          lines.push(_orActLine('limited',
            h.documentId || h.title || 'Executive action',
            _EXEC_HELD_REASON[h.reason] || 'On file; not usable as evidence here',
            h.sourceUrl, h.sourceLabel, '', null,
            // The declared note, if the seed carries one — passed as pre-rendered
            // omniHtml rather than as an omniNote so it does not pick up the 🧩
            // multi-issue icon, which would claim something different.
            (h.plain ? '<span class="pdxor-why-act">' + esc(h.plain) + '</span>' : '') +
            (h.note ? '<span class="pdxor-omni">' + esc(h.note) + '</span>' : '')));
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
    // The countable noun follows the lane, same as everywhere else on this surface —
    // a president's overflow line offers more mapped ACTIONS, not more mapped votes.
    var _n = _orNoun(ov);
    if (picks.length > _OR_ROW_EVIDENCE_MAX) {
      var _over = picks.length - _OR_ROW_EVIDENCE_MAX;
      extra = '<div class="pdxor-act pdxor-act-more">' +
        esc('+ ' + _over + ' more mapped ' +
          (_over === 1 ? _n.one : _n.many) + ' — open the full record below.') + '</div>';
      picks = picks.slice(0, _OR_ROW_EVIDENCE_MAX);
    }
    picks.forEach(function (p) {
      var b = _orProofBits(p.item);
      var meta = [b.question, b.act, b.date].filter(Boolean).join(' · ');
      lines.push(_orActLine(p.verdict, b.bill || b.title || (b.isPosition ? 'Formal action' : 'Recorded vote'),
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
  // WHY THIS DOCUMENT BELONGS UNDER THIS ISSUE, in the one sentence the seed curates
  // per (action, issue) pair. Fails closed: no `plain` on the mapping → no sentence.
  // It never falls back to the mapping's `rationale`, which quotes the sections the
  // curation rests on and is a paragraph long — that text stays on the ledger card,
  // one tap down, where a reader who wants the receipt goes looking for it.
  //   The 🧩 multi-issue disclosure, when there is one, follows underneath: the plain
  // sentence explains THIS issue, and the disclosure says the same document also
  // reached others. Two different claims, so two different lines.
  function _orExecWhyHtml(item, issueKey) {
    var why = (item && item.plain) ? '<span class="pdxor-why-act">' + esc(item.plain) + '</span>' : '';
    var omni = _orExecOmniNote(item, issueKey);
    return why + (omni ? '<span class="pdxor-omni">🧩 ' + omni + '</span>' : '');
  }
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
  //
  // `opts` names the lane's nouns and nothing else. A president signs one law that
  // lands on nine issues exactly as one roll call on it does, so the ✒️ lane needs
  // this disclosure just as much — but "one vote" is a false sentence about a
  // signature. Omitted → the congressional wording, unchanged to the byte.
  function _orOmniBlockHtml(item, issueKey, opts) {
    if (!item || typeof window._measureOmnibusContext !== 'function') return '';
    var ctx;
    try {
      ctx = window._measureOmnibusContext(item, issueKey, {}, { labelFn: _issueLabel });
    } catch (e) { return ''; }
    if (!ctx) return ''; // single-issue vote — nothing to disclose
    var kind = (opts && opts.kind) || 'bill';
    var noun = (opts && opts.noun) || 'vote';
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
    // opts.trail — when the caller can afford the per-issue re-read (the dossier's
    // L3, which is already one instrument deep), the disclosure holds the full trail
    // instead of the label chips: same fold, same place, every issue now carrying its
    // own direction, verdict and reason. Callers that pass nothing are unchanged.
    var trail = (opts && opts.trail && opts.trail.html) ? opts.trail : null;
    var body = trail ? trail.html : (chips ? '<div class="pdxgap-om-chips">' + chips + '</div>' : '');
    var sumTxt = trail ? trail.summary
      : ('The other ' + ctx.others.length + ' issue' + (ctx.others.length === 1 ? '' : 's') +
         ' this one ' + noun + ' touched');
    var det = body
      ? '<details class="pdxgap-om-all" data-pdxins-det="' + (trail ? '1' : '0') + '">' +
          '<summary>' + esc(sumTxt) + '</summary>' + body + '</details>'
      : '';
    return '<div class="pdxgap-om">' +
      '<div class="pdxgap-om-h"><span aria-hidden="true">🧩</span> <span>Multi-issue ' + kind +
        ' — one ' + noun + ', ' + ctx.count + ' issues</span>' +
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
    // vr_* record summary: the strongest consistent / contradicting measure. Each
    // line discloses when it came from a multi-issue bill, so the reader can see that
    // the same roll call — or the same omnibus law — was also a verdict on other
    // issues. Titles and verbs both come from _orProofBits, so an executive action
    // reaching this list is named as one instead of as an unrecorded vote.
    if (ov && ov.record) {
      var issueKey = ov.record.issueKey;
      var mk = function (item, verdict) {
        if (!item) return;
        var b = _orProofBits(item);
        var url = b.url;
        var lbl = b.label || 'Congress.gov';
        var title = item.title || item.shortTitle || item.number || b.question ||
          (b.isPosition ? 'Formal action' : 'Recorded vote');
        var pos = b.act;
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

  // ── the public record, ON the row ───────────────────────────────────────────
  // 🧾 Say-vs-Do used to be a SECTION. It had its own head, its own coverage line and
  // its own per-issue verdict — for the same issues the 🏛️ Official Record had already
  // judged. Two verdict systems in one scroll, which is why yet another section (Record
  // vs. Public Picture) existed at all: its entire job was to referee the disagreement
  // between the other two. All of that is gone. The public record is an INPUT to this
  // row now: it always contributes receipts, and it contributes the VERDICT only where
  // no formal action was able to test the issue. One issue, one verdict, resolved in
  // exactly one place — so there is nothing left for a divergence panel to arbitrate.
  function _rowPublic(pid, issueKey) {
    var empty = { token: 'no_record', verdict: VERDICTS.no_record, score: null, count: 0,
                  supporting: 0, contradicting: 0, flags: 0, judged: false };
    try {
      var sd = saydoIssue(pid, issueKey);
      var cur = sd.curated || {};
      return {
        token: sd.token, verdict: sd.verdict, score: sd.score,
        count: cur.total || 0,
        supporting: cur.consistent || 0,
        contradicting: cur.contradicts || 0,
        flags: cur.flag || 0,
        // `flag` is deliberately NOT judgeable here. A red flag is heat, and heat is
        // Flashpoints' job — promoting it to this row's verdict would let a
        // controversy card and a consistency row grade the same issue differently.
        judged: (sd.token === 'consistent' || sd.token === 'contradicts' || sd.token === 'mixed')
      };
    } catch (e) { return empty; }
  }

  // How many judged items point each way on the ACTION lane, and which way.
  // judgedCountOf() answers "how many", which is enough for the shared gate but not
  // enough to resolve a one-item row — that needs the direction too.
  function _rowDirection(ov) {
    var r = ov && ov.record;
    if (r && ((r.consistent || 0) + (r.contradicts || 0)) > 0) {
      return { c: r.consistent || 0, x: r.contradicts || 0 };
    }
    var a = ov && ov.officialActions;
    if (a) return { c: a.consistent || 0, x: a.contradicts || 0 };
    return { c: 0, x: 0 };
  }

  function issueRow(pid, issueKey) {
    var ov = officialIssue(pid, issueKey);
    var stance = _rowStance(pid, issueKey);
    var pub = _rowPublic(pid, issueKey);
    var evCount = _rowEvidenceCount(ov);
    var tok = ov.token;
    // The ACTION side's own answer, kept under its original name so the Official
    // Record — which is the action lane and nothing else — keeps sorting and filtering
    // on exactly what it did before this merge.
    var actionJudged = (tok === 'consistent' || tok === 'contradicts' || tok === 'mixed' || tok === 'limited');
    var v = ov.verdict || VERDICTS.limited;
    var score = ov.score;
    // ONE verdict, resolved once. A formal action is the test wherever a formal action
    // can be the test. `limited` is the engine saying it could not be — a stance with
    // too little record behind it — and that is the only opening the public record
    // gets. It is never blended with the action read and never overrides it.
    var basis = null;
    // MIN_SAYDO_EVIDENCE counts DIRECTIONAL items — supporting plus contradicting —
    // which is what its own definition says and what a public-record percentage is
    // divided by. Measuring it against the item TOTAL let a row take its verdict from
    // the public lane on the strength of items that lane had deliberately declined to
    // judge: a red flag is heat, not a direction, and two of them still divide by zero.
    // Three rows sat on the gap — Tlaib and Jayapal on foreign aid balance, the
    // president on war powers — each holding one judged item beside one or two flags,
    // each reading "Says one thing, does another" with no percentage to print next to
    // it. That is a tested row that cannot state its own result. Below two directional
    // items the public lane does not decide, and the action lane says the honest thing.
    var pubDirectional = (pub.supporting || 0) + (pub.contradicting || 0);
    if (actionJudged && tok !== 'limited') basis = 'action';
    else if (tok !== 'pending' && pub.judged && pubDirectional >= MIN_SAYDO_EVIDENCE) {
      basis = 'public_record'; tok = pub.token; v = pub.verdict; score = pub.score;
    } else if (actionJudged) basis = 'action';

    // ── the row's own Mixed floor ─────────────────────────────────────────────
    // "Mixed record" is a claim about a DISAGREEMENT, and one item cannot disagree
    // with itself. Every lane that mints Mixed runs the shared gate, but a row can
    // still inherit a mixed token from a summary computed over a wider set than the
    // one it is showing — National Debt and Healthcare both surfaced that way, each
    // sitting on Mixed with a single thin action behind it. This is the last word
    // before the row renders: below two directional items, resolve by direction and
    // say the honest thing instead.
    if (tok === 'mixed') {
      var dir = (basis === 'public_record')
        ? { c: pub.supporting || 0, x: pub.contradicting || 0 }
        : _rowDirection(ov);
      if ((dir.c + dir.x) < 2) {
        if (dir.c > dir.x) { tok = 'consistent'; }
        else if (dir.x > dir.c) { tok = 'contradicts'; }
        else { tok = 'limited'; score = null; }
        v = VERDICTS[tok];
      }
    }

    var judged = (tok === 'consistent' || tok === 'contradicts' || tok === 'mixed' || tok === 'limited');
    // ── counter-evidence the deciding lane set aside ──────────────────────────
    // "Never both" is a rule about not BLENDING two records into one verdict. It was
    // never meant to make the losing lane invisible. Border Security is the case that
    // exposed the difference: the formal-action lane reads consistent off two signed
    // laws, while a sourced GAO finding on the same issue contradicts a different
    // border claim outright — and the row printed "Backs it up" with nothing to
    // indicate the counter-receipt was there at all. This changes no verdict, no
    // score and no tally. It names, as data, that the record that did not decide
    // points the other way, so a surface can disclose it instead of dropping it.
    var setAside = null;
    if (judged && tok !== 'mixed') {
      var pubX = pub.contradicting || 0, pubC = pub.supporting || 0;
      if (basis === 'action' && tok === 'consistent' && pubX > 0) {
        setAside = { lane: 'public_record', direction: 'contradicts', count: pubX };
      } else if (basis === 'action' && tok === 'contradicts' && pubC > 0) {
        setAside = { lane: 'public_record', direction: 'consistent', count: pubC };
      } else if (basis === 'public_record') {
        var adir = _rowDirection(ov);
        if (tok === 'consistent' && adir.x > 0) setAside = { lane: 'action', direction: 'contradicts', count: adir.x };
        else if (tok === 'contradicts' && adir.c > 0) setAside = { lane: 'action', direction: 'consistent', count: adir.c };
      }
    }
    var hasWord = !!stance.key || !!ov.hasStance || !!(ov.record && ov.record.hasStance);
    var hasAction = evCount > 0 || actionJudged;
    var tier, testability;
    if (ov.token === 'pending') { tier = ROW_TIER.word_only; testability = 'warming'; }
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
    return {
      pid: pid, key: issueKey,
      label: _issueLabel(issueKey),
      category: _catOf(issueKey), categoryLabel: _catLabel(issueKey),
      // ── SAID ──
      stance: stance,
      // …and whether there IS a said at all, by the same test the tiering above uses.
      // A surface asking "is this row unscored because their record is thin, or
      // because we hold no position of theirs to test it against?" was re-deriving
      // this from `stance.key` alone, which misses the two other ways a position can
      // be on file (`ov.hasStance`, `ov.record.hasStance`) and so quietly filed a
      // documentation gap of ours as a shortcoming of theirs.
      said: hasWord,
      // ── DID ──
      lane: ov.lane || null,
      actions: { count: evCount, lane: ov.lane || null, judged: judgedCountOf(ov) },
      // ── VERDICT ── one per issue, and `basis` names which record produced it, so a
      // surface can say "tested by the formal record" or "tested by the public record"
      // instead of leaving a reader to guess which engine spoke.
      verdict: { token: tok, label: v.label, cls: v.cls, ico: v.ico, color: v.color, score: score, basis: basis },
      // ── the public record, as an input ──
      public: pub,
      // Counter-evidence the deciding lane set aside, or null. Never folded into the
      // verdict — a disclosure, not a second opinion.
      setAside: setAside,
      // ── RECEIPTS ── `count` stays the ACTION count (the Official Record's own
      // depth signal, unchanged), `total` is every sourced item behind the row from
      // either record, and `strength` reads off the total because that is what a
      // reader is being asked to weigh.
      evidence: { count: evCount, actions: evCount, public: pub.count, total: evCount + pub.count,
                  strength: _EV_STRENGTH(evCount + pub.count), sources: (ov.sources || []).slice() },
      // ── ranking foundation ──
      tier: tier, tierLabel: _TIER_LABEL[tier], testability: testability,
      // `scored` = the ACTION side returned a verdict. Unchanged on purpose: the
      // Official Record splits its rows on this, and that section is the action lane.
      scored: actionJudged,
      // `tested` = this row has a real consistency outcome from either record.
      tested: (tok === 'consistent' || tok === 'contradicts' || tok === 'mixed'),
      // Declared, never guessed. A later ranking fills these in; until then a null
      // weight is honest and every sort below treats it as "no opinion".
      weights: { salience: null, recency: null },
      ov: ov
    };
  }
  // Default scope is `combined`, not `official`. The row IS the merge now — an issue
  // whose only test is a public-record one has a verdict here, so scoping the default
  // to the action lane would drop exactly the rows that used to be Say-vs-Do's reason
  // to exist. Callers that mean the action lane (the Official Record) still pass their
  // own keys and are unaffected.
  function issueRows(pid, keys) {
    if (keys) return keys.map(function (k) { return issueRow(pid, k); });
    // MEMOIZED — see THE DERIVATION EPOCH in stance-helpers.js.
    //
    // THE MULTIPLIER. This is the profile's whole row model, and the default
    // (no-keys) form is what every summary surface asks for: the score strip, the
    // composition bar, the issue index, the tally, the gateway and the warm
    // repaint each rebuilt all ~35 rows from scratch, and each row re-derives both
    // lanes for its issue. Caching the default set is what turns the caches below
    // it from a saving into a change of order — the rows are built once per
    // politician per epoch and everything else reads that one array.
    //
    // Explicit `keys` are NOT cached: those callers mean a specific slice (the
    // Official Record's action lane), they are not on the open path, and keying a
    // cache on a caller-supplied list is where a subtle wrong answer would come
    // from. The rows themselves are treated as read-only by every caller — the
    // ranking below copies before it sorts, for exactly this reason.
    //
    // Keyed on the active term scope as well as the politician. The scope is a
    // module setting read far below this line, not an argument passed down it, so
    // `pid` alone does not identify the answer: the same politician read inside
    // withExecTermScope('current_term', …) has a different row model, and it is
    // rendered next to the all-time one for comparison.
    var ep = (typeof window.PDXDataEpoch === 'function') ? window.PDXDataEpoch() : 0;
    if (_rowsEpoch !== ep) { _rowsCache = {}; _rowsEpoch = ep; }
    var k = norm(pid) + '||' + execTermScope().key;
    if (Object.prototype.hasOwnProperty.call(_rowsCache, k)) return _rowsCache[k];
    var v = issuesWithSignal(pid, 'combined').map(function (x) { return issueRow(pid, x); });
    _rowsCache[k] = v;
    return v;
  }
  var _rowsCache = {}, _rowsEpoch = 0;
  // ── THE ONE TALLY ───────────────────────────────────────────────────────────
  // Every surface that summarises a politician's record in counts reads this. The
  // unit is the ISSUE ROW — the same object the profile prints one line per — so a
  // homepage card saying "0 mixed" while the profile shows two Mixed issue rows is
  // now impossible by construction rather than by convention.
  //
  // This is not a re-derivation of the verdicts: it is a count of the verdicts the
  // rows already carry. `thin` is kept as its own bucket and never folded into
  // `mixed`; a row the engine could not test is not a split record, and reporting it
  // as one is the reinterpretation this pass exists to remove.
  function verdictTally(pid, rows) {
    var list = rows || issueRows(pid);
    var out = { consistent: 0, mixed: 0, contradicts: 0, thin: 0, pending: 0,
                tested: 0, judged: 0, total: 0 };
    (list || []).forEach(function (r) {
      var t = r && r.verdict && r.verdict.token;
      out.total++;
      if (t === 'consistent') out.consistent++;
      else if (t === 'mixed') out.mixed++;
      else if (t === 'contradicts') out.contradicts++;
      else if (t === 'limited') out.thin++;
      else if (t === 'pending') out.pending++;
    });
    out.tested = out.consistent + out.mixed + out.contradicts;
    out.judged = out.tested + out.thin;
    return out;
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
      // Total receipts, not action receipts. This is what separates locked priority
      // (c) "stance with strong evidence" from (d) "stance only": both are tier 2, and
      // before the merge every tier-2 row carried 0 action receipts, so they tied and
      // fell through to alphabetical order. The public record is what distinguishes
      // them, and now it is on the row.
      if (a.evidence.total !== b.evidence.total) return b.evidence.total - a.evidence.total;
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
    var lanes = recordLanes(pid, scored);
    // THE POOLED PERCENTAGE IS NOT PRINTED HERE ANY MORE. This section is the TEST
    // behind the profile's one primary score (⚖️ Word vs Action), not a second score
    // of its own: printing "67%" beside a hero reading 82% asked a reader to work out
    // which number was the verdict. The verdict CHIP stays — it is a different kind of
    // statement, and scopedOverall() still computes the number for the primary read
    // and for the per-issue rows below.
    var overallHtml = (typeof overall.score === 'number')
      ? overallComp + '<span class="pdxc-chip pdxc-' + om.cls + '">' + om.ico + ' ' + esc(om.label) + '</span>'
      : '<span class="pdxc-chip pdxc-' + om.cls + '">' + (overall.token === 'pending' ? '<span class="pdxc-spin"></span>' : om.ico + ' ') + esc(om.label) + '</span>';

    // ── The header, in two lines ───────────────────────────────────────────
    // It used to be six stacked blocks before the first issue row: title, overall
    // chip, the section's question in quotes, the two-lane explainer with its own
    // header and footer, and a two-sentence note about what the results feed. All
    // of it true, none of it the answer a reader opened the section for — and on a
    // dual-lane profile it ran most of a phone screen before the record began.
    //
    // What survives is what cannot be looked up: the title, the overall verdict,
    // and a digest counting what is actually below. The prose moved into the
    // "How to read this" sheet that was already wired into this header — so it is
    // one tap away in the place a reader already goes for it, rather than deleted.
    // The section's question used to sit on its own line, in quotes, in two office-
    // aware wordings. The wording is now in the sheet — but the OFFICE-AWARENESS is
    // not prose and does not move: the digest names what these rows were actually
    // tested against, in the lane's own nouns, so a president's Official Record still
    // never frames itself around a vote he never cast.
    var digest = [];
    digest.push(scored.length + ' issue' + (scored.length === 1 ? '' : 's') + ' tested against ' +
      (isExecSection ? 'orders, signings and vetoes' : 'roll-call votes'));
    if (awaiting > 0) {
      digest.push(awaiting + ' stated position' + (awaiting === 1 ? '' : 's') + ' awaiting one');
    }
    // The one lane fact a reader cannot infer from the rows: there are two records
    // here and they are never pooled. The full explainer is in the sheet.
    if (lanes.both) digest.push('two kinds of record, never pooled');

    var head =
      '<div class="pdxor-head"><span class="pdxor-title"><span aria-hidden="true">🏛️</span> ' +
          LT('officialrecord', 'Official Record') + '</span>' +
        // Before .pdxor-overall, which carries margin-left:auto — so the pill sits
        // beside the title and the score stays pinned right.
        LHOWTO('voting-record', 'How to read this') +
        '<span class="pdxor-overall">' + overallHtml + '</span></div>' +
      _feedsPrimaryHtml(digest.join(' · '));

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
        _orMappedSummaryHtml(pid) + _orRawLink(pid, lanes);
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
        var skin = _icSkin(s.key);
        return '<details class="pdxor-issue pdxor-row' + skin.cls + '" style="' + skin.style + '"' +
            ' id="' + escAttr(orRowId(pid, s.key)) + '"' +
            ' data-pdxc-row="' + escAttr(s.key) + '"' +
            // The ranking foundation, carried on the element itself: tier, testability
            // and receipt depth. Nothing reads these yet — they are here so a later
            // stance ranking can sort, filter or badge rows without re-deriving what
            // the section already knows.
            ' data-pdxc-tier="' + escAttr(String((s.row && s.row.tier) != null ? s.row.tier : '')) + '"' +
            ' data-pdxc-test="' + escAttr((s.row && s.row.testability) || '') + '"' +
            ' data-pdxc-ev="' + escAttr(String((s.row && s.row.evidence.count) || 0)) + '">' +
            '<summary class="pdxor-row-sum">' +
              '<div class="pdxor-issue-top">' +
                '<span class="pdxor-issue-lbl">' + _icDot(skin) + esc(issueLabel(s.key)) + '</span>' +
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
        var askin = _icSkin(k);
        return '<div class="pdxor-issue pdxor-issue-await' + askin.cls + '" style="' + askin.style + '">' +
            '<div class="pdxor-issue-top">' +
              '<span class="pdxor-issue-lbl">' + _icDot(askin) + esc(issueLabel(k)) + '</span>' +
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
      body + awaitingNote + _orRawLink(pid, lanes);
  }
  function _orRawLink(pid, lanes) {
    // Keep the raw Voting Record list one tap away (it still has value as a full list).
    //   Not for a president. `_vrSectionReachable()` asks the DOM whether a Voting
    // Record section exists, and the answer used to be yes on an executive profile —
    // profiles-full.js mounts that section for everyone — so "See the full voting
    // record →" printed under a president's Official Record, promising a roll-call
    // list they will never have. The office decides first; the DOM only decides
    // whether a live destination exists for the offices that do vote.
    //   The gate is the LANE, not the office. `execEligible` alone would also strip
    // the link from someone who holds executive office now and served in a chamber
    // before — exactly the both-lanes case this section is built to mount, and the
    // one reader for whom the roll-call list is a second record rather than a
    // category error.
    //   `lanes` is threaded in from _orInner because the caller has already read the
    // scored rows, and those rows are the only place the vote lane shows up before the
    // roll-call cache is warm. Recomputing it here from a cold cache would answer
    // "exec only" for a dual-service figure and strip the link the section just earned.
    if (!lanes && pid) lanes = recordLanes(pid);
    if (pid && lanes && !lanes.vote) return '';
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
      // The text is the header's whole second line now, not a footnote under three
      // other blocks, so it renders whether or not the Word vs Action module is
      // loaded. Only the jump button depends on that module — it is the thing that
      // would have nowhere to go.
      var go = '';
      try {
        if (window.PDXWordAction && window.PDXWordAction.FRAME) {
          var f = window.PDXWordAction.FRAME;
          go = '<button type="button" class="pdxc-feeds-go" onclick="if(window._pdxNavJump)window._pdxNavJump(\'pdxsec-wordaction\');else{var e=document.getElementById(\'pdxsec-wordaction\');if(e&&e.scrollIntoView)e.scrollIntoView({behavior:\'smooth\',block:\'start\'});}">' +
            f.icon + ' ' + esc(f.label) + ' <span aria-hidden="true">→</span></button>';
        }
      } catch (e2) { go = ''; }
      if (!text && !go) return '';
      return '<div class="pdxc-feeds">' +
        '<span class="pdxc-feeds-t">' + esc(text) + '</span>' + go +
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

  // ── 🧭 STANCES & CONNECTIONS ─────────────────────────────────────────────────
  // The "what they stand for" layer, and the one place the profile answers that
  // question as a MAP rather than as a verdict. It scores nothing: every row is the
  // shared PDXConsistency issue-row unit, ranked by the shared rankIssueRows()
  // contract, so a stance shown here and the same stance shown in ⚖️ Word vs Action
  // or 🏛️ Official Record can never carry different outcomes — there is one row model
  // and it is resolved once.
  //
  // The locked ranking priority maps onto the row tiers exactly:
  //   (a) stance + action, contradiction/mixed   → ROW_TIER.tension
  //   (b) stance + action, consistent            → ROW_TIER.tested
  //   (c) stance with strong evidence            → ROW_TIER.word_only, ranked by
  //   (d) stance only                              evidence.total inside the tier
  //   (e) action only                            → ROW_TIER.action_only
  //   (f) empty                                  → ROW_TIER.empty, folded away
  // Tiers (a) and (b) are open; everything from (c) down folds, because "testable +
  // evidenced first" is a statement about what a reader meets, not only about sort
  // order.
  var _ST_GRP = [
    { tiers: [0], label: 'Tested — and the record pushes back' },
    { tiers: [1], label: 'Tested — and the record backs it up' },
    { tiers: [2], label: 'Stated, nothing formal has tested it yet' },
    { tiers: [3], label: 'On the record, nothing stated' },
    { tiers: [4], label: 'Nothing on file yet' }
  ];
  // A TIER SET, not a count of groups. Slicing the first two LIVE groups was wrong:
  // on a figure with no contradictions the tension group is empty and drops out of
  // `live`, so "the first two" silently became tested + everything-untested — 24 of
  // 32 rows open on a president, which is the wall this layer exists to replace.
  // Keying on the tier means an empty group above can never promote a folded one.
  var _ST_OPEN_TIERS = { 0: 1, 1: 1 }; // (a) tension and (b) tested stay open
  // How many rows an OPEN group may show before the remainder folds. Six, because the
  // lead has to stay readable on a phone without scrolling past it, and because the
  // rows below the sixth in a "the record backs it up" group are the least surprising
  // thing on the page. The tension group is exempt — see blockOf.
  var _ST_LEAD_CAP = 6;
  function _stOpen(g) { return g.tiers.some(function (t) { return _ST_OPEN_TIERS[t]; }); }

  // ── WHAT THE RECORD CONCLUDED, ON THE ROW ───────────────────────────────────
  // A stance row's job is to answer four questions in one glance: what they said,
  // what the record concluded, how strong that conclusion is, and where to go next.
  // Before this pass it answered the first and gestured at the second with a pastel
  // chip — "◑ Mixed record · 7 receipts · strong" — which names a bucket without
  // ever saying what was in it. Everything below turns the row's ALREADY-RESOLVED
  // verdict into a stated result.
  //
  // NOTHING HERE SCORES. Every number is read off the row model:
  //   • the percentage is r.verdict.score, which officialIssue() computed as
  //     consistent ÷ (consistent + contradicts) over the judged items in whichever
  //     lane decided the row — i.e. how often the formal record pointed the SAME
  //     DIRECTION as the stated position. That is the same arithmetic and the same
  //     name (⚖️ Word vs Action's FRAME.metric) as the profile's one score, applied
  //     to one issue instead of pooled across all of them.
  //   • the composition counts are the same consistent/contradicts pair the
  //     percentage is a ratio of, printed rather than divided.
  //   • the strength word is r.evidence.strength (_EV_STRENGTH), not a second
  //     definition of thin.
  //
  // IT FAILS CLOSED. A percentage is printed only where the deciding lane returned
  // one. `limited` — the engine saying it could not test the claim — prints an
  // explicit "—" and the reason; an untested row prints "Not tested yet" and why.
  // No row is ever given a result the engine did not reach.

  // The countable noun for the record behind THIS row. A president signs actions
  // and casts no votes; a member does the reverse. The row knows its own lane, so
  // the executive-only vocabulary can never reach a member's surface.
  function _stNoun(r) {
    return (r && r.lane === 'exec')
      ? { one: 'action', many: 'actions' }
      : { one: 'vote', many: 'votes' };
  }
  // Is there a stated position on file to test this record against? Read off the row
  // model (issueRow.said), which uses the same test the tiering does. Hand-built rows
  // — tests, fallbacks — may not carry the flag, so it falls back to the stance
  // itself: never assume a position exists that we cannot point at.
  function _stSaid(r) {
    if (!r) return false;
    if (typeof r.said === 'boolean') return r.said;
    return !!(r.stance && (r.stance.key || r.stance.text || r.stance.label));
  }
  // How many formal instruments this row holds. The row's own count, not a second
  // definition of depth — the same number _stEvidenceHtml prints and the same one
  // the dossier's list reconciles against.
  function _stHeld(r) {
    return (r && r.evidence && r.evidence.actions) || 0;
  }
  // How many judged items pointed each way, from the lane that actually decided the
  // row. Returns null when nothing directional was judged — the caller must not
  // print a breakdown of a verdict no lane produced.
  function _stSplit(r) {
    if (!r || !r.verdict) return null;
    var d = (r.verdict.basis === 'public_record')
      ? { c: (r.public && r.public.supporting) || 0, x: (r.public && r.public.contradicting) || 0 }
      : _rowDirection(r.ov);
    if (!d || (d.c + d.x) <= 0) return null;
    return { aligned: d.c, against: d.x, judged: d.c + d.x, basis: r.verdict.basis };
  }
  // The most contested standing among the executive actions behind this row, or
  // null. Read off the row's own pool and rendered from PDXExecRecord.STANDING, so
  // this surface cannot disagree with the Executive Enactment Record about where an
  // order stands — and it is exec-only, because "blocked by a court" is not a thing
  // that happens to a roll-call vote.
  var _ST_STANDING_ORDER = ['struck_down', 'overridden', 'blocked', 'partly_blocked', 'rescinded',
                            'challenged_unverified', 'superseded', 'expired'];
  function _stStanding(r) {
    try {
      if (!r || r.lane !== 'exec') return null;
      var E = window.PDXExecRecord;
      if (!E || !E.STANDING) return null;
      var pool = r.ov && (r.ov.execPool || r.ov.execHeld);
      var items = (pool && pool.items) || [];
      if (!items.length) return null;
      for (var i = 0; i < _ST_STANDING_ORDER.length; i++) {
        var key = _ST_STANDING_ORDER[i], n = 0;
        for (var j = 0; j < items.length; j++) if (items[j].standing === key) n++;
        if (n) {
          var meta = E.STANDING[key];
          if (meta && meta.contested) return { key: key, label: meta.label, ico: meta.ico, count: n };
        }
      }
    } catch (e) {}
    return null;
  }
  // ── WHAT THE RECORD DID, ON A ROW NOTHING WAS STATED FOR ────────────────────
  // The rows this reads for are the ones the thin-record pass made honest: real,
  // sourced, mapped instruments, no stated position of theirs to test them
  // against, so the row states its inventory and stops. "18 votes on file" is
  // true and it is also the end of the sentence — the reader's next question is
  // which way those eighteen went, and the answer was already computed and
  // discarded. This asks stance-helpers' record-direction index for it.
  //
  // WHAT IT IS NOT. It returns a fragment of a REASON LINE, never a result. It
  // cannot reach res.pct (which stays null), res.state, res.bucket or the verdict
  // — the row remains unscored and unranked, and Direction Match never sees it.
  // The index's own tokens are `record_*` and are not verdict tokens; nothing
  // here converts between the two vocabularies.
  //
  // SLICE SCOPE: the 🏛️ legislative lane only. exec-record.js has the identical
  // gap (it computes each action's direction and drops it at `acted_no_stance`)
  // and the same fix applies there, but "advanced it" over an executive order
  // needs the exec lane's own vocabulary and its own standing rules, so that is a
  // later slice rather than a rename of this one.
  function _stRecordDirection(r) {
    try {
      if (!r || !r.pid || !r.key) return null;
      if (r.lane === 'exec') return null;         // later slice — see above
      if (_stSaid(r)) return null;                // a stated position: Direction Match's row, not this one
      if (typeof window._pdxRecordDirection !== 'function') return null;
      var idx = window._pdxRecordDirection(r.pid, r.key,
        { noun: _stNoun(r), label: r.label || '' });
      if (!idx || !idx.clause) return null;
      return idx;
    } catch (e) { return null; }
  }
  // The clause, reconciled against the count the row already printed. `judged`
  // counts items that took a side; `held` counts every instrument on file, and a
  // present or not-voting ballot sits in the second and not the first. Printing
  // "18 votes on file — 13 cut against it, 4 advanced it" would be an arithmetic
  // error on the face of the row, so where the two differ the clause names its
  // own denominator instead of borrowing the row's.
  function _stDirClause(idx, held) {
    if (!idx || !idx.clause) return '';
    if (typeof held === 'number' && held > idx.judged) {
      return 'of the ' + idx.judged + ' that took a side, ' + idx.clause;
    }
    return idx.clause;
  }
  // The row's result, as data. One place decides what a row concluded, so the
  // markup below and the tests both read the same answer.
  function _stResult(r) {
    var v = (r && r.verdict) || {};
    var tok = v.token;
    var pubBasis = (v.basis === 'public_record');
    // ONE RESULT VOCABULARY. The word on this row is the word the issue index filed
    // it under — Backed up, Mixed, Contradicted, Thin record — read from the module
    // that publishes those four, not restated here. The row used to print the engine's
    // long verdict label instead ("Backs it up" against the index's "Backed up"), which
    // is two names for one finding on one profile. Falls back to the engine label if
    // the vocabulary is unreachable, so the row still states a result either way.
    var bucket = _dosBucket(r);
    var word = (bucket && bucket.short) ? bucket.short : v.label;
    // The metric's NAME travels with the lane that produced it. "Direction match"
    // is ⚖️ Word vs Action's name for formal-record agreement and it is reserved for
    // exactly that; a row the public record decided says so instead of borrowing a
    // name for arithmetic it did not do.
    var metric = pubBasis ? 'Public-record match' : 'Direction match';
    if (r && r.tested && typeof v.score === 'number') {
      return { state: 'tested', pct: v.score, metric: metric, label: word, ico: v.ico,
               color: v.color, cls: v.cls, why: '', bucket: bucket,
               shape: 'tested', held: _stHeld(r), invite: null };
    }
    if (tok === 'limited') {
      // WHY it is thin, not just that it is — and WHOSE side of the ledger the gap
      // is on. "Limited" covers three different situations and a reader can tell
      // them apart instantly once they are named:
      //
      //   · WE HOLD NO POSITION OF THEIRS. The row holds real, sourced instruments —
      //     often a dozen or more — and there is simply no stated position on file to
      //     test them against. This is the overwhelmingly common case, and it is a
      //     gap in OUR documentation, not a shortcoming of their record. It used to
      //     print "There is a record here, but none of it takes a clear side on this
      //     claim", which is false twice over: there is no claim, and the votes take
      //     sides all day — nobody has written down what they said they would do. So
      //     the row now names the inventory it holds, says what is missing is a
      //     stated position, and offers the list. The count is INVENTORY, never a
      //     rate: the row stays unscored and prints no percentage.
      //   · A RECORD THAT NEVER TAKES A SIDE on the claim (the president's healthcare
      //     row — four actions, none of them for or against what he said).
      //   · A RECORD WITH ALMOST NOTHING IN IT. Printing "not enough record" over
      //     four actions reads as a contradiction of the line right below it.
      var lim = _stSplit(r), lnoun = _stNoun(r);
      var lheld = _stHeld(r), lsaid = _stSaid(r);
      var lwhy, lshape = 'thin', linvite = null, ldir = null;
      if (!lim && !lsaid) {
        lshape = 'no_stance';
        if (lheld > 0) {
          var lmany = (lheld === 1 ? lnoun.one : lnoun.many);
          // The inventory, then what it did, then why it is still not a score. The
          // middle clause is the record describing itself; it is absent whenever
          // the index declines to characterise (too thin, no primary mapping, an
          // issue with no support pole, a member we hold too little of), and the
          // sentence reads exactly as it did before this pass.
          ldir = _stRecordDirection(r);
          var lclause = _stDirClause(ldir, lheld);
          lwhy = lheld + ' ' + lmany + ' on file' + (lclause ? ' — ' + lclause : '') +
            ' · no stated position from them yet, so this row isn’t scored.';
          linvite = { count: lheld, noun: lmany, cta: 'see the ' + lmany };
        } else {
          lwhy = 'No stated position from them yet, so there is nothing here to test the record against.';
        }
      } else if (!lim) {
        lwhy = (r.evidence.total > 0)
          ? 'There is a record here, but none of it takes a clear side on this claim.'
          : 'Nothing on record yet takes a side on this one.';
      } else if (lim.judged === 1) {
        lwhy = 'One ' + lnoun.one + ' is not enough to judge this one yet.';
      } else {
        lwhy = 'Not enough record to judge this one yet.';
      }
      return { state: 'thin', pct: null, metric: metric,
               // THE WORD FOLLOWS THE SHAPE. "Thin record" is the issue index's name
               // for a pile this row is not in — the index drops wordless rows before
               // bucketing — so _dosBucket returns nothing here and the row says what
               // is actually true of it instead: it is not scored. It is not a verdict,
               // it does not rank, and it is the one label on this face that is about
               // OUR coverage rather than their conduct.
               label: (lshape === 'no_stance') ? 'Not scored yet' : word,
               ico: v.ico, color: v.color, cls: v.cls, why: lwhy, bucket: bucket,
               shape: lshape, held: lheld, invite: linvite, dir: ldir };
    }
    if (tok === 'pending') {
      return { state: 'untested', pct: null, metric: '', label: 'Not tested yet', ico: '⏳',
               color: '#9fb4d4', cls: 'pending', why: 'Loading the record…', bucket: null,
               shape: 'pending', held: _stHeld(r), invite: null };
    }
    // The same distinction one tier down. `no_stance` is the engine reaching the same
    // conclusion by a different route — a record on file, no word to check it against
    // — so it says the same thing in the same shape, inventory included.
    var uheld = _stHeld(r), unoun = _stNoun(r), uwhy, ushape = 'thin', uinvite = null, udir = null;
    if (tok === 'no_stance') {
      ushape = 'no_stance';
      if (uheld > 0) {
        var umany = (uheld === 1 ? unoun.one : unoun.many);
        udir = _stRecordDirection(r);
        var uclause = _stDirClause(udir, uheld);
        uwhy = uheld + ' ' + umany + ' on file' + (uclause ? ' — ' + uclause : '') +
          ' · no stated position from them yet, so this row isn’t scored.';
        uinvite = { count: uheld, noun: umany, cta: 'see the ' + umany };
      } else {
        uwhy = 'They have a record here, but no stated position to test it against.';
      }
    } else {
      uwhy = 'Nothing formal on record for this issue yet.';
      ushape = 'no_record';
    }
    return { state: 'untested', pct: null, metric: '', label: 'Not tested yet', ico: '—',
             color: '#9fb4d4', cls: 'none', why: uwhy, bucket: null,
             shape: ushape, held: uheld, invite: uinvite, dir: udir };
  }
  // THE REASON LINE, AND — WHERE THERE IS ONE — THE WAY TO CHECK IT.
  // A row that says "18 votes on file" and offers no route to those eighteen votes
  // is asking to be taken on trust, which is the one thing this product is for not
  // doing. The count is therefore the door: same dossier, same (pid, issue) pair and
  // the same accessible name as the issue-name tap above it (_dosDoorLabel), asking
  // the sheet to land on the Official Record enumeration rather than the top. It is
  // drawn ONLY where the result carries an inventory to show — never on a row whose
  // record really is thin, because there the invitation would be an empty promise.
  function _stWhyHtml(r, res, tag) {
    if (!res || !res.why) return '';
    var t = tag || 'div';
    var door = '';
    if (res.invite && r && r.pid && r.key) {
      door = '<button type="button" class="pdxst-why-go"' +
        ' data-pdxst-dos="' + escAttr(r.key) + '" data-pdxst-pid="' + escAttr(r.pid) + '"' +
        ' data-pdxst-origin="' + escAttr(stanceRowId(r.pid, r.key)) + '"' +
        ' data-pdxst-focus="record"' +
        ' aria-label="' + escAttr(_dosDoorLabel(r.label, res.bucket, r.stance && r.stance.label)) + '">' +
        esc(res.invite.cta) + '<span class="pdxst-lbl-go" aria-hidden="true">→</span>' +
      '</button>';
    }
    return '<' + t + ' class="pdxst-why">' + esc(res.why) + door + '</' + t + '>';
  }
  // The result line: the number, what it is a percentage OF, and the outcome word.
  function _stResultHtml(r, res) {
    var n = _stNoun(r);
    // WHICH RECORD IS TALKING. The row now states both lanes, one under the other,
    // so each line names the record it came from — otherwise the reader is left to
    // infer the pairing from a metric name and a chip colour. The key follows the
    // basis rather than the surface: a row no formal instrument could test carries a
    // public-record result, and calling that line "Formal" would be a lie told in one
    // word. The public line below keys itself the same way, so a row where both read
    // "Public" is a row where the public record both decided the result and is still
    // outside Direction Match — which is exactly what its note says.
    var laneKey = (res.metric === 'Public-record match') ? PUB_LANE : 'Formal';
    var lane = '<span class="pdxst-lane">' + esc(laneKey) + '</span>';
    if (res.state === 'untested') {
      return '<div class="pdxst-result pdxst-r-untested">' + lane +
          '<span class="pdxst-vd pdxst-vd-none">' + esc(res.ico + ' ' + res.label) + '</span>' +
          _stWhyHtml(r, res, 'span') +
        '</div>';
    }
    var split = _stSplit(r);
    var scopeWord = (res.metric === 'Public-record match') ? 'public-record item' : n.one;
    // THE NO-STANCE TIP SAYS THE ISSUE OUT LOUD. The why line beneath the row can
    // lean on the heading directly above it and write "it"; the tooltip and the
    // aria-label cannot — a screen-reader user lands on this string with no
    // heading in earshot. So where the record-direction index produced a full
    // sentence (which names the issue), that sentence replaces the clipped clause
    // rather than joining it, and the count is stated once.
    var noStanceLead = (res.shape === 'no_stance' && res.dir && res.dir.summary)
      ? res.dir.summary + ' No stated position from them yet, so this row isn’t scored.'
      : res.why;
    var tip = (res.state === 'tested')
      ? res.metric + ' on this issue only: ' + res.pct + '% — ' +
        (split ? split.aligned + ' of ' + split.judged + ' judged ' +
          (split.judged === 1 ? scopeWord : scopeWord + 's') + ' pointed the same way as the position they state. '
                : '') +
        'Verdict: ' + res.label + '. This is one issue, not the profile score — that one is in Word vs Action.'
      : (res.shape === 'no_stance'
          ? noStanceLead + ' ' +
            'No percentage is shown, because there is nothing stated to measure this record against — ' +
            'the count is what we hold on file, not a score.'
          : res.why + ' ' +
            'No percentage is shown, because the record behind this row is too thin to divide.');
    var num = (res.state === 'tested')
      ? '<span class="pdxst-pct" style="color:' + res.color + '">' + res.pct + '%</span>'
      // The empty slot names its own reason too. "Not enough record" is a true
      // sentence about a thin row and a false one about a row holding eighteen
      // votes, and a screen-reader user gets ONLY this string — the count sits in
      // the why line below, not in the slot — so it has to carry the distinction.
      : '<span class="pdxst-pct pdxst-pct-na" aria-label="' +
        escAttr(res.shape === 'no_stance'
          ? 'No percentage — no stated position to score the record against'
          : 'No percentage — not enough record') + '">—</span>';
    return '<div class="pdxst-result pdxst-r-' + res.cls + '" title="' + escAttr(tip) + '" aria-label="' + escAttr(tip) + '">' +
        lane +
        '<span class="pdxst-metric">' + esc(res.metric) + '</span>' +
        '<span class="pdxst-scope">this issue</span>' +
        num +
        '<span class="pdxst-vd" style="color:' + res.color + '">' + esc(res.ico + ' ' + res.label) + '</span>' +
      '</div>' +
      (res.state === 'thin' ? _stWhyHtml(r, res, 'div') : '');
  }
  // WHAT "MIXED" MEANT. Printed where the row actually carries tension — a split
  // verdict, counter-evidence the deciding lane set aside, or an action whose
  // standing is contested — and nowhere else, because a breakdown under a clean
  // row is furniture.
  function _stCompHtml(r, res) {
    if (res.state === 'untested') return '';
    var split = _stSplit(r);
    var st = _stStanding(r);
    var aside = r.setAside;
    var tense = (r.verdict.token === 'mixed') || !!aside || !!st;
    if (!tense || !split) return '';
    var n = _stNoun(r);
    var unit = (split.basis === 'public_record') ? 'public-record item' : n.one;
    var parts = [
      '<span class="pdxst-comp-for"><b>' + split.aligned + '</b> aligned</span>',
      '<span class="pdxst-comp-against"><b>' + split.against + '</b> against</span>'
    ];
    if (aside && aside.count) {
      var asideUnit = (aside.lane === 'public_record')
        ? 'public receipt' + (aside.count === 1 ? '' : 's')
        : (aside.count === 1 ? n.one : n.many);
      parts.push('<span class="pdxst-comp-x"><b>' + aside.count + '</b> ' + esc(asideUnit) + ' the other way, set aside</span>');
    }
    if (st) {
      // Lowercase the FIRST LETTER, not the label. `toLowerCase()` on the whole
      // string turned "Overridden by Congress" into "overridden by congress", which
      // reads as a typo and quietly demotes the branch that did the overriding.
      var stLbl = st.label.charAt(0).toLowerCase() + st.label.slice(1);
      parts.push('<span class="pdxst-comp-x">' + esc(st.ico + ' ' + st.count + ' ' +
        (st.count === 1 ? n.one : n.many) + ' ' + stLbl) + '</span>');
    }
    var tip = split.aligned + ' of ' + split.judged + ' judged ' +
      (split.judged === 1 ? unit : unit + 's') + ' pointed the same way as their stated position; ' +
      split.against + ' ran against it.' +
      (aside && aside.count ? ' The lane that did not decide this row points the other way on ' +
        aside.count + ' item' + (aside.count === 1 ? '' : 's') + ' — disclosed, never blended into the verdict.' : '') +
      (st ? ' Standing is a separate question from direction: the verdict says which way they went, not whether it held.' : '');
    return '<div class="pdxst-comp" title="' + escAttr(tip) + '" aria-label="' + escAttr(tip) + '">' +
      parts.join('<span aria-hidden="true">·</span>') + '</div>';
  }
  // HOW MUCH IS BEHIND IT, in the row's own nouns. Kept on its own line rather than
  // trailing the issue name, so the depth of a record is scannable down a column
  // instead of hiding at the end of whatever the longest label happened to be.
  // `cov` is passed ONLY by the dossier face. On a stance row the number is a depth
  // claim about a record the reader is not currently looking at, and "12 votes on
  // record" is the honest thing to say there. Inside the dossier the same string sits
  // a finger's width above a list, and a depth claim next to a list reads as a claim
  // ABOUT the list — so it has to reconcile with what the list can open, or say why
  // it does not. This is the third count source on that face (the other two, L1's
  // judged count and L2's row count, were already reconciled through _dosCoverage)
  // and it was the one nothing checked.
  function _stEvidenceHtml(r, cov) {
    var n = _stNoun(r), bits = [];
    if (r.evidence.actions > 0) {
      var onRecord = r.evidence.actions;
      var noun = function (k) { return k === 1 ? n.one : n.many; };
      if (cov && cov.listed < onRecord) {
        // No silent truncation: both numbers are named, in the order that makes the
        // smaller one the promise. The route to the rest is the gap disclosure L2
        // already prints under the same expander.
        bits.push(cov.listed + ' of ' + onRecord + ' ' + noun(onRecord) + ' on record open below');
      } else {
        bits.push(onRecord + ' ' + noun(onRecord) + ' on record' +
          (cov ? ' · all ' + (onRecord === 1 ? 'of it' : 'of them') + ' listed below' : ''));
      }
    }
    if (r.evidence.public > 0) {
      bits.push(r.evidence.public + ' public receipt' + (r.evidence.public === 1 ? '' : 's'));
    }
    if (!bits.length) return '';
    bits.push(r.evidence.strength + ' evidence');
    return '<div class="pdxst-ev">' + esc(bits.join(' · ')) + '</div>';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // THE PUBLIC LANE, AT A GLANCE, WITHOUT A SCORE
  // ═══════════════════════════════════════════════════════════════════════════
  // The two records are separate systems and stay that way: the formal record
  // decides the issue result and feeds the profile's Direction Match; the public
  // record is context, confirmation or tension and is never in that number. That
  // separation was enforced everywhere in the engine and nowhere in the reader's
  // path — public evidence lived behind a dossier tap, so at the glance layer a row
  // with three sourced items cutting against a stance looked exactly like a row
  // with nothing on file. "Kept out of the score" was being delivered as "kept out
  // of sight", which is a different promise and a worse one.
  //
  // So both lanes are stated on the row, and this is the one place that words the
  // public side. WHAT IT MAY NOT DO, in order of how badly it would break the wall:
  //
  //   · NO PERCENTAGE. A second number on the row is a second score, whatever the
  //     caption says, and a reader comparing 57% to 40% will not care which lane
  //     each came from. The formal % stays the only numeric result on a row.
  //   · NO ARITHMETIC. Counts are copied from the row model's own public block —
  //     the same block issueRow() built and the same one the dossier reads. This
  //     function derives nothing, so it cannot disagree with either.
  //   · FLAGS ARE NOT DIRECTION. A red flag is heat: it is counted in its own slot
  //     and never added to "cut against", exactly as saydoScore keeps it out of its
  //     denominator. Two flags and no directional item is a row with nothing to
  //     back or contradict the stance, and it says so.
  //
  // The disclosure ships in two lengths on purpose. `tag` is what fits on a row and
  // is repeated on every one of them; `note` is the full sentence, carried on the
  // row's own title/aria-label and printed once per surface. A sentence that long
  // repeated down thirty-five rows is a sentence readers learn to skip, which is how
  // a disclosure stops disclosing.
  var PUB_LANE  = 'Public';
  var PUB_EMPTY = 'Nothing on file yet';
  var PUB_TAG   = 'Not in Direction Match';
  var PUB_NOTE  = 'The public record is a separate test of the same stance — sourced items, ' +
                  'statements and controversies. It is never counted in Direction Match.';
  // The one case where the public lane DID decide the row: no formal instrument
  // could test the stance at all. Even then it is outside the profile figure, and
  // saying so is the difference between "this is the result" and "this is the score".
  var PUB_NOTE_DECIDED = 'No formal instrument could test this stance, so the public record ' +
                  'decided this row. It is still never counted in Direction Match.';
  function _pubCta(t) {
    if (!t.empty) return '🧾 Public receipts';
    // "Nothing on file" is a coverage gap, and the dossier's public column already
    // holds the composer for exactly this — PDXGaps' ＋ Suggest a lead. The row
    // offers that door only when the module that answers it is actually loaded;
    // otherwise it offers the panel, which is honest about the gap either way.
    var G = null;
    try { G = window.PDXGaps; } catch (e) {}
    return (G && typeof G.publicRecordGap === 'function') ? '＋ Suggest a lead' : '🧾 The public side';
  }
  function publicTally(r) {
    var p = (r && r.public) || {};
    var against = p.contradicting || 0, backs = p.supporting || 0, flags = p.flags || 0;
    var count = p.count || 0;
    var decided = !!(r && r.verdict && r.verdict.basis === 'public_record');
    var bits;
    if (!count) bits = [PUB_EMPTY];
    else {
      // Tension first. A reader scanning a column of these is looking for the rows
      // where the public record disagrees, and putting the agreements first buries
      // exactly the thing this line was added to surface.
      bits = [against + (against === 1 ? ' cuts against' : ' cut against'),
              backs + (backs === 1 ? ' backs it up' : ' back it up')];
      if (flags) bits.push(flags + ' red flag' + (flags === 1 ? '' : 's'));
    }
    var t = {
      lane: PUB_LANE, count: count, against: against, backs: backs, flags: flags,
      directional: against + backs,
      empty: count === 0, decided: decided,
      text: bits.join(' · '),
      tag: PUB_TAG,
      note: decided ? PUB_NOTE_DECIDED : PUB_NOTE
    };
    t.cta = _pubCta(t);
    return t;
  }
  // How many of a profile's issues have any public record behind them at all. A
  // count, deliberately, and never a ratio dressed as a result: it answers "does
  // this lane reach this profile" — the question a reader asks the first time they
  // meet a row reading "Nothing on file yet" and cannot tell whether that is this
  // issue or the whole feed. Takes an already-ranked row list where the caller has
  // one, because issueRows() is memoised per profile per epoch and there is no
  // reason for a section to pay for the same array twice.
  function publicCoverage(pid, rows) {
    var list = rows || issueRows(pid) || [];
    var n = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].public && list[i].public.count > 0) n++;
    }
    return { issues: n, total: list.length };
  }
  // The row's public line: the lane, the tally, the standing disclosure, and one tap
  // that lands on the public column of this issue's dossier rather than the top of
  // it. Deliberately built from different chrome than the verdict above it — no
  // verdict colour, no percentage slot, its own left rule — because "related but not
  // the same kind of thing" is the entire point and a matching chip would read as a
  // second grade.
  function _stPublicHtml(r) {
    var t = publicTally(r);
    var tip = t.text + ' — ' + t.note;
    return '<div class="pdxst-pub' + (t.empty ? ' pdxst-pub-0' : '') + '"' +
        ' data-pdxst-pub="' + (t.empty ? 'empty' : 'tally') + '"' +
        ' title="' + escAttr(tip) + '">' +
        '<span class="pdxst-pub-k">' + esc(t.lane) + '</span>' +
        '<span class="pdxst-pub-t">' + esc(t.text) + '</span>' +
        '<span class="pdxst-pub-tag">' + esc(t.tag) + '</span>' +
        '<button type="button" class="pdxst-pub-go"' +
          ' data-pdxst-dos="' + escAttr(r.key) + '" data-pdxst-pid="' + escAttr(r.pid) + '"' +
          ' data-pdxst-origin="' + escAttr(stanceRowId(r.pid, r.key)) + '"' +
          ' data-pdxst-focus="public"' +
          ' aria-label="' + escAttr(t.cta + ': ' + r.label + ' — ' + tip) + '">' +
          esc(t.cta) + '<span class="pdxst-lbl-go" aria-hidden="true">›</span>' +
        '</button>' +
      '</div>';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WHEN THE TWO LANES DISAGREE, SAID WHERE THEY MEET
  // ═══════════════════════════════════════════════════════════════════════════
  // The wall between the records is correct and it stays: the formal record decides
  // the issue and feeds ⚖️ Direction Match; the public record is a separate test of
  // the same stance and is never in that number. Both lanes are now stated on every
  // row and both are rendered side by side in the dossier — which means a reader can
  // now SEE them disagree, and until this they were left to explain it themselves.
  // The three readings they reach on their own are all wrong:
  //
  //   · "the site is contradicting itself" — it is showing two measurements
  //   · "one lane is correcting the other" — neither ever overrides the other
  //   · "so they were lying" — sometimes; a split is not by itself a lie
  //
  // That is the strongest teaching moment in the product and it was silent. So the
  // disagreement gets a short fixed explainer at the point of confusion.
  //
  // WHAT THIS IS NOT. It reaches no verdict, prints no number, and blends nothing:
  // it reads the row model both lanes already produced and selects one of six fixed
  // copy variants by SHAPE. There is no per-row curation here and no place to put
  // any — a row that lands in a shape gets that shape's words verbatim, so the
  // explanation cannot drift row to row for the same situation.
  //
  // THE FORMAL SIDE IS THE ACTION LANE, NOT THE ROW VERDICT. `basis` names which
  // record produced the row's verdict, and on a `public_record` row the formal lane
  // is precisely the one that could not decide — reading `verdict.token` there would
  // report the public lane's finding as the formal lane's and invent a disagreement
  // out of one lane talking to itself.
  var LANE_SHAPES = {
    // ── the formal record went one way and the public record went the other ──
    formal_against_public_backs: {
      head: 'Why both of these can be true',
      lead: 'The formal record cut against this position; the public record backs it up. ' +
        'Both readings can hold at once — what was said and defended in public is not what the signed instruments did.',
      chip: 'Two records, two readings'
    },
    formal_backs_public_against: {
      head: 'Why both of these can be true',
      lead: 'The formal record backs this position up; the public record carries sourced items cutting against it. ' +
        'An instrument can go one way while what was said around it goes another, and neither cancels the other out.',
      chip: 'Two records, two readings'
    },
    mixed_vs_onesided: {
      head: 'Why both of these can be true',
      lead: 'The formal record went both ways here; the public record points one way. ' +
        'A split in the instruments and a one-sided public picture are two different measurements, not a dispute about the facts.',
      chip: 'Two records, two readings'
    },
    // ── the public record is silent, which is not the same as agreeing ──
    formal_against_public_quiet: {
      head: 'What the quiet 🧾 side means here',
      lead: 'The formal record cut against this position; the public record has not been checked in on it. ' +
        'Silence on the 🧾 side neither confirms this reading nor softens it — the verdict rests on the instruments alone, which is where it would rest either way.',
      chip: '🧾 silence is not a clearance'
    },
    // ── the formal lane could not reach the question at all ──
    public_only: {
      head: 'Which record decided this one',
      lead: 'No formal instrument on file could test this position, so the reading here comes from the public record. ' +
        'It stays outside ⚖️ Direction Match either way — an issue the formal record cannot reach adds nothing to that figure.',
      chip: '🧾 decided this row, not the score'
    },
    // ── heat, which is not direction ──
    flags_only: {
      head: 'What the 🧾 red flag means here',
      lead: 'The public record on this issue is a red flag rather than a direction. ' +
        'A flag is a documented controversy, counted in its own slot — it is never added to either side of the formal reading.',
      chip: '🧾 a red flag, not a direction'
    }
  };
  // The two sentences that answer "what is each lane even for", printed under every
  // variant. Fixed, shared, and deliberately symmetrical: each names what its lane
  // can show AND what it cannot, because a reader who is told only the strengths
  // will read the stronger-sounding one as the real answer.
  var LANE_WHAT = [
    { ico: '🏛️', k: 'The formal record',
      v: 'Binding and dated — a law signed, an order issued, a vote cast. It shows what someone did with the power they held. It cannot show what they meant by it, and it is silent on any question that never reached an instrument.' },
    { ico: '🧾', k: 'The public record',
      v: 'Sourced but not binding — statements, interviews, reported controversies. It catches positions that never reached a vote, and pressure that never became law. It cannot make anything happen, and it is curated issue by issue, so silence here often means unchecked rather than absent.' }
  ];
  var LANE_FOOT = 'Neither record corrects the other and the two are never merged into one result. ' +
    'Only the formal record feeds the profile\'s ⚖️ Direction Match; the public record is never counted in it.';

  // ── THE DETECTOR ────────────────────────────────────────────────────────────
  // Ordered rules, first match wins, and every gate is a fact off the row model.
  // Returns null far more often than not: an explainer on a row where the lanes
  // agree, or where one of them has not finished loading, is furniture — and the
  // band only teaches while it is rare enough to still be read.
  function laneDisagreement(r) {
    if (!r || !r.verdict || !r.public) return null;
    var tok = r.verdict.token;
    // NOTHING TO EXPLAIN YET. A warming roll-call record has no formal reading to
    // set beside the public one, and a row with no stated position has nothing for
    // either lane to be about.
    if (tok === 'pending' || tok === 'no_stance') return null;
    try { if (r.ov && r.ov.token === 'pending') return null; } catch (e) {}

    var pub = r.public;
    var backs = pub.supporting || 0, agn = pub.contradicting || 0;
    var flags = pub.flags || 0, count = pub.count || 0;
    var pubDir = backs + agn;
    // The ACTION lane's own answer. Anything the formal lane did not decide reads as
    // 'none' here, including a row the public record decided.
    var formal = (r.verdict.basis === 'action' &&
      (tok === 'consistent' || tok === 'contradicts' || tok === 'mixed')) ? tok : 'none';

    var shape = null;
    // 1. The formal lane could not test the stance and the public lane has direction.
    if (formal === 'none' && pubDir > 0) shape = 'public_only';
    // 2. Heat with no direction behind it, beside a formal lane that did decide.
    else if (formal !== 'none' && pubDir === 0 && flags > 0) shape = 'flags_only';
    // 3. Formal cut against; the public record either backs the stance…
    else if (formal === 'contradicts' && backs > 0 && agn === 0) shape = 'formal_against_public_backs';
    //    …or has not been checked in at all. `count === 0` and not merely `agn === 0`:
    //    a public lane holding items that simply point elsewhere is a different
    //    situation from one nobody has looked at, and only the second is a gap.
    else if (formal === 'contradicts' && count === 0) shape = 'formal_against_public_quiet';
    // 4. Formal backed the stance up and the public record pushes back.
    else if (formal === 'consistent' && agn > 0) shape = 'formal_backs_public_against';
    // 5. Formal split, public one-sided. Both-sided public + mixed formal is two
    //    lanes reaching the same reading, which needs no explaining.
    else if (formal === 'mixed' && pubDir > 0 && (backs === 0 || agn === 0)) shape = 'mixed_vs_onesided';
    if (!shape) return null;

    var copy = LANE_SHAPES[shape];
    return { shape: shape, head: copy.head, lead: copy.lead, chip: copy.chip,
             formal: formal, backs: backs, against: agn, flags: flags, count: count };
  }

  // The full band, for the dossier: the shape's lead, then what each lane is for,
  // then the boundary. Rendered where the two columns meet, because that is where
  // the question occurs to a reader.
  function _laneBandHtml(r) {
    var g = laneDisagreement(r);
    if (!g) return '';
    var what = LANE_WHAT.map(function (w) {
      return '<div class="pdxlane-w">' +
        '<span class="pdxlane-w-k"><span aria-hidden="true">' + w.ico + '</span> ' + esc(w.k) + '</span>' +
        '<span class="pdxlane-w-v">' + esc(w.v) + '</span></div>';
    }).join('');
    return '<div class="pdxlane" data-pdxgap-lanes="' + escAttr(g.shape) + '">' +
        '<div class="pdxlane-h">' + esc(g.head) + '</div>' +
        '<div class="pdxlane-lead">' + esc(g.lead) + '</div>' +
        '<div class="pdxlane-ws">' + what + '</div>' +
        '<div class="pdxlane-foot">' + esc(LANE_FOOT) + '</div>' +
      '</div>';
  }
  // The same finding, compact, on the stance row — the lesson in a few words and a
  // door into the band, rather than the band repeated thirty-five times over. The
  // chip deliberately does NOT restate the tallies printed directly above it; it
  // says the thing those tallies cannot, which is what their disagreement means.
  var LANE_CTA = 'What that means';
  function _stLanesHtml(r) {
    var g = laneDisagreement(r);
    if (!g) return '';
    return '<div class="pdxst-lanes" data-pdxst-lanes="' + escAttr(g.shape) + '">' +
        '<span class="pdxst-lanes-c">' + esc(g.chip) + '</span>' +
        '<button type="button" class="pdxst-lanes-go"' +
          ' data-pdxst-dos="' + escAttr(r.key) + '" data-pdxst-pid="' + escAttr(r.pid) + '"' +
          ' data-pdxst-origin="' + escAttr(stanceRowId(r.pid, r.key)) + '"' +
          ' data-pdxst-focus="lanes"' +
          // The visible label is the same three words on every row, so the accessible
          // name has to carry what distinguishes this one — the shape's question and
          // the issue it is about. NOT the lead: a button whose accessible name is a
          // paragraph is read out in full on focus, and the paragraph is two taps
          // away in the band where a reader can choose to read it.
          ' aria-label="' + escAttr(LANE_CTA + ': ' + g.head + ' — ' + r.label) + '">' +
          esc(LANE_CTA) + '<span class="pdxst-lbl-go" aria-hidden="true">›</span>' +
        '</button>' +
      '</div>';
  }

  // ── THE CONNECTIONS ─────────────────────────────────────────────────────────
  // Each jump is offered only when there is something on the other end, and each
  // one aims at THIS ISSUE rather than at the top of a section: a reader who taps
  // "the record behind this" from Tariffs should land on the tariffs row, not on a
  // heading with eleven rows under it. The precise target is a data attribute the
  // delegated handler resolves at click time; `data-pdxst-target` is the section it
  // falls back to when the exact row has not been painted (or exists only inside a
  // fold that was never mounted).
  function _stGo(kind, target, r, label) {
    return '<button type="button" class="pdxst-go" data-pdxst-go="' + escAttr(kind) + '"' +
      ' data-pdxst-target="' + escAttr(target) + '"' +
      ' data-pdxst-pid="' + escAttr(r.pid) + '" data-pdxst-key="' + escAttr(r.key) + '">' +
      esc(label) + '</button>';
  }
  // Stable ids for the rows this section points AT. Both are emitted by the section
  // that owns the row (see _orInner and word-action.js), and both are built here so
  // the two ends of a jump can never drift apart.
  function _stSlug(v) { return String(v == null ? '' : v).replace(/[^A-Za-z0-9_-]/g, ''); }
  function orRowId(pid, issueKey) { return 'pdxor-row-' + _stSlug(pid) + '-' + _stSlug(issueKey); }
  function dvRowId(pid, issueKey) { return 'pdxdv-row-' + _stSlug(pid) + '-' + _stSlug(issueKey); }
  function wordActionRowId(pid, issueKey) { return 'pdxwa-oc-' + _stSlug(pid) + '-' + _stSlug(issueKey); }
  function stanceRowId(pid, issueKey) { return 'pdxst-row-' + _stSlug(pid) + '-' + _stSlug(issueKey); }

  // Where each jump actually lands. The exact row first, the section it lives in as
  // the fallback — a link that lands one screen off is still a link; a link that
  // lands nowhere is a broken promise.
  function _stTargets(kind, pid, key) {
    if (kind === 'or') return [orRowId(pid, key)];
    if (kind === 'wa') return [wordActionRowId(pid, key)];
    if (kind === 'ev') {
      var a = null;
      try { if (typeof window._pdxEvAnchor === 'function') a = window._pdxEvAnchor(pid, key); } catch (e) {}
      return a ? [a] : [];
    }
    return [];
  }
  function _stFocus(el) {
    if (!el || !el.classList) return;
    el.classList.add('pdxst-focus');
    setTimeout(function () { try { el.classList.remove('pdxst-focus'); } catch (e) {} }, 1800);
  }
  function _stNav(kind, section, pid, key) {
    // 🔍 leaves the profile entirely, for the same issue across everyone. The Issue
    // View is an overlay that returns the reader to exactly where they were, so it
    // needs no breadcrumb of ours.
    if (kind === 'issue') {
      try {
        var IV = window.PDXIssueView;
        if (IV && typeof IV.open === 'function') { IV.open(key); return; }
      } catch (e) {}
    }
    var list = _stTargets(kind, pid, key);
    var landed = '';
    for (var i = 0; i < list.length && !landed; i++) {
      // Mount first, ask second: the destination row may still be a deferred string
      // inside a fold nobody has opened. Without the reveal, the exact-row link would
      // silently degrade to the section link on every profile whose deep sections are
      // still folded — which is all of them, on first read.
      try { if (typeof window._pdxRevealTarget === 'function') window._pdxRevealTarget(list[i]); } catch (e) {}
      if (document.getElementById(list[i])) landed = list[i];
    }
    var target = landed || section;
    if (!target) return;
    if (typeof window._pdxNavJump === 'function') window._pdxNavJump(target);
    else { var el = document.getElementById(target); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (landed) setTimeout(function () { _stFocus(document.getElementById(landed)); }, 420);
    // THE WAY BACK. Cross-navigation that only goes one way turns into scrolling by
    // another name: a reader who follows three issues down into the Official Record
    // has to find their place in the stance list three times. The pill offers the
    // return trip explicitly, and takes itself down once they are home.
    _stShowBack(pid, key);
  }
  var _stBackEl = null, _stBackWatch = false;
  function _stShowBack(pid, key) {
    try {
      var origin = stanceRowId(pid, key);
      if (!document.getElementById(origin) || !document.body) return;
      if (!_stBackEl) {
        _stBackEl = document.createElement('button');
        _stBackEl.type = 'button';
        _stBackEl.className = 'pdxst-back';
        document.body.appendChild(_stBackEl);
      }
      _stBackEl.setAttribute('data-pdxst-back', origin);
      _stBackEl.innerHTML = '↩ Back to ' + esc(_issueLabel(key));
      _stBackEl.style.display = '';
      if (!_stBackWatch) {
        var body = document.getElementById('modal-body');
        if (body && body.addEventListener) {
          // Only latched once the listener is genuinely attached — the profile body
          // is the scroller, and marking this done before it exists would leave the
          // pill with no way to notice the reader had come back on their own.
          _stBackWatch = true;
          body.addEventListener('scroll', function () {
            // Once the row they left is back on screen, the offer is noise.
            if (!_stBackEl || _stBackEl.style.display === 'none') return;
            var el = document.getElementById(_stBackEl.getAttribute('data-pdxst-back') || '');
            if (!el || !el.getBoundingClientRect) return;
            var r = el.getBoundingClientRect();
            if (r.top < window.innerHeight && r.bottom > 0) _stHideBack();
          }, { passive: true });
        }
      }
    } catch (e) {}
  }
  function _stHideBack() { try { if (_stBackEl) _stBackEl.style.display = 'none'; } catch (e) {} }
  // Down it goes if the row it offers to return to is no longer on the page.
  function _stBackSweep() {
    try {
      if (!_stBackEl || _stBackEl.style.display === 'none') return;
      if (!document.getElementById(_stBackEl.getAttribute('data-pdxst-back') || '')) _stHideBack();
    } catch (e) {}
  }
  function _stBack(originId) {
    _stHideBack();
    if (!originId) return;
    try { if (typeof window._pdxRevealTarget === 'function') window._pdxRevealTarget(originId); } catch (e) {}
    if (typeof window._pdxNavJump === 'function') window._pdxNavJump(originId);
    else { var el = document.getElementById(originId); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    setTimeout(function () { _stFocus(document.getElementById(originId)); }, 420);
  }

  function _stRowHtml(r) {
    var txt = r.stance.text ? String(r.stance.text) : '';
    if (txt.length > 190) txt = txt.slice(0, 187).replace(/\s+\S*$/, '') + '…';
    var res = _stResult(r);
    var n = _stNoun(r);
    var links = [];
    // ⚖️ where this issue lands inside the one score. Offered on any row the score
    // could see — tested rows and the thin ones it had to set aside — because "why
    // is this issue not in the number" is the same question as "where is it".
    if (r.tested || r.verdict.token === 'limited') {
      links.push(_stGo('wa', 'pdxsec-wordaction', r, '⚖️ Where this lands in the score'));
    }
    // 🏛️ the SAME issue in the Official Record, not the top of it.
    if (r.evidence.actions > 0 || r.scored) {
      links.push(_stGo('or', 'pdxsec-official-record', r,
        '🏛️ ' + r.evidence.actions + ' ' + (r.evidence.actions === 1 ? n.one : n.many) + ' on record'));
    }
    if (r.evidence.public > 0) {
      links.push(_stGo('ev', 'pdxsec-evidence', r,
        '🧾 ' + r.evidence.public + ' public receipt' + (r.evidence.public === 1 ? '' : 's')));
    }
    var skin = _icSkin(r.key);
    // 🔍 the issue itself, across everyone — offered only for a key that resolves to
    // a Core National Issue, because that is the only vocabulary the Issue View can
    // rank, and a link into an empty ranking is worse than no link.
    if (skin.on) links.push(_stGo('issue', '', r, '🔍 Everyone on this issue'));
    return '<div class="pdxst-row' + skin.cls + '" style="' + skin.style + '"' +
        ' id="' + escAttr(stanceRowId(r.pid, r.key)) + '"' +
        ' data-pdxst-issue="' + escAttr(r.key) + '" data-pdxst-tier="' + escAttr(String(r.tier)) + '"' +
        ' data-pdxst-state="' + escAttr(res.state) + '">' +
        '<div class="pdxst-row-top">' +
          // THE ISSUE NAME IS THE WAY IN. It was a label; it is now the row's primary
          // tap, and it opens this issue's dossier — one panel holding everything
          // known about this politician on this issue. The row keeps every link it
          // had underneath: this adds the assembled view, it does not replace the
          // jumps into the sections. The row id travels with the tap so closing the
          // dossier returns the reader to this exact row.
          '<button type="button" class="pdxst-lbl pdxst-open"' +
            ' data-pdxst-dos="' + escAttr(r.key) + '" data-pdxst-pid="' + escAttr(r.pid) + '"' +
            ' data-pdxst-origin="' + escAttr(stanceRowId(r.pid, r.key)) + '"' +
            ' aria-label="' + escAttr(_dosDoorLabel(r.label, res.bucket, r.stance.label)) + '">' +
            _icDot(skin) + esc(r.label) +
            '<span class="pdxst-lbl-go" aria-hidden="true">›</span>' +
          '</button>' +
          (r.stance.label ? _orStanceChip(r.pid, r.key) : '') +
        '</div>' +
        _stResultHtml(r, res) +
        _stCompHtml(r, res) +
        // BOTH LANES, ONE GLANCE. The formal result above, the public tally here —
        // always, including when there is nothing on file, because an absent line and
        // an empty lane are indistinguishable and only one of them is true.
        _stPublicHtml(r) +
        // AND WHAT IT MEANS WHEN THEY DISAGREE. Directly under the two lanes, on the
        // rows where the reader can see them split — one line, and a way into the
        // full explainer rather than the full explainer thirty-five times over.
        _stLanesHtml(r) +
        _stEvidenceHtml(r) +
        (txt ? '<div class="pdxst-txt">' + esc(txt) + '</div>' : '') +
        (links.length ? '<div class="pdxst-links">' + links.join('') + '</div>' : '') +
      '</div>';
  }
  function _stInner(pid) {
    var ranked = rankIssueRows(issueRows(pid));
    if (!ranked.length) return '';
    var byTier = {};
    ranked.forEach(function (r) { (byTier[r.tier] = byTier[r.tier] || []).push(r); });
    var live = _ST_GRP.filter(function (g) { return g.tiers.some(function (t) { return (byTier[t] || []).length; }); });
    if (!live.length) return '';
    var blockOf = function (g, cap) {
      var rows = [];
      // "Tested — and the record backs it up" is the right heading for a row the
      // record backed up. It was also, until now, the heading over every `limited`
      // row: same tier, sorted to the end, no visible line between a verdict and a
      // shrug. The divider draws that line without moving a row, so the fold maths
      // below — and the lead cap it feeds — count exactly what they counted before.
      //
      // TWO POPULATIONS SHARE THAT TOKEN, and only one of them is thin. `limited`
      // also covers the rows where the record is deep and mapped and we simply hold
      // no stated position to test it against — the majority case, and the one this
      // pass gave a record-direction line to. Printing "Too thin to judge yet" over
      // a row that now reads "14 votes on file — 11 cut against it, 3 advanced it"
      // is the same false sentence about their record the row face stopped telling.
      // So the divider label follows the row's shape, and re-prints whenever the
      // shape changes: a homogeneous run still gets exactly one divider, in exactly
      // the place it got one before, and no row moves to make it true.
      var lastSub = null;
      g.tiers.forEach(function (t) {
        (byTier[t] || []).forEach(function (r) {
          var html = _stRowHtml(r);
          if (r.verdict && r.verdict.token === 'limited') {
            var sub = (_stResult(r).shape === 'no_stance')
              ? 'On the record — nothing stated to test it against'
              : 'Too thin to judge yet';
            if (sub !== lastSub) {
              lastSub = sub;
              html = '<div class="pdxst-sub">' + esc(sub) + '</div>' + html;
            }
          }
          rows.push(html);
        });
      });
      var body = rows.join('');
      // A LEAD IS A LEAD, NOT A LIST. The open groups are tension first, then the
      // issues the record backs up, and on a densely-seeded figure the second one
      // grows without bound: wave 4 of the executive record took the president's
      // tested tier to eighteen rows, and nineteen open rows is the wall this layer
      // exists to replace. So an open group shows its first few and folds the
      // remainder behind the same lid the closed groups already use — the rows are
      // one tap away, and the group header still counts all of them, so nothing is
      // hidden about how much there is. Only the backs-it-up group is capped: the
      // tension group is the reason to read the section at all.
      if (cap && rows.length > cap + 1) {
        var over = rows.length - cap;
        body = rows.slice(0, cap).join('') +
          '<!--PDXSP:lid id="st-open-' + g.tiers.join('-') + '" label="Show ' + over +
          ' more issue' + (over === 1 ? '' : 's') + ' the record backs up" defer-->' +
          rows.slice(cap).join('') + '<!--PDXSP:/lid-->';
      }
      return '<div class="pdxst-grp"><div class="pdxst-grp-h">' + esc(g.label) + ' · ' + rows.length + '</div>' + body + '</div>';
    };
    var tested = ((byTier[0] || []).length) + ((byTier[1] || []).length);
    var head =
      '<div class="pdxst-head"><span class="pdxst-title"><span aria-hidden="true">🧭</span> Stances &amp; Connections</span>' +
        LHOWTO('say-vs-do', 'How to read this') + '</div>' +
      '<div class="pdxst-q">“What do they stand for — and does anything actually test it?”</div>' +
      _feedsPrimaryHtml('The map of what they claim, ranked so the claims something can check come first. ' +
        'Each row states what the record concluded on THAT issue, and how much of that issue\'s record pointed the same way as the position. ' +
        'These are issue-level results, one issue at a time — the profile\'s single score is the pooled one in ⚖️ Word vs Action.');
    // Explicit wrappers, not .map(blockOf): Array#map passes the index as the second
    // argument, which would arrive as `cap` and fold whichever group happened to sit
    // at a non-zero position.
    var lead = live.filter(_stOpen).map(function (g) {
      return blockOf(g, g.tiers.indexOf(0) === -1 ? _ST_LEAD_CAP : 0);
    }).join('');
    var restGrps = live.filter(function (g) { return !_stOpen(g); });
    var rest = '';
    if (restGrps.length) {
      var restN = restGrps.reduce(function (n, g) {
        return n + g.tiers.reduce(function (m, t) { return m + ((byTier[t] || []).length); }, 0);
      }, 0);
      rest = '<!--PDXSP:lid id="st-rest" label="Show ' + restN + ' more position' + (restN === 1 ? '' : 's') +
        ' with nothing to test them yet" defer-->' +
        restGrps.map(function (g) { return blockOf(g, 0); }).join('') + '<!--PDXSP:/lid-->';
    }
    var cov = '<div class="pdxcov">📊 <b>' + tested + '</b> of <b>' + ranked.length + '</b> tracked position' +
      (ranked.length === 1 ? '' : 's') + ' ' + (tested === 1 ? 'has' : 'have') + ' a formal or public record behind ' +
      (tested === 1 ? 'it' : 'them') + '.</div>';
    // THE WALL, IN FULL, ONCE. Every row carries the short form of this ("Not in
    // Direction Match") because a reader can land on any single row from a deep link
    // and must not have to scroll for the caveat. The whole sentence is stated here,
    // where it is read once instead of thirty-five times, together with how much
    // public record this profile actually has — a count is the honest way to say
    // "this lane exists and is uneven" without implying it is a score.
    var pc = publicCoverage(pid, ranked);
    var wall = '<div class="pdxst-wall"><b>' + esc(PUB_LANE) + ' · ' + pc.issues + ' of ' + pc.total +
      ' issue' + (pc.total === 1 ? '' : 's') + '</b> ' + esc(PUB_NOTE) +
      ' The formal percentage is the only scored figure on a row.</div>';
    return head + cov + wall + lead + rest;
  }
  function stancesSectionHtml(pid) {
    ensureStyles();
    // The rows carry delegated jump buttons now, so the section has to arm the one
    // click listener the same way every other interactive section here does.
    bindGateway();
    if (!pid) return '';
    var inner = _stInner(pid);
    if (!inner) return '';
    return '<span id="pdxsec-stances" class="pdx-nav-anchor" aria-hidden="true"></span>' +
      '<section class="pdxst" data-pdxc-stances-pid="' + esc(pid) + '" aria-label="Stances and connections">' +
      inner + '</section>';
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
  // ── WHICH WAY A PUBLIC-RECORD ITEM CUT ──────────────────────────────────────
  // The three answers the 🧾 lane can give about one item, in the house's own
  // direction vocabulary. `flag` is the honest third option and the reason this map
  // exists rather than a boolean: a documented red flag is real, sourced and worth
  // a reader's attention, and it is NOT evidence for or against the stated position
  // — so it says "context only" instead of borrowing either of the other two words.
  //
  // 'Cuts against' rather than VERDICTS.contradicts.label ('Says one thing, does
  // another'): that phrase is the verdict on a whole ISSUE, assembled from
  // everything on file, and printing it beside a single item would let one receipt
  // read as the issue's conclusion. The direction word is the item-level claim.
  var _SD_DIR = {
    consistent:  { word: 'Backs it up',  say: 'runs WITH the position they stated on ' },
    contradicts: { word: 'Cuts against', say: 'runs AGAINST the position they stated on ' },
    flag:        { word: 'Context only', say: '' }
  };
  // Public-record receipts behind a Say-vs-Do stance, as an array of row HTML (each
  // sourced, contradictions first). Shared by the feed's <details> and the gap drawer.
  //
  // `opts.full` renders the TEACHABLE FACE — the same four fixed slots the 🏛️ side
  // gives every formal action (_dosRowHtml): what they said, what is on file, why it
  // counts on this issue, which way it cut. Every one of those was already carried on
  // the receipt (`said`, `facts`, `why`, `verdict`) and none of them were rendered:
  // the dossier's public lane showed a coloured glyph, a headline and a link, beside
  // a formal lane that explains its mechanism line by line. Nothing new is invented
  // here and no item is added — the same items grow the face the other lane has.
  //
  // Without the flag the compact one-line form is unchanged, which is what the
  // dedicated Say-vs-Do feed's <details> list still wants: there the reader is
  // scanning many issues, not studying one.
  function _sdEvidenceItems(cur, opts) {
    if (!cur || !cur.items || !cur.items.length) return [];
    var full = !!(opts && opts.full);
    var items = cur.items.slice().sort(function (a, b) {
      var ak = (a.verdict && a.verdict.key) || 'flag', bk = (b.verdict && b.verdict.key) || 'flag';
      return (_SD_ITEM_RANK[ak] == null ? 9 : _SD_ITEM_RANK[ak]) - (_SD_ITEM_RANK[bk] == null ? 9 : _SD_ITEM_RANK[bk]);
    });
    return items.map(function (r) {
      var vk = (r.verdict && r.verdict.key) || 'flag';
      var mv = VERDICTS[vk] || VERDICTS.flag;
      var url = r.source && r.source.url;
      var src = url ? ' <a href="' + esc(url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">' + esc((r.source && r.source.label) || 'Source') + ' ↗</a>' : '';
      var meta = [];
      if (r.date) meta.push(esc(r.date));
      if (r.category) meta.push(esc(r.category));
      var metaHtml = meta.length ? ' <span style="color:#7e93b3;">· ' + meta.join(' · ') + '</span>' : '';
      var head = '<span class="pdxor-act-ico" style="color:' + mv.color + '" aria-hidden="true">' + mv.ico + '</span>' +
        '<span>' + esc(r.headline || 'Public-record item') + metaHtml + src + '</span>';
      if (!full) return '<div class="pdxor-act">' + head + '</div>';

      var dir = _SD_DIR[vk] || _SD_DIR.flag;
      var lbl = _issueLabel(r.issueKey) || '';
      var wk = function (label, text) {
        return text
          ? '<span class="pdxdos-rec-why">' + (label ? '<b class="pdxdos-rec-wk">' + label + '</b> ' : '') +
              esc(text) + '</span>'
          : '';
      };
      // ORDER IS THE ARGUMENT, and it is the 🏛️ side's argument in this lane's
      // materials: what they SAID, then what is ON FILE against it, then why this
      // issue is the right file for it, then which way it cut. A reader who has just
      // read six formal actions meets the same four questions in the same order.
      var said = (r.said && (r.said.text || '').trim()) ? r.said.text : '';
      var cut = dir.say
        ? 'This item ' + dir.say + (lbl || 'this issue') + '.'
        : 'A documented red flag on the public record. It is not counted for or against ' +
          'the stated position — it is here as context.';
      return '<div class="pdxor-act pdxsd-act">' + head +
        '<span class="pdxsd-dir" style="color:' + mv.color + '">' + esc(dir.word) + '</span>' +
        wk('They said:', said) +
        wk('What is on file:', r.facts) +
        wk('Why it counts here:', r.why) +
        wk('Which way it cuts:', cut) +
      '</div>';
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

  // ── THE EMPTY 🧾 SIDE, MADE INTO A DOOR ──────────────────────────────────────
  // An empty public-record lane is a real and common state — on the current
  // presidential profile it is 33 of 35 issue sheets — and until now it was a wall:
  // three true sentences about our coverage and no way to act on any of them, sitting
  // beside a formal column that had enumerated nine actions and explained each one.
  // That asymmetry is the trust cliff. What is missing here is not a paragraph, it is
  // a next step.
  //
  // Two are offered, in this order, and both were already built:
  //
  //   1. THE GAP ITSELF. PDXGaps has one job — say what we do not hold and hand the
  //      reader a clean way to help us find it — and it already owns the taxonomy,
  //      the `gap:<pid>:<slug>` thread target, the lead composer and the moderation
  //      round trip. So this renders a real PDXGaps row rather than a lookalike:
  //      one contribution system, one queue, one set of words.
  //   2. WHERE IT IS NOT MISSING. If we hold public-record items for this figure on
  //      OTHER issues, saying so — and opening the strongest of them — turns "we
  //      have nothing" into "we have nothing HERE", which is the true claim and the
  //      more useful one. Derived from the same receipts, capped at one door.
  //
  // Fails closed at every step: no PDXGaps, no gap row; no other issue with evidence,
  // no second line; a throw anywhere leaves the three sentences above standing alone,
  // which is exactly the state this shipped in.
  function _sdGapHtml(pid, issueKey) {
    var out = '';
    try {
      var G = window.PDXGaps;
      if (G && typeof G.publicRecordGap === 'function' && typeof G.rowHtml === 'function') {
        var g = G.publicRecordGap(pid, issueKey, null);
        var row = g ? G.rowHtml(g) : '';
        if (row) out += '<ul class="pdxg-list pdxgap-solo-gap">' + row + '</ul>';
      }
    } catch (e) {}
    try { out += _sdElsewhereHtml(pid, issueKey); } catch (e2) {}
    return out;
  }

  // "Not here" is not "not anywhere". Counts this figure's Say-vs-Do-eligible
  // receipts on OTHER issues and offers the strongest one as a door — the same
  // data-pdxc-gap door every other cross-issue link in this sheet uses, so it is
  // routed by the one delegated handler and cannot become a dead button. Ordered by
  // the receipt score collect() already assigned (contradictions first), and the
  // target must carry a real index bucket or it gets no link at all.
  function _sdElsewhereHtml(pid, issueKey) {
    var R = window.PDXReceipts;
    if (!R || typeof R.collect !== 'function') return '';
    var seen = {}, keys = [], best = null, n = 0;
    var all = R.collect() || [];
    for (var i = 0; i < all.length; i++) {
      var r = all[i];
      if (!r || !r.issueKey || r.issueKey === issueKey) continue;
      if (!samePol(r.pid, pid) || !isSaydoReceipt(r)) continue;
      n++;
      if (!seen[r.issueKey]) { seen[r.issueKey] = 1; keys.push(r.issueKey); }
      if (!best && _bucketAt(pid, r.issueKey)) best = r.issueKey;
    }
    if (!n) return '';
    var who = '';
    try { who = (_gapIdentity(pid) || {}).name || ''; } catch (e) {}
    var door = best
      ? '<button type="button" class="pdxgap-nx pdxgap-solo-nx" data-pdxc-gap="' + esc(best) +
          '" data-pdxc-gap-pid="' + esc(pid) + '">' +
          '<span class="pdxgap-nx-ico" aria-hidden="true">🧾</span>' +
          '<span>See it on ' + esc(_issueLabel(best)) + ' <span aria-hidden="true">→</span></span></button>'
      : '';
    return '<div class="pdxgap-solo-el">We do hold <b>' + n + '</b> public-record ' +
      (n === 1 ? 'item' : 'items') + ' for ' + (who ? esc(who) : 'this figure') + ' on <b>' + keys.length + '</b> other ' +
      (keys.length === 1 ? 'issue' : 'issues') + ' — the gap is this issue, not the record.' + door + '</div>';
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
        var skin = _icSkin(s.key);
        return '<div class="pdxor-issue' + skin.cls + '" style="' + skin.style + '">' +
            '<div class="pdxor-issue-top">' +
              '<span class="pdxor-issue-lbl">' + _icDot(skin) + esc(_issueLabel(s.key)) + '</span>' +
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
  // THE TWO RECORDS' RELATIONSHIP TO EACH OTHER — a different question from any issue
  // result, and now worded so it cannot be mistaken for one. The middle band was
  // labelled "Mixed", which is one of the four words the issue index uses for a
  // RESULT; on a divergence row that sits beside a door reading "Backed up", the same
  // reader met one word meaning two things. These three say what they measure — how
  // far apart the vote record and the public record sit — and nothing about whether
  // either backed the word. Keys, thresholds and colours are untouched.
  var DIV_REL = {
    aligned:  { key: 'aligned',  label: 'Same story',   ico: '=', color: '#6ee7a0', blurb: 'Their votes and their public record tell the same story here.' },
    mixed:    { key: 'mixed',    label: 'Some daylight', ico: '≈', color: '#93c5fd', blurb: 'Their votes and public record mostly line up, with some daylight.' },
    diverges: { key: 'diverges', label: 'Different stories', ico: '≠', color: '#f5c842', blurb: 'Their votes and their public record tell different stories here.' }
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
    // EVERY ROW IS THE SAME DOOR. Only diverging and mixed rows used to be tappable —
    // "aligned rows have no gap to explain" — but the destination is not an explanation
    // of the gap, it is the issue's assembled record, and a reader who wants that on an
    // aligned issue was the one reader this list refused. The gate is now the only
    // honest one: does a dossier resolve for this issue at all.
    //   The relationship chip stays in ITS own vocabulary. Aligned / Mixed / Diverges
    // answers "do the two records agree with each other", which is a different question
    // from "did the record back the word" — the bucket word is carried on the door
    // instead, so the two never sit side by side pretending to be the same claim.
    var o = _bucketAt(pid, p.key);
    var skin = _icSkin(p.key);
    var body =
        '<div class="pdxdv-row-lbl">' + _icDot(skin) + esc(_issueLabel(p.key)) + '</div>' +
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
    if (o) {
      return '<button type="button" class="pdxdv-row pdxdv-row-tap' + skin.cls + '" style="' + skin.style + '"' +
          ' id="' + escAttr(dvRowId(pid, p.key)) + '"' +
          ' data-pdxc-gap="' + esc(p.key) + '" data-pdxc-gap-pid="' + esc(pid) + '"' +
          ' data-pdxc-gap-origin="' + escAttr(dvRowId(pid, p.key)) + '"' +
          ' aria-label="' + escAttr(_dosDoorLabel(_issueLabel(p.key), o, '')) + '">' +
          body + '<span class="pdxdv-row-why">' + esc(o.short) +
          ' — open the issue dossier <span aria-hidden="true">→</span></span></button>';
    }
    return '<div class="pdxdv-row' + skin.cls + '" style="' + skin.style + '"' +
      ' id="' + escAttr(dvRowId(pid, p.key)) + '">' + body + '</div>';
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
    // Counted in the same words the row chips use, so the tally and the rows below it
    // cannot read as two different classifications of the same issues.
    if (c.aligned) chips.push('<b style="color:' + DIV_REL.aligned.color + '">' + c.aligned + '</b> telling the same story');
    if (c.mixed) chips.push('<b style="color:' + DIV_REL.mixed.color + '">' + c.mixed + '</b> with some daylight');
    if (c.diverges) chips.push('<b style="color:' + DIV_REL.diverges.color + '">' + c.diverges + '</b> telling different stories');
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

  // ══ THE ISSUE DOSSIER ═══════════════════════════════════════════════════════
  // One issue, one assembled place. A reader who taps a stance row lands here and
  // everything PolitiDex knows about THIS politician on THAT issue is in this one
  // panel — but arranged so they meet it a level at a time, in the direction they
  // choose, instead of as a wall.
  //
  //   L1  The assembled answer, open.       What they said · what the record
  //       concluded · which lane decided it · how much is behind it · what was
  //       set aside · where it lands in the profile score.
  //   L2  The instruments, closed.          Every vote or action on this issue —
  //       identity, direction, standing, one line of why it counts.
  //   L3  One instrument, closed.           Its mechanism, its primary source, how
  //       much of the document the link rests on, and what else it touched.
  //   L4  The receipt, closed inside L3.    The curation rationale, in full.
  //
  // Each level answers a DIFFERENT question. L2 is not "L1 again with more rows":
  // L1 is a conclusion and L2 is an enumeration. L3 is not "L2 with longer text":
  // L2 says which instrument, L3 says how it works. That is the test a new line has
  // to pass before it earns a place at any level.
  //
  // Two things this deliberately does NOT do. It mints no second score — every
  // verdict, percentage, tally and standing shown here is read off the row model
  // and the lane engines that already produced them. And it does not pretend the
  // two lanes are the same depth: an executive document carries a curated
  // per-issue explanation, a standing and a rationale, and a roll call carries the
  // question and the vote. The congressional lane is reported thin, not padded.

  // Why a held executive action is not scored, in the reader's language. Held record
  // is real, sourced record — listing it with its reason is how a thin issue explains
  // itself instead of merely looking empty.
  var _DOS_HOLD = {
    unmapped_direction: 'Not scored: which way this document cuts on this issue could not be read cleanly, and a mapping that cannot be read is coverage, never a guess.',
    no_standing: 'Not scored: where this stands today is not verified. An action whose standing is unknown cannot carry a verdict — it can still be listed.',
    circular: 'Not scored: this document is the same statement the stated position was taken from, so scoring it would check a claim against itself.'
  };
  function _dosMapping(item, issueKey) {
    var all = (item && item.issues) || [];
    for (var i = 0; i < all.length; i++) if (all[i] && all[i].issueKey === issueKey) return all[i];
    return null;
  }
  // The name on the row head, built from what the file already carries. Both forms
  // when there are two — see the note at the call site.
  function _dosIdent(it) {
    var id = (it && it.documentId) || '';
    var mn = (it && it.measureNumber) || '';
    if (id && mn && id.indexOf(mn) === -1) return id + ' (' + mn + ')';
    return id || mn || (it && it.title) || 'Executive action';
  }
  // The narrow-link threshold is the ✒️ section's, read from it rather than copied,
  // so the two surfaces cannot disagree about how much of a document a claim rests on.
  function _dosNarrowAt() {
    try {
      var U = window.PDXExecRecordUI;
      if (U && typeof U.NARROW_AT === 'number') return U.NARROW_AT;
    } catch (e) {}
    return 45;
  }
  function _dosStanding(key) {
    try {
      var S = window.PDXExecRecord && window.PDXExecRecord.STANDING, d = S && S[key];
      if (d) return { key: key, label: d.label || '', ico: d.ico || '', contested: !!d.contested, why: d.short || '' };
    } catch (e) {}
    return null;
  }
  // WHAT "IN FORCE" MEANS DEPENDS ON WHAT THE ACTION WAS. The standing vocabulary is
  // shared with the ✒️ section and is written from the action's point of view: for a
  // veto, `in_force` means THE VETO held, so the measure never became law. On a row
  // whose identity is the bill number and whose title is the bill's title, the words
  // "● In force" underneath read as a claim about the BILL — the exact opposite of
  // what the token says. So a blocking class gets the same fact in its own terms.
  // This is a relabel at the display layer only: the token, the contested flag and
  // everything the score reads are untouched, and every other class passes through.
  function _dosStandingFor(actionClass, key) {
    var s = _dosStanding(key);
    var p = _dosPower(actionClass);
    if (!s || !p || !p.blocks) return s;
    if (s.key === 'in_force') {
      return { key: s.key, label: 'Veto held', ico: s.ico, contested: false,
        why: 'The veto held: Congress did not override it, so the measure did not become law.' };
    }
    return s;
  }
  function _dosPower(actionClass) {
    try {
      var C = window.PDXExecRecord && window.PDXExecRecord.CLASSES, d = C && C[actionClass];
      if (d) {
        return { key: d.key || actionClass, verb: d.verb || '', label: d.label || '',
                 sole: d.authorship === 'sole', blocks: !!d.blocks };
      }
    } catch (e) {}
    return null;
  }
  function _dosMulti(d) {
    try { return !!(d && d.item && d.item.issues && d.item.issues.length > 1); } catch (e) { return false; }
  }

  // ── the row face's sentence budget ──────────────────────────────────────────
  // Curated prose arrives in two very different lengths. The ✒️ lane's per-issue
  // `plain` is already written to fit a row (the seed gate caps it at 320 chars and
  // bans code citations). The migrated formal lane's `facts` is not — it is a full
  // paragraph, often with dates, section numbers and quoted findings in it, written
  // for the accountability feed rather than for a summary row.
  //   So the face takes the FIRST SENTENCE and the tap takes the rest. This is a
  // truncation, never a rewrite: the sentence is lifted verbatim, and when it is cut
  // for length it is cut at a word boundary with an ellipsis, so a reader can always
  // tell that more text exists. The untouched paragraph is still rendered in full one
  // level down, so nothing curated is lost — it is only deferred.
  function _dosLead(text, cap) {
    var s = String(text == null ? '' : text).trim();
    if (!s) return '';
    cap = cap || 240;
    // Sentence break: a terminator followed by whitespace and a capital / quote /
    // bracket. Abbreviations ("U.S.", "No. 14") do not match, because the character
    // after the space has to open a new sentence.
    var m = s.match(/^[\s\S]*?[.!?](?=\s+["“(\[]?[A-Z0-9])/);
    var lead = m ? m[0] : s;
    if (lead.length <= cap) return lead;
    lead = lead.slice(0, cap).replace(/\s+\S*$/, '');
    return lead + '…';
  }

  // ── L2's data ───────────────────────────────────────────────────────────────
  // One normalised entry per instrument behind this issue — DATA, no markup — so the
  // summary rows, the lazily-mounted detail and the tests all read one list. Lane
  // precedence matches officialIssue()'s: a scorable executive pool answers for the
  // ✒️ lane, otherwise the roll-call record, otherwise migrated curated actions.
  // Held executive record is appended in every case, because a filter that hides its
  // own exclusions makes a partial record look complete.
  function _dosItems(pid, issueKey, ov) {
    ov = ov || officialIssue(pid, issueKey);
    var out = [], narrowAt = _dosNarrowAt();
    var pool = ov.execPool || ov.execHeld || null;
    var withMapping = function (item, base) {
      var m = _dosMapping(item, issueKey);
      base.primary = m ? !!m.isPrimary : null;
      base.narrow = !!(m && typeof m.weight === 'number' && m.weight <= narrowAt);
      // The raw support meaning, carried rather than re-derived. It is what turns a
      // ballot into a direction on THIS issue ("a Yea here counts as support"), and
      // the mechanism line below has to be able to say that in words.
      base.support = (m && m.supportMeaning) || '';
      base.item = item;
      base.multi = !!(item && item.issues && item.issues.length > 1);
      return base;
    };
    if (pool && pool.items && pool.items.length) {
      var xStance = positionStance(pid, issueKey);
      pool.items.forEach(function (it) {
        var m = _dosMapping(it, issueKey);
        // Which way the DOCUMENT cuts on this issue. The mapping describes the
        // measure and `advanceInverted` is the correction a blocking class (a veto)
        // needs — the same field the shared summariser applies, read here rather
        // than re-derived, so a veto cannot read one way in the ledger and the
        // other way in the dossier.
        var adv = m ? (m.supportMeaning !== 'yea_opposes') : null;
        if (adv !== null && it.advanceInverted) adv = !adv;
        out.push(withMapping(it, {
          lane: 'exec',
          verdict: _orItemVerdict(it, issueKey, xStance),
          held: '', heldWhy: '',
          // Both names, when the file carries both. A signed law is on file under its
          // public-law number, which is the citation — and which is also the one name
          // no reader recognises. "Public Law 119-21" and "H.R. 1" are the same
          // instrument; only the second is searchable, only the second is what the
          // 🏛️ lane and the news called it, and a row that prints only the first asks
          // the reader to already know the bill before the mechanism lines can teach
          // them anything. Appended only when the id does not already contain it, so
          // a vetoed bill filed as "H.R. 6395 (116th Congress)" is not doubled.
          ident: _dosIdent(it),
          title: it.title || '',
          act: (_dosPower(it.actionClass) || {}).verb || '',
          question: '',
          date: it.date || '',
          standing: _dosStandingFor(it.actionClass, it.standing),
          power: _dosPower(it.actionClass),
          effect: (adv === null) ? '' : (adv ? 'advances' : 'opposes'),
          // Which way the STATED POSITION points on this issue. Carried because the
          // direction line has to say how the document's direction and the stated
          // direction combine into the verdict on the chip — and `effect` alone
          // cannot: it is measured against the issue, not against what they said, so
          // a row could truthfully say "cuts against the issue" beside a chip reading
          // "Backs it up" whenever the stated position was against the issue too.
          stance: xStance || '',
          plain: it.plain || '',
          counts: (m && m.counts) || '',
          rationale: (m && m.rationale) || '',
          url: it.sourceUrl || '', srcLabel: it.sourceLabel || 'Primary source'
        }));
      });
    } else if (ov.record) {
      var _recStance = positionStance(pid, issueKey) || '';
      _orProofPicks(pid, issueKey, ov).forEach(function (p) {
        var b = _orProofBits(p.item) || {};
        out.push(withMapping(p.item, {
          lane: 'record',
          verdict: p.verdict,
          held: '', heldWhy: '',
          ident: b.bill || b.title || (b.isPosition ? 'Formal action' : 'Recorded vote'),
          title: p.item.title || p.item.shortTitle || '',
          act: b.act || '', question: b.question || '',
          date: b.date || '',
          standing: null, power: null, effect: '', stance: _recStance,
          // A roll call carries no curated prose, so both mechanism lines are
          // DERIVED — see _dosMechanism. What it did is the question and the ballot,
          // which the record does carry; why it counts here is a restatement of the
          // issue mapping. Neither invents anything the record does not record.
          plain: '', counts: '', rationale: '',
          url: b.url || '', srcLabel: b.label || 'Congress.gov',
          voteKey: _orVoteKey(p.item)
        }));
      });
    } else if (ov.officialActions && ov.officialActions.items) {
      var _faStance = positionStance(pid, issueKey) || '';
      ov.officialActions.items.forEach(function (a) {
        // The migrated formal action's curated prose, split by length rather than by
        // rewriting: the opening sentence of `facts` is what it did, `why` is why it
        // counts, and the full paragraph stays available at L4 whenever the face is
        // showing less than all of it.
        var lead = _dosLead(a.facts, 240);
        out.push(withMapping(a, {
          lane: 'formal',
          verdict: a.verdict || 'limited',
          held: '', heldWhy: '',
          ident: a.headline || 'Formal action',
          title: '', act: '', question: '',
          date: a.date || '',
          standing: null, power: null, effect: '', stance: _faStance,
          plain: lead,
          counts: a.why || '',
          rationale: (a.facts && a.facts !== lead) ? a.facts : '',
          url: a.sourceUrl || '', srcLabel: a.sourceLabel || 'Source'
        }));
      });
    }
    if (pool && pool.held && pool.held.length) {
      pool.held.forEach(function (h) {
        out.push({
          lane: 'exec',
          verdict: '', held: h.reason || 'held',
          heldWhy: _DOS_HOLD[h.reason] ||
            'Not scored: this document could not be judged against the stated position.',
          ident: h.documentId || h.title || 'Executive action',
          title: h.title || '',
          act: (_dosPower(h.actionClass) || {}).verb || '',
          question: '', date: h.date || '',
          standing: null, power: _dosPower(h.actionClass), effect: '', stance: '',
          plain: h.plain || '', counts: '', rationale: '',
          url: h.sourceUrl || '', srcLabel: h.sourceLabel || 'Primary source',
          primary: null, narrow: false, multi: false, support: '', item: h.action || null
        });
      });
    }
    return out;
  }

  // ── THE MECHANISM LINES — what it did, and why it counts HERE ───────────────
  // Two sentences per instrument, on the face of the row, in the same two slots for
  // every lane. Before this existed a reader got a document number, a verdict chip
  // and — on the ✒️ lane only — one unlabelled sentence that had to serve as both
  // answers at once; on the 🏛️ and migrated-formal lanes they got the title and
  // nothing else. A title is not a mechanism, and "why does this count on THIS
  // issue" was never stated anywhere a reader would look.
  //
  // WHERE EACH SENTENCE COMES FROM, and what is never done to it:
  //   what it did   ✒️ the curated per-(document, issue) `plain` sentence, verbatim
  //                 📄 the first sentence of the curated `facts` paragraph, verbatim
  //                 🏛️ the roll-call question and the ballot — the two things a
  //                    recorded vote actually carries — assembled, not authored
  //   why it counts ✒️/📄 a curated sentence when the seed supplies one
  //                 otherwise a restatement of the MAPPING: which issue, primary or
  //                 supporting subject, how narrow the recorded link is, and which
  //                 way it cut. Every clause is a field that already exists.
  //
  // NOTHING HERE CLAIMS AN OUTCOME. "Advances the position they stated" is a
  // direction match and says so; it is not "prices fell", and no sentence built here
  // asserts an effect in the world. That wall is the whole point of the lane, and a
  // mechanism line is exactly where it would be easiest to cross by accident.
  var _DOS_NOUN_FALLBACK = { exec: 'action', record: 'measure', formal: 'action' };
  // The instrument's noun, in the vocabulary the ✒️ multi-issue block already uses —
  // "law", "veto", "order", "directive". Read from that map rather than from the
  // class LABEL, which is a past-participle phrase written for a different slot:
  // lowercasing it produced "the primary subject of this vetoed" and "of this signed
  // into law", which is the kind of sentence that tells a reader nobody read it.
  function _dosNoun(d) {
    if (d.lane === 'exec' && d.item && d.item.actionClass && _EXEC_OMNI_NOUN[d.item.actionClass]) {
      return _EXEC_OMNI_NOUN[d.item.actionClass];
    }
    if (d.lane === 'exec' && d.power && d.power.key && _EXEC_OMNI_NOUN[d.power.key]) {
      return _EXEC_OMNI_NOUN[d.power.key];
    }
    return _DOS_NOUN_FALLBACK[d.lane] || 'action';
  }
  function _dosDidLine(d) {
    if (d.plain) return d.plain;
    if (d.lane === 'record') {
      // The record's own two facts. Assembled in the order a reader asks them in:
      // what was the House voting on, and what did this member do about it.
      var q = d.question ? String(d.question) : '';
      var ballot = d.act ? String(d.act) : '';
      if (q && ballot) return ballot + ' on the question “' + q + '”.';
      if (q) return 'The question on the floor was “' + q + '”.';
      if (ballot) return ballot + '.';
    }
    if (d.act && d.title) return d.act + ' — ' + d.title + '.';
    if (d.title) return d.title + '.';
    if (d.act) return d.act + '.';
    return '';
  }
  function _dosCountsLine(d, issueKey) {
    if (d.held) return '';
    // A curated sentence answers "why this issue" better than any restatement of the
    // mapping can, so it wins the slot outright when the seed carries one.
    if (d.counts) return d.counts;
    var lbl = _issueLabel(issueKey) || 'this issue';
    var noun = _dosNoun(d);
    var link = (d.primary === true) ? 'the primary subject of this ' + noun
             : (d.primary === false) ? 'one of the subjects this ' + noun + ' was mapped to'
             : 'mapped to this ' + noun;
    return 'Counted on ' + lbl + ' because that is ' + link +
      (d.narrow ? ', on a link the curation records as a narrow one' : '') + '.';
  }
  // ── CURATED OR DERIVED, AND THE ROW HAS TO SAY WHICH ────────────────────────
  // The sentence above is true and it is machine-assembled: it reports that a
  // mapping exists and says nothing about the document. Printed in the same voice,
  // the same label and the same weight as a curator's sentence, it is indistinguish-
  // able from one — so a reader auditing a row cannot tell a reasoned link from a
  // metadata match, and every mapping that has never been read by a human ships
  // looking as if it had. That is the only thing this pair of predicates exists to
  // fix, and it fixes it in presentation: nothing below changes which items are
  // counted, which way they cut, what they weigh or what any verdict says.
  function _dosCountsBy(d) {
    if (!d || d.held) return '';
    return (d.counts && String(d.counts).trim()) ? 'curated' : 'derived';
  }
  // WHICH LANES HAVE A CURATION SLOT AT ALL. `exec` and `formal` items carry a
  // per-issue sentence in the seed, so a derived line there means the slot is empty
  // and a curator can fill it — that is a real, closeable piece of work. A roll call
  // carries no such slot by construction (see _dosItems: plain/counts/rationale are
  // all '' on that lane, on purpose, because inventing prose the record does not
  // record is the worse failure). Its line is still labelled as the derivation it
  // is, and the list's own lane note already explains why — but it is NOT queued,
  // because a queue nobody can ever action is not a queue, it is a permanent
  // apology.
  var _DOS_CURATABLE = { exec: 1, formal: 1 };
  function _dosNeedsCurator(d) {
    return _dosCountsBy(d) === 'derived' && !!(d && _DOS_CURATABLE[d.lane]);
  }
  // ── WHICH WAY IT CUT, AND WHY THAT PRODUCES THE CHIP ────────────────────────
  // Its own line, and always printed — including when a curated "why it counts here"
  // sentence exists, because that sentence explains the SUBJECT and never the
  // direction. Proclamation 11010 is the case that made this a rule: its curated
  // sentence describes lowering a trade barrier to hold a grocery price down, which
  // sounds like an alignment, and it sits beside a chip reading "Says one thing, does
  // another" with nothing on the face bridging the two.
  //
  // THE BUG THIS REPLACES. The direction clause used to read "on this issue it
  // advances / cuts against THE POSITION THEY STATED", built from `effect`. But
  // `effect` is measured against the ISSUE, not against what they said. Where the
  // stated position runs against the issue's own direction — a tariff record on
  // 💵 Tariffs & Household Prices, say — a document that cuts against the issue is
  // exactly what they said they would do, so the row printed "cuts against the
  // position they stated" directly underneath a chip reading "Backs it up". Two
  // contradictory claims, one row, no way to tell which to believe.
  //
  // So the line now states the two facts separately and names the chip they produce.
  // The chip's own label is quoted verbatim rather than paraphrased, which is what
  // makes it structurally impossible for this sentence and that chip to disagree.
  function _dosDirLine(d, issueKey) {
    if (d.held) return '';
    var lbl = _issueLabel(issueKey) || 'this issue';
    var v = VERDICTS[d.verdict];
    var tail = (v && v.label) ? ' — which is why this row reads “' + v.label + '”.' : '.';
    // A ballot needs the support meaning spelled out. "A Yea here counts as support"
    // is not obvious, and it is the single step where a reader most often assumes the
    // opposite of what the mapping says.
    if (d.lane === 'record' && d.support) {
      var meaning = (d.support === 'yea_opposes') ? 'opposition to' : 'support for';
      var cast = d.act ? String(d.act).toLowerCase() : '';
      return 'On ' + lbl + ' a Yea counts as ' + meaning + ' the issue’s direction' +
        (cast ? ', and they ' + cast : '') + tail;
    }
    if (!d.effect) return '';
    var dir = (d.effect === 'advances') ? 'advances' : 'cuts against';
    var s = 'On ' + lbl + ' this ' + _dosNoun(d) + ' ' + dir + ' the issue’s direction';
    if (d.stance === 'support' || d.stance === 'oppose') {
      s += ', and the position they stated runs ' +
        (d.stance === 'oppose' ? 'against' : 'with') + ' that direction';
    }
    return s + tail;
  }
  // ── THE VETO PATH ───────────────────────────────────────────────────────────
  // A veto is the one instrument on this lane where the row's identity and the row's
  // direction belong to two different actors. The identity is a bill Congress wrote
  // and passed; the direction is what the President did to it; and the issue mapping
  // on file describes the BILL, so the reading recorded against the President is the
  // inverse of it. Every part of that was true before this line existed and none of
  // it was on the face: a reader saw a bill number, the word "Vetoed", a verdict chip
  // and — for an overridden veto — a standing token naming yet another actor, with no
  // sentence anywhere joining them. This says all four beats in order.
  function _dosVetoLine(d, issueKey) {
    if (d.held || !d.power || !d.power.blocks) return '';
    var lbl = _issueLabel(issueKey) || 'this issue';
    var who = d.ident ? String(d.ident) : 'the measure';
    var s = 'Veto path: Congress passed ' + who + ' and sent it to the desk, and the President ' +
      'vetoed it rather than signing it. ';
    // What happened next, when the file records it. `overridden` is the only token
    // that changes the answer to "did the measure become law", so it is the only one
    // that gets its own sentence; the rest keep the standing chip's own words.
    var key = d.standing && d.standing.key;
    if (key === 'overridden') {
      s += 'Congress then passed it over the veto and it became law anyway. ';
    } else if (key === 'in_force') {
      s += 'The veto held, so the measure did not become law. ';
    }
    // The inversion, stated rather than assumed. `effect` is already the ACT's
    // direction, so the measure's is its opposite — read off the same field the
    // ledger used rather than re-derived, so the two cannot drift apart.
    if (d.effect) {
      var billDir = (d.effect === 'advances') ? 'cut against' : 'advanced';
      var actDir = (d.effect === 'advances') ? 'advances' : 'cuts against';
      s += 'The mapping on file describes the bill, which ' + billDir + ' ' + lbl +
        ' — so blocking it is the opposite, and this row is filed as an action that ' +
        actDir + ' the issue.';
    }
    return s.trim();
  }
  // THE MULTI-ISSUE DISCLOSURE, on the face rather than one tap down. The 🧩 chip
  // already says "2 issues"; a count is not a disclosure. This says the thing the
  // count implies and the chip does not: the same document is judged separately on
  // each issue it touched, so nothing here should be read as "this whole measure was
  // about this one issue".
  function _dosMultiLine(d, issueKey) {
    if (!d.multi || d.held) return '';
    var n = 0;
    try { n = d.item.issues.length; } catch (e) { return ''; }
    if (n < 2) return '';
    var lbl = _issueLabel(issueKey) || 'this issue';
    var noun = (d.lane === 'record') ? 'bill' : 'document';
    return 'Multi-issue ' + noun + ': it was mapped to ' + n + ' issues and is judged separately on each. ' +
      'This row is only its reading on ' + lbl + '.';
  }
  // ── THE COMPARISON, TAUGHT RATHER THAN STAMPED ──────────────────────────────
  // A row like Scalise / Secure & Accessible Voting is the whole reason this exists.
  // It read: "0% · Contradicted", one vote titled "objected to certifying the 2020
  // election", and a direction line naming the issue and the chip. Every fact was
  // true and the ARGUMENT was nowhere: what did they say, what did this instrument
  // do, and why does the second cut against the first. A reader who did not already
  // know the answer got a verdict stamped on a vote title and was expected to take it.
  //
  // On a deep record the argument is carried by the pattern — twelve votes one way is
  // its own explanation, and repeating the stated position verbatim on all twelve
  // rows is noise a reader learns to skip (it is already stated once, at L1). On a
  // THIN row there is no pattern to carry it: the verdict rests on one or two
  // instruments, so each one has to make the case on its own face. So the teaching
  // beats are gated to exactly the rows that need them.
  //
  // WHAT IS AND IS NOT INVENTED HERE. `said` is the politician's own sourced words
  // from the position map, clipped, or — when no text is on file — the stance LABEL
  // the chip already shows. `gap` is assembled from three fields that all exist:
  // which way the stated position points, which way this instrument cut, and the
  // verdict label the chip is already printing. No new political claim is made, no
  // verdict, weight or scoring input is touched, and where the direction cannot be
  // established from the file the line simply does not print.
  var _DOS_TEACH_MAX = 3;
  var _DOS_TEACH_TOKENS = { contradicts: 1, mixed: 1 };
  // The row-level decision, made once per face in _dosRecordsHtml and handed down, so
  // that opening a dossier does not re-derive a stance read per instrument.
  function _dosTeach(pid, issueKey, r, cov) {
    var tok = r && r.verdict && r.verdict.token;
    if (!tok || !_DOS_TEACH_TOKENS[tok]) return null;
    var judged = (cov && typeof cov.judged === 'number') ? cov.judged : null;
    if (judged === null) judged = cov ? cov.scored : 0;
    if (!(judged >= 1 && judged <= _DOS_TEACH_MAX)) return null;
    var st = null;
    try { st = _rowStance(pid, issueKey); } catch (e) { st = null; }
    if (!st || (!st.text && !st.label)) return null;
    return { stance: st, verdict: tok, judged: judged, label: _issueLabel(issueKey) || 'this issue' };
  }
  // Their words, in their voice, kept short. The dossier's own L1 clips at 320; a row
  // face is a much tighter slot and sits above four other lines, so this clips harder.
  function _dosSaidLine(teach) {
    if (!teach) return '';
    var st = teach.stance;
    var t = st.text ? String(st.text).trim() : '';
    if (t) {
      if (t.length > 180) t = t.slice(0, 177).replace(/\s+\S*$/, '') + '…';
      return '“' + t + '”';
    }
    // No sourced sentence on file — the chip's own word, said as a position rather
    // than quoted as speech, because nobody said it in those words.
    return st.label ? st.label + ' ' + teach.label + '.' : '';
  }
  // Which way THIS instrument cut on the issue, read off fields that already exist.
  // '' when the file does not establish it — an unscored ballot, an executive document
  // with no recorded effect — because a guess here would be the invented claim the
  // whole lane exists to keep out.
  function _dosItemDir(d) {
    if (!d || d.held) return '';
    if (d.lane === 'record') {
      if (!d.support) return '';
      var pos = String((d.item && d.item.position) || '').toLowerCase();
      var yea = /^(yea|aye|yes)$/.test(pos);
      var nay = /^(nay|no)$/.test(pos);
      if (!yea && !nay) return '';
      // A Yea on a `yea_supports` mapping advances the issue's direction; every other
      // combination of the two flips it once.
      return ((d.support !== 'yea_opposes') === yea) ? 'advances' : 'opposes';
    }
    return (d.effect === 'advances') ? 'advances' : (d.effect === 'opposes') ? 'opposes' : '';
  }
  // Bare stem, not third-person singular: the clause is always "they said they ___",
  // so "supports" produced "they said they supports" — the exact kind of sentence that
  // tells a reader nobody read the line before shipping it.
  var _DOS_STANCE_VERB = { support: 'support', oppose: 'oppose' };
  function _dosGapLine(d, issueKey, teach) {
    if (!teach || !d || d.held) return '';
    var dir = _dosItemDir(d);
    if (!dir) return '';
    var stanceKey = d.stance || teach.stance.key || '';
    var verb = _DOS_STANCE_VERB[stanceKey];
    if (!verb) return '';
    var lbl = teach.label;
    // Does the stated position point the same way this instrument did? `support`
    // points with the issue's direction, `oppose` against it — the same convention
    // _dosDirLine uses, so the two sentences cannot contradict each other.
    var agrees = ((stanceKey === 'support') === (dir === 'advances'));
    var v = VERDICTS[d.verdict];
    var head = 'Said versus did: they said they ' + verb + ' ' + lbl + ', and this one pushed ' +
      (agrees ? 'the same way.' : 'the other way.');
    if (!v || !v.label) return head;
    return head + ' That ' + (agrees ? 'match' : 'gap') + ' is what this row records as “' +
      v.label + '”.';
  }
  function _dosMechanism(d, issueKey, teach) {
    return {
      said: _dosSaidLine(teach),
      did: _dosDidLine(d),
      counts: _dosCountsLine(d, issueKey),
      // Additive, and load-bearing only for rendering: `counts` is the same string
      // it has always been, so nothing that reads the sentence sees a change. These
      // two say how it was produced, which is what the row face now prints.
      countsBy: _dosCountsBy(d),
      needsCurator: _dosNeedsCurator(d),
      dir: _dosDirLine(d, issueKey),
      gap: _dosGapLine(d, issueKey, teach),
      veto: _dosVetoLine(d, issueKey),
      multi: _dosMultiLine(d, issueKey)
    };
  }

  // ── THE SECOND SLOT, IN WHICHEVER VOICE IT WAS WRITTEN ──────────────────────
  // Two renderings, one slot, and they are meant to look different from across the
  // room. A curated line keeps everything it had — the bright "Why it counts here:"
  // label, full contrast, no ornament — because that label is a claim only a human
  // sentence can honour. A derived line loses the claim: the label says what the
  // line actually is ("How it was linked"), the type goes dim and italic behind a
  // dashed rule, and where a curator could have written one and has not, the row
  // says so in as many words. No wording is softened and nothing is hidden; the
  // derived sentence is printed in full, exactly as before.
  var DOS_WHY_CURATED = 'Why it counts here:';
  var DOS_WHY_DERIVED = 'How it was linked:';
  // Short on purpose. It repeats on every unexplained row — up to nine on one
  // issue — and a full sentence nine times over is noise a reader learns to skip.
  // The sentence version of it lives once, on the queue row below the list.
  var DOS_WHY_MARK = '⌛ Not yet explained by a curator';
  function _dosWhyHtml(m) {
    if (!m || !m.counts) return '';
    if (m.countsBy !== 'derived') {
      return '<span class="pdxdos-rec-why"><b class="pdxdos-rec-wk">' + DOS_WHY_CURATED + '</b> ' +
        esc(m.counts) + '</span>';
    }
    return '<span class="pdxdos-rec-why pdxdos-rec-derived">' +
        '<b class="pdxdos-rec-wk pdxdos-rec-wk-d">' + DOS_WHY_DERIVED + '</b> ' + esc(m.counts) +
        (m.needsCurator ? '<span class="pdxdos-rec-unex">' + esc(DOS_WHY_MARK) + '</span>' : '') +
      '</span>';
  }

  // The multi-issue caveat, with the door out of it. The caveat already told a
  // reader this document was judged on N issues and that they were looking at one of
  // them; the only thing it could not do was let them go and look. The control does
  // not open a new page — it opens this row and scrolls to the trail inside it, so
  // the local issue reading stays on screen as the thing being compared FROM.
  function _dosMultiHtml(m, d) {
    if (!m || !m.multi) return '';
    var n = 0;
    try { n = d.item.issues.length; } catch (e) { n = 0; }
    var body = '<span class="pdxdos-rec-why pdxdos-rec-multi">' + esc(m.multi);
    if (n >= 2) {
      body += '<button type="button" class="pdxdos-rec-follow" data-pdxins-open="1"' +
        ' aria-label="' + escAttr('Follow ' + d.ident + ' across all ' + n +
          ' issues it was mapped to, with the direction and verdict on each') + '">' +
        'See all ' + n + ' readings <span aria-hidden="true">→</span></button>';
    }
    return body + '</span>';
  }

  // ── L2 — one summary row per instrument ─────────────────────────────────────
  // Identity, what they did, which way that landed on this issue, where it stands,
  // and the mechanism lines. No percentage: a per-item weight printed as a number
  // reads as a second score, and "primary / supporting / narrow link" is the same
  // fact in the vocabulary the ✒️ section already uses.
  function _dosRowHtml(d, i, pid, issueKey, teach) {
    var v = d.held ? null : (VERDICTS[d.verdict] || VERDICTS.limited);
    var head =
      (v ? '<span class="pdxdos-rec-ico" style="color:' + v.color + '" aria-hidden="true">' + v.ico + '</span>'
         : '<span class="pdxdos-rec-ico pdxdos-rec-hold" aria-hidden="true">⊘</span>') +
      '<span class="pdxdos-rec-id">' + esc(d.ident) + '</span>' +
      (d.question ? '<span class="pdxdos-rec-act">' + esc(d.question) + '</span>' : '') +
      (d.act ? '<span class="pdxdos-rec-act">' + esc(d.act) + '</span>' : '') +
      (v ? '<span class="pdxdos-rec-vd" style="color:' + v.color + '">' + esc(v.label) + '</span>'
         : '<span class="pdxdos-rec-vd pdxdos-rec-hold">Not scored</span>') +
      (d.standing ? '<span class="pdxdos-rec-st">' + esc(d.standing.ico + ' ' + d.standing.label) + '</span>' : '') +
      (d.multi ? '<span class="pdxdos-rec-tag">🧩 ' + d.item.issues.length + ' issues</span>' : '') +
      (d.date ? '<span class="pdxdos-rec-st">' + esc(d.date) + '</span>' : '');
    // A held item answers a different second question — not "why does this count"
    // but "why is it NOT being counted" — so it keeps the hold reason in that slot.
    // It still gets a "What it did" line: a document on file with its mechanism
    // withheld is exactly the title-only row this pass exists to remove, and the
    // reason it was held is easier to judge when a reader can see what was held.
    var m = _dosMechanism(d, issueKey, teach);
    var wk = function (label, text, cls) {
      return text
        ? '<span class="pdxdos-rec-why' + (cls ? ' ' + cls : '') + '">' +
            (label ? '<b class="pdxdos-rec-wk">' + label + '</b> ' : '') + esc(text) + '</span>'
        : '';
    };
    // ORDER IS THE ARGUMENT. On a thin contradicted or mixed row it runs said → did →
    // why it counts here → which way it cut → said versus did: the claim, the act, the
    // link, the direction, and the comparison the verdict is. The stated position leads
    // because it is the thing everything after it is measured against, and a reader who
    // meets the act first has to hold it in mind until the comparison arrives.
    //   On every other row it is what it was — what it did, then — for a veto only —
    // how a bill Congress passed becomes an action recorded against the President, then
    // why the issue is the right file for it, then which way it cut and what chip that
    // produces, then the multi-issue caveat. The veto path sits above the direction
    // line on purpose: it is the sentence that explains the inversion the direction
    // line is about to assert, and a reader who meets them the other way round has to
    // hold an apparent contradiction in mind for a sentence before it resolves.
    var why = d.held
      ? (wk('What it did:', m.did) +
         '<span class="pdxdos-rec-why pdxdos-rec-hold">' + esc(d.heldWhy) + '</span>')
      : (wk('They said:', m.said, 'pdxdos-rec-said') +
         wk('What it did:', m.did) +
         wk('', m.veto, 'pdxdos-rec-veto') +
         _dosWhyHtml(m) +
         wk('Which way it cut:', m.dir) +
         wk('', m.gap, 'pdxdos-rec-gap') +
         _dosMultiHtml(m, d));
    return '<details class="pdxdos-rec" data-pdxdos-i="' + i + '"' +
        ' data-pdxdos-pid="' + escAttr(pid) + '" data-pdxdos-key="' + escAttr(issueKey) + '">' +
        '<summary>' + head + why + '</summary>' +
        // Empty on purpose. The body is built the first time this row is opened —
        // see _dosMount. Nothing below L2 costs anything until it is asked for.
        '<div class="pdxdos-rec-b" data-pdxdos-body="1"></div>' +
      '</details>';
  }

  // ── ONE DOCUMENT, EVERY ISSUE IT DECIDED ────────────────────────────────────
  // A law like Public Law 119-21 is not one story. It is mapped to fourteen issues
  // and read separately on each, and the reading can flip: the same text that
  // advances one issue cuts against another. Until now a reader who landed on one
  // issue could see only that row plus a caveat saying "mapped to 14 issues", with
  // no way to reach the other thirteen readings of the same document.
  //   This builds that view. It invents nothing: the DIRECTION on each issue is the
  // same _measureOmnibusContext component already printed as a chip in the block
  // this replaces, and the VERDICT and the WHY-IT-COUNTS sentence on each issue are
  // read straight out of that issue's own dossier row, by the same _dosItems the
  // issue page itself renders. Nothing is scored, merged or averaged across issues:
  // the document gets no aggregate reading, because it does not have one.

  // A key that survives across _dosItems calls. Item OBJECT references do not — the
  // exec pool rebuilds its adapted records — so cross-issue matching keys off the
  // document's own published identifier.
  function _insIdent(it) {
    if (!it) return '';
    var k = it.documentId || it.measureNumber || it.billNumber || it.identifier || it.voteKey || '';
    return k ? String(k) : '';
  }
  // The same document's row on another issue, or null when that issue's dossier does
  // not list it (a held pool, a bucket that never built). Never fabricates a row.
  function _insFindOn(pid, issueKey, ident) {
    if (!pid || !issueKey || !ident) return null;
    try {
      var list = _dosItems(pid, issueKey) || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i] && _insIdent(list[i].item) === ident) return list[i];
      }
    } catch (e) {}
    return null;
  }
  // One row per issue the document was mapped to, in the order the omnibus context
  // already sorts them (primary first, then weight) with this issue lifted to front.
  function _insTrail(pid, d, issueKey) {
    if (!d || !d.item || !pid || typeof window._measureOmnibusContext !== 'function') return null;
    var ctx;
    try { ctx = window._measureOmnibusContext(d.item, issueKey, {}, { labelFn: _issueLabel }); }
    catch (e) { return null; }
    if (!ctx) return null;
    var ident = _insIdent(d.item);
    var comps = (ctx.thisIssue ? [ctx.thisIssue] : []).concat(ctx.others || []);
    var rows = [];
    for (var i = 0; i < comps.length; i++) {
      var c = comps[i];
      var here = !!(ctx.thisIssue && c === ctx.thisIssue);
      // The local row is already in hand; every other issue is re-read from its own
      // dossier so the trail can never drift from what that issue's page prints.
      var hit = here ? d : _insFindOn(pid, c.issueKey, ident);
      var m = hit ? _dosMechanism(hit, c.issueKey) : null;
      var v = (hit && !hit.held && hit.verdict) ? VERDICTS[hit.verdict] : null;
      rows.push({
        issueKey: c.issueKey,
        label: c.label || _issueLabel(c.issueKey) || c.issueKey,
        effect: c.effect,                       // advances | opposes | none
        here: here,
        listed: !!hit,
        held: !!(hit && hit.held),
        heldWhy: (hit && hit.heldWhy) || '',
        verdict: v ? hit.verdict : '',
        vLabel: v ? v.label : '',
        vIco: v ? v.ico : '',
        vColor: v ? v.color : '',
        counts: m ? m.counts : '',
        countsBy: m ? m.countsBy : '',
        needsCurator: !!(m && m.needsCurator),
        // No door on the issue we are standing on, and none to a bucket that would
        // open empty. A control that goes nowhere teaches nothing.
        door: !here && !!_bucketAt(pid, c.issueKey)
      });
    }
    return { ident: ident, count: ctx.count, splits: !!ctx.splits, rows: rows };
  }
  var INS_DIR = {
    advances: { ico: '▲', word: 'Advances', cls: 'pdxins-adv' },
    opposes:  { ico: '▼', word: 'Cuts against', cls: 'pdxins-opp' },
    none:     { ico: '•', word: 'No position on', cls: 'pdxins-neu' }
  };
  // Fixed copy. One sentence, printed once under the trail, saying what the trail is
  // evidence of — that the direction is one reading of one text applied to many
  // issues, while the verdict is a separate measurement against what was said on each.
  var INS_FOOT = 'One document, judged separately on every issue it was mapped to. ' +
    'The direction is the same reading of the same text each time; the verdict differs ' +
    'because it is measured against what this politician said on that issue. There is no ' +
    'combined score for the document itself.';
  function _insRowHtml(r, pid) {
    var dir = INS_DIR[r.effect] || INS_DIR.none;
    var why = r.counts
      ? '<span class="pdxins-why' + (r.countsBy === 'derived' ? ' pdxins-why-d' : '') + '">' +
          '<b class="pdxins-wk">' + (r.countsBy === 'derived' ? DOS_WHY_DERIVED : DOS_WHY_CURATED) + '</b> ' +
          esc(r.counts) +
          (r.needsCurator ? '<span class="pdxdos-rec-unex">' + esc(DOS_WHY_MARK) + '</span>' : '') +
        '</span>'
      : (r.held ? '<span class="pdxins-why pdxins-hold">' + esc(r.heldWhy) + '</span>'
                : (r.listed ? '' : '<span class="pdxins-why pdxins-hold">Mapped here, but this issue’s ' +
                    'record has no open row for it.</span>'));
    return '<div class="pdxins-r' + (r.here ? ' pdxins-here' : '') + '" data-pdxins-k="' + escAttr(r.issueKey) + '">' +
      '<div class="pdxins-rh">' +
        // The direction is the mapping's, and it is the same one the chip list this
        // replaces already printed — including on an issue whose verdict is withheld.
        // Those get the direction dimmed, so the row reads as "mapped this way, not
        // scored" rather than as a judgement that quietly happened anyway.
        '<span class="pdxins-dir ' + dir.cls + ((r.held || !r.listed) ? ' pdxins-off' : '') + '">' +
          '<span aria-hidden="true">' + dir.ico + '</span> ' + esc(dir.word) + '</span>' +
        '<span class="pdxins-lbl">' + esc(r.label) + '</span>' +
        (r.vLabel
          ? '<span class="pdxins-v" style="color:' + r.vColor + '">' + esc(r.vIco + ' ' + r.vLabel) + '</span>'
          : '<span class="pdxins-v pdxins-hold">' + (r.held ? 'Not scored' : 'No verdict here') + '</span>') +
        (r.here ? '<span class="pdxins-you">you are here</span>'
                : (r.door
                    ? '<button type="button" class="pdxins-go" data-pdxc-gap="' + escAttr(r.issueKey) + '"' +
                        ' data-pdxc-gap-pid="' + escAttr(pid || '') + '">' +
                        'Read this issue →</button>'
                    : '')) +
      '</div>' + why + '</div>';
  }
  // Returns the { html, summary } pair _orOmniBlockHtml takes in place of its chip
  // list, or null. Keeping it as an option on the existing block means the trail
  // lands inside the disclosure that is already there — same fold, more inside it —
  // rather than adding a second panel to the page.
  function _insTrailOpts(pid, d, issueKey) {
    var t = _insTrail(pid, d, issueKey);
    if (!t || !t.rows.length) return null;
    var others = t.rows.length - (t.rows[0] && t.rows[0].here ? 1 : 0);
    if (others < 1) return null;
    return {
      summary: 'Follow this one document across all ' + t.count +
        ' issues — direction, verdict and why, on each',
      html: '<div class="pdxins" data-pdxins="1" data-pdxins-n="' + t.rows.length + '" tabindex="-1">' +
        t.rows.map(function (r) { return _insRowHtml(r, pid); }).join('') +
        '<p class="pdxins-foot">' + esc(INS_FOOT) + '</p></div>'
    };
  }

  // ── L3 (+ L4) — one instrument, expanded ────────────────────────────────────
  // Built on demand from the same normalised list, so this is a pure function of
  // (pid, issue, index) and can be re-derived after a warm repaint without holding
  // any state. Returns '' for an index that no longer exists.
  function _dosDetailHtml(pid, issueKey, idx, items) {
    items = items || _dosItems(pid, issueKey);
    var d = items[idx];
    if (!d) return '';
    var lbl = _issueLabel(issueKey);
    var out = [];
    if (d.title && d.title !== d.ident) out.push('<div class="pdxdos-d"><b>' + esc(d.title) + '</b></div>');
    if (d.held) {
      out.push('<div class="pdxdos-d pdxdos-rec-hold">' + esc(d.heldWhy) + '</div>');
    }
    // ── the mechanism, in this lane's own terms ──────────────────────────────
    if (d.lane === 'exec') {
      if (d.power && d.power.verb) {
        out.push('<div class="pdxdos-d">' + esc(d.power.verb) +
          (d.power.sole
            ? ' — an instrument this office issues on its own authority.'
            : ' — an instrument that needed Congress as well as this office.') +
          '</div>');
      }
      if (d.effect) {
        // The instrument's own noun, not "document". On a veto row the identity is a
        // bill and the direction belongs to the act taken against it, so "this
        // document cuts against the issue" points at the wrong one of the two.
        out.push('<div class="pdxdos-d">On <b>' + esc(lbl) + '</b> this ' + esc(_dosNoun(d)) + ' <b>' +
          (d.effect === 'advances' ? 'advances' : 'cuts against') + '</b> the issue.</div>');
      }
      if (d.standing) {
        out.push('<div class="pdxdos-d">Where it stands today: <b>' +
          esc(d.standing.ico + ' ' + d.standing.label) + '</b>. ' +
          esc(d.standing.why || 'Standing is a separate question from direction — it says whether the action held, not which way it went.') +
          '</div>');
      }
      // `plain` is not repeated here — it is the "What it did" line on the row face,
      // one level up, and printing it twice made the expanded body read as if it had
      // found something new to say.
    } else if (d.lane === 'record') {
      // A roll call carries the question and the ballot, and no curated per-issue
      // sentence — so it gets the question and the ballot. Padding this to match the
      // ✒️ lane's depth would be inventing detail the record does not have.
      var recBits = [];
      if (d.question) {
        recBits.push('The question on the floor: <b>' + esc(d.question) + '</b>');
        if (d.act) recBits.push('They ' + esc(String(d.act).toLowerCase()));
      } else if (d.act) {
        recBits.push(esc(d.act));
      }
      if (recBits.length) out.push('<div class="pdxdos-d">' + recBits.join('. ') + '.</div>');
    }
    // How much of the document this issue's link actually rests on. Words, not a
    // weight — see _dosRowHtml.
    var tags = [];
    if (d.primary === true) tags.push('<span class="pdxdos-tag pdxdos-tag-p">primary link</span>');
    else if (d.primary === false) tags.push('<span class="pdxdos-tag">supporting link</span>');
    if (d.narrow) tags.push('<span class="pdxdos-tag pdxdos-tag-n">narrow link</span>');
    if (tags.length) out.push('<div class="pdxdos-tags">' + tags.join('') + '</div>');
    // The primary source, always, whenever there is one.
    if (d.url) {
      out.push('<a class="pdxdos-src" href="' + esc(d.url) + '" target="_blank" rel="noopener">' +
        esc(d.srcLabel || 'Source') + ' ↗</a>');
    }
    // The same roll call inside the full Voting Record — the congressional lane's
    // own deeper surface, reached the way every other proof line reaches it.
    if (d.lane === 'record' && d.voteKey) {
      out.push('<div><button type="button" class="pdxdos-src"' +
        ' data-pdxc-vrvote="' + escAttr(d.voteKey) + '"' +
        ' data-pdxc-vrissue="' + escAttr(issueKey) + '">Open this vote in the full record →</button></div>');
    }
    // What else the same instrument touched. Same measurement as everywhere else,
    // in this lane's nouns.
    var rel = d.item
      ? (d.lane === 'exec'
          ? _orOmniBlockHtml(d.item, issueKey, { kind: 'action', noun: _EXEC_OMNI_NOUN[d.item.actionClass] || 'action',
              trail: _insTrailOpts(pid, d, issueKey) })
          : _orOmniBlockHtml(d.item, issueKey, { trail: _insTrailOpts(pid, d, issueKey) }))
      : '';
    if (rel) out.push('<div class="pdxdos-rel">' + rel + '</div>');
    // ── L4 — the receipt itself ──────────────────────────────────────────────
    // The curation rationale quotes the sections the mapping rests on. It is a
    // paragraph written for whoever audits the mapping, and it belongs exactly
    // here: available to anyone who wants it, in front of nobody who does not.
    //   The migrated formal lane lands here for a second reason: its row face shows
    // the FIRST SENTENCE of the curated account, and the rest of that paragraph has
    // to be reachable or the truncation would be a quiet edit. Same fold, different
    // label, because "what the document says" is the wrong promise for an account
    // assembled from council minutes or a press record.
    if (d.rationale && d.rationale !== d.plain) {
      var fineLabel = (d.lane === 'formal')
        ? 'The full account on file ▾'
        : 'What the document actually says ▾';
      out.push('<details class="pdxdos-fine"><summary>' + esc(fineLabel) + '</summary>' +
        '<div class="pdxdos-fine-b">' + esc(d.rationale) + '</div></details>');
    }
    return out.join('');
  }

  // Fill one L2 row's body the first time it is opened. Called from the delegated
  // click listener WITHOUT preventDefault, so the browser still owns the toggle.
  function _dosMount(el) {
    try {
      if (!el || !el.querySelector) return;
      var body = el.querySelector('[data-pdxdos-body]');
      if (!body || body.innerHTML) return;
      var pid = el.getAttribute('data-pdxdos-pid') || '';
      var key = el.getAttribute('data-pdxdos-key') || '';
      var idx = parseInt(el.getAttribute('data-pdxdos-i') || '', 10);
      if (!pid || !key || isNaN(idx)) return;
      body.innerHTML = _dosDetailHtml(pid, key, idx) ||
        '<div class="pdxdos-note">This record has nothing further on file.</div>';
    } catch (e) {}
  }

  // Open the trail from the caveat. Four steps, all of them things a reader would
  // otherwise have to do by hand: open the row, build L3 if this is its first
  // opening, open the disclosure the trail lives in, and put the trail on screen
  // with focus on it so a keyboard reader arrives where the click pointed.
  function _insOpen(btn) {
    try {
      var rec = btn.closest && btn.closest('[data-pdxdos-i]');
      if (!rec) return;
      rec.open = true;
      _dosMount(rec);
      var t = rec.querySelector('[data-pdxins]');
      if (!t) return;
      var p = t.parentNode;
      while (p && p !== rec) {
        if (p.tagName === 'DETAILS') p.open = true;
        p = p.parentNode;
      }
      if (t.scrollIntoView) t.scrollIntoView({ block: 'nearest' });
      if (t.focus) t.focus();
    } catch (e) {}
  }

  // ── DOES THE LIST ADD UP TO THE CLAIM? ──────────────────────────────────────
  // The dossier makes two statements about the same set of instruments, in two
  // places: L1 says how many judged items decided the issue, and L2 enumerates the
  // rows a reader can actually open. Those came from different readers of the same
  // record and were never checked against each other, so they could disagree —
  // and they did, in one specific and entirely invisible way.
  //
  // THE CASE THAT BROKE. A member's roll-call detail arrives after their profile
  // does. The engine SUMMARY (counts, verdict) is warm early; the raw per-issue
  // ITEMS are not. When only the summary was warm, _orProofPicks fell back to the
  // two representative votes the summary keeps — the strongest each way — and the
  // list rendered two rows. L1 went on saying "6 judged votes on this issue". Four
  // votes were counted in the verdict, absent from the list, and nothing on the
  // card said so. That is precisely a hidden action count.
  //
  // This is the reconciliation, computed once and read by both levels. It does not
  // fix the gap — nothing here can conjure a vote that has not loaded — it MEASURES
  // it, so the surface can say "3 of 6 are listed; the rest are still loading"
  // instead of quietly showing three and claiming six. `judged` is read from
  // judgedCountOf, the same count the score divides by, so the number a reader is
  // told to expect is the number the verdict actually rests on.
  function _dosCoverage(pid, issueKey, ov, items) {
    ov = ov || officialIssue(pid, issueKey);
    items = items || _dosItems(pid, issueKey, ov);
    var scored = 0, held = 0;
    items.forEach(function (d) { if (d.held) held++; else scored++; });
    var judged = judgedCountOf(ov);
    if (typeof judged !== 'number' || judged < 0) judged = null;
    // A row can be listed and still not be judged — an executive document that takes
    // no side on the stated position is scored `limited` and counts in neither. So
    // the gap is only ever "judged items with no row", never the reverse.
    var missing = (judged === null) ? 0 : Math.max(0, judged - scored);
    return { listed: items.length, scored: scored, held: held, judged: judged, missing: missing };
  }

  // ── L2 — the group ──────────────────────────────────────────────────────────
  // Closed by default, with the count in the summary: the depth of the record is
  // readable without opening anything, which is the one thing this level owes a
  // reader who does not open it.
  function _dosRecordsHtml(pid, issueKey, r, ov) {
    var n = _stNoun(r), items = _dosItems(pid, issueKey, ov);
    if (!items.length) {
      var empty = (ov.token === 'pending')
        ? '⏳ Loading the record… this member\'s votes arrive after the profile does, and this list fills in when they land.'
        : (ov.lane === 'exec'
            ? 'No qualifying executive action on this issue is on file yet.'
            : 'No qualifying ' + n.many + ' on this issue are on file yet.');
      return '<div class="pdxdos-recs" data-pdxdos-empty="1" data-pdxgap-record="empty">' +
        '<div class="pdxdos-empty">' + esc(empty) + '</div></div>';
    }
    var cov = _dosCoverage(pid, issueKey, ov, items);
    // Does this face have to TEACH the comparison, or is the pattern carrying it?
    // Decided once here from the row verdict and the judged depth, then handed to
    // every row, so the answer cannot differ between two rows of the same list.
    var teach = _dosTeach(pid, issueKey, r || issueRow(pid, issueKey), cov);
    // THE HEADLINE COUNT IS THE ROW COUNT. Whatever else this line says, the number
    // in front of the noun is the number of rows underneath it — so the expander can
    // never open onto fewer than it advertised.
    var sum = cov.listed + ' ' + (cov.listed === 1 ? n.one : n.many) + ' listed here' +
      (cov.held ? ' — ' + cov.held + ' of them not scorable' : '');
    // AND THE COUNT IS ENUMERATED, not merely asserted. A collapsed "9 actions listed
    // here" is a number a reader has to take on trust and then open a drawer to
    // audit; naming every instrument on the closed face turns it into something they
    // can count. Every row is named — no "and 4 more", because a truncated
    // enumeration is the same hiding problem wearing a different label. Executive
    // identities are document numbers and stay short on their own; the migrated
    // formal lane's identity is a headline sentence, so it is clipped at a word
    // boundary with an ellipsis, which shortens a label without dropping an item.
    var enumTxt = items.map(function (d) {
      var s = String(d.ident || '').trim() || 'Unnamed action';
      if (s.length > 44) s = s.slice(0, 44).replace(/\s+\S*$/, '') + '…';
      return s;
    }).join(' · ');
    var gap = cov.missing
      ? '<div class="pdxdos-gap">⏳ ' + esc(cov.judged + ' ' + (cov.judged === 1 ? n.one : n.many) +
          ' were judged on this issue and ' + cov.scored + ' of them can be listed right now. The other ' +
          cov.missing + ' are counted in the verdict; their detail arrives with this member’s full ' +
          'roll-call record and this list fills in when it lands. Nothing has been dropped.') + '</div>'
      : '';
    // The lane asymmetry, stated once rather than papered over row by row.
    var note = (items[0] && items[0].lane === 'record')
      ? '<div class="pdxdos-note">A roll call carries its question, its ballot and its source. It does not ' +
        'carry a written explanation the way an executive document does — so its two lines are assembled ' +
        'from the record itself rather than written, and nothing has been added to make them look the same.</div>'
      : '';
    // THE LANDING PAD FOR THE FORMAL SIDE. A row that says "18 votes on file · see
    // the votes" promises this list, and the promise is only kept if the sheet can
    // be asked to stop at it. Same hook shape as the 🧾 column's, an attribute rather
    // than an id, because a dossier is rendered as one HTML string and a duplicated
    // id is a silent scroll to the wrong panel.
    return '<details class="pdxdos-recs" data-pdxgap-record="items">' +
        '<summary><span aria-hidden="true">🏛️</span> ' + esc(sum) +
          ' <span aria-hidden="true">▾</span>' +
          '<span class="pdxdos-recs-list">' + esc(enumTxt) + '</span></summary>' +
        gap +
        items.map(function (d, i) { return _dosRowHtml(d, i, pid, issueKey, teach); }).join('') +
        note +
      '</details>';
  }

  // Is the profile actually on the page behind this sheet? A dossier opened from a
  // stance row can offer the jump into ⚖️ Word vs Action; one opened from a shared
  // #record= link is floating over whatever page the app happened to be on, and a
  // button that scrolls to a section that is not there is a broken promise.
  function _dosTargetLive(id) {
    try { if (document.getElementById && document.getElementById(id)) return true; } catch (e) {}
    try {
      var SP = window.PDXProfileSpine;
      if (SP && typeof SP.hasTarget === 'function') return !!SP.hasTarget(id);
    } catch (e) {}
    return false;
  }

  // ── THE BUCKET THE INDEX FILED THIS ROW UNDER ───────────────────────────────
  // The issue index in ⚖️ Word vs Action sorts every issue into one of four result
  // buckets and names each one in a short, fixed vocabulary — Contradicted, Mixed,
  // Backed up, Thin record. A reader who tapped a row got here from inside one of
  // those buckets, and this line is what tells them the sheet they landed on is the
  // same finding at greater depth rather than a different reading of it.
  //
  // FAIL CLOSED, THREE WAYS. The vocabulary is read from PDXWordAction, which owns it;
  // if that module is not loaded this prints nothing rather than inventing a second
  // set of words for the same four outcomes. A verdict with no bucket — pending,
  // no record, nothing stated — prints nothing either, because it was never in the
  // index to be filed anywhere. And neither was a row we hold instruments for and no
  // stated position of theirs: the index drops those before bucketing (see the
  // `!r.stance.label` guard in outcomeBuckets), so calling one "Thin record" here
  // borrowed a word from a pile it was never in, and hung it on a record whose only
  // defect is that WE have nothing of theirs to test it against. No percentage: the
  // bucket is a name, not a score.
  function _dosBucket(r) {
    var tok = r && r.verdict && r.verdict.token;
    if (!tok) return null;
    if (tok === 'limited' && !(r.stance && r.stance.label)) return null;
    try {
      var WA = window.PDXWordAction;
      if (!WA) return null;
      if (typeof WA.outcomeFor === 'function') return WA.outcomeFor(tok) || null;
      var list = WA.OUTCOMES || [];
      for (var i = 0; i < list.length; i++) if (list[i].token === tok) return list[i];
    } catch (e) {}
    return null;
  }
  function _dosBucketHtml(r) {
    var o = _dosBucket(r);
    if (!o) return '';
    return '<div class="pdxdos-bucket" style="--c:' + o.col + ';">' +
        '<span class="pdxdos-bucket-k">In the issue index</span>' +
        '<span class="pdxdos-bucket-v">' + esc(o.short) + '</span>' +
        (o.sub ? '<span class="pdxdos-bucket-s">' + esc(o.sub) + '</span>' : '') +
      '</div>';
  }
  // The same lookup from OUTSIDE the sheet. Every surface on the profile that shows a
  // reader an issue result asks exactly this question — which of the four buckets is
  // this — so no surface has to keep its own copy of the four words, and none of them
  // can drift from the index. A key that resolves to no bucket returns null in all of
  // them, which is what stops a door being drawn over nothing.
  function _bucketAt(pid, issueKey) {
    if (!pid || !issueKey) return null;
    try { return _dosBucket(issueRow(pid, issueKey)); } catch (e) { return null; }
  }
  // ONE ACCESSIBLE NAME FOR ONE DOOR. Read aloud identically in the issue index, on a
  // stance row, inside an Official Record row and in the divergence list, because in
  // all four places it is the same destination carrying the same finding.
  function _dosDoorLabel(label, o, said) {
    return 'Open the issue dossier: ' + String(label == null ? '' : label) +
      (o ? ' — ' + o.short : '') + (said ? ' · they said: ' + said : '');
  }

  // ── L1 — the assembled answer ───────────────────────────────────────────────
  // Open by default, and the only level that is. Everything here is read off the
  // row model: no arithmetic happens in this function. It prints NO percentage —
  // the sheet's one number lives in the header hero, and a second copy of it here
  // would read as a second score.
  function _dosSummaryHtml(pid, issueKey, r) {
    r = r || issueRow(pid, issueKey);
    var res = _stResult(r), n = _stNoun(r), lines = [];
    // WHAT THEY SAID. The chip in the header carries the position; this carries
    // their own words, which is the thing the record is about to be checked against.
    var said = r.stance.text ? String(r.stance.text) : '';
    if (said.length > 320) said = said.slice(0, 317).replace(/\s+\S*$/, '') + '…';
    if (said || r.stance.label) {
      lines.push('<div class="pdxdos-line"><span class="pdxdos-k">They said</span>' +
        '<span class="pdxdos-v">' + esc(said || r.stance.label) + '</span></div>');
    }
    // WHAT THE RECORD CONCLUDED, and WHICH LANE concluded it. One verdict per
    // issue, resolved once — this reprints it, it does not re-decide it.
    //
    // THE COUNT HAS TO BE THE JUDGED COUNT. This line used to read
    // `r.actions.judged || r.evidence.actions`, and that fallback is the bug: the
    // evidence count includes items on file that were explicitly NOT scored — a
    // memorandum held back for circularity, say — so a row with two judged actions
    // and one held one announced "3 judged actions" and then listed two verdicts.
    // When no judged count exists the sentence now simply does not name a number,
    // because there is no honest number to name.
    var jn = (typeof r.actions.judged === 'number' && r.actions.judged > 0) ? r.actions.judged : null;
    var cov = _dosCoverage(pid, issueKey, r.ov);
    var lane;
    if (r.verdict.basis === 'public_record') {
      lane = 'Decided by the public record — statements, news and controversies — because no formal ' +
        n.one + ' on this issue could settle it.';
    } else if (r.verdict.basis === 'action') {
      // "Decided by" is a claim about a decision, and a no-position row has not
      // reached one — so the same fork the face makes is made here: the lane that
      // WOULD decide this issue, named as such, rather than a decision asserted over
      // a row whose result slot is empty. Every other row keeps its original wording.
      lane = (res.shape === 'no_stance')
        ? 'This issue would be decided by the formal record.'
        : (jn
          ? 'Decided by the formal record: ' + jn + ' judged ' + (jn === 1 ? n.one : n.many) + ' on this issue.'
          : 'Decided by the formal record.');
      // WHERE TO FIND THEM. A count with no route to the items is the thing this
      // whole level is meant to stop being, so the sentence that names the number
      // also says whether the list below can show all of them.
      if (jn && !cov.missing) {
        // Singular is its own sentence, not a plural with the number swapped. "All 1
        // are listed below" is the shape a reader meets on exactly the rows this pass
        // is about — a contradicted verdict resting on one vote — and a sentence that
        // has visibly not been read undermines the count it is trying to vouch for.
        lane += (jn === 1 ? ' It is listed below' : ' All ' + jn + ' are listed below') +
          (cov.held ? ', with ' + cov.held + ' further on file that could not be scored' : '') + '.';
      } else if (jn && cov.missing) {
        lane += ' ' + cov.scored + ' of them ' + (cov.scored === 1 ? 'is' : 'are') +
          ' listed below; the other ' + cov.missing +
          ' arrive with this member’s full roll-call record.';
      } else if (cov.listed) {
        lane += ' ' + cov.listed + ' item' + (cov.listed === 1 ? ' is' : 's are') + ' listed below.';
      }
    } else {
      lane = 'No lane has been able to decide this one yet.';
    }
    lines.push('<div class="pdxdos-line"><span class="pdxdos-k">The record</span>' +
      '<span class="pdxdos-v pdxdos-vd" style="color:' + res.color + '">' + esc(res.ico + ' ' + res.label) + '</span>' +
      '</div>' +
      '<div class="pdxdos-lane">' + esc(lane) + '</div>');
    // COMPOSITION and DEPTH, borrowed verbatim from the stance row. Composition
    // prints only where the row genuinely carries tension — a split verdict,
    // counter-evidence the deciding lane set aside, or a contested standing.
    var comp = _stCompHtml(r, res);
    var ev = _stEvidenceHtml(r, cov);
    // THE COVERAGE CAVEAT, when there is one to make. Thin and untested rows say
    // why; a tested row resting on one or two items says that the direction is real
    // and the pattern is not established.
    //
    // IT MUST NEVER FIRE AT ZERO. The old form printed "This rests on 0 items"
    // straight from `evidence.total`, and a row can be tested with that total at
    // zero — the deciding lane's own counts are elsewhere. Beside a line reading
    // "backed up with 3 judged actions" that is not a caveat, it is a contradiction,
    // and a reader has no way to tell which of the two numbers to believe. So the
    // warning now requires something real to warn about, and it names WHAT the
    // items are rather than leaving "item" to mean whichever of the two the reader
    // guesses at.
    var caveat = '';
    if (res.state !== 'tested' && res.why) caveat = res.why;
    else if (res.state === 'tested' && r.evidence.total > 0 && r.evidence.total <= 2) {
      var depth = [];
      if (r.evidence.actions > 0) {
        depth.push(r.evidence.actions + ' ' + (r.evidence.actions === 1 ? n.one : n.many) + ' on record');
      }
      if (r.evidence.public > 0) {
        depth.push(r.evidence.public + ' public receipt' + (r.evidence.public === 1 ? '' : 's'));
      }
      caveat = 'This rests on ' + (depth.length ? depth.join(' and ') :
          r.evidence.total + ' item' + (r.evidence.total === 1 ? '' : 's')) +
        // A Mixed row has no single direction, so "the direction is real" is the one
        // thing this caveat must not say there — it would read as a verdict the
        // bucket explicitly declined to reach. What is real on a Mixed row is the
        // split: the record genuinely went both ways, on very few items.
        '. ' + (r.verdict.token === 'mixed'
          ? 'The split is real; a pattern is not established at that depth.'
          : 'The direction is real; a pattern is not established at that depth.');
    }
    // WHERE THIS LANDS IN THE SCORE. The profile's headline figure is the pooled
    // ⚖️ Direction match and this issue is one input to it — said outright, so a
    // reader never reads an issue result as the profile's.
    var score;
    if (res.state === 'tested') {
      score = 'This issue is one input to the profile’s pooled ⚖️ ' + res.metric +
        ', weighted by how many judged ' + n.many + ' sit behind it. The headline figure on the ' +
        'profile is that pooled number, never this one issue.';
    } else if (res.state === 'thin') {
      // Same fork as the row face, one level down. "Too thin to divide" is true of a
      // record that took no side and false of nineteen votes we simply hold no
      // position against — and this line is the sentence that tells a reader why
      // their profile's headline figure did not move, so it has to name the right
      // reason. Neither wording changes what the pooled figure does: both are set
      // aside, exactly as before.
      score = (res.shape === 'no_stance')
        ? 'Set aside from the profile’s pooled ⚖️ ' + res.metric +
          ' rather than counted either way — there is no stated position here to test ' +
          'these ' + n.many + ' against, so nothing about this issue moves that number.'
        : 'Set aside from the profile’s pooled ⚖️ ' + res.metric +
          ' rather than counted as agreement — a row too thin to divide is disclosed, not scored.';
    } else {
      score = 'Not in the profile’s pooled score: there is nothing here to test yet.';
    }
    var jump = _dosTargetLive('pdxsec-wordaction')
      ? _stGo('wa', 'pdxsec-wordaction', r, '⚖️ Where this lands in the score')
      : '';
    return '<div class="pdxdos">' +
        '<div class="pdxdos-h">The short version</div>' +
        lines.join('') +
        comp + ev +
        (caveat ? '<div class="pdxdos-caveat">⚠ ' + esc(caveat) + '</div>' : '') +
        '<div class="pdxdos-score">' + esc(score) + (jump ? '<br>' + jump : '') + '</div>' +
      '</div>';
  }

  // Step to the next / previous issue WITHOUT leaving the dossier. Ranked by the
  // same ordering the stance list uses, so "next" here means the same thing it
  // means there. Reuses the sheet's own [data-pdxc-gap] route, so a step is just
  // another dossier open — no second navigation path to keep in sync.
  function _dosStepHtml(pid, issueKey) {
    var ranked = [];
    try { ranked = rankIssueRows(issueRows(pid)) || []; } catch (e) { ranked = []; }
    if (ranked.length < 2) return '';
    var at = -1;
    for (var i = 0; i < ranked.length; i++) if (ranked[i].key === issueKey) { at = i; break; }
    if (at < 0) return '';
    var btn = function (row, dir) {
      if (!row) return '';
      return '<button type="button" class="pdxdos-stepb" data-pdxc-gap="' + escAttr(row.key) + '"' +
        ' data-pdxc-gap-pid="' + escAttr(pid) + '">' +
        '<span aria-hidden="true">' + (dir < 0 ? '←' : '') + '</span>' +
        '<span><span class="pdxdos-stepn">' + (dir < 0 ? 'Previous issue' : 'Next issue') + '</span><br>' +
          esc(row.label) + '</span>' +
        '<span aria-hidden="true">' + (dir > 0 ? '→' : '') + '</span></button>';
    };
    var prev = btn(at > 0 ? ranked[at - 1] : null, -1);
    var next = btn(at < ranked.length - 1 ? ranked[at + 1] : null, 1);
    if (!prev && !next) return '';
    return '<div class="pdxdos-step">' + prev + next + '</div>';
  }

  function _gapViewHtml(pid, issueKey) {
    var off = officialIssue(pid, issueKey);
    var say = saydoIssue(pid, issueKey);
    var oNum = typeof off.score === 'number', sNum = typeof say.score === 'number';
    var lbl = _issueLabel(issueKey);
    var stance = _orStanceChip(pid, issueKey);
    // The row model, resolved once for this whole sheet. Everything the dossier says
    // about the verdict, the depth, the composition and where the issue lands in the
    // profile score is read off this — the sheet computes no opinion of its own.
    var _dosRow = issueRow(pid, issueKey);

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
      // NEITHER side carries a number — which does not mean nothing is known. The
      // sheet used to open on "— One side only… there's nothing to line up head-to-
      // head yet", a sentence about our comparison machinery rather than about the
      // politician, on the exact rows where a reader most needs the honest answer.
      // The row model already resolved one verdict for this issue; print THAT, in
      // words, and let the caveat line inside the summary below say how far it
      // reaches. No percentage: a row with no lane score has no number to show, and
      // inventing a shape for one is how a thin row starts looking tested.
      var _dv = _stResult(_dosRow);
      relHtml = '<span class="pdxdv-rel" style="color:' + _dv.color + ';border-color:' + _dv.color +
        '55;background:' + _dv.color + '1f;">' + esc(_dv.ico + ' ' + _dv.label) + '</span>';
      gapNote = '<div class="pdxgap-note">' + esc(_dv.why ||
        'Everything on file for this issue is assembled below, in one place.') + '</div>';
    }

    // ── The identity block ────────────────────────────────────────────────────
    // Issue, verdict, then face + name + office/state/party. The face is still the
    // fastest cue for a reader arriving from a shared card — recognition beats
    // reading — but it no longer costs the issue and the result their place at the
    // top of the sheet. It sits one line down, much smaller, on the same
    // row as the name and the lane eyebrow.
    var _id = _gapIdentity(pid);
    // ── The path in, made visible ─────────────────────────────────────────────
    // A reader arrives here by tapping a row in the issue index — a coloured line
    // filed under a named result. If the sheet then opens on a different colour and
    // a different word for the same finding, the tap reads as a jump to somewhere
    // else rather than as a zoom into the row. So the two cues the index used come
    // with it: the ISSUE's colour, on the title, and the BUCKET's word, under it.
    // Both are read from the surfaces that own them — PDXIssueColors and
    // PDXWordAction.OUTCOMES — never restated here, so neither can drift.
    var _tskin = _icSkin(issueKey);
    var _titleAttr = _tskin.on
      ? ' class="pdxgap-title pdxc-ic" style="' + _tskin.style + '"'
      : ' class="pdxgap-title"';
    // ── The header, issue-first ───────────────────────────────────────────────
    // WHAT CHANGED AND WHY. This header used to open with an identity slab: a
    // 3.1rem face beside a 0.62rem eyebrow, the member's name at 1.02rem and an
    // office/district/state/party sub-line — a large share of a phone's first
    // screen — before the issue was named and before the result was stated. That
    // ordering was chosen for the shared-card arrival, where recognition matters;
    // but the overwhelming majority of opens come from a stance row or an issue
    // index row INSIDE a profile, where the reader already knows exactly whose
    // record they are reading and is waiting on the one thing the slab pushed
    // below the fold: what the record said about this issue.
    //
    // So the sheet now leads with the issue and its result, and the identity moves
    // to a compact strip directly beneath them. Nothing is dropped — the face, the
    // name, the office line and the party chip are all still here, still first in
    // reading order among the person facts, and the arrival reader still gets
    // "same person, same card" within the first two lines. It is a re-ordering and
    // a re-sizing, not a removal.
    var head =
      '<div class="pdxgap-h">' +
        '<div' + _titleAttr + '>' + esc(lbl) + '</div>' +
        _dosBucketHtml(_dosRow) +
        // Verdict first, stated position second. The verdict is what the reader came
        // to check; the stance is the thing it was checked against.
        '<div class="pdxgap-meta">' + relHtml + (stance || '') + '</div>' +
        // Whose record this is, on one line, under the finding. The eyebrow that
        // used to sit above the name is folded in here as the lane cue it always
        // was, so the header carries the same facts in fewer rows.
        '<div class="pdxgap-id">' + _gapFaceHtml(_id) +
          '<div class="pdxgap-idmain">' +
            '<div class="pdxgap-who">' + esc(_id.name) + '</div>' +
            _gapSubHtml(_id) +
          '</div>' +
          '<span class="pdxgap-eyebrow">' + esc(eyebrow) + '</span>' +
        '</div>' +
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
    // Two genuinely different situations, and only one of them is a column:
    //
    //   · There IS curated public-record evidence → the two-column comparison, which
    //     is what this sheet was built for. Each item now carries the same four-slot
    //     teachable face the 🏛️ side gives every formal action — see the note on
    //     _sdEvidenceItems for what was already on file and going unrendered.
    //
    //   · There is NONE — which is most presidential dossiers, because the share
    //     gate selects on formal-record depth while the curated Say-vs-Do layer is
    //     hand-checked per person per issue. A narrow panel holding one grey line of
    //     "Nothing on the public record yet", beside a full column of sourced votes,
    //     reads as a page that failed to load. The absence is real, so it is stated
    //     on purpose AND made actionable: the Official Record takes the full width,
    //     and the 🧾 side becomes a named coverage gap with the one control this
    //     product already has for exactly this — PDXGaps' ＋ Suggest a lead.
    //
    // Nothing is invented and no score appears on this side in either case.
    var sayItems = _sdEvidenceItems(say.curated, { full: true });
    var sayCounts = _sdCounts(say.curated);
    var sayHas = sayItems.length > 0 || sNum;
    var saySide, sidesCls = '';
    // THE LANDING PAD. A tally on an issue row promises "the public receipts are in
    // here"; the promise is only kept if the sheet can be asked to stop at them.
    // Both branches carry the same hook so the focus lands either way — on the
    // column when there are receipts, and on the coverage gap when there are none,
    // because "nothing on file yet" is precisely the answer a reader who tapped an
    // empty tally came for. The hook is an attribute rather than an id: dossiers are
    // rendered as whole HTML strings and an id that turns out to exist twice is a
    // silent scroll to the wrong panel.
    if (sayHas) {
      saySide =
        '<div class="pdxgap-side" data-pdxgap-public="tally">' +
          '<div class="pdxgap-side-h"><span class="pdxgap-side-name"><span aria-hidden="true">🧾</span> ' +
            LT('saydo', 'Say-vs-Do') + '</span>' +
            _gapScorePill(sNum, say.score, say.scoreMeta, say.verdict.color) + '</div>' +
          '<div class="pdxgap-side-sub">Public-record evidence — statements, news, controversies' + (sayCounts ? ' · ' + sayCounts : '') + '</div>' +
          // THE WALL, said where the two columns meet. The 🏛️ pill beside this one is
          // a Direction Match built from formal instruments only; nothing in this
          // column is inside that number, and a reader looking at two panels side by
          // side has every reason to assume otherwise unless told.
          '<div class="pdxgap-side-wall">Kept out of the 🏛️ ' + LT('directionmatch', 'Direction Match') +
            ' — public-record items are never merged into the formal figure.</div>' +
          '<div class="pdxgap-acts">' + sayItems.join('') + '</div>' +
        '</div>';
    } else {
      sidesCls = ' pdxgap-sides-solo';
      saySide =
        '<div class="pdxgap-solo" data-pdxgap-public="empty">' +
          '<div class="pdxgap-solo-h"><span aria-hidden="true">🧾</span> ' +
            LT('saydo', 'Say-vs-Do') + ' — nothing on file for this issue yet</div>' +
          '<div class="pdxgap-solo-b">This is an <b>Official Record</b> read: it is built from ' +
            'formal roll-call votes and legislative actions, and those are ' +
            (oNum || offItems.length ? 'on file here.' : 'what this sheet covers.') +
            ' Curated public-record evidence for <b>' + esc(_id.name) + '</b> on <b>' + esc(lbl) +
            '</b> — statements, interviews, news, controversies — has not been checked in yet.</div>' +
          '<div class="pdxgap-solo-n">That is a gap in our coverage, not a verdict, and it changes ' +
            'nothing above: the two records are scored separately and are never merged into a ' +
            'single number, so the Official Record figure stands on its own either way.</div>' +
          // The dead end, made into a door. Same module, same taxonomy, same thread
          // target and the same composer as every other gap in the product — see
          // PDXGaps.publicRecordGap. Absent module → the three sentences above stand
          // exactly as they did, which is the state this shipped in.
          _sdGapHtml(pid, issueKey) +
        '</div>';
    }

    return head +
      // ── L1 ── the assembled answer, open. Directly under the identity block,
      // because the question a reader arrives with is "so what did they do about
      // this", not "which panels exist".
      _dosSummaryHtml(pid, issueKey, _dosRow) +
      '<div class="pdxgap-sides' + sidesCls + '">' + offSide + saySide + '</div>' +
      // ── THE WALL, EXPLAINED WHERE IT IS VISIBLE ──────────────────────────────
      // Immediately below the two columns, because that is the inch of screen where
      // a reader has just seen the lanes disagree and has no way to interpret it.
      // Prints on the shapes the detector recognises and nothing otherwise — see
      // laneDisagreement(). It reaches no verdict and shows no number.
      _laneBandHtml(_dosRow) +
      // ── L2 ── every instrument on this issue, closed. It sits below the two
      // record panels rather than above them because those panels quote the
      // DECISIVE items; this is the complete enumeration they were drawn from, and
      // a list is only legible once you know what it is a list of.
      _dosRecordsHtml(pid, issueKey, _dosRow, off) +
      // The outstanding curation on the list directly above, counted on the closed
      // face so a sheet full of unexplained mappings cannot look like a finished one.
      // Prints nothing at zero — see _dosQueueHtml.
      _dosQueueHtml(pid, issueKey, off) +
      // Sideways, not backwards: the next issue's dossier without a trip through
      // the profile and back.
      _dosStepHtml(pid, issueKey) +
      _gapNextHtml(pid, issueKey) +
      '<div class="pdxgap-foot">🏛️ formal record and 🧾 public record are kept separate — this shows both side by side, it never blends them into one score. ' +
        LT('contradiction', 'What counts as a contradiction') + ' · ' +
        LHOWTO('say-vs-do', 'How to read this') + '</div>';
  }

  // ── HOW MANY MAPPINGS ON THIS ISSUE NOBODY HAS EXPLAINED ────────────────────
  // Counted off the same normalised list the rows are rendered from, so the number
  // on the queue row and the number of marked rows in the list cannot drift. Only
  // lanes with a curation slot are in the denominator — see _DOS_CURATABLE — which
  // is what keeps this a queue of work someone can actually do. Pure, cheap, and
  // fails closed to zero: a throw anywhere means no queue row rather than a wrong
  // one.
  function _dosUnexplained(pid, issueKey, ov) {
    var items = [];
    try { items = _dosItems(pid, issueKey, ov) || []; } catch (e) { return { n: 0, listed: 0 }; }
    var n = 0, listed = 0;
    for (var i = 0; i < items.length; i++) {
      var d = items[i];
      if (!d || d.held || !_DOS_CURATABLE[d.lane]) continue;
      listed++;
      if (_dosNeedsCurator(d)) n++;
    }
    return { n: n, listed: listed };
  }
  // ── AND THE QUEUE THAT CLOSES ITSELF ────────────────────────────────────────
  // The per-row marker tells a reader that THIS line is unexplained. It does not
  // tell them how much of the issue is in that state, and it is inside a collapsed
  // list, so a sheet can be entirely unexplained and look complete on its closed
  // face. This line states the count where it is visible, and states it as what it
  // is: our own outstanding writing, not a defect in the record.
  //
  // Rendered as a real PDXGaps row rather than a lookalike, for the same reason the
  // 🧾 hole below the empty public panel is — PDXGaps owns the taxonomy, the
  // `gap:<pid>:<slug>` thread target, the lead composer and the moderation round
  // trip, and one contribution system means one queue and one set of words. And,
  // like every other gap in that module, it is DERIVED and never stored: the day a
  // curator lands the sentences the count falls, and at zero this returns '' and the
  // row disappears on its own. There is nothing to reconcile and nothing that can go
  // on claiming a hole that has already been filled.
  function _dosQueueHtml(pid, issueKey, ov) {
    try {
      var u = _dosUnexplained(pid, issueKey, ov);
      if (!u.n) return '';
      var G = window.PDXGaps;
      if (!G || typeof G.mappingGap !== 'function' || typeof G.rowHtml !== 'function') return '';
      var g = G.mappingGap(pid, issueKey, u.n, u.listed, null);
      var row = g ? G.rowHtml(g) : '';
      return row
        ? '<ul class="pdxg-list pdxdos-queue" data-pdxdos-queue="' + u.n + '"' +
            ' data-pdxdos-queue-of="' + u.listed + '">' + row + '</ul>'
        : '';
    } catch (e) { return ''; }
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

  // THE SAME DOOR, INSIDE AN OFFICIAL RECORD ROW. This was a "⚖️ Diverges — compare →"
  // link: one more set of words for a result the rest of the profile already names, and
  // one that only appeared when the issue happened to carry a real % on BOTH the vote
  // side and the public-record side, so most rows had no way into the dossier at all.
  // It is now the shared door — the bucket the index filed this issue under, in the
  // index's own word and colour, opening the same assembled sheet as every other entry
  // row, and carrying this row's id so closing returns the reader to it.
  //   FAIL CLOSED. No bucket, no door: an issue the index never filed — pending, no
  // record, nothing stated — gets no link rather than a link to an empty sheet.
  function _gapLinkHtml(pid, issueKey) {
    var o = _bucketAt(pid, issueKey);
    if (!o) return '';
    return '<button type="button" class="pdxdv-open pdxdos-door" data-pdxc-gap="' + esc(issueKey) +
      '" data-pdxc-gap-pid="' + esc(pid) + '"' +
      ' data-pdxc-gap-origin="' + escAttr(orRowId(pid, issueKey)) + '"' +
      ' style="--c:' + o.col + '"' +
      ' aria-label="' + escAttr(_dosDoorLabel(_issueLabel(issueKey), o, '')) + '"' +
      ' title="Everything on the record for this issue, in one place">' +
      '<span class="pdxdos-door-b">' + esc(o.short) + '</span>' +
      '<span class="pdxdos-door-r">— open the issue dossier <span aria-hidden="true">→</span></span>' +
      '</button>';
  }

  // ── gap sheet: a single lazily-built bottom-sheet, reused for every issue ────
  //
  // REVALIDATED, NOT JUST CACHED. `_gapSheet` used to be a permanent reference
  // taken on first build. It survives a warm repaint of the section that opened
  // it — the sheet lives on <body>, not inside the section — but it does not
  // survive anything that replaces the body's children, and a detached node is
  // indistinguishable from a working one at the point of use: innerHTML is set,
  // hidden is cleared, and nothing appears on screen. That is a dead tap that
  // reports success. So the cached node is only reused while it is still in the
  // live document; otherwise it is rebuilt.
  var _gapSheet = null;
  function _gapSheetLive(node) {
    try {
      if (!node || !node.parentNode) return false;
      var root = document.body || document.documentElement;
      if (!root) return false;
      if (root.contains) return root.contains(node);
      // No contains(): walk up the parent chain instead. The question is the same
      // one — is this node still reachable from the document — and answering it by
      // hand is what keeps a rebuilt page from being served a node it has dropped.
      for (var n = node, hops = 0; n && hops < 200; n = n.parentNode, hops++) {
        if (n === root) return true;
      }
      return false;
    } catch (e) { return false; }
  }
  function _ensureGapSheet() {
    if (_gapSheet && _gapSheetLive(_gapSheet)) return _gapSheet;
    _gapSheet = null;
    // A rebuild leaves the old backdrop's id behind, and closeGap() finds the
    // sheet by id. Clear any stale one out first so there is exactly one.
    try {
      var old = document.getElementById('pdxc-gap-back');
      if (old && old.parentNode) old.parentNode.removeChild(old);
    } catch (e) {}
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
  // What is open right now, and where the reader came from. Two jobs:
  //   · the warm listener needs to know which dossier to repaint when a member's
  //     votes land after the sheet is already on screen;
  //   · closeGap needs to put a reader who came from a stance row back ON that row,
  //     not at the top of whatever section happens to be under the backdrop.
  var _gapOpen = null;
  // THE HONEST EMPTY DOSSIER. `_gapViewHtml` assembles this sheet out of a dozen
  // independent readers — the row model, both lanes, the receipts, the veto and
  // standing lines. On bundled data every one of them holds for every issue we
  // ship. On a live profile the shape underneath can differ, and a single reader
  // throwing used to take the whole tap with it: the click was consumed, the
  // sheet was never filled, and the reader got nothing and no reason.
  //
  // Failing closed means the door still opens and says what happened. It names
  // the person and the issue so the reader can see the tap was heard, states
  // plainly that this one dossier could not be assembled — not that there is no
  // record — and keeps the exits, so the sheet is never a dead end.
  function _gapFallbackHtml(pid, issueKey) {
    var lbl = '', who = '';
    try { lbl = _issueLabel(issueKey) || String(issueKey || ''); } catch (e) { lbl = String(issueKey || ''); }
    try { who = (_gapIdentity(pid) || {}).name || ''; } catch (e) {}
    var next = '';
    try { next = _gapNextHtml(pid, issueKey) || ''; } catch (e) {}
    return '<div class="pdxgap-head">' +
        '<div class="pdxgap-eyebrow">⚖️ Word vs Action</div>' +
        '<div class="pdxgap-title">' + esc(lbl) + '</div>' +
        (who ? '<div class="pdxgap-sub">' + esc(who) + '</div>' : '') +
      '</div>' +
      '<div class="pdxgap-lead">We could not assemble this issue’s dossier just now. ' +
      'That is a fault on our side, not a statement about ' + (who ? esc(who) + '’s' : 'the') +
      ' record on ' + esc(lbl) + ' — the record is still there, and the profile’s own ' +
      'figures for this issue are unchanged. Try it again, or take one of the routes below.</div>' +
      next;
  }

  // LANDING ON THE PUBLIC COLUMN. The 🧾 tally on an issue row opens this same
  // sheet, so the only thing that has to be new is where it stops. The panel is
  // found by the hook both branches of _gapViewHtml write — the receipts column
  // when there are receipts, the coverage gap with its ＋ Suggest a lead composer
  // when there are not — and it is lit for a moment on arrival, because a sheet
  // that silently opens mid-scroll reads as a sheet that opened wrong.
  //   Measured against the sheet rather than the viewport: .pdxgap-sheet is the
  // scroll container, and scrollIntoView on a node inside a fixed bottom sheet can
  // take the page behind it along for the ride. The viewport call is kept only as
  // the fallback for a layout where the offset walk does not reach the sheet.
  function _gapFocusPublic(sheet, body) {
    return _gapFocusSel(sheet, body, '[data-pdxgap-public]');
  }
  // Scroll-and-flash, by selector. Two callers now — the 🧾 tally on a stance row
  // asks for the public panel, the lane-disagreement line asks for the explainer —
  // and they differ in exactly one string, so they share the walk rather than
  // keeping two copies of an offsetTop loop that has to stay identical.
  function _gapFocusSel(sheet, body, sel) {
    var el = null;
    try { el = body.querySelector && body.querySelector(sel); } catch (e) {}
    if (!el) return false;
    try {
      var top = 0, n = el, hops = 0;
      while (n && n !== sheet && hops < 40) { top += n.offsetTop || 0; n = n.offsetParent; hops++; }
      if (n === sheet) sheet.scrollTop = Math.max(0, top - 14);
      else if (el.scrollIntoView) el.scrollIntoView({ block: 'center' });
    } catch (e) {}
    try {
      if (el.classList) {
        el.classList.add('pdxgap-lit');
        setTimeout(function () { try { el.classList.remove('pdxgap-lit'); } catch (e2) {} }, 1900);
      }
    } catch (e) {}
    return true;
  }

  function openGap(pid, issueKey, opts) {
    if (!pid || !issueKey || !document.body) return false;
    var sheet = _ensureGapSheet();
    if (!sheet) return false;
    var body = sheet.querySelector('.pdxgap-body');
    if (!body) return false;
    // The assembly is allowed to fail; the tap is not. See _gapFallbackHtml.
    var html = '';
    try { html = _gapViewHtml(pid, issueKey) || ''; } catch (e) { html = ''; }
    if (!html) { try { html = _gapFallbackHtml(pid, issueKey); } catch (e2) { html = ''; } }
    body.innerHTML = html;
    var arrival = _gapIsArrival(opts);
    // This sheet is one politician on one issue. PDXIssueView is everyone on one
    // issue, and the two used to announce themselves with the same generic label.
    // Naming the person and the issue is what tells a screen-reader user which of
    // the two they just opened.
    try {
      var _who = (_gapIdentity(pid) || {}).name || '';
      sheet.setAttribute('aria-label',
        'Issue dossier: ' + _issueLabel(issueKey) + (_who ? ' — ' + _who : ''));
    } catch (e) {}
    // An arrival has no profile behind it, so it has no row to go back to. Stepping
    // sideways to the next issue INHERITS the origin: the reader still came from one
    // stance row, and that is still where closing should return them.
    _gapOpen = {
      pid: pid, key: issueKey,
      origin: arrival ? ''
        : ((opts && opts.origin) ? String(opts.origin)
          : ((_gapOpen && _gapOpen.pid === pid) ? _gapOpen.origin : ''))
    };
    var back = sheet.parentNode;
    if (!back) return false;
    _gapArrive(back, arrival);
    back.hidden = false;
    try { sheet.scrollTop = 0; sheet.focus(); } catch (e) {}
    // …unless the tap asked for the public side. The sheet still opens the same way
    // and the focus still lands on the dialog for a keyboard reader; only the scroll
    // position differs, and only when a caller asked.
    if (opts && opts.focus === 'public') _gapFocusPublic(sheet, body);
    // …or for the explainer under the two columns. Falls back to the public panel
    // when the band is not on this sheet, so the tap still lands somewhere true.
    else if (opts && opts.focus === 'lanes') {
      if (!_gapFocusSel(sheet, body, '[data-pdxgap-lanes]')) _gapFocusPublic(sheet, body);
    }
    // …or for the formal enumeration, which is where a reader who tapped "see the 18
    // votes" was told they were going. The list is a <details> and ships collapsed —
    // scrolling someone to a closed drawer is the same dead end wearing a scrollbar —
    // so this opens it first. No fallback to the public column: this tap was about the
    // formal record, and landing it on the other lane would answer a question nobody
    // asked. When the hook is absent the sheet simply opens at the top, as before.
    else if (opts && opts.focus === 'record') {
      try {
        var _rec = body.querySelector && body.querySelector('[data-pdxgap-record]');
        if (_rec && _rec.tagName === 'DETAILS') _rec.open = true;
      } catch (e) {}
      _gapFocusSel(sheet, body, '[data-pdxgap-record]');
    }
    // A reader arriving from a shared card's #record= link can reach this before the
    // vote record is warm, so the reveal pass runs on every open rather than once.
    _rcHydrateSoon();
    // Same reason for the header's person-level control: it is already visible, and
    // this is what upgrades its icon and accessible name from "profile link" to the
    // card it can actually send once the record lands.
    _saHydrateSoon();
    // TRUE means a sheet is on screen with something in it. Callers use this to
    // decide whether they are allowed to consume the reader's tap.
    return true;
  }
  function closeGap() {
    var back = document.getElementById('pdxc-gap-back');
    if (back) back.hidden = true;
    // THE RETURN PATH. The stance row is where the reader was reading; a dossier
    // that dumps them at the top of the page on close costs them the place they had
    // scrolled to, which is the whole reason they can be reluctant to open one.
    // Guarded on the row still being in the document: after a warm repaint or a
    // profile switch it may not be, and _stBack already fails closed on that.
    var o = _gapOpen; _gapOpen = null;
    if (o && o.origin) {
      try { if (document.getElementById(o.origin)) _stBack(o.origin); } catch (e) {}
    }
  }

  // ── Methodology & boundary explainer (Phase 11) ─────────────────────────────
  // A short, plain-language "how we score this" surface, reachable from the
  // profile's "How this profile was checked" control. Reuses the same bottom-sheet
  // as the gap view. Non-defensive: states what the number means, the thin-data
  // rules, when a record is allowed to read Mixed, and what is deliberately left out.
  //
  // `pid` is OPTIONAL and is used for one thing only: ordering. The sheet is shared
  // by every profile, so both lanes are always described — but a president opening it
  // must not be told first that their score comes from roll-call votes, which is the
  // one thing the office does not produce. With an exec-eligible pid the ✒️ row leads
  // and the 🏛️ row is labelled as the other lane. Called with no pid (the hub, the
  // showcase, the receipt-card footer) it renders the congressional order it always did.
  function methodologyHtml(pid) {
    var row = function (icon, title, body, id) {
      return '<div class="pdxm-row"' + (id ? ' data-pdxm-row="' + esc(id) + '"' : '') + '>' +
        '<div class="pdxm-row-h"><span aria-hidden="true">' + icon + '</span> ' + esc(title) + '</div>' +
        '<div class="pdxm-row-b">' + body + '</div></div>';
    };
    var isExec = false;
    try { isExec = !!(pid && execEligible(pid)); } catch (e) {}
    var voteRow = row('🏛️', isExec ? 'Official Record % — in Congress' : 'Official Record %',
      'What their <b>formal record</b> shows: the share of their votes and formal legislative or legal actions on an issue that <b>match the position they\'ve stated</b>. Built only from roll-call votes and formal actions — never from statements or news.');
    var execRow = row('✒️', isExec ? 'Official Record % — in the White House' : 'Presidents and the formal record',
      'A president casts <b>no roll-call votes</b>, so the Official Record ' + (isExec ? 'on this profile' : 'above') + ' is built from what the office actually does: the <b>laws they signed or vetoed</b>, the <b>executive orders</b> and the formal directives on file, each mapped to the issues it touches and checked against the same stated positions. It is the <b>same score on the same scale</b> — there is no separate presidential rating. Two limits are worth knowing. Where an order was <b>blocked or narrowed by a court</b>, we record that standing beside the action rather than treating the signature as the end of the story. And where a stated position was <b>written from the very document that would test it</b>, we show the two side by side and leave the pair out of the number — a position quoting an order cannot also be the test of that order, and counting it would return 100% for reasons that mean nothing.');
    return '<div class="pdxm">' +
      '<div class="pdxgap-eyebrow">⚖️ Word vs Action</div>' +
      '<div class="pdxgap-title">How we score this</div>' +
      '<div class="pdxm-lead">One integrity read: does what they say match what they do? Everything below is either an input to that read or a boundary on it. There is no second percentage and no blended “honesty” score.</div>' +
      // The ✒️ lane leads on a profile that has one; the 🏛️ wording is correct for
      // almost everyone the app covers, so it is reordered rather than rewritten.
      (isExec ? execRow + voteRow : voteRow + execRow) +
      row('🧾', 'The broader public record', 'Statements, interviews, news and controversies are collected as <b>evidence</b> and shown beside the issue they touch. They are <b>not scored as a rival percentage</b>: they decide an issue\'s verdict only where no formal action exists that could test it, and everywhere else they are context sitting next to the action that did the testing.') +
      row('…', 'When the record is thin', 'We don\'t turn a couple of items into a confident number. Below a small minimum we show “—” or “not enough record yet” instead of a misleading 0% or 100%. A coverage line on each section shows how much of their record we actually have so far.') +
      // The Mixed rule is a real scoring decision and the one most likely to be read
      // as a hedge, so it is written down where a reader can hold us to it.
      row('◑', 'When a record reads Mixed', 'Mixed is <b>not</b> a shrug and it is not the middle of a scale. It is reserved for a record that genuinely points both ways: either <b>several formal actions on the same issue pull in different directions</b>, or <b>one omnibus action both advances and undercuts</b> the stated position in material ways, with neither side dominant. Where one direction carries roughly two thirds or more of the weight, that direction <b>is</b> the verdict — a law that clearly breaks a stated commitment reads as <b>Says one thing, does another</b>, not as Mixed. And where the record is simply <b>thin or uncertain</b>, it reads as <b>not enough record yet</b>. Mixed is never used to soften a clear break.') +
      // The overall % is a real scoring decision a reader can check us on, so it is
      // stated here and not only in the composition line's tooltip.
      row('📊', 'How the overall % is built', 'The overall Official Record % averages the per-issue percentages, <b>weighted by how many judged votes or actions sit behind each issue</b> — so an issue decided by a single vote counts less than one decided by ten. No issue is dropped for being thin: the depth behind every number is shown beside it, and the overall figure tells you what the plain unweighted average would have been whenever the two differ.') +
      row('⚖️', 'Why the lanes stay separate', 'Formal actions and public statements answer different questions, so pooling them into one figure would hide more than it reveals. The formal record is what <b>tests</b> a stated position; the public record is what <b>surrounds</b> it. Both appear on the issue, labelled for what they are — but one issue gets <b>one verdict</b>, from one engine, on every surface it appears on.') +
      row('🧩', 'One vote, several issues', 'Omnibus and reconciliation bills bundle many unrelated policies into one measure, so a member gets a single yes-or-no on all of it. We score <b>each issue on its own</b>, which means one roll call can keep a promise on taxes and break one on healthcare at the same time. That isn\'t double-counting: it\'s one vote, judged once per issue it actually touched. Anywhere a verdict rests on a multi-issue bill, we label it 🧩 and list the other issues that vote covered.') +
      row('↔️', 'What the divergence labels mean', 'They compare the <b>two records</b> — formal and public — and nothing more. <b>Same story</b> — the two agree. <b>Some daylight</b> — mostly, with a gap. <b>Different stories</b> — they disagree. These deliberately avoid the words the issue index uses for a result (Backed up · Mixed · Contradicted · Thin record): those say whether the record backed what was <b>said</b>, which is a different question from whether the two records agree with <b>each other</b>. Neither of these is a score.') +
      // The procedural down-weight is a real scoring decision a reader can check
      // us on, so it belongs in the methodology sheet rather than only in a
      // tooltip on the card that happens to carry the tag.
      row('⚙️', 'Why some votes count less', 'A ' + LT('procedural', 'procedural vote') +
        ' — whether to debate a bill, send it back, or move on — counts at <b>a quarter</b> of the weight of a vote on the policy itself. These are real votes with real outcomes, but floor-control pressure drives them more than personal conviction, so one of them never outweighs a member\'s actual vote on the bill. On a ' +
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
        'Sharing also never moves a number — a shared 🏛️ Official Record card is a picture of a verdict this page already reached, and printing it changes nothing about how that verdict was reached.',
        'cards') +
      row('📖', 'If a term is unfamiliar', 'Anything with a dotted underline anywhere in PolitiDex opens a short, plain-language definition — ' +
        LT('hr', 'H.R.') + ', ' + LT('rollcall', 'roll-call vote') + ', ' + LT('omnibus', 'omnibus') +
        ', ' + LT('cloture', 'cloture') + '. Definitions describe the process, never a party or a policy.' +
        (window.PDXLearn ? ' <button type="button" class="pdxl-link" data-pdxl-glossary>Open the full glossary →</button>' : '')) +
      '<div class="pdxgap-foot">One score. No formal action counted twice. Every item links to its source.</div>' +
      '</div>';
  }
  // `pid` is optional and only decides which lane the sheet leads with — see
  // methodologyHtml. Every existing caller passes focus alone and is unaffected.
  function openMethodology(focus, pid) {
    if (!document.body) return;
    var sheet = _ensureGapSheet();
    var body = sheet.querySelector('.pdxgap-body');
    if (body) body.innerHTML = methodologyHtml(pid);
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
      forIssue: execRecordsForMemo,
      summary: execIssueSummary,
      issues: execIssueKeys,
      identifiers: execIdentifiers,
      namesDocument: execNamesDocument,
      saidText: execSaidText,
      proofText: execProofText,
      proofLines: execProofLines,
      // ── term scope ────────────────────────────────────────────────────────
      // The default is all_time and it is stated here rather than left implicit,
      // because the previous default was current_term and nothing said so out loud.
      // `withScope` is the only way to change it: there is no setter, so a scope
      // cannot outlive the read that asked for it.
      SCOPES: EXEC_TERM_SCOPES,
      DEFAULT_SCOPE: EXEC_SCOPE_DEFAULT,
      scope: execTermScope,
      withScope: withExecTermScope,
      serving: execServing,
      currentTerm: execCurrentTerm
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
    // The public lane's words, in one place. Both surfaces render from these and the
    // tests assert against them, so the tally on an index row and the tally on a
    // stance row cannot say the same thing in two different ways — and neither can
    // hand-count what the row model already counted.
    publicTally: publicTally,
    publicCoverage: publicCoverage,
    // ── THE ROW'S OWN RESULT, INCLUDING ITS PER-ISSUE FIGURE ────────────────
    // What one issue row concluded, as data: { state, pct, metric, label, ico,
    // color, cls, why, bucket }. `state` is 'tested' | 'limited' | …, `pct` is the
    // figure for THIS ISSUE ALONE, and `metric` is the name that belongs to the
    // lane which produced it — "Direction match" for the formal record,
    // "Public-record match" for a row the public lane decided. The two names are
    // not interchangeable and the caller must print the one it is handed.
    //
    // Exported because the issue index in word-action.js now prints this figure on
    // the row face, and a second implementation of "what is this issue's
    // percentage" is exactly how one profile comes to state a row's result twice,
    // in two vocabularies, off two arithmetics. One helper, both surfaces.
    //
    // IT IS NOT THE PROFILE'S SCORE AND CANNOT BECOME IT. This reads a single row.
    // The one headline figure on a profile is ⚖️ Word vs Action's pooled Direction
    // Match, which weighs statements by testability across the whole ledger — see
    // _read() in word-action.js. Averaging these row figures would produce a
    // different number with the same name.
    rowResult: _stResult,
    verdictTally: verdictTally,
    mixedGate: mixedGate,
    rankIssueRows: rankIssueRows,
    ROW_TIER: ROW_TIER,
    gatewayHtml: gatewayHtml,
    officialRecordSectionHtml: officialRecordSectionHtml,
    // Which formal-record lanes a figure actually has: { exec, vote, both, keys }.
    // The Official Record is one gateway for all of them — exported so the rail, the
    // harnesses and any future surface can ask the same question the section asks
    // instead of re-deriving "is this a president?" from the office gate.
    recordLanes: recordLanes,
    // 🧭 Stances & Connections — the "what they stand for" layer. A consumer of the
    // row model above, not a second one: it ranks with rankIssueRows() and prints the
    // verdict the row already resolved.
    stancesSectionHtml: stancesSectionHtml,
    // UNMOUNTED, STILL EXPORTED. Nothing on a profile renders saydoSectionHtml() or
    // divergenceSectionHtml() any more — the public record is an input to issueRow()
    // and the divergence they used to argue about cannot occur when one row resolves
    // one verdict. The data accessors (sayVsDo, divergence) still back the gap sheet
    // and the share card, and the two section renderers are kept so those callers,
    // and anything embedding a single feed outside a profile, do not break.
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
    // The issue dossier's own pieces, exported so each level can be checked on its
    // own terms rather than only through the assembled sheet: the normalised item
    // list (L2's data), one item's expanded detail (L3+L4), and the L1 summary.
    dossierItems: _dosItems,
    dossierSummaryHtml: _dosSummaryHtml,
    dossierRecordsHtml: function (pid, issueKey) {
      return _dosRecordsHtml(pid, issueKey, issueRow(pid, issueKey), officialIssue(pid, issueKey));
    },
    dossierDetailHtml: _dosDetailHtml,
    dossierStepHtml: _dosStepHtml,
    // WHY THE TWO RECORDS CAN DISAGREE, as data and as the band that prints it.
    // Exported so scripts/test-lane-disagreement.mjs can hold the detector to the
    // shapes it claims to cover — and hold the copy to being fixed per shape —
    // without asserting on the source text of the function that writes it.
    laneDisagreement: laneDisagreement,
    laneBandHtml: _laneBandHtml,
    laneShapes: function () {
      var out = {};
      for (var k in LANE_SHAPES) if (Object.prototype.hasOwnProperty.call(LANE_SHAPES, k)) {
        out[k] = { head: LANE_SHAPES[k].head, lead: LANE_SHAPES[k].lead, chip: LANE_SHAPES[k].chip };
      }
      return out;
    },
    // The two derivations the levels have to agree on, exported so a test can hold
    // them to each other directly: the mechanism sentences one row shows, and the
    // reconciliation between the count L1 claims and the rows L2 can enumerate.
    dossierMechanism: _dosMechanism,
    // The outstanding-curation count for one issue, and the queue row it produces.
    // Exported so a harness can hold the marked rows and the stated number to each
    // other without scraping HTML for either.
    dossierUnexplained: function (pid, issueKey) {
      return _dosUnexplained(pid, issueKey, officialIssue(pid, issueKey));
    },
    dossierQueueHtml: function (pid, issueKey) {
      return _dosQueueHtml(pid, issueKey, officialIssue(pid, issueKey));
    },
    // One document read across every issue it was mapped to. Exported as data and as
    // markup so a harness can check the trail against the per-issue dossiers it was
    // assembled from, rather than against a rendering of itself.
    instrumentTrail: function (pid, issueKey, idx) {
      var items = _dosItems(pid, issueKey, officialIssue(pid, issueKey)) || [];
      return items[idx] ? _insTrail(pid, items[idx], issueKey) : null;
    },
    instrumentTrailHtml: function (pid, issueKey, idx) {
      var items = _dosItems(pid, issueKey, officialIssue(pid, issueKey)) || [];
      var o = items[idx] ? _insTrailOpts(pid, items[idx], issueKey) : null;
      return o ? o.html : '';
    },
    dossierCoverage: function (pid, issueKey) {
      return _dosCoverage(pid, issueKey, officialIssue(pid, issueKey));
    },
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
    // "Is the wait over for this member?" — the one question a surface has to be
    // able to ask before it publishes a score, so it can show a skeleton instead of
    // a guess it will have to take back. See recordSettled().
    recordSettled: recordSettled,
    label: function (t) { return (VERDICTS[t] || VERDICTS.no_record).label; },
    icon: function (t) { return (VERDICTS[t] || VERDICTS.no_record).ico; },
    meta: function (t) { return VERDICTS[t] || VERDICTS.no_record; }
  };

  try { if (document.readyState !== 'loading') ensureStyles(); else document.addEventListener('DOMContentLoaded', ensureStyles); } catch (e) {}
})();
