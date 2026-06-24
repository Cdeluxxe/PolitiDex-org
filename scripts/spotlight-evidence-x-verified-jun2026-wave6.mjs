#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 evidence pass (wave 6): verified X-POST evidence for
// current sitting Utah legislators whose profiles still carry thin or missing
// social evidence. Small, conservative, fully verified.
//
// SCOPE / SOURCING
// A reviewer supplied a candidate list of X posts for six members. Every
// candidate id was re-fetched live from the public Twitter syndication
// endpoint (cdn.syndication.twimg.com/tweet-result?id=<id>), which returns the
// post's EXACT text, created_at, and the AUTHORING account's screen_name +
// display name + verified flag WITHOUT login. A post was used ONLY when:
//   • the verified screen_name is the legislator's own official handle,
//   • the account shows verified = true,
//   • the post is NOT a retweet and NOT a reply (no in_reply_to_screen_name),
//   • the post is NOT generic candidate promotion, and
//   • the text states a substantive position / action on a specific issue that
//     maps to a live issueKey in index.html's issue vocabulary.
//
// VERIFIED RESULTS OF THE AUDIT (2026-06-24):
//
//   ADDED — Michael McKell (@mikemckellutah), tech_balance ("Smart Tech
//   Guardrails" — the live key whose chip names online-safety + age-verification
//   rules, the heart of his Social Media Regulation Act work; his profile leads
//   with "Online Child Safety & Social Media"). Two standalone posts:
//     • 1874937715436994792 (2025-01-02) — Big Tech / NetChoice vs. kid-safety
//     • 1991506368793325827 (2025-11-20) — "Social media is a cancer", his stance
//
//   ADDED — Stuart Adams (@JStuartAdams), water (his "Water & Great Salt Lake"
//   signature cause). Two standalone long-form posts on his own action to win
//   water protections from a large data-center development:
//     • 2062580611563581605 (2026-06-04) — secured a water commitment
//     • 2061434360075870672 (2026-06-01) — demanded a 75% footprint cut + water
//
//   SKIPPED — Dan McCay (@danmccay), all three candidates:
//     • 2062996675472527819 — a REPLY (in_reply_to @omicblues). Disqualified.
//     • 2063275574366498942 — a REPLY (in_reply_to @CurtisOstler). Disqualified.
//     • 2060506874500559072 — standalone, but the text is generic campaign
//       promotion ("I'm the only candidate in this race…"); its visible content
//       does not show the leaseholder/property-rights position it was offered
//       for. Disqualified (generic promotion + unsupported issue tie).
//     (McCay already carries one prior verified X item, so he is not at zero.)
//
//   SKIPPED — Trevor Lee (@VoteTrevorLee):
//     • 2067829485878366211 — a REPLY (in_reply_to @LindsayOnAir/@abc4utah).
//       Substantive on county spending, but a reply is disqualified per the bar.
//
//   ALREADY PRESENT (verified, no action) — Lisa Shepherd (@lisamshepherd):
//   both election_integrity posts (2022507264956076293 SOS, 1999659669997125648
//   signature verification) are already in her live spotlight. John Arthur
//   (@9thEvermore): the econ_workers HB267-referendum post (1912863582049493473)
//   is already in his live spotlight.
//
// CONTENT_STYLE: every item is about the INDIVIDUAL's own words and recorded
// action — never their party. Characterizations the legislator makes (e.g.
// "social media is a cancer") are attributed to the legislator, not asserted.
//
// Idempotent: each member's live `spotlight` array is re-fetched and an item is
// appended ONLY if no existing item shares its headline.
//
//   node scripts/spotlight-evidence-x-verified-jun2026-wave6.mjs            # dry run
//   node scripts/spotlight-evidence-x-verified-jun2026-wave6.mjs --apply    # write
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

  // ===== Michael McKell — Senate District 25 — 2 X posts (tech_balance) ======
  // Thin profile (0 X items). His profile leads with "Online Child Safety &
  // Social Media"; tech_balance is the live key whose chip names online-safety
  // and age-verification rules — the substance of his Social Media Regulation Act.
  mmckell: [
    xItem({ issueKey: 'tech_balance', handle: 'mikemckellutah', name: 'Michael McKell', accountLabel: 'X post',
      statusId: '1874937715436994792', date: '2025-01-02', dateLabel: 'Jan 2, 2025',
      tags: ['Public Statements', 'Consistency'],
      quote: "Congrats, California—the world's 5th largest economy— for winning its fight against @NetChoice to protect kids from social media. NetChoice and Big Tech companies need to start negotiating in good faith and work to find real solutions to safeguard kids.",
      headline: 'Posted on X backing legal efforts to protect minors from social media and pressing Big Tech to negotiate child-safety rules',
      facts: "On January 2, 2025, McKell wrote on his X account (@mikemckellutah): “Congrats, California—the world's 5th largest economy— for winning its fight against @NetChoice to protect kids from social media. NetChoice and Big Tech companies need to start negotiating in good faith and work to find real solutions to safeguard kids.” McKell is the Senate sponsor of Utah's Social Media Regulation Act, which requires age verification and parental consent for minors and has faced industry-group litigation.",
      why: "Online child safety and social-media regulation is the keyissue his profile leads with; this is his own dated statement of the position behind the age-verification and parental-consent law he sponsored, in his own words." }),
    xItem({ issueKey: 'tech_balance', handle: 'mikemckellutah', name: 'Michael McKell', accountLabel: 'X post',
      statusId: '1991506368793325827', date: '2025-11-20', dateLabel: 'Nov 20, 2025',
      tags: ['Public Statements', 'Consistency'],
      quote: "Thank you Senator John Curtis! Social media is a cancer. I appreciate your efforts to engage on this difficult issue.",
      headline: 'Posted on X calling social media harmful to address and backing continued action to regulate it for minors',
      facts: "On November 20, 2025, McKell wrote on his X account (@mikemckellutah): “Thank you Senator John Curtis! Social media is a cancer. I appreciate your efforts to engage on this difficult issue.” The post restates the harm-to-minors framing behind McKell's Social Media Regulation Act, which requires age verification and parental consent for minors using social platforms.",
      why: "It is McKell's own characterization of social media as a harm to be regulated — the rhetoric that underpins the online-child-safety work his profile names as a top priority." }),
  ],

  // ===== Stuart Adams — Senate District 7 — 2 X posts (water) ================
  // Thin profile (2 spotlight items, 0 X). His signature cause is the Great Salt
  // Lake and long-term water planning; both posts document his own action to win
  // water protections from a large data-center development.
  sadams: [
    xItem({ issueKey: 'water', handle: 'JStuartAdams', name: 'Stuart Adams', accountLabel: 'X post',
      statusId: '2062580611563581605', date: '2026-06-04', dateLabel: 'Jun 4, 2026',
      tags: ['Public Statements', 'Notable Actions'],
      quote: "In response to the demand letter I sent to @kevinolearytv, he agreed to all conditions. Protecting Utah’s water, especially the future of the Great Salt Lake, remains one of my highest priorities. As a result of the letter, the project now includes a commitment of water that did…",
      headline: 'Posted on X that his demand letter secured a water commitment for the Great Salt Lake from a major development project',
      facts: "On June 4, 2026, Adams wrote on his X account (@JStuartAdams): “In response to the demand letter I sent to @kevinolearytv, he agreed to all conditions. Protecting Utah’s water, especially the future of the Great Salt Lake, remains one of my highest priorities. As a result of the letter, the project now includes a commitment of water that did…” Adams says the developer agreed to his conditions, adding a dedicated water commitment for the Great Salt Lake.",
      why: "Saving the Great Salt Lake and long-term water planning is the signature cause his profile names; this is his own account of using his office to extract concrete water protections from a major project." }),
    xItem({ issueKey: 'water', handle: 'JStuartAdams', name: 'Stuart Adams', accountLabel: 'X post',
      statusId: '2061434360075870672', date: '2026-06-01', dateLabel: 'Jun 1, 2026',
      tags: ['Public Statements', 'Notable Actions'],
      quote: "I’ve sent a letter directly to @kevinolearytv calling for a 75% reduction in the proposed data center project area, from 40,000 acres to approximately 10,000 acres. I am also requiring that any excess water be treated and dedicated to the Great Salt Lake, even though none of the…",
      headline: 'Posted on X demanding a 75% footprint cut and dedicated Great Salt Lake water for a proposed data-center project',
      facts: "On June 1, 2026, Adams wrote on his X account (@JStuartAdams): “I’ve sent a letter directly to @kevinolearytv calling for a 75% reduction in the proposed data center project area, from 40,000 acres to approximately 10,000 acres. I am also requiring that any excess water be treated and dedicated to the Great Salt Lake, even though none of the…” The post sets out his specific demands — a sharply reduced project footprint and water dedicated to the lake — for a large data-center development.",
      why: "It is Adams's own, dated, specific demand on behalf of the Great Salt Lake — the water priority his profile leads with — stated in concrete terms (acreage and dedicated water)." }),
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
