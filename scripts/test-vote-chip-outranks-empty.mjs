#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vote-chip-outranks-empty.mjs — an empty letterhead is illegal while the
// vote chip is counting, and a shell asset is not shipped until CACHE_VERSION
// moves
// ─────────────────────────────────────────────────────────────────────────────
// THE REPORT. Live, after the cold-arrival pass landed: incognito paste
// /p/brett_garner and /p/jeffrey_stenquist still printed "No formal pattern on
// file yet" beside a nav chip reading VOTES · 68 and VOTES · 69. That is the
// contradiction three consecutive harnesses already forbade — and all three of
// them still pass.
//
// WHICH IS THE FINDING. The rule was not broken. The rule was not RUNNING.
//
//   /word-action.js is a precached SHELL ASSET, served stale-while-revalidate: a
//   device that has visited before gets the copy sitting in
//   politidex-shell-<CACHE_VERSION> INSTANTLY, and the network copy only replaces
//   it in the background for the NEXT load. Three passes in a row rewrote
//   word-action.js — the seed-yields-to-record fix, the first-paint-honesty fix,
//   the cold-arrival fix, which between them added every reader that makes the
//   contradiction impossible — and not one of them renamed the cache. So the
//   browser kept running a word-action.js from before the first of the three and
//   reproduced the exact defect the source had already made unreachable. The
//   source was right; the bytes were three fixes old.
//
// The second candidate root — "formalKnown(pid) === 'empty' for garner/stenquist/
// lund still outranks the chip" — is not what the shipped index says: formal-index.js
// carries brett_garner [68 acts, 67 measures], jeffrey_stenquist [69, 68] and
// steven_lund [97, 84] in COUNTS, and emptyNote() refuses to answer for any id
// has() is true for. formalKnown returns 'deep' for all three, never 'empty', and
// §1 below asserts that rather than assuming it. The rule is still worth stating
// as a rule, because the reviewed-note branch COULD outrank the chip for a pid the
// index does publish a note for — so §3 forces formalKnown to 'empty' for garner
// and stenquist and requires the chip to win anyway.
//
// WHAT THIS FILE HOLDS.
//
//   1. THE SHELL, WHICH IS THE PART THAT ACTUALLY FAILED. CACHE_VERSION moved off
//      the version that shipped the stale module, word-action.js and the brief's
//      three fact-source files are all precached, and — the standing guard — no
//      file in SHELL_ASSETS may change without this constant moving. That last
//      assertion is the one that would have caught this three passes ago.
//   2. THE INDEX SAYS 'deep', NOT 'empty', for all three reported pids.
//   3. THE HARD RULE. Mount garner with the chip already at 68 and formalKnown
//      forced to 'empty'. The FIRST innerHTML the host ever holds may not contain
//      the empty paragraph. Same for stenquist at 69. Both shapes: chip-only (the
//      rule exactly as written) and chip-plus-payload (the production shape).
//   4. jknotts, chip 0, stays empty — first frame and last, with his reviewed
//      reason. The rule may not be bought by blanking the sentence everywhere.
//   5. LEE IS UNCHANGED, twinned against HEAD byte for byte.
//   6. ONE DOOR. The empty paragraph is one string literal reachable from one
//      function, and that function vetoes on the chip. Over the whole roster:
//      wherever the chip counts, the paragraph is absent.
//   7. THE CHIP AND THE LETTERHEAD MOVE IN THE SAME TURN, on 'pdx-record-noted'.
//
//   node scripts/test-vote-chip-outranks-empty.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildUtahLane } from "./gen-crawl-record.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) =>
  ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const hasnt = (h, n, m) => ok(!String(h).includes(n), `${m} — still contains ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ vote chip outranks empty: STALE HARNESS — ${m}`); process.exit(2); };

// The sentence that may not be printed, and the two that are true instead.
const EMPTY = "No formal pattern on file yet";
const WAIT_ONFILE = "Their formal record is on file and still loading";
const WAIT_BARE = "Still loading the roll-call record — no formal pattern can be read until it lands.";

const GARNER = "brett_garner";
const STENQUIST = "jeffrey_stenquist";
const LUND = "steven_lund";
const LEE = "lee";
const JKNOTTS = "jknotts";

const SW = R("sw.js");
const WA = R("word-action.js");

const ENGINE_FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "formal-index.js", "coverage.js", "profile-spine.js",
];

