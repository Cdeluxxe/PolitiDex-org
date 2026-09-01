// ════════════════════════════════════════════════════════════════════════════
// Federal roster wave R1 — migration generator
// ════════════════════════════════════════════════════════════════════════════
//
// Reads db/vr-federal-roster-r1-attribution-seed.json and writes
// netlify/database/migrations/20261026000000_vr_federal_roster_r1.sql.
//
// The migration writes ONE kind of row: vr_member_votes. Nothing else. It creates
// no object of any kind — the roll-id list in the verification block lives in an
// integer[] local rather than a temp table, because scripts/test-vr-corrections.mjs
// reads any CREATE of a TABLE as a declaration however temporary it is, and a
// data-only migration that sorts after the newest drizzle snapshot may not declare
// one.
//
// FIVE THINGS THIS GENERATOR IS CAREFUL ABOUT.
//
// 1. NO MEASURE, NO ROLL CALL, NO ISSUE MAPPING, NO STATED POSITION. The 23 rolls
//    and their measures are already on file; this wave attaches votes to them and
//    adds nothing to the reading of them. Every roll is looked up by
//    (chamber, congress, session, roll_number) and RAISEs if it is not there, so a
//    missing roll stops the migration instead of silently writing nothing.
//
// 2. EVERY INSERT IS ON CONFLICT DO NOTHING. A cell already stored wins. That is the
//    whole shape of this wave's promise not to rewrite stored positions: the seed's
//    discrepancies list is where a disagreement goes, and correcting one is its own
//    migration with its own citation.
//
// 3. NOTHING IS DELETED. Not a stranded cell, not a duplicate, not a stale row. Over-
//    attribution is refused at pull time — the roll is dropped whole and a repair is
//    filed in the seed — and the verification block below re-checks the same ceiling
//    against the database rather than trusting the pull.
//
// 4. THE VERIFICATION IS WAVE-SCOPED. Nothing below counts a corpus-wide total. A
//    guard that fails because some other wave landed is a guard that gets deleted, so
//    every count is taken over this wave's 23 roll ids and its own slug list.
//
// 5. THE SLUG LIST IS EMITTED, NOT INFERRED. The block that proves this wave wrote
//    cells for exactly the members it admitted needs the roster wave's own slugs in
//    the SQL, so they are written out. It is long on purpose: a reviewer can read who
//    was let in without leaving the file.
//
// Usage: node scripts/vr-gen-federal-roster-r1-migration.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const S = JSON.parse(readFileSync(join(ROOT, "db", "vr-federal-roster-r1-attribution-seed.json"), "utf8"));
const CENSUS = JSON.parse(readFileSync(join(ROOT, "db", "vr-federal-roster-r1-census.json"), "utf8"));
const ADMITTED = JSON.parse(readFileSync(join(ROOT, "db", "vr-roster-admitted.json"), "utf8"));
const OUT = join(ROOT, "netlify", "database", "migrations", "20261026000000_vr_federal_roster_r1.sql");

const WAVE = S.rosterWave;
const SLUGS = (ADMITTED.waves || ADMITTED)[WAVE];
if (!Array.isArray(SLUGS) || !SLUGS.length) throw new Error(`db/vr-roster-admitted.json carries no wave '${WAVE}'`);

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const nul = (s) => (s === null || s === undefined ? "NULL" : q(s));
const wrap = (text, width, lead) => {
  const words = String(text).split(/\s+/);
  const lines = []; let cur = "";
  for (const w of words) { if (cur && (cur + " " + w).length > width) { lines.push(cur); cur = w; } else cur = cur ? cur + " " + w : w; }
  if (cur) lines.push(cur);
  return lines.map((l) => lead + l).join("\n");
};

const L = [];
const w = (s = "") => L.push(s);

