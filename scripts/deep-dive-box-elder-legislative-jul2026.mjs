#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Box Elder County STATE-LEGISLATIVE pass (July 2026)
//
// Goal: finish the northern-Utah picture so Box Elder has parity with Davis and
// Weber at the LEGISLATIVE tier, not just the county tier. Prior Box Elder work
// (deep-dive-box-elder-county batches 1–2) built the county officials and left
// the state-legislative candidates for a dedicated pass — this is that pass.
//
// DISTRICTS THAT COVER BOX ELDER COUNTY (verified against the Box Elder County
// official candidate roster, vote.utah.gov filings, KSL's 2026 legislature
// roster, and the 2026 Utah Senate election record, June–July 2026):
//   • Utah SENATE DISTRICT 1  (Box Elder, Cache, Tooele) — inc. Scott Sandall (R)
//   • Utah HOUSE  DISTRICT 1  (all of Box Elder + NE Cache) — inc. Thomas Peterson (R)
//   • Utah HOUSE  DISTRICT 6  (NW Weber + part of Box Elder incl. eastern
//                              Brigham City) — inc. Rob Bishop (R, seated via the
//                              April 2026 special election for Matthew Gwynn's seat)
//
//   NOTE on the brief's "Senate District 17": no Utah Senate district numbered 17
//   covers Box Elder County. Box Elder's Senate seat is DISTRICT 1 (Sandall). The
//   brief's number appears to be a mislabel; this pass builds the verified
//   District 1 field and says so plainly rather than inventing a "District 17."
//
// 2026-STATUS VERIFICATION (who is actually on the Nov. 3, 2026 general ballot):
//   ACTIVE, NON-INCUMBENT CHALLENGERS covering Box Elder —
//     • Claudia Bigler   (D, Senate 1)     → CREATE (active). Substantive, sourced
//                                             public record: 33-yr Box Elder HS
//                                             educator; education-funding + two-
//                                             party-representation platform;
//                                             Ballotpedia survey; 2024 House-1 run.
//     • Julie Quinlan    (Forward, Senate 1) → TRACKED GAP. Confirmed Forward
//                                             nominee, but NO sourced individual
//                                             policy positions found. Not built.
//     • Chris Reid       (D, House 1)        → TRACKED GAP. Presumptive 2026 D
//                                             nominee (sole D filer; ran 2024 too),
//                                             but NO sourced positions found.
//                                             (Utah Dem Party page spells it "Reed";
//                                             county/Ballotpedia use "Reid".)
//     • Jason O'Dell     (Constitution, House 1) → TRACKED GAP. Filed; no sourced
//                                             positions found. Not built.
//     • James Rich       (Forward, House 6)  → TRACKED GAP. Confirmed Forward
//                                             nominee vs Bishop; no bio/positions
//                                             found. (The Ballotpedia "James Rich"
//                                             page is a DIFFERENT Arizona person —
//                                             do not conflate.) Not built.
//   ELIMINATED / SKIPPED —
//     • Fred Hayes       (R, Senate 1)       → OUT AT CONVENTION (Sandall took the
//                                             GOP nod with ~81% of delegates); his
//                                             write-in bid was disqualified. Not on
//                                             the general ballot → not built.
//   INCUMBENTS (already have records; brief deprioritizes them) —
//     • Scott Sandall (sandall_s) — full profile exists. Not changed here.
//     • Thomas Peterson (thomas_peterson) — stance-only record exists. Not changed.
//     • Rob Bishop (rob_bishop) — stance-only record exists. Not changed. (His
//       cards are unsourced; enrichment is flagged as future work in the tracker.)
//
// HONESTY FRAMING — Bigler is a CHALLENGER with NO legislative voting record, so
// every item is CAMPAIGN PLEDGE / stated platform, labeled as such and tagged
// 'Public Statements'; the two hard facts (her 2024 House-1 loss and her
// confirmed 2026 nomination) are tagged 'Notable Actions' and called record, not
// promise. Her public platform is concentrated on EDUCATION and REPRESENTATION;
// no sourced individual position was found on water / Great Salt Lake, taxes,
// growth, agriculture, or public safety, so NONE is asserted — that gap is stated
// openly in her accountability summary. Nothing is invented; every receipt
// carries a real {label,url} source HTTP-verified during research (KSL, Box Elder
// County .gov, HJ News/Tremonton Leader, Box Elder News Journal, Ballotpedia,
// Wikipedia's 2026 Utah Senate record). The 2024 vote tally is stated as a plain
// fact (CONTENT_STYLE.md); no "party-line" editorializing.
//
//   node scripts/deep-dive-box-elder-legislative-jul2026.mjs            # dry run
//   node scripts/deep-dive-box-elder-legislative-jul2026.mjs --emit     # write ISSUE_STANCE_DATA block to /tmp
//   node scripts/deep-dive-box-elder-legislative-jul2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const STAMP = '2026-07-01T00:00:00.000Z';

