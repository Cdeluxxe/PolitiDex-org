#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Weber County deep dive, BATCH 2 (June 2026)
//
// Batch 1 built the CURRENT sitting Weber County & municipal officials. This
// batch covers the ACTIVE 2026 CANDIDATES who will actually appear on the
// November 3, 2026 Weber County ballot — the two open/contested County
// Commission seats — so Weber voters get the same honest, sourced accountability
// records Davis County got in Batches 3 and 4. Both target docs already exist
// (created as nominee stubs) and already carry campaign stances, but neither has
// a single sourced Spotlight receipt yet. This pass fills that gap and adds the
// missing priority-issue stances, following the strict CONTENT_STYLE.md /
// EVIDENCE_STRENGTH.md honesty rules.
//
// 2026 STATUS — VERIFIED FIRST (June 23, 2026 primary results + county filings):
//
//   • jon_beesley     — Jon Beesley (R), County Commission SEAT B. WON the June
//                       23, 2026 GOP primary over two-term incumbent Sharon Bolos
//                       55.57%–44.43% (after taking the seat 62%–26% at the April
//                       convention). NO other party filed, so the primary
//                       effectively decided the seat — he is unopposed in November
//                       barring an August write-in.                     ✓ active
//   • duane_kearsley  — Duane Kearsley (R), County Commission SEAT A (open; Gage
//                       Froerer retiring). WON the four-way June 23, 2026 GOP
//                       primary (~30%, leading Ebert, Gibson and Hyer). Faces a
//                       CONTESTED November general against Alvin Thurgood (D) and
//                       Gary C. New (Forward Party).                     ✓ active
//
// SKIPPED / OUT OF SCOPE (documented in the batch summary, NOT built here):
//   • Sharon Bolos — LOST the Seat B primary; eliminated from the 2026 cycle.
//   • Ebert / Gibson / Hyer — LOST the Seat A primary; eliminated.
//   • Other county offices (Sheriff Arbon, Clerk/Auditor Hatch, Attorney Allred,
//     Assessor Preisler) — each is the SOLE filer (unopposed); Arbon and Hatch
//     already have Batch 1 profiles. No contested 2026 race and no new sourced
//     issue positions to add, so they are reported, not re-authored.
//   • Active Weber-area state-legislative challengers (SD5 Hernandez/Koford; HD9
//     Choberka; HD10 Lesser/Alvey; HD7 Mittendorf; HD12 Graff; HD11 Calder; HD6
//     Rich; HD8 James) — confirmed active for November but each needs its own
//     verified per-candidate sourcing pass; queued for a follow-up batch rather
//     than padded here (the Davis Batch 4 precedent: defer thin races, never
//     invent receipts). Several incumbents in those seats already have profiles.
//
// Honesty rules applied (every URL below was fetched and HTTP-confirmed during
// research to support its claim):
//   • GOVERNING/WORK RECORD vs CAMPAIGN PLEDGE is kept explicit. Beesley has a
//     real municipal record as Plain City mayor (2018–2025); his self-reported
//     "$5M saved" figure is attributed as HIS claim, not audited fact. Kearsley
//     is a first-time candidate with NO governing record — his Fairgrounds
//     under-bid project is a county-EMPLOYEE work record (tagged as such), and
//     everything else is a campaign pledge (impact:neutral, "no governing record
//     yet").
//   • Balanced: Beesley's honest counterweight — he was a plaintiff in a losing
//     pre-primary lawsuit (dismissed "in whole") that tried to remove a Seat A
//     rival and accused the clerk of altering procedures — is included as a
//     negative receipt.
//   • Water / Great Salt Lake / detailed transportation & public-safety policy:
//     NO verifiable candidate position was found for either man, so NO stance is
//     invented there — those remain honest gaps.
//   • Idempotent & non-destructive: re-fetches each live doc; adds Spotlight
//     receipts only if the doc has no impact-tagged drivers yet and only those
//     whose headline isn't already present; adds only stance topics not already
//     present; sets candidacyOutcome only when missing. Re-running is safe.
//
//   node scripts/deep-dive-weber-county-batch2-jun2026.mjs            # dry run (default)
//   node scripts/deep-dive-weber-county-batch2-jun2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;

const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-30T00:00:00.000Z';

