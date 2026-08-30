/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — Core National Issue colors  ·  window.PDXIssueColors
   ────────────────────────────────────────────────────────────────────────────
   ONE SOURCE OF TRUTH for "what color is this issue". Every surface that names
   an issue — a Word vs Action row, a stance chip, an Issue Spotlight card, a
   coverage gap, an Alignment pick — asks this module and gets the same answer,
   so the same issue is the same color everywhere and changing a color here
   changes it everywhere.

   THIS IS PURELY VISUAL. Nothing here reads, produces or influences a score, a
   verdict, a coverage level or a piece of data. A color is a recognition aid,
   never a judgement: it says "this is the healthcare row", not "this row is
   good or bad". Verdict colors (green / amber / red) are a SEPARATE vocabulary
   that stays exactly where it is — a row can carry an issue color on its spine
   and a verdict color on its label at the same time, and they mean different
   things on purpose.

   IT ALSO COLOURS THE ROLLUPS. Some surfaces filter by a handful of broad topics
   ("Economy & Taxes", "Health Care") instead of by a leaf key. Each of those
   rollups DECLARES which core issue it inherits from, in ROLLUP_PARENT below, so
   a rollup chip and the leaf chips inside it come off the same table instead of
   off a per-page hex. A rollup with no honest parent takes the neutral rather
   than borrowing the nearest colour.

   IT DOES NOT INVENT A TAXONOMY. The keys below are the existing
   CORE_NATIONAL_ISSUES keys from alignment-tool.js. A leaf ISSUE_MAP key
   ('gun_safety', 'health_rural', …) resolves to its core bundle through the
   reverse lookup that module already publishes (window.coreIssueForKey), so
   there is no second mapping to keep in sync. Anything outside the core set —
   a local-only issue, a brand-new key, a typo — falls back to neutral slate
   rather than borrowing a color that means something else.

   CONTRAST. The `color` values are the published brand values and are used
   verbatim for borders, spines and fills. Small text needs more than some of
   them give on the dark navy background, so each entry also carries `ink`: the
   same hue lightened just far enough to clear 4.5:1 against #0a0f1e, computed
   at load rather than hand-tuned so it cannot drift from `color`. Use `color`
   for borders and fills, `ink` for text, `soft` for a flat background, and
   `wash` — the same hue at a higher alpha — for a full-width row that has to
   read as belonging to its issue from across the page.

   API:
     PDXIssueColors.CORE_ISSUE_COLORS       → { coreKey: {label,color,soft,wash,…} }
     PDXIssueColors.getIssueColor(k [, lu]) → token for a core, leaf OR rollup key
     PDXIssueColors.ROLLUP_PARENT           → { rollupKey: coreKey } (declared)
     PDXIssueColors.rollupParent(k)         → the core key a rollup inherits, or ''
     PDXIssueColors.isCore(k [, lu])        → did this key hit a real core issue?
     PDXIssueColors.FALLBACK                → the neutral slate token
     PDXIssueColors.styleFor(k [, lu])      → inline "--pdx-ic:…" style string
     PDXIssueColors.cssText() / injectVars()→ :root custom properties
     PDXIssueColors.all()                   → ordered token list
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXIssueColors) return;

  // The navy every one of these sits on. Only used to compute `ink`.
  var DARK_BG = '#0a0f1e';
  var SOFT_ALPHA = 0.14;
  var FALLBACK_SOFT_ALPHA = 0.12;
  var MIN_TEXT_CONTRAST = 4.5;
  // `soft` is the flat-fill alpha every chip and pill was tuned against, and it
  // stays exactly where it is. `wash` is its louder sibling, for the one job the
  // flat fill was never strong enough to do: a full-width row in a stack of rows,
  // where the tint has to survive being read at a glance next to a coloured edge.
  // Used as the near stop of a horizontal gradient, so the colour concentrates
  // against the spine and fades out before it reaches the text.
  var WASH_ALPHA = 0.26;
  var FALLBACK_WASH_ALPHA = 0.10;

  // ── The palette ────────────────────────────────────────────────────────────
  // Keyed by the CORE_NATIONAL_ISSUES key exactly as alignment-tool.js declares
  // it, and in that file's order, so `all()` and the taxonomy read the same way
  // down the page. `label` is the short display name for a swatch or legend —
  // the full labels (with their emoji) still live in CORE_NATIONAL_ISSUES and
  // are not duplicated here, because a label is content and this file is tokens.
  var PALETTE = [
    ['economy_cost_of_living', 'Economy & Cost of Living',  '#F5A623'],
    ['immigration_border',     'Immigration & Border',      '#2EC4B6'],
    ['healthcare',             'Healthcare Costs & Access', '#4EA8DE'],
    ['spending_debt_waste',    'Spending, Debt & Waste',    '#FF6B4A'],
    ['abortion_repro',         'Abortion / Repro. Rights',  '#E83E8C'],
    ['guns',                   'Gun Rights & Control',      '#8B9BB4'],
    ['climate_energy',         'Climate & Energy',          '#2ECC71'],
    ['crime_safety',           'Crime & Public Safety',     '#E74C3C'],
    ['election_integrity',     'Election Integrity',        '#6C5CE7'],
    // The thirteenth core issue. It sat on the neutral fallback until now, which
    // made the one core issue about who holds power look like an uncategorised
    // leaf key. Its slate is deliberately close in family to the neutral — this
    // is the structural, procedural issue, not a topic with a flag — but far
    // enough off it (ΔE ≈ 18) to read as a deliberate colour rather than a
    // fallback.
    ['checks_and_balances',    'Checks, Balances & Who Decides', '#64748B'],
    ['education_parental',     'Education & Parents',       '#FB923C'],
    ['civil_rights_culture',   'Civil Rights & Culture',    '#FD79A8'],
    ['foreign_policy_defense', 'Foreign Policy & Security', '#0984E3']
  ];

  // Spec-sheet spellings that differ from the shipped CORE_NATIONAL_ISSUES keys.
  // Kept as aliases rather than renaming the taxonomy: the core keys are written
  // into stance data, Evidence Locker filters and saved Alignment picks, so
  // renaming them would be a data migration to fix a naming preference. Callers
  // may pass either spelling.
  var ALIASES = {
    spending_debt:     'spending_debt_waste',
    education_parents: 'education_parental',
    foreign_policy:    'foreign_policy_defense'
  };

  // ── Rollup topics → the core issue whose colour they inherit ───────────────
  // A ROLLUP IS NOT A NEW COLOUR. Several surfaces do not filter by a leaf key at
  // all — they filter by a handful of scannable topics ("Economy & Taxes",
  // "Health Care", "Spending & Debt"). Those topics are bundles of the same leaf
  // keys this table already colours, so each one declares WHICH core issue it
  // rolls up into and takes that issue's colour verbatim. Nothing invents a hue
  // for a rollup, and no page picks its own: the Digital Library's Economy filter
  // is the same amber as /issue/cost_living, because both resolve to
  // economy_cost_of_living right here.
  //
  // ONE DECLARED PARENT EACH, AND WHY. The mapping is the plurality of each
  // rollup's own leaf keys inside CORE_NATIONAL_ISSUES, except where the plurality
  // would name the rollup something it is not — those exceptions are called out:
  //   economy     → economy_cost_of_living   (14 of its keys already live there)
  //   spending    → spending_debt_waste
  //   health      → healthcare
  //   immigration → immigration_border
  //   energy      → climate_energy
  //   defense     → foreign_policy_defense
  //   elections   → election_integrity
  //   government  → checks_and_balances      · its keys (reform, transparency,
  //                 stock-trading bans, court reform) are mostly outside the core
  //                 bundles; the one core issue about who decides is the honest
  //                 parent for a "Government & Reform" bundle.
  //   education   → education_parental
  //   justice     → crime_safety             · 5 keys to crime_safety, 3 to guns.
  //                 A gun chip is still the guns slate on its own key; the BUNDLE
  //                 named "Justice & Crime" reads as crime.
  //   social      → civil_rights_culture     · the plurality is actually
  //                 economy_cost_of_living, because every housing key lives in the
  //                 economy bundle. Colouring a bundle called "Family & Rights"
  //                 economy-amber would be the label lying about the colour, so it
  //                 takes the rights bundle. A housing CHIP is still amber —
  //                 a leaf chip names its leaf.
  //   rural       → economy_cost_of_living   · shares Economy's amber on purpose:
  //                 rural_ag, its only key, is inside that bundle. Two rollups may
  //                 declare the same parent; what they may not do is pick a colour
  //                 nobody declared.
  //
  // A ROLLUP WITH NO HONEST PARENT TAKES THE NEUTRAL. 'tech' is the whole reason
  // this is stated rather than assumed: the app has no technology core issue, and
  // its mapped keys split between climate_energy (the datacenter keys) and
  // civil_rights_culture (free speech). Either pick would make "Technology" read
  // as Energy or as Civil Rights. It is deliberately absent from the table, so it
  // falls back to slate — which is exactly the colour /issue/tech_innovation,
  // /issue/broadband and /issue/privacy_rights already show. Adding a core issue
  // for it is a taxonomy decision, not a colour one.
  var ROLLUP_PARENT = {
    economy:     'economy_cost_of_living',
    spending:    'spending_debt_waste',
    health:      'healthcare',
    immigration: 'immigration_border',
    energy:      'climate_energy',
    defense:     'foreign_policy_defense',
    elections:   'election_integrity',
    government:  'checks_and_balances',
    education:   'education_parental',
    justice:     'crime_safety',
    social:      'civil_rights_culture',
    rural:       'economy_cost_of_living'
  };

  // ── Color math ─────────────────────────────────────────────────────────────
  function toRgb(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (!isFinite(n)) return [148, 163, 184];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function toHex(rgb) {
    return '#' + rgb.map(function (v) {
      var s = Math.max(0, Math.min(255, Math.round(v))).toString(16);
      return s.length === 1 ? '0' + s : s;
    }).join('').toUpperCase();
  }
  function luminance(rgb) {
    var a = rgb.map(function (v) {
      var c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function contrast(a, b) {
    var la = luminance(a), lb = luminance(b);
    var hi = Math.max(la, lb), lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
  }
  // Lighten toward white in small steps until the text contrast target is met.
  // Most entries already clear it and come back untouched; the deep blues and
  // purples ('#0984E3', '#6C5CE7') and the Checks & Balances slate ('#64748B')
  // are the ones that actually move.
  //
  // Each step accumulates in floats, but the loop's exit test runs on the
  // rounded channels, because rounded channels are what `toHex` ships.
  // Measuring the float would let a color leave the loop at 4.501:1 and then
  // land at 4.499:1 once quantised — passing the check and failing reality.
  function inkFor(rgb) {
    var bg = toRgb(DARK_BG);
    var out = rgb.slice();
    for (var i = 0; i < 16 && contrast(out.map(Math.round), bg) < MIN_TEXT_CONTRAST; i++) {
      out = out.map(function (v) { return v + (255 - v) * 0.06; });
    }
    return out;
  }

  // ── Token construction ─────────────────────────────────────────────────────
  function makeToken(key, label, hex, softAlpha, mapped, washAlpha) {
    var rgb = toRgb(hex);
    var triplet = rgb.join(', ');
    return {
      key: key,
      label: label,
      color: hex,                                        // borders, spines, fills
      colorRgb: triplet,                                 // compose your own alpha
      soft: 'rgba(' + triplet + ', ' + softAlpha + ')',  // backgrounds
      wash: 'rgba(' + triplet + ', ' + (washAlpha == null ? WASH_ALPHA : washAlpha) + ')',
      ink: toHex(inkFor(rgb)),                           // small text on navy
      mapped: !!mapped                                   // false = fell back
    };
  }

  var FALLBACK = makeToken('', 'Other issue', '#94A3B8', FALLBACK_SOFT_ALPHA, false, FALLBACK_WASH_ALPHA);

  var CORE_ISSUE_COLORS = {};
  var ORDER = [];
  PALETTE.forEach(function (row) {
    CORE_ISSUE_COLORS[row[0]] = makeToken(row[0], row[1], row[2], SOFT_ALPHA, true, WASH_ALPHA);
    ORDER.push(row[0]);
  });

  // ── Key resolution ─────────────────────────────────────────────────────────
  function norm(k) {
    return (typeof k === 'string') ? k.trim().toLowerCase() : '';
  }
  function canonical(k) {
    var n = norm(k);
    return ALIASES[n] || n;
  }

  // Leaf ISSUE_MAP key → core key, built once off CORE_NATIONAL_ISSUES and
  // rebuilt if that array is ever replaced (it is loaded async in some entry
  // points, so the first call can legitimately happen before it exists).
  var _leafCache = null;
  var _leafSrc = null;
  function leafIndex() {
    var list = window.CORE_NATIONAL_ISSUES;
    if (!list || !list.length) return null;
    if (_leafCache && _leafSrc === list) return _leafCache;
    var idx = Object.create(null);
    list.forEach(function (ci) {
      if (!ci || !ci.key) return;
      (ci.keys || []).forEach(function (k) { if (k && !idx[k]) idx[k] = ci.key; });
    });
    _leafCache = idx; _leafSrc = list;
    return idx;
  }

  // `coreLookup` lets a caller supply its own resolution without this module
  // reaching for globals — a function (key → core key or core object), an array
  // shaped like CORE_NATIONAL_ISSUES, or a plain leaf→core object. Optional; the
  // shipped globals are used when it is omitted.
  function coreKeyFor(key, coreLookup) {
    var k = canonical(key);
    if (!k) return '';
    if (CORE_ISSUE_COLORS[k]) return k;

    if (typeof coreLookup === 'function') {
      var r;
      try { r = coreLookup(k); } catch (e) { r = null; }
      var rk = canonical(r && r.key ? r.key : r);
      if (CORE_ISSUE_COLORS[rk]) return rk;
    } else if (Array.isArray(coreLookup)) {
      for (var i = 0; i < coreLookup.length; i++) {
        var ci = coreLookup[i];
        if (ci && ci.keys && ci.keys.indexOf(k) !== -1) {
          var ck = canonical(ci.key);
          if (CORE_ISSUE_COLORS[ck]) return ck;
        }
      }
    } else if (coreLookup && typeof coreLookup === 'object') {
      var direct = canonical(coreLookup[k]);
      if (CORE_ISSUE_COLORS[direct]) return direct;
    }

    if (typeof window.coreIssueForKey === 'function') {
      var core;
      try { core = window.coreIssueForKey(k); } catch (e) { core = null; }
      var mk = canonical(core && core.key);
      if (CORE_ISSUE_COLORS[mk]) return mk;
    }

    var idx = leafIndex();
    if (idx && idx[k] && CORE_ISSUE_COLORS[idx[k]]) return idx[k];

    // Rollups are tried LAST, deliberately. A leaf key always wins: if the
    // taxonomy ever grows a leaf that happens to be spelled like a rollup, the
    // leaf's own bundle is the truthful answer and the rollup table must not
    // shadow it.
    if (ROLLUP_PARENT[k] && CORE_ISSUE_COLORS[ROLLUP_PARENT[k]]) return ROLLUP_PARENT[k];
    return '';
  }

  // "Which core issue does this rollup inherit from?" — the readable question for
  // a surface that wants to say so in a tooltip or a test, and the reason the
  // mapping is inspectable rather than buried in the resolver. '' for a rollup
  // with no declared parent, which is a real answer and not an error.
  function rollupParent(rollupKey) {
    var p = ROLLUP_PARENT[norm(rollupKey)];
    return (p && CORE_ISSUE_COLORS[p]) ? p : '';
  }

  // The helper every surface calls. Never throws and never returns null: an
  // unknown key gets the neutral token with `mapped:false`, so a caller can
  // still render, and can also ask "was this a real core issue?" when it wants
  // to skip the treatment entirely.
  function getIssueColor(coreOrIssueKey, coreLookup) {
    try {
      var ck = coreKeyFor(coreOrIssueKey, coreLookup);
      return ck ? CORE_ISSUE_COLORS[ck] : FALLBACK;
    } catch (e) { return FALLBACK; }
  }

  // ── CSS surfaces ───────────────────────────────────────────────────────────
  // Inline custom properties for a dynamically built row. Local names (--pdx-ic*)
  // so a component's stylesheet can consume them without knowing which issue it
  // got, which is what keeps the CSS free of any per-issue rules.
  function styleFor(coreOrIssueKey, coreLookup) {
    var t = getIssueColor(coreOrIssueKey, coreLookup);
    return '--pdx-ic:' + t.color + ';--pdx-ic-soft:' + t.soft + ';--pdx-ic-wash:' + t.wash +
           ';--pdx-ic-ink:' + t.ink + ';';
  }

  // "Did this key land on a real Core National Issue?" — the question a row asks
  // before it decides whether the colour treatment is meaningful or whether it is
  // about to paint everything the same neutral slate. Callers that want the token
  // itself still use getIssueColor().mapped; this is the readable one-liner for a
  // renderer that only needs the boolean to pick a class name.
  function isCore(coreOrIssueKey, coreLookup) {
    return !!getIssueColor(coreOrIssueKey, coreLookup).mapped;
  }

  // :root properties for the static case — a stylesheet that knows its issue at
  // author time (`var(--pdx-issue-healthcare)`) instead of receiving it inline.
  function cssText() {
    var lines = ORDER.map(function (k) {
      var t = CORE_ISSUE_COLORS[k];
      return '  --pdx-issue-' + k + ': ' + t.color + ';\n' +
             '  --pdx-issue-' + k + '-soft: ' + t.soft + ';\n' +
             '  --pdx-issue-' + k + '-wash: ' + t.wash + ';\n' +
             '  --pdx-issue-' + k + '-ink: ' + t.ink + ';';
    });
    lines.push('  --pdx-issue-fallback: ' + FALLBACK.color + ';\n' +
               '  --pdx-issue-fallback-soft: ' + FALLBACK.soft + ';\n' +
               '  --pdx-issue-fallback-wash: ' + FALLBACK.wash + ';\n' +
               '  --pdx-issue-fallback-ink: ' + FALLBACK.ink + ';');
    return ':root {\n' + lines.join('\n') + '\n}\n';
  }

  function injectVars() {
    try {
      if (document.getElementById('pdx-issue-colors')) return;
      var el = document.createElement('style');
      el.id = 'pdx-issue-colors';
      el.textContent = cssText();
      (document.head || document.documentElement).appendChild(el);
    } catch (e) {}
  }

  function all() {
    return ORDER.map(function (k) { return CORE_ISSUE_COLORS[k]; });
  }

  window.PDXIssueColors = {
    CORE_ISSUE_COLORS: CORE_ISSUE_COLORS,
    FALLBACK: FALLBACK,
    ALIASES: ALIASES,
    ROLLUP_PARENT: ROLLUP_PARENT,
    rollupParent: rollupParent,
    getIssueColor: getIssueColor,
    coreKeyFor: coreKeyFor,
    isCore: isCore,
    styleFor: styleFor,
    cssText: cssText,
    injectVars: injectVars,
    all: all
  };
  // Convenience alias — short enough to use inline in a template string.
  window._pdxIssueColor = getIssueColor;

  injectVars();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectVars, { once: true });
  }
})();
