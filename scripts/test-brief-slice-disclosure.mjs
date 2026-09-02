#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-brief-slice-disclosure.mjs — the formal brief names the slice, and never
// implies a career
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS GUARDS. The federal roster wave attached 7,138 member cells across
// 23 House roll calls. Several hundred sitting Representatives who had no formal
// file the day before now open on the same three chips off the same 23
// documents — permits 4–0, crime 4–0, energy 4–0 — and every number in that is
// true of the 119th-Congress slice we hold. A reader meets it at the top of a
// person's file and reads it as a description of the person. word-action.js now
// prints one locked sentence under the pattern list saying which of the two it
// is, and this file holds the seven fences around it:
//
//   1. THE COPY IS LOCKED. Two forms of one sentence, verbatim, and no third.
//      No party, no intent, no percentage, no verdict word.
//   2. IT PRINTS WHERE IT IS TRUE. bean, kiley and begich — a whole readable
//      formal lane of House rolls from one Congress, inside the cutoff.
//   3. IT IS SILENT WHERE IT WOULD BE FALSE OR REDUNDANT. lee (Senate, three
//      Congresses), bmoore (Representative, but Senate rows and three
//      Congresses), mschultz and chew_h68 (Utah state files, no federal lane),
//      and every file deep enough to read on its own terms.
//   4. IT IS NOT AN EMPTY-LANE LINE. A file with zero judged acts keeps the
//      block's own locked absence copy; the slice sentence never stands in for
//      it (armstrong).
//   5. THE NUMBER IS A RE-PRINT OR IT IS ABSENT. N is only printed where the two
//      counts already published for that person agree, and it is the number the
//      census on the very same block prints.
//   6. IT SITS UNDER WHAT IT DESCRIBES. Below the census and the strongest-
//      patterns list, above the route out — never above the person's name.
//   7. NOTHING ELSE MOVED. Twin boot against HEAD: every brief is byte-identical
//      apart from the one new node, and no shape count, chip order, tier or
//      Direction Match figure drifted anywhere in the corpus.
//
//   node scripts/test-brief-slice-disclosure.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, and the live
// record corpus seeded the way a completed /api/voting-record fetch leaves it.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HEAD = (f) => {
  try {
    return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch { return null; }
};

const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "inventory.js",
  "issue-scope.js", "word-action.js", "profile-spine.js", "profiles-full.js",
];

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const no = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present`);
const section = (t) => console.log(`\n   ── ${t}`);
// A probe that finds nothing must fail loudly, or a rename turns this whole file
// into a very fast, very green no-op.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ brief slice disclosure: STALE PROBE — ${msg}`);
  process.exit(2);
};

// ═══════════════════════════════════════════════════════════════════════════════
// THE CUTOFF, AND THE LIST IT WAS PICKED FROM
// ═══════════════════════════════════════════════════════════════════════════════
// SLICE_CUTOFF is 32 judged acts / distinct instruments, and it was measured off
// the shipped corpus rather than chosen. The measurement, from
// scripts/vr-record-corpus.mjs over db/vr-*seed*.json:
//
//   PRINTS (the three the brief names, and the cohort behind them)
//     aaron_bean       U.S. Representative  house only  119th only  23 acts / 23 rolls
//     kevin_kiley      U.S. Representative  house only  119th only  23 acts / 23 rolls
//     nicholas_begich  U.S. Representative  house only  119th only  23 acts / 23 rolls
//   322 files in the corpus clear all four legs. 225 of them — bean, kiley and
//   begich among them — have the two published counts in agreement and print N;
//   97 do not and print the sentence without a number.
//
//   SILENT
//     lee              U.S. Senator         house+senate  117/118/119   126 acts / 53 rolls
//     bmoore           U.S. Representative  house+senate  117/118/119   225 acts / 108 rolls
//     curtis           U.S. Senator         house+senate  117/118/119   151 acts / 66 rolls
//     mschultz         Utah House Speaker   no federal record lane at all
//     chew_h68         Utah State Rep.      no federal record lane at all
//     alan_armstrong   U.S. Senator         senate only   119th only    16 acts / 9 rolls
//     sarah_mcbride    U.S. Representative  house only    119th only   150 acts / 86 rolls
//
// WHY 32. Every file that clears the chamber and Congress legs sits at 23 judged
// acts or fewer — 23 is the R1 slice and the top bin, 225 members deep. The
// nearest file above is sarah_mcbride at 150 acts across 86 distinct rolls: one
// Congress, House only, and deep enough to be read on its own terms. Above that
// come the three-Congress files at 126, 151 and 225. Only one file in the whole
// corpus outside the qualifying cohort carries 32 or fewer acts (armstrong, 16),
// and the chamber leg already silences it. So 32 leaves the rest of this
// session's rolls room to land on the printing files without the sentence ever
// reaching a file we hold that a reader could fairly call a career record.
const CUTOFF = 32;
const YES = ["aaron_bean", "kevin_kiley", "nicholas_begich"];
const NO_FEDERAL_DEEP = ["lee", "bmoore", "curtis", "sarah_mcbride"];
const NO_UTAH = ["mschultz", "chew_h68"];
const NO_EMPTY_LANE = ["alan_armstrong"];

