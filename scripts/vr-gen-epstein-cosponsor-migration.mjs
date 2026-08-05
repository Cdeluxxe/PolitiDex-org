#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Emit the Epstein-cosponsor roster-expansion migration
// ─────────────────────────────────────────────────────────────────────────────
// 20260820000000_vr_landmark_enacted_law_rollcalls.sql created H.R. 4405, its two roll
// calls, its gov_transparency mapping and four vr_positions sponsorship rows — the four of
// twenty-five names on the bill that db/vr-member-map.json resolved at the time. The other
// twenty-one were skipped rather than guessed. This migration carries what a second look at
// the same sources could legitimately resolve: three members who already had curated
// portraits and published stances but no entry in db/vr-roster-admitted.json.
//
// It writes exactly two kinds of row:
//
//   1. vr_positions cosponsorship rows for the FULL resolved set (all seven), not a
//      hand-computed delta. Every insert is ON CONFLICT (measure_id, politician_id,
//      action_type) DO NOTHING, so the four already written conflict away and only the
//      three new ones land — correct on a database where the landmark migration already
//      ran AND on a fresh branch where both run in sequence.
//
//   2. vr_member_votes on the two rolls the expansion unlocked, re-asserted in full for
//      the same reason and under the same ON CONFLICT.
//
// It writes NO measure, roll call or issue row. Both roll calls and both measures are
// looked up by the tuple their UNIQUE index is on, and a missing one RAISEs rather than
// being created, because anything invented here would carry none of the verified question,
// tally, summary or source the earlier migrations attached to it. That also makes the
// ordering dependency explicit: 20260820000000 (H.R. 4405, house 119/1/289) and
// 20260821000000 (S. 2, house 119/2/214) both sort before this file.
//
// The eighteen cosponsors that remain unresolved are named in the SQL header with the
// reason, so the gap is visible in the migration and not only in the seed.
//
//   node scripts/vr-gen-epstein-cosponsor-migration.mjs > netlify/database/migrations/<ts>_vr_epstein_cosponsor_roster_expansion.sql
//
// Stats go to stderr so stdout is pure SQL.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { assertSeedPidsMatchMap } from "./vr-seed-pid-guard.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED_PATH = "db/vr-epstein-cosponsor-vote-seed.json";
const seed = JSON.parse(readFileSync(join(ROOT, SEED_PATH), "utf8"));
const roster = JSON.parse(readFileSync(join(ROOT, "db", "vr-member-map.json"), "utf8"));
const ROSTER = new Set(Object.values(roster.map));

