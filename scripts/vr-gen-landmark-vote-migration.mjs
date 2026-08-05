#!/usr/bin/env node
// ---------------------------------------------------------------------------
// vr-gen-landmark-vote-migration.mjs
// ---------------------------------------------------------------------------
// Turns db/vr-landmark-vote-seed.json plus the matching rows in db/vr-issue-seed.json into
// a forward-only migration for three enacted laws of the 119th Congress — the Laken Riley
// Act (S. 5, P.L. 119-1), the Epstein Files Transparency Act (H.R. 4405, P.L. 119-38) and
// the National Defense Authorization Act for Fiscal Year 2026 (S. 1071, P.L. 119-60). The
// seed is the mirror; this file is the source of truth for what reaches the database.
//
//   node scripts/vr-gen-landmark-vote-migration.mjs > netlify/database/migrations/<ts>_vr_landmark_enacted_rollcalls.sql
//
// Shape, and why each part is shaped that way:
//
//   · Measures come in two kinds and the generator will not confuse them. A measure marked
//     `mustExist` is LOOKED UP and never inserted: S. 5, H.R. 29 and S. 1071 are already in
//     the record, and re-describing a row another migration owns is how two competing
//     descriptions of the same bill get written. If one of them is gone the migration
//     RAISES rather than quietly creating a second. Only the four rows this pass introduces
//     — S.Amdt. 8, S.Amdt. 14, S.Amdt. 23 and H.R. 4405 — carry a `create` block.
//   · S. 1071 needs a resolution rule, not a bare lookup. vr_measures has no unique index
//     on (congress, number), and the FY2026 NDAA reached the floor as a substitute for an
//     unrelated shell bill, so the roll-bearing row is resolved deterministically — the
//     measure House roll 119/1/319 already points at, falling back to the lowest id — and
//     the ISSUE MAPPING is applied to EVERY row carrying that number. Today that is exactly
//     one row (id 75, correctly titled 'National Defense Authorization Act for Fiscal Year
//     2026', status 'pending'), so the loop writes one set; it is written as a loop so a
//     duplicate introduced later cannot end up carrying a roll while unmapped.
//   · The three amendments are inserted AFTER their parent and carry parent_id, so they nest
//     under S. 5 in the UI the way H.Amdt. 253 nests under H.R. 8800.
//   · Roll calls and member votes are ON CONFLICT DO NOTHING on the tuples the tables are
//     themselves unique on. Three of the nine rolls are already live and are re-emitted for
//     exactly this reason: house 119/1/23 carries FOUR attributed member votes out of 419
//     cast, house 119/1/6 carries 22 of 423, and senate 119/1/7 carries 83 of 99, and the
//     insert tops them up without disturbing the roll's own row — including its question
//     text, which for senate 119/1/7 the database records as 'On Passage of the Bill, as
//     Amended' where the Senate's own XML says 'On Passage of the Bill S. 5'. The existing
//     wording is left alone: both describe the same vote and neither is wrong.
//   · Issue rows come verbatim from db/vr-issue-seed.json, each with its provision-level
//     rationale and a primary source — scripts/test-mapping-discipline.mjs requires both.
//   · vr_positions carries the H.R. 4405 sponsorship record. A 427-1 roll call confirms a
//     stated transparency position but distinguishes almost nobody; sponsoring the bill in
//     July 2025, four months before the floor caught up, does.
//
// WHAT THIS MIGRATION DOES NOT TOUCH
// ----------------------------------
// S. 5's own row is looked up, never re-described. Its four curated mappings (deportations
// primary, border_security, tough_on_crime, states_federal_power) were written by migration
// 20260804000000_vr_repair_laken_riley_measure_identity.sql; they ARE re-emitted here,
// because they live in db/vr-issue-seed.json and the generator emits what the curated seed
// holds, but the values are byte-identical and ON CONFLICT (measure_id, issue_key) DO NOTHING
// makes the re-emission a no-op. That is deliberate: the seed is what the ingest endpoint
// re-asserts, so a mapping the seed carries and the migration hides would be a mapping only
// half the pipeline knows about. House roll 119/1/319 (On Motion to Commit
// on S. 1071, failed 209-216) is left exactly as migration 20260809000000_vr_map_
// substantive_remainder.sql left it: correctly typed 'motion', scored at procedural weight
// with an inverted advance direction by yeaBlocksMeasure() in netlify/lib/vr-pack.ts. The
// descriptive row 'Senate Amendment to S. 5' is not deleted or renumbered — it gains one
// sentence pointing at the three amendment rows this pass creates, which is what it was
// standing in for.
//
// ROW SCOPE IS STATED AS DATA, NOT INFERRED
// -----------------------------------------
// PASS_ROLLS below is the frozen list of the nine rolls this migration published. A
// generator whose output silently widens over its own applied migration invites exactly the
// mistake the runbook forbids — regenerating a file the database has already run — so a
// later roll added to the seed is NOT picked up here and gets its own forward migration.
// The seed's narrative fields (scanCoverage, enactedLawFinding, declinedFacets) DO track the
// seed, so a re-run reflects a later correction to the prose while the row scope stays
// frozen.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { assertSeedPidsMatchMap } from "./vr-seed-pid-guard.mjs";
const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const SEED_PATH = "db/vr-landmark-vote-seed.json";
const seedFile = JSON.parse(fs.readFileSync(path.join(ROOT, SEED_PATH), "utf8"));
const issueSeed = JSON.parse(fs.readFileSync(path.join(ROOT, "db/vr-issue-seed.json"), "utf8"));
const memberMap = JSON.parse(fs.readFileSync(path.join(ROOT, "db/vr-member-map.json"), "utf8"));
const ROSTER = [...new Set(Object.values(memberMap.map || {}))].sort();

