#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex Voting Record — Federal wave F8 migration
// ─────────────────────────────────────────────────────────────────────────────
// Emits the additive, idempotent migration for wave F8 from
// db/vr-federal-wave-f8-attribution-seed.json and db/vr-federal-mapping-seed-f8.json.
//
// F8 IS AN ATTRIBUTION WAVE, NOT AN INGEST WAVE, AND THAT IS THE FINDING
// The brief asked for two halves: admit three senators no Senate roll call could
// reach, and ingest contested Senate energy / permitting rolls. The first half
// shipped. The second half is EMPTY, and the census says so in writing rather
// than manufacturing a row to fill it: after refusal-first there is no contested
// Senate standalone, discharge or passage roll left in the 119th on any energy
// subject. An independent scan of all 890 listed rolls for energy vocabulary
// found the same zero, so the emptiness is a fact about the Senate's calendar
// and not a broken filter — the failure mode wave F6 actually shipped, when it
// read the LIS <vote_tally> display string and every roll came back unanimous.
//
// So this migration creates NO measure, NO roll call, NO issue mapping, NO issue
// key, NO stated position and NO profile. What it does is pay the debt the roster
// admission creates: three senators the ingest could not identify now have their
// Senate record on the rolls that were already here.
//
// EVERY CELL IS A RECORDED VOTE, READ OFF THE SENATE'S OWN DOCUMENT
// Identity runs through three published identifiers and no name matching:
// <lis_member_id> → Bioguide (congress-legislators, current and historical) →
// profile slug (db/vr-member-map.json). An id that does not resolve is skipped
// and counted, never guessed. Fail-closed, and the verification block asserts it.
//
// ON CONFLICT DO NOTHING IS LOAD-BEARING
// These 73 rolls already hold thousands of cells and the pull re-checked every one
// against the Senate's document. The insert must not restate the ones that agree
// and must not be able to overwrite the ones that do not, so a disagreement stays
// visible instead of being laundered away by an attribution pass.
//
//   node scripts/vr-gen-federal-wave-f8-migration.mjs > netlify/database/migrations/<ts>_vr_federal_wave_f8.sql
//
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { assertSeedPidsMatchMap } from "./vr-seed-pid-guard.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED_PATH = "db/vr-federal-wave-f8-attribution-seed.json";
const MAP_SEED_PATH = "db/vr-federal-mapping-seed-f8.json";
const seed = JSON.parse(readFileSync(join(ROOT, SEED_PATH), "utf8"));
const decisions = JSON.parse(readFileSync(join(ROOT, MAP_SEED_PATH), "utf8"));
const memberMap = JSON.parse(readFileSync(join(ROOT, "db", "vr-member-map.json"), "utf8"));
const admitted = JSON.parse(readFileSync(join(ROOT, "db", "vr-roster-admitted.json"), "utf8"));

// A seeded politicianId is a cached resolution of a Bioguide, and a cached resolution
// can go stale the moment the map is corrected. Refuse rather than repair.
const pidCheck = assertSeedPidsMatchMap(seed, memberMap, SEED_PATH);

// ── Pre-flight: the generator refuses to emit SQL that disagrees with its own inputs ──
// A migration is the one artifact nobody re-derives before trusting it, so every claim
// its header makes is checked here first, against the seeds rather than against itself.
const WAVE_SLUGS = Object.keys(seed.perSlug).sort();
const fail = (m) => { process.stderr.write(`\nvr-gen-federal-wave-f8-migration: ${m}\n\n`); process.exit(1); };

