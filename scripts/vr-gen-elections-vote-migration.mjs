#!/usr/bin/env node
// ---------------------------------------------------------------------------
// vr-gen-elections-vote-migration.mjs
// ---------------------------------------------------------------------------
// Turns db/vr-elections-vote-seed.json plus the matching rows in db/vr-issue-seed.json
// into a forward-only migration for the two election-administration facets,
// `election_security` and `voting_access`. The seed is the mirror; this file is the
// source of truth for what reaches the database.
//
//   node scripts/vr-gen-elections-vote-migration.mjs > netlify/database/migrations/<ts>_vr_election_facet_rollcalls.sql
//
// Shape, and why each part is shaped that way:
//
//   · Measures the seed marks `mustExist` are LOOKED UP and RAISE if missing. They are
//     never find-or-created, because vr_measures carries no unique index on
//     (congress, number): a find-or-create that misses would insert a bare duplicate
//     shadowing the curated row forever, and nothing downstream would notice. H.R. 22 is
//     the only one here.
//   · Measures the seed marks `create` are inserted only when absent, so a re-run is a
//     no-op. Note that three of them reuse a bill number a LATER Congress also uses —
//     H.R. 1 and H.R. 4 in the 117th are the For the People Act and the John R. Lewis
//     Voting Rights Advancement Act, while the 119th's H.R. 1 and H.R. 4 are the One Big
//     Beautiful Bill Act and the Rescissions Act. Every lookup and insert is keyed on
//     (congress, chamber, number), so the two pairs cannot collide.
//   · Roll calls and member votes are ON CONFLICT DO NOTHING on the tuples the tables are
//     themselves unique on, so the whole migration is idempotent. H.R. 22's roll 102 is
//     already live with 76 attributed votes; it is emitted anyway so the seed and the
//     migration agree, and its 6 newly-attributable members land while the rest no-op.
//   · Issue rows are emitted for every mapped measure including the already-live one,
//     again ON CONFLICT DO NOTHING, because H.R. 22's new election_security row is a
//     large part of the point. Its three existing rows (election_integrity, voter_id,
//     voting_access) are left exactly as they are — this pass adds a facet, it does not
//     re-file anything already published.
//
// THE ORPHAN CHECK IS SCOPED TO THE SIX NEW ROLLS, DELIBERATELY
// ------------------------------------------------------------
// The sibling generators end with a check that no member vote on this pass's rolls
// carries a politician_id from outside db/vr-member-map.json. That check cannot be
// applied to H.R. 22's roll 102 here: 25 of its 76 live rows carry slugs the member map
// does not contain at all (ayanna_pressley, chip_roy, nadler, raskin and 21 others),
// because that roll was ingested through a wider attribution path than this roster. Those
// rows are correct; they are simply not this roster's. So the orphan check covers the six
// roll calls this migration creates and says out loud that it excludes the seventh — a
// check that fails on somebody else's correct data is a false alarm, not a guard.
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

const measures = [];
const seenMeasure = new Set();
for (const v of seed.votes) {
  const k = ikey(v.measure.congress, v.measure.chamber, v.measure.number);
  if (seenMeasure.has(k)) continue;
  seenMeasure.add(k);
  measures.push({ ...v.measure, var: varName(v.measure) });
}

// Rolls this migration is responsible for, versus the one it inherits.
const newRolls = seed.votes.filter((v) => !v.measure.mustExist);
const inherited = seed.votes.filter((v) => v.measure.mustExist);

const out = [];
const w = (s = "") => out.push(s);
// Wrap a long prose paragraph into SQL comment lines. The justifications here are the
// reason a mapping exists at all, so a reader of the migration gets all of one or the
// comment is theatre.
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
// Bulleted ledger entry: continuation lines hang under the bullet so a long "why" reads
// as one entry rather than as new bullets.
const wrapBullet = (text) => wrap("· " + text, "-- ", "--   ");

const facetRows = (key) => measures.reduce((n, m) => n + issuesFor(m).issues.filter((i) => i.issueKey === key).length, 0);

