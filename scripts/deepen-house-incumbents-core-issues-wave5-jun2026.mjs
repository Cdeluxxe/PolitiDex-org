#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — federal U.S. House incumbent CORE-ISSUE deepening pass, WAVE 5
// (June 2026)
//
// PURPOSE
//   Continues the Core National Issues effort (CORE_NATIONAL_ISSUES.md,
//   scripts/define-core-national-issues-jun2026.mjs). Wave 4 lifted the whole
//   sitting-House roster we carry (38 members) toward STRONG coverage using six
//   119th-Congress roll calls that, together, span SEVEN of the ten core issues.
//   The three the wave-4 bills never touched were exactly the hardest to source:
//   Healthcare (#3), Gun Rights (#6) and Education & Parental Rights (#10).
//
//   This wave fills two of those three with NEW, individually-verified passage
//   votes, pushing most of the roster from ~7-8/10 toward 9-10/10:
//     • Education & Parental Rights — H.R. 28
//     • Healthcare Costs & Access   — H.R. 6703 and H.R. 2483
//
//   GUN RIGHTS IS LEFT BLANK ON PURPOSE. A full scan of all 362 clerk roll-call
//   XML files for 2025 (firearm|conceal|gun|suppressor|pistol|ATF|NFA|Second
//   Amendment|H.R.38) returned ZERO recorded votes of any kind: no standalone
//   gun passage, no CRA, no amendment. H.R. 38 (concealed-carry reciprocity) was
//   reported out of committee but never reached the floor in 2025, and the
//   Hearing Protection Act was folded silently into H.R. 1. Per CONTENT_STYLE.md
//   and the project quality rule — only add a stance that can be clearly sourced —
//   no gun card is fabricated. Gun coverage stays at whatever each member already
//   carries from prior, individually-sourced work.
//
// METHOD — official record, member by member (no inference, no batching)
//   Every vote below was read directly from the Office of the Clerk's
//   machine-readable roll-call XML (clerk.house.gov/evs/2025/rollNNN.xml), matched
//   to each member by Bioguide ID (resolved from state + clerk sort-field, then
//   the member's own vote pulled by that Bioguide ID). A member receives a card
//   for a roll call ONLY when that member is recorded Yea or Nay; "Not Voting" and
//   "Present" are skipped for that bill. Each card states THAT member's individual
//   recorded vote as a plain fact — the count and roll-call number — keyed to one
//   ISSUE_MAP issueKey. Nothing is described as a "party-line" vote; no vote is
//   shared as a single item across members (CONTENT_STYLE.md).
//
//   A card is added ONLY when its Core National Issue is not yet covered for that
//   member (coverage is computed LIVE from index.html on every run, after wave 4).
//   That makes the pass idempotent and guarantees every addition lights up a NEW
//   core issue in the "X/10 core issues" footprint.
//
// THE THREE VERIFIED ROLL CALLS (119th Congress, 1st session, 2025)
//   • Protection of Women and Girls in Sports Act (H.R. 28) — On Passage,
//     218–206, Jan 14 2025, Roll Call 12. Amends Title IX to base eligibility for
//     school/college athletics designated for women or girls on sex at birth.
//                                                  → Education & Parental Rights
//   • Lower Health Care Premiums for All Americans Act (H.R. 6703) — On Passage,
//     216–211, Dec 17 2025, Roll Call 349. Expands association/individual-coverage
//     health-plan options and adds pharmacy-benefit-manager transparency.
//                                                  → Healthcare Costs & Access
//   • SUPPORT for Patients and Communities Reauthorization Act (H.R. 2483) —
//     On Passage, 366–57, Jun 4 2025, Roll Call 151. Reauthorizes federal opioid
//     and substance-use-disorder treatment and prevention programs. (Yea only — a
//     no vote on a near-unanimous reauthorization is ambiguous and is not used to
//     impute a healthcare stance.)
//                                                  → Healthcare Costs & Access
//
//   node scripts/deepen-house-incumbents-core-issues-wave5-jun2026.mjs              # dry run + issueKey validation + coverage report
//   node scripts/deepen-house-incumbents-core-issues-wave5-jun2026.mjs --write-html # idempotently splice into index.html
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'fs';

const WRITE_HTML = process.argv.includes('--write-html');
const HTML = 'index.html';

