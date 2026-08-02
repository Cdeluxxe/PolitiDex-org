#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// ✒️ Executive Enactment Record — Phase 2: the count summary tells the truth
// ─────────────────────────────────────────────────────────────────────────────
// The EER carries no score, so the count summary occupies the slot where the 🏛️ lane
// prints a percentage. That makes it the most load-bearing sentence in the lane and
// the easiest place to become quietly dishonest — every failure mode below is one
// where the individual numbers stay correct and the reader is still misled:
//
//   • folding "no action found" into "acted against" turns absent coverage into a
//     finding, and the app cannot prove a negative over an unbounded action space;
//   • adding an issue-unit count to a document-unit count invents a denominator, and
//     the two totals look interchangeable if you do not know one action can touch
//     several issues;
//   • dropping the standing clause makes a blocked record read as operative;
//   • counting only the curated headline issues hides the fact that signing an
//     omnibus cut against one of its own mapped issues;
//   • a graded adjective ("mostly acted on it") is a percentage wearing a word and
//     passes every numeric check.
//
// So this harness drives the SHIPPED functions with fixtures and asserts on the
// generated output, not on the templates. execSummaryText / execSummaryTip are pure
// and DOM-free precisely so this is possible.
//
//   node scripts/test-exec-summary.mjs
//
// No database, no network, no DOM. Exit code is non-zero on the first failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SUMKEYS = JSON.parse(readFileSync(join(ROOT, "db/exec-summary-keys.json"), "utf8"));
const FORBIDDEN = new RegExp(SUMKEYS.forbidden.pattern, SUMKEYS.forbidden.flags);

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

// ── Sandbox ──────────────────────────────────────────────────────────────────
const ctx = { console, JSON, Math, Date, setTimeout, clearTimeout };
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
vm.runInContext(readFileSync(join(ROOT, "exec-record.js"), "utf8"),
  vm.createContext(ctx), { filename: "exec-record.js" });
const EX = ctx.window.PDXExecRecord;
if (!EX) { console.error("✗ fatal: exec-record.js exposed no PDXExecRecord"); process.exit(1); }

// Stand in for the app's ONE shared stance source, with the real value vocabulary
// (support | oppose | mixed) that stance-helpers.js's _polPositionMap emits.
function setStances(map) {
  ctx.window.CMP_DATA = { trump: {} };
  ctx.window._polPositionMap = () => {
    const out = {};
    for (const [k, v] of Object.entries(map)) out[k] = { stance: v };
    return out;
  };
}
const setActions = (list) => { ctx.window.EXEC_ACTIONS = { trump: list }; };

const FR = (n) => `https://www.federalregister.gov/documents/2025/01/0${n}/x-${n}`;
const CG = (n) => `https://www.congress.gov/bill/119th-congress/house-bill/${n}`;
const RULING = "https://www.supremecourt.gov/opinions/25pdf/24-1287_4gcj.pdf";
const st = (status, effectiveAt, url = RULING) =>
  ({ status, effectiveAt, sourceUrl: url, sourceLabel: "Court", authority: "A named court" });

