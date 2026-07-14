#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Utah launch DEPTH batch (July 2026)
// ---------------------------------------------------------------------------
// A small, controversy-first depth pass closing two named gaps from the Utah
// coverage audit, each a currently-seated mayor on that city's live fiscal
// fight, every card carrying a source verified against a direct read:
//
//   • WEST JORDAN (Salt Lake County) — Utah's 4th-largest city and the largest
//     Salt Lake suburb. Dirk Burton (Mayor) ALREADY had a roster entry and one
//     data-center Evidence Locker card (the $2B NOVVA expansion) but ZERO stance
//     cards. ENRICH the existing `dirk_burton_wjordan` with his FY2027 budget's
//     property-tax adjustment framed as fiscal discipline ("years planning
//     carefully and staying disciplined"; "adjustments that will help us avoid
//     large jumps later"), growth-driven staffing, and the sales-tax /
//     court-revenue headwinds he calls "real, yet … manageable."
//   • CLEARFIELD (Davis County) — a Davis city with no record; only Layton was
//     built at the city tier. CREATE Mark Shepherd (Mayor): his redevelopment
//     record ("Redevelopment is crucial"; national housing co-chair; the Mobile
//     Home Park → Lotus Group deal) and the FY2026 property-tax increase the
//     Utah State Tax Commission REJECTED in Sept. 2025 on a technicality under
//     new law (SB202/SB29), now re-pursued for FY2027.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md):
//   • Municipal offices are nonpartisan; party is left blank, consistent with
//     the existing suburb-mayor roster (Zoltanski/Lang/Palmer/Franco).
//   • Direct quotes are used ONLY where verified against the cited article
//     (Burton's mayor's message; Shepherd's Standard-Examiner redevelopment
//     quote). The tax-rejection facts are the Tax Commission's / reporting's,
//     attributed to the city/administration as executive action — no words are
//     put in either mayor's mouth that the source doesn't support.
//   • Nothing invented. Where a figure is the budget's rather than a mayor's
//     statement, the card says so.
//
// This batch is CLIENT-side and self-contained (no Firestore creds needed). On
// --apply it inserts, idempotently:
//   1. stance cards → politician-stances.js (window.ISSUE_STANCE_DATA)
//   2. a roster entry → CMP_DATA in index.html (so each is a browsable profile)
//   3. a browse-tree node → index.html Power-Map (so each is discoverable)
// Then regenerate the shipped chunks:  node scripts/split-stances.mjs
//
//   node scripts/deep-dive-launch-depth-jul2026.mjs            # dry run
//   node scripts/deep-dive-launch-depth-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STANCES = path.join(ROOT, 'politician-stances.js');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');

const SRC = {
  wj_msg:     { label: 'West Jordan Mayor (May 2026)', url: 'https://www.westjordan.utah.gov/mayor/mayors-message-may-2026/' },
  se_housing: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2025/feb/03/clearfield-mayor-co-chairing-two-national-housing-committees/' },
  ksl_denials:{ label: 'KSL', url: 'https://www.ksl.com/article/51384007/utah-tax-officials-deny-tax-hikes-from-35-cities-school-districts-and-other-entities' },
  ksl_taxes:  { label: 'KSL', url: 'https://www.ksl.com/article/51546349/why-are-your-taxes-increasing-numerous-utah-cities-pursue-property-tax-hikes' },
};

