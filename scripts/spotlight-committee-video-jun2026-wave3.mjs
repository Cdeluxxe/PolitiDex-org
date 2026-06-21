#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 COMMITTEE-VIDEO Spotlight pass, WAVE 3
//
// Third wave of the committee-hearing video evidence layer opened by
// scripts/spotlight-committee-video-jun2026.mjs and continued in -wave2. A bill's
// committee hearing is where the chief sponsor usually gives the fullest spoken
// explanation of its purpose, need, and detail, so this wave mines the Utah
// Legislature's official 2025 General Session committee record for MANY MORE
// sitting legislators — with priority on the thinnest profiles (currently 1–3
// Spotlight items and NO committee video at all).
//
// HOW EACH ITEM WAS BUILT AND VERIFIED (live, this pass):
//   • Bill record   : https://le.utah.gov/data/2025GS/<bill>.json — gives the
//     chief sponsor (`primeSponsor`/`primeSponsorName`), the short title, the
//     verbatim `highlightedProvisions` each `facts` paragraph summarizes, the
//     final action (`lastAction` — only "Governor Signed" enacted bills/adopted
//     resolutions are used here), and the `agendaList` (the official per-bill
//     list of committee hearings, each tagged with the meeting id `mtgID`, a
//     timeline `markerID`, the agenda item number, the committee name/date, and
//     the official minutes URL). All 959 bills of the session were pulled and
//     indexed by sponsor to find each member's own enacted work.
//   • Committee video: https://le.utah.gov/av/committeeArchive.jsp?mtgID=<mtgID>
//     — the official archived recording of that committee meeting; the bill's
//     `markerID` is appended so the player seeks to that agenda item's segment.
//   • Committee minutes: the official minutes (`minutesURL`) were fetched and
//     read THIS pass to verify, for EVERY item, that the legislator PERSONALLY
//     presented the bill (the minutes record e.g. "Rep. Katy Hall presented the
//     bill"). The hearing used is always the one in the member's OWN chamber,
//     where they speak in their own words. A bill was kept only when the minutes
//     explicitly record the member presenting/introducing/explaining it.
//
// SELECTION RULE (avoids redundancy with the floor-video and earlier committee
// waves):
//   • A bill already carried by ANY existing Spotlight item (floor video, text,
//     or a prior committee wave) is skipped — a committee clip on the same bill
//     would just echo the card. This wave adds committee video only where it
//     opens a genuinely NEW bill/issue or upgrades a text-only mention into
//     recorded, on-the-record video evidence. Purely procedural/technical bills
//     (e.g. "addresses repeal dates", code clean-up) were dropped even when
//     verified, per the honesty rule below.
//
// HONESTY / CONTENT_STYLE rules (same as waves 1–2):
//   • Every item is about the INDIVIDUAL's own bill, words, and recorded action —
//     never their party. No party-grouping language; the signed/adopted status is
//     stated as a plain fact from the bill's own action history.
//   • NO fabricated timestamps. The committee archive exposes no per-bill mm:ss
//     offset in machine-readable form, so no minute mark is asserted; the meeting
//     recording (mtgID) seeked by the bill's markerID, plus the agenda item
//     number and the linked official minutes, are the verifiable locator.
//     `media.timestamp` is intentionally omitted — the renderer shows "Watch".
//   • `source` points at the official bill record; `media` carries kind:'committee'
//     + mtgID/markerID/agenda item/minutesUrl so the evidence view can sit
//     committee video cleanly beside floor video. Extra fields are ignored by the
//     current renderer.
//   • Every item carries a valid ISSUE_MAP `issueKey`, chosen to land on the
//     member's own documented focus — or, for thin profiles, to open a
//     well-supported new issue. The `why` notes how the committee statement
//     supports, complicates, or adds context to the member's record.
//   • Idempotent: each member's live `spotlight` array is re-fetched and an item
//     is appended ONLY if no existing item shares its headline.
//
//   node scripts/spotlight-committee-video-jun2026-wave3.mjs            # dry run
//   node scripts/spotlight-committee-video-jun2026-wave3.mjs --apply    # write
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
const minUrl = (p) => `https://le.utah.gov${p}`;
// pretty bill label e.g. HB0312 -> HB312, HCR005 -> HCR5, SCR003 -> SCR3
const pretty = (num) => num.replace(/^([A-Z]+)0*(\d+)$/, '$1$2');

