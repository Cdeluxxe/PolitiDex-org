/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Bill detail panel (Phase 2)  ·  window.PDXBillDetail
   ────────────────────────────────────────────────────────────────────────────
   A rich, additive modal over one measure. Opens from a Legislation-tab bill card
   (PDXBills.open delegates here) and reads exactly the shape the Voting Record
   Function already returns from GET /api/voting-record/measure/:id — no new API.

   Sections (each degrades gracefully when its data is absent):
     • Header — number, title, status, chamber/congress, source, omnibus marker.
     • Omnibus breakdown — every component issue, whether a Yea advances or cuts
       against it (support_meaning), and the rationale. The core "what's bundled".
     • Roll calls — each vote event with totals, and a per-member vote table. Each
       member row can expand to their say-vs-do on THIS bill, computed from the
       shared _measureComponentBreakdown engine (one vote → many per-issue verdicts).
     • Sponsors / cosponsors — from vr_positions.
     • Key actions — a lightweight timeline synthesized from introducedAt + the
       roll calls + status (a real vr_measure_actions table is a Phase-3 add).
     • Related — Issue Spotlights (via PDXSpotlight.forIssueKey) and profile links.

   Reuses: _measureComponentBreakdown, _polPositionMap, _issueLabel, showProfile,
   _getPhotoUrl, PDXSpotlight, CMP_DATA/PROFILES. Nothing here mutates app state.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXBillDetail) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escAttr(s) { return esc(s); }
  function G(n) { try { return window[n]; } catch (e) { return null; } }

  var _current = null; // the bill currently shown (for follow + share)

  function issueLabel(k) {
    try { if (typeof window._issueLabel === 'function') { var l = window._issueLabel(k); if (l) return l; } } catch (e) {}
    return String(k || '').replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function prof(id) {
    var d = G('CMP_DATA') || {}; if (d[id]) return d[id];
    var p = G('PROFILES') || {}; return p[id] || null;
  }
  function nameFor(id) { var d = prof(id); return (d && d.name) ? d.name : String(id); }
  function photoFor(id) { try { if (typeof window._getPhotoUrl === 'function') return window._getPhotoUrl(id) || ''; } catch (e) {} return ''; }
  function isLocal(id) { try { return !!(typeof window._pdxIsLocalToUser === 'function' && window._pdxIsLocalToUser(id)); } catch (e) { return false; } }

  var STATUS = {
    introduced: 'Introduced', passed_house: 'Passed House', passed_senate: 'Passed Senate',
    enacted: 'Enacted', failed: 'Failed', vetoed: 'Vetoed', pending: 'Pending'
  };
  function statusLabel(s) { return STATUS[s] || (s ? String(s).replace(/_/g, ' ') : ''); }
  function chamberLabel(c) { return c === 'house' ? 'House' : c === 'senate' ? 'Senate' : c === 'joint' ? 'Joint' : c === 'court' ? 'Court' : (c || ''); }
  function fmtDate(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch (e) { return String(iso).slice(0, 10); }
  }

  // ── say-vs-do for one member on this bill ───────────────────────────────────
  // Uses the shared engine: {position, issues} × the member's stance map → a
  // per-issue verdict list plus a compact consistent/contradicts summary.
  var VERDICT = {
    consistent: { cls: 'bd-v-consistent', label: '✓ matches stance' },
    contradicts: { cls: 'bd-v-contradicts', label: '⚠ against stance' },
    mixed: { cls: 'bd-v-mixed', label: 'mixed' },
    no_position: { cls: 'bd-v-neutral', label: 'no position' }
  };
  function memberSayVsDo(pid, position, issues) {
    if (typeof window._measureComponentBreakdown !== 'function' || typeof window._polPositionMap !== 'function') return null;
    var pm = window._polPositionMap(pid, prof(pid)) || {};
    var brk = window._measureComponentBreakdown({ position: position, issues: issues }, pm, { labelFn: issueLabel });
    var withStance = brk.components.filter(function (c) { return c.hasStance; });
    if (!withStance.length) return null;
    var con = 0, against = 0;
    withStance.forEach(function (c) { if (c.verdict === 'consistent') con++; else if (c.verdict === 'contradicts') against++; });
    var rows = withStance.map(function (c) {
      var v = VERDICT[c.verdict];
      return '<div class="bd-svd-row"><span class="bd-svd-issue">' + esc(c.label) + '</span>' +
        (v ? '<span class="bd-v ' + v.cls + '">' + esc(v.label) + '</span>' : '') + '</div>';
    }).join('');
    var summary = (con ? '<span class="bd-v bd-v-consistent">✓ ' + con + '</span>' : '') +
      (against ? '<span class="bd-v bd-v-contradicts">⚠ ' + against + '</span>' : '');
    return { summary: summary, rows: rows, hasContradiction: against > 0 };
  }

  // ── section builders ────────────────────────────────────────────────────────
  function omnibusSection(m, issues) {
    if (!issues || !issues.length) return '';
    // Primary first, then heaviest-weighted, so the breakdown reads in order of import.
    var ordered = issues.slice().sort(function (a, b) {
      return (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0) || (b.weight || 0) - (a.weight || 0);
    });
    var adv = 0, opp = 0;
    ordered.forEach(function (it) { if (it.supportMeaning === 'yea_opposes') opp++; else adv++; });
    var lead = ordered.length >= 2
      ? 'This bill bundles <strong>' + ordered.length + ' issues</strong> into one vote — so a single Yea or Nay is really a decision on each of these.'
      : 'This is a single-issue measure.';
    // At-a-glance summary of which way a Yea cuts across the bundle.
    var summary = ordered.length >= 2
      ? '<div class="bd-omni-summary">' +
          '<span class="bd-eff bd-eff-adv">▲ Advances ' + adv + '</span>' +
          (opp ? '<span class="bd-eff bd-eff-opp">▼ Cuts against ' + opp + '</span>' : '') +
        '</div>'
      : '';
    var rows = ordered.map(function (it) {
      var opposes = it.supportMeaning === 'yea_opposes';
      var effCls = opposes ? 'bd-eff-opp' : 'bd-eff-adv';
      var effTxt = opposes ? 'A Yea cuts against this' : 'A Yea advances this';
      return '<div class="bd-omni-row' + (opposes ? ' bd-omni-opp' : '') + '">' +
        '<div class="bd-omni-head">' +
          '<button type="button" class="bd-omni-issue bd-omni-link" data-issue="' + escAttr(it.issueKey) + '" title="See the ' + escAttr(issueLabel(it.issueKey)) + ' spotlight">' + esc(issueLabel(it.issueKey)) + '</button>' +
          (it.isPrimary ? '<span class="bd-omni-primary">Primary</span>' : '') +
          '<span class="bd-eff ' + effCls + '">' + effTxt + '</span>' +
        '</div>' +
        (it.rationale ? '<div class="bd-omni-why">' + esc(it.rationale) + '</div>' : '') +
      '</div>';
    }).join('');
    return '<section class="bd-sec"><h3 class="bd-h">📦 What’s inside this vote</h3>' +
      '<p class="bd-lead">' + lead + '</p>' + summary + rows + '</section>';
  }

  function rollcallsSection(m, issues, rollcalls) {
    if (!rollcalls || !rollcalls.length) {
      return '<section class="bd-sec"><h3 class="bd-h">🗳️ Roll-call votes</h3><p class="bd-empty">No recorded roll-call votes for this measure yet.</p></section>';
    }
    var blocks = rollcalls.map(function (rc) {
      var t = rc.totals || {};
      var tally = ['yea', 'nay', 'present', 'notVoting'].map(function (k) {
        if (t[k] == null) return '';
        var lb = k === 'notVoting' ? 'Not voting' : k.charAt(0).toUpperCase() + k.slice(1);
        return '<span class="bd-tally bd-tally-' + k + '">' + lb + ' ' + t[k] + '</span>';
      }).filter(Boolean).join('');
      var head = '<div class="bd-rc-head">' +
        '<span class="bd-rc-q">' + esc(rc.question || 'Vote') + '</span>' +
        '<span class="bd-rc-meta">' + [chamberLabel(rc.chamber), fmtDate(rc.voteDate), rc.result ? statusLabelResult(rc.result) : ''].filter(Boolean).join(' · ') + '</span>' +
        '</div>' + (tally ? '<div class="bd-tallies">' + tally + '</div>' : '');

      var votes = (rc.votes || []).slice();
      var rows = '';
      if (votes.length) {
        // Viewer's own reps first, then Yea, Nay, Present; alpha within each.
        var rank = { yea: 1, nay: 2, present: 3, not_voting: 4 };
        votes.sort(function (a, b) {
          var la = isLocal(a.politicianId), lb = isLocal(b.politicianId);
          if (la !== lb) return la ? -1 : 1;
          var ra = rank[a.position] || 5, rb = rank[b.position] || 5;
          if (ra !== rb) return ra - rb;
          return nameFor(a.politicianId).localeCompare(nameFor(b.politicianId));
        });
        var heavy = votes.length > 60; // keep the DOM light on very large roll calls
        rows = votes.map(function (v) {
          var pos = v.position;
          var pcls = pos === 'yea' ? 'bd-pos-yea' : pos === 'nay' ? 'bd-pos-nay' : 'bd-pos-neutral';
          var plabel = pos === 'yea' ? 'Yea' : pos === 'nay' ? 'Nay' : pos === 'present' ? 'Present' : pos === 'not_voting' ? 'Not voting' : pos;
          var relTag = isLocal(v.politicianId) ? '<span class="bd-rel">Your rep</span>' : '';
          var svd = heavy ? null : memberSayVsDo(v.politicianId, pos, issues);
          var nameBtn = '<button type="button" class="bd-vote-name" data-pid="' + escAttr(v.politicianId) + '">' + esc(nameFor(v.politicianId)) + '</button>';
          if (svd) {
            return '<details class="bd-vote-row bd-vote-exp' + (svd.hasContradiction ? ' bd-vote-contra' : '') + '">' +
              '<summary class="bd-vote-sum">' + nameBtn + relTag +
                '<span class="bd-pos ' + pcls + '">' + plabel + '</span>' +
                '<span class="bd-svd-mini">' + svd.summary + '</span>' +
              '</summary>' +
              '<div class="bd-svd-body">' + svd.rows + '</div>' +
            '</details>';
          }
          return '<div class="bd-vote-row">' + nameBtn + relTag + '<span class="bd-pos ' + pcls + '">' + plabel + '</span></div>';
        }).join('');
        if (heavy) rows = '<p class="bd-note">Say-vs-do per member is available on smaller roll calls; open a profile for the full picture.</p>' + rows;
      } else {
        rows = '<p class="bd-empty">Individual member votes for this roll call are not in the record yet.</p>';
      }
      var src = rc.source && rc.source.url
        ? '<a class="bd-src" href="' + escAttr(rc.source.url) + '" target="_blank" rel="noopener">🔗 ' + esc(rc.source.label || 'Official roll call') + '</a>' : '';
      return '<div class="bd-rc">' + head + '<div class="bd-votes">' + rows + '</div>' + src + '</div>';
    }).join('');
    return '<section class="bd-sec"><h3 class="bd-h">🗳️ Roll-call votes</h3>' + blocks + '</section>';
  }
  function statusLabelResult(r) { return String(r || '').replace(/_/g, ' ').replace(/\b\w/, function (c) { return c.toUpperCase(); }); }

  function sponsorsSection(m, positions) {
    var sponsors = [];
    var seen = {};
    if (m.sponsorId) { sponsors.push({ pid: m.sponsorId, role: 'Sponsor' }); seen[m.sponsorId] = 1; }
    (positions || []).forEach(function (p) {
      var role = p.actionType === 'sponsor' ? 'Sponsor' : p.actionType === 'cosponsor' ? 'Cosponsor' : null;
      if (!role || seen[p.politicianId]) return;
      seen[p.politicianId] = 1;
      sponsors.push({ pid: p.politicianId, role: role, source: p.source });
    });
    if (!sponsors.length) return '';
    var chips = sponsors.map(function (s) {
      return '<button type="button" class="bd-person" data-pid="' + escAttr(s.pid) + '">' +
        '<span class="bd-person-name">' + esc(nameFor(s.pid)) + '</span>' +
        '<span class="bd-person-role">' + esc(s.role) + '</span></button>';
    }).join('');
    return '<section class="bd-sec"><h3 class="bd-h">✍️ Sponsors &amp; cosponsors</h3><div class="bd-people">' + chips + '</div></section>';
  }

  // Key member actions that aren't roll-call votes or sponsorships: on-record
  // statements, committee votes, amicus briefs, litigation. Surfaces vr_positions the
  // sponsors section doesn't (e.g., the bipartisan authors of an amendment), each with
  // its note and source. Degrades to nothing when there are none.
  var ACTION_LABEL = {
    statement: 'On record', committee_vote: 'Committee vote', amicus: 'Amicus brief',
    plaintiff: 'Plaintiff', cosponsor: 'Cosponsor', sponsor: 'Sponsor'
  };
  function memberActionsSection(m, positions) {
    var rows = (positions || []).filter(function (p) {
      return p.actionType && p.actionType !== 'sponsor' && p.actionType !== 'cosponsor';
    });
    if (!rows.length) return '';
    var html = rows.map(function (p) {
      var eff = (p.supports === true)
        ? '<span class="bd-eff bd-eff-adv">Supported</span>'
        : (p.supports === false ? '<span class="bd-eff bd-eff-opp">Opposed</span>' : '');
      var src = (p.source && p.source.url)
        ? '<a class="bd-src" href="' + escAttr(p.source.url) + '" target="_blank" rel="noopener">🔗 source</a>' : '';
      return '<div class="bd-omni-row">' +
        '<div class="bd-omni-head">' +
          '<button type="button" class="bd-vote-name" data-pid="' + escAttr(p.politicianId) + '">' + esc(nameFor(p.politicianId)) + '</button>' +
          '<span class="bd-prov-tag">' + esc(ACTION_LABEL[p.actionType] || p.actionType) + '</span>' + eff +
        '</div>' +
        (p.note ? '<div class="bd-omni-why">' + esc(p.note) + ' ' + src + '</div>' : (src ? '<div class="bd-omni-why">' + src + '</div>' : '')) +
      '</div>';
    }).join('');
    return '<section class="bd-sec"><h3 class="bd-h">🧭 Key member actions</h3>' +
      '<p class="bd-lead">On-record actions by members on this measure beyond a floor roll call.</p>' + html + '</section>';
  }

  var STAGE_LABEL = {
    introduced: 'Introduced', referred_committee: 'Referred to committee',
    reported_committee: 'Reported from committee', passed_house: 'Passed House',
    passed_senate: 'Passed Senate', resolving_differences: 'Resolving differences',
    to_president: 'To the President', enacted: 'Enacted', vetoed: 'Vetoed',
    veto_overridden: 'Veto overridden', failed: 'Failed', other: 'Action'
  };

  // The real legislative timeline from vr_measure_actions when present; otherwise a
  // lightweight timeline synthesized from introduction + roll calls + status (so a
  // bill with no actions rows still reads sensibly). Phase 3 replaces the old
  // always-synthesized version with the sourced table.
  function timelineSection(m, rollcalls, actions) {
    var events = [];
    if (actions && actions.length) {
      events = actions.map(function (a) {
        return {
          date: a.actionDate,
          label: (STAGE_LABEL[a.stage] || a.stage) + (a.chamber && a.stage !== 'introduced' && a.stage.indexOf('passed_') !== 0 ? '' : ''),
          sub: a.text || '',
          url: a.source && a.source.url
        };
      });
    } else {
      if (m.introducedAt) events.push({ date: m.introducedAt, label: 'Introduced', sub: chamberLabel(m.chamber) });
      (rollcalls || []).forEach(function (rc) {
        events.push({
          date: rc.voteDate,
          label: (chamberLabel(rc.chamber) ? chamberLabel(rc.chamber) + ' — ' : '') + (rc.question || 'Vote'),
          sub: [rc.result ? statusLabelResult(rc.result) : '', rc.totals && rc.totals.yea != null ? (rc.totals.yea + '–' + (rc.totals.nay != null ? rc.totals.nay : '?')) : ''].filter(Boolean).join(' · '),
          url: rc.source && rc.source.url
        });
      });
      if (m.status && ['enacted', 'vetoed', 'failed'].indexOf(m.status) !== -1) {
        events.push({ date: null, label: statusLabel(m.status), sub: 'Final status' });
      }
      events.sort(function (a, b) { return (a.date ? new Date(a.date).getTime() : Infinity) - (b.date ? new Date(b.date).getTime() : Infinity); });
    }
    if (events.length < 2) return '';
    var items = events.map(function (e) {
      return '<li class="bd-tl-item"><span class="bd-tl-dot" aria-hidden="true"></span>' +
        '<div class="bd-tl-body"><span class="bd-tl-date">' + (e.date ? esc(fmtDate(e.date)) : '') + '</span>' +
        '<span class="bd-tl-label">' + (e.url ? '<a href="' + escAttr(e.url) + '" target="_blank" rel="noopener">' + esc(e.label) + '</a>' : esc(e.label)) + '</span>' +
        (e.sub ? '<span class="bd-tl-sub">' + esc(e.sub) + '</span>' : '') + '</div></li>';
    }).join('');
    return '<section class="bd-sec"><h3 class="bd-h">🕒 How it moved</h3><ul class="bd-tl">' + items + '</ul></section>';
  }

  // Named omnibus provisions (vr_measure_provisions) — one level finer than the
  // component issues, each with which way a Yea cuts and a source.
  function provisionsSection(m, provisions) {
    if (!provisions || !provisions.length) return '';
    var rows = provisions.map(function (p) {
      var opposes = p.supportMeaning === 'yea_opposes';
      var eff = '<span class="bd-eff ' + (opposes ? 'bd-eff-opp' : 'bd-eff-adv') + '">' + (opposes ? 'A Yea cuts against this' : 'A Yea advances this') + '</span>';
      var tag = p.issueKey ? '<span class="bd-prov-tag">' + esc(issueLabel(p.issueKey)) + '</span>' : '';
      var src = (p.source && p.source.url) ? '<a class="bd-src" href="' + escAttr(p.source.url) + '" target="_blank" rel="noopener">🔗 source</a>' : '';
      return '<div class="bd-omni-row">' +
        '<div class="bd-omni-head"><span class="bd-omni-issue">' + esc(p.label) + '</span>' + tag + eff + '</div>' +
        (p.description ? '<div class="bd-omni-why">' + esc(p.description) + ' ' + src + '</div>' : (src ? '<div class="bd-omni-why">' + src + '</div>' : '')) +
      '</div>';
    }).join('');
    return '<section class="bd-sec"><h3 class="bd-h">🧩 Key provisions</h3>' +
      '<p class="bd-lead">The named pieces bundled into this measure, and which way a Yea cuts on each.</p>' + rows + '</section>';
  }

  // Distributional Impact Ledger ("Who It Affects"). Fully delegated to the standalone
  // PDXImpactLedger module so the neutral cohort bar / reasons / evidence badges live in
  // one place and can be reused elsewhere. Degrades to nothing when the module or the
  // sourced data is absent — this panel never fabricates an impact.
  function impactLedgerSection(data) {
    try {
      var il = G('PDXImpactLedger');
      if (il && typeof il.renderHTML === 'function') return il.renderHTML(data) || '';
    } catch (e) {}
    return '';
  }

  function relatedSection(m, issues) {
    var parts = [];
    // Link back into the central discovery hub: searching the bill number in the
    // All-Seeing Eye surfaces this bill alongside every related politician, issue and
    // Spotlight in one place. Always available (a bill always has a number).
    if (m && m.number) {
      parts.push('<div class="bd-rel-group"><div class="bd-rel-lab">Find everything connected</div>' +
        '<button type="button" class="bd-btn bd-eye" data-eye="' + escAttr(m.number) + '">🔍 Search this in the All-Seeing Eye</button></div>');
    }
    // Explore-these-issues jump chips + a link back into the Legislation library,
    // filtered to this bill's primary issue. Always available when the bill has issues.
    if (issues && issues.length) {
      var primaryKey = (issues.find(function (i) { return i.isPrimary; }) || issues[0] || {}).issueKey || '';
      var chips = issues.slice(0, 8).map(function (it) {
        return '<button type="button" class="bd-person bd-issuejump" data-issue="' + escAttr(it.issueKey) + '">' +
          '<span class="bd-person-name">🔎 ' + esc(issueLabel(it.issueKey)) + '</span>' +
          '<span class="bd-person-role">Issue spotlight</span></button>';
      }).join('');
      parts.push('<div class="bd-rel-group"><div class="bd-rel-lab">Explore these issues</div><div class="bd-people">' + chips + '</div>' +
        (primaryKey ? '<button type="button" class="bd-btn bd-legis" data-legis="' + escAttr(primaryKey) + '">🏛️ Browse related bills in the Legislation library</button>' : '') +
      '</div>');
    }
    // Issue Spotlights tied to any of this bill's component issues (when available).
    try {
      var sp = G('PDXSpotlight');
      if (sp && typeof sp.forIssueKey === 'function') {
        var seen = {}, spots = [];
        (issues || []).forEach(function (it) {
          (sp.forIssueKey(it.issueKey) || []).forEach(function (s) {
            if (s && s.slug && !seen[s.slug]) { seen[s.slug] = 1; spots.push(s); }
          });
        });
        if (spots.length) {
          parts.push('<div class="bd-rel-group"><div class="bd-rel-lab">Issue Spotlights</div><div class="bd-people">' +
            spots.slice(0, 6).map(function (s) {
              return '<button type="button" class="bd-person bd-spot" data-slug="' + escAttr(s.slug) + '">' +
                '<span class="bd-person-name">📌 ' + esc(s.title || s.slug) + '</span>' +
                (s.place ? '<span class="bd-person-role">' + esc(s.place) + '</span>' : '') + '</button>';
            }).join('') + '</div></div>');
        }
      }
    } catch (e) {}
    if (!parts.length) return '';
    return '<section class="bd-sec"><h3 class="bd-h">🔗 Related &amp; explore</h3>' + parts.join('') + '</section>';
  }

  // Open the Issue View / Spotlight for an issue key (with graceful fallbacks).
  function openIssue(key) {
    if (!key) return;
    try { if (window.PDXIssueView && window.PDXIssueView.open) { close(); window.PDXIssueView.open(key); return; } } catch (e) {}
    try { if (window.PDXDigitalLibrary && window.PDXDigitalLibrary.focus) { close(); window.PDXDigitalLibrary.focus({ mode: 'library', issue: key }); return; } } catch (e) {}
  }
  // Jump into the Legislation library filtered by an issue.
  function browseLegislation(key) {
    try { if (window.PDXDigitalLibrary && window.PDXDigitalLibrary.focus) { close(); window.PDXDigitalLibrary.focus({ mode: 'legislation', issue: key || '' }); return; } } catch (e) {}
  }

  // ── render ──────────────────────────────────────────────────────────────────
  // A compact "at a glance" strip of stat chips under the header — the shape of the
  // bill in one scannable row (how many issues it bundles, how much of a record it
  // has, where it stands). Purely presentational; everything is data already loaded.
  function glanceStrip(m, issues, data) {
    var chips = [];
    if (issues && issues.length >= 2) chips.push('<span class="bd-glance bd-glance-omni">📦 ' + issues.length + ' issues bundled</span>');
    var rcs = (data.rollcalls || []);
    if (rcs.length) chips.push('<span class="bd-glance">🗳️ ' + rcs.length + ' roll call' + (rcs.length !== 1 ? 's' : '') + '</span>');
    var votes = 0; rcs.forEach(function (r) { votes += (r.votes || []).length; });
    if (votes) chips.push('<span class="bd-glance">👥 ' + votes + ' recorded votes</span>');
    var prov = (data.provisions || []).length;
    if (prov) chips.push('<span class="bd-glance">🧩 ' + prov + ' key provision' + (prov !== 1 ? 's' : '') + '</span>');
    var pos = (data.positions || []).length;
    if (pos) chips.push('<span class="bd-glance">👤 ' + pos + ' member action' + (pos !== 1 ? 's' : '') + '</span>');
    if (m.status) chips.push('<span class="bd-glance">🚦 ' + esc(statusLabel(m.status)) + '</span>');
    return chips.length ? '<div class="bd-glance-row">' + chips.join('') + '</div>' : '';
  }

  function bodyHtml(data) {
    var m = data.measure || {};
    var issues = data.issues || [];
    _current = {
      id: (m.id != null) ? m.id : null, number: m.number || '', congress: m.congress || '',
      title: m.shortTitle || m.title || m.number || 'Bill', status: m.status || '', chamber: m.chamber || '',
      source: m.source || null
    };
    var status = m.status ? '<span class="bd-status bd-s-' + esc(m.status) + '">' + esc(statusLabel(m.status)) + '</span>' : '';
    var omni = issues.length >= 2 ? '<span class="bd-omnibadge">📦 Omnibus · ' + issues.length + ' issues</span>' : '';
    var meta = [chamberLabel(m.chamber), m.congress ? (m.congress + 'th Congress') : ''].filter(Boolean).join(' · ');
    var src = (m.source && m.source.url)
      ? '<a class="bd-src bd-src-top" href="' + escAttr(m.source.url) + '" target="_blank" rel="noopener">🔗 ' + esc(m.source.label || 'Official record') + '</a>' : '';
    var following = false;
    try { following = !!(G('PDXBills') && G('PDXBills').isFollowed && G('PDXBills').isFollowed(_current)); } catch (e) {}
    var actionsBar =
      '<div class="bd-actions">' +
        '<button type="button" class="bd-btn bd-follow' + (following ? ' is-on' : '') + '" data-bd-follow aria-pressed="' + following + '">' +
          (following ? '★ Following' : '☆ Follow this bill') + '</button>' +
        '<button type="button" class="bd-btn bd-share" data-bd-share>🔗 Share</button>' +
      '</div>';
    return '<div class="bd-head">' +
        '<div class="bd-head-top"><span class="bd-num">' + esc(m.number || 'Measure') + '</span>' + status + omni + '</div>' +
        '<h2 class="bd-title">' + esc(m.title || '') + '</h2>' +
        (meta ? '<div class="bd-meta">' + esc(meta) + '</div>' : '') +
        actionsBar +
        (m.summary ? '<p class="bd-summary">' + esc(m.summary) + '</p>' : '') +
        src +
      '</div>' +
      glanceStrip(m, issues, data) +
      omnibusSection(m, issues) +
      provisionsSection(m, data.provisions) +
      impactLedgerSection(data) +
      rollcallsSection(m, issues, data.rollcalls) +
      sponsorsSection(m, data.positions) +
      memberActionsSection(m, data.positions) +
      timelineSection(m, data.rollcalls, data.actions) +
      relatedSection(m, issues);
  }

  function ensureOverlay() {
    var ov = document.getElementById('pdx-bd-overlay');
    if (ov) return ov;
    injectCss();
    ov = document.createElement('div');
    ov.id = 'pdx-bd-overlay';
    ov.className = 'bd-overlay';
    ov.hidden = true;
    ov.innerHTML =
      '<div class="bd-backdrop" data-bd-close></div>' +
      '<div class="bd-panel" role="dialog" aria-modal="true" aria-label="Bill detail">' +
        '<button type="button" class="bd-close" data-bd-close aria-label="Close">×</button>' +
        '<div class="bd-scroll" id="pdx-bd-scroll"></div>' +
      '</div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target && e.target.hasAttribute('data-bd-close')) close(); });
    // Delegated actions: open a profile or a spotlight from inside the panel.
    ov.addEventListener('click', function (e) {
      var pb = e.target.closest ? e.target.closest('[data-pid]') : null;
      if (pb) { var pid = pb.getAttribute('data-pid'); if (pid && typeof window.showProfile === 'function') { close(); window.showProfile(pid); } return; }
      var sb = e.target.closest ? e.target.closest('[data-slug]') : null;
      if (sb) { var slug = sb.getAttribute('data-slug'); if (slug && window.PDXSpotlight && window.PDXSpotlight.open) { close(); window.PDXSpotlight.open(slug); } return; }
      var ib = e.target.closest ? e.target.closest('[data-issue]') : null;
      if (ib) { openIssue(ib.getAttribute('data-issue')); return; }
      var lb = e.target.closest ? e.target.closest('[data-legis]') : null;
      if (lb) { browseLegislation(lb.getAttribute('data-legis')); return; }
      var eb = e.target.closest ? e.target.closest('[data-eye]') : null;
      if (eb) {
        var num = eb.getAttribute('data-eye');
        close();
        if (window.PDXEye && typeof window.PDXEye.search === 'function') window.PDXEye.search(num);
        else if (window.PDXEye && typeof window.PDXEye.focus === 'function') window.PDXEye.focus();
        return;
      }
      var fb = e.target.closest ? e.target.closest('[data-bd-follow]') : null;
      if (fb) { toggleFollow(fb); return; }
      var shb = e.target.closest ? e.target.closest('[data-bd-share]') : null;
      if (shb) { share(shb); return; }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !ov.hidden) close(); });
    return ov;
  }

  // Toggle follow for the bill on screen and reflect it on the button.
  function toggleFollow(btn) {
    var bills = G('PDXBills');
    if (!bills || !bills.toggleFollow || !_current) return;
    var on = bills.toggleFollow(_current);
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.innerHTML = on ? '★ Following' : '☆ Follow this bill';
  }

  // A stable, shareable deep link to this bill (congress + number).
  function shareUrl() {
    if (!_current) return location.href;
    return location.origin + location.pathname +
      '#bill/' + encodeURIComponent(_current.congress || '') + '/' + encodeURIComponent(_current.number || '');
  }
  // Reflect the open bill in the URL without triggering the hashchange handler
  // (history.replaceState does not fire hashchange), so a shared/refreshed link
  // reopens the panel while ordinary opens stay loop-free.
  function syncHash() {
    if (!_current) return;
    try {
      var h = '#bill/' + encodeURIComponent(_current.congress || '') + '/' + encodeURIComponent(_current.number || '');
      if (location.hash !== h) history.replaceState(null, '', location.pathname + location.search + h);
    } catch (e) {}
  }
  function clearHash() {
    try { if (/^#bill\//.test(location.hash || '')) history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  }

  // Share the bill: use the native share sheet on touch devices, and fall back to
  // copying the deep link to the clipboard (with a prompt of last resort).
  function share(btn) {
    if (!_current) return;
    var url = shareUrl();
    var title = _current.number ? (_current.number + ' — ' + _current.title) : (_current.title || 'Bill');
    var coarse = false;
    try { coarse = window.matchMedia && window.matchMedia('(pointer:coarse)').matches; } catch (e) {}
    if (navigator.share && coarse) {
      try { navigator.share({ title: title, text: title, url: url }).catch(function () {}); return; }
      catch (e) {}
    }
    var done = function () { var t = btn.innerHTML; btn.innerHTML = '✓ Link copied'; setTimeout(function () { btn.innerHTML = t; }, 1600); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).then(done, function () { window.prompt('Copy this link', url); }); return; }
    } catch (e) {}
    window.prompt('Copy this link', url);
  }

  function show(html) {
    var ov = ensureOverlay();
    var scroll = document.getElementById('pdx-bd-scroll');
    if (scroll) { scroll.innerHTML = html; scroll.scrollTop = 0; }
    ov.hidden = false;
    document.documentElement.classList.add('bd-lock');
  }
  function close() {
    var ov = document.getElementById('pdx-bd-overlay');
    if (ov) ov.hidden = true;
    document.documentElement.classList.remove('bd-lock');
    clearHash();
  }

  function renderLoading() { show('<div class="bd-loading"><span class="bd-spin"></span> Loading bill…</div>'); }
  function renderError(card) {
    var src = card && card.source && card.source.url;
    show('<div class="bd-loading">Could not load this bill right now.' +
      (src ? ' <a class="bd-src" href="' + escAttr(src) + '" target="_blank" rel="noopener">Open the official record →</a>' : '') + '</div>');
  }

  // Minimal _current from a card, so follow / share / deep-link keep working in the
  // lite fallback below.
  function liteCurrent(card) {
    return {
      id: (card && card.id != null) ? card.id : null, number: (card && card.number) || '',
      congress: (card && card.congress) || '', title: (card && (card.shortTitle || card.title || card.number)) || 'Bill',
      status: (card && card.status) || '', chamber: (card && card.chamber) || '', source: (card && card.source) || null
    };
  }
  // Fallback detail rendered entirely from the card we already have — used whenever
  // the live measure (roll calls, sponsors, timeline) can't be fetched: the Voting
  // Record API is momentarily unavailable, or the card came from the inline light
  // index (which carries no DB id to resolve). A click then always opens something
  // useful and fully sourced — the header, summary, the issue breakdown (each issue
  // links to its Spotlight) and the official record — instead of a dead end.
  function liteBodyHtml(card) {
    var status = card.status ? '<span class="bd-status bd-s-' + esc(card.status) + '">' + esc(statusLabel(card.status)) + '</span>' : '';
    var keys = (card.issueKeys || []).filter(Boolean);
    var primary = card.primaryIssue || keys[0] || '';
    var ordered = [];
    (primary ? [primary] : []).concat(keys).forEach(function (k) { if (k && ordered.indexOf(k) < 0) ordered.push(k); });
    var omni = ordered.length >= 2 ? '<span class="bd-omnibadge">📦 ' + ordered.length + ' issues</span>' : '';
    var meta = [chamberLabel(card.chamber), card.congress ? (card.congress + 'th Congress') : ''].filter(Boolean).join(' · ');
    var src = (card.source && card.source.url)
      ? '<a class="bd-src bd-src-top" href="' + escAttr(card.source.url) + '" target="_blank" rel="noopener">🔗 ' + esc((card.source && card.source.label) || 'Official record') + '</a>' : '';
    var chips = ordered.map(function (k) {
      return '<button type="button" class="bd-omni-issue bd-omni-link" data-issue="' + escAttr(k) + '" title="See the ' + escAttr(issueLabel(k)) + ' spotlight">' + esc(issueLabel(k)) + '</button>';
    }).join('');
    var breakdown = ordered.length
      ? '<section class="bd-sec"><h3 class="bd-h">📦 What’s inside this vote</h3>' +
          '<p class="bd-lead">' + (ordered.length >= 2
            ? 'This bill bundles <strong>' + ordered.length + ' issues</strong> into one vote — open any Spotlight to see where people stand.'
            : 'Open the Spotlight to see where people stand.') + '</p>' +
          '<div class="bd-lite-chips">' + chips + '</div></section>'
      : '';
    return '<div class="bd-head">' +
        '<div class="bd-head-top"><span class="bd-num">' + esc(card.number || 'Measure') + '</span>' + status + omni + '</div>' +
        '<h2 class="bd-title">' + esc(card.title || card.shortTitle || '') + '</h2>' +
        (meta ? '<div class="bd-meta">' + esc(meta) + '</div>' : '') +
        (card.summary ? '<p class="bd-summary">' + esc(card.summary) + '</p>' : '') +
        src +
      '</div>' +
      breakdown +
      '<section class="bd-sec"><p class="bd-empty">Live roll-call votes and sponsors aren’t available right now. ' +
        (card.source && card.source.url ? 'Open the official record above for the full text.' : 'Please try again in a moment.') + '</p></section>';
  }
  // Show the lite panel for a card (sets _current + hash). Returns true when it could.
  function showLite(card) {
    if (!card) return false;
    _current = liteCurrent(card);
    show(liteBodyHtml(card));
    syncHash();
    return true;
  }

  // Resolve a card ref (numeric id, or a bill number like "H.R. 1") to a measure id,
  // then fetch + render. Falls back to a card-only lite panel whenever the live detail
  // can't be loaded, so a click never dead-ends.
  function open(ref) {
    var bills = G('PDXBills');
    var inlineCard = (bills && bills.listSync) ? findByNumber(bills.listSync().items, ref) : null;
    if (!bills || typeof bills.get !== 'function') { // no client module → best-effort
      if (showLite(inlineCard)) return true;
      if (inlineCard && inlineCard.source && inlineCard.source.url) window.open(inlineCard.source.url, '_blank', 'noopener');
      return false;
    }
    renderLoading();
    resolveId(ref, bills).then(function (id) {
      var card = inlineCard || findByNumber((bills.listSync ? bills.listSync().items : []), ref);
      if (id == null) { if (!showLite(card)) renderError(card); return; }
      bills.get(id).then(function (data) {
        if (data && data.measure) { show(bodyHtml(data)); syncHash(); }
        else if (!showLite(card)) renderError(null);
      }).catch(function () { if (!showLite(card)) renderError(card); });
    }).catch(function () { if (!showLite(inlineCard)) renderError(inlineCard); });
    return true;
  }

  function findByNumber(items, ref) {
    if (!items) return null;
    for (var i = 0; i < items.length; i++) { if (items[i] && (String(items[i].id) === String(ref) || items[i].number === ref)) return items[i]; }
    return null;
  }
  function resolveId(ref, bills) {
    if (/^\d+$/.test(String(ref))) return Promise.resolve(parseInt(ref, 10));
    // A bill number — resolve its id from the live list.
    return bills.list({ pageSize: 100 }).then(function (d) {
      var c = findByNumber(d && d.items, ref);
      return c && c.id != null ? c.id : null;
    }).catch(function () { return null; });
  }

  function injectCss() {
    if (document.getElementById('bd-css')) return;
    var css =
      'html.bd-lock{overflow:hidden;}' +
      '.bd-overlay{position:fixed;inset:0;z-index:9000;display:flex;align-items:flex-start;justify-content:center;}' +
      '.bd-overlay[hidden]{display:none;}' +
      '.bd-backdrop{position:absolute;inset:0;background:rgba(3,6,15,.72);backdrop-filter:blur(3px);}' +
      '.bd-panel{position:relative;z-index:1;width:min(56rem,94vw);max-height:92vh;margin:4vh auto;display:flex;flex-direction:column;' +
        'background:linear-gradient(180deg,#0d1526,#0a0f1e);border:1px solid rgba(159,180,212,.2);border-radius:1rem;box-shadow:0 30px 80px rgba(0,0,0,.6);}' +
      '.bd-close{position:absolute;top:.5rem;right:.6rem;z-index:2;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);' +
        'color:#cbd9ec;font-size:1.3rem;line-height:1;cursor:pointer;border-radius:.5rem;width:2rem;height:2rem;}' +
      '.bd-close:hover{background:rgba(255,255,255,.14);color:#fff;}' +
      '.bd-scroll{overflow-y:auto;padding:1.4rem 1.5rem 2rem;}' +
      '.bd-loading{padding:3rem 1rem;text-align:center;color:#9fb4d4;font:500 .95rem/1.5 "Barlow",sans-serif;}' +
      '.bd-spin{display:inline-block;width:1rem;height:1rem;border:2px solid rgba(159,180,212,.3);border-top-color:#7fb4ff;border-radius:50%;animation:bd-spin .7s linear infinite;vertical-align:-2px;}' +
      '@keyframes bd-spin{to{transform:rotate(360deg);}}' +
      '.bd-head{border-bottom:1px solid rgba(159,180,212,.14);padding-bottom:1rem;margin-bottom:.3rem;}' +
      '.bd-head-top{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin-bottom:.4rem;}' +
      '.bd-num{font:800 .78rem/1 "Barlow Condensed",sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#9ff0bd;background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.35);border-radius:.4rem;padding:.28rem .55rem;}' +
      '.bd-status{font:800 .62rem/1 "Barlow Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;border-radius:.4rem;padding:.26rem .5rem;color:#9ff0bd;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.3);}' +
      '.bd-s-failed,.bd-s-vetoed{color:#fca5a5;background:rgba(248,113,113,.12);border-color:rgba(248,113,113,.35);}' +
      '.bd-s-introduced,.bd-s-pending{color:#cbd9ec;background:rgba(159,180,212,.1);border-color:rgba(159,180,212,.28);}' +
      '.bd-omnibadge{font:700 .62rem/1 "Barlow Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#f6d873;background:rgba(245,200,66,.12);border:1px solid rgba(245,200,66,.35);border-radius:999px;padding:.24rem .5rem;}' +
      '.bd-title{font:800 clamp(1.3rem,3.4vw,1.9rem)/1.12 "Bebas Neue","Barlow Condensed",sans-serif;letter-spacing:.02em;color:#fff;margin:.15rem 0 .35rem;}' +
      '.bd-meta{font:600 .72rem/1.2 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#8aa0c4;}' +
      '.bd-summary{font:500 .92rem/1.55 "Barlow",sans-serif;color:#b9c8e0;margin:.6rem 0 .5rem;}' +
      '.bd-src{display:inline-block;font:600 .78rem/1.3 "Barlow",sans-serif;color:#7fb4ff;text-decoration:none;}' +
      '.bd-src:hover{text-decoration:underline;}' +
      '.bd-src-top{margin-top:.3rem;}' +
      '.bd-sec{margin-top:1.5rem;}' +
      '.bd-h{font:700 1rem/1.1 "Barlow Condensed",sans-serif;letter-spacing:.03em;text-transform:uppercase;color:#fff;margin:0 0 .6rem;}' +
      '.bd-lead{font:500 .86rem/1.5 "Barlow",sans-serif;color:#9fb4d4;margin:0 0 .8rem;}' +
      '.bd-empty,.bd-note{font:500 .82rem/1.5 "Barlow",sans-serif;color:#8aa0c4;}' +
      '.bd-omni-row{border:1px solid rgba(159,180,212,.12);border-left:3px solid rgba(96,165,250,.5);border-radius:.6rem;padding:.6rem .7rem;margin-bottom:.5rem;background:rgba(255,255,255,.02);}' +
      '.bd-omni-opp{border-left-color:rgba(251,146,60,.55);}' +
      '.bd-omni-summary{display:flex;flex-wrap:wrap;gap:.4rem;margin:-.3rem 0 .8rem;}' +
      '.bd-omni-head{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;}' +
      '.bd-omni-issue{font:700 .9rem/1.2 "Barlow Condensed",sans-serif;color:#e6eefc;}' +
      '.bd-omni-link{background:none;border:0;padding:0;cursor:pointer;text-align:left;text-decoration:underline;text-decoration-color:rgba(126,180,255,.35);text-underline-offset:2px;}' +
      '.bd-omni-link:hover{color:#9ec8ff;text-decoration-color:#9ec8ff;}' +
      '.bd-lite-chips{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:.3rem;}' +
      '.bd-glance-row{display:flex;flex-wrap:wrap;gap:.4rem;margin:.1rem 0 1.1rem;}' +
      '.bd-glance{display:inline-flex;align-items:center;gap:.3rem;font:700 .64rem/1 "Barlow Condensed",sans-serif;letter-spacing:.03em;color:#bcd0f0;background:rgba(159,180,212,.08);border:1px solid rgba(159,180,212,.2);border-radius:999px;padding:.32rem .62rem;}' +
      '.bd-glance-omni{color:#f6d873;background:rgba(245,200,66,.12);border-color:rgba(245,200,66,.38);}' +
      '.bd-issuejump .bd-person-name{color:#9ec8ff;}' +
      '.bd-legis{margin-top:.6rem;display:inline-block;}' +
      '.bd-eye{margin-top:.2rem;display:inline-block;}' +
      '.bd-omni-primary{font:800 .54rem/1 "Barlow Condensed",sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#0a0f1e;background:#7fb4ff;border-radius:999px;padding:.14rem .4rem;}' +
      '.bd-eff{font:700 .6rem/1 "Barlow Condensed",sans-serif;letter-spacing:.03em;border-radius:999px;padding:.16rem .45rem;white-space:nowrap;}' +
      '.bd-eff-adv{color:#93c5fd;background:rgba(96,165,250,.14);border:1px solid rgba(96,165,250,.3);}' +
      '.bd-eff-opp{color:#fdba74;background:rgba(251,146,60,.14);border:1px solid rgba(251,146,60,.32);}' +
      '.bd-omni-why{font:500 .78rem/1.45 "Barlow",sans-serif;color:#9fb4d4;margin-top:.35rem;}' +
      '.bd-rc{border:1px solid rgba(159,180,212,.12);border-radius:.7rem;padding:.7rem .8rem;margin-bottom:.7rem;background:rgba(10,15,30,.4);}' +
      '.bd-rc-head{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.4rem;align-items:baseline;}' +
      '.bd-rc-q{font:700 .9rem/1.25 "Barlow Condensed",sans-serif;color:#fff;}' +
      '.bd-rc-meta{font:600 .68rem/1.2 "Barlow Condensed",sans-serif;letter-spacing:.03em;color:#8aa0c4;}' +
      '.bd-tallies{display:flex;flex-wrap:wrap;gap:.35rem;margin:.45rem 0;}' +
      '.bd-tally{font:700 .62rem/1 "Barlow Condensed",sans-serif;letter-spacing:.03em;border-radius:.35rem;padding:.2rem .45rem;color:#cbd9ec;background:rgba(159,180,212,.1);border:1px solid rgba(159,180,212,.2);}' +
      '.bd-tally-yea{color:#9ff0bd;background:rgba(74,222,128,.12);border-color:rgba(74,222,128,.3);}' +
      '.bd-tally-nay{color:#fca5a5;background:rgba(248,113,113,.12);border-color:rgba(248,113,113,.3);}' +
      '.bd-votes{margin-top:.4rem;display:flex;flex-direction:column;gap:.2rem;}' +
      '.bd-vote-row{display:flex;align-items:center;gap:.5rem;padding:.28rem .1rem;border-bottom:1px solid rgba(255,255,255,.04);}' +
      '.bd-vote-sum{display:flex;align-items:center;gap:.5rem;cursor:pointer;list-style:none;padding:.28rem .1rem;}' +
      '.bd-vote-sum::-webkit-details-marker{display:none;}' +
      '.bd-vote-exp>summary:hover{background:rgba(255,255,255,.03);}' +
      '.bd-vote-name{background:none;border:0;color:#cbd9ec;font:600 .84rem/1.2 "Barlow",sans-serif;cursor:pointer;padding:0;text-align:left;}' +
      '.bd-vote-name:hover{color:#9ec8ff;text-decoration:underline;}' +
      '.bd-rel{font:700 .54rem/1 "Barlow Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#7dd3fc;background:rgba(125,211,252,.12);border:1px solid rgba(125,211,252,.3);border-radius:999px;padding:.12rem .38rem;}' +
      '.bd-pos{margin-left:auto;font:700 .62rem/1 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;border-radius:.35rem;padding:.2rem .5rem;white-space:nowrap;}' +
      '.bd-pos-yea{color:#9ff0bd;background:rgba(74,222,128,.14);border:1px solid rgba(74,222,128,.32);}' +
      '.bd-pos-nay{color:#fca5a5;background:rgba(248,113,113,.14);border:1px solid rgba(248,113,113,.32);}' +
      '.bd-pos-neutral{color:#cbd9ec;background:rgba(159,180,212,.12);border:1px solid rgba(159,180,212,.28);}' +
      '.bd-svd-mini{display:inline-flex;gap:.25rem;margin-left:.2rem;}' +
      '.bd-svd-body{padding:.35rem 0 .5rem 1rem;display:flex;flex-direction:column;gap:.2rem;}' +
      '.bd-svd-row{display:flex;align-items:center;justify-content:space-between;gap:.5rem;}' +
      '.bd-svd-issue{font:500 .78rem/1.3 "Barlow",sans-serif;color:#b9c8e0;}' +
      '.bd-v{font:700 .58rem/1 "Barlow Condensed",sans-serif;letter-spacing:.03em;text-transform:uppercase;border-radius:999px;padding:.14rem .4rem;white-space:nowrap;}' +
      '.bd-v-consistent{color:#6ee7a0;background:rgba(74,222,128,.16);border:1px solid rgba(74,222,128,.35);}' +
      '.bd-v-contradicts{color:#fca5a5;background:rgba(248,113,113,.18);border:1px solid rgba(248,113,113,.4);}' +
      '.bd-v-mixed{color:#93c5fd;background:rgba(96,165,250,.16);border:1px solid rgba(96,165,250,.35);}' +
      '.bd-v-neutral{color:#9fb4d4;background:rgba(159,180,212,.12);border:1px solid rgba(159,180,212,.28);}' +
      '.bd-people{display:flex;flex-wrap:wrap;gap:.45rem;}' +
      '.bd-person{display:inline-flex;flex-direction:column;align-items:flex-start;gap:.05rem;cursor:pointer;text-align:left;' +
        'background:rgba(255,255,255,.04);border:1px solid rgba(159,180,212,.16);border-radius:.6rem;padding:.4rem .6rem;}' +
      '.bd-person:hover{border-color:rgba(96,165,250,.45);background:rgba(96,165,250,.08);}' +
      '.bd-person-name{font:700 .82rem/1.2 "Barlow Condensed",sans-serif;color:#e6eefc;}' +
      '.bd-person-role{font:600 .6rem/1 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#8aa0c4;}' +
      '.bd-rel-group{margin-bottom:.6rem;}' +
      '.bd-rel-lab{font:700 .64rem/1 "Barlow Condensed",sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#7d97bd;margin-bottom:.35rem;}' +
      '.bd-tl{list-style:none;margin:0;padding:0 0 0 .3rem;}' +
      '.bd-tl-item{display:flex;gap:.6rem;padding:.1rem 0 .6rem;border-left:2px solid rgba(159,180,212,.18);margin-left:.3rem;padding-left:.8rem;position:relative;}' +
      '.bd-tl-dot{position:absolute;left:-5px;top:.3rem;width:8px;height:8px;border-radius:50%;background:#7fb4ff;}' +
      '.bd-tl-body{display:flex;flex-direction:column;gap:.05rem;}' +
      '.bd-tl-date{font:700 .6rem/1 "Barlow Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#8aa0c4;}' +
      '.bd-tl-label{font:600 .86rem/1.3 "Barlow",sans-serif;color:#e6eefc;}' +
      '.bd-tl-label a{color:#9ec8ff;text-decoration:none;}.bd-tl-label a:hover{text-decoration:underline;}' +
      '.bd-tl-sub{font:500 .72rem/1.3 "Barlow Condensed",sans-serif;letter-spacing:.03em;color:#8aa0c4;}' +
      '@media (max-width:640px){.bd-panel{width:100vw;max-height:100vh;margin:0;border-radius:0;}.bd-scroll{padding:1.1rem 1rem 2rem;}' +
        '.bd-actions{gap:.4rem;}.bd-actions .bd-btn{flex:1 1 auto;text-align:center;}' +
        '.bd-rc{padding:.6rem .6rem;}.bd-rc-head{flex-direction:column;align-items:flex-start;gap:.15rem;}' +
        '.bd-vote-row,.bd-vote-sum{flex-wrap:wrap;}.bd-pos{margin-left:auto;}' +
        '.bd-svd-mini{margin-left:0;flex-basis:100%;}.bd-title{font-size:1.35rem;}}' +
      // Phase 3: follow/share actions + provision tag.
      '.bd-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin:.7rem 0 .2rem;}' +
      '.bd-btn{cursor:pointer;font:700 .74rem/1 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;' +
        'color:#cbd9ec;background:rgba(159,180,212,.08);border:1px solid rgba(159,180,212,.22);border-radius:999px;padding:.5rem .9rem;transition:background .15s,border-color .15s,color .15s;}' +
      '.bd-btn:hover{background:rgba(159,180,212,.16);color:#fff;}' +
      '.bd-follow.is-on{color:#f6d873;background:rgba(245,200,66,.14);border-color:rgba(245,200,66,.45);}' +
      '.bd-prov-tag{font:600 .58rem/1 "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#8aa0c4;' +
        'background:rgba(159,180,212,.08);border:1px solid rgba(159,180,212,.16);border-radius:999px;padding:.16rem .45rem;}';
    var st = document.createElement('style');
    st.id = 'bd-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  window.PDXBillDetail = { open: open, close: close };

  // ── Deep-link routing ───────────────────────────────────────────────────────
  // A shareable link is #bill/<congress>/<number>. Open the panel when such a hash
  // is present on load or changes, resolving the natural key to a measure id.
  function openFromHash() {
    var h = String(location.hash || '');
    var m = h.match(/^#bill\/([^/]*)\/(.+)$/);
    if (!m) return;
    var congress = decodeURIComponent(m[1] || '');
    var number = decodeURIComponent(m[2] || '');
    // Already showing this bill (e.g. we just set the hash on open) — do nothing.
    var ov = document.getElementById('pdx-bd-overlay');
    if (ov && !ov.hidden && _current && _current.number === number &&
        String(_current.congress || '') === String(congress || '')) return;
    var bills = G('PDXBills');
    if (!bills || !bills.list) { return; }
    bills.list({ pageSize: 100, congress: congress || undefined }).then(function (d) {
      var items = (d && d.items) || [];
      var hit = null;
      for (var i = 0; i < items.length; i++) {
        if (items[i] && items[i].number === number && (!congress || String(items[i].congress) === String(congress))) { hit = items[i]; break; }
      }
      if (hit) open(hit.id != null ? hit.id : hit.number);
    }).catch(function () {});
  }
  window.addEventListener('hashchange', openFromHash);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', openFromHash);
  else openFromHash();
})();
