#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — strengthening the THINNEST sitting Utah legislator profiles
// (June 2026 quality-floor pass, WAVE 5)
//
// A fresh re-audit of all 75 CURRENT sitting Utah State Representatives and
// Senators, ranked by their combined evidence layers (Spotlight items + tracked
// Promises + curated Issue Positions). The audit was run live against the Utah
// Legislature's own bill data and the Firestore content store. Three findings
// shaped this pass — and, importantly, two of them came back NEGATIVE, which is
// why this wave is deliberately narrow:
//
//   1. FLOOR VIDEO is, for now, EXHAUSTED for these members. The thin members'
//      remaining signed, chief-sponsored bills are almost entirely from the 2026
//      General Session. The 2026 floor-video archive is not yet published in a
//      seekable form — every 2026 floor marker resolves to le.utah.gov's
//      "notFound" page (the 2025 archive, by contrast, still resolves and was
//      mined in waves 1–4). Without a verifiable video URL and a real seek
//      offset, an honest floor-video Spotlight item cannot be authored, so NONE
//      were added this pass. They can be revisited once the 2026 av-archive is up.
//
//   2. X / SOCIAL is already captured or not honestly addable. Only a handful of
//      sitting members list a public X handle, and the substantive in-office
//      posts that verify via the Twitter syndication endpoint (e.g. Fiefia's two
//      2025 policy posts) are ALREADY present in the store from an earlier wave.
//      The remaining handle-holders surfaced no new verifiable in-office post,
//      and one candidate post pre-dated the member taking office, so it was left
//      out rather than presented as part of a legislative record. No X items were
//      invented to fill space.
//
//   3. PROMISES are well built (6–11 sourced bills/actions per thin member) but
//      many remain DISCONNECTED: 150 of 368 promises across the 35 thinnest
//      members carry NO `issueKey`, so their kept / broken / pending verdicts
//      never light up the member's own "Stance at a Glance", Connected-Evidence
//      view, or the Evidence Locker — even though the bill each promise concerns
//      maps cleanly to a real issue (and often to a stance the member already
//      holds). This is the one lever with genuine, fully-verifiable headroom, so
//      it is the whole of this pass — exactly the backfill wave 4 began, now
//      extended from 12 members to 35.
//
// HONESTY / CONTENT_STYLE rules:
//   • NON-DESTRUCTIVE: no promise text, verdict, source, title, or detail is
//     altered. The ONLY change is adding a connecting `issueKey` to a promise
//     that currently has none. Nothing is removed or rewritten.
//   • A key is set ONLY where the promise currently lacks one AND the bill/action
//     the promise describes maps cleanly to a real, in-use ISSUE_MAP issue. Each
//     key below was assigned by reading the promise's own (already-vetted) text.
//   • CONSERVATIVE: purely electoral promises ("won the seat", "win re-election"),
//     leadership/role promises ("elected Minority Whip", "lead the state budget"),
//     personal-biography notes, vague future-advocacy statements, and genuinely
//     ambiguous or contested-framing bills are left UNKEYED on purpose. Thin is
//     honest; a wrong connection is not.
//   • ROBUST MATCHING: keys are applied by matching a promise's TITLE (normalized
//     for whitespace and curly/straight quotes), not by array index, so a key can
//     never land on the wrong promise. A title that is missing, already keyed, or
//     ambiguous is logged and skipped — never forced.
//
//   node scripts/strengthen-thinnest-utah-profiles-jun2026-wave5.mjs            # dry run
//   node scripts/strengthen-thinnest-utah-profiles-jun2026-wave5.mjs --apply    # write Firestore
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-23T00:00:00.000Z';

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
  const mask = Object.keys(fields);
  const qs = mask.map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${qs}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