const PASS_ROLLS = new Set([
  "house|119|1|6",     // H.R. 29 — Laken Riley Act (House companion), On Passage 264-159
  "senate|119|1|3",    // S.Amdt. 14 — Cornyn, expand the offence list, agreed 70-25
  "senate|119|1|4",    // S.Amdt. 23 — Coons, strike State AG standing, REJECTED 46-49
  "senate|119|1|6",    // S.Amdt. 8 — Ernst, death/serious injury, agreed 75-24 as amended
  "senate|119|1|7",    // S. 5 — On Passage of the Bill, 64-35 (P.L. 119-1)
  "house|119|1|23",    // S. 5 — On Passage, 263-156 (P.L. 119-1)
  "house|119|1|289",   // H.R. 4405 — suspension, 427-1 (P.L. 119-38)
  "house|119|1|320",   // S. 1071 — On Passage of the NDAA substitute, 312-112
  "senate|119|1|648",  // S. 1071 — Motion to Concur in the House Amendment, 77-20 (P.L. 119-60)
]);
const rkey = (v) => `${v.chamber}|${v.congress}|${v.session}|${v.rollNumber}`;
const passVotes = (seedFile.votes || []).filter((v) => PASS_ROLLS.has(rkey(v)));
const seed = {
  ...seedFile,
  votes: passVotes,
  rollCallCount: passVotes.length,
  memberVoteCount: passVotes.reduce((n, v) => n + (v.memberVotes || []).length, 0),
};
if (passVotes.length !== PASS_ROLLS.size) {
  throw new Error(
    `${SEED_PATH} no longer carries all ${PASS_ROLLS.size} rolls this migration published `
    + `(found ${passVotes.length}) — the applied file cannot be reproduced from it.`
  );
}

// The seed's politician_id is a cached map lookup, not a source. Refuse to generate from a
// seed whose (bioguideId → politicianId) pairs the current map contradicts.
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

// ── Per-measure handling that cannot be derived from the seed's vote rows ────
// `resolveVia`  a roll number whose existing measure_id identifies the right row when the
//               number is ambiguous. Only S. 1071 needs it.
// `allRows`     apply the issue mapping to EVERY vr_measures row with this number, not just
//               the resolved one. Set for the same reason.
// `enacted`     a guarded UPDATE that records the public law on a row another migration
//               created before the bill became law. Only ever fills a column that is empty
//               or disagrees; never overwrites a title or summary another pass authored.
const MEASURE_RULES = {
  "119|senate|s1071": {
    resolveVia: { chamber: "house", congress: 119, session: 1, rollNumber: 319 },
    allRows: true,
    enacted: {
      status: "enacted",
      publicLaw: "119-60",
      note:
        "S. 1071 became Public Law 119-60 on 2025-12-18. The row was created before that, when "
        + "House roll 119/1/319 was its only roll call, so status and external_ids are brought "
        + "up to date here. title, short_title and summary are left to whatever the row already "
        + "holds: the coverage report shows it already reads 'National Defense Authorization Act "
        + "for Fiscal Year 2026', which is correct, and overwriting a correct title from a "
        + "generator is how a good row gets worse.",
    },
  },
};
const rulesFor = (m) => MEASURE_RULES[ikey(m.congress, m.chamber, m.number)] || {};

// ── Sponsorship record for H.R. 4405 ────────────────────────────────────────
// From the BILLSTATUS sponsors/cosponsors lists (24 cosponsors in all; these four are the
// ones db/vr-member-map.json resolves). isOriginalCosponsor is the bill's own flag, so
// "original cosponsor" is a fact from the record and not an inference from the date.
const HR4405_POSITIONS = [
  { pid: "khanna", action: "sponsor", date: "2025-07-15",
    note: "Lead sponsor. Introduced H.R. 4405 on 2025-07-15, four months before the House voted." },
  { pid: "massie", action: "cosponsor", date: "2025-07-15",
    note: "ORIGINAL cosponsor (isOriginalCosponsor=True in the bill's own record), joining on the day of introduction." },
  { pid: "omar", action: "cosponsor", date: "2025-07-17", note: "Cosponsor, joined 2025-07-17." },
  { pid: "adam_smith", action: "cosponsor", date: "2025-07-23", note: "Cosponsor, joined 2025-07-23." },
];
const HR4405_URL = "https://www.congress.gov/bill/119th-congress/house-bill/4405/cosponsors";

