#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — U.S. House expansion · 6-SEAT TIER (scaffold)
//
// READY-TO-EXECUTE SKELETON. This file pre-stages the 6-seat rung of the
// bottom-up House rollout so it can move the day nominees are confirmed. It
// deliberately contains NO live profiles yet.
//
// Read the playbook first: scripts/SIX-SEAT-STATES.md
//
// Scope (bottom-up by delegation size — the rung ABOVE the 4-/5-seat August wave):
//   The 2020 apportionment leaves EXACTLY three 6-seat states:
//   • Kentucky (6 seats)   — primary May 19, 2026  — CONCLUDED, nominees set
//   • Louisiana (6 seats)  — primary SUSPENDED      — BLOCKED on post-Callais remap
//   • Oregon (6 seats)     — primary May 19, 2026  — CONCLUDED, nominees set
//   (Oklahoma is a 5-seat state — handled in the June/August waves, NOT here.)
//
// BOTTOM-UP DISCIPLINE: finish the 4-seat (Kansas) and 5-seat (Connecticut,
// OK-01) tiers in the August wave before promoting any 6-seat state to authoring.
//
// THE "CONFIRMED NOMINEES ONLY" RULE (as in every prior wave):
//   A district is authored only after its primary settles and BOTH major-party
//   nominees are confirmed. Kentucky/Oregon have settled; Louisiana is BLOCKED
//   (map struck down in Louisiana v. Callais, U.S. House elections postponed —
//   boundaries, numbering, and primary date all unsettled). Until a state's
//   roster is filled, PEOPLE stays empty and the --apply guard refuses to write.
//
// HOW TO USE WHEN A STATE'S NOMINEES ARE CONFIRMED:
//   1. Fill PEOPLE[] with profiles using the TEMPLATE shape below (mirror the
//      worked example in add-house-5seat-states-oklahoma-jun2026.mjs).
//   2. Delete the EMPTY_ROSTER_GUARD block in main().
//   3. Dry run (validates issueKeys), then --emit, then --apply. See the playbook.
//
//   node scripts/add-house-6seat-states-2026.mjs            # dry run + issueKey validation
//   node scripts/add-house-6seat-states-2026.mjs --emit     # write index.html blocks to /tmp
//   node scripts/add-house-6seat-states-2026.mjs --apply    # create docs in the data store
//
// CONTENT_STYLE.md applies to every line authored here: describe what THIS person
// did, said, or pledges — never their party. Vote tallies are plain facts. Record
// each member's own actions as individual records — never batch a party-line vote.
// Do not invent positions or overstate a challenger's record. issueKeys must validate.
// ---------------------------------------------------------------------------