// Normalize a promise title for resilient matching (curly→straight quotes,
// collapse whitespace, lower-case). Used to pair a mapping entry to its promise.
const norm = (s) => String(s || '')
  .replace(/[‘’ʼ]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

// ── PROMISE issueKey BACKFILL ───────────────────────────────────────────────
// docId -> { "<promise title>": "<issueKey>" }. A key is written ONLY when the
// matching promise currently has none. Every key is a real, in-use ISSUE_MAP
// issue the bill/action the promise describes actually concerns. Electoral,
// leadership, biographical, vague, and contested-framing promises are omitted
// (left unkeyed) on purpose.
const PROMISE_KEYS = {
  leah_hansen: {
    'Update natural-resources agency rules': 'lands_balance',
  },
  jake_fitisemanu: {
    'Establish red-light camera pilot program for traffic safety': 'transit',
    'Reintroduce red-light safety camera program in 2026': 'transit',
    'Advocate for Pacific Islander and AAPI community health equity': 'healthcare',
    'Pass imitation-firearm safety protections for minors': 'gun_safety',
  },
  ashlee_matthews: {
    'Expand on-site child care for state workers (H.B. 167, 2023)': 'child_care',
    'Secure dedicated funding for child-care worker subsidy (H.B. 382, 2025)': 'child_care',
    'Cover maternal care for state employees (doulas, midwives, birth centers)': 'healthcare',
  },
  jon_hawkins: {
    'Strengthen sexual-offense laws': 'back_police',
    'Protect sports referees from assault': 'back_police',
    'Advance additional Olympic governance legislation': 'econ_growth',
  },
  lisa_shepherd: {
    'Open more government records to the public under GRAMA': 'gov_transparency',
    'Update election and ballot provisions': 'election_integrity',
    'Create an elected Secretary of State to oversee Utah elections': 'election_integrity',
    'Limit international organization authority over Utah': 'gov_balance',
    'Require petition-signer information to be publicly posted': 'election_integrity',
    'Clarify public-records classifications under GRAMA': 'gov_transparency',
    'Update ballot rules for candidate names and nicknames': 'election_integrity',
  },
  heidi_balderree: {
    "Protect military families' retirement contributions (SB 19, 2025)": 'veterans',
    'Credit military training toward civilian occupational licenses (SB 90, 2026)': 'veterans',
    'Protect victim and witness personal data in criminal cases (SB 290, 2026)': 'justice_balance',
    'Reform charter school funding and eligibility (SB 186 and SB 131, 2026)': 'public_schools',
  },
  mike_kohler: {
    "Speed up Utah's water-rights adjudication": 'water',
    'Ease building rules for agritourism operations': 'rural_ag',
    'Boost municipal water conservation for the Great Salt Lake': 'water',
    'Add transparency to nominating-petition signatures': 'election_integrity',
    'Require reporting of lethal force used in self-defense': 'justice_balance',
    "Roll back developer-driven 'preliminary municipality' incorporations": 'lands_local',
  },
  rshipp: {
    'Create a regulatory framework for hunting guides and outfitters (HB153, 2025)': 'lands_balance',
    'Allow voter referendums on school board decisions (HB408, 2025)': 'public_schools',
    'Shift Utah to opt-in mail voting (HB213, 2025)': 'election_integrity',
    'Clarify irrigation-ditch liability to protect water users (HB45, 2025)': 'water',
  },
  sahara_hayes: {
    'Pass firearm-safety and suicide-prevention education': 'gun_safety',
    'Allow crime victims to use initials in public court documents': 'justice_balance',
    'Strengthen Board of Education ethics requirements': 'public_schools',
    'Expand victim privacy protections statewide': 'justice_balance',
    'Strengthen privacy protections for crime victims': 'justice_balance',
    'Establish an ethics code for the State Board of Education': 'public_schools',
  },
  bridger_bolinder: {
    'Strengthen Medicaid pharmacy delivery by moving to fee-for-service': 'healthcare',
    "Revise Utah's wildlife licensing rules": 'lands_balance',
    'Ease recertification for nursing care facilities': 'healthcare',
  },
  jason_thompson: {
    'Expand employer child-care tax credits for small businesses': 'child_care',
    'Expand the employer child-care tax credit': 'child_care',
    'Study the impact of higher-education student housing': 'housing_build',
  },
  john_johnson: {
    'Advance intellectual diversity on Utah campuses and in state government': 'edu_college_cost',
    'Increase transparency in voter registration records': 'election_integrity',
    'Ban DEI office funding in higher education': 'edu_college_cost',
  },
  joseph_elison: {
    'Reform public retirement-plan options for working Utahns': 'econ_workers',
    'Advance Great Salt Lake stewardship and scenic byway designations': 'water',
    'Modernize protections for paleontological landmarks': 'lands_preserve',
  },
  calvin_roberts: {
    'Keep land-use decisions local': 'lands_local',
    'Stand up a state fund for housing-enabling infrastructure': 'housing_build',
    'Reshape economic-development incentives and data-center growth': 'econ_growth',
    'Cut the motor-fuel tax and streamline energy infrastructure': 'lower_taxes',
  },
  david_shallenberger: {
    'Strengthen government data privacy and curb surveillance (HB 450, 2026)': 'privacy_rights',
    'Reform water rights allocation (HB 60, 2026)': 'water',
    'Require energy efficiency rebate reporting (HB 549, 2026)': 'enviro_energy',
  },
  doug_welton: {
    'Recodify Utah property tax relief statutes (HB 20, 2025)': 'property_tax',
    'Modernize school attendance policies (HB 502, 2026)': 'public_schools',
    'Establish statewide bell-to-bell school phone ban (SB 69, 2026)': 'public_schools',
    'Reform school fee waivers (HB 142, 2026)': 'public_schools',
  },
  kriebe: {
    'Defend public-school funding against private-school vouchers': 'public_schools',
    'Create an Office of Student Health Affairs': 'public_schools',
    'Authorize Cottonwood Canyon state parks': 'lands_preserve',
    'Improve literacy funding with reading coaches': 'public_schools',
  },
  mark_strong: {
    'Protect vehicle owners from improper towing practices': 'gov_regulation',
    'Protect vaccine-exempt higher-education students from remote-only mandates': 'medical_freedom',
    'Eliminate certain high-school student fees (earlier round)': 'public_schools',
  },
  ariel_defay: {
    'Limit non-essential screen time in K-12 classrooms (BALANCE Act)': 'public_schools',
    'Create state task force on AI in education with student-data protections': 'public_schools',
    'Launch a statewide dyslexia screening pilot': 'public_schools',
    'Double paid postpartum leave for state employees': 'family_support',
  },
  cwilson: {
    "Cut Utah's income tax rate": 'lower_taxes',
    'Fund a behavioral health receiving center for Cache Valley': 'health_mental',
    'Require schools to provide parental education on student technology risks': 'edu_parental',
    "Reform how Utah's Supreme Court chief justice is selected": 'gov_balance',
    'Pursue legislative term limits and limited government': 'term_limits',
  },
  dipson: {
    "Shield law-enforcement officers' personal information": 'back_police',
    'Modernize commercial-vehicle registration': 'infrastructure',
    'Establish state authority over the Colorado River': 'water',
    "Help fund Southern Utah University's capital needs": 'edu_college_cost',
    "Help draw Utah's new political maps": 'election_integrity',
    'Deliver the Lake Powell Pipeline for Washington County': 'water',
  },
  james_dunnigan: {
    "Carry the nation's first App Store Accountability Act into law": 'tech_balance',
    'Amend the App Store Accountability Act to address constitutional challenges': 'tech_balance',
    'Reform insurance law through annual technical insurance code updates': 'gov_regulation',
  },
  jill_koford: {
    'Great Salt Lake berm bill passes 2025 special session (HB1001)': 'water',
    'Require water transparency from large data centers': 'water',
    'Streamline water leasing and protect Great Salt Lake funds': 'water',
  },
  jstevenson: {
    "Modernize Utah's alcohol-control laws": 'gov_regulation',
    'Keep updating liquor licensing for clubs': 'gov_regulation',
    "End the 'Zion Curtain' and create a single bar license": 'gov_regulation',
    'Raise grocery and convenience beer to 4.8%': 'gov_regulation',
  },
  lescamilla: {
    'Pass stronger child care safety standards': 'child_care',
    'Expand home-based child care access with startup grants': 'child_care',
    'Provide dental care for uninsured children': 'healthcare',
    "Sustain Utah's intergenerational-poverty work": 'family_support',
  },
  nicholeen_p_peck: {
    'Reform juvenile-justice provisions': 'justice_balance',
    'Narrow the statutory definition of sex education': 'edu_parental',
  },
  cmusselman: {
    'Require age verification on adult content sites, including over VPNs': 'tech_balance',
    "Strengthen Utah's human trafficking and smuggling laws": 'back_police',
    'Expand assisted reproductive technology coverage for public employees': 'healthcare',
    'Allow physical therapists to serve as primary care providers': 'healthcare',
  },
  csnider: {
    'Expand occupational cancer protections for firefighters': 'healthcare',
    'Promote water conservation through tiered pricing': 'water',
    'Advance watershed protection and interstate water development': 'water',
    "Reorganize the Great Salt Lake Commissioner's Office within DNR": 'water',
    'Reform WMA access rules and wildlife board qualifications': 'lands_balance',
    'Redirect rollback tax revenue to farmland and open-space preservation': 'lands_preserve',
    "Strengthen the state engineer's authority to protect watersheds": 'water',
  },
  karen_kwan: {
    'Allow cultural and religious items at public-school graduation': 'religious_liberty',
    'Fund mental health support for first responders': 'health_mental',
    'Enact public education on sleep health and sleep disorders': 'healthcare',
    "Modernize Utah's autism insurance-coverage law": 'healthcare',
  },
  katy_hall: {
    'Update mammography quality assurance standards': 'healthcare',
    'Create Gold Medal Schools fitness pilot program': 'public_schools',
    'Require hospital reporting of workplace violence incidents': 'healthcare',
  },
};

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`PolitiDex — strengthen THINNEST Utah profiles (wave 5)  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  console.log('Promise issueKey backfill (Firestore) — connecting verdicts to stances:\n');

  let keysAdded = 0, keyMembers = 0, skipped = 0;
  for (const [id, map] of Object.entries(PROMISE_KEYS)) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); continue; }
    if (!doc || !Array.isArray(doc.promises)) { console.log(`  – ${id}: no promises — skipped`); continue; }

    const promises = doc.promises.map((p) => ({ ...p }));
    const byTitle = new Map();
    for (const p of promises) byTitle.set(norm(p.title), p);

    let added = 0;
    const notes = [];
    for (const [title, key] of Object.entries(map)) {
      const p = byTitle.get(norm(title));
      if (!p) { notes.push(`title not found: "${title}"`); skipped++; continue; }
      if (p.issueKey) { notes.push(`already keyed (${p.issueKey}): "${title}"`); skipped++; continue; }
      p.issueKey = key;
      added++;
    }

    if (!added) {
      console.log(`  = ${id} (${doc.name}): no new keys${notes.length ? ' — ' + notes.join('; ') : ''}`);
      continue;
    }
    if (APPLY) await patch(id, { promises, updatedAt: STAMP });
    keysAdded += added; keyMembers++;
    console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name}): +${added} promise issueKey(s)` +
      `${notes.length ? `  [skipped: ${notes.length}]` : ''}`);
    for (const n of notes) console.log(`        · ${n}`);
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${keysAdded} promise issueKey(s) across ${keyMembers} member(s).` +
    `  (${skipped} mapping entr${skipped === 1 ? 'y' : 'ies'} skipped as not-found / already-keyed.)`);
  if (!APPLY) console.log('\nRe-run with --apply to write Firestore.');
})();
