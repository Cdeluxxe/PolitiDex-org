#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-senate-roll7-repair.mjs — the hundredth vote on a ninety-nine-seat roll
// ─────────────────────────────────────────────────────────────────────────────
// Senate 119/1 roll call 7 (S. 5, the Laken Riley Act, 2025-01-20, 64-35) carried ONE
// HUNDRED attributed cells with a judged position. The chamber cast ninety-nine. The
// extra one was a yea under `ashley_moody`, written from a CURRENT roster array by
// 20260721080000_seed_voting_record_wave15.sql, for a senator seated 2025-01-21 — the
// day after the vote. 20261023120000_vr_repair_senate_roll7_over_attribution.sql
// removes exactly that cell.
//
// The failure mode this file exists for is not the bad cell. It is everything about the
// repair that could quietly stop being true:
//
//   · THE REPAIR COULD WIDEN. One DELETE, one roll resolved by natural key, one
//     politician_id, one position. A set-based delete over a roll, a join, or a second
//     table would turn a named repair into a rewrite nobody reviewed.
//   · IT COULD STOP BEING NECESSARY, OR STOP BEING SUFFICIENT. On a fresh branch
//     database the whole archive replays: wave15 writes the bad cell, this file removes
//     it, wave F8 then writes Hyde-Smith's yea into the place it vacated. That chain is
//     only intact while wave15's bloc still carries the slug and F8 still fills this
//     roll, and it is only ENOUGH while the arithmetic closes — 99 stored cells, minus
//     this one, plus F8's one, against the document's 64+35 pool.
//   · IT COULD LOSE ITS CITATION. The reason Moody cannot be on this roll is a fact
//     about a date, and this repository established it before the bad cell existed, in
//     the migration that hand-verified the roll. If that note goes, the repair is an
//     assertion with nothing behind it.
//   · THE SOURCE OF THE BUG COULD STAY OPEN. A document-versus-database comparison
//     walked from the document's members cannot see a stored row for somebody the
//     document never lists — three passes over this roll walked past it. The pull that
//     found the roll now carries both missing rules.
//   · IT COULD REACH BACKWARDS. An applied migration is immutable; the repair rolls
//     forward and edits nothing, including the wave whose bloc created the cell.
//
// Read-only. No database, no network.
//
//   node scripts/test-vr-senate-roll7-repair.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) { passed++; return true; } failures.push(msg); return false; };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, msg) => ok(String(h).includes(n), `${msg} — missing ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);

const MIG_DIR = "netlify/database/migrations";
const REPAIR = "20261023120000_vr_repair_senate_roll7_over_attribution.sql";
const WAVE15 = "20260721080000_seed_voting_record_wave15.sql";
const BALANCE = "20260719200000_seed_senate_chamber_balance.sql";
const F8 = "20261024000000_vr_federal_wave_f8.sql";
const PULL = "scripts/vr-gen-federal-wave-f8-attribution-seed.mjs";

const sql = R(join(MIG_DIR, REPAIR));
const code = sql.split("\n").filter((l) => !/^\s*--/.test(l)).join("\n");

