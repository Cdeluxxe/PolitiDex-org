#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National (federal) deep dive: REMAINING KEY COMMITTEE CHAIRS,
// RANKING MEMBERS & CAUCUS CHAIRS, WAVE 15 (July 2026) — after waves 1-14.
// ---------------------------------------------------------------------------
// This wave closes the last committee-leadership gaps — several House committee
// chairs and the ranking members opposite them, plus two caucus chairs — all
// squarely in the "key committee chairs" priority and mapped to the recent
// Issue Spotlights. Notably it adds Maxine Waters, the lead Democrat on
// Financial Services (crypto/banking/housing), and the Science Committee's
// chair-and-ranking pair (Babin/Lofgren) on AI and research:
//
//   • ANDY HARRIS (andy_harris) — House Freedom Caucus Chair (R-MD): spending,
//     the border, FDA/health, and agriculture.
//   • MIKE BOST (mike_bost) — House Veterans' Affairs Chair (R-IL): veterans,
//     the border, energy, and manufacturing.
//   • BRIAN BABIN (brian_babin) — House Science, Space & Tech Chair (R-TX):
//     space/NASA, AI and research, energy, and the border.
//   • ROGER WILLIAMS (roger_williams) — House Small Business Chair (R-TX): small
//     business, taxes, deregulation, and the border.
//   • BRYAN STEIL (bryan_steil) — House Administration Chair (R-WI): elections,
//     government operations, the border, and the economy.
//   • MAXINE WATERS (maxine_waters) — House Financial Services Ranking Member
//     (D-CA): crypto and banking, housing, consumer protection, and regulation.
//   • JIM HIMES (jim_himes) — House Intelligence Ranking Member (D-CT):
//     intelligence and oversight, national security, AI, and the economy.
//   • ZOE LOFGREN (zoe_lofgren) — House Science Ranking Member (D-CA): science
//     and AI, immigration, elections, and digital privacy.
//   • JARED HUFFMAN (jared_huffman) — House Natural Resources Ranking Member
//     (D-CA): public lands, clean energy, oceans and water, and climate.
//   • YVETTE CLARKE (yvette_clarke) — Congressional Black Caucus Chair (D-NY):
//     broadband and tech, AI bias, healthcare, and voting rights.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words — never their party. Contested/two-sided
// records (Waters on crypto, Harris on FDA/health, Himes on the economy) are
// marked mixed and attributed. Positions are the documented public record;
// quotes only where genuinely on the record. Sources are official pages.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-committees-wave15-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-committees-wave15-jul2026.mjs --apply    # write
// Then: node scripts/split-stances.mjs
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STANCES = path.join(ROOT, 'politician-stances.js');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');

const S = {
  harris:   { label: 'harris.house.gov', url: 'https://harris.house.gov/media/press-releases' },
  bost:     { label: 'bost.house.gov', url: 'https://bost.house.gov/media/press-releases' },
  babin:    { label: 'babin.house.gov', url: 'https://babin.house.gov/media-center/press-releases' },
  williams: { label: 'williams.house.gov', url: 'https://williams.house.gov/media/press-releases' },
  steil:    { label: 'steil.house.gov', url: 'https://steil.house.gov/media/press-releases' },
  waters:   { label: 'waters.house.gov', url: 'https://waters.house.gov/media/press-releases' },
  himes:    { label: 'himes.house.gov', url: 'https://himes.house.gov/media/press-releases' },
  lofgren:  { label: 'lofgren.house.gov', url: 'https://lofgren.house.gov/media/press-releases' },
  huffman:  { label: 'huffman.house.gov', url: 'https://huffman.house.gov/media-center/press-releases' },
  clarke:   { label: 'clarke.house.gov', url: 'https://clarke.house.gov/media/press-releases' },
};

