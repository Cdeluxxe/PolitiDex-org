#!/usr/bin/env node
// ---------------------------------------------------------------------------
// vr-gen-fiscal-enforcement-migration.mjs
// ---------------------------------------------------------------------------
// Turns db/vr-fiscal-enforcement-vote-seed.json plus the matching rows in
// db/vr-issue-seed.json into a forward-only migration for the 119th Congress's decisive
// money-and-enforcement votes: H.R. 1 (One Big Beautiful Bill Act, P.L. 119-21), H.R. 4
// (Rescissions Act of 2025, P.L. 119-28), S. 331 (HALT Fentanyl Act, P.L. 119-26) and the
// House-passed H.R. 3486 (Stop Illegal Entry Act of 2025, NOT law). The seed is the mirror;
// this file is the source of truth for what reaches the database.
//
//   node scripts/vr-gen-fiscal-enforcement-migration.mjs > netlify/database/migrations/<ts>_vr_fiscal_enforcement_rollcalls.sql
//
// Shape, and why each part is shaped that way:
//
//   · THE PASS IS AN ATTRIBUTION PASS, NOT A DISCOVERY PASS. Three of the four measures are
//     already in the record with curated mappings and almost nobody attached to them: H.R. 1
//     carries FOURTEEN mapped issue keys and 39 hand-listed voters on the roll that sent it
//     to the President, H.R. 4 carries SEVEN keys and nine voters, S. 331 carries three keys
//     and eight senators out of 100. A mapped measure with no voters ranks nobody, so the
//     largest available rankability gain is people, not bills.
//   · Measures come in two kinds and the generator will not confuse them. A measure marked
//     `mustExist` is LOOKED UP and never inserted — re-describing a row another migration
//     owns is how two competing descriptions of the same bill get written — and if one is
//     gone the migration RAISES rather than quietly creating a second. Only H.R. 3486, the
//     one genuinely new measure, carries a `create` block.
//   · EVERY lookup keys on measure_type, congress, chamber AND number. This is not defensive
//     boilerplate: migration 20260816000000_vr_election_facet_rollcalls.sql created a
//     117th-Congress H.R. 1 (For the People Act) and a 117th-Congress H.R. 4 (John R. Lewis
//     Voting Rights Advancement Act). A lookup on number alone would hang reconciliation and
//     rescission votes on two voting-rights bills.
//   · Roll calls and member votes are ON CONFLICT DO NOTHING on the tuples the tables are
//     themselves unique on. FIVE of the eight rolls are already live and are re-emitted for
//     exactly this reason: the insert tops up their member votes without disturbing the
//     roll's own row, including its question text where the database and the chamber's XML
//     word the same vote differently.
//   · Issue rows come verbatim from db/vr-issue-seed.json, each with its rationale and a
//     primary source — scripts/test-mapping-discipline.mjs requires both. Fourteen rows are
//     emitted and ELEVEN of them are byte-identical re-emissions of rows that are already
//     live; two are the new measure H.R. 3486's own axes; and exactly ONE is a new axis on an
//     existing measure (H.R. 4 → america_first_fp).
//   · vr_positions carries H.R. 3486's one resolvable cosponsor. The bill's sponsor, Rep.
//     Stephanie Bice (R-OK-5), is not on the PolitiDex roster, so her sponsorship is recorded
//     in prose and not as a row: a position cannot be attributed to a profile that does not
//     exist, and sponsor_id is left NULL rather than filled with a slug that resolves to
//     nobody.
//
// WHAT THIS MIGRATION DOES NOT TOUCH
// ----------------------------------
// No title, short_title, summary or status of an existing row is rewritten. H.R. 1, H.R. 4
// and S. 331 are all already status 'enacted' with their public law numbers in external_ids,
// so there is no enactment backfill to do and none is attempted. H.R. 1's fourteen live
// mappings are left exactly as the omnibus-split migration 20260720000000 and the Senate
// pass 20260724120000 wrote them — this pass adds no fifteenth key, changes no weight and
// changes no direction. Its contribution to H.R. 1 is 180 attributed member votes across
// three rolls, which is what makes those fourteen mappings score anybody at all.
//
// A NOTE ON WHAT THE CURATED SEED CARRIES FOR H.R. 1
// -------------------------------------------------
// db/vr-issue-seed.json holds FIVE of H.R. 1's fourteen mappings, not all fourteen, and that
// is deliberate rather than an oversight. applyCuratedIssueSeed() upserts with
// onConflictDoUpdate, so every rationale mirrored into that file OVERWRITES the live row on
// the next POST /seed-issues. The nine mappings this pass does not mirror were first written
// by 20260720000000; the later 20260807000000 re-asserts them with ON CONFLICT DO NOTHING and
// different wording, so the live text is the earlier file's. Mirroring the wrong one of two
// candidate texts would silently rewrite nine good rationales, and mirroring is worth nothing
// here — the rows already exist. So the seed mirrors only the five it can match exactly, the
// generator emits what the seed holds, and the verification below asserts >= rather than =.
//
// ROW SCOPE IS STATED AS DATA, NOT INFERRED
// -----------------------------------------
// PASS_ROLLS below is the frozen list of the eight rolls this migration published. A
// generator whose output silently widens over its own applied migration invites exactly the
// mistake the runbook forbids — regenerating a file the database has already run — so a later
// roll added to the seed is NOT picked up here and gets its own forward migration. The seed's
// narrative fields (scanCoverage, enactedLawFinding, declinedFacets, declinedRollCalls) DO
// track the seed, so a re-run reflects a later correction to the prose while the row scope
// stays frozen.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { assertSeedPidsMatchMap } from "./vr-seed-pid-guard.mjs";
const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const SEED_PATH = "db/vr-fiscal-enforcement-vote-seed.json";
const seedFile = JSON.parse(fs.readFileSync(path.join(ROOT, SEED_PATH), "utf8"));
const issueSeed = JSON.parse(fs.readFileSync(path.join(ROOT, "db/vr-issue-seed.json"), "utf8"));
const memberMap = JSON.parse(fs.readFileSync(path.join(ROOT, "db/vr-member-map.json"), "utf8"));
const ROSTER = [...new Set(Object.values(memberMap.map || {}))].sort();