// Measures in emission order. A parent is emitted BEFORE the child that references it, so
// the child's INSERT can carry parent_id from an already-populated variable.
const measures = [];
const seenMeasure = new Set();
const pushMeasure = (m, extra) => {
  const k = ikey(m.congress, m.chamber, m.number);
  if (seenMeasure.has(k)) return;
  seenMeasure.add(k);
  measures.push({ ...m, ...(extra || {}), var: varName(m), ...rulesFor(m) });
};
for (const v of seed.votes) {
  const m = v.measure;
  if (m.parentNumber) {
    // The parent already exists (S. 5), so it is pushed as a mustExist lookup with no
    // create block. Pushing it here rather than relying on its own vote row's ordering is
    // what guarantees it is DECLARED and resolved before the amendment references it.
    pushMeasure(
      { measureType: "bill", congress: m.parentCongress, chamber: m.parentChamber, number: m.parentNumber },
      { mustExist: "Parent vehicle. Created by migration 20260804000000_vr_repair_laken_riley_measure_identity.sql." }
    );
    pushMeasure(m, { parentVar: varName({ congress: m.parentCongress, number: m.parentNumber }) });
  } else {
    pushMeasure(m);
  }
}
// Emit lookups before creates so a parent is always resolved first, then keep seed order.
measures.sort((a, b) => Number(!!a.create) - Number(!!b.create));

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
const wrapBullet = (text) => wrap("· " + text, "-- ", "--   ");

const keyRows = (key) => measures.reduce((n, m) => n + issuesFor(m).issues.filter((i) => i.issueKey === key).length, 0);
const KEYS = [...new Set(measures.flatMap((m) => issuesFor(m).issues.map((i) => i.issueKey)))].sort();
const totalIssueRows = measures.reduce((n, m) => n + issuesFor(m).issues.length, 0);
const newMeasures = measures.filter((m) => m.create);
const existingMeasures = measures.filter((m) => !m.create);

// ── header ──────────────────────────────────────────────────────────────────
w("-- ---------------------------------------------------------------------------");
w("-- Three enacted laws — Laken Riley, Epstein Files, FY2026 NDAA (119th Congress)");
w("-- ---------------------------------------------------------------------------");
w("-- Generated by scripts/vr-gen-landmark-vote-migration.mjs from db/vr-landmark-vote-seed.json.");
w("-- Do not hand-edit: regenerate, or roll forward with a new migration.");
w("--");
w(`-- ${num(seed.votes.length)} roll calls · ${num(seed.memberVoteCount)} attributed member votes`);
w(`-- ${newMeasures.length} measure(s) created · ${existingMeasures.length} looked up and left as they are`);
w(`-- ${totalIssueRows} issue mapping(s) across ${KEYS.length} key(s): ${KEYS.join(", ")}`);
w(`-- ${HR4405_POSITIONS.length} sponsorship row(s) in vr_positions`);
w("--");
w("-- WHY THESE THREE");
wrap("All three are enacted law, and each is a high-salience vote the record currently either "
  + "mis-files or under-attributes. The biggest single gain is arithmetic rather than "
  + "editorial: House roll 119/1/23, the vote that sent the Laken Riley Act to the President, "
  + "holds FOUR attributed member votes out of 419 cast, and H.R. 29's roll 119/1/6 holds 22 of "
  + "423. Both are re-fetched from the Clerk and topped up through db/vr-member-map.json, which "
  + "puts a citable immigration-enforcement vote on the profile of every rostered House member "
  + "who cast one. The three Senate amendment rolls are added because each isolates a live "
  + "dispute inside the bill — which offences trigger mandatory detention (rolls 3 and 6), and "
  + "whether State attorneys general may sue the federal government over it (roll 4) — and an "
  + "amendment roll is the only instrument that can test a single provision.");
w("--");
w("-- THE ENACTED-LAW TIER, AND TWO IDENTITY TRAPS");
wrap(seed.enactedLawFinding);
w("--");
w("-- WHAT WAS SCANNED");
wrap(seed.scanCoverage);
w("--");
w("-- WHERE A ROLL'S OWN ARITHMETIC LIMITS WHAT IT CAN TEST");
for (const c of seed.marginCaveats || []) wrapBullet(`${c.roll} — ${c.caveat}`);
w("--");
w("-- ISSUE AXES DECLINED, AND WHY");
wrap("The FY2026 NDAA folds in fourteen separately titled Acts, which is exactly the condition "
  + "under which \"map the distinct policy axes\" turns into forcing. A mapping attaches to the "
  + "MEASURE, so every axis added here is applied at full strength to both decisive rolls and to "
  + "all 424 members who cast one. Three axes survived that test — strong_defense (80, primary), "
  + "immig_fentanyl (40) and states_federal_power (25), each weighted for how much of the bill it "
  + "actually represents. These did not:");
