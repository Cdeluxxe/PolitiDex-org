#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 evidence pass, WAVE 7
// MULTI-SOURCE evidence for thin / rural / single-county sitting Utah State
// Legislators. This wave broadens the *acceptable* evidence-source vocabulary
// to include official social platforms (Facebook, Instagram, YouTube, X) in
// addition to official floor/committee video and the official bill record —
// and it does so HONESTLY, using only content that was verified end-to-end.
//
// ── WHO IS A CURRENT, SITTING MEMBER (the authority for this wave) ───────────
//   The roster used to confirm "currently sitting" is the Utah Legislature's
//   own published list, le.utah.gov/data/legislators.json (104 members this
//   term). Several Firestore `district` strings are stale relative to the live
//   roster, so the roster — not the stored district — decides who is sitting.
//   Every member below was confirmed present in that roster, and their county
//   list (also from the roster) is the basis for the "rural / single-county"
//   targeting:
//     • Casey Snider        — H5  Cache (single county)
//     • Ronald Winterton    — S20 Daggett, Duchesne, Summit, Uintah, Wasatch
//     • Don Ipson           — S29 Washington (single county)
//     • Carl Albrecht       — H70 Sevier, Piute, Beaver, Iron (central, rural)
//     • Scott Sandall       — S1  Box Elder, Cache, Tooele (northern, rural)
//     • Calvin Musselman    — S4  Davis, Weber (thin profile; suburban)
//
// ── SOURCE POLICY (broadened this wave) ─────────────────────────────────────
//   The connected-evidence layer now recognises these `sourceType`s:
//     'official_floor_video' | 'official_bill_record'
//     'x_post' | 'facebook_post' | 'instagram_post' | 'youtube'
//   Highest priority remains the member's OWN recorded floor presentation of a
//   bill they chief-sponsored that became law. Official social posts are now
//   explicitly allowed when — and ONLY when — the post's exact text, date and
//   authoring account can be verified to be the legislator's own.
//
// ── HOW EACH ITEM BELOW WAS VERIFIED (re-run live this pass) ─────────────────
//   1) Bill record: https://le.utah.gov/data/2025GS/<bill>.json — the verified
//      primeSponsor (confirmed to be THIS member), the verbatim short title,
//      the highlightedProvisions each `facts` paragraph is drawn from, and the
//      "Governor Signed" action in actionHistoryList. Only signed bills are
//      framed as enacted.
//   2) Floor video: the member's OWN segment is the floorDebateList marker
//      whose chamber matches the member and whose description ends in the
//      member's surname (e.g. marker 129491 → "HB48 ... Snider", House, Day 21).
//      That marker's archive page (floorArchive.jsp?markerID=<id>) opens to the
//      member's presentation. This wave deliberately does NOT assert a mm:ss
//      seek timestamp: the per-marker offset page was intermittently
//      unavailable this pass, and an unverified timestamp would be a fabricated
//      claim. The marker link (which itself seeks to the member's segment) is
//      cited without a timestamp instead.
//
// ── OFFICIAL ACCOUNTS, AND AN HONEST LIMITATION ON FACEBOOK/INSTAGRAM ────────
//   `legislators.json` also publishes each member's OFFICIAL twitter/facebook/
//   instagram/linkedin handles. Where the roster lists one (in this wave only
//   Carl Albrecht, Instagram), that first-party handle is carried on the item as
//   `officialAccounts` so the connected-evidence view can link to the platform a
//   member actually uses; most rural members publish none, which is left honest.
//   HOWEVER:
//     • Facebook and Instagram POST CONTENT could not be verified from this
//       automated environment to the standard the X channel meets. A direct
//       fetch of a public page returns a login wall; mbasic redirects to login;
//       and the Wayback Machine had archived only the profile ROOT (not the
//       text/date of any substantive individual post) for the official rural
//       pages checked (e.g. facebook.com/WaltBrooksStateRep,
//       facebook.com/christine.f.watkins, instagram.com/hooky52). No Facebook
//       or Instagram POST is asserted as a Spotlight item, because none could
//       be verified — per CONTENT_STYLE, thin content is reported honestly, not
//       forced. The official account links are still attached so a future,
//       authenticated capture can populate post-level evidence.
//     • X (Twitter) IS verifiable without login via the syndication endpoint
//       (cdn.syndication.twimg.com/tweet-result?id=<id>), which returns a post's
//       exact text, created_at, and the authoring screen_name/display name. A
//       scan of the rural members' official X accounts this pass surfaced only
//       dated (pre-2021) or generic session-recap posts that fail the
//       "substantive, current, complete, individual-record" bar, so no X
//       Spotlight item is asserted for the members in this wave either. The
//       verified-but-unhoused example is documented in the pass notes.
//
// CONTENT_STYLE.md: every item is about the INDIVIDUAL's own bill and recorded
// action — never their party. Signed status is a plain fact from the bill's own
// action history. Each item carries an ISSUE_MAP `issueKey` chosen to match the
// member's own documented issues, so the Spotlight item lands on the same issue
// as their stance and promises (building the full stance + promise + record
// three-layer connection).
//
// Idempotent: each member's live `spotlight` array is re-fetched and an item is
// appended ONLY if no existing item shares its headline. Writes patch only the
// `spotlight` and `updatedAt` fields (quota-friendly), with backoff on 429.
//
//   node scripts/spotlight-evidence-multisource-jun2026-wave7.mjs            # dry run
//   node scripts/spotlight-evidence-multisource-jun2026-wave7.mjs --apply    # write
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
const billUrl = (yr, num) => `https://le.utah.gov/~${yr}/bills/static/${num}.html`;

