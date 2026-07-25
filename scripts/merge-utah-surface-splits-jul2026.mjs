#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — resolve the Utah "surface-split" identity pairs (July 2026)
// ---------------------------------------------------------------------------
//   node scripts/merge-utah-surface-splits-jul2026.mjs           # dry run
//   node scripts/merge-utah-surface-splits-jul2026.mjs --apply   # write
//
// THE PREMISE THIS PASS CORRECTS
//
// The task that prompted it described ~20 Utah people existing under two ids,
// "one id holds the roster + map wiring, the other holds stance or spotlight
// content", creating "parallel identities and unreachable cards". Twenty-five
// such pairs do exist. But they are NOT parallel identities, and — with exactly
// one exception — no stance card is unreachable. Measured before touching
// anything:
//
//   • Each pair has ONE cmp-data.js roster record, never two. Section 9 of the
//     identity harness has never fired for any of them, correctly.
//   • For 24 of 25, the name-slug id holds ALL the stance cards and the roster
//     id holds ZERO. Nothing is shadowed; there is nothing to union.
//   • _stanceSlug(ROSTER[rosterId].name) === the name-slug id for all 25, so
//     _resolveStanceList() reaches every block through its documented name-slug
//     fallback, and every real read path goes through that resolver
//     (index.html's stanceList(), alignment-tool.js enumerates keys).
//
// This two-key layout is deliberate and documented. db/vr-pid-aliases.json says
// so for Cullimore — "curated stance cards stay under the name-slug key
// `kirk_cullimore` per this file's stance-key convention; STANCE_ALIASES bridges
// both ids to it" — and the harness says so in section 7's own comment: keying
// off STANCES[pid] "would push the fix toward renaming the block instead of
// wiring the bridge". So this pass does NOT rename the 24 stance blocks.
//
// Two structural facts make that more than a style preference. Registering the
// name-slug ids as retired in db/vr-pid-aliases.json would trip section 3
// ("politician-stances.js still has a '<retired>' block"), forcing exactly the
// renames the harness warns against. And re-keying the spotlight cards onto the
// roster ids would drive section 6's `aliasResolved` counter to zero — the
// assertion whose comment reads "if this drops to zero the ACCT_ALIAS
// fall-through has stopped reaching any card and the Ray Ward hole has
// reopened". Both invariants point the same way: bridge, don't rename.
//
// WHAT WAS ACTUALLY BROKEN
//
// The user-visible defect is real, and it is in the click path, not the data.
// A spotlight card keyed on a browse pid renders fine — nameFor()/officeFor()/
// iconFor() fall back to the card's own literals — and is clickable. The click
// runs toProfile() → showProfile() → openModal(), and openModal resolves ONLY
// `PROFILES[id] || CMP_DATA[id]`. It never consults ACCT_ALIAS, unlike every
// other surface that handles these ids. So all 48 cards across the 25 pairs
// dead-ended on _pdxShowModalError ("This profile couldn't be loaded") even for
// the 7 pairs ACCT_ALIAS already bridged. Two fixes, in the two layers:
//
//   1. openModal() follows ACCT_ALIAS when — and only when — the id has no
//      record of its own, so a real profile always wins and the hop is single.
//   2. The 18 pairs ACCT_ALIAS did not yet bridge get their entry, which both
//      feeds fix 1 and brings their 29 previously-unchecked cards under section
//      6's label check (verified pre-flight: 0 new failures).
//
// THE ONE TRUE MERGE
//
// derek_brown / derek_brown_ut is the only pair matching the premise, and it is
// the Albrecht shape exactly: FOUR sourced stance cards under each id. Because
// _resolveStanceList() hits ISSUE_STANCE_DATA[id] first, the roster id's four
// thin AG-wave cards win and the four richer ones (TikTok and Snap litigation,
// the "return trust" pledge, federalism, fentanyl) are unreachable from the
// canonical profile. Same person, confirmed from content: both blocks cite
// attorneygeneral.utah.gov and describe the sitting Utah AG. Merged the Albrecht
// way — grafted cards go at the TOP, because two issueKeys collide
// (tech_balance, lands_local) and an issueKey-only findStance() lookup must
// resolve the richer sourced card first. No topic string collides, so section 7
// stays green. Its 3 spotlight cards are re-keyed, as section 4 requires of a
// retired id, and the retirement is registered in all three alias tables.
//
// Corrective only: no new stances, scores, narrative, or roster records.
// Idempotent — every edit tests for its own result, so a second --apply is a
// no-op. See scripts/UTAH-LAUNCH-CLEANUP-TRACKER.md.
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