const git = (...a) => {
  try { return execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }); } catch { return null; }
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the shell, which is the part that actually failed");
// ═════════════════════════════════════════════════════════════════════════════
// A precache manifest is not a hint. Everything named in SHELL_ASSETS is served
// to a warm device out of a cache named after CACHE_VERSION, so an edit to any of
// those files reaches NOBODY who has visited before until the constant moves.
// That is the whole defect, and this section is the standing guard against it.
{
  const cur = (SW.match(/^const CACHE_VERSION = '([^']+)';$/m) || [])[1];
  must(cur, "sw.js no longer declares `const CACHE_VERSION = '…'` on one line");
  console.log(`      CACHE_VERSION on disk: ${cur}`);

  // The list itself, parsed rather than grepped, so "is it precached" is asked of
  // the array the worker installs from and not of a comment mentioning the path.
  const block = (SW.match(/const SHELL_ASSETS = \[([\s\S]*?)\n\];/) || [])[1];
  must(block, "sw.js no longer declares a SHELL_ASSETS array");
  const shellAssets = [...block.matchAll(/^\s*'([^']+)',?\s*$/gm)].map((m) => m[1]);
  must(shellAssets.length > 40, `parsed only ${shellAssets.length} shell assets — the parser is stale`);
  const precached = (f) => shellAssets.includes(f);

  // ── THE LETTERHEAD ITSELF ──────────────────────────────────────────────────
  ok(precached("/word-action.js"),
    "word-action.js is a SHELL ASSET — which is why an unbumped edit to it reached nobody");
  ok(precached("/word-action.css"), "…and its stylesheet ships with it");

  // ── AND THE BRIEF'S OWN FACT SOURCES ───────────────────────────────────────
  // word-action.js decides which true sentence the letterhead gets by asking four
  // readers across three modules. Only voting-record.js was precached; on a cached
  // boot the other two arrived from the network or not at all, and a reader that
  // cannot answer is indistinguishable from a reader saying there is nothing on
  // file — which is the door the empty paragraph comes through.
  const BRIEF_FILES = ["/formal-index.js", "/person-file.js", "/person-file.css"];
  for (const f of BRIEF_FILES) {
    ok(precached(f), `${f} is precached — the brief's inputs may not be a version behind the brief`);
  }
  ok(precached("/voting-record.js"), "…and the payload/chip source it already had");

  // ── THE STANDING GUARD ─────────────────────────────────────────────────────
  // Did CACHE_VERSION move for the shell-asset edits that are in this tree? Two
  // questions, because a change can be uncommitted (this pass) or committed
  // without a bump (the three that caused the report).
  const headSW = git("show", "HEAD:sw.js");
  if (!headSW) {
    console.log("      (no git baseline available — the bump guard did not run here)");
  } else {
    const headVer = (headSW.match(/^const CACHE_VERSION = '([^']+)';$/m) || [])[1];
    must(headVer, "HEAD's sw.js has no CACHE_VERSION to compare against");

    // Every shell asset that differs from HEAD in this working tree, plus every
    // shell asset touched since the commit that introduced HEAD's CACHE_VERSION.
    const dirty = (git("diff", "--name-only", "HEAD") || "").split("\n").filter(Boolean);
    const introduced = ((git("log", "--format=%H", "-S", `const CACHE_VERSION = '${headVer}';`,
      "--", "sw.js") || "").trim().split("\n").filter(Boolean).pop()) || null;
    const sinceBump = introduced
      ? (git("diff", "--name-only", `${introduced}..HEAD`) || "").split("\n").filter(Boolean)
      : [];
    const touched = [...new Set([...dirty, ...sinceBump])]
      .filter((f) => precached("/" + f));

    if (!touched.length) {
      ok(true, "no shell asset has changed since the last CACHE_VERSION bump — nothing to ship");
    } else {
      console.log(`      shell assets changed since ${headVer} landed: ${touched.join(", ")}`);
      ok(cur !== headVer,
        `SHELL ASSETS CHANGED AND CACHE_VERSION DID NOT MOVE (${touched.join(", ")} at ${headVer}).\n` +
        "    Every warm device keeps serving the OLD copy of those files out of\n" +
        `    politidex-shell-${headVer} and the fix reaches nobody. Bump CACHE_VERSION in sw.js.`);
    }
    // And the bump this pass is for, named so the reason is on the record.
    if (cur !== headVer) {
      ok(true, `CACHE_VERSION moved ${headVer} → ${cur}, so activate() drops politidex-shell-${headVer}`);
      has(SW, `// ${cur} -`, `…and ${cur} has its own note in the version log above the constant`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the index says 'deep' for all three reported pids, never 'empty'");
// ═════════════════════════════════════════════════════════════════════════════
// The second candidate root, checked rather than assumed. If formalKnown really
// answered 'empty' for these three, the reviewed-note branch would be the cause
// and §3's forcing would be the production state rather than a hypothetical.
{
  const win = boot({});
  must(win.PDXFormalIndex, "formal-index.js no longer publishes PDXFormalIndex");
  for (const pid of [GARNER, STENQUIST, LUND]) {
    ok(win.PDXFormalIndex.acts(pid) > 0, `${pid}: the shipped index counts acts for them`);
    eq(win.PDXFormalIndex.emptyNote(pid), null, `${pid}: …so the index publishes NO empty note`);
    eq(win.PDXWordAction.formalKnown(pid), "deep", `${pid}: formalKnown answers 'deep'`);
  }
  eq(win.PDXWordAction.formalKnown(JKNOTTS), "empty",
    "jknotts is the reviewed-empty class, and still reads 'empty'");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the hard rule: chip > 0, formalKnown 'empty', first frame");
// ═════════════════════════════════════════════════════════════════════════════
// The rule, as one line: if the vote chip is counting, the empty-file paragraph is
// never rendered. Every other signal is stripped or inverted against it — the
// shipped index is forced to publish a reviewed empty note for garner and
// stenquist, nothing is warming, no request is outstanding, no crawl header is in
// the document — so the chip is the ONLY thing standing between the reader and the
// sentence. The FIRST innerHTML the host ever holds is what is asserted, because
// the report is about a first frame.
{
  const lane = buildUtahLane(ROOT);

  for (const [pid, n] of [[GARNER, 68], [STENQUIST, 69]]) {
    // ── SHAPE A: THE CHIP ALONE ────────────────────────────────────────────
    // memberRecords empty, header absent, index forced to 'empty', nothing in
    // flight. Only _pdxRecordMappedCounts — the pill's own source — is counting.
    // This is the rule exactly as written and nothing else can satisfy it.
    {
      const win = boot({});
      forceEmptyNote(win, pid);
      forceChip(win, pid, n);
      eq(win.PDXWordAction.formalKnown(pid), "empty", `${pid} (chip only): formalKnown forced to 'empty'`);
      eq(chipN(win, pid), n, `${pid} (chip only): the pill counts ${n}`);
      eq(liveN(win, pid), 0, `${pid} (chip only): …and the payload is NOT in memory`);
      eq(win.PDXWordAction.briefEmptyForbidden(pid), true,
        `${pid} (chip only): the door is locked by the chip`);

      const first = mountHero(win, pid).frames[0];
      hasnt(first, EMPTY,
        `${pid} (chip only): the FIRST innerHTML does not contain "${EMPTY}" while the chip reads ${n}`);
      has(first, WAIT_ONFILE, `${pid} (chip only): it says the record is on file and still loading`);
      // And the copy layer directly, so a failure names the layer it is in.
      hasnt(win.PDXWordAction.briefHtml(pid, win.CMP_DATA[pid]), EMPTY,
        `${pid} (chip only): briefHtml agrees with the mounted frame`);
    }

    // ── SHAPE B: THE PRODUCTION SHAPE ──────────────────────────────────────
    // The payload really landed (noteMember), so the chip counts because there
    // are rows to count — and the index STILL claims a reviewed empty note. A
    // note under review may not be printed over rows the same document is showing.
    {
      const win = boot({});
      const items = (lane.get(pid) || []).slice(0, n);
      must(items.length === n, `the Utah lane holds ${items.length} items for ${pid}, not ${n}`);
      win.PDXVotingRecord.noteMember(pid, items);
      forceEmptyNote(win, pid);
      eq(win.PDXWordAction.formalKnown(pid), "empty", `${pid} (payload): formalKnown still forced to 'empty'`);
      ok(chipN(win, pid) > 0, `${pid} (payload): the pill counts ${chipN(win, pid)} from real rows`);
      eq(win.PDXWordAction.briefEmptyForbidden(pid), true, `${pid} (payload): the door is locked`);

      const first = mountHero(win, pid).frames[0];
      hasnt(first, EMPTY, `${pid} (payload): the FIRST innerHTML does not contain "${EMPTY}"`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · jknotts: chip 0, stays empty");
// ═════════════════════════════════════════════════════════════════════════════
// The rule is a veto on a contradiction, not a ban on a sentence. A file the app
// has hand-checked and holds a written reason for still says so, on the first
// frame, with the reason attached — otherwise the fix is just silence.
{
  const win = boot({});
  eq(chipN(win, JKNOTTS), 0, "jknotts: the pill counts nothing");
  eq(liveN(win, JKNOTTS), 0, "jknotts: no payload in memory");
  eq(win.PDXWordAction.briefEmptyForbidden(JKNOTTS), false, "jknotts: nothing vetoes the sentence");
  eq(win.PDXWordAction.briefEmptyLegal(JKNOTTS), true, "jknotts: …and the wait is over, so it is legal");

  const m = mountHero(win, JKNOTTS);
  has(m.frames[0], EMPTY, "jknotts: the FIRST innerHTML DOES print the empty letterhead");
  has(m.frames[m.frames.length - 1], EMPTY, "jknotts: …and so does the last");
  const note = win.PDXFormalIndex.emptyNote(JKNOTTS);
  must(note && note.note, "jknotts lost his reviewed note in formal-index.js");
  hasnt(m.frames[0], WAIT_BARE, "jknotts: …and never a wait for a record that is not coming");

  // AND THE VETO IS WHAT MOVES HIM. Give the same file a chip and the sentence
  // goes; take it away and it comes back. One switch, both directions.
  const w2 = boot({});
  forceChip(w2, JKNOTTS, 12);
  hasnt(mountHero(w2, JKNOTTS).frames[0], EMPTY,
    "jknotts with a chip of 12: the reviewed note yields to the rows the document is counting");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · lee is unchanged");
// ═════════════════════════════════════════════════════════════════════════════
// The comparison the original report was built on. /p/lee was the frame that was
// already honest, and every pass since has had to leave it exactly as it was.
{
  const win = boot({});
  const mine = win.PDXWordAction.briefHtml(LEE, win.CMP_DATA[LEE]);
  hasnt(mine, EMPTY, "lee: the brief is not the empty letterhead");

  const headWA = git("show", "HEAD:word-action.js");
  if (!headWA) {
    console.log("      (no git baseline available — the twin boot did not run here)");
  } else {
    const A = boot({ src: { "word-action.js": headWA } });
    const before = A.PDXWordAction.briefHtml(LEE, A.CMP_DATA[LEE]);
    eq(mine, before, "lee: byte-identical to HEAD");
    // And the two other files the report names, in their real (unforced) state:
    // this pass restates the rule, it does not move any sentence.
    for (const pid of [GARNER, STENQUIST, LUND, JKNOTTS]) {
      eq(win.PDXWordAction.briefHtml(pid, win.CMP_DATA[pid]),
        A.PDXWordAction.briefHtml(pid, A.CMP_DATA[pid]),
        `${pid}: unforced brief is byte-identical to HEAD — the rule was restated, not widened`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · one door, and it vetoes on the chip");
// ═════════════════════════════════════════════════════════════════════════════
{
  // ONE STRING LITERAL, ONE REFERENCE. The paragraph is quoted once and read once,
  // so there is exactly one place a veto can be installed and exactly one place it
  // can be forgotten.
  eq(WA.split("'" + EMPTY).length - 1, 1, "the empty paragraph is ONE string literal in word-action.js");
  const uses = (WA.match(/\bEMPTY_FILE_COPY\b/g) || []).length;
  const inComments = (WA.match(/^\s*\/\/.*\bEMPTY_FILE_COPY\b/gm) || []).length;
  eq(uses - inComments, 2, "EMPTY_FILE_COPY appears in code twice: its declaration, and one read");
  const door = (WA.match(/function emptyFileCopy\(pid, p\) \{[\s\S]*?\n  \}/) || [])[0];
  must(door, "word-action.js no longer has an emptyFileCopy() door");
  has(door, "briefEmptyForbidden", "the door is locked by the veto…");
  has(door, "EMPTY_FILE_COPY", "…and the paragraph is only inside it");

  const veto = (WA.match(/function briefEmptyForbidden\(pid\) \{[\s\S]*?\n  \}/) || [])[0];
  must(veto, "word-action.js no longer has a briefEmptyForbidden() veto");
  has(veto, "voteChipN(pid) > 0", "THE HARD RULE, in the file, in the chip's own name");
  has(veto, "briefLiveN(pid) > 0", "…and memberRecords");
  has(veto, "briefHeaderRowN(pid) > 0", "…and the crawl header's rows");
  has(veto, "formalHasRecord(pid)", "…and the shipped index");

  // THE SERVED MODULE CAN BE ASKED. The smoke step for this report is "unregister
  // the worker, paste the address, confirm the module that actually loaded has the
  // rule in it" — which is only possible if the rule is reachable from outside the
  // closure. These four exports are what makes that a one-line console check.
  // The two readers the report asked to be assertable BY NAME on the served
  // module, checked in both places they can be checked: as source tokens (what a
  // deploy diff can grep) and as live exports (what a console on the running page
  // can call). A module that has one and not the other is a module that was built
  // from a different revision than the one that was reviewed.
  has(WA, "function briefRecordOnHand(", "briefRecordOnHand is in the module source");
  has(WA, "function briefChipN(", "briefChipN is in the module source");
  const win = boot({});
  for (const k of ["voteChipN", "briefRecordOnHand", "briefEmptyForbidden", "briefEmptyLegal"]) {
    eq(typeof win.PDXWordAction[k], "function", `PDXWordAction.${k} is exported for the served-module check`);
  }
  eq(win.PDXWordAction.voteChipN(JKNOTTS), 0, "…the exported chip reader agrees with the pill on an empty file");
  eq(win.PDXWordAction.briefRecordOnHand(JKNOTTS), false, "…and the exported record reader agrees with it");
  ok(win.PDXWordAction.voteChipN(GARNER) >= 0, "…and the chip reader answers a number for a deep file too");

  // ── AND OVER THE WHOLE ROSTER ─────────────────────────────────────────────
  // Not three ids: the rule is that no file anywhere may hold both. Every member
  // is given a chip and a forced reviewed empty note — the two facts that cannot
  // coexist — and the paragraph must be absent from all of them.
  {
    const w = boot({});
    const pids = Object.keys(w.CMP_DATA);
    ok(pids.length > 700, `the roster booted (${pids.length} ids)`);
    forceEmptyNoteAll(w);
    forceChipAll(w, 5);
    const leaked = pids.filter((pid) => {
      try { return String(w.PDXWordAction.briefHtml(pid, w.CMP_DATA[pid]) || "").includes(EMPTY); }
      catch { return false; }
    });
    eq(leaked, [], "with a chip counting and a reviewed empty note, NOT ONE brief on the roster calls the file empty");
  }

  // And the converse, unforced: wherever the real chip counts, the paragraph is
  // absent — the report's failing assertion, over the whole roster.
  {
    const w = boot({});
    const lane = buildUtahLane(ROOT);
    for (const [pid, items] of lane) if (w.CMP_DATA[pid]) w.PDXVotingRecord.noteMember(pid, items);
    const bad = Object.keys(w.CMP_DATA).filter((pid) => {
      if (chipN(w, pid) <= 0) return false;
      try { return String(w.PDXWordAction.briefHtml(pid, w.CMP_DATA[pid]) || "").includes(EMPTY); }
      catch { return false; }
    });
    eq(bad, [], "with the real Utah lane warm, no counting chip sits beside an empty letterhead");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the chip and the letterhead move in the same turn");
// ═════════════════════════════════════════════════════════════════════════════
// 'pdx-record-noted' is dispatched by PDXVotingRecord.noteMember, the only writer
// of _records — the array the pill counts. So it is not one signal among several:
// it is THE moment the chip can change, and any surface not on it moves a frame
// late, which is the contradiction with a delay on it.
{
  const hr = (WA.match(/var HERO_REPAINT = \[[\s\S]*?\];/) || [])[0];
  must(hr, "word-action.js's HERO_REPAINT set is gone");
  has(hr, "'pdx-record-noted'", "the hero rebuilds on the arrival itself");
  const PROF = R("profiles-full.js");
  const chips = (PROF.match(/const _bindRecChips = function[\s\S]*?\n    \};/) || [])[0];
  must(chips, "profiles-full.js's _bindRecChips is gone");
  has(chips, "'pdx-record-noted'", "…and so do the identity strip's record chips, on the same event");
  has(R("voting-record.js"), "'pdx-record-noted'", "…which noteMember is what dispatches");

  const lane = buildUtahLane(ROOT);
  const items = (lane.get(GARNER) || []).slice(0, 68);
  // bindHero arms from a setTimeout(…,0) beside markup the caller is still
  // assembling, exactly as it does in the page — so every case below lets that
  // turn run before the arrival, or the harness would be testing a host nothing
  // is subscribed to.
  const tick = () => new Promise((r) => setTimeout(r, 0));

  // ── THE REPORTED ARRIVAL, UNFORCED ─────────────────────────────────────────
  // garner as he really is: the shipped index counts 68 acts for him, the head has
  // a request out, the payload lands. Mount to settle, no frame is the empty one.
  {
    const win = boot({ realTimers: true });
    win.__pdxVRPrefetch = { pid: GARNER, url: "/api/voting-record/member/" + GARNER, promise: null, session: false };
    const m = mountHero(win, GARNER);
    eq(chipN(win, GARNER), 0, "at mount the chip counts nothing…");
    hasnt(m.frames[0], EMPTY, "…and the first frame is a wait, not an absence");
    await tick();
    const before = m.frames.length;
    win.PDXVotingRecord.noteMember(GARNER, items);
    ok(m.frames.length > before, "the arrival repainted the hero in the same turn it moved the chip");
    ok(chipN(win, GARNER) > 0, `…the chip now reads ${chipN(win, GARNER)}`);
    eq(m.frames.filter((f) => f.includes(EMPTY)), [],
      "…and no frame from mount to settle was the empty letterhead");
  }

  // ── AND THE VETO ARRIVING MID-SENTENCE ─────────────────────────────────────
  // The one ordering the rule exists for. Force the index to publish a reviewed
  // empty note for garner: at mount, with the chip at 0, that note is the app's
  // strongest claim about him and it is printed — a hand-checked note outranks a
  // wait, which is how jknotts gets his reason at first paint. Then the payload
  // lands. The moment the chip counts, the SAME letterhead must stop saying it, in
  // the turn the chip moved and not a frame later.
  {
    const win = boot({ realTimers: true });
    forceEmptyNote(win, GARNER);
    const m = mountHero(win, GARNER);
    has(m.frames[0], EMPTY, "chip 0 and a reviewed note: the letterhead legitimately says the file is empty");
    await tick();
    win.PDXVotingRecord.noteMember(GARNER, items);
    ok(chipN(win, GARNER) > 0, `the payload landed and the chip reads ${chipN(win, GARNER)}`);
    eq(win.PDXWordAction.briefEmptyForbidden(GARNER), true, "…so the door is now locked");
    hasnt(m.frames[m.frames.length - 1], EMPTY,
      "…and the letterhead the host is left holding has dropped the sentence, in the same turn");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ── the harness's own plumbing, kept below the assertions it serves ──────────
// ═════════════════════════════════════════════════════════════════════════════

function boot(opts) {
  const o = opts || {};
  const win = makeSandbox();
  if (o.realTimers) {
    win.setTimeout = (fn, ms) => setTimeout(fn, ms);
    win.clearTimeout = (t) => clearTimeout(t);
  }
  win.URLSearchParams = URLSearchParams;
  win.AbortController = AbortController;
  // A REAL EVENT BUS. makeSandbox's dispatchEvent is a no-op, and this file is
  // about a repaint that happens on an event — so the bus is the thing under test
  // and cannot be stubbed out. Same shape as the cold-arrival harness's.
  const bus = new Map();
  win.addEventListener = (t, h) => { const a = bus.get(t) || []; a.push(h); bus.set(t, a); };
  win.removeEventListener = (t, h) => {
    const a = bus.get(t) || []; const i = a.indexOf(h); if (i >= 0) a.splice(i, 1);
  };
  win.dispatchEvent = (ev) => {
    for (const h of (bus.get(ev && ev.type) || []).slice()) { try { h(ev); } catch { /* as in a browser */ } }
    return true;
  };
  win.__bus = bus;
  // Hosts the mounted heroes live in, found by the same selector bindHero uses.
  const hosts = new Map();
  win.__hosts = hosts;
  win.document.querySelector = (sel) => {
    const m = /^\[([a-z0-9-]+)="([^"]+)"\]$/i.exec(String(sel || ""));
    return m ? (hosts.get(m[1] + "=" + m[2]) || null) : null;
  };
  win.document.getElementById = () => null;
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of ENGINE_FILES) {
    vm.runInContext(o.src && o.src[f] ? o.src[f] : R(f), ctx, { filename: f });
  }
  win.PROFILES = win.CMP_DATA;
  must(win.PDXWordAction && typeof win.PDXWordAction.briefHtml === "function",
    "PDXWordAction.briefHtml is no longer the brief renderer");
  return win;
}

// Mount a hero the way openModal mounts one: heroMount's markup, the inner half
// in a host keyed by the uid it chose, and the real bindHero subscription finding
// it. `frames` is every string the host has ever held, oldest first — frames[0] is
// the FIRST innerHTML, which is what this report is about.
function mountHero(win, pid, p) {
  const html = win.PDXWordAction.heroMount(pid, p || win.CMP_DATA[pid], {});
  const m = /data-pdxwa-hero="([^"]+)"/.exec(html);
  must(m, `heroMount returned no host for ${pid}`);
  const inner = html.replace(/^\s*<div[^>]*>/, "").replace(/<\/div>\s*$/, "");
  const frames = [inner];
  let cur = inner;
  const host = {
    classList: { toggle() {} },
    get innerHTML() { return cur; },
    set innerHTML(v) { cur = String(v); frames.push(cur); },
  };
  win.__hosts.set("data-pdxwa-hero=" + m[1], host);
  return { host, frames, uid: m[1] };
}

// The nav pill's own number, asked the way injectNavPill asks it, and the payload
// the pill counts, asked the way the brief asks it.
function chipN(win, pid) {
  try { return (win._pdxRecordMappedCounts(pid) || {}).total || 0; } catch { return 0; }
}
function liveN(win, pid) {
  try { return (win.PDXVotingRecord.memberRecords(pid) || []).length; } catch { return 0; }
}

// ── THE TWO FORCINGS ────────────────────────────────────────────────────────
// forceChip makes the PILL count without a payload behind it, which is the only
// way to isolate the chip clause of the rule: everywhere else in the app the chip
// is derived from memberRecords, so a chip and a payload cannot be separated
// without replacing the reader. It replaces the reader and nothing else.
function forceChip(win, pid, n) {
  const base = win._pdxRecordMappedCounts;
  win._pdxRecordMappedCounts = (id) =>
    (String(id) === String(pid) ? { votes: n, issues: 1, total: n, issueKeys: ["x"], supersededActs: 0 }
                                : base.call(win, id));
}
function forceChipAll(win, n) {
  win._pdxRecordMappedCounts = () =>
    ({ votes: n, issues: 1, total: n, issueKeys: ["x"], supersededActs: 0 });
}
// forceEmptyNote makes the SHIPPED INDEX claim a hand-reviewed empty file for a
// pid it really counts 68 acts for — the state candidate root #2 asserted was
// already live. It is not live (§2), so it is manufactured here, because the rule
// has to hold in it: a reviewed note is the app's strongest claim that there is
// nothing to wait for, and it still may not be printed over a counting chip.
function forceEmptyNote(win, pid) {
  const FX = win.PDXFormalIndex;
  win.PDXFormalIndex = {
    ...FX,
    acts: (id) => (String(id) === String(pid) ? 0 : FX.acts(id)),
    measures: (id) => (String(id) === String(pid) ? 0 : FX.measures(id)),
    has: (id) => (String(id) === String(pid) ? false : FX.has(id)),
    emptyNote: (id) => (String(id) === String(pid)
      ? { reason: "left_before", note: "Forced by the harness — see §3." }
      : FX.emptyNote(id)),
  };
}
function forceEmptyNoteAll(win) {
  win.PDXFormalIndex = {
    ...win.PDXFormalIndex,
    acts: () => 0, measures: () => 0, has: () => false,
    emptyNote: () => ({ reason: "left_before", note: "Forced by the harness — see §6." }),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ vote chip outranks empty: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`\n✓ vote chip outranks empty: an empty letterhead is illegal while the chip counts, and a shell asset ships only with a bump — ${passed} assertions passed\n`);
