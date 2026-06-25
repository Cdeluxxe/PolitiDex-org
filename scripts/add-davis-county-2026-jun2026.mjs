#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Davis County LOCAL races (June 2026), the Davis-focused follow-up
// to the first Wasatch Front local pass (add-utah-local-2026-jun2026.mjs).
//
// That first pass deliberately DEFERRED all three Davis County races because, on
// June 23 election night, they were each within a few hundred — or a few dozen —
// votes. This pass revisits them after the post-primary count and authors only
// the races whose nominee is now effectively decided.
//
// Scope discipline (same bar as every prior pass): author a race only where the
// November 2026 nominee is CONFIRMED or all-but-confirmed after the June 23, 2026
// primary count. Anything still genuinely too close — or whose lead just flipped —
// is held until canvass, NOT authored to a guess.
//
// STATUS AS OF 2026-06-25 (post-primary count; canvass/certification still pending):
//   SHERIFF — Davis County (OPEN seat; Sheriff Kelly Sparks retiring after 44 yrs)
//     • Jon Atkin (R) leads Aaron Perry 51.05%–48.95% (21,546 vs 20,662). His lead
//       GREW from 237 votes election night to 884 as more ballots were counted, and
//       the only ballots left are provisional and cure ballots — too few to erase
//       it. Effectively decided → AUTHORED here as the 2026 Republican nominee.
//   COMMISSION SEAT A (OPEN seat; Commissioner Bob Stevenson not seeking re-election)
//     • Kendalyn Harris (R) leads a three-way primary 42.84% (18,494) to Scott
//       Fletcher's 31.06% (13,410) and John Adams's 26.10% (11,267) — a ~5,000-vote,
//       ~11.8-point margin. Harris has effectively claimed the nomination and her
//       trailing opponents cannot close that gap on the remaining ballots.
//       Decisive → AUTHORED here as the 2026 Republican nominee.
//
// HELD BACK on purpose (documented in the run summary, NOT authored):
//   • COMMISSION SEAT B — the lead FLIPPED during the count. Two-term incumbent
//     Lorene Kamalu led Susan Lee by 42 votes on election night (50.06%/49.94%);
//     by the June 24 update Lee had overtaken her and led by 665 (50.77%/49.23%).
//     A sub-2-point race that reversed direction mid-count is exactly the kind of
//     unresolved contest this project does not author until certification — even
//     though, with no non-Republican filed, this primary will decide the seat.
//
// CLASSIFICATION (mirrors index.html office/candidate handling):
//   • Both authored candidates are running for offices they do NOT currently hold
//     (Atkin is a sheriff's sergeant; Harris is a former Bountiful mayor), and both
//     seats are open. Each is therefore a 2026 nominee — rank 'nominee', office text
//     contains "Nominee", candidacyStatus 'active' (advancing to November).
//   • No sitting officeholder is authored in this pass (the only Davis incumbent in
//     play, Commissioner Kamalu, is the candidate currently trailing in the held race).
//
// Every record is authored to the same bar as the rest of the roster:
//   • a real, sourced biography (no placeholders);
//   • keyIssues + structured issue stances, each keyed to an exact ISSUE_MAP
//     issueKey (validated below against the live 86-key vocabulary in index.html)
//     so the profile lights up Stance at a Glance, the Evidence Locker issue labels,
//     the People's Mandate bridge, and the Alignment Tool;
//   • the candidate-status system: both nominees advance to November → 'active'.
//
// Promises: forward-looking pledges are 'pending'. Neither candidate yet holds the
// office being sought, so — as with the prior pass's first-time nominees — every
// promise here is a campaign pledge and is 'pending'. Scores reflect record DEPTH
// for the office being sought, not approval.
//
// CONTENT_STYLE.md: every line describes what THIS individual did, said, or pledges
// — never their party. Vote tallies/outcomes are stated as plain facts.
//
//   node scripts/add-davis-county-2026-jun2026.mjs            # dry run + issueKey validation
//   node scripts/add-davis-county-2026-jun2026.mjs --emit     # write index.html ISSUE_STANCE_DATA block to /tmp
//   node scripts/add-davis-county-2026-jun2026.mjs --apply    # create docs in Firestore
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
const STAMP = '2026-06-25T00:00:00.000Z';