const DATA = {
  // ENRICH: dirk_burton_wjordan already exists in CMP_DATA + ACCT_SPOTLIGHT
  // (a data-center evidence card) but had no stance cards. Add cards only; the
  // roster line already exists, so roster insertion is skipped for this id.
  dirk_burton_wjordan: {
    name: 'Dirk Burton', office: 'Mayor, West Jordan', party: '', icon: '🏛', score: 59,
    rosterExists: true,
    issues: ['Property Taxes', 'Growth', 'Local Accountability'],
    browse: ['pm-tier-local', 'MAYORS', 'slc', 'district4'],
    label: 'Dirk Burton — 🏛 West Jordan (Mayor)',
    stanceCards: [
      { topic: 'Fiscal Discipline & Property Taxes', icon: '💵', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed',
        text: "Frames West Jordan as 'in a strong position because we've spent years planning carefully and staying disciplined,' proposing an FY2027 property-tax adjustment as 'adjustments that will help us avoid large jumps later,' with an Aug. 11 truth-in-taxation hearing.",
        source: SRC.wj_msg },
      { topic: 'Growth & City Services', icon: '🏗', pos: 'support', issueKey: 'gov_services', issueStance: 'support',
        text: "Ties spending to growth in Utah's 4th-largest city — 'as our population grows, we need to look at adding some positions such as a park's maintenance worker, a crossing-guard supervisor' — alongside minor sewer, solid-waste and streetlight fee increases while water and stormwater fees hold.",
        source: SRC.wj_msg },
      { topic: 'Revenue Headwinds', icon: '🏛', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: "Says the city is 'keeping our revenue expectations realistic' while watching 'slower sales-tax growth, and declining court revenues,' which he calls 'real, yet … manageable.'",
        source: SRC.wj_msg },
    ],
  },
  mark_shepherd_clearfield: {
    name: 'Mark Shepherd', office: 'Mayor, Clearfield', party: '', icon: '🏛', score: 59,
    issues: ['Property Taxes', 'Housing & Redevelopment', 'Growth'],
    browse: ['pm-tier-local', 'MAYORS', 'davis', 'district1'],
    label: 'Mark Shepherd — 🏛 Clearfield (Mayor)',
    stanceCards: [
      { topic: 'Redevelopment & Housing', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: "'Redevelopment is crucial,' says the Clearfield mayor, who co-chairs two national housing groups (Mayors & CEOs for U.S. Housing Investment; America's Housing Comeback) and cites the city's purchase of the Clearfield Mobile Home Park and a redevelopment agreement with the Lotus Group.",
        source: SRC.se_housing },
      { topic: 'Property-Tax Increase Rejected', icon: '💵', pos: 'mixed', issueKey: 'property_tax', issueStance: 'mixed',
        text: "Clearfield's FY2026 property-tax increase (about $196,000) was rejected by the Utah State Tax Commission in Sept. 2025 over a compliance technicality under strict new law (SB202/SB29) — one of roughly 35–39 Utah taxing entities denied that year.",
        source: SRC.ksl_denials },
      { topic: 'FY2027 Tax Pursued for Services', icon: '🏛', pos: 'mixed', issueKey: 'gov_services', issueStance: 'mixed',
        text: "For FY2027 the city is again pursuing an increase (~6.59%, ~$233,000/yr; about $21.60 on a $510,000 home) framed as maintaining status-quo services — street and facility maintenance, police equipment, and a slope mower.",
        source: SRC.ksl_taxes },
    ],
  },
};

// ── emit the ISSUE_STANCE_DATA block (for review / manual paste) ─────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emitBlock() {
  const out = ['    // ── Utah launch depth · West Jordan + Clearfield mayors (July 2026) ───────────'];
  for (const [id, p] of Object.entries(DATA)) {
    out.push(`    ${id}: [ // ${p.label}`);
    for (const c of p.stanceCards) {
      const parts = [`topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`, `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`, `source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`];
      out.push(`      { ${parts.join(', ')} },`);
    }
    out.push('    ],');
  }
  return out.join('\n');
}

// ── main ─────────────────────────────────────────────────────────────────────
console.log(`PolitiDex — Utah launch depth (West Jordan + Clearfield)  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);

// validate issueKeys against the live ISSUE_MAP vocabulary
const alignJs = fs.readFileSync(path.join(ROOT, 'alignment-tool.js'), 'utf8');
const mapSlice = alignJs.slice(alignJs.indexOf('var ISSUE_MAP = {'), alignJs.indexOf('try { window.ISSUE_MAP'));
const valid = new Set([...mapSlice.matchAll(/^\s+([a-z_]+):\s*\{\s*label:/gm)].map((m) => m[1]));
let bad = 0;
for (const p of Object.values(DATA)) for (const c of p.stanceCards) if (!valid.has(c.issueKey)) { console.log(`  ⚠ ${p.name}: invalid issueKey '${c.issueKey}'`); bad++; }
console.log(bad ? `  ✗ ${bad} invalid issueKey(s) — fix before applying.\n` : `  ✓ all issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);
if (bad) process.exit(1);

