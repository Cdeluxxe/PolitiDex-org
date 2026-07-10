#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Davis County Commission SEAT B (June 2026), the final follow-up
// that closes the last gap in core Wasatch Front local coverage.
//
// The first Davis pass (add-davis-county-2026-jun2026.mjs) authored the Sheriff
// race (Atkin) and Commission Seat A (Harris) but DELIBERATELY HELD Seat B: on
// June 24, two-term incumbent Lorene Kamalu had just been overtaken by challenger
// Susan Lee, and a sub-2-point race that had reversed direction that same
// afternoon did not yet meet the project's "effectively decided" bar.
//
// This pass revisits Seat B against the most recent post-primary count and
// authors the leading nominee only because the race now clears that bar:
//
// STATUS AS OF 2026-06-25 (post-primary count; canvass/certification still pending):
//   COMMISSION SEAT B — Susan Lee (R) leads two-term incumbent Lorene Kamalu (R)
//     50.77% (21,807) to 49.23% (21,142). The trajectory has been monotonic toward
//     Lee at every release — Kamalu +539 (first drop) → Kamalu +42 (election night)
//     → Lee +665 after 5,829 ballots on June 24 — and the only ballots left are
//     provisional and cure ballots, too few to erase a 665-vote margin. That is the
//     SAME standard the project used to author the open Sheriff race in the prior
//     pass (Atkin, +884, lead grown, only provisional/cure remaining). The lone
//     distinguishing feature — a one-time lead change — was Lee steadily closing and
//     overtaking, not an oscillation; the latest count widened her lead, it did not
//     flip it back. Effectively decided → AUTHORED here as the 2026 Republican nominee.
//
//   NEW since the prior pass: this primary no longer settles the seat. Former
//   three-term commissioner Bret Millburn (2007–2018) filed as an UNAFFILIATED
//   candidate, so Lee advances to a CONTESTED November general election. There is
//   no Democrat filed. candidacyStatus 'active' reflects advancing to November.
//
// CLASSIFICATION (mirrors index.html office/candidate handling):
//   • Susan Lee is the CHALLENGER who defeated the sitting incumbent; she is running
//     for a seat she does NOT hold → rank 'nominee', office text "2026 Republican
//     Nominee", candidacyStatus 'active'. The incumbent (Kamalu) is the candidate
//     who trailed and is NOT authored in this pass.
//
// Authored to the same bar as the rest of the roster:
//   • a real, sourced biography (no placeholders);
//   • keyIssues + 5 structured issue stances, each keyed to an exact ISSUE_MAP
//     issueKey (validated below against the live vocabulary in index.html) so the
//     profile lights up Stance at a Glance, the Evidence Locker issue labels, the
//     People's Mandate bridge, and the Alignment Tool;
//   • the candidate-status system: nominee advancing to November → 'active'.
//
// Promises: Lee does not yet hold the office sought, so every promise here is a
// forward-looking campaign pledge and is 'pending'. Score reflects record DEPTH for
// the office being sought, not approval.
//
// CONTENT_STYLE.md: every line describes what THIS individual did, said, or pledges
// — never her party. Vote tallies/outcomes are stated as plain facts.
//
//   node scripts/add-davis-county-seat-b-susan-lee-jun2026.mjs          # dry run + issueKey validation
//   node scripts/add-davis-county-seat-b-susan-lee-jun2026.mjs --emit   # write index.html blocks to /tmp
//   node scripts/add-davis-county-seat-b-susan-lee-jun2026.mjs --apply  # create doc in Firestore
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

const SRC_PROFILE = 'https://www.standard.net/news/2026/jun/02/susan-lee-emphasizes-fiscal-responsibility-in-davis-county-commission-race/';
const SRC_RESULTS = 'https://www.standard.net/news/2026/jun/24/election-results-susan-lee-takes-lead-in-davis-county-commission-race-jon-atkin-grows-lead-in-sheriff-race/';
const SRC_MILLBURN = 'https://www.standard.net/news/local/2026/jun/23/former-davis-county-commissioner-bret-millburn-joins-seat-b-race-as-unaffiliated-candidate/';
const SRC_CONVENTION = 'https://davisgop.org/wp-content/uploads/2026/04/DCRP-Convention-Results-2026.pdf';

