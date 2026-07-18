#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-20 figures (federal admin/agency leaders + top
// governors) into the "How Politicians Stand" panels of the relevant Issue
// Spotlights (July 2026). Stances follow each panel's axis (verified against
// existing rows). Idempotent.
//   node scripts/wire-national-wave20-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave20-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const WIRE = {
  // Fed: existing rows split on Trump's rate-cut push vs. Fed-independence/hard-money. Powell = data-driven independence → mixed.
  'federal-reserve-inflation-control-2026': [
    { id: 'jerome_powell', name: 'Jerome Powell', office: 'Federal Reserve Chair', icon: '🏦', topic: 'Data-Driven Independence', stance: 'mixed' },
  ],
  // CBDC/crypto: Supported = pro-crypto / anti-CBDC; Opposed = crypto-skeptic; Mixed = cautious. Powell = cautious → mixed.
  'cryptocurrency-regulation-cbdc-debate-2026': [
    { id: 'jerome_powell', name: 'Jerome Powell', office: 'Federal Reserve Chair', icon: '🏦', topic: 'No CBDC Without Congress', stance: 'mixed' },
  ],
  // Crime: Supported = tough-on-crime; Opposed = reform side.
  'crime-criminal-justice-reform-urban-safety-2026': [
    { id: 'dan_bongino', name: 'Dan Bongino', office: 'FBI Deputy Director', icon: '🚔', topic: 'Aggressive Enforcement', stance: 'supported' },
  ],
  // Fentanyl: Supported = enforcement/interdiction.
  'fentanyl-addiction-overdose-crisis-2026': [
    { id: 'dan_bongino', name: 'Dan Bongino', office: 'FBI Deputy Director', icon: '🚔', topic: 'Cartels & Interdiction', stance: 'supported' },
  ],
  // Spending: Supported = cuts/restraint.
  'government-spending-debt-entitlement-reform': [
    { id: 'kelly_loeffler', name: 'Kelly Loeffler', office: 'SBA Administrator', icon: '🏢', topic: 'Spending Restraint', stance: 'supported' },
  ],
  // Energy: Supported = reliability-first abundance; Opposed = clean-led; Mixed = clean-first.
  'energy-abundance-grid-reliability-2026': [
    { id: 'kelly_loeffler', name: 'Kelly Loeffler', office: 'SBA Administrator', icon: '🏢', topic: 'Expand Production', stance: 'supported' },
    { id: 'greg_abbott', name: 'Greg Abbott', office: 'Governor · Texas', icon: '🤠', topic: 'Oil & Gas', stance: 'supported' },
    { id: 'gavin_newsom', name: 'Gavin Newsom', office: 'Governor · California', icon: '🐻', topic: 'Climate-First', stance: 'opposed' },
    { id: 'josh_shapiro', name: 'Josh Shapiro', office: 'Governor · Pennsylvania', icon: '🔔', topic: 'Gas + Emissions Limits', stance: 'mixed' },
  ],
  // Big Tech: Supported = anti-Big-Tech / police "censorship"; Opposed = platform latitude; Mixed.
  'big-tech-censorship-free-speech-2026': [
    { id: 'andrew_ferguson', name: 'Andrew Ferguson', office: 'FTC Chair', icon: '⚖️', topic: 'Antitrust & Censorship', stance: 'supported' },
  ],
  // AI: Supported = stronger guardrails; Opposed = light-touch; Mixed = between.
  'ai-regulation-job-displacement-2026': [
    { id: 'andrew_ferguson', name: 'Andrew Ferguson', office: 'FTC Chair', icon: '⚖️', topic: 'Competition + Innovation', stance: 'mixed' },
  ],
  // Border: Supported = strict enforcement; Opposed = access/pathways; Mixed = enforcement + pathways.
  'border-security-asylum-reform-2026': [
    { id: 'ron_desantis', name: 'Ron DeSantis', office: 'Governor · Florida', icon: '🌴', topic: 'State Enforcement', stance: 'supported' },
    { id: 'greg_abbott', name: 'Greg Abbott', office: 'Governor · Texas', icon: '🤠', topic: 'Operation Lone Star', stance: 'supported' },
    { id: 'jb_pritzker', name: 'JB Pritzker', office: 'Governor · Illinois', icon: '🏛', topic: 'Immigrant Protections', stance: 'opposed' },
  ],
  // Deportations: Supported = pro mass deportation/enforcement; Opposed = against.
  'mass-deportations-immigration-enforcement-2026': [
    { id: 'ron_desantis', name: 'Ron DeSantis', office: 'Governor · Florida', icon: '🌴', topic: 'State Cooperation', stance: 'supported' },
    { id: 'greg_abbott', name: 'Greg Abbott', office: 'Governor · Texas', icon: '🤠', topic: 'Enforcement', stance: 'supported' },
    { id: 'gavin_newsom', name: 'Gavin Newsom', office: 'Governor · California', icon: '🐻', topic: 'Resist Deportations', stance: 'opposed' },
    { id: 'jb_pritzker', name: 'JB Pritzker', office: 'Governor · Illinois', icon: '🏛', topic: 'Resist Deportations', stance: 'opposed' },
  ],
  // Abortion: Supported = pro-choice; Opposed = anti-abortion; Mixed.
  'abortion-rights-state-vs-federal-2026': [
    { id: 'gavin_newsom', name: 'Gavin Newsom', office: 'Governor · California', icon: '🐻', topic: 'Protect Access', stance: 'supported' },
    { id: 'gretchen_whitmer', name: 'Gretchen Whitmer', office: 'Governor · Michigan', icon: '🚗', topic: 'Reproductive Freedom', stance: 'supported' },
    { id: 'josh_shapiro', name: 'Josh Shapiro', office: 'Governor · Pennsylvania', icon: '🔔', topic: 'Protect Access', stance: 'supported' },
    { id: 'jb_pritzker', name: 'JB Pritzker', office: 'Governor · Illinois', icon: '🏛', topic: 'Protect Access', stance: 'supported' },
    { id: 'ron_desantis', name: 'Ron DeSantis', office: 'Governor · Florida', icon: '🌴', topic: 'Six-Week Limit', stance: 'opposed' },
    { id: 'greg_abbott', name: 'Greg Abbott', office: 'Governor · Texas', icon: '🤠', topic: 'Near-Total Ban', stance: 'opposed' },
  ],
  // School choice: Supported = choice/reform/parental rights; Opposed = public-school/anti-voucher.
  'school-choice-education-reform-parental-rights-2026': [
    { id: 'ron_desantis', name: 'Ron DeSantis', office: 'Governor · Florida', icon: '🌴', topic: 'Choice & Parental Rights', stance: 'supported' },
  ],
  // EV mandates: Supported = anti-mandate / consumer choice; Opposed = pro-EV mandate/transition; Mixed.
  'electric-vehicles-mandates-energy-2026': [
    { id: 'gavin_newsom', name: 'Gavin Newsom', office: 'Governor · California', icon: '🐻', topic: 'Phase Out Gas Cars', stance: 'opposed' },
    { id: 'gretchen_whitmer', name: 'Gretchen Whitmer', office: 'Governor · Michigan', icon: '🚗', topic: 'Managed Auto Transition', stance: 'mixed' },
  ],
  // Reindustrialization: Supported = pro industrial policy/reshoring.
  'reindustrialization-supply-chains-critical-minerals-2026': [
    { id: 'gretchen_whitmer', name: 'Gretchen Whitmer', office: 'Governor · Michigan', icon: '🚗', topic: 'Auto & Manufacturing', stance: 'supported' },
  ],
  // Infrastructure: Supported = fund/maintain.
  'infrastructure-maintenance-crisis-2026': [
    { id: 'gretchen_whitmer', name: 'Gretchen Whitmer', office: 'Governor · Michigan', icon: '🚗', topic: 'Fix the Roads', stance: 'supported' },
  ],
  // Israel aid: Supported = robust aid/alliance.
  'us-israel-relations-foreign-aid-partnership-2026': [
    { id: 'josh_shapiro', name: 'Josh Shapiro', office: 'Governor · Pennsylvania', icon: '🔔', topic: 'Alliance & Aid', stance: 'supported' },
  ],
};

