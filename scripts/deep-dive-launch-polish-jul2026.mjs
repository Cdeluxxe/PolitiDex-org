#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Utah launch POLISH batch (July 2026)
// ---------------------------------------------------------------------------
// The final pre-launch pass: close the last easy Davis / Salt Lake city gaps
// where a sourced controversy exists, and clean up the remaining unsourced
// attribution stubs. Client-side only (edits politician-stances.js + index.html);
// no Firestore credentials needed. After --apply, regenerate the shipped chunks:
//   node scripts/split-stances.mjs
//
// THREE actions, each idempotent (re-running is a no-op once applied):
//
//   1. ENRICH  dramsey (Dawn Ramsey — South Jordan Mayor). She had a browse node
//      and three UNSOURCED cards. Replace them with three source-verified cards
//      from her 2026 State of the City (senior center + affordable housing;
//      growth; transit) and add the missing CMP_DATA roster entry.
//
//   2. CREATE  tamara_tran_kaysville (Tamara "Tami" Tran — Kaysville Mayor,
//      re-elected ~75% on Nov. 4, 2025). Kaysville's FY2026 property-tax increase
//      was denied by the Utah State Tax Commission under the strict new law
//      (SB202/SB29) — the same wave that caught Clearfield — plus its residential
//      tax-base squeeze and its municipal power utility. Adds cards + roster +
//      browse node.
//
//   3. SOURCEFIX  anna_graff (2026 HD-12 Democratic challenger). Her two cards
//      cited an endorsement with NO url; attach the verified QSaltLake source and
//      keep the honest "no first-person platform located" caveat.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md):
//   • Municipal offices are nonpartisan; party left blank, matching the roster.
//   • Direct quotes only where verified against a direct read (Ramsey's State of
//     the City). Kaysville's tax-denial facts are the Tax Commission's / council
//     minutes' and are attributed as city/administration action and Tran's
//     reported framing — not invented verbatim quotes.
//   • Nothing fabricated. Records that could not be cleanly sourced (Jeneanne
//     Lock's specific UPICEC role; Bountiful under a brand-new mayor with no
//     quote; the dead bperry/bscott/cpetersen browse nodes) are left for the
//     tracker, NOT stubbed here.
//
//   node scripts/deep-dive-launch-polish-jul2026.mjs            # dry run
//   node scripts/deep-dive-launch-polish-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STANCES = path.join(ROOT, 'politician-stances.js');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');

const SRC = {
  sj_sotc:   { label: 'South Jordan (State of the City 2026)', url: 'https://www.sjc.utah.gov/m/newsflash/Home/Detail/415' },
  sj_fox13:  { label: 'FOX13', url: 'https://www.fox13now.com/news/local-news/northern-utah/senior-citizen-living-options-are-focus-of-several-south-jordan-projects' },
  sj_kutv:   { label: 'KUTV', url: 'https://kutv.com/news/arc-salt-lake/south-jordan-mayor-highlights-success-of-downtown-daybreak-bees-stadium' },
  kay_min:   { label: 'Kaysville City Council (Oct 2, 2025)', url: 'https://www.utah.gov/pmn/files/1347097.pdf' },
  kay_tax:   { label: 'Kaysville City (Taxes & Fees)', url: 'https://www.kaysville.gov/172/Taxes-Fees' },
  kay_elec:  { label: 'Kaysville City (2025 certified results)', url: 'https://www.kaysville.gov/DocumentCenter/View/6582/Official-Election-Results-and-Certificate-of-Election---2025' },
  qsl_graff: { label: 'QSaltLake', url: 'https://www.qsaltlake.com/news/2026/04/20/utah-stonewall-democrats-endorsements/' },
};

