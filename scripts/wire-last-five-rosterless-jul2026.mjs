#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — close the last 5 dead profile clicks with minimal roster records
// ---------------------------------------------------------------------------
//   node scripts/wire-last-five-rosterless-jul2026.mjs           # dry run
//   node scripts/wire-last-five-rosterless-jul2026.mjs --apply   # write
//
// WHAT THIS CLOSES
//
// Five people existed under two ids each with curated content but NO cmp-data.js
// record under either id, so `PDXProfilePid()` had nothing to resolve to and both
// ids dead-ended on _pdxShowModalError. The seventh pass could not fix them with a
// bridge — a bridge cannot point at a record that does not exist — so it skipped
// them by design and flagged them as a content decision.
//
// Each pair was confirmed same-person before anything was written:
//   tclancy/tyler_clancy, dhawkins/jon_hawkins, escamilla/lescamilla — ACCT_ALIAS
//     entries added by earlier passes, with the sparse id carrying only a Power-Map
//     or catalog row and the rich id carrying the stance block and theme blurb.
//   mike_smith_utco/mike_smith_sheriff, mhogan/michelle_kaufusi — documented in
//     scripts/cleanup-utah-duplicate-records-jul2026.mjs as duplicate person
//     records collapsed to one curated key (UNION and DROP respectively), so the
//     repo itself already asserts each pair is one person. `mhogan` is Michelle
//     Kaufusi, not a second Michelle — its 4 unsourced duplicate cards were
//     dropped in that pass.
//
// NO NEW ALIASES ARE NEEDED. In all five pairs the existing ACCT_ALIAS entry
// already points sparse → rich, and PDXProfilePid()'s ACCT_ALIAS fall-through
// accepts a candidate as soon as it has a record. So adding the record under the
// rich id closes BOTH ids at once. PDX_PROFILE_ALIAS is not touched.
//
// PUBLIC RECORD (each record's shape follows from its subject's actual status)
//
//   Jon Hawkins      R · SITTING · Utah House District 55 (Pleasant Grove /
//                    American Fork, Utah County). In the House since Jan 1 2019 —
//                    District 57 2019–2023, District 55 2023–present. Full wiring:
//                    roster + _UTAH_HOUSE_INFO + KR_STATE_HOUSE_INCUMBENTS[55].
//                    House coverage 51 → 52 of 75.
//   Luz Escamilla    D · SITTING · Utah Senate District 10 (northwest Salt Lake
//                    City / West Valley City / Magna, Salt Lake County). Senate
//                    since Jan 1 2009 (District 1 2009–2023), Senate Minority
//                    Leader. She was ALREADY in both Senate tables — only the
//                    roster record was missing — so this adds no map entry.
//   Mike Smith       R · SITTING · Utah County Sheriff since Aug 2018, second
//                    term, 2026 GOP nominee for re-election. County office, so no
//                    district wiring applies.
//   Tyler Clancy     R · FORMER · Utah House District 60 (Provo) Jan 2023 –
//                    Mar 2026; resigned on appointment as Utah's state homeless
//                    coordinator, effective Mar 9 2026. Grant Pace holds District
//                    60 (wired in the fourth pass), so Clancy gets a record and
//                    deliberately NO map entry — a `termEnd` marks him former and
//                    assertion 10g would reject him from the House map anyway.
//   Michelle Kaufusi R · NO CURRENT OFFICE · Mayor of Provo 2018 – Jan 2026 (lost
//                    the Nov 2025 election to Marsha Judkins, who is already in
//                    this repo as `marsha_judkins_provo`); won the Jun 23 2026
//                    Republican primary for Utah County Commission Seat A, general
//                    election Nov 2026. Time-qualified office, no map entry.
//
// Two districts were checked against the public record rather than assumed:
// District 55 is a Utah County seat (Utah County's own election-map site lists it
// with American Fork / Pleasant Grove / Alpine / Highland / Lehi / Lindon / Orem),
// but _UTAH_HOUSE_COUNTY called it 'Salt Lake County'. That table is documented in
// index.html as "PARTIALLY STALE ... built on pre-2023 numbering" for districts no
// member occupies, and 55 was not in its verified list — so this corrects it, which
// is what assertion 10f exists to force.
//
// MINIMAL, NOT INVENTED. Every record is `score: null` with kept/broken/pending 0
// because no promise-tracking pass has run for these five, matching Miller / Pace /
// Larson. Every `issues` array is lifted VERBATIM from content already in the repo —
// the member's own stance-card topics in block order, capped at five to match the
// 4–5 the surrounding records carry — except Escamilla, who has no stance block, so
// hers comes verbatim from the `keyIssues` already authored for her in
// EXPANSION_SUGGESTIONS. No stance, score, or narrative text is created anywhere.
//
// Escamilla's catalog entry also carries score 82 / 18-3-4. That is an unverified
// import-surface figure, so it is NOT copied into the roster; `score: null` is the
// honest value until a promise pass sources it.
//
// Corrective / wiring only. Idempotent: every edit tests for its own result.
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--apply');
const files = new Map();
let applied = 0, alreadyDone = 0, failed = 0;

