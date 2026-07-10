#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Core National Issues framework + federal House core-issue
// deepening pass (June 2026)
//
// PURPOSE
//   PolitiDex is narrowing its federal coverage toward the highest-salience
//   national issues so the Evidence Locker and politician profiles go DEEP on
//   what voters weigh most, instead of spreading thin across many small topics.
//   This file is the single, auditable source for two things that were applied
//   by hand into index.html:
//
//   1. CORE_NATIONAL_ISSUES — the priority framework: ten 2026 core issues, each
//      a curated bundle of one or more existing ISSUE_MAP issueKeys. Mirrored
//      into index.html right after the ISSUE_MAP window publish, and surfaced as
//      a "core issues covered" readout in the Evidence Locker By-Politician view.
//
//   2. CORE_DEEPEN — new, individually sourced issue STANCES (ISSUE_STANCE_DATA)
//      and Connected Evidence (ACCT_SPOTLIGHT) added to the sitting U.S. House
//      incumbents from the recent bottom-up delegation waves (Iowa, Nevada,
//      Arkansas, Mississippi, Oklahoma), each filling a gap on a Core National
//      Issue the member did not yet have a documented stance on.
//
// EVIDENCE STANDARD
//   Every addition reuses a fact already verified by the prior House waves and
//   the deepen pass (scripts/deepen-house-4-5seat-incumbents-jun2026.mjs):
//     • H.R. 1 ("One Big Beautiful Bill Act"): final passage Roll Call 190,
//       218–214, July 3, 2025. The AR/MS(R)/OK Republicans and Zach Nunn voted
//       YES; the three Nevada Democrats and Bennie Thompson voted NO.
//     • Laken Riley Act (H.R. 29): House passage Roll Call 6, Jan. 7, 2025.
//       Titus, Lee, and Horsford crossed over to YES; Nunn voted YES.
//     • Brecheen's POWER Act (H.R. 164) passed the House 419–2, Jan. 15, 2025.
//     • Thompson chaired the Jan. 6th Select Committee (appointed July 2021).
//     • Hill chairs House Financial Services (since Jan. 2025).
//   Nothing is invented or overstated. Per CONTENT_STYLE.md every line describes
//   what THIS individual did, said, or pledges — never their party. Recorded
//   votes are stated as plain facts (counts, roll-call numbers), never as "party
//   line" votes, and each member's stance is written about their own vote.
//
//   node scripts/define-core-national-issues-jun2026.mjs            # validate + coverage report
//
// This script does NOT write Firestore: the framework and the stances were
// applied directly to index.html (the deployed artifact). It exists to validate
// every issueKey against the live ISSUE_MAP and to print the core-issue coverage
// report used in the change summary.
// ---------------------------------------------------------------------------

import { readFileSync } from 'fs';

// ── The Core National Issues framework (ordered by 2026 salience) ─────────────
export const CORE_NATIONAL_ISSUES = [
  { key: 'economy_cost_of_living', label: 'Economy, Inflation & Cost of Living',
    keys: ['cost_living','tax_middle_class','econ_growth','econ_smallbiz','econ_trade','econ_balance','econ_workers','econ_corp_account','rural_ag','housing_build','housing_support','housing_first_time','property_tax','tariffs_china','tariffs_growth','tariffs_prices','tariffs_authority'] },
  { key: 'immigration_border', label: 'Immigration & Border Security',
    keys: ['border_security','immig_legal','immig_balance','immigration_reform','immig_fentanyl','deportations'] },
  { key: 'healthcare', label: 'Healthcare Costs & Access',
    keys: ['healthcare_market','health_drug_prices','health_balance','healthcare','health_mental','health_rural','medical_freedom','social_security','healthcare_costs'] },
  { key: 'spending_debt_waste', label: 'Government Spending, Debt & Waste',
    keys: ['lower_taxes','gov_waste','gov_balance','national_debt','audit_spending','gov_regulation','cut_spending'] },
  { key: 'abortion_repro', label: 'Abortion / Reproductive Rights',
    keys: ['pro_life','repro_balance','pro_choice'] },
  { key: 'guns', label: 'Gun Rights & Gun Control',
    keys: ['gun_rights','gun_balance','gun_safety'] },
  { key: 'climate_energy', label: 'Climate Change & Energy Policy',
    keys: ['climate_action','enviro_energy','enviro_balance','lands_energy','datacenter_growth','datacenter_water','datacenter_power','disaster_resilience','water','water_storage','energy_production'] },
  { key: 'crime_safety', label: 'Crime & Public Safety',
    keys: ['back_police','justice_balance','justice_reform','cannabis_reform','tough_on_crime'] },
  { key: 'election_integrity', label: 'Election Integrity',
    keys: ['election_integrity','democracy_balance','voting_access','voter_id'] },
  { key: 'education_parental', label: 'Education & Parental Rights',
    keys: ['school_choice','edu_balance','public_schools','edu_college_cost','edu_parental'] },
  { key: 'civil_rights_culture', label: 'Civil Rights, Culture & DEI',
    keys: ['religious_liberty','rights_balance','lgbtq_rights','free_speech','end_dei'] },
  { key: 'foreign_policy_defense', label: 'Foreign Policy & National Security',
    keys: ['strong_defense','foreign_balance','restraint','america_first','america_first_fp','veterans'] },
];

