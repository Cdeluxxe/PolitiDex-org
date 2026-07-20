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
    var lead = issues.length >= 2
      ? 'This bill bundles <strong>' + issues.length + ' issues</strong> into one vote — so a single Yea or Nay is really a decision on each of these.'
      : 'This is a single-issue measure.';
    var rows = issues.map(function (it) {
      var opposes = it.supportMeaning === 'yea_opposes';
      var effCls = opposes ? 'bd-eff-opp' : 'bd-eff-adv';
      var effTxt = opposes ? 'A Yea cuts against this' : 'A Yea advances this';
      return '<div class="bd-omni-row">' +
        '<div class="bd-omni-head">' +
          '<span class="bd-omni-issue">' + esc(issueLabel(it.issueKey)) + '</span>' +
          (it.isPrimary ? '<span class="bd-omni-primary">Primary</span>' : '') +
          '<span class="bd-eff ' + effCls + '">' + effTxt + '</span>' +
        '</div>' +
        (it.rationale ? '<div class="bd-omni-why">' + esc(it.rationale) + '</div>' : '') +
      '</div>';
    }).join('');
    return '<section class="bd-sec"><h3 class="bd-h">📦 What’s inside this vote</h3>' +
      '<p class="bd-lead">' + lead + '</p>' + rows + '</section>';
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

  // A lightweight, sourced timeline synthesized from the data we already have:
  // introduction, each roll call (chamber + result), and the current status. A
  // dedicated actions table can enrich this in Phase 3 without changing callers.
  function timelineSection(m, rollcalls) {
    var events = [];
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
    if (events.length < 2) return '';
    events.sort(function (a, b) { return (a.date ? new Date(a.date).getTime() : Infinity) - (b.date ? new Date(b.date).getTime() : Infinity); });
    var items = events.map(function (e) {
      return '<li class="bd-tl-item"><span class="bd-tl-dot" aria-hidden="true"></span>' +
        '<div class="bd-tl-body"><span class="bd-tl-date">' + (e.date ? esc(fmtDate(e.date)) : '') + '</span>' +
        '<span class="bd-tl-label">' + (e.url ? '<a href="' + escAttr(e.url) + '" target="_blank" rel="noopener">' + esc(e.label) + '</a>' : esc(e.label)) + '</span>' +
        (e.sub ? '<span class="bd-tl-sub">' + esc(e.sub) + '</span>' : '') + '</div></li>';
    }).join('');
    return '<section class="bd-sec"><h3 class="bd-h">🕒 Key actions</h3><ul class="bd-tl">' + items + '</ul></section>';
  }

  function relatedSection(m, issues) {
    var parts = [];
    // Issue Spotlights tied to any of this bill's component issues.
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
    return '<section class="bd-sec"><h3 class="bd-h">🔗 Related</h3>' + parts.join('') + '</section>';
  }

  // ── render ──────────────────────────────────────────────────────────────────
  function bodyHtml(data) {
    var m = data.measure || {};
    var issues = data.issues || [];
    var status = m.status ? '<span class="bd-status bd-s-' + esc(m.status) + '">' + esc(statusLabel(m.status)) + '</span>' : '';
    var omni = issues.length >= 2 ? '<span class="bd-omnibadge">📦 Omnibus · ' + issues.length + ' issues</span>' : '';
    var meta = [chamberLabel(m.chamber), m.congress ? (m.congress + 'th Congress') : ''].filter(Boolean).join(' · ');
    var src = (m.source && m.source.url)
      ? '<a class="bd-src bd-src-top" href="' + escAttr(m.source.url) + '" target="_blank" rel="noopener">🔗 ' + esc(m.source.label || 'Official record') + '</a>' : '';
    return '<div class="bd-head">' +
        '<div class="bd-head-top"><span class="bd-num">' + esc(m.number || 'Measure') + '</span>' + status + omni + '</div>' +
        '<h2 class="bd-title">' + esc(m.title || '') + '</h2>' +
        (meta ? '<div class="bd-meta">' + esc(meta) + '</div>' : '') +
        (m.summary ? '<p class="bd-summary">' + esc(m.summary) + '</p>' : '') +
        src +
      '</div>' +
      omnibusSection(m, issues) +
      rollcallsSection(m, issues, data.rollcalls) +
      sponsorsSection(m, data.positions) +
      timelineSection(m, data.rollcalls) +
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
      if (sb) { var slug = sb.getAttribute('data-slug'); if (slug && window.PDXSpotlight && window.PDXSpotlight.open) { close(); window.PDXSpotlight.open(slug); } }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !ov.hidden) close(); });
    return ov;
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
  }

  function renderLoading() { show('<div class="bd-loading"><span class="bd-spin"></span> Loading bill…</div>'); }
  function renderError(card) {
    var src = card && card.source && card.source.url;
    show('<div class="bd-loading">Could not load this bill right now.' +
      (src ? ' <a class="bd-src" href="' + escAttr(src) + '" target="_blank" rel="noopener">Open the official record →</a>' : '') + '</div>');
  }

  // Resolve a card ref (numeric id, or a bill number like "H.R. 1") to a measure id,
  // then fetch + render. Falls back to the canonical source when detail can't load.
  function open(ref) {
    var bills = G('PDXBills');
    if (!bills || typeof bills.get !== 'function') { // no client module → best-effort source
      var c = bills && bills.listSync ? findByNumber(bills.listSync().items, ref) : null;
      if (c && c.source && c.source.url) window.open(c.source.url, '_blank', 'noopener');
      return false;
    }
    renderLoading();
    resolveId(ref, bills).then(function (id) {
      if (id == null) { renderError(findByNumber((bills.listSync ? bills.listSync().items : []), ref)); return; }
      bills.get(id).then(function (data) {
        if (data && data.measure) show(bodyHtml(data));
        else renderError(null);
      });
    });
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
      '.bd-omni-head{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;}' +
      '.bd-omni-issue{font:700 .9rem/1.2 "Barlow Condensed",sans-serif;color:#e6eefc;}' +
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
      '@media (max-width:640px){.bd-panel{width:100vw;max-height:100vh;margin:0;border-radius:0;}.bd-scroll{padding:1.1rem 1rem 2rem;}}';
    var st = document.createElement('style');
    st.id = 'bd-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  window.PDXBillDetail = { open: open, close: close };
})();
