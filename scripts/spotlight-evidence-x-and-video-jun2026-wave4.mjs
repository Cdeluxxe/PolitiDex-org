#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 evidence pass, WAVE 4
// X-POST evidence (new secondary source) + continued FLOOR-VIDEO backfill of
// thin / rural / single-county sitting Utah legislators.
//
// This wave does two things, both grounded only in primary records re-verified
// live during this pass:
//
//   1) X POSTS as a first-class evidence source.
//      Every X-post item was verified the same way, end to end:
//        • A real status id was discovered (Wayback CDX of the account's
//          timeline) and then re-fetched from the public Twitter syndication
//          endpoint (https://cdn.syndication.twimg.com/tweet-result?id=<id>),
//          which returns the post's EXACT text, created_at date, and the
//          authoring account's screen_name WITHOUT authentication.
//        • An item is used ONLY when the verified screen_name is the
//          legislator's own account, the post is NOT a retweet or reply, and it
//          states a substantive position or action on a specific issue. Memes,
//          generic announcements, and national hot-takes were rejected.
//        • The quoted text below is the verbatim verified post text; the date is
//          the verified created_at; `source.url` is the canonical post link.
//      Honesty note: this channel is hard. Many sitting members have no usable
//      X presence (e.g. no findable account, or an inactive one), and many
//      timelines are dominated by campaign/national content that fails
//      CONTENT_STYLE. Only posts that cleared every check above were used — two
//      legislators in this wave (Fiefia, Pierucci).
//
//   2) FLOOR VIDEO for the remaining thin profiles (same method as waves 1–3).
//      Each item is the member's OWN recorded floor presentation of a bill they
//      chief-sponsored that became law:
//        • Bill record  : https://le.utah.gov/data/2025GS/<bill>.json — prime
//          sponsor, short title, verbatim highlightedProvisions (the basis for
//          each `facts` paragraph), final action (only "Governor Signed" bills
//          are framed as enacted), and the floorDebateList of video markers.
//        • Floor video  : the marker's archive page
//          (floorArchive.jsp?markerID=<id>), whose own `data-offset` (seconds →
//          mm:ss) is the EXACT seek point for that member's segment. Every
//          timestamp below was extracted from that page this pass and the
//          extractor was re-validated against the known value
//          marker 129768 → 1764s → 29:24.
//
// CONTENT_STYLE rules (all waves): every item is about the INDIVIDUAL's own
// words, bill and recorded action — never their party. No party-grouping
// language; signed status is a plain fact from the bill's own action history.
// Every item carries an ISSUE_MAP `issueKey` (validated against the live
// vocabulary in index.html) chosen to match the member's own documented
// keyIssues, so the Spotlight item lands on the same issue as their positions
// and promises.
//
// Forward-looking evidence-view fields (ignored by the current render):
//   • `sourceType`     : 'official_floor_video' | 'x_post' — lets a future
//                        connected view group evidence by kind.
//   • `media`          : the spoken/posted proof ({type, url, timestamp|date,
//                        quote, label}), kept separate from `source` (the
//                        visible, linked citation) so stance + words + promise +
//                        follow-through can be shown side by side.
//
// Idempotent: each member's live `spotlight` array is re-fetched and an item is
// appended ONLY if no existing item shares its headline.
//
//   node scripts/spotlight-evidence-x-and-video-jun2026-wave4.mjs            # dry run
//   node scripts/spotlight-evidence-x-and-video-jun2026-wave4.mjs --apply    # write
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-20T00:00:00.000Z';

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
const floor25 = (id) => `https://le.utah.gov/av/floorArchive.jsp?markerID=${id}`;
const bill = (yr, num) => `https://le.utah.gov/~${yr}/bills/static/${num}.html`;
const xurl = (h, id) => `https://x.com/${h}/status/${id}`;

// Floor-video Spotlight item (member's own presentation of a signed bill).
function vidItem({ issueKey, headline, facts, why, billNum, ts, day, chamber, marker, impact = 'positive', tags }) {
  return {
    date: '2025', impact, category: 'voting', issueKey,
    sourceType: 'official_floor_video',
    tags: tags || ['Notable Actions', 'Public Statements'],
    headline, facts, why,
    source: { label: `${billNum} (2025) — official bill record`, url: bill('2025', billNum.replace(/(\D+)(\d+)/, (_, a, b) => a + b.padStart(4, '0'))) },
    media: {
      type: 'video', timestamp: ts, url: floor25(marker),
      label: `Official Utah ${chamber} floor video — Day ${day}, 2025 General Session`,
    },
  };
}

