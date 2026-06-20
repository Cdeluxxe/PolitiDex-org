#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 Spotlight issueKey backfill
//
// Lights up the connected-evidence system across the whole Spotlight library.
// Until now only the newest Spotlight items carried an `issueKey`, so most of
// the pre-existing Spotlight layer was invisible to window._issueEvidenceMap
// (which groups a politician's Issue Positions + Promises + Spotlight by the
// SHARED ISSUE_MAP vocabulary, and only includes items that carry an issueKey).
//
// This pass tags the existing Spotlight items for the 40 CURRENT SITTING Utah
// State Legislators across BOTH spotlight layers the evidence map reads:
//   • SPOTLIGHT_DATA  — curated news items (date/headline/facts/why)
//   • ACCT_SPOTLIGHT  — integrity drivers (impact/category/headline/facts/why)
//
// Every key below is drawn from the politician's OWN documented record and,
// wherever possible, reuses the exact ISSUE_MAP key that politician already
// uses for the matching Issue Position or Promise — so a Spotlight item lines
// up one-to-one with the stance it backs or complicates. Nothing is invented.
//
// HONESTY: Spotlight items whose subject is purely standing/biography/conduct
// (peer-elected to leadership, repeated re-election, "accessible in public",
// graceful concession, barrier-breaking firsts, a thrown-out subpoena) have NO
// policy-issue subject and are deliberately LEFT UNTAGGED rather than forced
// into an issue. They stay out of the evidence map by design.
//
// Idempotent: an item that already carries an issueKey is left untouched.
// Targets are addressed by (layer, base spotlight key, array index) — the same
// order window._issueEvidenceMap iterates.
//
//   node scripts/backfill-spotlight-issuekeys-jun2026.mjs --patch
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'fs';

const HTML = 'index.html';
const PATCH = process.argv.includes('--patch');

