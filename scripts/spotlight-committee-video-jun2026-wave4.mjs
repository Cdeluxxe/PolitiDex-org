#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 COMMITTEE-VIDEO Spotlight pass, WAVE 4
//
// Fourth wave of the committee-hearing video evidence layer opened by
// scripts/spotlight-committee-video-jun2026.mjs (continued in -wave2 / -wave3).
// This wave DEEPENS the records of sitting Utah legislators who already carry
// solid FLOOR-video Spotlight coverage but had NO committee video yet. A bill's
// committee hearing is where the chief sponsor gives the fullest spoken
// explanation of its purpose, so committee video adds a second, substantively
// different on-the-record layer to a profile that already shows the member on
// the floor.
//
// SELECTION (deepen, don't repeat):
//   • Targets are the 20 current legislators with >=1 FLOOR-video item and 0
//     committee-video items (the "has floor, no committee" set).
//   • For each, only NEW bills are used — a bill already carried by any existing
//     Spotlight item (floor or text) is skipped, so committee video never just
//     echoes a card the member already has. This keeps floor and committee
//     evidence pointed at DIFFERENT bills, so no dedup conflict is created.
//   • Each chosen bill is one the member CHIEF-SPONSORED and PERSONALLY
//     presented in their OWN chamber's standing committee.
//
// HOW EACH ITEM WAS BUILT AND VERIFIED (live, this pass):
//   • Bill record   : https://le.utah.gov/data/2025GS/<bill>.json — prime
//     sponsor, short title, highlighted provisions (which the `facts` summarize),
//     final action (`lastAction`), and the `agendaList` of committee hearings
//     (each with mtgID, markerID, agenda item, committee name/date, minutes URL).
//   • Committee video: https://le.utah.gov/av/committeeArchive.jsp?mtgID=<mtgID>
//     &markerID=<markerID> — the official archived recording, seeked to the
//     bill's agenda-item segment via its markerID.
//   • Committee minutes: each bill's own-chamber minutes were fetched and read
//     THIS pass to confirm the member PERSONALLY presented/introduced the bill
//     (e.g. "Rep. Chevrier presented the bill"). A bill was kept only when the
//     minutes explicitly record the member presenting it.
//
// HONESTY / CONTENT_STYLE rules:
//   • Every item is about the INDIVIDUAL's own bill, words, and recorded action —
//     never their party. No party-grouping language.
//   • OUTCOMES ARE STATED HONESTLY. Most of these bills did NOT become law: at
//     the close of the 2025 General Session their final action is "House/ filed"
//     or "Senate/ filed", which means they died when the session adjourned on
//     March 7, 2025. Each `facts` block says so plainly. The one enacted bill in
//     this wave (Hinkins, SB57) is stated as signed into law. The committee
//     presentation itself — the member explaining and defending the bill on the
//     record — is the evidence; passage is reported separately and accurately.
//   • NO fabricated timestamps. The committee archive publishes no machine-
//     readable per-bill mm:ss offset, so `media.timestamp` is intentionally
//     omitted; the meeting recording (mtgID) seeked by the bill's markerID, plus
//     the agenda-item number and the linked official minutes, are the verifiable
//     locator. (Same policy as committee waves 1-3.)
//   • Every item carries a valid issueKey chosen to land on the member's OWN
//     documented focus so it connects to their existing Issue Positions/Promises.
//   • Idempotent: each member's live `spotlight` array is re-fetched and an item
//     is appended ONLY if no existing item shares its headline.
//
//   node scripts/spotlight-committee-video-jun2026-wave4.mjs            # dry run
//   node scripts/spotlight-committee-video-jun2026-wave4.mjs --apply    # write
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-21T00:00:00.000Z';

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
// pretty bill label e.g. HB0312 -> HB312, SCR003 -> SCR3
const pretty = (num) => num.replace(/^([A-Z]+)0*(\d+)$/, '$1$2');

// ── live bill cache (le.utah.gov data API) ─────────────────────────────────
const billCache = {};
async function getBill(num) {
  if (billCache[num]) return billCache[num];
  const r = await fetch(`https://le.utah.gov/data/2025GS/${num}.json`);
  if (!r.ok) throw new Error(`bill fetch ${num} -> ${r.status}`);
  const j = await r.json();
  billCache[num] = j;
  return j;
}