// ── HEARING METADATA (verified live this pass from le.utah.gov agendaList +
//    official minutes). id|billNumber -> {committee,date,agendaItem,mtgID,markerID,minutesURL}.
// ---------------------------------------------------------------------------
const H = {
  'klisonbee|HB0312': { committee: 'House Judiciary Committee', date: '2025-02-03', agendaItem: '1', mtgID: '19605', markerID: '267332', minutesURL: '/interim/2025/html/00001247.htm' },
  'klisonbee|HB0252': { committee: 'House Judiciary Committee', date: '2025-01-24', agendaItem: '1', mtgID: '19598', markerID: '263894', minutesURL: '/interim/2025/html/00000363.htm' },
  'cheryl_acton|HB0414': { committee: 'House Natural Resources, Agriculture, and Environment Committee', date: '2025-02-14', agendaItem: '3', mtgID: '19845', markerID: '271758', minutesURL: '/interim/2025/html/00001626.htm' },
  'spitcher|SB0157': { committee: 'Senate Judiciary, Law Enforcement, and Criminal Justice Committee', date: '2025-01-31', agendaItem: '8', mtgID: '19621', markerID: '266689', minutesURL: '/interim/2025/html/00001023.htm' },
  'spitcher|SB0194': { committee: 'Senate Judiciary, Law Enforcement, and Criminal Justice Committee', date: '2025-02-18', agendaItem: '5', mtgID: '19780', markerID: '272390', minutesURL: '/interim/2025/html/00001659.htm' },
  'jennifer_plumb|SB0077': { committee: 'Senate Judiciary, Law Enforcement, and Criminal Justice Committee', date: '2025-01-23', agendaItem: '3', mtgID: '19611', markerID: '263511', minutesURL: '/interim/2025/html/00001029.htm' },
  'jennifer_plumb|SB0140': { committee: 'Senate Judiciary, Law Enforcement, and Criminal Justice Committee', date: '2025-01-31', agendaItem: '1', mtgID: '19621', markerID: '266847', minutesURL: '/interim/2025/html/00001023.htm' },
  'stephanie_gricius|HB0283': { committee: 'House Health and Human Services Committee', date: '2025-02-10', agendaItem: '1', mtgID: '19760', markerID: '270104', minutesURL: '/interim/2025/html/00001503.htm' },
  'stephanie_gricius|HB0269': { committee: 'House Business, Labor, and Commerce Committee', date: '2025-01-23', agendaItem: '2', mtgID: '20134', markerID: '263582', minutesURL: '/interim/2025/html/00000566.htm' },
  'evickers|SB0064': { committee: 'Senate Health and Human Services Committee', date: '2025-01-30', agendaItem: '1', mtgID: '19634', markerID: '266232', minutesURL: '/interim/2025/html/00001270.htm' },
  'val_peterson|HB0324': { committee: 'House Transportation Committee', date: '2025-02-14', agendaItem: '4', mtgID: '19797', markerID: '271830', minutesURL: '/interim/2025/html/00001648.htm' },
  'brady_brammer|SB0154': { committee: 'Senate Judiciary, Law Enforcement, and Criminal Justice Committee', date: '2025-02-18', agendaItem: '2', mtgID: '19780', markerID: '272269', minutesURL: '/interim/2025/html/00001659.htm' },
  'james_dunnigan|HB0037': { committee: 'House Political Subdivisions Committee', date: '2025-02-13', agendaItem: '2', mtgID: '19810', markerID: '271031', minutesURL: '/interim/2025/html/00001647.htm' },
  'kstratton|SB0323': { committee: 'Senate Government Operations and Political Subdivisions Committee', date: '2025-02-26', agendaItem: '4', mtgID: '19872', markerID: '274910', minutesURL: '/interim/2025/html/00001828.htm' },
  'rward|HB0357': { committee: 'House Health and Human Services Committee', date: '2025-02-18', agendaItem: '3', mtgID: '19763', markerID: '272364', minutesURL: '/interim/2025/html/00001643.htm' },
  'ryan_d_wilcox|HB0038': { committee: 'House Law Enforcement and Criminal Justice Committee', date: '2025-02-03', agendaItem: '3', mtgID: '19664', markerID: '267315', minutesURL: '/interim/2025/html/00001036.htm' },
  'seliason|HB0436': { committee: 'House Law Enforcement and Criminal Justice Committee', date: '2025-02-14', agendaItem: '4', mtgID: '19841', markerID: '271880', minutesURL: '/interim/2025/html/00001607.htm' },
  'christine_watkins|HB0352': { committee: 'House Public Utilities and Energy Committee', date: '2025-02-13', agendaItem: '2', mtgID: '19783', markerID: '270986', minutesURL: '/interim/2025/html/00001560.htm' },
  'cory_maloy|HB0301': { committee: 'House Business, Labor, and Commerce Committee', date: '2025-02-13', agendaItem: '2', mtgID: '19855', markerID: '271303', minutesURL: '/interim/2025/html/00001608.htm' },
  'kivory|HB0488': { committee: 'House Public Utilities and Energy Committee', date: '2025-02-19', agendaItem: '1', mtgID: '19785', markerID: '272781', minutesURL: '/interim/2025/html/00001750.htm' },
  'mballard|HCR005': { committee: 'House Economic Development and Workforce Services Committee', date: '2025-01-28', agendaItem: '3', mtgID: '19672', markerID: '265072', minutesURL: '/interim/2025/html/00000718.htm' },
  'stephen_l_whyte|HCR014': { committee: 'House Political Subdivisions Committee', date: '2025-02-28', agendaItem: '2', mtgID: '19878', markerID: '275807', minutesURL: '/interim/2025/html/00001896.htm' },
  'karen_kwan|SB0101': { committee: 'Senate Economic Development and Workforce Services Committee', date: '2025-01-24', agendaItem: '2', mtgID: '19675', markerID: '263908', minutesURL: '/interim/2025/html/00000421.htm' },
  'kay_christofferson|HB0264': { committee: 'House Revenue and Taxation Committee', date: '2025-01-30', agendaItem: '2', mtgID: '19668', markerID: '266195', minutesURL: '/interim/2025/html/00000785.htm' },
  'thomas_peterson|HB0442': { committee: 'House Economic Development and Workforce Services Committee', date: '2025-02-10', agendaItem: '1', mtgID: '19755', markerID: '270112', minutesURL: '/interim/2025/html/00001552.htm' },
  'kgrover|SB0147': { committee: 'Senate Economic Development and Workforce Services Committee', date: '2025-01-24', agendaItem: '5', mtgID: '19675', markerID: '263938', minutesURL: '/interim/2025/html/00000421.htm' },
  'kcullimore|SB0137': { committee: 'Senate Education Committee', date: '2025-01-30', agendaItem: '2', mtgID: '19795', markerID: '266289', minutesURL: '/interim/2025/html/00000994.htm' },
  'mmckell|SB0117': { committee: 'Senate Economic Development and Workforce Services Committee', date: '2025-01-24', agendaItem: '4', mtgID: '19675', markerID: '263946', minutesURL: '/interim/2025/html/00000421.htm' },
  'jteuscher|HB0230': { committee: 'House Economic Development and Workforce Services Committee', date: '2025-01-28', agendaItem: '5', mtgID: '19672', markerID: '265195', minutesURL: '/interim/2025/html/00000718.htm' },
  'r_neil_walter|HB0256': { committee: 'House Political Subdivisions Committee', date: '2025-01-30', agendaItem: '2', mtgID: '19629', markerID: '266202', minutesURL: '/interim/2025/html/00001094.htm' },
  'calbrecht|HB0202': { committee: 'House Natural Resources, Agriculture, and Environment Committee', date: '2025-02-12', agendaItem: '1', mtgID: '19844', markerID: '270639', minutesURL: '/interim/2025/html/00001569.htm' },
  'cmusselman|SB0104': { committee: 'Senate Government Operations and Political Subdivisions Committee', date: '2025-02-06', agendaItem: '2', mtgID: '19642', markerID: '269203', minutesURL: '/interim/2025/html/00001530.htm' },
  'cpierucci|HB0363': { committee: 'House Health and Human Services Committee', date: '2025-02-13', agendaItem: '2', mtgID: '19761', markerID: '271268', minutesURL: '/interim/2025/html/00001612.htm' },
  'dowens_st|SB0215': { committee: 'Senate Government Operations and Political Subdivisions Committee', date: '2025-02-06', agendaItem: '6', mtgID: '19642', markerID: '269253', minutesURL: '/interim/2025/html/00001530.htm' },
  'jstevenson|SB0333': { committee: 'Senate Economic Development and Workforce Services Committee', date: '2025-02-27', agendaItem: '1', mtgID: '19894', markerID: '275720', minutesURL: '/interim/2025/html/00001844.htm' },
  'jdailey|HB0510': { committee: 'House Natural Resources, Agriculture, and Environment Committee', date: '2025-02-24', agendaItem: '2', mtgID: '19913', markerID: '273914', minutesURL: '/interim/2025/html/00001787.htm' },
  'nthurston|HB0216': { committee: 'House Revenue and Taxation Committee', date: '2025-02-04', agendaItem: '3', mtgID: '19669', markerID: '267969', minutesURL: '/interim/2025/html/00001239.htm' },
  'walt_brooks|HB0086': { committee: 'House Political Subdivisions Committee', date: '2025-02-20', agendaItem: '2', mtgID: '19813', markerID: '273553', minutesURL: '/interim/2025/html/00001759.htm' },
  'colin_w_jack|HB0201': { committee: 'House Public Utilities and Energy Committee', date: '2025-02-04', agendaItem: '1', mtgID: '19662', markerID: '267977', minutesURL: '/interim/2025/html/00001532.htm' },
  'cwilson|SB0238': { committee: 'Senate Transportation, Public Utilities, Energy, and Technology Committee', date: '2025-02-10', agendaItem: '3', mtgID: '19800', markerID: '270119', minutesURL: '/interim/2025/html/00001531.htm' },
  'dmccay|SB0295': { committee: 'Senate Revenue and Taxation Committee', date: '2025-02-20', agendaItem: '5', mtgID: '19853', markerID: '273452', minutesURL: '/interim/2025/html/00001735.htm' },
  'scott_chew|HB0255': { committee: 'House Political Subdivisions Committee', date: '2025-02-07', agendaItem: '3', mtgID: '19631', markerID: '269876', minutesURL: '/interim/2025/html/00001544.htm' },
  'csnider|HB0465': { committee: 'House Law Enforcement and Criminal Justice Committee', date: '2025-02-14', agendaItem: '1', mtgID: '19841', markerID: '271745', minutesURL: '/interim/2025/html/00001607.htm' },
  'dipson|SB0151': { committee: 'Senate Judiciary, Law Enforcement, and Criminal Justice Committee', date: '2025-01-31', agendaItem: '4', mtgID: '19621', markerID: '266663', minutesURL: '/interim/2025/html/00001023.htm' },
  'ssandall|SB0161': { committee: 'Senate Economic Development and Workforce Services Committee', date: '2025-02-03', agendaItem: '1', mtgID: '19677', markerID: '267356', minutesURL: '/interim/2025/html/00000999.htm' },
  'wharper|SCR003': { committee: 'Senate Transportation, Public Utilities, Energy, and Technology Committee', date: '2025-02-13', agendaItem: '4', mtgID: '19801', markerID: '271401', minutesURL: '/interim/2025/html/00001603.htm' },
  'tweiler|SB0119': { committee: 'Senate Judiciary, Law Enforcement, and Criminal Justice Committee', date: '2025-01-28', agendaItem: '5', mtgID: '19656', markerID: '265192', minutesURL: '/interim/2025/html/00000643.htm' },
  'lfillmore|SCR002': { committee: 'Senate Education Committee', date: '2025-01-22', agendaItem: '5', mtgID: '19613', markerID: '263052', minutesURL: '/interim/2025/html/00000412.htm' },
};

