#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 Utah officeholder data-quality pass
//
// A focused depth/quality pass on current Utah officeholders. This mirrors the
// exact same changes already applied to the static CMP_DATA source of truth in
// index.html, so the live Firestore `politicians` collection (which the public
// site reads at runtime and merges over the static base) stays in sync.
//
// Three kinds of change, all sourced — nothing is invented:
//
//   1. TENURE + BIO — sitting Utah State Legislators whose records were thin
//      (no office-tenure date, one-line bio). termStart is the start of their
//      CURRENT-chamber continuous service; bios are the same sourced text used
//      across the rest of the roster. Sources: Ballotpedia "Assumed office"
//      fields and official le.utah.gov / senate.utah.gov bios.
//
//   2. OFFICE LABEL — John Dougall left the State Auditor's office in Jan 2025
//      (succeeded by Tina Cannon). The live Firestore doc already reads "Former
//      State Auditor", but the static CMP_DATA base in index.html still said
//      "UT State Auditor" (which renders a green "In Office" badge offline);
//      that static label was corrected to "Former UT State Auditor". No
//      Firestore write is needed, so this script makes none.
//
//   3. DELETIONS — three CMP_DATA-only records were verified against Ballotpedia
//      / official sources to be fabricated (a person who does not hold the
//      claimed seat) and carried invented accountability scores. They were
//      removed from index.html; they are already absent from Firestore, so the
//      deletes here are idempotent guards. A fourth wrong static record
//      ("Karen Kwan" under id klisonbee, Senate Dist 2) was also removed from
//      index.html — but its live Firestore doc is the real Karianne Lisonbee, so
//      it is left in place for the site's de-dup layer (see DELETE note below).
//      The real holders of the fabricated seats are noted inline.
//
//   node scripts/quality-pass-utah-jun2026.mjs            # dry run (default)
//   node scripts/quality-pass-utah-jun2026.mjs --apply    # write to Firestore
//
// Each run re-fetches the live doc and writes only the changed fields via an
// updateMask (deletions use DELETE), so it is safe and idempotent to re-run.
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-17T00:00:00.000Z';

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
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(dec);
  if (v.mapValue !== undefined) {
    const o = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = dec(val);
    return o;
  }
  return null;
}

// ── Verified tenure (current-chamber continuous service start) ──────────────
const TENURE = {
  kwan_s12: '2023-01', blouin_s13: '2023-01', mccay_s11: '2019-01',
  harper_s16: '2013-01', cullimore_s19: '2019-01', mckell_s25: '2021-01',
  brammer_s21: '2025-01', hollins_h24: '2015-01', fitisemanu_h30: '2025-01',
  eliason_h45: '2011-01', ivory_h39: '2021-11', teuscher_h44: '2021-01',
  valpeterson_h56: '2011-01', gricius_h50: '2023-01', snider_h5: '2018-12',
  bolinder_h68: '2023-01', lisonbee_h14: '2017-01', hall_h11: '2021-01',
};

