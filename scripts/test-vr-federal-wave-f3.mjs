#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-federal-wave-f3.mjs — the chamber gap closed on two keys, and nothing else moved
// ─────────────────────────────────────────────────────────────────────────────
// F3 exists because of one census number: of the 98 keys the formal index reports
// on, only 35 had a PRIMARY instrument a senator could have voted on. On the other
// 63 a senator's issue row is written by the primary wall rather than by their
// record — the engine prints "Not about this issue" about a key the member has voted
// on four times. The wave supplies two real PRIMARYs and claims 184 rows start being
// characterised. That is a coverage number going up, which is the shape of change
// easiest to fake, and there are five ways to fake it. This file closes all five:
//
//   1. LOWER A FLOOR. _RD_MIN_PRIMARY = 0 turns every `incidental` row in the corpus
//      readable at once, for free, without a single new vote. Asserted unmoved by
//      reading the literal out of stance-helpers.js — not by trusting the seed.
//   2. INVENT A KEY. Mint a chip for whatever the measure happens to be about and the
//      refusal disappears. Asserted: zero keys added, every key F3 touches was already
//      in db/issue-keys.json, and H.R. 1069 is still mapped nowhere in any migration.
//   3. DUMP ON A COUSIN. lands_preserve and lands_energy are cousins; so are
//      energy_production and climate_action, and water sits next to all of them.
//      H.J.Res. 140 was read against six of them and mapped to two. Asserted: eight
//      keys carry a written refusal, each refusal is an argument rather than a label,
//      and the migration's verification block asserts each refused key as a ZERO so a
//      later pass cannot quietly contradict the argument without tripping.
//   4. PILE SECONDARIES. A non-primary row raises the coverage count while the primary
//      wall pushes members onto `incidental`. F3 admits ONE secondary (lands_energy
//      w75, the mirror of the primary) and refuses two (the gov_regulation process
//      rows) on the arithmetic: the admitted one gains 8 rows and costs 1, the refused
//      ones gain 0 and cost 2. Asserted: exactly one accepted non-primary row, its
//      polarity pinned, and the refusals recorded.
//   5. REPORT ONLY THE WINS. Publish 184 gained and not the 1 lost. Asserted: the
//      disclosure exists, its arithmetic is internally consistent, and the migration's
//      own header quotes the same numbers.
//
// AND THE SIXTH, WHICH IS NOT A FAKE BUT A BREAKAGE. A wave that adds a mapping can
// silently move a Direction Match percentage or an issue row's verdict, because the
// same measures feed both lanes. Section 11 boots the tree at HEAD and the tree as it
// stands now, side by side in two vm contexts, and requires DM and every per-issue row
// to come out bit-for-bit identical — with NO waiver list, because F3's only change to
// a booted file is prose inside _DOS_MECH. Any drift at all is a bug.
//
// WHY THE READ-LOSS CHECK IS PINNED HERE AND MEASURED THERE. The authoritative no-loss
// check compares, for every federal pid, the set of rows the engine marks `read` before
// the wave against the set after — which needs the live database, which no test in this
// suite touches. So the comparison lives in scripts/vr-federal-fpi.mjs (readSets(),
// printed as "rows that STOPPED being characterised") and its RESULT is recorded in the
// decision seed. What this file guarantees is that the check still exists, that the
// recorded result is self-consistent, and that nobody reverted to the old tier-gated
// list — which cannot see this wave at all, because a row moving unread → read-thin
// stays in shape()'s tail either way. It changes which tail bucket counts the row
// (thinN → readThinN, which is the whole point of splitting them) and never enters the
// `characterised` figure, which is still strong/mostly plus split.
//
//   node scripts/test-vr-federal-wave-f3.mjs
//
// Exit code is non-zero on the first failure so it can gate CI.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));

let passed = 0;
const failures = [];
// Returns the verdict, because several assertions below gate a whole block of field
// checks on it (`if (!ok(...)) continue;`). A void `ok` made that guard always
// continue in the F2 file, silently skipping every tally and attribution check.
const ok = (cond, msg) => { if (cond) { passed++; return true; } failures.push(msg); return false; };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const MIG_DIR = "netlify/database/migrations";
const MIG = "20261017000000_vr_federal_wave_f3.sql";
const VOTES = "db/vr-federal-wave-f3-vote-seed.json";
const DECIDE = "db/vr-federal-mapping-seed-f3.json";
const GEN = "scripts/vr-gen-federal-wave-f3-migration.mjs";

const MIG_SQL = existsSync(join(ROOT, MIG_DIR, MIG)) ? R(join(MIG_DIR, MIG)) : "";
const votes = J(VOTES);
const decide = J(DECIDE);
const memberMap = J("db/vr-member-map.json");
const ROSTER = new Set(Object.values(memberMap.map || {}));

// ── 1. the three admitted rolls, field by field ──────────────────────────────
// Every value here was read out of the Senate's LIS XML or the House Clerk's EVS XML
// by the seed builder and is restated as a literal, so a regenerated seed that drifts
// is caught rather than trusted. A tally is not a detail: it is what makes the vote
// quotable, and H.J.Res. 140's two tallies (50-49 and 214-208) are the whole reason
// the measure is admissible under rule 11 at all.
const WANT = [
  { chamber: "senate", congress: 119, session: 1, rollNumber: 238, number: "S.J.Res. 7",
    question: "On the Joint Resolution", result: "passed", actionType: "passage",
    yea: 50, nay: 38, notVoting: 12, attributed: 98, voteDate: "2025-05-08T11:18:00-04:00" },
  { chamber: "senate", congress: 119, session: 2, rollNumber: 84, number: "H.J.Res. 140",
    question: "On the Joint Resolution", result: "passed", actionType: "passage",
    yea: 50, nay: 49, notVoting: 1, attributed: 97, voteDate: "2026-04-16T11:08:00-04:00" },
  { chamber: "house", congress: 119, session: 2, rollNumber: 38, number: "H.J.Res. 140",
    question: "On Passage", result: "passed", actionType: "passage",
    yea: 214, nay: 208, notVoting: 9, attributed: 108, voteDate: "2026-01-21T16:45:00-05:00" },
];
eq((votes.votes || []).length, WANT.length, "F3 vote seed holds exactly the admitted rolls");
eq(votes.rollCallCount, WANT.length, "F3 vote seed's own roll count");
eq(votes.memberVoteCount, 303, "F3 vote seed member-vote total");
eq(votes.skippedVoteCount, 328, "F3 vote seed skipped-vote total — skips are counted, never guessed");