// build the committee-video media object for an item, from H[key]
function media(key) {
  const h = H[key];
  if (!h) throw new Error('missing hearing metadata: ' + key);
  return {
    type: 'video', kind: 'committee',
    label: `Official Utah Legislature committee hearing video — ${h.committee}, ${dateLabel(h.date)} (2025 General Session)`,
    url: comUrl(h.mtgID, h.markerID),
    mtgID: String(h.mtgID), markerID: String(h.markerID), agendaItem: String(h.agendaItem),
    minutesUrl: minUrl(h.minutesURL),
  };
}
function source(billNum) { return { label: `${pretty(billNum)} (2025) — official bill record`, url: billPage(billNum) }; }

// item builder: keeps the per-item author intent terse; media+source derived
function item(id, billNum, o) {
  return {
    date: '2025', impact: o.impact || 'neutral', category: 'voting', issueKey: o.issueKey,
    tags: o.tags || ['Notable Actions', 'Public Statements'],
    headline: o.headline,
    facts: o.facts,
    why: o.why,
    source: source(billNum),
    media: media(id + '|' + billNum),
  };
}

// ── The plan: Firestore id → [spotlight items] ──────────────────────────────
const PLAN = {

  // ===== Karianne Lisonbee — House — thin (2 items, no issue tags yet) =====
  klisonbee: [
    item('klisonbee', 'HB0312', { impact: 'neutral', issueKey: 'justice_balance', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her criminal-justice and jail-release bill in committee (HB312)',
      facts: "Lisonbee chief-sponsored HB312 (2025), Criminal Justice Amendments, modifying when individuals may be released from a correctional facility due to overcrowding, governing contracts to house individuals with federal and county entities, and adding reporting requirements. She personally presented the bill to the House Judiciary Committee on Feb. 3, 2025; the official committee recording archives it and the minutes record it. The bill was signed into law.",
      why: "Setting the rules for jail capacity and inmate-housing contracts is a concrete public-safety action; the committee record is the first on-record video of Lisonbee explaining the specific release and reporting provisions in her own words." }),
    item('klisonbee', 'HB0252', { impact: 'neutral', issueKey: 'justice_balance', tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her state-custody and juvenile-detention bill before committee (HB252)',
      facts: "Lisonbee chief-sponsored HB252 (2025), State Custody Amendments, addressing what treatments government entities may provide to individuals in state custody, amending housing provisions for youth juvenile detention and secure-care facilities, and revising related criminal laws. She presented the bill to the House Judiciary Committee on Jan. 24, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Governing how minors and others in state custody are housed and treated is a second recorded criminal-justice action; together with HB312 the committee record builds an on-the-record corrections-policy throughline on Lisonbee's record." }),
  ],

  // ===== Cheryl Acton — House — thin =====
  cheryl_acton: [
    item('cheryl_acton', 'HB0414', { impact: 'neutral', issueKey: 'rural_ag', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her raw-milk testing and safety bill in committee (HB414)',
      facts: "Acton chief-sponsored HB414 (2025), Raw Milk Amendments, directing the Department of Agriculture and Food to make rules for third-party laboratory testing of raw milk, addressing epidemiological investigations, and setting when and how testing occurs and the applicable standards. She personally presented the bill to the House Natural Resources, Agriculture, and Environment Committee on Feb. 14, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Balancing access to raw milk against food-safety testing is a recorded agriculture-and-public-health action that opens a farm-and-food dimension on Acton's record, argued in her own words." }),
  ],

  // ===== Stephanie Pitcher — Senate — thin (2 items) =====
  spitcher: [
    item('spitcher', 'SB0157', { impact: 'neutral', issueKey: 'justice_reform', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her juvenile nonjudicial-adjustment bill before a Senate committee (SB157)',
      facts: "Pitcher chief-sponsored SB157 (2025), Nonjudicial Adjustment Amendments, providing that a minor may not decline a nonjudicial adjustment agreement unless the minor has received advice from legal counsel, with exceptions, and expanding the Indigent Defense Commission's duties to encourage that representation. She personally presented the bill to the Senate Judiciary, Law Enforcement, and Criminal Justice Committee on Jan. 31, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Ensuring minors get counsel before waiving juvenile diversion is squarely in Pitcher's criminal-justice-reform lane; the committee record is her own spoken case for the right-to-advice requirement." }),
    item('spitcher', 'SB0194', { impact: 'positive', issueKey: 'justice_reform', tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her jail defendant-access-to-evidence bill before committee (SB194)',
      facts: "Pitcher chief-sponsored SB194 (2025), Defendant Access to Evidence Amendments, requiring the county sheriff to ensure that a jail inmate awaiting trial, sentencing, or disposition has a space to review discovery and other evidence with counsel. She presented the bill to the Senate Judiciary, Law Enforcement, and Criminal Justice Committee on Feb. 18, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Guaranteeing pretrial detainees a way to review their own evidence is a recorded due-process action; the committee record adds a second on-the-record reform item to Pitcher's bail-and-pretrial focus." }),
  ],

  // ===== Jennifer Plumb — Senate — (2 items) =====
  jennifer_plumb: [
    item('jennifer_plumb', 'SB0077', { impact: 'neutral', issueKey: 'back_police', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her public-safety-animal protection bill before a Senate committee (SB77)',
      facts: "Plumb chief-sponsored SB77 (2025), Public Safety Animal Amendments, expanding and clarifying the criminal provisions that protect police service canines to include other animals used by public-safety organizations to assist with their duties. She personally presented the bill to the Senate Judiciary, Law Enforcement, and Criminal Justice Committee on Jan. 23, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Strengthening protections for law-enforcement working animals is a recorded public-safety action that broadens Plumb's record beyond her public-health and harm-reduction work, in her own words." }),
    item('jennifer_plumb', 'SB0140', { impact: 'neutral', issueKey: 'justice_balance', tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her law-enforcement DNA-processing bill before committee (SB140)',
      facts: "Plumb chief-sponsored SB140 (2025), Law Enforcement DNA Amendments, amending when a DNA specimen taken at booking may be processed, including allowing processing 60 days after a warrant of arrest has been issued in certain circumstances. She presented the bill to the Senate Judiciary, Law Enforcement, and Criminal Justice Committee on Jan. 31, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Setting the timing rules for processing arrestee DNA is a recorded criminal-justice action; the committee record shows Plumb working the investigative-evidence detail herself." }),
  ],

  // ===== Stephanie Gricius — House — (2 items) =====
  stephanie_gricius: [
    item('stephanie_gricius', 'HB0283', { impact: 'neutral', issueKey: 'family_support', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her child-and-family-services parental-information bill in committee (HB283)',
      facts: "Gricius chief-sponsored HB283 (2025), Child and Family Services Amendments, addressing bedroom sharing by foster children and barring the Division of Child and Family Services from withholding certain information from a child's parent, guardian, or custodian, among other changes. She personally presented the bill to the House Health and Human Services Committee on Feb. 10, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Defining what a child-welfare agency must disclose to parents lands directly on Gricius's parental-rights focus; the committee record is her own spoken case for the information and placement provisions." }),
    item('stephanie_gricius', 'HB0269', { impact: 'neutral', issueKey: 'rights_balance', tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried her sex-designated-areas privacy bill before committee (HB269)',
      facts: "Gricius chief-sponsored HB269 (2025), Privacy Protections in Sex-designated Areas, requiring the Utah Board of Higher Education to provide guidance on student housing that degree-granting institutions own or control and adjusting related definitions. She presented the bill to the House Business, Labor, and Commerce Committee on Jan. 23, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "This contested measure on sex-designated facilities is part of Gricius's record on privacy-and-gender law; the committee video records how she framed the higher-education housing provisions herself." }),
  ],

  // ===== Evan Vickers — Senate — Majority Leader =====
  evickers: [
    item('evickers', 'SB0064', { impact: 'neutral', issueKey: 'healthcare', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his medical-cannabis program bill before a Senate committee (SB64)',
      facts: "Vickers chief-sponsored SB64 (2025), Medical Cannabis Amendments, amending surveillance requirements and authorizing the Cannabis Production Establishment and Pharmacy Licensing Advisory Board to renew or approve medical-cannabis courier licenses and renew licenses as necessary. He personally presented the bill to the Senate Health and Human Services Committee on Jan. 30, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Vickers, a pharmacist, has shaped Utah's medical-cannabis program for years; the committee record upgrades that into on-record video of him handling the licensing-and-access details himself." }),
  ],

  // ===== Val Peterson — House =====
  val_peterson: [
    item('val_peterson', 'HB0324', { impact: 'neutral', issueKey: 'gov_services', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his special-group license-plate bill in committee (HB324)',
      facts: "Peterson chief-sponsored HB324 (2025), Special Group License Plate Amendments, allowing an individual to request a second set of plates for an additional fee, directing the Motor Vehicle Division to design and distribute a white classic plate, and authorizing a corporate-brand-sponsored special group plate. He personally presented the bill to the House Transportation Committee on Feb. 14, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Reworking how Utah issues and funds specialty plates is a recorded state-services action; the committee record adds an on-the-record administrative item to Peterson's budget-and-operations record, in his own words." }),
  ],

  // ===== Brady Brammer — Senate =====
  brady_brammer: [
    item('brady_brammer', 'SB0154', { impact: 'positive', issueKey: 'gov_transparency', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his legislative-audit authority bill before a Senate committee (SB154)',
      facts: "Brammer chief-sponsored SB154 (2025), Legislative Audit Amendments, restating the authority of the legislative auditor general and amending what information an entity — including the State Tax Commission — must provide when requested, while excluding certain federally protected information. He personally presented the bill to the Senate Judiciary, Law Enforcement, and Criminal Justice Committee on Feb. 18, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Clarifying the auditor general's reach into state records is a recorded government-accountability action; the committee record is Brammer's own spoken case for the oversight authority." }),
  ],

  // ===== James Dunnigan — House =====
  james_dunnigan: [
    item('james_dunnigan', 'HB0037', { impact: 'neutral', issueKey: 'housing_build', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his housing-density-incentive bill in committee (HB37)',
      facts: "Dunnigan chief-sponsored HB37 (2025), Utah Housing Amendments, modifying the minimum population for incorporating a new town and authorizing a municipality or county to allow additional housing density in exchange for certain requirements and to offer incentives. He personally presented the bill to the House Political Subdivisions Committee on Feb. 13, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Giving local governments tools to trade density for housing is a recorded supply-side action that opens a housing-and-local-government dimension on Dunnigan's record, made in his own words." }),
  ],

  // ===== Keven Stratton — Senate =====
  kstratton: [
    item('kstratton', 'SB0323', { impact: 'neutral', issueKey: 'gov_transparency', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his state asset-and-investment review bill before a Senate committee (SB323)',
      facts: "Stratton chief-sponsored SB323 (2025), Asset and Investment Review Task Force, creating a task force to study the state's cash and investments, setting its membership and duties, and allowing it to contract with a qualified person to conduct the review. He personally presented the bill to the Senate Government Operations and Political Subdivisions Committee on Feb. 26, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Standing up a formal review of how state money is invested is a recorded fiscal-stewardship action that broadens Stratton's record beyond water and public-lands work, in his own words." }),
  ],

  // ===== Ray Ward — House =====
  rward: [
    item('rward', 'HB0357', { impact: 'neutral', issueKey: 'healthcare', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his medical-cannabis provider-access bill in committee (HB357)',
      facts: "Ward chief-sponsored HB357 (2025), Medical Cannabis Modifications, repealing the qualified-medical-provider and limited-medical-provider categories and allowing certain health care providers to recommend medical cannabis without first registering with the state. He personally presented the bill to the House Health and Human Services Committee on Feb. 18, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Ward, a physician, has built his record on healthcare access; the committee record shows him making the clinical case himself for letting more providers recommend medical cannabis." }),
  ],

  // ===== Ryan D. Wilcox — House =====
  ryan_d_wilcox: [
    item('ryan_d_wilcox', 'HB0038', { impact: 'neutral', issueKey: 'justice_balance', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his criminal-offenses sentencing bill in committee (HB38)',
      facts: "Wilcox chief-sponsored HB38 (2025), Criminal Offenses Modifications, amending the enhancement for offenses committed in concert with three or more persons or in relation to a criminal street gang and broadening certain theft, retail-theft, and prostitution sentencing enhancements to count prior out-of-state convictions. He personally presented the bill to the House Law Enforcement and Criminal Justice Committee on Feb. 3, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Recalibrating gang and repeat-offense enhancements is squarely in Wilcox's criminal-justice lane; the committee record is his own spoken explanation of the sentencing changes." }),
  ],

  // ===== Steve Eliason — House =====
  seliason: [
    item('seliason', 'HB0436', { impact: 'positive', issueKey: 'back_police', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his impaired-driving data bill in committee (HB436)',
      facts: "Eliason chief-sponsored HB436 (2025), Impaired Driving Amendments, requiring the State Commission on Criminal and Juvenile Justice to include specific DUI crash and arrest data in an annual DUI report and directing related data work by the Department of Public Safety. He personally presented the bill to the House Law Enforcement and Criminal Justice Committee on Feb. 14, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Building a clearer statewide picture of impaired-driving enforcement is a recorded public-safety action that adds a road-safety dimension to Eliason's record, made in his own words." }),
  ],

  // ===== Christine Watkins — House =====
  christine_watkins: [
    item('christine_watkins', 'HB0352', { impact: 'neutral', issueKey: 'enviro_energy', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her geologic carbon-storage bill in committee (HB352)',
      facts: "Watkins chief-sponsored HB352 (2025), Geologic Carbon Storage Amendments, clarifying that the Board of Oil, Gas, and Mining has enforcement authority over Class VI injection wells once it receives primacy from the Environmental Protection Agency and providing civil and criminal penalties for violations. She personally presented the bill to the House Public Utilities and Energy Committee on Feb. 13, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Setting the regulatory framework for carbon-storage wells ties to the rural-energy and transmission focus on Watkins's record; the committee video records her own case for state enforcement authority." }),
  ],

  // ===== Cory Maloy — House =====
  cory_maloy: [
    item('cory_maloy', 'HB0301', { impact: 'positive', issueKey: 'healthcare', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his ground-ambulance billing bill in committee (HB301)',
      facts: "Maloy chief-sponsored HB301 (2025), Ambulance Provider Payment Amendments, codifying a base rate for ground-ambulance transports, prohibiting providers from charging above established rates, and barring balance billing for those transports. He personally presented the bill to the House Business, Labor, and Commerce Committee on Feb. 13, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Capping ground-ambulance charges and ending balance billing is a recorded consumer-and-healthcare action that adds a patient-cost dimension to Maloy's record, argued in his own words." }),
  ],

  // ===== Ken Ivory — House =====
  kivory: [
    item('kivory', 'HB0488', { impact: 'neutral', issueKey: 'gov_balance', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his federalism-commission bill in committee (HB488)',
      facts: "Ivory chief-sponsored HB488 (2025), Federalism Amendments, expanding the membership of the Federalism Commission, changing how its members are appointed, and increasing the number of committee bill files the commission may open each year. He personally presented the bill to the House Public Utilities and Energy Committee on Feb. 19, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Federalism and states' authority are the throughline of Ivory's record; the committee record upgrades that into on-record video of him strengthening the commission he has long championed, in his own words." }),
  ],

  // ===== Melissa Ballard — House =====
  mballard: [
    item('mballard', 'HCR005', { impact: 'neutral', issueKey: 'enviro_energy', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her federal energy-permitting reform resolution in committee (HCR5)',
      facts: "Ballard chief-sponsored HCR5 (2025), a concurrent resolution on permitting reform, recognizing the importance of domestic energy production for national security and economic competitiveness and detailing problems with current federal permitting processes that delay energy infrastructure. She personally presented the resolution to the House Economic Development and Workforce Services Committee on Jan. 28, 2025; the official committee recording archives it. The resolution was adopted and signed by the governor.",
      why: "Pressing for faster energy-infrastructure permitting is a recorded policy stand that opens an energy dimension on Ballard's record; the committee video is her own framing of the case for reform." }),
  ],

  // ===== Stephen L. Whyte — House =====
  stephen_l_whyte: [
    item('stephen_l_whyte', 'HCR014', { impact: 'positive', issueKey: 'housing_build', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his housing-policy streamlining resolution in committee (HCR14)',
      facts: "Whyte chief-sponsored HCR14 (2025), a concurrent resolution supporting streamlining Utah housing policies, recognizing the housing-attainability crisis and the need to identify programs and funding to consolidate during the 2025 interim. He personally presented the resolution to the House Political Subdivisions Committee on Feb. 28, 2025; the official committee recording archives it. The resolution was adopted and signed by the governor.",
      why: "Whyte's record centers on housing affordability and land-use reform; the committee record adds his own spoken case for consolidating the state's housing programs to that throughline." }),
  ],

  // ===== Karen Kwan — Senate =====
  karen_kwan: [
    item('karen_kwan', 'SB0101', { impact: 'neutral', issueKey: 'justice_balance', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her dog-owner liability bill before a Senate committee (SB101)',
      facts: "Kwan chief-sponsored SB101 (2025), Dog Related Liability Amendments, providing that a dog owner is not liable for injury or death the owner's dog causes to a trespasser. She personally presented the bill to the Senate Economic Development and Workforce Services Committee on Jan. 24, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Drawing the line on a dog owner's civil liability is a recorded civil-law action that adds a concrete, on-the-record item to Kwan's record beyond her health and education focus, in her own words." }),
  ],

  // ===== Kay Christofferson — House =====
  kay_christofferson: [
    item('kay_christofferson', 'HB0264', { impact: 'neutral', issueKey: 'enviro_energy', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his clean-energy tax-credit sunset bill in committee (HB264)',
      facts: "Christofferson chief-sponsored HB264 (2025), Tax Incentives Amendments, limiting eligibility for the corporate and individual income-tax credit for clean-energy systems to systems placed in service before January 1, 2035, and repealing the individual income-tax credit for qualifying solar projects. He personally presented the bill to the House Revenue and Taxation Committee on Jan. 30, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Winding down clean-energy tax credits is a recorded energy-and-tax action; the committee video records Christofferson's own explanation of the sunset and solar-credit repeal, adding an energy dimension to a record built on transportation." }),
  ],

  // ===== Thomas Peterson — House =====
  thomas_peterson: [
    item('thomas_peterson', 'HB0442', { impact: 'neutral', issueKey: 'infrastructure', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his construction-trades licensing bill in committee (HB442)',
      facts: "Peterson chief-sponsored HB442 (2025), Construction Trades Licensing Amendments, setting requirements for a general engineering contractor license for electrical utilities, allowing applicants with sufficient experience to obtain that license, and granting the division rulemaking authority. He personally presented the bill to the House Economic Development and Workforce Services Committee on Feb. 10, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Peterson, a career building official, built his record on construction codes and licensing; the committee record is on-the-record video of him working the contractor-licensing detail himself." }),
  ],

  // ===== Keith Grover — Senate =====
  kgrover: [
    item('kgrover', 'SB0147', { impact: 'positive', issueKey: 'family_support', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his youth-organization background-check bill before a Senate committee (SB147)',
      facts: "Grover chief-sponsored SB147 (2025), Youth Service Organizations Amendments, providing that a youth service organization may require a potential youth worker to provide a full name and, in certain circumstances, current identification to facilitate a registered-sex-offender check. He personally presented the bill to the Senate Economic Development and Workforce Services Committee on Jan. 24, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Helping youth organizations screen workers against the sex-offender registry is a recorded child-safety action; the committee record is Grover's own spoken case for the check, adding a youth-protection item to his education-focused record." }),
  ],

  // ===== Kirk Cullimore — Senate =====
  kcullimore: [
    item('kcullimore', 'SB0137', { impact: 'neutral', issueKey: 'school_choice', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his course-choice program bill before a Senate committee (SB137)',
      facts: "Cullimore chief-sponsored SB137 (2025), Course Choice Empowerment, establishing standards for educational software and hardware procurement and creating an online course-choice program specifically for private-school students. He personally presented the bill to the Senate Education Committee on Jan. 30, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Extending publicly supported course options to private-school students is a recorded education-choice action that adds a schools dimension to Cullimore's business-and-privacy record, made in his own words." }),
  ],

  // ===== Michael McKell — Senate =====
  mmckell: [
    item('mmckell', 'SB0117', { impact: 'neutral', issueKey: 'family_support', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his family-law arbitration bill before a Senate committee (SB117)',
      facts: "McKell chief-sponsored SB117 (2025), Uniform Family Law Arbitration Act, setting the scope of family-law arbitration, the law applicable to it, and the requirements for an arbitration agreement in a family-law dispute. He personally presented the bill to the Senate Economic Development and Workforce Services Committee on Jan. 24, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Giving families a structured path to arbitrate disputes outside court is a recorded civil-justice action; the committee record shows McKell explaining the uniform-act framework himself, alongside his judiciary work." }),
  ],

  // ===== Jordan Teuscher — House =====
  jteuscher: [
    item('jteuscher', 'HB0230', { impact: 'neutral', issueKey: 'tech_innovation', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his blockchain and digital-asset rights bill in committee (HB230)',
      facts: "Teuscher chief-sponsored HB230 (2025), Blockchain and Digital Innovation Amendments, prohibiting state and local governments from restricting the acceptance or custody of digital assets and establishing the right to operate nodes, develop software, transfer digital assets, and participate in staking on a blockchain. He personally presented the bill to the House Economic Development and Workforce Services Committee on Jan. 28, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Protecting digital-asset use and blockchain participation is the throughline of Teuscher's technology record; the committee record upgrades that into on-record video of him setting the rights framework himself." }),
  ],

  // ===== R. Neil Walter — House =====
  r_neil_walter: [
    item('r_neil_walter', 'HB0256', { impact: 'neutral', issueKey: 'housing_build', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his short-term-rental zoning bill in committee (HB256)',
      facts: "Walter chief-sponsored HB256 (2025), Municipal and County Zoning Amendments, clarifying that a local government regulating short-term rentals may use a listing or offering on a short-term-rental website as evidence that a rental took place. He personally presented the bill to the House Political Subdivisions Committee on Jan. 30, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Giving cities a clearer way to enforce short-term-rental rules touches Walter's land-use and homeowner-rights record; the committee video records his own explanation of the evidence provision." }),
  ],

  // ===== Carl Albrecht — House =====
  calbrecht: [
    item('calbrecht', 'HB0202', { impact: 'neutral', issueKey: 'lands_balance', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his private-landowner big-game bill in committee (HB202)',
      facts: "Albrecht chief-sponsored HB202 (2025), Private Landowner Big Game Revisions, establishing the criteria and procedures for a landowner hunting-permit draw, addressing receipt and redemption of vouchers, and requiring compliance with other laws. He personally presented the bill to the House Natural Resources, Agriculture, and Environment Committee on Feb. 12, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Balancing private-landowner access to big-game permits with wildlife management fits Albrecht's rural natural-resources record; the committee record is his own spoken case for the landowner-draw rules." }),
  ],

  // ===== Calvin Musselman — Senate =====
  cmusselman: [
    item('cmusselman', 'SB0104', { impact: 'neutral', issueKey: 'lands_local', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his municipal boundary-process bill before a Senate committee (SB104)',
      facts: "Musselman chief-sponsored SB104 (2025), Boundary Line Amendments, modifying the definitions for municipal and county land use and the processes for proposing a boundary adjustment, creating a boundary establishment, and related local-government actions. He personally presented the bill to the Senate Government Operations and Political Subdivisions Committee on Feb. 6, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Reworking how city and county boundaries are set is a recorded local-government action that fits Musselman's housing-and-boundaries focus, explained in his own words on the record." }),
  ],

  // ===== Candice Pierucci — House =====
  cpierucci: [
    item('cpierucci', 'HB0363', { impact: 'positive', issueKey: 'healthcare', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her maternal-and-infant health bill in committee (HB363)',
      facts: "Pierucci chief-sponsored HB363 (2025), Maternal and Infant Amendments, requiring the Department of Corrections and county jails to test each female individual admitted to a correctional facility for pregnancy and amending the membership of the Correctional Postnatal and Early Childhood Advisory Board. She personally presented the bill to the House Health and Human Services Committee on Feb. 13, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Ensuring pregnant women in custody are identified and supported is a recorded maternal-health action that adds a concrete women-and-infant-health item to Pierucci's record, made in her own words." }),
  ],

  // ===== Derrin Owens — Senate =====
  dowens_st: [
    item('dowens_st', 'SB0215', { impact: 'neutral', issueKey: 'health_rural', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his rural ambulance-transport bill before a Senate committee (SB215)',
      facts: "Owens chief-sponsored SB215 (2025), Emergency Medical Services Modifications, requiring municipalities and counties to ensure a minimum level of ground-ambulance interfacility transport service within their boundaries and to conduct related planning. He personally presented the bill to the Senate Government Operations and Political Subdivisions Committee on Feb. 6, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Guaranteeing baseline ambulance transport between facilities matters most in the rural counties Owens represents; the committee record shows him making the case for the service mandate himself." }),
  ],

  // ===== Jerry Stevenson — Senate =====
  jstevenson: [
    item('jstevenson', 'SB0333', { impact: 'neutral', issueKey: 'econ_growth', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his major sporting-event venue financing bill before a Senate committee (SB333)',
      facts: "Stevenson chief-sponsored SB333 (2025), Major Sporting Event Venue Financing Amendments, setting the objectives and requirements for a municipality or county to create a major sporting-event venue zone that captures property-tax and local sales-tax increment within a defined area around a venue. He personally presented the bill to the Senate Economic Development and Workforce Services Committee on Feb. 27, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Building a financing tool for major sports venues is a recorded economic-development action that fits Stevenson's appropriations-and-infrastructure record, argued in his own words." }),
  ],

  // ===== Jennifer Dailey-Provost — House =====
  jdailey: [
    item('jdailey', 'HB0510', { impact: 'neutral', issueKey: 'rural_ag', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented her local-food-supply study bill in committee (HB510)',
      facts: "Dailey-Provost chief-sponsored HB510 (2025), Agricultural Amendments, defining \"local food supply\" and requiring the Department of Agriculture and Food to study the barriers and gaps to increasing the availability of local food in the state, including the intrastate food supply. She personally presented the bill to the House Natural Resources, Agriculture, and Environment Committee on Feb. 24, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Studying how to strengthen Utah's local food supply is a recorded agriculture action that broadens Dailey-Provost's record beyond healthcare, made in her own words." }),
  ],

  // ===== Norm Thurston — House =====
  nthurston: [
    item('nthurston', 'HB0216', { impact: 'neutral', issueKey: 'lower_taxes', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his income-tax revenue forecasting bill in committee (HB216)',
      facts: "Thurston chief-sponsored HB216 (2025), Income Tax Revenue Amendments, requiring the State Tax Commission, the Office of the Legislative Fiscal Analyst, and the Governor's Office of Planning and Budget to annually determine by consensus whether federal tax-law changes are likely to materially affect state revenue. He personally presented the bill to the House Revenue and Taxation Committee on Feb. 4, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Forcing a shared, on-the-record read of how federal tax changes hit state revenue is a recorded fiscal-policy action; the committee record adds a tax-and-budget dimension to Thurston's healthcare-cost record, in his own words." }),
  ],

  // ===== Walt Brooks — House =====
  walt_brooks: [
    item('walt_brooks', 'HB0086', { impact: 'positive', issueKey: 'property_rights', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his HOA accountability bill in committee (HB86)',
      facts: "Brooks chief-sponsored HB86 (2025), Homeowners' Association Requirements, increasing the amount a unit or lot owner may request when an association fails to make records available for examination and barring a declarant from using association funds in a legal action a homeowner brings against the declarant. He personally presented the bill to the House Political Subdivisions Committee on Feb. 20, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Holding homeowners associations accountable for records and litigation costs is squarely in Brooks's HOA-and-homeowner-rights lane; the committee record is his own spoken case for the protections." }),
  ],

  // ===== Colin W. Jack — House =====
  colin_w_jack: [
    item('colin_w_jack', 'HB0201', { impact: 'neutral', issueKey: 'enviro_energy', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his utility resource-planning bill in committee (HB201)',
      facts: "Jack chief-sponsored HB201 (2025), Energy Resource Amendments, requiring full cost attribution for supplemental resources in integrated resource plans, setting requirements for calculating generation capacity, and requiring affected electrical utilities to include certain designations in their plans. He personally presented the bill to the House Public Utilities and Energy Committee on Feb. 4, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Making utilities account fully for the cost and capacity of their resource plans fits Jack's energy-policy record; the committee video records his own explanation of the cost-attribution requirements." }),
  ],

  // ===== Chris Wilson — Senate =====
  cwilson: [
    item('cwilson', 'SB0238', { impact: 'neutral', issueKey: 'gov_regulation', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his abandoned-aircraft bill before a Senate committee (SB238)',
      facts: "Wilson chief-sponsored SB238 (2025), Abandoned Aircraft Amendments, amending the definition of \"abandoned aircraft\" and the notice an airport operator must give the owner before taking possession of an abandoned aircraft. He personally presented the bill to the Senate Transportation, Public Utilities, Energy, and Technology Committee on Feb. 10, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Clarifying how airports handle abandoned aircraft is a recorded administrative action; the committee record adds a concrete, on-the-record item to Wilson's record, explained in his own words." }),
  ],

  // ===== Dan McCay — Senate =====
  dmccay: [
    item('dmccay', 'SB0295', { impact: 'neutral', issueKey: 'property_tax', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his property-tax budget-recovery bill before a Senate committee (SB295)',
      facts: "McCay chief-sponsored SB295 (2025), Property Tax Modifications, allowing a taxing entity that reduces its budget below the prior year's budgeted revenue to later restore the budget up to the base-year level for five years without going through the Truth in Taxation notice and hearing process. He personally presented the bill to the Senate Revenue and Taxation Committee on Feb. 20, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Changing how an entity can rebuild a reduced budget under Truth in Taxation is a recorded tax-policy action that adds a property-tax dimension to McCay's income-tax-focused record, made in his own words." }),
  ],

  // ===== Scott Chew — House =====
  scott_chew: [
    item('scott_chew', 'HB0255', { impact: 'neutral', issueKey: 'rural_ag', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his agricultural land-division bill in committee (HB255)',
      facts: "Chew chief-sponsored HB255 (2025), Local Land Use Modifications, authorizing an owner of at least 50 contiguous acres of agricultural land in a third-, fourth-, fifth-, or sixth-class county to create a new parcel separate from the remainder of the original tract. He personally presented the bill to the House Political Subdivisions Committee on Feb. 7, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Letting farmers split off a parcel from large agricultural holdings fits Chew's rural-property and local-control record; the committee record is his own spoken case for the land-division allowance." }),
  ],

  // ===== Casey Snider — House =====
  csnider: [
    item('csnider', 'HB0465', { impact: 'neutral', issueKey: 'back_police', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his county-seat public-safety agreement bill in committee (HB465)',
      facts: "Snider chief-sponsored HB465 (2025), Public Safety Amendments, requiring a law enforcement agency of a city that is the seat of government for a first-class county to enter into an interagency agreement on public-safety concerns with the Department of Public Safety. He personally presented the bill to the House Law Enforcement and Criminal Justice Committee on Feb. 14, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Requiring coordinated public-safety agreements at the capital is a recorded action that opens a law-enforcement dimension on Snider's natural-resources-focused record, made in his own words." }),
  ],

  // ===== Don Ipson — Senate =====
  dipson: [
    item('dipson', 'SB0151', { impact: 'positive', issueKey: 'family_support', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his statewide hunger-relief fund bill before a Senate committee (SB151)',
      facts: "Ipson chief-sponsored SB151 (2025), Income Tax Contributions Amendments, establishing the Statewide Hunger Relief Fund and allowing taxpayers to contribute through their individual income-tax return to support the Utah Food Bank in fighting hunger statewide. He personally presented the bill to the Senate Judiciary, Law Enforcement, and Criminal Justice Committee on Jan. 31, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Creating a tax-return checkoff for hunger relief is a recorded family-and-community action that broadens Ipson's record beyond public lands and transportation, explained in his own words." }),
  ],

  // ===== Scott Sandall — Senate =====
  ssandall: [
    item('ssandall', 'SB0161', { impact: 'neutral', issueKey: 'gov_services', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his community-library and cultural-engagement bill before a Senate committee (SB161)',
      facts: "Sandall chief-sponsored SB161 (2025), Cultural and Community Engagement Amendments, creating the Community Library Enhancement Fund Grant Program and the Utah Women's History Initiative and amending the duties of the State Library division. He personally presented the bill to the Senate Economic Development and Workforce Services Committee on Feb. 3, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Funding community libraries and a state history initiative is a recorded public-services action that adds a culture-and-community dimension to Sandall's agriculture-and-water record, made in his own words." }),
  ],

  // ===== Wayne Harper — Senate =====
  wharper: [
    item('wharper', 'SCR003', { impact: 'neutral', issueKey: 'gov_balance', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his state-energy-authority federalism resolution before a Senate committee (SCR3)',
      facts: "Harper chief-sponsored SCR3 (2025), a concurrent resolution supporting federalism principles and Utah's control of its energy future, reiterating the powers reserved to states under the Constitution and affirming that authority over energy policy affecting state residents is among them. He personally presented the resolution to the Senate Transportation, Public Utilities, Energy, and Technology Committee on Feb. 13, 2025; the official committee recording archives it. The resolution was adopted and signed by the governor.",
      why: "Asserting state authority over energy decisions is a recorded policy stand that adds an energy-and-federalism dimension to Harper's tax-and-transportation record, framed in his own words." }),
  ],

  // ===== Todd Weiler — Senate =====
  tweiler: [
    item('tweiler', 'SB0119', { impact: 'neutral', issueKey: 'family_support', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his domestic-relations recodification bill before a Senate committee (SB119)',
      facts: "Weiler chief-sponsored SB119 (2025), Domestic Relations Recodification, clarifying juvenile- and district-court jurisdiction over adoptions, coordinating definitions related to domestic relations, and recodifying the Utah Uniform Parentage Act into a new title of state law. He personally presented the bill to the Senate Judiciary, Law Enforcement, and Criminal Justice Committee on Jan. 28, 2025; the official committee recording archives it. The bill was signed into law.",
      why: "Reorganizing the state's family-law code is a recorded action squarely in Weiler's family-law and judiciary record; the committee video records his own explanation of the recodification." }),
  ],

  // ===== Lincoln Fillmore — Senate =====
  lfillmore: [
    item('lfillmore', 'SCR002', { impact: 'neutral', issueKey: 'family_support', tags: ['Notable Actions', 'Public Statements'],
      headline: 'Presented his child-independence resolution before a Senate committee (SCR2)',
      facts: "Fillmore chief-sponsored SCR2 (2025), a concurrent resolution encouraging practices that promote child independence, highlighting the importance of free play and supporting schools in using an independent-activity program to help build student independence. He personally presented the resolution to the Senate Education Committee on Jan. 22, 2025; the official committee recording archives it. The resolution was adopted and signed by the governor.",
      why: "Encouraging childhood independence and free play is a recorded action that adds a family-and-childhood dimension to Fillmore's education-and-school-choice record, made in his own words." }),
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
    if (it.media && it.media.kind === 'committee') comItems++;
    if (it.media && it.media.minutesUrl) withMin++;
    if (it.issueKey) issueTally[it.issueKey] = (issueTally[it.issueKey] || 0) + 1;
  });
  const merged = existing.concat(toAdd);
  console.log(`+ ${id} (${doc.name}): +${toAdd.length} item(s) [${existing.length} -> ${merged.length}]`);
  toAdd.forEach(it => console.log(`    • 🎬 ${it.headline}  #${it.issueKey}`));
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
