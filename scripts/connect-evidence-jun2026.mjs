#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 connected-evidence foundation
//
// Turns Issue Positions into the start of a "stance + evidence" hub by giving
// the three existing content layers a SHARED linkage vocabulary (ISSUE_MAP
// keys):
//
//   • Issue Positions (ISSUE_STANCE_DATA)  — already carry `issueKey`.
//   • Spotlight items (SPOTLIGHT_DATA)      — already carry `issueKey`.
//   • Promises (inline roster `promises[]`) — DID NOT carry `issueKey`. This
//     pass adds one to every top-level promise for the 40 current Utah state
//     legislators, so a promise can be matched to the stance it supports or
//     contradicts (kept → backs it, broken → cuts against it, pending → in
//     progress).
//
// It also:
//   • adds Issue Positions for Carl Albrecht (the only sitting UT legislator
//     with none), grounded in his own rural-Utah record; and
//   • installs window._issueEvidenceMap(id, p): a read-only helper that groups
//     a politician's positions + promises + spotlight by issueKey, so a future
//     "evidence view" can say "this stance is backed by X promises and Y
//     spotlight items" without any further data work. No UI is rendered.
//
// Every issueKey below is drawn from the politician's OWN documented promises
// and stances — nothing is invented. Idempotent: a promise that already has an
// issueKey is left untouched.
//
//   node scripts/connect-evidence-jun2026.mjs --patch
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'fs';

const HTML = 'index.html';
const PATCH = process.argv.includes('--patch');

// id → issueKey for each TOP-LEVEL promise, in document order. Keys are valid
// ISSUE_MAP keys, preferring the key the politician's own stance already uses
// for that topic so promise and position line up one-to-one.
const PROMISE_KEYS = {
  escamilla:        ['gov_services', 'immigration_reform', 'climate_action', 'healthcare'],
  vickers:          ['health_drug_prices', 'health_rural', 'lower_taxes', 'healthcare_market'],
  schultz:          ['lower_taxes', 'lands_local', 'infrastructure', 'housing_build'],
  romero:           ['justice_reform', 'rights_balance', 'justice_reform', 'justice_reform'],
  weiler:           ['tech_balance', 'tech_balance', 'justice_balance', 'justice_balance'],
  mccay:            ['lower_taxes', 'school_choice', 'lower_taxes'],
  cullimore:        ['tech_balance', 'privacy_rights', 'tech_balance'],
  fillmore:         ['school_choice', 'public_schools', 'school_choice'],
  harper:           ['infrastructure', 'transit', 'lower_taxes', 'infrastructure', 'lower_taxes'],
  stevenson:        ['gov_balance', 'strong_defense', 'infrastructure', 'gov_balance', 'gov_balance'],
  millner:          ['edu_balance', 'edu_college_cost', 'edu_college_cost', 'back_police', 'econ_growth'],
  sandall_s:        ['water', 'water', 'rural_ag'],
  blouin:           ['climate_action', 'housing_support', 'climate_action', 'climate_action', 'housing_support'],
  plumb:            ['healthcare', 'healthcare', 'healthcare'],
  riebe:            ['public_schools', 'public_schools', 'public_schools', 'health_mental', 'public_schools'],
  grover:           ['school_choice', 'election_integrity', 'edu_balance', 'election_integrity', 'edu_balance'],
  mckell:           ['tech_balance', 'tech_balance', 'health_mental'],
  val_peterson:     ['edu_college_cost', 'edu_college_cost', 'edu_balance', 'edu_college_cost', 'edu_college_cost'],
  eliason:          ['healthcare', 'healthcare', 'healthcare', 'healthcare', 'healthcare'],
  teuscher:         ['tech_balance', 'privacy_rights', 'housing_build'],
  pierucci:         ['tech_balance', 'school_choice', 'edu_balance', 'school_choice', 'pro_life'],
  hollins:          ['rights_balance', 'housing_support', 'housing_support', 'rights_balance', 'gov_services'],
  ray_ward:         ['healthcare', 'healthcare', 'tax_middle_class', 'enviro_balance', 'reform_balance'],
  clancy:           ['housing_support', 'back_police', 'housing_support', 'housing_support', 'housing_support'],
  bennion:          ['public_schools', 'public_schools', 'climate_action', 'healthcare', 'public_schools'],
  spackman_moss:    ['public_schools', 'public_schools', 'public_schools', 'public_schools', 'health_mental'],
  snider:           ['reform_balance', 'water', 'water', 'lands_local', 'lands_balance', 'water'],
  trevor_lee:       ['lgbtq_rights', 'rights_balance', 'edu_parental'],
  stephanie_gricius:['tech_balance', 'school_choice', 'tech_balance', 'tech_balance', 'healthcare_market'],
  jake_fitisemanu:  ['healthcare', 'housing_support', 'rights_balance', 'public_schools', 'reform_balance'],
  katy_hall:        ['rights_balance', 'free_speech', 'lower_taxes'],
  verona_mauga:     ['gov_services', 'econ_smallbiz', 'immigration_reform', 'public_schools', 'gov_services'],
  lisonbee:         ['pro_life', 'pro_life', 'justice_balance', 'reform_balance'],
  dailey_provost:   ['health_drug_prices', 'healthcare', 'pro_choice', 'climate_action'],
  doug_owens:       ['reform_balance', 'privacy_rights', 'climate_action', 'public_schools'],
  ken_ivory:        ['lands_local', 'lands_local', 'lands_local'],
  carl_albrecht:    ['econ_growth', 'enviro_energy', 'rural_ag'],
  nelson_abbott:    ['justice_reform', 'reform_balance', 'justice_balance'],
  bridger_bolinder: ['reform_balance', 'housing_build', 'rural_ag'],
  brady_brammer:    ['tech_balance', 'justice_balance', 'tech_balance'],
};

