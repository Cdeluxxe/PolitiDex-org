/**
 * PolitiDex Stance Helper Functions
 * Extracted from index.html for maintainability
 * These functions operate on ISSUE_STANCE_DATA and power politician position lookups.
 */
(function() {
    'use strict';

    // ── THE DERIVATION EPOCH ──────────────────────────────────────────────────
    // One counter that every derived-read cache in the app keys itself on.
    //
    // WHY IT EXISTS. Nothing on a profile is stored — every figure, bucket and row
    // is derived, on demand, from the curated data plus whatever the voting-record
    // fetch has landed. That is the right shape and it was being paid for many
    // times over: opening a presidential profile ran the same derivations from
    // seven independent surfaces, and every one of them walked the whole action
    // pool, re-resolved the same stance list and re-ran the same source gate. The
    // work is pure, so the second answer is always the first answer.
    //
    // The only thing a cache of pure derivations needs is a truthful "the inputs
    // changed" signal, and there are exactly two of those in this app: a full
    // profile document merging in from Firestore, and a member's roll-call record
    // arriving from the Voting Record API. Both now bump this counter, and every
    // cache below stores the epoch it was computed under and recomputes when the
    // two disagree. A missed bump costs a stale read; a spurious bump costs one
    // recomputation. Both are cheap, and the failure mode is the safe direction.
    //
    // It lives here because stance-helpers.js is the earliest module every lane —
    // 🏛️ congressional, ✒️ executive, Say-vs-Do — already depends on.
    var _epoch = 1;
    window.PDXDataEpoch = function () { return _epoch; };
    window.PDXDataChanged = function () { _epoch++; return _epoch; };

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
      emendenhall:'erin_mendenhall_slc', jwilson:'jenny_wilson_slco',
      // ── Retired ids folded into a canonical one ────────────────────────────
      // These are not name variants of two records — they are ONE person who
      // accumulated rows under two ids, since resolved by a merge migration. The
      // canonical id owns the curated stance block; the retired id maps to it so a
      // Firestore doc or saved user record still under the old id lights up. Keep
      // in step with db/vr-pid-aliases.json (server-side write + read path) and
      // PDX_PID_ALIASES below — scripts/test-identity-integrity.mjs enforces it.
      //
      // `cullimore_s19` is the district-ballot id that duplicated Sen. Kirk
      // Cullimore's roster record (District 9 pre-2023 vs District 19 after
      // redistricting — one person, one seat, two numbers). Canonical is
      // `kcullimore`; the curated cards live under the name-slug key
      // `kirk_cullimore`, so `kcullimore` is bridged explicitly below rather than
      // leaning on the display-name slug fallback in _resolveStanceList().
      //
      // `calbrecht` is the content-side duplicate of Rep. Carl Albrecht: it held six
      // bill-sourced stance cards while the roster/browse/Utah-map id held three
      // unsourced ones. The cards were merged into `carl_albrecht` (the roster id,
      // per the note above about keeping the stance key equal to it), so this alias
      // is the plain retired → canonical case with no name-slug hop.
      susan_collins:'collins', kennedy_rfk:'rfkjr', cullimore_s19:'kcullimore',
      kcullimore:'kirk_cullimore', calbrecht:'carl_albrecht',
      // `derek_brown` is the content-side duplicate of Utah AG Derek Brown: it
      // held four sourced cards that ISSUE_STANCE_DATA['derek_brown_ut'] shadowed
      // outright, since the direct id hit wins over every fallback. Folded into
      // the roster id; this keeps an old bookmark or saved pick resolving.
      derek_brown:'derek_brown_ut'
    };
    window.STANCE_ALIASES = STANCE_ALIASES;

    // ── Retired → canonical politician id (voting-record side) ────────────────
    // The mirror of db/vr-pid-aliases.json for the client. `politician_id` is free
    // text in the vr_* tables, so one person could end up with rows under two ids;
    // once a merge migration folds one away, every surface must ask for the
    // canonical id or it gets an empty record. The Voting Record API canonicalizes
    // incoming ids too, but the client caches by id — so it has to agree, or a
    // record fetched as `collins` would never be found by a lookup for
    // `susan_collins`. Only ids an actual merge has retired belong here — normally a
    // shipped migration, but a person with no vr_* rows at all (a cabinet officer
    // casts no roll calls) is merged in the data files instead, with no migration to
    // point at. `kennedy_rfk` is that case; see db/vr-pid-aliases.json for the note.
    // `cullimore_s19` is the same case for a state legislator: the vr_* tables hold
    // congressional roll calls, so he has no rows under either id and the merge was
    // done in the data files. `calbrecht` (Rep. Carl Albrecht's content-side
    // duplicate, merged into the roster id `carl_albrecht`) is that case again.
    // `derek_brown` (the Utah Attorney General's content-side duplicate, merged
    // into the roster id `derek_brown_ut`) is the same case once more — a state
    // officer casts no congressional roll calls, so there are no rows to move.
    var PDX_PID_ALIASES = {
      susan_collins: 'collins', kennedy_rfk: 'rfkjr', cullimore_s19: 'kcullimore',
      calbrecht: 'carl_albrecht', derek_brown: 'derek_brown_ut'
    };
    window.PDX_PID_ALIASES = PDX_PID_ALIASES;
    // Resolve a politician id to the one the voting record is stored under.
    window.PDXCanonicalPid = function (id) {
      return (id && PDX_PID_ALIASES[id]) || id;
    };

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

    // COLLAPSE RULE — first directional card wins.
    // An issueKey routinely carries more than one card: a stated-position card and a
    // narration card describing something that happened. Two rules were in play and
    // they disagreed: this map took LAST-wins while wordLedger (word-action.js) takes
    // FIRST-wins, so the same list could name two different cards as one issue's word.
    // Worse, last-wins let a non-directional ('mixed') narration card overwrite a
    // stated direction — and a 'mixed' stance short-circuits _issueRecordSummary,
    // minting "Mixed record" without the record ever being read. That is exactly the
    // soft middle Mixed is not allowed to be. So: first card wins, except that a
    // directional stance always outranks a non-directional one regardless of order.
    function _polPositionMap(id, p) {
      var out = {};
      var list = _resolveStanceList(id, p);
      if (!list) return out;
      list.forEach(function(s) {
        if (!s || !s.issueKey) return;
        var stance = s.issueStance || s.pos || 'mixed';
        var prev = out[s.issueKey];
        // Keep the incumbent unless it is non-directional and this one is directional.
        if (prev && !(prev.stance === 'mixed' && stance !== 'mixed')) return;
        out[s.issueKey] = {
          stance: stance,
          topic: s.topic, text: s.text, icon: s.icon,
          evidence: s.evidence, source: s.source
        };
      });
      return out;
    }
    // MEMOIZED — see THE DERIVATION EPOCH at the top of this file.
    //
    // This map is the single stance source both scoring lanes read, and every read
    // is per (politician, issue): one presidential profile called it 1,295 times to
    // paint one screen, rebuilding the same ~20-key object from the same ~26-card
    // list each time. The result is a pure function of the curated list, so it is
    // computed once per politician per epoch and handed back by reference.
    //
    // Callers must not mutate the returned object. They never did — every call site
    // in the app reads `pm[issueKey].stance` and nothing writes — and the shared
    // reference is what makes the memo worth having.
    var _pmCache = {}, _pmEpoch = 0;
    function _polPositionMapMemo(id, p) {
      var ep = _epoch;
      if (_pmEpoch !== ep) { _pmCache = {}; _pmEpoch = ep; }
      // The name is part of the key: _resolveStanceList falls back to a slug of the
      // display name, so the same id with a different profile can resolve a
      // different list. Cheap to include, and it removes the one way this could lie.
      var k = String(id == null ? '' : id) + '||' + String((p && p.name) || '');
      if (Object.prototype.hasOwnProperty.call(_pmCache, k)) return _pmCache[k];
      var v = _polPositionMap(id, p);
      _pmCache[k] = v;
      return v;
    }
    window._polPositionMap = _polPositionMapMemo;

    // ── Stance-vs-Record engine ("say vs. do") ─────────────────────────────────
    // Pure, side-effect-free derivation that compares what a politician SAYS (their
    // documented stance, from _polPositionMap / ISSUE_STANCE_DATA) against what they
    // actually DID (their voting record, from the /api/voting-record Function). Both
    // sides are keyed by the SAME ISSUE_MAP issueKey, so the comparison is one-to-one.
    //
    // The linchpin is the `supportMeaning` field the API attaches to every measure↔
    // issue mapping: 'yea_supports' means a YEA vote ADVANCES that issue, 'yea_opposes'
    // means a YEA vote CUTS AGAINST it. This is what makes verdicts correct even for
    // multi-issue / omnibus bills, where a single vote means opposite things for
    // different issues. Concrete example — H.R. 1 (One Big Beautiful Bill Act), on
    // which a member votes YEA:
    //   • issue 'lower_taxes'  mapping supportMeaning 'yea_supports'
    //       → the YEA effectively SUPPORTS lowering taxes.
    //   • issue 'healthcare'   mapping supportMeaning 'yea_opposes' (it cut Medicaid)
    //       → the SAME YEA effectively OPPOSES expanding healthcare access.
    // So a member who SAYS they support both lower taxes and healthcare access is
    // scored 'consistent' on taxes but 'contradicts' on healthcare — from one vote,
    // because each issue mapping carries its own supportMeaning. Without that field a
    // naive "yea = support everything" reading would be wrong on every omnibus bill.
    //
    // Verdict vocabulary (per single record, per issue):
    //   consistent   — the action matches the stated stance
    //   contradicts  — the action runs against the stated stance
    //   mixed        — the stance itself is 'mixed' (no single expectation)
    //   no_position  — the member took no position on the vote (present / not voting)
    //   no_stance    — there is no documented stance to compare against
    // Nothing here renders anything or mutates its inputs — callers (Phase 3 UI) turn
    // these values into badges/highlights.

    // Down-weight procedural/motion votes so a messaging motion can't outweigh a
    // substantive passage vote in the aggregate verdict.
    var _RECORD_PROCEDURAL_FACTOR = 0.25;

    var _RECORD_SUMMARY_LABEL = {
      consistent:  'Backs it up',
      contradicts: 'Says one thing, votes another',
      mixed:       'Mixed record',
      no_position: 'No clear position in votes',
      no_stance:   'No stated stance',
      no_record:   'No voting record yet'
    };

    // Find the issue mapping on a record item that matches `issueKey` (a record can
    // map to several issues; we want THIS issue's mapping to read its supportMeaning
    // and weight). Returns null when the record doesn't pertain to the issue.
    function _findIssueMapping(item, issueKey) {
      if (!item || !item.issues || !item.issues.length) return null;
      for (var i = 0; i < item.issues.length; i++) {
        if (item.issues[i] && item.issues[i].issueKey === issueKey) return item.issues[i];
      }
      return null;
    }

    // yea → advances the measure; nay → opposes it; present/not-voting → no position.
    function _positionAdvances(position) {
      if (position === 'yea') return true;
      if (position === 'nay') return false;
      return null; // 'present', 'not_voting', or anything unrecognised
    }

    // Does this action effectively SUPPORT the issue, given the mapping's
    // supportMeaning? Returns true (supports), false (opposes) or null (no position).
    //
    // Works for both kinds of record the API returns:
    //   • votes     — item.position is 'yea'|'nay'|'present'|'not_voting'
    //   • positions — item.supports is true|false|null (e.g. sponsor/cosponsor/amicus)
    // For convenience a raw position string may be passed instead of an item object.
    // The mapping direction is applied last: 'yea_opposes' flips the effective read,
    // which is precisely what keeps multi-issue bills correct (see block comment).
    function _voteEffectiveSupport(itemOrPosition, supportMeaning) {
      var advances; // did the actor push the MEASURE forward? true / false / null
      if (typeof itemOrPosition === 'string') {
        advances = _positionAdvances(itemOrPosition);
      } else if (itemOrPosition && itemOrPosition.kind === 'position') {
        // A co-sponsorship / amicus etc.: `supports` says if it advanced the measure.
        advances = (typeof itemOrPosition.supports === 'boolean') ? itemOrPosition.supports : null;
      } else if (itemOrPosition && typeof itemOrPosition === 'object') {
        advances = _positionAdvances(itemOrPosition.position);
      } else {
        return null;
      }
      if (advances === null) return null;
      // PROCEDURAL INVERSION: on a motion to recommit or to table, a yea BLOCKS the
      // measure, so `advances` above is backwards. The Function marks those roll calls
      // (item.advanceInverted, from yeaBlocksMeasure() in vr-pack.ts / voting-record.mts)
      // rather than having this file re-parse vote questions. This is a separate step
      // from `supportMeaning` below: this one fixes vote→measure, that one measure→issue.
      // Without it, a member who votes NAY on recommitting a bill they support reads as
      // opposing it — a fabricated contradiction that the procedural down-weight only
      // shrinks, never corrects.
      if (itemOrPosition && typeof itemOrPosition === 'object' && itemOrPosition.advanceInverted) {
        advances = !advances;
      }
      // 'yea_opposes' inverts the mapping; anything else (incl. undefined) is treated
      // as the safe default 'yea_supports'.
      return (supportMeaning === 'yea_opposes') ? !advances : advances;
    }

    // Compare ONE stance to ONE action's effective support → a verdict token.
    // stance ∈ 'support'|'oppose'|'mixed'|falsy; effectiveSupport ∈ true|false|null.
    function _stanceVoteVerdict(stance, effectiveSupport) {
      if (!stance) return 'no_stance';
      if (effectiveSupport === null || typeof effectiveSupport === 'undefined') return 'no_position';
      if (stance === 'mixed') return 'mixed';
      if (stance === 'support') return effectiveSupport ? 'consistent' : 'contradicts';
      if (stance === 'oppose')  return effectiveSupport ? 'contradicts' : 'consistent';
      return 'mixed'; // unknown stance value — defensive
    }

    // ── THE MIXED GATE — one rule, every lane ─────────────────────────────────
    // Mixed is a finding, not a shrug. It is only honest when the record itself
    // points two ways on the same issue and neither direction dominates. Anything
    // else has a truthful name already: a clear break is a contradiction, and a thin
    // or directionless record is "not enough record yet".
    //
    // Given the weighted score each side of an issue carries, this returns the ONE
    // net verdict every surface must use. consistency.js routes its curated
    // formal-action and say-vs-do lanes through the same function (window
    // ._pdxMixedGate) so a homepage tally and a profile issue row cannot reach
    // different conclusions from the same evidence.
    //
    // Dominance is 2/3 of the combined weight. Below that the split is real and the
    // row says so; at or above it the leading side is the record and Mixed would be
    // hedging. A lone tested action therefore always resolves — 100% of the weight
    // sits on one side — which is why a signature law that breaks the claim reads
    // "Says one thing, does another" rather than sliding into the middle.
    var _MIXED_DOMINANCE = 2 / 3;

    // …and weight alone was not enough. A single item can carry weight in BOTH
    // directions — one omnibus law that advances an issue in section 2 and undercuts
    // it in section 7, or one curated receipt scored both ways — and the dominance
    // test read that as a genuine split, so a row with exactly one piece of evidence
    // on it could still print "Mixed record". That is the soft middle wearing the
    // gate's clothes: an argument about ONE document is not a record pulling two
    // ways, it is one document that needs reading, and calling it Mixed launders a
    // thin file into a finding.
    //
    // So Mixed now needs a headcount as well as a balance: at least this many
    // separately judged directional items. Below it the leading side takes the row
    // outright, and a genuine tie with nothing to break it falls through to
    // no_position, which every lane reads out as "Not enough record yet".
    var _MIXED_MIN_ITEMS = 2;

    // `judgedItems` is the number of separately judged directional items behind the
    // two scores — votes, formal actions, receipts, or issue rows, depending on the
    // lane, but always countable things and never a weight. Omitting it is not a way
    // to skip the floor: an unknown headcount is treated as one item, so a caller
    // that has not been taught to count cannot mint Mixed by silence.
    function _pdxMixedGate(consistentScore, contradictScore, judgedItems) {
      var cons = (typeof consistentScore === 'number' && consistentScore > 0) ? consistentScore : 0;
      var contra = (typeof contradictScore === 'number' && contradictScore > 0) ? contradictScore : 0;
      var total = cons + contra;
      if (total <= 0) return 'no_position';            // nothing directional to weigh
      // Both directions must be materially present before "split" is even on the
      // table. One-sided weight resolves here rather than falling through the
      // dominance arithmetic, so the rule reads the way it is written.
      if (contra <= 0) return 'consistent';
      if (cons <= 0) return 'contradicts';
      var n = (typeof judgedItems === 'number' && isFinite(judgedItems)) ? Math.floor(judgedItems) : 1;
      if (n < _MIXED_MIN_ITEMS) {
        if (contra > cons) return 'contradicts';
        if (cons > contra) return 'consistent';
        return 'no_position';                          // one item, dead even — thin, not Mixed
      }
      if (contra >= total * _MIXED_DOMINANCE) return 'contradicts';
      if (cons >= total * _MIXED_DOMINANCE) return 'consistent';
      return 'mixed';                                  // materially split, no dominant side
    }
    window._pdxMixedGate = _pdxMixedGate;
    window._PDX_MIXED_DOMINANCE = _MIXED_DOMINANCE;
    window._PDX_MIXED_MIN_ITEMS = _MIXED_MIN_ITEMS;

    // Aggregate every record that pertains to ONE issue against the member's stance
    // on that issue. Weighted so high-weight, substantive contradictions outrank
    // peripheral or procedural ones. Returns counts + a single net verdict + a
    // human label, plus the highest-weight consistent / contradicting record so the
    // UI can cite a concrete receipt. Pure — never mutates `records`.
    function _issueRecordSummary(issueKey, stance, records) {
      records = Array.isArray(records) ? records : [];
      var counts = { consistent: 0, contradicts: 0, mixed: 0, noPosition: 0 };
      var consistentScore = 0, contradictScore = 0, total = 0;
      var topContradiction = null, topConsistent = null, topContraW = -1, topConsW = -1;

      records.forEach(function (item) {
        var mapping = _findIssueMapping(item, issueKey);
        if (!mapping) return; // record doesn't touch this issue
        total++;
        var eff = _voteEffectiveSupport(item, mapping.supportMeaning);
        var verdict = _stanceVoteVerdict(stance, eff);
        var w = (typeof mapping.weight === 'number') ? mapping.weight : 100;
        if (item && item.isProcedural) w *= _RECORD_PROCEDURAL_FACTOR;
        if (verdict === 'consistent') {
          counts.consistent++; consistentScore += w;
          if (w > topConsW) { topConsW = w; topConsistent = item; }
        } else if (verdict === 'contradicts') {
          counts.contradicts++; contradictScore += w;
          if (w > topContraW) { topContraW = w; topContradiction = item; }
        } else if (verdict === 'mixed') {
          counts.mixed++;
        } else if (verdict === 'no_position') {
          counts.noPosition++;
        }
        // 'no_stance' can't occur per-record here (stance is constant); handled below.
      });

      // The ladder below never invents a middle. A stance with no direction is not a
      // Mixed record, it is an issue with nothing testable stated; a record that
      // produced no directional weight is not a Mixed record either. Both resolve to
      // no_position, which the ⚖️ ladder reads out as "Not enough record yet".
      // Everything that DID produce direction goes through the shared Mixed gate.
      var netVerdict;
      if (!stance) netVerdict = 'no_stance';
      else if (total === 0) netVerdict = 'no_record';
      else if (stance === 'mixed') netVerdict = 'no_position';
      else netVerdict = _pdxMixedGate(consistentScore, contradictScore,
        counts.consistent + counts.contradicts);

      return {
        issueKey: issueKey,
        stance: stance || null,
        hasStance: !!stance,
        total: total,
        consistent: counts.consistent,
        contradicts: counts.contradicts,
        mixed: counts.mixed,
        noPosition: counts.noPosition,
        consistentScore: consistentScore,
        contradictScore: contradictScore,
        netVerdict: netVerdict,
        hasContradiction: counts.contradicts > 0,
        label: _RECORD_SUMMARY_LABEL[netVerdict] || '',
        topContradiction: topContradiction,
        topConsistent: topConsistent
      };
    }

    // Build a per-issue summary map for a whole politician — the record-side
    // counterpart to _polPositionMap. Pass the API's record items and the member's
    // position map (from _polPositionMap(id, p)); returns { issueKey → summary } over
    // the UNION of issues they have a record on and issues they have a stance on, so
    // "voted but never said" and "said but never voted" are both visible.
    //   Typical call: _polRecordMap(records, _polPositionMap(id, p))
    function _polRecordMap(records, positionMap) {
      records = Array.isArray(records) ? records : [];
      positionMap = positionMap || {};
      // Group records by each issueKey they map to (a multi-issue record lands under
      // every one of its issues).
      var byIssue = {};
      records.forEach(function (item) {
        if (!item || !item.issues) return;
        item.issues.forEach(function (m) {
          if (!m || !m.issueKey) return;
          (byIssue[m.issueKey] = byIssue[m.issueKey] || []).push(item);
        });
      });
      var keys = {};
      Object.keys(byIssue).forEach(function (k) { keys[k] = true; });
      Object.keys(positionMap).forEach(function (k) { keys[k] = true; });
      var out = {};
      Object.keys(keys).forEach(function (k) {
        var stance = positionMap[k] ? positionMap[k].stance : null;
        out[k] = _issueRecordSummary(k, stance, byIssue[k] || []);
      });
      return out;
    }

    window._voteEffectiveSupport = _voteEffectiveSupport;
    window._stanceVoteVerdict = _stanceVoteVerdict;
    window._issueRecordSummary = _issueRecordSummary;
    window._polRecordMap = _polRecordMap;

    // ── RECORD DIRECTION INDEX ────────────────────────────────────────────────
    // WHAT THE RECORD DID, WITH NOBODY'S STANCE IN IT.
    //
    // _issueRecordSummary above answers "does the record agree with what they
    // said?", and on ~7,800 live (member, issue) pairs it cannot answer at all,
    // because there is no stated position on that key. It short-circuits to
    // `no_stance` at the top of its ladder and returns zero directional counts —
    // so the row goes on to print an inventory ("18 votes on file") and stops.
    // But the direction of each of those eighteen votes was never in doubt:
    // _voteEffectiveSupport computes it with no stance argument at all. The
    // number was being computed and thrown away.
    //
    // This function keeps it. Same inputs, same weighting, same procedural
    // factor, same inversion rules — it simply counts which way the record ran
    // instead of comparing it to something. It is a DESCRIPTION OF VOTES, and
    // the walls that keep it one are structural rather than editorial:
    //
    //   · NO PERCENTAGE. It returns counts and a sentence. There is no ratio in
    //     the return value for a surface to print, so "72% oppose" cannot be
    //     rendered from it without a caller doing arithmetic this file refuses
    //     to do. Direction Match is the product's one formal percentage.
    //   · SEPARATE TOKENS. Every token here is prefixed `record_` and none of
    //     them appears in consistency.js's VERDICTS or in _RECORD_SUMMARY_LABEL.
    //     The precedent is exec-record.js's EXEC_VERDICTS, which shares no token
    //     with the roll-call scorer for exactly this reason: two vocabularies
    //     that can be passed to each other's functions are one vocabulary.
    //   · NO STANCE, EITHER DIRECTION. It takes no stance argument, so it cannot
    //     read one; and nothing it returns may be written back as one. "13 of 18
    //     cut against it" is a fact about ballots. "They oppose it" is a position
    //     nobody has stated, and this file never produces that sentence.
    //   · IT DOES NOT FEED DIRECTION MATCH. It is not called by
    //     _issueRecordSummary, _polRecordMap, or anything either of them calls.
    //     The dependency runs one way only.

    // ── 🏛 THE NON-VOTE FORMAL ACTS, AND WHAT EACH ONE IS WORTH ────────────────
    // WHY THIS EXISTS. A floor roll call is the strongest thing a legislator does
    // on the record, and for a long time it was the only thing this index treated
    // as an act at all. That is honest about the votes and silent about everything
    // else: a member who leads a bill, moves it through committee and signs an
    // amicus brief has done three formal, dated, sourced things on an issue, and a
    // profile reading "No formal record on this issue yet" over them is making a
    // claim about THEM out of a gap in what WE chose to count. The 44 members whose
    // mapped file is a handful of roll calls are exactly the population this hurts.
    //
    // So the acts are counted. What they are NOT is equal, and this table is the
    // refusal to pretend otherwise. A co-sponsorship is a signature on someone
    // else's bill: it costs little, it is often a courtesy, and it is the single
    // easiest formal act to accumulate — a member can carry two hundred. A floor
    // vote is a recorded, whipped, publicly attributed decision on a question that
    // was actually put. Between them sit a committee vote (a recorded decision, in
    // a smaller room) and the two acts of MOVING something — leading a bill,
    // joining a filing — which are real effort and no decision at all.
    //
    //   floor roll call        1.00   the reference act
    //   committee vote         0.60   a recorded decision, smaller room
    //   lead sponsor           0.45   they moved it
    //   party to a case        0.45   they brought it            (see the note below)
    //   amicus brief           0.35   they signed on to a filing
    //   co-sponsor             0.30   they signed on to a bill
    //
    // WHAT THE NUMBER IS, AND THE ONE THING IT MAY NEVER DO. It is a DEPTH weight.
    // It is summed to answer "how much record is this", which is the question every
    // floor in this file already asks, and it is never summed to answer "which way
    // did it point". Direction and dominance still read the ACT COUNTS a reader can
    // count for themselves on the ledger below the chip — the ledger-first rule,
    // unchanged, and pinned structurally by test-ledger-first.mjs. Weighing which
    // SIDE wins is the thing this product does not do. Weighing how much has been
    // ESTABLISHED is the thing it must do, or three signatures read as a pattern.
    //
    // TWO REFUSALS, BOTH FAIL-CLOSED:
    //   · `statement` — an on-record statement is WORD. It belongs to the lane
    //     Direction Match tests things AGAINST, and letting it accrue formal-record
    //     strength would let a person build a record out of talking. It stays on
    //     the timeline as an item and in the inventory count; it earns no strength,
    //     is never judged here, and cannot move a tier.
    //   · anything this table does not name — an unrecognised action type gets no
    //     default weight. An act we cannot classify is an act we do not understand,
    //     and the honest handling of one is to leave it out of the arithmetic
    //     rather than to guess what it was worth.
    //
    // WHY `plaintiff` IS IN THE TABLE. The four acts the brief named are the four a
    // LEGISLATOR performs. `plaintiff` is the state attorney-general lane — 59
    // seeded acts, and for several of those officers it is the whole of their formal
    // record. Zeroing it would not have been failing closed, it would have been
    // deleting a lane, so it is classed where it belongs: bringing a case is moving
    // something, which is the lead-sponsor tier. It keeps the label the API already
    // ships ("Party to the case"), which does not claim sole authorship.
    var _ACT_CLASSES = {
      floor:          { key: 'floor',          w: 1.00, floor: true,
                        label: '',                    one: 'floor vote',      many: 'floor votes' },
      committee_vote: { key: 'committee_vote', w: 0.60, floor: false,
                        label: 'Committee vote',      one: 'committee vote',  many: 'committee votes' },
      sponsor:        { key: 'sponsor',        w: 0.45, floor: false,
                        label: 'Lead sponsor',        one: 'lead sponsorship', many: 'lead sponsorships' },
      plaintiff:      { key: 'plaintiff',      w: 0.45, floor: false,
                        label: 'Party to the case',   one: 'case',            many: 'cases' },
      amicus:         { key: 'amicus',         w: 0.35, floor: false,
                        label: 'Joined amicus brief', one: 'amicus brief',    many: 'amicus briefs' },
      cosponsor:      { key: 'cosponsor',      w: 0.30, floor: false,
                        label: 'Co-sponsored',        one: 'co-sponsorship',  many: 'co-sponsorships' }
    };
    // Named refusals, so a row can say WHICH refusal it is rather than reporting
    // every unclassifiable act as the same shrug. Both resolve to "no class", and
    // no caller may read either as a weak class.
    var _ACT_REFUSED = { statement: 'word_not_action' };
    // The order the mix is spoken in — strongest act first, so "1 committee vote
    // and 3 co-sponsorships" never comes out backwards.
    var _ACT_ORDER = ['floor', 'committee_vote', 'sponsor', 'plaintiff', 'amicus', 'cosponsor'];

    // ONE ITEM → ONE ACT CLASS, or null for "not admitted to the pattern".
    // A floor vote is anything the API did NOT mark as a position — the same test
    // _voteEffectiveSupport applies, so an item can never be a vote to one function
    // and an action to the other.
    function _rdActClass(item) {
      if (!item) return null;
      if (item.kind !== 'position') return _ACT_CLASSES.floor;
      var t = String(item.actionType || item.action || item.position || '')
        .trim().toLowerCase().replace(/[\s-]+/g, '_');
      if (!t || t === 'floor') return null;              // unnamed, or a vote wearing the wrong kind
      if (_ACT_REFUSED[t]) return null;
      return _ACT_CLASSES[t] || null;
    }
    // Why an item earned no class. Copy and telemetry only — nothing gates on it.
    function _rdActRefusal(item) {
      if (!item || item.kind !== 'position') return null;
      var t = String(item.actionType || item.action || item.position || '')
        .trim().toLowerCase().replace(/[\s-]+/g, '_');
      if (_ACT_REFUSED[t]) return _ACT_REFUSED[t];
      return _ACT_CLASSES[t] ? null : 'unmapped_act';
    }
    // The reader-facing name for what was done. '' for a floor vote, whose own
    // ballot word ("Voted Yea") is already the right and stronger sentence.
    //   THIS IS THE ONE PLACE THOSE FOUR WORDS LIVE. consistency.js's row phrasing
    // and voting-record.js's pill both read it, so a co-sponsorship cannot be
    // "Cosponsor" on one surface and "Co-sponsored" on another, and neither of them
    // can ever reach for "Voted for" on an act that was not a vote.
    function _rdActLabel(item) {
      var c = _rdActClass(item);
      return (c && c.label) ? c.label : '';
    }

    // ── DOUBLE COUNTING: ONE INSTRUMENT, ONE ENTRY IN THE DEPTH ───────────────
    // A member who co-sponsors a bill and then votes for it on the floor has done
    // two things, and the ledger shows both — that is what a ledger is for. But
    // they have taken ONE position on ONE instrument, and admitting both would let
    // a single bill carry 1.30 acts of depth and two entries in a dominance ratio
    // that is supposed to be counting independent acts. That is the same bill,
    // counted twice, with a discount on the second.
    //
    // So the pattern admits one act per measure, chosen in the order the record
    // itself ranks them:
    //   · a FLOOR VOTE on the instrument wins outright — every non-floor act on
    //     that measure is superseded and admitted nowhere: not to the depth, not
    //     to the act counts, not to the direction,
    //   · with no floor vote, the STRONGEST single non-floor act stands and the
    //     rest are superseded (lead sponsor + committee vote on one bill is 0.60,
    //     not 1.05).
    // A superseded act is still ON FILE — it stays in `total`, it stays on the
    // ledger, and `superseded` counts it so a surface can say so.
    //
    // WHAT IS DELIBERATELY NOT DEDUPED: two FLOOR VOTES on the same measure.
    // Passage and a motion to recommit are two separate recorded decisions on two
    // separate questions; they have always each counted, the procedural down-weight
    // is what handles their difference, and collapsing them here would change how
    // vote-only records read — which this pass does not do.
    function _rdMeasureKey(item) {
      if (!item) return '';
      if (item.measureId != null && item.measureId !== '') return 'm:' + item.measureId;
      var n = String(item.number || item.title || '').trim().toLowerCase();
      return n ? 'n:' + n : '';
    }

    // ── THE DEPTH FLOORS, ASKED TWICE ─────────────────────────────────────────
    // _RD_MIN_JUDGED has always meant "four judged acts before this record may be
    // characterised". With non-vote acts admitted, four acts is no longer one
    // quantity: four floor votes and four co-sponsorships are both "four", and only
    // one of them is four votes' worth of record. So the act count keeps its floor
    // exactly as it was AND the summed act strength must clear the same number.
    // Four floor votes are 4.00 and pass, as they always did — nothing about a
    // vote-only record moves by a byte. Four co-sponsorships are 1.20 and do not;
    // that row takes the thin door below and states what it holds instead of
    // claiming a pattern. This is requirement 5, and it is one line of arithmetic
    // rather than a new tier ladder.
    var _RD_MIN_STRENGTH = 4;
    // The thin door is the DENSIFICATION door, and it is deliberately lower — it
    // makes the smaller claim ("all 3 advanced it", worded as a beginning, never as
    // a tendency), and it is the whole reason a sparse profile gains anything here.
    // 0.60 is one committee vote, or two co-sponsorships: the point at which there
    // is something on file rather than a single signature.
    var _RD_THIN_MIN_STRENGTH = 0.6;
    // …and the single act that may lean. One recorded committee decision is a
    // beginning worth wording; one signature on someone else's bill is not, and the
    // one-act lean is the loudest thing this engine says about the least evidence.
    var _RD_LEAN_MIN_STRENGTH = 0.6;
    // HOW MUCH OF THE STRENGTH MUST BE FLOOR VOTES before the loudest tier is
    // available. "Strongly opposes" is the strongest sentence this product prints
    // about a formal record, and it should rest on recorded decisions rather than
    // on a stack of signatures that all point one way because signing is how you
    // point. Half is the bar: at or above it the tier is exactly what it was, below
    // it the row is capped at "Mostly" — which is not a demotion of their record,
    // it is the accurate depth of ours.
    var _RD_FLOOR_LED = 0.5;

    // "3 co-sponsorships and 1 committee vote" — the mix, spoken strongest-first,
    // from counts and nothing else. No share, no percentage, no ordinal.
    function _rdMixPhrase(mix) {
      var parts = [];
      _ACT_ORDER.forEach(function (k) {
        var n = (mix && mix[k]) || 0;
        if (!n) return;
        var c = _ACT_CLASSES[k];
        parts.push(n + ' ' + _rdPlural(n, c.one, c.many));
      });
      if (!parts.length) return '';
      if (parts.length === 1) return parts[0];
      return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
    }
    // THE LIGHT DISCLOSURE (requirement 7), and the reason it is light. Where the
    // signal is floor-led there is nothing to disclose — the reader is looking at
    // votes and the chip says votes. Where it is not, the row names the mix in one
    // clause so the strength of the chip is checkable against the acts under it.
    // It is a sentence, never a badge, never a filter, and never a second tier.
    //   THE NOTE TRACKS THE COUNTABLE, NOT JUST THE SHORTFALL. It used to fire only
    // where the row was not floor-led, which left the other mixed shape mute: a row
    // of four recorded votes and two co-sponsorships counts "6 formal acts" — the
    // only word true of all six — and a reader who came for votes was shown a term
    // they did not ask for with nothing explaining it. So any row holding a
    // non-floor act says what the mix was, and the register does the grading:
    // "Mostly floor votes" is reassurance, the other two are disclosure. A row of
    // nothing but floor votes still says nothing, because its chip already counts
    // votes and a note repeating that is noise — and noise is how a real
    // disclosure gets learned as ignorable.
    // ── AND THE SENTENCE FOR AN ISSUE THE MEMBER NEVER VOTED ON DIRECTLY ─────
    // Composed from the index alone, because the surface that needs it most — the
    // stance row's Record chip — holds an index and not a pid. `primary` is the
    // judged, admitted, non-superseded subset that carried a PRIMARY mapping for
    // this issue; where it is zero, every act the read is standing on reached the
    // issue as a secondary subject of a measure that was mainly about something
    // else. That is a fact about the vehicles, not a finding about the member, and
    // it is the weaker, always-provable half of what _recordVehicleStats says with
    // bill numbers attached — so this sentence never replaces the 🚂 line, it
    // guarantees one is present when the richer detector is out of reach.
    //   AND IT CLAIMS ONLY WHAT THE FLAG PROVES. `primary === 0` says the mapping
    // was secondary; it does not say the vehicle was an omnibus, a CR or anything
    // else large. _recordVehicleStats is the thing that can tell a rider in a
    // 3,000-page package from a passing mention in a standalone bill, and where it
    // can, its line says "as provisions inside larger measures" with the numbers.
    // So this sentence stops at the part that is true either way — the measure was
    // mainly about something else — and leaves the word "package" to the detector
    // that has earned it.
    //   ITS LAST CLAUSE USED TO BE A CEILING, IN WORDS, AND IS NOT ONE NOW. It read
    // "so the side is stated thin and nothing here is characterised", which was the
    // discount the code applied written out as prose. Both are gone. One instrument
    // gets one official Yea or Nay, and every issue that instrument maps to gets
    // that vote at full strength: a member who voted for the package voted for what
    // was in it, and there is no honest arithmetic in which their vote counts less
    // on the issue that travelled than on the issue on the cover. So the sentence
    // now does the one job that survives — it names HOW the acts reached the issue,
    // beside whatever the acts came to, never instead of it and never as a
    // multiplier on it. A reader is told the vehicle and the finding, and the
    // vehicle does not shrink the finding.
    function _rdPackageNote(out, noun) {
      var j = (out && out.judged) || 0;
      if (!j) return '';
      var n = noun || { one: 'vote', many: 'votes' };
      var who = (j === 1)
        ? ('The one ' + n.one + ' read here reached this issue inside a measure')
        : ((j === 2 ? 'Both' : 'All ' + j) + ' ' + n.many +
           ' read here reached this issue inside measures');
      return who + ' that ' + (j === 1 ? 'was' : 'were') +
        ' mainly about something else, rather than as ' +
        (j === 1 ? 'a ' + n.one : n.many) + ' on this issue itself — a measure is ' +
        'not a position on everything inside it, so the vehicle is named here ' +
        'beside the finding, and the ' +
        (j === 1 ? n.one + ' is' : n.many + ' are') + ' counted in full.';
    }
    function _rdMixNote(out) {
      if (!out || !out.nonFloorActs) return '';
      var phrase = _rdMixPhrase(out.mix);
      if (!phrase) return '';
      if (out.floorLed) return 'Mostly floor votes here — ' + phrase + '.';
      return out.floorActs
        ? 'Mostly non-vote acts here — ' + phrase + '.'
        : 'No floor vote on file here — ' + phrase + '.';
    }
    // THE THRESHOLDS, AND WHY THEY ARE NOT THE MIXED GATE'S.
    // _MIXED_DOMINANCE (2/3) and _MIXED_MIN_ITEMS (2) are right for their own
    // job: gating a verdict that already has an independently sourced stance
    // behind it, where the record is the second piece of evidence. Here the
    // record is the ONLY evidence, so the same numbers buy far less. Measured
    // across the live corpus, at 2 items and 2/3 dominance, 46% of every "clear"
    // direction in this index would rest on exactly two votes — a confident-
    // sounding characterisation drawn from a coin flipped twice. Four items at
    // 3/4 cuts the population by 64% and is the trade this index is worth
    // making: the thin rows still print their counts, they just don't get
    // characterised.
    var _RD_MIN_JUDGED = 4;      // …before the record may be characterised at all
    var _RD_DOMINANCE = 0.75;    // …of the weight, before one side is "the record"
    var _RD_THIN_MIN = 2;        // …items before even a uniform run is worth stating

    // A MAPPING THAT IS ABOUT THIS ISSUE, not one that merely touched it. An
    // omnibus maps to every issue it brushes, and at the loose thresholds above
    // 38% of clear directions came entirely from non-primary mappings — an
    // appropriations package asserting a climate direction. At least one judged
    // item must carry `isPrimary` before the record here is characterised.
    var _RD_MIN_PRIMARY = 1;

    // THE PUBLISH BAR FOR A RECORD THAT RAN BOTH WAYS. A split is not a
    // direction and never becomes one — but "they ran both ways" over twenty
    // judged votes hides the very thing a reader came for, and five words are a
    // worse answer than two numbers. So a split states its COUNTS once it is
    // deep enough that both sides are a fact about the record rather than about
    // our sample.
    //   DEPTH is set above the characterisation floor on purpose. Four judged
    // items split 3–1 is a coin landing twice; printing "3 advanced it, 1 cut
    // against it" invites the reader to weigh a margin that is not there. Six is
    // where the smaller side can clear the two-item bar below and still leave a
    // real majority, and it is the depth at which the audit's split population
    // stops being dominated by four- and five-item rows.
    //   BOTH SIDES MATERIAL. One stray item against a run of nine is not a
    // record that ran both ways; it is a one-way record with an exception, and
    // the honest handling of an exception is not to headline it as a side. Two
    // items is the smallest number that is a side rather than an incident — the
    // same reasoning as _RD_THIN_MIN, applied to the minority side.
    // Everything else the split has to clear is already a wall above: the
    // coverage floor, the no-pole and *_balance suppressions, and the
    // primary-mapping rule (asked of splits here for the first time — a split
    // assembled entirely out of incidental omnibus mappings is the same omnibus
    // problem wearing two faces instead of one).
    var _RD_SPLIT_MIN_JUDGED = 6;  // …before a split may state its counts
    var _RD_SPLIT_MIN_SIDE = 2;    // …on the smaller side, before it is a side

    // HOW MUCH OF THE MEMBER'S OWN RECORD WE HOLD, before any of it is read as a
    // pattern. This is the wall against OUR sampling being reported as THEIR
    // conduct. 44 of the 221 attributed members hold one or two mapped roll calls
    // — the residue of a narrow ingest wave — and on an omnibus those two votes
    // reach a dozen issues at once. Characterising that produces a full-looking
    // profile assembled entirely out of which wave we happened to run. The live
    // distribution has a clean break: 44 members at 1–2 records, nothing at 3–5,
    // 22 at 6–11, then the bulk. Twelve sits above the break, and is the point at
    // which a four-vote issue is a subset of a record rather than the whole file.
    var _RD_MEMBER_FLOOR = 12;

    // KEYS WITH NO SUPPORT POLE. "Advances it" is only meaningful where the
    // issue's own curated label states a direction — and for these keys it
    // deliberately does not. The `*_balance` family exists precisely to hold the
    // issues where "for or against" is not a coherent question ("⚖️ Rights +
    // Common-Sense Safety"), and the keys listed below name a subject or a
    // contested authority rather than a proposition ("🪖 Who Commands the
    // National Guard"). On those, the mapping's support_meaning still resolves an
    // arithmetic direction — but printing it would assert a pole nobody curated,
    // which is inventing a stance by another route. They keep the inventory copy.
    //
    // Everywhere else the gloss the sentence needs is ALREADY on the row: the
    // ISSUE_MAP label is a curated directional proposition ("✂️ Cut Federal Red
    // Tape", "🛢 Expand Domestic Energy Production"), so "5 advanced it" resolves
    // against the heading the reader just read. That is why there is no second
    // gloss table here — a duplicate would be a second place for the polarity of
    // an issue to be stated, and therefore a place for it to disagree.
    var _RD_NO_POLE = {
      guard_authority: 1,      // 🪖 Who Commands the National Guard
      states_federal_power: 1, // 🗺 Whose Rule Governs: State or Federal
      war_powers: 1,           // ⚔️ Congress and War Powers
      tariffs_authority: 1,    // ⚖️ Tariffs & Trade Authority
      civil_service_control: 1,// 🗂 Control of the Civil Service
      state_standing: 1,       // 🗽 States Suing Washington
      homeless: 1,             // 🏕 Homelessness Policy
      medical_freedom: 1,      // 🩺 Medical Freedom
      crypto_cbdc: 1,          // 🪙 Cryptocurrency Rules & Digital Dollar
      datacenter_water: 1,     // 💧 Data Centers & Water
      datacenter_power: 1,     // ⚡ Data Centers, Power & Ratepayers
      tariffs_prices: 1,       // 💵 Tariffs & Household Prices
      tariffs_growth: 1        // 🏭 Tariffs & American Industry
    };

    // Why this issue may not be characterised, or null when it may.
    function _rdSuppressedKey(issueKey) {
      var k = String(issueKey || '');
      if (!k) return 'no_issue';
      if (/_balance$/.test(k)) return 'balance_key';
      if (_RD_NO_POLE[k]) return 'no_pole';
      return null;
    }

    // The five states, plus the two ways there is nothing to state. No token here
    // appears in VERDICTS, _RECORD_SUMMARY_LABEL or EXEC_VERDICTS — see the wall
    // above.
    //   `characterised` marks the two states that make a claim about the record
    // AS A WHOLE — "this is what it did". A split never earns it, however deep,
    // because there is no single thing the record did.
    //   `counted` marks the states whose COUNTS may be printed and may travel on
    // a card. It is the weaker flag on purpose: a deep split has nothing to
    // characterise and two real numbers to state, and those are different
    // permissions. Every characterised state is counted; the reverse is not true,
    // and no surface may read one for the other.
    var _RD_TOKENS = {
      record_direction:    { key: 'record_direction',    label: 'What the record did',   characterised: true,  counted: true },
      record_uniform_thin: { key: 'record_uniform_thin', label: 'Every vote one way',    characterised: true,  counted: true },
      record_split_deep:   { key: 'record_split_deep',   label: 'Ran both ways, counted', characterised: false, counted: true },
      record_split:        { key: 'record_split',        label: 'Ran both ways',         characterised: false, counted: false },
      // "TOO THIN TO CHARACTERISE" WAS A REFUSAL WHERE A READ BELONGED. The old
      // label was printed by the slot on the share card and by the Official Record
      // row, on rows that one click away already carried a Thin / Split / Mostly /
      // Strongly chip: the dossier said "Thin opposes" and the card beside it said
      // "too thin to characterise", which is two answers to one question about one
      // row. What this token actually withholds is DEPTH, not the file — there is a
      // record, it is small, and none of it is a pattern. So the label states the
      // depth it has ("thin read") and denies only the thing it is entitled to deny
      // ("not a deep pattern"), and every surface that prints `label` says the same
      // non-contradictory sentence by construction rather than by agreement.
      //   `characterised` and `counted` are untouched. This is a rename of a
      // refusal, not a promotion of one: nothing that gates on those two flags can
      // see any more than it saw before.
      record_thin:         { key: 'record_thin',         label: 'Thin read, not a deep pattern', characterised: false, counted: false },
      record_none:         { key: 'record_none',         label: 'Nothing directional on file', characterised: false, counted: false }
    };

    // ── WHICH KIND OF NO-SIDE, IN SLUGS ────────────────────────────────────────
    // `noSide` counts the acts on file that took no direction. It could not say
    // WHICH kind of no-side each one was, and that mattered on exactly one surface:
    // a row whose whole mapped file is an abstention printed "no vote here took a
    // side" over a ledger that says, in the clerk's own words, "Did not vote". The
    // reader was handed the refusal and denied the fact behind it.
    //   SLUGS, NEVER WORDS. A recorded Present and a recorded absence are different
    // facts and the phrases for them are already written down once, in
    // consistency.js beside the dossier's own no-side divider (_DOS_NOSGRP). This
    // classifies and hands back a key; the surface that speaks owns the speaking, so
    // there is no second place for "Did not vote" to be spelled differently.
    //   IT IS A DISCLOSURE AND NOTHING ELSE, on the same terms as `noSide` itself:
    // no floor, tier, lead, count or share below reads it, and a row's tier cannot
    // change because one of its abstentions was a Present rather than an absence.
    var _RD_NOSIDE_KIND = {
      present: 'present', abstain: 'present',
      not_voting: 'absent', notvoting: 'absent', absent: 'absent', excused: 'absent'
    };
    function _rdNoSideKind(item) {
      var p = String((item && item.position) || '').toLowerCase().trim().replace(/\s+/g, '_');
      return _RD_NOSIDE_KIND[p] || 'other';
    }

    function _rdPlural(n, one, many) { return n === 1 ? one : many; }

    // Derive the record's own direction on ONE (member, issue) pair. Pure, and
    // computed at read time from the same items _issueRecordSummary aggregates —
    // nothing here is stored, so it cannot drift from the record it describes.
    //   issueKey — the issue being described
    //   records  — API record items, exactly as _issueRecordSummary takes them
    //   opts.memberRecordCount — how many mapped records the member holds IN
    //            TOTAL (from _pdxRecordMappedCounts(pid).votes). Omitted means
    //            unknown, and unknown fails closed: the coverage wall holds.
    //   opts.noun — { one, many } for the office's own countable, default votes
    //   opts.label — the issue's display label, used only in the long sentence
    function _recordDirectionIndex(issueKey, records, opts) {
      opts = opts || {};
      records = Array.isArray(records) ? records : [];
      var noun = opts.noun || { one: 'vote', many: 'votes' };
      var out = {
        issueKey: issueKey || null,
        token: 'record_none', lead: null, characterised: false, counted: false,
        judged: 0, advances: 0, opposes: 0,
        advanceScore: 0, opposeScore: 0, primary: 0, total: 0, procedural: 0,
        // ── THE ACTS THAT TOOK NO SIDE ────────────────────────────────────────
        // A Present, a Did Not Vote, an absence, a vehicle whose `supports` was
        // never recorded: on file, mapped to this issue, and not a direction. They
        // have always been excluded from `judged`, `advances` and `opposes` — the
        // skip is one line down in pass 1, and every floor, tier and lead in this
        // file has therefore always been computed off the sides only. What was
        // missing was the COUNT, and its absence was a real defect on the surfaces:
        // the dossier enumerates every item on file and labels the no-side ones, so
        // a row reading "4 listed" beside a chip reading "3 advanced · 0 against"
        // left the reader to work out for themselves whether the fourth was a
        // fourth Yea we had lost or an abstention we had correctly declined to
        // count. So the number is published, and a surface may say "· 1 no side".
        //   IT IS A DISCLOSURE AND NOTHING ELSE. Nothing below reads it: not
        // `deepEnough`, not `dominant`, not `thinEnough`, not the split floors,
        // not the noun swap. Adding an abstention to a row can never change its
        // tier, its lead, its counts or its inclusion in anything, which is the
        // property requirement 1 asks for and the property this file already had.
        //   COUNTED IN PASS 1, BEFORE THE ONE-ACT-PER-INSTRUMENT DEDUPE, because
        // an act with no side never reaches pass 2 to be deduped — it is not a
        // candidate to speak for its instrument. Two abstentions on one bill are
        // therefore two no-side acts here and two rows in the dossier, which is
        // what is on file and what the list shows.
        noSide: 0,
        // …and the same count broken out by kind, in _rdNoSideKind's slugs. Sums to
        // `noSide` by construction (every increment below sets exactly one key), and
        // is read only by copy — see the wall over _rdNoSideKind.
        noSideKinds: { present: 0, absent: 0, other: 0 },
        // ── THE ACT MIX (see THE NON-VOTE FORMAL ACTS above) ─────────────────
        // `mix` counts the acts that were ADMITTED, by class. `actStrength` is
        // their summed depth weight and `floorStrength` the part of it that is
        // floor votes; `floorLed` is the one derived flag a tier may read, and it
        // gates depth only — never a direction. `superseded` and `unclassified`
        // are the two disclosures for acts on file that the pattern did not admit:
        // a second act on an instrument already counted, and an act type this
        // build does not recognise. Every one of these is a count. None of them is
        // a share, and nothing downstream may turn one into a percentage.
        mix: { floor: 0, committee_vote: 0, sponsor: 0, plaintiff: 0, amicus: 0, cosponsor: 0 },
        actStrength: 0, floorStrength: 0, floorActs: 0, nonFloorActs: 0,
        floorLed: true, superseded: 0, unclassified: 0, mixNote: '',
        // `suppressed` IS A GATE. `reason` IS COPY. They were one field, and one
        // field could not carry both jobs: the branches that refuse a row without
        // setting a gate (one judged item; two or three that ran both ways) had
        // nowhere to say WHY, so every surface downstream printed the same
        // catch-all sentence over four different situations. `reason` is always
        // set on a refusal, is read by nothing that decides anything, and — the
        // point of splitting it — setting it can never turn a readable row into a
        // suppressed one. Callers that gate still gate on `suppressed`; callers
        // that write a sentence read `reason` and fall back to `suppressed`.
        suppressed: null, reason: null, clause: '', summary: '', label: ''
      };

      var suppressed = _rdSuppressedKey(issueKey);

      // ── PASS 1: WHAT IS ON FILE, AND WHICH ACT SPEAKS FOR EACH INSTRUMENT ────
      // The inventory (`total`) is taken here and takes everything that maps to the
      // issue — a refused act, a superseded act and an act with no side are all
      // still ON FILE, and the count that says how much is on file has never meant
      // anything else. What this pass decides is only which acts reach the pattern.
      var admits = [], byMeasure = {};
      records.forEach(function (item) {
        var mapping = _findIssueMapping(item, issueKey);
        if (!mapping) return;
        out.total++;
        // The SAME direction function the say-vs-do engine uses, including its
        // procedural inversion — not a second copy of the recommit/table rule.
        var eff = _voteEffectiveSupport(item, mapping.supportMeaning);
        if (eff === null || typeof eff === 'undefined') {   // present / not voting
          out.noSide++;
          out.noSideKinds[_rdNoSideKind(item)]++;
          return;
        }
        var cls = _rdActClass(item);
        if (!cls) { out.unclassified++; return; }   // statement, or an act we cannot name
        var mk = _rdMeasureKey(item);
        var rec = { item: item, mapping: mapping, eff: eff, cls: cls, mk: mk };
        admits.push(rec);
        if (!mk) return;                            // no instrument identity: cannot dedupe, so does not
        var b = byMeasure[mk] || (byMeasure[mk] = { floor: 0, best: 0 });
        if (cls.floor) b.floor++;
        else if (cls.w > b.best) b.best = cls.w;
      });

      // ── PASS 2: THE ADMITTED ACTS, ONE PER INSTRUMENT ────────────────────────
      // See DOUBLE COUNTING above. A floor vote on a measure supersedes every
      // non-floor act on it; with no floor vote the strongest single non-floor act
      // stands. A superseded act is counted as superseded and enters nothing else —
      // not the depth, not the act counts, not the direction — so the numbers the
      // chip reasons from and the numbers a reader can tally off the ledger are the
      // same numbers.
      var usedNonFloor = {};
      admits.forEach(function (rec) {
        var b = rec.mk ? byMeasure[rec.mk] : null;
        if (b && !rec.cls.floor) {
          if (b.floor > 0) { out.superseded++; return; }        // the vote speaks for this bill
          if (rec.cls.w < b.best) { out.superseded++; return; }  // a stronger act speaks for it
          if (usedNonFloor[rec.mk]) { out.superseded++; return; } // …and only once
          usedNonFloor[rec.mk] = 1;
        }
        var item = rec.item, mapping = rec.mapping, eff = rec.eff, cls = rec.cls;
        // THE CURATOR-WEIGHT SUMS ARE A DISCLOSURE, NOT A DECISION. They are still
        // computed — a surface that wants to say "the curation calls this a narrow
        // link" can, and the exec index publishes the same two fields — but no gate
        // below reads them any more. See LEDGER-FIRST directly beneath this loop.
        var w = (typeof mapping.weight === 'number') ? mapping.weight : 100;
        if (item && item.isProcedural) w *= _RECORD_PROCEDURAL_FACTOR;
        out.judged++;
        // THE ACT'S DEPTH, AND ONLY ITS DEPTH. `actStrength` is summed here and
        // read by the size floors below and by nothing else. It is not added to
        // advanceScore/opposeScore, it is never compared against _RD_DOMINANCE, and
        // no side of this row is decided by it.
        out.mix[cls.key] = (out.mix[cls.key] || 0) + 1;
        out.actStrength += cls.w;
        if (cls.floor) { out.floorActs++; out.floorStrength += cls.w; }
        else out.nonFloorActs++;
        // Disclosure, not a gate: no branch below reads it. It exists so a row
        // that refuses can say "and all of them were procedural", which is a
        // materially different fact about a record than "we hold too few".
        if (item && item.isProcedural) out.procedural++;
        if (mapping.isPrimary) out.primary++;
        if (eff) { out.advances++; out.advanceScore += w; }
        else { out.opposes++; out.opposeScore += w; }
      });
      // Floor-led is a fact about depth, computed once, read by the tier layer to
      // cap its loudest word. A record with no admitted acts is floor-led by
      // vacuity — there is no weaker act holding it up — which keeps every
      // vote-only and empty row reading exactly as it did before this table existed.
      out.floorLed = !out.actStrength ||
        (out.floorStrength >= out.actStrength * _RD_FLOOR_LED);
      out.mixNote = _rdMixNote(out);
      // The countable follows the acts. "3 recorded votes" over three
      // co-sponsorships is the exact sentence this whole pass exists to stop
      // printing, so a row holding ANY non-floor act names formal acts instead.
      //   ANY, NOT ALL. The first cut of this fired only where the row held no
      // floor vote at all, and that was wrong in the most common mixed shape there
      // is: one recorded vote and eight co-sponsorships kept the noun "votes" and
      // printed "9 recorded votes on immigration", of which eight were signatures.
      // The mix note was carrying that correction, and a disclosure repairing a
      // false count is a worse design than a true count. "Formal act" is the term
      // that is true of every admitted item including the floor votes, so a mixed
      // row uses it and the mix note says what the mix was. A row of nothing but
      // floor votes still counts votes — both fields must be present and non-floor
      // acts must actually be there, so an index built by an older caller, which
      // knows nothing of act classes and is votes by construction, is untouched.
      if (out.nonFloorActs > 0) {
        noun = { one: 'formal act', many: 'formal acts' };
      }

      // ── The gates, outermost first ─────────────────────────────────────────
      // Each one returns the row to its inventory copy rather than degrading to a
      // weaker claim, because a weaker claim about a record we should not be
      // characterising is still a claim.
      var stop = function (token, why, reason) {
        out.token = token; out.suppressed = why || null;
        out.reason = reason || why || null;
        out.characterised = false; out.counted = false;
        out.label = _RD_TOKENS[token].label;
        return out;
      };
      if (!out.judged) {
        // Nothing on file at all, or items on file that all resolved to neither
        // side (Present, Not Voting, a vehicle that never got a vote). Two
        // different facts, and the row is entitled to know which.
        return stop('record_none', suppressed,
          suppressed || (out.total ? 'no_side_taken' : 'no_vehicle'));
      }
      if (suppressed) return stop('record_thin', suppressed);
      var held = opts.memberRecordCount;
      if (typeof held !== 'number' || !isFinite(held) || held < _RD_MEMBER_FLOOR) {
        return stop('record_thin', 'coverage_floor');
      }

      // ── LEDGER-FIRST: THE PATTERN IS READ OFF THE LIST, NOT OFF A SCOREBOARD ──
      // What follows used to divide advanceScore by (advanceScore + opposeScore) —
      // curator weight, procedurally discounted. That made the chip a weighted
      // scoreboard sitting on top of a ledger, and the two could disagree out loud:
      // a row printing "5 advanced · 1 against" could be labelled Split because the
      // five were rider-weight mappings and the one was not. A reader cannot check a
      // number they cannot see, and PolitiDex does not publish curator mass.
      //   So the dominance test and the lead are the ACT COUNTS a reader can count
      // for themselves on the ledger below the chip. Every act is one act: a 35-
      // weight title of a reconciliation bill and a 100-weight standalone are each
      // one recorded act on this issue, and the ledger row for each says which it is
      // in words ("narrow link", "part of a larger measure"). Where the mappings all
      // carry the same weight — the ordinary case — this changes nothing at all; it
      // only stops the unequal cases from being resolved by a number nobody prints.
      //   NOT TOUCHED: the two MEANING walls below (a poleless issue, and a record
      // connected to the issue only incidentally). Those are about what the record is
      // about, not about how much of it there is, and counting instead of weighing is
      // not licence to lower either.
      var tw = out.advances + out.opposes; // === out.judged, named for the ratio below
      var uniform = (out.advances === 0 || out.opposes === 0);
      var dominant = tw > 0 &&
        (out.advances >= tw * _RD_DOMINANCE || out.opposes >= tw * _RD_DOMINANCE);

      // ── AND THE SAME FLOOR, ASKED IN STRENGTH ────────────────────────────
      // See THE DEPTH FLOORS above. `deepEnough` is the act count's floor and the
      // strength floor together, and it is a SIZE test — it decides whether this
      // record is enough record to characterise, never which way it went. A
      // vote-only row is unaffected in every case: four floor votes are 4.00.
      var deepEnough = out.judged >= _RD_MIN_JUDGED &&
        out.actStrength >= _RD_MIN_STRENGTH;
      // A run that falls short of the characterisation floor may still be stated as
      // a run — but not out of nothing. Two co-sponsorships (0.60) are the smallest
      // thing worth saying "both advanced it" about; one is a signature.
      var thinEnough = out.judged >= _RD_THIN_MIN &&
        out.actStrength >= _RD_THIN_MIN_STRENGTH;

      if (deepEnough) {
        if (!dominant) {
          // A RECORD THAT RAN BOTH WAYS, and how much of it may be said. There
          // is no direction here and none is manufactured — `lead` stays null
          // through every branch below, so nothing downstream can read a winner
          // off this row. What changes with depth is only whether the two counts
          // are printed or withheld: deep enough and both sides material, the
          // row states them; short of that it says the record ran both ways and
          // stops, exactly as it did before.
          var smallSide = Math.min(out.advances, out.opposes);
          out.token = (out.judged >= _RD_SPLIT_MIN_JUDGED &&
                       smallSide >= _RD_SPLIT_MIN_SIDE)
            ? 'record_split_deep' : 'record_split';
        } else {
          // ── DEEP, ONE-SIDED, AND THE VEHICLES ARE NOT CONSULTED HERE ──────
          // A primary gate used to sit on this branch: deep and dominant but with
          // no PRIMARY mapping returned stop('record_thin', 'no_primary'), so a
          // dozen one-way votes reached by provision printed the same word one
          // vote prints. That is a discount on official votes, and it is gone.
          // One instrument means one official Yea or Nay; every issue mapped to
          // that instrument gets that vote at full strength, and how the act
          // arrived is disclosed beside the reading by _rdPackageNote and the 🚂
          // vehicle line rather than subtracted from it.
          //   WHAT STILL DECIDES THIS BRANCH is what decides it for anybody:
          // _RD_MIN_JUDGED and _RD_MIN_STRENGTH above, dominance here, the
          // member coverage floor before either. A package-borne pile that is
          // short, weak or genuinely two-sided fails those the same way a
          // primary one does, and fails them on its arithmetic.
          out.token = 'record_direction';
          out.lead = (out.advances >= out.opposes) ? 'advances' : 'opposes';
        }
      } else if (thinEnough && uniform) {
        // A run, not a tendency. Two or three votes that all went the same way is
        // a fact worth stating and is stated as a fact — never as a lean, which
        // is a claim about a sample this size cannot carry.
        //   AND THE PRIMARY WALL WAS NEVER ON THIS BRANCH, which used to make it
        // the odd one out: two or three incidental mappings that all went one way
        // read as a thin run here while the deep branch above and the display lane
        // both refused the same shape at _RD_MIN_PRIMARY. That was flagged as an
        // unreconciled question about what an omnibus brush is worth. It is
        // reconciled now, and in this branch's favour — the walls came off the
        // other two, so every lane treats a mapped act as an act on the issue it
        // is mapped to and asks only how many, how heavy and which way.
        out.token = 'record_uniform_thin';
        out.lead = out.advances ? 'advances' : 'opposes';
      } else {
        // ── THE LAST REFUSAL, AND IT NAMES ITSELF NOW ────────────────────────
        // Everything that reaches here is judged, poled, above the coverage floor
        // and still not characterisable. There are exactly three ways to be here
        // and they are three different sentences, not one:
        //   · one judged item — a beginning, and the thin read may still word it,
        //   · two or three that ran both ways — too few for the margin to mean
        //     anything, which is the one that genuinely has no side.
        // `suppressed` stays null on both on purpose: they are refusals to
        // CHARACTERISE, not gates, and the thin read above them is allowed to
        // speak. Only `reason` is set, and only a sentence reads it.
        //   THERE WAS A THIRD WAY, AND IT WAS THE ODD ONE OUT. "The mapping is
        // incidental" came first in this ladder and, alone among the three, set
        // `suppressed` — so a row whose real problem was that it held one item, or
        // that its two items disagreed, was told instead that its bills were about
        // something else, and the thin read that would have stated its side was
        // gated off. Both halves of that are gone: how an act arrived is a label on
        // the bill, not a reason to withhold a reading, and the row now names the
        // thing that is actually true of it.
        var why = (out.judged === 1) ? 'single_item' : 'mixed_thin';
        // …and two further ways to be here, both new with the act weights, because
        // "one item" and "ran both ways" are the wrong sentences for them:
        //   · ONE act, and too light a one to lean on. It is still one item, but
        //     what stops the thin read from wording it is the act, not the count —
        //     a single co-sponsorship, where a single recorded vote would have
        //     been read. The row says which, or a reader is told we hold one thing
        //     when what we hold is one signature.
        //   · Several acts, all pointing the same way, and not enough strength
        //     between them to state even a run. At the shipped weights that takes
        //     more than two of the lightest act, so this is a guard rather than a
        //     live population — but "mixed_thin" is FALSE of a uniform row and
        //     would be printed as a fact about their record.
        // Neither is a tier and neither is a gate; only a sentence reads them.
        if (out.judged === 1 && !_rdLeanAllowed(out)) why = 'single_weak_act';
        else if (uniform && out.judged >= _RD_THIN_MIN && !thinEnough) why = 'weak_acts';
        // …and where every judged act on the row was procedural, that is the more
        // specific true thing to say about why it will not resolve.
        if (out.procedural >= out.judged) why = 'procedural_only';
        return stop('record_thin', null, why);
      }
      out.characterised = !!_RD_TOKENS[out.token].characterised;
      out.counted = !!_RD_TOKENS[out.token].counted;
      out.label = _RD_TOKENS[out.token].label;

      // ── The sentence ───────────────────────────────────────────────────────
      // "it" is the issue whose curated directional label the reader is looking
      // at — which is why keys without such a label were suppressed above rather
      // than glossed here. The long form names the issue for a surface with no
      // heading in earshot (screen-reader summaries, tooltips).
      var many = _rdPlural(out.judged, noun.one, noun.many);
      var subj = opts.label ? String(opts.label) : 'this issue';
      var adv = out.advances, opp = out.opposes;
      if (out.token === 'record_direction') {
        out.clause = (out.lead === 'opposes')
          ? opp + ' cut against it, ' + adv + ' advanced it'
          : adv + ' advanced it, ' + opp + ' cut against it';
        if (uniform) {
          out.clause = 'all ' + out.judged + ' ' +
            (out.lead === 'opposes' ? 'cut against it' : 'advanced it');
        }
        out.summary = out.judged + ' recorded ' + many + ' on ' + subj + ' — ' +
          (uniform
            ? 'all of them ' + (out.lead === 'opposes' ? 'cut against it' : 'advanced it')
            : out.clause) + '.';
      } else if (out.token === 'record_uniform_thin') {
        var word = (out.lead === 'opposes') ? 'cut against it' : 'advanced it';
        out.clause = (out.judged === 2 ? 'both' : 'all ' + out.judged) + ' ' + word;
        out.summary = (out.judged === 2 ? 'Both' : 'All ' + out.judged) + ' recorded ' +
          many + ' on ' + subj + ' ' + word + '.';
      } else if (out.token === 'record_split_deep') {
        // BOTH COUNTS, AND NOTHING ELSE. The larger side is named first because
        // a reader reads a list in order and the alternative — a fixed
        // advances-first order — buries the bigger number half the time. It is
        // an ordering, not a finding: no lead is set, no lean is worded, no
        // share is computed, and the two numbers are printed as the two numbers
        // they are. "20 recorded votes — 13 cut against it, 7 advanced it" is
        // the whole claim, and it is a claim only about arithmetic.
        var advFirst = (out.advances >= out.opposes);
        out.clause = advFirst
          ? adv + ' advanced it, ' + opp + ' cut against it'
          : opp + ' cut against it, ' + adv + ' advanced it';
        out.summary = out.judged + ' recorded ' + many + ' on ' + subj +
          ' ran both ways — ' + out.clause + '.';
      } else if (out.token === 'record_split') {
        out.clause = 'they ran both ways';
        out.summary = 'These ' + out.judged + ' recorded ' + many + ' on ' + subj +
          ' ran both ways.';
      }
      return out;
    }

    window._recordDirectionIndex = _recordDirectionIndex;
    // Published so a surface can ask WHY an issue may not be characterised without
    // holding an index for it — the executive lane has no roll-call index at all,
    // and "this issue has no for-or-against pole" is a fact about the issue, not
    // about whichever record happens to be on it.
    window._pdxRecordSuppressedKey = _rdSuppressedKey;
    window._PDX_RD_TOKENS = _RD_TOKENS;
    window._PDX_RD_MIN_JUDGED = _RD_MIN_JUDGED;
    window._PDX_RD_DOMINANCE = _RD_DOMINANCE;
    window._PDX_RD_MEMBER_FLOOR = _RD_MEMBER_FLOOR;
    window._PDX_RD_SPLIT_MIN_JUDGED = _RD_SPLIT_MIN_JUDGED;
    window._PDX_RD_SPLIT_MIN_SIDE = _RD_SPLIT_MIN_SIDE;
    window._PDX_RD_NO_POLE = _RD_NO_POLE;
    // ── THE ACT LAYER, PUBLISHED ───────────────────────────────────────────────
    // The classifier and the label are published because two other files must ask
    // the same question and must get the same answer: consistency.js words a row's
    // action phrase and voting-record.js prints the pill. Neither may keep its own
    // table — that is how "Cosponsor" and "Co-sponsored" end up on one page — and
    // neither may reach for a ballot verb on an act that was not a ballot.
    //   The weights are published for tests and disclosure ONLY. Nothing outside
    // this file sums them, and nothing anywhere divides by them.
    window._pdxActClass = _rdActClass;
    window._pdxActLabel = _rdActLabel;
    window._pdxActRefusal = _rdActRefusal;
    window._pdxActMixPhrase = _rdMixPhrase;
    window._PDX_ACT_CLASSES = _ACT_CLASSES;
    window._PDX_ACT_REFUSED = _ACT_REFUSED;
    window._PDX_RD_MIN_STRENGTH = _RD_MIN_STRENGTH;
    window._PDX_RD_THIN_MIN_STRENGTH = _RD_THIN_MIN_STRENGTH;
    window._PDX_RD_LEAN_MIN_STRENGTH = _RD_LEAN_MIN_STRENGTH;
    window._PDX_RD_FLOOR_LED = _RD_FLOOR_LED;

    // ── FORMAL-RECORD PATTERN TIERS (presentation only) ────────────────────────
    // ONE READ OF THE INDEX ABOVE, WORDED FOR A ROW FACE. This adds no arithmetic:
    // every number it prints is a count _recordDirectionIndex already computed, and
    // every gate it obeys is a gate that function already applied. What it adds is a
    // five-way vocabulary a reader can see at a glance — how one-sided the record was
    // and how much of it there is — because "Too thin to characterise" is honest and
    // unreadable, and a row that stays silent about a real vote reads like a bug.
    //   THE WALL, RESTATED WHERE IT MATTERS. These labels say supports/opposes, which
    // is stance vocabulary, and they are therefore forbidden from every place a stance
    // lives: they are never written into a position map, never counted in Direction
    // Match or the Word-vs-Action ratio, and never outrank a stated position on a row
    // that has one. A tier is a description of arithmetic that already happened. A
    // stance is a claim a person made.
    //   ONE ARTEFACT CARRIES A TIER OFF-APP, and the terms are strict. The
    // words-vs-formal-record card in receipt-cards.js counts how many of a member's
    // stated positions their record backed, cut against or split on, reading this
    // function for each row — and its optional example line quotes one tier label
    // verbatim ("says supports, record strongly opposes"). It may, because the tier
    // is named as the RECORD's pattern on both halves of that sentence, beside the
    // stated position it is being compared to and under a footer that says "formal
    // record only, not Direction Match". What is still forbidden there is everything
    // forbidden here: no tier is written back, no tier is counted into a score, and a
    // thin tier is excluded from that card's totals outright. A tier travelling
    // WITHOUT the stated position beside it would be a stance we invented, which is
    // why no other card may take one.
    //   WHY THE THIN TIER EXISTS AT ALL. The index refuses to characterise one vote,
    // and that refusal is correct — one vote is not a tendency. But the count is a
    // fact, and a reader looking at an issue where their senator voted once, against,
    // is owed that fact. So the thin tier states the direction of the votes on file
    // and is built to look like the small thing it is: its own word ("Thin"), never
    // Mostly/Strongly, quieter styling, and no promotion path — `characterised` and
    // `counted` on the index are untouched, so nothing that gates on them (cards,
    // decision slots) can see a thin tier at all.
    var _RD_TIER_DIR = {
      advances: { tone: 'support', word: 'supports' },
      opposes:  { tone: 'oppose',  word: 'opposes'  }
    };
    // weight is a rendering rank, not a score: full > strong > thin > flat. It exists
    // so the chip can be styled by confidence without any surface inventing its own
    // idea of which tier is the loud one.
    var _RD_TIERS = {
      strong: { key: 'strong', weight: 'full',   directional: true,  lead: 'Strongly' },
      mostly: { key: 'mostly', weight: 'strong', directional: true,  lead: 'Mostly'   },
      split:  { key: 'split',  weight: 'full',   directional: false, label: 'Split', tone: 'mixed' },
      thin:   { key: 'thin',   weight: 'thin',   directional: true,  lead: 'Thin'     },
      none:   { key: 'none',   weight: 'flat',   directional: false, label: 'No clear pattern yet', tone: 'muted' }
    };
    // One sentence, one place. Every chip carries it; the tests assert it is this one.
    var _RD_TIER_NOTE = 'What the formal record did — a pattern in the votes on file, ' +
      'not a stated position, and never counted in Direction Match.';
    // Issue-level suppressions mean the ISSUE has no directional pole (a balance key,
    // an unmapped key), so there is nothing for a record to lean on. Those rows print
    // no chip at all rather than "No clear pattern yet", which would be a false claim
    // about the member's record instead of a true one about the issue's shape.
    var _RD_TIER_MUTE = { no_issue: 1, balance_key: 1, no_pole: 1 };

    // ── THE READER-FACING RECORD VOCABULARY ────────────────────────────────────
    // FIVE WORDS FOR WHAT A FORMAL RECORD DID, and they are the words a reader
    // gets. The tiers above are the ENGINE's vocabulary: they carry a depth
    // qualifier ("Strongly", "Thin") because the surfaces that print them are
    // arguing about how much record there is. A profile face asking the plainer
    // question — which way does this record point — needs a plainer answer, and it
    // needs the SAME answer everywhere, so it is fixed here and never typed at a
    // call site.
    //
    //   Supports · Mostly supports · Mixed · Mostly opposes · Opposes
    //
    // THE MERGE, STATED ONCE. This is not a second reading of the record; it is a
    // renaming of the read that already happened, one tier to one word:
    //
    //   strong + advances → Supports          strong + opposes → Opposes
    //   mostly + advances → Mostly supports   mostly + opposes → Mostly opposes
    //   split             → Mixed
    //
    // WHY "MIXED" HERE AND "SPLIT" ON THE CHIP. They are the same bucket and they
    // are deliberately worded differently, because the chip sits on a row that can
    // ALSO be showing a Direction Match verdict, and that vocabulary already owns
    // the word "Mixed". Two "Mixed"es on one row meaning two different things is
    // the collision this vocabulary exists to avoid, so the depth-qualified chip
    // keeps "Split" and the plain-language lead — which never appears beside a
    // Direction Match word, because it only renders where there is no score — says
    // "Mixed". Same tier, same arithmetic, one of them is never in the room with
    // the other.
    //
    // AND FOUR STATES THAT ARE NOT IN THE FIVE, on purpose. A record too thin to
    // characterise and a record the engine could read nothing from are not weak
    // versions of "Supports"; they are refusals, and they are worded as refusals.
    // Two of the four name a side anyway — a thin record that all went one way did
    // go one way, and withholding that while printing its count is a refusal only
    // in form. What none of the four do is promote: `characterising` is the flag a
    // surface gates on, and it is false for all four, so a thin side can be read
    // and can never be counted as a characterisation of the record.
    //
    // WHAT THIS IS NOT. Not a stance — the frame words below are the whole reason
    // this layer is safe to print, and they never say "their position is". Not a
    // score: no percentage, nothing ordinal, and Direction Match does not read it.
    // Not a party read: the only subject of every one of these words is one
    // person's own formal record.
    var _RD_SAYS_LEAD = 'The record indicates';
    var _RD_SAYS_ON = 'Record on this issue';
    var _RD_SAYS = {
      supports:        { key: 'supports',        label: 'Supports',        tone: 'support', characterising: true,  rank: 0 },
      mostly_supports: { key: 'mostly_supports', label: 'Mostly supports', tone: 'support', characterising: true,  rank: 1 },
      mixed:           { key: 'mixed',           label: 'Mixed',           tone: 'mixed',   characterising: true,  rank: 2 },
      mostly_opposes:  { key: 'mostly_opposes',  label: 'Mostly opposes',  tone: 'oppose',  characterising: true,  rank: 1 },
      opposes:         { key: 'opposes',         label: 'Opposes',         tone: 'oppose',  characterising: true,  rank: 0 },
      early:           { key: 'early',           label: 'Too early to say', tone: 'muted',  characterising: false, rank: 8 },
      // A THIN RECORD WITH A KNOWN SIDE IS STILL A SIDE. "Too early to say" is the
      // right refusal for a record that ran both ways too shallowly to weigh, and it
      // was the wrong one for a record of one mapped vote that went one way: the row
      // beside it was already printing "1 vote advanced", so the reader was handed
      // the depth and denied the direction — a count with the answer removed. These
      // two say which way the items on file went and, in the same phrase, how little
      // of it there is. They never say Strongly, Mostly or "pattern".
      //   THEY DO NOT PROMOTE. `characterising` stays false, exactly as it is on
      // `early`, so every surface that gates on that flag still sees a refusal, and
      // `_RD_TOKENS.characterised` / `.counted` on the index are untouched.
      early_supports:  { key: 'early_supports',  label: 'Supports, on a thin record', tone: 'support', characterising: false, rank: 8 },
      early_opposes:   { key: 'early_opposes',   label: 'Opposes, on a thin record',  tone: 'oppose',  characterising: false, rank: 8 },
      unread:          { key: 'unread',          label: 'No clear pattern yet', tone: 'muted', characterising: false, rank: 9 }
    };
    // tier key + direction word → one of the nine above. Fails closed on anything
    // it does not recognise, which is the same direction every other read here
    // fails in: an unrecognised state is unread, never a lean.
    function _recordSays(tierKey, dirWord) {
      if (tierKey === 'split') return _RD_SAYS.mixed;
      if (tierKey === 'thin') {
        // The thin tier is directional by construction (_RD_TIERS.thin), so the
        // side is normally known; the wordless fallback is kept because a caller
        // that loses the direction must not be handed one back.
        if (dirWord === 'supports') return _RD_SAYS.early_supports;
        if (dirWord === 'opposes') return _RD_SAYS.early_opposes;
        return _RD_SAYS.early;
      }
      if (tierKey === 'strong' || tierKey === 'mostly') {
        var pre = (tierKey === 'strong') ? '' : 'mostly_';
        if (dirWord === 'supports') return _RD_SAYS[pre + 'supports'] || _RD_SAYS.supports;
        if (dirWord === 'opposes') return _RD_SAYS[pre + 'opposes'] || _RD_SAYS.opposes;
      }
      return _RD_SAYS.unread;
    }
    window._PDX_RD_SAYS = _RD_SAYS;
    window._PDX_RD_SAYS_LEAD = _RD_SAYS_LEAD;
    window._PDX_RD_SAYS_ON = _RD_SAYS_ON;
    window._recordSays = _recordSays;

    // ── THE TWO-SIDED TALLY, IN ONE PLACE ─────────────────────────────────────
    // "7 advanced · 0 against" is the product's one phrase for what the judged acts
    // on an issue did, and it is written here once so that every surface allowed to
    // print it prints the same words in the same order. It is arithmetic off the
    // index and nothing else: no tier, no lead, no direction word, no rate.
    function _rdSidePhrase(idx) {
      if (!idx) return '';
      var a = idx.advances, o = idx.opposes;
      if (typeof a !== 'number' || typeof o !== 'number') return '';
      if (!(a + o)) return '';
      return a + ' advanced · ' + o + ' against';
    }
    window._recordSidePhrase = _rdSidePhrase;

    // …and the LEFTOVER, worded once for the same reason. "1 no side" is the
    // fragment a surface appends to the phrase above when the row holds acts that
    // are on file and took no direction, so the two integers stop having to account
    // for an inventory they were never counting. Deliberately not a side and
    // deliberately not spelled "0 no side": where nothing abstained there is
    // nothing to disclose, and a third zero on every chip in the product would
    // teach a reader to stop reading the first two.
    function _rdNoSidePhrase(idx) {
      if (!idx) return '';
      var n = idx.noSide;
      if (typeof n !== 'number' || n <= 0) return '';
      return n + ' no side';
    }
    window._recordNoSidePhrase = _rdNoSidePhrase;

    // Word the two counts. Printed only where the index permits counts, or where the
    // tier's own label already denies depth (thin) — a shallow split still withholds
    // its margin, exactly as the index does.
    //   THE THIN TIER COUNTS ITSELF DIFFERENTLY, because it is always one-sided (a
    // uniform run, or the single vote) and "0 advanced · 2 against" spends a number
    // on a side that has nothing on it. It names its own countable instead — "1 vote
    // against", "2 votes against" — which is the smaller claim and the shorter chip.
    function _rdTierCounts(idx, noun, tier) {
      noun = noun || { one: 'vote', many: 'votes' };
      // THE COUNTABLE FOLLOWS THE ACTS, on the same rule as the index that fed it
      // (see the long note over the noun swap in _recordDirectionIndex): a row
      // holding ANY non-floor act counts formal acts, because "9 votes advanced"
      // over one vote and eight signatures is the single most misleading sentence
      // this layer could produce. A pure floor row keeps the office's own noun, and
      // an index from an older caller has no nonFloorActs field and so is untouched.
      if (idx && idx.nonFloorActs > 0) {
        noun = { one: 'formal act', many: 'formal acts' };
      }
      if (tier === 'thin') {
        return idx.judged + ' ' + _rdPlural(idx.judged, noun.one, noun.many) + ' ' +
          (idx.advances ? 'advanced' : 'against');
      }
      return _rdSidePhrase(idx);
    }

    // MAY ONE ACT LEAN? The one-item read is the loudest thing this engine says
    // about the least evidence, and it was written when the only item it could ever
    // be was a recorded floor vote. One recorded committee decision is still a
    // beginning worth wording. One signature on someone else's bill is not — it is
    // the cheapest formal act there is, and "Thin supports" over a single
    // co-sponsorship would be the exact over-claim this whole pass exists to
    // prevent. Fails open only where the index carries no act strength at all,
    // which is the vote-only shape this rule was already correct for.
    function _rdLeanAllowed(idx) {
      if (!idx || typeof idx.actStrength !== 'number') return true;
      if (idx.floorActs > 0) return true;
      return idx.actStrength >= _RD_LEAN_MIN_STRENGTH;
    }

    // idx — a _recordDirectionIndex() result. Returns null when no chip should render,
    // otherwise the tier shape. Fails closed everywhere: any state this does not
    // recognise lands on 'none'.
    function _recordPatternTier(idx, opts) {
      opts = opts || {};
      if (!idx || typeof idx !== 'object') return null;
      var noun = opts.noun || { one: 'vote', many: 'votes' };
      if (idx.suppressed && _RD_TIER_MUTE[idx.suppressed]) return null;
      if (!idx.total) return null; // nothing on file for this issue at all

      var t = null, dir = null;
      if (idx.token === 'record_direction') {
        dir = _RD_TIER_DIR[idx.lead] || null;
        // ── THE LOUDEST TIER IS FLOOR-LED, OR IT IS NOT THE LOUDEST TIER ──────
        // "Strongly opposes" is the strongest sentence this product prints about a
        // formal record. A uniform run of co-sponsorships can reach the depth floor
        // — signing is how you point, and a member who signs twenty bills one way
        // has twenty acts all pointing one way — without being twenty decisions. So
        // the strong tier asks one further question, and it is a question about
        // DEPTH, not about side: is at least half of this record's act-strength
        // floor votes? Below that the row is capped at "Mostly", which is not a
        // demotion of their record but the accurate depth of ours. The direction
        // itself is untouched; a capped row leans exactly where it leaned.
        //   `!== false` on purpose. An index that carries no act mix at all is a
        // vote-only index by construction — which is what every index was before
        // this table existed — so the absent case is floor-led and reads exactly
        // as it did.
        var uniformActs = (idx.advances === 0 || idx.opposes === 0);
        t = dir ? ((uniformActs && idx.floorLed !== false) ? _RD_TIERS.strong : _RD_TIERS.mostly) : null;
      } else if (idx.token === 'record_uniform_thin') {
        dir = _RD_TIER_DIR[idx.lead] || null;
        t = dir ? _RD_TIERS.thin : null;
      } else if (idx.token === 'record_split_deep' || idx.token === 'record_split') {
        t = _RD_TIERS.split;
      } else if (idx.token === 'record_thin' && !idx.suppressed &&
                 idx.judged === 1 && _rdLeanAllowed(idx)) {
        // The one-vote lean. Only when the single act is heavy enough to be a
        // beginning rather than a signature (see _rdLeanAllowed).
        //   `idx.primary >= _RD_MIN_PRIMARY` WAS A THIRD TERM HERE AND IS GONE.
        // It said an act that reached this issue inside a larger package was "a
        // coincidence, not a lean", and that was this file deciding a member's
        // one recorded act on an issue did not happen because of the shape of the
        // bill it travelled in. A vote is a vote: it was cast, it is dated, it is
        // sourced, and it went one way. HOW it arrived is a real fact and it has
        // its own sentence — `pkgNote` below, printed beside the finding on every
        // surface — which is where a fact about packaging belongs. It is not a
        // gate on whether the act may be characterised at all.
        //   This is the last of the primary locks. `isPrimary` is now what it was
        // always documented to be: a label on the bill, printable everywhere and
        // consultable by nothing. Do not put it back — see the brief in
        // test-characterise-every-act.mjs.
        dir = _RD_TIER_DIR[idx.advances ? 'advances' : 'opposes'];
        t = _RD_TIERS.thin;
      }
      if (!t) t = _RD_TIERS.none; // coverage_floor, judged 0, anything new

      var showCounts = idx.judged > 0 && t.key !== 'none' &&
        (idx.counted === true || t.key === 'thin');
      // HOW THE ACTS ARRIVED, FOR THE DISCLOSURE AND FOR NOTHING ELSE. Computed
      // after every tier decision above is already made, which is the shape the
      // doctrine requires: `isPrimary` is a label on the bill, so it may be
      // printed and may not be consulted. On a `none` read there is no finding to
      // disclose beside, so the sentence stays empty.
      var pkgOnly = (idx.primary || 0) < _RD_MIN_PRIMARY;
      var pkgNote = (pkgOnly && t.key !== 'none') ? _rdPackageNote(idx, noun) : '';
      return {
        tier: t.key,
        weight: t.weight,
        tone: t.directional ? dir.tone : t.tone,
        label: t.directional ? (t.lead + ' ' + dir.word) : t.label,
        // The plain-language name for this same read. Derived, never chosen: one
        // tier and one direction word in, one of the seven fixed words out.
        says: _recordSays(t.key, dir ? dir.word : ''),
        counts: showCounts ? _rdTierCounts(idx, noun, t.key) : '',
        // ── THE TALLY, CARRIED WHETHER OR NOT THE CHIP MAY PRINT IT ──────────
        // `counts` above is the PUBLICATION decision and it is unchanged: a shallow
        // split still withholds its margin on every chip that reads `counts`, and
        // nothing here moves a floor, a tier, a lead or a direction word.
        //   `sideCounts` is the arithmetic on its own, exposed for the one surface
        // that asks a different question. The 🏛 formal brief lists a handful of
        // named issues with a heading over them that already says the record ran
        // both ways; there, a row reading "Split" and nothing else is not restraint
        // but a missing number, next to sibling rows that print theirs. So the
        // brief prints the tally under the same phrase, and says so where there is
        // none. Every other surface reads `counts` and is untouched.
        //   NEVER A DIRECTION. Two integers a reader can count on the ledger below
        // the chip, in the order the phrase always states them. No lead is derived
        // from them here and none may be derived from them downstream — a split has
        // no side, however the two numbers compare.
        sideCounts: _rdSidePhrase(idx),
        judged: idx.judged, advances: idx.advances, opposes: idx.opposes,
        // THE LEFTOVER, CARRIED BESIDE THE TALLY AND NEVER INSIDE IT. `sideCounts`
        // above is the two integers and stays the two integers on every surface
        // that prints it; this is the count of acts on file that took no side, and
        // the phrase for it, for the one surface that has room to account for the
        // whole inventory. Nothing here is a side and nothing here moved a floor.
        noSide: idx.noSide || 0,
        noSideCount: _rdNoSidePhrase(idx),
        directional: !!t.directional,
        token: idx.token,
        // ── THE LANE DISCLOSURE, PLUS THE ARRIVAL SENTENCE ───────────────────
        // The package sentence lives on this lane too, and it has to: since the
        // primary gates came off the branches above, a deep one-sided run of
        // package-borne acts is CHARACTERISED here rather than being handed down
        // to the display lane, and that is exactly the row a reader most needs
        // told how the acts arrived. Disclosure beside the finding, at every tier
        // the finding can reach.
        //   APPENDED, NEVER SUBSTITUTED. `note` is the pinned sentence that keeps
        // this chip out of the integrity score and several files pin it in exactly
        // its current words, so the second fact goes after it in the same field
        // every surface already renders. See _rdPackageNote, whose last clause
        // says the acts are counted in full — because they are.
        note: pkgNote ? (_RD_TIER_NOTE + ' ' + pkgNote) : _RD_TIER_NOTE,
        // …and the two of them under their own names, for a surface that places
        // the package line itself. A report, not a gate and not a discount:
        // nothing in this function reads `packageOnly` to decide a tier, and
        // nothing downstream may multiply by it.
        packageOnly: pkgOnly,
        packageNote: pkgNote,
        // ── THE ACT MIX, CARRIED BUT NEVER MERGED ────────────────────────────
        // Requirement 7's light disclosure, and it is a SECOND sentence on purpose.
        // `note` is the one fixed line every chip carries and every test pins; the
        // mix is a fact about THIS row and belongs beside that line, not inside it.
        // Presentation only: no surface may sort, filter, bucket or score on any of
        // these, and none of them is a share of anything.
        mix: idx.mix || null,
        mixNote: idx.mixNote || '',
        floorLed: idx.floorLed !== false,
        floorActs: (typeof idx.floorActs === 'number') ? idx.floorActs : null,
        actStrength: (typeof idx.actStrength === 'number') ? idx.actStrength : null
      };
    }

    window._recordPatternTier = _recordPatternTier;
    window._PDX_RD_TIERS = _RD_TIERS;
    window._PDX_RD_TIER_NOTE = _RD_TIER_NOTE;

    // ── THE DISPLAY BAR: ONE FORMAL ITEM IS ALREADY A RECORD ───────────────────
    // _recordPatternTier answers "may we characterise this record?" and its floors
    // are right for that question: a member we hold twelve mapped votes of, four
    // judged items on the issue, a primary mapping, a dominant side. This function
    // answers a DIFFERENT question — "is there a record here at all, and what did
    // it do?" — for the surfaces that must not print a blank where one formal item
    // exists. One vote is the start of a pattern, not a finished one, and hiding it
    // until the twelfth is the wrong end of the fail-closed trade: the reader draws
    // "nothing on record" from an empty slot, which is a stronger and falser claim
    // than "one vote, and here it is".
    //
    // WHAT IT MAY NOT DO, and this is the whole of it:
    //   · IT CHANGES NO SCORE. Nothing here is read by Direction Match, by the
    //     Word-vs-Action ratio, by _issueRecordSummary or by any verdict. Every
    //     floor above (_RD_MEMBER_FLOOR, _RD_MIN_JUDGED, _RD_THIN_MIN,
    //     _RD_DOMINANCE, _RD_SPLIT_*) is untouched and still gates every one of
    //     those reads, and `characterised` / `counted` on the index stay exactly as
    //     the index set them — so a display read cannot promote itself into a card
    //     total or a decision slot.
    //   · IT NEVER OVERRULES THE PATTERN ENGINE. The first thing it does is ask,
    //     and any read that engine was willing to make is returned verbatim.
    //   · IT INVENTS NO VOCABULARY. Strongly / Mostly / Thin / Split and the two
    //     direction words are _RD_TIERS' own, so a display read and a pattern read
    //     cannot be worded differently on one page.
    //   · IT NEVER CLAIMS A DIRECTION IT HAS NOT EARNED. One wall does not move an
    //     inch: an issue with no for-or-against pole gets no direction, because
    //     there is nothing to lean on. Nor does a record with nothing judged in it,
    //     and nor does a record that ran both ways without clearing the same
    //     depth-and-dominance pair any other record must clear to be led.
    //       WHAT IS NOT ON THAT LIST, DELIBERATELY: how the acts arrived. A vote
    //     cast on a measure that carried this issue is a vote on this issue, at full
    //     strength, and `_RD_MIN_PRIMARY` is consulted on this lane for the
    //     disclosure sentence alone. THAT IS NOW TRUE OF EVERY LANE IN THIS FILE:
    //     the last primary term came off _recordPatternTier's one-vote lean, so the
    //     constant no longer appears in any tier condition anywhere — only in the
    //     two `pkgOnly` lines that word the package sentence. See the wall over that
    //     lean, and test-characterise-every-act.mjs, which sets the constant to 99
    //     and asserts that not one tier, label, count or percentage moves.
    //
    // `display: true` marks a read that only exists because of this bar, `early`
    // marks the one-item read that must be worded as a beginning, and `partial`
    // marks the reads where the shortfall is OUR coverage rather than their record
    // — those are held to thin styling however one-sided their arithmetic looks,
    // because a fifth of a member's file is not a tendency.
    function _recordDisplayTier(idx, opts) {
      opts = opts || {};
      var t = _recordPatternTier(idx, opts);
      if (t && t.tier !== 'none') return t; // the engine's own read, untouched
      if (!idx || typeof idx !== 'object') return null;
      if (!idx.total) return null; // nothing formal on this issue at all
      var sup = idx.suppressed || _rdSuppressedKey(idx.issueKey);
      if (sup && _RD_TIER_MUTE[sup]) return null; // no pole: no direction, at any depth
      var judged = idx.judged || 0;
      if (judged < 1) return null;                       // nothing judged: nothing did anything

      var noun = opts.noun || { one: 'vote', many: 'votes' };
      var adv = idx.advances || 0, opp = idx.opposes || 0;
      var uniform = (adv === 0 || opp === 0);
      // ── THE PRIMARY FLAG IS A LABEL ON THE BILL, AND DECIDES NOTHING HERE ─────
      // ONE INSTRUMENT, ONE OFFICIAL YEA OR NAY. Every issue that instrument maps
      // to gets that vote, at full strength. `isPrimary` says whether the measure
      // was ABOUT this issue or carried it — which is worth printing, because that
      // is how policy travels and a reader deserves to see the stowaway — but it is
      // not a weight, not a tier cap, not a gate on reading the row, and not a
      // reason to print Thin. A member who voted for the package voted for what was
      // inside it; there is no arithmetic in which their vote counts less on the
      // issue that rode along than on the issue on the cover.
      //   THIS LANE HAS HELD TWO WRONG SHAPES OF THAT FLAG AND NOW HOLDS NEITHER.
      // It began as `return null` below _RD_MIN_PRIMARY, which printed "not about
      // this issue" over an act that decided the issue — the exact concealment the
      // vehicle work exists to expose. That was relaxed into a CEILING: the side
      // was stated, but `deep` read `!pkgOnly` and a mixed package pile was refused
      // outright, so no stack of riders could reach Mostly or Strongly and a pile
      // that ran both ways printed nothing at all. A ceiling is a discount, and a
      // discount on a recorded vote is the same false claim in a quieter voice.
      // Both are gone. `pkgOnly` is computed on the next line for ONE purpose — the
      // disclosure sentence — and nothing in the tier decision below reads it.
      //   WHAT DECIDES THE TIER, THEREFORE: exactly what decides it for any other
      // formal act. The depth floor (_RD_MIN_JUDGED), the act-strength floor
      // (_RD_MIN_STRENGTH), the dominance floor (_RD_DOMINANCE), the coverage floor
      // that produces `partial`, and the member floor the pattern engine already
      // applied upstream. A uniform package-borne run that clears them reads Mostly
      // or Strongly; one that does not reads Thin, because it is one act — not
      // because it was a rider.
      //   WHAT STILL DOES NOT MOVE, and neither of these is about packaging:
      //   · NO POLE, NO DIRECTION. `_RD_TIER_MUTE` above still returns null.
      //   · NOTHING WITHOUT A JUDGED SIDE GAINS ONE. `judged < 1` still returns
      //     null, and a record that ran both ways still reads Split unless it
      //     clears the same depth-and-dominance pair that lets any other record
      //     be led — so mixed piles stay mixed, and they now SAY "mixed" instead of
      //     printing a blank the reader has to interpret.
      //   · THE ROW SAYS HOW ITS ACTS ARRIVED. `packageNote` below is appended to
      //     the lane disclosure every surface already prints, so the vehicle
      //     sentence travels beside the finding rather than being a separate
      //     feature a surface could forget to mount. Beside it — never instead of
      //     it, and never as a multiplier on it.
      // WHAT DOES NOT CHANGE: this lane is still read by nothing that scores. The
      // characterisation read and the `characterised` set are still
      // _recordPatternTier's, on unchanged depth and dominance floors, and Direction
      // Match still cannot see any of it.
      //   AND _RD_MIN_PRIMARY NO LONGER GOVERNS THEM EITHER. It used to gate the
      // pattern engine's one-vote lean; that term is gone, so beyond its declaration
      // the constant is read on exactly two lines in this file — this one and its
      // twin in _recordPatternTier — and both of them word a sentence.
      var pkgOnly = (idx.primary || 0) < _RD_MIN_PRIMARY;
      var partial = (sup === 'coverage_floor');
      // THE SAME TWO SIZE FLOORS THE PATTERN ENGINE ASKS, AND NO THIRD ONE. This
      // lane exists to stop a browse surface printing a blank over one real act,
      // and lowering the DEPTH bar is exactly what it is for — but "deep" here
      // still means the same thing it means everywhere else, and a stack of
      // co-sponsorships is not it.
      //   `pkgOnly` was a third term here and has been removed. It made a record
      // made entirely of package-borne acts un-deep whatever its size, which is a
      // discount on official votes wearing the clothes of a depth floor. Depth is
      // about how much record there is; packaging is about how the record arrived.
      // The second question has an answer of its own — the sentence — and no
      // business in the first.
      var deep = !partial && judged >= _RD_MIN_JUDGED &&
        (typeof idx.actStrength !== 'number' || idx.actStrength >= _RD_MIN_STRENGTH);
      // Act counts, not curator weight — the same ledger-first rule as the index
      // above. The chip sits directly on top of a list of acts; the number it is
      // reasoning from has to be the number under it. (idx.advanceScore and
      // idx.opposeScore are still carried for disclosure and are still read by
      // nothing that decides anything.)
      var tw = adv + opp;
      var dominant = tw > 0 &&
        (adv >= tw * _RD_DOMINANCE || opp >= tw * _RD_DOMINANCE);

      var pkgNote = pkgOnly ? _rdPackageNote(idx, noun) : '';
      var key, weight, tone, label, dir = null;
      if (!uniform && !(deep && dominant)) {
        // Ran both ways, and no lead is derived from it — 'Split' is the pattern
        // engine's own word for a record with no single thing it did, and the two
        // counts beside it are the whole claim.
        key = 'split';
        weight = (!partial && judged >= _RD_SPLIT_MIN_JUDGED) ? _RD_TIERS.split.weight : 'thin';
        tone = _RD_TIERS.split.tone;
        label = _RD_TIERS.split.label;
      } else {
        var leadKey = uniform ? (adv ? 'advances' : 'opposes')
          : ((adv >= opp) ? 'advances' : 'opposes');
        dir = _RD_TIER_DIR[leadKey];
        // …and the same floor-led cap on the loudest word. See the block in
        // _recordPatternTier: a uniform run that is mostly non-vote acts is
        // "Mostly", not "Strongly", on every surface that prints either.
        key = deep ? ((uniform && idx.floorLed !== false) ? 'strong' : 'mostly') : 'thin';
        weight = deep ? _RD_TIERS[key].weight : 'thin';
        tone = dir.tone;
        label = _RD_TIERS[key].lead + ' ' + dir.word;
      }
      return {
        tier: key, weight: weight, tone: tone, label: label,
        says: _recordSays(key, dir ? dir.word : ''),
        // A uniform record counts itself the way the thin tier does — "3 actions
        // advanced" — because "3 advanced · 0 against" spends a number on a side
        // with nothing on it.
        counts: _rdTierCounts(idx, noun, (uniform || key === 'thin') ? 'thin' : key),
        // The same two integers the pattern tier carries, in the same phrase, so a
        // surface reading one field does not have to know which of the two reads it
        // was handed. This lane already prints its split counts above; this is the
        // identical arithmetic under a stable name.
        sideCounts: _rdSidePhrase(idx),
        judged: judged, advances: adv, opposes: opp,
        // The leftover, in the same two fields the pattern tier publishes it in, so
        // a surface reading one of the two reads does not have to know which.
        noSide: idx.noSide || 0,
        noSideCount: _rdNoSidePhrase(idx),
        directional: key !== 'split',
        token: idx.token,
        // THE LANE DISCLOSURE, plus the package sentence where that is how the acts
        // arrived. Appended rather than substituted: `note` is the pinned sentence
        // that keeps this chip out of the integrity score and it is tested
        // elsewhere in exactly its current words, so the second fact goes after it
        // in the same field every surface already renders. See _rdPackageNote.
        note: pkgNote ? (_RD_TIER_NOTE + ' ' + pkgNote) : _RD_TIER_NOTE,
        // …and the two of them under their own names, for a surface that wants to
        // place the package line itself rather than take it inside the disclosure.
        // `packageOnly` is a report, not a gate — and not a discount either. Nothing
        // in this function's tier decision reads it and nothing downstream branches
        // on it; a surface may print it, sort nothing by it and multiply nothing by
        // it. If a future edit wants it back in the tier arithmetic, that edit is
        // reintroducing a discount on official votes and should say so out loud.
        packageOnly: pkgOnly,
        packageNote: pkgNote,
        // Carried in the same shape the pattern tier carries it, so a surface that
        // prints the mix does not have to know which of the two reads it got.
        //   THE ONE-ACT LEAN IS NOT GATED ON THIS LANE, and that is deliberate.
        // _recordPatternTier refuses to CHARACTERISE a record off one signature;
        // this lane characterises nothing (`display: true`, `early: true`, and
        // `says.characterising` false on every thin read), and its whole job is
        // that a browse surface must not print a blank over a real, dated, sourced
        // act. It prints the act, in the act's own countable, with the mix beside
        // it — which is more honest than the empty slot it replaced, not less.
        mix: idx.mix || null,
        mixNote: idx.mixNote || '',
        floorLed: idx.floorLed !== false,
        floorActs: (typeof idx.floorActs === 'number') ? idx.floorActs : null,
        actStrength: (typeof idx.actStrength === 'number') ? idx.actStrength : null,
        display: true, early: judged <= 1, partial: partial
      };
    }

    window._recordDisplayTier = _recordDisplayTier;

    // ── Omnibus component breakdown (the reusable primitive) ───────────────────
    // Break ONE record (a floor vote or a non-roll-call position) into its component
    // issues. An omnibus bill maps to many issues via vr_measure_issues, so this is
    // how a SINGLE vote yields MANY say-vs-do verdicts at once — "consistent" on the
    // issues the vote advances that the member campaigned for, "contradicts" on the
    // ones it cuts against. For each component it reports:
    //   effect  — does THIS action advance ('advances') or oppose ('opposes') the
    //             issue, per the mapping's supportMeaning (null position → 'none'),
    //   verdict — the say-vs-do token vs the member's stated stance, when there is
    //             one ('consistent' | 'contradicts' | 'mixed' | 'no_position' |
    //             'no_stance'), reusing the exact same engine the aggregate uses.
    // Pure; never mutates its inputs. Any surface (the Voting Record cards, the H.R.1
    // Showcase, a profile) can render the same breakdown from this one function.
    //   item        — API record item: { issues:[{issueKey,weight,isPrimary,
    //                 supportMeaning,rationale,sourceUrl}], position|supports, isProcedural }
    //   positionMap — _polPositionMap(id,p): { issueKey -> { stance } }   (optional)
    //   opts.labelFn(issueKey) -> display label                            (optional)
    // Returns { isOmnibus, count, components:[…] } sorted primary-first, then weight.
    function _measureComponentBreakdown(item, positionMap, opts) {
      opts = opts || {};
      positionMap = positionMap || {};
      var labelFn = (typeof opts.labelFn === 'function') ? opts.labelFn : function (k) { return k; };
      var issues = (item && Array.isArray(item.issues)) ? item.issues : [];
      var comps = issues.map(function (m) {
        var eff = _voteEffectiveSupport(item, m.supportMeaning); // true | false | null
        var pm = positionMap[m.issueKey];
        var stance = pm ? pm.stance : null;
        return {
          issueKey: m.issueKey,
          label: labelFn(m.issueKey),
          weight: (typeof m.weight === 'number') ? m.weight : 100,
          isPrimary: !!m.isPrimary,
          supportMeaning: m.supportMeaning || 'yea_supports',
          rationale: m.rationale || '',
          sourceUrl: m.sourceUrl || null,
          effect: eff === true ? 'advances' : eff === false ? 'opposes' : 'none',
          hasStance: !!stance,
          stance: stance || null,
          verdict: _stanceVoteVerdict(stance, eff) // 'no_stance' when stance is falsy
        };
      });
      comps.sort(function (a, b) {
        if (b.isPrimary !== a.isPrimary) return a.isPrimary ? -1 : 1;
        return b.weight - a.weight;
      });
      return { isOmnibus: comps.length >= 2, count: comps.length, components: comps };
    }
    window._measureComponentBreakdown = _measureComponentBreakdown;

    // ── Big Picture presentation order (a fork, not a change) ─────────────────
    // _measureComponentBreakdown sorts primary-first then weight-desc. That order is
    // load-bearing for the SCORE path — the API ships issues in it, and surfaces that
    // pick a single internal example read the head of that list — so it does not move.
    //
    // But a citizen list is a different question. When a reader opens an act, every
    // topic it maps to is equally something the vote decided; handing them the
    // curator's ranking as the reading order tells them, by position alone, which
    // topics matter. bill-detail.js forked its own order for exactly this reason.
    // This is that fork, lifted to one place so the record card, the profile
    // highlight and the library card cannot each drift back to the score sort.
    //
    // The order is the SHIPPED TAXONOMY'S OWN INDEX — the category sequence a reader
    // already meets in the Alignment Tool — then the issue label alphabetically, then
    // the key. It is derived from the vocabulary, stable, and carries no judgement
    // about which topic the act was really about, because that is not a fact this
    // codebase has. Nothing here reads isPrimary or weight, so no presentation
    // decision can be inherited from a curation decision.
    //
    //   list   — anything with an `issueKey` (mappings, or breakdown components)
    //   opts.labelFn  — key → label; defaults to window._issueLabel then the key
    //   opts.firstKeys — keys to float to the top (bill-detail floats the reader's
    //                    own aligned issues). A personalisation, never a rank.
    var _BP_CAT_RANK = null;
    function _bpCatRank(key) {
      if (!_BP_CAT_RANK) {
        var built = {}, n = 0;
        try {
          var cats = (typeof window._pdxIssueCategories === 'function') ? window._pdxIssueCategories() : [];
          for (var i = 0; i < cats.length; i++) { if (cats[i] && cats[i].key) { built[cats[i].key] = i; n++; } }
        } catch (e) {}
        if (!n) return 999; // taxonomy not loaded yet — don't cache an empty table
        _BP_CAT_RANK = built;
      }
      var cat = '';
      try { if (typeof window._pdxIssueCatOf === 'function') cat = window._pdxIssueCatOf(key) || ''; } catch (e) {}
      var r = _BP_CAT_RANK[cat];
      return (typeof r === 'number') ? r : 999;
    }
    function _pdxBigPictureOrder(list, opts) {
      opts = opts || {};
      var labelFn = (typeof opts.labelFn === 'function') ? opts.labelFn : function (k) {
        try { if (typeof window._issueLabel === 'function') return window._issueLabel(k) || k; } catch (e) {}
        return k;
      };
      var first = null;
      if (opts.firstKeys) {
        first = {};
        var fk = opts.firstKeys;
        if (typeof fk.forEach === 'function') fk.forEach(function (k) { first[k] = 1; });
        else Object.keys(fk).forEach(function (k) { first[k] = 1; });
      }
      return (list || []).slice().sort(function (a, b) {
        var ka = (a && a.issueKey) || '', kb = (b && b.issueKey) || '';
        if (first) {
          var fa = first[ka] ? 0 : 1, fb = first[kb] ? 0 : 1;
          if (fa !== fb) return fa - fb;
        }
        var ca = _bpCatRank(ka), cb = _bpCatRank(kb);
        if (ca !== cb) return ca - cb;
        var cmp = String(labelFn(ka)).localeCompare(String(labelFn(kb)));
        if (cmp) return cmp;
        return ka < kb ? -1 : ka > kb ? 1 : 0;
      });
    }
    window._pdxBigPictureOrder = _pdxBigPictureOrder;
    // Same order for a bare list of issue KEYS (the library and search cards hold
    // keys, not mappings), so a chip row and a ledger row never disagree.
    window._pdxBigPictureKeys = function (keys, opts) {
      return _pdxBigPictureOrder((keys || []).filter(Boolean).map(function (k) { return { issueKey: k }; }), opts)
        .map(function (o) { return o.issueKey; });
    };

    // ── Omnibus PROVENANCE (presentation metadata — changes no verdict) ────────
    // The breakdown above answers "what did this one vote do to each issue?". These
    // two helpers answer the companion question a voter asks on a comparison surface:
    // "wait — is this verdict coming from a bill that was ALSO about five other
    // things?". They read the exact same mappings and the exact same
    // _measureComponentBreakdown output, and deliberately compute NO score: nothing
    // here can move a verdict, a count or a percentage. They only describe where an
    // already-computed verdict came from, so a surface can say so plainly.

    // Provenance for ONE record as seen FROM one issue. Returns null for a
    // single-issue record (the ordinary case — nothing to disclose), else the issue's
    // own component plus the sibling issues the same vote also touched, split by
    // whether this action advanced or cut against each of them.
    //   item, positionMap, opts — exactly as _measureComponentBreakdown takes them
    //   issueKey               — the issue whose verdict is being displayed
    function _measureOmnibusContext(item, issueKey, positionMap, opts) {
      var brk = _measureComponentBreakdown(item, positionMap, opts);
      if (!brk.isOmnibus) return null; // single-issue vote → no provenance to show
      var self = null, others = [];
      brk.components.forEach(function (c) {
        // Take the FIRST match as "this issue" so a duplicated mapping can't vanish.
        if (self === null && c.issueKey === issueKey) self = c;
        else others.push(c);
      });
      // The sibling issues are a CITIZEN-FACING LIST — every consumer of this
      // function renders them as prose, chips or a trail — and they were inheriting
      // _measureComponentBreakdown's is_primary-first, weight-descending order,
      // which is the scoring path's order. Nothing here can move a verdict, a count
      // or a percentage (see the note above), so the sequence is pure presentation
      // and is forked to the shared Big Picture order. `self` keeps its place at the
      // head of the trail — that is the issue the reader is standing on, not a rank —
      // and identity is preserved, so callers comparing against ctx.thisIssue still
      // match. Same members, same count; only the reading order changes.
      others = _pdxBigPictureOrder(others, opts);
      var advances = [], opposes = [], neutral = [];
      others.forEach(function (c) {
        if (c.effect === 'advances') advances.push(c);
        else if (c.effect === 'opposes') opposes.push(c);
        else neutral.push(c);
      });
      return {
        count: brk.count,
        thisIssue: self,             // null when the record doesn't map to issueKey
        others: others,
        labels: (self ? [self] : []).concat(others).map(function (c) { return c.label; }),
        otherLabels: others.map(function (c) { return c.label; }),
        advances: advances,          // sibling issues this action pushed forward
        opposes: opposes,            // sibling issues this action cut against
        neutral: neutral,            // sibling issues with no position taken
        // True when the SAME action moves this issue and a sibling in opposite
        // directions — the "one yea, two answers" case worth calling out.
        splits: !!(self && self.effect !== 'none' &&
          (self.effect === 'advances' ? opposes.length > 0 : advances.length > 0))
      };
    }
    window._measureOmnibusContext = _measureOmnibusContext;

    // How much of an issue's record comes from multi-issue bills. Pure counting over
    // the same records _issueRecordSummary already aggregated — no weighting, no
    // scoring — so a surface can print "2 of 3 votes came from multi-issue bills".
    // Returns { total, omnibus, single, maxCount, otherLabels } ; otherLabels is the
    // de-duplicated set of OTHER issues those bills also touched, in first-seen order.
    function _recordOmnibusStats(issueKey, records, opts) {
      records = Array.isArray(records) ? records : [];
      var total = 0, omnibus = 0, maxCount = 0, otherLabels = [], seen = {};
      records.forEach(function (item) {
        if (!_findIssueMapping(item, issueKey)) return; // record doesn't touch this issue
        total++;
        var ctx = _measureOmnibusContext(item, issueKey, {}, opts);
        if (!ctx) return;
        omnibus++;
        if (ctx.count > maxCount) maxCount = ctx.count;
        ctx.otherLabels.forEach(function (l) {
          if (l && !seen[l]) { seen[l] = 1; otherLabels.push(l); }
        });
      });
      return {
        issueKey: issueKey, total: total, omnibus: omnibus, single: total - omnibus,
        maxCount: maxCount, otherLabels: otherLabels, any: omnibus > 0
      };
    }
    window._recordOmnibusStats = _recordOmnibusStats;

    // ── THE VEHICLE, AND WHETHER THE POLICY WAS DRIVING IT ─────────────────────
    // A large amount of real policy never gets a clean up-or-down vote. It rides
    // inside an appropriations act, an NDAA, a reconciliation package or a
    // continuing resolution, and the member votes on the vehicle. The formal record
    // then reads exactly like a record of standalone votes on the policy, because
    // nothing on the row says otherwise — which makes the legislative process look
    // more deliberate than it was, in OUR favour.
    //
    // This counts the difference. It adds nothing to the mapping data: every field
    // it reads is already curated and already printed one instrument at a time in
    // the dossier ("supporting link", "narrow link"). What is new is only the
    // aggregate — the row-level fact that this issue's whole formal signal travelled
    // as provisions rather than as votes on the subject.
    //
    // WHAT COUNTS AS A STOWAWAY MAPPING — three conditions, all required, because
    // any two of them are ordinary:
    //   1. the instrument is MULTI-ISSUE. A standalone bill has no vehicle to be
    //      a stowaway on.
    //   2. the mapping is NOT PRIMARY. Almost every measure in the corpus carries
    //      exactly one primary issue, so this alone marks every secondary mapping
    //      on every two-issue bill — far too many to mean anything.
    //   3. the curator weight is NARROW (<= _RD_NARROW_AT). This is the curation
    //      saying, in the field it already has for it, that the link rests on a
    //      small part of the document. It is the condition that separates "the
    //      bill also did this" from "one subtitle of the bill did this".
    // Requiring all three takes the flag from 47% of member-issue rows down to 17%,
    // and what is left is the real population: Hyde riders inside a consolidated
    // appropriations act, a fentanyl subtitle inside a defence authorization, a
    // leasing title inside a reconciliation act.
    //
    // AND THE ROW ONLY WEARS IT WHEN THE POLICY WAS MOSTLY OR ONLY A PASSENGER.
    // One provision among four real votes on the subject is not a story about the
    // vehicle; it is one footnote, and the dossier already carries it per-item.
    // _RD_STOWAWAY_AT is the share of the issue's mapped instruments that must be
    // provision-borne before the ROW says so.
    //
    // PRESENTATION ONLY, exactly like _recordOmnibusStats above it: nothing here is
    // read by a gate, a tier, a count or a percentage. It cannot move Direction
    // Match, it cannot move the record's characterisation, and it cannot make an
    // unreadable row readable or a readable row unreadable. It describes.
    var _RD_NARROW_AT = 45;      // …the ✒️ section's own narrow-link threshold
    var _RD_STOWAWAY_AT = 0.6;   // …the share of instruments that must be provisions

    // One mapping, one question: did this issue ride inside this instrument?
    function _rdIsProvision(item, mapping) {
      if (!item || !mapping) return false;
      if (!item.issues || item.issues.length < 2) return false;   // no vehicle
      if (mapping.isPrimary) return false;                        // it WAS the bill
      var w = (typeof mapping.weight === 'number') ? mapping.weight : 100;
      return w <= _RD_NARROW_AT;                                  // …and it is a slice
    }
    window._rdIsProvision = _rdIsProvision;

    // ── WHAT KIND OF PACKAGE WAS IT? (light vehicle awareness) ────────────────
    // The detector above answers "did this issue ride inside something larger?"
    // and names the something by number. That is enough for a per-row disclosure
    // and not enough for the question underneath it: some vehicles are the ONLY
    // train that leaves the station. An omnibus, a defence authorization, a
    // reconciliation act and a full-year CR are the measures that must pass, and
    // policy that cannot get a floor date of its own gets attached to one of them.
    // A reader who is told "this rode inside H.R. 7148" learns a bill number; a
    // reader who is told "inside a defence authorization" learns why there may
    // have been nowhere else for it to go.
    //
    // THIS IS THE WHOLE OF THE AWARENESS AND IT IS DELIBERATELY SMALL. It reads
    // the title we already ship, matches it against a fixed list of recognised
    // instrument families, and hands back a class word. It does not count what the
    // chamber scheduled, it does not hold a denominator of bills that never got a
    // vote, and it does not know who set the calendar — all of that is later work
    // and none of it can be inferred from a member's own record. Unrecognised is
    // the default and stays silent: `null` means "we do not classify this", never
    // "this was an ordinary bill".
    //
    // PRESENTATION ONLY, on the same terms as everything else in this section: no
    // gate, tier, count, floor, percentage or Direction Match input reads a class.
    // A vehicle's class changes the WORDS a surface may use about a record it has
    // already read; it can never change the reading.
    var _RD_VEHICLE_CLASSES = [
      // Order is match order, and it matters: a special rule "providing for
      // consideration of" an appropriations bill is a procedural gate, not an
      // appropriations act, so the rule pattern is tested first. An amendment is
      // recognised off its instrument number, which is definitive, before any
      // family word borrowed from the bill it was offered to can claim it.
      // Likewise a reconciliation act and an NDAA are named as themselves before
      // the generic appropriations catch-all (`generic: true`, tested last).
      { key: 'rule', label: 'a special rule', article: 'a',
        re: /providing for consideration of|special rule|^h\.?\s?res\.?\s/i,
        gate: true },
      // An amendment is a provision by construction: it exists only as text
      // offered to a measure that already had a number. Where the mapping says
      // this issue rode inside one, "an amendment to a larger measure" is the
      // plainest true thing that can be said about where the vote happened. The
      // pattern reads the instrument designator (H.Amdt., S.Amdt.), never the
      // word "amendment" in a bill's own name, so the "Privacy Amendment Act"
      // is not swept up.
      { key: 'amendment', label: 'an amendment to a larger measure', article: 'an',
        re: /\b[hs]\.?\s?amdt\b|\bamendment\s+(?:no\.?|number)\s?\d/i },
      { key: 'reconciliation', label: 'a reconciliation act', article: 'a',
        re: /reconciliation|inflation reduction act|american rescue plan|build back better|one big beautiful/i },
      { key: 'ndaa', label: 'a defence authorization', article: 'a',
        re: /national defense authorization|defense authorization act/i },
      { key: 'cr', label: 'a continuing resolution', article: 'a',
        re: /continuing appropriations|continuing resolution|further continuing|full-year continuing/i },
      { key: 'omnibus', label: 'an omnibus appropriations act', article: 'an',
        re: /omnibus|consolidated appropriations/i },
      { key: 'supplemental', label: 'a supplemental appropriations act', article: 'a',
        re: /supplemental appropriations/i },
      // A rescissions act and a debt-limit act are must-pass in the same way an
      // omnibus is — a deadline measure with a floor date that policy without one
      // can be attached to. Both are named by their own titles, which is the
      // practice the list already follows for the reconciliation acts above.
      { key: 'rescissions', label: 'a rescissions act', article: 'a',
        re: /\brescissions?\s+act\b/i },
      { key: 'debt_limit', label: 'a debt-limit act', article: 'a',
        re: /fiscal responsibility act|\bdebt (?:limit|ceiling)\b|statutory debt limit/i },
      // Not must-pass, and included for the other reason a family is worth naming:
      // a resolution of disapproval is a single-target instrument whose subject is
      // an agency rule or a specific sale, so a reader told only "S.J.Res. 33"
      // cannot tell that the vote was never about a policy area in general. Covers
      // both flavours the corpus carries — Congressional Review Act rule
      // disapprovals and Arms Export Control Act sale disapprovals.
      { key: 'disapproval', label: 'a resolution of disapproval', article: 'a',
        re: /congressional disapproval|joint resolution disapproving|disapproving the rule submitted by|congressional review act/i },
      { key: 'approps', label: 'an appropriations act', article: 'an',
        re: /appropriations act|making appropriations|division [a-z]{1,2}\b/i,
        generic: true }
    ];
    // title/identity → class object, or null when nothing on the list matches.
    // Both strings are searched because the corpus names some measures fully in
    // the title and some only in the identity line.
    function _rdVehicleClass(title, ident) {
      var hay = String(title || '') + ' ' + String(ident || '');
      if (!hay.replace(/\s/g, '')) return null;
      for (var i = 0; i < _RD_VEHICLE_CLASSES.length; i++) {
        if (_RD_VEHICLE_CLASSES[i].re.test(hay)) return _RD_VEHICLE_CLASSES[i];
      }
      return null;
    }
    window._rdVehicleClass = _rdVehicleClass;
    window._PDX_RD_VEHICLE_CLASSES = _RD_VEHICLE_CLASSES;

    // ── THE EXTENSION POINT ───────────────────────────────────────────────────
    // The list above is a list of families someone recognised by hand, and it will
    // always be shorter than the set of things a legislature can pass. Rather than
    // let the next family be added by editing this file — which is how a fixed list
    // becomes a fixed list nobody dares touch — registration is a supported call
    // with the rules written down and enforced:
    //
    //   PDXVehicleFamilies.register({
    //     key: 'wrda', label: 'a water resources development act',
    //     re: /water resources development act/i
    //   });                                            // → true, or false and why
    //
    // WHAT A FAMILY IS ALLOWED TO BE. A family is a NOUN PHRASE for an instrument
    // kind, matched off the title the corpus already ships. That is the whole
    // contract, and the validation is there to keep it:
    //   • `key` is a short slug, unique — a second registration under a live key is
    //     refused rather than silently shadowing it.
    //   • `label` is a noun phrase with its article, because the shipped sentences
    //     read "That is <label>." — a label that is a verb, a judgement or a
    //     percentage produces a sentence this codebase is not allowed to print.
    //   • `re` is a RegExp over title + identity. It is the caller's evidence that
    //     the family is READ off the record rather than assumed.
    //   • No intent, no verdict, no number. _BAD_LABEL below refuses the words this
    //     project has banned everywhere else ("snuck", "buried", "hidden") plus any
    //     label carrying a digit or a percent sign, because a family is a kind of
    //     document and a kind of document is not a measurement.
    //
    // WHERE IT LANDS. Registered families are spliced in ahead of the generic
    // catch-alls (`generic: true`) and behind the specific builtins, which is the
    // only position that cannot change an existing classification: a title that
    // already matched `omnibus` still matches `omnibus`, and a title that only ever
    // reached `approps` can now be recognised as itself. Nothing here can UNname a
    // vehicle, because nothing here can remove or reorder a builtin.
    //
    // AND IT IS STILL PRESENTATION ONLY. A registered family has exactly the powers
    // a builtin has: it changes the words a surface may use about a record that has
    // already been read. There is no path from this list to Direction Match, to a
    // formal pattern tier, to a count, a floor, a share or a sort order — and the
    // suite asserts it (scripts/test-vehicle-families.mjs).
    var _BAD_LABEL = /\bsnuck|\bsneak|\bburied|\bhidden\b|\bslipped\b|\bcrammed|\brammed|\bshady|\bcorrupt|%|\d/i;
    var _FAM_KEY = /^[a-z][a-z0-9_]{0,23}$/;
    function _famRegister(fam) {
      if (!fam || typeof fam !== 'object') return { ok: false, why: 'no family given' };
      var key = String(fam.key || '');
      if (!_FAM_KEY.test(key)) return { ok: false, why: 'key must match ' + String(_FAM_KEY) };
      for (var i = 0; i < _RD_VEHICLE_CLASSES.length; i++) {
        if (_RD_VEHICLE_CLASSES[i].key === key) return { ok: false, why: 'key already registered: ' + key };
      }
      var label = String(fam.label || '').replace(/\s+/g, ' ').trim();
      if (label.length < 3 || label.length > 60) return { ok: false, why: 'label must be 3-60 chars' };
      if (_BAD_LABEL.test(label)) return { ok: false, why: 'label carries intent, a verdict or a number' };
      // Branded rather than `instanceof`, so a family registered from an iframe
      // or a test realm is not refused for holding that realm's RegExp.
      var re = fam.re;
      if (!re || Object.prototype.toString.call(re) !== '[object RegExp]' ||
          typeof re.test !== 'function') return { ok: false, why: 're must be a RegExp' };
      var art = String(fam.article || '').trim();
      if (!art) art = /^(a|an|the)\s/i.test(label) ? label.split(/\s/)[0].toLowerCase() : 'a';
      var entry = { key: key, label: label, article: art, re: re, registered: true };
      if (fam.gate) entry.gate = true;
      // …in front of the first generic catch-all, or at the end when there is none.
      var at = _RD_VEHICLE_CLASSES.length;
      for (var j = 0; j < _RD_VEHICLE_CLASSES.length; j++) {
        if (_RD_VEHICLE_CLASSES[j].generic) { at = j; break; }
      }
      _RD_VEHICLE_CLASSES.splice(at, 0, entry);
      return { ok: true, key: key, at: at };
    }
    window.PDXVehicleFamilies = {
      // The list, copied one level deep so a caller cannot reorder match order or
      // rewrite a builtin's label by holding the array.
      list: function () {
        return _RD_VEHICLE_CLASSES.map(function (c) {
          return { key: c.key, label: c.label, article: c.article, re: c.re,
                   gate: !!c.gate, generic: !!c.generic, registered: !!c.registered };
        });
      },
      register: _famRegister,
      classify: function (title, ident) {
        var c = _rdVehicleClass(title, ident);
        return c ? { key: c.key, label: c.label, article: c.article, gate: !!c.gate } : null;
      },
      // Declared for readers and for the suite: this lane ends at words.
      NEVER_FEEDS: ['directionMatch', 'formalPatternTier', 'publicationFloor',
                    'issueCounts', 'ballotSort', 'anyPercentage'],
      scored: false
    };

    // The row-level read. Same records _recordOmnibusStats takes, same shape of
    // answer, and `null` is never returned for a real record — a row with no
    // provisions reports `stowaway: false` rather than nothing, so a caller cannot
    // mistake "we did not look" for "it is clean".
    //   opts.identFn — instrument → its printable identity ("H.R. 7148"), so this
    //            module does not have to know how a measure is named. Defaults to
    //            the record's own number.
    function _recordVehicleStats(issueKey, records, opts) {
      opts = opts || {};
      records = Array.isArray(records) ? records : [];
      var identFn = (typeof opts.identFn === 'function') ? opts.identFn : function (it) {
        return String((it && (it.number || it.title)) || '').trim();
      };
      var out = {
        issueKey: issueKey || null,
        total: 0, provision: 0, standalone: 0,
        vehicles: [], titles: [], sole: null, soleTitle: null,
        // Light vehicle awareness, added beside the counts rather than folded
        // into them: `classes` are the recognised must-pass families among the
        // vehicles above, in first-seen order; `major` is true when at least one
        // vehicle was recognised; `gate` is true when at least one was a special
        // rule rather than a policy measure. Every one of these is a word for a
        // surface to use — `stowaway`, `only` and `share` are computed exactly as
        // they were and read none of them.
        classes: [], major: false, gate: false,
        share: 0, stowaway: false, only: false, threshold: _RD_STOWAWAY_AT
      };
      var seenClass = {};
      var seen = {};
      records.forEach(function (item) {
        var m = _findIssueMapping(item, issueKey);
        if (!m) return;
        out.total++;
        if (!_rdIsProvision(item, m)) { out.standalone++; return; }
        out.provision++;
        var id = identFn(item);
        if (id && !seen[id]) {
          seen[id] = 1;
          out.vehicles.push(id);
          var ttl = String((item && item.title) || '').trim() || id;
          out.titles.push(ttl);
          var cls = _rdVehicleClass(ttl, id);
          if (cls && !seenClass[cls.key]) { seenClass[cls.key] = 1; out.classes.push(cls.key); }
        }
      });
      if (!out.total) return out;
      out.share = out.provision / out.total;
      // "Only" is the stronger claim and it is exact: every mapped instrument on
      // this issue was a vehicle. "Stowaway" is the readable-majority claim.
      out.only = out.provision > 0 && out.provision === out.total;
      out.stowaway = out.provision > 0 && out.share >= _RD_STOWAWAY_AT;
      if (out.vehicles.length === 1) { out.sole = out.vehicles[0]; out.soleTitle = out.titles[0]; }
      out.major = out.classes.length > 0;
      out.gate = out.classes.indexOf('rule') >= 0;
      return out;
    }
    window._recordVehicleStats = _recordVehicleStats;
    window._PDX_RD_NARROW_AT = _RD_NARROW_AT;
    window._PDX_RD_STOWAWAY_AT = _RD_STOWAWAY_AT;

    // ── Multi-issue SPREAD (presentation aggregate — invents no score) ─────────
    // _measureComponentBreakdown already decides, per component issue, what one vote
    // did ('advances'/'opposes') and how that reads against the member's stance
    // ('consistent'/'contradicts'/…). But a card's top-level badge shows only the
    // PRIMARY issue's verdict, so the multi-issue nature of the vote used to live in
    // a hover — weak on touch and for some screen readers. This tallies the
    // components that are ALREADY computed so a surface can print the whole-card
    // story as always-visible text. No new weighting, no new thresholds: it counts.
    //   brk — the object returned by _measureComponentBreakdown
    // Returns null for a single-issue record, else { count, judged, consistent,
    // contradicts, mixed, advances, opposes, tone, lead, detail, label, … }.
    // `detail` uses the VERDICT flavour when at least one component could be judged
    // against a stated stance, and falls back to the EFFECT flavour otherwise, so the
    // token is never empty on a multi-issue card — including for a member with no
    // stances at all.
    function _multiIssueSpread(brk) {
      if (!brk || !brk.isOmnibus) return null; // single-issue → nothing to summarise
      var comps = Array.isArray(brk.components) ? brk.components : [];
      var v = { consistent: 0, contradicts: 0, mixed: 0, no_position: 0, no_stance: 0 };
      var e = { advances: 0, opposes: 0, none: 0 };
      comps.forEach(function (c) {
        if (v[c.verdict] !== undefined) v[c.verdict]++;
        if (e[c.effect] !== undefined) e[c.effect]++;
      });
      var judged = v.consistent + v.contradicts;
      var parts = [];
      if (judged > 0 || v.mixed > 0) {
        if (v.consistent) parts.push(v.consistent + ' match');
        if (v.contradicts) parts.push(v.contradicts + ' against');
        if (v.mixed) parts.push(v.mixed + ' mixed');
      } else if (e.advances || e.opposes) {
        if (e.advances) parts.push('advances ' + e.advances);
        if (e.opposes) parts.push('cuts against ' + e.opposes);
      } else {
        parts.push('no position taken');
      }
      var tone = (v.consistent && v.contradicts) ? 'mixed'
        : v.consistent ? 'match'
          : v.contradicts ? 'against'
            : (e.advances && e.opposes) ? 'mixed' : 'neutral';
      var lead = brk.count + ' issues';
      return {
        count: brk.count,
        judged: judged,
        consistent: v.consistent, contradicts: v.contradicts, mixed: v.mixed,
        noPosition: v.no_position, noStance: v.no_stance,
        advances: e.advances, opposes: e.opposes, neutral: e.none,
        // True when the SAME vote pushed one issue forward and another back — the
        // "one yea, two answers" case the badge most needs to stop hiding.
        splits: !!(e.advances && e.opposes),
        stanceBased: judged > 0 || v.mixed > 0,
        tone: tone,
        lead: lead,
        detail: parts.join(' · '),
        label: lead + ' · ' + parts.join(' · ')
      };
    }
    window._multiIssueSpread = _multiIssueSpread;

    // ── Record COMPOSITION / confidence (describes a %, never changes one) ─────
    // The Official Record percentage is consistent / (consistent + contradicts), so a
    // member whose whole percentage rests on ONE omnibus vote renders identically to
    // one with several single-issue votes. This reports how thin that denominator is
    // and how much of it came from multi-issue bills, reusing _issueRecordSummary's
    // counts and _recordOmnibusStats's tallies verbatim. It computes NO score and
    // must never be allowed to move the number it annotates.
    //   rec   — an _issueRecordSummary result (or the overall equivalent)
    //   stats — a _recordOmnibusStats result for the same issue (optional)
    // Returns null when there is no percentage to qualify (judged === 0), else
    // { judged, total, unjudged, omnibus, single, maxCount, strength, level, thin,
    //   omnibusDriven, note, detail }.
    // The noun a composition counts in. The 🏛️ lane counts roll calls; the ✒️ lane
    // counts documents, and "1 judged vote sits behind this percentage" is simply
    // false about a signature on a bill. Passed in by the caller rather than sniffed
    // from the records, so this function stays pure and neither lane's wording is
    // silently imposed on the other. Omit it and nothing changes.
    var _COMP_NOUN = {
      one: 'vote', many: 'votes',
      multiOne: 'a multi-issue bill', multiMany: 'multi-issue bills'
    };
    function _recordComposition(rec, stats, opts) {
      if (!rec) return null;
      var judged = (rec.consistent || 0) + (rec.contradicts || 0);
      if (!judged) return null; // no % is displayed → nothing to annotate
      var n = (opts && opts.noun) || _COMP_NOUN;
      var total = Math.max(rec.total || 0, judged);
      var unjudged = Math.max(0, total - judged);
      var omnibus = stats ? (stats.omnibus || 0) : 0;
      var single = stats ? (stats.single || 0) : 0;
      var maxCount = stats ? (stats.maxCount || 0) : 0;
      var level = judged >= 3 ? 'solid' : judged === 2 ? 'limited' : 'single';
      var omnibusDriven = omnibus > 0 && omnibus >= single;
      var note = '';
      if (level === 'single') note = omnibus >= 1 ? '1 multi-issue ' + n.one : '1 ' + n.one;
      else if (level === 'limited') note = omnibusDriven ? '2 ' + n.many + ', multi-issue' : '2 ' + n.many;
      else if (omnibusDriven) note = 'mostly multi-issue';
      // Each bit is joined with '. ' below, so each one has to read as its own sentence.
      var bits = [judged + ' judged ' + (judged === 1 ? n.one + ' sits' : n.many + ' sit') + ' behind this percentage'];
      if (unjudged) {
        bits.push(unjudged + ' further record' + (unjudged === 1 ? '' : 's') + ' on this issue took no position either way, so ' +
          (unjudged === 1 ? 'it is' : 'they are') + ' not counted in it');
      }
      if (omnibus) {
        bits.push(omnibus + ' of ' + total + ' came from ' + (omnibus === 1 ? n.multiOne : n.multiMany) +
          (maxCount >= 2 ? ' (' + (omnibus === 1 ? 'it covered ' : 'one of them covered ') + maxCount + ' issues at once)' : ''));
      }
      if (level !== 'solid') bits.push('A read this thin can swing a long way on one more ' + n.one);
      return {
        judged: judged, total: total, unjudged: unjudged,
        omnibus: omnibus, single: single, maxCount: maxCount,
        strength: judged >= 3 ? 3 : judged, // filled segments out of 3
        level: level, thin: level !== 'solid', omnibusDriven: omnibusDriven,
        note: note, detail: bits.join('. ') + '.'
      };
    }
    window._recordComposition = _recordComposition;

    // Runnable, dependency-free self-test for the stance-vs-record engine. Never runs
    // on its own (pure) — call window._stanceRecordSelfTest() from the console or a
    // node harness. Returns { passed, failed, failures[] }. The cases pin down the
    // supportMeaning behaviour, especially the multi-issue omnibus case.
    function _stanceRecordSelfTest() {
      var failures = [];
      function ok(cond, msg) { if (!cond) failures.push(msg); }
      function eq(a, b, msg) { if (a !== b) failures.push(msg + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')'); }

      // ── _voteEffectiveSupport: a YEA under each supportMeaning ──
      eq(_voteEffectiveSupport('yea', 'yea_supports'), true,  'yea+yea_supports → supports');
      eq(_voteEffectiveSupport('yea', 'yea_opposes'),  false, 'yea+yea_opposes → opposes');
      eq(_voteEffectiveSupport('nay', 'yea_supports'), false, 'nay+yea_supports → opposes');
      eq(_voteEffectiveSupport('nay', 'yea_opposes'),  true,  'nay+yea_opposes → supports');
      eq(_voteEffectiveSupport('present', 'yea_supports'), null, 'present → no position');
      eq(_voteEffectiveSupport('not_voting', 'yea_supports'), null, 'not_voting → no position');
      eq(_voteEffectiveSupport('yea', undefined), true, 'missing supportMeaning defaults to yea_supports');

      // A position (co-sponsorship) that advances a measure whose YEA opposes the
      // issue → effectively opposes the issue.
      eq(_voteEffectiveSupport({ kind: 'position', supports: true }, 'yea_opposes'), false, 'cosponsor(advances)+yea_opposes → opposes');
      eq(_voteEffectiveSupport({ kind: 'position', supports: true }, 'yea_supports'), true, 'cosponsor(advances)+yea_supports → supports');
      eq(_voteEffectiveSupport({ kind: 'position', supports: null }, 'yea_supports'), null, 'position with null supports → no position');

      // ── Procedural inversion: recommit / table flip the vote→measure read ──
      // The real case this exists for: H.R. 4758 (repeals IRA home-electrification
      // subsidies) is mapped cut_spending → yea_supports. Roll 119/2/77 was a Motion to
      // Recommit; Boebert, Massie and Owens voted NAY, i.e. "do not send it back" —
      // support for the bill, hence support for the spending cut. Read without the
      // inversion, that NAY became "opposes cut_spending" and manufactured a
      // contradiction against their stated support.
      var recommitNay = { kind: 'vote', position: 'nay', isProcedural: true, advanceInverted: true };
      var recommitYea = { kind: 'vote', position: 'yea', isProcedural: true, advanceInverted: true };
      eq(_voteEffectiveSupport(recommitNay, 'yea_supports'), true, 'recommit nay → advances the measure');
      eq(_voteEffectiveSupport(recommitYea, 'yea_supports'), false, 'recommit yea → blocks the measure');
      eq(_voteEffectiveSupport(recommitYea, 'yea_opposes'), true, 'recommit + yea_opposes → both flips compose');
      eq(_voteEffectiveSupport({ kind: 'vote', position: 'nay', advanceInverted: false }, 'yea_supports'), false,
         'advanceInverted:false leaves an ordinary nay alone');
      eq(_voteEffectiveSupport({ kind: 'vote', position: 'present', advanceInverted: true }, 'yea_supports'), null,
         'inversion never invents a position out of present/not_voting');
      eq(_stanceVoteVerdict('support', _voteEffectiveSupport(recommitNay, 'yea_supports')), 'consistent',
         'recommit nay + pro-measure stance → consistent, not a fabricated contradiction');

      // ── _stanceVoteVerdict: the truth table ──
      eq(_stanceVoteVerdict('support', true),  'consistent',  'support + supports → consistent');
      eq(_stanceVoteVerdict('support', false), 'contradicts', 'support + opposes → contradicts');
      eq(_stanceVoteVerdict('oppose',  false), 'consistent',  'oppose + opposes → consistent');
      eq(_stanceVoteVerdict('oppose',  true),  'contradicts', 'oppose + supports → contradicts');
      eq(_stanceVoteVerdict('mixed',   true),  'mixed',       'mixed stance → mixed');
      eq(_stanceVoteVerdict('support', null),  'no_position', 'no position taken → no_position');
      eq(_stanceVoteVerdict(null,      true),  'no_stance',   'no stance → no_stance');

      // ── Multi-issue omnibus: ONE yea, TWO opposite verdicts (the key case) ──
      var hr1 = {
        kind: 'vote', position: 'yea', isProcedural: false, isAmendment: false,
        number: 'H.R. 1', title: 'One Big Beautiful Bill Act',
        issues: [
          { issueKey: 'lower_taxes', weight: 100, isPrimary: true,  supportMeaning: 'yea_supports' },
          { issueKey: 'healthcare',  weight: 60,  isPrimary: false, supportMeaning: 'yea_opposes'  }
        ]
      };
      // Member SAYS they support both lowering taxes and healthcare access.
      var posMap = { lower_taxes: { stance: 'support' }, healthcare: { stance: 'support' } };
      var recMap = _polRecordMap([hr1], posMap);
      eq(recMap.lower_taxes.netVerdict, 'consistent',  'omnibus: yea consistent with pro-tax-cut stance');
      eq(recMap.healthcare.netVerdict,  'contradicts', 'omnibus: SAME yea contradicts pro-healthcare stance');
      ok(recMap.healthcare.hasContradiction, 'omnibus: healthcare flagged as contradiction');

      // ── Weighting: a procedural pro vote can't outweigh a substantive con vote ──
      var subCon = { kind: 'vote', position: 'nay', isProcedural: false, issues: [{ issueKey: 'x', weight: 100, supportMeaning: 'yea_supports' }] };
      var procPro = { kind: 'vote', position: 'yea', isProcedural: true, issues: [{ issueKey: 'x', weight: 100, supportMeaning: 'yea_supports' }] };
      var wSum = _issueRecordSummary('x', 'support', [subCon, procPro]);
      // stance 'support': nay(sub) → contradicts (weight 100); yea(proc) → consistent (weight 25).
      eq(wSum.netVerdict, 'contradicts', 'weighting: substantive con outranks procedural pro');
      eq(wSum.consistent, 1, 'weighting: one consistent counted');
      eq(wSum.contradicts, 1, 'weighting: one contradiction counted');

      // ── Edge cases ──
      eq(_issueRecordSummary('x', null, [subCon]).netVerdict, 'no_stance', 'no stance → no_stance');
      eq(_issueRecordSummary('x', 'support', []).netVerdict, 'no_record', 'no records → no_record');
      var pv = { kind: 'vote', position: 'present', issues: [{ issueKey: 'x', weight: 100, supportMeaning: 'yea_supports' }] };
      eq(_issueRecordSummary('x', 'support', [pv]).netVerdict, 'no_position', 'only present votes → no_position');
      // A "said but never voted" issue still appears in the map via the position side.
      var sm = _polRecordMap([], { housing_build: { stance: 'support' } });
      eq(sm.housing_build.netVerdict, 'no_record', 'stance with no record → no_record entry present');

      // ── _measureComponentBreakdown: one vote → many per-issue verdicts ──
      // Reuse the omnibus fixture: a YEA on H.R. 1 by a member who says they back
      // both lower taxes and healthcare access — one action, two opposite verdicts.
      var brk = _measureComponentBreakdown(hr1, posMap, { labelFn: function (k) { return k.toUpperCase(); } });
      eq(brk.isOmnibus, true, 'breakdown: multi-issue measure flagged omnibus');
      eq(brk.count, 2, 'breakdown: two components');
      eq(brk.components[0].issueKey, 'lower_taxes', 'breakdown: primary sorts first');
      eq(brk.components[0].label, 'LOWER_TAXES', 'breakdown: labelFn applied');
      eq(brk.components[0].effect, 'advances', 'breakdown: yea advances lower_taxes');
      eq(brk.components[0].verdict, 'consistent', 'breakdown: consistent on taxes');
      eq(brk.components[1].effect, 'opposes', 'breakdown: SAME yea opposes healthcare');
      eq(brk.components[1].verdict, 'contradicts', 'breakdown: contradicts on healthcare');
      // No stance on an issue → no_stance verdict but the component is still listed.
      var brk2 = _measureComponentBreakdown(hr1, {});
      eq(brk2.components[0].verdict, 'no_stance', 'breakdown: no stance → no_stance token');
      eq(brk2.isOmnibus, true, 'breakdown: omnibus regardless of stance coverage');
      // A single-issue vote is not flagged omnibus.
      eq(_measureComponentBreakdown(subCon, {}).isOmnibus, false, 'breakdown: single-issue not omnibus');

      // ── Omnibus provenance: same mappings, no new scoring ──────────────────
      // Seen from the taxes side, the H.R.1 yea also cut against healthcare.
      var ctxTax = _measureOmnibusContext(hr1, 'lower_taxes', posMap);
      ok(!!ctxTax, 'provenance: multi-issue record has context');
      eq(ctxTax.count, 2, 'provenance: two component issues');
      eq(ctxTax.thisIssue.issueKey, 'lower_taxes', 'provenance: thisIssue is the displayed issue');
      eq(ctxTax.others.length, 1, 'provenance: one sibling issue');
      eq(ctxTax.otherLabels.join(','), 'healthcare', 'provenance: sibling label listed');
      eq(ctxTax.opposes.length, 1, 'provenance: sibling was cut against');
      eq(ctxTax.advances.length, 0, 'provenance: no sibling advanced');
      eq(ctxTax.splits, true, 'provenance: one action, opposite directions → splits');
      // Seen from the healthcare side, the same vote advanced taxes — mirror image.
      var ctxHc = _measureOmnibusContext(hr1, 'healthcare', posMap);
      eq(ctxHc.thisIssue.issueKey, 'healthcare', 'provenance: mirrored view keeps its own issue');
      eq(ctxHc.advances.length, 1, 'provenance: mirrored view sees taxes advanced');
      eq(ctxHc.splits, true, 'provenance: mirrored view also splits');
      // A single-issue vote discloses nothing.
      eq(_measureOmnibusContext(subCon, 'x', {}), null, 'provenance: single-issue → null');
      // An issue the record does not map to still lists the components it does.
      var ctxNone = _measureOmnibusContext(hr1, 'housing_build', {});
      eq(ctxNone.thisIssue, null, 'provenance: unrelated issue → no thisIssue');
      eq(ctxNone.others.length, 2, 'provenance: unrelated issue → both components are siblings');
      eq(ctxNone.splits, false, 'provenance: no displayed issue → nothing to split');
      // A present/not-voting record has no direction, so nothing splits.
      var hr1Present = { kind: 'vote', position: 'present', issues: hr1.issues };
      eq(_measureOmnibusContext(hr1Present, 'lower_taxes', posMap).splits, false,
        'provenance: no position taken → no split claimed');

      // Counting across a whole issue record: 1 of 2 votes came from a multi-issue bill.
      var singleTax = { kind: 'vote', position: 'yea', issues: [{ issueKey: 'lower_taxes', weight: 100, supportMeaning: 'yea_supports' }] };
      var st = _recordOmnibusStats('lower_taxes', [hr1, singleTax]);
      eq(st.total, 2, 'provenance stats: both records touch the issue');
      eq(st.omnibus, 1, 'provenance stats: one came from a multi-issue bill');
      eq(st.single, 1, 'provenance stats: one was single-issue');
      eq(st.maxCount, 2, 'provenance stats: widest bill touched two issues');
      eq(st.otherLabels.join(','), 'healthcare', 'provenance stats: sibling issues de-duplicated');
      eq(st.any, true, 'provenance stats: any → true');
      // Records that do not touch the issue are ignored entirely.
      var stNone = _recordOmnibusStats('housing_build', [hr1, singleTax]);
      eq(stNone.total, 0, 'provenance stats: unrelated records not counted');
      eq(stNone.any, false, 'provenance stats: nothing to disclose → any false');
      // Provenance NEVER changes a verdict — the summary is identical either way.
      var before = _issueRecordSummary('lower_taxes', 'support', [hr1, singleTax]);
      _recordOmnibusStats('lower_taxes', [hr1, singleTax]);
      var after = _issueRecordSummary('lower_taxes', 'support', [hr1, singleTax]);
      eq(JSON.stringify(after.netVerdict) + after.consistent + after.contradicts,
         JSON.stringify(before.netVerdict) + before.consistent + before.contradicts,
         'provenance: reading provenance leaves the verdict untouched');

      // ── _multiIssueSpread: the always-visible whole-card summary ─────────────
      // hr1 splits: a yea advances lower_taxes (support → consistent) and opposes
      // healthcare (support → contradicts). So the badge summary must say BOTH.
      var sp = _multiIssueSpread(_measureComponentBreakdown(hr1, posMap));
      eq(sp.count, 2, 'spread: counts every component');
      eq(sp.consistent, 1, 'spread: one component matches the stance');
      eq(sp.contradicts, 1, 'spread: one component cuts against it');
      eq(sp.judged, 2, 'spread: judged is match + against');
      eq(sp.tone, 'mixed', 'spread: match AND against → mixed tone');
      eq(sp.splits, true, 'spread: one vote moved two issues opposite ways');
      eq(sp.stanceBased, true, 'spread: stance flavour available');
      eq(sp.detail, '1 match · 1 against', 'spread: verdict flavour reads plainly');
      eq(sp.label, '2 issues · 1 match · 1 against', 'spread: label leads with the issue count');
      // A single-issue record has no spread to show at all.
      eq(_multiIssueSpread(_measureComponentBreakdown(subCon, posMap)), null,
        'spread: single-issue → null (badge stays as it was)');
      // NO stances anywhere → the token must still say something, via EFFECT flavour.
      var spNo = _multiIssueSpread(_measureComponentBreakdown(hr1, {}));
      eq(spNo.judged, 0, 'spread: nothing judged without stances');
      eq(spNo.stanceBased, false, 'spread: falls back off the stance flavour');
      eq(spNo.detail, 'advances 1 · cuts against 1', 'spread: effect flavour when no stance exists');
      eq(spNo.splits, true, 'spread: split is a property of the vote, not of the stances');
      eq(spNo.tone, 'mixed', 'spread: opposite effects → mixed tone even with no stance');
      // No direction at all (present/not voting) → still never an empty token.
      var spPres = _multiIssueSpread(_measureComponentBreakdown(hr1Present, {}));
      eq(spPres.detail, 'no position taken', 'spread: no direction → explicit token, never blank');
      eq(spPres.splits, false, 'spread: no direction cannot split');
      ok(_multiIssueSpread(_measureComponentBreakdown(hr1, posMap)).detail.length > 0 &&
        _multiIssueSpread(_measureComponentBreakdown(hr1, {})).detail.length > 0 &&
        spPres.detail.length > 0, 'spread: detail is never empty on a multi-issue card');

      // ── _recordComposition: how thin is the % and what drives it ─────────────
      // One omnibus vote judged against a stance → the % is 100% off a single vote.
      var recThin = _issueRecordSummary('lower_taxes', 'support', [hr1]);
      var compThin = _recordComposition(recThin, _recordOmnibusStats('lower_taxes', [hr1]));
      eq(compThin.judged, 1, 'composition: denominator is consistent + contradicts');
      eq(compThin.level, 'single', 'composition: one judged vote → single');
      eq(compThin.thin, true, 'composition: one judged vote is a thin read');
      eq(compThin.strength, 1, 'composition: one filled segment of three');
      eq(compThin.omnibusDriven, true, 'composition: the only vote was an omnibus');
      eq(compThin.note, '1 multi-issue vote', 'composition: note names both thinness and composition');
      // Three single-issue votes → solid, nothing to warn about, token stays quiet.
      var singles = [singleTax,
        { kind: 'vote', position: 'yea', issues: [{ issueKey: 'lower_taxes', weight: 90, supportMeaning: 'yea_supports' }] },
        { kind: 'vote', position: 'nay', issues: [{ issueKey: 'lower_taxes', weight: 80, supportMeaning: 'yea_supports' }] }];
      var compSolid = _recordComposition(_issueRecordSummary('lower_taxes', 'support', singles),
        _recordOmnibusStats('lower_taxes', singles));
      eq(compSolid.judged, 3, 'composition: three judged votes');
      eq(compSolid.level, 'solid', 'composition: three judged votes → solid');
      eq(compSolid.thin, false, 'composition: solid read is not thin');
      eq(compSolid.omnibusDriven, false, 'composition: no omnibus in the mix');
      eq(compSolid.note, '', 'composition: nothing to warn about → no visible note');
      // Mixed depth: 2 judged, majority from omnibus bills.
      var two = [hr1, singleTax];
      var compTwo = _recordComposition(_issueRecordSummary('lower_taxes', 'support', two),
        _recordOmnibusStats('lower_taxes', two));
      eq(compTwo.level, 'limited', 'composition: two judged votes → limited');
      eq(compTwo.omnibus + '/' + compTwo.total, '1/2', 'composition: reuses the omnibus tally verbatim');
      eq(compTwo.omnibusDriven, true, 'composition: omnibus >= single counts as driven');
      eq(compTwo.note, '2 votes, multi-issue', 'composition: limited + driven note');
      // No stance → no percentage is rendered → nothing to annotate.
      eq(_recordComposition(_issueRecordSummary('lower_taxes', null, [hr1]), null), null,
        'composition: no stance → null');
      // A record that took no position is counted in total but not in the denominator.
      var recPresent = _issueRecordSummary('lower_taxes', 'support', [singleTax, hr1Present]);
      var compPresent = _recordComposition(recPresent, _recordOmnibusStats('lower_taxes', [singleTax, hr1Present]));
      eq(compPresent.judged, 1, 'composition: present/not-voting is not in the denominator');
      eq(compPresent.unjudged, 1, 'composition: but it is reported as an uncounted record');
      ok(/not counted in it/.test(compPresent.detail), 'composition: detail explains the uncounted record');
      // The detail string is read aloud by screen readers, so each '. '-joined clause
      // has to be a grammatical sentence — singular/plural agreement and sentence case.
      ok(/^1 judged vote sits behind this percentage\./.test(compPresent.detail),
        'composition: singular judged count agrees with its verb');
      ok(/^3 judged votes sit behind this percentage\./.test(compSolid.detail),
        'composition: plural judged count agrees with its verb');
      ok(/came from a multi-issue bill\b/.test(compThin.detail),
        'composition: a lone omnibus vote is described in the singular');
      ok(!/came from a multi-issue bills/.test(compThin.detail),
        'composition: singular article never collides with the plural noun');
      compThin.detail.split('. ').forEach(function (sentence, i) {
        ok(/^[A-Z0-9]/.test(sentence), 'composition: sentence ' + (i + 1) + ' of the detail starts in sentence case');
      });
      // Composition NEVER moves the number it annotates.
      var pctBefore = _issueRecordSummary('lower_taxes', 'support', two);
      _recordComposition(pctBefore, _recordOmnibusStats('lower_taxes', two));
      var pctAfter = _issueRecordSummary('lower_taxes', 'support', two);
      eq(pctAfter.consistent + '/' + pctAfter.contradicts + '/' + pctAfter.netVerdict,
         pctBefore.consistent + '/' + pctBefore.contradicts + '/' + pctBefore.netVerdict,
         'composition: annotating a percentage leaves the percentage untouched');

      return { passed: (failures.length === 0), failed: failures.length, failures: failures };
    }
    window._stanceRecordSelfTest = _stanceRecordSelfTest;

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
      // Hops mirror _resolveStanceList above — id, then ACCT_ALIAS, then a slug of
      // the display name. That third hop is the documented stance-key convention,
      // and without it evidence filed under the name slug never joins a profile
      // opened on its roster id (kwan_s12 and bolinder_h68 rendered an empty
      // Connected Evidence panel for exactly that reason). Additive by
      // construction: the first two branches only fire where a key actually holds
      // ACCT items, which is precisely what the original expression picked, and
      // the final fallback is unchanged — so no key that used to resolve moves.
      var _slHasAcct = function (k) {
        return !!(k && window.ACCT_SPOTLIGHT && Array.isArray(window.ACCT_SPOTLIGHT[k]));
      };
      var _slHasNews = function (k) {
        return !!(k && window.SPOTLIGHT_DATA && Array.isArray(window.SPOTLIGHT_DATA[k]));
      };
      var _slNameKey = (p && p.name) ? _stanceSlug(p.name) : '';
      var _slKey = _slHasAcct(id) ? id
                 : (id && window.ACCT_ALIAS && _slHasAcct(window.ACCT_ALIAS[id])) ? window.ACCT_ALIAS[id]
                 : (_slHasAcct(_slNameKey) || _slHasNews(_slNameKey)) ? _slNameKey
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
  // TWO LANES, MARKED, NEVER MIXED. The board reads documented ISSUE_STANCE_DATA
  // via _polPositionMap AND the formal-pattern index via PDXConsistency, and it
  // keeps them apart on every axis it has: a filled tile is a STATED position, an
  // outlined tile under a 🏛 lane mark is what that person's FORMAL RECORD did,
  // and the two are never averaged, never promoted into one another and never
  // counted in the same tally. Nothing here is fabricated: a person with nothing
  // in either lane still reads "·".
  //
  // WHY THE RECORD LANE IS HERE AT ALL. It used to not be, and the cost was a
  // board that went dark over a full file. A candidate with sixty roll calls on
  // housing and no quote we could source printed a column of "·", and — worse —
  // the whole board was suppressed unless two people had documented positions, so
  // a race between two members with deep voting records and no stance ledger got
  // no comparison surface at all. Missing stance is not missing record. The gate
  // below now asks for two people with a signal in EITHER lane.
  //
  // WHAT THE RECORD TILE MAY SAY. Only what the pattern engine already published
  // for that issue — _recordPatternTier's own plain-language word, via `says` —
  // and only when that word is characterising. A thin or unread record shows the
  // 🏛 mark and its depth and no direction, because the engine declined to read
  // one and this surface does not get a second opinion. No tile ever says "their
  // position is": the row tooltip leads with the engine's own frame, "Record on
  // this issue".
  //
  // Rows are prioritized by what actually decides the race — the visitor's own
  // Alignment Tool issues first, then issues the field openly disagrees on
  // (support AND oppose both present, within the stated lane), then issues whose
  // RECORDS diverge (within the formal lane), then the most widely-held.
  // ── 🏛 THE BOARD'S FORMAL LANE ────────────────────────────────────────────
  // One person's readable formal record, keyed by issueKey, in the shape the grid
  // cell wants. It is a PROJECTION of PDXConsistency's formal-pattern index and
  // nothing more — every direction word below is `pat.says`, the engine's own
  // seven-word plain-language layer, and this function never picks one. It cannot
  // widen the engine's read either: where `says.characterising` is false (a thin
  // record, or one the engine could read no direction from) the tile carries the
  // lane mark and the depth and NO direction, which is the same refusal the
  // profile prints.
  //
  // Fails closed on everything — no index, no rows, a throw — because a board that
  // guesses a lean is worse than a board with a "·" in it.
  var _SIB_REC_LEAD = 'Record on this issue';
  // The index's labels arrive as "🏠 Housing Supply" — one emoji, one space, the
  // name. The board keeps those in two columns, so they come apart here rather
  // than in the row builder. Anything that does not match is left whole.
  function _sibSplitLabel(s) {
    var m = /^(\S{1,2})\s+(\S.*)$/.exec(String(s || '').trim());
    if (m && !/[\w(]/.test(m[1])) return { ico: m[1], text: m[2] };
    return { ico: '', text: String(s || '').trim() };
  }
  var _SIB_REC_TONE = {
    support: { cls: 'is-support', ico: '✓' },
    oppose:  { cls: 'is-oppose',  ico: '✗' },
    mixed:   { cls: 'is-mixed',   ico: '~' }
  };
  function _sibFormalMap(pid) {
    var out = {};
    try {
      var C = window.PDXConsistency;
      if (!C || !C.formalPatternIndex || typeof C.formalPatternIndex.rows !== 'function') return out;
      (C.formalPatternIndex.rows(pid) || []).forEach(function(x) {
        if (!x || !x.key) return;
        var says = (x.pat && x.pat.says) || null;
        var m = (says && says.characterising) ? _SIB_REC_TONE[says.tone] : null;
        var noun = x.noun || { one: 'item', many: 'items' };
        var held = x.held || 0;
        var depth = held + ' ' + (held === 1 ? noun.one : noun.many) + ' on file';
        // `dir` is the DIRECTION word and `issueLabel` is the name of the issue.
        // They are separate fields because they are separate facts, and a row
        // that took the direction word for its heading would print a board of
        // four issues all called "Supports".
        var lb = _sibSplitLabel(x.label || '');
        var base = { issueLabel: lb.text, issueIco: lb.ico, counts: x.counts || depth, held: held };
        out[x.key] = m
          ? { tone: says.tone, cls: m.cls, ico: m.ico, lane: true,
              dir: says.label, issueLabel: base.issueLabel, issueIco: base.issueIco,
              counts: base.counts, held: held }
          : { tone: 'muted', cls: 'is-onfile', ico: '🏛', lane: false,
              // THE LAST-RESORT WORD IS AN ADMISSION, NOT A FINDING. The index
              // hands every unread row a specific reason label (`patLabel`), so
              // this fallback fires only if a row arrives with neither a says
              // word nor a reason — and in that state the true thing to say is
              // that we have not read it, not that their record has no pattern.
              dir: (says && says.label) || x.patLabel || 'Pattern not read yet',
              issueLabel: base.issueLabel, issueIco: base.issueIco,
              counts: depth, held: held };
      });
    } catch (e) {}
    return out;
  }
  window._pdxSeatFormalMap = _sibFormalMap;

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
      var rec = _sibFormalMap(pid);
      people.push({ pid: pid, d: d, map: map, rec: rec,
        n: Object.keys(map).length, rn: Object.keys(rec).length });
    });
    if (people.length < 2) return '';
    // A genuine comparison needs a readable signal from at least two people —
    // otherwise the grid would be one filled column beside a wall of "·". It does
    // NOT need two stance ledgers: two formal records compare perfectly well, and
    // refusing to draw the board over a missing quote was the bug.
    if (people.filter(function(p) { return p.n > 0 || p.rn > 0; }).length < 2) return '';

    var hasAlign = (typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0);

    // Aggregate every documented issue across the field, keyed by canonical
    // issueKey so the same topic from different people lands on one shared row.
    var issues = {};
    function slot(k) {
      if (!issues[k]) issues[k] = { key: k, topics: [], icon: '', byPid: {}, txt: {}, recByPid: {}, recLbl: '' };
      return issues[k];
    }
    people.forEach(function(p) {
      Object.keys(p.map).forEach(function(k) {
        var e = p.map[k] || {};
        var st = String(e.stance || 'mixed').toLowerCase();
        if (st !== 'support' && st !== 'oppose') st = 'mixed';
        var it = slot(k);
        it.byPid[p.pid] = st;
        it.txt[p.pid] = e.text || '';
        if (e.topic) it.topics.push(String(e.topic).trim());
        if (!it.icon && e.icon) it.icon = e.icon;
      });
      // The formal lane lands in its OWN map on the same row. Same issueKey, same
      // column, separate storage — so a stance and a record on one cell can never
      // be read as one signal, and the tallies below can each stay inside a lane.
      Object.keys(p.rec).forEach(function(k) {
        var it = slot(k);
        it.recByPid[p.pid] = p.rec[k];
        if (!it.recLbl && p.rec[k].issueLabel) it.recLbl = p.rec[k].issueLabel;
        if (!it.icon && p.rec[k].issueIco) it.icon = p.rec[k].issueIco;
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
      // THE SAME TWO READS, TAKEN AGAIN INSIDE THE FORMAL LANE. Deliberately a
      // second pair of counters rather than a wider one: a stated "support"
      // against a record that mostly opposed is a said-vs-did finding, it is
      // Direction Match's to make on a profile, and it is not a disagreement
      // between two candidates. Nothing crosses.
      var tones = Object.keys(it.recByPid)
        .map(function(pid) { return it.recByPid[pid].tone; })
        .filter(function(t) { return t === 'support' || t === 'oppose' || t === 'mixed'; });
      var rdist = {};
      tones.forEach(function(t) { rdist[t] = 1; });
      it.rcov = Object.keys(it.recByPid).length;
      it.recContested = tones.length >= 2 && rdist.support && rdist.oppose;
      it.recDivergent = tones.length >= 2 && Object.keys(rdist).length > 1;
      it.mine = !!(hasAlign && _alignIssues.has(k));
      // Representative label: the shortest topic phrasing seen for this issue
      // (keeps the row compact); then the pattern index's own label for a row
      // that only the formal lane put here; then a de-slugged key.
      it.label = it.topics.slice().sort(function(a, b) { return a.length - b.length; })[0] ||
        it.recLbl ||
        k.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
      if (!it.icon) it.icon = '📌';
      return it;
    });

    // Most decision-relevant first: your issues → openly contested → any
    // divergence → widest coverage → stable alphabetical. The formal lane's two
    // reads sit directly under the stated lane's, in the same order, so a row
    // that only the record put on the board still competes for the four slots —
    // it just never outranks an equally-interesting stated one.
    arr.sort(function(a, b) {
      return (b.mine - a.mine) || (b.contested - a.contested) || (b.divergent - a.divergent) ||
        (b.recContested - a.recContested) || (b.recDivergent - a.recDivergent) ||
        (b.cov - a.cov) || (b.rcov - a.rcov) || a.label.localeCompare(b.label);
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
    var anyRec = false;
    var bodyRows = rows.map(function(it) {
      var cells = people.map(function(p) {
        var st = it.byPid[p.pid];
        var who = p.d.name ? String(p.d.name).split(/\s+/)[0] : 'They';
        if (!st) {
          // NO STATED POSITION IS NOT AN EMPTY CELL WHEN THERE IS A FILE. The
          // record tile is outlined rather than filled and wears the 🏛 lane mark,
          // and it prints the pattern engine's own word — or, where the engine
          // declined to characterise, the depth alone and no direction.
          var rc = it.recByPid[p.pid];
          if (!rc) return '<td class="pdx-sib-cell is-none" title="Nothing on file for ' + esc(who) + ' on this issue — no documented position and no formal record">·</td>';
          anyRec = true;
          var rtip = who + ' — ' + _SIB_REC_LEAD + ' ' + it.label + ': ' + rc.dir +
            (rc.counts ? ' (' + rc.counts + ')' : '') +
            ' · no stated position on file, so this is the record, not a stance.';
          return '<td class="pdx-sib-cell is-rec ' + rc.cls + '" title="' + esc(rtip) + '" aria-label="' + esc(rtip) + '">' +
            '<span class="pdx-sib-ico">' + rc.ico + '</span>' +
            (rc.lane ? '<span class="pdx-sib-lane" aria-hidden="true">🏛</span>' : '') + '</td>';
        }
        var m = DIR[st] || DIR.mixed;
        var tip = who + ' — ' + m.verb + ' ' + it.label + (it.txt[p.pid] ? ': ' + it.txt[p.pid] : '');
        // Consistency dot placeholder — hydrated from /api/voting-record/compare so
        // a stated stance can be checked against how they actually voted. Blank
        // (and invisible) until/unless a record on this issue exists.
        return '<td class="pdx-sib-cell ' + m.cls + '" title="' + esc(tip) + '"><span class="pdx-sib-ico">' + m.ico + '</span>' +
          '<span class="pdx-sib-vdot" data-vrdot="' + esc(p.pid) + '|' + esc(it.key) + '"></span></td>';
      }).join('');
      var rowCls = 'pdx-sib-row' + (it.mine ? ' is-mine' : (it.contested ? ' is-contested' : (it.recContested ? ' is-reccontested' : '')));
      var flag = it.mine
        ? '<span class="pdx-sib-flag is-mine" title="One of your Alignment Tool issues">🎯 yours</span>'
        : (it.contested
            ? '<span class="pdx-sib-flag" title="The field openly disagrees here">⚡ split</span>'
            : (it.recContested
                ? '<span class="pdx-sib-flag is-rec" title="Their formal records ran opposite ways here — this is the record, not a stated disagreement">🏛 records differ</span>'
                : ''));
      return '<tr class="' + rowCls + '">' +
          '<th class="pdx-sib-issue" scope="row">' +
            '<span class="pdx-sib-issue-ico" aria-hidden="true">' + (it.icon || '📌') + '</span>' +
            '<span class="pdx-sib-issue-lbl">' + esc(it.label) + '</span>' + flag +
          '</th>' + cells +
        '</tr>';
    }).join('');

    var anyStated = rows.some(function(it) { return Object.keys(it.byPid).length > 0; });
    // The heading has to be true of what is under it. "Where they stand" over a
    // board of nothing but record tiles would be the exact claim the lane marks
    // exist to prevent, so a record-only board says what it actually shows.
    var title = anyStated ? 'Where they stand' : 'What their records did';
    var sub = moreIssues > 0
      ? rows.length + ' of ' + arr.length + ' issues · most distinctive first'
      : rows.length + ' issue' + (rows.length === 1 ? '' : 's') + ' across this race';

    // Hydrate the consistency dots once this board is in the DOM (macrotask).
    if (typeof window._pdxHydrateVoteDots === 'function') {
      setTimeout(function () { try { window._pdxHydrateVoteDots(); } catch (e) {} }, 0);
    }

    return '<div class="pdx-seat-board" onclick="event.stopPropagation();">' +
        '<div class="pdx-seat-board-head">' +
          '<span class="pdx-seat-board-ico" aria-hidden="true">📊</span>' +
          '<span class="pdx-seat-board-title">' + esc(title) + '</span>' +
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
          '<span class="pdx-sib-lg is-none">· Nothing on file yet</span>' +
          (anyRec ? '<span class="pdx-sib-lg is-rec"><span class="pdx-sib-lg-rec" aria-hidden="true">🏛</span> outlined = formal record, no stated position</span>' : '') +
          '<span class="pdx-sib-lg pdx-sib-lg-vdot">✓/⚠ vote matches / contradicts stance</span>' +
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

    var polMap = _polPositionMapMemo(id, p);
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
          '<p class="cmp-limited-text">This is expected for a new or 2026 candidate — ' + first + ' doesn\'t have a documented position on your specific issues <em>yet</em>. As statements and votes are verified, each one is matched here automatically. In the meantime, <strong>⚖️ Word vs Action</strong> above indexes every position ' + first + ' <em>has</em> stated — including the ones no formal action can test yet — so you can still get a read.</p>' +
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
      if (!s || !s.issueKey) return '';
      if (typeof window._issueEvidenceMap !== 'function') return '';
      var map = window._issueEvidenceMap(id, p) || {};
      // The chip is a link to filed evidence, so require filed evidence — the
      // bucket exists as soon as a position does, which is not the same thing.
      var _b = map[s.issueKey];
      if (!_b) return '';
      if (!((_b.spotlight && _b.spotlight.length) || (_b.promises && _b.promises.length))) return '';
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
    // The curated issue list is stored as `issues` on roster records and
    // `keyIssues` on Firestore/admin ones — read both, or this fallback is dead
    // for the entire static roster.
    var curatedN = (typeof window._pdxKeyIssues === 'function')
      ? window._pdxKeyIssues(p).length
      : ((Array.isArray(p.issues) && p.issues.length) ? p.issues.length
          : (Array.isArray(p.keyIssues) ? p.keyIssues.length : 0));
    var tracked = documented.length || curatedN || Object.keys(issueSet).length;
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
    // HOW MANY ISSUES THE FORMAL RECORD TOUCHED. Everything above this line counts
    // CURATED material — documented cards, connected evidence, receipt depth — and
    // that is the whole reason a CTA promising "the complete picture" said "7 issues
    // tracked" over a senator with sixty-four issues of roll-call votes on file. The
    // destination now lists both; the button has to be able to say so. Read from the
    // consistency engine's own index (memoised row model, no new work, no network),
    // and guarded so a surface that loads before it simply keeps the old wording.
    var formal = 0;
    try {
      var FPI = window.PDXConsistency && window.PDXConsistency.formalPatternIndex;
      if (FPI && typeof FPI.count === 'function') formal = FPI.count(id) || 0;
    } catch (e) { formal = 0; }
    // ── AND HOW MANY ACTS THOSE ISSUES ARE MADE OF ──────────────────────────
    // `formal` counts ISSUE ROWS. That is the right number for a label, and the
    // wrong number for the question "do we hold a formal record for this person
    // at all" — which is the question the CTA above it answers with the words
    // "still being built". A file whose own letterhead read "11 issues · 23 acts
    // · 3 characterized" printed that phrase mid-page, because the CTA renders
    // before the roll-call cache warms and the letterhead repaints after it, so
    // the two surfaces were reading the same record at two different times and
    // only one of them was honest about it. Three reads, cheapest first, none of
    // them new work and none of them network:
    //
    //   · the index's own SHAPE (memoised beside the count it already asked for)
    //     — acts, not issues;
    //   · the EDGE'S FIRST-BYTE BRIEF, via PDXPerson.crawlRecord. On a cold
    //     arrival this is the only place the formal record exists yet, and it is
    //     the very surface the reader can see while the CTA is claiming there is
    //     nothing to see. Identity-guarded and six-row capped at its source;
    //   · whether the roll-call lane has ANSWERED for this person yet, so
    //     "we hold nothing" can be told apart from "we have not looked".
    //
    // Nothing here is a tier, a score, a floor or a characterisation: it is a
    // count of acts and a boolean about load state.
    var formalActs = 0, formalRead = false;
    try {
      var FPI2 = window.PDXConsistency && window.PDXConsistency.formalPatternIndex;
      if (FPI2 && typeof FPI2.shape === 'function') {
        var shp = FPI2.shape(id);
        if (shp) {
          formalActs = shp.judged || 0;
          if (!formal) formal = shp.issues || 0;
        }
      }
    } catch (e) { formalActs = 0; }
    try {
      var PF = window.PDXPerson;
      if (!formalActs && PF && typeof PF.crawlRecord === 'function') {
        formalActs = (PF.crawlRecord(id) || []).length;
      }
    } catch (e) {}
    try {
      var VR = window.PDXVotingRecord;
      formalRead = !!(VR && typeof VR.memberRecords === 'function' && VR.memberRecords(id));
    } catch (e) { formalRead = false; }
    return {
      tracked: tracked, withEvidence: withEv, gaps: gaps, formal: formal,
      formalActs: formalActs, formalRead: formalRead
    };
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
      // The label names the LONGER of the two lists the overlay holds, because that
      // is the one a reader clicking "see all" is asking for. Where the formal
      // record is the longer one it is named as the formal record — "all 64 issues"
      // beside seven stance cards would read as a promise of 64 written positions.
      var label = (s.formal > s.tracked)
        ? ('See all ' + s.formal + ' issues on the record')
        : (s.tracked
          ? ('See all ' + s.tracked + ' issues + gaps')
          : 'See every issue + gaps');
      return '<button type="button" class="pdx-fsr-mini" ' +
        'onclick="event.stopPropagation();window._pdxOpenStanceRecord&&window._pdxOpenStanceRecord(\'' + jsId + '\');" ' +
        'aria-label="Open the full record on the issues — every issue the formal record touched, the documented positions beside it, and what is still missing">' +
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

  // ── "Connect the dots" cross-links for a stance ────────────────────────────
  // A documented Key Issue Stance is keyed by an issueKey — the same shared
  // vocabulary the topic view, the Issue Spotlights and the People's Mandate all
  // speak. This row surfaces those connections right on the stance card so the
  // stated position is never a dead end: from one card a visitor can jump to
  // where every politician stands on the issue, read the sourced Spotlight, and
  // see the citizen-backed reform tied to it. Each link is offered only when it
  // genuinely exists, so the row stays empty (returns '') rather than promising
  // a destination that isn't there.

  // Drop the leading emoji from a Core National Issue label ("🔫 Gun Rights &
  // Gun Control" → "Gun Rights & Gun Control") for inline use inside a chip.
  function _pdxConnectLabel(label) {
    label = String(label || '').trim();
    var sp = label.indexOf(' ');
    if (sp > 0 && /[^\x00-\x7F]/.test(label.slice(0, sp))) return label.slice(sp + 1).trim();
    return label;
  }
  function _pdxConnectTrim(s, n) {
    s = String(s == null ? '' : s).trim();
    return s.length > n ? s.slice(0, n - 1).replace(/\s+$/, '') + '…' : s;
  }
  // The single most relevant Issue Spotlight for a stance: one tied to this
  // issueKey, preferring a Spotlight that also features THIS politician so the
  // link lands on a page where their name actually appears. Null when none.
  function _pdxSpotlightForStance(id, issueKey) {
    try {
      if (!issueKey || !window.PDXSpotlight || typeof window.PDXSpotlight.forIssueKey !== 'function') return null;
      var byIssue = window.PDXSpotlight.forIssueKey(issueKey) || [];
      if (!byIssue.length) return null;
      var mine = Object.create(null);
      try {
        if (typeof window.PDXSpotlight.forPolitician === 'function') {
          (window.PDXSpotlight.forPolitician(id) || []).forEach(function (sp) { if (sp && sp.slug) mine[sp.slug] = 1; });
        }
      } catch (e) {}
      var featured = byIssue.filter(function (sp) { return sp && sp.slug && mine[sp.slug]; });
      return featured[0] || byIssue[0] || null;
    } catch (e) { return null; }
  }

  window._pdxStanceConnectRow = function (id, p, s) {
    try {
      if (!s || !s.issueKey) return '';
      var key = s.issueKey;
      var jsKey = String(key).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      var chips = [];

      // 1) Topic → the issue-first ranked view ("who actually backs this up?"),
      //    but only when the issue maps to a curated Core National Issue. Without
      //    that guard PDXIssueView.open() would silently fall back to an
      //    unrelated issue, so we simply omit the link instead.
      var core = (typeof window.coreIssueForKey === 'function') ? window.coreIssueForKey(key) : null;
      if (core && window.PDXIssueView && typeof window.PDXIssueView.open === 'function') {
        var coreTxt = _pdxConnectLabel(core.label);
        var openIV = "event.stopPropagation();event.preventDefault();window.PDXIssueView&&window.PDXIssueView.open('" + jsKey + "');";
        chips.push('<span class="pdx-connect-chip is-topic" role="link" tabindex="0" ' +
          'title="' + _pdxMandateEsc('See where every tracked politician stands on ' + coreTxt) + '" ' +
          'aria-label="' + _pdxMandateEsc('Where everyone stands on ' + coreTxt) + '" ' +
          'onclick="' + openIV + '" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){' + openIV + '}">' +
          '<span class="pdx-connect-chip-ico" aria-hidden="true">🧭</span>' +
          '<span class="pdx-connect-chip-txt">Where all stand: ' + _pdxMandateEsc(_pdxConnectTrim(coreTxt, 30)) + '</span></span>');
      }

      // 2) Issue Spotlight → a neutral, sourced deep-dive on this issue, opened as
      //    the shareable /issue/<slug> page.
      var sp = _pdxSpotlightForStance(id, key);
      if (sp && sp.slug && window.PDXSpotlight && typeof window.PDXSpotlight.open === 'function') {
        var jsSlug = String(sp.slug).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        var openSP = "event.stopPropagation();event.preventDefault();window.PDXSpotlight&&window.PDXSpotlight.open('" + jsSlug + "');";
        chips.push('<span class="pdx-connect-chip is-spotlight" role="link" tabindex="0" ' +
          'title="' + _pdxMandateEsc('Open the Issue Spotlight: ' + (sp.title || '')) + '" ' +
          'aria-label="' + _pdxMandateEsc('Issue Spotlight: ' + (sp.title || '')) + '" ' +
          'onclick="' + openSP + '" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){' + openSP + '}">' +
          '<span class="pdx-connect-chip-ico" aria-hidden="true">📌</span>' +
          '<span class="pdx-connect-chip-txt">Spotlight: ' + _pdxMandateEsc(_pdxConnectTrim(sp.title || 'Issue Spotlight', 34)) + '</span></span>');
      }

      // 3) People's Mandate → the citizen-backed reform(s) tied to this issue.
      //    Reuses the existing chip, which already returns '' when nothing maps.
      var mandate = (typeof window._pdxMandateChip === 'function') ? window._pdxMandateChip(key, { compact: true }) : '';
      if (mandate) chips.push(mandate);

      if (!chips.length) return '';
      return '<div class="pdx-stance-connect">' + chips.join('') + '</div>';
    } catch (e) { return ''; }
  };

})();
