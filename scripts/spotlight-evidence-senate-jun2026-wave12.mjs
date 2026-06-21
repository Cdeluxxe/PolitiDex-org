#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 evidence pass, WAVE 12
//   (LAND the deepening for the three high-volume senators + reconcile stubs)
//
// ── WHY THIS WAVE EXISTS ────────────────────────────────────────────────────
//   The three sitting Utah State Senators with the largest signed-bill records —
//   Wayne A. Harper (Dist. 16), Todd Weiler (Dist. 8), Lincoln Fillmore
//   (Dist. 17) — were the focus of waves 10 and 11. Those two scripts authored
//   carefully verified floor-video Spotlight items for them, but keyed their
//   PLAN on Firestore document ids that do NOT exist in the live database
//   ("wayne_a_harper", "todd_weiler", "lincoln_fillmore"). The real ids are the
//   short forms "wharper", "tweiler", "lfillmore" (the same convention the
//   earlier working video-evidence scripts used). As a result every wave-10/11
//   write for these three silently resolved to "MISSING doc" and nothing landed:
//   Weiler still carried a single generic stub, Fillmore three generic stubs,
//   and Harper only the three video items added by an earlier (correctly-keyed)
//   script. This wave re-homes that verified evidence onto the CORRECT ids so it
//   finally lands, and folds in the same-bill stub reconcile for these three.
//
// ── WHAT THIS WAVE DOES ─────────────────────────────────────────────────────
//   1) Appends verified official-floor-video Spotlight items (the wave-10 +
//      wave-11 content, re-verified live this pass — see VERIFICATION) to
//      wharper / tweiler / lfillmore, deduped by headline and skipping any bill
//      that already has a video card, so a re-run is a no-op.
//   2) Senate stub reconcile (these three): when a newly added video card covers
//      the SAME bill as a pre-existing weaker, non-video generic stub, the stub
//      is dropped so the bill is represented only by the strongest connected
//      version (official bill record + floor video + verified timestamp +
//      validated issueKey). Matching is by bill number found in the stub's
//      source URL OR its own text, because the older Fillmore stubs name their
//      bill ("SB73", "SB181") in the headline rather than linking the bill page.
//      A stub is removed ONLY when EVERY bill it cites is among the bills getting
//      a superior video card this run — conservative, so nothing unrelated is
//      touched. Fillmore's vetoed-SB37 accountability stub and Weiler's
//      SB287-authorship stub cite bills with no video card and are left intact.
//
// ── VERIFICATION (re-run live this pass against le.utah.gov) ─────────────────
//   For every item below the bill JSON (le.utah.gov/data/2025GS/<BILL>.json) was
//   pulled and confirmed to (a) be chief-sponsored by this senator
//   (primeSponsorName), (b) carry a "Governor Signed" action, and (c) list the
//   cited markerID in its floorDebateList with house "S", a description ending in
//   the senator's surname, and the dayOfSession used here. Each `facts` paragraph
//   tracks the bill's own highlightedProvisions. The per-marker seek offset
//   (`media.timestamp`) is carried from the prior verified extraction off each
//   marker's floorArchive player rows; the le.utah.gov /av archive endpoint was
//   not reachable from the build sandbox this pass to re-extract the raw offset,
//   but the marker→bill→senator→chamber→day binding was re-verified for all 18.
//
// CONTENT_STYLE.md: every item is about the INDIVIDUAL senator's own bill and
// recorded floor action — never their party. "Signed into law" is a plain fact
// from the bill's own action history; no vote tally is labeled partisan. Each
// item carries an issueKey from the live issue vocabulary in index.html, chosen
// to open NEW issue coverage on that senator's record where possible.
//
// Writes patch only the `spotlight` and `updatedAt` fields (quota-friendly),
// with backoff on 429. Idempotent.
//
//   node scripts/spotlight-evidence-senate-jun2026-wave12.mjs          # dry run
//   node scripts/spotlight-evidence-senate-jun2026-wave12.mjs --apply  # write
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
const floor = (id) => `https://le.utah.gov/av/floorArchive.jsp?markerID=${id}`;
const billUrl = (num) => {
  // 'S.B. 139' / 'SB139' -> 'SB0139'  (canonical le.utah.gov static page)
  const compact = String(num).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const m = compact.match(/^([A-Z]+)(\d+)$/);
  const padded = m ? m[1] + m[2].padStart(4, '0') : compact;
  return `https://le.utah.gov/~2025/bills/static/${padded}.html`;
};

