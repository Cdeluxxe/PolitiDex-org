// ─────────────────────────────────────────────────────────────────────────────
// vr-gen-house-migration.mjs — deploy-time migration for a curated House seed
// ─────────────────────────────────────────────────────────────────────────────
// The House twin of scripts/vr-gen-senate-migration.mjs. It reads a curated House
// seed (default db/vr-house-seed-119-s2.json) plus the curated issue map (db/vr-issue-
// seed.json) and prints an idempotent SQL migration to stdout:
//
//   node scripts/vr-gen-house-migration.mjs > \
//     netlify/database/migrations/20260724140000_seed_house_119_s2_voting_record.sql
//
// A seed path may be passed as argv[2] — there is more than one House seed, because
// measures outside the recent window (which only ever existed thanks to an ad-hoc live
// ingest) need seeding too:
//
//   node scripts/vr-gen-house-migration.mjs db/vr-house-seed-119-s2-earlier.json > \
//     netlify/database/migrations/20260724150000_seed_house_119_s2_earlier_measures.sql
//
// WHY a migration when the House already has a live Congress.gov ingest path? Two
// reasons, neither of which replaces that path:
//   1. Determinism — the seeded window is present the moment a branch database is
//      provisioned, with no operator token or manual POST /api/vr-ingest needed.
//   2. Ordering — applyCuratedIssueSeed() only attaches an issue mapping to a
//      measure that ALREADY exists, so the measures have to land first for the new
//      db/vr-issue-seed.json entries to take effect on deploy.
// The runtime ingest still re-fetches and upserts the same rolls; because every
// insert here is find-or-create / ON CONFLICT DO NOTHING, the two never fight.
//
// Every roll call, position, and total in the seed traces to an api.congress.gov
// source_url recorded on the row — nothing is invented. Member votes are already
// filtered to the db/vr-member-map.json roster in the seed (unmapped bioguide IDs
// are skipped, never guessed), and `is_party` was computed from the FULL chamber
// tally at pull time — see the seed's _comment.
//
// Additive + re-runnable: measures are find-or-create by natural key, roll calls
// use ON CONFLICT (chamber,congress,session,roll_number) DO NOTHING, member votes
// ON CONFLICT (rollcall_id,politician_id) DO NOTHING, and issue mappings
// ON CONFLICT (measure_id,issue_key) DO NOTHING — so it never clobbers a curated
// row and re-applying it is a no-op. Changes NO schema. Two generated migrations
// may therefore overlap without fighting: whichever applies first wins the row.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { assertSeedPidsMatchMap } from "./vr-seed-pid-guard.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SEED_PATH = process.argv[2] || "db/vr-house-seed-119-s2.json";
const seed = JSON.parse(readFileSync(resolve(REPO, SEED_PATH), "utf8"));
const issueSeed = JSON.parse(readFileSync(resolve(REPO, "db/vr-issue-seed.json"), "utf8"));
const memberMap = JSON.parse(readFileSync(resolve(REPO, "db/vr-member-map.json"), "utf8"));

// The seed's politician_id is a cached map lookup, not a source. Refuse to generate
// from a seed whose (bioguideId → politicianId) pairs the current map contradicts —
// see scripts/vr-seed-pid-guard.mjs for why this refuses instead of re-resolving.
const pidCheck = assertSeedPidsMatchMap(seed, memberMap, SEED_PATH);