// ── Verified sources (HTTP-checked during research, July 2026) ───────────────
const SRC = {
  ksl_roster: { label: 'KSL', url: 'https://www.ksl.com/article/51428770/heres-whos-running-for-the-utah-legislature-in-2026' },
  bec_cand:   { label: 'Box Elder County (official)', url: 'https://www.boxeldercountyut.gov/597/Election-Candidates' },
  hj_filings: { label: 'HJ News / Tremonton Leader', url: 'https://www.hjnews.com/tremonton/news/understanding-elections-candidate-filings-take-shape-for-2026-in-box-elder-county/article_39bbe705-4da4-4e3a-8f10-df83d590c340.html' },
  benews:     { label: 'Box Elder News Journal', url: 'https://www.benewsjournal.com/places/vote-claudia-bigler/' },
  ballotpedia:{ label: 'Ballotpedia', url: 'https://ballotpedia.org/Claudia_Bigler' },
  wiki_sen:   { label: 'Wikipedia — 2026 Utah Senate election', url: 'https://en.wikipedia.org/wiki/2026_Utah_Senate_election' },
};

// ── Curated, sourced data (keyed by Firestore doc id) ────────────────────────
const DATA = {
  // ══════════════════ Claudia Bigler — Democratic nominee, Utah Senate District 1 ══════════════════
  claudia_bigler: {
    create: true,
    name: 'Claudia Bigler',
    office: '🏛 Utah Senate candidate, District 1 (Box Elder, Cache, Tooele)',
    party: 'Democrat', state: 'Utah', icon: '🏛',
    candidacyStatus: 'active',
    nextElection: '2026-11-03',
    score: 50,
    keyIssues: ['Public Education Funding', 'Balanced Two-Party Representation', 'Pragmatic, Civil Governance'],
    bio: "Claudia Bigler is the Democratic nominee for Utah Senate District 1 (Box Elder, Cache, and Tooele counties) in the November 3, 2026 general election, challenging Republican incumbent Scott Sandall; Forward Party candidate Julie Quinlan is also on the ballot. Born in Blackfoot, Idaho and a Brigham Young University graduate, Bigler taught for 33 years — most of them at Box Elder High School — before retiring in 2019, and led the Utah chapter of the American Choral Directors Association, earning Utah's Outstanding Music Educator award in 2016 and induction into the state Music Educators Hall of Fame in 2019. She ran for the Utah House (District 1) in 2024 and lost to Republican Thomas Peterson, 11,677 to 2,552, in a heavily Republican region where she notes GOP margins have run as high as about 88%. She describes herself as 'a retired educator, a grandmother, and a strong believer in community, education, and balanced policies,' and centers her campaign on properly funding public education and on giving a one-party region a genuine two-party choice.",
    acctSummary: "A first-time-officeholder challenger with a long career in the classroom rather than in government, so her entire record here is CAMPAIGN PLEDGE — she has no legislative votes to grade. Her public platform is concentrated and consistent: adequately funding public education (drawn from 33 years teaching at Box Elder High School) and preserving a functioning two-party choice in a district that has voted Republican by margins as high as ~88%. Honest gap: no sourced individual position was found on the issues that dominate this seat's politics — water and the Great Salt Lake, property taxes and the state budget, growth, agriculture, or public safety — so none is attributed to her here. Her one hard, sourced governing-adjacent fact is electoral: a decisive 2024 loss to Thomas Peterson in the neighboring House seat, with backing that year from the Utah Education Association and the Women's Democratic Club of Utah.",
    theme: "A retired 33-year Box Elder High School teacher making a two-party-choice argument in one of Utah's reddest corners — a focused, education-first challenger whose platform is real but narrow, with no voting record yet and no stated position on the water, tax, and growth fights that define the seat.",
    stances: {
      'Public Education Funding': "A retired 33-year Box Elder High School educator, Bigler makes properly funding and supporting public education the center of her platform, saying her classroom years convinced her the state needs 'reasonable laws' for school funding and teacher support. (Campaign pledge — she has no legislative voting record.)",
      'Balanced Two-Party Representation': "Frames her candidacy as an argument for a functioning two-party system in a region she notes has voted Republican by margins as high as about 88%, so residents with different views are not left 'powerless and unrepresented.' (Campaign rationale.)",
      'Pragmatic, Civil Governance': "In a Ballotpedia candidate survey she describes the job as talking through 'difficult problems without pointing fingers' and putting 'the needs of your constituency ahead of your own ambition.' (Stated approach — no record in office to test it against.)",
    },
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'democracy_balance',
        headline: 'Democratic nominee for Utah Senate District 1 in the 2026 general election',
        facts: "Bigler is on the November 3, 2026 ballot for Utah Senate District 1 (Box Elder, Cache, Tooele) against Republican incumbent Scott Sandall and Forward Party candidate Julie Quinlan. Sandall took the Republican nomination at convention with about 81% of delegates; his GOP challenger Fred Hayes was eliminated at convention and a subsequent write-in bid was disqualified, leaving Bigler as the Democratic option in the three-way general.",
        why: "Establishes her confirmed 2026 status — an active general-election challenger, not a primary casualty — and frames the seat she is contesting: the rural Senate district that anchors Box Elder County.",
        source: SRC.ksl_roster },
      { impact: 'positive', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'public_schools',
        headline: 'Runs on properly funding public education after 33 years in the classroom',
        facts: "Bigler taught for 33 years, most of them at Box Elder High School, retiring in 2019. She says those years made her 'passionate about the need for reasonable laws for properly funding and supporting education in Utah,' and education funding is the central plank of her campaign. This is a campaign commitment; she has no legislative record on school appropriations.",
        why: "Records the specific, experience-grounded standard she is asking voters to hold her to on public-education funding — the clearest and most consistent element of her platform.",
        source: SRC.benews },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'democracy_balance',
        headline: 'Casts her candidacy as restoring a real two-party choice in a ~88% GOP county',
        facts: "Bigler says she is motivated by 'an idealistic belief in the need for a functioning two-party system,' arguing that parts of Utah 'function as a one-party state' and that in Box Elder County, where she says Republican vote shares have reached as high as 88%, residents with more liberal leanings can feel 'powerless and unrepresented.' She describes herself as a believer in 'community, education, and balanced policies.'",
        why: "Her core rationale for running is representational rather than issue-by-issue — a candor worth recording, and a reminder that her appeal is pitched at contested-choice, not a specific legislative agenda.",
        source: SRC.hj_filings },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'gov_balance',
        headline: "Describes her approach to office as solving problems 'without pointing fingers'",
        facts: "In a Ballotpedia candidate survey, Bigler said important qualities for an elected official include the ability to 'talk about difficult problems without pointing fingers and work towards reasonable solutions,' and that a core responsibility is 'to put the needs of your constituency ahead of your own ambition.' These are stated principles from a first-time candidate with no voting record to measure them against.",
        why: "Captures the temperament and process standard she sets for herself — useful as a future yardstick, and honestly labeled as aspiration rather than demonstrated conduct.",
        source: SRC.ballotpedia },
      { impact: 'neutral', category: 'voting', date: '2024', tags: ['Notable Actions'], issueKey: 'gov_services',
        headline: 'Lost her 2024 Utah House bid to Thomas Peterson, 11,677 to 2,552',
        facts: "In her most recent race, Bigler was the 2024 Democratic nominee for Utah House District 1 and lost the general election to Republican incumbent Thomas Peterson, 11,677 votes to 2,552, in the district covering Box Elder County and northeastern Cache County. She was endorsed that year by the Utah Education Association and the Women's Democratic Club of Utah. In 2026 she moved up to run for the overlapping Senate District 1 seat.",
        why: "Her one hard electoral record: it sizes the steep partisan hill she is climbing and documents the institutional backing (a teachers' union, a Democratic club) behind her education-first message.",
        source: SRC.ballotpedia },
    ],
    stanceCards: [
      { topic: 'Public Education Funding', icon: '🍎', pos: 'support', issueKey: 'public_schools', issueStance: 'support',
        text: "Campaign pledge: a retired 33-year Box Elder High School teacher who makes 'properly funding and supporting education' the center of her platform. No legislative record yet.", source: SRC.benews },
      { topic: 'Two-Party Representation', icon: '⚖️', pos: 'support', issueKey: 'democracy_balance', issueStance: 'support',
        text: "Campaign rationale: runs to restore a functioning two-party choice in a county she says has voted Republican by margins as high as ~88%, so other views are not left 'unrepresented.'", source: SRC.hj_filings },
      { topic: 'Civil, Pragmatic Governance', icon: '🤝', pos: 'support', issueKey: 'gov_balance', issueStance: 'support',
        text: "Stated approach (Ballotpedia survey): tackle 'difficult problems without pointing fingers,' seek 'reasonable solutions,' and put constituents 'ahead of your own ambition.' Aspiration, not a record.", source: SRC.ballotpedia },
      { topic: '2026 Candidacy Status', icon: '🗳', pos: 'support', issueKey: 'gov_services', issueStance: 'support',
        text: "Confirmed active: the 2026 Democratic nominee for Utah Senate District 1 vs. Sandall (R) and Quinlan (Forward). Previously the 2024 Democratic nominee for House 1, losing to Peterson 11,677–2,552.", source: SRC.ksl_roster },
    ],
  },
};

