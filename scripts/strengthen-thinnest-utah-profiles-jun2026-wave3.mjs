#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — holistic strengthening of the THINNEST sitting Utah legislator
// profiles (June 2026 quality-floor pass, wave 3)
//
// A fresh depth audit ranked all 102 current sitting Utah State Representatives
// and Senators by COMBINED quality content = (curated Issue Positions in
// ISSUE_STANCE_DATA) + (tracked Promises) + (Spotlight items). The thinnest
// cluster sat at a combined 12–16, and the audit's key finding was specific:
//
//   • These members' PROMISE ledgers are well built (5–10 sourced bills each),
//     but most of those promises carry NO `issueKey`, so a kept or broken
//     verdict never lights up the member's own "Stance at a Glance" or
//     Connected-Evidence view, and never feeds the issue-level follow-through.
//   • Several members have documented bills (and Spotlight items) on issues for
//     which they hold NO curated Issue Position — real "connection gaps" where
//     the receipt exists but no stance row ties to it.
//
// This pass closes both gaps for the thinnest set, in the task's priority order
// (Issue Positions first, then Promise connections, then Spotlight), under a
// hard honesty rule drawn from CONTENT_STYLE.md:
//
//   • Every NEW Issue Position is authored from material the profile ALREADY
//     documents and sources — a bill the member personally sponsored (recorded
//     in their `promises`) or a credential already in their record. No new
//     factual claims are introduced; each position's text states only what the
//     cited bill actually did, written about the individual, with no party
//     framing. Bill-backed positions carry the bill as `evidence` and a
//     load-tested le.utah.gov static page (HTTP 200) as `source`.
//   • Each new position is keyed to an exact ISSUE_MAP `issueKey`, and a
//     matching promise is keyed to the SAME issue, so the stance and its
//     evidence connect on the profile and in the Personalized Alignment Tool.
//   • Promise `issueKey`s are set only where the bill's actual content matches a
//     real ISSUE_MAP issue. Purely electoral promises ("won the race") and
//     topics the member holds no documented position on are left unkeyed.
//   • An enacted/kept bill becomes supporting evidence for its issue; a bill
//     that stalled is left at its honest `broken`/`pending` verdict and shows as
//     contradicting/in-progress evidence — never redressed as a win.
//   • Genuinely thin records are NOT padded. Members already well connected
//     (their promises keyed, positions covering their evidence) get little or
//     nothing here; freshmen/appointees whose full public record is already
//     captured are left honestly light.
//
// Idempotent & non-destructive:
//   • A new Issue Position is inserted into ISSUE_STANCE_DATA only if no existing
//     position for that member already carries its issueKey.
//   • A promise `issueKey` is set only when currently absent.
//   • A spotlight re-key changes only the issueKey, matched by a headline
//     substring, and only when it differs.
//
//   node scripts/strengthen-thinnest-utah-profiles-jun2026-wave3.mjs            # dry run
//   node scripts/strengthen-thinnest-utah-profiles-jun2026-wave3.mjs --apply    # write Firestore + patch index.html
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const FILE = 'index.html';
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-22T00:00:00.000Z';

const le = (y, n) => ({ label: `le.utah.gov — ${n} (${y})`, url: `https://le.utah.gov/~${y}/bills/static/${n}.html` });

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
  const mask = Object.keys(fields);
  const qs = mask.map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${qs}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

