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
   for borders and fills, `ink` for text, `soft` for backgrounds.

   API:
     PDXIssueColors.CORE_ISSUE_COLORS       → { coreKey: {label,color,soft,…} }
     PDXIssueColors.getIssueColor(k [, lu]) → token for a core OR leaf key
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

  // ── The palette ────────────────────────────────────────────────────────────
  // Keyed by the CORE_NATIONAL_ISSUES key exactly as alignment-tool.js declares
  // it. `label` is the short display name for a swatch or legend — the full
  // labels (with their emoji) still live in CORE_NATIONAL_ISSUES and are not
  // duplicated here, because a label is content and this file is tokens.
  var PALETTE = [
    ['economy_cost_of_living', 'Economy & Cost of Living', '#F5A623'],
    ['immigration_border',     'Immigration & Border',     '#2EC4B6'],
    ['healthcare',             'Healthcare Costs & Access','#4EA8DE'],
    ['spending_debt_waste',    'Spending, Debt & Waste',   '#FF6B4A'],
    ['abortion_repro',         'Abortion / Repro. Rights', '#E83E8C'],
    ['guns',                   'Gun Rights & Control',     '#8B9BB4'],
    ['climate_energy',         'Climate & Energy',         '#2ECC71'],
    ['crime_safety',           'Crime & Public Safety',    '#E74C3C'],
    ['election_integrity',     'Election Integrity',       '#6C5CE7'],
    ['education_parental',     'Education & Parents',      '#A29BFE'],
    ['civil_rights_culture',   'Civil Rights & Culture',   '#FD79A8'],
    ['foreign_policy_defense', 'Foreign Policy & Security','#0984E3']
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
  // purples ('#0984E3', '#6C5CE7') are the ones that actually move.
  function inkFor(rgb) {
    var bg = toRgb(DARK_BG);
    var out = rgb.slice();
    for (var i = 0; i < 16 && contrast(out, bg) < MIN_TEXT_CONTRAST; i++) {
      out = out.map(function (v) { return v + (255 - v) * 0.06; });
    }
    return out;
  }

  // ── Token construction ─────────────────────────────────────────────────────
  function makeToken(key, label, hex, softAlpha, mapped) {
    var rgb = toRgb(hex);
    var triplet = rgb.join(', ');
    return {
      key: key,
      label: label,
      color: hex,                                        // borders, spines, fills
      colorRgb: triplet,                                 // compose your own alpha
      soft: 'rgba(' + triplet + ', ' + softAlpha + ')',  // backgrounds
      ink: toHex(inkFor(rgb)),                           // small text on navy
      mapped: !!mapped                                   // false = fell back
    };
  }

  var FALLBACK = makeToken('', 'Other issue', '#94A3B8', FALLBACK_SOFT_ALPHA, false);

  var CORE_ISSUE_COLORS = {};
  var ORDER = [];
  PALETTE.forEach(function (row) {
    CORE_ISSUE_COLORS[row[0]] = makeToken(row[0], row[1], row[2], SOFT_ALPHA, true);
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
    return '';
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
    return '--pdx-ic:' + t.color + ';--pdx-ic-soft:' + t.soft + ';--pdx-ic-ink:' + t.ink + ';';
  }

  // :root properties for the static case — a stylesheet that knows its issue at
  // author time (`var(--pdx-issue-healthcare)`) instead of receiving it inline.
  function cssText() {
    var lines = ORDER.map(function (k) {
      var t = CORE_ISSUE_COLORS[k];
      return '  --pdx-issue-' + k + ': ' + t.color + ';\n' +
             '  --pdx-issue-' + k + '-soft: ' + t.soft + ';\n' +
             '  --pdx-issue-' + k + '-ink: ' + t.ink + ';';
    });
    lines.push('  --pdx-issue-fallback: ' + FALLBACK.color + ';\n' +
               '  --pdx-issue-fallback-soft: ' + FALLBACK.soft + ';\n' +
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
    getIssueColor: getIssueColor,
    coreKeyFor: coreKeyFor,
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