// ── Sources (re-used across receipts; each fetched & confirmed in research) ──
const SRC = {
  se_profile_beesley: { label: 'Standard-Examiner — Jon Beesley sees disconnect between Weber County Commission and its cities (May 18, 2026)', url: 'https://www.standard.net/news/2026/may/18/jon-beesley-sees-disconnect-between-weber-county-commission-and-its-cities-residents/' },
  se_profile_kearsley: { label: 'Standard-Examiner — Duane Kearsley says he’d like to instill leadership in Seat A race (June 1, 2026)', url: 'https://www.standard.net/news/2026/jun/01/duane-kearsley-says-hed-like-to-instill-leadership-in-weber-county-commission-seat-a-race/' },
  se_advance: { label: 'Standard-Examiner — Kearsley, Beesley likely moving on to November ballot (June 25, 2026)', url: 'https://www.standard.net/news/2026/jun/25/kearsley-beesley-likely-moving-on-to-november-ballot-for-weber-county-commission-seats/' },
  se_results: { label: 'Standard-Examiner — June 23, 2026 primary results', url: 'https://www.standard.net/news/local/2026/jun/23/election-results-multiple-incumbents-concede-two-davis-county-races-within-a-percent/' },
  ksl_lawsuit: { label: 'KSL — “Denied in whole”: Judge tosses lawsuit, clears Weber County Commission hopeful, election office', url: 'https://www.ksl.com/article/51507121/denied-in-whole-judge-tosses-lawsuit-clears-weber-county-commission-hopeful-election-office' },
  beesley_site: { label: 'Jon Beesley for Weber County Commission — About', url: 'https://www.jonforweber.com/about' },
  kearsley_site: { label: 'Vote Kearsley — Weber County Commissioner', url: 'https://votekearsley.com/' },
  plaincity_mayors: { label: 'Plain City — Mayoral History', url: 'https://www.plaincityutah.gov/1241/Mayoral-History' },
};

