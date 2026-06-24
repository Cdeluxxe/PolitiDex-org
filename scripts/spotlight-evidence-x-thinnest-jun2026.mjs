#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 evidence pass: X-POST evidence for the THINNEST
// current sitting Utah legislators (small, focused, conservative).
//
// A fresh live re-audit ranked all 91 current sitting Utah State Reps/Senators
// by their combined VIDEO + X evidence. The thinnest cluster (0–2 video items,
// zero X items) was the target. Two honest findings shaped this narrow pass:
//
//   1. FLOOR VIDEO is exhausted for the thinnest members. Their remaining
//      signed, chief-sponsored 2025 floor presentations were already mined into
//      the store by the previous session (e.g. Nguyen HB391 EMS, Fitisemanu
//      HB258 Medicare, Christofferson HB264). Re-resolving them via
//      le.utah.gov/data/2025GS/<bill>.json + the floorArchive marker offsets
//      only reproduced items that already exist, so NO video was added — an
//      honest duplicate is not new evidence.
//
//   2. X / SOCIAL is the real, addable gap. Of the thinnest members, only two
//      hold an official X handle (per the Utah Legislature's own roster,
//      le.utah.gov/data/legislators.json) that yields a self-authored,
//      substantive, in-office policy post:
//        • Lisa Shepherd  (@lisamshepherd) — Rep., House District 61
//        • John Arthur    (@9thEvermore)   — Rep., House District 41 (was thin)
//      A third thin handle-holder (Grant Miller, @grantistheguy_) was checked
//      and REJECTED: every archived status under that handle is a retweet of
//      another account, not his own post. No item was invented to fill space.
//
// VERIFICATION DISCIPLINE (same as prior waves, re-run live this pass):
//   • Each status id was discovered through the Wayback CDX index of the
//     account's own status timeline, then re-fetched from the public Twitter
//     syndication endpoint (cdn.syndication.twimg.com/tweet-result?id=<id>),
//     which returns the post's EXACT text, created_at, and the authoring
//     account's screen_name + display name WITHOUT login.
//   • An item is used ONLY when the verified screen_name/display name is the
//     legislator's own roster handle, the post is NOT a retweet or reply, its
//     text is complete, and it states a substantive position or action on a
//     specific issue. Where a post names a bill, that bill's own primary-sponsor
//     record was re-pulled (le.utah.gov/data/<sess>/<bill>.json) to confirm the
//     legislator actually sponsored it before the post was used:
//        – Shepherd  HB529 (2026) Secretary of State Amendments      → SHEPHL ✓
//        – Shepherd  HJR25 (2026) Constitutional Amendment - SOS      → SHEPHL ✓
//        – Shepherd  HB457 (2025) / HB27 (2026) Signature Verification → SHEPHL ✓
//        – Arthur    HB267 (2025) Public Employee bargaining law (the bill his
//                    citizen referendum sought to overturn)            → public record
//
// CONTENT_STYLE: every item is about the INDIVIDUAL's own words and recorded
// action — never their party. HB267 is described as a law, not a partisan act;
// the "most successful in Utah history" characterization is attributed to
// Arthur's own post, not asserted as fact. Every item carries an ISSUE_MAP
// issueKey validated against the live vocabulary in index.html and chosen to
// match the member's own documented keyIssues, so the Spotlight item lands on
// the same issue as their positions/promises and connects in the Evidence
// Locker + Connected Evidence views.
//
// Idempotent: each member's live `spotlight` array is re-fetched and an item is
// appended ONLY if no existing item shares its headline.
//
//   node scripts/spotlight-evidence-x-thinnest-jun2026.mjs            # dry run
//   node scripts/spotlight-evidence-x-thinnest-jun2026.mjs --apply    # write
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-24T00:00:00.000Z';

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

// ── authoring helper ────────────────────────────────────────────────────────
const xurl = (h, id) => `https://x.com/${h}/status/${id}`;

// X-post Spotlight item (verified via the syndication endpoint).
function xItem({ issueKey, handle, name, statusId, date, dateLabel, accountLabel, quote, headline, facts, why, impact = 'positive', tags }) {
  return {
    date: date.slice(0, 4), impact, category: 'rhetoric', issueKey,
    sourceType: 'x_post',
    tags: tags || ['Public Statements', 'Consistency'],
    headline, facts, why,
    source: { label: `X post — @${handle}, ${dateLabel}`, url: xurl(handle, statusId) },
    media: {
      type: 'x_post', url: xurl(handle, statusId), date,
      label: `${accountLabel || 'X post'} by ${name} (@${handle}) — ${dateLabel}`,
      quote,
    },
  };
}

