#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-19 federal figures (high-profile senators &
// influential House members) into the "How Politicians Stand" panels of the
// relevant Issue Spotlights (July 2026). Stances follow each panel's axis note
// (verified against existing rows). Idempotent.
//   node scripts/wire-national-wave19-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave19-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const WIRE = {
  // Border: Supported = strict enforcement; Opposed = access/pathways; Mixed = enforcement + pathways.
  'border-security-asylum-reform-2026': [
    { id: 'ted_budd', name: 'Ted Budd', office: 'U.S. Senator · North Carolina', icon: '🔫', topic: 'Enforcement & the Wall', stance: 'supported' },
    { id: 'nancy_mace', name: 'Nancy Mace', office: 'U.S. Representative · South Carolina', icon: '⚖️', topic: 'Enforcement', stance: 'supported' },
    { id: 'tommy_tuberville', name: 'Tommy Tuberville', office: 'U.S. Senator · Alabama', icon: '🏈', topic: 'Enforcement & the Wall', stance: 'supported' },
    { id: 'john_cornyn', name: 'John Cornyn', office: 'U.S. Senator · Texas', icon: '⚖️', topic: 'Border Enforcement', stance: 'supported' },
    { id: 'delia_ramirez', name: 'Delia Ramirez', office: 'U.S. Representative · Illinois', icon: '🏠', topic: 'Rights & Pathways', stance: 'opposed' },
  ],
  // Deportations: Supported = pro mass deportation; Opposed = against.
  'mass-deportations-immigration-enforcement-2026': [
    { id: 'delia_ramirez', name: 'Delia Ramirez', office: 'U.S. Representative · Illinois', icon: '🏠', topic: 'Immigrant Rights', stance: 'opposed' },
  ],
  // Energy: Supported = reliability-first abundance; Opposed = clean-led; Mixed = clean-first.
  'energy-abundance-grid-reliability-2026': [
    { id: 'ted_budd', name: 'Ted Budd', office: 'U.S. Senator · North Carolina', icon: '🔫', topic: 'Oil, Gas & Nuclear', stance: 'supported' },
    { id: 'kevin_hern', name: 'Kevin Hern', office: 'U.S. Representative · Oklahoma', icon: '🧾', topic: 'Oil & Gas', stance: 'supported' },
  ],
  // Guns: Supported = prevention/safety; Opposed = gun rights; Mixed = targeted.
  'mental-health-gun-violence-prevention-2026': [
    { id: 'ted_budd', name: 'Ted Budd', office: 'U.S. Senator · North Carolina', icon: '🔫', topic: 'Second Amendment', stance: 'opposed' },
  ],
  // Spending: Supported = cuts/restraint; Opposed = defend spending; Mixed = between.
  'government-spending-debt-entitlement-reform': [
    { id: 'kevin_hern', name: 'Kevin Hern', office: 'U.S. Representative · Oklahoma', icon: '🧾', topic: 'RSC Budget & Cuts', stance: 'supported' },
    { id: 'greg_landsman', name: 'Greg Landsman', office: 'U.S. Representative · Ohio', icon: '🤝', topic: 'Bipartisan Deals', stance: 'mixed' },
  ],
  // Transgender: Supported = trans-inclusive; Opposed = restrictive; Mixed.
  'transgender-rights-sports-youth-care-2026': [
    { id: 'nancy_mace', name: 'Nancy Mace', office: 'U.S. Representative · South Carolina', icon: '⚖️', topic: "Restrict Women's Sports & Spaces", stance: 'opposed' },
    { id: 'sarah_mcbride', name: 'Sarah McBride', office: 'U.S. Representative · Delaware', icon: '🏳️‍⚧️', topic: 'Transgender Rights', stance: 'supported' },
  ],
  // Abortion: Supported = pro-choice; Opposed = anti-abortion; Mixed.
  'abortion-rights-state-vs-federal-2026': [
    { id: 'tommy_tuberville', name: 'Tommy Tuberville', office: 'U.S. Senator · Alabama', icon: '🏈', topic: 'Abortion Limits', stance: 'opposed' },
    { id: 'sarah_mcbride', name: 'Sarah McBride', office: 'U.S. Representative · Delaware', icon: '🏳️‍⚧️', topic: 'Protect Abortion Access', stance: 'supported' },
  ],
  // Food security: Supported = strong farm safety net; Opposed = cuts; Mixed = targeted.
  'food-security-farming-future-2026': [
    { id: 'tommy_tuberville', name: 'Tommy Tuberville', office: 'U.S. Senator · Alabama', icon: '🏈', topic: 'Farm Safety Net', stance: 'supported' },
  ],
  // Ukraine: Supported = robust aid; Mixed = conditional/peace; Opposed = cut aid.
  'ukraine-russia-war-us-aid-peace-2026': [
    { id: 'john_cornyn', name: 'John Cornyn', office: 'U.S. Senator · Texas', icon: '⚖️', topic: 'Continue Military Aid', stance: 'supported' },
    { id: 'jake_auchincloss', name: 'Jake Auchincloss', office: 'U.S. Representative · Massachusetts', icon: '💻', topic: 'Stand With Allies', stance: 'supported' },
  ],
  // China/Taiwan: Supported = robust deterrent/Taiwan; Mixed; Opposed = restraint.
  'china-taiwan-tensions-us-defense-2026': [
    { id: 'john_cornyn', name: 'John Cornyn', office: 'U.S. Senator · Texas', icon: '⚖️', topic: 'Deter China & Aid Taiwan', stance: 'supported' },
  ],
  // Israel aid: Supported = robust aid/alliance; Mixed = conditions; Opposed = reduce.
  'us-israel-relations-foreign-aid-partnership-2026': [
    { id: 'john_cornyn', name: 'John Cornyn', office: 'U.S. Senator · Texas', icon: '⚖️', topic: 'Security Aid & Alliance', stance: 'supported' },
    { id: 'jake_auchincloss', name: 'Jake Auchincloss', office: 'U.S. Representative · Massachusetts', icon: '💻', topic: 'Aid & the Alliance', stance: 'supported' },
    { id: 'greg_landsman', name: 'Greg Landsman', office: 'U.S. Representative · Ohio', icon: '🤝', topic: 'Aid & the Alliance', stance: 'supported' },
  ],
  // Crime: Supported = tough-on-crime; Opposed = reform side; Mixed.
  'crime-criminal-justice-reform-urban-safety-2026': [
    { id: 'ayanna_pressley', name: 'Ayanna Pressley', office: 'U.S. Representative · Massachusetts', icon: '✊', topic: 'Justice Reform', stance: 'opposed' },
  ],
  // Student loans: Supported = debt relief; Opposed = against; Mixed = targeted.
  'student-loan-debt-higher-education-cost-2026': [
    { id: 'ayanna_pressley', name: 'Ayanna Pressley', office: 'U.S. Representative · Massachusetts', icon: '✊', topic: 'Cancel Student Debt', stance: 'supported' },
  ],
  // Drug prices: Supported = negotiation/caps; Opposed = market/pharma; Mixed = targeted.
  'prescription-drug-prices-pharmaceutical-reform-2026': [
    { id: 'ayanna_pressley', name: 'Ayanna Pressley', office: 'U.S. Representative · Massachusetts', icon: '✊', topic: 'Lower Prices', stance: 'supported' },
    { id: 'delia_ramirez', name: 'Delia Ramirez', office: 'U.S. Representative · Illinois', icon: '🏠', topic: 'Lower Prices', stance: 'supported' },
  ],
  // AI: Supported = stronger guardrails; Opposed = light-touch; Mixed = between.
  'ai-regulation-job-displacement-2026': [
    { id: 'jake_auchincloss', name: 'Jake Auchincloss', office: 'U.S. Representative · Massachusetts', icon: '💻', topic: 'Innovation + Targeted Guardrails', stance: 'mixed' },
  ],
  // SS/Medicare solvency: Supported = act to protect/strengthen; Opposed = inaction; Mixed.
  'social-security-medicare-solvency-2026': [
    { id: 'greg_landsman', name: 'Greg Landsman', office: 'U.S. Representative · Ohio', icon: '🤝', topic: 'Protect Benefits', stance: 'supported' },
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
  const newContent = trimmed + '\n            // High-profile senators & influential members — federal wave 19 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