for (const d of seed.declinedFacets || []) {
  wrapBullet(`${d.measure}${d.facet ? ` — ${d.facet} NOT mapped: ` : " — "}${d.why}`);
}
w("--");
w("-- ROLL CALLS CONSIDERED AND DECLINED");
for (const d of seed.declinedRollCalls || []) {
  const where = [d.chamber, d.congress && d.session ? `${d.congress}/${d.session}` : null, d.roll ? `roll ${d.roll}` : null]
    .filter(Boolean).join(" ");
  wrapBullet(`${d.number}${where ? ` ${where}` : ""} (${d.totals}) — ${d.why}`);
}
w("--");
w("-- THREE AMENDMENT ROLLS, ADMITTED BY EXCEPTION");
for (const v of seed.votes.filter((x) => x.decisiveWhy)) {
  wrapBullet(`${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber} (${v.measure.number}, `
    + `${v.totals.yea}-${v.totals.nay} ${v.result}): ${v.decisiveWhy}`);
}
w("--");
w("-- ATTRIBUTION IS FAIL-CLOSED");
wrap("House rolls attribute on the bioguide id in the Clerk's XML against db/vr-member-map.json "
  + "— a direct lookup, and an unmapped member is skipped and counted, never guessed. Senate XML "
  + "carries no bioguide id, so a senator resolves on (surname, state) against the roster and "
  + "only a UNIQUE hit is accepted; an ambiguous match is counted and skipped. totals is the FULL "
  + "chamber tally and is_party is computed from the full recorded vote before the roster filter, "
  + "so a partial roster cannot invent a margin or a party crossover. Every roll is re-verified "
  + "against the chamber's own document before ingest: <legis-num> plus <vote-question> for the "
  + "House, document_type and document_number plus question for a Senate bill, and "
  + "amendment_number plus amendment_to_document_number for the three amendment rolls, because "
  + "the Senate leaves document_number EMPTY on an amendment vote. House verification "
  + "deliberately IGNORES <vote-desc>: the Clerk's description for S. 1071 rolls 319 and 320 is "
  + "still the original VA-disinterment title the House struck, so a description check would "
  + "reject the correct roll and a description-driven mapping would map the wrong subject.");
w("--");
wrap("Idempotent: every write is guarded and a re-run is a no-op. Three of the nine rolls "
  + "(house 119/1/6, house 119/1/23 and senate 119/1/7) are already live, and ON CONFLICT DO "
  + "NOTHING on (chamber, congress, session, roll_number) means their existing rows are "
  + "untouched while their member votes are topped up through ON CONFLICT DO NOTHING on "
  + "(rollcall_id, politician_id). The other six — senate 119/1/3, 4, 6 and 648, house 119/1/289 "
  + "and house 119/1/320 — are new. H.R. 29's four mappings and S. 5's four are re-emitted from "
  + "the curated seed and match the live rows exactly, so they are no-ops too; they are in the "
  + "file because the ingest endpoint re-asserts the seed and a mapping the seed carries but no "
  + "migration writes is one only half the pipeline knows about.");
w("-- ---------------------------------------------------------------------------");
w();
w("DO $$");
w("DECLARE");
for (const m of measures) w(`  ${m.var} integer;`);
w("  rc integer;");
w("  mid integer;");
w("  n integer;");
w("BEGIN");
w();

