#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — July 2026 · Community Evidence Exchange LEADS (staging batch)
//
// The ~20 items originally proposed for the Evidence Locker were third-party
// commentary and AI-generated ("@grok") X posts. Per EVIDENCE_STRENGTH.md and
// CONTENT_STYLE.md they do NOT qualify as curated receipts: a receipt must be
// the named individual's OWN words/action, verifiably attributable. So instead of
// forcing them in, they are staged here as LEADS (`kind: 'lead'`) — tips for a
// moderator to chase down and, where a real primary source exists, promote into
// the Evidence Locker with proper attribution.
//
// The Community Evidence Exchange (cee_posts, served by /api/community) is an
// AUTHENTICATED, member-identity system: posts carry a verified Firebase uid, so
// there is intentionally NO unauthenticated bulk-insert path. This script does
// NOT write to the database. It is a clean, reviewable staging list in the exact
// cee_posts field shape, printed for a moderator to submit through the Contribute
// form (which now even live-verifies YouTube attribution via /api/yt-verify).
//
//   node scripts/cee-leads-datacenter-immigration-jul2026.mjs           # print
//   node scripts/cee-leads-datacenter-immigration-jul2026.mjs --json    # emit JSON
//
// FIELD SHAPE (mirrors db/schema.ts · cee_posts):
//   headline     — short, factual, about the topic (not a verdict)
//   summary      — what the lead is and what a moderator should verify
//   sourceUrl    — the pointer that surfaced it (the X post)
//   kind         — always 'lead' here (no strict source bar; a tip to look into)
//   sourceType   — self-declared category: 'social' (a post/clip) | 'other' (AI, etc.)
//   categoryKey  — a CORE_NATIONAL_ISSUES key
//   issueKeys    — zero or more ISSUE_MAP keys
//   chase        — curator note: who to attribute to + what PRIMARY source to find
//
// HONESTY FLAGS baked into each lead:
//   • X posts from commentary accounts are opinion/analysis, not the official's words.
//   • "@grok" is X's AI assistant; its output is NOT a source. Any grok-surfaced
//     claim must be re-confirmed from a primary record before it is used at all.
// ---------------------------------------------------------------------------

const EMIT_JSON = process.argv.includes('--json');
const xurl = (handle, id) => `https://x.com/${handle}/status/${id}`;