// ── Each member's recorded vote on the three roll calls ──────────────────────
// Read from the Clerk's roll-call XML and matched by Bioguide ID. Values are the
// member's own recorded vote: Yea / Nay / NV (Not Voting) / Present.
//   edu      = H.R. 28   (Roll Call 12)
//   premiums = H.R. 6703 (Roll Call 349)
//   support  = H.R. 2483 (Roll Call 151)
const MATRIX = {
  mike_simpson:{edu:'Yea',premiums:'Yea',support:'NV'},
  russ_fulcher:{edu:'Yea',premiums:'Yea',support:'Yea'},
  gabe_vasquez:{edu:'Nay',premiums:'Nay',support:'Yea'},
  julie_fedorchak:{edu:'Yea',premiums:'Yea',support:'Yea'},
  troy_downing:{edu:'Yea',premiums:'Yea',support:'Yea'},
  mike_flood:{edu:'Yea',premiums:'Yea',support:'Yea'},
  melanie_stansbury:{edu:'Nay',premiums:'Nay',support:'Yea'},
  teresa_leger_fernandez:{edu:'Nay',premiums:'Nay',support:'Yea'},
  chellie_pingree:{edu:'Nay',premiums:'Nay',support:'Nay'},
  adrian_smith:{edu:'Yea',premiums:'Yea',support:'Yea'},
  zach_nunn:{edu:'Yea',premiums:'Yea',support:'Yea'},
  dina_titus:{edu:'Nay',premiums:'Nay',support:'Yea'},
  susie_lee:{edu:'Nay',premiums:'Nay',support:'Yea'},
  steven_horsford:{edu:'Nay',premiums:'Nay',support:'Yea'},
  don_davis:{edu:'Present',premiums:'Nay',support:'Yea'},
  rob_bresnahan:{edu:'Yea',premiums:'Yea',support:'Yea'},
  mariannette_miller_meeks:{edu:'Yea',premiums:'Yea',support:'NV'},
  ryan_mackenzie:{edu:'Yea',premiums:'Yea',support:'Yea'},
  josh_brecheen:{edu:'Yea',premiums:'Yea',support:'Nay'},
  mike_ezell:{edu:'Yea',premiums:'Yea',support:'Yea'},
  michael_guest:{edu:'Yea',premiums:'Yea',support:'Yea'},
  trent_kelly:{edu:'Yea',premiums:'Yea',support:'Yea'},
  bruce_westerman:{edu:'Yea',premiums:'Yea',support:'Yea'},
  steve_womack:{edu:'Yea',premiums:'NV',support:'Yea'},
  scott_perry:{edu:'Yea',premiums:'Yea',support:'Nay'},
  stephanie_bice:{edu:'Yea',premiums:'Yea',support:'Yea'},
  tom_cole:{edu:'Yea',premiums:'Yea',support:'Yea'},
  french_hill:{edu:'Yea',premiums:'Yea',support:'Yea'},
  frank_lucas:{edu:'Yea',premiums:'Yea',support:'Yea'},
  bennie_thompson:{edu:'Nay',premiums:'Nay',support:'Nay'},
  rick_crawford:{edu:'Yea',premiums:'Yea',support:'Yea'},
  owens:{edu:'Yea',premiums:'Yea',support:'Yea'},
  massie:{edu:'Yea',premiums:'Nay',support:'Nay'},
  maloy:{edu:'Yea',premiums:'Yea',support:'Yea'},
  bmoore:{edu:'Yea',premiums:'Yea',support:'Yea'},
  mtg:{edu:'Yea',premiums:'Yea',support:'Nay'},
  boebert:{edu:'Yea',premiums:'Yea',support:'Nay'},
  kennedy:{edu:'Yea',premiums:'Yea',support:'Yea'},
};

// Display surname for facts/headlines (the individual, never the party).
const NAME = {
  mike_simpson:'Simpson', russ_fulcher:'Fulcher', gabe_vasquez:'Vasquez', julie_fedorchak:'Fedorchak',
  troy_downing:'Downing', mike_flood:'Flood', melanie_stansbury:'Stansbury', teresa_leger_fernandez:'Leger Fernández',
  chellie_pingree:'Pingree', adrian_smith:'Smith', zach_nunn:'Nunn', dina_titus:'Titus',
  susie_lee:'Lee', steven_horsford:'Horsford', don_davis:'Davis', rob_bresnahan:'Bresnahan',
  mariannette_miller_meeks:'Miller-Meeks', ryan_mackenzie:'Mackenzie', josh_brecheen:'Brecheen', mike_ezell:'Ezell',
  michael_guest:'Guest', trent_kelly:'Kelly', bruce_westerman:'Westerman', steve_womack:'Womack',
  scott_perry:'Perry', stephanie_bice:'Bice', tom_cole:'Cole', french_hill:'Hill',
  frank_lucas:'Lucas', bennie_thompson:'Thompson', rick_crawford:'Crawford', owens:'Owens',
  massie:'Massie', maloy:'Maloy', bmoore:'Moore', mtg:'Greene', boebert:'Boebert', kennedy:'Kennedy',
};