// ═════════════════════════════════════════════════════════════════════════════
// Fixture A — the main shape: an omnibus, two orders, a directive, one dropped
// item, and one action from an earlier term.
// ═════════════════════════════════════════════════════════════════════════════
setStances({
  lower_taxes: "support", healthcare: "support", energy_production: "support",
  voter_id: "support", deportations: "support", cut_spending: "support",
  end_dei: "mixed", // non-directional: gives an action nothing to be checked against
});
setActions([
  // One signature, two issues, opposite directions — the omnibus disclosure.
  { actionClass: "signed_law", documentId: "H.R. 1", title: "Reconciliation", actedAt: "2025-07-04", term: "47",
    sourceUrl: CG(1), sourceLabel: "congress.gov",
    issues: [{ issueKey: "lower_taxes", direction: "advances", isPrimary: true },
             { issueKey: "healthcare", direction: "opposes" }],
    status: [st("in_force", "2025-07-04", CG(1))] },
  { actionClass: "executive_order", documentId: "EO 14154", title: "Energy", actedAt: "2025-01-20", term: "47",
    sourceUrl: FR(2), sourceLabel: "Federal Register",
    issues: [{ issueKey: "energy_production", direction: "advances" },
             { issueKey: "end_dei", direction: "advances" }],
    status: [st("in_force", "2025-01-20", FR(2))] },
  // Signed, then blocked — the later status must win.
  { actionClass: "executive_order", documentId: "EO 14248", title: "Elections", actedAt: "2025-03-25", term: "47",
    sourceUrl: FR(3), sourceLabel: "Federal Register",
    issues: [{ issueKey: "voter_id", direction: "advances" }],
    status: [st("in_force", "2025-03-25", FR(3)), st("blocked", "2025-06-01")] },
  // No citable standing — must NOT be assumed in force.
  { actionClass: "directive", documentId: "MEMO 1", title: "Spending", actedAt: "2025-02-01", term: "47",
    sourceUrl: FR(4), sourceLabel: "Federal Register",
    issues: [{ issueKey: "cut_spending", direction: "advances" }],
    status: [] },
  // Dropped by the source rule: a directory index, not a document.
  { actionClass: "executive_order", documentId: "EO ???", title: "Unsourced", actedAt: "2025-04-01", term: "47",
    sourceUrl: "https://www.whitehouse.gov/presidential-actions/", sourceLabel: "White House",
    issues: [{ issueKey: "tariffs_growth", direction: "advances" }],
    status: [st("in_force", "2025-04-01", FR(9))] },
  // Earlier term: excluded by the default scope, present in the all-time figure.
  { actionClass: "signed_law", documentId: "OLD 1", title: "First term", actedAt: "2018-01-01", term: "45",
    sourceUrl: CG(2), sourceLabel: "congress.gov",
    issues: [{ issueKey: "lower_taxes", direction: "advances" }],
    status: [st("in_force", "2018-01-01", CG(2))] },
]);

const A = EX.summary("trump");
ok(!!A, "execSummary returned null for a well-formed fixture (an invariant tripped)");

// ── 1 · score is structurally null ───────────────────────────────────────────
eq(A.score, null, "execSummary published a score");
eq(EX.issue("trump", "lower_taxes").score, null, "executiveIssue published a score");
for (const k of ["energy_production", "healthcare", "deportations", "end_dei"]) {
  eq(EX.issue("trump", k).score, null, `executiveIssue(${k}) published a score`);
}
ok(!("percent" in A) && !("pct" in A), "the summary object carries a percentage field");

// ── 2 · the counts are right, and the two units stay apart ───────────────────
eq(A.issues.aligned, 4, "aligned count");            // lower_taxes, energy_production, voter_id, cut_spending
eq(A.issues.against, 1, "against count");            // healthcare, via the omnibus
eq(A.issues.bothWays, 0, "bothWays count");
eq(A.issues.noActionFound, 1, "noActionFound count"); // deportations: stated, nothing on file
eq(A.issues.noStance, 1, "noStance count");           // end_dei: stance 'mixed' is not directional
eq(A.issues.total, 7, "issue total");

eq(A.actions.inForce, 2, "inForce count");
eq(A.actions.blocked, 1, "blocked count");
eq(A.actions.struckDown, 0, "struckDown count");
eq(A.actions.total, 3, "action total (documents with a citable standing)");
eq(A.unstatedStanding, 1, "an action with no citable standing must be disclosed, not assumed");

eq(A.byClass.signed_law, 1, "signed_law count");
eq(A.byClass.executive_order, 2, "executive_order count");
eq(A.byClass.directive, 1, "directive count");
// Shared authorship and sole authorship are never merged into one headline figure.
ok(A.byClass.signed_law + A.byClass.executive_order !== undefined && !("actionsTotalMerged" in A),
  "the summary exposes a merged action figure that flattens shared and sole authorship");

