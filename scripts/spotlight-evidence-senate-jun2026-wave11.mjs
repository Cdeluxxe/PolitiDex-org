#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 evidence pass, WAVE 11 (DEEPEN HIGH-VOLUME SENATORS)
// Additional verified official floor-video Spotlight evidence for the three
// sitting Utah State SENATORS who carry the LARGEST signed-bill records but
// whose connected floor-video coverage was still thin after wave 10:
//     • Wayne A. Harper   (District 16) — ~20 signed 2025 Senate bills
//     • Todd Weiler       (District 8)  — ~16 signed 2025 Senate bills
//     • Lincoln Fillmore  (District 17) — ~15 signed 2025 Senate bills
//
// ── WHY A FOCUSED, SECOND PASS ON THESE THREE ───────────────────────────────
//   Wave 10 gave each of them their first cluster of connected floor-video
//   items (2–3 each), but each still had a deep bench of signed, chief-sponsored
//   2025 bills with NO connected video evidence. This wave goes back to the same
//   three and adds MORE verified, timestamped floor-video items, deliberately
//   chosen to open NEW issue areas on each senator's record rather than to pile
//   onto an issue already covered. Each senator's earlier waves established:
//     • Harper   — transit, social_security, housing  (SB195/SB174, SB71, SB23)
//     • Weiler   — tech_balance, justice_balance, justice_reform (SB142/191/171)
//     • Fillmore — housing_build, school_choice, property_tax (SB181, SB29, SB13)
//   so every item below carries a DIFFERENT issueKey from those, moving each
//   senator toward fuller multi-issue, video-backed coverage.
//
// ── HOW EVERY ITEM BELOW WAS VERIFIED END-TO-END (re-run live this pass) ─────
//   Each item is the senator's OWN recorded Senate-floor presentation of a bill
//   they personally chief-sponsored and that became law. The pipeline:
//     1) Bill record : le.utah.gov/data/2025GS/billlist.json was walked and the
//        Senate-bill (SB) JSONs (le.utah.gov/data/2025GS/<BILL>.json) pulled. A
//        bill is used ONLY when:
//          • its `primeSponsor` code is THIS senator's roster id — HARPEWA
//            (Harper), WEILET (Weiler), FILLML (Fillmore) — confirming chief
//            sponsorship, AND
//          • its `actionHistoryList` contains a "Governor Signed" action, so
//            only ENACTED bills are framed as law.
//        Each `facts` paragraph is drawn from that bill's own
//        `highlightedProvisions`.
//     2) Floor video : the senator's OWN segment is the floorDebateList marker
//        whose `house` is "S" and whose description references this bill number
//        and ends in the senator's surname. The EARLIEST SUBSTANTIVE segment
//        (the original 2nd/3rd-reading presentation — not a one-line hold or a
//        start-of-day placeholder) is used. That marker's archive page
//        (floorArchive.jsp?markerID=<id>) carries the seek offset for the
//        segment in its player rows (data-offset=<sec> … data-markerid=<id>);
//        that offset (seconds → mm:ss / h:mm:ss) is the EXACT, verified seek
//        point cited as `media.timestamp`. The extractor was re-validated this
//        pass against a known value (marker 131177 → 1588s → 26:28).
//
// ── HONESTY / NO DUPLICATES ─────────────────────────────────────────────────
//   Idempotent: each senator's live `spotlight` array is re-fetched and an item
//   is appended ONLY if no existing item shares its headline. Every bill used
//   here is DISTINCT from the bills already spotlighted for that senator in
//   earlier waves. Where a signed, chief-sponsored bill resolved only to a
//   start-of-day placeholder marker (no real seek to the senator's own words),
//   a substantive later-reading marker was used instead (e.g. Harper's S.B. 177
//   uses the Day-23 presentation at 13:01, not the Day-22 placeholder at 0:04).
//   Pure technical recodifications with no public-facing substance were skipped
//   in favor of bills whose provisions a voter can actually weigh.
//
// CONTENT_STYLE.md: every item is about the INDIVIDUAL senator's own bill and
// recorded action — never their party. "Signed into law" is a plain fact from
// the bill's own action history; no vote tally is labeled partisan. Each item
// carries an issueKey chosen from the live issue vocabulary in index.html and
// matched to the bill's subject, so the Spotlight item lands on the same issue
// as that senator's stances and promises and joins the connected evidence map.
// Fillmore's S.B. 73 item is tagged election_integrity to align with his
// existing "Ballot Initiative Reform" Issue Position, which already cites it.
//
// Writes patch only the `spotlight` and `updatedAt` fields (quota-friendly),
// with backoff on 429.
//
//   node scripts/spotlight-evidence-senate-jun2026-wave11.mjs          # dry run
//   node scripts/spotlight-evidence-senate-jun2026-wave11.mjs --apply  # write
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
  };
  if (ts) item.media.timestamp = ts;
  return item;
}

