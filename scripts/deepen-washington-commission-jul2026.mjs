#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Washington County Commission depth (July 2026)
//
// Washington County (St. George) already carries a built commission tier — Chair
// Adam Snow, Victor Iverson, and Gil Almquist each have sourced stance cards, on top
// of the St. George growth/water anchor (Mayor Jimmie Hughes, Batch 5). What those
// records lacked was the county's DEFINING 2026 turn: at the April 2026 State of the
// County, commissioners said HOUSING affordability has overtaken WATER as the top
// concern, while leaning hard on a low-tax identity (debt-free; taxes flat 16 years) —
// and the June 2026 GOP primary turned into a referendum on that growth record.
//
// This is an ENRICHMENT pass, NOT a create pass. Each target already exists; the batch
// appends sourced spotlight receipts + merges stance keys (non-destructive: dedupes
// receipts by headline, never clobbers). Mirrored stance cards are appended BY HAND to
// each official's existing ISSUE_STANCE_DATA array (--emit prints what to paste).
//
// BUILT THIS PASS (each tied to the St. George growth anchor, individually sourced):
//   • adam_snow_washco     — Chair. Called housing "at least as critical as water, if
//     not a little bit more so," and touts the "lowest tax county in the state."→ ENRICH
//   • victor_iverson_washco— Seat B. "Maintain taxes for the sixteenth year in a row";
//     already carries a card on trailing in the 2026 primary — this adds the flat-tax
//     record that primary was fought over.                                → ENRICH
//   • gil_almquist_washco  — Named housing "the biggest obstacle" and the county
//     "debt-free" (final GO bond paid), then fended off primary challenger Bill Hoster
//     in a race over taxes, transparency, tourism and spending.           → ENRICH
//
// HONEST GAPS (tracked here, NOT built — no fabrication):
//   • Bill Hoster (Almquist's 2026 GOP challenger) has sourced debate positions on
//     taxes/transparency/tourism, but as a challenger with only debate-level sourcing
//     he is tracked as a build-once-more-sourcing-lands candidate, not stubbed.
//   • The 2026 primary OUTCOMES are live: Iverson was trailing and Almquist fended off
//     Hoster as of the June 25 count — recorded as the state of the race, to be updated
//     to a final result later rather than asserted as settled.
//   • Washington City (Mayor Kress Staheli) and the interim sheriff (Barry Golding)
//     already have records and are outside this commission-depth pass.
//
// Honesty rules (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md):
//   • Nothing invented; every receipt carries a real {label,url} source surfaced in
//     research (St. George News / stgeorgeutah.com, Salt Lake Tribune).
//   • Individual lens, not party bloc; each quote is attributed to the commissioner
//     who said it at the April 2026 State of the County address.
//   • Attribution discipline: the housing-over-water shift and the 16-year/debt-free
//     tax record are the commissioners' own statements; the primary standings are the
//     June 25 count, stated as such.
//   • Idempotent & non-destructive: re-fetches each doc; appends only missing receipts
//     and stance keys.
//
//   node scripts/deepen-washington-commission-jul2026.mjs            # dry run
//   node scripts/deepen-washington-commission-jul2026.mjs --emit     # print stance cards to paste
//   node scripts/deepen-washington-commission-jul2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const STAMP = '2026-07-14T00:00:00.000Z';