// THE UNIT TRAP: one signature touched two issues, so the totals are different
// numbers over different denominators and must never be added.
ok(A.issues.total !== A.actions.total,
  "fixture is too weak to prove the unit separation — issue and document totals coincide");
eq(SUMKEYS.buckets.issues.unit === SUMKEYS.buckets.actions.unit, false,
  "issue and action buckets share a unit");

// ── 3 · invariants ───────────────────────────────────────────────────────────
eq(A.issues.aligned + A.issues.against + A.issues.bothWays + A.issues.noActionFound + A.issues.noStance,
  A.issues.total, "invariant 1: issue buckets do not sum to the issue total");
eq(A.actions.inForce + A.actions.partlyBlocked + A.actions.blocked + A.actions.struckDown +
   A.actions.rescinded + A.actions.superseded + A.actions.expired,
  A.actions.total, "invariant 2: standing buckets do not sum to the action total");
eq(A.byClass.signed_law + A.byClass.vetoed_law + A.byClass.executive_order + A.byClass.directive,
  A.actions.total + A.unstatedStanding, "invariant 3: class counts do not sum to the actions on file");

// ── 4 · noActionFound is coverage, never folded into against ─────────────────
// Prove it behaviourally: remove every action and the stated positions must land in
// noActionFound with `against` still at zero.
setActions([]);
eq(EX.summary("trump"), null, "a figure with no actions on file must yield no summary at all");
setActions([{ actionClass: "executive_order", documentId: "EO 1", title: "Only one", actedAt: "2025-01-01",
  term: "47", sourceUrl: FR(5), sourceLabel: "Federal Register",
  issues: [{ issueKey: "energy_production", direction: "advances" }],
  status: [st("in_force", "2025-01-01", FR(5))] }]);
const B = EX.summary("trump");
ok(!!B, "one-action fixture yielded no summary");
eq(B.issues.against, 0, "against must be 0 when nothing on file cuts against a stated position");
// Six, not five: end_dei's stance is 'mixed', which is still a STATED POSITION with
// nothing on file, so it is coverage too. The bucket it must not fall into is
// noStance — that one means "an action is on file and there is no directional
// position to check it against", which is a different gap and a different sentence.
eq(B.issues.noActionFound, 6, "the other stated positions must land in noActionFound");
eq(B.issues.noStance, 0, "a stated position with no action on file was filed as noStance");
ok(/no action found/i.test(B.label), "the label does not report the coverage gap");
ok(!/fail|failed|refus|declin|broke/i.test(B.label),
  `the coverage gap is worded as a finding rather than as coverage: ${B.label}`);
ok(/coverage, not a finding/i.test(EX.summaryTip(B)),
  "the tip does not explain that 'no action found' is coverage");

// ── 5 · thin record ──────────────────────────────────────────────────────────
eq(B.thin, true, "a one-action record is not flagged thin");
ok(/thin record/.test(B.label), `a one-action label omits the thinness caveat: ${B.label}`);
ok(/1 across/.test(B.label), `singular action count is wrong: ${B.label}`);

