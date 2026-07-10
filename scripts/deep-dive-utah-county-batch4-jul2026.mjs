#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Utah County deep dive, BATCH 4 (July 2026)
//
// A DELIBERATELY SCOPED continuation of the Utah County accountability pass
// (see deep-dive-utah-county-batch1..3 and
// scripts/UTAH-COUNTY-CONTROVERSY-TRACKER.md). The unit is the FIGHT, not the
// politician. Batch 4 opens the one major Utah County controversy the first
// three batches never touched — the SHERIFF's ICE 287(g) partnership — and
// CLOSES the Alpine successor-district trio by adding the third and final
// board president. Two controversies, controversy-first discipline:
//
//   • UTAH COUNTY SHERIFF ↔ ICE 287(g) (CREATE mike_smith_utco) — In July 2025,
//     after ~4 hours of public comment from 115 speakers ALL opposed, the county
//     commission unanimously approved two 287(g) accords letting trained
//     sheriff's officers (a) identify and transfer removable immigrants held in
//     the county JAIL to ICE at release, and (b) enforce limited immigration
//     authority during routine operations. Sheriff Mike Smith is the office that
//     runs the agreements. He frames it as OVERSIGHT and transparency — "a seat
//     at the table," injecting "Utah County values," and says he does not
//     envision worksite/labor raids — and reaffirmed his support in May 2026 as
//     the county approved ICE cost reimbursements over renewed opposition. Smith
//     (R) is the sheriff since 2018 and the GOP nominee for RE-ELECTION in 2026,
//     so this is a live 2026 accountability record, not a settled one.
//   • ALPINE SPLIT — ASPEN PEAKS (CENTRAL) SUCCESSOR DISTRICT (CREATE
//     diane_knight_apsd) — Batch 3 built the presidents of Lake Mountain (King)
//     and Timpanogos (Lyman); Aspen Peaks is the third and LARGEST successor
//     district (American Fork, Lehi, Highland, Alpine, Cedar Hills, part of
//     Draper; ~41.78% of Alpine's students). Board President Diane Knight leads
//     the district that takes the biggest share of the split — she steered a
//     lean FY2026 startup budget and a UNANIMOUS asset/liability division MOU
//     among the three districts ("three strong districts moving forward"). Her
//     record is honestly the COOPERATIVE/procedural counterpoint to King's
//     impact-fee advocacy and Lyman's inherited deficit.
//
// COMMISSION SIDE OF THE SHERIFF'S FIGHT (ENRICH, non-duplicative):
//   • skyler_beltran and amelia_powers_gardner ALREADY EXIST (Batch 1, keyed to
//     the ~48% tax hike). They are ENRICHED here with ONE ICE-vote receipt each
//     — the commissioners who authorized the sheriff's 287(g) partnership — so
//     the "who voted / both sides of the fight" geometry is complete. Existing
//     fields are never clobbered; receipts append and stance keys merge only if
//     absent.
//
// HONEST GAPS (tracked in the .md, NOT built — no fabrication):
//   • No Utah County CITY mayor is on the 2026 ballot — municipal terms are
//     odd-year (2025/2027), so the mayoral tier is already covered by the
//     existing Gray (Eagle Mountain), Carn (Saratoga Springs), and Stratton
//     (Vineyard) records; no new mayor is built just for volume.
//   • Aspen Peaks vice president Amber Bonner and member Jason Hart have some
//     sourced budget/overcrowding remarks, but the president (Knight) is the
//     accountable lead and the cleanest single record; the others are named,
//     not stubbed.
//   • Sheriff Smith's 2022 "Hamblin"/Leavitt-leak episode is real and
//     documented but is a RESOLVED prior-term controversy; this batch stays on
//     the live 287(g)/2026 fight rather than relitigating it.
//   • Brandon Gordon (Seat B, retiring) also voted for the 287(g) accords, but
//     no individual on-record quote distinguishing HIS reasoning was found, so
//     he is NOT enriched with an ICE stance (named, not fabricated).
//
// CURRENT-STATUS VERIFICATION (research-confirmed July 2026; primary/local sourcing):
//   • mike_smith_utco       — Utah County Sheriff (R) since 2018; GOP nominee for
//                             re-election Nov 2026. Constitutionally elected.       → CREATE
//   • diane_knight_apsd      — Aspen Peaks School District Board PRESIDENT (new
//                             central successor district; sworn Nov 2025). Nonpart. → CREATE
//   • skyler_beltran         — Utah County Commission Chair (voted FOR 287(g)).      → ENRICH
//   • amelia_powers_gardner  — Utah County Commission Seat A (voted FOR 287(g)).     → ENRICH
//
// Honesty rules (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md):
//   • Nothing invented; every receipt carries a real {label,url} source that was
//     HTTP-verified during research (KSL, Deseret News, Daily Herald, Lehi Free
//     Press, American Fork Citizen).
//   • Individual lens, not party. The 287(g) vote is stated as a plain outcome
//     (commission unanimous; 115 public speakers opposed), never as a party-line
//     vote. Sheriff and school-board offices are described by what THIS person
//     said or did.
//   • Attribution discipline: the "no idea what they're doing" / "seat at the
//     table" / "chaos" lines are Smith's own words; the "no worksite raids"
//     point is his stated position as paraphrased by Deseret News (no fabricated
//     direct quote). The 41.78/30.16/28.06% asset split is the MOU's figure, not
//     a Knight quote; Knight's words are her "three strong districts" framing.
//   • Emerging vs. record labeled: Knight's is a cooperative/startup record (no
//     contested money vote yet); Smith's ICE record is active and reaffirmed.
//   • Idempotent & non-destructive: re-fetches each live doc. CREATE only where
//     nothing exists; ENRICH appends receipts + merges stance keys without
//     clobbering existing fields.
//
//   node scripts/deep-dive-utah-county-batch4-jul2026.mjs            # dry run
//   node scripts/deep-dive-utah-county-batch4-jul2026.mjs --emit     # write ISSUE_STANCE_DATA block to /tmp
//   node scripts/deep-dive-utah-county-batch4-jul2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const STAMP = '2026-07-10T00:00:00.000Z';