// Shared sources (verified during research).
const SRC = {
  stg_soc:      { label: 'St. George News', url: 'https://www.stgeorgeutah.com/news/housing-now-rivals-water-as-top-concern-washington-county-leaders-say-at-annual-address/article_7a36e7e8-4052-4740-a3e2-5482a89d8350.html' },
  sltrib_prim:  { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/2026/06/25/washington-county-commission/' },
};

// ── Curated, sourced enrichment data (keyed by existing Firestore doc id) ─────
const DATA = {
  // ══════════ Adam Snow — Washington County Commission (Chair) ══════════
  adam_snow_washco: {
    enrich: true,
    name: 'Adam Snow',
    addSpotlight: [
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'housing_build',
        headline: "Says housing is now 'at least as critical as water'",
        facts: "At the April 2026 State of the County, Snow said housing affordability has become as pressing as the county's signature water challenge — 'at least as critical as water, if not a little bit more so' — citing the complexity of the issue in one of the nation's fastest-growing regions.",
        why: "Marks the defining shift in the county's agenda — from a water-first to a housing-and-water frame — from the chair himself.",
        source: SRC.stg_soc },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'property_tax',
        headline: "Touts the 'lowest tax county in the state'",
        facts: "Snow leaned on the county's low-tax identity, saying it is the 'lowest tax county in the state … doing more with fewer dollars, making them stretch further than any other county, and not by a little bit, by far,' the fiscal frame the commission carried into the 2026 election.",
        why: "The county's core fiscal claim in the chair's words — the standard its growth-era budgets can be measured against.",
        source: SRC.stg_soc },
    ],
    addStances: {
      'Growth, Housing & Land Use': "As chair, reframed housing affordability as 'at least as critical as water' at the 2026 State of the County — marking the county's shift from a water-first agenda amid rapid growth.",
    },
    stanceCards: [
      { topic: 'Housing Rivals Water', icon: '🏠', pos: 'mixed', issueKey: 'housing_build', issueStance: 'mixed', text: "Said housing affordability is now 'at least as critical as water, if not a little bit more so' at the 2026 State of the County — the county's defining agenda shift amid explosive growth.", source: SRC.stg_soc },
      { topic: "'Lowest Tax County in the State'", icon: '💵', pos: 'support', issueKey: 'property_tax', issueStance: 'support', text: "Touts Washington as the 'lowest tax county in the state … doing more with fewer dollars … and not by a little bit, by far' — the fiscal identity carried into the 2026 election.", source: SRC.stg_soc },
    ],
  },

  // ══════════ Victor Iverson — Washington County Commission (Seat B) ══════════
  victor_iverson_washco: {
    enrich: true,
    name: 'Victor Iverson',
    addSpotlight: [
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'property_tax',
        headline: "'Sixteenth year in a row' without a tax increase",
        facts: "At the April 2026 State of the County, Iverson framed the county's fiscal restraint as a discipline that mirrors households: 'families are making tough choices to balance their budgets … we believe the county government should do no less. That's why we are proud to maintain taxes for the sixteenth year in a row — keeping costs down without sacrificing service.'",
        why: "The record the 2026 primary was fought over — the flat-tax streak Iverson ran on as his seat drew a serious challenge.",
        source: SRC.stg_soc },
    ],
    addStances: {
      'Property Taxes & County Budget': "Ran on the county holding property taxes flat for a 'sixteenth year in a row … without sacrificing service' — the fiscal-restraint record at the center of his contested 2026 primary.",
    },
    stanceCards: [
      { topic: '16 Years Without a Tax Hike', icon: '💵', pos: 'support', issueKey: 'property_tax', issueStance: 'support', text: "Touts the county holding property taxes flat for 'the sixteenth year in a row — keeping costs down without sacrificing service' — the record his contested 2026 primary was fought over.", source: SRC.stg_soc },
    ],
  },

  // ══════════ Gil Almquist — Washington County Commission ══════════
  gil_almquist_washco: {
    enrich: true,
    name: 'Gil Almquist',
    addSpotlight: [
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'housing_build',
        headline: "Calls housing 'the biggest obstacle' facing the county",
        facts: "In the April 2026 State of the County Q&A, Almquist named housing as the county's top challenge for the year ahead — 'the biggest obstacle, probably housing' — citing rising costs and limited availability, and separately noting the county is now 'debt-free' after making the final payment on its last general-obligation bond.",
        why: "Puts the growth-era priority and the debt-free fiscal claim on the record in his own words.",
        source: SRC.stg_soc },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'gov_transparency',
        headline: "Fended off a growth-fueled 2026 primary challenge",
        facts: "In a Republican primary shaped by the county's rapid expansion, Almquist and challenger Bill Hoster clashed over taxes, transparency, tourism and spending. As of the June 25, 2026 count, Almquist fended off the challenge (while fellow incumbent Victor Iverson was trailing in his own race) — a contest that turned the commission's growth-and-taxes record into the ballot question.",
        why: "Shows the growth record being tested at the ballot box — accountability on the commission's low-tax, high-growth posture.",
        source: SRC.sltrib_prim },
    ],
    addStances: {
      'Growth, Housing & Land Use': "Named housing 'the biggest obstacle' facing the county at the 2026 State of the County, and touts a now 'debt-free' county — a growth-and-fiscal record he defended against a primary challenger over taxes and transparency.",
    },
    stanceCards: [
      { topic: 'Housing the Biggest Obstacle', icon: '🏠', pos: 'mixed', issueKey: 'housing_build', issueStance: 'mixed', text: "Named housing 'the biggest obstacle, probably' facing the county at the 2026 State of the County, citing rising costs and limited availability — and noted the county is now 'debt-free.'", source: SRC.stg_soc },
      { topic: 'Fended Off Primary Challenge', icon: '🗳', pos: 'mixed', issueKey: 'gov_transparency', issueStance: 'mixed', text: "In a growth-shaped 2026 GOP primary, clashed with challenger Bill Hoster over taxes, transparency, tourism and spending and fended off the challenge as of the June 25 count (as incumbent Iverson trailed).", source: SRC.sltrib_prim },
    ],
  },
};