// ── 6 · standing stays visible whenever anything is contested ────────────────
setStances({ voter_id: "support" });
// Driven from the shipped contested flags rather than a written-out list, so a token
// added to the vocabulary is covered here the moment it lands instead of the next
// time someone remembers this loop exists.
const CONTESTED = Object.values(EX.STANDING).filter((s) => s.contested).map((s) => s.key);
ok(CONTESTED.length >= 5, `expected the contested vocabulary to have grown, got ${CONTESTED.join(", ")}`);
for (const contested of CONTESTED) {
  setActions([{ actionClass: "executive_order", documentId: "EO X", title: "T", actedAt: "2025-01-01",
    term: "47", sourceUrl: FR(6), sourceLabel: "Federal Register",
    issues: [{ issueKey: "voter_id", direction: "advances" }],
    status: [st("in_force", "2025-01-01", FR(6)), st(contested, "2025-09-09")] }]);
  const C = EX.summary("trump");
  ok(!!C && C.contested === true, `${contested} did not set the contested flag`);
  ok(/Standing:/.test(C.label), `${contested}: the standing clause is missing from the label`);
  const label = EX.STANDING[contested].label.toLowerCase();
  ok(C.label.toLowerCase().includes(label),
    `${contested}: the label does not name the standing (${label}) — a blocked record reads as operative`);
  // …and it must never be presentable as alignment alone.
  ok(C.label.indexOf("Standing:") > C.label.indexOf("acted on it"),
    `${contested}: standing must follow, not replace, the alignment clause`);
  // Nothing contested may be counted as in force. Obvious, and the whole reason the
  // newest token exists: the alternative filing for a live challenge WAS `in_force`.
  eq(C.actions.inForce, 0, `${contested}: a contested action was also counted in force`);
}

// ── 6b · challenged_unverified says the challenge is open, not that it won ───
// The token's job is to be weaker than both neighbours. It must not read as a court
// having blocked the action, and it must not let the action be counted as unimpeded.
setActions([
  { actionClass: "executive_order", documentId: "EO CH", title: "Challenged", actedAt: "2025-01-01", term: "47",
    sourceUrl: FR(6), sourceLabel: "Federal Register",
    issues: [{ issueKey: "voter_id", direction: "advances" }],
    status: [st("in_force", "2025-01-01", FR(6)), st("challenged_unverified", "2026-01-30")] },
  { actionClass: "executive_order", documentId: "EO OK", title: "Unchallenged", actedAt: "2025-01-02", term: "47",
    sourceUrl: FR(7), sourceLabel: "Federal Register",
    issues: [{ issueKey: "energy_production", direction: "advances" }],
    status: [st("in_force", "2025-01-02", FR(7))] },
]);
const CH = EX.summary("trump");
ok(!!CH, "the challenged fixture yielded no summary — an Axis B bucket is missing from the invariant");
eq(CH.actions.challengedUnverified, 1, "challenged_unverified did not reach its own bucket");
eq(CH.actions.inForce, 1, "the challenged action was folded in with the unchallenged one");
eq(CH.actions.blocked + CH.actions.partlyBlocked + CH.actions.struckDown, 0,
  "a pending challenge was counted as a court having acted");
eq(CH.actions.total, 2, "Axis B total does not include the challenged action");
ok(/no ruling on file/i.test(CH.label),
  `the label states the challenge without its limit: ${CH.label}`);
ok(!/blocked|struck/i.test(CH.label),
  `the label reports a pending challenge in the language of a ruling: ${CH.label}`);
// Issue level: the challenged action's issue must not present as settled, and the
// unchallenged one must not be dragged into the challenge.
eq(EX.issue("trump", "voter_id").standing.key, "challenged_unverified",
  "an issue whose only action is challenged presented as something else");
eq(EX.issue("trump", "energy_production").standing.key, "in_force",
  "a challenge on one action leaked into an unrelated issue's standing");
// And a ruling on the same action still outranks it — the token yields to evidence.
setActions([{ actionClass: "executive_order", documentId: "EO CH", title: "Challenged", actedAt: "2025-01-01",
  term: "47", sourceUrl: FR(6), sourceLabel: "Federal Register",
  issues: [{ issueKey: "voter_id", direction: "advances" }],
  status: [st("challenged_unverified", "2026-01-30"), st("partly_blocked", "2026-03-01")] }]);
eq(EX.summary("trump").actions.partlyBlocked, 1,
  "a later ruling did not supersede the pending-challenge row — the log must yield to evidence");
eq(EX.summary("trump").actions.challengedUnverified, 0,
  "the superseded pending-challenge row was still counted");