let html = fs.readFileSync(INDEX, 'utf8');
let totalAdded = 0;

for (const [slug, adds] of Object.entries(WIRE)) {
  const start = html.indexOf(`'${slug}': {`);
  if (start < 0) { console.log(`  ✗ slug not found: ${slug}`); continue; }
  const sIdx = html.indexOf('standsOnIssue', start);
  const pIdx = html.indexOf('people:', sIdx);
  const arrOpen = html.indexOf('[', pIdx);
  const closeIdx = html.indexOf('\n          ]', arrOpen);
  if (sIdx < 0 || pIdx < 0 || arrOpen < 0 || closeIdx < 0) { console.log(`  ✗ people array not found: ${slug}`); continue; }

  const content = html.slice(arrOpen + 1, closeIdx);
  const present = new Set([...content.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]));
  const fresh = adds.filter((e) => !present.has(e.id));
  if (!fresh.length) { console.log(`  · ${slug}: all present — skipped`); continue; }

  let trimmed = content.replace(/\s+$/, '');
  if (!trimmed.endsWith(',')) trimmed += ',';
  let addStr = fresh
    .map((e) => `\n            { id: '${e.id}', name: '${esc(e.name)}', office: '${esc(e.office)}', icon: '${e.icon}', topic: '${esc(e.topic)}', stance: '${e.stance}' },`)
    .join('');
  addStr = addStr.replace(/,$/, '');
  const newContent = trimmed + '\n            // Federal admin leaders & top governors — federal wave 20 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