const RECORDS = {
  // 1) ENRICH — replace unsourced cards + add roster (browse node already exists)
  dramsey: {
    mode: 'enrich',
    label: 'Dawn Ramsey — 🏛 South Jordan (Mayor)',
    roster: { name: 'Dawn Ramsey', office: 'Mayor, South Jordan', party: '', score: 60, icon: '🏛', issues: ['Growth & Housing', 'Seniors & Cost of Living', 'Economic Development'] },
    cards: [
      { topic: 'Senior Center & Affordable Housing', icon: '🏡', pos: 'support', issueKey: 'housing_support', issueStance: 'support',
        text: 'Made a 17,000-sq-ft senior center — paired with about 200 senior-housing units, at least 75% affordable, developed with Ivory Innovations at The District — a centerpiece of her 2026 agenda.', source: SRC.sj_sotc },
      { topic: 'Growth & Economic Development', icon: '📈', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: "Frames rapid growth as a shared effort — 'South Jordan's success story is not written at City Hall alone—it's written by our residents, businesses, employees, and partners' — with 2026 plans for new jobs, restaurants, entertainment and a professional pickleball facility.", source: SRC.sj_sotc },
      { topic: 'Managing Growth & Transit', icon: '🚆', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
        text: 'Points to transit and infrastructure keeping pace with fast-growing west-side and Daybreak development — including the city\'s third TRAX station — to support future housing and travel.', source: SRC.sj_kutv },
    ],
  },
  // 2) CREATE — new record + roster + browse node
  tamara_tran_kaysville: {
    mode: 'create',
    label: 'Tamara Tran — 🏛 Kaysville (Mayor)',
    roster: { name: 'Tamara Tran', office: 'Mayor, Kaysville', party: '', score: 59, icon: '🏛', issues: ['Property Taxes', 'Municipal Power', 'Growth'] },
    browse: ['pm-tier-local', 'MAYORS', 'davis', 'district1'],
    cards: [
      { topic: 'Property-Tax Increase Denied', icon: '💵', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed',
        text: 'Kaysville\'s FY2026 property-tax increase was denied by the Utah State Tax Commission under the strict new law (SB202/SB29); Tran said the city had followed a transparent, well-documented truth-in-taxation process and was disappointed the increase for essential services could not move forward.', source: SRC.kay_min },
      { topic: 'Residential Tax Base', icon: '🏛', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Ties the budget squeeze to Kaysville\'s identity as a residential community with limited commercial development and reluctance toward high-density housing — a mix she says preserves the city\'s appeal but narrows the commercial tax base and shifts more of the burden onto residents.', source: SRC.kay_min },
      { topic: 'Municipal Power Utility', icon: '⚡', pos: 'support', issueKey: 'gov_services', issueStance: 'support',
        text: 'Kaysville runs its own municipal electric utility, delivering power at roughly 15% below Rocky Mountain Power rates as a UAMPS participant — with no investor return or income taxes — a structural cost advantage the residential city leans on.', source: SRC.kay_tax },
    ],
  },
  // 3) SOURCEFIX — attach the verified endorsement source; keep honest caveats
  anna_graff: {
    mode: 'sourcefix',
    label: 'Anna Graff — 🏛 Utah House of Representatives, District 12 (Hooper) · 2026 Democratic Nominee',
    cards: [
      { topic: 'Education', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: 'In endorsing her, the Utah Stonewall Democrats described her as focused on strengthening local communities through education. No detailed first-person education platform was located in the sources reviewed.', source: SRC.qsl_graff },
      { topic: 'Economic Development', icon: '📈', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: 'The Utah Stonewall Democrats endorsement describes her as focused on economic development and inclusive policymaking. No detailed first-person economic platform was located in the sources reviewed.', source: SRC.qsl_graff },
    ],
  },
};

// ── helpers ──────────────────────────────────────────────────────────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emitCard(c) {
  const parts = [`topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`, `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`, `source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`];
  return `      { ${parts.join(', ')} },`;
}
function emitBlock(key, rec) {
  return `    ${key}: [ // ${rec.label}\n` + rec.cards.map(emitCard).join('\n') + '\n    ],';
}
// find inclusive [start,end] line range of a top-level key array
function findBlock(lines, key) {
  const startRe = new RegExp('^    ' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ': \\[');
  const start = lines.findIndex((l) => startRe.test(l));
  if (start === -1) return null;
  for (let i = start + 1; i < lines.length; i++) if (lines[i] === '    ],') return { start, end: i };
  return null;
}

// ── main ─────────────────────────────────────────────────────────────────────
console.log(`PolitiDex — Utah launch polish  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);

// validate issueKeys against the live ISSUE_MAP vocabulary
const alignJs = fs.readFileSync(path.join(ROOT, 'alignment-tool.js'), 'utf8');
const mapSlice = alignJs.slice(alignJs.indexOf('var ISSUE_MAP = {'), alignJs.indexOf('try { window.ISSUE_MAP'));
const valid = new Set([...mapSlice.matchAll(/^\s+([a-z_]+):\s*\{\s*label:/gm)].map((m) => m[1]));
let bad = 0;
for (const [k, r] of Object.entries(RECORDS)) for (const c of r.cards) if (!valid.has(c.issueKey)) { console.log(`  ⚠ ${k}: invalid issueKey '${c.issueKey}'`); bad++; }
if (bad) { console.log(`\n  ✗ ${bad} invalid issueKey(s) — aborting.`); process.exit(1); }
console.log(`  ✓ all issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);