// Shared sources (HTTP-verified during research).
const SRC = {
  // Sheriff / ICE 287(g)
  ksl_ok:       { label: 'KSL', url: 'https://www.ksl.com/article/51347013/utah-county-oks-plans-to-bolster-cooperation-with-immigration-officials-despite-heavy-opposition' },
  deseret_ok:   { label: 'Deseret News', url: 'https://www.deseret.com/utah/2025/07/17/utah-county-oks-plans-to-bolster-cooperation-with-officials-despite-opposition/' },
  herald_reaffirm:{ label: 'Daily Herald', url: 'https://www.heraldextra.com/news/2026/may/14/utah-county-sheriff-mike-smith-reaffirms-support-for-agreement-with-ice/' },
  ksl_defend:   { label: 'KSL', url: 'https://www.ksl.com/article/51497325/utah-county-commission-sheriff-defend-contract-with-ice-after-additional-citizen-pushback' },
  // Aspen Peaks successor district
  lehi_asset:   { label: 'Lehi Free Press', url: 'https://lehifreepress.com/2026/06/30/aspen-peaks-board-approves-asd-asset-distribution-plan/' },
  afc_budget:   { label: 'American Fork Citizen', url: 'https://afcitizen.com/2025/12/18/aspen-peaks-school-board-approves-budget-launches-staff-searches-and-boundary-study/' },
  herald_sworn: { label: 'Daily Herald', url: 'https://www.heraldextra.com/news/2025/nov/30/making-it-official-school-board-members-for-aspen-peaks-lake-mountain-districts-sworn-in/' },
  kuer_boards:  { label: 'KUER', url: 'https://www.kuer.org/education/2025-11-28/with-3-new-boards-sworn-in-the-work-to-split-the-alpine-district-is-just-beginning' },
};