// ── measures ────────────────────────────────────────────────────────────────
w("  -- ── measures ──────────────────────────────────────────────────────────────");
for (const m of measures) {
  const c = m.create || null;
  const title = (c && c.title) || m.title;
  w(`  -- ${m.number} (${m.congress}th ${m.chamber})${title ? " — " + title : ""}`);
  if (m.mustExist) {
    for (const line of wrapLocal(m.mustExist)) w(`  --   ${line}`);
  }
  if (m.resolveVia) {
    const r = m.resolveVia;
    w(`  --   RESOLVED, NOT ASSUMED. vr_measures has no unique index on (congress, number), so`);
    w(`  --   the roll-bearing row is taken from ${r.chamber} roll ${r.congress}/${r.session}/${r.rollNumber}, falling back`);
    w("  --   to the lowest id. The issue mapping below is applied to EVERY row with this number");
    w("  --   — one row today — so a duplicate added later cannot carry a roll while unmapped.");
    w(`  SELECT measure_id INTO ${m.var} FROM vr_rollcalls`);
    w(`   WHERE chamber = ${q(r.chamber)} AND congress = ${r.congress} AND session = ${r.session} AND roll_number = ${r.rollNumber}`);
    w("   LIMIT 1;");
    w(`  IF ${m.var} IS NULL THEN`);
    w(`    SELECT id INTO ${m.var} FROM vr_measures`);
    w(`     WHERE congress = ${m.congress} AND number = ${q(m.number)} ORDER BY id LIMIT 1;`);
    w("  END IF;");
  } else {
    w(`  SELECT id INTO ${m.var} FROM vr_measures`);
    w(`   WHERE congress = ${m.congress} AND chamber = ${q(m.chamber)} AND number = ${q(m.number)} LIMIT 1;`);
  }
  if (c) {
    w(`  IF ${m.var} IS NULL THEN`);
    const cols = "measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids"
      + (m.parentVar ? ", parent_id" : "")
      + (m.number === "H.R. 4405" ? ", sponsor_id" : "");
    w(`    INSERT INTO vr_measures (${cols})`);
    w(`    VALUES (${q(m.measureType)}, ${m.congress}, ${q(m.chamber)}, ${q(m.number)}, ${q(c.title)}, ${qOrNull(c.shortTitle)},`);
    w(`      ${q(c.summary)},`);
    w(`      ${c.introducedAt ? `DATE ${q(c.introducedAt)}` : "NULL"}, ${q(c.status)}, ${q(c.sourceUrl)}, ${q(c.sourceLabel)}, ${q(JSON.stringify(c.externalIds))}::jsonb`
      + `${m.parentVar ? `, ${m.parentVar}` : ""}${m.number === "H.R. 4405" ? ", 'khanna'" : ""})`);
    w(`    RETURNING id INTO ${m.var};`);
    if (m.parentVar) {
      // A re-run over a row an earlier pass created without the link still gets the link,
      // which is what the amendment-parent backfill migration exists to do generally.
      w("  ELSE");
      w(`    UPDATE vr_measures SET parent_id = ${m.parentVar}, updated_at = now()`);
      w(`     WHERE id = ${m.var} AND parent_id IS NULL;`);
    }
    w("  END IF;");
  } else {
    // A mustExist row is never created. If it is gone, something upstream broke and
    // inventing a replacement would hide it.
    w(`  IF ${m.var} IS NULL THEN`);
    w(`    RAISE EXCEPTION ${q(`Landmark pass: ${m.number} (${m.congress}th ${m.chamber}) is not in vr_measures — `
      + "it is expected to exist and is never created here.")};`);
    w("  END IF;");
  }
  if (m.enacted) {
    const e = m.enacted;
    for (const line of wrapLocal(e.note)) w(`  --   ${line}`);
    w(`  UPDATE vr_measures SET status = ${q(e.status)}, updated_at = now()`);
    w(`   WHERE id = ${m.var} AND status IS DISTINCT FROM ${q(e.status)};`);
    w("  UPDATE vr_measures");
    w(`     SET external_ids = COALESCE(external_ids, '{}'::jsonb) || ${q(JSON.stringify({ publicLaw: e.publicLaw }))}::jsonb,`);
    w("         updated_at = now()");
    w(`   WHERE id = ${m.var}`);
    w(`     AND COALESCE(external_ids ->> 'publicLaw', '') <> ${q(e.publicLaw)};`);
  }
  w();
}

// ── the descriptive placeholder row the amendments supersede ─────────────────
w("  -- ── 'Senate Amendment to S. 5' — the descriptive row, cross-referenced ─────");
wrap("Migration 20260804000000 corrected a row that had claimed the Senate amended H.R. 29 and "
  + "the House concurred, restating it as the Senate's amendment to S. 5 and recording that it "
  + "carries no roll call of its own. That is still true, and the row is NOT deleted or "
  + "renumbered — re-keying a row whose current column values this generator cannot read is how "
  + "a correct row gets broken. It gains one sentence naming the three amendment rows created "
  + "above, so a reader who lands on the descriptive row is sent to the ones that carry votes. "
  + "Guarded on the sentence's own absence, so a re-run appends nothing.", "  -- ");
w("  UPDATE vr_measures");
w("     SET summary = summary || ' The three component amendments now have measure rows of their "
  + "own, each carrying its roll call: S.Amdt. 8 (Ernst, roll 119/1/6), S.Amdt. 14 (Cornyn, roll "
  + "119/1/3) and S.Amdt. 23 (Coons, roll 119/1/4).',");
w("         updated_at = now()");
w("   WHERE congress = 119 AND number = 'Senate Amendment to S. 5'");
w("     AND summary IS NOT NULL");
w("     AND summary NOT LIKE '%measure rows of their own%';");
w();

