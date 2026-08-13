/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Word vs Action  ·  window.PDXWordAction
   ────────────────────────────────────────────────────────────────────────────
   THE CORE ACCOUNTABILITY STANDARD.

   One question, asked the same way on every profile:

       Do they stand by what they said?

   For years this app answered a narrower question — "did they keep their formal
   campaign promises?" — and gave that answer the loudest surface on the profile.
   That was the wrong denominator. A politician's documented WORD is not only the
   handful of sentences phrased as a pledge. It is also the position they state in
   an interview, the stance on their platform, and the issue they brand themselves
   with over and over. All of it is their word, and all of it can be checked
   against the same thing: the formal record of what they actually did.

   So this module holds ONE pool with THREE TIERS OF WORD, tested by ONE kind of
   evidence:

     WORD (what they said) ─────────────────────────────────────────────────────
       🤝 pledge    weight 3   an explicit commitment — "I will", "I pledge",
                               or a tracked promise in the ledger. Highest
                               confidence: they told you what they were going to
                               do, in their own words, on the record.
       🧭 position  weight 2   an operational stance they have stated and sourced.
                               Not phrased as a promise, but unambiguous about
                               where they stand.
       📣 branding  weight 1   a signature issue they campaign on, repeated and
                               issue-linked. Lower weight, deliberately non-zero:
                               running on an issue is a claim about yourself.

     ACTION (what they did) ────────────────────────────────────────────────────
       Roll-call votes, sponsorships and formal acts — the Official Record, via
       PDXConsistency.officialRecord(). Nothing from the broader public record
       (interviews, news, social posts) is ever an ACTION in this percentage:
       blending the two would make the test unfalsifiable. The public record is
       reachable only on an issue row that no formal action could test at all —
       see the outcomes block below — and it never enters this arithmetic.

   Hard pledges are TOP TIER INSIDE THIS SYSTEM, not a separate product lane. The
   Promise Follow-Through percentage that used to rate them separately has been
   RETIRED — no surface publishes it. What remains of that lane is its evidence:
   individual pledges with kept / broken / pending verdicts and their counts, which
   feed this read as the pledge tier. See _renderFollowThrough in profiles-full.js
   for the receipts-only presentation.

   THE FIVE RULES THIS FILE WILL NOT BREAK
   ─────────────────────────────────────────────────────────────────────────────
   1. IT NEVER INVENTS WORD. Every item traces to a curated stance, a tracked
      pledge, or a curated signature issue. An issue with votes but no documented
      word produces no item — silence is not a position.
   2. IT NEVER FORCES A CONTRADICTION. An item counts as "went against it" only
      when the Official Record's own verdict for that issue says contradicts.
      This module classifies nothing on its own.
   3. A POSITION IS NEVER ITS OWN TEST. Most curated stance cards are written FROM
      the record ("Voted no on H.R. 8", cited to the House Clerk). Scoring those
      against the same roll call would return 100% for everyone, forever. They are
      kept as positions and excluded from the number — see isIndependentWord().
   4. IT FAILS CLOSED. Below MIN_TESTED_ITEMS tested items or MIN_TESTED_WEIGHT
      total weight there is no percentage — an honest "not enough tested word yet",
      never a 0% or a 100% resting on one vote.
   5. IT DOUBLE-COUNTS NOTHING. At most one SCORED word item per issue; branding is
      dropped on any issue a scored item already holds; a stance promoted to the
      pledge tier still occupies exactly one slot on its issue.

   Reads (all optional / guarded — load order never matters):
     window.PDXConsistency.officialRecord(pid, issueKey)   → the ACTION test
     window.PDXConsistency.VERDICTS / .proof.proofText     → shared vocabulary
     window._resolveStanceList(pid, p)                     → documented positions
     window._pdxRecordIssueItems(pid, issueKey)            → the named votes
     window.ISSUE_MAP                                      → the 110-key issue vocabulary
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXWordAction) return; // idempotent

  // ── The tier ladder ────────────────────────────────────────────────────────
  // `counts` is the weight expressed in words. A reader should not have to know
  // that pledge is 3 and branding is 1 to understand that one outranks the other,
  // and the exact multipliers are still disclosed in the method line — so the
  // display is readable and the arithmetic is auditable.
  var TIERS = {
    pledge:   { key: 'pledge',   ico: '🤝', label: 'Pledge',   weight: 3, counts: 'Counts most',
                gloss: 'They said they would do it — an explicit commitment in their own words.' },
    position: { key: 'position', ico: '🧭', label: 'Position', weight: 2, counts: 'Counts more',
                gloss: 'A stated, sourced position on where they stand.' },
    branding: { key: 'branding', ico: '📣', label: 'Branding', weight: 1, counts: 'Counts least',
                gloss: 'An issue they campaign on — repeated and issue-linked, so it is a claim about themselves.' }
  };
  var TIER_ORDER = ['pledge', 'position', 'branding'];

  var FRAME = {
    icon: '⚖️',
    label: 'Word vs Action',
    question: 'Do they stand by what they said?',
    // WHAT THE NUMBER IS CALLED, AND WHAT IT IS NOT ────────────────────────────
    // The caption under the numeral used to read "Stood by their word". Read fast,
    // beside a large green percentage, that is a report card: a reader takes it as
    // "most of what they did was good", and nothing on the card contradicts them.
    // What the arithmetic actually measures is narrower and stranger than that —
    // whether their formal actions pointed the SAME DIRECTION as the positions they
    // stated. An action can point the right way and be struck down a week later; a
    // policy can match its promise exactly and be a disaster. Both of those score
    // the same here, and they should, because direction is the only thing a
    // stated position can be checked against.
    //   So the metric is named for what it is, and the two lines under it exist to
    // close the gap a percentage always opens: what it means, and what it does not
    // claim. `notClaim` is not a disclaimer bolted on for safety — it is the
    // shortest way to stop a high number being read as three other findings the
    // app never made.
    metric: 'Direction match',
    means: 'How often their formal record pointed the same way as the positions they stated.',
    notClaim: 'It is not an approval rating, not an outcome score, and not a measure of whether any of it worked or held up.',
    // The hero ring has room for two short lines and no more, and this caption is
    // the only text a reader gets beside the percentage. It used to read "Kept
    // word" — plain English, but a SECOND NAME for the one number, printed in the
    // header while "Word vs Action" named the same number in the rail and in the
    // section title. One read cannot have two names without reading as two reads,
    // so the caption now says what the score is called everywhere else.
    caption: 'Word vs Action'
  };

  // ── The fail-closed floors ─────────────────────────────────────────────────
  // A percentage needs both a count floor and a weight floor. The count floor
  // stops one resolved item from becoming a whole-profile verdict; the weight
  // floor stops three branding items — the lowest-confidence tier — from doing
  // the same. Both are exposed so the explainer copy and the tests read the real
  // numbers instead of restating them.
  var MIN_TESTED_ITEMS = 3;
  var MIN_TESTED_WEIGHT = 4;
  // How much extra an issue earns for having a deep record behind it. Capped so
  // one heavily-voted issue cannot swamp a profile, and floored at 1 so a scored
  // issue is never silently weightless.
  var EVIDENCE_CAP = 3;

  // Explicit-commitment phrasing, in the FIRST PERSON only. Matching this promotes
  // a sourced stance from `position` to `pledge` — it raises the weight of word that
  // already exists and never creates a new item, so a false positive costs a little
  // over-weighting and never a fabricated claim. Third-person description ("he is
  // committed to…") is deliberately excluded: that is a reporter's word, not theirs.
  var PLEDGE_RE = new RegExp(
    '(?:^|[\\s"“‘(\\u2014-])(?:' +
      "i will\\b|i'll\\b|i’ll\\b|" +
      "we will\\b|we'll\\b|we’ll\\b|" +
      'i pledge\\b|i promise\\b|i vow\\b|' +
      'i commit to\\b|i am committed to\\b|' +
      "i'm committed to\\b|i’m committed to\\b|" +
      'if elected\\b|on day one\\b|' +
      'i will never\\b|i would never\\b' +
    ')', 'i');

  function esc(s) {
    if (typeof window._slEsc === 'function') return window._slEsc(String(s == null ? '' : s));
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function C() { return window.PDXConsistency || null; }
  // The id-safe half of a per-issue DOM id. Kept next to esc() because both ends of
  // a cross-section jump have to sanitise identically or the link points at nothing.
  function _idPart(v) { return String(v == null ? '' : v).replace(/[^A-Za-z0-9_-]/g, ''); }
  // The shared Mixed rule, borrowed rather than restated. Same function the issue
  // rows use, so the pooled read at the top of a profile and the per-issue rows
  // under it apply one definition of "split" — including its floor of two
  // separately judged directional items, which `judgedItems` carries.
  function _mixedGate(consistentScore, contradictScore, judgedItems) {
    var cs = C();
    if (cs && typeof cs.mixedGate === 'function') return cs.mixedGate(consistentScore, contradictScore, judgedItems);
    if (typeof window._pdxMixedGate === 'function') return window._pdxMixedGate(consistentScore, contradictScore, judgedItems);
    return contradictScore > consistentScore ? 'contradicts'
         : consistentScore > contradictScore ? 'consistent' : 'no_position';
  }
  function issueLabel(key) {
    try {
      var im = window.ISSUE_MAP || {};
      var e = im[key];
      if (e && e.label) return String(e.label).replace(/^[^\w]+\s*/, '');
    } catch (e) {}
    return String(key || '').replace(/_/g, ' ');
  }

  // ── Soft branding → issue key ──────────────────────────────────────────────
  // A signature issue is only WORD WE CAN TEST if we can say which issue it is.
  // The roster stores branding as a human label ("Anti-Surveillance", "Audit the
  // Fed"), so it is matched against ISSUE_MAP's keyword lists — the same 110-key
  // vocabulary the action side is keyed by.
  //
  // Three rules, each one closing a way this could put a position in someone's
  // mouth (all three were caught by real roster labels, not hypotheticals):
  //   • WHOLE WORDS ONLY. Substring matching sent "Constitutional Originalism" to
  //     tariffs_authority, because that issue lists the keyword "constitution".
  //   • LONGEST KEYWORD WINS. "Audit the Fed" matches the generic "audit" on four
  //     issues and the specific "audit the fed" on one. The specific one is meant.
  //   • A REMAINING TIE MUST BE THE SAME ISSUE IN THE SAME DIRECTION. "Second
  //     Amendment" ties gun_rights (lean R) and gun_balance (no lean) — two
  //     different readings of the same words — so it resolves to nothing. Picking
  //     one would decide for them which they meant, and the opposite-lean version
  //     of an issue inverts every consistency verdict downstream.
  // Unresolved labels are reported as not-yet-issue-linked and left out of the
  // number. Nothing about that costs anyone a percentage point.
  //
  // ── On the cost of asking ──────────────────────────────────────────────────
  // The answer is a pure function of (label, ISSUE_MAP), and ISSUE_MAP is a fixed
  // 110-issue / 1265-keyword vocabulary. This used to compile one RegExp per
  // keyword per call — 1265 constructions to resolve a single label — while the
  // roster render asks once per signature issue per person. Across a 756-person
  // homepage that is millions of RegExp compiles inside one task, which is what
  // hung the page. So the vocabulary is compiled once and the answers are
  // memoized. Both caches key on the ISSUE_MAP OBJECT, not a flag: the map is
  // published by a separate script, so a later or swapped vocabulary must rebuild
  // rather than answer from a stale index.
  var _bimSrc = null;    // the ISSUE_MAP these caches were built from
  var _bimRows = null;   // [{key, kw, re}] sorted longest keyword first
  var _bimMemo = null;   // normalized label → resolved key (or null)

  function brandingIndex(im) {
    if (_bimSrc === im && _bimRows) return _bimRows;
    var rows = [];
    Object.keys(im).forEach(function (k) {
      var kws = (im[k] && im[k].keywords) || [];
      for (var i = 0; i < kws.length; i++) {
        var kw = String(kws[i] == null ? '' : kws[i]).toLowerCase();
        // Short keywords ('tax', 'debt', 'audit') identify a topic, not an issue.
        if (kw.length < 5) continue;
        rows.push({
          key: k, kw: kw,
          re: new RegExp('(?:^|[^a-z0-9])' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:[^a-z0-9]|$)')
        });
      }
    });
    // Longest first, so LONGEST KEYWORD WINS falls out of the scan order and the
    // loop can stop the moment a shorter keyword could no longer tie the best.
    rows.sort(function (a, b) { return b.kw.length - a.kw.length; });
    _bimSrc = im; _bimRows = rows; _bimMemo = {};
    return rows;
  }

  function brandingIssueKey(label) {
    var norm = String(label == null ? '' : label).toLowerCase().trim();
    if (norm.length < 4) return null;
    var im = null;
    try { im = window.ISSUE_MAP || null; } catch (e) { im = null; }
    if (!im) return null;
    var rows = brandingIndex(im);
    if (Object.prototype.hasOwnProperty.call(_bimMemo, norm)) return _bimMemo[norm];
    var hits = {}, best = 0;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      // Sorted longest-first, so once something has matched, every remaining row
      // is too short to tie it. Same answer as testing them all, minus the work.
      if (best && r.kw.length < best) break;
      if (norm === r.kw || r.re.test(norm)) { best = r.kw.length; hits[r.key] = 1; }
    }
    var out = resolveBrandingHits(im, hits);
    _bimMemo[norm] = out;
    return out;
  }

  function resolveBrandingHits(im, hits) {
    var keys = Object.keys(hits);
    if (!keys.length) return null;
    if (keys.length === 1) return keys[0];
    var cat = im[keys[0]].cat, lean = im[keys[0]].lean;
    var sameFrame = keys.every(function (k) { return im[k].cat === cat && im[k].lean === lean; });
    return sameFrame ? keys[0] : null;
  }

  // ── The circularity guard ──────────────────────────────────────────────────
  // The single biggest integrity risk in this whole model, and it is invisible
  // until you look at the data: most curated stance cards are written FROM the
  // formal record. "Voted no on the Bipartisan Background Checks Act (H.R. 8)",
  // sourced to the House Clerk, is a description of an action — not an independent
  // statement about it. Feeding that card in as WORD and then testing it against
  // the same roll call is a tautology: it would score 100%, on every profile, for
  // everyone, and the number would mean nothing.
  //
  // So a position only becomes TESTABLE WORD when there is something of their own
  // in it that the record did not supply:
  //   • a direct quotation, or
  //   • a stated-view verb (argues / calls / opposes / believes / warns …) in a
  //     card that is not simply narrating a roll call, or
  //   • a card that neither leads with an action verb nor cites the record.
  // Everything else stays in the ledger, is shown as coverage, and is never scored.
  // It is a real position — it just cannot be its own test.
  var Q_RE = /["“”]/;
  var ASSERT_RE = /\b(argues?|argued|says?|said|calls?|called|warns?|warned|believes?|insists?|maintains?|contends?|opposes?|supports?|wants?|vows?|vowed|pledges?|pledged|promise[sd]?|recalls?|frames?|describes?|advocates?|campaigns? on|has long|has said)\b/i;
  var ACTION_LEAD_RE = /^\s*(?:voted|votes|co-?sponsored|co-?sponsors|sponsored|sponsors|introduced|introduces|reintroduced|filed|files|offers?|offered|authored|authors|led|lead sponsor|backed|backs|joined|joins|signed|signs|passed|broke with|breaks with)\b/i;
  var RECORD_SRC_RE = /house clerk|senate clerk|roll ?call|congress\.gov|govtrack|clerk\.house|congressional record/i;

  function isIndependentWord(text, source) {
    var t = String(text == null ? '' : text);
    var sl = String((source && (source.label || source.url)) || '');
    if (Q_RE.test(t)) return true;                                     // their own words, verbatim
    var narratesRecord = ACTION_LEAD_RE.test(t) && RECORD_SRC_RE.test(sl);
    if (ASSERT_RE.test(t)) return !narratesRecord;                     // a stated view, unless it is just vote narration
    return !ACTION_LEAD_RE.test(t) && !RECORD_SRC_RE.test(sl);
  }

  // ── THE WORD LEDGER ────────────────────────────────────────────────────────
  // Everything this person is on record as saying, tiered. Pure and synchronous:
  // it reads curated data only and never fetches, so it is identical on first
  // paint and after the voting record warms.
  //
  // `scored: false` items are real word that cannot carry a number — a position
  // written from the record (see isIndependentWord), a signature issue we cannot
  // tie to an issue key. They stay visible as coverage. Rule 4 is enforced on the
  // SCORED set: at most one scored item per issue.
  function wordLedger(pid, p) {
    var out = [], scoredIssue = {}, n = 0;

    // 1. Tracked pledges — the itemized ledger. Top tier by definition: the
    //    ledger only holds items someone phrased as a commitment.
    var proms = (p && Array.isArray(p.promises)) ? p.promises : [];
    proms.forEach(function (pr, i) {
      if (!pr || !pr.title) return;
      var v = String(pr.verdict == null ? '' : pr.verdict).toLowerCase();
      var key = pr.issueKey || null;
      out.push({
        id: 'wa-pl-' + i, seq: n++, tier: 'pledge', kind: 'pledge-tracked', scored: true,
        weight: TIERS.pledge.weight,
        issueKey: key, label: pr.title, text: pr.detail || '',
        sources: Array.isArray(pr.sources) ? pr.sources : [],
        resolution: (v === 'kept' || v === 'broken') ? v : 'pending'
      });
      if (key) scoredIssue[key] = 1;
    });

    // 2. Documented positions — one per issue. A stance whose sourced quote carries
    //    first-person commitment language is the same word said more firmly, so it
    //    moves up a tier rather than into a separate lane.
    var list = null;
    try {
      list = (typeof window._resolveStanceList === 'function') ? window._resolveStanceList(pid, p) : null;
    } catch (e) { list = null; }
    // WHICH card speaks for an issue, when several do. This used to be simply the
    // first one in the list order, which quietly threw the whole issue away
    // whenever the first card happened to be written from the record: a second,
    // independent card on the same subject never got a turn, and the issue left
    // the scorable set entirely — a record-derived card silencing real word, which
    // is the opposite of what the circularity rule is for. Rank instead: an
    // independently-worded card with a citation beats an unsourced one, and both
    // beat a card that only narrates the record. List order is the tie-break, so
    // the pick is deterministic and the emitted ids and ordering do not move.
    function cardRank(s) {
      var ind = isIndependentWord(s.text, s.source);
      var srcd = !!(s.source && (s.source.url || s.source.label));
      return (ind && srcd) ? 0 : (ind ? 1 : 2);
    }
    var byIssue = {};
    (list || []).forEach(function (s, i) {
      if (!s || !s.issueKey) return;
      var rk = cardRank(s);
      var cur = byIssue[s.issueKey];
      if (!cur || rk < cur.rank) byIssue[s.issueKey] = { s: s, i: i, rank: rk };
    });
    Object.keys(byIssue).map(function (k) { return byIssue[k]; })
      .sort(function (a, b) { return a.i - b.i; })
      .forEach(function (rec) {
      var s = rec.s, i = rec.i;
      var independent = isIndependentWord(s.text, s.source);
      var sourced = !!(s.source && (s.source.url || s.source.label));
      var promoted = independent && sourced && PLEDGE_RE.test(String(s.text || ''));
      var tier = promoted ? 'pledge' : 'position';
      var scored = independent && !scoredIssue[s.issueKey];
      if (scored) scoredIssue[s.issueKey] = 1;
      out.push({
        id: 'wa-st-' + i, seq: n++, tier: tier, scored: scored,
        kind: promoted ? 'pledge-stated' : (independent ? 'position' : 'position-derived'),
        weight: TIERS[tier].weight,
        issueKey: s.issueKey, label: s.topic || issueLabel(s.issueKey), text: s.text || '',
        stance: s.issueStance || s.pos || 'mixed',
        sources: s.source ? [s.source] : [], resolution: null
      });
    });

    // 3. Soft branding — signature issues they run on. Suppressed only where a
    //    SCORED item already speaks for the issue, so a record-derived stance card
    //    never silences an independent campaign claim on the same subject.
    var brand = (p && (Array.isArray(p.keyIssues) ? p.keyIssues : (Array.isArray(p.issues) ? p.issues : []))) || [];
    brand.forEach(function (lbl, i) {
      if (!lbl) return;
      var key = brandingIssueKey(lbl);
      if (key && scoredIssue[key]) return;
      var scored = !!key;
      if (key) scoredIssue[key] = 1;
      out.push({
        id: 'wa-br-' + i, seq: n++, tier: 'branding', kind: 'branding', scored: scored,
        weight: TIERS.branding.weight,
        issueKey: key, label: String(lbl), text: '',
        sources: [], resolution: null
      });
    });

    return out;
  }

  // Promise counts with no itemized pledges behind them. 41 roster records are in
  // this shape — a resolved kept/broken tally inherited from the old tracker, with
  // nothing to name, source or issue-link. They cannot enter this read (a synthetic
  // "37 pledges" item would be exactly the invention Rule 1 forbids), and staying
  // silent about them would be worse: the pledge tier would read "none on file" for
  // a record that plainly has something on file. So the count is surfaced in the
  // tier row as a COVERAGE GAP — word we hold but cannot test — and not as an
  // outcome, a tally band or a second read. Nothing downstream may score it.
  function pledgeAggregate(p) {
    if (!p) return null;
    if (Array.isArray(p.promises) && p.promises.length) return null;
    var k = +p.kept || 0, b = +p.broken || 0, pd = +p.pending || 0;
    if (!(k + b + pd)) return null;
    return { kept: k, broken: b, pending: pd, resolved: k + b, total: k + b + pd };
  }

  // …and the same disclosure has to survive the moment pledges ARE itemized.
  // pledgeAggregate() stands down as soon as p.promises has anything in it, so the
  // same commitments are never reported twice — but standing down SILENTLY was its
  // own dishonesty. A record with four written-up pledges and 176 resolved in the
  // tracker rendered "2/4 tested" and said nothing at all about the other 172,
  // which reads as full coverage of a complete pledge set. This is the remainder,
  // reported in the tier row as a coverage gap. It is never scored, never an
  // outcome, and never a second tally: it is the count of resolved pledges this
  // read cannot see inside.
  function pledgeRemainder(p, itemized) {
    if (!p) return 0;
    var resolved = (+p.kept || 0) + (+p.broken || 0);
    var n = resolved - (+itemized || 0);
    return n > 0 ? n : 0;
  }

  // How much judged record sits behind one issue's official-record score. Read off
  // the object officialRecord() already returns, so the weight can never disagree
  // with the percentage it is weighting.
  function judgedOf(ov) {
    if (!ov) return 0;
    if (ov.record) {
      var n = (ov.record.consistent || 0) + (ov.record.contradicts || 0);
      if (n > 0) return n;
    }
    if (ov.officialActions) {
      var a = (ov.officialActions.consistent || 0) + (ov.officialActions.contradicts || 0);
      if (a > 0) return a;
    }
    return 0;
  }

  // ── EVIDENCE: how much record, not how many rows of it ─────────────────────
  // The multiplier used to be judgedOf() alone — a HEAD COUNT of judged items,
  // capped at 3. That rewards density over significance, and on an executive
  // record the difference is not academic. climate_action is touched by three
  // orders whose own mapping tables call it a weight-55 side effect, so it earned
  // the full 3×; the national_debt contradiction, carried by the largest law of
  // the term at weight 65, earned 1×. Three incidental mentions outweighed the
  // single most consequential document on file, three to one — and because the
  // three pointed the same way as the stance and the one did not, the density
  // bonus landed entirely on the agreeing side of the ledger.
  //
  // The record summary already carries the weight it actually scored with
  // (consistentScore + contradictScore, in the same 0-100 units the issue mapping
  // tables use), so evidence is now the SMALLER of the head count and that weight
  // expressed in full-weight mappings. It can only ever REDUCE: a lane whose
  // mappings are full weight — every roll call mapped at 100 — is untouched, and a
  // figure credited three times over for side mappings is not. A summary that
  // carries no weight at all (curated formal actions, which are unweighted by
  // design) falls back to the head count rather than being penalised for it.
  function mappedUnits(sum) {
    if (!sum) return null;
    var w = (+sum.consistentScore || 0) + (+sum.contradictScore || 0);
    return w > 0 ? (w / 100) : null;
  }
  function evidenceOf(ov) {
    var n = judgedOf(ov);
    if (!n) return 1;
    var units = mappedUnits(ov && ov.record);
    if (units === null) units = mappedUnits(ov && ov.officialActions);
    var capped = (units === null) ? n : Math.min(n, Math.max(1, Math.round(units)));
    return Math.max(1, Math.min(capped, EVIDENCE_CAP));
  }

  // ── THE ACTION TEST ────────────────────────────────────────────────────────
  // One word item in, one outcome out. Every 'tested' result carries a token that
  // came from the Official Record itself — this function classifies nothing.
  function testOf(it, pid) {
    // Word that cannot carry a number, decided in the ledger: a position written
    // from the record itself, a signature issue with no issue key, or an issue
    // whose one scored slot is already taken. Reported as coverage, never as a
    // mark against anyone.
    //
    // The third case only started firing once pledges were itemized. Rule 4 gives
    // each issue exactly one scored item and the pledge tier claims it first, so a
    // perfectly well-mapped position card can now come back unscored — and it was
    // being reported as "no issue mapping", which is not true of it and reads to a
    // gap list as sloppy data rather than as the deduplication it is.
    if (it.scored === false) {
      return { state: 'untested', token: 'no_record',
               reason: it.kind === 'position-derived' ? 'record_derived'
                     : (it.issueKey ? 'spoken_for' : 'not_issue_linked') };
    }
    // A tracked pledge is tested by its own resolution: the ledger records kept /
    // broken against sourced outcomes, and an unresolved pledge is not a failure.
    if (it.kind === 'pledge-tracked') {
      if (it.resolution === 'kept')   return { state: 'tested', score: 100, token: 'consistent',  evidence: 1, basis: 'pledge-ledger' };
      if (it.resolution === 'broken') return { state: 'tested', score: 0,   token: 'contradicts', evidence: 1, basis: 'pledge-ledger' };
      return { state: 'untested', reason: 'unresolved', token: 'pending' };
    }
    // Word we cannot point at an issue cannot be pointed at an action either.
    if (!it.issueKey) return { state: 'untested', reason: 'not_issue_linked', token: 'no_record' };

    var cs = C();
    if (!cs || typeof cs.officialRecord !== 'function') {
      return { state: 'untested', reason: 'engine_absent', token: 'pending' };
    }
    var ov = null;
    try { ov = cs.officialRecord(pid, it.issueKey); } catch (e) { ov = null; }
    if (!ov) return { state: 'untested', reason: 'engine_absent', token: 'pending' };

    if (typeof ov.score === 'number') {
      var j = judgedOf(ov);
      return {
        state: 'tested', score: ov.score,
        token: ov.token === 'contradicts' ? 'contradicts'
             : ov.token === 'consistent' ? 'consistent'
             : ov.token === 'mixed' ? 'mixed' : 'limited',
        evidence: evidenceOf(ov),
        judged: j, basis: (ov.sources && ov.sources[0]) || 'record'
      };
    }
    if (ov.pending) return { state: 'untested', reason: 'warming', token: 'pending' };
    return { state: 'untested', reason: 'no_action_yet', token: 'no_record' };
  }

  // ── THE READ ───────────────────────────────────────────────────────────────
  // SCOPE. `opts.termScope` selects which slice of the ✒️ executive lane the ACTION
  // side is drawn from — 'all_time' (the default, and the number every headline
  // surface prints) or 'current_term'. It changes nothing about the arithmetic: the
  // tiers, the weights, the evidence cap, the Mixed gate and both floors are the same
  // function of whatever record is in scope. The ONLY thing it selects is which formal
  // actions exist to be tested against.
  //
  // For every figure outside the executive lane the two scopes are the same read —
  // roll-call records carry no term scope — so this parameter is inert on the vast
  // majority of profiles and is not worth a second call there. `scopedRead()` below is
  // the one place that decides whether a second scope is worth computing.
  function read(pid, p, opts) {
    var want = (opts && opts.termScope) || null;
    var cs = C();
    var runner = cs && cs.execActions && typeof cs.execActions.withScope === 'function'
      ? cs.execActions.withScope : null;
    // No engine, or no scope asked for: run against whatever the engine's own default
    // is. That default is 'all_time' — see consistency.js EXEC_SCOPE_DEFAULT — so the
    // unscoped call and the explicitly-all-time call are the same read, and a caller
    // that never heard of scopes still gets the full formal record.
    if (!want || !runner) return _read(pid, p, want);
    return runner(want, function () { return _read(pid, p, want); });
  }

  // What scope a read was actually taken at, as the descriptor object the surfaces
  // label with. Asked of the engine rather than assumed, so the label can never claim
  // a scope the read did not use.
  function scopeOf(want) {
    var cs = C();
    var S = cs && cs.execActions && cs.execActions.SCOPES;
    if (!S) return null;
    if (want && S[want]) return S[want];
    try { return cs.execActions.scope(); } catch (e) { return null; }
  }

  function _read(pid, p, want) {
    var items = wordLedger(pid, p);
    var tested = [], untested = [];
    var counts = { consistent: 0, contradicts: 0, mixed: 0, limited: 0 };
    var wSum = 0, wN = 0, warming = false, issueLinked = 0, derived = 0, scorable = 0;
    var trackedPledges = 0;
    // Weight on each side of the ledger, kept apart from wSum so the overall
    // outcome can be put through the shared Mixed gate rather than flipping to
    // "Mixed record" the instant one contradiction appears next to seven backings.
    var consW = 0, contraW = 0;
    var tiers = {};
    TIER_ORDER.forEach(function (t) { tiers[t] = { key: t, total: 0, scorable: 0, tested: 0, weight: 0 }; });

    items.forEach(function (it) {
      var t = testOf(it, pid);
      it.test = t;
      if (it.issueKey) issueLinked++;
      if (it.kind === 'position-derived') derived++;
      if (it.kind === 'pledge-tracked') trackedPledges++;
      if (it.scored !== false) scorable++;
      var bucket = tiers[it.tier] || (tiers[it.tier] = { key: it.tier, total: 0, scorable: 0, tested: 0, weight: 0 });
      bucket.total++;
      if (it.scored !== false) bucket.scorable++;
      if (t.state === 'tested') {
        tested.push(it);
        var w = it.weight * (t.evidence || 1);
        it.appliedWeight = w;
        wSum += t.score * w; wN += w;
        if (t.token === 'consistent') consW += w;
        else if (t.token === 'contradicts') contraW += w;
        bucket.tested++; bucket.weight += w;
        if (counts[t.token] === undefined) counts[t.token] = 0;
        counts[t.token]++;
      } else {
        untested.push(it);
        if (t.reason === 'warming') warming = true;
      }
    });

    // The overall token comes from the OUTCOMES, not from the percentage — same
    // precedence PDXConsistency.scopedOverall uses, so a profile cannot read
    // "backs it up" here and "says one thing, does another" one section down.
    //
    // Both directions present no longer means "Mixed record" on its own. That
    // reading turned a lopsided ledger — seven items backed, one broken — into a
    // shrug, and it is the same soft middle the issue rows were tightened out of.
    // The split goes through the SHARED gate (consistency.js → _pdxMixedGate), so
    // a dominant side resolves outright and Mixed is reserved for a record that is
    // genuinely pulling two ways.
    var outcomeToken;
    if (counts.contradicts > 0 || counts.consistent > 0) {
      outcomeToken = _mixedGate(consW, contraW, (counts.consistent || 0) + (counts.contradicts || 0));
      if (outcomeToken === 'no_position') outcomeToken = 'limited';
    }
    else if (counts.mixed > 0) outcomeToken = 'mixed';
    else if (warming) outcomeToken = 'pending';
    else if (items.length) outcomeToken = 'limited';
    else outcomeToken = 'no_stance';

    // Rule 4 — fail closed. Both floors must clear before a number exists.
    var publishable = tested.length >= MIN_TESTED_ITEMS && wN >= MIN_TESTED_WEIGHT;
    var pct = publishable && wN ? Math.round(wSum / wN) : null;

    // …and the WORDS fail closed with the number. One tested item saying
    // "consistent" would otherwise render a confident "✓ Backs it up" next to a
    // blank percentage — a verdict resting on exactly the evidence the floor just
    // rejected. Below the floor the read says it is still looking, and the raw
    // outcome stays available as `outcomeToken` for anything that needs it.
    var token = publishable ? outcomeToken
              : (warming ? 'pending' : (items.length ? 'limited' : 'no_stance'));

    var cs = C();
    var verdict = (cs && cs.VERDICTS && cs.VERDICTS[token]) || null;

    return {
      frame: FRAME,
      pct: pct, token: token, outcomeToken: outcomeToken, verdict: verdict,
      publishable: publishable,
      // Which slice of the formal record this number was taken from. Always present,
      // so no surface has to infer it and none can print a percentage without being
      // able to say what it counts.
      termScope: scopeOf(want),
      items: items, tested: tested, untested: untested,
      counts: counts, tiers: tiers,
      testedWeight: wN,
      pledgeAggregate: pledgeAggregate(p),
      pledgeRemainder: pledgeRemainder(p, trackedPledges),
      // What is missing, stated as data rather than hidden: a reader can see how
      // much of this person's word has an action to test it against, and why the
      // rest does not.
      coverage: {
        word: items.length, scorable: scorable, tested: tested.length, untested: untested.length,
        issueLinked: issueLinked, notIssueLinked: items.length - issueLinked,
        recordDerived: derived, warming: warming
      },
      floors: { items: MIN_TESTED_ITEMS, weight: MIN_TESTED_WEIGHT, evidenceCap: EVIDENCE_CAP }
    };
  }

  // One issue's read, for surfaces that already work issue by issue.
  function issueRead(pid, p, issueKey) {
    var all = read(pid, p);
    var hit = null;
    all.items.forEach(function (it) { if (!hit && it.issueKey === issueKey) hit = it; });
    return hit;
  }

  // ── BOTH SCOPES, ONE CALL ──────────────────────────────────────────────────
  // The main read plus — for a figure who is SERVING NOW — the current-term slice of
  // it. Two rules decide whether the slice exists, and both are about not printing a
  // second number that means nothing:
  //
  //   · Not an executive lane → there is no term scope to slice by. A member's
  //     roll-call record is not filtered by term here, so a "current term" read would
  //     be the identical number under a different label: two figures, one fact, and a
  //     reader invited to look for the difference between them.
  //   · Not serving → "current term" is last term. The all-time read already contains
  //     it in full, and labelling history as the live slice is the specific dishonesty
  //     requirement 3 exists to prevent. The slice collapses; the main number, which
  //     is the whole record, is unaffected.
  //
  // `differs` is computed rather than assumed. A sitting president in their first term
  // has an identical all-time and current-term record, and a secondary number sitting
  // under the main one showing the same figure implies a comparison the data does not
  // support. Surfaces use this to decide whether to print the slice as a contrast or
  // as a confirmation — never to hide it, which would leave a reader unable to tell
  // "the same" from "not shown".
  function scopedRead(pid, p) {
    var main = read(pid, p, { termScope: 'all_time' });
    var out = {
      main: main, current: null,
      scope: main.termScope,
      lane: isExecLane(pid) ? 'exec' : 'record',
      serving: false, applicable: false, term: null, differs: false, delta: null
    };
    if (out.lane !== 'exec') return out;
    var cs = C();
    try { out.serving = !!(cs && cs.execActions && cs.execActions.serving(pid)); } catch (e) { out.serving = false; }
    if (!out.serving) return out;
    out.applicable = true;
    try { out.term = (cs.execActions.currentTerm && cs.execActions.currentTerm(pid)) || null; } catch (e) { out.term = null; }
    out.current = read(pid, p, { termScope: 'current_term' });
    var a = main.pct, b = out.current.pct;
    out.differs = (a !== b) || (main.token !== out.current.token) ||
                  (main.tested.length !== out.current.tested.length);
    if (typeof a === 'number' && typeof b === 'number') out.delta = b - a;
    return out;
  }

  // ── CONNECTING THE DOTS ────────────────────────────────────────────────────
  // The actual thread, per issue: what they SAID → the formal ACTIONS on that
  // issue, named → the OUTCOME. Sorted so a reader meets the most consequential
  // rows first: tested before untested, contradictions before agreement (a gap is
  // the thing worth a reader's next tap), then by weight.
  function dots(pid, p, opts) {
    opts = opts || {};
    var limit = opts.limit || 3;
    var r = read(pid, p);
    var rank = { contradicts: 0, mixed: 1, consistent: 2, limited: 3 };
    var rows = r.items.filter(function (it) { return it.test && it.test.state === 'tested'; });
    rows.sort(function (a, b) {
      var ra = rank[a.test.token], rb = rank[b.test.token];
      if (ra !== rb) return ra - rb;
      if (b.appliedWeight !== a.appliedWeight) return b.appliedWeight - a.appliedWeight;
      return a.seq - b.seq;
    });
    return rows.slice(0, limit).map(function (it) {
      return {
        item: it,
        tier: TIERS[it.tier] || TIERS.position,
        issueKey: it.issueKey,
        title: it.label,
        word: it.text || '',
        sources: it.sources || [],
        actions: namedActions(pid, it),
        outcome: it.test,
        verdict: (C() && C().VERDICTS && C().VERDICTS[it.test.token]) || null
      };
    });
  }

  // The formal actions behind one word item, NAMED — "H.R. 22 · On Motion to
  // Recommit · Voted Yea" — rather than a bare count. A pledge resolved in the
  // ledger has its own sourced outcome instead of a roll call, and says so.
  function namedActions(pid, it) {
    if (it.kind === 'pledge-tracked') {
      return [{ text: it.resolution === 'kept' ? 'Resolved in the pledge ledger as kept, against its own sources.'
                                               : 'Resolved in the pledge ledger as broken, against its own sources.',
                kind: 'ledger' }];
    }
    if (!it.issueKey) return [];
    // The ✒️ executive lane's "did" is a document, not a roll call — so it names the
    // order or law and where that document stands today. Delegated to consistency.js,
    // which owns the lane, so this file has one way of asking and no copy of the
    // vocabulary to drift from.
    if (it.test && it.test.basis === 'exec-actions') {
      var csx = C();
      var ex = csx && csx.execActions;
      if (!ex || typeof ex.proofLines !== 'function') return [];
      try { return ex.proofLines(pid, it.issueKey, 2) || []; } catch (e) { return []; }
    }
    var items = null;
    try {
      items = (typeof window._pdxRecordIssueItems === 'function') ? window._pdxRecordIssueItems(pid, it.issueKey) : null;
    } catch (e) { items = null; }
    if (!items || !items.length) return [];
    var cs = C();
    var proof = (cs && cs.proof && typeof cs.proof.proofText === 'function') ? cs.proof.proofText : null;
    var out = [];
    for (var i = 0; i < items.length && out.length < 2; i++) {
      var t = proof ? proof(items[i]) : (items[i] && (items[i].billLabel || items[i].question || ''));
      if (t) out.push({ text: t, kind: 'vote' });
    }
    return out;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // RENDERERS
  // ═════════════════════════════════════════════════════════════════════════

  function tierRowHtml(t, bucket, r) {
    var def = TIERS[t];
    var have = bucket && bucket.total ? bucket.total : 0;
    var got = bucket && bucket.tested ? bucket.tested : 0;
    var agg = (t === 'pledge' && !have) ? r.pledgeAggregate : null;
    // The denominator is the SCORABLE count, not the raw count. Showing "6/30
    // tested" when 22 of the 30 are record-derived reads as poor coverage of a
    // full set, when in fact the tested share of what CAN be tested is 6 of 8.
    // The untestable ones are named on their own, right after.
    var can = bucket && bucket.scorable ? bucket.scorable : 0;
    var off = have - can;
    // Resolved pledges in the tracker that no itemized pledge accounts for. Shown
    // only on the pledge tier, and only once itemizing has begun — before that the
    // aggregate bridge above is already saying it, and saying it twice would read
    // as two different sets of pledges.
    var rest = (t === 'pledge' && !agg) ? (r.pledgeRemainder || 0) : 0;
    var n;
    if (agg) n = '<span class="pdxwa-tier-agg">' + agg.resolved + ' in the tracker, none itemized</span>';
    else if (!have) n = 'none on file';
    else if (!can) n = '<span class="pdxwa-tier-agg">' + have + ' on file, none testable</span>';
    else n = got + '<span class="pdxwa-tier-of">/' + can + ' tested' +
             (off ? '<br>+' + off + ' not testable' : '') +
             (rest ? '<br>+' + rest + ' in the tracker, not itemized' : '') + '</span>';
    return '' +
      '<li class="pdxwa-tier pdxwa-tier-' + t + ((have || agg) ? '' : ' pdxwa-tier-empty') + '">' +
        '<span class="pdxwa-tier-ico" aria-hidden="true">' + def.ico + '</span>' +
        '<span class="pdxwa-tier-main">' +
          '<span class="pdxwa-tier-name">' + esc(def.label) + '<span class="pdxwa-tier-w">' + esc(def.counts) + '</span></span>' +
          '<span class="pdxwa-tier-gloss">' + esc(agg
            ? 'A resolved kept/broken tally carried over from the promise tracker, with no individual pledges written up yet. Nothing here can be tested against an action until the pledges behind it are itemized and sourced, so it is reported as a gap in coverage rather than as a mark for or against them.'
            : def.gloss) + '</span>' +
        '</span>' +
        '<span class="pdxwa-tier-n">' + n + '</span>' +
      '</li>';
  }

  // ── The basis: one line visible, the table one tap away ────────────────────
  // The percentage above is the read. What the percentage is MADE of — three tier
  // rows with their glosses and their tested/not-testable arithmetic, then a
  // coverage sentence carrying up to three clauses — is the working. Both used to
  // sit between the number and the first issue row, which is the worst place on
  // the card for them: a reader travelling from the verdict to the evidence had to
  // cross two dense blocks that answer a question they had not asked yet.
  //
  // So the working folds, and what stays is the one line that is genuinely
  // scannable: how many of each kind of statement went in. The tested count moves
  // to the lid label, where it doubles as the promise of what opening will show.
  // Neither number is recomputed here — both are read straight off the same `r`
  // the table itself renders from, so the digest cannot disagree with the detail
  // it hides.
  function _basisCount(t, r) {
    var b = r.tiers[t];
    var have = (b && b.total) || 0;
    // A pledge tier with nothing itemized still has a real count behind it in the
    // promise tracker. Reporting 0 there would understate the record; the tier row
    // inside says the same thing at length.
    if (t === 'pledge' && !have && r.pledgeAggregate) have = r.pledgeAggregate.resolved || 0;
    return have;
  }
  // Plural nouns for the digest. 'branding' is called Branding in the tier table,
  // where the weight column explains what that means; on a bare one-liner with no
  // such column "signature issues" is the phrase that survives without it.
  var BASIS_NOUN = { pledge: 'pledge', position: 'position', branding: 'signature issue' };
  function basisHtml(r) {
    var digest = TIER_ORDER.map(function (t) {
      var n = _basisCount(t, r);
      return { t: t, n: n };
    }).filter(function (x) { return x.n > 0; });

    var digestHtml = digest.length
      ? '<div class="pdxwa-basis-d">' + digest.map(function (x) {
          return '<span class="pdxwa-basis-i">' +
              '<span class="pdxwa-basis-ico" aria-hidden="true">' + TIERS[x.t].ico + '</span>' +
              '<span class="pdxwa-basis-n">' + x.n + '</span> ' +
              esc(BASIS_NOUN[x.t] + (x.n === 1 ? '' : 's')) +
            '</span>';
        }).join('') + '</div>'
      // Nothing on file in any tier. The tier table still renders (three empty
      // rows saying so), but a digest of three zeroes is furniture, not a summary.
      : '';

    // Numbers and ASCII only, like every other lid label in this codebase — the
    // sentinel is parsed out of a comment by applyLids(), which escapes the label
    // when it emits it, so pre-escaping here would double-encode.
    var label = 'What this score is built from · ' +
      r.coverage.tested + ' of ' + r.coverage.scorable + ' tested';

    return '<div class="pdxwa-basis">' +
        digestHtml +
        // defer: the three tier rows carry the longest prose on the card outside the
        // method note, and nothing outside this block reaches into it — no ids, no
        // canvas, no post-render registration — so it is safe to hold as a string
        // until a reader asks for it.
        '<!--PDXSP:lid id="wa-basis" label="' + label + '" defer-->' +
        '<ul class="pdxwa-tiers">' + TIER_ORDER.map(function (t) { return tierRowHtml(t, r.tiers[t], r); }).join('') + '</ul>' +
        '<div class="pdxwa-cov">' +
          '<span class="pdxwa-cov-n">' + r.coverage.tested + ' of ' + r.coverage.scorable + '</span> testable statement' +
          (r.coverage.scorable === 1 ? '' : 's') + ' have a formal action behind them' +
          (r.coverage.recordDerived
            ? ' · ' + r.coverage.recordDerived + ' more position' + (r.coverage.recordDerived === 1 ? '' : 's') +
              ' on file came from the record itself, so ' + (r.coverage.recordDerived === 1 ? 'it cannot' : 'they cannot') + ' test it'
            : '') +
          (r.coverage.notIssueLinked
            ? ' · ' + r.coverage.notIssueLinked + ' not yet tied to an issue'
            : '') +
          '.' +
        '</div>' +
        // Closed HERE, before the coverage panel the caller appends after this
        // block. applyLids() refuses to fold any region containing another PDXSP
        // sentinel, and that panel is a sibling with its own control — a lid left
        // open across it would silently render inline and look like this change
        // never landed.
        '<!--PDXSP:/lid-->' +
      '</div>';
  }

  // The honest empty / thin state. It says which of the two things is missing —
  // word or action — because those are different gaps with different fixes, and a
  // single "no data" message hides which one a reader is looking at.
  function thinCopy(r, name) {
    var c = r.coverage;
    if (!c.word) {
      return 'No documented position, pledge or signature issue is on file for ' + name + ' yet, so there is nothing to test a vote against. ' +
             'Word is added only as it is sourced — never inferred from how they voted.';
    }
    if (c.warming) return 'Checking ' + name + '’s formal record against ' + c.scorable + ' documented statement' + (c.scorable === 1 ? '' : 's') + '…';
    if (!c.scorable) {
      return 'All ' + c.word + ' position' + (c.word === 1 ? '' : 's') + ' on file for ' + name + ' ' + (c.word === 1 ? 'was' : 'were') +
             ' written up from the formal record itself, so ' + (c.word === 1 ? 'it' : 'they') + ' cannot test it. ' +
             'This read needs something ' + name + ' said independently — a quote, an interview, a platform position.';
    }
    if (!c.tested) {
      return c.scorable + ' independently documented statement' + (c.scorable === 1 ? '' : 's') + ' on file, and no formal action on record to test ' +
             (c.scorable === 1 ? 'it' : 'any of them') + ' against yet. That is a gap in the record, not a mark against ' + name + '.';
    }
    return 'Only ' + c.tested + ' of ' + c.scorable + ' independently documented statement' + (c.scorable === 1 ? '' : 's') + ' has a formal action behind it so far — ' +
           'below the ' + r.floors.items + '-item floor this read needs before it publishes a percentage. ' +
           'The tested items are shown below; the number waits until the record is deep enough to carry it.';
  }

  // ── WHAT THE PERCENTAGE MEANS, AND WHAT IT DOES NOT CLAIM ──────────────────
  // Two sentences, full width, directly under the number they qualify. It is
  // deliberately NOT inside the drawer with the rest of the method: a reader who
  // never opens a drawer is exactly the reader who over-reads a large green
  // figure, and the sentence that stops them has to be on the same screen as the
  // figure. It renders only where a percentage rendered — below the floors there
  // is no number to over-read, and thinCopy already says what is missing.
  function meansHtml(hasPct) {
    if (!hasPct) return '';
    return '' +
      '<p class="pdxwa-means">' +
        '<span class="pdxwa-means-k">What this measures</span>' +
        '<span class="pdxwa-means-v">' + esc(FRAME.means) +
          '<span class="pdxwa-means-not">' + esc(FRAME.notClaim) + '</span>' +
        '</span>' +
      '</p>';
  }

  // Whether this figure's "did" side is the ✒️ executive record rather than roll
  // calls. Asked of consistency.js, which owns the office gate, so this file never
  // keeps a second list of who is a president. Guarded: a page that loads
  // word-action.js without the executive lane simply reads as congressional.
  function isExecLane(pid) {
    try {
      var cs = C();
      return !!(cs && cs.execActions && typeof cs.execActions.eligible === 'function' && cs.execActions.eligible(pid));
    } catch (e) { return false; }
  }

  // The explainer, in the vocabulary of the lane that produced the number. The
  // arithmetic is identical for a president and a member — same weights, same
  // floors, same circularity rule — so only the nouns and the worked example
  // change. Getting this wrong is not cosmetic: a reader on a president's profile
  // was being told the score came from roll-call votes, which is the one thing a
  // president has none of, and the "cannot be its own test" paragraph is the whole
  // reason 7 of Trump's pairs are held as coverage. An explanation that describes
  // the wrong lane cannot be checked by the reader against what they can see.
  function methodHtml(r, pid) {
    var ex = isExecLane(pid);
    // WHICH RECORD THE NUMBER IS OVER. On the executive lane this is a real choice
    // — a president has more than one term of formal actions on file — and the
    // choice used to be made silently, in favour of the term now being served. It
    // is stated here, in the same drawer that states every other rule, because a
    // percentage whose scope is unstated is a percentage a reader cannot check.
    // The wording matches the card: "the whole record, every term" is the phrase
    // the slice above uses too, so a reader who opens this drawer to check the
    // strip they just read meets the same sentence rather than a second theory.
    var scopeP = ex
      ? '<p><b>The record counted</b> is the whole one: every formal action on file, across every term in ' +
        'office. A president who signed something in one term and undid it in the next has both on this ' +
        'card, and the number weighs both. For someone serving now, the term being served is also shown on ' +
        'its own, just under the score — the same word, tested against that one term’s actions. It is part of ' +
        'the whole record, not a rival to it, and the two can read differently because the whole record has ' +
        'more action behind it to test the same word against.</p>'
      : '';
    return '' +
      '<details class="pdxwa-method">' +
        '<summary>How this is counted</summary>' +
        '<div class="pdxwa-method-body">' +
          '<p><b>Word</b> is weighted by how firmly it was said: a pledge counts ' + TIERS.pledge.weight +
            ', a stated position ' + TIERS.position.weight + ', a signature issue they campaign on ' + TIERS.branding.weight +
            '. An issue also earns up to ' + r.floors.evidenceCap + '× for the depth of formal record behind it, ' +
            'so an issue decided by ' + (ex ? 'one action' : 'one vote') + ' does not count as much as one decided by ten.</p>' +
          '<p><b>Action</b> is the Official Record only — ' +
            (ex ? 'the laws they signed or vetoed, the executive orders and the formal directives on file. '
                : 'roll-call votes, sponsorships and formal acts. ') +
            'Interviews, news coverage and social posts are never counted as action in this percentage; they are word, or they are public-record context — and the public record decides an issue below only where no formal action exists to test it.</p>' +
          '<p><b>A position cannot be its own test.</b> Many of our position write-ups are drawn from the formal record — ' +
            (ex ? '“Signed Executive Order 14156”, cited to the Federal Register. Scoring that against the same order would return 100% for '
                : '“Voted no on H.R. 8”, cited to the House Clerk. Scoring that against the same roll call would return 100% for ') +
            'everyone and mean nothing, so those items are listed as positions and left out of the number. Only word with ' +
            'something of their own in it — a quotation, a stated view, a platform or campaign claim — is tested.</p>' +
          '<p><b>The percentage</b> is the weighted share of tested word their record backs up. It appears only once at least ' +
            r.floors.items + ' items are tested and their combined weight reaches ' + r.floors.weight +
            ', so a whole-profile read never rests on ' + (ex ? 'a single action' : 'a single vote') + '. Unresolved pledges and untested positions are excluded ' +
            'from the number and reported as coverage instead — they are not counted against anyone.</p>' +
          '<p><b>Nothing is inferred.</b> An issue with ' + (ex ? 'actions' : 'votes') + ' but no documented word produces no item, and an item counts as ' +
            'going against their word only when the Official Record’s own verdict for that issue says so.</p>' +
          // THE NON-CLAIM, AT LENGTH. The card states it in one line; this is the
          // same statement with the reasoning attached, because "not an outcome
          // score" is the kind of sentence a reader believes only once they can see
          // WHY the two come apart. The two examples are the two directions the
          // mistake runs in: a matched action that did not survive, and a matched
          // action nobody thinks worked.
          '<p><b>What this is not.</b> It is a direction match and nothing more. It does not say a policy was ' +
            'popular, that it achieved what it set out to, or that it is still standing today — ' +
            (ex ? 'an order can be signed exactly as promised and struck down the month after, and the direction it pointed in does not change either way. '
                : 'a position can be backed exactly as stated and go nowhere afterwards, and the direction it pointed in does not change either way. ') +
            (ex ? 'Where the standing of a supporting action is contested — blocked, struck down, overridden, rescinded or under an unresolved challenge — the issue row below says so beside its verdict rather than in place of it. '
                : '') +
            'A record that reads as one long agreement is a fact about the record, not a grade for it: the ' +
            'issue-by-issue composition above the rows is there so the shape behind the average is visible.</p>' +
          scopeP +
        '</div>' +
      '</details>';
  }

  // ── WHAT WE DO NOT HAVE YET ────────────────────────────────────────────────
  // The coverage sentence above says how much of the word has an action behind
  // it. This is the other half of the same honesty: the specific holes in OUR
  // documentation, named, with one clean way for a reader to hand us a lead.
  // Delegated entirely to gaps.js — this module owns the read, not the ask — and
  // fully guarded, because the panel must render identically if gaps.js is
  // absent. `r` is passed through so the gap list never recomputes the read.
  function gapsHtml(pid, p, r) {
    try {
      if (window.PDXGaps && typeof window.PDXGaps.panelHtml === 'function') {
        return window.PDXGaps.panelHtml(pid, p, r) || '';
      }
    } catch (e) {}
    return '';
  }

  // ── WHAT FEEDS THIS SCORE ──────────────────────────────────────────────────
  // The profile used to read as four independent score widgets that happened to
  // share a page: a promise percentage, a Word vs Action percentage, an Official
  // Record percentage and a Say-vs-Do integrity percentage. Nothing on screen
  // said how they related, so a reader had to guess which one was "the" number.
  // This panel is that missing sentence, made navigable: every layer is named,
  // told what it contributes, counted, and linked. Word tiers feed the number and
  // the Official Record is the test. Say-vs-Do is not listed here because it is
  // no longer anywhere to link TO — it was merged into the issue rows in this
  // same section, and a feed row pointing at the card the reader is already
  // reading is not a feed, it is a loop.
  function jumpAttr(target) {
    var t = String(target).replace(/[^A-Za-z0-9_-]/g, '');
    return ' onclick="event.stopPropagation();if(window._pdxNavJump){window._pdxNavJump(\'' + t + '\');}' +
           'else{var e=document.getElementById(\'' + t + '\');if(e&&e.scrollIntoView)e.scrollIntoView({behavior:\'smooth\',block:\'start\'});}"';
  }

  function feedRowHtml(row) {
    return '' +
      '<li class="pdxwa-feed-li">' +
        '<button type="button" class="pdxwa-feed' + (row.counted ? '' : ' pdxwa-feed-ctx') + '"' + jumpAttr(row.target) +
          ' aria-label="' + esc(row.name + ' — ' + row.role) + '">' +
          '<span class="pdxwa-feed-ico" aria-hidden="true">' + row.ico + '</span>' +
          '<span class="pdxwa-feed-main">' +
            '<span class="pdxwa-feed-name">' + esc(row.name) + '</span>' +
            '<span class="pdxwa-feed-role">' + esc(row.role) + '</span>' +
          '</span>' +
          '<span class="pdxwa-feed-n">' + esc(row.n) + '<span class="pdxwa-feed-go" aria-hidden="true">→</span></span>' +
        '</button>' +
      '</li>';
  }

  function feedsHtml(pid, p, r) {
    try {
      r = r || read(pid, p);
      // Nothing said on file: there is no score for anything to feed, so the panel
      // says nothing rather than listing an Official Record row reading "0 of 0".
      if (!r || !r.coverage || !r.coverage.word) return '';
      var t = r.tiers, c = r.coverage, agg = r.pledgeAggregate;
      var rows = [];
      var pledgeN = (t.pledge && t.pledge.total) || 0;
      if (pledgeN || (agg && agg.resolved)) {
        rows.push({ ico: TIERS.pledge.ico, name: 'Pledges kept and broken', target: 'pdxsec-score', counted: true,
          role: 'Explicit pledges kept and broken — the top tier of this score, counting ' + TIERS.pledge.weight + '×',
          n: pledgeN ? (pledgeN + ' itemized') : (agg.resolved + ' resolved') });
      }
      if (t.position && t.position.total) {
        rows.push({ ico: TIERS.position.ico, name: 'Stated positions', target: 'pdxsec-positions', counted: true,
          role: 'Sourced positions — counted ' + TIERS.position.weight + '× when they said it independently',
          n: t.position.scorable + ' of ' + t.position.total + ' testable' });
      }
      if (t.branding && t.branding.total) {
        rows.push({ ico: TIERS.branding.ico, name: 'Signature issues', target: 'pdxsec-positions', counted: true,
          role: 'Issues they campaign on — counted ' + TIERS.branding.weight + '×, the lightest word there is',
          n: t.branding.total + ' on file' });
      }
      rows.push({ ico: '🏛️', name: 'Official Record', target: 'pdxsec-official-record', counted: true,
        role: isExecLane(pid)
          ? 'The test — laws signed or vetoed, orders and directives, judged issue by issue'
          : 'The test — roll-call votes and formal acts, judged issue by issue',
        n: c.tested + ' of ' + c.scorable + ' tested' });
      // THE "🧾 SAY-VS-DO RECEIPTS → #pdxsec-saydo" ROW IS GONE. It pointed at a
      // section that no longer exists: the public record is an input to the issue rows
      // in THIS section now (PDXConsistency.issueRow resolves it), not a feed sitting
      // somewhere else on the page. A feed row whose destination is the card the
      // reader is already looking at is not a feed, it is a loop.
      // The receipt layer, named as a feed rather than left to look like a
      // separate vault. It is context, not arithmetic: the Locker documents the
      // word and the actions above, and changes no number on this card. The count
      // is read back through the Locker's own accessor so it always matches what
      // the filtered library actually contains, and the row is dropped entirely
      // while that library is still loading rather than guessing at a figure.
      try {
        var lockN = (typeof window._pdxLockerItemCount === 'function') ? window._pdxLockerItemCount(pid) : 0;
        if (lockN) {
          rows.push({ ico: '📂', name: 'Evidence Locker', target: 'pdxsec-evidence', counted: false,
            role: 'The receipts behind the word and the record — documents, clips and citations',
            n: lockN + ' item' + (lockN === 1 ? '' : 's') });
        }
      } catch (e) {}
      // Where these same issues get argued out in public. Also context: a
      // Spotlight can put a vote in its setting, but it never tests a statement,
      // so it is listed and never counted.
      try {
        var slN = (window.PDXSpotlight && typeof window.PDXSpotlight.forPolitician === 'function')
          ? (window.PDXSpotlight.forPolitician(pid) || []).length : 0;
        if (slN) {
          rows.push({ ico: '🔦', name: 'Issue Spotlights', target: 'spotlight-modal-section', counted: false,
            role: 'The issues these statements land in, argued out in public — context, never a test',
            n: slN + ' featured' });
        }
      } catch (e) {}
      return '' +
        '<div class="pdxwa-feeds">' +
          // The lid label IS the heading this panel used to print, so folding it costs
          // no wording. What it does cost is a tap, and that is the right trade: the
          // rows are a map of the profile, not the verdict, and the verdict has to be
          // the first thing a reader meets. Every row here is also reachable from the
          // jump rail, so nothing about the proof path depends on opening this.
          '<!--PDXSP:lid id="wa-feeds" label="What feeds this score" defer-->' +
          '<ul class="pdxwa-feeds-l">' + rows.map(feedRowHtml).join('') + '</ul>' +
          '<p class="pdxwa-feeds-foot">One score, several layers of evidence. The solid rows are what the ' +
            'percentage is made of; the faded ones are the receipt and context layers that document it and ' +
            'change no number. Each section below shows its own working — counts, verdicts and sources — and ' +
            'this is the only place any of it is pooled into a percentage.</p>' +
          '<!--PDXSP:/lid-->' +
        '</div>';
    } catch (e) { return ''; }
  }

  // ── The spine, on the one score's own card ──────────────────────────────────
  // Said → Did → Verdict → Receipts, for the two or three issues that carry the most
  // weight. This card used to state a percentage and then hand the reader a list of
  // section names; the actual content — which issue, what they said, what they did —
  // was several taps away in a different section. The rows below are the same
  // PDXConsistency issue-row unit the Official Record is built from, ranked by the
  // same rankIssueRows() contract, so "top" here means exactly what "first" means
  // there: real tension with real evidence, then well-evidenced agreement. Nothing is
  // recomputed and no number is published — the row's verdict and the row's receipt
  // count are read straight off the unit.
  var TOP_ROWS_MAX = 3;
  // ── The one place this file asks for an issue colour ────────────────────────
  // Every row on this card that names an issue goes through here, so there is one
  // guard, one fallback and one class name rather than three near-copies.
  //
  // The `mapped` flag is the part that matters. styleFor() never fails — an
  // unrecognised key comes back as neutral slate — which means a row that silently
  // stopped resolving looks identical to a row that resolved to slate on purpose,
  // and a whole card of grey rows reads as "the colour system is off" rather than
  // "these are not core issues". Splitting the two lets the CSS paint a resolved
  // row properly and leave an unresolved one alone.
  function issueSkin(key) {
    var IC = window.PDXIssueColors;
    if (!IC || typeof IC.styleFor !== 'function') return { style: '', cls: '', on: false };
    var on = false;
    try { on = (typeof IC.isCore === 'function') ? IC.isCore(key) : !!IC.getIssueColor(key).mapped; } catch (e) { on = false; }
    return { style: IC.styleFor(key), cls: on ? ' pdxwa-ic' : '', on: on };
  }
  function _laneNoun(row, n) {
    var one = (row.lane === 'exec') ? 'executive action' : 'vote';
    return n + ' ' + one + (n === 1 ? '' : 's');
  }

  // ── ONE RANKED ROW SET, THREE SURFACES ─────────────────────────────────────
  // The composition strip, the top rows and the outcomes block all describe the
  // same set of issues. Each used to fetch and rank it separately, which is three
  // chances for the strip to count an issue the rows below it do not show. Guarded
  // exactly as the callers were: no row model, no block.
  function rankedRows(pid) {
    var CS = window.PDXConsistency;
    if (!CS || typeof CS.issueRows !== 'function' || typeof CS.rankIssueRows !== 'function') return null;
    try { return CS.rankIssueRows(CS.issueRows(pid)); } catch (e) { return null; }
  }

  // ── AXIS B ON THE ROW — where the supporting action STANDS ─────────────────
  // The ✒️ executive lane resolves two independent questions about one document,
  // and this file was printing only the first. Axis A is direction: did the action
  // point the same way as the word? Axis B is standing: is that action in force,
  // blocked, struck down, overridden, rescinded, superseded, expired, or under a
  // challenge nobody has resolved? A row that says "Backed it up" off an order a
  // court enjoined last spring is answering A honestly and saying nothing about B —
  // and a reader who cannot see B reads the row as an unqualified win.
  //
  // The precedence is COPIED FROM exec-record.js's executiveIssue(), deliberately
  // and with the same comment attached to it there: the most contested standing
  // among the actions behind an issue is the one the issue is presented at, so an
  // issue is never shown as settled while one of its orders is enjoined. It is
  // read off the row's own pool rather than recomputed, so this surface cannot
  // disagree with the Executive Enactment Record about where an order stands.
  var STANDING_ORDER = ['struck_down', 'overridden', 'blocked', 'partly_blocked', 'rescinded',
                        'challenged_unverified', 'superseded', 'expired', 'in_force'];
  function rowStanding(r) {
    try {
      if (!r || r.lane !== 'exec') return null;
      var E = window.PDXExecRecord;
      if (!E || !E.STANDING) return null;
      var pool = r.ov && (r.ov.execPool || r.ov.execHeld);
      var items = (pool && pool.items) || [];
      if (!items.length) return null;
      for (var i = 0; i < STANDING_ORDER.length; i++) {
        for (var j = 0; j < items.length; j++) {
          if (items[j].standing === STANDING_ORDER[i]) return E.STANDING[STANDING_ORDER[i]] || null;
        }
      }
    } catch (e) {}
    return null;
  }
  // What the standing means, said once per token so no surface has to paraphrase
  // it. Note what these sentences do NOT say: nothing about direction. Direction is
  // the verdict chip's job and it is already on the row — a standing line that also
  // asserted "the direction matched" would be false on a contradicting row and
  // would be printing the same claim twice on an agreeing one.
  var STANDING_SAY = {
    struck_down:           'A court struck down an action behind this row.',
    overridden:            'Congress overrode an action behind this row.',
    blocked:               'A court has blocked an action behind this row.',
    partly_blocked:        'A court has blocked part of an action behind this row.',
    rescinded:             'An action behind this row was later rescinded.',
    challenged_unverified: 'An action behind this row is under a challenge that is not resolved.',
    superseded:            'A later action has superseded one of the actions behind this row.',
    expired:               'An action behind this row has lapsed or expired.',
    in_force:              'The actions behind this row are on file and in force.'
  };
  // THE PAIRED SIGNAL, IN ONE CLAUSE. Requirement: stop forcing one chip to carry
  // both meanings. This is the sentence that separates them — and it is appended
  // only where the two answers actually come apart, because telling a reader that
  // "what was done and whether it held are different questions" under a row where
  // both are clean is furniture.
  function standingLine(st) {
    if (!st) return '';
    var say = STANDING_SAY[st.key] || st.label;
    return (st.ico ? st.ico + ' ' : '') + say +
      (st.contested ? ' What they did and whether it held are two different questions; the verdict beside this row answers the first only.' : '');
  }
  function isContested(r) { var st = rowStanding(r); return !!(st && st.contested); }
  // A row resting on ONE sourced item. `strength` is the row model's own word for
  // it (PDXConsistency._EV_STRENGTH), so this file adds no second definition of
  // thin — it only makes the existing one impossible to scroll past.
  function isThin(r) { return !!(r && r.evidence && r.evidence.strength === 'thin'); }
  // Tension is not only disagreement. A row that agrees with the word on the
  // strength of an action a court has since struck down is not a clean win either,
  // and ranking it behind three uncontested agreements is how a contested record
  // ends up reading as a calm one.
  function isTension(r) {
    var t = r && r.verdict && r.verdict.token;
    return t === 'contradicts' || t === 'mixed' || isContested(r);
  }
  // The two friction chips a row can carry, beside its verdict rather than instead
  // of it. Short and uniform on purpose: the detail is one line down, and a chip
  // long enough to need its own line stops being a chip.
  function flagsHtml(r, cls) {
    var out = '';
    if (isContested(r)) out += '<span class="' + cls + ' ' + cls + '-x">Standing contested</span>';
    if (isThin(r)) out += '<span class="' + cls + ' ' + cls + '-thin">Thin evidence</span>';
    return out;
  }
  // What tested this row, in the row's own terms. A row resolved on the formal record
  // counts the formal record; a row the formal record could not test counts the public
  // record instead and says so. Only one of the two is ever printed, because only one
  // of them was ever resolved — see PDXConsistency.issueRow.
  function _didLine(r) {
    if (r.verdict.basis === 'public_record') {
      var n = r.evidence.public;
      return n + ' sourced item' + (n === 1 ? '' : 's') + ' in the public record — no formal action tests this one' +
        (typeof r.verdict.score === 'number' ? ' · ' + r.verdict.score + '% of them back the position' : '');
    }
    return _laneNoun(r, r.evidence.actions) + ' on record' +
      (typeof r.verdict.score === 'number' ? ' · ' + r.verdict.score + '% of them back the position' : '');
  }
  // The counter-evidence the deciding record set aside, printed on the row that set
  // it aside. Only one record resolves a row — but a row that resolved "backs it up"
  // off two signed laws while a sourced item on the same issue says the opposite was
  // reporting the agreement and quietly binning the disagreement. Named, counted, and
  // pointed at the section that holds it; never folded into the verdict.
  function _setAsideLine(r) {
    var sa = r.setAside;
    if (!sa || !sa.count) return '';
    var what = (sa.lane === 'public_record')
      ? (sa.count + ' sourced item' + (sa.count === 1 ? '' : 's') + ' in the public record')
      : (_laneNoun(r, sa.count) + ' on the formal record');
    var dir = (sa.direction === 'contradicts') ? 'cut against this position' : 'back this position';
    return what + ' ' + dir + ' and did not decide this row.';
  }
  function topRowsHtml(pid) {
    try {
      var ranked = rankedRows(pid);
      if (!ranked) return '';
      // Tested rows only, and only rows whose SAID side can actually be printed. A
      // "said, no record yet" row is coverage, and leading the one score with a
      // coverage gap is precisely the ordering this pass removed from the Official
      // Record — it should not reappear one section higher up. A row with a verdict
      // but no quotable position is the mirror problem: "Backs it up / No position
      // stated" is not a Said → Did → Verdict chain, it is two thirds of one.
      var elig = ranked.filter(function (r) {
        return r.tested && r.evidence.total > 0 && !!r.stance.label;
      });
      // TENSION FIRST, INCLUDING CONTESTED TENSION. rankIssueRows already floats
      // contradictions and mixed results into tier 0, so half of this was true
      // before. What it could not know about is Axis B: a row that agrees with the
      // word on the strength of an order a court struck down ranks as a clean win
      // and, with three green rows above it, never appears at all. This is a stable
      // partition rather than a re-sort — inside each half the existing rank order
      // is untouched, so nothing is reordered except across the tension boundary.
      var top = elig.filter(isTension).concat(elig.filter(function (r) { return !isTension(r); }))
                    .slice(0, TOP_ROWS_MAX);
      if (!top.length) return '';
      var rows = top.map(function (r) {
        var col = r.verdict.color || '#9fb4d4';
        // The row's spine and tint carry the ISSUE, not the verdict: scanning a
        // stack of rows, the first thing a reader should be able to do is find
        // the healthcare one. The verdict keeps its own colour on its own label
        // to the right, so nothing about the judgement is lost — the two colour
        // vocabularies sit side by side and mean different things.
        //
        // When the key resolves, the .pdxwa-ic class hands the spine to the issue
        // outright. It used to be a CSS fallback chain (issue colour, else verdict
        // colour), which meant a resolved row and an unresolved one were one typo
        // apart and the unresolved one came back green — the exact confusion this
        // whole colour vocabulary exists to prevent.
        var skin = issueSkin(r.key);
        var saidTxt = r.stance.text ? String(r.stance.text) : '';
        if (saidTxt.length > 150) saidTxt = saidTxt.slice(0, 147).replace(/\s+\S*$/, '') + '…';
        var said = r.stance.label + (saidTxt ? ' — ' + saidTxt : '');
        // FRICTION IS A CHANGE OF LINE, NOT A CHANGE OF COLOUR. The spine keeps the
        // issue's colour — that vocabulary is load-bearing everywhere else on the
        // card and recolouring it here would break the one thing it promises. What
        // changes is the stroke: solid for a settled row, dotted where the standing
        // is contested, dashed where the whole row rests on one item. A reader
        // scanning a stack sees the unbroken ones as unbroken.
        var friction = (isContested(r) ? ' pdxwa-row-x' : '') + (isThin(r) ? ' pdxwa-row-thin' : '');
        var st = rowStanding(r);
        return '' +
          '<li class="pdxwa-row' + skin.cls + friction + '" style="--pdxwa-col:' + col + ';' + skin.style + '">' +
            '<div class="pdxwa-row-h">' +
              '<span class="pdxwa-row-issue">' +
                (skin.on ? '<span class="pdxwa-row-dot" aria-hidden="true"></span>' : '') +
                esc(r.label) + '</span>' +
              '<span class="pdxwa-row-verdict" style="color:' + col + ';">' +
                esc((r.verdict.ico || '') + ' ' + (r.verdict.label || '')) + '</span>' +
            '</div>' +
            // The flags sit under the verdict, not inside it. The verdict answers
            // "which direction"; these answer "how much weight will it carry" —
            // one chip trying to say both is what made a struck-down order read
            // as an unqualified win.
            (flagsHtml(r, 'pdxwa-row-flag') ? '<div class="pdxwa-row-flags">' + flagsHtml(r, 'pdxwa-row-flag') + '</div>' : '') +
            '<div class="pdxwa-row-step"><span class="pdxwa-row-k">Said</span>' +
              '<span class="pdxwa-row-v">' + esc(said) + '</span></div>' +
            '<div class="pdxwa-row-step"><span class="pdxwa-row-k">Did</span>' +
              '<span class="pdxwa-row-v">' + esc(_didLine(r)) + '</span></div>' +
            // Axis B, said in words, on the row it qualifies. Only where there is a
            // standing to report — a member's row has no such axis and inherits
            // nothing from this.
            (st
              ? '<div class="pdxwa-row-step pdxwa-row-standing"><span class="pdxwa-row-k">Standing</span>' +
                  '<span class="pdxwa-row-v">' + esc(standingLine(st)) + '</span></div>'
              : '') +
            '<div class="pdxwa-row-step"><span class="pdxwa-row-k">Receipts</span>' +
              '<span class="pdxwa-row-v">' + esc(r.evidence.total + ' sourced item' + (r.evidence.total === 1 ? '' : 's') +
                ' · ' + r.evidence.strength + ' evidence' +
                (isThin(r) ? ' — this row rests on one item' : '')) + '</span></div>' +
            (_setAsideLine(r)
              ? '<div class="pdxwa-row-step pdxwa-row-aside"><span class="pdxwa-row-k">Counter</span>' +
                  '<span class="pdxwa-row-v">' + esc(_setAsideLine(r)) + '</span></div>'
              : '') +
          '</li>';
      }).join('');
      var more = ranked.filter(function (r) { return r.tested; }).length - top.length;
      return '' +
        '<div class="pdxwa-rows">' +
          '<div class="pdxwa-rows-h">Where this number comes from — sharpest first</div>' +
          '<ul class="pdxwa-rows-l">' + rows + '</ul>' +
          '<button type="button" class="pdxwa-rows-go"' + jumpAttr('pdxsec-official-record') + '>' +
            esc(more > 0
              ? 'See the full breakdown — ' + more + ' more tested issue' + (more === 1 ? '' : 's') + ' →'
              : 'See the full breakdown →') +
          '</button>' +
        '</div>';
    } catch (e) { return ''; }
  }

  // ── PER-ISSUE CONSISTENCY OUTCOMES — the merged Say-vs-Do ────────────────────
  // 🧾 Say-vs-Do was a separate section with its own head, its own coverage line and
  // its own per-issue verdict on issues the 🏛️ Official Record had already judged. Two
  // grading systems in one scroll, refereed by a third section. It is now THIS: the
  // consistency half of the one score, reading one verdict per issue off the row model
  // that resolves both records (PDXConsistency.issueRow). Four outcomes, no percentage
  // of its own, one line per issue — the receipts stay one tap away in the Official
  // Record row and the Evidence drawer rather than being reprinted here at full depth,
  // which is where the old section's height came from.
  // `short` exists for the composition strip only. The full labels are sentences
  // because they head a group a reader has stopped to read; the strip is four chips
  // beside a number and has to survive a 360px screen, so each outcome also carries
  // the shortest noun that still means the same thing. Same tokens, same colours —
  // one vocabulary, printed at two lengths, so the strip can never name a bucket
  // the section below it does not have.
  var OUTCOMES = [
    { token: 'contradicts', label: 'Says one thing, does another', short: 'Contradicted', col: '#f89b9b' },
    { token: 'mixed',       label: 'Mixed',                        short: 'Mixed',        col: '#93c5fd' },
    { token: 'consistent',  label: 'Backed it up',                 short: 'Backed up',    col: '#6ee7a0' },
    { token: 'limited',     label: 'Not enough record yet',        short: 'Thin record',  col: '#9fb4d4' }
  ];
  // The strip reads worst-first for the same reason the rows do: a reader who stops
  // after the first chip should have stopped on the sharpest thing on file, not on
  // the largest. OUTCOMES is already in that order and the strip follows it.
  var COMP_ORDER = ['contradicts', 'mixed', 'consistent', 'limited'];
  // A TOKEN SET, not a count of groups. "The first two live groups" quietly promoted
  // whatever survived: a figure with no contradictions and no mixed rows had both
  // remaining buckets opened, including the "not enough record yet" pile that exists
  // precisely to be folded. Keyed on the outcome instead, an empty bucket above can
  // never promote a folded one — with one fallback, below, so the block is never
  // nothing but a fold header.
  var OUTCOME_OPEN = { contradicts: 1, mixed: 1 };

  // ── ONE BUCKETING, TWO SURFACES ────────────────────────────────────────────
  // The composition strip and the outcomes section must agree about what counts,
  // or the strip becomes a fifth opinion on the record. Both now read this. The two
  // exclusions are the ones outcomesHtml has always applied, moved rather than
  // rewritten: an outcome we do not name is not counted, and a "not enough record
  // yet" row with nothing stated is coverage — an issue we track and they have not
  // spoken on — which is a gap in the map, not a shape in the record.
  function outcomeBuckets(pid) {
    var ranked = rankedRows(pid);
    if (!ranked) return null;
    var b = { buckets: {}, total: 0, contested: 0, contestedClean: 0, thin: 0, tension: 0, ranked: ranked };
    ranked.forEach(function (r) {
      if (!OUTCOMES.some(function (o) { return o.token === r.verdict.token; })) return;
      if (!r.stance.label && r.verdict.token === 'limited') return;
      (b.buckets[r.verdict.token] = b.buckets[r.verdict.token] || []).push(r);
      b.total++;
      if (isThin(r)) b.thin++;
      if (isContested(r)) {
        b.contested++;
        // The row this whole pass exists for: the word and the action pointed the
        // same way, and the action did not survive. Counted separately because it
        // is invisible in every other tally on the card — it lands in the green
        // bucket, it raises the mean, and nothing about it is disputed except
        // whether it still stands.
        if (r.verdict.token === 'consistent') b.contestedClean++;
      }
      if (isTension(r)) b.tension++;
    });
    return b.total ? b : null;
  }

  // ── THE SHAPE BEHIND THE AVERAGE ───────────────────────────────────────────
  // A mean is a single number standing in for a distribution, and the distributions
  // it hides are not equally interesting. "82%" off eleven issues that all agree is
  // a different finding from "82%" off eleven issues where two flatly contradict —
  // and on this card, until now, they printed identically. This strip is the whole
  // fix: the same issues the section below judges, counted by outcome, next to the
  // number they produced.
  //
  // WHY COUNTS AND NOT PERCENTAGES. A second percentage beside the first is a second
  // score, and a reader will subtract them. These are counts, and the bar is drawn
  // with flex-grow off those counts, so the strip is a picture of a set rather than
  // a rival measurement of it.
  //
  // WHY IT CAN DISAGREE WITH THE PERCENTAGE, AND SAYS SO. The score weighs statements
  // by testability; the strip counts issues. Six thin issues and one dense one are
  // seven chips and nothing like seven equal contributions to the mean. The
  // clarifier line is not hedging — without it the two numbers look like an
  // arithmetic error, and a reader who spots one stops believing both.
  function compositionHtml(pid) {
    try {
      var b = outcomeBuckets(pid);
      // Below two issues there is no composition to show — one chip under a
      // percentage is not a distribution, it is the percentage again.
      if (!b || b.total < 2) return '';
      var live = COMP_ORDER.map(function (t) {
        var o = OUTCOMES.filter(function (x) { return x.token === t; })[0];
        return { o: o, n: (b.buckets[t] || []).length };
      }).filter(function (x) { return x.n > 0; });
      if (!live.length) return '';
      var bar = live.map(function (x) {
        return '<span class="pdxwa-comp-seg" style="flex-grow:' + x.n + ';background:' + x.o.col + ';"' +
          ' title="' + esc(x.n + ' ' + x.o.short.toLowerCase()) + '"></span>';
      }).join('');
      var chips = live.map(function (x) {
        return '<li class="pdxwa-comp-i">' +
            '<span class="pdxwa-comp-n" style="color:' + x.o.col + ';">' + x.n + '</span>' +
            '<span class="pdxwa-comp-lbl">' + esc(x.o.short) + '</span>' +
          '</li>';
      }).join('');
      // The one sentence a high, calm-looking record most needs printed on it.
      // Worst-first: a contested-but-matching row is the subtlest of these and the
      // easiest to lose, so it is said in its own clause rather than folded into a
      // count of "issues with something wrong".
      var notes = [];
      if (b.tension) {
        notes.push(b.tension + ' of these ' + b.total + ' issue' + (b.total === 1 ? '' : 's') +
          ' carr' + (b.tension === 1 ? 'ies' : 'y') + ' tension — a contradiction, a mixed result, or an action whose standing is contested. ' +
          'Tension leads the rows below, ahead of the agreement.');
      } else {
        notes.push('No contradictions, no mixed results and no contested standings on the tested issues. That is what the record shows, not a verdict on it.');
      }
      if (b.contestedClean) {
        notes.push(b.contestedClean + ' issue' + (b.contestedClean === 1 ? '' : 's') +
          ' counted as backed up rest' + (b.contestedClean === 1 ? 's' : '') +
          ' on an action that has since been blocked, struck down, overridden, rescinded, or left under a challenge with no ruling on file.');
      }
      if (b.thin) {
        notes.push(b.thin + ' rest' + (b.thin === 1 ? 's' : '') + ' on a single sourced item.');
      }
      return '' +
        '<div class="pdxwa-comp">' +
          '<div class="pdxwa-comp-h">The shape behind the average' +
            '<span class="pdxwa-comp-sub">' + esc(b.total + ' issue' + (b.total === 1 ? '' : 's') + ' with a verdict') + '</span>' +
          '</div>' +
          '<div class="pdxwa-comp-bar" aria-hidden="true">' + bar + '</div>' +
          '<ul class="pdxwa-comp-l">' + chips + '</ul>' +
          '<p class="pdxwa-comp-note">' + esc(notes.join(' ')) + '</p>' +
          '<p class="pdxwa-comp-note pdxwa-comp-fine">' +
            esc('The score above weighs statements by how testable they are; this counts issues. The two do not have to line up.') +
          '</p>' +
        '</div>';
    } catch (e) { return ''; }
  }

  function _outcomeRow(r) {
    var bits = [];
    if (r.evidence.total) bits.push(r.evidence.total + ' receipt' + (r.evidence.total === 1 ? '' : 's') + ' · ' + r.evidence.strength);
    if (r.verdict.basis === 'public_record') bits.push('public record');
    else if (r.evidence.actions) bits.push(_laneNoun(r, r.evidence.actions));
    if (r.setAside && r.setAside.count) {
      bits.push(r.setAside.count + ' ' + (r.setAside.direction === 'contradicts' ? 'against' : 'for') + ', set aside');
    }
    if (r.stance.label) bits.unshift(r.stance.label);
    // Same issue, same colour, one section down. These rows sit inside a group
    // whose heading already carries the outcome colour, so without this the only
    // colour on the line belonged to the bucket it happened to fall into — and
    // healthcare in one bucket looked like nothing to do with healthcare in the
    // next. The spine is the issue; the group heading keeps the outcome.
    var skin = issueSkin(r.key);
    // The same two flags the top rows carry, at one-line scale. Without them a
    // struck-down row and an in-force row are the same line in the same green
    // group, and the fold below the lead bucket is exactly where a reader stops
    // reading closely — which is the wrong place to keep the qualification.
    var flags = flagsHtml(r, 'pdxwa-oc-flag');
    var friction = (isContested(r) ? ' pdxwa-oc-row-x' : '') + (isThin(r) ? ' pdxwa-oc-row-thin' : '');
    // A stable per-issue id, so another surface can land a reader on THIS issue's
    // line in the score rather than on the top of the section. Built from the same
    // (pid, key) pair every surface already agrees on; see wordActionRowId() in
    // consistency.js, which is the only caller and which must build the same string.
    var rid = 'pdxwa-oc-' + _idPart(r.pid) + '-' + _idPart(r.key);
    return '<li class="pdxwa-oc-row' + skin.cls + friction + '" style="' + skin.style + '"' +
        ' id="' + esc(rid) + '" data-pdxwa-issue="' + esc(r.key) + '">' +
        '<span class="pdxwa-oc-issue">' + esc(r.label) + '</span>' +
        (bits.length ? '<span class="pdxwa-oc-meta">' + esc(bits.join(' · ')) + '</span>' : '') +
        flags +
      '</li>';
  }
  function outcomesHtml(pid) {
    try {
      var b = outcomeBuckets(pid);
      if (!b) return '';
      var buckets = b.buckets;
      var live = OUTCOMES.filter(function (o) { return (buckets[o.token] || []).length; });
      var blockOf = function (o) {
        var list = buckets[o.token];
        return '<div class="pdxwa-oc-grp" style="--pdxwa-col:' + o.col + ';">' +
            '<div class="pdxwa-oc-h"><span class="pdxwa-oc-n">' + list.length + '</span> ' + esc(o.label) + '</div>' +
            '<ul class="pdxwa-oc-l">' + list.map(_outcomeRow).join('') + '</ul>' +
          '</div>';
      };
      var isOpen = function (o) { return !!OUTCOME_OPEN[o.token]; };
      var openGrps = live.filter(isOpen);
      // Nothing sharp on file — open the highest-ranked bucket anyway, or the block
      // reduces to a lid the reader has to guess is worth opening.
      if (!openGrps.length) openGrps = live.slice(0, 1);
      var lead = openGrps.map(blockOf).join('');
      var restGrps = live.filter(function (o) { return openGrps.indexOf(o) === -1; });
      var rest = '';
      if (restGrps.length) {
        var restN = restGrps.reduce(function (n, o) { return n + buckets[o.token].length; }, 0);
        rest = '<!--PDXSP:lid id="wa-outcomes" label="Show ' + restN + ' more issue' +
          (restN === 1 ? '' : 's') + ' — ' + restGrps.map(function (o) { return o.label.toLowerCase(); }).join(', ') +
          '" defer-->' + restGrps.map(blockOf).join('') + '<!--PDXSP:/lid-->';
      }
      return '<div class="pdxwa-oc">' +
          '<div class="pdxwa-oc-t">Issue by issue — did the record back the word?</div>' +
          '<div class="pdxwa-oc-sub">' + esc('One verdict per issue. Where a formal action could test the claim it decided; where none could, the public record did — never both.') + '</div>' +
          lead + rest +
        '</div>';
    } catch (e) { return ''; }
  }

  // ── THE SLICE, UNDER THE RECORD ────────────────────────────────────────────
  // One narrow strip beneath the main number, for a figure serving right now. It
  // is deliberately NOT a second card, a second ring or a second big numeral:
  // "secondary" here means the reader's eye reaches the all-time number first and
  // arrives at this one already knowing what it is a slice of. Everything it
  // prints is scoped in words a reader can check — the term it covers, how much of
  // the same word it tested, and the fact that it is contained in the score above.
  //
  // It renders even when the two reads agree. A slice that vanishes when it matches
  // is a slice that only ever appears as bad news, and a reader who saw it last
  // month and not today cannot tell "the same" from "not shown".
  //
  // THE DIFFERENCE IS SAID IN WORDS, NOT IN STATISTICS. This strip used to report the
  // gap as "3 points lower than the full record" — accurate, and exactly the register
  // a first-time reader skips. It now names the number it is being compared against
  // ("lower than the 84% above") and says in the same breath why the two can differ:
  // the score above also weighs the terms before this one. A reader who reads nothing
  // else on this strip should still come away knowing which number is the record and
  // which is the slice of it.
  function scopeStripHtml(sr) {
    if (!sr || !sr.applicable || !sr.current) return '';
    var c = sr.current;
    var v = c.verdict;
    var col = (v && v.color) || '#9fb4d4';
    var has = c.pct !== null;
    var termLabel = sr.term ? 'Current term (' + sr.term + ')' : 'Current term';
    var mainPct = sr.main.pct;
    var hasMain = typeof mainPct === 'number';

    // The comparison, in one clause, always relative to the main number so the main
    // number stays the thing being talked about. "Slightly" and "far" carry the size
    // of the gap without asking a reader to hold two percentages in their head — and
    // the clause stops there. WHY the two can differ is said once, in the note below,
    // rather than twice on a line a phone would wrap to three.
    var rel;
    if (!has) {
      rel = 'Too little of their word has been tested inside this term alone to give it a figure of its own';
    } else if (!hasMain || sr.delta === null) {
      rel = 'A narrower read of the same word';
    } else if (sr.delta === 0) {
      rel = 'The same as the ' + mainPct + '% above';
    } else {
      var mag = Math.abs(sr.delta);
      rel = (mag <= 3 ? 'slightly ' : mag >= 15 ? 'far ' : '') +
            (sr.delta > 0 ? 'higher' : 'lower') + ' than the ' + mainPct + '% above';
      rel = rel.charAt(0).toUpperCase() + rel.slice(1);
    }

    var counted = c.coverage.tested + ' of ' + c.coverage.scorable + ' tested';

    // The containment sentence — the one line that stops the two figures being read
    // as rival systems. Its tail is the "why they can differ" answer, and it is only
    // asked when there ARE two figures that came out apart: promising a difference on
    // a strip showing the same number twice sends a reader hunting for one.
    var why = '.';
    if (has && hasMain) {
      why = sr.delta === 0 ? ', and here the two come out the same.' : ', which is why the two can differ.';
    }
    var note = 'Only the formal actions taken in this term. The score above is the whole record, ' +
               'every term — this one counted inside it' + why;

    return '' +
      '<div class="pdxwa-slice" style="--pdxwa-col:' + col + ';">' +
        // One glyph doing what a paragraph would otherwise have to: this row hangs
        // off the number above it. Decorative, so it is hidden from a screen reader,
        // which gets the same relationship spelled out in the note below.
        '<span class="pdxwa-slice-tie" aria-hidden="true">↳</span>' +
        '<span class="pdxwa-slice-k">' + esc(termLabel) + '</span>' +
        '<span class="pdxwa-slice-v">' + (has ? c.pct + '%' : '—') + '</span>' +
        '<span class="pdxwa-slice-n">' +
          esc(rel + ' · ' + counted) +
          '<span class="pdxwa-slice-note">' + esc(note) + '</span>' +
        '</span>' +
      '</div>';
  }

  // The primary accountability surface on a profile.
  var _seq = 0;
  function headlineHtml(pid, p) {
    try {
      if (!pid || !p) return '';
      // Both scopes, one call. `sr.main` is the all-time read and it is what every
      // line below prints; `sr.current` is the slice, and it is null for anyone the
      // slice would not mean anything for.
      var sr = scopedRead(pid, p);
      var r = sr.main;
      // Nothing said and nothing tracked. There is no read to print — a number and
      // a verdict over zero documented word would be an empty frame implying the
      // record should be here. But "we hold no word" is itself a fact about OUR
      // documentation, and on a spotlight-only profile it is the single most
      // useful thing this section can say. So the read disappears and the gap list
      // does not: if gaps.js has something honest to name, mount it alone, with no
      // metric, no verdict and no percentage anywhere near it. Same wrapper and
      // same data-pdxwa-body as the full section, so the warm-refresh below can
      // repaint this stub straight into the real read the day word lands.
      if (!r.coverage.word) {
        var stub = gapsHtml(pid, p, r);
        if (!stub) return '';
        return '' +
          '<span id="pdxsec-wordaction" class="pdx-nav-anchor" aria-hidden="true"></span>' +
          '<div class="modal-section pdxwa pdxwa-nowork" data-pdxwa="' +
            (String(pid) + '-' + (++_seq)).replace(/[^A-Za-z0-9_-]/g, '') +
            '" data-pdxwa-pid="' + esc(String(pid)) + '">' +
            '<div class="modal-section-title">' + FRAME.icon + ' ' + esc(FRAME.label) +
              '<span class="pdxwa-q">' + esc(FRAME.question) + '</span></div>' +
            '<div class="pdxwa-body" data-pdxwa-body>' +
              '<p class="pdxwa-line pdxwa-nowork-line">We do not yet hold documented word for this record, so there is ' +
                'nothing here to test against their formal actions. Here is what we are missing.</p>' +
              stub +
            '</div>' +
          '</div>';
      }

      var uid = (String(pid) + '-' + (++_seq)).replace(/[^A-Za-z0-9_-]/g, '');
      var name = (p.name || 'this official').split(' ').slice(-1)[0] || p.name || 'they';
      var v = r.verdict;
      var col = (v && v.color) || '#9fb4d4';
      var cls = (v && v.cls) || 'none';
      var hasPct = r.pct !== null;
      // The scope tag under the metric caption. Executive lane only: a member's
      // roll-call record is not term-scoped anywhere in this engine, so tagging it
      // "all time" would name a distinction that does not exist for them.
      var scopeTag = sr.lane === 'exec'
        ? '<div class="pdxwa-num-scope">' + esc(sr.scope ? sr.scope.label : 'All time') + '</div>'
        : '';

      var body = '' +
        '<div class="pdxwa-top">' +
          '<div class="pdxwa-num pdxwa-num-' + cls + '" style="--pdxwa-col:' + col + ';">' +
            '<div class="pdxwa-num-v">' + (hasPct ? r.pct + '%' : '—') + '</div>' +
            '<div class="pdxwa-num-l">' + esc(FRAME.metric) + '</div>' +
            scopeTag +
          '</div>' +
          '<div class="pdxwa-say">' +
            '<div class="pdxwa-verdict" style="color:' + col + ';">' +
              (v ? esc(v.ico + ' ' + v.label) : 'Building the record') + '</div>' +
            '<p class="pdxwa-line">' +
              // ONE clause. This line sits directly under the big number, and the
              // count it used to open with ("Weighed across 14 documented statements
              // that a formal action can test") is now said twice below it anyway —
              // once on the basis lid's own label, once in the coverage sentence
              // behind it. Two sentences here is what made the top of the card read
              // as a paragraph instead of a verdict.
              (hasPct
                ? esc((v && v.short) || '')
                : esc(thinCopy(r, name))) +
            '</p>' +
          '</div>' +
        '</div>' +
        // What the number means and what it does not claim, before anything else
        // has a chance to be read as a second finding.
        meansHtml(hasPct) +
        scopeStripHtml(sr) +
        // The shape behind the average. A single mean cannot say whether it came
        // from a record that agrees with itself everywhere or one pulling apart,
        // and the composition strip is the cheapest place to make that visible.
        compositionHtml(pid) +
        basisHtml(r) +
        // The three rows that carry the read, immediately under the digest. Nothing
        // else is allowed between the big % and these: the eye should reach a
        // concrete issue in one hop, not after a coverage panel.
        topRowsHtml(pid) +
        outcomesHtml(pid) +
        // What we do NOT have yet, named out loud. It used to sit directly under the
        // digest, which put a second block of coverage furniture in front of the
        // first issue row — the exact thing the trim was supposed to remove. It is
        // still said in full, one screen lower, where a reader who has taken the
        // read is ready to ask what is missing from it. Guarded: no gaps module, or
        // a well-documented record, means no extra furniture at all.
        gapsHtml(pid, p, r) +
        feedsHtml(pid, p, r) +
        methodHtml(r, pid);

      return '' +
        '<span id="pdxsec-wordaction" class="pdx-nav-anchor" aria-hidden="true"></span>' +
        '<div class="modal-section pdxwa" data-pdxwa="' + uid + '" data-pdxwa-pid="' + esc(String(pid)) + '">' +
          '<div class="modal-section-title">' + FRAME.icon + ' ' + esc(FRAME.label) +
            '<span class="pdxwa-q">' + esc(FRAME.question) + '</span></div>' +
          '<div class="pdxwa-body" data-pdxwa-body>' + body + '</div>' +
        '</div>';
    } catch (e) { return ''; }
  }

  // Re-render in place once the voting record warms. The word ledger is synchronous
  // and the action test is not, so the first paint is honest-but-thin and this is
  // what turns it into the real read. Bound once per mount; the listener drops
  // itself when its node leaves the DOM (a closed modal).
  // This repaint hands HTML straight to innerHTML, so the lid markers inside it never
  // meet the spine that resolves them. Resolve them here, in reclaim mode — the id
  // being re-registered belongs to the panel this repaint is replacing, not to a
  // second panel — and re-open the lid if the reader had already opened it.
  function lidify(html) {
    try {
      var SP = window.PDXProfileSpine;
      if (SP && typeof SP.applyLids === 'function') return SP.applyLids(html, true);
    } catch (e) {}
    return html;
  }
  function bind(uid, pid, p) {
    if (!window.addEventListener) return;
    var handler = function (ev) {
      var host = document.querySelector('[data-pdxwa="' + uid + '"]');
      if (!host) { window.removeEventListener('pdx-consistency-warm', handler); return; }
      if (ev && ev.detail && ev.detail.pid && String(ev.detail.pid) !== String(pid)) return;
      try {
        var fresh = headlineHtml(pid, p);
        if (!fresh) return;
        var slot = document.createElement('div');
        slot.innerHTML = lidify(fresh);
        var freshBody = slot.querySelector('[data-pdxwa-body]');
        var liveBody = host.querySelector('[data-pdxwa-body]');
        if (!freshBody || !liveBody) return;
        // WHAT THE READER HAD OPEN SURVIVES THE REPAINT. The shared toggle now
        // remembers this per profile (window._pdxRestoreDD), which is the version
        // that works for every fold on the page rather than only the ones that
        // happen to be inside this section when the record warms. The DOM scrape
        // stays as the fallback for the case where profiles-full.js has not
        // defined the helper — an in-place repaint that silently closes the basis
        // a reader is mid-way through is the exact failure this guards.
        var wasOpen = [];
        try {
          var open = liveBody.querySelectorAll('.dd-body.dd-open[id^="pdxsp-lid-"]');
          for (var i = 0; i < open.length; i++) if (open[i].id) wasOpen.push(open[i].id);
        } catch (e2) {}
        liveBody.innerHTML = freshBody.innerHTML;
        setTimeout(function () {
          try {
            if (typeof window._pdxRestoreDD === 'function') { window._pdxRestoreDD(liveBody); return; }
          } catch (e4) {}
          wasOpen.forEach(function (id) {
            try {
              var b = document.getElementById(id);
              if (b && !b.classList.contains('dd-open') && typeof window.toggleDD === 'function') window.toggleDD(id);
            } catch (e3) {}
          });
        }, 0);
      } catch (e) {}
    };
    window.addEventListener('pdx-consistency-warm', handler);
  }

  // Mountable wrapper: emit the section AND arm its refresh. Call sites render the
  // string; the arming happens on the next tick, once the string is in the DOM.
  function sectionHtml(pid, p) {
    var html = headlineHtml(pid, p);
    if (!html) return '';
    var m = /data-pdxwa="([^"]+)"/.exec(html);
    if (m) { try { setTimeout(function () { bind(m[1], pid, p); }, 0); } catch (e) {} }
    return html;
  }

  // ── THE PROFILE HERO ───────────────────────────────────────────────────────
  // One number leads a profile, and it is this one. The hero used to print the
  // pledge-only rate captioned "Promises", which put a 73% at the top of a
  // profile whose Word vs Action section read 82% and whose Official Record read
  // something else again — three headline percentages for one question. The
  // pledge rate is now the top TIER of this read, so the hero and the section
  // cannot disagree: they call the same read() on the same ledger.
  //
  // The markup is emitted here rather than in the profile builder so the first
  // paint and the post-warm re-render are the same code path — the ring could
  // otherwise drift from the section it is a summary of.
  function heroRead(pid, p) {
    try {
      if (!pid || !p) return null;
      var sr = scopedRead(pid, p);
      var r = sr.main;
      var c = r.coverage, v = r.verdict;
      var hasPct = r.pct !== null;
      var sub;
      if (hasPct) sub = c.tested + ' of ' + c.scorable + ' tested';
      // One phrase for this wait, shared with the Voting Record Highlights
      // placeholder in profiles-full.js. Both are waiting on the same roll-call
      // fetch and can be on screen together on a cold open, so two wordings read
      // as two different jobs in progress.
      else if (c.warming) sub = 'Loading the record…';
      else if (!c.word) sub = '';
      else if (!c.scorable) sub = 'Nothing said independently on file';
      else if (!c.tested) sub = c.scorable + ' on file, none tested yet';
      else sub = c.tested + ' of ' + r.floors.items + ' tested needed';
      // THE ONE PLACE THE HERO SAYS WHICH RECORD. There is room for two short
      // lines under the ring and no more, so the scope is appended to the count
      // rather than given a line of its own — three words that stop the profile's
      // loudest number from being a number over an unstated span of time. The
      // current-term slice itself is NOT printed here: the hero has one number by
      // design, and a second percentage above the fold is the exact thing the
      // pledge chip was removed for.
      // The wording is TAKEN FROM the scope's own label rather than typed here, so
      // the ring and the card under it cannot drift into two names for one span.
      if (hasPct && sr.lane === 'exec' && sr.scope && sr.scope.label) {
        sub += ' · ' + sr.scope.label.toLowerCase();
      }
      return {
        read: r,
        scoped: sr,
        word: c.word,
        pct: r.pct,
        // Fail closed in the hero too: below the floors there is a dash or a
        // waiting mark, never a number borrowed from a narrower lane.
        text: hasPct ? (r.pct + '%') : (c.warming ? '⏳' : '—'),
        color: hasPct ? ((v && v.color) || '#9fb4d4') : '#9fb4d4',
        caption: FRAME.caption,
        scopeLabel: (sr.lane === 'exec' && sr.scope) ? sr.scope.label : '',
        verdict: v, token: r.token, publishable: r.publishable,
        tested: c.tested, scorable: c.scorable, warming: c.warming,
        sub: sub
      };
    } catch (e) { return null; }
  }

  // THE HERO PLEDGE CHIP IS GONE. It rendered "🤝 6 kept · 6 broken · 2 pending"
  // directly beneath the one percentage, in the header, above the fold — promise
  // counts as the second thing a reader met on the profile. Counts are not a
  // rate, but three numbers sitting under one number still read as two findings,
  // and on a president that chip was the loudest promise chrome on the page.
  // Pledges are the top tier INSIDE the score above; they are named in the feeds
  // list, where an input belongs, and the ledger itself is in the drawers.
  // `opts.pledge` is still accepted by heroInner so no caller has to change
  // shape — nothing reads it any more.

  function heroInner(pid, p, opts) {
    opts = opts || {};
    var h = heroRead(pid, p);
    // No word on file at all: there is nothing to test, so there is no primary
    // number — not a zero, and never the pledge rate standing in for one. The
    // promise tracker's own honest states are used instead, passed in by the
    // caller because they belong to that lane.
    if (!h || !h.word) {
      if (opts.trackingLabel) {
        return '' +
          '<div class="flex-shrink-0 w-20 h-20 rounded-2xl flex flex-col items-center justify-center profile-score-tracking">' +
            '<div class="pdxwa-hero-wait" aria-hidden="true">⏳</div>' +
            '<div class="pdxwa-hero-cap pdxwa-hero-cap-wait">' + esc(opts.trackingLabel) + '</div>' +
          '</div>' +
          (opts.trackingNote ? '<div class="profile-score-track-note">' + esc(opts.trackingNote) + '</div>' : '');
      }
      return '' +
        '<div class="flex-shrink-0 w-20 h-20 rounded-2xl flex flex-col items-center justify-center pdxwa-hero-none">' +
          '<div class="pdxwa-hero-v" style="color:#9fb4d4;">—</div>' +
          '<div class="pdxwa-hero-cap">Monitoring</div>' +
        '</div>';
    }
    var radius = 28, circ = 2 * Math.PI * radius;
    var dash = (h.pct === null ? 0 : h.pct / 100) * circ;
    return '' +
      '<button type="button" class="pdxwa-hero-jump"' + jumpAttr('pdxsec-wordaction') +
        ' aria-label="' + esc(FRAME.label + ': ' + h.text + ' ' + FRAME.metric +
          (h.scopeLabel ? ', ' + h.scopeLabel.toLowerCase() : '') + '. Open the full breakdown.') + '">' +
        '<span class="score-ring w-20 h-20 flex-shrink-0">' +
          '<svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">' +
            '<circle cx="40" cy="40" r="' + radius + '" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="6"/>' +
            (dash > 0
              ? '<circle cx="40" cy="40" r="' + radius + '" fill="none" stroke="' + h.color + '" stroke-width="6" ' +
                'stroke-dasharray="' + dash.toFixed(1) + ' ' + circ.toFixed(1) + '" stroke-linecap="round" ' +
                'style="transition:stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1);filter:drop-shadow(0 0 4px ' + h.color + '66)"/>'
              : '') +
          '</svg>' +
          '<span class="pdxwa-hero-in">' +
            '<span class="pdxwa-hero-v" style="color:' + h.color + ';">' + esc(h.text) + '</span>' +
            '<span class="pdxwa-hero-cap">' + esc(h.caption) + '</span>' +
          '</span>' +
        '</span>' +
      '</button>' +
      '<div class="pdxwa-hero-sub">' + esc(h.sub) + '</div>';
  }

  function bindHero(uid, pid, p, opts) {
    if (!window.addEventListener) return;
    var handler = function (ev) {
      var host = document.querySelector('[data-pdxwa-hero="' + uid + '"]');
      if (!host) { window.removeEventListener('pdx-consistency-warm', handler); return; }
      if (ev && ev.detail && ev.detail.pid && String(ev.detail.pid) !== String(pid)) return;
      try {
        var fresh = heroInner(pid, p, opts);
        if (fresh) host.innerHTML = fresh;
      } catch (e) {}
    };
    window.addEventListener('pdx-consistency-warm', handler);
  }

  // Mountable hero: the stack markup plus its warm-refresh, so the ring turns
  // from "⏳ Loading the record…" into the real read without a reload — and
  // without the reflow that a differently-sized replacement would cause, since
  // the sub-line reserves its height in CSS.
  function heroMount(pid, p, opts) {
    try {
      var uid = (String(pid) + '-hero' + (++_seq)).replace(/[^A-Za-z0-9_-]/g, '');
      var inner = heroInner(pid, p, opts);
      if (!inner) return '';
      try { setTimeout(function () { bindHero(uid, pid, p, opts); }, 0); } catch (e) {}
      return '<div class="profile-score-stack pdxwa-hero" data-pdxwa-hero="' + uid + '">' + inner + '</div>';
    } catch (e) { return ''; }
  }

  // ── the dots rows, as markup ───────────────────────────────────────────────
  function dotRowHtml(d) {
    var v = d.verdict;
    var col = (v && v.color) || '#9fb4d4';
    var quote = d.word ? String(d.word) : '';
    if (quote.length > 220) quote = quote.slice(0, 217).replace(/\s+\S*$/, '') + '…';
    var src = (d.sources && d.sources[0]) || null;
    // What was counted, in the noun of the lane that counted it. "3 judged votes" is
    // false about a president — they cast none — and this row is the flagship Word vs
    // Action surface, so it is the last place a borrowed noun should survive.
    var jn = (d.outcome && d.outcome.basis === 'exec-actions') ? 'judged action' : 'judged vote';
    return '' +
      '<li class="pdxwa-dot" style="--pdxwa-col:' + col + ';">' +
        '<div class="pdxwa-dot-head">' +
          '<span class="pdxwa-dot-tier">' + d.tier.ico + ' ' + esc(d.tier.label) + '</span>' +
          '<span class="pdxwa-dot-title">' + esc(d.title) + '</span>' +
        '</div>' +
        '<div class="pdxwa-dot-step pdxwa-dot-word">' +
          '<span class="pdxwa-dot-k">They said</span>' +
          '<span class="pdxwa-dot-v">' + (quote ? esc(quote) : esc('They campaign on ' + d.title + '.')) +
            (src && src.url ? ' <a class="pdxwa-dot-src" href="' + esc(src.url) + '" target="_blank" rel="noopener noreferrer">' + esc(src.label || 'source') + '</a>'
                            : (src && src.label ? ' <span class="pdxwa-dot-src">' + esc(src.label) + '</span>' : '')) +
          '</span>' +
        '</div>' +
        '<div class="pdxwa-dot-step pdxwa-dot-act">' +
          '<span class="pdxwa-dot-k">They did</span>' +
          '<span class="pdxwa-dot-v">' +
            (d.actions.length
              // `a.text` is the citation — document · class of power · standing. `a.plain`
              // is the one sentence saying what the instrument did and how that touches
              // THIS issue, curated per (action, issue) pair in the executive seed. It
              // fails closed: a proof line with no sentence prints the citation alone
              // rather than borrowing prose from somewhere it does not belong.
              ? d.actions.map(function (a) {
                  return '<span class="pdxwa-dot-act-1">' + esc(a.text) +
                    (a.plain ? '<span class="pdxwa-dot-why">' + esc(a.plain) + '</span>' : '') +
                    '</span>';
                }).join('')
              : '<span class="pdxwa-dot-none">No formal action on this issue is on record yet.</span>') +
          '</span>' +
        '</div>' +
        '<div class="pdxwa-dot-step pdxwa-dot-out">' +
          '<span class="pdxwa-dot-k">So</span>' +
          '<span class="pdxwa-dot-v" style="color:' + col + ';">' +
            (v ? esc(v.ico + ' ' + v.label) : 'Not yet testable') +
            (typeof d.outcome.judged === 'number' && d.outcome.judged > 0
              ? '<span class="pdxwa-dot-j">' + d.outcome.judged + ' ' + jn + (d.outcome.judged === 1 ? '' : 's') + '</span>' : '') +
          '</span>' +
        '</div>' +
      '</li>';
  }

  function dotsHtml(pid, p, opts) {
    try {
      var rows = dots(pid, p, opts);
      if (!rows.length) return '';
      return '<ul class="pdxwa-dots">' + rows.map(dotRowHtml).join('') + '</ul>';
    } catch (e) { return ''; }
  }

  window.PDXWordAction = {
    FRAME: FRAME,
    TIERS: TIERS,
    TIER_ORDER: TIER_ORDER,
    MIN_TESTED_ITEMS: MIN_TESTED_ITEMS,
    MIN_TESTED_WEIGHT: MIN_TESTED_WEIGHT,
    EVIDENCE_CAP: EVIDENCE_CAP,
    // Pure reads — no DOM, no fetch, safe to call from anywhere.
    wordLedger: wordLedger,
    read: read,
    // Both scopes in one call: the all-time read every headline prints, plus the
    // current-term slice for a figure who is serving. See scopedRead().
    scopedRead: scopedRead,
    issueRead: issueRead,
    heroRead: heroRead,
    dots: dots,
    brandingIssueKey: brandingIssueKey,
    isIndependentWord: isIndependentWord,
    pledgeAggregate: pledgeAggregate,
    // Renderers. sectionHtml() also arms the warm-refresh; headlineHtml() is the
    // pure string for anything that mounts it itself.
    sectionHtml: sectionHtml,
    headlineHtml: headlineHtml,
    feedsHtml: feedsHtml,
    // The profile hero. heroMount() is the one call sites want: markup + refresh.
    heroMount: heroMount,
    heroHtml: heroInner,
    dotsHtml: dotsHtml
  };
})();