let sumAttributed = 0, sumSkipped = 0;
for (const want of WANT) {
  const v = (votes.votes || []).find((x) => x.chamber === want.chamber && x.congress === want.congress
    && x.session === want.session && x.rollNumber === want.rollNumber);
  const at = `${want.chamber} ${want.congress}/${want.session} roll ${want.rollNumber}`;
  if (!ok(!!v, `${at} (${want.number}) is missing from ${VOTES}`)) continue;
  eq(v.measure.number, want.number, `${at} sits on the right measure`);
  eq(v.question, want.question, `${at} question`);
  eq(v.result, want.result, `${at} result`);
  eq(v.actionType, want.actionType, `${at} action_type`);
  eq(v.totals.yea, want.yea, `${at} yea`);
  eq(v.totals.nay, want.nay, `${at} nay`);
  eq(v.totals.notVoting, want.notVoting, `${at} not voting`);
  eq(v.admittedAs, "decisive", `${at} is admitted as the decisive act`);
  // decisiveWhy is deliberately null on all three of these rolls, and that is the
  // assertion rather than an omission to tolerate. Rule 12 admits a Senate 'On the
  // Joint Resolution' and a House 'On Passage' on the FORM of the question alone — the
  // form IS the argument — so a free-text reason would be a restatement, and F2's rolls
  // carried one only because two of them needed the rule-8 question walked. What has to
  // exist instead is the measure-level decisiveQuestion check naming this roll's form,
  // which section 2 pins. So: null here, argued there, and never one without the other.
  eq(v.decisiveWhy, null,
    `${at} carries a free-text decisiveWhy. These rolls are admitted on the question form under rule 12; a prose reason here means the form was not sufficient, which is a different admission and needs the check rewritten too.`);
  ok(/^https:\/\//.test(v.sourceUrl || ""), `${at} carries no https source`);

  // WHEN, to the minute, in the zone the chamber voted in (runbook rule 37). Neither
  // document prints an offset: senate.gov prints Eastern wall time bare, and the
  // Clerk's EVS puts 24-hour ET in the time-etz attribute of <action-time>. A seed
  // that files the calendar day alone ships TIMESTAMPTZ '2026-01-21', which Postgres
  // reads as midnight in the server's zone and can print the vote on 2026-01-20. So
  // the literal asserted here is the full offset-bearing timestamp, the offset is
  // re-derived from Eastern daylight saving for that date, and the migration is
  // required to insert the same string the seed holds.
  eq(v.voteDate, want.voteDate, `${at} voteDate is not the timestamp the chamber's document prints`);
  ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-0[45]:00$/.test(String(v.voteDate)),
    `${at} voteDate is not an offset-bearing ISO timestamp — a bare date lands as server-local midnight`);
  const nthSun = (y, mo, n) => { let c = 0; for (let d = 1; d <= 31; d++) { const dt = new Date(Date.UTC(y, mo - 1, d)); if (dt.getUTCMonth() !== mo - 1) break; if (dt.getUTCDay() === 0 && ++c === n) return d; } return null; };
  const [yy, mm, dd] = String(v.voteDate).slice(0, 10).split("-").map(Number);
  const dst = (mm > 3 || (mm === 3 && dd >= nthSun(yy, 3, 2))) && (mm < 11 || (mm === 11 && dd < nthSun(yy, 11, 1)));
  eq(String(v.voteDate).slice(-6), dst ? "-04:00" : "-05:00", `${at} voteDate offset does not match Eastern time on that date`);
  ok(MIG_SQL.includes(`TIMESTAMPTZ '${want.voteDate}'`),
    `${at} migration does not insert the seed's timestamp — the deployed row and the seed disagree about when the vote happened`);

  // Rule 11 / Utah §1121: below one tenth of the yea+nay pool on the losing side, the
  // vote differentiates nobody. Recomputed here rather than read from the seed, because
  // marginShare is the field a pass under pressure would soften. All three of these
  // clear the bar by a wide margin — 43.2%, 49.5%, 49.3% — which is the point: this
  // wave declined seven rolls and admitted three, and the three it admitted are the
  // genuinely contested ones.
  const pool = v.totals.yea + v.totals.nay;
  const share = Math.min(v.totals.yea, v.totals.nay) / pool;
  ok(share >= 0.1, `${at} losing side is ${(share * 100).toFixed(3)}% of the yea+nay pool — under rule 11's one-tenth bar`);
  eq(v.marginShare, Number(share.toFixed(5)), `${at} recorded marginShare does not match the tallies (${share})`);

  // Attribution is fail-closed by design, so the seed's own counters and its member
  // rows have to agree, and every slug has to be on the roster. A slug that is not is
  // not a roster gap — it is a resolution bug that files a vote against nobody.
  eq(v.memberVotes.length, want.attributed, `${at} attributed member count`);
  eq(v.resolution.attributed, want.attributed, `${at} recorded resolution.attributed`);
  eq(v.resolution.skipped, v.resolution.listed - v.resolution.attributed,
    `${at} recorded skip count does not equal listed minus attributed`);
  // Every skipped vote is accounted for by a NAMED reason. This is the "skips counted,
  // not guessed" clause of the brief expressed as arithmetic: the five skip ledgers
  // must together account for the whole difference, with nothing left over.
  const ledger = ["unmappedBioguide", "unresolvedLis", "noRosterNameState", "ambiguousNameState", "keyDisagreement"];
  const ledgered = ledger.reduce((n, f) => n + (v.resolution[f] || []).length + (typeof v.resolution[f] === "number" ? v.resolution[f] : 0), 0);
  eq(ledgered, v.resolution.listed - v.resolution.attributed,
    `${at} listed minus attributed is not fully accounted for by the named skip ledgers`);
  sumAttributed += v.resolution.attributed;
  sumSkipped += v.resolution.skipped;

  // Chamber-asymmetric keying, asserted as such. The Senate rolls are double-keyed —
  // a senator is attributed only when the bioguide chain and the unique (surname,
  // state) pair name the SAME roster slug — so every Senate row carries a LIS member
  // id. The Clerk publishes bioguide on every recorded-vote row and there is no
  // surname+state key to cross-check it against, so House rows carry lisMemberId null
  // and are attributed on one key. Asserting `null` rather than allowing either shape
  // is what stops a future builder from silently inventing a LIS id for a House
  // member, which would make the two documents look like one document.
  const badKey = [];
  for (const mv of v.memberVotes) {
    if (want.chamber === "senate" && !(typeof mv.lisMemberId === "string" && mv.lisMemberId)) badKey.push(mv.politicianId);
    if (want.chamber === "house" && mv.lisMemberId !== null) badKey.push(mv.politicianId);
    ok(typeof mv.bioguideId === "string" && /^[A-Z]\d{6}$/.test(mv.bioguideId || ""),
      `${at} member row for ${mv.politicianId} has no well-formed bioguide`);
  }
  eq(badKey.length, 0, `${at} carries the wrong attribution key for its chamber: ${badKey.slice(0, 5).join(", ")}`);

  const seen = new Set();
  let dupes = 0; const offRoster = [], badPos = [];
  for (const mv of v.memberVotes) {
    if (seen.has(mv.politicianId)) dupes++;
    seen.add(mv.politicianId);
    if (!ROSTER.has(mv.politicianId)) offRoster.push(mv.politicianId);
    if (!["yea", "nay", "present", "not_voting"].includes(mv.position)) badPos.push(`${mv.politicianId}=${mv.position}`);
  }
  eq(dupes, 0, `${at} attributes a member twice`);
  eq(offRoster.length, 0, `${at} attributes votes to slugs outside db/vr-member-map.json: ${offRoster.join(", ")}`);
  eq(badPos.length, 0, `${at} carries an unknown position: ${badPos.join(", ")}`);

  // The attributed yea/nay counts must not exceed the document's own tallies. They
  // will be lower — two senators have no roster slug, and the House roster here is a
  // reviewed subset rather than the whole chamber — but never higher.
  for (const side of ["yea", "nay"]) {
    const n = v.memberVotes.filter((m) => m.position === side).length;
    ok(n <= v.totals[side], `${at} attributes ${n} ${side} votes but the document records ${v.totals[side]}`);
  }
}
eq(sumAttributed, votes.memberVoteCount, "the per-roll attributed counts do not add up to the seed's total");
eq(sumSkipped, votes.skippedVoteCount, "the per-roll skip counts do not add up to the seed's total");
eq(sumAttributed, decide._counts.memberVotesAttributed, "the vote seed and the decision seed disagree about how many votes were attributed");
eq(sumSkipped, decide._counts.memberVotesSkipped, "the vote seed and the decision seed disagree about how many votes were skipped");

// H.J.Res. 140 is one measure with two acts (rule 34): identical text voted twice, in
// two chambers, so two roll calls hang off one measure id. If a later pass split it
// into two measures the chamber-gap this wave exists to close would reopen silently.
eq((votes.votes || []).filter((v) => v.measure.number === "H.J.Res. 140").length, 2,
  "H.J.Res. 140 must carry BOTH of its rolls — a House measure whose own chamber never appears among its roll calls is the ingest gap rule 30's second corollary names");
eq(new Set((votes.newMeasures || [])).size, 2, "F3 creates exactly two measures");
eq((votes.newMeasures || []).join("|"), "S.J.Res. 7|H.J.Res. 140", "the measures F3 creates");

