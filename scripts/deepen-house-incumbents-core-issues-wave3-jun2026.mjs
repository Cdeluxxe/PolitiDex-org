#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — federal U.S. House incumbent CORE-ISSUE deepening pass, WAVE 3
// (June 2026)
//
// PURPOSE
//   Continues the Core National Issues effort (see CORE_NATIONAL_ISSUES.md and
//   scripts/define-core-national-issues-jun2026.mjs) by lifting the THINNEST
//   sitting-incumbent profiles in the Evidence Locker "By Politician" view toward
//   the goal of at least 5/10 Core National Issues covered each. Every addition
//   is keyed to an existing ISSUE_MAP issueKey, so adding a stance card or
//   evidence item lights up Stance-at-a-Glance, Connected Evidence, and the
//   "X/10 core issues" footprint with no extra wiring.
//
// MEMBERS (chosen because they had the fewest core issues covered going in):
//   • Stephanie Bice  (OK-05) — was 1/10 (Government Spending only)
//   • Tom Cole        (OK-04) — was 2/10 (Spending; Economy)
//   • Frank Lucas     (OK-03) — was 3/10 (Economy; Climate; Spending)
//   • Rick Crawford   (AR-01) — was 3/10 (Economy; Immigration; Guns)
//   • Steven Horsford (NV-04) — was 3/10 (Economy; Healthcare; Immigration)
//   • Bennie Thompson (MS-02) — was 3/10 (Climate; Healthcare; Election)
//
// WHAT THIS WAVE ADDS — each item is an individually recorded fact, verified
// against the Office of the Clerk roll-call record and congress.gov (119th
// Congress, 2025). Recorded votes are stated as plain facts (count + roll-call
// number); nothing is described as a "party-line" vote, and every line is about
// what THIS member personally did (CONTENT_STYLE.md).
//
//   Shared recorded votes used as anchors:
//     • Laken Riley Act (H.R. 29) — House passage 264–159, Jan 7, 2025,
//       Roll Call 6; signed into law as Public Law 119-1 on Jan 29, 2025.
//       → Immigration & Border Security.
//     • Born-Alive Abortion Survivors Protection Act (H.R. 21) — House passage
//       217–204, Jan 23, 2025, Roll Call 27. → Abortion / Reproductive Rights.
//     • SAVE Act (H.R. 22) — House passage 220–208, Apr 10, 2025, Roll Call 102.
//       → Election Integrity.
//     • H.R. 1, the 2025 reconciliation and tax law — final House passage
//       218–214, Jul 3, 2025, Roll Call 190; signed into law July 4, 2025.
//       → Economy / Government Spending.
//   Bice, Cole, Crawford, and Lucas each voted YES on all four; Horsford and
//   Thompson voted NO on the SAVE Act / Laken Riley / H.R. 1 (each recorded
//   individually). Horsford crossed over to YES on Laken Riley (already in his
//   profile), so his Immigration coverage is left untouched here.
//
//   Sponsored-bill anchors (introduced in the 119th Congress, referred to
//   committee — stated as introduced, not enacted):
//     • Horsford — Break the Cycle of Violence Act (H.R. 4103), community
//       violence-intervention funding, reintroduced June 24, 2025, paired with
//       his on-the-record statement on his father's 1992 murder. → Gun Safety.
//     • Thompson — Bolstering Security Against Ghost Guns Act (H.R. 2698),
//       introduced April 7, 2025. → Gun Safety.
//
//   node scripts/deepen-house-incumbents-core-issues-wave3-jun2026.mjs              # dry run + issueKey validation + coverage report
//   node scripts/deepen-house-incumbents-core-issues-wave3-jun2026.mjs --write-html # idempotently splice ISSUE_STANCE_DATA cards
//                                                                                   #   + ACCT_SPOTLIGHT evidence into index.html
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'fs';

const WRITE_HTML = process.argv.includes('--write-html');
const HTML = 'index.html';

// ── Shared, verified roll-call anchors ───────────────────────────────────────
const CLERK = {
  laken: 'https://clerk.house.gov/Votes/20256',    // H.R. 29 — 264–159, Roll Call 6,  Jan 7 2025
  born:  'https://clerk.house.gov/Votes/202527',   // H.R. 21 — 217–204, Roll Call 27, Jan 23 2025
  save:  'https://clerk.house.gov/Votes/2025102',  // H.R. 22 — 220–208, Roll Call 102, Apr 10 2025
  hr1:   'https://clerk.house.gov/Votes/2025190',  // H.R. 1  — 218–214, Roll Call 190, Jul 3 2025
};

