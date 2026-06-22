#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 COMMITTEE-VIDEO Spotlight pass, WAVE 5
//
// Fifth wave of the committee-hearing video evidence layer opened by
// scripts/spotlight-committee-video-jun2026.mjs (continued in -wave2 / -wave3 /
// -wave4). Waves 1-4 cleared the original "has FLOOR video, no COMMITTEE video"
// set; this wave catches the sitting Utah legislators whose FLOOR-video coverage
// was added in the LATER floor-video waves and who therefore still carried zero
// committee video. A bill's committee hearing is where the chief sponsor gives
// the fullest spoken explanation of its purpose, so committee video adds a
// second, substantively different on-the-record layer to a profile that already
// shows the member on the floor.
//
// SELECTION (deepen, don't repeat):
//   • Targets are current sitting Utah legislators with >=1 FLOOR-video item and
//     0 committee-video items.
//   • For each, only NEW bills are used — a bill already carried by any existing
//     Spotlight item (floor or text) is skipped, so committee video never echoes
//     a card the member already has and NO floor/committee dedup conflict is
//     created (floor and committee evidence point at DIFFERENT bills).
//   • Each chosen bill is one the member CHIEF-SPONSORED and PERSONALLY presented
//     in their OWN chamber's standing committee, on a hearing whose markerID was
//     confirmed against the official minutes THIS pass.
//
// HOW EACH ITEM WAS BUILT AND VERIFIED (live, this pass):
//   • Bill record   : https://le.utah.gov/data/2025GS/<bill>.json — prime
//     sponsor, short title, highlighted provisions (which the `facts` summarize),
//     final action (`lastAction`), and the `agendaList` of committee hearings
//     (each with mtgID, markerID, agenda item, committee name/date, minutes URL).
//   • Committee video: https://le.utah.gov/av/committeeArchive.jsp?mtgID=<mtgID>
//     &markerID=<markerID> — the official archived recording, seeked to the
//     bill's agenda-item segment via its markerID. A SPECIFIC mtgID is pinned per
//     item (the hearing where the member actually presented), not just the first
//     hearing on the bill — several of these bills appear on more than one agenda
//     and were "not heard" on the others.
//   • Committee minutes: each bill's own-chamber minutes were fetched and read
//     THIS pass to confirm the member PERSONALLY presented/introduced the bill
//     (e.g. "Rep. Tiara Auxier presented the bill"). A bill was kept only when the
//     minutes explicitly record the member presenting it.
//
// TIMESTAMP HONESTY:
//   • The committee archive publishes no machine-readable per-bill mm:ss offset,
//     so `media.timestamp` is intentionally omitted (same policy as committee
//     waves 1-4). The best available locator IS the markerID, which seeks the
//     recording to the bill's segment, plus the agenda-item number and the linked
//     official minutes. An exact mm:ss could not be confirmed for any item.
//
// HONESTY / CONTENT_STYLE rules:
//   • Every item is about the INDIVIDUAL's own bill, words, and recorded action —
//     never their party. No party-grouping language; vote tallies stated as plain
//     counts.
//   • OUTCOMES ARE STATED HONESTLY. Most of these bills did NOT become law: at the
//     close of the 2025 General Session their final action is "House/ filed" or
//     "Senate/ filed", meaning they died when the session adjourned March 7, 2025.
//     Each `facts` block says so plainly. The two enacted bills here (Miller HB410,
//     Barlow HB282) are stated as signed into law. The committee presentation
//     itself — the member explaining and defending the bill on the record — is the
//     evidence; passage is reported separately and accurately.
//   • Every item carries a valid issueKey chosen to land on the member's OWN
//     documented focus so it groups with their existing Issue Positions/Promises
//     in the Connected Evidence / Stance-at-a-Glance views.
//   • Idempotent: each member's live `spotlight` array is re-fetched and an item
//     is appended ONLY if no existing item shares its headline.
//
//   node scripts/spotlight-committee-video-jun2026-wave5.mjs            # dry run
//   node scripts/spotlight-committee-video-jun2026-wave5.mjs --apply    # write
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-22T00:00:00.000Z';

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

// ── authoring helpers ───────────────────────────────────────────────────────
const MONTHS = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
const dateLabel = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${MONTHS[m - 1]} ${d}, ${y}`; };
const billPage = (num) => `https://le.utah.gov/~2025/bills/static/${num}.html`;
const comUrl = (mtgID, marker) => `https://le.utah.gov/av/committeeArchive.jsp?mtgID=${mtgID}&markerID=${marker}`;
const minUrl = (p) => /^https?:/.test(p) ? p : `https://le.utah.gov${p}`;
// pretty bill label e.g. HB0511 -> HB511, HCR015 -> HCR15
const pretty = (num) => num.replace(/^([A-Z]+)0*(\d+)$/, '$1$2');

