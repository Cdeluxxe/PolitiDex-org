#!/usr/bin/env node
/**
 * test-wva-one-tested-set.mjs — the chip and the section share one tested set
 * ─────────────────────────────────────────────────────────────────────────────
 * THE DEFECT THIS FILE OWNS, AND IT WAS LIVE. The letterhead Word vs Action chip
 * and the ⚖️ Word vs Action section report the same finding about the same person,
 * a screen apart. On /p/lee they reported two different SIZES of it:
 *
 *     chip     84% · 5 of 14 tested · Backs it up
 *     section  72%   ·   15 of 26 tested
 *
 * and curtis drifted the same way. Neither figure was invented. Each was a
 * faithful print of a read taken at a different moment — this ledger grows during
 * a page's life as the roll-call record lands and the lazy data bundles merge —
 * and that is exactly what made the pair a lie, because a reader cannot see which
 * tick a number came from. Giving the chip a denominator was the right fix; two
 * different "tested" counts on one page is a new one.
 *
 * There were two mechanisms, and this file pins the removal of both.
 *
 *   THE SCOPE. The chip called read(pid, p) bare, at whatever term scope the
 *   engine happened to be left in. The section and the consistency ring call
 *   scopedRead(pid, p) and print `.main`. On the executive lane those are two
 *   questions, and nothing on screen said which one a number answered.
 *
 *   THE AGE. There were three repaint contracts in one file. The ring's listens
 *   on every arrival event in HERO_REPAINT, matches the pid through evForPid (one
 *   alias hop on each side), keeps a `seen` guard so it cannot unbind before its
 *   host has ever existed, and takes one reconciling paint on the next tick. The
 *   chip's and the section's each had one event, a strict `detail.pid` and an
 *   unbind on the first missing host — three ways to go deaf, which is how a chip
 *   holds its first-paint read for the life of a page while the section beside it
 *   moves on.
 *
 * THE FIX IS ONE OWNER. figure(pid, p) answers, for one pid: the percentage, the
 * tested count, the eligible count, the outcome token, and the one fraction
 * sentence those two integers make. The chip and the section both print THAT
 * object, and both arm the ring's contract. Where both halves cannot be said the
 * chip is ABSENT — never a smaller, secret set with a percentage still on it.
 *
 * WHAT THIS FILE PINS
 *
 *   1. THE THREE NAMED PEOPLE. For lee, curtis and thune the chip's visible N of
 *      M is the section's N of M, character for character, and the percentages
 *      are equal — asserted on the rendered HTML of both surfaces, not on the
 *      object behind them.
 *   2. AND EVERYBODY ELSE. The same equality swept across the whole roster, in
 *      both record states, with the tuple both surfaces stamp compared field by
 *      field.
 *   3. BOTH HALVES OR NEITHER. No published chip carries a percentage without a
 *      set sizing it, and below the floor there is no chip at all — not a chip
 *      with a smaller set on it.
 *   4. THE ACCESSIBLE NAME IS THE SAME N OF M, not a shortened one.
 *   5. ONE READ, ONE SCOPE. The owner goes through scopedRead(), the chip asks
 *      the engine nothing directly, and the section pays for one scoring pass.
 *   6. ONE REPAINT CONTRACT, BY REFERENCE. Both surfaces arm the ring's, so the
 *      event list, the alias hop, the seen guard and the reconciling paint cannot
 *      exist in three versions again.
 *   7. STILL ONE DOOR. The chip is one control and it still jumps to the section.
 *   8. THE ARITHMETIC NEVER SAW THIS. Twin boot against HEAD over the whole
 *      corpus: the pair list and the Direction Match ledger are byte-identical,
 *      and so are the formal tiers and the scoped overall beside them.
 *   9. THE FIX IS LOAD-BEARING. Four counterfactuals — the chip back on its own
 *      bare read, a percentage published with no set, the chip back on its own
 *      one-event contract, and the section back on its own — each has to be
 *      caught by the sections above.
 *
 *   node scripts/test-wva-one-tested-set.mjs
 *
 * Real shipped modules in a node:vm sandbox, the real roster and the offline
 * record corpus. Every string asserted below is a string this harness painted.
 */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox, ENGINE_FILES } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HEAD = (f) => {
  try {
    return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch { return null; }
};

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — ${JSON.stringify(needle)} missing`);
const no = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — ${JSON.stringify(needle)} present`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`\n✗ wva one tested set: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

const text = (html) => String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const attr = (html, name) => {
  const m = new RegExp(name + '="([^"]*)"').exec(String(html));
  return m ? m[1] : null;
};

// The profile stack, as index.html defers it, up to and including the module
// this pass edited.
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "profile-spine.js",
];
const SRC = new Map(FILES.map((f) => [f, R(f)]));
const WA_SRC = SRC.get("word-action.js");

const corpus = buildCorpus(ROOT);
must(corpus && corpus.byMember && corpus.byMember.size > 300,
  "the record corpus did not load enough members to sweep");

// `mutants` rewrites one shipped file before it is evaluated, so a counterfactual
// runs the real module with one line changed rather than a paraphrase of it.
// `warm` seeds the offline record, which is the state a settled page is in — and
// the state in which the two surfaces used to disagree.
function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    let src = SRC.get(f);
    const muts = opts.mutants && opts.mutants[f];
    if (muts) {
      for (const [from, to] of muts) {
        must(src.indexOf(from) >= 0, `mutation anchor moved in ${f}: ${from.slice(0, 80)}`);
        src = src.replace(from, to);
      }
    }
    vm.runInContext(src, sandbox, { filename: f });
  }
  win.PROFILES = win.CMP_DATA;
  if (opts.warm) {
    for (const [pid, recs] of corpus.byMember) {
      try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
    }
  }
  return win;
}

const win = boot({ warm: true });
const WA = win.PDXWordAction;
must(WA && typeof WA.compactBadgeHtml === "function" && typeof WA.sectionHtml === "function",
  "PDXWordAction no longer publishes compactBadgeHtml()/sectionHtml(), so every assertion is vacuous");
must(typeof WA.figure === "function" && typeof WA.fractionOf === "function",
  "PDXWordAction does not publish the shared figure, so this file cannot hold the object both " +
  "surfaces are supposed to be printing");

const P = (id) => win.CMP_DATA[id];
const ROSTER = Object.keys(win.CMP_DATA || {});
must(ROSTER.length > 300, `the roster loaded ${ROSTER.length} people, which is too few to sweep`);

// ── The pair, as a reader meets it ───────────────────────────────────────────
// The chip's visible N of M is read out of the chip's own markup; the section's is
// read out of the number block it stamps. Both are strings this harness painted
// from the shipped renderers.
const pair = (w, pid) => {
  const W = w.PDXWordAction;
  let chip = "", sec = "";
  try { chip = W.compactBadgeHtml(pid, w.CMP_DATA[pid]) || ""; } catch { chip = ""; }
  try { sec = W.sectionHtml(pid, w.CMP_DATA[pid]) || ""; } catch { sec = ""; }
  const chipDen = (/<span class="pdxwa-cbadge-den">([^<]*)<\/span>/.exec(chip) || [])[1] || "";
  const chipPct = (/<span class="pdxwa-cbadge-pct"[^>]*>(\d+)%<\/span>/.exec(chip) || [])[1] || "";
  return {
    pid, chip, sec,
    chipShown: chip !== "",
    chipDen, chipPct,
    chipFig: attr(chip, "data-pdxwa-fig"),
    chipAria: attr(chip, "aria-label") || "",
    secSet: attr(sec, "data-pdxwa-set"),
    secFig: attr(sec, "data-pdxwa-fig"),
    secTested: attr(sec, "data-pdxwa-tested"),
  };
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · lee, curtis, thune — the three the smoke named");
// ═════════════════════════════════════════════════════════════════════════════
{
  const NAMED = ["lee", "curtis", "thune"];
  const seen = NAMED.filter((pid) => P(pid));
  must(seen.length === NAMED.length,
    `the roster no longer carries ${NAMED.filter((p) => !P(p)).join(", ")}, so the three people the ` +
    "live smoke named cannot be checked by name");
  for (const pid of NAMED) {
    const x = pair(win, pid);
    ok(x.chipShown, `${pid}: no chip at all, so the pair this file is about cannot be compared`);
    ok(x.sec !== "", `${pid}: no ⚖️ section rendered`);
    // THE CLAIM, IN THE ONLY FORM THAT MATTERS: the two visible strings.
    eq(x.chipDen, x.secSet,
      `${pid}: the chip's visible tested set is not the section's. This is the /p/lee defect exactly — ` +
      "\"84% · 5 of 14 tested\" beside the name and 72% over 15 of 26 a screen below");
    ok(x.chipDen !== "", `${pid}: the chip published a percentage with no tested set sizing it`);
    // …and the percentages, from the two rendered surfaces.
    const secPct = (/<div class="pdxwa-num-pct"[^>]*>(\d+)%<\/div>/.exec(x.sec) ||
                    /(\d+)%/.exec(text(x.sec)) || [])[1] || "";
    eq(x.chipPct, secPct, `${pid}: the chip's percentage is not the section's`);
    // …and the whole tuple, stamped by both, so a future drift names its field.
    eq(x.chipFig, x.secFig,
      `${pid}: the two surfaces stamped different figures — pct|tested|eligible|token, in that order`);
    console.log(`      ${pid}: chip ${x.chipPct}% · ${x.chipDen}  ≡  section ${secPct}% · ${x.secSet}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · and the same for everybody, in both record states");
// ═════════════════════════════════════════════════════════════════════════════
{
  const cold = boot({});
  for (const [label, w] of [["warm", win], ["cold", cold]]) {
    const drift = [];
    let compared = 0, chips = 0;
    for (const pid of ROSTER) {
      const x = pair(w, pid);
      if (!x.chipShown) continue;
      chips++;
      if (x.sec === "") { drift.push(`${pid}/no-section`); continue; }
      compared++;
      if (x.chipDen !== x.secSet) drift.push(`${pid}: chip "${x.chipDen}" vs section "${x.secSet}"`);
      if (x.chipFig !== x.secFig) drift.push(`${pid}/tuple: ${x.chipFig} vs ${x.secFig}`);
    }
    // A cold boot is the first paint, before the record has been noted: only the
    // handful of people whose word is testable against already-loaded data can
    // publish a figure at all. That is the state the pair drifted in, so it is swept
    // too, but it cannot be held to the warm boot's population.
    ok(chips > (label === "warm" ? 100 : 0),
      `the ${label} boot painted only ${chips} chips, which is too few for this sweep to mean anything`);
    eq(drift.slice(0, 5).join(" | "), "",
      `${drift.length} of ${compared} people (${label} record) are shown two different tested sets on ` +
      "one page. One function owns the figure; two surfaces print it, or neither does");
    console.log(`      ${label}: ${compared} pairs compared, every one identical`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · both halves or neither — and below the floor, no chip");
// ═════════════════════════════════════════════════════════════════════════════
{
  const naked = [], below = [];
  for (const pid of ROSTER) {
    const f = WA.figure(pid, P(pid));
    const x = pair(win, pid);
    if (x.chipShown && x.chipDen === "") naked.push(pid);
    if (f.pct === null) {
      below.push(pid);
      // THE CONTRACT'S OWN WORDS: if they must differ, the chip is ABSENT — never
      // a smaller secret set that still shows a %.
      if (x.chipShown) naked.push(`${pid}/below-floor`);
    }
  }
  ok(below.length > 20, `only ${below.length} people sit below the publication floor, which is too few to prove`);
  eq(naked.slice(0, 5).join(", "), "",
    `${naked.length} chip(s) show a figure with no set sizing it, or show one below the publication ` +
    "floor. Where both halves cannot be said the chip renders nothing");
  // AND `shows` IS THE ONE GATE, not two agreeing gates.
  for (const pid of ROSTER.slice(0, 120)) {
    const f = WA.figure(pid, P(pid));
    const x = pair(win, pid);
    eq(x.chipShown, f.shows, `${pid}: the chip's presence does not follow the shared figure's own \`shows\``);
  }
  // The empty fraction is a deliberate answer, not an accident of formatting.
  eq(WA.fractionOf(0, 0), "", "fractionOf printed something for a set of nothing");
  eq(WA.fractionOf(5, 0), "", "fractionOf sized a figure against an eligible count of zero");
  eq(WA.fractionOf(5, 14), "5 of 14 tested", "fractionOf is no longer the section's own wording");
  console.log(`      ${below.length} below the floor, none with a chip; no chip anywhere carries a bare %`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the accessible name is the same N of M, not a shortened one");
// ═════════════════════════════════════════════════════════════════════════════
{
  const thin = [];
  let checked = 0;
  for (const pid of ROSTER) {
    const x = pair(win, pid);
    if (!x.chipShown) continue;
    checked++;
    if (x.chipAria.indexOf(x.chipDen) < 0) thin.push(`${pid}: "${x.chipAria}"`);
    if (x.chipAria.indexOf(x.chipPct + "%") < 0) thin.push(`${pid}/pct`);
  }
  eq(thin.slice(0, 3).join(" | "), "",
    `${thin.length} of ${checked} chips read out a figure without the set that sizes it. A screen ` +
    "reader hearing \"90 per cent, Backs it up\" has been handed the exact impression the visible " +
    "chip was fixed to stop giving");
  const one = pair(win, "lee");
  has(one.chipAria, one.chipDen, "lee's accessible name omits the tested set");
  has(one.chipAria, "Open", "the chip's accessible name no longer says it opens anything");
  console.log(`      ${checked} accessible names, each carrying the same N of M as the visible chip`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · one read, one scope — and one door");
// ═════════════════════════════════════════════════════════════════════════════
{
  const figAt = WA_SRC.indexOf("function figure(pid, p, pre)");
  must(figAt > 0, "word-action.js no longer owns the shared figure");
  const owner = WA_SRC.slice(figAt, figAt + 900);
  has(owner, "var sr = pre || scopedRead(pid, p);",
    "the owner takes a bare read() instead of the scopedRead() the section and the ring take. Same " +
    "object, different term scope, and nothing on screen says which one a reader is looking at");
  const cbAt = WA_SRC.indexOf("function compactBadgeHtml");
  must(cbAt > 0, "word-action.js no longer has compactBadgeHtml");
  const chipSrc = WA_SRC.slice(cbAt, cbAt + 1400);
  has(chipSrc, "var f = figure(pid, p);", "the chip does not print the shared figure");
  ok(!/\bread\(pid, p\)|scopedRead\(/.test(chipSrc),
    "the chip reads the engine directly again, which is one of the two mechanisms that produced " +
    "two tested counts on one page");
  // The section pays for ONE scoring pass: it hands its own read to the owner.
  const secAt = WA_SRC.indexOf("var fig = figure(pid, p, sr);");
  ok(secAt > 0, "the section no longer hands its own read to the owner, so it scores twice to print once");
  // STILL ONE DOOR.
  const chip = pair(win, "lee").chip;
  eq((chip.match(/<button/g) || []).length, 1, "the chip is no longer a single control");
  has(chip, "pdxsec-wordaction", "the chip no longer leads to ⚖️ Word vs Action — one tap must still jump to the section");
  console.log("      owner → scopedRead; chip → owner; section → one pass; one button, one door");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · one repaint contract, held by reference");
// ═════════════════════════════════════════════════════════════════════════════
{
  const armAt = WA_SRC.indexOf("function armFigureRepaint(find, pid, paint)");
  must(armAt > 0, "the shared repaint contract is gone from word-action.js");
  const arm = WA_SRC.slice(armAt, armAt + 900);
  has(arm, "if (!evForPid(ev, pid)) return;", "the shared contract matches the pid strictly again");
  has(arm, "if (seen) evs.forEach", "the shared contract can unbind before its host has ever been seen");
  has(arm, "setTimeout(function () { handler(null); }, 0);", "the shared contract has no reconciling paint");
  const evAt = WA_SRC.indexOf("function figureEvents()");
  must(evAt > 0, "the shared contract no longer names where its event list comes from");
  has(WA_SRC.slice(evAt, evAt + 300), "HERO_REPAINT",
    "the shared contract spells its own event list instead of reading the ring's, which is a second " +
    "list, which is a list that drifts");
  // Both binders are ON it, and neither carries a contract of its own.
  for (const [fn, why] of [["function bindCompactBadge(uid, pid, p) {", "the letterhead chip"],
                           ["function bind(uid, pid, p) {", "the ⚖️ section"]]) {
    const i = WA_SRC.indexOf(fn);
    must(i > 0, `${why}'s binder is gone from word-action.js`);
    const head = WA_SRC.slice(i, i + 260);
    has(head, "armFigureRepaint(function () {", `${why} does not arm the shared repaint contract`);
    ok(!/addEventListener|detail\.pid/.test(head),
      `${why} subscribes or matches on its own again — a surface on its own contract is a surface ` +
      "that can be a different age than the one beside it");
  }
  console.log("      chip and section both armed on the ring's contract, by reference");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · twin boot — the pair list and the DM ledger never saw this");
// ═════════════════════════════════════════════════════════════════════════════
{
  const engine = (get) => {
    const w = makeSandbox();
    const ctx = vm.createContext(w);
    w.PROFILES = w.CMP_DATA;
    for (const f of [...ENGINE_FILES, "voting-record.js"]) {
      const src = get(f);
      if (src === null) continue;
      vm.runInContext(src, ctx, { filename: f });
    }
    w.PROFILES = w.CMP_DATA;
    for (const [pid, recs] of corpus.byMember) {
      try { w.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
    }
    return w;
  };
  const B = engine(R);
  must(B.PDXWordAction && typeof B.PDXWordAction.read === "function",
    "the working tree's word-action.js did not boot in the twin");
  const A = engine(HEAD);
  if (!A.PDXWordAction || typeof A.PDXWordAction.read !== "function") {
    console.log("      no HEAD copy available in this checkout — twin boot skipped");
  } else {
    const drift = [];
    let swept = 0;
    for (const [pid] of corpus.byMember) {
      swept++;
      if (JSON.stringify(A.PDXWordAction.read(pid)) !== JSON.stringify(B.PDXWordAction.read(pid))) {
        drift.push(`${pid}/ledger`);
      }
      const sc = A.CMP_DATA[pid];
      if (A.PDXConsistency && B.PDXConsistency) {
        if (JSON.stringify(A.PDXConsistency.scopedOverall(sc, pid)) !==
            JSON.stringify(B.PDXConsistency.scopedOverall(B.CMP_DATA[pid], pid))) drift.push(`${pid}/dm`);
        if (JSON.stringify(A.PDXConsistency.formalPatternIndex.shape(pid)) !==
            JSON.stringify(B.PDXConsistency.formalPatternIndex.shape(pid))) drift.push(`${pid}/formal`);
      }
    }
    ok(swept > 300, `the twin boot only swept ${swept} people`);
    eq(drift.slice(0, 6).join(" | "), "",
      `${drift.length} read(s) moved. This pass gave two renderers one object to print: the pair ` +
      "list, the Direction Match ledger and the formal tiers must be byte-identical to HEAD's");
    console.log(`      ${swept} members swept; pair list, DM ledger and formal tiers all byte-identical`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the fix is load-bearing");
// ═════════════════════════════════════════════════════════════════════════════
{
  // (a) The chip goes back to its own bare read at the ambient term scope. Today
  //     the two scopes happen to agree for every person on this roster, which is
  //     exactly why this regression is dangerous and why the guard against it is a
  //     SOURCE guard rather than an output one: the output would not move until the
  //     executive lane or a scope default did. So the counterfactual asserts what
  //     section 5 actually catches — put the bare read back and the assertion that
  //     the chip asks the engine nothing directly fails.
  {
    const anchor = "      var f = figure(pid, p);";
    eq(WA_SRC.split(anchor).length, 2,
      "the chip no longer opens on the shared figure, so this counterfactual is not the regression " +
      "it claims to be");
    const mutated = WA_SRC.replace(anchor,
      "      var f = figure(pid, p); var rr = read(pid, p);");
    const at = mutated.indexOf("function compactBadgeHtml");
    ok(/\bread\(pid, p\)|scopedRead\(/.test(mutated.slice(at, at + 1400)),
      "a chip that reads the engine directly is not visible in the span section 5 reads, so that " +
      "assertion is guarding nothing");
  }

  // (b) THE WRONG FIX: publish the percentage anyway when the set is missing —
  //     "a smaller secret set that still shows a %", which the contract names and
  //     refuses. Made reachable by withholding the fraction from thin reads, which
  //     is precisely the shape the defect took: the thin ones look strongest.
  {
    const b = boot({
      warm: true,
      mutants: {
        "word-action.js": [
          ["      shows: pct !== null && !!fraction,", "      shows: pct !== null,"],
          ["    var fraction = fractionOf(tested, eligible);",
           "    var fraction = (tested > 20) ? fractionOf(tested, eligible) : '';"],
        ],
      },
    });
    let naked = 0;
    for (const pid of ROSTER) {
      const x = pair(b, pid);
      if (x.chipShown && x.chipDen === "") naked++;
    }
    ok(naked > 20,
      `only ${naked} chip(s) published a figure with no set sizing it under the both-halves gate's ` +
      "removal, so section 3 is not proving that the gate is what keeps a bare percentage off the page");
    console.log(`      · a % with no set → ${naked} would reach the page, all caught by section 3`);
  }

  // (c) The chip goes back to a contract of its own — one event, a strict pid, an
  //     unbind on the first missing host. Section 6 reads a 260-character span at
  //     the head of each binder, so the regression has to be visible there.
  {
    const anchor = "  function bindCompactBadge(uid, pid, p) {\n    armFigureRepaint(function () {";
    eq(WA_SRC.split(anchor).length, 2,
      "the chip's binder no longer opens by arming the shared contract, so the counterfactual below " +
      "is not the regression it claims");
    const mutated = WA_SRC.replace(anchor,
      "  function bindCompactBadge(uid, pid, p) {\n" +
      "    window.addEventListener('pdx-consistency-warm', function (ev) {\n" +
      "      if (!ev || !ev.detail || ev.detail.pid !== pid) return;\n      (function () {");
    const at = mutated.indexOf("function bindCompactBadge");
    const head = mutated.slice(at, at + 260);
    ok(/addEventListener|detail\.pid/.test(head),
      "a chip back on its own one-event contract is not visible in the span section 6 reads");
    ok(head.indexOf("armFigureRepaint(function () {") < 0,
      "the mutated binder still arms the shared contract, so section 6 would pass it");
  }

  // (d) …and so does the section. Same span, same detection, so neither surface can
  //     drift back onto a private contract while the other stays on the shared one.
  {
    const anchor = "  function bind(uid, pid, p) {\n    armFigureRepaint(function () {";
    eq(WA_SRC.split(anchor).length, 2,
      "the ⚖️ section's binder no longer opens by arming the shared contract");
    const mutated = WA_SRC.replace(anchor,
      "  function bind(uid, pid, p) {\n    window.addEventListener('pdx-consistency-warm', function (ev) {");
    const at = mutated.indexOf("function bind(uid, pid, p) {");
    ok(/addEventListener/.test(mutated.slice(at, at + 260)) &&
       mutated.slice(at, at + 260).indexOf("armFigureRepaint(function () {") < 0,
      "a section back on its own one-event contract is not visible in the span section 6 reads");
  }
  console.log("      · bare read → caught  · own contract, either surface → caught");
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ wva one tested set: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error(`   · ${f}`);
  process.exit(1);
}
console.log(`\n✓ wva one tested set: all ${passed} assertions passed — one owner, one figure, ` +
  "printed twice or not at all\n");