// ── The roster ──────────────────────────────────────────────────────────────
// status: 'office' (sitting, re-election) | 'candidate' (nominee for a new seat)
// positions[] become both the ISSUE_STANCE_DATA cards AND the Firestore `stances`
// mirror; promises[] drive kept/broken/pending + the Promise Score.
const PEOPLE = [

  // ══════════════════ DAVIS COUNTY — Sheriff (open seat) ══════════════════
  {
    id: 'jon_atkin',
    name: 'Jon Atkin',
    status: 'candidate',
    rank: 'nominee',
    office: '🛡 Sheriff — Davis County, Utah · 2026 Republican Nominee',
    icon: '🛡',
    party: 'Republican',
    state: 'Utah',
    candidacyStatus: 'active',
    nextElection: '2026-11-03',
    score: 56,
    why: 'A sheriff’s-office sergeant and 14-year military intelligence officer who won the open-seat Republican primary to succeed retiring Sheriff Kelly Sparks, running on recruitment, accountability, and adapting policing to emerging threats.',
    bio: 'Jon Atkin is the Republican nominee for Davis County Sheriff, leading Aaron Perry 51.05%–48.95% in the June 2026 primary for the open seat being vacated by Sheriff Kelly Sparks, who is retiring after a 44-year law-enforcement career. Atkin is a sergeant in the Davis County Sheriff’s Office, where his roughly two decades have moved through court security, patrol, deputy paramedic, criminal investigations, the child-abduction task force, seven to eight years on SWAT, and instructor roles in defensive tactics, firearms, and paramedicine; for the past three and a half years he has served in internal affairs. He brings more than 14 years of military service — commissioned first as an Air Force intelligence officer, then serving as military police in the Utah Army National Guard before returning to the air side as a captain in the Utah Air National Guard, holding a Top Secret/SCI clearance with NATO and Middle East deployments. He earned associate’s and bachelor’s degrees, the latter in criminal justice, from Weber State University. He was endorsed by Utah House Speaker Mike Schultz and advances to the November general election.',
    keyIssues: ['Recruitment & Retention', 'Accountability & Transparency', 'Emerging Threats', 'Backing Deputies', 'Military Service'],
    positions: [
      { topic: 'Recruitment, Retention & Backing Deputies', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support', text: 'Calls staffing his central challenge — noting the office was about 85% staffed and that retention after three years runs near 50% — and pledges to support frontline deputies to fix what he calls “one of the biggest plagues” facing the department.', evidence: 'A sworn sergeant whose career spans court security, patrol, deputy paramedic, criminal investigations, the child-abduction task force, and seven to eight years on SWAT.', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/jun/06/jon-atkin-focusing-on-current-future-challenges-in-bid-for-davis-county-sheriff/' } },
      { topic: 'Accountability & Transparency', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: 'Centers accountability, transparency, and operational excellence drawn from three and a half years in internal affairs, with a focus on raising professional standards and strengthening public confidence in the office.', source: { label: 'Campaign', url: 'https://atkin4sheriff.com/' } },
      { topic: 'Adapting to Emerging Threats', icon: '⚖️', pos: 'support', issueKey: 'justice_balance', issueStance: 'support', text: 'Argues a sheriff must look ahead rather than simply react, and that public safety has to evolve to meet emerging threats such as cybercrime, artificial intelligence, and crimes against children.', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/jun/06/jon-atkin-focusing-on-current-future-challenges-in-bid-for-davis-county-sheriff/' } },
      { topic: 'Stewardship of Taxpayer Dollars', icon: '🧹', pos: 'support', issueKey: 'gov_waste', issueStance: 'support', text: 'Names careful stewardship of taxpayer dollars and collaboration with local leaders among his core priorities for running the countywide office.', source: { label: 'Campaign', url: 'https://atkin4sheriff.com/' } },
      { topic: 'Military Service & Veterans', icon: '🎖', pos: 'support', issueKey: 'veterans', issueStance: 'support', text: 'A captain in the Utah Air National Guard with more than 14 years of service, first commissioned as an Air Force intelligence officer; says his military discipline and leadership shape how he would run the office.', evidence: 'Holds a Top Secret/SCI clearance and has led intelligence teams in NATO and Middle East operations.', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/jun/06/jon-atkin-focusing-on-current-future-challenges-in-bid-for-davis-county-sheriff/' } },
    ],
    promises: [
      { title: 'Tackle deputy recruitment and retention to fully staff the office', detail: 'Pledges to address the staffing shortfall and the roughly 50% three-year retention rate he calls one of the department’s biggest problems.', verdict: 'pending', issueKey: 'back_police', sources: ['https://www.standard.net/news/2026/jun/06/jon-atkin-focusing-on-current-future-challenges-in-bid-for-davis-county-sheriff/'] },
      { title: 'Bring internal-affairs accountability to the whole office', detail: 'Promises to raise professional standards, accountability, and transparency across the Sheriff’s Office.', verdict: 'pending', issueKey: 'gov_transparency', sources: ['https://atkin4sheriff.com/'] },
      { title: 'Modernize the office to confront emerging crime', detail: 'Pledges to position the office to address cybercrime, AI-enabled crime, and crimes against children rather than only react to them.', verdict: 'pending', issueKey: 'justice_balance', sources: ['https://www.standard.net/news/2026/jun/06/jon-atkin-focusing-on-current-future-challenges-in-bid-for-davis-county-sheriff/'] },
    ],
    accountability: { overallScore: 56, summary: 'A first-time countywide candidate with a deep professional law-enforcement and military record but no elected record yet; every campaign pledge is forward-looking and pending. Won an open-seat primary by a margin that grew through the count; certification pending at canvass.' },
  },

  // ══════════════════ DAVIS COUNTY — Commission Seat A (open seat) ══════════════════
  {
    id: 'kendalyn_harris',
    name: 'Kendalyn Harris',
    status: 'candidate',
    rank: 'nominee',
    office: '🏛 Davis County Commission, Seat A · 2026 Republican Nominee',
    icon: '🏛',
    party: 'Republican',
    state: 'Utah',
    candidacyStatus: 'active',
    nextElection: '2026-11-03',
    score: 62,
    why: 'A former two-term Bountiful mayor who ran the city’s budget for more than a decade, winning the open-seat primary on a pitch of fiscal conservatism, regional planning, and restoring south-Davis representation on the commission.',
    bio: 'Kendalyn Harris is the Republican nominee for Davis County Commission Seat A, winning the three-way June 2026 primary with 42.84% (18,494 votes) ahead of Scott Fletcher (31.06%) and John Adams (26.10%) for the open seat being vacated by Commissioner Bob Stevenson. Raised in Bountiful and a Viewmont High School graduate, she earned bachelor’s degrees in political science and communications from the University of Utah. She spent more than a decade in Bountiful city government — eight years on the City Council followed by election as mayor, serving from 2022 to 2026 — and has worked with regional boards across Davis County. Announcing her run with “twelve years is long enough to serve in one place,” she entered the county race noting the commission had not had a representative from the south end of the county in more than eight years. She advances to the November general election.',
    keyIssues: ['Fiscal Conservatism', 'Property Taxes', 'Growth', 'Water', 'Regional Collaboration'],
    positions: [
      { topic: 'Lean, Fiscally Conservative Budgeting', icon: '🧹', pos: 'support', issueKey: 'gov_waste', issueStance: 'support', text: 'Says the county must not spend more than it has, pointing to overseeing the budget of what she calls “a very lean, fiscally conservative city” for 12 years in Bountiful as her model.', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/may/28/south-davis-kendalyn-harris-wants-to-bring-collaboration-to-county-commission/' } },
      { topic: 'Holding the Line on Taxes', icon: '🏡', pos: 'support', issueKey: 'property_tax', issueStance: 'support', text: 'Centers fiscal conservatism and living within the county’s means, drawing on more than a decade overseeing a municipal budget without losing that discipline.', source: { label: 'Campaign', url: 'https://votekendalyn.com/' } },
      { topic: 'Managing Growth', icon: '🏗', pos: 'mixed', issueKey: 'housing_build', issueStance: 'mixed', text: 'Names growth among the county’s central challenges and stresses the commission needs a long-term vision to manage it rather than react to it.', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/may/28/south-davis-kendalyn-harris-wants-to-bring-collaboration-to-county-commission/' } },
      { topic: 'Water & Long-Term Planning', icon: '🚰', pos: 'support', issueKey: 'water', issueStance: 'support', text: 'Lists water alongside budget and growth as the issues facing Davis County and calls for planning ahead so the county’s resources keep pace with its expansion.', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/may/28/south-davis-kendalyn-harris-wants-to-bring-collaboration-to-county-commission/' } },
      { topic: 'Regional Collaboration & Representation', icon: '🏛', pos: 'support', issueKey: 'gov_services', issueStance: 'support', text: 'Pitches collaboration as her core approach — citing more than a decade in municipal government and work with regional boards — and argues the south end of the county has gone unrepresented on the commission for over eight years.', source: { label: 'Davis Journal', url: 'https://www.davisjournal.com/2025/11/26/555965/from-city-hall-to-county-seat-harris-begins-next-chapter' } },
    ],
    promises: [
      { title: 'Keep Davis County living within its means', detail: 'Pledges to bring the lean, fiscally conservative budgeting she practiced as Bountiful mayor to the county and avoid spending beyond its revenue.', verdict: 'pending', issueKey: 'gov_waste', sources: ['https://www.standard.net/news/2026/may/28/south-davis-kendalyn-harris-wants-to-bring-collaboration-to-county-commission/'] },
      { title: 'Set a long-term vision for growth and water', detail: 'Promises to give the commission a forward-looking plan so the county’s growth and water capacity are managed together rather than reactively.', verdict: 'pending', issueKey: 'water', sources: ['https://www.standard.net/news/2026/may/28/south-davis-kendalyn-harris-wants-to-bring-collaboration-to-county-commission/'] },
      { title: 'Restore south-Davis representation and a collaborative commission', detail: 'Pledges to represent the south end of the county and bring a collaborative approach drawn from her municipal and regional-board experience.', verdict: 'pending', issueKey: 'gov_services', sources: ['https://www.davisjournal.com/2025/11/26/555965/from-city-hall-to-county-seat-harris-begins-next-chapter'] },
    ],
    accountability: { overallScore: 62, summary: 'A seasoned municipal executive with a long, documented record running Bountiful’s government and budget; her county-commission pledges are forward-looking and pending. Won the open-seat primary decisively (~11.8 points); certification pending at canvass.' },
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
  if (p.why) fields.why = p.why;
  if (p.district) fields.district = p.district;
  if (p.rank) fields.rank = p.rank;
  if (p.quote) fields.quote = p.quote;
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
  out.push('    // ── Davis County LOCAL races · Sheriff + Commission Seat A (June 2026) ────────');
  out.push('    // Davis-focused follow-up to the first Wasatch Front local pass. The June 23');
  out.push('    // primary count resolved two of the three deferred Davis races: Atkin pulled away');
  out.push('    // in the open Sheriff race and Harris won Commission Seat A decisively. Commission');
  out.push('    // Seat B (Lee/Kamalu) flipped mid-count and is held for canvass. Each card is keyed');
  out.push("    // to an ISSUE_MAP issue so the profile joins Stance at a Glance, the Evidence Locker,");
  out.push("    // the People's Mandate bridge, and the Alignment Tool.");
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
  console.log(`PolitiDex — Davis County local 2026 (Sheriff + County Commission)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);
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
    const f = '/tmp/davis-county-2026-stance-block.txt';
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
