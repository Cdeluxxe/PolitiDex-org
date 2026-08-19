/* ─────────────────────────────────────────────────────────────────────────────
   stance-tree.js — 🌳 THE TOPIC TREE OF STANCES
   ─────────────────────────────────────────────────────────────────────────────
   The profile's browse-all-stances surface. It replaces a FLAT WALL — Stance at
   a Glance, an alphabet-soup list of documented positions with no grouping, no
   colour and no record beside it — with a collapsible tree a reader can actually
   sort themselves through: broad topic → (optional) mid → the issue we track.

   WHAT IS NEW HERE IS THE ARRANGEMENT. Nothing on this surface is computed by
   this file. Every leaf reads exactly two shared engines:

     · PDXConsistency.issueRows(pid)        — the one row model. `stance` is what
       they SAID (off _polPositionMap, through positionStance), `label`, `category`
       and the rest are the row's own fields.
     · PDXConsistency.recordPattern.tier(r) — the five-rung formal-record pattern
       (Strongly / Mostly / Split / Thin / No clear pattern yet), which reads
       _recordDirectionIndex and nothing else.

   So a threshold cannot drift between this tree and the row faces, the Official
   Record or the full formal-pattern index: there is one place to move it, and it
   is not in this file.

   THE FIVE WALLS, and they are the reason this file is allowed to print the word
   "opposes" next to a person's name twice on one line:

     1. NO SCORE. There is no percentage anywhere in this module — not on a leaf,
        not on a branch, not in a tooltip. `%` does not appear in the markup it
        emits, and scripts/test-stance-tree.mjs asserts that over the whole tree.
        Direction Match keeps its one headline in word-action.js and this surface
        never restates it, agrees with it, or disagrees with it.
     2. BROAD NODES ARE NAVIGATION. A branch face carries an icon, a name and a
        COUNT of the issues filed under it. It carries no verdict word, no tier
        word, no direction and no number that could be read as a grade. A topic is
        not a thing a person can be scored on, and rolling thirteen leaves up into
        one badge is exactly how a taxonomy quietly becomes a scoreboard.
     3. SAID AND RECORD ARE TWO DIFFERENT CLAIMS, SIDE BY SIDE. `Said:` is theirs.
        `🏛 Record:` is the formal record's. They sit in adjacent slots on one line
        precisely so a reader can see them disagree — which is why the alignment
        cue is only ever printed when BOTH halves exist.
     4. PATTERN-ONLY ROWS ARE MARKED, EVERY TIME. An issue with a readable formal
        pattern and no stated position on file still belongs on a browse-all
        surface — sixty-odd of them exist, and filing them under "nothing known"
        is the framing this tree undoes. But it is not a stance, so the row says
        so in its own text ("Pattern only · Not in Direction Match"), in its
        accessible name (the full sentence), in its skin (dashed rail, no fill)
        and in the tree's own disclosure line. Nothing here writes to a position
        map: this module never calls _polPositionMap and has no write path to it.
     5. THIN STAYS THIN. A one-to-three-item run is admitted (it is true) and is
        never dressed as a tendency: it keeps the pattern engine's own `thin`
        weight class, it sorts below every read that earned a direction, and a
        pattern-only thin row is additionally marked quiet. A tier the engine
        declines to characterise at all ("No clear pattern yet") is NOT a readable
        pattern and can never be a row's only reason to appear.

   NO PARTY FRAMING. Party is not read, not mapped and not mentioned; the only
   grouping axis is the issue taxonomy the site already ships.

   ─────────────────────────────────────────────────────────────────────────────
   THE GROUPING MAP is CORE_NATIONAL_ISSUES (alignment-tool.js) in its own order,
   plus ONE explicit trailing node. 21 ISSUE_MAP keys belong to no core issue
   (campaign finance, privacy, government transparency, the public-lands cluster,
   the family/infrastructure/tech/reform clusters). Filing them under the nearest
   core colour would state a taxonomy relationship we do not have, so they get
   their own node on PDXIssueColors.FALLBACK — the neutral grey the colour system
   already reserves for exactly this.

   COLOUR comes from PDXIssueColors.styleFor(issueKey), which resolves a leaf key
   to its core issue itself. Branch and leaf therefore paint from the same four
   custom properties the rest of the site paints from, and an issue is the same
   colour here as it is on a row, in a dossier and on the alignment tool.
   ───────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escAttr(s) {
    return esc(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function norm(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
  var _seq = 0;

  // ── SAID: the four faces of the stated side ───────────────────────────────
  // Three of them are the house's own stance vocabulary (_OR_STANCE in
  // consistency.js) and the fourth is the honest absence. `none` is a statement
  // about OUR FILE, not about the person — "No stated position" means we hold no
  // sourced position, and its grey says so rather than implying a refusal.
  var SAID = {
    support: { key: 'support', label: 'Supports', c: '#4ade80', ico: '👍' },
    oppose:  { key: 'oppose',  label: 'Opposes',  c: '#f87171', ico: '👎' },
    mixed:   { key: 'mixed',   label: 'Mixed',    c: '#f5c842', ico: '⚖️' },
    none:    { key: 'none',    label: 'No stated position', c: '#8fa6c6', ico: '·' }
  };
  var SAID_DIR = { support: 1, oppose: -1, mixed: 0 };

  // ── THE ALIGNMENT CUE ─────────────────────────────────────────────────────
  // Four words, printed at the end of a leaf, and the first three are ONLY ever
  // printed when both halves of the line exist. "Cuts against" is deliberately
  // the phrase the public-record lane already uses for "runs against the position
  // they stated" (_SD_DIR.contradicts.word) — the same relation should not have
  // two names on one profile.
  //
  // The cue is a RELATION, not a result. It compares two facts already on the
  // line; it has no threshold of its own, no weight, and nothing sorts a score on
  // it. `split` covers both ways the comparison can refuse to resolve: a stated
  // Mixed, or a record that ran both ways.
  var CUES = {
    aligns:       { key: 'aligns', label: 'Aligns', tone: 'agree',
      note: 'Their stated position and the direction of their formal record point the same way.' },
    cuts_against: { key: 'cuts_against', label: 'Cuts against', tone: 'tension',
      note: 'Their stated position and the direction of their formal record point opposite ways.' },
    split:        { key: 'split', label: 'Split', tone: 'mixed',
      note: 'One side of this is mixed, so the two cannot be said to agree or disagree.' },
    pattern_only: { key: 'pattern_only', label: 'Pattern only', tone: 'muted',
      note: 'There is no stated position on file for this issue, so there is nothing to compare the record against.' }
  };

  // The pattern-only disclosure, in one place, printed in three: the leaf's own
  // accessible name, the leaf's title, and the tree's visible footer whenever any
  // pattern-only leaf is on screen. Worded as three separate denials on purpose —
  // a reader who reads only the tag ("Not in Direction Match") still gets the one
  // that matters most.
  var PATTERN_ONLY_NOTE = 'Inferred from the formal record pattern — this is not a quoted stance, ' +
    'and it is not counted in Direction Match.';
  var PATTERN_ONLY_TAG = 'Not in Direction Match';
  var TREE_NOTE = 'Said is their own stated position. 🏛 Record is what the formal record did — a ' +
    'pattern in the votes on file, never a stated position and never counted in Direction Match.';

  // The trailing node. Its key is '' because that is what PDXIssueColors.coreKeyFor
  // returns for an unmapped issue, so the bucket id and the colour lookup agree.
  var OTHER = { key: '', label: '🗂 Other tracked issues',
    blurb: 'Issues we track that sit outside the core national issue set.' };

  // ── THE MID-LEVEL GATE ────────────────────────────────────────────────────
  // A mid level is a cost: one more tap between a reader and the issue they came
  // for. It is worth paying only where a branch is genuinely too long to scan,
  // and it must never appear as a single child wrapping everything (a fake level)
  // or as a scatter of one-leaf boxes (a worse list). So all three conditions:
  // the branch is long, it splits into at least two real groups, and each of
  // those groups holds at least two leaves. Anything that fails the gate renders
  // flat, which is what every real profile does today — the deepest core bundle
  // (Economy, 21 keys) is where this earns its keep.
  //
  // The mid label is the ROW's own `categoryLabel`. No new taxonomy: the row model
  // already carries the coarse category, so a mid heading here cannot disagree
  // with the category shown anywhere else.
  var MID = { minLeaves: 7, minGroups: 2, minPerGroup: 2 };

  // Sort rank inside one branch. Tension first because it is the most
  // informative thing this surface can tell a reader; stated-only next (a real
  // position of theirs); pattern-only after that (true, but ours to disclose);
  // quiet last. Nothing ordinal here leaves the sort — no rank is printed.
  var LEAF_RANK = { cuts_against: 0, split: 1, aligns: 2, said_only: 3, pattern_only: 4, quiet: 5 };

  function IC() { return window.PDXIssueColors || null; }
  // A key with no core issue is NOT left unstyled: styleFor() answers with the
  // colour system's own neutral (FALLBACK), which is the whole reason that token
  // exists. `on` is the separate question — did this land on a real core issue —
  // and only that gates the coloured dot, so an unmapped issue is painted grey
  // rather than borrowing the colour of whichever topic it was filed near.
  function skinFor(key) {
    var ic = IC();
    if (!ic || typeof ic.styleFor !== 'function') return { style: '', on: false, color: null };
    var on = false, color = null;
    try {
      color = ic.getIssueColor(key) || null;
      on = (typeof ic.isCore === 'function') ? ic.isCore(key) : !!(color && color.mapped);
    } catch (e) { on = false; }
    return { style: ic.styleFor(key), on: !!on, color: color };
  }
  function coreKeyOf(issueKey) {
    var ic = IC();
    try {
      if (ic && typeof ic.coreKeyFor === 'function') return ic.coreKeyFor(issueKey) || '';
    } catch (e) {}
    try {
      var c = (typeof window.coreIssueForKey === 'function') ? window.coreIssueForKey(issueKey) : null;
      return (c && c.key) || '';
    } catch (e2) { return ''; }
  }

  // The grouping map, read live so a new core issue appears here the moment it is
  // declared in alignment-tool.js rather than the next time this file is edited.
  function TOPICS() {
    var out = [];
    try {
      (window.CORE_NATIONAL_ISSUES || []).forEach(function (c) {
        if (c && c.key) out.push({ key: c.key, label: c.label || c.key, blurb: c.blurb || '' });
      });
    } catch (e) {}
    out.push({ key: OTHER.key, label: OTHER.label, blurb: OTHER.blurb });
    return out;
  }

  // ── ONE LEAF ──────────────────────────────────────────────────────────────
  // Returns null for an issue that belongs on no browse surface. The inclusion
  // rule is the brief's, stated once: a leaf appears if a STATED POSITION exists,
  // or if a READABLE formal pattern exists — and "readable" excludes the tier the
  // engine uses to say it cannot read one. "No clear pattern yet" beside "No
  // stated position" is two absences wearing the clothes of a finding, and it is
  // the one row this surface refuses to print.
  function leafOf(row) {
    if (!row || !row.key) return null;
    var CS = window.PDXConsistency;
    var stanceKey = (row.stance && row.stance.key) || null;
    var said = SAID[stanceKey] || SAID.none;
    var tier = null;
    try {
      if (CS && CS.recordPattern && typeof CS.recordPattern.tier === 'function') {
        tier = CS.recordPattern.tier(row) || null;
      }
    } catch (e) { tier = null; }
    var readable = !!(tier && tier.tier !== 'none');
    if (!stanceKey && !readable) return null;

    var patternOnly = !stanceKey;
    // The cue needs two directional facts. A stated Mixed, a Split record, or a
    // pattern the engine declined all land on `split`/no-cue rather than being
    // forced into agreement or disagreement.
    var cue = null;
    if (patternOnly) cue = CUES.pattern_only;
    else if (tier && readable) {
      var sd = SAID_DIR.hasOwnProperty(stanceKey) ? SAID_DIR[stanceKey] : null;
      var rd = tier.directional ? (tier.tone === 'support' ? 1 : tier.tone === 'oppose' ? -1 : 0) : 0;
      if (sd === 0 || rd === 0 || !tier.directional) cue = CUES.split;
      else cue = (sd === rd) ? CUES.aligns : CUES.cuts_against;
    }
    var quiet = !!(patternOnly && tier && (tier.weight === 'thin' || tier.weight === 'flat'));
    var rank = patternOnly ? (quiet ? LEAF_RANK.quiet : LEAF_RANK.pattern_only)
      : (cue ? LEAF_RANK[cue.key] : LEAF_RANK.said_only);

    var topic = coreKeyOf(row.key);
    return {
      pid: row.pid, key: row.key, label: row.label || row.key,
      topic: topic,
      group: row.category || 'other', groupLabel: row.categoryLabel || 'Other',
      said: { key: said.key, label: said.label, stated: !!stanceKey, color: said.c, ico: said.ico },
      pattern: tier ? {
        tier: tier.tier, label: tier.label, tone: tier.tone, weight: tier.weight,
        counts: tier.counts || '', directional: !!tier.directional,
        note: tier.note || '', readable: readable
      } : null,
      cue: cue,
      patternOnly: patternOnly,
      quiet: quiet,
      rank: rank,
      skin: skinFor(row.key)
    };
  }

  function leaves(pid) {
    var CS = window.PDXConsistency;
    if (!CS || typeof CS.issueRows !== 'function') return [];
    var rows = [];
    try { rows = CS.issueRows(pid) || []; } catch (e) { return []; }
    var out = [];
    rows.forEach(function (r) { var lf = leafOf(r); if (lf) out.push(lf); });
    out.sort(function (a, b) {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
    });
    return out;
  }

  // ── THE MID LEVEL, AS A PURE FUNCTION ─────────────────────────────────────
  // Exposed so the gate is testable on its own: given a branch's leaves, either
  // an array of mid nodes or null for "render this branch flat".
  function midsFor(list) {
    list = list || [];
    if (list.length < MID.minLeaves) return null;
    var order = [], byKey = {};
    list.forEach(function (lf) {
      var k = lf.group || 'other';
      if (!byKey[k]) { byKey[k] = { key: k, label: lf.groupLabel || 'Other', leaves: [] }; order.push(k); }
      byKey[k].leaves.push(lf);
    });
    var real = order.filter(function (k) { return byKey[k].leaves.length >= MID.minPerGroup; });
    if (real.length < MID.minGroups) return null;
    // Everything below the per-group floor collects into one trailing node rather
    // than becoming a row of one-leaf boxes.
    var mids = real.map(function (k) { return byKey[k]; });
    var rest = [];
    order.forEach(function (k) {
      if (real.indexOf(k) === -1) rest = rest.concat(byKey[k].leaves);
    });
    if (rest.length) mids.push({ key: '_rest', label: 'More in this topic', leaves: rest });
    return mids;
  }

  // ── THE BRANCHES ──────────────────────────────────────────────────────────
  function groups(pid) {
    var all = leaves(pid);
    var byTopic = {};
    all.forEach(function (lf) {
      var k = lf.topic || '';
      (byTopic[k] || (byTopic[k] = [])).push(lf);
    });
    var out = [];
    TOPICS().forEach(function (t) {
      var list = byTopic[t.key];
      if (!list || !list.length) return;
      out.push({
        key: t.key || 'other', topicKey: t.key, label: t.label, blurb: t.blurb,
        count: list.length, leaves: list, mids: midsFor(list),
        skin: skinFor(t.key)
      });
    });
    return out;
  }
  function count(pid) { try { return leaves(pid).length; } catch (e) { return 0; } }

  // ─────────────────────────────────────────────────────────────────────────
  // MARKUP
  // ─────────────────────────────────────────────────────────────────────────
  function uidFor(pid) {
    return ('pdxtree-' + norm(pid) + '-' + (++_seq)).replace(/[^A-Za-z0-9_-]/g, '');
  }
  function leafId(uid, key) {
    return (uid + '-lf-' + norm(key)).replace(/[^A-Za-z0-9_-]/g, '');
  }

  // The accessible name is ONE sentence, not a pile of fragments. A screen reader
  // reading "Election Security / Said Supports / Record Strongly opposes / Cuts
  // against" as four separate things loses the relation, and a pattern-only row
  // read as fragments loses the disclosure entirely — so it is spelled out here.
  function leafSay(lf) {
    var s = lf.label + '. ';
    s += lf.said.stated ? ('Their stated position: ' + lf.said.label + '. ')
                        : 'No stated position on file. ';
    if (lf.pattern) {
      s += 'Formal record pattern: ' + lf.pattern.label +
        (lf.pattern.counts ? ' (' + lf.pattern.counts + ')' : '') + '. ';
    }
    if (lf.cue && lf.said.stated && lf.pattern) s += lf.cue.label + ' — ' + lf.cue.note + ' ';
    if (lf.patternOnly) s += PATTERN_ONLY_NOTE + ' ';
    return s + 'Opens the issue dossier.';
  }

  function leafHtml(lf, uid) {
    var id = leafId(uid, lf.key);
    var pat = lf.pattern;
    var title = lf.patternOnly ? PATTERN_ONLY_NOTE
      : (pat ? (pat.note || '') : '');
    return '<div class="pdxtree-leaf' + (lf.skin.on ? ' pdxtree-ic' : '') +
        (lf.patternOnly ? ' is-patternonly' : '') + (lf.quiet ? ' is-quiet' : '') + '"' +
        ' style="' + escAttr(lf.skin.style) + '"' +
        ' data-pdxtree-issue="' + escAttr(lf.key) + '"' +
        ' data-pdxtree-topic="' + escAttr(lf.topic || '') + '"' +
        ' data-pdxtree-said="' + escAttr(lf.said.key) + '"' +
        ' data-pdxtree-pat="' + escAttr(pat ? pat.tier : 'none') + '"' +
        ' data-pdxtree-cue="' + escAttr(lf.cue ? lf.cue.key : '') + '"' +
        ' data-pdxtree-only="' + (lf.patternOnly ? '1' : '0') + '">' +
        '<button type="button" class="pdxtree-face" id="' + escAttr(id) + '"' +
          ' data-pdxtree-dos="' + escAttr(lf.key) + '"' +
          ' data-pdxtree-pid="' + escAttr(lf.pid) + '"' +
          ' data-pdxtree-origin="' + escAttr(id) + '"' +
          (title ? ' title="' + escAttr(title) + '"' : '') +
          ' aria-label="' + escAttr(leafSay(lf)) + '">' +
          '<span class="pdxtree-dot" aria-hidden="true"></span>' +
          '<span class="pdxtree-name">' + esc(lf.label) + '</span>' +
          '<span class="pdxtree-slots" aria-hidden="true">' +
            '<span class="pdxtree-said s-' + escAttr(lf.said.key) + '">' +
              '<b>Said:</b> ' + esc(lf.said.label) + '</span>' +
            (pat ? '<span class="pdxtree-pat t-' + escAttr(pat.tier) + ' w-' + escAttr(pat.weight) +
                     ' tone-' + escAttr(pat.tone) + '">' +
                     '<b>🏛 Record:</b> ' + esc(pat.label) + '</span>' : '') +
            (lf.cue ? '<span class="pdxtree-cue c-' + escAttr(lf.cue.key) + '">' +
                        esc(lf.cue.label) + '</span>' : '') +
            (lf.patternOnly ? '<span class="pdxtree-tag">' + esc(PATTERN_ONLY_TAG) + '</span>' : '') +
          '</span>' +
          '<span class="pdxtree-go" aria-hidden="true">›</span>' +
        '</button>' +
      '</div>';
  }

  // ── A BRANCH FACE ─────────────────────────────────────────────────────────
  // Icon, name, and how many issues are filed here. That is the whole face, and
  // the count is the only number on it: navigation, never a grade. There is no
  // verdict, no tier, no direction and no percentage on this element — see wall 2.
  function branchHtml(g, uid, open) {
    var panel = uid + '-p-' + escAttr(g.key);
    var body = g.mids
      ? g.mids.map(function (m) {
          return '<div class="pdxtree-mid" data-pdxtree-mid="' + escAttr(m.key) + '">' +
            '<div class="pdxtree-midhd">' + esc(m.label) + '</div>' +
            m.leaves.map(function (lf) { return leafHtml(lf, uid); }).join('') +
          '</div>';
        }).join('')
      : g.leaves.map(function (lf) { return leafHtml(lf, uid); }).join('');
    var n = g.count + ' issue' + (g.count === 1 ? '' : 's');
    return '<div class="pdxtree-branch' + (g.skin.on ? ' pdxtree-ic' : '') + '"' +
        ' style="' + escAttr(g.skin.style) + '"' +
        ' data-pdxtree-branch="' + escAttr(g.key) + '"' +
        ' data-pdxtree-open="' + (open ? '1' : '0') + '">' +
        '<button type="button" class="pdxtree-bface" data-pdxtree-toggle="' + escAttr(g.key) + '"' +
          ' aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="' + escAttr(panel) + '">' +
          '<span class="pdxtree-caret" aria-hidden="true">▸</span>' +
          '<span class="pdxtree-btitle">' + esc(g.label) + '</span>' +
          '<span class="pdxtree-bn">' + esc(n) + '</span>' +
        '</button>' +
        '<div class="pdxtree-panel" id="' + escAttr(panel) + '"' + (open ? '' : ' hidden') + '>' +
          body +
        '</div>' +
      '</div>';
  }

  // The tree body. `opts.open` is the branch key to leave expanded — the caller
  // passes back whatever the reader had open before a warm repaint, so a repaint
  // never collapses the branch someone is reading.
  function treeHtml(pid, opts) {
    opts = opts || {};
    var gs = groups(pid);
    if (!gs.length) return '';
    var uid = opts.uid || uidFor(pid);
    var openKeys = opts.open && opts.open.length ? opts.open : [gs[0].key];
    var anyOnly = false;
    gs.forEach(function (g) {
      g.leaves.forEach(function (lf) { if (lf.patternOnly) anyOnly = true; });
    });
    return '<div class="pdxtree" data-pdxtree-pid="' + escAttr(pid) + '" data-pdxtree-uid="' + escAttr(uid) + '">' +
        gs.map(function (g) { return branchHtml(g, uid, openKeys.indexOf(g.key) !== -1); }).join('') +
      '</div>' +
      '<p class="pdxtree-note">' + esc(TREE_NOTE) + '</p>' +
      (anyOnly ? '<p class="pdxtree-note pdxtree-note-only"><span class="pdxtree-tag">' +
        esc(PATTERN_ONLY_TAG) + '</span> ' + esc(PATTERN_ONLY_NOTE) + '</p>' : '');
  }

  // ── THE SECTION ───────────────────────────────────────────────────────────
  // Mounts under the Word vs Action summary. It carries the nav anchor the old
  // flat wall carried (pdxsec-glance) as well as its own, so every existing jump
  // into "their stated positions" lands on the surface that now holds them.
  function sectionHtml(pid) {
    // ONE id for the section and for the leaves inside it. The warm repaint re-renders
    // the body with this same uid, so a leaf's id — which is the `origin` the dossier's
    // back pill returns to — survives the swap instead of being reissued under it.
    var host = uidFor(pid);
    var body = '';
    try { body = treeHtml(pid, { uid: host }); } catch (e) { return ''; }
    if (!body) return '';
    try { setTimeout(function () { bindHost(host, pid); }, 0); } catch (e) {}
    return '<span id="pdxsec-stancetree" class="pdx-nav-anchor" aria-hidden="true"></span>' +
      '<span id="pdxsec-glance" class="pdx-nav-anchor" aria-hidden="true"></span>' +
      '<section class="modal-block pdxtree-sec" data-pdxtree-host="' + escAttr(host) + '">' +
        '<h3 class="pdxtree-h">🌳 All Issues by Topic</h3>' +
        '<p class="pdxtree-sub">Every issue we track for them, grouped by topic — what they ' +
          '<b>said</b> beside what their formal <b>record</b> did. Tap an issue for the full dossier.</p>' +
        '<div class="pdxtree-body">' + body + '</div>' +
      '</section>';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BEHAVIOUR
  // ─────────────────────────────────────────────────────────────────────────
  // MOBILE: ONE BRANCH AT A TIME. On a phone a tree that keeps four branches open
  // is the flat wall again with extra taps in it, so opening a branch closes its
  // siblings. On a wider viewport there is room to compare two topics side by
  // side, so nothing is closed for you. The breakpoint is the site's own phone
  // breakpoint and it is READ AT TOGGLE TIME, not at mount — a rotation or a
  // resize therefore changes the behaviour without a repaint.
  var PHONE = '(max-width: 639px)';
  function isPhone() {
    try {
      return !!(window.matchMedia && window.matchMedia(PHONE).matches);
    } catch (e) { return false; }
  }
  // THE OPEN/CLOSE RULE, as a pure function of (what is open, what was tapped, is
  // this a phone). The click handler does nothing but read the DOM into this, and
  // write the answer back — so the rule is one testable statement rather than a
  // sequence of DOM mutations, and "one branch at a time on mobile" cannot drift
  // out of agreement with what the tree actually does. Closing is never exclusive:
  // tapping the open branch on a phone closes it and leaves nothing open, which is
  // a reader deliberately collapsing the tree, not a state to correct.
  function nextOpen(open, key, phone) {
    open = (open || []).slice();
    var i = open.indexOf(key);
    if (i !== -1) { open.splice(i, 1); return open; }
    return phone ? [key] : open.concat([key]);
  }
  function setOpen(branch, open) {
    if (!branch) return;
    var btn = branch.querySelector('[data-pdxtree-toggle]');
    var panel = branch.querySelector('.pdxtree-panel');
    branch.setAttribute('data-pdxtree-open', open ? '1' : '0');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (panel) { if (open) panel.removeAttribute('hidden'); else panel.setAttribute('hidden', ''); }
  }
  function openBranches(root) {
    var out = [];
    try {
      var bs = root.querySelectorAll('[data-pdxtree-branch][data-pdxtree-open="1"]');
      for (var i = 0; i < bs.length; i++) out.push(bs[i].getAttribute('data-pdxtree-branch'));
    } catch (e) {}
    return out;
  }

  var _bound = false;
  function bindOnce() {
    if (_bound || !document.addEventListener) return;
    _bound = true;
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;

      // The branch toggle.
      var tg = e.target.closest('[data-pdxtree-toggle]');
      if (tg) {
        var tree = tg.closest('.pdxtree');
        if (!tree) return;
        var key = tg.getAttribute('data-pdxtree-toggle') || '';
        // Read the current state off the DOM, ask the rule, write the answer back.
        // The phone test is made HERE rather than at mount, so a rotation or a
        // window resize changes the behaviour without needing a repaint.
        var want = nextOpen(openBranches(tree), key, isPhone());
        var sibs = tree.querySelectorAll('[data-pdxtree-branch]');
        for (var i = 0; i < sibs.length; i++) {
          setOpen(sibs[i], want.indexOf(sibs[i].getAttribute('data-pdxtree-branch')) !== -1);
        }
        e.preventDefault();
        return;
      }

      // ── THE LEAF IS THE DOOR ────────────────────────────────────────────
      // One door, one dossier: this routes to PDXConsistency.openGap — the same
      // public entry the stance rows, the Official Record rows and the formal-
      // pattern index all use — so the dossier a leaf opens is the dossier that
      // issue already had. There is no second dossier, no tree-only detail view
      // and no second landing vocabulary. `origin` is the leaf's own id so the
      // dossier's back pill returns the reader to the row they tapped.
      var dos = e.target.closest('[data-pdxtree-dos]');
      if (dos) {
        var CS = window.PDXConsistency;
        if (!CS || typeof CS.openGap !== 'function') return;
        var res;
        try {
          res = CS.openGap(dos.getAttribute('data-pdxtree-pid') || '',
                           dos.getAttribute('data-pdxtree-dos') || '',
                           { arrival: false, origin: dos.getAttribute('data-pdxtree-origin') || '' });
        } catch (e2) { res = false; }
        if (res !== false) e.preventDefault();
      }
    }, false);
  }

  // ── THE WARM REPAINT ──────────────────────────────────────────────────────
  // The pattern half of every leaf comes from the roll-call index, which arrives
  // after first paint. Without this the tree would be permanently pre-warm — every
  // record slot reading its cold value — so it rebuilds on the same
  // 'pdx-consistency-warm' event the header tally and the issue index rebuild on,
  // carrying the reader's open branches across the swap.
  function bindHost(host, pid) {
    bindOnce();
    if (!window.addEventListener) return;
    var handler = function (ev) {
      var el = document.querySelector('[data-pdxtree-host="' + host + '"] .pdxtree-body');
      if (!el) { window.removeEventListener('pdx-consistency-warm', handler); return; }
      if (ev && ev.detail && ev.detail.pid && norm(ev.detail.pid) !== norm(pid)) return;
      try {
        var open = openBranches(el);
        var next = treeHtml(pid, { open: open, uid: host });
        if (next) el.innerHTML = next;
      } catch (e) {}
    };
    window.addEventListener('pdx-consistency-warm', handler);
  }
  try { bindOnce(); } catch (e) {}

  window.PDXStanceTree = {
    // The grouping map and the vocabularies, as data. Every label this surface can
    // print is reachable from here, which is what lets the tests assert the copy
    // instead of scraping markup for literals.
    TOPICS: TOPICS,
    OTHER: OTHER,
    SAID: SAID,
    CUES: CUES,
    MID: MID,
    RANK: LEAF_RANK,
    NOTE: TREE_NOTE,
    PATTERN_ONLY_NOTE: PATTERN_ONLY_NOTE,
    PATTERN_ONLY_TAG: PATTERN_ONLY_TAG,
    PHONE: PHONE,
    // The open/close rule, exposed so the mobile behaviour is asserted as a rule
    // rather than inferred from the markup.
    nextOpen: nextOpen,
    // The data layer: one leaf, all leaves, the mid gate, the branches, the count.
    leaf: function (pid, issueKey) {
      var CS = window.PDXConsistency;
      if (!CS || typeof CS.issueRows !== 'function') return null;
      try {
        var rows = CS.issueRows(pid, [issueKey]) || [];
        return rows.length ? leafOf(rows[0]) : null;
      } catch (e) { return null; }
    },
    leaves: leaves,
    midsFor: midsFor,
    groups: groups,
    count: count,
    // The markup layer.
    html: treeHtml,
    sectionHtml: sectionHtml,
    leafHtml: function (lf, uid) { return leafHtml(lf, uid || 'pdxtree'); }
  };
})();