// ── DEEPEN existing docs (non-destructive merge; keyed by Firestore id) ──────
const DEEPEN = {

  // ===== Jon Beesley — Commission Seat B (R) — Plain City mayor (RECORD) =====
  jon_beesley: {
    candidacyOutcome:
      'Won the June 23, 2026 Republican primary for Weber County Commission Seat B over two-term incumbent Sharon Bolos, 55.57% (13,004 votes) to 44.43% (10,398), after first taking the seat at the April 2026 county convention 62% (281 delegates) to 26% (115). Because no Democrat or other party filed for Seat B, the primary effectively decided the office; he is unopposed in the November 3, 2026 general election barring an August write-in.',
    theme:
      'A two-term Plain City mayor (2018–2025) who unseated an incumbent commissioner in a primary that — with no other party filing — effectively decided the seat, running on fiscal frugality, a closer county–city relationship, developer-funded growth and “doing the public work in the public.” He brings a real municipal record voters can weigh against his message.',
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: 'Unseated incumbent Sharon Bolos in the Seat B primary that effectively decided the office',
        facts: "Beesley won the June 23, 2026 Republican primary for Weber County Commission Seat B over two-term incumbent Sharon Bolos, 55.57% (13,004 votes) to 44.43% (10,398); Bolos conceded. He had already taken the seat at the April 2026 county convention 62% (281 delegate votes) to 26% (115), with Bolos reaching the primary by gathering signatures. Because no Democrat or other party filed for Seat B, the primary effectively decided the office — he is unopposed in November barring an August write-in.",
        why: 'His primary win is the central fact of his path to the commission, and the no-other-party-filed context explains why this primary effectively settled the seat — shown here as neutral fact rather than a governing record.',
        source: SRC.se_results },
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'Consistency'],
        headline: 'Ran Plain City on a frugal, developer-pays budget as two-term mayor (his own figures)',
        facts: "As Plain City mayor (2018–2025), Beesley says he prioritized fiscal restraint over “monuments,” claiming the city “saved nearly $5 million” on an average $4.5 million annual budget — the accomplishment he says he “hang[s] his hat on.” He says Plain City kept infrastructure “development driven — developer paid for it,” contrasting that with the county “putting $20 million out” on a sewer line that benefits developers while residents “maintain it.” The $5M/$4.5M figures are his own characterization reported by the Standard-Examiner, not an independently audited number.",
        why: 'It documents an actual municipal governing approach — frugal budgeting and developer-funded infrastructure — consistent with the “taxpayers first” message of his county campaign, while flagging that the savings figure is self-reported.',
        source: SRC.se_profile_beesley },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Land-use pledge: county shouldn’t fund development; wants a mix of housing, not all high-density',
        facts: "Beesley argues “development is not in the county’s portfolio — it shouldn’t be,” criticizing the county’s ~$20 million sewer-line spending for developers. He favors varied housing over uniform density — “it can’t all be high-density… we need multiuse residential, we need the 1-acre lots” — and wants to preserve horse/large-lot property. He warns that large county-pushed projects out west (he cites a ‘13,000 home’ development) would “flood” the rec systems of cities like Plain City, Hooper and West Haven. Campaign positions; not yet a county governing record.",
        why: 'A specific, sourced growth-and-land-use position on the issue most likely to define the next commission, clearly marked as a campaign pledge informed by his Plain City record.',
        source: SRC.se_profile_beesley },
      { impact: 'positive', category: 'transparency', date: '2026', tags: ['Public Statements', 'Consistency'],
        headline: 'Campaigns on “doing the public work in the public” — town halls and open debate',
        facts: "Beesley’s central framing is a “disconnect” between the commission and the county’s cities, mayors and residents. He pledges to “do the public work in the public,” hold town halls and “be at events,” and restore debate: “there’s no debate at our Weber County Commission meetings… it’s all done behind closed doors.” His campaign site lists “increasing transparency and accountability in county government” and says as mayor he “strengthened transparency and trust between residents and local government.” Campaign positions plus his stated mayoral record.",
        why: 'It documents the transparency theme at the center of his run and ties it to a claimed municipal record — a standard voters can hold him to if he takes office.',
        source: SRC.se_profile_beesley },
      { impact: 'negative', category: 'transparency', date: '2026', tags: ['Notable Actions', 'Rhetoric vs Reality'],
        headline: 'Was a plaintiff in a losing pre-primary lawsuit that tried to remove a rival and accused the clerk',
        facts: "Beesley was one of three commission hopefuls (with Katrina Gibson and Richard Hyer) who sued on May 27, 2026 to disqualify Seat A candidate James Ebert over the timing of his conflict-of-interest filings, and alleged Weber Clerk/Auditor Ricky Hatch had “altered the election procedures or processes.” On June 4, 2026, 2nd District Judge Craig Hall dismissed the petition “in whole,” finding Ebert and the clerk “substantially complied” with election code, citing laches and that “public interest favors ballot access.” Ebert and the county sought reimbursement of legal fees. The suit targeted the Seat A race, not Beesley’s own Seat B.",
        why: 'A candidate who campaigns on transparency and open process backing a court bid to knock a rival off the ballot — dismissed in whole, with an accusation against the election office the judge rejected — is a fair record-vs-rhetoric counterweight voters should see.',
        source: SRC.ksl_lawsuit },
    ],
    stances: {
      'Property Taxes & Fiscal Policy':
        "Record + pledge: as Plain City mayor (2018–2025) Beesley says he ran an average $4.5M budget and “saved nearly $5 million” (his own figure, not independently audited) and “delivered results without raising taxes unnecessarily,” and pledges to bring “taxpayers first” fiscal restraint to the county — while candidly admitting he hasn’t yet “dug into the [county] spending” (Standard-Examiner; Beesley campaign).",
      'Growth, Housing & Land Use':
        "Campaign position drawn from his record: argues county-funded development “isn’t in the county’s portfolio,” criticizing ~$20M county sewer spending for developers; wants a housing mix rather than all high-density — “multiuse residential… the 1-acre lots” and preserved horse property — and warns large westside projects would burden city rec systems (Standard-Examiner).",
      'Local Government Transparency & Accountability':
        "Campaign cornerstone: says the commission is disconnected and decides things “behind closed doors” with “no debate”; pledges town halls and to “do the public work in the public.” Honest counterweight: he was a plaintiff in a pre-primary suit (dismissed “in whole”) that sought to remove a Seat A rival and accused the clerk of altering procedures (Standard-Examiner; KSL).",
      'Public Safety & Essential Services':
        "Campaign position: lists “ensuring public safety and essential services remain strong” among his county priorities and names protecting public-safety morale a focus, but has not published detailed policy — a named priority rather than a developed plan, with no county governing record yet (Beesley campaign).",
    },
  },

  // ===== Duane Kearsley — Commission Seat A (R) — first-time candidate =====
  duane_kearsley: {
    candidacyOutcome:
      'Won the four-way June 23, 2026 Republican primary for the open Weber County Commission Seat A (Commissioner Gage Froerer retiring), leading the field at roughly 30% over James Ebert, Katrina Gibson and Richard Hyer. Advances to a CONTESTED November 3, 2026 general election against Alvin Thurgood (Democratic Party) and Gary C. New (Forward Party).',
    theme:
      'A first-time candidate, longtime construction-business owner and Weber County Fairgrounds (Golden Spike Event Center) facility manager who won a crowded four-way open-seat primary on a no-tax-increase, anti-“career politician,” “100% transparency” message. With no elected record, his platform is campaign pledges — the one exception being a county-employee work record at the Fairgrounds.',
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: 'Won the four-way open-seat primary; advances to a contested November general',
        facts: "Kearsley led the four-way June 23, 2026 Republican primary for the open Seat A (vacated by retiring Commissioner Gage Froerer) at roughly 30%, ahead of James Ebert, Katrina Gibson and Richard Hyer; he had also been the top vote-getter at the April 11, 2026 county convention (285 delegate votes) without clearing the 60% threshold, which sent the race to a primary. Unlike Seat B, his race is contested in November — he faces Alvin Thurgood (Democratic Party) and Gary C. New (Forward Party).",
        why: 'His primary win and the contested November field are the central facts of his candidacy, shown here as neutral context rather than a governing record.',
        source: SRC.se_advance },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Top pledge: hold property taxes flat — “I ain’t raising taxes”',
        facts: "Kearsley names rising property taxes voters’ top frustration, noting some elderly residents weigh reverse mortgages to keep their homes, and pledges flatly: “there’s zero reason to raise your taxes… I ain’t raising taxes.” His campaign site promises “zero-waste budgets” and frames tax money as “the hours of your life traded for a paycheck.” This is a campaign pledge — as a first-time candidate he has no county budget or tax votes on record.",
        why: 'It documents the no-tax-increase promise at the center of his campaign, clearly tagged as a forward-looking pledge voters can hold him to if elected.',
        source: SRC.se_profile_kearsley },
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions'],
        headline: 'Delivered a Fairgrounds capital project well under the lowest outside bid (county-employee work record)',
        facts: "As facility manager of the county’s Golden Spike Event Center / Fairgrounds, Kearsley says the lowest outside bid for a capital-improvement project was $439,000, and that he completed it in-house with staff for roughly $210,000–$215,000 — the full budgeted amount — arguing that subbing it out would have delivered “a third of the project” plus likely change orders. This is a county-EMPLOYEE work/management record, not an elected or voting record; the figures are his own account reported by the Standard-Examiner.",
        why: 'It is the closest thing he has to a documented record of managing public money — honestly framed as a county-employee project rather than a governing record — and underpins his “zero-waste” fiscal message.',
        source: SRC.se_profile_kearsley },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Runs against “government bloat” and high commissioner pay; says he’d take less',
        facts: "Kearsley says “county commissioners make way too much money,” criticizes “government bloat” and “people running in office to better their retirement,” says “we don’t need career politicians,” and pledges to take a lower salary, framing the office as “your chance to give back.” Campaign positions; no governing record yet.",
        why: 'It documents the anti-career-politician, cut-the-cost-of-government message that defined his primary run, clearly marked as a pledge.',
        source: SRC.se_profile_kearsley },
      { impact: 'neutral', category: 'transparency', date: '2026', tags: ['Public Statements'],
        headline: 'Platform built on “100% transparency” and “no backroom deals”',
        facts: "Kearsley’s campaign rests on three pillars — “Absolute Truth” (“no talking points, no spin”), “Extreme Ownership” (“the buck stops with me”) and “Performance Over Politics” — and pledges “100% transparency, zero-waste budgets, and the courage to say ‘No’ to the status quo,” promising decisions about “taxes, land, or the future” will “happen in the light of day” with “no backroom deals.” Post-primary he said he is attending all commission meetings and wants to hold town halls and “educate” residents on county business. Campaign positions; no governing record yet.",
        why: 'It documents the transparency-and-accountability standard he is setting for himself, drawn from his own campaign and clearly marked as pledges rather than enacted practice.',
        source: SRC.kearsley_site },
    ],
    stances: {
      'County Budget & Appropriations':
        "Campaign pledge: promises “zero-waste budgets” and “extreme ownership” of spending, pointing to a Fairgrounds capital project he says he delivered for ~$210K–$215K against a $439K lowest outside bid as a county employee. No elected budget record yet (Standard-Examiner; Kearsley campaign).",
      'Local Government Transparency & Accountability':
        "Campaign cornerstone: pledges “100% transparency,” “no backroom deals,” and decisions made “in the light of day,” built on “Absolute Truth / Extreme Ownership / Performance Over Politics”; says he’s attending all commission meetings and will hold town halls. No governing record yet (Kearsley campaign).",
    },
  },
};

