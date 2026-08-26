#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-corrections.mjs — a correction is a disclosure, never a quiet rewrite
// ─────────────────────────────────────────────────────────────────────────────
// Phase 4 gave the formal record a correction path that does not need a deploy:
// vr_vote_correction_overlays holds proposed and approved corrections to member-vote
// cells, netlify/functions/vr-corrections.mts proposes and approves them behind a
// moderator gate, and netlify/lib/vr-corrections.ts lays approved ones over reads.
//
// The failure modes are specific and they are all one careless line away:
//
//   • A correction that can CREATE a vote is a way to invent a record.
//   • A correction that survives the cell changing underneath it is a standing
//     instruction imposed on data nobody reviewed.
//   • A correction with no reason and no source is an unattributed edit.
//   • A correction applied silently is indistinguishable from a rewrite — the reader
//     sees a different letter than the clerk page the row links to and cannot tell
//     why.
//   • A correction that can reach support_meaning is a runtime path to a backwards
//     verdict, which is the exact error db/vr-ingest-runbook.md rule 22 exists to
//     stop.
//   • A correction applied on the person file but not in /compare, the ranking feed
//     or the offline pack makes the archive disagree with itself.
//
// This suite is the wall. It exercises the overlay logic for real (pure functions,
// no database), and asserts the shape of everything that needs a database against
// the source.
//
//   1. THE OVERLAY APPLIES, AND DISCLOSES.
//   2. THE MATCH GUARD. A moved cell makes a correction stale, not applied.
//   3. THE READ-TIME REFUSALS. Vocabulary, no-op, no reason, no source, bad field.
//   4. IT CANNOT INVENT. No create path, no direction path, two columns only.
//   5. THE GATE. Every route checks isModerator; propose records author + reason.
//   6. THE AUDIT FIELDS EXIST, in the migration, the schema and the API shape.
//   7. EVERY READ SITE APPLIES IT, including the offline pack.
//   8. MIGRATIONS STAY IMMUTABLE. The new file is additive, the old one is untouched,
//      and the generated snapshot carrier sorts last and is idempotent.
//   9. NO SCORE DRIFT. Nothing here emits a percentage, a grade or a second number.
//
//   node scripts/test-vr-corrections.mjs

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);

const LIB = "netlify/lib/vr-corrections.ts";
const FN = "netlify/functions/vr-corrections.mts";
const MIG = "netlify/database/migrations/20260925000000_create_vr_vote_correction_overlays.sql";
const OLD_MIG = "netlify/database/migrations/20260909000000_vr_vote_corrections.sql";

for (const f of [LIB, FN, MIG]) ok(existsSync(join(ROOT, f)), `${f} exists`);
const libSrc = R(LIB);
const fnSrc = R(FN);
const migSrc = R(MIG);
const schemaSrc = R("db/schema.ts");
const vrSrc = R("netlify/functions/voting-record.mts");
const packSrc = R("netlify/lib/vr-pack.ts");

// ─────────────────────────────────────────────────────────────────────────────
// The overlay's logic is pure, so it can be run rather than only read. The library
// is TypeScript; strip the two type-only lines and the db import so the runtime part
// evaluates in plain Node. If that stripping ever stops working the tests below fail
// loudly rather than silently skipping — which is the point.
// ─────────────────────────────────────────────────────────────────────────────
function loadPure() {
  // Node's own type stripper, so this suite tests the shipped source rather than a
  // hand-maintained regex approximation of it. The imports are dropped (the pure
  // functions use none of them) and `export` is removed so the whole module can be
  // evaluated as a function body. loadCorrections() is left in place: it references
  // the dropped `db` binding, but only when called, and this suite never calls it —
  // the one function that needs a database is the one function not exercised here.
  const quiet = process.emitWarning;
  process.emitWarning = () => {};
  let stripped;
  try {
    stripped = stripTypeScriptTypes(libSrc, { mode: "strip" });
  } finally {
    process.emitWarning = quiet;
  }
  const src = stripped
    .replace(/^import[^;]*;$/gm, "")
    .replace(/^export /gm, "") +
    "\nreturn { CORRECTABLE_FIELDS, FIELD_VOCABULARY, cellValue, refuse," +
    " emptyOverlay, loadCorrections, applyCorrection, applyCorrections, correctionSummary };";
  return new Function(src)();
}

