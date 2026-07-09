#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Campaign-finance integrity data refresh (FEC + Utah disclosures)
//
// The "Constituents Over Special Interests" pillar and the Follow-the-Money
// cards are backed by real, itemized campaign-finance breakdowns kept in the
// FTM_FUNDING map in index.html. Each politician's record splits one
// representative cycle into the buckets the FEC itself reports:
//
//     smallDollar  largeIndividual  pac  selfFunded  party   (+ outside level)
//
// Those buckets feed the transparent Constituents-First signal (_financeSignal
// in index.html, documented in FINANCE_INTEGRITY.md). This script helps a
// curator KEEP THOSE NUMBERS CURRENT against the public source of truth.
//
//   node scripts/finance-integrity-refresh.mjs                 # print sourcing plan
//   FEC_API_KEY=xxxx node scripts/finance-integrity-refresh.mjs --fetch
//
// ── HONESTY RULES (matching the rest of the site) ───────────────────────────
//   • This script NEVER edits index.html. It fetches / prints the numbers in
//     the FTM_FUNDING shape so a human can verify them against the live filing
//     and hand-update the map. Nothing unverified ships.
//   • Federal figures come from the FEC (the primary source). State/local
//     figures (e.g. Utah's Governor) come from disclosures.utah.gov and are
//     entered manually — Utah's system has no open JSON API, so this script
//     only prints the direct search URL for those.
//   • "Dark-money"/outside spending is graded as a LEVEL (high/moderate/low/
//     none), never a fabricated exact dollar figure, because independent
//     expenditure is real but hard to attribute precisely.
//
// The FEC endpoint used is the public, documented one:
//   https://api.open.fec.gov/v1/candidate/{FEC_ID}/totals/?api_key=...
// Get a free key at https://api.open.fec.gov/developers/ (or use DEMO_KEY,
// which is heavily rate-limited).
// ---------------------------------------------------------------------------

const FETCH = process.argv.includes('--fetch');
const API_KEY = process.env.FEC_API_KEY || process.env.FEC_KEY || 'DEMO_KEY';

// The tracked roster. `fecId` is the FEC candidate id (federal only). State and
// local officials carry a `stateSource` search URL instead. Keys match the
// PolitiDex roster ids used everywhere else (FTM_FUNDING, FINANCE_INTEGRITY).
const ROSTER = [
  { id: 'trump',   name: 'Donald Trump',  level: 'federal', fecId: 'P80001571' },
  { id: 'lee',     name: 'Mike Lee',      level: 'federal', fecId: 'S0UT00089' },
  { id: 'curtis',  name: 'John Curtis',   level: 'federal', fecId: 'S4UT00189' },
  { id: 'massie',  name: 'Thomas Massie', level: 'federal', fecId: 'H2KY04101' },
  { id: 'owens',   name: 'Burgess Owens', level: 'federal', fecId: 'H0UT04124' },
  { id: 'maloy',   name: 'Celeste Maloy', level: 'federal', fecId: 'H4UT02132' },
  { id: 'kennedy', name: 'Mike Kennedy',  level: 'federal', fecId: 'H4UT03119' },
  { id: 'bmoore',  name: 'Blake Moore',   level: 'federal', fecId: 'H8UT01143' },
  { id: 'gleich',  name: 'Caroline Gleich',level: 'federal', fecId: 'S4UT00195' },
  { id: 'cox',     name: 'Spencer Cox',   level: 'state',
    stateSource: 'https://disclosures.utah.gov/Search/PublicSearch' },
  { id: 'bking',   name: 'Brian King',    level: 'state',
    stateSource: 'https://disclosures.utah.gov/Search/PublicSearch' },
];

// Map a raw FEC /totals row into the FTM_FUNDING bucket shape. The FEC breaks
// individual money into itemized (large) and unitemized (small-dollar), which
// is exactly the split the Constituents-First signal needs.
function toBuckets(t) {
  if (!t) return null;
  return {
    receipts:        Math.round(t.receipts || 0),
    smallDollar:     Math.round(t.individual_unitemized_contributions || 0),
    largeIndividual: Math.round(t.individual_itemized_contributions || 0),
    pac:             Math.round(t.other_political_committee_contributions || 0),
    selfFunded:      Math.round((t.candidate_contribution || 0) + (t.loans_made_by_candidate || 0)),
    party:           Math.round(t.political_party_committee_contributions || 0),
    cycle:           String(t.cycle || ''),
  };
}

async function fetchFEC(fecId) {
  const url = `https://api.open.fec.gov/v1/candidate/${fecId}/totals/` +
    `?api_key=${encodeURIComponent(API_KEY)}&sort=-cycle&per_page=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FEC ${fecId}: HTTP ${res.status}`);
  const json = await res.json();
  return (json.results && json.results[0]) || null;
}

async function main() {
  console.log('PolitiDex — campaign-finance refresh\n');
  console.log(`Mode: ${FETCH ? 'FETCH (FEC live)' : 'PLAN (dry run — pass --fetch to hit the FEC API)'}`);
  console.log(`FEC key: ${API_KEY === 'DEMO_KEY' ? 'DEMO_KEY (rate-limited — set FEC_API_KEY)' : 'set from environment'}\n`);

  for (const p of ROSTER) {
    if (p.level === 'state') {
      console.log(`• ${p.name} [${p.id}] — STATE/LOCAL`);
      console.log(`    Enter manually from Utah disclosures: ${p.stateSource}`);
      console.log('    (Utah has no open JSON API; read the committee summary and fill the buckets by hand.)\n');
      continue;
    }
    if (!FETCH) {
      console.log(`• ${p.name} [${p.id}] — FEC ${p.fecId}`);
      console.log(`    https://www.fec.gov/data/candidate/${p.fecId}/\n`);
      continue;
    }
    try {
      const buckets = toBuckets(await fetchFEC(p.fecId));
      if (!buckets) { console.log(`• ${p.name} [${p.id}] — no FEC totals returned\n`); continue; }
      console.log(`• ${p.name} [${p.id}] — paste into FTM_FUNDING after verifying:`);
      console.log(`    ${p.id}: ${JSON.stringify(buckets)},\n`);
    } catch (err) {
      console.log(`• ${p.name} [${p.id}] — fetch failed: ${err.message}\n`);
    }
  }

  console.log('Next: verify each figure against the linked filing, then update FTM_FUNDING');
  console.log('in index.html. Re-check the computed scores against FINANCE_INTEGRITY.md.');
}

main().catch((err) => { console.error(err); process.exit(1); });