// ── NEW ISSUE POSITIONS ─────────────────────────────────────────────────────
// Keyed by the member's ISSUE_STANCE_DATA stance key (resolved via the same
// id → alias → name-slug chain the site uses). Inserted only if the member has
// no existing position carrying that issueKey. Every text states what the cited
// documented bill actually did; no party framing.
const POSITION_ADDS = {
  cheryl_acton: [
    { topic: 'Disability & Person-Centered Services', icon: '🧩', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
      text: 'Acted to protect day programs and person-centered services for Utahns with disabilities, then modernized the state Health and Human Services statutes that fund them.',
      evidence: 'Sponsored HB 388 (2024) and HB 434 (2025).', source: le('2024', 'HB0388') },
    { topic: 'Child Welfare & Kinship Placement', icon: '🤝', pos: 'support', issueKey: 'family_support', issueStance: 'support',
      text: 'Works to keep children with relatives when the state takes custody, sponsoring legislation to improve kinship placement procedures so kids stay with family where possible.',
      evidence: 'Sponsored HB 431 (2025).', source: le('2025', 'HB0431') },
    { topic: 'Public-Employee Retirement', icon: '👷', pos: 'support', issueKey: 'gov_services', issueStance: 'support',
      text: 'Sponsored legislation strengthening retirement benefits for Utah public employees, treating a competitive retirement as part of recruiting and keeping a public workforce.',
      evidence: 'Sponsored HB 25 (2025).', source: le('2025', 'HB0025') },
  ],
  cory_maloy: [
    { topic: 'Pro-Growth Deregulation', icon: '📈', pos: 'support', issueKey: 'econ_growth', issueStance: 'support',
      text: 'Authored the nation\'s first all-industry "regulatory sandbox," letting new businesses test products under temporary relief from rules that would otherwise block them.',
      evidence: 'Sponsored HB 217 (2021).', source: le('2021', 'HB0217') },
    { topic: 'Healthcare Costs & Billing', icon: '🚑', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
      text: 'Sponsored measures to standardize ground-ambulance reimbursement and ban surprise balance billing, and to update licensing for health-facility administrators.',
      evidence: 'Sponsored HB 301 (2025) and HB 16 (2025).', source: le('2025', 'HB0301') },
  ],
  kstratton: [
    { topic: 'Government Asset Oversight', icon: '🧾', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
      text: 'Created a standing Asset and Investment Review Task Force to scrutinize how the state holds and manages its assets and investments.',
      evidence: 'Sponsored SB 323 (2025).', source: le('2025', 'SB0323') },
    { topic: 'Guardianship & Disability Protections', icon: '🛡', pos: 'support', issueKey: 'health_mental', issueStance: 'support',
      text: 'Strengthened guardianship protections for adults with severe intellectual disabilities, tightening the safeguards around who makes decisions for vulnerable Utahns.',
      evidence: 'Sponsored SB 199 (2025).', source: le('2025', 'SB0199') },
  ],
  mike_schultz: [
    { topic: 'Election Audits & Integrity', icon: '🗳', pos: 'support', issueKey: 'election_integrity', issueStance: 'support',
      text: 'Pushed to require independent audits of Utah elections, framing routine outside review as the way to keep public confidence in how votes are counted.' },
    { topic: 'Career & Technical Education', icon: '🛠', pos: 'support', issueKey: 'edu_college_cost', issueStance: 'support',
      text: 'As Speaker, personally carried legislation building a statewide career-and-technical-education network to give students faster paths into the workforce.' },
    { topic: 'Transportation Funding', icon: '🚧', pos: 'support', issueKey: 'infrastructure', issueStance: 'support',
      text: 'Led an effort to rebalance how Utah pays for roads as fuel-tax revenue erodes, shifting toward usage-based funding for highway maintenance.' },
  ],
  karianne_lisonbee: [
    { topic: 'Criminal Justice & Public Safety', icon: '⚖️', pos: 'support', issueKey: 'justice_balance', issueStance: 'support',
      text: 'Carries criminal-justice legislation focused on jail-release standards and state custody of juveniles, framing tighter public-safety rules as her priority on the issue.',
      evidence: 'Sponsored HB 312 and HB 252 (2025).' },
    { topic: 'Religious & Ideological Freedom in Higher Ed', icon: '⛪', pos: 'support', issueKey: 'religious_liberty', issueStance: 'support',
      text: 'Sponsored protections for religious and ideological student groups at public universities, aiming to keep those associations open to students who share their beliefs.' },
  ],
  keith_grover: [
    { topic: 'Youth Safety & Screening', icon: '🧒', pos: 'support', issueKey: 'family_support', issueStance: 'support',
      text: 'Sponsored stronger background-screening requirements for youth-serving organizations, aiming to keep predators out of programs that work with children.' },
  ],
  val_peterson: [
    { topic: 'Grant & Spending Accountability', icon: '🔍', pos: 'support', issueKey: 'gov_transparency', issueStance: 'support',
      text: 'As a longtime appropriations leader, sponsored measures strengthening accountability for recipients of state grants and pressing for a balanced annual budget.' },
  ],
  christine_watkins: [
    { topic: 'Advanced Energy & Carbon Storage', icon: '⚡', pos: 'support', issueKey: 'enviro_energy', issueStance: 'support',
      text: 'Backs rural Utah\'s energy base while tightening oversight, promoting advanced transmission technology and stronger enforcement around geologic carbon storage.',
      evidence: 'Sponsored HB 212 (2025); carried HB 352 (2025).', source: le('2025', 'HB0212') },
    { topic: 'Women\'s Preventive Health', icon: '🎀', pos: 'support', issueKey: 'healthcare', issueStance: 'support',
      text: 'Sponsored a requirement that insurers cover mobile mammography screenings, aiming to widen access to breast-cancer screening for rural and working women.' },
  ],
  kstratton_extra: [],
};
// Additional positions that connect pre-existing but dangling evidence (a
// Spotlight item or already-keyed promise whose issueKey had no matching
// stance row). Each is authored from that same documented bill.
POSITION_ADDS.kstratton.push(
  { topic: 'Solid-Waste & Landfill Standards', icon: '♻️', pos: 'support', issueKey: 'enviro_balance', issueStance: 'support',
    text: 'Floor-sponsored updated state standards for solid-waste landfills, a practical-stewardship measure on how Utah manages disposal sites.' });
