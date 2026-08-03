#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Emit the roster-expansion member-vote migration for the Phase A landmark rolls
// ─────────────────────────────────────────────────────────────────────────────
// 20260811000000_vr_phase_a_117_118_rollcalls.sql created the 29 Phase A roll calls and
// wrote the 731 member votes a 63-slug roster could attribute at the time. The Israel
// pass then admitted 37 more members in db/vr-roster-admitted.json, which left this seed
// under-attributed by construction: the same rolls, the same questions, the same tallies,
// but 37 members the ingest could not yet recognise. Re-attributing them yields 1,217.
// This migration carries the difference.
//
// Two deliberate choices, the same two the Israel expansion made:
//
//   1. It writes member votes ONLY. No measure, roll call, issue mapping or measure
//      identity row is re-emitted — those are the earlier migrations' rows, and restating
//      them here would make two files the source of truth for one fact. Phase A's curated
//      mappings are untouched by design; this pass changes who is recognised, never what
//      any measure means.
//
//   2. It re-asserts the FULL attributed set for each roll rather than a hand-computed
//      delta. Every insert is ON CONFLICT (rollcall_id, politician_id) DO NOTHING, so the
//      731 already written conflict away and only what the expansion unlocked lands. That
//      makes the migration correct on a database where the earlier one already ran AND on
//      a fresh branch where both run in sequence, without either file needing to know what
//      the other managed to attribute.
//
// The roll calls are looked up by the tuple their UNIQUE index is on and a missing one
// RAISEs rather than being created, because a roll call invented here would carry none of
// the verified question, tally or source the earlier migration attached to it.
//
//   node scripts/vr-gen-phase-a-reattribution-migration.mjs > netlify/database/migrations/<ts>_vr_phase_a_roster_expansion_votes.sql
//
// Stats go to stderr so stdout is pure SQL.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(readFileSync(join(ROOT, "db", "vr-phase-a-vote-seed.json"), "utf8"));
const roster = JSON.parse(readFileSync(join(ROOT, "db", "vr-member-map.json"), "utf8"));
const ROSTER = new Set(Object.values(roster.map));