const read = (rel) =>
  files.has(rel) ? files.get(rel) : fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Replace `from` with `to` exactly once; already-applied edits are no-ops. */
function sub(rel, from, to, label) {
  const src = read(rel);
  if (src.includes(to)) { alreadyDone++; console.log(`  ·  ${label} — already applied`); return; }
  const n = src.split(from).length - 1;
  if (n !== 1) { failed++; console.log(`  ✗  ${label} — anchor found ${n} times, expected 1`); return; }
  files.set(rel, src.replace(from, to));
  applied++; console.log(`  +  ${label}`);
}

console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN'} — five minimal roster records\n`);

// ── 1. cmp-data.js — the five records ──────────────────────────────────────
console.log('cmp-data.js — 5 roster records');
{
  const tailAnchor = `  "issues": ["Veterans & Military", "Property Rights", "Property Taxes", "Charter & Public Education", "Citizen Referenda on Local Bonds"]
 }
});`;
  const records = `  "issues": ["Veterans & Military", "Property Rights", "Property Taxes", "Charter & Public Education", "Citizen Referenda on Local Bonds"]
 },
 // SEVENTH July 2026 pass — the last five people who had curated content but no
 // roster record under EITHER of their two ids, so both ids dead-ended on
 // _pdxShowModalError. No alias was added for any of them: the ACCT_ALIAS entry
 // already pointed the sparse id at the id these records use, and PDXProfilePid()
 // accepts that hop the moment the target has a record. Same minimal pattern as
 // Miller / Pace / Larson — \`score\` null and kept/broken/pending 0 because no
 // promise-tracking pass has run, and \`issues\` lifted verbatim from each person's
 // own stance-card topics in block order (capped at five, matching the records
 // above). Districts and counties confirmed against the public record first.
 //
 // SITTING, fully wired into _UTAH_HOUSE_INFO + KR_STATE_HOUSE_INCUMBENTS[55].
 // In the House since Jan 2019: District 57 2019–2023, District 55 2023–present.
 // District 55 is a Utah County seat (Pleasant Grove / American Fork), which is why
 // this pass also corrects _UTAH_HOUSE_COUNTY[55] from 'Salt Lake County'.
 "jon_hawkins": {
  "name": "Jon Hawkins", "office": "Utah State Representative",
  "state": "UT District 55 (Pleasant Grove / American Fork, Utah County)",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2019-01",
  "issues": ["Economic Development", "Online Child Safety & Digital Wellness", "Stronger Sexual-Offense Laws", "Public Safety & Crime", "Sports & Recreation"]
 },
 // SITTING, and already present in BOTH Senate tables (_UTAH_SENATE_INFO d:10 and
 // KR_STATE_SENATE_INCUMBENTS[10]) — the roster record was the only missing layer,
 // so this adds no map entry. In the Senate since Jan 2009 (District 1 2009–2023,
 // District 10 2023–present) and Senate Minority Leader. She is the one person here
 // with no stance block, so \`issues\` is lifted verbatim from the \`keyIssues\` already
 // authored for her in EXPANSION_SUGGESTIONS; that entry's score 82 / 18-3-4 is an
 // unverified import figure and is deliberately NOT copied.
 "lescamilla": {
  "name": "Luz Escamilla", "office": "Utah State Senator",
  "state": "UT District 10 (Northwest Salt Lake City / West Valley City / Magna, Salt Lake County)",
  "party": "D", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2009-01",
  "issues": ["Healthcare Access", "Air Quality & Inversion", "Intergenerational Poverty", "Language Access"]
 },
 // SITTING county officer — sheriff since Aug 2018 (appointed to a vacancy, then
 // elected), second term, 2026 Republican nominee for re-election, and president of
 // the Utah Sheriffs' Association. A county office, so no district wiring applies.
 // Icon matches the one his own curated stance block already uses.
 "mike_smith_sheriff": {
  "name": "Mike Smith", "office": "Utah County Sheriff",
  "state": "Utah · Utah County",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🛡",
  "termStart": "2018-08",
  "issues": ["Backing Deputies & Community Safety", "Deputy Wellness & Mental Health", "Second Amendment", "Transparency", "Rehabilitation in Corrections"]
 },
 // FORMER — held House District 60 (Provo) from Jan 2023 until he resigned in March
 // 2026 on appointment as Utah's state homeless coordinator (effective Mar 9 2026).
 // Grant Pace holds District 60, so Clancy gets a record and deliberately NO entry
 // in _UTAH_HOUSE_INFO or KR_STATE_HOUSE_INCUMBENTS. The \`termEnd\` and the "Former"
 // in \`office\` are both load-bearing: assertion 10g rejects either one from the
 // sitting House map, which is what keeps this from becoming another phil_lyman_h69.
 // The year range in \`state\` time-qualifies the district the same way Brammer's
 // House cards do, so no surface reads it as a live claim on seat 60.
 "tyler_clancy": {
  "name": "Tyler Clancy", "office": "Utah State Homeless Coordinator · Former UT State Representative",
  "state": "UT District 60 (Provo, Utah County) 2023–2026",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2023-01", "termEnd": "2026-03",
  "issues": ["Homelessness", "Public Safety", "Mental Health & Addiction Recovery", "Criminal Justice & Second Chances", "Taxes & Limited Government"]
 },
 // NO CURRENT OFFICE — mayor of Provo from Jan 2018 until Jan 2026, when she lost
 // the Nov 2025 election to Marsha Judkins (already here as \`marsha_judkins_provo\`,
 // which is why her old "Mayor of Provo" spotlight label is corrected in this pass:
 // two people cannot both hold it). She won the Jun 23 2026 Republican primary for
 // Utah County Commission Seat A; the general election is Nov 2026. Both facts are
 // time-qualified in \`office\`, so no surface claims she currently holds either post.
 "michelle_kaufusi": {
  "name": "Michelle Kaufusi", "office": "Former Mayor, Provo · 2026 Utah County Commission Nominee (Seat A)",
  "state": "Utah",
  "party": "R", "score": null, "kept": 0, "broken": 0, "pending": 0, "icon": "🏛",
  "termStart": "2018-01", "termEnd": "2026-01",
  "issues": ["Fiscal Discipline & Property Taxes", "Efficient County Government", "Infrastructure & Regional Planning", "ICE & Immigration Enforcement", "Experienced Executive Leadership"]
 }
});`;
  sub('cmp-data.js', tailAnchor, records, '5 records (hawkins, escamilla, smith, clancy, kaufusi)');
}

