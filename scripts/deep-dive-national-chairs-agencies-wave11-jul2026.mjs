#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — National (federal) deep dive: REMAINING COMMITTEE CHAIRS,
// REGULATORY-AGENCY CHAIRS, CAMPAIGN LEADERS & INFLUENTIAL MEMBERS, WAVE 11
// (July 2026) — continuing the top-down push after waves 1-10.
// ---------------------------------------------------------------------------
// Waves 1-10 built the President/VP, the leadership and whips, most committee
// chairs and ranking members, the Cabinet, the diplomacy/economic principals,
// and much of both parties' membership. This wave adds the highest-leverage
// figures still missing — two remaining House committee chairs, two powerful
// regulatory-agency chairs that drive the crypto/AI/tech Spotlights, the two
// parties' campaign-committee chairs, and influential senators and a
// representative from both parties — each mapped to the recent Issue Spotlights:
//
//   • STEVE DAINES (daines) — U.S. Senator (R-MT), NRSC Chair: energy and mining,
//     China trade, spending, and public lands.
//   • TIM WALBERG (walberg) — House Education & Workforce Chair (R-MI): the
//     Education Department, school choice, higher-ed reform, and labor.
//   • ANDREW GARBARINO (garbarino) — House Homeland Security Chair (R-NY):
//     cybersecurity and homeland security, the border, SALT, and resilience.
//   • PAUL ATKINS (paul_atkins) — SEC Chair: digital assets/crypto rules, capital
//     markets and deregulation, investor rules, and ESG disclosure.
//   • BRENDAN CARR (brendan_carr) — FCC Chair: broadband, Big Tech and Section
//     230, spectrum and AI, and deregulation.
//   • SUZAN DeLBENE (delbene) — U.S. Rep. (D-WA), DCCC Chair: tech and AI, trade,
//     data privacy, and healthcare.
//   • ANDY KIM (andy_kim) — U.S. Senator (D-NJ): a diplomacy-first foreign policy,
//     government reform, Israel/Gaza, and healthcare.
//   • MAZIE HIRONO (hirono) — U.S. Senator (D-HI): the judiciary and courts,
//     immigration, reproductive rights, and veterans.
//   • JACKY ROSEN (rosen) — U.S. Senator (D-NV): tech and AI, Israel, clean
//     energy, and healthcare.
//   • DAN GOLDMAN (dan_goldman) — U.S. Rep. (D-NY): oversight and the rule of law,
//     gun safety, Israel, and democracy.
//
// HONESTY (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md): every card is about the
// INDIVIDUAL's own act, role, or words — never their party. Contested and
// two-sided records (deregulation and investor safeguards, Section 230, tariffs
// vs. retaliation, conditions on Israel aid, SALT) are marked mixed and
// attributed to both sides. Positions are the documented public record; quotes
// only where genuinely on the record, otherwise paraphrased. Sources are official
// agency/member/committee pages.
//
// CLIENT-side and idempotent.
//   node scripts/deep-dive-national-chairs-agencies-wave11-jul2026.mjs            # dry run
//   node scripts/deep-dive-national-chairs-agencies-wave11-jul2026.mjs --apply    # write
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
  daines:    { label: 'daines.senate.gov', url: 'https://www.daines.senate.gov/news/press-releases' },
  walberg:   { label: 'walberg.house.gov', url: 'https://walberg.house.gov/media/press-releases' },
  eduwork:   { label: 'House Education & the Workforce Committee', url: 'https://edworkforce.house.gov/' },
  garbarino: { label: 'garbarino.house.gov', url: 'https://garbarino.house.gov/media/press-releases' },
  homeland:  { label: 'House Homeland Security Committee', url: 'https://homeland.house.gov/' },
  sec:       { label: 'U.S. Securities & Exchange Commission', url: 'https://www.sec.gov/' },
  fcc:       { label: 'Federal Communications Commission', url: 'https://www.fcc.gov/' },
  delbene:   { label: 'delbene.house.gov', url: 'https://delbene.house.gov/news/documentquery.aspx?DocumentTypeID=2508' },
  kim:       { label: 'kim.senate.gov', url: 'https://www.kim.senate.gov/newsroom/press-releases' },
  hirono:    { label: 'hirono.senate.gov', url: 'https://www.hirono.senate.gov/news/press-releases' },
  rosen:     { label: 'rosen.senate.gov', url: 'https://www.rosen.senate.gov/category/press-releases/' },
  goldman:   { label: 'goldman.house.gov', url: 'https://goldman.house.gov/media/press-releases' },
};

