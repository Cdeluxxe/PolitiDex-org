#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Emit the member-vote migration for the Utah 2025GS votes the roster can now attribute
// ─────────────────────────────────────────────────────────────────────────────
// 20260929000000_vr_utah_2025gs_state_record.sql created the 42 measures, their 54 issue
// mappings and their 55 roll calls, and wrote the 2,254 member votes a 68-member Utah
// roster could attribute at the time. The other 905 recorded votes on those SAME rolls
// were parsed and DISCARDED, because db/vr-utah-member-map.json can only map a printed
// name onto a roster id and 26 of 75 representatives and 1 of 29 senators had no record
// in cmp-data.js to map onto. Data wave 2 added those 27 identity-only records and
// mapped their printed names by hand. Re-seeding the same 55 rolls now attributes 3,159.
// This migration carries the difference.
//
// Three deliberate choices, two of them borrowed from
// scripts/vr-gen-israel-roster-expansion-migration.mjs, which solved the same problem
// for the Support for Israel rolls:
//
//   1. It writes member votes ONLY. No measure, roll call or issue row is re-emitted.
//      Those are the previous migration's rows, and re-stating them here would make two
//      files the source of truth for one fact.
//
//   2. It re-asserts the FULL attributed set for each roll rather than a hand-computed
//      delta. Every insert is ON CONFLICT (rollcall_id, politician_id) DO NOTHING, so the
//      2,254 already written conflict away and only what the roster expansion unlocked
//      lands. That is correct on a database where the earlier migration already ran AND
//      on a fresh branch where both run in sequence, without either file needing to know
//      what the other managed to attribute.
//
//   3. A missing roll call RAISEs instead of being created. This file holds none of the
//      verified question, tally, vote date or source URL the earlier migration attached,
//      so a roll call invented here would be a worse row than no row.
//
// The lookup is on (chamber, session, roll_number) WITH congress IS NULL, which is the
// tuple vr_rollcalls_state_unique is built on — vr_rollcalls_unique includes congress and
// Postgres treats NULLs as distinct, so it cannot identify a state roll call at all.
//
//   node scripts/vr-gen-utah-2025gs-attribution-migration.mjs \
//     > netlify/database/migrations/<ts>_vr_utah_2025gs_roster_attribution_votes.sql
//
// Fails closed before printing a line of SQL if any seeded pid is absent from either the
// human member map or the roster: a politician_id that names nobody is how a vote gets
// published under a stranger, and it is cheaper to catch here than in a deploy.
//
// Stats go to stderr so stdout is pure SQL.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const PRIOR = "20260929000000_vr_utah_2025gs_state_record.sql";

const seed = JSON.parse(R("db/vr-utah-vote-seed.json"));
const map = JSON.parse(R("db/vr-utah-member-map.json"));
const ACCEPTED = new Set([...Object.values(map.chambers.H || {}), ...Object.values(map.chambers.S || {})]);

// The roster, read the same way scripts/vr-utah-ingest.mjs reads it: cmp-data.js is a
// browser file, so it is evaluated against a window stub rather than imported.
const win = {};
new Function("window", R("cmp-data.js"))(win);
const ROSTER = new Set(Object.keys(win.CMP_DATA || {}));