// ── The roster ──────────────────────────────────────────────────────────────
const PEOPLE = [

  // ══════════════════ DAVIS COUNTY — Commission Seat B (challenger over incumbent) ══════════════════
  {
    id: 'susan_lee',
    name: 'Susan Lee',
    status: 'candidate',
    rank: 'nominee',
    office: '🏛 Davis County Commission, Seat B · 2026 Republican Nominee',
    icon: '🏛',
    party: 'Republican',
    state: 'Utah',
    candidacyStatus: 'active',
    nextElection: '2026-11-03',
    score: 58,
    why: 'A former Kaysville City Council member and accountant who entered the race over a county property-tax increase and overtook a two-term incumbent in the Republican primary, running on fiscal restraint, line-by-line budget scrutiny, and stronger oversight.',
    bio: 'Susan Lee is the Republican nominee for Davis County Commission Seat B, leading two-term incumbent Lorene Kamalu 50.77% (21,807 votes) to 49.23% (21,142 votes) in the June 23, 2026 primary; after trailing by 42 votes on election night she pulled ahead by 665 as the post-primary count continued, with only provisional and cure ballots remaining. She holds a degree in accounting and helped run and operate a trucking business, handling its bookkeeping and payroll. She served on the Kaysville City Council from 2014 to 2018, where she worked on infrastructure problems, oversaw the city’s power department, and pushed to create a power commission to provide oversight that had not previously existed. Lee entered the commission race after receiving notice of a proposed property-tax increase she considered a red flag; she began attending town halls and commission meetings and met with the county controller before the commission passed a 14.9% property-tax increase, recalling that she thought, “I have to throw my hat in the ring.” She was the Davis County Republican Party’s endorsed candidate coming out of the April 2026 convention. With no Democrat filed, she advances to a November general election against former three-term commissioner Bret Millburn, who filed as an unaffiliated candidate.',
    keyIssues: ['Property Taxes', 'Fiscal Responsibility', 'Government Waste', 'Transparency', 'Budget Oversight'],
    positions: [
      { topic: 'Property Taxes & Fixed-Income Seniors', icon: '🏡', pos: 'support', issueKey: 'property_tax', issueStance: 'support', text: 'Entered the race over a proposed county property-tax increase she called a red flag and opposed the 14.9% increase the commission ultimately passed, arguing officials should look for cuts before raising taxes and stressing the burden on seniors on fixed incomes: “Government needs to make hard choices, too, sometimes, and they’re not.”', evidence: 'Says she attended town halls and commission meetings and met with the county controller before deciding to run; cites her parents, who turned 90, as the fixed-income residents she has in mind.', source: { label: 'Standard-Examiner', url: SRC_PROFILE } },
      { topic: 'Cut Waste Before Raising Taxes', icon: '🧹', pos: 'support', issueKey: 'gov_waste', issueStance: 'support', text: 'Proposes a “service-level solvency test” to identify duplicated services and unneeded positions after finding that nearly 70% of county spending goes to employees, and points to a county animal-care facility three times the size of its predecessor and a plan for two dispatch centers she would consolidate into one.', source: { label: 'Standard-Examiner', url: SRC_PROFILE } },
      { topic: 'Bring Back Fiscal Responsibility', icon: '💰', pos: 'support', issueKey: 'lower_taxes', issueStance: 'support', text: 'Says county “spending has been out of control” and pledges to “bring back fiscal responsibility,” hoping to find room for a possible tax cut while maintaining quality county services.', source: { label: 'Standard-Examiner', url: SRC_PROFILE } },
      { topic: 'Oversight & Open Government', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: 'Points to her Kaysville City Council record of creating a power commission to provide oversight that had not existed before, and says she would press for more openness in how the county commission conducts its business.', evidence: 'On the council she oversaw the city power department and moved to stand up the oversight commission.', source: { label: 'Standard-Examiner', url: SRC_PROFILE } },
      { topic: 'Protecting Core Services', icon: '🏛', pos: 'mixed', issueKey: 'gov_services', issueStance: 'mixed', text: 'Frames her budget scrutiny as protecting rather than gutting core services — saying she wants to maintain quality county services even as she presses every department to justify its cost and headcount.', source: { label: 'Standard-Examiner', url: SRC_PROFILE } },
    ],
    promises: [
      { title: 'Oppose further property-tax increases and shield fixed-income seniors', detail: 'Pledges to resist additional property-tax hikes like the 14.9% increase she opposed and to weigh the burden on residents on fixed incomes before any increase.', verdict: 'pending', issueKey: 'property_tax', sources: [SRC_PROFILE] },
      { title: 'Apply a service-level solvency test to county departments', detail: 'Promises to audit county departments for duplicated services and unneeded positions, citing employee costs near 70% of county spending.', verdict: 'pending', issueKey: 'gov_waste', sources: [SRC_PROFILE] },
      { title: 'Bring back fiscal responsibility and seek room for a tax cut', detail: 'Pledges to rein in what she calls out-of-control spending and look for room to cut taxes while maintaining quality county services.', verdict: 'pending', issueKey: 'lower_taxes', sources: [SRC_PROFILE] },
    ],
    accountability: { overallScore: 58, summary: 'A former Kaysville City Council member and accountant with a documented local-government and budget-oversight record; her county-commission pledges are forward-looking and pending. Overtook a two-term incumbent in the June 2026 primary, with her lead growing to 665 votes and only provisional and cure ballots remaining; certification pending at canvass. Advances to a contested November general against unaffiliated candidate Bret Millburn.' },
    // Evidence Locker (ACCT_SPOTLIGHT) items, authored alongside the stance cards.
    spotlight: [
      { impact: 'positive', category: 'transparency', date: '2014–2018', tags: ['Notable Actions', 'Consistency'], issueKey: 'gov_transparency', headline: 'Stood up a power-commission oversight body on the Kaysville Council', facts: 'On the Kaysville City Council from 2014 to 2018, Lee oversaw the city power department and pushed to create a power commission to provide oversight that had not previously existed.', why: 'A concrete oversight body she helped establish is the record behind her transparency pitch.', source: { label: 'Standard-Examiner', url: SRC_PROFILE } },
      { impact: 'positive', category: 'rhetoric', date: '2026', tags: ['Public Statements', 'Consistency'], issueKey: 'property_tax', headline: 'Entered the race over a county property-tax increase', facts: 'Lee says she received notice of a proposed property-tax increase she considered a red flag, then attended town halls and commission meetings and met with the county controller; the commission went on to pass a 14.9% increase, which she opposed, and she decided to run.', why: 'Her path into the race tracks the tax issue she campaigns on.', source: { label: 'Standard-Examiner', url: SRC_PROFILE } },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'gov_waste', headline: 'Named specific county projects she would trim', facts: 'Lee points to a county animal-care facility three times larger than its predecessor and a plan for two dispatch centers — in Bountiful and Layton — that she would consolidate into one, and says nearly 70% of county spending goes to employees.', why: 'Specific spending targets show how she would apply her budget critique.', source: { label: 'Standard-Examiner', url: SRC_PROFILE } },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'gov_waste', headline: 'Overtook the two-term incumbent as her lead grew through the count', facts: 'Lee won the June 23, 2026 Republican primary for Seat B, leading two-term incumbent Lorene Kamalu 50.77% to 49.23%; after trailing by 42 votes on election night she pulled ahead by 665 as more ballots were counted, with only provisional and cure ballots remaining.', why: 'A lead that grew through the count is the substance of her path to the November ballot.', source: { label: 'Standard-Examiner', url: SRC_RESULTS } },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'gov_transparency', headline: 'Was the party-endorsed candidate from the April convention', facts: 'Lee was the Davis County Republican Party’s endorsed candidate coming out of the April 2026 convention, then led the June primary; with no Democrat filed she advances to a November general against unaffiliated former commissioner Bret Millburn.', why: 'Winning the convention endorsement before the primary is part of her 2026 record.', source: { label: 'Davis County GOP', url: SRC_CONVENTION } },
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

