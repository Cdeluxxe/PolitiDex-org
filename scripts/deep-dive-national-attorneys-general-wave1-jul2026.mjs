#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National deep dive: STATE ATTORNEYS GENERAL, WAVE 1 (July 2026)
// ---------------------------------------------------------------------------
// Adds eight sitting state Attorneys General as first-class roster profiles —
// an office under-represented in the roster (most AGs existed only inside
// Spotlights). Balanced 4D / 4R across high-population and litigation-active
// states, each with a stable term through at least 2026:
//
//   DEMOCRATS
//   • WILLIAM TONG (william_tong) — Connecticut AG
//   • PHIL WEISER (phil_weiser) — Colorado AG
//   • NICK BROWN (nick_brown) — Washington AG
//   • ANDREA JOY CAMPBELL (andrea_joy_campbell) — Massachusetts AG
//   REPUBLICANS
//   • TODD ROKITA (todd_rokita) — Indiana AG
//   • TIM GRIFFIN (tim_griffin) — Arkansas AG
//   • AUSTIN KNUDSEN (austin_knudsen) — Montana AG
//   • ALAN WILSON (alan_wilson) — South Carolina AG
//
// CONNECTING THE DOTS: state AGs are the engine of the multistate-litigation
// story — Democratic AGs suing to block federal funding/immigration actions,
// Republican AGs suing over federal rules and defending post-Dobbs laws — which
// ties directly to the Legislation library (H.R. 1, the CRA/waiver measures) and
// the abortion, guns, energy, and federal-power Spotlights.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words. Court- or voter-constrained records are
// marked mixed and attributed. Sources are official state AG offices.
//
// Writes to the CURRENT data layout:
//   • cmp-data.js            — roster/search index entry (JSON)
//   • politician-stances.js  — issue stance cards (then split-stances.mjs)
//   • index.html             — PROFILES seed allow-list
// Idempotent + client-side.
//   node scripts/deep-dive-national-attorneys-general-wave1-jul2026.mjs           # dry run
//   node scripts/deep-dive-national-attorneys-general-wave1-jul2026.mjs --apply   # write
// Then: node scripts/split-stances.mjs
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STANCES = path.join(ROOT, 'politician-stances.js');
const CMP = path.join(ROOT, 'cmp-data.js');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');

const S = {
  ct: { label: 'portal.ct.gov/AG', url: 'https://portal.ct.gov/AG' },
  co: { label: 'coag.gov', url: 'https://coag.gov/' },
  wa: { label: 'atg.wa.gov', url: 'https://www.atg.wa.gov/' },
  ma: { label: 'mass.gov/ago', url: 'https://www.mass.gov/orgs/office-of-attorney-general-andrea-joy-campbell' },
  in: { label: 'in.gov/attorneygeneral', url: 'https://www.in.gov/attorneygeneral/' },
  ar: { label: 'arkansasag.gov', url: 'https://arkansasag.gov/' },
  mt: { label: 'dojmt.gov', url: 'https://dojmt.gov/' },
  sc: { label: 'scag.gov', url: 'https://www.scag.gov/' },
};