// ── Arithmetic, taken from the seed and never retyped ────────────────────────
const votes = S.votes;
const cells = votes.reduce((a, v) => a + v.memberVotes.length, 0);
const judged = votes.reduce((a, v) => a + v.memberVotes.filter((m) => m.position === "yea" || m.position === "nay").length, 0);
const heldBefore = votes.reduce((a, v) => a + v.heldBefore, 0);
const heldAfter = votes.reduce((a, v) => a + v.heldAfter, 0);
const slugsTouched = new Set(votes.flatMap((v) => v.memberVotes.map((m) => m.politicianId)));
const skippedBefore = votes.reduce((a, v) => a + (v.skippedBefore || 0), 0);
const skippedAfter = votes.reduce((a, v) => a + v.stillSkipped, 0);
const slugsBefore = S.distinctSlugsOnScopedRollsBefore;
const slugsAfter = S.distinctSlugsOnScopedRollsAfter;
const issueRows = S.issueRowsOnScopedMeasures.total;
if (!Number.isFinite(slugsBefore) || !Number.isFinite(slugsAfter) || !Number.isFinite(issueRows))
  throw new Error("the seed does not carry the scoped slug and issue-row counts — regenerate it");
if (cells !== S.cells) throw new Error(`seed says ${S.cells} cells, its own votes carry ${cells}`);
if (heldBefore + cells !== heldAfter) throw new Error(`held ${heldBefore} + ${cells} written ≠ ${heldAfter} held after`);

// ── HEADER ──────────────────────────────────────────────────────────────────
w("-- ---------------------------------------------------------------------------");
w("-- Federal roster wave R1 — the votes the widened House roster was already owed");
w("-- ---------------------------------------------------------------------------");
w("-- Generated by scripts/vr-gen-federal-roster-r1-migration.mjs from");
w("-- db/vr-federal-roster-r1-attribution-seed.json.");
w("-- Do not hand-edit: regenerate, or roll forward with a new migration.");
w("--");
w("-- 0 measures created · 0 roll calls created · 0 issue mappings created · 0 new issue keys");
w("-- 0 stated positions written · 0 weights changed · 0 existing cells rewritten · 0 rows deleted");
w(`-- ${cells} member votes attributed across ${votes.length} House roll calls already on file`);
w(`-- ${judged} of them judged (yea/nay) · ${slugsTouched.size} distinct roster slugs, all admitted by this wave`);
w(`-- Stored cells on these ${votes.length} rolls: ${heldBefore} → ${heldAfter}`);
w(`-- Recorded positions skipped for want of a roster slug: ${skippedBefore} → ${skippedAfter}`);
w("--");
w("-- WHAT THIS MIGRATION IS FOR");
w(wrap(
  "The House corpus on disk held " + skippedBefore + " recorded positions with nowhere to go. Not missing from the "
  + "Clerk's XML — present in it, read by the ingest, and dropped, because the fail-closed attribution path is "
  + "Bioguide → db/vr-member-map.json → roster slug and the map carried 116 of the House's 431 sitting members. "
  + "Roughly 315 rows on every roll, on all 23 of them. Wave F9 measured its own share of that loss at 2,245 and "
  + "refused to guess at it, which was right: re-reading the document a second time recovers nothing when the "
  + "reason for the drop is the roster. The roster is what this wave widened.", 74, "-- ")); 
w("--");
w(wrap(
  "So the identity work is the wave and this file is its consequence. " + SLUGS.length + " sitting members of the "
  + "119th House were admitted, each verified twice before admission — clerk.house.gov's MemberData.xml and the "
  + "congress-legislators dataset had to agree on state, district and party, and the Clerk's official name had to "
  + "carry the dataset's surname. Four vacant seats, six delegates and seven former members the rolls name are "
  + "refused in writing, per person, in db/vr-federal-roster-r1-census.json. Nothing was guessed and no two people "
  + "were merged.", 74, "-- "));
w("--");
w(wrap(
  "The " + skippedAfter + " positions still skipped after this migration are those refusals doing their job: the six "
  + "delegates, who hold no district, and members who have since left the 119th. They stay skipped and stay counted.", 74, "-- "));
w("--");
w("-- WHAT IT DOES NOT DO");
w(wrap(
  "It writes no measure and no roll call, so no act becomes readable that was not readable before. It writes no "
  + "vr_measure_issues row, so no member's issue counts move for any reason other than a cell that was skipped and "
  + "is now attached. It writes no vr_positions row: these are recorded votes, not stated positions, and a roster "
  + "wave does not harvest stances. It marks nothing publishable — every newly admitted member is identity only and "
  + "sits below the publication floor, so their page reads 'record still being built' until cited content lands on "
  + "it, and that is the correct state rather than a thing to be waved past.", 74, "-- "));