// SQL string literal (single-quote escaped).
const q = (s) => "'" + String(s == null ? "" : s).replace(/'/g, "''") + "'";
const qOrNull = (s) => (s == null ? "NULL" : q(s));

// Match a seed measure to its curated issue-seed entry — same natural key
// applyCuratedIssueSeed() uses, so runtime and deploy-time agree on the mapping.
function issuesFor(measure) {
  const entry = (issueSeed.measures || []).find(
    (e) => e.measureType === measure.measureType && e.congress === measure.congress &&
      e.chamber === measure.chamber && e.number === measure.number
  );
  return entry ? entry.issues || [] : [];
}

// Measure status from the vote that produced it. A House-only vote can never say
// more than "passed the House"; amendments and resolutions that were not agreed to
// are "failed". Deliberately conservative — no measure is claimed as enacted here.
function statusFor(m, v) {
  const ok = v.result === "passed" || v.result === "agreed_to";
  if (v.actionType === "passage" || v.actionType === "amendment") return ok ? "passed_house" : "failed";
  return "pending"; // a procedural/motion vote alone says nothing about the measure
}

// Stable SQL identifier per measure, e.g. "H.Amdt. 256" → m_h_amdt_256.
const varName = (m) => "m_" + String(m.number).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const votes = (seed.votes || []).slice().sort((a, b) => a.rollNumber - b.rollNumber);

// One entry per measure, remembering the most decisive vote seen for it so that
// status reflects passage rather than whichever roll call happened to come first.
const measures = [];
const byVar = new Map();
for (const v of votes) {
  const key = varName(v.measure);
  const rank = (x) => (x.actionType === "passage" ? 3 : x.actionType === "amendment" ? 2 : 1);
  if (!byVar.has(key)) {
    const rec = { m: v.measure, v, var: key };
    byVar.set(key, rec);
    measures.push(rec);
  } else {
    const rec = byVar.get(key);
    if (rank(v) > rank(rec.v)) rec.v = v;
  }
}

const w = seed.window || {};
const L = [];
L.push("-- ─────────────────────────────────────────────────────────────────────────────");
L.push("-- Voting Record — House 119th Congress, 2nd session seed (data-only)");
L.push("-- ─────────────────────────────────────────────────────────────────────────────");
L.push(`-- GENERATED by scripts/vr-gen-house-migration.mjs from ${SEED_PATH}`);
L.push("-- — do not hand-edit; regenerate from the seed.");
L.push("--");
L.push(`-- Window: roll calls ${w.firstRoll}-${w.lastRoll} (${String(w.firstDate).slice(0, 10)} → ${String(w.lastDate).slice(0, 10)}),`);
L.push(`-- ${votes.length} roll calls across ${measures.length} measures. Pulled from the Congress.gov API`);
L.push("-- through the fixed normalizer (netlify/lib/vr-normalize.ts), so action_type, vote");
L.push("-- question, amendment identity and measure type are correct at the source: motions to");
L.push("-- recommit are 'motion', previous-question votes are 'procedural', each H.Amdt. is its");
L.push("-- own measure, and H.Con.Res./H.Res. are typed 'resolution' rather than 'bill'.");
L.push("--");
L.push("-- Every roll call carries its api.congress.gov source_url; no vote is invented.");
L.push("-- Member votes are limited to the db/vr-member-map.json roster — unmapped bioguide");
L.push("-- IDs are skipped, never guessed — and is_party comes from the full chamber tally.");
L.push("--");
L.push("-- Changes NO schema. Additive + idempotent: find-or-create measures, ON CONFLICT DO");
L.push("-- NOTHING everywhere else. Rolls forward; edits no prior migration. Safe to re-run,");
L.push("-- and safe alongside the runtime ingest, which upserts the same rolls.");
L.push("DO $$");
L.push("DECLARE");
for (const mm of measures) L.push(`  ${mm.var} integer;`);
L.push("  rc integer;");
L.push("BEGIN");

// ── Measures: find-or-create by natural key ──────────────────────────────────
for (const mm of measures) {
  const m = mm.m;
  const chamberCond = m.chamber ? `chamber = ${q(m.chamber)}` : "chamber IS NULL";
  const numCond = m.number ? `number = ${q(m.number)}` : "number IS NULL";
  L.push("");
  L.push(`  -- ${m.number} — ${m.title}`);
  L.push(`  SELECT id INTO ${mm.var} FROM vr_measures WHERE measure_type = ${q(m.measureType)} AND congress = ${m.congress} AND ${chamberCond} AND ${numCond} LIMIT 1;`);
  L.push(`  IF ${mm.var} IS NULL THEN`);
  L.push(`    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, source_url, source_label, status)`);
  L.push(`    VALUES (${q(m.measureType)}, ${m.congress}, ${qOrNull(m.chamber)}, ${qOrNull(m.number)}, ${q(m.title)}, ${q(m.sourceUrl)}, ${q(m.sourceLabel || "Congress.gov")}, ${q(statusFor(m, mm.v))})`);
  L.push(`    RETURNING id INTO ${mm.var};`);
  L.push(`  END IF;`);
}

// ── Roll calls + member votes ────────────────────────────────────────────────
for (const v of votes) {
  const mv = varName(v.measure);
  const totals = JSON.stringify(v.totals || {});
  L.push("");
  L.push(`  -- House roll call ${v.session}/${v.rollNumber} — ${v.measure.number} · ${v.question} (${v.result})`);
  L.push(`  INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)`);
  L.push(`  VALUES (${mv}, 'house', ${v.congress}, ${v.session}, ${v.rollNumber}, TIMESTAMPTZ ${q(v.voteDate)}, ${qOrNull(v.question)}, ${q(v.actionType)}, ${qOrNull(v.result)}, ${q(v.requiredMajority || "simple")}, ${q(totals)}::jsonb, ${q(v.sourceUrl)}, ${q(v.sourceLabel || "U.S. House Clerk")})`);
  L.push(`  ON CONFLICT (chamber, congress, session, roll_number) DO NOTHING;`);
  L.push(`  SELECT id INTO rc FROM vr_rollcalls WHERE chamber = 'house' AND congress = ${v.congress} AND session = ${v.session} AND roll_number = ${v.rollNumber} LIMIT 1;`);
  const rows = (v.memberVotes || []).map(
    (r) => `    (rc, ${q(r.politicianId)}, ${q(r.position)}, ${r.isParty ? q(r.isParty) : "NULL"})`
  );
  if (rows.length) {
    L.push(`  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES`);
    L.push(rows.join(",\n"));
    L.push(`  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;`);
  }
}

// ── Curated measure→issue mappings (additive; existing rows untouched) ───────
L.push("");
L.push("  -- Curated measure→issue mappings from db/vr-issue-seed.json. Only measures whose");
L.push("  -- primary subject genuinely sits in the ISSUE_MAP vocabulary are mapped; rule");
L.push("  -- resolutions and near-unanimous votes are deliberately left unmapped.");
let issueRows = 0;
for (const mm of measures) {
  for (const iss of issuesFor(mm.m)) {
    const support = iss.supportMeaning === "yea_opposes" ? "yea_opposes" : "yea_supports";
    issueRows++;
    L.push("");
    L.push(`  -- ${mm.m.number} → ${iss.issueKey}${iss.isPrimary ? " (primary)" : ""}, ${support}`);
    L.push(`  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)`);
    L.push(`  VALUES (${mm.var}, ${q(iss.issueKey)}, ${iss.weight ?? 100}, ${!!iss.isPrimary}, ${q(support)}, ${q(iss.rationale || "")}, ${qOrNull(iss.sourceUrl || mm.m.sourceUrl)})`);
    L.push(`  ON CONFLICT (measure_id, issue_key) DO NOTHING;`);
  }
}

L.push("END $$;");
L.push("");
process.stderr.write(
  `measures ${measures.length}, roll calls ${votes.length}, ` +
  `member votes ${votes.reduce((n, v) => n + (v.memberVotes || []).length, 0)}, issue rows ${issueRows}\n` +
  `${pidCheck.checked} bioguide→politician_id pair(s) agree with db/vr-member-map.json\n`
);
process.stdout.write(L.join("\n"));