// ── 2. index.html — District 55 wiring for the one newly sitting member ────
console.log('\nindex.html — District 55 (Jon Hawkins)');
sub('index.html',
  `      kay_christofferson:      { d: 53, c: 'Utah County' },\n`,
  `      kay_christofferson:      { d: 53, c: 'Utah County' },\n` +
  `      jon_hawkins:             { d: 55, c: 'Utah County' },\n`,
  `_UTAH_HOUSE_INFO: jon_hawkins { d: 55, c: 'Utah County' }`);

sub('index.html',
  `      53:'kay_christofferson', 56:'valpeterson_h56',`,
  `      53:'kay_christofferson', 55:'jon_hawkins', 56:'valpeterson_h56',`,
  `KR_STATE_HOUSE_INCUMBENTS[55] = 'jon_hawkins'`);

// _UTAH_HOUSE_COUNTY is documented as stale for districts no member occupied.
// District 55 was not in its verified list and is a Utah County seat.
sub('index.html',
  `54:'Salt Lake County', 55:'Salt Lake County',`,
  `54:'Salt Lake County', 55:'Utah County',`,
  `_UTAH_HOUSE_COUNTY[55]: 'Salt Lake County' → 'Utah County'`);

// ── 3. index.html — Power-Map rows follow the roster ids ───────────────────
// META is keyed by the id pmInjectDynamicCards looks up in PROFILES, which is the
// roster id — the same re-key the Albrecht pass made for the same reason. Only
// Hawkins is moved: Clancy's row is left alone ON PURPOSE, because it is a
// 'STATE HOUSE' row and he is no longer a representative.
console.log('\nindex.html — Power-Map META');
sub('index.html',
  `      dhawkins:['pm-tier-state','STATE HOUSE','utah_co','district3'],`,
  `      jon_hawkins:['pm-tier-state','STATE HOUSE','utah_co','district3'],`,
  `META: dhawkins → jon_hawkins (matches the roster id)`);

