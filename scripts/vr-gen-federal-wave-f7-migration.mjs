// ════════════════════════════════════════════════════════════════════════════
// Federal wave F7 — migration generator
// ════════════════════════════════════════════════════════════════════════════
//
// Reads db/vr-federal-mapping-seed-f7.json (the decisions) and
// db/vr-federal-wave-f7-vote-seed.json (the chamber record) and emits
// netlify/database/migrations/20261023000000_vr_federal_wave_f7.sql.
//
// The seeds are the source of truth. Nothing here re-decides anything and no
// number in the SQL is typed by hand: tallies, dates, questions, source URLs and
// every member position come out of the vote seed, which came out of the Senate's
// LIS XML and the House clerk's XML.
//
// TWO THINGS THIS GENERATOR DOES THAT F6'S DID NOT.
//
// 1. It emits measures that carry NO issue mapping. Seven of the fourteen Senate
//    rolls are ingested and left unmapped on purpose — runbook rule 34, argued in
//    the seed under censusRule34 with the member-for-member diff. So the loop over
//    measures and the loop over mappings are not the same loop, and the
//    verification block asserts the count of zero-mapping measures is exactly
//    seven rather than asserting it is zero.
//
// 2. It is a two-chamber wave, so the roll id array is keyed on
//    (chamber, congress, session, roll_number) and the measure lookups are keyed
//    on (measure_type, chamber, number). A Senate roll 46 and a House roll 46 are
//    different votes and a three-column key would silently union them.
//
// The verification block is scoped to THIS WAVE'S ROLLS AND MEASURES. A
// session-wide or corpus-wide total would fail the next time any other wave lands,
// and a guard that fails for reasons unrelated to the change it guards gets deleted
// by whoever is unlucky enough to hit it.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED = JSON.parse(readFileSync(join(ROOT, "db", "vr-federal-mapping-seed-f7.json"), "utf8"));
const VOTES = JSON.parse(readFileSync(join(ROOT, "db", "vr-federal-wave-f7-vote-seed.json"), "utf8"));

const q = (s) => s === null || s === undefined ? "NULL" : `'${String(s).replace(/'/g, "''")}'`;
const varName = (num) => "m_" + num.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const wrap = (text, width, lead) => {
  const out = [];
  for (const para of String(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      if (line && (line + " " + word).length > width) { out.push(lead + line); line = word; }
      else line = line ? line + " " + word : word;
    }
    out.push(lead + line);
  }
  return out.join("\n");
};

// A roll is found by its roll address, never by its measure number: two of this
// wave's measures have a second Senate roll that the form gate does not admit, and
// a lookup by number is exactly how the wrong one would get ingested.
const rollOf = (m) => {
  const [cg, se, rl] = m.roll.split("/").map(Number);
  const r = VOTES.votes.find((x) => x.congress === cg && x.session === se && x.rollNumber === rl && x.chamber === m.chamber);
  if (!r) throw new Error(`vote seed has no ${m.chamber} roll ${m.roll} for ${m.number}`);
  const seedNum = (m.parentNumber || m.number).replace(/[^a-z0-9]/gi, "").toUpperCase();
  const rollNum = (r.measure.parentNumber || r.measure.number).replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (seedNum !== rollNum) throw new Error(`roll ${m.roll} carries ${rollNum}, seed says ${seedNum}`);
  return r;
};
const isoDate = (s) => {
  const mm = /^(\d{4}-\d{2}-\d{2})T/.exec(String(s));
  if (!mm) throw new Error(`vote seed carries a non-ISO voteDate '${s}'`);
  return mm[1];
};
const RESULT = { "Passed": "passed", "Failed": "failed", "Agreed to": "agreed", "Rejected": "rejected", "agreed_to": "agreed", "rejected": "rejected" };
// action_type is the existing closed vocabulary in vr_rollcalls: passage,
// amendment, motion, procedural, nomination, concurrence, cloture. A discharge
// motion is a motion. Nothing new is coined here.
const ACTION = (r) => r.admittedAs === "decisive" ? "passage" : r.admittedAs === "exception: amendment" ? "amendment" : "motion";
// A measure that never passed is filed failed, whatever the admitted roll says
// about the motion. All fourteen Senate resolutions failed: twelve discharge
// motions were rejected and the two that carried were killed on a later roll.
const STATUS = (m) => m.chamber === "senate" ? "failed" : "passed_house";
const SRC_LABEL = (m) => m.measureType === "amendment" ? "Congress.gov" : "Congress.gov";
const EXTERNAL = (m) => {
  if (m.measureType === "amendment") {
    return { amendmentType: "hamdt", amendmentNumber: +m.number.replace(/\D/g, ""), congress: m.congress, parentBill: m.parentNumber };
  }
  if (m.measureType === "resolution") {
    return { billType: "sjres", billNumber: +m.number.replace(/\D/g, ""), congress: m.congress };
  }
  return { billType: "hr", billNumber: +m.number.replace(/\D/g, ""), congress: m.congress, govinfoText: m.govinfo };
};
const ISSUE_SRC = (m) => m.govinfoUrl || m.sourceUrl;

