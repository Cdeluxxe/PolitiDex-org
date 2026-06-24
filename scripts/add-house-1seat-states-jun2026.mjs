#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — U.S. House expansion, bottom-up by delegation size (June 2026)
//
// First pass of the smallest-delegation strategy: start with states that send a
// SINGLE at-large member to the U.S. House and add only races where BOTH
// November 2026 general-election nominees are already decided. As of June 24,
// 2026 that means the two single-seat states whose primaries have CONCLUDED:
//
//   • North Dakota (primary June 9, 2026) — Julie Fedorchak (R, incumbent)
//       vs. Trygve Hammer (D-NPL). A confirmed rematch of 2024.
//   • South Dakota (primary June 2, 2026) — Marty Jackley (R) vs. Nikki Gronli
//       (D). An OPEN seat: incumbent Dusty Johnson left it to run for governor.
//
// The other single-seat states are deliberately deferred because their primaries
// have NOT happened yet, so the general-election nominees are not knowable:
//   Vermont (Aug 11), Alaska (Aug 18, top-four), Wyoming (Aug 18), Delaware
//   (Sep 15). Montana is NOT a single-seat state — it gained a second district
//   (MT-01/MT-02) after the 2020 census — so it is out of scope for this pass.
//
// Every record is authored to the same bar as the Utah roster and the first
// federal wave:
//   • a real, sourced biography (no placeholders);
//   • keyIssues + structured issue stances, each keyed to an exact ISSUE_MAP
//     issueKey (validated below against the live 86-key vocabulary in index.html)
//     so the profile lights up Stance at a Glance, the Evidence Locker issue
//     labels, the People's Mandate bridge, and the Alignment Tool;
//   • the candidate-status system: every nominee here advanced to the general,
//     so each carries candidacyStatus 'active'.
//
// CLASSIFICATION (mirrors index.html `_pdxOfficeStatus` / `_pdx2026Candidate`):
//   • A sitting member seeking RE-ELECTION to the same seat is an officeholder
//     (status 'office', green "In Office" badge) and carries nextElection
//     '2026-11-03' so the profile reads as on the 2026 ballot.  → Fedorchak
//   • Anyone running for an office they do NOT currently hold is a 2026 nominee
//     (status 'candidate', rank 'nominee', office text contains "Nominee").
//     → Hammer, Jackley, Gronli
//
// Promises: forward-looking pledges are 'pending'. A promise is 'kept' ONLY when
// it maps to an unambiguous, documented, completed action (a signed/enacted law,
// a recorded vote, a finished executive achievement) with a citation — never a
// campaign aspiration. None of these four has an enacted federal promise to
// cite as kept, so every promise here is pending. Scores reflect record DEPTH
// for the office being sought, not approval.
//
// CONTENT_STYLE.md: every line describes what THIS individual did, said, or
// pledges — never their party. Vote tallies/outcomes are stated as plain facts.
//
//   node scripts/add-house-1seat-states-jun2026.mjs            # dry run + issueKey validation
//   node scripts/add-house-1seat-states-jun2026.mjs --emit     # write index.html ISSUE_STANCE_DATA block to /tmp
//   node scripts/add-house-1seat-states-jun2026.mjs --apply    # create docs in Firestore
//
// Idempotent: a record that already exists is skipped (never clobbered) unless
// --force is passed.
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const FORCE = process.argv.includes('--force');
const STAMP = '2026-06-24T00:00:00.000Z';

// Convenience source builders.
const wiki = (slug, label) => ({ label: label || 'Wikipedia', url: `https://en.wikipedia.org/wiki/${slug}` });
const bp   = (slug, label) => ({ label: label || 'Ballotpedia', url: `https://ballotpedia.org/${slug}` });
const cong = () => ({ label: 'Congress.gov', url: 'https://www.congress.gov' });

