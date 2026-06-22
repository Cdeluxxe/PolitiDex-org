#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 targeted VIDEO-EVIDENCE pass for sitting Utah
// legislators who carried ZERO video-based Spotlight items.
//
// Scope was set by an audit of the live `politicians` collection: of the
// current sitting Utah State Legislators, the members with no video evidence at
// all were Carol Spackman Moss, John Arthur, Leah Hansen, Nate Blouin, Rob
// Bishop, Sandra Hollins, and Angela Romero. This pass adds the strongest floor
// and committee video that actually exists for each — and, where it does not
// exist, deliberately adds nothing.
//
// HONEST OUTCOME OF THE AUDIT (verified against le.utah.gov's own bill data):
//   • Leah Hansen  — prime-sponsored NO bill in the 2025 or 2026 General
//     Sessions (she campaigns on a deliberately limited legislative footprint
//     and appears only as a co-sponsor). With no bill of her own to present,
//     there is no floor or committee presentation to cite. Left untouched.
//   • Rob Bishop   — seated May 6, 2026, AFTER the 2026 General Session
//     adjourned, and was not a member during the 2025 session. He has no Utah
//     legislative floor/committee record yet. Left untouched.
//   These two are intentionally omitted; their profiles stay light on video
//   because that accurately reflects reality.
//
// HOW EACH ITEM WAS GROUNDED (no fabrication):
//   • Bill record   : https://le.utah.gov/data/<YEAR>GS/<bill>.json — gives the
//     prime sponsor, short title, the verbatim highlightedProvisions each
//     `facts` paragraph is built from, the full actionHistoryList (used to state
//     each bill's REAL outcome — "Governor Signed", "passed the House", etc. —
//     no bill is described as enacted unless its history shows it), the
//     `floorDebateList` (per-bill floor-video markers, tagged with the sponsor's
//     surname + chamber), and the `agendaList` (committee hearings, each with a
//     meeting id, a timeline marker, the agenda item, and the official minutes).
//   • Floor video   : 2025 markers expose a per-segment offset on
//     https://le.utah.gov/av/floorArchive.jsp?markerID=<id>; every mm:ss below
//     was extracted live from that marker's own button (data-offset, seconds →
//     mm:ss) and re-verified this pass. The link seeks the official recording to
//     the member's segment.
//   • Committee video: 2026 committee recordings are addressed by meeting id and
//     a per-item timelineID on
//     https://le.utah.gov/av/committeeArchive.jsp?mtgID=<m>&timelineID=<t>. The
//     committee archive exposes no machine-readable mm:ss, so NO timestamp is
//     asserted for committee items; instead the meeting recording + agenda item
//     + the official minutes (which state, verbatim, that the member "presented
//     the bill") are the verifiable locator. Each minutes page below was read
//     and confirmed to record the member personally presenting.
//
// CONTENT_STYLE rules: every item is about the INDIVIDUAL's own bill, words, and
// recorded action — never their party. A bill's fate is stated as a plain,
// neutral fact from its own action history ("the House passed it, but it did not
// clear the Senate before the session ended"), with no partisan framing about
// who advanced or blocked it. Every item carries a valid ISSUE_MAP issueKey,
// chosen to match the member's own documented stances/promises so the Spotlight
// item lands on the same issue as their position and the promise it backs
// (which is what wires it into the Evidence Locker, "Stance at a Glance", and
// Connected Evidence views). Idempotent: each member's live `spotlight` array is
// re-fetched and an item is appended ONLY if no existing item shares its headline.
//
//   node scripts/spotlight-zero-video-legislators-jun2026.mjs            # dry run
//   node scripts/spotlight-zero-video-legislators-jun2026.mjs --apply    # write
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
// Official bill record (sponsor, provisions, signed status).
const bill = (yr, num) => `https://le.utah.gov/~${yr}/bills/static/${num}.html`;
// Official Utah Legislature floor-video marker (seeks to the sponsor's segment).
const floorUrl = (id) => `https://le.utah.gov/av/floorArchive.jsp?markerID=${id}`;
// Floor-video media object — a verified mm:ss offset is asserted.
const fvid = (ts, day, chamber, year, markerID) => ({
  type: 'video', kind: 'floor', timestamp: ts,
  label: `Official Utah ${chamber} floor video — Day ${day}, ${year} General Session`,
  url: floorUrl(markerID), markerID: String(markerID),
});
// Official archived committee recording, seeked to the bill's agenda segment.
const comUrl = (mtgID, timelineID) =>
  `https://le.utah.gov/av/committeeArchive.jsp?mtgID=${mtgID}&timelineID=${timelineID}`;