if (decisions.measures.length !== 0) {
  fail(`${MAP_SEED_PATH} carries ${decisions.measures.length} measure(s). F8 is attribution-only; a wave that `
    + `grew a measure after the census closed needs its census re-run, not its migration regenerated.`);
}
if (decisions.census.step2_theSenateEnergyPool.energyPool.length !== 0) {
  fail(`${MAP_SEED_PATH} now reports a non-empty Senate energy pool. That is a different wave with a `
    + `different argument — re-run the census and write the measures rather than emitting this migration.`);
}
const wave = admitted.waves?.federal_wave_f8_aug2026 || admitted.federal_wave_f8_aug2026;
const admittedF8 = [...(Array.isArray(wave) ? wave : Object.keys(wave || {}))].sort();
if (admittedF8.join("|") !== WAVE_SLUGS.join("|")) {
  fail(`the slugs this migration writes (${WAVE_SLUGS.join(", ")}) are not the slugs `
    + `db/vr-roster-admitted.json admits for wave F8 (${admittedF8.join(", ") || "none"}). `
    + `The roster file is the ceiling; a cell for a slug it does not admit must not be written.`);
}
for (const [slug, s] of Object.entries(seed.perSlug)) {
  const mapped = memberMap.map[s.bioguideId];
  if (mapped !== slug) {
    fail(`${s.bioguideId} resolves to ${mapped ? `'${mapped}'` : "no roster slug"} in db/vr-member-map.json, `
      + `but the seed scopes it to '${slug}'.`);
  }
}
const cells = seed.votes.reduce((a, v) => a + v.memberVotes.length, 0);
if (cells !== seed.cells) fail(`seed header says ${seed.cells} cells; the rows count ${cells}.`);
if (seed.votes.length !== seed.rollCalls) fail(`seed header says ${seed.rollCalls} rolls; the rows count ${seed.votes.length}.`);
const perSlugCounted = {};
for (const v of seed.votes) for (const r of v.memberVotes) perSlugCounted[r.politicianId] = (perSlugCounted[r.politicianId] || 0) + 1;
for (const [slug, s] of Object.entries(seed.perSlug)) {
  if (perSlugCounted[slug] !== s.cells) fail(`seed header says ${s.cells} cells for ${slug}; the rows count ${perSlugCounted[slug] || 0}.`);
}
for (const slug of Object.keys(perSlugCounted)) {
  if (!WAVE_SLUGS.includes(slug)) fail(`the seed carries cells for '${slug}', which is outside this wave's scope.`);
}
const POSITIONS = new Set(["yea", "nay", "present", "not_voting"]);
const IS_PARTY = new Set(["with_party", "against_party"]);
for (const v of seed.votes) {
  if (v.chamber !== "senate") fail(`${v.congress}/${v.session} roll ${v.rollNumber} is a ${v.chamber} roll. F8 writes Senate cells only.`);
  for (const r of v.memberVotes) {
    if (!POSITIONS.has(r.position)) fail(`position '${r.position}' is outside the closed vocabulary.`);
    if (r.isParty != null && !IS_PARTY.has(r.isParty)) fail(`is_party '${r.isParty}' is outside the closed vocabulary.`);
  }
}

// ── SQL ──
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const L = [];
const rosterSlugs = [...new Set(Object.values(memberMap.map))].sort();
const byCongress = {};
seed.votes.forEach((v) => { const k = `${v.congress}/${v.session}`; byCongress[k] = (byCongress[k] || 0) + 1; });
const energyRows = decisions.attribution.energyKeysGained.rows.filter((r) => r.gainedBy.length);
const energyGainers = [...new Set(energyRows.flatMap((r) => r.gainedBy))].sort();
const noEnergy = WAVE_SLUGS.filter((s) => !energyGainers.includes(s));
if (!energyGainers.length) {
  fail(`${MAP_SEED_PATH} records no slug gaining an energy PRIMARY. The wave's stated point is that the four `
    + `energy keys gain Senate attribution for the newly admitted senators; if that is no longer true the `
    + `census needs re-running, not the migration re-emitting.`);
}
// Read out of the database at census time, not guessed: the issue rows already on the 73
// measures behind this wave's rolls. Frozen here so a later edit that grows a mapping fires.
const PRE_EXISTING_ISSUE_ROWS = 197;
const mappedRolls = seed.votes.filter((v) => v.issueKeys.length).length;
const rollKeys = seed.votes.map((v) => `(${q(v.chamber)},${v.congress},${v.session},${v.rollNumber})`).join(", ");

