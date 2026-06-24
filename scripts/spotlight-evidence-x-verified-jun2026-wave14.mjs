#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 evidence pass (wave 14): verified X-POST evidence for
// current sitting Utah legislators whose profiles still carry thin or missing
// social evidence. Small, conservative, fully verified — a follow-up to the
// wave-6 X-verified pass.
//
// SCOPE / SOURCING
// A reviewer supplied a fresh candidate list of X posts for several members.
// Every candidate id was re-fetched live from the public Twitter syndication
// endpoint (cdn.syndication.twimg.com/tweet-result?id=<id>), which returns the
// post's EXACT text, created_at, and the AUTHORING account's screen_name +
// display name + (blue-)verified flag WITHOUT login. A post was used ONLY when:
//   • the verified screen_name is the legislator's own official handle,
//   • the account shows a verified badge (legacy verified OR blue verified),
//   • the post is NOT a retweet and NOT a reply (no in_reply_to_screen_name),
//   • the post is NOT generic candidate promotion, and
//   • the text states a substantive position / action on a specific issue that
//     maps to a live issueKey the legislator already holds in ISSUE_STANCE_DATA
//     (so the item lights up in the Connected-Evidence view, not just the
//     Evidence Locker).
//
// VERIFIED RESULTS OF THE AUDIT (2026-06-24):
//
//   ADDED — Stuart Adams (@JStuartAdams), water (his "Water & Great Salt Lake"
//   signature cause). One standalone, substantive post not already in his
//   spotlight:
//     • 2040142673626247518 (2026-04-03) — backs a $1B request to protect and
//       restore the Great Salt Lake. (His two earlier GSL data-center posts —
//       2062580611563581605 and 2061434360075870672 — are already live from
//       wave 6, so they are not re-added here.)
//
//   ALREADY PRESENT (verified, no action) — Michael McKell (@mikemckellutah):
//   both tech_balance posts the reviewer re-submitted (1874937715436994792,
//   1991506368793325827) are already in his live spotlight from wave 6.
//   Stuart Adams: 2061434360075870672 is already live.
//
//   SKIPPED — Dan McCay (@danmccay):
//     • 2063275574366498942 — a REPLY (in_reply_to @CurtisOstler). Substantive
//       on broad-based tax cuts, but a reply is disqualified per the bar.
//     • 2060506874500559072 — standalone, but the text is generic campaign
//       promotion ("I'm the only candidate in this race…") and does not show
//       the property-rights position it was offered for. Disqualified.
//     (McCay already carries one prior verified X item — lower_taxes / SB59 —
//     so he is not at zero.)
//
//   SKIPPED — Trevor Lee (@VoteTrevorLee):
//     • 2067829485878366211 — a REPLY (in_reply_to @LindsayOnAir).
//     • 2065672758026244481 — a REPLY (in_reply_to @Scamthomp) and a one-line
//       quip ("You must love property tax hikes."), not substantive.
//     Both disqualified.
//
//   SKIPPED — search-based candidates (Ken Ivory @KenIvoryUT, Christine Watkins
//   @RepWatkins, Brady Brammer @BradyBrammer, Karianne Lisonbee, Jordan
//   Teuscher, Cory Maloy): the reviewer asked for a timeline search rather than
//   naming specific posts. The public syndication timeline endpoint was rate-
//   limited (HTTP 429) at audit time and web search surfaced no retrievable
//   post ids, so no post from these accounts could be authenticated through the
//   per-tweet endpoint. Per the conservative bar, nothing unverifiable is added.
//
// CONTENT_STYLE: the item is about the INDIVIDUAL's own words and recorded
// action — never their party. Adams's own characterization ("a national
// treasure that's part of our identity") is attributed to him, not asserted.
//
// Idempotent: the member's live `spotlight` array is re-fetched and an item is
// appended ONLY if no existing item shares its headline or its media URL.
//
//   node scripts/spotlight-evidence-x-verified-jun2026-wave14.mjs            # dry run
//   node scripts/spotlight-evidence-x-verified-jun2026-wave14.mjs --apply    # write
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

  // ===== Stuart Adams — Utah Senate President — 1 X post (water) =============
  // His signature cause is the Great Salt Lake and long-term water planning;
  // this standalone post documents his own public push for $1B to protect and
  // restore the lake. Ties to `water`, a position he already holds.
  sadams: [
    xItem({ issueKey: 'water', handle: 'JStuartAdams', name: 'Stuart Adams', accountLabel: 'X post',
      statusId: '2040142673626247518', date: '2026-04-03', dateLabel: 'Apr 3, 2026',
      tags: ['Public Statements', 'Notable Actions'],
      quote: "The Great Salt Lake is a national treasure that’s part of our identity. A $1 billion request to protect and restore the lake will make an all the difference for the future of water in the west. Thank you to the Trump Administration for your partnership as we take meaningful steps…",
      headline: 'Posted on X backing a $1 billion request to protect and restore the Great Salt Lake',
      facts: "On April 3, 2026, Adams wrote on his X account (@JStuartAdams): “The Great Salt Lake is a national treasure that’s part of our identity. A $1 billion request to protect and restore the lake will make an all the difference for the future of water in the west.” The post frames a $1 billion funding request as a step toward securing the lake and the region's long-term water supply.",
      why: "Saving the Great Salt Lake and long-term water planning is the signature cause his profile leads with; this is his own dated statement putting a specific dollar figure behind that priority." }),
  ],

};

// ── apply ───────────────────────────────────────────────────────────────────
function hk(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 70); }
function mediaUrl(s) { return (s && s.media && s.media.url) || (s && s.source && s.source.url) || ''; }

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
  const seenHead = new Set(existing.map(s => hk(s.headline || s.title)));
  const seenUrl = new Set(existing.map(mediaUrl).filter(Boolean));
  const toAdd = items.filter(it => !seenHead.has(hk(it.headline)) && !seenUrl.has(mediaUrl(it)));
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
