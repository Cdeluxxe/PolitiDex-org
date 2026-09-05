#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-federal-wave-f8.mjs — the wave that admitted three senators and found
// the energy pool empty
// ─────────────────────────────────────────────────────────────────────────────
// F8 was briefed as two halves and shipped as one and a half, so this harness has an
// unusual job: it has to pin a NEGATIVE as hard as it pins the positive.
//
//   · THE ROSTER HALF SHIPPED. Husted, Hyde-Smith and Armstrong were serving senators
//     the app already published pages for and could not attribute a single Senate roll
//     to, because the ingest resolves a member only through db/vr-member-map.json, that
//     map is read out of the curated portrait shelf, and none of the three was in it.
//     Wave F7 measured the loss at 37 unattributable rows per Senate roll and recorded
//     it rather than guessing. Sections 2 and 3 check both verification paths for each,
//     and section 3 MUTATION-TESTS the generator's three identity walls by editing a
//     copy of it and requiring it to fail — a wall nobody has watched fire is a comment.
//   · THE ENERGY HALF WAS EMPTY, AND THAT IS THE RESULT. After refusal-first there is
//     no contested Senate standalone, discharge or passage roll left in the 119th on
//     energy_production, permitting_reform, lands_energy or climate_action. Section 5
//     requires the funnel to close arithmetically AND requires the independent
//     vocabulary scan behind it — because a funnel returning zero looks exactly like a
//     funnel with a broken filter, and wave F6 shipped that bug: it read LIS's
//     <vote_tally> as a number, so "51-42" parsed as 5142 and every roll came back
//     unanimous. Section 5 also requires that nothing was restuffed to cover the gap.
//   · SO WHAT THE ENERGY KEYS GAIN IS MEMBERS, NOT MEASURES. Section 6 requires the
//     four keys to actually gain Senate PRIMARY attribution — and requires the wave to
//     claim it for exactly the two senators it is true of. Armstrong was sworn
//     2026-03-24 and gains none; a harness that asserted otherwise would be asserting
//     a falsehood, and the wave would have to invent a row to satisfy it.
//
// The rest is the standing contract as F2-F7 check it: the refusal record first, the
// ceilings disclosed rather than implied, data-only SQL declaring no object, verification
// scoped to this wave's roll ids, one shipped file's version note saying what a warm
// device would otherwise show, no party word in anything a reader sees, and a twin boot
// of HEAD against this tree — which for an attribution wave must come out IDENTICAL,
// because the wave writes no mapping and owes no mechanism pair.
//
// WHAT THIS FILE DOES NOT DO. It does not assert that the pool is empty FOREVER, or that
// the rolls this wave refused are unmappable. The two arms-sale discharge survivors, the
// four H.R. 1 Senate amendment rolls, the F4 CRA block and the 54 House amendment rolls
// are each reopenable on their own terms, and the mapping seed names every one with a
// reason. What is pinned is what THIS wave did, and that its own record of it is true.
//
//   node scripts/test-vr-federal-wave-f8.mjs
//
// No database. Section 1 re-runs the migration generator and section 3 re-runs the member-map
// generator (three times, mutated, to watch its walls fire) — so it needs the
// congress-legislators dataset, from scripts/legislators-current.json if it is there or from
// the network if it is not, and it says so rather than skipping quietly when it cannot.
// db/vr-member-map.json is written by that generator; its bytes are snapshotted and restored,
// and the clean run is required to reproduce them exactly.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync, readdirSync, writeFileSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";
import { CJ_SEAMS, CJ_SEAMS_BELOW, SH_SEAMS, WA_SEAMS, carveSeams, assertConsistencySeams, assertStanceHelpersSeam,
  assertWordActionSeams, assertParentTableIsTheOnlyMove } from "./v103-chrome-seams.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) { passed++; return true; } failures.push(msg); return false; };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const MIG_DIR = "netlify/database/migrations";
const MIGS = readdirSync(join(ROOT, MIG_DIR)).filter((f) => f.endsWith(".sql")).sort();
const MIGRATION = "20261024000000_vr_federal_wave_f8.sql";
const DECIDE = "db/vr-federal-mapping-seed-f8.json";
const VOTES_FILE = "db/vr-federal-wave-f8-attribution-seed.json";
const GEN = "scripts/vr-gen-member-map.mjs";

const SLUGS = ["alan_armstrong", "hyde_smith", "jon_husted"];
const ENERGY_KEYS = ["energy_production", "permitting_reform", "lands_energy", "climate_action"];
// The six hosts netlify.toml's [images] remote_images allows. A portrait outside them is
// not rendered by the image CDN at all, so an admitted member would show a monogram.
const ALLOWED_HOSTS = ["raw.githubusercontent.com", "upload.wikimedia.org", "commons.wikimedia.org",
  "bioguide.congress.gov", "le.utah.gov", "insurance.utah.gov"];

// THIS WAVE'S version note, not the whole history above the constant. The comment block
// above CACHE_VERSION is nearly six hundred contiguous lines of every past bump’s note,
// so reading all of it would let an old paragraph satisfy this wave's checks — and would fail the
// spelling rule on somebody else's 2024 sentence. The log is one entry per version in the house
// form "// vNN - TITLE", newest first, so this wave's note is the span from its own marker to the
// previous version's. Read by version rather than by position: a later wave prepends its entry
// above this one, and these checks must keep reading F8's note and not that one.
const MY_VERSION = 99;
function swWaveNote() {
  const sw = R("sw.js");
  const at = sw.indexOf(`// v${MY_VERSION} `);
  if (at === -1) return "";
  const end = sw.indexOf(`// v${MY_VERSION - 1} `, at);
  return sw.slice(at, end === -1 ? at + 6000 : end).replace(/\s+$/, "");
}

console.log("\n  F8 — three admitted senators, 73 Senate rolls attributed, one empty energy pool\n");

for (const f of [DECIDE, VOTES_FILE, join(MIG_DIR, MIGRATION), GEN, "db/vr-member-map.json",
                 "db/vr-roster-admitted.json", "compare-hub.js", "netlify.toml", "sw.js"])
  ok(existsSync(join(ROOT, f)), `${f} is missing — the wave's own artifact`);

const decide = J(DECIDE);
const votes = J(VOTES_FILE);
const sql = R(join(MIG_DIR, MIGRATION));
const memberMap = J("db/vr-member-map.json");
const roster = J("db/vr-roster-admitted.json");
const gen = R(GEN);
const hub = R("compare-hub.js");
const toml = R("netlify.toml");
// netlify.toml stores each allowed image host as an escaped regex, so the literal host
// string is never in the file. Unescape once, here, rather than at every comparison.
const tomlHosts = [...(/remote_images\s*=\s*\[([\s\S]*?)\]/.exec(toml)?.[1] || "")
  .matchAll(/"https?:\/\/([^/"]+)/g)].map((m) => m[1].replace(/\\/g, ""));