w("--");
w(wrap(
  "And it deletes nothing. Over-attribution is refused at pull time: a roll whose judged rows would outnumber the "
  + "Clerk's own yea+nay is dropped whole and filed as a repair in the seed, never trimmed with a DELETE inside a "
  + "roster wave. On this pull no roll was refused, no stored cell was contradicted by the document, and no stored "
  + "cell was found stranded — " + S.storedCellsConfirmed.total + " stored cells were re-read on the way past and every one "
  + "agreed. The verification block re-checks the same ceiling against the database rather than trusting the pull.", 74, "-- "));
w("--");
w(`-- Source: ${S.source}`);
w(`-- Identity path: ${S.identityPath}`);
w(`-- Pulled: ${S.pulledAt}`);
w("-- ---------------------------------------------------------------------------");
w();

// ── THE CELLS ───────────────────────────────────────────────────────────────
w("DO $$");
w("DECLARE");
w("  rc integer;");
w("BEGIN");
w();
for (const v of votes) {
  const p3 = String(v.rollNumber).padStart(3, "0");
  w(`  -- ── house ${v.congress}/${v.session}/${v.rollNumber} · ${v.measure} · ${v.question} ─────────────────`);
  w(`  -- ${v.actionType} · ${v.voteDate} · document pool ${v.documentTotals.yea}-${v.documentTotals.nay}, `
    + `${v.chamberRecorded} recorded · seeded by ${v.seededBy} (wave ${v.wave})`);
  w(`  -- stored ${v.heldBefore} → ${v.heldAfter} (+${v.memberVotes.length}) · skipped ${v.skippedBefore} → ${v.stillSkipped}`
    + (v.issueKeys.length ? ` · issue keys on this measure: ${v.issueKeys.join(", ")}` : " · this measure carries no issue mapping, so these cells are a voting record and not an act"));
  w(`  -- ${v.xmlUrl}`);
  w(`  SELECT id INTO rc FROM vr_rollcalls`);
  w(`   WHERE chamber = 'house' AND congress = ${v.congress} AND session = ${v.session} AND roll_number = ${v.rollNumber};`);
  w(`  IF rc IS NULL THEN`);
  w(`    RAISE EXCEPTION 'Federal roster wave R1: house ${v.congress}/${v.session}/${v.rollNumber} (${v.measure}) is not on file — this wave attaches votes to rolls that already exist and creates none.';`);
  w(`  END IF;`);
  w(`  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES`);
  const rows = v.memberVotes.map((m) => `    (rc, ${q(m.politicianId)}, ${q(m.position)}, ${nul(m.isParty)})`);
  w(rows.join(",\n"));
  w("  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;");
  w();
}
w("END $$;");
w();