// ── The roster ──────────────────────────────────────────────────────────────
// status: 'office' (sitting, re-election) | 'candidate' (nominee for a new seat)
// positions[] become both the ISSUE_STANCE_DATA cards AND the Firestore `stances`
// mirror; promises[] drive kept/broken/pending + the Promise Score.
const PEOPLE = [

  // ══════════════════ NORTH DAKOTA — At-Large (rematch of 2024) ══════════════════

  // ---- Julie Fedorchak (R, incumbent) vs Trygve Hammer (D-NPL) ----
  {
    id: 'julie_fedorchak', name: 'Julie Fedorchak', party: 'Republican', state: 'North Dakota',
    district: 'North Dakota — At-Large', status: 'office', candidacyStatus: 'active',
    nextElection: '2026-11-03', icon: '🏛', score: 60,
    office: '🏛 U.S. Representative — North Dakota (At-Large)',
    bio: "Julie Fedorchak is the U.S. Representative for North Dakota's at-large district, sworn in in " +
      "January 2025 as the first woman ever elected to the U.S. House from North Dakota. A Bismarck-area " +
      "Republican and University of North Dakota journalism graduate, she served 12 years on the North Dakota " +
      "Public Service Commission — chairing it and leading the national utility-regulators' association " +
      "(NARUC) — where she focused on grid reliability, energy permitting, and keeping utility costs low. She " +
      "sits on the Energy and Commerce Committee and is a member of the bipartisan Republican Governance " +
      "Group. She won the June 9, 2026 Republican primary with about 73% over Alex Balazs and faces Democratic-" +
      "NPL nominee Trygve Hammer in a rematch of 2024, when she won the open seat roughly 69%–30%.",
    keyIssues: ['Energy & grid reliability', 'Agriculture', 'Government accountability', 'Health care costs', 'Banning congressional stock trading'],
    accountability: { overallScore: 60, summary:
      "A first-term congresswoman with a deep energy-regulatory background from 12 years on the North Dakota " +
      "Public Service Commission and a seat on Energy and Commerce. The score reflects that record and an " +
      "early House tenure; her 2026 campaign pledges are marked pending until acted on." },
    promises: [
      { title: 'Strengthen grid reliability and expand North Dakota energy', verdict: 'pending', issueKey: 'enviro_energy',
        detail: 'A former Public Service Commissioner who centers electric-grid reliability and energy production; introduced 2025 legislation to phase out wind and solar tax credits she argues threaten grid stability.', sources: ['https://www.congress.gov', 'https://fedorchak.house.gov/meet-julie'] },
      { title: 'Ban members of Congress from trading individual stocks', verdict: 'pending', issueKey: 'stock_trading_ban',
        detail: 'Joined a 2026 bill to bar members of Congress from trading individual stocks; the measure has not become law.', sources: ['https://www.congress.gov'] },
      { title: 'Hold Congress accountable during government shutdowns', verdict: 'pending', issueKey: 'gov_transparency',
        detail: 'After the 2025 government shutdown, said she would move to withhold members of Congress’s pay during future shutdowns.', sources: ['https://fedorchak.house.gov/meet-julie'] },
    ],
    positions: [
      { topic: 'Energy & Grid Reliability', icon: '⚡', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
        text: 'Centers electric-grid reliability and domestic energy production, drawing on 12 years regulating utilities in North Dakota.',
        evidence: 'Chaired the North Dakota Public Service Commission and the national utility-regulators’ association (NARUC); introduced 2025 legislation to phase out wind and solar tax credits she argues threaten grid reliability.', source: cong() },
      { topic: 'Agriculture & Farm Country', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'A fourth-generation North Dakotan with family farm roots who makes agriculture a priority for the at-large district.', source: { label: 'House.gov', url: 'https://fedorchak.house.gov/meet-julie' } },
      { topic: 'Ban Congressional Stock Trading', icon: '🚫', pos: 'support', issueKey: 'stock_trading_ban', issueStance: 'support',
        text: 'Joined a 2026 effort to bar members of Congress from trading individual stocks.', source: cong() },
      { topic: 'Government Accountability', icon: '⚖️', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
        text: 'Proposed withholding members of Congress’s pay during government shutdowns after the 2025 shutdown.', source: { label: 'House.gov', url: 'https://fedorchak.house.gov/meet-julie' } },
      { topic: 'Rural Health Care Costs', icon: '🚑', pos: 'support', issueKey: 'health_rural', issueStance: 'support',
        text: 'Sits on the Energy and Commerce Committee and campaigns on lowering health-care costs and protecting rural access.', source: { label: 'House.gov', url: 'https://fedorchak.house.gov/meet-julie' } },
    ],
  },

  {
    id: 'trygve_hammer', name: 'Trygve Hammer', party: 'Democratic', state: 'North Dakota',
    district: 'North Dakota — At-Large', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 52,
    office: 'U.S. House — 2026 Democratic-NPL Nominee (North Dakota At-Large)',
    bio: "Trygve Hammer is the Democratic-NPL nominee for North Dakota's at-large U.S. House seat, a retired " +
      "U.S. Marine major and U.S. Naval Academy graduate from Velva who flew helicopters and served as a " +
      "platoon commander in Iraq in 2003. After the service he worked in the Bakken oil field, taught high-" +
      "school science in Granville, and most recently worked as a train conductor in Minot. He was the Dem-NPL " +
      "nominee for the seat in 2024, losing to Julie Fedorchak about 30%–69%, and ran again in 2026, winning " +
      "the party endorsement at the March convention and the June 9 primary unopposed after his nearest rival " +
      "withdrew. He campaigns on lowering housing and health-care costs, restoring a North Dakota voice in " +
      "Congress, and reclaiming Congress's authority over tariffs and war powers.",
    keyIssues: ['Cost of living & housing', 'Health care costs', 'Veterans & military', 'Tariffs & trade', 'Congressional oversight'],
    accountability: { overallScore: 52, summary:
      "A retired Marine major and former teacher making his second run for the seat. He has no federal voting " +
      "record, so his positions are campaign pledges and are marked pending; the score reflects that thinner " +
      "record for the office sought, not the strength of his candidacy." },
    promises: [
      { title: 'Restore a North Dakota voice in Congress', verdict: 'pending', issueKey: 'gov_transparency',
        detail: 'Frames his campaign around constituent representation, saying "we have no voice in Congress."', sources: ['https://ballotpedia.org/Trygve_Hammer'] },
      { title: 'Lower housing and health-care costs for North Dakotans', verdict: 'pending', issueKey: 'cost_living',
        detail: 'Argues the incumbent has not delivered on affordable housing and health-care costs.', sources: ['https://northdakotamonitor.com'] },
      { title: 'Reclaim Congress’s authority over tariffs', verdict: 'pending', issueKey: 'econ_trade',
        detail: 'Says Congress must check executive tariff and war-powers decisions affecting North Dakotans.', sources: ['https://northdakotamonitor.com'] },
    ],
    positions: [
      { topic: 'Cost of Living & Housing', icon: '🏠', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Centers everyday costs, especially affordable housing, and argues the incumbent has not delivered on them.', source: { label: 'North Dakota Monitor', url: 'https://northdakotamonitor.com' } },
      { topic: 'Health Care Costs', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Campaigns on lowering health-care costs and protecting access for North Dakota families.', source: { label: 'North Dakota Monitor', url: 'https://northdakotamonitor.com' } },
      { topic: 'Veterans & Military', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support',
        text: 'A retired Marine major focused on service members and veterans.',
        evidence: 'U.S. Naval Academy graduate and Marine helicopter pilot who served as a platoon commander in Iraq in 2003 and retired at the rank of major.', source: bp('Trygve_Hammer') },
      { topic: 'Tariffs & Trade', icon: '🏭', pos: 'oppose', issueKey: 'econ_trade', issueStance: 'oppose',
        text: 'Criticizes the recent tariff approach as harmful to North Dakotans and says Congress should reclaim its authority over tariffs.', source: { label: 'North Dakota Monitor', url: 'https://northdakotamonitor.com' } },
      { topic: 'Congressional Oversight & War Powers', icon: '⚖️', pos: 'support', issueKey: 'restraint', issueStance: 'support',
        text: 'Argues Congress has failed to check the executive on war powers and should reassert that role.', source: { label: 'North Dakota Monitor', url: 'https://northdakotamonitor.com' } },
    ],
  },

  // ══════════════════ SOUTH DAKOTA — At-Large (OPEN seat) ══════════════════

  // ---- Marty Jackley (R) vs Nikki Gronli (D) ----
  // Open seat: incumbent Dusty Johnson left it to run for governor (he lost the
  // June 2 GOP gubernatorial primary). Both House nominees won June 2 outright.
  {
    id: 'marty_jackley', name: 'Marty Jackley', party: 'Republican', state: 'South Dakota',
    district: 'South Dakota — At-Large', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 58,
    office: 'U.S. House — 2026 Republican Nominee (South Dakota At-Large)',
    bio: "Marty Jackley is the Republican nominee for South Dakota's at-large U.S. House seat, the state's " +
      "three-term Attorney General and a former U.S. Attorney for the District of South Dakota. Raised in " +
      "Sturgis, he earned an electrical-engineering degree from the South Dakota School of Mines before a law " +
      "degree from the University of South Dakota, clerked for a federal judge, and was appointed U.S. Attorney " +
      "in 2006 and Attorney General in 2009, serving as AG in 2009–2019 and again from 2023. He chaired the " +
      "National Association of Attorneys General and was named National Attorney General of the Year in 2016. " +
      "He ran for governor in 2018, losing the primary to Kristi Noem. With Rep. Dusty Johnson leaving the seat " +
      "to run for governor, Jackley won the June 2, 2026 Republican primary with about 79% over James Bialota " +
      "and faces Democrat Nikki Gronli in November. He campaigns on fighting crime, stopping fentanyl, and " +
      "rooting out public corruption and wasteful spending.",
    keyIssues: ['Public safety & crime', 'Fentanyl & the border', 'Cutting waste & public corruption', 'Protecting life', 'Second Amendment'],
    accountability: { overallScore: 58, summary:
      "A former U.S. Attorney and three-term state Attorney General with a deep prosecutorial record, but no " +
      "federal legislative voting record. The score reflects that public-service depth for the office sought; " +
      "his campaign pledges are forward-looking and marked pending." },
    promises: [
      { title: 'Crack down on fentanyl and the cartels', verdict: 'pending', issueKey: 'immig_fentanyl',
        detail: 'A career prosecutor who centers fentanyl and methamphetamine trafficking he ties to the southern border.', sources: ['https://martyjackley.com'] },
      { title: 'Fight public corruption and wasteful spending', verdict: 'pending', issueKey: 'gov_waste',
        detail: 'Pledges to take his anti-corruption and prosecutorial record to oversight of federal spending.', sources: ['https://martyjackley.com'] },
      { title: 'Protect the Second Amendment', verdict: 'pending', issueKey: 'gun_rights',
        detail: 'Campaigns as a defender of gun rights.', sources: ['https://martyjackley.com'] },
    ],
    positions: [
      { topic: 'Public Safety & Crime', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support',
        text: 'Runs on a law-and-order record built over decades as a prosecutor.',
        evidence: 'Former U.S. Attorney for South Dakota and three-term state Attorney General; named National Attorney General of the Year in 2016.', source: wiki('Marty_Jackley') },
      { topic: 'Fentanyl & the Border', icon: '🚫', pos: 'support', issueKey: 'immig_fentanyl', issueStance: 'support',
        text: 'Centers fentanyl and methamphetamine trafficking, which he ties to the southern border.', source: { label: 'Campaign', url: 'https://martyjackley.com' } },
      { topic: 'Cut Waste & Public Corruption', icon: '🧹', pos: 'support', issueKey: 'gov_waste', issueStance: 'support',
        text: 'Pledges to bring his anti-corruption prosecutorial record to oversight of federal spending.', source: { label: 'Campaign', url: 'https://martyjackley.com' } },
      { topic: 'Protecting Life', icon: '🤍', pos: 'support', issueKey: 'pro_life', issueStance: 'support',
        text: 'Describes protecting life as part of his conservative record.', source: { label: 'Campaign', url: 'https://martyjackley.com' } },
      { topic: 'Second Amendment', icon: '🔫', pos: 'support', issueKey: 'gun_rights', issueStance: 'support',
        text: 'Campaigns as a defender of gun rights.', source: { label: 'Campaign', url: 'https://martyjackley.com' } },
    ],
  },

  {
    id: 'nikki_gronli', name: 'Nikki Gronli', party: 'Democratic', state: 'South Dakota',
    district: 'South Dakota — At-Large', status: 'candidate', candidacyStatus: 'active',
    rank: 'nominee', nextElection: '2026-11-03', icon: '🏛', score: 52,
    office: 'U.S. House — 2026 Democratic Nominee (South Dakota At-Large)',
    bio: "Nikki Gronli is the Democratic nominee for South Dakota's at-large U.S. House seat, the former South " +
      "Dakota state director for USDA Rural Development (2022–2025) and a former vice chair of the South Dakota " +
      "Democratic Party. From the Dell Rapids area, she runs a marketing firm, Flatlander Strategies, and at " +
      "USDA oversaw federal investments in rural housing, broadband, and infrastructure across the state. She " +
      "won the June 2, 2026 Democratic primary unopposed for an open seat vacated by Rep. Dusty Johnson's run " +
      "for governor, and faces Republican Marty Jackley in November. She campaigns on protecting South Dakota " +
      "farmers from tariff disruptions, expanding rural health care and broadband, and lowering everyday costs, " +
      "while acknowledging the steep climb for a Democrat in a state that last sent one to Washington in 2008.",
    keyIssues: ['Agriculture & farmers', 'Tariffs & trade', 'Rural broadband & infrastructure', 'Health care access', 'Cost of living'],
    accountability: { overallScore: 52, summary:
      "A former USDA Rural Development state director with a record administering rural investment, but no " +
      "elected or legislative voting record. The score reflects that thinner record for the office sought; her " +
      "campaign pledges are forward-looking and marked pending." },
    promises: [
      { title: 'Fight for South Dakota farmers and rural communities', verdict: 'pending', issueKey: 'rural_ag',
        detail: 'A former USDA Rural Development director who makes agriculture and rural investment her central issue.', sources: ['https://southdakotasearchlight.com/2025/09/08/former-usda-appointee-nikki-gronli-announces-democratic-bid-congress/'] },
      { title: 'Reclaim Congress’s voice on tariffs to protect ag markets', verdict: 'pending', issueKey: 'econ_trade',
        detail: 'Argues Congress should reassert tariff authority so South Dakota farmers keep their export markets.', sources: ['https://southdakotasearchlight.com/2025/09/08/former-usda-appointee-nikki-gronli-announces-democratic-bid-congress/'] },
      { title: 'Expand rural health care and broadband access', verdict: 'pending', issueKey: 'healthcare',
        detail: 'Ties health-care access and rural broadband to the investment work she oversaw at USDA.', sources: ['https://southdakotasearchlight.com/2025/09/08/former-usda-appointee-nikki-gronli-announces-democratic-bid-congress/'] },
    ],
    positions: [
      { topic: 'Agriculture & Farmers', icon: '🌾', pos: 'support', issueKey: 'rural_ag', issueStance: 'support',
        text: 'Makes South Dakota agriculture and rural communities her central issue.',
        evidence: 'Served as South Dakota state director for USDA Rural Development (2022–2025), overseeing federal investment in rural housing, broadband, and infrastructure.', source: { label: 'South Dakota Searchlight', url: 'https://southdakotasearchlight.com/2025/09/08/former-usda-appointee-nikki-gronli-announces-democratic-bid-congress/' } },
      { topic: 'Tariffs & Trade', icon: '🏭', pos: 'oppose', issueKey: 'econ_trade', issueStance: 'oppose',
        text: 'Says recent tariff policy is hurting South Dakota farmers and that Congress should reclaim its authority over tariffs to protect their markets.', source: { label: 'South Dakota Searchlight', url: 'https://southdakotasearchlight.com/2025/09/08/former-usda-appointee-nikki-gronli-announces-democratic-bid-congress/' } },
      { topic: 'Rural Broadband & Infrastructure', icon: '📡', pos: 'support', issueKey: 'broadband', issueStance: 'support',
        text: 'Points to her USDA work expanding rural broadband and infrastructure as a model for the district.', source: { label: 'South Dakota Searchlight', url: 'https://southdakotasearchlight.com/2025/09/08/former-usda-appointee-nikki-gronli-announces-democratic-bid-congress/' } },
      { topic: 'Health Care Access', icon: '🏥', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
        text: 'Names health-care access among the concerns driving her candidacy.', source: { label: 'KELOLAND', url: 'https://www.keloland.com/news/local-news/nikki-gronli-running-for-sds-us-house-seat/' } },
      { topic: 'Cost of Living', icon: '🛒', pos: 'support', issueKey: 'cost_living', issueStance: 'support',
        text: 'Frames the economy and everyday costs as central to her case to voters.', source: { label: 'KELOLAND', url: 'https://www.keloland.com/news/local-news/nikki-gronli-running-for-sds-us-house-seat/' } },
    ],
  },

];

// ── Firestore value encoder / helpers ────────────────────────────────────────
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') { const f = {}; for (const [k, val] of Object.entries(v)) f[k] = enc(val); return { mapValue: { fields: f } }; }
  throw new Error('cannot encode value: ' + String(v));
}

function tierForScore(s) { return s >= 70 ? 'silver' : 'gray'; }

// Build the full Firestore document body for one person.
function buildDoc(p) {
  const kept = p.promises.filter(x => x.verdict === 'kept').length;
  const broken = p.promises.filter(x => x.verdict === 'broken').length;
  const pending = p.promises.filter(x => x.verdict === 'pending').length;

  // stances map (topic → text) mirrors the ISSUE_STANCE_DATA cards.
  const stances = {};
  for (const c of p.positions) stances[c.topic] = c.text;

  const promises = p.promises.map(pr => ({
    title: pr.title,
    detail: pr.detail,
    verdict: pr.verdict,
    issueKey: pr.issueKey,
    sources: (pr.sources || []).map(u => ({ label: 'Source', url: u })),
  }));

  const fields = {
    name: p.name,
    office: p.office,
    party: p.party,
    state: p.state,
    icon: p.icon,
    bio: p.bio,
    keyIssues: p.keyIssues,
    promises,
    stances,
    accountability: { overallScore: p.accountability.overallScore, summary: p.accountability.summary, kept, broken, pending },
    kept, broken, pending,
    score: p.score,
    tier: tierForScore(p.score),
    profileStatus: 'full',
    candidacyStatus: p.candidacyStatus,
    nextElection: p.nextElection,
    updatedAt: STAMP,
  };
  if (p.district) fields.district = p.district;
  if (p.rank) fields.rank = p.rank;
  if (p.quote) fields.quote = p.quote;
  if (p.candidacyOutcome) fields.candidacyOutcome = p.candidacyOutcome;
  return fields;
}

async function exists(id) {
  const r = await fetch(`${BASE}/${id}`);
  return r.ok;
}
async function createDoc(id, fields) {
  // PATCH with no updateMask creates the document with the provided fields.
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`create ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

// ── Emit the index.html ISSUE_STANCE_DATA block ──────────────────────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emitBlock() {
  const out = [];
  out.push('    // ── U.S. House expansion · smallest delegations, both nominees set (June 2026) ─');
  out.push('    // Bottom-up by delegation size: single-seat states whose primaries have CONCLUDED.');
  out.push('    // North Dakota (Fedorchak vs Hammer) and South Dakota (Jackley vs Gronli). Each card');
  out.push('    // is keyed to an ISSUE_MAP issue so the profile is comparable in the Alignment Tool');
  out.push("    // and joins Stance at a Glance, the Evidence Locker, and the People's Mandate bridge.");
  for (const p of PEOPLE) {
    out.push(`    ${p.id}: [ // ${p.name} — ${p.office}`);
    for (const c of p.positions) {
      const parts = [`topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`, `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`];
      if (c.detail) parts.push(`detail:'${esc(c.detail)}'`);
      if (c.evidence) parts.push(`evidence:'${esc(c.evidence)}'`);
      if (c.source) parts.push(`source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`);
      out.push(`      { ${parts.join(', ')} },`);
    }
    out.push('    ],');
  }
  return out.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`PolitiDex — U.S. House single-seat-states expansion  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);
  let totPos = 0, totProm = 0, withEvid = 0;
  for (const p of PEOPLE) { totPos += p.positions.length; totProm += p.promises.length; withEvid += p.positions.filter(c => c.evidence || c.source).length; }
  console.log(`${PEOPLE.length} politicians · ${totPos} issue positions (${withEvid} with evidence/source) · ${totProm} promises\n`);

  // Validate every issueKey against the live ISSUE_MAP vocabulary in index.html.
  try {
    const html = (await import('fs')).readFileSync('index.html', 'utf8');
    const mapSlice = html.slice(html.indexOf('var ISSUE_MAP = {'), html.indexOf('try { window.ISSUE_MAP'));
    const valid = new Set([...mapSlice.matchAll(/^\s{6}([a-z_]+):\s+\{ label:/gm)].map(m => m[1]));
    let bad = 0;
    for (const p of PEOPLE) {
      for (const c of p.positions) if (!valid.has(c.issueKey)) { console.log(`  ⚠ ${p.id}: unknown issueKey '${c.issueKey}'`); bad++; }
      for (const pr of p.promises) if (!valid.has(pr.issueKey)) { console.log(`  ⚠ ${p.id}: unknown promise issueKey '${pr.issueKey}'`); bad++; }
    }
    console.log(bad ? `\n  ✗ ${bad} invalid issueKey(s) — fix before applying.\n` : `  ✓ all issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);
    if (bad && APPLY) process.exit(1);
  } catch (e) { console.log(`  (issueKey validation skipped: ${e.message})`); }

  if (EMIT) {
    const f = '/tmp/house-1seat-states-stance-block.txt';
    writeFileSync(f, emitBlock());
    console.log(`Wrote ISSUE_STANCE_DATA block → ${f}\n`);
  }

  for (const p of PEOPLE) {
    const fields = buildDoc(p);
    const tag = `${p.id} (${p.name}) · ${p.party} · ${fields.kept}K/${fields.broken}B/${fields.pending}P · status=${p.candidacyStatus}`;
    if (APPLY) {
      if (!FORCE && await exists(p.id)) { console.log(`  · ${tag}: already exists — skipped`); continue; }
      await createDoc(p.id, fields);
      console.log(`  ✎ ${tag}`);
    } else {
      console.log(`  → ${tag}`);
    }
  }
  console.log(`\n${APPLY ? 'Created/updated' : 'Would create'} ${PEOPLE.length} records.`);
  if (!APPLY) console.log('Re-run with --emit to write the index.html block, --apply to write Firestore.');
})();