// ── The new core-issue stances added to recent-wave House incumbents ──────────
// Each (id → [issueKey...]) is the NEW core-issue stance card(s) added in this
// pass. "evidence" marks the members who also received a matching Connected
// Evidence (ACCT_SPOTLIGHT) item in this pass.
export const CORE_DEEPEN = {
  zach_nunn:        { stances: ['border_security'], evidence: [] },   // Laken Riley YES (evidence already present)
  dina_titus:       { stances: ['border_security'], evidence: [] },   // Laken Riley crossover (evidence already present)
  steven_horsford:  { stances: ['border_security'], evidence: [] },   // Laken Riley crossover (evidence already present)
  french_hill:      { stances: ['econ_growth'],     evidence: [] },   // Financial Services chair (evidence already present)
  trent_kelly:      { stances: ['lower_taxes'],     evidence: ['lower_taxes'] },
  bennie_thompson:  { stances: ['democracy_balance'], evidence: [] }, // Jan 6 chair (evidence already present)
  michael_guest:    { stances: ['lower_taxes'],     evidence: ['lower_taxes'] },
  mike_ezell:       { stances: ['lower_taxes'],     evidence: ['lower_taxes'] },
  josh_brecheen:    { stances: ['enviro_energy'],   evidence: [] },   // POWER Act (evidence already present)
  frank_lucas:      { stances: ['lower_taxes'],     evidence: [] },   // H.R. 1 (evidence already present)
  tom_cole:         { stances: ['lower_taxes'],     evidence: [] },   // H.R. 1 (evidence already present)
};

// ── Validate every issueKey against the live ISSUE_MAP vocabulary ─────────────
// ISSUE_MAP and CORE_NATIONAL_ISSUES now live in alignment-tool.js (loaded by
// index.html as an external script), so the vocabulary is read from there. The
// slice markers `var ISSUE_MAP = {` … `try { window.ISSUE_MAP` bracket the map
// exactly as they did when it was inlined in index.html.
function loadIssueMapKeys() {
  const src = readFileSync(new URL('../alignment-tool.js', import.meta.url), 'utf8');
  const mapSlice = src.slice(src.indexOf('var ISSUE_MAP = {'), src.indexOf('try { window.ISSUE_MAP'));
  // Tolerate both `key: { label:` and `key:{ label:` spacing.
  return new Set([...mapSlice.matchAll(/^\s{6}([a-z_]+):\s*\{\s*label:/gm)].map(m => m[1]));
}

(function main() {
  console.log('PolitiDex — Core National Issues framework  [VALIDATE + REPORT]\n');
  const valid = loadIssueMapKeys();
  console.log(`ISSUE_MAP vocabulary: ${valid.size} keys\n`);

  let bad = 0;
  console.log(`Core National Issues (${CORE_NATIONAL_ISSUES.length}):`);
  for (const ci of CORE_NATIONAL_ISSUES) {
    const unknown = ci.keys.filter(k => !valid.has(k));
    unknown.forEach(k => { console.log(`  ⚠ ${ci.key}: unknown issueKey '${k}'`); bad++; });
    console.log(`  • ${ci.label.padEnd(38)} ${ci.keys.length} keys`);
  }
  console.log(bad ? `\n  ✗ ${bad} invalid issueKey(s).\n` : `\n  ✓ all ${CORE_NATIONAL_ISSUES.reduce((n, c) => n + c.keys.length, 0)} core keys valid against ISSUE_MAP\n`);

  let badD = 0, sN = 0, eN = 0;
  console.log('New core-issue coverage added this pass:');
  for (const [id, d] of Object.entries(CORE_DEEPEN)) {
    [...d.stances, ...d.evidence].forEach(k => { if (!valid.has(k)) { console.log(`  ⚠ ${id}: unknown key '${k}'`); badD++; } });
    sN += d.stances.length; eN += d.evidence.length;
    console.log(`  • ${id.padEnd(18)} +${d.stances.length} stance(s) [${d.stances.join(', ')}]` + (d.evidence.length ? `  +${d.evidence.length} evidence` : ''));
  }
  console.log(`\n  ${Object.keys(CORE_DEEPEN).length} incumbents · +${sN} stances · +${eN} new evidence items` + (badD ? `  ✗ ${badD} bad keys` : '  ✓'));
})();
