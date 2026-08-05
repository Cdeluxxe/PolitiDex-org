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
       (interviews, news, social posts) is ever an ACTION here: that is Say-vs-Do's
       lane, and blending the two would make the test unfalsifiable.

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
    metric: 'Stood by their word',
    // The hero ring has room for two short lines and no more, so the primary
    // score gets a caption a voter can read at a glance. "Kept word" is the
    // plain-English form of the metric above — deliberately NOT "Promises",
    // which now names only the top tier inside this read.
    caption: 'Kept word'
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
  function brandingIssueKey(label) {
    var norm = String(label == null ? '' : label).toLowerCase().trim();
    if (norm.length < 4) return null;
    var im = null;
    try { im = window.ISSUE_MAP || null; } catch (e) { im = null; }
    if (!im) return null;
    var hits = {}, best = 0;
    Object.keys(im).forEach(function (k) {
      var kws = (im[k] && im[k].keywords) || [];
      for (var i = 0; i < kws.length; i++) {
        var kw = String(kws[i] == null ? '' : kws[i]).toLowerCase();
        // Short keywords ('tax', 'debt', 'audit') identify a topic, not an issue.
        if (kw.length < 5 || kw.length < best) continue;
        var re = new RegExp('(?:^|[^a-z0-9])' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:[^a-z0-9]|$)');
        if (norm === kw || re.test(norm)) {
          if (kw.length > best) { best = kw.length; hits = {}; }
          hits[k] = kw;
        }
      }
    });
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
    var seenIssue = {};
    (list || []).forEach(function (s, i) {
      if (!s || !s.issueKey || seenIssue[s.issueKey]) return;
      seenIssue[s.issueKey] = 1;
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
  // silent about them would be worse: the profile shows a pledge percentage right
  // next to a pledge tier reading "none on file". So they are surfaced as their own
  // fact, in the tier row, pointing at the number that does count them.
  function pledgeAggregate(p) {
    if (!p) return null;
    if (Array.isArray(p.promises) && p.promises.length) return null;
    var k = +p.kept || 0, b = +p.broken || 0, pd = +p.pending || 0;
    if (!(k + b + pd)) return null;
    return { kept: k, broken: b, pending: pd, resolved: k + b, total: k + b + pd };
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

  // ── THE ACTION TEST ────────────────────────────────────────────────────────
  // One word item in, one outcome out. Every 'tested' result carries a token that
  // came from the Official Record itself — this function classifies nothing.
  function testOf(it, pid) {
    // Word that cannot carry a number, decided in the ledger: a position written
    // from the record itself, or a signature issue with no issue key. Reported as
    // coverage, never as a mark against anyone.
    if (it.scored === false) {
      return { state: 'untested', token: 'no_record',
               reason: it.kind === 'position-derived' ? 'record_derived' : 'not_issue_linked' };
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
        evidence: Math.max(1, Math.min(j || 1, EVIDENCE_CAP)),
        judged: j, basis: (ov.sources && ov.sources[0]) || 'record'
      };
    }
    if (ov.pending) return { state: 'untested', reason: 'warming', token: 'pending' };
    return { state: 'untested', reason: 'no_action_yet', token: 'no_record' };
  }

  // ── THE READ ───────────────────────────────────────────────────────────────
  function read(pid, p) {
    var items = wordLedger(pid, p);
    var tested = [], untested = [];
    var counts = { consistent: 0, contradicts: 0, mixed: 0, limited: 0 };
    var wSum = 0, wN = 0, warming = false, issueLinked = 0, derived = 0, scorable = 0;
    var tiers = {};
    TIER_ORDER.forEach(function (t) { tiers[t] = { key: t, total: 0, scorable: 0, tested: 0, weight: 0 }; });

    items.forEach(function (it) {
      var t = testOf(it, pid);
      it.test = t;
      if (it.issueKey) issueLinked++;
      if (it.kind === 'position-derived') derived++;
      if (it.scored !== false) scorable++;
      var bucket = tiers[it.tier] || (tiers[it.tier] = { key: it.tier, total: 0, scorable: 0, tested: 0, weight: 0 });
      bucket.total++;
      if (it.scored !== false) bucket.scorable++;
      if (t.state === 'tested') {
        tested.push(it);
        var w = it.weight * (t.evidence || 1);
        it.appliedWeight = w;
        wSum += t.score * w; wN += w;
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
    var outcomeToken;
    if (counts.contradicts > 0 && counts.consistent > 0) outcomeToken = 'mixed';
    else if (counts.contradicts > 0) outcomeToken = 'contradicts';
    else if (counts.consistent > 0) outcomeToken = 'consistent';
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
      items: items, tested: tested, untested: untested,
      counts: counts, tiers: tiers,
      testedWeight: wN,
      pledgeAggregate: pledgeAggregate(p),
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
    var n;
    if (agg) n = '<span class="pdxwa-tier-agg">' + agg.resolved + ' in the tracker, none itemized</span>';
    else if (!have) n = 'none on file';
    else if (!can) n = '<span class="pdxwa-tier-agg">' + have + ' on file, none testable</span>';
    else n = got + '<span class="pdxwa-tier-of">/' + can + ' tested' +
             (off ? '<br>+' + off + ' not testable' : '') + '</span>';
    return '' +
      '<li class="pdxwa-tier pdxwa-tier-' + t + ((have || agg) ? '' : ' pdxwa-tier-empty') + '">' +
        '<span class="pdxwa-tier-ico" aria-hidden="true">' + def.ico + '</span>' +
        '<span class="pdxwa-tier-main">' +
          '<span class="pdxwa-tier-name">' + esc(def.label) + '<span class="pdxwa-tier-w">' + esc(def.counts) + '</span></span>' +
          '<span class="pdxwa-tier-gloss">' + esc(agg
            ? 'A resolved kept/broken tally carried over from the promise tracker, with no individual pledges written up yet — so it is counted in the pledge follow-through number further down, not in this weighted read.'
            : def.gloss) + '</span>' +
        '</span>' +
        '<span class="pdxwa-tier-n">' + n + '</span>' +
      '</li>';
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

  function methodHtml(r) {
    return '' +
      '<details class="pdxwa-method">' +
        '<summary>How this is counted</summary>' +
        '<div class="pdxwa-method-body">' +
          '<p><b>Word</b> is weighted by how firmly it was said: a pledge counts ' + TIERS.pledge.weight +
            ', a stated position ' + TIERS.position.weight + ', a signature issue they campaign on ' + TIERS.branding.weight +
            '. An issue also earns up to ' + r.floors.evidenceCap + '× for the depth of formal record behind it, ' +
            'so an issue decided by one vote does not count as much as one decided by ten.</p>' +
          '<p><b>Action</b> is the Official Record only — roll-call votes, sponsorships and formal acts. ' +
            'Interviews, news coverage and social posts are never counted as action here; they are word, or they belong to Say-vs-Do.</p>' +
          '<p><b>A position cannot be its own test.</b> Many of our position write-ups are drawn from the formal record — ' +
            '“Voted no on H.R. 8”, cited to the House Clerk. Scoring that against the same roll call would return 100% for ' +
            'everyone and mean nothing, so those items are listed as positions and left out of the number. Only word with ' +
            'something of their own in it — a quotation, a stated view, a platform or campaign claim — is tested.</p>' +
          '<p><b>The percentage</b> is the weighted share of tested word their record backs up. It appears only once at least ' +
            r.floors.items + ' items are tested and their combined weight reaches ' + r.floors.weight +
            ', so a whole-profile read never rests on a single vote. Unresolved pledges and untested positions are excluded ' +
            'from the number and reported as coverage instead — they are not counted against anyone.</p>' +
          '<p><b>Nothing is inferred.</b> An issue with votes but no documented word produces no item, and an item counts as ' +
            'going against their word only when the Official Record’s own verdict for that issue says so.</p>' +
        '</div>' +
      '</details>';
  }

  // ── WHAT FEEDS THIS SCORE ──────────────────────────────────────────────────
  // The profile used to read as four independent score widgets that happened to
  // share a page: a promise percentage, a Word vs Action percentage, an Official
  // Record percentage and a Say-vs-Do integrity percentage. Nothing on screen
  // said how they related, so a reader had to guess which one was "the" number.
  // This panel is that missing sentence, made navigable: every layer is named,
  // told what it contributes, counted, and linked. Word tiers feed the number,
  // the Official Record is the test, and Say-vs-Do is context that is explicitly
  // NOT in the arithmetic — said out loud rather than left to inference.
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
        rows.push({ ico: TIERS.pledge.ico, name: 'Promise receipts', target: 'pdxsec-score', counted: true,
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
        role: 'The test — roll-call votes and formal acts, judged issue by issue',
        n: c.tested + ' of ' + c.scorable + ' tested' });
      if (window.PDXConsistency && typeof window.PDXConsistency.saydoSectionHtml === 'function') {
        rows.push({ ico: '🧾', name: 'Say-vs-Do receipts', target: 'pdxsec-saydo', counted: false,
          role: 'Supporting receipts and context — never folded into this percentage',
          n: 'Detail' });
      }
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

  // The primary accountability surface on a profile.
  var _seq = 0;
  function headlineHtml(pid, p) {
    try {
      if (!pid || !p) return '';
      var r = read(pid, p);
      // Nothing said and nothing tracked — no surface at all rather than an empty
      // frame implying the record should be here.
      if (!r.coverage.word) return '';

      var uid = (String(pid) + '-' + (++_seq)).replace(/[^A-Za-z0-9_-]/g, '');
      var name = (p.name || 'this official').split(' ').slice(-1)[0] || p.name || 'they';
      var v = r.verdict;
      var col = (v && v.color) || '#9fb4d4';
      var cls = (v && v.cls) || 'none';
      var hasPct = r.pct !== null;

      var body = '' +
        '<div class="pdxwa-top">' +
          '<div class="pdxwa-num pdxwa-num-' + cls + '" style="--pdxwa-col:' + col + ';">' +
            '<div class="pdxwa-num-v">' + (hasPct ? r.pct + '%' : '—') + '</div>' +
            '<div class="pdxwa-num-l">' + esc(FRAME.metric) + '</div>' +
          '</div>' +
          '<div class="pdxwa-say">' +
            '<div class="pdxwa-verdict" style="color:' + col + ';">' +
              (v ? esc(v.ico + ' ' + v.label) : 'Building the record') + '</div>' +
            '<p class="pdxwa-line">' +
              (hasPct
                ? esc('Weighed across ' + r.coverage.tested + ' documented statement' + (r.coverage.tested === 1 ? '' : 's') +
                      ' that a formal action can test. ' + (v ? v.short : ''))
                : esc(thinCopy(r, name))) +
            '</p>' +
          '</div>' +
        '</div>' +
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
        feedsHtml(pid, p, r) +
        methodHtml(r);

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
        var wasOpen = [];
        try {
          var open = liveBody.querySelectorAll('.dd-body.dd-open[id^="pdxsp-lid-"]');
          for (var i = 0; i < open.length; i++) if (open[i].id) wasOpen.push(open[i].id);
        } catch (e2) {}
        liveBody.innerHTML = freshBody.innerHTML;
        if (wasOpen.length) setTimeout(function () {
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
      var r = read(pid, p);
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
      return {
        read: r,
        word: c.word,
        pct: r.pct,
        // Fail closed in the hero too: below the floors there is a dash or a
        // waiting mark, never a number borrowed from a narrower lane.
        text: hasPct ? (r.pct + '%') : (c.warming ? '⏳' : '—'),
        color: hasPct ? ((v && v.color) || '#9fb4d4') : '#9fb4d4',
        caption: FRAME.caption,
        verdict: v, token: r.token, publishable: r.publishable,
        tested: c.tested, scorable: c.scorable, warming: c.warming,
        sub: sub
      };
    } catch (e) { return null; }
  }

  // Promises keep their place in the header as a COUNT, never as a second
  // percentage. The pledge lane is the top tier INSIDE the number above, so a
  // rate here would be the same evidence rendered twice against a narrower
  // denominator — which is exactly the rivalry the one-score pass removed.
  // Counts add what a rate cannot: how much of the ledger has actually closed.
  function pledgeChipHtml(opts) {
    var g = opts && opts.pledge;
    if (!g) return '';
    var k = Number(g.kept) || 0, b = Number(g.broken) || 0, pen = Number(g.pending) || 0;
    if (k + b + pen <= 0) return '';
    var parts = [];
    if (k) parts.push(k + ' kept');
    if (b) parts.push(b + ' broken');
    if (pen) parts.push(pen + ' pending');
    var txt = parts.join(' · ');
    return '' +
      '<button type="button" class="pdxwa-hero-pledge"' + jumpAttr('pdxsec-score') +
        ' aria-label="' + esc('Promise ledger: ' + parts.join(', ') + '. Open the promise block.') + '">' +
        '<span aria-hidden="true">🤝</span> ' + esc(txt) +
      '</button>';
  }

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
        '</div>' +
        pledgeChipHtml(opts);
    }
    var radius = 28, circ = 2 * Math.PI * radius;
    var dash = (h.pct === null ? 0 : h.pct / 100) * circ;
    return '' +
      '<button type="button" class="pdxwa-hero-jump"' + jumpAttr('pdxsec-wordaction') +
        ' aria-label="' + esc(FRAME.label + ': ' + h.text + ' ' + FRAME.metric + '. Open the full breakdown.') + '">' +
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
      '<div class="pdxwa-hero-sub">' + esc(h.sub) + '</div>' +
      pledgeChipHtml(opts);
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
              ? d.actions.map(function (a) { return '<span class="pdxwa-dot-act-1">' + esc(a.text) + '</span>'; }).join('')
              : '<span class="pdxwa-dot-none">No formal action on this issue is on record yet.</span>') +
          '</span>' +
        '</div>' +
        '<div class="pdxwa-dot-step pdxwa-dot-out">' +
          '<span class="pdxwa-dot-k">So</span>' +
          '<span class="pdxwa-dot-v" style="color:' + col + ';">' +
            (v ? esc(v.ico + ' ' + v.label) : 'Not yet testable') +
            (typeof d.outcome.judged === 'number' && d.outcome.judged > 0
              ? '<span class="pdxwa-dot-j">' + d.outcome.judged + ' judged vote' + (d.outcome.judged === 1 ? '' : 's') + '</span>' : '') +
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
