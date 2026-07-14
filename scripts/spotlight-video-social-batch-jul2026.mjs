#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — July 2026 VIDEO & OFFICIAL-SOCIAL evidence batch
// (existing strong profiles: key federal figures + Utah delegation)
//
// A batch of high-quality, VERIFIABLE video / official-statement receipts for
// members who already have strong profiles, focused on the highest-salience
// 2026 issues (tariffs & trade, education & parental rights, energy / AI /
// data centers, water & public lands, government spending & the debt, health
// care). Every item is keyed to an ISSUE_MAP `issueKey` so it lines up with the
// member's existing stances/promises in the Evidence Locker.
//
// VERIFICATION (how this batch was built — matches EVIDENCE_STRENGTH.md):
//   • Every YouTube item below was confirmed live via YouTube's oEmbed endpoint
//     (the same check /api/yt-verify performs). The real title + channel YouTube
//     returned are quoted VERBATIM in each media.label — nothing is invented.
//   • Items flagged with `interview` are long-form, substantive, first-person
//     footage in which the member speaks at length in their own words (full
//     remarks, a committee hearing they lead/question in, or a floor speech),
//     and are graded "Strong" via the interview exception (_isQualityInterview).
//     Short cut-down clips do NOT carry the flag and stay "Moderate" by design.
//   • Items WITHOUT a YouTube id are sourced to an official page or reputable
//     outlet with a direct URL and a quote verified across multiple reports;
//     they are recorded as on-the-record statements (Moderate).
//   • NO timestamps are asserted. None were confirmed by watching the video, so
//     per project convention none is claimed. A curator can add a pinpoint
//     `media.timestamp` (which now deep-links on YouTube) once verified.
//   • CONTENT_STYLE.md: every item describes what THIS individual said or did,
//     in their own words — never their party.
//
// PROVENANCE NOTE: several committee-hearing videos are hosted on the
// "Forbes Breaking News" channel — a re-upload of the genuine, unedited public
// proceeding whose title names the member. Attribution is real (confirmed via
// oEmbed); where an official committee or C-SPAN upload of the same proceeding
// exists, a curator should prefer swapping media.url to it before publishing.
//
// Idempotent & non-destructive: each member's live `spotlight` array is
// re-fetched and an item is appended ONLY if no existing item shares its
// headline. Hand-authored entries are never clobbered.
//
//   node scripts/spotlight-video-social-batch-jul2026.mjs            # dry run
//   node scripts/spotlight-video-social-batch-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-07-14T00:00:00.000Z';

// ── Firestore value encoder / decoder ──────────────────────────────────────
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const [k, val] of Object.entries(v)) fields[k] = enc(val);
    return { mapValue: { fields } };
  }
  throw new Error('cannot encode value: ' + String(v));
}
function dec(v) {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(dec);
  if (v.mapValue !== undefined) {
    const o = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = dec(val);
    return o;
  }
  return null;
}

const yt = (id) => `https://www.youtube.com/watch?v=${id}`;