// ── the eight rolls, and which of them this pass CREATED ─────────────────────
// `fresh: true` means the roll did not exist before this migration. It drives two things:
// the header's idempotency paragraph, and the orphan check in the verification block, which
// is scoped to fresh rolls only — the five pre-existing rolls hold member votes written by
// earlier and wider attribution paths, and failing on those would be failing on somebody
// else's data.
const PASS_ROLLS = new Map([
  // H.R. 1 — One Big Beautiful Bill Act (P.L. 119-21), fourteen mapped axes
  ["house|119|1|145", { fresh: true, why: "On Passage, 215-214 — the narrowest passage of the 119th. NEW roll: the record had nothing for the House's first vote on the reconciliation act." }],
  ["senate|119|1|372", { fresh: false, why: "On Passage of the Bill, 50-50 with the Vice President breaking the tie. Live since 20260724120000 with hand-listed senators; topped up here." }],
  ["house|119|1|190", { fresh: false, why: "On Motion to Concur in the Senate Amendment, 218-214 — the vote that sent it to the President. Live with 39 attributed voters out of 432; topped up to the full roster." }],
  // H.R. 4 — Rescissions Act of 2025 (P.L. 119-28)
  ["house|119|1|168", { fresh: false, why: "On Passage, 214-212. Live since 20260719150000 with NINE attributed voters out of 432; topped up to the full roster." }],
  ["senate|119|1|411", { fresh: false, why: "On Passage of the Bill, 51-48. Topped up." }],
  // S. 331 — HALT Fentanyl Act (P.L. 119-26)
  ["senate|119|1|127", { fresh: false, why: "On Passage of the Bill, 84-16. Live since 20260721170000 with EIGHT attributed senators out of 100; topped up." }],
  ["house|119|1|166", { fresh: true, why: "On Passage, 321-104. NEW roll: the House's own vote on the fentanyl bill was missing entirely, and its 104 nays are the only place the record separates the Democratic caucus on permanent class-wide scheduling." }],
  // H.R. 3486 — Stop Illegal Entry Act of 2025 (House-passed, not law)
  ["house|119|1|264", { fresh: true, why: "On Passage, 226-197. NEW measure and NEW roll." }],
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
const freshRolls = [...PASS_ROLLS.entries()].filter(([, m]) => m.fresh).map(([k]) => k.split("|"));
const liveRolls = [...PASS_ROLLS.entries()].filter(([, m]) => !m.fresh).map(([k]) => k.split("|"));

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
// `mustExist`     provenance: which migration owns the row, so a reader knows where the
//                 description this pass refuses to rewrite actually came from.
// `mappingNote`   why re-emitting the mapping is a deliberate no-op rather than an edit.
const MEASURE_RULES = {
  "119|house|hr1": {
    mustExist:
      "Created by migration 20260724120000_seed_senate_voting_record.sql. Status is already "
      + "'enacted' and external_ids already carries P.L. 119-21 (migration 20260807000000), so "
      + "there is nothing to backfill and nothing is rewritten.",
    mappingNote:
      "Five of H.R. 1's FOURTEEN live mappings, byte-identical to what migration "
      + "20260724120000 wrote. The other nine (tax_middle_class, national_debt, family_support, "
      + "climate_action, energy_production, deportations, strong_defense, school_choice, "
      + "edu_college_cost) were first written by 20260720000000_hr1_omnibus_component_issues.sql "
      + "and are NOT re-emitted, because db/vr-issue-seed.json does not mirror them and "
      + "applyCuratedIssueSeed() upserts — mirroring the wrong one of two candidate texts would "
      + "overwrite nine good rationales for no gain. All fourteen score the 180 member votes "
      + "this pass attributes; the five below are simply the ones the curated seed can assert.",
  },
  "119|house|hr4": {
    mustExist:
      "Created by migration 20260719150000_seed_rescissions_voting_record.sql. Already status "
      + "'enacted'; P.L. 119-28, signed 2025-07-24. Not rewritten.",
    mappingNote:
      "cut_spending, gov_waste and national_debt are byte-identical to 20260719150000 and are "
      + "no-ops; they are here because the curated seed carries them and the ingest endpoint "
      + "re-asserts the seed. FOUR further mappings are live on this measure and are NOT emitted "
      + "here — america_first 60, audit_spending 55, gov_services 45 yea_opposes and free_speech 30 "
      + "yea_opposes, all from 20260721140000_seed_legislation_deepdive.sql — so H.R. 4 already "
      + "carries seven axes and leaves this pass with eight. america_first_fp is the ONE new one. It "
      + "sits deliberately beside the already-live america_first: same $7.9 billion of rescinded "
      + "State and USAID balances, but america_first_fp is the chip whose own text says 'rethink "
      + "foreign aid commitments' and the chip 22 rostered members hold a position on, against 4 for "
      + "america_first. Both are yea_supports and cannot contradict; the opposite-direction "
      + "precedent is H.R. 815, mapped america_first_fp 70 yea_OPPOSES by 20260810000000. See the "
      + "header for why foreign_balance and checks_balances were declined, and why gov_services is "
      + "recorded as a disagreement rather than removed.",
  },
  "119|senate|s331": {
    mustExist:
      "Created by migration 20260721170000_seed_legislation_expansion.sql, inside an "
      + "IF m_id IS NULL guard. Already status 'enacted'; P.L. 119-26, signed 2025-07-16.",
    mappingNote:
      "All three byte-identical to 20260721170000 — immig_fentanyl primary, tough_on_crime, and "
      + "health_mental as yea_opposes for the treatment-over-enforcement objection. No new key: "
      + "healthcare was considered and declined because health_mental already carries that "
      + "reading more precisely.",
  },
};
const rulesFor = (m) => MEASURE_RULES[ikey(m.congress, m.chamber, m.number)] || {};

// Measures in emission order: lookups first, then the one create.
const measures = [];
const seenMeasure = new Set();
for (const v of seed.votes) {
  const m = v.measure;
  const k = ikey(m.congress, m.chamber, m.number);
  if (seenMeasure.has(k)) continue;
  seenMeasure.add(k);
  measures.push({ ...m, var: varName(m), ...rulesFor(m) });
}
measures.sort((a, b) => Number(!!a.create) - Number(!!b.create));

// ── sponsorship rows, taken from the seed's own measure.positions ────────────
const POSITIONS = [];
for (const m of measures) {
  for (const p of m.positions || []) POSITIONS.push({ ...p, measureVar: m.var, measureNumber: m.number });
}

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

const keyRows = (key) => measures.reduce((n, m) => n + issuesFor(m).issues.filter((i) => i.issueKey === key).length, 0);
const KEYS = [...new Set(measures.flatMap((m) => issuesFor(m).issues.map((i) => i.issueKey)))].sort();
const totalIssueRows = measures.reduce((n, m) => n + issuesFor(m).issues.length, 0);
const newMeasures = measures.filter((m) => m.create);
const existingMeasures = measures.filter((m) => !m.create);

// ── header ──────────────────────────────────────────────────────────────────
w("-- ---------------------------------------------------------------------------");
w("-- Money and enforcement — H.R. 1, H.R. 4, S. 331, H.R. 3486 (119th Congress)");
w("-- ---------------------------------------------------------------------------");
w("-- Generated by scripts/vr-gen-fiscal-enforcement-migration.mjs from");
w("-- db/vr-fiscal-enforcement-vote-seed.json.");
w("-- Do not hand-edit: regenerate, or roll forward with a new migration.");
w("--");
w(`-- ${num(seed.votes.length)} roll calls (${freshRolls.length} new, ${liveRolls.length} topped up) · ${num(seed.memberVoteCount)} attributed member votes`);
w(`-- ${newMeasures.length} measure(s) created · ${existingMeasures.length} looked up and left as they are`);
w(`-- ${totalIssueRows} issue mapping(s) across ${KEYS.length} key(s): ${KEYS.join(", ")}`);
w(`-- ${POSITIONS.length} sponsorship row(s) in vr_positions`);
w("--");
w("-- WHY THESE FOUR");
wrap("The record's largest rankability deficits here are not missing bills — they are missing "
  + "PEOPLE on bills the record already describes well. H.R. 1 carries fourteen curated issue "
  + "keys and had 39 hand-listed voters on the roll that sent it to the President, out of 432 "
  + "recorded; H.R. 4 carries seven keys and had nine; S. 331 carries three keys and had eight "
  + "senators out of 100. A mapped measure with no voters ranks nobody, so re-fetching those "
  + "rolls from the Clerk and the Senate and attributing them through db/vr-member-map.json is "
  + "worth more than another new bill would be. Two of the three chamber-companion rolls were "
  + "simply absent — the House's own 215-214 passage of H.R. 1 and its 321-104 passage of S. 331 "
  + "— and the fourth measure, H.R. 3486, is the one genuinely new one: a single-subject "
  + "sentencing bill whose axes can be stated without hedging.");
w("--");
w("-- THE ENACTED-LAW TIER, AND THE H.R. 1 / H.R. 4 IDENTITY TRAP");
wrap(seed.enactedLawFinding);
w("--");
w("-- WHAT WAS SCANNED");
wrap(seed.scanCoverage);
w("--");
w("-- WHERE A ROLL'S OWN ARITHMETIC LIMITS WHAT IT CAN TEST");
for (const c of seed.marginCaveats || []) wrapBullet(`${c.roll} — ${c.caveat}`);
w("--");
w("-- ISSUE AXES DECLINED, AND WHY");
wrap("A mapping attaches to the MEASURE, so every axis added here is applied at full strength to "
  + "each of that measure's rolls and to every attributed member. That is the test each candidate "
  + "axis had to survive, and it is why this pass adds exactly ONE new mapping across four "
  + "measures. These did not survive it:");
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
w("-- ATTRIBUTION IS FAIL-CLOSED");
wrap("House rolls attribute on the bioguide id in the Clerk's XML against db/vr-member-map.json "
  + "— a direct lookup, and an unmapped member is skipped and counted, never guessed. Senate XML "
  + "carries no bioguide id, so a senator resolves on (surname, state) against the roster and "
  + "only a UNIQUE hit is accepted; an ambiguous match is counted and skipped. totals is the FULL "
  + "chamber tally and is_party is computed from the full recorded vote before the roster filter, "
  + "so a partial roster cannot invent a margin or a party crossover. Every roll is re-verified "
  + "against the chamber's own document before ingest: <legis-num> plus <vote-question> for the "
  + "House, document_type and document_number plus question for the Senate. House verification "
  + "deliberately IGNORES <vote-desc>, which the Clerk abbreviates freely — 'One Big Beautiful "
  + "Act' on roll 145, 'Rescissions Act' on roll 168 — so a description check would reject "
  + "correct rolls and a description-driven mapping would map the wrong subject.");
w("--");
w("-- IDEMPOTENCY, STATED PER ROLL");
wrap(`Every write is guarded and a re-run is a no-op. ${liveRolls.length} of the ${PASS_ROLLS.size} rolls are already `
  + "live, and ON CONFLICT DO NOTHING on (chamber, congress, session, roll_number) means their "
  + "existing rows — including their question text, which the database and the chamber's XML "
  + "sometimes word differently for the same vote — are untouched while their member votes are "
  + "topped up through ON CONFLICT DO NOTHING on (rollcall_id, politician_id).");
for (const [k, meta] of PASS_ROLLS) {
  const [ch, c, s, r] = k.split("|");
  wrapBullet(`${ch} ${c}/${s} roll ${r} — ${meta.fresh ? "NEW" : "already live"}. ${meta.why}`);
}
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
w("  -- Every lookup keys on measure_type, congress, chamber AND number: the record also");
w("  -- holds a 117th-Congress H.R. 1 (For the People Act) and H.R. 4 (John R. Lewis Voting");
w("  -- Rights Advancement Act), and a lookup on number alone would attribute reconciliation");
w("  -- and rescission votes to voting-rights bills.");
w();
for (const m of measures) {
  const c = m.create || null;
  const title = (c && c.title) || m.title;
  w(`  -- ${m.number} (${m.congress}th ${m.chamber})${title ? " — " + title : ""}`);
  if (m.mustExist) for (const line of wrapLocal(m.mustExist)) w(`  --   ${line}`);
  if (c && c.textUrl) {
    for (const line of wrapLocal(`Summary written from the engrossed text ${c.textUrl}, not from a secondary description. vr_measures has no text_url column, so the citation lives here.`)) w(`  --   ${line}`);
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
    // A mustExist row is never created. If it is gone, something upstream broke and
    // inventing a replacement would hide it.
    w(`  IF ${m.var} IS NULL THEN`);
    w(`    RAISE EXCEPTION ${q(`Fiscal/enforcement pass: ${m.number} (${m.congress}th ${m.chamber}) is not in `
      + "vr_measures — it is expected to exist and is never created here.")};`);
    w("  END IF;");
  }
  w();
}

// ── roll calls and member votes ─────────────────────────────────────────────
w("  -- ── roll calls and member votes ───────────────────────────────────────────");
for (const v of seed.votes) {
  const mv = varName(v.measure);
  const meta = PASS_ROLLS.get(rkey(v));
  const pt = Object.entries(v.partyTotals || {}).map(([p, t]) => `${p} ${t.yea}-${t.nay}`).join(", ");
  w(`  -- ${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber} · ${v.measure.number} · ${v.question}`);
  w(`  --   ${v.totals.yea}-${v.totals.nay}${v.totals.present ? `, ${v.totals.present} present` : ""}${v.totals.notVoting ? `, ${v.totals.notVoting} not voting` : ""} (${pt}) · ${v.result}`);
  w(`  --   ${v.memberVotes.length} of ${v.chamberVoting} recorded members are on the roster; ${v.rosterSkipped} skipped as unmapped`
    + `${v.rosterAmbiguous ? `, ${v.rosterAmbiguous} skipped as an ambiguous surname match` : ""}`);
  w(`  --   ${meta.fresh ? "NEW roll." : "Already live — the roll's own row is left alone and its member votes are topped up."}`);
  if (v.voteDesc && v.voteDesc !== v.measure.title) {
    w(`  --   chamber vote description reads "${v.voteDesc}"`);
  }
  w("  INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)");
  w(`  VALUES (${mv}, ${q(v.chamber)}, ${v.congress}, ${v.session}, ${v.rollNumber}, TIMESTAMPTZ ${q(v.voteDate)}, ${q(v.question)}, ${q(v.actionType)}, ${q(v.result)}, ${q(v.requiredMajority)},`);
  w(`    ${q(JSON.stringify({ yea: v.totals.yea, nay: v.totals.nay, present: v.totals.present, notVoting: v.totals.notVoting, byParty: v.partyTotals }))}::jsonb, ${q(v.sourceUrl)}, ${q(v.sourceLabel)})`);
  w("  ON CONFLICT (chamber, congress, session, roll_number) DO NOTHING;");
  w("  SELECT id INTO rc FROM vr_rollcalls");
  w(`   WHERE chamber = ${q(v.chamber)} AND congress = ${v.congress} AND session = ${v.session} AND roll_number = ${v.rollNumber} LIMIT 1;`);
  w("  IF rc IS NULL THEN");
  w(`    RAISE EXCEPTION ${q(`Fiscal/enforcement pass: ${v.chamber} ${v.congress}/${v.session} roll ${v.rollNumber} could not be read back after insert.`)};`);
  w("  END IF;");
  w("  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES");
  w(v.memberVotes.map((x) => `    (rc, ${q(x.politicianId)}, ${q(x.position)}, ${qOrNull(x.isParty)})`).join(",\n"));
  w("  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;");
  w();
}

// ── sponsorship ─────────────────────────────────────────────────────────────
if (POSITIONS.length) {
  w("  -- ── sponsorship (vr_positions) ─────────────────────────────────────────────");
  wrap("A 226-197 roll call records how members voted; putting your name on the bill at "
    + "introduction, four months before the floor, records something the roll cannot. H.R. "
    + "3486 had one sponsor and five cosponsors, and db/vr-member-map.json resolves exactly one "
    + "of the six. The sponsor, Rep. Stephanie Bice (R-OK-5), is NOT on the roster, so "
    + "sponsor_id on the measure row is left NULL and her sponsorship is recorded in the "
    + "summary text rather than as a row that points at no profile.", "  -- ");
  for (const p of POSITIONS) {
    w(`  IF ${p.measureVar} IS NOT NULL THEN`);
    w("    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES");
    w(`      (${p.measureVar}, ${q(p.politicianId)}, ${q(p.actionType)}, ${p.supports ? "true" : "false"}, TIMESTAMPTZ ${q(p.actedAt + "T00:00:00Z")},`);
    w(`       ${q(p.sourceUrl)}, ${q(p.note)})`);
    w("    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;");
    w("  END IF;");
  }
  w();
}

// ── issue mappings ──────────────────────────────────────────────────────────
w("  -- ── issue mappings ────────────────────────────────────────────────────────");
w("  -- Curated in db/vr-issue-seed.json, with the rationale and a primary source on every");
w("  -- row — scripts/test-mapping-discipline.mjs requires both. ON CONFLICT (measure_id,");
w("  -- issue_key) DO NOTHING, so a re-emission of a live row is a no-op and cannot rewrite");
w("  -- a rationale another migration authored.");
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
  if (m.mappingNote) for (const line of wrapLocal(m.mappingNote)) w(`  --   ${line}`);
  const rows = issues.map((i) => {
    mappedRows++;
    return `    (${m.var}, ${q(i.issueKey)}, ${i.weight}, ${i.isPrimary ? "true" : "false"}, ${q(i.supportMeaning)},\n`
      + `      ${q(i.rationale)},\n      ${qOrNull(i.sourceUrl || sourceUrl)})`;
  });
  w("  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES");
  w(rows.join(",\n"));
  w("  ON CONFLICT (measure_id, issue_key) DO NOTHING;");
  w();
}
w("END $$;");
w();

// ── verification ────────────────────────────────────────────────────────────
const rollTuples = seed.votes.map((v) => `('${v.chamber}'::text, ${v.congress}::integer, ${v.session}::integer, ${v.rollNumber}::integer)`);
const topUps = seed.votes
  .filter((v) => !PASS_ROLLS.get(rkey(v)).fresh)
  .map((v) => ({ v, floor: v.memberVotes.length }));

w("-- ---------------------------------------------------------------------------");
w("-- Verification");
w("-- ---------------------------------------------------------------------------");
wrap("Read-only, and scoped by tuple to exactly this pass's roll calls and measures so it can "
  + "only ever fail on data this migration is responsible for. A global count would drag in "
  + "every spending and immigration mapping earlier passes wrote and stop meaning anything.");
w("--");
wrap("Counts assert >= rather than =, and for two independent reasons. Mappings: eleven of the "
  + "fourteen rows emitted above already existed byte-identically, and the four measures carry "
  + "thirteen further live mappings this pass deliberately does not mirror — nine on H.R. 1 and "
  + "four on H.R. 4 — while ON CONFLICT DO NOTHING makes every re-emission a no-op, so the true "
  + "count on these measures is far higher than the file writes. Member votes: "
  + `${liveRolls.length} of the ${PASS_ROLLS.size} rolls were already live and hold votes an `
  + "earlier attribution path wrote, some of them for members this roster does not carry.");
w("--");
wrap(`The orphan check is scoped to the ${freshRolls.length} rolls this pass CREATED (house 119/1/145, 166 and `
  + "264). The five that were already live are excluded: their pre-existing member votes came "
  + "through an earlier and wider path, and failing on those would be failing on somebody "
  + "else's data.");
w("--");
wrap("Two assertions are specific rather than aggregate, because they are the two things this "
  + "pass exists to do. The top-up check names each already-live roll and its new floor, so a "
  + "roll that silently failed to gain voters is caught rather than averaged away. The "
  + "america_first_fp check confirms the pass's ONE new mapping actually landed on the 119th "
  + "Congress H.R. 4 and not on the 117th Congress voting-rights bill of the same number.");
w("-- ---------------------------------------------------------------------------");
w("DO $$");
w("DECLARE");
w("  n_rolls integer;");
w("  n_votes integer;");
w("  n_orphan integer;");
w("  n_issues integer;");
w("  n_pos integer;");
w("  n_afp integer;");
w("  n_hr1_axes integer;");
w("  n_hr4_axes integer;");
for (const t of topUps) w(`  n_${t.v.chamber}${t.v.rollNumber} integer;`);
w("BEGIN");
w("  WITH want (chamber, congress, session, roll_number) AS (VALUES");
w("    " + rollTuples.join(",\n    "));
w("  ), roll_ids AS (");
w("    SELECT r.id FROM vr_rollcalls r JOIN want w");
w("      ON r.chamber = w.chamber AND r.congress = w.congress");
w("     AND r.session = w.session AND r.roll_number = w.roll_number");
w("  ), fresh (chamber, congress, session, roll_number) AS (VALUES");
w("    " + freshRolls.map(([ch, c, s, r]) => `('${ch}'::text, ${c}::integer, ${s}::integer, ${r}::integer)`).join(",\n    "));
w("  ), fresh_ids AS (");
w("    SELECT r.id FROM vr_rollcalls r JOIN fresh f");
w("      ON r.chamber = f.chamber AND r.congress = f.congress");
w("     AND r.session = f.session AND r.roll_number = f.roll_number");
w("  ), mine (measure_type, congress, chamber, number) AS (VALUES");
w("    " + measures.map((m) => `(${q(m.measureType)}::text, ${m.congress}::integer, ${q(m.chamber)}::text, ${q(m.number)}::text)`).join(",\n    "));
w("  ), measure_ids AS (");
w("    SELECT m.id FROM vr_measures m JOIN mine k");
w("      ON m.measure_type = k.measure_type AND m.congress = k.congress");
w("     AND m.chamber = k.chamber AND m.number = k.number");
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
w("         (SELECT count(*) FROM vr_measure_issues i JOIN vr_measures m ON m.id = i.measure_id");
w("           WHERE m.measure_type = 'bill' AND m.congress = 119 AND m.chamber = 'house'");
w("             AND m.number = 'H.R. 4' AND i.issue_key = 'america_first_fp'),");
w("         (SELECT count(*) FROM vr_measure_issues i JOIN vr_measures m ON m.id = i.measure_id");
w("           WHERE m.measure_type = 'bill' AND m.congress = 119 AND m.chamber = 'house'");
w("             AND m.number = 'H.R. 1'),");
w("         (SELECT count(*) FROM vr_measure_issues i JOIN vr_measures m ON m.id = i.measure_id");
w("           WHERE m.measure_type = 'bill' AND m.congress = 119 AND m.chamber = 'house'");
w("             AND m.number = 'H.R. 4')");
w("    INTO n_rolls, n_votes, n_orphan, n_issues, n_pos, n_afp, n_hr1_axes, n_hr4_axes;");
w();
for (const t of topUps) {
  w(`  SELECT count(*) INTO n_${t.v.chamber}${t.v.rollNumber} FROM vr_member_votes v`);
  w("    JOIN vr_rollcalls r ON r.id = v.rollcall_id");
  w(`   WHERE r.chamber = ${q(t.v.chamber)} AND r.congress = ${t.v.congress} AND r.session = ${t.v.session}`);
  w(`     AND r.roll_number = ${t.v.rollNumber};`);
}
w();
w("  RAISE NOTICE 'Fiscal/enforcement pass: % roll calls, % member votes, % issue mappings, % sponsorship rows', n_rolls, n_votes, n_issues, n_pos;");
w("  RAISE NOTICE 'Fiscal/enforcement pass: H.R. 1 (119th) carries % mapped issue axes, H.R. 4 carries %', n_hr1_axes, n_hr4_axes;");
for (const t of topUps) {
  w(`  RAISE NOTICE 'Fiscal/enforcement pass: ${t.v.chamber} ${t.v.congress}/${t.v.session} roll ${t.v.rollNumber} (${t.v.measure.number}) carries % attributed member votes', n_${t.v.chamber}${t.v.rollNumber};`);
}
w();
w(`  IF n_rolls <> ${seed.votes.length} THEN`);
w(`    RAISE EXCEPTION 'Fiscal/enforcement pass: expected ${seed.votes.length} roll calls, found %', n_rolls;`);
w("  END IF;");
w(`  IF n_votes < ${seed.memberVoteCount} THEN`);
w(`    RAISE EXCEPTION 'Fiscal/enforcement pass: expected at least ${seed.memberVoteCount} member votes on these roll calls, found %', n_votes;`);
w("  END IF;");
w("  IF n_orphan > 0 THEN");
w("    RAISE EXCEPTION 'Fiscal/enforcement pass: % member vote(s) on the rolls this pass created carry a politician_id outside db/vr-member-map.json', n_orphan;");
w("  END IF;");
w(`  IF n_issues < ${totalIssueRows} THEN`);
w(`    RAISE EXCEPTION 'Fiscal/enforcement pass: expected at least ${totalIssueRows} issue mappings on this pass''s measures, found %', n_issues;`);
w("  END IF;");
w(`  IF n_pos < ${POSITIONS.length} THEN`);
w(`    RAISE EXCEPTION 'Fiscal/enforcement pass: expected at least ${POSITIONS.length} sponsorship row(s), found %', n_pos;`);
w("  END IF;");
w("  IF n_afp <> 1 THEN");
w("    RAISE EXCEPTION 'Fiscal/enforcement pass: the america_first_fp mapping on the 119th H.R. 4 did not land (found % row(s))', n_afp;");
w("  END IF;");
w("  IF n_hr1_axes < 14 THEN");
w("    RAISE EXCEPTION 'Fiscal/enforcement pass: the 119th H.R. 1 should carry at least 14 mapped axes, found %', n_hr1_axes;");
w("  END IF;");
w("  -- Seven live axes from 20260719150000 and 20260721140000, plus america_first_fp.");
w("  IF n_hr4_axes < 8 THEN");
w("    RAISE EXCEPTION 'Fiscal/enforcement pass: the 119th H.R. 4 should carry at least 8 mapped axes, found %', n_hr4_axes;");
w("  END IF;");
for (const t of topUps) {
  w(`  IF n_${t.v.chamber}${t.v.rollNumber} < ${t.floor} THEN`);
  w(`    RAISE EXCEPTION '${t.v.chamber} ${t.v.congress}/${t.v.session} roll ${t.v.rollNumber} (${t.v.measure.number}) was not topped up — only % member votes, expected at least ${t.floor}', n_${t.v.chamber}${t.v.rollNumber};`);
  w("  END IF;");
}
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
  `${seed.votes.length} rolls (${freshRolls.length} new, ${liveRolls.length} topped up) · ${seed.memberVoteCount} member votes · `
  + `${measures.length} measures (${newMeasures.length} created, ${existingMeasures.length} looked up) · ${mappedRows} issue rows `
  + `across ${KEYS.length} keys (${KEYS.map((k) => `${k}:${keyRows(k)}`).join(", ")}) · `
  + `${POSITIONS.length} sponsorship rows · `
  + `${pidCheck.checked} bioguide→pid pairs agree with the member map\n`
);