// Sourced bios, identical to the text written into CMP_DATA in index.html.
const BIOS = {
  kwan_s12: "Karen Kwan is a Democrat representing Utah Senate District 12, covering West Valley City and Murray. She served in the Utah House beginning in 2017 before moving to the State Senate in 2023, and focuses on education, mental health, and workforce issues for one of the state's most diverse, working-class areas.",
  blouin_s13: "Nate Blouin is a Salt Lake County Democrat first elected to the Senate in 2022, making him one of its younger members and one of its most vocal progressive voices. He works professionally in the renewable-energy industry, and that expertise anchors an agenda centered on clean energy, climate, and Wasatch Front air quality. Representing a dense, urban district, he has also become a leading advocate for renters and for housing affordability. As a member of a small minority caucus he legislates largely through amendments, public pressure, and coalition-building rather than passing major bills outright.",
  mccay_s11: "Daniel McCay is a Riverton-area Republican who moved from the Utah House to the Senate in 2019 and has become one of the Legislature's chief architects of tax policy. He has driven the state's repeated income-tax rate cuts and championed a move toward a flatter, lower-rate tax structure funded by recurring surpluses. A reliable vote for school choice and limited government, McCay sits at the center of the budget negotiations that decide how Utah spends — and returns — billions of taxpayer dollars each year.",
  harper_s16: "Wayne Harper is a West Jordan–area Republican and one of the longest-serving figures in Utah politics, having entered the House in 1997 before moving to the Senate in 2013. Over that span he has become the Legislature's resident authority on transportation and tax policy, chairing transportation work and earning a national reputation on sales-tax and streamlined-tax issues. He has had a hand in nearly every major road, transit, and infrastructure funding package the state has passed in a generation, making him a quiet but central player in how a fast-growing Utah moves people and goods.",
  cullimore_s19: "Kirk Cullimore is a Sandy attorney who serves in Senate Republican leadership and has become a key player on technology and consumer-protection law. He was a lead Senate sponsor of Utah's pioneering laws restricting minors' use of social media and requiring parental consent — measures that put the state at the front of a national movement and drew immediate legal challenges from the tech industry. He balances that high-profile tech work with bread-and-butter judiciary, landlord-tenant, and consumer-finance legislation drawn from his legal practice.",
  mckell_s25: "Mike McKell is a Spanish Fork trial attorney who moved from the Utah House to the Senate and has become a central figure in the state's effort to regulate social media's effect on young people. Alongside Senate colleagues he sponsored Utah's first-in-the-nation laws limiting minors' social-media use and requiring age verification and default privacy protections — legislation that has been copied, challenged, and revised. His legal background also makes him a leading voice on civil-justice, mental-health, and consumer-protection matters before the Legislature.",
  brammer_s21: "Brady Brammer is a Utah County Republican and attorney who served in the Utah House before winning election to Senate District 21 in 2024. With a law degree and a master's in public administration and years representing cities, school districts, and businesses in government-law disputes, he has become one of the Legislature's go-to members on technology and liability policy. He was the sponsor of a high-profile law requiring social-media platforms to disclose their content-moderation rules and give Utah users notice and an appeals process — part of Utah's broader push to regulate big tech that has drawn both national attention and constitutional challenges.",
  hollins_h24: "Sandra Hollins is a licensed clinical social worker who in 2015 became the first Black woman ever elected to the Utah Legislature, representing the diverse Rose Park and Glendale neighborhoods of west Salt Lake City. Her frontline experience working with people experiencing homelessness and addiction shapes a policy focus on housing, treatment, and equity. She drew national attention for sponsoring a 2020 resolution declaring racism a public-health crisis and has been a steady advocate for criminal-justice reform and services for Utah's most vulnerable residents.",
  fitisemanu_h30: "Jake Fitisemanu is a public-health professional and one of the first Pacific Islanders elected to the Utah Legislature, winning a competitive West Valley City seat in 2024. A longtime advocate for Utah's Tongan, Samoan, and broader AAPI communities, he has worked on health-data disaggregation so that smaller populations are not invisible in state statistics. He brings clinical and community-health credentials to debates over cost of living, healthcare access, and education in one of Utah's most diverse and working-class districts.",
  eliason_h45: "Steve Eliason is a Sandy Republican and certified public accountant who has represented the south Salt Lake Valley in the House since 2011, where he has built one of the most focused records in the Legislature on mental health and suicide prevention. He sponsored the legislation behind Utah's SafeUT crisis app, helped stand up funding for the statewide crisis line that became part of the national 988 system, and has repeatedly carried bills on school counselors, safe firearm storage, and youth behavioral health. In a deeply conservative caucus he has shown that suicide prevention can be a bipartisan, data-driven priority, and his work is frequently cited as a model by other states.",
  ivory_h39: "Ken Ivory is a West Jordan Republican who has served in the Utah House since 2011, with a brief 2019-2021 gap, and is the country's most persistent advocate for transferring federal public lands to state control. In 2012 he sponsored the Transfer of Public Lands Act (HB 148), which demanded the federal government cede roughly 30 million acres to Utah, and he founded and led the American Lands Council to spread the idea to other Western states. The crusade has reshaped the West's land debate but has not delivered actual transfers — the lands remain federal — and his dual role writing legislation while leading the advocacy group drew conflict-of-interest complaints. He continues to press public-lands, property-rights, and states'-rights legislation.",
  teuscher_h44: "Jordan Teuscher is a South Jordan attorney elected to the Utah House in 2020 who has climbed into House leadership and chaired influential business and judiciary committees. He gained national attention as a lead author of Utah's social-media accountability laws — including the Utah Social Media Regulation Act (HB 311), which makes platforms liable for harms caused to minors by addictive design, and HB 464, which created a private right of action letting parents sue over algorithmic harm and required limits on minors' nighttime and overall use. He pairs that high-profile tech work with a steady portfolio of business-law, property, and housing bills reflecting his legal practice.",
  valpeterson_h56: "Val Peterson is an Orem Republican who has represented Utah County in the House since 2011 and holds an unusual dual role: he is also a vice president of administration at Utah Valley University, the largest public university in the state. That gives him an insider's view of the higher-education budgets he helps write, and he has spent much of his tenure on the appropriations subcommittees that fund colleges, capital buildings, and workforce programs. A steady, behind-the-scenes operator rather than a headline-seeker, Peterson is known for shepherding building projects and enrollment-growth funding for fast-expanding Utah County campuses.",
  gricius_h50: "Stephanie Gricius is a small-business owner and Republican from fast-growing Eagle Mountain, elected to the Utah House in 2022. She has become an early state-level voice on artificial intelligence, working on disclosure and accountability requirements for AI used in mental-health and consumer contexts as Utah positions itself as a national testing ground for AI policy. She combines that forward-looking tech focus with conservative priorities on parental rights and medical-freedom legislation, representing one of the youngest and fastest-changing districts in the state.",
  snider_h5: "Casey Snider is a Paradise (Cache County) Republican with a professional background in conservation and natural-resource management who has represented rural northern Utah in the House since 2018. In June 2025 his colleagues elected him House Majority Leader, the chamber's number-two job, after Jefferson Moss resigned to take a state cabinet post — a promotion that gives Snider a major hand in setting the entire House agenda. He had already become one of the Legislature's leading voices on the issues defining Utah's environment debate — saving the shrinking Great Salt Lake, managing scarce water for agriculture and cities, wildlife policy, and the state's long-running push to control federal public lands — balancing ranching and rural interests against the mounting pressure to keep water flowing to the lake and to a fast-growing Wasatch Front.",
  bolinder_h68: "Bridger Bolinder is a Grantsville Republican who represents Tooele County, one of the fastest-growing parts of Utah as the Salt Lake region spills west. Re-elected comfortably in 2024 and previously a committee chair, he was elevated to House Majority Assistant Whip in the June 2025 special leadership election that followed Majority Leader Jefferson Moss's resignation. His agenda reflects a district straddling agriculture and rapid suburban expansion — balancing growth pressures, water demand, and public-safety needs in communities that are changing quickly.",
  lisonbee_h14: "Karianne Lisonbee is a Davis County Republican who has served in the Utah House since 2017 after a stint on the Syracuse City Council, and she chairs the powerful House Judiciary Committee. She is best known statewide as the House sponsor of Utah's 2020 abortion 'trigger law,' a near-total ban that took effect when Roe v. Wade was overturned, and as the author of follow-on restrictions such as 2023's HB 467, which sought to move abortions into hospitals and close licensed clinics. She served in House Republican leadership as whip and assistant whip from 2022 to 2025, but after losing a June 2025 race for majority leader to Casey Snider she left leadership and announced she would not seek another House term — instead launching a 2026 campaign for Utah's 2nd Congressional District.",
  hall_h11: "Katy Hall is a South Ogden Republican elected in 2020 who became a nationally noticed figure as the House sponsor of Utah's 2024 Equal Opportunity Initiatives law, which dismantled diversity, equity, and inclusion offices and programs at public universities and government agencies. She framed the measure as restoring merit-based, identity-neutral treatment, and Utah's version became an early template that several other red states studied. Beyond that signature fight she works on tax, education, and workforce issues for her Weber and Davis County constituents.",
};