// ── header ──────────────────────────────────────────────────────────────────
w("-- ---------------------------------------------------------------------------");
w("-- Election Security & Ballot Access — the floor record for two facets, 117th-119th");
w("-- ---------------------------------------------------------------------------");
w("-- Generated by scripts/vr-gen-elections-vote-migration.mjs from db/vr-elections-vote-seed.json.");
w("-- Do not hand-edit: regenerate, or roll forward with a new migration.");
w("--");
w(`-- ${num(seed.votes.length)} roll calls · ${num(seed.memberVoteCount)} attributed member votes · ${num(measures.length)} measures`);
w(`-- ${facetRows("election_security")} election_security mapping(s) · ${facetRows("voting_access")} voting_access mapping(s)`);
w("--");
w("-- TWO FACETS, NOT ONE AXIS");
wrap("Election administration is modelled as two independent facets rather than a single "
  + "left-right chip. election_security covers eligibility verification, voter-roll maintenance, "
  + "ballot chain of custody, audits and fraud enforcement; voting_access covers registration "
  + "ease, early voting, mail ballots, drop boxes and reduced barriers to casting. A member may "
  + "support both, oppose both, or split them, and nothing in the scoring couples them. "
  + "election_security is a new key added in this pass; voting_access already existed and is "
  + "reused unchanged. The four older democracy keys (election_integrity, voter_id, "
  + "democracy_balance) keep every row they already have — this pass adds a facet, it does not "
  + "re-file published data.");
w("--");
w("-- DIRECTION IS CODED AGAINST EACH CHIP'S OWN SENTENCE");
wrap("On election_security, yea_supports means the vote favoured tighter verification or "
  + "ballot-handling safeguards. On voting_access, yea_supports means it favoured easier "
  + "registration or casting. The three SAVE-Act-family and D.C. measures are yea_supports on "
  + "security and yea_opposes on access simultaneously — that is not a contradiction, it is the "
  + "two-facet model doing the thing it was added to do.");
w("--");
w("-- NO ENACTED LAW, AND THAT IS THE RECORD");
wrap(seed.enactedLawFinding);
w("--");
w("-- WHAT WAS SCANNED");
wrap(seed.scanCoverage);
w("--");
w("-- FACETS DECLINED ON MEASURES THAT PLAINLY TOUCH THEM");
for (const d of seed.declinedFacets || []) {
  wrapBullet(`${d.measure}${d.facet ? ` — ${d.facet} NOT mapped: ` : " — "}${d.why}`);
}
w("--");
w("-- NO SENATE ROLL CALL QUALIFIES");
wrap("The Senate's only two election-administration votes in this window are failed cloture "
  + "motions — 117/1 roll 246 on the motion to proceed to S. 2093 (50-50) and 117/2 roll 9 on "
  + "the motion to concur in H.R. 5746 (49-51). The runbook's standing rule excludes cloture "
  + "because it records whether a member will let the chamber debate, not whether they support "
  + "what a bill does, and it is not relaxed here for the convenience of having Senate coverage. "
  + "The consequence is that no senator is rankable on either facet after this migration.");
w("--");
w("-- ROLL CALLS CONSIDERED AND DECLINED");
for (const d of seed.declinedRollCalls || []) {
  wrapBullet(`${d.number} ${d.chamber} ${d.congress}/${d.session} roll ${d.roll} (${d.totals}) — ${d.why}`);
}
w("--");
w("-- ATTRIBUTION IS FAIL-CLOSED");
wrap("Every roll is a House roll, so attribution is a direct lookup of the bioguide id in the "
  + "Clerk's XML against db/vr-member-map.json; an unmapped member is skipped and counted, never "
  + "guessed. totals is the FULL chamber tally and is_party is computed from the full recorded "
  + "vote before the roster filter, so a 101-slug roster cannot invent a margin or a party "
  + "crossover. Roll numbers were found by scanning the Clerk's own yearly indexes and each is "
  + "re-verified against the roll's own <legis-num> and <vote-question> — the check that matters "
  + "most for H.R. 5746, whose vote description still reads 'NASA Enhanced Use Leasing Extension "
  + "Act of 2021' because the Freedom to Vote: John R. Lewis Act was moved in that shell.");
