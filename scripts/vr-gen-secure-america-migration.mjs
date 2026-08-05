#!/usr/bin/env node
// ---------------------------------------------------------------------------
// vr-gen-secure-america-migration.mjs
// ---------------------------------------------------------------------------
// Turns db/vr-secure-america-vote-seed.json plus the matching rows in
// db/vr-issue-seed.json into a forward-only migration for the Secure America Act
// (S. 2, 119th Congress → Public Law 119-98) and the two amendment rolls from its
// vote-a-rama that isolate a single provision each. The seed is the mirror; this
// file is the source of truth for what reaches the database.
//
//   node scripts/vr-gen-secure-america-migration.mjs > netlify/database/migrations/<ts>_vr_secure_america_act_rollcalls.sql
//
// Shape, and why each part is shaped that way:
//
//   · EVERY measure here is a create. A read-only probe of the live database before
//     this pass found no vr_measures row matching 'S. 2', 'S.Amdt. 5453/5463/5763/
//     5813' or title ilike '%Secure America%', no vr_rollcalls in senate 119/2/
//     130-170 or house 119/2/205-220, and no issue rows for any of them. So unlike
//     the landmark pass — where S. 5, H.R. 29 and S. 1071 were looked up and never
//     re-described — nothing in this file can overwrite a row another migration
//     owns. The inserts are still SELECT-guarded, because vr_measures has NO unique
//     index on (congress, number) and an unguarded insert would be the one thing
//     that could create the duplicate the guard exists to prevent.
//   · S. 2 is emitted FIRST so both amendments can take parent_id from an
//     already-populated variable, and they nest under it the way S.Amdt. 8 nests
//     under S. 5. The ordering is asserted, not assumed: a child whose parent is not
//     in the emission list throws at generation time.
//   · Roll calls and member votes are ON CONFLICT DO NOTHING on the tuples the
//     tables are themselves unique on — (chamber, congress, session, roll_number)
//     and (rollcall_id, politician_id) — so a re-run is a no-op and a roll another
//     pass reaches first keeps its own row.
//   · Issue rows come verbatim from db/vr-issue-seed.json, each with its
//     provision-level rationale and a primary source; scripts/test-mapping-
//     discipline.mjs requires both. Four axes on S. 2, one on each amendment, and
//     SEVEN axes declined with reasons — the declined list is in the header because
//     on a two-title reconciliation bill the axes NOT mapped are the substance of
//     the editorial judgement, not a footnote to it.
//   · No vr_positions rows. S. 2 was reported as an original measure by the
//     Committee on the Budget and has no cosponsors to record.
//
// WHY THE AXES ARE FEW
// --------------------
// The instruction for a multi-title bill is to map the meaningful axes rather than
// force everything onto one key, preferring precision over breadth. The enrolled
// text makes that a small number here, because S. 2's two titles are one subject
// split on COMMITTEE JURISDICTION, not on theme: every Title I appropriation (Secs.
// 101, 102, 103(a)(6)) is expressly limited to "functions other than immigration
// enforcement and customs functions" because Title I is HSGAC's reconciliation
// jurisdiction and cannot reach immigration enforcement, while Title II is the
// Judiciary Committee's and says in terms that its money is for immigration
// enforcement. Reading the bill off its short title would collapse that split and
// score all $69.5 billion as one undifferentiated enforcement vote. Four axes
// survived, each weighted from a dollar share: deportations (100, primary, $44.095B
// = 63% of the Act), border_security (90, $26.020B), tough_on_crime (40, Sec. 102's
// statutorily NON-immigration $7.450B) and immig_fentanyl (50, Sec. 103's narcotics
// purposes). A mapping attaches to the MEASURE, so each one is applied at full
// strength to BOTH passage rolls and to all 430 House and 99 Senate members who cast
// them — which is the reason every weight is argued from the text rather than felt.
//
// ROW SCOPE IS STATED AS DATA, NOT INFERRED
// -----------------------------------------
// PASS_ROLLS below is the frozen list of the four rolls this migration published. A
// generator whose output silently widens over its own applied migration invites
// exactly the mistake the runbook forbids — regenerating a file the database has
// already run — so a fifth roll added to the seed later is NOT picked up here and
// gets its own forward migration. The seed's narrative fields (scanCoverage,
// enactedLawFinding, declinedFacets, declinedRollCalls) DO track the seed, so a
// re-run reflects a later correction to the prose while the row scope stays frozen.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { assertSeedPidsMatchMap } from "./vr-seed-pid-guard.mjs";
const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const SEED_PATH = "db/vr-secure-america-vote-seed.json";
const seedFile = JSON.parse(fs.readFileSync(path.join(ROOT, SEED_PATH), "utf8"));
const issueSeed = JSON.parse(fs.readFileSync(path.join(ROOT, "db/vr-issue-seed.json"), "utf8"));
const memberMap = JSON.parse(fs.readFileSync(path.join(ROOT, "db/vr-member-map.json"), "utf8"));
const ROSTER = [...new Set(Object.values(memberMap.map || {}))].sort();