const ME = SEED.readDisclosure.measuredEffect;
const R34 = SEED.censusRule34;
const withIssues = SEED.measures.filter((m) => m.issues.length);
const withoutIssues = SEED.measures.filter((m) => !m.issues.length);
const primaryKeys = [...new Set(withIssues.flatMap((m) => m.issues.filter((i) => i.isPrimary).map((i) => i.issueKey)))].sort();
const secondaryOnlyKeys = SEED._counts.keysUsed.filter((k) => !primaryKeys.includes(k)).sort();
const nPrimaryRows = withIssues.flatMap((m) => m.issues).filter((i) => i.isPrimary).length;

const L = [];
const p = (s = "") => L.push(s);

p("-- ────────────────────────────────────────────────────────────────────────────");
p("-- Federal wave F7 — the Senate war-powers slice, four District of Columbia bills");
p("--                  keyed on their subjects, and one amendment");
p("-- ────────────────────────────────────────────────────────────────────────────");
p("-- Generated by scripts/vr-gen-federal-wave-f7-migration.mjs from");
p("-- db/vr-federal-mapping-seed-f7.json and db/vr-federal-wave-f7-vote-seed.json. Do not");
p("-- hand-edit; regenerate.");
p("--");
p(wrap(`WHAT THIS WAVE ADMITS: ${SEED.measures.length} measures, ${VOTES.votes.length} roll calls, `
  + `${VOTES._counts.attributedMemberVotes} attributed member votes and ${SEED._counts.issueRows} issue mappings on `
  + `${SEED._counts.keysUsed.length} keys that were already live and already placed — `
  + SEED._counts.keysUsed.join(", ") + ". No new issue key, no tree slot, no colour, no roster slug, no floor "
  + "moved, no promote, no retraction, no weight or polarity change to any existing row.", 76, "-- "));
p("--");
p(wrap("WHY SEVEN MEASURES SHIP WITH ZERO MAPPING ROWS. Twelve of the fourteen Senate rolls "
  + "are two texts, not twelve: eleven are the Iran withdrawal resolution with a different "
  + "sponsor on the cover and identical operative language, two are the Venezuela resolution. "
  + "Runbook rule 34 admits the same text voted twice as two acts only when each is the only "
  + "record of somebody's position. Counted in vote-date order over yea and nay alone — a "
  + "not_voting is not a position — the eleven Iran rolls contribute 98 judged pairs on the "
  + "first roll and then exactly three more in the whole series: collins yea on 119/2/113, "
  + "murkowski yea on 119/2/118, cassidy yea on 119/2/129. Those three rolls are mapped "
  + "because each is the only record of one senator crossing. The other seven record no "
  + "position an earlier roll does not, so they are INGESTED IN FULL — every roll, every "
  + "attributed member vote, readable against the Official Record — and given no issue row. "
  + "The safety check that made this admissible: the set of senators holding a judged "
  + "position only on a zero-mapping roll is EMPTY, and the verification block below asserts "
  + "it rather than trusting it.", 76, "-- "));
p("--");
p(wrap("THE DISTRICT OF COLUMBIA SLICE, on subjects and never on venue. F6 ran the six vocab "
  + "rules on a District of Columbia key and refused it on rule 5 — the District is the venue, "
  + "not the subject. F7 takes that as settled and reads the nine measures on what they do: "
  + "four are admitted (H.R. 2056 on border_security and deportations, H.R. 4922, H.R. 5140 "
  + "and H.R. 5214 on tough_on_crime) and five are refused in writing. Three of the five are "
  + "police discipline and pursuit rules, which have no live directional key: tough_on_crime's "
  + "own OUT list sends away the accountability pairing, back_police and justice_reform have "
  + "no written scope note to test against, and justice_balance is a _balance key that "
  + "_rdSuppressedKey() leaves permanently unread — which F6's wall forbids using as a car "
  + "park. H.R. 7148 is the standing demonstration of why a venue key would have been a trap: "
  + "one of its divisions is a District of Columbia appropriation, so a venue key would have "
  + "made a whole-government appropriations vehicle mappable on venue alone.", 76, "-- "));
p("--");
p(wrap("WHAT IT REFUSES, IN WRITING, with the full argument in the seed: two appropriations "
  + "vehicles on F4's standing refusal (H.R. 1968 and H.R. 7148, both already on file with six "
  + "issue rows, so ingesting their Senate passage rolls would publish a package percentage); "
  + "two Arms Export Control Act disapprovals on a named vocabulary gap (S.J.Res. 53 on Qatar "
  + "and S.J.Res. 54 on the United Arab Emirates — this corpus has israel_support and no "
  + "equivalent for a transfer to any other partner, and filing them there because the region "
  + "matches is the adjacency reasoning rule 41 forbids); five District measures; and "
  + `${SEED._counts.declinedKeysInWriting} individual issue keys across the admitted measures. `
  + "Also refused: 53 contested House amendment rolls this wave bridged to their amendment "
  + "text and left unread, because admitting them would scatter one pass across thirty keys "
  + "instead of putting density on one axis.", 76, "-- "));
p("--");
p(wrap("THE ONE DEPARTURE FROM A SHIPPED FACE, labelled as one. S.J.Res. 59 carries four rows "
  + "for this exact instrument and this wave copies three of them unchanged — restraint w100 "
  + "primary, war_powers w70, strong_defense w55 opposed — because runbook rule 25 forbids "
  + "mapping the same subject two ways without a reason. It does not copy foreign_balance w45. "
  + "_rdSuppressedKey() returns 'balance_key' for any key ending in _balance, so such a row is "
  + "permanently unread: it can never print a direction and never counts toward a "
  + "characterised reading. Seven more measures times one unread row is the parking F6's wall "
  + "forbade, and dropping it changes no reader-visible sentence.", 76, "-- "));