// ── live bill cache (le.utah.gov data API) ─────────────────────────────────
const billCache = {};
async function getBill(num) {
  if (billCache[num]) return billCache[num];
  for (let t = 0; t < 5; t++) {
    try {
      const r = await fetch(`https://le.utah.gov/data/2025GS/${num}.json`);
      if (r.status === 200) { const j = await r.json(); billCache[num] = j; return j; }
    } catch (e) { /* retry */ }
    await new Promise(res => setTimeout(res, 300 * (t + 1)));
  }
  throw new Error(`bill fetch ${num} failed`);
}

// Pull the SPECIFIC pinned hearing for this bill by mtgID (the meeting where the
// member actually presented, confirmed in the minutes this pass).
function pinnedHearing(bill, mtgID) {
  const list = bill.agendaList || [];
  return list.find(a => String(a.mtgID) === String(mtgID));
}

// build the committee-video media object for an item, from the pinned hearing
async function media(num, mtgID) {
  const bill = await getBill(num);
  const h = pinnedHearing(bill, mtgID);
  if (!h || !h.markerID) throw new Error(`no pinned hearing ${mtgID} with marker for ${num}`);
  const iso = (h.mtgDate || '').slice(0, 10);
  return {
    type: 'video', kind: 'committee',
    label: `Official Utah Legislature committee hearing video — ${h.committeeName}, ${dateLabel(iso)} (2025 General Session)`,
    url: comUrl(h.mtgID, h.markerID),
    mtgID: String(h.mtgID), markerID: String(h.markerID), agendaItem: String(h.agendaItem || ''),
    minutesUrl: minUrl(h.minutesURL || ''),
  };
}
function source(num) { return { label: `${pretty(num)} (2025) — official bill record`, url: billPage(num) }; }

// item builder: pulls media+source from the live bill record
async function item(num, mtgID, o) {
  return {
    date: '2025', impact: o.impact || 'neutral', category: 'voting', issueKey: o.issueKey,
    tags: o.tags || ['Notable Actions', 'Public Statements'],
    headline: o.headline,
    facts: o.facts,
    why: o.why,
    source: source(num),
    media: await media(num, mtgID),
  };
}

