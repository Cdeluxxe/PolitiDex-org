/* ═════════════════════════════════════════════════════════════════════════════
   spotlight-engine.js — window.PDXSpotlight · THE /issue/<slug> SURFACE
   ────────────────────────────────────────────────────────────────────────────
   WHERE THIS CAME FROM. This is index.html's inline Issue Spotlight engine,
   lifted out whole when /issue/<slug> became its own document. It was ~1,200
   lines of inline <script> plus ~394 CSS rules on the homepage, and it existed
   to paint an address the homepage does not serve: every visitor to / parsed the
   renderer for pages they had not opened, and the 1.2 MB corpus it reads was one
   IntersectionObserver away from being fetched there too.

   WHAT IT STILL IS. The same renderer, reading the same registry, painting the
   same surface. A Spotlight is a LENS over data the app already has: authored
   summary and timeline, and people/evidence rows that carry their own name,
   office and icon in spotlights-data.js — which is precisely why this document
   can serve a Spotlight without the 593 KB roster.

   WHAT CHANGED, AND NOWHERE ELSE. Six seams, each marked "SHELL SEAM n" in the
   body below, all of them about ADDRESSES rather than about content:

     1/2 · close() is a navigation. There is no app underneath this surface, so
           closing means leaving: history.back() when the reader genuinely came
           from a same-origin page that is not another Spotlight, else "/".
       3 · a person link goes to /p/<pid> through person-link.js, instead of
           calling showProfile() on a modal that does not exist here.
       4 · the Stance Library chips/CTA and
       5 · the Community Exchange button hop to their front-page sections,
           because those are page sections, not modules on this document.
         6 · the boot is one pass. Nothing to wait for: the corpus is a
           parser-blocking script above this file, and a slug that is NOT in the
           registry is answered by a single location.replace() to /i/<key> —
           the SAME key at the Issue File's address, ?pid= carried through —
           rather than by issue-page.js, which is not here and must not be.
       7 · showOverlay() fires one pdx:spotlight:open event, so the document
           that built the mount can retire its own waiting line.

   window._pdxRelatedSpotlight (the profile-modal rail) is cut, not carried dead.

   WHAT IT DOES NOT TOUCH. No score, no mapping, no floor, no Voice, no
   like/dislike, no ResizeObserver, no dossier. Every cross-module read is a
   typeof/&& lookup, so this file paints a complete Spotlight on a document that
   carries nothing but the corpus, person-link.js and the stance vocabulary —
   and quietly paints one block fewer when a richer document loads it.
   ════════════════════════════════════════════════════════════════════════════ */