// ── 2. what the wave maps, and its polarity ─────────────────────────────────
// Three rows. Two PRIMARY and one mirror secondary, and the polarity of all three is
// the whole claim: both resolutions DISAPPROVE an agency document, so a yea withdraws
// the thing the document did. Flip support_meaning on the broadband row and the record
// publishes fifty senators as having voted FOR a connectivity subsidy they voted to
// kill; flip the lands_energy row and it publishes the resolution as a vote AGAINST
// mineral leasing when its whole effect is to reopen 225,504 acres to it.
const accepted = [];
const refused = [];
for (const m of decide.measures || []) {
  for (const i of m.issues || []) {
    if (i.decision === "ACCEPTED") accepted.push({ m, i });
    if (i.decision === "REFUSED") refused.push({ m, i });
  }
}
eq(accepted.length, 3, "F3 accepts exactly three mapped rows");
eq(decide._counts.rowsAccepted, 3, "the decision seed's own accepted-row count");
const ROWS = [
  { number: "S.J.Res. 7", key: "broadband", weight: 100, primary: true, meaning: "yea_opposes" },
  { number: "H.J.Res. 140", key: "lands_preserve", weight: 90, primary: true, meaning: "yea_opposes" },
  { number: "H.J.Res. 140", key: "lands_energy", weight: 75, primary: false, meaning: "yea_supports" },
];
for (const want of ROWS) {
  const hit = accepted.find(({ m, i }) => m.number === want.number && i.issueKey === want.key);
  const at = `${want.number} · ${want.key}`;
  if (!ok(!!hit, `${at} is not an accepted row in ${DECIDE}`)) continue;
  const i = hit.i;
  eq(i.weight, want.weight, `${at} weight`);
  eq(i.isPrimary, want.primary, `${at} is_primary`);
  eq(i.supportMeaning, want.meaning, `${at} polarity — a disapproval resolution inverts the thing it disapproves`);
  ok(typeof i.rationale === "string" && i.rationale.length >= 200, `${at} carries a real rationale`);
  ok(/^https:\/\//.test(i.sourceUrl || ""), `${at} carries an https primary source`);
  // The rationale that ships is the one in db/vr-issue-seed.json, because that is the
  // file the generator reads. A decision seed that argued one polarity while the issue
  // seed shipped another would put the argument and the deployed row out of step.
  const live = ((J("db/vr-issue-seed.json").measures || []).find((m) => m.number === want.number) || { issues: [] })
    .issues.find((x) => x.issueKey === want.key);
  if (ok(!!live, `${at} is not in db/vr-issue-seed.json, which is the file the generator actually reads`)) {
    eq(live.weight, want.weight, `${at} issue-seed weight disagrees with the decision seed`);
    eq(live.isPrimary, want.primary, `${at} issue-seed is_primary disagrees with the decision seed`);
    eq(live.supportMeaning, want.meaning, `${at} issue-seed polarity disagrees with the decision seed`);
  }
}
// Exactly one accepted non-primary row, and it must be the mirror of a primary on the
// same measure. Rule 30: a key is fixed by supplying a PRIMARY, never by a fifth
// secondary — so a second unpaired secondary appearing here would be the failure mode
// the wave was written to avoid.
const secondaries = accepted.filter(({ i }) => i.isPrimary !== true);
eq(secondaries.length, 1, "F3 admits exactly one non-primary row");
{
  const sec = secondaries[0];
  const prim = accepted.find(({ m, i }) => m.number === sec.m.number && i.isPrimary === true);
  ok(!!prim, "the accepted secondary has no primary on the same measure to mirror");
  ok(prim && prim.i.supportMeaning !== sec.i.supportMeaning,
    "the mirror pair carries the SAME polarity on both rows — a mirror that agrees with itself is two votes for one act");
}

// Eight keys read and refused in writing, ten refusals in total: gov_regulation and
// rural_ag were each read on both measures and refused twice, on separate arguments.
eq(refused.length, 10, "F3 records exactly ten refused mappings in writing");
eq(decide._counts.rowsRefused, 10, "the decision seed's own refused-row count");
const REFUSED_KEYS = [...new Set(refused.map(({ i }) => i.issueKey))].sort();
eq(REFUSED_KEYS.join(","), "climate_action,edu_college_cost,energy_production,gov_regulation,public_schools,rural_ag,states_federal_power,water",
  "the set of refused keys");
for (const { m, i } of refused) {
  ok((i.why || "").length >= 200, `${m.number} · ${i.issueKey} refusal is a label, not an argument (${(i.why || "").length} chars)`);
  ok(/^REFUSED/.test(i.why || ""), `${m.number} · ${i.issueKey} refusal does not open by saying it is one`);
  ok(i.weight === undefined && i.isPrimary === undefined && i.supportMeaning === undefined,
    `${m.number} · ${i.issueKey} is refused but carries a weight or polarity — a refusal that keeps its numbers is a draft, not a refusal`);
}
// The cousin refusals by name. These are the three pairs the brief names, and each one
// is refused on a discriminator rather than on taste: energy_production because
// H.J.Res. 131's own live rationale sets the precedent the other way, climate_action
// and water on their own scope notes.
for (const [key, needle] of [["energy_production", /131/], ["climate_action", /scope note|H\.J\.Res\. 88/], ["water", /scope note/]]) {
  const hit = refused.find(({ i }) => i.issueKey === key);
  ok(hit && needle.test(hit.i.why || ""),
    `the ${key} refusal does not cite its discriminator — a cousin key refused without one is refused on taste`);
}
// The gov_regulation refusal is the wave's one deliberate divergence from a live corpus
// habit: every other CRA in the record carries a gov_regulation process row. It was
// refused on arithmetic — the row gains ZERO characterised rows and costs TWO — and
// that arithmetic is what the census table's gov_regulation line exists to show.
{
  const gr = refused.filter(({ i }) => i.issueKey === "gov_regulation");
  eq(gr.length, 2, "gov_regulation must be refused on BOTH new resolutions, not just the one it looks odd on");
  ok(gr.some(({ i }) => /divergence/i.test(i.why || "")),
    "the gov_regulation refusal does not admit that it diverges from the live corpus habit");
}

// The refusals that mattered most are roll calls, not keys. Seven were declined, and
// the entry that carries the wave's central discipline is the motion-to-proceed sweep:
// rule 8 does not admit a procedural vote as the measure's act, however contested.
const declined = decide.declinedRollCalls || [];
eq(declined.length, 7, "F3 records exactly seven declined roll calls");
eq(decide._counts.rollCallsDeclined, 7, "declined roll-call count");
ok(declined.every((d) => (d.why || "").length >= 80), "every declined roll call carries a written reason");
ok(declined.every((d) => (d.roll || "").length > 0 && (d.measure || "").length > 0),
  "a declined roll call is recorded without naming the roll or the measure it sits on");
ok(declined.some((d) => /rule 8/i.test(d.why || "")), "no declined roll call cites rule 8 — the motion-to-proceed sweep is missing its rule");
ok(declined.some((d) => /rule 11/i.test(d.why || "")), "no declined roll call cites rule 11 — the near-unanimous vehicles are missing their rule");
ok(declined.some((d) => /reserve fund/i.test(d.why || "")), "no declined roll call names a reserve fund — rule 31's tell is the brief's first named refusal");

// ── 3. nothing was retracted, and that is argued, not assumed ───────────────
// Rule 32: when a key gains a PRIMARY, the live MAPPINGS on that key have to be walked
// too, because a row that was the best available reading of the key can be plainly
// wrong once a real primary exists. F3 walked them and retracted nothing — which is a
// finding, and has to be written as one. An empty `retractions` with no note would be
// indistinguishable from a pass that never looked.
eq((decide.retractions || []).length, 0, "F3 retracts nothing");
eq(decide._counts.rowsRetracted, 0, "the decision seed's own retraction count");
ok(typeof decide._retractionsNote === "string" && decide._retractionsNote.length >= 300,
  "F3 retracts nothing and does not say it walked rule 32 — an empty retraction list with no note cannot be told apart from a pass that never looked");
ok(/rule 32/i.test(decide._retractionsNote || ""), "the retraction note does not cite rule 32");

// ── 4. no floor moved ────────────────────────────────────────────────────────
// The single cheapest way to fake this wave. _RD_MIN_PRIMARY = 0 turns every
// `incidental` row in the corpus readable for free, and `incidental` is 1486 of the
// 3522 unread senator rows the census counted. Read as a literal out of the engine
// rather than from the seed's own claim about itself.
const helpers = R("stance-helpers.js");
const floor = (name) => {
  const m = helpers.match(new RegExp(`var\\s+${name}\\s*=\\s*(\\d+)\\s*;`));
  return m ? Number(m[1]) : null;
};
eq(floor("_RD_MIN_PRIMARY"), 1, "_RD_MIN_PRIMARY is unmoved — this wave supplies primaries, it does not stop requiring one");
eq(floor("_RD_MIN_JUDGED"), 4, "_RD_MIN_JUDGED is unmoved");
eq(floor("_RD_SPLIT_MIN_JUDGED"), 6, "_RD_SPLIT_MIN_JUDGED is unmoved");
eq(floor("_RD_SPLIT_MIN_SIDE"), 2, "_RD_SPLIT_MIN_SIDE is unmoved");
eq(floor("_RD_MEMBER_FLOOR"), 12, "_RD_MEMBER_FLOOR is unmoved");
eq(decide._counts.floorsMoved, 0, "the decision seed claims no floor moved");
eq(decide._counts.keysAdded, 0, "the decision seed claims no key added");

// ── 5. no key invented, and H.R. 1069 is still mapped nowhere ───────────────
// The brief allowed ONE new key under the V1 standing rules and only if all four
// clauses passed with two instruments mapped. None was proposed, because every
// remaining hole this wave found is an attribution hole — no instrument, or no
// recorded vote — and a new chip cannot fill one of those.
const keyFile = J("db/issue-keys.json");
const KNOWN = new Set(keyFile.keys || []);
eq(KNOWN.size, keyFile.count, "db/issue-keys.json count matches its own key list");
for (const { m, i } of accepted) ok(KNOWN.has(i.issueKey), `${m.number} maps ${i.issueKey}, which is not in db/issue-keys.json — F3 added a key`);
for (const { m, i } of refused) ok(KNOWN.has(i.issueKey), `${m.number} refuses ${i.issueKey}, which is not a known key — a refusal on an invented key is not a refusal`);
for (const r of (decide.census || {}).beforeTable || []) ok(KNOWN.has(r.key), `the census reports on ${r.key}, which is not a known key`);
for (const b of decide.blockedOn || []) ok(KNOWN.has(b.key), `blockedOn names ${b.key}, which is not a known key`);

// Scanned locally rather than by importing test-mapping-discipline.mjs, which runs its
// whole suite on import and can exit(1) — masking this file's result with another
// file's. A migration maps H.R. 1069 if it looks the measure up into a plpgsql local
// and then names that local in a vr_measure_issues insert.
function stripSqlComments(src) {
  let out = "", i = 0, q = false;
  while (i < src.length) {
    if (q) { if (src[i] === "'") { if (src[i + 1] === "'") { out += "''"; i += 2; continue; } q = false; } out += src[i++]; continue; }
    if (src[i] === "'") { q = true; out += src[i++]; continue; }
    if (src[i] === "-" && src[i + 1] === "-") { while (i < src.length && src[i] !== "\n") i++; continue; }
    out += src[i++];
  }
  return out;
}
const migFiles = readdirSync(join(ROOT, MIG_DIR)).filter((f) => f.endsWith(".sql")).sort();
const mapped1069 = [];
for (const f of migFiles) {
  const src = stripSqlComments(R(join(MIG_DIR, f)));
  if (!src.includes("H.R. 1069")) continue;
  const vars = new Set();
  for (const m of src.matchAll(/SELECT\s+id\s+INTO\s+(\w+)\s+FROM\s+vr_measures([\s\S]{0,300}?);/gi)) {
    if (m[2].includes("'H.R. 1069'")) vars.add(m[1]);
  }
  for (const m of src.matchAll(/INSERT INTO vr_measure_issues[\s\S]{0,4000}?;/gi)) {
    for (const v of vars) if (new RegExp(`\\(\\s*${v}\\s*,`).test(m[0])) mapped1069.push(`${f} (${v})`);
  }
}
eq(mapped1069.length, 0,
  `H.R. 1069 carries an issue mapping in a migration (${mapped1069.join(", ")}). F1 refused nine candidate keys `
  + "on it in writing and F3 was told again not to invent one for the 1069-class vocabulary gap unless the V1 "
  + "standing rules all pass. They do not: the vocabulary still has no key for foreign influence in domestic institutions.");
ok(!(J("db/vr-issue-seed.json").measures || []).some((m) => m.number === "H.R. 1069"),
  "H.R. 1069 is mapped in db/vr-issue-seed.json");

// ── 6. the migration says what the seeds say ────────────────────────────────
ok(existsSync(join(ROOT, MIG_DIR, MIG)), `${MIG} is on disk`);
const sql = MIG_SQL;
const code = stripSqlComments(sql);

for (const want of WANT) {
  ok(sql.includes(`AND session = ${want.session} AND roll_number = ${want.rollNumber} LIMIT 1;`),
    `${MIG} does not read back ${want.chamber} ${want.congress}/${want.session} roll ${want.rollNumber}`);
  ok(code.includes(`WHERE chamber = '${want.chamber}' AND congress = ${want.congress} AND session = ${want.session} AND roll_number = ${want.rollNumber}`),
    `${MIG} reads back roll ${want.rollNumber} without pinning its chamber — two chambers number their rolls independently`);
}
eq((code.match(/INSERT INTO vr_rollcalls/g) || []).length, 3, `${MIG} roll-call inserts`);
eq((code.match(/INSERT INTO vr_member_votes/g) || []).length, 3, `${MIG} member-vote inserts`);
eq((code.match(/INSERT INTO vr_measure_issues/g) || []).length, 2,
  `${MIG} mapping inserts — one statement per measure, carrying three rows between them`);
eq((code.match(/ON CONFLICT \(rollcall_id, politician_id\) DO NOTHING/g) || []).length, 3,
  `${MIG} must top up member votes idempotently, never overwrite`);
eq((code.match(/ON CONFLICT \(chamber, congress, session, roll_number\) DO NOTHING/g) || []).length, 3,
  `${MIG} must insert roll calls idempotently`);
eq((code.match(/ON CONFLICT \(measure_id, issue_key\) DO NOTHING/g) || []).length, 2,
  `${MIG} must never rewrite a live rationale`);

// F3 adds and attributes. It removes nothing and rewrites nothing, so a DELETE or an
// UPDATE appearing here is not a smaller version of this wave — it is a different one.
eq((code.match(/\bDELETE FROM\b/g) || []).length, 0, `${MIG} holds a DELETE — F3 retracts nothing`);
eq((code.match(/^\s*UPDATE vr_/gm) || []).length, 0, `${MIG} rewrites a live row with an UPDATE`);

// Creation must be guarded: federal (measure_type, congress, chamber, number) has no
// unique index, so an unguarded INSERT duplicates the measure on a second run and
// splits its rolls across two ids — which for H.J.Res. 140 would put its House roll on
// one id and its Senate roll on another and recreate the exact chamber gap this wave
// closed.
for (const [n, varn] of [["S.J.Res. 7", "m_119_s_j_res_7"], ["H.J.Res. 140", "m_119_h_j_res_140"]]) {
  ok(new RegExp(`IF ${varn} IS NULL THEN\\s*INSERT INTO vr_measures`).test(code),
    `${MIG} creates ${n} without an IF ... IS NULL guard`);
  ok(new RegExp(`IF ${varn} IS NULL THEN\\s*RAISE EXCEPTION`).test(code),
    `${MIG} does not re-check that ${n} could be read back after creation`);
}
ok(!/vr_measures[\s\S]{0,400}?ON CONFLICT/.test(code.split("INSERT INTO vr_rollcalls")[0] || ""),
  `${MIG} relies on ON CONFLICT for vr_measures, which carries no unique index for federal measures`);

// The verification block's own tripwires. Each of these is a sentence a future pass
// would have to delete on purpose.
for (const assertion of [
  "H.R. 1069 is deliberately unmapped",
  "broadband w100 PRIMARY yea_opposes",
  "lands_preserve w90 PRIMARY yea_opposes",
  "lands_energy w75 secondary yea_supports",
  "roll call(s) in the senate",              // S.J.Res. 7's own-chamber assertion
  "roll call(s) in the house",               // H.J.Res. 140's own-chamber assertion
  "broadband PRIMARY measure",               // the global Senate-reachability floor
  "lands_preserve PRIMARY measure",
]) ok(sql.includes(assertion), `${MIG}'s verification block dropped the assertion for: ${assertion}`);
// Every refused key is asserted as a ZERO, scoped to this pass's own measures. That is
// what makes a refusal enforceable rather than decorative: contradicting the argument
// later trips the guard and prints the argument being contradicted.
for (const k of REFUSED_KEYS) {
  ok(new RegExp(`n_refused_${k}\\s*<>\\s*0`).test(code),
    `${MIG} does not assert the ${k} refusal as a zero — an unenforced refusal is a comment`);
  ok(sql.includes(`${k} was READ AND REFUSED`),
    `${MIG}'s ${k} exception message does not name the refusal it is defending`);
}
// Both own-chamber assertions, by variable, so the check cannot be satisfied by one
// measure's counter twice.
for (const varn of ["n_own_m_119_s_j_res_7", "n_own_m_119_h_j_res_140"]) {
  ok(new RegExp(`${varn}\\s*<\\s*1`).test(code),
    `${MIG} does not assert ${varn} — rule 30's second corollary is the reason both of H.J.Res. 140's rolls are here`);
}
ok(!/_RD_MIN_PRIMARY|_RD_MIN_JUDGED|_RD_SPLIT_|_PDX_RD_/.test(code),
  `${MIG} references an engine floor in executable SQL`);
// The verification block is tuple-scoped to this pass's own rows — the Utah committee
// lesson. A guard that counts the mapping lane and the seed lane together collides with
// the next wave and then gets relaxed until it means nothing. The only deliberately
// global assertions are the two chamber walls this wave exists to clear, and they are
// floors (`<`), not equalities, so a later wave adding a third broadband primary does
// not fail this migration.
for (const g of ["n_bb_senate", "n_lp_senate"]) {
  ok(new RegExp(`${g}\\s*<\\s*1`).test(code),
    `${MIG}'s global chamber wall ${g} is not a floor — an equality here fails the moment a later wave adds another primary`);
}
eq((code.match(/n_bb_senate\s*(<>|=)\s*\d/g) || []).length, 0, "the broadband chamber wall is pinned to an exact count instead of a floor");
eq((code.match(/n_lp_senate\s*(<>|=)\s*\d/g) || []).length, 0, "the lands_preserve chamber wall is pinned to an exact count instead of a floor");

// ── 7. the census, published before a candidate was picked ──────────────────
// The brief's first deliverable, and the one a wave under pressure skips: rebuild
// PRIMARY-by-chamber and the unread-reason census, publish the table, and re-rank
// rather than chasing F2's stale candidate list. Pinned here for arithmetic rather
// than for prose, because a census whose parts do not sum is a table, not a census.
const census = decide.census || {};
const before = census.beforeTable || [];
eq(before.length, 23, "the census table has the rows it was published with");
ok((census._how || "").length >= 200, "the census does not say how it was rebuilt");
ok(/vr_measure_issues/.test(census._how || "") && /formalPatternIndex/.test(census._how || ""),
  "the census does not name both of its sources — the mapping tables for PRIMARY counts and the engine for unread reasons");
for (const r of before) {
  const u = r.senateUnread || {};
  eq(u.vehicle_only + u.incidental + u.other, u.total, `census row ${r.key}: the unread buckets do not sum to the total`);
  ok((r.outcome || "").length >= 12, `census row ${r.key} has no outcome`);
  ok(typeof r.senatePrimaryBefore === "number" && typeof r.housePrimary === "number",
    `census row ${r.key} does not carry both chamber counts`);
}
const tb = census.totalsBefore || {};
eq(tb.keysWithSenatePrimary + tb.keysWithoutSenatePrimary, tb.keysReported,
  "the census totals do not partition the keys they report on");
eq(Object.values(tb.byReason || {}).reduce((a, b) => a + b, 0), tb.senateUnreadRows,
  "the census's unread reasons do not sum to its unread total");
eq(tb.keysWithSenatePrimary, 35, "the census finding this wave was built on: 35 of 98 keys had a Senate-reachable PRIMARY");
eq(tb.keysWithSenatePrimary, decide._counts.senateKeysWithPrimaryBefore, "the census and the counts block disagree about the before figure");
eq(decide._counts.senateKeysWithPrimaryAfter, 37, "the wave claims two keys gained a Senate PRIMARY");
eq(decide._counts.senateUnreadRowsBefore, tb.senateUnreadRows, "the census and the counts block disagree about the unread total");
ok(decide._counts.senateUnreadRowsAfter < decide._counts.senateUnreadRowsBefore,
  "the wave claims a chamber-gap improvement it does not show");

// The ranking rule the brief set, checked as an ordering rather than taken on trust:
// zero Senate PRIMARY first, then by vehicle_only*2 + incidental descending. If the
// table were re-sorted to put a convenient key at the top, the two keys this wave
// shipped would stop being the ones the census pointed at.
{
  const score = (r) => r.senateUnread.vehicle_only * 2 + r.senateUnread.incidental;
  let lastZero = true, lastScore = Infinity, order = true;
  for (const r of before) {
    const zero = r.senatePrimaryBefore === 0;
    if (lastZero && !zero) { lastScore = Infinity; }
    else if (!lastZero && zero) { order = false; break; }
    if (score(r) > lastScore) { order = false; break; }
    lastZero = zero; lastScore = score(r);
  }
  ok(order, "the census table is not in the order its own _tableNote claims — zero Senate PRIMARY first, then vehicle_only*2 + incidental descending");
}
// And the two shipped keys must satisfy the brief's preference clause on their own
// census line: a characterised-but-unread Senate row to gain, and zero Senate PRIMARY
// before. A key that already had one was not a target.
for (const k of ["broadband", "lands_preserve"]) {
  const row = before.find((r) => r.key === k);
  if (!ok(!!row, `${k} is not on the census table it was chosen from`)) continue;
  eq(row.senatePrimaryBefore, 0, `${k} is claimed as a target but the census says it already had a Senate PRIMARY`);
  ok(row.senateUnread.total > 0, `${k} is claimed as a target but the census shows no unread senator rows to gain`);
  ok(/^SHIPPED/.test(row.outcome || ""), `${k}'s census outcome does not say it shipped`);
}
eq(before.filter((r) => /^SHIPPED/.test(r.outcome || "")).length, 2, "the census claims a number of shipped keys other than two");
// Every refused and blocked key is on the table with its outcome, so the table is the
// wave's whole account rather than its highlights.
// A refused key is only on this table if the census RANKED it — the table is the
// candidate ranking, not an index of every key the wave touched. climate_action,
// rural_ag and states_federal_power were read and refused on H.J.Res. 140's text
// without ever being census candidates (all three already hold Senate primaries or
// zero unread senator rows), and their refusals live on the measure. So the check is:
// if a refused key IS on the table, its outcome line must say it was refused rather
// than claiming something more flattering.
for (const k of REFUSED_KEYS) {
  const row = before.find((r) => r.key === k);
  if (!row) continue;
  ok(/REFUSED|NOT EXAMINED/.test(row.outcome || ""),
    `${k} was refused but its census line claims "${row.outcome}" — the table and the refusal disagree`);
}
for (const b of decide.blockedOn || []) {
  const row = before.find((r) => r.key === b.key);
  ok(!!row, `${b.key} is recorded as blocked but is not on the census table`);
}
// The table is reprinted in the migration header, because the migration is the artefact
// that outlives the seed file in a deploy log.
ok(sql.includes("CENSUS BEFORE ANY CANDIDATE WAS LOOKED AT"), `${MIG}'s header does not carry the census table`);
for (const k of ["broadband", "lands_preserve", "health_rural", "tax_middle_class"]) {
  ok(new RegExp(`^--\\s+${k}\\s`, "m").test(sql), `${MIG}'s header census table is missing the ${k} row`);
}

// ── 8. keys left blocked, each with an instrument named ─────────────────────
// The brief's hardest clause: /p/lee and /p/curtis must move OR get a written
// blocked-on naming the instrument refused and why. They moved — section 9 pins that —
// and the seven keys that did not are required to name a specific instrument rather
// than shrug. "No instrument exists" is only a finding if you say what you looked for.
const blocked = decide.blockedOn || [];
eq(blocked.length, 7, "F3 leaves exactly seven keys blocked, in writing");
eq(decide._counts.keysBlockedOn, 7, "the decision seed's own blocked-key count");
const INSTRUMENT = /\b(S\.|H\.R\.|S\.J\.Res\.|H\.J\.Res\.|S\.Res\.|H\.Res\.|Amdt\.|S\.Amdt\.)\s?\d+|unanimous consent|reconciliation/i;
for (const b of blocked) {
  const at = `blockedOn ${b.key}`;
  ok((b.state || "").length >= 20, `${at} has no one-line state`);
  ok((b.evidence || "").length >= 150, `${at} evidence is too thin to have been a search`);
  // No length bar worth having on this field. econ_workers' whole answer is "A Senate
  // passage vote on H.R. 5408." — thirty-five characters that name the exact bill and
  // the exact act needed, which is a better entry than a paragraph. What matters is
  // that it names something.
  ok((b.whatWouldUnblockIt || "").length >= 25, `${at} does not say what would unblock it`);
  // The instrument may be named on either side of the entry: scotus_reform's evidence
  // is the negative finding (both 119th vote menus swept, nothing recorded) and the
  // instrument — S. 1101 — is named in what would unblock it. Requiring it in the
  // evidence field specifically would push a curator to pad the wrong field.
  ok(INSTRUMENT.test(`${b.evidence || ""} ${b.whatWouldUnblockIt || ""}`),
    `${at} names no instrument anywhere in the entry — the brief requires the instrument refused AND the reason, not just the reason`);
}
// The two Utah faces are the acceptance criterion, so gov_regulation's entry has to be
// honest about being a different KIND of blockage: the key has five primaries and one
// unread senator row, and the two senators holding it have simply never voted on any of
// them. Filing that as "no instrument exists" would be false.
{
  const gr = blocked.find((b) => b.key === "gov_regulation");
  ok(gr && /NOT blocked on an instrument/i.test(gr.state || ""),
    "gov_regulation is listed as blocked on an instrument when the census shows the key has five of them");
}
ok(sql.includes("KEYS LEFT BLOCKED, ON PURPOSE"), `${MIG}'s header does not carry the blocked-key list`);

// ── 9. the cost, disclosed and not netted ───────────────────────────────────
// The acceptance criterion is that no row the engine already characterised stops being
// characterised. One does. Refusing to publish it would make the wave's numbers
// unfalsifiable, so the disclosure must exist, add up, and name the member.
//
// TWO F2 ASSERTIONS ARE DELIBERATELY NOT TRANSCRIBED HERE. F2 required
// `named.length === totals.lost` and `wasTier === "thin"` on every cause. Neither holds
// on F3 and neither should: three of F3's causes name four members between them while
// exactly ONE is a loss, because the other two causes are a surfaced contradiction that
// keeps reading (rule 25) and a pair of rows that GAINED a split. Recording those under
// the same heading is the honest shape — they are the cost analysis, and two of the
// three entries came out in the wave's favour. Asserting equality would force a curator
// to delete the non-losses to make the arithmetic pass, which is the opposite of the
// discipline the disclosure exists for.
const disc = decide.readLossDisclosure;
ok(!!disc, `${DECIDE} has no readLossDisclosure — the wave stops characterising a row and must say so`);
if (disc) {
  eq(disc.totals.lost, 1, "recorded read-loss total");
  eq(disc.totals.gained, 184, "recorded read-gain total");
  eq(disc.totals.lost, decide._counts.readsLost, "the disclosure and the counts block disagree about losses");
  eq(disc.totals.gained, decide._counts.readsGained, "the disclosure and the counts block disagree about gains");
  ok(disc.totals.gained > disc.totals.lost, "readLossDisclosure claims a net gain it does not show");
  eq(Object.keys(disc.totals.lostTiers || {}).join(","), "thin",
    "every lost row must be from the weakest read tier — a clear or split read going unread is a different, worse finding");
  eq(disc.totals.lostTiers.thin, disc.totals.lost, "lostTiers does not account for every lost row");
  eq(Object.values(disc.totals.gainedTiers || {}).reduce((a, b) => a + b, 0), disc.totals.gained,
    "gainedTiers does not account for every gained row");
  eq(Object.values(disc.totals.gainedByKey || {}).reduce((a, b) => a + b, 0), disc.totals.gained,
    "gainedByKey does not account for every gained row");
  // Gains may only land on keys this wave actually mapped. A gain on a key it did not
  // touch would mean the measurement is picking up someone else's change.
  const mappedKeys = new Set(accepted.map(({ i }) => i.issueKey));
  for (const k of Object.keys(disc.totals.gainedByKey || {})) {
    ok(mappedKeys.has(k), `readLossDisclosure credits gains to ${k}, which this wave did not map`);
  }
  eq(disc.utahSeven.lost, 0, "the Utah seven lose a characterised row");
  eq(disc.utahSeven.gained, 4, "the Utah gain the brief's named acceptance rests on");
  ok(/\blee\b/.test(disc.utahSeven.detail || "") && /\bcurtis\b/.test(disc.utahSeven.detail || ""),
    "the Utah detail does not name Lee and Curtis — they are the brief's named acceptance");
  const named = (disc.causes || []).flatMap((c) => c.members || []);
  for (const pid of ["lee", "owens", "bmoore", "curtis", "kennedy", "maloy", "cstewart"]) {
    ok(!named.includes(pid),
      `${pid} appears in readLossDisclosure. The brief's named acceptance is that the Utah briefs do not lose characterised rows.`);
  }
  ok((disc.causes || []).length >= 1, "readLossDisclosure has no causes");
  for (const c of disc.causes || []) {
    ok((c.cause || "").length >= 20, "a readLossDisclosure cause has no heading");
    ok((c.members || []).length >= 1, "a readLossDisclosure cause names nobody");
    ok((c.mechanism || "").length >= 200, "a readLossDisclosure cause has no mechanism written out");
    // Present on every cause; ARGUED on the one that is actually a loss. Two of the
    // three causes here are not losses — a surfaced contradiction that keeps reading
    // and a pair of rows that gained a split — and their honest answer really is
    // "Not a cost." Demanding a hundred words there would buy padding, not rigour.
    // The cause that costs a real characterised row has to carry the arithmetic.
    ok((c.whyTheRowWasKeptAnyway || "").length > 0,
      `readLossDisclosure cause "${c.cause}" does not say why the row was kept anyway`);
    // The discriminator has to exclude its own near-miss: rule 25's entry is headed
    // "a contradiction surfaced, NOT a wall tripped", so a naive substring match picks
    // up the very cause that is not a loss and then fails for having no arithmetic.
    const isTheLoss = /a wall tripped/i.test(c.cause || "") && !/not a wall tripped/i.test(c.cause || "");
    if (isTheLoss) {
      ok((c.whyTheRowWasKeptAnyway || "").length >= 300,
        "the cause that costs a real characterised row does not carry the gains-vs-costs arithmetic");
      ok(/gains? (EIGHT|8)/i.test(c.whyTheRowWasKeptAnyway || "") && /costs? (this one|ONE|1)/i.test(c.whyTheRowWasKeptAnyway || ""),
        "the loss is not weighed against what the same row gained — the rule this wave applied is arithmetic, not taste");
    }
  }
  // The one real loss must be recorded as the rule-30 mechanism it is, and the one that
  // is NOT a loss must be recorded as rule 25's surfaced contradiction. Collapsing the
  // two would be the single most misleading thing this disclosure could do: one is a
  // wall tripped by a piled secondary, the other is the engine correctly reporting a
  // member whose votes disagree with each other.
  const kelly = (disc.causes || []).find((c) => (c.members || []).includes("trent_kelly"));
  ok(kelly && /a wall tripped/i.test(kelly.cause || ""), "the one real loss is not recorded as a tripped wall");
  ok(kelly && /_RD_MIN_JUDGED/.test(kelly.mechanism || "") && /primary < 1/.test(kelly.mechanism || ""),
    "the loss's mechanism does not walk the actual branch — four judged acts, no primary with a side, the primary wall fires");
  const golden = (disc.causes || []).find((c) => /rule 25/i.test(c.cause || ""));
  ok(golden && /still read/i.test(golden.mechanism || ""),
    "the surfaced contradiction is not recorded as a row that keeps reading — rule 25 is not a loss");
  ok(!(golden && (golden.members || []).some((m) => (kelly ? (kelly.members || []) : []).includes(m))
    && golden.members.length === 1),
    "the surfaced contradiction and the tripped wall name the same single member — they are different findings");
  // And the migration's header must quote the same numbers. Comment markers and hard
  // wrapping are stripped first: the header is prose at 78 columns, so "and 1 stops"
  // legitimately spans a line break and a raw includes() would be testing the wrap
  // rather than the claim.
  const HEADER = sql.slice(0, sql.indexOf("DO $")).replace(/^--\s?/gm, "").replace(/\s+/g, " ");
  ok(HEADER.includes(`${disc.totals.gained} rows start being characterised`),
    `${MIG}'s header does not quote the same gained-row count as ${DECIDE}`);
  ok(HEADER.includes(`and ${disc.totals.lost} stops`),
    `${MIG}'s header does not quote the same lost-row count as ${DECIDE}`);
  ok(HEADER.includes(`Utah: ${disc.utahSeven.gained} gained, ${disc.utahSeven.lost} lost`),
    `${MIG}'s header does not quote the Utah figures the acceptance rests on`);
  for (const [k, n] of Object.entries(disc.totals.gainedByKey || {})) {
    ok(HEADER.includes(`${k} ${n}`), `${MIG}'s header does not quote the ${k} gain of ${n}`);
  }
  ok(HEADER.includes("is not netted against the gains"),
    `${MIG}'s header does not say the loss is unnetted — netting is how a wave stops measuring itself`);
}

// The measuring instrument itself. The tier-gated list cannot see this wave AT ALL: a
// row moving unread → read-thin stays in shape()'s tail either way and never enters the
// `characterised` figure, so on the aggregate counters Lee and Curtis appear not to
// move. If the direct read-flag comparison is removed, the acceptance criterion becomes
// unmeasurable and the next wave's report will be wrong in exactly that way.
const fpi = R("scripts/vr-federal-fpi.mjs");
for (const marker of ["function readSets(", "if (r.read) keys.set(", "LOST_READS", "GAINED_READS",
  "rows that STOPPED being characterised"]) {
  ok(fpi.includes(marker),
    `scripts/vr-federal-fpi.mjs lost ${marker} — the direct read-flag no-loss check is the only thing that `
    + "measures this wave's acceptance criterion");
}
// The census half of the harness, which is what produced deliverable 1.
for (const marker of ["--chambers", "formalPatternIndex"]) {
  ok(fpi.includes(marker), `scripts/vr-federal-fpi.mjs lost ${marker} — the census is not reproducible without it`);
}

// ── 10. the mappings came with their mechanism lines ────────────────────────
// A judged act on a Contradicted or Mixed row is gated at 100% curated coverage by
// scripts/test-mechanism-completeness.mjs (runbook rule 33), so landing these rows
// without writing their _DOS_MECH entries breaks that suite the moment the migration
// runs. Pinned here as well because that gate reports a percentage over the whole
// corpus: it says what is owed, but this is where the wave's own debt is named. The
// entries must be per-issue prose, not the derived restatement — including the mirror
// pair, where the same act has to be explained twice from opposite sides.
const cons = R("consistency.js");
const mech = (cons.match(/var _DOS_MECH = \{[\s\S]*?\n  \};/) || [""])[0];
ok(mech.length > 1000, "could not read _DOS_MECH out of consistency.js");
for (const [k, needle] of [
  ["S.J.Res. 7|119|broadband", /67303|E-Rate|hotspot/],
  ["H.J.Res. 140|119|lands_preserve", /7917|225,504/],
  ["H.J.Res. 140|119|lands_energy", /7917|225,504/],
]) {
  const key = `'${k}': {`;
  const at = mech.indexOf(key);
  if (!ok(at !== -1, `${k} has no curated mechanism entry — the row would render in the derived voice`)) continue;
  const entry = mech.slice(at, at + 4000);
  const body = entry.slice(0, entry.indexOf("\n    },"));
  ok(/\n      did: '[^']{80,}'/.test(body), `${k}'s mechanism entry has no "what it did" line of any substance`);
  ok(/\n      why: '[^']{80,}'/.test(body), `${k}'s mechanism entry has no "why it counts here" line of any substance`);
  ok(!/Counted on .+ because that is /.test(body), `${k}'s curated slot holds the derived restatement`);
  ok(needle.test(body), `${k}'s mechanism prose does not name the document the resolution acts on`);
}
// The mirror pair must read differently from each other. Two entries with the same
// prose would mean the reader of the lands_energy chip is being shown an argument about
// preservation, which is the failure the mirror exists to avoid.
{
  const grab = (k) => {
    const at = mech.indexOf(`'${k}': {`);
    if (at < 0) return "";
    const e = mech.slice(at, at + 4000);
    return e.slice(0, e.indexOf("\n    },"));
  };
  const a = grab("H.J.Res. 140|119|lands_preserve"), b = grab("H.J.Res. 140|119|lands_energy");
  ok(a && b && a !== b, "the mirror pair's mechanism entries are the same prose");
  ok(/mirror/i.test(b), "the lands_energy entry does not tell the reader a mirror pair is working as intended");
}

// ── 11. Direction Match and the per-issue rows are byte-identical ───────────
// The strongest available form of this check, and it is available BECAUSE of what F3
// changed: the only booted file it touches is consistency.js, and the only change there
// is prose inside _DOS_MECH. So there is no licence list here — no CURATED, no LIFTED,
// no waivers of any kind. HEAD and the working tree are booted side by side into two vm
// contexts and every published figure is required to come out identical. Anything that
// moves is a bug, not work.
//
// The mappings this wave adds live in the DATABASE, not in these files, which is why
// this comparison is meaningful rather than tautological: a curator who "helpfully"
// hard-coded the new measures into voting-record.js or stance-helpers.js to make the
// numbers move sooner would be caught right here.
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "consistency.js", "voting-record.js", "word-action.js",
];
const nowSrc = (f) => readFileSync(join(ROOT, f), "utf8");
const headSrc = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { return null; }
};
function boot(get, label) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  for (const f of FILES) {
    const src = get(f);
    if (src === null) return null;
    try { vm.runInContext(src, ctx, { filename: `${label}:${f}` }); } catch (e) { /* same handling in both trees */ }
  }
  return win;
}
{
  const head = boot(headSrc, "HEAD");
  const work = boot(nowSrc, "working");
  if (!ok(!!(head && head.PDXWordAction && head.PDXWordAction.read), "the pre-wave engine booted from HEAD")
    || !ok(!!(work && work.PDXWordAction && work.PDXWordAction.read), "the current engine booted")) {
    // fall through: the sections below would report every pid as broken
  } else {
    const PIDS = Object.keys(head.CMP_DATA || {});
    ok(PIDS.length > 100, `the roster booted (${PIDS.length} profiles)`);
    // Reported as a DIFF, not as two roster dumps. The eq() helper prints both values,
    // and both values here are eight hundred pids — a failure message long enough to
    // scroll the rest of the report off the screen is a failure message nobody reads.
    {
      const nowPids = Object.keys(work.CMP_DATA || {});
      const nowSet = new Set(nowPids), headSet = new Set(PIDS);
      const gone = PIDS.filter((p) => !nowSet.has(p));
      const added = nowPids.filter((p) => !headSet.has(p));
      eq(gone.length, 0, `F3 removed ${gone.length} profile(s) from the roster: ${gone.slice(0, 8).join(", ")}`);
      // ADDITIONS BELONG TO A LATER ROSTER WAVE, and the roster is where a wave admits a
      // person: federal_roster_r1_sep2026 adds 308 records because the House corpus held
      // 7,298 recorded positions the fail-closed ingest had to skip for want of a roster
      // slug. What this check was protecting is a mapping LEAKING out of the database into
      // a shipped file, and that is still refused — the additions must be inert (no score,
      // no stance, no judged surface), so nothing this wave's own mapping work could produce
      // can arrive this way. A removal or a reorder still fails, and every profile HEAD had
      // is still held bit-for-bit by the Direction Match sweep.
      const hot = added.filter((p) => {
        const r = (work.CMP_DATA || {})[p] || {};
        return r.score !== null || r.kept !== 0 || r.broken !== 0 || r.pending !== 0
          || !Array.isArray(r.issues) || r.issues.length !== 0;
      });
      eq(hot.length, 0, `${hot.length} added profile(s) carry a judged surface: ${hot.slice(0, 8).join(", ")} — an admission is identity, never a mapping that leaked out of the database`);
      // HEAD's order, ignoring where the new records landed.
      const kept = nowPids.filter((p) => headSet.has(p));
      eq(kept.join("|"), PIDS.join("|"), "F3 reordered the roster records HEAD already had");
    }

    // Direction Match, whole shape. `publishable` is where a raised floor would show;
    // the coverage counters are where a quietly re-pooled row would.
    const READ_KEYS = ["pct", "publishable", "word", "testedWeight"];
    const COV_KEYS = ["word", "scorable", "tested", "untested", "issueLinked",
      "notIssueLinked", "recordDerived", "warming"];
    let dm = 0, dmBad = 0;
    for (const pid of PIDS) {
      let a = null, b = null;
      try { a = head.PDXWordAction.read(pid); } catch (e) { continue; }
      try { b = work.PDXWordAction.read(pid); } catch (e) { b = null; }
      if (!a) continue;
      if (!b) { dmBad++; failures.push(`${pid}: Direction Match stopped returning`); continue; }
      dm++;
      for (const k of READ_KEYS) {
        if (b[k] !== a[k]) { dmBad++; failures.push(`${pid}: DM ${k} moved — ${JSON.stringify(a[k])} → ${JSON.stringify(b[k])}`); }
      }
      const ca = a.coverage || {}, cb = b.coverage || {};
      for (const k of COV_KEYS) {
        if (cb[k] !== ca[k]) { dmBad++; failures.push(`${pid}: DM coverage.${k} moved — ${JSON.stringify(ca[k])} → ${JSON.stringify(cb[k])}`); }
      }
    }
    ok(dm > 100, `the Direction Match sweep was wide enough to mean something (${dm} profiles)`);
    eq(dmBad, 0, "Direction Match drifted");

    // The current-term slice, which is a second published figure with its own floors.
    let scoped = 0, scopedBad = 0;
    for (const pid of PIDS) {
      let a = null, b = null;
      try { a = head.PDXWordAction.scopedRead(pid, head.CMP_DATA[pid]); } catch (e) { continue; }
      try { b = work.PDXWordAction.scopedRead(pid, work.CMP_DATA[pid]); } catch (e) { b = null; }
      if (!a) continue;
      if (!b) { scopedBad++; failures.push(`${pid}: the scoped read stopped returning`); continue; }
      scoped++;
      if (b.applicable !== a.applicable) { scopedBad++; failures.push(`${pid}: scope applicability moved`); }
      if (JSON.stringify(b.scope) !== JSON.stringify(a.scope)) { scopedBad++; failures.push(`${pid}: the scope itself moved`); }
      if (JSON.stringify(b.delta) !== JSON.stringify(a.delta)) { scopedBad++; failures.push(`${pid}: the all-time/term delta moved`); }
      for (const slice of ["main", "current"]) {
        const sa = a[slice], sb = b[slice];
        if (!!sa !== !!sb) { scopedBad++; failures.push(`${pid}: the ${slice} slice appeared or vanished`); continue; }
        if (!sa || !sb) continue;
        if (sb.pct !== sa.pct) { scopedBad++; failures.push(`${pid}: ${slice}.pct moved — ${sa.pct} → ${sb.pct}`); }
        if (sb.publishable !== sa.publishable) { scopedBad++; failures.push(`${pid}: ${slice}.publishable moved`); }
        if (sb.coverage.tested !== sa.coverage.tested) { scopedBad++; failures.push(`${pid}: ${slice} tested count moved`); }
        if (sb.coverage.scorable !== sa.coverage.scorable) { scopedBad++; failures.push(`${pid}: ${slice} scorable pool moved`); }
      }
    }
    ok(scoped > 100, `the scoped-read sweep was wide enough to mean something (${scoped} profiles)`);
    eq(scopedBad, 0, "the current-term slice drifted");

    // Every issue row, one at a time. This is where a mapping that leaked into a shipped
    // file would surface: a chip's state, metric, percentage or verdict changing without
    // the database having been touched at all.
    let rows = 0, testedRows = 0, rowBad = 0;
    for (const pid of PIDS) {
      let ra = [], rb = [];
      try { ra = head.PDXConsistency.issueRows(pid) || []; } catch (e) { continue; }
      try { rb = work.PDXConsistency.issueRows(pid) || []; } catch (e) { rb = []; }
      const keysA = ra.map((r) => r.key), keysB = rb.map((r) => r.key);
      if (keysB.join("|") !== keysA.join("|")) {
        rowBad++; failures.push(`${pid}: the issue-row list changed — ${keysA.length} rows → ${keysB.length}`);
      }
      const byKey = {};
      for (const r of rb) byKey[r.key] = r;
      for (const r of ra) {
        const q = byKey[r.key];
        if (!q) continue;
        rows++;
        let sa = null, sb = null;
        try { sa = head.PDXConsistency.rowResult(r); } catch (e) { sa = { __err: 1 }; }
        try { sb = work.PDXConsistency.rowResult(q); } catch (e) { sb = { __err: 1 }; }
        if (!!sa !== !!sb) { rowBad++; failures.push(`${pid}/${r.key}: one engine resolves the row and the other does not`); continue; }
        if (!sa || !sb) continue;
        for (const k of ["state", "metric", "pct"]) {
          if (sb[k] !== sa[k]) { rowBad++; failures.push(`${pid}/${r.key}: row ${k} moved — ${JSON.stringify(sa[k])} → ${JSON.stringify(sb[k])}`); }
        }
        if ((q.verdict || {}).token !== (r.verdict || {}).token) {
          rowBad++; failures.push(`${pid}/${r.key}: the verdict moved — ${(r.verdict || {}).token} → ${(q.verdict || {}).token}`);
        }
        if ((q.verdict || {}).basis !== (r.verdict || {}).basis) {
          rowBad++; failures.push(`${pid}/${r.key}: the verdict changed lane — ${(r.verdict || {}).basis} → ${(q.verdict || {}).basis}`);
        }
        if (sa.state === "tested") testedRows++;
      }
    }
    ok(rows > 500, `the issue-row sweep was wide enough to mean something (${rows} rows)`);
    ok(testedRows > 0, "…and included tested rows");
    eq(rowBad, 0, "a per-issue row drifted");
    console.log(`      (twin boot: ${dm} DM reads, ${scoped} scoped reads, ${rows} issue rows, ${testedRows} tested)`);
  }
}