// ── roll calls and member votes ─────────────────────────────────────────────
w("  -- ── roll calls and member votes ───────────────────────────────────────────");
for (const v of seed.votes) {
  const mv = varName(v.measure);
  const pt = Object.entries(v.partyTotals || {}).map(([p, t]) => `${p} ${t.yea}-${t.nay}`).join(", ");
  w(`  -- ${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber} · ${v.measure.number} · ${v.question}`);
  w(`  --   ${v.totals.yea}-${v.totals.nay}${v.totals.present ? `, ${v.totals.present} present` : ""}${v.totals.notVoting ? `, ${v.totals.notVoting} not voting` : ""} (${pt}) · ${v.result}`);
  w(`  --   ${v.memberVotes.length} of ${v.chamberVoting} voting members are on the roster; ${v.rosterSkipped} skipped as unmapped`
    + `${v.rosterAmbiguous ? `, ${v.rosterAmbiguous} skipped as an ambiguous surname match` : ""}`);
  if (v.voteDesc && v.voteDesc !== v.measure.title) {
    w(`  --   chamber vote description reads "${v.voteDesc}"`);
  }
  if (v.decisiveWhy) w("  --   admitted as decisive BY EXCEPTION — see the header.");
  w("  INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)");
  w(`  VALUES (${mv}, ${q(v.chamber)}, ${v.congress}, ${v.session}, ${v.rollNumber}, TIMESTAMPTZ ${q(v.voteDate)}, ${q(v.question)}, ${q(v.actionType)}, ${q(v.result)}, ${q(v.requiredMajority)},`);
  w(`    ${q(JSON.stringify({ yea: v.totals.yea, nay: v.totals.nay, present: v.totals.present, notVoting: v.totals.notVoting, byParty: v.partyTotals }))}::jsonb, ${q(v.sourceUrl)}, ${q(v.sourceLabel)})`);
  w("  ON CONFLICT (chamber, congress, session, roll_number) DO NOTHING;");
  w("  SELECT id INTO rc FROM vr_rollcalls");
  w(`   WHERE chamber = ${q(v.chamber)} AND congress = ${v.congress} AND session = ${v.session} AND roll_number = ${v.rollNumber} LIMIT 1;`);
  w("  IF rc IS NULL THEN");
  w(`    RAISE EXCEPTION ${q(`Landmark pass: ${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber} could not be read back after insert.`)};`);
  w("  END IF;");
  w("  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES");
  w(v.memberVotes.map((x) => `    (rc, ${q(x.politicianId)}, ${q(x.position)}, ${qOrNull(x.isParty)})`).join(",\n"));
  w("  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;");
  w();
}

// ── sponsorship ─────────────────────────────────────────────────────────────
w("  -- ── H.R. 4405 sponsorship (vr_positions) ──────────────────────────────────");
wrap("The Epstein Files Transparency Act passed 427-1 under suspension of the rules. That roll "
  + "is a real, citable gov_transparency record for everyone who cast it, and it separates almost "
  + "nobody. What separates is who put their name on the bill in July 2025, four months before "
  + "the floor caught up: Rep. Ro Khanna as sponsor and Rep. Thomas Massie as ORIGINAL cosponsor "
  + "(the bill's own isOriginalCosponsor flag, not an inference from the date). Twenty-four "
  + "members cosponsored in all; these four are the ones db/vr-member-map.json resolves, and an "
  + "unresolved cosponsor is skipped rather than guessed.", "  -- ");
w(`  IF ${varName({ congress: 119, number: "H.R. 4405" })} IS NOT NULL THEN`);
w("    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES");
w(HR4405_POSITIONS.map((p) =>
  `      (${varName({ congress: 119, number: "H.R. 4405" })}, ${q(p.pid)}, ${q(p.action)}, true, TIMESTAMPTZ ${q(p.date + "T00:00:00Z")},\n`
  + `       ${q(HR4405_URL)}, ${q(p.note)})`).join(",\n"));
w("    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;");
w("  END IF;");
w();