// ── Verified roll-call sources ───────────────────────────────────────────────
const CLERK = {
  edu:      'https://clerk.house.gov/Votes/202512',
  premiums: 'https://clerk.house.gov/Votes/2025349',
  support:  'https://clerk.house.gov/Votes/2025151',
};

// ── Per-vote, per-direction card builders ────────────────────────────────────
// Each returns { core, stance, spotlight } or null. `core` is the Core National
// Issue this card lights up; the splicer only keeps it if that core is new for
// the member. Text is the neutral, record-based fact — never a motive or a party.
const B = {
  // Education & Parental Rights — Protection of Women and Girls in Sports Act
  edu: (n, v) => v === 'Yea'
    ? { core: 'Education & Parental Rights',
        stance: { topic:'Education & Parental Rights', icon:'👪', pos:'support', issueKey:'edu_parental', issueStance:'support',
          text:'Voted for the Protection of Women and Girls in Sports Act (H.R. 28), which would amend Title IX so that eligibility for school and college athletic programs designated for women or girls is based on sex at birth; it passed the House 218–206 on January 14, 2025.',
          evidence:'Recorded a yes vote on H.R. 28, Roll Call 12, January 14, 2025.', source:{label:'House Clerk', url:CLERK.edu} },
        spotlight: { impact:'neutral', category:'voting', date:'2025', tags:['Notable Actions'], issueKey:'edu_parental',
          headline:'Voted for the Protection of Women and Girls in Sports Act',
          facts:`${n} voted yes on the Protection of Women and Girls in Sports Act (H.R. 28), which would amend Title IX so that eligibility for school and college athletic programs designated for women or girls is based on sex at birth; it passed the House 218–206 on January 14, 2025 (Roll Call 12).`,
          why:'A recorded vote on a high-profile schools-and-Title-IX bill is part of the member’s own record.', source:{label:'House Clerk', url:CLERK.edu} } }
    : { core: 'Education & Parental Rights',
        stance: { topic:'Education', icon:'⚖️', pos:'support', issueKey:'edu_balance', issueStance:'support',
          text:'Voted no on the Protection of Women and Girls in Sports Act (H.R. 28), which would amend Title IX so that eligibility for school and college athletic programs designated for women or girls is based on sex at birth; it passed the House 218–206 on January 14, 2025 (Roll Call 12).',
          evidence:'Recorded a no vote on H.R. 28, Roll Call 12, January 14, 2025.', source:{label:'House Clerk', url:CLERK.edu} },
        spotlight: { impact:'neutral', category:'voting', date:'2025', tags:['Notable Actions'], issueKey:'edu_balance',
          headline:'Voted no on the Protection of Women and Girls in Sports Act',
          facts:`${n} voted no on the Protection of Women and Girls in Sports Act (H.R. 28), which would amend Title IX so that eligibility for school and college athletic programs designated for women or girls is based on sex at birth; it passed the House 218–206 on January 14, 2025 (Roll Call 12).`,
          why:'A recorded vote on a high-profile schools-and-Title-IX bill is part of the member’s own record.', source:{label:'House Clerk', url:CLERK.edu} } },

  // Healthcare Costs & Access — Lower Health Care Premiums for All Americans Act
  premiums: (n, v) => v === 'Yea'
    ? { core: 'Healthcare Costs & Access',
        stance: { topic:'Healthcare Costs', icon:'💊', pos:'support', issueKey:'healthcare_market', issueStance:'support',
          text:'Voted for the Lower Health Care Premiums for All Americans Act (H.R. 6703), which expands association and individual-coverage health-plan options and adds pharmacy-benefit-manager transparency requirements; it passed the House 216–211 on December 17, 2025.',
          evidence:'Recorded a yes vote on H.R. 6703, Roll Call 349, December 17, 2025.', source:{label:'House Clerk', url:CLERK.premiums} },
        spotlight: { impact:'neutral', category:'voting', date:'2025', tags:['Notable Actions'], issueKey:'healthcare_market',
          headline:'Voted for the Lower Health Care Premiums for All Americans Act',
          facts:`${n} voted yes on the Lower Health Care Premiums for All Americans Act (H.R. 6703), which expands association and individual-coverage health-plan options and adds pharmacy-benefit-manager transparency requirements; it passed the House 216–211 on December 17, 2025 (Roll Call 349).`,
          why:'A recorded vote on a marquee health-costs bill is part of the member’s own record.', source:{label:'House Clerk', url:CLERK.premiums} } }
    : { core: 'Healthcare Costs & Access',
        stance: { topic:'Healthcare', icon:'⚖️', pos:'support', issueKey:'health_balance', issueStance:'support',
          text:'Voted no on the Lower Health Care Premiums for All Americans Act (H.R. 6703), which would expand association and individual-coverage health-plan options and add pharmacy-benefit-manager transparency requirements; it passed the House 216–211 on December 17, 2025 (Roll Call 349).',
          evidence:'Recorded a no vote on H.R. 6703, Roll Call 349, December 17, 2025.', source:{label:'House Clerk', url:CLERK.premiums} },
        spotlight: { impact:'neutral', category:'voting', date:'2025', tags:['Notable Actions'], issueKey:'health_balance',
          headline:'Voted no on the Lower Health Care Premiums for All Americans Act',
          facts:`${n} voted no on the Lower Health Care Premiums for All Americans Act (H.R. 6703), which would expand association and individual-coverage health-plan options and add pharmacy-benefit-manager transparency requirements; it passed the House 216–211 on December 17, 2025 (Roll Call 349).`,
          why:'A recorded vote on a marquee health-costs bill is part of the member’s own record.', source:{label:'House Clerk', url:CLERK.premiums} } },

  // Healthcare Costs & Access — SUPPORT for Patients and Communities Reauth. (Yea only)
  support: (n, v) => v === 'Yea'
    ? { core: 'Healthcare Costs & Access',
        stance: { topic:'Mental Health & Addiction', icon:'🧠', pos:'support', issueKey:'health_mental', issueStance:'support',
          text:'Voted for the SUPPORT for Patients and Communities Reauthorization Act (H.R. 2483), which reauthorizes federal opioid and substance-use-disorder treatment and prevention programs; it passed the House 366–57 on June 4, 2025.',
          evidence:'Recorded a yes vote on H.R. 2483, Roll Call 151, June 4, 2025.', source:{label:'House Clerk', url:CLERK.support} },
        spotlight: { impact:'neutral', category:'voting', date:'2025', tags:['Notable Actions'], issueKey:'health_mental',
          headline:'Voted for the SUPPORT for Patients and Communities Reauthorization Act',
          facts:`${n} voted yes on the SUPPORT for Patients and Communities Reauthorization Act (H.R. 2483), which reauthorizes federal opioid and substance-use-disorder treatment and prevention programs; it passed the House 366–57 on June 4, 2025 (Roll Call 151).`,
          why:'A recorded vote on the leading addiction-treatment reauthorization is part of the member’s own record.', source:{label:'House Clerk', url:CLERK.support} } }
    : null,
};