// ── Tracked honest gaps — NAMED, sourced-as-candidates, NOT built (no positions
//    invented). Printed to console; also documented in the Box Elder tracker. ──
const TRACKED_GAPS = [
  { name: 'Julie Quinlan',  race: 'Forward Party — Utah Senate District 1',       note: "Confirmed Forward nominee vs Sandall (R) and Bigler (D). No sourced individual policy positions or biography found. Named, not built." },
  { name: 'Chris Reid',     race: 'Democrat — Utah House District 1',              note: "Presumptive 2026 Democratic nominee (sole Democratic filer; also ran in 2024). No sourced positions found. Spelling varies (Utah Dem Party lists 'Reed'; county/Ballotpedia use 'Reid') — verify before any build." },
  { name: "Jason O'Dell",   race: 'Constitution Party — Utah House District 1',    note: "Filed for the seat. No sourced positions found. Named, not built." },
  { name: 'James Rich',     race: 'Forward Party — Utah House District 6',          note: "Confirmed Forward nominee vs Bishop (R). No sourced bio/positions found. CAUTION: the Ballotpedia 'James Rich' page is a different Arizona person — do not conflate. Named, not built." },
  { name: 'Fred Hayes',     race: 'Republican — Utah Senate District 1 (ELIMINATED)', note: "Lost the GOP nomination at convention (Sandall ~81% of delegates); write-in bid disqualified. Not on the general ballot. Skipped." },
];