L.push("-- ---------------------------------------------------------------------------");
L.push("-- Federal wave F8 — three admitted senators, attributed on rolls already here");
L.push("-- ---------------------------------------------------------------------------");
L.push(`-- Generated by scripts/vr-gen-federal-wave-f8-migration.mjs from ${SEED_PATH}`);
L.push(`-- and ${MAP_SEED_PATH}. Do not hand-edit: regenerate, or roll forward.`);
L.push("--");
L.push(`-- ${cells} member votes filled across ${seed.votes.length} Senate roll calls already in the record`);
L.push(`-- ${WAVE_SLUGS.length} newly admitted members gain their Senate record: ${WAVE_SLUGS.join(", ")}`);
L.push("-- 0 measures created · 0 roll calls created · 0 issue mappings created · 0 new issue keys");
L.push("-- 0 stated positions written · 0 weights changed · 0 existing cells rewritten");
L.push(`-- Windows: ${Object.entries(byCongress).map(([k, n]) => `${k} (${n})`).join(", ")}`);
L.push("--");
L.push("-- THE ENERGY HALF OF THIS WAVE IS EMPTY, AND THAT IS THE FINDING");
const p = decisions.census.step2_theSenateEnergyPool;
L.push(`-- The brief asked for contested Senate rolls on energy_production, permitting_reform,`);
L.push("-- lands_energy or climate_action. After refusal-first there are none. The funnel:");
p.funnel.forEach((f) => L.push(`--   ${f.step}: ${f.from} → ${f.to}${f.note ? ` (${f.note})` : ""}`));
L.push(`-- A funnel that returns zero looks exactly like a funnel with a broken filter — wave F6`);
L.push("-- shipped that bug, reading LIS's <vote_tally> display string so '51-42' parsed as 5142");
L.push("-- and every roll came back unanimous. So the census ALSO scans all");
L.push(`-- ${p.listed.total} listed rolls for energy vocabulary independently of the funnel:`);
L.push(`-- ${p.independentEnergyScan.hits} mention energy, ${p.independentEnergyScan.survivorsTheFunnelMissed} survive. Where they died:`);
Object.entries(p.independentEnergyScan.whereTheEnergyRollsDied)
  .filter(([k]) => !k.startsWith("_"))
  .forEach(([k, n]) => L.push(`--   ${k}: ${n}`));