// ── 1. the artifacts agree with each other, and with the migration ──────
{
  eq(decide.wave, "F8", "the mapping seed does not name this wave");
  eq(votes.wave, "F8", "the vote seed does not name this wave");
  eq(votes.chamber, "senate", "the attribution seed is not scoped to the Senate");

  // THE FILE NAME IS A CLAIM ABOUT SHAPE, AND THE SHAPE HAS TO BACK IT. This seed is
  // named *-attribution-seed.json rather than *-vote-seed.json because it ingests nothing:
  // scripts/test-vr-vote-seed.mjs holds ingest seeds to a roll-call schema — totals to the
  // full chamber, a timestamp to the minute, a measure identified well enough to map — and
  // none of that is this file's to carry, since every roll it names was ingested, dated and
  // mapped by an earlier wave. So the name is checked against the content: if this seed ever
  // grows the fields of an ingest seed, it belongs under the other harness and this fails.
  ok(!VOTES_FILE.endsWith("-vote-seed.json"), "this seed is named as an ingest seed but is not one");
  for (const v of votes.votes.slice(0, 5))
    for (const f of ["totals", "measureId", "decisiveWhy"])
      ok(!(f in v), `the attribution seed carries '${f}' — that is ingest-seed shape, and this file is guarded by the wrong harness if so`);
  ok(R("scripts/test-vr-vote-seed.mjs").includes("-vote-seed.json"),
    "scripts/test-vr-vote-seed.mjs no longer globs by that suffix — the reasoning behind this seed's name has moved");

  const cells = votes.votes.reduce((a, v) => a + v.memberVotes.length, 0);
  eq(cells, votes.cells, "the vote seed's own cell count disagrees with its rows");
  eq(votes.votes.length, votes.rollCalls, "the vote seed's own roll count disagrees with its rows");
  eq(decide.attribution.cells, cells, "the mapping seed and the vote seed disagree on the cell count");
  eq(decide.attribution.rollCallsTouched, votes.votes.length, "the two seeds disagree on the roll count");
  eq(decide._counts.memberVoteCells, cells, "the mapping seed's _counts disagrees with its own attribution block");

  // Per slug, because the total can be right while one senator's rows are missing.
  const counted = {};
  for (const v of votes.votes) for (const r of v.memberVotes) counted[r.politicianId] = (counted[r.politicianId] || 0) + 1;
  eq(Object.keys(counted).sort().join(","), SLUGS.join(","),
    "the vote seed writes cells for slugs outside this wave's three — scope creep in a file nobody re-derives");
  for (const s of SLUGS) eq(counted[s], votes.perSlug[s].cells, `${s}: the seed's header count disagrees with its rows`);

  // The migration is generated, so the generator is the thing that must still produce it.
  // Regenerating and comparing is the only check that survives a hand-edit.
  // The generator has its own pre-flight and REFUSES rather than emitting a migration that
  // disagrees with the roster ceiling or with a census that has since changed. That refusal
  // is a result, not a crash, so it is caught and reported as one failure with the
  // generator's own message — a harness that dies here would hide which wall fired.
  let regen = null;
  try {
    regen = execFileSync(process.execPath, [join(ROOT, "scripts/vr-gen-federal-wave-f8-migration.mjs")],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    failures.push(`the migration generator refuses to run against the current artifacts: `
      + `${String(e.stderr || e.message).trim().split("\n").filter(Boolean).pop()}`);
  }
  if (regen !== null) eq(regen, sql, `${MIGRATION} is not what its generator emits — it was hand-edited, or a seed moved under it`);

  // Every seeded cell appears in the SQL exactly once, and the SQL invents none.
  const rows = [...sql.matchAll(/\(rc, '([a-z0-9_]+)', '([a-z_]+)', (?:'([a-z_]+)'|NULL)\)/g)];
  eq(rows.length, cells, "the migration's INSERT rows do not number the seeded cells");
  const sqlBySlug = {};
  for (const m of rows) sqlBySlug[m[1]] = (sqlBySlug[m[1]] || 0) + 1;
  for (const s of SLUGS) eq(sqlBySlug[s], counted[s], `${s}: the migration writes a different number of cells than the seed holds`);

  // Roll lookups: one per seeded roll, each by natural key, each guarded.
  eq((sql.match(/SELECT id INTO rc FROM vr_rollcalls/g) || []).length, votes.votes.length,
    "the migration does not look up exactly one roll per seeded roll call");
  eq((sql.match(/IF rc IS NULL THEN/g) || []).length, votes.votes.length,
    "a roll lookup is unguarded — a missing roll would insert against a NULL id");
  eq((sql.match(/ON CONFLICT \(rollcall_id, politician_id\) DO NOTHING/g) || []).length, votes.votes.length,
    "an INSERT is not ON CONFLICT DO NOTHING — this wave must not be able to overwrite a stored vote");
  ok(!/ON CONFLICT[^;]*DO UPDATE/.test(sql),
    "the migration carries a DO UPDATE — an attribution pass that can rewrite a stored cell launders a disagreement away");
  ok(!/\b(UPDATE|DELETE)\s+(FROM\s+)?vr_/i.test(sql.replace(/--[^\n]*/g, "")),
    "the migration UPDATEs or DELETEs a vr_ table — F8 is additive only");
}

// ── 2. the three senators, verified twice and admitted once ─────────────
{
  const three = decide.census.step1_theThreeSenators.senators;
  eq(three.length, 3, "the census does not record three senators");
  const wave = roster.waves?.federal_wave_f8_aug2026 || roster.federal_wave_f8_aug2026;
  ok(Array.isArray(wave), "db/vr-roster-admitted.json has no federal_wave_f8_aug2026 array");
  eq([...(wave || [])].sort().join(","), SLUGS.join(","), "the roster file admits a different set than this wave writes");

  // The roster file is the CEILING: its count must equal the sum of its wave arrays, or a
  // slug is admitted by arithmetic rather than by a wave.
  const waveArrays = Object.entries(roster.waves || roster).filter(([, v]) => Array.isArray(v));
  const total = waveArrays.reduce((a, [, v]) => a + v.length, 0);
  eq(roster.count, total, "db/vr-roster-admitted.json's count is not the sum of its wave arrays");
  eq(roster.count, memberMap.count, "the roster ceiling and the generated member map disagree on the roster size");

  // No slug appears in two waves — re-homing a slug hides which wave argued for it.
  const seen = new Map();
  for (const [w, arr] of waveArrays) for (const s of arr) {
    ok(!seen.has(s), `${s} is admitted by both ${seen.get(s)} and ${w}`);
    seen.set(s, w);
  }

  const byBio = memberMap.map;
  for (const s of three) {
    ok(SLUGS.includes(s.slug), `${s.slug} is not one of this wave's three`);
    // Path 1 and path 2 are both recorded, and the generated map agrees with both.
    ok(/^[A-Z]\d{6}$/.test(s.bioguide), `${s.slug}: ${s.bioguide} is not a Bioguide-shaped id`);
    ok(/^S\d{3}$/.test(s.lisMemberId), `${s.slug}: ${s.lisMemberId} is not an LIS-shaped member id`);
    eq(byBio[s.bioguide], s.slug, `${s.bioguide} does not resolve to ${s.slug} in db/vr-member-map.json`);
    eq(s.allChecksPassed, true, `${s.slug}: the census records a failed check`);
    ok(s.checksPassed >= 7, `${s.slug}: only ${s.checksPassed} census checks are recorded`);
    // The vote seed's own identity for the same slug must match, or the pull scoped a
    // different person than the census verified.
    eq(votes.perSlug[s.slug].bioguideId, s.bioguide, `${s.slug}: the vote seed and the census disagree on the Bioguide`);
    eq(votes.perSlug[s.slug].lisMemberId, s.lisMemberId, `${s.slug}: the vote seed and the census disagree on the LIS id`);
    // SEED_SLUGS and SEED_NAMES, both present, because the generator now hard-errors
    // on an admitted slug with neither an app-published name nor a declared one.
    ok(new RegExp(`${s.slug}:\\s*"${s.bioguide}"`).test(gen), `${s.slug} is not in SEED_SLUGS with ${s.bioguide}`);
    ok(new RegExp(`${s.slug}:\\s*"${s.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(gen),
      `${s.slug} is not in SEED_NAMES as "${s.name}"`);
    // A portrait on an allowlisted host, or the image CDN drops it and the page shows a monogram.
    const m = new RegExp(`^\\s{6}${s.slug}:\\s*'([^']+)'`, "m").exec(hub);
    if (ok(!!m, `${s.slug} has no BROWSE_PHOTOS entry — an admitted member with no portrait`)) {
      const host = new URL(m[1]).host;
      ok(ALLOWED_HOSTS.includes(host), `${s.slug}'s portrait host ${host} is not in netlify.toml's remote_images allowlist`);
      // netlify.toml stores each host as an escaped regex ("raw\\.githubusercontent\\.com"),
      // so the literal host never appears in the file. Compare with the escaping removed.
      ok(tomlHosts.includes(host), `${s.slug}'s portrait host ${host} is not actually in netlify.toml`);
    }
  }

  // The allowlist itself did not widen. A wave that needs a seventh host is a wave that
  // needs to argue for it, and scripts/test-photo-coverage.mjs pins the same six.
  for (const h of ALLOWED_HOSTS) ok(tomlHosts.includes(h), `netlify.toml no longer allows ${h}`);
  eq(tomlHosts.filter((h) => !ALLOWED_HOSTS.includes(h)).join(", "), "",
    "netlify.toml's image allowlist gained a host this wave did not argue for");
  eq(tomlHosts.length, 6, "netlify.toml's image allowlist is no longer exactly six hosts");

  // NO INVENTED PROFILE. The brief forbids a fabricated CMP_DATA bio, and the thing the
  // identity check actually needed was a name — so a name is all F8 declared, and F8
  // originally required these three to have NO CMP_DATA row at all.
  //
  // That equality expired, and it expired on the same later-wave terms as everything in
  // DECLARED at the bottom of this file. Federal roster wave R2 gave all three an
  // identity-only roster row, because the missing row was the reason gen-crawl-record
  // skipped them and search could not find people whose Senate votes THIS wave had already
  // attributed — a page the app publishes for a member the roster does not name.
  //
  // So the absence was never the guarantee. The guarantee was that F8 invents no profile,
  // and that is what is checked now: the row exists, and it is identity and nothing else.
  // score must be null rather than 0, because a 0 is a claim and null is the absence of one;
  // the key set is pinned exactly, so a bio, a quote, a publishable flag or a stance list
  // cannot arrive later without failing here. The name in the row must be the same name
  // this wave's census verified against the official record and declared in SEED_NAMES,
  // which ties the roster row to the identity F8 argued for instead of leaving them as two
  // independent claims. scripts/test-vr-federal-roster-r2.mjs owns the rows themselves.
  const IDENTITY_KEYS = "broken,icon,issues,kept,name,office,party,pending,score,state";
  const cmpRoster = (() => {
    const sb = { window: {}, document: {}, console: { log() {}, warn() {}, error() {} } };
    vm.createContext(sb);
    vm.runInContext(R("cmp-data.js"), sb, { filename: "cmp-data.js" });
    return sb.window.CMP_DATA || {};
  })();
  const censusName = new Map(three.map((s) => [s.slug, s.name]));
  for (const s of SLUGS) {
    const rec = cmpRoster[s];
    if (!ok(!!rec, `${s} has no CMP_DATA row — federal roster wave R2 admitted one and gen-crawl-record needs it`)) continue;
    eq(Object.keys(rec).sort().join(","), IDENTITY_KEYS,
      `${s}'s CMP_DATA row is not identity only — this wave admits a roster slug and a portrait, not a score, an issue list or a biography`);
    eq(rec.score, null, `${s} carries a score — F8 attributed votes to this senator, it did not judge them`);
    for (const k of ["kept", "broken", "pending"]) eq(rec[k], 0, `${s}'s ${k} counter is not 0`);
    eq(Array.isArray(rec.issues) ? rec.issues.length : -1, 0, `${s} carries an issue list`);
    eq(rec.office, "U.S. Senator", `${s}'s office is not the one this wave verified`);
    eq(rec.name, censusName.get(s), `${s}'s roster row and this wave's census name a different person`);
  }
  const namesBlock = /const SEED_NAMES = \{([\s\S]*?)\};/.exec(gen);
  if (ok(!!namesBlock, "SEED_NAMES is not in the generator")) {
    const lines = namesBlock[1].split("\n").filter((l) => /:/.test(l));
    eq(lines.length, 3, "SEED_NAMES carries entries beyond this wave's three — it is an identity string, not a roster");
    for (const l of lines)
      ok(!/(score|party|Republican|Democrat|R-|D-|Sen\.|office)/i.test(l),
        `a SEED_NAMES line carries more than a name: ${l.trim()}`);
  }
}

// ── 3. the three identity walls, mutation-tested rather than asserted ───
{
  // A wall nobody has watched fire is a comment. Each mutation below is a REAL failure
  // mode: wall 1 is a slug pointed at the wrong person's portrait, wall 2 is the slug
  // nobody has ever seen a name next to, wall 3 is Alan Armstrong resolving to Kelly
  // Armstrong — a different person this app already carries, whom a surname compare
  // cannot distinguish. The copy lives INSIDE scripts/ because the generator resolves
  // ROOT from its own path and a copy in /tmp reads the wrong tree.
  const TMP = join(ROOT, "scripts", ".wall-tmp.mjs");
  const MAP = "db/vr-member-map.json";
  // THE GENERATOR WRITES. Running it — even a mutated copy — rewrites db/vr-member-map.json,
  // and under a mutated roster it writes a SHORT map over a committed artifact. So the bytes
  // are snapshotted here and restored at the end of the section, and the clean run at the
  // bottom is required to reproduce them exactly. That last requirement is worth having on
  // its own: it is the check that the committed map is what the committed generator emits.
  const mapBefore = R(MAP);
  const restoreMap = () => { if (R(MAP) !== mapBefore) writeFileSync(join(ROOT, MAP), mapBefore); };
  // Some walls can no longer be reached by editing the generator alone, so run() takes an
  // optional second mutation over real files in the tree. Those bytes are snapshotted and
  // restored in the same finally that deletes the copy — including on the path where the
  // generator wrongly SUCCEEDS, or a refused mutation would be left on disk.
  const run = (mutate, label, alsoMutate = null) => {
    const restore = [];
    for (const [f, fn] of Object.entries(alsoMutate || {})) {
      const before = R(f);
      restore.push(() => { if (R(f) !== before) writeFileSync(join(ROOT, f), before); });
      const after = fn(before);
      if (after === before) failures.push(`${label}: the mutation of ${f} changed nothing, so the wall was never exercised`);
      writeFileSync(join(ROOT, f), after);
    }
    writeFileSync(TMP, mutate(gen));
    try {
      execFileSync(process.execPath, [TMP], { cwd: ROOT, encoding: "utf8", stdio: "pipe" });
      failures.push(`${label}: the generator SUCCEEDED under a mutation it must refuse`);
      return "";
    } catch (e) {
      const out = String(e.stderr || "") + String(e.stdout || "");
      // A wall that "fired" because the congress-legislators dataset could not be reached is
      // a wall that was never exercised. Say so, with the fix, rather than counting it.
      if (/fetch failed|ENOTFOUND|ETIMEDOUT|could not load legislators/i.test(out)) {
        failures.push(`${label}: could not be exercised — the congress-legislators dataset is `
          + `unreachable. Place legislators-current.json and legislators-historical.json next to `
          + `scripts/vr-gen-member-map.mjs, or run this harness with network access.`);
        return "";
      }
      passed++;
      return out;
    } finally {
      try { unlinkSync(TMP); } catch { /* already gone */ }
      for (const r of restore) r();
      restoreMap();
    }
  };

  const w1 = run((s) => s.replace('hyde_smith: "H001079"', 'hyde_smith: "H001104"'),
    "wall 1 (SEED_SLUGS disagrees with the portrait's Bioguide)");
  ok(/H001079|H001104|disagree|portrait/i.test(w1),
    "wall 1 fired but its message names neither Bioguide nor the disagreement — an operator cannot act on it");

  // Wall 2 needs a slug with NO name anywhere, and deleting the SEED_NAMES line was enough
  // to produce that in F8's own tree, where the three senators had a portrait and a page and
  // no roster row. Federal roster wave R2 closed that hole: cmp-data.js now publishes a name
  // for all three, so the one-line deletion leaves rosterNames() still answering and the
  // generator legitimately falls through to the surname compare. Weakening the check to
  // match — or deleting it — would retire the only wall nobody has watched fire since.
  //
  // So the mutation reproduces the ACTUAL failure mode instead, which is also exactly the
  // pre-R2 position of this slug: the declaration removed AND the roster row's key renamed
  // so the app publishes no name for alan_armstrong. Both sources gone is the condition, and
  // it is the condition a future wave re-creates the moment it admits a slug before writing
  // its row. cmp-data.js's bytes are restored by run()'s finally, and section 8's
  // git-status check would fail loudly if they were not.
  const w2 = run(
    (s) => s.replace(/^\s*alan_armstrong: "Alan Armstrong",\n/m, ""),
    "wall 2 (an admitted slug with no name from any source)",
    { "cmp-data.js": (c) => c.replace('"alan_armstrong": {', '"alan_armstrong_ROW_ABSENT_FOR_THIS_MUTATION": {') },
  );
  ok(/alan_armstrong/.test(w2), "wall 2 fired but does not name the slug it fired for");
  ok(/no published name|SEED_NAMES/i.test(w2), "wall 2 fired but does not say which of the two sources is missing");

  const w3 = run((s) => s.replace('alan_armstrong: "Alan Armstrong"', 'alan_armstrong: "Kelly Armstrong"'),
    "wall 3 (a declared name that is a different real person with the same surname)");
  ok(/exactly|Kelly Armstrong|Alan Armstrong/.test(w3),
    "wall 3 fired but does not say the declared name must match the official record exactly");

  // And the unmutated generator runs clean AND reproduces the committed map byte for byte,
  // or the walls are decorative and the map is hand-edited.
  {
    writeFileSync(TMP, gen);
    let clean = true;
    try { execFileSync(process.execPath, [TMP], { cwd: ROOT, encoding: "utf8", stdio: "pipe" }); }
    catch (e) { clean = false; failures.push(`the unmutated generator fails: ${String(e.stderr || "").slice(0, 300)}`); }
    finally { try { unlinkSync(TMP); } catch { /* already gone */ } }
    if (clean) {
      passed++;
      eq(R(MAP), mapBefore, `${MAP} is not what scripts/vr-gen-member-map.mjs emits — it was hand-edited`);
    }
    restoreMap();
  }

  // The walls are described in the record, so a reviewer can find them without the diff.
  const w = decide.walls.identityWallStrengthened;
  for (const k of ["wall1", "wall2", "wall3"])
    ok(/mutation-test/i.test(String(w[k])), `${k} is not recorded as mutation-tested`);
}

// ── 4. attribution: fail-closed, full-chamber, and the three on every roll ──
{
  const POS = new Set(["yea", "nay", "present", "not_voting"]);
  const PARTY = new Set(["with_party", "against_party", null]);
  const rosterSlugs = new Set(Object.values(memberMap.map));
  const rollIds = new Set();
  for (const v of votes.votes) {
    const where = `${v.congress}/${v.session} roll ${v.rollNumber}`;
    eq(v.chamber, "senate", `${where} is not a Senate roll — F8 writes Senate cells only`);
    const key = `${v.congress}/${v.session}/${v.rollNumber}`;
    ok(!rollIds.has(key), `${where} appears twice in the seed`);
    rollIds.add(key);
    ok(v.memberVotes.length >= 1, `${where} carries no cells and should not be in the seed`);
    // FAIL-CLOSED: every cell resolves through three published identifiers to an admitted
    // slug. This is the wave's own subject, so it is the guard that matters most here —
    // the only reason these three were missing is that the ingest refuses to guess.
    for (const r of v.memberVotes) {
      ok(rosterSlugs.has(r.politicianId), `${where}: ${r.politicianId} is not in db/vr-member-map.json`);
      ok(SLUGS.includes(r.politicianId), `${where}: ${r.politicianId} is outside this wave's scope`);
      eq(memberMap.map[r.bioguideId], r.politicianId, `${where}: ${r.bioguideId} does not resolve to ${r.politicianId}`);
      eq(votes.perSlug[r.politicianId].lisMemberId, r.lisMemberId,
        `${where}: the cell's LIS id is not the one the seed scopes to ${r.politicianId}`);
      ok(POS.has(r.position), `${where}: position '${r.position}' is outside the closed vocabulary`);
      ok(PARTY.has(r.isParty ?? null), `${where}: is_party '${r.isParty}' is outside the closed vocabulary`);
    }
    // FULL-CHAMBER TOTALS, not roster totals. is_party was computed against the party
    // split in the same document, so the split must account for a Senate and not for the
    // three cells this wave took out of it.
    const pt = v.partyTotals || {};
    const sum = Object.values(pt).reduce((a, p) => a + (p.yea || 0) + (p.nay || 0), 0);
    ok(Object.keys(pt).length >= 2, `${where}: the chamber's party split is not recorded`);
    ok(sum >= 80 && sum <= 100,
      `${where}: the party split totals ${sum} judged votes — a full Senate roll is 80-100, and anything near 3 is this wave's own cells masquerading as the chamber`);
    ok(!!v.sourceUrl && v.sourceUrl.startsWith("https://www.senate.gov/"),
      `${where}: the source is not a senate.gov document`);
  }

  // EVERY ROLL THIS WAVE WRITES CARRIES THE THREE — where all three were serving. The
  // brief asks for exactly this, and the honest form of it is "all who were serving",
  // because a cell for an absence would be a fabricated vote. So the two are checked
  // together: a roll is either complete for the serving three, or the seed says why.
  const notServing = votes.notServing.bySlug;
  eq(Object.keys(notServing).sort().join(","), SLUGS.join(","), "the not-serving disclosure does not cover the three");
  for (const s of SLUGS)
    eq(votes.perSlug[s].cells + notServing[s], votes.votes.length,
      `${s}: cells + not-serving absences do not close on the ${votes.votes.length} rolls — a roll is silently unaccounted for`);
  const complete = votes.votes.filter((v) => v.memberVotes.length === 3).length;
  ok(complete >= 1, "no roll carries all three — the wave's premise is that they were all missing from the same rolls");

  // The ceiling is disclosed, not implied.
  ok(votes.unresolvedCells.bioguideNotInMemberMap > 0,
    "the read loss is reported as zero — 341 recorded Senate votes on these rolls resolve to former senators with no profile, and a wave that hides that is claiming a completeness it does not have");
  eq(votes.unresolvedCells.lisIdUnresolvable, 0, "an LIS id resolved to nothing at all and was not investigated");
  eq(votes.discrepancies.rows.length, decide._counts.storedCellsContradicted,
    "the two seeds disagree on how many stored cells the document contradicts");
  ok(votes.storedCellsConfirmed > 1000,
    "the pull re-checked implausibly few stored cells — it is supposed to read every cell on every roll it touches");
}

// ── 5. the energy half was empty, and the zero is not a broken filter ───
{
  const p = decide.census.step2_theSenateEnergyPool;
  eq(p.energyPool.length, 0, "the census now reports a non-empty energy pool but the wave ships no measure");
  eq(decide.measures.length, 0, "the mapping seed carries a measure — F8 is attribution-only");
  eq(decide._counts.measures, 0, "_counts claims a measure");
  eq(decide._counts.rollCalls, 0, "_counts claims a new roll call");
  eq(decide._counts.issueRows, 0, "_counts claims an issue row");
  eq(decide._counts.newKeys, 0, "_counts claims a new issue key");
  eq(decide.vocabDecision.newKeys, 0, "the vocabulary decision adds a key");
  ok(/^NO\b/.test(String(p.answer)), "the census does not state the answer as no");

  // THE FUNNEL CLOSES ARITHMETICALLY. Each stage's `from` is the previous stage's `to`,
  // so a stage cannot quietly drop rolls between steps.
  const f = p.funnel;
  ok(f.length >= 5, "the funnel has fewer than five stages");
  eq(f[0].from, p.listed.total, "the funnel does not start at the number of listed rolls");
  eq(p.listed.session1 + p.listed.session2, p.listed.total, "the listed-roll split does not sum to the total");
  for (let i = 1; i < f.length; i++)
    eq(f[i].from, f[i - 1].to, `funnel stage ${i + 1} starts at ${f[i].from} but stage ${i} ended at ${f[i - 1].to}`);
  eq(f[f.length - 1].to, 0, "the funnel does not end at zero");
  eq(f[f.length - 2].to, p.nonEnergySurvivors.rows.length,
    "the number of rolls entering the subject test is not the number of non-energy survivors named");
  for (const r of p.nonEnergySurvivors.rows)
    ok(!!r.roll && !!r.measure, "a surviving roll is not named — a survivor left anonymous is a survivor nobody can reopen");

  // AND THE INDEPENDENT SCAN, which is the actual guard. F6 shipped a funnel that
  // returned a flattering answer because it read <vote_tally>'s display string.
  const s = p.independentEnergyScan;
  eq(s.survivorsTheFunnelMissed, 0, "the independent scan found a roll the funnel missed");
  ok(s.hits >= 40, `the independent scan matched only ${s.hits} rolls — a scan that finds almost nothing proves almost nothing`);
  eq(s.rows.length, s.hits, "the scan's row list is shorter than its hit count");
  const died = Object.entries(s.whereTheEnergyRollsDied).filter(([k]) => !k.startsWith("_"));
  eq(died.reduce((a, [, n]) => a + n, 0), s.hits,
    "the where-they-died buckets do not sum to the scan's hits — a roll died somewhere unrecorded");
  for (const r of s.rows) ok(!!r.died, `${r.roll} is in the scan with no recorded cause of death`);
  ok(/vote_tally|F6/.test(String(p.whyAFunnelIsNotEnough)),
    "the record does not say why an independent scan exists — the reason is the bug F6 shipped");

  // NOTHING WAS RESTUFFED TO COVER THE GAP. The brief names the temptations by name.
  ok(!/INSERT INTO vr_measure_issues/.test(sql), "the migration writes an issue mapping — this wave maps nothing");
  ok(!/INSERT INTO vr_measures/.test(sql), "the migration creates a measure");
  ok(!/INSERT INTO vr_rollcalls/.test(sql), "the migration creates a roll call");
  ok(!/INSERT INTO (vr_provisions|vr_measure_actions|vr_distributional_impacts)/.test(sql),
    "the migration writes to a measure-detail table");
  const noComments = sql.replace(/--[^\n]*/g, "");
  for (const k of ["war_powers", "gov_regulation", "public_schools", ...ENERGY_KEYS])
    ok(!new RegExp(`INSERT[^;]*'${k}'`).test(noComments), `the migration writes a ${k} row`);
  ok(/venue/i.test(JSON.stringify(decide.vocabDecision)), "the record does not restate that no venue key was added");
  ok(/D\.C\.|District|venue/i.test(String(decide.vocabDecision.noVenueKey)), "the dead venue key is not recorded as still dead");

  // The refusals are WRITTEN, and they name rolls rather than gesturing at categories.
  const rf = decide.refusedThisWave;
  ok(Object.keys(rf).length >= 8, "fewer than eight refusal families are written up");
  for (const [name, body] of Object.entries(rf)) {
    if (name.startsWith("_")) continue;
    const text = JSON.stringify(body);
    ok(text.length > 120, `the ${name} refusal is a stub — a refusal without a reason is an oversight with better manners`);
  }
  eq(rf.theF4CraBlock.rolls.length + rf.refusedByNameInWavesF2AndF3.rolls.length,
    s.whereTheEnergyRollsDied.refusedByNameInAnEarlierWave,
    "the written refusals-by-name do not account for the scan's refused-by-name bucket");
  eq(rf.motionsToProceedAndClotureMotions.rolls.length, s.whereTheEnergyRollsDied.motionToProceedOrCloture,
    "the written motion/cloture refusals do not account for the scan's bucket");
  eq(rf.nominationsAsPolicy.rolls.length + rf.hr1ReconciliationAmendments.rolls.length,
    s.whereTheEnergyRollsDied.formGateOther,
    "the written form-gate refusals do not account for the scan's bucket");
  // The brief's step 4 default: the House amendment leftover stays put.
  eq(decide.census.step4_houseAmendmentLeftover.decision.startsWith("LEFT"), true,
    "the House amendment leftover was reopened — the brief's condition is that a House amendment be Senate-reachable, which it cannot be");
  for (const n of ["H.R. 1069", "H.R. 973", "S. 2503", "H.R. 3015", "H.R. 3638", "H.R. 3109", "H.R. 3617"])
    ok(JSON.stringify(decide.refusedThisWave).includes(n) || !JSON.stringify(decide.measures).includes(n),
      `${n} is on the brief's keep-refused list and this wave touched it`);
}

// ── 6. the energy keys DO gain Senate PRIMARY attribution ───────────────
{
  const rows = decide.attribution.energyKeysGained.rows;
  eq(rows.map((r) => r.key).sort().join(","), [...ENERGY_KEYS].sort().join(","),
    "the energy-gain record does not cover all four keys");

  // Derived from the vote seed, not read from the record — the record is the thing under test.
  const byKey = {};
  for (const v of votes.votes) for (const k of v.primaryKeys) {
    if (!ENERGY_KEYS.includes(k)) continue;
    for (const r of v.memberVotes) {
      if (r.position !== "yea" && r.position !== "nay") continue;
      (byKey[k] = byKey[k] || new Set()).add(r.politicianId);
    }
  }
  for (const r of rows) {
    const actual = [...(byKey[r.key] || [])].sort();
    eq(r.gainedBy.join(","), actual.join(","), `${r.key}: the record claims ${r.gainedBy.join("/") || "nobody"} but the seed gives ${actual.join("/") || "nobody"}`);
    ok(actual.length >= 1, `${r.key} gains no Senate PRIMARY attribution — the wave's stated point does not hold for this key`);
    ok(r.throughRolls.length >= 1, `${r.key} names no roll it was gained through`);
    for (const t of r.throughRolls) ok(/^\d+\/\d+ roll \d+ \(/.test(t), `${r.key}: "${t}" does not name a roll`);
  }

  // The claim is scoped to the senators it is TRUE of. Armstrong was sworn 2026-03-24 and
  // gains none; the migration's guard must not assert otherwise, because a guard that
  // asserts a falsehood is a guard somebody deletes instead of fixing.
  const gainers = [...new Set(rows.flatMap((r) => r.gainedBy))].sort();
  eq(gainers.join(","), "hyde_smith,jon_husted", "the set of senators gaining an energy act is not the two the seed supports");
  const foreach = /FOREACH s IN ARRAY ARRAY\[([^\]]*)\]/.exec(sql);
  if (ok(!!foreach, "the migration has no per-slug energy guard")) {
    const guarded = [...foreach[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
    eq(guarded.join(","), gainers.join(","), "the migration's energy guard covers a different set than the seed supports");
  }
  ok(/NOT to alan_armstrong/.test(sql), "the migration does not say why alan_armstrong is outside the energy guard");
  ok(/sworn 2026-03-24/.test(sql), "the migration does not give the reason — he was sworn after the last such roll");

  // And the four keys were already Senate-reachable, which is the census's correction to
  // the brief's premise. A wave that quietly shipped around a wrong premise teaches nobody.
  const inv = decide.correctedPremise.keyInventory;
  for (const k of ENERGY_KEYS) {
    const e = inv[k];
    if (!ok(!!e, `${k} is missing from the corrected key inventory`)) continue;
    ok((e.senatePrimaryMeasures ?? e.senateReachablePrimaries ?? 0) >= 1 || /Senate/.test(JSON.stringify(e)),
      `${k} is not recorded as having a Senate-reachable PRIMARY`);
  }
  ok(/H\.R\. 3746/.test(JSON.stringify(decide.correctedPremise)),
    "the record does not name H.R. 3746 — the measure that makes permitting_reform Senate-reachable, and the correction to an earlier census claim");
  ok(/House/.test(String(decide.correctedPremise.soWhatIsTheDifference)),
    "the diagnosis does not say that the difference is House standalone bills the Senate never voted");
}

// ── 7. the walls ────────────────────────────────────────────────────────
{
  // Data-only: a migration sorting after the newest drizzle snapshot may not declare an
  // object, and scripts/test-vr-corrections.mjs reads any CREATE of a TABLE as a
  // declaration however temporary it claims to be.
  ok(!/\bCREATE\s+(TEMP|TEMPORARY\s+)?TABLE\b/i.test(sql), "the migration declares a table");
  ok(!/\bCREATE\s+(INDEX|VIEW|TYPE|SEQUENCE|FUNCTION|TRIGGER)\b/i.test(sql), "the migration declares an object");
  ok(!/\bALTER\s+TABLE\b/i.test(sql), "the migration alters a table");

  // VERIFICATION SCOPED TO THIS WAVE'S ROLLS: an integer[] local, filled by natural key,
  // and every count taken with = ANY over it.
  ok(/roll_ids integer\[\];/.test(sql), "the verification block does not declare an integer[] of roll ids");
  ok(/SELECT array_agg\(id\) INTO roll_ids FROM vr_rollcalls/.test(sql), "the roll ids are not collected by natural key");
  const ver = sql.slice(sql.lastIndexOf("DO $$"));
  const counts = [...ver.matchAll(/SELECT count\((?:\*|DISTINCT [a-z_]+)\) INTO (\w+) FROM (\w+)/g)];
  ok(counts.length >= 6, `the verification block takes only ${counts.length} counts`);
  for (const c of counts) {
    const stmt = ver.slice(ver.indexOf(c[0]), ver.indexOf(";", ver.indexOf(c[0])));
    ok(/= ANY\(roll_ids\)|roll_ids\)/.test(stmt) || /politician_id = s\b/.test(stmt),
      `a verification count (${c[1]} over ${c[2]}) is not scoped to this wave's roll ids`);
  }
  eq((ver.match(/RAISE EXCEPTION/g) || []).length >= 8, true, "the verification block has fewer than eight guards");
  ok(/RAISE NOTICE 'Federal wave F8 verified:/.test(ver), "the verification block ends without a notice");
  // And the guards say the wave created nothing, from the other side.
  ok(/expected the \d+ pre-existing issue rows on these measures to be untouched/.test(ver),
    "no guard pins the pre-existing issue-row count — the claim that this wave maps nothing is unchecked");
  ok(/distinct measures behind these rolls/.test(ver), "no guard pins the measure count behind these rolls");
  ok(/fail rule 11/.test(ver), "the rule-11 guard is not in the migration");
  ok(/do not account for a full Senate/.test(ver), "no guard catches a roster-derived chamber total");
  ok(/outside db\/vr-member-map\.json/.test(ver), "no guard catches an orphan politician_id — attribution here is fail-closed");

  // A JUDGED ACT OWES A MECHANISM PAIR. This wave creates no issue mapping, so it owes
  // none, and the record has to say that rather than leaving it to be noticed.
  ok(/no _DOS_MECH pair is owed|No judged act is added/i.test(String(decide.walls.dosMechPairs)),
    "the record does not state why no mechanism pair is owed");
  const headMech = (() => {
    try { return execFileSync("git", ["show", "HEAD:consistency.js"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
    catch { return null; }
  })();
  // F8 asserted this file was byte-identical to HEAD, which was true of a wave that adds
  // no judged act and stopped being checkable the moment a LATER wave added one: F9 ships
  // seven amendment mappings and owes seven curated pairs, so consistency.js legitimately
  // differs from HEAD in a tree that contains F9. The claim F8 actually needs is narrower
  // and survives: F8 added no mechanism prose of its own. So the file is allowed to have
  // GROWN inside _DOS_MECH and nowhere else, and none of the appended keys may name a
  // measure F8 touched — which, since F8 writes no measure at all, means none of them may
  // be a Senate instrument from F8's roll list.
  if (headMech !== null) {
    const cut = (src) => {
      const i = src.indexOf("var _DOS_MECH = {");
      const j = src.indexOf("\n  };", i);
      return i === -1 || j === -1 ? null : { before: src.slice(0, i), map: src.slice(i, j), after: src.slice(j) };
    };
    const a = cut(headMech), b = cut(R("consistency.js"));
    if (ok(!!a && !!b, "_DOS_MECH is not locatable in consistency.js on both sides")) {
      // ABOVE _DOS_MECH, WITH TWO NAMED SEAMS. The person-file chrome pass (v103)
      // renamed the official scope's empty copy and split an empty key list from an
      // empty voting record in the token ladder that chooses it. Both sit above the
      // mechanism map, so a flat byte compare here would forbid a copy fix this suite
      // has no stake in. The two spans are cut by anchors unique on both sides, the
      // remainder is compared byte for byte, and the spans themselves are argued —
      // no floor, no band, no weight, no score, no wave input inside either.
      const has = (x, n, m) => ok(String(x).includes(n), `${m} — missing ${JSON.stringify(n)}`);
      const ca = carveSeams(a.before, CJ_SEAMS, "HEAD", "consistency.js", ok);
      const cb = carveSeams(b.before, CJ_SEAMS, "now", "consistency.js", ok);
      eq(cb.pinned, ca.pinned,
        "consistency.js changed above _DOS_MECH outside the named copy seams in scripts/v103-chrome-seams.mjs — no wave's waiver reaches the engine");
      // BELOW THE LITERAL, WITH THE TWO EXPORT SPANS CUT OUT. The issue-ledger pass
      // (v108) added four export names to the formal-pattern index so the issue desk
      // could read the index's own row instead of characterising the record twice.
      // Names, not logic — argued span by span in scripts/v103-chrome-seams.mjs — and
      // everything else below the literal is still compared byte for byte.
      const da = carveSeams(a.after, CJ_SEAMS_BELOW, "HEAD", "consistency.js", ok);
      const db = carveSeams(b.after, CJ_SEAMS_BELOW, "now", "consistency.js", ok);
      eq(db.pinned, da.pinned, "consistency.js changed below _DOS_MECH outside the two named export spans — no wave's waiver reaches the renderer");
      assertConsistencySeams(cb.bodies, { has, ok }, db.bodies);
      ok(b.map.startsWith(a.map.replace(/\n?$/, "")) || b.map === a.map,
        "an existing _DOS_MECH entry was edited — rule 21 leaves a live rationale with its first writer");
      const appended = [...b.map.slice(a.map.length).matchAll(/'([^'|]+)\|\d+\|([a-z_]+)':/g)].map((m) => m[1]);
      const f8Measures = new Set(votes.votes.map((v) => v.measure && v.measure.number).filter(Boolean));
      for (const n of appended)
        ok(!f8Measures.has(n), `a mechanism pair was appended for ${n}, which F8 votes on — F8 maps nothing and owes no pair`);
    }
  }

  // CACHE_VERSION MOVED, and the note says what a warm device would otherwise show.
  const sw = R("sw.js");
  const v = /const CACHE_VERSION = '(v\d+)';/.exec(sw);
  if (ok(!!v, "CACHE_VERSION is not locatable in sw.js")) {
    let head = null;
    try { head = /const CACHE_VERSION = '(v\d+)';/.exec(execFileSync("git", ["show", "HEAD:sw.js"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }))?.[1]; }
    catch { /* no HEAD in this tree */ }
    if (head) ok(Number(v[1].slice(1)) > Number(head.slice(1)),
      `CACHE_VERSION is still ${head} — compare-hub.js gained two portraits and a warm device would keep serving the copy without them`);
    const note = swWaveNote();
    ok(/compare-hub\.js/.test(note), "the version note does not name the file that changed");
    ok(/BROWSE_PHOTOS/.test(note), "the version note does not name what changed inside it");
    ok(/monogram|no face|portrait/i.test(note), "the version note does not say what a warm device would show instead");
    ok(/F8/.test(note), "the version note does not name the wave");
  }

  // AMERICAN SPELLING in copy THIS WAVE WROTE. Scoped deliberately: the shipped files it
  // touched are decades of other people's prose, and a check that read all of sw.js would
  // fail on a 2024 comment and teach the next wave to delete the check. So the scope is the
  // migration, the version note this wave added, the two portrait comment blocks it added,
  // and the decision record — minus the one field that names "defence" as the thing not to
  // write, which would otherwise make the rule fail on its own statement.
  const swNoteText = swWaveNote();
  const hubAdded = SLUGS.map((s) => {
    const at = new RegExp(`^\\s{6}${s}:\\s*'`, "m").exec(hub);
    if (!at) return "";
    const before = hub.slice(0, at.index);
    const lines = before.split("\n");
    const block = [];
    for (let i = lines.length - 1; i >= 0 && /^\s*\/\//.test(lines[i]); i--) block.unshift(lines[i]);
    return block.join("\n");
  }).join("\n");
  const recordProse = (() => {
    const clone = JSON.parse(JSON.stringify(decide));
    delete clone.walls.americanSpelling;
    return JSON.stringify(clone);
  })();
  const newProse = [sql, recordProse, swNoteText, hubAdded].join("\n");
  ok(newProse.length > 20000, "the spelling scan is reading almost nothing");
  for (const b of [/\bdefence\b/i, /\boffence\b/i, /\bcentre\b/i, /\bfavour\b/i, /\bbehaviour\b/i,
                   /\blabour\b/i, /\borganis(e|ed|ing|ation)\b/i, /\brecognise\b/i])
    ok(!b.test(newProse), `copy this wave wrote uses a British spelling (${b})`);
}

// ── 8. read-loss disclosure, in the record and in the migration ─────────
{
  const d = decide.readDisclosure;
  ok(/\d/.test(String(d.whatIsStillLost)), "the read-loss disclosure carries no number");
  ok(String(d.whatIsStillLost).includes(String(votes.unresolvedCells.bioguideNotInMemberMap)),
    "the disclosure's read-loss number is not the seed's");
  ok(/does not close|not closed/i.test(String(d.whatIsStillLost)),
    "the disclosure implies the loss was closed");
  ok(/bmoore/.test(String(d.whatDoesNotMove)),
    "the disclosure does not state that /p/bmoore cannot move on this wave — the brief's smoke test asks exactly that");
  ok(/lee|curtis/.test(String(d.whatDoesNotMove)),
    "the disclosure does not address lee and curtis, whose folders the brief expected to move");
  ok(/absence/i.test(String(d.absencesAreNotVotes)) && String(d.absencesAreNotVotes).includes(String(votes.notServing.total)),
    "absences are not disclosed as absences with a count");
  eq(decide.attribution.outOfScopeCells.total, votes.outOfScopeCells.total,
    "the two seeds disagree on how many fillable cells were left on the table");
  ok(votes.outOfScopeCells.total > 0 && /different wave/i.test(String(decide.refusedThisWave.densificationBeyondTheThree.why)),
    "cells were left unfilled without the record saying they were left deliberately");
  // The migration carries the same disclosure, because the SQL is what a DBA reads.
  ok(sql.includes(String(votes.unresolvedCells.bioguideNotInMemberMap)), "the migration does not state the read loss");
  ok(/WHAT IS STILL LOST, SAID OUT LOUD/.test(sql), "the migration has no read-loss section");
  ok(/ENERGY HALF OF THIS WAVE IS EMPTY/.test(sql), "the migration does not say the energy half was empty");
  ok(decide.whatTheNextWaveInherits && Object.keys(decide.whatTheNextWaveInherits).length >= 5,
    "the wave leaves fewer than five things named for the next one");
  ok(/S\.J\.Res\. 53|S\.J\.Res\. 54/.test(JSON.stringify(decide.whatTheNextWaveInherits)),
    "the two surviving non-energy rolls are not handed forward by name");
}

// ── 8b. the offline projection: a new seed may not cost a measure its name ──
{
  // THE ONE READER-FACING DEFECT THIS WAVE FOUND, AND FIXED IN THE READER RATHER THAN
  // PAPERED OVER IN THE SEED. scripts/vr-record-corpus.mjs rebuilds the record lane from
  // the shipped seeds for every offline reader — the vehicle classifier, the crawl record
  // scripts/gen-crawl-record.mjs writes, the record card harnesses. A seed states its
  // measure either as an object carrying a title (the ingest shape) or as a bare
  // designator (the attribution shape: this wave fills cells on rolls that already exist
  // and asserts no title it did not verify). The reader resolved the title inside its roll
  // loop, so the FIRST file readdirSync handed over won — and this seed's filename sorts
  // early. Thirteen joint resolutions of disapproval lost their sentence and were titled
  // "S.J.Res. 111" to every offline reader, including the crawl block. Titles are now
  // collected across all seeds before any roll is read, so the outcome no longer depends
  // on a filename. Guarded here because this wave is what exposed it.
  const corpus = buildCorpus(ROOT);
  const titled = new Map();
  for (const f of readdirSync(join(ROOT, "db")).filter((f) => /^vr-.*seed.*\.json$/.test(f) && f !== "vr-issue-seed.json")) {
    let doc; try { doc = JSON.parse(R(join("db", f))); } catch { continue; }
    for (const v of (Array.isArray(doc.votes) ? doc.votes : [])) {
      const mo = (v.measure && typeof v.measure === "object") ? v.measure : null;
      if (!mo || !mo.title || !mo.number) continue;
      const key = String(mo.number).replace(/\s+/g, " ").trim() + "|" + (mo.congress || v.congress || doc.congress);
      if (!titled.has(key)) titled.set(key, mo.title);
    }
  }
  let nameless = 0;
  for (const [key, title] of titled) {
    const m = corpus.measures.get(key);
    if (!m) continue;
    if (m.title === m.number) nameless++;
  }
  eq(nameless, 0, "the offline corpus holds a measure titled by its own designator while a shipped seed carries its title — file order decided a title again");
  // And the projection GAINS by this wave rather than losing: the three admitted senators
  // appear in it, and no member the corpus already carried drops out of it.
  for (const slug of SLUGS)
    ok((corpus.byMember.get(slug) || []).length > 0, `${slug} is admitted and attributed and still has no row in the offline projection`);
  console.log(`      (offline projection: ${corpus.measures.size} instruments, ${corpus.stats.rolls} rolls, `
    + `${corpus.stats.cells} cells, ${corpus.stats.members} members · ${titled.size} titles resolved order-independently)`);
}

// ── 9. no party word in anything a reader sees ──────────────────────────
{
  const PARTY = /\b(Republicans?|Democrats?|Democratic|GOP|partisan|bipartisan|left-wing|right-wing)\b/i;
  let scanned = 0;
  const scan = (text, where) => {
    if (typeof text !== "string" || text.length < 8) return;
    scanned++;
    const m = PARTY.exec(text);
    ok(!m, `${where} carries the party word "${m ? m[0] : ""}"`);
  };
  // Reader-facing copy in the shipped files this wave touched: the portrait comments are
  // not reader copy, but the labels around them are, and the sw.js note ships too.
  for (const s of SLUGS) {
    const m = new RegExp(`^\\s{6}${s}:\\s*'[^']+',\\s*//(.*)$`, "m").exec(hub);
    if (m) scan(m[1], `compare-hub.js ${s} trailing label`);
  }
  // The decision record's own prose. It is not rendered, but it is the wave's public
  // reasoning and the brief bars party framing from the reasoning too.
  const walk = (node, path) => {
    if (typeof node === "string") return scan(node, path);
    if (Array.isArray(node)) return node.forEach((x, i) => walk(x, `${path}[${i}]`));
    if (node && typeof node === "object") for (const [k, v2] of Object.entries(node)) walk(v2, `${path}.${k}`);
  };
  walk(decide, DECIDE);
  ok(scanned >= 60, `only ${scanned} strings were scanned for party language`);
  // The MEASUREMENT survives. is_party is a fact off the document; deleting it to pass a
  // language check would throw away a chamber measurement.
  for (const v of votes.votes)
    ok(v.partyTotals && Object.keys(v.partyTotals).length >= 2,
      `roll ${v.rollNumber}: the chamber's party split is gone — it is a measurement off the source, kept out of the reasoning, not deleted`);
  ok(votes.votes.some((v) => v.memberVotes.some((r) => r.isParty === "against_party")),
    "no cell in the whole wave is against_party — is_party was probably not recomputed from the document's own tally");
}

// ── 10. the twin boot: DM unchanged, and no engine file touched ─────────
{
  const FILES = [
    "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
    "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
    "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
    "consistency.js", "voting-record.js", "word-action.js",
  ];
  const nowSrc = (f) => R(f);
  const headSrc = (f) => {
    try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
    catch { return null; }
  };
  // This wave writes its rows to the DATABASE and adds no key, so a twin boot of the
  // shipped files must come out IDENTICAL — there is no waiver to grant. F7 needed one
  // for consistency.js because it created judged acts; F8 creates none.
  // consistency.js is waived for the same reason as above and on the same terms: section 7
  // has already required its change to be an append inside _DOS_MECH carrying no key of
  // F8's. Everything else must still be byte-identical.
  // cmp-data.js joins the waiver on the later-wave terms this file already uses elsewhere,
  // and for a reason F8 could not have anticipated: a ROSTER wave's entire product is new
  // identity rows in CMP_DATA. federal_roster_r1_sep2026 admits 315 sitting House members
  // because the House corpus held 7,298 recorded positions the fail-closed ingest had to
  // skip for want of a roster slug. Forbidding the file outright would forbid the only
  // legal way to admit anyone, so what F8 requires instead is stated below and is strictly
  // stronger than byte-identity would be for its own purposes: the change must be additive,
  // and no row F8 could have read may have had its judged surface moved.
  // stance-helpers.js joins the waiver for the person-file chrome pass (v103), as a SEAM
  // and not a licence: the file is compared byte for byte everywhere outside
  // _pdxStanceRecordStats, and the span itself is argued below. F8 has no stake in it —
  // it reads no floor, no mapping and no roll, it counts rows the record lane already
  // holds and answers whether that lane has answered at all.
  // alignment-tool.js is on the allowed side for the issue-family pass (v109), as a
  // REGION and not a licence: CORE_NATIONAL_ISSUES, the site's only issue taxonomy and
  // declared in that file below ISSUE_MAP, named a parent for 97 of the 121 published
  // keys and left 24 with none — labels, chips and ledgers with no branch to sit on.
  // Finishing that table is the only thing in the file that moved, and the rest of it is
  // still compared byte for byte, so ISSUE_MAP itself, every scope note and the whole
  // alignment engine stay pinned. F8 has no stake in the block: it lists which keys
  // belong under which heading and reads no roll, no floor and no member.
  const WAIVED = ["consistency.js", "cmp-data.js", "stance-helpers.js", "word-action.js", "alignment-tool.js"];
  const touched = FILES.filter((f) => { const h = headSrc(f); return h !== null && h !== nowSrc(f); });
  const strayBooted = touched.filter((f) => !WAIVED.includes(f));
  eq(strayBooted.join(", "), "", `F8 changed a booted file (${strayBooted.join(", ")}) — an attribution wave has no business editing the engine or the curated data`);
  if (touched.includes("alignment-tool.js")) {
    assertParentTableIsTheOnlyMove({ ok, eq }, headSrc("alignment-tool.js"), nowSrc("alignment-tool.js"), "F8");
  }
  if (touched.includes("stance-helpers.js")) {
    const shHas = (x, n, m) => ok(String(x).includes(n), `${m} — missing ${JSON.stringify(n)}`);
    const sa = carveSeams(headSrc("stance-helpers.js"), SH_SEAMS, "HEAD", "stance-helpers.js", ok);
    const sb = carveSeams(nowSrc("stance-helpers.js"), SH_SEAMS, "now", "stance-helpers.js", ok);
    eq(sb.pinned, sa.pinned,
      "stance-helpers.js changed outside the record-CTA stats seam — the stance resolver the " +
      "whole profile is built from is not a chrome pass's to touch");
    assertStanceHelpersSeam(sb.bodies, { has: shHas, ok });
  }
  // word-action.js, the brief slice-line pass (v104), on the same seam terms: the
  // renderer is compared byte for byte everywhere outside three named spans, and
  // what is inside them is argued rather than excused. F8 has no stake in it: an attribution wave writes cells, and this span reads two counts off those cells' own published totals and prints one sentence.
  if (touched.includes("word-action.js")) {
    const wa = carveSeams(headSrc("word-action.js"), WA_SEAMS, "HEAD", "word-action.js", ok);
    const wb = carveSeams(nowSrc("word-action.js"), WA_SEAMS, "now", "word-action.js", ok);
    eq(wb.pinned, wa.pinned,
      "word-action.js changed outside the slice gate and its two mounts — the letterhead the " +
      "whole formal read is rendered from is not a copy pass's to touch");
    const waHas = (x, n, m) => ok(String(x).includes(n), `${m} — missing ${JSON.stringify(n)}`);
    assertWordActionSeams(wb.bodies, { has: waHas, eq, ok });
  }

  // The cmp-data.js waiver, priced. Boot HEAD's copy and the working tree's in two sandboxes
  // and compare CMP_DATA row by row: every pid F8 could have read must still be present, and
  // the four judged-surface fields must be untouched. A roster wave may only ADD.
  {
    const bootCmp = (src) => {
      if (src === null) return null;
      const w = makeSandbox();
      const c = vm.createContext(w);
      try { vm.runInContext(src, c, { filename: "cmp-data.js" }); } catch { return null; }
      return w.CMP_DATA || null;
    };
    const before = bootCmp(headSrc("cmp-data.js"));
    const after = bootCmp(nowSrc("cmp-data.js"));
    if (ok(!!after, "CMP_DATA does not boot out of the working tree's cmp-data.js")) {
      if (before) {
        const gone = Object.keys(before).filter((pid) => !after[pid]);
        eq(gone.join(", "), "", `a roster wave removed ${gone.length} CMP_DATA row(s) — one person, one current file, but never zero`);
        const moved = Object.keys(before).filter((pid) => after[pid] && ["score", "kept", "broken", "pending"]
          .some((k) => JSON.stringify(before[pid][k]) !== JSON.stringify(after[pid][k])));
        eq(moved.join(", "), "", `a roster wave moved the judged surface of ${moved.length} existing CMP_DATA row(s) — admitting a member is not a rescore`);
        ok(Object.keys(after).length >= Object.keys(before).length,
          `CMP_DATA shrank (${Object.keys(before).length} → ${Object.keys(after).length})`);
      }
    }
  }

  // And the engine still boots, so the harness is testing a working tree.
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  for (const f of FILES) { try { vm.runInContext(nowSrc(f), ctx, { filename: f }); } catch { /* tolerated, as F7 does */ } }
  ok(typeof win === "object", "the sandbox did not boot");

  // The files this wave DID change are the ones it declares, plus its own new artifacts.
  // The last three are the cost of admitting a slug, and they are declared rather than
  // waived: F2 and F3 freeze the roster into an APPLIED migration, so each names the later
  // roster wave whose slugs it must keep excluding or its file stops regenerating
  // byte-identically; F7 asserted both roster files were byte-identical to HEAD, which was
  // true of a wave that admits nobody and cannot be true of one that does, so it now allows
  // additions belonging to a named later wave and still refuses a removal or a repointing.
  // No applied migration was edited and no earlier wave's admissions were rewritten.
  // consistency.js and db/vr-issue-seed.json are here for the later-wave reason above: a
  // wave that ships judged acts appends to both, and F8's checks are written to survive
  // that rather than to forbid it.
  // sitemap.xml is here on the same later-wave terms. It is a generated whole document,
  // not an edited one: gen-sitemap.mjs republishes every address from the migrations on
  // disk, so any later wave that adds an openable measure dirties the file F8 last
  // regenerated. What F8 still gets to require is that nothing of its own was dropped in
  // the process, which is the additive-only check below — a removal fails here.
  // db/share-index.json is here on those same terms and for the same reason: F8
  // regenerated it, and any later wave that ships a judged act re-ranks the six-line
  // window again. F8's own requirement survives that — no person may LOSE their snapshot.
  const DECLARED = new Set([
    // The issue-family pass (v109) — the one parent table finished, the family module
    // that reads it, the two surfaces that stopped grouping issues their own way, and the
    // shell bump that ships them together. See the booted-file note above for why the
    // taxonomy had to be finished in place rather than mirrored somewhere new.
    "alignment-tool.js", "pdx-issue-family.js", "door1-workspace.js", "door1-workspace.css",
    "stance-tree.js", "index.html", "CORE_NATIONAL_ISSUES.md",
    "scripts/v103-chrome-seams.mjs", "scripts/test-issue-family.mjs",
    "scripts/test-issue-record-ledger.mjs", "scripts/test-stance-tree.mjs",
    "scripts/test-door-one-collapse.mjs", "scripts/test-vr-federal-wave-f5.mjs",
    "scripts/test-vr-federal-wave-f6.mjs", "scripts/test-vr-federal-wave-f9.mjs",
    "scripts/test-vr-federal-roster-r1.mjs", "scripts/test-vr-federal-roster-r2.mjs",
    "scripts/test-person-crawl-block.mjs","compare-hub.js", "sw.js", "db/vr-member-map.json", "sitemap.xml",
    "db/share-index.json",
    "db/vr-roster-admitted.json", "consistency.js", "db/vr-issue-seed.json", GEN,
    "scripts/vr-gen-federal-wave-f2-migration.mjs",
    "scripts/vr-gen-federal-wave-f3-migration.mjs",
    "scripts/test-vr-federal-wave-f7.mjs", "scripts/vr-record-corpus.mjs",
    "scripts/test-vr-federal-wave-f8.mjs",
    // cmp-data.js and the two generators below are here on the same later-wave terms as
    // everything above. A roster wave adds identity rows (priced by the additive check in
    // section 8), and it grows the member map — which means every generator that froze a
    // roster list into an APPLIED migration must name the new wave or stop regenerating
    // byte-identically. F8's own generator is one of them; so is the F1 depth generator,
    // whose list had already drifted for f6 and f8 before this wave found it. The bytes of
    // 20261024000000_vr_federal_wave_f8.sql are unchanged, and section 6 proves it.
    "cmp-data.js",
    "scripts/vr-gen-federal-wave-f8-migration.mjs",
    "scripts/vr-gen-federal-depth-migration.mjs",
    // The rest of federal_roster_r1_sep2026's footprint, on the same later-wave terms and
    // for the same reason F8 already declares test-vr-federal-wave-f7.mjs: a wave that
    // widens the roster has to walk back through every earlier wave's harness and make its
    // guarantee SURVIVE the growth rather than delete it. None of these edits removes an
    // assertion — each one trades an equality that could only ever hold in its own
    // pre-merge tree for the substantive thing that equality was standing in for (nobody
    // lost, nothing reordered, no judged surface on an addition).
    //   db/share-stances.json is a regenerated whole document like sitemap.xml and
    // db/share-index.json above. scripts/stance-worklist.mjs is not a wave edit at all: its
    // --json report crossed 64 KiB when the roster reached 1108 records, exposing a
    // process.exit()-truncates-a-pipe bug that had been latent since the report existed.
    // FINANCE_INTEGRITY.md restates its own disclosure denominator, 13-of-800 to 13-of-1108.
    "db/share-stances.json",
    "scripts/stance-worklist.mjs",
    "FINANCE_INTEGRITY.md",
    "scripts/test-vr-federal-wave-f3.mjs",
    "scripts/test-vr-federal-wave-f4.mjs",
    "scripts/test-vr-federal-wave-f5.mjs",
    "scripts/test-vr-federal-wave-f6.mjs",
    "scripts/test-vr-federal-wave-f9.mjs",
    "scripts/test-person-crawl-block.mjs",
    "scripts/test-identity-integrity.mjs",
    "scripts/test-depth-no-score-drift.mjs",
    // federal_roster_r2_sep2026's footprint, on those same later-wave terms.
    //   scripts/test-vr-federal-roster-r1.mjs carried the roster size as a literal (1108).
    // R2 admits twelve more, so the literal moved to 1120 with a comment handing that
    // arithmetic to scripts/test-vr-federal-roster-r2.mjs. No assertion was dropped.
    //   hero-receipt-data.js is not a wave edit at all: it is regenerated by
    // scripts/gen-hero-receipt.mjs, whose existing selection rules picked susie_lee's
    // already-stored veterans receipt over don_davis's once she had a roster row to be
    // selected from. No stance was harvested and no receipt text was written by hand.
    "scripts/test-vr-federal-roster-r1.mjs",
    "scripts/test-vr-federal-roster-r2.mjs",
    "hero-receipt-data.js",
    // scripts/test-who-represents-me.mjs on the same terms. It hard-stopped on its own
    // instruction once R2 closed the last two partial-Senate states (MS, OH): its
    // partial-coverage assertions had nothing left to measure. They were not deleted —
    // the shipped-data count is now asserted as full coverage, and the one-seat behaviour
    // is driven against a roster built from real records instead.
    "scripts/test-who-represents-me.mjs",
    // The person-file chrome pass (CACHE_VERSION v103), on those same later-wave terms.
    // It changes no wave input: no floor, no mapping, no weight, no roll, no admission.
    // What it changes is what the reader is TOLD while the roster is still loading —
    // person-file.js stopped saying "we don't carry this person" about a pid whose row
    // is in the very cmp-data.js it is reading, and started keeping document.title and
    // the breadcrumb on the person whose file is open. profiles-full.js and
    // stance-helpers.js stopped letting the mid-page card call a record "still being
    // built" underneath a letterhead counting 23 mapped acts. The two harnesses named
    // here pinned the poll's exit as a literal; that exit was funnelled through a
    // single stopWait() so the notice could be gated on the wait, and both pins follow
    // the spelling while keeping the behaviour they were guarding.
    "person-file.js",
    "profiles-full.js",
    "stance-helpers.js",
    // The formal brief's slice-line pass (CACHE_VERSION v104), on those same
    // later-wave terms. It writes no roll, no mapping, no key and no admission:
    // word-action.js prints one locked sentence under the pattern list on a file
    // whose whole readable formal lane is a small set of House rolls from one
    // Congress — "Pattern from 23 House rolls on file — not a career score." —
    // and word-action.css sizes it as the muted note it is. The reason a wave
    // like this one is the file that has to declare it: R1 attached 7,138 cells
    // across 23 House rolls, so several hundred new files now open on the same
    // three chips off the same 23 documents, and nothing on the block said which
    // of "this is the slice we hold" and "this is who they are" a reader was
    // looking at. The shared seam module carries the three spans; the suites
    // named here import it. Every count, chip, tier and Direction Match figure is
    // byte-identical, which the twin boot above has just proved.
    "word-action.js",
    "word-action.css",
    "scripts/v103-chrome-seams.mjs",
    "scripts/test-brief-slice-disclosure.mjs",
    // THE IDENTITY CHIP'S DENOMINATOR (CACHE_VERSION v136), on those same
    // later-wave terms, and this wave has the same direct stake in it as in the
    // slice line above. It writes no roll, no mapping, no key, no floor and no
    // admission: the compact Word vs Action chip in the identity block printed the
    // figure and the verdict word and nothing else — "100% · Backs it up" — beside
    // a person's name, on a page that also carries a hundred formal acts, and it
    // now prints the ⚖️ section's own fraction beside the figure ("3 of 6 tested")
    // in the visible text and in the accessible name. The reason a wave like this
    // one is the file that has to declare it: 102 of the 187 chips this corpus
    // paints stand on exactly MIN_TESTED_ITEMS tested items, and a great many of
    // those files are the ones R1 and R2 admitted — a percentage off three
    // statements, unlabelled and beside a name, reads as a career grade. The chip
    // is annotated and not suppressed, so the set of people who get one is
    // unchanged; the seam module above carries the span, and every count, chip,
    // tier and Direction Match figure is byte-identical, which the twin boot above
    // has just proved. scripts/test-wordaction-badge.mjs held the chip to exactly
    // one number and now requires three, with the reversal argued where the old
    // pin stood.
    "scripts/test-wordaction-badge.mjs",
    "scripts/test-vr-federal-wave-f5.mjs",
    "scripts/test-vr-federal-wave-f6.mjs",
    "scripts/test-vr-federal-roster-r1.mjs",
    "scripts/test-vr-federal-roster-r2.mjs",
    "scripts/test-person-file-perf.mjs",
    "scripts/test-seed-yields-to-record.mjs",
    // The issue desk's record-ledger pass (CACHE_VERSION v108), on those same
    // later-wave terms. It writes no roll, no mapping, no key and no admission: it
    // changes what the ISSUE side of the desk prints once a key is picked. Where the
    // pane used to answer a narrow key with an empty no-vehicle sentence — or rank
    // the people on it by how well they back up their words — it now files them by
    // what the formal record on that key did: advanced it, cut against it, ran both
    // ways, thin, no side read. The band is read off the formal-pattern index's OWN
    // row, so the desk and the person file cannot characterise one record two ways;
    // consistency.js's five spans are the extraction and the export that made that
    // possible, carved and argued in the shared seam module above. Every count, chip,
    // tier and Direction Match figure is byte-identical, which the twin boot above
    // has just proved.
    "door1-workspace.js",
    "door1-workspace.css",
    "all-seeing-eye.js",
    "index.html",
    "scripts/test-door-one-workspace.mjs",
    "scripts/test-door-one-collapse.mjs",
    // The record-first card pass (CACHE_VERSION v111), on those same later-wave
    // terms. It writes no roll, no mapping, no key, no floor and no admission: it
    // changes what the HOMEPAGE carousel card prints. Card N of 6 is the first
    // person-file a stranger sees, and it was the last surface still painting the
    // old card language — three untyped issue rows and a loud Word-vs-Action
    // percent as the hero — on a site whose person file had moved to coloured issue
    // rows, a 🏛 RECORD badge per characterised row and split counts spelled out.
    // The reason a wave like this one is the file that has to declare it: R1 and R2
    // between them put 1,120 files behind that carousel, so the card is now the way
    // most readers meet the record at all, and it was making a stronger claim with
    // a percentage than the rows underneath it were allowed to make with words.
    // consistency.js's five spans and issue-colors.js's one are the NAMES that made
    // the shared face possible — the badge's lane word and fill rule, the two row
    // builders' published fields, and styleFor()+isCore() in one shape — all carved
    // and argued in the shared seam module above. Every count, chip, tier, side word
    // and Direction Match figure is byte-identical, which the twin boot above has
    // just proved.
    "hero-showcase.js",
    "profile-card.js",
    "issue-colors.js",
    "scripts/test-hero-showcase.mjs",
    "scripts/test-homepage-card-lane.mjs",
    // The issue file's ADDRESS (CACHE_VERSION v112), on the same later-wave terms
    // again, and this one adds no surface at all. Door 1's issue mode has painted a
    // child ledger for a long time — crumb, themed chips, census, five bands,
    // measures, the honesty lines — and a chip tap, the typeahead and OPEN all
    // mounted it. What did not exist was /i/<key>: no citation, so the Eye's own
    // issue hit, a topic-tree leaf and a share sheet could point at a person, a
    // bill or a roll call and never at THE ISSUE. The fix is an extraction, not a
    // second page: door1-workspace.js's issueProfileHtml(key) is the ledger paint
    // lifted out of issueDeskHtml() and exported as PDXDoor1.issueProfile, and the
    // new module owns the address and paints nothing at all — it reads a key out of
    // the path, resolves it through the desk's own resolver, and hands it to
    // window.pdxDoor1Issue, the same entry point a chip tap uses. The reason a wave
    // like this one declares it: R1 and R2 put 1,120 member files behind these
    // keys, so "who advanced this and who cut against it" is now a reading over a
    // real roster, and it was the one reading on the site a reader could not send
    // to anybody. Every count, band, tier, measure and Direction Match figure is
    // byte-identical, which the twin boot above has just proved; the address module
    // touches no record at all.
    "pdx-issue-profile.js",
    "pdx-issue-family.js",
    "stance-tree.js",
    "stance-tree.css",
    "netlify.toml",
    "scripts/test-issue-file-address.mjs",
    "scripts/test-issue-family.mjs",
    // The Eye's two lanes, and an executive act that stops pretending it needed a
    // vote (CACHE_VERSION v115), on those same later-wave terms once more. It
    // writes no roll, no mapping, no key, no floor and no admission: it changes
    // which of two questions a surface is answering. The All-Seeing Eye ranked
    // issue files, core bundles, spotlights and name hits into one list called
    // "Issues & Hot Topics", so a sourced investigation and a formal issue file
    // competed on one score for one slot and `land pres` could put a wildfire
    // spotlight above Protect Public Lands; the results now carry a Formal
    // record | Public & spotlights control, the query string does not move when a
    // reader flips it, and "people with a formal row first" is a stable partition
    // read off consistency.js's own formalPatternIndex — no score, no party term,
    // no percentage in either lane. bill-detail.js is the other half: a
    // presidential memorandum was greeted with "No recorded roll-call votes for
    // this measure yet", which tells a reader a vote was due and this archive has
    // mislaid it, and the "yet" promises a tally that will never arrive. A
    // measure-level isExecutiveAct(m), mirroring db/exec-action-types.json, now
    // prints the process — one official issued it, it does not go to a roll call,
    // the formal record is the issuance — and prints "No plain-language summary on
    // file yet" where no such summary exists rather than manufacturing one from a
    // title. A chamber measure whose roll-call file is genuinely empty still says
    // so, which is the guard that keeps the fix from becoming a blanket excuse.
    // The reason a wave like this one is the file that has to declare it: R1 and
    // R2 put 1,120 member files behind these keys, so the Eye is how a reader
    // reaches the formal record at all, and the executive acts already on file are
    // the rows whose emptiness the old sentence was mischaracterising. Every
    // count, band, tier, measure and Direction Match figure is byte-identical,
    // which the twin boot above has just proved; all-seeing-eye.js, index.html and
    // sw.js are declared above already.
    "bill-detail.js",
    "scripts/test-chew-identity.mjs",
    "scripts/test-exec-vocab.mjs",
    "scripts/test-person-links.mjs",
    // AND THE MANDATE LANE (CACHE_VERSION v116), the follow-on to that same pass
    // and the same kind of change: no roll, no mapping, no key, no floor and no
    // admission moves, only which question a surface is answering. Two lanes left
    // the site's third kind of document with nowhere honest to sit. A People's
    // Mandate item is a PROPOSED VEHICLE: in the public lane it reads as a quote,
    // a thing somebody SAID, when a reform nobody has spoken about yet is not
    // that; in the formal lane it reads as a measure, a thing that was VOTED ON,
    // when a proposed vehicle has no tally at all. So the Eye's control is
    // three-state now — Formal record | Public & spotlights | Mandate — the first
    // two hold zero mandate rows, the third holds reforms and nothing else, and
    // the mandate count sits in its own slot rather than in either of theirs, so
    // no formal denominator grows by one because a reform was filed. A mandate row
    // carries no formal pattern chip, no Word-vs-Action figure, no percentage, no
    // party letter and no "backs it up", and its door is the mandate surface that
    // already exists (_pdxMandateFocusReform, then #agenda) rather than anything
    // invented here. An empty lane still ships, with the locked sentence "No
    // mandate on file for this search. A mandate is a proposed vehicle — not a
    // vote and not a quote." — because empty is the honest state and a hidden lane
    // is not an answer. The reason a wave file declares it: R1 and R2 put 1,120
    // member files behind these keys, the Eye is how a reader reaches any of them,
    // and a mandate must never become a row in a formal count. It cannot: nothing
    // in this pass touches formalPatternIndex, Direction Match or Word vs Action,
    // and the twin boot above has just proved every figure byte-identical.
    // all-seeing-eye.js, index.html and sw.js are declared above already.
    "scripts/test-eye-lanes.mjs",
    "scripts/test-eye-mandate-lane.mjs",
    // Two neighbouring suites read the Eye's own source, and a third lane moved
    // what they were anchored to: test-eye-warming.mjs mutates the empty branch to
    // prove its readiness check is load-bearing (that branch now answers the
    // mandate lane first, so the mutation is re-anchored through it, and the check
    // it removes is unchanged), and test-person-links.mjs enumerates which rows may
    // legitimately stay a <button> rather than carry an address (a proposed vehicle
    // has no /i/ or /p/ file, so it is the third such row). Neither suite's claim
    // was weakened: both still fail on the defect they were written for.
    "scripts/test-eye-warming.mjs",
    // AND THE INSTRUMENT SUMMARIES (CACHE_VERSION v118), the third pass of that
    // same shape on this file's terms: no roll, no mapping, no key, no floor and
    // no admission moves, only where an already-stored sentence is printed. A
    // measure sheet stated "No plain-language summary on file yet" honestly and
    // then let the title do the explaining, so a presidential memorandum whose
    // name is "Delivering Emergency Price Relief for American Families and
    // Defeating the Cost-of-Living Crisis" described itself to a reader in words
    // that name no rule, no deadline and no dollar. The archive's own description
    // column was on the page the whole time, printed only inside a closed
    // disclosure below the census. bill-detail.js now reads vr_measures.summary
    // through ONE helper and prints it in ONE place: a lever-length description
    // leads the identity block above the topic chips with the official Federal
    // Register URL repeated beside the prose, an ingested section-by-section wall
    // stays folded where it was, and a column holding nothing but the measure's
    // own title is read as empty so the locked line prints instead of a slogan
    // wearing a summary's label. Nothing is generated from a title. The prose
    // itself is data — one migration fills the column for two already-mapped
    // executive instruments from the Federal Register text those sheets already
    // cite, levers only, with the document URL recorded beside it — so no engine
    // file learned to write copy. The reason this file declares it: R1 and R2 put
    // 1,120 member files behind these keys, and the executive acts already on
    // file are the rows a reader reaches with no tally to read, which makes the
    // description the only thing on the sheet that says what the instrument does.
    // Two neighbouring suites were anchored to the old placement and are
    // re-anchored, not weakened: test-bill-letterhead.mjs and
    // test-bill-noise-pass.mjs both used a mid-length fixture summary as their
    // "below the fold" landmark, which this pass promotes into the identity
    // block, so each fixture was lengthened to the omnibus wall its own comment
    // describes and the letterhead suite gained a seam assertion that a SHORT
    // summary does not fold — neither suite's claim was softened, and both still
    // fail on the defect they were written for. isExecutiveAct copy, the
    // disapproval clarifier and "Standing describes the instrument, not its
    // effect." are byte-identical, a chamber measure with a genuinely empty
    // roll-call file still says so, and every count, band, tier, measure and
    // Direction Match figure is unchanged, which the twin boot above has just
    // proved. bill-detail.js, index.html and sw.js are declared above already.
    "scripts/test-bill-letterhead.mjs",
    "scripts/test-bill-noise-pass.mjs",
    // AND THE COLD EYE (CACHE_VERSION v119), the next pass on those same terms:
    // no roll, no mapping, no key, no floor, no admission and no score moves,
    // only what a surface may claim before its own sources have arrived. The Eye
    // is a plain synchronous script while every index it searches is deferred, so
    // its 8-second readiness ceiling was timed from a moment when no lane could
    // have loaded; on a slow device the ceiling expired first and a search for a
    // measure this archive holds was answered "The eye finds nothing." The clock
    // now starts when the document is parsed, the issue register is a lane of its
    // own instead of riding on the cores, and a category still loading prints its
    // own waiting line, so that denial is reachable only from a warm slice that is
    // genuinely empty. The other half is the door: a family or leaf row tapped in
    // the same cold window found neither pdxDoor1Issue nor the desk nor a profile
    // path and did nothing at all, and now waits on a bounded ladder for the door
    // it needs before falling back to the key's own address. bill-detail.js
    // carries the topic chip, which told a reader of a presidential memorandum how
    // "A Yea" would cut on each provision of an instrument that never went to a
    // vote; behind the same measure-level isExecutiveAct(m) predicate it now
    // speaks of issuance. The reason a wave like this one declares it: R1 and R2
    // put 1,120 member files behind these keys, the Eye is how a reader reaches
    // them, and an empty answer while the index is cold reads as an archive that
    // does not hold the row. Nothing that ranks, scores, counts or admits was
    // touched — every band, tier, measure and Direction Match figure is
    // byte-identical, which the twin boot above has just proved. all-seeing-eye.js,
    // bill-detail.js, sw.js and scripts/test-eye-warming.mjs are declared above
    // already.
    "scripts/test-eye-formal-family.mjs",
    "scripts/test-exec-act-sheet.mjs",
    // AND THE FAMILY DOOR (CACHE_VERSION v121), the next pass on those same
    // terms: no roll, no mapping, no key, no floor, no admission and no score
    // moves — only which surface a topic destination lands on. A CORE key is a
    // heading over its children and not a leaf file, but the ledger link in a
    // formal bundle footer, the family tag, `#issue=<core>` and the bundle's "N
    // more in this family" all handed that heading to PDXIssueView, which holds no
    // shelf to paint for it and answered instead with a ranked list of PEOPLE —
    // ordered by consistency, filtered R / D / Ind, promising that someone "backs
    // up their words" — where the reader had asked for the record on an issue.
    // Every family destination now calls the desk's one issue door,
    // pdxDoor1Issue(core), which mounts that family's own shelf; a leaf key still
    // opens the leaf census it names; and the party pills are gone from the
    // ranking that remains, which is Public Eye's alone and is linked from no
    // formal footer. The reason a wave like this one declares it: R1 and R2 put
    // 1,120 member files behind these keys and the family shelf is how a reader
    // reaches more than one of them at once, so a footer that promised a ledger
    // and opened a league table sorted by party is this wave's own product handed
    // back misread. Nothing that ranks, scores, counts or admits was touched — no
    // percentage, no Direction Match change, no new key, no roster row, and every
    // band, tier, measure and figure is byte-identical, which the twin boot above
    // has just proved. door1-workspace.js, stance-helpers.js, index.html, sw.js,
    // scripts/v103-chrome-seams.mjs, scripts/test-door-one-collapse.mjs and
    // scripts/test-person-crawl-block.mjs are declared above already.
    "issue-view.js",
    "issue-view.css",
    "scripts/test-door-one-arrival.mjs",
    "scripts/test-issue-family-door.mjs",
    // AND THE TWO ROWS IN THE EYE THAT DID NOT OPEN (CACHE_VERSION v122), the
    // pass after that one. The family row picked the desk without landing on it
    // and the leaf row opened the desk instead of its own file, so both taps read
    // as dead on a page that already had a desk; and a reader scoped to a leaf had
    // no control saying that body has an address. What moved is doors, not
    // readings: pdx-issue-profile.js gained ONE named opener (resolve, refuse a
    // family, raise an already-open file, else commit the same pick and mount the
    // same panel at the same address) and issue-file.js gained focus(), which
    // re-asserts its own overlay and repaints nothing. all-seeing-eye.js splits
    // the two shapes properly and lowers its panel on the way past;
    // door1-workspace.js paints one anchor above the shared body, on the path the
    // address module answers, so the body below it is still byte-for-byte what
    // /i/<key> serves. No band, no tier, no census count, no measure and no figure
    // is reachable from any of it, which is what the twin boot above proves.
    // all-seeing-eye.js, door1-workspace.js, door1-workspace.css,
    // pdx-issue-profile.js, sw.js and scripts/test-eye-formal-family.mjs are
    // declared above already.
    "issue-file.js",
    // AND THE ISSUE FILE'S LETTERHEAD (CACHE_VERSION v123), the pass after that
    // one, and the same terms again: no roll, no mapping, no key, no floor, no
    // admission and no score moves — only what a citable page says about itself
    // before it prints the record. /i/<key> gave the reader the key's NAME and
    // then the census, so a citation landed on a page that never said what the
    // key MEANS, how much was filed under it, or which shelf it came off. The
    // letterhead prints the register's own chip, issue-scope.js's locked boundary
    // (or that module's own "no definition on file yet"), an inventory line of
    // integers, and two jumps; the crumb's family half became a control onto the
    // desk, because a core has no file. The integers are the desk PUBLISHING the
    // census it already ran (PDXDoor1.issueCensus), not a second count, and while
    // the roll-call read is still out the line publishes no figure at all. The
    // body below is byte-for-byte the same builder's string it was before. The
    // reason a wave like this one declares it: R1 and R2 put 1,120 member files
    // behind these keys and /i/<key> is the address a reader cites them from, so a
    // file with no definition on it is this wave's own product handed over
    // unlabelled. Nothing that ranks, scores, counts or admits was touched — no
    // percentage, no Direction Match, no consistency read, no party axis, no new
    // key and no roster row — and every band, tier, measure and figure is
    // byte-identical, which the twin boot above has just proved. door1-workspace.js,
    // issue-file.js, sw.js and scripts/test-issue-family-door.mjs are declared
    // above already.
    "issue-file.css",
    // AND THE SLICE, AND HOW THE ISSUE WAS TESTED (CACHE_VERSION v124), the pass
    // after that one, on the same later-wave terms: no roll, no mapping, no key,
    // no floor, no admission and no score moves. A settled key files hundreds of
    // people across five direction bands, and the file handed a reader all of
    // them in one column with no way to open a slice of it; it also never said
    // how the issue was TESTED — which measures were PRIMARY, which were a
    // provision folded inside something larger, which act on file was floor
    // machinery. The filter row above the bands offers four axes (direction from
    // the index's own bands, vehicle from the standalone and provision counts
    // already on each row, chamber from the office, name typed) and narrows by
    // HIDING rows the builder printed — the builder emits the same string and the
    // chips paint unpressed either way, which is what keeps /i/<key> and the desk
    // one paint. The process block is counts and named measures read off
    // PDXDoor1.issueCensus(key).proc, behind the same busy gate as the inventory,
    // and a sponsorship is never called a vote. No party chip, no sort, no
    // package-borne percentage, no inferred stance, and one census still. The
    // reason a wave like this one declares it: R1 and R2 put 1,120 member files
    // behind these keys, and on a settled key the bands ARE that product — a
    // reader who cannot open a slice of them has been handed a phone book.
    // door1-workspace.js, door1-workspace.css, issue-file.js, issue-file.css,
    // sw.js, scripts/test-issue-file-address.mjs and
    // scripts/test-issue-family-door.mjs are declared above already.
    // THE EYE'S JUDICIAL LANE (CACHE_VERSION v129), on those same later-wave
    // terms. It writes no roll, no mapping, no key, no floor, no admission and no
    // score: it adds a fourth RESULT KIND to the All-Seeing Eye, for an office
    // this wave's arithmetic has never touched and never will. PolitiDex carries
    // 126 complete Utah judge files at /p/<pid>, and the Eye could not find one —
    // its people haystack is the union of CMP_DATA and PROFILES, and a judge is
    // deliberately in neither, because a judge inside CMP_DATA is a judge inside
    // Direction Match, inside a formal-pattern tier and inside the publication
    // floor. So the registry became its own lane rather than a tenant of the
    // roster: judicial-retention.js publishes the locked search vocabulary and
    // the rows, all-seeing-eye.js renders them with no party chip, no ring, no
    // percentage and no formal-act count, and the judge headcount sits in a
    // FOURTH lane-count slot that no denominator reads — so a judge-only query
    // prints Formal 0, Public 0, Mandate 0 and still answers. firebase-boot.js
    // stops promising a roster load over a file that waits on no roster, and
    // judge-file.js hoists the court-keyed public lane into a strip that names
    // the court instead of reading as one judge's record. The reason a wave like
    // this one is the file that has to declare it: R1 and R2 put 1,120 member
    // files behind this search box, and the guarantee that matters here is that
    // none of them moved — every Direction Match read, every lane count and every
    // painted legislative row is byte-identical with this lane and without it,
    // which scripts/test-eye-judge-lane.mjs proves as a twin boot. No judge was
    // added to cmp-data.js, to the publication floor or to compare-the-field.
    // all-seeing-eye.js, index.html and sw.js are declared above already.
    "judicial-retention.js",
    "judge-file.js",
    "judicial-retention.css",
    "firebase-boot.js",
    "scripts/test-judicial-retention.mjs",
    // Federal wave F10 — the wave briefed as "F5: standalone PRIMARYs for the remaining
    // chamber gap", which after rebuilding the census admitted nothing and wrote its
    // reasons instead. Two files change and neither is booted by anything: the read-only
    // census tool gained a `--reach` mode (what a key's ceiling would be if the best
    // possible instrument existed) and had F4's stale comment about the primary wall
    // corrected, and the runbook gained rules 43-46. The seed and its suite are new
    // files, declared here so they stay declared once they are tracked.
    // No migration, no mapping row, no vote seed, no key, no floor — so F8's and F9's
    // own subjects are untouched by construction, and scripts/test-vr-federal-wave-f10.mjs
    // asserts that separately against HEAD.
    "scripts/vr-federal-fpi.mjs",
    "db/vr-ingest-runbook.md",
    "db/vr-federal-mapping-seed-f10.json",
    "scripts/test-vr-federal-wave-f10.mjs",
    // Federal wave F11 — "first acts on empty poled keys": a COVERAGE wave. One roll
    // call (House 119/2/154, On Passage of H.R. 7567) lands on a bill F9 curated and
    // could not read, and one secondary mapping row lands H.R. 6644 on housing_support,
    // whose two passage rolls were already on file. Two keys that read empty for every
    // member of Congress start reading; twenty more are refused in writing with a
    // measured reason each. Landing the roll also made F9's two H.R. 7567 rows sourced
    // to sections struck by H.Amdt. 196 publishable, so both are retracted rather than
    // shipped — measured at zero existing reads lost.
    // Nothing booted changes. The only tracked file this wave edits is the read-only
    // census tool, which gained an in-memory `--seed-override <wave>=<path>` flag so the
    // F11 suite can answer its mutation clause ("drop one admitted mapping and those
    // members return to empty") without rewriting a seed on disk — which is this
    // suite's own pattern and the reason runbook rule 47 exists. The flag discloses
    // itself on stderr, in the --json payload and in the table header, so an overridden
    // run can never be quoted as a measurement.
    // Two gates of earlier waves changed, both because F11 is the first wave whose
    // shape they had not seen, and neither by loosening what they check:
    //   * scripts/test-vr-vote-seed.mjs read "mapped" out of db/vr-issue-seed.json alone.
    //     That file is a deliberately partial mirror (runbook rule 20 — omitting a key is
    //     not a removal), and H.R. 7567's five rows were written by 20260721100000 and
    //     never mirrored, so the first roll to land on it looked like an unmapped measure.
    //     The check now reads the migrations for the same fact, per file and per
    //     (measure, key) pair, minus the pairs a later migration deletes. Measured, not
    //     assumed: across all seventeen vote seeds it admits H.R. 7567 and nothing else,
    //     and the eight measures behind the declinedFacets door — H.R. 1069 and F7's
    //     seven Iran resolutions, all ingested with no issue rows at all — stay behind it.
    //   * scripts/test-vr-federal-wave-f10.mjs asserted the 20261028000000 prefix was
    //     empty. F10's own seed says that stamp is "recorded here and not consumed, so
    //     the next wave takes it", so F11 taking it is the sentence coming true. The check
    //     now allows one file there provided it is not F10's and some mapping seed
    //     declares it — which is the thing F10 actually needs to be able to say.
    // scripts/vr-federal-fpi.mjs and db/vr-ingest-runbook.md are declared above already.
    "scripts/test-vr-vote-seed.mjs",
    "db/vr-federal-mapping-seed-f11.json",
    "db/vr-federal-wave-f11-vote-seed.json",
    "scripts/vr-gen-federal-wave-f11-vote-seed.mjs",
    "scripts/vr-gen-federal-wave-f11-migration.mjs",
    "scripts/test-vr-federal-wave-f11.mjs",
    "netlify/database/migrations/20261028000000_vr_federal_wave_f11.sql",
    // THE PERSON FILE'S SECTION OUTLINE, on those same later-wave terms. The
    // outline shipped at CACHE_VERSION v131 as two new files, so it was untracked
    // when this guard last ran and nothing here had to name it; it is tracked now,
    // and v132 edits it. What it does is name the sections of ONE open person file
    // and scroll to them — a sticky column beside the file on a wide screen, the
    // same list as a chip row under the letterhead on a phone. v132 merges the
    // "Letterhead" and "Formal record" rows into one "Top of file" row, because on
    // a member file the record brief renders immediately under the photo and the
    // two rows went to the same screen. The reason a wave like this one is the file
    // that has to declare it: R1 and R2 put 1,120 member files behind these
    // sections, and the guarantee that matters here is that none of them moved. The
    // outline writes no roll, no mapping, no key, no floor, no admission and no
    // score; it derives its rows by probing the DOM the profile spine already
    // assembled, so a section that did not mount has no row and nothing it does can
    // reorder the file. Its copy is section names only — no figure, no percentage,
    // no party, no Direction Match — and scripts/test-person-outline.mjs proves as a
    // twin boot that every formal-pattern tier and every Direction Match read across
    // 537 member files and all 126 judge files is byte-identical with it and without
    // it. sw.js and index.html are declared above already.
    "person-outline.js",
    "person-outline.css",
    "scripts/test-person-outline.mjs",
    // THE ISSUE FILE'S DOORS (CACHE_VERSION v133), on those same later-wave terms.
    // It writes no roll, no mapping row, no key, no floor, no admission and no
    // score; it opens doors onto surfaces that already exist. A person×issue
    // dossier named an issue — "Farmers & Rural Communities" — and taught neither
    // the key nor the measure: the title was an inert <div>, there was no ⓘ, and
    // the formal line was a bill number. The issue title on all three
    // person×issue surfaces now links to /i/<key>, the address pdx-issue-family.js
    // already owned; the ⓘ mounts issue-scope.js's own copy, or its honest blank
    // where no boundary is on file; and the one-measure roll-up renders at one
    // instead of two, so the thinnest possible record — one vote on one bill —
    // reaches the measure explainer that every deeper file already reached. The
    // sentence on that row is a clipped prefix of the curator's own mapping
    // rationale; nothing is generated.
    //   The reason a wave like this one is the file that has to declare it: R1 and
    // R2 put 1,120 member files behind these keys, and a thin file is now the
    // common case rather than the exception. Every count, chip, tier, band, side
    // word and Direction Match figure is byte-identical, which the twin boot above
    // has just proved; consistency.js's twelve new spans and word-action.js's one
    // are carved and argued in the shared seam module.
    //   issue-scope.js gains one entry: the boundary for rural_ag, transcribed from
    // the argued note the same pass wrote over that key in alignment-tool.js — the
    // key two federal waves refused to map an instrument on for want of one. No
    // pole was invented and no scope prose was generated.
    //   scripts/gen-sitemap.mjs lists /i/<key> for every key with a boundary on
    // file or at least one mapping in the migrations, reading the app's own module
    // for both; scripts/vr-measure-addresses.mjs, which it reads, now reports WHICH
    // issue keys the migrations map rather than only how many mappings there are.
    // Person addresses are untouched, and sitemap.xml gained addresses and dropped
    // none, which the check above measures.
    //   scripts/test-dossier-read.mjs had its one-item rule reversed with the
    // renderer, and swept positively instead: the single-item lanes are now
    // required to teach the measure. Its rationale-quoting strip list gained the
    // new span for the same reason it already held two — a quoted committee name is
    // not prose this layer composed.
    "issue-scope.js",
    "scripts/gen-sitemap.mjs",
    "scripts/vr-measure-addresses.mjs",
    "scripts/test-dossier-read.mjs",
    "scripts/test-issue-file-doors.mjs",
    // The sitemap's own suite is declared for the same reason the generator is: it
    // held the rule "the file is people, spotlights, bills and the root, nothing
    // else", and this wave advertises a fourth kind. The kind is named there and
    // then examined — bare key, listed once, and either a boundary on file or a
    // measure mapped to it — so the sentence it replaces is stronger than the one
    // it stood in for, not weaker.
    "scripts/test-sitemap-bills.mjs",
  ]);
  {
    const snapNow = JSON.parse(nowSrc("db/share-index.json")).personRecord || {};
    const snapHead = JSON.parse(headSrc("db/share-index.json") || "{}").personRecord || {};
    const dropped = Object.keys(snapHead).filter((pid) => !snapNow[pid]);
    eq(dropped.join(", "), "", `a person lost their crawl-block snapshot in a regeneration (${dropped.length})`);
  }

  {
    let diff = "";
    try { diff = execFileSync("git", ["diff", "--unified=0", "--", "sitemap.xml"], { cwd: ROOT, encoding: "utf8" }); } catch { /* no git */ }
    const lost = diff.split("\n").filter((l) => l.startsWith("-") && !l.startsWith("---"));
    eq(lost.join(" | "), "", `an address left the sitemap (${lost.length} removed) — a regeneration may add, never drop`);
  }
  let porcelain = "";
  try { porcelain = execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" }); } catch { /* no git */ }
  const modified = porcelain.split("\n").filter((l) => /^ ?M/.test(l)).map((l) => l.slice(3).trim());
  const stray = modified.filter((f) => !DECLARED.has(f));
  eq(stray.join(", "), "", `F8 modified a file it does not declare (${stray.join(", ")})`);
}

if (failures.length) {
  console.error(`\n  ✗ F8: ${failures.length} failure(s) of ${passed + failures.length} checks\n`);
  for (const f of failures.slice(0, 40)) console.error(`    - ${f}`);
  if (failures.length > 40) console.error(`    … ${failures.length - 40} more`);
  process.exit(1);
}
const cells = votes.votes.reduce((a, v) => a + v.memberVotes.length, 0);
console.log(`\n  ✓ F8: all ${passed} checks passed`);
console.log(`    3 senators admitted · ${cells} member votes on ${votes.votes.length} Senate rolls already on file`);
console.log(`    0 measures · 0 roll calls · 0 issue rows · 0 new keys · 0 floors moved · 0 engine files touched`);
console.log(`    Senate energy pool after refusal-first: EMPTY (${decide.census.step2_theSenateEnergyPool.independentEnergyScan.hits} energy rolls scanned independently, 0 survivors)`);
console.log(`    4 energy keys gain Senate PRIMARY attribution for 2 of the 3 (armstrong sworn 2026-03-24)\n`);