// Committee-video media object — NO mm:ss is asserted (the committee archive
// exposes none); the meeting recording + agenda item + linked minutes are the
// verifiable locator.
const cvid = (committee, dateLabel, year, mtgID, timelineID, item, min) => ({
  type: 'video', kind: 'committee',
  label: `Official Utah Legislature committee hearing video — ${committee}, ${dateLabel} (${year} General Session)`,
  url: comUrl(mtgID, timelineID),
  mtgID: String(mtgID), markerID: String(timelineID), agendaItem: String(item),
  minutesUrl: `https://le.utah.gov${min}`,
});

// ── The plan: Firestore id → [spotlight items] ──────────────────────────────
const PLAN = {

  // ===== Carol Spackman Moss — House District 34 (Salt Lake) — was 0 video ====
  carol_spackman_moss: [
    { date: '2026', impact: 'positive', category: 'voting', issueKey: 'healthcare',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her overdose Good Samaritan bill to a House committee (HB295, 2026)',
      facts: "Moss chief-sponsored HB295 (2026), Overdose Amendments, broadening the affirmative defense that protects a person who seeks medical help while reporting a drug overdose. She personally presented the bill to the House Law Enforcement and Criminal Justice Committee on Feb. 23, 2026 — joined by an advocate from Utah Support Advocates for Recovery Awareness — and the official committee recording archives that presentation, which the committee minutes also record. The House passed the bill, but it did not clear the Senate before the session ended.",
      why: "Expanding overdose response is the throughline of Moss's long record on naloxone access, and the committee video is the first recorded spoken-word evidence behind that work on a profile that previously carried none.",
      source: { label: 'HB295 (2026) — official bill record', url: bill('2026', 'HB0295') },
      media: cvid('House Law Enforcement and Criminal Justice Committee', 'Feb. 23, 2026', '2026', 20512, 299399, 1, '/interim/2026/html/00001822.htm') },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'rights_balance',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'On the House floor, carried her bill keeping the Native American Remains Review Committee alive (HB11)',
      facts: "Moss chief-sponsored HB11 (2025), Native American Remains Review Committee Amendments, extending that committee's sunset for five years. The official House floor video opens to her handling of the bill on Day 1 of the 2025 General Session at 1:20:40; the bill was signed into law.",
      why: "Preserving and honoring Native American remains is a promise her profile records as kept, and the recording shows her securing the review committee's future in her own words.",
      source: { label: 'HB11 (2025) — official bill record', url: bill('2025', 'HB0011') },
      media: fvid('1:20:40', 1, 'House', '2025', 128536) },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'econ_smallbiz',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Floor-sponsored her on-premise sign licensing bill (HB28, video at 1:16:06)',
      facts: "Moss chief-sponsored HB28 (2025), On Premise Sign Installation Amendments, defining terms and revising the licensure provisions for on-premise sign-installation contractors. The official House floor video opens to her presentation on Day 16 of the 2025 General Session at 1:16:06; the bill was signed into law.",
      why: "Clarifying the on-premise sign installation rules is a promise her profile records as kept — argued on the record and now law.",
      source: { label: 'HB28 (2025) — official bill record', url: bill('2025', 'HB0028') },
      media: fvid('1:16:06', 16, 'House', '2025', 129196) },
  ],

  // ===== John Arthur — House District 41 (Salt Lake) — was 0 video ============
  // Seated Dec. 9, 2025, so his entire floor/committee record is the 2026 session.
  john_arthur: [
    { date: '2026', impact: 'positive', category: 'voting', issueKey: 'water',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his landscaper-certification bill in committee — his first enacted law (HB313)',
      facts: "Arthur chief-sponsored HB313 (2026), Landscaper Certification Amendments, directing the Division of Professional Licensing to recognize a landscaping specialty contractor and to require continuing education for that work. He personally presented the bill to the House Business, Labor, and Commerce Committee on Feb. 12, 2026, and answered members' questions; the official committee recording archives that presentation, which the minutes also record. The bill was signed into law.",
      why: "Advancing waterwise landscaping to protect the Great Salt Lake is the promise Arthur's profile leads with, and a licensing-and-education framework he ties to that goal is now his first enacted law — recorded in his own words.",
      source: { label: 'HB313 (2026) — official bill record', url: bill('2026', 'HB0313') },
      media: cvid('House Business, Labor, and Commerce Committee', 'Feb. 12, 2026', '2026', 20284, 296792, 1, '/interim/2026/html/00001661.htm') },
    { date: '2026', impact: 'positive', category: 'voting', issueKey: 'edu_balance',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented his certified-teacher-librarian staffing bill in committee (HB364)',
      facts: "Arthur chief-sponsored HB364 (2026), Certified Teacher Librarian Amendments, requiring a school district or regional education service agency to staff a certified teacher-librarian. He personally presented the bill to the House Education Committee on Feb. 17, 2026, with a district library-media specialist assisting; the official committee recording archives that presentation, which the minutes also record. The bill did not advance out of the House.",
      why: "Staffing every school with a certified teacher-librarian is a promise Arthur's profile tracks; the committee video is recorded proof that the 2021 Utah Teacher of the Year made the case for it himself.",
      source: { label: 'HB364 (2026) — official bill record', url: bill('2026', 'HB0364') },
      media: cvid('House Education Committee', 'Feb. 17, 2026', '2026', 20511, 297665, 2, '/interim/2026/html/00001693.htm') },
    { date: '2026', impact: 'positive', category: 'voting', issueKey: 'housing_support',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his rental-notice tenant-protection bill in committee (HB478)',
      facts: "Arthur chief-sponsored HB478 (2026), Residential Rental Modifications, setting a required notice period before a landlord may impose a rent increase or an additional fee on a tenant. He personally presented the bill to the House Business, Labor, and Commerce Committee on Feb. 24, 2026, and answered members' questions; the official committee recording archives that presentation, which the minutes also record. The bill did not advance out of the House.",
      why: "Requiring advance notice before rent increases is a promise his profile records, and the committee video shows him pressing the renter-protection case in his own words.",
      source: { label: 'HB478 (2026) — official bill record', url: bill('2026', 'HB0478') },
      media: cvid('House Business, Labor, and Commerce Committee', 'Feb. 24, 2026', '2026', 20498, 300019, 3, '/interim/2026/html/00001892.htm') },
  ],

  // ===== Nate Blouin — Senate District 13 (Salt Lake) — was 0 video ==========
  nate_blouin: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'water',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'On the Senate floor, presented his Great Salt Lake water-commitment bill (SB131, video at 51:13)',
      facts: "Blouin chief-sponsored SB131 (2025), Water Commitment Amendments, allowing a commitment of available water to uses on the Great Salt Lake to count within a water-conservation plan. The official Senate floor video opens to his presentation on Day 15 of the 2025 General Session at 51:13. The Senate passed the bill, but it did not clear the House before the session ended.",
      why: "Saving the Great Salt Lake is a priority Blouin's profile names, and the recording shows him advancing a concrete tool for it on the floor — spoken-word evidence behind his promise to protect the lake's water level.",
      source: { label: 'SB131 (2025) — official bill record', url: bill('2025', 'SB0131') },
      media: fvid('51:13', 15, 'Senate', '2025', 129404) },
    { date: '2026', impact: 'positive', category: 'voting', issueKey: 'enviro_energy',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented his electrical-grid reliability bill to a Senate committee (SB282)',
      facts: "Blouin chief-sponsored SB282 (2026), Electrical Grid Amendments, requiring large new electric loads to demonstrate a net-neutral or net-positive impact on grid reliability and on retail customers before connecting. He personally presented the bill to the Senate Transportation, Public Utilities, Energy, and Technology Committee on Feb. 18, 2026; the official committee recording archives that presentation, which the minutes also record. The bill did not advance to a Senate floor vote.",
      why: "Clean-energy and grid modernization is the issue Blouin's profile leads with, and the committee video adds recorded evidence of him pressing utilities on reliability — the throughline from his earlier grid-technology work.",
      source: { label: 'SB282 (2026) — official bill record', url: bill('2026', 'SB0282') },
      media: cvid('Senate Transportation, Public Utilities, Energy, and Technology Committee', 'Feb. 18, 2026', '2026', 20456, 298461, 3, '/interim/2026/html/00001821.htm') },
  ],

  // ===== Sandra Hollins — House District 21 (Salt Lake) — was 0 video ========
  sandra_hollins: [
    { date: '2026', impact: 'positive', category: 'voting', issueKey: 'rights_balance',
      tags: ['Notable Actions', 'Public Statements'],
      headline: "Presented her bill aligning Utah's Juneteenth observance with the federal date — now law (HB309)",
      facts: "Hollins chief-sponsored HB309 (2026), Juneteenth Observance Amendments, providing that Utah recognizes Juneteenth National Freedom Day on the same day the federal government observes it. She personally presented the bill to the House Economic Development and Workforce Services Committee on Jan. 30, 2026; the official committee recording archives that presentation, which the minutes also record. The bill was signed into law.",
      why: "Fixing the Juneteenth observance date is a promise her profile tracks, and the committee video is recorded proof of the follow-through — completing the holiday she first established.",
      source: { label: 'HB309 (2026) — official bill record', url: bill('2026', 'HB0309') },
      media: cvid('House Economic Development and Workforce Services Committee', 'Jan. 30, 2026', '2026', 20307, 292022, 6, '/interim/2026/html/00001147.htm') },
    { date: '2025', impact: 'neutral', category: 'voting', issueKey: 'rights_balance',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'On the House floor, carried her earlier Juneteenth legal-holiday bill (HB370, video at 1:42:49)',
      facts: "A session earlier, Hollins chief-sponsored HB370 (2025), State Holiday Modifications, to make June 19 — Juneteenth National Freedom Day — a legal state holiday. The official House floor video opens to her presentation on Day 28 of the 2025 General Session at 1:42:49. The House passed the bill, but it did not clear the Senate that year — the work she completed in 2026 with HB309.",
      why: "The recording shows Hollins making the case for Juneteenth on the floor a full session before the fix became law — evidence of the persistence behind a promise her profile tracks.",
      source: { label: 'HB370 (2025) — official bill record', url: bill('2025', 'HB0370') },
      media: fvid('1:42:49', 28, 'House', '2025', 129932) },
  ],

  // ===== Angela Romero — House District 25 (Salt Lake) — was 0 video =========
  aromero: [
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'justice_reform',
      tags: ['Notable Actions', 'Public Statements'],
      headline: 'On the House floor, presented her bill barring forced polygraphs of sexual-assault victims (HB17, video at 56:08)',
      facts: "Romero chief-sponsored HB17 (2025), Limitations on the Use of Polygraphs, barring police, prosecutors, and courts from requiring or requesting that a victim of a sexual offense take a polygraph examination. The official House floor video opens to her presentation on Day 11 of the 2025 General Session at 56:08. The House passed the bill, but it did not clear the Senate before the session ended.",
      why: "Strengthening protections for victims of sexual offenses is central to Romero's record, and the recording shows her arguing the case herself — spoken-word evidence on a profile that previously had none.",
      source: { label: 'HB17 (2025) — official bill record', url: bill('2025', 'HB0017') },
      media: fvid('56:08', 11, 'House', '2025', 128968) },
    { date: '2025', impact: 'positive', category: 'voting', issueKey: 'rights_balance',
      tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented her bill to reestablish the Missing and Murdered Indigenous Relatives Task Force on the House floor (HB15, video at 38:43)',
      facts: "Romero chief-sponsored HB15 (2025), Murdered and Missing Indigenous Relatives Task Force Amendments, reestablishing the task force with a defined nine-member membership. The official House floor video opens to her presentation on Day 35 of the 2025 General Session at 38:43. The House passed the bill, but it did not clear the Senate before the session ended.",
      why: "Confronting violence against Native women is a cause Romero's profile names, and the recording shows her fighting to keep the task force alive in her own words.",
      source: { label: 'HB15 (2025) — official bill record', url: bill('2025', 'HB0015') },
      media: fvid('38:43', 35, 'House', '2025', 130540) },
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