p("--");
p(wrap("THE MEASURED READ EFFECT, because a densification wave has to publish its own cost. "
  + `Projected with ${ME.harness} over all 343 federal members: the band goes ${ME.bandBefore} to `
  + `${ME.bandAfter} — it does not move, and the census answer is that the only two members outside `
  + "the readable band are state-lane figures no federal roll can reach. Member-key rows "
  + `${ME.memberKeyRows}. ${ME.membersWhoseShapeMoved} members' shapes move. ZERO rows stop being `
  + "characterised — checked on the row model's own read flag over every pid, set-wise, never on "
  + `shape counters (runbook rule 36) — and ${ME.rowsThatStartedBeingCharacterised} start. What DOES `
  + `change direction is ${ME.theEightRowsThatChangedDIRECTION.rows.length} rows moving from a `
  + "one-directional tier to Split, and every one traces to a vote that member cast on this "
  + "wave's own rolls: two senators who crossed on the withdrawal motions and five House members "
  + "who voted for the amendment repealing the 2002 and 1991 authorizations. They are named "
  + "individually in the seed under readDisclosure.measuredEffect.", 76, "-- "));
p("--");
p(wrap("THE SHIFT WORTH ARGUING ABOUT, stated rather than buried: 118 of the 167 tier "
  + "transitions are on restraint, and 54 senators move from split to mostly while 43 move from "
  + "thin to strong. The objection is that seven rolls on three texts is repetition. The answer "
  + "is that the direction each senator now reads is the direction that senator actually voted, "
  + "seven to nine times, and the tier is decided by _RD_DOMINANCE at 0.75 over their own counts "
  + "— a floor this wave neither reads nor writes.", 76, "-- "));
p("--");
p(wrap("A NOTE ON WHAT THE READER IS AND IS NOT TOLD. war_powers is in _RD_NO_POLE in "
  + "stance-helpers.js, so _rdSuppressedKey() returns 'no_pole' for it and its rows keep "
  + "inventory copy and never print a stance. Fifteen of the twenty-eight rows are war_powers "
  + "rows. That is deliberate and it is said out loud here so nobody reads twenty-eight new "
  + "rows as twenty-eight new directional readings.", 76, "-- "));
