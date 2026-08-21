#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-profile-header-stack.mjs — score + shape + depth, before the first scroll
// ─────────────────────────────────────────────────────────────────────────────
// The top of a profile used to lead with one thing: the Word vs Action ring. The
// signals that tell a reader how much to trust that figure — what shape the
// average came out of, and how much record is behind it — existed, and both were
// a scroll away inside ⚖️ Word vs Action and the Official Record. On a president
// with eighty documents on file and on a member with twelve mapped votes, the
// letterhead looked identical.
//
// The header now closes that in three parts, and this file pins the third:
//
//   · THE RING says how much of their word the record backs up, and how much of
//     it was tested. Shipped; one percentage per profile, and still one.
//   · THE TALLY says what shape that average came out of — four counts, each a
//     door into its bucket. Shipped; pinned by test-issue-index.mjs.
//   · THE STACK TAIL, added here, says HOW MUCH RECORD is behind both of them and
//     — only where a term scope is a real distinction — which span the figure
//     covers.
//
// What must hold, and is pinned below:
//
//   1. THE WORDS ARE THE SECTION'S WORDS. Neither line is authored in the header.
//      The member lane prints _pdxMappedSummaryText over _pdxRecordMappedCounts,
//      which is the Official Record's own entry line; the executive lane prints
//      PDXExecRecord.volumeText, which is the first clause of the label rendered
//      below. Byte-equality, both lanes — not "looks similar".
//   2. EXACTLY ONE HEADLINE PERCENTAGE. Counted across the whole assembled
//      header, not asserted per block.
//   3. NO SECOND GATEWAY. The tail is display-only: no control, no handler, no
//      bucket attribute. The four counts stay the header's only doors.
//   4. FAIL CLOSED. Nothing warm → an empty host and no chrome. Two mapped votes
//      → the count arrives with its own thinness caveat. No term scope → no scope
//      note, because a member's roll-call record is not term-filtered anywhere in
//      this engine and "all terms" would name a distinction that does not exist.
//   5. THE HARD WALLS. No party framing, no public-lane counts, no inferred
//      stance, no percentage anywhere in the tail.
//   6. IT FILLS WHEN THE RECORD LANDS. The header is built off the synchronous
//      word ledger while the roll-call cache is still in flight, so the repaint
//      is the whole reason the host is emitted empty rather than skipped.
//
//   node scripts/test-profile-header-stack.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, votes seeded the
// way a completed /api/voting-record fetch leaves the cache. No database, no
// network, no browser.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const FILES = [
  "cmp-data.js",
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  "stance-helpers.js",
  "alignment-tool.js",
  "acct-spotlight-data.js",
  "say-vs-do.js",
  "exec-action-data.js",
  "exec-record.js",
  "exec-record-ui.js",
  "consistency.js",
  "voting-record.js",
  "word-action.js",
  "profile-spine.js",
];

const SRC = FILES.map((f) => [f, R(f)]);
function boot() {
  const win = makeSandbox();
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const [f, src] of SRC) vm.runInContext(src, sandbox, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
}

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (hay, needle, msg) =>
  ok(String(hay).includes(needle), `${msg} — ${JSON.stringify(needle)} missing`);
const lacks = (hay, needle, msg) =>
  ok(!String(hay).includes(needle), `${msg} — ${JSON.stringify(needle)} present`);
const section = (t) => console.log(`  · ${t}`);
// A probe whose target moved makes every assertion resting on it vacuously true.
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`✗ profile header stack: STALE HARNESS — ${msg}`);
  process.exit(2);
};

const text = (html) => String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const EXEC = "trump";
const MEMBER = "bennie_thompson";        // a federal member, votes seeded below
const THIN = "sherrod_brown";            // the same, with two mapped votes only
const COLD = "clint_painter_juab";       // stated positions, nothing warm at all