function buildDoc(p) {
  const kept = p.promises.filter(x => x.verdict === 'kept').length;
  const broken = p.promises.filter(x => x.verdict === 'broken').length;
  const pending = p.promises.filter(x => x.verdict === 'pending').length;

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
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`create ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

// ── Emit the index.html ISSUE_STANCE_DATA + ACCT_SPOTLIGHT blocks ─────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emitStance() {
  const out = [];
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
function emitSpotlight() {
  const out = [];
  for (const p of PEOPLE) {
    if (!p.spotlight || !p.spotlight.length) continue;
    out.push(`      ${p.id}: [`);
    for (const s of p.spotlight) {
      const tags = '[' + s.tags.map(t => `'${esc(t)}'`).join(', ') + ']';
      out.push(`        { impact:'${s.impact}', category:'${s.category}', date:'${esc(s.date)}', tags:${tags}, issueKey:'${s.issueKey}',`);
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
  console.log(`PolitiDex — Davis County Commission Seat B (Susan Lee)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);
  let totPos = 0, totProm = 0, withEvid = 0, totSpot = 0;
  for (const p of PEOPLE) { totPos += p.positions.length; totProm += p.promises.length; withEvid += p.positions.filter(c => c.evidence || c.source).length; totSpot += (p.spotlight || []).length; }
  console.log(`${PEOPLE.length} politician · ${totPos} issue positions (${withEvid} with evidence/source) · ${totProm} promises · ${totSpot} evidence items\n`);

  // Validate every issueKey against the live ISSUE_MAP vocabulary in index.html.
  try {
    const html = (await import('fs')).readFileSync('alignment-tool.js', 'utf8');
    const mapSlice = html.slice(html.indexOf('var ISSUE_MAP = {'), html.indexOf('try { window.ISSUE_MAP'));
    const valid = new Set([...mapSlice.matchAll(/^\s{6}([a-z_]+):\s+\{ label:/gm)].map(m => m[1]));
    let bad = 0;
    for (const p of PEOPLE) {
      for (const c of p.positions) if (!valid.has(c.issueKey)) { console.log(`  ⚠ ${p.id}: unknown issueKey '${c.issueKey}'`); bad++; }
      for (const pr of p.promises) if (!valid.has(pr.issueKey)) { console.log(`  ⚠ ${p.id}: unknown promise issueKey '${pr.issueKey}'`); bad++; }
      for (const s of (p.spotlight || [])) if (!valid.has(s.issueKey)) { console.log(`  ⚠ ${p.id}: unknown spotlight issueKey '${s.issueKey}'`); bad++; }
    }
    console.log(bad ? `\n  ✗ ${bad} invalid issueKey(s) — fix before applying.\n` : `  ✓ all issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);
    if (bad && APPLY) process.exit(1);
  } catch (e) { console.log(`  (issueKey validation skipped: ${e.message})`); }

  if (EMIT) {
    writeFileSync('/tmp/davis-seatb-stance-block.txt', emitStance());
    writeFileSync('/tmp/davis-seatb-spotlight-block.txt', emitSpotlight());
    console.log('Wrote ISSUE_STANCE_DATA block → /tmp/davis-seatb-stance-block.txt');
    console.log('Wrote ACCT_SPOTLIGHT block    → /tmp/davis-seatb-spotlight-block.txt\n');
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
  console.log(`\n${APPLY ? 'Created/updated' : 'Would create'} ${PEOPLE.length} record.`);
  if (!APPLY) console.log('Re-run with --emit to write the index.html blocks, --apply to write Firestore.');
})();
