#!/usr/bin/env node
/**
 * test-wva-chip-denominator.mjs — a percentage arrives with what sizes it
 * ─────────────────────────────────────────────────────────────────────────────
 * THE DEFECT THIS FILE OWNS, AND IT WAS LIVE. The identity-block Word vs Action
 * chip, high on every person file, printed:
 *
 *     100% · Backs it up
 *
 * beside the person's name, on a page that also carries a hundred formal acts.
 * With no denominator that is not a measurement, it is a GRADE — and most of the
 * time it was standing on three statements. Of the 187 chips this corpus can
 * paint, 102 sit on exactly MIN_TESTED_ITEMS tested items: the publication floor
 * and not one item more. The two integers a reader needs in order to size the
 * figure — how many statements were tested, and how many were on offer to test —
 * were printed only in the ⚖️ Word vs Action section a screen below, which is
 * the section the chip is a door to. Which is to say: after the impression had
 * already been made.
 *
 * THE FIX IS ANNOTATION, NOT SUPPRESSION, AND IT INVENTS NO FLOOR. The chip now
 * prints the fraction the section already prints, in the section's own words:
 *
 *     84% · 5 of 14 tested · Backs it up
 *
 * Below MIN_TESTED_ITEMS read() still returns a null percentage and the chip
 * still renders nothing — that gate is untouched. Above it, every read that
 * painted a chip before this pass paints one now: a three-of-three read is not
 * hidden, it is LABELLED, which is the honest treatment of a figure that is true
 * and thin. Suppressing above the publication floor would be this one surface
 * inventing a second, higher floor that nothing else in the stack agrees with,
 * and a reader who saw a chip on one profile and none on the next would have no
 * way to know why.
 *
 * WHAT THIS FILE PINS
 *
 *   1. EVERY PUBLISHED CHIP CARRIES ITS DENOMINATOR. Swept across the whole
 *      roster and both record states, the visible text is exactly the figure,
 *      the fraction and the verdict word — and the fraction is read()'s own
 *      coverage integers, not a second count.
 *   2. THE FLOOR CASE IS LABELLED, NOT HIDDEN. Chips standing on exactly
 *      MIN_TESTED_ITEMS items print "3 of N tested", and there are a lot of
 *      them, which is the whole reason this pass happened.
 *   3. NO NEW FLOOR. The set of people who get a chip is IDENTICAL to the set
 *      that got one from the pre-denominator builder, on the same reads — and
 *      below the floor the chip is still empty.
 *   4. THE ARITHMETIC NEVER SAW THIS. Twin boot against HEAD: read()'s
 *      percentage, tested count, scorable count and publish flag are
 *      byte-identical for every person on the roster, and so are the formal
 *      tiers beside them.
 *   5. THE ACCESSIBLE NAME CARRIES THE FRACTION, because a screen reader that
 *      hears "71 per cent, Backs it up" has been handed the exact impression the
 *      visible chip was fixed to stop giving.
 *   6. IT IS THE SECTION'S OWN WORDS. The chip's fraction is character-identical
 *      to the string the apparatus lid and the Official Record feed row build
 *      for the same two integers, so a reader who scrolls down meets the same
 *      words rather than a paraphrase.
 *   7. IT IS STILL NOT A RANK, AND STILL ONE DOOR. Two integers on the chip are
 *      read back by nothing, order nothing, and the chip is still a single
 *      control that jumps to the section.
 *   8. THE DEEP FILE IS STILL RECORD-FIRST. The chip sits in the identity stage
 *      and the section it opens still reads below the topic tree, so the formal
 *      record is what a person file leads with.
 *   9. THE FILES TRAVEL TOGETHER behind a CACHE_VERSION that moved.
 *  10. THE FIX IS LOAD-BEARING. The pre-denominator builder is put back and the
 *      probes above have to catch it; so is a suppress-instead-of-annotate
 *      variant, which is the wrong fix and has to fail section 3.
 *
 *   node scripts/test-wva-chip-denominator.mjs
 *
 * Real shipped modules in a node:vm sandbox, the real roster, the real stance
 * register and the offline record corpus. Every string asserted below is a
 * string this harness painted out of word-action.js.
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
  console.error(`\n✗ wva chip denominator: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

const text = (html) => String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
function maxDepth(html, tag) {
  const re = new RegExp("<" + tag + "(?=[\\s>])|</" + tag + "\\s*>", "g");
  let d = 0, max = 0, m;
  while ((m = re.exec(html))) {
    if (m[0][1] === "/") d = Math.max(0, d - 1);
    else { d++; if (d > max) max = d; }
  }
  return max;
}

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

// `mutants` rewrites one shipped file before it is evaluated, so a
// counterfactual runs the real module with one line changed rather than a
// paraphrase of it. `warm` seeds the offline record, which is the state most of
// the roster is in once a page has settled — and the state that produces the
// thin, three-of-three chips this pass is about.
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
must(WA && typeof WA.read === "function" && typeof WA.compactBadgeHtml === "function",
  "PDXWordAction no longer publishes read()/compactBadgeHtml(), so every assertion here is vacuous");
must(typeof WA.sectionHtml === "function", "PDXWordAction lost sectionHtml()");

const P = (id) => win.CMP_DATA[id];
const ROSTER = Object.keys(win.CMP_DATA || {});
must(ROSTER.length > 300, `the roster loaded ${ROSTER.length} people, which is too few to sweep`);

// ── The census this pass was argued from, rebuilt here ───────────────────────
// Every person whose read publishes a percentage, with the chip that read paints.
const CHIPS = [];
const BELOW = [];
for (const pid of ROSTER) {
  let r = null;
  try { r = WA.read(pid, P(pid)); } catch { r = null; }
  if (!r) continue;
  const chip = WA.compactBadgeHtml(pid, P(pid));
  if (r.pct === null || r.pct === undefined) BELOW.push({ pid, r, chip });
  else CHIPS.push({ pid, r, chip });
}
must(CHIPS.length > 100,
  `only ${CHIPS.length} people publish a Word vs Action percentage in this corpus, which is too ` +
  "few for the sweep this file is");
must(BELOW.length > 20,
  `only ${BELOW.length} people read below the floor, so section 3's fail-closed half has no subject`);
const FLOOR_N = Math.min(...CHIPS.map((c) => c.r.coverage.tested));

// ═════════════════════════════════════════════════════════════════════════════
section("1 · every published chip carries its denominator");
// ═════════════════════════════════════════════════════════════════════════════
{
  const bare = [];
  const wrong = [];
  for (const { pid, r, chip } of CHIPS) {
    const c = r.coverage || {};
    const want = `${r.pct}% · ${c.tested} of ${c.scorable} tested · ${r.verdict.label}`;
    if (text(chip) !== want) wrong.push(`${pid}: ${JSON.stringify(text(chip))} ≠ ${JSON.stringify(want)}`);
    // The failure mode this pass existed to remove, checked on its own so the
    // message names it: a percentage and a verdict word and nothing to size them.
    if (text(chip) === `${r.pct}% · ${r.verdict.label}`) bare.push(pid);
  }
  eq(bare.length, 0,
    `${bare.length} chip(s) print a bare percentage and a verdict word (${bare.slice(0, 4).join(", ")}).\n` +
    "    Beside a name, on a page carrying a hundred formal acts, that is a product grade and not a\n" +
    "    measurement");
  eq(wrong.slice(0, 4).join(" | "), "",
    `${wrong.length} chip(s) do not read as the figure, the fraction that sizes it and the verdict word`);
  // AND THE FRACTION IS read()'S OWN. Not a count this builder took, which would
  // be a second arithmetic that agrees until it does not.
  const off = CHIPS.filter(({ r, chip }) =>
    chip.indexOf(`${r.coverage.tested} of ${r.coverage.scorable} tested`) < 0);
  eq(off.length, 0,
    `${off.length} chip(s) print a fraction that is not the coverage block read() returned`);
  console.log(`      ${CHIPS.length} published chips swept, all three parts present, thinnest is ` +
    `${FLOOR_N} tested`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the floor case is labelled, not hidden");
// ═════════════════════════════════════════════════════════════════════════════
{
  const MIN = FLOOR_N;
  const atFloor = CHIPS.filter((c) => c.r.coverage.tested === MIN);
  must(atFloor.length > 10,
    `only ${atFloor.length} chip(s) sit on the thinnest publishable read, so the premise of this ` +
    "pass no longer holds in this corpus and the argument needs re-making rather than re-asserting");
  // THE WHOLE POINT, ON THE THINNEST READS IN THE APP. These are the chips that
  // read as a grade, and they are the majority.
  for (const { pid, r, chip } of atFloor.slice(0, 40)) {
    has(chip, `${MIN} of ${r.coverage.scorable} tested`,
      `${pid} publishes a percentage off ${MIN} tested items and the chip does not say so`);
    ok(chip.length > 0, `${pid} paints no chip at the publication floor — that is suppression, not annotation`);
  }
  const share = Math.round((atFloor.length / CHIPS.length) * 100);
  ok(share > 20,
    `only ${share}% of published chips sit on the floor, so the "most of them are thin" premise is stale`);
  // AND A 100% CHIP IS NEVER ALONE. The reported case, checked as its own class.
  const hundreds = CHIPS.filter((c) => c.r.pct === 100);
  for (const { pid, r, chip } of hundreds) {
    has(chip, ` of ${r.coverage.scorable} tested`,
      `${pid} prints 100% with nothing to size it — the exact chip this pass was opened on`);
  }
  console.log(`      ${atFloor.length} of ${CHIPS.length} chips (${share}%) stand on ${MIN} tested items; ` +
    `${hundreds.length} read 100% and all of them say what off`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · no new floor — and still fails closed below the old one");
// ═════════════════════════════════════════════════════════════════════════════
{
  // BELOW THE FLOOR, NOTHING. Untouched by this pass, re-checked because a
  // builder that now reads two more fields is a builder that can now throw.
  const leaked = BELOW.filter((b) => b.chip !== "");
  eq(leaked.length, 0,
    `${leaked.length} person(s) below the publication floor paint a chip (${leaked.slice(0, 3).map((b) => b.pid).join(", ")}).\n` +
    "    read() returns a null percentage there and the chip has nothing honest to print");

  // ABOVE IT, EXACTLY THE SAME PEOPLE AS BEFORE. Proved against the builder that
  // actually shipped rather than a transcription of it: the previous revision's
  // own chip span is lifted out of git and swapped into the live module, so this
  // counterfactual boots the bare chip as it was written, not as this file
  // remembers it.
  const SPAN_A = "      var label = (v && v.label) ? v.label : FRAME.metric;";
  const SPAN_B = "    } catch (e) { return ''; }";
  const chipSpan = (src, side) => {
    const i = src.indexOf(SPAN_A), j = src.indexOf(SPAN_B, i < 0 ? 0 : i);
    must(i > 0 && j > i, `the chip span no longer reads as written in ${side}'s word-action.js`);
    return src.slice(i, j);
  };
  const headWA = HEAD("word-action.js");
  must(headWA, "no previous revision of word-action.js is reachable, so the identical-set half of this " +
    "section has nothing to compare against");
  const NEW_BODY = chipSpan(WA_SRC, "the working tree");
  const OLD_BODY = chipSpan(headWA, "the previous revision");
  must(NEW_BODY.indexOf("pdxwa-cbadge-den") >= 0,
    "the located span does not build the denominator — this probe is reading the wrong lines");
  must(OLD_BODY.indexOf("pdxwa-cbadge-den") < 0,
    "the previous revision already built a denominator, so this pass is not the change it says it is");
  const before = boot({ warm: true, mutants: { "word-action.js": [[NEW_BODY, OLD_BODY]] } });
  const WB = before.PDXWordAction;
  const painted = (w) => {
    const out = [];
    for (const pid of ROSTER) {
      let h = "";
      try { h = w.PDXWordAction.compactBadgeHtml(pid, w.CMP_DATA[pid]); } catch { h = ""; }
      if (h) out.push(pid);
    }
    return out;
  };
  const now = painted(win), then = painted(before);
  must(then.length > 100, `the restored pre-denominator builder painted ${then.length} chips`);
  eq(now.join(",") === then.join(","), true,
    `the denominator changed WHO gets a chip: ${then.length} people before, ${now.length} after.\n` +
    "    This pass annotates a figure; it may not become a second, higher floor that nothing else in\n" +
    "    the stack agrees with, leaving a reader to wonder why one profile has a chip and the next\n" +
    "    does not");
  // AND THE OLD CHIP REALLY WAS THE BARE ONE, so the comparison above is not
  // between two identical builders.
  const oldChip = WB.compactBadgeHtml(CHIPS[0].pid, before.CMP_DATA[CHIPS[0].pid]);
  no(oldChip, "tested", "the restored builder already printed a denominator — the mutant is not the old chip");
  console.log(`      ${now.length} chips painted, the same ${then.length} people as the bare builder; ` +
    `${BELOW.length} below the floor still print nothing`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · twin boot — the arithmetic never saw this");
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
  const A = engine(HEAD);
  const B = engine(R);
  must(B.PDXWordAction && typeof B.PDXWordAction.read === "function",
    "the working tree's word-action.js did not boot in the twin");
  if (!A.PDXWordAction || typeof A.PDXWordAction.read !== "function") {
    console.log("      no HEAD copy available in this checkout — twin boot skipped");
  } else {
    const drift = [];
    let swept = 0;
    for (const pid of ROSTER) {
      swept++;
      const a = A.PDXWordAction.read(pid, A.CMP_DATA[pid]);
      const b = B.PDXWordAction.read(pid, B.CMP_DATA[pid]);
      // THE FOUR NUMBERS THE WORK ORDER NAMES, each on its own, so a failure says
      // which one moved rather than dumping two objects.
      const key = (x) => !x ? "null" : [
        x.pct, x.publishable,
        x.coverage && x.coverage.tested, x.coverage && x.coverage.scorable,
        x.verdict && x.verdict.label,
      ].join("/");
      if (key(a) !== key(b)) drift.push(`${pid}: ${key(a)} → ${key(b)}`);
      if (JSON.stringify(a) !== JSON.stringify(b)) drift.push(`${pid}/whole-read`);
      if (A.PDXConsistency && B.PDXConsistency &&
          JSON.stringify(A.PDXConsistency.formalPatternIndex.shape(pid)) !==
          JSON.stringify(B.PDXConsistency.formalPatternIndex.shape(pid))) drift.push(`${pid}/formal`);
    }
    ok(swept > 300, `the twin boot only swept ${swept} people`);
    eq(drift.slice(0, 6).join(" | "), "",
      `${drift.length} read(s) moved. This pass changed one builder's markup: Direction Match, the\n` +
      "    tested count, the scorable count, the publish flag and the formal tiers must all be\n" +
      "    byte-identical to HEAD's");
    console.log(`      ${swept} people swept; no percentage, tested count, publish flag or formal tier moved`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the accessible name carries the fraction");
// ═════════════════════════════════════════════════════════════════════════════
{
  const missing = [];
  for (const { pid, r, chip } of CHIPS) {
    const aria = (/aria-label="([^"]*)"/.exec(chip) || [])[1] || "";
    const frac = `${r.coverage.tested} of ${r.coverage.scorable} tested`;
    if (aria.indexOf(frac) < 0) missing.push(pid);
  }
  eq(missing.length, 0,
    `${missing.length} chip(s) announce the percentage without the fraction that sizes it\n` +
    `    (${missing.slice(0, 4).join(", ")}). A screen reader that hears "71 per cent, Backs it up" has been\n` +
    "    handed the exact impression the visible chip was fixed to stop giving");
  // The rest of the accessible name is what it was: what the number measures,
  // and that this goes somewhere.
  const one = CHIPS[0];
  const aria = (/aria-label="([^"]*)"/.exec(one.chip) || [])[1] || "";
  has(aria, `${one.r.pct}%`, "the chip's accessible name omits the figure");
  has(aria, one.r.verdict.label, "the chip's accessible name omits the verdict");
  has(aria, "Direction match",
    "the chip's accessible name no longer says what the percentage measures");
  has(aria, "Word vs Action",
    "the chip's accessible name no longer says where it leads");
  console.log(`      aria: "${aria}"`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · it is the section's own words, character for character");
// ═════════════════════════════════════════════════════════════════════════════
{
  // THREE CONSTRUCTIONS, ONE PHRASE, AND DELIBERATELY NOT A SHARED HELPER. The
  // apparatus lid and the Official Record feed row build this fraction from the
  // same two integers, and both literals are pinned by other suites
  // (test-profile-spine.mjs and test-score-depth.mjs read them as source). So the
  // chip builds the identical construction rather than all three calling one
  // function — and THIS is the assertion that keeps them identical: not that the
  // code is shared, but that the output is the same string.
  const built = (WA_SRC.match(/\+ ' of ' \+/g) || []).length;
  ok(built >= 3,
    `word-action.js builds the "N of M" fraction ${built} time(s); the chip, the apparatus lid and the\n` +
    "    feed row each build it, so fewer than three means one of them now paraphrases");
  const deep = CHIPS.slice().sort((a, b) => b.r.coverage.tested - a.r.coverage.tested)[0];
  must(deep && deep.r.coverage.tested > 5,
    "no person in this corpus has a deep enough read to render the section against");
  const sec = WA.sectionHtml(deep.pid, P(deep.pid));
  must(sec && sec.length > 200, `${deep.pid} renders no ⚖️ Word vs Action section`);
  const frac = `${deep.r.coverage.tested} of ${deep.r.coverage.scorable} tested`;
  has(deep.chip, frac, `the chip does not print ${JSON.stringify(frac)}`);
  has(sec, frac,
    `the section a reader reaches by tapping the chip does not print ${JSON.stringify(frac)} in the same\n` +
    "    words. A door that paraphrases what is behind it is a second finding");
  console.log(`      ${deep.pid}: chip and section both say "${frac}"`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · still one control, still not a rank");
// ═════════════════════════════════════════════════════════════════════════════
{
  const one = CHIPS[0].chip;
  eq((one.match(/<button/g) || []).length, 1, "the chip is more than one control");
  eq(maxDepth(one, "button"), 1, "the chip nests a control inside a control");
  eq((one.match(/onclick=/g) || []).length, 1, "the chip carries more than one handler");
  has(one, "pdxsec-wordaction", "the chip no longer reaches the section it is a door to");
  // NOTHING READS THE TWO INTEGERS BACK. The denominator span exists in exactly
  // two files — the builder that writes it and the stylesheet that skins it — and
  // no sort, filter or comparison anywhere in the app mentions it.
  const users = ["word-action.js", "word-action.css", "profiles-full.js", "profile-spine.js",
                 "door1-workspace.js", "all-seeing-eye.js", "issue-view.js", "consistency.js"]
    .filter((f) => R(f).indexOf("pdxwa-cbadge-den") >= 0);
  eq(users.join(","), "word-action.js,word-action.css",
    "the chip's denominator is referenced outside the builder and the stylesheet. Two integers on a\n" +
    "    chip are an annotation; the moment something reads them back they are a rank");
  no(R("word-action.js").slice(WA_SRC.indexOf("function compactBadgeHtml")), "sort(",
    "the chip builder sorts something");
  console.log(`      one button, one handler, one door; the denominator is written in ${users.length} files ` +
    "and read by none");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the deep file is still record-first");
// ═════════════════════════════════════════════════════════════════════════════
{
  const PF = R("profiles-full.js");
  const SPINE = R("profile-spine.js");
  const bodyAt = PF.indexOf("const _profileBody = ");
  must(bodyAt !== -1, "the profile body template moved out of profiles-full.js");
  const stageOf = (needle) => {
    const at = PF.indexOf(needle, bodyAt);
    if (at === -1) return null;
    const tags = PF.slice(bodyAt, at).match(/<!--PDXSP:([a-z0-9:_-]+)-->/g) || [];
    return tags.length ? tags[tags.length - 1].replace(/<!--PDXSP:|-->/g, "") : "identity";
  };
  eq(stageOf("PDXWordAction.compactBadgeMount("), "identity",
    "the chip left the identity stage, so it is no longer the high-on-the-page letterhead this pass\n" +
    "    was about");
  eq(stageOf("PDXWordAction.sectionHtml("), "verdict",
    "⚖️ Word vs Action changed stage — the chip's whole promise is that tapping it gets there");
  const STAGE_KEYS = (SPINE.match(/\{\s*key:\s*'([a-z]+)'/g) || []).map((m) => /'([a-z]+)'/.exec(m)[1]);
  must(STAGE_KEYS.length > 5 && STAGE_KEYS[0] === "identity",
    "the stage list could not be read out of profile-spine.js");
  ok(STAGE_KEYS.indexOf("explore") < STAGE_KEYS.indexOf("verdict"),
    "⚖️ Word vs Action now reads above 🌳 All Issues by Topic — the chip is a way DOWN to it");
  // AND THE CHIP DID NOT BECOME THE RECORD BRIEF. It is mounted once, it is not
  // in the record's stage, and the formal record still leads.
  eq((PF.slice(bodyAt).match(/PDXWordAction\.compactBadgeMount\(/g) || []).length, 1,
    "the chip is mounted more than once on the profile");
  console.log(`      chip in "identity", section in "verdict", stages ${STAGE_KEYS.slice(0, 4).join(" → ")}…`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · the files travel together");
// ═════════════════════════════════════════════════════════════════════════════
{
  const SW = R("sw.js");
  const m = /const CACHE_VERSION = 'v(\d+)';/.exec(SW);
  must(m, "CACHE_VERSION is not in sw.js in the form this file reads");
  const prev = HEAD("sw.js");
  if (prev) {
    const pm = /const CACHE_VERSION = 'v(\d+)';/.exec(prev);
    if (pm) ok(Number(m[1]) > Number(pm[1]),
      `CACHE_VERSION did not move past HEAD's v${pm[1]} — a warm device would keep painting the bare chip`);
  }
  const note = SW.slice(SW.indexOf(`// v${m[1]} - `), SW.indexOf("const CACHE_VERSION"));
  for (const f of ["word-action.js", "word-action.css"]) {
    has(note, f, `the v${m[1]} note does not name ${f}`);
    ok(SW.indexOf("/" + f) >= 0, `${f} is not in the precached shell`);
  }
  // The skin travels with the markup, and it is quieter than the verdict word it
  // sits beside — the denominator sizes the figure, it is not a second finding.
  const CSS = R("word-action.css");
  has(CSS, ".pdxwa-cbadge-den", "the denominator span has no rule, so it inherits the numeral's weight");
  const rule = CSS.slice(CSS.indexOf(".pdxwa-cbadge-den"), CSS.indexOf("}", CSS.indexOf(".pdxwa-cbadge-den")));
  has(rule, "opacity", "the denominator is not quietened, so it competes with the percentage");
  console.log(`      shell v${m[1]}; both word-action files named and precached`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("10 · the fix is load-bearing");
// ═════════════════════════════════════════════════════════════════════════════
{
  // (a) The bare chip comes back — section 1 has to catch it.
  {
    const b = boot({
      warm: true,
      mutants: {
        "word-action.js": [[
          "          (den\n" +
          "            ? '<span class=\"pdxwa-cbadge-den\">' + esc(den) + '</span>' +\n" +
          "              '<span class=\"pdxwa-cbadge-sep\" aria-hidden=\"true\">·</span>'\n" +
          "            : '') +",
          "          '' +",
        ]],
      },
    });
    const { pid } = CHIPS[0];
    const chip = b.PDXWordAction.compactBadgeHtml(pid, b.CMP_DATA[pid]);
    const r = b.PDXWordAction.read(pid, b.CMP_DATA[pid]);
    ok(text(chip) === `${r.pct}% · ${r.verdict.label}`,
      "removing the denominator span did not restore the bare chip, so section 1 is not proving what\n" +
      "    it claims");
  }

  // (b) The fraction is dropped from the accessible name only — section 5's own
  //     case, and the sighted-only regression it exists to refuse.
  {
    const b = boot({
      warm: true,
      mutants: {
        "word-action.js": [[
          "        ' aria-label=\"' + esc(r.pct + '% ' + FRAME.metric + (den ? ', ' + den : '') + ' — ' +\n" +
          "          label + '. Open ' + FRAME.label + '.') + '\">' +",
          "        ' aria-label=\"' + esc(r.pct + '% ' + FRAME.metric + ' — ' +\n" +
          "          label + '. Open ' + FRAME.label + '.') + '\">' +",
        ]],
      },
    });
    const { pid, r } = CHIPS[0];
    const chip = b.PDXWordAction.compactBadgeHtml(pid, b.CMP_DATA[pid]);
    const aria = (/aria-label="([^"]*)"/.exec(chip) || [])[1] || "";
    ok(aria.indexOf(`${r.coverage.tested} of ${r.coverage.scorable} tested`) < 0 &&
       chip.indexOf("pdxwa-cbadge-den") >= 0,
      "dropping the fraction from the accessible name while keeping it visible was not caught by\n" +
      "    section 5 — which is the one regression a sighted test run cannot see");
  }

  // (c) THE WRONG FIX: suppress instead of annotate. A thin read paints no chip
  //     at all, which is this one surface inventing a floor above the
  //     publication floor. Section 3 has to refuse it.
  {
    const b = boot({
      warm: true,
      mutants: {
        "word-action.js": [[
          "      var den = (c.tested && c.scorable) ? (c.tested + ' of ' + c.scorable + ' tested') : '';",
          "      var den = (c.tested && c.scorable) ? (c.tested + ' of ' + c.scorable + ' tested') : '';\n" +
          "      if (c.tested < 5) return '';",
        ]],
      },
    });
    let gone = 0;
    for (const pid of ROSTER) {
      let h = "";
      try { h = b.PDXWordAction.compactBadgeHtml(pid, b.CMP_DATA[pid]); } catch { h = ""; }
      if (!h) gone++;
    }
    ok(gone > BELOW.length,
      `a suppress-above-the-floor variant hid ${gone - BELOW.length} chip(s) and section 3's identical-set\n` +
      "    assertion would not have caught it");
  }
  console.log("      · the bare chip → caught  · the sighted-only aria → caught  · suppress-not-annotate → caught");
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ wva chip denominator: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error(`   · ${f}`);
  process.exit(1);
}
console.log(`\n✓ wva chip denominator: all ${passed} assertions passed — the figure travels with what ` +
  "sizes it, and no floor moved\n");