// Records whose office string should be corrected.
//   jdougall — NOTE: the live Firestore doc already reads "Former State Auditor",
//   so no Firestore write is needed; the matching fix was applied to the static
//   CMP_DATA base in index.html (which still said "UT State Auditor"). Left out
//   of OFFICE_FIX so a maintainer running --apply does not overwrite the live
//   label.
const OFFICE_FIX = {};

// Verified-fabricated records to delete from Firestore (real seat holder noted).
//   These three were CMP_DATA-only fabrications and are already absent from
//   Firestore; the deletes are idempotent no-ops kept as a documented guard.
//   klisonbee is intentionally NOT deleted: the static CMP_DATA entry under that
//   id was a wrong "Karen Kwan / Senate Dist 2" record (removed from index.html),
//   but the LIVE Firestore klisonbee doc is the real Karianne Lisonbee — a
//   duplicate of lisonbee_h14 that the site's non-destructive de-dup layer
//   already collapses. It is left for that layer / a human merge, not deleted.
const DELETE = {
  aowens:      '"Andy Billings" Senate Dist 17 — no such senator; Dist 17 is Lincoln Fillmore',
  sholland:    '"Steve Eyre" House Dist 67 — no such representative; HD67 is Christine Watkins',
  mrrobertson: '"Mike Robertson" Senate Dist 21 — no such senator; Dist 21 is Brady Brammer (brammer_s21)',
};