const PASS_ROLLS = new Set([
  "senate|119|2|163", // S. 2 — On Passage of the Bill, 52-47 (P.L. 119-98)
  "house|119|2|214",  // S. 2 — On Passage, 214-212 (P.L. 119-98)
  "senate|119|2|160", // S.Amdt. 5463 — Cortez Masto, local police hiring, REJECTED 45-53
  "senate|119|2|156", // S.Amdt. 5813 — Gallego, DACA renewal adjudication, REJECTED 47-52
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

// ── measures, parent before child ───────────────────────────────────────────
// Collected from the vote rows rather than restated here, so the measure a roll call
// points at is by construction the measure the seed says that roll call is about.
const measures = [];
const seenMeasure = new Set();
for (const v of seed.votes) {
  const m = v.measure;
  const k = ikey(m.congress, m.chamber, m.number);
  if (seenMeasure.has(k)) continue;
  seenMeasure.add(k);
  measures.push({ ...m, var: varName(m) });
}
// Parents first. Both amendments carry parentNumber 'S. 2', which this same pass creates
// (unlike the landmark pass, where the parent vehicle S. 5 pre-existed), so the parent has
// a create block of its own and simply has to be emitted before its children.
measures.sort((a, b) => Number(!!a.parentNumber) - Number(!!b.parentNumber));
for (const m of measures) {
  if (!m.parentNumber) continue;
  const pk = ikey(m.parentCongress, m.parentChamber, m.parentNumber);
  const parent = measures.find((x) => ikey(x.congress, x.chamber, x.number) === pk);
  // Fail closed at generation time. A missing parent would emit a NULL parent_id and
  // silently un-nest the amendment, which is the kind of thing nobody notices until a
  // profile shows an amendment with no bill above it.
  if (!parent) {
    throw new Error(
      `${m.number} declares parent ${m.parentNumber} (${m.parentCongress}th ${m.parentChamber}) `
      + "but no vote row in the seed carries that measure, so parent_id cannot be resolved."
    );
  }
  if (measures.indexOf(parent) > measures.indexOf(m)) {
    throw new Error(`${m.number} would be emitted before its parent ${parent.number}.`);
  }
  m.parentVar = parent.var;
}

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

// ── header ──────────────────────────────────────────────────────────────────
w("-- ---------------------------------------------------------------------------");
w("-- Secure America Act — S. 2, Public Law 119-98 (119th Congress, 2nd session)");
w("-- ---------------------------------------------------------------------------");
w("-- Generated by scripts/vr-gen-secure-america-migration.mjs from db/vr-secure-america-vote-seed.json.");
w("-- Do not hand-edit: regenerate, or roll forward with a new migration.");
w("--");
w(`-- ${num(seed.votes.length)} roll calls · ${num(seed.memberVoteCount)} attributed member votes`);
w(`-- ${measures.length} measure(s), all created here — none of them existed in vr_measures`);
w(`-- ${totalIssueRows} issue mapping(s) across ${KEYS.length} key(s): ${KEYS.join(", ")}`);
w(`-- ${seed.declinedRollCalls.length} roll calls and ${seed.declinedFacets.length} issue axes considered and declined`);
w("--");
w("-- WHAT THIS ADDS");
wrap("The Secure America Act is enacted law — the second-largest immigration measure of the "
  + "119th Congress after the reconciliation act it cross-references, and until this migration "
  + "it was absent from the record entirely: no measure row, no roll call, no mapping. Its two "
  + "passage rolls are the most separating immigration votes available, and they separate in "
  + "opposite directions from each other on nothing at all — House 214-212 with R 214-0 and D "
  + "0-211, Senate 52-47 with one crossover each way — so on their own they are a near-perfect "
  + "party proxy. That is exactly why the two amendment rolls are here. Roll 119/2/160 asks the "
  + "same senators whether to fund LOCAL police hiring out of the same bill and gets the "
  + "opposite split (45-53, D 43-0 / R 0-53), and roll 119/2/156 asks whether to fund "
  + "adjudication of DACA renewals (47-52). Each isolates one provision, which is the only "
  + "thing an amendment roll can do and the only reason to admit one.");
w("--");
w("-- THE ENACTED-LAW FINDING, AND THE TITLE TRAP IN THE BILLSTATUS FEED");
wrap(seed.enactedLawFinding);
w("--");
w("-- WHAT WAS SCANNED");
wrap(seed.scanCoverage);
w("--");
w("-- WHERE A ROLL'S OWN ARITHMETIC LIMITS WHAT IT CAN TEST");
for (const c of seed.marginCaveats || []) wrapBullet(`${c.roll} — ${c.caveat}`);
w("--");
w("-- ISSUE AXES DECLINED, AND WHY");
wrap("S. 2 is a two-title reconciliation bill, which is the condition under which \"map the "
  + "distinct policy axes\" turns into forcing. A mapping attaches to the MEASURE, so every axis "
  + "added here is applied at full strength to both passage rolls and to every member who cast "
  + "one. Four axes survived that test on the bill — deportations (100, primary), "
  + "border_security (90), immig_fentanyl (50) and tough_on_crime (40), each weighted for the "
  + "share of the $69.545 billion it actually represents — and one each on the two amendments. "
  + "These did not:");
for (const d of seed.declinedFacets || []) {
  wrapBullet(`${d.measure}${d.facet ? ` — ${d.facet} NOT mapped: ` : " — "}${d.why}`);
}
w("--");
w("-- ROLL CALLS CONSIDERED AND DECLINED");
wrap("S. 2 drew 28 Senate roll calls and 2 House roll calls of its own. Four are admitted. The "
  + "other 26 are listed here with their verified tallies so that a later pass can see they were "
  + "READ AND REJECTED rather than missed — the largest class being the seventeen \"Motion to "
  + "Waive All Applicable Budgetary Discipline\" rolls, which carry a 60-vote Byrd-rule threshold "
  + "and therefore include SEVEN that are recorded as Rejected while having more yeas than nays. "
  + "Scoring one of those as a defeat of the amendment's subject would invert the member's "
  + "actual position.");
for (const d of seed.declinedRollCalls || []) {
  const where = [d.chamber, d.congress && d.session ? `${d.congress}/${d.session}` : null, d.roll ? `roll ${d.roll}` : null]
    .filter(Boolean).join(" ");
  wrapBullet(`${d.number}${where ? ` ${where}` : ""} (${d.totals}) — ${d.why}`);
}
w("--");
w("-- TWO AMENDMENT ROLLS, ADMITTED BY EXCEPTION");
for (const v of seed.votes.filter((x) => x.decisiveWhy)) {
  wrapBullet(`${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber} (${v.measure.number}, `
    + `${v.totals.yea}-${v.totals.nay} ${v.result}): ${v.decisiveWhy}`);
}
w("--");
w("-- ATTRIBUTION IS FAIL-CLOSED");
wrap("The House roll attributes on the bioguide id in the Clerk's XML against "
  + "db/vr-member-map.json — a direct lookup, and an unmapped member is skipped and counted, "
  + "never guessed. Senate XML carries no bioguide id, so a senator resolves on (surname, state) "
  + "against the roster and only a UNIQUE hit is accepted; matching is tail-anchored on whole "
  + "name parts so 'Van Hollen' and 'Cortez Masto' match as units. totals is the FULL chamber "
  + "tally and is_party is computed from the full recorded vote BEFORE the roster filter, so a "
  + "partial roster cannot invent a margin or a party crossover. Every roll is re-verified "
  + "against the chamber's own document before ingest: <legis-num> plus <vote-question> for the "
  + "House, document_type plus document_number plus question for the Senate bill roll, and "
  + "amendment_number plus amendment_to_amendment_number plus amendment_to_document_number for "
  + "the two amendment rolls, because the Senate leaves document_number EMPTY on an amendment "
  + "vote. The House tally is read from <totals-by-vote> and never from the first <yea-total> in "
  + "the file: each <totals-by-party> block carries its own <yea-total>, so a first-match read "
  + "returns one party's sub-total as if it were the chamber's.");
w("--");
wrap("Idempotent: every write is guarded and a re-run is a no-op. All four rolls, all three "
  + "measures and all six mappings are new — a read-only probe of the live database confirmed "
  + "before generation that none of them existed — but they are written guarded anyway. "
  + "ON CONFLICT (chamber, congress, session, roll_number) DO NOTHING on the rolls, ON CONFLICT "
  + "(rollcall_id, politician_id) DO NOTHING on the member votes, ON CONFLICT (measure_id, "
  + "issue_key) DO NOTHING on the mappings, and a SELECT ... IF NULL guard on each measure "
  + "because vr_measures has no unique index on (congress, number) and an unguarded insert is "
  + "the only way to create the duplicate that guard is for.");
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
  const c = m.create;
  if (!c) throw new Error(`${m.number} carries no create block — every measure in this pass is new.`);
  w(`  -- ${m.number} (${m.congress}th ${m.chamber}) — ${c.title}`);
  if (m.parentVar) {
    for (const line of wrapLocal(
      `Nests under ${m.parentNumber}, created above in this same block. parent_id is taken from `
      + "that variable rather than from a lookup, so the link cannot be left NULL by an ordering "
      + "accident."
    )) w(`  --   ${line}`);
  }
  w(`  SELECT id INTO ${m.var} FROM vr_measures`);
  w(`   WHERE congress = ${m.congress} AND chamber = ${q(m.chamber)} AND number = ${q(m.number)} LIMIT 1;`);
  w(`  IF ${m.var} IS NULL THEN`);
  const cols = "measure_type, congress, chamber, number, title, short_title, summary, introduced_at, status, source_url, source_label, external_ids"
    + (m.parentVar ? ", parent_id" : "")
    + (c.sponsorId ? ", sponsor_id" : "");
  w(`    INSERT INTO vr_measures (${cols})`);
  w(`    VALUES (${q(m.measureType)}, ${m.congress}, ${q(m.chamber)}, ${q(m.number)}, ${q(c.title)}, ${qOrNull(c.shortTitle)},`);
  w(`      ${q(c.summary)},`);
  w(`      ${c.introducedAt ? `DATE ${q(c.introducedAt)}` : "NULL"}, ${q(c.status)}, ${q(c.sourceUrl)}, ${q(c.sourceLabel)}, ${q(JSON.stringify(c.externalIds))}::jsonb`
    + `${m.parentVar ? `, ${m.parentVar}` : ""}${c.sponsorId ? `, ${q(c.sponsorId)}` : ""})`);
  w(`    RETURNING id INTO ${m.var};`);
  if (m.parentVar) {
    // A re-run over a row some later pass created without the link still gets the link,
    // which is what the amendment-parent backfill migration exists to do generally.
    w("  ELSE");
    w(`    UPDATE vr_measures SET parent_id = ${m.parentVar}, updated_at = now()`);
    w(`     WHERE id = ${m.var} AND parent_id IS NULL;`);
  }
  w("  END IF;");
  w(`  IF ${m.var} IS NULL THEN`);
  w(`    RAISE EXCEPTION ${q(`Secure America pass: ${m.number} could not be read back after insert.`)};`);
  w("  END IF;");
  w();
}

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
  w(`    RAISE EXCEPTION ${q(`Secure America pass: ${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber} could not be read back after insert.`)};`);
  w("  END IF;");
  w("  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES");
  w(v.memberVotes.map((x) => `    (rc, ${q(x.politicianId)}, ${q(x.position)}, ${qOrNull(x.isParty)})`).join(",\n"));
  w("  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;");
  w();
}

