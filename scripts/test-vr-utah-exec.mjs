#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-utah-exec.mjs — the Utah executive formal lane, pinned to its fences
// ─────────────────────────────────────────────────────────────────────────────
// Wave E1 gave a governor a formal record. Every wave before it filled the lane
// with things a legislator does — a floor vote, a committee vote, a signature on
// someone else's bill — and a governor does none of them, which is why /p/cox
// read "No formal pattern on file yet" while 140 recorded gubernatorial acts sat
// in the source. The lane is now filled from what the office actually does: bills
// signed and bills vetoed, each with a date, a bill number and a le.utah.gov
// citation.
//
// That is a new KIND of act in an engine whose whole vocabulary was built around
// ballots, and the failure modes are specific. This harness watches them:
//
//   1. THE SEED IS THE MIGRATION. The SQL is the seed rendered, not a paraphrase
//      of it: every admitted act has one guarded block, with the same bill, the
//      same act, the same direction, the same date and the same URL. A generator
//      that drops five rows on the way to SQL is the defect this wave already had
//      once, in the other direction — see section 4.
//   2. NOBODY IS GUESSED. le.utah.gov never prints the governor's name on a bill
//      action; it prints "Governor Signed" and a code. So the identification is
//      (session, office) → roster id, made by a human in db/vr-utah-exec-map.json,
//      and it fails closed: an act whose session has no key is counted and
//      DISCARDED, never attributed to whoever holds the office today. The Utah
//      Lieutenant Governor, who files enrolled bills and signs none of them, is
//      on the roster with no key by design.
//   3. IT IS NOT A VOTE, AND NOTHING MAY LET IT BECOME ONE. gov_signed and
//      gov_vetoed are acts in vr_positions: no roll call, no member vote, no
//      ballot verb, no seat in Direction Match, and a depth weight BELOW a floor
//      roll call. "Voted Yea" may not appear on a governor's row at any weight.
//   4. THE REFUSALS ARE THE DELIVERABLE TOO, and a refusal that misstates the
//      record is worse than no refusal — it reads as reviewed. A line-item veto
//      is not a veto of the bill, a bill that became law without a signature is
//      the ABSENCE of a gubernatorial act, and 977 signed bills carry no reviewed
//      issue mapping and therefore characterise nothing. Each bucket is counted,
//      each is written down, and none of them leaks into the acts.
//   5. THE CENSUS ADDS UP. Both sessions were enumerated in full — 1,893 records,
//      resolutions included, because a Utah joint resolution goes to the governor
//      too. bills.json and the seed must agree on every number, and the admitted
//      and refused buckets must reconcile against the acts actually found.
//   6. THE PRESIDENT DID NOT MOVE. The pre-existing federal signed / vetoed /
//      issued types stay OUT of the act table so a president still routes to the
//      separate ✒️ executive-enactment lane; the two new types are distinct keys,
//      not a reuse, and /p/trump reads exactly as it did.
//   7. THE LEGISLATORS DID NOT MOVE EITHER. lee, chew_h68 and defay_h15 are
//      re-derived against HEAD, through `git show`, and must come out identical on
//      the Word-vs-Action read, the record verdict and every per-issue floor tier.
//   8. THE EMPTY-LANE GATE STILL FIRES. An executive with zero signed or vetoed
//      rows still gets the empty-office sentence, and an executive whose lane is
//      full but tests no stated position publishes no ratio — the acts are on
//      file, and that is not the same as the acts testing something.
//   9. AND THE PAGE THE WAVE WAS WRITTEN FOR ACTUALLY WORKS. With all 140 acts
//      filed, each carrying the issue mapping the repo already ships for its
//      bill, /p/cox stops printing either silence: the brief is a shape read over
//      the formal record, the chips disclose signatures rather than ballots, and
//      the ratio publishes at the same floors as everyone else — off the record,
//      never off a pledge-ledger entry. A wave that only proves the guards still
//      fire has not shown that it delivered anything.
//
//   node scripts/test-vr-utah-exec.mjs
//
// Sections 1-5 and 9-10 read the shipped JSON, SQL and JS. Sections 6-8 and 11
// boot the shipped client modules in a node:vm sandbox and inject the acts the
// way a completed /api/voting-record fetch leaves the cache. Nothing here needs a
// database, and nothing here reaches into the .git directory.
//
// TWO FRAMES, BOTH REAL, PINNED SEPARATELY. Section 9 asks the gates on a boot
// that holds the formal index but only a handful of records — what a device
// paints between "the lane exists" and "the record came back" — and there the
// untested-lane sentence is correct. Section 11 asks them on the whole file, and
// there both gates must be silent and the ratio must publish. Neither section's
// answer is the other's, and confusing them is how a guard gets read as a
// verdict on the shipped page.

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
// A fixture that stopped offering a case is a silent pass, so the probes that
// establish one are fatal rather than counted.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ vr-utah-exec: ${msg}`);
  process.exit(1);
};

// The numbers this wave shipped, written once. They are quoted in the migration
// header, the runbook census table and the two JSON files, and the whole point of
// naming them here is that a regenerated seed which changes one of them has to
// change this file too — deliberately, with a human reading the new number.
const SIGNED = 138, VETOED = 2, TOTAL = 140;
const SESSIONS = ["2024GS", "2025GS"];
const GOV = "cox";
const MIG = "netlify/database/migrations/20261102000000_vr_utah_exec_e1_signed_vetoed.sql";
const SQL = R(MIG);
const SEED = J("db/vr-utah-exec-seed.json");
const BILLS = J("db/vr-utah-exec-bills.json");
const MAP = J("db/vr-utah-exec-map.json");
const ISSUE_KEYS = new Set(J("db/issue-keys.json").keys);

console.log("── Utah executive formal lane (wave E1) ──");

// ═══════════════════════════════════════════════════════════════════════════
section("1 · the seed is the migration, act for act");
// ═══════════════════════════════════════════════════════════════════════════
must(Array.isArray(SEED.acts) && SEED.acts.length, "the seed holds no acts");
eq(SEED.acts.length, TOTAL, "the seed holds every admitted act and no more");
eq(SEED.counts.admitted.gov_signed, SIGNED, "signed acts admitted");
eq(SEED.counts.admitted.gov_vetoed, VETOED, "vetoed acts admitted");
eq(SEED.counts.admittedTotal, TOTAL, "the seed's own total");
eq(SEED.counts.admitted.gov_signed + SEED.counts.admitted.gov_vetoed,
  SEED.acts.length, "the counts are a count of the rows, not a claim beside them");

// Every DO block in the migration, parsed back out of the SQL. The block is the
// unit: one act, one measure lookup, one guarded insert.
const blocks = SQL.match(/DO \$\$[\s\S]*?END \$\$;/g) || [];
eq(blocks.length, TOTAL, "one guarded block per admitted act");
const parsed = blocks.map((b) => {
  const pos = /INSERT INTO vr_positions[\s\S]*?VALUES\s*\n\s*\(m_id, '([^']+)', '([^']+)', (true|false), '([^']+)'::timestamptz, '([^']+)', '([^']*)'\)/.exec(b);
  const sel = /number = '([^']+)' AND chamber = '([^']+)'[\s\S]*?utahSession' = '(\d{4}GS)'/.exec(b);
  return { block: b, pid: pos && pos[1], act: pos && pos[2], supports: pos && pos[3] === "true",
    actedAt: pos && pos[4], url: pos && pos[5], note: pos && pos[6],
    number: sel && sel[1], chamber: sel && sel[2], session: sel && sel[3] };
});
ok(parsed.every((p) => p.pid && p.act && p.number && p.session),
  "every block parses back to a bill, an act and a politician");