/**
 * Replace `from` with `to` exactly once. Already-applied edits are no-ops.
 *
 * The already-applied test is `to` ALONE, not "`to` present and `from` absent":
 * most of these edits are insertions written as sub(file, anchor, anchor + added),
 * so the anchor is still there afterwards and the stricter test would happily
 * insert the same block a second time. (That exact bug bit the previous pass in
 * this series; it was caught by re-running the dry run after applying.)
 */
function sub(rel, from, to, label) {
  const src = read(rel);
  if (src.includes(to)) { alreadyDone++; console.log(`  ·  ${label} — already applied`); return; }
  const n = src.split(from).length - 1;
  if (n !== 1) { failed++; console.log(`  ✗  ${label} — anchor found ${n} times, expected 1`); return; }
  files.set(rel, src.replace(from, to));
  applied++; console.log(`  +  ${label}`);
}

// ── The 25 pairs, name-slug id → roster id ─────────────────────────────────
// Derived by matching _stanceSlug(roster.name) against every spotlight card id
// that has no roster record of its own. Every one resolved to exactly one roster
// id — no pair was ambiguous and none looked like two different people.
const BRIDGE = {
  derek_brown:       'derek_brown_ut',
  evan_vickers:      'evickers',
  mike_mckell:       'mckell_s25',
  mike_schultz:      'mschultz',
  steve_eliason:     'eliason_h45',
  karen_kwan:        'kwan_s12',
  daniel_mccay:      'mccay_s11',
  ariel_defay:       'defay_h15',
  wayne_harper:      'harper_s16',
  keith_grover:      'kgrover',
  kirk_cullimore:    'kcullimore',
  mike_kohler:       'kohler_h59',
  rosie_rivera:      'rosie_rivera_slco',
  sandra_hollins:    'hollins_h24',
  angela_romero:     'aromero',
  karianne_lisonbee: 'lisonbee_h14',
  jordan_teuscher:   'teuscher_h44',
  ann_millner:       'amillner',
};

console.log(`\n${APPLY ? 'APPLYING' : 'DRY RUN'} — Utah surface-split pairs\n`);

// ── 1. index.html — bridge the 18 unaliased pairs ──────────────────────────
console.log('index.html — ACCT_ALIAS bridges');
{
  const anchor = `      calbrecht: 'carl_albrecht',`;
  const width = Math.max(...Object.keys(BRIDGE).map((k) => k.length)) + 2;
  const rows = Object.entries(BRIDGE)
    .map(([k, v]) => `      ${(k + ':').padEnd(width)}'${v}',`)
    .join('\n');
  sub('index.html', anchor,
    anchor + `
      // July 2026 surface-split sweep — browse-directory pid → curated roster id
      // for the Utah legislators whose spotlight cards are keyed on a slug of
      // their display name while their cmp-data.js record lives under a short id.
      // These are ONE person with one roster record, not merged duplicates: the
      // curated stance block stays under the name-slug key per this repo's
      // stance-key convention (see db/vr-pid-aliases.json and STANCE_ALIASES),
      // and _resolveStanceList()'s name-slug fallback already reached it. What
      // was missing is the profile hop — openModal() resolves PROFILES/CMP_DATA
      // and, before this pass, never followed ACCT_ALIAS, so tapping any of these
      // cards dead-ended on "This profile couldn't be loaded". Bridging them here
      // also brings their cards under section 6's label-vs-roster check.
      // (\`derek_brown\` is the exception — a genuine retired id, see below.)
${rows}`,
    `ACCT_ALIAS += ${Object.keys(BRIDGE).length} browse-pid bridges`);
}

