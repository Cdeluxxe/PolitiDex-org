#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — U.S. House expansion · AUGUST 2026 PRIMARY WAVE (scaffold)
//
// READY-TO-EXECUTE SKELETON. This file pre-stages the next wave so it can move
// the day nominees are confirmed. It deliberately contains NO live profiles yet.
//
// Read the playbook first: scripts/AUGUST-2026-PRIMARY-WAVE.md
//
// Scope (bottom-up by delegation size, continuing the June rollout):
//   • Kansas (4 seats)      — primary Aug 4, 2026  — closes the 4-seat tier
//   • Connecticut (5 seats) — primary Aug 11, 2026 — the other 5-seat state
//   • Oklahoma OK-01        — runoff Aug 25, 2026  — held back from the 5-seat wave
//
// THE "CONFIRMED NOMINEES ONLY" RULE (as in every prior wave):
//   A district is authored only after its primary settles and BOTH major-party
//   nominees are confirmed. For OK-01, also require the GOP runoff result and any
//   withdrawal to be officially resolved. Until then, PEOPLE stays empty and the
//   --apply guard below refuses to write.
//
// HOW TO USE WHEN NOMINEES ARE CONFIRMED:
//   1. Fill PEOPLE[] with profiles using the TEMPLATE shape below (mirror the
//      worked example in add-house-5seat-states-oklahoma-jun2026.mjs).
//   2. Delete the EMPTY_ROSTER_GUARD block in main().
//   3. Dry run (validates issueKeys), then --emit, then --apply. See the playbook.
//
//   node scripts/add-house-august-2026-primary-wave.mjs            # dry run + issueKey validation
//   node scripts/add-house-august-2026-primary-wave.mjs --emit     # write index.html blocks to /tmp
//   node scripts/add-house-august-2026-primary-wave.mjs --apply    # create docs in Firestore
//
// CONTENT_STYLE.md applies to every line authored here: describe what THIS person
// did, said, or pledges — never their party. Vote tallies are plain facts. Do not
// invent positions or overstate a challenger's record. issueKeys must validate.
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const FORCE = process.argv.includes('--force');
const STAMP = '2026-08-01T00:00:00.000Z'; // bump to the actual authoring date.

// ── Stable structural facts (do NOT depend on the primary result) ────────────
// Pre-staged so the wave is ready instantly. Confirm each incumbent is actually
// seeking re-election before authoring — a retirement reopens the seat and flips
// the classification from 'office' (incumbent) to an open-seat nominee race.
const STATES = {
  kansas: {
    label: 'Kansas', seats: 4, primary: '2026-08-04', tier: '4-seat (closeout)',
    districts: [
      { cd: 'KS-01', area: 'Western/central Kansas — the "Big First" (rural, agricultural)', incumbent: 'Tracey Mann', incumbentParty: 'R' },
      { cd: 'KS-02', area: 'Eastern Kansas (Topeka)',                                          incumbent: 'Derek Schmidt', incumbentParty: 'R' },
      { cd: 'KS-03', area: 'Kansas City suburbs (Johnson/Wyandotte) — most competitive',       incumbent: 'Sharice Davids', incumbentParty: 'D' },
      { cd: 'KS-04', area: 'South-central Kansas (Wichita)',                                    incumbent: 'Ron Estes', incumbentParty: 'R' },
    ],
  },
  connecticut: {
    label: 'Connecticut', seats: 5, primary: '2026-08-11', tier: '5-seat',
    districts: [
      { cd: 'CT-01', area: 'Hartford',                              incumbent: 'John Larson',  incumbentParty: 'D', note: 'senior — verify re-election' },
      { cd: 'CT-02', area: 'Eastern Connecticut',                   incumbent: 'Joe Courtney', incumbentParty: 'D' },
      { cd: 'CT-03', area: 'New Haven',                             incumbent: 'Rosa DeLauro', incumbentParty: 'D', note: 'senior, Appropriations ranking member — verify re-election' },
      { cd: 'CT-04', area: 'Fairfield County / Greenwich',         incumbent: 'Jim Himes',    incumbentParty: 'D', note: 'Intelligence Committee ranking member' },
      { cd: 'CT-05', area: 'Northwest / central CT — most competitive', incumbent: 'Jahana Hayes', incumbentParty: 'D' },
    ],
  },
  oklahoma_ok01: {
    label: 'Oklahoma (OK-01)', seats: 1, primary: '2026-08-25', tier: 'runoff (held from 5-seat wave)',
    districts: [
      { cd: 'OK-01', area: 'Tulsa-anchored — OPEN (Kevin Hern vacated to run for U.S. Senate)',
        incumbent: null, incumbentParty: null,
        note: 'GOP runoff Aug 25 (Tedford ~32% / Lahmeyer ~26%; 2nd-place finisher withdrew) — author only once the Republican nominee is officially settled; also confirm the Democratic nominee.' },
    ],
  },
};

// ── TEMPLATE — the exact shape each confirmed profile must take ──────────────
// Copy this per nominee into PEOPLE[]. Mirror a worked incumbent and challenger
// from add-house-5seat-states-oklahoma-jun2026.mjs. This is documentation only;
// it is NOT pushed (PEOPLE is what gets written).
const TEMPLATE = {
  id: 'snake_case_id', name: 'Full Name', party: 'Republican | Democratic',
  state: 'Kansas | Connecticut | Oklahoma',
  district: 'Kansas — 3rd District',
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
  const out = ['    // ── August 2026 primary wave · Kansas / Connecticut / OK-01 ──'];
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
  const out = ['      // ── August 2026 primary wave · Kansas / Connecticut / OK-01 ──'];
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
  console.log(`PolitiDex — August 2026 primary wave (scaffold)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);

  // Show the staged structural plan so a dry run is useful even before nominees land.
  console.log('Staged sub-waves (structural facts — confirm before authoring):');
  for (const key of Object.keys(STATES)) {
    const s = STATES[key];
    console.log(`  • ${s.label} — ${s.seats}-seat · ${s.tier} · primary ${s.primary}`);
    for (const d of s.districts) {
      const inc = d.incumbent ? `${d.incumbent} (${d.incumbentParty})` : 'OPEN';
      console.log(`      ${d.cd}: ${inc}${d.note ? '  — ' + d.note : ''}`);
    }
  }
  console.log('');

  // Validate every issueKey against the live ISSUE_MAP vocabulary in index.html.
  try {
    const html = (await import('fs')).readFileSync('alignment-tool.js', 'utf8');
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
      writeFileSync('/tmp/august-2026-stance-block.txt', emitStanceBlock());
      writeFileSync('/tmp/august-2026-spotlight-block.txt', emitSpotlightBlock());
      console.log('Wrote ISSUE_STANCE_DATA block → /tmp/august-2026-stance-block.txt');
      console.log('Wrote ACCT_SPOTLIGHT block   → /tmp/august-2026-spotlight-block.txt\n');
    }
  }

  // ── EMPTY_ROSTER_GUARD ──────────────────────────────────────────────────────
  // Delete this block once PEOPLE is filled with confirmed nominees.
  if (PEOPLE.length === 0) {
    console.log('No profiles staged. This is a scaffold: fill PEOPLE[] with confirmed');
    console.log('nominees, then remove the EMPTY_ROSTER_GUARD block. Nothing written.');
    return;
  }

  console.log('August 2026 nominees — new profiles:');
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