const NEW = {
  daines: {
    roster: { name: 'Steve Daines', office: 'U.S. Senator', state: 'Montana', party: 'R', score: 56, icon: '🏔', issues: ['Energy & Mining', 'Trade & China', 'Spending', 'Public Lands'] },
    label: 'Steve Daines — 🏔 U.S. Senator (R-MT)',
    cards: [
      { topic: 'Energy & Mining', icon: '⛏', pos: 'support', issueKey: 'energy_production', issueStance: 'support',
        text: "On the Finance Committee and chair of the Senate Republicans' campaign arm, Daines backs expanded oil, gas, coal, and critical-minerals production and permitting reform for Montana.",
        evidence: 'Member of the Senate Finance Committee; Chair of the NRSC.', source: S.daines },
      { topic: 'Trade & China', icon: '🇨🇳', pos: 'mixed', issueKey: 'tariffs_china', issueStance: 'mixed',
        text: "Supports pressuring China on trade while warning that retaliation can hit Montana agriculture — he has personally cultivated market access in Beijing for Montana beef.", source: S.daines },
      { topic: 'Spending & Taxes', icon: '🧾', pos: 'support', issueKey: 'national_debt', issueStance: 'support',
        text: "A fiscal conservative who backs spending restraint, reducing the debt, and making the 2017 tax cuts permanent.", source: S.daines },
      { topic: 'Public Lands', icon: '🏞', pos: 'support', issueKey: 'lands_energy', issueStance: 'support',
        text: "Supports multiple-use of public lands — energy, grazing, timber, and recreation — and opposes large new federal restrictions.", source: S.daines },
    ],
  },
  walberg: {
    roster: { name: 'Tim Walberg', office: 'House Education & Workforce Chair', state: 'Michigan', party: 'R', score: 55, icon: '🎓', issues: ['Education', 'School Choice', 'Higher-Ed Reform', 'Labor'] },
    label: 'Tim Walberg — 🎓 House Education & Workforce Chair (R-MI)',
    cards: [
      { topic: 'Education & the Department', icon: '🏛', pos: 'mixed', issueKey: 'edu_balance', issueStance: 'mixed',
        text: "Chair of the House Education & the Workforce Committee, Walberg backs returning education decisions to states and parents and supports downsizing the federal Education Department — a goal critics warn about for civil-rights and funding oversight.",
        evidence: 'Chair of the House Committee on Education & the Workforce.', source: S.eduwork },
      { topic: 'School Choice', icon: '🎒', pos: 'support', issueKey: 'school_choice', issueStance: 'support',
        text: "A strong advocate for school choice, charter schools, and parental rights in education.", source: S.walberg },
      { topic: 'Higher-Ed & Student Loans', icon: '🎓', pos: 'support', issueKey: 'edu_college_cost', issueStance: 'support',
        text: "Pushes college accountability, price transparency, and limits on federal loan costs over broad forgiveness.", source: S.walberg },
      { topic: 'Labor & Workforce', icon: '🧰', pos: 'mixed', issueKey: 'econ_workers', issueStance: 'mixed',
        text: "Oversees federal labor policy, favoring employer flexibility and apprenticeships and criticizing some union-favoring rules.", source: S.eduwork },
    ],
  },
  garbarino: {
    roster: { name: 'Andrew Garbarino', office: 'House Homeland Security Chair', state: 'New York', party: 'R', score: 57, icon: '🛡', issues: ['Cybersecurity', 'Border', 'SALT', 'Resilience'] },
    label: 'Andrew Garbarino — 🛡 House Homeland Security Chair (R-NY)',
    cards: [
      { topic: 'Cybersecurity & Homeland Security', icon: '🔐', pos: 'support', issueKey: 'strong_defense', issueStance: 'support',
        text: "Chair of the House Homeland Security Committee, Garbarino focuses on cybersecurity, critical-infrastructure defense, and oversight of CISA.",
        evidence: 'Chair of the House Committee on Homeland Security.', source: S.homeland },
      { topic: 'Border Security', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support',
        text: "Oversees border and immigration-enforcement policy, backing more technology, agents, and fentanyl interdiction.", source: S.homeland },
      { topic: 'SALT Deduction', icon: '🏠', pos: 'mixed', issueKey: 'lower_taxes', issueStance: 'mixed',
        text: "From New York, a leading advocate for restoring the state-and-local-tax (SALT) deduction, at times bucking his party in tax fights.", source: S.garbarino },
      { topic: 'Disaster & Resilience', icon: '🌊', pos: 'support', issueKey: 'disaster_resilience', issueStance: 'support',
        text: "Works on disaster preparedness and resilience for coastal New York communities.", source: S.garbarino },
    ],
  },
  paul_atkins: {
    roster: { name: 'Paul Atkins', office: 'SEC Chair', state: 'Federal', party: 'R', score: 55, icon: '📊', issues: ['Digital Assets', 'Capital Markets', 'Deregulation', 'ESG Rules'] },
    label: 'Paul Atkins — 📊 Chair, Securities & Exchange Commission',
    cards: [
      { topic: 'Digital Assets & Crypto', icon: '🪙', pos: 'support', issueKey: 'crypto_cbdc', issueStance: 'support',
        text: "As SEC chair, Atkins has shifted the agency toward clearer, lighter-touch rules for digital assets and away from regulation-by-enforcement — a long-sought priority for the crypto industry.",
        evidence: 'Chair of the U.S. Securities and Exchange Commission.', source: S.sec },
      { topic: 'Capital Markets & Deregulation', icon: '📈', pos: 'support', issueKey: 'gov_regulation', issueStance: 'support',
        text: "A longtime advocate of lighter regulation, Atkins emphasizes capital formation and reducing compliance costs he views as burdensome.", source: S.sec },
      { topic: 'Investor Protection', icon: '🛡', pos: 'mixed', issueKey: 'econ_corp_account', issueStance: 'mixed',
        text: "Frames investor protection around disclosure and market efficiency rather than expansive mandates — an approach critics say could weaken safeguards.", source: S.sec },
      { topic: 'ESG & Climate Disclosure', icon: '🌫', pos: 'oppose', issueKey: 'enviro_balance', issueStance: 'oppose',
        text: "Has moved to scale back climate and ESG disclosure requirements for public companies.", source: S.sec },
    ],
  },
  brendan_carr: {
    roster: { name: 'Brendan Carr', office: 'FCC Chair', state: 'Federal', party: 'R', score: 54, icon: '📡', issues: ['Broadband', 'Big Tech & 230', 'Spectrum & AI', 'Deregulation'] },
    label: 'Brendan Carr — 📡 Chair, Federal Communications Commission',
    cards: [
      { topic: 'Broadband & Connectivity', icon: '📶', pos: 'support', issueKey: 'broadband', issueStance: 'support',
        text: "As FCC chair, Carr prioritizes closing the digital divide, freeing spectrum, and streamlining infrastructure permitting for broadband and next-generation networks.",
        evidence: 'Chair of the Federal Communications Commission.', source: S.fcc },
      { topic: 'Big Tech & Section 230', icon: '🗣', pos: 'support', issueKey: 'free_speech', issueStance: 'support',
        text: "A critic of Big Tech's content moderation, Carr backs reining in Section 230 protections and what he describes as censorship — an approach critics call a threat to platforms' editorial rights.", source: S.fcc },
      { topic: 'Spectrum & AI', icon: '🤖', pos: 'support', issueKey: 'tech_innovation', issueStance: 'support',
        text: "Pushes freeing spectrum for 5G/6G and satellite broadband and a light-touch approach to spur AI and tech investment.", source: S.fcc },
      { topic: 'Deregulation', icon: '✂️', pos: 'support', issueKey: 'gov_regulation', issueStance: 'support',
        text: "Favors deregulation of the communications sector to spur private investment.", source: S.fcc },
    ],
  },
  delbene: {
    roster: { name: 'Suzan DelBene', office: 'DCCC Chair', state: 'Washington', party: 'D', score: 57, icon: '💻', issues: ['Tech & AI', 'Trade', 'Data Privacy', 'Healthcare'] },
    label: 'Suzan DelBene — 💻 DCCC Chair (D-WA)',
    cards: [
      { topic: 'Tech & AI', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: "The DCCC chair and a former Microsoft executive, DelBene works on AI policy, a national data-privacy standard, and U.S. tech competitiveness.",
        evidence: 'Chair of the DCCC; member of the Ways & Means Committee.', source: S.delbene },
      { topic: 'Trade', icon: '📦', pos: 'mixed', issueKey: 'econ_trade', issueStance: 'mixed',
        text: "On Ways & Means and from trade-dependent Washington, DelBene favors open, rules-based trade and warns broad tariffs raise costs, while backing enforcement against unfair practices.", source: S.delbene },
      { topic: 'Data Privacy', icon: '🔒', pos: 'support', issueKey: 'privacy_rights', issueStance: 'support',
        text: "A lead author of comprehensive federal data-privacy legislation.", source: S.delbene },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: "Supports the ACA, lower drug costs, and expanding coverage.", source: S.delbene },
    ],
  },
  andy_kim: {
    roster: { name: 'Andy Kim', office: 'U.S. Senator', state: 'New Jersey', party: 'D', score: 58, icon: '🕊', issues: ['Foreign Policy', 'Government Reform', 'Israel & Gaza', 'Healthcare'] },
    label: 'Andy Kim — 🕊 U.S. Senator (D-NJ)',
    cards: [
      { topic: 'Foreign Policy', icon: '🌐', pos: 'mixed', issueKey: 'foreign_balance', issueStance: 'mixed',
        text: "A former State Department and national-security official, Kim brings a diplomacy-first view — supporting alliances and aid while emphasizing diplomacy over open-ended military commitment.",
        evidence: 'Former U.S. diplomat and National Security Council official.', source: S.kim },
      { topic: 'Government Reform', icon: '🧹', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: "After challenging New Jersey's ballot-design system in court, Kim ran on cleaning up politics and pushes ethics, transparency, and anti-corruption reforms.", source: S.kim },
      { topic: 'Israel & Gaza', icon: '🇮🇱', pos: 'mixed', issueKey: 'foreign_balance', issueStance: 'mixed',
        text: "Supports Israel's security and aid while calling for humanitarian access and conditions tied to the conduct of the Gaza war.", source: S.kim },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: "Supports the ACA, Medicaid, and lowering health-care and drug costs.", source: S.kim },
    ],
  },
  hirono: {
    roster: { name: 'Mazie Hirono', office: 'U.S. Senator', state: 'Hawaii', party: 'D', score: 57, icon: '⚖️', issues: ['Judiciary & Courts', 'Immigration', 'Reproductive Rights', 'Veterans'] },
    label: 'Mazie Hirono — ⚖️ U.S. Senator (D-HI)',
    cards: [
      { topic: 'Judiciary & Courts', icon: '⚖️', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: "On the Judiciary Committee, Hirono is an outspoken scrutinizer of judicial nominees and a defender of an independent judiciary and civil rights.",
        evidence: 'Member of the Senate Judiciary Committee.', source: S.hirono },
      { topic: 'Immigration', icon: '🛂', pos: 'support', issueKey: 'immigration_reform', issueStance: 'support',
        text: "An immigrant herself, Hirono backs a path to citizenship and protections for Dreamers and opposes mass deportation.", source: S.hirono },
      { topic: 'Reproductive Rights', icon: '⚕️', pos: 'support', issueKey: 'pro_choice', issueStance: 'support',
        text: "A leading advocate for codifying abortion rights and protecting access.", source: S.hirono },
      { topic: 'Veterans & Defense', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: "On Armed Services and Veterans' Affairs, focuses on military families, veterans, and the Indo-Pacific.", source: S.hirono },
    ],
  },
  rosen: {
    roster: { name: 'Jacky Rosen', office: 'U.S. Senator', state: 'Nevada', party: 'D', score: 58, icon: '💻', issues: ['Tech & AI', 'Israel', 'Clean Energy', 'Healthcare'] },
    label: 'Jacky Rosen — 💻 U.S. Senator (D-NV)',
    cards: [
      { topic: 'Tech & AI', icon: '🤖', pos: 'support', issueKey: 'tech_balance', issueStance: 'support',
        text: "A former computer programmer, Rosen co-leads bipartisan AI efforts, backing workforce training, guardrails, and U.S. tech competitiveness.",
        evidence: 'A leader of bipartisan Senate AI efforts.', source: S.rosen },
      { topic: 'Israel', icon: '🇮🇱', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: "A strongly pro-Israel Democrat, Rosen supports U.S. military aid and the alliance and has led efforts against antisemitism.", source: S.rosen },
      { topic: 'Clean Energy', icon: '🌱', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: "From Nevada, backs solar, geothermal, and clean-energy jobs and grid investment.", source: S.rosen },
      { topic: 'Healthcare', icon: '⚕️', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: "Supports the ACA, lowering drug costs, and protecting Medicaid.", source: S.rosen },
    ],
  },
  dan_goldman: {
    roster: { name: 'Dan Goldman', office: 'U.S. Representative', state: 'New York', party: 'D', score: 56, icon: '🔎', issues: ['Oversight & Rule of Law', 'Gun Safety', 'Israel', 'Democracy'] },
    label: 'Dan Goldman — 🔎 U.S. Representative (D-NY)',
    cards: [
      { topic: 'Oversight & Rule of Law', icon: '⚖️', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: "A former federal prosecutor who was lead counsel in the first Trump impeachment, Goldman focuses on oversight, the rule of law, and checks on executive power.",
        evidence: 'Member of the House Judiciary and Oversight Committees.', source: S.goldman },
      { topic: 'Gun Safety', icon: '🔫', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: "A strong advocate for gun-safety laws, including assault-weapons restrictions and background checks.", source: S.goldman },
      { topic: 'Israel', icon: '🇮🇱', pos: 'support', issueKey: 'foreign_balance', issueStance: 'support',
        text: "A pro-Israel Democrat who supports U.S. aid and the alliance while backing humanitarian assistance to Gaza.", source: S.goldman },
      { topic: 'Democracy & Elections', icon: '🗳', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: "Focuses on protecting elections, voting access, and democratic institutions.", source: S.goldman },
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

console.log(`PolitiDex — National chairs, agency chairs, campaign leaders & members WAVE 11  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
const stancesRaw = fs.readFileSync(STANCES, 'utf8');
const newToAdd = Object.keys(NEW).filter((id) => !new RegExp(`\\n    ${id}: \\[`).test(stancesRaw));
for (const id of Object.keys(NEW)) console.log(`  ${newToAdd.includes(id) ? '→ CREATE ' : '· exists '} ${id} (${NEW[id].roster.name}) · +${NEW[id].cards.length} card(s)`);

if (!APPLY) { console.log('\nDry run. Re-run with --apply, then: node scripts/split-stances.mjs'); process.exit(0); }

let stances = stancesRaw;
const stanceAnchor = '\n    };\n\n})();';
if (!stances.includes(stanceAnchor)) { console.error('✗ stance anchor missing'); process.exit(1); }
if (newToAdd.length) {
  const block = '\n    // ── National remaining chairs, regulatory-agency chairs, campaign leaders & members · top-down federal wave 11 (Jul 2026) ─\n' +
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
  const block = '\n    // National — remaining chairs, regulatory-agency chairs, campaign leaders + members, wave 11 (July 2026).\n' + rosterRows.join('\n');
  html = html.replace(rosterMarker, rosterMarker + block);
  fs.writeFileSync(INDEX, html);
  console.log(`  ✎ added ${rosterRows.length} CMP_DATA roster row(s)`);
} else console.log('  · roster rows present or marker missing — skipped');

console.log('\nApplied. NEXT: wire standsOnIssue, then: node scripts/split-stances.mjs');
