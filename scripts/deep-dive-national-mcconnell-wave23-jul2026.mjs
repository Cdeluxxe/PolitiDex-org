#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: MITCH McCONNELL (new), top-down federal
// WAVE 23 (July 2026) — after waves 1-22.
// ---------------------------------------------------------------------------
// The federal officeholder bench is saturated; a coverage audit this wave found
// exactly one clear remaining marquee gap and closes it:
//
//   • MITCH McCONNELL (mcconnell) — U.S. Senator (R-KY), former Senate Republican
//     Leader. Was absent entirely (no roster, no stance cards). Built full: the
//     Senate's leading Republican champion of Ukraine aid, a staunch Israel and
//     alliances supporter, a free-trader skeptical of broad tariffs, a defense
//     appropriator uneasy about the debt, and an institutionalist who broke with
//     his own party's president on several 2025 Cabinet confirmations.
//
// Audited and found ALREADY complete (intentionally NOT rebuilt): Tulsi Gabbard,
// Pete Hegseth, John Ratcliffe, Kash Patel, Lee Zeldin, Jerome Powell, Bernie
// Sanders — all already carry sourced ISSUE_STANCE_DATA cards, roster rows, and
// Spotlight wiring.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own recorded act or words — never their party. Genuinely two-sided
// records (McConnell on the debt vs. defense; the filibuster + his nominee votes)
// are marked mixed and attributed. Vote facts are plain (Hegseth 51-50 with the
// VP breaking the tie; Gabbard 52-48; RFK Jr. 52-48), never party-line
// characterizations. Sources are official Senate pages.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-mcconnell-wave23-jul2026.mjs          # dry run
//   node scripts/deep-dive-national-mcconnell-wave23-jul2026.mjs --apply  # write
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
  mcconnell: { label: 'mcconnell.senate.gov', url: 'https://www.mcconnell.senate.gov/public/index.cfm/pressreleases' },
};

// roster:false means the figure already has a CMP_DATA roster row (enrich only).
const NEW = {
  mcconnell: {
    roster: { name: 'Mitch McConnell', office: 'U.S. Senator', state: 'Kentucky', party: 'R', score: 57, icon: '🏛', issues: ['Ukraine & Defense', 'Foreign Aid & Alliances', 'Free Trade', 'Government Spending'] },
    label: 'Mitch McConnell — 🏛 U.S. Senator (R-KY), former Senate Republican Leader',
    cards: [
      { topic: 'Ukraine & Russia', icon: '🇺🇦', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: 'The Senate’s most prominent Republican advocate for arming Ukraine, McConnell pushed to pass the April 2024 national-security supplemental and has repeatedly warned that abandoning Ukraine would embolden Russia and China and undercut U.S. security.',
        evidence: 'Former Senate Republican Leader (2007–2025); senior member of the Appropriations, Rules, and Agriculture Committees.', source: S.mcconnell },
      { topic: 'Israel & Alliances', icon: '\u{1F91D}', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: 'A staunch supporter of Israel and of robust U.S. alliances and foreign aid, McConnell backed the 2024 aid package for Israel and argues that sustained American leadership abroad is cheaper than the wars that follow retreat.',
        source: S.mcconnell },
      { topic: 'Tariffs & Household Prices', icon: '\u{1F4B5}', pos: 'oppose', issueKey: 'tariffs_prices', issueStance: 'oppose',
        text: 'A longtime free-trader, McConnell has publicly criticized broad, across-the-board tariffs, warning they act as a tax on American families and threaten Kentucky exports such as bourbon and farm goods.',
        source: S.mcconnell },
      { topic: 'Debt vs. Defense Funding', icon: '\u{1F4C9}', pos: 'mixed', issueKey: 'national_debt', issueStance: 'mixed',
        text: 'A traditional fiscal conservative who nonetheless champions higher defense spending, McConnell warns about the national debt while prioritizing military readiness — a tension he resolves in favor of what he calls hard-power investment.',
        source: S.mcconnell },
      { topic: 'Senate Institutions & Independence', icon: '⚖️', pos: 'mixed', issueKey: 'democracy_balance', issueStance: 'mixed',
        text: 'A defender of the Senate’s legislative filibuster who declined to eliminate it, McConnell also broke with his own party’s president on advice-and-consent, voting against confirming several 2025 Cabinet nominees — including Pete Hegseth, Tulsi Gabbard, and Robert F. Kennedy Jr. — on qualifications and national-security grounds.',
        evidence: 'Senate roll-call votes on the 2025 Cabinet confirmations (Hegseth 51-50 with the Vice President breaking the tie; Gabbard 52-48; Kennedy 52-48).', source: S.mcconnell },
    ],
  },
};
// NOTE: Tulsi Gabbard (tgabbard) was audited for this wave and found ALREADY
// complete — she carries four sourced ISSUE_STANCE_DATA cards, a CMP_DATA roster
// entry, Spotlight rows, a journey and say-vs-do receipts — so she is
// intentionally NOT rebuilt here, to avoid duplication.

