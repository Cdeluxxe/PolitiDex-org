#!/usr/bin/env node
// ---------------------------------------------------------------------------
// vr-gen-phase-a-vote-migration.mjs — deploy-time migration for the Phase A rolls
// ---------------------------------------------------------------------------
// Reads db/vr-phase-a-vote-seed.json (built by scripts/vr-build-phase-a-vote-seed.mjs
// from clerk.house.gov and senate.gov XML) plus db/vr-issue-seed.json, and prints an
// idempotent SQL migration to stdout:
//
//   node scripts/vr-gen-phase-a-vote-migration.mjs > \
//     netlify/database/migrations/20260811000000_vr_phase_a_117_118_rollcalls.sql
//
// Why a migration and not the runtime ingest: applyCuratedIssueSeed() attaches issue
// rows to measures that already exist and never creates one, and the runtime ingest
// pulls from the Congress.gov API, which has no 117th/118th backfill path here (403
// from this environment) and no Senate roll-call resource at all. A migration is the
// only way these rolls are present the moment a branch database is provisioned.
//
// FAIL CLOSED ON THE MEASURES. The 15 Phase A measures must already exist from
// 20260810000000_vr_phase_a_117_118_landmarks.sql. This migration looks each one up
// and RAISEs if it is missing rather than find-or-creating it: a bare auto-created row
// would carry none of Phase A's curated title, summary, public-law number or external
// ids, and would then shadow the real one forever because vr_measures has no unique
// index on (congress, number). Better to stop loudly than to fork a measure.
//
// FAIL CLOSED ON ATTRIBUTION. Member votes come from the seed already filtered to
// db/vr-member-map.json — unmapped bioguide ids are dropped at build time and counted,
// never guessed — so there is no name matching in the SQL at all.
//
// Additive and re-runnable: roll calls ON CONFLICT (chamber, congress, session,
// roll_number) DO NOTHING, member votes ON CONFLICT (rollcall_id, politician_id) DO
// NOTHING, issue rows ON CONFLICT (measure_id, issue_key) DO NOTHING. Nothing is
// updated or deleted, so re-running it — or running it alongside the runtime ingest —
// cannot clobber a curated row.
// ---------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { assertSeedPidsMatchMap } from "./vr-seed-pid-guard.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SEED_PATH = "db/vr-phase-a-vote-seed.json";
const seed = JSON.parse(readFileSync(resolve(REPO, SEED_PATH), "utf8"));
const issueSeed = JSON.parse(readFileSync(resolve(REPO, "db/vr-issue-seed.json"), "utf8"));
const memberMap = JSON.parse(readFileSync(resolve(REPO, "db/vr-member-map.json"), "utf8"));

// The seed's politician_id is a cached map lookup, not a source. Refuse to generate
// from a seed whose (bioguideId → politicianId) pairs the current map contradicts —
// see scripts/vr-seed-pid-guard.mjs for why this refuses instead of re-resolving.
const pidCheck = assertSeedPidsMatchMap(seed, memberMap, SEED_PATH);