const NEW = {
  andy_harris: {
    roster: { name: 'Andy Harris', office: 'House Freedom Caucus Chair', state: 'Maryland', party: 'R', score: 55, icon: '🚩', issues: ['Spending', 'Border', 'FDA & Health', 'Agriculture'] },
    label: 'Andy Harris — 🚩 House Freedom Caucus Chair (R-MD)',
    cards: [
      { topic: 'Spending & Debt', icon: '📉', pos: 'support', issueKey: 'cut_spending', issueStance: 'support',
        text: "Chair of the House Freedom Caucus and an appropriator, Harris pushes deep spending cuts, conservative policy riders, and using the budget process for leverage.",
        evidence: 'Chair of the House Freedom Caucus; member of the Appropriations Committee.', source: S.harris },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: "Supports strict border enforcement and tighter asylum limits.", source: S.harris },
      { topic: 'FDA & Health', icon: '🩺', pos: 'mixed', issueKey: 'medical_freedom', issueStance: 'mixed',
        text: "A physician, Harris focuses on FDA and drug policy and has taken positions on vaccines and treatments aligned with medical-freedom advocates.", source: S.harris },
      { topic: 'Agriculture', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: "From Maryland's Eastern Shore, backs agriculture, the watermen, and the Chesapeake economy.", source: S.harris },
    ],
  },
  mike_bost: {
    roster: { name: 'Mike Bost', office: "House Veterans' Affairs Chair", state: 'Illinois', party: 'R', score: 56, icon: '🎖', issues: ['Veterans', 'Border', 'Energy', 'Manufacturing'] },
    label: "Mike Bost — 🎖 House Veterans' Affairs Chair (R-IL)",
    cards: [
      { topic: 'Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: "Chair of the House Veterans' Affairs Committee and a Marine Corps veteran, Bost focuses on VA health-care access, benefits, accountability, and community care.",
        evidence: "Chairman of the House Committee on Veterans' Affairs; Marine veteran.", source: S.bost },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: "Supports strict border enforcement and tighter asylum limits.", source: S.bost },
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: "From southern Illinois, backs coal, oil, and gas and opposes rules he argues threaten energy jobs.", source: S.bost },
      { topic: 'Manufacturing & Workers', icon: '🏭', pos: 'support', issueKey: 'econ_workers', issueStance: 'support',
        text: "Focuses on manufacturing jobs and workers in his district.", source: S.bost },
    ],
  },
  brian_babin: {
    roster: { name: 'Brian Babin', office: 'House Science, Space & Technology Chair', state: 'Texas', party: 'R', score: 55, icon: '🚀', issues: ['Space & NASA', 'AI & Research', 'Energy', 'Border'] },
    label: 'Brian Babin — 🚀 House Science, Space & Technology Chair (R-TX)',
    cards: [
      { topic: 'Space & NASA', icon: '🚀', pos: 'support', issueKey: 'tech_innovation', issueStance: 'support',
        text: "Chair of the House Science, Space & Technology Committee, Babin champions NASA, the Artemis moon-to-Mars program, and U.S. leadership in space.",
        evidence: 'Chairman of the House Committee on Science, Space & Technology.', source: S.babin },
      { topic: 'AI & Research', icon: '🤖', pos: 'support', issueKey: 'tech_innovation', issueStance: 'support',
        text: "Oversees federal science and AI research policy, favoring U.S. competitiveness and light-touch innovation over heavy regulation.", source: S.babin },
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: "From Texas, backs expanded oil and gas production and energy research.", source: S.babin },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: "Supports strict border enforcement and tighter asylum limits.", source: S.babin },
    ],
  },
  roger_williams: {
    roster: { name: 'Roger Williams', office: 'House Small Business Chair', state: 'Texas', party: 'R', score: 55, icon: '🏪', issues: ['Small Business', 'Taxes', 'Deregulation', 'Border'] },
    label: 'Roger Williams — 🏪 House Small Business Chair (R-TX)',
    cards: [
      { topic: 'Small Business', icon: '🏪', pos: 'support', issueKey: 'econ_smallbiz', issueStance: 'support',
        text: "Chair of the House Small Business Committee and a longtime business owner, Williams pushes tax relief, deregulation, and access to capital for small firms.",
        evidence: 'Chairman of the House Committee on Small Business.', source: S.williams },
      { topic: 'Taxes', icon: '💵', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: "Backs making the 2017 tax cuts permanent and cutting taxes on small business.", source: S.williams },
      { topic: 'Deregulation', icon: '✂️', pos: 'support', issueKey: 'gov_regulation', issueStance: 'support',
        text: "Favors cutting federal regulations he argues burden small businesses.", source: S.williams },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: "Supports strict border enforcement.", source: S.williams },
    ],
  },
  bryan_steil: {
    roster: { name: 'Bryan Steil', office: 'House Administration Chair', state: 'Wisconsin', party: 'R', score: 55, icon: '🗳', issues: ['Elections', 'Government Operations', 'Border', 'Economy'] },
    label: 'Bryan Steil — 🗳 House Administration Chair (R-WI)',
    cards: [
      { topic: 'Election Integrity', icon: '🗳', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: "Chair of the House Administration Committee, Steil leads Republican election-law efforts — voter ID, citizenship verification, and maintaining voter rolls.",
        evidence: 'Chairman of the Committee on House Administration.', source: S.steil },
      { topic: 'Government Operations', icon: '🏛', pos: 'support', issueKey: 'gov_waste', issueStance: 'support',
        text: "Oversees Capitol operations and pushes efficiency and cost controls in legislative-branch spending.", source: S.steil },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: "Supports strict border enforcement.", source: S.steil },
      { topic: 'Economy & Manufacturing', icon: '🏭', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
        text: "From Wisconsin, focuses on manufacturing, workforce, and lowering costs.", source: S.steil },
    ],
  },
  maxine_waters: {
    roster: { name: 'Maxine Waters', office: 'House Financial Services Ranking Member', state: 'California', party: 'D', score: 56, icon: '🏦', issues: ['Banking & Crypto', 'Housing', 'Consumer Protection', 'Regulation'] },
    label: 'Maxine Waters — 🏦 House Financial Services Ranking Member (D-CA)',
    cards: [
      { topic: 'Digital Assets & Crypto', icon: '🪙', pos: 'mixed', issueKey: 'crypto_cbdc', issueStance: 'mixed',
        text: "The top Democrat on the House Financial Services Committee, Waters has negotiated on stablecoin and crypto-market bills while insisting on strong consumer protections — wary of frameworks she views as too weak.",
        evidence: 'Ranking Member of the House Financial Services Committee.', source: S.waters },
      { topic: 'Housing', icon: '🏠', pos: 'support', issueKey: 'housing', issueStance: 'support',
        text: "A longtime housing advocate, Waters pushes federal investment in affordable housing, homelessness programs, and tenant protections.", source: S.waters },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: "A defender of the Consumer Financial Protection Bureau and of Wall Street oversight and accountability.", source: S.waters },
      { topic: 'Financial Regulation', icon: '🏦', pos: 'oppose', issueKey: 'gov_regulation', issueStance: 'oppose',
        text: "Supports stronger bank regulation and opposes rolling back post-2008 financial rules.", source: S.waters },
    ],
  },
  jim_himes: {
    roster: { name: 'Jim Himes', office: 'House Intelligence Ranking Member', state: 'Connecticut', party: 'D', score: 57, icon: '🕵', issues: ['Intelligence', 'National Security', 'AI & Tech', 'Economy'] },
    label: 'Jim Himes — 🕵 House Intelligence Ranking Member (D-CT)',
    cards: [
      { topic: 'Intelligence & Oversight', icon: '🕵', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: "The top Democrat on the House Intelligence Committee, Himes focuses on oversight of intelligence agencies and surveillance reform that balances security and civil liberties.",
        evidence: 'Ranking Member of the House Permanent Select Committee on Intelligence.', source: S.himes },
      { topic: 'National Security', icon: '🛡', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: "Supports aid to Ukraine and Israel, strong alliances, and countering China and Russia.", source: S.himes },
      { topic: 'AI & Emerging Tech', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: "Works on the national-security and economic implications of AI and emerging technology.", source: S.himes },
      { topic: 'Economy & Finance', icon: '📈', pos: 'mixed', issueKey: 'econ_growth', issueStance: 'mixed',
        text: "A former banker and New Democrat, Himes favors market-oriented, pro-growth policy alongside consumer protections.", source: S.himes },
    ],
  },
  zoe_lofgren: {
    roster: { name: 'Zoe Lofgren', office: 'House Science Committee Ranking Member', state: 'California', party: 'D', score: 57, icon: '🔬', issues: ['Science & AI', 'Immigration', 'Elections', 'Digital Privacy'] },
    label: 'Zoe Lofgren — 🔬 House Science Committee Ranking Member (D-CA)',
    cards: [
      { topic: 'Science & AI', icon: '🔬', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: "The top Democrat on the House Science, Space & Technology Committee and a Silicon Valley representative, Lofgren backs federal research, AI guardrails, and tech competitiveness.",
        evidence: 'Ranking Member of the House Committee on Science, Space & Technology.', source: S.lofgren },
      { topic: 'Immigration', icon: '🛂', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: "A leading voice on immigration, Lofgren backs a path to citizenship, high-skilled immigration reform, and protections for Dreamers.", source: S.lofgren },
      { topic: 'Elections & Democracy', icon: '🗳', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: "A former House Administration leader, focuses on voting rights, election security, and democracy reforms.", source: S.lofgren },
      { topic: 'Digital Privacy', icon: '🔒', pos: 'support', issueKey: 'privacy_rights', issueStance: 'support',
        text: "Champions digital privacy, limits on surveillance, and user protections.", source: S.lofgren },
    ],
  },
  jared_huffman: {
    roster: { name: 'Jared Huffman', office: 'House Natural Resources Ranking Member', state: 'California', party: 'D', score: 57, icon: '🌲', issues: ['Public Lands', 'Clean Energy', 'Oceans & Water', 'Climate'] },
    label: 'Jared Huffman — 🌲 House Natural Resources Ranking Member (D-CA)',
    cards: [
      { topic: 'Public Lands', icon: '🏞', pos: 'support', issueKey: 'lands_keep_public', issueStance: 'support',
        text: "The top Democrat on the House Natural Resources Committee, Huffman defends public lands, national monuments, and conservation against expanded drilling and mining.",
        evidence: 'Ranking Member of the House Committee on Natural Resources.', source: S.huffman },
      { topic: 'Clean Energy & Climate', icon: '🌱', pos: 'support', issueKey: 'climate_action', issueStance: 'support',
        text: "Pushes clean energy and climate action and opposes fossil-fuel expansion on federal lands.", source: S.huffman },
      { topic: 'Oceans & Water', icon: '🌊', pos: 'support', issueKey: 'water', issueStance: 'support',
        text: "From coastal California, focuses on fisheries, oceans, salmon, and Western water.", source: S.huffman },
      { topic: 'Energy on Federal Lands', icon: '⚡', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: "Opposes new oil-and-gas leasing on public lands and favors renewables.", source: S.huffman },
    ],
  },
  yvette_clarke: {
    roster: { name: 'Yvette Clarke', office: 'Congressional Black Caucus Chair', state: 'New York', party: 'D', score: 57, icon: '✊', issues: ['Broadband & Tech', 'AI Bias', 'Healthcare', 'Voting Rights'] },
    label: 'Yvette Clarke — ✊ Congressional Black Caucus Chair (D-NY)',
    cards: [
      { topic: 'Broadband & Tech', icon: '📶', pos: 'support', issueKey: 'broadband', issueStance: 'support',
        text: "Chair of the Congressional Black Caucus and an Energy & Commerce member, Clarke champions broadband access, closing the digital divide, and cybersecurity.",
        evidence: 'Chair of the Congressional Black Caucus.', source: S.clarke },
      { topic: 'AI Bias & Deepfakes', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: "A lead sponsor of legislation on AI transparency, algorithmic bias, and deepfake disclosure.", source: S.clarke },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: "Focuses on health equity, maternal health, and protecting the ACA and Medicaid.", source: S.clarke },
      { topic: 'Voting Rights', icon: '🗳', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: "A strong advocate for voting-rights protections and ballot access.", source: S.clarke },
    ],
  },
};