// Pick the member's own-chamber standing-committee hearing for this bill: the
// first agenda entry in the member's chamber that carries a real markerID.
function ownHearing(bill, isSen) {
  const list = bill.agendaList || [];
  const mine = list.filter(a => {
    const cn = a.committeeName || '';
    return isSen ? /Senate/.test(cn) : /House/.test(cn);
  });
  const withMarker = mine.find(a => a.markerID && String(a.markerID).trim());
  return withMarker || mine[0];
}

// build the committee-video media object for an item, from the bill's own hearing
async function media(num, isSen) {
  const bill = await getBill(num);
  const h = ownHearing(bill, isSen);
  if (!h || !h.markerID) throw new Error('no usable own-chamber hearing for ' + num);
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
async function item(num, isSen, o) {
  return {
    date: '2025', impact: o.impact || 'neutral', category: 'voting', issueKey: o.issueKey,
    tags: o.tags || ['Notable Actions', 'Public Statements'],
    headline: o.headline,
    facts: o.facts,
    why: o.why,
    source: source(num),
    media: await media(num, isSen),
  };
}

// ── The plan: Firestore id -> [ {num, isSen, item fields} ] ─────────────────
// isSen = the member's chamber (true = Senate, false = House).
const PLAN = {

  // ===== Doug Fiefia — House — has 2 floor items, no committee yet =====
  doug_fiefia: [
    { num: 'HB0445', isSen: false, issueKey: 'election_integrity', impact: 'neutral', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his election-law overhaul in committee (HB445)',
      facts: "Fiefia chief-sponsored HB445 (2025), Revisions to Election Law, which would have moved the voter-registration deadline to 21 days before an election for every registration method, set deadlines for voters to request or change a mail ballot, and expanded what an election officer must report about ballots. He personally presented the bill to the House Government Operations Committee on Feb. 20, 2025; the official committee recording archives it and the minutes record his presentation. The bill did not pass before the 2025 General Session adjourned.",
      why: "Fiefia's record centers on faster, more transparent elections; the committee video is his own spoken case for the registration-deadline and mail-ballot reporting changes, deepening the floor work already on his profile." },
  ],

  // ===== Jason Thompson — House — 2 floor items =====
  jason_thompson: [
    { num: 'HB0389', isSen: false, issueKey: 'family_support', impact: 'neutral', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his employer child-care tax-credit bill in committee (HB389)',
      facts: "Thompson chief-sponsored HB389 (2025), Child Care Business Tax Credit, which would have created nonrefundable corporate and individual income-tax credits for employer-provided child care. He personally presented the bill to the House Revenue and Taxation Committee on Feb. 19, 2025; the official committee recording archives it and the minutes record his presentation. The bill did not pass before the 2025 General Session adjourned.",
      why: "Child-care affordability and supply is one of Thompson's stated priorities; the committee record shows him making the case for the employer-credit approach himself, beyond the floor bills already on his profile." },
    { num: 'HB0524', isSen: false, issueKey: 'healthcare', impact: 'neutral', tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his non-nicotine inhalation-product safety bill before committee (HB524)',
      facts: "Thompson chief-sponsored HB524 (2025), Non-nicotine Inhalation Product Amendments, which would have banned the sale of non-nicotine inhalation products lacking federal approval, folded them into the electronic-cigarette product registry, and added penalties. He personally presented the bill to the House Health and Human Services Committee on Feb. 28, 2025, where it was advanced as a substitute; the official committee recording archives it. The bill did not pass before the 2025 General Session adjourned.",
      why: "Regulating emerging inhalation products is squarely in Thompson's e-cigarette-and-public-health lane; the committee video adds a second recorded consumer-safety action to his record, argued in his own words." },
  ],

  // ===== Kristen Chevrier — House — 2 floor items =====
  kristen_chevrier: [
    { num: 'HB0400', isSen: false, issueKey: 'medical_freedom', impact: 'neutral', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her patient-directed blood-transfusion bill in committee (HB400)',
      facts: "Chevrier chief-sponsored HB400 (2025), Blood Transfusion Amendments, which would have barred health-care facilities and providers, except in certain situations, from prohibiting a patient from using the patient's own blood or a directed donor's blood for a transfusion, and provided related immunity. She personally presented the bill to the House Health and Human Services Committee on Feb. 10, 2025; the official committee recording archives it and the minutes record her presentation. The bill did not pass before the 2025 General Session adjourned.",
      why: "Patient choice and informed consent are the core of Chevrier's record; the committee video is her own spoken defense of letting patients direct their own blood supply, deepening the floor work already on her profile." },
    { num: 'HB0468', isSen: false, issueKey: 'privacy_rights', impact: 'neutral', tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her automatic license-plate-reader privacy bill before committee (HB468)',
      facts: "Chevrier chief-sponsored HB468 (2025), Automatic License Plate Reader Amendments, which would have set authorized uses, reporting requirements, and data-security, retention, and sharing standards for automatic license-plate-reader systems used by law-enforcement and other government entities. She personally presented the bill to the House Transportation Committee on Feb. 18, 2025; the official committee recording archives it. The bill did not pass before the 2025 General Session adjourned.",
      why: "Limiting government surveillance and protecting vehicle data is a documented Chevrier focus; the committee record adds a recorded data-privacy action to her medical-freedom work, made in her own words." },
  ],

  // ===== Luz Escamilla — Senate — 2 floor items =====
  lescamilla: [
    { num: 'SB0189', isSen: true, issueKey: 'family_support', impact: 'neutral', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her child-care-capacity expansion bill before a Senate committee (SB189)',
      facts: "Escamilla chief-sponsored SB189 (2025), Child Care Services Amendments, which would have created the Child Care Capacity Expansion Act, directed state departments to collaborate on implementing it, and set liability limits and reporting for expanded facilities. She personally presented the bill to the Senate Economic Development and Workforce Services Committee on Feb. 6, 2025; the official committee recording archives it and the minutes record her presentation. The bill did not pass before the 2025 General Session adjourned.",
      why: "Child-care affordability and supply is a signature Escamilla issue; the committee video is her own spoken case for expanding capacity, adding depth beyond the floor bills already on her profile." },
    { num: 'SB0264', isSen: true, issueKey: 'family_support', impact: 'neutral', tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her child-care business-management certificate bill before committee (SB264)',
      facts: "Escamilla chief-sponsored SB264 (2025), Higher Education Certification Amendments, which would have created a Child Care Center Business Management Certificate Program at Utah State University to teach licensing, best practices, and small-business management for would-be regulated child-care providers. She personally presented the bill to the Senate Education Committee on Feb. 20, 2025, where it was recommended favorably; the official committee recording archives it. The bill did not pass before the 2025 General Session adjourned.",
      why: "Training new providers is the supply side of Escamilla's child-care focus; the committee record shows her connecting workforce education to child-care access in her own words." },
    { num: 'SB0173', isSen: true, issueKey: 'public_schools', impact: 'neutral', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her universal free school-meals bill before a Senate committee (SB173)',
      facts: "Escamilla chief-sponsored SB173 (2025), School Meal Amendments, which would have created a Universal Free School Meals Program providing free meals to public-school students and a restricted account to help fund it. She personally presented the bill to the Senate Education Committee on Feb. 13, 2025; the official committee recording archives it and the minutes record her presentation. The bill did not pass before the 2025 General Session adjourned.",
      why: "Food security and school meals is one of Escamilla's stated priorities; the committee video records her own argument for universal access, adding a third issue layer to her video record." },
  ],

  // ===== Logan Monson — House — 2 floor items =====
  logan_monson: [
    { num: 'HB0275', isSen: false, issueKey: 'back_police', impact: 'neutral', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his volunteer first-responder tax-credit bill in committee (HB275)',
      facts: "Monson chief-sponsored HB275 (2025), First Responder Volunteer Tax Credit, which would have created a nonrefundable income-tax credit for certain volunteer first responders tied to their hours of service, with certification required from the responder's agency. He personally introduced the bill to the House Revenue and Taxation Committee on Feb. 4, 2025, where a substitute was recommended favorably; the official committee recording archives it. The bill did not pass before the 2025 General Session adjourned.",
      why: "Supporting first responders, especially in rural areas, is a documented Monson priority; the committee video is his own spoken case for rewarding volunteer service, deepening the floor work on his profile." },
  ],

  // ===== Mike Kohler — House — 2 floor items =====
  mike_kohler: [
    { num: 'HB0540', isSen: false, issueKey: 'lands_local', impact: 'neutral', tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented his municipal-incorporation limits bill in committee (HB540)',
      facts: "Kohler chief-sponsored HB540 (2025), Municipal Incorporation Modifications, which would have barred new applications to incorporate an area as a 'preliminary municipality' after Feb. 15, 2025, and restricted related annexations. He personally presented the bill to the House Judiciary Committee on March 3, 2025, where a substitute was advanced; the official committee recording archives it. The bill did not pass before the 2025 General Session adjourned.",
      why: "Kohler's profile already documents his regret over the Dakota Pacific/preliminary-municipality fight in his district; the committee video shows him acting on that record himself, arguing to curb developer-driven incorporation." },
    { num: 'HB0289', isSen: false, issueKey: 'justice_balance', impact: 'neutral', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Carried his accident-responder civil-liability bill before committee (HB289)',
      facts: "Kohler chief-sponsored HB289 (2025), Motor Vehicle Accident Liability Amendments, which addressed the civil liability of a person who caused a motor-vehicle accident and then provided emergency care at the scene. He personally presented the bill, with an attorney, to the House Judiciary Committee on Feb. 24, 2025; the official committee recording archives it. The bill did not pass before the 2025 General Session adjourned.",
      why: "Setting the liability rules for accident responders is a recorded civil-justice action that broadens Kohler's record beyond his water-and-agriculture work, made in his own words." },
  ],

  // ===== Nicholeen P. Peck — House — 2 floor items =====
  nicholeen_p_peck: [
    { num: 'HB0359', isSen: false, issueKey: 'justice_balance', impact: 'neutral', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her juvenile-justice and school-offense bill in committee (HB359)',
      facts: "Peck chief-sponsored HB359 (2025), Juvenile Justice Amendments, which would have amended the rules for notifying authorities of offenses committed by students on school grounds, addressed related investigations and immunity, and adjusted minors' eligibility for nonjudicial adjustment and expungement. She personally presented the bill to the House Judiciary Committee on Feb. 26, 2025; the official committee recording archives it and the minutes record her presentation. The bill did not pass before the 2025 General Session adjourned.",
      why: "Child protection and how schools handle student offenses fit Peck's family-and-youth focus; the committee video is her own spoken case for the notification and juvenile-record changes, deepening her floor record." },
    { num: 'HB0473', isSen: false, issueKey: 'edu_parental', impact: 'neutral', tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her school sensitive-materials disclosure bill before committee (HB473)',
      facts: "Peck chief-sponsored HB473 (2025), School Digital Materials Amendments, which would have expanded the information about sensitive material provided through a parent portal, required local education agencies to give parents that information at registration and post it on their websites, and allowed certain vendor contracts to be rescinded. She personally presented the bill to the House Education Committee on Feb. 28, 2025; the official committee recording archives it. The bill did not pass before the 2025 General Session adjourned.",
      why: "Parental access to curriculum and materials is the heart of Peck's education record; the committee record adds a recorded transparency action in her own words, alongside the parental-rights work already on her profile." },
  ],

  // ===== David Hinkins — Senate — 1 floor item =====
  dhinkins: [
    { num: 'SB0057', isSen: true, issueKey: 'family_support', impact: 'neutral', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his newborn-relinquishment safe-haven bill before a Senate committee (SB57)',
      facts: "Hinkins chief-sponsored SB57 (2025), Newborn Relinquishment Amendments, amending the definition of 'newborn child' used in Utah's safe-relinquishment (safe-haven) law. He personally introduced the bill, with a child-safety advocate, to the Senate Health and Human Services Committee on Feb. 7, 2025, where a substitute was recommended favorably; the official committee recording archives it. The bill was signed into law.",
      why: "Newborn-and-child safety is one of Hinkins's stated priorities; the committee video is his own explanation of the safe-haven change and is the first committee-video evidence on a profile that previously showed only floor and rural-resource work." },
    { num: 'SB0247', isSen: true, issueKey: 'enviro_energy', impact: 'neutral', tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his severance-tax and geological-survey funding bill before committee (SB247)',
      facts: "Hinkins chief-sponsored SB247 (2025), Severance Tax Revenue Amendments, which would have increased the share of severance-tax revenue dedicated to the Utah Geological Survey Restricted Account. He personally introduced the bill to the Senate Revenue and Taxation Committee on Feb. 14, 2025, where it was amended and advanced; the official committee recording archives it. The bill did not pass before the 2025 General Session adjourned.",
      why: "Directing resource-extraction revenue toward geological work fits Hinkins's long record on energy and rural resource development; the committee record shows him handling that fiscal detail himself." },
  ],

  // ===== Jake Fitisemanu — House — 1 floor item =====
  jake_fitisemanu: [
    { num: 'HB0485', isSen: false, issueKey: 'gov_regulation', impact: 'neutral', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his residential-facility neighbor-notification bill in committee (HB485)',
      facts: "Fitisemanu chief-sponsored HB485 (2025), Residential Notification Amendments, which would have required regulated residential facilities to notify nearby property owners and residents before beginning operations and to provide contact information for a designated representative. He personally presented the bill to the House Business, Labor, and Commerce Committee on Feb. 25, 2025; the official committee recording archives it and the minutes record his presentation. The bill did not pass before the 2025 General Session adjourned.",
      why: "Residential and community safety is among Fitisemanu's stated priorities; the committee video is his own spoken case for advance neighbor notification, adding the first committee-video evidence to a profile that previously showed only floor and healthcare work." },
  ],

  // ===== Lisa Shepherd — House — 1 floor item =====
  lisa_shepherd: [
    { num: 'HB0158', isSen: false, issueKey: 'gov_balance', impact: 'neutral', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her state-sovereignty bill on international authority in committee (HB158)',
      facts: "Shepherd chief-sponsored HB158 (2025), State Sovereignty Amendments, which declared that an international organization has no power or legal authority in Utah and that the state and its subdivisions may not implement or enforce such an organization's rules, taxes, or mandates. She had a handout distributed and personally presented the bill to the House Government Operations Committee on Jan. 30, 2025; the official committee recording archives it. The bill did not pass before the 2025 General Session adjourned.",
      why: "State sovereignty and federalism are documented Shepherd positions; the committee video is her own spoken defense of the international-authority limits, adding the first committee-video evidence to a profile centered on transparency and elections." },
    { num: 'HB0458', isSen: false, issueKey: 'election_integrity', impact: 'neutral', tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her candidate-petition signature-verification bill before committee (HB458)',
      facts: "Shepherd chief-sponsored HB458 (2025), Candidate Petition Amendments, which would have barred a county clerk from verifying a signature on a nomination petition for a voter who lives outside that clerk's county and, for multi-county offices, required each clerk to verify and certify their own county's signatures. She personally presented the bill to the House Government Operations Committee on Feb. 26, 2025; the official committee recording archives it. The bill did not pass before the 2025 General Session adjourned.",
      why: "Election administration and signature-verification rules are a core Shepherd focus; the committee record adds a recorded elections action in her own words, alongside her financial-disclosure and open-records work." },
  ],

  // ===== Sahara Hayes — House — 1 floor item =====
  sahara_hayes: [
    { num: 'HB0206', isSen: false, issueKey: 'public_schools', impact: 'neutral', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her chronic-absenteeism pilot-program bill in committee (HB206)',
      facts: "Hayes chief-sponsored HB206 (2025), Chronic Absenteeism Pilot Program, which would have directed the State Board of Education to create an 'Attendance Advantage' pilot coordinated with the my529 savings plan, set program design and data standards for participating schools, and protected individual student records. She personally presented the bill to the House Education Committee on Feb. 5, 2025; the official committee recording archives it and the minutes record her presentation. The bill did not pass before the 2025 General Session adjourned.",
      why: "Public education is one of Hayes's stated priorities; the committee video is her own spoken case for using savings incentives to fight chronic absenteeism, deepening the floor work on her profile." },
    { num: 'HB0335', isSen: false, issueKey: 'election_integrity', impact: 'neutral', tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her social-media political-advertising disclosure bill before committee (HB335)',
      facts: "Hayes chief-sponsored HB335 (2025), Political Advertising Amendments, which would have made clear that electioneering communications and political advertisements include those on social-media platforms and authorized fines for certain violations. She personally presented the bill to the House Judiciary Committee on March 3, 2025, where it was amended; the official committee recording archives it. The bill did not pass before the 2025 General Session adjourned.",
      why: "Extending advertising-disclosure rules to social media is an elections-transparency action; the committee record adds a second recorded issue to Hayes's video record, made in her own words." },
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
      built.push(await item(s.num, s.isSen, s));
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