// ── The fixture ──────────────────────────────────────────────────────────────
// Issue keys come off the real map rather than being named, so a data change
// vacates the case loudly instead of quietly.
const win = boot();
const WA = win.PDXWordAction;
const ER = win.PDXExecRecord;
must(WA && ER, "word-action.js or exec-record.js did not load in the sandbox");
must(typeof WA.headerStackMount === "function" && typeof WA.headerStackHtml === "function",
  "PDXWordAction no longer publishes headerStackMount/headerStackHtml, so the profile builder has\n" +
  "    nothing to mount and every assertion here is vacuous");
must(typeof WA.headerTallyHtml === "function" && typeof WA.heroMount === "function",
  "the ring or the letterhead tally is gone from PDXWordAction");
must(typeof win._pdxRecordMappedCounts === "function" && typeof win._pdxMappedSummaryText === "function",
  "the mapped-count reader or the Official Record's entry-line builder is not published on window");
must(typeof ER.volumeText === "function" && typeof ER.summary === "function",
  "PDXExecRecord no longer publishes the volume clause its label is built from");

const ISSUE_KEYS = Object.keys(win.ISSUE_MAP || {}).filter((k) => !/_balance$/.test(k));
must(ISSUE_KEYS.length >= 6, "the issue map no longer offers six non-balance keys to seed against");