// ── The batch: politician id → [spotlight items] ────────────────────────────
const PLAN = {

  // ===== Donald Trump — tariffs & trade (STRONG) =====
  trump: [
    { date: 'Apr 2025', issueKey: 'econ_trade', impact: 'neutral', category: 'statement',
      tags: ['Public Statements', 'Long-Form Interview'], sourceType: 'youtube',
      interview: { format: 'full remarks at an official White House event', outlet: 'WSJ News (full-speech upload)' },
      headline: 'In his Rose Garden "Liberation Day" address, Trump announces sweeping reciprocal tariffs',
      facts: 'At an April 2, 2025 White House Rose Garden event, President Trump announced a 10% baseline tariff on nearly all imports plus higher "reciprocal" tariffs on dozens of countries, invoking emergency economic authority. In his own words he called the day "Liberation Day" and "our declaration of economic independence," said "trade deficits are no longer merely an economic problem — they are a national emergency," and explained the formula as charging other nations "approximately half of what they are and have been charging us." He displayed a chart listing country-by-country rates (China 34%, EU 20%, Japan 24%, among others).',
      why: 'The full remarks are a verifiable, first-person record of how Trump personally frames tariffs and trade — the centerpiece of his economic argument — captured at length in his own words rather than paraphrased.',
      source: { label: 'Full transcript — Roll Call Factbase (Apr 2, 2025)', url: 'https://rollcall.com/factbase/trump/transcript/donald-trump-speech-economic-tariffs-rose-garden-april-2-2025/' },
      media: { type: 'video', kind: 'youtube', url: yt('E6uFW0gHwXU'), label: 'YouTube — "Full Speech: Trump Announces Reciprocal Tariff, Baseline Tariff Plan | WSJ," WSJ News (2025)' } },
  ],

  // ===== Burgess Owens — education & parental rights (Education & Workforce Cmte) =====
  owens: [
    { date: '2025', issueKey: 'edu_college_cost', impact: 'neutral', category: 'statement',
      tags: ['Public Statements', 'Long-Form Interview'], sourceType: 'youtube',
      interview: { format: 'House committee hearing (he leads / questions at length)', outlet: 'House Education & Workforce Committee (Forbes Breaking News upload)' },
      headline: 'Owens leads a House Education Committee hearing on college affordability',
      facts: 'As vice chair of the House Education and the Workforce Committee, Rep. Burgess Owens of Utah led a full committee hearing on college affordability, pressing witnesses on rising tuition and the value students receive. The hearing is a long-form, first-person record of the higher-education-cost priorities he carries.',
      why: 'A full hearing Owens leads is a verifiable, first-person account of how he approaches college affordability — a Core National Issue — in his own words, not a summary.',
      source: { label: 'Rep. Burgess Owens (UT-04)', url: 'https://owens.house.gov/' },
      media: { type: 'video', kind: 'youtube', url: yt('DBXyWxzSmC4'), label: 'YouTube — "Burgess Owens Leads House Education Committee Hearing On College Affordability," Forbes Breaking News' } },
    { date: '2025', issueKey: 'end_dei', impact: 'neutral', category: 'statement',
      tags: ['Public Statements', 'Long-Form Interview'], sourceType: 'youtube',
      interview: { format: 'House committee hearing (he leads / questions at length)', outlet: 'House Education & Workforce Committee (Forbes Breaking News upload)' },
      headline: 'Owens leads a House Education Committee hearing titled "The Case Against DEI"',
      facts: 'Rep. Burgess Owens led a full House Education and the Workforce Committee hearing examining diversity, equity, and inclusion programs in education, laying out at length his case against DEI mandates and questioning witnesses on their effects.',
      why: 'The full hearing is a verifiable, first-person record of Owens\'s position on DEI in education — captured in his own words rather than characterized secondhand.',
      source: { label: 'Rep. Burgess Owens (UT-04)', url: 'https://owens.house.gov/' },
      media: { type: 'video', kind: 'youtube', url: yt('Sfc3GEuxFJE'), label: 'YouTube — "Burgess Owens Leads House Education Committee Hearing On \'The Case Against DEI\'," Forbes Breaking News' } },
    { date: '2025', issueKey: 'free_speech', impact: 'neutral', category: 'statement',
      tags: ['Public Statements', 'Long-Form Interview'], sourceType: 'youtube',
      interview: { format: 'House committee hearing (he leads / questions at length)', outlet: 'House Education & Workforce Committee (Forbes Breaking News upload)' },
      headline: 'Owens leads a House Education Committee hearing on free speech on college campuses',
      facts: 'Rep. Burgess Owens led a full House Education and the Workforce Committee hearing on protecting free speech on college campuses, questioning witnesses at length about campus expression and viewpoint access.',
      why: 'A full hearing Owens leads is a verifiable, first-person record of how he frames campus free-speech policy — a Core National Issue — in his own words.',
      source: { label: 'Rep. Burgess Owens (UT-04)', url: 'https://owens.house.gov/' },
      media: { type: 'video', kind: 'youtube', url: yt('E9l1jUz7bKo'), label: 'YouTube — "Burgess Owens Leads House Education Committee Hearing To Protect Free Speech On College Campuses," Forbes Breaking News' } },
    { date: '2025', issueKey: 'school_choice', impact: 'neutral', category: 'statement',
      tags: ['Public Statements'], sourceType: 'youtube',
      // Short clip — deliberately NOT flagged `interview`; stays Moderate.
      headline: 'Owens questions Education Secretary McMahon on states rejecting a school-choice tax program',
      facts: 'In a House Education Committee exchange, Rep. Burgess Owens questioned Education Secretary Linda McMahon about governors declining to participate in a federal school-choice tax-credit scholarship program, a policy Owens has championed for low-income families.',
      why: 'The clip is a verifiable, first-person record of Owens pressing his signature school-choice position — useful supporting context alongside his committee record.',
      source: { label: 'Rep. Burgess Owens (UT-04)', url: 'https://owens.house.gov/' },
      media: { type: 'video', kind: 'youtube', url: yt('BQp8rU9k7YE'), label: 'YouTube — "Burgess Owens Asks Linda McMahon About Governors Rejecting School Choice Tax Program," Forbes Breaking News' } },
  ],

  // ===== John Curtis — energy / AI / data centers; religious liberty (STRONG, own channel) =====
  curtis: [
    { date: '2025', issueKey: 'religious_liberty', impact: 'neutral', category: 'statement',
      tags: ['Public Statements', 'Long-Form Interview'], sourceType: 'youtube',
      interview: { format: 'U.S. Senate floor remarks (full)', outlet: 'Senator John Curtis — official channel' },
      headline: 'On the Senate floor, Curtis argues religious liberty "hinges on civility"',
      facts: 'Sen. John Curtis of Utah delivered floor remarks, posted to his official Senate channel, making an extended case that religious liberty depends on civility and mutual respect. He speaks at length in his own words.',
      why: 'Posted to his own official channel, the floor remarks are a directly-attributable, first-person record of how Curtis frames religious liberty — a verifiable complement to his documented positions.',
      source: { label: 'U.S. Senator John Curtis', url: 'https://www.curtis.senate.gov/' },
      media: { type: 'video', kind: 'youtube', url: yt('iYHH_IfBiVQ'), label: 'YouTube — "Religious Liberty Hinges on Civility," Senator John Curtis (official channel)' } },
    { date: 'Nov 2025', issueKey: 'enviro_energy', impact: 'neutral', category: 'statement',
      tags: ['Public Statements'], sourceType: 'statement',
      headline: 'Curtis ties surging AI energy demand to a nuclear-led "all-of-the-above" strategy',
      facts: 'Sen. John Curtis, who founded the Conservative Climate Caucus, has argued that the electricity demands of artificial intelligence require a rapid rethink of energy supply. In reported remarks he said the country needs "lots and lots and lots of nuclear," plus geothermal and all sources — "every electron is going to be needed for this" — warning that if the U.S. does not accommodate AI\'s growth "it will happen overseas."',
      why: 'The statement is a verifiable, first-person record of how Curtis connects energy production to AI and competitiveness — a Core National Issue and a top concern in his home state.',
      source: { label: 'Deseret News — Curtis on climate, energy (Nov 24, 2025)', url: 'https://www.deseret.com/politics/2025/11/24/senator-john-curtis-social-media-algorithms-climate-and-energy/' } },
    { date: '2026', issueKey: 'datacenter_growth', impact: 'neutral', category: 'statement',
      tags: ['Public Statements'], sourceType: 'statement',
      headline: 'Curtis calls for federal transparency standards on data-center growth',
      facts: 'After controversy over data-center projects in Utah, Sen. John Curtis said the next step after permitting reform is "bringing a better awareness of why we\'re growing, why these data centers are needed," calling for federal transparency standards so communities understand the tradeoffs.',
      why: 'The statement is a verifiable, first-person record of Curtis\'s position on data-center growth and public trust — one of the fastest-rising issues tying AI, energy, land, and water together.',
      source: { label: 'St. George News — Curtis calls for data-center transparency', url: 'https://www.stgeorgeutah.com/news/after-utah-data-center-controversy-curtis-calls-for-federal-transparency-standards/article_8c6da47f-c3e3-40f8-9932-0235594d8f4e.html' } },
  ],

  // ===== Celeste Maloy — water & public lands =====
  maloy: [
    { date: 'May 2025', issueKey: 'water', impact: 'neutral', category: 'statement',
      tags: ['Public Statements', 'Notable Actions'], sourceType: 'statement',
      headline: 'In committee, Maloy offers an amendment selling targeted BLM parcels for St. George water infrastructure',
      facts: 'In a House Natural Resources Committee markup, Rep. Celeste Maloy offered an amendment to convey roughly 10,000 acres of federal parcels to the Washington County Water District, the City of St. George, and the county at fair market value, tied to water infrastructure and growth in one of the nation\'s fastest-growing regions. In her own words: "Not all federal lands have the same value... for decades we\'ve been disposing of appropriate lands in a manner that\'s consistent with what I propose to do here." She said the sales would "reduce the federal debt and deficit." The amendment later drew bipartisan pushback and was stripped from the bill.',
      why: 'The committee statement is a verifiable, first-person record of how Maloy — a former public-lands attorney — connects federal land policy to water and growth in her district, a defining issue of her record.',
      source: { label: 'Rep. Maloy — Public Lands Amendment (Myths vs. Facts)', url: 'https://maloy.house.gov/news/documentsingle.aspx?DocumentID=1538' } },
  ],

  // ===== Blake Moore — Great Salt Lake; national debt / spending =====
  bmoore: [
    { date: 'Apr 2026', issueKey: 'water_storage', impact: 'neutral', category: 'statement',
      tags: ['Public Statements', 'Notable Actions'], sourceType: 'statement',
      headline: 'Moore makes the case in a budget hearing for $1B in Great Salt Lake funding',
      facts: 'In an April 2026 House Budget Committee hearing, Rep. Blake Moore urged colleagues to back the roughly $1 billion proposed for Great Salt Lake restoration in the federal budget request, saying: "This investment is monumental, but I want to ensure my colleagues that the investment now will save taxpayers down the road from future calamity." He has tied the funding to reducing invasive phragmites and raising lake levels.',
      why: 'The statement is a verifiable, first-person record of how Moore argues for Great Salt Lake investment — an environmental and public-health priority central to his region.',
      source: { label: 'Deseret News — Moore makes case for Great Salt Lake (Apr 16, 2026)', url: 'https://www.deseret.com/politics/2026/04/16/blake-moore-makes-case-great-salt-lake/' } },
    { date: 'May 2026', issueKey: 'national_debt', impact: 'neutral', category: 'statement',
      tags: ['Public Statements'], sourceType: 'statement',
      headline: 'Moore says the debt cannot be solved without addressing mandatory spending',
      facts: 'Rep. Blake Moore, a member of the Ways and Means Committee, has centered his fiscal message on mandatory spending, which is roughly 60% of the federal budget and largely never voted on annually. In his own words: "We\'re not solving the debt unless we deal with mandatory spending." He has introduced legislation to require Congress to periodically sign off on mandatory programs.',
      why: 'The statement is a verifiable, first-person record of how Moore defines the debt problem and his proposed fix — a Core National Issue he campaigns on.',
      source: { label: 'Deseret News — Moore on the national debt (May 11, 2026)', url: 'https://www.deseret.com/politics/2026/05/11/blake-moore-priorities-utah-primary-national-debt/' } },
  ],

  // ===== Mike Lee — public lands & housing =====
  lee: [
    { date: 'Dec 2025', issueKey: 'housing_build', impact: 'neutral', category: 'statement',
      tags: ['Public Statements', 'Notable Actions'], sourceType: 'statement',
      headline: 'Lee presses federal land sales for housing, then withdraws a national-parks amendment',
      facts: 'As chair of the Senate Energy and Natural Resources Committee, Sen. Mike Lee has repeatedly sought to sell portions of Western federal lands, arguing it would help communities build housing (the approach behind his earlier HOUSES Act). After a December 2025 amendment drew backlash over national-park protections, Lee withdrew it, stating: "I categorically oppose selling national parks," and that "selling national parks was never on the table."',
      why: 'The statements are a verifiable, first-person record of Lee\'s public-lands-for-housing position and the line he says he will not cross — a defining, and contested, part of his record.',
      source: { label: 'Salt Lake Tribune — Lee public-lands amendment (Dec 18, 2025)', url: 'https://www.sltrib.com/news/environment/2025/12/18/mike-lee-amendment-threatens/' } },
  ],

  // ===== Mike Kennedy — healthcare (physician) =====
  kennedy: [
    { date: '2025', issueKey: 'healthcare_market', impact: 'neutral', category: 'statement',
      tags: ['Public Statements'], sourceType: 'statement',
      headline: 'Kennedy, a physician, centers price transparency and HSAs in his health agenda',
      facts: 'Rep. Mike Kennedy of Utah, a practicing family physician, describes his health-care priorities in his own words on his official House page: "I\'m leading legislation to put patients back in charge through price transparency and expanded health savings accounts, and to stop the insurance-driven prior authorization requests and mandated step therapies that delay critical care."',
      why: 'The statement is a verifiable, first-person record of the market-based, patient-cost focus Kennedy brings to health care — a Core National Issue and the center of his professional background.',
      source: { label: 'Rep. Mike Kennedy — Healthcare (house.gov)', url: 'https://mikekennedy.house.gov/issues/healthcare' } },
    { date: 'Apr 2025', issueKey: 'gov_balance', impact: 'neutral', category: 'statement',
      tags: ['Public Statements', 'Long-Form Interview'], sourceType: 'youtube',
      // Broad, sit-down interview on a reputable outlet; issue tie is general
      // (administration assessment), so keyed conservatively to gov_balance.
      interview: { format: 'sit-down news interview', outlet: 'KSL News Utah' },
      headline: 'In a KSL sit-down, Kennedy assesses the administration\'s direction for Utah',
      facts: 'Rep. Mike Kennedy sat down with KSL for an extended interview discussing the current administration\'s approach across federal policy and how he sees it affecting Utah. The conversation is broad rather than single-issue.',
      why: 'A full sit-down interview is a verifiable, first-person record of how Kennedy frames federal policy direction in his own words; because it ranges across topics it is keyed generally.',
      source: { label: 'Rep. Mike Kennedy (UT)', url: 'https://mikekennedy.house.gov/' },
      media: { type: 'video', kind: 'youtube', url: yt('xmXiNnkOjUE'), label: 'YouTube — "INTERVIEW: Congressman Mike Kennedy believes President Trump can fix what Biden didn\'t," KSL News Utah (2025)' } },
  ],
};

