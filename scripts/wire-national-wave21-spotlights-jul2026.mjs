#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-21 governors into the "How Politicians Stand" panels
// of the relevant Issue Spotlights (July 2026). Stances follow each panel's axis
// (verified against existing rows). Idempotent.
//   node scripts/wire-national-wave21-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave21-spotlights-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'index.html');
const APPLY = process.argv.includes('--apply');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const WIRE = {
  // School choice: Supported = choice/reform/parental rights; Opposed = public-school/anti-voucher.
  'school-choice-education-reform-parental-rights-2026': [
    { id: 'glenn_youngkin', name: 'Glenn Youngkin', office: 'Governor · Virginia', icon: '🏔', topic: 'Parental Rights', stance: 'supported' },
    { id: 'sarah_huckabee_sanders', name: 'Sarah Huckabee Sanders', office: 'Governor · Arkansas', icon: '🎀', topic: 'LEARNS Vouchers', stance: 'supported' },
    { id: 'jeff_landry', name: 'Jeff Landry', office: 'Governor · Louisiana', icon: '⚜️', topic: 'Vouchers & Parental Rights', stance: 'supported' },
  ],
  // Abortion: Supported = pro-choice; Opposed = anti-abortion; Mixed.
  'abortion-rights-state-vs-federal-2026': [
    { id: 'tim_walz', name: 'Tim Walz', office: 'Governor · Minnesota', icon: '⭐', topic: 'Protect Access', stance: 'supported' },
    { id: 'kathy_hochul', name: 'Kathy Hochul', office: 'Governor · New York', icon: '🗽', topic: 'Protect Access', stance: 'supported' },
    { id: 'andy_beshear', name: 'Andy Beshear', office: 'Governor · Kentucky', icon: '🔵', topic: 'Restore Access', stance: 'supported' },
    { id: 'glenn_youngkin', name: 'Glenn Youngkin', office: 'Governor · Virginia', icon: '🏔', topic: '15-Week "Consensus"', stance: 'mixed' },
    { id: 'brian_kemp', name: 'Brian Kemp', office: 'Governor · Georgia', icon: '🍑', topic: 'Heartbeat Law', stance: 'opposed' },
    { id: 'sarah_huckabee_sanders', name: 'Sarah Huckabee Sanders', office: 'Governor · Arkansas', icon: '🎀', topic: 'Near-Total Ban', stance: 'opposed' },
  ],
  // Energy: Supported = reliability-first abundance; Opposed = clean-led; Mixed = clean-first.
  'energy-abundance-grid-reliability-2026': [
    { id: 'glenn_youngkin', name: 'Glenn Youngkin', office: 'Governor · Virginia', icon: '🏔', topic: 'All-of-the-Above', stance: 'supported' },
    { id: 'jeff_landry', name: 'Jeff Landry', office: 'Governor · Louisiana', icon: '⚜️', topic: 'Oil, Gas & LNG', stance: 'supported' },
    { id: 'jared_polis', name: 'Jared Polis', office: 'Governor · Colorado', icon: '🏔', topic: 'Renewables + Savings', stance: 'mixed' },
  ],
  // Border: Supported = strict enforcement; Opposed = access/pathways; Mixed.
  'border-security-asylum-reform-2026': [
    { id: 'brian_kemp', name: 'Brian Kemp', office: 'Governor · Georgia', icon: '🍑', topic: 'Enforcement', stance: 'supported' },
    { id: 'sarah_huckabee_sanders', name: 'Sarah Huckabee Sanders', office: 'Governor · Arkansas', icon: '🎀', topic: 'Guard Deployment', stance: 'supported' },
    { id: 'jeff_landry', name: 'Jeff Landry', office: 'Governor · Louisiana', icon: '⚜️', topic: 'Enforcement', stance: 'supported' },
  ],
  // Voter ID / election integrity: Supported = strict integrity/ID; Opposed = access-first; Mixed.
  'voter-id-election-integrity-2026': [
    { id: 'brian_kemp', name: 'Brian Kemp', office: 'Governor · Georgia', icon: '🍑', topic: 'SB 202 / Voter ID', stance: 'supported' },
  ],
  // Crime: Supported = tough-on-crime; Opposed = reform side; Mixed.
  'crime-criminal-justice-reform-urban-safety-2026': [
    { id: 'jeff_landry', name: 'Jeff Landry', office: 'Governor · Louisiana', icon: '⚜️', topic: 'Tough-on-Crime Laws', stance: 'supported' },
    { id: 'wes_moore', name: 'Wes Moore', office: 'Governor · Maryland', icon: '🦀', topic: 'Enforcement + Prevention', stance: 'mixed' },
  ],
  // Guns: Supported = prevention/safety; Opposed = gun rights; Mixed = targeted.
  'mental-health-gun-violence-prevention-2026': [
    { id: 'tim_walz', name: 'Tim Walz', office: 'Governor · Minnesota', icon: '⭐', topic: 'Background Checks & Red Flag', stance: 'supported' },
    { id: 'kathy_hochul', name: 'Kathy Hochul', office: 'Governor · New York', icon: '🗽', topic: 'Post-Buffalo Gun Laws', stance: 'supported' },
    { id: 'mike_dewine', name: 'Mike DeWine', office: 'Governor · Ohio', icon: '🌰', topic: 'Background Checks + Gun Rights', stance: 'mixed' },
  ],
  // Fentanyl: Supported = enforcement/interdiction; Mixed = enforcement + treatment; Opposed = treatment-first.
  'fentanyl-addiction-overdose-crisis-2026': [
    { id: 'mike_dewine', name: 'Mike DeWine', office: 'Governor · Ohio', icon: '🌰', topic: 'Interdiction + Treatment', stance: 'mixed' },
  ],
  // Learning crisis: Supported = reform/choice/accountability; Opposed = public-school/status-quo; Mixed.
  'learning-crisis-student-achievement-2026': [
    { id: 'sarah_huckabee_sanders', name: 'Sarah Huckabee Sanders', office: 'Governor · Arkansas', icon: '🎀', topic: 'LEARNS Reform', stance: 'supported' },
    { id: 'tim_walz', name: 'Tim Walz', office: 'Governor · Minnesota', icon: '⭐', topic: 'Public-School Investment', stance: 'opposed' },
  ],
  // Veterans: Supported = strong support for veterans/readiness.
  'veterans-military-readiness-recruitment-2026': [
    { id: 'wes_moore', name: 'Wes Moore', office: 'Governor · Maryland', icon: '🦀', topic: 'Veterans’ Services', stance: 'supported' },
  ],
  // Drug prices: Supported = negotiation/caps/public options; Opposed = market/pharma; Mixed.
  'prescription-drug-prices-pharmaceutical-reform-2026': [
    { id: 'jared_polis', name: 'Jared Polis', office: 'Governor · Colorado', icon: '🏔', topic: 'Public Option & Costs', stance: 'supported' },
  ],
  // Reindustrialization: Supported = pro industrial policy/reshoring; Mixed; Opposed.
  'reindustrialization-supply-chains-critical-minerals-2026': [
    { id: 'andy_beshear', name: 'Andy Beshear', office: 'Governor · Kentucky', icon: '🔵', topic: 'EV-Battery Plants & Jobs', stance: 'supported' },
    { id: 'mike_dewine', name: 'Mike DeWine', office: 'Governor · Ohio', icon: '🌰', topic: 'Semiconductors & Jobs', stance: 'supported' },
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
  const newContent = trimmed + '\n            // Next-tier governors — federal wave 21 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