const seedKey = (a) => `${a.session}|${a.bill}|${a.actionType}`;
const sqlKey = (p) => `${p.session}|${p.number}|${p.act}`;
// The seed carries the padded bill id (HB0011) and the SQL carries the printed
// number (H.B. 11); the pair is what has to line up, so compare on the printed
// number the way the migration's WHERE clause does.
const seedByPrinted = new Map(SEED.acts.map((a) => [`${a.session}|${a.number}|${a.actionType}`, a]));
eq(seedByPrinted.size, TOTAL, "no two seed acts collapse onto one (session, number, act)");
let matched = 0, mismatched = [];
for (const p of parsed) {
  const a = seedByPrinted.get(sqlKey(p));
  if (!a) { mismatched.push(`${sqlKey(p)} is in the SQL and not in the seed`); continue; }
  matched++;
  if (a.politicianId !== p.pid) mismatched.push(`${sqlKey(p)} politician ${p.pid} ≠ ${a.politicianId}`);
  if (a.supports !== p.supports) mismatched.push(`${sqlKey(p)} direction differs`);
  if (a.sourceUrl !== p.url) mismatched.push(`${sqlKey(p)} source url differs`);
  if (a.chamber !== p.chamber) mismatched.push(`${sqlKey(p)} chamber differs`);
  if (String(p.actedAt).slice(0, 10) !== String(a.actedAt).slice(0, 10))
    mismatched.push(`${sqlKey(p)} acted_at ${p.actedAt} ≠ ${a.actedAt}`);
  if (a.printedText && p.note.indexOf(a.printedText) !== 0)
    mismatched.push(`${sqlKey(p)} note does not open with the printed action text`);
}
eq(matched, TOTAL, "every block in the migration is an act in the seed");
eq(mismatched.length, 0, `the SQL says what the seed says — ${mismatched.slice(0, 4).join("; ")}`);

eq(parsed.filter((p) => p.act === "gov_signed").length, SIGNED, "signed blocks in the SQL");
eq(parsed.filter((p) => p.act === "gov_vetoed").length, VETOED, "vetoed blocks in the SQL");
// Direction is a property of the act, not of a review: a signature supports the
// bill it enacts and a veto opposes it, always, in every row.
ok(parsed.every((p) => (p.act === "gov_signed") === (p.supports === true)),
  "a signature supports the bill and a veto opposes it, with no exceptions");
ok(SEED.acts.every((a) => (a.actionType === "gov_signed") === (a.supports === true)),
  "…and the seed agrees");