// X-post Spotlight item (verified via the syndication endpoint).
function xItem({ issueKey, handle, name, statusId, date, dateLabel, quote, headline, facts, why, impact = 'positive', tags }) {
  return {
    date: date.slice(0, 4), impact, category: 'rhetoric', issueKey,
    sourceType: 'x_post',
    tags: tags || ['Public Statements', 'Consistency'],
    headline, facts, why,
    source: { label: `X post — @${handle}, ${dateLabel}`, url: xurl(handle, statusId) },
    media: {
      type: 'x_post', url: xurl(handle, statusId), date,
      label: `X post by ${name} (@${handle}) — ${dateLabel}`,
      quote,
    },
  };
}

// ── The plan: Firestore id → [spotlight items] ──────────────────────────────
const PLAN = {

  // ===== Wayne Harper — Senate District 16 (Salt Lake County) — was 1 item ====
  wharper: [
    vidItem({ issueKey: 'social_security', billNum: 'SB71', day: 41, chamber: 'Senate', ts: '26:28', marker: 131177,
      headline: 'On the Senate floor, presented his Social Security tax-cut bill for seniors (video at 26:28)',
      facts: "Harper chief-sponsored SB71 (2025), Social Security Tax Revisions, expanding eligibility for the Social Security benefits tax credit by raising the income thresholds for its phaseout. The official Senate floor video opens to his presentation on Day 41 of the 2025 session at 26:28; the bill was signed into law.",
      why: "Retirement and senior benefits is a keyissue his profile names, and cutting the tax on Social Security income is a recorded, enacted action in his own words — the first piece of spoken-word evidence on a profile that had carried a single Spotlight item." }),
    vidItem({ issueKey: 'housing_first_time', billNum: 'SB23', day: 1, chamber: 'Senate', ts: '31:17', marker: 128534, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his First Home Investment Zone bill on the Senate floor (video at 31:17)',
      facts: "Harper chief-sponsored SB23 (2025), First Home Investment Zone Amendments, clarifying owner-occupancy requirements and how extraterritorial homes count toward density and owner-occupancy in a first home investment zone. The official Senate floor video opens to his presentation on Day 1 of the 2025 session at 31:17; the bill was signed into law.",
      why: "Tools aimed at putting first-time buyers into owner-occupied homes tie his housing-and-transit work to the cost of homeownership — a recorded, enacted follow-through." }),
  ],

  // ===== Hoang Nguyen — House District 23 (Salt Lake City) — was 1 item ======
  hoang_nguyen: [
    vidItem({ issueKey: 'healthcare', billNum: 'HB391', day: 31, chamber: 'House', ts: '1:16:42', marker: 130324,
      headline: 'On the House floor, presented her Emergency Medical Services bill (video at 1:16:42)',
      facts: "Nguyen chief-sponsored HB391 (2025), Emergency Medical Services Revisions, granting the Bureau of Emergency Medical Services certain enforcement authority and directing the Trauma System and EMS Committee to recommend an annual schedule of fines. The official floor video opens to her presentation on Day 31 of the 2025 session at 1:16:42; the bill was signed into law.",
      why: "Health services is a keyissue her profile names, and strengthening EMS oversight is a recorded, enacted action in her own words — a second Spotlight item for a previously thin profile." }),
  ],

  // ===== Anthony Loubet — House District 27 (Kearns) — was 2 items ===========
  anthony_loubet: [
    vidItem({ issueKey: 'econ_workers', billNum: 'HB111', day: 21, chamber: 'House', ts: '57:43', marker: 129497,
      headline: "Presented his workers'-compensation home-care bill on the House floor (video at 57:43)",
      facts: "Loubet chief-sponsored HB111 (2025), Workers' Compensation Amendments, clarifying the circumstances under which an individual with a disability is the employer of a worker providing home- and community-based services. The official floor video opens to his presentation on Day 21 of the 2025 session at 57:43; the bill was signed into law.",
      why: "Workers' compensation and cost of living is a keyissue his profile names, and clarifying employer status for in-home caregivers is a recorded, enacted action backing it." }),
    vidItem({ issueKey: 'gov_transparency', billNum: 'HB139', day: 37, chamber: 'House', ts: '56:34', marker: 130938, tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor-sponsored his local-government financial-reporting bill (video at 56:34)',
      facts: "Loubet chief-sponsored HB139 (2025), Governmental Accounting Amendments, directing the state auditor to develop a form and requiring a political subdivision's chief financial and administrative officers to include it with the annual financial report. The official floor video opens to his presentation on Day 37 at 56:34; the bill was signed into law.",
      why: "Government transparency and open records is the keyissue his profile leads with, and tightening local-government financial reporting is recorded proof behind it." }),
  ],

  // ===== Ariel Defay — House District 15 (Davis County) — was 2 items ========
  ariel_defay: [
    vidItem({ issueKey: 'transit', billNum: 'HB234', day: 21, chamber: 'House', ts: '32:33', marker: 129444,
      headline: 'Presented her motorcycle-endorsement safety bill on the House floor (video at 32:33)',
      facts: "Defay chief-sponsored HB234 (2025), Motorcycle Safety Amendments, increasing the fine for operating a motorcycle without an endorsement while requiring courts to waive the increase if the rider obtains the endorsement within 30 days. The official floor video opens to her presentation on Day 21 of the 2025 session at 32:33; the bill was signed into law.",
      why: "Transportation and motorcycle safety is a keyissue her profile names, and this is a recorded, enacted follow-through argued in her own words." }),
    vidItem({ issueKey: 'public_schools', billNum: 'HB144', day: 11, chamber: 'House', ts: '35:56', marker: 128953, tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor-sponsored her school-district contracting oversight bill (video at 35:56)',
      facts: "Defay chief-sponsored HB144 (2025), School District Contracting Amendments, barring a local education agency from contracting with the U.S. Department of Justice unless the attorney general's office reviews the contract or settlement, and requiring that review. The official floor video opens to her presentation on Day 11 at 35:56; the bill was signed into law.",
      why: "Education contracting and accountability is a keyissue her profile names — a recorded, enacted action in her own words." }),
  ],

  // ===== Matt MacPherson — House District 26 (West Valley) — was 2 items =====
  matt_macpherson: [
    vidItem({ issueKey: 'gov_transparency', billNum: 'HB477', day: 38, chamber: 'House', ts: '50:16', marker: 130988,
      headline: 'Presented his school-board public-comment protection bill on the House floor (video at 50:16)',
      facts: "MacPherson chief-sponsored HB477 (2025), School Trespass Amendments, providing that compliant public comment in a local school board meeting may not be the basis for criminal trespass and narrowing the scope of school property covered by the trespass statute. The official floor video opens to his presentation on Day 38 of the 2025 session at 50:16; the bill was signed into law.",
      why: "Protecting residents' ability to speak at a school board meeting connects his open-government and school keyissues — a recorded, enacted action in his own words." }),
    vidItem({ issueKey: 'privacy_rights', billNum: 'HB508', day: 38, chamber: 'House', ts: '54:59', marker: 130992, tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor-sponsored his student-data privacy bill (video at 54:59)',
      facts: "MacPherson chief-sponsored HB508 (2025), School Data Amendments, creating a Data Systems and Reporting Advisory Committee and requiring the state board to study how local education agencies collect and retain students' personally identifiable information. The official floor video opens to his presentation on Day 38 at 54:59; the bill was signed into law.",
      why: "School safety and student data is a keyissue his profile names, and scrutinizing how schools handle student PII is a recorded, enacted action backing it." }),
  ],

  // ===== Nelson Abbott — House District 57 (Provo) — was 2 items =============
  nelson_abbott: [
    vidItem({ issueKey: 'health_mental', billNum: 'HB276', day: 22, chamber: 'House', ts: '56:38', marker: 129551,
      headline: 'Presented his civil-commitment and disability-rights bill on the House floor (video at 56:38)',
      facts: "Abbott chief-sponsored HB276 (2025), Commitment Revisions, amending the definitions of 'intellectual disability' and related care-facility terms and revising the rights afforded to an individual under commitment. The official floor video opens to his presentation on Day 22 of the 2025 session at 56:38; the bill was signed into law.",
      why: "Mental health and civil-commitment reform is the keyissue his profile leads with, and updating commitment standards and patient rights is recorded proof behind it." }),
  ],

  // ===== Katy Hall — House District 11 (Davis/Weber) — was 2 items ===========
  katy_hall: [
    vidItem({ issueKey: 'healthcare_market', billNum: 'HB503', day: 37, chamber: 'House', ts: '1:06:33', marker: 130812,
      headline: 'Presented her medical-malpractice reform bill on the House floor (video at 1:06:33)',
      facts: "Hall chief-sponsored HB503 (2025), Medical Malpractice Modifications, repealing affidavit-of-merit requirements and revising procedures and judgments in medical malpractice actions. The official floor video opens to her presentation on Day 37 of the 2025 session at 1:06:33; the bill was signed into law.",
      why: "Medical malpractice reform is a keyissue her profile names, and overhauling malpractice procedure is a recorded, enacted action in her own words." }),
    vidItem({ issueKey: 'healthcare', billNum: 'HB93', day: 17, chamber: 'House', ts: '52:24', marker: 129269, tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor-sponsored her brain- and spinal-cord-injury research bill (video at 52:24)',
      facts: "Hall chief-sponsored HB93 (2025), Rehabilitation Services Modifications, allowing the Brain and Spinal Cord Injury Fund to support nervous-system research, modifying the advisory committee's membership, and requiring quarterly meetings. The official floor video opens to her presentation on Day 17 at 52:24; the bill was signed into law.",
      why: "Healthcare workforce and patient-care standards is a keyissue her profile names — a recorded, enacted follow-through." }),
  ],

  // ===== Stephen L. Whyte — House District 63 (Utah County) — was 2 items ====
  stephen_l_whyte: [
    vidItem({ issueKey: 'edu_college_cost', billNum: 'HB97', day: 10, chamber: 'House', ts: '1:00:33', marker: 128898,
      headline: 'Presented his private-postsecondary tuition-refund bill on the House floor (video at 1:00:33)',
      facts: "Whyte chief-sponsored HB97 (2025), Private Postsecondary Education Modifications, exempting a reasonable deposit from the amount a postsecondary school must refund a student under certain circumstances. The official floor video opens to his presentation on Day 10 of the 2025 session at 1:00:33; the bill was signed into law.",
      why: "Private postsecondary education oversight is a keyissue his profile names, and setting clearer refund rules for students is a recorded, enacted action in his own words." }),
  ],

  // ===== David Shallenberger — House District 58 (Utah County) — was 2 items =
  david_shallenberger: [
    vidItem({ issueKey: 'lands_balance', billNum: 'HB98', day: 17, chamber: 'House', ts: '44:57', marker: 129238,
      headline: 'Presented his landowner-liability recreation bill on the House floor (video at 44:57)',
      facts: "Shallenberger chief-sponsored HB98 (2025), Landowner Liability Amendments, adding new activities to the definition of 'recreational purpose' in the landowner-liability statute. The official floor video opens to his presentation on Day 17 of the 2025 session at 44:57; the bill was signed into law.",
      why: "Public lands and outdoor access is a keyissue his profile names, and broadening recreational-use protections for landowners is a recorded, enacted action backing it." }),
  ],

  // ===== Doug Welton — House District 65 (Utah County) — was 4 items =========
  doug_welton: [
    vidItem({ issueKey: 'health_rural', billNum: 'HB298', day: 35, chamber: 'House', ts: '1:31:52', marker: 130635,
      headline: 'Presented his volunteer-EMS insurance bill on the House floor (video at 1:31:52)',
      facts: "Welton chief-sponsored HB298 (2025), Volunteer Emergency Medical Service Personnel Insurance Program Amendments, allowing additional municipalities to participate in the program that insures volunteer EMS personnel. The official floor video opens to his presentation on Day 35 of the 2025 session at 1:31:52; the bill was signed into law.",
      why: "Volunteer public-safety personnel benefits is a keyissue his profile names, and expanding insurance access for volunteer EMS crews — many of them rural — is a recorded, enacted action in his own words." }),
  ],

  // ===== Mark Strong — House District 47 (Salt Lake County) — was 2 items ====
  mark_strong: [
    vidItem({ issueKey: 'back_police', billNum: 'HB127', day: 14, chamber: 'House', ts: '39:12', marker: 129027,
      headline: 'Presented his sexual-crime sentencing bill on the House floor (video at 39:12)',
      facts: "Strong chief-sponsored HB127 (2025), Sexual Crime Amendments, increasing the sentence for rape, object rape, and forcible sodomy when committed against an incapacitated individual. The official floor video opens to his presentation on Day 14 of the 2025 session at 39:12; the bill was signed into law.",
      why: "Public safety and crimes against vulnerable people is a keyissue his profile names, and stiffening penalties for assaults on incapacitated victims is a recorded, enacted action in his own words." }),
  ],

  // ===== Lisa Shepherd — House District 61 (Utah County) — was 2 items =======
  lisa_shepherd: [
    vidItem({ issueKey: 'gov_transparency', billNum: 'HB504', day: 38, chamber: 'House', ts: '1:35:16', marker: 131019,
      headline: 'Presented her candidate financial-disclosure bill on the House floor (video at 1:35:16)',
      facts: "Shepherd chief-sponsored HB504 (2025), Financial and Conflict of Interest Disclosures by Candidates Amendments, requiring candidates for county, municipal, and special-district office to file a conflict-of-interest disclosure when they declare candidacy. The official floor video opens to her presentation on Day 38 of the 2025 session at 1:35:16; the bill was signed into law.",
      why: "Candidate financial disclosure is a keyissue her profile names, and extending disclosure to local candidates is recorded proof behind it." }),
  ],

  // ===== Sahara Hayes — House District 32 (Millcreek) — was 2 items ==========
  sahara_hayes: [
    vidItem({ issueKey: 'public_schools', billNum: 'HB479', day: 35, chamber: 'House', ts: '34:43', marker: 130605,
      headline: 'Presented her student-athlete NIL protections bill on the House floor (video at 34:43)',
      facts: "Hayes chief-sponsored HB479 (2025), Student Athlete Revisions, allowing an institution of higher education to compensate a student athlete directly for use of the athlete's name, image, and likeness and providing related protections. The official floor video opens to her presentation on Day 35 of the 2025 session at 34:43; the bill was signed into law.",
      why: "Student-athlete protections is a keyissue her profile names, and setting the terms for direct NIL compensation is a recorded, enacted action in her own words." }),
  ],

  // ===== Doug Fiefia — House District 48 (Herriman) — X-POST evidence ========
  doug_fiefia: [
    xItem({ issueKey: 'privacy_rights', handle: 'DougFiefia', name: 'Doug Fiefia',
      statusId: '2015906634472870285', date: '2026-01-26', dateLabel: 'Jan 26, 2026',
      quote: "My bill HB 286 tackles this directly. We can't repeat the social media mistake. Child safety in AI must be mandatory, not optional.",
      headline: "Posted on X that 'child safety in AI must be mandatory, not optional,' backing his HB286",
      facts: "On January 26, 2026, Fiefia wrote on his verified X account (@DougFiefia): “My bill HB 286 tackles this directly. We can’t repeat the social media mistake. Child safety in AI must be mandatory, not optional.” HB286, his AI child-safety transparency bill, is the measure his profile already tracks.",
      why: "His own dated words put a clear position behind a bill his Spotlight record shows did not survive the 2025 session — stance and follow-through, in the legislator's own voice, on the AI child-safety issue he leads with." }),
  ],

  // ===== Candice Pierucci — House District 49 (Herriman) — X-POST evidence ====
  cpierucci: [
    xItem({ issueKey: 'gov_transparency', handle: 'CandicePierucci', name: 'Candice B. Pierucci',
      statusId: '1506443975766548483', date: '2022-03-23', dateLabel: 'Mar 23, 2022',
      quote: 'HB 90: Transparency in Lobbying & Disclosures Amendments has been signed into law... Individuals who lobby on behalf of foreign governments are now required to register as lobbyists in Utah.',
      headline: 'Announced on X that her foreign-lobbying disclosure bill (HB90) was signed into law',
      facts: "On March 23, 2022, Pierucci wrote on her verified X account (@CandicePierucci) that “HB 90: Transparency in Lobbying & Disclosures Amendments has been signed into law,” adding that individuals who lobby on behalf of foreign governments are now required to register as lobbyists in Utah. HB90 (2022), Lobbying and Disclosures Amendments, was her chief-sponsored bill.",
      why: "Her own real-time post documents a transparency measure she authored and saw enacted — concrete follow-through behind the government-transparency record her profile tracks." }),
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

let totalNew = 0, totalLeg = 0, vid = 0, xp = 0;
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
    if (it.sourceType === 'x_post') xp++; else vid++;
    if (it.issueKey) issueTally[it.issueKey] = (issueTally[it.issueKey] || 0) + 1;
  });
  const merged = existing.concat(toAdd);
  console.log(`+ ${id} (${doc.name}): +${toAdd.length} [${existing.length} -> ${merged.length}]`);
  toAdd.forEach(it => console.log(`    • [${it.sourceType === 'x_post' ? 'X' : 'video ' + it.media.timestamp}] ${it.headline}  #${it.issueKey}`));
  if (APPLY) {
    await patchSpotlight(id, doc.__fields, merged);
    console.log('    ✓ written');
  }
}

console.log('\n──────── summary ────────');
console.log(`legislators touched   : ${totalLeg}`);
console.log(`new spotlight items   : ${totalNew}`);
console.log(`  official floor video : ${vid}`);
console.log(`  X posts (verified)   : ${xp}`);
console.log('issue tally :', Object.entries(issueTally).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(', '));
console.log(APPLY ? '\nAPPLIED to Firestore.' : '\nDRY RUN — re-run with --apply to write.');