// ── Firestore value codec ────────────────────────────────────────────────────
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') { const f = {}; for (const [k, val] of Object.entries(v)) f[k] = enc(val); return { mapValue: { fields: f } }; }
  throw new Error('cannot encode value: ' + String(v));
}
function dec(v) {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(dec);
  if (v.mapValue !== undefined) { const o = {}; for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = dec(val); return o; }
  return null;
}

// ── Firestore I/O ───────────────────────────────────────────────────────────
async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`fetch ${id}: HTTP ${r.status}`);
  const j = await r.json();
  const o = {};
  for (const [k, v] of Object.entries(j.fields || {})) o[k] = dec(v);
  return o;
}
async function patch(id, fields, { mask = true } = {}) {
  const qs = mask ? '?' + Object.keys(fields).map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&') : '';
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}${qs}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

function tierForScore(s) { return s >= 70 ? 'silver' : 'gray'; }

// Build a full document body for a brand-new challenger profile.
function buildNewDoc(plan) {
  const fields = {
    name: plan.name,
    office: plan.office,
    party: plan.party,
    state: plan.state,
    icon: plan.icon,
    bio: plan.bio,
    keyIssues: plan.keyIssues,
    promises: [],
    stances: plan.stances,
    spotlight: plan.spotlight,
    spotlightTheme: plan.theme,
    accountability: { overallScore: plan.score, summary: plan.acctSummary, kept: 0, broken: 0, pending: 0 },
    kept: 0, broken: 0, pending: 0,
    score: plan.score,
    tier: tierForScore(plan.score),
    profileStatus: 'full',
    candidacyStatus: plan.candidacyStatus,
    updatedAt: STAMP,
  };
  if (plan.nextElection) fields.nextElection = plan.nextElection;
  return fields;
}

