#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — split ACCT_ALIAS's dual duty, fix the last dead profile clicks
// ---------------------------------------------------------------------------
//   node scripts/split-acct-alias-profile-resolution-jul2026.mjs           # dry run
//   node scripts/split-acct-alias-profile-resolution-jul2026.mjs --apply   # write
//
// THE DUAL DUTY, PRECISELY
//
// ACCT_ALIAS's own header states its purpose: resolve an id "back to the curated
// key when a direct lookup misses". That is a CURATED-DATA question — where does
// this person's theme blurb and ACCT_SPOTLIGHT driver list live — and its values
// are deliberately curated keys. Of its 61 entries, 44 happen to point at a live
// roster id and 17 point at a curated key, six of which name NOBODY in
// cmp-data.js: `kivory`, `wharper`, `seliason`, `klisonbee`, `dmccay`,
// `jteuscher`.
//
// Nearly every consumer wants that curated direction and is correct today:
// _slTheme (ACCT_THEME), the two ACCT_SPOTLIGHT driver resolvers in index.html,
// and the _acctKey helpers in say-vs-do.js, coverage.js, hr1-showcase.js,
// issue-view.js and stance-helpers.js. They use the result as a DATA key, never
// as a navigation target, so none of them is broken.
//
// Exactly one consumer wants the opposite answer — "which id has a real roster
// record?" — and that is profile loading. The previous pass taught openModal to
// follow ACCT_ALIAS on a miss, which fixed 48 spotlight-card clicks whose alias
// happened to land on a roster id. But for the six curated keys above, and for
// the five short pids whose alias targets them (`ken_ivory`, `eliason`,
// `teuscher`, `lisonbee`, `mccay`), following the same table lands on an id that
// names nobody and the modal still dead-ends on _pdxShowModalError. Reading one
// table for two questions is the whole defect.
//
// WHAT THIS PASS DOES
//
// Adds a second, single-purpose table instead of overloading the first, so the
// two questions stop fighting:
//
//   ACCT_ALIAS        id → curated key   (theme + ACCT_SPOTLIGHT)   UNCHANGED
//   PDX_PROFILE_ALIAS id → roster id     (profile loading)          new
//
// PDX_PROFILE_ALIAS is additive — ACCT_ALIAS is not edited at all, which is
// exactly why the ACCT_THEME blurb keeps working. Resolution now runs
// roster-id-first and the curated key is re-derived FROM the roster id by the
// existing ACCT_ALIAS entries, e.g. clicking `kivory` opens `ivory_h39`, and
// _slTheme('ivory_h39') follows the untouched `ivory_h39: 'kivory'` entry back to
// ACCT_THEME.kivory. Same for ACCT_SPOTLIGHT via _slKey. Verified for all 11.
//
// One resolver, window.PDXProfilePid(), is the single clear step. It keeps the
// single-hop-on-miss rule that was already the safest pattern: a candidate is
// only accepted if IT has a record, so nothing chains through a dead id, a real
// profile always wins over any alias, and an unknown id passes through untouched
// so _pdxShowModalError still fires honestly.
//
// The 2-hop chains ACCT_ALIAS contains (7, including the rosie_rivera ↔
// rosie_rivera_slco 2-cycle) are left in place: they are curated-key chains, and
// profile resolution no longer walks them at all. Documented in the tracker.
//
// No roster records invented — every one of the 11 people already has one; that
// is what made these fixable rather than missing-data.
//
// Corrective / wiring only. Idempotent: every edit tests for its own result.
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
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

// ── The 11 ids, id → live roster id ────────────────────────────────────────
// Six curated keys with no record of their own, plus the five short pids whose
// ACCT_ALIAS entry targets one of them. Each roster id was derived from the
// REVERSE of ACCT_ALIAS — `ivory_h39: 'kivory'` is the repo already asserting
// that ivory_h39 and kivory are the same person — and every value was checked to
// be a live cmp-data.js record.
const PROFILE_ALIAS = {
  kivory:    'ivory_h39',
  wharper:   'harper_s16',
  seliason:  'eliason_h45',
  klisonbee: 'lisonbee_h14',
  dmccay:    'mccay_s11',
  jteuscher: 'teuscher_h44',
  ken_ivory: 'ivory_h39',
  eliason:   'eliason_h45',
  teuscher:  'teuscher_h44',
  lisonbee:  'lisonbee_h14',
  mccay:     'mccay_s11',
};

console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN'} — ACCT_ALIAS dual-duty split\n`);

