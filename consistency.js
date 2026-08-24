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
  // ── TEACHING THE ROW'S OWN VOCABULARY, WHERE THE READER MEETS IT ────────────
  // The reason line under an unscored row is the one place in the product a
  // visitor is shown "advanced it", "cut against it" or "ran both ways", and
  // until now it was also the only place those phrases appeared at all: the
  // glossary had entries for roll calls and omnibus bills and nothing for the
  // words the recent honesty ships actually put on the face. A skeptical reader
  // met the claim several screens before any definition of it, which is the
  // wrong order for the one audience this surface is built for.
  //
  // ONE LESSON PER LINE. Both directional phrases share a single entry, so
  // linking the second occurrence in "13 cut against it, 7 advanced it" would put
  // two dotted controls on one clause and teach nothing the first did not. Only
  // the first match of each rule is wrapped, and the rules must stay mutually
  // exclusive in the text they match — a rule whose phrase could occur inside
  // another rule's rendered button would linkify markup. There is a test on that.
  //
  // WHERE IT MAY RUN. On already-escaped element text only. It replaces plain
  // ASCII phrases, so it cannot straddle an entity or reopen a tag — but it must
  // never touch a tooltip or an aria-label, which are attribute values: a
  // <button> in one of those is printed as literal angle brackets. The tips are
  // built on the raw string through escAttr and stay untouched.
  var _ST_TEACH = [
    { re: /(advanced it|cut against it)/, key: 'recorddirection' },
    { re: /(ran both ways)/, key: 'ranbothways' }
  ];
  function _stTeach(escaped) {
    var s = String(escaped == null ? '' : escaped);
    for (var i = 0; i < _ST_TEACH.length; i++) {
      var m = _ST_TEACH[i].re.exec(s);
      if (!m) continue;
      s = s.slice(0, m.index) + LT(_ST_TEACH[i].key, m[0]) + s.slice(m.index + m[0].length);
    }
    return s;
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
      // ── Record direction, on a decision surface ─────────────────────────────
      // Deliberately UNTINTED. Every verdict chip above owns a colour and the
      // colour is the verdict; a record-direction slot has no verdict to colour,
      // so it borrows none. It reads as calm inventory text — which is what it is
      // — and the three empty states differ in wording rather than in hue, so no
      // surface can imply a judgement by styling one.
      '.pdx-rdir{display:inline-flex;flex-wrap:wrap;align-items:baseline;gap:0.3rem;font-family:"Barlow",sans-serif;font-size:0.72rem;line-height:1.45;color:#a9bcd8;}' +
      '.pdx-rdir .pdx-rdir-ico{opacity:0.85;}' +
      '.pdx-rdir .pdx-rdir-txt{color:#c6d4ec;}' +
      '.pdx-rdir.is-none .pdx-rdir-txt,.pdx-rdir.is-thin .pdx-rdir-txt{color:#9fb4d4;}' +
      '.pdx-rdir .pdx-rdir-note{flex:1 1 100%;font-size:0.66rem;color:#7596c0;}' +
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
      '.pdxcov b{color:#cfe0ff;}' +
      '.pdxcov-sub{display:block;margin-top:0.16rem;color:#7f97b8;font-size:0.64rem;}' +
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
      // The ledger standing. Same muted plate as a thin chip — it is not a worse
      // result and must not look like one — with a dashed edge borrowed from the
      // "no position on record" chip beside it, because both are saying the same
      // thing about the same missing side of the comparison.
      '.pdxor-recchip-led{border-style:dashed;letter-spacing:0.01em;}' +
      // The split, under the reason. Reads as a continuation of it rather than as a
      // second claim: same plate, no top margin, one hairline between them.
      '.pdxor-why-led{margin-top:0;border-top:none;border-top-left-radius:0;border-top-right-radius:0;' +
        'color:#8fa2c0;}' +
      // Which way one instrument cut. A pill, not a verdict chip: the arrows are the
      // issue's own direction and carry no colour of their own, so no row can be read
      // as good or bad from across the page.
      '.pdxor-proof-dir{font-size:0.62rem;color:#9fb4d4;border:1px solid rgba(159,180,212,0.22);' +
        'border-radius:999px;padding:0.02rem 0.34rem;white-space:nowrap;}' +
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
      // One document under the percentage, beside the meter that counts items.
      // Same amber as the composition note it qualifies, boxed so it reads as a
      // fact about the row rather than as a continuation of the meter's caption.
      '.pdxor-one{font-family:"Barlow Condensed",sans-serif;font-size:0.56rem;font-weight:700;' +
        'letter-spacing:0.07em;text-transform:uppercase;line-height:1.2;color:#d8bd85;' +
        'border:1px solid currentColor;border-radius:999px;padding:0.05rem 0.32rem;' +
        'white-space:nowrap;cursor:help;}' +
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
      // Depth markers on the result faces. One shared amber pill in three places —
      // the divergence row's reason line, the dossier door and the bucket head —
      // because they are all the same disclosure: this result rests on one
      // instrument. Amber is the colour this surface already uses for a limit on a
      // finding, never for a verdict of its own.
      '.pdxdv-row-1,.pdxdos-door-1,.pdxdos-bucket-d{display:inline-block;margin-left:0.35rem;' +
        'font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.6rem;letter-spacing:0.06em;' +
        'text-transform:uppercase;color:#fbbf24;border:1px solid rgba(251,191,36,0.34);' +
        'background:rgba(251,191,36,0.1);border-radius:999px;padding:0.02rem 0.4rem;white-space:nowrap;}' +
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
      // The ledger standing on a row face. Muted and dashed-underlined rather than
      // coloured, so it cannot be mistaken for one of the four verdicts; it sits in
      // the same slot because it answers the same question a reader asks there.
      '.pdxdos-rec-led{color:#9fb4d4;font-weight:700;border-bottom:1px dashed rgba(159,180,212,0.4);' +
        'cursor:help;}' +
      // Direction on the issue, beside the identity. Same pill as the Official
      // Record proof line so the two surfaces read as one vocabulary.
      '.pdxdos-rec-dir{font-size:0.62rem;color:#9fb4d4;border:1px solid rgba(159,180,212,0.22);' +
        'border-radius:999px;padding:0.02rem 0.34rem;white-space:nowrap;}' +
      // The standing of the whole list, above the rows. Same weight as the coverage
      // note it sits beside — this is disclosure, not a warning.
      '.pdxdos-led{font-size:0.68rem;color:#9fb4d4;line-height:1.5;padding:0.4rem 0.55rem;' +
        'margin:0.35rem 0 0.1rem;border-radius:0.45rem;background:rgba(159,180,212,0.06);' +
        'border:1px solid rgba(159,180,212,0.16);}' +
      '.pdxdos-led-split{display:block;margin-top:0.3rem;color:#c6d4ec;font-weight:600;}' +
      // The door out of the sheet into the full record, filtered to this issue.
      // Deliberately identical to .pdxor-vrlink: one door, two places.
      '.pdxdos-vrlink{display:inline-block;margin-top:0.5rem;background:none;border:none;' +
        'padding:0.2rem 0;cursor:pointer;font-family:inherit;font-size:0.68rem;font-weight:700;' +
        'letter-spacing:0.02em;color:#7fb4ff;text-align:left;}' +
      '.pdxdos-vrlink:hover{color:#a9ceff;text-decoration:underline;text-underline-offset:2px;}' +
      '.pdxdos-vrlink:focus-visible{outline:2px solid #7fb4ff;outline-offset:2px;border-radius:0.3rem;}' +
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
      // A MAPPED DIRECTION THAT WAS NOT SCORED, MARKED RATHER THAN HALVED. This used to
      // be opacity 0.5 — a direction word at 50% strength beside a "Not scored" badge
      // that already said the same thing in words, so the row paid twice for one fact
      // and paid the second time in legibility. The dotted underline is the same
      // idiom the ledger's own "on record · not in Direction Match" chip uses, and it
      // marks the word without taking it away.
      '.pdxins-off{text-decoration:underline dotted currentColor;text-underline-offset:3px;}' +
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
      // WHICH DOCUMENT THIS IS. Not a caveat and not an aside — it is the row's own
      // name, said properly, and it leads. Full contrast and its own rule, in the
      // neutral slate this file uses for citation rather than for a finding, so it
      // reads as identification and never as a hedge on the verdict beside it.
      '.pdxdos-rec-idn{color:#cfe0f8;border-left:2px solid rgba(147,180,230,0.42);' +
        'padding-left:0.45rem;}' +
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
      // ── THE FORMAL-RECORD PATTERN CHIP ─────────────────────────────────────
      // Direction colour is the SITE's direction colour (#4ade80 / #f87171 /
      // #f5c842 — the same three as .stance-support/.stance-oppose/.stance-mixed
      // and _OR_STANCE), because a reader who has learned green-means-advance on
      // an issue card should not have to learn it twice. What separates this chip
      // from a stated-position chip is the lane marker and the weight, never the
      // hue: recolouring the record would say the two facts are different KINDS of
      // thing, and they are the same kind of thing from two different sources.
      //   WEIGHT IS THE HONESTY. Four rungs, loudest first: `w-full` (a uniform run
      // and a genuine split — both are complete statements about a deep record),
      // `w-strong` (a lean with counter-votes: same hue and border, fainter fill),
      // `w-thin` (one to three votes: no fill, dashed border, lighter type, dialled back —
      // still direction-coloured, because the direction is a fact, but visibly not
      // a finding), `w-flat` (grey, dotted, no direction at all). A thin chip must
      // never be mistakable for a deep one at a glance, which is what these rules
      // are for.
      '.pdxst-pat{display:inline-flex;align-items:center;gap:0.24rem;font-size:0.63rem;font-weight:800;'
        + 'letter-spacing:0.01em;padding:0.08rem 0.45rem;border-radius:999px;white-space:nowrap;'
        + 'color:var(--c);border:1px solid var(--c);background:var(--bg);}' +
      '.pdxst-pat-lane{font-size:0.55rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;opacity:0.72;}' +
      // The counts are the evidence, not the headline: same colour, lighter type.
      '.pdxst-pat-n{font-weight:600;font-size:0.6rem;opacity:0.86;}' +
      // …AND THE DIALLING BACK IS THE BORDER, NOT THE OPACITY. Both weights used to
      // carry a fade as well (.78 and .82). A dashed edge says "this is one to three
      // votes"; a fade says "this control is unavailable", which is the message a
      // browser reserves for something the reader cannot use — and these rows are
      // exactly the ones they most need to read, because the caveat IS the content.
      // Border style and fill keep the whole distinction; nothing is louder than it
      // was, and nothing is quieter than legible.
      '.pdxst-pat.w-thin{border-style:dashed;border-color:var(--c);font-weight:700;}' +
      '.pdxst-pat.w-thin .pdxst-pat-lb{font-weight:700;}' +
      '.pdxst-pat.w-flat{border-style:dotted;border-color:rgba(159,180,212,0.34);font-weight:700;}' +
      // ── THE STANDOUT STRIP ─────────────────────────────────────────────────
      // Four chips at the top of a profile, so the sizing rule is the whole design:
      // the ISSUE NAME is the biggest thing (it is what a reader is scanning for),
      // the record's word is second and carries the only colour, and the counts and
      // the depth are small grey facts under it. Two columns on a wide screen, one
      // on a phone, because two chips side by side on 360px is two truncated issue
      // names.
      '.pdxso{margin:0.6rem 0 0.9rem;border:1px solid rgba(96,165,250,0.24);border-radius:0.85rem;' +
        'background:linear-gradient(180deg,rgba(14,22,44,0.72),rgba(9,14,28,0.5));padding:0.8rem 0.85rem 0.65rem;}' +
      '.pdxso-head{display:flex;align-items:baseline;gap:0.5rem;flex-wrap:wrap;}' +
      '.pdxso-ico{font-size:1rem;}' +
      '.pdxso-t{font-family:"Bebas Neue",sans-serif;font-size:1.12rem;letter-spacing:0.03em;color:#e8f0ff;}' +
      '.pdxso-depth{margin-left:auto;font-family:"Barlow Condensed",sans-serif;font-weight:700;' +
        'font-size:0.72rem;letter-spacing:0.03em;color:#93b4e6;}' +
      '.pdxso-grps{display:grid;grid-template-columns:1fr 1fr;gap:0.7rem;margin-top:0.6rem;}' +
      '.pdxso-grp-h{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:0.74rem;' +
        'letter-spacing:0.07em;text-transform:uppercase;color:#cfe0f8;}' +
      '.pdxso-grp-note{font-size:0.68rem;color:#8fa6c6;line-height:1.4;margin:0.12rem 0 0.34rem;}' +
      '.pdxso-chips{display:flex;flex-direction:column;gap:0.36rem;}' +
      '.pdxso-chip{display:flex;flex-direction:column;align-items:flex-start;gap:0.06rem;width:100%;' +
        'text-align:left;cursor:pointer;background:rgba(10,15,30,0.5);color:inherit;font:inherit;' +
        'border:1px solid rgba(159,180,212,0.18);border-left:3px solid var(--c,#8fa6c6);' +
        'border-radius:0.45rem;padding:0.36rem 0.5rem;}' +
      '.pdxso-chip:hover,.pdxso-chip:focus-visible{background:rgba(18,28,52,0.72);border-color:rgba(159,180,212,0.4);' +
        'border-left-color:var(--c,#8fa6c6);}' +
      '.pdxso-chip-iss{font-weight:800;font-size:0.84rem;color:#e8f0ff;line-height:1.2;}' +
      '.pdxso-chip-v{font-weight:800;font-size:0.76rem;letter-spacing:0.01em;}' +
      '.pdxso-chip-n{font-size:0.68rem;font-weight:700;color:#9fb4d4;}' +
      '.pdxso-chip-d{font-size:0.63rem;color:#7f97b8;}' +
      '.pdxso-more{font-size:0.66rem;color:#7f97b8;margin:0.3rem 0 0;}' +
      '.pdxso-wall{font-size:0.66rem;color:#7f97b8;line-height:1.45;margin:0.6rem 0 0;' +
        'border-top:1px solid rgba(159,180,212,0.14);padding-top:0.4rem;}' +
      '@media (max-width:560px){.pdxso-grps{grid-template-columns:1fr;}}' +
      // ── THE EXECUTIVE VARIANT ──────────────────────────────────────────────
      // Same shell, same chips, three extra lines: the lane's volume clause, the
      // per-class inventory under it, and the one control out to the topic tree.
      // The inventory is the loudest plain fact on the block, so it gets the
      // condensed face the counts elsewhere use; the volume clause above it is
      // prose and stays prose.
      '.pdxxs-vol{font-size:0.72rem;color:#9fb4d4;line-height:1.45;margin:0.45rem 0 0.2rem;}' +
      '.pdxxs-inv{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.86rem;' +
        'letter-spacing:0.02em;color:#cfe0f8;margin:0 0 0.1rem;}' +
      '.pdxxs-quiet{font-size:0.7rem;color:#8fa6c6;line-height:1.5;margin:0.5rem 0 0;}' +
      '.pdxxs-go{display:block;width:100%;margin-top:0.6rem;min-height:44px;cursor:pointer;' +
        'background:rgba(16,26,48,0.7);color:#cfe0f8;font-family:"Barlow Condensed",sans-serif;' +
        'font-weight:800;font-size:0.82rem;letter-spacing:0.05em;text-transform:uppercase;' +
        'border:1px solid rgba(96,165,250,0.3);border-radius:0.55rem;padding:0.5rem 0.6rem;}' +
      '.pdxxs-go:hover,.pdxxs-go:focus-visible{background:rgba(24,38,68,0.85);border-color:rgba(96,165,250,0.55);}' +
      // ── THE FULL FORMAL-PATTERN ISSUE INDEX ────────────────────────────────
      // A flat, dense list, not a stack of cards: sixty-four issues is a table's
      // job, and every ornament repeated sixty-four times is a scroll the reader
      // pays for. The chip does the colour work — these rules only give it a line
      // to sit on, and keep the issue name the biggest thing in the row.
      '.pdxfpi{margin-top:0.9rem;border:1px solid rgba(96,165,250,0.22);border-radius:0.8rem;'
        + 'background:rgba(9,14,28,0.5);padding:0.75rem 0.8rem 0.6rem;}' +
      '.pdxfpi-head{display:flex;align-items:baseline;gap:0.5rem;justify-content:space-between;}' +
      '.pdxfpi-title{font-family:"Bebas Neue",sans-serif;font-size:1.05rem;letter-spacing:0.03em;color:#e8f0ff;}' +
      '.pdxfpi-count{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:0.78rem;color:#93b4e6;'
        + 'border:1px solid rgba(147,180,230,0.34);border-radius:999px;padding:0.04rem 0.5rem;}' +
      '.pdxfpi-q{font-size:0.76rem;color:#9fb4d4;font-style:italic;margin:0.25rem 0 0;}' +
      '.pdxfpi-lede{font-size:0.74rem;color:#8fa6c6;line-height:1.45;margin:0.3rem 0 0;}' +
      '.pdxfpi-lede b{color:#cfe0f8;}' +
      // The census is a row of counts, one per tier, in that tier's own colour —
      // the shape of the list before anyone scrolls it.
      '.pdxfpi-census{display:flex;flex-wrap:wrap;gap:0.28rem;margin-top:0.45rem;}' +
      '.pdxfpi-cn{font-size:0.62rem;font-weight:700;color:var(--c);border:1px solid var(--c);'
        + 'border-radius:999px;padding:0.06rem 0.44rem;opacity:0.86;}' +
      '.pdxfpi-cn b{font-size:0.7rem;}' +
      '.pdxfpi-segs{display:flex;flex-wrap:wrap;gap:0.26rem;margin-top:0.5rem;}' +
      '.pdxfpi-seg{cursor:pointer;font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.63rem;'
        + 'letter-spacing:0.04em;text-transform:uppercase;color:#9fb4d4;background:rgba(147,180,230,0.06);'
        + 'border:1px solid rgba(147,180,230,0.24);border-radius:999px;padding:0.3rem 0.6rem;min-height:1.95rem;}' +
      '.pdxfpi-seg:hover,.pdxfpi-seg:focus-visible{color:#e8f0ff;background:rgba(147,180,230,0.16);}' +
      '.pdxfpi-seg.is-on{color:#06121f;background:#93b4e6;border-color:#93b4e6;}' +
      '.pdxfpi-seg-n{font-weight:800;opacity:0.72;}' +
      '.pdxfpi-shown{font-size:0.68rem;color:#6f88ab;margin:0.45rem 0 0.2rem;}' +
      '.pdxfpi-shown b{color:#cfe0f8;}' +
      '.pdxfpi-list{display:flex;flex-direction:column;}' +
      // THE WHOLE ROW IS THE DOOR (see _fpiRowHtml). It gets the pointer and the
      // 44px thumb target, not just the name inside it — a reader who taps the
      // pattern chip is tapping the thing they were reading.
      '.pdxfpi-row{display:flex;align-items:center;flex-wrap:wrap;gap:0.3rem 0.45rem;cursor:pointer;'
        + 'min-height:2.75rem;padding:0.42rem 0.1rem;border-top:1px solid rgba(147,180,230,0.12);}' +
      '.pdxfpi-row:first-child{border-top:none;}' +
      '.pdxfpi-row:hover{background:rgba(147,180,230,0.05);}' +
      // The issue name is the door, so it is a real target — full-height, its own
      // hover, and the chevron only appears when the row is pointed at.
      '.pdxfpi-lbl{flex:1 1 11rem;min-width:0;display:flex;align-items:center;gap:0.3rem;text-align:left;'
        + 'background:none;border:none;cursor:pointer;padding:0.1rem 0;min-height:1.9rem;'
        + 'font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.86rem;'
        + 'letter-spacing:0.01em;color:#e8f0ff;}' +
      '.pdxfpi-lbl:hover,.pdxfpi-lbl:focus-visible{color:#9fdbd0;}' +
      '.pdxfpi-go{color:#6f88ab;font-size:0.9rem;opacity:0;transition:opacity 0.12s ease;}' +
      '.pdxfpi-row:hover .pdxfpi-go,.pdxfpi-lbl:hover .pdxfpi-go,'
        + '.pdxfpi-lbl:focus-visible .pdxfpi-go{opacity:1;}' +
      // A chevron that only exists on hover does not exist on a touch screen, and
      // this list was hiding it everywhere except phones under 480px — tablets,
      // touch laptops and phones held sideways got a row with no sign it opened
      // anything. Ask the pointer, not the width.
      '@media (hover:none),(pointer:coarse){.pdxfpi-go{opacity:1;margin-left:auto;}' +
        '.pdxfpi-lbl{min-height:2.4rem;}}' +
      '.pdxfpi-chips{display:flex;align-items:center;flex-wrap:wrap;gap:0.26rem;}' +
      '.pdxfpi-meta{font-size:0.63rem;color:#6f88ab;white-space:nowrap;}' +
      '.pdxfpi-none{font-size:0.74rem;color:#8fa6c6;padding:0.5rem 0;}' +
      '.pdxfpi-foot{font-size:0.66rem;color:#6f88ab;line-height:1.45;margin:0.5rem 0 0;'
        + 'border-top:1px solid rgba(147,180,230,0.12);padding-top:0.45rem;}' +
      '.pdxst-txt{font-size:0.74rem;line-height:1.4;color:#9fb4d4;margin-top:0.15rem;}' +
      '.pdxst-links{display:flex;gap:0.3rem;flex-wrap:wrap;margin-top:0.28rem;}' +
      '.pdxst-go{cursor:pointer;font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.6rem;letter-spacing:0.05em;text-transform:uppercase;color:#9fdbd0;background:rgba(159,219,208,0.08);border:1px solid rgba(159,219,208,0.26);border-radius:999px;padding:0.26rem 0.6rem;min-height:1.9rem;}' +
      '.pdxst-go:hover,.pdxst-go:focus-visible{background:rgba(159,219,208,0.18);}' +
      '.pdxst-ev{font-size:0.64rem;color:#6f88ab;}' +
      // RECEIPT COUNTS ARE NOT A SECOND FIGURE. The depth line names two different
      // kinds of thing — formal instruments, which are inside the score, and public
      // receipts, which never are — and it named them in one undifferentiated grey
      // run. Inside the dossier, where no outside-the-score line sits beneath it to
      // carry the boundary, the receipt side takes the lane's own quiet marker: same
      // dashed-outline vocabulary as every other outside-the-score tag on the site,
      // and deliberately no number type, no fill and no verdict colour.
      '.pdxst-ev-ots{color:#8fa6c6;}' +
      '.pdxst-ev-ots .pdxst-ev-tag{font-size:0.55rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;' +
        'color:#8fa6c6;border:1px dashed rgba(159,180,212,0.34);border-radius:0.3rem;padding:0.02rem 0.28rem;margin-left:0.24rem;' +
        'white-space:nowrap;}' +
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
      // ── THE RECORD LEAD, AND THE DEMOTED METRIC UNDER IT ───────────────────
      // The lead is the loud thing on an unscored row and the metric line beneath
      // it is quiet, which is the whole hierarchy change stated in two rules. Both
      // are still full-width, still wrap, still keep their spans — a reader who
      // wants the Direction Match state finds it in the same words in the same
      // place, one step further down the page than it used to be.
      '.pdxst-leadwrap{margin-top:0.24rem;}' +
      '.pdxst-lead{display:flex;align-items:baseline;gap:0.34rem;flex-wrap:wrap;width:100%;text-align:left;' +
        'background:rgba(10,15,30,0.34);border:1px solid rgba(159,180,212,0.16);border-radius:0.4rem;' +
        'padding:0.26rem 0.42rem;color:inherit;font:inherit;}' +
      '.pdxst-lead-go{cursor:pointer;}' +
      '.pdxst-lead-go:hover,.pdxst-lead-go:focus-visible{border-color:rgba(159,180,212,0.4);background:rgba(16,24,44,0.6);}' +
      '.pdxst-lead-lb{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.6rem;' +
        'letter-spacing:0.06em;text-transform:uppercase;color:#7f97b8;}' +
      '.pdxst-lead-v{font-weight:800;font-size:0.86rem;letter-spacing:0.01em;}' +
      // A record with no direction read from it must not look like one that has a
      // direction, so the open states drop to the muted weight of the counts beside
      // them rather than wearing the finding's type size.
      '.pdxst-lead-open .pdxst-lead-v{font-weight:700;font-size:0.74rem;}' +
      '.pdxst-lead-n{font-size:0.68rem;font-weight:700;color:#9fb4d4;}' +
      '.pdxst-lead .pdxst-lbl-go{margin-left:auto;color:#7f97b8;font-weight:800;}' +
      '.pdxst-r-demoted{opacity:0.82;margin-top:0.14rem;}' +
      '.pdxst-r-demoted .pdxst-pct,.pdxst-r-demoted .pdxst-pct-na{font-size:0.8rem;}' +
      // ── THE SPLIT, ON THE FORMAL LINE ITSELF ───────────────────────────────
      // The percentage and the counts it divides used to sit on two lines, and two
      // lines is one line too many: the reader met "67%" on the formal line and a
      // pair of tallies on the next, directly above one more line of tallies from a
      // lane that is not in the score. Three stacked count-shaped things, one of
      // which is scored — the split now travels with the number it is the
      // denominator of, so the formal claim is one line and everything below it
      // belongs to something else.
      //
      // It is the SAME element as the composition line under an unscored row — one
      // markup path, so the counts can never differ between the two placements. All
      // that changes is that on a scored row it is a flex item of `.pdxst-result`,
      // wrapping under the number rather than under the whole row when space runs
      // out. The separator is decoration and hidden from the reading order, which
      // already has the composition line's own label.
      '.pdxst-result>.pdxst-comp{margin-top:0;}' +
      '.pdxst-rsep{font-size:0.6rem;color:#5c7091;}' +
      // The formal block's own key, where a face has no lane column to put one in
      // (the dossier's short version). Same condensed uppercase vocabulary as the
      // row's lane key, so "which lane is this" is answered by the same shape in
      // both places.
      '.pdxst-comp-k{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:0.58rem;' +
        'letter-spacing:0.07em;text-transform:uppercase;color:#8fa6c6;}' +
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
      // The thin qualifier is deliberately the quietest thing on the line: no
      // colour of its own, no weight, no icon. It qualifies the counts beside it
      // and must never read as a fourth tally or a second verdict.
      '.pdxst-comp-thin{color:#7d90ad;font-style:italic;}' +
      // ── THE OUTSIDE-THE-SCORE LANE, BESIDE THE FORMAL ONE AND NOT DRESSED AS IT ─
      // Related, distinct, and cheap to skip. The formal result line owns the
      // verdict colour, the percentage type and the pill-shaped scope tag; this line
      // gets none of the three. What it gets instead is a dotted left rule and a
      // single muted weight, so a reader scanning a column can tell at a glance that
      // it is the same row's second lane rather than a second grade. A coloured chip
      // here would out-shout the number above it within one screen.
      //
      // THE COUNTS ARE DELIBERATELY QUIETER THAN THEY WERE. They used to be drawn at
      // 700 in near-white (#c3d3ea) — the brightest thing on the line, one line under
      // a percentage, in a column of rows where the eye is already hunting for
      // figures. Two receipts rendered as emphatically as a scored result is the
      // blend this whole lane exists to prevent, so the tally now sits at the lane's
      // own weight and the boundary tag is the only thing on the line with an outline.
      '.pdxst-lane{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:0.58rem;letter-spacing:0.08em;text-transform:uppercase;color:#8fa6c6;}' +
      '.pdxst-pub{display:flex;align-items:baseline;gap:0.3rem;flex-wrap:wrap;margin-top:0.18rem;' +
        'padding-left:0.4rem;border-left:2px dotted rgba(159,180,212,0.34);font-size:0.66rem;color:#9fb4d4;}' +
      '.pdxst-pub-k{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:0.58rem;letter-spacing:0.08em;' +
        'text-transform:uppercase;color:#8fa6c6;white-space:nowrap;}' +
      // WHAT THE LANE IS, after what it is not. The key says "outside the score";
      // this says which record that is, in ordinary lower case, so the reader is not
      // left with a boundary and no subject. Never uppercase — a second condensed
      // caps run would read as a second key.
      '.pdxst-pub-sub{font-size:0.6rem;color:#7e93b3;}' +
      '.pdxst-pub-t{font-weight:600;color:#9fb4d4;}' +
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
        // MOBILE: the chip may wrap inside itself rather than push the issue name
        // off the line — the row already wraps, and a chip that cannot break forces
        // the issue name onto a line of its own.
        '.pdxst-pat{white-space:normal;font-size:0.66rem;}' +
        '.pdxst-pat-n{font-size:0.63rem;}' +
        '.pdxst-pct{font-size:1.15rem;}' +
        '.pdxst-vd{font-size:0.74rem;}' +
        // Every jump is a thumb target, not a hover target.
        '.pdxst-go{min-height:2.3rem;padding:0.4rem 0.7rem;font-size:0.62rem;}' +
        '.pdxst-links{gap:0.34rem;}' +
        // MOBILE: the index becomes one issue per block — name on its own line,
        // chips beneath it — because a chip and a 24-character issue name cannot
        // share a phone line without one of them being truncated.
        '.pdxfpi-row{flex-direction:column;align-items:flex-start;gap:0.24rem;padding:0.5rem 0.1rem;}' +
        '.pdxfpi-lbl{flex:1 1 auto;width:100%;font-size:0.9rem;min-height:2.1rem;}' +
        '.pdxfpi-go{opacity:1;margin-left:auto;}' +
        '.pdxfpi-seg{min-height:2.2rem;padding:0.38rem 0.66rem;}' +
        '.pdxfpi-title{font-size:1rem;}' +
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
  // ── THE LEDGER LANE — ON RECORD, OUTSIDE THE SCORE ───────────────────
  // A large part of the formal record sits on issues this figure has never spoken
  // on. The engine is right not to score those: Direction Match tests a stated
  // position against a formal act, and with nothing stated there is nothing to test.
  // What was wrong was the SURFACE. A row holding six roll calls and no stated
  // position wore the same "Limited" word a row holding one ambiguous vote wears — a
  // said-vs-did verdict borrowed for a comparison that was never run — and the six
  // votes underneath it showed as six identical shrugs, so the pattern in them (five
  // one way, one the other) was invisible on every surface that listed them.
  //
  // This lane says the true thing instead: the instruments are ON RECORD, they are
  // NOT in Direction Match, and the reason is ours to state — no stated position to
  // test them against. Nothing here scores, ranks, weights or aggregates. It
  // enumerates, and it counts.
  //
  // THE WALL THIS LANE NEEDS MORE THAN ANY OTHER. Everywhere else a reader has a
  // quoted position to anchor on; here they have none, so a direction printed
  // carelessly reads as a personal creed. A mapped direction is what the MEASURE
  // does to the issue — never what the figure believes, never what their party
  // believes. Every string below is record-relative for exactly that reason: "mapped
  // as advancing", never "they support".
  var _LED = {
    // Not a verdict glyph. The four verdict icons are the said-vs-did vocabulary and
    // borrowing one here would put this standing back in the pile it does not belong
    // to; a ledger is a list, and this is the list's mark.
    ico: '📋',
    // The row's standing where a said-vs-did word used to be. One string, used
    // verbatim by every surface, so the dossier and the Official Record can never
    // drift into two names for the same fact.
    status: 'On record · not in Direction Match',
    full: 'On record · not in Direction Match (no stated position to test)',
    // Direction on THIS issue, from the mapping already on file. Short forms for a
    // row face; the long form is the sentence, and both name the mapping rather than
    // the person on purpose.
    advShort: '▲ Advances', oppShort: '▼ Cuts against',
    // Said once, wherever a count of directions is printed, so no reader has to infer
    // from context that the split is not the score.
    notScore: 'Counts of mapped directions, not a score.'
  };
  // Is this row on record and outside Direction Match FOR LACK OF A STATED POSITION?
  // Four gates, all of which must agree, because the one thing this must never do is
  // tell a reader that a scored row is unscored. A token that scores disqualifies it
  // outright; either hasStance flag disqualifies it; and there has to be something on
  // record for it to be outside the score WITH. Everything else — thin-but-tested,
  // still loading, nothing on file at all — returns false and keeps the wording it
  // already had. Fails closed in the direction that costs a reader the least.
  function _ledOnRecord(ov) {
    if (!ov) return false;
    if (ov.record && ov.record.total > 0) return true;
    if (ov.officialActions && ov.officialActions.total > 0) return true;
    return _orExecTouched(ov);
  }
  function _ledUnscored(ov) {
    if (!ov) return false;
    var tok = ov.token;
    if (tok === 'consistent' || tok === 'contradicts' || tok === 'mixed' || tok === 'pending') return false;
    if (ov.hasStance) return false;
    if (ov.record && ov.record.hasStance) return false;
    return _ledOnRecord(ov);
  }
  // Which way ONE executive document cuts on this issue. Lifted out of _dosItems so
  // the dossier row, the Official Record proof line and the ledger split all read the
  // same two lines — including `advanceInverted`, the correction a blocking class (a
  // veto) needs, which is precisely the step a second copy of this would get wrong.
  function _ledExecDir(it, issueKey) {
    var m = _dosMapping(it, issueKey);
    if (!m) return '';
    var adv = (m.supportMeaning !== 'yea_opposes');
    if (it && it.advanceInverted) adv = !adv;
    return adv ? 'advances' : 'opposes';
  }
  // …and one instrument of either lane, from a raw record rather than from a built
  // dossier entry, so a surface that never assembled _dosItems can still print the
  // direction. The roll-call arm delegates to _dosItemDir: one primitive, one answer,
  // and no second place for the Yea/Nay × support-meaning flip to be got wrong.
  function _ledItemDir(item, lane, issueKey) {
    if (!item) return '';
    if (lane === 'exec') return _ledExecDir(item, issueKey);
    var m = _dosMapping(item, issueKey);
    if (!m) return '';
    return _dosItemDir({ lane: 'record', support: m.supportMeaning || '', item: item, held: '' });
  }
  function _ledDirShort(dir) {
    return dir === 'advances' ? _LED.advShort : dir === 'opposes' ? _LED.oppShort : '';
  }
  // The clause, lower-case so it can be joined onto a sentence, and the standalone
  // sentence built from it. Requirement B's wording, kept in one place.
  function _ledDirPhrase(dir, issueKey) {
    if (!dir) return '';
    return (dir === 'advances' ? 'mapped as advancing ' : 'mapped as opposing ') +
      (_issueLabel(issueKey) || 'this issue');
  }
  function _ledDirLong(dir, issueKey) {
    var ph = _ledDirPhrase(dir, issueKey);
    return ph ? (ph.charAt(0).toUpperCase() + ph.slice(1) + '.') : '';
  }
  // THE PATTERN, AS COUNTS AND ONLY AS COUNTS. How the mapped directions among these
  // instruments split. Deliberately not a percentage and deliberately not derived
  // from one: a votes-only figure printed anywhere near Direction Match would read as
  // a second score no matter what it was captioned, and a second score is the thing
  // this product spent a whole pass removing.
  //   Denominated by what it actually counted — the rows in this list, the same rows
  // the enumeration prints — never by the row's claimed total, so the split can never
  // assert coverage the list below it does not show.
  function _ledSplit(pid, issueKey, ov) {
    var items = [];
    try { items = _dosItems(pid, issueKey, ov) || []; } catch (e) { items = []; }
    var s = { listed: items.length, advances: 0, opposes: 0, unclear: 0, held: 0 };
    for (var i = 0; i < items.length; i++) {
      var d = items[i];
      if (d.held) { s.held++; continue; }
      var dir = _dosItemDir(d);
      if (dir === 'advances') s.advances++;
      else if (dir === 'opposes') s.opposes++;
      else s.unclear++;
    }
    s.directional = s.advances + s.opposes;
    return s;
  }
  // "5 advancing · 1 opposing" — the chip-length form, for a closed face.
  function _ledSplitSay(sp) {
    if (!sp || !sp.directional) return '';
    var parts = [];
    if (sp.advances) parts.push(sp.advances + ' advancing');
    if (sp.opposes) parts.push(sp.opposes + ' opposing');
    return parts.join(' · ');
  }
  // …and the sentence form, which names the issue, accounts for every row it did not
  // put on a side, and says in as many words what the split is not.
  function _ledSplitLine(sp, issueKey) {
    if (!sp || !sp.directional) return '';
    var parts = [];
    if (sp.advances) parts.push(sp.advances + (sp.advances === 1 ? ' advances it' : ' advance it'));
    if (sp.opposes) parts.push(sp.opposes + (sp.opposes === 1 ? ' cuts against it' : ' cut against it'));
    var rest = [];
    if (sp.unclear) rest.push(sp.unclear + ' with no direction mapped');
    if (sp.held) rest.push(sp.held + ' not scorable');
    return 'Mapped directions on ' + (_issueLabel(issueKey) || 'this issue') + ': ' +
      parts.join(', ') + (rest.length ? ', ' + rest.join(', ') : '') + '. ' + _LED.notScore;
  }

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
    // THE LEDGER STANDING, DECIDED ONCE. Every surface that reads this row verdict —
    // the chip, the why line, the dossier's row faces — takes the answer from here, so
    // two of them cannot disagree about whether this row is in the score.
    //   The reason line is rewritten with it. The old sentence ("…so there is nothing
    // to check them against") was true and stopped one beat short of the fact a reader
    // most needs: the votes are still here, listed in full, and their absence from the
    // score is coverage rather than a finding about the record. Suppressed when the
    // count is zero — a held-only executive row has its own reason above, which is the
    // accurate one, and "0 actions are on record" would not be.
    var led = _ledUnscored(ov);
    if (led && total > 0) {
      why = (total === 1 ? 'One ' + n.one : total + ' ' + n.many) + ' on this issue ' +
        (total === 1 ? 'is' : 'are') + ' on record and listed in full below. ' +
        _LED.status + ': they have not stated a position on this issue, so there is ' +
        'nothing to test ' + (total === 1 ? 'it' : 'them') + ' against. ' +
        'That is our coverage, not a verdict.';
    }
    return {
      key: token, ico: m.ico, label: label,
      cls: m.cls, why: why, total: total,
      // Additive. `ledger` is the standing; the two strings ride with it so a caller
      // never has to reach for _LED itself and never has to phrase it again.
      ledger: led, ledgerStatus: _LED.status, ledgerFull: _LED.full,
      // "1 vote" / "3 votes" beside a thin label turns a shrug into a fact.
      count: total ? (total + ' ' + (total === 1 ? n.one : n.many)) : ''
    };
  }
  function _orRecordChipHtml(ov) {
    var rv = _orRowVerdict(ov);
    // ON RECORD, AND NOT SCORED — the chip has to say both. Until now this slot read
    // "Record: Limited" on a row where no said-vs-did comparison had been run at all:
    // "Limited" is a finding about the depth of a record that WAS tested, and lending
    // it to an untested one told a reader their record is thin when it may be six
    // votes deep. The count rides along for the same reason it does on the thin chip —
    // "6 votes" turns a standing into a fact a reader can go and check.
    if (rv.ledger) {
      // ONE OF THESE LABELS WAS ALREADY RIGHT AND ONE WAS NOT, so only the wrong one
      // is replaced. "Limited" is a said-vs-did finding and it is the whole bug: it
      // describes a record that was tested and found shallow, on a row where nothing
      // was tested. The ✒️ lane's own empty-side captions — "No stated position yet",
      // "On file, not scorable" — already name the missing side correctly and are more
      // specific than anything this lane could say, so they are kept and the standing
      // is appended to them rather than written over them.
      var lead = (rv.key === 'limited') ? _LED.status : (rv.label + ' · not in Direction Match');
      return '<span class="pdxc-chip pdxc-limited pdxor-recchip pdxor-recchip-led"' +
        ' title="' + escAttr(rv.ledgerFull + (rv.why ? ' — ' + rv.why : '')) + '">' +
        _LED.ico + ' ' + esc(lead) + esc(rv.count ? ' · ' + rv.count : '') + '</span>';
    }
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
  // HOW A BALLOT IS SAID OUT LOUD. 'Voted ' + the slug is right for the six ballots a
  // member can actually cast and wrong for the four that record an ABSENCE: "Voted
  // Not Voting" is not English, and worse, it is not true — nobody voted. Those get
  // the phrase voting-record.js's own card list already uses for them, so one fact
  // reads the same way on both surfaces, and a reader can tell an abstention from a
  // cast ballot without opening anything.
  var _BALLOT_SAID = {
    yea: 'Voted Yea', aye: 'Voted Aye', yes: 'Voted Yes',
    nay: 'Voted Nay', no: 'Voted No', present: 'Voted Present',
    not_voting: 'Did not vote', notvoting: 'Did not vote', 'not voting': 'Did not vote',
    abstain: 'Abstained', absent: 'Did not vote (absent)', excused: 'Did not vote (excused)'
  };
  function _orActionPhrase(item) {
    if (!item) return '';
    // THE BALLOT IS ASKED FIRST, AND IT IS ASKED OF `position` ALONE. The note above
    // says the test is the ballot itself; what the code did was fold actionType,
    // position and action into one string and test THAT — which is not the same
    // thing, because every roll call the API sends carries `actionType: 'passage'`.
    // actionType therefore always won and the ballot was never printed: a yea and a
    // nay on the SAVE Act both rendered "H.R. 8281 · On Passage · Passage", and the
    // direction line trailed off into "and they passage". The fixtures that covered
    // this function omitted actionType entirely, so the fallback fired in tests and
    // only production ever saw the bug.
    var ballot = String(item.position || '').toLowerCase();
    if (item.kind !== 'position' && _BALLOTS[ballot] === 1) {
      return _BALLOT_SAID[ballot] || ('Voted ' + _tc(ballot));
    }
    // `action` last: hydrateIssueRecords copies the actionType into all three, but a
    // curated position may only carry `action` ("cosponsored"), and that slug is the
    // only thing the row has to say about what was actually done.
    var key = String(item.actionType || item.position || item.action || '');
    if (!key) return '';
    var lower = key.toLowerCase();
    if (item.kind !== 'position' && _BALLOTS[lower] === 1) {
      return _BALLOT_SAID[lower] || ('Voted ' + _tc(key));
    }
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
    // A LEDGER ROW'S PROOF LINES ARE NOT SHRUGS. On an unscored row every line took
    // the verdict icon of the row it sits under — six identical "…" glyphs for six
    // different votes — which is the visual claim that nothing here is known. What is
    // not known is how these landed against a position; which way each one cut on the
    // issue is on file for every one of them. So the icon becomes the ledger's mark
    // and each line prints its own direction.
    var led = _ledUnscored(ov);
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
        var xDir = _ledDirShort(_ledExecDir(l.item, issueKey));
        return '<div class="pdxor-proof">' +
            '<span class="pdxor-proof-ico" style="color:' + (led ? '#9fb4d4' : xv.color) + '" aria-hidden="true">' +
              (led ? _LED.ico : xv.ico) + '</span>' +
            '<span class="pdxor-proof-txt">' + body +
              (xDir ? ' <span class="pdxor-proof-dir">' + esc(xDir) + '</span>' : '') +
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
      // Which way this ballot cut on THIS issue, read through the one primitive the
      // dossier row uses. Printed on every row, scored or not: it is a fact about the
      // measure and the mapping, and it is the only thing on the line that tells a
      // reader what a Yea meant here.
      var pDir = _ledDirShort(_ledItemDir(p.item, 'record', issueKey));
      return '<div class="pdxor-proof pdxor-proof-act"' +
          ' data-pdxc-vrvote="' + escAttr(_orVoteKey(p.item)) + '"' +
          ' data-pdxc-vrissue="' + escAttr(issueKey) + '"' +
          ' title="' + escAttr('Open ' + (txt || 'this vote') + ' in the full voting record') + '">' +
          '<span class="pdxor-proof-ico" style="color:' + (led ? '#9fb4d4' : mv.color) + '" aria-hidden="true">' +
            (led ? _LED.ico : mv.ico) + '</span>' +
          '<span class="pdxor-proof-txt">' + bill + rest +
            (pDir ? ' <span class="pdxor-proof-dir">' + esc(pDir) + '</span>' : '') +
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
    var lines = [], extra = '', led = _ledUnscored(ov);
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
          // The direction joins the meta strip rather than getting a slot of its own:
          // this list is the full enumeration and it has to stay one line per item.
          var metaX = [clsD ? clsD.verb : '', stD ? stD.label : '', it.date || '',
            _ledDirShort(_ledExecDir(it, issueKey))].filter(Boolean).join(' · ');
          lines.push(_orActLine(_orItemVerdict(it, issueKey, stanceX),
            it.documentId || it.title || 'Executive action',
            metaX, it.sourceUrl, it.sourceLabel, '', null,
            _orExecWhyHtml(it, issueKey), led));
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
      var meta = [b.question, b.act, b.date,
        _ledDirShort(_ledItemDir(p.item, 'record', issueKey))].filter(Boolean).join(' · ');
      lines.push(_orActLine(p.verdict, b.bill || b.title || (b.isPosition ? 'Formal action' : 'Recorded vote'),
        meta, b.url, b.label, _orOmniNote(p.item, issueKey),
        // Every mapped vote in the open row is a button to that exact roll call —
        // the keyboard-reachable version of the collapsed row's proof-line shortcut.
        { issue: issueKey, key: _orVoteKey(p.item) }, '', led));
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
  function _orWhyHtml(pid, issueKey, ov) {
    var rv = _orRowVerdict(ov);
    var out = rv.why ? '<div class="pdxor-why">' + esc(rv.why) + '</div>' : '';
    // THE VOTING PATTERN, WHERE THERE IS NO SCORE TO CARRY IT. On a scored row the
    // percentage and the said-vs-did chip already say which way the record ran; on a
    // ledger row nothing did, and a reader could read six lines one at a time without
    // ever being told that five went the same way. Counts, both sides, every row
    // accounted for, and the disclaimer attached — never a rate, never a rank.
    if (rv.ledger) {
      var line = _ledSplitLine(_ledSplit(pid, issueKey, ov), issueKey);
      if (line) out += '<div class="pdxor-why pdxor-why-led">' + esc(line) + '</div>';
    }
    return out;
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
  // ── THE SINGLE-MEASURE CHIP, ON THE OFFICIAL RECORD ROW FACE ────────────────
  // The composition meter beside it answers "how much record is behind this
  // percentage" in ITEMS, which is the number this row was already good at. It has
  // no answer for "and how many separate things are those items", and a row reading
  // three lit bars over six votes that are all one bill is the specific shape a
  // hostile reader goes looking for.
  //
  // Scored rows only — there is nothing to qualify without a percentage — and only
  // where the two counts differ, so the chip always tells a reader something the
  // meter next to it did not. It changes no verdict, no percentage and no meter:
  // this is one more disclosure on the closed face, in the amber the surface
  // already uses for limits on a finding.
  function _orOneMeasureChip(pid, issueKey, ov) {
    try {
      if (!ov || typeof ov.score !== 'number') return '';
      var sp = _insSpread(pid, issueKey, ov);
      if (!sp.single || sp.judged < 2) return '';
      var say = 'All ' + sp.judged + ' judged items behind this percentage are the same measure' +
        (sp.ident ? ': ' + sp.ident : '') + '.';
      return '<span class="pdxor-one" data-pdxor-docs="1" title="' + esc(say) +
        '" aria-label="' + esc(say) + '">1 measure</span>';
    } catch (e) { return ''; }
  }

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
  function _orActLine(verdict, title, meta, url, label, omniNote, focus, omniHtml, led) {
    var mv = VERDICTS[verdict] || VERDICTS.limited;
    // `led` (optional) marks a line in a list that is on record and outside Direction
    // Match. The verdict icon is the said-vs-did vocabulary and it is wrong here in
    // the specific way that matters: a "…" against a named bill and a recorded ballot
    // says we do not know what happened, when what we do not have is the other side
    // of a comparison nobody ran. The ledger mark replaces it and the line keeps every
    // other thing it printed, including the direction now in its meta strip.
    var ico = led ? _LED.ico : mv.ico;
    var col = led ? '#9fb4d4' : mv.color;
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
    return '<div class="pdxor-act"><span class="pdxor-act-ico" style="color:' + col + '" aria-hidden="true">' + ico + '</span>' +
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
    // The count is of records WE have mapped to an issue, so the caveat has to be
    // about the mapping. "Still a thin record" over two mapped votes said their
    // record was thin when the tip directly below it was busy listing the further
    // records in the same list that carry no issue mapping yet.
    if (v <= 2) txt += ' so far — not enough mapped yet to read a pattern';
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
  // PUBLISHED, so the profile letterhead's depth line prints THIS sentence rather
  // than assembling a second one from the same counts. Both are pure copy over a
  // counts object the caller already holds — no reads, no DOM, nothing scored — and
  // one builder is the only way the header and this section stay incapable of
  // describing one warm cache two different ways. `_orMappedSummaryTip` assumes a
  // counts object, so callers gate on having one.
  window._pdxMappedSummaryText = _orMappedSummaryText;
  window._pdxMappedSummaryTip = _orMappedSummaryTip;
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

  // ── PHASE 0 · THE ONE COUNTS OBJECT ─────────────────────────────────────────
  // Seven different "N of M issues" figures were reachable on one profile at once,
  // each derived where it was printed: a rail pill counting the tested set, a tree
  // counting leaves, a header counting stated positions, an index counting rows
  // with formal instruments. None of them was wrong on its own terms and no two of
  // them were the same M, so the screen read as four contradictions.
  //
  // This is the only place those totals are counted. Every surface that prints one
  // reads it from here and NAMES WHICH M IT MEANS — the `of` map below is that
  // naming, in one wording per denominator, so a chip's accessible name and a
  // section's subtitle cannot describe the same figure two ways.
  //
  //   total      issues we track for them — one per issue row
  //   stated     issues with a stated position of theirs on file
  //   tested     issues Direction Match actually tested (its numerator)
  //   scorable   issues Direction Match counts as testable (its denominator)
  //   onRecord   issues with ≥1 mapped formal vote or formal action — THE DISPLAY
  //              BAR, read from _stRecordDisplay, the same accessor the browse
  //              surfaces render, so "is there a record?" cannot be answered one
  //              way by a chip and another way by the row it jumps to
  //   scored     issues the FORMAL RECORD scored — row.scored, which is the split the
  //              Official Record section itself makes and the numerator its own
  //              digest leads with ("35 issues tested against orders, signings and
  //              vetoes"). It is a subset of onRecord by construction: a row is
  //              only `scored` when a formal instrument on it was judged.
  //   shown      issues that reach a browse surface: a stated position, or a formal
  //              record, or both. This is the tree's leaf count by construction.
  //   signature  issues tagged on the profile document (the 🎯 Key Issues block).
  //              Not an engine figure and never mixed with one — it is what that
  //              section prints, which is what the pill pointing at it must say.
  //
  // NOT A SCORE, and no new arithmetic: `tested` and `scorable` are Word vs
  // Action's own published coverage, read rather than recomputed, and the rest are
  // counts of rows the row model already built. Nothing here lowers a floor,
  // decides a verdict or feeds one.
  var _PC_OF = {
    total: 'issues we track for them',
    stated: 'issues with a stated position',
    tested: 'issues Direction Match could test',
    scorable: 'issues Direction Match counts',
    onRecord: 'issues with a formal record on file',
    scored: 'issues the formal record scored',
    shown: 'issues on the browse surfaces',
    signature: 'issues tagged on this profile'
  };
  function _profileCountsBuild(pid, p) {
    var out = { pid: pid || '', total: 0, stated: 0, tested: 0, scorable: 0,
                onRecord: 0, scored: 0, shown: 0, signature: 0, warming: false, of: _PC_OF };
    if (!pid) return out;
    var rows = [];
    try { rows = issueRows(pid) || []; } catch (e) { rows = []; }
    rows.forEach(function (r) {
      if (!r || !r.key) return;
      out.total++;
      var said = _stSaid(r);
      if (said) out.stated++;
      var on = false;
      try { on = !!(_stRecordDisplay(r) || {}).onRecord; } catch (e) { on = false; }
      if (on) out.onRecord++;
      if (r.scored) out.scored++;
      if (said || on) out.shown++;
    });
    // Direction Match's coverage, as Direction Match publishes it. Read lazily —
    // word-action.js loads after this file and the accessor is called long after
    // both are on the page.
    try {
      if (window.PDXWordAction && typeof window.PDXWordAction.read === 'function') {
        var cov = (window.PDXWordAction.read(pid, p) || {}).coverage || null;
        if (cov) {
          out.tested = cov.tested || 0;
          out.scorable = cov.scorable || 0;
          out.warming = !!cov.warming;
        }
      }
    } catch (e) {}
    try {
      if (typeof window._pdxKeyIssues === 'function') out.signature = (window._pdxKeyIssues(p) || []).length;
      else if (p) out.signature = ((p.issues || p.keyIssues || []) || []).length;
    } catch (e) { out.signature = 0; }
    return out;
  }
  var _pcCache = {}, _pcEpoch = -1;
  // Memoized per (politician, term scope) on the derivation epoch, exactly as the
  // row cache is — the counts are a fold over those rows, so they may not outlive
  // them. A warming profile is NOT cached: `warming` can go false without the
  // record changing (a fetch that came back empty settles the lane without noting
  // a member), and a cached "still loading" would strand every chip reading it.
  function profileCounts(pid, p) {
    var ep = (typeof window.PDXDataEpoch === 'function') ? window.PDXDataEpoch() : 0;
    if (_pcEpoch !== ep) { _pcCache = {}; _pcEpoch = ep; }
    var k = norm(pid) + '||' + execTermScope().key;
    if (Object.prototype.hasOwnProperty.call(_pcCache, k)) return _pcCache[k];
    var v = _profileCountsBuild(pid, p);
    if (!v.warming) _pcCache[k] = v;
    return v;
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
                _orOneMeasureChip(pid, s.key, s.ov) +
                _orOmniChip(pid, s.key) +
                '<span class="pdxor-caret" aria-hidden="true">▾</span>' +
              '</div>' +
              _orProofHtml(pid, s.key, s.ov, inline) +
            '</summary>' +
            '<div class="pdxor-row-body">' +
              _orWhyHtml(pid, s.key, s.ov) +
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
  //
  // ONE TIER, TWO POPULATIONS — AND ONLY ONE OF THEM WAS TESTED. ROW_TIER.tested is
  // "the engine reached a verdict", and `limited` is one of those verdicts, so a row
  // holding a dozen mapped roll calls and NO stated position of theirs to test them
  // against landed in tier 1 under the heading "Tested — and the record backs it up".
  // Measured on the shipped list that was the majority of the tier on a dense member:
  // 58 of Schumer's tier-1 rows, sorted last inside it by _VERDICT_RANK and therefore
  // past the lead cap, behind a fold whose label promised issues the record backs up.
  // Nothing was tested on those rows and nothing was backed up; the formal record they
  // do hold — and the direction line this list already prints for it — read as absent.
  //
  // So the tier splits into two GROUPS. Same tier, same rank, same rows, same result
  // vocabulary: what changes is which heading a reader meets them under and whether
  // they have to open something labelled for scored issues to find them. The group is
  // keyed on the row's already-resolved result SHAPE (_stResult(r).shape === 'no_stance'
  // over a record that is genuinely on file) — it derives nothing, scores nothing, and
  // these rows stay exactly as unscored as they were.
  var _ST_GRP = [
    { id: 'tension', tiers: [0], label: 'Tested — and the record pushes back' },
    { id: 'tested',  tiers: [1], label: 'Tested — and the record backs it up',
      fold: 'the record backs up' },
    { id: 'held',    tiers: [1], label: 'On the formal record — no stated position yet',
      fold: 'with a formal record and no stated position' },
    { id: 'word',    tiers: [2], label: 'Stated, nothing formal has tested it yet' },
    { id: 'action',  tiers: [3], label: 'On the record, nothing stated' },
    { id: 'empty',   tiers: [4], label: 'Nothing on file yet' }
  ];
  // A GROUP SET, not a count of groups. Slicing the first two LIVE groups was wrong:
  // on a figure with no contradictions the tension group is empty and drops out of
  // `live`, so "the first two" silently became tested + everything-untested — 24 of
  // 32 rows open on a president, which is the wall this layer exists to replace.
  // Keying on the group id means an empty group above can never promote a folded one.
  // `held` is open for the same reason `tension` is: a formal record nobody has a
  // stated position for is a finding, and a finding one tap down is a finding missing.
  var _ST_OPEN_GRPS = { tension: 1, tested: 1, held: 1 };
  // How many rows an OPEN group may show before the remainder folds. Six, because the
  // lead has to stay readable on a phone without scrolling past it, and because the
  // rows below the sixth in a "the record backs it up" group are the least surprising
  // thing on the page. The tension group is exempt — see blockOf.
  var _ST_LEAD_CAP = 6;
  function _stOpen(g) { return !!_ST_OPEN_GRPS[g.id]; }

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
    if (!r || _stSaid(r)) return null;          // a stated position: _stUnscoredDirection's row, if anyone's
    return _stDirIndex(r);
  }
  // The index read itself, with no opinion about which rows deserve it. Both
  // readers below share it so the two surfaces can never disagree about what the
  // record did — only about whether this row is allowed to say so.
  function _stDirIndex(r) {
    var idx = _stDirRaw(r);
    if (!idx || !idx.clause) return null;
    return idx;
  }
  // The same read with one gate fewer: the index BEFORE "has it anything to
  // print". A row needs this to say that the index looked and declined — two
  // rows, one holding a record we cannot characterise and one holding nothing,
  // printed the same blank, and only one of them was a fact about their record.
  // No clause is ever rendered from here: _stDirIndex above is still the only
  // door a printable direction comes through.
  function _stDirRaw(r) {
    try {
      if (!r || !r.pid || !r.key) return null;
      if (r.lane === 'exec') return null;         // later slice — see above
      if (typeof window._pdxRecordDirection !== 'function') return null;
      return window._pdxRecordDirection(r.pid, r.key,
        { noun: _stNoun(r), label: r.label || '' }) || null;
    } catch (e) { return null; }
  }
  // ── WHAT THE RECORD DID, ON A ROW THAT WAS NOT SCORED ───────────────────────
  // The mirror image of the function above, for the rows it refuses. A stated
  // position exists, so _stRecordDirection declines — correctly, because where
  // Direction Match SCORED the row, the record's direction is Direction Match's
  // business and a second direction printed beside its verdict would be a second
  // score.
  //
  // But a row that fell to `limited` was not scored. Nothing in its record was
  // judged against the claim, which is exactly what `_stSplit(r) === null` means,
  // and the fallback sentence then made an affirmative claim about the record
  // that the record refutes: "There is a record here, but none of it takes a
  // clear side on this claim", printed over nine votes that all went the same
  // way. Schumer on Israel — 9 recorded votes, all nine primary-mapped, all nine
  // advancing it — read as a denial that any of it took a side. 127 rows printed
  // that shape; 59 of them held a clause the index had already computed.
  //
  // WHAT THIS IS NOT. Like its sibling it returns a fragment of a REASON LINE.
  // It cannot reach res.pct (still null), res.state, res.bucket or the verdict;
  // the row keeps the label it already had and stays out of Direction Match. Its
  // caller has already established that no lane judged a direction here, so this
  // clause can never sit beside a percentage, a numerator or a verdict word. And
  // it says what the RECORD did, never what the person holds: the stated position
  // is on the row two lines up, and these two facts are printed side by side,
  // deliberately never merged into a conclusion neither of them reached.
  function _stUnscoredDirection(r) {
    if (!r || !_stSaid(r)) return null;         // no stated position: _stRecordDirection's row
    return _stDirIndex(r);
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
  // Suppressions that are about THE ISSUE, not about their record. When the index
  // declines because this issue has no directional pole to sort a vote against —
  // or is a balance key, where "advanced it" is not a thing a vote can do — the
  // shortfall belongs to our mapping, not to them. Saying "too thin to
  // characterise" there would state a fact about their record that we have not
  // established, so the row stays silent and prints only what it can defend.
  var _ST_DIR_ISSUE_SILENT = { balance_key: 1, no_pole: 1, no_issue: 1 };
  // The counterpart to _stDirClause: what the row says when the index LOOKED and
  // could not speak. `record_thin` is the one token that is a finding about their
  // record — items are on file, too few took a side to characterise — and it is
  // the only one that earns a line here. `record_none` stays silent on purpose:
  // "nothing directional on file" beside an inventory count reads as a complaint
  // about a record that may be complete and simply unmapped, and a row that
  // already prints its count does not need us to editorialise the blank.
  //
  // WHAT THIS IS NOT. Not a clause, not a direction, not a token the row can be
  // sorted or scored on: it borrows the index's own published label so the
  // vocabulary stays the index's, and it is never a substitute for a stated
  // position that exists.
  function _stDirLimit(r) {
    var idx = _stDirRaw(r);
    if (!idx || idx.clause) return '';                              // spoke, or nothing there
    if (idx.token !== 'record_thin') return '';
    if (idx.suppressed && _ST_DIR_ISSUE_SILENT[idx.suppressed]) return '';
    var lbl = idx.label || '';
    return lbl ? lbl.charAt(0).toLowerCase() + lbl.slice(1) : '';
  }

  // ── THE FORMAL-RECORD PATTERN CHIP ──────────────────────────────────────────
  // WHAT IT IS. One chip on the row's top line saying how one-sided the formal
  // record on this issue actually was — "Strongly opposes · 12 advanced · 0
  // against", "Thin supports · 1 vote advanced" — read straight off
  // _recordPatternTier(), which reads straight off the index _stDirRaw already
  // returns. No second engine, no arithmetic here, no new gate: every threshold
  // it obeys is a shipped record-direction gate.
  //
  // WHY A CHIP AND NOT A LINE. The clause lines below (_stRecordDirection,
  // _stUnscoredDirection) are prose, and prose is unscannable at fifteen rows.
  // They also each carry a precondition about the STATED position — one prints
  // only where there is none, the other only where there is one — which means a
  // reader scanning for "which way does their record run" met three different
  // shapes depending on facts about our stance coverage. The chip has no such
  // precondition: any row whose issue has a directional pole and whose record has
  // anything on file gets the same chip in the same place, and the clause stays
  // exactly where it was, saying exactly what it said.
  //
  // WHAT IT IS NOT — and this is the whole reason it is allowed to say "supports".
  // It is not a stance. It never reaches positionStance(), never writes to a
  // position map, and sits BESIDE "Says: …" rather than in place of it, so a row
  // with both shows both and a reader can see the two disagree. It is not a
  // score: no percentage, nothing ordinal, `res.pct`/`res.state`/`res.bucket` are
  // not read here and not written, and the row's data attributes are untouched, so
  // nothing sorts or filters on this. It is not evidence of a claim: the public
  // lane is not consulted — _stDirRaw reads formal items only — so no media
  // receipt can move this chip. And it is not on the exec lane yet, because
  // _stDirRaw declines there; that lane needs its own verb and gets its own pass.
  //
  // FAIL CLOSED, TWO DIFFERENT WAYS. When the ISSUE has no directional pole (a
  // balance key, an unmapped key) the tier engine returns null and no chip renders
  // — the shortfall is our mapping's, and a neutral "No clear pattern yet" printed
  // there would be a claim about their record we have not earned. When the RECORD
  // is the problem (below the member coverage floor, one-sided only on bills this
  // issue was incidental to) the chip prints "No clear pattern yet" in grey, which
  // is the true statement.
  var _ST_PAT_TONE = {
    support: { c: '#4ade80', full: 'rgba(74,222,128,0.18)',  strong: 'rgba(74,222,128,0.10)' },
    oppose:  { c: '#f87171', full: 'rgba(248,113,113,0.18)', strong: 'rgba(248,113,113,0.10)' },
    mixed:   { c: '#f5c842', full: 'rgba(245,200,66,0.16)',  strong: 'rgba(245,200,66,0.10)' },
    muted:   { c: '#8fa6c6', full: 'rgba(159,180,212,0.10)', strong: 'rgba(159,180,212,0.08)' }
  };
  // The quiet fill both weak tiers share. Thin and none must not read as findings,
  // so neither gets its tone's fill — thin keeps the tone in its text and border
  // only, which is what "direction-coloured but visibly lighter" means here.
  var _ST_PAT_QUIET = 'rgba(10,15,30,0.32)';
  function _stPatternTier(r) {
    try {
      if (typeof window._recordPatternTier !== 'function') return null;
      var idx = _stDirRaw(r);
      if (!idx) return null;
      return window._recordPatternTier(idx, { noun: _stNoun(r) }) || null;
    } catch (e) { return null; }
  }
  function _stPatternHtml(r, t) {
    t = t || _stPatternTier(r);
    // ── THE REFUSAL DOOR, ON THE ROW CHIP TOO ─────────────────────────────────
    // The formal-record index already stopped printing "No clear pattern yet" over
    // a ledger with a visible side: _fpiRows offers a declined row the thin door
    // first (_stThinDirRead) and, where that also declines, prints WHICH of the
    // refusals it is (_fpiUnreadWhy). This chip — the one on every stance row on
    // the profile face and in the All Stances overlay — was the surface that never
    // got that pass, so the same row could read "Thin supports" in the index above
    // and "No clear pattern yet" in the list below it. Same engine, same member,
    // same issue, two answers.
    //
    // So it is the same two steps, in the same order, calling the same two
    // functions rather than a second copy of their rules:
    //   1. A row the characterisation engine declined is offered the thin door.
    //      Every wall that door holds is unchanged and is documented over
    //      _stThinDirRead: a poleless issue stays silent, an incidental mapping
    //      stays a coincidence, a record that ran both ways is never given a lead,
    //      and nothing may re-enter above the quiet tier.
    //   2. What is left is genuinely unread, and it says which unread it is.
    //      _fpiUnreadWhy owns that vocabulary — no side to read on this issue, no
    //      vote here took a side, not about this issue, too little of their file
    //      held, ran both ways too few to weigh — and none of its sentences
    //      borrows a direction word.
    //
    // A ROW WITH NOTHING FORMAL ON FILE STILL PRINTS NOTHING. `_stPatternTier`
    // returns null there and this returns '' on null exactly as it always has:
    // silence over an empty file is the honest state, and a grey chip explaining
    // an absence would be a claim about a record that is not there.
    if (t && t.tier === 'none') {
      t = _stThinDirRead(r) || null;
      if (!t) {
        var why = null;
        try { why = _fpiUnreadWhy(r); } catch (e) { why = null; }
        return why ? _fpiUnreadHtml({ why: why }) : '';
      }
    }
    if (!t) return '';
    var tone = _ST_PAT_TONE[t.tone] || _ST_PAT_TONE.muted;
    var bg = (t.weight === 'full') ? tone.full
      : (t.weight === 'strong') ? tone.strong : _ST_PAT_QUIET;
    // The lane marker is not decoration either: "supports" without it reads as a
    // stance, and this chip is the record's, not theirs. The title and the
    // screen-reader label carry the same one sentence the engine publishes.
    var note = t.note || '';
    // role=img + aria-label so the chip is announced as ONE thing, with its
    // disclosure attached — a screen reader reading "Record / Mostly opposes / 8
    // advanced" as three fragments loses the sentence that keeps it out of the
    // score.
    var say = 'Formal record: ' + t.label + (t.counts ? ', ' + t.counts : '') + '. ' + note;
    return '<span class="pdxst-pat w-' + escAttr(t.weight) + '"' +
      ' style="--c:' + tone.c + ';--bg:' + bg + '"' +
      ' data-pdxst-pat="' + escAttr(t.tier) + '"' +
      ' role="img" aria-label="' + escAttr(say) + '"' +
      ' title="' + escAttr(note) + '">' +
      '<span class="pdxst-pat-lane" aria-hidden="true">🏛 Record</span>' +
      '<span class="pdxst-pat-lb">' + esc(t.label) + '</span>' +
      (t.counts ? '<span class="pdxst-pat-n">· ' + esc(t.counts) + '</span>' : '') +
      '</span>';
  }

  // ── 🏛 THE RECORD SLOT: WHAT TO PRINT WHERE ONE FORMAL ITEM EXISTS ──────────
  // _stPatternTier above is the CHARACTERISATION read and it stays exactly as it
  // is: the record-pattern chip on a stance row, the formal-pattern index and the
  // words-vs-record card all read it, and every one of its floors still holds.
  // What it cannot do is fill a slot. It declines on three separate grounds — the
  // roll-call index is still in flight, the lane is executive, the member's mapped
  // file is under the coverage floor — and a browse surface that omits its Record
  // line on each of them prints a blank, which a reader reads as "nothing on
  // record". That is a stronger claim than the engine ever made and it is false in
  // all three cases.
  //
  // So this is the DISPLAY read, and it is the accessor a browse surface should
  // use. One mapped formal vote or one formal action is enough to say there is a
  // record and what it did; the depth is printed beside it every time, and a
  // single item is worded as a beginning. It resolves in this order, which is the
  // shipped decision table:
  //
  //   scored     Direction Match already tested this issue from the FORMAL lane —
  //              so the slot prefers that verdict's own word (Backed up / Mixed /
  //              Contradicted / Not enough on file) over a second vocabulary for the same
  //              finding, and carries the percentage with it.
  //   direction  ≥1 formal item and a direction the display bar could read →
  //              _RD_TIERS' own label plus the count it was read from.
  //   onfile     formal items on file, no direction yet → says exactly that, with
  //              the count, and names WHY in the reason line.
  //   none       nothing formal on this issue → "No formal record on this issue
  //              yet", which is the one state that may say nothing is there.
  //
  // WHAT IT IS NOT. Not a score and not an input to one — no verdict, no ratio and
  // no tally reads this function, and the percentage it carries is one Direction
  // Match had already computed and published on the row. Not a stance: nothing
  // here is written to a position map, and a direction read from the record is
  // labelled as the record's on every surface that prints it. Not the public lane:
  // `items` is the row's FORMAL inventory only, and the scored branch is refused to
  // a public-record verdict however well evidenced it is, because a public-record
  // percentage under a 🏛 Record label would be two lanes reading as one.
  var _ST_REC_ONFILE_LEAD = 'Formal items on file';
  var _ST_REC_ONFILE = _ST_REC_ONFILE_LEAD + ' · direction not clear yet';
  var _ST_REC_NONE = 'No formal record on this issue yet';
  var _ST_REC_PENDING = 'Checking the formal record…';
  // The scored slot's own sentence. It may NOT borrow the pattern engine's note,
  // which ends on "never counted in Direction Match" — true of every pattern read
  // and false of exactly this one state, because this state IS the Direction Match
  // result. One wrong disclosure is worse than none.
  var _ST_REC_NOTE_SCORED = 'Direction Match on this issue: what they said, tested against the ' +
    'formal record on file.';
  // THE SAME SENTENCE, IN THE LANE'S OWN COUNTABLE. The engine publishes one note
  // and it says "votes on file"; on the executive lane the countable is actions and
  // nothing else about the sentence changes. Fails safe by construction — if the
  // engine's wording moves, the swap no-ops and the shared sentence still prints.
  function _stRecNote(r, t) {
    var note = (t && t.note) || '';
    if (note && r && r.lane === 'exec') note = note.replace('votes on file', 'actions on file');
    return note;
  }
  // The one-item sentence. A count with no horizon reads as a verdict on a sample
  // of one, so the slot says out loud what one item is: a start.
  function _stRecEarly(noun) {
    return 'early signal; more ' + noun.many + ' can change this.';
  }

  // The executive lane's index, shaped like a roll-call one so the SAME display
  // tier reads both. This is not a pattern engine for executive actions and it
  // does not become one: it counts what PDXExecRecord already resolved per issue —
  // one entry per action with its own direction, already inverted for the blocking
  // classes by issueDirection() — and hands those counts over. `token` is its own
  // so nothing downstream can mistake it for a roll-call read, and no score is
  // set, published or derived here.
  //
  // WHY THE EXEC POOL IS NOT "PARTIAL". The roll-call coverage floor exists because
  // an API fetch may have landed us a fraction of a member's mapped votes. The
  // executive pool is the shipped, curated action set for that term scope — we
  // hold all of it or none of it — so a uniform run of seven orders is seven of
  // seven, not seven of an unknown number, and the display tier reads its depth at
  // face value. See the `partial` flag in _recordDisplayTier.
  function _stExecDisplayIndex(r) {
    try {
      if (!r || r.lane !== 'exec' || !r.pid || !r.key) return null;
      var XR = window.PDXExecRecord;
      if (!XR || typeof XR.issue !== 'function') return null;
      var res = XR.issue(r.pid, r.key) || {};
      var acts = res.actions || [];
      var idx = { issueKey: r.key, token: 'record_exec', lead: null,
                  characterised: false, counted: false,
                  judged: 0, advances: 0, opposes: 0, advanceScore: 0, opposeScore: 0,
                  primary: 0, total: 0, suppressed: null, clause: '', summary: '', label: '' };
      for (var i = 0; i < acts.length; i++) {
        var a = acts[i];
        if (!a || (a.direction !== 'advances' && a.direction !== 'opposes')) continue;
        idx.total++; idx.judged++;
        if (a.isPrimary) idx.primary++;
        // Unweighted on purpose: an executive action has no mapping weight and no
        // procedural discount to apply, so every act counts once and the two
        // scores are the two counts. Nothing reads them as a magnitude.
        if (a.direction === 'advances') { idx.advances++; idx.advanceScore += 100; }
        else { idx.opposes++; idx.opposeScore += 100; }
      }
      return idx.total ? idx : null;
    } catch (e) { return null; }
  }
  // WHICH INDEX, BY LANE — and _stDirRaw is left exactly as it is. That function
  // declines on the executive lane by design and the scoring path depends on it
  // declining; the display path routes around it instead of loosening it.
  function _stDisplayIndex(r) {
    if (!r) return null;
    if (r.lane === 'exec') return _stExecDisplayIndex(r);
    try { return _stDirRaw(r); } catch (e) { return null; }
  }
  function _stDisplayTier(r) {
    try {
      if (typeof window._recordDisplayTier !== 'function') return _stPatternTier(r);
      var idx = _stDisplayIndex(r);
      if (!idx) return null;
      return window._recordDisplayTier(idx, { noun: _stNoun(r) }) || null;
    } catch (e) { return null; }
  }

  // WHY NO DIRECTION, when there are items. Two of the four answers are already
  // written and still true, so they are reused verbatim from the formal-pattern
  // index rather than restated here; the two the display bar creates are new,
  // because "the pattern read has not been extended to this lane" stopped being
  // true for this slot the moment the exec index above existed.
  function _stRecordWhy(r, idx, items) {
    var n = _stNoun(r);
    var many = (items === 1 ? n.one : n.many);
    var sup = (idx && idx.suppressed) || null;
    if (!sup) {
      try {
        if (typeof window._pdxRecordSuppressedKey === 'function') {
          sup = window._pdxRecordSuppressedKey(r && r.key) || null;
        }
      } catch (e) { sup = null; }
    }
    // A POLELESS ISSUE ANSWERS FIRST, on every lane. It is the one reason that is
    // about the issue rather than about the record, and _fpiUnreadWhy already words
    // it — including for the executive lane now that it reads the key.
    if (sup && _RD_TIER_MUTED[sup]) {
      try { return _fpiUnreadWhy(r); } catch (e) {}
    }
    if (r && r.lane === 'exec') {
      return { id: 'exec_no_direction', lb: 'Formal items on file',
        note: items + ' ' + many + ' on file and open in the dossier. None of them takes a ' +
          'for-or-against side on this issue, so no direction is claimed here either way.' };
    }
    if (sup === 'no_primary') {
      return { id: 'incidental', lb: 'Formal items on file',
        note: items + ' ' + many + ' on file touch this issue only incidentally — none of them ' +
          'was about it — so no direction is read from them. The ' + n.many + ' are in the dossier.' };
    }
    try { return _fpiUnreadWhy(r); } catch (e) {}
    return { id: 'unread', lb: 'Formal items on file', note: '' };
  }

  // ONE ROW'S RECORD SLOT. Pure, and every number on it is a number some other
  // engine already published: `items` is the row's own formal inventory, `pct` and
  // the verdict word are Direction Match's, the direction and its counts are the
  // display tier's. The slot decides nothing except which of the four states to
  // print.
  function _stRecordDisplay(r) {
    var noun = _stNoun(r || {});
    var out = { state: 'none', label: _ST_REC_NONE, depth: '', counts: '',
                items: 0, judged: 0, docs: 0, single: false, noun: noun, onRecord: false,
                tier: 'none', weight: 'flat', tone: 'muted', color: '',
                directional: false, early: false, partial: false, display: false,
                earlyNote: '', pct: null, scored: false, metric: '', token: '',
                // The plain-language read, from the shared vocabulary. Null until a
                // tier is resolved — a slot with nothing on file indicates nothing,
                // and 'No clear pattern yet' printed over an empty file would be a
                // claim about a record that is not there.
                says: null,
                note: '', why: null };
    if (!r || !r.key) return out;
    var idx = _stDisplayIndex(r);
    var t = null;
    try {
      if (idx && typeof window._recordDisplayTier === 'function') {
        t = window._recordDisplayTier(idx, { noun: noun }) || null;
      }
    } catch (e) { t = null; }
    // The inventory is the row's own formal count, floored by whatever the index
    // actually holds — never the public lane, and never a sum of the two.
    var items = Math.max(_stHeld(r) || 0, (idx && idx.total) || 0);
    out.items = items;
    out.onRecord = items > 0;
    out.judged = (idx && idx.judged) || (t && t.judged) || 0;
    out.token = (r.verdict && r.verdict.token) || '';
    if (t) {
      out.tier = t.tier; out.weight = t.weight; out.tone = t.tone;
      out.counts = t.counts || ''; out.directional = !!t.directional;
      out.display = !!t.display; out.partial = !!t.partial;
      out.early = !!t.early; out.note = _stRecNote(r, t);
      out.says = t.says || null;
    }
    // DEPTH IS THE INVENTORY, always — the number of formal items this row holds,
    // which is the number its dossier lists and the number _stResult prints. The
    // judged subset is stated separately in `counts` ("2 actions advanced") where a
    // direction was read from fewer items than are on file, so the two figures are
    // never one figure and the smaller one never stands in for the file.
    out.depth = items ? (items + ' ' + (items === 1 ? noun.one : noun.many)) : '';
    // …AND THE DEPTH BEHIND THE DEPTH. `items` above is an inventory count: six
    // roll calls on one bill are six items and one document, and the inventory
    // alone cannot tell those apart. `docs` is the distinct-instrument count over
    // the judged set, from the shared accessor — so a leaf that shows a verdict can
    // say the finding rests on a single measure without recomputing what that means.
    // Read-only: nothing below branches on it and no verdict, tier, tone or
    // percentage on this slot moves because of it.
    if (items) {
      var _spr = _insSpread(r.pid, r.key, null);
      out.docs = _spr.docs; out.single = !!_spr.single;
    }
    if (out.early || items === 1) {
      out.early = true;
      out.earlyNote = _stRecEarly(noun);
    }
    if (!items) {
      // NOTHING ON FILE IS NOT THE SAME AS NOTHING FETCHED YET. The roll-call lane
      // arrives after first paint, and "No formal record on this issue yet" printed
      // over a request still in flight is the one wrong sentence this slot could
      // say — so while the lane is outstanding the slot says it is still looking,
      // in the same words the row's own result uses.
      if (r.lane !== 'exec' && !recordSettled(r.pid)) {
        out.state = 'pending';
        out.label = _ST_REC_PENDING;
      }
      return out;
    }

    // ── scored ──────────────────────────────────────────────────────────────
    // Direction Match's own word, and only for a FORMAL-lane result. A row the
    // public record decided keeps its public-record verdict on the surfaces that
    // own that lane and is read here as what it is on this one: a formal record
    // with, or without, a direction.
    var res = null;
    try { res = _stResult(r); } catch (e) { res = null; }
    if (res && res.state === 'tested' && typeof res.pct === 'number' &&
        res.metric === 'Direction match') {
      out.state = 'scored'; out.scored = true;
      out.pct = res.pct; out.metric = res.metric;
      out.label = res.label || (r.verdict && r.verdict.label) || '';
      out.color = res.color || '';
      out.note = _ST_REC_NOTE_SCORED;
      return out;
    }
    // ── direction ───────────────────────────────────────────────────────────
    if (t) { out.state = 'direction'; out.label = t.label; return out; }
    // ── onfile ──────────────────────────────────────────────────────────────
    out.state = 'onfile';
    out.why = _stRecordWhy(r, idx, items);
    // ── THE REASON GOES IN THE SLOT, NOT ONLY IN THE TOOLTIP ──────────────────
    // "Formal items on file · direction not clear yet" is true of every row that
    // reaches here and distinguishes none of them. The reason was already computed
    // one line above and was already read out in the accessible name; a reader
    // looking at the chip could see THAT there was no direction and had to hover to
    // learn WHY, which is the wrong half to hide — "we hold too little of their
    // file" is a statement about our coverage and "they ran both ways" is a
    // statement about their record, and a reader who cannot tell those apart has
    // been told nothing. So the short reason label joins the state in the chip and
    // the full sentence stays where it was.
    //   THE GENERIC SURVIVES AS A FALLBACK, for the lanes whose own `why` has no
    // reason more specific than the state name (the executive lane says "formal
    // items on file" and means exactly that), and for anything new that arrives
    // here without one.
    var _why = (out.why && out.why.lb) ? String(out.why.lb) : '';
    out.label = (_why && _why !== _ST_REC_ONFILE_LEAD)
      ? (_ST_REC_ONFILE_LEAD + ' · ' + _why.charAt(0).toLowerCase() + _why.slice(1))
      : _ST_REC_ONFILE;
    out.note = (out.why && out.why.note) || out.note;
    return out;
  }

  // ── WHICH GROUP A ROW BELONGS UNDER ─────────────────────────────────────────
  // The grouping key, and the only thing that reads it is the heading a row is
  // rendered beneath. It maps a row's TIER to a group id, with one split: tier 1
  // holds both the rows a verdict actually tested and the rows that fell to
  // `limited` because we hold no stated position to test their formal record
  // against, and those two do not belong under one heading. See _ST_GRP.
  //
  // NOTHING HERE DERIVES ANYTHING. Both facts are read off the row's own resolved
  // result: `shape === 'no_stance'` is _stResult's name for "no stated position on
  // file", and `held` is r.evidence.actions, the formal inventory the row already
  // prints. A row with no stated position AND no formal record is not a formal-record
  // finding, so it stays where it was.
  //
  // `res` is that result, passed in where the caller already has it so a dense list
  // resolves each row once instead of once per question asked about it.
  function _stHeldRecord(r, res) {
    if (!r || r.tier !== ROW_TIER.tested) return false;
    res = res || _stResult(r);
    return res.shape === 'no_stance' && (res.held || 0) > 0;
  }
  function _stGrpId(r, res) {
    if (_stHeldRecord(r, res)) return 'held';
    var t = r && r.tier;
    return (t === ROW_TIER.tension) ? 'tension'
      : (t === ROW_TIER.tested) ? 'tested'
      : (t === ROW_TIER.word_only) ? 'word'
      : (t === ROW_TIER.action_only) ? 'action' : 'empty';
  }
  // ── STRONGEST FIRST, INSIDE THAT ONE GROUP ──────────────────────────────────
  // rankIssueRows() is the shared ranking contract and it is not touched: every
  // surface still receives the same rows in the same order, and this group is still
  // a subsequence of it. Within the group, though, the shared sort's tiebreakers
  // (evidence volume, then salience) are the wrong ones — the rows a reader came
  // for are the ones whose record SAID something, and a row whose index declined
  // reads as an empty promise sitting above one that didn't.
  //
  // The order is the index's own confidence ladder, borrowed rather than restated:
  // a characterised direction, then a short run that all went one way, then a split
  // that may print both counts, then a split that may not, then a record the index
  // looked at and called too thin, then the rows it cannot speak on at all. No
  // percentage, no lean and no verdict is computed here — this only decides which
  // already-rendered row is painted first.
  var _ST_HELD_STRENGTH = {
    record_direction: 0, record_uniform_thin: 1, record_split_deep: 2, record_split: 3
  };
  function _stHeldStrength(idx, r) {
    if (idx && idx.clause && typeof _ST_HELD_STRENGTH[idx.token] === 'number') {
      return _ST_HELD_STRENGTH[idx.token];
    }
    return _stDirLimit(r) ? 4 : 5;
  }
  // resOf(r) hands back the row's already-computed result, whose `dir` IS the index
  // read this row printed from — so the order is taken off the rendered row rather
  // than from a second derivation that could disagree with it.
  function _stHeldOrder(rows, resOf) {
    return rows.map(function (r, i) {
      var res = (resOf && resOf(r)) || _stResult(r);
      var idx = res.dir || null;
      return { r: r, i: i, s: _stHeldStrength(idx, r), j: (idx && idx.judged) || 0,
               h: (res.held || 0) };
    }).sort(function (a, b) {
      // Position in the shared ranking is the last tiebreaker, so a group whose rows
      // the index says nothing about is byte-identical to the list as it shipped.
      return (a.s - b.s) || (b.j - a.j) || (b.h - a.h) || (a.i - b.i);
    }).map(function (o) { return o.r; });
  }

  // ── THE SAME FINDING, WHERE VOTERS ACTUALLY COMPARE AND CHOOSE ───────────────
  // Everything above this line renders a PROFILE ROW. That is one screen deep in
  // one person's file, and it is not where a ballot is decided: the compare table,
  // the issue-choice cards and the ballot breakdown are. On those surfaces a
  // member with twenty mapped roll calls and no sourced stance rendered the same
  // grey blank as a member with nothing on file at all — the record was computed,
  // and then discarded one function short of the screen a voter chooses on.
  //
  // ONE PLACE DECIDES. The three surfaces below (compare-table.js,
  // issue-compare.js, ballot-breakdown.js) do not each ask the index and each
  // word an answer; they call this and print what comes back. That is why the
  // clause is _stDirClause's clause, the labels are _RD_TOKENS' labels and the
  // vocabulary is _stTeach's vocabulary: a surface cannot drift from the row,
  // because a surface never writes this sentence.
  //
  // WHAT IT IS NOT, on every surface it reaches:
  //   · not a score — `pct` does not exist on this shape and no share, rate or
  //     percentage is composed anywhere below;
  //   · not a stance — the record is the subject of every sentence, never the
  //     person, and the disclosure says so in words;
  //   · not a sort key and not a filter key — this returns display text and
  //     nothing ordinal. The callers rank and bucket on what they already ranked
  //     and bucketed on (see the note over rankScore in issue-compare.js);
  //   · not an input to Direction Match / Word vs Action. It reads the same warm
  //     items those score from and writes nothing back.
  //
  // A SCORED RESULT ALWAYS WINS. Callers ask this only where their own scored
  // read came back empty — no verdict, no percentage, nothing judged. That
  // ordering lives in the caller because the caller is the one holding the
  // verdict; what lives here is the refusal to invent one.
  //
  // THE THREE EMPTY STATES, which a single grey blank used to flatten into one:
  //   'none'   — no formal record on file for this member on this issue;
  //   'thin'   — a record IS on file and may not be characterised (too short, too
  //              split, below the coverage floor, or an issue with no support
  //              pole). The count is honest; the direction is withheld;
  //   'speaks' — the record-direction clause the profile row would print.
  // Returns null when nothing is warm yet, so a surface keeps whatever pending or
  // silent state it already had rather than asserting an absence we have not read.
  var _RD_SLOT_NOTE = 'No stated position on file — this is what the record itself did, ' +
    'not a stated stance and not a score.';
  var _RD_SLOT_NOTE_SAID = 'None of it has been judged against their stated position, ' +
    'so this is what the record itself did — not a score.';
  var _RD_SLOT_NOTE_THIN = 'Too little on file to say which way it ran, so no direction is stated.';
  // The disclosure is the SHARE CARD'S fixed disclosure wherever receipt-cards.js
  // is loaded, so the sentence a reader meets on a compare cell is the sentence
  // they meet on the card they share from it. The literal above is pinned equal to
  // it by scripts/test-record-direction-surfaces.mjs — two copies that cannot
  // drift beats one copy that only some surfaces can reach.
  function _rdSlotNote() {
    try {
      var g = window.PDXReceiptCards && window.PDXReceiptCards.guards;
      if (g && g.rdNote) return g.rdNote;
    } catch (e) {}
    return _RD_SLOT_NOTE;
  }
  function _rdSlot(pid, issueKey, opts) {
    try {
      if (!pid || !issueKey) return null;
      if (typeof window._pdxRecordDirection !== 'function') return null;
      var o = opts || {};
      // The exec lane is out of scope here for the same reason it is out of scope
      // on the row: "advanced it" over an executive order needs the exec lane's
      // own vocabulary and its own standing rules.
      var lane = o.lane || recordLaneFor(pid, issueKey);
      if (lane === 'exec') return null;
      var noun = o.noun || { one: 'vote', many: 'votes' };
      var label = o.label || _issueLabel(issueKey) || '';
      var idx = window._pdxRecordDirection(pid, issueKey, { noun: noun, label: label });
      if (!idx) return null;                    // nothing warm — the surface stays as it was
      var total = idx.total || 0;
      var many = (total === 1) ? noun.one : noun.many;
      // `clause`, not `characterised` and not `counted` — the gate is exactly the
      // gate the profile row uses (_stDirIndex refuses an empty clause and nothing
      // else), so a decision surface speaks wherever the row would speak.
      var speaks = !!idx.clause;
      var state = speaks ? 'speaks' : (total ? 'thin' : 'none');
      var said = false;
      try { said = !!(o.said === true || (o.said !== false && positionStance(pid, issueKey))); } catch (e) { said = false; }
      var inv = total + ' ' + many + ' on file';
      var text, note, aria;
      if (state === 'speaks') {
        text = inv + ' — ' + _stDirClause(idx, total);
        note = said ? _RD_SLOT_NOTE_SAID : _rdSlotNote();
        aria = (idx.summary || text) + ' ' + note;
      } else if (state === 'thin') {
        // The token names its own refusal ("Too thin to characterise"), so the
        // reason a direction is withheld is not worded a second time here.
        text = inv + ' — ' + String(idx.label || '').toLowerCase();
        note = _RD_SLOT_NOTE_THIN;
        aria = text + '. ' + note;
      } else {
        text = 'No record on file yet';
        note = '';
        aria = 'No formal record on file yet' + (label ? ' on ' + label : '') + '.';
      }
      return {
        state: state, token: idx.token, issueKey: issueKey, pid: pid, lane: lane,
        label: idx.label || '', judged: idx.judged || 0, total: total, held: total,
        characterised: !!idx.characterised, counted: !!idx.counted,
        lead: idx.lead || null, suppressed: idx.suppressed || null,
        noun: noun, many: many, said: said,
        clause: speaks ? _stDirClause(idx, total) : '',
        summary: idx.summary || '', text: text, note: note, aria: aria
      };
    } catch (e) { return null; }
  }
  // The slot's markup. Escaped, then run through the row's OWN teaching pass, so
  // "advanced it" / "cut against it" / "ran both ways" carry the same dotted
  // glossary control on a ballot card that they carry on the profile row — the
  // reader meets the claim and its definition in the same place.
  //   opts.compact — drop the disclosure line (tight cells); it stays in the
  //                  tooltip and the accessible name, never dropped outright.
  //   opts.ico     — false to omit the 🏛️ lane glyph.
  //   opts.cls     — extra class for the calling surface's own spacing.
  function _rdSlotHtml(slot, opts) {
    if (!slot) return '';
    try { ensureStyles(); } catch (e) {}
    var o = opts || {};
    var ico = (o.ico === false) ? ''
      : '<span class="pdx-rdir-ico" aria-hidden="true">🏛️</span>';
    var note = (o.compact || !slot.note) ? ''
      : '<span class="pdx-rdir-note">' + esc(slot.note) + '</span>';
    return '<span class="pdx-rdir is-' + esc(slot.state) + (o.cls ? ' ' + esc(o.cls) : '') +
      '" title="' + esc(slot.aria) + '" aria-label="' + esc(slot.aria) + '">' + ico +
      '<span class="pdx-rdir-txt">' + _stTeach(esc(slot.text)) + '</span>' + note + '</span>';
  }
  // Slot + markup in one call, for the surfaces whose empty branch is a single
  // return statement. '' when nothing is warm, which is what those branches
  // already returned.
  function _rdSlotFor(pid, issueKey, opts) {
    var slot = _rdSlot(pid, issueKey, opts);
    if (!slot) return '';
    if (opts && opts.only && opts.only.indexOf(slot.state) < 0) return '';
    return _rdSlotHtml(slot, opts);
  }
  // The row's result, as data. One place decides what a row concluded, so the
  // markup below and the tests both read the same answer.
  function _stResult(r) {
    var v = (r && r.verdict) || {};
    var tok = v.token;
    var pubBasis = (v.basis === 'public_record');
    // ONE RESULT VOCABULARY. The word on this row is the word the issue index filed
    // it under — Backed up, Mixed, Contradicted, Not enough on file — read from the module
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
      // is on. "Limited" covers four different situations and a reader can tell
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
      //   · A STATED POSITION WE COULD NOT TEST — the record ran one way, or ran
      //     both ways, but none of it was judged against this particular claim.
      //     See the branch below; this one used to deny the record it holds.
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
          // WHERE THE INDEX LOOKED AND DECLINED. Two rows printed the identical
          // bare inventory: one holding a record too thin to characterise, one
          // holding a record we simply have no pole to sort. Only the first is a
          // fact about their record, so only the first says so — see _stDirLimit.
          var llimit = lclause ? '' : _stDirLimit(r);
          lwhy = lheld + ' ' + lmany + ' on file' +
            (lclause ? ' — ' + lclause : (llimit ? ' — ' + llimit : '')) +
            ' · no stated position from them yet, so this row isn’t scored' +
            // THE FOURTH PART OF THE DISCLOSURE. Inventory, direction and "not a
            // score" were all on the row already; what was missing is the one that
            // stops a reader carrying the direction away as a position — this is
            // the share card's and the compare cell's sentence (_RD_SLOT_NOTE),
            // ending on the same two denials, so the row cannot drift from them.
            (lclause ? ' — this is what the record itself did, not a stated stance.' : '.');
          linvite = { count: lheld, noun: lmany, cta: 'see the ' + lmany };
        } else {
          lwhy = 'No stated position from them yet, so there is nothing here to test the record against.';
        }
      } else if (!lim) {
        //   · A STATED POSITION WE COULD NOT TEST. Same silence from _stSplit, but
        //     the other way round: we hold what they said, and we hold the record,
        //     and nothing in the record was judged against that particular claim.
        //     The old sentence turned that into an assertion about the record —
        //     "none of it takes a clear side" — which on a one-way record is simply
        //     false. Nine votes on Israel, every one of them advancing it, printed
        //     as a denial that any of them took a side. So where the index already
        //     knows which way the record cut, the row says so, in the index's own
        //     words, and then says plainly that this is not a score. Where the index
        //     declines — a genuinely thin or genuinely sideless record — the two
        //     original sentences stand unchanged, because there they are true.
        ldir = _stUnscoredDirection(r);
        var sclause = _stDirClause(ldir, lheld);
        if (sclause && lheld > 0) {
          var smany = (lheld === 1 ? lnoun.one : lnoun.many);
          lshape = 'unjudged';
          lwhy = lheld + ' ' + smany + ' on file — ' + sclause +
            ' · none of it has been judged against their stated position, so this row isn’t scored.';
          linvite = { count: lheld, noun: smany, cta: 'see the ' + smany };
        } else {
          ldir = null;
          lwhy = (r.evidence.total > 0)
            ? 'There is a record here, but none of it takes a clear side on this claim.'
            : 'Nothing on record yet takes a side on this one.';
        }
      } else if (lim.basis !== 'public_record' && _stDirClause(_stDirIndex(r), lheld) && lheld > 0) {
        //   · A RECORD THAT WAS ONLY PARTLY TESTED. _stSplit does return counts
        //     here — a judged handful, too few or too evenly split for the mixed
        //     gate to call — and the row answered with "Not enough record to judge
        //     this one yet." over a file of a dozen or more votes whose direction
        //     the index had already characterised. That sentence is about the JUDGED
        //     subset and reads as a statement about the whole record, which is the
        //     same error this pass fixed one branch up. So the row states its
        //     inventory, states what that record did, and then says precisely how
        //     much of it was judged — the shortfall named, not generalised.
        //     FORMAL SPLITS ONLY. Where the judged handful came from the public
        //     lane, the two numbers in one sentence would be a formal count and a
        //     public count reading as one arithmetic, so that row keeps the old
        //     sentence and the lanes stay separable.
        var pdir = _stDirIndex(r), pclause = _stDirClause(pdir, lheld);
        var pmany = (lheld === 1 ? lnoun.one : lnoun.many);
        var pj = lim.judged, pjn = (pj === 1 ? lnoun.one : lnoun.many);
        ldir = pdir;
        lshape = 'part_judged';
        lwhy = lheld + ' ' + pmany + ' on file — ' + pclause + ' · only ' + pj + ' ' + pjn + ' ' +
          (pj === 1 ? 'has' : 'have') + ' been judged against ' +
          (lsaid ? 'their stated position' : 'a stated position') +
          ', which is not enough to score this row yet.';
        linvite = { count: lheld, noun: pmany, cta: 'see the ' + pmany };
      } else if (lim.judged === 1) {
        lwhy = 'One ' + lnoun.one + ' is not enough to judge this one yet.';
      } else {
        lwhy = 'Not enough record to judge this one yet.';
      }
      return { state: 'thin', pct: null, metric: metric,
               // THE WORD FOLLOWS THE SHAPE. The index's coverage noun names a pile
               // this row is not in — the index drops wordless rows before
               // bucketing — so _dosBucket returns nothing here and the row says what
               // is actually true of it instead: it is not scored. It is not a verdict,
               // it does not rank, and it is the one label on this face that is about
               // OUR coverage rather than their conduct. `part_judged` joins it for
               // the same reason: the index's coverage noun over a row that has just printed
               // fourteen votes and what they did is the false sentence this pass
               // exists to remove, and the word has to agree with the line under it.
               label: (lshape === 'no_stance' || lshape === 'part_judged') ? 'Not scored yet' : word,
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
        var ulimit = uclause ? '' : _stDirLimit(r);
        uwhy = uheld + ' ' + umany + ' on file' +
          (uclause ? ' — ' + uclause : (ulimit ? ' — ' + ulimit : '')) +
          ' · no stated position from them yet, so this row isn’t scored' +
          (uclause ? ' — this is what the record itself did, not a stated stance.' : '.');
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
        ' aria-label="' + escAttr(_dosDoorLabel(r.label, res.bucket, r.stance && r.stance.label,
          _stDoorDepth(r, res))) + '">' +
        esc(res.invite.cta) + '<span class="pdxst-lbl-go" aria-hidden="true">→</span>' +
      '</button>';
    }
    return '<' + t + ' class="pdxst-why">' + _stTeach(esc(res.why)) + door + '</' + t + '>';
  }
  // ── 🏛 THE RECORD LEADS THE ROW ─────────────────────────────────────────────
  // WHAT CHANGED IS AN ORDER, NOT A FACT. Every figure on this line was already on
  // this line. What was wrong was which one came first: a row with eleven mapped
  // votes and no stated position on file opened with "Direction match · this issue
  // · — · Not scored yet", so the reader met OUR coverage gap before THEIR record,
  // and an empty percentage above a full ledger reads as "nothing to see here".
  //
  // So where there is a formal record and no score, the record's own read opens the
  // line — in the shared five-word vocabulary published by the engine, with the
  // counts it was read from — and the metric that could not run is demoted to the
  // tail of the same line, saying exactly what it said before. Nothing is hidden,
  // nothing is dropped, and the why line underneath is untouched.
  //
  // THE FRAME IS THE WHOLE REASON THIS IS SAFE TO PRINT. The lead word is
  // _PDX_RD_SAYS_LEAD — "The record indicates" — and it is read from the engine
  // rather than typed here, so no surface can quietly turn it into "they support".
  // No percentage, nothing ordinal, no write-back to a position map, and no scoring
  // path reads this function.
  //
  // FAILS CLOSED IN BOTH DIRECTIONS. A row with nothing formal on file gets no lead
  // at all — silence about an empty file is the honest state, and "No clear pattern
  // yet" over it would be a claim about a record that does not exist. A row the
  // score DID reach keeps the percentage in front, because there the metric ran and
  // the record's read is already on the chip above.
  var _ST_LEAD_ONFILE = 'Formal acts on file · no clear direction yet';
  function _stLeadSlot(r, res) {
    if (!r || (res && res.state === 'tested')) return null;
    var d;
    try { d = _stRecordDisplay(r); } catch (e) { return null; }
    if (!d || !d.onRecord || d.state === 'pending' || d.state === 'scored') return null;
    // AND IT READS THE GATED TIER, NOT THE DISPLAY ONE. Two reads of the same index
    // ship: _recordPatternTier characterises and holds the floors — four judged
    // items, three-quarters one way — while _recordDisplayTier deliberately starts
    // one item lower, because a display bar exists to show what is there and a bar
    // that refuses to draw until the fourth vote lands shows nothing at all.
    // Promoted to the row's lead sentence those floors stop being cosmetic: three
    // votes split one-and-two are "Mixed" to the display read, and the same row's
    // own evidence line one line down says "3 votes on file — too thin to
    // characterise". A row must not contradict itself in two lines about the same
    // three votes, and of the two it is the characterisation that this line is
    // making — so the characterisation's floors are the ones that bind it. Below
    // them the lead still renders, still counts, still opens the acts, and says
    // "Too early to say" or "No clear pattern yet" instead of a direction.
    //
    // The executive lane keeps the display read, because it has no other: directions
    // there are not read by _stDirRaw at all, so _stPatternTier returns nothing and
    // the alternative to the display slot's own word is silence about instruments
    // that are on file and do take sides.
    var pat = null;
    try { pat = _stPatternTier(r); } catch (e) { pat = null; }
    var says = pat ? (pat.says || null) : (d.says || null);
    // EXCEPT AT n = 1, WHERE THERE IS NOTHING TO CONTRADICT. The paragraph above
    // binds this line to the characterisation floors because a lead saying "Mixed"
    // over an evidence line saying "3 votes on file — too thin to characterise" is
    // a row arguing with itself. One item cannot produce that argument: the lead
    // says which way the single item went, the evidence line says there is one of
    // it, and both are the same fact. So where the display read named a side off a
    // single judged item, the side is what this line leads with — still uncounted,
    // still uncharacterised, still `characterising: false`.
    if (pat && pat.tier === 'none' && d.directional && d.judged === 1 && d.says) says = d.says;
    return {
      d: d,
      word: says ? says.label : _ST_LEAD_ONFILE,
      tone: (says && says.tone) || d.tone || 'muted',
      characterising: !!(says && says.characterising)
    };
  }
  function _stLeadHtml(r, res, slot) {
    slot = slot || _stLeadSlot(r, res);
    if (!slot) return '';
    var d = slot.d;
    var tone = _ST_PAT_TONE[slot.tone] || _ST_PAT_TONE.muted;
    var frame = window._PDX_RD_SAYS_LEAD || 'The record indicates';
    // THE DIRECTION COUNTS, AND NOT THE INVENTORY. "8 advanced · 3 against" is the
    // judged subset and it is the only pair of numbers this line prints. The
    // inventory — how many formal items the row holds in total — is stated twice
    // already: in the evidence line under the row, and on the dossier door beside
    // it. A twice-stated number restated once more here bought nothing but a
    // collision, and it is the collision that decided this. The result
    // line one row down says "Not enough on file" when Direction Match could not
    // divide, and a lead reading "4 actions on file" directly above it makes the
    // row argue with itself over the same four words — while meaning two entirely
    // different things by them: the formal file is not thin, the said-versus-did
    // pairing is. Depth stays on the surfaces that already own it and the door
    // still opens the enumeration; this line stays the direction and its split.
    var say = frame + ': ' + slot.word + (d.counts ? ' — ' + d.counts : '') + '. ' +
      (d.note || '');
    var body =
      '<span class="pdxst-lead-lb" aria-hidden="true">🏛 ' + esc(frame) + '</span>' +
      '<span class="pdxst-lead-v" style="color:' + tone.c + '">' + esc(slot.word) + '</span>' +
      (d.counts ? '<span class="pdxst-lead-n">' + esc(d.counts) + '</span>' : '');
    // THE DOOR IS THE LINE. A signal a reader cannot check is a claim, so the whole
    // lead opens this issue's dossier on the Official Record enumeration — the same
    // (pid, issue) pair, the same origin hand-back, the same accessible name the
    // issue-name tap above it uses.
    if (r.pid && r.key) {
      return '<button type="button" class="pdxst-lead pdxst-lead-go' +
        (slot.characterising ? '' : ' pdxst-lead-open') + '"' +
        ' data-pdxst-says="' + escAttr((d.says && d.says.key) || 'onfile') + '"' +
        ' data-pdxst-dos="' + escAttr(r.key) + '" data-pdxst-pid="' + escAttr(r.pid) + '"' +
        ' data-pdxst-origin="' + escAttr(stanceRowId(r.pid, r.key)) + '"' +
        ' data-pdxst-focus="record"' +
        ' title="' + escAttr(say) + '" aria-label="' + escAttr(say + ' Open the acts behind it.') + '">' +
        body + '<span class="pdxst-lbl-go" aria-hidden="true">→</span></button>';
    }
    return '<div class="pdxst-lead" data-pdxst-says="' + escAttr((d.says && d.says.key) || 'onfile') + '"' +
      ' role="img" aria-label="' + escAttr(say) + '" title="' + escAttr(say) + '">' + body + '</div>';
  }

  // The result line: the number, what it is a percentage OF, and the outcome word.
  function _stResultHtml(r, res) {
    var n = _stNoun(r);
    // THE METRIC TEACHES ITSELF. "Direction match" is the row's central claim and
    // was, until now, a name with no definition anywhere in the product — the
    // reader had to already know that it means said-versus-did, on this issue
    // only, from the formal record only. The key follows the metric rather than
    // the lane chip, so a public-record row explains the public-record read and
    // never borrows the formal one's definition. With the education layer absent
    // LT() is plain escaped text, so this is exactly the old markup.
    //
    // The NAME PRINTED IS THE MODEL'S, not a restyling of it. `res.metric` is a
    // token other surfaces branch on and tests pin to the record that produced it,
    // so the line prints it verbatim — recapitalising it here would put a second
    // spelling of the product's central term into circulation for one line's look.
    var metricKey = (res.metric === 'Public-record match') ? 'publicmatch' : 'directionmatch';
    // WHICH RECORD IS TALKING. The row states both lanes, one under the other, so
    // each line names the record it came from — otherwise the reader is left to
    // infer the pairing from a metric name and a chip colour. The key follows the
    // basis rather than the surface: a row no formal instrument could test carries a
    // public-record result, and calling that line "Formal" would be a lie told in one
    // word.
    //
    // IT IS NOT THE OUTSIDE-THE-SCORE LANE'S NAME, THOUGH. Both keys on such a row
    // used to read "Public", on the reasoning that the same record was doing both
    // jobs. It is, and they are still two different claims: this line carries a
    // PERCENTAGE and the line below it carries COUNTS. The outside-the-score lane is
    // count-only on every surface, so its label may never sit over a figure — one
    // name doing both would teach a reader that the lane sometimes scores things.
    // So this line names the record, and the boundary tag beneath states the wall
    // that a percentage from this lane most needs said out loud.
    var pubDecided = (metricKey === 'publicmatch');
    var laneKey = pubDecided ? PUBDEC_LANE : FORMAL_LANE;
    var lane = '<span class="pdxst-lane">' + esc(laneKey) + '</span>';
    // "Not scored yet" / "Not tested yet" is the one label on this face that is
    // about OUR coverage rather than their conduct, and it is the one most easily
    // read as a dodge — a row holding eighteen sourced votes and printing no
    // number looks evasive until you can find out, in place, why. The icon stays
    // outside the control: it is decoration, not a word to define.
    if (res.state === 'untested') {
      var uLead = _stLeadHtml(r, res);
      return (uLead ? '<div class="pdxst-leadwrap">' + uLead + '</div>' : '') +
        '<div class="pdxst-result pdxst-r-untested' + (uLead ? ' pdxst-r-demoted' : '') + '">' + lane +
          '<span class="pdxst-vd pdxst-vd-none">' + esc(res.ico) + ' ' +
            LT('notscored', res.label) + '</span>' +
          _stWhyHtml(r, res, 'span') +
        '</div>';
    }
    var split = _stSplit(r);
    var scopeWord = (res.metric === 'Public-record match') ? 'public-record item' : n.one;
    // THE NO-SCORE TIPS SAY THE ISSUE OUT LOUD. The why line beneath the row can
    // lean on the heading directly above it and write "it"; the tooltip and the
    // aria-label cannot — a screen-reader user lands on this string with no
    // heading in earshot. So where the record-direction index produced a full
    // sentence (which names the issue), that sentence replaces the clipped clause
    // rather than joining it, and the count is stated once.
    var dirLead = (res.dir && res.dir.summary) ? res.dir.summary : '';
    var noStanceLead = (res.shape === 'no_stance' && dirLead)
      ? dirLead + ' No stated position from them yet, so this row isn’t scored — ' +
        'this is what the record itself did, not a stated stance.'
      : res.why;
    var unjudgedLead = (res.shape === 'unjudged' && dirLead)
      ? dirLead + ' None of it has been judged against their stated position, so this row isn’t scored.'
      : res.why;
    // Same construction for the partly-judged row: the index's sentence names the
    // issue and the direction, and the tail names the shortfall that keeps the
    // percentage empty — which is the judged subset, not the record.
    var partLead = (res.shape === 'part_judged' && dirLead)
      ? dirLead + ' Too little of it has been judged against their stated position to score this row.'
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
          // A row that holds a record AND a stated position, with nothing joining
          // them. The reason for the empty slot is the gap between the two, not a
          // shortage of record — saying "too thin to divide" over a one-way run of
          // nine would contradict the sentence immediately above it.
          : res.shape === 'unjudged'
          ? unjudgedLead + ' ' +
            'No percentage is shown, because none of this record has been judged against what they said — ' +
            'the count is what we hold on file, not a score.'
          : res.shape === 'part_judged'
          ? partLead + ' ' +
            'No percentage is shown, because too little of this record has been judged against what they said — ' +
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
          : res.shape === 'unjudged'
          ? 'No percentage — none of this record has been judged against what they said'
          : res.shape === 'part_judged'
          ? 'No percentage — too little of this record has been judged against what they said'
          : 'No percentage — not enough record') + '">—</span>';
    // THE SPLIT TRAVELS WITH ITS OWN NUMERATOR. The counts the percentage divides
    // used to open the line below it, one line above yet another line of counts from
    // the lane that is not in the score. Three stacked tallies, one of them scored,
    // is the blend this pass exists to end — so on a scored row the composition line
    // is a flex item of the formal line itself and reads `67% Mixed · 4 aligned ·
    // 2 against`. Everything left underneath belongs to something else. Same call,
    // same numbers, same `_stSplit` behind them: only the placement moved.
    var comp = (res.state === 'tested') ? _stCompHtml(r, res) : '';
    var inlineSplit = comp
      ? '<span class="pdxst-rsep" aria-hidden="true">·</span>' + comp
      : '';
    var tLead = _stLeadHtml(r, res);
    return (tLead ? '<div class="pdxst-leadwrap">' + tLead + '</div>' : '') +
      '<div class="pdxst-result pdxst-r-' + res.cls + (tLead ? ' pdxst-r-demoted' : '') +
        '" title="' + escAttr(tip) + '" aria-label="' + escAttr(tip) + '">' +
        lane +
        '<span class="pdxst-metric">' + LT(metricKey, res.metric) + '</span>' +
        '<span class="pdxst-scope">this issue</span>' +
        num +
        // A thin row's word is "Not scored yet", which needs the same definition
        // the untested branch gives it. A tested row's word is a verdict from the
        // ⚖️ Word vs Action bucket vocabulary and is left alone — it is taught
        // where those buckets are defined, and a second control here would put
        // three dotted words on one line.
        '<span class="pdxst-vd" style="color:' + res.color + '">' + esc(res.ico) + ' ' +
          (res.label === 'Not scored yet' ? LT('notscored', res.label) : esc(res.label)) + '</span>' +
        inlineSplit +
        // THE ONE PERCENTAGE ON THIS SURFACE THAT IS NOT DIRECTION MATCH SAYS SO.
        // A public-record row prints a figure under its own metric name, and a name
        // is a weaker wall than a marker: the tag is the same dashed, colourless
        // shape the outside-the-score lane wears everywhere else, so the boundary is
        // recognised before the label is read.
        (pubDecided ? '<span class="pdxst-pub-tag">' + esc(PUB_TAG) + '</span>' : '') +
      '</div>' +
      (res.state === 'thin' ? _stWhyHtml(r, res, 'div') : '');
  }
  // WHAT THE PERCENTAGE IS A PERCENTAGE OF. This began as "what mixed meant" and
  // printed only where the row carried visible tension — a split verdict,
  // counter-evidence the deciding lane set aside, a contested standing — on the
  // reasoning that a breakdown under a clean row is furniture. That reasoning was
  // wrong in one specific and expensive way, and the honesty passes that followed
  // it are what made the error visible.
  //
  // THE INVERSION. Rows that reached no result acquired rich arithmetic: an
  // unscored row states how many instruments it holds, a `limited` row states
  // which way the record ran, a split row states its composition. Meanwhile the
  // rows making the STRONGEST claim — a clean 100% with a verdict beside it —
  // printed a bare number and stopped. 1,013 of 1,194 scored rows were in that
  // state, 768 of them at 100%. So the reader was handed the most confident
  // figure on the surface with the least evidence about what stood behind it,
  // and a 100% resting on one judged vote was typographically identical to a
  // 100% resting on twenty.
  //
  // A percentage without its denominator is not a small omission on this
  // surface: it is the entire difference between "they voted this way once" and
  // "they voted this way every time it came up". The row now states both.
  //
  // WHAT DID NOT CHANGE. The counts come from _stSplit — the deciding lane's own
  // judged tallies, the same numbers the result line's tooltip has always
  // quoted — so this invents no arithmetic and cannot disagree with the score.
  // The percentage, the verdict token and the bucket are untouched; nothing here
  // reaches rowResult. A row where no lane judged anything directional still
  // prints nothing at all, because _stSplit returns null and there is no honest
  // composition to state. Unscored rows keep the old gate exactly: they print
  // this line only under tension, because on a row with no result a bare tally
  // has no percentage to be the denominator OF.
  // ONE LINE, TWO PLACES TO PUT IT. On a scored row this is a flex item of the
  // formal result line, so the split sits beside the number it divides; on an
  // unscored-but-tense row there is no number up there to sit beside and it stays a
  // line of its own. `opts.formalKey` prints the lane/metric/scope key the row face
  // carries in its own column, for the faces that have no such column.
  // HOW THIN, IN ONE PHRASE — and ONE definition of "thin" for every surface that
  // states it. The composition line prints this under the percentage; the door's
  // accessible name now repeats it, because a reader who HEARS "Backed up" and never
  // hears "one action" has been handed the confident half of a row whose other half
  // is on screen. Keyed on the JUDGED count, which is the denominator of the number
  // it qualifies — not on evidence depth, which the dossier keys its own longer
  // caveat on one level down.
  var _ST_THIN_AT = 2;
  function _stThinNote(r, res) {
    if (!r || !res || res.state !== 'tested' || !r.verdict) return null;
    var split = _stSplit(r);
    if (!split || !(split.judged > 0) || split.judged > _ST_THIN_AT) return null;
    // A Mixed row must not be told "the direction is real" — it is the one bucket
    // that declined to reach a direction. Same fork the dossier makes.
    return { judged: split.judged, note: (r.verdict.token === 'mixed')
      ? 'a split, not yet a pattern' : 'a direction, not yet a pattern' };
  }

  // TWO SCOPES, ONE ISSUE — and never only the flattering slice. The executive lane
  // leads with all_time (EXEC_SCOPE_DEFAULT) and that is the right headline: it is
  // the whole record. But where the CURRENT TERM reads a different shape from the
  // whole — one direction this term against a split across every term — a reader
  // shown only the headline has been shown one slice of a record that has two, and
  // which slice they got is an accident of the default. This returns the other
  // slice's word so the row can name it. It decides nothing: the percentage, the
  // verdict token and the bucket are all still the all-time read's.
  //
  // Reuses EXEC_TERM_SCOPES and PDXExecRecord.issue rather than inventing a scope,
  // so this cannot disagree with the Executive Enactment Record about what a term is.
  // Silent for a former officeholder — execServing() — because "this term" is last
  // term under a label that says otherwise, which is the same reason scopedRead()
  // declines for them.
  function _stExecScopeSplit(r) {
    try {
      if (!r || r.lane !== 'exec' || !r.pid || !r.key) return null;
      if (!execServing(r.pid)) return null;
      var E = window.PDXExecRecord;
      if (!E || typeof E.issue !== 'function') return null;
      var all = E.issue(r.pid, r.key, { allTerms: true });
      var cur = E.issue(r.pid, r.key, { allTerms: false });
      if (!all || !cur) return null;
      var curN = (cur.actions || []).length, allN = (all.actions || []).length;
      // A slice identical to the whole is not a second read of anything, and an
      // empty slice is a coverage fact the row already states elsewhere.
      if (!curN || !allN || curN >= allN) return null;
      if (all.token === cur.token) return null;
      var word = cur.verdict && cur.verdict.label;
      if (!word) return null;
      return { label: word, curN: curN, allN: allN,
               scope: (EXEC_TERM_SCOPES.current_term || {}).label || 'Current term' };
    } catch (e) { return null; }
  }

  // The depth clause an accessible name carries, or ''. Built from the two helpers
  // above so the door and the visible line cannot drift apart.
  function _stDoorDepth(r, res) {
    var out = [];
    var t = _stThinNote(r, res);
    if (t) {
      var n = _stNoun(r || {});
      out.push(t.judged + ' judged ' + (t.judged === 1 ? n.one : n.many) + ' — ' + t.note);
    }
    var f = _stExecScopeSplit(r);
    if (f) out.push('this term alone: ' + String(f.label).toLowerCase() +
      ' (' + f.curN + ' of ' + f.allN + ')');
    return out.join(' · ');
  }

  function _stCompHtml(r, res, opts) {
    if (res.state === 'untested') return '';
    var split = _stSplit(r);
    if (!split) return '';
    var st = _stStanding(r);
    var scopeSplit = _stExecScopeSplit(r);
    var aside = r.setAside;
    var tense = (r.verdict.token === 'mixed') || !!aside || !!st || !!scopeSplit;
    // A scored row always states its denominator; an unscored one only where it
    // carries tension worth naming. This is the widened condition, and the whole
    // of the change: everything below already worked, on 15% of the rows.
    if (!tense && res.state !== 'tested') return '';
    var n = _stNoun(r);
    var unit = (split.basis === 'public_record') ? 'public-record item' : n.one;
    var parts = [
      // The word "aligned" carries the definition for the whole line: it is the
      // first countable noun on it, and one entry ("Aligned · against") explains
      // both sides, so a second control on "against" would teach nothing new
      // while doubling the dotted words under the percentage. The digits stay
      // ordinary text — a number is not a term.
      '<span class="pdxst-comp-for"><b>' + split.aligned + '</b> ' + LT('depthcounts', 'aligned') + '</span>',
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
    // THIN, SAID ON THE FACE. A scored row resting on one or two judged items is
    // the case this whole pass exists for: the percentage is arithmetically
    // correct and reads as a pattern it has not earned. The dossier already made
    // exactly this caveat one level down ("The direction is real; a pattern is
    // not established at that depth"), keyed on evidence depth; the same sentence
    // is compressed here and keyed on the JUDGED count instead, because the
    // judged count is the denominator of the number it sits beneath. A Mixed row
    // gets the split wording rather than the direction wording, for the same
    // reason the dossier forks it: "the direction is real" is the one thing a
    // bucket that declined to reach a direction must not say.
    //
    // It is a qualifier on the counts, not a second verdict — no icon, no colour
    // of its own, and it never appears on an unscored row, which has no
    // percentage for depth to qualify.
    var thinR = _stThinNote(r, res);
    var thin = !!thinR;
    var thinNote = thinR ? thinR.note : '';
    if (thin) parts.push('<span class="pdxst-comp-thin">' + esc(thinNote) + '</span>');
    // THE OTHER SCOPE, WHERE IT READS DIFFERENTLY. Sits with the set-aside and
    // standing clauses because it is the same kind of fact: something true about
    // this record that the headline number does not carry. Never replaces the
    // headline — the all-time read still owns the percentage and the verdict.
    if (scopeSplit) parts.push('<span class="pdxst-comp-x">' + esc('this term alone: ' +
      String(scopeSplit.label).toLowerCase() + ' (' + scopeSplit.curN + ' of ' +
      scopeSplit.allN + ' actions)') + '</span>');
    // "0 ran against it" is arithmetic read aloud; "none ran against it" is the
    // same fact in the sentence a person would write. The clean rows this line
    // now reaches are overwhelmingly the zero case, so it is worth the branch.
    var tip = split.aligned + ' of ' + split.judged + ' judged ' +
      (split.judged === 1 ? unit : unit + 's') + ' pointed the same way as their stated position; ' +
      (split.against === 0 ? 'none ran against it.' : split.against + ' ran against it.') +
      (thin ? ' That is the whole of the record judged against this claim — ' + thinNote + '.' : '') +
      (aside && aside.count ? ' The lane that did not decide this row points the other way on ' +
        aside.count + ' item' + (aside.count === 1 ? '' : 's') + ' — disclosed, never blended into the verdict.' : '') +
      (st ? ' Standing is a separate question from direction: the verdict says which way they went, not whether it held.' : '') +
      (scopeSplit ? ' Across every term this reads ' + String(r.verdict.label || '').toLowerCase() +
        '; the ' + scopeSplit.curN + ' action' + (scopeSplit.curN === 1 ? '' : 's') +
        ' taken in the current term alone read ' + String(scopeSplit.label).toLowerCase() +
        '. The figure above is the all-time record.' : '');
    var key = '';
    if (opts && opts.formalKey) {
      // WHICH LANE THESE COUNTS BELONG TO, said before the counts. On a face with no
      // lane column, an unlabelled pair of tallies is exactly the thing a reader
      // blends with the receipt counts a line below — so the key names the lane, the
      // metric and the scope in the order the row face states them.
      var kLane = (res.metric === 'Public-record match') ? PUBDEC_LANE : FORMAL_LANE;
      key = '<span class="pdxst-comp-k">' + esc(kLane + ' · ' + res.metric + ' · this issue') + '</span>';
    }
    return '<div class="pdxst-comp" title="' + escAttr(tip) + '" aria-label="' + escAttr(tip) + '">' +
      key + parts.join('<span aria-hidden="true">·</span>') + '</div>';
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
    // TWO KINDS OF THING IN ONE GREY RUN. This line lists formal instruments, which
    // are inside the score, immediately beside public receipts, which never are, and
    // it listed them in identical type separated by an identical dot. On a stance row
    // that was survivable, because the outside-the-score line sits directly beneath
    // and carries the boundary in words. Inside the dossier's short version there is
    // no such line — this IS where the reader meets the receipt count — so the
    // receipt side takes the lane's own marker there. Gated on `cov` because `cov` is
    // exactly the signal that says which face is asking, and repeating the tag on a
    // row that already prints it one line down is noise, not a wall.
    var ots = '';
    if (r.evidence.public > 0) {
      var pubBit = r.evidence.public + ' public receipt' + (r.evidence.public === 1 ? '' : 's');
      if (cov) {
        ots = '<span class="pdxst-ev-ots">' + esc(pubBit) +
          '<span class="pdxst-ev-tag">' + esc(PUB_TAG) + '</span></span>';
      } else {
        bits.push(pubBit);
      }
    }
    if (!bits.length && !ots) return '';
    bits.push(r.evidence.strength + ' evidence');
    return '<div class="pdxst-ev">' + esc(bits.join(' · ')) +
      (ots ? '<span aria-hidden="true"> · </span>' + ots : '') + '</div>';
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
  // ── THE WORDS, IN ONE PLACE, CHOSEN FOR THE QUESTION A READER ACTUALLY ASKS ──
  // "Public" was this lane's label for as long as the lane has existed, and it is
  // the wrong word in the one position it occupies: one line under a percentage.
  // It names a SOURCE — the public record — while the question a reader has at that
  // moment is a STATUS: is this in the number above it, or not? A one-word source
  // label answers a question nobody asked, and beside "67% · 4 aligned · 2 against"
  // a second line of counts reads as the other side of a comparison.
  //
  // So the lane is now named by what it is TO THE SCORE first, and by what it is
  // made of second. Both halves ship: a reader told only that something is outside
  // the score has been handed a boundary with no subject, and "Outside the score"
  // alone invites the guess that it is a leftovers bin rather than sourced evidence.
  //   OTS_LANE is the status. OTS_SUB is the subject. PUB_TAG is the explicit
  // machine-checkable marker, unchanged, and it is still printed on every single row
  // rather than once per surface, because any row can be arrived at from a deep link.
  var FORMAL_LANE = 'Formal';
  // …and the key on the one kind of result line the formal record did not produce.
  // It carries a percentage, so it may not wear the outside-the-score lane's name:
  // that lane is count-only everywhere, without exception, and a label that appears
  // over a figure on one row and over tallies on the next is not a wall. This says
  // which record decided the row, and the row's own boundary tag says the rest.
  var PUBDEC_LANE = 'Public record';
  var OTS_LANE  = 'Outside the score';
  var OTS_SUB   = 'statements & coverage';
  var OTS_FULL  = OTS_LANE + ' · ' + OTS_SUB;
  var PUB_EMPTY = 'Nothing on file yet';
  var PUB_TAG   = 'Not in Direction Match';
  var PUB_NOTE  = 'Outside the score. The reported record is a separate test of the same stance — sourced items, ' +
                  'statements and coverage. It is counted, never rated, and never counted in Direction Match.';
  // The one case where the public lane DID decide the row: no formal instrument
  // could test the stance at all. Even then it is outside the profile figure, and
  // saying so is the difference between "this is the result" and "this is the score".
  var PUB_NOTE_DECIDED = 'Outside the score. No formal instrument could test this stance, so the reported record ' +
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
  // The directions, in words, in one place. Both the per-row line and the
  // profile-wide glance print these clauses, and a second copy of them is how a
  // header and the rows under it start describing the same feed differently.
  //
  // Tension first. A reader scanning a column of these is looking for the rows
  // where the public record disagrees, and putting the agreements first buries
  // exactly the thing this line was added to surface.
  function _pubBits(count, against, backs, flags) {
    if (!count) return [PUB_EMPTY];
    var bits = [against + (against === 1 ? ' cuts against' : ' cut against'),
                backs + (backs === 1 ? ' backs it up' : ' back it up')];
    if (flags) bits.push(flags + ' red flag' + (flags === 1 ? '' : 's'));
    return bits;
  }
  function publicTally(r) {
    var p = (r && r.public) || {};
    var against = p.contradicting || 0, backs = p.supporting || 0, flags = p.flags || 0;
    var count = p.count || 0;
    var decided = !!(r && r.verdict && r.verdict.basis === 'public_record');
    var bits = _pubBits(count, against, backs, flags);
    var t = {
      lane: OTS_LANE, laneSub: OTS_SUB, laneFull: OTS_FULL,
      count: count, against: against, backs: backs, flags: flags,
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
  // The same lane, summed across a profile rather than read off one row — the
  // glance version of the line every row already prints. It exists because the
  // letterhead needed one, and a surface up there deriving its own public numbers
  // is exactly how two counts of the same feed start disagreeing: this walks
  // publicTally(), which is the one place the directions are named and counted.
  //
  // COUNTS, AND NEVER ANYTHING ELSE. No percentage, no ratio, no verdict, and it
  // carries PUB_TAG out with the numbers so no caller has to remember to say that
  // none of this is in Direction Match. `directional` is what a caller should gate
  // on: a profile with items on file but nothing pointing either way has no shape
  // to show, and four zeroes under a letterhead read as findings.
  function publicShape(pid, rows) {
    var list = rows || issueRows(pid) || [];
    var out = { issues: 0, total: list.length, count: 0, against: 0, backs: 0,
                flags: 0, directional: 0, tag: PUB_TAG, note: PUB_NOTE, lane: OTS_LANE };
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (!r || !r.public) continue;
      var t = publicTally(r);
      if (t.empty) continue;
      out.issues++;
      out.count += t.count;
      out.against += t.against;
      out.backs += t.backs;
      out.flags += t.flags;
    }
    out.directional = out.against + out.backs;
    out.text = _pubBits(out.count, out.against, out.backs, out.flags).join(' \u00b7 ');
    return out;
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
        '<span class="pdxst-pub-sub">' + esc('· ' + t.laneSub) + '</span>' +
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
            ' aria-label="' + escAttr(_dosDoorLabel(r.label, res.bucket, r.stance.label,
              _stDoorDepth(r, res))) + '">' +
            _icDot(skin) + esc(r.label) +
            '<span class="pdxst-lbl-go" aria-hidden="true">›</span>' +
          '</button>' +
          // BOTH FACTS, IN READING ORDER: what the record did, then what they say.
          // The chip goes FIRST because it is the one a row can always have —
          // 'Says:' is present only where we hold a stated position, and a reader
          // scanning fifteen rows should meet the same column of chips on every one
          // of them. Neither replaces the other and neither is derived from the
          // other; where both are present and they disagree, that disagreement is
          // the point and it is visible on the row's first line.
          //
          // ONE VOICE PER ROW FOR THE RECORD, THOUGH. Where the record LEAD renders
          // below — an unscored row holding formal acts — the chip and the lead are
          // the same finding in two vocabularies, read from the same index one after
          // the other: "🏛 Record · Strongly supports · 12 advanced · 0 against" and
          // then "The record indicates: Supports — 12 advanced · 0 against". A row
          // that states its one fact twice teaches a reader that one of the two is
          // decoration, and they are not wrong. The lead wins that tie because it is
          // the promoted line, it carries the frame that keeps this layer from
          // reading as a stated position, and it is the door into the acts. The chip
          // stays everywhere the lead stands down — on scored rows, where the score
          // leads and the chip is the record's only voice, and on rows with nothing
          // formal on file, where neither prints anything.
          (_stLeadSlot(r, res) ? '' : _stPatternHtml(r)) +
          (r.stance.label ? _orStanceChip(r.pid, r.key) : '') +
        '</div>' +
        _stResultHtml(r, res) +
        // THE COMPOSITION LINE, WHERE IT STILL HAS TO BE ITS OWN LINE. On a scored
        // row `_stResultHtml` has already placed it beside the percentage it
        // divides, so printing it again here would state one denominator twice. An
        // unscored-but-tense row has no percentage up there to sit beside, so its
        // set-aside and standing counts keep the line they always had.
        (res.state === 'tested' ? '' : _stCompHtml(r, res)) +
        // BOTH LANES, ONE GLANCE. The formal result above, the outside-the-score
        // tally here — always, including when there is nothing on file, because an
        // absent line and an empty lane are indistinguishable and only one of them
        // is true.
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
    // Grouped, not re-ranked: every row keeps the place the shared ranking gave it,
    // and the only group whose internal order changes is `held` — see _stHeldOrder.
    var byGrp = {}, resBy = {};
    ranked.forEach(function (r) {
      var res = _stResult(r);
      resBy[r.key] = res;
      var id = _stGrpId(r, res);
      (byGrp[id] = byGrp[id] || []).push(r);
    });
    var resOf = function (r) { return resBy[r.key]; };
    if (byGrp.held) byGrp.held = _stHeldOrder(byGrp.held, resOf);
    var live = _ST_GRP.filter(function (g) { return (byGrp[g.id] || []).length; });
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
      // the place it got one before, and no row moves to make it true. The same
      // goes for `unjudged` — a held record and a stated position that were never
      // tested against each other is not a thin row either.
      //
      // THE `held` GROUP DRAWS NO DIVIDER, because its heading already is one: every
      // row under it is that shape, and a divider repeating the heading is furniture.
      // The divider stays for the rest of tier 1, where the populations still mix.
      var lastSub = null;
      (byGrp[g.id] || []).forEach(function (r) {
        var html = _stRowHtml(r);
        if (g.id !== 'held' && r.verdict && r.verdict.token === 'limited') {
          var shp = resOf(r).shape;
          var sub = (shp === 'no_stance')
            ? 'On the record — nothing stated to test it against'
            : (shp === 'unjudged')
            ? 'Stated and on the record — not yet judged against each other'
            : (shp === 'part_judged')
            ? 'On the record — only part of it judged against what they said'
            : 'Too thin to judge yet';
          if (sub !== lastSub) {
            lastSub = sub;
            html = '<div class="pdxst-sub">' + esc(sub) + '</div>' + html;
          }
        }
        rows.push(html);
      });
      var body = rows.join('');
      // A LEAD IS A LEAD, NOT A LIST. The open groups are tension first, then the
      // issues the record backs up, then the formal record nothing was stated for,
      // and on a densely-seeded figure the later ones grow without bound: wave 4 of
      // the executive record took the president's tested tier to eighteen rows, and
      // nineteen open rows is the wall this layer exists to replace. So an open group
      // shows its first few and folds the remainder behind the same lid the closed
      // groups already use — the rows are one tap away, and the group header still
      // counts all of them, so nothing is hidden about how much there is. Every open
      // group is capped except tension: that one is the reason to read the section.
      //
      // AND THE LABEL NAMES ITS OWN GROUP. "Show 52 more issues the record backs up"
      // over a fold holding rows nothing was tested on is the same false heading this
      // pass split the tier to remove, so the sentence comes off the group.
      if (cap && rows.length > cap + 1) {
        var over = rows.length - cap;
        body = rows.slice(0, cap).join('') +
          '<!--PDXSP:lid id="st-open-' + g.id + '" label="Show ' + over +
          ' more issue' + (over === 1 ? '' : 's') + ' ' + (g.fold || 'in this group') + '" defer-->' +
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
      return blockOf(g, g.id === 'tension' ? 0 : _ST_LEAD_CAP);
    }).join('');
    var restGrps = live.filter(function (g) { return !_stOpen(g); });
    var rest = '';
    if (restGrps.length) {
      var restN = restGrps.reduce(function (n, g) { return n + ((byGrp[g.id] || []).length); }, 0);
      rest = '<!--PDXSP:lid id="st-rest" label="Show ' + restN + ' more position' + (restN === 1 ? '' : 's') +
        ' with nothing to test them yet" defer-->' +
        restGrps.map(function (g) { return blockOf(g, 0); }).join('') + '<!--PDXSP:/lid-->';
    }
    // COVERAGE, IN TWO NUMBERS, BECAUSE IT WAS ALWAYS TWO FACTS. This line used to
    // read "2 of 30 tracked positions have a formal or public record behind them",
    // which on a member with a deep ledger is not a caveat — it is false. Massie
    // has formal acts on twenty-eight of the issues that sentence excluded; what
    // those rows lack is a STATED position to test them against, which is a fact
    // about what they have stated, not about the record. Conflating the two is the
    // exact shape of the problem this pass exists to fix: a reader who trusts that
    // sentence concludes there is nothing on file, closes the section, and never
    // reaches the ledger sitting one line below it.
    //
    // So the line now states them separately and puts the record first: how many
    // issues have formal acts on file, then how many of those Direction Match was
    // able to score. Both are read from the published profileCounts rather than
    // recomputed here, so the section cannot disagree with the atlas about the
    // same person. Neither number is new, neither is a percentage, and no row's
    // placement, tier or verdict moves because of this.
    var _pc = null;
    try { _pc = profileCounts(pid) || null; } catch (e) { _pc = null; }
    var onFile = _pc ? _pc.onRecord : 0;
    // THE SECOND NUMBER IS THE ONE A READER CAN COUNT. `tested` above is the size
    // of the two said-plus-did GROUPS, which includes rows the action lane reached
    // but Direction Match could not divide — eleven of Massie's seventeen, printing
    // an em dash where the percentage would be. A reader who counts percentages
    // down the section and gets a different answer than the line at the top of it
    // has caught the page in an inconsistency, so the line counts what they count:
    // rows carrying an actual result, read off the row model's own `tested` flag,
    // which is the same flag the row uses to decide whether to print one.
    var hasScore = 0;
    ranked.forEach(function (r) { if (r && r.tested) hasScore++; });
    // AND IT DOES NOT COUNT A LANE THAT HAS NOT LANDED. The roll-call fetch settles
    // after first paint, and "1 of 14 have formal acts on file" printed over
    // thirteen rows still saying "Loading the record…" is a false negative with a
    // number attached to it — worse than the vague sentence it replaced. While the
    // lane is outstanding the line says so and states nothing it cannot yet stand
    // behind. profileCounts already refuses to cache a warming read, so the first
    // render after the votes arrive prints the real figures.
    var cov = _pc && _pc.warming
      ? '<div class="pdxcov">🏛 Still reading the formal record for this profile — the counts below ' +
        'fill in as it lands.</div>'
      : '<div class="pdxcov">🏛 <b>' + onFile + '</b> of <b>' + ranked.length + '</b> tracked issue' +
        (ranked.length === 1 ? '' : 's') + ' ' + (onFile === 1 ? 'has' : 'have') + ' formal acts on file' +
        ' · <b>' + hasScore + '</b> ' + (hasScore === 1 ? 'carries' : 'carry') +
        ' a Direction Match score.' +
        (onFile > hasScore
          ? ' <span class="pdxcov-sub">The rest still show what the record did — either nothing ' +
            'was stated to test it against, or the record on it could not be divided into a ' +
            'score.</span>'
          : '') +
        '</div>';
    // THE WALL, IN FULL, ONCE. Every row carries the short form of this ("Not in
    // Direction Match") because a reader can land on any single row from a deep link
    // and must not have to scroll for the caveat. The whole sentence is stated here,
    // where it is read once instead of thirty-five times, together with how much
    // public record this profile actually has — a count is the honest way to say
    // "this lane exists and is uneven" without implying it is a score.
    var pc = publicCoverage(pid, ranked);
    var wall = '<div class="pdxst-wall"><b>' + esc(OTS_FULL) + ' · ' + pc.issues + ' of ' + pc.total +
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

  // ═══════════════════════════════════════════════════════════════════════════
  // THE FULL FORMAL-PATTERN ISSUE INDEX
  // ═══════════════════════════════════════════════════════════════════════════
  // WHAT IT IS. One list of EVERY issue this politician's formal record touched,
  // each row carrying the pattern chip the row faces already carry. Nothing here
  // is new information: it is _stInner's row model, filtered to the formal lane,
  // rendered flat and sorted by how much the record actually said.
  //
  // WHY IT EXISTS. "Full Stance Record" was built from documented stance cards,
  // the evidence map and the receipt-depth index — three curated sources — so on
  // Schumer it opened at seven issues while the formal record ran to sixty-four.
  // A surface promising "every issue" that lists the seven somebody wrote a card
  // for is not a record of what they did; it is a record of what we have written
  // down. This is the other list, and it is the longer one.
  //
  // WHAT A ROW IS. An issue with SOMETHING FORMAL ON FILE: a pattern the index
  // could read, or formal instruments held with no pattern read yet. Nothing
  // else qualifies — a stated position with no formal record is not a formal
  // record, and it stays on the curated list where it belongs. That is the
  // fail-closed direction: an issue with no formal signal does not appear here at
  // all rather than appearing with an empty pattern.
  //
  // WHAT IT IS NOT. Not a score, and not an input to one: every row reads
  // _stPatternTier(), which reads the record-direction index, which no scoring
  // path consults. Nothing here writes to a position map, so a pattern read on
  // this surface can never become a stated stance. Not the public lane: the rows
  // are built from formal held counts and the formal pattern only, and a media
  // receipt cannot put an issue on this list or move a chip on it. And no party
  // framing anywhere — the only subject of every sentence here is this one
  // person's own record.
  var _FPI_RANK = { strong: 0, mostly: 1, split: 2, thin: 3, none: 4 };
  // Where a row the pattern engine has no verb for sorts. Below "No clear pattern
  // yet" on purpose: that tier is a statement about a record we DID read, and this
  // one is an admission we have not read it yet — the weaker of the two claims goes
  // last so the top of the list stays the part that says something.
  var _FPI_UNREAD_RANK = 5;
  // The one sentence that keeps this list out of the score, printed once at the
  // foot of the index rather than on sixty-four rows.
  var _FPI_WALL = 'Every issue here is drawn from the formal record only — roll-call votes and ' +
    'formal actions on file. A pattern is what that record did; it is never treated as a ' +
    'stated position, and none of it enters Direction Match.';
  // ── ONE INDEX, MORE THAN ONE MOUNT ──────────────────────────────────────────
  // The index now renders in two places on one politician: the profile face (the
  // discovery surface) and the full-record overlay above it (the expanded view).
  // Both can be in the DOM at the same time, so two things that used to be global
  // are keyed on the mount instead:
  //
  //   · ROW IDS. Two elements cannot share one id, and the row id is what
  //     `data-pdxst-origin` uses to send a reader back to the row they tapped. An
  //     unkeyed id would have sent every overlay tap back to the face's copy of
  //     the row, underneath the overlay.
  //   · THE REMEMBERED FILTER. Filtering the overlay to "Pattern only" must not
  //     silently re-filter the face behind it, and vice versa.
  //
  // The default mount keeps the exact id shape it had, so nothing that already
  // addresses these rows has to learn a new one.
  function _fpiMount(v) { var s = _stSlug(v || ''); return s || 'default'; }
  function _fpiRowId(mount, pid, key) {
    var m = _fpiMount(mount);
    return 'pdxfpi-row-' + (m === 'default' ? '' : m + '-') + _stSlug(pid) + '-' + _stSlug(key);
  }

  // ── A RUN THAT ALL WENT ONE WAY ─────────────────────────────────────────────
  // WHAT IT IS. The index's answer for a row the characterisation engine refused
  // where every judged item on file went the SAME way. _recordPatternTier refuses
  // those rows — correctly, for the question IT is asking, which is "may this
  // record be characterised" — and the refusal arrives as tier `none`, tone
  // `muted`, label "No clear pattern yet". Printed over mapped roll calls that all
  // went one way, that sentence is false in the only direction that matters: the
  // reader is told there is nothing to read next to a count saying there is
  // something, and the something has an answer on it.
  //
  // SO THE CASE IS SPLIT, and split is all it is. One side on the ledger → the
  // thin directional read. Two sides, or none → the row keeps every word it had.
  // The read handed back is _recordDisplayTier's, which already exists for exactly
  // this reason and already carries the rules that must not move:
  //   · AN ISSUE WITH NO POLE IS STILL SILENT. _RD_TIER_MUTE returns null there,
  //     at any depth, because "advanced it" is meaningless without a curated
  //     proposition to advance.
  //   · AN INCIDENTAL MAPPING IS STILL A COINCIDENCE. Below _RD_MIN_PRIMARY the
  //     display read returns null too — an omnibus that brushed this issue is not
  //     a vote on it, and five of them are not a vote on it either.
  //   · A RECORD THAT RAN BOTH WAYS IS NEVER GIVEN A LEAD. The display read words
  //     those as `split`, `directional: false`, and the guard below drops them —
  //     so no knife-edge acquires a side through this door.
  //   · AND IT NEVER PROMOTES. `d.tier !== 'thin'` is asserted rather than
  //     assumed: whatever arrives here is a row the characterisation engine
  //     declined, and the only tier it may re-enter the index at is the quiet one.
  // What IS lowered, and only here, is depth: the member coverage floor and the
  // two-item run floor, both of which are floors about SIZE.
  //
  // WHY IT IS NOT CAPPED AT ONE ITEM, which is where it started. The cap was the
  // bug. Below the member coverage floor a single mapped vote read as "Thin
  // supports · 1 vote advanced" and scored the issue, while TWO votes the same way
  // fell back to "No clear pattern yet" and were dropped from the match outright —
  // so a second act agreeing with the first deleted the signal the first one
  // earned. Any cap re-creates that cliff one item further along, so there is no
  // cap: below the floor, `_recordDisplayTier` already marks every one of these
  // `partial: true` and holds them at `thin` however one-sided the arithmetic
  // looks, which is the honest handling and was always the intent.
  //   THE INVARIANT THIS RESTORES: adding one act in a row's already-leading
  // direction may never lower its tier, its confidence, or its inclusion in the
  // match. test-clarity-before-depth.mjs asserts it across n = 1…6.
  //
  // The legislative lane only: _stDirRaw declines on exec by design and the
  // scoring path depends on that refusal, so the exec lane keeps its own slice
  // rather than being annexed by this one.
  function _stThinDirRead(r) {
    if (!r || r.lane === 'exec') return null;
    if (typeof window._recordDisplayTier !== 'function') return null;
    var idx;
    try { idx = _stDirRaw(r); } catch (e) { return null; }
    if (!idx || (idx.judged || 0) < 1) return null;
    // Uniform, read off the act counts the reader can count for themselves — the
    // same ledger-first rule the index itself uses. Nothing mixed comes through.
    if ((idx.advances || 0) > 0 && (idx.opposes || 0) > 0) return null;
    var d;
    try { d = window._recordDisplayTier(idx, { noun: _stNoun(r) }) || null; } catch (e) { return null; }
    if (!d || !d.directional || d.tier !== 'thin') return null;
    return d;
  }

  // ── THE ROWS ────────────────────────────────────────────────────────────────
  // Pure. Reads the shared row model and the shared pattern engine and derives
  // nothing of its own: `tier`, `tone`, `weight`, `label` and `counts` all arrive
  // from _recordPatternTier, `held` is the row's own formal inventory, and `said`
  // is the row's own stated-position flag. The sort is the only decision made here.
  function _fpiRows(pid, opts) {
    opts = opts || {};
    var out = [];
    (issueRows(pid) || []).forEach(function (r) {
      if (!r || !r.key) return;
      var res = _stResult(r);
      var held = res.held || 0;
      var t = _stPatternTier(r);
      // THE UNIFORM-RUN SPLIT. Where the characterisation read declined and every
      // judged item on the row went the same way, the index carries that side
      // rather than the refusal — see _stThinDirRead above for the walls this does
      // not lower. `single` still means exactly one judged item, so a surface can
      // say "one item, not a pattern" in its own words; a two- or three-item run
      // through the same door is a run and is not marked as one item.
      var single = false;
      if (!t || t.tier === 'none') {
        var one = _stThinDirRead(r);
        if (one) { t = one; single = (one.judged || 0) === 1; }
      }
      // A REFUSAL IS NOT A READ. The characterisation engine's `none` tier is a
      // refusal wearing a chip: tone `muted`, no side, and the words "No clear
      // pattern yet" over a ledger whose reason for being unreadable is knowable
      // and specific. Every row that reaches here as `none` has already been
      // offered the thin door above and declined by it, so what is left is genuinely
      // unread — and it says WHY, in _fpiUnreadWhy's own vocabulary, through the
      // same grey chip the other refusals use.
      //   This also makes `read` mean what it says. It was `!!t`, and the `none`
      // tier is a truthy object, so unreadable rows reported `read: true` and were
      // kept out of the match only because tone `muted` has no entry in the side
      // table — fail-closed by a missing key rather than by the flag that names the
      // condition. Now the flag carries it.
      var refused = !!(t && t.tier === 'none');
      if (refused) t = null;
      // FAIL CLOSED. No pattern and nothing formal on file means no formal signal,
      // and an issue with no formal signal is not part of the formal record index.
      if (!t && !refused && held <= 0) return;
      var why = t ? null : _fpiUnreadWhy(r);
      out.push({
        pid: r.pid, key: r.key, label: r.label,
        tier: t ? t.tier : 'unread',
        weight: t ? t.weight : 'flat',
        tone: t ? t.tone : 'muted',
        patLabel: t ? t.label : why.lb,
        why: why,
        counts: t ? t.counts : '',
        judged: t ? t.judged : 0,
        directional: !!(t && t.directional),
        read: !!t,
        single: single,
        held: held,
        noun: _stNoun(r),
        said: _stSaid(r),
        stance: (r.stance && r.stance.label) ? r.stance.label : '',
        pat: t,
        row: r,
        rank: t ? (_FPI_RANK.hasOwnProperty(t.tier) ? _FPI_RANK[t.tier] : _FPI_RANK.none)
                : _FPI_UNREAD_RANK
      });
    });
    // STRONGEST FIRST, THINNEST LAST — the index's confidence ladder, which is the
    // pattern engine's own and not a second opinion about it. Inside a tier the
    // deeper record leads (more judged items, then more instruments on file), and
    // the label breaks the last tie so two renders never disagree about the order.
    //
    // A–Z is offered because a reader who came for one issue should not have to
    // know how one-sided its record was to find it.
    if (opts.sort === 'az') {
      out.sort(function (a, b) {
        return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
      });
    } else {
      out.sort(function (a, b) {
        if (a.rank !== b.rank) return a.rank - b.rank;
        if (a.judged !== b.judged) return b.judged - a.judged;
        if (a.held !== b.held) return b.held - a.held;
        return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
      });
    }
    return out;
  }

  // ── 🏛 THE SHAPE OF THE RECORD, IN FOUR FACTS ───────────────────────────────
  // The index above is the LIST. This is its summary, and it exists because a
  // surface that has room for four lines cannot mount sixty rows — the profile
  // hero, specifically, which used to lead a member with a wide roll-call record
  // and no stance ledger with "— Monitoring".
  //
  // IT IS A SUMMARY, NOT A SECOND READING. Every field is a count or a slice of
  // _fpiRows() — the same rows, in the same strongest-first order the atlas below
  // renders them in, carrying the same chip from the same _stPatternHtml(). There
  // is no mean of issue leans here, no rollup of tiers into a figure, and no
  // ranking of this member against any other. Four buckets and their sizes:
  //
  //   tops    the strongest characterised patterns (strong / mostly)
  //   splits  issues where the record ran both ways
  //   thin    inventory the engine refused to characterise — the honesty valve,
  //           counted out loud rather than dropped
  //   depth   how much record all of that was read from
  //
  // WHY THERE IS NO PERCENTAGE IN IT. Anything of the form "18 of 24 issues are
  // one-sided" is a number between 0 and 100 attached to a person's name, which
  // is the definition of the second score this product retired. The bucket sizes
  // are published; the division is not, here or anywhere downstream.
  //
  // AND WHY THERE IS NO "N OF M ISSUE KEYS" COVERAGE FIGURE EITHER. It was on the
  // table and it is deliberately not here. The denominator would be every key in
  // ISSUE_MAP — including the balance keys the pattern engine is *required* to
  // refuse — so the honest reading of "20 of 118" is a fact about how much of the
  // map has roll-call traffic, and the reading a person actually takes off a
  // profile is that this official covers a sixth of the issues. That is the exact
  // silence-means-absence framing this whole migration exists to undo, and no
  // wording of the line survives being read fast.
  var _FPI_TOPS_CAP = 4;
  var _FPI_SPLITS_CAP = 3;
  var _FPI_CHARACTERISED = { strong: 1, mostly: 1 };
  // One row, flattened for a caller that wants to print it and nothing else. The
  // chip is the atlas's own chip, rendered here rather than described, so the
  // summary and the list cannot drift into two vocabularies for one tier.
  function _fpiShapeRow(x) {
    return {
      key: x.key, label: x.label, tier: x.tier, tone: x.tone,
      patLabel: x.patLabel, counts: x.counts, judged: x.judged,
      said: !!x.said, chip: _stPatternHtml(x.row, x.pat)
    };
  }
  function _fpiShape(pid) {
    try {
      if (!pid) return null;
      ensureStyles();
      var rows = _fpiRows(pid, { sort: 'strength' }) || [];
      var out = {
        issues: rows.length, read: 0, judged: 0,
        characterised: 0, strongN: 0, splitN: 0, thinN: 0,
        tops: [], splits: []
      };
      var tops = [], splits = [];
      rows.forEach(function (x) {
        if (x.read) out.read++;
        out.judged += (x.judged || 0);
        if (_FPI_CHARACTERISED[x.tier]) { out.strongN++; tops.push(x); }
        else if (x.tier === 'split') { out.splitN++; splits.push(x); }
        else out.thinN++;
      });
      out.characterised = out.strongN + out.splitN;
      out.tops = tops.slice(0, _FPI_TOPS_CAP).map(_fpiShapeRow);
      out.splits = splits.slice(0, _FPI_SPLITS_CAP).map(_fpiShapeRow);
      return out;
    } catch (e) { return null; }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 🏛 THE STANDOUT STRIP — WHAT THE RECORD POINTS TO, IN FOUR CHIPS
  // ══════════════════════════════════════════════════════════════════════════
  // WHAT IT IS. Up to two issues where this politician's formal record ran one way
  // and up to two where it ran both ways, at the top of the profile, each chip a
  // door into that issue's dossier. It answers the question a reader actually
  // arrives with — what does their record point to — before the page asks whether
  // anybody wrote down what they said about it.
  //
  // WHY IT EXISTS. The profile's first substantive surface was Word vs Action, a
  // metric that needs a stated position on file to run. On a member with a deep
  // roll-call ledger and a thin stance ledger it prints "Not scored yet", and the
  // whole page reads as though there were nothing to see. The formal record was
  // always there; it was just three sections down. This is that record, promoted.
  //
  // IT SELECTS; IT DOES NOT DERIVE. Every chip is one row of _fpiRows(), carrying
  // that row's own tier, its own counts and its own chip markup. The only decision
  // made here is WHICH rows, and that decision is two sorts and one floor:
  //
  //   consistent  tier strong or mostly — the pattern engine's own characterised
  //               set. Strong before mostly, then the deeper record, then the label.
  //   mixed       tier split. Ranked by the size of the SMALLER side first, because
  //               that is what makes a split a real conflict rather than a rounding
  //               error: nine-to-eight is a tension, ten-to-one is not a split at
  //               all and the engine would not have called it one.
  //
  // THE FLOOR IS BORROWED, NEVER INVENTED. `_PDX_RD_MIN_JUDGED` is the number of
  // judged acts the pattern engine already requires before it will characterise a
  // record at all, and it is the same bar here. Publishing a second, higher floor
  // would be this surface quietly disagreeing with the chip it renders.
  //
  // FAIL CLOSED, AND NO FILLER. A bucket with no qualifying row prints nothing —
  // not a placeholder, not the next-best issue, not a thin row dressed as a
  // finding. Both buckets empty and the strip does not mount. A profile with a
  // shallow formal record therefore sees the page it always saw, rather than a
  // headline made out of one vote.
  //
  // WHAT IT IS NOT. No percentage and nothing ordinal — there is no "consistency
  // score" here and no ranking of this person against another. No party framing:
  // the subject of every string is one person's own record. No stance: the frame
  // word is the engine's published "The record indicates", these labels are never
  // written to a position map, and Direction Match neither reads this nor is read
  // by it.
  var _SO_CAP = 2;
  // …AND A FLOOR ON THE SET IT SELECTS FROM, not just on each issue in it. Every
  // chip already has to clear _soMinJudged() acts before it can be characterised
  // at all, which is the depth rule. This is the other rule: "most one-sided" and
  // "most conflicted" are superlatives, and a superlative over a set of one or two
  // is not a finding — it is the whole record wearing the word "most". A profile
  // with two readable issues has an Official Record; it does not have standouts,
  // and the atlas below says everything the strip would have said. Three is the
  // smallest set where picking two leaves something unpicked.
  var _SO_MIN_ISSUES = 3;
  var _SO_CHARACTERISED = _FPI_CHARACTERISED;
  function _soMinJudged() {
    var n = window._PDX_RD_MIN_JUDGED;
    return (typeof n === 'number' && n > 0) ? n : 4;
  }
  // The smaller of the two sides, which is the whole measure of how split a split
  // is. Read off the tier the row already carries; zero when the tier did not
  // count sides, which sorts such a row last rather than first.
  function _soMinority(x) {
    var t = x && x.pat;
    if (!t) return 0;
    var a = t.advances || 0, o = t.opposes || 0;
    return Math.min(a, o);
  }
  function _soPick(pid) {
    var out = { consistent: [], mixed: [], consistentN: 0, mixedN: 0,
                issues: 0, judged: 0, cap: _SO_CAP, floor: _soMinJudged(),
                minIssues: _SO_MIN_ISSUES, enough: false };
    var rows;
    try { rows = _fpiRows(pid, { sort: 'strength' }) || []; } catch (e) { return out; }
    var floor = out.floor;
    var cons = [], mixed = [];
    rows.forEach(function (x) {
      if (!x || !x.read) return;
      out.issues++;
      out.judged += (x.judged || 0);
      if ((x.judged || 0) < floor) return;
      if (_SO_CHARACTERISED[x.tier] && x.directional) cons.push(x);
      else if (x.tier === 'split') mixed.push(x);
    });
    cons.sort(function (a, b) {
      var ar = (a.tier === 'strong') ? 0 : 1, br = (b.tier === 'strong') ? 0 : 1;
      if (ar !== br) return ar - br;
      if (a.judged !== b.judged) return b.judged - a.judged;
      if (a.held !== b.held) return b.held - a.held;
      return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
    });
    mixed.sort(function (a, b) {
      var am = _soMinority(a), bm = _soMinority(b);
      if (am !== bm) return bm - am;
      if (a.judged !== b.judged) return b.judged - a.judged;
      if (a.held !== b.held) return b.held - a.held;
      return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
    });
    out.consistentN = cons.length;
    out.mixedN = mixed.length;
    // The set floor, applied last so the caller can still see what WAS found and
    // why it was withheld. `enough` is the published reason the strip is empty on
    // a profile that plainly has a record: not "we found nothing", but "we found
    // too little to call any of it a standout".
    out.enough = out.issues >= _SO_MIN_ISSUES;
    out.minIssues = _SO_MIN_ISSUES;
    if (!out.enough) return out;
    out.consistent = cons.slice(0, _SO_CAP);
    out.mixed = mixed.slice(0, _SO_CAP);
    return out;
  }
  // Published shape: the same rows, flattened, with the plain-language word from
  // the shared vocabulary attached. `says` is the five-word read; `patLabel` is the
  // depth-qualified chip label the atlas prints. Both are on the object because
  // they are two namings of one tier and a caller should never have to pick.
  function _soRow(x) {
    var says = (x.pat && x.pat.says) || null;
    return {
      pid: x.pid, key: x.key, label: x.label, tier: x.tier, tone: x.tone,
      says: says ? says.key : null, saysLabel: says ? says.label : x.patLabel,
      patLabel: x.patLabel, counts: x.counts, judged: x.judged, held: x.held,
      minority: _soMinority(x), noun: x.noun, said: !!x.said
    };
  }
  function recordStandout(pid) {
    var p = _soPick(pid);
    return {
      issues: p.issues, judged: p.judged, cap: p.cap, floor: p.floor,
      minIssues: p.minIssues, enough: !!p.enough,
      consistentN: p.consistentN, mixedN: p.mixedN,
      consistent: p.consistent.map(_soRow),
      mixed: p.mixed.map(_soRow),
      any: !!(p.consistent.length || p.mixed.length)
    };
  }
  var _SO_HEAD = { icon: '🏛', title: 'What the record points to' };
  var _SO_GROUPS = {
    consistent: { id: 'consistent', lb: 'Most one-sided',
      note: 'Issues where every act on file, or nearly every one, pushed the same way.' },
    mixed: { id: 'mixed', lb: 'Most conflicted',
      note: 'Issues where the acts on file ran both ways in real numbers.' }
  };
  // The strip's own wall, which is the engine's sentence rather than a second
  // wording of it, plus the one thing that sentence does not cover: this is a
  // SELECTION, and the reader is told where the rest of it is.
  // WHERE THE REST OF IT IS. Both tails point at 🌳 All Issues by Topic, which is
  // the gateway a reader explores the record issue by issue from. They used to
  // point at "the full issue-by-issue list below", meaning the flat formal atlas
  // that mounted open directly beneath this strip; that list is now collapsed
  // under the tree, so naming it here would send a reader past the index to the
  // wall behind it.
  var _SO_WALL_TAIL = 'These are the standouts, not the whole record — explore it ' +
    'issue by issue in the topic tree below.';
  var _SO_WALL_WHOLE = 'That is every issue the record could be read on so far — the topic tree below is how you explore them.';
  function _soChipHtml(x, grp) {
    var tone = _ST_PAT_TONE[x.tone] || _ST_PAT_TONE.muted;
    var says = (x.pat && x.pat.says) || null;
    var word = says ? says.label : x.patLabel;
    var frame = window._PDX_RD_SAYS_LEAD || 'The record indicates';
    var depth = x.held ? (x.held + ' ' + (x.held === 1 ? x.noun.one : x.noun.many) + ' on file') : '';
    var say = x.label + ' — ' + frame + ': ' + word +
      (x.counts ? ' (' + x.counts + ')' : '') + (depth ? '. ' + depth : '') +
      '. Open the acts behind it.';
    var skin = _icSkin(x.key);
    return '<button type="button" class="pdxso-chip' + skin.cls + '" style="' + skin.style +
        ';--c:' + tone.c + '"' +
        ' data-pdxso-grp="' + escAttr(grp) + '"' +
        ' data-pdxso-says="' + escAttr(says ? says.key : x.tier) + '"' +
        ' data-pdxst-dos="' + escAttr(x.key) + '" data-pdxst-pid="' + escAttr(x.pid) + '"' +
        ' data-pdxst-origin="' + escAttr(_soStripId(x.pid)) + '"' +
        ' data-pdxst-focus="record"' +
        ' aria-label="' + escAttr(say) + '">' +
        '<span class="pdxso-chip-iss">' + _icDot(skin) + esc(x.label) + '</span>' +
        '<span class="pdxso-chip-v" style="color:' + tone.c + '">' + esc(word) + '</span>' +
        (x.counts ? '<span class="pdxso-chip-n">' + esc(x.counts) + '</span>' : '') +
        (depth ? '<span class="pdxso-chip-d">' + esc(depth) + '</span>' : '') +
      '</button>';
  }
  function _soStripId(pid) { return 'pdxso-strip-' + _stSlug(pid); }
  function recordStandoutHtml(pid) {
    if (!pid) return '';
    ensureStyles();
    // The strip is a bank of dossier doors and nothing else, so it arms the one
    // delegated listener every other [data-pdxst-dos] surface here arms.
    bindGateway();
    var p;
    try { p = _soPick(pid); } catch (e) { return ''; }
    if (!p || (!p.consistent.length && !p.mixed.length)) return '';
    var grpHtml = function (key, list, total) {
      if (!list.length) return '';
      var g = _SO_GROUPS[key];
      var more = total > list.length
        ? '<p class="pdxso-more">' + (total - list.length) + ' more in the topic tree below.</p>' : '';
      return '<div class="pdxso-grp pdxso-grp-' + escAttr(g.id) + '">' +
          '<div class="pdxso-grp-h">' + esc(g.lb) + '</div>' +
          '<p class="pdxso-grp-note">' + esc(g.note) + '</p>' +
          '<div class="pdxso-chips">' +
            list.map(function (x) { return _soChipHtml(x, g.id); }).join('') +
          '</div>' + more +
        '</div>';
    };
    // THE TAIL ONLY CLAIMS A SELECTION WHEN ONE HAPPENED. "These are the standouts,
    // not the whole record" is true on a member with forty readable issues and
    // false on one with four, where the four chips ARE the whole readable record —
    // and a sentence promising more below, on a profile that has no more below, is
    // the kind of small lie that costs a reader their trust in the large ones.
    var picked = p.consistent.length + p.mixed.length;
    var whole = picked >= (p.consistentN + p.mixedN);
    var wall = (window._PDX_RD_TIER_NOTE || '') + ' ' +
      (whole ? _SO_WALL_WHOLE : _SO_WALL_TAIL);
    return '<span id="pdxsec-standout" class="pdx-nav-anchor" aria-hidden="true"></span>' +
      '<section class="pdxso" id="' + escAttr(_soStripId(pid)) + '"' +
        ' aria-label="What the formal record points to">' +
        '<div class="pdxso-head">' +
          '<span class="pdxso-ico" aria-hidden="true">' + _SO_HEAD.icon + '</span>' +
          '<span class="pdxso-t">' + esc(_SO_HEAD.title) + '</span>' +
          '<span class="pdxso-depth">' + p.issues + ' issue' + (p.issues === 1 ? '' : 's') +
            ' read · ' + p.judged + ' act' + (p.judged === 1 ? '' : 's') + ' behind them</span>' +
        '</div>' +
        '<div class="pdxso-grps">' +
          grpHtml('consistent', p.consistent, p.consistentN) +
          grpHtml('mixed', p.mixed, p.mixedN) +
        '</div>' +
        '<p class="pdxso-wall">' + esc(wall) + '</p>' +
      '</section>';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ✒️ THE COMPACT FORMAL SUMMARY — EXECUTIVE LANE
  // ═══════════════════════════════════════════════════════════════════════════
  // The strip above is the member's answer to "what does the formal record say
  // about this person" and it is built out of roll-call patterns. An executive has
  // no roll calls, and _stDirRaw() says so in one line — `if (r.lane === 'exec')
  // return null` — so every exec row reaches _fpiRows() as `unread`, _soPick()
  // selects nothing, and a president's profile opened on the spine's record slot
  // with nothing in it. Not a thin strip: no strip, and no pill pointing at one.
  //
  // This is that slot's exec-native occupant. It answers the two questions the
  // member strip answers, in the vocabulary this lane already uses on the page:
  //
  //   WHAT DO WE HOLD?  The inventory — the lane's own volume clause, then the
  //                     per-class counts (PDXExecRecord.inventory), which are
  //                     never summed into one headline figure because signing a
  //                     bill Congress wrote and issuing an order alone are
  //                     different claims about power.
  //   WHERE DO I LOOK?  Up to _XS_CAP issues per bucket where the acts on file all
  //                     ran one way, and up to _XS_CAP where they ran both — each
  //                     chip a door into the same dossier the topic tree opens —
  //                     and then one control into the tree itself.
  //
  // IT IS NOT A ROLL-CALL ATLAS AND IT INVENTS NOTHING. Every figure is lifted off
  // PDXExecRecord.summary(pid).rows — the same pass the ledger's own count rows are
  // built from, so the summary at the top of the page and the panel further down
  // cannot state different totals. No pattern tier is fabricated for a lane that
  // does not have one, no vote language, no stance is written anywhere, and the
  // buckets are the lane's published verdict tokens (acted on it / acted against it
  // / acted both ways), not a second vocabulary invented here.
  //
  // NO SECOND SCORE. There is no percentage on this block and no ordinal anything:
  // the single Direction Match figure on an executive profile lives where it always
  // did, in the letterhead and in Word vs Action. Counts and issue names only.
  //
  // NOTHING IS CLEANED. An issue whose actions are enjoined, rescinded or overridden
  // carries that standing on its chip, exactly as the dossier and the ledger carry
  // it. A summary that reported only alignment would imply the whole record is
  // operative, which is the failure Axis B exists to prevent, reintroduced one
  // level up.
  //
  // THIN IS A STATE, NOT AN ABSENCE. A president with two orders on file gets the
  // inventory and a sentence saying two actions cannot carry a pattern — not
  // padding from the public lane, and not a blank where the record slot should be.
  var _XS_CAP = 2;
  // The set floor, for the same reason _SO_MIN_ISSUES exists: "every act ran one
  // way" and "the acts ran both ways" are comparative claims, and a comparison over
  // a set of one or two is the whole record wearing a superlative. Three readable
  // issues is the smallest set where picking two leaves something unpicked.
  var _XS_MIN_ISSUES = 3;
  // The depth floor for a single chip, taken from the lane's OWN published
  // thinness threshold rather than a number chosen here: PDXExecRecord.THIN_MAX is
  // "one or two actions cannot carry a pattern", so the first count that can is one
  // more than it. Read live so the two can never drift apart.
  function _xsFloor() {
    try {
      var t = window.PDXExecRecord && window.PDXExecRecord.THIN_MAX;
      if (typeof t === 'number' && t >= 0) return t + 1;
    } catch (e) {}
    return 3;
  }
  var _XS_HEAD = { icon: '✒️', title: 'What the formal record holds' };
  var _XS_GROUPS = {
    oneway: { id: 'oneway', lb: 'Every act ran one way',
      note: 'Issues where every formal action on file pushed the same direction.' },
    both: { id: 'both', lb: 'Acts ran both ways',
      note: 'Issues where the formal actions on file ran in both directions.' }
  };
  // The lane's verdict tones, mapped onto the tones the chips in this file already
  // paint with. One mapping, so an exec chip and a member chip meaning the same
  // thing are the same colour.
  var _XS_TONE = { good: 'support', bad: 'oppose', warn: 'mixed', muted: 'muted' };
  // Only the three FINDING tokens can be a standout. said_not_done, acted_no_stance
  // and no_record are coverage — they report the state of our file, not a reading of
  // the record — and EXEC_VERDICTS marks them isCoverage for exactly this reason.
  var _XS_ONEWAY = { acted_on_it: 1, acted_against: 1 };
  var _XS_BOTH = { acted_both_ways: 1 };
  var _XS_JUMP = 'pdxsec-stancetree';
  // The same two-line jump the shape hero's "Explore all N by topic" button uses
  // (word-action.js jumpAttr), including its no-JS-router fallback, so the one
  // control out of this block behaves like the one control out of that one.
  function _xsJumpAttr(target) {
    var t = String(target).replace(/[^A-Za-z0-9_-]/g, '');
    return ' onclick="event.stopPropagation();if(window._pdxNavJump){window._pdxNavJump(\'' + t + '\');}' +
           'else{var e=document.getElementById(\'' + t + '\');if(e&&e.scrollIntoView)e.scrollIntoView({behavior:\'smooth\',block:\'start\'});}"';
  }
  // How split a split is: the smaller of the two directions, which is the only
  // honest measure of it. Same shape as _soMinority one lane over.
  function _xsMinority(r) { return Math.min(r.advances || 0, r.opposes || 0); }
  function _xsStripId(pid) { return 'pdxxs-strip-' + _stSlug(pid); }
  // The contested-standing clause for one issue, counted. Empty when nothing behind
  // the issue is contested — an uncontested record needs no clause, and printing
  // "3 in force" here would spend the block's shortest line on the absence of news.
  function _xsStanding(r) {
    if (!r || !r.standing || !r.standing.contested) return '';
    var n = r.standingN || 0;
    if (!n) return String(r.standing.label || '');
    return n + ' ' + String(r.standing.label || '').toLowerCase();
  }

  function _xsPick(pid) {
    var out = { on: false, pid: pid || '', sum: null, volume: '', inventory: [],
                acts: 0, issues: 0, readable: 0, thin: false, contested: false,
                oneway: [], both: [], onewayN: 0, bothN: 0,
                cap: _XS_CAP, floor: _xsFloor(), minIssues: _XS_MIN_ISSUES,
                enough: false, any: false };
    var EX;
    try { EX = window.PDXExecRecord || null; } catch (e) { EX = null; }
    if (!EX || !pid || typeof EX.eligible !== 'function' || !EX.eligible(pid)) return out;
    var sum;
    try { sum = EX.summary(pid, { allTerms: true }); } catch (e) { sum = null; }
    // No summary means nothing on file or a failed invariant, and both of those are
    // reasons to render nothing at all rather than a frame around an absence.
    if (!sum || !sum.rows) return out;
    out.on = true;
    out.sum = sum;
    out.acts = (sum.actions.total || 0) + (sum.unstatedStanding || 0);
    out.issues = sum.issues.total || 0;
    out.thin = !!sum.thin;
    out.contested = !!sum.contested;
    try { out.volume = (typeof EX.volumeText === 'function') ? (EX.volumeText(sum) || '') : ''; } catch (e) {}
    try { out.inventory = (typeof EX.inventory === 'function') ? (EX.inventory(sum) || []) : []; } catch (e) {}

    var one = [], both = [];
    sum.rows.forEach(function (r) {
      if (!r || !r.issueKey) return;
      if (!_XS_ONEWAY[r.token] && !_XS_BOTH[r.token]) return;
      out.readable++;
      if ((r.acts || 0) < out.floor) return;
      (_XS_BOTH[r.token] ? both : one).push(r);
    });
    // Deepest first in the one-way bucket: "every one of nine orders pushed the same
    // way" is a finding and "the one order did" is a document. Most-split first in
    // the both-ways bucket, by the smaller side. The issue label breaks the last tie
    // so two renders of one profile never disagree about the order.
    var byLabel = function (a, b) {
      var al = _issueLabel(a.issueKey), bl = _issueLabel(b.issueKey);
      return al < bl ? -1 : al > bl ? 1 : 0;
    };
    one.sort(function (a, b) {
      if (a.acts !== b.acts) return b.acts - a.acts;
      return byLabel(a, b);
    });
    both.sort(function (a, b) {
      var am = _xsMinority(a), bm = _xsMinority(b);
      if (am !== bm) return bm - am;
      if (a.acts !== b.acts) return b.acts - a.acts;
      return byLabel(a, b);
    });
    out.onewayN = one.length;
    out.bothN = both.length;
    // The set floor last, so a caller can still see what WAS found and why it was
    // withheld — the honest reason an obviously deep record shows no chips.
    out.enough = out.readable >= _XS_MIN_ISSUES;
    if (out.enough) {
      out.oneway = one.slice(0, _XS_CAP);
      out.both = both.slice(0, _XS_CAP);
    }
    out.any = !!(out.oneway.length || out.both.length);
    return out;
  }

  function _xsChipHtml(pid, r, grp) {
    var v = r.verdict || {};
    var tone = _ST_PAT_TONE[_XS_TONE[v.tone] || 'muted'] || _ST_PAT_TONE.muted;
    var label = _issueLabel(r.issueKey);
    var word = v.label || '';
    // The composition, in the acts' own directions — never a ratio and never a
    // percentage. A one-way issue has one direction to report, so it reports depth
    // instead of a split that does not exist.
    var counts = _XS_BOTH[r.token]
      ? (r.advances + ' advancing · ' + r.opposes + ' opposing')
      : '';
    var depth = r.acts + ' ' + (r.acts === 1 ? 'action' : 'actions') + ' on file';
    // NON-DROPPABLE, AND COUNTED. If any act behind this issue is enjoined,
    // rescinded or overridden, the chip says so — the compact rendering is exactly
    // where that clause is most easily lost, and losing it turns a contested record
    // into a settled one. It carries the COUNT because the issue's standing is the
    // most contested one among its actions, not the standing of all of them: a bare
    // "Struck down" beside "9 actions on file" would make a claim about eight
    // documents it is not true of.
    var st = _xsStanding(r);
    var skin = _icSkin(r.issueKey);
    var say = label + ' — ' + word + (counts ? ' (' + counts + ')' : '') + '. ' + depth +
      (st ? '. ' + st : '') + '. Open the acts behind it.';
    return '<button type="button" class="pdxso-chip" style="' + skin.style +
        ';--c:' + tone.c + '"' +
        ' data-pdxxs-grp="' + escAttr(grp) + '"' +
        ' data-pdxxs-token="' + escAttr(r.token) + '"' +
        ' data-pdxst-dos="' + escAttr(r.issueKey) + '" data-pdxst-pid="' + escAttr(pid) + '"' +
        ' data-pdxst-origin="' + escAttr(_xsStripId(pid)) + '"' +
        ' data-pdxst-focus="record"' +
        ' aria-label="' + escAttr(say) + '">' +
        '<span class="pdxso-chip-iss">' + _icDot(skin) + esc(label) + '</span>' +
        '<span class="pdxso-chip-v" style="color:' + tone.c + '">' + esc(word) + '</span>' +
        (counts ? '<span class="pdxso-chip-n">' + esc(counts) + '</span>' : '') +
        '<span class="pdxso-chip-d">' + esc(depth + (st ? ' · ' + st : '')) + '</span>' +
      '</button>';
  }

  // The published data shape. Counts, issue keys and the lane's own words — no
  // percentage, no tier invented for a lane that has none, and no field a caller
  // could mistake for a rating.
  function execRecordSummary(pid) {
    var p = _xsPick(pid);
    var row = function (r) {
      return { pid: p.pid, key: r.issueKey, label: _issueLabel(r.issueKey),
               token: r.token, word: (r.verdict && r.verdict.label) || '',
               acts: r.acts, advances: r.advances, opposes: r.opposes,
               minority: _xsMinority(r),
               standing: (r.standing && r.standing.key) || '',
               contested: !!(r.standing && r.standing.contested) };
    };
    return { on: p.on, pid: p.pid, acts: p.acts, issues: p.issues, readable: p.readable,
             inventory: p.inventory.slice(), volume: p.volume,
             thin: p.thin, contested: p.contested,
             cap: p.cap, floor: p.floor, minIssues: p.minIssues, enough: p.enough,
             onewayN: p.onewayN, bothN: p.bothN,
             oneway: p.oneway.map(row), both: p.both.map(row), any: p.any };
  }

  // The thin / withheld sentences. Each names the rule that produced it rather than
  // reporting an absence, because "nothing to show" on a profile with eighty
  // documents on file reads as a bug.
  var _XS_THIN = 'Two actions or fewer cannot carry a pattern, so nothing here is called a standout yet — the ledger below is the whole of what we hold.';
  var _XS_TOO_FEW = 'Not enough issues can be read one way or the other yet to call any of them a standout. Every issue we do hold is in the topic tree below.';
  var _XS_SHALLOW = 'No issue yet holds enough actions to be called a standout on its own. Every issue we hold is in the topic tree below.';
  var _XS_WALL = 'These are the standouts, not the whole record — the topic tree below is how you explore it issue by issue, and the ledger further down holds every document.';

  function execRecordSummaryHtml(pid) {
    if (!pid) return '';
    var p;
    try { p = _xsPick(pid); } catch (e) { return ''; }
    if (!p.on) return '';
    ensureStyles();
    // The chips are dossier doors, so this arms the one delegated listener every
    // other [data-pdxst-dos] surface here arms.
    bindGateway();
    var grpHtml = function (key, list, total) {
      if (!list.length) return '';
      var g = _XS_GROUPS[key];
      var more = total > list.length
        ? '<p class="pdxso-more">' + (total - list.length) + ' more in the topic tree below.</p>' : '';
      return '<div class="pdxso-grp pdxso-grp-' + escAttr(g.id) + '">' +
          '<div class="pdxso-grp-h">' + esc(g.lb) + '</div>' +
          '<p class="pdxso-grp-note">' + esc(g.note) + '</p>' +
          '<div class="pdxso-chips">' +
            list.map(function (r) { return _xsChipHtml(p.pid, r, g.id); }).join('') +
          '</div>' + more +
        '</div>';
    };
    var body = p.any
      ? '<div class="pdxso-grps">' +
          grpHtml('oneway', p.oneway, p.onewayN) +
          grpHtml('both', p.both, p.bothN) +
        '</div>'
      : '<p class="pdxxs-quiet">' +
          esc(p.thin ? _XS_THIN : (!p.enough ? _XS_TOO_FEW : _XS_SHALLOW)) +
        '</p>';
    // The route out. One control, one destination, and the figure on it is the
    // number of issues the tree actually lists — read off the tree rather than
    // counted a second time here, so the button and the section it opens cannot
    // disagree about how much is behind the door.
    var treeN = 0;
    try {
      var TR = window.PDXStanceTree;
      if (TR && typeof TR.count === 'function') treeN = TR.count(p.pid) || 0;
    } catch (e) { treeN = 0; }
    var goText = treeN
      ? ('Explore all ' + treeN + ' issue' + (treeN === 1 ? '' : 's') + ' by topic')
      : 'Explore this record by topic';
    return '<span id="pdxsec-standout" class="pdx-nav-anchor" aria-hidden="true"></span>' +
      '<section class="pdxso pdxxs" id="' + escAttr(_xsStripId(p.pid)) + '"' +
        ' aria-label="What the formal record holds">' +
        // NO DEPTH FIGURE IN THE HEAD. The member strip carries one there because
        // it has nothing else to state a denominator with. Here the volume clause
        // on the next line already says "80 across 37 issues", with the framing
        // that makes the figure honest attached to it, and the same counts twice in
        // four lines is how a compact block stops being compact.
        '<div class="pdxso-head">' +
          '<span class="pdxso-ico" aria-hidden="true">' + _XS_HEAD.icon + '</span>' +
          '<span class="pdxso-t">' + esc(_XS_HEAD.title) + '</span>' +
        '</div>' +
        (p.volume ? '<p class="pdxxs-vol">' + esc(p.volume) + '</p>' : '') +
        (p.inventory.length
          ? '<p class="pdxxs-inv">' + esc(p.inventory.join(' · ')) + '</p>' : '') +
        body +
        '<button type="button" class="pdxxs-go"' + _xsJumpAttr(_XS_JUMP) +
          ' aria-label="' + escAttr(goText + ', in the topic tree below') + '">' +
          esc(goText) + ' <span aria-hidden="true">↓</span>' +
        '</button>' +
        '<p class="pdxso-wall">' + esc(_XS_WALL) + '</p>' +
      '</section>';
  }

  // ── THE FILTERS ─────────────────────────────────────────────────────────────
  // Six views, and the two that matter are `stated` and `pattern`: the curated
  // list's "Gaps only" folds an issue with a deep formal record and no stance card
  // in with the issues nothing at all is known about, which is exactly the framing
  // this index exists to undo. Here "pattern only" is a FINDING — sixty-odd issues
  // where the record spoke and nobody has written down what they said — and it is
  // reachable in one tap from the default view, never behind a gaps filter.
  var _FPI_VIEWS = {
    all:      { lb: 'All',                  test: function () { return true; } },
    stated:   { lb: 'With stated position',  test: function (x) { return !!x.said; } },
    pattern:  { lb: 'Pattern only',          test: function (x) { return !x.said; } },
    supports: { lb: 'Supports-leaning',      test: function (x) { return x.tone === 'support'; } },
    opposes:  { lb: 'Opposes-leaning',       test: function (x) { return x.tone === 'oppose'; } },
    split:    { lb: 'Split',                 test: function (x) { return x.tier === 'split'; } }
  };
  var _FPI_VIEW_ORDER = ['all', 'stated', 'pattern', 'supports', 'opposes', 'split'];
  // Session-level, deliberately: the surface it mounts in re-renders itself whole
  // on a sort change and on the warm repaint, and a reader's chosen filter
  // surviving that is the difference between a control and a surprise. Keyed by
  // mount, so two live indexes on one politician remember two filters rather than
  // fighting over one — see _fpiRowId above.
  var _fpiView = {};
  function _fpiViewOf(v) { return (v && _FPI_VIEWS[v]) ? v : 'all'; }
  function _fpiViewAt(mount) { return _fpiViewOf(_fpiView[_fpiMount(mount)]); }

  // ── ONE ROW ─────────────────────────────────────────────────────────────────
  // The issue name is the door, exactly as it is on a stance row: same delegated
  // [data-pdxst-dos] handler, same openGap(), same accessible name — so the
  // dossier this opens is the dossier that row opens, not a second view of it.
  // The row carries its OWN id (never stanceRowId) because the stance section may
  // be on the page at the same time and two elements cannot share one id; the back
  // pill then returns the reader to the row they tapped inside this index.
  //   THE WHOLE ROW IS THE DOOR, not just the name. The chips and the "N votes on
  // file" meta used to be inert siblings of the label button, which on a phone is
  // most of the row's height — the reader taps the pattern chip they are reading
  // and nothing happens. The row div carries the SAME three data-pdxst-* values,
  // so the delegated handler's closest() finds a door wherever inside the row the
  // tap landed. Deliberately no role/tabindex on the div: the <button> inside is
  // still the one focus stop and the one accessible name, so this adds a pointer
  // target without adding a second thing to tab through or a control nested in a
  // control. Both carry the same key, so which one closest() reaches cannot
  // change what opens.
  function _fpiRowHtml(x, mount) {
    var skin = _icSkin(x.key);
    // The pattern, then their word — the same reading order the row faces use, for
    // the same reason: the chip is the fact every row here has, and "Says: …" is
    // the one only some of them do.
    var chip = x.read ? _stPatternHtml(x.row, x.pat) : _fpiUnreadHtml(x);
    var says = x.stance ? _orStanceChip(x.pid, x.key) : '';
    var meta = x.held > 0
      ? (x.held + ' ' + (x.held === 1 ? x.noun.one : x.noun.many) + ' on file')
      : '';
    return '<div class="pdxfpi-row' + skin.cls + '" style="' + skin.style + '"' +
        ' id="' + escAttr(_fpiRowId(mount, x.pid, x.key)) + '"' +
        ' data-pdxfpi-issue="' + escAttr(x.key) + '"' +
        ' data-pdxfpi-tier="' + escAttr(x.tier) + '"' +
        ' data-pdxst-dos="' + escAttr(x.key) + '" data-pdxst-pid="' + escAttr(x.pid) + '"' +
        ' data-pdxst-origin="' + escAttr(_fpiRowId(mount, x.pid, x.key)) + '"' +
        ' data-pdxfpi-said="' + (x.said ? '1' : '0') + '">' +
        '<button type="button" class="pdxfpi-lbl pdxst-open"' +
          ' data-pdxst-dos="' + escAttr(x.key) + '" data-pdxst-pid="' + escAttr(x.pid) + '"' +
          ' data-pdxst-origin="' + escAttr(_fpiRowId(mount, x.pid, x.key)) + '"' +
          ' aria-label="' + escAttr(_dosDoorLabel(x.label, null, x.stance)) + '">' +
          _icDot(skin) + esc(x.label) +
          '<span class="pdxfpi-go" aria-hidden="true">›</span>' +
        '</button>' +
        '<span class="pdxfpi-chips">' + chip + says + '</span>' +
        (meta ? '<span class="pdxfpi-meta">' + esc(meta) + '</span>' : '') +
      '</div>';
  }
  // A ROW WITH A RECORD AND NO VERB FOR IT. The executive lane is the population
  // this covers: _stDirRaw declines there, so no tier is read and none is invented.
  // The row still belongs in the index — the instruments are on file and the
  // dossier holds them — so it says what is true and nothing more. Grey, dotted,
  // no direction word, and explicitly NOT "No clear pattern yet": that tier is a
  // read of a record, and this is the absence of one.
  function _fpiUnreadHtml(x) {
    var why = x.why || { lb: 'Pattern not read yet', note: '' };
    return '<span class="pdxst-pat w-flat pdxfpi-unread" style="--c:#8fa6c6;--bg:rgba(10,15,30,0.32)"' +
      ' data-pdxfpi-pat="' + escAttr(why.id || 'unread') + '" role="img"' +
      ' aria-label="' + escAttr('Formal record: ' + why.lb.toLowerCase() + '. ' + why.note) + '"' +
      ' title="' + escAttr(why.note) + '">' +
      '<span class="pdxst-pat-lane" aria-hidden="true">🏛 Record</span>' +
      '<span class="pdxst-pat-lb">' + esc(why.lb) + '</span>' +
      '</span>';
  }
  // WHY NO PATTERN — AND THE THREE ANSWERS ARE NOT THE SAME ANSWER. A grey chip
  // reading "not read yet" over three different situations is the vaguest thing
  // this index could say, and one of the three is not a shortfall at all. So each
  // says its own true sentence, and none of them borrows a direction word:
  //
  //   · THE EXEC LANE. _stDirRaw declines there by design — the pattern read is
  //     built on roll-call votes and an executive action needs its own verb. The
  //     instruments are real and the dossier holds them.
  //   · NO ROLL CALLS MAPPED HERE. The row's inventory came from the curated
  //     formal feeder, and the roll-call index has nothing on this issue to read
  //     — including before the vote record has finished loading.
  //   · THE ISSUE HAS NO SIDE. A balance key, or a key with no support pole: our
  //     mapping cannot say what "advancing" this issue would even mean, so no
  //     direction is claimed from a record that may well be perfectly clear. This
  //     is the shortfall this surface owns, and it says so.
  function _fpiUnreadWhy(r) {
    var n = _stNoun(r);
    // THE ISSUE'S SHAPE IS ASKED FIRST, and from the KEY rather than from an index.
    // A poleless issue has nothing for any record to lean on — roll-call, executive
    // or otherwise — so on a lane with no index to inspect (the executive one) that
    // answer used to be unreachable and the row said "the pattern read has not been
    // extended to this lane" over an issue no lane could ever read. The gap is our
    // mapping's either way, and the row now says which gap it is.
    var _fsup = null;
    try {
      if (typeof window._pdxRecordSuppressedKey === 'function') {
        _fsup = window._pdxRecordSuppressedKey(r && r.key) || null;
      }
    } catch (e) { _fsup = null; }
    if (_fsup && _RD_TIER_MUTED[_fsup]) {
      return { id: 'no_side', lb: 'No side to read on this issue',
        note: 'This issue has no for-or-against side in our own issue mapping, so we do not claim a ' +
          'direction for these ' + n.many + '. That is a gap in our mapping, not a finding about ' +
          'their record — the ' + n.many + ' themselves are in the dossier.' };
    }
    if (r && r.lane === 'exec') {
      return { id: 'exec_lane', lb: 'Pattern not read on this lane yet',
        note: 'These ' + n.many + ' are on file and open in the dossier. The pattern read runs on ' +
          'roll-call votes and has not been extended to executive actions yet, so no direction is ' +
          'claimed here either way.' };
    }
    var idx = null;
    try { idx = _stDirRaw(r); } catch (e) { idx = null; }
    if (idx && idx.suppressed && window._PDX_RD_TIERS && _RD_TIER_MUTED[idx.suppressed]) {
      return { id: 'no_side', lb: 'No side to read on this issue',
        note: 'This issue has no for-or-against side in our own issue mapping, so we do not claim a ' +
          'direction for these ' + n.many + '. That is a gap in our mapping, not a finding about ' +
          'their record — the ' + n.many + ' themselves are in the dossier.' };
    }
    // ── AND FOUR REFUSALS THAT ARE ABOUT THIS ROW'S OWN LEDGER ────────────────
    // Everything above answers "this issue has no side" or "this lane is not read
    // yet". What follows answers the harder question: the index LOOKED at mapped
    // items on a poled issue and still would not name a direction — and there are
    // four different reasons for that, which the row used to report with one
    // sentence ("No clear pattern yet"). One of the four is not even a shortfall in
    // their record; two of them sit over a ledger where the side is perfectly
    // visible and we are declining to read it, which is a thing a reader is owed
    // the reason for. So each says which of the four it is, and — as everywhere in
    // this table — none of them borrows a direction word.
    //   ORDER IS BY WALL, OUTERMOST FIRST: nothing took a side, then the mapping is
    // not about this issue, then we hold too little of the member's file, then the
    // items on file ran both ways. A row that trips more than one is named by the
    // outer wall, because that is the one that would still hold if the others were
    // cleared.
    if (idx && (idx.total || 0) > 0) {
      if ((idx.judged || 0) < 1) {
        return { id: 'no_side_taken', lb: 'No ' + n.one + ' here took a side',
          note: 'The ' + n.many + ' mapped to this issue were Present, Not Voting, or otherwise ' +
            'resolved to neither side, so there is nothing to read a direction from. They are in ' +
            'the dossier exactly as they are.' };
      }
      if ((idx.primary || 0) < 1) {
        return { id: 'incidental', lb: 'Not about this issue',
          note: 'The ' + n.many + ' on file here touched this issue as part of a larger measure ' +
            'rather than being about it. A bill that brushed the subject is not a ' + n.one + ' on ' +
            'the subject, so no direction is claimed — however one-sided the arithmetic looks.' };
      }
      if (idx.suppressed === 'coverage_floor') {
        return { id: 'coverage_floor', lb: 'Too little of their file held',
          note: 'We hold too few mapped ' + n.many + ' for this member overall to read any of them ' +
            'as a pattern. That is a shortfall in OUR coverage, not a finding about their record — ' +
            'the ' + n.many + ' we do hold are in the dossier.' };
      }
      // ONLY PROCEDURAL. The index publishes a procedural tally beside the judged
      // one, and where the two are equal every act this row holds was a motion to
      // proceed, a cloture vote or a recommit — machinery of the floor rather than
      // a vote on the thing. That is a materially different sentence from "we hold
      // too few of their file", and it is the one that is true here. It names no
      // direction: the acts are real and one-sided arithmetic on them is still not
      // a position on the subject.
      if ((idx.judged || 0) > 0 && (idx.procedural || 0) >= (idx.judged || 0)) {
        return { id: 'procedural_only', lb: 'Procedural ' + n.many + ' only',
          note: 'Every ' + n.one + ' on file here was procedural — a motion to proceed, a ' +
            'cloture vote or similar — rather than a ' + n.one + ' on the substance of this ' +
            'issue. No direction is read from floor machinery, and the ' + n.many + ' are in ' +
            'the dossier.' };
      }
      if ((idx.advances || 0) > 0 && (idx.opposes || 0) > 0) {
        return { id: 'mixed_thin', lb: 'Ran both ways, too few to weigh',
          note: 'The ' + n.many + ' on file here went both ways, and there are too few of them for ' +
            'the margin to mean anything. No lead is derived from a record this size, and the ' +
            n.many + ' themselves are in the dossier.' };
      }
    }
    return { id: 'no_rollcall', lb: 'No roll-call pattern on file yet',
      note: 'These ' + n.many + ' are on file and open in the dossier, but no roll call mapped to ' +
        'this issue has been read for a pattern yet, so no direction is claimed here.' };
  }
  // The issue-level suppressions the tier engine mutes a chip for, mirrored here so
  // the index can NAME which of them happened. Not a second gate: the engine still
  // decides, and this only reads its published reason.
  var _RD_TIER_MUTED = { no_issue: 1, balance_key: 1, no_pole: 1 };

  // ── THE INDEX ───────────────────────────────────────────────────────────────
  // `opts.sort` comes from whatever surface hosts this (the Full Stance Record
  // overlay hands it its own Sort control's state, so one control governs both
  // lists). `opts.view` overrides the remembered filter; the delegated handler
  // below uses it to re-render in place.
  function formalPatternIndexHtml(pid, opts) {
    opts = opts || {};
    if (!pid) return '';
    ensureStyles();
    // The rows are doors into the dossier, so the one delegated click listener has
    // to be armed even when this index is the only thing on screen — the overlay it
    // mounts in can be opened from a card that never rendered the stance section.
    bindGateway();
    _fpiBind();
    var sort = (opts.sort === 'az') ? 'az' : 'strength';
    var mount = _fpiMount(opts.mount);
    var all = _fpiRows(pid, { sort: sort });
    if (!all.length) return '';
    if (opts.view) _fpiView[mount] = _fpiViewOf(opts.view);
    var view = _fpiViewAt(mount);
    var shown = all.filter(_FPI_VIEWS[view].test);
    // A filter with nothing behind it is a dead control, so a view is only offered
    // where it would change what is on screen — and `all` is always offered, so a
    // reader can always get back to the whole list.
    var live = _FPI_VIEW_ORDER.filter(function (v) {
      if (v === 'all') return true;
      var n = all.filter(_FPI_VIEWS[v].test).length;
      return n > 0 && n < all.length;
    });
    var segs = live.map(function (v) {
      var on = (v === view);
      var n = all.filter(_FPI_VIEWS[v].test).length;
      return '<button type="button" class="pdxfpi-seg' + (on ? ' is-on' : '') + '"' +
        ' data-pdxfpi-set="' + escAttr(v) + '"' + (on ? ' aria-pressed="true"' : '') + '>' +
        esc(_FPI_VIEWS[v].lb) + ' <span class="pdxfpi-seg-n">' + n + '</span></button>';
    }).join('');
    // THE CENSUS IS A COUNT, NOT A GRADE. Five tiers and the unread lane, each with
    // how many issues landed there — the honest shape of the list before anyone
    // scrolls it. It reports; it does not rank the person.
    var census = {}, order = [];
    all.forEach(function (x) {
      // Keyed on the printed label, not the tier: the three unread reasons are three
      // different statements and collapsing them into one grey count would hide the
      // only one of them that is ours to fix.
      var k = x.tier + '|' + x.patLabel;
      if (!census[k]) { census[k] = { n: 0, x: x }; order.push(k); }
      census[k].n++;
    });
    order.sort(function (a, b) {
      return (census[a].x.rank - census[b].x.rank) || (a < b ? -1 : 1);
    });
    var censusHtml = order.map(function (k) {
      var c = census[k], tone = _ST_PAT_TONE[c.x.tone] || _ST_PAT_TONE.muted;
      return '<span class="pdxfpi-cn" style="--c:' + tone.c + '">' +
        '<b>' + c.n + '</b> ' + esc(c.x.patLabel) + '</span>';
    }).join('');
    var stated = all.filter(function (x) { return x.said; }).length;
    var patternOnly = all.length - stated;
    var viewNote = (view === 'all') ? '' : ' · ' + _FPI_VIEWS[view].lb.toLowerCase();
    return '<div class="pdxfpi" data-pdxfpi-host="' + escAttr(pid) + '"' +
        ' data-pdxfpi-mount="' + escAttr(mount) + '"' +
        ' data-pdxfpi-sort="' + escAttr(sort) + '" data-pdxfpi-view="' + escAttr(view) + '"' +
        ' aria-label="Every issue on the formal record">' +
        '<div class="pdxfpi-head">' +
          '<span class="pdxfpi-title"><span aria-hidden="true">🏛</span> Every issue on the formal record</span>' +
          '<span class="pdxfpi-count">' + all.length + '</span>' +
        '</div>' +
        '<p class="pdxfpi-q">“What did the record itself do — across every issue, not just the ones with a written card?”</p>' +
        '<p class="pdxfpi-lede">' + all.length + ' issue' + (all.length === 1 ? '' : 's') +
          ' with something formal on file' +
          (patternOnly ? ' — <b>' + patternOnly + '</b> of them with no stated position from them yet' : '') +
          '. Tap any issue for its dossier.</p>' +
        (censusHtml ? '<div class="pdxfpi-census">' + censusHtml + '</div>' : '') +
        (segs ? '<div class="pdxfpi-segs" role="group" aria-label="Filter the formal record index">' + segs + '</div>' : '') +
        '<p class="pdxfpi-shown">Showing <b>' + shown.length + '</b> of ' + all.length +
          ' issue' + (all.length === 1 ? '' : 's') + ' on the formal record' + viewNote + '</p>' +
        '<div class="pdxfpi-list">' +
          (shown.length ? shown.map(function (x) { return _fpiRowHtml(x, mount); }).join('')
            : '<p class="pdxfpi-none">No issue on the formal record matches this filter.</p>') +
        '</div>' +
        '<p class="pdxfpi-foot">' + esc(_FPI_WALL) + '</p>' +
      '</div>';
  }
  // Re-render one mounted index in place on a filter tap. In place, not through the
  // host surface's own re-render, so the reader keeps their scroll position in a
  // sixty-row list — and armed on the same delegated listener every other control
  // in this module uses.
  var _fpiBound = false;
  function _fpiBind() {
    if (_fpiBound || !document.addEventListener) return;
    _fpiBound = true;
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-pdxfpi-set]');
      if (!b) return;
      var host = b.closest('[data-pdxfpi-host]');
      if (!host) return;
      e.preventDefault();
      var pid = host.getAttribute('data-pdxfpi-host') || '';
      var sort = host.getAttribute('data-pdxfpi-sort') || 'strength';
      // The mount rides on the host, so a filter tap re-renders THAT index with
      // THAT index's remembered state — the other one on the page is untouched.
      var mount = host.getAttribute('data-pdxfpi-mount') || 'default';
      var html = formalPatternIndexHtml(pid, { sort: sort, mount: mount,
        view: b.getAttribute('data-pdxfpi-set') || 'all' });
      if (html) host.outerHTML = html;
    }, false);
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
    // The bucket word on this door is a result name; when the row rests on one
    // instrument the door says so too, so the reader knows the size of the finding
    // before they open it rather than after.
    var _oneIns = _oneInstrumentVoice(pid, p.key, p.off);
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
          ' aria-label="' + escAttr(_dosDoorLabel(_issueLabel(p.key), o, '', _oneIns ? _oneIns.chip : '')) + '">' +
          body + '<span class="pdxdv-row-why">' + esc(o.short) +
          (_oneIns ? ' <span class="pdxdv-row-1" title="' + escAttr(_oneIns.sentence) + '">' +
            esc(_oneIns.chip) + '</span>' : '') +
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

  // ── WHAT THE BILL DID, AND WHY THAT LANDS ON THIS CHIP ──────────────────────
  // The roll-call lane's mechanism gap, closed by curation rather than by inference.
  //
  // A roll call carries three facts and no prose: a bill number, a floor question and
  // a ballot. Assembled, those give "Voted Yea on the question “On Passage”" over
  // "Counted on 🔐 Election Security & Ballot Safeguards because that is the primary
  // subject of this measure" — two true sentences that between them never say what
  // the measure does or why a yea on it counts the way it counts. On the SAVE family
  // that is the whole reader problem: five rows, five different bills, one identical
  // pair of sentences, and nothing on the face a reader could use to check the chip.
  //
  // WHAT THIS IS. A per-(measure, congress, issue) table of curator-written lines,
  // read from the measure text, filling the two slots the dossier already has:
  // `did` → "What it did" (the ≤2-sentence face line), `why` → "Why it counts here"
  // (the curated second slot, which turns the row bright — see _dosCountsBy), and an
  // optional `more` → the L4 fold, for the detail that does not belong on a row face.
  //
  // WHAT IT IS NOT. Not a mapping. Nothing here decides which items are counted,
  // which way they cut, what they weigh, or what any verdict says — the direction on
  // every row still comes from the mapping's own `supportMeaning` and the ballot, and
  // an entry that disagreed with the engine would be a wrong entry, not a new reading.
  // Not a backfill either: it is keyed tightly enough to fail closed, and a measure
  // with no entry keeps exactly the derived rendering it has today, visibly derived,
  // so nothing that is only metadata is ever dressed up as a curator's sentence.
  //
  // THE KEY IS NUMBER + CONGRESS, AND THE CONGRESS IS NOT OPTIONAL. Bill numbers are
  // reused every two years and the low ones are reused deliberately: "H.R. 1" is the
  // For the People Act in the 117th and a reconciliation vehicle in the 119th, and
  // "H.R. 22" carries the SAVE Act only in the 119th. An item with no congress on it
  // — a curated position, anything that arrives short of the vote shape — matches
  // nothing, which is the failure this direction is meant to have.
  //
  // RULES THESE LINES ARE WRITTEN UNDER. `did` says what the text does and nothing
  // about who liked it: no "supporters say", no "critics warn", no motive. `why` is
  // per issue, never one blurb reused across a bill's chips — a bill that pulls the
  // two election facets apart has to say so on each of them in that facet's own
  // terms, which is why H.R. 8281's two entries read as opposites. And where a
  // mapping carries a known confound, the confound is on the face rather than one
  // level down: a Home Rule Act vehicle means a nay may be a home-rule vote.
  //
  // WHAT DECIDES WHETHER A MEASURE GETS AN ENTRY. Two things, and reach is only the
  // second. First: the repo has to hold the text. db/vr-measure-identity.json carries
  // the enacted-law or as-passed summary for the measures it covers, and a `did` line
  // is written from that summary and from the mapping's own section citations — never
  // from recollection. A measure the corpus knows only by title and roll number gets
  // no entry, however many members voted on it, because the alternative is a sentence
  // that sounds curated and is not sourced. Second, among the measures whose text IS
  // on file: how many roster members carry a row for it, how many of those faces read
  // Contradicted or Mixed, and how many rest on a single scored vote — the three
  // places where a reader most needs to be told what the bill did before the verdict
  // means anything. That ordering is why several of the highest-volume rolls in the
  // corpus are still derived below and should stay that way until their text lands.
  var _DOS_MECH = {
    // ── The SAVE family: three separate instruments, one recurring short title ──
    'H.R. 8281|118|election_security': {
      did: 'Amended the National Voter Registration Act to require documentary proof of U.S. citizenship — a passport, a REAL ID that shows citizenship, or a birth certificate with photo ID — before a state may register anyone to vote in a federal election.',
      why: 'Verifying who is eligible before they are added to the roll is the core of what this chip measures, so a yea on this bill counts as a vote for tighter verification and a nay counts against it.',
      more: 'The bill also directed every state to run its existing rolls against federal immigration and Social Security databases to identify and remove non-citizens already registered, and created criminal penalties for an election official who registers an applicant without the documentation. Passed the House 221-198 on 2024-07-10 (roll 345); the Senate did not take it up.'
    },
    'H.R. 8281|118|voting_access': {
      did: 'Required proof of citizenship to be presented in person at an election office, which as a practical matter closes mail and online registration to any applicant who cannot appear there with documents.',
      why: 'This chip measures how hard it is to get on the roll and cast a ballot, and the bill adds a document and a trip at the registration step — so a yea counts against easier registration here, the opposite of how the same yea reads on the safeguards chip.',
      more: 'The acceptable-document list also makes no accommodation for a citizen whose current legal name differs from the name on their birth certificate — a mismatch that falls hardest on anyone who changed their name on marriage. The two election facets are scored independently on purpose, and this measure is the clearest case of why: one yea genuinely tightens verification and genuinely narrows registration, and a single combined reading would have to suppress one of those to report the other.'
    },
    'H.R. 22|119|election_security': {
      did: 'The SAVE Act as reintroduced in the 119th Congress: documentary proof of United States citizenship before a state may register an applicant for a federal election, plus a state program to check existing rolls against federal databases and remove non-citizens found on them.',
      why: 'Eligibility verification at registration and maintenance of the roll already in place are the two things this chip is about, so a yea is a vote for tighter verification.',
      more: 'Substantially the same text as H.R. 8281 in the 118th Congress, which passed the House and died in the Senate. Officials who register an applicant without the required documentation face criminal penalties. Passed the House 220-208 on 2025-04-10 (roll 102).'
    },
    'H.R. 22|119|voting_access': {
      did: 'Made documentary proof of citizenship a precondition of federal voter registration under every registration method, including applications made by mail and online.',
      why: 'A document a would-be voter has to produce before they can be registered is a narrowing of the path onto the roll, and this chip measures that path — so a yea reads here as a vote against easier access.'
    },
    'H.R. 22|119|election_integrity': {
      did: 'The SAVE Act as reintroduced in the 119th Congress: documentary proof of United States citizenship before a state may register an applicant for a federal election, plus a required program to remove non-citizens from rolls already in place.',
      why: 'This is the combined elections key the mapping was originally published under. It reads the measure the same way the safeguards chip does: a documentary citizenship check in front of registration is a verification rule, so a yea counts as support for one.'
    },
    'H.R. 22|119|voter_id': {
      did: 'Required an applicant to present a passport, a REAL ID that shows citizenship, or a birth certificate together with a photo ID before a state may register them for a federal election.',
      why: 'The document is demanded at the registration desk rather than at the ballot box, but it is still an identity document required of the voter, which is what this chip tracks — so a yea counts as support for one.'
    },
    'S. 1383|119|election_security': {
      did: 'The House substituted the SAVE America Act text into S. 1383 and passed it 218-213: no state may process a federal registration application without documentary proof of citizenship, and no official may hand an in-person voter a ballot without a valid physical photo ID.',
      why: 'Verification at registration, identification at the ballot box, roll maintenance and fraud enforcement are the four things this chip covers, and the substitute moves all four the same way — so a yea is a vote for tighter safeguards.',
      more: 'The substitute also requires a mail voter to enclose a copy of a photo ID or the last four digits of their Social Security number with an affidavit, requires states to submit their full voter lists to the Department of Homeland Security for comparison against the SAVE system and to remove non-citizens on verified information, and extends criminal penalties to an official who registers an applicant without the documentation. The Clerk’s record for roll 69 still shows the Senate short title "Veterans Accessibility Advisory Committee Act" because S. 1383 was the vehicle; the substituted House text is what was voted on and what this reading is made from.'
    },
    'S. 1383|119|voting_access': {
      did: 'A mail-form applicant must bring proof of citizenship in person to an election office by the registration deadline, and an in-person voter without photo ID may only cast a provisional ballot and has three days to cure it.',
      why: 'This chip measures the registration step and the casting step, and the substitute adds a condition to both — so a yea counts against access here, and it counts more heavily than H.R. 8281 did because that bill reached only registration.',
      more: 'The bill’s easing provisions were read and weighed rather than ignored: an alternative-evidence pathway on a sworn attestation, a required process for applicants whose documents carry a former name, free public access to a copier or scanner in government buildings, and exemptions for uniformed-services and certain elderly and disabled voters. Each of those accommodates the new requirement rather than widening access on its own, which is why the access facet is scored here instead of being declined the way it is on H.R. 1 and H.R. 5746.'
    },
    // ── The District of Columbia pair: same text, two congresses ───────────────
    'H.R. 884|119|election_security': {
      did: 'Amended the District of Columbia Home Rule Act to bar anyone who is not a United States citizen from voting in a District election, repealing the effect of the Local Resident Voting Rights Amendment Act of 2022.',
      why: 'Citizenship as a condition of casting a ballot is an eligibility safeguard, so a yea is a vote for tighter verification of who may vote. The confound is recorded rather than hidden: the vehicle amends the Home Rule Act, so a nay may be opposition to Congress overriding a local District enactment.'
    },
    'H.R. 884|119|voting_access': {
      did: 'Took the municipal vote away from non-citizen District residents who had registered under the District’s own 2022 law.',
      why: 'This chip measures who can cast a ballot, and the bill removes a casting pathway that existed — so a yea narrows access. Same Home Rule Act confound as the safeguards row above.'
    },
    'H.R. 192|118|election_security': {
      did: 'Amended the District of Columbia Home Rule Act to bar non-citizens from voting in District elections. Same text as H.R. 884 in the 119th Congress, which passed the House a year later.',
      why: 'Citizenship as a condition of voting is an eligibility safeguard, so a yea counts as support on this chip. Same Home Rule Act confound: a nay may be a vote about Congress overriding a local District law rather than about non-citizen voting.'
    },
    'H.R. 192|118|voting_access': {
      did: 'Repealed the District law that let non-citizen residents vote in District municipal elections.',
      why: 'It removes a casting pathway that existed, so on the access chip a yea narrows who may vote. Same Home Rule Act confound as the safeguards row above.'
    },
    // ── The three access bills of the 117th ────────────────────────────────────
    'H.R. 1|117|voting_access': {
      did: 'The For the People Act: required every state to offer automatic voter registration through motor-vehicle and other agencies, same-day registration and online registration, and restricted voter-roll purges. It also required at least fifteen consecutive days of early voting and no-excuse absentee voting with prepaid return postage.',
      why: 'Every one of those provisions widens a registration or a casting pathway, which is exactly what this chip measures — so a yea is a vote to expand access.',
      more: 'The bill also restored voting rights to citizens released from incarceration, and later titles cover redistricting commissions, small-donor public financing and ethics. Its election-security title is deliberately NOT mapped to the safeguards chip: the same bill mandates durable paper ballots and risk-limiting audits while permitting a sworn statement in lieu of documentary ID and restricting list maintenance, so one yea covers both directions of that facet and can honestly record neither. Passed the House 220-210 on 2021-03-03 (roll 62).'
    },
    'H.R. 4|117|voting_access': {
      did: 'The John R. Lewis Voting Rights Advancement Act: restored Voting Rights Act preclearance on a rolling twenty-five-year coverage formula, and added a practice-based review list holding specific access-narrowing changes — new documentary or photo-ID rules, polling-place closures, voter-roll purges — behind federal review before they take effect.',
      why: 'The bill’s whole operative effect is to gate changes that would narrow registration or casting, so a yea counts as a vote to protect access.',
      more: 'It also restored a private right of action. The bill adds no verification requirement, ballot-handling rule or audit provision of its own, which is why it is mapped to the access facet only — scoring it on the safeguards chip would test members on a question the text does not ask. Passed the House 219-212 on 2021-08-24 (roll 260).'
    },
    'H.R. 5746|117|voting_access': {
      did: 'The Freedom to Vote: John R. Lewis Act, moved as a House amendment to a Senate shell bill: automatic and same-day registration, at least two weeks of early voting including weekends, no-excuse mail voting with ballot tracking and a minimum number of drop boxes, and Election Day as a public holiday.',
      why: 'Each of those provisions widens a registration or a casting pathway, so a yea is a vote to expand access.',
      more: 'The Clerk’s vote description for this roll still reads "NASA Enhanced Use Leasing Extension Act of 2021" because H.R. 5746 was the vehicle the House used, which is why the row is identified by citation and question rather than by title. The measure incorporates H.R. 1’s text, and its election-security title is unmapped for the same internal-split reason. Passed the House 220-203 on 2022-01-13 (roll 9).'
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // BEYOND THE ELECTION FAMILY. Ten measures, twenty-three pairs, chosen the way the
    // note above describes: text on file first, then reach. Every one of them is a
    // bill a member's dossier opens on for one of the busiest chips in the taxonomy,
    // and every one of them was rendering: Passage on the question "On Passage".
    // ═══════════════════════════════════════════════════════════════════════════

    // ── Reconciliation, 117th: relief, then climate-and-drugs ──────────────────
    'H.R. 1319|117|family_support': {
      did: 'The American Rescue Plan: $1,400-per-person recovery rebates, and a child tax credit raised to $3,000 per child — $3,600 under age six — made fully refundable and paid out in advance instalments. It also funded child care stabilisation, Head Start, and emergency rental and homeowner assistance.',
      why: 'Cash and credits paid directly to households with children are the largest single line of the act, and this chip measures federal support for families — so a yea is a vote to expand it.',
      more: 'The credit expansion and the advance payments were written for one year only and lapsed at the end of 2021, so the row records a vote to create the expansion rather than to make it permanent. Enacted as Public Law 117-2 on 2021-03-11.'
    },
    'H.R. 1319|117|econ_workers': {
      did: 'Extended the pandemic unemployment compensation programs — the federal weekly supplement, Pandemic Unemployment Assistance and Pandemic Emergency Unemployment Compensation — through September 2021, and exempted a portion of 2020 unemployment benefits from income tax.',
      why: 'Both provisions put money in the hands of people who had lost work, which is what this chip measures, so a yea counts as support here. Narrow link: one title of a $1.9 trillion relief act, extending programmes already running rather than changing anything about wages, bargaining or job protection.'
    },
    'H.R. 1319|117|national_debt': {
      did: 'Roughly $1.9 trillion of pandemic relief, moved through budget reconciliation as emergency spending with no offsetting revenue or cuts.',
      why: 'This chip measures whether a vote reduces federal borrowing, and an unoffset act increases it — so a yea counts against. The confound is named rather than smoothed: the deficit effect is a consequence of the relief, not its stated purpose, which is why this mapping sits well below the family-support row that carries the same vote.'
    },
    'H.R. 5376|117|climate_action': {
      did: 'The Inflation Reduction Act extended and expanded the production and investment tax credits for wind, solar, geothermal, biomass and hydropower, and funded home efficiency, clean vehicles and industrial decarbonisation — the act’s largest spending component.',
      why: 'Paying for lower-carbon generation and equipment at that scale is the core of what this chip measures, so a yea counts as support. The same act’s offshore-leasing mandates cut the other way; they are recorded on the energy-production row rather than netted out of this one.'
    },
    'H.R. 5376|117|energy_production': {
      did: 'Raised offshore royalty rates, but also directed Interior to accept the highest bid for Gulf of Mexico Lease Sale 257 and to hold Lease Sales 258, 259 and 261, and conditioned new wind and solar rights-of-way on first offering oil and gas leases.',
      why: 'Those sections require federal acreage to be offered for oil and gas, so on production a yea counts as support — the same yea that counts as support on climate action, because the enacted text does both. Narrow link: a few leasing sections inside a reconciliation act whose energy weight is overwhelmingly clean.'
    },
    'H.R. 5376|117|health_drug_prices': {
      did: 'Required Medicare to negotiate maximum prices for high-spend brand-name drugs from 2026, scaling from 10 drugs to 20 by 2029, and capped insulin cost sharing and Medicare Part D out-of-pocket spending.',
      why: 'Setting a ceiling on what Medicare pays and on what a beneficiary pays at the counter is exactly what this chip measures, so a yea is a vote to lower drug prices.'
    },

    // ── Infrastructure, 117th ──────────────────────────────────────────────────
    'H.R. 5376|117|national_debt': {
      did: 'Title I, Subtitle A of the same act is captioned “Deficit Reduction”: a 15% corporate alternative minimum tax, a 1% excise on stock repurchases, and multi-year funding for Internal Revenue Service enforcement.',
      why: 'Those three raise revenue against the act’s spending, so a yea counts as support here — the opposite reading from the unoffset packages elsewhere on this list. Narrow link, weighted 45: the act’s net fiscal effect is contested and only that subtitle is read here.'
    },
    'H.R. 3684|117|infrastructure': {
      did: 'The Infrastructure Investment and Jobs Act authorised and appropriated funds for roads and bridges, rail, transit, ports, airports, the electric grid, drinking water and wastewater systems, and broadband. Division A is the surface transportation reauthorisation.',
      why: 'Funding the physical networks is the whole subject of the act and of this chip, so a yea counts as support.'
    },
    'H.R. 3684|117|national_debt': {
      did: 'The act’s new spending was only partially offset, so it was scored as adding to the deficit.',
      why: 'A yea increases federal borrowing, which is what this chip counts against. Same confound as the other unoffset packages on this list: the deficit effect is a by-product of the infrastructure spending rather than the act’s purpose, which is why the mapping is weighted low.'
    },

    // ── The 118th debt-limit deal ──────────────────────────────────────────────
    'H.R. 3746|118|permitting_reform': {
      did: 'Division C, Title III narrowed the scope of National Environmental Policy Act administrative review, set page and time limits on environmental impact statements, and designated a single lead agency for each project.',
      why: 'This chip measures how long a federal review takes before a project can proceed, and every one of those changes shortens it — so a yea counts as support.'
    },
    'H.R. 3746|118|energy_production': {
      did: 'Sec. 324 ratified every existing federal authorisation for the Mountain Valley Pipeline, directed the issuance of any that remained, and removed them from judicial review.',
      why: 'Clearing a named pipeline to be built is a vote for production on this chip. The confound is real and on the face: Sec. 324 is one section of a debt-limit deal, so a nay may be about the spending caps, the IRS rescission or the SNAP work requirements rather than about the pipeline.'
    },

    // ── CHIPS, 117th ───────────────────────────────────────────────────────────
    'H.R. 4346|117|tech_innovation': {
      did: 'The CHIPS and Science Act: Division A created the CHIPS for America Fund and its financial assistance for semiconductor fabrication, assembly, testing and packaging, and Division B authorised research and innovation programs across NSF, NIST, DOE and NASA.',
      why: 'Paying to build domestic chip capacity and to fund the federal science agencies is the act’s named subject and this chip’s, so a yea counts as support.'
    },
    'H.R. 4346|117|national_debt': {
      did: 'The CHIPS funds were appropriated as new spending without offsetting revenue or cuts.',
      why: 'A yea increases federal borrowing, which this chip counts against. Narrow link, named rather than smoothed: the deficit effect is a by-product of the semiconductor programme rather than its purpose, and the act changes no fiscal rule.'
    },

    // ── Two defence authorisations, two congresses ─────────────────────────────
    'H.R. 2670|118|strong_defense': {
      did: 'The annual defence authorisation for fiscal year 2024: the topline, and the procurement, research, operation and maintenance, military personnel, military construction and Department of Energy national-security programs under it.',
      why: 'Authorising and equipping the armed forces for the year is what this chip measures, so a yea counts as support.'
    },
    'H.R. 2670|118|privacy_rights': {
      did: 'Section 7902 of the enacted act extended Title VII of the Foreign Intelligence Surveillance Act — the authority section 702 collection against targets outside the United States runs under — through April 19, 2024.',
      why: 'Extending warrantless collection cuts against this chip, so a yea counts against it. The confound is on the face: this is one section of a whole defence authorisation, which is why it is weighted as a provision-level slice and not as the bill’s headline.'
    },
    'S. 1071|119|strong_defense': {
      did: 'The annual defence authorisation for fiscal year 2026: Divisions A through H authorise Department of Defense activities, military construction, Department of Energy national security programs, personnel strengths, and the Intelligence Authorization Act for the same year.',
      why: 'Authorising and equipping the armed forces for the year is what this chip measures, so a yea counts as support. The confound is on the face: the enacted text folds in fourteen separately titled Acts, several unrelated to defence posture, which is why the mapping is weighted 80 rather than 100.'
    },
    'S. 1071|119|israel_support': {
      did: 'Title XII, Subtitle D — headed "Matters Relating to Israel" — extended anti-tunnel and counter-unmanned-systems cooperation and required a report on joint exercises, and Sec. 1657 made available up to $60,000,000 for Iron Dome components, $40,000,000 for David’s Sling and $100,000,000 for Arrow 3, each through co-production in the United States.',
      why: 'Money and joint programs for Israeli missile defence are what this chip measures, so a yea enacts them. The confound: that subtitle is a small share of an eight-division omnibus, so a nay may be about the rest of the bill — which is why the mapping is weighted 35.'
    },

    // ── Firearms, 117th: one yea, two chips, opposite directions ───────────────
    'S. 2938|117|gun_safety': {
      did: 'Required an enhanced background check review for buyers aged 18 to 20, created federal straw purchasing and firearms trafficking offences, and extended the domestic violence possession prohibitor to dating partners. It also funded state crisis intervention programmes.',
      why: 'Each of those narrows who may acquire or keep a firearm, which is what this chip measures, so a yea counts as support.'
    },
    'S. 2938|117|gun_rights': {
      did: 'The same Title II provisions hold an under-21 purchase while the enhanced review runs, and bar a new class of person — a dating partner with a qualifying domestic violence conviction — from possessing a firearm.',
      why: 'This chip measures whether a vote widens or narrows lawful access, and the act narrows it — so the same yea that counts as support on gun safety counts against here. Both readings are recorded because the enacted text does both.'
    },

    // ── Surveillance, 118th ────────────────────────────────────────────────────
    'H.R. 7888|118|privacy_rights': {
      did: 'Reauthorised Title VII of the Foreign Intelligence Surveillance Act, including section 702, for two years and widened the definition of an electronic communications service provider. The same act repealed "abouts" collection authority, required FBI supervisory and attorney approval for U.S.-person queries, and added penalties and 180-day Justice Department audits.',
      why: 'The net effect is an extension of warrantless collection, so a yea counts against this chip. The countervailing reforms in the second sentence are why the mapping is held at 85 rather than 100 — calling this one unmixed would misstate the text.'
    },
    'H.R. 7888|118|congress_oversight': {
      did: 'Revoked the FBI’s statutory reporting exemption and added mandatory annual and quarterly reports to the intelligence and judiciary committees, required a Justice Department Inspector General report on querying practices, and required the Director of National Intelligence to notify the intelligence committees within seven days of any significant unauthorised disclosure of section 702 information.',
      why: 'Every one of those creates a reporting duty running to Congress where none existed, and nothing in the act reduces one, so a yea counts as support on this chip. Weighted 45 because the act’s operative purpose is the two-year section 702 extension, not the oversight machinery built around it.'
    },

    // ── Marriage, 117th: the merits and the preemption question, kept apart ────
    'H.R. 8404|117|lgbtq_rights': {
      did: 'Repealed the Defense of Marriage Act’s definitions of marriage as between one man and one woman and of spouse as a person of the opposite sex, and required every state to give full faith and credit to a marriage valid where it was performed.',
      why: 'Federal recognition and interstate recognition of same-sex marriage are what this chip measures, so a yea counts as support. No religious-liberty contradiction is scored against the same vote, because the enacted text expressly states it does not affect religious liberties and does not require a religious organisation to serve a marriage.'
    },
    'H.R. 8404|117|states_federal_power': {
      did: 'Barred anyone acting under colour of state law from refusing to honour another state’s marriage record, or from denying a right that arises from such a marriage, enforceable by the Attorney General and by the couple themselves.',
      why: 'That rule replaces a state’s own recognition law with a federal one, so on the preemption question a yea counts against state authority. This row is coded on preemption alone — the merits of the marriage question are the LGBTQ rights row on the same vote.',
      more: 'The provision is section 4 of the act, which adds a new 28 U.S.C. 1738C. The private right of action runs to the person harmed by the refusal, alongside the Attorney General’s.'
    },

    // ═════════════════════════════════════════════════════════════════════════════
    // THE SIX PAIRS THE SEPTEMBER 2026 DENSIFICATION MAPPED. Not a new pass over the
    // corpus: exactly the six mappings written by
    // 20260917000000_vr_identity_and_thin_key_densification.sql, which arrived with
    // section citations and an identity summary already read out of primary text and
    // then rendered on the face as "Voted Yea on the question “On Passage”" over
    // "because that is one of the subjects this measure was mapped to". Two of the
    // three H.R. 8595 rows and both H.R. 1968 rows hang off ONE division of a much
    // larger vehicle, so each line says which division it is reading — a reader who
    // cannot tell an appropriations bill from the elections division inside it cannot
    // check the chip, which is the whole point of this lane.
    // ═════════════════════════════════════════════════════════════════════════════

    // ── H.R. 8595: an appropriations vehicle carrying the SAVE America Act as Division B
    'H.R. 8595|119|election_security': {
      did: 'Division B of the fiscal 2027 national security and State Department appropriations bill is the Safeguard American Voter Eligibility Act. Sec. 102 amends the National Voter Registration Act so that no state may accept and process a federal registration application under any method — mail, motor-vehicle or agency — unless the applicant presents documentary proof of United States citizenship, and it fixes the acceptable-document list in federal law.',
      why: 'Verifying citizenship before an applicant is added to the roll is the core of what this chip measures, so a yea counts as support for tighter verification.',
      more: 'The document list is a REAL ID-compliant credential indicating citizenship, a United States passport, a military identification card whose service record shows a United States place of birth, or a Federal, State or Tribal photo identification showing the same. Sec. 102 also requires a voter registration agency to record receipt of the proof for each applicant. Passed the House 217-209 on 2026-07-15 (roll 247); received in the Senate and not enacted.'
    },
    'H.R. 8595|119|voter_id': {
      did: 'Sec. 103 of the same Division B adds a new section 303A to the Help America Vote Act: an election official may not hand an in-person voter a federal ballot without a valid physical photo identification, and a mail voter must enclose a copy of one, or the last four digits of a Social Security number with an affidavit.',
      why: 'This chip tracks identity documents demanded of the voter, and this is the first instrument in the record to demand one at the casting step rather than at registration — so a yea counts as support.',
      more: 'Section 303A(c) fixes what counts: a state driver’s licence or motor-vehicle identification card bearing a photo and an expiration date, a United States passport, a military identification, or a Tribal photo identification with an expiration date. Section 303A(d) requires every state to notify a registrant of the requirement when they apply, and online registration systems to do so before the application is completed.'
    },
    'H.R. 8595|119|voting_access': {
      did: 'Both steps of casting a federal ballot are gated by Division B: documentary proof of citizenship before a state may put an applicant on the roll under Sec. 102, and photo identification before an official may issue or count a ballot under Sec. 103.',
      why: 'This chip measures how hard it is to get registered and to vote, and the division adds a document at each step — so the same yea that counts as support on the safeguards chip counts against here, and both readings are recorded because the text does both.',
      more: 'The provisions running the other way were read and are named rather than dropped: a three-day cure for a provisional ballot, a state affidavit of religious objection to being photographed, an alternative-evidence process for an applicant who cannot produce a listed document, disability accommodations on the mail form, a substitute of the last four digits of a Social Security number for a mail voter who cannot obtain a copy after reasonable efforts, outright exemption for absent uniformed-services voters and for voters covered by the Voting Accessibility for the Elderly and Handicapped Act, and free public access to a copier or scanner in courts, libraries and police stations. Each of those accommodates the new requirement rather than removing it, which is why the row is scored directional instead of being declined.'
    },

    // ── H.J.Res. 44: the instrument, not the firearms merits
    'H.J.Res. 44|118|gov_regulation': {
      did: 'One operative clause: Congress disapproves the Bureau of Alcohol, Tobacco, Firearms, and Explosives final rule “Factoring Criteria for Firearms with Attached ‘Stabilizing Braces’” (2021R-08F, 88 Fed. Reg. 6478), and “such rule shall have no force or effect.”',
      why: 'This chip measures whether a vote strikes a federal rule off the books, and a Congressional Review Act disapproval does exactly that — so a yea counts as support here, and under chapter 8 of title 5 it also bars the agency from reissuing the rule in substantially the same form without new legislation. The firearms merits of the rule are the gun chips on the same vote; this row is about the instrument.',
      more: 'Passed the House 219-210 on 2023-06-13 (roll 252) and failed in the Senate 49-50 on 2023-06-22 (roll 171), so no enrolled or enacted text exists and the engrossed House text is what both chambers voted on.'
    },

    // ── H.R. 1968: a full-year CR whose divisions B and C are not appropriations
    'H.R. 1968|119|health_rural': {
      did: 'Division B extended the health authorities due to lapse on March 31, 2025, and they are disproportionately the rural ones: the Medicare-Dependent Hospital Program for small rural hospitals (Sec. 2202), the low-volume inpatient adjustment (Sec. 2201), the ground-ambulance payment add-on (Sec. 2203), the telehealth flexibilities that let rural health clinics and federally qualified health centers act as the distant site (Sec. 2207), and funding for community health centers, the National Health Service Corps and teaching health centers (Sec. 2101).',
      why: 'Keeping the payment adjustments small rural hospitals run on is what this chip measures, so a yea counts as support and a nay lets them expire. The confound is on the face and is why the mapping is narrow: this is one division of a government-funding bill, so a nay may be about the appropriations rather than the extenders.',
      more: 'Title IV of the same division also delayed the Medicaid disproportionate-share hospital allotment reductions to FY2026. Enacted as Public Law 119-4 on 2025-03-15.'
    },
    'H.R. 1968|119|immig_fentanyl': {
      did: 'Division C, Sec. 3105 extended the Drug Enforcement Administration’s temporary order placing fentanyl-related substances in schedule I as a class, striking “March 31, 2025” and inserting “September 30, 2025”.',
      why: 'Class-wide scheduling is the federal handle on fentanyl analogues that this chip measures, and it would have lapsed that month without the extension — so a yea counts as support. Same confound as the rural row on this bill, and the same reason the mapping is narrow: one section of a funding vehicle is not the vehicle.',
      more: 'Permanent class-wide placement did not arrive until the HALT Fentanyl Act (S. 331), enacted in July 2025, which may be its own row on this list. H.R. 1968 was enacted as Public Law 119-4 on 2025-03-15.'
    },

    // ══ Existing-inventory cleanup: measures already mapped and already listed on the
    // Official Record face, but carrying only the derived fallback line. Written from the
    // vr-measure-identity summary and the mapping’s own rationale — same sourcing law as above.
    // ── S. 1071 · 119th Congress ──
    'S. 1071|119|immig_fentanyl': {
      did: 'A subtitle inside the FY2026 defense authorization — the BUST Fentanyl Act — extended the Fentanyl Sanctions Act, added fentanyl trafficking to the annual international narcotics-control report, and ordered a study of trafficking originating in China.',
      why: 'This chip tracks measures aimed at the fentanyl supply, and a yea enacts new sanctions authority and reporting directed at traffickers. Narrow link: one named subtitle inside a defence omnibus, working through sanctions and reporting rather than a change to enforcement on the ground.'
    },
    'S. 1071|119|guard_authority': {
      did: 'One section of the FY2026 defense authorization let the governor of a state that has declared a disaster emergency order that state’s full-time National Guard members onto state disaster-response duty.',
      why: 'This chip asks who directs the Guard, and the section hands a governor direct use of federally paid Guard personnel. Narrow link: the authority needs the Defense Secretary’s consent, the state reimburses it, and it is capped at fourteen days a member each year — a real shift, not a referendum on Guard command.'
    },
    // ── H.R. 1 · 119th Congress ──
    'H.R. 1|119|border_security': {
      did: 'The 2025 reconciliation act appropriated new funding for border enforcement and immigration operations.',
      why: 'Money for enforcement staffing and operations is what this chip measures, so a yea funds it. Supporting link: one appropriation inside an act whose main business is taxes and spending.'
    },
    'H.R. 1|119|lower_taxes': {
      did: 'Made permanent and extended the individual and business tax provisions of the 2017 tax act, and raised the maximum child tax credit to $2,200 per child, indexed for inflation from 2026.',
      why: 'Lower income and business taxes are this chip’s subject and they are the act’s headline title, so a yea is a direct vote to cut and extend them.'
    },
    'H.R. 1|119|cut_spending': {
      did: 'Reduced federal Medicaid spending, tightened Medicaid enrolment and eligibility, and raised the SNAP able-bodied-adult work-requirement age from 55 to 65.',
      why: 'This chip measures votes that cut federal outlays, and those provisions are where the act does it, so a yea counts as support. Supporting link: the same act’s tax title is read on its own chip rather than netted out here.'
    },
    'H.R. 1|119|healthcare': {
      did: 'Reduced federal Medicaid spending and tightened Medicaid enrolment and eligibility processes.',
      why: 'This chip measures whether coverage gets easier to obtain and keep, and tighter eligibility with less federal money behind it moves the other way — so the same yea that counts for the act’s tax title counts against the issue here.'
    },
    'H.R. 1|119|lands_energy': {
      did: 'Loosened restrictions on oil, gas and coal leasing on federal land and lowered the minimum royalty rates paid on it.',
      why: 'Opening more federal acreage to extraction is what this chip tracks, so a yea counts as support for development. Narrow link: the leasing title is one part of a reconciliation act built mainly around taxes and spending.'
    },
    // ── H.R. 8800 · 119th Congress ──
    'H.R. 8800|119|strong_defense': {
      did: 'The FY2027 defense authorization: procurement including aircraft and ships, active-duty and reserve strength levels, military pay and health care, and the Energy Department’s nuclear-security programs. Passed the House 216-212 and was not enacted.',
      why: 'Authorising what the armed forces may buy and field is this chip’s core question, so a yea authorises them. The same bill also carried unrelated social-policy riders, so passage is not a pure defence-posture signal.'
    },
    'H.R. 8800|119|israel_support': {
      did: 'A subtitle headed "Matters relating to Israel" extended the U.S. war reserve stockpile there, anti-tunnel cooperation and joint work against drones, and set up a U.S.–Israel defense technology initiative.',
      why: 'This chip tracks U.S. security cooperation with Israel and a yea enacts all four. Narrow link: one subtitle inside a defence authorisation, not the bill’s purpose.'
    },
    // ── H.R. 8595 · 119th Congress ──
    'H.R. 8595|119|strong_defense': {
      did: 'Made the FY2027 appropriations for national security and State Department programs — the money behind those accounts for the year.',
      why: 'This chip measures whether security programs get funded, and a yea funds them. Supporting link: an appropriations bill for State and related programs decides amounts, not defence posture.'
    },
    'H.R. 8595|119|israel_support': {
      did: 'Directed not less than $3.3 billion in Foreign Military Financing grants to Israel alone and barred moving the U.S. embassy out of Jerusalem, while cutting off funds to UNRWA and to the U.N. human-rights bodies investigating Israel.',
      why: 'Money and diplomatic backing are the two things this chip reads, and the text moves both the same way — so a yea counts as support.'
    },
    'H.R. 8595|119|pro_life': {
      did: 'Carried the standing foreign-aid rider barring U.S. development funds from paying for abortion as a method of family planning or from coercing anyone into one.',
      why: 'Restricting federal money for abortion is what this chip reads as a pro-life provision, so a yea keeps that restriction in force. Narrow link, recorded neutrally: a long-standing rider carried forward, not a new position taken on this vote.'
    },
    'H.R. 8595|119|gov_services': {
      did: 'A full-year appropriations act funding the State Department, international organisations and commissions, related programs and independent agencies through FY2027.',
      why: 'Keeping federal operations and programs funded is what this chip measures, and a yea is the appropriation that does it.'
    },
    // ── H.R. 7008 · 119th Congress ──
    'H.R. 7008|119|gov_transparency': {
      did: 'Required a Member to file public notice with the Clerk seven to fourteen days before selling a covered investment, published online, and to withdraw the notice if the sale did not happen.',
      why: 'The bill enforces itself through disclosure a reader can look up, so a yea widens what is public about a Member’s finances. Supporting link: it is a stock-trading bill, not a general transparency measure.'
    },
    'H.R. 7008|119|stock_trading_ban': {
      did: 'Barred Members of Congress, their spouses and dependent children from buying individual stocks, with a penalty of at least $2,000 or 10% of the trade and forced sale of a barred purchase.',
      why: 'This chip is the ban itself, so a yea is a direct vote for it.'
    },
    // ── H.R. 1181 · 119th Congress ──
    'H.R. 1181|119|states_federal_power': {
      did: 'Expressly pre-empted any state or local law regulating how merchant category codes are assigned to firearms retailers, replacing whatever a state had enacted with the federal rule.',
      why: 'This chip asks whose rule governs, and an express pre-emption clause moves the answer to Washington whichever way the state had legislated. Narrow link: one subsection — but pre-emption is the whole of the question this chip asks.'
    },
    'H.R. 1181|119|gun_rights': {
      did: 'Barred payment-card networks from requiring or assigning a merchant category code that singles out a firearms retailer, and told the Justice Department to enforce it.',
      why: 'That code is what would let a card network flag a firearms purchase, so a yea removes a gun-purchase tracking mechanism — this chip’s direct subject.'
    },
    'H.R. 1181|119|privacy_rights': {
      did: 'Stopped card networks and processors from building a transaction record that flags a customer as having shopped at a gun store, enforced by the Attorney General through complaints, investigations and injunctions.',
      why: 'This chip measures limits on what companies may record about a person, and the ban is one — the same prohibition the gun-rights row reads from the firearms side, read here on the purchase-data side.'
    },
    // ── H.R. 6955 · 119th Congress ──
    'H.R. 6955|119|econ_smallbiz': {
      did: 'Rewrote parts of federal banking law to widen small-bank and Main Street lending capacity: a three-year capital phase-in for new banks, a lower leverage ratio for certain rural community banks, and higher asset thresholds before a range of requirements bite.',
      why: 'Small businesses borrow from the banks this bill loosens the rules on, and widening that access to capital is the bill’s stated purpose — so a yea backs it.'
    },
    'H.R. 6955|119|gov_regulation': {
      did: 'Required financial regulators to tailor their actions to an institution’s size, risk profile and business model, to review their own rules more often, and to leave more small banks outside various fees, reporting duties and examination cycles.',
      why: 'This chip measures whether federal rules on business get lighter, and easing bank regulation is what the bill operatively does — so a yea enacts that relief. Supporting link: the relief runs to banks, not to business generally.'
    },
    'H.R. 6955|119|econ_corp_account': {
      did: 'Let regulators approve certain bank mergers without considering whether the merger is non-competitive or monopolistic, and raised the asset threshold above which a financial holding company needs Federal Reserve approval to buy another company.',
      why: 'This chip measures the checks a large firm has to clear, and both changes remove one — so the same yea that counts as relief on the red-tape chip counts against accountability here.'
    },
    // ── S. 331 · 119th Congress ──
    'S. 331|119|immig_fentanyl': {
      did: 'Permanently placed fentanyl-related substances as a class in Schedule I, replacing the temporary scheduling order that had been renewed by Congress since 2018.',
      why: 'Making the class-wide ban permanent is the federal response to the fentanyl supply this chip tracks, so a yea is a direct vote for it.'
    },
    'S. 331|119|tough_on_crime': {
      did: 'Applied the quantity thresholds and mandatory-minimum sentences already carried by fentanyl analogues to the whole class of fentanyl-related substances — 100 grams or more triggers a ten-year mandatory minimum.',
      why: 'Longer mandatory sentences reached by a lower threshold is what this chip measures, so a yea counts as support. Supporting link: the act’s subject is scheduling; the sentencing effect follows from it.'
    },
    'S. 331|119|health_mental': {
      did: 'Set the federal answer to fentanyl-related substances in criminal-penalty terms — permanent Schedule I placement with mandatory minimums — while adding a registration pathway so researchers can still study them.',
      why: 'This chip reads addiction as a health question, and an enforcement-first answer moves away from treatment, so a yea counts against it here. Narrow link: the research-registration provisions cut the other way and are part of why this link is held narrow.'
    },
    // ── S. 2 · 119th Congress ──
    'S. 2|119|deportations': {
      did: 'Appropriated $44 billion through FY2029 for interior immigration enforcement — ICE and CBP staffing, removal transportation, detention facilities and fleet, government lawyers for removal proceedings, and at least $350 million for detainers, custodial transfers and arrests.',
      why: 'Removal operations are this chip’s subject and they are 63% of the act, so a yea funds them. The detention money comes with a bar on using it to release anyone encountered into the community.'
    },
    'S. 2|119|border_security': {
      did: 'Appropriated $9.55 billion to hire, pay, train and equip Border Patrol agents and support staff, and $3.45 billion for inspection equipment at ports of entry, air and marine response platforms, surveillance technology and the biometric entry-exit system.',
      why: 'Personnel and technology at the border are what this chip measures, and a yea funds both — around $26 billion of the act counting the CBP hiring in its enforcement title.'
    },
    'S. 2|119|immig_fentanyl': {
      did: 'Two of the six purposes in the act’s border-technology section name narcotics: new inspection equipment to catch illicit drugs entering at ports of entry, and money for combating drug trafficking "including fentanyl and its precursor chemicals".',
      why: 'This chip tracks interdiction capability aimed at fentanyl, and a yea funds detection equipment at the crossings. Supporting link: that section is 5% of the act and fentanyl is two of its six purposes.'
    },
    'S. 2|119|tough_on_crime': {
      did: 'Appropriated $7.45 billion for Homeland Security Investigations agents — money the act expressly reserves for work OTHER than immigration and customs enforcement — including $108.5 million for child-exploitation investigators, forensic analysts and training for state and local police.',
      why: 'That is federal criminal investigative capacity rather than immigration money, which is what this chip counts, so a yea funds it. Narrow link: it adds investigators rather than changing any offence or sentence, and the act’s immigration titles are read on their own chips.'
    },
    // ── H.R. 7888 · 118th Congress ──
    'H.R. 7888|118|strong_defense': {
      did: 'Reauthorised section 702 of the Foreign Intelligence Surveillance Act for two years — the warrantless collection of foreign targets’ communications — while repealing "abouts" collection and adding FBI approval requirements, penalties and audits for U.S.-person queries.',
      why: 'This chip counts votes that sustain the tools the national-security agencies rely on, and a yea keeps a core collection authority alive. Supporting link: it is an intelligence authority, not a force-structure or funding vote — and the same bill is read on the privacy chip from the other side.'
    },
    // ── H.R. 5009 · 118th Congress ──
    'H.R. 5009|118|strong_defense': {
      did: 'The FY2025 defense authorization: Pentagon programs and military construction, Energy Department nuclear-security programs, and a servicemember quality-of-life title covering pay, housing, health care and family support.',
      why: 'Authorising what the armed forces may field and what they pay their people is this chip’s core question, so a yea is a vote for it.'
    },
    'H.R. 5009|118|lgbtq_rights': {
      did: 'Barred TRICARE from covering treatment for gender dysphoria that could result in sterilisation for a military dependent under 18.',
      why: 'This chip measures whether federal policy protects or restricts LGBTQ+ people, and removing a category of care for transgender minors restricts it — so a yea counts against the issue here even on a bill that otherwise funds the force. This provision is the reason the roll split against party lines.'
    },
    // ── H.R. 2670 · 118th Congress ──
    'H.R. 2670|118|israel_support': {
      did: 'A subtitle headed "Matters Relating to Israel" ran eight sections — anti-tunnel and counter-drone cooperation, directed-energy work, aerial refuelling assistance and tanker transfer rules — and a further section made up to $200 million available for co-production of Iron Dome, David’s Sling and Arrow 3 components in the United States.',
      why: 'Joint weapons programs and security aid are what this chip reads, and a yea enacts all of them. Narrow link: it is one subtitle inside a defence authorisation — the widest of the three NDAAs on file, but still not the bill’s purpose.'
    },
    // ── H.R. 3746 · 118th Congress ──
    'H.R. 3746|118|gov_services': {
      did: 'Tightened work requirements for Temporary Assistance for Needy Families and raised the SNAP work-requirement age for able-bodied adults without dependents to 54, while shrinking the pool of discretionary exemptions states may grant.',
      why: 'This chip measures whether the safety net reaches more people or fewer, and narrower eligibility moves it the other way — so a yea counts against the issue here, notwithstanding the bill’s new exemptions for homeless people, veterans and former foster youth.'
    },
    'H.R. 3746|118|edu_college_cost': {
      did: 'Ended the pause on federal student-loan payments, restarted interest accrual, and barred the Education Secretary from extending the pause again without new authority from Congress.',
      why: 'What a borrower pays is what this chip measures, and restarting payments and interest raises it — so a yea counts against the issue. Supporting link: it is one division of a debt-ceiling deal, not a student-loan bill.'
    },
    // ── H.J.Res. 44 · 118th Congress ──
    'H.J.Res. 44|118|gun_safety': {
      did: 'Voided the ATF rule that had brought pistols with stabilising braces under the National Firearms Act, and — under the Congressional Review Act — barred a substantially similar rule without new authority from Congress.',
      why: 'The rule it voids was a registration and background-check instrument, so removing it loosens the regime this chip measures and a yea counts as opposition here. Supporting link: no statute this chip tracks is touched — no background check, no storage rule, no trafficking provision — and the all-or-nothing form of a disapproval resolution gave members no way to split the rule from the regime.'
    },
    'H.J.Res. 44|118|gun_rights': {
      did: 'Disapproved the ATF rule that reclassified braced pistols as short-barrelled rifles, which had required owners to register a lawfully held configuration, pay a tax stamp, permanently alter it or surrender it.',
      why: 'Protection against registry and licensing burdens is inside this chip’s scope, so a yea is a vote for the right as the chip defines it — and it forecloses a similar rule in future. The resolution passed the House and failed in the Senate 49-50, so it never took effect.'
    },
    // ── H.R. 4346 · 117th Congress ──
    'H.R. 4346|117|strong_defense': {
      did: 'Set up the CHIPS for America Defense Fund for the national microelectronics research network, and an International Technology Security and Innovation Fund aimed at securing semiconductor supply chains.',
      why: 'Supply of the chips defence systems are built from is what those two funds address, so a yea backs it. Narrow link: this is an industrial-policy act, and the defence funds are two of its four.'
    },
    'H.R. 4346|117|econ_growth': {
      did: 'Expanded federal financial assistance for building and equipping semiconductor plants in the United States, including a dedicated program for mature technology nodes.',
      why: 'This chip reads measures meant to grow domestic industry, and the incentives are the act’s operative mechanism — so a yea counts as support. Supporting link: the act works by subsidy rather than by removing regulation.'
    },
    // ── H.R. 5376 · 117th Congress ──
    'H.R. 5376|117|lower_taxes': {
      did: 'Imposed a 15% minimum tax on the reported income of corporations earning over $1 billion and a 1% excise tax on stock buybacks.',
      why: 'On their face those are corporate tax increases, which is what this chip measures — so a yea counts against it. The same two sections are read as accountability measures on the corporate chip; the record shows both readings rather than picking the flattering one.'
    },
    'H.R. 5376|117|econ_corp_account': {
      did: 'Imposed a 15% minimum tax on the adjusted financial-statement income of corporations above $1 billion, and a 1% excise tax on publicly traded companies’ stock repurchases.',
      why: 'Both reach large firms that report high profits and pay little, which is this chip’s subject — so a yea counts as support here, the opposite reading of the same sections from the tax chip.'
    },
    'H.R. 5376|117|healthcare_costs': {
      did: 'Extended the enlarged Affordable Care Act premium tax credits through 2025, including for households above 400% of the poverty line, and capped insulin and out-of-pocket costs for Medicare enrollees.',
      why: 'What a household pays for coverage and medicine is what this chip measures, and those provisions lower it — so a yea counts as support.'
    },
    // ── S. 3373 · 117th Congress ──
    'S. 3373|117|healthcare': {
      did: 'Opened VA health-care enrolment and treatment to veterans exposed to toxic substances, and set presumptions of service connection for conditions tied to burn pits and Agent Orange.',
      why: 'This chip measures whether care becomes easier to get, and the act adds a population to a health system rather than only paying cash benefits — so a yea counts as support. Supporting link: it widens one federal system, not coverage generally.'
    },
    'S. 3373|117|veterans': {
      did: 'Expanded VA eligibility, presumptions of service connection and benefits for veterans exposed to toxic substances, and ordered improvements to VA screening, research and claims processing.',
      why: 'The act’s whole subject is what veterans are owed and how quickly they get it, so a yea is a direct vote for the issue.'
    },
    // ── S. 1605 · 117th Congress ──
    'S. 1605|117|strong_defense': {
      did: 'The FY2022 defense authorization: personnel end strengths, procurement, military construction, Energy Department nuclear-security programs and intelligence activities.',
      why: 'Authorising what the armed forces may field is this chip’s core question, so a yea is a vote for it.'
    },
    'S. 1605|117|israel_support': {
      did: 'Made up to $200 million available for U.S. co-production of Iron Dome, David’s Sling and Arrow 3 components, set up a joint U.S.–Israel cybersecurity grant program at Homeland Security, and created the Cyprus–Greece–Israel–U.S. interparliamentary group.',
      why: 'Missile-defence co-production and joint security programs are what this chip reads, and a yea funds and continues them. Narrow link: the same act also carries a State Department authorisation and a division of unrelated matters.'
    },
    'S. 1605|117|immig_fentanyl': {
      did: 'One section — the Blocking Deadly Fentanyl Imports Act — added synthetic-opioid source countries to the narcotics "majors list" and required the annual narcotics report to name the biggest fentanyl source countries and say how far each is cooperating.',
      why: 'This chip tracks pressure on the fentanyl supply, and a yea enacts a listing authority and a reporting duty aimed at it. Narrow link: one section working through a designation and a report, inside a defence authorisation.'
    },
    // ── H.R. 3076 · 117th Congress ──
    'H.R. 3076|117|gov_transparency': {
      did: 'Required the Postal Service to publish an online public dashboard of service-performance data, broken down by delivery unit.',
      why: 'This chip measures what the public can check for itself, and the dashboard is a standing disclosure anyone can open. Narrow link: the act is a postal-finance bill, and the dashboard is one of its provisions.'
    },
    'H.R. 3076|117|gov_services': {
      did: 'Removed the requirement that the Postal Service prepay decades of future retiree health benefits, moved postal retirees onto a plan coordinated with Medicare, and wrote six-day delivery into law.',
      why: 'Keeping a universal public service running is what this chip measures, and the act removes the obligation behind the Postal Service’s reported losses — so a yea counts as support.'
    },
    // ── S. 2938 · 117th Congress ──
    'S. 2938|117|health_mental': {
      did: 'Funded children’s and family mental-health services, extended the Certified Community Behavioral Health Clinic demonstration, funded paediatric mental-health access grants, and issued guidance on Medicaid telehealth.',
      why: 'Capacity to treat mental illness is this chip’s subject, and a yea funds it. Supporting link: the act is known for its firearms title, which is read on its own chips — this one reads the mental-health title alongside it, not instead of it.'
    },
    'S. 2938|117|public_schools': {
      did: 'Funded school safety programs and school-based mental-health capacity, including Medicaid guidance aimed specifically at services delivered inside schools.',
      why: 'Money and staff reaching public schools is what this chip measures, so a yea counts as support. Narrow link: school provisions are one part of a bill whose main titles are mental health and firearms.'
    },
    // ── H.R. 3684 · 117th Congress ──
    'H.R. 3684|117|climate_action': {
      did: 'Funded clean school buses, a national electric-vehicle charging network, home weatherisation and legacy pollution remediation.',
      why: 'Paying to cut emissions and clean up pollution is what this chip measures, so a yea counts as support. Narrow link: these are components of an infrastructure package rather than its organising purpose.'
    },
    'H.R. 3684|117|transit': {
      did: 'Reauthorised the federal public transportation programs and funded passenger and freight rail, including the largest single investment in Amtrak since it was created.',
      why: 'Whether buses and trains get federal money is this chip’s question, and a yea provides it.'
    },
    'H.R. 3684|117|broadband': {
      did: 'Created the Broadband Equity, Access, and Deployment program and the Affordable Connectivity Program to extend service into unserved and underserved areas.',
      why: 'Getting service to households that have none is exactly what this chip measures, so a yea funds it.'
    },
    'H.R. 3684|117|water': {
      did: 'Funded drinking-water and wastewater systems, lead service line replacement, and Western water infrastructure including storage and drought resilience.',
      why: 'This chip reads investment in water supply and its resilience, and a yea provides it. Supporting link: water is one division of a wider infrastructure act.'
    },
    'H.R. 3684|117|disaster_resilience': {
      did: 'Funded coastal resiliency work, wildfire risk reduction, and hardening of the electric grid against extreme weather.',
      why: 'Spending ahead of a disaster to reduce its damage is what this chip measures, so a yea counts as support. Supporting link: resilience runs through two divisions of a wider infrastructure act.'
    },
    // ── H.R. 1319 · 117th Congress ──
    'H.R. 1319|117|econ_smallbiz': {
      did: 'Funded the Restaurant Revitalization Fund, added Paycheck Protection Program and Economic Injury Disaster Loan support, and funded the Shuttered Venue Operators Grant program.',
      why: 'Direct aid to small firms is what this chip measures, so a yea counts as support. Narrow link: one title of a pandemic relief act built mainly around households, states and schools.'
    },
    'H.R. 1319|117|cost_living': {
      did: 'Sent recovery rebate payments to households, expanded the child and earned-income tax credits for the year, and funded emergency rental and utility assistance.',
      why: 'Money reaching households against their bills is this chip’s subject, so a yea counts as support.'
    },
    'H.R. 1319|117|healthcare_costs': {
      did: 'Expanded Affordable Care Act premium tax credits for 2021 and 2022, removed the 400%-of-poverty eligibility cliff, and subsidised COBRA continuation coverage.',
      why: 'What a household pays in premiums is what this chip measures, and each of those lowers it — so a yea counts as support.'
    },
    'H.R. 1319|117|child_care': {
      did: 'Provided child-care stabilisation funding, supplemental Child Care and Development Block Grant money, and Head Start funding.',
      why: 'Whether care is available and affordable is this chip’s question, and a yea funds the providers and the subsidy. Supporting link: it is one title of a wider relief act.'
    },
    'H.R. 1319|117|public_schools': {
      did: 'Created the Elementary and Secondary School Emergency Relief Fund for reopening and learning-loss work — the largest single federal appropriation to K-12 schools in this record.',
      why: 'Federal money reaching public schools is what this chip measures, so a yea counts as support.'
    },
    // ── H.R. 4758 · 119th Congress ──
    'H.R. 4758|119|climate_action': {
      did: 'Repealed three Energy Department programs created by the 2022 climate law: rebates for electrifying low- and moderate-income homes, grants to train home-energy contractors, and help for states adopting modern building energy codes.',
      why: 'Those programs are the federal push to cut household emissions this chip measures, and the bill cancels them — so a yea counts against the issue. It passed the House 210-199 and was not enacted.'
    },
    'H.R. 4758|119|cut_spending': {
      did: 'Rescinded the unobligated balances still available for the home-electrification rebates and for building-energy-code adoption.',
      why: 'Cancelling money already appropriated is what this chip counts as a spending cut, so a yea counts as support. Supporting link: the bill’s purpose is the repeal itself, and the rescission follows from it.'
    },
    // ── H.R. 4405 · 119th Congress ──
    'H.R. 4405|119|gov_transparency': {
      did: 'Required the Justice Department to publish, searchable and downloadable, all unclassified records from the Epstein investigation — including material on Ghislaine Maxwell, flight and travel logs, and the people named in them — and to report to Congress within fifteen days what was released, what was withheld and why.',
      why: 'Compelling disclosure the executive branch had withheld is this chip’s whole subject, and it is the whole of the act: it creates no offence and changes no penalty. Victims’ personal information and material that would jeopardise an active investigation may still be withheld.'
    },
    // ── S. 5 · 119th Congress ──
    'S. 5|119|deportations': {
      did: 'Required Homeland Security to take into custody any non-citizen unlawfully present who has been charged with, arrested for or convicted of burglary, theft, larceny, shoplifting, assault of a police officer, or any crime causing death or serious injury — and to put them into removal proceedings.',
      why: 'Mandatory detention leading to removal is this chip’s subject, and the act makes it a duty rather than a discretion, so a yea is a direct vote for it.'
    },
    'S. 5|119|border_security': {
      did: 'Tightened immigration enforcement by removing the discretion to release a covered non-citizen from custody once they have been charged.',
      why: 'This chip reads enforcement of the immigration laws generally, and the detention mandate tightens it — so a yea counts as support. Supporting link: the act adds no border personnel, technology or funding; it works through custody.'
    },
    'S. 5|119|tough_on_crime': {
      did: 'Made an arrest or charge — not a conviction — for theft, burglary, shoplifting, assault of a police officer, or a crime causing death or serious injury the trigger for mandatory federal custody.',
      why: 'Attaching a hard consequence to that list of offences is what this chip measures, so a yea counts as support. Supporting link: the consequence is immigration detention, not a criminal penalty.'
    },
    'S. 5|119|state_standing': {
      did: 'Let a state sue the federal government for an injunction over immigration decisions that harm the state or its residents by more than $100 — including a release from custody, a missed asylum interview, a parole decision, or a failure to remove someone already ordered removed.',
      why: 'This chip asks whether states can take Washington to court, and the act creates a cause of action where none existed — so a yea expands that standing. Narrow link: the standing runs to immigration decisions only.'
    },
    // ── H.R. 4 · 119th Congress ──
    'H.R. 4|119|cut_spending': {
      did: 'Cancelled unobligated balances Congress had already appropriated to the State Department, USAID, several related agencies and the Corporation for Public Broadcasting, acting on rescissions the President proposed in June 2025.',
      why: 'Taking back money already appropriated is the most direct form of the spending cut this chip measures, so a yea is a vote for it.'
    },
    'H.R. 4|119|gov_waste': {
      did: 'Returned roughly $9 billion of enacted budget authority to the Treasury unspent, drawn from foreign-assistance accounts and public broadcasting.',
      why: 'This chip asks whether money is cut where it is not doing work, and a rescission of unobligated balances is that claim in statutory form — so a yea counts as support. What counts as waste rather than service is the reader’s call; the ledger records which accounts were struck.'
    },
    'H.R. 4|119|national_debt': {
      did: 'Reduced federal outlays by the amount of the rescinded balances — a smaller set than the $9.4 billion the House passed, after the Senate carved out global health, food aid and several other accounts.',
      why: 'This chip measures the deficit, and a rescission lowers outlays against it. Narrow link: the amounts are small next to the deficit, and the act changes no revenue or entitlement.'
    },
    'H.R. 4|119|america_first_fp': {
      did: 'Nineteen of the act’s twenty rescission paragraphs struck foreign-assistance balances — about $7.9 billion — including development assistance, the Economic Support Fund, refugee and disaster assistance, the Clean Technology Fund and the U.S. Institute of Peace.',
      why: 'Cutting and winding down U.S. funding commitments abroad is this chip’s own stated content, so a yea counts as support. Supporting link: the measure’s controlling axis is still spending rather than foreign policy.'
    },
    // ── H.R. 8034 · 118th Congress ──
    'H.R. 8034|118|strong_defense': {
      did: 'Appropriated roughly $7.8 billion to U.S. accounts rather than to Israel: replacing defence articles drawn from American stocks, Army ammunition procurement, Defense Production Act purchases, and U.S. force protection and operations in the Central Command region.',
      why: 'Refilling American stocks and funding American forces is what this chip measures, so a yea counts as support. Supporting link: about $7.8 billion of a $26.4 billion act, with the aid itself read on the Israel chip.'
    },
    'H.R. 8034|118|israel_support': {
      did: 'A $26.4 billion emergency supplemental: Iron Dome and David’s Sling, Iron Beam procurement, Foreign Military Financing for Israel, replacement of U.S. articles already transferred, and humanitarian assistance for Gaza. Enacted as a division of Public Law 118-50.',
      why: 'This is the most direct enacted test of the issue in this record — the 58 nays declined to fund Israel’s defence on a bill that asked nothing else of them — so a yea funds it.'
    },
    'H.R. 8034|118|america_first_fp': {
      did: 'Appropriated about $9.2 billion of foreign assistance that is not aid to Israel: international disaster assistance and migration and refugee assistance for humanitarian needs, narcotics enforcement in the Middle East, and the Sinai peacekeeping mission — all designated emergency spending and unoffset.',
      why: 'This chip’s support direction is cutting or conditioning U.S. commitments abroad, so a yea — which appropriates them, unoffset — is coded as opposing it. The Israel funding in the same title is deliberately left out of this reading and carried on its own chip.'
    },
    // ── H.R. 8035 · 118th Congress ──
    'H.R. 8035|118|foreign_balance': {
      did: 'A FY2024 emergency supplemental for Ukraine: Defense Department accounts, the Ukraine Security Assistance Initiative, replacement of defence articles already transferred, and State and USAID programs in the region.',
      why: 'Sustaining an alliance commitment under fire is what this chip measures, so a yea funds it. It passed the House 311-112 and reached law only as a division of the combined package.'
    },
    'H.R. 8035|118|america_first_fp': {
      did: 'The standalone Ukraine-aid vote, stripped of the Israel, Indo-Pacific and sanctions divisions that carried the rest of the package.',
      why: 'This chip’s support direction is keeping the resources at home, so a yea — which sends them abroad — is coded as opposing it. Stripping the other divisions is what makes this roll a clean read of that question.'
    },
    'H.R. 8035|118|restraint': {
      did: 'Funded current U.S. military operations in the region and sustained American military support to an active war.',
      why: 'This chip measures whether the United States steps back from military engagement, and the appropriation sustains one — so a yea counts against restraint. Supporting link: the bill funds an ally’s defence rather than committing U.S. forces to combat.'
    },
    // ── H.R. 7217 · 118th Congress ──
    'H.R. 7217|118|strong_defense': {
      did: 'Appropriated across the U.S. military accounts — personnel, operations and maintenance, procurement, research, and revolving funds — to replace defence articles drawn from Pentagon stocks and sustain American forces in the region.',
      why: 'Funding and refilling the U.S. force is this chip’s question, so a yea counts as support. Supporting link: the defence title is the bulk of the $17.6 billion bill, and the aid itself is read on the Israel chip.'
    },
    'H.R. 7217|118|israel_support': {
      did: 'A $17.6 billion emergency supplemental for Israel and for U.S. Central Command operations, with no offset, offered as a standalone alternative to the combined Ukraine–Israel–Indo-Pacific package. It was brought up under suspension and failed 250-180, short of two-thirds.',
      why: 'A yea appropriates the aid, which is this chip’s subject. The measure got a majority and still failed, because suspension of the rules requires two thirds — so the row records a yea, not an enactment.'
    },
    // ── H.R. 6126 · 118th Congress ──
    'H.R. 6126|118|israel_support': {
      did: 'A $14.3 billion emergency supplemental for Israel: cooperative missile-defence programs, Foreign Military Financing, and replacement of U.S. defence articles transferred after October 7.',
      why: 'A yea appropriates the aid, which is this chip’s subject.'
    },
    'H.R. 6126|118|cut_spending': {
      did: 'Offset every dollar of the Israel supplemental by rescinding $14.3 billion of IRS enforcement funding appropriated by the 2022 climate and tax law.',
      why: 'Cancelling an existing appropriation is what this chip counts as a spending cut, so a yea counts as support. The offset, not the Israel aid, is what drew the 196 nays — which is why the row records it rather than letting the Israel reading stand as the only meaning of the vote.'
    },
    // ── H.R. 1041 · 119th Congress ──
    'H.R. 1041|119|gun_safety': {
      did: 'Barred the VA from reporting a veteran to the background-check system merely because the department decided their benefits should be paid to a fiduciary, and required the VA to tell the Attorney General that every such report filed since 1993 no longer applies.',
      why: 'Removing a class of record from the background-check system loosens the screening this chip measures, so a yea counts against it. Supporting link: the change reaches only VA fiduciary determinations, leaves every other mental-health prohibitor intact, and keeps reporting where a judge has found the person dangerous.'
    },
    'H.R. 1041|119|gun_rights': {
      did: 'Stopped the VA from sending a beneficiary’s name to the background-check system on the strength of an administrative finding that they cannot manage their own benefit payments, unless a judge has found them a danger to themselves or others.',
      why: 'Restoring eligibility taken away by an administrative determination rather than a judicial finding is this chip’s direct subject, so a yea is a vote for it. It passed the House 216-201 and went to the Senate.'
    },
    // ── H.R. 3486 · 119th Congress ──
    'H.R. 3486|119|border_security': {
      did: 'Raised the penalties for entering the country unlawfully and for coming back after removal — the improper-entry maximum from two years to five, and the reentry maximum from two years to ten, or fifteen after three or more specified misdemeanours.',
      why: 'These are the two federal offences immigration enforcement rests on, so raising their penalties is support on this chip. Supporting link: the bill adds no barrier, agent, detention bed or removal authority — it is enforcement severity, not enforcement capacity.'
    },
    'H.R. 3486|119|tough_on_crime': {
      did: 'Set a five-year mandatory minimum, up to life, for someone who entered unlawfully and is later convicted of a felony, and a ten-year mandatory minimum for someone with a prior felony or two prior reentry convictions who enters again.',
      why: 'This chip’s own text is tougher sentences for offenders, and sentence length is the bill’s entire substance, so a yea is a vote for it. It passed the House 226-197 and went to the Senate.'
    },
    // ── H.R. 7148 · 119th Congress ──
    'H.R. 7148|119|strong_defense': {
      did: 'Carried the whole FY2026 Department of Defense appropriation as Division A — the act’s largest division by dollars — including $1 billion in Defense-Wide operation and maintenance for the Taiwan Security Cooperation Initiative.',
      why: 'A yea enacts those defence levels and a nay blocks the package carrying them, which is what this chip reads.'
    },
    'H.R. 7148|119|israel_support': {
      did: 'Appropriated $500 million for Israeli cooperative missile-defence programs — Iron Dome, Short-Range Ballistic Missile Defense, Arrow 3 and the Arrow System Improvement Program — and directed not less than $3.3 billion in Foreign Military Financing grants for Israel, to be disbursed within 30 days of enactment.',
      why: 'Funding Israel’s defence is this chip’s subject, so a yea funds it. Supporting link: those lines sit inside a five-bill consolidated appropriations act whose controlling subject is federal spending.'
    },
    'H.R. 7148|119|health_rural': {
      did: 'Extended the rural and safety-net health authorities that were about to lapse: eliminated the scheduled Medicaid disproportionate share hospital cuts, continued the low-volume hospital adjustment and the Medicare-Dependent Hospital program, extended ground ambulance add-on payments and telehealth flexibilities, and funded community health centers and the National Health Service Corps.',
      why: 'Those payment adjustments are what keeps small and rural hospitals solvent, which is this chip’s subject, so a yea extends them. Narrow link: it is one division of a five-bill appropriations act, and the provisions continue existing programs rather than create new ones.'
    },
    'H.R. 7148|119|foreign_balance': {
      did: 'Funded the diplomatic and allied-military instruments and the multilateral institutions — $9.4 billion for diplomatic programs, $6.2 billion in Foreign Military Financing, military education and training, peacekeeping operations, and contributions to the International Development Association and the regional development banks.',
      why: 'This chip reads allied military cooperation and multilateral institutions specifically, and the act funds both, so a yea counts as support. Narrow link: general foreign-aid levels are deliberately not read on this axis.'
    },
    'H.R. 7148|119|health_drug_prices': {
      did: 'Required pharmacy benefit managers to pass 100 percent of drug rebates through to the health plan, made a non-conforming arrangement a prohibited transaction under federal benefits law, and added PBM reporting, generic-application transparency and pharmacy access requirements.',
      why: 'Rebates kept by the middleman are money that does not reach the plan or the patient, and this chip measures what is done about drug costs — so a yea imposes the pass-through. Narrow link: it is one title of a five-bill appropriations act and it regulates the middleman, not the manufacturer’s price.'
    },
    'H.R. 7148|119|pro_life': {
      did: 'Carried the standing abortion-funding restrictions across four divisions: the Labor-HHS bar with the life, rape and incest exceptions, the bar on abortion coverage in federal employee health plans, the same bar applied to District of Columbia funds, and the foreign-assistance family-planning bar.',
      why: 'These riders are the federal funding line this chip reads, and a yea enacts them for another year. Narrow link, recorded neutrally: they are continuations of long-standing riders carried by every appropriations act, not a new position taken on this vote.'
    },
    // ── H.Con.Res. 113 · 119th Congress ──
    'H.Con.Res. 113|119|national_debt': {
      did: 'Adopted the FY2027 congressional budget blueprint and instructed four House committees to report reconciliation legislation increasing the deficit over FY2027-FY2036 by up to stated amounts — $60 billion for Armed Services, $13 billion for Intelligence, $12 billion for Agriculture, and a further amount for House Administration.',
      why: 'This chip measures the deficit, and the resolution’s own reconciliation instructions authorise increases to it, so a yea is coded against the chip. A budget resolution is not presented to the President and appropriates nothing; it sets the levels that later appropriations and reconciliation bills are enforced against.'
    },
    // ── H.R. 6644 · 119th Congress ──
    'H.R. 6644|119|housing_build': {
      did: 'A twelve-title housing-supply act: grants for permitting single-staircase apartment buildings up to six stories, an environmental-review exemption for specified rural infill projects, a database of publicly owned land, higher FHA multifamily loan limits with affordable construction as an eligible activity, and streamlined federal environmental review for HUD-assisted projects.',
      why: 'Every one of those provisions removes a regulatory or financing barrier to new residential construction, which is this chip’s subject, so a yea is a vote to build. It became Public Law 119-101; the vote held here is the 358-32 House concurrence in the Senate amendment.'
    },
    'H.R. 6644|119|housing': {
      did: 'Reauthorized and reformed the HOME Investment Partnerships Program, the Rural Housing Service and disaster recovery, revised housing counseling oversight, addressed small-dollar mortgages and appraisal practice, and excluded VA disability benefits from the income test for HUD-VASH eligibility.',
      why: 'This chip reads cost and access to housing assistance rather than new construction, and the act carries both, so a yea advances affordability too. Supporting link: the package’s controlling purpose is supply, read on its own chip.'
    },
    // ── H.R. 7757 · 119th Congress ──
    'H.R. 7757|119|tech_balance': {
      did: 'Required platforms where one-third of the content is sexual material harmful to minors to verify age, defaulted minors’ accounts to settings limiting compulsive-usage features and adult contact, gave parents account and privacy controls, made AI chatbots disclose to a minor that they are not human and surface crisis-line information, and extended children’s online privacy law to teens.',
      why: 'Age verification, social media defaults and AI disclosure are this chip’s own vocabulary, so a yea imposes those guardrails. It passed the House 267-117 under suspension and went to the Senate Commerce Committee.'
    },
    // ── H.Con.Res. 89 · 119th Congress ──
    'H.Con.Res. 89|119|restraint': {
      did: 'Directed the President under the War Powers Resolution to remove U.S. Armed Forces from hostilities against Iran unless Congress declares war or specifically authorises force — while expressly preserving self-defence, a defensive presence in the region, and intelligence collection and sharing.',
      why: 'Ending U.S. participation in an undeclared conflict is exactly what this chip measures, so a yea is a vote for restraint. The House agreed to it 214-208 and it went to the Senate Foreign Relations Committee; a concurrent resolution is not presented to the President.'
    },
    // ── H.Con.Res. 108 · 119th Congress ──
    'H.Con.Res. 108|119|restraint': {
      did: 'Directed the President under the War Powers Resolution to remove U.S. Armed Forces from any hostilities in Lebanon within seven days, while preserving security cooperation with the Lebanese Armed Forces and protection of diplomatic facilities.',
      why: 'Withdrawing forces from an undeclared conflict is this chip’s subject, so a yea is a vote for restraint. The House rejected it 189-235, so the vote records a position rather than a change in the law.'
    },
    // ── H.R. 9237 · 119th Congress ──
    'H.R. 9237|119|veterans': {
      did: 'An omnibus veterans package: concurrent receipt of disability compensation and retired pay for certain combat-related retirees, benefits for remarried surviving spouses, extended dependency and indemnity compensation, claims-processing and rural examination access, a rural critical-access-hospital reimbursement pilot under community care, and free opioid rescue medication in high-overdose areas.',
      why: 'Expanding veterans’ benefits and VA administration is this chip’s subject, so the bill sits squarely on it. Procedural row: the only roll call held here is the motion to recommit, which failed 210-211 — a yea on that motion is a vote against advancing the bill, and the engine reads it that way.'
    },
    // ── H.R. 8884 · 119th Congress ──
    'H.R. 8884|119|social_security': {
      did: 'Reauthorized the Social Security Administration’s authority to run disability-insurance demonstration projects, which lapsed at the end of 2022, through 2030, and required that a participant’s total income not be reduced by taking part in one.',
      why: 'Keeping a Social Security program authority alive is support on this chip. Supporting link: this is program administration — it changes no benefit level and no eligibility rule, and it passed the House 232-188.'
    },
    // ── H.R. 815 · 118th Congress ──
    'H.R. 815|118|immig_fentanyl': {
      did: 'Carried the FEND Off Fentanyl Act as Division E: sanctions in response to the declared national emergency on fentanyl trafficking, plus anti-money-laundering measures aimed at the transnational organizations moving the proceeds.',
      why: 'Sanctions and money-laundering controls on trafficking organizations are this chip’s mechanism, so a yea enacts them. Narrow link: Division E is one of five divisions in a package whose bulk is security assistance.'
    },
    'H.R. 815|118|america_first_fp': {
      did: 'The largest single foreign-aid appropriation of the 118th Congress — Israel, Ukraine and Indo-Pacific security supplementals in three divisions — enacted as Public Law 118-50.',
      why: 'This chip’s support direction is redirecting resources from foreign commitments to domestic priorities, so a yea is coded as opposing it. Supporting link: the package also carries the TikTok divest-or-ban and fentanyl sanctions divisions, read on their own chips.'
    },
    'H.R. 815|118|foreign_balance': {
      did: 'Appropriated security assistance across three theatres at once: Division A for Israel, Division B for Ukraine, Division C for the Indo-Pacific.',
      why: 'Funding alliance commitments is what this chip measures, and this vote funded three of them in one instrument, so a yea is support.'
    },
    'H.R. 815|118|restraint': {
      did: 'Sustained U.S. military support to two active wars and a deterrence posture in the Pacific through the same three security-assistance divisions.',
      why: 'This chip measures stepping back from military engagement, so a yea — which deepens it — is coded against restraint. Supporting link: the package funds allies and replenishes U.S. stocks; it commits no American forces to combat.'
    },
    'H.R. 815|118|tech_balance': {
      did: 'Carried the Protecting Americans from Foreign Adversary Controlled Applications Act in Division D, requiring divestiture of a foreign-adversary-controlled application or barring its distribution in the United States.',
      why: 'A binding federal rule on who may operate a consumer platform is this chip’s subject, so a yea imposes it. Supporting link: one division of a five-division emergency supplemental.'
    },
    // ── H.R. 7776 · 117th Congress ──
    'H.R. 7776|117|strong_defense': {
      did: 'Carried the FY2023 National Defense Authorization Act: end strengths for the Armed Forces and authorisations for procurement, operation and maintenance, military personnel and other defense programs.',
      why: 'Authorising the force is this chip’s subject, so the enacted content is read as support. Identity note: the roll call attached to this vehicle is the earlier suspension vote on the rivers-and-harbors bill whose text the NDAA later replaced, so the mapping is read off the enacted content and no House margin is claimed for it.'
    },
    // ── S. 2296 · 119th Congress ──
    'S. 2296|119|israel_support': {
      did: 'Extended U.S.-Israel anti-tunnel cooperation through 2028 and raised its annual ceiling from $50 million to $80 million, extended counter-drone cooperation from $55 million to $75 million, and made up to $60 million of Missile Defense Agency procurement available for Iron Dome co-production in the United States and $40 million for David’s Sling.',
      why: 'Keeping joint missile-defence and tunnel-detection work funded is this chip’s subject, so a yea enacts it. Narrow link: two sections in one subtitle plus one missile-defence section inside a ten-division authorization.'
    },
    'S. 2296|119|immig_fentanyl': {
      did: 'Carried the BUST FENTANYL Act, widening the Fentanyl Sanctions Act to reach any foreign person who knowingly made a significant financial or material contribution to opioid trafficking, extending sanctions to foreign state agencies, and prioritising identification of traffickers in China.',
      why: 'Sanctions reaching the financiers as well as the traffickers are this chip’s mechanism, so a yea enacts them. Narrow link: one title inside one division of the defense authorization.'
    },
    'S. 2296|119|strong_defense': {
      did: 'The Senate’s FY2026 National Defense Authorization Act: aircraft, ship and missile procurement, active and reserve personnel strengths, military construction, Energy Department defense programs, an extension of the Pacific Deterrence Initiative, and repeal of the department’s diversity, equity and inclusion provisions including the Chief Diversity Officer post.',
      why: 'Authorising and shaping the armed forces is this chip’s subject, so a yea is support. The Senate passed it 77-20; it was held at the desk in the House and never enacted — S. 1071 is the vehicle that became law.'
    },
    'S. 2296|119|back_police': {
      did: 'Carried the Law Enforcement and Crime Victims Support Package: protections against first-responder fentanyl exposure, reauthorised support and treatment for officers in crisis, death benefits for certain retired officers, trauma-kit standards, and a new COPS Strong Communities Program funding local and university-run police training.',
      why: 'Funding and supporting police is this chip’s subject, so a yea enacts it. Narrow link: one subtitle of one title inside a ten-division bill.'
    },
    'S. 2296|119|housing_build': {
      did: 'Carried the Road to Housing Act as Division I — model frameworks for reforming state and local zoning, streamlined environmental review, and provisions reaching accessory dwelling units, duplexes through fourplexes, cottage courts, townhouses and transit-adjacent development — and struck the permanent-chassis requirement from the federal manufactured-home definition.',
      why: 'Removing the land-use and review barriers to new construction is this chip’s subject, so a yea enacts the division. Narrow link: one of ten divisions, though the largest that is not defense.'
    },
    'S. 2296|119|homeless': {
      did: 'Raised the Emergency Solutions Grants administrative cost cap from 7.5 to 10 percent, rewrote the Continuum of Care program, allowed a spending-cap waiver through 2029 while denying it to any recipient that displaces people without providing shelter or rehousing, and added the Housing Unhoused Disabled Veterans Act and oversight of the Interagency Council on Homelessness.',
      why: 'How homelessness assistance money may be spent and who may receive it is this chip’s subject, so a yea enacts these changes. Narrow link: a handful of sections inside one division of the defense authorization.'
    },
    // ── H.R. 1049 · 119th Congress ──
    'H.R. 1049|119|gov_transparency': {
      did: 'Made federal elementary and secondary education funding conditional on each school notifying parents that they may request and receive information about foreign influence in the school.',
      why: 'This chip reads what institutions must reveal, and the bill creates a disclosure-on-request regime where none existed. Supporting link: the disclosure runs to parents about one subject, not to the public about government generally.'
    },
    'H.R. 1049|119|edu_parental': {
      did: 'Required every school served by a local educational agency receiving federal funds to tell parents of their right to request and receive information about foreign influence — China is the named example — in their child’s school.',
      why: 'Creating a parental notification right that does not exist today is exactly what this chip measures, so a yea establishes it.'
    },
    // ── H.R. 1005 · 119th Congress ──
    'H.R. 1005|119|gov_transparency': {
      did: 'Required public elementary and secondary schools to disclose funds they receive from, or contracts they hold with, a foreign source.',
      why: 'Compelling disclosure that is not required today is this chip’s subject, so a yea creates it. Identity note: the bill was rewritten on the floor and no summary was published for the text the House passed, so this reads only what the official title as passed states.'
    },
    // ── H.R. 2965 · 119th Congress ──
    'H.R. 2965|119|econ_smallbiz': {
      did: 'Required the Small Business Administration to hold its annual small-business regulatory budget at no more than zero — meaning the net compliance cost its new rules impose on a small business must be offset by the cost removed through modifying or repealing existing rules.',
      why: 'The budget is scoped to the compliance burden small businesses carry, and a yea caps it. Supporting link: the bill’s controlling subject is the regulatory cap itself, read on the red-tape chip.'
    },
    'H.R. 2965|119|gov_regulation': {
      did: 'Established a small-business regulatory budget capping the regulatory cost the SBA may impose in a fiscal year at zero net, counting both the cost of new rules and the cost removed by repealing or modifying old ones.',
      why: 'A hard cap on the cost of new regulation is exactly what this chip measures, so a yea constrains it.'
    },
    // ── H.R. 4305 · 119th Congress ──
    'H.R. 4305|119|econ_smallbiz': {
      did: 'Required the SBA Office of Advocacy to keep operating the Red Tape Hotline, the channel through which small entities report the burden of complying with a federal rule, guidance document or policy statement, and to report annually to the SBA and Congress on what comes in.',
      why: 'Giving small businesses a standing channel to Washington about compliance costs is support on this chip, so a yea backs it.'
    },
    'H.R. 4305|119|gov_regulation': {
      did: 'Made the Red Tape Hotline a statutory duty of the SBA Office of Advocacy and required an annual report to Congress on the rules small entities flag through it.',
      why: 'The hotline exists to surface federal rules for repeal or revision, which is this chip’s direction, so a yea advances that review. Supporting link: it creates a reporting channel, not a repeal.'
    },
    // ── S.J.Res. 18 · 119th Congress ──
    'S.J.Res. 18|119|econ_corp_account': {
      did: 'Nullified the Consumer Financial Protection Bureau’s overdraft rule, which had required very large financial institutions to cap overdraft charges at $5, justify any higher cap, or treat the overdraft as credit subject to Truth in Lending disclosure.',
      why: 'This chip measures constraints on what large firms may charge, and the resolution removes one, so a yea is coded against it. Supporting link: the vehicle’s controlling subject is the rule-striking power itself, read on the red-tape chip.'
    },
    'S.J.Res. 18|119|gov_regulation': {
      did: 'A Congressional Review Act resolution whose entire operative effect is to strike the CFPB’s December 2024 overdraft rule off the books and bar a substantially similar rule.',
      why: 'Nullifying a federal rule is this chip’s direct subject, so a yea removes the regulation.'
    },
    // ── H.J.Res. 78 · 119th Congress ──
    'H.J.Res. 78|119|gov_regulation': {
      did: 'A Congressional Review Act resolution striking the Fish and Wildlife Service rule published in July 2024 that listed the San Francisco Bay-Delta longfin smelt as endangered.',
      why: 'Nullifying an agency rule is this chip’s subject, so a yea removes it. Supporting link: what the rule did is read on the public-lands chip.'
    },
    'H.J.Res. 78|119|lands_preserve': {
      did: 'Removed Endangered Species Act protection from the San Francisco Bay-Delta population of longfin smelt by nullifying the listing rule.',
      why: 'This chip’s support direction is keeping federal conservation protections in place, so a yea — which strips one — is coded against it. Mapped here because the issue vocabulary has no dedicated wildlife or endangered-species chip.'
    },

    // ══ Judged roll-call debt: the (measure, issue) pairs that a Contradicted or
    // Mixed member row still rendered with the derived pair. These are the rows a
    // reader opens to argue with, and "counted on X because that is the primary
    // subject" is not an argument. Each line below is written from the mapping's own
    // rationale and the measure text on file — the amendment's operative words, the
    // account it moves, the section it strikes — and from nothing else. Where the
    // link is a narrow one the sentence says so, because a reader who cannot see the
    // reach of a link cannot judge the weight it was given.

    // ── FY2026/FY2027 appropriations and defence-authorisation amendments. The
    // "one vote, many issues" case: a single floor amendment to a vehicle carrying
    // dozens of unrelated accounts. The per-issue line has to name the account or
    // the section, because the bill's short title names none of them.
    'H.Amdt. 235|119|israel_support': {
      did: 'A floor amendment to the fiscal 2026 national security and State Department appropriations bill barring any of its funds from being used for Israel and cutting the Foreign Military Financing Program account by $3.3 billion to match. Failed 104-314.',
      why: 'Foreign Military Financing is the account U.S. security assistance to Israel is paid out of, and the amendment zeroes it out, so a yea ends the assistance and a nay leaves it in place.'
    },
    'H.Amdt. 235|119|america_first_fp': {
      did: 'Prohibited the funds appropriated by the fiscal 2026 national security and State Department appropriations Act from being used for Israel — a standing foreign-aid commitment put to the floor as an amendment rather than as a review.',
      why: 'Whether long-running overseas commitments should continue is what this chip measures, and the amendment ends one of the largest of them inside the appropriation itself, so a yea counts as support for pulling back.'
    },
    'H.Amdt. 235|119|cut_spending': {
      did: 'The amendment paid for itself by reducing the Foreign Military Financing Program account by $3.3 billion — the same money it barred from going to Israel.',
      why: 'That offset is the operative spending change on this chip: a yea takes an appropriated account down by $3.3 billion. Its reach is one account in one bill, with no change to any spending rule.'
    },
    'H.Amdt. 236|119|america_first_fp': {
      did: 'Barred the funds appropriated by the same national security and State Department appropriations Act from being used for Jordan, with matching reductions to the National Security Investment Programs and Foreign Military Financing accounts.',
      why: 'Aid to Jordan is a standing commitment renewed year on year, and the amendment ends it in the appropriation rather than through a review, so a yea counts as support for winding such commitments down.'
    },
    'H.Amdt. 236|119|cut_spending': {
      did: 'Cut the National Security Investment Programs and Foreign Military Financing accounts by the amounts the amendment barred from being spent on Jordan.',
      why: 'Two appropriated accounts come down by the amount withheld, which is the spending effect this chip reads, so a yea cuts spending. It moves those two accounts in one bill and changes no spending rule.'
    },
    'H.Amdt. 242|119|gov_transparency': {
      did: 'Struck section 1213 of the fiscal 2027 defence authorisation, which would have moved the Afghanistan War Commission’s final-report deadline from three years to four; striking it leaves the original three-year deadline standing.',
      why: 'The commission’s report is the public accounting of that war, and a yea holds it to the schedule Congress first set instead of letting it slip a year. What the amendment reaches is when the report is delivered, not what has to be disclosed.'
    },
    'H.Amdt. 243|119|america_first_fp': {
      did: 'Struck the fiscal 2027 defence authorisation’s section on foreign cadets and replaced it with a prohibition on foreign nationals attending the United States Military Academies.',
      why: 'Training partner-nation officers at U.S. expense is one of the standing commitments this chip measures, and the amendment ends it, so a yea counts as support for narrowing them.'
    },
    'H.Amdt. 248|119|energy_production': {
      did: 'Kept the Santa Ynez production unit off the California coast operating rather than letting it shut down, as an amendment to the fiscal 2027 defence authorisation.',
      why: 'Whether domestic oil keeps flowing is what this chip measures, and the amendment holds one producing asset online, so a yea counts as support.'
    },
    'H.Amdt. 248|119|strong_defense': {
      did: 'The amendment’s stated purpose is protecting a critical component of the military’s fuel supply chain — the Santa Ynez unit — by keeping it in production.',
      why: 'The link here is the fuel the armed forces buy: holding a domestic source open is read as backing supply-chain security, so a yea counts as support. It changes no force structure, procurement programme or readiness authority, which is why it is weighted below a full defence mapping.'
    },
    'H.Amdt. 261|119|privacy_rights': {
      did: 'Barred federal funds from buying, installing, operating or maintaining an automated speed-enforcement camera system on a military installation, and required any already running to be decommissioned and removed within 180 days.',
      why: 'How much automated monitoring of ordinary people the government runs is what this chip measures, and the amendment switches one system off and takes down the installed base, so a yea counts as support. It reaches military installations only and expressly preserves security, access-control and criminal-investigation cameras.'
    },
    'H.Amdt. 266|119|cut_spending': {
      did: 'Required the Secretary of Defense to report within 180 days on options for cutting 200,000 civilian positions from the Department, including an analysis of the cost savings each option would produce.',
      why: 'The savings analysis is what puts a 200,000-position federal payroll reduction on the table as a spending measure, so a yea backs studying the cut. Narrow link: the amendment commissions a report and reduces nothing.'
    },
    'H.Amdt. 478|118|israel_support': {
      did: 'Prohibited the fiscal 2024 State and foreign operations appropriations bill’s funds from being used to relocate the United States Embassy in Israel out of Jerusalem. Agreed to 360-67.',
      why: 'The funding limitation locks in U.S. recognition of Jerusalem as Israel’s capital by denying the money to reverse it, so a yea entrenches that recognition and a nay leaves it reversible.'
    },
    'S.Amdt. 5813|119|immigration_reform': {
      did: 'An amendment to the border and immigration enforcement bill making funds available for the timely adjudication of DACA renewal applications. Rejected 47-52, so no renewal funding is in the enacted law.',
      why: 'A DACA recipient loses work authorisation and protection from removal when a renewal lapses in the backlog, so a yea funds keeping long-settled recipients in status. The amendment pays to process an existing policy and creates no pathway of its own.'
    },

    // ── Arms Export Control Act disapprovals. Eight near-identical vehicles whose
    // faces used to differ only by number: the articles in the resolving clause are
    // what tells a reader which transfer their senator voted on.
    'S.J.Res. 26|119|israel_support': {
      did: 'A resolution of disapproval under the Arms Export Control Act that would have blocked the certified transfer to Israel of bulldozers and related equipment. The Senate refused to discharge it from the Foreign Relations Committee 15-83 on 2025-04-03, and the sale proceeded.',
      why: 'Stopping a certified arms transfer is the sharpest vote available against the security relationship this chip measures, so a yea — here, to hold back the bulldozers — is coded against support and a nay for it.'
    },
    'S.J.Res. 32|119|israel_support': {
      did: 'A resolution of disapproval under the Arms Export Control Act that would have blocked a certified transfer to Israel of defense articles and services. The Senate refused to discharge it from the Foreign Relations Committee 40-59 on 2026-04-15, and the sale proceeded.',
      why: 'The resolution’s only operative effect is to stop the sale, so a yea withholds the articles and a nay lets them go — which is why a yea counts against support on this chip. The 40 votes to discharge are the largest yet recorded on one of these.'
    },
    'S.J.Res. 33|119|israel_support': {
      did: 'A resolution of disapproval under the Arms Export Control Act that would have blocked the certified transfer to Israel of bomb bodies and guidance kits. The Senate refused to discharge it from the Foreign Relations Committee 15-82 on 2025-04-03, and the sale proceeded.',
      why: 'Bomb bodies and guidance kits are munitions for the air campaign, and a yea would have kept them from being delivered, so a yea is coded against support on this chip and a nay for it.'
    },
    'S.J.Res. 34|119|israel_support': {
      did: 'A resolution of disapproval under the Arms Export Control Act that would have blocked a certified transfer to Israel of defense articles and services. The Senate refused to discharge it from the Foreign Relations Committee 24-73 on 2025-07-30, and the sale proceeded.',
      why: 'A senator voting to discharge this resolution is voting to stop the transfer, which is the direction this chip reads as against support — a nay leaves the certified sale on track.'
    },
    'S.J.Res. 41|119|israel_support': {
      did: 'A resolution of disapproval under the Arms Export Control Act that would have blocked the certified transfer to Israel of assault rifles. The Senate refused to discharge it from the Foreign Relations Committee 27-70 on 2025-07-30, and the sale proceeded.',
      why: 'Small arms rather than munitions, but the vote works the same way: a yea holds the rifles back and a nay releases them, so a yea is coded against support for the security relationship.'
    },
    'S.J.Res. 138|119|israel_support': {
      did: 'A resolution of disapproval under the Arms Export Control Act that would have blocked a certified transfer to Israel of defense articles and services. The Senate refused to discharge it from the Foreign Relations Committee 36-63 on 2026-04-15, and the sale proceeded.',
      why: 'The vote is on the transfer and nothing else in the relationship, so a yea holds the articles back and a nay releases them — which puts a yea against support on this chip. It was taken on the same day as a second disapproval covering a separate certification.'
    },
    'S.J.Res. 111|118|israel_support': {
      did: 'A resolution of disapproval under the Arms Export Control Act that would have blocked the certified transfer to Israel of tank rounds and 120mm mortar cartridges. The Senate refused to discharge it from the Foreign Relations Committee 18-79 on 2024-11-20, and the sale proceeded.',
      why: 'Tank rounds and mortar cartridges are ground-war ammunition, and a yea would have stopped them shipping, so a yea is coded against support on this chip and a nay for it.'
    },
    'S.J.Res. 113|118|israel_support': {
      did: 'A resolution of disapproval under the Arms Export Control Act that would have blocked the certified transfer to Israel of JDAM guidance kits and small-diameter bombs. The Senate refused to discharge it from the Foreign Relations Committee 19-78 on 2024-11-20, and the sale proceeded.',
      why: 'Guidance kits and small-diameter bombs are the precision half of the same air campaign, and a yea withholds them, so a yea reads against support and a nay for it.'
    },
    'S.J.Res. 115|118|israel_support': {
      did: 'A resolution of disapproval under the Arms Export Control Act that would have blocked an export-licence amendment covering defense articles, services and technical data for Israel. The Senate refused to discharge it from the Foreign Relations Committee 17-80 on 2024-11-20, and the sale proceeded.',
      why: 'This one reaches the licence rather than a single munition, but the effect is the same: a yea closes the channel the articles move through, so a yea is coded against support.'
    },

    // ── The rest of the judged debt: standalone bills and resolutions whose faces
    // carried the roll-call question and nothing about the issue they were scored on.
    'H.R. 5323|117|israel_support': {
      did: 'Appropriated $1 billion to replace the Iron Dome interceptors and components Israel expended in the May 2021 conflict and for Israeli cooperative missile-defense procurement, designated as an emergency requirement.',
      why: 'The bill was introduced as a standalone after the same money was stripped from a continuing resolution, so this vote is about Israeli missile defence and nothing else — a yea funds it.'
    },
    'H.R. 8369|118|israel_support': {
      did: 'Required the President to deliver to Israel the defense articles and services Congress had already authorized and appropriated, and froze salaries-and-expenses money at the Defense and State secretariats and the National Security Council until the withheld shipments went out.',
      why: 'The bill was introduced after the administration paused a shipment of 2,000-pound and 500-pound bombs and exists to force it out, so a yea compels the transfer and a nay leaves the pause standing.'
    },
    'H.R. 8281|118|states_federal_power': {
      did: 'Wrote the documentary-proof-of-citizenship rule into federal law for every registration channel a state runs, fixed the acceptable-document list federally, and extended the requirement to states that had been outside the National Voter Registration Act altogether.',
      why: 'On this chip the question is who sets the rule rather than whether the rule is good, and a yea swaps each state’s own registration procedure for a uniform federal one. Narrow link: preemption here is a by-product of the citizenship mandate, which the elections rows score.'
    },
    'H.R. 4|117|states_federal_power': {
      did: 'Restored Voting Rights Act preclearance on a rolling twenty-five-year coverage formula and added a nationwide step: a state must identify each newly enacted covered election practice and may not implement it until it has been cleared federally.',
      why: 'A yea puts a state’s own enacted election law behind federal approval before it can take effect, and a nay leaves the state’s rule governing on its own. Only that preemption question is coded here — the merits of the Voting Rights Act are the access row on the same bill.'
    },
    'H.R. 1|117|gov_transparency': {
      did: 'Division C, titled Ethics, barred House members from for-profit boards, wrote conflict-of-interest rules for members and senior staff, required the President and Vice President to divest conflicted holdings, required presidential candidates to publish ten years of tax returns, and widened lobbying registration.',
      why: 'Every one of those is a disclosure or conduct duty on officeholders, which is what this chip measures, so a yea enacts them. It is one division of a three-division act, and the campaign-money titles are counted on the campaign-finance row rather than twice here.'
    },
    'H.Res. 1399|119|gov_transparency': {
      did: 'Directed the House Committee on Ethics to preserve and publicly release its records of monetary settlements involving acts of sexual harassment.',
      why: 'Those settlements stay sealed unless the House opens them, and the resolution opens them, so a yea forces out disclosure the institution would otherwise keep to itself.'
    },
    'H.R. 6329|119|gov_transparency': {
      did: 'The Information Quality Assurance Act required agencies to publish the critical factual material they rely on when issuing a rule or a guidance document, and to use the best reasonably available evidence.',
      why: 'What the public can see of how a decision was reached is what this chip measures, and the bill puts the factual basis for a rule on the record, so a yea widens that disclosure.'
    },
    'H.R. 29|119|border_security': {
      did: 'Required the Department of Homeland Security to detain an inadmissible immigrant charged with, arrested for or convicted of burglary, theft, larceny or shoplifting, put them into removal proceedings, and issue a detainer to take custody from state or local police.',
      why: 'Detaining and removing people already found inadmissible is interior enforcement of the same immigration line this chip measures at the border, so a yea tightens it. The bill adds no barrier, personnel or asylum change of its own.'
    },
    'H.R. 29|119|tough_on_crime': {
      did: 'Attached a mandatory federal custodial consequence to four property offences — burglary, theft, larceny and shoplifting — for an inadmissible immigrant charged with, arrested for or convicted of one of them.',
      why: 'Whether an offence carries a firmer consequence is this chip’s question, and the bill turns a charge for one of those four into mandatory detention, so a yea counts as support. The House text reaches only those four: assault of an officer and injury crimes entered the statute later, through the Senate.'
    },
    'S.J.Res. 37|119|tariffs_prices': {
      did: 'Terminated the national emergency declaration that is the legal basis for the tariffs on Canadian imports, ending those duties. Passed the Senate 51-48 and did not advance in the House.',
      why: 'A tariff is paid at the border and carried into the shelf price of the goods it covers, so ending the duties on a top trading partner’s imports reads as price relief and a yea counts as support. It reaches one country’s tariffs, not tariff policy generally.'
    },
    'S.J.Res. 59|119|strong_defense': {
      did: 'A privileged war-powers resolution directing the removal of U.S. forces from hostilities against Iran that Congress has not authorized, and requiring an authorization before they continue.',
      why: 'Pulling forces out of an engagement already under way is read on this chip as cutting against a forward posture, so a yea is coded against it. What the resolution changes is who authorizes the operation — not any force level, budget or capability.'
    }
  };
  // Fails closed in three places, on purpose: a position (no congress, no ballot), a
  // missing number, and a missing or non-numeric congress all return null and leave
  // the row on its derived rendering.
  function _dosMechFor(item, issueKey) {
    if (!item || item.kind === 'position') return null;
    var num = String(item.number == null ? '' : item.number).trim();
    var cong = item.congress;
    if (!num || typeof cong !== 'number' || !isFinite(cong)) return null;
    return _DOS_MECH[num + '|' + cong + '|' + issueKey] || null;
  }

  // The mapping's own rationale, for the L4 fold on record rows with no curated
  // `more`. Read straight off the mapping and never rewritten — the curator wrote it
  // as the justification for the link, which is exactly what the fold is labelled.
  // Length-gated at the low end only: a rationale shorter than the "why it counts
  // here" line already on the face would be a second copy of the face rather than
  // the detail behind it.
  function _dosMechRationale(item, issueKey) {
    var m = _dosMapping(item, issueKey);
    var r = (m && typeof m.rationale === 'string') ? m.rationale.trim() : '';
    return r.length >= 40 ? r : '';
  }

  // ── WHICH OF THE SIMILARLY-NAMED MEASURES THIS ROW IS ───────────────────────
  // A bill number is not a name and a short title is not unique. On the elections
  // face both failures land at once: three separate instruments answer to some form
  // of "SAVE", two of them are one word apart, and a member can have a vote on all
  // three sitting in the same list. Worse, two of the rolls here are SUBSTITUTES
  // into unrelated Senate shells, so the Clerk link under the row opens a page whose
  // title has nothing to do with what was voted on — a reader who checks the citation
  // the way this product keeps asking them to gets a bill about veterans' accessibility.
  //
  // This is the sentence that answers "which measure is this, exactly". Keyed on
  // number + congress rather than per issue, because it is a fact about the document
  // and not about the chip. It corrects no vote and moves no mapping: every row still
  // points at the roll it was always stored under, and the note says out loud what
  // that roll is.
  var _DOS_IDENT_NOTE = {
    'H.R. 8281|118': 'This is the SAVE Act as first passed by the House, in the 118th Congress. ' +
      'H.R. 22 in the 119th is the reintroduction of the same text, and S. 1383’s SAVE America Act ' +
      'is a separate, broader bill — all three can appear on this list.',
    'H.R. 22|119': 'This is the SAVE Act of the 119th Congress — the reintroduction of H.R. 8281, ' +
      'which the House passed in the 118th and which may be its own row on this list. Neither is ' +
      'the SAVE America Act (S. 1383).',
    'S. 1383|119': 'S. 1383 began as a Senate bill titled the Veterans Accessibility Advisory ' +
      'Committee Act. The House replaced its text with the SAVE America Act and passed that on ' +
      'roll 69 — the substitute is what this row is about, and it is why the Clerk’s page for the ' +
      'roll still shows the vehicle’s Senate title.',
    'H.R. 5746|117': 'H.R. 5746 was a shell, and the Clerk’s description for this roll still reads ' +
      '“NASA Enhanced Use Leasing Extension Act of 2021”. The House substituted the Freedom to ' +
      'Vote: John R. Lewis Act into it, and that substitute is the text that was voted on.',

    // Two more shell vehicles, from the same habit and with the same consequence: the
    // citation a reader follows lands on a title that has nothing to do with the vote.
    'H.R. 4346|117': 'H.R. 4346 began as the Legislative Branch Appropriations Act for fiscal ' +
      '2022, and its official title still says so. The CHIPS and Science Act text was substituted ' +
      'into it, and that substitute is what was voted on here.',
    'S. 2938|117': 'S. 2938 began as a bill to name a federal courthouse in Tallahassee, and the ' +
      'official title still reads that way. The Bipartisan Safer Communities Act text was ' +
      'substituted into it, which is why a citation for this roll can look unrelated to firearms.',

    // The two reconciliation bills, whose official titles name the budget resolution
    // they moved under and never the bill anyone knows them by.
    'H.R. 1319|117': 'H.R. 1319 is the American Rescue Plan Act. Its official title — “To provide ' +
      'for reconciliation pursuant to title II of S. Con. Res. 5” — names the budget resolution ' +
      'the bill moved under rather than the bill, so a citation for this roll may not look like ' +
      'a relief measure.',
    'H.R. 5376|117': 'H.R. 5376 is the Inflation Reduction Act, and its official title likewise ' +
      'names only a budget resolution. The same bill number carried the far larger Build Back ' +
      'Better Act through the House in 2021; the narrower text the Senate amended and both ' +
      'chambers passed in August 2022 is what this row is about.',

    // Six annual defence authorisations are on this list. They are different bills with
    // different contents, and only the fiscal year tells them apart.
    'H.R. 2670|118': 'This is the National Defense Authorization Act for fiscal year 2024. Five ' +
      'other annual defence authorisations can appear on this list — S. 1605 (FY2022), H.R. 7776 ' +
      '(FY2023), H.R. 5009 (FY2025), S. 1071 (FY2026) and H.R. 8800 (FY2027) — and each ' +
      'authorises a different year and carries different provisions.',
    'S. 1071|119': 'This is the National Defense Authorization Act for fiscal year 2026, a Senate ' +
      'bill. It is not the FY2027 authorisation (H.R. 8800), which may be its own row on this ' +
      'list, and not the FY2024 or FY2025 acts from the 118th Congress.',

    // The fourth SAVE instrument, and the only one whose own title says nothing about
    // elections. Without this the elections rows read as an appropriations vote and
    // the appropriations rows read as an elections vote, depending on which chip the
    // reader arrived from.
    'H.R. 8595|119': 'H.R. 8595 is on the record under its appropriations title — the fiscal 2027 ' +
      'national security, State Department and related programs bill. Division B of the same ' +
      'vehicle is the Safeguard American Voter Eligibility Act, and the election rows on this ' +
      'list read Division B rather than the appropriation. That makes it a fourth SAVE ' +
      'instrument, distinct from H.R. 8281 (118th), H.R. 22 (119th) and the SAVE America Act ' +
      'substituted into S. 1383.'
  };
  function _dosIdentNote(item) {
    if (!item || item.kind === 'position') return '';
    var num = String(item.number == null ? '' : item.number).trim();
    var cong = item.congress;
    if (!num || typeof cong !== 'number' || !isFinite(cong)) return '';
    return _DOS_IDENT_NOTE[num + '|' + cong] || '';
  }
  // "119th Congress". Ordinary English ordinals, so 121st and 122nd come out right
  // when someone reads this in 2029 — the 11x block is the exception every naive
  // implementation gets wrong.
  function _dosCongressLabel(n) {
    if (typeof n !== 'number' || !isFinite(n) || n <= 0) return '';
    var t = n % 100, u = n % 10;
    var suf = (t >= 11 && t <= 13) ? 'th' : (u === 1) ? 'st' : (u === 2) ? 'nd' : (u === 3) ? 'rd' : 'th';
    return n + suf + ' Congress';
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
      // PROCEDURAL, IN WORDS, ON THE ROW. The formal pattern used to discount a
      // procedural act to a quarter of its curator weight before deciding what to
      // call the record; it now counts acts, so a cloture vote and a passage vote
      // are one act each. That is only honest if the row says which it is, so it
      // does — the same way "narrow link" says how much of the document the link
      // rests on. Label, never a filter: the act is listed either way.
      base.procedural = !!(item && item.isProcedural);
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
        // other way in the dossier. Now read through _ledExecDir, which is those
        // two lines lifted out verbatim, so the Official Record's proof line and
        // this row cannot come apart on the inversion.
        var _xd = _ledExecDir(it, issueKey);
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
          effect: _xd,
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
        // The curated mechanism for THIS measure on THIS issue, where one is written.
        // Null everywhere else, which is the common case and stays the common case —
        // see _DOS_MECH.
        var mech = _dosMechFor(p.item, issueKey);
        // The curator's own note on WHY this measure was mapped to this issue lives on
        // the mapping row and, until now, was read only by the scorer. It is the one
        // piece of curated prose that exists for every mapped act, curated mechanism
        // or not — so where no `more` is written it rides down to L4 under its own
        // label. Not onto the face: these run to citation length and the face is
        // capped at two plain sentences on purpose.
        var mrat = (mech && mech.more) ? '' : _dosMechRationale(p.item, issueKey);
        out.push(withMapping(p.item, {
          lane: 'record',
          verdict: p.verdict,
          held: '', heldWhy: '',
          ident: b.bill || b.title || (b.isPosition ? 'Formal action' : 'Recorded vote'),
          title: p.item.title || p.item.shortTitle || '',
          act: b.act || '', question: b.question || '',
          date: b.date || '',
          standing: null, power: null, effect: '', stance: _recStance,
          // Curated when the measure has an entry in _DOS_MECH, derived when it does
          // not. Derived means the question plus the ballot for "what it did" and a
          // restatement of the mapping for "why it counts here" — both true, both
          // labelled as the derivations they are, and neither one inventing anything
          // the record does not record. The curated pair says what the measure does
          // and why that lands on this chip, which is the thing the record itself
          // cannot say. `more` rides down to L4 rather than onto the row face.
          plain: (mech && mech.did) || '',
          counts: (mech && mech.why) || '',
          rationale: (mech && mech.more) || mrat || '',
          fineFromMapping: !!(mrat && !(mech && mech.more)),
          // Which of the similarly-named measures this is, and — always, on this lane
          // — which congress the roll belongs to. The row's identity is a bare bill
          // number and bill numbers are reused every two years, so the congress is
          // part of the citation rather than decoration on it.
          identNote: _dosIdentNote(p.item),
          congress: _dosCongressLabel(p.item && p.item.congress),
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

  // ── HOW MANY DISTINCT DOCUMENTS ARE ACTUALLY UNDER A ROW ────────────────────
  // A row's `evidence.strength` and a leaf's `depth` both count ITEMS: six recorded
  // votes on one bill read as "6 votes on file", and nothing on the open face tells
  // a reader that all six are the same measure. That is the gap this closes. The
  // number below counts DOCUMENTS — distinct instruments in the judged evidence set
  // — which is what a hostile reader means when they ask how much a finding rests
  // on, and what the fragility audit already measures behind a lid.
  //
  // DERIVED, NEVER STORED, AND PRESENTATION ONLY. Nothing here is read by read(),
  // by a publishability floor, by a weight or by a verdict, and adding it changed
  // no score. A row that rests on one document says so beside a verdict that is
  // unchanged by its saying so — the marker is depth, not a different outcome.
  //
  // THE IDENTITY IS THE ONE THE DOSSIER ALREADY PRINTS. `ident` off _dosItems is
  // the instrument name a reader sees when they open the list, so the marker and
  // the list they open to check it cannot disagree about what "one document" means:
  // bill number on the 🏛️ lane, document id on ✒️, headline on the migrated formal
  // lane. HELD ITEMS ARE EXCLUDED — "judged evidence set" means the items that
  // produced the verdict, and an unjudged document neither supports the finding nor
  // thickens it.
  //
  // FAILS CLOSED IN THE DIRECTION THAT MATTERS. The wall is "no false single-measure
  // tag", so an item whose identity is only a lane fallback ("Recorded vote",
  // "Executive action") is counted as its own document rather than folded in with
  // another anonymous one, and any throw returns a spread that claims nothing. The
  // failure mode is a missing marker, never an invented one.
  var _INS_ANON = { 'recorded vote': 1, 'formal action': 1, 'executive action': 1 };
  function _insSpreadRaw(pid, issueKey, ov) {
    var out = { docs: 0, judged: 0, single: false, ident: '' };
    var items;
    try { items = _dosItems(pid, issueKey, ov) || []; } catch (e) { return out; }
    var seen = Object.create(null), anon = 0, first = '';
    for (var i = 0; i < items.length; i++) {
      var d = items[i];
      if (!d || d.held) continue;
      out.judged++;
      var raw = String(d.ident || '').trim();
      var k = raw.toLowerCase();
      if (!k || _INS_ANON[k]) { anon++; if (!first) first = raw; continue; }
      if (!seen[k]) { seen[k] = 1; if (!first) first = raw; }
    }
    out.docs = Object.keys(seen).length + anon;
    out.single = out.docs === 1 && out.judged > 0;
    out.ident = out.single ? first : '';
    return out;
  }
  // Memoised on the house epoch idiom, because the marker is asked for once per row
  // on a dense index and _dosItems walks a whole issue to answer it. Keyed on the
  // term scope as well as the epoch for the reason execRecordsForMemo is: the
  // current-term slice sits beside the all-time figure and holds a different set of
  // documents. `ov` is deliberately NOT part of the key — every caller derives it
  // from officialIssue(pid, issueKey), which is a fresh object on every call but the
  // same overlay for the same (pid, issue, scope, epoch).
  var _insSprCache = {}, _insSprEpoch = -1;
  function _insSpread(pid, issueKey, ov) {
    var ep = (typeof window.PDXDataEpoch === 'function') ? window.PDXDataEpoch() : 0;
    if (_insSprEpoch !== ep) { _insSprCache = {}; _insSprEpoch = ep; }
    var sc = '';
    try { sc = execTermScope().key; } catch (e) { sc = ''; }
    var k = norm(pid) + '||' + String(issueKey || '') + '||' + sc;
    if (Object.prototype.hasOwnProperty.call(_insSprCache, k)) return _insSprCache[k];
    var v = _insSpreadRaw(pid, issueKey, ov);
    _insSprCache[k] = v;
    return v;
  }
  // The row-shaped front door, for the surfaces that hold a row rather than a pid
  // and an issue key. Formal lane only: the public lane is not in the tested-row
  // count and is not in this either.
  function _insSpreadRow(r) {
    if (!r || !r.key) return { docs: 0, judged: 0, single: false, ident: '' };
    return _insSpread(r.pid, r.key, null);
  }

  // ── ONE INSTRUMENT IS NOT A PATTERN ─────────────────────────────────────────
  // The bucket words this profile files an issue under — Backed up, Contradicted,
  // Mixed — are honest names for a result. The SENTENCES under them are not always
  // honest at every depth: "The record points the same way as the word" describes a
  // record, and a row whose entire judged evidence is one omnibus yea does not have
  // one yet. It has an act. Same finding, wrong size.
  //
  // So every face that prints a bucket over a single-instrument row prints the
  // inventory with it: how many judged items, what the one instrument is, and the
  // flat statement that this is that act rather than a pattern across the issue.
  // Nothing here is a downgrade — the token, the colour, the bucket name, the
  // percentage and every floor in _recordDirectionIndex are untouched, and a row
  // that clears the depth the engine already requires is not annotated at all.
  // This only ever ADDS scope to copy that was speaking above its evidence.
  //
  // Reads _insSpread, which is the same memoised document count the Official
  // Record row face already shows as its "1 measure" chip, and which fails closed:
  // an unnameable instrument is counted as its own document rather than folded in
  // with another, so the marker can be missing but never invented.
  //   THE WORDING IS SPLIT FROM THE LOOKUP so a test can pin the sentence without
  // standing up a politician: _oneInstrumentSay is a pure function of a spread, and
  // _oneInstrumentVoice is that function over the memoised real one.
  function _oneInstrumentSay(sp) {
    if (!sp || !sp.single || !(sp.judged > 0)) return null;
    var inv = sp.judged === 1
      ? 'one judged item on file'
      : sp.judged + ' judged items on file, all the same measure';
    return {
      judged: sp.judged,
      ident: sp.ident || '',
      chip: sp.judged === 1 ? 'on 1 item' : 'on 1 measure',
      sentence: 'On ' + inv + (sp.ident ? ' — ' + sp.ident : '') +
        '. That is this instrument on its own — not a pattern across the issue.'
    };
  }
  function _oneInstrumentVoice(pid, issueKey, ov) {
    try { return _oneInstrumentSay(_insSpread(pid, issueKey, ov || null)); }
    catch (e) { return null; }
  }
  // The row-shaped front door, matching _insSpreadRow.
  function _oneInstrumentVoiceRow(r) {
    if (!r || !r.key) return null;
    return _oneInstrumentVoice(r.pid, r.key, null);
  }
  // Exposed for scripts/test-act-scope-copy.mjs: the sentence a face prints over a
  // single-instrument row, as a pure function of the spread behind it.
  try { window._pdxOneInstrumentSay = _oneInstrumentSay; } catch (e) {}

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
  // WHICH LANES HAVE A CURATION SLOT THE QUEUE CAN COUNT. `exec` and `formal` items
  // carry a per-issue sentence in the seed, so a derived line there means an empty
  // slot in a file a curator owns — a real, closeable piece of work, and the queue's
  // whole subject.
  //   The roll-call lane is the third case, and it stays out of the queue. It CAN carry
  // a curated pair — _DOS_MECH holds hand-written lines for the measures that have
  // been read, and a row that matches one renders in the curated voice like any other
  // — but the population behind it is every roll call the API can return, most of
  // them on measures nobody has written a line for and many of them procedural. A
  // queue counting all of those would report a backlog in the thousands that no
  // curator is working from, which is not a queue, it is a permanent apology. The
  // derived rows there are still labelled as the derivations they are; they are just
  // not counted as debt.
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
  //
  // AND WHERE NOTHING WAS SAID, THERE IS NO LESSON TO TEACH. The tail names the chip
  // this row wears and calls it the consequence of the direction — exactly right when
  // a stated position was tested, and actively misleading when none exists. On an
  // unscored row it was ending every sentence with "which is why this row reads
  // 'Limited record'", teaching a reader that the RECORD was found wanting when the
  // record had never been tested at all. A ledger row ends record-relative instead,
  // in the mapping's own voice and about the measure rather than the person.
  function _dosDirLine(d, issueKey, led) {
    if (d.held) return '';
    var lbl = _issueLabel(issueKey) || 'this issue';
    var v = VERDICTS[d.verdict];
    var ldir = led ? _dosItemDir(d) : '';
    var tail = led
      ? (ldir ? ' — ' + _ledDirPhrase(ldir, issueKey) + '.' : '.')
      : (v && v.label) ? ' — which is why this row reads “' + v.label + '”.' : '.';
    // A ballot needs the support meaning spelled out. "A Yea here counts as support"
    // is not obvious, and it is the single step where a reader most often assumes the
    // opposite of what the mapping says.
    if (d.lane === 'record' && d.support) {
      var meaning = (d.support === 'yea_opposes') ? 'opposition to' : 'support for';
      // Only the FIRST letter is lowered, never the whole phrase. The clause reads
      // "and they ___", so "Voted Yea" has to become "voted Yea" and not "voted yea":
      // the ballot is a proper term the rest of the row prints capitalised, and an
      // absence phrase ("Did not vote") has to survive the same transform intact.
      var cast = d.act ? String(d.act).charAt(0).toLowerCase() + String(d.act).slice(1) : '';
      return 'On ' + lbl + ' a Yea counts as ' + meaning + ' the issue’s direction' +
        (cast ? ', and they ' + cast : '') + tail;
    }
    if (!d.effect) return '';
    var dir = (d.effect === 'advances') ? 'advances' : 'cuts against';
    var s = 'On ' + lbl + ' this ' + _dosNoun(d) + ' ' + dir + ' the issue’s direction';
    if (!led && (d.stance === 'support' || d.stance === 'oppose')) {
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
  function _dosMechanism(d, issueKey, teach, led) {
    return {
      // Which document this is. First in the object because it is first on the face:
      // every other line is a claim ABOUT an instrument, and a reader cannot weigh any
      // of them until they know which instrument is being talked about.
      ident: (d && d.identNote) || '',
      said: _dosSaidLine(teach),
      did: _dosDidLine(d),
      counts: _dosCountsLine(d, issueKey),
      // Additive, and load-bearing only for rendering: `counts` is the same string
      // it has always been, so nothing that reads the sentence sees a change. These
      // two say how it was produced, which is what the row face now prints.
      countsBy: _dosCountsBy(d),
      needsCurator: _dosNeedsCurator(d),
      dir: _dosDirLine(d, issueKey, led),
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
  function _dosRowHtml(d, i, pid, issueKey, teach, led) {
    var v = d.held ? null : (VERDICTS[d.verdict] || VERDICTS.limited);
    // THREE STANDINGS, NOT TWO. A row is scored, or it is held back for a stated
    // reason, or — the case this adds — it is on record and outside Direction Match
    // because there is no stated position to test it against. Until now the third
    // collapsed into the first and wore "Limited record": nine votes on one issue
    // produced nine identical said-vs-did verdicts about a comparison nobody had run.
    //   The direction rides beside it on every row. It is what makes the list a
    // ledger rather than a pile — the reader can now see five of these went one way
    // and one went the other by scanning the faces, without opening anything.
    var ledRow = !!led && !d.held;
    var dir = _dosItemDir(d);
    var head =
      (d.held ? '<span class="pdxdos-rec-ico pdxdos-rec-hold" aria-hidden="true">⊘</span>'
        : ledRow ? '<span class="pdxdos-rec-ico" aria-hidden="true">' + _LED.ico + '</span>'
        : '<span class="pdxdos-rec-ico" style="color:' + v.color + '" aria-hidden="true">' + v.ico + '</span>') +
      '<span class="pdxdos-rec-id">' + esc(d.ident) + '</span>' +
      // The congress sits with the number because it is part of the number's meaning:
      // "H.R. 22" names one bill in the 119th and a different one in every other.
      (d.congress ? '<span class="pdxdos-rec-st">' + esc(d.congress) + '</span>' : '') +
      (d.question ? '<span class="pdxdos-rec-act">' + esc(d.question) + '</span>' : '') +
      (d.act ? '<span class="pdxdos-rec-act">' + esc(d.act) + '</span>' : '') +
      (dir && !d.held ? '<span class="pdxdos-rec-dir">' + esc(_ledDirShort(dir)) + '</span>' : '') +
      (d.held ? '<span class="pdxdos-rec-vd pdxdos-rec-hold">Not scored</span>'
        : ledRow ? '<span class="pdxdos-rec-vd pdxdos-rec-led" title="' + escAttr(_LED.full) + '">' +
            esc(_LED.status) + '</span>'
        : '<span class="pdxdos-rec-vd" style="color:' + v.color + '">' + esc(v.label) + '</span>') +
      (d.standing ? '<span class="pdxdos-rec-st">' + esc(d.standing.ico + ' ' + d.standing.label) + '</span>' : '') +
      (d.multi ? '<span class="pdxdos-rec-tag">🧩 ' + d.item.issues.length + ' issues</span>' : '') +
      (d.date ? '<span class="pdxdos-rec-st">' + esc(d.date) + '</span>' : '');
    // A held item answers a different second question — not "why does this count"
    // but "why is it NOT being counted" — so it keeps the hold reason in that slot.
    // It still gets a "What it did" line: a document on file with its mechanism
    // withheld is exactly the title-only row this pass exists to remove, and the
    // reason it was held is easier to judge when a reader can see what was held.
    var m = _dosMechanism(d, issueKey, teach, ledRow);
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
    //   AND ONE LINE COMES BEFORE ALL OF THAT. "Which measure this is" leads wherever
    // it exists, ahead even of the stated position, because it is not part of the
    // argument — it is the answer to which document the argument is about. On a list
    // where two rows are called SAVE Act and the next is called SAVE America Act, a
    // reader who meets the claim before the identity has to re-read the claim.
    var why = d.held
      ? (wk('Which measure this is:', m.ident, 'pdxdos-rec-idn') +
         wk('What it did:', m.did) +
         '<span class="pdxdos-rec-why pdxdos-rec-hold">' + esc(d.heldWhy) + '</span>')
      : (wk('Which measure this is:', m.ident, 'pdxdos-rec-idn') +
         wk('They said:', m.said, 'pdxdos-rec-said') +
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
  // One row per issue the document was mapped to — every one of them, never a slice.
  // The order is whatever the omnibus context hands over, which is now the shared Big
  // Picture order (taxonomy category, then label) rather than the old primary-first,
  // weight-descending score sort, with the issue the reader is standing on lifted to
  // the front. That lift is orientation, not rank: it is the row they arrived from.
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
        // Those get the direction marked with the ledger's dotted rule, so the row
        // reads as "mapped this way, not scored" rather than as a judgement that
        // quietly happened anyway — and reads it at full contrast, beside the badge
        // and the sentence that say the same thing in words.
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
      // What the RECORD itself holds: the question and the ballot. The curated
      // mechanism, where there is one, is already the row face one level up, and its
      // long form is the L4 fold below — so this block stays the record's own two
      // facts rather than repeating either of them. Padding it to match the ✒️ lane's
      // depth would be inventing detail the record does not have.
      var recBits = [];
      if (d.question) {
        recBits.push('The question on the floor: <b>' + esc(d.question) + '</b>');
        // First letter only — "They voted Yea", not "They voted yea", and an absence
        // phrase ("Did not vote") has to survive the same transform intact.
        if (d.act) recBits.push('They ' + esc(String(d.act).charAt(0).toLowerCase() + String(d.act).slice(1)));
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
    if (d.procedural) tags.push('<span class="pdxdos-tag">procedural vote</span>');
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
        // Third label, third promise. Mapping rationale is the curator explaining the
        // LINK, not the document explaining itself, and filing it under "what the
        // document actually says" would put a curator's sentence in the document's
        // mouth. Same voice separation the face already keeps between curated and
        // derived, carried one level down.
        : d.fineFromMapping
          ? 'Why this measure is on this list ▾'
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
    // Is this whole list on record and outside the score? Asked once, from the same
    // predicate the Official Record chip uses, and handed to every row — so the sheet
    // and the profile row can never disagree about whether this issue is scored.
    var led = _ledUnscored(ov);
    var split = _ledSplit(pid, issueKey, ov);
    // THE HEADLINE COUNT IS THE ROW COUNT. Whatever else this line says, the number
    // in front of the noun is the number of rows underneath it — so the expander can
    // never open onto fewer than it advertised.
    // …AND WHETHER THAT NUMBER IS AS BROAD AS IT LOOKS. The count in front of the
    // noun is an item count; the enumeration below repeats one name when they are
    // one document. Stated on the CLOSED face, because the closed face is what a
    // reader who does not open this level takes away.
    var spread = _insSpread(pid, issueKey, ov);
    // …AND WHICH WAY THEY CUT. The closed face already carried the depth of the list
    // and whether that depth is one measure wearing several names; what it never
    // carried was the shape of the record — five one way, one the other. A count of
    // mapped directions, on both sides, never a rate.
    var sum = cov.listed + ' ' + (cov.listed === 1 ? n.one : n.many) + ' listed here' +
      (cov.held ? ' — ' + cov.held + ' of them not scorable' : '') +
      ((spread.single && spread.judged > 1) ? ' · all one measure' : '') +
      (_ledSplitSay(split) ? ' · ' + _ledSplitSay(split) : '');
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
    // THE STANDING OF THE WHOLE LIST, ONCE, ABOVE THE ROWS. Each row says it for
    // itself, but a reader who opens a nine-row drawer meets the reason nine times
    // and the sentence explaining it never — so it is said here in full, in the same
    // words the profile row's chip uses, with the split attached.
    var ledNote = led
      ? '<div class="pdxdos-led">' + _LED.ico + ' ' + esc(_LED.full) + '. ' +
          esc((cov.listed === 1 ? 'This ' + n.one + ' is' : 'These ' + n.many + ' are') +
            ' on record and mapped to ' + (_issueLabel(issueKey) || 'this issue') + ', ' +
            (cov.listed === 1 ? 'listed' : 'listed in full') + ' and left out of Direction Match ' +
            'rather than counted either way. The direction' + (cov.listed === 1 ? '' : 's') +
            ' below ' + (cov.listed === 1 ? 'is' : 'are') + ' what each measure does to the issue — ' +
            'not a position anyone has stated.') +
          (_ledSplitLine(split, issueKey) ? '<span class="pdxdos-led-split">' +
            esc(_ledSplitLine(split, issueKey)) + '</span>' : '') +
        '</div>'
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
        gap + ledNote +
        items.map(function (d, i) { return _dosRowHtml(d, i, pid, issueKey, teach, led); }).join('') +
        note + _dosVrLinkHtml(pid, issueKey, ov) +
      '</details>';
  }

  // ── THE WAY OUT INTO THE FULL LEDGER ────────────────────────────────────────
  // The Official Record row has offered "See all N mapped votes on <issue> →" for a
  // while; the dossier — the deeper surface, the one a reader reaches by asking for
  // more — offered no such door at all, so the trail ran out exactly where it should
  // have kept going. Same destination, same delegated hook, same wording, so the two
  // doors are recognisably one door. The ✒️ lane is excluded for the same reason it is
  // there: a president's roll-call list is empty by definition, and the primary
  // sources are already linked on each row.
  function _dosVrLinkHtml(pid, issueKey, ov) {
    if (!ov || ov.lane === 'exec') return '';
    var total = (ov.record && ov.record.total) || 0;
    if (!total) return '';
    var label = total === 1
      ? 'Open this vote in the full record →'
      : 'See all ' + total + ' mapped votes on ' + (_issueLabel(issueKey) || 'this issue') + ' →';
    return '<button type="button" class="pdxdos-vrlink"' +
      ' data-pdxc-vrissue="' + escAttr(issueKey) + '"' +
      ' data-pdxc-vrpid="' + escAttr(pid) + '">' + esc(label) + '</button>';
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
  // Backed up, Not enough on file. A reader who tapped a row got here from inside one of
  // those buckets, and this line is what tells them the sheet they landed on is the
  // same finding at greater depth rather than a different reading of it.
  //
  // FAIL CLOSED, THREE WAYS. The vocabulary is read from PDXWordAction, which owns it;
  // if that module is not loaded this prints nothing rather than inventing a second
  // set of words for the same four outcomes. A verdict with no bucket — pending,
  // no record, nothing stated — prints nothing either, because it was never in the
  // index to be filed anywhere. And neither was a row we hold instruments for and no
  // stated position of theirs: the index drops those before bucketing (see the
  // `!r.stance.label` guard in outcomeBuckets), so filing one under the coverage noun here
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
  //   AND THE SUB-LINE IS SIZED TO THE EVIDENCE. The bucket's own sub-line speaks
  // about "the record" — which is right for a row with a record and wrong for a row
  // holding one instrument. On those rows the inventory replaces it: same bucket,
  // same colour, same word, with the scope stated instead of a pattern implied.
  function _dosBucketHtml(r) {
    var o = _dosBucket(r);
    if (!o) return '';
    var one = _oneInstrumentVoiceRow(r);
    var sub = one ? one.sentence : (o.sub || '');
    return '<div class="pdxdos-bucket" style="--c:' + o.col + ';">' +
        '<span class="pdxdos-bucket-k">In the issue index</span>' +
        '<span class="pdxdos-bucket-v">' + esc(o.short) +
          (one ? '<span class="pdxdos-bucket-d">' + esc(one.chip) + '</span>' : '') + '</span>' +
        (sub ? '<span class="pdxdos-bucket-s">' + esc(sub) + '</span>' : '') +
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
  function _dosDoorLabel(label, o, said, depth) {
    return 'Open the issue dossier: ' + String(label == null ? '' : label) +
      (o ? ' — ' + o.short : '') + (said ? ' · they said: ' + said : '') +
      (depth ? ' · ' + depth : '');
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
      // An `unjudged` row is in the same position for the mirror-image reason: both
      // halves are on file, nothing has been tested, and no decision was reached.
      lane = (res.shape === 'no_stance' || res.shape === 'unjudged')
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
      // ── AND HOW MANY DOCUMENTS THAT COUNT IS SPREAD ACROSS ──────────────────
      // Every count in this sentence is an ITEM count. "6 judged votes on this
      // issue. All 6 are listed below." is true, checkable, and reads as six
      // independent tests — when six roll calls on one bill are one. The reader who
      // opens L2 finds that out; the reader who stops at the assembled answer, which
      // is the level that is open by default, does not.
      //
      // Said in the same sentence as the count it qualifies, rather than in the
      // caveat below, because the caveat fires only at a judged depth of two or
      // fewer — which is precisely the wrong place for a disclosure whose whole
      // subject is a row that looks deep. The verdict above is untouched.
      var _one = _insSpread(pid, issueKey, r.ov);
      if (_one.single && _one.judged > 1) {
        lane += ' All of them are the same measure' +
          (_one.ident ? ' — ' + _one.ident : '') + '.';
      }
    } else {
      lane = 'No lane has been able to decide this one yet.';
    }
    lines.push('<div class="pdxdos-line"><span class="pdxdos-k">The record</span>' +
      '<span class="pdxdos-v pdxdos-vd" style="color:' + res.color + '">' + esc(res.ico + ' ' + res.label) + '</span>' +
      '</div>' +
      '<div class="pdxdos-lane">' + esc(lane) + '</div>');
    // COMPOSITION and DEPTH, borrowed verbatim from the stance row. Composition
    // now prints on every scored row — the counts the percentage divides — and on
    // unscored rows only where they carry tension. Borrowing it verbatim is what
    // keeps this face and the row face from stating different denominators for
    // the same verdict.
    //
    // WITH THE LANE NAMED, HERE. This face has no lane column: the row face puts
    // "Formal · Direction match · this issue" in its own slot on the result line,
    // and without it these two tallies sit a finger's width above a receipt count
    // with nothing saying which of them the score is made of. So the key travels
    // with the counts. The split stays on this line rather than moving up to the
    // verdict — there is no percentage on this face for it to be the denominator
    // of, and this face is not the place to introduce one.
    var comp = _stCompHtml(r, res, { formalKey: true });
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
    else if (res.state === 'tested') {
      // WHICH DEPTH THIS IS A CAVEAT ABOUT. It used to be `evidence.total` — how
      // much is on file for the issue. That is a different number from how much
      // was JUDGED against the claim, and now that the row face states the judged
      // count next to the percentage, the two could be read side by side and
      // contradict: 7 rows printed "This rests on 1 vote on record" directly
      // above a composition line reading "9 aligned · 0 against", and 45 more
      // carried the face's thin qualifier while this line said nothing at all.
      //
      // The judged count wins, because it is the denominator of the percentage
      // both lines sit under. Evidence total stays as the fallback for a tested
      // row with no directional split to read — rare, but it is the one case
      // where the old number is the only one there is.
      var cvSplit = _stSplit(r);
      var cvDepth = cvSplit ? cvSplit.judged : r.evidence.total;
      if (cvDepth > 0 && cvDepth <= 2) {
        var depth = [];
        if (cvSplit) {
          var cvUnit = (cvSplit.basis === 'public_record')
            ? 'public-record item' : (cvSplit.judged === 1 ? n.one : n.many);
          depth.push(cvSplit.judged + ' judged ' +
            (cvSplit.basis === 'public_record' && cvSplit.judged !== 1 ? cvUnit + 's' : cvUnit));
        } else {
          if (r.evidence.actions > 0) {
            depth.push(r.evidence.actions + ' ' + (r.evidence.actions === 1 ? n.one : n.many) + ' on record');
          }
          if (r.evidence.public > 0) {
            depth.push(r.evidence.public + ' public receipt' + (r.evidence.public === 1 ? '' : 's'));
          }
        }
        caveat = 'This rests on ' + (depth.length ? depth.join(' and ') :
            cvDepth + ' item' + (cvDepth === 1 ? '' : 's')) +
          // A Mixed row has no single direction, so "the direction is real" is the one
          // thing this caveat must not say there — it would read as a verdict the
          // bucket explicitly declined to reach. What is real on a Mixed row is the
          // split: the record genuinely went both ways, on very few items.
          '. ' + (r.verdict.token === 'mixed'
            ? 'The split is real; a pattern is not established at that depth.'
            : 'The direction is real; a pattern is not established at that depth.');
      }
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
        : (res.shape === 'unjudged')
        ? 'Set aside from the profile’s pooled ⚖️ ' + res.metric +
          ' rather than counted either way — none of these ' + n.many + ' has been judged ' +
          'against the position they state, so nothing about this issue moves that number.'
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
    // 🔍 THE SAME ISSUE, ACROSS EVERYONE. This used to be the last link on a
    // 🧭 Stances & Connections row and nowhere else. That section is unmounted —
    // the tree is the one browse surface and this sheet is the one deep dive — so
    // the jump out to the Issue View comes here, where the reader is already
    // holding the issue it would open. It is a `[data-pdxst-go]` button so it runs
    // the SAME _stNav('issue') route the stance rows ran: one door, one handler.
    //   FAIL CLOSED, TWICE. Only for a key the Issue View can actually rank (a Core
    // National Issue), and only when the overlay module is on the page. A link into
    // an empty ranking, or a link to a module that never loaded, is worse than no
    // link — so where either test fails the row simply has three exits instead of
    // four, exactly as it did before.
    var ivOn = false;
    try { ivOn = !!(window.PDXIssueView && typeof window.PDXIssueView.open === 'function'); } catch (e) {}
    if (ivOn && _icSkin(issueKey).on) {
      items.push('<button type="button" class="pdxgap-nx" data-pdxst-go="issue"' +
        ' data-pdxst-target="" data-pdxst-pid="' + escAttr(pid) + '"' +
        ' data-pdxst-key="' + escAttr(issueKey) + '">' +
        '<span class="pdxgap-nx-ico" aria-hidden="true">🔍</span>' +
        '<span>Everyone on this issue <span aria-hidden="true">→</span></span></button>');
    }
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
    var one = _oneInstrumentVoice(pid, issueKey, null);
    return '<button type="button" class="pdxdv-open pdxdos-door" data-pdxc-gap="' + esc(issueKey) +
      '" data-pdxc-gap-pid="' + esc(pid) + '"' +
      ' data-pdxc-gap-origin="' + escAttr(orRowId(pid, issueKey)) + '"' +
      ' style="--c:' + o.col + '"' +
      ' aria-label="' + escAttr(_dosDoorLabel(_issueLabel(issueKey), o, '', one ? one.chip : '')) + '"' +
      ' title="' + escAttr(one ? one.sentence + ' Everything on the record for this issue, in one place.'
        : 'Everything on the record for this issue, in one place') + '">' +
      '<span class="pdxdos-door-b">' + esc(o.short) +
        (one ? '<span class="pdxdos-door-1">' + esc(one.chip) + '</span>' : '') + '</span>' +
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
      row('↔️', 'What the divergence labels mean', 'They compare the <b>two records</b> — formal and public — and nothing more. <b>Same story</b> — the two agree. <b>Some daylight</b> — mostly, with a gap. <b>Different stories</b> — they disagree. These deliberately avoid the words the issue index uses for a result (Backed up · Mixed · Contradicted · Not enough on file): those say whether the record backed what was <b>said</b>, which is a different question from whether the two records agree with <b>each other</b>. Neither of these is a score.') +
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
    // ── THE LEDGER LANE, EXPOSED READ-ONLY ─────────────────────────────────
    // Same reason saydoScore is exposed: the copy and the walls around this lane are
    // the product, so scripts/test-vote-ledger.mjs probes the real functions rather
    // than scraping source for the strings. `ledger.unscored` is the predicate every
    // surface gates on, `ledger.split` is the only aggregation this pass performs,
    // and LED is the one copy table all of them read.
    ledger: {
      LED: _LED,
      unscored: _ledUnscored,
      onRecord: _ledOnRecord,
      itemDir: _ledItemDir,
      execDir: _ledExecDir,
      dirShort: _ledDirShort,
      dirPhrase: _ledDirPhrase,
      dirLong: _ledDirLong,
      split: _ledSplit,
      splitSay: _ledSplitSay,
      splitLine: _ledSplitLine,
      rowVerdict: _orRowVerdict
    },
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
    // WHAT THE RECORD DID, for the surfaces a voter actually chooses on. `slot`
    // returns the data shape (state / counts / clause / disclosure), `html` its
    // markup, `for` both in one call. Display-only by construction: there is no
    // `pct` on the shape, nothing ordinal to sort or filter on, and no path from
    // any of the three back into Direction Match. See the long note over _rdSlot.
    recordDirection: {
      slot: _rdSlot,
      html: _rdSlotHtml,
      for: _rdSlotFor,
      NOTE: _RD_SLOT_NOTE,
      NOTE_SAID: _RD_SLOT_NOTE_SAID,
      NOTE_THIN: _RD_SLOT_NOTE_THIN
    },
    // 🏛 FORMAL-RECORD PATTERN TIERS, for the row faces. `tier` returns the shape
    // (tier / weight / tone / label / counts) for one row, `html` the chip. Both
    // read _recordPatternTier(), which reads the record-direction index — so a
    // second surface adopting this cannot end up with a different vocabulary or a
    // different threshold than the rows have. Exposed for the harnesses and for
    // the decision-surface slot above, which may take the tier's wording in a
    // later pass; it deliberately has not yet, because that slot's contract test
    // governs its empty states and its non-ordinality and this pass changes
    // neither. Nothing here is a stance and nothing here is scored: see the long
    // note over _stPatternHtml.
    recordPattern: {
      tier: _stPatternTier,
      html: _stPatternHtml,
      TONE: _ST_PAT_TONE,
      // THE DISPLAY READ, and the accessor a browse surface should use. `tier`
      // above is the characterisation read and is unchanged — the cards and the
      // formal-pattern index still gate on it and still exclude what it declines.
      // `display` answers the other question ("is there a record here at all, and
      // what did it do?") from one formal item up, and returns the whole slot: its
      // state, its label, its depth, its reason line, and the percentage Direction
      // Match had already published where there is one. Nothing here is a stance,
      // nothing here is scored, and nothing scoring reads it.
      display: _stRecordDisplay,
      ONFILE: _ST_REC_ONFILE,
      NONE: _ST_REC_NONE,
      PENDING: _ST_REC_PENDING,
      NOTE_SCORED: _ST_REC_NOTE_SCORED
    },
    // 🧾 HOW BROAD THE JUDGED EVIDENCE IS, in documents rather than in items.
    // `spread(pid, issueKey)` and `row(r)` both return { docs, judged, single,
    // ident }. `single` is the marker's whole contract: this tested finding rests
    // on ONE distinct measure. Exposed because four open surfaces need the same
    // answer — the issue-index face, the stance-tree leaf, the dossier's assembled
    // answer and the Official Record face — and four private copies of "is it one
    // document" is exactly how a marker ends up on a row that has two. Presentation
    // only; see the long note over _insSpreadRaw for what it counts and why it
    // refuses to guess.
    instruments: {
      spread: _insSpread,
      row: _insSpreadRow,
      ANON: _INS_ANON
    },
    // 🏛 THE FULL FORMAL-PATTERN ISSUE INDEX. `rows` is the list — one entry per
    // issue with a pattern read or formal instruments on file, sorted strongest
    // first — and `html` is the mounted surface with its own filters. `count` is
    // what the Full Record on the Issues CTA promises, so the button and the list
    // it opens cannot disagree about how many issues there are. Presentation only:
    // every field on a row is read off the shared row model or the shared pattern
    // engine, nothing here writes to a position map, and no scoring path reads it.
    //
    // `opts.mount` names the instance. Two of them are live on one politician now
    // — the profile face and the overlay above it — and the key is what keeps
    // their row ids distinct and their remembered filters separate. Omit it and
    // you get the original single 'default' instance, ids and all.
    // 🏛 THE STANDOUT STRIP. `pick(pid)` is the selection — up to two one-sided
    // issues and up to two conflicted ones, each carrying the tier, the counts and
    // the plain-language word from the shared vocabulary — and `html(pid)` mounts
    // it. Selection only: every field is read off _fpiRows(), the depth floor is
    // the pattern engine's own (_PDX_RD_MIN_JUDGED), and an empty bucket renders
    // nothing rather than a filler issue. No percentage, no ranking against anyone
    // else, no party framing, and no path from here into Direction Match.
    recordStandout: {
      pick: recordStandout,
      html: recordStandoutHtml,
      CAP: _SO_CAP,
      MIN_ISSUES: _SO_MIN_ISSUES,
      GROUPS: _SO_GROUPS,
      HEAD: _SO_HEAD,
      WALL_TAIL: _SO_WALL_TAIL,
      WALL_WHOLE: _SO_WALL_WHOLE
    },
    // ✒️ The same spine slot on the executive lane. `pick(pid)` reports what the
    // formal record holds — the inventory, and up to two issues per bucket where
    // the acts ran one way or both ways — and `html(pid)` mounts it. Empty string
    // for anyone PDXExecRecord does not cover, so the two record blocks can never
    // both appear. Every figure is lifted off PDXExecRecord.summary().rows: no
    // pattern tier invented for a lane that has none, no vote language, no stance
    // written anywhere, no percentage, and no path from here into Direction Match.
    execRecordSummary: {
      pick: execRecordSummary,
      html: execRecordSummaryHtml,
      CAP: _XS_CAP,
      MIN_ISSUES: _XS_MIN_ISSUES,
      floor: _xsFloor,
      GROUPS: _XS_GROUPS,
      HEAD: _XS_HEAD,
      JUMP: _XS_JUMP,
      WALL: _XS_WALL
    },
    formalPatternIndex: {
      rows: _fpiRows,
      html: formalPatternIndexHtml,
      count: function (pid) { try { return _fpiRows(pid).length; } catch (e) { return 0; } },
      // The four-fact summary of the same rows — depth, tops, splits, thin —
      // for a surface with room for four lines instead of sixty. Counts and
      // slices only; see the long note over _fpiShape for why there is no
      // percentage in it and why there cannot be one.
      shape: _fpiShape,
      TOPS_CAP: _FPI_TOPS_CAP,
      SPLITS_CAP: _FPI_SPLITS_CAP,
      VIEWS: _FPI_VIEW_ORDER,
      WALL: _FPI_WALL
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
    publicShape: publicShape,
    // ── THE TWO LANES' LABELS, AS DATA ──────────────────────────────────────
    // Published so no surface has to spell "Outside the score" for itself. The
    // strings ARE the wall: a second surface writing its own version of them is how
    // one lane comes to be called two things, and how the explicit
    // not-in-Direction-Match marker quietly goes missing from the one row a reader
    // deep-linked to. Read them; never re-type them.
    LANE_LABELS: {
      formal: FORMAL_LANE,
      publicDecided: PUBDEC_LANE,
      outside: OTS_LANE,
      outsideSub: OTS_SUB,
      outsideFull: OTS_FULL,
      outsideTag: PUB_TAG,
      outsideEmpty: PUB_EMPTY,
      outsideNote: PUB_NOTE
    },
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
    // PHASE 0: the one counts object. stated / tested / scorable / onRecord /
    // shown / signature, each with the wording for which M it means in `.of`.
    // Every surface printing "N of M issues" reads this and no surface counts
    // its own — see the long note over _profileCountsBuild.
    profileCounts: profileCounts,
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
    //   UNMOUNTED, STILL EXPORTED — the same disposition Stance at a Glance and
    // Connecting the Dots have. Nothing on a profile renders it: it published the
    // same person×issue set as 🌳 All Issues by Topic, in a different sort, as a
    // second full-height issue browser below the gateway. The one thing it could do
    // that the tree could not — rank across topics — is a view of the tree now
    // (PDXStanceTree SORTS: Topic | Tension), and its one unique exit, 🔍 Everyone
    // on this issue, is a step in the dossier's "Where to next" row. The renderer
    // stays defined and exported so the harnesses that read a row's full face, and
    // anything embedding this list outside a profile, keep working.
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
  // The dossier door is a document-level listener, and until now it was only ever
  // installed as a side effect of rendering some profile section. Surfaces outside
  // this module mark their own doors with [data-pdxc-gap] — a race-sheet snapshot
  // cell, a peek chip — and on a session that never opened a profile first, those
  // doors were dead. Binding here costs one idempotent call and makes the gateway a
  // property of the module being loaded rather than of what happened to be drawn.
  try { bindGateway(); } catch (e) {}
})();
