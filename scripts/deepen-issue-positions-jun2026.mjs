#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 depth pass (wave 4)
//
// The roster already carries structured, ISSUE_MAP-keyed positions for 234 of
// 244 politicians (waves 1-3). This pass does NOT add new people — it DEEPENS
// existing profiles whose Firestore record documents more distinct positions
// than the curated stance list yet surfaces. Every position below is drawn
// strictly from that figure's OWN documented stances already in their Firestore
// record (nothing invented), mapped to an exact ISSUE_MAP issueKey so the
// profile gains additional comparable issues in the Personalized Alignment Tool
// and additional at-a-glance chips on browse cards. Where the documented stance
// names a concrete law or action it carries `evidence`; campaign positions
// carry none, so the Snapshot honestly tags them "💬 Stated".
//
// Keyed by the EXACT ISSUE_STANCE_DATA key each array already lives under (so
// the new objects append to the right list). `fsId` is the Firestore document
// id, used only by --apply to mirror the topic→text into the `stances` map.
//
//   node scripts/deepen-issue-positions-jun2026.mjs --patch   # insert into index.html
//   node scripts/deepen-issue-positions-jun2026.mjs --apply   # mirror to Firestore
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const PATCH = process.argv.includes('--patch');
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-15T00:00:00.000Z';
const HTML = 'index.html';