// ── 1. index.html — the new single-purpose table + resolver ────────────────
console.log('index.html — PDX_PROFILE_ALIAS + PDXProfilePid()');
{
  const anchor = `      ann_millner:       'amillner',
    };
`;
  const width = Math.max(...Object.keys(PROFILE_ALIAS).map((k) => k.length)) + 2;
  const rows = (ks) => ks
    .map((k) => `      ${(k + ':').padEnd(width)}'${PROFILE_ALIAS[k]}',`)
    .join('\n');
  sub('index.html', anchor, anchor + `
    // ── Profile-id resolution — the other half of ACCT_ALIAS's old dual duty ──
    // ACCT_ALIAS above answers "where is this person's CURATED data?" — its values
    // are theme / ACCT_SPOTLIGHT keys, and six of them (\`kivory\`, \`wharper\`,
    // \`seliason\`, \`klisonbee\`, \`dmccay\`, \`jteuscher\`) deliberately have no
    // cmp-data.js record at all. Profile loading needs the opposite answer: "which
    // id has a real roster record?" Reading ACCT_ALIAS for both questions is what
    // left \`ken_ivory\` → \`kivory\` resolving to an id that names nobody, so the
    // modal dead-ended even though Ken Ivory is in the roster as \`ivory_h39\`.
    //
    // This table answers ONLY the profile question, and only where ACCT_ALIAS
    // cannot. Every value MUST be a live cmp-data.js id — scripts/
    // test-identity-integrity.mjs section 11 enforces that, and also fails if a
    // new curated key is added without a bridge here. Each mapping is the REVERSE
    // of an existing ACCT_ALIAS entry (\`ivory_h39: 'kivory'\` is the repo already
    // saying those two ids are one person), so nothing here is a new claim.
    //
    // ACCT_ALIAS is intentionally NOT edited: the curated key is re-derived from
    // the roster id by its existing entries, which is why the ACCT_THEME blurb and
    // the ACCT_SPOTLIGHT drivers keep resolving after a click lands on the roster
    // id (\`kivory\` → opens \`ivory_h39\` → _slTheme follows \`ivory_h39: 'kivory'\`
    // → ACCT_THEME.kivory). Its 2-hop curated chains are left alone; profile
    // resolution no longer walks them.
    window.PDX_PROFILE_ALIAS = window.PDX_PROFILE_ALIAS || {
      // curated keys with no roster record of their own
${rows(['kivory', 'wharper', 'seliason', 'klisonbee', 'dmccay', 'jteuscher'])}
      // short browse / catalog pids whose ACCT_ALIAS entry targets one of those
${rows(['ken_ivory', 'eliason', 'teuscher', 'lisonbee', 'mccay'])}
    };

    // Resolve any id to one a profile can actually open, in a single step.
    // Single-hop-on-miss, deliberately: a candidate is accepted only if IT has a
    // record, so nothing chains through a dead id, a real profile always beats an
    // alias, and an unknown id passes through untouched so callers can still show
    // their own not-found state instead of silently opening the wrong person.
    window.PDXProfilePid = function (id) {
      if (!id) return id;
      var hasRec = function (x) {
        return !!((window.PROFILES && window.PROFILES[x]) ||
                  (typeof CMP_DATA !== 'undefined' && CMP_DATA[x]));
      };
      if (hasRec(id)) return id;
      var direct = window.PDX_PROFILE_ALIAS && window.PDX_PROFILE_ALIAS[id];
      if (direct && hasRec(direct)) return direct;
      var curated = window.ACCT_ALIAS && window.ACCT_ALIAS[id];
      if (curated && hasRec(curated)) return curated;
      return id;
    };
`, `PDX_PROFILE_ALIAS (${Object.keys(PROFILE_ALIAS).length} entries) + PDXProfilePid()`);
}

