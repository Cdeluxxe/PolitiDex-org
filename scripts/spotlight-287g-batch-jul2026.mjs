#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — July 2026 · 287(g) PRIMARY-SOURCE evidence batch
//
// Turns the immigration-enforcement leads (originally surfaced as third-party /
// AI-generated X posts) into PROPER receipts — sourced to official government
// records and reputable reporting, attributed to the individual who actually
// took the action, and graded honestly. No tweet and no AI ("@grok") output is
// used as a source anywhere in this batch; those were only pointers to chase.
//
// VERIFICATION (matches EVIDENCE_STRENGTH.md + CONTENT_STYLE.md):
//   • Every fact below was confirmed across multiple independent, reputable
//     reports (KSL, Salt Lake Tribune, KUER, Deseret News, Axios, Daily Herald)
//     and, where possible, an official government record (the Utah County
//     Commission public-meeting notice on utah.gov/pmn).
//   • Each item describes what THIS individual — Utah County Sheriff Mike Smith —
//     personally did or said, in his own words. No party-grouping language; the
//     unanimous commission vote is stated as a fact, not as "party lines".
//   • These are on-the-record statements/actions sourced to reporting and an
//     official notice, NOT floor/committee video or a bill record, so they grade
//     "Moderate" (statement +1, direct link +1, tracked issue +1 = 3). That is
//     the honest grade under _strength(); nothing here is inflated to "Strong".
//
// WHY ONLY MIKE SMITH — deliberate, compliance-driven exclusions:
//   • WASHINGTON COUNTY was signed (Mar 21 2025) and publicly championed by
//     Sheriff NATE BROOKSBY, who has since RESIGNED. Brooksby is not a PolitiDex
//     profile, and the current interim sheriff, Barry Golding, did NOT sign or
//     drive the agreement (he took over "to calm the water" after the fact).
//     Attributing Brooksby's action to Golding would be a false attribution, so
//     Washington County is intentionally left out until a Brooksby profile exists.
//   • UTAH DEPARTMENT OF CORRECTIONS signed a Warrant Service Officer agreement
//     (May 13 2025), but that is an AGENCY action with no individual office-holder
//     in the PolitiDex roster to attribute it to. PolitiDex evaluates individuals,
//     so it is left out rather than attributed to "the department".
//   • WEBER COUNTY (Sheriff Ryan Arbon) already carries 287(g) receipts in his
//     profile — not duplicated here.
//   Each of these is instead staged as a moderator LEAD (see
//   scripts/cee-leads-datacenter-immigration-jul2026.mjs).
//
// Idempotent & non-destructive: the member's live `spotlight` array is re-fetched
// and an item is appended ONLY if no existing item shares its headline. Existing
// entries are never clobbered.
//
//   node scripts/spotlight-287g-batch-jul2026.mjs            # dry run
//   node scripts/spotlight-287g-batch-jul2026.mjs --apply    # write
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-07-14T00:00:00.000Z';

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