// stanceKey → { fsId, name, adds:[positions] }
const DATA = {
  dowens_st: { fsId: 'dowens_st', name: 'Derrin Owens', adds: [
    { topic:'Government Transparency', icon:'🔍', pos:'support', issueKey:'gov_transparency', issueStance:'support',
      text:'Sponsored government-transparency measures, including the 2016 Transparency Advisory Board modifications signed into law.', evidence:'Sponsored Transparency Advisory Board legislation (2016).' },
    { topic:'Water Rights', icon:'💧', pos:'support', issueKey:'water', issueStance:'support',
      text:'Prioritizes securing and protecting water rights for central Utah amid statewide growth and drought.' },
    { topic:'Agriculture & Ranching', icon:'🌾', pos:'support', issueKey:'rural_ag', issueStance:'support',
      text:'Advocates for central Utah\'s farms and ranches and for protecting agricultural water from conversion to municipal use.' },
    { topic:'Rural Broadband & Infrastructure', icon:'📶', pos:'support', issueKey:'broadband', issueStance:'support',
      text:'Supports expanding broadband and infrastructure investment in underserved rural communities.' },
  ]},
  sam_barlow: { fsId: 'sam_barlow', name: 'Sam Barlow', adds: [
    { topic:'Limited Government & Free Markets', icon:'📈', pos:'support', issueKey:'econ_growth', issueStance:'support',
      text:'Champions responsible but limited government, free markets, personal freedom and strong families as his core governing philosophy.' },
  ]},
  scott_parke: { fsId: 'scott_parke', name: 'Scott Parke', adds: [
    { topic:'Modernization & Efficiency', icon:'⚙️', pos:'support', issueKey:'reform_balance', issueStance:'support',
      text:'Wants to use modern technology to streamline county processes and keep costs low.' },
  ]},
  shana_anderson: { fsId: 'shana_anderson', name: 'Shana Anderson', adds: [
    { topic:'Wages & Working Families', icon:'🛠', pos:'support', issueKey:'econ_workers', issueStance:'support',
      text:'An economist who has researched falling real wages amid rising costs and wants to address it directly.' },
  ]},
  thomas_peterson: { fsId: 'thomas_peterson', name: 'Thomas Peterson', adds: [
    { topic:'Veterans', icon:'🎖', pos:'support', issueKey:'veterans', issueStance:'support',
      text:'Supports recognizing Utah veterans and military service through state action.' },
  ]},
  tiara_auxier: { fsId: 'tiara_auxier', name: 'Tiara Auxier', adds: [
    { topic:'Election & Nomination Reform', icon:'🗳', pos:'support', issueKey:'election_integrity', issueStance:'support',
      text:'Backs proof-of-citizenship and voter-ID safeguards and preserving the caucus-convention nominating system, including repealing or replacing SB54.' },
    { topic:'Local Zoning Control', icon:'🏡', pos:'support', issueKey:'property_rights', issueStance:'support',
      text:'Opposes state-mandated high-density housing and favors returning zoning authority to local communities.' },
  ]},
  troy_shelley: { fsId: 'troy_shelley', name: 'Troy Shelley', adds: [
    { topic:'Public Lands & Local Control', icon:'🤠', pos:'support', issueKey:'lands_local', issueStance:'support',
      text:'Supports resource access on public lands and local consent before new federal conservation restrictions.' },
    { topic:'Curriculum & Education', icon:'📚', pos:'support', issueKey:'edu_parental', issueStance:'support',
      text:'Opposes diversity, equity, and inclusion programs in public education.' },
  ]},
  scott_chew: { fsId: 'scott_chew', name: 'Scott Chew', adds: [
    { topic:'Agriculture & Ranching', icon:'🌾', pos:'support', issueKey:'rural_ag', issueStance:'support',
      text:'A rancher who defends Utah farming and ranching, framing agriculture as essential to the state rather than a problem.' },
  ]},
  silvia_catten: { fsId: 'silvia_catten', name: 'Silvia Catten', adds: [
    { topic:'Healthcare Access', icon:'🏥', pos:'support', issueKey:'healthcare', issueStance:'support',
      text:'Backs accessible healthcare alongside stronger wages and childcare subsidies for middle-class families.' },
  ]},
  tucker_smith: { fsId: 'tucker_smith', name: 'Tucker Smith', adds: [
    { topic:'Tax Fairness & Public Investment', icon:'🏛', pos:'support', issueKey:'gov_services', issueStance:'support',
      text:'Supports targeted tax increases on the wealthiest Utahns to reinvest in families and public services.' },
  ]},
  daniel_mccay: { fsId: 'dmccay', name: 'Dan McCay', adds: [
    { topic:'Economic Development', icon:'📈', pos:'support', issueKey:'econ_growth', issueStance:'support',
      text:'Sponsored 2024 legislation creating a funding mechanism for a downtown Salt Lake City sports and entertainment district to attract major-league teams.', evidence:'Sponsored sports-district funding legislation (2024).' },
    { topic:'Government Operations & Oversight', icon:'✂️', pos:'support', issueKey:'gov_regulation', issueStance:'support',
      text:'Backs clearer statutes and stronger legislative oversight of state agencies and administrative rules.' },
  ]},
  verona_mauga: { fsId: 'verona_mauga', name: 'Verona Mauga', adds: [
    { topic:'Affordable Housing', icon:'🏘', pos:'support', issueKey:'housing_support', issueStance:'support',
      text:'Backs first-time homebuyer assistance and affordable housing for working families.' },
    { topic:'Gun Safety', icon:'🦺', pos:'support', issueKey:'gun_safety', issueStance:'support',
      text:'Supports sensible gun-safety measures.' },
  ]},
  carol_spackman_moss: { fsId: 'carol_spackman_moss', name: 'Carol Spackman Moss', adds: [
    { topic:'Opioid & Overdose Response', icon:'🧠', pos:'support', issueKey:'health_mental', issueStance:'support',
      text:'Sponsored Utah\'s first naloxone-access law and several follow-on bills addressing the overdose crisis.', evidence:'Sponsored Utah\'s first naloxone-access law.' },
  ]},
  jennifer_plumb: { fsId: 'jennifer_plumb', name: 'Jennifer Plumb', adds: [
    { topic:'Great Salt Lake & Environment', icon:'💧', pos:'support', issueKey:'water', issueStance:'support',
      text:'Supports action on environmental quality and protecting the shrinking Great Salt Lake.' },
  ]},
  nate_blouin: { fsId: 'nate_blouin', name: 'Nate Blouin', adds: [
    { topic:'Great Salt Lake & Water', icon:'💧', pos:'support', issueKey:'water', issueStance:'support',
      text:'Prioritizes saving the Great Salt Lake and improving the state\'s water policy alongside air quality.' },
  ]},
  sandra_hollins: { fsId: 'sandra_hollins', name: 'Sandra Hollins', adds: [
    { topic:'Criminal Justice Reform', icon:'🤝', pos:'support', issueKey:'justice_reform', issueStance:'support',
      text:'Sponsored a ban on chokeholds and \'Ban the Box\' employment reform to reduce barriers for people with records.', evidence:'Sponsored chokehold-ban and Ban the Box legislation.' },
  ]},
  stephanie_gricius: { fsId: 'stephanie_gricius', name: 'Stephanie Gricius', adds: [
    { topic:'Government Oversight', icon:'✂️', pos:'support', issueKey:'gov_regulation', issueStance:'support',
      text:'Chairs the Administrative Rules Review and General Oversight Committee, scrutinizing state agency rulemaking.' },
    { topic:'Mental Health Funding', icon:'🧠', pos:'support', issueKey:'health_mental', issueStance:'support',
      text:'Vice chair of Social Services Appropriations who works on mental-health funding and parental-rights policy.' },
  ]},
};