// ── Reusable builders for the YES-voting Republican incumbents ───────────────
const lakenStance = (name) => ({
  topic: 'Immigration & Border Security', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
  text: 'Voted for the Laken Riley Act (H.R. 29), which requires federal detention of unauthorized immigrants charged with theft or certain other crimes; it passed the House 264–159 on January 7, 2025, and was signed into law as Public Law 119-1.',
  evidence: 'Recorded a yes vote on H.R. 29, Roll Call 6, January 7, 2025.',
  source: { label: 'House Clerk', url: CLERK.laken },
});
const lakenSpotlight = (name) => ({
  impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'border_security',
  headline: 'Voted for the Laken Riley Act',
  facts: `${name} voted yes on the Laken Riley Act (H.R. 29), which requires federal detention of unauthorized immigrants charged with theft or certain other crimes; it passed the House 264–159 on January 7, 2025 (Roll Call 6) and became Public Law 119-1.`,
  why: 'A recorded vote on the first bill signed into law in the 119th Congress is part of the member’s own record.',
  source: { label: 'House Clerk', url: CLERK.laken },
});

const bornStance = (name) => ({
  topic: 'Abortion', icon: '🕊', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
  text: 'Voted for the Born-Alive Abortion Survivors Protection Act (H.R. 21), which requires medical care for an infant born alive after an attempted abortion; it passed the House 217–204 on January 23, 2025.',
  evidence: 'Recorded a yes vote on H.R. 21, Roll Call 27, January 23, 2025.',
  source: { label: 'House Clerk', url: CLERK.born },
});
const bornSpotlight = (name) => ({
  impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'pro_life',
  headline: 'Voted for the Born-Alive Abortion Survivors Protection Act',
  facts: `${name} voted yes on the Born-Alive Abortion Survivors Protection Act (H.R. 21), which requires medical care for an infant born alive after an attempted abortion; it passed the House 217–204 on January 23, 2025 (Roll Call 27).`,
  why: 'A recorded vote on a high-profile abortion bill is part of the member’s own record.',
  source: { label: 'House Clerk', url: CLERK.born },
});

const saveStance = (name) => ({
  topic: 'Election Integrity', icon: '🗳', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
  text: 'Voted for the SAVE Act (H.R. 22), which would require documentary proof of citizenship to register to vote in federal elections; it passed the House 220–208 on April 10, 2025.',
  evidence: 'Recorded a yes vote on H.R. 22, Roll Call 102, April 10, 2025.',
  source: { label: 'House Clerk', url: CLERK.save },
});
const saveSpotlight = (name) => ({
  impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'election_integrity',
  headline: 'Voted for the SAVE Act',
  facts: `${name} voted yes on the SAVE Act (H.R. 22), which would require documentary proof of citizenship to register to vote in federal elections; it passed the House 220–208 on April 10, 2025 (Roll Call 102).`,
  why: 'A recorded vote on a high-profile elections bill is part of the member’s own record.',
  source: { label: 'House Clerk', url: CLERK.save },
});