// ── The batch: politician id → [spotlight items] ────────────────────────────
// Firestore doc id verified live: `mike_smith_sheriff` → "Mike Smith",
// office "🛡 Sheriff — Utah County, Utah" (0 existing spotlight items).
const PLAN = {
  mike_smith_sheriff: [
    { date: 'Jul 2025', issueKey: 'border_security', impact: 'neutral', category: 'statement',
      tags: ['Notable Actions', 'Public Statements'], sourceType: 'statement',
      headline: 'Smith brings the Utah County Sheriff\'s Office into two 287(g) agreements with ICE',
      facts: 'On July 16, 2025, the Utah County Commission approved two 287(g) memoranda of understanding for Sheriff Mike Smith\'s office — a Warrant Service Officer program and a Task Force Model — in a unanimous vote that followed roughly four hours of public comment from about 115 speakers, all opposed. The agreements authorize trained deputies to serve administrative immigration warrants on people already in the county jail and to exercise limited immigration authority during routine police work. In his own words, Smith said the formalization does not represent a major shift: "It doesn\'t really change much at all what we\'ve been doing." He drew a firm line on raids — "I\'m not comfortable with ICE raids ... I have assurance from ICE that they will not happen here" — and framed the deal as coordination and oversight: "We are now on a playing ground with [ICE] that I can coordinate and I can be aware of activities."',
      why: 'The agreements and Smith\'s own explanation are a verifiable, first-person record of how he defines Utah County\'s cooperation with federal immigration enforcement — one of the most contested decisions of his tenure, adopted over unanimous opposition from the speakers at the hearing. It lets a reader weigh his stated limits (no raids, jail-based transfers) against how the authority is actually used.',
      source: { label: 'KSL — "Utah County OKs plans to bolster cooperation with immigration officials despite heavy opposition" (Jul 16, 2025)', url: 'https://www.ksl.com/article/51347013/utah-county-oks-plans-to-bolster-cooperation-with-immigration-officials-despite-heavy-opposition' } },

    { date: 'May 2026', issueKey: 'immigration_reform', impact: 'neutral', category: 'statement',
      tags: ['Public Statements'], sourceType: 'statement',
      headline: 'Smith reaffirms the ICE partnership, calling it "a seat at the table"',
      facts: 'In May 2026, amid continued public pushback, Sheriff Mike Smith reaffirmed his support for the 287(g) agreement. Asked whether cancelling the contract would be better, he answered "Absolutely not," arguing that the problems seen with ICE in other cities largely stemmed from local law enforcement declining to cooperate. He framed the arrangement as oversight rather than expansion — that formalizing it gives his office "a seat at the table" and keeps enforcement aligned with "Utah County values," adding "we\'re not doing ICE\'s job" — while repeating that he does not envision the office joining worksite or labor raids.',
      why: 'Smith\'s reaffirmation a year on is a verifiable, first-person record of how he continues to justify the partnership under sustained local opposition — useful for judging the consistency of his stated limits over time.',
      source: { label: 'Daily Herald — "Utah County Sheriff Mike Smith reaffirms support for agreement with ICE" (May 14, 2026)', url: 'https://www.heraldextra.com/news/2026/may/14/utah-county-sheriff-mike-smith-reaffirms-support-for-agreement-with-ice/' } },
  ],
};

// ── Idempotent append (dry-run by default) ──────────────────────────────────
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

let totalNew = 0, touched = 0;
const issueTally = {};

for (const [id, items] of Object.entries(PLAN)) {
  const doc = await getDoc(id);
  if (!doc) { console.log(`!! MISSING doc: ${id} (skipped)`); continue; }
  const existing = Array.isArray(doc.spotlight) ? doc.spotlight : [];
  const seen = new Set(existing.map(s => hk(s.headline || s.title)));
  const toAdd = items.filter(it => !seen.has(hk(it.headline)));
  if (!toAdd.length) { console.log(`= ${id}: nothing new (${existing.length} existing)`); continue; }
  touched++;
  toAdd.forEach(it => {
    totalNew++;
    if (it.issueKey) issueTally[it.issueKey] = (issueTally[it.issueKey] || 0) + 1;
  });
  const merged = existing.concat(toAdd);
  console.log(`+ ${id} (${doc.name || id}): +${toAdd.length} item(s) [${existing.length} -> ${merged.length}]`);
  toAdd.forEach(it => console.log(`    • ${it.headline}  #${it.issueKey}  (Moderate)`));
  if (APPLY) {
    await patchSpotlight(id, doc.__fields, merged);
    console.log('    ✓ written');
  }
}

console.log('\n──────── summary ────────');
console.log(`profiles touched      : ${touched}`);
console.log(`new evidence items    : ${totalNew}`);
console.log('issue tally           :', Object.entries(issueTally).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(', '));
console.log('excluded (see header) : Washington County (Brooksby resigned; not in roster), Utah DOC (agency, no individual), Weber (already covered)');
console.log(APPLY ? '\nAPPLIED to Firestore.' : '\nDRY RUN — re-run with --apply to write.');