const q = (s) => "'" + String(s == null ? "" : s).replace(/'/g, "''") + "'";
const qOrNull = (s) => (s == null ? "NULL" : q(s));
const num = (n) => n.toLocaleString("en-US");

// Congress is in the variable name because vr_measures has no unique index on
// (congress, number) and a bare number could collide across Congresses.
const varName = (m) => `m_${m.congress}_${m.number.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;

function issuesFor(m) {
  const e = (issueSeed.measures || []).find(
    (x) => x.measureType === m.measureType && x.congress === m.congress &&
      x.chamber === m.chamber && x.number === m.number
  );
  return e ? { issues: e.issues || [], sourceUrl: e.sourceUrl } : { issues: [], sourceUrl: null };
}

const votes = (seed.votes || []).slice();

// One record per measure, remembering whether it needs creating (a division bill the
// Phase A migration never made) or only looking up.
const measures = [];
const byVar = new Map();
for (const v of votes) {
  const key = varName(v.measure);
  if (byVar.has(key)) continue;
  const rec = { var: key, m: v.measure, rolls: [] };
  byVar.set(key, rec);
  measures.push(rec);
}
for (const v of votes) byVar.get(varName(v.measure)).rolls.push(v);

const parents = [...new Set(measures.filter((r) => r.m.parentNumber).map((r) => `${r.m.parentCongress}|${r.m.parentNumber}|${r.m.parentChamber}`))]
  .map((s) => { const [congress, number, chamber] = s.split("|"); return { congress: +congress, number, chamber, var: `p_${congress}_${number.toLowerCase().replace(/[^a-z0-9]+/g, "_")}` }; });

const phaseA = measures.filter((r) => r.m.phaseA);
const created = measures.filter((r) => !r.m.phaseA);
const mvTotal = votes.reduce((n, v) => n + v.memberVotes.length, 0);
const houseRolls = votes.filter((v) => v.chamber === "house").length;
const senateRolls = votes.filter((v) => v.chamber === "senate").length;

const L = [];
const P = (s = "") => L.push(s);

// ── Header ──────────────────────────────────────────────────────────────────
P("-- ─────────────────────────────────────────────────────────────────────────────");
P("-- Voting Record — 117th/118th roll calls for the Phase A landmarks (data-only)");
P("-- ─────────────────────────────────────────────────────────────────────────────");
P("-- GENERATED by scripts/vr-gen-phase-a-vote-migration.mjs from");
P("-- db/vr-phase-a-vote-seed.json and db/vr-issue-seed.json — do not hand-edit;");
P("-- regenerate from the seeds.");
P("--");
P("-- WHY THIS MIGRATION EXISTS");
P("-- Migration 20260810000000 created 15 enacted landmarks from the 117th and 118th");
P("-- Congresses and gave them 51 curated issue rows. It said plainly, in its own");
P("-- header, that it would move the ranking by exactly zero: an issue mapping is only");
P("-- half of a scoreable record, and the vote tables held no 117th or 118th member");
P("-- votes to pair it with. This migration supplies the other half.");
P("--");
P(`-- ${votes.length} roll calls (${houseRolls} House, ${senateRolls} Senate), ${num(mvTotal)} attributed member votes.`);
P("--");
P("-- HOW THE ROLLS WERE CHOSEN");
P("-- Every <recordedVote> block for all 15 measures was read out of govinfo BILLSTATUS");
P("-- bulk data. That is a much larger set than what is here — the Inflation Reduction");
P("-- Act alone carries 41 Senate roll calls, almost all of them vote-a-rama amendments,");
P("-- and the American Rescue Plan carries 38. From each measure's list, ONE decisive");
P("-- vote per chamber is taken: final passage, or the motion to concur / conference");
P("-- report where that was the chamber's last act on the bill.");
P("--");
P("-- Procedural rolls are deliberately excluded. A cloture motion, a budget-point-of-");
P("-- order waiver and a motion to table are votes about floor process; attaching an");
P("-- issue position to one puts a receipt on a member's profile that the vote does not");
P("-- support. This is the same reason the repo leaves \"providing for consideration\"");
P("-- rule resolutions unmapped (db/vr-ingest-runbook.md, \"Rules are not policy\").");
P("--");
P("-- EVERY ROLL WAS RE-VERIFIED AGAINST THE CHAMBER'S OWN RECORD");
P("-- The build script re-fetched each selected roll from clerk.house.gov/evs (House) or");
P("-- senate.gov/legislative/LIS/roll_call_votes (Senate) and dropped it unless the");
P("-- document's own bill citation matched the measure and its question was a decisive");
P("-- one. That check earned its keep immediately: Phase A had recorded House roll");
P("-- 120/2024 for H.R. 7888, and the Clerk's record shows roll 120 is \"Table Motion to");
P("-- Reconsider\" — the passage vote is roll 119, 273-147. Roll 119 is what is ingested");
P("-- here. Reading the source caught it; trusting the earlier note would not have.");
P("--");
P("-- ATTRIBUTION IS FAIL-CLOSED");
P("-- The House XML carries a bioguide id per legislator, so the House side is a direct");
P("-- db/vr-member-map.json lookup. The Senate XML carries no bioguide id, so senators");
P("-- are resolved by (last name, state) against the roster and accepted only on a");
P("-- UNIQUE hit. Every roll in the seed resolved with zero ambiguities and zero");
P("-- unreadable positions. Unmapped members are dropped at build time, so there is no");
P("-- name matching anywhere in this SQL.");
P("--");
P("-- THE ROSTER IS THE CEILING, NOT THE CHAMBER");
P("-- db/vr-member-map.json holds 63 bioguide→slug entries, so a House roll can attribute");
P("-- at most 38 of ~430 votes cast and a Senate roll at most 18 of 100. The per-roll");
P("-- attributed counts below are low for that reason and no other: the totals stored on");
P("-- each roll call are the FULL chamber tallies from the official record, and is_party");
P("-- was computed from the full member list before filtering, so a party-crossover flag");
P("-- is never an artifact of the subset. Widening the roster is a separate pass.");
P("--");
P("-- WHAT REMAINS UNSCOREABLE, AND WHY");
P("-- H.R. 7776 (FY23 NDAA) gets its Senate roll 396 (83-11) but no House roll. The only");
P("-- House vote on that vehicle is roll 253/2022, a suspension vote on the rivers-and-");
P("-- harbors bill that held the number before the NDAA text replaced it; ingesting it");
P("-- would record a defense-authorization position from a water-projects vote.");
P("--");
P("-- H.R. 815 gets its Senate roll 154 (79-18) but the House never voted the package at");
P("-- all. It passed four division bills on 2024-04-20 and H.Res. 1160 folded them into");
P("-- the Senate amendment. Only one of the four divided the chamber, so only one is");
P("-- ingested — see the H.R. 8035 block below.");
P("--");
P("-- Changes NO schema. Additive and idempotent: measures are looked up and RAISE if");
P("-- missing (never find-or-created, so a bare row cannot shadow a curated one), roll");
P("-- calls and member votes and issue rows all ON CONFLICT DO NOTHING. Rolls forward;");
P("-- edits no prior migration. Safe to re-run and safe alongside the runtime ingest.");
P("");

// ── Inventory ───────────────────────────────────────────────────────────────
P("-- INVENTORY — one line per roll call, as verified against the chamber's record");
P("--");
P("--   chamber  c/s  roll   measure      full tally   majority      attributed   question");
for (const v of votes) {
  P(`--   ${v.chamber.padEnd(7)} ${v.congress}/${v.session} ${String(v.rollNumber).padStart(4)}   ` +
    `${v.measure.number.padEnd(12)} ${(v.totals.yea + "-" + v.totals.nay).padEnd(12)} ${v.requiredMajority.padEnd(13)} ` +
    `${String(v.memberVotes.length).padStart(10)}   ${v.question}`);
}
P("--");
P("-- DECLINED ROLLS — read, considered, and left out on purpose");
for (const d of seed.declinedRollCalls || []) {
  P(`--   ${d.number.padEnd(12)} roll ${String(d.roll).padStart(4)}  ${d.totals.padEnd(9)}  ${d.why}`);
}
P("");

// ── The block ───────────────────────────────────────────────────────────────
P("DO $$");
P("DECLARE");
for (const r of measures) P(`  ${r.var} integer;`);
for (const p of parents) P(`  ${p.var} integer;`);
P("  rc integer;");
P("BEGIN");

P("");
P("  -- ── The Phase A measures: look up, never create ───────────────────────────");
for (const r of phaseA) {
  const m = r.m;
  P(`  SELECT id INTO ${r.var} FROM vr_measures WHERE measure_type = ${q(m.measureType)} AND congress = ${m.congress} AND chamber = ${q(m.chamber)} AND number = ${q(m.number)} LIMIT 1;`);
  P(`  IF ${r.var} IS NULL THEN`);
  P(`    RAISE EXCEPTION 'Phase A vote ingest: measure ${m.number} (${m.congress}th) is missing. Run 20260810000000_vr_phase_a_117_118_landmarks.sql first — creating a bare row here would shadow the curated one.';`);
  P(`  END IF;`);
}

for (const r of created) {
  const m = r.m;
  const p = parents.find((x) => x.number === m.parentNumber && x.congress === m.parentCongress);
  P("");
  P(`  -- ── ${m.number} — ${m.title} ──`);
  P("  -- Division B of H.R. 815, voted as a standalone bill. It is created here rather");
  P("  -- than in Phase A because Phase A mapped enacted laws and this text was never");
  P("  -- its own law: H.Res. 1160 folded it into H.R. 815, which became P.L. 118-50.");
  P("  -- It earns a row because it is the only House vote that recorded a position on");
  P("  -- the Ukraine substance, and the only one of the four divisions that divided the");
  P(`  -- chamber — 311-112, with Republicans 101-112 against their own majority. The`);
  P("  -- other three passed 366-58, 385-34 and 360-58, margins that separate nobody.");
  if (p) {
    P(`  SELECT id INTO ${p.var} FROM vr_measures WHERE measure_type = 'bill' AND congress = ${p.congress} AND chamber = ${q(p.chamber)} AND number = ${q(p.number)} LIMIT 1;`);
    P(`  IF ${p.var} IS NULL THEN`);
    P(`    RAISE EXCEPTION 'Phase A vote ingest: parent measure ${p.number} (${p.congress}th) is missing; run the Phase A landmark migration first.';`);
    P(`  END IF;`);
  }
  P(`  SELECT id INTO ${r.var} FROM vr_measures WHERE measure_type = ${q(m.measureType)} AND congress = ${m.congress} AND chamber = ${q(m.chamber)} AND number = ${q(m.number)} LIMIT 1;`);
  P(`  IF ${r.var} IS NULL THEN`);
  P(`    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, parent_id, source_url, source_label, external_ids)`);
  P(`    VALUES (${q(m.measureType)}, ${m.congress}, ${q(m.chamber)}, ${q(m.number)}, ${q(m.title)}, ${q(m.title)},`);
  P(`      ${q("FY2024 emergency supplemental appropriations to respond to the conflict in Ukraine, designated as emergency spending exempt from discretionary limits. Funds the Department of Defense, Department of Energy science programs, the National Nuclear Security Administration, the Administration for Children and Families, the Department of State and USAID, for purposes including current U.S. military operations in the region, the Ukraine Security Assistance Initiative and replacement of defense articles already provided to Ukraine. Passed the House 311-112 on 2024-04-20; never a standalone law, because H.Res. 1160 folded this text into H.R. 815 as Division B (P.L. 118-50).")},`);
  P(`      '2024-04-17', ${q(m.status)}, ${p ? p.var : "NULL"}, ${q(m.sourceUrl)}, ${q(m.sourceLabel)}, '{"congressGovId":"hr8035-118","parentBill":"hr815-118","enactedAs":"P.L. 118-50 division B"}'::jsonb)`);
  P(`    RETURNING id INTO ${r.var};`);
  P(`  ELSIF ${p ? p.var : "NULL"} IS NOT NULL THEN`);
  P(`    -- Only ever fills a NULL parent; never repoints one somebody else set.`);
  P(`    UPDATE vr_measures SET parent_id = ${p ? p.var : "NULL"}, updated_at = now() WHERE id = ${r.var} AND parent_id IS NULL;`);
  P(`  END IF;`);
}

// ── Roll calls + member votes ───────────────────────────────────────────────
P("");
P("  -- ── Roll calls and member votes ───────────────────────────────────────────");
for (const v of votes) {
  const mv = varName(v.measure);
  const totals = JSON.stringify(v.totals || {});
  const party = Object.entries(v.partyTotals || {})
    .map(([p, t]) => `${p} ${t.yea}-${t.nay}`).join(", ");
  P("");
  P(`  -- ${v.chamber === "house" ? "House" : "Senate"} roll ${v.rollNumber} (${v.congress}th, session ${v.session}) — ${v.measure.number}`);
  P(`  -- ${v.question} · ${v.result} ${v.totals.yea}-${v.totals.nay} · ${party}`);
  P(`  -- ${v.memberVotes.length} of ${v.chamberVoting} members on the roster; ${v.rosterSkipped} skipped as unmapped.`);
  P(`  INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)`);
  P(`  VALUES (${mv}, ${q(v.chamber)}, ${v.congress}, ${v.session}, ${v.rollNumber}, TIMESTAMPTZ ${q(v.voteDate)}, ${q(v.question)}, ${q(v.actionType)}, ${q(v.result)}, ${q(v.requiredMajority)}, ${q(totals)}::jsonb, ${q(v.sourceUrl)}, ${q(v.sourceLabel)})`);
  P(`  ON CONFLICT (chamber, congress, session, roll_number) DO NOTHING;`);
  P(`  SELECT id INTO rc FROM vr_rollcalls WHERE chamber = ${q(v.chamber)} AND congress = ${v.congress} AND session = ${v.session} AND roll_number = ${v.rollNumber} LIMIT 1;`);
  P(`  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES`);
  P(v.memberVotes.map((r) => `    (rc, ${q(r.politicianId)}, ${q(r.position)}, ${r.isParty ? q(r.isParty) : "NULL"})`).join(",\n"));
  P(`  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;`);
}

// ── Issue rows for anything created here ────────────────────────────────────
let issueRows = 0;
const withIssues = created.filter((r) => issuesFor(r.m).issues.length);
if (withIssues.length) {
  P("");
  P("  -- ── Issue mappings for the division measure ───────────────────────────────");
  P("  -- Mirrored from db/vr-issue-seed.json. The keys are a strict SUBSET of the");
  P("  -- parent's: H.R. 815 also carries tech_balance and immig_fentanyl, and this bill");
  P("  -- carries neither, because the TikTok divestiture and the fentanyl sanctions are");
  P("  -- Divisions D and E of the package and are not in this text. Mapping a division");
  P("  -- to its parent's full slice would credit members for provisions they never");
  P("  -- voted on. The 15 Phase A measures already hold their 51 rows and are untouched.");
  for (const r of withIssues) {
    const { issues, sourceUrl } = issuesFor(r.m);
    for (const iss of issues) {
      issueRows++;
      const support = iss.supportMeaning === "yea_opposes" ? "yea_opposes" : "yea_supports";
      P("");
      P(`  -- ${r.m.number} → ${iss.issueKey}${iss.isPrimary ? " (primary)" : ""}, ${support}, weight ${iss.weight ?? 100}`);
      P(`  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url)`);
      P(`  VALUES (${r.var}, ${q(iss.issueKey)}, ${iss.weight ?? 100}, ${!!iss.isPrimary}, ${q(support)}, ${q(iss.rationale || "")}, ${qOrNull(iss.sourceUrl || sourceUrl)})`);
      P(`  ON CONFLICT (measure_id, issue_key) DO NOTHING;`);
    }
  }
}
P("END $$;");

// ── Read-only sanity block ──────────────────────────────────────────────────
// Scoped to the roll calls THIS migration writes, keyed the way vr_rollcalls is itself
// unique. An earlier version asked about every 117th/118th roll call instead, and that
// is a different question with a different answer: H.R. 82 (118th, the Social Security
// Fairness Act) was mapped and ingested by an earlier pass, so 44 correct member-votes
// from a wider roster already sit on 117th/118th measures. Twenty-seven of them are
// outside this ingest's roster, which made a healthy database look like a failed
// migration. A check that fails on somebody else's correct data is not a fail-closed
// check, it is a false alarm — so the scope is now exactly what this file inserted.
P("");
P("-- ── Sanity check (read-only; raises rather than reporting a silent partial) ───");
P("-- Scoped to the roll calls THIS migration writes. Other passes have legitimately");
P("-- ingested 117th/118th votes from a wider roster (H.R. 82 carries 44), and counting");
P("-- those here would fail the deploy on data that is not this migration's to police.");
P("DO $$");
P("DECLARE");
P("  roll_ids integer[];");
P("  n_rolls integer;");
P("  n_votes integer;");
P("  n_orphan integer;");
P("BEGIN");
P("  SELECT array_agg(r.id) INTO roll_ids");
P("    FROM vr_rollcalls r");
P("    JOIN (VALUES");
P(votes.map((v, i) =>
  `      (${i === 0 ? "'" + v.chamber + "'::text, " + v.congress + "::integer, " + v.session + "::integer, " + v.rollNumber + "::integer"
                     : q(v.chamber) + ", " + v.congress + ", " + v.session + ", " + v.rollNumber})`).join(",\n"));
P("    ) AS ingested(chamber, congress, session, roll_number)");
P("      ON ingested.chamber = r.chamber AND ingested.congress = r.congress");
P("     AND ingested.session = r.session AND ingested.roll_number = r.roll_number;");
P("  n_rolls := coalesce(array_length(roll_ids, 1), 0);");
P("  SELECT count(*) INTO n_votes FROM vr_member_votes WHERE rollcall_id = ANY(roll_ids);");
P("  -- A member vote on one of THESE roll calls whose politician_id is not a roster slug");
P("  -- would mean something other than this migration wrote it, or that the roster moved");
P("  -- underneath us. Either way the attribution can no longer be trusted.");
P("  SELECT count(*) INTO n_orphan");
P("    FROM vr_member_votes mv");
P("   WHERE mv.rollcall_id = ANY(roll_ids)");
P("     AND mv.politician_id NOT IN (");
const slugs = [...new Set(votes.flatMap((v) => v.memberVotes.map((m) => m.politicianId)))].sort();
P("       " + slugs.map(q).join(", "));
P("     );");
P("  RAISE NOTICE 'Phase A votes: % of this ingest''s roll calls present, carrying % member votes', n_rolls, n_votes;");
P(`  IF n_rolls <> ${votes.length} THEN`);
P(`    RAISE EXCEPTION 'Phase A votes: expected this ingest''s ${votes.length} roll calls to be present, found %', n_rolls;`);
P("  END IF;");
P("  IF n_orphan > 0 THEN");
P("    RAISE EXCEPTION 'Phase A votes: % member vote(s) on this ingest''s roll calls carry a politician_id outside the ingest roster', n_orphan;");
P("  END IF;");
P("END $$;");
P("");

process.stderr.write(
  `${measures.length} measures (${phaseA.length} looked up, ${created.length} created), ` +
  `${votes.length} roll calls, ${num(mvTotal)} member votes, ${issueRows} issue rows, ` +
  `${slugs.length} distinct politicians, ` +
  `${pidCheck.checked} bioguide→pid pairs agree with the member map\n`
);
process.stdout.write(L.join("\n"));
