#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — wire the wave-18 federal figures (administration power players &
// influential members) into the "How Politicians Stand" panels of the relevant
// Issue Spotlights (July 2026). Stances follow each panel's axis note (verified
// against existing rows). Idempotent.
//   node scripts/wire-national-wave18-spotlights-jul2026.mjs            # dry run
//   node scripts/wire-national-wave18-spotlights-jul2026.mjs --apply    # write
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
    { id: 'tom_homan', name: 'Tom Homan', office: 'White House Border Czar', icon: '🛂', topic: 'Border Crackdown', stance: 'supported' },
    { id: 'dan_crenshaw', name: 'Dan Crenshaw', office: 'U.S. Representative · Texas', icon: '🎖', topic: 'Enforcement & Tech', stance: 'supported' },
    { id: 'marie_gluesenkamp_perez', name: 'Marie Gluesenkamp Perez', office: 'U.S. Representative · Washington', icon: '🔧', topic: 'Security + Legal Immigration', stance: 'mixed' },
  ],
  // Deportations: Supported = pro mass deportation/interior enforcement; Opposed = against.
  'mass-deportations-immigration-enforcement-2026': [
    { id: 'tom_homan', name: 'Tom Homan', office: 'White House Border Czar', icon: '🛂', topic: 'Mass Deportations & ICE', stance: 'supported' },
  ],
  // Fentanyl: Supported = enforcement/interdiction; Mixed = enforcement + treatment; Opposed = treatment-first.
  'fentanyl-addiction-overdose-crisis-2026': [
    { id: 'tom_homan', name: 'Tom Homan', office: 'White House Border Czar', icon: '🛂', topic: 'Cartels & Interdiction', stance: 'supported' },
  ],
  // Tariffs: Supported = pro-tariff; Mixed = targeted; Opposed = free-trade.
  'tariffs-cost-of-living-inflation': [
    { id: 'peter_navarro', name: 'Peter Navarro', office: 'Senior Counselor for Trade & Manufacturing', icon: '🏭', topic: 'Tariff Architect', stance: 'supported' },
    { id: 'stephen_miran', name: 'Stephen Miran', office: 'Chair, Council of Economic Advisers', icon: '📈', topic: 'Trade Rebalancing', stance: 'supported' },
  ],
  // Trade/reshoring: Supported = reshoring/protectionist; Mixed; Opposed = free-trade.
  'trade-policy-reshoring-supply-chain-2026': [
    { id: 'peter_navarro', name: 'Peter Navarro', office: 'Senior Counselor for Trade & Manufacturing', icon: '🏭', topic: 'Reshoring & Tariffs', stance: 'supported' },
    { id: 'stephen_miran', name: 'Stephen Miran', office: 'Chair, Council of Economic Advisers', icon: '📈', topic: 'Trade & the Dollar', stance: 'supported' },
  ],
  // Reindustrialization: Supported = pro industrial policy/reshoring; Mixed; Opposed.
  'reindustrialization-supply-chains-critical-minerals-2026': [
    { id: 'peter_navarro', name: 'Peter Navarro', office: 'Senior Counselor for Trade & Manufacturing', icon: '🏭', topic: 'Bring Factories Home', stance: 'supported' },
    { id: 'marie_gluesenkamp_perez', name: 'Marie Gluesenkamp Perez', office: 'U.S. Representative · Washington', icon: '🔧', topic: 'Working-Class Manufacturing', stance: 'supported' },
  ],
  // Ukraine: Supported = robust aid; Mixed = conditional/peace-focused; Opposed = cut aid.
  'ukraine-russia-war-us-aid-peace-2026': [
    { id: 'keith_kellogg', name: 'Keith Kellogg', office: 'Special Envoy for Ukraine & Russia', icon: '🎖', topic: 'Negotiated Settlement', stance: 'mixed' },
    { id: 'dan_crenshaw', name: 'Dan Crenshaw', office: 'U.S. Representative · Texas', icon: '🎖', topic: 'Continue Military Aid', stance: 'supported' },
    { id: 'seth_moulton', name: 'Seth Moulton', office: 'U.S. Representative · Massachusetts', icon: '🎖', topic: 'Stand With Allies', stance: 'supported' },
  ],
  // Israel aid: Supported = robust aid/alliance; Mixed = support + conditions; Opposed = reduce.
  'us-israel-relations-foreign-aid-partnership-2026': [
    { id: 'keith_kellogg', name: 'Keith Kellogg', office: 'Special Envoy for Ukraine & Russia', icon: '🎖', topic: 'Alliance & Iran', stance: 'supported' },
    { id: 'josh_gottheimer', name: 'Josh Gottheimer', office: 'U.S. Representative · New Jersey', icon: '🤝', topic: 'Security Aid & Alliance', stance: 'supported' },
  ],
  // Israel-Iran: Supported = back Israel vs Iran; Opposed = restraint.
  'us-israel-iran-conflict-2026': [
    { id: 'josh_gottheimer', name: 'Josh Gottheimer', office: 'U.S. Representative · New Jersey', icon: '🤝', topic: 'Hard Line on Iran', stance: 'supported' },
  ],
  // China/Taiwan: Supported = robust deterrent/Taiwan; Mixed; Opposed = restraint.
  'china-taiwan-tensions-us-defense-2026': [
    { id: 'raja_krishnamoorthi', name: 'Raja Krishnamoorthi', office: 'U.S. Representative · Illinois', icon: '🇨🇳', topic: 'Counter the CCP', stance: 'supported' },
  ],
  // AI: Supported = stronger guardrails; Opposed = light-touch; Mixed = between.
  'ai-regulation-job-displacement-2026': [
    { id: 'raja_krishnamoorthi', name: 'Raja Krishnamoorthi', office: 'U.S. Representative · Illinois', icon: '🇨🇳', topic: 'Guardrails & Export Controls', stance: 'supported' },
    { id: 'seth_moulton', name: 'Seth Moulton', office: 'U.S. Representative · Massachusetts', icon: '🎖', topic: 'AI & National Security', stance: 'supported' },
  ],
  // H-1B / high-skilled immigration: Supported = pro; Opposed = restrict; Mixed.
  'high-skilled-immigration-h1b-visas-2026': [
    { id: 'raja_krishnamoorthi', name: 'Raja Krishnamoorthi', office: 'U.S. Representative · Illinois', icon: '🇨🇳', topic: 'Keep U.S. Talent', stance: 'supported' },
  ],
  // Energy: Supported = reliability-first abundance; Opposed = clean-led; Mixed = clean-first.
  'energy-abundance-grid-reliability-2026': [
    { id: 'dan_crenshaw', name: 'Dan Crenshaw', office: 'U.S. Representative · Texas', icon: '🎖', topic: 'Oil, Gas & Nuclear', stance: 'supported' },
  ],
  // Veterans: Supported = strong support for veterans/readiness.
  'veterans-military-readiness-recruitment-2026': [
    { id: 'dan_crenshaw', name: 'Dan Crenshaw', office: 'U.S. Representative · Texas', icon: '🎖', topic: 'Veterans & Readiness', stance: 'supported' },
    { id: 'seth_moulton', name: 'Seth Moulton', office: 'U.S. Representative · Massachusetts', icon: '🎖', topic: 'Care & Mental Health', stance: 'supported' },
  ],
  // Spending: Supported = cuts/restraint; Opposed = defend spending; Mixed = between.
  'government-spending-debt-entitlement-reform': [
    { id: 'josh_gottheimer', name: 'Josh Gottheimer', office: 'U.S. Representative · New Jersey', icon: '🤝', topic: 'Bipartisan Deals', stance: 'mixed' },
    { id: 'marie_gluesenkamp_perez', name: 'Marie Gluesenkamp Perez', office: 'U.S. Representative · Washington', icon: '🔧', topic: 'Fiscal Responsibility', stance: 'mixed' },
  ],
  // Drug prices: Supported = negotiation/caps; Opposed = market/pharma; Mixed = targeted.
  // (Ossoff deepened — connects his existing drug-prices stance card to this guide.)
  'prescription-drug-prices-pharmaceutical-reform-2026': [
    { id: 'jon_ossoff', name: 'Jon Ossoff', office: 'U.S. Senator · Georgia', icon: '💻', topic: 'Lower Prices & Caps', stance: 'supported' },
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
  const newContent = trimmed + '\n            // Administration power players & influential members — federal wave 18 (July 2026)' + addStr;
  html = html.slice(0, arrOpen + 1) + newContent + html.slice(closeIdx);
  totalAdded += fresh.length;
  console.log(`  ✎ ${slug}: +${fresh.length} (${fresh.map((f) => f.id).join(', ')})`);
}

console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${totalAdded} roster row(s) across ${Object.keys(WIRE).length} spotlights`);
if (APPLY && totalAdded) { fs.writeFileSync(INDEX, html); console.log('  written to index.html'); }
else if (!APPLY) console.log('  Re-run with --apply to write.');
