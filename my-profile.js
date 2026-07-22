/* ═══════════════════════════════════════════════════════════════════════════
   MY PROFILE  ·  my-profile.js
   ---------------------------------------------------------------------------
   The signed-in visitor's personal civic hub. This module owns NO data — it is
   a read-only composition layer over the personal systems already in the app:

     • My Stances ............ window.PDXStances.all() / .get() / .open()
     • Impact Tracker ........ window.PDXImpact.stats()
     • My Voting Team ........ window.PDXTeamView / window.PDXTeamV2
     • Ballot Actions ........ window.PDXActions.contactedCount()
     • Evidence / Receipts ... window.PDXReceipts.forPolitician(pid)
     • Documented positions .. window._polPositionMap(pid, profile)
     • Finance signal ........ window._pdxFinanceSignal(pid)
     • Finance record ........ window._pdxFinanceRecord(pid)   (donors + sectors)
     • Gov spending .......... window.PDXContracts.byState(state) / .list()
     • Identity .............. auth.currentUser (guarded)
     • Profile records ....... window.PROFILES / window.CMP_DATA
     • Open a profile ........ window.showProfile(pid)
     • Issue labels .......... window._issueLabel(key)

   Every dependency is read behind a guard, so a missing module degrades to a
   calm empty state rather than throwing. Mirrors the established feature-module
   pattern: IIFE, mount into #mp-body, render on view + on the data-change events
   other modules already broadcast. Additive and non-breaking.

   ── GUIDED FLOW (stances ⇄ team) ──────────────────────────────────────────
   The page reads the visitor's state (how many stances, how big a team, how the
   two align) and surfaces ONE encouraging next step plus a 3-step progress hint
   (Stances → Team → Compare & refine). The relationship is two-way:
     • stances → team : "build a team and compare politicians to your positions"
     • team → stances : issues your team has taken positions on that you haven't
                        weighed in on are surfaced as "stances awaiting attention"
   Guidance is always optional — every link stays live, nothing is forced.

   ── THE MONEY TREE (extensible foundation) ────────────────────────────────
   buildMoneyTree() returns a normalized structure the UI simply consumes:

     {
       you:   { name, teamCount, trackedCount },
       nodes: [ { pid, name, office, photo,
                  signal:  { score, label, color, shares, receipts, cycle, outside },
                  mix3:    { grassroots, largePac, selfParty },   // grouped funding
                  moneyIn: [ { name, amount, type } ],            // major sources
                  sectors: [ { name, amount } ],                  // industries
                  gov:     { state, total, top: [ { recipient, amount } ] } } ],
       totals:{ receipts, blendedShares, mix3, lean, topSectors,
                notableSources, govTotal, govStates, tracked }
     }

   issueSpending (public money mapped onto the visitor's own stance issues, via
   contract issueKeys) is computed in buildContext and passed to the money view.
   Expanding the money layer later (real FEC edges, bill-level spending impacts,
   money that flows back to the user's issues) means enriching this builder /
   context and the render consumes it unchanged — no UI rewrite. That is the
   "foundation," and the issue-spending link is the first branch grown from it.
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
  function plural(n, one, many) { return n === 1 ? one : (many || one + 's'); }

  /* ── data readers (all defensive) ───────────────────────────────────── */
  function impactStats() { try { return (window.PDXImpact && isFn(window.PDXImpact.stats)) ? window.PDXImpact.stats() : null; } catch (e) { return null; } }
  function myStances() { try { return (window.PDXStances && isFn(window.PDXStances.all)) ? (window.PDXStances.all() || []) : []; } catch (e) { return []; } }
  function contactedCount() { try { return (window.PDXActions && isFn(window.PDXActions.contactedCount)) ? (window.PDXActions.contactedCount() || 0) : 0; } catch (e) { return 0; } }
  function issueLabel(k) { try { if (isFn(window._issueLabel)) { var l = window._issueLabel(k); if (l) return l; } } catch (e) {} return k || ''; }
  function financeSignal(pid) { try { return isFn(window._pdxFinanceSignal) ? window._pdxFinanceSignal(pid) : null; } catch (e) { return null; } }
  function financeRecord(pid) { try { return isFn(window._pdxFinanceRecord) ? window._pdxFinanceRecord(pid) : null; } catch (e) { return null; } }
  function contractsByState(st) { try { return (window.PDXContracts && isFn(window.PDXContracts.byState)) ? (window.PDXContracts.byState(st) || []) : []; } catch (e) { return []; } }
  function allContracts() { try { return (window.PDXContracts && isFn(window.PDXContracts.list)) ? (window.PDXContracts.list() || []) : []; } catch (e) { return []; } }
  function positionMap(pid, pol) { try { return isFn(window._polPositionMap) ? (window._polPositionMap(pid, pol) || {}) : {}; } catch (e) { return {}; } }

  function currentUser() {
    try { return (typeof auth !== 'undefined' && auth && auth.currentUser) ? auth.currentUser : null; } catch (e) { return null; }
  }

  // Normalize any stance/position token to the shared support|oppose|mixed set.
  function normPos(p) {
    p = String(p || '').toLowerCase();
    if (p === 'support' || p === 'oppose' || p === 'mixed') return p;
    if (p.indexOf('support') >= 0 || p === 'yea' || p === 'for') return 'support';
    if (p.indexOf('oppose') >= 0 || p === 'nay' || p === 'against') return 'oppose';
    return 'mixed';
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

  /* ── stances ⇄ team alignment (the two-way relationship) ────────────── */
  // For every team member with documented positions, compare their stance on
  // each issue to the visitor's own saved stance. Produces per-member tallies /
  // differences AND the reverse signal: issues the team cares about that the
  // visitor has not yet taken a stance on ("awaiting attention").
  function computeAlignment(stances, pids) {
    var mine = {};
    stances.forEach(function (s) { if (s && s.issueKey) mine[s.issueKey] = normPos(s.position); });

    var byPid = {}, attention = {};
    var totalShared = 0, agree = 0, differ = 0, mixed = 0;
    var sharedKeys = {};

    pids.forEach(function (pid) {
      var pol = resolvePol(pid);
      var pm = positionMap(pid, pol);
      var keys = Object.keys(pm || {});
      if (!keys.length) { byPid[pid] = { shared: 0, agree: 0, differ: 0, mixed: 0, documented: 0 }; return; }
      var mShared = 0, mAgree = 0, mDiffer = 0, mMixed = 0;
      keys.forEach(function (k) {
        var theirs = normPos(pm[k] && pm[k].stance);
        if (mine[k] != null) {
          mShared++; totalShared++; sharedKeys[k] = 1;
          if (theirs === 'mixed' || mine[k] === 'mixed') { mMixed++; mixed++; }
          else if (theirs === mine[k]) { mAgree++; agree++; }
          else { mDiffer++; differ++; }
        } else {
          attention[k] = (attention[k] || 0) + 1; // team documents it; user hasn't
        }
      });
      byPid[pid] = { shared: mShared, agree: mAgree, differ: mDiffer, mixed: mMixed, documented: keys.length };
    });

    var attentionList = Object.keys(attention).map(function (k) {
      return { issueKey: k, label: issueLabel(k), count: attention[k] };
    }).sort(function (a, b) { return b.count - a.count; });

    return {
      byPid: byPid, attention: attentionList,
      totalShared: totalShared, sharedIssues: Object.keys(sharedKeys).length,
      agree: agree, differ: differ, mixed: mixed
    };
  }

  // Public money mapped onto the visitor's OWN stance issues, via contract
  // issueKeys. This is the first real bridge from the money layer back to the
  // issues the visitor has told us they care about.
  function contractsForIssues(issueKeys) {
    if (!issueKeys || !issueKeys.length) return [];
    var want = {}; issueKeys.forEach(function (k) { want[k] = 1; });
    var byIssue = {};
    allContracts().forEach(function (c) {
      (c.issueKeys || []).forEach(function (k) {
        if (!want[k]) return;
        var b = byIssue[k] || (byIssue[k] = { total: 0, items: [] });
        b.total += (c.amount || 0);
        b.items.push({ recipient: c.recipient, amount: c.amount || 0 });
      });
    });
    return Object.keys(byIssue).map(function (k) {
      return {
        issueKey: k, label: issueLabel(k), total: byIssue[k].total,
        items: byIssue[k].items.sort(function (a, b) { return b.amount - a.amount; }).slice(0, 2)
      };
    }).sort(function (a, b) { return b.total - a.total; }).slice(0, 5);
  }

  /* ── THE MONEY TREE model ───────────────────────────────────────────── */
  // Detailed funding-mix segments (single source of truth for colours + order).
  var MIX = [
    { key: 'smallDollar',     label: 'Small-dollar', color: '#4ade80' },
    { key: 'largeIndividual', label: 'Large indiv',  color: '#f5c842' },
    { key: 'pac',             label: 'PAC',          color: '#f87171' },
    { key: 'selfFunded',      label: 'Self-funded',  color: '#c4a6ff' },
    { key: 'party',           label: 'Party',        color: '#7596c0' }
  ];
  // Grouped 3-way story that leads the money view — the intuitive framing.
  var MIX3 = [
    { key: 'grassroots', label: 'Grassroots · small-dollar', color: '#4ade80' },
    { key: 'largePac',   label: 'Large donors & PACs',       color: '#f5c842' },
    { key: 'selfParty',  label: 'Self / party',              color: '#7596c0' }
  ];
  function group3(shares) {
    shares = shares || {};
    return {
      grassroots: Math.round(shares.smallDollar || 0),
      largePac: Math.round((shares.largeIndividual || 0) + (shares.pac || 0)),
      selfParty: Math.round((shares.selfFunded || 0) + (shares.party || 0))
    };
  }
  // Neutral, non-judgmental one-word lean based on the grouped mix.
  function leanOf(m3) {
    if (!m3) return { key: 'na', label: 'No filing' };
    if (m3.grassroots >= m3.largePac + 10) return { key: 'grassroots', label: 'Leans grassroots' };
    if (m3.largePac >= m3.grassroots + 10) return { key: 'large', label: 'Leans large-donor & PAC' };
    return { key: 'mixed', label: 'Mixed funding' };
  }

  function buildMoneyTree() {
    var pids = teamPids();
    var nodes = [];
    var sectorTotals = {};        // name -> summed $
    var sourceTotals = {};        // donor/source name -> { amount, type }
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

      var node = {
        pid: pid, name: pol.name, office: pol.office, photo: pol.photo,
        signal: sig, mix3: sig ? group3(sig.shares) : null, moneyIn: [], sectors: [], gov: null
      };

      if (rec) {
        node.moneyIn = (rec.topDonors || []).slice(0, 3);
        node.sectors = Object.keys(rec.sectors || {})
          .map(function (k) { return { name: k, amount: rec.sectors[k] }; })
          .sort(function (a, b) { return b.amount - a.amount; });
        node.sectors.forEach(function (s) { sectorTotals[s.name] = (sectorTotals[s.name] || 0) + (s.amount || 0); });
        (rec.topDonors || []).forEach(function (d) {
          if (!d || !d.name) return;
          var e = sourceTotals[d.name] || (sourceTotals[d.name] = { amount: 0, type: d.type || '' });
          e.amount += (d.amount || 0);
        });
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
    var mix3 = group3(blended);

    var topSectors = Object.keys(sectorTotals)
      .map(function (k) { return { name: k, amount: sectorTotals[k] }; })
      .sort(function (a, b) { return b.amount - a.amount; }).slice(0, 5);

    var notableSources = Object.keys(sourceTotals)
      .map(function (k) { return { name: k, amount: sourceTotals[k].amount, type: sourceTotals[k].type }; })
      .sort(function (a, b) { return b.amount - a.amount; }).slice(0, 5);

    Object.keys(govStates).forEach(function (s) { govTotal += govStates[s]; });

    return {
      you: { name: '', teamCount: pids.length, trackedCount: tracked },
      nodes: nodes.sort(function (a, b) { return ((b.signal && b.signal.receipts) || 0) - ((a.signal && a.signal.receipts) || 0); }),
      totals: {
        receipts: receiptsTotal, blendedShares: blended, mix3: mix3, lean: leanOf(mix3),
        topSectors: topSectors, notableSources: notableSources,
        govTotal: govTotal, govStates: Object.keys(govStates), tracked: tracked
      }
    };
  }

  /* ── shared render helpers ──────────────────────────────────────────── */
  // Detailed 5-segment funding bar with legend (kept for the deeper read).
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
  // Grouped grassroots-vs-big bar — the intuitive lead visual.
  function mix3Bar(m3, opts) {
    if (!m3) return '';
    opts = opts || {};
    var segs = MIX3.filter(function (m) { return (m3[m.key] || 0) > 0; });
    if (!segs.length) return '';
    var bar = '<div class="mp-mix2">' + segs.map(function (m) {
      return '<div class="mp-mix2-seg" style="width:' + Math.max(m3[m.key], 1) + '%;background:' + m.color + '" title="' + esc(m.label) + ' ' + m3[m.key] + '%"></div>';
    }).join('') + '</div>';
    if (opts.noLegend) return bar;
    var legend = '<div class="mp-mix-legend">' + segs.map(function (m) {
      return '<span class="mp-mix-key"><span class="mp-mix-dot" style="background:' + m.color + '"></span>' + esc(m.label) + ' ' + m3[m.key] + '%</span>';
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

  /* ── guided flow ────────────────────────────────────────────────────── */
  // Pick the single most helpful next step from the visitor's current state.
  // Never blocks anything — the whole page stays freely navigable.
  function guideStage(ctx) {
    var s = ctx.stanceCount, t = ctx.teamCount, a = ctx.alignment;
    var firstAttn = a && a.attention && a.attention[0];

    if (s === 0) {
      return {
        key: 'start', step: 0,
        eyebrow: 'Step 1 of 3 · Start here',
        title: 'Begin with what you stand for',
        body: 'PolitiDex works best when it knows your positions. Take a stance on an issue you care about — then it can show you which politicians actually align, and where the money behind them comes from.',
        primary: { label: 'Set your first stance', href: '#my-stances' }
      };
    }
    if (t === 0) {
      return {
        key: 'team', step: 1,
        eyebrow: 'Step 2 of 3 · Build your team',
        title: s === 1 ? 'Great start — now meet your team' : 'Now find who aligns with you',
        body: (s === 1
          ? 'You\'ve set your first stance. Add one more if you like, then build your voting team — PolitiDex compares each politician against your positions so you can see who lines up.'
          : 'You\'ve set ' + s + ' stances. Build your voting team and PolitiDex will compare each politician against your positions, so you can see who genuinely aligns.'),
        primary: { label: 'Build your voting team', href: '#voter-hub' },
        secondary: { label: 'Add another stance', href: '#my-stances' }
      };
    }
    // Has both stances and a team → the two-way refine loop.
    if (firstAttn) {
      return {
        key: 'refine', step: 2,
        eyebrow: 'Step 3 of 3 · Compare & refine',
        title: 'Sharpen how your team compares',
        body: 'Your team has taken positions on ' + a.attention.length + ' ' + plural(a.attention.length, 'issue') + ' you haven\'t weighed in on yet. Set a stance and your alignment gets sharper — the comparison runs both ways.',
        primary: { label: 'Weigh in on ' + firstAttn.label, onclick: "window.PDXStances&&PDXStances.open('" + jsAttr(firstAttn.issueKey) + "')" },
        secondary: { label: 'Refine your team', href: '#voter-hub' }
      };
    }
    if (s < 3) {
      return {
        key: 'grow', step: 2,
        eyebrow: 'Step 3 of 3 · Compare & refine',
        title: 'Add a couple more stances',
        body: 'Your stances and team are connected. Add a few more positions to deepen every comparison — the more you weigh in, the clearer your alignment becomes.',
        primary: { label: 'Add another stance', href: '#my-stances' },
        secondary: { label: 'Refine your team', href: '#voter-hub' }
      };
    }
    return {
      key: 'flow', step: 2,
      eyebrow: 'Your hub is humming',
      title: 'Stances and team, working together',
      body: 'You\'ve connected your positions with a voting team. Explore how they align above, and follow the money behind them below — then keep refining whenever you like.',
      primary: { label: 'Refine your team', href: '#voter-hub' },
      secondary: { label: 'Review your stances', href: '#my-stances' }
    };
  }

  function stepChip(idx, curStep, done, ico, label) {
    var cls = done ? 'is-done' : (idx === curStep ? 'is-current' : 'is-todo');
    return '<div class="mp-step ' + cls + '"><span class="mp-step-ico">' + (done ? '✓' : ico) + '</span><span class="mp-step-lbl">' + esc(label) + '</span></div>';
  }

  function renderGuide(ctx) {
    var g = guideStage(ctx);
    var steps = '<div class="mp-steps">'
      + stepChip(0, g.step, ctx.stanceCount >= 1, '🎯', 'Set stances')
      + '<span class="mp-step-join"></span>'
      + stepChip(1, g.step, ctx.teamCount >= 1, '⭐', 'Build team')
      + '<span class="mp-step-join"></span>'
      + stepChip(2, g.step, (ctx.stanceCount >= 3 && ctx.teamCount >= 1 && !(ctx.alignment && ctx.alignment.attention.length)), '⚖️', 'Compare & refine')
      + '</div>';
    var prim = g.primary
      ? (g.primary.onclick
          ? '<button type="button" class="mp-btn mp-btn--gold" onclick="' + g.primary.onclick + '">' + esc(g.primary.label) + '</button>'
          : '<a class="mp-btn mp-btn--gold" href="' + g.primary.href + '">' + esc(g.primary.label) + '</a>')
      : '';
    var sec = g.secondary
      ? '<a class="mp-btn" href="' + g.secondary.href + '">' + esc(g.secondary.label) + '</a>'
      : '';
    return '<div class="mp-card mp-guide">'
      + steps
      + '<div class="mp-guide-body">'
      +   '<span class="mp-guide-eyebrow">' + esc(g.eyebrow) + '</span>'
      +   '<h3 class="mp-guide-title">' + esc(g.title) + '</h3>'
      +   '<p class="mp-guide-text">' + esc(g.body) + '</p>'
      +   '<div class="mp-guide-actions">' + prim + sec + '</div>'
      +   '<p class="mp-note">You\'re free to explore anywhere — nothing here is required.</p>'
      + '</div></div>';
  }

  /* ── section renderers ──────────────────────────────────────────────── */
  function renderIdentity(ctx) {
    var u = ctx.user;
    var name = (u && (u.displayName || (u.email && u.email.split('@')[0]))) || 'Your PolitiDex';
    var signedIn = !!(u && !u.isAnonymous);
    var footprint = ctx.stanceCount + ctx.teamCount === 0
      ? 'Start building your civic record.'
      : ctx.stanceCount + ' ' + plural(ctx.stanceCount, 'position') + ' · ' + ctx.teamCount + ' on your team';
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
      { ico: '🤝', num: (ctx.alignment && ctx.alignment.sharedIssues) || 0, lbl: 'Issues shared w/ team' },
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
      body = list.slice(0, 6).map(function (s) {
        var posCls = s.position === 'support' ? 'is-support' : s.position === 'oppose' ? 'is-oppose' : 'is-mixed';
        var prio = s.priority && s.priority !== 'medium' ? '<span class="mp-prio">' + esc(s.priority) + '</span>' : '';
        return '<div class="mp-stance"><span class="mp-stance-issue">' + esc(issueLabel(s.issueKey)) + '</span>'
          + prio + '<span class="mp-pos ' + posCls + '">' + esc(s.position || 'mixed') + '</span></div>';
      }).join('');
      // Two-way hint: how these stances connect to the team.
      var a = ctx.alignment;
      if (ctx.teamCount && a) {
        var line = '';
        if (a.sharedIssues) {
          line += '<span class="mp-link-note">🤝 ' + a.sharedIssues + ' of your ' + plural(a.sharedIssues, 'issue') + ' ' + (a.sharedIssues === 1 ? 'is' : 'are') + ' shared with your team.</span>';
        }
        if (a.attention.length) {
          var first = a.attention[0];
          line += '<span class="mp-link-note">🔎 ' + a.attention.length + ' ' + plural(a.attention.length, 'issue') + ' your team weighs in on await your stance — '
            + '<button type="button" class="mp-inline-btn" onclick="window.PDXStances&&PDXStances.open(\'' + jsAttr(first.issueKey) + '\')">start with ' + esc(first.label) + '</button>.</span>';
        }
        if (line) body += '<div class="mp-link-notes">' + line + '</div>';
      }
    }
    return section('What you stand for', '🧭', list.length ? '#my-stances' : null, 'Manage', body);
  }

  function alignBadge(al) {
    if (!al || (!al.documented && !al.shared)) return '';
    if (!al.shared) return '<span class="mp-align is-neutral">no shared issues yet</span>';
    if (al.agree && !al.differ) return '<span class="mp-align is-agree">aligns on ' + al.agree + ' of your ' + plural(al.agree, 'issue') + '</span>';
    if (al.differ && !al.agree) return '<span class="mp-align is-differ">differs on ' + al.differ + ' of your ' + plural(al.differ, 'issue') + '</span>';
    var parts = [];
    if (al.agree) parts.push('<span class="mp-align is-agree">✓ ' + al.agree + '</span>');
    if (al.differ) parts.push('<span class="mp-align is-differ">✕ ' + al.differ + '</span>');
    if (al.mixed) parts.push('<span class="mp-align is-neutral">~ ' + al.mixed + '</span>');
    return parts.join('');
  }

  function renderTeam(ctx) {
    var pids = ctx.teamPids;
    var body;
    if (!pids.length) {
      body = emptyState('⭐', 'Your voting team is empty. Add the politicians on your ballot and PolitiDex will compare each one against your stances — so you can see who aligns before you decide.', '#voter-hub', 'Build your team', true);
    } else {
      var a = ctx.alignment;
      body = '<div class="mp-team">' + pids.slice(0, 9).map(function (pid) {
        var p = resolvePol(pid);
        var face = p.photo
          ? '<img class="mp-pol-photo" src="' + esc(p.photo) + '" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement(\'div\'),{className:\'mp-pol-photo\',textContent:\'' + jsAttr(initials(p.name)) + '\'}))">'
          : '<div class="mp-pol-photo">' + esc(initials(p.name)) + '</div>';
        var badge = a && a.byPid[pid] ? alignBadge(a.byPid[pid]) : '';
        return '<button type="button" class="mp-pol" onclick="window.showProfile&&window.showProfile(\'' + jsAttr(pid) + '\')" title="Open ' + esc(p.name) + '">'
          + face + '<div class="mp-pol-main"><div class="mp-pol-name">' + esc(p.name) + '</div>'
          + '<div class="mp-pol-office">' + esc(p.office || '—') + '</div>'
          + (badge ? '<div class="mp-pol-align">' + badge + '</div>' : (financeSignal(pid) ? '<span class="mp-pol-tag">💰 money on file</span>' : ''))
          + '</div></button>';
      }).join('') + '</div>';
      if (pids.length > 9) body += '<p class="mp-sub" style="margin-top:0.7rem">+ ' + (pids.length - 9) + ' more on your team.</p>';
      if (!ctx.stanceCount) {
        body += '<p class="mp-link-notes"><span class="mp-link-note">🎯 Set a stance or two and each teammate shows how they align with you. <button type="button" class="mp-inline-btn" onclick="location.hash=\'#my-stances\'">Set a stance</button>.</span></p>';
      }
    }
    return section('Your voting team', '⭐', pids.length ? '#my-politicians' : null, 'Manage', body);
  }

  function renderEvidence(ctx) {
    var reviewed = (ctx.stats && ctx.stats.counts && ctx.stats.counts.reviewed) || 0;
    var body;
    if (ctx.contradictions > 0) {
      body = '<p class="mp-sub"><strong style="color:#fca5a5">' + ctx.contradictions + '</strong> ' + plural(ctx.contradictions, 'receipt') + ' on your team flag a <em>“says one thing, does another”</em> contradiction between words and votes. '
        + 'You\'ve reviewed <strong style="color:#cfe0fb">' + reviewed + '</strong> ' + plural(reviewed, 'piece') + ' of evidence so far.</p>';
    } else if (ctx.teamPids.length) {
      body = '<p class="mp-sub">No word-vs-record contradictions flagged on your team yet. You\'ve reviewed <strong style="color:#cfe0fb">' + reviewed + '</strong> ' + plural(reviewed, 'piece') + ' of evidence. Open the Evidence Locker to dig into the receipts behind every stance.</p>';
    } else {
      body = emptyState('🧾', 'Evidence and receipts tie every claim to a source. Add politicians to your team and their sourced record — promises kept, votes, and contradictions — shows up here.', '#evidence-locker', 'Open the Evidence Locker', false);
    }
    return section('Evidence & receipts', '🧾', ctx.teamPids.length ? '#evidence-locker' : null, 'Explore', body);
  }

  function sourceTypeLabel(type) {
    var m = { pac: 'PAC', industry: 'Industry', individual: 'Individual', party: 'Party' };
    return m[type] || '';
  }

  function renderMoney(ctx) {
    var tree = ctx.tree, t = tree.totals;
    if (!t.tracked) {
      var body0 = emptyState('💰', 'The money tree maps who funds the politicians you follow — grassroots small-dollar vs. large donors and PACs — and the public dollars flowing where they hold office. Add someone with campaign-finance data on file to grow your first branch.', '#voter-hub', 'Add to your team', true)
        + '<p class="mp-money-note">Foundation for a deeper funding view: contributions in, major funding sources, and the flow of public money tied to your officials and issues — expanding over time.</p>';
      return section('Your money tree', '💰', null, null, body0);
    }

    // Team-level summary — lead with the intuitive grassroots-vs-big framing.
    var m3 = t.mix3;
    var leanCls = t.lean.key === 'grassroots' ? 'is-grass' : (t.lean.key === 'large' ? 'is-large' : 'is-mixed');
    var figs = '<div class="mp-money-figs">'
      + '<div><div class="mp-fig-num">' + money(t.receipts) + '</div><span class="mp-fig-lbl">Team receipts</span></div>'
      + '<div><div class="mp-fig-num">' + t.tracked + '</div><span class="mp-fig-lbl">With money on file</span></div>'
      + '<div><div class="mp-fig-num">' + m3.grassroots + '%</div><span class="mp-fig-lbl">Grassroots blend</span></div>'
      + '<div><div class="mp-fig-num">' + money(t.govTotal) + '</div><span class="mp-fig-lbl">Gov $ in their states</span></div>'
      + '</div>';
    var lean = '<div class="mp-lean ' + leanCls + '">' + esc(t.lean.label) + '</div>';
    var plain = '<p class="mp-money-plain">About <strong>' + m3.grassroots + '%</strong> of your team\'s money is small-dollar, versus <strong>' + m3.largePac + '%</strong> from large donors and PACs.</p>';
    var blend = mix3Bar(m3);

    var sources = t.notableSources.length
      ? '<div class="mp-money-block"><p class="mp-block-h">Notable funding sources</p><ul class="mp-donors">'
          + t.notableSources.map(function (s) {
              var tag = sourceTypeLabel(s.type) ? '<span class="mp-src-type">' + esc(sourceTypeLabel(s.type)) + '</span>' : '';
              return '<li><span>' + esc(s.name) + ' ' + tag + '</span><span>' + money(s.amount) + '</span></li>';
            }).join('')
          + '</ul></div>'
      : '';
    var sectors = t.topSectors.length
      ? '<div class="mp-money-block"><p class="mp-block-h">Industries following your team</p><div class="mp-sectors">'
          + t.topSectors.map(function (s) { return '<span class="mp-chip">' + esc(s.name) + ' · ' + money(s.amount) + '</span>'; }).join('')
          + '</div></div>'
      : '';

    // Money ↔ your issues — public spending tied to issues the visitor cares about.
    var issueSpend = '';
    if (ctx.issueSpending && ctx.issueSpending.length) {
      issueSpend = '<div class="mp-money-block mp-issuespend"><p class="mp-block-h">Public spending tied to your issues</p>'
        + ctx.issueSpending.map(function (r) {
            return '<div class="mp-ispend-row"><span class="mp-ispend-issue">' + esc(r.label) + '</span>'
              + '<span class="mp-ispend-amt">' + money(r.total) + '</span>'
              + '<span class="mp-ispend-top">' + esc(r.items.map(function (i) { return i.recipient; }).join(', ')) + '</span></div>';
          }).join('')
        + '<p class="mp-note">Federal contract dollars whose purpose touches issues you\'ve taken a stance on. Transparency, not a verdict.</p></div>';
    } else if (ctx.stanceCount) {
      issueSpend = '<div class="mp-money-block"><p class="mp-block-h">Public spending tied to your issues</p><p class="mp-sub">No tracked federal spending maps to your current stances yet. As you add stances on spending-heavy issues (defense, health, energy), the dollars will surface here.</p></div>';
    }

    var summary = '<div class="mp-money-summary">' + lean + figs + plain + blend + sources + sectors + issueSpend + '</div>';

    // Per-politician branches — grouped bar first, detail beneath.
    var branches = tree.nodes.map(function (n) {
      var mix = n.mix3 ? mix3Bar(n.mix3, { noLegend: true }) : '';
      var chips = n.sectors && n.sectors.length
        ? '<div class="mp-sectors mp-branch-sectors">' + n.sectors.slice(0, 3).map(function (s) { return '<span class="mp-chip">' + esc(s.name) + '</span>'; }).join('') + '</div>'
        : '';
      var donors = n.moneyIn.length
        ? '<ul class="mp-donors">' + n.moneyIn.map(function (d) {
            return '<li><span>' + esc(d.name) + '</span><span>' + money(d.amount) + '</span></li>';
          }).join('') + '</ul>'
        : '';
      var gov = n.gov
        ? '<div class="mp-branch-gov">🏛 <strong>' + money(n.gov.total) + '</strong> in federal contracts flow to ' + esc(n.gov.state)
          + (n.gov.top && n.gov.top.length ? ' — top: ' + n.gov.top.map(function (x) { return esc(x.recipient) + ' (' + money(x.amount) + ')'; }).join(', ') : '') + '.</div>'
        : '';
      return '<div class="mp-branch">'
        + '<div class="mp-branch-head"><span class="mp-branch-name">' + esc(n.name) + '</span>'
        + (n.office ? '<span class="mp-branch-office">' + esc(n.office) + '</span>' : '') + signalChip(n.signal) + '</div>'
        + mix + chips + donors + gov + '</div>';
    }).join('');

    var body = summary
      + '<p class="mp-block-h" style="margin:0.4rem 0 0.6rem">Branch by branch</p>'
      + branches
      + '<p class="mp-money-note">Each branch traces the money <em>in</em> (who funds them) and the public money <em>around</em> them (contracts where they hold office). Built on a normalized structure, so bill-level and outcome-level flows can grow here next without a rebuild.</p>';
    return section('Your money tree', '💰', null, null, body);
  }

  /* ── compose ────────────────────────────────────────────────────────── */
  function buildContext() {
    var stances = myStances();
    var pids = teamPids();
    var stats = impactStats();
    var alignment = computeAlignment(stances, pids);
    var userIssueKeys = stances.map(function (s) { return s && s.issueKey; }).filter(Boolean);
    return {
      user: currentUser(),
      stats: stats,
      stances: stances,
      stanceCount: stances.length,
      teamPids: pids,
      teamCount: pids.length,
      contacted: contactedCount(),
      contradictions: teamContradictions(pids),
      alignment: alignment,
      issueSpending: contractsForIssues(userIssueKeys),
      tree: buildMoneyTree()
    };
  }

  function render() {
    var host = el(MOUNT);
    if (!host) return;
    var ctx = buildContext();
    var html = renderIdentity(ctx)
      + renderGuide(ctx)
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
