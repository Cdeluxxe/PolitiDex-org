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

      var netVerdict;
      if (!stance) netVerdict = 'no_stance';
      else if (total === 0) netVerdict = 'no_record';
      else if (stance === 'mixed') netVerdict = 'mixed';
      else if (consistentScore === 0 && contradictScore === 0) netVerdict = (counts.mixed > 0 ? 'mixed' : 'no_position');
      else if (contradictScore > consistentScore) netVerdict = 'contradicts';
      else if (consistentScore > contradictScore) netVerdict = 'consistent';
      else netVerdict = 'mixed'; // genuine tie, both sides non-zero

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
        labels: brk.components.map(function (c) { return c.label; }),
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
    function _recordComposition(rec, stats) {
      if (!rec) return null;
      var judged = (rec.consistent || 0) + (rec.contradicts || 0);
      if (!judged) return null; // no % is displayed → nothing to annotate
      var total = Math.max(rec.total || 0, judged);
      var unjudged = Math.max(0, total - judged);
      var omnibus = stats ? (stats.omnibus || 0) : 0;
      var single = stats ? (stats.single || 0) : 0;
      var maxCount = stats ? (stats.maxCount || 0) : 0;
      var level = judged >= 3 ? 'solid' : judged === 2 ? 'limited' : 'single';
      var omnibusDriven = omnibus > 0 && omnibus >= single;
      var note = '';
      if (level === 'single') note = omnibus >= 1 ? '1 multi-issue vote' : '1 vote';
      else if (level === 'limited') note = omnibusDriven ? '2 votes, multi-issue' : '2 votes';
      else if (omnibusDriven) note = 'mostly multi-issue';
      // Each bit is joined with '. ' below, so each one has to read as its own sentence.
      var bits = [judged + (judged === 1 ? ' judged vote sits' : ' judged votes sit') + ' behind this percentage'];
      if (unjudged) {
        bits.push(unjudged + ' further record' + (unjudged === 1 ? '' : 's') + ' on this issue took no position either way, so ' +
          (unjudged === 1 ? 'it is' : 'they are') + ' not counted in it');
      }
      if (omnibus) {
        bits.push(omnibus + ' of ' + total + ' came from ' + (omnibus === 1 ? 'a multi-issue bill' : 'multi-issue bills') +
          (maxCount >= 2 ? ' (' + (omnibus === 1 ? 'it covered ' : 'one of them covered ') + maxCount + ' issues at once)' : ''));
      }
      if (level !== 'solid') bits.push('A read this thin can swing a long way on one more vote');
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
        // Consistency dot placeholder — hydrated from /api/voting-record/compare so
        // a stated stance can be checked against how they actually voted. Blank
        // (and invisible) until/unless a record on this issue exists.
        return '<td class="pdx-sib-cell ' + m.cls + '" title="' + esc(tip) + '"><span class="pdx-sib-ico">' + m.ico + '</span>' +
          '<span class="pdx-sib-vdot" data-vrdot="' + esc(p.pid) + '|' + esc(it.key) + '"></span></td>';
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

    // Hydrate the consistency dots once this board is in the DOM (macrotask).
    if (typeof window._pdxHydrateVoteDots === 'function') {
      setTimeout(function () { try { window._pdxHydrateVoteDots(); } catch (e) {} }, 0);
    }

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