sub('index.html',
  `      tclancy:['pm-tier-state','STATE HOUSE','utah_co','district3'],`,
  `      // Do NOT re-key to \`tyler_clancy\`: he resigned District 60 in March 2026 to\n` +
  `      // become the state homeless coordinator, and this is a 'STATE HOUSE' row, so\n` +
  `      // matching it to his roster id would inject a card calling a former member a\n` +
  `      // sitting representative. Left on the old pid, where it stays inert.\n` +
  `      tclancy:['pm-tier-state','STATE HOUSE','utah_co','district3'],`,
  `META: tclancy annotated (must stay unmatched — former member)`);

// ── 4. spotlights-data.js — Kaufusi's label is no longer true ──────────────
// She left the Provo mayoralty in January 2026 and this repo already carries
// `marsha_judkins_provo` as "Mayor of Provo". Adding the word "Former" is the whole
// change — no new claim, and it stops two people holding one office on screen.
console.log('\nspotlights-data.js — Kaufusi office label');
sub('spotlights-data.js',
  `{ id: 'michelle_kaufusi', name: 'Michelle Kaufusi', office: 'Mayor of Provo · Utah',`,
  `{ id: 'michelle_kaufusi', name: 'Michelle Kaufusi', office: 'Former Mayor of Provo · Utah',`,
  `spotlight card: 'Mayor of Provo' → 'Former Mayor of Provo'`);

// ── Verify before writing ─────────────────────────────────────────────────
console.log('');
if (failed) {
  console.error(`✗ ${failed} edit(s) could not be applied — nothing written.`);
  process.exit(1);
}

