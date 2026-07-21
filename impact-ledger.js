/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Distributional Impact Ledger  ·  window.PDXImpactLedger
   ────────────────────────────────────────────────────────────────────────────
   "Who It Affects": a neutral, sourced, per-cohort read of how a measure's costs
   and benefits fall across income and economic groups. It is the class/economic
   sibling of the Evidence Locker's _strength() and Follow-the-Money's
   _financeSignal() — a transparent, reasons-listed, SOURCED structural read, never
   a verdict on whether a policy is good or bad.

   INPUT: the exact object GET /api/voting-record/measure/:id already returns. It
   reads `data.impacts` (each: { cohort, provisionId, direction, magnitudeValue,
   magnitudeUnit, magnitudeLabel, metric, methodology, evidenceStrength, asOf,
   source:{url,label} }) and `data.provisions` (for provision labels). Renders an
   HTML string that drops straight into the Bill-detail panel as another section.

   NEUTRALITY (see DISTRIBUTIONAL_IMPACT.md):
     • Every figure names its scorekeeper and links to the source. A row with no
       source is dropped, never shown.
     • Direction (benefit / cost) is descriptive, not a value judgement; both are
       shown side by side. Colour is backed by an arrow + text label so meaning
       never depends on colour alone (colour-blind safe), and the palette is
       deliberately non-partisan (teal / amber, never red / blue).
     • A standing disclaimer states this describes distribution and access, not
       corruption, motive, or merit.

   Fully additive: pure render helper, mutates no app state, no network calls.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXImpactLedger) return; // idempotent — never redefine

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escAttr(s) { return esc(s); }

  // Cohort presentation. Order here is the render order. Definitions are anchored to
  // how official scorekeepers slice the data — never a rhetorical label.
  var COHORTS = [
    { key: 'working_middle',        icon: '🧑‍🏭', name: 'Working & middle-income households', def: 'Lower- and middle-income quintiles (Census / CBO / JCT income brackets).' },
    { key: 'small_biz_contractors', icon: '🧰',         name: 'Small businesses & contractors',      def: 'Pass-through, Schedule-C and 1099 filers (JCT / SBA / Treasury).' },
    { key: 'high_income_wealth',    icon: '💼',         name: 'High-income & high-wealth',           def: 'Top income and wealth brackets (roughly top 5% / 1%).' },
    { key: 'large_corporations',    icon: '🏢',         name: 'Large corporations',                  def: 'C-corporations and large business filers.' },
    { key: 'government_insiders',   icon: '🏛️',         name: 'Government & insiders',               def: 'Agencies, incumbents, and concentrated federal contractors.' }
  ];
  var COHORT_BY_KEY = {};
  COHORTS.forEach(function (c) { COHORT_BY_KEY[c.key] = c; });

  var STRENGTH = {
    strong:   { cls: 'pdx-il-str-strong',   label: 'Strong evidence',   note: 'Official CBO/JCT distributional table.' },
    moderate: { cls: 'pdx-il-str-moderate', label: 'Moderate evidence', note: 'Single named independent model.' },
    limited:  { cls: 'pdx-il-str-limited',  label: 'Limited evidence',  note: 'Directional; per-cohort magnitude not published.' }
  };

  var DIR = {
    benefit: { cls: 'pdx-il-dir-benefit', arrow: '▲', label: 'benefit' },
    cost:    { cls: 'pdx-il-dir-cost',    arrow: '▼', label: 'cost' },
    mixed:   { cls: 'pdx-il-dir-mixed',   arrow: '◆', label: 'mixed' },
    neutral: { cls: 'pdx-il-dir-neutral', arrow: '●', label: 'neutral' }
  };

  // Ensure the stylesheet is present even when this renders inside a modal shell.
  function injectCss() {
    try {
      if (document.getElementById('pdx-il-css-link')) return;
      // Already linked from index.html? Then nothing to do.
      if (document.querySelector('link[href="/impact-ledger.css"], link[href="impact-ledger.css"]')) return;
      var l = document.createElement('link');
      l.id = 'pdx-il-css-link';
      l.rel = 'stylesheet';
      l.href = '/impact-ledger.css';
      document.head.appendChild(l);
    } catch (e) {}
  }

  function fmtDate(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }); }
    catch (e) { return String(iso).slice(0, 7); }
  }

  // Build the magnitude string. A signed % of income reads on its own; otherwise the
  // author-written qualitative label carries it. Both may combine.
  function magnitudeText(im) {
    var parts = [];
    if (im.magnitudeValue != null && im.magnitudeUnit === 'pct_income') {
      var v = Number(im.magnitudeValue);
      var sign = v > 0 ? '+' : (v < 0 ? '−' : '');
      parts.push(sign + Math.abs(v) + '% of income');
    }
    if (im.magnitudeLabel) parts.push(im.magnitudeLabel);
    return parts.join(' · ');
  }

  // Is this impact quantified on the comparable (pct_income) scale?
  function quantPct(im) {
    return im.magnitudeValue != null && im.magnitudeUnit === 'pct_income';
  }

  // Net direction of a cohort's impacts: benefit / cost / mixed (neutral ignored).
  function netDirection(list) {
    var b = 0, c = 0;
    list.forEach(function (im) {
      if (im.direction === 'benefit') b++;
      else if (im.direction === 'cost') c++;
    });
    if (b && c) return 'mixed';
    if (b) return 'benefit';
    if (c) return 'cost';
    return 'neutral';
  }

  function impactRow(im, provLabel, maxAbs) {
    var d = DIR[im.direction] || DIR.mixed;
    var st = STRENGTH[im.evidenceStrength] || STRENGTH.moderate;
    var isPct = quantPct(im);
    // Bar width: scaled for the comparable %-of-income rows; a fixed, dashed marker
    // for qualitative rows so they read as "direction known, not to scale".
    var widthPct = isPct ? Math.max(8, Math.min(100, Math.round(Math.abs(Number(im.magnitudeValue)) / (maxAbs || 1) * 100))) : 38;
    var barCls = 'pdx-il-bar ' + d.cls + (isPct ? '' : ' pdx-il-bar-qual');
    // The track has a centre axis; a benefit bar grows right, a cost bar grows left.
    var side = im.direction === 'benefit' ? 'pdx-il-right' : (im.direction === 'cost' ? 'pdx-il-left' : 'pdx-il-center');
    var mag = magnitudeText(im);
    var ariaMag = mag ? (', ' + mag) : '';
    var track =
      '<div class="pdx-il-track" role="img" aria-label="' + escAttr((COHORT_BY_KEY[im.cohort] ? COHORT_BY_KEY[im.cohort].name : im.cohort) + ': ' + d.label + ariaMag) + '">' +
        '<span class="pdx-il-axis0" aria-hidden="true"></span>' +
        '<span class="' + barCls + ' ' + side + '" style="width:' + widthPct + '%" aria-hidden="true"></span>' +
      '</div>';

    var src = (im.source && im.source.url)
      ? '<a class="pdx-il-src" href="' + escAttr(im.source.url) + '" target="_blank" rel="noopener">🔗 Verify at ' + esc(im.source.label || 'source') + '</a>'
      : '';
    var asOf = im.asOf ? '<span class="pdx-il-asof">As of ' + esc(fmtDate(im.asOf)) + '</span>' : '';
    var prov = provLabel ? '<span class="pdx-il-prov">part of: ' + esc(provLabel) + '</span>' : '';

    return '<li class="pdx-il-impact">' +
        '<div class="pdx-il-imeta">' +
          '<span class="pdx-il-dir ' + d.cls + '">' + d.arrow + ' ' + d.label + '</span>' +
          (mag ? '<span class="pdx-il-mag">' + esc(mag) + '</span>' : '') +
          '<span class="pdx-il-strength ' + st.cls + '" title="' + escAttr(st.note) + '">' + esc(st.label) + '</span>' +
        '</div>' +
        track +
        '<div class="pdx-il-metric">' + esc(im.metric || '') + (prov ? ' ' + prov : '') + '</div>' +
        '<details class="pdx-il-more">' +
          '<summary>Why this reading</summary>' +
          (im.methodology ? '<p class="pdx-il-method">' + esc(im.methodology) + '</p>' : '') +
          '<p class="pdx-il-strnote">' + esc(st.label) + ' — ' + esc(st.note) + '</p>' +
          '<div class="pdx-il-srcline">' + src + ' ' + asOf + '</div>' +
        '</details>' +
      '</li>';
  }

  function cohortCard(cohortKey, list, provById, maxAbs) {
    var meta = COHORT_BY_KEY[cohortKey] || { icon: '•', name: cohortKey, def: '' };
    var net = netDirection(list);
    var nd = DIR[net] || DIR.mixed;
    var netLabel = net === 'benefit' ? 'net benefit' : net === 'cost' ? 'bears net cost' : net === 'mixed' ? 'mixed effects' : 'neutral';
    var rows = list.map(function (im) {
      return impactRow(im, im.provisionId != null ? provById[im.provisionId] : '', maxAbs);
    }).join('');
    return '<div class="pdx-il-cohort">' +
        '<div class="pdx-il-chead">' +
          '<span class="pdx-il-cicon" aria-hidden="true">' + meta.icon + '</span>' +
          '<span class="pdx-il-cname">' + esc(meta.name) + '</span>' +
          '<span class="pdx-il-cnet ' + nd.cls + '">' + nd.arrow + ' ' + esc(netLabel) + '</span>' +
        '</div>' +
        (meta.def ? '<div class="pdx-il-cdef">' + esc(meta.def) + '</div>' : '') +
        '<ul class="pdx-il-impacts">' + rows + '</ul>' +
      '</div>';
  }

  var DISCLAIMER =
    'This shows <strong>who</strong> a measure’s estimated costs and benefits fall on, by economic group, using ' +
    'nonpartisan scorekeepers. It describes <strong>distribution and access</strong> — not corruption, motive, or ' +
    'whether the policy is good or bad. Where scorekeepers differ, each estimate is shown with its own source.';

  // Public: render the ledger for a measure-detail payload → HTML string ('' if none).
  function renderHTML(data) {
    injectCss();
    if (!data || !data.impacts || !data.impacts.length) return '';
    var impacts = data.impacts;

    var provById = {};
    (data.provisions || []).forEach(function (p) { if (p && p.id != null) provById[p.id] = p.label; });

    // Shared scale across every comparable (%-of-income) row so bar lengths mean the
    // same thing in every cohort.
    var maxAbs = 0;
    impacts.forEach(function (im) { if (quantPct(im)) maxAbs = Math.max(maxAbs, Math.abs(Number(im.magnitudeValue))); });
    if (!maxAbs) maxAbs = 1;

    var grouped = {};
    impacts.forEach(function (im) { (grouped[im.cohort] || (grouped[im.cohort] = [])).push(im); });

    var cards = COHORTS
      .filter(function (c) { return grouped[c.key] && grouped[c.key].length; })
      .map(function (c) { return cohortCard(c.key, grouped[c.key], provById, maxAbs); })
      .join('');
    if (!cards) return '';

    // Count distinct named sources so the header can advertise the sourcing at a glance.
    var srcSet = {};
    impacts.forEach(function (im) { if (im.source && im.source.label) srcSet[im.source.label] = 1; });
    var nSrc = Object.keys(srcSet).length;

    return '<section class="bd-sec pdx-il">' +
        '<h3 class="bd-h">⚖️ Who It Affects</h3>' +
        '<p class="bd-lead">How nonpartisan scorekeepers estimate this measure’s costs and benefits fall across income and economic groups' +
          (nSrc ? ' · ' + nSrc + ' source' + (nSrc !== 1 ? 's' : '') : '') + '. Sourced and directional — not a verdict.</p>' +
        '<p class="pdx-il-disclaimer">' + DISCLAIMER + '</p>' +
        '<div class="pdx-il-axislabels" aria-hidden="true"><span>◀ bears cost</span><span>benefit ▶</span></div>' +
        '<div class="pdx-il-grid">' + cards + '</div>' +
      '</section>';
  }

  // Public: render straight into a container element.
  function mountInto(el, data) {
    if (!el) return false;
    var html = renderHTML(data);
    if (!html) return false;
    el.innerHTML = html;
    return true;
  }

  /* ════════════════════════════════════════════════════════════════════════
     Promise Tracker integration — "Say vs. Do" for a claimed beneficiary.
     ────────────────────────────────────────────────────────────────────────
     A promise may carry an optional `claimedBeneficiary` (a cohort key — who the
     promise SAYS it helps) and an optional `impactMeasureId` (the measure whose
     distributional ledger is the receipt). Where both exist, the Promise Tracker
     shows the stated beneficiary beside what nonpartisan scorekeepers estimate for
     that same group on the linked measure — the two facts side by side, no verdict.
     ════════════════════════════════════════════════════════════════════════ */

  // Most representative impact for a cohort: strongest evidence first, then a
  // quantified (%-of-income) figure, then whatever remains.
  function pickTopImpact(list) {
    var order = { strong: 0, moderate: 1, limited: 2 };
    return list.slice().sort(function (a, b) {
      var s = (order[a.evidenceStrength] == null ? 1 : order[a.evidenceStrength]) -
              (order[b.evidenceStrength] == null ? 1 : order[b.evidenceStrength]);
      if (s) return s;
      return (quantPct(a) ? 0 : 1) - (quantPct(b) ? 0 : 1);
    })[0];
  }

  // The compact "Do" line for one cohort, given a measure's full impacts array.
  function renderPromiseSummaryHTML(cohortKey, impacts) {
    var list = (impacts || []).filter(function (im) { return im.cohort === cohortKey; });
    if (!list.length) {
      return '<span class="pdx-ilp-none">No scored effect for this group in the linked measure.</span>';
    }
    var net = netDirection(list);
    var nd = DIR[net] || DIR.mixed;
    var netLabel = net === 'benefit' ? 'net benefit' : net === 'cost' ? 'net cost' : net === 'mixed' ? 'mixed' : 'neutral';
    var top = pickTopImpact(list);
    var st = STRENGTH[top.evidenceStrength] || STRENGTH.moderate;
    var mag = magnitudeText(top);
    var src = (top.source && top.source.url)
      ? '<a class="pdx-ilp-src" href="' + escAttr(top.source.url) + '" target="_blank" rel="noopener">🔗 Verify at ' + esc(top.source.label || 'source') + '</a>'
      : '';
    return '<span class="pdx-ilp-dolab">Independent estimate for this group</span> ' +
      '<span class="pdx-ilp-dir ' + nd.cls + '">' + nd.arrow + ' ' + esc(netLabel) + '</span>' +
      (mag ? ' <span class="pdx-ilp-mag">' + esc(mag) + '</span>' : '') +
      ' <span class="pdx-ilp-strength ' + st.cls + '">' + esc(st.label) + '</span>' +
      (src ? ' ' + src : '');
  }

  // The optional per-promise helper the Promise Tracker calls (as
  // window._pdxPromiseImpactHTML). Returns '' unless the promise names a valid
  // claimedBeneficiary. When it also links a measure, a placeholder is emitted and
  // filled asynchronously by the hydrator below.
  function promiseImpactHTML(polId, profile, promise) {
    var r = promise || {};
    var cohortKey = r.claimedBeneficiary;
    if (!cohortKey || !COHORT_BY_KEY[cohortKey]) return '';
    injectCss();
    var meta = COHORT_BY_KEY[cohortKey];
    var mid = r.impactMeasureId;
    var hasMeasure = mid != null && mid !== '' && !isNaN(parseInt(mid, 10));
    var doBlock = hasMeasure
      ? '<div class="pdx-ilp-do" data-il-promise-measure="' + escAttr(String(parseInt(mid, 10))) +
          '" data-il-promise-cohort="' + escAttr(cohortKey) + '"><span class="pdx-ilp-loading">Loading independent estimate…</span></div>'
      : '';
    return '<div class="pdx-ilp">' +
        '<div class="pdx-ilp-say"><span class="pdx-ilp-lab">🗣️ Says this helps</span> ' +
          '<span class="pdx-ilp-cohort">' + meta.icon + ' ' + esc(meta.name) + '</span></div>' +
        doBlock +
        (hasMeasure ? '<div class="pdx-ilp-note">Stated beneficiary vs. nonpartisan scorekeeper estimates — distribution, not motive or a verdict.</div>' : '') +
      '</div>';
  }

  // ── async hydration ─────────────────────────────────────────────────────────
  // Reuse PDXBills.get (already cached, returns the measure payload incl. impacts);
  // fall back to a direct fetch when that module isn't present.
  var _measureCache = {};
  function fetchMeasure(id) {
    if (_measureCache[id]) return _measureCache[id];
    var pb = window.PDXBills;
    var p;
    if (pb && typeof pb.get === 'function') {
      p = Promise.resolve(pb.get(id)).catch(function () { return null; });
    } else {
      p = fetch('/api/voting-record/measure/' + encodeURIComponent(id), { headers: { accept: 'application/json' } })
        .then(function (res) { return res.ok ? res.json() : null; })
        .catch(function () { return null; });
    }
    _measureCache[id] = p;
    return p;
  }

  function hydratePromiseSummaries(root) {
    root = root || document;
    var nodes;
    try { nodes = root.querySelectorAll('[data-il-promise-measure]:not([data-il-done])'); } catch (e) { return; }
    if (!nodes || !nodes.length) return;
    var byMeasure = {};
    Array.prototype.forEach.call(nodes, function (el) {
      el.setAttribute('data-il-done', '1'); // claim immediately — avoids re-entrancy
      var mid = el.getAttribute('data-il-promise-measure');
      (byMeasure[mid] || (byMeasure[mid] = [])).push(el);
    });
    Object.keys(byMeasure).forEach(function (mid) {
      fetchMeasure(mid).then(function (data) {
        var impacts = (data && data.impacts) ? data.impacts : [];
        byMeasure[mid].forEach(function (el) {
          var cohort = el.getAttribute('data-il-promise-cohort');
          try { el.innerHTML = renderPromiseSummaryHTML(cohort, impacts); } catch (e) { el.innerHTML = ''; }
        });
      });
    });
  }

  /* ════════════════════════════════════════════════════════════════════════
     Follow the Money — side by side (profile).
     ────────────────────────────────────────────────────────────────────────
     Pairs the existing Constituents-First finance signal (who funds them) with a
     distributional summary of the measures they have a recorded vote/position on
     (who their key votes affect). The "Do" side is filled asynchronously from the
     read-only /api/voting-record/member/:id/impacts route.
     ════════════════════════════════════════════════════════════════════════ */

  var SXS_DISCLAIMER =
    'Pairs <strong>who funds</strong> this official with <strong>who their record’s costs and benefits fall on</strong> — ' +
    'both are matters of public record. It shows financial access and distributional effect, ' +
    'not corruption, motive, or causation.';

  var _memberImpactsCache = {};
  function fetchMemberImpacts(id) {
    if (_memberImpactsCache[id]) return _memberImpactsCache[id];
    var p = fetch('/api/voting-record/member/' + encodeURIComponent(id) + '/impacts', { headers: { accept: 'application/json' } })
      .then(function (res) { return res.ok ? res.json() : null; })
      .catch(function () { return null; });
    _memberImpactsCache[id] = p;
    return p;
  }

  // Compact, faithful recap of the finance signal for the left column (does not
  // recompute anything — just restates the already-computed signal object).
  function financeRecapHTML(sig) {
    if (!sig) return '';
    var color = sig.color || '#9fb4d4';
    var shares = sig.shares || {};
    var sd = shares.smallDollar == null ? null : shares.smallDollar;
    var conc = shares.concentrated == null ? null : shares.concentrated;
    var barGrass = sd == null ? '' :
      '<div class="pdx-ilx-fbar"><span class="pdx-ilx-fbar-lab">Small-dollar</span>' +
        '<span class="pdx-ilx-fbar-track"><span class="pdx-ilx-fbar-fill" style="width:' + Math.max(2, sd) + '%;background:#4ade80;"></span></span>' +
        '<span class="pdx-ilx-fbar-pct" style="color:#4ade80;">' + sd + '%</span></div>';
    var barConc = conc == null ? '' :
      '<div class="pdx-ilx-fbar"><span class="pdx-ilx-fbar-lab">Large indiv + PAC</span>' +
        '<span class="pdx-ilx-fbar-track"><span class="pdx-ilx-fbar-fill" style="width:' + Math.max(2, conc) + '%;background:#f5c842;"></span></span>' +
        '<span class="pdx-ilx-fbar-pct" style="color:#f5c842;">' + conc + '%</span></div>';
    return '<div class="pdx-ilx-col">' +
        '<div class="pdx-ilx-lab">Who funds them</div>' +
        '<div class="pdx-ilx-fscore" style="border-color:' + color + '55;">' +
          '<span class="pdx-ilx-fnum" style="color:' + color + ';">' + esc(String(sig.score)) + '</span>' +
          '<span class="pdx-ilx-flabel">' + esc(sig.label || '') + '</span>' +
        '</div>' +
        barGrass + barConc +
        (sig.cycle ? '<div class="pdx-ilx-fnote">Itemized public filings' + (sig.cycle ? ' · ' + esc(String(sig.cycle)) : '') + '</div>' : '') +
        '<a class="pdx-ilx-morelink" href="#follow-the-money">Full finance breakdown →</a>' +
      '</div>';
  }

  // The "Do" column — the member's measures that carry ledger data.
  function renderMemberImpactsHTML(data) {
    var measures = (data && data.measures) ? data.measures : [];
    if (!measures.length) {
      return '<p class="pdx-ilx-empty">No scored distributional analysis is tied to this official’s recorded votes yet.</p>';
    }
    return measures.map(function (m) {
      var byCohort = {};
      (m.impacts || []).forEach(function (im) { (byCohort[im.cohort] || (byCohort[im.cohort] = [])).push(im); });
      var chips = COHORTS.filter(function (c) { return byCohort[c.key] && byCohort[c.key].length; }).map(function (c) {
        var net = netDirection(byCohort[c.key]);
        var nd = DIR[net] || DIR.mixed;
        var netLabel = net === 'benefit' ? 'net benefit' : net === 'cost' ? 'net cost' : net === 'mixed' ? 'mixed' : 'neutral';
        return '<span class="pdx-ilx-chip ' + nd.cls + '" title="' + escAttr(c.name + ': ' + netLabel) + '">' +
          c.icon + ' ' + esc(c.name) + ' <b>' + nd.arrow + '</b></span>';
      }).join('');
      var act = m.memberAction ? '<span class="pdx-ilx-act">' + esc(m.memberAction) + '</span>' : '';
      var src = (m.source && m.source.url)
        ? '<a class="pdx-ilx-verify" href="' + escAttr(m.source.url) + '" target="_blank" rel="noopener">🔗 Verify</a>' : '';
      return '<div class="pdx-ilx-measure">' +
          '<div class="pdx-ilx-mhead">' +
            (m.number ? '<span class="pdx-ilx-mnum">' + esc(m.number) + '</span>' : '') +
            '<span class="pdx-ilx-mtitle">' + esc(m.title || 'Measure') + '</span>' + act +
          '</div>' +
          '<div class="pdx-ilx-chips">' + chips + '</div>' +
          (src ? '<div class="pdx-ilx-mfoot">' + src + '</div>' : '') +
        '</div>';
    }).join('');
  }

  // Public: build the whole side-by-side section for a profile. `sig` is the finance
  // signal object (window._pdxFinanceSignal(id)); returns '' when there's no signal to
  // pair against. The distributional column fills asynchronously; the section hides
  // itself if the official has no ledger-scored votes, so it never adds empty noise.
  function memberSideBySideHTML(id, sig) {
    if (!id || !sig) return '';
    injectCss();
    return '<div class="modal-section pdx-ilx" data-il-sxs="' + escAttr(String(id)) + '" style="display:none;">' +
        '<div class="modal-section-title">💰 Follow the Money — Side by Side</div>' +
        '<p class="pdx-ilx-disclaimer">' + SXS_DISCLAIMER + '</p>' +
        '<div class="pdx-ilx-grid">' +
          financeRecapHTML(sig) +
          '<div class="pdx-ilx-col">' +
            '<div class="pdx-ilx-lab">Who their key votes affect</div>' +
            '<div class="pdx-ilx-do" data-il-member-impacts="' + escAttr(String(id)) + '">' +
              '<span class="pdx-ilp-loading">Loading their key votes…</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function hydrateMemberImpacts(root) {
    root = root || document;
    var nodes;
    try { nodes = root.querySelectorAll('[data-il-member-impacts]:not([data-il-done])'); } catch (e) { return; }
    if (!nodes || !nodes.length) return;
    Array.prototype.forEach.call(nodes, function (el) {
      el.setAttribute('data-il-done', '1');
      var id = el.getAttribute('data-il-member-impacts');
      fetchMemberImpacts(id).then(function (data) {
        var measures = (data && data.measures) ? data.measures : [];
        var section = el.closest ? el.closest('[data-il-sxs]') : null;
        // Nothing scored for this official → don't show an empty pairing.
        if (!measures.length) { if (section) section.style.display = 'none'; return; }
        try { el.innerHTML = renderMemberImpactsHTML(data); } catch (e) { el.innerHTML = ''; }
        if (section) section.style.display = '';
      });
    });
  }

  function hydrateAll(root) {
    hydratePromiseSummaries(root);
    hydrateMemberImpacts(root);
  }

  var _hydrateScheduled = false;
  function scheduleHydrate() {
    if (_hydrateScheduled) return;
    _hydrateScheduled = true;
    setTimeout(function () { _hydrateScheduled = false; hydrateAll(document); }, 60);
  }
  function bootHydrate() {
    hydrateAll(document);
    try {
      var SEL = '[data-il-promise-measure]:not([data-il-done]), [data-il-member-impacts]:not([data-il-done])';
      var mo = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var added = muts[i].addedNodes; if (!added) continue;
          for (var j = 0; j < added.length; j++) {
            var n = added[j]; if (!n || n.nodeType !== 1) continue;
            if ((n.matches && n.matches(SEL)) || (n.querySelector && n.querySelector(SEL))) {
              scheduleHydrate(); return;
            }
          }
        }
      });
      mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootHydrate);
  else bootHydrate();

  // The app calls these optional globals (same pattern as window._pdxPromiseVideo /
  // _pdxFinanceSignalHTML): one from the Promise Tracker row, one from the profile.
  window._pdxPromiseImpactHTML = promiseImpactHTML;
  window._pdxMemberImpactsSideBySide = memberSideBySideHTML;

  window.PDXImpactLedger = {
    renderHTML: renderHTML,
    mountInto: mountInto,
    renderPromiseSummaryHTML: renderPromiseSummaryHTML,
    promiseImpactHTML: promiseImpactHTML,
    renderMemberImpactsHTML: renderMemberImpactsHTML,
    memberSideBySideHTML: memberSideBySideHTML,
    hydratePromiseSummaries: hydratePromiseSummaries,
    hydrateMemberImpacts: hydrateMemberImpacts,
    COHORTS: COHORTS
  };
})();