// The locked copy, spelled here and nowhere else in this file.
const LINE_N = (n) => `Pattern from ${n} House rolls on file — not a career score.`;
const LINE_BARE = "Pattern from the House rolls on file — not a career score.";
const SLICE_RE = /<p class="pdxwa-shape-slice">([^<]*)<\/p>/;

const corpus = buildCorpus(ROOT);
must(corpus && corpus.byMember && corpus.byMember.size > 300,
  "the record corpus did not load enough members to sweep");

function boot(get) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    const src = get(f);
    if (src === null) continue;
    vm.runInContext(src, ctx, { filename: f });
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  return win;
}
const W = boot(R);
const WA = W.PDXWordAction, CS = W.PDXConsistency, INV = W.PDXInventory;
must(WA && typeof WA.heroHtml === "function", "PDXWordAction.heroHtml is not exposed");
must(CS && CS.formalPatternIndex && typeof CS.formalPatternIndex.shape === "function",
  "the formal-pattern index no longer publishes shape()");
must(INV && typeof INV.read === "function", "PDXInventory.read is not exposed");
must(typeof W._pdxRecordMappedCounts === "function",
  "window._pdxRecordMappedCounts is gone — the distinct-instrument count this file cross-checks N against");
const prof = (w, pid) => {
  const P = w.PROFILES;
  return Array.isArray(P) ? P.find((x) => x && x.id === pid) : (P && P[pid]);
};
const hero = (pid) => WA.heroHtml(pid, prof(W, pid)) || "";
const sliceOf = (html) => { const m = SLICE_RE.exec(html); return m ? m[1] : null; };
const visible = (h) => String(h).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
for (const pid of YES) must(hero(pid), `${pid}: the hero rendered nothing at all`);

const WA_SRC = R("word-action.js");