const q = (s) => "'" + String(s == null ? "" : s).replace(/'/g, "''") + "'";
const qOrNull = (s) => (s == null || s === "" ? "NULL" : q(s));

// Fail closed before writing a line of SQL: a politician_id outside the roster would trip
// the same guard that failed a previous deploy, and it is cheaper to catch it here.
const orphans = new Set();
for (const v of seed.votes) for (const m of v.memberVotes) if (!ROSTER.has(m.politicianId)) orphans.add(m.politicianId);
if (orphans.size) {
  console.error(`✗ ${orphans.size} politician_id(s) in the seed are not on the roster: ${[...orphans].sort().join(", ")}`);
  process.exit(1);
}

const L = [];
const total = seed.votes.reduce((n, v) => n + v.memberVotes.length, 0);
const slugs = new Set(seed.votes.flatMap((v) => v.memberVotes.map((m) => m.politicianId)));

L.push("-- ═══════════════════════════════════════════════════════════════════════════");
L.push("-- Phase A landmarks — member votes unlocked by the roster expansion");
L.push("-- ═══════════════════════════════════════════════════════════════════════════");
L.push("--");
L.push("-- 20260811000000_vr_phase_a_117_118_rollcalls.sql created these " + seed.votes.length + " roll calls and");
L.push("-- wrote the 731 member votes a 63-slug roster could attribute. db/vr-roster-admitted.json");
L.push("-- has since admitted 37 more members, which left this record under-attributed by");
L.push("-- construction — the same rolls and the same tallies, but 37 members the ingest could");
L.push("-- not recognise. Re-attributing the same " + seed.votes.length + " rolls against the widened roster yields");
L.push("-- " + total + " votes.");
L.push("--");
L.push("-- Additive and idempotent: member votes only, ON CONFLICT (rollcall_id, politician_id)");
L.push("-- DO NOTHING, so the votes the earlier migration already wrote conflict away and only");
L.push("-- the newly attributable ones land. No measure, roll call, mapping or measure-identity");
L.push("-- row is touched: Phase A's curated issue rows are deliberately left exactly as they");
L.push("-- are, because this pass changes who is recognised and never what a measure means.");
L.push("--");
L.push("-- Source of truth: db/vr-phase-a-vote-seed.json, rebuilt by");
L.push("-- scripts/vr-build-phase-a-vote-seed.mjs, which re-verified every citation, question");
L.push("-- and tally against the House Clerk and Senate roll-call XML on the way through. The");
L.push("-- rebuild was checked to be a strict superset of the deployed record: no attribution");
L.push("-- dropped, no position or party-crossover flag changed, all " + seed.votes.length + " questions and margins");
L.push("-- byte-identical.");
L.push("-- ═══════════════════════════════════════════════════════════════════════════");
L.push("");
L.push("DO $$");
L.push("DECLARE rc bigint;");
L.push("BEGIN");

for (const v of seed.votes) {
  const at = `${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber}`;
  L.push("");
  L.push(`  -- ${at} — ${v.measure.number}: ${v.question}`);
  L.push(`  --   ${v.totals.yea}-${v.totals.nay}, ${v.memberVotes.length} roster attribution(s) · ${v.sourceLabel}`);
  L.push("  SELECT id INTO rc FROM vr_rollcalls");
  L.push(`   WHERE chamber = ${q(v.chamber)} AND congress = ${v.congress} AND session = ${v.session}`);
  L.push(`     AND roll_number = ${v.rollNumber};`);
  L.push("  IF rc IS NULL THEN");
  L.push(`    RAISE EXCEPTION 'Phase A re-attribution: ${at} is missing — 20260811000000_vr_phase_a_117_118_rollcalls.sql must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';`);
  L.push("  END IF;");
  L.push("  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES");
  const rows = [...v.memberVotes].sort((a, b) => (a.politicianId < b.politicianId ? -1 : 1));
  rows.forEach((m, i) => {
    L.push(`    (rc, ${q(m.politicianId)}, ${q(m.position)}, ${qOrNull(m.isParty)})${i === rows.length - 1 ? "" : ","}`);
  });
  L.push("  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;");
}

L.push("END $$;");
L.push("");

// ── Verification ────────────────────────────────────────────────────────────
// Counts the votes actually present on the Phase A rolls and fails the deploy if the
// re-attribution did not land, so a silently-skipped INSERT cannot read as success.
// The orphan check is scoped to these roll calls: member votes elsewhere in the table
// predate the roster gate and are not this migration's to judge.
L.push("-- ── Verification ─────────────────────────────────────────────────────────");
L.push("DO $$");
L.push("DECLARE n_rolls integer; n_votes integer; n_orphan integer;");
L.push("BEGIN");
L.push("  WITH want (chamber, congress, session, roll_number) AS (VALUES");
seed.votes.forEach((v, i) => {
  L.push(`    (${q(v.chamber)}::text, ${v.congress}::integer, ${v.session}::integer, ${v.rollNumber}::integer)${i === seed.votes.length - 1 ? "" : ","}`);
});
L.push("  ), roll_ids AS (");
L.push("    SELECT r.id FROM vr_rollcalls r JOIN want w");
L.push("      ON r.chamber = w.chamber AND r.congress = w.congress");
L.push("     AND r.session = w.session AND r.roll_number = w.roll_number");
L.push("  )");
L.push("  SELECT (SELECT count(*) FROM roll_ids),");
L.push("         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM roll_ids)),");
L.push("         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM roll_ids)");
L.push(`            AND v.politician_id NOT IN (${[...ROSTER].sort().map(q).join(", ")}))`);
L.push("    INTO n_rolls, n_votes, n_orphan;");
L.push("  RAISE NOTICE 'Phase A re-attribution: % roll calls, % member votes', n_rolls, n_votes;");
L.push(`  IF n_rolls <> ${seed.votes.length} THEN`);
L.push(`    RAISE EXCEPTION 'Phase A re-attribution: expected ${seed.votes.length} roll calls, found %', n_rolls;`);
L.push("  END IF;");
L.push(`  IF n_votes < ${total} THEN`);
L.push(`    RAISE EXCEPTION 'Phase A re-attribution: expected at least ${total} member votes on these rolls, found % — the re-attribution did not land', n_votes;`);
L.push("  END IF;");
L.push("  IF n_orphan > 0 THEN");
L.push("    RAISE EXCEPTION 'Phase A re-attribution: % member vote(s) carry a politician_id outside the ingest roster', n_orphan;");
L.push("  END IF;");
L.push("END $$;");
L.push("");

process.stdout.write(L.join("\n"));
console.error(`✓ ${seed.votes.length} rolls · ${total} member votes re-asserted · ${slugs.size} distinct slugs · roster ${ROSTER.size}`);