// layer: 'SL' = SPOTLIGHT_DATA, 'ACCT' = ACCT_SPOTLIGHT
// key:   the base key the item is stored under in that layer
// idx:   0-based position in that key's array
// issueKey: primary ISSUE_MAP key for the item
const TARGETS = [
  // ── Luz Escamilla (lescamilla) ──
  { layer:'SL',   key:'lescamilla', idx:1, issueKey:'public_schools' },     // voucher vote vs public schools
  { layer:'ACCT', key:'lescamilla', idx:1, issueKey:'immigration_reform' }, // first immigrant/Latina, immigrant-rights work
  { layer:'ACCT', key:'lescamilla', idx:2, issueKey:'climate_action' },     // Inland Port vote + west-side air/impact bill
  // ── Evan Vickers (evickers) ──
  { layer:'SL',   key:'evickers', idx:1, issueKey:'health_rural' },         // rural priorities incl. rural healthcare access
  { layer:'ACCT', key:'evickers', idx:1, issueKey:'health_drug_prices' },   // pharmacy/drug-policy conflict question
  { layer:'ACCT', key:'evickers', idx:2, issueKey:'health_drug_prices' },   // opioid-prescribing limits
  { layer:'ACCT', key:'evickers', idx:3, issueKey:'health_rural' },         // Cedar City roots behind rural-health focus
  // ── Mike Schultz (mschultz) ──
  { layer:'SL',   key:'mschultz', idx:1, issueKey:'housing_build' },        // zoning reform to ease housing costs
  { layer:'ACCT', key:'mschultz', idx:1, issueKey:'rights_balance' },       // HB261 DEI / HB257 facilities agenda
  { layer:'ACCT', key:'mschultz', idx:2, issueKey:'democracy_balance' },    // Amendment D ballot-initiative power
  // ── Angela Romero (aromero) ──
  { layer:'SL',   key:'aromero', idx:0, issueKey:'justice_reform' },        // rape-kit backlog reform
  { layer:'SL',   key:'aromero', idx:1, issueKey:'pro_choice' },            // pushback on abortion limits (lead)
  { layer:'ACCT', key:'aromero', idx:1, issueKey:'justice_reform' },        // rape-kit backlog campaign
  { layer:'ACCT', key:'aromero', idx:3, issueKey:'justice_reform' },        // domestic-violence / sexual-assault reform
  // ── Todd Weiler (tweiler) ──
  { layer:'SL',   key:'tweiler', idx:1, issueKey:'justice_balance' },       // criminal & family / child-protection law
  { layer:'ACCT', key:'tweiler', idx:0, issueKey:'tech_balance' },          // internet-safety / age-verification focus
  { layer:'ACCT', key:'tweiler', idx:2, issueKey:'tech_balance' },          // porn public-health resolution (online-harms lane)
  // ── Daniel McCay (dmccay) ──
  { layer:'ACCT', key:'dmccay', idx:0, issueKey:'pro_life' },               // 2020 abortion trigger ban
  { layer:'ACCT', key:'dmccay', idx:1, issueKey:'democracy_balance' },      // SB54 ballot-access compromise
  { layer:'ACCT', key:'dmccay', idx:2, issueKey:'pro_life' },               // signaled six-week limit
  // ── Kirk Cullimore (kcullimore) ──
  { layer:'SL',   key:'kcullimore', idx:0, issueKey:'tech_balance' },       // minors' social-media + data-privacy rules
  { layer:'SL',   key:'kcullimore', idx:1, issueKey:'econ_smallbiz' },      // business-law & growth for small business
  { layer:'ACCT', key:'kcullimore', idx:0, issueKey:'privacy_rights' },     // Utah Consumer Privacy Act
  { layer:'ACCT', key:'kcullimore', idx:1, issueKey:'tech_balance' },       // minor social-media protections
  { layer:'ACCT', key:'kcullimore', idx:2, issueKey:'housing_support' },    // landlord-tenant law vs eviction practice (renters)
  // ── Wayne Harper (wharper) ──
  { layer:'ACCT', key:'wharper', idx:1, issueKey:'transit' },               // decades-long transportation focus
  // ── Jerry Stevenson (jstevenson) ──
  { layer:'SL',   key:'jstevenson', idx:0, issueKey:'transit' },            // FrontRunner extension promise
  { layer:'ACCT', key:'jstevenson', idx:0, issueKey:'gov_balance' },        // budget restraint vs budgets that outgrow caps
  { layer:'ACCT', key:'jstevenson', idx:1, issueKey:'gov_balance' },        // co-chairs Executive Appropriations
  { layer:'ACCT', key:'jstevenson', idx:2, issueKey:'strong_defense' },     // Hill Air Force Base advocacy
  { layer:'ACCT', key:'jstevenson', idx:3, issueKey:'gov_balance' },        // budget growth past stated restraint
  // ── Ann Millner (amillner) ──
  { layer:'SL',   key:'amillner', idx:0, issueKey:'edu_college_cost' },     // higher-ed / Talent Ready workforce
  { layer:'SL',   key:'amillner', idx:1, issueKey:'edu_college_cost' },     // healthcare-workforce / higher-ed budget
  { layer:'ACCT', key:'amillner', idx:0, issueKey:'edu_college_cost' },     // 20-yr education-workforce throughline
  { layer:'ACCT', key:'amillner', idx:1, issueKey:'edu_college_cost' },     // led Weber State, stepped down as planned
  { layer:'ACCT', key:'amillner', idx:2, issueKey:'edu_college_cost' },     // Senate focus mirrors higher-ed career
  { layer:'ACCT', key:'amillner', idx:3, issueKey:'econ_growth' },          // Northern Utah economic development
  // ── Scott Sandall (ssandall) ──
  { layer:'SL',   key:'ssandall', idx:0, issueKey:'water' },                // secondary-water metering / Great Salt Lake
  { layer:'SL',   key:'ssandall', idx:1, issueKey:'rural_ag' },             // rural growth / USU / broadband / farmland
  { layer:'ACCT', key:'ssandall', idx:0, issueKey:'water' },                // farmer water law + Lake Commissioner
  { layer:'ACCT', key:'ssandall', idx:1, issueKey:'water' },                // Great Salt Lake mineral-extraction deal
  { layer:'ACCT', key:'ssandall', idx:2, issueKey:'rural_ag' },             // ag-economics / Farm Bureau / natural resources
  // ── Nate Blouin (blouin_s13) ──
  { layer:'ACCT', key:'blouin_s13', idx:0, issueKey:'gov_transparency' },   // disclosure standard on Senate President
  { layer:'ACCT', key:'blouin_s13', idx:1, issueKey:'climate_action' },     // clean-energy professional / clean-energy policy
  { layer:'ACCT', key:'blouin_s13', idx:2, issueKey:'climate_action' },     // files clean-energy / air-quality bills
  // ── Keith Grover (kgrover) ──
  { layer:'SL',   key:'kgrover', idx:0, issueKey:'edu_balance' },           // school & election policy (education lead)
  { layer:'ACCT', key:'kgrover', idx:0, issueKey:'rights_balance' },        // Senate sponsor anti-DEI HB261
  { layer:'ACCT', key:'kgrover', idx:1, issueKey:'rights_balance' },        // protect race-specific programs within HB261
  // ── Mike McKell (mckell_s25) ──
  { layer:'ACCT', key:'mckell_s25', idx:0, issueKey:'tech_balance' },       // minor social-media laws
  { layer:'ACCT', key:'mckell_s25', idx:1, issueKey:'health_mental' },      // civil-justice / mental-health / consumer
  { layer:'ACCT', key:'mckell_s25', idx:2, issueKey:'tech_balance' },       // defended/revised social-media statutes
  // ── Val Peterson (valpeterson_h56) ──
  { layer:'ACCT', key:'valpeterson_h56', idx:0, issueKey:'edu_college_cost' }, // higher-ed budgets / UVU VP conflict
  { layer:'ACCT', key:'valpeterson_h56', idx:1, issueKey:'edu_college_cost' }, // capital funds to Utah County campuses
  // ── Steve Eliason (seliason) ──
  { layer:'ACCT', key:'seliason', idx:0, issueKey:'health_mental' },        // decade toward 988 crisis line
  { layer:'ACCT', key:'seliason', idx:1, issueKey:'gun_balance' },          // gun-owner consensus / safe storage
  { layer:'ACCT', key:'seliason', idx:2, issueKey:'gun_balance' },          // voluntary firearm "do not sell" list
  // ── Jordan Teuscher (jteuscher) ──
  { layer:'SL',   key:'jteuscher', idx:1, issueKey:'lower_taxes' },         // backs income-tax cut (headline lead)
  { layer:'ACCT', key:'jteuscher', idx:1, issueKey:'campaign_finance' },    // pushed PAC disclosure enforcement
  // ── Sandra Hollins (hollins_h24) ──
  { layer:'ACCT', key:'hollins_h24', idx:0, issueKey:'housing_support' },   // homelessness/addiction/equity (homelessness lead)
  { layer:'ACCT', key:'hollins_h24', idx:1, issueKey:'rights_balance' },    // racism public-health resolution (equity)
  { layer:'ACCT', key:'hollins_h24', idx:2, issueKey:'housing_support' },   // bipartisan homelessness/behavioral-health work
  // ── Ray Ward (rward) ──
  { layer:'SL',   key:'rward', idx:0, issueKey:'healthcare' },              // widen health coverage
  { layer:'SL',   key:'rward', idx:1, issueKey:'tax_middle_class' },        // tax restructuring for working families
  { layer:'ACCT', key:'rward', idx:0, issueKey:'healthcare' },              // votes the medicine he practices
  { layer:'ACCT', key:'rward', idx:1, issueKey:'healthcare' },              // physician agenda: Medicaid/mental health
  { layer:'ACCT', key:'rward', idx:2, issueKey:'healthcare' },              // contraception & behavioral-health access
  { layer:'ACCT', key:'rward', idx:3, issueKey:'healthcare' },              // evidence-first health votes
  // ── Casey Snider (snider_h5) ──
  { layer:'ACCT', key:'snider_h5', idx:0, issueKey:'water' },               // Great Salt Lake conservation pattern (lead)
  { layer:'ACCT', key:'snider_h5', idx:2, issueKey:'water' },               // House sponsor Great Salt Lake framework
  { layer:'ACCT', key:'snider_h5', idx:3, issueKey:'lands_balance' },       // conservancy / natural-resources portfolio
  // ── Trevor Lee (tlee) ──
  { layer:'SL',   key:'tlee', idx:0, issueKey:'lgbtq_rights' },             // government flag law (Pride flags)
  { layer:'SL',   key:'tlee', idx:1, issueKey:'lower_taxes' },              // income-tax cut / smaller government
  { layer:'ACCT', key:'tlee', idx:1, issueKey:'lgbtq_rights' },             // covert anti-LGBTQ account
  { layer:'ACCT', key:'tlee', idx:3, issueKey:'lgbtq_rights' },             // states positions openly now (HB77 flags)
  // ── Stephanie Gricius (gricius_h50) ──
  { layer:'ACCT', key:'gricius_h50', idx:3, issueKey:'election_integrity' }, // ballot-return privacy (HB69)
  { layer:'ACCT', key:'gricius_h50', idx:4, issueKey:'tech_balance' },       // AI mental-health chatbot law (HB452)
  { layer:'ACCT', key:'gricius_h50', idx:5, issueKey:'healthcare_market' },  // fluoride ban portfolio (medical freedom)
  // ── Jake Fitisemanu (fitisemanu_h30) ──
  { layer:'ACCT', key:'fitisemanu_h30', idx:2, issueKey:'healthcare' },     // public-health pro legislating health equity
  { layer:'ACCT', key:'fitisemanu_h30', idx:3, issueKey:'healthcare' },     // health-data disaggregation / language access
  // ── Katy Hall (hall_h11) ──
  { layer:'ACCT', key:'hall_h11', idx:0, issueKey:'rights_balance' },       // anti-DEI HB261 + checkable promises
  { layer:'ACCT', key:'hall_h11', idx:1, issueKey:'rights_balance' },       // steered anti-DEI HB261
  { layer:'ACCT', key:'hall_h11', idx:2, issueKey:'rights_balance' },       // HB261 limits promises
  { layer:'ACCT', key:'hall_h11', idx:3, issueKey:'healthcare' },           // RN: healthcare-worker continuity bills
  // ── Karianne Lisonbee (klisonbee) ──
  { layer:'ACCT', key:'klisonbee', idx:0, issueKey:'pro_life' },            // post-Roe remark (abortion context)
  { layer:'ACCT', key:'klisonbee', idx:1, issueKey:'pro_life' },            // consistent abortion through-line
  // ── Ken Ivory (kivory) ──
  { layer:'ACCT', key:'kivory', idx:0, issueKey:'lands_local' },            // federal-land-transfer movement
  { layer:'ACCT', key:'kivory', idx:1, issueKey:'lands_local' },            // fraud complaint over lands nonprofit
  { layer:'ACCT', key:'kivory', idx:2, issueKey:'lands_local' },            // no charges followed (cleared)
  // ── Nelson Abbott (nelson_abbott) ──
  { layer:'ACCT', key:'nelson_abbott', idx:0, issueKey:'justice_reform' },  // civil-law / competency reform record
  { layer:'ACCT', key:'nelson_abbott', idx:1, issueKey:'health_mental' },   // guardianship / disability rights
  { layer:'ACCT', key:'nelson_abbott', idx:2, issueKey:'reform_balance' },  // probate + local-government accountability
  // ── Brady Brammer (brammer_s21) ──
  { layer:'ACCT', key:'brammer_s21', idx:0, issueKey:'justice_balance' },   // Business and Chancery Court
  { layer:'ACCT', key:'brammer_s21', idx:1, issueKey:'free_speech' },       // porn warning-label / compelled-speech
  { layer:'ACCT', key:'brammer_s21', idx:2, issueKey:'tech_balance' },      // social-media moderation regulation
  { layer:'ACCT', key:'brammer_s21', idx:3, issueKey:'justice_balance' },   // justice-system focus / Judiciary committee
];