p("--");
p("-- WALLS REAFFIRMED: no `*_balance` key was used to park anything; gov_regulation was not");
p("--   restuffed and public_schools was not used as a funding key; study-and-report is still");
p("--   not a policy vote (H.R. 5103's advisory commission limb); checks_balances takes no");
p("--   roll-call mappings under rule 28, which is why two honest readings here are refused");
p("--   rather than filed; and H.R. 1069 / H.R. 973 stay at zero issue mappings — this wave");
p("--   writes no new key, so nothing reopens them.");
p("-- ────────────────────────────────────────────────────────────────────────────");
p();
p("DO $$");
p("DECLARE");
for (const m of SEED.measures) p(`  ${varName(m.number)} integer;`);
p("  rc integer;");
p("BEGIN");
p();
p("  -- ── measures ──────────────────────────────────────────────────────────────");
p("  -- All nineteen are new: the pre-flight query found zero rows in vr_measures for these");
p("  -- numbers in the 119th. The lookup-then-insert shape is kept anyway so the migration is");
p("  -- idempotent and so a measure another wave introduces first is adopted, not duplicated.");
p("  -- The Senate resolutions are filed with status 'failed' because none of them passed:");
p("  -- twelve discharge motions were rejected, and the two that carried were killed on a");
p("  -- later roll that rule 8/12 does not admit (a point of order sustained on S.J.Res. 98,");
p("  -- a rejected motion to proceed on S.J.Res. 185). A motion carrying is not a measure");
p("  -- passing, and the status column is where that distinction is kept honest.");
for (const m of SEED.measures) {
  const v = varName(m.number);
  const title = m.documentTitle || m.officialTitle || m.purpose;
  p();
  p(`  -- ${m.number} — ${m.shortTitle || m.documentTitle}`);
  p(wrap(m.purpose, 74, "  --   "));
  if (m.parentNumber) p(`  --   parent: ${m.parentNumber} — ${m.parentTitle}`);
  p(`  SELECT id INTO ${v} FROM vr_measures`);
  p(`   WHERE measure_type = ${q(m.measureType)} AND congress = ${m.congress} AND chamber = ${q(m.chamber)}`);
  p(`     AND number = ${q(m.number)} LIMIT 1;`);
  p(`  IF ${v} IS NULL THEN`);
  p("    INSERT INTO vr_measures (measure_type, congress, chamber, number, title, short_title, status, source_url, source_label, external_ids)");
  p(`    VALUES (${q(m.measureType)}, ${m.congress}, ${q(m.chamber)}, ${q(m.number)}, ${q(title)}, ${q(m.shortTitle || null)},`);
  p(`      ${q(STATUS(m))}, ${q(m.sourceUrl)}, ${q(SRC_LABEL(m))},`);
  p(`      ${q(JSON.stringify(EXTERNAL(m)))}::jsonb)`);
  p(`    RETURNING id INTO ${v};`);
  p("  END IF;");
  p(`  IF ${v} IS NULL THEN`);
  p(`    RAISE EXCEPTION 'Federal wave F7: ${m.number} could not be created or read back.';`);
  p("  END IF;");
}
p();
p("  -- ── roll calls and member votes ───────────────────────────────────────────");
p("  -- The chamber's own document is the vote. Every tally below is the Senate's");
p("  -- <count><yeas>/<nays> block or the clerk's <totals-by-vote> block, counting all 100 or");
p("  -- all 430-437 recorded members — NOT the attributed rows, which are a much smaller set");
p("  -- because the roster admits 221 slugs. There is a specific trap here worth naming: the");
p("  -- LIS <vote_tally> element renders '51-42' as a DISPLAY STRING, which parses to 5142 and");
p("  -- makes the losing side zero, so rule 11 would pass everything. The count block is the");
p("  -- authority and the guards at the end assert the tally against the attributed row count.");
p("  --");
p("  -- Attribution is fail-closed and the two chambers take different paths because the two");
p("  -- sources carry different identifiers. House: the clerk's own name-id, then");
p("  -- db/vr-member-map.json. Senate: there is no bioguide in the LIS XML, so the key is");
p("  -- (surname, state) resolved against the roster with a whole-name compare. A surname that");
p("  -- resolves to more than one distinct person in the same state is SKIPPED and counted,");
p("  -- never guessed — ambiguous skips this wave: 0. Three serving senators are absent from");
p("  -- the roster (Husted OH, Hyde-Smith MS, Armstrong OK) and account for every unresolved");
p("  -- Senate row; that is a roster gap named in the seed, not a reading failure.");
for (const m of SEED.measures) {
  const r = rollOf(m), v = varName(m.number);
  p();
  p(`  -- ${r.chamber} ${r.congress}/${r.session} roll ${r.rollNumber} · ${m.number} · ${r.question}`);
  p(`  --   ${r.totals.yea}-${r.totals.nay}, ${r.totals.notVoting} not voting · ${String(r.result).toLowerCase().replace(/_/g, " ")}`);
  p(`  --   losing side is ${r._losingSharePct}% of the yea+nay pool — rule 11's one-tenth bar is cleared`);
  p(`  --   ${r._attributed} of ${r._chamberRecorded} recorded members resolve to a roster slug; ${r._unresolvedRecorded} skipped as unmapped`);
  p(`  --   admitted as: ${r.admittedAs}`);
  if (r.decisiveWhy) p(wrap(`decisiveWhy: ${r.decisiveWhy}`, 74, "  --   "));
  p("  INSERT INTO vr_rollcalls (measure_id, chamber, congress, session, roll_number, vote_date, question, action_type, result, required_majority, totals, source_url, source_label)");
  p(`  VALUES (${v}, ${q(r.chamber)}, ${r.congress}, ${r.session}, ${r.rollNumber}, DATE '${isoDate(r.voteDate)}', ${q(r.question)}, ${q(ACTION(r))}, ${q(RESULT[r.result] || String(r.result).toLowerCase())}, ${q(r.requiredMajority)},`);
  p(`    ${q(JSON.stringify({ ...r.totals, byParty: r.partyTotals }))}::jsonb, ${q(r.sourceUrl)}, ${q(r.sourceLabel)})`);
  p("  ON CONFLICT (chamber, congress, session, roll_number) DO NOTHING;");
  p("  SELECT id INTO rc FROM vr_rollcalls");
  p(`   WHERE chamber = ${q(r.chamber)} AND congress = ${r.congress} AND session = ${r.session} AND roll_number = ${r.rollNumber} LIMIT 1;`);
  p("  IF rc IS NULL THEN");
  p(`    RAISE EXCEPTION 'Federal wave F7: ${r.chamber} ${r.congress}/${r.session} roll ${r.rollNumber} could not be read back after insert.';`);
  p("  END IF;");
  p("  INSERT INTO vr_member_votes (rollcall_id, politician_id, position, is_party) VALUES");
  p(r.memberVotes.map((x) => `    (rc, ${q(x.politicianId)}, ${q(x.position)}, ${q(x.isParty)})`).join(",\n"));
  p("  ON CONFLICT (rollcall_id, politician_id) DO NOTHING;");
}
p();
p("  -- ── issue mappings ────────────────────────────────────────────────────────");
p("  -- pack-generation: derived — the fingerprint moves with these rows; every");
p("  --   affected member's pack retires and rebuilds on the next read. Confirmed");
p("  --   with scripts/test-vr-pack-key-version.mjs.");
p("  --");
p(wrap(`${nPrimaryRows} of the ${SEED._counts.issueRows} rows are primary and `
  + `${SEED._counts.issueRows - nPrimaryRows} are secondary, which is a rule 30 decision rather than `
  + "a convenience, and the honest version of it is not 'every key gains a primary'. "
  + `${primaryKeys.length} of the ${SEED._counts.keysUsed.length} keys gain one from this wave — ` + primaryKeys.join(", ")
  + ". TWO DO NOT: deportations gains a single secondary row, and strong_defense gains seven "
  + "secondary rows and no primary, because a resolution ordering forces out of one engagement is "
  + "not a vote on force levels, procurement or posture. What that costs was read out of the "
  + "shipped code rather than assumed, because the gate everybody remembers is no longer a gate: "
  + "stance-helpers.js:1573 records that the last primary lock on characterisation was removed on "
  + "purpose — isPrimary is a label on the bill, printable everywhere and consultable by nothing — "
  + "and the surviving use at stance-helpers.js:1598 only decides whether _rdPackageNote's sentence "
  + "prints beside the finding. So a secondary-only key cannot suppress or downgrade a reading. "
  + "Measured on the members rather than on the structure: of the 98 this wave touches on "
  + "strong_defense and the 116 on deportations, ZERO become newly readable on those keys and ZERO "
  + "start printing the package sentence, because every one already holds a primary act on the key "
  + "from an earlier instrument. The guards below assert what is structurally true — each key this "
  + "wave writes carries a primary somewhere in the corpus, and the exact split of which keys this "
  + "wave supplies one for — so that flipping a primary to a secondary later trips a wall instead "
  + "of quietly moving a sentence onto a hundred readings.", 74, "  -- "));