let seq = 0;
const vote = (issueKey, position) => {
  seq += 1;
  return {
    kind: "vote", rollcallId: 4000 + seq, measureId: 6000 + seq, number: "H.R. " + seq,
    date: "2025-0" + ((seq % 9) + 1) + "-12", action: "On Passage", position: position,
    isProcedural: false, title: "Measure " + seq,
    source: { url: "https://www.congress.gov/roll-call-vote/" + (4000 + seq), label: "Congress.gov" },
    issues: [{ issueKey: issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
  };
};
// A real file: 24 mapped votes across six issues, plus one record with no issue
// mapping at all — the gap the tooltip has to disclose rather than absorb.
const DEEP_SEED = [];
for (const k of ISSUE_KEYS.slice(0, 6)) {
  for (let i = 0; i < 4; i++) DEEP_SEED.push(vote(k, i < 3 ? "yea" : "nay"));
}
DEEP_SEED.push({
  kind: "vote", rollcallId: 4999, measureId: 6999, number: "H.R. 999", date: "2025-04-02",
  action: "On Passage", position: "yea", isProcedural: false, title: "Unmapped measure",
  source: { url: "https://www.congress.gov/roll-call-vote/4999", label: "Congress.gov" },
  issues: [],
});
// Two mapped votes. One or two cannot carry a pattern, and the shipped builder
// says so — the header must carry that caveat rather than the bare count.
const THIN_SEED = [vote(ISSUE_KEYS[0], "yea"), vote(ISSUE_KEYS[1], "nay")];

win.PDXVotingRecord.noteMember(MEMBER, DEEP_SEED);
win.PDXVotingRecord.noteMember(THIN, THIN_SEED);

const mCounts = win._pdxRecordMappedCounts(MEMBER);
must(mCounts && mCounts.votes === 24 && mCounts.issues === 6 && mCounts.total === 25,
  `the seeded member file did not land as 24 mapped votes across 6 issues (got ${JSON.stringify(mCounts)})`);
const xSum = ER.summary(EXEC, { allTerms: true });
must(xSum && xSum.actions && xSum.actions.total > 0,
  "the executive fixture has no formal actions on file, so the exec lane's depth line has nothing to say");

const M_STACK = WA.headerStackHtml(MEMBER);
const X_STACK = WA.headerStackHtml(EXEC);
const T_STACK = WA.headerStackHtml(THIN);
must(M_STACK.length > 0 && X_STACK.length > 0,
  "the header stack renders nothing on a member with 24 mapped votes or on a president with a file");

// ═════════════════════════════════════════════════════════════════════════════
// 1 · the words are the section's words, not the header's
// ═════════════════════════════════════════════════════════════════════════════
section("1 · one builder per lane — the header cannot describe our file in its own words");

const M_LINE = win._pdxMappedSummaryText(mCounts);
has(M_STACK, ">" + M_LINE + "<",
  "member: the letterhead's depth line is not the Official Record's own entry-line sentence. Two\n" +
  "    builders over one warm cache is how the top of a profile comes to describe the file\n" +
  `    differently from the section it summarises (expected ${JSON.stringify(M_LINE)})`);
has(M_STACK, "24 mapped votes across 6 issues",
  "member: the depth line does not state the volume of the record in the shipped vocabulary");
// The count is the FORMAL mapped count, not the size of the full list — the tooltip
// carries the unmapped remainder rather than the line absorbing it.
eq((/(\d+) mapped vote/.exec(text(M_STACK)) || [])[1], String(mCounts.votes),
  "member: the depth line's figure is not the formal mapped count the rows are built from");
has(M_STACK, "1 further record is in the full list with no issue mapping yet",
  "member: the line counts 24 of 25 records and does not disclose the one it left out — a filter\n" +
  "    that hides its own exclusions makes a partial file look complete");

const X_LINE = ER.volumeText(xSum);
has(X_STACK, ">" + X_LINE + "<",
  "exec: the letterhead's depth line is not PDXExecRecord's own volume clause");
ok(ER.summaryText(xSum).startsWith(X_LINE),
  "exec: the header's depth line is no longer the opening clause of the label rendered below it —\n" +
  "    the two are separate sentences now and can drift apart");
has(X_STACK, ER.FRAMING,
  "exec: the depth line drops the framing clause. Without it a count of our file reads as the\n" +
  "    figure's complete output, which is misleading by omission even when every number is right");
has(text(X_STACK), String(xSum.actions.total + (xSum.unstatedStanding || 0)),
  "exec: the depth line does not state how many formal actions are on file");

// ALL TERMS, because the figure it sits under is the all-time read. A current-term
// denominator under an all-time percentage is the mismatch the scope note exists to
// prevent, not to introduce.
const X_CURRENT = ER.volumeText(ER.summary(EXEC, { allTerms: false }));
if (X_CURRENT && X_CURRENT !== X_LINE) {
  lacks(X_STACK, X_CURRENT,
    "exec: the depth line counts the current term only, under a percentage that covers every term");
} else {
  section("   (this figure's current-term file equals its all-time file — no contrast to assert)");
}

// ═════════════════════════════════════════════════════════════════════════════
// 2 · exactly one headline percentage, counted across the whole header
// ═════════════════════════════════════════════════════════════════════════════
section("2 · one integrity percentage in the letterhead, and it is the ring");

for (const [who, pid] of [["exec", EXEC], ["member", MEMBER]]) {
  const p = win.CMP_DATA[pid];
  must(p, `${who}: ${pid} is not in CMP_DATA`);
  // The letterhead as the reader meets it: ring, then the four counts, then the tail.
  const header = WA.heroMount(pid, p, {}) + WA.headerTallyMount(pid) + WA.headerStackMount(pid);
  const pcts = text(header).match(/\d+\s*%/g) || [];
  eq(pcts.length, 1,
    `${who}: the letterhead prints ${pcts.length} percentages (${JSON.stringify(pcts)}). One profile,\n` +
    "    one integrity figure — a second number above the fold is two findings a reader has to\n" +
    "    reconcile before they have read anything");
  const ring = WA.heroRead(pid, p);
  eq(pcts[0].replace(/\s+/g, ""), ring.pct + "%",
    `${who}: the one percentage in the letterhead is not the ring's Direction Match read`);
}
for (const [who, stack] of [["exec", X_STACK], ["member", M_STACK], ["thin", T_STACK]]) {
  eq((text(stack).match(/%/g) || []).length, 0,
    `${who}: a percent sign appears in the header stack's tail — it sits inches under the ring and\n` +
    "    there is one score on a profile");
  lacks(text(stack).toLowerCase(), "direction match",
    `${who}: the tail restates the metric name, which turns a context line into a second headline`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 3 · display-only — the four counts stay the header's only gateway
// ═════════════════════════════════════════════════════════════════════════════
section("3 · no second navigation system in this pass");

for (const [who, stack] of [["exec", X_STACK], ["member", M_STACK]]) {
  for (const probe of ["<button", "<a ", "onclick", "role=\"button\"", "tabindex",
                       "data-pdxwa-seg", "data-pdxwa-gate", "data-pdxwa-outside", "data-pdxst-open"]) {
    lacks(stack, probe,
      `${who}: the depth tail carries ${JSON.stringify(probe)} — it is a display-only mirror, and the\n` +
      "    counts above it are the header's one set of doors");
  }
}
// …and the doors themselves are untouched: one per bucket, still gated, still
// pointed at the index below. Five since Phase 4 admitted the record-only pile,
// and the number is read off the published vocabulary rather than hard-coded, so
// a sixth bucket cannot slip in without a door.
const TALLY = WA.headerTallyHtml(MEMBER);
eq((TALLY.match(/data-pdxwa-gate="header"/g) || []).length, WA.OUTCOMES.length,
  "header: the counts are no longer one gated gateway per bucket, as they were before this pass");
eq((WA.headerStackMount(MEMBER).match(/<button/g) || []).length, 0,
  "header: the mounted tail introduces a control of its own");

// ═════════════════════════════════════════════════════════════════════════════
// 4 · fail closed — nothing invented above the fold
// ═════════════════════════════════════════════════════════════════════════════
section("4 · no fake completeness: blanks over guesses, caveats over bare counts");

eq(WA.headerStackHtml(COLD), "",
  "cold: a profile with nothing warm still gets a depth line. There is no record to size, and an\n" +
  "    empty frame under a name reads as something withheld");
const COLD_MOUNT = WA.headerStackMount(COLD);
has(COLD_MOUNT, 'class="pdxwa-hstack-host"',
  "cold: the mount emits no host, so the repaint when the record lands has nowhere to go");
ok(/data-pdxwa-hstack="[^"]+"><\/div>$/.test(COLD_MOUNT.trim()),
  "cold: the host below the floor is not empty — anything inside it is chrome asserting a record\n" +
  "    we do not hold");

has(T_STACK, "not enough mapped yet to read a pattern",
  "thin: two mapped votes are reported as a plain count. A count with no caveat reads as depth,\n" +
  "    which is the whole reason the shipped builder appends one");
eq((/(\d+) mapped vote/.exec(text(T_STACK)) || [])[1], "2",
  "thin: the thin fixture's depth line does not state its two mapped votes");

// ═════════════════════════════════════════════════════════════════════════════
// 5 · the scope note: secondary, wordless of numbers, and only where it is true
// ═════════════════════════════════════════════════════════════════════════════
section("5 · the term scope, said in words and only where a term scope exists");

const xScoped = WA.scopedRead(EXEC, win.CMP_DATA[EXEC]);
must(xScoped.applicable, "the executive fixture is not serving, so there is no scope note to assert");
has(X_STACK, "pdxwa-hscope",
  "exec: a serving figure's letterhead does not say which span the score covers");
has(X_STACK, "Current term (" + xScoped.term + ")",
  "exec: the scope note does not name the term it refers to, or names a different one than the\n" +
  "    card's own slice strip");
has(X_STACK, "the whole record, every term",
  "exec: the scope note does not say the score above contains this term — without it two spans\n" +
  "    read as two rival findings");
// The slice's FIGURE stays in the card. This is the one place a second percentage
// would be most tempting and most damaging.
lacks(text(X_STACK), "%",
  "exec: the scope note prints a percentage of its own");
ok(X_STACK.indexOf("pdxwa-hdepth") < X_STACK.indexOf("pdxwa-hscope"),
  "exec: the scope note is declared before the depth line it qualifies");

lacks(M_STACK, "pdxwa-hscope",
  "member: a member's letterhead carries a term-scope note. Roll-call records are not term-filtered\n" +
  "    anywhere in this engine, so the note would name a distinction that does not exist");

// A FORMER officeholder: the span stops being a live slice, so the note goes and
// the depth line — which is the whole file — stays.
{
  const realServing = ER.serving;
  ER.serving = () => false;
  let former = "";
  try { former = WA.headerStackHtml(EXEC); } finally { ER.serving = realServing; }
  lacks(former, "pdxwa-hscope",
    "exec: a figure who has left office is still offered a current-term note, which labels history\n" +
    "    as the live slice");
  has(former, "pdxwa-hdepth",
    "exec: leaving office cost the letterhead its record volume, which spans every term including\n" +
    "    the one just ended");
}

// ═════════════════════════════════════════════════════════════════════════════
// 6 · the hard walls
// ═════════════════════════════════════════════════════════════════════════════
section("6 · no party frame, no public lane, no inferred stance");

for (const [who, pid] of [["exec", EXEC], ["member", MEMBER]]) {
  const header = text(WA.heroMount(pid, win.CMP_DATA[pid], {}) +
    WA.headerTallyMount(pid) + WA.headerStackMount(pid)).toLowerCase();
  for (const word of ["republican", "democrat", "gop", "party line", "party loyalty"]) {
    lacks(header, word, `${who}: the letterhead summary frames the record by party`);
  }
  for (const word of ["public record", "public statement", "poll", "approval"]) {
    lacks(header, word,
      `${who}: the public lane is named in the formal summary stack — the ring, the counts and the\n` +
      "    volume are formal-lane only, and the public record is counted on the rows far below");
  }
  for (const word of ["likely", "appears to", "presumably", "we infer", "implied stance"]) {
    lacks(header, word, `${who}: the letterhead infers a position rather than reporting the file`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 7 · it fills when the record lands
// ═════════════════════════════════════════════════════════════════════════════
section("7 · the cold host is filled by the same warm event the tally listens for");

{
  const w = boot();
  const warm = [];
  w.addEventListener = (type, fn) => { if (type === "pdx-consistency-warm") warm.push(fn); };
  w.removeEventListener = (type, fn) => {
    const i = type === "pdx-consistency-warm" ? warm.indexOf(fn) : -1;
    if (i !== -1) warm.splice(i, 1);
  };
  // The mount arms its listener on the next tick; this sandbox's setTimeout is a
  // no-op by default, so run the callback inline.
  w.setTimeout = (fn) => { try { fn(); } catch (e) {} return 0; };

  const cold = w.PDXWordAction.headerStackMount(MEMBER);   // nothing seeded in this realm yet
  ok(/data-pdxwa-hstack="[^"]+"><\/div>$/.test(cold.trim()),
    "warm: the header stack is not empty before the roll-call record lands, so the repaint below\n" +
    "    proves nothing");
  const uid = (/data-pdxwa-hstack="([^"]+)"/.exec(cold) || [])[1] || "";
  must(uid.length > 0, "warm: the cold host has no id for the repaint to find");
  ok(warm.length > 0,
    "warm: nothing listened for the record warming, so a profile that opens cold never gets its\n" +
    "    depth line at all — the empty host is all the reader ever sees");

  const host = { innerHTML: "" };
  const realQS = w.document.querySelector;
  w.document.querySelector = (sel) => (sel === '[data-pdxwa-hstack="' + uid + '"]' ? host : null);
  w.PDXVotingRecord.noteMember(MEMBER, DEEP_SEED);
  try { warm.slice().forEach((fn) => fn({ detail: { pid: MEMBER } })); }
  finally { w.document.querySelector = realQS; }
  has(host.innerHTML, "24 mapped votes across 6 issues",
    "warm: the record landed and the letterhead's depth line never appeared — on every profile\n" +
    "    whose votes arrive after first paint the header would stay silent about depth for the\n" +
    "    life of the page");
  eq((text(host.innerHTML).match(/%/g) || []).length, 0,
    "warm: the repainted tail carries a percentage");
}

// ═════════════════════════════════════════════════════════════════════════════
// 8 · mobile: one column, quieter than the counts, no reserved gap
// ═════════════════════════════════════════════════════════════════════════════
section("8 · the phone: a stacked strip under the letterhead, worth zero pixels when empty");

const CSS = R("word-action.css");
const PF = R("profiles-full.js");
must(/\.pdxwa-hstack-host\s*\{/.test(CSS), "word-action.css has no rule for the header stack host");

ok(/\.pdxwa-hstack-host:empty\s*\{[^}]*display:\s*none/.test(CSS),
  "mobile: an empty tail host still occupies space, so a profile with nothing warm carries a rule\n" +
  "    and a gap under its name saying nothing");
ok(/\.pdxwa-hdepth\s*\{[^}]*display:\s*flex/.test(CSS),
  "mobile: the depth line is not laid out as a row with its icon in its own column, so a wrapped\n" +
  "    sentence runs back under the glyph on a narrow screen");
// Quieter than the counts above it, on the layout where the header is one column.
const fs = (sel) => {
  const m = new RegExp("\\" + sel + "\\s*\\{[^}]*font-size:\\s*([\\d.]+)rem").exec(CSS);
  return m ? parseFloat(m[1]) : NaN;
};
const nSize = fs(".pdxwa-tally-n"), dSize = fs(".pdxwa-hdepth"), sSize = fs(".pdxwa-hscope");
must(!Number.isNaN(nSize) && !Number.isNaN(dSize) && !Number.isNaN(sSize),
  "mobile: could not read the type sizes for the counts and the tail out of word-action.css");
ok(dSize < nSize && sSize <= dSize,
  `mobile: the tail is set as loud as the counts it follows (counts ${nSize}rem, depth ${dSize}rem,\n` +
  `    scope ${sSize}rem) — context on a figure has to read as context`);
// The two phone passes in this file are the ring and the pledge lane; the tail is
// authored mobile-first like everything else, so it adds no third one.
const tailRules = CSS.split(/\n/).filter((l) => /pdxwa-hstack|pdxwa-hdepth|pdxwa-hscope/.test(l));
ok(tailRules.length > 0, "mobile: no rules for the tail were found to check at all");
ok(!/@media[^{]*max-width[^{]*\{[^}]*pdxwa-h(stack|depth|scope)/.test(CSS.replace(/\n/g, " ")),
  "mobile: the tail is styled inside a max-width query. Section 14 of test-word-action.mjs allows\n" +
  "    those for two component families only, and this is authored mobile-first");
// A full-width strip under the letterhead, not a fourth child inside its grid.
const hStack = PF.indexOf("PDXWordAction.headerStackMount(");
const hTally = PF.indexOf("PDXWordAction.headerTallyMount(");
must(hStack !== -1 && hTally !== -1, "profiles-full.js no longer mounts both header blocks");
ok(hStack > hTally,
  "mobile: the depth tail is declared before the four counts — the stack reads score → shape →\n" +
  "    depth, and the shape is the part a reader acts on");
const heroBlock = PF.slice(PF.indexOf('<div class="profile-hero">'), hStack);
eq((heroBlock.match(/<div/g) || []).length - (heroBlock.match(/<\/div>/g) || []).length, 0,
  "mobile: the tail is mounted INSIDE the .profile-hero grid rather than under it — the hero is a\n" +
  "    flex row on a desktop and a two-column grid on a phone, and an extra child is crushed on\n" +
  "    one layout and stranded on the other");

console.log(
  failures.length
    ? ""
    : `\n✓ profile header stack: all ${passed} assertions passed — score + shape + depth above the fold, one percentage`
);
if (failures.length) {
  console.error(`\n✗ profile header stack: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