// ── Issue Spotlight engine ──────────────────────────────────────────────────
(function () {
  'use strict';
  var esc = (typeof window._esc === 'function') ? window._esc : function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  // The registry. Each Spotlight is a LENS over existing data, not a copy of it:
  // people + evidence reference (politician id, stance topic) pairs that are
  // resolved against the live ISSUE_STANCE_DATA at render time, so the displayed
  // position text and source links stay in lock-step with the underlying record.
  // The summary and timeline are the only authored prose, and every timeline row
  // is sourced. Strength / impact are honest editorial classifications: a recorded
  // vote or legal ruling reads Strong, a public statement Moderate, a campaign
  // pledge Limited, and an absent position "No record yet".
  var SPOTLIGHTS = window.SPOTLIGHTS || {}; window.SPOTLIGHTS = SPOTLIGHTS;;
  window.PDX_ISSUE_SPOTLIGHTS = SPOTLIGHTS;

  // ── Data access helpers (read-only over existing structures) ──────────────
  function recFor(id) {
    return (window.PROFILES && window.PROFILES[id]) ||
           (typeof CMP_DATA !== 'undefined' && CMP_DATA[id]) || null;
  }
  function stanceList(id) {
    if (typeof window._resolveStanceList === 'function') {
      try { var l = window._resolveStanceList(id, recFor(id)); if (l) return l; } catch (e) {}
    }
    return (window.ISSUE_STANCE_DATA && window.ISSUE_STANCE_DATA[id]) || null;
  }
  // Find a specific stance by its topic; fall back to the first stance tagged to
  // the spotlight's issue keys if the named topic isn't found.
  function findStance(id, topic, issueKeys) {
    var list = stanceList(id);
    if (!Array.isArray(list)) return null;
    var i;
    if (topic) {
      for (i = 0; i < list.length; i++) {
        if (list[i] && list[i].topic === topic) return list[i];
      }
    }
    if (issueKeys && issueKeys.length) {
      for (i = 0; i < list.length; i++) {
        if (list[i] && issueKeys.indexOf(list[i].issueKey) !== -1) return list[i];
      }
    }
    return null;
  }
  function nameFor(p) { var r = recFor(p.id); return (r && r.name) || p.name || p.id; }
  function officeFor(p) {
    var r = recFor(p.id);
    if (r && r.office) { return r.office + (r.state ? ' · ' + r.state : ''); }
    return p.office || '';
  }
  function iconFor(p) { var r = recFor(p.id); return (r && r.icon) || p.icon || '👤'; }

  var ST_LABEL = { strong: 'Strong', moderate: 'Moderate', limited: 'Limited', none: 'No record yet' };
  var ST_DOTS = { strong: '●●●', moderate: '●●○', limited: '●○○', none: '○○○' };
  function strengthBadge(level) {
    var lv = ST_LABEL[level] ? level : 'none';
    return '<span class="pdxis-badge pdxis-st-' + lv + '">' +
      '<span class="pdxis-dots">' + ST_DOTS[lv] + '</span>' + esc(ST_LABEL[lv]) + '</span>';
  }

  // ── Stance indicator ──────────────────────────────────────────────────────
  // Answers the reader's first question — did this person SUPPORT, OPPOSE, take a
  // MIXED/nuanced position, or have NO CLEAR POSITION on the issue — separately from
  // (and more prominently than) how well-sourced that position is. The value is
  // derived from the person's actual stance record: every record in ISSUE_STANCE_DATA
  // already carries an honest `issueStance`/`pos` of support | oppose | mixed (a
  // yes-vote/defense reads support, a no-vote/opposition reads oppose, a conditional
  // or complicated position reads mixed). When no record resolves for the issue — i.e.
  // almost no sourced information — it falls back to "No Clear Position". A Spotlight
  // may also pin an explicit `stance` on a person to override the derivation.
  // The stance language (STANCE map, STANCE_FROM_POS, resolveStance, stancePill)
  // now lives in the shared window.PDXStance helper defined just above this
  // module, so there is a single source of truth for every surface. These thin
  // wrappers preserve the existing call sites and the exact Who Stands Where
  // behavior by delegating to it: the person's pinned `stance` (if any) is the
  // explicit override, and the resolved stance record supplies the rest.
  function resolveStance(p, st) {
    return window.PDXStance.resolveStance(st, p && p.stance);
  }
  function stancePill(key) {
    return window.PDXStance.stancePill(key);
  }
  function srcLink(src) {
    if (!src || !src.url) return '';
    return '<a class="pdxis-src" href="' + esc(src.url) + '" target="_blank" rel="noopener noreferrer">' +
      esc(src.label || 'Source') + '</a>';
  }

  // ── Documentation-strength signal ─────────────────────────────────────────
  // A lightweight, honest read of how well-sourced a Spotlight is, computed
  // straight from the static registry (no live-stance resolution needed, so it
  // is cheap enough to run during the home-page discovery render). It counts the
  // sourced timeline rows and the evidence receipts the editor selected, plus how
  // many of those receipts are graded Strong (a recorded vote, ruling or record).
  // The vocabulary matches the Evidence Locker: Strong / Moderate / Limited.
  function spotlightStrength(sp) {
    if (!sp) return { receipts: 0, strong: 0, sources: 0, level: 'limited', label: 'Emerging' };
    var sources = (sp.timeline || []).filter(function (t) { return t && t.src && t.src.url; }).length;
    var receipts = 0, strong = 0;
    (sp.evidence || []).forEach(function (grp) {
      (grp.items || []).forEach(function (it) {
        receipts++;
        if ((it.strength || '') === 'strong') strong++;
      });
    });
    var level, label;
    if (strong >= 3 && sources >= 4) { level = 'strong'; label = 'Strongly documented'; }
    else if (receipts + sources >= 5) { level = 'strong'; label = 'Well documented'; }
    else if (receipts + sources >= 2) { level = 'moderate'; label = 'Documented'; }
    else { level = 'limited'; label = 'Emerging'; }
    return { receipts: receipts, strong: strong, sources: sources, level: level, label: label };
  }

  // ── Renderers ─────────────────────────────────────────────────────────────
  function renderSummary(sp) {
    return '<div class="pdxis-summary">' +
      '<p>' + esc(sp.summary) + '</p>' +
      '<p class="pdxis-why"><b>' + esc(sp.controversyLabel || 'Why it’s contested:') + '</b> ' + esc(sp.controversy) + '</p>' +
      '</div>';
  }
  function renderTimeline(sp) {
    if (!sp.timeline || !sp.timeline.length) return '';
    var rows = sp.timeline.map(function (t) {
      return '<li><div class="pdxis-tl-date">' + esc(t.date) + '</div>' +
        '<div class="pdxis-tl-text">' + esc(t.text) + '</div>' +
        srcLink(t.src) + '</li>';
    }).join('');
    return section('Timeline', 'How it unfolded', '<ul class="pdxis-tl">' + rows + '</ul>');
  }
  function renderPerson(sp, p) {
    var st = findStance(p.id, p.topic, sp.communityIssueKeys);
    var pos = st && st.text
      ? esc(st.text)
      : '<span class="pdxis-note">No public position on record for this issue yet.</span>';
    var level = st ? (p.strength || 'moderate') : 'none';
    var stance = resolveStance(p, st);
    // Secondary meta: evidence strength + editorial impact + pledge flag.
    var meta = strengthBadge(level);
    if (p.impact) meta += '<span class="pdxis-badge pdxis-impact">' + esc(p.impact) + '</span>';
    if (p.pledge) meta += '<span class="pdxis-badge pdxis-pledge" title="A campaign pledge, not yet a governing record">Pledge</span>';
    var src = st && st.source ? srcLink(st.source) : '';
    return '<button type="button" class="pdxis-person" data-pid="' + esc(p.id) + '" ' +
        'aria-label="Open the full record on the issues for ' + esc(nameFor(p)) + '">' +
      '<div class="pdxis-p-top">' +
        '<div class="pdxis-p-ico">' + esc(iconFor(p)) + '</div>' +
        '<div class="pdxis-p-id">' +
          '<div class="pdxis-p-name">' + esc(nameFor(p)) + '</div>' +
          '<div class="pdxis-p-office">' + esc(officeFor(p)) + '</div>' +
        '</div>' +
        stancePill(stance) +
      '</div>' +
      '<div class="pdxis-p-meta">' +
        '<span class="pdxis-meta-k">Evidence</span>' + meta +
      '</div>' +
      '<div class="pdxis-p-pos">' + pos + '</div>' +
      '<div class="pdxis-p-foot">' +
        (src || '<span></span>') +
        '<span class="pdxis-p-cta">Record on the issues →</span>' +
      '</div>' +
    '</button>';
  }
  function renderBoard(sp) {
    if (!sp.groups || !sp.groups.length) return '';
    var html = sp.groups.map(function (g) {
      return '<div class="pdxis-group">' +
        '<div class="pdxis-group-h">' + esc(g.label) + '</div>' +
        (g.note ? '<div class="pdxis-group-note">' + esc(g.note) + '</div>' : '') +
        g.people.map(function (p) { return renderPerson(sp, p); }).join('') +
      '</div>';
    }).join('');
    return section('Who Stands Where', 'Each person’s stance at a glance — tap a name for their full record', html);
  }
  function renderEvidence(sp) {
    if (!sp.evidence || !sp.evidence.length) return '';
    var groups = sp.evidence.map(function (grp) {
      var cards = grp.items.map(function (it) {
        var st = findStance(it.id, it.topic, sp.communityIssueKeys);
        if (!st) return '';
        return '<div class="pdxis-ev-card">' +
          '<div class="pdxis-ev-top">' +
            '<button type="button" class="pdxis-ev-who" data-pid="' + esc(it.id) + '">' +
              esc(nameFor({ id: it.id })) + (st.topic ? ' · ' + esc(st.topic) : '') + '</button>' +
            strengthBadge(it.strength || 'moderate') +
          '</div>' +
          '<div class="pdxis-ev-text">' + esc(st.text || '') + '</div>' +
          (st.source ? '<div>' + srcLink(st.source) + '</div>' : '') +
        '</div>';
      }).join('');
      if (!cards) return '';
      return '<div class="pdxis-ev-group">' +
        '<div class="pdxis-group-h">' + esc(grp.label) + '</div>' + cards + '</div>';
    }).join('');
    return section('Strongest Evidence', 'Receipts from the Evidence Locker', groups +
      '<p class="pdxis-note">A focused selection — not every receipt. Each links to its original source so you can check it yourself.</p>');
  }
  function renderCommunity(sp) {
    var inner = '<div class="pdxis-comm" id="pdxis-comm">' +
      '<div class="pdxis-comm-body">' +
        '<div class="pdxis-comm-h">Community Discussion</div>' +
        '<div class="pdxis-comm-sub">See what neighbors are surfacing about this project — sources, questions and receipts the Locker may have missed.</div>' +
      '</div>' +
      '<button type="button" class="pdxis-comm-btn" id="pdxis-comm-btn">🧭 Open the Exchange' +
        '<span class="pdxis-comm-count" id="pdxis-comm-count" hidden></span></button>' +
    '</div>';
    return section('Join the conversation', '', inner);
  }
  // ── Say vs. Do — two sourced axes of the SAME law that pull against each other.
  // Pure lens over ISSUE_STANCE_DATA (no network): each row resolves two stance
  // topics for one person so the contradiction is shown straight from the record.
  function renderSayVsDo(sp) {
    if (!sp.sayVsDo || !sp.sayVsDo.length) return '';
    var col = function (person, ref) {
      var st = findStance(person, ref.topic, sp.communityIssueKeys);
      if (!st) return '';
      return '<div class="pdxis-svd-col">' +
        '<span class="pdxis-svd-k">' + esc(ref.label || 'On the record') + '</span>' +
        stancePill(resolveStance({ id: person }, st)) +
        '<div class="pdxis-svd-txt">' + esc(st.text || '') + '</div>' +
        (st.source ? srcLink(st.source) : '') +
      '</div>';
    };
    var rows = sp.sayVsDo.map(function (r) {
      var a = col(r.person, r.say), b = col(r.person, r.doIt);
      if (!a || !b) return '';
      return '<div class="pdxis-svd">' +
        '<button type="button" class="pdxis-svd-who" data-pid="' + esc(r.person) + '" ' +
          'aria-label="Open the full record for ' + esc(nameFor({ id: r.person })) + '">' +
          esc(nameFor({ id: r.person })) + '</button>' +
        '<div class="pdxis-svd-cols">' + a + '<div class="pdxis-svd-vs">vs</div>' + b + '</div>' +
        (r.note ? '<div class="pdxis-svd-note">' + esc(r.note) + '</div>' : '') +
      '</div>';
    }).join('');
    if (!rows) return '';
    return section('Say vs. Do', 'The same law, the same person — two sourced axes in tension', rows);
  }
  // ── Recorded roll-call votes, hydrated live from the voting-record database.
  // Renders an empty, identified section synchronously; hydrateVotingRecord fills
  // it after fetching. Additive + defensive: if the API/data are unavailable or no
  // roll call is ingested yet, the whole section removes itself (see hydrate).
  function renderVotingRecord(sp) {
    var vr = sp.votingRecord;
    if (!vr) return '';
    return '<div class="pdxis-sec" id="pdxis-vr-sec">' +
      '<div class="pdxis-sec-h"><h2>' + esc(vr.heading || 'Recorded votes') + '</h2>' +
        (vr.kicker ? '<span class="pdxis-kicker">' + esc(vr.kicker) + '</span>' : '') + '</div>' +
      '<div class="pdxis-vr" id="pdxis-vr"><div class="pdxis-vr-load">Loading recorded votes…</div></div>' +
      (vr.note ? '<p class="pdxis-note">' + esc(vr.note) + '</p>' : '') +
    '</div>';
  }
  // Canonical bill-number compare so "H.R. 1", "HR 1", "h.r.1" all match.
  function canonNum(n) { return String(n == null ? '' : n).toLowerCase().replace(/[.\s]/g, ''); }
  var VR_VERDICT = {
    consistent: { cls: 'consistent', label: 'Backs their stance' },
    contradicts: { cls: 'contradicts', label: 'Against their stance' },
    mixed: { cls: 'mixed', label: 'Mixed record' }
  };
  function hydrateVotingRecord(sp) {
    var vr = sp.votingRecord;
    var sec = document.getElementById('pdxis-vr-sec');
    var host = document.getElementById('pdxis-vr');
    if (!vr || !host) return;
    var hide = function () { if (sec && sec.parentNode) sec.parentNode.removeChild(sec); };
    var api = window.PDXVotingRecord;
    if (!api || typeof api.fetchCompare !== 'function') { hide(); return; }
    api.fetchCompare(vr.members || []).then(function () {
      if (_open !== sp.slug) return;                 // navigated away while fetching
      var want = canonNum(vr.measureNumber);
      var rows = [];
      (vr.members || []).forEach(function (pid) {
        var recs = (typeof api.memberRecords === 'function') ? api.memberRecords(pid) : null;
        if (!recs) return;
        // The passage roll call for this bill (a recorded vote, not a position row).
        var it = recs.filter(function (r) {
          return r && r.kind === 'vote' && canonNum(r.number) === want;
        }).sort(function (a, b) {
          var ap = a.actionType === 'passage' ? 0 : 1, bp = b.actionType === 'passage' ? 0 : 1;
          return ap - bp;
        })[0];
        if (!it) return;
        var posCls = it.position === 'yea' ? 'yea' : it.position === 'nay' ? 'nay' : 'neutral';
        var posTxt = it.position === 'yea' ? 'Voted Yea' : it.position === 'nay' ? 'Voted Nay' : (it.position || '—');
        // No party-agreement chip rides next to the vote. The item still carries
        // isParty from the API — it is ingest provenance, computed against the
        // full chamber tally — but "Crossed party" is a claim about a caucus, not
        // about whether this person did what they said. The verdict chip below is
        // the accountability signal here, and it is measured against their stance.
        // Official Record verdict — votes/formal actions only (this is the voting
        // record section). Say-vs-Do (public record) is surfaced separately.
        var verdict = '';
        try {
          if (window.PDXConsistency && typeof window.PDXConsistency.officialRecord === 'function') {
            verdict = window.PDXConsistency.chipHtml(window.PDXConsistency.officialRecord(pid, vr.issueKey), null, { frame: false, hideEmpty: true });
          } else if (typeof window._pdxRecordIssueSummary === 'function') {
            var sum = window._pdxRecordIssueSummary(pid, vr.issueKey);
            var v = sum && VR_VERDICT[sum.netVerdict];
            if (v) verdict = '<span class="pdxis-vr-verdict pdxis-vr-v-' + v.cls + '">' + v.label + '</span>';
          }
        } catch (e) {}
        var src = (it.source && it.source.url)
          ? '<a class="pdxis-vr-src" href="' + esc(it.source.url) + '" target="_blank" rel="noopener noreferrer">' +
              esc(it.source.label || 'Source') + ' ↗</a>'
          : '';
        rows.push('<div class="pdxis-vrow">' +
          '<button type="button" class="pdxis-vrow-name" data-pid="' + esc(pid) + '">' + esc(nameFor({ id: pid })) + '</button>' +
          '<span class="pdxis-vr-pill pdxis-vr-' + posCls + '">' + esc(posTxt) + '</span>' +
          verdict + src +
        '</div>');
      });
      if (!rows.length) { hide(); return; }          // nothing ingested yet → stay out of the way
      host.innerHTML = rows.join('');
      host.querySelectorAll('[data-pid]').forEach(function (el) {
        el.addEventListener('click', function () { toProfile(el.getAttribute('data-pid')); });
      });
    }).catch(function () { hide(); });
  }
  function section(title, kicker, body) {
    return '<div class="pdxis-sec">' +
      '<div class="pdxis-sec-h"><h2>' + esc(title) + '</h2>' +
        (kicker ? '<span class="pdxis-kicker">' + esc(kicker) + '</span>' : '') + '</div>' +
      body + '</div>';
  }

  // ── Policy-explainer renderers (all optional; emit nothing when the field is
  // absent, so the existing politician-centric Spotlights are untouched). ──────
  function chip(tag) {
    if (tag !== 'verified' && tag !== 'developing') return '';
    var label = tag === 'verified' ? 'Verified' : 'Developing';
    return '<span class="pdxis-chip pdxis-chip-' + tag + '">' + label + '</span>';
  }
  function renderStatus(sp) {
    if (!sp.status) return '';
    var text = typeof sp.status === 'string' ? sp.status : (sp.status.text || '');
    if (!text) return '';
    return '<div class="pdxis-status"><span class="pdxis-status-dot" aria-hidden="true"></span>' +
      '<span><b>Status:</b> ' + esc(text) + '</span></div>';
  }
  // Top Contractors visual — a compact horizontal-bar leaderboard of the
  // largest tracked federal contractors by dollar volume. Data-driven from the
  // Federal Spending Tracker (gov-contracts.js) and gated to the contracting
  // Spotlight, so it appears nowhere else and shows nothing if that module or
  // its data is unavailable. Each bar deep-links into the tracker filtered to
  // that company; the footer opens the full tracker. Neutral by construction —
  // it reports where federal dollars go, not who caused or benefited from them.
  function renderContractsTopN(sp) {
    if (!sp || sp.slug !== 'government-contracting-influence-waste') return '';
    var C = window.PDXContracts;
    if (!C || typeof C.topRecipients !== 'function') return '';
    var top = C.topRecipients(5);
    if (!top || !top.length) return '';
    var max = top[0].amount || 1;
    var moneyFn = (typeof C.money === 'function') ? C.money : function (n) { return '$' + n; };
    var combined = top.reduce(function (s, r) { return s + (r.amount || 0); }, 0);
    var bars = top.map(function (r, i) {
      var cm = (typeof C.catMeta === 'function') ? C.catMeta(r.category) : { accent: '#7fb4ff', icon: '', label: '' };
      var pct = Math.max(6, Math.round((r.amount / max) * 100));
      return '<button type="button" class="pdxis-gctop-row" data-gc-recipient="' + esc(r.recipient) + '" ' +
          'title="Open the Federal Spending Tracker filtered to ' + esc(r.recipient) + '">' +
        '<span class="pdxis-gctop-rank">' + (i + 1) + '</span>' +
        '<span class="pdxis-gctop-main">' +
          '<span class="pdxis-gctop-name">' + esc(r.recipient) +
            (cm.label ? ' <span class="pdxis-gctop-cat">' + esc(cm.icon) + ' ' + esc(cm.label) + '</span>' : '') + '</span>' +
          '<span class="pdxis-gctop-track"><span class="pdxis-gctop-fill" style="width:' + pct + '%;background:' + cm.accent + ';"></span></span>' +
        '</span>' +
        '<span class="pdxis-gctop-amt">' + esc(moneyFn(r.amount)) + '</span>' +
      '</button>';
    }).join('');
    var body = '<div class="pdxis-gctop">' +
      '<p class="pdxis-gctop-lead">The federal government’s largest tracked contractors by approximate recent-year dollar volume — about <b>' + esc(moneyFn(combined)) + '</b> combined. Bars are relative to the largest. Tap a company to open it in the Federal Spending Tracker.</p>' +
      bars +
      '<div class="pdxis-gctop-foot">' +
        '<button type="button" class="pdxis-gctop-cta" data-gc-open="1">🔍 Open the Federal Spending Tracker →</button>' +
        '<span class="pdxis-gctop-note">Figures rounded &amp; approximate · geographic &amp; volume context only · sources in the tracker</span>' +
      '</div>' +
    '</div>';
    return section('Top 5 Contractors', 'By dollar volume', body);
  }
  function renderFactBox(sp) {
    var fb = sp.factBox;
    if (!fb || !fb.rows || !fb.rows.length) return '';
    var rows = fb.rows.map(function (r) {
      return '<tr' + (r.total ? ' class="pdxis-fact-total"' : '') + '>' +
        '<td>' + esc(r.label) + '</td>' +
        '<td>' + esc(r.before || '') + '</td>' +
        '<td>' + esc(r.after || '') + '</td>' +
        '<td>' + esc(r.share || '') + '</td>' +
      '</tr>';
    }).join('');
    // Column headers default to the monument labels (Bears Ears card) but can be
    // overridden per-card via fb.cols for other tabular explainers.
    var cols = (fb.cols && fb.cols.length === 4)
      ? fb.cols : ['Monument', 'Before', 'After', 'Remaining'];
    var head = cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('');
    var body = '<div class="pdxis-fact">' +
      (fb.note ? '<p class="pdxis-fact-note">' + esc(fb.note) + '</p>' : '') +
      '<table class="pdxis-fact-tbl"><thead><tr>' + head +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
      (fb.foot ? '<p class="pdxis-fact-foot">' + esc(fb.foot) + '</p>' : '') +
    '</div>';
    return section('Top Fact Box', 'What is verified', body);
  }
  // Promised vs. Delivered — a neutral two-column comparison of what officials
  // publicly stated or implied against what the record ultimately showed. Purely
  // data-driven and optional: renders only for a card that supplies the field, so
  // every other Spotlight is untouched. Text is plain (escaped); no motive assigned.
  function renderPromiseVsDelivery(sp) {
    var pv = sp.promiseVsDelivery;
    if (!pv || !pv.rows || !pv.rows.length) return '';
    var rows = pv.rows.map(function (r) {
      return '<div class="pdxis-pvd-row">' +
        '<div class="pdxis-pvd-cell pdxis-pvd-promised"><span class="pdxis-pvd-tag">Stated / promised</span>' + esc(r.promised) + '</div>' +
        '<div class="pdxis-pvd-cell pdxis-pvd-delivered"><span class="pdxis-pvd-tag">What the record shows</span>' + esc(r.delivered) + '</div>' +
      '</div>';
    }).join('');
    var body = '<div class="pdxis-pvd">' +
      (pv.intro ? '<p class="pdxis-pvd-intro">' + esc(pv.intro) + '</p>' : '') +
      rows +
      (pv.foot ? '<p class="pdxis-pvd-foot">' + esc(pv.foot) + '</p>' : '') +
    '</div>';
    return section(pv.title || 'Promised vs. Delivered', pv.kicker || 'Statements vs. the record', body);
  }
  function renderNotDo(sp) {
    var nd = sp.notDo;
    if (!nd || !nd.items || !nd.items.length) return '';
    var items = nd.items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    var body = '<div class="pdxis-notdo">' +
      (nd.intro ? '<p class="pdxis-notdo-intro">' + esc(nd.intro) + '</p>' : '') +
      '<ul>' + items + '</ul>' +
      (nd.outro ? '<p class="pdxis-notdo-outro">' + esc(nd.outro) + '</p>' : '') +
    '</div>';
    return section('What this does NOT do', '', body);
  }
  function renderWhatChanged(sp) {
    if (!sp.whatChanged || !sp.whatChanged.length) return '';
    var cards = sp.whatChanged.map(function (c) {
      var marker = c.marker ? '<span class="pdxis-marker">' + esc(c.marker) + '</span>' : '';
      return '<div class="pdxis-chg">' +
        '<div class="pdxis-chg-h"><span class="pdxis-chg-t">' + esc(c.title) + '</span>' +
          chip(c.tag) + marker + '</div>' +
        '<div class="pdxis-chg-x">' + esc(c.text) + '</div>' +
      '</div>';
    }).join('');
    return section('What Changed', 'Verified management differences', cards);
  }
  // Per-argument engagement: each Case For / Against bullet gets its own
  // vote + comment thread, keyed by a stable target id (slug + argument text),
  // reusing the shared item-engagement system (auto-hydrated by the observer).
  function argEngage(sp, side, point, i) {
    if (typeof window._pdxSpotlightEngageHTML !== 'function') return '';
    // Anchor each argument's vote + comment thread to a STABLE key so the
    // discussion survives wording edits — these explainers are "developing" and
    // get refined over time. Prefer an authored point.id; otherwise fall back to
    // the argument text, then the index. Always namespaced by slug + side so an
    // id can never collide across cards or across the For/Against columns.
    var key = point.id || (point.text ? point.text.replace(/<[^>]+>/g, '') : String(i));
    var id = (typeof window._pdxVoteTargetId === 'function')
      ? window._pdxVoteTargetId('issue-arg', sp.slug + ':' + side, key)
      : 'issue-arg:' + sp.slug + ':' + side + ':' + i;
    return window._pdxSpotlightEngageHTML(id, 'this argument');
  }
  function renderCaseCol(sp, side, col) {
    if (!col || !col.points || !col.points.length) return '';
    var cls = side === 'for' ? 'pdxis-case-for' : 'pdxis-case-against';
    var heading = side === 'for' ? 'The Case For' : 'The Case Against';
    var pts = col.points.map(function (p, i) {
      return '<div class="pdxis-arg">' +
        '<div class="pdxis-arg-t">' + p.text + '</div>' +
        (p.note ? '<div class="pdxis-arg-note">' + esc(p.note) + '</div>' : '') +
        argEngage(sp, side, p, i) +
      '</div>';
    }).join('');
    return '<div class="pdxis-case ' + cls + '">' +
      '<div class="pdxis-case-h">' + heading + '</div>' +
      (col.sub ? '<p class="pdxis-case-sub">' + esc(col.sub) + '</p>' : '') +
      pts +
    '</div>';
  }
  function renderCases(sp) {
    if (!sp.caseFor && !sp.caseAgainst) return '';
    var body = '<div class="pdxis-cases">' +
      renderCaseCol(sp, 'for', sp.caseFor) +
      renderCaseCol(sp, 'against', sp.caseAgainst) +
    '</div>';
    return section('Both Sides', 'Strongest points — vote or discuss each', body);
  }
  function renderDataContext(sp) {
    if (!sp.dataContext || !sp.dataContext.length) return '';
    var items = sp.dataContext.map(function (d) {
      return '<li>' + (d.label ? '<span class="pdxis-dl-k">' + esc(d.label) + '</span>' : '') +
        chip(d.tag) + (d.tag ? ' ' : '') + esc(d.text) + '</li>';
    }).join('');
    return section('Data & Context', '', '<ul class="pdxis-dl">' + items + '</ul>');
  }
  function renderWhatToWatch(sp) {
    if (!sp.whatToWatch || !sp.whatToWatch.length) return '';
    var items = sp.whatToWatch.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    return section('What to Watch', 'Still developing', '<ul class="pdxis-dl pdxis-watch">' + items + '</ul>');
  }
  function renderSources(sp) {
    if (!sp.sources || !sp.sources.length) return '';
    var LEAN = { support: 'Support', opposition: 'Opposition', neutral: 'Neutral' };
    var rows = sp.sources.map(function (s) {
      var lean = LEAN[s.lean] ? s.lean : 'neutral';
      return '<li class="pdxis-srcrow">' +
        '<span class="pdxis-lean pdxis-lean-' + lean + '">' + esc(LEAN[lean]) + '</span>' +
        (s.url
          ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.label) + ' ↗</a>'
          : '<span>' + esc(s.label) + '</span>') +
      '</li>';
    }).join('');
    return section('Sources', 'Tagged by vantage — check them yourself', '<ul class="pdxis-srcs">' + rows + '</ul>');
  }
  function renderRelated(sp) {
    if (!sp.relatedIssues || !sp.relatedIssues.length) return '';
    var linkable = false;
    var chips = sp.relatedIssues.map(function (r) {
      var label = typeof r === 'string' ? r : r.label;
      var rec = (r && r.rec) ? ' is-rec' : '';
      // "Connecting the dots": an entry can carry a `slug` (jump to a sibling
      // Spotlight) or an `issueKey` (open the Stance Library filtered to it),
      // turning the chip into a 2-way navigation button. Plain labels still render
      // as static chips, so existing cards are untouched.
      var slug = r && r.slug, ik = r && r.issueKey;
      if (slug && SPOTLIGHTS[slug]) {
        linkable = true;
        return '<button type="button" class="pdxis-rel-chip is-link' + rec + '" data-rel-slug="' + esc(slug) + '" ' +
          'aria-label="Open the ' + esc(label) + ' Issue Spotlight">🔦 ' + esc(label) +
          ' <span class="pdxis-rel-go" aria-hidden="true">→</span></button>';
      }
      if (ik) {
        linkable = true;
        return '<button type="button" class="pdxis-rel-chip is-link' + rec + '" data-rel-ik="' + esc(ik) + '" ' +
          'aria-label="See where politicians stand on ' + esc(label) + ' in the Stance Library">' + esc(label) +
          ' <span class="pdxis-rel-go" aria-hidden="true">→</span></button>';
      }
      return '<span class="pdxis-rel-chip' + rec + '">' + esc(label) + '</span>';
    }).join('');
    return section('Related Issues', linkable ? 'Tap to jump to a connected spotlight or the Stance Library' : '',
      '<div class="pdxis-rel">' + chips + '</div>');
  }

  // ── Related Spotlights (auto) ─────────────────────────────────────────────
  // Connecting the dots, spotlight → spotlight: score every OTHER spotlight by how
  // many issue keys it shares with this one (primary + community + stands keys) and
  // surface the strongest matches as clickable cards. Fully automatic, so every card
  // links to its neighbors without hand-authored slugs, and new cards join the web
  // the moment they are added. Manual `relatedIssues` slugs still add curated chips
  // above; this adds the discovered ones as richer cards.
  function spotlightKeySet(o) {
    var set = {};
    [o.primaryIssueKey]
      .concat(o.communityIssueKeys || [], (o.standsOnIssue && o.standsOnIssue.matchIssueKeys) || [])
      .forEach(function (k) { if (k) set[k] = true; });
    return set;
  }
  function renderRelatedSpotlights(sp) {
    var mine = spotlightKeySet(sp);
    var scored = [];
    Object.keys(SPOTLIGHTS).forEach(function (slug) {
      if (slug === sp.slug) return;
      var o = SPOTLIGHTS[slug];
      var theirs = spotlightKeySet(o), overlap = 0, curated = 0;
      Object.keys(theirs).forEach(function (k) { if (mine[k]) overlap++; });
      (sp.relatedIssues || []).forEach(function (r) { if (r && r.slug === slug) curated = Math.max(curated, 2); });
      (o.relatedIssues || []).forEach(function (r) { if (r && r.slug === sp.slug) curated = Math.max(curated, 1); });
      if (overlap > 0 || curated > 0) scored.push({ o: o, overlap: overlap, curated: curated });
    });
    if (!scored.length) return '';
    // Explicit links lead, including reverse links authored on the other card;
    // shared issue-key overlap then breaks ties.
    scored.sort(function (a, b) { return (b.curated - a.curated) || (b.overlap - a.overlap); });
    var cards = scored.slice(0, 4).map(function (e) {
      return '<button type="button" class="pdxis-relspot" data-rel-slug="' + esc(e.o.slug) + '" ' +
          'aria-label="Open the ' + esc(e.o.title) + ' Issue Spotlight">' +
        '<span class="pdxis-relspot-ico" aria-hidden="true">🔦</span>' +
        '<span class="pdxis-relspot-body">' +
          '<span class="pdxis-relspot-t">' + esc(e.o.title) + '</span>' +
          '<span class="pdxis-relspot-p">' + esc(e.o.place || 'Issue Spotlight') + '</span>' +
        '</span>' +
        '<span class="pdxis-relspot-go" aria-hidden="true">→</span>' +
      '</button>';
    }).join('');
    return section('Related Spotlights', 'Other sourced explainers that connect to this one',
      '<div class="pdxis-relspots">' + cards + '</div>');
  }

  // ── How Politicians Stand on This Issue ───────────────────────────────────
  // A politician layer for the policy-explainer cards (which carry no `groups`).
  // It pulls the reader's OWN representatives to the top (when a location is set)
  // with a "Your Rep" badge, then shows a curated, balanced set of key figures.
  // Each row is a pure lens over ISSUE_STANCE_DATA — stance chip + sourced position
  // + a link to the full record — and a say-vs-do verdict is layered in live from
  // the voting-record database (see hydrateStands). It ends with a prominent button
  // into the Stance Library, filtered to this issue. Emits nothing unless the card
  // declares `standsOnIssue`, so the existing Spotlights are untouched.
  function renderStandsPersonRow(sp, p, keys, isRep) {
    var st = findStance(p.id, p.topic, keys);
    var stance = resolveStance(p, st);   // honors a pinned issue-relative `stance`
    // Prefer the live stance record; fall back to an authored, sourced position
    // (`p.posText` + `p.source`) for topics the stance DB does not track — e.g. a
    // specific case rather than a policy issue. Existing cards set neither, so they
    // resolve from the DB exactly as before.
    var authored = !st && p.posText;
    var posTxt = st && st.text
      ? esc(st.text)
      : (p.posText
          ? esc(p.posText)
          : '<span class="pdxis-note">No public position on record for this issue yet.</span>');
    var repBadge = isRep
      ? '<span class="pdxis-yourrep" title="Elected to represent your area">★ Your Rep</span>' : '';
    var srcHtml = st && st.source ? srcLink(st.source) : (p.source ? srcLink(p.source) : '');
    var authoredVerdict = p.verdict && p.verdict.label
      ? '<span class="pdxis-meta-k">Say vs. Do</span>' +
        '<span class="pdxis-vr-verdict pdxis-vr-v-' + esc(p.verdict.cls || 'mixed') + '">' + esc(p.verdict.label) + '</span>'
      : '';
    return '<button type="button" class="pdxis-person pdxis-stperson' + (isRep ? ' is-yourrep' : '') + '" ' +
        'data-pid="' + esc(p.id) + '" aria-label="Open the full record on the issues for ' + esc(nameFor(p)) + '">' +
      '<div class="pdxis-p-top">' +
        '<div class="pdxis-p-ico">' + esc(iconFor(p)) + '</div>' +
        '<div class="pdxis-p-id">' +
          '<div class="pdxis-p-name">' + esc(nameFor(p)) + repBadge + '</div>' +
          '<div class="pdxis-p-office">' + esc(officeFor(p)) + '</div>' +
        '</div>' +
        stancePill(stance) +
      '</div>' +
      '<div class="pdxis-p-pos">' + posTxt + '</div>' +
      '<div class="pdxis-stverd" data-svd-pid="' + esc(p.id) + '">' + authoredVerdict + '</div>' +
      '<div class="pdxis-p-foot">' +
        (srcHtml || '<span></span>') +
        '<span class="pdxis-p-cta">' + (authored ? 'View profile →' : 'Record on the issues →') + '</span>' +
      '</div>' +
    '</button>';
  }
  function renderStandsOnIssue(sp) {
    var soi = sp.standsOnIssue;
    if (!soi || !soi.people || !soi.people.length) return '';
    var keys = soi.matchIssueKeys || sp.communityIssueKeys || [];
    var libraryKey = soi.libraryKey || sp.primaryIssueKey;

    // 1) The reader's own representatives (only those with a resolvable position on
    //    THIS issue), pulled to the top with a "Your Rep" badge.
    var repIds = [];
    try {
      var loc = window._currentVoterLocation || null;
      if (window._hasUserLocation && loc && loc.state &&
          window.PDXTeamView && typeof window.PDXTeamView.representsMe === 'function') {
        (window.PDXTeamView.representsMe(loc) || []).forEach(function (r) {
          if (r && r.pid && repIds.indexOf(r.pid) === -1) repIds.push(r.pid);
        });
      }
    } catch (e) {}

    var authoredById = {};
    soi.people.forEach(function (p) { if (p && p.id) authoredById[p.id] = p; });

    var shown = {}, repRows = [];
    repIds.forEach(function (pid) {
      var authored = authoredById[pid];
      var st = findStance(pid, authored && authored.topic, keys);
      if (!st && !(authored && authored.posText)) return; // no position on THIS issue → skip
      repRows.push(renderStandsPersonRow(sp, authored || { id: pid }, keys, true));
      shown[pid] = true;
    });

    // 2) The curated key figures (skip any already shown as one of the reader's reps).
    var keyRows = soi.people.filter(function (p) { return p && p.id && !shown[p.id]; })
      .map(function (p) { return renderStandsPersonRow(sp, p, keys, false); }).join('');

    var repBlock = repRows.length
      ? '<div class="pdxis-stands-reps">' +
          '<div class="pdxis-group-h pdxis-stands-h">👤 Your representatives on this issue</div>' +
          '<div class="pdxis-group-note">You set your location, so these are the officials who answer to you. Tap any name for the full record.</div>' +
          repRows.join('') +
        '</div>'
      : '';
    var keyBlock = keyRows
      ? '<div class="pdxis-stands-key">' +
          '<div class="pdxis-group-h pdxis-stands-h">' +
            esc(repRows.length ? 'Other key voices on this issue' : 'Key voices on this issue') + '</div>' +
          keyRows +
        '</div>'
      : '';

    var body = (repBlock || keyBlock)
      ? repBlock + keyBlock
      : '<p class="pdxis-note">No stance records resolve for this issue yet.</p>';

    body += '<p class="pdxis-note">' + esc(soi.note ||
      'Positions are resolved live from each official’s stance record; the say-vs-do verdict compares what they say against their recorded votes when one is on file. This is a focused selection — the Stance Library has everyone.') + '</p>';

    if (libraryKey) {
      body += '<button type="button" class="pdxis-stance-cta" data-pdxis-lib="' + esc(libraryKey) + '">' +
        'See all stances &amp; voting records on this issue ' +
        '<span class="pdxis-stance-cta-arrow" aria-hidden="true">→</span></button>';
    }

    return section('How Politicians Stand on This Issue',
      'Your reps first, then other key figures — stance and say-vs-do at a glance', body);
  }
  // Layer the live say-vs-do verdict (stated stance vs. recorded votes) onto each
  // stands row after the voting-record cache warms. Self-effacing: rows with no
  // record on this issue simply keep their empty verdict slot (which collapses).
  function hydrateStands(sp) {
    var soi = sp.standsOnIssue;
    if (!soi) return;
    var wrap = document.getElementById('pdxis-wrap');
    if (!wrap) return;
    var slots = wrap.querySelectorAll('.pdxis-stverd[data-svd-pid]');
    if (!slots.length) return;
    var libraryKey = soi.libraryKey || sp.primaryIssueKey;
    var pids = Array.prototype.map.call(slots, function (s) { return s.getAttribute('data-svd-pid'); });
    var fill = function () {
      if (_open !== sp.slug) return;                    // navigated away while fetching
      slots.forEach(function (slot) {
        var pid = slot.getAttribute('data-svd-pid');
        var sum = null;
        try {
          if (typeof window._pdxRecordIssueSummary === 'function') {
            sum = window._pdxRecordIssueSummary(pid, libraryKey);
          }
        } catch (e) {}
        var v = sum && VR_VERDICT[sum.netVerdict];
        var uni = null;
        try { if (window.PDXConsistency && typeof window.PDXConsistency.officialRecord === 'function') uni = window.PDXConsistency.officialRecord(pid, libraryKey); } catch (e) {}
        if (uni && ['consistent', 'contradicts', 'mixed', 'pending'].indexOf(uni.token) >= 0) {
          slot.innerHTML = '<span class="pdxis-meta-k">Official Record</span>' + window.PDXConsistency.chipHtml(uni, null, { frame: false });
        } else if (v) {
          slot.innerHTML = '<span class="pdxis-meta-k">Official Record</span>' +
            '<span class="pdxis-vr-verdict pdxis-vr-v-' + v.cls + '">' + esc(sum.label || v.label) + '</span>';
        }
      });
    };
    var api = window.PDXVotingRecord;
    if (api && typeof api.fetchCompare === 'function') {
      api.fetchCompare(pids).then(fill).catch(function () {});
    } else { fill(); }
  }

  function render(sp) {
    var wrap = document.getElementById('pdxis-wrap');
    if (!wrap) return;
    wrap.innerHTML =
      '<div class="pdxis-top">' +
        '<button type="button" class="pdxis-back" id="pdxis-back">← Back</button>' +
        '<div class="pdxis-top-spacer"></div>' +
        '<button type="button" class="pdxis-share" id="pdxis-share">🔗 Share</button>' +
      '</div>' +
      '<div class="pdxis-eyebrow">🔦 ' + esc(sp.eyebrow) + '</div>' +
      '<h1 class="pdxis-title">' + esc(sp.title) + '</h1>' +
      '<div class="pdxis-place">' +
        '<span>📍 ' + esc(sp.place) + '</span>' +
        '<span class="pdxis-dot">·</span>' +
        '<span class="pdxis-updated">' + esc(sp.updated) + '</span>' +
        (function () {
          var s = spotlightStrength(sp);
          return '<span class="pdxis-dot">·</span>' +
            '<span class="pdxis-doc pdxis-doc-' + s.level + '" title="' +
              esc(s.sources + ' sourced events · ' + s.receipts + ' receipts in the Evidence Locker') + '">' +
              '📑 ' + esc(s.label) + '</span>';
        })() +
      '</div>' +
      renderStatus(sp) +
      renderSummary(sp) +
      renderContractsTopN(sp) +
      renderFactBox(sp) +
      renderPromiseVsDelivery(sp) +
      renderNotDo(sp) +
      renderTimeline(sp) +
      renderWhatChanged(sp) +
      renderCases(sp) +
      renderBoard(sp) +
      renderSayVsDo(sp) +
      renderVotingRecord(sp) +
      renderEvidence(sp) +
      renderDataContext(sp) +
      renderWhatToWatch(sp) +
      renderSources(sp) +
      renderRelated(sp) +
      renderRelatedSpotlights(sp) +
      renderStandsOnIssue(sp) +
      renderCommunity(sp) +
      '<div class="pdxis-foot">PolitiDex Issue Spotlight — a calm, sourced lens over what we already track. ' +
        'Every position links to that official’s full record on the issues; every receipt links to its original source. ' +
        'Positions marked <b>Pledge</b> are campaign promises, not yet a governing record.</div>';
    wireWrap(sp);
  }

  function wireWrap(sp) {
    var wrap = document.getElementById('pdxis-wrap');
    var back = document.getElementById('pdxis-back');
    if (back) back.onclick = function () { close(); };
    var share = document.getElementById('pdxis-share');
    if (share) share.onclick = function () { shareSpotlight(sp, share); };
    // Person / receipt links → that official's Full Stance Record.
    wrap.querySelectorAll('[data-pid]').forEach(function (el) {
      el.addEventListener('click', function () { toProfile(el.getAttribute('data-pid')); });
    });
    // Top Contractors visual → open the Federal Spending Tracker, either filtered
    // to the tapped company or (footer button) to the full, unfiltered tracker.
    wrap.querySelectorAll('[data-gc-recipient]').forEach(function (el) {
      el.addEventListener('click', function () {
        var r = el.getAttribute('data-gc-recipient');
        if (window.PDXContracts && typeof window.PDXContracts.open === 'function') { close(); window.PDXContracts.open({ recipient: r }); }
      });
    });
    var gcOpen = wrap.querySelector('[data-gc-open]');
    if (gcOpen) gcOpen.addEventListener('click', function () {
      if (window.PDXContracts && typeof window.PDXContracts.open === 'function') { close(); window.PDXContracts.open(); }
    });
    // Related-issue chips → jump to a sibling Spotlight in place (issue→issue) …
    wrap.querySelectorAll('[data-rel-slug]').forEach(function (el) {
      el.addEventListener('click', function () {
        var slug = el.getAttribute('data-rel-slug');
        if (slug && SPOTLIGHTS[slug]) { try { document.getElementById('issue-spotlight').scrollTop = 0; } catch (e) {} open(slug); }
      });
    });
    // … or into the Stance Library, filtered to that issue (issue→library).
    wrap.querySelectorAll('[data-rel-ik]').forEach(function (el) {
      el.addEventListener('click', function () {
        // SHELL SEAM 4 — the Stance Library is a section of the front page,
        // not a module on this document, so this is a hop rather than a
        // hand-off. The issue filter the in-app call carried does not survive
        // the address; the reader lands on the library itself.
        el.getAttribute('data-rel-ik');
        close({ to: '/#stance-library' });
      });
    });
    // Layer live recorded votes over the static story (no-op unless the spotlight
    // declares a votingRecord block; self-removing if the data can't be reached).
    hydrateVotingRecord(sp);
    // Layer the say-vs-do verdicts onto the "How Politicians Stand" rows (no-op
    // unless the card declares standsOnIssue).
    hydrateStands(sp);
    // "See all stances & voting records on this issue →" → the Stance Library,
    // filtered to this issue. Close the Spotlight first so the library (a page
    // section) owns the screen, mirroring the community hand-off.
    var slcta = wrap.querySelector('[data-pdxis-lib]');
    if (slcta) slcta.onclick = function () {
      // SHELL SEAM 4 (same hop as the related-issue chips above).
      close({ to: '/#stance-library' });
    };
    var cbtn = document.getElementById('pdxis-comm-btn');
    if (cbtn) cbtn.onclick = function () {
      // SHELL SEAM 5 — the Community Exchange is a front-page section too, and
      // community.js is not on this document. Same hop, same reason.
      close({ to: '/#community-exchange' });
    };
    loadCommunityCount(sp);
  }

  // Show a live count of community posts tagged to this issue, if any.
  function loadCommunityCount(sp) {
    if (!window.PDXCommunity || typeof window.PDXCommunity.issuesWithPosts !== 'function') return;
    window.PDXCommunity.issuesWithPosts().then(function (counts) {
      if (!counts) return;
      var n = 0;
      (sp.communityIssueKeys || []).forEach(function (k) { n += (counts[k] || 0); });
      var el = document.getElementById('pdxis-comm-count');
      if (el && n > 0) { el.textContent = '💬 ' + n; el.hidden = false; }
    }).catch(function () {});
  }

  // ── Navigation / lifecycle ────────────────────────────────────────────────
  var _open = null;            // currently open slug
  var _meta = null;            // saved <title>/meta for restore
  // SHELL SEAM 1 — WHAT "CLOSE" MEANS NOW.
  // On index.html this was an overlay over a live single-page app, so closing
  // it was a pushState back to whatever path the app was already on. /issue/*
  // is its own document now: there is nothing underneath this surface to go
  // back to, so closing is LEAVING, and leaving is a real navigation.
  //
  // history.back() is preferred when the reader actually arrived from a
  // same-origin page that is not another Spotlight, because that returns them
  // to the scroll position they left. The referrer is read ONCE, at module
  // load, before any pushState of ours can change what document.referrer
  // means. Everything else goes to the front page.
  var _viaBack = (function () {
    try {
      if (!document.referrer) return false;
      var u = new URL(document.referrer, location.href);
      if (u.origin !== location.origin) return false;
      return !/^\/issue\//.test(u.pathname || '');
    } catch (e) { return false; }
  })();
  function leave(to) {
    try {
      if (to) { location.assign(to); return; }
      if (_viaBack && history.length > 1) { history.back(); return; }
      location.assign('/');
    } catch (e) { location.href = to || '/'; }
  }

  function spotlightUrl(slug) { return location.origin + '/issue/' + slug; }

  function setMeta(sp) {
    if (!_meta) {
      _meta = { title: document.title };
      ['og:title', 'og:description', 'og:url', 'twitter:title', 'twitter:description', 'description'].forEach(function (n) {
        var sel = (n === 'description') ? 'meta[name="description"]' :
          (n.indexOf('og:') === 0 ? 'meta[property="' + n + '"]' : 'meta[name="' + n + '"]');
        var el = document.querySelector(sel);
        _meta[n] = el ? el.getAttribute(n === 'description' || n.indexOf('twitter') === 0 ? 'content' : 'content') : null;
      });
      // The document's single hardcoded canonical href, saved so closing the
      // Spotlight puts it back exactly as the server sent it.
      var _canon = document.querySelector('link[rel="canonical"]');
      _meta.canonical = _canon ? _canon.getAttribute('href') : null;
    }
    document.title = sp.title + ' — PolitiDex Issue Spotlight';
    setMetaTag('meta[property="og:title"]', document.title);
    setMetaTag('meta[name="twitter:title"]', document.title);
    setMetaTag('meta[property="og:description"]', sp.metaDescription);
    setMetaTag('meta[name="twitter:description"]', sp.metaDescription);
    setMetaTag('meta[name="description"]', sp.metaDescription);
    setMetaTag('meta[property="og:url"]', spotlightUrl(sp.slug));
    // og:url without rel=canonical is half the job. index.html ships ONE
    // canonical href for the whole single-page app, so an open Spotlight was
    // telling anything that reads the live DOM — a crawler that executes JS, a
    // reader-mode extension, a "copy canonical link" tool — that this record is
    // really the homepage. The edge function fixes the served HTML for scrapers
    // (netlify/edge-functions/share-preview.ts); this fixes the live document.
    setCanonicalHref(spotlightUrl(sp.slug));
  }
  function setMetaTag(sel, val) { var el = document.querySelector(sel); if (el && val != null) el.setAttribute('content', val); }
  function setCanonicalHref(val) {
    var el = document.querySelector('link[rel="canonical"]');
    if (el && val != null) el.setAttribute('href', val);
  }
  function restoreMeta() {
    if (!_meta) return;
    document.title = _meta.title;
    setMetaTag('meta[property="og:title"]', _meta['og:title']);
    setMetaTag('meta[name="twitter:title"]', _meta['twitter:title']);
    setMetaTag('meta[property="og:description"]', _meta['og:description']);
    setMetaTag('meta[name="twitter:description"]', _meta['twitter:description']);
    setMetaTag('meta[name="description"]', _meta['description']);
    setMetaTag('meta[property="og:url"]', _meta['og:url']);
    setCanonicalHref(_meta.canonical);
    _meta = null;
  }

  function showOverlay() {
    var el = document.getElementById('issue-spotlight');
    if (!el) return;
    el.hidden = false; el.setAttribute('aria-hidden', 'false');
    el.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    // SHELL SEAM 7 — one event, so the document that built the mount can retire
    // its own waiting line the moment the surface is on screen. A shell that
    // does not listen is unaffected; nothing here reads the DOM outside the
    // overlay, and this is not a layout observer.
    try { document.dispatchEvent(new CustomEvent('pdx:spotlight:open')); } catch (_e) {}
  }
  function hideOverlay() {
    var el = document.getElementById('issue-spotlight');
    if (!el) return;
    el.hidden = true; el.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function open(slug, opts) {
    opts = opts || {};
    var sp = SPOTLIGHTS[slug];
    if (!sp) {
      // Run 3 perf: Spotlight data now loads on demand. If a link is followed
      // before it has arrived, fetch it and retry the open once ready (once).
      if (window.PDXLazyData && !window.PDXLazyData.loaded('spotlights') && !opts._retried) {
        window.PDXLazyData.whenReady('spotlights', function () {
          open(slug, Object.assign({}, opts, { _retried: true }));
        });
        return true;
      }
      return false;
    }
    // A profile modal must never be left lurking under the Spotlight.
    if (typeof window.closeModal === 'function' && document.getElementById('modal-overlay') &&
        getComputedStyle(document.getElementById('modal-overlay')).display !== 'none') {
      try { window.closeModal(); } catch (e) {}
    }
    render(sp);
    showOverlay();
    setMeta(sp);
    _open = slug;
    if (!opts.fromPop) {
      try { history.pushState({ pdxSpotlight: slug }, document.title, '/issue/' + slug); } catch (e) {}
    }
    return true;
  }

  // SHELL SEAM 2 — close(). A popstate close still just hides (the browser has
  // already moved the address). Every other close is the reader asking to go,
  // and `opts.to` is how a control that knows WHERE they should land — the
  // Stance Library, the Community Exchange — says so; both of those are
  // sections of the front page, so the hop is cross-document and the issue
  // filter they carried inside the app cannot survive it.
  function close(opts) {
    opts = opts || {};
    if (opts.fromPop) {
      hideOverlay();
      if (_open) { restoreMeta(); _open = null; }
      return;
    }
    hideOverlay();
    if (_open) { restoreMeta(); _open = null; }
    leave(opts.to || null);
  }

  // SHELL SEAM 3 — a name in a Spotlight is a cross-document navigation.
  // index.html answered a person link with showProfile(id), which opened the
  // profile modal over the app. There is no profile modal on this document and
  // profiles-full.js (593 KB) is deliberately not here, so the person's file
  // is where it lives: /p/<pid>, built by person-link.js, which owns that
  // address and resolves retired ids through it. No hand-spelled "/p/" here.
  function toProfile(id) {
    if (!id) return;
    var PL = window.PDXPersonLink;
    if (PL && typeof PL.open === 'function') { if (PL.open(id)) return; }
    if (PL && typeof PL.href === 'function') {
      var h = PL.href(id);
      if (h) { location.assign(h); return; }
    }
  }

  function shareSpotlight(sp, btn) {
    var url = spotlightUrl(sp.slug);
    var payload = { title: sp.title + ' — PolitiDex', text: sp.metaDescription, url: url };
    if (navigator.share) {
      navigator.share(payload).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () {
        if (btn) { var o = btn.innerHTML; btn.innerHTML = '✅ Link copied'; setTimeout(function () { btn.innerHTML = o; }, 1800); }
      }).catch(function () { window.prompt('Copy this link:', url); });
    } else {
      window.prompt('Copy this link:', url);
    }
  }

  // ── Deep-link resolution: /issue/<slug>, ?issue=<slug>, #issue/<slug> ──────
  function slugFromLocation() {
    var m = (location.pathname || '').match(/^\/issue\/([A-Za-z0-9_-]+)\/?$/);
    if (m) return m[1];
    try {
      var qs = new URLSearchParams(location.search).get('issue');
      if (qs) return qs;
    } catch (e) {}
    var h = (location.hash || '').match(/^#issue\/([A-Za-z0-9_-]+)$/);
    if (h) return h[1];
    return null;
  }
  function syncFromUrl(fromPop) {
    var slug = slugFromLocation();
    if (slug && SPOTLIGHTS[slug]) {
      // Normalise ?issue= / #issue/ entry points to the canonical clean path.
      var viaPath = (location.pathname || '').indexOf('/issue/') === 0;
      if (open(slug, { fromPop: fromPop || viaPath }) && !viaPath && !fromPop) {
        try { history.replaceState({ pdxSpotlight: slug }, document.title, '/issue/' + slug); } catch (e) {}
      }
      return true;
    }
    // THE SAME PREFIX, TWO KINDS OF PAGE — AND NOW TWO DOCUMENTS.
    // /issue/<slug> is Spotlight. /i/<key> is the Issue File. They were both
    // served by index.html once, so a vocabulary key that had no Spotlight of
    // its own was answered in-page by issue-page.js. That module is not here
    // and must not be: the dossier is issue.html's lane and rebuilding it on
    // this document is exactly what this split exists to stop.
    //
    // So a miss on this address is not an error and not a front page — it is
    // the SAME KEY at the other address. One hop, replace rather than push (so
    // Back does not bounce between the two documents), and ?pid= is carried
    // through untouched because the Issue File's bar reads it to offer the way
    // back to that person's file. pdx-issue-family.js owns the /i/ spelling
    // there; here there is no register to ask, only the key the reader typed,
    // so the address is assembled from the same two pieces that arrived.
    if (hopToIssueFile(slug)) return true;
    if (_open && fromPop) close({ fromPop: true });
    return false;
  }
  var _hopped = false;
  function hopToIssueFile(slug) {
    if (!slug || _hopped) return false;
    if (!/^[A-Za-z0-9_-]+$/.test(slug)) return false;
    _hopped = true;
    try {
      location.replace('/i/' + encodeURIComponent(slug) + (location.search || ''));
    } catch (e) { return false; }
    return true;
  }

  window.addEventListener('popstate', function () { syncFromUrl(true); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && _open) { e.preventDefault(); close(); }
  });

  // Public API.
  window.PDXSpotlight = {
    open: function (slug) { return open(slug); },
    close: function () { close(); },
    has: function (slug) { return !!SPOTLIGHTS[slug]; },
    registry: SPOTLIGHTS,
    // Every Spotlight, in registry order — the source of truth for home-page
    // discovery. Adding a Spotlight to SPOTLIGHTS above is all it takes to make
    // it appear in the "Local Issues" section and in search automatically.
    list: function () {
      return Object.keys(SPOTLIGHTS).map(function (s) { return SPOTLIGHTS[s]; });
    },
    // Documentation-strength signal for a Spotlight — see spotlightStrength().
    strength: function (slug) { return spotlightStrength(SPOTLIGHTS[slug]); },
    strengthFor: function (sp) { return spotlightStrength(sp); },
    // Find spotlights that feature a given politician id (used for profile callouts).
    // Scans every place a person can appear — the politician-centric `groups`, the
    // policy-explainer `standsOnIssue.people`, plus `evidence` and `sayVsDo` — so a
    // profile links back to ANY spotlight that features them (politician→issue).
    forPolitician: function (id) {
      var out = [];
      Object.keys(SPOTLIGHTS).forEach(function (slug) {
        var sp = SPOTLIGHTS[slug];
        var hit =
          (sp.groups || []).some(function (g) {
            return (g.people || []).some(function (p) { return p.id === id; });
          }) ||
          (sp.standsOnIssue && (sp.standsOnIssue.people || []).some(function (p) { return p.id === id; })) ||
          (sp.evidence || []).some(function (grp) {
            return (grp.items || []).some(function (it) { return it.id === id; });
          }) ||
          (sp.sayVsDo || []).some(function (r) { return r.person === id; });
        if (hit) out.push(sp);
      });
      return out;
    },
    // Find spotlights tied to an issueKey — its primary key, its community keys, or
    // its stands/library key — so other surfaces (e.g. the Stance Library) can link
    // back into a relevant spotlight (issue→spotlight, the reverse direction).
    forIssueKey: function (key) {
      if (!key) return [];
      return Object.keys(SPOTLIGHTS).map(function (s) { return SPOTLIGHTS[s]; }).filter(function (sp) {
        if (sp.primaryIssueKey === key) return true;
        if ((sp.communityIssueKeys || []).indexOf(key) !== -1) return true;
        var soi = sp.standsOnIssue;
        if (soi && (soi.libraryKey === key || (soi.matchIssueKeys || []).indexOf(key) !== -1)) return true;
        return false;
      });
    },
    // Lightweight search match for the browse suggestions. Token-based: every
    // word in the query must appear somewhere in the title/place/keywords, so a
    // natural phrase like "box elder data center" matches even though those words
    // are not contiguous in the keyword string.
    match: function (q) {
      q = String(q || '').toLowerCase().trim();
      if (!q) return [];
      var terms = q.split(/\s+/).filter(Boolean);
      return Object.keys(SPOTLIGHTS).map(function (s) { return SPOTLIGHTS[s]; }).filter(function (sp) {
        var hay = (sp.title + ' ' + sp.place + ' ' + (sp.searchKeywords || '')).toLowerCase();
        return terms.every(function (t) { return hay.indexOf(t) !== -1; });
      });
    }
  };

  // SHELL SEAM 6 — THE BOOT, WITH NOTHING LEFT TO WAIT FOR.
  // On index.html this gate retried for up to five seconds, because the names
  // and offices in a Spotlight were resolved out of PROFILES / CMP_DATA and
  // the key table behind the /issue/<key> fallback arrived in a deferred
  // script. Neither is true here. Every person a Spotlight paints carries its
  // own name, office and icon in spotlights-data.js (that is what makes this
  // document servable without the roster), and the fallback is now a single
  // redirect rather than a second surface that has to be ready.
  //
  // spotlights-data.js is a parser-blocking <script> above this one on
  // spotlight.html, so the registry is already complete by the time this line
  // runs: the only thing to wait for is <body>, because the overlay mount is
  // built there. One pass, no retry ladder, no idle callback.
  function bootSpotlight() {
    if (!document.getElementById('issue-spotlight')) return;
    if (syncFromUrl(false)) return;
    // NOTHING TO OPEN AND NOTHING TO HOP TO. Only one address reaches this line:
    // /issue/ with no slug after it — not a Spotlight, not a key, nothing this
    // document can answer. It is not a directory (that is the front page's job,
    // and building a second browse surface here is exactly what this split was
    // told not to do), so it goes home rather than sitting on a loading line.
    if (/^\/issue\/?$/.test(location.pathname || '')) {
      try { location.replace('/'); } catch (e) {}
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootSpotlight);
  } else { bootSpotlight(); }

  // THE PROFILE CALLOUT IS NOT ON THIS DOCUMENT.
  // index.html's copy of this module ended with window._pdxRelatedSpotlight —
  // the "Featured in Issue Spotlight" rail injected into an open profile
  // modal. It is cut here rather than carried dead: it reads #modal-content,
  // window.PDXDossier and window.closeModal, and this document has no profile
  // modal, no dossier module and nothing to close. A person link on a
  // Spotlight goes to /p/<pid> instead (SHELL SEAM 3).
})();
