/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — H.R.1 Showcase  ·  window.PDXHR1
   ────────────────────────────────────────────────────────────────────────────
   The flagship demo. It takes ONE real, high-salience vote — H.R.1, the 2025
   reconciliation and tax law ("One Big Beautiful Bill") — and turns it into a
   visual, sourced story that shows what the whole app is FOR: a single "yea" or
   "nay" that touches taxes, health care, food aid and the deficit all at once,
   so one vote can KEEP one promise and BREAK another. That omnibus split is the
   contradiction engine (_polRecordMap / _issueRecordSummary in stance-helpers.js)
   made concrete.

   ADDITIVE + SELF-GATING, in the exact spirit of say-vs-do.js:
     • The omnibus breakdown, contradiction diagram and timeline are curated,
       plainly-sourced facts (House Clerk Roll Call 190, CBO, Congress.gov).
     • The "receipts" are pulled LIVE from window.ACCT_SPOTLIGHT — the same
       sourced accountability layer the rest of the app ships — by scanning for
       members' recorded H.R.1 final-passage votes. Nothing is invented: each
       card carries the member's own record text and its original source link.
     • Renders into <section id="hr1-showcase">. If ACCT_SPOTLIGHT has no H.R.1
       votes yet, the receipts block hides but the story (breakdown + engine +
       timeline) still stands, so the section is never empty or broken.

   Public surface:
     PDXHR1.mount()   → render into the host section
     PDXHR1.refresh() → rebuild receipts once the live roster settles
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXHR1) return; // idempotent

  var HOST_ID = 'hr1-showcase';

  /* ── escape helpers ─────────────────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escAttr(v) { return esc(v).replace(/`/g, '&#96;'); }

  // ── Composition caveat, borrowed from the Official Record panel ──────────────
  // The Showcase's claim is "one roll call, N issues scored separately". The honest
  // flip side of that claim is that for a member whose ONLY judged vote on one of
  // those issues is this bill, their percentage on that issue rests entirely on a
  // single multi-issue vote — which is exactly what the Official Record's
  // composition indicator says beside such a number.
  //
  // The Showcase renders no percentages of its own, so there is nothing here to
  // qualify with a meter on a figure. What it can do is explain the signal a reader
  // will meet on the profiles, in the same words and the same markup: the copy comes
  // from _recordComposition() (stance-helpers.js) and the markup from
  // PDXConsistency.compositionMeterHtml, so the two surfaces cannot word it
  // differently. Absent either helper this returns '' and the Showcase is unchanged.
  function compositionCaveatHtml() {
    try {
      var C = window.PDXConsistency;
      if (typeof window._recordComposition !== 'function' || !C || typeof C.compositionMeterHtml !== 'function') return '';
      // The canonical thin case this page is about: one judged vote, and that vote is
      // an omnibus covering every issue in the grid above.
      var comp = window._recordComposition(
        { consistent: 1, contradicts: 0, mixed: 0, noPosition: 0, total: 1 },
        { omnibus: 1, single: 0, total: 1, maxCount: OMNIBUS.length });
      if (!comp) return '';
      return '<p class="hr1-omni-foot hr1-omni-caveat" style="margin-top:.55rem;font-size:.82rem;color:#9fb4d4;line-height:1.5;">' +
        C.compositionMeterHtml(comp, 'What this looks like on a member’s profile:') + ' ' +
        'It cuts the other way too. If H.R.1 is the <strong style="color:#cbd9ec;">only</strong> vote a member has on one of these issues, ' +
        'their percentage there rests on this single bill — so every percentage in PolitiDex carries this depth marker beside it, ' +
        'and the overall figure counts an issue in proportion to how many judged votes are behind it.' +
      '</p>';
    } catch (e) { return ''; }
  }

  // ── In-context education (window.PDXLearn, pdx-learn.js) ────────────────────
  // Guarded the same way as the other surfaces: absent education layer → plain
  // escaped text and no extra affordances, showcase otherwise identical.
  function LT(key, text) {
    var L = window.PDXLearn;
    return (L && L.term) ? L.term(key, text) : esc(text);
  }
  function LNUM(num) {
    var L = window.PDXLearn;
    return (L && L.numberHtml) ? L.numberHtml(num) : esc(num);
  }
  function LHOWTO(id, label) {
    var L = window.PDXLearn;
    return (L && L.howto) ? L.howto(id, label) : '';
  }

  /* ── identity / photo resolution (all sources may load async) ───────────── */
  function alias(id) {
    try { if (window.ACCT_ALIAS && window.ACCT_ALIAS[id]) return window.ACCT_ALIAS[id]; } catch (e) {}
    return id;
  }
  function polRec(id) {
    var p = null;
    try { if (window.PROFILES && window.PROFILES[id]) p = window.PROFILES[id]; } catch (e) {}
    if (!p) { try { if (typeof CMP_DATA !== 'undefined' && CMP_DATA[id]) p = CMP_DATA[id]; } catch (e) {} }
    if (!p) { try { var a = alias(id); if (a !== id && typeof CMP_DATA !== 'undefined' && CMP_DATA[a]) p = CMP_DATA[a]; } catch (e) {} }
    return p;
  }
  function prettyName(id) {
    return String(id || '').replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function nameFor(id) {
    var p = polRec(id);
    return (p && p.name) ? p.name : prettyName(id);
  }
  function photoFor(id) {
    try { if (typeof window._getPhotoUrl === 'function') return window._getPhotoUrl(id) || ''; } catch (e) {}
    return '';
  }
  function partyChip(id) {
    var p = polRec(id);
    var raw = String((p && (p.party || p.partyLabel)) || '').trim().toUpperCase();
    var c = raw.charAt(0);
    if (c === 'R') return { label: 'R', color: '#f87171' };
    if (c === 'D') return { label: 'D', color: '#60a5fa' };
    if (c === 'I') return { label: 'IND', color: '#a78bfa' };
    return null;
  }
  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '🏛';
    return (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase();
  }
  // Stable-ish accent for an avatar with no photo, derived from the name.
  function avatarTint(name) {
    var s = String(name || ''), h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return 'hsl(' + h + ',45%,42%)';
  }

  /* ── curated, sourced story data ─────────────────────────────────────────── */
  // Plain-language facts about what H.R.1 bundles, each tagged with the promise a
  // "yes" tends to KEEP (kept) or CUT AGAINST (broken). This is the omnibus split
  // the contradiction engine encodes — shown, not just asserted. Each provision now
  // also carries `keys`: the exact ISSUE_MAP issue keys this provision maps to in the
  // Voting Record (vr_measure_issues), so the curated story here uses the SAME
  // vocabulary as the per-issue say-vs-do breakdown a member's profile shows — the
  // showcase and the record can never drift apart.
  var OMNI_ISSUE_LABEL = {
    lower_taxes: 'Lower taxes', tax_middle_class: 'Middle-class taxes', cut_spending: 'Cut spending',
    healthcare: 'Healthcare access', border_security: 'Border security', deportations: 'Deportations',
    national_debt: 'National debt', climate_action: 'Climate action', energy_production: 'Energy production',
    lands_energy: 'Federal-land energy', family_support: 'Family support', strong_defense: 'Defense',
    school_choice: 'School choice', edu_college_cost: 'College costs'
  };
  var OMNIBUS = [
    { ico: '💵', title: 'Tax cuts extended', dir: 'kept', keys: ['lower_taxes', 'tax_middle_class'],
      body: 'Makes the 2017 individual income-tax rates and other expiring tax provisions permanent.',
      keeps: 'A “yes” delivers on a cut-taxes promise.',
      src: { label: 'Congress.gov · H.R.1', url: 'https://www.congress.gov/bill/119th-congress/house-bill/1' } },
    { ico: '🏥', title: 'Medicaid funding cut', dir: 'broken', keys: ['healthcare'],
      body: 'Reduces federal Medicaid spending and adds new eligibility and work requirements.',
      keeps: 'A “yes” cuts against a protect-health-care promise.',
      src: { label: 'CBO · cost estimate', url: 'https://www.cbo.gov/publication/61461' } },
    { ico: '🍎', title: 'Food aid (SNAP) tightened', dir: 'broken', keys: ['family_support'],
      body: 'Narrows SNAP eligibility and shifts more of the cost onto the states.',
      keeps: 'A “yes” cuts against a protect-food-assistance promise.',
      src: { label: 'CBO · cost estimate', url: 'https://www.cbo.gov/publication/61461' } },
    { ico: '🛂', title: 'Border enforcement funded', dir: 'kept', keys: ['border_security', 'deportations'],
      body: 'Adds major funding for border security and immigration enforcement.',
      keeps: 'A “yes” delivers on a secure-the-border promise.',
      src: { label: 'Congress.gov · H.R.1', url: 'https://www.congress.gov/bill/119th-congress/house-bill/1' } },
    { ico: '📈', title: '≈ $3.8T added to deficits', dir: 'broken', keys: ['national_debt'],
      body: 'CBO estimated the package would add roughly $3.8 trillion to federal deficits over ten years.',
      keeps: 'A “yes” cuts against a fiscal-hawk / cut-the-debt promise.',
      src: { label: 'CBO · cost estimate', url: 'https://www.cbo.gov/publication/61461' } },
    { ico: '⚡', title: 'Clean-energy credits rolled back', dir: 'mixed', keys: ['climate_action', 'energy_production'],
      body: 'Phases out several clean-energy tax credits enacted in 2022 while expanding fossil-fuel leasing.',
      keeps: 'A “yes” keeps or breaks a promise depending on where the member stood.',
      src: { label: 'Congress.gov · H.R.1', url: 'https://www.congress.gov/bill/119th-congress/house-bill/1' } }
  ];

  var TIMELINE = [
    { date: 'May 22, 2025', title: 'House passes its first version', body: 'The House narrowly advances its opening version of H.R.1.',
      src: { label: 'House Clerk', url: 'https://clerk.house.gov/Votes/2025' } },
    { date: 'Jul 3, 2025', title: 'Final passage — 218 to 214', body: 'The House clears the final bill, Roll Call 190, 218–214.',
      src: { label: 'House Clerk · Roll Call 190', url: 'https://clerk.house.gov/Votes/2025190' } },
    { date: 'Jul 4, 2025', title: 'Signed into law', body: 'H.R.1 is signed the next day, locking in every provision above at once.',
      src: { label: 'Congress.gov · H.R.1', url: 'https://www.congress.gov/bill/119th-congress/house-bill/1' } }
  ];

  /* ── live receipts: scan ACCT_SPOTLIGHT for real H.R.1 votes ─────────────── */
  var HR1_RE = /\bH\.?\s*R\.?\s*1\b/i;
  var CTX_RE = /reconciliation|218[–-]214|roll call 190|2025190|big beautiful|signed into law|tax law/i;

  function voteDir(txt) {
    var t = String(txt || '').toLowerCase();
    if (/voted?\s+(yes|for|yea)\b/.test(t) || /\byes on final passage\b/.test(t)) return 'yes';
    if (/voted?\s+(no|against|nay)\b/.test(t) || /\bno on final passage\b/.test(t)) return 'no';
    return '';
  }
  function isContradiction(item) {
    if (!item) return false;
    if (String(item.impact || '').toLowerCase() === 'negative') return true;
    var tags = Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : '';
    if (/rhetoric vs reality/.test(tags)) return true;
    return /\bdespite\b|contradict|reversed|flip/i.test(String(item.headline || ''));
  }

  // One primary H.R.1 receipt per member: a flagged contradiction wins over a
  // plain recorded vote, so the strongest teaching example leads.
  function collectReceipts() {
    var out = [];
    var AS = null;
    try { AS = window.ACCT_SPOTLIGHT || null; } catch (e) { AS = null; }
    if (!AS) return out;

    Object.keys(AS).forEach(function (id) {
      var list = AS[id];
      if (!Array.isArray(list)) return;

      // Gate: only members with a CONFIRMED 2025 H.R.1 item (final-passage /
      // reconciliation context) qualify — this excludes other bills that merely
      // share the "H.R. 1x" prefix or the old 118th-Congress "H.R. 1". `\b` after
      // the 1 already rejects H.R. 1339 / 1346 / 27, and the context test rejects
      // the unrelated 2023 "H.R. 1 (Lower Energy Costs Act)".
      var confirmed = false;
      for (var c = 0; c < list.length; c++) {
        var cb = String((list[c] && list[c].headline) || '') + ' ' + String((list[c] && list[c].facts) || '');
        if (HR1_RE.test(cb) && CTX_RE.test(cb)) { confirmed = true; break; }
      }
      if (!confirmed) return;

      // Among that member's H.R.1 items, pick the strongest: a contradiction /
      // rhetoric-vs-reality item outranks a plain recorded vote. A candidate must
      // be either clearly the 2025 bill (context match) OR a flagged contradiction
      // that names H.R. 1 — so a member's "voted for it despite objecting" receipt
      // leads even though its text omits the roll-call boilerplate.
      var best = null;
      for (var i = 0; i < list.length; i++) {
        var it = list[i];
        if (!it) continue;
        var blob = String(it.headline || '') + ' ' + String(it.facts || '');
        if (!HR1_RE.test(blob)) continue;
        var contra = isContradiction(it);
        if (!CTX_RE.test(blob) && !contra) continue;
        var dir = voteDir(blob);
        var score = (contra ? 2 : 0) + (dir ? 1 : 0);
        if (!best || score > best._score) {
          best = {
            _score: score, id: id, dir: dir, contra: contra,
            headline: it.headline || '', facts: it.facts || '',
            source: (it.source && it.source.url) ? it.source : null
          };
        }
      }
      if (best && (best.dir || best.contra)) out.push(best);
    });

    // Put the visitor's OWN members of Congress first — a Utah voter sees their two
    // U.S. Senators and their district's House member ahead of the rest of Congress —
    // then fall back to the general ordering: contradictions first, then Yes, then No,
    // alpha within each for stability. Relevance is flagged on each receipt so the
    // card can mark it, and _pdxIsLocalToUser returns false when no location is set,
    // so with no location the grid keeps its original nationwide order.
    var isRel = function (id) {
      try { return !!(typeof window._pdxIsLocalToUser === 'function' && window._pdxIsLocalToUser(id)); }
      catch (e) { return false; }
    };
    out.forEach(function (r) { r.rel = isRel(r.id); });
    var rank = function (r) { return r.contra ? 0 : (r.dir === 'yes' ? 1 : 2); };
    out.sort(function (a, b) {
      if (a.rel !== b.rel) return a.rel ? -1 : 1;
      var ra = rank(a), rb = rank(b);
      if (ra !== rb) return ra - rb;
      return nameFor(a.id).localeCompare(nameFor(b.id));
    });
    return out;
  }

  /* ── card / block renderers ─────────────────────────────────────────────── */
  function statChip(n, l) {
    return '<div class="hr1-stat"><span class="hr1-stat-n">' + esc(n) + '</span>' +
      '<span class="hr1-stat-l">' + esc(l) + '</span></div>';
  }

  function omniCard(p) {
    var badge = p.dir === 'kept'
      ? '<span class="hr1-omni-tag is-keep">▲ Delivers a promise</span>'
      : p.dir === 'broken'
        ? '<span class="hr1-omni-tag is-cut">▼ Cuts against a promise</span>'
        : '<span class="hr1-omni-tag is-mix">◆ Depends on the member</span>';
    // Issue chips tie this provision to the exact issues it becomes a say-vs-do
    // verdict on in each member's Voting Record — same vocabulary, connected dots.
    var chips = (Array.isArray(p.keys) && p.keys.length)
      ? '<div class="hr1-omni-keys" style="display:flex;flex-wrap:wrap;gap:.3rem;margin:.1rem 0 .45rem;">' +
          p.keys.map(function (k) {
            return '<span style="font:600 .6rem/1.1 \'Barlow Condensed\',sans-serif;letter-spacing:.03em;color:#9fb4d4;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:.14rem .5rem;">#' + esc(OMNI_ISSUE_LABEL[k] || k) + '</span>';
          }).join('') +
        '</div>'
      : '';
    return '<div class="hr1-omni-card hr1-' + p.dir + '">' +
        '<div class="hr1-omni-top"><span class="hr1-omni-ico" aria-hidden="true">' + p.ico + '</span>' + badge + '</div>' +
        '<div class="hr1-omni-title">' + esc(p.title) + '</div>' +
        '<p class="hr1-omni-body">' + esc(p.body) + '</p>' +
        chips +
        '<p class="hr1-omni-keeps">' + esc(p.keeps) + '</p>' +
        (p.src ? '<a class="hr1-src" href="' + escAttr(p.src.url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">🔗 ' + esc(p.src.label) + '</a>' : '') +
      '</div>';
  }

  function timelineItem(t) {
    return '<li class="hr1-tl-item">' +
        '<span class="hr1-tl-dot" aria-hidden="true"></span>' +
        '<div class="hr1-tl-body">' +
          '<span class="hr1-tl-date">' + esc(t.date) + '</span>' +
          '<span class="hr1-tl-title">' + esc(t.title) + '</span>' +
          '<p class="hr1-tl-text">' + esc(t.body) + '</p>' +
          (t.src ? '<a class="hr1-src" href="' + escAttr(t.src.url) + '" target="_blank" rel="noopener">🔗 ' + esc(t.src.label) + '</a>' : '') +
        '</div>' +
      '</li>';
  }

  function receiptCard(r) {
    var name = nameFor(r.id);
    var photo = photoFor(r.id);
    var pc = partyChip(r.id);
    var av = photo
      ? '<img class="hr1-rc-photo" src="' + escAttr(photo) + '" alt="" loading="lazy" onerror="this.style.display=\'none\';this.parentNode.classList.add(\'is-fallback\');">'
      : '';
    var fallbackText = esc(initials(name));
    var voteBadge = r.contra
      ? '<span class="hr1-rc-badge is-contra">⚑ Contradiction</span>'
      : (r.dir === 'yes'
          ? '<span class="hr1-rc-badge is-yes">Voted YES</span>'
          : r.dir === 'no'
            ? '<span class="hr1-rc-badge is-no">Voted NO</span>'
            : '<span class="hr1-rc-badge">On record</span>');
    var idJs = escAttr(String(r.id).replace(/'/g, "\\'"));
    var repBadge = r.rel ? '<span class="hr1-rc-badge is-rep">📍 Your rep</span>' : '';
    return '<article class="hr1-rc' + (r.rel ? ' is-rep' : '') + '" role="button" tabindex="0" ' +
        'data-hr1-pid="' + escAttr(r.id) + '" ' +
        'data-vote="' + escAttr(r.dir || '') + '" data-contra="' + (r.contra ? '1' : '0') + '" ' +
        'data-rel="' + (r.rel ? '1' : '0') + '" ' +
        'onclick="window.PDXHR1&&window.PDXHR1.open(\'' + idJs + '\')" ' +
        'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();window.PDXHR1&&window.PDXHR1.open(\'' + idJs + '\');}" ' +
        'title="' + escAttr('See ' + name + '’s full record') + '">' +
        '<div class="hr1-rc-head">' +
          '<span class="hr1-rc-avatar' + (photo ? '' : ' is-fallback') + '" style="--tint:' + avatarTint(name) + ';">' + av + '<span class="hr1-rc-ini">' + fallbackText + '</span></span>' +
          '<span class="hr1-rc-id">' +
            '<span class="hr1-rc-name">' + esc(name) + (pc ? ' <span class="hr1-rc-party" style="color:' + pc.color + ';border-color:' + pc.color + '55;">' + esc(pc.label) + '</span>' : '') + '</span>' +
            repBadge +
            voteBadge +
          '</span>' +
        '</div>' +
        '<p class="hr1-rc-facts">' + esc(r.facts) + '</p>' +
        '<div class="hr1-rc-foot">' +
          (r.source ? '<a class="hr1-src" href="' + escAttr(r.source.url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">🔗 ' + esc(r.source.label || 'Source') + '</a>' : '') +
          recordShareHtml(r.id) +
        '</div>' +
      '</article>';
  }

  /* ── Official Record split-card share (receipt-cards.js) ───────────────────── */
  // H.R.1 is the app's clearest omnibus teaching case, so it is also where the
  // "one vote, two outcomes" split card belongs. The button is rendered hidden and
  // is revealed by PDXReceiptCards.hydrate() only for members whose H.R.1 vote
  // actually produces a card that clears every trust guard — this file never
  // decides eligibility, and never sees why a member was excluded.
  //   What gets shared is the member's OWN vote on H.R.1 against their OWN stated
  // position, not the curated receipt this card is drawn from. The two stay
  // distinct: 🏛️ steel control, 🧾 gold Say-vs-Do control, never the same button.
  var HR1_SHARE_NUMBER = 'H.R. 1';
  function recordShareHtml(pid) {
    try {
      var RC = window.PDXReceiptCards;
      if (!RC || typeof RC.buttonHtml !== 'function') return '';
      // stopKeys: the receipt card is itself an Enter/Space-activatable role=button,
      // so the share control keeps its own key events out of the card's handler.
      return RC.buttonHtml({ pid: pid, measure: HR1_SHARE_NUMBER, stopKeys: true });
    } catch (e) { return ''; }
  }
  function hydrateShares(host) {
    try {
      var RC = window.PDXReceiptCards;
      if (RC && typeof RC.hydrate === 'function') RC.hydrate(host);
    } catch (e) {}
  }

  /* ── live secondary examples: other multi-issue measures in the record ────── */
  // H.R.1 is the clearest teaching case, but it should not read as the only one. This
  // layer asks the Voting Record API for measures the ledger already marks as
  // multi-issue (isOmnibus = two or more curated issue mappings) and lists a few as
  // cross-links. It is strictly self-gating: one fetch, no retry loop, and the block
  // renders nothing at all if the call fails, the endpoint is absent, or the only
  // multi-issue measure in the data is H.R.1 itself. No verdicts are computed here.
  var MORE = { state: 'idle', items: [] };
  var HR1_NUM_RE = /^h\.?\s*r\.?\s*1$/i;

  // Short label for an issue key. OMNI_ISSUE_LABEL covers the curated H.R.1 story;
  // live measures can carry any key in the shipped vocabulary, so unknown keys are
  // prettified rather than shown raw (never invented — it's the key, made readable).
  function moreIssueLabel(k) {
    if (OMNI_ISSUE_LABEL[k]) return OMNI_ISSUE_LABEL[k];
    return String(k || '').replace(/_/g, ' ').replace(/^\w/, function (c) { return c.toUpperCase(); });
  }

  function loadMoreOmnibus() {
    if (MORE.state !== 'idle') return;
    MORE.state = 'loading';
    var done = function (items) {
      MORE.state = 'done';
      MORE.items = items || [];
      if (MORE.items.length) { try { mount(); } catch (e) {} }
    };
    try {
      fetch('/api/voting-record/measures?pageSize=100&sort=recent', { headers: { accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          var items = (d && Array.isArray(d.items)) ? d.items : [];
          done(items.filter(function (m) {
            // Multi-issue, actually voted on, and not the showcase's own subject.
            return m && m.isOmnibus && (m.voteCount > 0) &&
              !(String(m.chamber || '') === 'house' && HR1_NUM_RE.test(String(m.number || '')));
          }).slice(0, 4));
        })
        .catch(function () { done([]); });
    } catch (e) { done([]); }
  }

  // ONE PANEL, EVERY ENTRANCE. bill-detail.js resolves a printed number plus its
  // sitting, so that pair is all a door needs — no id lookup here, and no second
  // idea of what identifies a bill. The sitting matters: a bill number repeats every
  // congress and every state session, and a door that drops it is a door that can
  // land on the wrong measure.
  function billDoorHtml(number, sitting, label) {
    if (!number) return '';
    return '<button type="button" class="hr1-billdoor" data-hr1-bill="' + escAttr(number) + '"' +
      ' data-hr1-sit="' + escAttr(sitting || '') + '">📜 ' + esc(label) + '</button>';
  }
  function sittingOf(m) {
    var x = m && m.externalIds;
    var us = (x && typeof x === 'object' && x.utahSession) ? String(x.utahSession).trim() : '';
    if (us) return us;
    return (m && m.congress != null && m.congress !== '') ? String(m.congress) : '';
  }

  function moreOmnibusBlock() {
    if (!MORE.items.length) return '';
    var cards = MORE.items.map(function (m) {
      var keys = Array.isArray(m.issueKeys) ? m.issueKeys : [];
      var tags = keys.map(function (k) {
        return '<span class="hr1-more-tag">#' + esc(moreIssueLabel(k)) + '</span>';
      }).join('');
      var counts = [];
      if (m.rollcallCount) counts.push(m.rollcallCount + ' roll call' + (m.rollcallCount === 1 ? '' : 's'));
      if (m.voteCount) counts.push(m.voteCount + ' recorded votes');
      var src = (m.source && m.source.url)
        ? '<a class="hr1-src" href="' + escAttr(m.source.url) + '" target="_blank" rel="noopener">🔗 ' +
          esc(m.source.label || 'Source') + '</a>' : '';
      return '<div class="hr1-more-card">' +
          '<div class="hr1-more-num">' + LNUM(m.number || '') +
            '<span class="hr1-more-count">' + esc(keys.length + ' issues') + '</span></div>' +
          '<div class="hr1-more-title">' + esc(m.shortTitle || m.title || '') + '</div>' +
          (tags ? '<div class="hr1-more-tags">' + tags + '</div>' : '') +
          (counts.length ? '<div class="hr1-more-meta">' + esc(counts.join(' · ')) + '</div>' : '') +
          src +
          billDoorHtml(m.number || '', sittingOf(m), 'Open this bill’s profile') +
        '</div>';
    }).join('');
    return '<div class="hr1-block">' +
        '<div class="hr1-block-h"><span class="hr1-kicker">🧩 Not a one-off</span>' +
          '<h3>Other multi-issue measures in the record</h3>' +
          '<p>H.R.1 is the clearest example, not the only one. These measures in the live voting record also carry two or more issues, so a member’s single vote on each is scored separately per issue — the same way.</p>' +
        '</div>' +
        '<div class="hr1-more-grid">' + cards + '</div>' +
        '<p class="hr1-note">Straight from the voting-record ledger — each measure links to its official source. Open any member’s profile to see how their own vote landed on each issue.</p>' +
      '</div>';
  }

  /* ── mount ──────────────────────────────────────────────────────────────── */
  function mount() {
    var host = document.getElementById(HOST_ID);
    if (!host) return;
    loadMoreOmnibus(); // one-shot; re-mounts itself only if it finds anything

    var receipts = collectReceipts();
    var contradictions = receipts.filter(function (r) { return r.contra; });
    var yesN = receipts.filter(function (r) { return !r.contra && r.dir === 'yes'; }).length;
    var noN = receipts.filter(function (r) { return !r.contra && r.dir === 'no'; }).length;
    var relN = receipts.filter(function (r) { return r.rel; }).length;

    // Receipts block only renders when we actually have sourced votes; the story
    // above it always stands, so the section is never empty.
    var receiptsBlock = '';
    if (receipts.length) {
      // When the visitor's area is known, default the grid to THEIR members of
      // Congress ("Your reps"), with "All" one tap away — so the section opens
      // geared to them instead of on the full nationwide roster.
      var defFilter = relN > 0 ? 'rep' : 'all';
      var tabBtn = function (f, label) {
        var on = f === defFilter;
        return '<button type="button" class="hr1-tab' + (on ? ' is-active' : '') + (f === 'rep' ? ' is-rep' : '') +
          '" data-hr1-filter="' + f + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + label + '</button>';
      };
      var tabs = '<div class="hr1-tabs" role="group" aria-label="Filter receipts">' +
        (relN ? tabBtn('rep', '📍 Your reps · ' + relN) : '') +
        tabBtn('all', 'All · ' + receipts.length) +
        (contradictions.length ? tabBtn('contra', '⚑ Contradictions · ' + contradictions.length) : '') +
        (yesN ? tabBtn('yes', 'Voted YES · ' + yesN) : '') +
        (noN ? tabBtn('no', 'Voted NO · ' + noN) : '') +
      '</div>';
      var lead = relN
        ? 'Your own members of Congress are shown first — tap <strong>All</strong> to see every recorded vote. Each card is a member’s own action on H.R.1, linked to its source.'
        : 'Every card is a member’s own recorded action on H.R.1, with a link to its original source. Tap any card for the full profile.';
      receiptsBlock =
        '<div class="hr1-block">' +
          '<div class="hr1-block-h"><span class="hr1-kicker">🧾 The receipts</span>' +
            '<h3>How they actually voted — straight from the record</h3>' +
            '<p>' + lead + '</p>' +
          '</div>' +
          tabs +
          '<div class="hr1-receipts" data-hr1-default="' + defFilter + '">' + receipts.map(receiptCard).join('') + '</div>' +
          '<p class="hr1-note">Nonpartisan by design — a vote is a fact. We show the count and the source, and let the record speak.</p>' +
        '</div>';
    }

    host.hidden = false;
    host.innerHTML =
      '<div class="hr1-inner">' +
        // ── Hero ──
        '<div class="hr1-hero">' +
          '<div class="hr1-eyebrow">🏛️ The Showcase · H.R.1</div>' +
          '<h2 class="hr1-title">One Bill. One Vote.<br><em>Many Contradictions.</em></h2>' +
          '<p class="hr1-lead">' + LT('hr', 'H.R.') + '1 — the 2025 ' + LT('reconciliation', 'reconciliation') +
            ' and tax law, the “One Big Beautiful Bill” — bundled tax cuts, Medicaid cuts, food-aid changes, ' +
            'border money and trillions in deficit into a <strong>single yes-or-no vote</strong>. ' +
            'No headline can capture that. PolitiDex can: it scores <strong>every issue a bill touches separately</strong>, ' +
            'so one vote can keep a promise and break another — and you can see exactly whose.</p>' +
          // The showcase exists to teach this one mechanism, so it gets the
          // step-by-step sheet right under the lead.
          (LHOWTO('omnibus', 'How one vote becomes several verdicts')
            ? '<div class="hr1-howto-row">' + LHOWTO('omnibus', 'How one vote becomes several verdicts') + '</div>'
            : '') +
          '<div class="hr1-stats">' +
            statChip('218–214', 'Final House vote') +
            statChip('Roll Call 190', 'Jul 3, 2025') +
            statChip('≈ $3.8T', 'Added to deficits (CBO)') +
            statChip('Signed', 'Into law Jul 4') +
          '</div>' +
        '</div>' +

        // ── Omnibus breakdown ──
        '<div class="hr1-block">' +
          '<div class="hr1-block-h"><span class="hr1-kicker">📦 The omnibus</span>' +
            '<h3>What’s actually inside the one vote</h3>' +
            '<p>Six different promises, decided together. That’s why a single “yea” lands as consistent on one issue and a contradiction on the next.</p>' +
          '</div>' +
          '<div class="hr1-omni-grid">' + OMNIBUS.map(omniCard).join('') + '</div>' +
          // ── The bill's own face ─────────────────────────────────────────
          // This block teaches what is inside the vote with six curated cards.
          // The measure's own profile is the archive's answer to the same
          // question — every topic H.R.1 was actually mapped to, whether each
          // was the bill's subject or rode inside it, and the whole roll list —
          // so the showcase hands the reader over to it rather than being the
          // end of the road. Same panel the library and the person files open;
          // there is one bill face, not one per entrance.
          billDoorHtml('H.R. 1', '119',
            'Open the H.R.1 bill profile — every topic it was mapped to, and everyone who voted') +
          '<p class="hr1-omni-foot" style="margin-top:.7rem;font-size:.82rem;color:#9fb4d4;line-height:1.5;">' +
            'Each #tag above is a real issue in the Voting Record. In a member’s profile, their one Yea or Nay on H.R.1 becomes a <strong style="color:#cbd9ec;">separate say-vs-do verdict on every one of these issues</strong> — matching their stated stance on some, contradicting it on others.' +
          '</p>' +
          compositionCaveatHtml() +
        '</div>' +

        // ── Contradiction engine diagram ──
        '<div class="hr1-block hr1-engine">' +
          '<div class="hr1-block-h"><span class="hr1-kicker">⚙️ The contradiction engine</span>' +
            '<h3>Why one vote can be two verdicts</h3>' +
            '<p>PolitiDex splits an omnibus vote across the issues it touches and checks each against what the member said. Same vote, opposite verdicts:</p>' +
          '</div>' +
          '<div class="hr1-diagram">' +
            '<div class="hr1-diagram-vote">🗳️<span>A single<br><strong>“YEA” on H.R.1</strong></span></div>' +
            '<div class="hr1-diagram-split" aria-hidden="true"></div>' +
            '<div class="hr1-diagram-out">' +
              '<div class="hr1-out is-kept">' +
                '<span class="hr1-out-v">✓ KEEPS</span>' +
                '<span class="hr1-out-t">Said “I’ll cut taxes”</span>' +
                '<span class="hr1-out-d">The tax-cut extension delivers it.</span>' +
              '</div>' +
              '<div class="hr1-out is-broken">' +
                '<span class="hr1-out-v">✗ BREAKS</span>' +
                '<span class="hr1-out-t">Said “I’ll protect Medicaid”</span>' +
                '<span class="hr1-out-d">The same vote cut Medicaid funding.</span>' +
              '</div>' +
              '<div class="hr1-out is-kept">' +
                '<span class="hr1-out-v">✓ KEEPS</span>' +
                '<span class="hr1-out-t">Said “I’ll secure the border”</span>' +
                '<span class="hr1-out-d">The same vote funded enforcement.</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<p class="hr1-note">One roll call, <strong style="color:#cbd9ec;">' + OMNIBUS.length + ' issues scored separately</strong> — three of them shown here. Nothing is counted twice: the vote is judged once per issue it actually touched. This is the engine behind every “Say vs. Do” receipt, applied to the biggest vote of the cycle.</p>' +
        '</div>' +

        // ── Other multi-issue measures (live; renders only when data exists) ──
        moreOmnibusBlock() +

        // ── Timeline ──
        '<div class="hr1-block">' +
          '<div class="hr1-block-h"><span class="hr1-kicker">🗓️ How it happened</span>' +
            '<h3>From floor vote to law in six weeks</h3>' +
          '</div>' +
          '<ol class="hr1-timeline">' + TIMELINE.map(timelineItem).join('') + '</ol>' +
        '</div>' +

        // ── Receipts ──
        receiptsBlock +

        // ── Foot ──
        '<div class="hr1-foot">' +
          '<a class="hr1-foot-btn is-primary" href="#say-vs-do">🧾 See more Say-vs-Do receipts</a>' +
          '<a class="hr1-foot-btn" href="#my-politicians">⭐ Build your voting team</a>' +
          '<button type="button" class="hr1-foot-btn" onclick="if(window.PDXConsistency&amp;&amp;window.PDXConsistency.openMethodology)window.PDXConsistency.openMethodology()">🧩 How multi-issue votes are scored</button>' +
        '</div>' +
      '</div>';

    bindFilters(host);
    bindBillDoors(host);
    hydrateShares(host);
  }

  // Delegated filter tabs (bound once per host innerHTML rebuild).
  // Bound apart from bindFilters, which returns early when the showcase has no
  // receipts grid to filter — the bill doors are on the page either way.
  function bindBillDoors(host) {
    if (!host || !host.addEventListener) return;
    host.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-hr1-bill]') : null;
      if (!b) return;
      e.preventDefault();
      var num = b.getAttribute('data-hr1-bill') || '';
      var sit = b.getAttribute('data-hr1-sit') || '';
      try {
        var B = window.PDXBillDetail;
        if (B && typeof B.open === 'function') { B.open(num, sit); return; }
        var L = window.PDXBills;
        if (L && typeof L.open === 'function') L.open(num);
      } catch (err) {}
    });
  }

  function bindFilters(host) {
    var tabs = host.querySelector('.hr1-tabs');
    var grid = host.querySelector('.hr1-receipts');
    if (!tabs || !grid) return;
    function applyFilter(f) {
      grid.querySelectorAll('.hr1-rc').forEach(function (card) {
        var show = f === 'all'
          || (f === 'rep' && card.getAttribute('data-rel') === '1')
          || (f === 'contra' && card.getAttribute('data-contra') === '1')
          || (f === 'yes' && card.getAttribute('data-contra') !== '1' && card.getAttribute('data-vote') === 'yes')
          || (f === 'no' && card.getAttribute('data-contra') !== '1' && card.getAttribute('data-vote') === 'no');
        card.classList.toggle('hr1-hide', !show);
      });
    }
    tabs.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.hr1-tab') : null;
      if (!btn) return;
      var f = btn.getAttribute('data-hr1-filter');
      tabs.querySelectorAll('.hr1-tab').forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      applyFilter(f);
    });
    // Apply the initially-active filter — defaults to the visitor's own reps when a
    // location is set — so the grid opens geared to them, with All one tap away.
    applyFilter(grid.getAttribute('data-hr1-default') || 'all');
  }

  function open(id) {
    if (!id) return;
    try { if (typeof window.showProfile === 'function') { window.showProfile(id); return; } } catch (e) {}
    try {
      var a = alias(id);
      if (a !== id && typeof window.showProfile === 'function') window.showProfile(a);
    } catch (e) {}
  }

  function refresh() { try { mount(); } catch (e) {} }

  window.PDXHR1 = { mount: mount, refresh: refresh, open: open, collect: collectReceipts };

  // Initial mount, then a few delayed refreshes so member names/photos fill in
  // once the live roster (PROFILES / ACCT_SPOTLIGHT) resolves. Cheap + idempotent.
  function boot() {
    try { mount(); } catch (e) {}
    var tries = 0, prev = -1;
    var t = setInterval(function () {
      tries++;
      var n = 0;
      try { n = collectReceipts().length; } catch (e) {}
      if (n !== prev) { prev = n; try { mount(); } catch (e) {} }
      if (tries >= 8) clearInterval(t);
    }, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Run 3 perf: ACCT_SPOTLIGHT now loads on demand (pdx-lazy-data.js). Re-mount the
  // live H.R.1 receipts once it arrives, covering a load after the poll window.
  document.addEventListener('pdx:data:acctSpotlight', function () { try { mount(); } catch (e) {} });
})();