// ── validate issueKeys ───────────────────────────────────────────────────────
const alignJs = fs.readFileSync(path.join(ROOT, 'alignment-tool.js'), 'utf8');
const mapSlice = alignJs.slice(alignJs.indexOf('var ISSUE_MAP = {'), alignJs.indexOf('try { window.ISSUE_MAP'));
const valid = new Set([...mapSlice.matchAll(/^\s+([a-z_0-9]+):\s*\{\s*label:/gm)].map((m) => m[1]));
let bad = 0;
const allCards = Object.values(NEW).flatMap((p) => p.cards);
for (const c of allCards) if (!valid.has(c.issueKey)) { console.log(`  ⚠ invalid issueKey '${c.issueKey}' (topic: ${c.topic})`); bad++; }
console.log(bad ? `  ✗ ${bad} invalid issueKey(s).\n` : `  ✓ all ${allCards.length} issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);
if (bad) process.exit(1);

function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function cardStr(c) {
  const parts = [`topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`, `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`];
  if (c.evidence) parts.push(`evidence:'${esc(c.evidence)}'`);
  parts.push(`source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`);
  return `      { ${parts.join(', ')} },`;
}

console.log(`PolitiDex — National committee chairs, ranking members & caucus chairs WAVE 15  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National remaining committee chairs, ranking members & caucus chairs · top-down federal wave 15 (Jul 2026) ─\n' +
    newToAdd.map((id) => `    ${id}: [ // ${NEW[id].label}\n${NEW[id].cards.map(cardStr).join('\n')}\n    ],`).join('\n');
  stances = stances.replace(stanceAnchor, block + stanceAnchor);
  fs.writeFileSync(STANCES, stances);
  console.log(`  ✎ appended ${newToAdd.length} new stance array(s)`);
}

let html = fs.readFileSync(INDEX, 'utf8');
const rosterMarker = "issues:['Government Spending','Border Security','National Debt','Deregulation'] },";
const rosterRows = Object.entries(NEW)
  .filter(([id]) => !new RegExp(`\\n\\s+${id}\\s*:\\s*\\{ name:`).test(html))
  .map(([id, p]) => { const r = p.roster; return `    ${id.padEnd(24)}: { name:'${esc(r.name)}', office:'${esc(r.office)}', state:'${esc(r.state)}', party:'${r.party}', score:${r.score}, kept:0, broken:0, pending:0, icon:'${r.icon}', issues:[${r.issues.map((i) => `'${esc(i)}'`).join(',')}] },`; });
if (rosterRows.length && html.includes(rosterMarker)) {
  const block = '\n    // National — remaining committee chairs, ranking members + caucus chairs, wave 15 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  fs.writeFileSync(INDEX, html);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

console.log('\nApplied. NEXT: wire standsOnIssue, then: node scripts/split-stances.mjs');