// ═══════════════════════════════════════════════════════════════════════════════
section("1 · the locked copy, and only the locked copy");
// ═══════════════════════════════════════════════════════════════════════════════
{
  // Both forms are spelled once in the renderer, and the renderer composes no
  // third one. The number is the only variable in the sentence.
  has(WA_SRC, "'Pattern from the House rolls on file — not a career score.'",
    "the no-number form of the locked sentence is not in word-action.js verbatim");
  has(WA_SRC, "'Pattern from ' + n + ' House rolls on file — not a career score.'",
    "the numbered form of the locked sentence is not in word-action.js verbatim");
  const forms = [...WA_SRC.matchAll(/Pattern from [^']*/g)].map((m) => m[0]);
  eq(forms.length, 2, `word-action.js spells ${forms.length} forms of the slice sentence, not two`);

  // Every rendering of it in the whole corpus is one of the two, to the byte.
  const seen = new Set();
  for (const [pid] of corpus.byMember) {
    const s = sliceOf(hero(pid));
    if (s !== null) seen.add(s);
  }
  ok(seen.size > 0, "the slice sentence never rendered anywhere in the corpus");
  const strays = [...seen].filter((s) => s !== LINE_BARE && !/^Pattern from \d+ House rolls on file — not a career score\.$/.test(s));
  eq(strays.join(" | "), "", "a rendering of the slice sentence is not the locked copy");
  ok(seen.has(LINE_BARE), "the no-number form never rendered — the disagreeing-counts branch is unreachable");
  ok([...seen].some((s) => /^Pattern from \d+ /.test(s)), "the numbered form never rendered");

  // THE WALLS, on every rendering. No party, no percentage, no verdict word.
  for (const s of seen) {
    ok(!/\d\s*%|percent/i.test(s), `slice copy carries a rate: "${s}"`);
    ok(!/\b(Republican|Democrat|Democratic|GOP|party|partisan|caucus)\b/i.test(s),
      `slice copy names a party: "${s}"`);
    ok(!/\b(incomplete|limited record|early in term|early in their term|thin record|inexperienced)\b/i.test(s),
      `slice copy carries a verdict about the person rather than the file: "${s}"`);
    ok(!/\b(likely|probably|appears|seems|suggests|extreme|loyal|rubber ?stamp)\b/i.test(s),
      `slice copy reads intent off the record: "${s}"`);
    has(s, "not a career score", `slice copy dropped the half that does the work: "${s}"`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
section("2 · the three yes files — where the sentence is true");
// ═══════════════════════════════════════════════════════════════════════════════
{
  for (const pid of YES) {
    const h = hero(pid);
    const p = prof(W, pid);
    // The office leg, stated out loud: these are the U.S. Representatives the
    // brief names, and they are the cohort the sentence was written for.
    eq(String((p && p.office) || ""), "U.S. Representative",
      `${pid} is no longer a U.S. Representative — the three-yes list needs re-measuring`);
    const s = sliceOf(h);
    ok(s !== null, `${pid}: the slice sentence did not print on a file that is exactly one session's House rolls`);
    if (s === null) continue;
    const sh = CS.formalPatternIndex.shape(pid);
    const inv = INV.read(pid);
    const mc = W._pdxRecordMappedCounts(pid);
    must(sh && inv && inv.formal && mc, `${pid}: the counts this file cross-checks are not published`);
    // These three agree in the shipped corpus, so N is printed and it is 23.
    eq(s, LINE_N(inv.formal.acts),
      `${pid}: the sentence does not name the count the inventory publishes (${inv.formal.acts})`);
    eq(inv.formal.acts, mc.votes,
      `${pid}: the inventory's act count and the record lane's distinct-instrument count no longer agree — the sentence must then print with no number`);
    ok(inv.formal.acts <= CUTOFF,
      `${pid}: ${inv.formal.acts} acts is above the documented cutoff of ${CUTOFF} — it should have gone silent`);
    ok(sh.judged > 0, `${pid}: the sentence printed on a file with no judged acts`);
    // The chips it describes are still the ones the brief names, in the engine's
    // own order. The sentence may not have touched them.
    has(visible(h), "Strongest patterns", `${pid}: the strongest-patterns list is gone`);
    eq(sh.tops.length, 3, `${pid}: the file no longer leads with three chips`);
    has(visible(h), "23 votes and formal actions read",
      `${pid}: the census the number is a re-print of is not on the block`);
  }
  // And the number in the sentence is the number in the census, on the same block.
  for (const pid of YES) {
    const h = hero(pid);
    const s = sliceOf(h) || "";
    const n = (/Pattern from (\d+) /.exec(s) || [])[1];
    // A missing sentence is a FAILURE, not a stale probe — section 2 has already
    // reported it, and aborting here would hide every fence below.
    ok(!!n, `${pid}: no number in the slice sentence to cross-check against the census`);
    if (!n) continue;
    const census = /<p class="pdxwa-shape-depth">([\s\S]*?)<\/p>/.exec(h);
    must(census, `${pid}: the census paragraph is no longer where this file looks for it`);
    has(census[1], `<b>${n}</b>`,
      `${pid}: the sentence says ${n} and the census above it does not print ${n}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
section("3 · the silent files — where it would be false, or redundant");
// ═══════════════════════════════════════════════════════════════════════════════
{
  // Deep federal files. Two of them are Senators and one is a Representative
  // whose file spans three Congresses — the point being that the office string
  // could never have carried this decision on its own.
  for (const pid of NO_FEDERAL_DEEP) {
    const h = hero(pid);
    ok(sliceOf(h) === null, `${pid}: a deep federal file printed the slice sentence`);
    no(h, "not a career score", `${pid}: the career-score words reached a deep file`);
    const recs = corpus.byMember.get(pid) || [];
    const congs = new Set(recs.map((r) => r.congress));
    const chs = new Set(recs.map((r) => r.chamber));
    const inv = INV.read(pid);
    // Each one is silenced for a reason this file can name, and at least one of
    // the reasons has to actually hold — otherwise the silence is a coincidence.
    ok(congs.size > 1 || chs.size > 1 || chs.has("senate") ||
       (inv && inv.formal && inv.formal.acts > CUTOFF),
      `${pid} is silent for no reason this file can name — congresses=${congs.size}, chambers=[${[...chs]}], acts=${inv && inv.formal && inv.formal.acts}`);
  }
  // sarah_mcbride is the file the CUTOFF itself silences: House only, one
  // Congress, and 150 judged acts across 86 distinct rolls. Without the cutoff
  // leg she would print, so the leg is load-bearing and this proves it.
  {
    const recs = corpus.byMember.get("sarah_mcbride") || [];
    must(recs.length, "sarah_mcbride is no longer in the corpus — the cutoff needs re-measuring");
    eq(new Set(recs.map((r) => r.chamber)).size, 1, "sarah_mcbride's file is no longer single-chamber");
    eq(new Set(recs.map((r) => r.congress)).size, 1, "sarah_mcbride's file is no longer single-Congress");
    const inv = INV.read("sarah_mcbride");
    ok(inv && inv.formal && inv.formal.acts > CUTOFF,
      `sarah_mcbride's ${inv && inv.formal && inv.formal.acts} acts no longer exceed the cutoff — the cutoff leg is doing no work`);
  }
  // Utah state-only files: no federal record lane at all, and nothing that could
  // be called a House roll.
  for (const pid of NO_UTAH) {
    const h = hero(pid);
    ok(sliceOf(h) === null, `${pid}: a Utah state file printed a sentence about House rolls`);
    no(h, "House rolls", `${pid}: the words "House rolls" reached a Utah state file`);
    ok(!corpus.byMember.get(pid), `${pid} now has federal roll calls on file — the two-no list needs re-measuring`);
  }
  // A file with zero judged acts keeps the block's own absence copy. The slice
  // sentence is about where patterns came from; with no patterns it describes
  // nothing, and reusing it on an empty lane would be the block's third answer
  // to "is there a record here".
  for (const pid of NO_EMPTY_LANE) {
    const h = hero(pid);
    ok(sliceOf(h) === null, `${pid}: the slice sentence stood in for the empty-lane copy`);
    no(h, "not a career score", `${pid}: the career-score words reached a file with nothing characterised`);
    const sh = CS.formalPatternIndex.shape(pid);
    eq(sh.characterised, 0, `${pid} now characterises something — the no-list needs re-measuring`);
    // The locked absence copy this file is entitled to is still the one it prints.
    has(visible(h), "No issue yet has a record one-sided enough to characterise",
      `${pid}: the block's own locked refusal is gone`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
section("4 · every rendering in the corpus earns its sentence");
// ═══════════════════════════════════════════════════════════════════════════════
{
  // The sweep, not the seven named files: for every member in the corpus, the
  // sentence printed if and only if all four legs hold, and where it printed
  // with a number that number is the one the inventory publishes.
  let printed = 0, withN = 0, bare = 0;
  const wrong = [], badN = [];
  for (const [pid, recs] of corpus.byMember) {
    const s = sliceOf(hero(pid));
    const sh = CS.formalPatternIndex.shape(pid);
    const inv = INV.read(pid);
    const mc = W._pdxRecordMappedCounts(pid);
    const acts = inv && inv.formal ? inv.formal.acts : null;
    const rolls = mc ? mc.votes : null;
    const houseOnly = recs.every((r) => r.chamber === "house" && r.kind !== "position" && r.rollNumber != null && r.congress != null);
    const oneCongress = new Set(recs.map((r) => r.congress)).size === 1;
    const earned = !!(sh && sh.judged > 0) && houseOnly && oneCongress &&
      acts > 0 && acts <= CUTOFF && rolls > 0 && rolls <= CUTOFF;
    if (earned !== (s !== null)) wrong.push(`${pid}(earned=${earned},printed=${s !== null})`);
    if (s === null) continue;
    printed++;
    const n = (/Pattern from (\d+) /.exec(s) || [])[1];
    if (n) { withN++; if (Number(n) !== acts || acts !== rolls) badN.push(`${pid}:${n}≠${acts}/${rolls}`); }
    else { bare++; if (acts === rolls) badN.push(`${pid}: counts agree at ${acts} and no number printed`); }
  }
  eq(wrong.slice(0, 6).join(" "), "", `the sentence printed where it was not earned, or went missing where it was (${wrong.length} files)`);
  eq(badN.slice(0, 6).join(" "), "", `a printed number is not the count the inventory publishes (${badN.length} files)`);
  ok(printed > 200, `only ${printed} files printed the sentence — the R1 cohort is ~322`);
  ok(withN > 0 && bare > 0,
    `only one branch of the number rule is live (withN=${withN}, bare=${bare})`);
  console.log(`      ${printed} briefs carry it — ${withN} with the count, ${bare} without, ${corpus.byMember.size - printed} silent`);
}

// ═══════════════════════════════════════════════════════════════════════════════
section("5 · it sits under what it describes");
// ═══════════════════════════════════════════════════════════════════════════════
{
  for (const pid of YES) {
    const h = hero(pid);
    const at = h.indexOf('class="pdxwa-shape-slice"');
    ok(at > 0, `${pid}: the slice node is not in the hero, so its position cannot be held`);
    if (at <= 0) continue;
    // Under the census and under the pattern list; above the route out and the
    // demoted Direction Match. Never above the heading the block opens with —
    // the person's name is rendered by the profile header, above all of this, and
    // a note about the file may not lead a person's page.
    const before = ['class="pdxwa-shape-hd"', 'class="pdxwa-shape-depth"',
      'class="pdxwa-shape-grp-h"', 'class="pdxwa-shape-list"'];
    for (const sel of before) {
      const i = h.indexOf(sel);
      must(i >= 0, `${pid}: ${sel} is no longer on the block`);
      ok(i < at, `${pid}: the slice sentence prints above ${sel}`);
    }
    const after = ['class="pdxwa-shape-all"', 'class="pdxwa-shape-dm'];
    for (const sel of after) {
      const i = h.indexOf(sel);
      if (i < 0) continue;
      ok(i > at, `${pid}: the slice sentence prints below ${sel}`);
    }
    // The heading text of the group it hangs under, so "under the list" is a
    // claim about the reading order and not just the markup order.
    const v = visible(h);
    ok(v.indexOf("Strongest patterns") < v.indexOf("not a career score"),
      `${pid}: a reader meets the slice note before the patterns it describes`);
    ok(v.indexOf("on the formal record") < v.indexOf("not a career score"),
      `${pid}: a reader meets the slice note before the census it re-prints`);
  }
  // Both mounts carry it — the letterhead above the depth gate and the brief
  // below it — through one function, so the two cannot drift into two wordings.
  const calls = [...WA_SRC.matchAll(/sliceNoteHtml\(pid, sh\)/g)].length;
  ok(calls >= 2, `the slice note is mounted ${calls} time(s); the letterhead and the brief both need it`);
  has(WA_SRC, "tops + splits + thin + sliceNoteHtml(pid, sh) +",
    "the letterhead no longer mounts the note under its pattern list");
  has(WA_SRC, "tops + splits + none + thin + sliceNoteHtml(pid, sh) +",
    "the brief no longer mounts the note under its pattern list");
  // A file above the depth gate proves the letterhead mount is reachable rather
  // than merely present in the source.
  let letterhead = null;
  for (const [pid] of corpus.byMember) {
    const sh = CS.formalPatternIndex.shape(pid);
    if (!sh || sh.issues < WA.SHAPE_MIN || sh.read < WA.SHAPE_MIN_READ) continue;
    if (sliceOf(hero(pid))) { letterhead = pid; break; }
  }
  ok(!!letterhead, "no file above the depth gate prints the note — the letterhead mount is unreachable");
  if (letterhead) console.log(`      letterhead mount live on ${letterhead}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
section("6 · the gate reads published counts, and moves nothing");
// ═══════════════════════════════════════════════════════════════════════════════
{
  const m = /var SLICE_CUTOFF = (\d+);/.exec(WA_SRC);
  must(m, "SLICE_CUTOFF is no longer spelled in word-action.js");
  eq(Number(m[1]), CUTOFF,
    `word-action.js's cutoff and this harness's documented cutoff disagree — one of them was changed alone`);

  // The gate's own span: it reads three already-published figures and does no
  // arithmetic of its own. No score, no rate, no weight, no floor.
  const gate = /var SLICE_CUTOFF[\s\S]*?function sliceNoteHtml[\s\S]*?\n  \}\n/.exec(WA_SRC);
  must(gate, "the slice gate is no longer a contiguous span in word-action.js");
  // Comments and string literals come out before the scan, for the same reason the
  // dossier's word-wall exempts a bill's own short title: the sentence itself
  // contains the word "score", because saying "not a career score" is the whole
  // job. What is being scanned is the code around it — the reads it makes and the
  // arithmetic it is not allowed to do.
  const body = gate[0].replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
  ok(!/toFixed|Math\.round|Math\.max|Math\.min|\/\s*100|\*\s*100/.test(body),
    "the slice gate grew arithmetic of its own");
  ok(!/\bpct\b|percent|\bscore\b|\bweight\b/.test(body), "the slice gate reads a score");
  ok(!/\.party\b|Republican|Democrat/i.test(body), "the slice gate reads a party");
  has(body, "formal.acts", "the gate no longer reads the inventory's published act count");
  has(body, "_pdxRecordMappedCounts", "the gate no longer cross-checks the record lane's distinct-instrument count");
  has(body, "memberRecords", "the gate no longer checks the chamber and Congress of the lane it describes");

  // The floor did not move, and this pass did not touch the file that owns it.
  const PF = R("publication-floor.js");
  has(PF, "var MIN_CITED_POSITIONS = 2;", "the publication floor moved");
  eq(PF, HEAD("publication-floor.js"), "publication-floor.js changed in a copy-only pass");
  for (const f of ["consistency.js", "voting-record.js", "inventory.js", "stance-helpers.js",
                   "cmp-data.js", "formal-index.js", "sitemap.xml"]) {
    const h = HEAD(f);
    if (h === null) continue;
    // stance-helpers.js and consistency.js carry the previous pass's seams; what
    // matters here is that THIS pass added nothing to them.
    if (f === "stance-helpers.js" || f === "consistency.js") {
      const gained = R(f).split("\n").filter((l) => !h.includes(l));
      ok(!gained.some((l) => /House rolls|career score|SLICE_/.test(l)),
        `${f} gained a line of the slice pass — the sentence belongs to the renderer alone`);
      continue;
    }
    eq(R(f), h, `${f} changed in a copy-only pass`);
  }

  // The service worker ships the renderer and its stylesheet as a pair.
  const SW = R("sw.js");
  const v = /const CACHE_VERSION = 'v(\d+)';/.exec(SW);
  must(v, "sw.js's CACHE_VERSION no longer reads as written");
  ok(Number(v[1]) >= 104,
    `CACHE_VERSION is v${v[1]} — word-action.js and word-action.css changed together and a warm device would serve one of each`);
  has(SW, "// v104 - ", "sw.js's version log has no v104 entry in the repo's convention");
  const CSS = R("word-action.css");
  has(CSS, ".pdxwa-shape-slice {", "word-action.css has no rule for the node the renderer emits");
  ok(!/font-weight:\s*(700|800|bold)/.test(/\.pdxwa-shape-slice \{[^}]*\}/.exec(CSS)[0]),
    "the slice note is styled as a banner rather than a note");
}

// ═══════════════════════════════════════════════════════════════════════════════
section("7 · twin boot — one new node, nothing else");
// ═══════════════════════════════════════════════════════════════════════════════
{
  const H = boot(HEAD);
  must(H.PDXWordAction && typeof H.PDXWordAction.heroHtml === "function",
    "HEAD's word-action.js did not boot");
  let identical = 0, nodeOnly = 0;
  const drifted = [];
  for (const [pid] of corpus.byMember) {
    const a = H.PDXWordAction.heroHtml(pid, prof(H, pid)) || "";
    const b = hero(pid);
    if (a === b) { identical++; continue; }
    if (b.replace(SLICE_RE, "") === a) { nodeOnly++; continue; }
    drifted.push(pid);
  }
  eq(drifted.slice(0, 6).join(" "), "",
    `${drifted.length} formal brief(s) changed by more than the one new node`);
  // …AND `nodeOnly > 0` EXPIRED THE DAY THE RENDERER LANDED IN HEAD. It asked the
  // twin boot to WATCH the new node arrive, which is a thing that can only be seen
  // while word-action.js is uncommitted; against a HEAD that already ships the
  // sentence, every brief comes out identical, and identical is the passing case
  // here, not the failing one. The two facts still worth holding are kept: every
  // brief in the corpus is accounted for by one of the two buckets and nothing
  // drifted (above), and the sentence really is on the live corpus — section 5
  // counts that directly, off the live boot, and requires more than 200 files.
  eq(identical + nodeOnly, corpus.byMember.size,
    "a brief fell out of both buckets — every file is either untouched or differs by the node alone");
  ok(identical > 0, `twin boot rendered nothing at all (identical=${identical}, nodeOnly=${nodeOnly})`);
  console.log(`      ${identical} briefs byte-identical, ${nodeOnly} differ only by the new node`);

  // The three the brief pins are byte-identical, node included.
  for (const pid of ["lee", "curtis", "bmoore"]) {
    eq(hero(pid), H.PDXWordAction.heroHtml(pid, prof(H, pid)) || "",
      `${pid}: the formal brief is not byte-identical to HEAD`);
  }
  // Direction Match, the word ledger and every shape count, everywhere.
  const dm = [], sp = [];
  for (const [pid] of corpus.byMember) {
    for (const sc of Object.keys(CS.SCOPES)) {
      if (JSON.stringify(H.PDXConsistency.scopedOverall(sc, pid)) !==
          JSON.stringify(CS.scopedOverall(sc, pid))) dm.push(`${pid}/${sc}`);
    }
    if (JSON.stringify(H.PDXWordAction.read(pid)) !== JSON.stringify(WA.read(pid))) dm.push(`${pid}/ledger`);
    if (JSON.stringify(H.PDXConsistency.formalPatternIndex.shape(pid)) !==
        JSON.stringify(CS.formalPatternIndex.shape(pid))) sp.push(pid);
  }
  eq(dm.slice(0, 6).join(" "), "", `Direction Match or the word ledger drifted on ${dm.length} reads`);
  eq(sp.slice(0, 6).join(" "), "", `the formal shape drifted on ${sp.length} files`);
  console.log(`      ${corpus.byMember.size} members swept: no drift in Direction Match, the ledger or any shape count`);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ brief slice disclosure: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("   · " + f);
  console.error("");
  process.exit(1);
}
console.log(`✓ brief slice disclosure: the brief names the slice and never implies a career — ${passed} assertions passed\n`);
