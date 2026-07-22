/* ═══════════════════════════════════════════════════════════════════════════
   MY PROFILE  ·  my-profile.js
   ---------------------------------------------------------------------------
   The signed-in visitor's personal civic hub. This module owns NO data — it is
   a read-only composition layer over the personal systems already in the app:

     • My Stances ............ window.PDXStances.all() / .count()
     • Impact Tracker ........ window.PDXImpact.stats()
     • My Voting Team ........ window.PDXTeamView / window.PDXTeamV2
     • Ballot Actions ........ window.PDXActions.contactedCount()
     • Evidence / Receipts ... window.PDXReceipts.forPolitician(pid)
     • Finance signal ........ window._pdxFinanceSignal(pid)
     • Finance record ........ window._pdxFinanceRecord(pid)   (donors + sectors)
     • Gov spending .......... window.PDXContracts.byState(state)
     • Identity .............. auth.currentUser (guarded)
     • Profile records ....... window.PROFILES / window.CMP_DATA
     • Open a profile ........ window.showProfile(pid)
     • Issue labels .......... window._issueLabel(key)

   Every dependency is read behind a guard, so a missing module degrades to a
   calm empty state rather than throwing. Mirrors the established feature-module
   pattern: IIFE, mount into #mp-body, render on view + on the data-change events
   other modules already broadcast. Additive and non-breaking.

   ── THE MONEY TREE (extensible foundation) ────────────────────────────────
   buildMoneyTree() returns a normalized structure the UI simply consumes:

     {
       you:   { name, teamCount, trackedCount },
       nodes: [ { pid, name, office, photo,
                  signal: { score, label, color, shares, receipts, cycle, outside, source },
                  moneyIn: [ { name, amount, type } ],   // major funding sources
                  sectors: [ { name, amount } ],          // industries behind them
                  gov:     { state, total, top: [ { recipient, amount } ] } } ],
       totals:{ receipts, blendedShares, topSectors, govTotal, govStates, tracked }
     }

   Expanding the money layer later (real FEC edges, bill-level spending impacts,
   money that flows back to the user's issues) means enriching this builder and
   the render consumes it unchanged — no UI rewrite. That is the "foundation."
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXProfile) return;

  var MOUNT = 'mp-body';
  var HASH = '#my-profile';
  var _inited = false, _bound = false, _renderQueued = false;

  /* ── tiny utils ─────────────────────────────────────────────────────── */
  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function jsAttr(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
  function isFn(f) { return typeof f === 'function'; }
  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '👤';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
  function money(n) {
    n = Number(n) || 0;
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
    if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + n;
  }

  /* ── data readers (all defensive) ───────────────────────────────────── */
  function impactStats() { try { return (window.PDXImpact && isFn(window.PDXImpact.stats)) ? window.PDXImpact.stats() : null; } catch (e) { return null; } }
  function myStances() { try { return (window.PDXStances && isFn(window.PDXStances.all)) ? (window.PDXStances.all() || []) : []; } catch (e) { return []; } }
  function contactedCount() { try { return (window.PDXActions && isFn(window.PDXActions.contactedCount)) ? (window.PDXActions.contactedCount() || 0) : 0; } catch (e) { return 0; } }
  function issueLabel(k) { try { if (isFn(window._issueLabel)) { var l = window._issueLabel(k); if (l) return l; } } catch (e) {} return k || ''; }
  function financeSignal(pid) { try { return isFn(window._pdxFinanceSignal) ? window._pdxFinanceSignal(pid) : null; } catch (e) { return null; } }
  function financeRecord(pid) { try { return isFn(window._pdxFinanceRecord) ? window._pdxFinanceRecord(pid) : null; } catch (e) { return null; } }
  function contractsByState(st) { try { return (window.PDXContracts && isFn(window.PDXContracts.byState)) ? (window.PDXContracts.byState(st) || []) : []; } catch (e) { return []; } }

  function currentUser() {
    try { return (typeof auth !== 'undefined' && auth && auth.currentUser) ? auth.currentUser : null; } catch (e) { return null; }
  }

  // The user's team as a de-duped list of pids: committed ballot picks +
  // tracked politicians, unified source first with a defensive fallback.
  function teamPids() {
    var out = [], seen = {};
    function add(pid) { pid = pid && String(pid); if (pid && !seen[pid]) { seen[pid] = 1; out.push(pid); } }
    try {
      if (window.PDXTeamV2 && isFn(window.PDXTeamV2.getPicks)) {
        (window.PDXTeamV2.getPicks() || []).forEach(function (r) { r && add(r.pid); });
        (isFn(window.PDXTeamV2.getTracked) ? (window.PDXTeamV2.getTracked() || []) : []).forEach(function (r) { r && add(r.pid); });
        if (out.length) return out;
      }
    } catch (e) {}
    try {
      if (window.PDXTeamView) {
        if (isFn(window.PDXTeamView.roster)) (window.PDXTeamView.roster() || []).forEach(add);
        if (isFn(window.PDXTeamView.bySeat)) { var m = window.PDXTeamView.bySeat() || {}; Object.keys(m).forEach(function (k) { add(m[k]); }); }
      }
    } catch (e) {}
    return out;
  }

  // Resolve a pid to display fields, merging every source that might carry them.
  function resolvePol(pid) {
    var out = { pid: pid, name: '', office: '', photo: '', party: '', state: '' };
    function merge(d) {
      if (!d) return;
      if (!out.name && d.name) out.name = d.name;
      if (!out.office && d.office) out.office = d.office;
      if (!out.photo && d.photo) out.photo = d.photo;
      if (!out.party && d.party) out.party = d.party;
      if (!out.state && d.state) out.state = d.state;
    }
    try { if (window.PROFILES) merge(window.PROFILES[pid]); } catch (e) {}
    try { if (window.CMP_DATA) merge(window.CMP_DATA[pid]); } catch (e) {}
    try { var fr = financeRecord(pid); if (fr) merge(fr); } catch (e) {}
    if (!out.name) out.name = pid;
    return out;
  }

  // Count contradiction receipts across the team (say-vs-do "Says One Thing ·
  // Does Another"). Read-only, synchronous, guarded — 0 when nothing on file.
  function teamContradictions(pids) {
    var n = 0;
    try {
      if (!(window.PDXReceipts && isFn(window.PDXReceipts.forPolitician))) return 0;
      pids.forEach(function (pid) {
        var r = window.PDXReceipts.forPolitician(pid);
        if (r && r.verdict && r.verdict.key === 'contradicts') n++;
      });
    } catch (e) {}
    return n;
  }

  /* ── THE MONEY TREE model ───────────────────────────────────────────── */
  // Funding-mix segments, single source of truth for colours + legend order.
  var MIX = [
    { key: 'smallDollar',     label: 'Small-dollar', color: '#4ade80' },
    { key: 'largeIndividual', label: 'Large indiv',  color: '#f5c842' },
    { key: 'pac',             label: 'PAC',          color: '#f87171' },
    { key: 'selfFunded',      label: 'Self-funded',  color: '#c4a6ff' },
    { key: 'party',           label: 'Party',        color: '#7596c0' }
  ];

  function buildMoneyTree() {
    var pids = teamPids();
    var nodes = [];
    var sectorTotals = {};        // name -> summed $
    var govStates = {};           // stateKey -> summed $
    var weightedShares = {};      // mix key -> receipts-weighted sum
    var receiptsTotal = 0, govTotal = 0, tracked = 0;

    MIX.forEach(function (m) { weightedShares[m.key] = 0; });

    pids.forEach(function (pid) {
      var pol = resolvePol(pid);
      var sig = financeSignal(pid);
      var rec = financeRecord(pid);
      if (!sig && !rec) return; // only politicians with money data become branches
      tracked++;

      var node = { pid: pid, name: pol.name, office: pol.office, photo: pol.photo, signal: sig, moneyIn: [], sectors: [], gov: null };

      if (rec) {
        node.moneyIn = (rec.topDonors || []).slice(0, 3);
        node.sectors = Object.keys(rec.sectors || {})
          .map(function (k) { return { name: k, amount: rec.sectors[k] }; })
          .sort(function (a, b) { return b.amount - a.amount; });
        node.sectors.forEach(function (s) { sectorTotals[s.name] = (sectorTotals[s.name] || 0) + (s.amount || 0); });
      }
      if (sig) {
        receiptsTotal += (sig.receipts || 0);
        MIX.forEach(function (m) {
          var share = sig.shares && sig.shares[m.key];
          if (typeof share === 'number') weightedShares[m.key] += share * (sig.receipts || 0);
        });
      }

      // Government money flowing into the politician's state — the other half of
      // the money story (who the public dollars go to where they hold office).
      if (pol.state) {
        var rows = contractsByState(pol.state);
        if (rows && rows.length) {
          var sum = rows.reduce(function (a, r) { return a + (r.amount || 0); }, 0);
          var top = rows.slice().sort(function (a, b) { return (b.amount || 0) - (a.amount || 0); }).slice(0, 2)
            .map(function (r) { return { recipient: r.recipient, amount: r.amount }; });
          node.gov = { state: pol.state, total: sum, top: top };
          govStates[pol.state] = (govStates[pol.state] || 0) + sum;
        }
      }
      nodes.push(node);
    });

    // Receipts-weighted blend of the whole team's funding mix.
    var blended = {};
    MIX.forEach(function (m) { blended[m.key] = receiptsTotal > 0 ? Math.round(weightedShares[m.key] / receiptsTotal) : 0; });

    var topSectors = Object.keys(sectorTotals)
      .map(function (k) { return { name: k, amount: sectorTotals[k] }; })
      .sort(function (a, b) { return b.amount - a.amount; }).slice(0, 5);

    Object.keys(govStates).forEach(function (s) { govTotal += govStates[s]; });

    return {
      you: { name: '', teamCount: pids.length, trackedCount: tracked },
      nodes: nodes,
      totals: {
        receipts: receiptsTotal, blendedShares: blended, topSectors: topSectors,
        govTotal: govTotal, govStates: Object.keys(govStates), tracked: tracked
      }
    };
  }

  /* ── shared render helpers ──────────────────────────────────────────── */
  function mixBar(shares) {
    var segs = MIX.filter(function (m) { return (shares[m.key] || 0) > 0; });
    if (!segs.length) return '';
    var bar = '<div class="mp-mix">' + segs.map(function (m) {
      return '<div class="mp-mix-seg" style="width:' + Math.max(shares[m.key], 1) + '%;background:' + m.color + '"></div>';
    }).join('') + '</div>';
    var legend = '<div class="mp-mix-legend">' + segs.map(function (m) {
      return '<span class="mp-mix-key"><span class="mp-mix-dot" style="background:' + m.color + '"></span>' + m.label + ' ' + shares[m.key] + '%</span>';
    }).join('') + '</div>';
    return bar + legend;
  }
  function signalChip(sig) {
    if (!sig) return '';
    return '<span class="mp-signal" style="color:' + sig.color + ';background:' + sig.color + '1f;border:1px solid ' + sig.color + '55">' + esc(sig.label) + '</span>';
  }
  function section(title, ico, linkHref, linkText, bodyHTML) {
    var link = linkHref ? '<a class="mp-sec-link" href="' + linkHref + '">' + esc(linkText) + ' →</a>' : '';
    return '<div class="mp-card">'
      + '<div class="mp-sec-head"><h3 class="mp-sec-title">' + (ico ? '<span>' + ico + '</span>' : '') + esc(title) + '</h3>' + link + '</div>'
      + bodyHTML + '</div>';
  }
  function emptyState(ico, text, ctaHref, ctaText, gold) {
    return '<div class="mp-empty"><div class="mp-empty-ico">' + ico + '</div>'
      + '<p class="mp-empty-txt">' + text + '</p>'
      + (ctaHref ? '<a class="mp-btn' + (gold ? ' mp-btn--gold' : '') + '" href="' + ctaHref + '">' + esc(ctaText) + '</a>' : '')
      + '</div>';
  }

  /* ── section renderers ──────────────────────────────────────────────── */
  function renderIdentity(ctx) {
    var u = ctx.user;
    var name = (u && (u.displayName || (u.email && u.email.split('@')[0]))) || 'Your PolitiDex';
    var signedIn = !!(u && !u.isAnonymous);
    var footprint = ctx.stanceCount + ctx.teamCount === 0
      ? 'Start building your civic record.'
      : ctx.stanceCount + ' position' + (ctx.stanceCount === 1 ? '' : 's') + ' · ' + ctx.teamCount + ' on your team';
    var cta = signedIn
      ? ''
      : '<a class="mp-btn mp-btn--gold" href="#" onclick="(window.openAuthModal||window.showLogin||function(){location.hash=\'#voter-hub\';})();return false;">Sign in to save</a>';
    return '<div class="mp-card"><div class="mp-id">'
      + '<div class="mp-avatar">' + esc(initials(signedIn ? name : '')) + '</div>'
      + '<div class="mp-id-main"><p class="mp-id-name">' + esc(name) + '</p>'
      + '<div class="mp-id-meta">' + (signedIn ? 'Signed in · synced across your devices' : 'Guest · saved on this device') + ' — ' + esc(footprint) + '</div></div>'
      + (cta ? '<div class="mp-id-cta">' + cta + '</div>' : '')
      + '</div></div>';
  }

  function renderStats(ctx) {
    var c = (ctx.stats && ctx.stats.counts) || {};
    var tiles = [
      { ico: '🔎', num: c.researched || 0, lbl: 'Politicians researched' },
      { ico: '🎯', num: ctx.stanceCount, lbl: 'Stances set' },
      { ico: '📚', num: c.reviewed || 0, lbl: 'Evidence reviewed' },
      { ico: '⚠️', num: ctx.contradictions, lbl: 'Contradictions flagged', warn: ctx.contradictions > 0 },
      { ico: '⭐', num: ctx.teamCount, lbl: 'On your team' },
      { ico: '🎯', num: c.issues || 0, lbl: 'Issues followed' },
      { ico: '✉️', num: ctx.contacted, lbl: 'Reps contacted' },
      { ico: '🔥', num: (ctx.stats && ctx.stats.streak) || 0, lbl: 'Day streak' }
    ];
    var body = '<div class="mp-stats">' + tiles.map(function (t) {
      return '<div class="mp-stat"><div class="mp-stat-num' + (t.warn ? ' is-warn' : '') + '">' + t.num + '</div>'
        + '<span class="mp-stat-lbl"><span class="mp-stat-ico">' + t.ico + '</span>' + esc(t.lbl) + '</span></div>';
    }).join('') + '</div>';
    if (ctx.stats && !ctx.stats.enabled) {
      body += '<p class="mp-sub" style="margin-top:0.8rem">Turn on the <a class="mp-sec-link" style="display:inline" href="#your-ballot">Personal Impact Tracker</a> to record researched, reviewed and contacted counts as you go.</p>';
    }
    return section('Your civic footprint', '📊', null, null, body);
  }

  function renderStances(ctx) {
    var list = ctx.stances.slice().sort(function (a, b) {
      var w = { high: 3, medium: 2, low: 1 };
      return (w[b.priority] || 0) - (w[a.priority] || 0);
    });
    var body;
    if (!list.length) {
      body = emptyState('🎯', 'You haven\'t set any positions yet. Take a Support, Oppose or Mixed stance on the issues you care about — then PolitiDex shows you who actually aligns.', '#my-stances', 'Set your first stance', true);
    } else {
      var rows = list.slice(0, 6).map(function (s) {
        var posCls = s.position === 'support' ? 'is-support' : s.position === 'oppose' ? 'is-oppose' : 'is-mixed';
        var prio = s.priority && s.priority !== 'medium' ? '<span class="mp-prio">' + esc(s.priority) + '</span>' : '';
        return '<div class="mp-stance"><span class="mp-stance-issue">' + esc(issueLabel(s.issueKey)) + '</span>'
          + prio + '<span class="mp-pos ' + posCls + '">' + esc(s.position || 'mixed') + '</span></div>';
      }).join('');
      body = rows;
    }
    return section('What you stand for', '🧭', list.length ? '#my-stances' : null, 'Manage', body);
  }

  function renderTeam(ctx) {
    var pids = ctx.teamPids;
    var body;
    if (!pids.length) {
      body = emptyState('⭐', 'Your voting team is empty. Add the politicians on your ballot to track their records, promises and money in one place.', '#voter-hub', 'Build your team', true);
    } else {
      body = '<div class="mp-team">' + pids.slice(0, 9).map(function (pid) {
        var p = resolvePol(pid);
        var face = p.photo
          ? '<img class="mp-pol-photo" src="' + esc(p.photo) + '" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement(\'div\'),{className:\'mp-pol-photo\',textContent:\'' + jsAttr(initials(p.name)) + '\'}))">'
          : '<div class="mp-pol-photo">' + esc(initials(p.name)) + '</div>';
        return '<button type="button" class="mp-pol" onclick="window.showProfile&&window.showProfile(\'' + jsAttr(pid) + '\')" title="Open ' + esc(p.name) + '">'
          + face + '<div class="mp-pol-main"><div class="mp-pol-name">' + esc(p.name) + '</div>'
          + '<div class="mp-pol-office">' + esc(p.office || '—') + '</div>'
          + (financeSignal(pid) ? '<span class="mp-pol-tag">💰 money on file</span>' : '')
          + '</div></button>';
      }).join('') + '</div>';
      if (pids.length > 9) body += '<p class="mp-sub" style="margin-top:0.7rem">+ ' + (pids.length - 9) + ' more on your team.</p>';
    }
    return section('Your voting team', '⭐', pids.length ? '#my-politicians' : null, 'Manage', body);
  }

  function renderEvidence(ctx) {
    var reviewed = (ctx.stats && ctx.stats.counts && ctx.stats.counts.reviewed) || 0;
    var body;
    if (ctx.contradictions > 0) {
      body = '<p class="mp-sub"><strong style="color:#fca5a5">' + ctx.contradictions + '</strong> receipt' + (ctx.contradictions === 1 ? '' : 's') + ' on your team flag a <em>“says one thing, does another”</em> contradiction between words and votes. '
        + 'You\'ve reviewed <strong style="color:#cfe0fb">' + reviewed + '</strong> piece' + (reviewed === 1 ? '' : 's') + ' of evidence so far.</p>';
    } else if (ctx.teamPids.length) {
      body = '<p class="mp-sub">No word-vs-record contradictions flagged on your team yet. You\'ve reviewed <strong style="color:#cfe0fb">' + reviewed + '</strong> piece' + (reviewed === 1 ? '' : 's') + ' of evidence. Open the Evidence Locker to dig into the receipts behind every stance.</p>';
    } else {
      body = emptyState('🧾', 'Evidence and receipts tie every claim to a source. Add politicians to your team and their sourced record — promises kept, votes, and contradictions — shows up here.', '#evidence-locker', 'Open the Evidence Locker', false);
    }
    return section('Evidence & receipts', '🧾', ctx.teamPids.length ? '#evidence-locker' : null, 'Explore', body);
  }

  function renderMoney(ctx) {
    var tree = ctx.tree;
    var body;
    if (!tree.totals.tracked) {
      body = emptyState('💰', 'The money tree maps who funds the politicians you follow — grassroots small-dollar vs. PACs and major donors — and the government dollars flowing where they hold office. Add someone with campaign-finance data on file to grow your first branch.', '#voter-hub', 'Add to your team', true)
        + '<p class="mp-money-note">Foundation for a deeper funding view: contributions in, major funding sources, and the flow of public money tied to your officials and issues — expanding over time.</p>';
      return section('Your money tree', '💰', null, null, body);
    }

    var t = tree.totals;
    var figs = '<div class="mp-money-figs">'
      + '<div><div class="mp-fig-num">' + money(t.receipts) + '</div><span class="mp-fig-lbl">Team receipts</span></div>'
      + '<div><div class="mp-fig-num">' + t.tracked + '</div><span class="mp-fig-lbl">With money on file</span></div>'
      + '<div><div class="mp-fig-num">' + money(t.govTotal) + '</div><span class="mp-fig-lbl">Gov $ in their states</span></div>'
      + '<div><div class="mp-fig-num">' + (t.blendedShares.smallDollar || 0) + '%</div><span class="mp-fig-lbl">Small-dollar blend</span></div>'
      + '</div>';
    var blend = mixBar(t.blendedShares);
    var sectors = t.topSectors.length
      ? '<p class="mp-sub" style="margin-top:0.85rem;margin-bottom:0.25rem">Industries following your team</p><div class="mp-sectors">'
        + t.topSectors.map(function (s) { return '<span class="mp-chip">' + esc(s.name) + ' · ' + money(s.amount) + '</span>'; }).join('') + '</div>'
      : '';
    var summary = '<div class="mp-money-summary">' + figs + blend + sectors + '</div>';

    var branches = tree.nodes.map(function (n) {
      var donors = n.moneyIn.length
        ? '<ul class="mp-donors">' + n.moneyIn.map(function (d) {
            return '<li><span>' + esc(d.name) + '</span><span>' + money(d.amount) + '</span></li>';
          }).join('') + '</ul>'
        : '';
      var mix = (n.signal && n.signal.shares) ? mixBar(n.signal.shares) : '';
      var gov = n.gov
        ? '<div class="mp-branch-gov">🏛 <strong>' + money(n.gov.total) + '</strong> in federal contracts flow to ' + esc(n.gov.state)
          + (n.gov.top && n.gov.top.length ? ' — top: ' + n.gov.top.map(function (x) { return esc(x.recipient) + ' (' + money(x.amount) + ')'; }).join(', ') : '') + '.</div>'
        : '';
      return '<div class="mp-branch">'
        + '<div class="mp-branch-head"><span class="mp-branch-name">' + esc(n.name) + '</span>'
        + (n.office ? '<span class="mp-branch-office">' + esc(n.office) + '</span>' : '') + signalChip(n.signal) + '</div>'
        + mix + donors + gov + '</div>';
    }).join('');

    body = summary + branches
      + '<p class="mp-money-note">This is the foundation of the money layer: each branch traces the money <em>in</em> (who funds them) and the public money <em>around</em> them (contracts where they hold office). It will grow to follow the money back to the tax, spending and law impacts on the issues you care about.</p>';
    return section('Your money tree', '💰', null, null, body);
  }

  /* ── compose ────────────────────────────────────────────────────────── */
  function buildContext() {
    var stances = myStances();
    var pids = teamPids();
    var stats = impactStats();
    return {
      user: currentUser(),
      stats: stats,
      stances: stances,
      stanceCount: stances.length,
      teamPids: pids,
      teamCount: pids.length,
      contacted: contactedCount(),
      contradictions: teamContradictions(pids),
      tree: buildMoneyTree()
    };
  }

  function render() {
    var host = el(MOUNT);
    if (!host) return;
    var ctx = buildContext();
    var html = renderIdentity(ctx)
      + renderStats(ctx)
      + '<div class="mp-cols">' + renderStances(ctx) + renderTeam(ctx) + '</div>'
      + renderEvidence(ctx)
      + renderMoney(ctx);
    host.innerHTML = html;
  }

  // Coalesce bursts of data-change events into one render on the next frame.
  function queueRender() {
    if (!_inited) return;
    if (_renderQueued) return;
    _renderQueued = true;
    var run = function () { _renderQueued = false; if (isVisible()) render(); };
    (window.requestAnimationFrame || window.setTimeout)(run, 0);
  }
  function isVisible() { return location.hash === HASH || (el(MOUNT) && !!el('my-profile') && location.hash === HASH); }

  /* ── lifecycle ──────────────────────────────────────────────────────── */
  function init() {
    if (!el(MOUNT)) return;
    _inited = true;
    render();
    bindLive();
  }
  function bindLive() {
    if (_bound) return;
    _bound = true;
    // Re-render when the systems this page reads broadcast a change — only does
    // real work while the profile view is on screen (queueRender guards).
    ['pdx-team-change', 'pdx-saved-change', 'pdx-evidence-ready', 'pdx-impact-change', 'pdx-stances-change'].forEach(function (evt) {
      try { window.addEventListener(evt, queueRender); } catch (e) {}
    });
  }
  function onHash() { if (location.hash === HASH) init(); }

  function setup() {
    try { window.addEventListener('hashchange', onHash); } catch (e) {}
    if (location.hash === HASH) init();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();

  /* ── public API ─────────────────────────────────────────────────────── */
  window.PDXProfile = {
    open: function () { location.hash = HASH; init(); },
    refresh: function () { if (_inited && isVisible()) render(); },
    // Exposed so future money-layer work / tests can read the normalized tree.
    moneyTree: buildMoneyTree
  };
})();