// ── 2. index.html — openModal uses the one resolver ───────────────────────
// Replaces the inline ACCT_ALIAS fall-through added by the previous pass: same
// single-hop-on-miss behaviour, but now via the table that is guaranteed to name
// a real record, so the six curated keys resolve too.
console.log('\nindex.html — openModal calls PDXProfilePid()');
sub('index.html',
  `    // A card or deep link may name a browse-directory pid (\`ray_ward\`) whose
    // curated record lives under a different id (\`rward\`). ACCT_ALIAS is that
    // bridge and every other surface that touches these ids already follows it —
    // the theme lookup, the Evidence Locker, the harness's own rosterFor(). This
    // resolution step did not, so a spotlight card keyed on a browse pid rendered
    // (nameFor()/officeFor() fall back to the card's literals), was clickable, and
    // then dead-ended on _pdxShowModalError. Followed ONLY when the id has no
    // record of its own, so a real profile always wins and canonicalization stays
    // a single hop — the same rule PDXCanonicalPid() and section 2 of the identity
    // harness enforce for the retired-id table.
    if (id && window.ACCT_ALIAS && window.ACCT_ALIAS[id] &&
        !(window.PROFILES && PROFILES[id]) &&
        !(typeof CMP_DATA !== 'undefined' && CMP_DATA[id])) {
      id = window.ACCT_ALIAS[id];
    }`,
  `    // A card, saved My-Team pick or deep link (?p=<id>) may name an id that is
    // not the one the roster record lives under — a browse pid (\`ray_ward\` →
    // \`rward\`) or a curated theme key (\`kivory\` → \`ivory_h39\`). PDXProfilePid()
    // is the single resolution step for that, and it is the ONLY place profile
    // loading asks the question, so every entry point below (including the cold
    // deep-link path and the lazy full-profile refetch) inherits the fix. It
    // guarantees the result has a real record or is the id unchanged, so the
    // _pdxShowModalError branch further down still fires honestly for a genuinely
    // unknown id. See PDX_PROFILE_ALIAS for why this is not ACCT_ALIAS.
    if (id && typeof window.PDXProfilePid === 'function') id = window.PDXProfilePid(id);`,
  'openModal() resolves via PDXProfilePid()');

// ── 3. harness — section 11 guards the new table and the whole class ───────
console.log('\nscripts/test-identity-integrity.mjs — section 11');
sub('scripts/test-identity-integrity.mjs',
  `// ── report ───────────────────────────────────────────────────────────────────`,
  `// ── 11. Profile resolution must reach a real roster record ──────────────────
// ACCT_ALIAS answers "where is the CURATED data" and its values are theme /
// ACCT_SPOTLIGHT keys — six of which (\`kivory\`, \`wharper\`, \`seliason\`,
// \`klisonbee\`, \`dmccay\`, \`jteuscher\`) name nobody in cmp-data.js on purpose.
// Profile loading asks the opposite question, so it reads PDX_PROFILE_ALIAS and
// resolves through window.PDXProfilePid(). This section pins both halves: the new
// table may only name live records, and — the part that catches the next
// regression rather than the last one — no id anywhere in the curated vocabulary
// may be left unresolvable while a roster record for that person demonstrably
// exists. That is exactly the state \`ken_ivory\` → \`kivory\` was in.
const PROFILE_ALIAS = liftObjectLiteral(
  "window.PDX_PROFILE_ALIAS = window.PDX_PROFILE_ALIAS ||", "PDX_PROFILE_ALIAS") || {};
ok(Object.keys(PROFILE_ALIAS).length > 0,
  "index.html: window.PDX_PROFILE_ALIAS was extracted (profile resolution needs it)");
for (const [from, to] of Object.entries(PROFILE_ALIAS)) {
  ok(!!(ROSTER && ROSTER[to]),
    \`profile alias: PDX_PROFILE_ALIAS['\${from}'] → '\${to}', which has no cmp-data.js \` +
    \`record — the whole point of this table is that its values are openable\`);
  ok(!RETIRED.has(to),
    \`profile alias: PDX_PROFILE_ALIAS['\${from}'] → '\${to}', which is retired — it would \` +
    \`resolve a click onto a dead id\`);
  ok(!(ROSTER && ROSTER[from]),
    \`profile alias: PDX_PROFILE_ALIAS['\${from}'] is itself a live roster id, so the entry \` +
    \`can never be consulted (a real record always wins) — remove it\`);
  ok(from !== to, \`profile alias: '\${from}' may not alias to itself\`);
}

// window.PDXProfilePid(), reimplemented exactly: single hop, a candidate is only
// accepted if IT has a record, unknown ids pass through.
const profilePid = (id) => {
  if (!id) return id;
  const hasRec = (x) => !!(ROSTER && ROSTER[x]);
  if (hasRec(id)) return id;
  if (PROFILE_ALIAS[id] && hasRec(PROFILE_ALIAS[id])) return PROFILE_ALIAS[id];
  if (ACCT_ALIAS[id] && hasRec(ACCT_ALIAS[id])) return ACCT_ALIAS[id];
  return id;
};
ok(profilePid("kivory") === "ivory_h39",
  "profile resolution: 'kivory' must open Ken Ivory's roster record 'ivory_h39' " +
  "(the dual-duty failure this section exists for)");
ok(profilePid("ray_ward") === "rward",
  "profile resolution: the ACCT_ALIAS fall-through still resolves 'ray_ward' → 'rward'");

// The class-wide guard. For every id in the curated vocabulary, if profile
// resolution fails BUT a roster record for that person is discoverable, the
// bridge is missing. "Discoverable" means some live roster id already aliases to
// this id (ACCT_ALIAS asserting they are one person) or a roster display name
// slugifies to it — never a fuzzy guess. Ids with no record anywhere are skipped:
// those need a roster record, which is a content decision, not a wiring one.
const reverseAlias = new Map();
for (const [k, v] of Object.entries(ACCT_ALIAS))
  if (ROSTER && ROSTER[k]) { if (!reverseAlias.has(v)) reverseAlias.set(v, []); reverseAlias.get(v).push(k); }
const rosterBySlug = new Map();
for (const [rid, rec] of Object.entries(ROSTER || {})) {
  if (!rec || typeof rec.name !== "string" || RETIRED.has(rid)) continue;
  const s = rec.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (s && !rosterBySlug.has(s)) rosterBySlug.set(s, rid);
}
const curatedVocab = new Set([
  ...Object.keys(ACCT_ALIAS), ...Object.values(ACCT_ALIAS), ...Object.keys(PROFILE_ALIAS),
]);
let profileChecked = 0;
for (const id of curatedVocab) {
  const resolved = profilePid(id);
  if (ROSTER && ROSTER[resolved]) { profileChecked++; continue; }
  const candidates = [
    ...(reverseAlias.get(id) || []),
    ...(rosterBySlug.has(id) ? [rosterBySlug.get(id)] : []),
  ].filter((c) => ROSTER && ROSTER[c] && !RETIRED.has(c));
  ok(candidates.length === 0,
    \`profile resolution: id '\${id}' opens no profile, but '\${candidates[0]}' is a live \` +
    \`roster record for the same person — add PDX_PROFILE_ALIAS['\${id}'] = \` +
    \`'\${candidates[0]}' so the click, deep link and saved pick resolve\`);
}
ok(profileChecked > 0,
  "profile resolution: at least one curated id resolved to a roster record, or this " +
  "check is vacuously green");

// ── report ───────────────────────────────────────────────────────────────────`,
  'section 11: profile resolution + class-wide missing-bridge guard');