// Official, roster-verified accounts for each member (from legislators.json).
// Empty arrays are honest: most rural members publish no official social handle.
const ACCOUNTS = {
  csnider:    [],
  rwinterton: [],
  dipson:     [],
  calbrecht:  [{ platform: 'instagram', url: 'https://www.instagram.com/hooky52/', label: 'Official Instagram (per Utah Legislature roster)' }],
  ssandall:   [],
  cmusselman: [],
};

// Floor-video / bill-record Spotlight item. The member's own floor marker is
// cited (it seeks to their segment) WITHOUT an unverified mm:ss timestamp; the
// official bill record is the visible citation.
function vidItem(memberId, { issueKey, headline, facts, why, billNum, yr, day, chamber, marker, impact = 'positive', tags }) {
  const padded = billNum.replace(/(\D+)(\d+)/, (_, a, b) => a + b.padStart(4, '0'));
  const item = {
    date: String(yr), impact, category: 'voting', issueKey,
    sourceType: 'official_floor_video',
    tags: tags || ['Notable Actions', 'Public Statements'],
    headline, facts, why,
    source: { label: `${billNum} (${yr}) — official bill record`, url: billUrl(yr, padded) },
    media: {
      type: 'video', url: floor(marker),
      label: `Official Utah ${chamber} floor video — Day ${day}, ${yr} General Session`,
    },
  };
  const acc = ACCOUNTS[memberId];
  if (acc && acc.length) item.officialAccounts = acc;
  return item;
}