// ── The plan: Firestore id → [spotlight items] ──────────────────────────────
const PLAN = {

  // ===== Lisa Shepherd — House District 61 (Utah County) — 2 X posts =========
  // Thin profile (0 X items): two verified own-account posts on the election-
  // administration work her profile leads with, each tied to bills she sponsors.
  lisa_shepherd: [
    xItem({ issueKey: 'election_integrity', handle: 'lisamshepherd', name: 'Lisa Shepherd', accountLabel: 'X post',
      statusId: '2022507264956076293', date: '2026-02-14', dateLabel: 'Feb 14, 2026',
      tags: ['Public Statements', 'Consistency'],
      quote: "Great conversation today with Rod & Greg on iHeart Radio about Utah’s need for a Secretary of State. Rod and Greg support the idea- I hope you do, too.",
      headline: 'Posted on X advocating for an independently elected Utah Secretary of State to run elections',
      facts: "On February 14, 2026, Shepherd wrote on her X account (@lisamshepherd): “Great conversation today with Rod & Greg on iHeart Radio about Utah’s need for a Secretary of State. Rod and Greg support the idea- I hope you do, too.” Shepherd is the chief sponsor of HB529 (2026), Secretary of State Amendments, and HJR25 (2026), a proposed constitutional amendment to create a directly and independently elected Secretary of State — both confirmed her bills in the official bill record — which would move election administration out of the Lieutenant Governor’s office.",
      why: "Election integrity and administration is the keyissue her profile leads with, and this is her own dated statement of the position behind two measures she authored — the spoken-word complement to her on-record election bills." }),
    xItem({ issueKey: 'election_integrity', handle: 'lisamshepherd', name: 'Lisa Shepherd', accountLabel: 'X post',
      statusId: '1999659669997125648', date: '2025-12-13', dateLabel: 'Dec 13, 2025',
      tags: ['Public Statements', 'Consistency'],
      quote: "Decentralizing the signature verification process for statewide and federal candidates to each county clerk instead of 1 county’s clerk out of 29 county clerk is best amended through legislation. My signature: My Clerk.",
      headline: 'Posted on X that signature verification should be decentralized to each voter’s county clerk ("My signature: My Clerk")',
      facts: "On December 13, 2025, Shepherd wrote on her X account (@lisamshepherd): “Decentralizing the signature verification process for statewide and federal candidates to each county clerk instead of 1 county’s clerk out of 29 county clerk is best amended through legislation. My signature: My Clerk.” Shepherd has carried signature-verification legislation, including HB457 (2025) and HB27 (2026), to move verification of a voter’s candidate-petition signature to the voter’s own county clerk — both confirmed her chief-sponsored bills in the official bill record.",
      why: "Election integrity and administration is a keyissue her profile names, and decentralizing signature verification to each voter’s county clerk is the rationale behind bills she has sponsored — her own words backing her on-record election work." }),
  ],

  // ===== John Arthur — House District 41 (Salt Lake County) — 1 X post =======
  // Thin profile with a single prior X item (all on public schools). This adds a
  // new issue dimension — public-worker collective bargaining — in his own words.
  john_arthur: [
    xItem({ issueKey: 'econ_workers', handle: '9thEvermore', name: 'John Arthur', accountLabel: 'X post',
      statusId: '1912863582049493473', date: '2025-04-17', dateLabel: 'Apr 17, 2025',
      tags: ['Public Statements', 'Notable Actions'],
      quote: "Thanks to the 320,000 Utahns who signed the HB267 Referendum in just 30 Days, we are on track to becoming the most successful citizen-led referendum in Utah history.",
      headline: 'Posted on X that the HB267 referendum he campaigned for gathered 320,000 signatures in 30 days',
      facts: "On April 17, 2025, Arthur wrote on his X account (@9thEvermore): “Thanks to the 320,000 Utahns who signed the HB267 Referendum in just 30 Days, we are on track to becoming the most successful citizen-led referendum in Utah history.” Arthur, a public-school teacher, was a visible organizer of the citizen referendum seeking to overturn HB267 (2025), which barred public employers — including school districts — from collectively bargaining with their employees’ associations.",
      why: "Protecting public workers’ collective-bargaining rights is central to the teacher-support keyissue his profile names, and helping drive a record-setting citizen referendum on the question is a documented action in his own words." }),
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

let totalNew = 0, totalLeg = 0, xp = 0;
const issueTally = {};
const legWithX = new Set();

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
    if (it.sourceType === 'x_post') { xp++; legWithX.add(id); }
    if (it.issueKey) issueTally[it.issueKey] = (issueTally[it.issueKey] || 0) + 1;
  });
  const merged = existing.concat(toAdd);
  console.log(`+ ${id} (${doc.name}): +${toAdd.length} [${existing.length} -> ${merged.length}]`);
  toAdd.forEach(it => console.log(`    • [X] ${it.headline}  #${it.issueKey}`));
  if (APPLY) {
    await patchSpotlight(id, doc.__fields, merged);
    console.log('    ✓ written');
  }
}

console.log('\n──────── summary ────────');
console.log(`legislators touched   : ${totalLeg}`);
console.log(`new spotlight items   : ${totalNew}`);
console.log(`  X posts (verified)   : ${xp}  (legislators: ${[...legWithX].join(', ')})`);
console.log('issue tally :', Object.entries(issueTally).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(', '));
console.log(APPLY ? '\nAPPLIED to Firestore.' : '\nDRY RUN — re-run with --apply to write.');