// ── The plan: Firestore id -> [ {num, mtgID, item fields} ] ─────────────────
// mtgID pins the exact hearing where the member personally presented the bill.
const PLAN = {

  // ===== Tiara Auxier — House — has floor video, no committee yet =====
  tiara_auxier: [
    { num: 'HB0511', mtgID: '19884', issueKey: 'property_tax', impact: 'neutral', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her property-tax voter-approval bill in committee (HB511)',
      facts: "Auxier chief-sponsored HB511 (2025), Property Tax Revenue Increase Amendments, which would have required a taxing entity to put an opinion question to registered voters before increasing the revenue it raises from property tax, exempted entities that did so from the truth-in-taxation notice and hearing requirements, and limited how much revenue an entity could receive from new growth. She personally presented the bill to the House Revenue and Taxation Committee on Feb. 25, 2025, where the committee voted to hold it; the official committee recording archives the presentation and the minutes record it. The bill did not pass before the 2025 General Session adjourned.",
      why: "Lower property taxes and giving voters a direct say on increases sit at the center of Auxier's record; the committee video is her own spoken case for the voter-approval requirement, deepening the floor work already on her profile." },
  ],

  // ===== Verona Mauga — House — has floor video, no committee yet =====
  verona_mauga: [
    { num: 'HB0227', mtgID: '19842', issueKey: 'gun_safety', impact: 'neutral', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her restricted-person firearms bill in committee (HB227)',
      facts: "Mauga chief-sponsored HB227 (2025), Restricted Person Amendments, which would have classified a person as a restricted person — barred from possessing firearms — if they were found not guilty by reason of insanity, or mentally incompetent to stand trial, for any criminal offense rather than only a felony. She personally presented the bill, with the assistance of the Salt Lake County District Attorney's Office, to the House Law Enforcement and Criminal Justice Committee on Feb. 18, 2025, which passed the substitute out favorably; the official committee recording archives the presentation and the minutes record it. The bill did not pass before the 2025 General Session adjourned.",
      why: "Gun safety is one of Mauga's documented priorities; the committee video is her own explanation of who should be barred from firearm possession, adding a recorded action beyond the floor bills on her profile." },
    { num: 'HB0461', mtgID: '19945', issueKey: 'justice_balance', impact: 'neutral', tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her animal crime-victim bill before committee (HB461)',
      facts: "Mauga chief-sponsored HB461 (2025), Animal Crime Victim Amendments, which would have created a process to release or transfer an animal held in a shelter as the victim of abuse or a crime while the case is still being resolved, allowed an officer holding a warrant to take custody of a criminally mistreated animal, and required notice to the animal's owner. She personally presented the bill, with Salt Lake County Animal Services, to the House Law Enforcement and Criminal Justice Committee on Feb. 24, 2025, which passed the substitute out favorably; the official committee recording archives the presentation and the minutes record it. The bill did not pass before the 2025 General Session adjourned.",
      why: "Protecting victims, including animals harmed in crimes, fits Mauga's documented victim-protection focus; the committee record adds a second recorded justice action made in her own words." },
  ],

  // ===== Tracy Miller — House — has floor video, no committee yet =====
  tracy_miller: [
    { num: 'HB0325', mtgID: '19822', issueKey: 'public_schools', impact: 'neutral', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her parent learning-materials access pilot in committee (HB325)',
      facts: "Miller chief-sponsored HB325 (2025), Parent Access to Learning Materials Pilot Program, which would have created a three-year pilot directing the State Board of Education to select local education agencies to give parents access to classroom learning materials, beginning with elementary schools in 2025-26, adding teacher incentives, and requiring program reports. She personally presented the bill to the House Education Committee on Feb. 21, 2025; a motion to pass it failed on a 2-7-7 vote, and the official committee recording archives her presentation. The bill did not pass before the 2025 General Session adjourned.",
      why: "Parental engagement and access to what schools teach is one of Miller's stated priorities; the committee video is her own case for the pilot, deepening the public-education work already on her profile." },
    { num: 'HB0410', mtgID: '19757', issueKey: 'child_care', impact: 'neutral', tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented her child-care workforce bill in committee (HB410)',
      facts: "Miller chief-sponsored HB410 (2025), Child Care Amendments, which counts time worked as a preschool teacher in a child-care program toward teacher relicensing and allows housing and transit reinvestment-zone funds to be used to expand child-care facilities within a zone. She personally introduced the bill to the House Economic Development and Workforce Services Committee on Feb. 18, 2025, where it was advanced as a substitute; the official committee recording archives her presentation. The bill was signed into law.",
      why: "Expanding child-care access and supply is a signature Miller issue; the committee video shows her making the case herself for a bill that became law, adding a second issue layer to her video record." },
  ],

  // ===== Ashlee Matthews — House — has floor video, no committee yet =====
  ashlee_matthews: [
    { num: 'HB0407', mtgID: '19798', issueKey: 'transit', impact: 'neutral', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her mini-motorcycle safety bill in committee (HB407)',
      facts: "Matthews chief-sponsored HB407 (2025), Mini-motorcycle Amendments, which addressed the use of mini-motorcycles and the violations that apply to their users and extended the operating-safety provisions written for bicycles, e-bikes, scooters, and mopeds. She personally presented the bill — assisted by a Unified Police Department sergeant and the mayor of Kearns — to the House Transportation Committee on Feb. 18, 2025, where it was advanced as a substitute; the official committee recording archives her presentation. The bill did not pass before the 2025 General Session adjourned.",
      why: "Road and transportation safety is one of Matthews's documented priorities; the committee video is her own spoken case for the mini-motorcycle rules, deepening the floor work on her profile." },
  ],

  // ===== Stewart E. Barlow — House — has floor video, no committee yet =====
  stewart_e_barlow: [
    { num: 'HB0282', mtgID: '19617', issueKey: 'healthcare', impact: 'neutral', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his health-and-human-services programs bill in committee (HB282)',
      facts: "Barlow chief-sponsored HB282 (2025), Health and Human Services Modifications, which addressed the repeal dates for a set of state health and human services programs. He personally presented the bill to the House Health and Human Services Committee on Feb. 5, 2025, which passed it out favorably on a 13-0 vote and placed it on the consent calendar; the official committee recording archives his presentation. The bill was signed into law.",
      why: "Health policy and the state's health-and-human-services system are the core of Barlow's record as a physician-legislator; the committee video is his own explanation of the program changes, on a bill that became law." },
  ],

  // ===== Hoang Nguyen — House — has floor video, no committee yet =====
  hoang_nguyen: [
    { num: 'HB0238', mtgID: '19616', issueKey: 'healthcare', impact: 'neutral', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his health-agency account-interest bill in committee (HB238)',
      facts: "Nguyen chief-sponsored HB238 (2025), Department of Health and Human Services Account Amendments, which would have provided that certain Department of Health and Human Services funds and accounts earn interest and that the interest be deposited back into the originating fund or account. He personally presented the bill, with a deputy director of the department, to the House Health and Human Services Committee on Jan. 31, 2025, which passed it out favorably; the official committee recording archives his presentation and the minutes record it. The bill did not pass before the 2025 General Session adjourned.",
      why: "Health-care access and services are among Nguyen's stated priorities; the committee video is his own explanation of the account-funding change, adding the first committee-video evidence to a profile that previously showed only floor work." },
  ],

  // ===== Kathleen Riebe — Senate — has floor video, no committee yet =====
  kriebe: [
    { num: 'SB0135', mtgID: '19620', issueKey: 'public_schools', impact: 'neutral', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her educational medical-services bill before a Senate committee (SB135)',
      facts: "Riebe chief-sponsored SB135 (2025), Educational Medical Services Amendments, which would have defined terms related to medical services provided to students in educational settings. She personally presented the bill to the Senate Education Committee on Feb. 7, 2025, where it was held; the official committee recording archives her presentation and the minutes record it. The bill did not pass before the 2025 General Session adjourned.",
      why: "Public education and student health are at the center of Riebe's record as a teacher-legislator; the committee video is her own case for defining school medical services, adding the first committee-video evidence to her profile." },
  ],

  // ===== Mike Petersen — House — has floor video, no committee yet =====
  mike_petersen: [
    { num: 'HB0299', mtgID: '19806', issueKey: 'election_integrity', impact: 'neutral', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his election-deadline computation bill in committee (HB299)',
      facts: "Petersen chief-sponsored HB299 (2025), Election Code Time Computation Revisions, which would have amended and clarified deadlines and the calculation of time throughout the Election Code. He personally presented the bill, with legislative counsel and a county clerk, to the House Government Operations Committee on Feb. 13, 2025, which passed it out favorably and placed it on the consent calendar; the official committee recording archives his presentation. The bill did not pass before the 2025 General Session adjourned.",
      why: "Election administration and integrity is Petersen's signature issue; the committee video is his own explanation of the deadline changes, deepening the floor work already on his profile." },
    { num: 'HCR015', mtgID: '19899', issueKey: 'religious_liberty', impact: 'neutral', tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented his religious-freedom concurrent resolution in committee (HCR15)',
      facts: "Petersen chief-sponsored HCR15 (2025), Concurrent Resolution Regarding Religious Freedom, which acknowledges religion's historical role in government and education, supports the right of public-school students and teachers to express their faith, and encourages the accommodation of religious observance and the protection of religious symbols in public spaces. He personally presented the resolution to the House Public Utilities and Energy Committee on Feb. 28, 2025, where it was advanced as a substitute; the official committee recording archives his presentation and the minutes record it. The resolution did not pass before the 2025 General Session adjourned.",
      why: "Religious liberty is a documented Petersen priority; the committee video is his own statement of the resolution's purpose, adding a second recorded issue to his video record." },
  ],

};