const NEW = {
  william_tong: {
    roster: { name: 'William Tong', office: 'State Attorney General', state: 'Connecticut', party: 'D', score: 53, icon: '⚖️', issues: ['Multistate Litigation', 'Consumer Protection', 'Gun Safety', 'Abortion Rights'] },
    label: 'William Tong — ⚖️ Connecticut Attorney General (D)',
    cards: [
      { topic: 'Multistate Litigation', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Has joined or led dozens of multistate lawsuits challenging Trump-administration actions on federal funding, immigration, and agency authority — part of the Democratic AGs’ coordinated check on executive power.',
        evidence: 'Connecticut Attorney General since 2019; the first Asian American elected to statewide office in Connecticut.', source: S.ct },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Pursued opioid, utility-rate, and price-gouging cases and settlements on behalf of Connecticut consumers.', source: S.ct },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Defends Connecticut’s assault-weapons and high-capacity-magazine laws in court.', source: S.ct },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Backs Connecticut’s protections for abortion access and its shield law for providers.', source: S.ct },
    ],
  },
  phil_weiser: {
    roster: { name: 'Phil Weiser', office: 'State Attorney General', state: 'Colorado', party: 'D', score: 53, icon: '⚖️', issues: ['Antitrust', 'Multistate Litigation', 'Opioids', 'Gun Safety'] },
    label: 'Phil Weiser — ⚖️ Colorado Attorney General (D)',
    cards: [
      { topic: 'Antitrust & Consumers', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'A former law-school dean and U.S. Justice Department antitrust official, Weiser has centered antitrust and consumer-protection enforcement.',
        evidence: 'Colorado Attorney General since 2019; a 2026 candidate for governor.', source: S.co },
      { topic: 'Multistate Litigation', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Joined multistate suits over federal funding freezes and environmental and consumer-rule rollbacks.', source: S.co },
      { topic: 'Opioids', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Directed Colorado’s share of national opioid settlements toward treatment and recovery programs.', source: S.co },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Defends Colorado’s firearm laws, including measures enacted after mass shootings in the state.', source: S.co },
    ],
  },
  nick_brown: {
    roster: { name: 'Nick Brown', office: 'State Attorney General', state: 'Washington', party: 'D', score: 53, icon: '⚖️', issues: ['Multistate Litigation', 'Consumer Protection', 'Immigration', 'Abortion Rights'] },
    label: 'Nick Brown — ⚖️ Washington Attorney General (D)',
    cards: [
      { topic: 'Multistate Litigation', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Since taking office in 2025 has joined numerous multistate suits challenging Trump-administration actions on federal funding, immigration, and cuts to the federal workforce.',
        evidence: 'Washington Attorney General since January 2025; a former U.S. Attorney, succeeding Bob Ferguson.', source: S.wa },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Continues Washington’s aggressive consumer-protection and antitrust docket.', source: S.wa },
      { topic: 'Immigration', icon: '🌐', pos: 'mixed', issueKey: 'immig_balance', issueStance: 'mixed',
        text: 'Backs legal challenges to federal immigration-enforcement actions affecting Washington residents and institutions.', source: S.wa },
      { topic: 'Abortion Rights', icon: '⚖️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: 'Defends Washington’s abortion-access protections, including for medication abortion.', source: S.wa },
    ],
  },
  andrea_joy_campbell: {
    roster: { name: 'Andrea Joy Campbell', office: 'State Attorney General', state: 'Massachusetts', party: 'D', score: 53, icon: '⚖️', issues: ['Multistate Litigation', 'Consumer Protection', 'Housing', 'Gun Safety'] },
    label: 'Andrea Joy Campbell — ⚖️ Massachusetts Attorney General (D)',
    cards: [
      { topic: 'Multistate Litigation', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Has led or joined multistate suits challenging federal funding cuts and policy changes affecting Massachusetts.',
        evidence: 'Massachusetts Attorney General since 2023; the first Black woman elected to statewide office in Massachusetts.', source: S.ma },
      { topic: 'Consumer Protection', icon: '🛡', pos: 'support', issueKey: 'econ_corp_account', issueStance: 'support',
        text: 'Pursues consumer-protection, student-debt, and data-privacy enforcement.', source: S.ma },
      { topic: 'Housing', icon: '🏗', pos: 'support', issueKey: 'housing_build', issueStance: 'support',
        text: 'Issued guidance and enforcement supporting the state’s zoning-reform and tenant-protection laws.', source: S.ma },
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Enforces and defends Massachusetts’ strict firearm laws.', source: S.ma },
    ],
  },
  todd_rokita: {
    roster: { name: 'Todd Rokita', office: 'State Attorney General', state: 'Indiana', party: 'R', score: 53, icon: '⚖️', issues: ['Federal Pushback', 'Abortion', 'Big Tech', 'Election Integrity'] },
    label: 'Todd Rokita — ⚖️ Indiana Attorney General (R)',
    cards: [
      { topic: 'Federal Pushback', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Joined Republican-led multistate suits against Biden-era federal rules and has backed Trump-administration legal positions.',
        evidence: 'Indiana Attorney General since 2021; a former U.S. Representative and Indiana Secretary of State.', source: S.in },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Defends Indiana’s near-total abortion ban enacted after the Dobbs decision.', source: S.in },
      { topic: 'Big Tech', icon: '💻', pos: 'mixed', issueKey: 'tech_balance', issueStance: 'mixed',
        text: 'Brought consumer and antitrust-style actions against large technology and pharmaceutical companies.', source: S.in },
      { topic: 'Election Integrity', icon: '🗳', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Backs tighter voter-eligibility and election-administration enforcement.', source: S.in },
    ],
  },
  tim_griffin: {
    roster: { name: 'Tim Griffin', office: 'State Attorney General', state: 'Arkansas', party: 'R', score: 53, icon: '⚖️', issues: ['Federal Pushback', 'Energy', 'Public Safety', 'Abortion'] },
    label: 'Tim Griffin — ⚖️ Arkansas Attorney General (R)',
    cards: [
      { topic: 'Federal Pushback', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Joined Republican-led multistate suits against federal rules on energy, firearms, and immigration.',
        evidence: 'Arkansas Attorney General since 2023; a former U.S. Representative and lieutenant governor.', source: S.ar },
      { topic: 'Energy', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Challenged federal limits on oil and gas and backs Arkansas energy production.', source: S.ar },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Prioritizes violent-crime and fentanyl enforcement.', source: S.ar },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Defends Arkansas’s abortion restrictions.', source: S.ar },
    ],
  },
  austin_knudsen: {
    roster: { name: 'Austin Knudsen', office: 'State Attorney General', state: 'Montana', party: 'R', score: 53, icon: '⚖️', issues: ['Federal Pushback', 'Gun Rights', 'Energy', 'Abortion'] },
    label: 'Austin Knudsen — ⚖️ Montana Attorney General (R)',
    cards: [
      { topic: 'Federal Pushback', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'A frequent litigant against federal environmental and firearm rules, joining Republican-led multistate suits.',
        evidence: 'Montana Attorney General since 2021; a former Speaker of the Montana House.', source: S.mt },
      { topic: 'Gun Rights', icon: '🔫', pos: 'support', issueKey: 'gun_rights', issueStance: 'support',
        text: 'Defends gun rights and has challenged federal firearm regulations in court.', source: S.mt },
      { topic: 'Energy & Public Lands', icon: '🛢', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: 'Backs Montana coal, oil, and gas against federal restrictions.', source: S.mt },
      { topic: 'Abortion', icon: '🕊', pos: 'mixed', issueKey: 'pro_life', issueStance: 'mixed',
        text: 'Defends abortion restrictions, though Montana courts have blocked several under the state constitution’s privacy protections.', source: S.mt },
    ],
  },
  alan_wilson: {
    roster: { name: 'Alan Wilson', office: 'State Attorney General', state: 'South Carolina', party: 'R', score: 53, icon: '⚖️', issues: ['Federal Pushback', 'Abortion', 'Public Safety', 'Election Integrity'] },
    label: 'Alan Wilson — ⚖️ South Carolina Attorney General (R)',
    cards: [
      { topic: 'Federal Pushback', icon: '⚖️', pos: 'mixed', issueKey: 'gov_balance', issueStance: 'mixed',
        text: 'Joined Republican-led multistate suits against federal rules and defends South Carolina statutes in court.',
        evidence: 'South Carolina Attorney General since 2011; a 2026 candidate for governor.', source: S.sc },
      { topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Defended South Carolina’s roughly six-week abortion ban, which the state supreme court upheld.', source: S.sc },
      { topic: 'Public Safety', icon: '🚔', pos: 'support', issueKey: 'tough_on_crime', issueStance: 'support',
        text: 'Emphasizes violent-crime, fentanyl, and human-trafficking prosecution.', source: S.sc },
      { topic: 'Election Integrity', icon: '🗳', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
        text: 'Backs election-security measures and defended the state’s election laws.', source: S.sc },
    ],
  },
};

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

console.log(`PolitiDex — National state Attorneys General WAVE 1  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);

// ── stance arrays (politician-stances.js) ────────────────────────────────────
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const stanceToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
// ── roster rows (cmp-data.js) ────────────────────────────────────────────────
const cmpRaw = fs.readFileSync(CMP, 'utf8');
const cmpToAdd = Object.keys(NEW).filter((id) => !new RegExp(`"${id}"\\s*:`).test(cmpRaw));
// ── PROFILES seed (index.html) ───────────────────────────────────────────────
let html = fs.readFileSync(INDEX, 'utf8');

for (const id of Object.keys(NEW)) {
  console.log(`  ${stanceToAdd.includes(id) ? '→ CREATE' : '· exists '} ${id.padEnd(22)} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);
}

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

// 1) stance cards
let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (stanceToAdd.length) {
  const block = '\n    // ── National — state Attorneys General (CT · CO · WA · MA · IN · AR · MT · SC) · AG wave 1 (Jul 2026) ─\n' +
    stanceToAdd.map((id) => `    ${id}: [ // ${NEW[id].label}\n${NEW[id].cards.map(cardStr).join('\n')}\n    ],`).join('\n');
  stances = stances.replace(stanceAnchor, block + stanceAnchor);
  fs.writeFileSync(STANCES, stances);
  console.log(`  ✎ appended ${stanceToAdd.length} stance array(s) → politician-stances.js`);
} else console.log('  · stance arrays present — skipped');

// 2) roster rows → cmp-data.js (the light roster/search index)
if (cmpToAdd.length) {
  const cmpAnchor = 'window.CMP_DATA = window.CMP_DATA || {}),\n{\n';
  if (!cmpRaw.includes(cmpAnchor)) { console.error('✗ cmp-data anchor missing'); process.exit(1); }
  const rows = cmpToAdd.map((id) => {
    const r = NEW[id].roster;
    return ` "${id}": {\n  "name": "${r.name.replace(/"/g, '\\"')}",\n  "office": "${r.office}",\n  "state": "${r.state}",\n  "party": "${r.party}",\n  "score": ${r.score},\n  "kept": 0,\n  "broken": 0,\n  "pending": 0,\n  "icon": "${r.icon}",\n  "issues": [\n${r.issues.map((i) => `   "${i.replace(/"/g, '\\"')}"`).join(',\n')}\n  ]\n },`;
  }).join('\n');
  const cmp = cmpRaw.replace(cmpAnchor, cmpAnchor + '// National — state Attorneys General (AG wave 1, July 2026)\n' + rows + '\n');
  fs.writeFileSync(CMP, cmp);
  console.log(`  ✎ added ${cmpToAdd.length} roster row(s) → cmp-data.js`);
} else console.log('  · roster rows present — skipped');

