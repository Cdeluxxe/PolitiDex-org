#!/usr/bin/env node
// ---------------------------------------------------------------------------
// vr-gen-consolidated-approps-migration.mjs
// ---------------------------------------------------------------------------
// Turns db/vr-consolidated-approps-vote-seed.json plus the matching rows in
// db/vr-issue-seed.json into a forward-only migration for H.R. 7148, the Consolidated
// Appropriations Act, 2026 (P.L. 119-75), and for two new axes on the already-live
// H.R. 8595. The seed is the mirror; this file is the source of truth for what reaches
// the database.
//
//   node scripts/vr-gen-consolidated-approps-migration.mjs > netlify/database/migrations/<ts>_vr_consolidated_approps_2026.sql
//
// Shape, and why each part is shaped that way:
//
//   · H.R. 7148 is CREATED. Before this pass it had no vr_measures row, no roll calls and
//     no member votes anywhere in the repository. H.R. 8595 is looked up and never
//     inserted — re-describing a row 20260724140000_seed_house_119_s2_voting_record.sql
//     owns is how two competing descriptions of one bill get written — and if it is gone
//     the migration RAISES rather than quietly creating a second.
//   · EVERY lookup keys on measure_type, congress, chamber AND number, matching the house
//     convention set after the 117th/119th H.R. 1 collision.
//   · Roll calls and member votes are ON CONFLICT DO NOTHING on the tuples the tables are
//     themselves unique on, so a re-run is a no-op.
//   · Issue rows come verbatim from db/vr-issue-seed.json, each with a rationale and a
//     primary source — scripts/test-mapping-discipline.mjs requires both. Ten rows are
//     emitted: six new axes on H.R. 7148, two new axes on H.R. 8595, and two byte-identical
//     re-emissions of H.R. 8595's live gov_services and strong_defense rows, which exist so
//     the seed mirror is complete under runbook rule 20 and which ON CONFLICT turns into
//     no-ops under rule 21.
//
// WHAT THIS MIGRATION DOES NOT TOUCH
// ----------------------------------
// No title, short_title, summary or status of an existing row is rewritten. H.R. 8595's two
// live rationales are the first writer's and stay the first writer's. Roll 45 is not
// ingested. No public-lane stance row is written; the read produced no sourced, dated,
// independent position that cleared the standing guards.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { assertSeedPidsMatchMap } from "./vr-seed-pid-guard.mjs";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const SEED_PATH = "db/vr-consolidated-approps-vote-seed.json";
const seed = JSON.parse(fs.readFileSync(path.join(ROOT, SEED_PATH), "utf8"));
const issueSeed = JSON.parse(fs.readFileSync(path.join(ROOT, "db/vr-issue-seed.json"), "utf8"));
const memberMap = JSON.parse(fs.readFileSync(path.join(ROOT, "db/vr-member-map.json"), "utf8"));

const pidCheck = assertSeedPidsMatchMap(seed, memberMap, SEED_PATH);