// ── The wave-3 roster (NEW material only; appended to each member's arrays) ──
const WAVE3 = [
  // ══════════════════ OKLAHOMA ══════════════════
  {
    id: 'stephanie_bice', party: 'R',
    stances: [
      lakenStance('Bice'),
      bornStance('Bice'),
      saveStance('Bice'),
      // Economy: the H.R. 1 yes vote already sits in her Connected Evidence keyed
      // to spending; this card surfaces its tax-relief (Economy) dimension.
      { topic: 'Taxes & Cost of Living', icon: '💰', pos: 'support', issueKey: 'tax_middle_class', issueStance: 'support',
        text: 'Voted for H.R. 1, the 2025 reconciliation law, which extends the 2017 individual income-tax rates and other tax provisions; it passed the House 218–214 on July 3, 2025, and was signed into law.',
        evidence: 'Recorded a yes vote on H.R. 1, Roll Call 190, July 3, 2025.',
        source: { label: 'House Clerk', url: CLERK.hr1 } },
    ],
    spotlight: [ lakenSpotlight('Bice'), bornSpotlight('Bice'), saveSpotlight('Bice') ],
  },
  {
    id: 'tom_cole', party: 'R',
    stances: [ lakenStance('Cole'), bornStance('Cole'), saveStance('Cole') ],
    spotlight: [ lakenSpotlight('Cole'), bornSpotlight('Cole'), saveSpotlight('Cole') ],
  },
  {
    id: 'frank_lucas', party: 'R',
    stances: [ lakenStance('Lucas'), bornStance('Lucas'), saveStance('Lucas') ],
    spotlight: [ lakenSpotlight('Lucas'), bornSpotlight('Lucas'), saveSpotlight('Lucas') ],
  },

  // ══════════════════ ARKANSAS ══════════════════
  {
    id: 'rick_crawford', party: 'R',
    stances: [
      bornStance('Crawford'),
      saveStance('Crawford'),
      // Spending: H.R. 1's reconciliation/fiscal dimension (his Economy card
      // already cites the tax-cut side of the same law).
      { topic: 'Government Spending', icon: '🧾', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support',
        text: 'Voted for H.R. 1, the 2025 reconciliation law, which his office described as cutting spending while extending tax relief; it passed the House 218–214 on July 3, 2025.',
        evidence: 'Recorded a yes vote on H.R. 1, Roll Call 190, July 3, 2025.',
        source: { label: 'House Clerk', url: CLERK.hr1 } },
    ],
    spotlight: [
      bornSpotlight('Crawford'),
      saveSpotlight('Crawford'),
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'lower_taxes',
        headline: 'Voted for the 2025 reconciliation and tax law',
        facts: 'Crawford voted yes on final passage of H.R. 1, Roll Call 190, July 3, 2025; it passed the House 218–214 and was signed into law.',
        why: 'A recorded vote on the cycle’s signature fiscal law is core to his record.',
        source: { label: 'House Clerk', url: CLERK.hr1 } },
    ],
  },

  // ══════════════════ NEVADA ══════════════════
  {
    id: 'steven_horsford', party: 'D',
    stances: [
      // Election Integrity: recorded no vote on the SAVE Act.
      { topic: 'Election Integrity', icon: '🗳', pos: 'support', issueKey: 'voting_access', issueStance: 'support',
        text: 'Voted no on the SAVE Act (H.R. 22), which would require documentary proof of citizenship to register to vote in federal elections; it passed the House 220–208 on April 10, 2025 (Roll Call 102).',
        evidence: 'Recorded a no vote on H.R. 22, Roll Call 102, April 10, 2025.',
        source: { label: 'House Clerk', url: CLERK.save } },
      // Gun Safety: sponsored bill + on-the-record personal statement.
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Sponsored the Break the Cycle of Violence Act (H.R. 4103), which funds community violence-intervention programs; he reintroduced it in June 2025, citing his father’s 1992 murder.',
        evidence: 'Introduced H.R. 4103 in the 119th Congress on June 24, 2025; referred to committee.',
        source: { label: 'House.gov', url: 'https://horsford.house.gov/media/press-releases/horsford-marks-33rd-anniversary-of-father-s-murder-by-introducing-critical-legislation-to-fund-community-violence-intervention' } },
    ],
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'voting_access',
        headline: 'Voted no on the SAVE Act',
        facts: 'Horsford voted no on the SAVE Act (H.R. 22), which would require documentary proof of citizenship to register to vote in federal elections; it passed the House 220–208 on April 10, 2025 (Roll Call 102).',
        why: 'A recorded vote on a high-profile elections bill is part of his own record.',
        source: { label: 'House Clerk', url: CLERK.save } },
      { impact: 'positive', category: 'rhetoric', date: '2025', tags: ['Notable Actions', 'Consistency'], issueKey: 'gun_safety',
        headline: 'Sponsored a community violence-intervention bill, citing his father’s murder',
        facts: 'Horsford sponsored the Break the Cycle of Violence Act (H.R. 4103) to fund community violence-intervention programs, reintroducing it in June 2025. Marking the 33rd anniversary of his father’s murder, he said: "At 19, I lost my father to senseless gun violence – I know in deeply personal terms exactly how harmful not having these investments can be."',
        why: 'A sponsored bill paired with a personal, on-the-record statement is direct evidence of what he prioritizes.',
        source: { label: 'House.gov', url: 'https://horsford.house.gov/media/press-releases/horsford-marks-33rd-anniversary-of-father-s-murder-by-introducing-critical-legislation-to-fund-community-violence-intervention' } },
    ],
  },

  // ══════════════════ MISSISSIPPI ══════════════════
  {
    id: 'bennie_thompson', party: 'D',
    stances: [
      // Immigration: recorded no vote on the Laken Riley Act.
      { topic: 'Immigration & Border Security', icon: '⚖️', pos: 'support', issueKey: 'immig_balance', issueStance: 'support',
        text: 'Voted no on the Laken Riley Act (H.R. 29), which requires federal detention of unauthorized immigrants charged with theft or certain other crimes; it passed the House 264–159 on January 7, 2025 (Roll Call 6).',
        evidence: 'Recorded a no vote on H.R. 29, Roll Call 6, January 7, 2025.',
        source: { label: 'House Clerk', url: CLERK.laken } },
      // Gun Safety: sponsored bill.
      { topic: 'Gun Safety', icon: '🦺', pos: 'support', issueKey: 'gun_safety', issueStance: 'support',
        text: 'Sponsored the Bolstering Security Against Ghost Guns Act (H.R. 2698), which would tighten controls on untraceable, self-assembled firearms; introduced April 7, 2025.',
        evidence: 'Introduced H.R. 2698 in the 119th Congress on April 7, 2025; referred to committee.',
        source: { label: 'Congress.gov', url: 'https://www.congress.gov/bill/119th-congress/house-bill/2698' } },
      // Economy: recorded no vote on H.R. 1.
      { topic: 'Economy & Taxes', icon: '⚖️', pos: 'oppose', issueKey: 'tax_middle_class', issueStance: 'oppose',
        text: 'Voted no on H.R. 1, the 2025 reconciliation and tax law; it passed the House 218–214 on July 3, 2025 (Roll Call 190).',
        evidence: 'Recorded a no vote on H.R. 1, Roll Call 190, July 3, 2025.',
        source: { label: 'House Clerk', url: CLERK.hr1 } },
    ],
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'immig_balance',
        headline: 'Voted no on the Laken Riley Act',
        facts: 'Thompson voted no on the Laken Riley Act (H.R. 29), which requires federal detention of unauthorized immigrants charged with theft or certain other crimes; it passed the House 264–159 on January 7, 2025 (Roll Call 6).',
        why: 'A recorded vote on the first bill signed into law in the 119th Congress is part of his own record.',
        source: { label: 'House Clerk', url: CLERK.laken } },
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'gun_safety',
        headline: 'Sponsored a bill to tighten controls on ghost guns',
        facts: 'Thompson sponsored the Bolstering Security Against Ghost Guns Act (H.R. 2698), which would tighten controls on untraceable, self-assembled firearms; he introduced it on April 7, 2025, and it was referred to committee.',
        why: 'A sponsored bill is the most concrete kind of legislative signal of his priorities.',
        source: { label: 'Congress.gov', url: 'https://www.congress.gov/bill/119th-congress/house-bill/2698' } },
    ],
  },
];