// ── Idempotent append (dry-run by default) ──────────────────────────────────
function hk(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 70); }

async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (!r.ok) return null;
  const j = await r.json();
  const o = {};
  for (const [k, val] of Object.entries(j.fields || {})) o[k] = dec(val);
  o.__fields = j.fields || {};
  return o;
}

async function patchSpotlight(id, fields, spotlight) {
  fields.spotlight = enc(spotlight);
  fields.updatedAt = enc(STAMP);
  const url = `${BASE}/${id}?` +
    Object.keys(fields).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!r.ok) throw new Error(`PATCH ${id} -> ${r.status} ${await r.text()}`);
}

let totalNew = 0, totalLeg = 0, strong = 0;
const issueTally = {};

for (const [id, items] of Object.entries(PLAN)) {
  const doc = await getDoc(id);
  if (!doc) { console.log(`!! MISSING doc: ${id}`); continue; }
  const existing = Array.isArray(doc.spotlight) ? doc.spotlight : [];
  const seen = new Set(existing.map(s => hk(s.headline || s.title)));
  const toAdd = items.filter(it => !seen.has(hk(it.headline)));
  if (!toAdd.length) { console.log(`= ${id}: nothing new (${existing.length} existing)`); continue; }
  totalLeg++;
  toAdd.forEach(it => {
    totalNew++;
    if (it.interview) strong++;
    if (it.issueKey) issueTally[it.issueKey] = (issueTally[it.issueKey] || 0) + 1;
  });
  const merged = existing.concat(toAdd);
  console.log(`+ ${id} (${doc.name || id}): +${toAdd.length} item(s) [${existing.length} -> ${merged.length}]`);
  toAdd.forEach(it => console.log(`    • ${it.interview ? '★STRONG ' : '        '}${it.headline}  #${it.issueKey}`));
  if (APPLY) {
    await patchSpotlight(id, doc.__fields, merged);
    console.log('    ✓ written');
  }
}

console.log('\n──────── summary ────────');
console.log(`profiles touched      : ${totalLeg}`);
console.log(`new evidence items    : ${totalNew}`);
console.log(`Strong (interview)    : ${strong}`);
console.log('issue tally           :', Object.entries(issueTally).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(', '));
console.log(APPLY ? '\nAPPLIED to Firestore.' : '\nDRY RUN — re-run with --apply to write.');
