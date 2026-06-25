#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Utah LOCAL 2026 DEEPENING · WAVE 2 (June 2026)
//
// Second deepening pass over the ten Wasatch Front local Sheriff and County-
// Commission profiles. The first pass (deepen-utah-local-2026-jun2026.mjs) gave
// each profile its first Connected-Evidence layer. This pass ADDS a further
// layer of sourced evidence on top of that, with the Davis County newcomers
// (Jon Atkin, Kendalyn Harris) prioritized, then the Salt Lake / Utah / Weber
// incumbents and nominees.
//
// What this wave adds — all independently re-verified against the cited source
// before being written (one item from the research set was dropped because the
// quote traced to a chief deputy, not the sheriff):
//
//   1. spotlightAdd[]   — NEW Connected-Evidence items APPENDED to each profile's
//                         existing spotlight[] (not a replace). 16 new items.
//                           • Rivera: national Council on Criminal Justice task
//                             force; her 2017 divert-from-jail statement.
//                           • Smith: Utah Sheriffs' Association leadership; FBI
//                             National Academy / UVU credentials / prior chief.
//                           • Kaufusi: BYU Alumni Achievement Award; the debt-
//                             free airport terminal vs. the bonded public-safety
//                             building (rhetoric-vs-reality nuance).
//                           • Spencer: April 2026 convention result.
//                           • Beesley: the ballot-eligibility suit a judge
//                             dismissed "in whole."
//                           • Kearsley: 29-year construction-owner background.
//                           • Arbon: 2021 "Lawman of the Year"; the rejected
//                             $98M 2023 jail/justice bond; the scaled-back
//                             $1.8M jail-health design in the 2025 budget.
//                           • Atkin: April convention endorsement win; his
//                             concurrent sheriff / Air Guard / fire-service roles.
//                           • Harris: her signature-gathering path after falling
//                             short at convention; her regional board service.
//
//   2. stanceEvidence[] — sourced `evidence:` notes added to EXISTING Stance-at-a-
//                         Glance cards (same source as the card). 5 strengthenings:
//                         Atkin (retention figure + intelligence-officer quote),
//                         Harris (spending-priorities quote), Beesley (frugality
//                         quote). These mirror the in-place index.html edits.
//
//   3. accountabilitySummary — refreshed for the incumbents whose documented
//                         record grew this wave (Rivera, Smith, Arbon, Kaufusi).
//
// PROMISES: deliberately UNCHANGED this wave. The one tempting flip — Arbon's
// jail medical/mental-health work — is only a funded *design* step ($1.8M),
// with construction money still unallocated, so moving any pledge to "kept"
// would overstate it. Per the request's bar we do NOT force questionable kepts.
//
// SOURCING DISCIPLINE: every item ties to a working source independently re-read
// this pass — Standard-Examiner, Daily Herald, KSL, KUER, the Utah Sheriffs'
// Association, the Council on Criminal Justice, or the candidate's own site.
// Incumbent in-office actions covered by news are 'positive'; election/convention
// results, awards, and endorsements are 'neutral' context that does not move the
// score. Shane Manwaring gets no new item — his public record stays genuinely
// thin and we do not pad it.
//
// CONTENT_STYLE.md: every line describes what THIS individual did or said; vote
// tallies and outcomes are stated as plain facts, never as party lines.
//
//   node scripts/deepen-utah-local-2026-wave2-jun2026.mjs          # dry run + issueKey validation
//   node scripts/deepen-utah-local-2026-wave2-jun2026.mjs --emit   # write index.html mirror blocks to /tmp
//   node scripts/deepen-utah-local-2026-wave2-jun2026.mjs --apply  # append spotlight + refresh summary in Firestore
// ---------------------------------------------------------------------------