// ── 2. index.html — openModal follows the alias ────────────────────────────
console.log('\nindex.html — openModal alias fall-through');
{
  const anchor = `  function openModal(id) {
    // Personal Impact Tracker (opt-in, private): opening a full profile is the`;
  sub('index.html', anchor,
    `  function openModal(id) {
    // A card or deep link may name a browse-directory pid (\`ray_ward\`) whose
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
    }
    // Personal Impact Tracker (opt-in, private): opening a full profile is the`,
    'openModal() resolves ACCT_ALIAS on miss');
}

// ── 3. politician-stances.js — union-merge derek_brown → derek_brown_ut ────
// Cards are lifted out of the file verbatim rather than re-typed, so the merge
// cannot silently reword a sourced claim.
console.log('\npolitician-stances.js — derek_brown → derek_brown_ut');
{
  const rel = 'politician-stances.js';
  const src = read(rel);
  const startRe = /\n    derek_brown: \[\n/;
  const m = startRe.exec(src);
  const target = '    derek_brown_ut: [ // Derek Brown — ⚖️ Utah Attorney General (R)\n';

  if (!m && src.includes(target)) {
    alreadyDone++; console.log('  ·  derek_brown block already folded in — already applied');
  } else if (!m) {
    failed++; console.log('  ✗  derek_brown block not found');
  } else if (!src.includes(target)) {
    failed++; console.log('  ✗  derek_brown_ut block header not found');
  } else {
    const bodyStart = m.index + m[0].length;
    const end = src.indexOf('\n    ],\n', bodyStart);
    if (end === -1) {
      failed++; console.log('  ✗  could not find the end of the derek_brown block');
    } else {
      const body = src.slice(bodyStart, end);        // the four cards, verbatim
      const cards = (body.match(/^      \{ topic:/gm) || []).length;
      if (cards !== 4) {
        failed++; console.log(`  ✗  expected 4 derek_brown cards, found ${cards}`);
      } else {
        // Drop the whole `derek_brown: [ … ],\n` entry, then graft its cards to
        // the top of derek_brown_ut.
        let out = src.slice(0, m.index + 1) + src.slice(end + '\n    ],\n'.length);
        out = out.replace(target,
          target +
          '      // Merged from the retired `derek_brown` id (July 2026 surface-split\n' +
          '      // sweep). Grafted ABOVE the original cards because two issueKeys\n' +
          '      // collide — tech_balance and lands_local — and findStance() returns the\n' +
          '      // FIRST match, so the sourced, more specific card has to come first.\n' +
          body + '\n');
        files.set(rel, out);
        applied++; console.log('  +  4 sourced cards grafted to the top of derek_brown_ut');
      }
    }
  }
}

// ── 4. spotlights-data.js — re-key the 3 retired-id cards ──────────────────
// Section 4 of the harness forbids a spotlight card carrying a retired id.
console.log('\nspotlights-data.js — re-key derek_brown cards');
{
  const rel = 'spotlights-data.js';
  const src = read(rel);
  const n = src.split(`{ id: 'derek_brown',`).length - 1;
  if (n === 0 && src.includes(`{ id: 'derek_brown_ut',`)) {
    alreadyDone++; console.log('  ·  cards already re-keyed — already applied');
  } else if (n !== 3) {
    failed++; console.log(`  ✗  expected 3 derek_brown cards, found ${n}`);
  } else {
    files.set(rel, src.split(`{ id: 'derek_brown',`).join(`{ id: 'derek_brown_ut',`));
    applied++; console.log('  +  3 cards re-keyed derek_brown → derek_brown_ut');
  }
}

// ── 5. stance-helpers.js — both client alias tables ────────────────────────
console.log('\nstance-helpers.js — alias tables');
sub('stance-helpers.js',
  `      kcullimore:'kirk_cullimore', calbrecht:'carl_albrecht'`,
  `      kcullimore:'kirk_cullimore', calbrecht:'carl_albrecht',
      // \`derek_brown\` is the content-side duplicate of Utah AG Derek Brown: it
      // held four sourced cards that ISSUE_STANCE_DATA['derek_brown_ut'] shadowed
      // outright, since the direct id hit wins over every fallback. Folded into
      // the roster id; this keeps an old bookmark or saved pick resolving.
      derek_brown:'derek_brown_ut'`,
  'STANCE_ALIASES += derek_brown');

sub('stance-helpers.js',
  `      susan_collins: 'collins', kennedy_rfk: 'rfkjr', cullimore_s19: 'kcullimore',
      calbrecht: 'carl_albrecht'`,
  `      susan_collins: 'collins', kennedy_rfk: 'rfkjr', cullimore_s19: 'kcullimore',
      calbrecht: 'carl_albrecht', derek_brown: 'derek_brown_ut'`,
  'PDX_PID_ALIASES += derek_brown');

sub('stance-helpers.js',
  `    // duplicate, merged into the roster id \`carl_albrecht\`) is that case again.`,
  `    // duplicate, merged into the roster id \`carl_albrecht\`) is that case again.
    // \`derek_brown\` (the Utah Attorney General's content-side duplicate, merged
    // into the roster id \`derek_brown_ut\`) is the same case once more — a state
    // officer casts no congressional roll calls, so there are no rows to move.`,
  'PDX_PID_ALIASES comment notes derek_brown');

// ── 6. db/vr-pid-aliases.json — the auditable retirement record ────────────
// Section 8 requires the note to either name a migration or state that the id
// held no DB rows, in a form a reader can check.
console.log('\ndb/vr-pid-aliases.json — retirement record');
sub('db/vr-pid-aliases.json',
  `    "calbrecht": "carl_albrecht"
  },`,
  `    "calbrecht": "carl_albrecht",
    "derek_brown": "derek_brown_ut"
  },`,
  'aliases += derek_brown');

sub('db/vr-pid-aliases.json',
  `scripts/UTAH-LAUNCH-CLEANUP-TRACKER.md."
  }`,
  `scripts/UTAH-LAUNCH-CLEANUP-TRACKER.md.",
    "derek_brown": "Derek Brown (R, Utah Attorney General since Jan 2025). ONE person under two ids, split by SURFACE and the only true duplicate among the 25 Utah 'surface-split' pairs swept in July 2026 — the other 24 are a single roster record whose curated stance block is keyed on a slug of the person's display name, which is this file's documented stance-key convention and not a duplicate identity at all. Here both ids carried real content: 'derek_brown_ut' held the cmp-data.js roster record (State Attorney General, Utah, score 53) plus four thin AG-wave stance cards, while 'derek_brown' held four richer bill-sourced cards (the TikTok and Snap child-safety litigation, the 'return trust to the office' pledge succeeding Sean Reyes, federalism and public lands, fentanyl enforcement) and three spotlight cards. Because _resolveStanceList() tries ISSUE_STANCE_DATA[id] before any fallback, the roster id's thinner block won and all four sourced cards were unreachable from the canonical profile. No merge migration: he holds no DB rows under either id — the vr_* tables carry congressional roll calls and a state attorney general casts none, so no roll-call row can be attributed to him — which is a statement about the schema rather than a fresh branch-DB count taken in this pass. That is exactly what the alias covers: the ingest canonicalizes on write and the Voting Record API on read, so a future source attributing a row to 'derek_brown' lands on 'derek_brown_ut' instead of re-opening the split. 'derek_brown_ut' is canonical because it is the ROSTER id, the same rule used for 'carl_albrecht'. Merged by scripts/merge-utah-surface-splits-jul2026.mjs (idempotent, dry-run by default): the four sourced cards were grafted ABOVE the four originals (two issueKeys collide — tech_balance and lands_local — and an issueKey-only findStance() lookup must resolve the sourced card first; no topic string collides, so section 7 stays green), the three spotlight cards were re-keyed, and index.html's ACCT_ALIAS keeps 'derek_brown' → 'derek_brown_ut' so a saved pick under the old id still resolves. The four inherited AG-wave cards are the record's remaining quality gap: all four cite only the office's own homepage. See scripts/UTAH-LAUNCH-CLEANUP-TRACKER.md."
  }`,
  'notes += derek_brown provenance');

// ── Verify before writing ─────────────────────────────────────────────────
console.log('');
if (failed) {
  console.error(`✗ ${failed} edit(s) could not be applied — nothing written.`);
  process.exit(1);
}

if (files.size) {
  const stances = files.get('politician-stances.js') || read('politician-stances.js');
  const problems = [];

  if (/\n    derek_brown: \[/.test(stances))
    problems.push('politician-stances.js still has a top-level derek_brown block');

  // The merged block must hold exactly 8 cards with 8 distinct topic strings.
  const utStart = stances.indexOf('    derek_brown_ut: [');
  const utEnd = stances.indexOf('\n    ],\n', utStart);
  const utBody = stances.slice(utStart, utEnd);
  const nCards = (utBody.match(/^      \{ topic:/gm) || []).length;
  if (nCards !== 8) problems.push(`derek_brown_ut has ${nCards} cards, expected 8`);
  const topics = [...utBody.matchAll(/^      \{ topic:'((?:[^'\\]|\\.)*)'/gm)].map((x) => x[1]);
  const dupes = topics.filter((t, i) => topics.indexOf(t) !== i);
  if (dupes.length) problems.push(`derek_brown_ut repeats topic(s): ${dupes.join(', ')}`);
  if (topics.length !== nCards)
    problems.push(`only parsed ${topics.length} of ${nCards} topic strings — check quoting`);

  const spots = files.get('spotlights-data.js') || read('spotlights-data.js');
  if (spots.includes(`{ id: 'derek_brown',`))
    problems.push('spotlights-data.js still has a card on the retired id derek_brown');

  const html = files.get('index.html') || read('index.html');
  for (const [k, v] of Object.entries(BRIDGE))
    if (!new RegExp(`\\b${k}:\\s*'${v}'`).test(html))
      problems.push(`ACCT_ALIAS is missing ${k} → ${v}`);
  if (!/ray_ward: 'rward'/.test(html))
    problems.push("ACCT_ALIAS lost ray_ward → rward (harness asserts it verbatim)");
  if ((html.match(/id = window\.ACCT_ALIAS\[id\];/g) || []).length !== 1)
    problems.push('openModal alias fall-through is missing or duplicated');

  const aliases = JSON.parse(files.get('db/vr-pid-aliases.json') || read('db/vr-pid-aliases.json'));
  if (aliases.aliases.derek_brown !== 'derek_brown_ut')
    problems.push('db/vr-pid-aliases.json missing derek_brown → derek_brown_ut');
  if (!/\bno\b[^.]{0,20}\bdb rows\b/i.test(aliases.notes.derek_brown || ''))
    problems.push('derek_brown note does not satisfy the section 8 provenance regex');
  for (const retired of Object.keys(aliases.aliases))
    if (new RegExp(`\\n    ${retired}: \\[`).test(stances))
      problems.push(`retired id ${retired} still has a stance block`);

  if (problems.length) {
    console.error('✗ post-conditions failed — nothing written:');
    for (const p of problems) console.error('   · ' + p);
    process.exit(1);
  }
  console.log('✓ post-conditions pass (8 merged cards, 8 distinct topics, 18 bridges, 1 alias hop)');
}

console.log(`\n${applied} edit(s) to apply, ${alreadyDone} already applied\n`);
if (!APPLY) { console.log('Dry run — re-run with --apply to write.\n'); process.exit(0); }
for (const [rel, src] of files) {
  fs.writeFileSync(path.join(ROOT, rel), src);
  console.log(`  wrote ${rel}`);
}
console.log('\nNow re-run: node scripts/split-stances.mjs && node scripts/test-identity-integrity.mjs\n');