// Application order. premiums (H.R. 6703) is the primary Healthcare card; support
// (H.R. 2483) is the fallback for members who missed the 6703 vote but voted yes
// on 2483 — the core is only added once, so whichever fires first wins.
const ORDER = ['edu', 'premiums', 'support'];

// ── Core National Issues framework (for coverage report + new-core gating) ───
const CORE = [
  { label: 'Economy, Inflation & Cost of Living', keys: ['cost_living','tax_middle_class','econ_growth','econ_smallbiz','econ_trade','econ_balance','econ_workers','econ_corp_account','rural_ag','housing_build','housing_support','housing_first_time','property_tax'] },
  { label: 'Immigration & Border Security', keys: ['border_security','immig_legal','immig_balance','immigration_reform','immig_fentanyl'] },
  { label: 'Healthcare Costs & Access', keys: ['healthcare_market','health_drug_prices','health_balance','healthcare','health_mental','health_rural','medical_freedom','social_security'] },
  { label: 'Government Spending, Debt & Waste', keys: ['lower_taxes','gov_waste','gov_balance','national_debt','audit_spending','gov_regulation'] },
  { label: 'Abortion / Reproductive Rights', keys: ['pro_life','repro_balance','pro_choice'] },
  { label: 'Gun Rights & Gun Control', keys: ['gun_rights','gun_balance','gun_safety'] },
  { label: 'Climate Change & Energy Policy', keys: ['climate_action','enviro_energy','enviro_balance','lands_energy','disaster_resilience','water','water_storage'] },
  { label: 'Crime & Public Safety', keys: ['back_police','justice_balance','justice_reform','cannabis_reform'] },
  { label: 'Election Integrity', keys: ['election_integrity','democracy_balance','voting_access'] },
  { label: 'Education & Parental Rights', keys: ['school_choice','edu_balance','public_schools','edu_college_cost','edu_parental'] },
];
const coreFor = (k) => CORE.find(c => c.keys.includes(k)) || null;