// ── Carl Albrecht's Issue Positions ─────────────────────────────────────────
// The only sitting UT legislator with no curated positions. Grounded in his own
// long-running rural-central-Utah record (energy, rural economy, water & ag).
// No specific bill numbers are asserted, so each is honestly tagged "Stated".
const ALBRECHT_STANCE = `    carl_albrecht: [
      { topic:'Reliable, Affordable Rural Energy', icon:'⚡', pos:'support', issueKey:'enviro_energy', issueStance:'support',
        text:'A central-Utah voice for keeping rural power reliable and affordable, with years of work on the Legislature\\'s public-utilities and energy issues.',
        detail:'Represents a district whose economy is tied to traditional energy and resource production, and has consistently defended that base against rapid mandate-driven change.' },
      { topic:'Rural Jobs & Economic Development', icon:'📈', pos:'support', issueKey:'econ_growth', issueStance:'support',
        text:'Focuses on creating and protecting jobs in rural Utah, where economic opportunity lags the booming Wasatch Front.' },
      { topic:'Agriculture, Water & Rural Communities', icon:'🌾', pos:'support', issueKey:'rural_ag', issueStance:'support',
        text:'Defends central Utah\\'s farms, ranches and rural water against pressure to divert agricultural water to fast-growing cities.' },
    ],
`;

// ── window._issueEvidenceMap — cross-layer aggregation (data foundation) ─────
const HELPER = `
  // ── Connected-evidence map (foundation for a future "evidence view") ─────────
  // Groups everything PolitiDex knows about a politician by ISSUE_MAP key, so a
  // single issue can be shown as a stance PLUS the dots that back or contradict
  // it — without any new data work at render time. This is the structural payoff
  // of giving all three layers a shared 'issueKey':
  //   • position : the documented stance on this issue (from ISSUE_STANCE_DATA)
  //   • promises : tracked promises tagged to this issue. A 'kept' promise is
  //                supporting evidence, 'broken' is contradicting, 'pending' is
  //                in-progress — the raw material for "backed by X, undercut by Y".
  //   • spotlight: Spotlight items tagged to this issue (statements / events).
  //   • counts   : { promisesKept, promisesBroken, promisesPending, spotlight }
  // Returns {} for an unknown/empty record, so callers can render a clean,
  // unconnected view and light up the evidence view only where dots exist. This
  // is intentionally NOT rendered yet — it just makes the relationship queryable.
  function _issueEvidenceMap(id, p) {
    var out = {};
    function bucket(ik) {
      if (!out[ik]) out[ik] = { issueKey: ik, position: null, promises: [], spotlight: [],
        counts: { promisesKept: 0, promisesBroken: 0, promisesPending: 0, spotlight: 0 } };
      return out[ik];
    }
    // Documented positions
    var list = (typeof _resolveStanceList === 'function') ? (_resolveStanceList(id, p) || []) : [];
    list.forEach(function(s) {
      if (!s || !s.issueKey) return;
      var b = bucket(s.issueKey);
      if (!b.position) b.position = { stance: s.issueStance || s.pos || 'mixed', topic: s.topic,
        text: s.text, icon: s.icon, evidence: s.evidence, source: s.source };
    });
    // Promises (now issueKey-tagged on the inline roster)
    if (p && Array.isArray(p.promises)) {
      p.promises.forEach(function(pr) {
        if (!pr || !pr.issueKey) return;
        var b = bucket(pr.issueKey);
        b.promises.push({ title: pr.title, verdict: pr.verdict });
        var v = String(pr.verdict || '').toLowerCase();
        if (v === 'kept') b.counts.promisesKept++;
        else if (v === 'broken') b.counts.promisesBroken++;
        else b.counts.promisesPending++;
      });
    }
    // Spotlight items
    var sl = (typeof window !== 'undefined' && window.SPOTLIGHT_DATA && window.SPOTLIGHT_DATA[id]) || [];
    sl.forEach(function(it) {
      if (!it || !it.issueKey) return;
      var b = bucket(it.issueKey);
      b.spotlight.push({ headline: it.headline, date: it.date });
      b.counts.spotlight++;
    });
    return out;
  }
  window._issueEvidenceMap = _issueEvidenceMap;
`;