// ── locate a layer object's brace-range in the raw HTML ──────────────────────
function layerRange(html, marker) {
  const p = html.indexOf(marker);
  if (p < 0) return null;
  const open = html.indexOf('{', p);
  let depth = 0;
  for (let i = open; i < html.length; i++) {
    const c = html[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return { start: open, end: i + 1 }; }
  }
  return null;
}

// ── find the [ ... ] array body for `key:` inside [start,end) ─────────────────
function keyArrayRange(html, start, end, key) {
  const re = new RegExp('(^|\\n)\\s*' + key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + ':\\s*\\[', 'g');
  re.lastIndex = start;
  let m;
  while ((m = re.exec(html))) {
    if (m.index >= end) break;
    const open = html.indexOf('[', m.index);
    if (open < 0 || open >= end) break;
    let depth = 0;
    for (let i = open; i < end; i++) {
      const c = html[i];
      if (c === '[') depth++;
      else if (c === ']') { depth--; if (depth === 0) return { open, close: i }; }
    }
  }
  return null;
}

// ── enumerate top-level { } object ranges within an array body ───────────────
function objectRanges(html, open, close) {
  const out = [];
  let depth = 0, objStart = -1;
  for (let i = open + 1; i < close; i++) {
    const c = html[i];
    if (c === '{') { if (depth === 0) objStart = i; depth++; }
    else if (c === '}') { depth--; if (depth === 0) out.push({ start: objStart, end: i + 1 }); }
  }
  return out;
}

