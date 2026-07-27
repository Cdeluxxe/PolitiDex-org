#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Unit tests for the Official Record STANCE-ROW PROOF helpers in consistency.js
// ─────────────────────────────────────────────────────────────────────────────
// The profile modal's stance rows used to end at a verdict label, so a thin record
// rendered as "Limited voting record · 1 of 1 from multi-issue bills" — a count with
// no subject. consistency.js now exposes the pure helpers behind those rows as
// window.PDXConsistency.proof:
//
//   rowVerdict(ov)              → the row's "Record: …" vocabulary + the REASON a
//                                 thin verdict is thin
//   proofText(item)             → "H.R. 22 · On Motion to Recommit · Voted Yea"
//   multiNote(item, issueKey)   → "Yea counted for Lower Taxes / against Health Care"
//
// This harness loads stance-helpers.js (multiNote reads its _measureOmnibusContext
// primitive) and consistency.js in a DOM-less vm sandbox and gates three things:
//
//   1. the row LANGUAGE — the exact words for backed / contradicts / limited /
//      no-votes-yet, so the vague copy cannot come back by accident;
//   2. the PROOF — a record is always named by bill and roll-call question, including
//      in the thin case the old copy hid;
//   3. HONESTY — the proof helpers describe the record and never invent one: no
//      bill, question or issue label appears that was not in the input.
//
//   node scripts/test-or-proof.mjs
//
// No database, no network, no DOM. Exit code is non-zero on the first failure.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── Sandbox: enough document for consistency.js's style/boot guards to no-op ───
const noopEl = () => ({
  style: {}, textContent: "", hidden: false, className: "", innerHTML: "",
  setAttribute() {}, appendChild() {}, querySelector: () => null,
  addEventListener() {}, focus() {}, scrollIntoView() {},
});
const ctx = {
  console,
  document: {
    readyState: "complete",
    head: noopEl(), body: noopEl(), documentElement: noopEl(),
    createElement: noopEl, getElementById: () => null,
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {},
  },
  setTimeout, clearTimeout, JSON, Math, Date,
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
ctx.addEventListener = () => {};
const sandbox = vm.createContext(ctx);
for (const file of ["stance-helpers.js", "consistency.js"]) {
  vm.runInContext(readFileSync(join(ROOT, file), "utf8"), sandbox, { filename: file });
}

// Issue labels the helpers read through window.ISSUE_MAP.
ctx.window.ISSUE_MAP = {
  lower_taxes: { label: "Lower Taxes" },
  healthcare: { label: "Health Care" },
  border_security: { label: "Border Security" },
};

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (hay, needle, msg) =>
  ok(String(hay).includes(needle), `${msg} (${JSON.stringify(needle)} missing from ${JSON.stringify(hay)})`);

const P = ctx.window.PDXConsistency && ctx.window.PDXConsistency.proof;
ok(!!P, "export: PDXConsistency.proof exists");
if (!P) {
  console.error("✖ proof helpers not exported — cannot continue");
  process.exit(1);
}
for (const fn of ["rowVerdict", "proofText", "multiNote"]) {
  ok(typeof P[fn] === "function", `export: proof.${fn} is a function`);
}

// ── 1. The row vocabulary ─────────────────────────────────────────────────────
// These four strings ARE the product decision this change makes. If someone
// reintroduces "Limited voting record" on a row, this block fails.
eq(P.LABELS.consistent.label, "Backed it up", "label: a matching record reads 'Backed it up'");
eq(P.LABELS.contradicts.label, "Contradicts", "label: a conflicting record reads 'Contradicts'");
eq(P.LABELS.limited.label, "Limited", "label: a thin record reads 'Limited'");
eq(P.LABELS.no_record.label, "No votes yet", "label: an empty record reads 'No votes yet'");
eq(P.LABELS.no_stance.label, "No votes yet", "label: no-stance rows use the same empty wording");
for (const [token, m] of Object.entries(P.LABELS)) {
  ok(!/voting record/i.test(m.label), `label: ${token} avoids the old vague 'voting record' phrasing`);
  ok(m.label.length <= 16, `label: ${token} stays short enough to scan (${m.label})`);
}

// ── 2. rowVerdict carries a COUNT and a REASON, not just a shrug ──────────────
const backed = P.rowVerdict({
  token: "consistent",
  record: { total: 4, consistent: 4, contradicts: 0, noPosition: 0, hasStance: true },
});
eq(backed.label, "Backed it up", "rowVerdict: consistent → Backed it up");
eq(backed.count, "4 votes", "rowVerdict: pluralises the vote count");
eq(backed.why, "", "rowVerdict: a clear verdict needs no excuse line");

// The exact case the old copy hid: votes exist, but no stated position to check.
const noStance = P.rowVerdict({
  token: "limited",
  record: { total: 1, consistent: 0, contradicts: 0, noPosition: 0, hasStance: false },
});
eq(noStance.label, "Limited", "rowVerdict: thin record → Limited");
eq(noStance.count, "1 vote", "rowVerdict: singular for one vote");
has(noStance.why, "not stated a position", "rowVerdict: says WHY it is limited (no stated stance)");

// Votes exist and a stance exists, but the votes took no position on this issue.
const noPos = P.rowVerdict({
  token: "limited",
  record: { total: 2, consistent: 0, contradicts: 0, noPosition: 2, hasStance: true },
});
has(noPos.why, "no clear position", "rowVerdict: says WHY it is limited (votes took no position)");
eq(noPos.count, "2 votes", "rowVerdict: reports the real mapped count");

const none = P.rowVerdict({ token: "no_record", record: null });
eq(none.label, "No votes yet", "rowVerdict: no record → No votes yet");
eq(none.count, "", "rowVerdict: no count when there is nothing mapped");
has(none.why, "coverage, not a verdict", "rowVerdict: an empty record is framed as coverage");

// Unknown / missing input must degrade to the honest empty, never throw.
eq(P.rowVerdict(null).label, "No votes yet", "rowVerdict: null input degrades honestly");
eq(P.rowVerdict({ token: "wat" }).label, "No votes yet", "rowVerdict: unknown token degrades honestly");

// ── 3. proofText names the bill AND the roll-call question ────────────────────
const RECOMMIT = {
  kind: "vote", number: "H.R. 22", title: "SAVE Act",
  action: "On Motion to Recommit", position: "yea", date: "2026-03-04",
  isProcedural: true,
  issues: [{ issueKey: "border_security", weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
};
eq(P.proofText(RECOMMIT), "H.R. 22 · On Motion to Recommit · Voted Yea",
  "proofText: bill · question · vote, in that order");

// A record with no number still names itself — a row never prints an empty proof.
eq(P.proofText({ kind: "vote", title: "Farm Bill of 2026", action: "On Passage", position: "nay" }),
  "Farm Bill of 2026 · On Passage · Voted Nay",
  "proofText: falls back to the measure title when there is no bill number");
// A stated position carries a slug rather than a written question; it gets title-cased.
eq(P.proofText({ kind: "position", number: "S. 5", action: "cosponsored" }),
  "S. 5 · Cosponsored", "proofText: a position's action slug is title-cased");
eq(P.proofText(null), "", "proofText: no record → no proof");
eq(P.proofText({}), "", "proofText: an empty record prints nothing rather than a stray separator");

// ── 4. multiNote states the mapped issue slice, both directions ───────────────
// The real omnibus shape: ONE yea that advances taxes and border security while
// cutting against healthcare. Read from the taxes row, the note must name the
// healthcare side — that is the fact a bare "1 of 1 from multi-issue bills" hid.
const HR1 = {
  kind: "vote", number: "H.R. 1", title: "One Big Beautiful Bill Act",
  action: "On Passage", position: "yea", isProcedural: false,
  issues: [
    { issueKey: "lower_taxes", weight: 100, isPrimary: true, supportMeaning: "yea_supports" },
    { issueKey: "healthcare", weight: 60, isPrimary: false, supportMeaning: "yea_opposes" },
    { issueKey: "border_security", weight: 80, isPrimary: false, supportMeaning: "yea_supports" },
  ],
};
const fromTaxes = P.multiNote(HR1, "lower_taxes");
has(fromTaxes, "Yea counted", "multiNote: leads with how they actually voted");
has(fromTaxes, "for ", "multiNote: names what the vote advanced");
has(fromTaxes, "Lower Taxes", "multiNote: names this row's own issue on the advancing side");
has(fromTaxes, "against Health Care", "multiNote: names the issue the SAME vote cut against");

// Read from the healthcare row, the same vote flips sides — one vote, two answers.
const fromHealth = P.multiNote(HR1, "healthcare");
has(fromHealth, "against", "multiNote: from healthcare, the vote reads as cutting against");
ok(/against[^/]*Health Care/.test(fromHealth),
  `multiNote: healthcare sits on the against side (got ${JSON.stringify(fromHealth)})`);
ok(/for[^/]*Lower Taxes/.test(fromHealth),
  `multiNote: taxes stays on the for side (got ${JSON.stringify(fromHealth)})`);

// A single-issue vote has no slice to disclose, so the row stays quiet.
eq(P.multiNote(RECOMMIT, "border_security"), "",
  "multiNote: single-issue vote discloses nothing");
eq(P.multiNote(null, "lower_taxes"), "", "multiNote: no record → no note");

// ── 5. Honesty: the helpers describe the record, never invent one ─────────────
// Every issue label in a note must have come from the record's own mappings, and no
// bill number may appear that the record did not carry.
const LABELS = ["Lower Taxes", "Health Care", "Border Security"];
const mapped = HR1.issues.map((i) => ctx.window.ISSUE_MAP[i.issueKey].label);
for (const label of LABELS) {
  if (mapped.includes(label)) continue;
  ok(!fromTaxes.includes(label), `honesty: unmapped issue '${label}' never appears in a note`);
}
ok(!/H\.R\. 22/.test(fromTaxes), "honesty: no bill number leaks in from another record");
// An omnibus with no recorded position has no direction to claim on ANY of its
// issues. (An absent supportMeaning is NOT this case: the engine documents it as the
// safe 'yea_supports' default, so a note over it is still describing a real mapping.)
const VAGUE = {
  kind: "vote", number: "H.R. 9", action: "On Passage", position: null,
  issues: [
    { issueKey: "lower_taxes", weight: 100, isPrimary: true, supportMeaning: "yea_supports" },
    { issueKey: "healthcare", weight: 50, isPrimary: false, supportMeaning: "yea_opposes" },
  ],
};
const vagueNote = P.multiNote(VAGUE, "lower_taxes");
has(vagueNote, "2 issues", "honesty: an undirected omnibus still reports its spread");
ok(!/\bfor\b|\bagainst\b/.test(vagueNote),
  `honesty: no direction is claimed without a recorded vote (got ${JSON.stringify(vagueNote)})`);
// The engine's stated default, pinned here so the note over it is knowingly correct
// rather than accidentally so: a missing supportMeaning reads as 'yea_supports'.
const DEFAULTED = {
  kind: "vote", number: "H.R. 9", action: "On Passage", position: "yea",
  issues: [
    { issueKey: "lower_taxes", weight: 100, isPrimary: true, supportMeaning: null },
    { issueKey: "healthcare", weight: 50, isPrimary: false, supportMeaning: null },
  ],
};
has(P.multiNote(DEFAULTED, "lower_taxes"), "for ",
  "honesty: an absent supportMeaning follows the engine's documented yea_supports default");

// Reading proof must not mutate the record it read.
const before = JSON.stringify(HR1);
P.multiNote(HR1, "lower_taxes"); P.proofText(HR1);
eq(JSON.stringify(HR1), before, "honesty: reading proof never mutates the record");

// ── 6. The data hooks the rows depend on exist in voting-record.js ────────────
// consistency.js reads these through window and degrades to '' without them, so a
// rename would silently empty the proof lines rather than break the build.
const vr = readFileSync(join(ROOT, "voting-record.js"), "utf8");
for (const hook of ["_pdxRecordIssueItems", "_pdxVotingRecordFocusIssue"]) {
  ok(vr.includes(`window.${hook} =`), `hook: voting-record.js still exports window.${hook}`);
}
const cs = readFileSync(join(ROOT, "consistency.js"), "utf8");
for (const hook of ["_pdxRecordIssueItems", "_pdxVotingRecordFocusIssue"]) {
  ok(cs.includes(hook), `hook: consistency.js still reads window.${hook}`);
}

// ── Report ────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`✖ ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  • " + f);
  process.exit(1);
}
console.log(`✓ ${passed} assertions passed — Official Record stance-row proof`);