// Floor-video Spotlight item (senator's own presentation of a signed bill).
// `ts` is the verified seek offset for the senator's own marker segment.
function vidItem({ issueKey, headline, facts, why, billNum, ts, day, marker, tags }) {
  const item = {
    date: '2025', impact: 'positive', category: 'voting', issueKey,
    sourceType: 'official_floor_video',
    tags: tags || ['Notable Actions', 'Public Statements'],
    headline, facts, why,
    source: { label: `${billNum} (2025) — official bill record`, url: billUrl(billNum) },
    media: {
      type: 'video', url: floor(marker),
      label: `Official Utah Senate floor video — Day ${day}, 2025 General Session`,
    },
    __bill: billNum, // internal only; stripped before write
  };
  if (ts) item.media.timestamp = ts;
  return item;
}

// ── The plan: CORRECT Firestore id -> [verified video items] ────────────────
const PLAN = {

  // ===== Wayne A. Harper — wharper — Senate District 16 ====================
  //   Already live (earlier script): social_security (SB71), housing (SB23),
  //   transit (SB174). Added here: four NEW issue areas.
  wharper: [
    vidItem({ issueKey: 'election_integrity', billNum: 'S.B. 164', ts: '39:34', day: 31, marker: 130310,
      headline: 'Presented his Modifications to Election Law on the Senate floor (video at 39:34)',
      facts: "Harper chief-sponsored S.B. 164 (2025), Modifications to Election Law, which requires county clerks to coordinate with local post offices on ballot handling, lets a poll watcher observe the signature-verification process for a candidate's nominating petition, requires an election officer to audit those signature comparisons and certify a percentage of signatures beyond the qualifying threshold, sets chain-of-custody and storage rules for signature packets, and gives a voter a way to track verification of a candidate petition they signed. The official Utah Senate floor video opens to his presentation on Day 31 of the 2025 General Session at 39:34; the bill was signed into law.",
      why: "Adding audits, poll-watcher observation, and chain-of-custody rules to how candidate-petition signatures are verified is a recorded, enacted action in this senator's own words on election administration — a new issue on a record that had centered on transit and taxes." }),
    vidItem({ issueKey: 'family_support', billNum: 'S.B. 177', ts: '13:01', day: 23, marker: 129636, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Child Welfare Amendments on the Senate floor (video at 13:01)',
      facts: "Harper chief-sponsored S.B. 177 (2025), Child Welfare Amendments, which creates a process for a child in state custody to use a Division of Child and Family Services address for a driver license, amends Juvenile Code definitions, adjusts when a person may seek review of a child abuse or neglect finding, addresses the evidence a juvenile court hears at a shelter hearing, and clarifies what a court considers when deciding whether reunification services are appropriate. The official Utah Senate floor video opens to his presentation on Day 23 of the 2025 session at 13:01; the bill was signed into law.",
      why: "Smoothing how foster children obtain a driver license and reworking the standards a juvenile court applies to abuse findings is a recorded, enacted action in his own words on child welfare — a second new issue on his record." }),
    vidItem({ issueKey: 'property_rights', billNum: 'S.B. 201', ts: '2:01:48', day: 25, marker: 129818, tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented his Real Estate Amendments on the Senate floor (video at 2:01:48)',
      facts: "Harper chief-sponsored S.B. 201 (2025), Real Estate Amendments, which lets a homeowners' association set a minimum lease term by rule, limits an HOA to charging a rental fee to a given owner only once every 12 months and only after a meeting and a vote, gives an owner a way to contest such a fee, limits when an HOA may block converting a grass park strip to water-efficient landscaping, and requires a condominium owner to give the developer notice and a chance to repair an alleged construction defect before suing. The official Utah Senate floor video opens to his presentation on Day 25 of the 2025 session at 2:01:48; the bill was signed into law.",
      why: "Capping the fees and rules a homeowners' association may impose on owners who rent is a recorded, enacted action in his own words on property owners' rights — a third new issue on his record." }),
    vidItem({ issueKey: 'back_police', billNum: 'S.B. 237', ts: '1:06:51', day: 31, marker: 130263, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Utah Communications Authority Amendments on the Senate floor (video at 1:06:51)',
      facts: "Harper chief-sponsored S.B. 237 (2025), Utah Communications Authority Amendments, which modifies the agreements between public safety answering points and the Department of Public Safety, requires the department to implement and maintain a statewide computer-aided dispatch system by July 1, 2029, revises audit requirements for counties that miss call-transfer standards, and updates the distribution formula for 911 emergency-service charge revenue. The official Utah Senate floor video opens to his presentation on Day 31 of the 2025 session at 1:06:51; the bill was signed into law.",
      why: "Standing up a statewide computer-aided dispatch system and reworking how 911 revenue is shared is a recorded, enacted action in his own words on the emergency-response system that backs law enforcement and first responders — a fourth new issue on his record." }),
  ],

  // ===== Todd Weiler — tweiler — Senate District 8 =========================
  //   Was live: a single generic SB287 authorship stub (kept). Added here:
  //   seven verified floor-video items across courts, tech, public safety,
  //   health, transparency, and family law.
  tweiler: [
    vidItem({ issueKey: 'tech_balance', billNum: 'S.B. 142', ts: '51:25', day: 18, marker: 129371,
      headline: 'Presented his App Store Accountability Act on the Senate floor (video at 51:25)',
      facts: "Weiler chief-sponsored S.B. 142 (2025), App Store Accountability Act, which requires app store providers to verify a user's age category, obtain parental consent for minor accounts, notify users and parents of significant changes, share age-category and consent data with developers, and protect age-verification data; sets matching duties on developers; designates certain violations as deceptive trade practices; and creates a private right of action for parents of harmed minors. The official Utah Senate floor video opens to his presentation on Day 18 of the 2025 General Session at 51:25; the bill was signed into law.",
      why: "Putting age verification and parental-consent duties on app stores is a recorded, enacted action in this senator's own words on regulating technology around minors — and aligns with his stated position on technology and child safety." }),
    vidItem({ issueKey: 'justice_balance', billNum: 'S.B. 191', ts: '1:46:35', day: 22, marker: 129613, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Protective Orders Amendments on the Senate floor (video at 1:46:35)',
      facts: "Weiler chief-sponsored S.B. 191 (2025), Protective Orders Amendments, which lets a court treat a petition as a request for a no-fault cohabitant abuse protective order only when both parties agree to the order and its terms, requires such an order to include a credible-threat finding, and provides that a no-fault order may not be introduced as evidence that the respondent committed domestic violence or abuse. The official Utah Senate floor video opens to his presentation on Day 22 of the 2025 session at 1:46:35; the bill was signed into law.",
      why: "Building a consent-based path for protective orders is a recorded, enacted action in his own words on domestic-relations and public-safety law — a second issue on his record consistent with his work on the justice system." }),
    vidItem({ issueKey: 'justice_reform', billNum: 'S.B. 171', ts: '1:41:57', day: 22, marker: 129610, tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented his Indigent Defense Amendments on the Senate floor (video at 1:41:57)',
      facts: "Weiler chief-sponsored S.B. 171 (2025), Indigent Defense Amendments, which creates the Youth Defense Fund to pay for indigent defense services for a minor referred to juvenile court, requires the Utah Indigent Defense Commission to set the rules and procedures for counties seeking to participate, and assigns related administrative duties to the Office of Indigent Defense Services. The official Utah Senate floor video opens to his presentation on Day 22 of the 2025 session at 1:41:57; the bill was signed into law.",
      why: "Standing up dedicated funding for legal defense of children in juvenile court is a recorded, enacted action in his own words on access to counsel — a third issue on his record." }),
    vidItem({ issueKey: 'back_police', billNum: 'S.B. 133', ts: '45:26', day: 18, marker: 129369, tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented his Metal Purchase and Theft Amendments on the Senate floor (video at 45:26)',
      facts: "Weiler chief-sponsored S.B. 133 (2025), Metal Purchase and Theft Amendments, which creates a dedicated criminal offense of metal or catalytic converter theft, clarifies the law governing catalytic converter purchases under the Pawnshop, Secondhand Merchandise, and Catalytic Converter Transaction Information Act, adds the new offense to the list of crimes that can establish a pattern of unlawful activity, and updates related industry definitions. The official Utah Senate floor video opens to his presentation on Day 18 of the 2025 General Session at 45:26; the bill was signed into law.",
      why: "Creating a stand-alone catalytic-converter-theft offense and tying it to the pattern-of-unlawful-activity statute is a recorded, enacted action in this senator's own words on cracking down on metal theft — a new issue on his record beyond the technology and courts work of earlier waves." }),
    vidItem({ issueKey: 'healthcare', billNum: 'S.B. 245', ts: '2:06:50', day: 31, marker: 130342, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his PEHP newborn-coverage bill on the Senate floor (video at 2:06:50)',
      facts: "Weiler chief-sponsored S.B. 245 (2025), PEHP Amendments, which requires the Public Employees' Benefit and Insurance Program to allow a newly born or newly adopted child to be added to a health plan within 60 days of the birth or adoption. The official Utah Senate floor video opens to his presentation on Day 31 of the 2025 session at 2:06:50; the bill was signed into law.",
      why: "Guaranteeing public employees a 60-day window to add a new or adopted child to their health coverage is a recorded, enacted action in his own words on health insurance for working families — a second new issue on his record." }),
    vidItem({ issueKey: 'gov_transparency', billNum: 'S.B. 318', ts: '1:37:17', day: 41, marker: 131153, tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented his Prosecutorial Misconduct Amendments on the Senate floor (video at 1:37:17)',
      facts: "Weiler chief-sponsored S.B. 318 (2025), Prosecutorial Misconduct Amendments, which creates the Prosecutor Conduct Commission within the State Commission on Criminal and Juvenile Justice, sets its membership, terms, and staffing, defines the complaint and investigation process, sets the standard for a finding of professional misconduct by a prosecuting attorney, lets a prospective employer ask whether a prosecutor is under investigation, and requires annual reporting to the Legislature on complaints and investigations. The official Utah Senate floor video opens to his presentation on Day 41 of the 2025 session at 1:37:17; the bill was signed into law.",
      why: "Standing up a commission to investigate and report on prosecutor misconduct is a recorded, enacted action in his own words on accountability for the people who wield charging power — a third new issue on his record." }),
    vidItem({ issueKey: 'family_support', billNum: 'S.B. 45', ts: '1:12:10', day: 1, marker: 128558, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Juvenile Court Procedures Amendments on the Senate floor (video at 1:12:10)',
      facts: "Weiler chief-sponsored S.B. 45 (2025), Juvenile Court Procedures Amendments, which describes the circumstances under which a parent may petition to modify an order of permanent custody and guardianship, addresses whether the district court or the juvenile court retains jurisdiction over such an order, and requires a parent to file the order of permanent custody and guardianship with the district court in certain circumstances. The official Utah Senate floor video opens to his presentation on Day 1 of the 2025 session at 1:12:10; the bill was signed into law.",
      why: "Clarifying how a parent may reopen a permanent custody and guardianship order and which court controls it is a recorded, enacted action in his own words on family and custody law — a fourth new issue on his record." }),
  ],

  // ===== Lincoln Fillmore — lfillmore — Senate District 17 =================
  //   Was live: three generic SB stubs (SB37 vetoed, SB73 ballot, SB181
  //   parking) + an SB44 school-choice record. Added here: seven verified
  //   floor-video items. The SB73 and SB181 stubs are reconciled away below in
  //   favor of the superior video cards that cover the same bills.
  lfillmore: [
    vidItem({ issueKey: 'housing_build', billNum: 'S.B. 181', ts: '2:13:00', day: 31, marker: 130347,
      headline: 'Presented his Housing Affordability Amendments on the Senate floor (video at 2:13:00)',
      facts: "Fillmore chief-sponsored S.B. 181 (2025), Housing Affordability Amendments, which enacts land-use provisions concerning certain types of parking spaces, provides certain exceptions, and makes technical and conforming changes. The official Utah Senate floor video opens to his presentation on Day 31 of the 2025 General Session at 2:13:00; the bill was signed into law.",
      why: "Easing parking requirements that drive up the cost of building homes is a recorded, enacted action in this senator's own words on housing supply — consistent with the housing-affordability position on his record." }),
    vidItem({ issueKey: 'school_choice', billNum: 'S.B. 29', ts: '40:12', day: 1, marker: 128539, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Charter School Amendments on the Senate floor (video at 40:12)',
      facts: "Fillmore chief-sponsored S.B. 29 (2025), Charter School Amendments, which gives the state board discretionary authority to allocate funds to adjust charter school enrollment estimates, specifies funding sources in priority order, requires reporting to the Office of the Legislative Fiscal Analyst and the Governor's Office of Planning and Budget, and exempts the adjustments from certain budgetary requirements. The official Utah Senate floor video opens to his presentation on Day 1 of the 2025 session at 40:12; the bill was signed into law.",
      why: "Smoothing how charter schools are funded when enrollment shifts is a recorded, enacted action in his own words on school choice — backing the school-choice position on his record with floor video." }),
    vidItem({ issueKey: 'property_tax', billNum: 'S.B. 13', ts: '4:46', day: 1, marker: 128522, tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented his Property Tax Reimbursement Amendments on the Senate floor (video at 4:46)',
      facts: "Fillmore chief-sponsored S.B. 13 (2025), Property Tax Reimbursement Amendments, which allows certain rental businesses to charge an itemized recovery fee on heavy-equipment rentals to recoup property taxes, clarifies that the fee is not subject to sales and use tax, bars charging the fee to a governmental entity, and requires the State Tax Commission to study the recovery-fee rate and report recommendations to the Legislature. The official Utah Senate floor video opens to his presentation on Day 1 of the 2025 session at 4:46; the bill was signed into law.",
      why: "Setting how heavy-equipment rental firms recover the property tax they pay is a recorded, enacted action in his own words on tax policy — a new issue on his record." }),
    vidItem({ issueKey: 'election_integrity', billNum: 'S.B. 73', ts: '43:46', day: 3, marker: 128636, tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented his Statewide Initiatives Amendments on the Senate floor (video at 43:46)',
      facts: "Fillmore chief-sponsored S.B. 73 (2025), Statewide Initiatives Amendments, which modifies the requirements for a statewide initiative application and its fiscal-impact statement when the initiative would fund a proposed law, requires initiative sponsors to publish the application the same way a proposed constitutional amendment is published, and bars submitting an initiative — or counting votes on it — if the sponsors fail to meet the publication requirement. The official Utah Senate floor video opens to his presentation on Day 3 of the 2025 General Session at 43:46; the bill was signed into law.",
      why: "Tightening the disclosure and publication rules for ballot initiatives is a recorded, enacted action in his own words on the initiative process — and it is the floor-video evidence behind the 'Ballot Initiative Reform' position already on his profile, which cites this bill." }),
    vidItem({ issueKey: 'public_schools', billNum: 'S.B. 178', ts: '1:02:58', day: 22, marker: 129592, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Devices in Public Schools bill on the Senate floor (video at 1:02:58)',
      facts: "Fillmore chief-sponsored S.B. 178 (2025), Devices in Public Schools, which prohibits a student from using a cellphone, smart watch, or emerging technology during classroom hours, allows a local education agency to create exemptions to the prohibition, and permits the State Board of Education to create model policies. The official Utah Senate floor video opens to his presentation on Day 22 of the 2025 session at 1:02:58; the bill was signed into law.",
      why: "Setting a default that students put away phones and smart watches during class is a recorded, enacted action in his own words on classroom policy in the public schools — a new issue on a record that had centered on school choice and housing." }),
    vidItem({ issueKey: 'healthcare', billNum: 'S.B. 228', ts: '1:20:21', day: 31, marker: 130269, tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented his Health Care Services Platforms bill on the Senate floor (video at 1:20:21)',
      facts: "Fillmore chief-sponsored S.B. 228 (2025), Health Care Services Platforms, which creates a registration program, run by the Division of Occupational Licensing, for health care services platforms, sets registration and operational requirements for them, and authorizes the division to collect fees, adopt rules, and deny, restrict, or suspend a registration for violations. The official Utah Senate floor video opens to his presentation on Day 31 of the 2025 session at 1:20:21; the bill was signed into law.",
      why: "Bringing the companies that match patients with health care services under a state registration and oversight regime is a recorded, enacted action in his own words on health-care regulation — a second new issue on his record." }),
    vidItem({ issueKey: 'broadband', billNum: 'S.B. 165', ts: '38:31', day: 22, marker: 129578, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Municipal Broadband Service Amendments on the Senate floor (video at 38:31)',
      facts: "Fillmore chief-sponsored S.B. 165 (2025), Municipal Broadband Service Amendments, which sets requirements and limitations on a municipality that provides a broadband service and addresses the bonding, reporting, and public disclosure tied to a city offering broadband. The official Utah Senate floor video opens to his presentation on Day 22 of the 2025 session at 38:31; the bill was signed into law.",
      why: "Putting bonding, reporting, and disclosure guardrails on city-run broadband is a recorded, enacted action in his own words on how government competes in the broadband market — a third new issue on his record." }),
  ],

};