for (const m of withIssues) {
  const v = varName(m.number);
  for (const i of m.issues) {
    p();
    p(`  -- ${m.number} · ${i.issueKey} w${i.weight} ${i.isPrimary ? "PRIMARY" : "secondary"} ${i.supportMeaning}`);
    p(wrap(i.rationale, 74, "  --   "));
    p("  INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale, source_url) VALUES");
    p(`    (${v}, ${q(i.issueKey)}, ${i.weight}, ${i.isPrimary}, ${q(i.supportMeaning)}, ${q(i.rationale)}, ${q(ISSUE_SRC(m))})`);
    p("  ON CONFLICT (measure_id, issue_key) DO NOTHING;");
  }
  if (m.declinedKeys.length) {
    p("  --");
    for (const d of m.declinedKeys) p(wrap(`DECLINED on ${m.number} — ${d.issueKey}: ${d.why}`, 74, "  --   "));
  }
}
p();
p("  -- ── the seven measures that get no mapping row ─────────────────────────────");
p(wrap("Rule 34, and the diff rather than the claim. Each of these seven rolls is ingested in "
  + "full and each records no yea or nay that an earlier roll on the same text does not already "
  + "record. Withholding the mapping keeps seven duplicate restraint acts and seven duplicate "
  + "strong_defense acts per senator out of the pattern index for one position held once. "
  + "Nobody's position is lost: every senator attributed on one of these rolls also holds a "
  + "judged position on a roll that keeps its mappings, and the verification block asserts it.", 74, "  -- "));
for (const m of withoutIssues) {
  const r = rollOf(m);
  const row = [...R34.resultIran, ...R34.resultVenezuela, ...R34.resultUntargeted].find((x) => x.roll === m.roll);
  p("  --");
  p(`  -- ${m.number} · ${m.roll} · ${r.totals.yea}-${r.totals.nay} · new judged pairs: ${row ? row.newJudgedPairs : "?"}`);
  p(wrap(row ? row.decision : m.zeroMappingReason, 74, "  --     "));
}
p();
p("END $$;");
p();

// ── verification, scoped to this wave ────────────────────────────────────────
const rollTuples = VOTES.votes.map((r) => `(${q(r.chamber)},${r.congress},${r.session},${r.rollNumber})`).join(", ");
const measureTuples = SEED.measures.map((m) => `(${q(m.measureType)},${q(m.chamber)},${q(m.number)})`).join(",\n     ");
const mappedTuples = withIssues.map((m) => `(${q(m.measureType)},${q(m.chamber)},${q(m.number)})`).join(",\n       ");
const mappedRollTuples = withIssues.map((m) => { const r = rollOf(m); return `(${q(r.chamber)},${r.congress},${r.session},${r.rollNumber})`; }).join(", ");
const zeroRollTuples = withoutIssues.map((m) => { const r = rollOf(m); return `(${q(r.chamber)},${r.congress},${r.session},${r.rollNumber})`; }).join(", ");
const allSlugs = [...new Set(VOTES.votes.flatMap((r) => r.memberVotes.map((x) => x.politicianId)))].sort();