// ── VERIFICATION ────────────────────────────────────────────────────────────
const rollPairs = votes.map((v) => `(${v.congress}, ${v.session}, ${v.rollNumber})`);
w("-- ────────────────────────────────────────────────────────────────────────────");
w(`-- VERIFICATION — scoped to THIS WAVE'S ${votes.length} roll calls and its own ${SLUGS.length} slugs.`);
w("-- Nothing below counts a corpus-wide total. A guard that fails because some other wave");
w("-- landed is a guard that gets deleted, so every count here is taken over the named rolls");
w("-- and the named slugs only. The id lists live in integer[] locals rather than temp tables:");
w("-- a data-only migration that sorts after the newest drizzle snapshot may not declare an");
w("-- object, and scripts/test-vr-corrections.mjs reads any CREATE of a TABLE as a declaration");
w("-- regardless of how temporary it is.");
w("-- ────────────────────────────────────────────────────────────────────────────");
w("DO $$");
w("DECLARE");
w("  roll_ids integer[];");
w("  measure_ids integer[];");
w("  wave_slugs text[] := ARRAY[");
for (let i = 0; i < SLUGS.length; i += 4) {
  const chunk = SLUGS.slice(i, i + 4).map(q).join(", ");
  w("    " + chunk + (i + 4 < SLUGS.length ? "," : ""));
}
w("  ];");
w("  n integer;");
w("BEGIN");
w("  SELECT array_agg(r.id ORDER BY r.id) INTO roll_ids FROM vr_rollcalls r");
w("   WHERE r.chamber = 'house' AND (r.congress, r.session, r.roll_number) IN (");
w("     " + rollPairs.join(", "));
w("   );");
w("  SELECT array_agg(DISTINCT r.measure_id) INTO measure_ids FROM vr_rollcalls r WHERE r.id = ANY(roll_ids);");
w();
w(`  IF coalesce(array_length(roll_ids, 1), 0) <> ${votes.length} THEN`);
w(`    RAISE EXCEPTION 'Federal roster wave R1: expected ${votes.length} roll calls in scope, found %', coalesce(array_length(roll_ids, 1), 0);`);
w("  END IF;");
w(`  IF coalesce(array_length(wave_slugs, 1), 0) <> ${SLUGS.length} THEN`);
w(`    RAISE EXCEPTION 'Federal roster wave R1: the emitted slug list is % long, not ${SLUGS.length}', coalesce(array_length(wave_slugs, 1), 0);`);
w("  END IF;");
w();
w("  -- THE CELLS LANDED, AND THE COUNT IS THE SEED'S. Stored-before plus written equals");
w("  -- stored-after; a re-run finds the same number because every insert is ON CONFLICT DO");
w("  -- NOTHING, which is also why this guard is an equality and not a lower bound.");
w("  SELECT count(*) INTO n FROM vr_member_votes v WHERE v.rollcall_id = ANY(roll_ids);");
w(`  IF n <> ${heldAfter} THEN`);
w(`    RAISE EXCEPTION 'Federal roster wave R1: expected ${heldAfter} member votes on this wave''s ${votes.length} rolls (${heldBefore} stored before + ${cells} written), found %', n;`);
w("  END IF;");
w("  SELECT count(*) INTO n FROM vr_member_votes v WHERE v.rollcall_id = ANY(roll_ids) AND v.politician_id = ANY(wave_slugs);");
w(`  IF n <> ${cells} THEN`);
w(`    RAISE EXCEPTION 'Federal roster wave R1: expected ${cells} cells on this wave''s own slugs, found %', n;`);
w("  END IF;");
w();
w("  -- ONE PERSON, ONE FILE. No cell on these rolls belongs to a politician_id that is");
w("  -- neither already-mapped nor admitted by this wave, so a typo in the slug list would");
w("  -- surface here rather than as an orphan page nobody can reach.");
w("  SELECT count(DISTINCT v.politician_id) INTO n FROM vr_member_votes v WHERE v.rollcall_id = ANY(roll_ids);");
w(`  IF n <> ${slugsAfter} THEN`);
w(`    RAISE EXCEPTION 'Federal roster wave R1: expected ${slugsAfter} distinct slugs holding a cell on these ${votes.length} rolls (${slugsBefore} before + ${slugsAfter - slugsBefore} newly admitted), found %', n;`);
w("  END IF;");
w();
w("  -- TWO LIVING PEOPLE WITH ONE NAME STAY TWO FILES. mike_rogers is the former Michigan");
w("  -- congressman and House Intelligence chair; mike_rogers_al is the sitting member for");
w("  -- Alabama's 3rd, admitted by this wave under a deliberately distinct slug. The Michigan");
w("  -- file must hold no cell on a 119th House roll, because he was not in this chamber. This");
w("  -- is the guard against the failure the King-Hinds/Kennedy collision already cost once.");
w("  SELECT count(*) INTO n FROM vr_member_votes v WHERE v.rollcall_id = ANY(roll_ids) AND v.politician_id = 'mike_rogers';");
w("  IF n > 0 THEN");
w("    RAISE EXCEPTION 'Federal roster wave R1: % cell(s) on these rolls were attributed to mike_rogers, who is a different living person from mike_rogers_al and was not in the 119th House.', n;");
w("  END IF;");
w();
w("  -- THE POSITION AND is_party VOCABULARIES ARE CLOSED.");
w("  SELECT count(*) INTO n FROM vr_member_votes v WHERE v.rollcall_id = ANY(roll_ids)");
w("     AND v.position NOT IN ('yea', 'nay', 'present', 'not_voting');");
w("  IF n > 0 THEN");
w("    RAISE EXCEPTION 'Federal roster wave R1: % member vote(s) carry a position outside the closed vocabulary.', n;");
w("  END IF;");
w("  SELECT count(*) INTO n FROM vr_member_votes v WHERE v.rollcall_id = ANY(roll_ids)");
w("     AND v.is_party IS NOT NULL AND v.is_party NOT IN ('with_party', 'against_party');");
w("  IF n > 0 THEN");
w("    RAISE EXCEPTION 'Federal roster wave R1: % member vote(s) carry an is_party outside the closed vocabulary.', n;");
w("  END IF;");
w();
w("  -- THE TALLY IS STILL THE CHAMBER'S. This wave adds 7,138 rows to these rolls and must");
w("  -- not have touched a single total: a roll whose stored totals were recomputed from its");
w("  -- attributed rows would now publish a vote the House never took. Each roll still");
w("  -- accounts for a full chamber.");
w("  SELECT count(*) INTO n FROM vr_rollcalls r WHERE r.id = ANY(roll_ids)");
w("     AND (r.totals->>'yea')::int + (r.totals->>'nay')::int");
w("       + coalesce((r.totals->>'present')::int, 0) + coalesce((r.totals->>'notVoting')::int, 0)");
w("       NOT BETWEEN 425 AND 441;");
w("  IF n > 0 THEN");
w("    RAISE EXCEPTION 'Federal roster wave R1: % roll(s) no longer account for a full House.', n;");
w("  END IF;");
w();
w("  -- F8's PULL RULE, RE-CHECKED AGAINST THE DATABASE. The attributed set is a SUBSET of");
w("  -- the chamber. Judged rows outnumbering the document's own yea+nay pool means a cell on");
w("  -- one of these rolls belongs to nobody the House lists — the shape of senate 119/1 roll");
w("  -- 7, which three document reads walked past and a verification block like this one");
w("  -- caught at deploy time. The wave refuses the roll rather than deleting the row.");
w("  SELECT count(*) INTO n FROM vr_rollcalls r WHERE r.id = ANY(roll_ids)");
w("     AND (r.totals->>'yea')::int + (r.totals->>'nay')::int");
w("       < (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id = r.id AND v.position IN ('yea', 'nay'));");
w("  IF n > 0 THEN");
w("    RAISE EXCEPTION 'Federal roster wave R1: % roll(s) hold more judged rows than the Clerk''s own yea+nay pool. A repair with its own citation is owed; do not trim it here.', n;");
w("  END IF;");
w();
w("  -- NO MEASURE READING MOVED. The issue rows on these 23 rolls' measures are exactly the");
w("  -- ones that were there before: this wave argues about who voted, never about what the");
w("  -- vote meant, so a new mapping or a new key appearing here is this wave exceeding itself.");
w("  SELECT count(*) INTO n FROM vr_measure_issues i WHERE i.measure_id = ANY(measure_ids);");
w(`  IF n <> ${issueRows} THEN`);
w(`    RAISE EXCEPTION 'Federal roster wave R1: expected the same ${issueRows} issue row(s) on these rolls'' measures as before the wave, found %. This wave writes no mapping and no key.', n;`);
w("  END IF;");
w();
w("  -- NO STANCE HARVEST. Not one stated position exists for any member this wave admitted.");
w("  -- These are recorded votes; a stance is a different claim with a different citation.");
w("  SELECT count(*) INTO n FROM vr_positions p WHERE p.politician_id = ANY(wave_slugs);");
w("  IF n > 0 THEN");
w("    RAISE EXCEPTION 'Federal roster wave R1: % stated position(s) exist for newly admitted members. This wave harvests no stances.', n;");
w("  END IF;");
w();
w("  RAISE NOTICE 'Federal roster wave R1 verified: % member votes on % House roll calls, % of them on the wave''s own slugs; 0 measures, 0 roll calls, 0 issue mappings, 0 stated positions, 0 deletions.',");
w("    (SELECT count(*) FROM vr_member_votes WHERE rollcall_id = ANY(roll_ids)),");
w("    array_length(roll_ids, 1),");
w("    (SELECT count(*) FROM vr_member_votes WHERE rollcall_id = ANY(roll_ids) AND politician_id = ANY(wave_slugs));");
w("END $$;");
w();

writeFileSync(OUT, L.join("\n"));
console.log(`wrote ${OUT.replace(ROOT + "/", "")} (${L.length} lines)`);
