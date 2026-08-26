/* ============================================================================
   self-defection.js — a person against their own stated position
   ============================================================================
   WHY THIS FILE EXISTS

   ⚖️ Word vs Action already computes the finding. For each issue where a person
   has a real stated position of their own AND a formal act mapped to the same
   issue, word-action.js#testOf hands back a verdict from the Official Record —
   and one of the four verdicts it can hand back is `contradicts`. That verdict is
   published today only inside the score section, one row among the issue index,
   behind a bucket switcher, on one profile at a time. A reader who wants the
   plainest question in the product — "where did this person vote against
   something they said?" — has to open a profile, find the section, choose the
   right bucket and read the rows.

   This file publishes that list and nothing else. It computes NO verdict: every
   item here is a `contradicts` token that word-action already produced, on word
   that already cleared the independence rule, against a formal act that already
   carries a source URL. If Direction Match would not call it a contradiction,
   it is not in this list.

   ── WHAT THIS IS NOT, STRUCTURALLY ─────────────────────────────────────────

   The obvious product this data invites is a leaderboard: rank everyone by
   contradiction count, print the top ten, call it a hypocrisy index. That is a
   cross-person ranking derived from wildly uneven coverage — a member with a deep
   stance shelf and a deep roll-call record can produce eight items while a member
   with two curated stances produces none, and the second one would read as the
   more honest of the two. It would also be a fifth number about a person in a
   product that has decided it publishes two.

   So the walls are structural rather than editorial:

     · NO SCORE, ANYWHERE. There is no number on the returned shape that is a
       measurement of a person: no percentage, no ratio, no index, no rate. Item
       counts exist (a list has a length) and are never divided by anything.
     · NO CROSS-PERSON ORDER. `feed()` sorts by DATE, descending, and by nothing
       else. Ties break on issue label, alphabetically — a stable tie-break that
       is not a severity order. There is no sort by count, no "most", no "top",
       no per-person tally printed beside another person's.
     · NO GROUPING BY PERSON IN THE FEED. Grouping the dated feed under person
       headings turns it into a table with a longest column, which is a ranking
       with the numbers left off. The feed is a flat dated list; the per-person
       list is a separate call that only ever runs on that person's own file.
     · NO PARTY. The shape carries no party field and the copy names none. A
       contradiction is between a person and their own words; adding a party makes
       it a story about a team.
     · ONE PERSON, ONE ISSUE, ONE FORMAL ACT PATH per item. Each item names the
       stated position, the single formal act that ran against it, and the link to
       both the person file and the issue dossier where the whole record on that
       issue can be read — including whatever ran the other way.
     · DESCRIPTIVE VOICE. "Voted against a position they had stated." Not
       "betrayed", "broke their promise", "flip-flopped", "sold out". The reader
       draws the conclusion; the copy states the record.

   ── THE FLOOR IS DIRECTION MATCH'S OWN ─────────────────────────────────────

   Item-level, and identical to what an issue row already publishes:

     1. REAL STATED POSITION. The word must be independently worded (word-action's
        isIndependentWord) and must be the scored item for its issue. A position
        written from the record cannot contradict the record — that is circular,
        and word-action already refuses to score it, so it never reaches here.
     2. REAL FORMAL ACT. The contradicting act must resolve to a specific row with
        a source URL: a roll call, an executive document, or a curated formal
        action. No receipt, no item. This is also what keeps a broken tracked
        pledge out of the list — the pledge ledger resolves those against its own
        sourced outcomes, not against a formal act, and it has its own surface.
     3. THE VERDICT IS THE ENGINE'S. `contradicts`, from testOf, unmodified.

   What this deliberately does NOT gate on is the publication FLOOR on the
   percentage (MIN_TESTED_ITEMS / MIN_TESTED_WEIGHT). That floor exists so a
   PERCENTAGE is not published off two items; it has never gated a single row's
   verdict, and the issue index prints `contradicts` on a one-item issue today.
   Since this file publishes no percentage, there is nothing here for that floor to
   protect. Every item states its own evidence and links to the rest of it.

   ── DATES ──────────────────────────────────────────────────────────────────

   Reverse-chronological on the formal act's date, because that is the moment the
   contradiction became a matter of record. An act with no date is not dropped —
   dropping it would hide a real contradiction to make a sort clean — it is listed
   after the dated ones under a heading that says the date is missing.

   Consumers: profiles-full.js mounts personHtml() under ⚖️ Word vs Action.
   ========================================================================== */