const q = (s) => "'" + String(s == null ? "" : s).replace(/'/g, "''") + "'";
const qOrNull = (s) => (s == null || s === "" ? "NULL" : q(s));

// Fail closed before writing a line of SQL. Two separate checks, because they catch
// different mistakes: this one catches a pid that is not on the roster at all...
const orphans = new Set();
for (const v of seed.votes) for (const m of v.memberVotes) if (!ROSTER.has(m.politicianId)) orphans.add(m.politicianId);
for (const p of seed.positions) if (!ROSTER.has(p.politicianId)) orphans.add(p.politicianId);
if (orphans.size) {
  console.error(`✗ ${orphans.size} politician_id(s) in the seed are not on the roster: ${[...orphans].sort().join(", ")}`);
  process.exit(1);
}

// ...and this one catches a pid that IS on the roster but is the wrong member for the
// Bioguide sitting next to it in the seed — the failure mode the roster check cannot see.
// It matters more than usual here: this pass admitted three slugs, and a cosponsorship row
// credited to the wrong Garcia or the wrong McGovern would be indistinguishable from a
// correct one by every other check in the suite.
const pidCheck = assertSeedPidsMatchMap(seed, roster, SEED_PATH);
for (const p of seed.positions) {
  if (roster.map[p.bioguideId] !== p.politicianId) {
    console.error(`✗ position row for ${p.fullName}: ${p.bioguideId} maps to '${roster.map[p.bioguideId]}', not '${p.politicianId}'`);
    process.exit(1);
  }
}

// A cosponsorship row is only meaningful if the measure it hangs off is mapped to an issue
// key — otherwise it is a sponsorship of nothing in particular. H.R. 4405's gov_transparency
// mapping is curated in db/vr-issue-seed.json and written by the landmark migration; this
// asserts it is still there rather than assuming it.
const issueSeed = JSON.parse(readFileSync(join(ROOT, "db", "vr-issue-seed.json"), "utf8"));
const rows = issueSeed.measures || issueSeed;
const hr4405 = (Array.isArray(rows) ? rows : Object.values(rows)).find(
  (m) => m && m.number === "H.R. 4405" && m.congress === 119
);
if (!hr4405) {
  console.error("✗ db/vr-issue-seed.json carries no mapping for H.R. 4405 (119th) — a cosponsorship row on an unmapped measure scores nothing");
  process.exit(1);
}

const total = seed.votes.reduce((n, v) => n + v.memberVotes.length, 0);
const NEW = seed.admitted.map((a) => a.slug);
const MEASURE = { measureType: "bill", congress: 119, chamber: "house", number: "H.R. 4405" };

const L = [];
L.push("-- ═══════════════════════════════════════════════════════════════════════════");
L.push("-- Epstein Files Transparency Act — cosponsor resolution + roster expansion votes");
L.push("-- ═══════════════════════════════════════════════════════════════════════════");
L.push("--");
L.push("-- H.R. 4405 (119th, P.L. 119-38) carries twenty-five names: one sponsor and");
L.push("-- twenty-four cosponsors, most of them recorded in July 2025, four months before the");
L.push("-- House voted 427-1 under suspension. That 427-1 roll confirms a stated transparency");
L.push("-- position and separates almost nobody; the cosponsorship list is the part that");
L.push("-- separates. 20260820000000_vr_landmark_enacted_law_rollcalls.sql could resolve four");
L.push("-- of the twenty-five through db/vr-member-map.json and skipped the rest rather than");
L.push("-- guessing. This migration carries the three that a second pass could resolve.");
L.push("--");
L.push("-- WHAT 'RESOLVED' MEANS HERE. A cosponsor reaches a politician_id only through");
L.push("-- db/vr-member-map.json, which scripts/vr-gen-member-map.mjs derives from the Bioguide");
L.push("-- embedded in each curated portrait URL and scopes to db/vr-roster-admitted.json. So");
L.push("-- resolvable means the app already profiles this member. Being named on Congress.gov is");
L.push("-- not enough: a slug minted for a cosponsor would be a profile holding one sponsorship");
L.push("-- row, no stated position to test it against and no face — which is the guess the");
L.push("-- fail-closed rule exists to prevent.");
L.push("--");
L.push("-- NEWLY RESOLVED (admitted in db/vr-roster-admitted.json wave " + seed.rosterWave + "):");
for (const a of seed.admitted) {
  L.push(`--   ${a.bioguideId}  ${a.slug.padEnd(14)} ${a.name} (${a.seat})`);
}
L.push("--   All three already had published stance cards and ZERO attributable votes before");
L.push("--   this pass — the largest possible gap between stated and testable positions. Rep.");
L.push("--   Robert Garcia is Ranking Member of the Committee on Oversight and Government");
L.push("--   Reform, the committee whose jurisdiction this bill concerns.");
L.push("--");
L.push(`-- DECLINED — ${seed.unresolvedCosponsors.length} cosponsors, credited to nobody:`);
for (const u of seed.unresolvedCosponsors) {
  L.push(`--   ${u.bioguideId}  ${u.fullName} (${u.seat}), joined ${u.date}`);
}
L.push("--   None has a curated portrait under any URL form, and none appears in any compare");
L.push("--   card, spotlight or stance block. There is no roster figure to credit. That includes");
L.push("--   Speaker Emerita Pelosi, the most prominent name this pass declines — declined for");
L.push("--   exactly the same reason as the other seventeen, not a different one.");
L.push("--");
L.push("-- ADDITIVE AND IDEMPOTENT. Two kinds of row only: vr_positions cosponsorship rows for");
L.push("-- the full resolved set, and vr_member_votes on the two rolls the expansion unlocked.");
L.push("-- Both re-assert the complete set rather than a delta, both under ON CONFLICT DO");
L.push("-- NOTHING, so what the earlier migrations wrote conflicts away and only the new rows");
L.push("-- land. No measure, roll call or issue row is created or altered here — every one is");
L.push("-- looked up and a missing one RAISEs, because a row invented here would hold none of");
L.push("-- the verified question, tally, summary or source the earlier migrations attached.");
L.push("--");
L.push("-- ORDERING. Requires 20260820000000_vr_landmark_enacted_law_rollcalls.sql (H.R. 4405,");
L.push("-- house 119/1/289) and 20260821000000_vr_secure_america_act_rollcalls.sql (S. 2,");
L.push("-- house 119/2/214). Both sort before this file.");
L.push("--");
L.push("-- Source of truth: " + SEED_PATH + ", built by " + seed.builtBy + " from");
L.push("-- the bill's own BILLSTATUS feed (isOriginalCosponsor and sponsorshipDate read from the");
L.push("-- record, never inferred from a date) and the House Clerk's roll-call XML, re-verified");
L.push("-- on <legis-num> and <vote-question> with the chamber tally read from <totals-by-vote>.");
L.push("-- ═══════════════════════════════════════════════════════════════════════════");
L.push("");

// ── Sponsorship rows ────────────────────────────────────────────────────────
L.push("DO $$");
L.push("DECLARE m_hr4405 bigint;");
L.push("BEGIN");
L.push(`  SELECT id INTO m_hr4405 FROM vr_measures`);
L.push(`   WHERE congress = ${MEASURE.congress} AND chamber = ${q(MEASURE.chamber)} AND number = ${q(MEASURE.number)}`);
L.push("   ORDER BY id LIMIT 1;");
L.push("  IF m_hr4405 IS NULL THEN");
L.push("    RAISE EXCEPTION 'Epstein cosponsor pass: H.R. 4405 (119th) is missing — 20260820000000_vr_landmark_enacted_law_rollcalls.sql must run first; this migration never creates the measure because it holds none of its verified summary, status or public-law citation';");
L.push("  END IF;");
L.push("");
L.push("  -- The full resolved set of names on the bill. The first four are already live from");
L.push("  -- the landmark migration and conflict away; the rest are this pass's addition.");
const pos = [...seed.positions].sort((a, b) => {
  if (a.actionType !== b.actionType) return a.actionType === "sponsor" ? -1 : 1;
  return a.actedAt < b.actedAt ? -1 : a.actedAt > b.actedAt ? 1 : a.politicianId < b.politicianId ? -1 : 1;
});
L.push("  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES");
pos.forEach((p, i) => {
  const tail = i === pos.length - 1 ? "" : ",";
  L.push(`    -- ${p.fullName} (${p.seat})${NEW.includes(p.politicianId) ? "  ← new this pass" : ""}`);
  L.push(`    (m_hr4405, ${q(p.politicianId)}, ${q(p.actionType)}, ${p.supports ? "true" : "false"}, TIMESTAMPTZ '${p.actedAt}T00:00:00Z',`);
  L.push(`     ${q(p.sourceUrl)}, ${q(p.note)})${tail}`);
});
L.push("  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;");
L.push("END $$;");
L.push("");

// ── Member votes ────────────────────────────────────────────────────────────
L.push("DO $$");
L.push("DECLARE rc bigint;");
L.push("BEGIN");
for (const v of seed.votes) {
  const at = `${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber}`;
  const fresh = v.memberVotes.filter((m) => NEW.includes(m.politicianId));
  L.push("");
  L.push(`  -- ${at} — ${v.measure.number}: ${v.question}`);
  L.push(`  --   ${v.totals.yea}-${v.totals.nay}, ${v.memberVotes.length} roster attribution(s) · ${v.sourceLabel}`);
  L.push(`  --   created by ${v.rollCallCreatedBy}`);
  L.push(`  --   new here: ${fresh.map((m) => `${m.politicianId} ${m.position}`).join(", ") || "(none)"}`);
  L.push("  SELECT id INTO rc FROM vr_rollcalls");
  L.push(`   WHERE chamber = ${q(v.chamber)} AND congress = ${v.congress} AND session = ${v.session}`);
  L.push(`     AND roll_number = ${v.rollNumber};`);
  L.push("  IF rc IS NULL THEN");
  L.push(`    RAISE EXCEPTION 'Epstein cosponsor pass: ${at} is missing — ${v.rollCallCreatedBy} must run first; this migration never creates a roll call because it holds none of the verified question, tally or source';`);
  L.push("  END IF;");
  L.push("  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES");
  const mv = [...v.memberVotes].sort((a, b) => (a.politicianId < b.politicianId ? -1 : 1));
  mv.forEach((m, i) => {
    L.push(`    (rc, ${q(m.politicianId)}, ${q(m.position)}, ${qOrNull(m.isParty)})${i === mv.length - 1 ? "" : ","}`);
  });
  L.push("  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;");
}
L.push("END $$;");
L.push("");

// ── Verification ────────────────────────────────────────────────────────────
// Equality on what this migration fully determines (2 rolls, and one position row per
// resolved name), >= on what it shares with earlier migrations (member votes on rolls that
// already carried some), and 0 on the two things that would mean a bad write: an off-roster
// pid, or a newly admitted member who came out the far end with no votes — which is the
// only way this whole migration could no-op and still look like it worked.
L.push("-- ── Verification ─────────────────────────────────────────────────────────");
L.push("DO $$");
L.push("DECLARE n_rolls integer; n_votes integer; n_orphan integer; n_pos integer;");
L.push("        n_new_pos integer; n_new_votes integer; n_mapped integer;");
L.push("BEGIN");
L.push("  WITH want (chamber, congress, session, roll_number) AS (VALUES");
seed.votes.forEach((v, i) => {
  L.push(`    (${q(v.chamber)}::text, ${v.congress}::integer, ${v.session}::integer, ${v.rollNumber}::integer)${i === seed.votes.length - 1 ? "" : ","}`);
});
L.push("  ), roll_ids AS (");
L.push("    SELECT r.id FROM vr_rollcalls r JOIN want w");
L.push("      ON r.chamber = w.chamber AND r.congress = w.congress");
L.push("     AND r.session = w.session AND r.roll_number = w.roll_number");
L.push("  ), m AS (");
// LIMIT 1 to match the insert above. vr_measures has no unique index on (congress, number),
// so a duplicate row is possible in principle; both halves of this migration must then agree
// on WHICH row they mean, or the sponsorship count would double and fail a deploy that
// actually succeeded.
L.push(`    SELECT id FROM vr_measures WHERE congress = ${MEASURE.congress}`);
L.push(`      AND chamber = ${q(MEASURE.chamber)} AND number = ${q(MEASURE.number)}`);
L.push("     ORDER BY id LIMIT 1");
L.push("  )");
L.push("  SELECT (SELECT count(*) FROM roll_ids),");
L.push("         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM roll_ids)),");
L.push("         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM roll_ids)");
L.push(`            AND v.politician_id NOT IN (${[...ROSTER].sort().map(q).join(", ")})),`);
L.push("         (SELECT count(*) FROM vr_positions p WHERE p.measure_id IN (SELECT id FROM m)");
L.push("            AND p.action_type IN ('sponsor', 'cosponsor')),");
L.push("         (SELECT count(*) FROM vr_positions p WHERE p.measure_id IN (SELECT id FROM m)");
L.push(`            AND p.politician_id IN (${NEW.map(q).join(", ")})),`);
L.push("         (SELECT count(DISTINCT v.politician_id) FROM vr_member_votes v");
L.push("           WHERE v.rollcall_id IN (SELECT id FROM roll_ids)");
L.push(`            AND v.politician_id IN (${NEW.map(q).join(", ")})),`);
L.push("         (SELECT count(*) FROM vr_measure_issues i WHERE i.measure_id IN (SELECT id FROM m)");
L.push("            AND i.issue_key = 'gov_transparency')");
L.push("    INTO n_rolls, n_votes, n_orphan, n_pos, n_new_pos, n_new_votes, n_mapped;");
L.push("");
L.push("  RAISE NOTICE 'Epstein cosponsor pass: % roll calls, % member votes, % sponsorship rows (% newly resolved), % newly attributed member(s)',");
L.push("    n_rolls, n_votes, n_pos, n_new_pos, n_new_votes;");
L.push(`  IF n_rolls <> ${seed.votes.length} THEN`);
L.push(`    RAISE EXCEPTION 'Epstein cosponsor pass: expected ${seed.votes.length} roll calls, found %', n_rolls;`);
L.push("  END IF;");
L.push(`  IF n_votes < ${total} THEN`);
L.push(`    RAISE EXCEPTION 'Epstein cosponsor pass: expected at least ${total} member votes on these rolls, found % — the expansion did not land', n_votes;`);
L.push("  END IF;");
L.push(`  IF n_pos <> ${seed.positions.length} THEN`);
L.push(`    RAISE EXCEPTION 'Epstein cosponsor pass: expected ${seed.positions.length} sponsorship rows on H.R. 4405, found %', n_pos;`);
L.push("  END IF;");
L.push(`  IF n_new_pos <> ${NEW.length} THEN`);
L.push(`    RAISE EXCEPTION 'Epstein cosponsor pass: expected ${NEW.length} newly resolved cosponsor row(s), found % — the whole point of this migration', n_new_pos;`);
L.push("  END IF;");
L.push(`  IF n_new_votes <> ${NEW.length} THEN`);
L.push(`    RAISE EXCEPTION 'Epstein cosponsor pass: ${NEW.length} newly admitted member(s) should each carry votes on these rolls, but only % do', n_new_votes;`);
L.push("  END IF;");
L.push("  IF n_orphan > 0 THEN");
L.push("    RAISE EXCEPTION 'Epstein cosponsor pass: % member vote(s) carry a politician_id outside the ingest roster', n_orphan;");
L.push("  END IF;");
L.push("  IF n_mapped < 1 THEN");
L.push("    RAISE EXCEPTION 'Epstein cosponsor pass: H.R. 4405 carries no gov_transparency mapping — the cosponsorship rows would score nothing';");
L.push("  END IF;");
L.push("END $$;");
L.push("");

process.stdout.write(L.join("\n"));
console.error(
  `✓ ${seed.positions.length} sponsorship rows (${NEW.length} newly resolved: ${NEW.join(", ")}) · `
  + `${seed.votes.length} rolls · ${total} member votes re-asserted · ${seed.unresolvedCosponsors.length} cosponsors declined by name · `
  + `roster ${ROSTER.size} · ${pidCheck.checked} bioguide→pid pairs agree with the member map`
);