// ── issue mappings ──────────────────────────────────────────────────────────
w("  -- ── issue mappings ────────────────────────────────────────────────────────");
w("  -- Curated in db/vr-issue-seed.json, with the provision-level rationale and a primary");
w("  -- source on every row — scripts/test-mapping-discipline.mjs requires both.");
w();
let mappedRows = 0;
for (const m of measures) {
  const { issues, sourceUrl } = issuesFor(m);
  if (!issues.length) {
    w(`  -- ${m.number} (${m.congress}th): no curated mapping in db/vr-issue-seed.json, so none is`);
    w("  --   emitted. A mapping is never invented at generation time.");
    w();
    continue;
  }
  const facets = issues.map((i) => `${i.issueKey} ${i.supportMeaning} w${i.weight}`).join(", ");
  w(`  -- ${m.number} (${m.congress}th) — ${facets}`);
  if (m.number === "S. 5" || m.number === "H.R. 29") {
    w("  --   Byte-identical to what is already live (S. 5's four from migration 20260804000000,");
    w("  --   H.R. 29's four from an earlier pass). Re-emitted because db/vr-issue-seed.json carries");
    w("  --   these rows and the ingest endpoint re-asserts them; the ON CONFLICT below makes it a");
    w("  --   no-op against a database that already holds them.");
  }
  const rows = issues.map((i) => {
    mappedRows++;
    const target = m.allRows ? "mid" : m.var;
    return `    (${target}, ${q(i.issueKey)}, ${i.weight}, ${i.isPrimary ? "true" : "false"}, ${q(i.supportMeaning)},\n`
      + `      ${q(i.rationale)},\n      ${qOrNull(i.sourceUrl || sourceUrl)})`;
  });
  if (m.allRows) {
    // Never `LIMIT 1`: this number matches more than one row, and mapping only the one this
    // pass resolved would leave a twin that a later ingest could attach a roll to unmapped.
    w("  --   Applied to EVERY row carrying this number — one row today (id 75). Written as a loop");
    w("  --   because (congress, number) is not unique, so a duplicate added later is covered too.");
    w(`  FOR mid IN SELECT id FROM vr_measures WHERE congress = ${m.congress} AND number = ${q(m.number)} LOOP`);
    w("    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES");
    w(rows.map((r) => "  " + r.split("\n").join("\n  ")).join(",\n"));
    w("    ON CONFLICT (measure_id, issue_key) DO NOTHING;");
    w("  END LOOP;");
  } else {
    w("  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES");
    w(rows.join(",\n"));
    w("  ON CONFLICT (measure_id, issue_key) DO NOTHING;");
  }
  w();
}
w("END $$;");
w();

// ── verification ────────────────────────────────────────────────────────────
const rollTuples = seed.votes.map((v) => `('${v.chamber}'::text, ${v.congress}::integer, ${v.session}::integer, ${v.rollNumber}::integer)`);
// Two of the nine rolls were already live with a partial roster, so the member-vote floor is
// the seed's own count: the assertion is >=, never =, because an earlier pass may have
// attributed someone this roster does not carry.
const hr4405Var = varName({ congress: 119, number: "H.R. 4405" });

w("-- ---------------------------------------------------------------------------");
w("-- Verification");
w("-- ---------------------------------------------------------------------------");
wrap("Read-only, and scoped by tuple to exactly this pass's roll calls and measures so it can "
  + "only ever fail on data this migration is responsible for. A global count would drag in "
  + "every immigration and defence mapping earlier passes wrote and stop meaning anything.");
w("--");
wrap("Mapping counts assert >= rather than =, because three of this pass's measures already "
  + "carried the exact mappings it re-emits — S. 5 has four from migration 20260804000000, H.R. 29 "
  + "has four from an earlier pass, and the descriptive 'Senate Amendment to S. 5' row has two — "
  + "and because the S. 1071 mapping is written by a loop over every row with that number. The "
  + "S. 1071 check is therefore stated the other way round: NO row numbered S. 1071 may be left "
  + "without the strong_defense mapping. Member-vote counts assert >= for the same class of "
  + "reason — three of the nine rolls were already live, senate 119/1/7 with 83 attributed votes "
  + "against this seed's 39, so an existing roll legitimately holds more than the seed carries.");
w("--");
wrap("The orphan check is scoped to the six rolls this pass CREATED. The three that were "
  + "already live are excluded: house 119/1/6, house 119/1/23 and senate 119/1/7 hold "
  + "pre-existing member votes that came through an earlier and wider attribution path, and "
  + "failing on those would be failing on somebody else's data.");