import { writeFileSync, readFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const STAMP = '2026-06-25T00:00:00.000Z';

// Source-label shorthands.
const se   = (url) => ({ label: 'Standard-Examiner', url });
const dh   = (url) => ({ label: 'Daily Herald', url });
const ksl  = (url) => ({ label: 'KSL', url });
const kuer = (url) => ({ label: 'KUER', url });
const ccj  = (url) => ({ label: 'Council on Criminal Justice', url });
const usa  = (url) => ({ label: 'Utah Sheriffs’ Association', url });
const utco = (url) => ({ label: 'Utah County', url });
const vk   = (url) => ({ label: 'Vote Kendalyn', url });

// ── The wave-2 roster ────────────────────────────────────────────────────────
// `id` matches the live Firestore doc id and the index.html ISSUE_STANCE_DATA /
// ACCT_SPOTLIGHT key. spotlightAdd[] is APPENDED to the existing spotlight[].
const WAVE2 = [

  // ══════════════════ SALT LAKE COUNTY — Sheriff (incumbent) ══════════════════
  {
    id: 'rosie_rivera',
    accountabilitySummary:
      'A multi-term incumbent sheriff — the first woman elected sheriff in Utah — with one of the deepest documented ' +
      'records in this roster: the 2024 stand-up of the county’s own Law Enforcement Bureau after the Unified Police ' +
      'split, medication-assisted treatment in the jail, a national Council on Criminal Justice policing task force, ' +
      'and seats on the county’s opioid, gang, and family-justice boards. The score reflects that record; she is ' +
      'running for re-election.',
    spotlightAdd: [
      { impact: 'neutral', category: 'transparency', date: '2020–2026', tags: ['Notable Actions'], issueKey: 'justice_balance',
        headline: 'Took a seat on a national policing task force',
        facts: 'Rivera served as a member of the national Council on Criminal Justice’s Task Force on Policing, a panel of law-enforcement leaders and researchers convened to recommend changes on use of force, accountability, and police–community trust.',
        why: 'A national advisory role extends her record beyond the county and into the policy debates she runs the office within.',
        source: ccj('https://counciloncj.org/ccj-directory/rosie-rivera/') },
      { impact: 'positive', category: 'rhetoric', date: '2017', tags: ['Public Statements', 'Consistency'], issueKey: 'health_mental',
        headline: 'Set a divert-from-jail tone on day one',
        facts: 'On taking office in 2017, Rivera said jail is often the wrong place for mental illness — “We don’t need to book every mentally ill person into jail when we’re interacting with them” — and pledged to work with the mayor and council to find alternatives to incarceration.',
        why: 'An early, on-the-record stance that matches the treatment programs she later built is a words-match-record signal.',
        source: kuer('https://kuer.org/post/rivera-confirmed-salt-lake-county-sheriff-0') },
    ],
  },

  // ══════════════════ UTAH COUNTY — Sheriff (incumbent) ══════════════════
  {
    id: 'mike_smith_sheriff',
    accountabilitySummary:
      'A multi-term sheriff with one of the deepest documented local records in this roster — transparency measures, ' +
      'jail-rehabilitation programs, and deputy-wellness initiatives all tied to concrete actions, statewide ' +
      'leadership as a past president of the Utah Sheriffs’ Association, and the office that led the response in his ' +
      'county to the September 2025 Utah Valley University shooting. The score reflects that record.',
    spotlightAdd: [
      { impact: 'neutral', category: 'rhetoric', date: '2024–2026', tags: ['Notable Actions', 'Leadership Style'], issueKey: 'gov_services',
        headline: 'Led the statewide sheriffs’ association',
        facts: 'Smith served as president of the Utah Sheriffs’ Association and is now listed as its immediate past president — a statewide role among Utah’s 29 sheriffs, with Kane County’s Tracy Glover the current president.',
        why: 'A leadership post among his peers extends the experience he runs on beyond his own county.',
        source: usa('https://utahsheriffs.org/about/our-team') },
      { impact: 'neutral', category: 'rhetoric', date: '2011–2012', tags: ['Notable Actions'], issueKey: 'back_police',
        headline: 'FBI National Academy graduate and former city police chief',
        facts: 'Smith graduated from the FBI National Academy’s 246th session in 2011, earned associate and bachelor’s degrees from Utah Valley University, and served as Pleasant Grove’s police chief in 2012 before being elected Utah County sheriff.',
        why: 'Formal training and a prior command role document the depth behind his 31-year-veteran framing.',
        source: utco('https://www.utahcounty.gov/portfolio/mike-smith') },
    ],
  },

  // ══════════════════ UTAH COUNTY — Commission Seat A (R nominee) ══════════════════
  {
    id: 'michelle_kaufusi',
    accountabilitySummary:
      'A two-term Provo mayor with a deep, well-documented executive record — major capital projects, eight balanced ' +
      'budgets, regional-planning leadership, and a BYU Alumni Achievement Award — carried into an open county-' +
      'commission seat. The record also carries the fiscal nuance she runs on: a debt-free airport terminal alongside ' +
      'a bonded public-safety building. The score reflects that executive record.',
    spotlightAdd: [
      { impact: 'neutral', category: 'rhetoric', date: '2023', tags: ['Notable Actions'], issueKey: 'gov_services',
        headline: 'Honored with BYU’s Alumni Achievement Award',
        facts: 'Brigham Young University presented Kaufusi its Alumni Achievement Award during October 2023 homecoming; in her remarks she called teamwork her “career and life superpower.”',
        why: 'An institutional honor mid-tenure is part of the executive record she carries into the county race.',
        source: dh('https://www.heraldextra.com/news/local/2023/oct/24/provo-mayor-michelle-kaufusi-receives-byu-alumni-achievement-award/') },
      { impact: 'neutral', category: 'rhetoric', date: '2022', tags: ['Rhetoric vs Reality', 'Notable Actions'], issueKey: 'property_tax',
        headline: 'A debt-free airport terminal, and a bonded public-safety building',
        facts: 'Kaufusi opened Provo’s new airport terminal in May 2022 debt-free — “we cut that ribbon with zero debt” — while the city’s $69M City Hall and Public Safety Building, opened that July, was paid for with a voter-approved 2018 bond that added about $10 a month to the average homeowner’s taxes over 20 years.',
        why: 'Distinguishing the cash-funded terminal from the bonded building gives a fuller read of the fiscal record she campaigns on.',
        source: ksl('https://www.ksl.com/article/50433687/provo-celebrates-opening-of-new-69m-city-hall-public-safety-headquarters') },
    ],
  },

  // ══════════════════ UTAH COUNTY — Commission Seat B (R nominee) ══════════════════
  {
    id: 'david_spencer_utco',
    spotlightAdd: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'gov_services',
        headline: 'Advanced from a seven-candidate convention field',
        facts: 'At the April 18, 2026 Utah County Republican convention, Spencer advanced from a seven-candidate Seat B field with 621 delegate votes (52.05%) alongside Carolina Herrin; Isaac Paxman reached the primary by gathering signatures.',
        why: 'Emerging from a crowded convention is the first step of the 2026 path that carried him to the primary.',
        source: dh('https://www.heraldextra.com/news/2026/apr/19/utah-county-republican-party-2026-convention-results/') },
    ],
  },

  // ══════════════════ WEBER COUNTY — Commission Seat B (R nominee) ══════════════════
  {
    id: 'jon_beesley',
    spotlightAdd: [
      { impact: 'neutral', category: 'transparency', date: '2026', tags: ['Notable Actions'], issueKey: 'gov_transparency',
        headline: 'Joined a ballot-eligibility challenge a judge dismissed',
        facts: 'Beesley was one of three commission candidates who filed a May 27, 2026 lawsuit seeking to remove a rival, James Ebert, from the ballot over conflict-of-interest filing questions; on June 4, 2026 a Second District judge denied the petition “in whole,” finding Ebert and the clerk’s office had substantially complied with the election code, and Ebert stayed on the ballot.',
        why: 'A court filing and its outcome are part of his 2026 record, however the challenge was resolved.',
        source: ksl('https://www.ksl.com/article/51507121/denied-in-whole-judge-tosses-lawsuit-clears-weber-county-commission-hopeful-election-office') },
    ],
    stanceEvidence: [
      { match: 'Says Plain City saved nearly $5 million', issueKey: 'gov_waste',
        evidence: 'Frames it as buying used or renting over new and skipping showpiece projects: “I didn’t build a big building … My contribution was being fiscally responsible.”',
        source: se('https://www.standard.net/news/2026/may/18/jon-beesley-sees-disconnect-between-weber-county-commission-and-its-cities-residents/') },
    ],
  },

  // ══════════════════ WEBER COUNTY — Commission Seat A (R nominee) ══════════════════
  {
    id: 'duane_kearsley',
    spotlightAdd: [
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Notable Actions'], issueKey: 'gov_services',
        headline: 'A 29-year construction owner running on hands-on management',
        facts: 'Kearsley says he has owned a construction company for 29 years alongside managing the Weber County Fairgrounds and Golden Spike Event Center, and ties that build-and-budget background to his “boots-on-the-ground” pitch, saying the county “should be the shining light in the state of Utah.”',
        why: 'A private-sector and facilities-management background is the core of the management case he makes, drawn from his own account.',
        source: se('https://www.standard.net/news/2026/jun/01/duane-kearsley-says-hed-like-to-instill-leadership-in-weber-county-commission-seat-a-race/') },
    ],
  },

  // ══════════════════ WEBER COUNTY — Sheriff (incumbent) ══════════════════
  {
    id: 'ryan_arbon',
    accountabilitySummary:
      'An incumbent sheriff with a documented in-office record: the statewide “Lawman of the Year” recognition in ' +
      '2021, a 2023 campaign for a $98M jail and justice-center bond that voters rejected, and the scaled-back ' +
      'jail medical and mental-health design funded in the county’s 2025 budget that followed it — plus the deputy ' +
      'pay and staffing work he backed. The score reflects that record; he is running for re-election. The jail-' +
      'health work remains a funded design step, not a completed build, so no pledge is graded as kept on it.',
    spotlightAdd: [
      { impact: 'neutral', category: 'rhetoric', date: '2021', tags: ['Notable Actions', 'Leadership Style'], issueKey: 'back_police',
        headline: 'Named the state sheriffs’ association “Lawman of the Year”',
        facts: 'The Utah Sheriffs’ Association named Arbon its 2021 “Lawman of the Year”; association president Chad Jensen called him “the sheriff’s sheriff” and “completely selfless,” recounting that Arbon stood alongside line staff during the 2020 unrest in Salt Lake City. His office took home four awards that year.',
        why: 'Recognition from his statewide peers tracks the deputy-backing record he runs on, though it speaks to esteem for him rather than a single action.',
        source: se('https://www.standard.net/news/2021/oct/28/weber-sheriffs-office-wins-state-association-awards/') },
      { impact: 'positive', category: 'voting', date: '2023', tags: ['Notable Actions', 'Leadership Style'], issueKey: 'justice_balance',
        headline: 'Championed a $98M jail and justice-center bond that voters rejected',
        facts: 'Arbon campaigned for a 2023 bond of about $98 million to build a Weber County Justice Center and improve the jail’s medical and mental-health facilities; voters rejected it 57.6% to 42.4% on November 21, 2023. He owned the loss: “We still have the problems. We’ve got to find other ways to address them,” calling it “a heavy lift.”',
        why: 'Putting a major capital plan to voters and publicly owning the defeat is a concrete, documented test of how he runs the office.',
        source: se('https://www.standard.net/news/local/2023/nov/21/weber-county-98m-jail-bond-proposal-headed-to-defeat/') },
      { impact: 'positive', category: 'voting', date: '2024–2025', tags: ['Notable Actions', 'Consistency'], issueKey: 'health_mental',
        headline: 'A scaled-back jail-health plan moved ahead after the bond failed',
        facts: 'After the 2023 bond’s defeat, the county turned to a scaled-back jail medical and mental-health upgrade for the jail Arbon runs; Weber County’s 2025 budget, approved December 17, 2024, set aside $1.8 million for design work, with construction funding still unallocated.',
        why: 'A funded design step after a failed bond keeps the jail-health need Arbon raised moving forward.',
        source: kuer('https://www.kuer.org/politics-government/2024-12-17/weber-countys-2025-budget-has-1-8m-to-design-jail-medical-improvements') },
    ],
  },

  // ══════════════════ DAVIS COUNTY — Sheriff (R nominee · priority) ══════════════════
  {
    id: 'jon_atkin',
    spotlightAdd: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'back_police',
        headline: 'Won the party endorsement at the April convention',
        facts: 'At the April 18, 2026 Davis County Republican convention, Atkin led a four-way field and won the party endorsement, taking the third round of delegate voting over Aaron Perry 55.2% to 44.8%; both advanced to the June primary, and a candidate backed by sitting Sheriff Kelly Sparks was eliminated earlier.',
        why: 'Topping the convention before the primary is the first step of the 2026 path that put him on the November ballot.',
        source: se('https://www.standard.net/news/2026/apr/18/lili-bitner-wins-big-at-davis-county-republican-convention-bob-stevenson-tops-trevor-lee/') },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Notable Actions', 'Leadership Style'], issueKey: 'veterans',
        headline: 'Serves in three uniforms at once',
        facts: 'Alongside nine years in the Davis County Sheriff’s Office, Atkin serves as a captain in the Utah Air National Guard and as a part-time firefighter-paramedic with the North Davis Fire District, and earned criminal-justice degrees and paramedic certification at Weber State University.',
        why: 'Concurrent law-enforcement, military, and fire-service roles document the public-safety breadth he campaigns on.',
        source: se('https://www.standard.net/news/2026/jun/06/jon-atkin-focusing-on-current-future-challenges-in-bid-for-davis-county-sheriff/') },
    ],
    stanceEvidence: [
      { match: 'Calls staffing his central challenge', issueKey: 'back_police',
        note: 'Retention figure folded into the card text: “the loss of three sergeants and a lieutenant in 18 months.”',
        source: se('https://www.standard.net/news/2026/jun/06/jon-atkin-focusing-on-current-future-challenges-in-bid-for-davis-county-sheriff/') },
      { match: 'Argues a sheriff must look ahead', issueKey: 'justice_balance',
        evidence: '“As an Air Force intelligence officer, it’s my job to perceive threats that are coming down the pipe,” he says.',
        source: se('https://www.standard.net/news/2026/jun/06/jon-atkin-focusing-on-current-future-challenges-in-bid-for-davis-county-sheriff/') },
    ],
  },

  // ══════════════════ DAVIS COUNTY — Commission Seat A (R nominee · priority) ══════════════════
  {
    id: 'kendalyn_harris',
    spotlightAdd: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'property_tax',
        headline: 'Reached the ballot by signature after falling short at convention',
        facts: 'Harris did not win the party endorsement at the April 18, 2026 Davis County Republican convention — losing the third-round endorsement vote to Scott Fletcher 53% to 47% — and qualified for the primary by gathering signatures, then led the three-way June primary with 42.84%.',
        why: 'How she reached the ballot — short at convention, then first in the primary — is part of her 2026 record.',
        source: se('https://www.standard.net/news/2026/apr/18/lili-bitner-wins-big-at-davis-county-republican-convention-bob-stevenson-tops-trevor-lee/') },
      { impact: 'neutral', category: 'rhetoric', date: '2022–2026', tags: ['Notable Actions'], issueKey: 'gov_services',
        headline: 'Sat on regional and intergovernmental boards as Bountiful mayor',
        facts: 'As Bountiful mayor, Harris represented the city on regional and intergovernmental bodies — including the Wasatch Front Regional Council and south-Davis special districts such as the South Davis Sewer District and South Davis Metro Fire — the multi-jurisdiction work she puts at the center of her collaboration pitch.',
        why: 'Regional board service is the concrete experience behind the collaboration-first approach she runs on.',
        source: vk('https://votekendalyn.com/') },
    ],
    stanceEvidence: [
      { match: 'Says the county must not spend more than it has', issueKey: 'gov_waste',
        evidence: 'Describes concentrating spending on “streets, clean water, reliable electricity, parks, and law enforcement” and declining nice-to-have requests: “If everything is important, then nothing is.”',
        source: se('https://www.standard.net/news/2026/may/28/south-davis-kendalyn-harris-wants-to-bring-collaboration-to-county-commission/') },
    ],
  },
];