(function () {
  'use strict';
  if (window.PDXSelfDefection) return; // idempotent

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function WA() { return window.PDXWordAction || null; }
  function CS() { return window.PDXConsistency || null; }

  // The one sentence this file is allowed to say about an item, per lane. The verb
  // follows the lane because a president casts no votes: "voted against" on a
  // presidential file would be false about the mechanism as well as the person.
  var SAY = {
    record: 'Voted against a position they had stated.',
    exec: 'Acted against a position they had stated.',
    'formal-actions': 'Took a formal action against a position they had stated.'
  };
  var SAY_DEFAULT = SAY.record;

  // Nothing on this lane feeds any of these. Declared on the object so a caller can
  // read the wall, and asserted by scripts/test-self-defection.mjs.
  var NEVER_FEEDS = ['directionMatch', 'wordVsAction', 'formalPatternTier',
                     'publicationFloor', 'formalActCounts', 'ballotSort', 'yourMatch',
                     'anyCrossPersonRanking', 'anyLeaderboard', 'anyCompositeScore'];

  function identity(pid) {
    var p = null;
    try { p = (window.PROFILES && window.PROFILES[pid]) || (window.CMP_DATA && window.CMP_DATA[pid]) || null; } catch (e) {}
    var name = (p && (p.name || p.fullName || p.displayName)) ||
      String(pid || '').replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    // `office` is context for a name a reader may not recognise. Party is not read
    // here and there is no field on the returned item to put it in.
    return { name: String(name), office: String((p && (p.office || p.title || p.role)) || '').trim() };
  }
  function issueLabel(k) {
    try { if (typeof window._issueLabel === 'function') return window._issueLabel(k) || k; } catch (e) {}
    return k;
  }
  function personPath(pid) {
    try {
      var P = window.PDXPerson;
      if (P && typeof P.path === 'function') return P.path(pid);
    } catch (e) {}
    return '/p/' + encodeURIComponent(String(pid || ''));
  }
  function dateText(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    try {
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return String(iso).slice(0, 10); }
  }

  // ── THE RECEIPT ────────────────────────────────────────────────────────────
  // One formal act, resolved through the SAME summariser word-action tested
  // against, so the act named here is the act the verdict rests on rather than a
  // second pick made by this file.
  //
  // `record.topContradiction` is the heaviest contradicting item on the issue and
  // is already how the profile's Official Record rows cite their proof — reusing it
  // means the citation on this list and the citation on the profile are the same
  // string built by the same function (PDXConsistency.proof.proofText).
  //
  // Returns null when nothing can be cited. A verdict we cannot show the receipt
  // for is not published here at all.
  function receiptOf(ov, issueKey) {
    if (!ov) return null;
    var cs = CS();
    var proof = cs && cs.proof;
    var rec = ov.record;
    var item = rec && rec.topContradiction;
    if (item) {
      var url = (item.source && item.source.url) || '';
      if (!url) return null;                                  // verifiability rule
      var text = '';
      try { text = (proof && typeof proof.proofText === 'function') ? proof.proofText(item) : ''; } catch (e) { text = ''; }
      if (!text) text = [item.number, item.title].filter(Boolean).join(' · ');
      if (!text) return null;
      var multi = '';
      try { multi = (proof && typeof proof.multiNote === 'function') ? (proof.multiNote(item, issueKey) || '') : ''; } catch (e2) { multi = ''; }
      return {
        text: String(text), date: item.date || null, url: String(url),
        label: String((item.source && item.source.label) || 'Source'),
        // The multi-issue / package disclosure, verbatim from the shared primitive:
        // a single roll call that landed opposite ways on two issues says so here in
        // the same words it says so on the profile row.
        multiNote: String(multi || '')
      };
    }
    // The curated formal-actions lane keeps its own rows rather than a summary with
    // a top item, so the earliest contradicting one with a URL is cited.
    var acts = ov.officialActions;
    var list = (acts && Array.isArray(acts.items)) ? acts.items : [];
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      if (!a || a.verdict !== 'contradicts' || !a.sourceUrl || !a.headline) continue;
      return {
        text: String(a.headline), date: a.date || null, url: String(a.sourceUrl),
        label: String(a.sourceLabel || 'Source'), multiNote: ''
      };
    }
    return null;
  }

  // ── ONE PERSON'S ITEMS ─────────────────────────────────────────────────────
  // Every issue on which Direction Match already returned `contradicts` against a
  // citable formal act. Pure and synchronous; [] when the record is cold, because a
  // cold record is not a clean one and this file will not imply that it is.
  function itemsFor(pid, p) {
    var wa = WA();
    if (!wa || typeof wa.read !== 'function' || !pid) return [];
    var prof = p || null;
    if (!prof) { try { prof = (window.CMP_DATA && window.CMP_DATA[pid]) || (window.PROFILES && window.PROFILES[pid]) || null; } catch (e) { prof = null; } }
    var read = null;
    try { read = wa.read(pid, prof); } catch (e) { return []; }
    if (!read || !Array.isArray(read.tested)) return [];
    var cs = CS();
    var who = identity(pid);
    var out = [];
    read.tested.forEach(function (it) {
      var t = it && it.test;
      if (!t || t.state !== 'tested' || t.token !== 'contradicts') return;
      // A broken tracked pledge is resolved by the pledge ledger, not by a formal
      // act. It is a real finding with its own sourced outcome and its own surface;
      // it has no formal-act path, so it cannot be an item here.
      if (t.basis === 'pledge-ledger') return;
      if (!it.issueKey) return;
      var ov = null;
      try { ov = (cs && typeof cs.officialRecord === 'function') ? cs.officialRecord(pid, it.issueKey) : null; } catch (e) { ov = null; }
      // The verdict has to still be a contradiction at the source it came from. If
      // the engine and the read ever disagree, the engine wins and the item drops.
      if (!ov || ov.token !== 'contradicts') return;
      var receipt = receiptOf(ov, it.issueKey);
      if (!receipt) return;
      var lane = String(ov.lane || 'record');
      out.push({
        pid: String(pid), name: who.name, office: who.office,
        issueKey: it.issueKey, issue: issueLabel(it.issueKey),
        // What they said, in their own words where the card carries them, with the
        // citation the stance shelf carries for it.
        said: {
          label: String(it.label || issueLabel(it.issueKey)),
          text: String(it.text || ''),
          stance: String(it.stance || ''),
          source: (it.sources && it.sources[0]) || null
        },
        act: receipt,
        lane: lane,
        say: SAY[lane] || SAY_DEFAULT,
        date: receipt.date || null,
        dateText: dateText(receipt.date),
        personPath: personPath(pid),
        // Where the WHOLE record on this issue is, including anything that ran the
        // other way. Every item carries it; an item is an entry point, not a verdict.
        dossier: { pid: String(pid), issueKey: it.issueKey }
      });
    });
    // Within one person: newest first, then issue label. Never by weight, evidence
    // count or anything else that would read as "worst first".
    return sortItems(out);
  }

  // Date descending; undated last; issue label as the stable tie-break. This is the
  // ONLY ordering this file has, and it is deliberately not a severity order — see
  // the walls at the top.
  function sortItems(list) {
    return list.slice().sort(function (a, b) {
      var ad = a.date || '', bd = b.date || '';
      if (ad !== bd) {
        if (!ad) return 1;
        if (!bd) return -1;
        return ad < bd ? 1 : -1;
      }
      return String(a.issue).localeCompare(String(b.issue)) ||
             String(a.pid).localeCompare(String(b.pid));
    });
  }

  // ── THE DATED FEED ─────────────────────────────────────────────────────────
  // The same items across whichever people the caller hands in, flattened into one
  // dated list. Flattened, not grouped: see the walls.
  //
  // `opts.pids` is the population. There is no default "everyone" — the record cache
  // is per-member and warmed by visiting a profile, so an implicit sweep over the
  // whole roster would silently publish a list shaped by browsing history. A caller
  // names who it is asking about.
  function feed(opts) {
    var o = opts || {};
    var pids = Array.isArray(o.pids) ? o.pids : [];
    var items = [], asked = 0, withItems = 0;
    pids.forEach(function (pid) {
      if (!pid) return;
      asked++;
      var mine = itemsFor(pid, null);
      if (mine.length) withItems++;
      mine.forEach(function (x) { items.push(x); });
    });
    items = sortItems(items);
    var limit = (typeof o.limit === 'number' && o.limit > 0) ? o.limit : 0;
    var shown = limit ? items.slice(0, limit) : items;
    return {
      items: shown,
      // Counts, stated as coverage rather than as a result. `people` is how many of
      // the asked-for files had at least one citable item — it is not a rate, and
      // dividing it by `asked` is exactly the arithmetic this lane refuses.
      coverage: {
        asked: asked, people: withItems, items: items.length, shown: shown.length,
        truncated: items.length - shown.length,
        note: 'Each item is one person, one issue and one formal act. This is a dated ' +
              'list, not a ranking: nothing here counts people against each other.'
      },
      ranked: false, scored: false
    };
  }

  // ── One item, shareable ──────────────────────────────────────────────────
  // Phase 5. A self-defection item is already the narrowest true unit this site
  // produces: ONE person, ONE issue, ONE stated position, ONE formal act that
  // cut against it, with the citation attached. That is exactly the shape the
  // record card takes, so sharing an item is just handing the record card its
  // pid and issue key — no second artifact, no per-item image, no copy written
  // here that the card would have to keep in sync.
  //
  // What the share is NOT allowed to become, and why the control is per-item
  // and nowhere else: there is no "share this list", no count in any label, no
  // "N times this month". A reader who receives one of these gets one act
  // against one word and a link to the whole person file, where the acts that
  // MATCHED their word are sitting in the same section. Ranked shares are how a
  // record archive turns into a pillory, and the list has been unranked and
  // unscored since it shipped — see the module footer's `ranked: false`.
  //
  // The control is omitted when record-card.js has not loaded, rather than
  // falling back to some other share path: a link that opens a different object
  // than the button promised is worse than no button.
  function shareBtn(x) {
    var R = window.PDXRecordCard;
    if (!R || typeof R.buttonHtml !== 'function') return '';
    return R.buttonHtml({
      pid: x.pid,
      issueKey: x.issueKey,
      text: 'Share this record',
      stopKeys: true
    });
  }

  // ── MARKUP ─────────────────────────────────────────────────────────────────
  function itemHtml(x, opts) {
    var o = opts || {};
    // The person's name leads only in the cross-person feed. On their own file the
    // name is in the letterhead a few inches above, and repeating it on every row
    // reads as an accusation restated rather than as a list of records.
    var who = o.withName
      ? '<a class="pdxown-who" href="' + esc(x.personPath) + '">' + esc(x.name) + '</a>' +
        (x.office ? '<span class="pdxown-office">' + esc(x.office) + '</span>' : '')
      : '';
    var said = x.said.text
      ? '<p class="pdxown-said">' + esc(x.said.text) + '</p>'
      : (x.said.label ? '<p class="pdxown-said">' + esc(x.said.label) + '</p>' : '');
    var saidSrc = (x.said.source && x.said.source.url)
      ? ' <a class="pdxown-src" href="' + esc(x.said.source.url) + '" target="_blank" rel="noopener noreferrer">' +
        esc(x.said.source.label || 'source') + ' ↗</a>' : '';
    return '<li class="pdxown-item">' +
      (who ? '<div class="pdxown-head">' + who + '</div>' : '') +
      '<div class="pdxown-issue">' + esc(x.issue) +
        (x.dateText ? '<span class="pdxown-date">' + esc(x.dateText) + '</span>'
                    : '<span class="pdxown-date pdxown-nodate">date not on file</span>') +
      '</div>' +
      '<div class="pdxown-lane"><span class="pdxown-lane-k">They said</span>' + said + saidSrc + '</div>' +
      '<div class="pdxown-lane"><span class="pdxown-lane-k">The record</span>' +
        '<p class="pdxown-act">' + esc(x.say) + '</p>' +
        '<p class="pdxown-proof">' + esc(x.act.text) +
          ' <a class="pdxown-src" href="' + esc(x.act.url) + '" target="_blank" rel="noopener noreferrer">' +
          esc(x.act.label) + ' ↗</a></p>' +
        (x.act.multiNote ? '<p class="pdxown-multi">' + esc(x.act.multiNote) + '</p>' : '') +
      '</div>' +
      '<div class="pdxown-outs">' +
        '<button type="button" class="pdxown-dos" data-pdxown-dos="' + esc(x.issueKey) + '"' +
          ' data-pdxown-dos-pid="' + esc(x.pid) + '"' +
          ' aria-label="' + esc('Open the issue dossier: ' + x.issue + ' — ' + x.name) + '">' +
          'The whole record on this issue →</button>' +
        (o.withName ? '' : '<a class="pdxown-pfile" href="' + esc(x.personPath) + '">Person file →</a>') +
        shareBtn(x) +
      '</div>' +
    '</li>';
  }

  // The person-file surface. '' when there is nothing to list — an empty frame
  // headed "Against their own stated position" on a file with no items reads as an
  // accusation with the evidence pending.
  //
  // It says what it counted, in words, because "no items" has two very different
  // causes: nothing contradicted, or nothing testable on file at all. The second is
  // a coverage gap and must not read as a clean record.
  function personHtml(pid, p) {
    var list = itemsFor(pid, p);
    if (!list.length) return '';
    var n = list.length;
    return '<div class="modal-section pdxown-sec" id="pdxsec-ownword">' +
      '<div class="modal-section-title">↩️ Against their own stated position</div>' +
      '<p class="pdxown-lede">' +
        esc(n === 1
          ? 'One issue where the formal record ran against something this person had stated.'
          : n + ' issues where the formal record ran against something this person had stated.') +
      '</p>' +
      '<p class="pdxown-wall">Each row names the stated position, the one formal act that ran ' +
        'against it, and a link to the whole record on that issue — including whatever ran the ' +
        'other way. This list is the same ⚖️ Word vs Action verdicts, gathered: it adds no ' +
        'judgement of its own, publishes no score, and is never compared with anyone else’s.</p>' +
      '<ul class="pdxown-list">' + list.map(function (x) { return itemHtml(x, { withName: false }); }).join('') + '</ul>' +
    '</div>';
  }

  // The dated cross-person feed. Same items, name-led, one flat list.
  function feedHtml(opts) {
    var f = feed(opts);
    if (!f.items.length) return '';
    return '<div class="pdxown-feed">' +
      '<p class="pdxown-wall">' + esc(f.coverage.note) + '</p>' +
      '<ul class="pdxown-list pdxown-list-feed">' +
        f.items.map(function (x) { return itemHtml(x, { withName: true }); }).join('') +
      '</ul>' +
      (f.coverage.truncated > 0
        ? '<p class="pdxown-more">' + esc(f.coverage.truncated + ' further item' +
            (f.coverage.truncated === 1 ? '' : 's') + ' not shown here.') + '</p>'
        : '') +
    '</div>';
  }

  // One delegated listener for every rendered item, opening the SAME issue dossier
  // the ⚖️ Word vs Action rows open (PDXConsistency.openGap) — so the list and the
  // score cannot lead to two different readings of one issue.
  var _bound = false;
  function bind() {
    if (_bound || !document.body) return;
    _bound = true;
    document.body.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      var b = e.target.closest('[data-pdxown-dos]');
      if (!b) return;
      var cs = CS();
      if (!cs || typeof cs.openGap !== 'function') return;
      var opened = false;
      try {
        opened = cs.openGap(b.getAttribute('data-pdxown-dos-pid') || '',
          b.getAttribute('data-pdxown-dos') || '', { arrival: false }) !== false;
      } catch (e2) { opened = false; }
      if (opened) e.preventDefault();
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else { bind(); }

  window.PDXSelfDefection = {
    SAY: SAY,
    NEVER_FEEDS: NEVER_FEEDS,
    // Structural declarations, read by the fence in scripts/test-self-defection.mjs.
    scored: false,
    ranked: false,
    // Pure reads — no DOM, no fetch.
    itemsFor: itemsFor,
    feed: feed,
    receiptOf: receiptOf,
    // Renderers. Both return '' rather than an empty frame.
    personHtml: personHtml,
    feedHtml: feedHtml,
    itemHtml: itemHtml
  };
})();