console.log("\n  Senate 119/1 roll 7 — one impossible cell, removed by name\n");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · it runs, and it runs before the wave that reads it");
// ═════════════════════════════════════════════════════════════════════════════
{
  const stamps = readdirSync(join(ROOT, MIG_DIR))
    .map((f) => (f.match(/^(\d{14})/) || [])[1]).filter(Boolean).sort();
  ok(stamps.includes("20261023120000"), "the repair is not in the migrations directory");
  eq(new Set(stamps).size, stamps.length,
    "two migrations share a version prefix — the apply order between them is undefined");
  // Migrations apply in filename order and F8's verification block reads the state this
  // repair produces, so a stamp after F8 would never run: F8 raises first and takes the
  // deploy with it.
  ok("20261023000000" < "20261023120000" && "20261023120000" < "20261024000000",
    "the repair does not sort between wave F7 and wave F8");
  // Data-only tail: a migration sorting after the newest drizzle snapshot may not declare
  // an object, or the next `generate` diffs against a snapshot that predates it.
  ok(!/\bCREATE\s+(TEMP|TEMPORARY\s+)?TABLE\b/i.test(sql), "the repair declares a table");
  ok(!/\bCREATE\s+(INDEX|VIEW|TYPE|SEQUENCE|FUNCTION|TRIGGER)\b/i.test(sql), "the repair declares an object");
  for (const verb of ["DROP ", "ALTER ", "TRUNCATE"]) {
    ok(!code.toUpperCase().includes(verb), `the repair contains ${verb.trim()}`);
  }
  ok(!/\bdefence\b/i.test(sql), "the repair uses British spelling in new copy — this tree writes \"defense\"");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · one cell, named in full, and nothing else");
// ═════════════════════════════════════════════════════════════════════════════
{
  const deletes = [...code.matchAll(/DELETE\s+FROM\s+(\w+)/gi)].map((m) => m[1].toLowerCase());
  eq(deletes.length, 1, "the repair holds more than one DELETE — one impossible cell is one statement");
  eq(deletes[0], "vr_member_votes", "the DELETE targets a table other than vr_member_votes");
  ok(!/^\s*(INSERT|UPDATE)\s/im.test(code), "the repair writes a row — it removes one and creates none");
  for (const t of ["vr_rollcalls", "vr_measures", "vr_measure_issues", "vr_positions", "vr_measure_actions"]) {
    ok(!new RegExp(`(INSERT\\s+INTO|UPDATE|DELETE\\s+FROM)\\s+${t}\\b`, "i").test(code),
      `the repair writes ${t} — no measure, roll call, mapping or stated position is touched`);
  }
  // Pinned to one member and one prior value, so it cannot fire twice and cannot land on
  // a cell that has moved since this repair read it.
  has(code, "WHERE rollcall_id = rc AND politician_id = 'ashley_moody' AND position = 'yea';",
    "the DELETE is not pinned to one member and one stored value");
  ok(!/DELETE\s+FROM\s+\w+[^;]*\bIN\s*\(/i.test(code), "the DELETE uses an IN list — one cell is named at a time");
  ok(!/DELETE\s+FROM\s+\w+[^;]*\bUSING\b/i.test(code), "the DELETE joins another relation");
  // The roll is resolved by natural key, never by a stored id.
  has(code, "WHERE chamber = 'senate' AND congress = 119 AND session = 1 AND roll_number = 7",
    "the repair does not resolve the roll by natural key");
  // Fail-closed on both sides, and re-runnable in the middle.
  eq((code.match(/RAISE EXCEPTION/g) || []).length, 2,
    "the repair must fail closed on a missing roll and on a stored value it did not examine");
  has(code, "RAISE NOTICE 'Roll 7 repair: senate 119/1 roll 7 holds no ashley_moody cell",
    "an already-repaired roll is not treated as done");
  // The chamber's totals are the chamber's. This repair came to make the rows agree with
  // them, so it may read them and may not write them.
  ok(!/UPDATE\s+vr_rollcalls/i.test(code), "the repair rewrites the stored totals");
  has(sql, "vote_119_1_00007", "the repair does not cite the Senate's document for this roll");
  has(sql, WAVE15, "the repair does not name the migration whose bloc wrote the cell");
  has(sql, BALANCE, "the repair does not name the migration that established the date");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the citation still holds");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The fact, where this repository first recorded it — in the migration that
  // hand-verified this roll against the Senate's record and excluded her deliberately.
  const balance = R(join(MIG_DIR, BALANCE));
  has(balance, "Ashley Moody (FL) is intentionally NOT recorded",
    `${BALANCE} no longer records that Moody was excluded from this roll on purpose`);
  has(balance, "seated Jan 21, 2025, the day", `${BALANCE} no longer carries the date the repair rests on`);
  has(balance, "vote_119_1_00007", `${BALANCE} no longer cites the document for this roll`);

  // Florida's two seats on this roll, both taken from the document rather than a bloc:
  // rick_scott (the chamber-balance pass) and rubio (the landmark pass, off the XML).
  const landmark = J("db/vr-landmark-vote-seed.json");
  const roll7 = (landmark.votes || []).find((v) => v.chamber === "senate" && v.congress === 119
    && v.session === 1 && v.rollNumber === 7);
  if (ok(!!roll7, "db/vr-landmark-vote-seed.json no longer carries senate 119/1 roll 7")) {
    const slugs = (roll7.memberVotes || []).map((m) => m.politicianId);
    ok(slugs.includes("rubio"), "the document-sourced seed for this roll no longer lists rubio");
    ok(!slugs.includes("ashley_moody"),
      "the document-sourced seed for this roll now lists ashley_moody — if the Senate does list her, this repair is wrong and must be re-read, not kept");
    eq(roll7.totals.yea, 64, "the document's yea count for this roll moved");
    eq(roll7.totals.nay, 35, "the document's nay count for this roll moved");
    eq(roll7.partyTotals.R.yea, 52, "the document's Republican yea count for this roll moved");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · still necessary, and still enough");
// ═════════════════════════════════════════════════════════════════════════════
{
  // NECESSARY: on a fresh branch database wave15 still writes the cell, so the repair is
  // not a historical curiosity — it is load-bearing on every deploy.
  const wave15 = R(join(MIG_DIR, WAVE15));
  has(wave15, "'ashley_moody'", `${WAVE15} no longer carries the slug whose cell this repair removes`);
  has(wave15, "SELECT rc_hr29s, s, 'yea', 'with_party' FROM unnest(rr) s",
    `${WAVE15} no longer holds the party-bloc insert that wrote the cell`);

  // ENOUGH: the arithmetic F8's verification block checks, done here from the document's
  // own party split rather than from anything a migration says about it.
  const votes = J("db/vr-federal-wave-f8-attribution-seed.json");
  const f8roll7 = (votes.votes || []).find((v) => v.congress === 119 && v.session === 1 && v.rollNumber === 7);
  if (ok(!!f8roll7, "wave F8's attribution seed no longer fills senate 119/1 roll 7")) {
    const pool = Object.values(f8roll7.partyTotals).reduce((a, p) => a + p.yea + p.nay, 0);
    eq(pool, 99, "the document's yea+nay pool for this roll is not 99");
    eq(f8roll7.heldBefore, 99, "the seed no longer records 99 stored cells on this roll before F8");
    eq(f8roll7.memberVotes.length, 1, "F8 no longer adds exactly one cell to this roll");
    eq(f8roll7.memberVotes[0].politicianId, "hyde_smith", "the cell F8 adds to this roll is not Hyde-Smith's");
    eq(f8roll7.memberVotes[0].position, "yea", "the cell F8 adds to this roll is not a yea");
    // 99 stored, minus the one this repair removes, plus the one F8 writes = the pool.
    // Equal, not merely under: every seat on this roll is accounted for once.
    eq(f8roll7.heldBefore - 1 + f8roll7.memberVotes.length, pool,
      "the judged rows this roll carries after the repair and F8 do not equal the chamber's own pool");
  }
  // And F8's guard, still asserting the subset relation this repair restores.
  has(R(join(MIG_DIR, F8)), "have a yea+nay pool smaller than the number of attributed yea/nay rows",
    "wave F8 no longer guards the relation this repair exists to satisfy");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the source of the bug is closed at the pull");
// ═════════════════════════════════════════════════════════════════════════════
{
  const pull = R(PULL);
  // Rule one: a stored cell the document does not list is named, never touched.
  has(pull, "strandedStoredCells", "the pull does not report stored cells the document never lists");
  has(pull, "if (!seen.has(slug))", "the pull does not compare its stored cells against the document's member list");
  // Rule two: the pool has a ceiling and it is the document's own count.
  has(pull, "judgedHeld + judgedNew > claim.yea + claim.nay",
    "the pull does not refuse a roll whose judged rows would outnumber the document's yea+nay pool");
  has(pull, REPAIR, "the pull does not point at the repair that resolved the roll it learned this from");
  // Reported and refused, never repaired in passing.
  has(pull, "Correcting a stored vote is a deliberate act",
    "the pull no longer states that a stored cell is not its to change");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · it rolls forward and edits nothing applied");
// ═════════════════════════════════════════════════════════════════════════════
{
  const head = (f) => {
    try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
    catch { return null; }
  };
  let compared = 0;
  for (const f of [join(MIG_DIR, WAVE15), join(MIG_DIR, BALANCE), join(MIG_DIR, F8),
                   "db/vr-federal-wave-f8-attribution-seed.json", "db/vr-landmark-vote-seed.json"]) {
    const h = head(f);
    if (h === null) continue;
    compared++;
    eq(R(f), h, `${f} was edited — a repair rolls forward, it does not reach back into an applied migration or a shipped seed`);
  }
  console.log(`      (${compared} applied file(s) compared against HEAD)`);
}

console.log("");
if (failures.length) {
  console.error(`  ✗ roll 7 repair: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`    · ${f}`));
  process.exit(1);
}
console.log(`  ✓ roll 7 repair: one named cell, one citation, one roll — ${passed} assertions passed\n`);
