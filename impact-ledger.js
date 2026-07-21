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

  window.PDXImpactLedger = {
    renderHTML: renderHTML,
    mountInto: mountInto,
    COHORTS: COHORTS
  };
})();