ok(SEED.acts.every((a) => SESSIONS.indexOf(a.session) >= 0), "both sessions and no third one");
ok(SEED.acts.every((a) => /^https:\/\/le\.utah\.gov\//.test(a.sourceUrl)),
  "every act cites le.utah.gov");
ok(parsed.every((p) => /^https:\/\/le\.utah\.gov\//.test(p.url)),
  "…including in the SQL, where a reader will click it");
ok(SEED.acts.every((a) => a.printedText === "Governor Signed" || a.printedText === "Governor Vetoed"),
  "every act quotes the action text le.utah.gov printed");
ok(SEED.acts.every((a) => /utah (house|senate)/.test(a.chamber)),
  "every bill is a Utah bill");

// ═══════════════════════════════════════════════════════════════════════════
section("2 · nobody is guessed: the name map fails closed");
// ═══════════════════════════════════════════════════════════════════════════
const mapped = new Set(SESSIONS.map((s) => MAP.sessions[s] && MAP.sessions[s].governor).filter(Boolean));
eq(mapped.size, 1, "one office, one holder, across both sessions");
ok(mapped.has(GOV), "the holder is the roster id the map names");
for (const s of SESSIONS) {
  ok(MAP.sessions[s] && MAP.sessions[s].governor === GOV, `${s} names its governor`);
  has(MAP.sessions[s]._confirmed, "Cox", `${s}'s identification is written down, not inferred`);
}
ok(SEED.acts.every((a) => a.politicianId === GOV),
  "every admitted act belongs to the id the map returned");
ok(parsed.every((p) => p.pid === GOV), "…and the SQL attributes nothing to anyone else");
eq(Object.keys(SEED.counts.byPolitician).length, 1, "exactly one person gains rows");
eq(SEED.counts.byPolitician[GOV], TOTAL, "and gains all of them");
// Fail closed means the count of what was thrown away is on file, not that the
// number is nonzero: both sessions had a mapped holder, so nothing was dropped.
eq(SEED.refused.droppedNoOfficeholder.length, 0,
  "no act was dropped for want of an officeholder — both sessions have a key");
eq(BILLS._census.refused.droppedNoOfficeholder, 0, "…and the census says so");
// The offices that do NOT sign or veto are named, so their empty lane is a
// decision rather than an omission.
for (const pid of ["dhenderson", "derek_brown_ut", "sreyes"]) {
  ok(typeof MAP._officesWithNoKey[pid] === "string" && MAP._officesWithNoKey[pid].length > 40,
    `${pid} is on the roster with no key, and the reason is written down`);
  ok(SEED.acts.every((a) => a.politicianId !== pid), `${pid} gains no act`);
  lacks(SQL, `'${pid}'`, `${pid} appears nowhere in the migration`);
}
has(MAP._doNotUseTheOwnerField, "Lieutenant Governor",
  "the action history's `owner` field is refused in writing — it names the filing office, not the actor");
has(MAP._scopeThisWave, "Utah governors only", "the wave states its own scope");

// ═══════════════════════════════════════════════════════════════════════════
section("3 · refused by design stays refused");
// ═══════════════════════════════════════════════════════════════════════════
const actBills = new Set(SEED.acts.map((a) => `${a.session} ${a.bill}`));
// A line-item veto struck appropriation lines; the bill became law. Recording it
// as "Vetoed" would say the governor stopped something that took effect.
eq(BILLS._census.refused.lineItemVeto, 2, "both line-item vetoes are refused");
has(BILLS._refusedLineItemVeto._why, "became law", "…and the refusal says why");
ok(MAP._refusedActionCodes.GVETOLI, "GVETOLI is refused at the action-code level");
for (const a of BILLS._refusedLineItemVeto.acts) {
  const k = a.split(" ").slice(0, 2).join(" ");
  ok(!actBills.has(k), `${k}'s line-item veto did not leak into the acts`);
}
// "Became Law w/o Governor Signature" is the absence of an act. There is nothing
// to attribute.
eq(BILLS._census.refused.becameLawWithoutSignature, 5, "all five no-signature bills are refused");
has(BILLS._refusedNoSignature._why, "ABSENCE", "…and the refusal names it as an absence");
ok(MAP._refusedActionCodes.GNOSIGN, "GNOSIGN is refused at the action-code level");
eq(SEED.refused.noSignature.length, 5, "the seed lists them individually");
eq(SEED.refused.lineItemVeto.length, 2, "…and lists the line-item vetoes individually");
for (const bucket of ["noSignature", "lineItemVeto"]) {
  for (const r of SEED.refused[bucket]) {
    ok(!actBills.has(`${r.session} ${r.bill}`), `${r.session} ${r.bill} is refused, not admitted`);
  }
}
// The vetoes reviewed in this pass. One mapped to a shipped key; eleven did not,
// and each of the eleven says what it was about and which key it failed to reach.
eq(BILLS._refusedVetoes.length, 11, "eleven vetoes were reviewed and refused");
eq(BILLS._census.refused.vetoRefusedOnReview, 11, "…and the census agrees");
eq(BILLS._census.refused.vetoAdmittedOnReview, 1, "one veto was mapped in this pass");
for (const v of BILLS._refusedVetoes) {
  ok(typeof v.why === "string" && v.why.length > 80,
    `${v.session} ${v.bill}'s refusal is a written review, not a shrug`);
  ok(!actBills.has(`${v.session} ${v.bill}`), `${v.session} ${v.bill} characterises nothing`);
  lacks(SQL, `'${v.bill}'`, `${v.bill} appears in no migration block`);
}
// The unmapped majority. 977 signed bills have no reviewed issue mapping, so they
// are on file at le.utah.gov and absent here: an act with no key cannot describe
// a pattern, and inventing one is what this fence exists to prevent.
eq(BILLS._census.refused.unmappedBill, 977, "the unmapped signed bills are counted");
eq(SEED.refused.unmappedBill.length, 977, "…and enumerated one by one in the seed");
ok(SEED.refused.unmappedBill.every((r) => !actBills.has(`${r.session} ${r.bill}`)),
  "no unmapped bill leaked into the acts");
has(BILLS._refusedUnmapped._why || JSON.stringify(BILLS._refusedUnmapped), "mapping",
  "the unmapped bucket is refused in writing");
// The bucket that was a defect. Five reviewed-and-mapped bills were once refused
// here for want of a measure row they had all along; the correction stays on file
// so the next generator does not repeat it.
eq(BILLS._census.refused.mappedButNoMeasureRow, 0, "nothing reviewed is refused for want of a measure row");
eq(SEED.refused.noMeasureRow.length, 0, "…and the seed's bucket is empty");
has(BILLS._refusedNoMeasureRow._corrected, "DEFECT", "the defect is recorded, not deleted");
for (const b of ["HB0348", "HB0067", "SB0026", "SB0316", "SB0336"]) {
  has(BILLS._refusedNoMeasureRow._corrected.replace(/\s+/g, " "),
    b.replace(/^([HS]B)0*(\d+)$/, (m, p, n) => `${p[0]}.${p[1]}. ${n}`),
    `${b} is named as falsely refused`);
  ok(actBills.has(`2024GS ${b}`) || actBills.has(`2025GS ${b}`), `${b} is now admitted`);
}

// ═══════════════════════════════════════════════════════════════════════════
section("4 · the census reconciles");
// ═══════════════════════════════════════════════════════════════════════════
const C = BILLS._census;
eq(C.recordsEnumerated, C["2024GS"].recordsEnumerated + C["2025GS"].recordsEnumerated,
  "the enumeration total is the sum of the sessions");
has(C._note, "billlist.json", "the census names the endpoint it enumerated");
has(C._note, "resolutions", "…and records that resolutions go to the governor too");
for (const s of SESSIONS) {
  const b = SEED.counts.bySession[s], c = C[s];
  must(b && c, `${s} is missing from one of the two files`);
  eq(b.billsEnumerated, c.recordsEnumerated, `${s}: both files enumerated the same list`);
  eq(b.gov_signed, c.governorSigned, `${s}: signed acts found`);
  eq(b.gov_vetoed, c.governorVetoed, `${s}: vetoed acts found`);
  eq(b.line_item_veto, c.lineItemVeto, `${s}: line-item vetoes found`);
  eq(b.no_signature, c.becameLawWithoutSignature, `${s}: no-signature bills found`);
  eq(b.signedReviewedMapped, c.signedReviewedMapped, `${s}: signed acts on a mapped bill`);
  eq(b.vetoedReviewedMapped, c.vetoedReviewedMapped, `${s}: vetoed acts on a mapped bill`);
  // The acts admitted for a session are exactly its mapped acts.
  const mine = SEED.acts.filter((a) => a.session === s);
  eq(mine.filter((a) => a.actionType === "gov_signed").length, c.signedReviewedMapped,
    `${s}: every mapped signed act was admitted`);
  eq(mine.filter((a) => a.actionType === "gov_vetoed").length, c.vetoedReviewedMapped,
    `${s}: every mapped vetoed act was admitted`);
}
eq(C.reviewedMappedActs.signed, SIGNED, "signed acts on a mapped bill, both sessions");
eq(C.reviewedMappedActs.vetoed, VETOED, "vetoed acts on a mapped bill, both sessions");
eq(C.admittedThisWave.total, TOTAL, "the census's admitted total");
eq(C.attributedTo[GOV], TOTAL, "…all of it attributed to the governor");
// EVERY ACT FOUND IS ADMITTED OR REFUSED, and the refusal is one of the named
// buckets. This is the arithmetic a census is for: 1,104 signatures and 13 vetoes
// were recorded in the two sessions, 140 of them carry a reviewed issue mapping,
// and the remaining 977 are refused as unmapped — 966 signatures and the 11 vetoes
// whose written reviews reached no shipped key.
const unmapped = SEED.refused.unmappedBill.reduce((m, r) => {
  m[r.act] = (m[r.act] || 0) + 1; return m;
}, {});
eq(unmapped.gov_signed + unmapped.gov_vetoed, C.refused.unmappedBill,
  "the unmapped bucket is the signatures and the vetoes it says it is");
const signedFound = C["2024GS"].governorSigned + C["2025GS"].governorSigned;
eq(SIGNED + unmapped.gov_signed, signedFound,
  "every signature found is either admitted or refused as unmapped, with nothing unaccounted for");
const vetoedFound = C["2024GS"].governorVetoed + C["2025GS"].governorVetoed;
eq(VETOED + unmapped.gov_vetoed, vetoedFound,
  "every veto found is either admitted or refused as unmapped");
eq(unmapped.gov_vetoed, C.refused.vetoRefusedOnReview,
  "…and each refused veto is one of the eleven written reviews, not a silent drop");
eq(C.refused.vetoAdmittedOnReview + C["2025GS"].vetoedReviewedMapped - 1, VETOED,
  "the two admitted vetoes are the one mapped in this pass and the one the committee wave mapped");

// ═══════════════════════════════════════════════════════════════════════════
section("5 · it is not a vote, and the migration proves it");
// ═══════════════════════════════════════════════════════════════════════════
// A gubernatorial act lives in vr_positions. It has no roll number to borrow and
// no chamber tally to sit in, and the migration must not invent either.
lacks(SQL, "vr_rollcalls", "the migration creates no roll call");
lacks(SQL, "vr_member_votes", "the migration records no member vote");
for (const ddl of ["CREATE TABLE", "ALTER TABLE", "DROP TABLE", "CREATE INDEX", "DROP INDEX"]) {
  lacks(SQL, ddl, `the migration carries no DDL (${ddl})`);
}
lacks(SQL, "DELETE FROM", "the migration deletes nothing");
lacks(SQL, "UPDATE vr_", "the migration overwrites nothing");
eq((SQL.match(/INSERT INTO vr_positions/g) || []).length, TOTAL, "one position insert per act");
eq((SQL.match(/ON CONFLICT \(measure_id, politician_id, action_type\) DO NOTHING;/g) || []).length,
  TOTAL, "every insert is idempotent on the vr_positions unique index");
ok(parsed.every((p) => /IF m_id IS NULL THEN/.test(p.block)),
  "every block fences on the measure row before it writes");
// The vocabulary, in the SQL itself: two action types, and never the federal ones.
const types = new Set(parsed.map((p) => p.act));
eq(types.size, 2, "the migration writes exactly two action types");
ok(types.has("gov_signed") && types.has("gov_vetoed"), "and they are gov_signed and gov_vetoed");
for (const fed of ["signed", "vetoed", "issued"]) {
  ok(parsed.every((p) => p.act !== fed),
    `no block writes the federal act type "${fed}" into action_type`);
}
// (The literal 'vetoed' does appear once, as H.B. 306's measure STATUS. A bill's
// status is the bill's own state — the fence above is about the action_type column,
// which is the only place an act type can be mistaken for a federal one.)
// The header NAMES the federal three, because saying which types this wave did
// not reuse is half of what the header is for. The fence is on the executable
// statements, so read the SQL with its comment lines stripped.
const STMTS = SQL.split("\n").filter((l) => !/^\s*--/.test(l)).join("\n");
lacks(STMTS, "'issued'", "no statement mentions the presidential order type");
eq((STMTS.match(/'vetoed'/g) || []).length, 1, "…and 'vetoed' appears in one statement, as a bill status");
has(SQL, "already exist in this table, held only by the President",
  "…while the header says in writing that the federal three were not reused");
// No ballot verb, anywhere a reader can see. The note is what surfaces on a row.
for (const ballot of ["Voted Yea", "Voted Nay", "roll call", "Rollcall", "yea", "Yea", "nay", "Nay"]) {
  ok(parsed.every((p) => String(p.note).indexOf(ballot) < 0),
    `no act note carries the ballot word "${ballot}"`);
}
ok(SEED.acts.every((a) => !/yea|nay|roll ?call|vote/i.test(String(a.printedText))),
  "no act's printed text is a ballot phrase");
has(SEED._notAVote || "", "vote", "the seed states in writing that these are not votes");
// One measure and one mapping, both guarded, both declared. A migration that
// writes vr_measure_issues moves the pack fingerprint, and the pack step requires
// it to say so on its own face.
eq((SQL.match(/INSERT INTO vr_measures /g) || []).length, 1,
  "this wave creates exactly one measure row (H.B. 306, the veto it mapped itself)");
eq((SQL.match(/INSERT INTO vr_measure_issues/g) || []).length, 1, "…and exactly one mapping row");
has(SQL, "-- pack-generation: derived", "the migration declares its pack-generation effect");
has(SQL, "'execActOnly', true", "the measure it creates is marked as reaching the record on an executive act alone");
has(SQL, "'sound_money'", "the mapping it writes is the reviewed key");
ok(/IF NOT EXISTS \(SELECT 1 FROM vr_measure_issues/.test(SQL), "the mapping insert is guarded");
eq(SEED.measuresCreatedByThisWave.length, 1, "the seed names the one measure it creates");
has(JSON.stringify(SEED.measuresCreatedByThisWave), "HB0306", "…and it is H.B. 306");
// Every mapping this wave writes came from a reviewed bill record with a rationale
// and a text URL. No key is asserted without one.
eq(BILLS.bills.length, 1, "one bill was reviewed for a mapping in this pass");
for (const b of BILLS.bills) {
  for (const i of b.issues) {
    ok(ISSUE_KEYS.has(i.issueKey), `${b.bill}'s key ${i.issueKey} is a shipped key`);
    ok(i.rationale && i.rationale.length > 200, `${b.bill}'s mapping carries a written rationale`);
    ok(/^https:\/\/le\.utah\.gov\//.test(b.textUrl), `${b.bill}'s rationale cites the enrolled text`);
  }
}
// An applied migration is immutable, so this one has to sort after the tail it was
// stamped against — a wall-clock filename that sorts earlier would never run.
const migs = readdirSync(join(ROOT, "netlify/database/migrations")).sort();
const mine = MIG.split("/").pop();
eq(migs[migs.length - 1], mine, "this wave's migration is the tail of the directory");
ok(migs.indexOf(mine) > migs.indexOf("20261101000000_seed_dd_hd68_district_file_room.sql"),
  "…and it sorts after the migration that was the tail when it was written");

// ═══════════════════════════════════════════════════════════════════════════
// THE ENGINE. Everything above read files. Everything below boots the shipped
// modules and asks them, because the claim "no act is labelled a vote" is a claim
// about what the act table returns, not about what the SQL spells.
// ═══════════════════════════════════════════════════════════════════════════
const FILES = ["cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js",
  "say-vs-do.js", "exec-action-data.js", "exec-record.js", "exec-record-ui.js", "consistency.js",
  "voting-record.js", "formal-index.js", "word-action.js", "profile-spine.js"];
const NOW = FILES.map((f) => [f, R(f)]);
function boot(srcs) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const [f, s] of srcs) if (s != null) vm.runInContext(s, ctx, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
}

section("6 · the act vocabulary, as the engine returns it");
const win = boot(NOW);
must(win.PDXVotingRecord && win.PDXConsistency && win.PDXWordAction && win._PDX_ACT_CLASSES,
  "the engine did not boot");
const CLS = win._PDX_ACT_CLASSES;
const FLOOR_W = CLS.floor.w;
for (const [key, label, one, many] of [["gov_signed", "Signed", "signed bill", "signed bills"],
  ["gov_vetoed", "Vetoed", "veto", "vetoes"]]) {
  const c = CLS[key];
  must(c, `${key} is not in the act table`);
  eq(c.key, key, `${key} knows its own key`);
  eq(c.w, 0.70, `${key} weighs 0.70`);
  eq(c.floor, false, `${key} is not a floor act`);
  eq(c.label, label, `${key} is labelled "${label}"`);
  eq(c.one, one, `${key}'s singular noun`);
  eq(c.many, many, `${key}'s plural noun`);
  ok(c.w < FLOOR_W, `${key} weighs less than a floor roll call`);
  ok(c.w > CLS.committee_vote.w, `${key} weighs more than a committee vote`);
  // The three phrasings a row can print. None of them may reach for a ballot verb.
  for (const phrase of [c.label, c.one, c.many]) {
    ok(!/\b(yea|nay|vote[ds]?|voting|ballot|roll ?call)\b/i.test(phrase),
      `${key}'s phrasing "${phrase}" carries no ballot word`);
  }
  // The classifier is the only way anything asks, and it answers off an item.
  const c2 = win._pdxActClass({ actionType: key, kind: "position" });
  eq(c2 && c2.key, key, `_pdxActClass routes an ${key} item to its class`);
  eq(win._pdxActLabel({ actionType: key, kind: "position" }), label,
    `_pdxActLabel prints "${label}" for an ${key} item`);
}
// Strongest-first order, with the two new acts under the floor vote and over the
// committee vote — the same order their weights already imply, spoken.
const order = Object.keys(CLS);
ok(order.indexOf("gov_signed") > order.indexOf("floor"),
  "gov_signed is ranked below a floor vote");
ok(order.indexOf("gov_signed") < order.indexOf("committee_vote"),
  "…and above a committee vote");
eq(win._pdxActMixPhrase({ gov_signed: 3, gov_vetoed: 1 }), "3 signed bills and 1 veto",
  "the mix phrase speaks the acts in the record's own words");
eq(win._pdxActMixPhrase({ floor: 2, gov_signed: 1 }), "2 floor votes and 1 signed bill",
  "…and ranks a floor vote first when both are present");
// THE PRESIDENT DID NOT MOVE. The federal enactment types stay out of the act
// table, which is what routes a president to the ✒️ lane instead of this one.
for (const fed of ["signed", "vetoed", "issued"]) {
  eq(CLS[fed], undefined, `the federal act type "${fed}" is still absent from the act table`);
  eq(win._pdxActClass({ actionType: fed, kind: "position" }), null,
    `…and the classifier still refuses to class a federal "${fed}"`);
}
eq(win._PDX_ACT_REFUSED.statement, "word_not_action",
  "a statement is still refused as a word, not admitted as an act");
// The walls this wave was forbidden to move.
const SH = R("stance-helpers.js");
for (const [needle, what] of [
  ["_RD_MIN_STRENGTH = 4", "the characterisation strength wall"],
  ["_RD_THIN_MIN_STRENGTH = 0.6", "the thin-read strength wall"],
  ["_RD_LEAN_MIN_STRENGTH = 0.6", "the lean strength wall"],
  ["_RD_FLOOR_LED = 0.5", "the floor-led share"],
]) has(SH, needle, `${what} is where the earlier waves left it`);
has(R("word-action.js"), "MIN_TESTED_ITEMS = 3", "the Word-vs-Action item floor did not move");
has(R("word-action.js"), "MIN_TESTED_WEIGHT = 4", "the Word-vs-Action weight floor did not move");

section("7 · the lane a gubernatorial act routes to");
// The acts, injected the way a completed /api/voting-record fetch leaves them.
// Six is enough to establish the routing; the shape is the seed's own.
const fixtureIssues = [{ issueKey: "sound_money", weight: 65, isPrimary: true,
  supportMeaning: "yea_supports", rationale: "fixture" }];
const asItem = (a, mid) => ({
  kind: "position", measureId: mid, measureType: "bill", number: a.number, title: a.title,
  chamber: a.chamber, status: null, date: `${a.actedAt}T00:00:00.000Z`,
  action: a.actionType, actionType: a.actionType, position: a.actionType,
  result: null, isParty: null, supports: a.supports, isProcedural: false,
  advanceInverted: false, isAmendment: false, parentMeasureId: null, rollcallId: null,
  congress: null, session: null, rollNumber: null, issues: fixtureIssues,
  source: { url: a.sourceUrl, label: "Utah bill status" },
});
const fixture = SEED.acts.slice(0, 5).concat(SEED.acts.filter((a) => a.actionType === "gov_vetoed"))
  .map((a, i) => asItem(a, 90001 + i));
must(fixture.some((i) => i.actionType === "gov_vetoed") &&
  fixture.some((i) => i.actionType === "gov_signed"), "the fixture lost one of the two acts");
win.PDXVotingRecord.noteMember(GOV, JSON.parse(JSON.stringify(fixture)));
const counts = win._pdxRecordMappedCounts(GOV);
must(counts, "the fixture produced no counts");
eq(counts.total, fixture.length, "every injected act is on file");
eq(counts.votes, fixture.length, "…and every one of them counts as an act of coverage");
eq(counts.supersededActs, 0, "one act per bill, so nothing is superseded");
// THE LANE. A governor's formal acts belong to the 🏛 formal record, which is the
// 'vote' lane — the same lane a legislator's floor record uses, filled with acts a
// governor actually performs. It is NOT the ✒️ executive-enactment lane, which
// stays federal, and the two must never both claim the same person.
const lanes = win.PDXConsistency.recordLanes(GOV);
eq(lanes.vote, true, "cox's acts route to the formal record lane");
eq(lanes.exec, false, "…and not to the executive-enactment lane");
eq(lanes.both, false, "…and never to both, which would count one act twice");
// The federal lane, unchanged, in the same booted engine.
const tl = win.PDXConsistency.recordLanes("trump");
eq(tl.exec, true, "trump still routes to the executive-enactment lane");
eq(tl.vote, false, "…and not to the formal record lane");
const ll = win.PDXConsistency.recordLanes("lee");
eq(ll.vote, true, "a senator still routes to the formal record lane");
eq(ll.exec, false, "…and not to the executive lane");
// The ✒️ lane's own gate agrees: cox has no federal enactment record to show.
if (win.PDXExecRecord && typeof win.PDXExecRecord.eligible === "function") {
  eq(win.PDXExecRecord.eligible(GOV), false, "the executive-enactment lane does not claim cox");
  eq(win.PDXExecRecord.eligible("trump"), true, "…and still claims trump");
}
// The per-issue read, which is where a row face gets its words. The direction
// index must classify the acts (not drop them as unclassified) and the phrase it
// discloses must speak signatures, not ballots.
const items = win._pdxRecordIssueItems(GOV, "sound_money") || [];
ok(items.length > 0, "the issue read finds the acts");
const idx = win._recordDirectionIndex("sound_money", items);
must(idx, "the direction index returned nothing");
eq(idx.unclassified, 0, "the direction index recognises every gubernatorial act");
eq(idx.floorActs, 0, "none of them is counted as a floor vote");
eq(idx.nonFloorActs, items.length, "all of them are counted as non-floor acts");
eq(idx.floorLed, false, "…so the record is not floor-led, and a tier may not claim it is");
ok((idx.mix.gov_signed || 0) > 0, "signatures land in the act mix under their own key");
ok(!/yea|nay|ballot|roll ?call/i.test(win._pdxActMixPhrase(idx.mix) || ""),
  "the disclosed mix phrase carries no ballot word");
const tier = win._recordPatternTier(idx);
if (tier) {
  ok(!/yea|nay|ballot|roll ?call|voted/i.test(JSON.stringify(tier)),
    "the pattern tier for a governor's record never says a ballot word");
}

section("8 · nothing drifted for the people who do cast votes");
// A SECOND ENGINE THAT DOES NOT KNOW THIS WAVE, booted beside the working tree
// and asked the same questions about the three ids the brief named.
//
// This used to read HEAD, because while the wave was in flight HEAD *was* the
// tree before it. That is a proxy, and it expires the moment the wave lands: on
// a merged tree HEAD knows gov_signed, the two engines become the same engine,
// and every equality below would pass for the one reason that proves nothing.
// The control underneath caught exactly that and refused rather than passing
// vacuously — so what is pinned here now is the claim instead of the proxy. The
// counterfactual is the NEWEST REVISION OF THE ENGINE THAT DOES NOT CARRY THESE
// ACT TYPES, found by walking stance-helpers.js back through history. Before the
// merge that is HEAD and this section reads exactly as it did; after the merge it
// is the commit the wave was reviewed against, and the comparison stays real for
// as long as the repo keeps its history.
const showAt = (rev, f) => {
  try {
    return execFileSync("git", ["show", `${rev}:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (e) { return null; }
};
const BEFORE_REV = (() => {
  let revs = [];
  try {
    revs = execFileSync("git", ["rev-list", "HEAD", "--", "stance-helpers.js"],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim().split("\n").filter(Boolean);
  } catch (e) { return null; }
  for (const r of revs) {
    const sh = showAt(r, "stance-helpers.js");
    if (sh && !/gov_signed/.test(sh)) return r;
  }
  return null;
})();
must(BEFORE_REV, "no revision of the engine without gov_signed is reachable — there is nothing to compare");
const HEAD = FILES.map((f) => [f, showAt(BEFORE_REV, f)]);
must(HEAD.every(([, s]) => s != null),
  `${BEFORE_REV.slice(0, 8)} is missing a file the engine needs`);
const before = boot(HEAD);
must(before.PDXWordAction && before.PDXConsistency, "the pre-wave engine did not boot");
// The control the paragraph above is about: the second engine must not know this
// wave, or section 8 is vacuous.
must(before._PDX_ACT_CLASSES && !before._PDX_ACT_CLASSES.gov_signed,
  `${BEFORE_REV.slice(0, 8)} already has gov_signed — there is nothing to compare`);
console.log(`      (counterfactual engine: ${BEFORE_REV.slice(0, 8)}, which has no gov_signed)`);
const after = boot(NOW);
const KEYS = [...ISSUE_KEYS];
for (const pid of ["lee", "chew_h68", "defay_h15"]) {
  const read = (w) => { try { return JSON.stringify(w.PDXWordAction.read(pid)); } catch (e) { return `err:${e.message}`; } };
  eq(read(after), read(before), `${pid}'s Word-vs-Action read is byte-identical across the two engines`);
  const rec = (w) => { try { return JSON.stringify(w.PDXConsistency.officialRecord(pid)); } catch (e) { return `err:${e.message}`; } };
  eq(rec(after), rec(before), `${pid}'s record verdict is byte-identical across the two engines`);
  const lanes2 = (w) => JSON.stringify(w.PDXConsistency.recordLanes(pid));
  eq(lanes2(after), lanes2(before), `${pid}'s lane routing is byte-identical across the two engines`);
  // Every per-issue floor tier, key by key. This is the surface a new act class
  // could quietly reach: a weight in the depth sum, a new entry in the mix, a
  // tier that moved because the vocabulary grew.
  let drifted = 0, checked = 0;
  for (const k of KEYS) {
    const sum = (w) => {
      if (typeof w._pdxRecordIssueSummary !== "function") return null;
      try { return JSON.stringify(w._pdxRecordIssueSummary(pid, k)); } catch (e) { return `err:${e.message}`; }
    };
    const a = sum(after), b = sum(before);
    if (a === null && b === null) continue;
    checked++;
    if (a !== b) { drifted++; if (drifted === 1) failures.push(`${pid}/${k} floor tier drifted: ${b} → ${a}`); }
  }
  must(checked > 0, `${pid}: no per-issue tier was readable, so nothing was compared`);
  eq(drifted, 0, `${pid}'s ${checked} per-issue formal-record tiers are byte-identical across the two engines`);
}
// And the president, whose lane this wave was forbidden to touch.
eq(JSON.stringify(after.PDXConsistency.recordLanes("trump")),
  JSON.stringify(before.PDXConsistency.recordLanes("trump")),
  "trump's lane routing is byte-identical across the two engines");
eq(JSON.stringify(after.PDXWordAction.read("trump")),
  JSON.stringify(before.PDXWordAction.read("trump")),
  "trump's Word-vs-Action read is byte-identical across the two engines");

section("9 · the two gates: an empty lane, and a lane that tests nothing");
const WA = after.PDXWordAction;
const CMP = after.CMP_DATA || {};
must(typeof WA.untestedFormalLane === "function", "the untested-lane gate is not exported");
must(typeof WA.noFormalLane === "function", "the empty-lane gate is not exported");
must(after.PDXFormalIndex && typeof after.PDXFormalIndex.has === "function",
  "the formal index did not boot, so neither gate can be asked the way the page asks it");
// Both gates read a person's own tested set, so they are asked here the way the
// page asks them: with the read the engine just produced, not a hand-made one. A
// hand-made empty tested set would make the untested gate fire for everyone whose
// lane is on file, including a president, and prove nothing.
const gates = (pid) => {
  const r = WA.read(pid);
  const prof = CMP[pid] || null;
  return { empty: WA.noFormalLane(pid, r, prof), untested: WA.untestedFormalLane(pid, r, prof),
    publishable: !!(r && r.publishable) };
};
// An executive with zero signed or vetoed rows. The empty-office sentence is still
// the right thing to print, and this wave did not make it unreachable.
const EMPTY = "derek_brown_ut";
must(CMP[EMPTY], `${EMPTY} is no longer in cmp-data.js — the empty-lane case cannot be read`);
eq(after.PDXFormalIndex.has(EMPTY), false, `${EMPTY} has no row in the formal index`);
const gEmpty = gates(EMPTY);
eq(gEmpty.empty, true, `${EMPTY} has no formal lane, and the gate still fires`);
eq(gEmpty.untested, false,
  `${EMPTY}'s lane is empty rather than untested — the two gates never both claim one page`);
eq(gEmpty.publishable, false, `…and ${EMPTY} publishes no ratio`);
has(WA.NO_FORMAL_LANE_COPY, "formal", "the empty-lane copy is on file");
// The governor, IN THE FRAME THIS SECTION PINS: the acts are on file through the
// shipped formal index — which is the whole point of the wave — but the only
// records this boot carries for him are section 7's six-act fixture, all of it
// pinned to one issue, so nothing on the lane reaches MIN_TESTED_ITEMS. That is a
// real frame and not a contrivance: it is what a device paints in the moment the
// index says the lane exists and the record read has not come back with enough of
// it to test anything. The ratio must not publish there, and the copy has to say
// which of the two silences it is. Section 11 pins the other frame — the whole
// 140-act file, every act carrying its own shipped mapping — where the lane DOES
// test stated positions and the ratio does publish. Both gates are false there.
eq(after.PDXFormalIndex.has(GOV), true, "cox has rows in the formal index");
const gCox = gates(GOV);
eq(gCox.empty, false, "cox's formal lane is no longer empty");
eq(gCox.untested, true, "…but nothing on it tests a documented position in this frame");
eq(gCox.publishable, false, "so Word vs Action publishes nothing here");
has(WA.NO_TESTED_FORMAL_COPY, "on file", "the untested-lane copy says the acts are on file");
ok(!/%/.test(WA.NO_TESTED_FORMAL_COPY), "…and quotes no percentage");
ok(WA.NO_TESTED_FORMAL_COPY !== WA.NO_FORMAL_LANE_COPY,
  "…and it is not the empty-office sentence wearing a new name");
// Neither gate may reach a person who casts floor votes: both are scoped to
// offices that cast none, so a thin legislator keeps the copy it always had.
for (const pid of ["lee", "chew_h68", "defay_h15"]) {
  const g = gates(pid);
  eq(g.untested, false, `${pid} casts floor votes, so the untested-lane gate never claims them`);
  eq(g.empty, false, `${pid} casts floor votes, so the empty-lane gate never claims them`);
}
// The president: his enactment record DOES test his stated positions, so his lane
// is on file, tested, and publishing — exactly as it was before this wave.
const gT = gates("trump");
eq(gT.untested, false, "trump's enactment record tests his stated positions, so neither gate fires");
eq(gT.empty, false, "…his lane is not empty either");
eq(gT.publishable, true, "…and his ratio still publishes");

section("10 · what the reader's own index says");
// The formal index is the file every surface consults to know whether a lane is
// worth opening. cox's line is the before/after of this whole wave.
const FI = R("formal-index.js");
has(FI, `'${GOV}': [${TOTAL}, ${TOTAL}],`, `the formal index gives cox ${TOTAL} acts on ${TOTAL} measures`);
for (const pid of ["dhenderson", "derek_brown_ut"]) {
  ok(!new RegExp(`'${pid}':\\s*\\[[1-9]`).test(FI),
    `${pid} gains no row in the formal index`);
}
// The API's label table, which is what prints the pill on a row. Same two words
// the act table uses, and no ballot verb.
const VRM = R("netlify/functions/voting-record.mts");
has(VRM, 'gov_signed: "Signed"', "the API labels a signature “Signed”");
has(VRM, 'gov_vetoed: "Vetoed"', "the API labels a veto “Vetoed”");
has(VRM, "STATE-executive", "…and says in writing that these are state-executive types");
// The runbook paragraph the brief asked for: URL, WAF, name map, admission rules.
const RB = R("db/vr-ingest-runbook.md");
has(RB, "Utah executive lane", "the runbook has the wave's section");
has(RB, "20261102000000", "…naming the migration");
has(RB, "billlist.json", "…the endpoint");
has(RB, "Request Rejected", "…the WAF behaviour");
has(RB, "vr-utah-exec-map.json", "…the name map");
has(RB, "gov_signed", "…and the act types");

// The 140-act file, built once in section 11 and handed to section 12 — the
// dossier copy has to be read off the same page a reader actually loads, not a
// five-act frame that happens to render the same sentences.
let FULL_FILE = null;

section("11 · the whole file, with every act carrying its own mapping");
// SECTION 9 pinned the thin frame. This one pins the page the wave was actually
// written for: all 140 admitted acts, each one resolved to the issue mapping the
// repo already ships for its bill — the same resolution /api/voting-record does
// server-side — filed the way a completed fetch files it. Nothing is invented
// here; an act whose bill has no shipped mapping would arrive with an empty issue
// list and characterise nothing, which is the refusal the brief asked for.
{
  const live = boot(NOW);
  const shipped = new Map();
  const addBills = (session, file) => {
    for (const b of (J(file).bills || [])) {
      const k = `${session}|${b.bill}`;
      if (!shipped.has(k)) shipped.set(k, b.issues || []);
    }
  };
  addBills("2025GS", "db/vr-utah-bills.json");
  addBills("2024GS", "db/vr-utah-bills-2024GS.json");
  addBills("2025GS", "db/vr-utah-committee-bills-2025GS.json");
  addBills("2024GS", "db/vr-utah-committee-bills-2024GS.json");
  addBills("2025GS", "db/vr-utah-exec-bills.json");
  let mid = 800000, unmappedActs = 0;
  const full = SEED.acts.map((a) => {
    const iss = (shipped.get(`${a.session}|${a.bill}`) || []).map((i) => ({
      issueKey: i.issueKey, weight: i.weight, isPrimary: i.isPrimary,
      supportMeaning: i.supportMeaning || "yea_supports", rationale: i.rationale || "",
    }));
    if (!iss.length) unmappedActs++;
    return { kind: "position", measureId: ++mid, measureType: "bill", number: a.number,
      title: a.title, chamber: a.chamber, status: null, date: `${a.actedAt}T00:00:00.000Z`,
      action: a.actionType, actionType: a.actionType, position: a.actionType, result: null,
      isParty: null, supports: a.supports, isProcedural: false, advanceInverted: false,
      isAmendment: false, parentMeasureId: null, rollcallId: null, congress: null,
      session: null, rollNumber: null, issues: iss, source: { url: a.sourceUrl, label: "Utah bill status" } };
  });
  eq(full.length, TOTAL, "every admitted act is in the live fixture");
  FULL_FILE = full;
  // ADMISSION HELD: nothing was seeded that the repo cannot map. If this ever
  // moves, the migration admitted an act on a bill nobody reviewed.
  eq(unmappedActs, 0, "an admitted act has no shipped issue mapping — the admission rule leaked");
  live.PDXVotingRecord.noteMember(GOV, full);
  const counts = live._pdxRecordMappedCounts(GOV);
  must(counts, "the live fixture produced no counts");
  eq(counts.total, TOTAL, `all ${TOTAL} acts are on cox's file`);
  eq(counts.votes, TOTAL, "…and every one of them counts as coverage");
  eq(counts.supersededActs, 0, "…one act per bill, so nothing is superseded");
  ok(counts.issues > 1, "the acts reach more than one issue");
  // THE 🏛 BRIEF. The empty-office sentence is gone, and what replaced it is a
  // shape read, not a score.
  const prof = (live.CMP_DATA || {})[GOV] ||
    { id: GOV, name: "Spencer Cox", office: "Governor", state: "UT" };
  const brief = String(live.PDXWordAction.briefHtml(GOV, prof) || "");
  const text = brief.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  ok(text.length > 0, "the brief rendered nothing for cox");
  lacks(text, live.PDXWordAction.EMPTY_FILE_COPY || "No formal pattern on file yet",
    "the brief still prints the empty-office sentence over a 140-act file");
  lacks(text, live.PDXWordAction.NO_TESTED_FORMAL_COPY || "\u0000",
    "…and does not print the untested-lane sentence either");
  has(text, "formal record", "the brief names the formal record");
  // AND IT SPEAKS SIGNATURES. Not one ballot word reaches a governor's own rows —
  // in the visible copy or in the tooltip every pattern chip carries, which is
  // where the act mix is disclosed and so the likeliest place for a ballot verb to
  // survive. The tooltips live in attributes, so they are read out of the markup
  // rather than the stripped text.
  const tips = (brief.match(/title="[^"]*"/g) || []).join(" ");
  ok(tips.length > 0, "no pattern chip disclosed what its tier was read from");
  for (const verb of [/Voted Yea/i, /Voted Nay/i, /\byeas?\b/i, /\bnays?\b/i, /roll ?call/i,
                      /\bballot\b/i, /voted (?:for|against|no|yes)/i]) {
    ok(!verb.test(text) && !verb.test(tips),
      `cox's brief uses a ballot word (${verb}) for an act he did not cast`);
  }
  has(tips, "signed bill", "a chip tooltip never says what the acts actually are");
  has(tips, "No floor vote on file here",
    "…or that there is no floor vote behind the tier, which is the whole disclosure");
  // WORD VS ACTION, at the same floors as everyone else. It publishes because the
  // acts test stated positions — and every tested item is tested BY THE RECORD,
  // never by a pledge-ledger entry.
  const r = live.PDXWordAction.read(GOV, prof);
  must(r, "the Word vs Action read returned nothing");
  eq(live.PDXWordAction.noFormalLane(GOV, r, prof), false, "the empty-lane gate is silent here");
  eq(live.PDXWordAction.untestedFormalLane(GOV, r, prof), false,
    "…and so is the untested-lane gate, because the acts do test positions");
  eq(!!r.publishable, true, "cox's ratio publishes off signed and vetoed acts");
  ok((r.tested || []).length >= 3, "…over at least the three tested items every page needs");
  ok((r.testedWeight || 0) >= 4, "…and at least the tested weight every page needs");
  for (const t of (r.tested || [])) {
    const basis = t && t.test && t.test.basis;
    ok(basis !== "pledge-ledger",
      `a tested item rests on the pledge ledger (${t.issueKey || "?"}) — a promise is not a formal act`);
  }
  console.log(`      ${TOTAL} acts, ${counts.issues} issues, 0 unmapped · ` +
    `brief is a shape read · ratio publishes over ${(r.tested || []).length} tested items · no ballot word`);
}

section("12 · the dossier's own sentences, over acts nobody cast");
// SECTION 11 proved the brief and the ratio speak signatures. This one goes down
// to the surface a reader reaches by asking for more: the dossier's three-line
// rows, the group face above them, and the door out into the full record. Every
// assertion below reads RENDERED COPY out of the shipped engine — the same call
// the sheet makes — because the defect this section pins was never in what the
// lane decided. The lane was right: these acts route to 'record', they are weighed,
// they sit outside Direction Match, and the cards said "Signed". The sentences
// AROUND the cards were still teaching a floor: a Yea that was never cast, a roll
// call that carries a question, and a count of "mapped votes" behind a door that
// opens onto signatures.
{
  const live = boot(NOW);
  must(FULL_FILE, "section 11 never handed the full file over");
  live.PDXVotingRecord.noteMember(GOV, FULL_FILE);
  const C = live.PDXConsistency;
  must(C && typeof C.dossierRecordsHtml === "function", "the dossier is not exposed");
  // The issue with the deepest stack of acts, chosen from the record rather than
  // named here — a hard-coded key that stops holding acts is a silent pass.
  const KEY = "tough_on_crime";
  const dItems = C.dossierItems(GOV, KEY) || [];
  must(dItems.length > 1, `${KEY} holds fewer than two acts — the fixture stopped offering the case`);
  const strip = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&")
    .replace(/&#8217;|&rsquo;/g, "\u2019").replace(/\s+/g, " ").trim();

  // ── the rows are acts, and they know it ─────────────────────────────────
  for (const d of dItems) {
    eq(d.lane, "record", "a governor's signed bill left the 🏛 lane");
    eq(d.execAct, true, `${d.ident} is not marked as a state-executive act`);
    eq(d.question, "", `${d.ident} carries a floor question and no question was ever put`);
    ok(d.act === "Signed" || d.act === "Vetoed",
      `${d.ident} is labelled "${d.act}" — the act table says Signed or Vetoed`);
  }

  const recs = strip(C.dossierRecordsHtml(GOV, KEY));
  ok(recs.length > 0, "the dossier's record group rendered nothing");

  // ── 1 · WHAT IT DID is the act, and only the act ────────────────────────
  has(recs, "What it did: Signed.", "the row face does not state the act plainly");

  // ── 2 · WHICH WAY IT CUT is the mapping's polarity, not a ballot ─────────
  has(recs, "this measure passing counts as support for the issue\u2019s direction, and they signed it",
    "the polarity line does not state the mapping in the mapping's own vocabulary");
  lacks(recs, "a Yea counts as", "the polarity line still teaches a ballot the governor never cast");

  // ── 3 · THE DOOR counts what is behind it ───────────────────────────────
  has(recs, `See all ${dItems.length} mapped acts on`,
    "the door out of the dossier still counts votes over a file of signatures");
  lacks(recs, "mapped votes on", "the dossier door names votes");
  lacks(recs, "Open this vote in the full record",
    "the dossier offers to open a vote that does not exist");

  // ── 4 · THE ROLL-CALL EXPLAINER IS GONE where there is no roll call ─────
  lacks(recs, "A roll call carries its question",
    "the lane-asymmetry note describes a roll call over a list that holds none");

  // NOT ONE BALLOT WORD, anywhere on the face or in the deeper body — the same
  // sweep section 11 runs over the brief, run over the surface underneath it.
  const bodies = dItems.map((d, i) => strip(C.dossierDetailHtml(GOV, KEY, i, dItems))).join(" ");
  ok(bodies.length > 0, "no dossier row rendered an expanded body");
  for (const verb of [/\bYea\b/, /\bNay\b/, /roll ?call/i, /\bballot\b/i,
                      /voted (?:for|against|Yea|Nay)/i, /mapped votes/i,
                      /the question on the floor/i]) {
    ok(!verb.test(recs), `the dossier face uses a floor word (${verb}) over acts nobody cast`);
    ok(!verb.test(bodies), `a dossier row body uses a floor word (${verb}) over an act nobody cast`);
  }
  has(bodies, "Open this act in the full record",
    "the deeper body's door into the full record still offers to open a vote");

  // ── AND THE OFFICIAL RECORD ROW'S OWN DOOR, which is the same door ──────
  const orh = strip(C.officialRecordSectionHtml(GOV));
  ok(orh.length > 0, "cox's Official Record section rendered nothing");
  has(orh, "mapped acts on", "the Official Record row's door counts votes on a governor's file");
  lacks(orh, "mapped votes on", "…and still names votes on at least one issue");

  // ── NOTHING MOVED FOR THE PEOPLE WHO DO CAST VOTES ──────────────────────
  // The predicates above are keyed on the two state-executive act types and on
  // whether a roll call is present, so a member who actually votes must read
  // exactly as they did: the ballot polarity lesson, the roll-call note, and a
  // door that counts votes. Injected as a real record and read off the rendered
  // dossier — the same call, the same surface, the other population.
  const iss = [{ issueKey: KEY, weight: 70, isPrimary: true,
    supportMeaning: "yea_supports", rationale: "Primary subject of this measure." }];
  const ballot = (n, num, pos) => ({ kind: "vote", measureId: n, measureType: "bill",
    number: num, title: `Crime Amendments ${num}`, chamber: "house", status: null,
    date: "2025-03-01T00:00:00.000Z", action: "On Passage", actionType: null,
    position: pos, result: "Passed", isParty: true, supports: pos === "Yea",
    isProcedural: false, advanceInverted: false, isAmendment: false,
    parentMeasureId: null, rollcallId: 9000 + n, congress: 119, session: null,
    rollNumber: 100 + n, issues: iss,
    source: { url: "https://www.congress.gov/", label: "Congress.gov" } });
  const LEG = "chew_h68";
  live.PDXVotingRecord.noteMember(LEG,
    [ballot(1, "H.R. 11", "Yea"), ballot(2, "H.R. 12", "Yea"), ballot(3, "H.R. 13", "Nay")]);
  const legItems = C.dossierItems(LEG, KEY) || [];
  must(legItems.length === 3, "the injected roll-call record did not reach the dossier");
  eq(legItems.every((d) => d.execAct === false), true,
    "a roll call was marked as a state-executive act");
  const legRecs = strip(C.dossierRecordsHtml(LEG, KEY));
  must(legRecs, "the legislator's dossier rendered nothing");
  has(legRecs, "a Yea counts as support for the issue\u2019s direction, and they voted Yea",
    "the ballot polarity lesson was lost on a member who does cast votes");
  has(legRecs, "What it did: Voted Yea on the question",
    "a roll call stopped stating its question and its ballot");
  has(legRecs, "A roll call carries its question",
    "the roll-call explainer was dropped over a list that does hold roll calls");
  has(legRecs, "See all 3 mapped votes on",
    "a real vote's door was renamed and it counts votes");
  lacks(legRecs, "mapped acts on", "…and it now counts acts instead");

  // A MIXED LIST GETS BOTH. One roll call and one signature on the same issue is
  // the case that decides whether these gates are per-row or per-list: the note
  // and the door speak to the LIST (there is a roll call in it, so the lesson is
  // owed and the noun is votes), while the polarity line speaks to the ROW (the
  // signature still may not borrow a ballot). Injected together, asserted apart.
  const MIX = "defay_h15";
  const signature = { ...FULL_FILE.find((it) => (it.issues || [])
    .some((i) => i.issueKey === KEY) && it.position === "gov_signed") };
  must(signature && signature.number, `no signed act in the fixture maps to ${KEY}`);
  live.PDXVotingRecord.noteMember(MIX, [ballot(4, "H.R. 14", "Yea"), signature]);
  const mixRecs = strip(C.dossierRecordsHtml(MIX, KEY));
  must(mixRecs, "the mixed dossier rendered nothing");
  has(mixRecs, "A roll call carries its question",
    "a list holding a roll call lost the lesson because it also holds a signature");
  has(mixRecs, "mapped votes on", "…and its door stopped counting the vote in it");
  has(mixRecs, "a Yea counts as", "…and the roll-call row lost its polarity lesson");
  has(mixRecs, "this measure passing counts as",
    "the signature in a mixed list borrowed the roll call's ballot vocabulary");

  // ── TRUMP'S ✒️ LANE IS UNTOUCHED ─────────────────────────────────────────
  // It never offered either door — the exec lane returns '' from both by design —
  // and it never took the roll-call note. Read off his real file, every exec-lane
  // issue on it, because "no change" is the whole promise made about this lane.
  const tRows = (C.issueRows("trump") || []).filter((r) => r && r.lane === "exec");
  must(tRows.length > 0, "trump has no exec-lane issue — the ✒️ guard would pass silently");
  let tSeen = 0;
  for (const r of tRows) {
    const tRecs = strip(C.dossierRecordsHtml("trump", r.key));
    if (!tRecs) continue;
    tSeen++;
    lacks(tRecs, "mapped acts on", `the ✒️ lane grew a roll-call door on ${r.key}`);
    lacks(tRecs, "mapped votes on", `…or kept one on ${r.key}`);
    lacks(tRecs, "A roll call carries its question", `the ✒️ lane took the roll-call note on ${r.key}`);
    lacks(tRecs, "counts as support for the issue\u2019s direction",
      `the ✒️ lane took the record lane's polarity line on ${r.key}`);
  }
  must(tSeen > 0, "not one of trump's exec-lane dossiers rendered");

  console.log(`      ${dItems.length} act rows read as acts · 3 ballot rows unchanged · ` +
    `mixed list keeps both · ${tSeen} ✒️ dossiers untouched`);
}

// ═══════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ vr-utah-exec: ${failures.length} failure(s)\n`);
  for (const f of failures) console.error(`   · ${f}`);
  process.exit(1);
}
console.log(`\n✓ Utah executive formal lane: ${TOTAL} acts (${SIGNED} signed, ${VETOED} vetoed), ` +
  `one office, no ballot verb — ${passed} assertions passed`);