// ── validate issueKeys against ISSUE_MAP ─────────────────────────────────────
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

console.log(`PolitiDex — National McConnell WAVE 23  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => NEW[id].cards.length && !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists  '} ${id} (${NEW[id].label.split(' —')[0]}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

// ── 1. append stance arrays to politician-stances.js ─────────────────────────
let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National — McConnell (new) + Gabbard (enrich) · top-down federal wave 23 (Jul 2026) ─\n' +
    newToAdd.map((id) => `    ${id}: [ // ${NEW[id].label}\n${NEW[id].cards.map(cardStr).join('\n')}\n    ],`).join('\n');
  stances = stances.replace(stanceAnchor, block + stanceAnchor);
  fs.writeFileSync(STANCES, stances);
  console.log(`  ✎ appended ${newToAdd.length} new stance array(s)`);
} else console.log('  · stance arrays present — skipped');

let html = fs.readFileSync(INDEX, 'utf8');

// ── 2. CMP_DATA roster row (only for figures with roster:{...}) ───────────────
const thuneAnchor = "    thune:                    { name:'John Thune',";
const rosterRows = Object.entries(NEW)
  .filter(([id, p]) => p.roster && !new RegExp(`\\n\\s+${id}\\s*:\\s*\\{\\s*name:`).test(html))
  .map(([id, p]) => { const r = p.roster; return `    ${id.padEnd(24)}: { name:'${esc(r.name)}', office:'${esc(r.office)}', state:'${esc(r.state)}', party:'${r.party}', score:${r.score}, kept:0, broken:0, pending:0, icon:'${r.icon}', issues:[${r.issues.map((i) => `'${esc(i)}'`).join(',')}] },`; });
if (rosterRows.length && html.includes(thuneAnchor)) {
  const thuneLineEnd = html.indexOf('\n', html.indexOf(thuneAnchor));
  const block = '\n    // National — McConnell, former Senate Republican Leader, wave 23 (July 2026).' + '\n' + rosterRows.join('\n');
  html = html.slice(0, thuneLineEnd) + block + html.slice(thuneLineEnd);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or anchor missing — skipped');

// ── 3. PROFILES seed allow-list ──────────────────────────────────────────────
const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National wave 23 —')) {
  const seedIds = Object.keys(NEW).filter((id) => !new RegExp(`'${id}'`).test(html.slice(html.indexOf('].forEach(function (id) {') - 4000, html.indexOf('].forEach(function (id) {'))));
  if (seedIds.length) {
    const seedBlock = '\n' +
      "        // National wave 23 — McConnell (new) + Gabbard (enrich) (July 2026)\n" +
      "        " + seedIds.map((id) => `'${id}'`).join(', ') + ",";
    html = html.replace(seedClose, seedBlock + seedClose);
    console.log(`  ✎ seeded ${seedIds.length} id(s) into the PROFILES allow-list (${seedIds.join(', ')})`);
  } else console.log('  · seed ids already present — skipped');
} else console.log('  · PROFILES seed present or anchor missing — skipped');

fs.writeFileSync(INDEX, html);
console.log('\nApplied. NEXT: node scripts/wire-national-wave23-spotlights-jul2026.mjs --apply, then: node scripts/split-stances.mjs');
