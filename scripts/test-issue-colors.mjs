/* ═══════════════════════════════════════════════════════════════════════════
   test-issue-colors.mjs — the Core National Issue color system
   ────────────────────────────────────────────────────────────────────────────
   The promise this system makes is narrow and absolute: the same issue is the
   same color everywhere, and changing a color in one map changes it everywhere.
   Both halves of that are easy to break silently.

     · A surface that hard-codes a hex "just for this one chip" is invisible in
       review and only shows up as two healthcare blues on one page.
     · A leaf ISSUE_MAP key that stops resolving to its core bundle turns a
       colored row slate without erroring, which reads as "not a core issue".
     · A color used as text on the dark navy can fall under a readable contrast
       ratio while still looking fine on the reviewer's monitor.

   So this file checks the contract rather than the rendering: the published
   values are exactly the published values, every alias and leaf key resolves,
   unmapped keys fall back to slate rather than borrowing a neighbour's color,
   text variants clear 4.5:1, and each priority surface actually asks the module
   instead of writing its own hex.

   Sections:
     1. Load + shape
     2. The palette is exactly the published palette
     3. Aliases — spec spellings and shipped taxonomy keys agree
     4. Leaf ISSUE_MAP keys resolve through the existing taxonomy
     5. Unmapped keys fall back to slate, never to a neighbour
     6. Contrast on the dark navy
     7. CSS custom properties
     8. Purely visual — the module reads no data and no score
     9. The priority surfaces ask the module
    10. Wiring: script tag, precache, load order
   ═══════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg}\n    expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
// A probe whose target was renamed makes every assertion built on it vacuously
// true. That is a broken harness, not a passing contract — exit loudly.
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ issue-colors: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

const SRC = read('issue-colors.js');
const ALIGN = read('alignment-tool.js');

// ═════════════════════════════════════════════════════════════════════════════
// Sandbox
// ═════════════════════════════════════════════════════════════════════════════
// The module is loaded with NO globals at all first, because that is a real
// state: it is deferred alongside everything else and a caller can reach it
// before alignment-tool.js has published its taxonomy.
function load({ withTaxonomy = true } = {}) {
  const win = {};
  const styles = [];
  const ctx = {
    window: win,
    document: {
      readyState: 'complete',
      getElementById: () => null,
      createElement: () => ({ id: '', textContent: '' }),
      addEventListener: () => {},
      head: { appendChild: (el) => styles.push(el) },
      documentElement: { appendChild: (el) => styles.push(el) }
    },
    console
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);

  if (withTaxonomy) {
    // The REAL taxonomy, lifted from alignment-tool.js rather than restated
    // here — a hand-copied CORE_NATIONAL_ISSUES would let this file keep passing
    // after the shipped one changed, which is the exact drift it exists to catch.
    const at = ALIGN.indexOf('var CORE_NATIONAL_ISSUES = [');
    const end = ALIGN.indexOf('];', at);
    must(at !== -1 && end > at,
      'alignment-tool.js no longer declares `var CORE_NATIONAL_ISSUES = [` — issue-colors.js resolves leaf keys through it');
    vm.runInContext(ALIGN.slice(at, end + 2) + ';window.CORE_NATIONAL_ISSUES=CORE_NATIONAL_ISSUES;',
      ctx, { filename: 'alignment-tool.js#core' });
  }
  vm.runInContext(SRC, ctx, { filename: 'issue-colors.js' });
  return { win, ctx, styles, IC: win.PDXIssueColors };
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. Load + shape
// ═════════════════════════════════════════════════════════════════════════════
{
  const { IC, win } = load();
  must(IC, 'issue-colors.js did not publish window.PDXIssueColors');
  ['CORE_ISSUE_COLORS', 'FALLBACK', 'getIssueColor', 'styleFor', 'cssText', 'injectVars', 'all']
    .forEach((k) => ok(IC[k] != null, `PDXIssueColors.${k} must exist`));
  eq(typeof IC.getIssueColor, 'function', 'getIssueColor must be a function');
  eq(typeof win._pdxIssueColor, 'function', 'the short alias window._pdxIssueColor must exist');

  // Loading twice must not rebuild the map — a second definition would be a
  // second source of truth for exactly as long as it took someone to notice.
  const before = IC.CORE_ISSUE_COLORS;
  ok(/if \(window\.PDXIssueColors\) return;/.test(SRC), 'the module must no-op on double load');
  ok(before === IC.CORE_ISSUE_COLORS, 'the palette object must be stable across reads');
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. The palette is exactly the published palette
// ═════════════════════════════════════════════════════════════════════════════
// These thirteen values are the design contract. They are restated here on
// purpose: this is the one place duplication is the point, because the test's
// whole job is to fail when someone edits a hex in the module.
const PUBLISHED = {
  economy_cost_of_living: '#F5A623',
  immigration_border:     '#2EC4B6',
  healthcare:             '#4EA8DE',
  spending_debt_waste:    '#FF6B4A',
  abortion_repro:         '#E83E8C',
  guns:                   '#8B9BB4',
  climate_energy:         '#2ECC71',
  crime_safety:           '#E74C3C',
  election_integrity:     '#6C5CE7',
  checks_and_balances:    '#64748B',
  education_parental:     '#FB923C',
  civil_rights_culture:   '#FD79A8',
  foreign_policy_defense: '#0984E3'
};
const SOFT = {
  economy_cost_of_living: 'rgba(245, 166, 35, 0.14)',
  immigration_border:     'rgba(46, 196, 182, 0.14)',
  healthcare:             'rgba(78, 168, 222, 0.14)',
  spending_debt_waste:    'rgba(255, 107, 74, 0.14)',
  abortion_repro:         'rgba(232, 62, 140, 0.14)',
  guns:                   'rgba(139, 155, 180, 0.14)',
  climate_energy:         'rgba(46, 204, 113, 0.14)',
  crime_safety:           'rgba(231, 76, 60, 0.14)',
  election_integrity:     'rgba(108, 92, 231, 0.14)',
  checks_and_balances:    'rgba(100, 116, 139, 0.14)',
  education_parental:     'rgba(251, 146, 60, 0.14)',
  civil_rights_culture:   'rgba(253, 121, 168, 0.14)',
  foreign_policy_defense: 'rgba(9, 132, 227, 0.14)'
};
{
  const { IC } = load();
  eq(Object.keys(IC.CORE_ISSUE_COLORS).length, 13, 'the palette must carry exactly the 13 Core National Issues');
  Object.keys(PUBLISHED).forEach((k) => {
    const t = IC.CORE_ISSUE_COLORS[k];
    ok(!!t, `${k} must be in CORE_ISSUE_COLORS`);
    if (!t) return;
    eq(t.color, PUBLISHED[k], `${k} color must be the published value`);
    eq(t.soft, SOFT[k], `${k} soft tint must be the published value`);
    eq(t.mapped, true, `${k} must report mapped:true`);
    ok(/^\d{1,3}, \d{1,3}, \d{1,3}$/.test(t.colorRgb), `${k} colorRgb must be a bare "r, g, b" triplet`);
  });
  // getIssueColor and the map must be the same object, not a copy that can drift.
  ok(IC.getIssueColor('healthcare') === IC.CORE_ISSUE_COLORS.healthcare,
    'getIssueColor must return the map entry itself, not a rebuilt copy');
  eq(IC.all().length, 13, 'all() must list the 13 core issues');
  eq(IC.all()[0].key, 'economy_cost_of_living', 'all() must preserve the published salience order');

  // Two tokens named explicitly in the change request, pinned so a future edit
  // to one cannot quietly drag the other with it.
  eq(IC.CORE_ISSUE_COLORS.election_integrity.ink, '#7D6FEA',
    'election_integrity ink must stay #7D6FEA — its color was not part of this change');
  eq(IC.CORE_ISSUE_COLORS.education_parental.colorRgb, '251, 146, 60',
    'education_parental must publish the orange triplet');
  eq(IC.CORE_ISSUE_COLORS.checks_and_balances.colorRgb, '100, 116, 139',
    'checks_and_balances must publish the slate triplet');
}

// ═════════════════════════════════════════════════════════════════════════════
// 2b. No two core issues collide perceptually
// ═════════════════════════════════════════════════════════════════════════════
// The palette's job is to make an issue recognisable at a glance. Two hexes that
// differ on paper but read as the same swatch on a dark row defeat that, and a
// hex diff review will not catch it. CIE76 ΔE in Lab is the cheap standard check.
{
  const { IC } = load();
  const lab = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const r = lin(n >> 16 & 255), g = lin(n >> 8 & 255), b = lin(n & 255);
    // sRGB → XYZ (D65), then XYZ → Lab.
    const xyz = [
      (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047,
      (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000,
      (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883
    ].map((v) => v > 0.008856 ? Math.cbrt(v) : (7.787 * v + 16 / 116));
    return [116 * xyz[1] - 16, 500 * (xyz[0] - xyz[1]), 200 * (xyz[1] - xyz[2])];
  };
  const dE = (a, b) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));

  const keys = Object.keys(IC.CORE_ISSUE_COLORS);
  let worst = { d: Infinity, pair: '' };
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const d = dE(IC.CORE_ISSUE_COLORS[keys[i]].color, IC.CORE_ISSUE_COLORS[keys[j]].color);
      if (d < worst.d) worst = { d, pair: `${keys[i]} / ${keys[j]}` };
    }
  }
  // 10 is a hair under the tightest pair that already shipped (spending_debt_waste
  // vs crime_safety, ΔE 10.7). The floor is deliberately snug: it exists to reject
  // a NEW near-duplicate, not to relitigate the palette that is already live.
  ok(worst.d >= 10, `closest core-issue pair must stay ΔE ≥ 10 (got ${worst.d.toFixed(1)} for ${worst.pair})`);

  // The two colors this change introduced are held to a wider margin, because a
  // brand-new color has no installed-base excuse for sitting close to a neighbour.
  ['education_parental', 'checks_and_balances'].forEach((nk) => {
    keys.filter((k) => k !== nk).forEach((k) => {
      const d = dE(IC.CORE_ISSUE_COLORS[nk].color, IC.CORE_ISSUE_COLORS[k].color);
      ok(d >= 15, `${nk} must stay ΔE ≥ 15 from ${k} (got ${d.toFixed(1)})`);
    });
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. Aliases — spec spellings and shipped taxonomy keys agree
// ═════════════════════════════════════════════════════════════════════════════
// Three core issues ship under a longer key than the design sheet used. Both
// spellings must land on one token, or the same issue gets two colors depending
// on which document the caller read.
{
  const { IC } = load();
  [['spending_debt', 'spending_debt_waste'],
   ['education_parents', 'education_parental'],
   ['foreign_policy', 'foreign_policy_defense']].forEach(([alias, real]) => {
    ok(IC.getIssueColor(alias) === IC.CORE_ISSUE_COLORS[real],
      `"${alias}" must resolve to the same token as "${real}"`);
    eq(IC.getIssueColor(alias).color, PUBLISHED[real], `"${alias}" must carry ${real}'s published color`);
  });
  // Case and stray whitespace are caller noise, not a different issue.
  eq(IC.getIssueColor('  Healthcare ').color, PUBLISHED.healthcare, 'keys must be trimmed and case-folded');

  // Every alias must point at a key that exists. An alias to a renamed core key
  // fails open (slate) and would never throw.
  Object.keys(IC.ALIASES).forEach((a) => {
    ok(!!IC.CORE_ISSUE_COLORS[IC.ALIASES[a]], `alias "${a}" points at a key not in the palette`);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. Leaf ISSUE_MAP keys resolve through the existing taxonomy
// ═════════════════════════════════════════════════════════════════════════════
// This is the "do not invent a taxonomy" clause, enforced. Every one of these
// leaf keys is declared inside a CORE_NATIONAL_ISSUES bundle in
// alignment-tool.js; the module must reach them through that structure and not
// through a second mapping of its own.
{
  const { IC } = load();
  const LEAF = {
    gun_safety: 'guns',
    gun_rights: 'guns',
    health_rural: 'healthcare',
    health_drug_prices: 'healthcare',
    border_security: 'immigration_border',
    climate_action: 'climate_energy',
    school_choice: 'education_parental',
    national_debt: 'spending_debt_waste',
    pro_choice: 'abortion_repro',
    back_police: 'crime_safety',
    voter_id: 'election_integrity',
    free_speech: 'civil_rights_culture',
    veterans: 'foreign_policy_defense',
    housing: 'economy_cost_of_living'
  };
  Object.keys(LEAF).forEach((leaf) => {
    eq(IC.getIssueColor(leaf).key, LEAF[leaf], `leaf key "${leaf}" must resolve to ${LEAF[leaf]}`);
    eq(IC.getIssueColor(leaf).color, PUBLISHED[LEAF[leaf]], `leaf key "${leaf}" must carry its core color`);
  });
  eq(IC.coreKeyFor('gun_safety'), 'guns', 'coreKeyFor must expose the resolution on its own');

  // The reverse-lookup helper alignment-tool.js publishes must be honoured when
  // present — it is the cheaper path and the one already used elsewhere.
  const { IC: IC2, win } = load({ withTaxonomy: false });
  eq(IC2.getIssueColor('gun_safety').mapped, false,
    'with no taxonomy loaded at all, a leaf key must fall back rather than guess');
  win.coreIssueForKey = (k) => (k === 'gun_safety' ? { key: 'guns' } : null);
  eq(IC2.getIssueColor('gun_safety').key, 'guns',
    'coreIssueForKey must be picked up once alignment-tool.js publishes it');

  // The optional second argument lets a caller supply resolution directly.
  const { IC: IC3 } = load({ withTaxonomy: false });
  eq(IC3.getIssueColor('local_only_key', () => 'healthcare').color, PUBLISHED.healthcare,
    'a coreLookup function must be honoured');
  eq(IC3.getIssueColor('local_only_key', [{ key: 'guns', keys: ['local_only_key'] }]).color, PUBLISHED.guns,
    'a coreLookup array shaped like CORE_NATIONAL_ISSUES must be honoured');
  eq(IC3.getIssueColor('local_only_key', { local_only_key: 'crime_safety' }).color, PUBLISHED.crime_safety,
    'a plain leaf→core coreLookup object must be honoured');
  // A lookup that throws is a caller bug, not a render-stopper.
  eq(IC3.getIssueColor('x', () => { throw new Error('boom'); }).mapped, false,
    'a throwing coreLookup must fall back, not propagate');
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. Unmapped keys fall back to slate, never to a neighbour
// ═════════════════════════════════════════════════════════════════════════════
{
  const { IC } = load();
  const junk = ['', null, undefined, 0, {}, [], 'not_a_real_issue', 'great_salt_lake'];
  junk.forEach((k) => {
    const t = IC.getIssueColor(k);
    eq(t.color, '#94A3B8', `unmapped key ${JSON.stringify(k)} must fall back to slate`);
    eq(t.soft, 'rgba(148, 163, 184, 0.12)', `unmapped key ${JSON.stringify(k)} must use the 0.12 fallback tint`);
    eq(t.mapped, false, `unmapped key ${JSON.stringify(k)} must report mapped:false`);
  });
  // `checks_and_balances` USED to land here — it was the one core issue in
  // alignment-tool.js with no published color, so it rendered as "unknown". It
  // now has its own slate, and its leaf keys must reach that slate too, not the
  // near-identical fallback slate. The distinction is the whole point of these
  // three assertions: the two greys are close, so only `mapped` proves which
  // path ran.
  ['checks_and_balances', 'checks_balances', 'states_federal_power'].forEach((k) => {
    const t = IC.getIssueColor(k);
    eq(t.color, '#64748B', `"${k}" must resolve to the Checks & Balances slate`);
    eq(t.mapped, true, `"${k}" must report mapped:true — it is a real core issue now, not a fallback`);
    ok(t !== IC.FALLBACK, `"${k}" must not return the shared fallback token`);
  });
  // Falling back must be indistinguishable from asking for nothing, so a caller
  // cannot accidentally treat "unknown" as a thirteenth color.
  ok(IC.getIssueColor('zzz') === IC.getIssueColor('qqq'),
    'every unmapped key must share one fallback token');
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. Contrast on the dark navy
// ═════════════════════════════════════════════════════════════════════════════
// `color` is the published value and is used for borders and fills, where a
// lower ratio is fine. `ink` is what goes on text, and it must clear 4.5:1
// against the panel navy — computed, so it cannot drift away from `color`.
{
  const { IC } = load();
  const toRgb = (hex) => {
    const n = parseInt(String(hex).replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const lum = (rgb) => {
    const a = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  };
  const ratio = (a, b) => {
    const la = lum(a), lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  const BG = toRgb('#0a0f1e');
  IC.all().concat([IC.FALLBACK]).forEach((t) => {
    const r = ratio(toRgb(t.ink), BG);
    ok(r >= 4.5, `${t.key || 'fallback'} ink (${t.ink}) is only ${r.toFixed(2)}:1 on the panel navy`);
    // The border colour is not held to the text ratio, but it does have to be
    // visible at all — a spine below 1.6:1 is a spine nobody can see.
    ok(ratio(toRgb(t.color), BG) >= 1.6,
      `${t.key || 'fallback'} color (${t.color}) is too close to the background to read as a spine`);
  });
  // ink must stay the same hue family — a "readable" variant that swung to a
  // different colour would defeat the whole point of the system.
  IC.all().forEach((t) => {
    const c = toRgb(t.color), i = toRgb(t.ink);
    const orderC = [0, 1, 2].sort((a, b) => c[b] - c[a]).join('');
    const orderI = [0, 1, 2].sort((a, b) => i[b] - i[a]).join('');
    eq(orderI, orderC, `${t.key} ink must keep the same channel ordering as its color`);
    ok(lum(i) >= lum(c) - 1e-9, `${t.key} ink must never be darker than its color`);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. CSS custom properties
// ═════════════════════════════════════════════════════════════════════════════
{
  const { IC, styles } = load();
  const css = IC.cssText();
  Object.keys(PUBLISHED).forEach((k) => {
    ok(css.includes(`--pdx-issue-${k}: ${PUBLISHED[k]};`), `cssText must publish --pdx-issue-${k}`);
    ok(css.includes(`--pdx-issue-${k}-soft: ${SOFT[k]};`), `cssText must publish --pdx-issue-${k}-soft`);
    ok(css.includes(`--pdx-issue-${k}-ink:`), `cssText must publish --pdx-issue-${k}-ink`);
  });
  ok(css.includes('--pdx-issue-fallback: #94A3B8;'), 'cssText must publish the fallback');
  ok(/^:root \{/.test(css), 'cssText must scope to :root');

  // The inline form is what dynamic rows use. It must carry all three tokens and
  // nothing that could break out of a style attribute.
  const s = IC.styleFor('healthcare');
  ok(s.includes('--pdx-ic:#4EA8DE;'), 'styleFor must set --pdx-ic');
  ok(s.includes('--pdx-ic-soft:rgba(78, 168, 222, 0.14);'), 'styleFor must set --pdx-ic-soft');
  ok(s.includes('--pdx-ic-ink:'), 'styleFor must set --pdx-ic-ink');
  ok(!/["'<>]/.test(s), 'styleFor output must be safe to drop into a style attribute unescaped');
  ok(IC.styleFor('nope').includes('--pdx-ic:#94A3B8;'), 'styleFor must fall back to slate for an unknown key');
  // The module injects once and only once.
  eq(styles.length, 1, 'injectVars must append exactly one <style> on load');
  IC.injectVars();
  ok(styles.length >= 1, 'a second injectVars must not throw');
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. Purely visual — the module reads no data and no score
// ═════════════════════════════════════════════════════════════════════════════
// A color module that starts reading records is a color module that can start
// changing with them. Nothing here may touch a politician, a verdict or an
// engine, and nothing may write.
{
  // Comments stripped first: the header explains at length that this module does
  // NOT touch a score or a verdict, and a naive scan would flag that prose as the
  // very thing it promises not to do.
  const body = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
  must(body.includes('function getIssueColor'),
    'comment stripping ate the code — this section would be testing an empty string');
  [/PDXWordAction/, /PDXConsistency/, /PDXCoverage/, /PROFILES/, /localStorage/,
   /sessionStorage/, /fetch\s*\(/, /XMLHttpRequest/, /\bscore\b/i, /\bverdict\b/i]
    .forEach((re) => {
      ok(!re.test(body), `issue-colors.js must not reference ${re} — it is a token module, not a reader`);
    });
  // It may read the taxonomy, and only the taxonomy.
  ok(/CORE_NATIONAL_ISSUES/.test(body) && /coreIssueForKey/.test(body),
    'issue-colors.js must resolve leaf keys through the existing taxonomy');
  ok(!/ISSUE_COLORS\s*\[[^\]]*\]\s*=/.test(body.split('var CORE_ISSUE_COLORS')[1] || ''),
    'the palette must not be mutable after construction by an external caller path');
}

// ═════════════════════════════════════════════════════════════════════════════
// 9. The priority surfaces ask the module
// ═════════════════════════════════════════════════════════════════════════════
// One source of truth only holds if the surfaces actually use it. Each of these
// checks the JS asks PDXIssueColors AND the CSS consumes the custom property —
// either half alone renders no colour or the wrong one.
{
  const surfaces = [
    ['word-action.js',    'word-action.css',    /--pdx-ic/,        'Word vs Action issue rows'],
    ['gaps.js',           'word-action.css',    /\.pdxg-row\b/,    'coverage gap rows'],
    ['stance-library.js', 'stance-library.css', /\.sl-chip--core/, 'Stance Library chips and cards'],
    ['spotlight-hub.js',  null,                 null,              'Issue Spotlight cards'],
    ['profiles-full.js',  'app.css',            /\.pdx-issue-tie/, 'the issue-tie chip'],
    // consistency.js renders the Official Record rows, the awaiting rows, the
    // Stances & Connections rows, the Say-vs-Do rows and the divergence rows —
    // more issue-named rows than any other file in the app, and for a long time
    // the only issue surface that never asked the colour module at all. Its CSS
    // is injected from a string inside the same file, so both halves are checked
    // against that one path.
    ['consistency.js',    'consistency.js',     /\.pdxc-ic\b/,     'Official Record and stance rows']
  ];
  surfaces.forEach(([js, css, probe, name]) => {
    const src = read(js);
    ok(/PDXIssueColors/.test(src), `${name}: ${js} must ask PDXIssueColors for its colour`);
    ok(/styleFor/.test(src), `${name}: ${js} must use styleFor rather than reading hexes off the map`);
    // Every call site must be guarded — issue-colors.js is deferred like
    // everything else and a surface that assumes it is present will throw and
    // take its whole panel down. Both spellings of the same guard count: the
    // positive `IC && typeof IC.styleFor === 'function'` and the early-return
    // `if (!IC || typeof IC.styleFor !== 'function')`. What is being tested is
    // that the presence of the module is checked, not how it is phrased.
    ok(/(window\.)?PDXIssueColors && typeof (window\.)?PDXIssueColors\.styleFor === 'function'/.test(src) ||
       /IC && typeof IC\.styleFor === 'function'/.test(src) ||
       /!IC \|\| typeof IC\.styleFor !== 'function'/.test(src),
      `${name}: ${js} must guard the PDXIssueColors call`);
    if (css && probe) {
      const c = read(css);
      ok(probe.test(c), `${name}: ${css} no longer contains ${probe} — this harness is testing nothing`);
      ok(/var\(--pdx-ic/.test(c), `${name}: ${css} must consume the --pdx-ic custom property`);
    }
  });
  // spotlight-hub.js ships its CSS inline.
  const SH = read('spotlight-hub.js');
  ok(/var\(--pdx-ic, var\(--cat/.test(SH),
    'the Spotlight card spine must prefer the issue colour and keep the category colour as fallback');
  ok(/--pdx-ic-ink,#8aa0c4/.test(SH), 'Spotlight issue tags must use the ink variant for text');

  // The Word vs Action row must keep BOTH vocabularies: issue on the spine,
  // verdict on the label. Losing the verdict colour would be a real regression.
  const WA = read('word-action.js');
  ok(/pdxwa-row-verdict" style="color:' \+ col/.test(WA),
    'the verdict must keep its own colour on the row label');
  const WACSS = read('word-action.css');
  // The spine is the ISSUE and nothing else. `--pdxwa-col` — the verdict colour —
  // must not appear in its fallback chain: a row that failed to resolve its issue
  // used to come back verdict-green, which is indistinguishable from a deliberate
  // colour and quietly turns "no colour system" into "the wrong colour system".
  // The steel hex is the honest fallback; it reads as absence.
  const spine = WACSS.match(/\.pdxwa-row \{[^}]*\}/);
  ok(spine, '.pdxwa-row must still declare its own block');
  ok(/border-left: \d+px solid var\(--pdx-ic, #/.test(spine ? spine[0] : ''),
    'the row spine must take the issue colour and fall back to neutral, never to the verdict colour');
  ok(!/var\(--pdx-ic,\s*var\(--pdxwa-col/.test(WACSS),
    'the verdict colour must never be a fallback for the issue spine');
  // A resolved issue gets the louder treatment; an unresolved one keeps the thin
  // neutral edge. The class is what tells them apart, so it has to exist on both
  // sides — emitted by the renderer, consumed by the stylesheet.
  ok(/pdxwa-ic/.test(WA), 'word-action.js must mark resolved rows with .pdxwa-ic');
  ok(/\.pdxwa-row\.pdxwa-ic/.test(WACSS), 'word-action.css must give .pdxwa-ic its own stronger treatment');
  ok(/var\(--pdx-ic-wash/.test(WACSS), 'the row tint must use the wash token, not the chip-strength soft token');

  // consistency.js: same contract, its own class. The Official Record row is a
  // <details>, so its open state needs the colour too or the row loses its
  // identity at exactly the moment the reader is deepest in it.
  const CJS = read('consistency.js');
  ok(/\.pdxor-issue\.pdxc-ic\{border-left:\d+px solid var\(--pdx-ic\)/.test(CJS),
    'Official Record rows must take the issue colour on the spine');
  ok(/\.pdxor-row\.pdxc-ic\[open\]/.test(CJS),
    'an opened Official Record row must keep its issue colour');
  ok(/\.pdxsd \.pdxor-issue\.pdxc-ic/.test(CJS),
    'the Say-vs-Do gold accent must yield to a resolved issue colour');
  ok(/\.pdxst-row\.pdxc-ic/.test(CJS) && /\.pdxdv-row\.pdxc-ic/.test(CJS),
    'stance rows and divergence rows must take the issue colour too');
  // Guarded, and honest about a miss: no key or no module means no class, which
  // means the row renders exactly as it did before the colour system existed.
  ok(/on \? ' pdxc-ic' : ''/.test(CJS),
    'consistency.js must only apply .pdxc-ic when the key resolved to a core issue');

  // Non-issue elements must NOT be forced into the issue palette.
  ok(/\.sl-chip--hot/.test(read('stance-library.css')),
    'Hot Topic chips must keep their own treatment — they are not issues');
  ok(/\.shub-chip-cat\{color:var\(--cat/.test(SH),
    'broad category filter chips must keep the category palette — a category is not an issue');
}

// ═════════════════════════════════════════════════════════════════════════════
// 10. Wiring: script tag, precache, load order
// ═════════════════════════════════════════════════════════════════════════════
{
  const INDEX = read('index.html');
  ok(/<script defer src="issue-colors\.js"><\/script>/.test(INDEX),
    'index.html must load issue-colors.js');
  const icAt = INDEX.indexOf('src="issue-colors.js"');
  const alignAt = INDEX.indexOf('src="alignment-tool.js"');
  must(alignAt !== -1, 'index.html no longer loads alignment-tool.js');
  ok(icAt > alignAt, 'issue-colors.js must load after alignment-tool.js, which publishes the taxonomy');
  ['stance-library.js', 'gaps.js', 'spotlight-hub.js', 'word-action.js'].forEach((f) => {
    const at = INDEX.indexOf('src="' + f + '"');
    if (at === -1) return;                       // not every consumer is a tag in this file
    ok(icAt < at, `issue-colors.js must load before ${f}, which asks it for colours`);
  });
  const SW = read('sw.js');
  if (/alignment-tool\.js/.test(SW)) {
    ok(/issue-colors\.js/.test(SW),
      'sw.js precaches alignment-tool.js but not issue-colors.js — offline, every issue would render slate');
  } else { passed++; }
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ issue-colors: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error('  • ' + f));
  process.exit(1);
}
console.log(`✓ issue-colors: ${passed} assertions passed`);