POSITION_ADDS.cory_maloy.push(
  { topic: 'Public Safety & Missing Persons', icon: '👮', pos: 'support', issueKey: 'back_police', issueStance: 'support',
    text: 'Sponsored legislation speeding location data to police in missing-person cases where someone is in danger, aimed at giving investigators faster tools in emergencies.' });
POSITION_ADDS.val_peterson.push(
  { topic: 'Transportation Funding', icon: '🚧', pos: 'support', issueKey: 'gov_services', issueStance: 'support',
    text: 'Sponsored redirecting black-license-plate revenue into the state transportation fund, steering a dedicated revenue stream toward roads.' });
delete POSITION_ADDS.kstratton_extra;

// ── PROMISE issueKey BACKFILL ───────────────────────────────────────────────
// docId -> [issueKey | null] aligned to the member's promises IN DOCUMENT ORDER.
// Each non-null key matches a real ISSUE_MAP issue the bill actually concerns,
// and (where the member holds the matching position) connects a kept/broken
// verdict to that stance. null = leave unkeyed (purely electoral, or a topic
// with no documented position / no clean issue match).
const PROMISE_KEYS = {
  cheryl_acton:     ['healthcare', 'gov_services', 'rural_ag', 'healthcare', 'family_support', 'public_schools', 'gov_transparency'],
  cory_maloy:       ['econ_growth', 'econ_smallbiz', 'healthcare', 'healthcare', null, 'gun_rights'],
  kstratton:        ['lands_local', 'lands_local', 'gov_transparency', 'health_mental', 'lands_local', 'water', 'lands_local', null, null, null],
  kgrover:          ['edu_balance', 'edu_balance', null, 'rights_balance', 'family_support', 'edu_balance'],
  colin_w_jack:     ['enviro_energy', 'enviro_energy', 'enviro_energy', 'enviro_energy', 'enviro_balance', 'rural_ag', 'enviro_energy'],
  christine_watkins:['family_support', 'family_support', 'infrastructure', 'family_support', 'enviro_energy', null, 'healthcare', 'family_support'],
  klisonbee:        ['pro_life', 'justice_balance', null, 'religious_liberty', 'justice_balance', null],
  val_peterson:     ['edu_college_cost', 'edu_college_cost', 'gov_services', 'gov_transparency', 'edu_college_cost', 'gov_balance'],
  stewart_e_barlow: ['health_rural', 'medical_freedom', 'lands_preserve', 'health_mental', 'healthcare', 'health_rural'],
  mschultz:         ['infrastructure', 'water', 'election_integrity', 'edu_college_cost', null, 'lands_local'],
};

// ── SPOTLIGHT issueKey CORRECTIONS ──────────────────────────────────────────
// Matched by a headline substring; only the issueKey is touched, and only when
// it differs. Re-keys an item to the position it actually evidences so it
// connects on the profile.
const SPOTLIGHT_REKEY = {
  mschultz: [
    { match: 'career-and-technical-education', issueKey: 'edu_college_cost' }, // CTE catalyst -> Career & Technical Education
  ],
};

// ── index.html ISSUE_STANCE_DATA insertion (string/comment-aware) ───────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function fmtPos(c) {
  const parts = [
    `topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`,
    `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`, `text:'${esc(c.text)}'`,
  ];
  if (c.evidence) parts.push(`evidence:'${esc(c.evidence)}'`);
  if (c.source) parts.push(`source:{label:'${esc(c.source.label)}', url:'${esc(c.source.url)}'}`);
  return `      { ${parts.join(', ')} },`;
}
function stanceBounds(src) {
  const marker = 'var ISSUE_STANCE_DATA = {';
  const start = src.indexOf(marker);
  if (start < 0) throw new Error('ISSUE_STANCE_DATA not found');
  let i = start + marker.length - 1, depth = 0, inStr = false, q = '', escd = false;
  for (; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (inStr) { if (escd) escd = false; else if (c === '\\') escd = true; else if (c === q) inStr = false; continue; }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = true; q = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return [start, i]; }
  }
  throw new Error('ISSUE_STANCE_DATA end not found');
}
function arrayRange(src, lo, hi, key) {
  const needle = `\n    ${key}: [`;
  const at = src.indexOf(needle, lo);
  if (at < 0 || at > hi) return null;
  let i = at + needle.length - 1, depth = 0, inStr = false, q = '', escd = false; // at '['
  for (; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (inStr) { if (escd) escd = false; else if (c === '\\') escd = true; else if (c === q) inStr = false; continue; }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = true; q = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) return [at + needle.length - 1, i]; }
  }
  return null;
}