// ── 7 · latest status wins, and an uncitable status is not a standing ────────
setActions([{ actionClass: "executive_order", documentId: "EO Y", title: "T", actedAt: "2025-01-01",
  term: "47", sourceUrl: FR(7), sourceLabel: "Federal Register",
  issues: [{ issueKey: "voter_id", direction: "advances" }],
  status: [st("struck_down", "2026-02-01"), st("in_force", "2025-01-01", FR(7))] }]);
eq(EX.summary("trump").actions.struckDown, 1, "the latest status by effective_at did not win");
setActions([{ actionClass: "executive_order", documentId: "EO Z", title: "T", actedAt: "2025-01-01",
  term: "47", sourceUrl: FR(8), sourceLabel: "Federal Register",
  issues: [{ issueKey: "voter_id", direction: "advances" }],
  status: [{ status: "in_force", effectiveAt: "2025-01-01", sourceUrl: "https://www.whitehouse.gov/fact-sheets/x", sourceLabel: "WH" }] }]);
const D = EX.summary("trump");
eq(D.actions.inForce, 0, "an unsourced status was counted as a standing");
eq(D.unstatedStanding, 1, "an unsourced status must be disclosed as no confirmed standing");
ok(/no confirmed standing/i.test(D.label), "the label hides an action with no confirmed standing");

// ── 8 · both-ways ────────────────────────────────────────────────────────────
setStances({ energy_production: "support" });
setActions([
  { actionClass: "executive_order", documentId: "EO A", title: "T", actedAt: "2025-01-01", term: "47",
    sourceUrl: FR(1), sourceLabel: "Federal Register",
    issues: [{ issueKey: "energy_production", direction: "advances" }], status: [st("in_force", "2025-01-01", FR(1))] },
  { actionClass: "executive_order", documentId: "EO B", title: "T", actedAt: "2025-02-01", term: "47",
    sourceUrl: FR(2), sourceLabel: "Federal Register",
    issues: [{ issueKey: "energy_production", direction: "opposes" }], status: [st("in_force", "2025-02-01", FR(2))] },
]);
const E = EX.summary("trump");
eq(E.issues.bothWays, 1, "opposing actions on one issue did not produce bothWays");
eq(E.issues.aligned, 0, "bothWays was double-counted into aligned");
eq(E.issues.against, 0, "bothWays was double-counted into against");
eq(EX.issue("trump", "energy_production").token, "acted_both_ways", "per-issue token for both-ways");

// An 'oppose' stance inverts the reading — an action that opposes an issue the figure
// opposes is alignment, not a contradiction.
setStances({ energy_production: "oppose" });
setActions([{ actionClass: "executive_order", documentId: "EO C", title: "T", actedAt: "2025-01-01", term: "47",
  sourceUrl: FR(1), sourceLabel: "Federal Register",
  issues: [{ issueKey: "energy_production", direction: "opposes" }], status: [st("in_force", "2025-01-01", FR(1))] }]);
eq(EX.issue("trump", "energy_production").token, "acted_on_it",
  "an oppose stance met by an opposing action must read as alignment");

// ── 9 · term scope ───────────────────────────────────────────────────────────
setStances({ lower_taxes: "support" });
setActions([
  { actionClass: "signed_law", documentId: "NEW", title: "T", actedAt: "2025-01-01", term: "47",
    sourceUrl: CG(1), sourceLabel: "congress.gov",
    issues: [{ issueKey: "lower_taxes", direction: "advances" }], status: [st("in_force", "2025-01-01", CG(1))] },
  { actionClass: "signed_law", documentId: "OLD", title: "T", actedAt: "2018-01-01", term: "45",
    sourceUrl: CG(2), sourceLabel: "congress.gov",
    issues: [{ issueKey: "lower_taxes", direction: "advances" }], status: [st("in_force", "2018-01-01", CG(2))] },
]);
const cur = EX.summary("trump");
const all = EX.summary("trump", { allTerms: true });
eq(cur.termScope, "current_term", "the default summary scope is not the current term");
eq(cur.actions.total, 1, "the current-term summary included an earlier term");
eq(all.termScope, "all_time", "allTerms did not switch the scope");
eq(all.actions.total, 2, "the all-terms summary dropped an earlier term");
eq(cur.allTimeTotal, 2, "the current-term summary does not carry the all-time figure for the tip");
ok(/all terms/i.test(EX.summaryTip(cur)), "the tip does not offer the all-time figure");