// 3) PROFILES seed allow-list → index.html
const seedClose = '\n      ].forEach(function (id) {';
if (html.includes(seedClose) && !html.includes('// National AG wave 1 —')) {
  const seedIds = Object.keys(NEW);
  const seedBlock = '\n' +
    "        // National AG wave 1 — state Attorneys General: CT · CO · WA · MA · IN · AR · MT · SC (July 2026)\n" +
    "        " + seedIds.slice(0, 4).map((id) => `'${id}'`).join(', ') + ",\n" +
    "        " + seedIds.slice(4).map((id) => `'${id}'`).join(', ') + ",";
  html = html.replace(seedClose, seedBlock + seedClose);
  fs.writeFileSync(INDEX, html);
  console.log(`  ✎ seeded ${seedIds.length} id(s) into the PROFILES allow-list → index.html`);
} else console.log('  · PROFILES seed present or anchor missing — skipped');

// 4) mirror the new arrays into the shipped long-tail chunk (politician-stances-ext.js).
//    The app loads the split chunks, not the monolith; the committed split-stances.mjs
//    can no longer resolve the accountability set from index.html (ACCT_SPOTLIGHT now
//    lives in acct-spotlight-data.js), so these long-tail (non-accountability) officials
//    are written directly to the EXTENDED chunk in the same JSON the splitter emits.
const EXT = path.join(ROOT, 'politician-stances-ext.js');
let ext = fs.readFileSync(EXT, 'utf8');
const extAnchor = 'var d = {';
const extToAdd = Object.keys(NEW).filter((id) => !ext.includes(`"${id}":[`));
if (extToAdd.length && ext.includes(extAnchor)) {
  const json = extToAdd.map((id) => JSON.stringify(id) + ':' + JSON.stringify(NEW[id].cards)).join(',') + ',';
  ext = ext.replace(extAnchor, extAnchor + json);
  fs.writeFileSync(EXT, ext);
  console.log(`  ✎ mirrored ${extToAdd.length} entry(ies) → politician-stances-ext.js`);
} else console.log('  · ext entries present or anchor missing — skipped');

console.log('\nApplied.');