L.push("-- Nothing was restuffed to fill the gap: no war_powers measure was re-keyed, no NDAA or");
L.push("-- appropriations roll was admitted, and gov_regulation and public_schools are untouched.");
L.push("--");
L.push("-- WHAT THE ENERGY KEYS DO GAIN");
L.push("-- Not measures — members. All three senators held zero acts on all four energy keys,");
L.push("-- because they could not be attributed a vote at all. They now hold acts on Senate");
L.push("-- PRIMARY measures that were already on file:");
energyRows.forEach((r) => {
  L.push(`--   ${r.key}: ${r.gainedBy.join(", ")}`);
  r.throughRolls.forEach((t) => L.push(`--     via ${t}`));
});
L.push("--");
L.push("-- WHY THESE THREE COULD NOT BE ATTRIBUTED BEFORE");
L.push(`-- Not for want of roll calls: all ${seed.votes.length} below were already here, and ${mappedRolls} of the measures`);
L.push("-- behind them already carry curated issue mappings. The ingest attributes a vote only");
L.push("-- to a member in db/vr-member-map.json, that map is read out of the curated portrait");
L.push("-- shelf, and none of these three was in it — two had no portrait to read a Bioguide out");
L.push("-- of and none was named by hand. Every Senate roll in the corpus therefore lost the same");
L.push("-- three rows. Wave F7 measured the loss at 37 unattributable rows per Senate roll and");
L.push("-- recorded it as a gap rather than guessing, because admitting a roster slug is a roster");
L.push("-- wave with its own argument. This is that wave.");
L.push("--");
L.push("-- IDENTITY WAS VERIFIED TWICE, BY TWO INDEPENDENT PUBLISHED PATHS");
decisions.census.step1_theThreeSenators.senators.forEach((s) => {
  L.push(`--   ${s.name} → ${s.slug} · Bioguide ${s.bioguide} · LIS ${s.lisMemberId} · ${s.state} `
    + `· ${s.checksPassed} checks`);
});
L.push("-- Path 1: name + state against the sitting-senator roster. Path 2: the <lis_member_id>");
L.push("-- the Senate's own roll XML records for that senator, against the same dataset's id.lis.");
L.push("-- Path 2 carries the weight here, because the Senate identifies a voter by LIS id and");
L.push("-- not by Bioguide, so the LIS id is what actually connects a slug to a vote.");
L.push("--");
L.push("-- is_party IS RECOMPUTED, NOT INHERITED");
L.push("-- Each cell's is_party is derived from the full chamber tally in the same document the");
L.push("-- vote was read from — the member's own party's yea/nay split on that roll. It is a");
L.push("-- stored fact about the roll, not a score; nothing in the product ranks on it, and no");
L.push("-- party name or party count reaches any string a reader sees.");
L.push("--");
L.push(`-- ${seed.discrepancies.rows.length} CELL(S) THIS MIGRATION REFUSES TO TOUCH`);
L.push(`-- ${seed.storedCellsConfirmed} cells already stored on these rolls were re-read against the Senate's`);
L.push(`-- document and agree; ${seed.discrepancies.rows.length} do not. ON CONFLICT DO NOTHING throughout, so this`);
seed.discrepancies.rows.forEach((d) => L.push(`--   ${d.congress}/${d.session} roll ${d.roll}: ${d.slug} stored '${d.db}', document says '${d.lis}'`));
L.push("-- migration cannot restate the agreeing cells and cannot overwrite a disagreeing one.");
L.push("-- Correcting a stored vote is a deliberate act with its own citation and its own");
L.push("-- migration, not something that happens in the quiet middle of an attribution pass.");
L.push("--");
L.push("-- WHAT IS STILL LOST, SAID OUT LOUD");
L.push(`-- ${seed.unresolvedCells.bioguideNotInMemberMap} recorded votes on these rolls resolve to a Bioguide the member map does not`);
L.push("-- carry — essentially all of them former senators, whose votes sit in the 117th and 118th");
L.push("-- windows and have no profile to attribute to. This wave does not close that, and does");
L.push(`-- not pretend to. ${seed.outOfScopeCells.total} further fillable cells belong to slugs outside this wave's`);
L.push(`-- scope (${Object.entries(seed.outOfScopeCells.bySlug).map(([k, n]) => `${k} ${n}`).join(", ")}) and are deliberately left: a densification pass over the`);
L.push(`-- rest of the chamber is a different wave. ${seed.notServing.total} roll x senator pairs are absences rather`);
L.push("-- than gaps — the senator was not serving — and no cell is written for an absence.");
L.push(`-- ${seed.rollsRejected} Senate rows in vr_rollcalls store no roll number, so there is no LIS document to`);
L.push("-- verify them against; they are refused by name below rather than fetched at a guessed URL.");
seed.rejectedRolls.rows.forEach((r) => L.push(`--   ${r.congress}/${r.session} ${r.measure ?? "(no measure)"}: ${(r.why || []).join("; ")}`));
L.push("--");
L.push(`-- Seed → member-map agreement: ${pidCheck.checked} cached politicianId(s) re-checked against`);
L.push("-- db/vr-member-map.json at generation time; 0 stale, 0 unresolvable.");
L.push("");
L.push("DO $$");
L.push("DECLARE");
L.push("  rc BIGINT;");
L.push("BEGIN");

for (const v of seed.votes) {
  const where = `${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber}`;
  const primary = v.primaryKeys.length ? v.primaryKeys.join(", ") : "no PRIMARY key";
  L.push("");
  L.push(`  -- ${where} · ${v.measure} · ${v.question} · ${v.voteDate}`);
  L.push(`  --   PRIMARY: ${primary}${v.issueKeys.length ? ` · all keys: ${v.issueKeys.join(", ")}` : " · no issue mappings"}`);
  L.push(`  --   ${v.heldBefore} cell(s) already stored; +${v.memberVotes.length} filled from the Senate's document`);
  L.push(`  --   ${v.sourceUrl}`);
  L.push("  SELECT id INTO rc FROM vr_rollcalls");
  L.push(`   WHERE chamber = ${q(v.chamber)} AND congress = ${v.congress} AND session = ${v.session}`);
  L.push(`     AND roll_number = ${v.rollNumber} LIMIT 1;`);
  L.push("  IF rc IS NULL THEN");
  L.push(`    RAISE EXCEPTION 'Federal wave F8: ${where} is not in vr_rollcalls. This wave fills cells on rolls that already exist and creates none.';`);
  L.push("  END IF;");
  L.push("  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES");
  // The identity comment goes ABOVE its row, not after it: a trailing `--` on a VALUES row
  // swallows the comma that separates it from the next one.
  v.memberVotes.forEach((r, i) => {
    L.push(`    -- LIS ${r.lisMemberId} \u2192 ${r.bioguideId} \u2192 ${r.politicianId} (${r.party}-${r.state})`);
    L.push(`    (rc, ${q(r.politicianId)}, ${q(r.position)}, ${r.isParty ? q(r.isParty) : "NULL"})`
      + (i === v.memberVotes.length - 1 ? "" : ","));
  });
  L.push("  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;");
}