function patch() {
  let html = readFileSync(HTML, 'utf8');
  const layers = {
    SL: layerRange(html, 'window.SPOTLIGHT_DATA = window.SPOTLIGHT_DATA || '),
    ACCT: layerRange(html, 'window.ACCT_SPOTLIGHT = window.ACCT_SPOTLIGHT || '),
  };
  if (!layers.SL || !layers.ACCT) throw new Error('layer markers not found');

  // Compute all insertions as {offset, text}; apply from the end so earlier
  // offsets stay valid.
  const edits = [];
  const issues = [];
  let applied = 0, skipped = 0;

  for (const t of TARGETS) {
    const L = layers[t.layer];
    const arr = keyArrayRange(html, L.start, L.end, t.key);
    if (!arr) { issues.push(`✗ ${t.layer}:${t.key} array not found`); continue; }
    const objs = objectRanges(html, arr.open, arr.close);
    if (t.idx >= objs.length) { issues.push(`✗ ${t.layer}:${t.key}#${t.idx} out of range (${objs.length})`); continue; }
    const o = objs[t.idx];
    const text = html.slice(o.start, o.end);
    if (/(^|[{,\s])issueKey\s*:/.test(text)) { skipped++; continue; } // idempotent
    // insert right after the opening brace
    edits.push({ offset: o.start + 1, text: ` issueKey: '${t.issueKey}',` });
    applied++;
  }

  edits.sort((a, b) => b.offset - a.offset);
  for (const e of edits) html = html.slice(0, e.offset) + e.text + html.slice(e.offset);

  writeFileSync(HTML, html);
  console.log(`Tagged ${applied} Spotlight items (skipped ${skipped} already-tagged).`);
  if (issues.length) { console.log('\nIssues:'); issues.forEach(s => console.log('  ' + s)); }
}

if (PATCH) patch();
else console.log('No-op. Pass --patch to edit index.html.');