// ── 12. no party string in reader-facing copy ───────────────────────────────
// The doctrine's flat prohibition, and it needs a scope or it is unenforceable. What is
// forbidden is party as a REASON: copy that explains a member's vote, or a key's
// direction, by naming their side. So the scan runs over the text that actually reaches
// a reader — the three rationales that ship in db/vr-issue-seed.json and become the
// rationale column of vr_measure_issues, and the three _DOS_MECH entries that render as
// the mechanism line under a dossier row.
//
// TWO THINGS ARE OUTSIDE THAT SCOPE, ON PURPOSE, AND SAYING SO IS THE POINT OF THIS
// COMMENT. First, the roll call's own party tallies — partyTotals in the vote seed, the
// is_party column, and the "D 0-36, R 50-0, I 0-2" line in the migration header. Those
// are facts the document records, they are what the stowaway disclosure is computed
// from, and deleting them would not make the record less party-aware, only less
// checkable. Second, the curator-facing two-flank analysis (rule 5 / rule 23), which
// asks how many distinct ARGUMENTS the losing side holds. F3's two entries were
// rewritten during this pass to answer that from the floor statements rather than from
// the tally's caucus columns — because a party column genuinely cannot answer it — and
// the scan below now covers the decision seed and the migration header too, so the
// rewrite is enforced rather than remembered.
const PARTY = /\b(democrat|democrats|democratic|republican|republicans|gop|the left|the right|liberal|conservative|caucus|partisan|bipartisan)\b/i;
{
  const issueSeed = J("db/vr-issue-seed.json");
  const copy = [];
  for (const num of ["S.J.Res. 7", "H.J.Res. 140"]) {
    const m = (issueSeed.measures || []).find((x) => x.number === num);
    for (const i of (m || {}).issues || []) copy.push([`${num} · ${i.issueKey} rationale`, i.rationale]);
  }
  for (const k of ["S.J.Res. 7|119|broadband", "H.J.Res. 140|119|lands_preserve", "H.J.Res. 140|119|lands_energy"]) {
    const at = mech.indexOf(`'${k}': {`);
    if (at < 0) continue;
    const e = mech.slice(at, at + 4000);
    copy.push([`_DOS_MECH ${k}`, e.slice(0, e.indexOf("\n    },"))]);
  }
  eq(copy.length, 6, "the reader-facing copy scan did not find all three rationales and all three mechanism entries");
  for (const [label, text] of copy) {
    const hit = (String(text || "").match(PARTY) || [])[0];
    ok(!hit, `${label} explains itself with a party word ("${hit}") — the doctrine files a formal record, not a party score`);
  }
  // And the curator-facing files, which is where the two-flank strings live.
  for (const [label, text] of [[DECIDE, R(DECIDE)], [MIG, sql]]) {
    const hit = (String(text).match(PARTY) || [])[0];
    ok(!hit, `${label} carries a party word ("${hit}"). The document's own tallies are recorded as D/R/I letters and counts, `
      + "which is a fact; a party NOUN in an argument is a reason, and the two-flank check must be read off the floor statements instead.");
  }
}
// No score, no percentage, no package share. The doctrine's other flat prohibitions,
// checked against the copy that ships: a mapping's rationale explains what the act did
// and which way a yea cuts, and never how well the member did.
// Matched as CLAIMS, not as words. The header quotes the doctrine's own prohibitions
// verbatim ("...is the 'package %' the doctrine forbids"), so a bare word scan flags the
// sentence that promises not to do the thing. What a score-shaped claim looks like is a
// number attached to a member or a package: "62% aligned", "scores 4 of 7",
// "71% of the package".
for (const bad of [/\d+\s*%\s*(aligned|agreement|match\b)/i, /\bscores?\s+\d+\s+(of|out of)\s+\d+/i,
  /\d+\s*%\s*of the package/i, /party score of\b/i]) {
  ok(!bad.test(sql), `${MIG} publishes a score-shaped claim matching ${bad}`);
}