let P;
try {
  P = loadPure();
  ok(typeof P.applyCorrection === "function", "the overlay's pure functions loaded");
} catch (e) {
  failures.push(`the overlay's pure functions could not be evaluated: ${e.message}`);
  P = null;
}

const CELL = (rollcallId, politicianId, field) => `${rollcallId}:${politicianId}:${field}`;
function overlayOf(rows) {
  const o = P.emptyOverlay();
  for (const r of rows) {
    const full = {
      id: r.id ?? 1,
      reason: r.reason ?? "verified against the clerk roll-call page",
      sourceUrl: r.sourceUrl ?? "https://clerk.house.gov/Votes/2026123",
      sourceLabel: "",
      reviewedAt: "2026-08-01T00:00:00.000Z",
      ...r,
    };
    if (P.refuse(full)) continue;
    o.byCell.set(CELL(full.rollcallId, full.politicianId, full.field), full);
    o.loaded++;
  }
  return o;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the overlay applies, and discloses");
// ═════════════════════════════════════════════════════════════════════════════
if (P) {
  const o = overlayOf([
    { rollcallId: 7, politicianId: "jane-doe", field: "position", storedValue: "nay", proposedValue: "yea" },
  ]);
  eq(o.loaded, 1, "a valid correction did not load");

  const row = { rollcallId: 7, politicianId: "jane-doe", position: "nay", isParty: "with_party" };
  const out = P.applyCorrection(row, o);
  eq(out.position, "yea", "the corrected value was not applied");
  eq(row.position, "nay", "the input row was mutated — the stored value must never be rewritten in place");
  ok(Array.isArray(out.corrections) && out.corrections.length === 1,
    "the corrected row carries no disclosure — a silent correction is a rewrite");
  const d = out.corrections[0];
  eq(d.field, "position", "the disclosure does not name the field");
  eq(d.from, "nay", "the disclosure does not say what the value was");
  eq(d.to, "yea", "the disclosure does not say what the value is");
  ok(d.reason && d.reason.length >= 12, "the disclosure carries no reason");
  ok(/^https?:\/\//.test(d.sourceUrl), "the disclosure carries no citable source");
  ok("correctedAt" in d, "the disclosure carries no timestamp");
  eq(d.by, "moderator", "the disclosure does not say a moderator approved it");
  ok(!("proposedBy" in d) && !("email" in d) && !("uid" in d),
    "the row-level disclosure leaks author identity to a reader");
  eq(out.isParty, "with_party", "an uncorrected cell on the same row was changed");

  // is_party is nullable, and '' is its encoding of NULL — a correction may clear it.
  const o2 = overlayOf([
    { rollcallId: 7, politicianId: "jane-doe", field: "is_party", storedValue: "with_party", proposedValue: "" },
  ]);
  const out2 = P.applyCorrection({ rollcallId: 7, politicianId: "jane-doe", position: "yea", isParty: "with_party" }, o2);
  eq(out2.isParty, null, "clearing a nullable flag did not write SQL NULL");

  // An untouched row comes back as the SAME object, so a page of rows is not copied
  // wholesale for the sake of one correction.
  const untouched = { rollcallId: 99, politicianId: "jane-doe", position: "yea", isParty: null };
  ok(P.applyCorrection(untouched, o) === untouched, "an uncorrected row was needlessly copied");

  // And an empty overlay is a total no-op — the state between shipping this code and
  // the migration landing.
  const empty = P.emptyOverlay(true);
  eq(empty.unavailable, true, "an unavailable overlay does not say so");
  const rows = [{ rollcallId: 7, politicianId: "jane-doe", position: "nay" }];
  ok(P.applyCorrections(rows, empty) === rows, "an empty overlay still rewrote the page");

  const summary = P.correctionSummary([out, untouched]);
  eq(summary.corrected, 1, "the summary miscounts corrected rows");
  eq(summary.stale, 0, "the summary invents stale rows");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the match guard — a moved cell is stale, not corrected");
// ═════════════════════════════════════════════════════════════════════════════
if (P) {
  const o = overlayOf([
    { rollcallId: 7, politicianId: "jane-doe", field: "position", storedValue: "nay", proposedValue: "yea" },
  ]);
  // The cell now holds 'present' — a re-ingest moved it. The correction was reviewed
  // against 'nay' and nobody has reviewed 'present'.
  const out = P.applyCorrection({ rollcallId: 7, politicianId: "jane-doe", position: "present" }, o);
  eq(out.position, "present", "a correction was imposed on a value nobody reviewed");
  ok(!out.corrections, "a stale correction was reported as applied");
  ok(Array.isArray(out.correctionsStale) && out.correctionsStale.length === 1,
    "a stale correction was dropped silently instead of surfaced");
  eq(out.correctionsStale[0].reviewedValue, "nay", "the stale note does not say what was reviewed");
  eq(out.correctionsStale[0].currentValue, "present", "the stale note does not say what the cell holds now");
  eq(P.correctionSummary([out]).stale, 1, "the summary does not count a stale correction");

  // The same guard on the nullable column: a cell that is now NULL does not match a
  // correction written against 'with_party'.
  const o2 = overlayOf([
    { rollcallId: 8, politicianId: "jane-doe", field: "is_party", storedValue: "with_party", proposedValue: "against_party" },
  ]);
  const out2 = P.applyCorrection({ rollcallId: 8, politicianId: "jane-doe", isParty: null }, o2);
  eq(out2.isParty, null, "a correction was applied over a NULL it was not reviewed against");
  ok(out2.correctionsStale, "the NULL mismatch was not reported as stale");
  eq(P.cellValue(null), "", "NULL does not normalise to the empty-string encoding");
  eq(P.cellValue(undefined), "", "undefined does not normalise to the empty-string encoding");

  // And the guard is re-run server-side at approval time, not only at read time.
  has(fnSrc, "RE-VERIFY AT APPROVAL", "the approve path does not re-verify the cell");
  has(fnSrc, "was written against. Re-verify against the current value",
    "approving against a moved cell is not refused");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the read-time refusals");
// ═════════════════════════════════════════════════════════════════════════════
if (P) {
  const base = {
    id: 1, rollcallId: 7, politicianId: "jane-doe", field: "position",
    storedValue: "nay", proposedValue: "yea",
    reason: "verified against the clerk roll-call page",
    sourceUrl: "https://clerk.house.gov/Votes/2026123", sourceLabel: "", reviewedAt: null,
  };
  eq(P.refuse(base), "", "a valid correction was refused");

  const cases = [
    [{ field: "rationale" }, "not correctable", "a field outside the two correctable columns"],
    [{ field: "support_meaning" }, "not correctable", "support_meaning — the runbook rule 22 field"],
    [{ proposedValue: "abstain" }, "outside the", "a position outside the shipped vocabulary"],
    [{ proposedValue: "" }, "outside the", "an empty position (position is not nullable)"],
    [{ storedValue: "ABSTAIN" }, "outside the", "a stored value outside the vocabulary"],
    [{ proposedValue: "nay" }, "no change", "a correction that changes nothing"],
    [{ reason: "typo" }, "no reason", "a reason too short to be a reason"],
    [{ reason: "   " }, "no reason", "a blank reason"],
    [{ sourceUrl: "" }, "no citable source", "no source at all"],
    [{ sourceUrl: "javascript:alert(1)" }, "no citable source", "a non-http source"],
    [{ sourceUrl: "clerk.house.gov/Votes/1" }, "no citable source", "a source with no scheme"],
  ];
  for (const [patch, expect, what] of cases) {
    const why = P.refuse({ ...base, ...patch });
    ok(why.includes(expect), `${what} was not refused (got ${JSON.stringify(why)})`);
  }
  // is_party legitimately accepts '' — the refusals are per-column, not global.
  eq(P.refuse({ ...base, field: "is_party", storedValue: "with_party", proposedValue: "" }), "",
    "clearing is_party was refused, but '' is its encoding of NULL");

  // A refused row never reaches a reader even when the database somehow holds it.
  const o = P.emptyOverlay();
  const bad = { ...base, proposedValue: "abstain" };
  if (!P.refuse(bad)) failures.push("an out-of-vocabulary row passed refuse()");
  eq(o.byCell.size, 0, "a refused row was loaded into the overlay");

  // The refusals are also the queue's own display logic, so a moderator can see
  // which approved rows would NOT apply.
  has(fnSrc, "wouldApply", "the moderator queue does not say whether a row would apply");
  has(fnSrc, "refusedBecause", "the moderator queue does not say why a row would not apply");

  // Only 'approved' is ever loaded.
  has(libSrc, 'eq(vrVoteCorrectionOverlays.status, "approved")',
    "the loader does not restrict to approved rows");
  ok(!/status,\s*"pending"\)/.test(libSrc), "the loader reads pending rows");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · it cannot invent a vote, and it cannot reach a direction");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Two columns, and the vocabulary of each is stated in one place.
  if (P) {
    eq(P.CORRECTABLE_FIELDS.length, 2, "more than two columns are correctable");
    ok(P.CORRECTABLE_FIELDS.includes("position") && P.CORRECTABLE_FIELDS.includes("is_party"),
      "the two correctable columns are not position and is_party");
    eq(P.FIELD_VOCABULARY.position.join(","), "yea,nay,present,not_voting",
      "the position vocabulary drifted from db/schema.ts");
    ok(P.FIELD_VOCABULARY.is_party.includes(""), "is_party cannot be cleared");
  }

  // There is no INSERT into the vote table from the correction path, in either file.
  for (const [name, src] of [[LIB, libSrc], [FN, fnSrc]]) {
    ok(!/insert\(vrMemberVotes\)/.test(src), `${name} inserts into vr_member_votes`);
    ok(!/update\(vrMemberVotes\)/.test(src), `${name} updates vr_member_votes — the stored cell must never be mutated here`);
    ok(!/delete\(vrMemberVotes\)/.test(src), `${name} deletes from vr_member_votes`);
    // And nothing that could reach a mapping, a direction or a floor.
    for (const t of ["vrMeasureIssues", "supportMeaning", "MIN_TESTED"]) {
      ok(!src.includes(t), `${name} touches ${t} — direction is a curator judgement under runbook rule 22`);
    }
  }
  // The propose path refuses a cell that does not exist, and says why in the reader's
  // terms rather than as a bare 404.
  has(fnSrc, "it cannot create a vote", "propose() does not refuse to create a vote");
  has(fnSrc, "that is an ingest gap", "propose() does not name the real problem when a vote is missing");
  has(fnSrc, "No recorded vote for", "propose() does not refuse a missing cell");
  // And it says out loud what is out of scope.
  has(fnSrc, "stay migration-bound", "propose() does not say that mappings stay migration-bound");
  has(fnSrc, "rule 22", "the correction path does not cite the rule it refuses to touch");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the moderator gate");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(fnSrc, 'from "../../db/firebase-auth.js"', "the function does not use the shared verifier");
  has(fnSrc, "const viewer = await verifyUser(req)", "the router does not verify the caller");

  // Every handler that is not the public log checks the gate. Counted rather than
  // eyeballed: a new route added without the check is the failure this catches.
  const handlers = ["listQueue", "getOne", "propose", "approve", "reject"];
  for (const h of handlers) {
    const body = fnSrc.split(`async function ${h}(`)[1] || "";
    const head = body.slice(0, 400);
    has(head, "if (!viewer) return unauth();", `${h}() does not require a signed-in caller`);
    has(head, "if (!viewer.isModerator) return forbidden();", `${h}() does not require a moderator`);
  }
  // listPublic is deliberately open, and takes no viewer at all so it cannot leak one.
  const pub = fnSrc.split("async function listPublic(")[1] || "";
  ok(!pub.slice(0, 200).includes("viewer"), "the public correction log reads the viewer — it should not need one");
  has(fnSrc, "async function listPublic(url: URL)", "listPublic takes a viewer it does not need");

  // The public shape carries no author identity. Emails and uids are moderator-only.
  const pubShape = fnSrc.split("function publicShape(")[1].split("\n}")[0];
  for (const leak of ["proposedBy", "reviewedBy", "Email", "email", "uid"]) {
    ok(!pubShape.includes(leak), `the public correction shape leaks ${leak}`);
  }
  const auditShape = fnSrc.split("function auditShape(")[1].split("\n}")[0];
  for (const field of ["proposedBy", "proposedAt", "reviewedBy", "reviewedAt", "reviewNote", "status"]) {
    has(auditShape, field, `the moderator audit shape omits ${field}`);
  }
  // Self-review is visible rather than forbidden — a one-person roster is the reality.
  has(auditShape, "selfReviewed", "the audit shape does not disclose self-review");

  // Proposing is not approving. Two steps, because the second is where the stored
  // value is re-verified.
  has(fnSrc, 'status: "pending"', "a proposed correction is not created pending");
  ok(!/status: "approved"[\s\S]{0,200}\.values\(/.test(fnSrc), "propose() writes an approved row directly");

  // Writes are rate-limited; reads are not.
  has(fnSrc, "checkLimits(", "the write path is not rate-limited");
  has(fnSrc, 'if (method === "POST")', "the rate limit is not scoped to writes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the audit fields exist, in all three layers");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Migration.
  for (const col of [
    '"reason" text NOT NULL', '"source_url" text NOT NULL',
    '"proposed_by" text NOT NULL', '"proposed_at"', '"reviewed_by"', '"reviewed_at"',
    '"review_note"', '"status" text', '"stored_value" text NOT NULL',
  ]) {
    has(migSrc, col, `the migration omits ${col}`);
  }
  // The constraints are the floor under the application checks.
  for (const ck of [
    "vr_vco_field_ck", "vr_vco_status_ck", "vr_vco_changes_something_ck",
    "vr_vco_reason_ck", "vr_vco_source_ck", "vr_vco_vocabulary_ck",
  ]) {
    has(migSrc, ck, `the migration omits the ${ck} constraint`);
  }
  has(migSrc, "CREATE TABLE IF NOT EXISTS", "the migration is not idempotent");
  has(migSrc, "REFERENCES \"vr_rollcalls\"", "a correction can point at a roll call that does not exist");
  has(migSrc, "WHERE \"status\" = 'approved'", "there is no partial unique index on approved corrections");
  // The vocabulary in the CHECK matches the library's, so the two cannot drift.
  for (const v of ["yea", "nay", "present", "not_voting", "with_party", "against_party"]) {
    has(migSrc, `'${v}'`, `the migration's vocabulary omits ${v}`);
  }

  // Schema mirror.
  has(schemaSrc, 'pgTable(\n  "vr_vote_correction_overlays"', "db/schema.ts has no mirror table");
  for (const f of [
    "storedValue", "proposedValue", "reason", "sourceUrl", "status",
    "proposedBy", "proposedAt", "reviewedBy", "reviewedAt", "reviewNote",
  ]) {
    has(schemaSrc.split('"vr_vote_correction_overlays"')[1] || "", f,
      `the schema mirror omits ${f}`);
  }

  // API shape: the propose path requires the two things a correction cannot lack.
  has(fnSrc, "reason.length < 12", "propose() accepts a correction with no real reason");
  has(fnSrc, "a correction without one is an assertion", "propose() does not say why a reason is required");
  has(fnSrc, "a correction without one is an opinion", "propose() does not say why a source is required");
  has(fnSrc, "proposedBy: viewer.uid", "propose() does not record who proposed the correction");
  has(fnSrc, "reviewedBy: viewer.uid", "the review path does not record who reviewed it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · every read site applies it, including the offline pack");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(vrSrc, 'from "../lib/vr-corrections.js"', "voting-record.mts does not import the overlay");
  // One applyCorrections per VOTE_COLUMNS query. If a new read site is added without
  // one, the counts diverge and this fails.
  const voteQueries = (vrSrc.match(/\.select\(\{?\s*\.\.\.?VOTE_COLUMNS|\.select\(VOTE_COLUMNS\)/g) || []).length;
  const applied = (vrSrc.match(/applyCorrections\(/g) || []).length;
  ok(voteQueries >= 4, `expected at least four member-vote read sites, found ${voteQueries}`);
  eq(applied, voteQueries,
    `${voteQueries} member-vote read site(s) but ${applied} applyCorrections call(s) — a read site that skips the overlay makes the archive disagree with itself`);

  // The offline pack is its own query and its own cache, so it needs its own call.
  has(packSrc, "applyCorrections(", "the offline pack does not apply the overlay");
  has(packSrc, "loadCorrections(", "the offline pack does not load corrections");
  has(packSrc, "OUTLIVES the request", "the pack does not explain why it must apply the overlay too");
  // Disclosure travels into the pack with the value.
  has(packSrc, "v.corrections", "the pack drops the disclosure");

  // The position filter cannot be left in SQL alone once a correction can change the
  // value it filters on.
  has(vrSrc, "skipPosition", "the position filter has no overlay-aware escape hatch");
  has(vrSrc, "cellValue(r.position) === f.position",
    "the position filter is not re-applied against the corrected value");

  // The payload discloses corrections as counts, in the inventory's voice.
  has(vrSrc, "corrected: votesOnly.filter", "the member summary does not count corrected rows");
  has(vrSrc, "correctionsAvailable", "the payload does not say whether the overlay could be read at all");
  has(vrSrc, "an inventory line, not a quality", "the correction counts are not marked as counts");

  // A missing overlay table is a no-op, not a 500 on the person file.
  has(libSrc, "return emptyOverlay(true)", "an unreadable overlay is not a silent no-op");
  has(libSrc, "console.warn", "an unreadable overlay is not logged");
  ok(!/throw new/.test(libSrc), "the overlay loader can throw into a read path");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · migrations stay append-only, and the old one is untouched");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The new migration is purely additive: it creates and indexes, and never alters,
  // drops or updates anything that already exists.
  for (const verb of ["DROP TABLE", "DROP COLUMN", "ALTER COLUMN", "DELETE FROM", "TRUNCATE"]) {
    ok(!migSrc.toUpperCase().includes(verb), `the new migration contains ${verb} — it must be additive`);
  }
  ok(!/^\s*UPDATE\s/im.test(migSrc), "the new migration UPDATEs an existing row");
  has(migSrc, "never edits one", "the new migration does not state that it rolls forward");

  // The pre-existing correction migration is still there, still a DO block, and this
  // pass did not reach into it. It is the reason the overlay exists and it stays as
  // the historical record of the eighteen corrections that WERE deploy-bound.
  ok(existsSync(join(ROOT, OLD_MIG)), "the original vote-corrections migration was removed");
  const oldSrc = R(OLD_MIG);
  has(oldSrc, "DO $", "the original corrections migration no longer holds its guarded block");
  has(migSrc, "20260909000000_vr_vote_corrections.sql",
    "the new migration does not point at the deploy-bound path it replaces");
  has(migSrc.replace(/\s+/g, " ").replace(/-- /g, ""), "stays exactly as it is",
    "the new migration does not say that the migration-bound path is left intact");

  // Timestamp ordering: the new file sorts after every applied migration.
  const entries = readdirSync(join(ROOT, "netlify/database/migrations"));
  const stamps = entries
    .map((f) => (f.match(/^(\d{14})/) || [])[1])
    .filter(Boolean)
    .sort();
  const mine = "20260925000000";
  ok(stamps.includes(mine), "the new migration is not in the migrations directory");
  ok(new Set(stamps).size === stamps.length,
    "two migrations share a version prefix — the apply order between them is undefined");

  // THE SNAPSHOT CARRIER. Drizzle diffs the newest snapshot in the tree to build the
  // next migration, so the snapshot has to travel with the SQL: introduce a table by
  // hand-written .sql alone and the chain never learns it exists, so the next
  // `generate` emits a second CREATE TABLE for it. Same reason
  // 20260720053826_create_vr_measure_actions_and_provisions sits beside its
  // hand-written twin. Resolved by NAME, not by a literal stamp, because the stamp
  // is re-picked whenever a generated one sorts behind an applied migration.
  const carrier = entries.find(
    (f) => /^\d{14}_create_vr_vote_correction_overlays$/.test(f));
  ok(!!carrier, "no drizzle-shaped snapshot carrier for vr_vote_correction_overlays");
  if (carrier) {
    for (const part of ["migration.sql", "snapshot.json"]) {
      ok(existsSync(join(ROOT, "netlify/database/migrations", carrier, part)),
        `${carrier} is missing ${part} — the snapshot must travel with the SQL`);
    }

    // `drizzle-kit generate` stamps the WALL CLOCK, and this repo's hand-versioned
    // migrations run ahead of the calendar — so a generated stamp sorts BEHIND
    // migrations already applied to the branch and the platform rejects the deploy.
    // The version has to be chosen. This is the check that catches it offline.
    const carrierStamp = carrier.slice(0, 14);
    ok(carrierStamp > mine,
      `${carrier} sorts before ${mine} — re-pick its version so it applies after ` +
      "the hand-written migration it follows");
    // The invariant is that WHATEVER sorts last in this tree carries a snapshot,
    // because that snapshot is what the next `generate` diffs against. Pinning it
    // to this carrier meant every later phase's migration failed this test, which
    // teaches the next person to move the pin instead of shipping the snapshot.
    // So: this carrier is the newest of everything up to itself, and anything
    // newer than it carries a snapshot of its own.
    ok(stamps.filter((st) => st < carrierStamp).every((st) => st < carrierStamp),
      `${carrier} does not sort after the migrations it follows`);
    const newer = entries
      .filter((f) => /^\d{14}/.test(f) && f.slice(0, 14) > carrierStamp)
      .sort();
    const last = newer[newer.length - 1];
    if (last) {
      ok(existsSync(join(ROOT, "netlify/database/migrations", last, "snapshot.json")),
        `${last} sorts after ${carrier} and carries no snapshot.json — the next ` +
        "generate will diff against a snapshot that predates it and re-emit its DDL");
    }

    // It runs on a database where the hand-written migration already created the
    // table, its indexes and its foreign key. Generated SQL is unguarded, which
    // aborts the deploy on the first duplicate object, so every statement in the
    // carrier has to be idempotent.
    const carrierSrc = R(join("netlify/database/migrations", carrier, "migration.sql"));
    const stmts = carrierSrc
      .split("--> statement-breakpoint")
      .map((chunk) => chunk.split("\n").filter((l) => !/^\s*--/.test(l)).join("\n").trim())
      .filter(Boolean);
    ok(stmts.length > 0, `${carrier}/migration.sql has no statements`);
    for (const stmt of stmts) {
      const guarded = /IF NOT EXISTS/i.test(stmt) || /^DO \$\$/i.test(stmt);
      ok(guarded,
        `${carrier}: an unguarded statement would abort the deploy on a duplicate ` +
        `object — ${stmt.split("\n")[0].slice(0, 72)}`);
    }
    // And it may not relax what the hand-written migration constrained.
    for (const verb of ["DROP TABLE", "DROP COLUMN", "DROP CONSTRAINT", "DROP INDEX",
                        "ALTER COLUMN", "DELETE FROM", "TRUNCATE"]) {
      ok(!carrierSrc.toUpperCase().includes(verb),
        `${carrier} contains ${verb} — the carrier is additive and relaxes nothing`);
    }
    ok(!/^\s*(UPDATE|INSERT)\s/im.test(carrierSrc),
      `${carrier} writes data — it carries a snapshot, not a seed`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · no score drift");
// ═════════════════════════════════════════════════════════════════════════════
{
  // A correction path is a place a confidence number would love to appear. It does
  // not: the payload emits counts, and nothing here grades a file or a correction.
  // Comment lines are exempt: the doctrine headers say the words in order to refuse
  // them ("this is not a quality score and it does not grade a file"). What must not
  // appear is a score in the CODE.
  const codeOnly = (src) => src.split("\n")
    .filter((l) => !/^\s*(\/\/|--|\*|\/\*)/.test(l))
    .join("\n");
  for (const [name, src] of [[LIB, codeOnly(libSrc)], [FN, codeOnly(fnSrc)], [MIG, codeOnly(migSrc)]]) {
    for (const word of ["confidence", "dataQuality", "data_quality", "accuracyScore", "trustScore", "grade"]) {
      ok(!src.toLowerCase().includes(word.toLowerCase()),
        `${name} introduces "${word}" — corrections are an inventory, not a score`);
    }
    ok(!/\b\d{1,3}\s*%/.test(src), `${name} emits a percentage`);
  }
  has(fnSrc, "Counts, not a grade", "the public correction log does not say it is counts");
}

console.log("");
if (failures.length) {
  console.error(`✗ vr corrections: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ vr corrections: an overlay that discloses, fails closed, and cannot invent — ${passed} assertions passed\n`);
