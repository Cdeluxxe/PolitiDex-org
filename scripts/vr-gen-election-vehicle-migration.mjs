#!/usr/bin/env node
// ---------------------------------------------------------------------------
// vr-gen-election-vehicle-migration.mjs — the S. 1383 / SAVE America Act roll
// ---------------------------------------------------------------------------
// A forward-only delta on top of the election-facet pass that
// scripts/vr-gen-elections-vote-migration.mjs published. That migration is applied;
// it is not regenerated, widened or re-run. This file writes only what it did not
// know about:
//
//   node scripts/vr-gen-election-vehicle-migration.mjs \
//     > netlify/database/migrations/20260817000000_vr_save_america_act_vehicle_rollcall.sql
//
// WHY THIS ROLL WAS MISSED, AND WHY THAT IS WORTH SAYING IN SQL
// ------------------------------------------------------------
// The earlier pass scanned the Clerk's own yearly indexes for every 2021-2026 roll whose
// issue, question or title mentions voting, ballots, elections, registration or
// citizenship, and concluded that the 119th's second session held no election measure at
// all. It held one. The Clerk's row for roll 69 reads "S 1383 — Veterans Accessibility
// Advisory Committee Act", because the House emptied a Senate veterans bill on the floor
// and substituted the SAVE America Act into it. No election keyword appears in that row,
// so a title scan could not have found it — and the earlier finding was not a careless
// read, it was a keyword scan meeting a vehicle. The correction is carried here rather
// than by editing the applied file.
//
// MAPPED ON THE SUBSTITUTE'S TEXT, NOT ON THE VEHICLE'S CAPTION
// ------------------------------------------------------------
// Direction on both facets is read from the engrossed House amendment itself
// (BILLS-119s1383eah), not from the surviving Senate title and not from the tally. The
// rationales in db/vr-issue-seed.json quote the operative provisions, including the
// bill's own easing provisions, which were weighed before the access direction was
// assigned rather than left out of the record.
//
// SHAPE
// -----
//   · The measure is created only when absent, keyed on (congress, chamber, number) —
//     'senate' because S. 1383 is a Senate bill, even though the roll is a House roll.
//   · Roll call and member votes are ON CONFLICT DO NOTHING, so a re-run is a no-op.
//   · The orphan check applies in full here: unlike H.R. 22's roll 102, this roll was
//     attributed only through db/vr-member-map.json, so any slug outside the roster on it
//     would be a real fault rather than another pass's wider attribution.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { assertSeedPidsMatchMap } from "./vr-seed-pid-guard.mjs";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const SEED_PATH = "db/vr-elections-vote-seed.json";
const seed = JSON.parse(fs.readFileSync(path.join(ROOT, SEED_PATH), "utf8"));
const issueSeed = JSON.parse(fs.readFileSync(path.join(ROOT, "db/vr-issue-seed.json"), "utf8"));
const memberMap = JSON.parse(fs.readFileSync(path.join(ROOT, "db/vr-member-map.json"), "utf8"));
const ROSTER = [...new Set(Object.values(memberMap.map || {}))].sort();

// The one roll this migration is responsible for. Named, not derived, so the file cannot
// quietly grow to cover a roll a later pass adds to the seed.
const TARGET = { chamber: "house", congress: 119, session: 2, rollNumber: 69 };
const vote = (seed.votes || []).find(
  (v) => v.chamber === TARGET.chamber && v.congress === TARGET.congress
    && v.session === TARGET.session && v.rollNumber === TARGET.rollNumber
);
if (!vote) {
  throw new Error(
    `${SEED_PATH} carries no ${TARGET.chamber} ${TARGET.congress}/${TARGET.session} roll `
    + `${TARGET.rollNumber} — run scripts/vr-build-elections-vote-seed.mjs first.`
  );
}
// Refuse to generate from a seed whose (bioguideId → politicianId) pairs the current
// member map contradicts; re-resolving here would hide the disagreement.
const pidCheck = assertSeedPidsMatchMap({ votes: [vote] }, memberMap, SEED_PATH);

const measure = vote.measure;
const ikey = (congress, chamber, number) =>
  `${congress}|${chamber}|${String(number || "").toLowerCase().replace(/[.\s]/g, "")}`;
const mapped = (issueSeed.measures || []).find(
  (m) => ikey(m.congress, m.chamber, m.number) === ikey(measure.congress, measure.chamber, measure.number)
);
if (!mapped || !(mapped.issues || []).length) {
  throw new Error(
    `db/vr-issue-seed.json has no mapping for ${measure.number} (${measure.congress}th `
    + `${measure.chamber}) — an unmapped measure ranks nobody, so this refuses to write it.`
  );
}