// ── 1) stance-card blocks → politician-stances.js ────────────────────────────
let text = fs.readFileSync(STANCES, 'utf8');
const stanceAnchor = '\n    };\n\n})();';
let stanceChanges = 0;
for (const [key, rec] of Object.entries(RECORDS)) {
  const desired = emitBlock(key, rec);
  let lines = text.split('\n');
  const blk = findBlock(lines, key);
  if (blk) {
    const current = lines.slice(blk.start, blk.end + 1).join('\n');
    if (current === desired) { console.log(`  ✓ ${key}: already ${rec.mode === 'create' ? 'present' : 'sourced'} — no change.`); continue; }
    lines.splice(blk.start, blk.end - blk.start + 1, ...desired.split('\n'));
    text = lines.join('\n');
    console.log(`  → ${rec.mode.toUpperCase()} ${key}: replaced ${blk.end - blk.start - 1} card(s) with ${rec.cards.length} sourced card(s).`);
    stanceChanges++;
  } else {
    if (!text.includes(stanceAnchor)) { console.error('  ✗ stance anchor missing; aborting.'); process.exit(1); }
    text = text.replace(stanceAnchor, '\n' + desired + stanceAnchor);
    console.log(`  → CREATE ${key}: appended ${rec.cards.length} sourced card(s).`);
    stanceChanges++;
  }
}
if (APPLY && stanceChanges) fs.writeFileSync(STANCES, text);

// ── 2) CMP_DATA roster + 3) browse nodes → index.html ────────────────────────
let html = fs.readFileSync(INDEX, 'utf8');
const rosterAnchor = "    mark_shepherd_clearfield: { name:'Mark Shepherd', office:'Mayor, Clearfield', state:'Utah', party:'', score:59, kept:0, broken:0, pending:0, icon:'🏛', issues:['Property Taxes','Housing & Redevelopment','Growth'] },";
const needRoster = Object.entries(RECORDS).filter(([k, r]) => r.roster && !new RegExp(`\\n\\s+${k}:\\s*\\{ name:`).test(html));
if (needRoster.length && html.includes(rosterAnchor)) {
  const rows = '\n    // July 2026 launch polish — South Jordan (Ramsey) + Kaysville (Tran)\n' +
    needRoster.map(([k, r]) => `    ${k}: { name:'${r.roster.name}', office:'${r.roster.office}', state:'Utah', party:'${r.roster.party}', score:${r.roster.score}, kept:0, broken:0, pending:0, icon:'${r.roster.icon}', issues:[${r.roster.issues.map((i) => `'${i}'`).join(',')}] },`).join('\n');
  html = html.replace(rosterAnchor, rosterAnchor + rows);
  console.log(`  → CMP_DATA roster: added ${needRoster.map(([k]) => k).join(', ')}`);
} else console.log('  · CMP_DATA roster: nothing to add.');

const browseAnchor = "      lharris:['pm-tier-state','2026 CANDIDATES','all_ut','statewide']";
const needBrowse = Object.entries(RECORDS).filter(([k, r]) => r.browse && !new RegExp(`\\n\\s+${k}:\\[`).test(html));
if (needBrowse.length && html.includes(browseAnchor)) {
  const nodes = needBrowse.map(([k, r]) => `      ${k}:[${r.browse.map((t) => `'${t}'`).join(',')}],`).join('\n');
  html = html.replace(browseAnchor, nodes + '\n' + browseAnchor);
  console.log(`  → browse-tree: added ${needBrowse.map(([k]) => k).join(', ')}`);
} else console.log('  · browse-tree: nothing to add.');

if (APPLY) {
  fs.writeFileSync(INDEX, html);
  console.log(`\nApplied (${stanceChanges} stance block(s) changed). NEXT: node scripts/split-stances.mjs`);
} else {
  console.log(`\nDry run (${stanceChanges} stance block(s) would change). Re-run with --apply, then split-stances.mjs`);
}