// ── Serialization helpers (match index.html formatting exactly) ──────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

// One ACCT_SPOTLIGHT item, 8-space indented, terminated with a comma.
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

// One ISSUE_STANCE_DATA card, 6-space indented, terminated with a comma.
function fmtStance(c) {
  const ev = c.evidence ? ` evidence:'${esc(c.evidence)}',` : '';
  return `      { topic:'${esc(c.topic)}', icon:'${c.icon}', pos:'${c.pos}', issueKey:'${c.issueKey}', issueStance:'${c.issueStance}', text:'${esc(c.text)}',${ev} source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'} },\n`;
}

// ── index.html splicer (idempotent; prepends new items into each member array) ─
// Idempotency is checked WITHIN each member's own array block, so distinct
// members can carry items that share a headline/topic (e.g. the SAVE Act vote).
function spliceHtml(html) {
  let out = html;
  let added = { spotlight: 0, stance: 0 };
  const acctStart = out.indexOf('window.ACCT_SPOTLIGHT = window.ACCT_SPOTLIGHT');
  const stanceStart = out.indexOf('var ISSUE_STANCE_DATA = {');

  for (const d of WAVE3) {
    // --- ISSUE_STANCE_DATA: anchor on 4-space "    id: [", insert after it ---
    for (const c of (d.stances || [])) {
      const anchor = `\n    ${d.id}: [`;
      const at = out.indexOf(anchor, stanceStart);
      if (at === -1) { console.log(`  ⚠ ${d.id}: ISSUE_STANCE_DATA anchor not found — skipped a stance card`); continue; }
      const blockEnd = out.indexOf('\n    ],', at);
      if (blockEnd > -1 && out.slice(at, blockEnd).includes(`topic:'${esc(c.topic)}'`) && out.slice(at, blockEnd).includes(`issueKey:'${c.issueKey}'`)) continue; // per-member idempotency
      const lineStart = out.indexOf('\n', at + anchor.length) + 1; // start of the first existing card line
      out = out.slice(0, lineStart) + fmtStance(c) + out.slice(lineStart);
      added.stance++;
    }
    // --- ACCT_SPOTLIGHT: anchor on 6-space "      id: [", insert after it ---
    for (const s of (d.spotlight || [])) {
      const anchor = `\n      ${d.id}: [\n`;
      const at = out.indexOf(anchor, acctStart);
      if (at === -1) { console.log(`  ⚠ ${d.id}: ACCT_SPOTLIGHT anchor not found — skipped a spotlight item`); continue; }
      const blockEnd = out.indexOf('\n      ],', at);
      if (blockEnd > -1 && out.slice(at, blockEnd).includes(`headline:'${esc(s.headline)}'`)) continue; // per-member idempotency
      const insertPos = at + anchor.length;
      out = out.slice(0, insertPos) + fmtSpotlight(s) + out.slice(insertPos);
      added.spotlight++;
    }
  }
  return { out, added };
}