const q = (s) => "'" + String(s == null ? "" : s).replace(/'/g, "''") + "'";
const qOrNull = (s) => (s == null || s === "" ? "NULL" : q(s));
const varName = (m) => `m_${m.congress}_${String(m.number).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
const ikey = (congress, chamber, number) =>
  `${congress}|${chamber}|${String(number).toLowerCase().replace(/[.\s]/g, "")}`;
const issueIndex = new Map((issueSeed.measures || []).map((m) => [ikey(m.congress, m.chamber, m.number), m]));
const issuesFor = (m) => {
  const hit = issueIndex.get(ikey(m.congress, m.chamber, m.number));
  if (!hit) {
    console.error(`! ${m.number} (${m.congress}th ${m.chamber}) has no entry in db/vr-issue-seed.json.`);
    process.exit(1);
  }
  return { issues: hit.issues || [], sourceUrl: hit.sourceUrl };
};

// ── the measures this pass writes ───────────────────────────────────────────
// H.R. 7148 comes out of the vote seed, which carries its `create` block. H.R. 8595 has no
// roll in this seed — it contributes mappings only — so it is declared here.
const measures = [];
const seen = new Set();
for (const v of seed.votes) {
  const k = ikey(v.measure.congress, v.measure.chamber, v.measure.number);
  if (seen.has(k)) continue;
  seen.add(k);
  measures.push({ ...v.measure, var: varName(v.measure) });
}
const HR8595 = {
  measureType: "bill", congress: 119, chamber: "house", number: "H.R. 8595",
  title: "National Security, Department of State, and Related Programs Appropriations Act, 2027",
  var: varName({ congress: 119, number: "H.R. 8595" }),
  mustExist:
    "Live since 20260724140000_seed_house_119_s2_voting_record.sql, which created it and its "
    + "passage roll 119/2/247 (217-209) and recommit roll 246 (209-216), and mapped by "
    + "20260725000000_vr_multi_issue_mappings_wave2.sql with gov_services 100 primary and "
    + "strong_defense 60. 20260812000000_vr_israel_support_rollcalls.sql uses it as the parent "
    + "vehicle p_119_h_r_8595 for H.Amdt. 235 and 236 and RAISES if it is absent. This pass adds two "
    + "axes and touches nothing else on the row.",
  mappingNote:
    "Both new axes are read off the engrossed text at "
    + "https://www.govinfo.gov/content/pkg/BILLS-119hr8595eh/html/BILLS-119hr8595eh.htm, not off the "
    + "title. The live gov_services and strong_defense rows below are byte-identical re-emissions "
    + "under runbook rule 20 so the seed mirror is complete; ON CONFLICT makes them no-ops, and "
    + "rule 21 leaves their rationales with their first writer.",
};
measures.push(HR8595);

const out = [];
const w = (s = "") => out.push(s);
function wrapLocal(text, width = 84) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (line && (line + " " + word).length > width) { lines.push(line); line = word; }
    else line = line ? line + " " + word : word;
  }
  if (line) lines.push(line);
  return lines;
}
const wrap = (text, prefix = "-- ", cont = null) => {
  for (const line of wrapLocal(text)) { w(prefix + line); prefix = cont || prefix; }
};
const wrapBullet = (text) => { let p = "-- · "; for (const l of wrapLocal(text, 80)) { w(p + l); p = "--   "; } };

const KEYS = [...new Set(measures.flatMap((m) => issuesFor(m).issues.map((i) => i.issueKey)))].sort();
const totalIssueRows = measures.reduce((n, m) => n + issuesFor(m).issues.length, 0);

// ── header ──────────────────────────────────────────────────────────────────
w("-- ---------------------------------------------------------------------------");
w("-- Consolidated Appropriations Act, 2026 — H.R. 7148 (P.L. 119-75), division by division");
w("-- ---------------------------------------------------------------------------");
w("-- Generated by scripts/vr-gen-consolidated-approps-migration.mjs from");
w("-- db/vr-consolidated-approps-vote-seed.json.");
w("-- Do not hand-edit: regenerate, or roll forward with a new migration.");
w("--");
w(`-- ${seed.votes.length} roll call (new) · ${seed.memberVoteCount} attributed member votes`);
w("-- 1 measure created (H.R. 7148) · 1 looked up and left as it is (H.R. 8595)");
w(`-- ${totalIssueRows} issue mapping row(s) across ${KEYS.length} key(s): ${KEYS.join(", ")}`);
w("--   8 of them new; 2 are byte-identical re-emissions of live H.R. 8595 rows.");
w("--");
w("-- WHY THIS MEASURE, AND WHY IT WAS NOT HERE ALREADY");
wrap("H.R. 7148 has been item #1 on the follow-up list in db/vr-ingest-runbook.md since the fiscal "
  + "pass, and sat in declinedRollCalls in db/vr-fiscal-enforcement-vote-seed.json for one stated "
  + "reason: separating its axes honestly needed a division-by-division read of the enrolled text. "
  + "That read has now been done against govinfo PLAW-119publ75 (34,584 lines) and the decline is "
  + "lifted. The decline's other premise does not survive contact with the Clerk: it says the act "
  + "'separates far fewer members than its size suggests', but roll 53 is 217-214 with the parties "
  + "inverted from the January passage vote — R 196-21, D 21-193 — which makes it one of the most "
  + "separating rolls of the session, not one of the least.");
w("--");
w("-- ONE ROLL, NOT TWO — RUNBOOK RULE 8");
wrap("The House voted this bill twice: roll 119/2/45 on 22-Jan-2026 'On Passage', 341-88, and roll "
  + "119/2/53 on 3-Feb-2026 'On Motion to Concur in the Senate Amendments', 217-214. Rule 8 admits "
  + "one decisive roll per chamber per measure, and the tie-breaker here is textual. Roll 53 voted "
  + "the ENROLLED text — the text whose divisions produced every mapping below. Roll 45 cannot have "
  + "voted that text: Division H moves the P.L. 119-37 continuing resolution date to February 13, "
  + "2026 and ratifies pay and obligations incurred during a lapse that began on or about January "
  + "31, 2026, nine days after roll 45 was taken.");
w("--");
w("-- WHAT WAS READ");
wrap(seed.scanCoverage);
w("--");
w("-- THE ROLLS, VERIFIED AGAINST THE CHAMBER'S OWN RECORD");
wrap(seed.rollFinding);
w("--");
w("-- DIVISIONS READ AND NOT MAPPED, WITH THE BUCKET");
wrap("A mapping attaches to the MEASURE, so every axis added here is applied at full strength to the "
  + "roll below and to all 108 attributed members. That is the test each candidate axis had to "
  + "survive. An eleven-division appropriations act will map to a handful of keys and correctly map "
  + "to nothing on most of its text; spraying agency account titles onto vague chips would be the "
  + "failure mode, not the coverage win. These did not survive:");
for (const d of seed.declinedDivisions || []) wrapBullet(`[${d.bucket}] ${d.where} — ${d.why}`);
w("--");
w("-- ROLL CALLS CONSIDERED AND DECLINED");
for (const d of seed.declinedRollCalls || []) {
  const where = [d.chamber, d.congress && d.session ? `${d.congress}/${d.session}` : null, d.roll ? `roll ${d.roll}` : null]
    .filter(Boolean).join(" ");
  wrapBullet(`${d.number}${where ? ` ${where}` : ""} (${d.totals}) — ${d.why}`);
}
w("--");
w("-- ATTRIBUTION IS FAIL-CLOSED");
wrap("The roll attributes on the bioguide id in the Clerk's XML against db/vr-member-map.json — a "
  + "direct lookup, and an unmapped member is skipped and counted, never guessed. The roll is "
  + "re-verified against <legis-num> and <vote-question> before ingest; <vote-desc>, which the Clerk "
  + "abbreviates freely, is deliberately ignored. totals is the FULL chamber tally and is_party is "
  + "computed from the full recorded vote before the roster filter, so a partial roster cannot "
  + "invent a margin or a party crossover.");
w("--");
w(`-- ${pidCheck}`);
w("-- ---------------------------------------------------------------------------");
w();
w("DO $$");
w("DECLARE");
for (const m of measures) w(`  ${m.var} integer;`);
w("  rc integer;");
w("BEGIN");
w();

// ── measures ────────────────────────────────────────────────────────────────
w("  -- ── measures ──────────────────────────────────────────────────────────────");
w("  -- Every lookup keys on measure_type, congress, chamber AND number, so a same-numbered");
w("  -- bill from another Congress can never collect these votes or these axes.");
w();
for (const m of measures) {
  const c = m.create || null;
  const title = (c && c.title) || m.title;
  w(`  -- ${m.number} (${m.congress}th ${m.chamber})${title ? " — " + title : ""}`);
  if (m.mustExist) for (const line of wrapLocal(m.mustExist)) w(`  --   ${line}`);
  if (c && c.textUrl) {
    for (const line of wrapLocal(`Runbook rule 6: identity from the title as enacted. Title, summary and every mapping below are written from the enrolled text ${c.textUrl}, not from a secondary description. vr_measures has no text_url or public_law column, so the citation lives here and the public law number lives in external_ids.`)) w(`  --   ${line}`);
  }
  w(`  SELECT id INTO ${m.var} FROM vr_measures`);
  w(`   WHERE measure_type = ${q(m.measureType)} AND congress = ${m.congress}`);
  w(`     AND chamber = ${q(m.chamber)} AND number = ${q(m.number)} LIMIT 1;`);
  if (c) {
    w(`  IF ${m.var} IS NULL THEN`);
    w("    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids)");
    w(`    VALUES (${q(m.measureType)}, ${m.congress}, ${q(m.chamber)}, ${q(m.number)}, ${q(c.title)}, ${qOrNull(c.shortTitle)},`);
    w(`      ${q(c.summary)},`);
    w(`      ${c.introducedAt ? `DATE ${q(c.introducedAt)}` : "NULL"}, ${q(c.status)}, ${q(c.sourceUrl)}, ${q(c.sourceLabel)}, ${q(JSON.stringify(c.externalIds))}::jsonb)`);
    w(`    RETURNING id INTO ${m.var};`);
    w("  END IF;");
  } else {
    w(`  IF ${m.var} IS NULL THEN`);
    w(`    RAISE EXCEPTION ${q(`Consolidated appropriations pass: ${m.number} (${m.congress}th ${m.chamber}) is not in `
      + "vr_measures — it is expected to exist and is never created here.")};`);
    w("  END IF;");
  }
  w();
}

// ── roll calls and member votes ─────────────────────────────────────────────
w("  -- ── roll calls and member votes ───────────────────────────────────────────");
for (const v of seed.votes) {
  const mv = varName(v.measure);
  const pt = Object.entries(v.partyTotals || {}).map(([p, t]) => `${p} ${t.yea}-${t.nay}`).join(", ");
  w(`  -- ${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber} · ${v.measure.number} · ${v.question}`);
  w(`  --   ${v.totals.yea}-${v.totals.nay}${v.totals.present ? `, ${v.totals.present} present` : ""}${v.totals.notVoting ? `, ${v.totals.notVoting} not voting` : ""} (${pt}) · ${v.result}`);
  w(`  --   ${v.memberVotes.length} of ${v.chamberVoting} recorded members are on the roster; ${v.rosterSkipped} skipped as unmapped`);
  w("  --   NEW roll. The measure, this roll and all of its member votes arrive together.");
  if (v.voteDesc && v.voteDesc !== v.measure.title) w(`  --   chamber vote description reads "${v.voteDesc}"`);
  w("  INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)");
  w(`  VALUES (${mv}, ${q(v.chamber)}, ${v.congress}, ${v.session}, ${v.rollNumber}, TIMESTAMPTZ ${q(v.voteDate)}, ${q(v.question)}, ${q(v.actionType)}, ${q(v.result)}, ${q(v.requiredMajority)},`);
  w(`    ${q(JSON.stringify({ yea: v.totals.yea, nay: v.totals.nay, present: v.totals.present, notVoting: v.totals.notVoting, byParty: v.partyTotals }))}::jsonb, ${q(v.sourceUrl)}, ${q(v.sourceLabel)})`);
  w("  ON CONFLICT (chamber, congress, session, roll_number) DO NOTHING;");
  w("  SELECT id INTO rc FROM vr_rollcalls");
  w(`   WHERE chamber = ${q(v.chamber)} AND congress = ${v.congress} AND session = ${v.session} AND roll_number = ${v.rollNumber} LIMIT 1;`);
  w("  IF rc IS NULL THEN");
  w(`    RAISE EXCEPTION ${q(`Consolidated appropriations pass: ${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber} could not be read back after insert.`)};`);
  w("  END IF;");
  w("  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES");
  w(v.memberVotes.map((x) => `    (rc, ${q(x.politicianId)}, ${q(x.position)}, ${qOrNull(x.isParty)})`).join(",\n"));
  w("  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;");
  w();
}

// ── issue mappings ──────────────────────────────────────────────────────────
w("  -- ── issue mappings ────────────────────────────────────────────────────────");
w("  -- Curated in db/vr-issue-seed.json, with the rationale and a primary source on every");
w("  -- row — scripts/test-mapping-discipline.mjs requires both. Each rationale names the");
w("  -- division, title or section it is read from and states what the instrument DOES, not");
w("  -- what anyone said about it. ON CONFLICT (measure_id, issue_key) DO NOTHING, so a");
w("  -- re-emission of a live row is a no-op and cannot rewrite a rationale another");
w("  -- migration authored.");
w();
for (const m of measures) {
  const { issues, sourceUrl } = issuesFor(m);
  const facets = issues.map((i) => `${i.issueKey} ${i.supportMeaning} w${i.weight}${i.isPrimary ? " PRIMARY" : ""}`).join(", ");
  w(`  -- ${m.number} (${m.congress}th) — ${facets}`);
  if (m.mappingNote) for (const line of wrapLocal(m.mappingNote)) w(`  --   ${line}`);
  const rows = issues.map((i) =>
    `    (${m.var}, ${q(i.issueKey)}, ${i.weight}, ${i.isPrimary ? "true" : "false"}, ${q(i.supportMeaning)},\n`
    + `      ${q(i.rationale)},\n      ${qOrNull(i.sourceUrl || sourceUrl)})`);
  w("  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES");
  w(rows.join(",\n"));
  w("  ON CONFLICT (measure_id, issue_key) DO NOTHING;");
  w();
}
w("END $$;");
w();

// ── verification ────────────────────────────────────────────────────────────
const v0 = seed.votes[0];
w("-- ---------------------------------------------------------------------------");
w("-- Verification");
w("-- ---------------------------------------------------------------------------");
wrap("Read-only, and scoped by tuple to exactly this pass's measure and roll so it can only ever "
  + "fail on data this migration is responsible for. A global count would drag in every "
  + "appropriations mapping earlier passes wrote and stop meaning anything.");
w("--");
wrap("The mapping count asserts >= because H.R. 8595 carries two live rows this pass re-emits as "
  + "no-ops, and because nothing here forbids a later pass from adding an axis. The member-vote "
  + "count asserts = on the one roll this migration creates: it is created here and nowhere else, "
  + "so the exact number is knowable and a short write is a real failure rather than a race.");
w("-- ---------------------------------------------------------------------------");
w("DO $$");
w("DECLARE");
w("  m_id integer;");
w("  rc_id integer;");
w("  n integer;");
w("BEGIN");
w("  SELECT id INTO m_id FROM vr_measures");
w("   WHERE measure_type = 'bill' AND congress = 119 AND chamber = 'house' AND number = 'H.R. 7148' LIMIT 1;");
w("  IF m_id IS NULL THEN");
w("    RAISE EXCEPTION 'Verification: H.R. 7148 (119th house) is missing after the pass.';");
w("  END IF;");
w();
w("  SELECT count(*) INTO n FROM vr_measure_issues WHERE measure_id = m_id;");
const hr7148rows = issuesFor(measures[0]).issues.length;
w(`  IF n < ${hr7148rows} THEN`);
w(`    RAISE EXCEPTION 'Verification: H.R. 7148 carries % issue mappings, expected at least ${hr7148rows}.', n;`);
w("  END IF;");
w();
w("  SELECT id INTO rc_id FROM vr_rollcalls");
w(`   WHERE chamber = ${q(v0.chamber)} AND congress = ${v0.congress} AND session = ${v0.session} AND roll_number = ${v0.rollNumber} LIMIT 1;`);
w("  IF rc_id IS NULL THEN");
w(`    RAISE EXCEPTION 'Verification: ${v0.chamber} ${v0.congress}/${v0.session} roll ${v0.rollNumber} is missing after the pass.';`);
w("  END IF;");
w("  IF (SELECT measure_id FROM vr_rollcalls WHERE id = rc_id) IS DISTINCT FROM m_id THEN");
w(`    RAISE EXCEPTION 'Verification: roll ${v0.rollNumber} is attached to the wrong measure.';`);
w("  END IF;");
w();
w("  SELECT count(*) INTO n FROM vr_member_votes WHERE rollcall_id = rc_id;");
w(`  IF n <> ${v0.memberVotes.length} THEN`);
w(`    RAISE EXCEPTION 'Verification: roll ${v0.rollNumber} carries % member votes, expected ${v0.memberVotes.length}.', n;`);
w("  END IF;");
w();
w("  -- Orphan check, scoped to the one roll this pass created.");
w("  SELECT count(*) INTO n FROM vr_member_votes mv");
w("   WHERE mv.rollcall_id = rc_id");
w("     AND NOT EXISTS (SELECT 1 FROM politicians p WHERE p.id = mv.politician_id);");
w("  IF n > 0 THEN");
w(`    RAISE EXCEPTION 'Verification: % member votes on roll ${v0.rollNumber} point at no politician row.', n;`);
w("  END IF;");
w();
w("  -- The two axes this pass adds to the already-live H.R. 8595 must land on the 119th");
w("  -- Congress bill and not on a same-numbered measure from another Congress.");
w("  SELECT id INTO m_id FROM vr_measures");
w("   WHERE measure_type = 'bill' AND congress = 119 AND chamber = 'house' AND number = 'H.R. 8595' LIMIT 1;");
w("  IF m_id IS NULL THEN");
w("    RAISE EXCEPTION 'Verification: H.R. 8595 (119th house) is missing after the pass.';");
w("  END IF;");
w("  SELECT count(*) INTO n FROM vr_measure_issues");
w("   WHERE measure_id = m_id AND issue_key IN ('israel_support', 'pro_life');");
w("  IF n <> 2 THEN");
w("    RAISE EXCEPTION 'Verification: H.R. 8595 carries % of the 2 new axes.', n;");
w("  END IF;");
w("END $$;");

process.stdout.write(out.join("\n") + "\n");
