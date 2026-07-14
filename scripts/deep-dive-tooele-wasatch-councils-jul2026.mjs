#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Tooele & Wasatch COUNCIL depth (July 2026)
//
// Adds depth to the thin county-council tier in two counties that already have a
// built ANCHOR fight but 1-2-card council stubs around it:
//   • TOOELE  — anchor: the Grantsville "Six Mile Ranch" annexation (Mayor Heidi
//     Hammond, built in Batch 5). This pass ties the COUNTY tier to that fight and
//     records the council's contrasting fiscal posture.
//   • WASATCH — anchor: the Heber North Fields / Heber Valley bypass fight (Mayor
//     Heidi Franco, built in Batch 5). This pass records the county council's own
//     defining 2026 fight — the state "preliminary municipality" (new-town) law that
//     lets developers incorporate around local government, squarely on the bypass/
//     North Fields terrain.
//
// This is an ENRICHMENT pass, NOT a create pass. Every target already exists as a
// thin stub; the batch appends sourced spotlight receipts + merges stance keys
// (non-destructive: never clobbers existing fields, dedupes receipts by headline),
// and the mirrored stance cards are appended BY HAND to each official's existing
// ISSUE_STANCE_DATA array (the --emit output prints exactly what to paste where).
//
// BUILT THIS PASS (only where a real, individually-sourced position exists):
//   • mark_nelson_wasatch  — Council (Midway / North Fields seat). The clearest
//     council voice on the 2024 "preliminary municipality" law: at a June 3, 2026
//     meeting he questioned whether the law was designed so surrounding towns
//     "would not agree," i.e. to let developers bypass local government; the county's
//     own fix (HB510) failed in the 2026 session. Directly on the North Fields/
//     bypass anchor.                                                      → ENRICH
//   • tye_hoffmann_tooele  — Council (District 3). The council member who carried the
//     county's position into the Erda/Grantsville "Six Mile" annexation litigation —
//     reading a county statement at the Jan. 2025 Erda City Council meeting and
//     keeping Tooele County out of the residents' suit. Ties the council to the
//     Batch 5 annexation anchor.                                          → ENRICH
//   • jared_hamner_tooele  — Council CHAIR (District 4). The fiscal counterpoint to
//     Grantsville's growth-by-annexation bet: the council he chairs adopted a 2025
//     budget with NO county property-tax-rate increase while cutting ~$7M from the
//     general fund.                                                       → ENRICH
//
// HONEST GAPS (tracked here, NOT built — no fabrication):
//   • Wasatch council members Erik Rowland (Chair) and Luke Searle (Vice Chair): no
//     individually-sourced position on the North Fields / bypass / new-town fight was
//     found for this pass — named, not stubbed.
//   • Wasatch council member Spencer Park has one strong sourced line on the new-town
//     law ("a Trojan horse for a lot of bills that don't make any sense"), but a
//     single quote is below the 3-5-card bar for a fresh profile. Tracked as a strong
//     future-build candidate, not stubbed on one quote.
//   • Tooele council members Scott Wardle (Vice Chair, D1), Kendall Thomas (D2), and
//     Erik Stromberg (D5), and Sheriff Paul Wimmer: no defining, individually-sourced
//     current controversy surfaced this pass. Named, not stubbed.
//   • The 2025 TOOELE property-tax increase was the SCHOOL DISTRICT's (a separate
//     elected board, 5-2), NOT the county council's — so it is not attributed to any
//     council member here. Recorded as context, not fabricated onto the council.
//   • WASATCH held property taxes flat for both 2025 and 2026; that is the county's
//     collective/staff-framed record (via the county manager), not an individual
//     council member's sourced stance, so it is carried as context, not a stance.
//   • The Six Mile annexation is Grantsville-vs-Erda-vs-Lt.-Governor; Tooele County's
//     formal role ran through the (appointed) Boundary Commission, so only the council
//     member actually quoted (Hoffmann) is enriched — the body's vote is context.
//
// Honesty rules (CONTENT_STYLE.md + EVIDENCE_STRENGTH.md):
//   • Nothing invented; every receipt carries a real {label,url} source surfaced in
//     research (KPCW, Park Record, Salt Lake Tribune, KSL, Tooele Transcript Bulletin).
//   • Individual lens, not party bloc. County council seats here are partisan; each
//     record is written to the individual's own conduct and quoted words.
//   • Attribution discipline: the new-town law is a 2024 state statute; HB510's
//     failure is the county's; the flat 2025 Tooele budget is the council's collective
//     action under Hamner's chairmanship (phrased as such, not as a personal quote);
//     the Six Mile annexation acreage/rulings are plain facts.
//   • Idempotent & non-destructive: re-fetches each doc; appends only missing receipts
//     and stance keys.
//
//   node scripts/deep-dive-tooele-wasatch-councils-jul2026.mjs            # dry run
//   node scripts/deep-dive-tooele-wasatch-councils-jul2026.mjs --emit     # print stance cards to paste
//   node scripts/deep-dive-tooele-wasatch-councils-jul2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const STAMP = '2026-07-14T00:00:00.000Z';