p("-- ────────────────────────────────────────────────────────────────────────────");
p(`-- VERIFICATION — scoped to THIS WAVE'S ${VOTES.votes.length} rolls and ${SEED.measures.length} measures.`);
p("-- Nothing below counts a session-wide or corpus-wide total. A guard that fails");
p("-- because some other wave landed is a guard that gets deleted, so every count here");
p("-- is taken over the named rolls and the named measures only. The roll ids live in an");
p("-- integer[] local variable rather than a temp table: a data-only migration that sorts");
p("-- after the newest drizzle snapshot may not declare an object, and");
p("-- scripts/test-vr-corrections.mjs reads any CREATE of a TABLE as a declaration");
p("-- regardless of how temporary it is. The element type is the serial vr_rollcalls.id.");
p("-- ────────────────────────────────────────────────────────────────────────────");
p("DO $$");
p("DECLARE");
p("  n_measures integer; n_rolls integer; n_votes integer; n_orphan integer; n_issues integer;");
p("  n_badpos integer; n_tally integer; n_hr1069 integer; n_keys integer; n_newkeys integer;");
p("  n_chamber integer; n_rule11 integer;");
p("  n_zero integer; n_orphan_pos integer; n_nokey_primary integer; n_balance integer;");
p("  n_wave_primary_keys integer;");
p("  roll_ids integer[]; mapped_ids integer[]; zero_ids integer[];");
p("BEGIN");
p("  SELECT count(*) INTO n_measures FROM vr_measures");
p(`   WHERE congress = 119 AND (measure_type, chamber, number) IN (\n     ${measureTuples});`);
p(`  IF n_measures <> ${SEED.measures.length} THEN`);
p(`    RAISE EXCEPTION 'Federal wave F7: expected ${SEED.measures.length} measures on file, found %', n_measures;`);
p("  END IF;");
p();
p("  SELECT array_agg(id) INTO roll_ids FROM vr_rollcalls");
p(`   WHERE (chamber, congress, session, roll_number) IN (${rollTuples});`);
p("  n_rolls := coalesce(array_length(roll_ids, 1), 0);");
p(`  IF n_rolls <> ${VOTES.votes.length} THEN`);
p(`    RAISE EXCEPTION 'Federal wave F7: expected ${VOTES.votes.length} roll calls, found %', n_rolls;`);
p("  END IF;");
p();
p("  SELECT count(*) INTO n_votes FROM vr_member_votes WHERE rollcall_id = ANY(roll_ids);");
p(`  IF n_votes < ${VOTES._counts.attributedMemberVotes} THEN`);
p(`    RAISE EXCEPTION 'Federal wave F7: expected at least ${VOTES._counts.attributedMemberVotes} member votes on these rolls, found %', n_votes;`);
p("  END IF;");
p();
p("  -- Fail-closed attribution, asserted rather than assumed. A politician_id on one of these");
p("  -- rolls that is not in the roster means the resolver guessed at somebody — the one failure");
p("  -- mode a (surname, state) key can introduce, and the reason ambiguous names are skipped.");
p("  SELECT count(*) INTO n_orphan FROM vr_member_votes v");
p("   WHERE v.rollcall_id = ANY(roll_ids)");
p(`     AND v.politician_id NOT IN (${allSlugs.map(q).join(", ")});`);
p("  IF n_orphan > 0 THEN");
p("    RAISE EXCEPTION 'Federal wave F7: % member vote(s) on these rolls carry a politician_id outside db/vr-member-map.json. Attribution here is fail-closed, so this is a bug, not a roster gap.', n_orphan;");
p("  END IF;");
p();
p("  SELECT count(*) INTO n_badpos FROM vr_member_votes");
p("   WHERE rollcall_id = ANY(roll_ids) AND position NOT IN ('yea','nay','present','not_voting');");
p("  IF n_badpos > 0 THEN");
p("    RAISE EXCEPTION 'Federal wave F7: % member vote(s) carry a position outside the closed vocabulary.', n_badpos;");
p("  END IF;");
p();
p("  -- The tally is the chamber's, not the roster's. Two separate things can go wrong here and");
p("  -- they need two separate guards, because the obvious single guard is wrong: on two of these");
p("  -- rolls (119/2/174 at 95-0 with 5 not voting, 119/2/207 at 96-0 with 4) the yea+nay pool is");
p("  -- SMALLER than the attributed row count, since attributed rows include the not_voting");
p("  -- positions of members who are in the roster. So the subset check compares the pool against");
p("  -- the attributed rows that carry a JUDGED position, which genuinely is a subset of it.");
p("  SELECT count(*) INTO n_tally FROM vr_rollcalls r");
p("   WHERE r.id = ANY(roll_ids)");
p("     AND (r.totals->>'yea')::int + (r.totals->>'nay')::int");
p("         < (SELECT count(*) FROM vr_member_votes v WHERE v.rollcall_id = r.id");
p("             AND v.position IN ('yea','nay'));");
p("  IF n_tally > 0 THEN");
p("    RAISE EXCEPTION 'Federal wave F7: % roll(s) have a yea+nay pool smaller than the number of attributed yea/nay rows. The attributed set is a subset of the chamber, so this means the totals were recomputed from the rows.', n_tally;");
p("  END IF;");
p();
p("  -- And the check that actually catches a roster-derived total, which is the failure worth");
p("  -- fearing: it would publish a vote that did not happen, with a plausible-looking margin.");
p("  -- Every Senate roll here sums to exactly 100 across yea, nay, present and not voting, and");
p("  -- every House roll to between 400 and 440. The roster admits 98 senators and 117");
p("  -- representatives, so a total assembled from the rows fails both bounds immediately.");
p("  SELECT count(*) INTO n_chamber FROM vr_rollcalls r");
p("   WHERE r.id = ANY(roll_ids)");
p("     AND ((r.chamber = 'senate' AND (r.totals->>'yea')::int + (r.totals->>'nay')::int");
p("            + (r.totals->>'present')::int + (r.totals->>'notVoting')::int <> 100)");
p("       OR (r.chamber = 'house' AND ((r.totals->>'yea')::int + (r.totals->>'nay')::int");
p("            + (r.totals->>'present')::int + (r.totals->>'notVoting')::int NOT BETWEEN 400 AND 440)));");
p("  IF n_chamber > 0 THEN");
p("    RAISE EXCEPTION 'Federal wave F7: % roll(s) do not account for a full chamber. A Senate roll totals 100 and a House roll 400-440; anything near 98 or 117 is the roster subset masquerading as the chamber.', n_chamber;");
p("  END IF;");
p();
p("  -- Rule 11, in the migration and not only in the harness, because the specific bug it");
p("  -- catches lives in the ingest path this migration was generated from. The LIS XML carries a");
p("  -- <vote_tally> element that renders '51-42' as a DISPLAY STRING; read as a number it is");
p("  -- 5142, which makes the losing side zero and every roll look unanimous-but-contested. The");
p("  -- authority is the <count><yeas>/<nays> block, and if that substitution ever happens again");
p("  -- the losing share collapses and this guard fires instead of the site publishing it.");
p("  SELECT count(*) INTO n_rule11 FROM vr_rollcalls r");
p("   WHERE r.id = ANY(roll_ids)");
p("     AND 10 * least((r.totals->>'yea')::int, (r.totals->>'nay')::int)");
p("         < (r.totals->>'yea')::int + (r.totals->>'nay')::int;");
p("  IF n_rule11 > 0 THEN");
p("    RAISE EXCEPTION 'Federal wave F7: % roll(s) fail rule 11 — the losing side is under a tenth of the yea+nay pool, so the question was not contested. Observed range this wave: 39.019%% to 49.495%%.', n_rule11;");
p("  END IF;");
p();
p("  SELECT count(*) INTO n_issues FROM vr_measure_issues");
p("   WHERE measure_id IN (SELECT id FROM vr_measures WHERE congress = 119");
p(`     AND (measure_type, chamber, number) IN (\n     ${measureTuples}));`);
p(`  IF n_issues <> ${SEED._counts.issueRows} THEN`);
p(`    RAISE EXCEPTION 'Federal wave F7: expected exactly ${SEED._counts.issueRows} issue mappings on this wave''s measures, found %. A higher count means somebody added a row to feed coverage or reopened one of the seven rule 34 measures; the seed refuses ${SEED._counts.declinedKeysInWriting} keys on these measures in writing.', n_issues;`);
p("  END IF;");
p();
p("  -- Rule 34's decision, asserted as a number. Exactly seven of this wave's measures carry");
p("  -- no issue row, and the seed carries the member-for-member diff for each. If this count");
p("  -- drops, somebody mapped a duplicate roll and inflated every senator's restraint depth.");
p("  SELECT count(*) INTO n_zero FROM vr_measures m");
p("   WHERE m.congress = 119");
p(`     AND (m.measure_type, m.chamber, m.number) IN (\n     ${measureTuples})`);
p("     AND NOT EXISTS (SELECT 1 FROM vr_measure_issues i WHERE i.measure_id = m.id);");
p(`  IF n_zero <> ${withoutIssues.length} THEN`);
p(`    RAISE EXCEPTION 'Federal wave F7: expected exactly ${withoutIssues.length} measures with no issue row (runbook rule 34, argued in the seed under censusRule34), found %.', n_zero;`);
p("  END IF;");
p();
p("  -- The check that makes rule 34 admissible here, and the only one that could fail for a");
p("  -- reason that matters: no senator's judged position may live ONLY on a zero-mapping roll.");
p("  -- Withholding a mapping is honest when the roll records nothing new and dishonest the");
p("  -- moment it is the sole record of somebody's yea or nay.");
p("  SELECT array_agg(id) INTO mapped_ids FROM vr_rollcalls");
p(`   WHERE (chamber, congress, session, roll_number) IN (${mappedRollTuples});`);
p("  SELECT array_agg(id) INTO zero_ids FROM vr_rollcalls");
p(`   WHERE (chamber, congress, session, roll_number) IN (${zeroRollTuples});`);
p("  SELECT count(*) INTO n_orphan_pos FROM (");
p("    SELECT DISTINCT v.politician_id FROM vr_member_votes v");
p("     WHERE v.rollcall_id = ANY(zero_ids) AND v.position IN ('yea','nay')");
p("       AND NOT EXISTS (");
p("         SELECT 1 FROM vr_member_votes w");
p("          WHERE w.rollcall_id = ANY(mapped_ids) AND w.politician_id = v.politician_id");
p("            AND w.position IN ('yea','nay'))");
p("  ) t;");
p("  IF n_orphan_pos > 0 THEN");
p("    RAISE EXCEPTION 'Federal wave F7: % member(s) hold a judged position only on a roll this wave leaves unmapped. Rule 34 admits a duplicate when it is the only record of somebody''s position, so either those rolls must be mapped or this wave is hiding a vote.', n_orphan_pos;");
p("  END IF;");
p();
p("  -- No new vocabulary. Every key used here must already appear on a measure outside this");
p("  -- wave, which is the strongest available assertion that nothing was invented.");
p("  SELECT count(DISTINCT issue_key) INTO n_keys FROM vr_measure_issues");
p("   WHERE measure_id IN (SELECT id FROM vr_measures WHERE congress = 119");
p(`     AND (measure_type, chamber, number) IN (\n     ${measureTuples}));`);
p(`  IF n_keys <> ${SEED._counts.keysUsed.length} THEN`);
p(`    RAISE EXCEPTION 'Federal wave F7: this wave writes % distinct keys, expected ${SEED._counts.keysUsed.length} (${SEED._counts.keysUsed.join(", ")}).', n_keys;`);
p("  END IF;");
p("  SELECT count(*) INTO n_newkeys FROM (");
p("    SELECT DISTINCT i.issue_key FROM vr_measure_issues i");
p("     WHERE i.measure_id IN (SELECT id FROM vr_measures WHERE congress = 119");
p(`       AND (measure_type, chamber, number) IN (\n       ${mappedTuples}))`);
p("       AND NOT EXISTS (");
p("         SELECT 1 FROM vr_measure_issues j WHERE j.issue_key = i.issue_key");
p("          AND j.measure_id NOT IN (SELECT id FROM vr_measures WHERE congress = 119");
p(`            AND (measure_type, chamber, number) IN (\n            ${measureTuples})))`);
p("  ) t;");
p("  IF n_newkeys > 0 THEN");
p("    RAISE EXCEPTION 'Federal wave F7: % key(s) exist only on this wave''s measures. This wave adds NO vocabulary — the two gaps it found, arms transfers to a partner other than Israel and police accountability rules, are named and left open in the seed — so a key with no prior instrument means one was invented here.', n_newkeys;");
p("  END IF;");
p();
p("  -- The _balance wall, asserted where it can be. F6's shipped wall forbids parking a row on");
p("  -- a key _rdSuppressedKey() leaves permanently unread, and this wave's one written");
p("  -- departure from the S.J.Res. 59 face is exactly that refusal.");
p("  SELECT count(*) INTO n_balance FROM vr_measure_issues");
p("   WHERE measure_id IN (SELECT id FROM vr_measures WHERE congress = 119");
p(`     AND (measure_type, chamber, number) IN (\n     ${measureTuples}))`);
p("     AND issue_key LIKE '%\\_balance';");
p("  IF n_balance > 0 THEN");
p("    RAISE EXCEPTION 'Federal wave F7: % row(s) on this wave''s measures sit on a *_balance key. Those rows are permanently unread and F6''s wall forbids using them as a car park.', n_balance;");
p("  END IF;");
p();
p("  -- Rule 30's wall, in the two forms that are actually true. First: every key this wave");
p("  -- writes must carry at least one primary row SOMEWHERE in the corpus, this wave included.");
p("  -- A key with no primary anywhere would mean every reading on it prints _rdPackageNote's");
p("  -- sentence, and that is a hundred readings changed by a row-level choice.");
p("  SELECT count(*) INTO n_nokey_primary FROM (");
p("    SELECT i.issue_key FROM vr_measure_issues i");
p(`     WHERE i.issue_key IN (${SEED._counts.keysUsed.map(q).join(", ")})`);
p("     GROUP BY i.issue_key");
p("    HAVING count(*) FILTER (WHERE i.is_primary) = 0");
p("  ) t;");
p("  IF n_nokey_primary > 0 THEN");
p("    RAISE EXCEPTION 'Federal wave F7: % of the keys this wave writes carry no primary row anywhere in the corpus. Rule 30: every reading on such a key prints the package sentence, so the primary wall is checked before a depth pass, not after.', n_nokey_primary;");
p("  END IF;");
p();
p("  -- Second: the split itself, asserted as a set. This wave supplies a primary on exactly");
p(`  -- ${primaryKeys.length} of its ${SEED._counts.keysUsed.length} keys (${primaryKeys.join(", ")}) and secondaries only on`);
p(`  -- ${secondaryOnlyKeys.join(" and ")}. That is a decision with a written reason in the seed under`);
p("  -- readDisclosure.primaryWallPerKey, and it was measured: zero members become newly readable");
p("  -- on a secondary-only key and zero readings start printing the package sentence. If somebody");
p("  -- later flips one of this wave's primaries to a secondary, that measurement is void, so the");
p("  -- set is pinned here rather than left to be re-derived by whoever is looking.");
p("  SELECT count(*) INTO n_wave_primary_keys FROM (");
p("    SELECT i.issue_key FROM vr_measure_issues i");
p("     WHERE i.measure_id IN (SELECT id FROM vr_measures WHERE congress = 119");
p(`       AND (measure_type, chamber, number) IN (\n       ${measureTuples}))`);
p("       AND i.is_primary");
p(`       AND i.issue_key IN (${primaryKeys.map(q).join(", ")})`);
p("     GROUP BY i.issue_key");
p("  ) t;");
p(`  IF n_wave_primary_keys <> ${primaryKeys.length} THEN`);
p(`    RAISE EXCEPTION 'Federal wave F7: this wave supplies a primary row on % of its keys, expected ${primaryKeys.length} (${primaryKeys.join(", ")}).', n_wave_primary_keys;`);
p("  END IF;");
p();
p("  -- The standing refusal, re-asserted where it can actually be checked.");
p("  SELECT count(*) INTO n_hr1069 FROM vr_measure_issues");
p("   WHERE measure_id IN (SELECT id FROM vr_measures WHERE congress = 119 AND number IN ('H.R. 1069','H.R. 973'));");
p("  IF n_hr1069 > 0 THEN");
p("    RAISE EXCEPTION 'Federal wave F7: H.R. 1069 / H.R. 973 now carry % issue row(s). Both are deliberately unmapped — F1 argued and refused the public_schools row, and rule 3 refuses gov_regulation on H.R. 973. F7 writes no new key, so nothing in it reopens either.', n_hr1069;");
p("  END IF;");
p();
p("  RAISE NOTICE 'Federal wave F7 verified: % measures (% with no issue row, rule 34), % rolls, % member votes, % issue rows on % keys.', n_measures, n_zero, n_rolls, n_votes, n_issues, n_keys;");
p("END $$;");
p();

const path = join(ROOT, "netlify", "database", "migrations", "20261023000000_vr_federal_wave_f7.sql");
writeFileSync(path, L.join("\n"));
console.log("wrote", path.replace(ROOT + "/", ""));
console.log("lines:", L.join("\n").split("\n").length);
console.log(`measures ${SEED.measures.length} (${withIssues.length} mapped, ${withoutIssues.length} zero-mapping) · rolls ${VOTES.votes.length} · issue rows ${SEED._counts.issueRows} · keys ${SEED._counts.keysUsed.length} · primaries on ${primaryKeys.length} keys`);
