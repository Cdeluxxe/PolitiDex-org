#!/usr/bin/env node
// ---------------------------------------------------------------------------
// vr-gen-israel-vote-migration.mjs
// ---------------------------------------------------------------------------
// Turns db/vr-israel-vote-seed.json plus the israel_support rows in
// db/vr-issue-seed.json into a forward-only migration. The seed is the mirror; this file
// is the source of truth for what reaches the database.
//
//   node scripts/vr-gen-israel-vote-migration.mjs > netlify/database/migrations/<ts>_vr_israel_support_rollcalls.sql
//
// Shape, and why each part is shaped that way:
//
//   · Measures the seed marks `mustExist` are LOOKED UP and RAISE if missing. They are
//     never find-or-created, because vr_measures carries no unique index on
//     (congress, number): a find-or-create that misses would insert a bare duplicate that
//     shadows the curated row forever, and nothing downstream would notice.
//   · Measures the seed marks `create` are inserted only when absent, so a re-run is a
//     no-op, and their parent_id is backfilled only when it is still null — this pass
//     never overwrites a parent somebody else set.
//   · Roll calls and member votes are ON CONFLICT DO NOTHING on the tuples the table is
//     itself unique on, so the whole migration is idempotent. H.Amdt. 235's roll and its
//     38 votes are already live and every write for them lands as a no-op; it is emitted
//     anyway so the seed and the migration agree, which scripts/test-vr-vote-seed.mjs
//     checks and which keeps the coverage report from listing the roll as pending forever.
//   · Issue rows are emitted for every mapped measure including the already-live one,
//     again ON CONFLICT DO NOTHING, because H.Amdt. 235's new israel_support row is a
//     large part of the point.
//   · A closing read-only block re-counts what landed and fails the deploy if a roll is
//     missing or a member vote carries a politician_id from outside this ingest's roster.
//     It is scoped to exactly this pass's sixteen roll calls by tuple. An earlier
//     generator scoped its equivalent check to "all 117th/118th rolls" and tripped on
//     another pass's correctly-ingested votes from a wider roster — a check that fails on
//     somebody else's correct data is not fail-closed, it is a false alarm.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { assertSeedPidsMatchMap } from "./vr-seed-pid-guard.mjs";
const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const SEED_PATH = "db/vr-israel-vote-seed.json";
const seed = JSON.parse(fs.readFileSync(path.join(ROOT, SEED_PATH), "utf8"));
const issueSeed = JSON.parse(fs.readFileSync(path.join(ROOT, "db/vr-issue-seed.json"), "utf8"));
const memberMap = JSON.parse(fs.readFileSync(path.join(ROOT, "db/vr-member-map.json"), "utf8"));

// The seed's politician_id is a cached map lookup, not a source. Refuse to generate
// from a seed whose (bioguideId → politicianId) pairs the current map contradicts —
// see scripts/vr-seed-pid-guard.mjs for why this refuses instead of re-resolving.
const pidCheck = assertSeedPidsMatchMap(seed, memberMap, SEED_PATH);