// ── Firestore value encoder / decoder ────────────────────────────────────────
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
  if (!v) return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
  if ('mapValue' in v) { const o = {}; for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = dec(val); return o; }
  return undefined;
}

async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (!r.ok) return null;
  return r.json();
}
async function patchDoc(id, fields) {
  const mask = Object.keys(fields).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${mask}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

// ── Emit the index.html mirror block (parity with the hand-applied edits) ─────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emitSpotlightAppends() {
  const out = ['    // ── Utah LOCAL 2026 · WAVE 2 spotlight appends (June 2026) ──',
               '    // Append each block below to the matching ACCT_SPOTLIGHT[id] array.'];
  for (const d of WAVE2) {
    if (!d.spotlightAdd) continue;
    out.push(`      // ${d.id} (+${d.spotlightAdd.length}):`);
    for (const s of d.spotlightAdd) {
      const tags = (s.tags || []).map(t => `'${esc(t)}'`).join(', ');
      out.push(`        { impact:'${s.impact}', category:'${s.category}', date:'${esc(s.date)}', tags:[${tags}], issueKey:'${s.issueKey}',`);
      out.push(`          headline:'${esc(s.headline)}',`);
      out.push(`          facts:'${esc(s.facts)}',`);
      out.push(`          why:'${esc(s.why)}',`);
      out.push(`          source:{ label:'${esc(s.source.label)}', url:'${esc(s.source.url)}' } },`);
    }
  }
  return out.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`PolitiDex — Utah local 2026 deepening · WAVE 2  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);
  let totSpot = 0, totStance = 0, totSummary = 0;
  for (const d of WAVE2) {
    totSpot += (d.spotlightAdd || []).length;
    totStance += (d.stanceEvidence || []).length;
    if (d.accountabilitySummary) totSummary++;
  }
  console.log(`${WAVE2.length} profiles · ${totSpot} new spotlight items · ${totStance} stance strengthenings · ${totSummary} refreshed summaries\n`);

  // Validate every issueKey against the live ISSUE_MAP vocabulary in index.html.
  try {
    const html = readFileSync('index.html', 'utf8');
    const mapSlice = html.slice(html.indexOf('var ISSUE_MAP = {'), html.indexOf('try { window.ISSUE_MAP'));
    const valid = new Set([...mapSlice.matchAll(/^\s{6}([a-z_]+):\s+\{ label:/gm)].map(m => m[1]));
    let bad = 0;
    for (const d of WAVE2) {
      for (const s of (d.spotlightAdd || [])) if (valid.size && !valid.has(s.issueKey)) { console.log(`  ⚠ ${d.id}: unknown spotlight issueKey '${s.issueKey}'`); bad++; }
      for (const c of (d.stanceEvidence || [])) if (valid.size && !valid.has(c.issueKey)) { console.log(`  ⚠ ${d.id}: unknown stance issueKey '${c.issueKey}'`); bad++; }
    }
    console.log(bad ? `\n  ✗ ${bad} invalid issueKey(s) — fix before applying.\n`
                    : `  ✓ all issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);
    if (bad && APPLY) process.exit(1);
  } catch (e) { console.log(`  (issueKey validation skipped: ${e.message})`); }

  if (EMIT) {
    writeFileSync('/tmp/utah-local-deepen-wave2-spotlight-appends.txt', emitSpotlightAppends());
    console.log('Wrote ACCT_SPOTLIGHT appends → /tmp/utah-local-deepen-wave2-spotlight-appends.txt\n');
  }

  for (const d of WAVE2) {
    const tag = `${d.id}: +${(d.spotlightAdd || []).length} spotlight` +
      (d.stanceEvidence ? `, ${d.stanceEvidence.length} stance evidence` : '') +
      (d.accountabilitySummary ? ', summary↻' : '');
    if (APPLY) {
      const doc = await getDoc(d.id);
      if (!doc) { console.log(`  – ${tag}: doc not found — skipped`); continue; }
      const existing = (doc.fields && doc.fields.spotlight) ? (dec(doc.fields.spotlight) || []) : [];
      const fields = { updatedAt: STAMP };
      if (d.spotlightAdd) fields.spotlight = existing.concat(d.spotlightAdd); // APPEND, never replace
      if (d.accountabilitySummary) {
        const acct = (doc.fields && doc.fields.accountability) ? (dec(doc.fields.accountability) || {}) : {};
        acct.summary = d.accountabilitySummary;
        fields.accountability = acct;
      }
      await patchDoc(d.id, fields);
      console.log(`  ✎ ${tag}  (spotlight ${existing.length}→${existing.length + (d.spotlightAdd || []).length})`);
    } else {
      console.log(`  → ${tag}`);
    }
  }
  console.log(`\n${APPLY ? 'Patched' : 'Would patch'} ${WAVE2.length} profiles · ${totSpot} new spotlight items · ${totSummary} refreshed summaries.`);
  console.log('Stance evidence notes were hand-applied in place to ISSUE_STANCE_DATA (same-source citations); promises unchanged this wave.');
  if (!APPLY) console.log('Re-run with --emit to write the index.html mirror blocks, --apply to append in Firestore.');
})();