// ── Curated, sourced deep-dive data (keyed by Firestore doc id) ──────────────
const DATA = {
  // ══════════ Mike Smith — Utah County Sheriff (CREATE: ICE 287(g) partnership) ══════════
  mike_smith_utco: {
    create: true,
    name: 'Mike Smith',
    office: '👮 Utah County Sheriff',
    party: 'Republican', state: 'Utah', icon: '👮',
    candidacyStatus: 'office',
    nextElection: 'November 2026 (running for re-election)',
    score: 55,
    keyIssues: ['Immigration & Border Security', 'Crime & Public Safety', 'Local Government Transparency & Accountability'],
    bio: "Mike Smith is the Utah County Sheriff, a constitutionally elected office he has held since 2018 after serving as police chief of Pleasant Grove. He runs the county jail and the sheriff's office and, in 2025, brought Utah County into a formal 287(g) partnership with U.S. Immigration and Customs Enforcement — the county's highest-attention public-safety fight. Smith casts the partnership as oversight and transparency rather than expansion, and he is the GOP nominee for re-election in November 2026, making his handling of it a live accountability question for voters.",
    acctSummary: "Utah County's sheriff since 2018 and the office running the county's 287(g) agreement with ICE. In July 2025 the county commission unanimously approved two accords — jail-based transfers of removable immigrants to ICE at release, and limited immigration authority during routine operations — over roughly four hours of public comment from 115 speakers, all opposed. Smith's consistent framing is that the deal gives the sheriff 'a seat at the table' to keep enforcement aligned with 'Utah County values,' that ICE is 'already operating' locally and formalizing gives him visibility, and that he does not envision worksite/labor raids. He reaffirmed that position in May 2026 as the county approved ICE cost reimbursements amid renewed opposition. The record is genuinely contested — broad, sustained public pushback on one side; a sheriff arguing oversight-through-participation on the other — and it is live in his 2026 re-election.",
    theme: "Utah County's sheriff staked his office on a 287(g) partnership with ICE, arguing that a 'seat at the table' brings oversight and 'Utah County values' to enforcement — a stance he reaffirmed in 2026 over sustained, near-unanimous public opposition.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'border_security',
        headline: "Brought Utah County into a 287(g) partnership with ICE",
        facts: "In July 2025 the Utah County Commission unanimously approved two 287(g) accords for Smith's office: one to identify people in the country illegally held in the county jail and transfer them to ICE at release, and one to let trained deputies enforce limited immigration authority during routine operations. The vote followed a five-hour meeting with roughly four hours of public comment from 115 speakers, all of them opposed. Officials said the jail typically identifies about 100 removable immigrants, of whom ICE picks up 10 to 15.",
        why: "Establishes the single biggest public-safety decision of Smith's tenure and the scale of the opposition it drew — the record his 2026 re-election is measured against.",
        source: SRC.ksl_ok },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'immigration_reform',
        headline: "Frames the ICE deal as oversight and 'Utah County values,' not expansion",
        facts: "Smith argued ICE is already operating in Utah County 'like the rest of the country' but that local officials 'have no idea what they're doing,' and that formalizing the partnership lets the sheriff inject 'Utah County values' into how enforcement unfolds. He said the agreement 'doesn't really change much at all what we've been doing' and that he 'will be the first in pushing back' if he is unhappy with how ICE operates locally.",
        why: "His own rationale, in his own words — the transparency-through-participation case voters can weigh against the arrangement's critics.",
        source: SRC.ksl_ok },
      { impact: 'neutral', category: 'rhetoric', date: '2025', tags: ['Public Statements'], issueKey: 'back_police',
        headline: "Says he does not envision the office joining worksite/labor raids",
        facts: "As he defended the accords, Smith drew a line at the kind of enforcement his office would take part in: per Deseret News, he does not envision engaging in worksite raids with ICE, casting the partnership as targeting criminal offenders and jail-based transfers rather than broad community sweeps.",
        why: "A specific self-imposed limit that voters and critics can hold him to as the partnership operates.",
        source: SRC.deseret_ok },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'gov_transparency',
        headline: "Reaffirmed the ICE agreement in 2026 over renewed opposition",
        facts: "About ten months in, at a May 2026 commission meeting where the county approved ICE cost reimbursements to the sheriff's office, Smith reaffirmed his support as roughly a dozen residents spoke against it. He said, 'We have a seat at the table. We're able to have these discussions and make sure that things are being done the way we want it done in Utah County,' and 'We're not doing ICE's job.' He warned that cancelling the contract would invite 'the chaos that you saw in other cities.'",
        why: "Shows the position is not a one-time vote but a sustained, defended stance heading into his 2026 re-election.",
        source: SRC.herald_reaffirm },
    ],
    stances: {
      'Immigration & Border Security': "Brought Utah County into a 287(g) partnership with ICE (jail transfers + limited authority in routine operations), defending it as oversight that keeps enforcement aligned with 'Utah County values' while saying he does not envision worksite/labor raids.",
      'Crime & Public Safety': "Casts the ICE partnership as targeting criminal offenders and jail-based transfers rather than broad sweeps, and says it 'doesn't really change much' about existing operations.",
      'Local Government Transparency & Accountability': "Argues a formal 'seat at the table' with ICE gives the sheriff visibility and a check he lacked before — reaffirmed in 2026 over sustained public opposition.",
    },
    stanceCards: [
      { topic: 'ICE 287(g) Partnership', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support', text: "Brought Utah County into two 287(g) accords with ICE (jail transfers + limited authority in routine ops), approved by the commission over 115 opposed public speakers, and reaffirmed his support in 2026.", source: SRC.ksl_ok },
      { topic: "'Seat at the Table' Oversight", icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: "Argues formalizing gives the sheriff 'a seat at the table' and 'Utah County values' in enforcement — 'We're not doing ICE's job' — after saying local officials otherwise 'have no idea what they're doing.'", source: SRC.herald_reaffirm },
      { topic: 'No Worksite Raids', icon: '🚫', pos: 'mixed', issueKey: 'immigration_reform', issueStance: 'mixed', text: "Says he does not envision the office joining worksite/labor raids with ICE, framing the partnership as targeting criminal offenders and jail-based transfers rather than community sweeps.", source: SRC.deseret_ok },
      { topic: 'Public Safety Framing', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support', text: "Frames the ICE deal as public safety that 'doesn't really change much' about existing operations, warning that cancelling it would invite 'the chaos that you saw in other cities.'", source: SRC.herald_reaffirm },
    ],
  },

  // ══════════ Diane Knight — Aspen Peaks School District Board President (largest successor district) ══════════
  diane_knight_apsd: {
    create: true,
    name: 'Diane Knight',
    office: '🏛 Aspen Peaks School District Board (President)',
    party: 'Nonpartisan', state: 'Utah', icon: '🏛',
    candidacyStatus: 'office',
    score: 62,
    keyIssues: ['Public Schools & Education', 'Property Taxes & County Budget', 'Growth, Housing & Land Use', 'Local Government Transparency & Accountability'],
    bio: "Diane Knight is the president of the Aspen Peaks School District Board of Education, the third and largest of the three nonpartisan boards created by the split of Alpine — Utah's largest district — and sworn in November 2025. Aspen Peaks (the 'central' district) covers American Fork, Lehi, Highland, Alpine, Cedar Hills, and part of Draper, and takes the biggest share of the split — about 41.78% of Alpine's students. Knight leads the board through its startup phase before Aspen Peaks formally opens July 1, 2027, steering the budget, staff hiring, boundary study, and the division of assets and debt among the three successor districts.",
    acctSummary: "President of the Aspen Peaks board, leading the largest Alpine successor district (~41.78% of students; American Fork / Lehi / Highland / Alpine / Cedar Hills / part of Draper). Where Lake Mountain's King presses an impact-fee funding fix and Timpanogos' Lyman faces an inherited deficit, Knight's early record is cooperative and procedural: a lean FY2026 startup budget (funded by $60/student state startup money, ~$794K in planned spending, no capital) and a unanimous asset/liability division MOU split by student population, which she framed as keeping 'the needs of all students, no matter the district, front and center.' Her governing record on contested money votes is still ahead — the value here is transparency about a complex, high-stakes transition rather than a single decisive fight.",
    theme: "Aspen Peaks' board president leads the largest Alpine successor district through its startup — a lean first budget and a cooperative, student-population-based division of assets she casts as 'three strong districts moving forward.'",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'public_schools',
        headline: "Elected president of the largest new Alpine successor board",
        facts: "Knight was sworn in as president of the Aspen Peaks board when the three new Alpine successor boards were seated in late November 2025. Aspen Peaks is the central and largest district — American Fork, Lehi, Highland, Alpine, Cedar Hills, and part of Draper — taking about 41.78% of Alpine's students as the state's largest district dissolves by July 2027.",
        why: "Establishes her authority and the scale of the district she governs — the biggest single piece of the split.",
        source: SRC.herald_sworn },
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'gov_waste',
        headline: "Steered a lean FY2026 startup budget with no capital spending",
        facts: "At the board's first regular meeting on Dec. 11, 2025, Aspen Peaks unanimously approved its FY2026 budget — funded largely by $60-per-student state startup money (about $2.04M for ~34,000 students, roughly $1M in the first half) with about $794,000 in planned spending on a superintendent and business administrator, board pay and benefits, and communications, and no capital expenses during startup. The board also launched staff searches and a boundary study.",
        why: "A concrete, checkable early fiscal record: a restrained startup budget for the district that will carry the largest share of the split.",
        source: SRC.afc_budget },
      { impact: 'positive', category: 'transparency', date: '2026', tags: ['Notable Actions', 'Public Statements'], issueKey: 'gov_transparency',
        headline: "Led a unanimous, student-population-based division of Alpine's assets and debt",
        facts: "On June 11, 2026, the Aspen Peaks board unanimously approved a memorandum of understanding dividing Alpine's assets and liabilities among the three successor districts — geographically located assets going to their district, and shared items split by student share (Aspen Peaks 41.78%, Lake Mountain 30.16%, Timpanogos 28.06%). Knight said, 'All along, our goal has been for three strong districts moving forward, and this document represents a huge commitment from everyone involved to keep the needs of all students, no matter the district, front and center.' Timpanogos and Lake Mountain ratified the same MOU that month.",
        why: "The clearest window into her approach — a cooperative, formula-based split of a contentious inheritance, framed around all three districts rather than maximizing her own.",
        source: SRC.lehi_asset },
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions'], issueKey: 'housing_build',
        headline: "Manages growth and overcrowding across the central district",
        facts: "As it stood up, the Aspen Peaks board paired its budget with a boundary study and community concerns about overcrowding and long-term planning across its fast-growing central Utah County footprint (American Fork, Lehi, Highland, and neighbors). The board must resolve boundaries and capacity before the July 2027 launch.",
        why: "Context for the decisions ahead: the district's growth pressures are the backdrop against which Knight's budget and boundary choices will be judged.",
        source: SRC.kuer_boards },
    ],
    stances: {
      'Public Schools & Education': "Leads the new Aspen Peaks successor district — the largest at ~41.78% of Alpine's students — through its startup before the July 2027 launch.",
      'Property Taxes & County Budget': "Steered a lean FY2026 startup budget (state $60/student startup money, ~$794K planned, no capital) for the biggest successor district.",
      'Growth, Housing & Land Use': "Manages overcrowding, capacity, and a boundary study across the fast-growing central footprint (American Fork / Lehi / Highland / Alpine / Cedar Hills / part of Draper).",
      'Local Government Transparency & Accountability': "Led a unanimous, student-population-based division of Alpine's assets and debt — 'three strong districts moving forward' — over maximizing her own district's share.",
    },
    stanceCards: [
      { topic: 'Largest Successor District', icon: '🏫', pos: 'support', issueKey: 'public_schools', issueStance: 'support', text: "Sworn in Nov. 2025 as president of Aspen Peaks, the largest Alpine successor district (~41.78% of students; American Fork / Lehi / Highland / Alpine / Cedar Hills / part of Draper), leading it to its July 2027 launch.", source: SRC.herald_sworn },
      { topic: 'Lean Startup Budget', icon: '🧹', pos: 'support', issueKey: 'gov_waste', issueStance: 'support', text: "Steered a unanimous FY2026 startup budget funded by $60/student state money (~$794K planned, no capital) — a restrained first budget for the biggest piece of the split.", source: SRC.afc_budget },
      { topic: 'Cooperative Asset Split', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support', text: "Led a unanimous division of Alpine's assets and debt by student share (Aspen Peaks 41.78% / Lake Mountain 30.16% / Timpanogos 28.06%): 'three strong districts moving forward ... the needs of all students, no matter the district, front and center.'", source: SRC.lehi_asset },
      { topic: 'Growth & Overcrowding', icon: '🏗', pos: 'mixed', issueKey: 'housing_build', issueStance: 'mixed', text: "Manages a boundary study and community overcrowding concerns across the fast-growing central district before the 2027 launch.", source: SRC.kuer_boards },
    ],
  },

  // ══════════ Skyler Beltran — Utah County Commission Chair (ENRICH: 287(g) vote) ══════════
  // ALREADY EXISTS (Batch 1, keyed to the ~48% tax hike). Non-destructive ENRICH:
  // one receipt + one stance key tying him to the sheriff's 287(g) fight as the
  // commission chair who authorized it and later defended the reimbursements.
  skyler_beltran: {
    enrich: true,
    name: 'Skyler Beltran',
    addSpotlight: [
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions', 'Public Statements'], issueKey: 'border_security',
        headline: "Voted to approve the county's 287(g) agreements with ICE",
        facts: "Beltran joined the unanimous July 2025 commission vote authorizing the sheriff's two 287(g) accords with ICE, over four hours of public comment from 115 opposed speakers. He told residents, 'You see something you don't like, let us know,' and by May 2026, as the county approved ICE cost reimbursements, said he felt 'even more comfortable with this contract now, having done it for months, than I did even originally,' calling it 'a well-documented success.'",
        why: "Ties the commission chair directly to the sheriff's signature immigration-enforcement decision — the authorizing vote and his sustained defense of it.",
        source: SRC.herald_reaffirm },
    ],
    addStances: {
      'Immigration & Border Security': "Voted to approve the sheriff's 287(g) agreements with ICE (July 2025) and defended them into 2026 as 'a well-documented success,' telling residents 'you see something you don't like, let us know.'",
    },
    stanceCards: [
      { topic: 'ICE 287(g) Vote', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support', text: "Joined the unanimous 2025 vote authorizing the sheriff's 287(g) accords with ICE and defended them into 2026 — 'even more comfortable ... than I did originally,' 'a well-documented success.'", source: SRC.herald_reaffirm },
    ],
  },

  // ══════════ Amelia Powers Gardner — Utah County Commission Seat A (ENRICH: 287(g) vote) ══════════
  // ALREADY EXISTS (Batch 1, keyed to the ~48% tax hike). Non-destructive ENRICH:
  // one receipt + one stance key for her vote for the 287(g) accords and the
  // public-complaint provision she pushed to add.
  amelia_powers_gardner: {
    enrich: true,
    name: 'Amelia Powers Gardner',
    addSpotlight: [
      { impact: 'neutral', category: 'voting', date: '2025', tags: ['Notable Actions', 'Public Statements'], issueKey: 'border_security',
        headline: "Voted for the ICE 287(g) accords and pushed to add a public-complaint provision",
        facts: "Powers Gardner joined the unanimous July 2025 vote approving the sheriff's two 287(g) agreements with ICE. She framed it as 'about keeping Utah County safe, and I believe we can do it the right way,' and raised adding a public-complaint provision to the arrangement — a check on how the enforcement partnership would operate.",
        why: "Records her individual position on the sheriff's ICE partnership, including the accountability guardrail she personally sought — distinct from her tax-hike record.",
        source: SRC.ksl_ok },
    ],
    addStances: {
      'Immigration & Border Security': "Voted for the sheriff's 287(g) agreements with ICE — 'about keeping Utah County safe ... the right way' — and pushed to add a public-complaint provision as a check on the partnership.",
    },
    stanceCards: [
      { topic: 'ICE 287(g) Vote', icon: '🛂', pos: 'support', issueKey: 'border_security', issueStance: 'support', text: "Voted for the sheriff's 287(g) accords with ICE — 'keeping Utah County safe ... the right way' — and pushed to add a public-complaint provision as a check.", source: SRC.ksl_ok },
    ],
  },
};

