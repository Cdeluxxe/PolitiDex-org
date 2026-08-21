#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Entry points from the Official Record section INTO the full Voting Record
// ─────────────────────────────────────────────────────────────────────────────
// The stance rows name the bill behind a verdict, but until now the only way to the
// full record was to expand a row first and find the link inside it. Two additive
// entry points close that gap, and this harness gates both end to end:
//
//   1. the section's summary line — "12 mapped votes across 5 issues · See full
//      record →", counted from the warm cache by window._pdxRecordMappedCounts and
//      worded by PDXConsistency.proof.mappedSummary;
//   2. the proof-line deep link — every named roll call carries the key of the exact
//      card it points at, and the card list labels its cards with the SAME key.
//
// That second point is the one worth a test: the two sides live in different files
// and agree only because both call window._pdxRecordKey. A rename on either side
// would strand every deep link silently — the reader would land on an issue-filtered
// list instead of the vote they tapped, with nothing logged.
//
//   node scripts/test-or-entry.mjs
//
// Loads stance-helpers.js + voting-record.js + consistency.js into one node:vm
// sandbox with a fake DOM, seeds the warm record cache directly (no fetch), and
// renders the real section HTML. No database, no network.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── Fake DOM ────────────────────────────────────────────────────────────────
// getElementById answers for 'pdxsec-voting' so the summary line renders as the
// button it is live; every other lookup misses, which is the state the helpers are
// supposed to degrade through.
const noopEl = () => ({
  style: {}, textContent: "", innerHTML: "", hidden: false, className: "",
  setAttribute() {}, appendChild() {}, focus() {}, scrollIntoView() {},
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
});
const ctx = {
  console, JSON, Math, Date, setTimeout, clearTimeout,
  setInterval: () => 0, clearInterval() {},
  Promise, String, Array, Object, RegExp, parseInt, parseFloat, isNaN,
  encodeURIComponent, decodeURIComponent,
  requestAnimationFrame: (f) => setTimeout(f, 0), fetch: () => new Promise(() => {}),
  location: { href: "/", search: "" }, history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  document: {
    readyState: "complete", head: noopEl(), body: noopEl(), documentElement: noopEl(),
    createElement: noopEl, createTextNode: noopEl,
    getElementById: (id) => (id === "pdxsec-voting" ? noopEl() : null),
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
  },
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; ctx.addEventListener = () => {};

const PID = "rep_x";
ctx.ISSUE_MAP = {
  lower_taxes: { label: "Lower Taxes" },
  healthcare: { label: "Health Care" },
  border_security: { label: "Border Security" },
};
ctx.ISSUE_STANCE_DATA = {
  [PID]: [
    { issueKey: "healthcare", issueStance: "support" },
    { issueKey: "border_security", issueStance: "support" },
  ],
};
ctx.CMP_DATA = { [PID]: {} };

const sandbox = vm.createContext(ctx);
for (const file of ["stance-helpers.js", "voting-record.js", "consistency.js"]) {
  vm.runInContext(readFileSync(join(ROOT, file), "utf8"), sandbox, { filename: file });
}

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (s, sub, m) => ok(String(s).includes(sub), `${m} — missing ${JSON.stringify(sub)}`);
const hasnt = (s, sub, m) => ok(!String(s).includes(sub), `${m} — should not contain ${JSON.stringify(sub)}`);

// ── Warm records ────────────────────────────────────────────────────────────
// Seeded straight into the sync cache the way a completed fetch leaves it. One
// multi-issue bill, one procedural vote whose Yea is inverted, and one record with
// NO issue mapping — that last one is the honesty case for the summary count.
const HR1 = {
  kind: "vote", rollcallId: 11, measureId: 101, number: "H.R. 1", date: "2025-07-03",
  action: "On Passage", position: "yea", isProcedural: false,
  title: "One Big Beautiful Bill Act",
  issues: [
    { issueKey: "lower_taxes", weight: 100, isPrimary: true, supportMeaning: "yea_supports" },
    { issueKey: "healthcare", weight: 60, isPrimary: false, supportMeaning: "yea_opposes" },
  ],
};
const HR22 = {
  kind: "vote", rollcallId: 22, measureId: 122, number: "H.R. 22", date: "2025-05-14",
  action: "On Motion to Recommit", position: "nay", isProcedural: true, advanceInverted: true,
  title: "Border Enforcement Act",
  issues: [
    { issueKey: "border_security", weight: 90, isPrimary: true, supportMeaning: "yea_supports" },
  ],
};
const UNMAPPED = {
  kind: "vote", rollcallId: 33, measureId: 133, number: "H.R. 33", date: "2025-02-01",
  action: "On Agreeing to the Resolution", position: "yea", isProcedural: false,
  title: "A bill we have not mapped to an issue yet", issues: [],
};
ctx.PDXVotingRecord._records[PID] = [HR1, HR22, UNMAPPED];

// ── 1. The counts behind the summary line ───────────────────────────────────
const counts = ctx.window._pdxRecordMappedCounts(PID);
eq(counts.votes, 2, "counts: only records carrying an issue mapping are counted as mapped");
eq(counts.total, 3, "counts: total keeps the unmapped record, so the gap stays visible");
eq(counts.issues, 3, "counts: distinct issues across all mappings");
eq(counts.issueKeys.slice().sort().join(","), "border_security,healthcare,lower_taxes",
  "counts: the issues named are exactly the ones mapped");
eq(ctx.window._pdxRecordMappedCounts("nobody_warm"), null,
  "counts: null when nothing is warm — a surface with no data makes no claim");
eq(JSON.stringify(ctx.PDXVotingRecord._records[PID]), JSON.stringify([HR1, HR22, UNMAPPED]),
  "counts: counting never mutates the cache it counted");

// ── 2. The summary-line copy ────────────────────────────────────────────────
const S = ctx.window.PDXConsistency.proof.mappedSummary;
eq(S({ votes: 12, issues: 5, total: 12 }), "12 mapped votes across 5 issues",
  "copy: the ordinary case reads as one plain sentence");
eq(S({ votes: 7, issues: 1, total: 7 }), "7 mapped votes on 1 issue",
  "copy: one issue reads 'on 1 issue', not 'across 1 issues'");
// Thin records must not borrow the authority of a deep one.
has(S({ votes: 2, issues: 1, total: 2 }), "not enough mapped yet to read a pattern",
  "copy: two votes are labelled thin");
has(S({ votes: 1, issues: 1, total: 1 }), "1 mapped vote on 1 issue",
  "copy: a single vote is singular throughout");
has(S({ votes: 1, issues: 1, total: 1 }), "not enough mapped yet to read a pattern",
  "copy: one vote is labelled thin");
hasnt(S({ votes: 3, issues: 2, total: 3 }), "thin",
  "copy: three votes are not called thin");
eq(S({ votes: 0, issues: 0, total: 4 }), "",
  "copy: no mapped votes → no line at all (never '0 mapped votes')");
eq(S(null), "", "copy: no counts → no line");
// The line may only ever word a count it was handed.
hasnt(S({ votes: 12, issues: 5, total: 40 }), "40",
  "honesty: the headline counts mapped votes, and says nothing else as a total");

// ── 3. Proof line ↔ card: the two sides agree on one key ────────────────────
const key = ctx.window._pdxRecordKey;
ok(typeof key === "function", "key: voting-record.js exports window._pdxRecordKey");
ok(key(HR1) !== key(HR22), "key: two different roll calls get different keys");
eq(key(HR1), key({ ...HR1 }), "key: the same record always keys the same");
eq(key(null), "", "key: no record → empty key, so no link claims a target");
// The card list labels cards with it…
const card = ctx.window._vrCardHtml(HR1, {});
has(card, `data-vr-key="${key(HR1)}"`, "wiring: the record card carries its own key");
// …and the stance row's proof line points at the same string. Rendered through the
// real section, so this breaks if either side stops calling _pdxRecordKey.
const html = ctx.window.PDXConsistency.officialRecordSectionHtml(PID);
has(html, `data-pdxc-vrvote="${key(HR1)}"`,
  "wiring: the proof line deep-links to the exact card key, not just to the issue");
has(html, 'data-pdxc-vrissue="healthcare"',
  "wiring: the proof line also carries its issue, as the documented fallback");
// A row whose whole record is one vote says "open this vote" — and carries that vote's
// key, so the copy and the destination cannot disagree.
has(html, `class="pdxor-vrlink" data-pdxc-vrvote="${key(HR22)}"`,
  "wiring: a single-vote row's link targets that vote, not just its issue");
// The keyboard route to the same card: the opened row's bill number is a real button.
has(html, 'class="pdxor-act-go"',
  "wiring: each mapped vote in the opened row is a focusable button to its card");

// ── 4. The rendered summary line ────────────────────────────────────────────
has(html, "2 mapped votes across 3 issues",
  "render: the section leads with the count of mapped votes it can actually show");
has(html, "not enough mapped yet to read a pattern", "render: and admits how little is mapped");
has(html, "data-pdxc-vrall", "render: the line is the entry point into the whole record");
has(html, "See full record →", "render: with the destination named in the copy");
// Wide enough to matter, small enough to scan: the count line is one line of text.
ok(!/pdxor-mapsum[^>]*>[^<]*<[^>]*>[^<]*(votes|issue)[^<]*<[^>]*>[^<]*(votes|issue)/.test(html),
  "render: the summary line states the count once");

// ── 5. Nothing invented ─────────────────────────────────────────────────────
// The unmapped record is in the member's record but belongs to no issue row, so it
// must not be quoted as proof of anything.
hasnt(html, "H.R. 33", "honesty: a record with no issue mapping is never quoted as proof");
hasnt(html, "3 mapped votes", "honesty: the unmapped record is not counted as mapped");

// ── 6. The fallback chain, and never a dead end ─────────────────────────────
// No live section for this member (nothing hydrated _state) → the focus helpers must
// report failure rather than throw, so consistency.js falls through to its next step.
eq(ctx.window._pdxVotingRecordFocusVote("healthcare", key(HR1)), false,
  "fallback: exact-vote focus returns false when the record section isn't live");
eq(ctx.window._pdxVotingRecordFocusIssue("healthcare"), false,
  "fallback: issue focus returns false the same way");
eq(ctx.window._pdxVotingRecordFocusVote(null, null), false,
  "fallback: missing arguments are a false, not a throw");

// ── 7. Source contracts across the file boundary ────────────────────────────
const vr = readFileSync(join(ROOT, "voting-record.js"), "utf8");
const cs = readFileSync(join(ROOT, "consistency.js"), "utf8");
for (const hook of ["_pdxRecordKey", "_pdxRecordMappedCounts", "_pdxVotingRecordFocusVote",
  "_pdxVotingRecordFocusIssue", "_pdxRecordIssueItems"]) {
  ok(vr.includes(`window.${hook} =`), `hook: voting-record.js still exports window.${hook}`);
  ok(cs.includes(hook), `hook: consistency.js still reads window.${hook}`);
}
// The delegated click handler checks the exact-vote target BEFORE the issue target.
// A proof line carries both; reversing these two lines would silently downgrade every
// deep link to an issue filter, which is the fallback, not the feature.
const iVote = cs.indexOf("data-pdxc-vrvote]");
const iIssue = cs.indexOf("data-pdxc-vrissue]");
ok(iVote > -1 && iIssue > -1 && iVote < iIssue,
  "gateway: the exact-vote branch is checked before the issue branch");
// The ring is applied from the paint, not from a timer.
has(vr, "focusPendingVote", "focus: the pending-focus consumer exists");
ok(vr.indexOf("focusPendingVote(true)") < vr.indexOf("function focusPendingVote"),
  "focus: renderBody consumes the pending focus at the end of the paint");
// The landed-on card is marked in the markup and styled for it — a rename on either
// side would leave the deep link scrolling to an unmarked card.
has(vr, "' vr-card-focus'", "focus: the landed-on card is marked in the DOM");
has(vr, ".vr-card-focus{", "focus: and the mark has a style to show for it");
// Matching iterates over the cards rather than building an attribute selector, so a
// roll-call question containing a quote cannot break the lookup.
has(vr, "querySelectorAll('#pdx-vr-list [data-vr-key]')",
  "focus: cards are matched by iteration, not by an interpolated selector");

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`✖ ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  • " + f);
  process.exit(1);
}
console.log(`✓ ${passed} assertions passed — Official Record → Voting Record entry points`);