// ── bill-number helpers (for dedup + stub reconcile) ────────────────────────
// Normalize any bill reference to a compact key: 'S.B. 71'/'SB0071'/'SB71' -> 'SB71'.
function billKey(s) {
  const c = String(s).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const m = c.match(/^([A-Z]+?)0*(\d+)$/);
  return m ? m[1] + m[2] : c;
}
// Every bill number a card references — from its source URL and from its own text.
function billRefs(card) {
  const refs = new Set();
  const u = (card.source && card.source.url) || '';
  const mu = u.match(/static\/([A-Z]+\d+)\.html/);
  if (mu) refs.add(billKey(mu[1]));
  const text = [card.headline, card.title, card.facts, card.summary, card.label]
    .filter(Boolean).join('  ');
  const re = /\b([SH])\.?\s*(B|J\.?\s*R|C\.?\s*R)\.?\s*0*(\d{1,4})\b/gi;
  let m;
  while ((m = re.exec(text))) {
    const prefix = m[1].toUpperCase() + m[2].replace(/[^A-Za-z]/g, '').toUpperCase();
    refs.add(prefix + m[3]);
  }
  return refs;
}
const hasVideo = (card) => !!(card.media && card.media.type === 'video');

// ── apply ───────────────────────────────────────────────────────────────────
function hk(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 70); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getDoc(id) {
  for (let a = 0; a < 8; a++) {
    const r = await fetch(`${BASE}/${id}`);
    if (r.ok) {
      const j = await r.json();
      const o = {};
      for (const [k, val] of Object.entries(j.fields || {})) o[k] = dec(val);
      return o;
    }
    if (r.status === 404) return null;
    if (r.status === 429) { await sleep(8000 * (a + 1)); continue; }
    return null;
  }
  return '__throttled__';
}