// ── The plan: Firestore id → [spotlight items] ──────────────────────────────
const PLAN = {

  // ===== Casey Snider — House District 5 (Cache County, rural) ===============
  // Documented issues include water and public lands/wildfire. Two new items on
  // his signature rural-wildfire work, both signed and coordinated with each
  // other (HB307 carries a coordination clause with HB48).
  csnider: [
    vidItem('csnider', { issueKey: 'lands_balance', billNum: 'HB48', yr: 2025, day: 21, chamber: 'House', marker: 129491,
      headline: 'Presented his Wildland Urban Interface wildfire-readiness bill on the House floor',
      facts: "Snider chief-sponsored HB48 (2025), Wildland Urban Interface Modifications, which requires counties to act on wildland-urban-interface property — including assessing a fee deposited into the Wildland-urban Interface Prevention, Preparedness, and Mitigation Fund — directs counties and municipalities to adopt wildland-urban-interface building code provisions, and adds notice requirements for insuring property in those high-risk areas. The Utah House floor video opens to his presentation on Day 21 of the 2025 session (marker 129491); the bill was signed into law.",
      why: "Managing growth and wildfire risk where homes meet wildland is a core concern for his rural Cache County district, and building a dedicated prevention fund and code standard is a recorded, enacted action in his own words." }),
    vidItem('csnider', { issueKey: 'lands_balance', billNum: 'HB307', yr: 2025, day: 22, chamber: 'House', marker: 129593, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his Wildfire Funding consolidation bill on the House floor',
      facts: "Snider chief-sponsored HB307 (2025), Wildfire Funding Amendments, which merges several wildfire-related funds into a single Utah Wildfire Fund, sets how money is deposited and spent, addresses delegation of fire-management authority, and moves the provisions governing community wildfire preparedness plans for the wildland-urban interface — with an explicit coordination clause tying it to his HB48. The Utah House floor video opens to his presentation on Day 22 of the 2025 session (marker 129593); the bill was signed into law.",
      why: "Consolidating Utah's wildfire funding and preparedness planning is a recorded, enacted follow-through that complements his HB48 on the same issue — two pieces of his own signed wildfire record for a rural, fire-exposed district." }),
  ],

  // ===== Ronald Winterton — Senate District 20 (Uintah Basin, rural) =========
  // Documented issues include energy production and rural communities. This new
  // item lands on lands_energy — the basin's oil-and-gas economy funding its own
  // local governments.
  rwinterton: [
    vidItem('rwinterton', { issueKey: 'lands_energy', billNum: 'SB207', yr: 2025, day: 28, chamber: 'Senate', marker: 129937,
      headline: 'Presented his Local Impact Mitigation oil-and-gas bill on the Senate floor',
      facts: "Winterton chief-sponsored SB207 (2025), Local Impact Mitigation Amendments, which imposes a local impact mitigation tax on oil and gas produced in the state and saved, sold or transported, provides exemptions, and requires the State Tax Commission to distribute that revenue back to the counties from which it was collected. The Utah Senate floor video opens to his presentation on Day 28 of the 2025 session (marker 129937); the bill was signed into law.",
      why: "Energy production is the economic backbone of his rural Uintah Basin district, and directing mitigation revenue from that production back to the producing counties is a recorded, enacted action in his own words tying the basin's energy base to its local services." }),
  ],

  // ===== Don Ipson — Senate District 29 (Washington County) ==================
  // Documented issues include public safety / tougher criminal penalties.
  dipson: [
    vidItem('dipson', { issueKey: 'back_police', billNum: 'SB24', yr: 2025, day: 8, chamber: 'Senate', marker: 128916,
      headline: 'Presented his Child Abuse and Torture penalties bill on the Senate floor',
      facts: "Ipson chief-sponsored SB24 (2025), Child Abuse and Torture Amendments, which creates a new criminal offense of child torture with penalties, adds that offense to the list of crimes carrying a mandatory prison term, and amends the definitions underlying child abuse, aggravated child abuse and related statutes so they incorporate the new offense. The Utah Senate floor video opens to his presentation on Day 8 of the 2025 session (marker 128916); the bill was signed into law.",
      why: "Tougher penalties for the most serious crimes against children is a public-safety priority his profile names, and creating a distinct, mandatory-imprisonment offense for child torture is a recorded, enacted action in his own words." }),
  ],

  // ===== Carl Albrecht — House District 70 (Sevier/Piute/Beaver/Iron) ========
  // Energy is his signature issue. New item on enviro_energy — Utah's nuclear /
  // electrical-energy development framework, which he authored.
  calbrecht: [
    vidItem('calbrecht', { issueKey: 'enviro_energy', billNum: 'HB249', yr: 2025, day: 16, chamber: 'House', marker: 129178,
      headline: 'Presented his Nuclear Power and energy-development bill on the House floor',
      facts: "Albrecht chief-sponsored HB249 (2025), Nuclear Power Amendments, which creates the Nuclear Energy Consortium and the Utah Energy Council within the Office of Energy Development, renames and revises the Utah San Rafael Energy Lab Board, establishes a process for designating electrical energy development zones, and creates the Electrical Energy Development Investment Fund. The Utah House floor video opens to his presentation on Day 16 of the 2025 session (marker 129178); the bill was signed into law.",
      why: "Reliable, affordable energy for rural Utah is the issue this central-Utah member's profile leads with, and standing up the state's nuclear and electrical-energy development framework is a recorded, enacted action in his own words on that signature issue." }),
  ],

  // ===== Scott Sandall — Senate District 1 (Box Elder/Cache/Tooele, rural) ===
  // Documented issues are water and agriculture. Two new items, one on each.
  ssandall: [
    vidItem('ssandall', { issueKey: 'water', billNum: 'SB80', yr: 2025, day: 15, chamber: 'Senate', marker: 129103,
      headline: 'Presented his drinking-water and water-fee bill on the Senate floor',
      facts: "Sandall chief-sponsored SB80 (2025), Water Fee Amendments, which directs the Department of Environmental Quality to establish a water fee schedule, allows the Water Development Coordinating Council to set its own fee schedule beginning July 1, 2026 subject to legislative approval, exempts certain special districts from particular fee requirements, and sets out requirements governing those schedules. The Utah Senate floor video opens to his presentation on Day 15 of the 2025 session (marker 129103); the bill was signed into law.",
      why: "Water policy and funding is a keyissue this northern-Utah member's profile names, and setting how the state funds its drinking-water and water-quality work is a recorded, enacted action in his own words." }),
    vidItem('ssandall', { issueKey: 'rural_ag', billNum: 'SB113', yr: 2025, day: 25, chamber: 'Senate', marker: 129811, tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented his open-range livestock traffic bill on the Senate floor',
      facts: "Sandall chief-sponsored SB113 (2025), Traffic Code Amendments, which creates a rebuttable presumption in a highway collision between a driver and open-range livestock and defines the terms governing it. The Utah Senate floor video opens to his presentation on Day 25 of the 2025 session (marker 129811); the bill was signed into law.",
      why: "Open-range ranching is part of daily life across his rural district, and setting the liability presumption when vehicles and open-range livestock collide is a recorded, enacted action in his own words on an agricultural issue his profile names." }),
  ],

  // ===== Calvin Musselman — Senate District 4 (Davis/Weber) ==================
  // Thin profile; documented issues include public safety. New item on
  // back_police — mandatory jail for repeat drug/theft offenders.
  cmusselman: [
    vidItem('cmusselman', { issueKey: 'back_police', billNum: 'SB90', yr: 2025, day: 31, chamber: 'Senate', marker: 130315,
      headline: 'Presented his Mandatory Jail Sentence bill on the Senate floor',
      facts: "Musselman chief-sponsored SB90 (2025), Mandatory Jail Sentence Amendments, which requires a mandatory jail sentence for certain drug and theft crimes committed under specified conditions and with specified prior convictions, and provides that a person serving such a sentence may not be turned over to the federal government for deportation until the sentence is served, with limited exceptions. The Utah Senate floor video opens to his presentation on Day 31 of the 2025 session (marker 130315); the bill was signed into law.",
      why: "Public safety and accountability for repeat offenders is a keyissue his profile names, and attaching a mandatory jail term to repeat drug and theft crimes is a recorded, enacted action in his own words." }),
  ],

};