// ── Emit the index.html ISSUE_STANCE_DATA block ──────────────────────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emitBlock() {
  const out = [];
  out.push('    // ── Box Elder County state-legislative challengers · July 2026 ───────────────');
  out.push('    // Active 2026 general-election challengers in the districts that cover Box Elder.');
  out.push('    // Only Claudia Bigler (D, Senate 1) clears the sourcing bar for a built record;');
  out.push('    // her cards are all CAMPAIGN PLEDGE (no legislative voting record). The other');
  out.push('    // active challengers (Quinlan, Reid, O\'Dell, Rich) are tracked as honest gaps —');
  out.push('    // named but not built, because no sourced individual positions were found.');
  for (const [id, plan] of Object.entries(DATA)) {
    if (!plan.create || !plan.stanceCards || !plan.stanceCards.length) continue;
    out.push(`    ${id}: [ // ${plan.name} — ${plan.office}`);
    for (const c of plan.stanceCards) {
      const parts = [`topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`, `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`];
      if (c.source) parts.push(`source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`);
      out.push(`      { ${parts.join(', ')} },`);
    }
    out.push('    ],');
  }
  return out.join('\n');
}

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`PolitiDex — Box Elder state-legislative pass (July 2026)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);

  // Validate every issueKey against the live ISSUE_MAP vocabulary.
  try {
    const html = (await import('fs')).readFileSync('alignment-tool.js', 'utf8');
    const mapSlice = html.slice(html.indexOf('var ISSUE_MAP = {'), html.indexOf('window.ISSUE_MAP ='));
    const valid = new Set([...mapSlice.matchAll(/^\s{6}([a-z_]+):\s+\{ label:/gm)].map((m) => m[1]));
    let bad = 0;
    for (const plan of Object.values(DATA)) {
      for (const c of (plan.stanceCards || [])) if (!valid.has(c.issueKey)) { console.log(`  ⚠ ${plan.name}: unknown stanceCard issueKey '${c.issueKey}'`); bad++; }
      for (const it of (plan.spotlight || [])) if (it.issueKey && !valid.has(it.issueKey)) { console.log(`  ⚠ ${plan.name}: unknown spotlight issueKey '${it.issueKey}'`); bad++; }
    }
    console.log(bad ? `\n  ✗ ${bad} invalid issueKey(s) — fix before applying.\n` : `  ✓ all issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);
    if (bad && APPLY) process.exit(1);
  } catch (e) { console.log(`  (issueKey validation skipped: ${e.message})`); }

  if (EMIT) {
    const f = '/tmp/box-elder-legislative-jul2026-stance-block.txt';
    writeFileSync(f, emitBlock());
    console.log(`Wrote ISSUE_STANCE_DATA block → ${f}\n`);
  }

  let created = 0, existed = 0, totSpot = 0, totStance = 0;

  for (const [id, plan] of Object.entries(DATA)) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); continue; }

    if (doc) {
      console.log(`  · ${id} (${plan.name}): already exists — skipping create (this pass only CREATEs)`);
      existed++;
      continue;
    }
    totSpot += plan.spotlight.length;
    totStance += Object.keys(plan.stances).length;
    console.log(`  ${APPLY ? '✎' : '→'} CREATE ${id} (${plan.name}) · ${plan.party} · ${plan.candidacyStatus} · score ${plan.score} · +${plan.spotlight.length} receipt(s), +${Object.keys(plan.stances).length} stance(s), +${plan.stanceCards.length} card(s)`);
    if (APPLY) await patch(id, buildNewDoc(plan), { mask: false });
    created++;
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${created} created (${existed} already existed) · ${totSpot} receipt(s), ${totStance} stance(s).`);

  console.log(`\nTracked honest gaps (named, NOT built — no positions invented):`);
  for (const g of TRACKED_GAPS) console.log(`  – ${g.name} · ${g.race}\n      ${g.note}`);

  if (!APPLY) console.log('\nRe-run with --emit to write the index.html block, --apply to write Firestore.');
})();