// ── Firestore value encoder / decoder ───────────────────────────────────────
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

async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`fetch ${id}: HTTP ${r.status}`);
  const j = await r.json();
  const o = {};
  for (const [k, v] of Object.entries(j.fields || {})) o[k] = dec(v);
  return o;
}
async function patch(id, fields) {
  const qs = Object.keys(fields).map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${qs}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

function hasDrivers(doc) {
  const sl = Array.isArray(doc.spotlight) ? doc.spotlight : [];
  return sl.some((it) => it && (it.impact === 'positive' || it.impact === 'negative'));
}
function hk(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 70); }

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`PolitiDex — Weber County deep dive (batch 2: active 2026 commission candidates)  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);

  let touched = 0, missing = 0, skippedDrivers = 0;
  let totSpot = 0, totStance = 0, totStatus = 0;

  for (const [id, plan] of Object.entries(DEEPEN)) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); missing++; continue; }
    if (!doc) { console.log(`  – ${id}: not in Firestore — skipped`); missing++; continue; }

    const fields = { updatedAt: STAMP };

    let addedSpot = 0;
    if (hasDrivers(doc)) {
      console.log(`  • ${id} (${doc.name}): already has Spotlight drivers — leaving spotlight untouched`);
      skippedDrivers++;
    } else if (plan.spotlight && plan.spotlight.length) {
      const existing = Array.isArray(doc.spotlight) ? doc.spotlight : [];
      const seen = new Set(existing.map((s) => hk(s.headline || s.title)));
      const toAdd = plan.spotlight.filter((it) => !seen.has(hk(it.headline)));
      if (toAdd.length) { fields.spotlight = toAdd.concat(existing); addedSpot = toAdd.length; }
      if (plan.theme && !(typeof doc.spotlightTheme === 'string' && doc.spotlightTheme.trim())) {
        fields.spotlightTheme = plan.theme;
      }
    }

    let addedStance = 0;
    const stances = (doc.stances && typeof doc.stances === 'object' && !Array.isArray(doc.stances)) ? { ...doc.stances } : {};
    for (const [topic, text] of Object.entries(plan.stances || {})) {
      if (!(topic in stances)) { stances[topic] = text; addedStance++; }
    }
    if (addedStance) fields.stances = stances;

    let setStatus = 0;
    if (plan.candidacyOutcome && !(typeof doc.candidacyOutcome === 'string' && doc.candidacyOutcome.trim())) {
      fields.candidacyOutcome = plan.candidacyOutcome; setStatus = 1;
    }

    totSpot += addedSpot; totStance += addedStance; totStatus += setStatus;
    console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name}): +${addedSpot} receipt(s), +${addedStance} stance(s)${setStatus ? ', candidacy outcome set' : ''}`);

    if (Object.keys(fields).length > 1) {
      if (APPLY) await patch(id, fields);
      touched++;
    }
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} to ${touched} profile(s): ${totSpot} receipt(s), ${totStance} stance(s), ${totStatus} candidacy outcome(s).`);
  console.log(`(${skippedDrivers} already had spotlight drivers; ${missing} not found.)`);
  if (!APPLY) console.log('\nRe-run with --apply to write to Firestore.');
})();