// ── 13. the migration on disk is the one the generator writes ───────────────
// The migration is generated, not hand-written, and the generator prints to stdout — so
// the file can fall behind the script that produces it without anything complaining.
// Byte-identical is the contract (runbook rule 37), because anything looser is a licence
// for the deployed SQL and its stated reasoning to drift apart. It earned its keep on
// this very pass: the two-flank strings were rewritten in the decision seed and this is
// what would have caught a stale migration still quoting the old ones.
if (ok(existsSync(join(ROOT, GEN)), `${GEN} is on disk`)) {
  let out = "", genFailed = null;
  try {
    out = execFileSync(process.execPath, [join(ROOT, GEN)], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
  } catch (e) { genFailed = e.message; }
  if (ok(!genFailed, `${GEN} does not run: ${genFailed}`)) {
    ok(out === MIG_SQL,
      `${MIG} is not what ${GEN} writes — regenerate it (${out.length} bytes generated vs ${MIG_SQL.length} on disk)`);
  }
}

// ── report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ federal wave F3: ${failures.length} of ${passed + failures.length} assertions failed\n`);
  for (const f of failures.slice(0, 60)) console.error(`  · ${f}`);
  if (failures.length > 60) console.error(`  · … and ${failures.length - 60} more`);
  console.error("");
  process.exit(1);
}
console.log(`✓ federal wave F3: all ${passed} assertions passed`);
console.log(`  3 rolls (2 senate, 1 house) · ${votes.memberVoteCount} attributed votes, ${votes.skippedVoteCount} skipped and counted · `
  + `2 PRIMARY rows + 1 mirror secondary · ${decide._counts.rowsRefused} refusals across ${REFUSED_KEYS.length} keys · `
  + `${decide._counts.rollCallsDeclined} rolls declined · ${decide._counts.keysBlockedOn} keys blocked with an instrument named`);
console.log(`  0 keys added · 0 floors moved · Senate keys with a PRIMARY ${decide._counts.senateKeysWithPrimaryBefore} → `
  + `${decide._counts.senateKeysWithPrimaryAfter} · ${decide.readLossDisclosure.totals.gained} reads gained, `
  + `${decide.readLossDisclosure.totals.lost} lost and named · DM and every issue row byte-identical to HEAD`);
