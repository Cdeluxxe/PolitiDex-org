/* ═══════════════════════════════════════════════════════════════════════════
   BALLOT AXES  ·  ballot-axes.js
   ---------------------------------------------------------------------------
   The two-axis read on elections, in one place.

   PolitiDex scores elections on two INDEPENDENT ISSUE_MAP keys:

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
   a member who is pro-safeguard on one axis and anti-access on the other.

   Each axis is read in its OWN direction. Under 🔐 "supports" means
   pro-safeguard; under 📩 "supports" means pro-access. So a member showing
   "supports" on both is not contradicting themselves, and a member split
   across the two is not merely inconsistent — that split IS the position.

   Owns NO data. It is a pure lens over globals that already exist (every
   call guarded, so a missing dependency degrades to an empty string):
     • window._resolveStanceList(id, p)  documented stance cards
     • window.ISSUE_MAP                  the two keys' labels + chips
     • window.PDXStance                  the canonical stance pill/vocabulary
     • window.PDXLearn                   the "two axes" glossary term
     • window.PDXIssueView               per-axis rankings ("who backs this")
     • window.openModal / showProfile    profile navigation

   Public API (window.PDXBallotAxes):
     KEYS                    → { security, access }
     axisMeta(which)         → label/icon/chip/direction copy for one axis
     pairFor(id, p)          → { security, access, count, relation }
     profileHtml(id, p)      → the profile section (self-gating to '')
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
  function jsAttr(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

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
  function learnLink(text) {
    var PL = G('PDXLearn');
    if (PL && isFn(PL.term)) {
      try { var h = PL.term('twoaxis', text); if (h) return h; } catch (e) {}
    }
    return esc(text);
  }
  // "Who backs this axis" — the per-axis ranking. issue-view.js already accepts a
  // single ISSUE_MAP key as a focus, so this is a link into an existing surface,
  // not a new one.
  function rankBtn(which, label) {
    var a = AXES[which]; if (!a) return '';
    if (!(G('PDXIssueView') && isFn(G('PDXIssueView').open))) return '';
    return '<button type="button" class="bax-btn" ' +
      'onclick="try{window.PDXIssueView.open(\'' + jsAttr(a.key) + '\')}catch(e){}">' +
      a.icon + ' ' + esc(label || 'Who backs this') + '</button>';
  }

  function axisRow(which, card) {
    var m = axisMeta(which); if (!m) return '';
    var st = stanceOf(card);
    var body = card
      ? '<div class="bax-row-read">' + pill(st) +
          '<span class="bax-row-dir">' + esc(m.dir[st] || '') + '</span></div>' +
        '<div class="bax-row-topic">' + esc(card.topic || '') + '</div>' +
        (card.text ? '<div class="bax-row-text">' + esc(card.text) + '</div>' : '') +
        (card.source && card.source.url
          ? '<div class="bax-row-src">📎 <a href="' + esc(card.source.url) + '" target="_blank" rel="noopener noreferrer">' +
              esc(card.source.label || 'Source') + '</a></div>'
          : '')
      : '<div class="bax-row-gap">No documented position on this axis yet — a coverage gap, not a neutral stance.</div>';
    return '<div class="bax-row' + (card ? '' : ' is-gap') + ' bax-' + esc(which) + '">' +
        '<div class="bax-row-head">' +
          '<span class="bax-row-ico" aria-hidden="true">' + m.icon + '</span>' +
          '<div class="bax-row-titles">' +
            '<div class="bax-row-label">' + esc(m.label) + '</div>' +
            '<div class="bax-row-q">' + esc(m.question) + '</div>' +
          '</div>' +
        '</div>' + body +
      '</div>';
  }

  // The headline that names the relation. A split is the finding worth reading
  // first, so it gets the plain-language sentence rather than a warning tone:
  // nothing here is an accusation, it is two sourced positions side by side.
  function verdictHtml(pair, firstName) {
    var who = esc(firstName || 'This official');
    if (pair.relation === 'split') {
      var s = stanceOf(pair.security), a = stanceOf(pair.access);
      var sm = axisMeta('security'), am = axisMeta('access');
      return '<div class="bax-verdict is-split">' +
        '<span class="bax-verdict-tag">Split across the two axes</span>' +
        '<span class="bax-verdict-txt">' + who + ' ' +
          esc(String(sm.dir[s] || '').toLowerCase()) + ' on 🔐 ' + esc(sm.shortLabel.toLowerCase()) +
          ' and ' + esc(String(am.dir[a] || '').toLowerCase()) + ' on 📩 ' + esc(am.shortLabel.toLowerCase()) +
          '. Both are sourced positions, and one measure can move both at once — so this is the shape of the position, not a scoring error.' +
        '</span></div>';
    }
    if (pair.relation === 'paired') {
      return '<div class="bax-verdict is-paired">' +
        '<span class="bax-verdict-tag">Same direction on both axes</span>' +
        '<span class="bax-verdict-txt">' + who + ' lands the same way on safeguards and on access, so the two axes agree here. Each is still scored on its own record.' +
        '</span></div>';
    }
    return '<div class="bax-verdict is-one">' +
      '<span class="bax-verdict-tag">One axis on record</span>' +
      '<span class="bax-verdict-txt">Only one of the two axes has a documented position so far. The other is left blank rather than assumed from this one.' +
      '</span></div>';
  }

  // ── The profile section ───────────────────────────────────────────────────
  // Self-gating: returns '' for anyone with no documented position on either
  // axis, so it appears exactly where there is something real to show.
  function profileHtml(id, p) {
    var pair = pairFor(id, p);
    if (!pair.count) return '';
    var firstName = (p && p.name) ? String(p.name).split(' ')[0] : '';
    return '<div class="modal-section bax-section">' +
      '<div class="modal-section-title">🗳 Elections — Two Axes</div>' +
      '<p class="modal-section-sub">' +
        learnLink('Election security and ballot access are scored separately') +
        ' — safeguards on one axis, access on the other. One bill can move both, so each is read in its own direction.' +
      '</p>' +
      verdictHtml(pair, firstName) +
      '<div class="bax-grid">' + axisRow('security', pair.security) + axisRow('access', pair.access) + '</div>' +
      '<div class="bax-acts">' + rankBtn('security', 'Who backs safeguards') + rankBtn('access', 'Who backs access') + '</div>' +
    '</div>';
  }

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
          learnLink('Elections are measured on two independent axes') +
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
    return { pass: !failures.length, failures: failures };
  }

  window.PDXBallotAxes = {
    KEYS: { security: SECURITY, access: ACCESS },
    axisMeta: axisMeta,
    isAxisKey: isAxisKey,
    otherKey: otherKey,
    pairFor: pairFor,
    profileHtml: profileHtml,
    companionHtml: companionHtml,
    explainerHtml: explainerHtml,
    selfTest: selfTest
  };
})();