// Render one position object as an index.html line (6-space indent, matching file style).
function lineFor(c) {
  const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const parts = [`topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`,
    `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`];
  if (c.evidence) parts.push(`evidence:'${esc(c.evidence)}'`);
  if (c.source) parts.push(`source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`);
  return `      { ${parts.join(', ')} },`;
}

// ── Firestore helpers (REST) ─────────────────────────────────────────────────
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') { const f = {}; for (const [k, val] of Object.entries(v)) f[k] = enc(val); return { mapValue: { fields: f } }; }
  throw new Error('cannot encode');
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
async function getOne(id) {
  const r = await fetch(`${BASE}/${id}`); if (!r.ok) return null;
  const d = await r.json(); if (!d.fields) return null;
  const o = {}; for (const [k, v] of Object.entries(d.fields)) o[k] = dec(v); return o;
}
async function patchDoc(id, fields) {
  const qs = Object.keys(fields).map(m => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&');
  const body = { fields: {} }; for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${qs}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

// ── index.html in-place insertion ────────────────────────────────────────────
function patchHtml() {
  let html = readFileSync(HTML, 'utf8');
  let inserted = 0, touched = 0;
  for (const [key, entry] of Object.entries(DATA)) {
    const keyIdx = html.indexOf(`\n    ${key}: [`);
    if (keyIdx === -1) { console.log(`  ✗ ${key}: array not found in ${HTML}`); continue; }
    // Find the closing line "    ]," that ends this array (first one after the key line).
    const closeRe = /\n    \],?(?=\n)/g;
    closeRe.lastIndex = keyIdx + 1;
    const m = closeRe.exec(html);
    if (!m) { console.log(`  ✗ ${key}: array close not found`); continue; }
    const block = entry.adds.map(lineFor).join('\n');
    html = html.slice(0, m.index) + '\n' + block + html.slice(m.index);
    inserted += entry.adds.length; touched++;
    console.log(`  ✎ ${key}: +${entry.adds.length} positions`);
  }
  writeFileSync(HTML, html);
  console.log(`\nPatched ${HTML}: +${inserted} positions across ${touched} profiles.`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  let profiles = 0, positions = 0;
  for (const e of Object.values(DATA)) { profiles++; positions += e.adds.length; }
  console.log(`Depth pass: ${positions} positions across ${profiles} profiles.\n`);

  if (PATCH) patchHtml();

  if (APPLY) {
    let touched = 0, added = 0;
    for (const entry of Object.values(DATA)) {
      const doc = await getOne(entry.fsId);
      if (!doc) { console.log(`  ✗ ${entry.fsId}: not found`); continue; }
      const existing = (doc.stances && typeof doc.stances === 'object' && !Array.isArray(doc.stances)) ? doc.stances : {};
      const merged = Object.assign({}, existing); let fresh = 0;
      for (const c of entry.adds) { if (!(c.topic in merged)) fresh++; merged[c.topic] = c.text; }
      await patchDoc(entry.fsId, { stances: merged, updatedAt: STAMP });
      touched++; added += fresh;
      console.log(`  ✎ ${entry.fsId} (${entry.name}): +${fresh} new → ${Object.keys(merged).length} stances`);
    }
    console.log(`\nMirrored to Firestore: ${touched} profiles (${added} new stance entries).`);
  }

  if (!PATCH && !APPLY) console.log('No-op. Pass --patch (index.html) and/or --apply (Firestore).');
})();