// ── Firestore I/O ───────────────────────────────────────────────────────────
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
async function del(id) {
  const r = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!r.ok && r.status !== 404) throw new Error(`delete ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

(async () => {
  console.log(`PolitiDex — Utah quality pass  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  let tenured = 0, bios = 0, offices = 0, deleted = 0, skipped = 0;

  // 1) tenure + bio
  for (const id of Object.keys(TENURE)) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); skipped++; continue; }
    if (!doc) { console.log(`  – ${id}: not in Firestore (CMP_DATA-only) — skipped`); skipped++; continue; }
    const fields = { updatedAt: STAMP };
    if (!doc.termStart) { fields.termStart = TENURE[id]; tenured++; }
    if (BIOS[id] && (!doc.bio || String(doc.bio).length < 160)) { fields.bio = BIOS[id]; bios++; }
    console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name || ''}): ${Object.keys(fields).filter((f) => f !== 'updatedAt').join(', ') || 'no change'}`);
    if (APPLY && Object.keys(fields).length > 1) await patch(id, fields);
  }

  // 2) office-label correction
  for (const [id, office] of Object.entries(OFFICE_FIX)) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); skipped++; continue; }
    if (!doc) { console.log(`  – ${id}: not in Firestore — skipped`); continue; }
    if (doc.office === office) { console.log(`  = ${id}: office already "${office}"`); continue; }
    console.log(`  ${APPLY ? '✎' : '→'} ${id}: office "${doc.office}" -> "${office}"`);
    if (APPLY) await patch(id, { office, updatedAt: STAMP });
    offices++;
  }

  // 3) delete fabricated records
  for (const [id, reason] of Object.entries(DELETE)) {
    const doc = await getDoc(id).catch(() => null);
    if (!doc) { console.log(`  = ${id}: already absent from Firestore`); continue; }
    console.log(`  ${APPLY ? '🗑' : '→'} DELETE ${id} (${doc.name || ''}) — ${reason}`);
    if (APPLY) await del(id);
    deleted++;
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${tenured} tenure, ${bios} bio, ${offices} office-label, ${deleted} deletion(s)${skipped ? `, ${skipped} skipped` : ''}.`);
  if (!APPLY) console.log('Re-run with --apply to write to Firestore.');
})();