// ── issue mappings ──────────────────────────────────────────────────────────
w("  -- ── issue mappings ────────────────────────────────────────────────────────");
w("  -- Curated in db/vr-issue-seed.json, with the provision-level rationale and a primary");
w("  -- source on every row — scripts/test-mapping-discipline.mjs requires both. The seed is");
w("  -- what POST /api/vr-ingest/seed-issues re-asserts, so a mapping this migration writes and");
w("  -- the seed does not carry would be undone by the next ingest; these agree by construction,");
w("  -- because the generator reads the seed rather than restating it.");
w();
let mappedRows = 0;
for (const m of measures) {
  const { issues, sourceUrl } = issuesFor(m);
  if (!issues.length) {
    // Never invented at generation time. A measure with no curated mapping gets none.
    throw new Error(
      `${m.number} (${m.congress}th ${m.chamber}) has no entry in db/vr-issue-seed.json — a `
      + "mapping is curated, never derived from a title at generation time."
    );
  }
  const facets = issues.map((i) => `${i.issueKey} ${i.supportMeaning} w${i.weight}${i.isPrimary ? " PRIMARY" : ""}`).join(", ");
  w(`  -- ${m.number} (${m.congress}th) — ${facets}`);
  w("  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES");
  w(issues.map((i) => {
    mappedRows++;
    return `    (${m.var}, ${q(i.issueKey)}, ${i.weight}, ${i.isPrimary ? "true" : "false"}, ${q(i.supportMeaning)},\n`
      + `      ${q(i.rationale)},\n      ${qOrNull(i.sourceUrl || sourceUrl)})`;
  }).join(",\n"));
  w("  ON CONFLICT (measure_id, issue_key) DO NOTHING;");
  w();
}
w("END $$;");
w();