// ── Live coverage read (so the pass is idempotent + only adds new cores) ─────
function extractArray(html, sectionStart, id, indent) {
  const anchor = `\n${indent}${id}: [`;
  const at = html.indexOf(anchor, sectionStart);
  if (at === -1) return '';
  const end = html.indexOf(`\n${indent}],`, at);
  return html.slice(at, end === -1 ? html.length : end);
}
function coresForMember(html, id) {
  const stanceStart = html.indexOf('var ISSUE_STANCE_DATA = {');
  const acctStart = html.indexOf('window.ACCT_SPOTLIGHT = window.ACCT_SPOTLIGHT');
  const block = extractArray(html, stanceStart, id, '    ') + '\n' + extractArray(html, acctStart, id, '      ');
  const cores = new Set();
  [...block.matchAll(/issueKey:'([a-z_]+)'/g)].forEach(m => { const c = coreFor(m[1]); if (c) cores.add(c.label); });
  return cores;
}

// Build the per-member additions for the CURRENT html state.
function buildAdditions(html) {
  const plan = [];
  for (const id of Object.keys(MATRIX)) {
    const have = coresForMember(html, id);
    const before = have.size;
    const willAdd = new Set();
    const stances = [], spotlight = [], newCores = [];
    for (const step of ORDER) {
      const vote = MATRIX[id][step];
      if (vote !== 'Yea' && vote !== 'Nay') continue;        // skip NV / Present
      const card = B[step](NAME[id], vote);
      if (!card) continue;
      if (have.has(card.core) || willAdd.has(card.core)) continue; // only NEW cores
      willAdd.add(card.core); newCores.push(card.core);
      if (card.stance) stances.push(card.stance);
      if (card.spotlight) spotlight.push(card.spotlight);
    }
    if (stances.length || spotlight.length)
      plan.push({ id, stances, spotlight, before, newCores });
  }
  return plan;
}

// ── Serialization (match index.html formatting exactly) ──────────────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function fmtSpotlight(s) {
  const tags = (s.tags || []).map(t => `'${esc(t)}'`).join(',');
  return [
    `        { impact:'${s.impact}', category:'${s.category}', date:'${esc(s.date)}', tags:[${tags}], issueKey:'${s.issueKey}',`,
    `          headline:'${esc(s.headline)}',`,
    `          facts:'${esc(s.facts)}',`,
    `          why:'${esc(s.why)}',`,
    `          source:{ label:'${esc(s.source.label)}', url:'${esc(s.source.url)}' } },`,
  ].join('\n') + '\n';
}
function fmtStance(c) {
  const ev = c.evidence ? ` evidence:'${esc(c.evidence)}',` : '';
  return `      { topic:'${esc(c.topic)}', icon:'${c.icon}', pos:'${c.pos}', issueKey:'${c.issueKey}', issueStance:'${c.issueStance}', text:'${esc(c.text)}',${ev} source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'} },\n`;
}