w("--");
wrap("Idempotent: every write is guarded. H.R. 22's measure, roll call and 51 of its 57 seeded "
  + "member votes are already live and land as no-ops; its new election_security mapping and 6 "
  + "newly-attributable members are the real writes on that measure.");
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
for (const m of measures) {
  w(`  -- ${m.number} (${m.congress}th ${m.chamber})${m.title ? " — " + m.title : ""}`);
  w(`  SELECT id INTO ${m.var} FROM vr_measures`);
  w(`   WHERE congress = ${m.congress} AND chamber = ${q(m.chamber)} AND number = ${q(m.number)} LIMIT 1;`);
  if (m.mustExist) {
    w(`  IF ${m.var} IS NULL THEN`);
    w(`    RAISE EXCEPTION ${q(`Election facets: ${m.number} (${m.congress}th) is not in vr_measures. It is expected live (${m.mustExist}); refusing to create a duplicate because vr_measures has no unique index on (congress, number).`)};`);
    w("  END IF;");
  } else {
    const c = m.create;
    w(`  IF ${m.var} IS NULL THEN`);
    w("    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids)");
    w(`    VALUES (${q(m.measureType)}, ${m.congress}, ${q(m.chamber)}, ${q(m.number)}, ${q(c.title)}, ${qOrNull(c.shortTitle)},`);
    w(`      ${q(c.summary)},`);
    w(`      ${c.introducedAt ? `DATE ${q(c.introducedAt)}` : "NULL"}, ${q(c.status)}, ${q(c.sourceUrl)}, ${q(c.sourceLabel)}, ${q(JSON.stringify(c.externalIds))}::jsonb)`);
    w(`    RETURNING id INTO ${m.var};`);
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
  if (v.voteDesc && v.voteDesc !== v.measure.title) {
    w(`  --   Clerk vote-desc reads "${v.voteDesc}"`);
  }
  w("  INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)");
  w(`  VALUES (${mv}, ${q(v.chamber)}, ${v.congress}, ${v.session}, ${v.rollNumber}, TIMESTAMPTZ ${q(v.voteDate)}, ${q(v.question)}, ${q(v.actionType)}, ${q(v.result)}, ${q(v.requiredMajority)},`);
  w(`    ${q(JSON.stringify({ yea: v.totals.yea, nay: v.totals.nay, present: v.totals.present, notVoting: v.totals.notVoting, byParty: v.partyTotals }))}::jsonb, ${q(v.sourceUrl)}, ${q(v.sourceLabel)})`);
  w("  ON CONFLICT (chamber, congress, session, roll_number) DO NOTHING;");
  w("  SELECT id INTO rc FROM vr_rollcalls");
  w(`   WHERE chamber = ${q(v.chamber)} AND congress = ${v.congress} AND session = ${v.session} AND roll_number = ${v.rollNumber} LIMIT 1;`);
  w("  IF rc IS NULL THEN");
  w(`    RAISE EXCEPTION ${q(`Election facets: ${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber} could not be read back after insert.`)};`);
  w("  END IF;");
  w("  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES");
  w(v.memberVotes.map((x) => `    (rc, ${q(x.politicianId)}, ${q(x.position)}, ${qOrNull(x.isParty)})`).join(",\n"));
  w("  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;");
  w();
}

// ── issue mappings ──────────────────────────────────────────────────────────
// On a measure this migration creates, every curated row in db/vr-issue-seed.json is
// emitted. On a measure it only looks up — H.R. 22, which an earlier pass authored — only
// the key this pass introduces is emitted. H.R. 22's election_integrity, voter_id,
// voting_access and gov_regulation rows are another migration's work and are not re-stated
// here: ON CONFLICT would make them no-ops anyway, and a migration that prints rows it did
// not decide invites the next reader to think it owns them.
const OWNED_ON_INHERITED = ["election_security"];
w("  -- ── issue mappings ────────────────────────────────────────────────────────");
w("  -- Curated in db/vr-issue-seed.json, with the provision-level rationale on every row.");
wrap("On H.R. 22 only election_security is written. Its election_integrity, voter_id and "
  + "voting_access mappings were decided by an earlier pass and are left exactly as they are — "
  + "this pass adds a facet to that measure, it does not restate or re-file the rest.", "  -- ");
let mappedRows = 0;
let inheritedSkipped = 0;
for (const m of measures) {
  const { issues, sourceUrl } = issuesFor(m);
  const emit = m.mustExist ? issues.filter((i) => OWNED_ON_INHERITED.includes(i.issueKey)) : issues;
  inheritedSkipped += issues.length - emit.length;
  if (!emit.length) {
    w(`  -- ${m.number} (${m.congress}th): no issue mapping for this pass to write`);
    w();
    continue;
  }
  const facets = emit.map((i) => `${i.issueKey} ${i.supportMeaning}`).join(", ");
  w(`  -- ${m.number} (${m.congress}th) — ${facets}`);
  w("  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES");
  w(emit.map((i) => {
    mappedRows++;
    return `    (${m.var}, ${q(i.issueKey)}, ${i.weight}, ${i.isPrimary ? "true" : "false"}, ${q(i.supportMeaning)},\n      ${q(i.rationale)},\n      ${qOrNull(i.sourceUrl || sourceUrl)})`;
  }).join(",\n"));
  w("  ON CONFLICT (measure_id, issue_key) DO NOTHING;");
  w();
}
w("END $$;");
w();

// ── verification ────────────────────────────────────────────────────────────
const rollTuples = seed.votes.map((v) => `('${v.chamber}'::text, ${v.congress}::integer, ${v.session}::integer, ${v.rollNumber}::integer)`);
const newTuples = newRolls.map((v) => `('${v.chamber}'::text, ${v.congress}::integer, ${v.session}::integer, ${v.rollNumber}::integer)`);
const secRows = facetRows("election_security");
const accRows = facetRows("voting_access");

w("-- ---------------------------------------------------------------------------");
w("-- Verification");
w("-- ---------------------------------------------------------------------------");
wrap("Read-only, and scoped by tuple to exactly this pass's roll calls and measures so it can "
  + "only ever fail on data this migration is responsible for. A global count would drag in "
  + "voting_access rows from earlier passes and stop meaning anything.");
w("--");
wrap("The orphan check is narrower still — only the "
  + `${newRolls.length} roll calls created here, not `
  + inherited.map((v) => `${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber}`).join(" or ")
  + ". That roll was ingested earlier through a wider attribution path and 25 of its live rows "
  + "legitimately carry slugs db/vr-member-map.json does not hold. A check that fails on "
  + "somebody else's correct data is a false alarm, not a guard.");
w("-- ---------------------------------------------------------------------------");
w("DO $$");
w("DECLARE");
w("  n_rolls integer;");
w("  n_votes integer;");
w("  n_orphan integer;");
w("  n_sec integer;");
w("  n_acc integer;");
w("BEGIN");
w("  WITH want (chamber, congress, session, roll_number) AS (VALUES");
w("    " + rollTuples.join(",\n    "));
w("  ), roll_ids AS (");
w("    SELECT r.id FROM vr_rollcalls r JOIN want w");
w("      ON r.chamber = w.chamber AND r.congress = w.congress");
w("     AND r.session = w.session AND r.roll_number = w.roll_number");
w("  ), fresh (chamber, congress, session, roll_number) AS (VALUES");
w("    " + newTuples.join(",\n    "));
w("  ), fresh_ids AS (");
w("    SELECT r.id FROM vr_rollcalls r JOIN fresh f");
w("      ON r.chamber = f.chamber AND r.congress = f.congress");
w("     AND r.session = f.session AND r.roll_number = f.roll_number");
w("  ), mine (congress, chamber, number) AS (VALUES");
w("    " + measures.map((m) => `(${m.congress}::integer, '${m.chamber}'::text, ${q(m.number)}::text)`).join(",\n    "));
w("  ), measure_ids AS (");
w("    SELECT m.id FROM vr_measures m JOIN mine k");
w("      ON m.congress = k.congress AND m.chamber = k.chamber AND m.number = k.number");
w("  )");
w("  SELECT (SELECT count(*) FROM roll_ids),");
w("         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM roll_ids)),");
w("         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM fresh_ids)");
w("            AND v.politician_id NOT IN (");
w("              " + ROSTER.map((s) => q(s)).join(", "));
w("            )),");
w("         (SELECT count(*) FROM vr_measure_issues i WHERE i.issue_key = 'election_security'");
w("            AND i.measure_id IN (SELECT id FROM measure_ids)),");
w("         (SELECT count(*) FROM vr_measure_issues i WHERE i.issue_key = 'voting_access'");
w("            AND i.measure_id IN (SELECT id FROM measure_ids))");
w("    INTO n_rolls, n_votes, n_orphan, n_sec, n_acc;");
w();
w("  RAISE NOTICE 'Election facets: % roll calls, % member votes, % election_security and % voting_access mappings', n_rolls, n_votes, n_sec, n_acc;");
w();
w(`  IF n_rolls <> ${seed.votes.length} THEN`);
w(`    RAISE EXCEPTION 'Election facets: expected ${seed.votes.length} roll calls, found %', n_rolls;`);
w("  END IF;");
w(`  IF n_votes < ${seed.memberVoteCount} THEN`);
w(`    RAISE EXCEPTION 'Election facets: expected at least ${seed.memberVoteCount} member votes on these roll calls, found %', n_votes;`);
w("  END IF;");
w("  IF n_orphan > 0 THEN");
w("    RAISE EXCEPTION 'Election facets: % member vote(s) on the roll calls this migration creates carry a politician_id outside db/vr-member-map.json', n_orphan;");
w("  END IF;");
w(`  IF n_sec <> ${secRows} THEN`);
w(`    RAISE EXCEPTION 'Election facets: expected ${secRows} election_security mappings on this pass''s measures, found %', n_sec;`);
w("  END IF;");
w(`  IF n_acc <> ${accRows} THEN`);
w(`    RAISE EXCEPTION 'Election facets: expected ${accRows} voting_access mappings on this pass''s measures, found %', n_acc;`);
w("  END IF;");
w("END $$;");

process.stdout.write(out.join("\n") + "\n");
process.stderr.write(
  `${seed.votes.length} rolls (${newRolls.length} new, ${inherited.length} inherited) · ${seed.memberVoteCount} member votes · `
  + `${measures.length} measures · ${mappedRows} issue rows written (${secRows} election_security, ${accRows} voting_access curated; `
  + `${inheritedSkipped} row(s) on the inherited measure left to the pass that authored them) · `
  + `${pidCheck.checked} bioguide→pid pairs agree with the member map\n`
);