// ── 10 · the generated copy obeys every language rule ────────────────────────
const generated = [];
for (const s of [A, B, D, E, cur, all]) {
  if (!s) continue;
  generated.push(["label", s.label], ["label(fn)", EX.summaryText(s)], ["tip", EX.summaryTip(s)]);
}
ok(generated.length >= 15, "too few generated strings to gate the language rules");
for (const [what, s] of generated) {
  ok(!s.includes("%"), `${what} contains a percentage: ${s}`);
  const m = s.match(FORBIDDEN);
  ok(!m, `${what} uses forbidden vocabulary ${m ? JSON.stringify(m[0]) : ""}: ${s}`);
  ok(!/\b\d+\s*(of|\/)\s*\d+\b/.test(s), `${what} renders a bare fraction: ${s}`);
}
// The framing clause LEADS every non-empty label — asserted as a prefix, so a count
// interpolated in front of it cannot quietly break the lead-in.
for (const s of [A, B, D, E, cur, all]) {
  if (!s || !s.label) continue;
  ok(s.label.startsWith(EX.FRAMING), `a label does not lead with the framing clause: ${s.label}`);
}
// The tip must state the unit rule, since that is the misreading the summary is
// most exposed to.
ok(/never added together/i.test(EX.summaryTip(A)), "the tip does not state the unit-separation rule");
ok(/No percentage is shown/i.test(EX.summaryTip(A)), "the tip does not explain the absence of a score");

// ── 11 · empty and fail-closed cases ─────────────────────────────────────────
eq(EX.summaryText(null), "", "summaryText(null) is not empty");
eq(EX.summaryText({ actions: { total: 0 }, issues: { total: 0 }, unstatedStanding: 0 }), "",
  "an empty summary manufactures a sentence instead of deferring to the panel's empty state");
setActions([]);
eq(EX.summary("trump"), null, "nothing on file must yield null, not a zeroed summary");
eq(EX.summary("marie_gluesenkamp_perez"), null, "a sitting member of Congress got an executive summary");
eq(EX.summary("not_a_real_pid"), null, "an unknown pid got a summary — the gate must fail closed");
eq(EX.issue("not_a_real_pid", "lower_taxes").token, "no_record", "an unknown pid got a verdict");
// The source rule drops bad citations AND discloses the drop.
setStances({ lower_taxes: "support" });
setActions([
  { actionClass: "signed_law", documentId: "OK", title: "T", actedAt: "2025-01-01", term: "47",
    sourceUrl: CG(1), sourceLabel: "congress.gov",
    issues: [{ issueKey: "lower_taxes", direction: "advances" }], status: [st("in_force", "2025-01-01", CG(1))] },
  { actionClass: "signed_law", documentId: "BAD", title: "T", actedAt: "2025-01-02", term: "47",
    sourceUrl: "https://www.congress.gov/", sourceLabel: "congress.gov",
    issues: [{ issueKey: "lower_taxes", direction: "advances" }], status: [st("in_force", "2025-01-02", CG(1))] },
]);
const F = EX.summary("trump");
eq(F.actions.total, 1, "an action citing a bare host root was counted");
eq(F.dropped, 1, "the dropped action was not disclosed");
ok(/held back/i.test(EX.summaryTip(F)),
  "the tip hides the held-back item — a filter that hides its own exclusions makes a partial record look complete");

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`✗ exec summary: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`✓ ${passed} assertions passed — ✒️ EER count summary (no score, two units, coverage never a finding)`);