// idempotency: which ids already exist as stance keys?
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const already = Object.keys(DATA).filter((id) => new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(DATA)) console.log(`  ${already.includes(id) ? '· exists' : '→ CREATE'}  ${id} (${DATA[id].name}) · ${DATA[id].office} · +${DATA[id].stanceCards.length} sourced card(s)`);

const toAdd = Object.keys(DATA).filter((id) => !already.includes(id));
console.log('\n' + emitBlock() + '\n');

if (!toAdd.length) { console.log('All records already present — nothing to do.'); process.exit(0); }
if (!APPLY) { console.log(`Would create ${toAdd.length} record(s). Re-run with --apply to write, then: node scripts/split-stances.mjs`); process.exit(0); }

// 1) stance cards → politician-stances.js (before the object's closing `    };`)
let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance-object anchor not found; aborting.'); process.exit(1); }
const block = '\n    // ── Utah launch depth · West Jordan + Clearfield mayors (July 2026) ───────────\n' +
  toAdd.map((id) => {
    const p = DATA[id];
    return `    ${id}: [ // ${p.label}\n` + p.stanceCards.map((c) => {
      const parts = [`topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`, `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`, `source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`];
      return `      { ${parts.join(', ')} },`;
    }).join('\n') + '\n    ],';
  }).join('\n');
stances = stances.replace(stanceAnchor, block + stanceAnchor);
fs.writeFileSync(STANCES, stances);
console.log(`  ✎ wrote ${toAdd.length} stance record(s) → politician-stances.js`);

// 2) CMP_DATA roster (only for ids that DON'T already have a roster line) ──────
let html = fs.readFileSync(INDEX, 'utf8');
const rosterAnchor = "    lorin_palmer_herriman:    { name:'Lorin Palmer',      office:'Mayor, Herriman',              state:'Utah', party:'',  score:60, kept:0, broken:0, pending:0, icon:'🏛', issues:['Growth & Land Use','Property Taxes','Public Schools'] },";
const needRoster = toAdd.filter((id) => !DATA[id].rosterExists && !new RegExp(`\\n\\s+${id}:\\s*\\{ name:`).test(html));
if (needRoster.length && html.includes(rosterAnchor)) {
  const rows = '\n    // July 2026 launch depth — Clearfield (Davis city) mayor; West Jordan\'s Dirk\n' +
    '    // Burton enriched with stance cards under the pre-existing dirk_burton_wjordan.\n' +
    needRoster.map((id) => {
      const p = DATA[id];
      return `    ${id}: { name:'${p.name}', office:'${p.office}', state:'Utah', party:'${p.party}', score:${p.score}, kept:0, broken:0, pending:0, icon:'${p.icon}', issues:[${p.issues.map((i) => `'${i}'`).join(',')}] },`;
    }).join('\n');
  html = html.replace(rosterAnchor, rosterAnchor + rows);
  console.log(`  ✎ added CMP_DATA roster entries: ${needRoster.join(', ')}`);
} else console.log('  · CMP_DATA roster entries already present (or none needed) — skipped');

// 3) browse-tree node → index.html (only for ids not already in the tree) ──────
const browseAnchor = "      lharris:['pm-tier-state','2026 CANDIDATES','all_ut','statewide']";
const needBrowse = toAdd.filter((id) => !new RegExp(`\\n\\s+${id}:\\[`).test(html));
if (needBrowse.length && html.includes(browseAnchor)) {
  const nodes = needBrowse.map((id) => `      ${id}:[${DATA[id].browse.map((t) => `'${t}'`).join(',')}],`).join('\n');
  html = html.replace(browseAnchor, nodes + '\n' + browseAnchor);
  console.log(`  ✎ added Power-Map browse-tree nodes: ${needBrowse.join(', ')}`);
} else console.log('  · browse-tree nodes already present (or none needed) — skipped');

fs.writeFileSync(INDEX, html);
console.log(`\nApplied. NEXT: node scripts/split-stances.mjs  (regenerate shipped chunks).`);