L.push("END $$;");
L.push("");

// ── Verification ──
L.push("-- ────────────────────────────────────────────────────────────────────────────");
L.push(`-- VERIFICATION — scoped to THIS WAVE'S ${seed.votes.length} roll calls and ${WAVE_SLUGS.length} slugs.`);
L.push("-- Nothing below counts a session-wide or corpus-wide total. A guard that fails because");
L.push("-- some other wave landed is a guard that gets deleted, so every count here is taken over");
L.push("-- the named rolls only. The roll ids live in an integer[] local rather than a temp table:");
L.push("-- a data-only migration that sorts after the newest drizzle snapshot may not declare an");
L.push("-- object, and scripts/test-vr-corrections.mjs reads any CREATE of a TABLE as a");
L.push("-- declaration regardless of how temporary it is. The element type is vr_rollcalls.id.");
L.push("-- ────────────────────────────────────────────────────────────────────────────");
L.push("DO $$");
L.push("DECLARE");
L.push("  n_rolls integer; n_cells integer; n_badpos integer; n_badparty integer; n_orphan integer;");
L.push("  n_tally integer; n_chamber integer; n_rule11 integer; n_issues integer; n_measures integer;");
L.push("  n_slug integer; n_energy integer; s text;");
L.push("  roll_ids integer[];");
L.push("BEGIN");
L.push("  SELECT array_agg(id) INTO roll_ids FROM vr_rollcalls");
L.push(`   WHERE (chamber, congress, session, roll_number) IN (${rollKeys});`);
L.push("  n_rolls := coalesce(array_length(roll_ids, 1), 0);");
L.push(`  IF n_rolls <> ${seed.votes.length} THEN`);
L.push(`    RAISE EXCEPTION 'Federal wave F8: expected ${seed.votes.length} roll calls already on file, found %', n_rolls;`);
L.push("  END IF;");
L.push("");
L.push("  -- The wave's own cells, counted exactly rather than as a floor. None of the three held");
L.push("  -- a single cell anywhere in the corpus before this migration, so an exact count is");
L.push("  -- available here and a floor would hide a partial insert.");
L.push("  SELECT count(*) INTO n_cells FROM vr_member_votes");
L.push(`   WHERE rollcall_id = ANY(roll_ids) AND politician_id IN (${WAVE_SLUGS.map(q).join(", ")});`);
L.push(`  IF n_cells <> ${cells} THEN`);
L.push(`    RAISE EXCEPTION 'Federal wave F8: expected ${cells} cells for the three admitted senators on these rolls, found %', n_cells;`);
L.push("  END IF;");
L.push("");
L.push("  -- And per slug, because the totals can be right while one senator's rows are missing.");
for (const slug of WAVE_SLUGS) {
  const s = seed.perSlug[slug];
  L.push(`  SELECT count(*) INTO n_slug FROM vr_member_votes`);
  L.push(`   WHERE rollcall_id = ANY(roll_ids) AND politician_id = ${q(slug)};`);
  L.push(`  IF n_slug <> ${s.cells} THEN`);
  L.push(`    RAISE EXCEPTION 'Federal wave F8: expected ${s.cells} cells for ${slug} (${s.name}, LIS ${s.lisMemberId}), found %', n_slug;`);
  L.push("  END IF;");
}
L.push("");
L.push("  -- The point of the wave, asserted where it cannot rot: each senator this wave says gains an");
L.push("  -- energy act now holds at least one judged vote on a measure carrying one of the four");
L.push("  -- energy keys as PRIMARY. If a later correction unmaps those measures this fires, and the");
L.push("  -- wave's claim stops being true and silent at the same time.");
if (noEnergy.length) {
  L.push(`  -- Scoped to ${energyGainers.join(", ")} and NOT to ${noEnergy.join(", ")}, because the`);
  L.push("  -- claim is not true of them and a guard that asserts a falsehood gets deleted rather than");
  L.push(`  -- fixed. ${noEnergy.join(", ")} was sworn 2026-03-24 and the Senate has held no contested`);
  L.push("  -- roll on a measure carrying an energy key as PRIMARY since — the same emptiness the census");
  L.push("  -- found looking forward. He holds lands_energy and lands_preserve as SECONDARY keys only.");
}
L.push(`  FOREACH s IN ARRAY ARRAY[${energyGainers.map(q).join(", ")}] LOOP`);
L.push("    SELECT count(*) INTO n_energy FROM vr_member_votes v");
L.push("     JOIN vr_rollcalls r ON r.id = v.rollcall_id");
L.push("     JOIN vr_measure_issues mi ON mi.measure_id = r.measure_id");
L.push("     WHERE v.politician_id = s AND v.position IN ('yea','nay') AND mi.is_primary");
L.push("       AND mi.issue_key IN ('energy_production','permitting_reform','lands_energy','climate_action');");
L.push("    IF n_energy < 1 THEN");
L.push("      RAISE EXCEPTION 'Federal wave F8: % holds no judged vote on any measure carrying an energy key as PRIMARY. The wave exists to give the energy keys Senate attribution for these three.', s;");
L.push("    END IF;");
L.push("  END LOOP;");
L.push("");
L.push("  SELECT count(*) INTO n_badpos FROM vr_member_votes");
L.push("   WHERE rollcall_id = ANY(roll_ids) AND position NOT IN ('yea','nay','present','not_voting');");
L.push("  IF n_badpos > 0 THEN");
L.push("    RAISE EXCEPTION 'Federal wave F8: % member vote(s) carry a position outside the closed vocabulary.', n_badpos;");
L.push("  END IF;");
L.push("");
L.push("  SELECT count(*) INTO n_badparty FROM vr_member_votes");
L.push("   WHERE rollcall_id = ANY(roll_ids) AND is_party IS NOT NULL");
L.push("     AND is_party NOT IN ('with_party','against_party');");
L.push("  IF n_badparty > 0 THEN");
L.push("    RAISE EXCEPTION 'Federal wave F8: % member vote(s) carry an is_party outside the closed vocabulary.', n_badparty;");
L.push("  END IF;");
L.push("");
L.push("  -- Fail-closed attribution, asserted rather than assumed. A politician_id on one of these");
L.push("  -- rolls that is not in the roster means the resolver guessed at somebody. This is the one");
L.push("  -- guard the wave's own subject makes non-negotiable: the whole reason these three were");
L.push("  -- missing is that the ingest refuses to attribute a vote it cannot identify, and a wave");
L.push("  -- that adds roster slugs is exactly when that refusal is most tempting to soften.");
L.push("  SELECT count(*) INTO n_orphan FROM vr_member_votes v");
L.push("   WHERE v.rollcall_id = ANY(roll_ids)");
L.push(`     AND v.politician_id NOT IN (${rosterSlugs.map(q).join(", ")});`);
L.push("  IF n_orphan > 0 THEN");
L.push("    RAISE EXCEPTION 'Federal wave F8: % member vote(s) on these rolls carry a politician_id outside db/vr-member-map.json. Attribution here is fail-closed, so this is a bug, not a roster gap.', n_orphan;");
L.push("  END IF;");
L.push("");
L.push("  -- The tally is the chamber's, not the roster's. The subset check compares the yea+nay");
L.push("  -- pool against the attributed rows carrying a JUDGED position, which genuinely is a");
L.push("  -- subset of it — attributed rows also include not_voting, so on a near-unanimous roll");
L.push("  -- the naive comparison is wrong in the other direction.");
L.push("  SELECT count(*) INTO n_tally FROM vr_rollcalls r");
L.push("   WHERE r.id = ANY(roll_ids)");
L.push("     AND (r.totals->>'yea')::int + (r.totals->>'nay')::int");
L.push("         < (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id = r.id");
L.push("             AND v.position IN ('yea','nay'));");
L.push("  IF n_tally > 0 THEN");
L.push("    RAISE EXCEPTION 'Federal wave F8: % roll(s) have a yea+nay pool smaller than the number of attributed yea/nay rows. The attributed set is a subset of the chamber, so this means the totals were recomputed from the rows.', n_tally;");
L.push("  END IF;");
L.push("");
L.push("  -- And the check that catches a roster-derived total, which is the failure worth fearing:");
L.push("  -- it would publish a vote that did not happen, with a plausible-looking margin. Every");
L.push("  -- roll here is a Senate roll accounting for 99 or 100 seats. The roster admits 101");
L.push("  -- senators across three Congresses, so a total assembled from the rows misses the bound.");
L.push("  -- present/notVoting are coalesced because one roll (119/1/127, S. 331, 84-16) stores");
L.push("  -- totals with neither key rather than with zeros, and rewriting stored totals to tidy a");
L.push("  -- guard would be this migration overwriting data it came to read.");
L.push("  SELECT count(*) INTO n_chamber FROM vr_rollcalls r");
L.push("   WHERE r.id = ANY(roll_ids)");
L.push("     AND (r.totals->>'yea')::int + (r.totals->>'nay')::int");
L.push("       + coalesce((r.totals->>'present')::int, 0) + coalesce((r.totals->>'notVoting')::int, 0)");
L.push("       NOT BETWEEN 99 AND 100;");
L.push("  IF n_chamber > 0 THEN");
L.push("    RAISE EXCEPTION 'Federal wave F8: % roll(s) do not account for a full Senate. A Senate roll totals 99-100; anything near the roster size is the attributed subset masquerading as the chamber.', n_chamber;");
L.push("  END IF;");
L.push("");
L.push("  -- Rule 11 in the migration and not only in the harness, because the bug it catches lives");
L.push("  -- in the LIS path this wave read from: <vote_tally> renders '51-42' as a DISPLAY STRING,");
L.push("  -- and read as a number that is 5142, which makes the losing side zero and every roll look");
L.push("  -- unanimous. The authority is the <count><yeas>/<nays> block. This wave admits no roll, so");
L.push("  -- the guard is here to protect the rolls it WRITES INTO from a re-pull under that bug.");
L.push("  SELECT count(*) INTO n_rule11 FROM vr_rollcalls r");
L.push("   WHERE r.id = ANY(roll_ids)");
L.push("     AND 10 * least((r.totals->>'yea')::int, (r.totals->>'nay')::int)");
L.push("         < (r.totals->>'yea')::int + (r.totals->>'nay')::int;");
L.push("  IF n_rule11 > 0 THEN");
L.push("    RAISE EXCEPTION 'Federal wave F8: % roll(s) fail rule 11 — the losing side is under a tenth of the yea+nay pool.', n_rule11;");
L.push("  END IF;");
L.push("");
L.push("  -- Attribution-only, asserted from the other side. This wave writes no measure and no");
L.push("  -- issue mapping, so the measure count behind these rolls and the issue-row count on those");
L.push("  -- measures are both frozen at what they were before it ran. If a later edit to this file");
L.push("  -- quietly grows a measure or a key, these two fire.");
L.push("  SELECT count(DISTINCT measure_id) INTO n_measures FROM vr_rollcalls WHERE id = ANY(roll_ids);");
L.push(`  IF n_measures <> ${seed.votes.length} THEN`);
L.push(`    RAISE EXCEPTION 'Federal wave F8: expected ${seed.votes.length} distinct measures behind these rolls, found %', n_measures;`);
L.push("  END IF;");
L.push("");
L.push("  SELECT count(*) INTO n_issues FROM vr_measure_issues");
L.push("   WHERE measure_id IN (SELECT measure_id FROM vr_rollcalls WHERE id = ANY(roll_ids));");
L.push(`  IF n_issues <> ${PRE_EXISTING_ISSUE_ROWS} THEN`);
L.push(`    RAISE EXCEPTION 'Federal wave F8: expected the ${PRE_EXISTING_ISSUE_ROWS} pre-existing issue rows on these measures to be untouched, found %. This wave creates and changes no issue mapping.', n_issues;`);
L.push("  END IF;");
L.push("");
L.push(`  RAISE NOTICE 'Federal wave F8 verified: % cells for ${WAVE_SLUGS.length} newly admitted senators across % Senate roll calls already on file; 0 measures, 0 roll calls, 0 issue mappings, 0 new keys. Senate energy pool after refusal-first: empty.', n_cells, n_rolls;`);
L.push("END $$;");
L.push("");

process.stdout.write(L.join("\n"));