function applyPositions() {
  let html = readFileSync(FILE, 'utf8');
  const [lo, hi] = stanceBounds(html);
  // Resolve which positions are actually new (member lacks that issueKey), and
  // insert from the bottom up so earlier offsets stay valid.
  const plan = [];
  for (const [key, cards] of Object.entries(POSITION_ADDS)) {
    const range = arrayRange(html, lo, hi, key);
    if (!range) { console.log(`  ✗ position ${key}: array not found — skipped`); continue; }
    const seg = html.slice(range[0], range[1]);
    const have = new Set([...seg.matchAll(/issueKey:'([a-z0-9_]+)'/g)].map((m) => m[1]));
    const fresh = cards.filter((c) => !have.has(c.issueKey));
    if (fresh.length) plan.push({ key, fresh, close: range[1] });
    else console.log(`  = position ${key}: all issueKeys already present`);
  }
  plan.sort((a, b) => b.close - a.close);
  let added = 0;
  for (const t of plan) {
    let lineStart = t.close;
    while (lineStart > 0 && html[lineStart - 1] !== '\n') lineStart--;
    const block = t.fresh.map(fmtPos).join('\n') + '\n';
    html = html.slice(0, lineStart) + block + html.slice(lineStart);
    added += t.fresh.length;
    console.log(`  ${APPLY ? '✎' : '→'} position ${t.key}: +${t.fresh.length} (${t.fresh.map((c) => c.issueKey).join(', ')})`);
  }
  if (APPLY && added) writeFileSync(FILE, html);
  return added;
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`PolitiDex — strengthen THINNEST Utah profiles (wave 3)  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);

  console.log('Issue Positions (index.html / ISSUE_STANCE_DATA):');
  const addedPositions = applyPositions();

  console.log('\nPromise issueKey backfill + Spotlight re-key (Firestore):');
  let promiseKeys = 0, rekeyed = 0, touched = 0, missing = 0, skipped = 0;
  const ids = Array.from(new Set([...Object.keys(PROMISE_KEYS), ...Object.keys(SPOTLIGHT_REKEY)]));
  for (const id of ids) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); skipped++; continue; }
    if (!doc) { console.log(`  – ${id}: not in Firestore — skipped`); missing++; continue; }
    const fields = {};

    const keys = PROMISE_KEYS[id];
    if (keys && Array.isArray(doc.promises)) {
      const promises = doc.promises.map((p) => ({ ...p }));
      let dirty = false, added = 0;
      if (keys.length !== promises.length) {
        console.log(`  ! ${id}: PROMISE_KEYS length ${keys.length} != ${promises.length} promises — applied by index`);
      }
      promises.forEach((p, i) => {
        const k = keys[i];
        if (k && !p.issueKey) { p.issueKey = k; dirty = true; added++; }
      });
      if (dirty) { fields.promises = promises; promiseKeys += added;
        console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name}): +${added} promise issueKey(s)`); }
    }

    const rekeys = SPOTLIGHT_REKEY[id];
    if (rekeys && Array.isArray(doc.spotlight)) {
      const spotlight = doc.spotlight.map((s) => ({ ...s }));
      let dirty = false;
      for (const rk of rekeys) {
        const hit = spotlight.find((s) => String(s.headline || '').includes(rk.match));
        if (hit && hit.issueKey !== rk.issueKey) {
          hit.issueKey = rk.issueKey; dirty = true; rekeyed++;
          console.log(`  ${APPLY ? '✎' : '→'} ${id}: re-key spotlight "${rk.match}" -> ${rk.issueKey}`);
        }
      }
      if (dirty) fields.spotlight = spotlight;
    }

    if (Object.keys(fields).length) {
      fields.updatedAt = STAMP;
      if (APPLY) await patch(id, fields);
      touched++;
    }
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${addedPositions} new Issue Position(s), ` +
    `${promiseKeys} promise issueKey(s), ${rekeyed} spotlight re-key(s) across ${touched} Firestore member(s).`);
  console.log(`(${missing} not in Firestore, ${skipped} error(s).)`);
  if (!APPLY) console.log('\nRe-run with --apply to write Firestore and patch index.html.');
})();