import { writeFileSync, readFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const FORCE = process.argv.includes('--force');
const STAMP = '2026-06-25T00:00:00.000Z'; // bump to the actual authoring date.

// ── Stable structural facts (do NOT depend on the primary result) ────────────
// Pre-staged so the wave is ready instantly. `gate` flags whether a state has
// cleared the "confirmed nominees only" trigger. Re-verify each incumbent is
// actually on the November ballot before authoring — a primary loss (KY-04) or a
// retirement reopens the seat and flips the classification.
const STATES = {
  oregon: {
    label: 'Oregon', seats: 6, primary: '2026-05-19', tier: 'gate-ready',
    gate: 'CONCLUDED — primary settled May 19, 2026; all six incumbents advanced.',
    districts: [
      { cd: 'OR-01', area: 'NW Portland suburbs / north coast (Washington Co.)', incumbent: 'Suzanne Bonamici', incumbentParty: 'D' },
      { cd: 'OR-02', area: 'Eastern + southern Oregon (Bend, Medford) — only R seat', incumbent: 'Cliff Bentz', incumbentParty: 'R' },
      { cd: 'OR-03', area: 'Inner Portland / east Multnomah Co.', incumbent: 'Maxine Dexter', incumbentParty: 'D', note: 'first full term (won 2024 open seat after Blumenauer retired)' },
      { cd: 'OR-04', area: 'Eugene, southwest coast (Lane, Douglas)', incumbent: 'Val Hoyle', incumbentParty: 'D' },
      { cd: 'OR-05', area: 'Portland suburbs → Bend (Clackamas, Deschutes) — MARQUEE', incumbent: 'Janelle Bynum', incumbentParty: 'D', note: 'DCCC Frontline; 2026 R nominee Patti Adair (Deschutes Co. Commissioner). Toss-up/Lean D.' },
      { cd: 'OR-06', area: 'Willamette Valley — Salem (Polk/Yamhill + parts of Marion/Clackamas/Washington)', incumbent: 'Andrea Salinas', incumbentParty: 'D', note: '2026 R nominee David Russ; won 53.3% in 2024.' },
    ],
  },
  kentucky: {
    label: 'Kentucky', seats: 6, primary: '2026-05-19', tier: 'gate-ready',
    gate: 'CONCLUDED — primary settled May 19, 2026. KY-04 incumbent Massie LOST; KY-06 is OPEN — confirm both open-seat nominees.',
    districts: [
      { cd: 'KY-01', area: 'Far western Kentucky (Paducah, Pennyrile)', incumbent: 'James Comer', incumbentParty: 'R', note: 'Oversight Committee chair; running for re-election.' },
      { cd: 'KY-02', area: 'South-central Kentucky (Bowling Green, Elizabethtown)', incumbent: 'Brett Guthrie', incumbentParty: 'R', note: 'Energy & Commerce chair; running for re-election.' },
      { cd: 'KY-03', area: 'Louisville / Jefferson County — only D seat', incumbent: 'Morgan McGarvey', incumbentParty: 'D', note: 'running for re-election, unopposed in primary.' },
      { cd: 'KY-04', area: 'Northern Kentucky (Cincinnati suburbs, Ohio River)', incumbent: 'Thomas Massie', incumbentParty: 'R', note: 'DEFEATED in GOP primary by Ed Gallrein (~54.9–45.1). 2026 R NOMINEE IS GALLREIN — author him as status:candidate, NOT the incumbent.' },
      { cd: 'KY-05', area: 'Eastern Kentucky / Appalachian coalfields (Pikeville, Somerset)', incumbent: 'Harold (Hal) Rogers', incumbentParty: 'R', note: 'Dean of the House (most senior member); ran unopposed in 2024. Re-verify he reaches the general.' },
      { cd: 'KY-06', area: 'Central Kentucky (Lexington, Georgetown, Richmond)', incumbent: null, incumbentParty: null,
        note: 'OPEN — Andy Barr (R) vacated to run for U.S. Senate (won the May 19 GOP Senate primary; faces Charles Booker). 12 filed (7 D / 5 R); DCCC "in play". MOST COMPETITIVE KY House seat — confirm both nominees before authoring.' },
    ],
  },
  louisiana: {
    label: 'Louisiana', seats: 6, primary: 'SUSPENDED', tier: 'BLOCKED (post-Callais remap)',
    gate: 'BLOCKED — Louisiana v. Callais (6–3, Apr 29 2026) struck the map as a racial gerrymander; Gov. Landry suspended the May 16 U.S. House primaries on Apr 30. New map, new primary date, and possibly new district numbering are UNSET. Boundaries below are the 2024 map ONLY.',
    districts: [
      { cd: 'LA-01', area: 'Northshore / suburban Jefferson, SE Louisiana (2024 map)', incumbent: 'Steve Scalise', incumbentParty: 'R', note: 'House Majority Leader.' },
      { cd: 'LA-02', area: 'New Orleans → Baton Rouge corridor — majority-Black (2024 map)', incumbent: 'Troy Carter', incumbentParty: 'D', note: 'could be reshaped by the remap.' },
      { cd: 'LA-03', area: 'Acadiana — Lafayette, Lake Charles (2024 map)', incumbent: 'Clay Higgins', incumbentParty: 'R' },
      { cd: 'LA-04', area: 'Northwest — Shreveport, west-central (2024 map)', incumbent: 'Mike Johnson', incumbentParty: 'R', note: 'Speaker of the House.' },
      { cd: 'LA-05', area: 'Northeast / central — Monroe, Alexandria (2024 map)', incumbent: 'Julia Letlow', incumbentParty: 'R' },
      { cd: 'LA-06', area: 'Baton Rouge ↔ Shreveport — 2nd majority-Black district (2024 map)', incumbent: 'Cleo Fields', incumbentParty: 'D', note: 'The district AT THE CENTER of Callais — most likely to be redrawn or eliminated.' },
    ],
  },
};

// ── TEMPLATE — the exact shape each confirmed profile must take ──────────────
// Copy this per nominee into PEOPLE[]. Mirror a worked incumbent and challenger
// from add-house-5seat-states-oklahoma-jun2026.mjs. This is documentation only;
// it is NOT pushed (PEOPLE is what gets written).
const TEMPLATE = {
  id: 'snake_case_id', name: 'Full Name', party: 'Republican | Democratic',
  state: 'Kentucky | Louisiana | Oregon',
  district: 'Oregon — 5th District',
  status: 'office | candidate',          // 'office' = sitting member seeking re-election
  candidacyStatus: 'active',
  rank: 'nominee',                       // omit for incumbents
  nextElection: '2026-11-03', icon: '🏛', score: 50,
  office: '🏛 U.S. Representative — State (Nth District)  |  U.S. House — 2026 <Party> Nominee (State Nth District)',
  bio: 'Real, sourced biography. No placeholders.',
  keyIssues: ['Issue', 'Issue', 'Issue', 'Issue'],
  accountability: { overallScore: 50, summary: 'Neutral, record-based summary.' },
  promises: [
    // verdict 'kept' ONLY for a documented completed action with a citation.
    { title: 'Pledge', verdict: 'pending', issueKey: 'border_security', detail: 'What they pledge/did.', sources: ['https://…'] },
  ],
  positions: [
    { topic: 'Topic', icon: '🛡', pos: 'support', issueKey: 'border_security', issueStance: 'support',
      text: 'Documented stance.', evidence: 'Optional verifiable specific.', source: { label: 'House.gov', url: 'https://…' } },
  ],
  spotlight: [
    // Preferred for incumbents: a recorded vote, sponsored bill, or committee role.
    { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'border_security',
      headline: 'Short, factual headline', facts: 'One-sentence sourced fact.', why: 'Why it matters for the individual.',
      source: { label: 'House Clerk', url: 'https://…' } },
  ],
};

// ── The roster — EMPTY until nominees are confirmed ──────────────────────────
// Fill with TEMPLATE-shaped objects, then delete the EMPTY_ROSTER_GUARD in main().
const PEOPLE = [];

// ── Firestore value encoder / helpers (same as the prior waves) ──────────────
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
function counts(promises) {
  return {
    kept: promises.filter(x => x.verdict === 'kept').length,
    broken: promises.filter(x => x.verdict === 'broken').length,
    pending: promises.filter(x => x.verdict === 'pending').length,
  };
}
function promisesDoc(promises) {
  return promises.map(pr => ({
    title: pr.title, detail: pr.detail, verdict: pr.verdict, issueKey: pr.issueKey,
    sources: (pr.sources || []).map(u => ({ label: 'Source', url: u })),
  }));
}
function buildDoc(p) {
  const { kept, broken, pending } = counts(p.promises);
  const stances = {};
  for (const c of p.positions) stances[c.topic] = c.text;
  const fields = {
    name: p.name, office: p.office, party: p.party, state: p.state, icon: p.icon, bio: p.bio,
    keyIssues: p.keyIssues, promises: promisesDoc(p.promises), stances,
    accountability: { overallScore: p.accountability.overallScore, summary: p.accountability.summary, kept, broken, pending },
    kept, broken, pending, score: p.score, tier: tierForScore(p.score),
    profileStatus: 'full', candidacyStatus: p.candidacyStatus, nextElection: p.nextElection, updatedAt: STAMP,
  };
  if (p.district) fields.district = p.district;
  if (p.rank) fields.rank = p.rank;
  if (p.spotlight) fields.spotlight = p.spotlight;
  if (p.candidacyOutcome) fields.candidacyOutcome = p.candidacyOutcome;
  return fields;
}
async function exists(id) { const r = await fetch(`${BASE}/${id}`); return r.ok; }
async function createDoc(id, fields) {
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`create ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

// ── Emit the index.html blocks (parity with the hand-applied edits) ──────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emitStanceBlock() {
  const out = ['    // ── 6-seat tier · Kentucky / Louisiana / Oregon ──'];
  for (const p of PEOPLE) {
    out.push(`    ${p.id}: [ // ${p.name} — ${p.office}`);
    for (const c of p.positions) {
      const parts = [`topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`, `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`];
      if (c.evidence) parts.push(`evidence:'${esc(c.evidence)}'`);
      if (c.source) parts.push(`source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`);
      out.push(`      { ${parts.join(', ')} },`);
    }
    out.push('    ],');
  }
  return out.join('\n');
}
function emitSpotlightBlock() {
  const out = ['      // ── 6-seat tier · Kentucky / Louisiana / Oregon ──'];
  for (const p of PEOPLE) {
    if (!p.spotlight) continue;
    out.push(`      ${p.id}: [`);
    for (const s of p.spotlight) {
      const tags = (s.tags || []).map(t => `'${esc(t)}'`).join(',');
      out.push(`        { impact:'${s.impact}', category:'${s.category}', date:'${esc(s.date)}', tags:[${tags}], issueKey:'${s.issueKey}',`);
      out.push(`          headline:'${esc(s.headline)}',`);
      out.push(`          facts:'${esc(s.facts)}',`);
      out.push(`          why:'${esc(s.why)}',`);
      out.push(`          source:{ label:'${esc(s.source.label)}', url:'${esc(s.source.url)}' } },`);
    }
    out.push('      ],');
  }
  return out.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`PolitiDex — 6-seat tier (scaffold)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);

  // Show the staged structural plan so a dry run is useful even before authoring.
  console.log('Staged 6-seat states (structural facts — confirm the gate before authoring):');
  for (const key of Object.keys(STATES)) {
    const s = STATES[key];
    console.log(`  • ${s.label} — ${s.seats}-seat · ${s.tier} · primary ${s.primary}`);
    console.log(`      gate: ${s.gate}`);
    for (const d of s.districts) {
      const inc = d.incumbent ? `${d.incumbent} (${d.incumbentParty})` : 'OPEN';
      console.log(`      ${d.cd}: ${inc}${d.note ? '  — ' + d.note : ''}`);
    }
  }
  console.log('');

  // Validate every issueKey against the live ISSUE_MAP vocabulary in index.html.
  try {
    const html = readFileSync('index.html', 'utf8');
    const mapSlice = html.slice(html.indexOf('var ISSUE_MAP = {'), html.indexOf('try { window.ISSUE_MAP'));
    const validKeys = new Set([...mapSlice.matchAll(/^\s{6}([a-z_]+):\s+\{ label:/gm)].map(m => m[1]));
    let bad = 0;
    const check = (id, key, where) => { if (!validKeys.has(key)) { console.log(`  ⚠ ${id}: unknown ${where} issueKey '${key}'`); bad++; } };
    for (const p of PEOPLE) {
      for (const c of p.positions) check(p.id, c.issueKey, 'stance');
      for (const pr of p.promises) check(p.id, pr.issueKey, 'promise');
      for (const s of (p.spotlight || [])) check(p.id, s.issueKey, 'spotlight');
    }
    console.log(PEOPLE.length === 0 ? '  (no profiles staged yet — issueKey validation will run once PEOPLE is filled)'
      : (bad ? `  ✗ ${bad} invalid issueKey(s) — fix before applying.` : `  ✓ all issueKeys valid against ISSUE_MAP (${validKeys.size} keys)`));
    if (bad && APPLY) process.exit(1);
  } catch (e) { console.log(`  (issueKey validation skipped: ${e.message})`); }
  console.log('');

  if (EMIT) {
    if (PEOPLE.length === 0) { console.log('Nothing to emit — PEOPLE is empty.\n'); }
    else {
      writeFileSync('/tmp/6seat-stance-block.txt', emitStanceBlock());
      writeFileSync('/tmp/6seat-spotlight-block.txt', emitSpotlightBlock());
      console.log('Wrote ISSUE_STANCE_DATA block → /tmp/6seat-stance-block.txt');
      console.log('Wrote ACCT_SPOTLIGHT block   → /tmp/6seat-spotlight-block.txt\n');
    }
  }

  // ── EMPTY_ROSTER_GUARD ──────────────────────────────────────────────────────
  // Delete this block once PEOPLE is filled with confirmed nominees.
  if (PEOPLE.length === 0) {
    console.log('No profiles staged. This is a scaffold: fill PEOPLE[] with confirmed');
    console.log('nominees (Kentucky & Oregon are gate-ready; Louisiana is BLOCKED until the');
    console.log('post-Callais remap), then remove the EMPTY_ROSTER_GUARD block. Nothing written.');
    return;
  }

  console.log('6-seat tier nominees — new profiles:');
  for (const p of PEOPLE) {
    const fields = buildDoc(p);
    const { kept, broken, pending } = counts(p.promises);
    const tag = `${p.id} (${p.name}) · ${p.party} · ${kept}K/${broken}B/${pending}P · status=${p.candidacyStatus}`;
    if (APPLY) {
      if (!FORCE && await exists(p.id)) { console.log(`  · ${tag}: already exists — skipped`); continue; }
      await createDoc(p.id, fields);
      console.log(`  ✎ ${tag}`);
    } else { console.log(`  → ${tag}`); }
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${PEOPLE.length} new records.`);
})();
