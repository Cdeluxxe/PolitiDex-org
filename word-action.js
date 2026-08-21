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
  // THE TWO LID KEYS THIS SECTION OWNS, in one place, because two of them are
  // written as a string into an HTML comment and read back as a DOM id by three
  // different callers. `wa-index` holds the tabbed issue index; applyLids() mints
  // its body as `pdxsp-lid-wa-index`, and revealIndex() has to name that id
  // BEFORE the index exists on the page — a deferred body cannot be found by
  // walking up from content that has not been mounted yet.
  var LID_INDEX_KEY = 'wa-index';
  var LID_INDEX_ID = 'pdxsp-lid-' + LID_INDEX_KEY;
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
  // WHETHER THERE IS A SLICE AT ALL, decided without taking a read. Both rules
  // above are properties of the figure — which lane they are on and whether they
  // are serving — so a surface that only needs to know "is a current-term note
  // true here" can ask without paying for a second scoring pass. `scopedRead`
  // asks the same function, so the strip inside the card and the note in the
  // letterhead cannot come to different conclusions about the same person.
  function sliceApplies(pid) {
    var out = { lane: isExecLane(pid) ? 'exec' : 'record', serving: false, applicable: false, term: null };
    if (out.lane !== 'exec') return out;
    var cs = C();
    try { out.serving = !!(cs && cs.execActions && cs.execActions.serving(pid)); } catch (e) { out.serving = false; }
    if (!out.serving) return out;
    out.applicable = true;
    try { out.term = (cs.execActions.currentTerm && cs.execActions.currentTerm(pid)) || null; } catch (e) { out.term = null; }
    return out;
  }

  function scopedRead(pid, p) {
    var main = read(pid, p, { termScope: 'all_time' });
    var sl = sliceApplies(pid);
    var out = {
      main: main, current: null,
      scope: main.termScope,
      lane: sl.lane,
      serving: sl.serving, applicable: sl.applicable, term: sl.term, differs: false, delta: null
    };
    if (!out.applicable) return out;
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

    // NO LID OF ITS OWN ANY MORE. The basis used to carry a `wa-basis` sentinel and
    // fold itself, which was right when it was one of three separate disclosures
    // stacked between the shape graph and the tree. All three now sit inside ONE
    // control (see apparatusHtml), and applyLids() refuses to fold any region
    // holding another PDXSP sentinel — a nested marker here would silently unfold
    // the whole apparatus and put the tier table back in the default read path.
    // The tested count it used to carry in its label moved to that outer label.
    return '<div class="pdxwa-basis">' +
        '<div class="pdxwa-basis-h">What this score is built from</div>' +
        digestHtml +
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
    // NOT A <details> ANY MORE. The method prose was the third of three separate
    // disclosures a reader had to get past — or decide to ignore — before the issue
    // tree. It is now inside the one apparatus control, and a fold inside a fold is
    // a second tap for the reader who has already said yes once. The class name is
    // kept because gaps.js aims its "How this is counted" row at it.
    return '' +
      '<div class="pdxwa-method">' +
        '<div class="pdxwa-method-h">How this is counted</div>' +
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
            (ex ? 'Where the standing of a supporting action is contested — blocked, struck down, overridden, rescinded or under an unresolved challenge — that issue’s row says so beside its verdict rather than in place of it, both in this score’s index and on 🌳 All Issues by Topic. '
                : '') +
            'A record that reads as one long agreement is a fact about the record, not a grade for it: the ' +
            'issue-by-issue composition under the score is there so the shape behind the average is visible.</p>' +
          scopeP +
        '</div>' +
      '</div>';
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

  // ── ONE CONTROL FOR THE WHOLE APPARATUS ────────────────────────────────────
  // ⚖️ Word vs Action is the last thing between a reader and 🌳 All Issues by
  // Topic, and on a dense profile most of its height was never the score: it was
  // the machinery behind the score. The basis table, the sharpest-first sample
  // rows, the coverage ask, the feed map and the method essay are all real and all
  // stay — but they answer questions a reader asks AFTER the figure, not before
  // the issue list, and each of them used to arrive as its own disclosure. Three
  // separate folds stacked in a row read as a wall whether or not any of them is
  // open.
  //
  // So they collapse into ONE lid. What is above it is the score argument — the
  // figure, the tally, what it measures, the term slice, the shape graph and the
  // sentence that explains the shape. What is below it is the tree.
  //
  // NOT DEFERRED, deliberately, and this is the one place the cost is worth
  // naming. A deferred lid unmounts its body, and three things inside this one
  // need to exist as DOM from first paint: gaps.js hydrates its lead rows and
  // hands its own rows to the thread observer on render, its "How this is counted"
  // row resolves .pdxwa-method by query, and the feed rows are jump targets. The
  // index above it IS deferred, because it is 80% of the section's markup and
  // nothing reaches into it except a bucket tap that can mount it first.
  function apparatusHtml(pid, p, r) {
    try {
      var inner = basisHtml(r) + topRowsHtml(pid) + gapsHtml(pid, p, r) +
                  feedsHtml(pid, p, r) + methodHtml(r, pid);
      if (!inner) return '';
      // Numbers and ASCII only: the sentinel is parsed out of an HTML comment by
      // applyLids(), which escapes the label when it emits it. The tested count is
      // the one the basis lid used to carry in its own label — it is the honest
      // promise of what opening this shows, and it is the reason the control is
      // worth a tap.
      var label = 'How this score is built · basis, method and sources · ' +
        r.coverage.tested + ' of ' + r.coverage.scorable + ' tested';
      return '<div class="pdxwa-how">' +
          '<!--PDXSP:lid id="wa-how" label="' + label + '"-->' + inner + '<!--PDXSP:/lid-->' +
        '</div>';
    } catch (e) { return ''; }
  }

  // ── THE SCORE'S OWN INDEX, BEHIND ONE CONTROL ──────────────────────────────
  // The tabbed index below used to be the largest single thing on a profile — on a
  // dense record it is four fifths of this section's markup — and it browses the
  // same person × issue population the tree browses one section later. Two open
  // full issue browsers, one above the other, is the duplication this pass removes:
  // the tree owns browse-all, and the label on this control says so.
  //
  // It is DEMOTED, NOT DELETED, because it answers a question the tree does not:
  // "which issues produced this number, sorted by what the record did to them."
  // The shape graph and the letterhead tally above are navigators INTO it, and
  // those still work — see revealIndex(), which mounts and opens this fold before
  // it selects a bucket.
  //
  // Deferred: nothing outside reaches in by id except that bucket tap, and holding
  // it as a string is the difference between a hundred thousand characters of DOM
  // before the tree and twenty.
  function indexLidHtml(pid) {
    try {
      var oc = outcomesHtml(pid);
      if (!oc) return '';
      var b = outcomeBuckets(pid);
      var n = (b && b.total) || 0;
      var label = 'Issues in this score · ' + n + ' issue' + (n === 1 ? '' : 's') +
        ' by result — the full map is All Issues by Topic, below';
      return '<div class="pdxwa-idxlid">' +
          '<!--PDXSP:lid id="' + LID_INDEX_KEY + '" label="' + label + '" defer-->' +
          oc +
          '<!--PDXSP:/lid-->' +
        '</div>';
    } catch (e) { return ''; }
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
          // NO LID OF ITS OWN ANY MORE. This panel used to fold behind a `wa-feeds`
          // sentinel whose label was its heading. It now sits inside the one
          // apparatus control with the basis and the method, so the heading comes
          // back as a heading — and the sentinel has to go, because applyLids()
          // leaves any region holding a nested PDXSP marker fully open.
          '<h4 class="pdxwa-feeds-h">What feeds this score</h4>' +
          '<ul class="pdxwa-feeds-l">' + rows.map(feedRowHtml).join('') + '</ul>' +
          '<p class="pdxwa-feeds-foot">One score, several layers of evidence. The solid rows are what the ' +
            'percentage is made of; the faded ones are the receipt and context layers that document it and ' +
            'change no number. Each section below shows its own working — counts, verdicts and sources — and ' +
            'this is the only place any of it is pooled into a percentage.</p>' +
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
  //
  // MEMOIZED — see THE DERIVATION EPOCH in stance-helpers.js. "Three surfaces" is
  // now an undercount: the hero mount, the ledger read, the section, the gateway
  // and the warm repaint all land here, and the sort underneath it is over the
  // full row model. Cached per politician per epoch and handed back by reference —
  // every caller reads the array and none of them writes to it.
  //
  // Two invalidation signals, not one. The epoch covers data arriving underneath
  // the row model. The identity of the two functions that build it covers the row
  // model being supplied from somewhere else entirely — which is what a harness
  // does when it swaps PDXConsistency.issueRows to drive this block with a fixed
  // set of rows. A cache that answered from the previous source would be reporting
  // one politician's index while a different one was asked for.
  //
  // The key carries the engine's active exec term scope for the third: that scope
  // is a setting inside consistency.js read below issueRows(), not an argument to
  // it, so "this politician, this epoch" does not name one answer. The current-term
  // slice of a presidential profile is rendered beside the all-time one.
  var _rrCache = {}, _rrEpoch = 0;
  function scopeKey() {
    try {
      var X = window.PDXConsistency && window.PDXConsistency.execActions;
      return (X && typeof X.scope === 'function' && (X.scope() || {}).key) || '';
    } catch (e) { return ''; }
  }
  function rankedRows(pid) {
    var CS = window.PDXConsistency;
    if (!CS || typeof CS.issueRows !== 'function' || typeof CS.rankIssueRows !== 'function') return null;
    var ep = (typeof window.PDXDataEpoch === 'function') ? window.PDXDataEpoch() : 0;
    if (_rrEpoch !== ep) { _rrCache = {}; _rrEpoch = ep; }
    var k = String(pid == null ? '' : pid) + '||' + scopeKey();
    var hit = _rrCache[k];
    if (hit && hit.src === CS.issueRows && hit.rank === CS.rankIssueRows) return hit.val;
    var v;
    try { v = CS.rankIssueRows(CS.issueRows(pid)); } catch (e) { return null; }
    // Only a real answer is cached. A null from a module that has not finished
    // loading is a fact about this instant, not about this politician.
    if (v) _rrCache[k] = { src: CS.issueRows, rank: CS.rankIssueRows, val: v };
    return v;
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
  // ── ONE MEASURE, SAID IN THE OPEN ───────────────────────────────────────────
  // `isThin` above counts ITEMS. A finding built on six recorded votes is not thin
  // by that measure — and if all six are roll calls on the same bill, it rests on
  // exactly one document, which is the thing a hostile reader will find first and
  // the thing this row was not saying anywhere a reader could see it. The dossier
  // knew; the face did not.
  //
  // THE DEFINITION IS NOT RESTATED HERE. PDXConsistency.instruments owns it — one
  // distinct instrument across the judged evidence set, by the same identity the
  // dossier prints — so the chip and the list a reader opens to check the chip
  // cannot disagree.
  //
  // TESTED, FORMAL ROWS ONLY. rowResult()'s ('tested' + 'Direction match') pair is
  // the same gate the per-issue percentage uses, so the marker appears on exactly
  // the rows that carry a formal figure and never on a row the public lane
  // resolved. The public lane is not in the score and it is not in this.
  //
  // IT IS DEPTH, NOT A DIFFERENT OUTCOME. Nothing below reads it: the verdict, its
  // word, its colour and its percentage are identical with and without the chip. A
  // single-measure `contradicts` still says contradicts, in the same red, at the
  // same size.
  function _rowResult(r) {
    try {
      var CS = window.PDXConsistency;
      return (CS && typeof CS.rowResult === 'function') ? CS.rowResult(r) : null;
    } catch (e) { return null; }
  }
  function singleMeasure(r) {
    if (!r || !r.verdict || r.verdict.basis === 'public_record') return null;
    var res = _rowResult(r);
    if (!res || res.state !== 'tested' || res.metric !== 'Direction match') return null;
    var CS = window.PDXConsistency;
    var sp = null;
    try {
      if (CS && CS.instruments && typeof CS.instruments.row === 'function') sp = CS.instruments.row(r);
    } catch (e) { sp = null; }
    return (sp && sp.single) ? sp : null;
  }
  // The friction chips a row can carry, beside its verdict rather than instead of
  // it. Short and uniform on purpose: the detail is one line down, and a chip long
  // enough to need its own line stops being a chip.
  //
  // "Single measure" STANDS IN FOR "Thin evidence" when both apply, and only then.
  // A one-item row is a one-document row by construction, so printing both says one
  // fact twice — and the document sentence is the stronger of the two, because it
  // is also true of the six-votes-on-one-bill row that the item count calls deep.
  // Nothing is softened by the swap: every row that used to carry a thin chip still
  // carries a chip, and it names a narrower limit than the one it replaced.
  function flagsHtml(r, cls) {
    var out = '';
    var one = singleMeasure(r);
    if (isContested(r)) out += '<span class="' + cls + ' ' + cls + '-x">Standing contested</span>';
    if (one) {
      out += '<span class="' + cls + ' ' + cls + '-one" data-pdxwa-docs="1"' +
        ' title="' + esc(oneMeasureTitle(one)) + '">Single measure</span>';
    } else if (isThin(r)) {
      out += '<span class="' + cls + ' ' + cls + '-thin">Thin evidence</span>';
    }
    return out;
  }
  // The chip's own long form, for the title and for anywhere with room for a
  // sentence. It names the document when the file carries a name for it, because
  // "one document" a reader cannot identify is a claim they cannot check.
  function oneMeasureTitle(sp) {
    var n = (sp && sp.judged) || 0;
    var base = 'This finding rests on a single measure' +
      (n > 1 ? ' — ' + n + ' judged actions, all on the same document' : '') + '.';
    return (sp && sp.ident) ? base + ' ' + sp.ident : base;
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
      // ONE RESERVED SLOT FOR AXIS B. Tension-first is not the same as
      // contested-visible. Every row in the tension half either contradicts or came
      // out mixed, so once the record holds three of those the contested row ranks
      // fourth and Axis B leaves the card altogether — the exact failure this
      // treatment exists to prevent, arriving through the row cap instead of the row
      // template. The standing chip, the standing line and the dotted stroke are all
      // still written; there is simply no row left to carry them. So when nothing
      // rendered rests on a contested action while an eligible row does, the
      // lowest-ranked rendered row gives up its slot to the highest-ranked contested
      // one. It is one substitution and never a re-sort: the rows that keep their
      // slots keep their order, and a card whose top rows are already contested is
      // left exactly as it was.
      if (top.length === TOP_ROWS_MAX && !top.some(isContested)) {
        for (var xi = 0; xi < elig.length; xi++) {
          if (isContested(elig[xi])) { top[TOP_ROWS_MAX - 1] = elig[xi]; break; }
        }
      }
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
      // COLLAPSED, AND BELOW THE INDEX. These three rows are the deepest thing on
      // the card: a full Said → Did → Standing → Receipts chain each, four or five
      // lines apiece. Open by default they were roughly a phone screen of prose
      // sitting between the reader and the list they had just chosen a bucket in.
      // The heading still says exactly what is inside, and one tap still opens it —
      // what changed is that the reader chooses to spend the screen on it.
      return '' +
        '<details class="pdxwa-rows">' +
          '<summary class="pdxwa-rows-h">Where this number comes from — sharpest first' +
            '<span class="pdxwa-rows-c">' + esc(top.length + ' issue' + (top.length === 1 ? '' : 's')) + '</span>' +
          '</summary>' +
          '<div class="pdxwa-rows-body">' +
            '<ul class="pdxwa-rows-l">' + rows + '</ul>' +
            '<button type="button" class="pdxwa-rows-go"' + jumpAttr('pdxsec-official-record') + '>' +
              esc(more > 0
                ? 'See the full breakdown — ' + more + ' more tested issue' + (more === 1 ? '' : 's') + ' →'
                : 'See the full breakdown →') +
            '</button>' +
          '</div>' +
        '</details>';
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
  // ONE VOCABULARY, PRINTED AT THREE LENGTHS. `label` is a sentence, because it heads
  // a bucket a reader has stopped to read. `short` is the shortest noun that still
  // means the same thing — it is what the composition strip, the bucket switcher and
  // the row-level result cue all print, and it is what the issue dossier repeats in
  // its own header when a row is tapped. `sub` says what the bucket means in one
  // clause, under the heading, for a reader who has never seen this card before.
  // Same tokens, same colours, everywhere: the strip can never name a bucket the
  // index below it does not have, and the dossier can never open under a word the
  // index did not use to get there.
  //
  // THE SHORT NOUN IS THE ONE THAT TRAVELS ALONE. `label` and `sub` are printed
  // together, so the heading has a clause under it saying whose gap this is. `short`
  // is printed by itself — on the composition strip, on the bucket switcher, on the
  // row-level cue, in the dossier header and on the profile rail — and for a long
  // time that word was "Thin record". Over a member with four hundred votes on file
  // and no statement we could test, that is a claim about THEIR record made out of a
  // shortfall in OURS, and it is the same false sentence the row faces already refuse
  // to print (see _stResult's 'Not scored yet' and scripts/test-thin-record-honesty).
  // "Not enough on file" says the true thing in the same space. The token, its colour,
  // its ordering and everything it counts are untouched — this is the noun only.
  //
  // `secondary` marks the one bucket that is not a finding. "Not enough record yet"
  // is coverage — an issue we track, a position they stated, and nothing on file
  // able to test it. Its subtitle can say "Stated, but…" and stay true because
  // outcomeBuckets() admits no wordless row into this bucket (see the `!r.stance.label`
  // guard there): a row we hold instruments for and no position of theirs is not a
  // result this index can file, and it is answered on 🌳 All Issues by Topic and in
  // the issue dossier instead, which state the inventory and say whose gap it is. It is listed,
  // counted and reachable like every other bucket, and it is drawn quieter and
  // ordered last, because a reader scanning results should not have to work out
  // which pile is a result.
  var OUTCOMES = [
    { token: 'contradicts', label: 'Says one thing, does another', short: 'Contradicted', col: '#f89b9b',
      sub: 'The record pushes back on what they said.' },
    { token: 'mixed',       label: 'Mixed',                        short: 'Mixed',        col: '#93c5fd',
      sub: 'The record goes both ways on this one.' },
    { token: 'consistent',  label: 'Backed it up',                 short: 'Backed up',    col: '#6ee7a0',
      sub: 'The record points the same way as the word.' },
    { token: 'limited',     label: 'Not enough record yet',        short: 'Not enough on file',  col: '#9fb4d4',
      secondary: true, sub: 'Stated, but nothing on file yet can test it. Coverage, not a result.' }
  ];
  function outcomeFor(token) {
    for (var i = 0; i < OUTCOMES.length; i++) if (OUTCOMES[i].token === token) return OUTCOMES[i];
    return null;
  }
  // The strip reads worst-first for the same reason the rows do: a reader who stops
  // after the first chip should have stopped on the sharpest thing on file, not on
  // the largest. OUTCOMES is already in that order and the strip follows it.
  var COMP_ORDER = ['contradicts', 'mixed', 'consistent', 'limited'];
  // WHICH BUCKET IS SELECTED WHEN THE INDEX FIRST PAINTS. A TOKEN SET, not a count
  // of live buckets: "the first live bucket" quietly promoted whatever survived, so
  // a figure with no contradictions and no mixed rows opened on the "not enough
  // record yet" pile. Keyed on the outcome instead, an empty bucket above can never
  // promote the coverage pile — with one fallback, below, so the index never opens
  // on nothing.
  var OUTCOME_OPEN = { contradicts: 1, mixed: 1 };

  // ── ONE OPEN BUCKET, DECIDED ONCE ──────────────────────────────────────────
  // Two surfaces now have to agree about which bucket is open: the shape strip,
  // which is the gateway a reader taps, and the index below it, which holds the
  // list. If each worked it out for itself the strip could highlight Contradicted
  // over a panel showing Backed up — the gateway pointing at the wrong door.
  //
  // The rule, unchanged from the index's own: the sharpest outcome that actually
  // HAS rows; then any bucket with rows; and only as a last resort the first chip,
  // so an index can never open on nothing. Keyed on OUTCOME_OPEN rather than on
  // "the first live bucket", so an empty Contradicted above can never promote the
  // coverage pile — "not enough record yet" is not a result and is never what a
  // profile opens on while real results exist.
  function openOutcome(b) {
    if (!b) return null;
    var buckets = b.buckets || {};
    var withRows = OUTCOMES.filter(function (o) { return (buckets[o.token] || []).length > 0; });
    return withRows.filter(function (o) { return !!OUTCOME_OPEN[o.token]; })[0] ||
           withRows[0] || OUTCOMES[0];
  }
  // The index's element-id namespace, derived from the politician alone so the
  // strip can address the panels of an index it never sees rendered. Two cards for
  // two people on one page get two namespaces; the same card repainted keeps its.
  function ocUid(pid) { return 'pdxwa-ocb-' + _idPart(pid); }

  // ── ONE BUCKETING, TWO SURFACES ────────────────────────────────────────────
  // The composition strip and the outcomes section must agree about what counts,
  // or the strip becomes a fifth opinion on the record. Both now read this. The two
  // exclusions are the ones outcomesHtml has always applied, moved rather than
  // rewritten: an outcome we do not name is not counted, and a "not enough record
  // yet" row with nothing stated is coverage — an issue we track and they have not
  // spoken on — which is a gap in the map, not a shape in the record.
  function outcomeBuckets(pid) {
    var ep = (typeof window.PDXDataEpoch === 'function') ? window.PDXDataEpoch() : 0;
    if (_obEpoch !== ep) { _obCache = {}; _obEpoch = ep; }
    var ck = String(pid == null ? '' : pid) + '||' + scopeKey();
    var ranked = rankedRows(pid);
    if (!ranked) return null;
    // Keyed on the row set it grouped, not just the politician: rankedRows above
    // rebuilds when its source changes, and a bucketing held over a rebuilt row
    // set would describe rows that are no longer on the card.
    var hit = _obCache[ck];
    if (hit && hit.ranked === ranked) return hit.val;
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
    var res = b.total ? b : null;
    _obCache[ck] = { ranked: ranked, val: res };
    return res;
  }
  // The bucketed index, memoized alongside the ranked rows it groups — see THE
  // DERIVATION EPOCH in stance-helpers.js. Six surfaces ask for it while one
  // profile paints (the composition strip, the index itself, the ledger read, the
  // gateway, the search chip and the warm repaint), and it is the same answer to
  // all six. Null is cached too: "this politician has no index" is a real answer
  // and re-deriving it costs the whole row model.
  var _obCache = {}, _obEpoch = 0;

  // ── THE SEARCH CHIP, IN THE INDEX'S OWN WORDS ──────────────────────────────
  // ONE MEANING, published once, for the chip on an All-Seeing Eye politician row:
  //
  //     the strongest result in this politician's issue index, named and coloured
  //     exactly as the index names and colours it.
  //
  // It replaces a chip that was answering a different question with the profile's
  // hardest word. The old chip came from the curated Say-vs-Do receipt layer, whose
  // effective rule is "does a negative public-record item exist for someone with a
  // stated position" — and it printed the answer as "SAYS ONE THING · DOES ANOTHER".
  // That is the index's name for its worst bucket. So a profile whose index reads
  // 0 Contradicted and 4 Mixed carried the Contradicted words in search: two
  // evidence bases, two questions, one vocabulary, and a reader with no way to tell
  // that the chip and the profile were not talking about the same thing.
  //
  // Strongest means OUTCOMES order — contradicts, then mixed, then consistent —
  // and only a bucket that actually HAS rows can be it, so "Mixed" is reachable and
  // is never rendered as the hard negative. The coverage bucket is never the chip:
  // "not enough record yet" is not a result.
  //
  // AND WHERE THERE IS NO RESULT, THE RECORD STILL ANSWERS. Falling straight through
  // to PDXCoverage was right when the only thing this module could see was the word
  // ledger, and wrong the moment the formal atlas existed: it meant a member whose
  // roll-call record runs to sixty-odd issues, and who has simply never been quoted,
  // was published on the busiest surface in the product as "Still documenting". The
  // second answer is recordBadgeHTML — how many issues the formal record touched,
  // as a count, with no score and no direction in it. PDXCoverage keeps the third
  // and last word, which is now reserved for the people it was written about: the
  // ones with nothing on file at all.
  //
  // Counts ride in the tooltip, not in the chip. One word on a search row.
  function searchBadgeHTML(pid) {
    try {
      var b = outcomeBuckets(pid);
      if (b && b.total) {
        var o = null, n = 0;
        for (var i = 0; i < OUTCOMES.length && !o; i++) {
          if (OUTCOMES[i].secondary) continue;     // coverage is not a result
          var c = (b.buckets[OUTCOMES[i].token] || []).length;
          if (c) { o = OUTCOMES[i]; n = c; }
        }
        if (o) {
          var issues = n + ' issue' + (n === 1 ? '' : 's');
          return '<span class="pdxwa-eye-badge" data-pdxwa-eye="' + esc(o.token) + '"' +
            ' style="--pdxwa-col:' + o.col + ';"' +
            ' title="' + esc('Issue index: ' + issues + ' of ' + b.total + ' read ' + o.short +
              ' — the strongest result on this record. ' + o.sub) + '">' +
            esc(o.short) + '</span>';
        }
      }
      // NO RESULT IS NOT NO RECORD. Everything above needs a stated position: the
      // index is built from the word ledger, so a member with four hundred mapped
      // roll calls and nothing quotable produces no bucket, and this used to return
      // '' — which handed the row to PDXCoverage, whose honest-for-its-own-purpose
      // chip then announced "Still documenting" over a deep formal record. On the
      // browse surface, where most readers form their only impression, silence was
      // being reported as absence. See recordBadgeHTML.
      return recordBadgeHTML(pid);
    } catch (e) { return ''; }
  }

  // ── THE FORMAL-INVENTORY CHIP ──────────────────────────────────────────────
  // WHAT IT SAYS, and it is the whole claim: this many issues have something formal
  // on file. Roll-call votes and formal actions, counted by the same index the
  // profile's formal atlas renders (PDXConsistency.formalPatternIndex), so the chip
  // and the list it leads to cannot disagree about how many issues there are.
  //
  // WHAT IT IS NOT, and each of these is deliberate:
  //   · NOT A PERCENTAGE. Direction Match is the one formal percentage and nothing
  //     here has been tested against a stated position, so there is no score to
  //     print and none is printed. A count is not a rival measurement of a record;
  //     it is the size of the record.
  //   · NOT A DIRECTION. No tier, no lean, no "supports"/"opposes" — those need the
  //     issue's own pole label beside them to stay neutral, and a search row has no
  //     room for it. How many issues, and how many of those the index could read a
  //     pattern on. Both are counts.
  //   · NOT A GRADE, AND NOT PARTY. There is no word here that ranks the person and
  //     no reference to anyone else's record.
  //
  // Empty when there is genuinely nothing formal on file, so the receipt chip and
  // then PDXCoverage still get their turn — "not yet documented" stays reachable and
  // stays true.
  function recordBadgeHTML(pid) {
    try {
      var r = recordDepth(pid);
      if (!r || !r.issues) return '';
      var lb = r.issues + ' issue' + (r.issues === 1 ? '' : 's') + ' on record';
      var tip = 'Formal record: ' + r.issues + ' issue' + (r.issues === 1 ? '' : 's') +
        ' with roll-call votes or formal actions on file' +
        (r.read ? ', ' + r.read + ' with a pattern the record index could read' : '') + '. ' +
        'No stated position of theirs has been tested against it yet, so there is no ' +
        'Direction Match score here — this is the size of the record, not a reading of it.';
      return '<span class="pdxwa-eye-badge" data-pdxwa-eye="record"' +
        ' style="--pdxwa-col:#8fa6c6;"' +
        ' title="' + esc(tip) + '">🏛 ' + esc(lb) + '</span>';
    } catch (e) { return ''; }
  }
  // Memoized on the derivation epoch and the term scope, like every other read on
  // this card: a browse list asks for ten of these while one keystroke paints, and
  // the underlying row model is the expensive part of the profile.
  var _rdCache = {}, _rdEpoch = 0;
  function recordDepth(pid) {
    var ep = (typeof window.PDXDataEpoch === 'function') ? window.PDXDataEpoch() : 0;
    if (_rdEpoch !== ep) { _rdCache = {}; _rdEpoch = ep; }
    var ck = String(pid == null ? '' : pid) + '||' + scopeKey();
    if (_rdCache[ck]) return _rdCache[ck];
    var out = { issues: 0, read: 0 };
    try {
      var FPI = window.PDXConsistency && window.PDXConsistency.formalPatternIndex;
      var rows = (FPI && typeof FPI.rows === 'function' && pid) ? (FPI.rows(pid) || []) : [];
      out.issues = rows.length;
      for (var i = 0; i < rows.length; i++) if (rows[i] && rows[i].read) out.read++;
    } catch (e) { out = { issues: 0, read: 0 }; }
    _rdCache[ck] = out;
    return out;
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
  //
  // ── AND IT IS THE WAY IN ───────────────────────────────────────────────────
  // The strip used to be a picture and nothing more: it named four buckets and
  // counted them, and a reader who wanted the Contradicted issues had to scroll
  // past it, find the switcher inside the index below, and tap the chip with the
  // same word on it. Two vocabularies of one thing, one of them inert — and on a
  // wide screen the index answered by opening all four lists side by side, so the
  // summary led to a board rather than to a list.
  //
  // Every count here is now a control, and so is every segment of the bar: tapping
  // one selects that bucket in the index below and brings the index to the top of
  // the viewport. Nothing about the record moves — the strip switches WHICH list is
  // on screen, and the selected chip is the same bucket the panel shows, because
  // both read openOutcome() rather than each deciding for themselves.
  //
  // THE ZEROES ARE DOORS TOO. A "0 Contradicted" chip opens the Contradicted panel
  // on its honest empty state ("None. No issue in this index landed here — 11
  // issues checked"), which is a stronger statement than a chip that cannot be
  // tapped: the reader gets to check the pile they were told was empty.
  //
  // THE BAR IS A DUPLICATE, AND IS TREATED AS ONE. Its segments are pointer
  // affordances over the chips below them — the same four buckets, in the same
  // order, addressed by the same tokens. They stay out of the tab order and out of
  // the accessibility tree (the bar is aria-hidden either way, being a picture of
  // integers printed underneath it), so a keyboard or screen-reader user meets one
  // set of four labelled controls instead of eight.
  function compositionHtml(pid) {
    try {
      var b = outcomeBuckets(pid);
      // Below two issues there is no composition to show — one chip under a
      // percentage is not a distribution, it is the percentage again.
      if (!b || b.total < 2) return '';
      var live = COMP_ORDER.map(function (t) {
        var o = OUTCOMES.filter(function (x) { return x.token === t; })[0];
        return { o: o, n: (b.buckets[t] || []).length };
      });
      var drawn = live.filter(function (x) { return x.n > 0; });
      if (!drawn.length) return '';
      // The strip's controls are live from the moment it paints, not from the
      // moment the index below it does: the same delegated listener runs both, and
      // an index that failed to render must not take the gateway down with it.
      armIndex();
      var uid = ocUid(pid);
      var openTok = (openOutcome(b) || {}).token || '';
      // Shared by every control in the strip: which bucket it opens, which index it
      // opens it in, and the marker that says "this one also has to scroll the index
      // into view" — the index is a screen below the strip on a phone.
      var gate = function (o, kind) {
        return ' data-pdxwa-seg="' + esc(o.token) + '" data-pdxwa-seg-uid="' + esc(uid) + '"' +
               ' data-pdxwa-gate="' + kind + '"';
      };
      // The BAR is drawn from the buckets that have width — a zero-flex segment is
      // an invisible segment either way. The CHIPS below it name all four, zeroes
      // included, so the strip and the index it sits above use the same vocabulary
      // on every profile. A "0 contradicted" chip is a result; a missing chip is a
      // reader wondering whether we checked.
      var bar = drawn.map(function (x) {
        return '<button type="button" class="pdxwa-comp-seg' + (x.o.token === openTok ? ' is-on' : '') + '"' +
          ' style="flex-grow:' + x.n + ';background:' + x.o.col + ';"' +
          ' tabindex="-1" aria-hidden="true"' + gate(x.o, 'bar') +
          ' title="' + esc(x.n + ' ' + x.o.short.toLowerCase() + ' — open this list') + '"></button>';
      }).join('');
      var chips = live.map(function (x) {
        var on = x.o.token === openTok;
        var issues = x.n + ' issue' + (x.n === 1 ? '' : 's');
        return '<li class="pdxwa-comp-i' + (x.n ? '' : ' is-zero') + '" style="--pdxwa-col:' + x.o.col + ';">' +
            '<button type="button" class="pdxwa-comp-b' + (on ? ' is-on' : '') + '"' + gate(x.o, 'count') +
              ' aria-pressed="' + (on ? 'true' : 'false') + '"' +
              ' aria-controls="' + esc(uid + '-p-' + _idPart(x.o.token)) + '"' +
              ' aria-label="' + esc(x.o.short + ': ' + issues + ' of ' + b.total +
                '. Opens that list of issues below.') + '">' +
              '<span class="pdxwa-comp-n">' + x.n + '</span>' +
              '<span class="pdxwa-comp-lbl">' + esc(x.o.short) + '</span>' +
            '</button>' +
          '</li>';
      }).join('');
      // THE LAST THING IN THIS BLOCK IS A CONTROL. Everything that explains the
      // graph — the instruction, the tension note, the clarifier — is either
      // above the bar or below the index (see shapeNotesHtml). What used to sit
      // here was three paragraphs between the chips and the list they open,
      // which on a phone is the destination pushed off-screen at the exact
      // moment the reader taps. The hint is the one line that has to stay inside
      // the block, because a count that looks like a number and behaves like a
      // button is only discovered by readers who happen to tap it — so it leads
      // the graph rather than trailing it.
      return '' +
        '<div class="pdxwa-comp">' +
          '<div class="pdxwa-comp-h">The shape behind the average' +
            '<span class="pdxwa-comp-sub">' + esc(b.total + ' issue' + (b.total === 1 ? '' : 's') + ' with a verdict') + '</span>' +
          '</div>' +
          '<p class="pdxwa-comp-hint">' +
            esc('Tap a count — or a segment of the bar — to open that bucket’s issues below.') +
          '</p>' +
          '<div class="pdxwa-comp-bar" aria-hidden="true">' + bar + '</div>' +
          '<ul class="pdxwa-comp-l">' + chips + '</ul>' +
        '</div>';
    } catch (e) { return ''; }
  }

  // ── WHAT THE SHAPE MEANS, UNDER THE LIST IT DESCRIBES ──────────────────────
  // The tension note and the score-vs-count clarifier used to close the graph
  // block. Both are prose, both are read once, and both were standing between a
  // navigator and its destination on the one screen where that distance costs
  // most. They are unchanged in wording and in what they count — they are simply
  // printed after the bucket list, where a reader who has picked a bucket and
  // read it is ready to ask what the whole shape means.
  //
  // Same gate as the graph (`b.total < 2`), so the note can never appear under an
  // index that has no graph above it and no counts to explain.
  function shapeNotesHtml(pid) {
    try {
      var b = outcomeBuckets(pid);
      if (!b || b.total < 2) return '';
      // The one sentence a high, calm-looking record most needs printed on it.
      // Worst-first: a contested-but-matching row is the subtlest of these and the
      // easiest to lose, so it is said in its own clause rather than folded into a
      // count of "issues with something wrong".
      var notes = [];
      if (b.tension) {
        // "the rows below" used to mean the index directly under this paragraph.
        // The index is behind a control now and the full issue list is the tree in
        // the next section, so the sentence names where tension-first actually
        // lives: the tree's own Tension order.
        notes.push(b.tension + ' of these ' + b.total + ' issue' + (b.total === 1 ? '' : 's') +
          ' carr' + (b.tension === 1 ? 'ies' : 'y') + ' tension — a contradiction, a mixed result, or an action whose standing is contested. ' +
          'Tension leads every list that prints these issues, and 🌳 All Issues by Topic below can be ordered that way in one tap.');
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
        '<div class="pdxwa-shapenote">' +
          '<p class="pdxwa-comp-note">' + esc(notes.join(' ')) + '</p>' +
          '<p class="pdxwa-comp-note pdxwa-comp-fine">' +
            esc('The score above weighs statements by how testable they are; this counts issues. The two do not have to line up.') +
          '</p>' +
        '</div>';
    } catch (e) { return ''; }
  }

  // ── THE TALLY, BESIDE THE ONE NUMBER ───────────────────────────────────────
  // A reader who has just met "82%" has one question the percentage cannot
  // answer: how many issues went which way. The graph answers it — but the graph
  // is a screen further down on a phone, behind the line that says what the score
  // measures and the term slice. So the first screen carried a figure and no
  // shape, and a reader who stopped there stopped on the mean alone.
  //
  // This is that shape, printed at caption scale next to the number it belongs
  // to: four counts, in the four words the graph and the index already use.
  //
  // WHAT MAKES IT NOT A SECOND SCORE — the same four rules as the graph, and they
  // are the reason this can sit beside a headline percentage at all:
  //   · COUNTS ONLY. No percentage, no rate, no share, nothing that can be
  //     subtracted from the figure beside it.
  //   · ONE SOURCE. Every number is read from outcomeBuckets(), the same
  //     bucketing the graph draws and the index lists, so the tally cannot say
  //     four when the bar draws three.
  //   · SAME GATE. It renders exactly when the graph renders (`b.total < 2`
  //     returns nothing from both), so there is never a tally with no graph to
  //     check it against.
  //   · FORMAL LANE ONLY, because the buckets are. The public record is counted
  //     on the rows below and blended into nothing here.
  //
  // And it is a control, not a caption: each count carries the same three
  // attributes as the graph's counts, so tapping one selects that bucket in the
  // index and brings the index into view — the first screen's fastest route to
  // the list, without scrolling to the graph to start the trip.
  // ONE BUILDER, TWO MOUNTS. The tally is printed twice on a profile — once in the
  // card, under the section's own headline, and once in the letterhead at the top
  // of the page — and the whole claim of the thing is that its four integers are
  // the graph's four integers. Two copies of this loop is how that stops being
  // true. `gate` names the surface for the switcher's scroll rule and `extra` is
  // the one attribute a copy mounted OUTSIDE the ⚖️ section needs; everything
  // that carries meaning — the counts, the order, the vocabulary, the colours,
  // the panel each control addresses — is identical by construction.
  function tallyItemsHtml(b, uid, openTok, gate, extra) {
    return COMP_ORDER.map(function (t) {
      var o = outcomeFor(t);
      if (!o) return '';
      var n = (b.buckets[t] || []).length;
      var on = t === openTok;
      var issues = n + ' issue' + (n === 1 ? '' : 's');
      return '<li class="pdxwa-tally-i' + (n ? '' : ' is-zero') + '" style="--pdxwa-col:' + o.col + ';">' +
          '<button type="button" class="pdxwa-tally-b' + (on ? ' is-on' : '') + '"' +
            ' data-pdxwa-seg="' + esc(o.token) + '" data-pdxwa-seg-uid="' + esc(uid) + '"' +
            ' data-pdxwa-gate="' + esc(gate) + '"' + (extra || '') +
            ' aria-pressed="' + (on ? 'true' : 'false') + '"' +
            ' aria-controls="' + esc(uid + '-p-' + _idPart(o.token)) + '"' +
            ' aria-label="' + esc(o.short + ': ' + issues + ' of ' + b.total +
              '. Opens that list of issues below.') + '">' +
            '<span class="pdxwa-tally-n">' + n + '</span>' +
            '<span class="pdxwa-tally-lbl">' + esc(o.short) + '</span>' +
          '</button>' +
        '</li>';
    }).join('');
  }

  function tallyHtml(pid) {
    try {
      var b = outcomeBuckets(pid);
      // Same gate as compositionHtml. One chip under a percentage is not a
      // distribution, and a tally with no graph below it has nothing to agree with.
      if (!b || b.total < 2) return '';
      armIndex();
      var uid = ocUid(pid);
      var openTok = (openOutcome(b) || {}).token || '';
      return '' +
        '<div class="pdxwa-tally">' +
          '<div class="pdxwa-tally-k">' +
            esc('Across ' + b.total + ' issue' + (b.total === 1 ? '' : 's') + ' — tap one to open its list') +
          '</div>' +
          '<ul class="pdxwa-tally-l">' +
            tallyItemsHtml(b, uid, openTok, 'tally', '') +
          '</ul>' +
        '</div>';
    } catch (e) { return ''; }
  }

  // ── THE SAME TALLY, IN THE LETTERHEAD ──────────────────────────────────────
  // The tally above solved the phone, where the ring and the ⚖️ section are the
  // same screen. On a desktop they are not: the ring sits in the letterhead with
  // the photo and the name, and the shape behind it was a scroll away inside §1.
  // So the first glance at a profile — the glance most readers only ever take —
  // showed an average and nothing about whether the record it averages agrees
  // with itself. 82% over four backed-up issues and 82% over two contradictions
  // and two thin rows are the same figure and not remotely the same finding.
  //
  // This mounts those four counts in the header, immediately under the
  // letterhead, on both layouts. It is the same builder, the same buckets, the
  // same panels; the differences are two, and both are about position:
  //   · `data-pdxwa-outside` — this copy is not inside the [data-pdxwa] section,
  //     so the switcher cannot find its index by walking up from the tap. The
  //     attribute is what lets selectBucket() move it and what lets the click
  //     handler resolve the index by uid instead. See both, below.
  //   · gate "header" — a tap from up here is a trip down the page, so the index
  //     is scrolled into view exactly as it is from the strip.
  //
  // WHAT IT IS STILL NOT. Not a second score: four integers, no percentage, no
  // rate, nothing that can be read against the ring beside it. Not a second
  // reading of the record: outcomeBuckets() is memoized per row set, so the
  // header, the bar and the index are literally the same object's counts. Not
  // public: the buckets are formal-lane, and the public record is counted on the
  // rows far below, blended into nothing here.
  //
  // AND IT DOES NOT INVENT A SHAPE. Below the two-issue floor it renders nothing
  // at all — an empty host, no frame, no zeroes. Four greyed zeroes under a
  // letterhead read as four findings ("nothing contradicted!") when what is
  // actually true is that the engine has not tested enough to have a shape. The
  // card's own limited-record notice is where a thin profile is explained, and it
  // says so in words.
  // ── AND THE OTHER LANE, AS COUNTS, ON ONE LINE ─────────────────────────────
  // The four counts above are the FORMAL shape. The reported record is a separate
  // test of the same stances and it is already counted on every row and in the
  // dossier — but not anywhere a reader who never opens ⚖️ Word vs Action would
  // meet it, which meant the letterhead's summary of a profile silently ended at
  // one lane.
  //
  // FOUR RULES, and they are the same four that let the counts above sit under a
  // percentage at all:
  //   · COUNTS ONLY. No percentage, no rate, no ratio. The wall between the lanes
  //     is that one of them is rated and the other is not, and a public figure up
  //     here would erase it in a single glance.
  //   · NOT A SECOND SCORE, AND IT SAYS SO. PDXConsistency's own boundary tag —
  //     "Not in Direction Match" — is printed with the numbers, not left to a
  //     tooltip, because this line sits closer to the ring than anything else on
  //     the page that is not in the ring.
  //   · NOT DERIVED HERE. publicShape() walks publicTally(), which is the one
  //     place the directions are named and counted. This file does no arithmetic
  //     on the public lane and invents no vocabulary for it.
  //   · NOTHING TO SAY, NOTHING PRINTED. Gated on `directional`: a profile with
  //     items on file but nothing pointing either way has no shape to show, and
  //     "0 cut against · 0 back it up" under a letterhead reads as a finding.
  //
  // It is deliberately NOT a control. The four counts above are the header's one
  // gateway into a list; a second door up here — into a lane that has no bucket
  // index to land in — would be a jump with nowhere honest to arrive.
  function headerPublicHtml(pid) {
    try {
      var CS = window.PDXConsistency;
      if (!CS || typeof CS.publicShape !== 'function') return '';
      var t = CS.publicShape(pid);
      if (!t || !t.directional || !t.text) return '';
      var span = t.issues + ' issue' + (t.issues === 1 ? '' : 's');
      return '<p class="pdxwa-hpub" title="' +
          esc(t.note + ' Counted across ' + span + ' with something on file.') + '">' +
          '<span class="pdxwa-hpub-k">' + esc(t.lane) + '</span>' +
          '<span class="pdxwa-hpub-v">' + esc(t.text) + '</span>' +
          '<span class="pdxwa-hpub-tag">' + esc(t.tag) + '</span>' +
        '</p>';
    } catch (e) { return ''; }
  }

  function headerTallyHtml(pid) {
    try {
      var b = outcomeBuckets(pid);
      if (!b || b.total < 2) return '';
      armIndex();
      var uid = ocUid(pid);
      var openTok = (openOutcome(b) || {}).token || '';
      return '' +
        '<div class="pdxwa-tally pdxwa-htally">' +
          '<div class="pdxwa-tally-k">' +
            esc('The shape behind it — across ' + b.total + ' issue' +
              (b.total === 1 ? '' : 's') + ', tap one to open its list') +
          '</div>' +
          '<ul class="pdxwa-tally-l">' +
            tallyItemsHtml(b, uid, openTok, 'header', ' data-pdxwa-outside="' + esc(uid) + '"') +
          '</ul>' +
          headerPublicHtml(pid) +
        '</div>';
    } catch (e) { return ''; }
  }

  // The host is emitted whether or not there is a shape to put in it, because the
  // header is built from the synchronous word ledger while the roll-call record is
  // still in flight: a profile that has no shape at first paint usually has one a
  // moment later, and a mount that returned '' would have nothing left in the DOM
  // to grow into. Empty host, no chrome — `.pdxwa-htally-host:empty` collapses it.
  function bindHeaderTally(uid, pid) {
    if (!window.addEventListener) return;
    var handler = function (ev) {
      var host = document.querySelector('[data-pdxwa-htally="' + uid + '"]');
      if (!host) { window.removeEventListener('pdx-consistency-warm', handler); return; }
      if (ev && ev.detail && ev.detail.pid && String(ev.detail.pid) !== String(pid)) return;
      try {
        host.innerHTML = headerTallyHtml(pid);
        // Fresh markup opens on the DEFAULT bucket, which is not necessarily the
        // one the reader is on. This listener runs before the section's own
        // repaint (it is bound first, from the header), so the index in the DOM
        // is still the pre-warm one and still carries the reader's choice — read
        // it back rather than silently disagreeing with the list on screen.
        reflectOpenBucket(ocUid(pid));
      } catch (e) {}
    };
    window.addEventListener('pdx-consistency-warm', handler);
  }

  function headerTallyMount(pid) {
    try {
      var uid = ('htally-' + String(pid) + '-' + (++_seq)).replace(/[^A-Za-z0-9_-]/g, '');
      var inner = headerTallyHtml(pid);
      try { setTimeout(function () { bindHeaderTally(uid, pid); }, 0); } catch (e) {}
      return '<div class="pdxwa-htally-host" data-pdxwa-htally="' + esc(uid) + '">' + inner + '</div>';
    } catch (e) { return ''; }
  }

  // ── HOW MUCH RECORD, AND OVER WHAT SPAN — THE TAIL OF THE HEADER STACK ─────
  // The letterhead now answers three questions in the order a reader asks them:
  // the ring says how much of their word their record backs up and how much of it
  // was tested; the tally above says what shape that average came out of; and this
  // block says how much record there IS behind both, and — where a term scope
  // exists at all — which span the figure covers.
  //
  // That third question is the one the top of a profile kept leaving to a scroll.
  // 82% over four issues is a different finding depending on whether the file
  // behind it is twelve mapped votes or two hundred, and a reader who has to reach
  // the Official Record to learn which is a reader who has already decided.
  //
  // WHAT IT IS NOT.
  //   · Not a second read. Neither line is computed here: the member lane prints
  //     window._pdxMappedSummaryText over window._pdxRecordMappedCounts — the same
  //     sentence over the same warm cache the Official Record's entry line uses —
  //     and the executive lane prints PDXExecRecord.volumeText over that module's
  //     own summary, which is the first clause of the label rendered below. One
  //     builder each, so the header cannot describe our file in words the section
  //     it summarises would not use.
  //   · Not a second score. No percentage, no rate, no verdict, no colour keyed to
  //     a figure. The scope note names a span and says the score above contains
  //     it; it prints no number of its own, which is why the current-term SLICE
  //     stays where it already shipped, inside the card, and only its containment
  //     is said up here.
  //   · Not a navigator. The lines below are display-only mirrors — the four counts
  //     above them are the header's one gateway, and this pass adds no second one.
  //   · Not a claim of completeness. Both builders carry their own thinness caveat
  //     at low N and their own "counted from what we hold" tooltip, and when
  //     nothing is warm they return nothing at all rather than a zero.
  function headerDepthHtml(pid) {
    try {
      var txt = '', tip = '';
      if (isExecLane(pid)) {
        var X = window.PDXExecRecord;
        if (X && typeof X.summary === 'function' && typeof X.volumeText === 'function') {
          // All terms, because the figure this line sits under is the whole record.
          // Asking for the current term here would put a narrower denominator under
          // an all-time percentage, which is the mismatch the scope note exists to
          // prevent rather than to introduce.
          var sum = X.summary(pid, { allTerms: true });
          if (sum) {
            txt = X.volumeText(sum) || '';
            if (txt && typeof X.summaryTip === 'function') tip = X.summaryTip(sum) || '';
          }
        }
      } else if (typeof window._pdxRecordMappedCounts === 'function' &&
                 typeof window._pdxMappedSummaryText === 'function') {
        var counts = window._pdxRecordMappedCounts(pid);
        if (counts && counts.votes) {
          txt = window._pdxMappedSummaryText(counts) || '';
          if (txt && typeof window._pdxMappedSummaryTip === 'function') {
            tip = window._pdxMappedSummaryTip(counts) || '';
          }
        }
      }
      if (!txt) return '';
      return '' +
        '<div class="pdxwa-hdepth"' + (tip ? ' title="' + esc(tip) + '"' : '') + '>' +
          '<span class="pdxwa-hdepth-ico" aria-hidden="true">🗂️</span>' +
          '<span class="pdxwa-hdepth-t">' + esc(txt) + '</span>' +
        '</div>';
    } catch (e) { return ''; }
  }

  // The scope note. Words only, and only where a term scope is a real distinction:
  // a member's roll-call record is not term-filtered anywhere in this engine, so
  // saying "all terms" on their profile would name a difference that does not
  // exist. The sentence is the containment half of the card's own slice note, which
  // is the half that stops two spans reading as two rival findings — the slice's
  // FIGURE stays in the card, because a second percentage in the letterhead is the
  // exact thing the ring is one number to avoid.
  function headerScopeHtml(pid) {
    try {
      var sl = sliceApplies(pid);
      if (!sl.applicable) return '';
      var termLabel = sl.term ? 'Current term (' + sl.term + ')' : 'Current term';
      return '' +
        '<div class="pdxwa-hscope">' +
          '<span class="pdxwa-hscope-tie" aria-hidden="true">↳</span>' +
          '<span class="pdxwa-hscope-t">' +
            esc(termLabel + ' is counted inside the score above — that figure is the whole record, every term.') +
          '</span>' +
        '</div>';
    } catch (e) { return ''; }
  }

  function headerStackHtml(pid) {
    var depth = headerDepthHtml(pid);
    var scope = headerScopeHtml(pid);
    // Nothing true to say yet → no frame, no rule, no reserved row. Same rule the
    // tally host follows, and for the same reason: an empty strip under a name
    // reads as something withheld.
    if (!depth && !scope) return '';
    return '<div class="pdxwa-hstack">' + depth + scope + '</div>';
  }

  // Emitted on every profile whether or not there is anything in it yet, because
  // the member lane's counts come off the roll-call cache and that cache is still
  // in flight when the header is built. Empty host, no chrome — repainted by the
  // same `pdx-consistency-warm` event the tally listens for.
  function bindHeaderStack(uid, pid) {
    if (!window.addEventListener) return;
    var handler = function (ev) {
      var host = document.querySelector('[data-pdxwa-hstack="' + uid + '"]');
      if (!host) { window.removeEventListener('pdx-consistency-warm', handler); return; }
      if (ev && ev.detail && ev.detail.pid && String(ev.detail.pid) !== String(pid)) return;
      try { host.innerHTML = headerStackHtml(pid); } catch (e) {}
    };
    window.addEventListener('pdx-consistency-warm', handler);
  }

  function headerStackMount(pid) {
    try {
      var uid = ('hstack-' + String(pid) + '-' + (++_seq)).replace(/[^A-Za-z0-9_-]/g, '');
      var inner = headerStackHtml(pid);
      try { setTimeout(function () { bindHeaderStack(uid, pid); }, 0); } catch (e) {}
      return '<div class="pdxwa-hstack-host" data-pdxwa-hstack="' + esc(uid) + '">' + inner + '</div>';
    } catch (e) { return ''; }
  }

  // ── THE ROW IS THE TAP TARGET ──────────────────────────────────────────────
  // Every row in the index opens the issue dossier for that politician and that
  // issue — the same assembled sheet the stance rows open, built once in
  // consistency.js and reused whole. The BUTTON is the row, not a chevron inside
  // it: a one-line row with a small affordance at the end is a row a reader has to
  // aim at, and this list is read on a phone.
  //
  // `origin` is the row's own id, and it is what makes the trip reversible. The
  // dossier keeps it, prints a return control, and puts the reader back on this
  // line in this bucket rather than at the top of the section they came from.
  //
  // WHAT STAYS ON THE ROW. Issue, what they said, how it came out, and the two
  // qualifications that change how the result should be read. Everything else —
  // which instruments, which way each one pointed, what the deciding record set
  // aside, where the issue lands in the score — is one tap down. A row carrying
  // its own explanation is a row nobody taps, and then the dossier exists for
  // nothing.
  // ── THE PUBLIC LANE, ON THE INDEX ROW ──────────────────────────────────────
  // The formal result on these rows has always been the whole row: the bucket cue,
  // the receipt count, the lane noun. The public record was reachable only by
  // opening the dossier, which means at the layer where readers actually skim, a
  // record with two sourced items cutting against a stated position looked exactly
  // like a record with nothing on file at all.
  //
  // So the tally ships beside the formal result — counts only, in the same words
  // the stance rows use, read from the same row model, through
  // PDXConsistency.publicTally so the two surfaces cannot drift.
  //
  // FOUR THINGS THIS DELIBERATELY DOES NOT DO:
  //   · No PUBLIC-lane percentage, and no second profile score. The row face does
  //     now carry a figure — see _outcomePct — but it is the issue's own, it is
  //     labelled with the issue's own name for it, and it is drawn at row scale.
  //     The public tally beside it stays counts-only: a percentage here would be a
  //     second measurement of the same row by the lane that did not decide it.
  //   · No merge into the result cue. The cue is the formal verdict's word; a
  //     public item has never moved it and must not look like it could.
  //   · No nesting inside the row button. A <button> inside a <button> is invalid
  //     markup that browsers repair unpredictably — the public tap is a SIBLING
  //     inside the same <li>, with its own attribute names so the row's own
  //     handler, its counts and its origin-id contract are untouched.
  //   · No silence when empty. "Nothing on file yet" is the answer for most issues
  //     on most profiles, it is true, and it is the state a reader can do something
  //     about — the tap still opens the dossier, on the coverage gap and its lead
  //     composer rather than on a column of receipts.
  function _outcomePub(r, rid) {
    var t = null;
    try {
      var CS = window.PDXConsistency;
      if (CS && typeof CS.publicTally === 'function') t = CS.publicTally(r);
    } catch (e) { t = null; }
    // Fail closed: no model, no line. An index that invents its own tally when the
    // shared one is unavailable is an index that can disagree with the stance row.
    if (!t) return '';
    var tip = t.text + ' — ' + t.note;
    return '<button type="button" class="pdxwa-oc-pub' + (t.empty ? ' pdxwa-oc-pub-0' : '') + '"' +
        ' data-pdxwa-pub="' + esc(r.key) + '" data-pdxwa-pub-pid="' + esc(String(r.pid)) + '"' +
        ' data-pdxwa-pub-origin="' + esc(rid) + '"' +
        ' data-pdxwa-pub-state="' + (t.empty ? 'empty' : 'tally') + '"' +
        ' aria-label="' + esc(t.cta + ' — ' + r.label + ': ' + tip) + '"' +
        ' title="' + esc(tip) + '">' +
        '<span class="pdxwa-oc-pub-k">' + esc(t.lane) + '</span>' +
        // The lane's subject, after its status. "Outside the score" answers the
        // question the reader has next to a percentage; this answers the one they
        // have immediately after. Lower case and quiet on purpose — a second
        // condensed caps run beside the first would read as a second key.
        '<span class="pdxwa-oc-pub-sub">' + esc('· ' + (t.laneSub || '')) + '</span>' +
        '<span class="pdxwa-oc-pub-t">' + esc(t.text) + '</span>' +
        '<span class="pdxwa-oc-pub-tag">' + esc(t.tag) + '</span>' +
        '<span class="pdxwa-oc-pub-go" aria-hidden="true">›</span>' +
      '</button>';
  }

  // ── THE PER-ISSUE FIGURE, ON THE ROW FACE ──────────────────────────────────
  // The row face has to answer "how did this issue come out" well enough that a
  // reader can decide whether to open it. The bucket cue gives the direction of
  // the finding; this gives its degree. Without it, a row that matched on eleven
  // of twelve instruments and a row that scraped through read as the same green
  // line, and the only way to tell them apart was to open both.
  //
  // IT IS THE STANCE ROW'S FIGURE, NOT A NEW ONE. Read from
  // PDXConsistency.rowResult — the same helper the tree's leaves and the issue
  // dossier print from — so one issue cannot carry two percentages on one profile. Fail
  // closed: no helper, or a row that is not tested, prints nothing at all rather
  // than a zero or a dash that would read as a result.
  //
  // WHY IT CANNOT BE MISTAKEN FOR THE PROFILE'S SCORE. Three things keep it
  // scoped, and all three are load-bearing:
  //   · It is inside the row, after the issue's own name, at row type scale — the
  //     headline % is a display-size number in its own block a screen above.
  //   · It carries its metric's name and the word "this issue alone" in the label
  //     a screen reader gets, so it is never an unqualified percentage.
  //   · It is drawn only for a row the FORMAL lane decided. rowResult also returns
  //     a figure for a row the public record resolved, under its own name
  //     ("Public-record match"), and the stance rows print that — they have the
  //     room to name a lane in full and the surface exists to compare the two.
  //     This index does not print it. ⚖️ Word vs Action is the score's own
  //     section; a percentage appearing on a row inside it because three receipts
  //     landed is indistinguishable, at a glance and at 0.68rem, from the public
  //     lane entering the score. The receipts are still on the row — the tally
  //     beside it counts them — they just do not get a rate here. Fail closed:
  //     no helper, an untested row, or any basis but the formal one prints nothing
  //     at all rather than a number the score did not authorise.
  function _outcomePct(r) {
    var res = null;
    try {
      var CS = window.PDXConsistency;
      if (CS && typeof CS.rowResult === 'function') res = CS.rowResult(r);
    } catch (e) { res = null; }
    if (!res || res.state !== 'tested' || typeof res.pct !== 'number') return { html: '', aria: '' };
    // The lane gate. 'Direction match' is rowResult's name for the formal
    // arithmetic; anything else came from a lane that is outside this section.
    if (res.metric !== 'Direction match') return { html: '', aria: '' };
    return {
      // Spoken in full, because a bare "78%" read out after an issue name is the
      // one form of this that COULD be heard as the profile's score.
      aria: ' · Formal Direction Match on this issue alone: ' + res.pct + '%',
      html: '<span class="pdxwa-oc-pct" style="--pdxwa-col:' + ((res.color || '#9fb4d4')) + ';"' +
          ' title="' + esc('Formal Direction Match on ' + r.label + ' alone — the scored lane, ' +
            'not this profile’s overall score') + '">' +
          '<span class="pdxwa-oc-pct-v">' + res.pct + '%</span>' +
          // THE LABEL NAMES THE LANE, NOT JUST THE SCOPE. "this issue" answered the
          // wrong half of the question: it walled the figure off from the profile
          // score and said nothing about which of the row's two signals it came from.
          // A reader looking at a percentage here and a receipt tally one line below
          // needs the percentage to say "formal" out loud, because the tally now says
          // "outside the score" out loud. Wrapped rather than truncated — the label is
          // the reason the figure is allowed on the row face at all.
          '<span class="pdxwa-oc-pct-l">Formal · Direction Match · this issue</span>' +
        '</span>'
    };
  }

  function _outcomeRow(r) {
    var o = outcomeFor(r.verdict.token);
    var bits = [];
    // The count and the lane, so the depth behind the cue is legible without
    // opening anything. Not the strength word — that is what the Thin evidence
    // flag says, and saying it twice on one line is how a row grows.
    if (r.evidence.total) bits.push(r.evidence.total + ' receipt' + (r.evidence.total === 1 ? '' : 's'));
    if (r.verdict.basis === 'public_record') bits.push('public record');
    else if (r.evidence.actions) bits.push(_laneNoun(r, r.evidence.actions));
    // Same issue, same colour, one section down. These rows sit inside a bucket
    // whose heading already carries the outcome colour, so without this the only
    // colour on the line belonged to the bucket it happened to fall into — and
    // healthcare in one bucket looked like nothing to do with healthcare in the
    // next. The spine is the issue; the bucket heading keeps the outcome. Both
    // travel into the dossier header on the tap.
    var skin = issueSkin(r.key);
    // The same two flags the top rows carry, at one-line scale. Without them a
    // struck-down row and an in-force row are the same line in the same green
    // bucket — and the whole point of a bucket is that a reader can stop reading
    // closely inside it.
    var flags = flagsHtml(r, 'pdxwa-oc-flag');
    // The spine restyle follows the chip, including when the chip is the new
    // single-measure one — a row that reads deep by item count and rests on one
    // document gets the same dashed spine a thin row does.
    var friction = (isContested(r) ? ' pdxwa-oc-row-x' : '') +
      ((isThin(r) || singleMeasure(r)) ? ' pdxwa-oc-row-thin' : '');
    // A stable per-issue id, so another surface can land a reader on THIS issue's
    // line in the score rather than on the top of the section. Built from the same
    // (pid, key) pair every surface already agrees on; see wordActionRowId() in
    // consistency.js, which must build the same string.
    var rid = 'pdxwa-oc-' + _idPart(r.pid) + '-' + _idPart(r.key);
    var pct = _outcomePct(r);
    var aria = 'Open the issue dossier: ' + r.label +
      (o ? ' — ' + o.short : '') + (r.stance.label ? ' · they said: ' + r.stance.label : '') + pct.aria;
    return '<li class="pdxwa-oc-li" id="' + esc(rid) + '" data-pdxwa-issue="' + esc(r.key) + '">' +
        '<button type="button" class="pdxwa-oc-row' + skin.cls + friction + '" style="' + skin.style + '"' +
          ' data-pdxwa-dos="' + esc(r.key) + '" data-pdxwa-dos-pid="' + esc(String(r.pid)) + '"' +
          ' data-pdxwa-dos-origin="' + esc(rid) + '"' +
          ' aria-label="' + esc(aria) + '">' +
          '<span class="pdxwa-oc-main">' +
            '<span class="pdxwa-oc-issue">' + esc(r.label) + '</span>' +
            (r.stance.label ? '<span class="pdxwa-oc-said">' + esc(r.stance.label) + '</span>' : '') +
            (bits.length ? '<span class="pdxwa-oc-meta">' + esc(bits.join(' · ')) + '</span>' : '') +
            flags +
          '</span>' +
          // The result, on the row, in the same word the bucket switcher used. It is
          // redundant beside its own bucket heading and deliberately kept: on a phone
          // one bucket is on screen at a time, and a reader arriving on this row from
          // a deep link has no heading above them at all. The figure rides with it,
          // in one block, so the word and the number that qualifies it can never be
          // read apart or wrap away from each other.
          (o || pct.html
            ? '<span class="pdxwa-oc-res">' +
                (o ? '<span class="pdxwa-oc-cue" style="color:' + o.col + ';border-color:' + o.col + '55;">' +
                       esc(o.short) + '</span>' : '') +
                pct.html +
              '</span>'
            : '') +
          '<span class="pdxwa-oc-go" aria-hidden="true">›</span>' +
        '</button>' +
        _outcomePub(r, rid) +
      '</li>';
  }

  // ── THE ISSUE INDEX — FOUR BUCKETS, ONE SWITCHER ───────────────────────────
  // This block used to be one stack: the two sharp buckets open, everything else
  // behind a single "Show 3 more issues" fold. Two things were wrong with that.
  // The fold named its contents but not their shape, so a reader could not tell a
  // record with nine clean issues from one with three clean and six untested
  // without opening it — the other outcomes were only partially revealed. And a
  // fold is where reading stops, so the buckets that reached it were, in practice,
  // buckets nobody saw.
  //
  // It is now an index. Every bucket that has rows gets a chip in the switcher
  // with its own count and its own colour, so the SHAPE of the record is on the
  // face whether or not anything is opened; and every bucket is one tap from
  // there. Nothing is behind a fold.
  //
  // TWO SURFACES, ONE SELECTION. The switcher sets `.is-on` on exactly one panel,
  // and so does the shape strip above it — the counts and the bar segments in that
  // strip are the same control set pointed at these panels, which is why both are
  // built from openOutcome() and ocUid(). One bucket is on screen at a time at
  // every width: the strip is the map, this is the list it opens. A reader who
  // wants all four at once has the flat mode at the foot. No second render path,
  // no width sniffing in JS, and the same DOM on both screens — so a resize cannot
  // lose a reader's place.
  //
  // WHAT THIS IS NOT. It is not a second scoreboard. No bucket prints a
  // percentage, and the denominator is stated once, in words, at the foot. The one
  // number on this profile is the Direction Match above.
  //
  // ALL FOUR BUCKETS, ALWAYS, INCLUDING AT ZERO. This block used to render only
  // the buckets that had rows. That reads as an honest economy and is not one:
  // "Contradicted" simply vanished from a record with no contradictions, so the
  // switcher silently changed its own vocabulary from profile to profile, and a
  // reader had no way to tell "we found none" from "we do not look for that here".
  // Zero is a finding, and on this card it is often the most important one. Every
  // bucket now gets its chip, its count and its panel whatever the count, and an
  // empty panel says so in words instead of showing an empty list.
  function outcomesHtml(pid) {
    try {
      var b = outcomeBuckets(pid);
      if (!b) return '';
      armIndex();
      var buckets = b.buckets;
      var countOf = function (o) { return (buckets[o.token] || []).length; };
      // The full, fixed vocabulary — not a filtered subset of it.
      var live = OUTCOMES.slice();
      // Which bucket the index opens on — decided in openOutcome() rather than here,
      // because the shape strip above has to highlight the SAME one. See openOutcome.
      var sel = openOutcome(b) || live[0];
      var uid = ocUid(pid);
      var panelId = function (o) { return uid + '-p-' + _idPart(o.token); };
      var tabId = function (o) { return uid + '-t-' + _idPart(o.token); };

      var tabs = live.map(function (o) {
        var on = (o === sel);
        var n = countOf(o);
        // An empty bucket keeps its tap target and its aria wiring — it is a real
        // panel with a real answer in it — and gives up contrast, so the row of
        // chips still reads worst-first without a zero shouting for attention.
        return '<button type="button" role="tab" id="' + esc(tabId(o)) + '"' +
            ' class="pdxwa-oc-tab' + (on ? ' is-on' : '') + (o.secondary ? ' pdxwa-oc-tab-2nd' : '') +
              (n ? '' : ' is-zero') + '"' +
            ' style="--pdxwa-col:' + o.col + ';"' +
            ' data-pdxwa-seg="' + esc(o.token) + '" data-pdxwa-seg-uid="' + esc(uid) + '"' +
            ' aria-selected="' + (on ? 'true' : 'false') + '" aria-controls="' + esc(panelId(o)) + '">' +
            '<span class="pdxwa-oc-tab-n">' + n + '</span>' +
            '<span class="pdxwa-oc-tab-l">' + esc(o.short) + '</span>' +
          '</button>';
      }).join('');

      var panels = live.map(function (o) {
        var list = buckets[o.token] || [];
        var body = list.length
          ? '<ul class="pdxwa-oc-l">' + list.map(_outcomeRow).join('') + '</ul>'
          // The empty state says which of the two zeroes this is: nothing on this
          // pile, out of a stated denominator. It is the sentence the missing chip
          // used to withhold.
          : '<p class="pdxwa-oc-empty">' + esc('None. No issue in this index landed here — ' +
              b.total + ' issue' + (b.total === 1 ? '' : 's') + ' checked.') + '</p>';
        return '<section class="pdxwa-oc-grp' + (o === sel ? ' is-on' : '') +
            (o.secondary ? ' pdxwa-oc-grp-2nd' : '') + (list.length ? '' : ' is-zero') +
            '" role="tabpanel"' +
            ' id="' + esc(panelId(o)) + '" aria-labelledby="' + esc(tabId(o)) + '"' +
            ' data-pdxwa-oc-panel="' + esc(o.token) + '" style="--pdxwa-col:' + o.col + ';">' +
            '<div class="pdxwa-oc-h"><span class="pdxwa-oc-n">' + list.length + '</span> ' + esc(o.label) + '</div>' +
            '<div class="pdxwa-oc-hsub">' + esc(o.sub) + '</div>' +
            body +
          '</section>';
      }).join('');

      // The denominator, in words, once. A reader who wants to know what "3 backed
      // up" is 3 OF should not have to add the chips up, and the answer is not the
      // number above — the score weighs statements by testability and this counts
      // issues. Judged and untested are separated here for the same reason the
      // coverage bucket is drawn quieter: they are not the same claim.
      var judged = b.total - ((buckets.limited || []).length);
      var foot = b.total + ' issue' + (b.total === 1 ? '' : 's') + ' in this index — ' +
        judged + ' with a result on the record' +
        ((buckets.limited || []).length
          ? ', ' + buckets.limited.length + ' stated but not testable yet' : '') +
        '. Tap any issue for its full record.';
      // WHICH SURFACE IS THE MAP. This index is the score's own working — the same
      // issues, filed by what the record did to them. The browse-all surface is the
      // tree one section down, and saying so here is the difference between a
      // demoted index and a second, competing one.
      var mapFoot = '<p class="pdxwa-oc-map">' + esc('This is the score\u2019s own index, filed by result. ' +
        '\ud83c\udf33 All Issues by Topic below is the full map of what they stand for \u2014 every issue, ' +
        'grouped by topic or ordered by tension, with the same door into each record.') + '</p>';
      // THE OUTSIDE-THE-SCORE LANE'S DENOMINATOR, once, in words. The rows say what
      // is on file per issue; this says how much of the index the reported record
      // reaches at all, which is the question a reader who has just skimmed twelve
      // "nothing on file yet" lines is actually asking. It is a coverage count and it
      // says so — no percentage, no share, and the sentence that follows it is the wall.
      var pubFoot = '';
      try {
        var CS = window.PDXConsistency;
        if (CS && typeof CS.publicCoverage === 'function') {
          // Counted over the rows this index actually lists, not over every issue the
          // row model knows: the sentence sits under a stated denominator and two
          // denominators in one foot is worse than none.
          var idxRows = [];
          for (var pi = 0; pi < live.length; pi++) {
            idxRows = idxRows.concat(buckets[live[pi].token] || []);
          }
          var pc = CS.publicCoverage(pid, idxRows);
          // The lane's own words, read from the module that owns them rather than
          // spelled again here — one lane, one name, on every surface that prints it.
          var L = (CS.LANE_LABELS || {});
          pubFoot = '<p class="pdxwa-oc-pubfoot"><b>' + esc((L.outsideFull || 'Outside the score') +
            ' · on file for ' + pc.issues + ' of ' + pc.total + ' issue' + (pc.total === 1 ? '' : 's') + '.') + '</b> ' +
            esc('That is the reported record — a separate test of the same stances, from statements and ' +
                'coverage. It is a count, never a percentage, and none of it is inside the ' +
                'Direction Match above.') + '</p>';
        }
      } catch (e) { pubFoot = ''; }

      return '<div class="pdxwa-oc" id="' + esc(uid) + '">' +
          '<div class="pdxwa-oc-t">Issue by issue — did the record back the word?</div>' +
          '<div class="pdxwa-oc-sub">' + esc('One verdict per issue. Where a formal action could test the claim it decided; where none could, the public record did — never both.') + '</div>' +
          '<div class="pdxwa-oc-seg" role="tablist" aria-label="Results by issue — pick a result">' + tabs + '</div>' +
          '<div class="pdxwa-oc-panels">' + panels + '</div>' +
          // FLAT MODE, KEPT AND DEMOTED. One bucket at a time is the reading order
          // this index is built for, and it is what both screens now do. But a reader
          // comparing two buckets, or checking that the four add up to the
          // denominator, wants the whole thing in one stack — so the old all-lists
          // view survives as an explicit mode behind one control, rather than as the
          // desktop's default layout. It reveals the panels that are already on the
          // page; nothing is re-rendered and the selection is not disturbed, so
          // leaving flat mode puts the reader back on the bucket they came in on.
          '<div class="pdxwa-oc-allw">' +
            '<button type="button" class="pdxwa-oc-all" data-pdxwa-oc-all="' + esc(uid) + '"' +
              ' aria-pressed="false" aria-controls="' + esc(uid) + '">' +
              '<span class="pdxwa-oc-all-a">' + esc('See the full breakdown — all ' + b.total +
                ' issue' + (b.total === 1 ? '' : 's') + ' in one list') + '</span>' +
              '<span class="pdxwa-oc-all-b">' + esc('Back to one bucket at a time') + '</span>' +
            '</button>' +
          '</div>' +
          '<p class="pdxwa-oc-foot">' + esc(foot) + '</p>' +
          mapFoot +
          pubFoot +
        '</div>';
    } catch (e) { return ''; }
  }

  // ── SELECTION, IN ONE PLACE ────────────────────────────────────────────────
  // Moving the selection is three loops over the same section: the strip's counts
  // and bar segments, the index's chips, and the panels. Two callers need it — a
  // reader's tap, and the warm repaint that has to put back the bucket the reader
  // had chosen — and two copies of it is how the strip and the panel drift apart.
  // Presentational only: `.is-on` and the aria state, never a word of the record.
  // ── CONTROLS MOUNTED OUTSIDE THE SECTION ───────────────────────────────────
  // Everything above lives inside one [data-pdxwa] wrapper, which is why one
  // root-scoped sweep can move the strip, the chips and the panels together. The
  // letterhead tally does not: it is emitted by the profile builder into the page
  // header, several thousand characters of markup above the section it drives, and
  // no common ancestor short of the modal body holds both.
  //
  // So it declares itself. `data-pdxwa-outside="<uid>"` names the index a control
  // belongs to, and this is the one place that lookup happens — a document query
  // narrowed by the uid, which is derived from the politician alone, so it can only
  // ever match controls pointed at this exact index. The root-scoped sweep is left
  // exactly as it was: a stray control elsewhere on the page cannot widen the scope
  // of a selection, it can only opt into one.
  function selectDetached(uid, tok) {
    try {
      if (typeof document === 'undefined' || !document.querySelectorAll) return;
      var out = document.querySelectorAll('[data-pdxwa-outside="' + uid + '"]');
      for (var i = 0; i < out.length; i++) {
        var on = out[i].getAttribute('data-pdxwa-seg') === tok;
        if (out[i].classList) out[i].classList.toggle('is-on', on);
        out[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    } catch (e) {}
  }

  // Read the selection back OFF the index and onto the detached controls. Used
  // after the letterhead tally re-renders on a warm record, when its fresh markup
  // opens on the default bucket and the list on screen is on the reader's.
  function reflectOpenBucket(uid) {
    try {
      if (typeof document === 'undefined' || !document.getElementById) return;
      var idx = document.getElementById(uid);
      if (!idx || !idx.querySelector) return;
      var on = idx.querySelector('[data-pdxwa-oc-panel].is-on');
      var tok = on && on.getAttribute('data-pdxwa-oc-panel');
      if (tok) selectDetached(uid, tok);
    } catch (e) {}
  }

  function selectBucket(root, uid, tok) {
    if (!root || !uid || !tok || !root.querySelectorAll) return false;
    var panes = root.querySelectorAll('[data-pdxwa-oc-panel]');
    // A token with no panel in this root is not a selection. Switching to it would
    // turn every panel off and leave the index showing nothing — which is how a
    // stale bucket name, restored across a repaint, blanks the whole list.
    var exists = false;
    for (var k = 0; k < panes.length; k++) {
      if (panes[k].getAttribute('data-pdxwa-oc-panel') === tok) exists = true;
    }
    if (!exists) return false;
    var tabs = root.querySelectorAll('[data-pdxwa-seg-uid="' + uid + '"]');
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i].getAttribute('data-pdxwa-seg') === tok;
      tabs[i].classList.toggle('is-on', on);
      // Two kinds of control, two correct words for "selected". The index's chips
      // are tabs and own their panels; the strip's counts are toggle buttons that
      // point at them. aria-selected on a plain button says nothing to a screen
      // reader, and aria-pressed on a tab fights its role — so each control is
      // told in its own vocabulary.
      if (tabs[i].getAttribute('role') === 'tab' || tabs[i].getAttribute('aria-selected') !== null) {
        tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
      } else {
        tabs[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    }
    for (var j = 0; j < panes.length; j++) {
      panes[j].classList.toggle('is-on', panes[j].getAttribute('data-pdxwa-oc-panel') === tok);
    }
    // Last, the copies of these controls that are not in this root at all — today,
    // the letterhead tally. Done here rather than at the call sites so that every
    // route into a bucket moves it: a tap on the bar, a tap on a chip, and the warm
    // repaint that puts the reader's bucket back all pass through this function.
    selectDetached(uid, tok);
    return true;
  }

  // ── THE SWITCHER, AND THE TAP INTO THE DOSSIER ─────────────────────────────
  // One delegated listener on the document, bound once for the life of the page.
  // The index is re-rendered whole whenever the voting record warms — a listener
  // bound to the block would be a listener on a node that no longer exists, and
  // per-render binding on a surface that repaints is how duplicate handlers
  // accumulate. Delegation costs one listener and survives every repaint.
  // ── MOUNTING AND OPENING THE INDEX A COUNT POINTS AT ───────────────────────
  // The tally and the shape strip are navigators into the index, and the index is
  // now behind a closed, deferred lid. So a tap on a count has three things to do
  // before it can select anything: mount the stashed body, open the fold, and only
  // then move the selection — a panel that is not on the page cannot be selected,
  // and a selection inside a shut box cannot be seen.
  //
  // toggleDD() already does the first two together (it calls
  // PDXProfileSpine.materialize before it flips the open class, and it corrects the
  // scroll position so the control the reader aimed at stays put), which is why
  // this reaches for the lid BY ID rather than walking up from the index: while the
  // body is still a string there is nothing to walk up from.
  //
  // Fails open in both directions that matter. No lid on the page — applyLids never
  // ran, or the payload was too small to fold — means the index is already inline
  // and there is nothing to open. An already-open lid is left alone rather than
  // toggled shut under a reader who is aiming at a bucket inside it.
  function revealIndex(uid) {
    try {
      if (typeof document === 'undefined' || !document.getElementById) return;
      var lid = document.getElementById(LID_INDEX_ID);
      if (lid) {
        var shut = !(lid.classList && lid.classList.contains('dd-open'));
        if (shut && typeof window.toggleDD === 'function') { window.toggleDD(LID_INDEX_ID); return; }
      }
      // No lid, or a lid already open whose body is somehow still stashed: ask the
      // spine directly for whatever drawer holds this id.
      if (!document.getElementById(uid) && typeof window._pdxRevealTarget === 'function') {
        window._pdxRevealTarget(uid);
      }
    } catch (e) {}
  }

  var _ocArmed = false;
  function armIndex() {
    try {
      if (_ocArmed || typeof document === 'undefined' || !document.addEventListener) return;
    } catch (e0) { return; }
    _ocArmed = true;
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      // The bucket switcher — and, since the shape strip's counts and bar segments
      // carry the same three attributes, the gateway above it. Selection is
      // presentational: it moves `.is-on` and the aria state and nothing else, so it
      // can never disagree with what the record says, only with which part of it is
      // on screen.
      //
      // ONE SCOPE FOR BOTH CONTROL SETS. This used to resolve `.pdxwa-oc` — the index
      // itself — which is the one ancestor the strip's controls do not share with the
      // chips they mirror. It now resolves the whole ⚖️ section, so a tap on a count
      // moves the strip chip, the bar segment, the index chip and the panel together;
      // the old selector is kept as the fallback, so a control mounted outside the
      // section wrapper still switches its own index rather than doing nothing.
      var seg = e.target.closest('[data-pdxwa-seg]');
      if (seg) {
        e.preventDefault();
        try {
          var uid = seg.getAttribute('data-pdxwa-seg-uid') || '';
          var tok = seg.getAttribute('data-pdxwa-seg') || '';
          var gate = seg.getAttribute('data-pdxwa-gate');
          var root = seg.closest('[data-pdxwa]') || seg.closest('.pdxwa-oc');
          // A control that declares itself outside the section has no index to walk
          // up to, so the index is resolved DOWN from its uid instead — that is the
          // whole point of the id namespace being derived from the politician. The
          // root is then widened to the section wrapper, so one tap in the
          // letterhead still moves the strip, the bar, the in-card tally, the chips
          // and the panel in one pass, exactly as a tap inside the section does.
          // A GATED CONTROL IS A CONTROL OUTSIDE THE FOLD. `gate` is set on exactly
          // the copies that sit above the index — the strip's counts and bar
          // segments, and the letterhead tally — so it is also the exact signal
          // that the index may still be shut or stashed. Chips inside the index
          // carry no gate and need no reveal: they are only reachable once it is
          // open. Done before the root lookup, because the root of a control in the
          // letterhead is resolved DOWN from the index's id.
          if (gate) revealIndex(uid);
          if (!root && uid) {
            try {
              var live = document.getElementById(uid);
              root = (live && live.closest && live.closest('[data-pdxwa]')) || live;
            } catch (e1) {}
          }
          if (!root || !uid) return;
          selectBucket(root, uid, tok);
          // Picking a bucket means picking ONE bucket, so the all-in-one-stack mode
          // ends here rather than staying on and showing four lists under a chip
          // that names one.
          var idx = (root.querySelector && root.querySelector('.pdxwa-oc')) ||
                    ((root.classList && root.classList.contains('pdxwa-oc')) ? root : null);
          if (idx && idx.classList) idx.classList.remove('is-flat');
          // Tapped from the summary — a screen above the list on a phone — so bring
          // the index to the top of the viewport. The reader lands on the bucket
          // heading with its rows under it, rather than wherever the strip left them.
          //
          // THROUGH THE PAGE'S OWN JUMP, NOT scrollIntoView. `block: 'start'` puts
          // the index at y=0 of the scroller, which on a profile is UNDER the sticky
          // section rail — a reader who taps a count in the letterhead lands on a
          // bucket heading hidden behind the nav and has to scroll back up to read
          // the thing they asked for. _pdxNavJump measures the rail, opens any shut
          // control above the target and offsets by both, which is the same landing
          // every other jump on the page gets. It scrolls #modal-body, so it is used
          // only where that scroller exists; everywhere else the plain scroll is
          // still correct and still fires.
          if (gate && idx) {
            var jumped = false;
            try {
              if (idx.id && typeof window._pdxNavJump === 'function' &&
                  document.getElementById && document.getElementById('modal-body')) {
                window._pdxNavJump(idx.id);
                jumped = true;
              }
            } catch (e6) {}
            if (!jumped && idx.scrollIntoView) {
              idx.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        } catch (e2) {}
        return;
      }
      // Flat mode — the old all-lists-at-once view, now behind one control. A class
      // on the index root and nothing more: the panels it reveals are already
      // rendered and already carry the selection, so the mode is reversible without
      // a repaint and cannot lose the reader's bucket.
      var all = e.target.closest('[data-pdxwa-oc-all]');
      if (all) {
        e.preventDefault();
        try {
          var aroot = all.closest('.pdxwa-oc');
          if (!aroot || !aroot.classList) return;
          var flat = !aroot.classList.contains('is-flat');
          aroot.classList.toggle('is-flat', flat);
          all.setAttribute('aria-pressed', flat ? 'true' : 'false');
        } catch (e5) {}
        return;
      }
      // The row. openGap() is PDXConsistency's own entry point to the issue
      // dossier — the same one the stance rows use — so there is exactly one
      // assembled sheet in the app and this surface only decides which issue it
      // opens on. Fails closed: no consistency module, no navigation, and the row
      // is left as inert text rather than a control that swallows the tap.
      //
      // SWALLOWING IS THE FAILURE MODE, not throwing. This block used to call
      // preventDefault() first and wrap the open in `catch (e3) {}`. If openGap
      // could not put a sheet on screen — module half-loaded, backdrop detached,
      // assembly throwing — the tap was consumed and absolutely nothing happened:
      // no sheet, no default action, no error, no second chance. A row that looks
      // like a button and eats taps is worse than a row that is plainly inert.
      //
      // So the default is now consumed only once openGap has confirmed a sheet is
      // up. openGap returns true for that; a module too old to return anything is
      // read as a success, which is the behaviour this had before.
      // The 🧾 tally beside the row. Same sheet, same entry point, same fail-closed
      // contract as the row above — it differs in one option: the sheet is asked to
      // stop on the public column rather than at the top. Read BEFORE the row branch
      // because the tally lives inside the same <li>, and a reader who aimed at the
      // public line should get the public column even if a future layout ever nests
      // the two.
      var pub = e.target.closest('[data-pdxwa-pub]');
      if (pub) {
        var CSP = window.PDXConsistency;
        if (!CSP || typeof CSP.openGap !== 'function') return;
        var pOpened = false;
        try {
          var pRes = CSP.openGap(pub.getAttribute('data-pdxwa-pub-pid') || '', pub.getAttribute('data-pdxwa-pub') || '',
            { arrival: false, origin: pub.getAttribute('data-pdxwa-pub-origin') || '', focus: 'public' });
          pOpened = (pRes !== false);
        } catch (e4) { pOpened = false; }
        if (pOpened) e.preventDefault();
        return;
      }
      var row = e.target.closest('[data-pdxwa-dos]');
      if (row) {
        var CS = window.PDXConsistency;
        if (!CS || typeof CS.openGap !== 'function') return;
        var opened = false;
        try {
          var res = CS.openGap(row.getAttribute('data-pdxwa-dos-pid') || '', row.getAttribute('data-pdxwa-dos') || '',
            { arrival: false, origin: row.getAttribute('data-pdxwa-dos-origin') || '' });
          opened = (res !== false);
        } catch (e3) { opened = false; }
        if (opened) e.preventDefault();
      }
    });
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

    // The slice's own denominator, for the slice's own read — never the all-time
    // count, which is the whole point of a scoped figure. Same noun as the caption
    // under the big number above so a reader comparing the two is comparing like
    // with like.
    var counted = c.coverage.tested + ' of ' + c.coverage.scorable + ' issues tested';

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
      '<div class="pdxwa-slice" data-pdxwa-slice-tested="' + (c.coverage.tested || 0) + '"' +
        ' style="--pdxwa-col:' + col + ';">' +
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

  // ── HOW MANY TESTS SIT UNDER THE NUMBER ─────────────────────────────────────
  // A percentage with no denominator is the easiest number in this product to
  // unmask. "100%" over three tested issues and "100%" over forty are the same
  // three characters, and until now only the tree leaves — behind a lid — said
  // which one a reader was looking at. The thin ones look strongest, which is
  // exactly backwards, and a hostile reader who opens the tree finds it out in one
  // click. So every surface that publishes the figure now publishes its depth in
  // the same chrome, unconditionally.
  //
  // ALWAYS ON WHENEVER A % IS SHOWN. There is no threshold and no gate: gating on
  // depth would hide the denominator precisely where it matters most. A thin score
  // and a deep one carry the caption in the same words, the same place and the
  // same weight.
  //
  // THE INTEGER IS THE ENGINE'S OWN. `coverage.tested` is the count read() already
  // uses for the tested set — the same rows that produced the weighted average —
  // so the caption cannot drift from the number it captions. Nothing here computes
  // anything: no second score, no ratio, no grade. It is the denominator, said out
  // loud.
  //
  // SCOPE FOLLOWS THE FIGURE. Callers pass the read whose percentage they are
  // printing, so the current-term slice captions its own tested count and never
  // the all-time one.
  //
  // PUBLIC LANE IS NOT IN IT, for the same reason it is not in the percentage.
  function testedOf(r) {
    var n = r && r.coverage && r.coverage.tested;
    return (typeof n === 'number' && isFinite(n) && n > 0) ? Math.round(n) : 0;
  }
  function depthCaption(n) {
    n = (typeof n === 'number' && isFinite(n) && n > 0) ? Math.round(n) : 0;
    return n ? (n + ' issue' + (n === 1 ? '' : 's') + ' tested') : '';
  }
  // The one-line explainer under the caption, offered to surfaces with room for it.
  // It is not a second score and it is not a hedge: it says what the figure counted
  // and names the two things it is not.
  var DEPTH_NOTE = 'How often the formal record matched the positions they stated, ' +
    'across the issues we could test. Not an approval rating.';

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
      // The denominator, in the number block, whenever there is a numerator. See
      // depthCaption(): no gate, no threshold, and read off the same `r` the
      // percentage above came from so the two always describe the same tested set.
      var depthTag = hasPct
        ? '<div class="pdxwa-num-n" data-pdxwa-tested="' + testedOf(r) + '">' +
            esc(depthCaption(testedOf(r))) + '</div>'
        : '';

      var body = '' +
        '<div class="pdxwa-top">' +
          '<div class="pdxwa-num pdxwa-num-' + cls + '" style="--pdxwa-col:' + col + ';">' +
            '<div class="pdxwa-num-v">' + (hasPct ? r.pct + '%' : '—') + '</div>' +
            '<div class="pdxwa-num-l">' + esc(FRAME.metric) + '</div>' +
            depthTag +
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
        // THE SHAPE, BESIDE THE NUMBER. Four counts in the index's own words,
        // attached to the figure they describe rather than a screen below it —
        // and each one a door into that bucket's list. Counts only: the profile
        // still has exactly one percentage on it, and it is the one above.
        tallyHtml(pid) +
        // What the number means and what it does not claim, before anything else
        // has a chance to be read as a second finding.
        meansHtml(hasPct) +
        scopeStripHtml(sr) +
        // The shape behind the average. A single mean cannot say whether it came
        // from a record that agrees with itself everywhere or one pulling apart,
        // and the composition strip is the cheapest place to make that visible.
        //
        // IT HANDS STRAIGHT TO THE SENTENCE THAT READS IT. The strip is still a
        // navigator — every count and every bar segment selects a bucket in the
        // index — but the index is behind one control now, so what follows the strip
        // is the one short paragraph that says what the shape means, and then the
        // section stops.
        compositionHtml(pid) +
        shapeNotesHtml(pid) +
        // ─────────────────────────────────────────────────────────────────────
        // EVERYTHING BELOW THIS LINE IS CLOSED BY DEFAULT. Two controls, in the
        // order a reader asks for them: which issues made this number, and how the
        // number is built. Nothing else renders between the shape above and 🌳 All
        // Issues by Topic in the next section — which is the whole point of the
        // pass. The blocks themselves are unchanged and none of them lost a word.
        indexLidHtml(pid) +
        apparatusHtml(pid, p, r);

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
        // THE BUCKET THE READER PICKED SURVIVES IT TOO. The strip is a navigator,
        // so the open bucket is a place in the section, not decoration: a record
        // that warms while someone is reading the contradicted list should not
        // silently drop them back on whichever bucket the fresh markup opens with.
        // Flat mode is part of the same choice and comes back with it.
        var wasBucket = '';
        var wasFlat = false;
        try {
          var onPane = liveBody.querySelector('[data-pdxwa-oc-panel].is-on');
          if (onPane) wasBucket = onPane.getAttribute('data-pdxwa-oc-panel') || '';
          var liveOc = liveBody.querySelector('.pdxwa-oc');
          wasFlat = !!(liveOc && liveOc.classList && liveOc.classList.contains('is-flat'));
        } catch (e5) {}
        liveBody.innerHTML = freshBody.innerHTML;
        // THE FOLDS COME BACK BEFORE THE SELECTION DOES. The index lives inside a
        // deferred lid now, so a reader who had opened it and picked a bucket is
        // looking at panels that this innerHTML swap just re-stashed as a string.
        // Restoring the bucket first would run selectBucket against a body with no
        // panels in it, find nothing, and silently drop them back on the default —
        // so the reopen runs first and the selection is put back after it, in the
        // same tick, against whatever is actually mounted.
        var restoreSel = function () {
          try {
            if (wasBucket) selectBucket(liveBody, ocUid(pid), wasBucket);
            if (wasFlat) {
              var newOc = liveBody.querySelector('.pdxwa-oc');
              if (newOc && newOc.classList) newOc.classList.add('is-flat');
              var allBtn = liveBody.querySelector('[data-pdxwa-oc-all]');
              if (allBtn) allBtn.setAttribute('aria-pressed', 'true');
            }
          } catch (e6) {}
        };
        setTimeout(function () {
          try {
            if (typeof window._pdxRestoreDD === 'function') { window._pdxRestoreDD(liveBody); restoreSel(); return; }
          } catch (e4) {}
          wasOpen.forEach(function (id) {
            try {
              var b = document.getElementById(id);
              if (b && !b.classList.contains('dd-open') && typeof window.toggleDD === 'function') window.toggleDD(id);
            } catch (e3) {}
          });
          restoreSel();
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
    // The issue index's result buckets: token, heading, short name, colour. Published
    // so the issue dossier can open under the SAME word and the SAME colour the row a
    // reader tapped was filed under. One vocabulary, one source; a bucket renamed here
    // is renamed in the dossier header on the next paint, and neither surface can
    // invent a result the other does not have.
    OUTCOMES: OUTCOMES,
    outcomeFor: outcomeFor,
    // The All-Seeing Eye politician chip, in the buckets' own vocabulary. See
    // searchBadgeHTML(): one meaning — the strongest result in this politician's
    // issue index — so the chip and the profile can never name different things.
    // Where there is no result to name because nothing of theirs was ever quotable,
    // it falls through to recordBadgeHTML rather than to silence: the formal record
    // is still a record, and browse is where that used to be denied.
    searchBadgeHTML: searchBadgeHTML,
    // The formal-inventory fallback, published on its own so a surface that wants
    // "how big is the formal record" can ask for exactly that without going through
    // the result chip. Counts only — no percentage, no direction, no grade.
    recordBadgeHTML: recordBadgeHTML,
    recordDepth: recordDepth,
    // Pure reads — no DOM, no fetch, safe to call from anywhere.
    wordLedger: wordLedger,
    read: read,
    // Both scopes in one call: the all-time read every headline prints, plus the
    // current-term slice for a figure who is serving. See scopedRead().
    scopedRead: scopedRead,
    issueRead: issueRead,
    heroRead: heroRead,
    // 📏 THE DENOMINATOR, IN ONE VOCABULARY. Every surface that publishes the
    // engine's percentage prints the tested count beside it, and they all print it
    // in these words — a caption that reads "32 issues tested" here and "over 32"
    // somewhere else is two captions, and one of them will rot. `testedOf(read)`
    // pulls the integer off whichever read the caller is publishing, so scope
    // follows the figure; `depthCaption(n)` turns it into the phrase. See the note
    // over testedOf().
    testedOf: testedOf,
    depthCaption: depthCaption,
    DEPTH_NOTE: DEPTH_NOTE,
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
    // The letterhead's formal tally — the four bucket counts, in the header, beside
    // the ring rather than a scroll below it. headerTallyMount() is the mountable
    // form (host + warm refresh); headerTallyHtml() is the pure string. Counts only,
    // formal lane only, and nothing at all below the two-issue floor.
    headerTallyMount: headerTallyMount,
    headerTallyHtml: headerTallyHtml,
    // The tail of that same header stack: how much record is on file, in the
    // vocabulary the section below uses for it, plus the span the figure covers
    // where a span is a real distinction. Display-only, no percentage, no gateway
    // of its own — the tally above it is the header's one set of doors.
    headerStackMount: headerStackMount,
    headerStackHtml: headerStackHtml,
    heroHtml: heroInner,
    dotsHtml: dotsHtml
  };
})();