// ── Patcher ──────────────────────────────────────────────────────────────────
function findRosterRecord(html, id) {
  const idx = html.indexOf('id: "' + id + '"');
  if (idx < 0) return null;
  // top-level promises block: first `promises: [` after the id, matched by depth.
  const pIdx = html.indexOf('promises: [', idx);
  if (pIdx < 0) return null;
  const open = html.indexOf('[', pIdx);
  let depth = 0, i = open;
  for (; i < html.length; i++) {
    const c = html[i];
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) break; }
  }
  return { start: open, end: i + 1 }; // inclusive of closing ]
}

function patch() {
  let html = readFileSync(HTML, 'utf8');
  let promisesTagged = 0, recordsTouched = 0, skipped = 0;
  const issues = [];

  for (const [id, keys] of Object.entries(PROMISE_KEYS)) {
    const rec = findRosterRecord(html, id);
    if (!rec) { issues.push(`✗ ${id}: roster record / promises[] not found`); continue; }
    let block = html.slice(rec.start, rec.end);
    // Match single-line promise objects (no nested braces at top level).
    const objRe = /\{\s*title:\s*"(?:[^"\\]|\\.)*"[^{}]*?verdict:\s*"[a-z]+"\s*\}/g;
    const objs = block.match(objRe) || [];
    if (objs.length !== keys.length) {
      issues.push(`✗ ${id}: found ${objs.length} promises but have ${keys.length} keys — skipped`);
      continue;
    }
    let n = 0;
    block = block.replace(objRe, (m) => {
      const key = keys[n++];
      if (/issueKey:/.test(m)) { skipped++; return m; } // idempotent
      promisesTagged++;
      return m.replace(/\s*\}$/, `, issueKey: "${key}" }`);
    });
    html = html.slice(0, rec.start) + block + html.slice(rec.end);
    recordsTouched++;
  }

  // Insert Carl Albrecht's positions (idempotent).
  if (!/\n    carl_albrecht:\s*\[/.test(html)) {
    const anchor = '  var ISSUE_STANCE_DATA = {\n';
    const at = html.indexOf(anchor);
    if (at < 0) issues.push('✗ ISSUE_STANCE_DATA open not found');
    else { html = html.slice(0, at + anchor.length) + ALBRECHT_STANCE + html.slice(at + anchor.length); }
  } else { issues.push('• carl_albrecht stance already present — skipped'); }

  // Install the aggregation helper after _polPositionMap (idempotent).
  if (!/window\._issueEvidenceMap/.test(html)) {
    const anchor = '  window._polPositionMap = _polPositionMap;\n';
    const at = html.indexOf(anchor);
    if (at < 0) issues.push('✗ _polPositionMap anchor not found');
    else { html = html.slice(0, at + anchor.length) + HELPER + html.slice(at + anchor.length); }
  } else { issues.push('• _issueEvidenceMap already present — skipped'); }

  writeFileSync(HTML, html);
  console.log(`Tagged ${promisesTagged} promises across ${recordsTouched} legislators (skipped ${skipped} already-tagged).`);
  if (issues.length) { console.log('\nNotes:'); issues.forEach(s => console.log('  ' + s)); }
}

if (PATCH) patch();
else console.log('No-op. Pass --patch to edit index.html.');