// ── apply ───────────────────────────────────────────────────────────────────
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

let totalNew = 0, totalLeg = 0, withMin = 0, comItems = 0;
const issueTally = {};

for (const [id, specs] of Object.entries(PLAN)) {
  const doc = await getDoc(id);
  if (!doc) { console.log(`!! MISSING doc: ${id}`); continue; }
  const existing = Array.isArray(doc.spotlight) ? doc.spotlight : [];
  const seen = new Set(existing.map(s => hk(s.headline || s.title)));

  // build items live from the bill records
  const built = [];
  for (const s of specs) {
    if (seen.has(hk(s.headline))) continue;
    try {
      built.push(await item(s.num, s.mtgID, s));
    } catch (e) {
      console.log(`   !! ${id} ${s.num}: ${e.message}`);
    }
  }
  if (!built.length) { console.log(`= ${id}: nothing new (${existing.length} existing)`); continue; }

  totalLeg++;
  built.forEach(it => {
    totalNew++;
    if (it.media && it.media.kind === 'committee') comItems++;
    if (it.media && it.media.minutesUrl) withMin++;
    if (it.issueKey) issueTally[it.issueKey] = (issueTally[it.issueKey] || 0) + 1;
  });
  const merged = existing.concat(built);
  console.log(`+ ${id} (${doc.name}): +${built.length} item(s) [${existing.length} -> ${merged.length}]`);
  built.forEach(it => console.log(`    • 🎬 ${it.headline}  #${it.issueKey}\n        ${it.media.url}`));
  if (APPLY) {
    await patchSpotlight(id, doc.__fields, merged);
    console.log('    ✓ written');
  }
}

console.log('\n──────── summary ────────');
console.log(`legislators touched          : ${totalLeg}`);
console.log(`new spotlight items          : ${totalNew}`);
console.log(`committee-video items        : ${comItems}`);
console.log(`with official minutes linked  : ${withMin}`);
console.log('issue tally :', Object.entries(issueTally).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(', '));
console.log(APPLY ? '\nAPPLIED to Firestore.' : '\nDRY RUN — re-run with --apply to write.');