// ── Firestore value encode/decode ────────────────────────────────────────────
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') { const f = {}; for (const [k, val] of Object.entries(v)) f[k] = enc(val); return { mapValue: { fields: f } }; }
  throw new Error('cannot encode value: ' + String(v));
}
function dec(v) {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(dec);
  if (v.mapValue !== undefined) { const o = {}; for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = dec(val); return o; }
  return null;
}

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
  const qs = '?' + Object.keys(fields).map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}${qs}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

// ── Emit the stance cards to paste into each official's existing array ────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emitBlock() {
  const out = [];
  out.push('    // ── Washington County commission depth · July 2026 (ENRICH — paste each card into');
  out.push('    //    the named official\'s EXISTING ISSUE_STANCE_DATA array; do NOT create new keys) ──');
  for (const [id, plan] of Object.entries(DATA)) {
    if (!plan.stanceCards || !plan.stanceCards.length) continue;
    out.push(`    // → APPEND to existing ${id}: [ … ]  (${plan.name})`);
    for (const c of plan.stanceCards) {
      const parts = [`topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`, `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`];
      if (c.source) parts.push(`source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`);
      out.push(`      { ${parts.join(', ')} },`);
    }
  }
  return out.join('\n');
}

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`PolitiDex — Washington County commission depth (ENRICH)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);

  try {
    const js = (await import('fs')).readFileSync('alignment-tool.js', 'utf8');
    const mapSlice = js.slice(js.indexOf('var ISSUE_MAP = {'), js.indexOf('try { window.ISSUE_MAP'));
    const valid = new Set([...mapSlice.matchAll(/^\s+([a-z_]+):\s*\{\s*label:/gm)].map((m) => m[1]));
    let bad = 0;
    for (const plan of Object.values(DATA)) {
      for (const c of (plan.stanceCards || [])) if (!valid.has(c.issueKey)) { console.log(`  ⚠ ${plan.name}: unknown stanceCard issueKey '${c.issueKey}'`); bad++; }
      for (const it of (plan.addSpotlight || [])) if (it.issueKey && !valid.has(it.issueKey)) { console.log(`  ⚠ ${plan.name}: unknown spotlight issueKey '${it.issueKey}'`); bad++; }
    }
    console.log(bad ? `\n  ✗ ${bad} invalid issueKey(s) — fix before applying.\n` : `  ✓ all issueKeys valid against ISSUE_MAP (${valid.size} keys)\n`);
    if (bad && APPLY) process.exit(1);
  } catch (e) { console.log(`  (issueKey validation skipped: ${e.message})`); }

  if (EMIT) {
    const f = '/tmp/washington-commission-stance-cards.txt';
    writeFileSync(f, emitBlock());
    console.log(`Wrote stance cards to paste → ${f}\n`);
  }

  let enriched = 0, totSpot = 0, totStance = 0;

  for (const [id, plan] of Object.entries(DATA)) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); continue; }
    if (!doc) { console.log(`  ⚠ ${id} (${plan.name}): expected to exist for enrichment but not found — skipping`); continue; }

    const existingSpot = Array.isArray(doc.spotlight) ? doc.spotlight : [];
    const haveHeadlines = new Set(existingSpot.map((s) => s && s.headline));
    const toAdd = (plan.addSpotlight || []).filter((s) => !haveHeadlines.has(s.headline));
    const mergedStances = { ...(doc.stances || {}) };
    let stanceAdds = 0;
    for (const [k, v] of Object.entries(plan.addStances || {})) if (!(k in mergedStances)) { mergedStances[k] = v; stanceAdds++; }
    totSpot += toAdd.length; totStance += stanceAdds;
    console.log(`  ${APPLY ? '✎' : '→'} ENRICH ${id} (${plan.name}) · +${toAdd.length} receipt(s), +${stanceAdds} stance(s) [non-destructive]`);
    if (APPLY && (toAdd.length || stanceAdds)) {
      await patch(id, { spotlight: existingSpot.concat(toAdd), stances: mergedStances, updatedAt: STAMP });
    }
    enriched++;
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${enriched} enriched · ${totSpot} receipt(s), ${totStance} stance(s).`);
  if (!APPLY) console.log('\nRe-run with --emit to print the stance cards to paste, --apply to write Firestore.');
})();