// Shared sources (verified during research).
const SRC = {
  // Wasatch — new-town / preliminary-municipality / bypass
  kpcw_newtowns: { label: 'KPCW', url: 'https://www.kpcw.org/wasatch-county/2026-06-04/wasatch-county-leaders-worry-about-future-towns-as-bear-canyon-files-revised-application' },
  pr_hb510:      { label: 'Park Record', url: 'https://www.parkrecord.com/2026/03/20/wasatch-county-left-without-sway-in-new-incorporations-after-bill-fails/' },
  kpcw_2towns:   { label: 'KPCW', url: 'https://www.kpcw.org/wasatch-county/2026-02-17/one-proposed-wasatch-county-town-can-move-forward-another-must-wait' },
  sltrib_riverview:{ label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/2024/09/20/wasatch-countys-north-fields-could/' },
  // Tooele — Six Mile annexation + county budget
  too_budget:    { label: 'Tooele Transcript Bulletin', url: 'https://www.tooeleonline.com/articles/news/tooele-county-council-approves-2025-budget/' },
  too_erda_suit: { label: 'Tooele Transcript Bulletin', url: 'https://www.tooeleonline.com/articles/news/erda-city-council-votes-to-join-lawsuit-challenging-annexations-out-of-erda-into-grantsville/' },
  ksl_grantsville:{ label: 'KSL', url: 'https://www.ksl.com/article/51443638/after-years-of-disputes-grantsville-files-lawsuit-against-lieutenant-governor-to-finalize-annexation' },
};

// ── Curated, sourced enrichment data (keyed by existing Firestore doc id) ─────
const DATA = {
  // ══════════ Mark Nelson — Wasatch County Council (Midway / North Fields) ══════════
  mark_nelson_wasatch: {
    enrich: true,
    name: 'Mark Nelson',
    addSpotlight: [
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'], issueKey: 'gov_balance',
        headline: "Questioned the state 'new-town' law as a way to bypass local government",
        facts: "At a June 3, 2026 council meeting on two 'preliminary municipality' applications (Wasatch Highlands, east of Heber, and Bear Canyon, near the Utah County border), Nelson pressed whether the 2024 state law — which lets as few as three landowners begin incorporating a town in unincorporated areas — was designed to route developers around surrounding communities: 'Do you think that this bill was created with the idea in mind that the municipalities surrounding this would not agree with the creation of this?' The county manager described the tool as 'specifically usurping your land use authority.'",
        why: "Puts the council's central 2026 land-use fight on the record in his own words — the same terrain (North Fields, the bypass corridor) as the county's anchor growth fight.",
        source: SRC.kpcw_newtowns },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'], issueKey: 'gov_balance',
        headline: "County's fix (HB510) failed, leaving little say over new towns",
        facts: "Utah allows only two preliminary-municipality applications to proceed per year; for 2026 both were in Wasatch County. HB510, which would have modified the incorporation process to give the county more influence, failed in the 2026 general session — leaving Wasatch County, as Park Record put it, 'without sway in new incorporations.' The disputed sites sit on the North Fields / bypass terrain the county has fought to protect.",
        why: "Records the concrete outcome behind the council's alarm — the legislative loss that left the fight unresolved on the anchor's turf.",
        source: SRC.pr_hb510 },
    ],
    addStances: {
      'Growth, Housing & Land Use': "Warns the 2024 state 'preliminary municipality' law lets developers incorporate new towns around local government on the North Fields / bypass terrain — 'municipalities surrounding this would not agree' — after the county's fix (HB510) failed in 2026.",
    },
    stanceCards: [
      { topic: "'New-Town' Law vs. Local Control", icon: '🏘', pos: 'oppose', issueKey: 'gov_balance', issueStance: 'oppose', text: "Questioned whether the 2024 'preliminary municipality' law was built so surrounding towns 'would not agree' — letting developers bypass local government on the North Fields/bypass terrain; the county's fix (HB510) failed in 2026.", source: SRC.kpcw_newtowns },
    ],
  },

  // ══════════ Tye Hoffmann — Tooele County Council (District 3) ══════════
  tye_hoffmann_tooele: {
    enrich: true,
    name: 'Tye Hoffmann',
    addSpotlight: [
      { impact: 'neutral', category: 'transparency', date: '2025', tags: ['Notable Actions'], issueKey: 'lands_local',
        headline: "Carried the county's position into the Six Mile annexation fight",
        facts: "As the Grantsville 'Six Mile Ranch' annexation (~7,800-8,000 acres near SR-112/138, inside Erda's incorporation boundary) headed to court, Hoffmann read a statement from Tooele County at an Erda City Council meeting. Erda's resolution to join the residents' lawsuit was written to challenge only the constitutionality of the annexation statutes — expressly 'not taking any action against Tooele County' or its officials. The Utah Supreme Court affirmed dismissal of the annexation challenge on Nov. 20, 2025, and Grantsville later sued the lieutenant governor to force certification.",
        why: "Ties the county council directly to the Batch 5 annexation anchor and shows the council member's role — keeping the county out of the residents' suit while the boundary fight played out.",
        source: SRC.too_erda_suit },
    ],
    addStances: {
      'Local Government Transparency & Accountability': "Carried Tooele County's position into the Grantsville 'Six Mile' annexation litigation, reading a county statement at the Erda City Council as residents fought the ~7,800-acre annexation the state courts ultimately let stand.",
    },
    stanceCards: [
      { topic: 'Six Mile Annexation: County Line', icon: '📜', pos: 'mixed', issueKey: 'lands_local', issueStance: 'mixed', text: "Read Tooele County's statement into the Grantsville 'Six Mile' annexation fight — Erda's suit challenged the annexation statutes but 'not … Tooele County'; the Utah Supreme Court affirmed dismissal Nov. 2025.", source: SRC.too_erda_suit },
    ],
  },

  // ══════════ Jared Hamner — Tooele County Council (Chair, District 4) ══════════
  jared_hamner_tooele: {
    enrich: true,
    name: 'Jared Hamner',
    addSpotlight: [
      { impact: 'positive', category: 'voting', date: '2024', tags: ['Notable Actions'], issueKey: 'property_tax',
        headline: "Chaired a 2025 county budget with no property-tax-rate increase",
        facts: "The Tooele County Council Hamner chairs adopted its 2025 budget on Dec. 3, 2024 with no increase to any county property-tax rate over the certified rates, and cut general-fund expenses by roughly $7 million (all-funds spending falling to ~$131M from ~$145M), while still funding a 2.5% cost-of-living adjustment and a 1.5% merit increase for employees. (The county's separately-elected school board approved its own 8.06% property-tax increase that year — not the council's.)",
        why: "Records the council's fiscal-restraint posture — the deliberate counterpoint to Grantsville's grow-by-annexation revenue bet in the same county.",
        source: SRC.too_budget },
    ],
    addStances: {
      'Property Taxes & County Budget': "As council chair, oversaw a 2025 county budget with no property-tax-rate increase and ~$7M in general-fund cuts — a fiscal-restraint posture distinct from the county's growth-by-annexation and school-district tax fights.",
    },
    stanceCards: [
      { topic: 'Held County Tax Rates Flat', icon: '🏛', pos: 'support', issueKey: 'property_tax', issueStance: 'support', text: "As chair, oversaw a 2025 county budget with no property-tax-rate increase and ~$7M in general-fund cuts (spending down to ~$131M from ~$145M) — the county-tier fiscal counterpoint to Grantsville's annexation growth bet.", source: SRC.too_budget },
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
  out.push('    // ── Tooele & Wasatch council depth · July 2026 (ENRICH — paste each card into the');
  out.push('    //    named official\'s EXISTING ISSUE_STANCE_DATA array; do NOT create new keys) ──');
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
  console.log(`PolitiDex — Tooele & Wasatch council depth (ENRICH)  [${APPLY ? 'APPLY' : EMIT ? 'EMIT' : 'DRY RUN'}]\n`);

  // Validate every issueKey against the live ISSUE_MAP vocabulary (in alignment-tool.js).
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
    const f = '/tmp/tooele-wasatch-councils-stance-cards.txt';
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