w("-- ---------------------------------------------------------------------------");
w("DO $$");
w("DECLARE");
w("  n_rolls integer;");
w("  n_votes integer;");
w("  n_orphan integer;");
w("  n_issues integer;");
w("  n_pos integer;");
w("  n_parent integer;");
w("  n_ndaa_unmapped integer;");
w("  n_h23 integer;");
w("BEGIN");
w("  WITH want (chamber, congress, session, roll_number) AS (VALUES");
w("    " + rollTuples.join(",\n    "));
w("  ), roll_ids AS (");
w("    SELECT r.id FROM vr_rollcalls r JOIN want w");
w("      ON r.chamber = w.chamber AND r.congress = w.congress");
w("     AND r.session = w.session AND r.roll_number = w.roll_number");
w("  ), fresh (chamber, congress, session, roll_number) AS (VALUES");
w("    ('senate'::text, 119::integer, 1::integer, 3::integer),");
w("    ('senate'::text, 119::integer, 1::integer, 4::integer),");
w("    ('senate'::text, 119::integer, 1::integer, 6::integer),");
w("    ('senate'::text, 119::integer, 1::integer, 648::integer),");
w("    ('house'::text, 119::integer, 1::integer, 289::integer),");
w("    ('house'::text, 119::integer, 1::integer, 320::integer)");
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
w("         (SELECT count(*) FROM vr_measure_issues i WHERE i.measure_id IN (SELECT id FROM measure_ids)");
w(`            AND i.issue_key IN (${KEYS.map((k) => q(k)).join(", ")})),`);
w("         (SELECT count(*) FROM vr_positions p");
w("           WHERE p.measure_id IN (SELECT id FROM measure_ids) AND p.action_type IN ('sponsor', 'cosponsor')),");
w("         (SELECT count(*) FROM vr_measures a JOIN vr_measures p ON p.id = a.parent_id");
w("           WHERE a.congress = 119 AND a.chamber = 'senate'");
w("             AND a.number IN ('S.Amdt. 8', 'S.Amdt. 14', 'S.Amdt. 23')");
w("             AND p.congress = 119 AND p.chamber = 'senate' AND p.number = 'S. 5'),");
w("         (SELECT count(*) FROM vr_measures m WHERE m.congress = 119 AND m.number = 'S. 1071'");
w("            AND NOT EXISTS (SELECT 1 FROM vr_measure_issues i");
w("                             WHERE i.measure_id = m.id AND i.issue_key = 'strong_defense')),");
w("         (SELECT count(*) FROM vr_member_votes v JOIN vr_rollcalls r ON r.id = v.rollcall_id");
w("           WHERE r.chamber = 'house' AND r.congress = 119 AND r.session = 1 AND r.roll_number = 23)");
w("    INTO n_rolls, n_votes, n_orphan, n_issues, n_pos, n_parent, n_ndaa_unmapped, n_h23;");
w();
w("  RAISE NOTICE 'Landmark pass: % roll calls, % member votes, % issue mappings, % sponsorship rows', n_rolls, n_votes, n_issues, n_pos;");
w("  RAISE NOTICE 'Landmark pass: house 119/1/23 (S. 5, On Passage) now carries % attributed member votes', n_h23;");
w();
w(`  IF n_rolls <> ${seed.votes.length} THEN`);
w(`    RAISE EXCEPTION 'Landmark pass: expected ${seed.votes.length} roll calls, found %', n_rolls;`);
w("  END IF;");
w(`  IF n_votes < ${seed.memberVoteCount} THEN`);
w(`    RAISE EXCEPTION 'Landmark pass: expected at least ${seed.memberVoteCount} member votes on these roll calls, found %', n_votes;`);
w("  END IF;");
w("  IF n_orphan > 0 THEN");
w("    RAISE EXCEPTION 'Landmark pass: % member vote(s) on the rolls this pass created carry a politician_id outside db/vr-member-map.json', n_orphan;");
w("  END IF;");
w(`  IF n_issues < ${totalIssueRows} THEN`);
w(`    RAISE EXCEPTION 'Landmark pass: expected at least ${totalIssueRows} issue mappings on this pass''s measures, found %', n_issues;`);
w("  END IF;");
w(`  IF n_pos < ${HR4405_POSITIONS.length} THEN`);
w(`    RAISE EXCEPTION 'Landmark pass: expected at least ${HR4405_POSITIONS.length} H.R. 4405 sponsorship rows, found %', n_pos;`);
w("  END IF;");
w("  IF n_parent <> 3 THEN");
w("    RAISE EXCEPTION 'Landmark pass: expected all 3 Laken Riley amendments linked to their S. 5 parent, found % link(s)', n_parent;");
w("  END IF;");
w("  IF n_ndaa_unmapped > 0 THEN");
w("    RAISE EXCEPTION 'Landmark pass: % row(s) numbered S. 1071 carry no strong_defense mapping', n_ndaa_unmapped;");
w("  END IF;");
w(`  IF n_h23 < ${(seed.votes.find((v) => v.chamber === "house" && v.rollNumber === 23) || { memberVotes: [] }).memberVotes.length} THEN`);
w("    RAISE EXCEPTION 'Landmark pass: house 119/1/23 was not topped up — only % member votes', n_h23;");
w("  END IF;");
w("END $$;");

// Local prose wrapper used inside the DO block, where the prefix is already indented.
function wrapLocal(text, width = 84) {
  const lines = [];
  let line = "";
  for (const word of String(text).replace(/\s+/g, " ").trim().split(" ")) {
    if (line && (line + " " + word).length > width) { lines.push(line); line = word; }
    else line = line ? line + " " + word : word;
  }
  if (line) lines.push(line);
  return lines;
}

process.stdout.write(out.join("\n") + "\n");
process.stderr.write(
  `${seed.votes.length} rolls · ${seed.memberVoteCount} member votes · ${measures.length} measures `
  + `(${newMeasures.length} created, ${existingMeasures.length} looked up) · ${mappedRows} issue rows `
  + `across ${KEYS.length} keys (${KEYS.map((k) => `${k}:${keyRows(k)}`).join(", ")}) · `
  + `${HR4405_POSITIONS.length} sponsorship rows · `
  + `${pidCheck.checked} bioguide→pid pairs agree with the member map\n`
);