async function patchSpotlight(id, spotlight) {
  const fields = { spotlight: enc(spotlight), updatedAt: enc(STAMP) };
  const url = `${BASE}/${id}?updateMask.fieldPaths=spotlight&updateMask.fieldPaths=updatedAt`;
  for (let a = 0; a < 8; a++) {
    const r = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    if (r.ok) return;
    if (r.status === 429) { await sleep(8000 * (a + 1)); continue; }
    throw new Error(`PATCH ${id} -> ${r.status} ${await r.text()}`);
  }
  throw new Error(`PATCH ${id} -> throttled after retries`);
}

let totalNew = 0, totalLeg = 0, totalRemoved = 0;
const issueTally = {};

for (const [id, items] of Object.entries(PLAN)) {
  const doc = await getDoc(id);
  if (doc === '__throttled__') { console.log(`!! THROTTLED reading ${id} — Firestore quota exhausted; re-run later`); continue; }
  if (!doc) { console.log(`!! MISSING doc: ${id} (no Firestore profile — skipped)`); continue; }
  const existing = Array.isArray(doc.spotlight) ? doc.spotlight : [];
  const seenHeadlines = new Set(existing.map((s) => hk(s.headline || s.title)));
  const billsWithVideo = new Set(existing.filter(hasVideo).flatMap((s) => [...billRefs(s)]));

  // 1) Which items to add: new headline AND that bill not already video-backed.
  const toAdd = items.filter((it) => {
    if (seenHeadlines.has(hk(it.headline))) return false;
    if (billsWithVideo.has(billKey(it.__bill))) return false;
    return true;
  });

  // 2) Stub reconcile: drop any pre-existing NON-video card whose every cited
  //    bill is among the bills we're adding a video card for this run.
  const addedBills = new Set(toAdd.map((it) => billKey(it.__bill)));
  const removed = [];
  const keptExisting = existing.filter((card) => {
    if (hasVideo(card)) return true;            // never drop a video card
    const refs = billRefs(card);
    if (refs.size === 0) return true;            // no bill -> not a same-bill dup
    const allCovered = [...refs].every((b) => addedBills.has(b));
    if (allCovered) { removed.push({ card, refs: [...refs] }); return false; }
    return true;
  });

  if (!toAdd.length && !removed.length) { console.log(`= ${id} (${doc.name}): nothing to do (${existing.length} items)`); continue; }

  // strip internal __bill marker before writing
  const cleanAdds = toAdd.map(({ __bill, ...rest }) => rest);
  const merged = keptExisting.concat(cleanAdds);

  totalLeg++;
  totalNew += toAdd.length;
  totalRemoved += removed.length;
  toAdd.forEach((it) => { if (it.issueKey) issueTally[it.issueKey] = (issueTally[it.issueKey] || 0) + 1; });

  console.log(`~ ${id} (${doc.name}): ${existing.length} -> ${merged.length}  (+${toAdd.length} video, -${removed.length} stub)`);
  removed.forEach((r) => console.log(`    − [stub ${r.refs.join(',')}] ${r.card.headline || r.card.title}`));
  toAdd.forEach((it) => console.log(`    • [${it.sourceType}] ${it.headline}  #${it.issueKey}`));

  if (APPLY) {
    await patchSpotlight(id, merged);
    console.log('    ✓ written');
    await sleep(1500);
  }
}

console.log('\n──────── summary ────────');
console.log(`senators touched       : ${totalLeg}`);
console.log(`new floor-video items  : ${totalNew}`);
console.log(`generic stubs removed  : ${totalRemoved}`);
console.log('issue tally :', Object.entries(issueTally).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(', '));
console.log(APPLY ? '\nAPPLIED to Firestore.' : '\nDRY RUN — re-run with --apply to write.');