// ── Verify before writing ─────────────────────────────────────────────────
console.log('');
if (failed) {
  console.error(`✗ ${failed} edit(s) could not be applied — nothing written.`);
  process.exit(1);
}

if (files.size) {
  const html = files.get('index.html') || read('index.html');
  const problems = [];

  // ACCT_ALIAS must be byte-for-byte untouched — the theme/driver path depends on it.
  const slice = (s) => {
    const i = s.indexOf('window.ACCT_ALIAS = window.ACCT_ALIAS ||');
    const o = s.indexOf('{', i);
    let d = 0; for (let j = o; j < s.length; j++) {
      if (s[j] === '{') d++; else if (s[j] === '}') { d--; if (!d) return s.slice(o, j + 1); }
    }
    return null;
  };
  if (slice(html) !== slice(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')))
    problems.push('ACCT_ALIAS was modified — the ACCT_THEME/ACCT_SPOTLIGHT path depends on it');

  if ((html.match(/window\.PDXProfilePid = function/g) || []).length !== 1)
    problems.push('PDXProfilePid is missing or duplicated');
  if (html.includes('id = window.ACCT_ALIAS[id];'))
    problems.push("openModal still reads ACCT_ALIAS directly — it should call PDXProfilePid()");
  if ((html.match(/id = window\.PDXProfilePid\(id\);/g) || []).length !== 1)
    problems.push('openModal does not call PDXProfilePid exactly once');
  for (const [k, v] of Object.entries(PROFILE_ALIAS))
    if (!new RegExp(`\\b${k}:\\s*'${v}'`).test(html))
      problems.push(`PDX_PROFILE_ALIAS is missing ${k} → ${v}`);

  // PDXProfilePid must be defined before any consumer relies on it at call time,
  // and the table must sit inside the same inline script as ACCT_ALIAS.
  if (html.indexOf('window.PDX_PROFILE_ALIAS') < html.indexOf('window.ACCT_ALIAS = window.ACCT_ALIAS ||'))
    problems.push('PDX_PROFILE_ALIAS must be declared after ACCT_ALIAS');

  if (problems.length) {
    console.error('✗ post-conditions failed — nothing written:');
    for (const p of problems) console.error('   · ' + p);
    process.exit(1);
  }
  console.log('✓ post-conditions pass (ACCT_ALIAS untouched, 11 bridges, 1 resolver, 1 call site)');
}

console.log(`\n${applied} edit(s) to apply, ${alreadyDone} already applied\n`);
if (!APPLY) { console.log('Dry run — re-run with --apply to write.\n'); process.exit(0); }
for (const [rel, src] of files) {
  fs.writeFileSync(path.join(ROOT, rel), src);
  console.log(`  wrote ${rel}`);
}
console.log('\nNow re-run: node scripts/test-identity-integrity.mjs\n');