// ── The leads ───────────────────────────────────────────────────────────────
const LEADS = [
  // ===== 1–5 · Data centers / water / power (Utah) — commentary & questions =====
  {
    headline: 'Claim: a proposed Utah data center would draw more electricity than the entire state uses',
    summary: 'A commentary post argues a planned Utah data center\'s electricity demand would exceed statewide usage and warns of Great Salt Lake risk. Opinion/analysis, not an official\'s statement — needs the underlying utility/PUC filing or company disclosure.',
    sourceUrl: xurl('SocialistMormon', '2051663332042789112'),
    kind: 'lead', sourceType: 'social', categoryKey: 'climate_energy',
    issueKeys: ['datacenter_water', 'enviro_energy'],
    chase: 'Find the load-study / interconnection filing or a legislator/regulator on record about this project; attribute any receipt to that individual.',
  },
  {
    headline: 'Idea floated: charge data centers a steep per-unit fee for excess water/power use',
    summary: 'A post proposes charging data centers ~$1M per extra gallon or kWh. This is the poster\'s own proposal, not a policy any official has advanced — a lead to check whether any Utah legislator or commissioner has proposed a real fee/tariff.',
    sourceUrl: xurl('SocialistMormon', '2052198345624752555'),
    kind: 'lead', sourceType: 'social', categoryKey: 'climate_energy',
    issueKeys: ['datacenter_water', 'datacenter_growth'],
    chase: 'Look for an actual bill, ordinance, or PUC rate proposal; if a named official backs one, that becomes the receipt.',
  },
  {
    headline: 'Guardian report cited: data center would use "more power than entire state" and vast water',
    summary: 'A post links a Guardian article on a data center\'s power and water footprint. The Guardian piece itself may be a citable secondary source — but a PolitiDex receipt needs a Utah official\'s own statement/vote on it, not the commentary framing.',
    sourceUrl: xurl('essenviews', '2055443955836235822'),
    kind: 'lead', sourceType: 'social', categoryKey: 'climate_energy',
    issueKeys: ['datacenter_water', 'water'],
    chase: 'Read the linked Guardian article; pair it with an on-record statement from Curtis/Moore/local officials (some already have data-center receipts) before promoting.',
  },
  {
    headline: 'Context claim: data center water use compared to agricultural water use in Utah',
    summary: 'A post offers context comparing data-center water consumption to agriculture. Useful framing but an individual\'s analysis — verify the numbers against the state water authority or division of water resources.',
    sourceUrl: xurl('sergeanttheodor', '2076684465980740043'),
    kind: 'lead', sourceType: 'social', categoryKey: 'climate_energy',
    issueKeys: ['water', 'rural_ag'],
    chase: 'Confirm figures via Utah Division of Water Resources; attribute any position to a named official who states it.',
  },
  {
    headline: 'Question raised: how is water "replaced" for concrete in new data-center builds?',
    summary: 'A post asks how water used in concrete for a new data center is accounted for. This is an open question, not a claim or an official\'s position — a genuine research lead, not evidence.',
    sourceUrl: xurl('UTChargerTom', '2074565013608800335'),
    kind: 'lead', sourceType: 'social', categoryKey: 'climate_energy',
    issueKeys: ['datacenter_water', 'water'],
    chase: 'Track down the project\'s water plan / permit; only becomes a receipt if a named official answers on record.',
  },

  // ===== 6–8 · 287(g) / immigration — AI-generated ("@grok") posts =====
  // NOTE: @grok is X's AI assistant. Its output is NOT a source. The underlying
  // facts have since been confirmed from primary reporting; where attribution is
  // clean they are now real receipts (see spotlight-287g-batch-jul2026.mjs).
  {
    headline: 'AI-surfaced claim: Utah County Sheriff signed a 287(g) agreement (July 2025)',
    summary: 'An @grok reply asserts the Utah County Sheriff\'s 287(g) agreement. RESOLVED: independently confirmed via KSL/Tribune/KUER/Deseret and now a curated receipt for Sheriff Mike Smith. Kept as a lead only to record provenance; the AI post itself is not a source.',
    sourceUrl: xurl('grok', '2001066719683502552'),
    kind: 'lead', sourceType: 'other', categoryKey: 'immigration',
    issueKeys: ['border_security'],
    chase: 'DONE — promoted to mike_smith_sheriff from primary sources. No further action; do not cite the grok post.',
  },
  {
    headline: 'AI-surfaced detail: scope of the Utah County Sheriff\'s 287(g) authority',
    summary: 'An @grok reply describes the Utah County agreement\'s authority (WSO + Task Force Model). RESOLVED via primary reporting and folded into Sheriff Mike Smith\'s receipt. The AI text is not itself citable.',
    sourceUrl: xurl('grok', '1945680272370049203'),
    kind: 'lead', sourceType: 'other', categoryKey: 'immigration',
    issueKeys: ['border_security', 'immigration_reform'],
    chase: 'DONE — covered by the Mike Smith receipt. Do not cite the grok post.',
  },
  {
    headline: 'AI-surfaced claim: Utah DOC and Washington County have 287(g) agreements',
    summary: 'An @grok reply asserts Utah DOC (WSO, signed May 13 2025) and Washington County (signed Mar 21 2025) agreements. Facts confirmed via KSL, but NOT yet promotable: Washington County\'s signer, Sheriff Nate Brooksby, has resigned and is not a PolitiDex profile, and Utah DOC is an agency with no individual in the roster.',
    sourceUrl: xurl('grok', '1927522197909676098'),
    kind: 'lead', sourceType: 'other', categoryKey: 'immigration',
    issueKeys: ['border_security'],
    chase: 'OPEN — add a Nate Brooksby profile (former Washington County Sheriff) before attributing that signing; decide whether/how to represent the Utah DOC director as an individual. Do not cite the grok post as the source.',
  },

  // ===== 11–15 · Property taxes / local spending (Utah counties) =====
  // No specific posts were provided for this section — placeholder retained so the
  // moderator queue reflects the intended coverage area without fabricating items.
  // (Add concrete X post IDs here and they will format like the leads above.)

  // ===== 16–20 · Tariffs / economy / federal ties =====
  // Flagged by the submitter as "more opinion-based"; verified accounts to be
  // supplied later. Intentionally left empty rather than staging opinion posts.
];

// ── Output ───────────────────────────────────────────────────────────────────
if (EMIT_JSON) {
  console.log(JSON.stringify(LEADS.map(({ chase, ...post }) => post), null, 2));
} else {
  console.log('PolitiDex · Community Evidence Exchange — staged LEADS (not written to DB)\n');
  LEADS.forEach((l, i) => {
    console.log(`${String(i + 1).padStart(2)}. [${l.categoryKey}] ${l.headline}`);
    console.log(`    kind=${l.kind}  sourceType=${l.sourceType}  issueKeys=[${l.issueKeys.join(', ')}]`);
    console.log(`    ${l.summary}`);
    console.log(`    source: ${l.sourceUrl}`);
    console.log(`    ↳ chase: ${l.chase}\n`);
  });
  const byType = LEADS.reduce((m, l) => (m[l.sourceType] = (m[l.sourceType] || 0) + 1, m), {});
  console.log('──────── summary ────────');
  console.log(`staged leads          : ${LEADS.length}`);
  console.log(`by sourceType         : ${Object.entries(byType).map(([k, n]) => `${k}=${n}`).join(', ')}`);
  console.log('note                  : leads enter via the authenticated Contribute form; this file is a staging list, nothing is written.');
}