// ── apply ───────────────────────────────────────────────────────────────────
function hk(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 70); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getDoc(id) {
  for (let a = 0; a < 6; a++) {
    const r = await fetch(`${BASE}/${id}`);
    if (r.ok) {
      const j = await r.json();
      const o = {};
      for (const [k, val] of Object.entries(j.fields || {})) o[k] = dec(val);
      o.__fields = j.fields || {};
      return o;
    }
    if (r.status === 404) return null;
    if (r.status === 429) { await sleep(5000 * (a + 1)); continue; }
    return null;
  }
  return '__throttled__';
}

async function patchSpotlight(id, spotlight) {
  // Patch ONLY spotlight + updatedAt (quota-friendly; preserves all other fields).
  const fields = { spotlight: enc(spotlight), updatedAt: enc(STAMP) };
  const url = `${BASE}/${id}?updateMask.fieldPaths=spotlight&updateMask.fieldPaths=updatedAt`;
  for (let a = 0; a < 6; a++) {
    const r = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    if (r.ok) return;
    if (r.status === 429) { await sleep(5000 * (a + 1)); continue; }
    throw new Error(`PATCH ${id} -> ${r.status} ${await r.text()}`);
  }
  throw new Error(`PATCH ${id} -> throttled after retries`);
}

let totalNew = 0, totalLeg = 0, vid = 0;
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
    totalNew++; vid++;
    if (it.issueKey) issueTally[it.issueKey] = (issueTally[it.issueKey] || 0) + 1;
  });
  const merged = existing.concat(toAdd);
  console.log(`+ ${id} (${doc.name}): +${toAdd.length} [${existing.length} -> ${merged.length}]`);
  toAdd.forEach((it) => console.log(`    • [${it.sourceType}] ${it.headline}  #${it.issueKey}`));
  if (APPLY) {
    await patchSpotlight(id, merged);
    console.log('    ✓ written');
    await sleep(1200);
  }
}

console.log('\n──────── summary ────────');
console.log(`legislators touched   : ${totalLeg}`);
console.log(`new spotlight items   : ${totalNew}`);
console.log(`  official floor video : ${vid}`);
console.log('issue tally :', Object.entries(issueTally).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(', '));
console.log(APPLY ? '\nAPPLIED to Firestore.' : '\nDRY RUN — re-run with --apply to write.');
