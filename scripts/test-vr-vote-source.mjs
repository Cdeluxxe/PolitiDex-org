#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-vote-source.mjs — pdx_vote_actions decides how a member voted
// ─────────────────────────────────────────────────────────────────────────────
// Pins the join between the two roll-call ingest paths (netlify/lib/vr-vote-source.ts):
//   1. the one vocabulary mapping: yes→yea, no→nay, present, not_voting
//   2. overlayMemberVotes replaces a RawVote's positions with vote-actions' rows for
//      the SAME roll call (chamber+congress+session+roll), keeps a roll it lacks as
//      read, never attributes an unidentified (LIS-only) row, and leaves totals alone
//   3. a Senate RawVote built from vote-actions' parse of stored senate.gov XML has
//      the vr measure identity (canonical number, originating chamber) and sources
//   4. planReconcile: corrects a stored cell that disagrees, recomputes its party
//      flag, leaves agreeing cells, skips members vote-actions has no row for, and
//      never moves a cell with an approved correction
//   5. mergeSenateRollcalls: the curated seed's roll call wins over the live copy
//   6. the wiring: vr-ingest overlays every chamber's read, the cron reconciles,
//      and vote-actions never reads or writes vr_*
//
//   node scripts/test-vr-vote-source.mjs   (no database, no network)
import { mkdtempSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const dir = mkdtempSync(join(tmpdir(), "vr-vote-source-"));
const build = async (entry, name) => {
  const out = join(dir, `${name}.mjs`);
  await esbuild.build({ entryPoints: [join(ROOT, entry)], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "silent" });
  return import(pathToFileURL(out).href);
};
const S = await build("netlify/lib/vr-vote-source.ts", "src");
const VA = await build("netlify/lib/vote-actions-core.ts", "va");
const SEN = await build("netlify/lib/vr-senate-source.ts", "sen");

// 1. vocabulary
eq(["yes", "no", "present", "not_voting", "Guilty", null].map(S.positionOfVote), ["yea", "nay", "present", "not_voting", null, null], "vote → vr position");

// 2. overlay
const rv = (chamber, session, roll, memberVotes, totals = { yea: 9 }) => ({
  chamber, congress: 119, session, rollNumber: roll, voteDate: "2026-11-10T22:30:00.000Z", question: "On Passage",
  actionType: "passage", result: "Passed", totals, sourceUrl: "https://clerk.house.gov/evs/2026/roll300.xml",
  measure: { measureType: "bill", number: "H.R. 5000", title: "H.R. 5000", congress: 119, chamber: "house", sourceUrl: "https://www.congress.gov/bill/119th-congress/house-bill/5000" },
  memberVotes,
});
const act = (chamber, session, roll, bioguideId, vote, extra = {}) => ({ chamber, congress: 119, session, rollNumber: roll, bioguideId, politicianId: null, vote, party: "R", state: "AL", memberName: "X Y", ...extra });
const votes = [
  rv("house", 2, 300, [{ bioguideId: "A000055", position: "nay", party: "R" }, { bioguideId: "A000148", position: "yea", party: "D" }]),
  rv("house", 2, 301, [{ bioguideId: "A000055", position: "yea", party: "R" }]),       // vote-actions does not hold it
  rv("house", 1, 300, [{ bioguideId: "A000055", position: "yea", party: "R" }]),       // same roll number, other session
];
const byRoll = new Map([[S.rollIdentity("house", 119, 2, 300), [
  act("house", 2, 300, "A000055", "yes"), act("house", 2, 300, "A000148", "no", { party: "D" }),
  act("senate", 2, 300, null, "yes", { memberId: "S999" }),                            // unidentified
]]]);
const { votes: out, report } = S.overlayMemberVotes(votes, byRoll);
eq(out[0].memberVotes.map((m) => [m.bioguideId, m.position]), [["A000055", "yea"], ["A000148", "nay"]], "roll 300 positions come from pdx_vote_actions");
eq(out[0].totals, { yea: 9 }, "totals are left as the chamber reported them");
ok(out[1] === votes[1], "a roll call vote-actions lacks is kept exactly as read");
ok(out[2] === votes[2], "the same roll number in another session is not overlaid");
eq(report, { overlaid: 1, kept: 2, changedPositions: 2, unidentified: 1 }, "overlay report");
eq(S.memberVotesFromActions([act("house", 2, 1, "A1", "yes"), act("house", 2, 1, "A1", "no")]).memberVotes.length, 1, "a duplicate member row counts once");

// 3. Senate RawVote from stored XML
const xml = `<roll_call_vote><congress>119</congress><session>2</session><vote_number>77</vote_number>
  <vote_date>November 10, 2026, 05:30 PM</vote_date><vote_question_text>On Passage of the Bill</vote_question_text>
  <vote_result>Bill Passed</vote_result><document><document_type>S.</document_type><document_number>1234</document_number><document_title>A bill to do a thing</document_title></document>
  <amendment><amendment_number></amendment_number></amendment>
  <members><member><last_name>Senator</last_name><first_name>Ann</first_name><party>R</party><state>XX</state><vote_cast>Yea</vote_cast><lis_member_id>S999</lis_member_id></member></members>
</roll_call_vote>`;
const rec = VA.parseSenateVote(xml, 119, 2, 77);
const sv = S.rawVoteFromSenateRecord(rec);
ok(sv && sv.chamber === "senate" && sv.rollNumber === 77 && sv.session === 2, "Senate RawVote identity");
eq(sv && sv.measure.number, "S. 1234", "canonical vr measure number");
eq(sv && sv.measure.chamber, "senate", "originating chamber");
eq(sv && sv.actionType, "passage", "action type from the question");
ok(sv && /senate\.gov/.test(sv.sourceUrl) && /congress\.gov/.test(sv.measure.sourceUrl), "both sources present (the ingest's verifiability gate)");
eq(sv && sv.memberVotes, [], "no member list of its own — positions come from the overlay");
eq(S.rawVoteFromSenateRecord({ ...rec, unsupported: ["Guilty"] }), null, "unsupported vote words → no RawVote");
eq(S.rawVoteFromSenateRecord({ ...rec, measure: null }), null, "no measure → no RawVote");

// 4. reconcile planning
const memberMap = { A1: "alice", B2: "bob", C3: "carol", D4: "dan" };
const actions = [act("house", 2, 9, "A1", "yes"), act("house", 2, 9, "B2", "yes"), act("house", 2, 9, "C3", "no"), act("house", 2, 9, "D4", "no", { party: "D" })];
const stored = [
  { rollcallId: 5, politicianId: "alice", position: "nay", isParty: "against_party" }, // wrong → fix
  { rollcallId: 5, politicianId: "bob", position: "yea", isParty: "with_party" },      // agrees
  { rollcallId: 5, politicianId: "carol", position: "yea", isParty: null },            // wrong, but corrected
  { rollcallId: 5, politicianId: "erin", position: "yea", isParty: null },             // vote-actions has no row
];
const plan = S.planReconcile({ rollcallId: 5, stored, actions, memberMap, corrected: new Set(["5|carol"]) });
eq(plan.changes, [{ rollcallId: 5, politicianId: "alice", from: "nay", to: "yea", isParty: "with_party" }], "only the disagreeing, uncorrected cell changes, party flag recomputed");
eq(plan.protectedByCorrection, [{ rollcallId: 5, politicianId: "carol", from: "yea", to: "nay" }], "an approved correction protects its cell");
eq(plan.compared, 3, "members without a vote-actions row are not compared");
eq(S.planReconcile({ rollcallId: 5, stored, actions: [], memberMap }).changes, [], "no vote-actions rows → nothing changes");

// 5. seed wins over the live copy of the same roll
const seedV = { ...rv("senate", 1, 10, []), measure: { ...rv("senate", 1, 10, []).measure, title: "Curated title" } };
const liveSame = { ...rv("senate", 1, 10, []), measure: { ...rv("senate", 1, 10, []).measure, title: "S. 1" } };
const liveNew = { ...rv("senate", 1, 11, []), voteDate: "2026-11-11T00:00:00.000Z" };
const merged = SEN.mergeSenateRollcalls([seedV], [liveSame, liveNew], 20);
eq(merged.map((v) => [v.rollNumber, v.measure.title]), [[11, "H.R. 5000"], [10, "Curated title"]], "merge: seed copy kept, live-only roll added, newest first");
delete process.env.VR_SENATE_XML;
let storedCalled = false;
await SEN.fetchSenateRollcalls({ congress: 119, limit: 5, stored: async () => { storedCalled = true; return [liveNew]; } });
ok(!storedCalled, "without VR_SENATE_XML the stored-XML reader is not consulted (default unchanged)");

// 6. wiring (source text)
const ingest = readFileSync(join(ROOT, "netlify/lib/vr-ingest.ts"), "utf8");
const fetchFn = ingest.slice(ingest.indexOf("async function fetchChamberRollcalls"), ingest.indexOf("// ── Verification"));
ok(/overlayFromVoteActions\(read\)/.test(fetchFn), "vr-ingest overlays the read for both chambers");
ok(/senateRollcallsFromVoteActions/.test(fetchFn), "the live Senate path reads vote-actions' stored XML");
const cron = readFileSync(join(ROOT, "netlify/functions/vr-ingest-cron.mts"), "utf8");
ok(/reconcileAndRefresh/.test(cron), "the cron reconciles");
ok(/writeMemberPack/.test(readFileSync(join(ROOT, "netlify/lib/vr-reconcile.ts"), "utf8")), "reconcile refreshes the moved members' packs");
for (const f of ["netlify/lib/vote-actions-core.ts", "netlify/lib/vote-actions-db.ts", "netlify/functions/vote-actions-cron.mts"]) {
  ok(!/vr-vote-source|vrMemberVotes|vr_member_votes/.test(readFileSync(join(ROOT, f), "utf8")), `${f} does not read or write vr_member_votes (one-way)`);
}

if (failures.length) { console.error(`✗ ${failures.length} failure(s):\n  ${failures.join("\n  ")}`); process.exit(1); }
console.log(`✓ test-vr-vote-source: ${passed} checks passed`);