// ── verification ────────────────────────────────────────────────────────────
const rollTuples = seed.votes.map((v) => `('${v.chamber}'::text, ${v.congress}::integer, ${v.session}::integer, ${v.rollNumber}::integer)`);
const amendmentNumbers = measures.filter((m) => m.parentNumber).map((m) => q(m.number));

w("-- ---------------------------------------------------------------------------");
w("-- Verification");
w("-- ---------------------------------------------------------------------------");
wrap("Read-only, and scoped by tuple to exactly this pass's roll calls and measures so it can "
  + "only ever fail on data this migration is responsible for. A global count would drag in "
  + "every immigration mapping earlier passes wrote and stop meaning anything.");
w("--");
wrap("Roll-call and mapping counts assert equality, not >=, because every row in this pass is "
  + "new: nothing here re-emits a mapping another migration already wrote, which is what forced "
  + "the >= in the landmark pass. Member-vote counts still assert >=, because a later and wider "
  + "roster expansion legitimately tops these rolls up beyond what this seed carried and a "
  + "re-run must not then fail. The orphan check covers all four rolls for the same reason the "
  + "landmark pass had to exclude three of its nine: there is no pre-existing attribution here "
  + "to be unfair to.");
w("-- ---------------------------------------------------------------------------");
w("DO $$");
w("DECLARE");
w("  n_rolls integer;");
w("  n_votes integer;");
w("  n_orphan integer;");
w("  n_issues integer;");
w("  n_measures integer;");
w("  n_parent integer;");
w("  n_enacted integer;");
w("  n_s2_senate integer;");
w("  n_s2_house integer;");
w("BEGIN");
w("  WITH want (chamber, congress, session, roll_number) AS (VALUES");
w("    " + rollTuples.join(",\n    "));
w("  ), roll_ids AS (");
w("    SELECT r.id FROM vr_rollcalls r JOIN want w");
w("      ON r.chamber = w.chamber AND r.congress = w.congress");
w("     AND r.session = w.session AND r.roll_number = w.roll_number");
w("  ), mine (congress, chamber, number) AS (VALUES");
w("    " + measures.map((m) => `(${m.congress}::integer, '${m.chamber}'::text, ${q(m.number)}::text)`).join(",\n    "));
w("  ), measure_ids AS (");
w("    SELECT m.id FROM vr_measures m JOIN mine k");
w("      ON m.congress = k.congress AND m.chamber = k.chamber AND m.number = k.number");
w("  )");
w("  SELECT (SELECT count(*) FROM roll_ids),");
w("         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM roll_ids)),");
w("         (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id IN (SELECT id FROM roll_ids)");
w("            AND v.politician_id NOT IN (");
w("              " + ROSTER.map((s) => q(s)).join(", "));
w("            )),");
w("         (SELECT count(*) FROM vr_measure_issues i WHERE i.measure_id IN (SELECT id FROM measure_ids)");
w(`            AND i.issue_key IN (${KEYS.map((k) => q(k)).join(", ")})),`);
w("         (SELECT count(*) FROM measure_ids),");
w("         (SELECT count(*) FROM vr_measures a JOIN vr_measures p ON p.id = a.parent_id");
w("           WHERE a.congress = 119 AND a.chamber = 'senate'");
w(`             AND a.number IN (${amendmentNumbers.join(", ")})`);
w("             AND p.congress = 119 AND p.chamber = 'senate' AND p.number = 'S. 2'),");
w("         (SELECT count(*) FROM vr_measures m WHERE m.congress = 119 AND m.chamber = 'senate'");
w("            AND m.number = 'S. 2' AND m.status = 'enacted'");
w("            AND m.external_ids ->> 'publicLaw' = '119-98'),");
w("         (SELECT count(*) FROM vr_member_votes v JOIN vr_rollcalls r ON r.id = v.rollcall_id");
w("           WHERE r.chamber = 'senate' AND r.congress = 119 AND r.session = 2 AND r.roll_number = 163),");
w("         (SELECT count(*) FROM vr_member_votes v JOIN vr_rollcalls r ON r.id = v.rollcall_id");
w("           WHERE r.chamber = 'house' AND r.congress = 119 AND r.session = 2 AND r.roll_number = 214)");
w("    INTO n_rolls, n_votes, n_orphan, n_issues, n_measures, n_parent, n_enacted, n_s2_senate, n_s2_house;");
w();
w("  RAISE NOTICE 'Secure America pass: % roll calls, % member votes, % issue mappings, % measures', n_rolls, n_votes, n_issues, n_measures;");
w("  RAISE NOTICE 'Secure America pass: S. 2 passage attributed on % Senate and % House member votes', n_s2_senate, n_s2_house;");
w();
w(`  IF n_rolls <> ${seed.votes.length} THEN`);
w(`    RAISE EXCEPTION 'Secure America pass: expected ${seed.votes.length} roll calls, found %', n_rolls;`);
w("  END IF;");
w(`  IF n_measures <> ${measures.length} THEN`);
w(`    RAISE EXCEPTION 'Secure America pass: expected ${measures.length} measure rows, found % — (congress, number) is not unique, so a duplicate is possible', n_measures;`);
w("  END IF;");
w(`  IF n_votes < ${seed.memberVoteCount} THEN`);
w(`    RAISE EXCEPTION 'Secure America pass: expected at least ${seed.memberVoteCount} member votes on these roll calls, found %', n_votes;`);
w("  END IF;");
w("  IF n_orphan > 0 THEN");
w("    RAISE EXCEPTION 'Secure America pass: % member vote(s) carry a politician_id outside db/vr-member-map.json', n_orphan;");
w("  END IF;");
w(`  IF n_issues <> ${totalIssueRows} THEN`);
w(`    RAISE EXCEPTION 'Secure America pass: expected ${totalIssueRows} issue mappings on this pass''s measures, found %', n_issues;`);
w("  END IF;");
w(`  IF n_parent <> ${amendmentNumbers.length} THEN`);
w(`    RAISE EXCEPTION 'Secure America pass: expected all ${amendmentNumbers.length} amendments linked to their S. 2 parent, found % link(s)', n_parent;`);
w("  END IF;");
w("  IF n_enacted <> 1 THEN");
w("    RAISE EXCEPTION 'Secure America pass: S. 2 is not recorded as enacted law 119-98 (found % row(s))', n_enacted;");
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
  `${seed.votes.length} rolls · ${seed.memberVoteCount} member votes · ${measures.length} measures created · `
  + `${mappedRows} issue rows across ${KEYS.length} keys (${KEYS.map((k) => `${k}:${keyRows(k)}`).join(", ")}) · `
  + `${seed.declinedRollCalls.length} rolls and ${seed.declinedFacets.length} axes declined · `
  + `${pidCheck.checked} bioguide→pid pairs agree with the member map\n`
);