const q = (s) => "'" + String(s == null ? "" : s).replace(/'/g, "''") + "'";
const qOrNull = (s) => (s == null || s === "" ? "NULL" : q(s));
const num = (n) => n.toLocaleString("en-US");
const varName = (m) => `m_${m.congress}_${String(m.number).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
const ikey = (congress, chamber, number) =>
  `${congress}|${chamber}|${String(number || "").toLowerCase().replace(/[.\s]/g, "")}`;

const issueIndex = new Map((issueSeed.measures || []).map((m) => [ikey(m.congress, m.chamber, m.number), m]));
const issuesFor = (m) => {
  const e = issueIndex.get(ikey(m.congress, m.chamber, m.number));
  return e ? { issues: e.issues || [], sourceUrl: e.sourceUrl || null } : { issues: [], sourceUrl: null };
};

// Every measure this migration touches, parents first so a child's parent_id resolves.
const parents = (seed.parents || []).map((p) => ({ ...p, var: `p_${p.congress}_${String(p.number).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`, isParent: true }));
const parentVar = new Map(parents.map((p) => [p.id, p.var]));

const measures = [];
const seenMeasure = new Set();
for (const v of seed.votes) {
  const k = ikey(v.measure.congress, v.measure.chamber, v.measure.number);
  if (seenMeasure.has(k)) continue;
  seenMeasure.add(k);
  measures.push({ ...v.measure, var: varName(v.measure) });
}

const out = [];
const w = (s = "") => out.push(s);

const rollTuples = seed.votes.map((v) => `('${v.chamber}'::text, ${v.congress}::integer, ${v.session}::integer, ${v.rollNumber}::integer)`);
const slugs = [...new Set(seed.votes.flatMap((v) => v.memberVotes.map((mv) => mv.politicianId)))].sort();

// ── header ──────────────────────────────────────────────────────────────────
w("-- ---------------------------------------------------------------------------");
w("-- Support for Israel — the issue vertical's roll-call record, 117th-119th Congress");
w("-- ---------------------------------------------------------------------------");
w("-- Generated by scripts/vr-gen-israel-vote-migration.mjs from db/vr-israel-vote-seed.json.");
w("-- Do not hand-edit: regenerate, or roll forward with a new migration.");
w("--");
w(`-- ${num(seed.votes.length)} roll calls · ${num(seed.memberVoteCount)} attributed member votes · ${num(measures.length)} measures`);
w("--");
w("-- The issue key israel_support was added because U.S. support for Israel was being scored");
w("-- through four general-posture chips that none of the underlying statements or votes were");
w("-- actually about. The chip has no votes behind it until this migration lands, and a chip");
w("-- with no votes ranks nobody, so this is the record that makes it scoreable.");
w("--");
w("-- Direction is coded against the chip's own sentence — 'Keep backing Israel with U.S.");
w("-- security aid, weapons and sanctions on its adversaries'. Seven measures are yea_supports");
w("-- (the supplementals, the Jerusalem embassy limitation, the delivery mandate) and nine are");
w("-- yea_opposes (the Arms Export Control Act disapproval resolutions and the Massie defund");
w("-- amendment). Both directions are cross-party, which is why the key carries no `lean`.");
w("--");
w("-- Two non-passage question forms appear here and nowhere else in the ingest:");
w("--   · 'On Agreeing to the Amendment' — an amendment has no passage vote, so agreeing to it");
w("--     is its disposition. 28 amendment roll calls already sit on this footing.");
w("--   · 'On the Motion to Discharge' — under the Arms Export Control Act's expedited");
w("--     procedure a disapproval resolution the Foreign Relations Committee has not reported");
w("--     reaches the floor only by discharge, and none has ever carried. The discharge vote is");
w("--     the entire Senate record on the arms sale, not a step toward a later vote.");
w("-- scripts/test-vr-vote-seed.mjs gates each form on the measure's shape and requires the");
w("-- seed to carry a written decisiveWhy, so neither widens into a loophole.");
w("--");
w("-- Slicing: H.R. 8034 carries the Israel reading of the 2024 supplemental, not H.R. 815.");
w("-- The enacted package (P.L. 118-50) bundled Israel with Ukraine, the Indo-Pacific, TikTok");
w("-- divest-or-ban and fentanyl sanctions; the House voted its divisions separately, and this");
w("-- is the one that asked about Israel alone (366-58). H.R. 815 keeps its five existing keys");
w("-- and gains no israel_support row, exactly as H.R. 8035 already carries the Ukraine side.");
w("--");
w("-- Attribution is fail-closed. House rolls resolve by the bioguide id in the Clerk's XML;");
w("-- Senate rolls carry no bioguide, so senators resolve by (last name, state) against");
w("-- db/vr-member-map.json and only on a unique hit. Unrecognised or ambiguous members are");
w("-- skipped and counted, never guessed. totals is the FULL chamber tally and is_party is");
w("-- computed from the full recorded vote before the roster filter, so a 63-member roster");
w("-- cannot invent a margin or a party crossover.");
w("--");
w("-- Idempotent: every write is guarded. H.Amdt. 235's measure, roll call and 38 member votes");
w("-- are already live and land as no-ops; only its new israel_support mapping is a real write.");
w("-- ---------------------------------------------------------------------------");
w();
w("DO $$");
w("DECLARE");
for (const p of parents) w(`  ${p.var} integer;`);
for (const m of measures) w(`  ${m.var} integer;`);
w("  rc integer;");
w("BEGIN");
w();

// ── parents ─────────────────────────────────────────────────────────────────
w("  -- ── vehicles ──────────────────────────────────────────────────────────────");
for (const p of parents) {
  w(`  -- ${p.number} (${p.congress}th): ${p.mustExist ? "expected live — " + p.mustExist : "created here as a vehicle only"}`);
  w(`  SELECT id INTO ${p.var} FROM vr_measures`);
  w(`   WHERE congress = ${p.congress} AND chamber = ${q(p.chamber)} AND number = ${q(p.number)} LIMIT 1;`);
  if (p.mustExist) {
    w(`  IF ${p.var} IS NULL THEN`);
    w(`    RAISE EXCEPTION ${q(`Support for Israel: ${p.number} (${p.congress}th) is not in vr_measures. It is expected live (${p.mustExist}); refusing to create a duplicate because vr_measures has no unique index on (congress, number).`)};`);
    w("  END IF;");
  } else {
    const c = p.create;
    w(`  IF ${p.var} IS NULL THEN`);
    w("    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids)");
    w(`    VALUES (${q(p.measureType)}, ${p.congress}, ${q(p.chamber)}, ${q(p.number)}, ${q(c.title)}, ${qOrNull(c.shortTitle)},`);
    w(`      ${q(c.summary)},`);
    w(`      ${c.introducedAt ? `DATE ${q(c.introducedAt)}` : "NULL"}, ${q(c.status)}, ${q(c.sourceUrl)}, ${q(c.sourceLabel)}, ${q(JSON.stringify(c.externalIds))}::jsonb)`);
    w(`    RETURNING id INTO ${p.var};`);
    w("  END IF;");
  }
  w();
}

// ── measures ────────────────────────────────────────────────────────────────
w("  -- ── measures ──────────────────────────────────────────────────────────────");
for (const m of measures) {
  const pv = m.parent ? parentVar.get(m.parent) : null;
  w(`  -- ${m.number} (${m.congress}th ${m.chamber})${m.title ? " — " + m.title : ""}`);
  w(`  SELECT id INTO ${m.var} FROM vr_measures`);
  w(`   WHERE congress = ${m.congress} AND chamber = ${q(m.chamber)} AND number = ${q(m.number)} LIMIT 1;`);
  if (m.mustExist) {
    w(`  IF ${m.var} IS NULL THEN`);
    w(`    RAISE EXCEPTION ${q(`Support for Israel: ${m.number} (${m.congress}th) is not in vr_measures. It is expected live (${m.mustExist}); refusing to create a duplicate.`)};`);
    w("  END IF;");
    if (pv) {
      w(`  UPDATE vr_measures SET parent_id = ${pv}, updated_at = now()`);
      w(`   WHERE id = ${m.var} AND parent_id IS NULL;`);
    }
  } else {
    const c = m.create;
    w(`  IF ${m.var} IS NULL THEN`);
    w(`    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary,${pv ? " parent_id," : ""} introduced_at, status, source_url, source_label, external_ids)`);
    w(`    VALUES (${q(m.measureType)}, ${m.congress}, ${q(m.chamber)}, ${q(m.number)}, ${q(c.title)}, ${qOrNull(c.shortTitle)},`);
    w(`      ${q(c.summary)},`);
    w(`      ${pv ? pv + ", " : ""}${c.introducedAt ? `DATE ${q(c.introducedAt)}` : "NULL"}, ${q(c.status)}, ${q(c.sourceUrl)}, ${q(c.sourceLabel)}, ${q(JSON.stringify(c.externalIds))}::jsonb)`);
    w(`    RETURNING id INTO ${m.var};`);
    if (pv) {
      w(`  ELSIF ${pv} IS NOT NULL THEN`);
      w(`    UPDATE vr_measures SET parent_id = ${pv}, updated_at = now()`);
      w(`     WHERE id = ${m.var} AND parent_id IS NULL;`);
    }
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
  w(`  --   ${v.memberVotes.length} of ${v.chamberVoting} voting members are on the roster; ${v.rosterSkipped} skipped as unmapped`);
  if (v.admittedAs !== "decisive") {
    // Wrapped rather than truncated: the justification is the reason this roll is here at
    // all, so a reader of the migration gets all of it or the comment is theatre.
    const words = `admitted under the ${v.admittedAs} exception — ${v.decisiveWhy.replace(/\s+/g, " ")}`.split(" ");
    let line = "";
    for (const word of words) {
      if (line && (line + " " + word).length > 84) { w(`  --   ${line}`); line = word; }
      else line = line ? line + " " + word : word;
    }
    if (line) w(`  --   ${line}`);
  }
  w("  INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)");
  w(`  VALUES (${mv}, ${q(v.chamber)}, ${v.congress}, ${v.session}, ${v.rollNumber}, TIMESTAMPTZ ${q(v.voteDate)}, ${q(v.question)}, ${q(v.actionType)}, ${q(v.result)}, ${q(v.requiredMajority)},`);
  w(`    ${q(JSON.stringify({ yea: v.totals.yea, nay: v.totals.nay, present: v.totals.present, notVoting: v.totals.notVoting, byParty: v.partyTotals }))}::jsonb, ${q(v.sourceUrl)}, ${q(v.sourceLabel)})`);
  w("  ON CONFLICT (chamber, congress, session, roll_number) DO NOTHING;");
  w("  SELECT id INTO rc FROM vr_rollcalls");
  w(`   WHERE chamber = ${q(v.chamber)} AND congress = ${v.congress} AND session = ${v.session} AND roll_number = ${v.rollNumber} LIMIT 1;`);
  w("  IF rc IS NULL THEN");
  w(`    RAISE EXCEPTION ${q(`Support for Israel: ${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber} could not be read back after insert.`)};`);
  w("  END IF;");
  w("  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES");
  w(v.memberVotes.map((x) => `    (rc, ${q(x.politicianId)}, ${q(x.position)}, ${qOrNull(x.isParty)})`).join(",\n"));
  w("  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;");
  w();
}

// ── issue mappings ──────────────────────────────────────────────────────────
w("  -- ── issue mappings ────────────────────────────────────────────────────────");
w("  -- Curated in db/vr-issue-seed.json. H.Amdt. 235 keeps its existing america_first_fp and");
w("  -- cut_spending rows untouched and gains only israel_support.");
let mappedRows = 0;
for (const m of measures) {
  const { issues, sourceUrl } = issuesFor(m);
  if (!issues.length) {
    w(`  -- ${m.number}: no issue mapping in this pass${m.isParent ? "" : ""}`);
    w();
    continue;
  }
  w(`  -- ${m.number} (${m.congress}th)`);
  w("  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES");
  w(issues.map((i) => {
    mappedRows++;
    return `    (${m.var}, ${q(i.issueKey)}, ${i.weight}, ${i.isPrimary ? "true" : "false"}, ${q(i.supportMeaning)},\n      ${q(i.rationale)},\n      ${qOrNull(i.sourceUrl || sourceUrl)})`;
  }).join(",\n"));
  w("  ON CONFLICT (measure_id, issue_key) DO NOTHING;");
  w();
}
for (const p of parents) {
  const { issues } = issuesFor(p);
  if (!issues.length) w(`  -- ${p.number}: vehicle only, deliberately unmapped in this pass`);
}
w();
w("END $$;");
w();

// ── verification ────────────────────────────────────────────────────────────
w("-- ---------------------------------------------------------------------------");
w("-- Verification. Read-only, scoped to exactly this pass's roll calls by tuple, so it can");
w("-- only ever fail on data this migration is responsible for.");
w("-- ---------------------------------------------------------------------------");
w("DO $$");
w("DECLARE");
w("  n_rolls integer;");
w("  n_votes integer;");
w("  n_orphan integer;");
w("  n_issues integer;");
w("BEGIN");
w("  WITH want (chamber, congress, session, roll_number) AS (VALUES");
w("    " + rollTuples.join(",\n    "));
w("  ), roll_ids AS (");
w("    SELECT r.id FROM vr_rollcalls r JOIN want w");
w("      ON r.chamber = w.chamber AND r.congress = w.congress");
w("     AND r.session = w.session AND r.roll_number = w.roll_number");
w("  )");
w("  SELECT (SELECT count(*) FROM roll_ids),");
w("         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM roll_ids)),");
w("         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM roll_ids)");
w("            AND v.politician_id NOT IN (");
w("              " + slugs.map((s) => q(s)).join(", "));
w("            ))");
w("    INTO n_rolls, n_votes, n_orphan;");
w();
w("  SELECT count(*) INTO n_issues FROM vr_measure_issues WHERE issue_key = 'israel_support';");
w();
w(`  RAISE NOTICE 'Support for Israel: % roll calls, % member votes, % israel_support mappings', n_rolls, n_votes, n_issues;`);
w();
w(`  IF n_rolls <> ${seed.votes.length} THEN`);
w(`    RAISE EXCEPTION 'Support for Israel: expected ${seed.votes.length} roll calls, found %', n_rolls;`);
w("  END IF;");
w(`  IF n_votes < ${seed.memberVoteCount} THEN`);
w(`    RAISE EXCEPTION 'Support for Israel: expected at least ${seed.memberVoteCount} member votes on these roll calls, found %', n_votes;`);
w("  END IF;");
w("  IF n_orphan > 0 THEN");
w("    RAISE EXCEPTION 'Support for Israel: % member vote(s) on these roll calls carry a politician_id outside the ingest roster', n_orphan;");
w("  END IF;");
w(`  IF n_issues < ${seed.votes.length} THEN`);
w(`    RAISE EXCEPTION 'Support for Israel: expected at least ${seed.votes.length} israel_support mappings, found %', n_issues;`);
w("  END IF;");
w("END $$;");

process.stdout.write(out.join("\n") + "\n");
process.stderr.write(`${seed.votes.length} rolls · ${seed.memberVoteCount} member votes · ${measures.length} measures · ${mappedRows} issue rows · ${slugs.length} distinct slugs · ${pidCheck.checked} bioguide→pid pairs agree with the member map\n`);
