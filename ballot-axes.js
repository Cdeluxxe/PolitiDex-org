/* ═══════════════════════════════════════════════════════════════════════════
   BALLOT AXES  ·  ballot-axes.js
   ---------------------------------------------------------------------------
   ONE DECLARED PAIR, READ SIDE BY SIDE.

   WHAT THIS BLOCK IS FOR, IN ORDER:

     1. SAY WHAT THE PAIR IS DOING. The status band leads: same direction, split,
        mixed on one side, one side on record, or not enough to compare yet —
        resolved from the live row state and nothing else.
     2. SHOW THIS PERSON on each half of the pair, in two compact columns.
     3. OPEN THE DOOR into each issue's normal dossier. Nothing here is a second
        report surface: the columns are summaries, and the tap is
        PDXConsistency.openGap — the same sheet a tree leaf opens.

   IT DOES NOT TEACH THE SPLITTING RULE AT LENGTH. That one instrument can move
   several issues, each read in its own direction, is true of every multi-issue
   measure on the site, and it is already said where a reader meets one: on the
   multi-issue chip and note on an Official Record row, in the issue dossier's own
   list of every issue a vote counted for, and in the glossary (omnibus, twoaxis).
   Repeating it as an essay at the top of a block that mounts on a few dozen
   profiles buried the one thing only this block can say — the status. One footer
   line points at the dossier list; that is the whole lesson this card carries.

   The pair that ships is elections, on two INDEPENDENT ISSUE_MAP keys:

     🔐 election_security — verify eligibility and secure how ballots are
        handled, tracked and audited (rolls, chain of custody, audits,
        fraud enforcement).
     📩 voting_access     — protect and expand access to the ballot box
        (registration, early voting, mail ballots, drop boxes, return
        deadlines).

   They are separate on purpose. A single measure routinely moves both at once
   — a documentary requirement can tighten verification and narrow access in
   the same clause — so a Yea can advance one axis and cut against the other,
   and both readings are true. Collapsing them into one "elections" score
   would make a voter who wants stricter verification AND easier registration
   unscoreable, and would flatten the most informative pattern on the record:
   someone pro-safeguard on one axis and anti-access on the other.

   Each axis is read in its OWN direction. Under 🔐 "supports" means
   pro-safeguard; under 📩 "supports" means pro-access. So "supports" on both
   is not a contradiction, and a split across the two is not mere inconsistency
   — that split IS the position.

   PAIRS IS A REGISTRY, NOT CHROME. The block renders whatever pairs are declared
   in PAIRS; no elections wording reaches the shell, the status vocabulary or the
   column renderer. A second pair is a row in that array plus its two axis
   definitions. This pass ships exactly one.

   WHAT IT DOES NOT DO. No issue key is created, renamed or remapped here; the two
   axes are never merged into one verdict; no score is computed, blended or
   published — the only percentage a column may print is the one Direction Match
   already resolved for that single issue, and only where it did; the public lane
   is not consulted; and the pattern-only and thin/early rules are the row model's
   own, printed verbatim.

   Owns NO data. It is a pure lens over globals that already exist (every
   call guarded, so a missing dependency degrades to an empty string):
     • window.PDXStanceTree.leaf(pid,key)  the row model behind both columns —
       Said, 🏛 Record, depth, early signal, the per-issue % and pattern-only
     • window.PDXConsistency.openGap       the issue dossier (the one door)
     • window.PDXIssueColors               the shared per-issue colour tokens
     • window._resolveStanceList(id, p)    documented stance cards (topic clause,
       and the card-level pair the companion line reads)
     • window.ISSUE_MAP                    the two keys' labels + chips
     • window.PDXStance                    the canonical stance pill/vocabulary
     • window.PDXLearn                     the glossary terms this copy links

   Public API (window.PDXBallotAxes):
     KEYS                    → { security, access }
     PAIRS / pairDef(id)     → the declared pairs, as data
     STATUS                  → the five status states, as data
     axisMeta(which)         → label/icon/chip/direction copy for one axis
     axisState(pid, which)   → one axis's live row state (null when off-browse)
     pairState(pid, id, p)   → both halves + the resolved status
     statusFor(a, b)         → the status rule, as a pure function
     pairHtml(pid, id, p)    → the block body for one pair ('' when incomplete)
     profileHtml(id, p)      → the profile section (self-gating to '')
     pairFor(id, p)          → card-level pair, used by the companion line
     companionHtml(id, k, o) → the "other axis" line for a card on key k
     explainerHtml(opts)     → the standalone two-axis explainer block
     selfTest()              → { pass, failures }
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXBallotAxes) return;

  var SECURITY = 'election_security';
  var ACCESS = 'voting_access';

  function G(n) { try { return window[n]; } catch (e) { return null; } }
  function isFn(f) { return typeof f === 'function'; }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── Axis vocabulary ───────────────────────────────────────────────────────
  // `dir` spells out what each direction MEANS on this axis, which is the whole
  // point of keeping them apart: "supports" is pro-safeguard under 🔐 and
  // pro-access under 📩. Labels prefer the live ISSUE_MAP so the two never drift.
  var AXES = {
    security: {
      which: 'security', key: SECURITY, icon: '🔐',
      fallbackLabel: 'Election Security & Ballot Safeguards',
      shortLabel: 'Election security',
      question: 'How are eligibility and ballots safeguarded?',
      covers: 'Eligibility verification, voter-roll maintenance, ballot chain of custody, post-election audits, fraud enforcement.',
      dir: {
        support: 'Backs tighter safeguards',
        oppose: 'Argues the safeguards go too far',
        mixed: 'Backs safeguards with reservations'
      }
    },
    access: {
      which: 'access', key: ACCESS, icon: '📩',
      fallbackLabel: 'Expand Voting Access',
      shortLabel: 'Ballot access',
      question: 'How easy is it to register and cast a ballot?',
      covers: 'Registration, early voting, mail ballots, drop boxes, ballot-return and receipt deadlines.',
      dir: {
        support: 'Backs wider access',
        oppose: 'Backs narrowing access',
        mixed: 'Backs access with limits'
      }
    }
  };

  function issueDef(key) { var IM = G('ISSUE_MAP') || {}; return IM[key] || null; }
  function stripIcon(label) {
    label = String(label || '').trim();
    var sp = label.indexOf(' ');
    if (sp > 0 && /[^\x00-\x7F]/.test(label.slice(0, sp))) return label.slice(sp + 1).trim();
    return label;
  }
  function axisMeta(which) {
    var a = AXES[which]; if (!a) return null;
    var def = issueDef(a.key);
    return {
      which: a.which, key: a.key, icon: a.icon,
      label: def && def.label ? stripIcon(def.label) : a.fallbackLabel,
      shortLabel: a.shortLabel,
      chip: (def && def.chip) || '',
      question: a.question, covers: a.covers, dir: a.dir
    };
  }
  // True when a key is one of the two facets — the guard every host surface uses
  // before offering the two-axis read.
  function isAxisKey(k) { return k === SECURITY || k === ACCESS; }
  function whichFor(k) { return k === SECURITY ? 'security' : k === ACCESS ? 'access' : ''; }
  function otherKey(k) { return k === SECURITY ? ACCESS : k === ACCESS ? SECURITY : ''; }

  // ── THE FOOTER, IN ONE PLACE ──────────────────────────────────────────────
  // The block's only line of general copy, and it is a POINTER, not a lesson: it
  // says where the full list of a measure's issues actually lives — the dossier
  // each column already opens — instead of restating the splitting rule the row
  // notes, the dossier and the glossary all state at the point of use. Pair-
  // agnostic on purpose: nothing here names a topic.
  var FOOT_LINK = 'A measure that moved both';
  var FOOT_TAIL = ' is listed under every issue it counted for — the dossier behind each column has that list.';

  // ── THE PAIR REGISTRY ─────────────────────────────────────────────────────
  // A pair is DATA: an id, the two axes it joins, and — for the registry's own
  // readers, not for the card — a label and an orientation clause. Neither string
  // is rendered: the block prints the two axes' own copy and one pointer footer.
  // The shell above knows nothing about elections — it renders whatever pairs are
  // declared here — so a second pair is a row in this array plus its two axis
  // definitions, not a second component. Exactly one pair ships today.
  var PAIRS = [
    { id: 'elections', axes: ['security', 'access'],
      label: 'Election security ⇄ ballot access',
      note: 'These two are a worked example: one elections measure can tighten verification and narrow access in the same clause.' }
  ];
  function pairDef(id) {
    for (var i = 0; i < PAIRS.length; i++) if (PAIRS[i].id === id) return PAIRS[i];
    return null;
  }
  var _seq = 0;
  function uidFor(pid, pairId) {
    return ('pdxbax-' + String(pairId || 'pair') + '-' +
      String(pid || '').trim().toLowerCase() + '-' + (++_seq)).replace(/[^A-Za-z0-9_-]/g, '');
  }

  // ── Reading a member's pair ───────────────────────────────────────────────
  function stanceOf(card) {
    var raw = String((card && (card.issueStance || card.pos)) || '').toLowerCase();
    if (raw === 'support' || raw === 'supported') return 'support';
    if (raw === 'oppose' || raw === 'opposed') return 'oppose';
    if (raw === 'mixed') return 'mixed';
    return '';
  }
  function cardsFor(id, p) {
    var f = G('_resolveStanceList');
    if (!isFn(f)) return [];
    var list = null;
    try { list = f(id, p || null); } catch (e) { list = null; }
    return Array.isArray(list) ? list : [];
  }
  // First card on each axis, plus the relation between them. `relation` is the
  // product-facing read:
  //   'split'  — a position on both axes, pointing in different directions
  //   'paired' — a position on both axes, pointing the same way
  //   'one'    — a position on exactly one axis (the other is a coverage gap)
  //   ''       — nothing on either axis
  function pairFor(id, p) {
    var out = { security: null, access: null, count: 0, relation: '' };
    cardsFor(id, p).forEach(function (c) {
      if (!c || !c.issueKey) return;
      var w = whichFor(c.issueKey);
      if (!w || out[w]) return;
      if (!stanceOf(c)) return;                 // no readable direction → not a position
      out[w] = c;
    });
    out.count = (out.security ? 1 : 0) + (out.access ? 1 : 0);
    if (out.count === 2) {
      out.relation = (stanceOf(out.security) === stanceOf(out.access)) ? 'paired' : 'split';
    } else if (out.count === 1) {
      out.relation = 'one';
    }
    return out;
  }

  // ── Rendering pieces ──────────────────────────────────────────────────────
  function pill(stance) {
    var PS = G('PDXStance');
    if (PS && isFn(PS.stancePill)) {
      try { var h = PS.stancePill(stance); if (h) return h; } catch (e) {}
    }
    var word = stance === 'support' ? 'Supports' : stance === 'oppose' ? 'Opposes' : 'Mixed';
    return '<span class="bax-pill is-' + esc(stance) + '">' + esc(word) + '</span>';
  }
  // A glossary link, by term key. The concept strip links the GENERAL rule
  // ('omnibus' — one instrument, several issues, each scored on its own); the
  // pair-specific surfaces link 'twoaxis'. Degrades to plain text.
  function learnLink(key, text) {
    var PL = G('PDXLearn');
    if (PL && isFn(PL.term)) {
      try { var h = PL.term(key, text); if (h) return h; } catch (e) {}
    }
    return esc(text);
  }

  // ── THE ROW MODEL IS THE SOURCE ───────────────────────────────────────────
  // Everything the two columns print — the Said word, the Record sentence, its
  // depth, the early-signal horizon, the one percentage — comes from the LEAF the
  // stance tree already builds for that (politician × issue). Not a second read of
  // the record, not a second vocabulary, and nothing recomputed here: if the tree
  // says "Thin supports · 1 vote — early signal", so does this block, and when the
  // tree's wording moves this moves with it.
  //
  // No leaf means the issue is on no browse surface for this profile (nothing
  // stated AND nothing formal on file), which is exactly the mount question this
  // block asks below.
  function leafFor(pid, issueKey) {
    var ST = G('PDXStanceTree');
    if (!ST || !isFn(ST.leaf)) return null;
    try { return ST.leaf(pid, issueKey) || null; } catch (e) { return null; }
  }
  function treeCopy(name, fallback) {
    var ST = G('PDXStanceTree');
    try { if (ST && ST[name]) return ST[name]; } catch (e) {}
    return fallback;
  }
  // The stance card's own topic, and ONLY its topic. The stance text, its evidence
  // line and its source link are the dossier's job — this block hands the reader
  // one short orientation clause and the door, never the article.
  function topicFor(pid, issueKey) {
    var found = '';
    cardsFor(pid, null).forEach(function (c) {
      if (found || !c || c.issueKey !== issueKey) return;
      if (c.topic) found = String(c.topic);
    });
    return found;
  }

  // ── ONE AXIS, AS STATE ────────────────────────────────────────────────────
  // `dir` is the STATED direction and nothing else; `recDir` is the formal
  // record's, kept apart from it on purpose — a stated position and a record
  // pattern are two different claims, and the status below is never allowed to
  // compare one against the other as if they were the same kind of fact.
  function axisState(pid, which) {
    var m = axisMeta(which);
    if (!m || !pid) return null;
    var lf = leafFor(pid, m.key);
    if (!lf) return null;
    var rec = lf.record || null;
    var saidKey = (lf.said && lf.said.stated) ? lf.said.key : '';
    var polar = (saidKey === 'support' || saidKey === 'oppose') ? saidKey : '';
    var recDir = (rec && rec.directional && (rec.tone === 'support' || rec.tone === 'oppose'))
      ? rec.tone : '';
    return {
      which: which, key: m.key, meta: m, leaf: lf,
      said: {
        key: (lf.said && lf.said.key) || 'none',
        label: (lf.said && lf.said.label) || 'No stated position',
        stated: !!(lf.said && lf.said.stated)
      },
      record: rec,
      // The one percentage this block may carry, in the one state that earned it:
      // an issue Direction Match actually tested. Never blended, never summed.
      pct: (rec && rec.state === 'scored' && typeof rec.pct === 'number') ? rec.pct : null,
      dir: polar,
      mixed: saidKey === 'mixed',
      recDir: recDir,
      patternOnly: !!lf.patternOnly,
      signal: !!(polar || saidKey === 'mixed' || recDir),
      topic: topicFor(pid, m.key)
    };
  }

  // ── THE STATUS LINE ───────────────────────────────────────────────────────
  // Five states, resolved from the two axis states above and nothing else. The
  // two that compare (`same`, `split`) may only ever compare LIKE WITH LIKE: two
  // stated positions, or — where neither axis has a stated position — two record
  // directions, which then carry the pattern-only disclosure with them.
  var STATUS = {
    same:      { key: 'same',      tag: 'Same direction on both',    tone: 'quiet' },
    split:     { key: 'split',     tag: 'Split direction',           tone: 'loud'  },
    unsettled: { key: 'unsettled', tag: 'Mixed on one side',         tone: 'quiet' },
    one:       { key: 'one',       tag: 'One side on record',        tone: 'quiet' },
    thin:      { key: 'thin',      tag: 'Not enough to compare yet', tone: 'quiet' }
  };
  function statusFor(a, b) {
    if (!a || !b) return { key: 'thin', basis: '' };
    if (a.dir && b.dir) return { key: (a.dir === b.dir) ? 'same' : 'split', basis: 'said' };
    if ((a.mixed || b.mixed) && a.signal && b.signal) return { key: 'unsettled', basis: 'said' };
    if (!a.signal && !b.signal) return { key: 'thin', basis: '' };
    if (!a.said.stated && !b.said.stated && a.recDir && b.recDir) {
      return { key: (a.recDir === b.recDir) ? 'same' : 'split', basis: 'record' };
    }
    return { key: 'one', basis: (a.said.stated || b.said.stated) ? 'said' : 'record' };
  }
  function axisPhrase(s) {
    return s.meta.icon + ' ' + s.meta.shortLabel.toLowerCase();
  }
  function dirPhrase(s, key) {
    return String((s.meta.dir && s.meta.dir[key]) || '').toLowerCase();
  }
  // The sentence, built from the live pair. Names both halves every time: a status
  // word with no axes in it is a label, not a finding a reader can check.
  function statusText(st, a, b, who) {
    var pa = esc(axisPhrase(a)), pb = esc(axisPhrase(b));
    if (st.key === 'split') {
      if (st.basis === 'said') {
        return who + ' ' + esc(dirPhrase(a, a.dir)) + ' on ' + pa + ', and ' +
          esc(dirPhrase(b, b.dir)) + ' on ' + pb +
          '. Two claims, two directions — read separately, never averaged into one result.';
      }
      return 'The formal record points one way on ' + pa + ' and the other way on ' + pb +
        '. ' + esc(treeCopy('PATTERN_ONLY_NOTE',
          'Inferred from the formal record pattern — this is not a quoted stance, and it is not counted in Direction Match.'));
    }
    if (st.key === 'same') {
      if (st.basis === 'said') {
        return who + ' points the same way on ' + pa + ' and on ' + pb +
          '. Each side is still read on its own record — agreeing on both is a finding, not one merged score.';
      }
      return 'The formal record points the same way on ' + pa + ' and on ' + pb + '. ' +
        esc(treeCopy('PATTERN_ONLY_NOTE',
          'Inferred from the formal record pattern — this is not a quoted stance, and it is not counted in Direction Match.'));
    }
    if (st.key === 'unsettled') {
      var mx = a.mixed ? pa : pb, ot = a.mixed ? pb : pa;
      return 'The stated position on ' + mx + ' is mixed, so it cannot be said to agree or disagree with ' +
        ot + '. Both halves are shown as they stand, and neither is read off the other.';
    }
    if (st.key === 'one') {
      var lead = a.said.stated ? a : (b.said.stated ? b : (a.signal ? a : b));
      var rest = (lead === a) ? b : a;
      var pl = esc(axisPhrase(lead)), pr = esc(axisPhrase(rest));
      if (!rest.signal) {
        return 'Only ' + pl + ' has a direction to read. ' + pr +
          ' is on file but left blank rather than assumed from the other side.';
      }
      return pl + ' has a stated position; ' + pr +
        ' is on the formal record only. The two are shown side by side rather than compared.';
    }
    return 'Both sides are on file, but neither has a direction to read yet. Nothing here is inferred from the other side.';
  }

  // ── ONE COLUMN ────────────────────────────────────────────────────────────
  // A compact issue card: what the claim asks, what they said, what the record
  // did, the one percentage where Direction Match tested it, and the door. The
  // record slot is the tree's own vocabulary — label, depth, early-signal — and
  // the colour tokens are the shared per-issue ones, so a column and its leaf in
  // the tree are the same issue in the same colour saying the same thing.
  function recSlotHtml(rc) {
    if (!rc) return '';
    var scored = (rc.state === 'scored');
    var early = (rc.early && rc.earlyNote)
      ? '<i class="bax-early"> — ' + esc(String(rc.earlyNote).replace(/\.$/, '')) + '</i>' : '';
    return '<span class="bax-rec st-' + esc(rc.state) + ' tone-' + esc(scored ? 'verdict' : rc.tone) + '"' +
        ((scored && rc.color) ? ' style="--bax-rc:' + esc(rc.color) + '"' : '') + '>' +
        '<b>🏛 Record:</b> ' + esc(rc.label) +
        (rc.depth ? '<i class="bax-depth"> · ' + esc(rc.depth) + '</i>' : '') +
        early +
      '</span>';
  }
  function pctSlotHtml(s) {
    if (s.pct === null) return '';
    return '<span class="bax-pct"' +
      ((s.record && s.record.color) ? ' style="--bax-rc:' + esc(s.record.color) + '"' : '') + '>' +
      esc(s.pct) + '%</span>';
  }
  function colorStyle(key) {
    var IC = G('PDXIssueColors');
    if (!IC || !isFn(IC.styleFor)) return '';
    try { return IC.styleFor(key) || ''; } catch (e) { return ''; }
  }
  // What a screen reader hears: one sentence, in the order the column reads, with
  // the door named at the end. Fragments lose the relation between the halves.
  function colSay(s) {
    var rc = s.record;
    var t = s.meta.label + '. ' + s.meta.question + ' ';
    t += s.said.stated ? ('Their stated position: ' + s.said.label + '. ')
                       : 'No stated position on file. ';
    if (rc && rc.state === 'scored') {
      t += 'Direction Match on this issue: ' + rc.label +
        ((s.pct === null) ? '' : ', ' + s.pct + '%') +
        (rc.depth ? ', from ' + rc.depth + ' on file' : '') + '. ';
    } else if (rc) {
      t += rc.label + (rc.depth ? ' — ' + rc.depth + ' on file' : '') + '. ';
    }
    if (rc && rc.early && rc.earlyNote) t += 'This is an ' + rc.earlyNote + ' ';
    if (s.patternOnly) t += treeCopy('PATTERN_ONLY_NOTE', '') + ' ';
    return t + 'Opens the issue dossier.';
  }
  function colHtml(s, pid, uid) {
    var doorId = (uid + '-go-' + s.which).replace(/[^A-Za-z0-9_-]/g, '');
    var tag = s.patternOnly
      ? '<span class="bax-tag">' + esc(treeCopy('PATTERN_ONLY_TAG', 'Not in Direction Match')) + '</span>' : '';
    return '<article class="bax-col bax-' + esc(s.which) + '" style="' + esc(colorStyle(s.key)) + '"' +
        ' data-pdxbax-axis="' + esc(s.which) + '" data-pdxbax-issue="' + esc(s.key) + '"' +
        ' data-pdxbax-said="' + esc(s.said.key) + '"' +
        ' data-pdxbax-rec="' + esc(s.record ? s.record.state : 'none') + '">' +
        '<div class="bax-col-head">' +
          '<span class="bax-col-ico" aria-hidden="true">' + s.meta.icon + '</span>' +
          '<span class="bax-col-label">' + esc(s.meta.label) + '</span>' +
        '</div>' +
        '<p class="bax-col-q">' + esc(s.meta.question) + '</p>' +
        '<div class="bax-col-slots">' +
          '<span class="bax-said s-' + esc(s.said.key) + '"><b>Said:</b> ' + esc(s.said.label) + '</span>' +
          recSlotHtml(s.record) + pctSlotHtml(s) + tag +
        '</div>' +
        '<p class="bax-col-dir">“Supports” here = ' + esc(dirPhrase(s, 'support')) + '.</p>' +
        (s.topic ? '<p class="bax-col-clause">' + esc(s.topic) + '</p>' : '') +
        '<button type="button" class="bax-col-go" id="' + esc(doorId) + '"' +
          ' data-pdxbax-dos="' + esc(s.key) + '"' +
          ' data-pdxbax-pid="' + esc(pid) + '"' +
          ' data-pdxbax-origin="' + esc(doorId) + '"' +
          ' aria-label="' + esc(colSay(s)) + '">' +
          'Open the issue dossier <span aria-hidden="true">›</span>' +
        '</button>' +
      '</article>';
  }

  // ── THE BLOCK ─────────────────────────────────────────────────────────────
  // STATUS FIRST, every time. The first thing on screen is what this pair is
  // doing on this profile — the one reading no other surface produces — and the
  // columns under it are the evidence for that sentence. No preamble runs ahead
  // of it: a general lesson at the top pushed the finding below the fold and
  // repeated what the row notes and the dossier already say in place.
  function statusHtml(st, a, b, who) {
    var meta = STATUS[st.key] || STATUS.thin;
    return '<div class="bax-status is-' + esc(meta.key) + ' tone-' + esc(meta.tone) + '"' +
        ' data-pdxbax-status="' + esc(meta.key) + '" data-pdxbax-basis="' + esc(st.basis || '') + '">' +
        '<span class="bax-status-tag">' + esc(meta.tag) + '</span>' +
        '<span class="bax-status-txt">' + statusText(st, a, b, who) + '</span>' +
      '</div>';
  }
  // One line, and it earns its place by pointing OUT of the block: the dossier a
  // column opens is where every issue a single measure counted for is listed.
  function footHtml() {
    return '<p class="bax-foot">' + learnLink('omnibus', FOOT_LINK) + esc(FOOT_TAIL) + '</p>';
  }
  function bodyHtml(pid, p, def, states) {
    var uid = def.uid;
    var a = states[0], b = states[1];
    var who = esc((p && p.name) ? String(p.name).split(' ')[0] : 'This official');
    return statusHtml(statusFor(a, b), a, b, who) +
      '<div class="bax-cols">' + colHtml(a, pid, uid) + colHtml(b, pid, uid) + '</div>' +
      footHtml();
  }

  // ── PAIR STATE, AND THE MOUNT RULE ────────────────────────────────────────
  // ONE RULE: the block is VISIBLE only where BOTH halves of the pair are on this
  // profile's browse set — each half stated, or on the formal record, or both.
  // A pair with one half missing cannot teach the split; a half-empty two-column
  // block would be a layout waiting for data, which is the shape this pass exists
  // to remove.
  //
  // The host shell is still emitted (hidden, empty) when ONE half is present,
  // because the formal-record lane lands after first paint: an axis that is
  // record-only is not on the browse set yet at mount time, and without a host in
  // the document the warm repaint would have nothing to fill. Nothing on either
  // profile ever sees an empty frame; `hidden` is not a mount.
  function pairState(pid, pairId, p) {
    var def = pairDef(pairId);
    if (!def || !pid) return null;
    var states = def.axes.map(function (w) { return axisState(pid, w); });
    var present = states.filter(Boolean);
    var complete = present.length === def.axes.length;
    return {
      id: def.id, def: def, axes: states, present: present.length, complete: complete,
      status: complete ? statusFor(states[0], states[1]) : null,
      name: (p && p.name) || ''
    };
  }
  function pairHtml(pid, pairId, p, uid) {
    var ps = pairState(pid, pairId, p);
    if (!ps || !ps.complete) return '';
    var def = {};
    for (var k in ps.def) if (Object.prototype.hasOwnProperty.call(ps.def, k)) def[k] = ps.def[k];
    def.uid = uid || 'pdxbax';
    return bodyHtml(pid, p, def, ps.axes);
  }
  function profileHtml(id, p) {
    if (!id) return '';
    var out = '';
    PAIRS.forEach(function (def) {
      var ps = pairState(id, def.id, p);
      if (!ps || !ps.present) return;                 // nothing of this pair on the profile
      var uid = uidFor(id, def.id);
      var body = ps.complete ? pairHtml(id, def.id, p, uid) : '';
      try { setTimeout(function () { bindHost(uid, id, p); }, 0); } catch (e) {}
      out += '<section class="modal-block bax-sec" data-pdxbax-host="' + esc(uid) + '"' +
          ' data-pdxbax-pair="' + esc(def.id) + '"' + (body ? '' : ' hidden') + '>' +
          '<div class="bax-body">' + body + '</div>' +
        '</section>';
    });
    return out;
  }

  // ── THE DOOR ──────────────────────────────────────────────────────────────
  // A column's primary tap opens the ISSUE DOSSIER through PDXConsistency.openGap
  // — the same public entry the tree's leaves, the stance rows and the Official
  // Record rows use. There is no second report surface here and this module
  // navigates nowhere. FAIL CLOSED, OUT LOUD: a door that swallows the tap and
  // shows nothing would tell the reader the issue has no report behind it, which
  // is false, so the column says what happened where the thumb already is.
  var DOOR_FAIL = 'The full report for this issue could not open just now. ' +
    'Nothing in this column has changed — reload the profile and tap again.';
  function colOfEl(el) {
    try { return (el && el.closest) ? el.closest('.bax-col') : null; } catch (e) { return null; }
  }
  function doorFailed(btn) {
    var col = colOfEl(btn);
    if (!col) return false;
    try {
      col.setAttribute('data-pdxbax-failed', '1');
      var note = col.querySelector('.bax-fail');
      if (!note) {
        note = document.createElement('p');
        note.className = 'bax-fail';
        note.setAttribute('role', 'status');
        col.appendChild(note);
      }
      note.textContent = DOOR_FAIL;
    } catch (e) { return false; }
    return true;
  }
  function clearDoorFail(btn) {
    var col = colOfEl(btn);
    if (!col || col.getAttribute('data-pdxbax-failed') !== '1') return false;
    try {
      col.removeAttribute('data-pdxbax-failed');
      var note = col.querySelector('.bax-fail');
      if (note && note.parentNode) note.parentNode.removeChild(note);
    } catch (e) { return false; }
    return true;
  }
  var _bound = false;
  function bindOnce() {
    if (_bound || !document || !document.addEventListener) return;
    _bound = true;
    document.addEventListener('click', function (e) {
      if (!e || !e.target || !e.target.closest) return;
      var dos = e.target.closest('[data-pdxbax-dos]');
      if (!dos) return;
      var CS = G('PDXConsistency');
      var opened = false;
      try {
        opened = !!(CS && isFn(CS.openGap)) &&
          CS.openGap(dos.getAttribute('data-pdxbax-pid') || '',
                     dos.getAttribute('data-pdxbax-dos') || '',
                     { arrival: false, origin: dos.getAttribute('data-pdxbax-origin') || '' }) !== false;
      } catch (e2) { opened = false; }
      e.preventDefault();
      if (opened) clearDoorFail(dos); else doorFailed(dos);
    }, false);
  }

  // ── THE WARM REPAINT ──────────────────────────────────────────────────────
  // The formal-record half of every column arrives after first paint, on the same
  // 'pdx-consistency-warm' event the tree rebuilds on. Without this a pair whose
  // second half is record-only would stay hidden for the whole visit, and a column
  // whose record landed late would keep printing its cold value.
  function bindHost(uid, pid, p) {
    bindOnce();
    if (!window.addEventListener) return;
    var handler = function (ev) {
      var host = document.querySelector('[data-pdxbax-host="' + uid + '"]');
      if (!host) { window.removeEventListener('pdx-consistency-warm', handler); return; }
      if (ev && ev.detail && ev.detail.pid &&
          String(ev.detail.pid).trim().toLowerCase() !== String(pid).trim().toLowerCase()) return;
      try {
        var body = host.querySelector('.bax-body');
        if (!body) return;
        var next = pairHtml(pid, host.getAttribute('data-pdxbax-pair') || '', p, uid);
        body.innerHTML = next;
        if (next) host.removeAttribute('hidden'); else host.setAttribute('hidden', '');
      } catch (e) {}
    };
    window.addEventListener('pdx-consistency-warm', handler);
  }
  try { bindOnce(); } catch (e) {}

  // ── The "other axis" line for a single-issue card ─────────────────────────
  // Given a member and the axis a surface is already showing, describe where
  // they land on the OTHER axis. This is what makes a split legible on an
  // issue-first surface, where only one key is ever in view.
  //   opts.name — display name, used in the split sentence
  function companionHtml(id, issueKey, opts) {
    opts = opts || {};
    if (!isAxisKey(issueKey)) return '';
    var pair = pairFor(id, opts.record || null);
    var mineWhich = whichFor(issueKey);
    var otherWhich = whichFor(otherKey(issueKey));
    if (!pair[mineWhich]) return '';
    var om = axisMeta(otherWhich);
    if (!pair[otherWhich]) {
      return '<div class="bax-companion is-gap">' + om.icon + ' ' + esc(om.label) +
        ' — <span class="bax-companion-gap">no position on record yet</span></div>';
    }
    var st = stanceOf(pair[otherWhich]);
    var split = stanceOf(pair[mineWhich]) !== st;
    return '<div class="bax-companion' + (split ? ' is-split' : '') + '">' +
      (split ? '<span class="bax-companion-tag">Split</span>' : '') +
      om.icon + ' ' + esc(om.label) + ' — ' + pill(st) +
      '<span class="bax-companion-dir">' + esc(om.dir[st] || '') + '</span>' +
      (pair[otherWhich].topic ? '<span class="bax-companion-topic">' + esc(pair[otherWhich].topic) + '</span>' : '') +
    '</div>';
  }

  // ── The standalone explainer ──────────────────────────────────────────────
  // Used at the top of either axis in the Stance Library, so a reader who lands
  // on one key learns the model and can cross into the other in one tap.
  //   opts.activeKey — the axis currently in view (highlighted, not linked)
  //   opts.onKey     — JS expression template for the cross-link; receives the key
  function explainerHtml(opts) {
    opts = opts || {};
    var active = isAxisKey(opts.activeKey) ? opts.activeKey : '';
    function tile(which) {
      var m = axisMeta(which);
      var on = active === m.key;
      var head = '<span class="bax-tile-ico" aria-hidden="true">' + m.icon + '</span>' +
        '<span class="bax-tile-label">' + esc(m.label) + '</span>' +
        (on ? '<span class="bax-tile-here">You’re here</span>' : '');
      var inner = '<div class="bax-tile-head">' + head + '</div>' +
        '<div class="bax-tile-q">' + esc(m.question) + '</div>' +
        '<div class="bax-tile-covers">' + esc(m.covers) + '</div>' +
        '<div class="bax-tile-dir">“Supports” here means: ' + esc(String(m.dir.support).toLowerCase()) + '.</div>';
      if (on || !opts.onKey) return '<div class="bax-tile' + (on ? ' is-here' : '') + '">' + inner + '</div>';
      return '<button type="button" class="bax-tile is-link" ' + opts.onKey.replace('%KEY%', esc(m.key)) + '>' +
        inner + '<span class="bax-tile-go">See this axis →</span></button>';
    }
    return '<div class="bax-explainer">' +
      '<div class="bax-explainer-head">' +
        '<span class="bax-explainer-eyebrow">🗳 Two axes, scored separately</span>' +
        '<span class="bax-explainer-lead">' +
          learnLink('twoaxis', 'Elections are measured on two independent axes') +
          ' — one bill can tighten safeguards and narrow access in the same clause, so a Yea can advance one axis and cut against the other. Both readings are true.' +
        '</span>' +
      '</div>' +
      '<div class="bax-tiles">' + tile('security') + tile('access') + '</div>' +
      '<div class="bax-explainer-foot">A member who supports both is not contradicting themselves: “supports” means pro-safeguard on one axis and pro-access on the other. Where the two point different ways, the split is flagged rather than averaged away.</div>' +
    '</div>';
  }

  // ── Self-test ─────────────────────────────────────────────────────────────
  function selfTest() {
    var failures = [];
    var ok = function (cond, msg) { if (!cond) failures.push(msg); };
    ok(isAxisKey(SECURITY) && isAxisKey(ACCESS), 'both facet keys are recognised');
    ok(!isAxisKey('election_integrity'), 'the legacy election_integrity key is NOT a facet');
    ok(!isAxisKey('voter_id'), 'the legacy voter_id key is NOT a facet');
    ok(otherKey(SECURITY) === ACCESS && otherKey(ACCESS) === SECURITY, 'the axes pair to each other');
    ['security', 'access'].forEach(function (w) {
      var m = axisMeta(w);
      ok(!!(m && m.label && m.question && m.covers), w + ': has label, question and coverage copy');
      ok(!!(m && m.dir.support && m.dir.oppose && m.dir.mixed), w + ': names all three directions');
    });
    var IM = G('ISSUE_MAP');
    if (IM) {
      ok(!!IM[SECURITY], 'election_security is a live ISSUE_MAP key');
      ok(!!IM[ACCESS], 'voting_access is a live ISSUE_MAP key');
    }
    ok(!!explainerHtml({ activeKey: SECURITY }), 'the explainer renders');
    ok(explainerHtml({ activeKey: SECURITY }).indexOf('You’re here') !== -1, 'the explainer marks the axis in view');
    ok(profileHtml('__pdx_no_such_politician__', null) === '', 'the profile section self-gates to empty');
    // The pair registry is data, and the shell must be able to render any pair in
    // it: an entry naming an axis this module does not define would mount a column
    // with no question and no direction copy.
    ok(PAIRS.length > 0, 'at least one pair is declared');
    PAIRS.forEach(function (d) {
      ok(!!(d.id && d.axes && d.axes.length === 2), d.id + ': declares exactly two axes');
      d.axes.forEach(function (w) { ok(!!axisMeta(w), d.id + ': axis "' + w + '" is defined'); });
      ok(pairDef(d.id) === d, d.id + ': is reachable by id');
    });
    // THE STATUS IS THE LEAD. Built here from two synthetic axis states so the
    // order is checked without the row model: status band, then the columns, then
    // the one pointer footer — and no concept strip ahead of any of it.
    var probeAxis = function (w, dir) {
      var m = axisMeta(w);
      return { which: w, key: m.key, meta: m, record: null, pct: null, topic: '',
        said: { key: dir || 'none', label: dir ? 'Supports' : 'No stated position', stated: !!dir },
        dir: dir || '', mixed: false, recDir: '', patternOnly: false, signal: !!dir };
    };
    var probe = bodyHtml('__pdx_probe__', { name: 'Test Person' }, { uid: 'pdxbax-probe' },
      [probeAxis('security', 'support'), probeAxis('access', 'support')]);
    ok(probe.indexOf('<div class="bax-status') === 0, 'the block opens with the pair status band');
    ok(probe.indexOf('bax-status') < probe.indexOf('bax-cols'), 'status precedes the two columns');
    ok(probe.indexOf('bax-cols') < probe.indexOf('bax-foot'), 'the columns precede the footer');
    ok(probe.indexOf('bax-concept') === -1, 'no concept strip leads the block');
    ok((FOOT_LINK + FOOT_TAIL).toLowerCase().indexOf('election') === -1,
      'the footer copy names no topic');
    // The status rule, as a table. Nothing here reads the DOM or the live data:
    // these are the five answers the block is allowed to give.
    var A = function (o) {
      o = o || {};
      return { dir: o.dir || '', mixed: !!o.mixed, recDir: o.recDir || '',
        signal: !!(o.dir || o.mixed || o.recDir),
        said: { stated: !!(o.dir || o.mixed) },
        meta: axisMeta('security') };
    };
    ok(statusFor(A({ dir: 'support' }), A({ dir: 'support' })).key === 'same',
      'two stated positions pointing the same way read as same');
    ok(statusFor(A({ dir: 'support' }), A({ dir: 'oppose' })).key === 'split',
      'two stated positions pointing opposite ways read as split');
    ok(statusFor(A({ dir: 'support' }), A({ mixed: true })).key === 'unsettled',
      'a stated Mixed on one side is never forced into agreement or a split');
    ok(statusFor(A({ dir: 'support' }), A({})).key === 'one',
      'one side with nothing to read is one-sided, not a split');
    ok(statusFor(A({ dir: 'support' }), A({ recDir: 'oppose' })).key === 'one',
      'a stated position is never compared against the other side’s record pattern');
    ok(statusFor(A({ recDir: 'support' }), A({ recDir: 'oppose' })).basis === 'record',
      'two record patterns compare on the record basis, and say so');
    ok(statusFor(A({}), A({})).key === 'thin', 'two blank sides read as not enough to compare');
    return { pass: !failures.length, failures: failures };
  }

  window.PDXBallotAxes = {
    KEYS: { security: SECURITY, access: ACCESS },
    // The pairs and the status vocabulary, as data — so a test can assert what the
    // block is allowed to say instead of scraping markup for literals, and so a
    // second pair never needs a second component.
    PAIRS: PAIRS,
    pairDef: pairDef,
    STATUS: STATUS,
    DOOR_FAIL: DOOR_FAIL,
    axisMeta: axisMeta,
    isAxisKey: isAxisKey,
    otherKey: otherKey,
    // The live read: one axis, both halves, and the status rule as a pure function
    // of the two. Every one of them resolves off the shared row model.
    axisState: axisState,
    pairState: pairState,
    statusFor: statusFor,
    // The markup: one pair's body, and the profile section that hosts it.
    pairHtml: pairHtml,
    profileHtml: profileHtml,
    // The card-level pair, kept for the issue-first surfaces: the companion line
    // runs under a single stance card in the Stance Library, where no profile row
    // model is in play.
    pairFor: pairFor,
    companionHtml: companionHtml,
    explainerHtml: explainerHtml,
    selfTest: selfTest
  };
})();