const q = (s) => "'" + String(s == null ? "" : s).replace(/'/g, "''") + "'";
const qOrNull = (s) => (s == null || s === "" ? "NULL" : q(s));
const out = [];
const w = (s = "") => out.push(s);
const wrap = (text, prefix = "-- ", cont = null) => {
  const contPrefix = cont == null ? prefix : cont;
  let line = "";
  let first = true;
  for (const word of String(text).replace(/\s+/g, " ").trim().split(" ")) {
    if (line && (line + " " + word).length > 86) {
      w((first ? prefix : contPrefix) + line);
      first = false;
      line = word;
    } else line = line ? line + " " + word : word;
  }
  if (line) w((first ? prefix : contPrefix) + line);
};
const wrapBullet = (text) => wrap("· " + text, "-- ", "--   ");

const MVAR = "m_s1383";
const secRows = (mapped.issues || []).filter((i) => i.issueKey === "election_security").length;
const accRows = (mapped.issues || []).filter((i) => i.issueKey === "voting_access").length;
const pt = Object.entries(vote.partyTotals || {}).map(([p, t]) => `${p} ${t.yea}-${t.nay}`).join(", ");

// ── header ──────────────────────────────────────────────────────────────────
w("-- ---------------------------------------------------------------------------");
w("-- SAVE America Act — the February 2026 vehicle roll the facet pass could not see");
w("-- ---------------------------------------------------------------------------");
w("-- Generated by scripts/vr-gen-election-vehicle-migration.mjs from db/vr-elections-vote-seed.json.");
w("-- Do not hand-edit: regenerate, or roll forward with a new migration.");
w("--");
w(`-- 1 roll call · ${vote.memberVotes.length} attributed member votes · 1 measure`);
w(`-- ${secRows} election_security mapping · ${accRows} voting_access mapping`);
w("--");
w("-- A FORWARD DELTA, NOT A REGENERATION");
wrap("The election-facet pass in 20260816000000_vr_election_facet_rollcalls.sql is applied and "
  + "is left alone. This migration adds the one roll call that pass concluded did not exist, "
  + "and nothing else: no row it already wrote is restated, and no facet it already decided is "
  + "re-filed.");
w("--");
w("-- THE CORRECTION, STATED PLAINLY");
wrap("That pass recorded that the 119th Congress's second session contained no "
  + "election-administration measure of any kind. It contained this one. The Clerk's index row "
  + "and the roll's own vote-desc both read \"Veterans Accessibility Advisory Committee Act\", "
  + "the Senate bill S. 1383 as it passed the Senate by unanimous consent on 2025-12-18. On "
  + "2026-02-11 the House considered it under a closed rule, adopted an amendment in the nature "
  + "of a substitute replacing the veterans text with the SAVE America Act, and passed it "
  + `${vote.totals.yea}-${vote.totals.nay}. A keyword scan of titles cannot see a vehicle, `
  + "which is why the earlier finding was wrong and why every selection in this family is "
  + "verified on <legis-num> and question rather than on a caption.");
w("--");
w("-- HOW THE SUBSTITUTE WAS IDENTIFIED");
wrap("Three members' own releases dated February 11, 2026 describe that day's vote as passage "
  + "of the SAVE America Act. The bill's GovInfo BILLSTATUS record confirms it: S. 1383 carries "
  + "the short titles \"Safeguard American Voter Eligibility Act\" and \"SAVE America Act\" from "
  + "the engrossed House amendment onward, and the House action at 18:44 on 2026-02-11 reads "
  + "\"On passage Passed by the Yeas and Nays: "
  + `${vote.totals.yea} - ${vote.totals.nay} (Roll no. ${vote.rollNumber}). (text of amendment `
  + "in the nature of a substitute: CR H2138-2141)\". The Clerk's XML for the roll supplies the "
  + "tally and every member position used below.");
w("--");
w("-- DIRECTION IS READ FROM THE SUBSTITUTE'S PROVISIONS");
wrap("Both facets are mapped, in opposite directions, from the text of the engrossed House "
  + "amendment rather than from the vote's margin or its sponsors. election_security is "
  + "yea_supports: documentary proof of citizenship at registration, photo identification at "
  + "casting, comparison of state voter lists against the Department of Homeland Security's SAVE "
  + "system, and criminal penalties for officials who register an applicant without proof. "
  + "voting_access is yea_opposes: a mail-form applicant must present proof in person to an "
  + "election official, and an in-person voter without photo identification may cast only a "
  + "provisional ballot subject to a three-day cure. The substitute's own easing provisions — an "
  + "alternative-evidence pathway on a perjury attestation, a former-name process, free public "
  + "access to a copier, and exemptions for uniformed-services and certain elderly and disabled "
  + "voters — were read and weighed; each accommodates the new requirement rather than widening "
  + "access on its own, so the yea does not point both ways and the access facet is not declined "
  + "the way it is on H.R. 1 and H.R. 5746. Full rationales are on the rows themselves.");
w("--");
w("-- SAME DAY, DECLINED");
for (const d of (seed.declinedRollCalls || []).filter((x) => x.congress === 119 && x.session === 2)) {
  wrapBullet(`${d.number} ${d.chamber} ${d.congress}/${d.session} roll ${d.roll ?? "n/a"} (${d.totals}) — ${d.why}`);
}
w("--");
w("-- ATTRIBUTION IS FAIL-CLOSED");
wrap(`${vote.memberVotes.length} of ${vote.chamberVoting} voting members are on `
  + `db/vr-member-map.json; the other ${vote.rosterSkipped} are skipped and counted, never `
  + "guessed. totals is the full chamber tally and is_party is computed from the full recorded "
  + "vote before the roster filter, so the roster subset cannot invent a margin or a crossover. "
  + "Unlike H.R. 22's roll 102, this roll has no earlier wider ingest behind it, so the "
  + "verification block's orphan check covers it in full.");
w("--");
wrap("Idempotent: the measure is created only when absent, and the roll call, member votes and "
  + "issue rows are all ON CONFLICT DO NOTHING.");
w("-- ---------------------------------------------------------------------------");
w();
w("DO $$");
w("DECLARE");
w(`  ${MVAR} integer;`);
w("  rc integer;");
w("BEGIN");
w();
w("  -- ── measure ───────────────────────────────────────────────────────────────");
w(`  -- ${measure.number} (${measure.congress}th ${measure.chamber}) — ${measure.create.title}`);
w("  -- Keyed on (congress, chamber, number): 'senate' is the bill's own chamber. The roll it");
w("  -- was passed on is a House roll and is inserted as such below.");
w(`  SELECT id INTO ${MVAR} FROM vr_measures`);
w(`   WHERE congress = ${measure.congress} AND chamber = ${q(measure.chamber)} AND number = ${q(measure.number)} LIMIT 1;`);
w(`  IF ${MVAR} IS NULL THEN`);
w("    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids)");
w(`    VALUES (${q(measure.measureType)}, ${measure.congress}, ${q(measure.chamber)}, ${q(measure.number)}, ${q(measure.create.title)}, ${qOrNull(measure.create.shortTitle)},`);
w(`      ${q(measure.create.summary)},`);
w(`      ${measure.create.introducedAt ? `DATE ${q(measure.create.introducedAt)}` : "NULL"}, ${q(measure.create.status)}, ${q(measure.create.sourceUrl)}, ${q(measure.create.sourceLabel)}, ${q(JSON.stringify(measure.create.externalIds))}::jsonb)`);
w(`    RETURNING id INTO ${MVAR};`);
w("  END IF;");
w();
w("  -- ── roll call and member votes ────────────────────────────────────────────");
w(`  -- ${vote.chamber} ${vote.congress}/${vote.session} roll ${vote.rollNumber} · ${measure.number} · ${vote.question}`);
w(`  --   ${vote.totals.yea}-${vote.totals.nay}${vote.totals.present ? `, ${vote.totals.present} present` : ""}${vote.totals.notVoting ? `, ${vote.totals.notVoting} not voting` : ""} (${pt}) · ${vote.result}`);
w(`  --   ${vote.memberVotes.length} of ${vote.chamberVoting} voting members are on the roster; ${vote.rosterSkipped} skipped as unmapped`);
w(`  --   Clerk vote-desc reads "${vote.voteDesc}" — the vehicle's Senate title, not the substitute's`);
w("  INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)");
w(`  VALUES (${MVAR}, ${q(vote.chamber)}, ${vote.congress}, ${vote.session}, ${vote.rollNumber}, TIMESTAMPTZ ${q(vote.voteDate)}, ${q(vote.question)}, ${q(vote.actionType)}, ${q(vote.result)}, ${q(vote.requiredMajority)},`);
w(`    ${q(JSON.stringify({ yea: vote.totals.yea, nay: vote.totals.nay, present: vote.totals.present, notVoting: vote.totals.notVoting, byParty: vote.partyTotals }))}::jsonb, ${q(vote.sourceUrl)}, ${q(vote.sourceLabel)})`);
w("  ON CONFLICT (chamber, congress, session, roll_number) DO NOTHING;");
w("  SELECT id INTO rc FROM vr_rollcalls");
w(`   WHERE chamber = ${q(vote.chamber)} AND congress = ${vote.congress} AND session = ${vote.session} AND roll_number = ${vote.rollNumber} LIMIT 1;`);
w("  IF rc IS NULL THEN");
w(`    RAISE EXCEPTION ${q(`SAVE America Act vehicle: ${vote.chamber} ${vote.congress}/${vote.session} roll ${vote.rollNumber} could not be read back after insert.`)};`);
w("  END IF;");
w("  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES");
w(vote.memberVotes.map((x) => `    (rc, ${q(x.politicianId)}, ${q(x.position)}, ${qOrNull(x.isParty)})`).join(",\n"));
w("  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;");
w();
w("  -- ── issue mappings ────────────────────────────────────────────────────────");
w("  -- Curated in db/vr-issue-seed.json, with the provision-level rationale on every row.");
w(`  -- ${measure.number} (${measure.congress}th) — ${(mapped.issues || []).map((i) => `${i.issueKey} ${i.supportMeaning}`).join(", ")}`);
w("  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES");
w((mapped.issues || []).map((i) =>
  `    (${MVAR}, ${q(i.issueKey)}, ${i.weight}, ${i.isPrimary ? "true" : "false"}, ${q(i.supportMeaning)},\n      ${q(i.rationale)},\n      ${qOrNull(i.sourceUrl || mapped.sourceUrl)})`
).join(",\n"));
w("  ON CONFLICT (measure_id, issue_key) DO NOTHING;");
w();
w("END $$;");
w();

// ── verification ────────────────────────────────────────────────────────────
w("-- ---------------------------------------------------------------------------");
w("-- Verification");
w("-- ---------------------------------------------------------------------------");
wrap("Read-only, and scoped to this one roll call and this one measure. A global count would "
  + "drag in the seven rolls the earlier pass wrote and stop meaning anything.");
w("-- ---------------------------------------------------------------------------");
w("DO $$");
w("DECLARE");
w("  n_rolls integer;");
w("  n_votes integer;");
w("  n_orphan integer;");
w("  n_sec integer;");
w("  n_acc integer;");
w("BEGIN");
w("  WITH roll_ids AS (");
w("    SELECT r.id FROM vr_rollcalls r");
w(`     WHERE r.chamber = ${q(vote.chamber)} AND r.congress = ${vote.congress}`);
w(`       AND r.session = ${vote.session} AND r.roll_number = ${vote.rollNumber}`);
w("  ), measure_ids AS (");
w("    SELECT m.id FROM vr_measures m");
w(`     WHERE m.congress = ${measure.congress} AND m.chamber = ${q(measure.chamber)} AND m.number = ${q(measure.number)}`);
w("  )");
w("  SELECT (SELECT count(*) FROM roll_ids),");
w("         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM roll_ids)),");
w("         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM roll_ids)");
w("            AND v.politician_id NOT IN (");
w("              " + ROSTER.map((s) => q(s)).join(", "));
w("            )),");
w("         (SELECT count(*) FROM vr_measure_issues i WHERE i.issue_key = 'election_security'");
w("            AND i.measure_id IN (SELECT id FROM measure_ids)),");
w("         (SELECT count(*) FROM vr_measure_issues i WHERE i.issue_key = 'voting_access'");
w("            AND i.measure_id IN (SELECT id FROM measure_ids))");
w("    INTO n_rolls, n_votes, n_orphan, n_sec, n_acc;");
w();
w("  RAISE NOTICE 'SAVE America Act vehicle: % roll call, % member votes, % election_security and % voting_access mappings', n_rolls, n_votes, n_sec, n_acc;");
w();
w("  IF n_rolls <> 1 THEN");
w(`    RAISE EXCEPTION 'SAVE America Act vehicle: expected 1 roll call for ${vote.chamber} ${vote.congress}/${vote.session} roll ${vote.rollNumber}, found %', n_rolls;`);
w("  END IF;");
w(`  IF n_votes < ${vote.memberVotes.length} THEN`);
w(`    RAISE EXCEPTION 'SAVE America Act vehicle: expected at least ${vote.memberVotes.length} member votes on this roll call, found %', n_votes;`);
w("  END IF;");
w("  IF n_orphan > 0 THEN");
w("    RAISE EXCEPTION 'SAVE America Act vehicle: % member vote(s) carry a politician_id outside db/vr-member-map.json', n_orphan;");
w("  END IF;");
w(`  IF n_sec <> ${secRows} THEN`);
w(`    RAISE EXCEPTION 'SAVE America Act vehicle: expected ${secRows} election_security mapping, found %', n_sec;`);
w("  END IF;");
w(`  IF n_acc <> ${accRows} THEN`);
w(`    RAISE EXCEPTION 'SAVE America Act vehicle: expected ${accRows} voting_access mapping, found %', n_acc;`);
w("  END IF;");
w("END $$;");

process.stdout.write(out.join("\n") + "\n");
process.stderr.write(
  `1 roll (${vote.chamber} ${vote.congress}/${vote.session} roll ${vote.rollNumber}) · `
  + `${vote.memberVotes.length} member votes · ${measure.number} (${measure.congress}th) · `
  + `${secRows + accRows} issue rows (${secRows} election_security, ${accRows} voting_access) · `
  + `${pidCheck.checked} bioguide→pid pairs agree with the member map\n`
);
