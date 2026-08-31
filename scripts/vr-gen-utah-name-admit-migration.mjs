#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Emit the member-vote migration for the Utah floor votes a NAME ADMIT unlocked
// ─────────────────────────────────────────────────────────────────────────────
// This is the sibling of scripts/vr-gen-utah-2025gs-attribution-migration.mjs, which
// carried the 2025GS votes a ROSTER expansion unlocked. The 2024GS and 2023GS records
// have the same shape of leftover for a different reason: the people were added to the
// roster by later waves, but nobody went back to the FLOOR member map, so their printed
// names stayed in `unmapped` and their roll-call votes stayed parsed-and-discarded.
// scripts/vr-utah-name-admit.mjs closed that fence against three sources; this file
// carries the votes it unlocked.
//
//   node scripts/vr-gen-utah-name-admit-migration.mjs --session 2024GS \
//     > netlify/database/migrations/<ts>_vr_utah_2024gs_name_admit_votes.sql
//
// ── WHERE THIS DELIBERATELY DIVERGES FROM ITS PRECEDENT ─────────────────────
// 20261001000000 re-asserted the FULL attributed set for each roll and let ON CONFLICT
// discard what was already written, so neither file had to know what the other managed
// to attribute. That was the right call there, where a 27-member roster expansion
// touched votes the earlier migration might or might not have held.
//
// Here the delta is exactly enumerable, so this file emits ONLY it: the votes of the
// pids scripts/vr-utah-name-admit.mjs newly admitted. Nothing else CAN be new — every
// other pid on these rolls was already mapped when the state-record migration ran, so
// re-emitting 3,000 rows to have every one of them conflict away would bury the 29
// people this wave is actually responsible for in a file nobody can review. The
// admitted set is asserted against the shipped map before a line of SQL is printed, so
// a pid that is not genuinely new cannot get into the delta by accident.
//
// Everything else is kept: member votes ONLY, ON CONFLICT (rollcall_id, politician_id)
// DO NOTHING so the file is idempotent and safe on a fresh branch, a missing roll call
// RAISEs rather than being invented, and roll calls are looked up on
// (chamber, session, roll_number) WITH congress IS NULL — the tuple
// vr_rollcalls_state_unique is built on, because vr_rollcalls_unique includes congress
// and Postgres treats the NULL on every state row as distinct.
//
// Fails closed before printing any SQL if an admitted pid is missing from the shipped
// member map or from cmp-data.js. A politician_id that names nobody is how a vote gets
// published under a stranger.
//
// Stats go to stderr so stdout is pure SQL.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const argv = process.argv.slice(2);
const SESSION = (() => { const i = argv.indexOf("--session"); return i >= 0 ? argv[i + 1] : null; })();
if (!["2024GS", "2023GS"].includes(SESSION)) { console.error("usage: --session 2024GS|2023GS"); process.exit(2); }
const YEAR = Number(SESSION.slice(0, 4));

const seed = JSON.parse(R(`db/vr-utah-vote-seed-${SESSION}.json`));
const map = JSON.parse(R(`db/vr-utah-member-map-${SESSION}.json`));
const cmteMapFile = `db/vr-utah-committee-map-${SESSION}.json`;
const ACCEPTED = new Set([...Object.values(map.chambers.H || {}), ...Object.values(map.chambers.S || {})]);

const win = {};
new Function("window", R("cmp-data.js"))(win);
const ROSTER = new Set(Object.keys(win.CMP_DATA || {}));

// ── The admitted set, read back off the map rather than re-derived ──────────
// The printed forms whose `confirmedByDistrict` is false AND which the wave-9 note
// covers are the ones this migration owes votes for. Reading them back off the shipped
// artefact means the SQL cannot claim an admission the map does not record.
if (!map._wave9Admitted) { console.error(`✗ ${SESSION} member map carries no _wave9Admitted list — nothing to emit`); process.exit(1); }
const ADMITTED = new Set(Object.values(map._wave9Admitted));
if (!ADMITTED.size) { console.error(`✗ ${SESSION}: the wave-9 admitted list is empty`); process.exit(1); }
// The list must agree with the map it lives in — a pid claimed as admitted but absent from
// `chambers` would mean the note and the mapping disagree, and the SQL would publish a vote
// under an attribution the map does not actually make.
const offMap = [...ADMITTED].filter((p) => !ACCEPTED.has(p));
if (offMap.length) { console.error(`✗ ${SESSION}: _wave9Admitted names ${offMap.length} pid(s) the map does not map: ${offMap.sort().join(", ")}`); process.exit(1); }

const offRoster = [...ADMITTED].filter((p) => !ROSTER.has(p));
if (offRoster.length) { console.error(`✗ ${offRoster.length} admitted pid(s) have no cmp-data.js record: ${offRoster.sort().join(", ")}`); process.exit(1); }