let totalNew = 0, totalLeg = 0, withTs = 0, floorItems = 0, cmteItems = 0;
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
    if (it.media && it.media.kind === 'floor') floorItems++;
    if (it.media && it.media.kind === 'committee') cmteItems++;
    if (it.media && it.media.timestamp) withTs++;
    if (it.issueKey) issueTally[it.issueKey] = (issueTally[it.issueKey] || 0) + 1;
  });
  const merged = existing.concat(toAdd);
  console.log(`+ ${id} (${doc.name}): +${toAdd.length} item(s) [${existing.length} -> ${merged.length}]`);
  toAdd.forEach(it => console.log(`    • [${it.media.kind}${it.media.timestamp ? ' ⏱ ' + it.media.timestamp : ''}] ${it.headline}  #${it.issueKey}`));
  if (APPLY) {
    await patchSpotlight(id, doc.__fields, merged);
    console.log('    ✓ written');
  }
}

console.log('\n──────── summary ────────');
console.log(`legislators touched         : ${totalLeg}`);
console.log(`new spotlight items         : ${totalNew}`);
console.log(`  floor-video items         : ${floorItems}`);
console.log(`  committee-video items     : ${cmteItems}`);
console.log(`items with direct timestamp : ${withTs}`);
console.log('issue tally :', Object.entries(issueTally).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(', '));
console.log('intentionally left thin     : Leah Hansen (no bill sponsored), Rob Bishop (seated after the 2026 session)');
console.log(APPLY ? '\nAPPLIED to Firestore.' : '\nDRY RUN — re-run with --apply to write.');