const q = (s) => "'" + String(s == null ? "" : s).replace(/'/g, "''") + "'";

const rolls = [];
for (const m of seed.measures || [])
  for (const rc of m.rollcalls || []) rolls.push({ m, rc });

const offMap = new Set(), offRoster = new Set();
for (const { rc } of rolls) for (const v of rc.votes || []) {
  if (!ACCEPTED.has(v.politicianId)) offMap.add(v.politicianId);
  if (!ROSTER.has(v.politicianId)) offRoster.add(v.politicianId);
}
if (offMap.size || offRoster.size) {
  if (offMap.size) console.error(`✗ ${offMap.size} seeded pid(s) are not values in db/vr-utah-member-map.json: ${[...offMap].sort().join(", ")}`);
  if (offRoster.size) console.error(`✗ ${offRoster.size} seeded pid(s) have no cmp-data.js record: ${[...offRoster].sort().join(", ")}`);
  process.exit(1);
}

const total = rolls.reduce((n, { rc }) => n + rc.votes.length, 0);
const pids = new Set(rolls.flatMap(({ rc }) => rc.votes.map((v) => v.politicianId)));

const L = [];
L.push("-- ═══════════════════════════════════════════════════════════════════════════");
L.push("-- Utah 2025 General Session — member votes unlocked by the roster expansion");
L.push("-- ═══════════════════════════════════════════════════════════════════════════");
L.push("--");
L.push(`-- ${PRIOR} created these 55 roll calls, their`);
L.push("-- 42 measures and 54 issue mappings, and wrote the 2,254 member votes a 68-member");
L.push("-- Utah roster could attribute. The other 905 recorded votes on the same rolls were");
L.push("-- parsed and discarded: 26 of 75 representatives and 1 of 29 senators had no record");
L.push("-- in cmp-data.js, and db/vr-utah-member-map.json maps a printed name onto a roster");
L.push("-- id or onto nothing — it never guesses, and it never hands a departed member's");
L.push("-- vote to whoever holds the district now.");
L.push("--");
L.push("-- Data wave 2 added identity-only roster records for all 27 and mapped their printed");
L.push(`-- names by hand. Re-seeding the same 55 rolls attributes ${total.toLocaleString("en-US")} votes across`);
L.push(`-- ${pids.size} members. This migration carries the difference.`);
L.push("--");
L.push("-- Additive and idempotent: member votes only, ON CONFLICT (rollcall_id,");
L.push("-- politician_id) DO NOTHING, so the votes the earlier migration already wrote");
L.push("-- conflict away and only the newly attributable ones land. No measure, roll call or");
L.push("-- issue row is touched. A missing roll call RAISEs rather than being created — this");
L.push("-- file holds none of the verified question, tally, date or source that one needs.");
L.push("--");
L.push("-- Roll calls are looked up on (chamber, session, roll_number) WITH congress IS NULL,");
L.push("-- the tuple vr_rollcalls_state_unique is built on. vr_rollcalls_unique includes");
L.push("-- congress, which is NULL on every state row, and Postgres treats NULLs as distinct.");
L.push("--");
L.push("-- Source of truth: db/vr-utah-vote-seed.json, rebuilt by");
L.push("-- scripts/vr-utah-ingest.mjs --collect && --seed against le.utah.gov. Generated by");
L.push("-- scripts/vr-gen-utah-2025gs-attribution-migration.mjs.");
L.push("-- ═══════════════════════════════════════════════════════════════════════════");
L.push("");
L.push("DO $$");
L.push("DECLARE rc bigint;");
L.push("BEGIN");

for (const { m, rc } of rolls) {
  const at = `${rc.chamber} ${rc.session} roll ${rc.rollNumber}`;
  L.push("");
  L.push(`  -- ${at} — ${m.number} ${m.title}`);
  L.push(`  --   ${rc.totals.yea}-${rc.totals.nay}-${rc.totals.notVoting}, ${rc.votes.length} roster attribution(s) · ${rc.sourceUrl}`);
  L.push("  SELECT id INTO rc FROM vr_rollcalls");
  L.push(`   WHERE chamber = ${q(rc.chamber)} AND congress IS NULL AND session = ${rc.session}`);
  L.push(`     AND roll_number = ${rc.rollNumber};`);
  L.push("  IF rc IS NULL THEN");
  L.push(`    RAISE EXCEPTION 'Utah 2025GS attribution: ${at} is missing — ${PRIOR} must run first; this migration never creates a roll call because it holds none of the verified question, tally, date or source';`);
  L.push("  END IF;");
  L.push("  INSERT INTO vr_member_votes (rollcall_id, politician_id, position) VALUES");
  const rows = [...rc.votes].sort((a, b) => (a.politicianId < b.politicianId ? -1 : 1));
  rows.forEach((v, i) => {
    L.push(`    (rc, ${q(v.politicianId)}, ${q(v.position)})${i === rows.length - 1 ? "" : ","}`);
  });
  L.push("  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;");
}
L.push("END $$;");
L.push("");

// ── Verification ────────────────────────────────────────────────────────────
// A silently-skipped INSERT must not read as success, so the deploy counts what
// actually landed on these 55 rolls and fails if the expansion did not arrive.
L.push("-- ── Verification ─────────────────────────────────────────────────────────");
L.push("DO $$");
L.push("DECLARE n_rolls integer; n_votes integer; n_orphan integer;");
L.push("BEGIN");
L.push("  WITH want (chamber, session, roll_number) AS (VALUES");
rolls.forEach(({ rc }, i) => {
  L.push(`    (${q(rc.chamber)}::text, ${rc.session}::integer, ${rc.rollNumber}::integer)${i === rolls.length - 1 ? "" : ","}`);
});
L.push("  ), roll_ids AS (");
L.push("    SELECT r.id FROM vr_rollcalls r JOIN want w");
L.push("      ON r.chamber = w.chamber AND r.session = w.session AND r.roll_number = w.roll_number");
L.push("     WHERE r.congress IS NULL");
L.push("  )");
L.push("  SELECT (SELECT count(*) FROM roll_ids),");
L.push("         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM roll_ids)),");
L.push("         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM roll_ids)");
L.push(`            AND v.politician_id NOT IN (${[...pids].sort().map(q).join(", ")}))`);
L.push("    INTO n_rolls, n_votes, n_orphan;");
L.push("  RAISE NOTICE 'Utah 2025GS attribution: % roll calls, % member votes', n_rolls, n_votes;");
L.push(`  IF n_rolls <> ${rolls.length} THEN`);
L.push(`    RAISE EXCEPTION 'Utah 2025GS attribution: expected ${rolls.length} state roll calls, found %', n_rolls;`);
L.push("  END IF;");
L.push(`  IF n_votes < ${total} THEN`);
L.push(`    RAISE EXCEPTION 'Utah 2025GS attribution: expected at least ${total} member votes on these rolls, found % — the expansion did not land', n_votes;`);
L.push("  END IF;");
L.push("  IF n_orphan > 0 THEN");
L.push("    RAISE EXCEPTION 'Utah 2025GS attribution: % member vote(s) on these rolls carry a politician_id outside the accepted member map', n_orphan;");
L.push("  END IF;");
L.push("END $$;");
L.push("");

process.stdout.write(L.join("\n"));
console.error(`✓ ${rolls.length} roll calls · ${total} member votes · ${pids.size} distinct pids · all on the accepted map and the roster`);