// ── Idempotent splicer (per-member; prepends new items into each array) ──────
function spliceHtml(html, plan) {
  let out = html;
  let added = { spotlight: 0, stance: 0 };
  const acctStart = out.indexOf('window.ACCT_SPOTLIGHT = window.ACCT_SPOTLIGHT');
  const stanceStart = out.indexOf('var ISSUE_STANCE_DATA = {');
  for (const d of plan) {
    for (const c of d.stances) {
      const anchor = `\n    ${d.id}: [`;
      const at = out.indexOf(anchor, stanceStart);
      if (at === -1) { console.log(`  ⚠ ${d.id}: ISSUE_STANCE_DATA anchor not found`); continue; }
      const blockEnd = out.indexOf('\n    ],', at);
      if (blockEnd > -1 && out.slice(at, blockEnd).includes(`text:'${esc(c.text)}'`)) continue; // idempotent
      const lineStart = out.indexOf('\n', at + anchor.length) + 1;
      out = out.slice(0, lineStart) + fmtStance(c) + out.slice(lineStart);
      added.stance++;
    }
    for (const s of d.spotlight) {
      let anchor = `\n      ${d.id}: [\n`;
      let at = out.indexOf(anchor, acctStart);
      if (at === -1) {
        const objOpen = out.indexOf('window.ACCT_SPOTLIGHT = window.ACCT_SPOTLIGHT || {', acctStart);
        const insertAt = out.indexOf('\n', objOpen) + 1;
        out = out.slice(0, insertAt) + `      ${d.id}: [\n      ],\n` + out.slice(insertAt);
        at = out.indexOf(anchor, acctStart);
      }
      if (at === -1) { console.log(`  ⚠ ${d.id}: ACCT_SPOTLIGHT anchor not found`); continue; }
      const blockEnd = out.indexOf('\n      ],', at);
      if (blockEnd > -1 && out.slice(at, blockEnd).includes(`facts:'${esc(s.facts)}'`)) continue; // idempotent
      const insertPos = at + anchor.length;
      out = out.slice(0, insertPos) + fmtSpotlight(s) + out.slice(insertPos);
      added.spotlight++;
    }
  }
  return { out, added };
}

// ── Validation ───────────────────────────────────────────────────────────────
function loadIssueMapKeys(html) {
  const mapSlice = html.slice(html.indexOf('var ISSUE_MAP = {'), html.indexOf('try { window.ISSUE_MAP'));
  return new Set([...mapSlice.matchAll(/^\s{6}([a-z_]+):\s*\{\s*label:/gm)].map(m => m[1]));
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`PolitiDex — House incumbent core-issue deepening · WAVE 5  [${WRITE_HTML ? 'WRITE-HTML' : 'DRY RUN'}]\n`);
  const html = readFileSync(HTML, 'utf8');
  const valid = loadIssueMapKeys(html);

  const plan = buildAdditions(html);

  // issueKey validation
  let bad = 0;
  for (const d of plan) {
    for (const c of d.stances) if (!valid.has(c.issueKey)) { console.log(`  ⚠ ${d.id}: stance issueKey '${c.issueKey}'`); bad++; }
    for (const s of d.spotlight) if (!valid.has(s.issueKey)) { console.log(`  ⚠ ${d.id}: spotlight issueKey '${s.issueKey}'`); bad++; }
  }
  console.log(bad ? `  ✗ ${bad} invalid issueKey(s)\n` : `  ✓ all issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);
  if (bad && WRITE_HTML) process.exit(1);

  const totalStance = plan.reduce((n, d) => n + d.stances.length, 0);
  const totalSpot = plan.reduce((n, d) => n + d.spotlight.length, 0);
  console.log(`Roster: ${plan.length} incumbents receiving additions · ${totalStance} new stance cards · ${totalSpot} new evidence items\n`);

  let r7 = 0, r8 = 0, r9 = 0, r10 = 0;
  console.log('Core-issue coverage (X/10):');
  for (const d of plan) {
    const after = d.before + d.newCores.length;
    if (after >= 7) r7++; if (after >= 8) r8++; if (after >= 9) r9++; if (after >= 10) r10++;
    console.log(`  • ${d.id.padEnd(24)} ${d.before}/10 → ${after}/10  (+${d.newCores.map(c => c.split(/[ ,]/)[0]).join(', +')})`);
  }
  console.log(`\nAfter this wave, among members improved: ${r7} reach 7+/10 · ${r8} reach 8+/10 · ${r9} reach 9+/10 · ${r10} reach 10/10.`);

  if (WRITE_HTML) {
    const { out, added } = spliceHtml(html, plan);
    writeFileSync(HTML, out);
    console.log(`\n✎ index.html: +${added.stance} ISSUE_STANCE_DATA cards, +${added.spotlight} ACCT_SPOTLIGHT items (idempotent).`);
  } else {
    console.log('\nRe-run with --write-html to splice index.html.');
  }
})();