// ── The plan: Firestore id → [spotlight items] ──────────────────────────────
// Every bill below is a 2025 GS Senate bill chief-sponsored by THIS senator,
// signed into law, and DISTINCT from the bills spotlighted in earlier waves.
// Facts are drawn from the bill's own highlightedProvisions; timestamps are the
// verified per-marker seek offsets for the earliest substantive floor segment.
const PLAN = {

  // ===== Wayne A. Harper — Senate District 16 (Salt Lake County) ===========
  //       ~20 signed 2025 Senate bills. Earlier waves: transit (SB195/SB174),
  //       social_security (SB71), housing (SB23). Added here: election law,
  //       child welfare, property/HOA law, and public-safety dispatch.
  wayne_a_harper: [
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

  // ===== Todd Weiler — Senate District 8 (Davis/Salt Lake) =================
  //       ~16 signed 2025 Senate bills; Judiciary chair. Earlier waves:
  //       tech_balance (SB142), justice_balance (SB191), justice_reform (SB171).
  //       Added here: property-crime law, newborn insurance, prosecutor
  //       accountability, and family/custody law.
  todd_weiler: [
    vidItem({ issueKey: 'back_police', billNum: 'S.B. 133', ts: '45:26', day: 18, marker: 129369,
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

  // ===== Lincoln Fillmore — Senate District 17 (Salt Lake County) =========
  //       ~15 signed 2025 Senate bills. Earlier waves: housing_build (SB181),
  //       school_choice (SB29), property_tax (SB13). Added here: ballot-
  //       initiative reform, classroom device policy, health-platform
  //       regulation, and municipal broadband limits.
  lincoln_fillmore: [
    vidItem({ issueKey: 'election_integrity', billNum: 'S.B. 73', ts: '43:46', day: 3, marker: 128636,
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

let totalNew = 0, totalLeg = 0;
const issueTally = {};

for (const [id, items] of Object.entries(PLAN)) {
  const doc = await getDoc(id);
  if (doc === '__throttled__') { console.log(`!! THROTTLED reading ${id} — Firestore quota exhausted; re-run later`); continue; }
  if (!doc) { console.log(`!! MISSING doc: ${id} (no Firestore profile — skipped)`); continue; }
  const existing = Array.isArray(doc.spotlight) ? doc.spotlight : [];
  const seen = new Set(existing.map((s) => hk(s.headline || s.title)));
  const toAdd = items.filter((it) => !seen.has(hk(it.headline)));
  if (!toAdd.length) { console.log(`= ${id}: nothing new (${existing.length} existing)`); continue; }
  totalLeg++;
  toAdd.forEach((it) => {
    totalNew++;
    if (it.issueKey) issueTally[it.issueKey] = (issueTally[it.issueKey] || 0) + 1;
  });
  const merged = existing.concat(toAdd);
  console.log(`+ ${id} (${doc.name}): +${toAdd.length} [${existing.length} -> ${merged.length}]`);
  toAdd.forEach((it) => console.log(`    • [${it.sourceType}] ${it.headline}  #${it.issueKey}`));
  if (APPLY) {
    await patchSpotlight(id, merged);
    console.log('    ✓ written');
    await sleep(1500);
  }
}

console.log('\n──────── summary ────────');
console.log(`senators touched      : ${totalLeg}`);
console.log(`new spotlight items   : ${totalNew}`);
console.log(`  official floor video : ${totalNew}`);
console.log('issue tally :', Object.entries(issueTally).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(', '));
console.log(APPLY ? '\nAPPLIED to Firestore.' : '\nDRY RUN — re-run with --apply to write.');
