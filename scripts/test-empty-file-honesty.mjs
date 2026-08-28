#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-empty-file-honesty.mjs — the chrome may not contradict the file
// ─────────────────────────────────────────────────────────────────────────────
// Utah's formal lane shipped, and three separate strings on the profile kept
// describing a record that was no longer there — in both directions.
//
//   · mschultz (87 formal acts) and chew_h68 (90) were greeted with "PERSON
//     FILE · record still being built". That string was written for a thin or
//     unpublished file. Printed over the deepest formal records in the product
//     it told a reader the opposite of the truth, and it told it in the sticky
//     bar, above the record itself.
//
//   · jknotts has no formal act on file at all, and the loudest thing on his
//     profile was "🤝 10 kept · 5 broken of 15 resolved" — a pledge ledger from
//     another source, sitting two lines under the name, exactly where the
//     voting record should have been. Below it, the follow-through block called
//     itself "evidence for the pledge tier of Word vs Action" while no Word vs
//     Action read existed to be evidence FOR.
//
//   · Members seated in 2015 were shown "EARLY IN TERM" and "WHY THIS RECORD IS
//     THIN — early in their first term". Eleven years in office is not an
//     explanation for an untested record; it is the reason the gap is ours.
//
// The rule this harness holds: EVERY PIECE OF CHROME THAT DESCRIBES THE RECORD
// READS THE RECORD. A deep formal file may not be called unbuilt; an empty
// formal file must say it is empty, in one reviewed sentence, and must not let
// a promise leftover stand in for the record it does not have; and no thin-file
// story may invent a first term for someone who has served for a decade.
//
// A second rule, learned while writing the first: DEMOTING TAKES POSITIVE
// KNOWLEDGE. "The index did not load" is not "this person has no record", and a
// runtime that confuses them would demote the pledge block on every profile in
// the product. Absence of the index costs the honest-empty wording and nothing
// else.
//
// Contracts:
//   1. the reviewed empty-file note set is exact, closed, and self-enforcing
//   2. the third door is the same number, asked of the formal record
//   3. the kicker has three states and each one reads the file
//   4. an empty formal file leads with why it is empty, not with kept/broken
//   5. tenure, not a missing score, decides who is "early in term"
//   6. the floor itself is unchanged
//
//   node scripts/test-empty-file-honesty.mjs
//
// No DB, no network, no browser.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m}\n    expected ${JSON.stringify(b)}\n    got      ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m}\n    missing ${JSON.stringify(n)}`);
const hasNot = (h, n, m) => ok(!String(h).includes(n), `${m}\n    should not contain ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);

// A probe target that has been renamed away is a STALE HARNESS, not a pass: the
// contract stops being checked and the check stops saying so.
const must = (c, m) => {
  if (c) return;
  console.error(`✗ empty-file honesty: STALE HARNESS — ${m}\n\n` +
    "  This is not a passing state. Restore the probe target, or update this\n" +
    "  harness AND re-check the honesty rule it describes.");
  process.exit(2);
};

const INDEX = R("index.html");
const PROFILES = R("profiles-full.js");
const NOTES_RAW = R("db/vr-utah-empty-file-notes.json");

// ── Function bodies, pulled out of the real sources ─────────────────────────
// Same technique as test-promise-honesty.mjs: several of the guards under test
// live in index.html's inline bootstrap and in the middle of very large render
// functions, so they are lifted into a bare sandbox and exercised directly
// rather than re-implemented here.
function braceScan(src, head, label, file) {
  const open = src.indexOf("{", head);
  must(open !== -1, `${label} in ${file} has no body`);
  let depth = 0, i = open, inStr = null, esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") { inStr = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { i++; break; } }
  }
  must(depth === 0, `could not brace-scan ${label} in ${file}`);
  return src.slice(head, i);
}
function extractFn(src, name, file) {
  const head = src.indexOf("window." + name + " = function");
  must(head !== -1, `${file} no longer defines window.${name}`);
  return braceScan(src, head, `window.${name}`, file);
}

// The ten pids from the brief, written out here rather than read from the file
// under test: a harness that derives its expectation from its subject cannot
// catch an eleventh pid being added without review.
const EMPTY_TEN = [
  "emily_buss", "fgibson", "grant_pace", "jackie_larson", "jdraxler",
  "jknotts", "john_arthur", "jwestwood", "leah_hansen", "rob_bishop",
];
const REASONS = ["seated_after", "left_before", "candidate_only", "federal", "no_admitted_vote"];
// Two members whose formal record is the deepest in the product. Named in the
// brief as the acceptance cases.
const DEEP = ["mschultz", "chew_h68"];

// ═════════════════════════════════════════════════════════════════════════════
// 1 · the reviewed note set is exact, closed, and self-enforcing
// ═════════════════════════════════════════════════════════════════════════════
section("1 · the ten empty files, and the sentence each one gets");

let NOTES = null;
{
  try { NOTES = JSON.parse(NOTES_RAW); } catch (e) { NOTES = null; }
  must(NOTES && NOTES.notes && typeof NOTES.notes === "object",
    "db/vr-utah-empty-file-notes.json no longer parses to { notes: {...} }");

  const pids = Object.keys(NOTES.notes).sort();
  eq(pids.join(","), EMPTY_TEN.slice().sort().join(","),
    "the reviewed empty-file list is not the ten pids this pass reviewed — an entry\n" +
    "    added here publishes a sentence about a real person, so it goes through review\n" +
    "    and through this list, in that order");

  for (const pid of EMPTY_TEN) {
    const n = NOTES.notes[pid] || {};
    ok(REASONS.indexOf(n.reason) !== -1,
      `${pid}: reason ${JSON.stringify(n.reason)} is not one of the reviewed reasons`);
    ok(typeof n.note === "string" && n.note.trim().length > 12,
      `${pid}: has no readable one-line note — the whole point of the entry`);
    ok(/\.$/.test(String(n.note).trim()),
      `${pid}: note is not a finished sentence (it is printed as prose, mid-paragraph)`);
    ok(typeof n.basis === "string" && n.basis.trim().length > 0,
      `${pid}: has no basis — an unsourced claim about why a file is empty is still a claim`);
    // The sentence is documentation status. It may not shade into a verdict.
    ok(!/\b(failed|refused to|never bothered|ignored|worst|corrupt)\b/i.test(n.note),
      `${pid}: note reads as a judgement of the person rather than a note about our coverage`);
  }
  ok(Array.isArray(NOTES.sessionsOnFile) && NOTES.sessionsOnFile.length >= 3,
    "the note file no longer records WHICH sessions it is empty with respect to — " +
    "\"no admitted vote\" is meaningless without them");
}

// The generated index is the shipped copy of all of this, and it is generated:
// if it is stale, the browser and the sitemap disagree about who has a record.
{
  let checkOut = "", checkFailed = false;
  try {
    checkOut = execFileSync(process.execPath, [join(ROOT, "scripts/gen-formal-index.mjs"), "--check"],
      { cwd: ROOT, encoding: "utf8" });
  } catch (e) { checkFailed = true; checkOut = String((e && (e.stdout || e.message)) || ""); }
  ok(!checkFailed,
    "formal-index.js is stale — run: node scripts/gen-formal-index.mjs\n" +
    `    ${checkOut.trim().split("\n").slice(0, 3).join("\n    ")}`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 2 · the third door is the same number, asked of the formal record
// ═════════════════════════════════════════════════════════════════════════════
section("2 · the formal door is not a lower floor");

// The floor and the generated index, in one sandbox, as the browser loads them.
const app = makeSandbox();
vm.createContext(app);
for (const f of ["formal-index.js", "publication-floor.js"]) {
  try { vm.runInContext(R(f), app); }
  catch (e) { must(false, `${f} does not load in a bare sandbox: ${e.message}`); }
}
const FLOOR = app.window.PDXPublicationFloor;
const FX = app.window.PDXFormalIndex;
must(FLOOR && typeof FLOOR.read === "function", "publication-floor.js no longer publishes read()");
must(FX && typeof FX.has === "function" && typeof FX.emptyNote === "function",
  "formal-index.js no longer publishes has()/emptyNote()");

{
  eq(FLOOR.MIN_CITED_POSITIONS, 2,
    "the publication floor moved. This pass was explicitly not allowed to lower it, and\n" +
    "    the third door was added at the SAME number for that reason");

  const ident = { name: "Fixture Member", office: "UT State Representative", state: "UT District 1" };
  const probe = (measures) => FLOOR.read("fixture", {
    roster: { fixture: ident },
    stances: {},
    formal: { measures: () => measures, has: () => measures > 0 },
  });

  eq(probe(0).publishable, false, "a file with no formal measure was published");
  ok(probe(0).reasons.indexOf("no-cited-record") !== -1,
    "a file with nothing at all did not say so — it must not read as a near miss");
  eq(probe(1).publishable, false,
    "ONE formal measure opened the door. Two cited positions is the floor everywhere else;\n" +
    "    the formal door is the same number asked of a different source, not a discount");
  ok(probe(1).reasons.indexOf("thin-record") !== -1,
    "a one-measure file did not report as thin");
  eq(probe(2).publishable, true, "two formal measures did not clear the floor");
  eq(probe(2).reasons.length, 0, "a clearing file still carried a failure reason");

  // Identity is still required: a formal act cannot publish a record with no
  // name, office or state to print at the address.
  eq(FLOOR.read("fixture", { roster: {}, formal: { measures: () => 99 } }).publishable, false,
    "99 formal measures published a file with no identity behind it");

  // And the door must not become a throw. A runtime where formal-index.js
  // failed to load has to keep deciding.
  let threw = false;
  try { FLOOR.read("fixture", { roster: { fixture: ident }, stances: {}, formal: null }); }
  catch (e) { threw = true; }
  ok(!threw, "the floor threw when the formal index was absent instead of losing the third door");
  eq(FLOOR.read("fixture", { roster: { fixture: ident }, stances: {}, formal: null }).publishable, false,
    "an absent formal index published a file it could not see the record for");

  // Load order: the floor reads the index at call time, but the sitemap
  // generator and the app both need the file present before the floor runs.
  const iFormal = INDEX.indexOf("/formal-index.js");
  const iFloor = INDEX.indexOf("/publication-floor.js");
  must(iFormal !== -1 && iFloor !== -1, "index.html no longer loads both formal-index.js and publication-floor.js");
  ok(iFormal < iFloor, "index.html loads publication-floor.js before formal-index.js");
  has(R("scripts/gen-sitemap.mjs"), "formal-index.js",
    "the sitemap generator stopped loading the formal index — it would then drop every\n" +
    "    person file that clears on formal acts alone, and the two runtimes would disagree");
}

// The two acceptance names, through the real shipped index.
{
  for (const pid of DEEP) {
    eq(FX.has(pid), true, `${pid} has no formal record in the shipped index — the acceptance case`);
    ok(FX.measures(pid) >= 2, `${pid} holds fewer than two measures in the shipped index`);
    eq(FX.emptyNote(pid), null,
      `${pid} carries an empty-file note over a deep formal record — the exact contradiction\n` +
      "    this pass was opened to remove");
  }
  for (const pid of EMPTY_TEN) {
    eq(FX.has(pid), false, `${pid} is in the empty-ten but the index holds a formal act for them`);
    const n = FX.emptyNote(pid);
    ok(n && n.note && n.note === NOTES.notes[pid].note,
      `${pid}: the shipped index does not carry the reviewed sentence from db/`);
  }
  eq(FX.emptyNote("no_such_person_at_all"), null, "emptyNote invented a note for an unknown pid");
}

// ═════════════════════════════════════════════════════════════════════════════
// 3 · the kicker has three states and each one reads the file
// ═════════════════════════════════════════════════════════════════════════════
section("3 · the sticky bar, over three kinds of file");

function kickerFor(pid, roster, opts) {
  opts = opts || {};
  const s = makeSandbox();
  const host = { innerHTML: "", attrs: {},
    setAttribute(k, v) { this.attrs[k] = String(v); },
    removeAttribute(k) { delete this.attrs[k]; },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
  };
  s.document.getElementById = (id) => (id === "modal-file-kicker" ? host : null);
  s.CMP_DATA = roster;
  vm.createContext(s);
  for (const f of ["formal-index.js", "publication-floor.js"]) vm.runInContext(R(f), s);
  if (opts.noFormalIndex) s.window.PDXFormalIndex = undefined;
  if (opts.stances) s.window.ISSUE_STANCE_DATA = opts.stances;
  try { vm.runInContext(R("person-file.js"), s); }
  catch (e) { must(false, `person-file.js does not load in a bare sandbox: ${e.message}`); }
  const P = s.window.PDXPerson;
  must(P && typeof P.kicker === "function", "person-file.js no longer publishes PDXPerson.kicker");
  P.kicker(pid);
  return host.innerHTML;
}

const UT_REP = (name) => ({ name, office: "UT State Representative", state: "UT District 1", party: "R" });
const ROSTER = {
  mschultz: UT_REP("Mike Schultz"),
  chew_h68: UT_REP("Scott Chew"),
  jknotts: UT_REP("John Knotts"),
  nobody: UT_REP("Unreviewed Nobody"),
};

{
  for (const pid of DEEP) {
    const out = kickerFor(pid, ROSTER);
    has(out, "Person file", `${pid}: the kicker stopped naming the surface`);
    has(out, "politidex.fyi/p/" + pid,
      `${pid}: a record with a deep formal file is not advertising its citable address`);
    hasNot(out, "still being built",
      `${pid}: THE HEADLINE DEFECT. A file with dozens of formal acts is being described as\n` +
      "    unbuilt, in the sticky bar, directly above the acts");
    hasNot(out, "no formal record on file", `${pid}: a deep formal file was called empty`);
  }

  const empty = kickerFor("jknotts", ROSTER);
  has(empty, "no formal record on file",
    "jknotts: an empty formal file must say so — honestly empty, not \"yet\", and not thin");
  hasNot(empty, "still being built",
    "jknotts: an empty file was described as work in progress. Nothing is in progress; the\n" +
    "    reviewed answer is that there is no admitted vote to hold");
  hasNot(empty, "/p/jknotts", "jknotts: a below-floor file was advertised at a citable address");
  has(empty, "note about what we hold",
    "jknotts: the empty state dropped its \"this is documentation, not a verdict\" framing");

  const unreviewed = kickerFor("nobody", ROSTER);
  has(unreviewed, "still being built",
    "a genuinely thin, unreviewed file lost the only state that fits it — \"still being built\"\n" +
    "    is correct HERE, which is why the fix was to gate it, not to delete it");

  // No finding in the chrome, in any state.
  for (const out of [kickerFor("mschultz", ROSTER), empty, unreviewed]) {
    ok(!/\d+\s*%/.test(out), "the kicker printed a percentage — the chrome carries no finding");
    ok(!/Direction Match/i.test(out), "the kicker printed a Direction Match");
  }

  // Positive knowledge, again: with the index absent, a below-floor file falls
  // back to "still being built" rather than claiming an empty record.
  const blind = kickerFor("jknotts", ROSTER, { noFormalIndex: true });
  hasNot(blind, "no formal record on file",
    "with no formal index loaded, the kicker still asserted that a file is empty — it cannot\n" +
    "    know that, and the fallback exists so it does not have to guess");
}

// ═════════════════════════════════════════════════════════════════════════════
// 4 · an empty formal file leads with why, not with kept/broken
// ═════════════════════════════════════════════════════════════════════════════
section("4 · the empty brief, and the pledge leftovers that used to outrank it");

// 4a · the reviewed sentence renders, and only for the empty files.
{
  const s = makeSandbox();
  vm.createContext(s);
  for (const f of ["formal-index.js", "profile-spine.js"]) {
    try { vm.runInContext(R(f), s); }
    catch (e) { must(false, `${f} does not load in a bare sandbox: ${e.message}`); }
  }
  const SP = s.window.PDXProfileSpine;
  must(SP && typeof SP.emptyFileNoteHtml === "function",
    "profile-spine.js no longer publishes emptyFileNoteHtml");

  const out = SP.emptyFileNoteHtml("jknotts", ROSTER.jknotts);
  has(out, "pdxsp-emptywhy", "the empty-file note lost its own section wrapper");
  has(out, NOTES.notes.jknotts.note, "the empty-file note does not print the reviewed sentence");
  has(out, "no formal act", "the empty-file note stopped saying what is missing");
  ok(/documentation status/i.test(out) || /not a finding/i.test(out),
    "the empty-file note stopped labelling itself as coverage rather than a verdict");
  ok(!/\d+\s*kept/.test(out), "the empty-file note leads with pledge counts");

  eq(SP.emptyFileNoteHtml("chew_h68", ROSTER.chew_h68), "",
    "a file with 90 formal acts printed a \"why this file is empty\" note");

  // It is the FIRST thing in the brief stage, because a reader stops reading.
  const brief = PROFILES.indexOf("PDXSP:brief");
  must(brief !== -1, "profiles-full.js no longer mounts the PDXSP:brief stage");
  const mount = PROFILES.indexOf("emptyFileNoteHtml");
  must(mount !== -1, "profiles-full.js no longer mounts emptyFileNoteHtml");
  const window0 = PROFILES.slice(brief, brief + 2400);
  has(window0, "emptyFileNoteHtml",
    "the empty-file note is no longer mounted at the top of the formal brief — a note that\n" +
    "    arrives below the leftovers it is correcting corrects nothing");
}

// 4b · the follow-through block does not speak for a record that is not there.
{
  const s = { console };
  s.window = s;
  vm.createContext(s);
  for (const n of ["_pdxPromiseTally", "_pdxResolvedPromises", "_pdxHasPromiseRecord",
                   "_pdxHasItemizedPledges", "_pdxDisplayScore", "_pdxPromiseState"]) {
    vm.runInContext(extractFn(INDEX, n, "index.html") + ";", s);
  }
  for (const n of ["_ftMeta", "_renderFollowThrough"]) {
    vm.runInContext(extractFn(PROFILES, n, "profiles-full.js") + ";", s);
  }
  const W = s.window;
  must(typeof W._renderFollowThrough === "function", "_renderFollowThrough is no longer extractable");

  // The index the block reads: jknotts empty, chew_h68 deep.
  W.PDXFormalIndex = { has: (pid) => pid === "chew_h68", measures: (pid) => (pid === "chew_h68" ? 110 : 0) };

  const emptyFile = W._renderFollowThrough(10, 5, 4, "jknotts", null, false);
  const deepFile = W._renderFollowThrough(10, 5, 4, "chew_h68", null, false);

  has(emptyFile, "Pledge ledger",
    "the pledge block lost its own label on an empty file — the counts are real receipts and\n" +
    "    this pass demotes them, it does not delete them");
  has(emptyFile, "10", "the demoted block dropped the kept count it exists to carry");
  hasNot(emptyFile, "evidence for the pledge tier",
    "jknotts: the pledge block still calls itself evidence for a Word vs Action read that does\n" +
    "    not exist for this file — the leftover claiming to be part of the record");
  hasNot(emptyFile, "See the Word vs Action read this feeds",
    "jknotts: the demoted block still offers a jump to a read that is not published for it");
  has(emptyFile, "no formal act",
    "jknotts: the demoted block does not say why it is standing on its own");

  has(deepFile, "evidence for the pledge tier",
    "chew_h68: a file WITH a formal record lost the framing that is true for it. The fix was a\n" +
    "    gate on the empty case, not a rewrite of the block");
  has(deepFile, "See the Word vs Action read this feeds",
    "chew_h68: the jump to the read this feeds disappeared from a file that publishes one");

  // Positive knowledge: with no index at all, the block stays as it was.
  W.PDXFormalIndex = undefined;
  const blind = W._renderFollowThrough(10, 5, 4, "jknotts", null, false);
  has(blind, "evidence for the pledge tier",
    "with the formal index absent, the pledge block demoted itself anyway — that would demote\n" +
    "    this block on EVERY profile in a runtime where one file failed to load");
}

// 4c · the hero chip, two lines under the name, is gated on the same knowledge.
{
  const head = PROFILES.indexOf("_formalKnownEmpty");
  must(head !== -1,
    "profiles-full.js no longer computes _formalKnownEmpty — the hero chip's gate. Without it\n" +
    "    an empty formal file prints \"10 kept · 5 broken of 15 resolved\" where the record goes");
  const chip = PROFILES.indexOf("profile-status-monitoring");
  must(chip !== -1, "the hero status chip is gone from profiles-full.js");
  const around = PROFILES.slice(chip, chip + 1800);
  has(around, "_formalKnownEmpty",
    "the hero status chip is no longer gated on the formal record — this is the string the\n" +
    "    brief names: \"10 kept · 5 broken of 15 resolved\" over an honestly empty file");
  has(around, "No formal record on file",
    "the gated hero chip does not say the true thing in place of the counts");
  // And the gate is positive-knowledge, not "!_formalOnFile".
  const gateSrc = PROFILES.slice(head, head + 700);
  has(gateSrc, "typeof FX.has !== 'function'",
    "_formalKnownEmpty stopped requiring the index to actually be loaded before it asserts\n" +
    "    that a file is empty");
}
// 4d · and neither does the loading state, in either direction.
//
// "Still loading the roll-call record" was the only top-of-file state for as long
// as the member pack took to arrive. On a reviewed empty file that was wrong twice
// over: it asked a reader to wait for something that was never coming, and then
// replaced the wait with the flat "no formal pattern on file". The generated index
// ships with the app and is parsed before any fetch starts, so the answer is in
// hand — but ONLY when the index is loaded, which is the same positive-knowledge
// rule as everything above it, and the reason this contract checks the fallback
// branch rather than just the new one.
{
  const WA = R("word-action.js");
  const i = WA.indexOf("function formalKnown");
  must(i !== -1,
    "word-action.js no longer defines formalKnown — the loading copy has nothing to\n" +
    "    consult, so a reviewed empty file waits forever for a record that does not exist");
  const fn = WA.slice(i, i + 500);
  has(fn, "typeof FX.has !== 'function'",
    "formalKnown stopped requiring the index to be loaded, so an app that failed to fetch\n" +
    "    formal-index.js would tell every reader their file is empty");
  has(fn, "return ''",
    "formalKnown has no third answer — 'cannot tell' has to be distinguishable from 'empty'");
  // No figure. formal-index.js's own header promises no surface prints its counts,
  // and a loading line is not the place to break that.
  for (const site of ["Still loading the roll-call record — the match cannot be read",
                      "Still loading the roll-call record — no formal pattern can be read"]) {
    const j = WA.indexOf(site);
    must(j !== -1, `word-action.js no longer carries the loading line "${site.slice(0, 40)}…"`);
    const near = WA.slice(Math.max(0, j - 700), j + 700);
    has(near, "formalKnown",
      `the loading line at "${site.slice(0, 40)}…" is not gated on what the index already knows`);
    ok(!/\.acts\(|\.measures\(/.test(near),
      "a loading line reads a COUNT out of the formal index — the index's contract is that no\n" +
      "    surface prints its figures");
  }
  // The empty branch says the true thing instead of asking for a wait.
  has(WA, "There is no formal record on file to test their words against.",
    "the Direction Match gap has no empty-file branch, so a reviewed empty file still\n" +
    "    reads as a page that has not finished loading");
  ok(!!FX && typeof FX.has === "function" && !FX.has("jknotts") && FX.has("chew_h68"),
    "the index the loading copy consults does not answer for the two files this contract is about");
}


// ═════════════════════════════════════════════════════════════════════════════
// 5 · tenure, not a missing score, decides who is "early in term"
// ═════════════════════════════════════════════════════════════════════════════
section("5 · eleven years in office is not a first term");

const HUB = R("voter-hub-location.js");
{
  const s = { console };
  s.window = s;
  vm.createContext(s);
  // _pdxTenure's date parser is a plain module-scoped function rather than a
  // window.* export, so it is lifted by name rather than through extractFn.
  const iMonths = HUB.indexOf("var _PDX_TENURE_MONTHS =");
  must(iMonths !== -1, "voter-hub-location.js no longer defines _PDX_TENURE_MONTHS");
  vm.runInContext(HUB.slice(iMonths, HUB.indexOf("\n", iMonths)), s);
  for (const helper of ["_pdxParseTermDate", "_pdxFmtTermDate"]) {
    const i = HUB.indexOf("function " + helper);
    must(i !== -1, `voter-hub-location.js no longer defines ${helper}`);
    vm.runInContext(braceScan(HUB, i, helper, "voter-hub-location.js") + ";", s);
  }
  for (const n of ["_pdxTenure", "_pdxRecordDepth", "_pdxDepthBadge"]) {
    vm.runInContext(extractFn(HUB, n, "voter-hub-location.js") + ";", s);
  }
  const W = s.window;

  const LONG = { name: "Long Serving", office: "UT State Representative", termStart: "2015-01-01" };
  const NEW = { name: "Just Seated", office: "UT State Representative", termStart: "2025-01-01" };
  const FORMER = { name: "Former", office: "UT State Representative", termStart: "2013-01-01", termEnd: "2019-01-01" };
  const UNDATED = { name: "No Dates", office: "UT State Representative" };

  const tLong = W._pdxTenure(LONG);
  ok(tLong && tLong.current === true && tLong.years >= 10,
    "_pdxTenure no longer reads a decade of service out of termStart — every gate in this\n" +
    "    contract is built on it");
  ok(W._pdxTenure(FORMER).current === false, "_pdxTenure calls a former officeholder current");

  // The card badge: an untested long-serving member reads as limited, not new.
  const badgeLong = W._pdxDepthBadge(LONG, {});
  ok(!/early/i.test(String(badgeLong)),
    "the record-depth badge still calls an eleven-year incumbent early in their term — it read\n" +
    "    a missing score and inferred a new officeholder");
  const badgeNew = W._pdxDepthBadge(NEW, {});
  ok(String(badgeNew) !== String(badgeLong),
    "a member seated this year and a member seated in 2015 got the SAME depth badge — the\n" +
    "    whole gate is that those two files are not the same file");
  // The undated case is deliberately unchanged: this pass gates on dates the
  // roster actually holds, and does not start guessing at seats with none.
  eq(String(W._pdxDepthBadge(UNDATED, {})), String(badgeNew),
    "a record with no term dates stopped falling back to the pre-existing wording — an\n" +
    "    unknown start date is not evidence of a long tenure either");
}

// The four remaining surfaces are inside very large render functions; they are
// checked at the source, at the exact gate, so a regression to a date-blind
// literal fails here.
{
  const pf = PROFILES;
  const iThin = pf.indexOf("const _thinTitle");
  must(iThin !== -1, "profiles-full.js no longer builds _thinTitle");
  const thin = pf.slice(iThin - 3000, iThin + 1200);
  has(thin, "_pdxTenure",
    "the thin-profile title stopped reading tenure — \"Early in term\" is decided by a date or\n" +
    "    it is decided by nothing");
  has(thin, "_reallyEarly",
    "the thin-profile title lost the gate that separates a first term from an untested decade");
  has(thin, "Limited record — nothing tested against a vote yet",
    "the long-serving-but-untested title is gone; that file has to say something true");
  has(thin, "Former officeholder — no record on file",
    "the archived-record title is gone — \"early in term\" for someone who left in 2019");

  const iPill = pf.indexOf("var csPillLabel");
  must(iPill !== -1, "profiles-full.js no longer builds csPillLabel");
  has(pf.slice(iPill, iPill + 400), "_early === true",
    "the snapshot pill prints \"Early in Term\" without asking whether the term is early");

  has(R("compare-hub.js"), "Nothing tracked yet — record being compiled",
    "the compare/roster stat pill went back to a single early-in-term literal for every\n" +
    "    officeholder with no counts, including the ones seated in 2015");
  const cmp = R("compare-hub.js");
  const iOffice = cmp.indexOf("var officeMsg");
  must(iOffice !== -1, "compare-hub.js no longer builds officeMsg");
  has(cmp.slice(iOffice, iOffice + 600), "_pdxTenure",
    "the stat pill's office message stopped reading tenure");
}

// ═════════════════════════════════════════════════════════════════════════════
// 6 · the floor itself is unchanged, and Utah reports honestly against it
// ═════════════════════════════════════════════════════════════════════════════
section("6 · the floor did not move");

{
  has(R("publication-floor.js"), "var MIN_CITED_POSITIONS = 2;",
    "MIN_CITED_POSITIONS is no longer the literal 2 — this pass was not allowed to move it");

  // Utah, banded through the shipped index: empty / thin / readable, reported
  // rather than asserted at a number, because the number grows every wave.
  const cmp = new vm.Script(R("cmp-data.js"));
  const cs = makeSandbox();
  vm.createContext(cs);
  try { cmp.runInContext(cs); } catch (e) { must(false, `cmp-data.js does not load: ${e.message}`); }
  const CMP = cs.window.CMP_DATA || {};
  let utah = 0, withRecord = 0, emptyNoted = 0, thin = 0;
  for (const pid of Object.keys(CMP)) {
    const d = CMP[pid] || {};
    if (!/^UT\b/.test(String(d.state || "")) || !/State (Representative|Senator)/i.test(String(d.office || ""))) continue;
    utah++;
    if (FX.has(pid)) { withRecord++; if (FX.measures(pid) < 2) thin++; }
    else if (FX.emptyNote(pid)) emptyNoted++;
  }
  ok(utah > 0, "no Utah legislators were found in cmp-data.js — the band below measures nothing");
  eq(utah - withRecord - emptyNoted, 0,
    `every Utah legislator with no formal act needs a reviewed note: ${utah} on roster, ` +
    `${withRecord} with a record, ${emptyNoted} noted, ` +
    `${utah - withRecord - emptyNoted} unexplained`);
  console.log(`      Utah: ${utah} on roster · ${withRecord} with a formal record · ` +
    `${thin} of those below the two-measure floor · ${emptyNoted} reviewed empty`);
}

// ─────────────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ empty-file honesty: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  ✗ " + f + "\n");
  process.exit(1);
}
console.log(`\n✓ empty-file honesty: ${passed} assertions passed`);