if (files.size) {
  const problems = [];
  const html = files.get('index.html') || read('index.html');
  const cmp = files.get('cmp-data.js') || read('cmp-data.js');

  // cmp-data.js must still parse, and must gain exactly the five records.
  let ROSTER = null;
  try {
    const ctx = { window: {}, document: {} };
    vm.createContext(ctx);
    vm.runInContext(cmp, ctx);
    ROSTER = ctx.CMP_DATA || ctx.window.CMP_DATA;
  } catch (e) { problems.push(`cmp-data.js no longer parses: ${e.message}`); }

  const NEW = ['jon_hawkins', 'lescamilla', 'mike_smith_sheriff', 'tyler_clancy', 'michelle_kaufusi'];
  if (ROSTER) {
    for (const id of NEW)
      if (!ROSTER[id]) problems.push(`cmp-data.js is missing the new record '${id}'`);
    // Nobody may share a name with a live record (harness section 9).
    const byName = new Map();
    for (const [id, rec] of Object.entries(ROSTER)) {
      if (!rec || typeof rec.name !== 'string') continue;
      if (!byName.has(rec.name)) byName.set(rec.name, []);
      byName.get(rec.name).push(id);
    }
    for (const id of NEW) {
      const dupes = (byName.get(ROSTER[id] && ROSTER[id].name) || []).filter((x) => x !== id);
      if (dupes.length) problems.push(`'${id}' shares the name "${ROSTER[id].name}" with ${dupes.join(', ')}`);
    }
    // A former member may not read as sitting.
    for (const id of ['tyler_clancy', 'michelle_kaufusi'])
      if (ROSTER[id] && !ROSTER[id].termEnd) problems.push(`'${id}' is former but carries no termEnd`);
    if (ROSTER.jon_hawkins && ROSTER.jon_hawkins.termEnd)
      problems.push('jon_hawkins is sitting but carries a termEnd');
    for (const id of NEW)
      if (ROSTER[id] && ROSTER[id].score !== null)
        problems.push(`'${id}' must have score null (no promise pass has been run)`);
  }

  // The whole point: every one of the ten ids must now open a profile. This mirrors
  // window.PDXProfilePid() exactly, including its single-hop-on-miss rule.
  const lift = (anchor) => {
    const i = html.indexOf(anchor);
    if (i < 0) return null;
    const o = html.indexOf('{', i);
    let d = 0;
    for (let j = o; j < html.length; j++) {
      if (html[j] === '{') d++;
      else if (html[j] === '}') { d--; if (!d) { const c = vm.createContext({}); return vm.runInContext('(' + html.slice(o, j + 1) + ')', c); } }
    }
    return null;
  };
  const ACCT_ALIAS = lift('window.ACCT_ALIAS = window.ACCT_ALIAS ||') || {};
  const PROFILE_ALIAS = lift('window.PDX_PROFILE_ALIAS = window.PDX_PROFILE_ALIAS ||') || {};
  const hasRec = (x) => !!(ROSTER && ROSTER[x]);
  const profilePid = (id) => {
    if (!id) return id;
    if (hasRec(id)) return id;
    if (PROFILE_ALIAS[id] && hasRec(PROFILE_ALIAS[id])) return PROFILE_ALIAS[id];
    if (ACCT_ALIAS[id] && hasRec(ACCT_ALIAS[id])) return ACCT_ALIAS[id];
    return id;
  };
  const PAIRS = [
    ['tclancy', 'tyler_clancy'], ['dhawkins', 'jon_hawkins'],
    ['escamilla', 'lescamilla'], ['mike_smith_utco', 'mike_smith_sheriff'],
    ['mhogan', 'michelle_kaufusi'],
  ];
  for (const [sparse, rich] of PAIRS) {
    if (profilePid(sparse) !== rich)
      problems.push(`'${sparse}' resolves to '${profilePid(sparse)}', expected '${rich}'`);
    if (profilePid(rich) !== rich)
      problems.push(`'${rich}' does not resolve to itself`);
  }

  // No alias table should have been touched — the record is the whole fix.
  const origHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const sliceOf = (s, anchor) => {
    const i = s.indexOf(anchor);
    if (i < 0) return null;
    const o = s.indexOf('{', i);
    let d = 0;
    for (let j = o; j < s.length; j++) {
      if (s[j] === '{') d++; else if (s[j] === '}') { d--; if (!d) return s.slice(o, j + 1); }
    }
    return null;
  };
  for (const anchor of ['window.ACCT_ALIAS = window.ACCT_ALIAS ||',
                        'window.PDX_PROFILE_ALIAS = window.PDX_PROFILE_ALIAS ||'])
    if (sliceOf(html, anchor) !== sliceOf(origHtml, anchor))
      problems.push(`${anchor.split(' ')[0]} was modified — the record alone should close these clicks`);

  // District 55 must agree across all three tables.
  if (!/jon_hawkins:\s+\{ d: 55, c: 'Utah County' \}/.test(html))
    problems.push('_UTAH_HOUSE_INFO is missing jon_hawkins at district 55');
  if (!/55:'jon_hawkins'/.test(html))
    problems.push("KR_STATE_HOUSE_INCUMBENTS[55] is not 'jon_hawkins'");
  if (!/55:'Utah County'/.test(html))
    problems.push("_UTAH_HOUSE_COUNTY[55] was not corrected to 'Utah County'");
  if (/55:'Salt Lake County'/.test(html))
    problems.push("_UTAH_HOUSE_COUNTY[55] still reads 'Salt Lake County'");

  if (problems.length) {
    console.error('✗ post-conditions failed — nothing written:');
    for (const p of problems) console.error('   · ' + p);
    process.exit(1);
  }
  console.log(`✓ post-conditions pass (${ROSTER ? Object.keys(ROSTER).length : '?'} roster records, ` +
              `all 10 ids resolve, alias tables untouched, district 55 agrees in 3 tables)`);
}

console.log(`\n${applied} edit(s) to apply, ${alreadyDone} already applied\n`);
if (!APPLY) { console.log('Dry run — re-run with --apply to write.\n'); process.exit(0); }
for (const [rel, src] of files) {
  fs.writeFileSync(path.join(ROOT, rel), src);
  console.log(`  wrote ${rel}`);
}
console.log('\nNow re-run: node scripts/test-identity-integrity.mjs\n');