// ── Core National Issues framework (for the coverage report) ─────────────────
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

// ── Validation + coverage report ─────────────────────────────────────────────
function loadIssueMapKeys(html) {
  const mapSlice = html.slice(html.indexOf('var ISSUE_MAP = {'), html.indexOf('try { window.ISSUE_MAP'));
  return new Set([...mapSlice.matchAll(/^\s{6}([a-z_]+):\s*\{\s*label:/gm)].map(m => m[1]));
}
function extractArray(html, sectionStart, id, indent) {
  const anchor = `\n${indent}${id}: [`;
  const at = html.indexOf(anchor, sectionStart);
  if (at === -1) return '';
  const end = html.indexOf(`\n${indent}],`, at);
  return html.slice(at, end);
}
function coverageForMember(html, id) {
  const stanceStart = html.indexOf('var ISSUE_STANCE_DATA = {');
  const acctStart = html.indexOf('window.ACCT_SPOTLIGHT = window.ACCT_SPOTLIGHT');
  const block = extractArray(html, stanceStart, id, '    ') + '\n' + extractArray(html, acctStart, id, '      ');
  const keys = [...block.matchAll(/issueKey:'([a-z_]+)'/g)].map(m => m[1]);
  const cores = new Set();
  keys.forEach(k => { const c = coreFor(k); if (c) cores.add(c.label); });
  return cores;
}

function validateIssueKeys(valid) {
  let bad = 0;
  for (const d of WAVE3) {
    for (const c of (d.stances || [])) if (!valid.has(c.issueKey)) { console.log(`  ⚠ ${d.id}: stance issueKey '${c.issueKey}'`); bad++; }
    for (const s of (d.spotlight || [])) if (!valid.has(s.issueKey)) { console.log(`  ⚠ ${d.id}: spotlight issueKey '${s.issueKey}'`); bad++; }
  }
  console.log(bad ? `  ✗ ${bad} invalid issueKey(s)\n` : `  ✓ all wave-3 issueKeys valid against ISSUE_MAP (${valid.size} keys)`);
  return bad === 0;
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`PolitiDex — House incumbent core-issue deepening · WAVE 3  [${WRITE_HTML ? 'WRITE-HTML' : 'DRY RUN'}]\n`);
  const html = readFileSync(HTML, 'utf8');
  const valid = loadIssueMapKeys(html);
  const ok = validateIssueKeys(valid);
  if (!ok && WRITE_HTML) process.exit(1);

  const totalStance = WAVE3.reduce((n, d) => n + (d.stances || []).length, 0);
  const totalSpot = WAVE3.reduce((n, d) => n + (d.spotlight || []).length, 0);
  console.log(`\nRoster: ${WAVE3.length} incumbents · ${totalStance} new stance cards · ${totalSpot} new evidence items\n`);

  // Coverage report (before → projected after).
  console.log('Core-issue coverage (X/10):');
  for (const d of WAVE3) {
    const before = coverageForMember(html, d.id);
    const after = new Set(before);
    (d.stances || []).forEach(c => { const core = coreFor(c.issueKey); if (core) after.add(core.label); });
    (d.spotlight || []).forEach(s => { const core = coreFor(s.issueKey); if (core) after.add(core.label); });
    const newCores = [...after].filter(x => !before.has(x));
    console.log(`  • ${d.id.padEnd(18)} ${before.size}/10 → ${after.size}/10` + (newCores.length ? `  (+${newCores.join(', +')})` : ''));
  }

  if (WRITE_HTML) {
    const { out, added } = spliceHtml(html);
    writeFileSync(HTML, out);
    console.log(`\n✎ index.html: +${added.stance} ISSUE_STANCE_DATA cards, +${added.spotlight} ACCT_SPOTLIGHT items (idempotent).`);
  } else {
    console.log('\nRe-run with --write-html to splice index.html.');
  }
})();