// ── Firestore value encode/decode ────────────────────────────────────────────
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
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
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

// Build a full document body for a brand-new sitting-official profile.
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

// ── Emit the index.html/politician-stances.js ISSUE_STANCE_DATA block ─────────
// (CREATE records only; enrich cards are appended to their existing arrays by hand)
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emitBlock() {
  const out = [];
  out.push('    // ── Utah County sitting officials · Batch 4 (July 2026) ───────────────────────');
  out.push('    // Opens the SHERIFF/ICE 287(g) controversy (Mike Smith) and closes the Alpine');
  out.push('    // successor-district trio with the third, largest board (Diane Knight — Aspen Peaks).');
  out.push('    // (skyler_beltran\'s and amelia_powers_gardner\'s ICE-vote cards are appended to their');
  out.push('    // existing arrays, not here.)');
  for (const [id, plan] of Object.entries(DATA)) {
    if (plan.enrich) continue; // beltran + powers_gardner cards are added to their existing arrays by hand
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
  console.log(`PolitiDex — Utah County deep dive (batch 4: Sheriff/ICE 287(g) + Aspen Peaks successor board + commission ICE-vote enrichment)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);

  // Validate every issueKey against the live ISSUE_MAP vocabulary.
  // ISSUE_MAP was extracted from index.html into alignment-tool.js — read it there.
  try {
    const js = (await import('fs')).readFileSync('alignment-tool.js', 'utf8');
    const mapSlice = js.slice(js.indexOf('var ISSUE_MAP = {'), js.indexOf('try { window.ISSUE_MAP'));
    const valid = new Set([...mapSlice.matchAll(/^\s+([a-z_]+):\s*\{\s*label:/gm)].map((m) => m[1]));
    let bad = 0;
    for (const plan of Object.values(DATA)) {
      for (const c of (plan.stanceCards || [])) if (!valid.has(c.issueKey)) { console.log(`  ⚠ ${plan.name}: unknown stanceCard issueKey '${c.issueKey}'`); bad++; }
      for (const it of (plan.spotlight || [])) if (it.issueKey && !valid.has(it.issueKey)) { console.log(`  ⚠ ${plan.name}: unknown spotlight issueKey '${it.issueKey}'`); bad++; }
      for (const it of (plan.addSpotlight || [])) if (it.issueKey && !valid.has(it.issueKey)) { console.log(`  ⚠ ${plan.name}: unknown addSpotlight issueKey '${it.issueKey}'`); bad++; }
    }
    console.log(bad ? `\n  ✗ ${bad} invalid issueKey(s) — fix before applying.\n` : `  ✓ all issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);
    if (bad && APPLY) process.exit(1);
  } catch (e) { console.log(`  (issueKey validation skipped: ${e.message})`); }

  if (EMIT) {
    const f = '/tmp/utah-county-batch4-stance-block.txt';
    writeFileSync(f, emitBlock());
    console.log(`Wrote ISSUE_STANCE_DATA block → ${f}\n`);
  }

  let created = 0, enriched = 0, existed = 0, totSpot = 0, totStance = 0;

  for (const [id, plan] of Object.entries(DATA)) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); continue; }

    // ── ENRICH path (beltran, powers_gardner): append spotlight receipts + merge stances ──
    if (plan.enrich) {
      if (!doc) { console.log(`  ⚠ ${id} (${plan.name}): expected to exist for enrichment but not found — skipping`); continue; }
      const existingSpot = Array.isArray(doc.spotlight) ? doc.spotlight : [];
      const haveHeadlines = new Set(existingSpot.map((s) => s && s.headline));
      const toAdd = (plan.addSpotlight || []).filter((s) => !haveHeadlines.has(s.headline));
      const mergedStances = { ...(doc.stances || {}) };
      let stanceAdds = 0;
      for (const [k, v] of Object.entries(plan.addStances || {})) if (!(k in mergedStances)) { mergedStances[k] = v; stanceAdds++; }
      totSpot += toAdd.length; totStance += stanceAdds;
      console.log(`  ${APPLY ? '✎' : '→'} ENRICH ${id} (${plan.name}) · +${toAdd.length} receipt(s), +${stanceAdds} stance(s) [non-destructive]`);
      if (APPLY && (toAdd.length || stanceAdds)) {
        await patch(id, { spotlight: existingSpot.concat(toAdd), stances: mergedStances, updatedAt: STAMP });
      }
      enriched++;
      continue;
    }

    // ── CREATE path ──
    if (doc) {
      console.log(`  · ${id} (${plan.name}): already exists — skipping create (this batch CREATEs new officials only)`);
      existed++;
      continue;
    }
    totSpot += plan.spotlight.length;
    totStance += Object.keys(plan.stances).length;
    console.log(`  ${APPLY ? '✎' : '→'} CREATE ${id} (${plan.name}) · ${plan.party} · ${plan.candidacyStatus} · score ${plan.score} · +${plan.spotlight.length} receipt(s), +${Object.keys(plan.stances).length} stance(s)`);
    if (APPLY) await patch(id, buildNewDoc(plan), { mask: false });
    created++;
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${created} created, ${enriched} enriched (${existed} already existed) · ${totSpot} receipt(s), ${totStance} stance(s).`);
  if (!APPLY) console.log('\nRe-run with --emit to write the index.html block, --apply to write Firestore.');
})();