const q = (s) => "'" + String(s == null ? "" : s).replace(/'/g, "''") + "'";

// ── Which migration created each roll ───────────────────────────────────────
// Almost every roll came from the session's state-record migration, but not all of them:
// 20261010000000_vr_vocab_wave_v1.sql landed a handful of bills whose contested floor rolls
// had no home in the vocabulary until it added three keys. A RAISE that names the wrong
// prerequisite sends whoever hits it to the wrong file, so the creator is looked up per
// roll rather than assumed.
const MIG_DIR = "netlify/database/migrations";
const CANDIDATES = [`2024GS` === SESSION ? "20261002000000_vr_utah_2024gs_state_record.sql"
                                         : "20261003000000_vr_utah_2023gs_state_record.sql",
                    "20261010000000_vr_vocab_wave_v1.sql"];
const createdBy = new Map();
for (const f of CANDIDATES) {
  const txt = R(join(MIG_DIR, f));
  const re = /chamber = '(utah (?:house|senate))'[\s\S]{0,240}?roll_number = (\d+)/g;
  let m;
  while ((m = re.exec(txt))) { const k = `${m[1]}|${m[2]}`; if (!createdBy.has(k)) createdBy.set(k, f); }
}

const rolls = [];
for (const m of seed.measures || [])
  for (const rc of m.rollcalls || []) {
    const mine = (rc.votes || []).filter((v) => ADMITTED.has(v.politicianId));
    if (mine.length) {
      const by = createdBy.get(`${rc.chamber}|${rc.rollNumber}`);
      if (!by) { console.error(`✗ ${SESSION}: no shipped migration creates ${rc.chamber} roll ${rc.rollNumber} — refusing to emit votes for a roll this file cannot name a prerequisite for`); process.exit(1); }
      rolls.push({ m, rc, mine, by });
    }
  }
const total = rolls.reduce((n, r) => n + r.mine.length, 0);
const pids = [...new Set(rolls.flatMap((r) => r.mine.map((v) => v.politicianId)))].sort();
const perPid = new Map(pids.map((p) => [p, rolls.reduce((n, r) => n + r.mine.filter((v) => v.politicianId === p).length, 0)]));

const L = [];
const P = (...s) => L.push(...s);
P("-- ═══════════════════════════════════════════════════════════════════════════");
P(`-- Utah ${YEAR} General Session — floor votes unlocked by the wave-9 name admit`);
P("-- ═══════════════════════════════════════════════════════════════════════════");
P("--");
const byMig = [...new Set(rolls.map((r) => r.by))].sort();
for (const f of byMig) P(`-- ${f}`);
P(`-- created ${byMig.length > 1 ? "these roll calls between them" : "these roll calls"}, their measures and their issue mappings, and wrote`);
P("-- the member votes the floor map could attribute at the time.");
P(`-- ${total.toLocaleString("en-US")} other recorded votes on those SAME rolls were parsed and DISCARDED, because`);
P(`-- db/vr-utah-member-map-${SESSION}.json can only map a printed name onto a roster id, and`);
P(`-- the ${pids.length} people behind these printed forms were on no PolitiDex roster at all. The map`);
P("-- said so in writing and called adding them a roster decision for a later wave.");
P("--");
P("-- The roster then grew — wave 2's identity-only records and the committee waves' roster");
P("-- door — and nothing went back to the floor map. So these votes stayed parsed and");
P("-- dropped while the people they belong to sat on the roster with an empty or thin file.");
P(`-- scripts/vr-utah-name-admit.mjs closed that stale fence. This migration carries the votes.`);
P("--");
P("-- NOTHING WAS GUESSED. Each printed form had to clear three independent gates before its");
P("-- votes could land here: scripts/vr-utah-ingest.mjs --collect resolved it on its own");
P("-- through the UNCHANGED uniqueness rule (surname plus a compatible first name, exactly one");
P(`-- candidate in the whole pool); the reviewed ${cmteMapFile}`);
P("-- already carried the same person under the same surname and initial in the same chamber;");
P(`-- and the legislature's own ${YEAR} roster (https://le.utah.gov/asp/roster/roster.asp?year=${YEAR})`);
P(`-- seats that full name in that chamber with the party and district the committee map's`);
P("-- confirmedBy line claims. A name that failed any gate is still unattributed, and the");
P("-- printed forms the committee map REFUSES by name are still refused.");
P("--");
P("-- Additive and idempotent: member votes only, ON CONFLICT (rollcall_id, politician_id)");
P("-- DO NOTHING. No measure, roll call or issue row is touched. A missing roll call RAISEs");
P("-- rather than being created — this file holds none of the verified question, tally, date");
P("-- or source that one needs.");
P("--");
P("-- Unlike 20261001000000_vr_utah_2025gs_roster_attribution_votes.sql, which re-asserted");
P("-- every attributed vote on its rolls and let ON CONFLICT sort out the overlap, this file");
P(`-- emits ONLY the ${pids.length} newly admitted members' rows. Nothing else on these rolls can be`);
P("-- new — every other pid was already mapped when the state record landed — so re-stating");
P("-- thousands of rows to have them all conflict away would hide the people this wave is");
P(`-- responsible for. The admitted set is not re-derived here: it is read off \`_wave9Admitted\``);
P(`-- in db/vr-utah-member-map-${SESSION}.json, the same file that records the mapping, and`);
P("-- cross-checked against `chambers` so the note and the mapping cannot disagree.");
P("--");
P("-- Roll calls are looked up on (chamber, session, roll_number) WITH congress IS NULL, the");
P("-- tuple vr_rollcalls_state_unique is built on. vr_rollcalls_unique includes congress,");
P("-- which is NULL on every state row, and Postgres treats NULLs as distinct.");
P("--");
P(`-- Source of truth: db/vr-utah-vote-seed-${SESSION}.json, rebuilt by`);
P("-- scripts/vr-utah-ingest.mjs --seed from the cached le.utah.gov vote pages. Generated by");
P(`-- scripts/vr-gen-utah-name-admit-migration.mjs --session ${SESSION}.`);
P("--");
P(`-- Members gaining floor votes here (${pids.length}), with the count each gains:`);
for (const p of pids) P(`--   ${p.padEnd(24)} ${String(perPid.get(p)).padStart(3)}`);
P("-- ═══════════════════════════════════════════════════════════════════════════");
P("");
P("DO $$");
P("DECLARE rc bigint;");
P("BEGIN");
for (const { m, rc, mine, by } of rolls) {
  const at = `${rc.chamber} ${rc.session} roll ${rc.rollNumber}`;
  P("", `  -- ${at} — ${m.number} ${m.title}`,
    `  --   ${rc.totals.yea}-${rc.totals.nay}-${rc.totals.notVoting}, ${mine.length} newly admitted · ${rc.sourceUrl}`,
    "  SELECT id INTO rc FROM vr_rollcalls",
    `   WHERE chamber = ${q(rc.chamber)} AND congress IS NULL AND session = ${rc.session}`,
    `     AND roll_number = ${rc.rollNumber};`,
    "  IF rc IS NULL THEN",
    `    RAISE EXCEPTION 'Utah ${SESSION} name admit: ${at} is missing — ${by} must run first; this migration never creates a roll call because it holds none of the verified question, tally, date or source';`,
    "  END IF;",
    "  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES");
  const rows = [...mine].sort((a, b) => (a.politicianId < b.politicianId ? -1 : 1));
  rows.forEach((v, i) => P(`    (rc, ${q(v.politicianId)}, ${q(v.position)})${i === rows.length - 1 ? "" : ","}`));
  P("  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;");
}
P("END $$;", "");

// ── Verification ────────────────────────────────────────────────────────────
// A silently-skipped INSERT must not read as success. The deploy counts what landed
// for each admitted member and fails if anyone arrived short, which is the failure a
// missing roll call or a renamed pid would actually produce.
P("-- ── Verification ─────────────────────────────────────────────────────────");
P("DO $$");
P("DECLARE n_rolls integer; short text;");
P("BEGIN");
P("  WITH want (chamber, session, roll_number) AS (VALUES");
rolls.forEach(({ rc }, i) => P(`    (${q(rc.chamber)}::text, ${rc.session}::integer, ${rc.rollNumber}::integer)${i === rolls.length - 1 ? "" : ","}`));
P("  ), roll_ids AS (");
P("    SELECT r.id FROM vr_rollcalls r JOIN want w");
P("      ON r.chamber = w.chamber AND r.session = w.session AND r.roll_number = w.roll_number");
P("     WHERE r.congress IS NULL");
P("  ), expected (politician_id, n) AS (VALUES");
pids.forEach((p, i) => P(`    (${q(p)}::text, ${perPid.get(p)}::integer)${i === pids.length - 1 ? "" : ","}`));
P("  ), got AS (");
P("    SELECT e.politician_id, e.n AS want_n,");
P("           (SELECT count(*) FROM vr_member_votes v");
P("             WHERE v.rollcall_id IN (SELECT id FROM roll_ids) AND v.politician_id = e.politician_id) AS have_n");
P("      FROM expected e");
P("  )");
P("  SELECT (SELECT count(*) FROM roll_ids),");
P("         (SELECT string_agg(politician_id || ' (' || have_n || ' of ' || want_n || ')', ', ')");
P("            FROM got WHERE have_n < want_n)");
P("    INTO n_rolls, short;");
P(`  RAISE NOTICE 'Utah ${SESSION} name admit: % roll calls, ${pids.length} members, ${total} votes expected', n_rolls;`);
P(`  IF n_rolls <> ${rolls.length} THEN`);
P(`    RAISE EXCEPTION 'Utah ${SESSION} name admit: expected ${rolls.length} state roll calls, found % — the state record did not land', n_rolls;`);
P("  END IF;");
P("  IF short IS NOT NULL THEN");
P(`    RAISE EXCEPTION 'Utah ${SESSION} name admit: newly admitted member(s) arrived short: %', short;`);
P("  END IF;");
P("END $$;");
P("");
process.stdout.write(L.join("\n"));
console.error(`✓ ${SESSION}: ${rolls.length} roll calls · ${total} member votes · ${pids.length} newly admitted pids · all on the roster`);
