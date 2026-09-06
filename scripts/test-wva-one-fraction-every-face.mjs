#!/usr/bin/env node
/**
 * test-wva-one-fraction-every-face.mjs — one fraction builder, on every face
 * ─────────────────────────────────────────────────────────────────────────────
 * THE PASS BEFORE THIS ONE gave the letterhead chip and the ⚖️ section one owner
 * for "N of M tested": figure() / fractionOf() answer it once and both surfaces
 * print the answer. Three faces of the SAME figure were left building the pair in
 * their own hands, out of the same coverage block, on the same screen:
 *
 *     apparatus lid   How this score is built · basis, method and sources · 5 of 14 tested
 *     feeds panel     🏛️ Official Record …                                    5 of 14 tested
 *     the ring        84%                                                     5 of 14 tested
 *
 * Nothing was wrong with any of those three strings on the day they were written.
 * That is the point: three spellings of one number agree until somebody edits one
 * of them, and two of the three sit INSIDE the section they were sizing
 * themselves against, while the third is the first number a reader meets. The
 * chip's own defect — 84% over 5 of 14 beside the name, 72% over 15 of 26 a
 * screen below — was one read taken at a different tick, and every hand-built
 * copy is another place that can happen.
 *
 * So all three print figure() / fractionOf() and nothing else, and the ring is
 * held to the chip's rule: no percentage without the set that sizes it.
 *
 * WHAT THIS FILE PINS
 *
 *   1. THE THREE NAMED PEOPLE. For lee, curtis and thune, FIVE faces — lid
 *      label, Official Record row, ring sub-line, chip, section number block —
 *      carry one fraction, character for character, read off the rendered HTML
 *      of each surface rather than off the object behind them.
 *   2. AND EVERYBODY ELSE, warm and cold, across the whole roster.
 *   3. BOTH HALVES OR NEITHER, on the loudest figure on the page: a ring that
 *      publishes a percentage publishes the set with it, and where the set
 *      cannot be said the ring falls back to its own waiting mark. The lid drops
 *      its CLAUSE, never its label, and no face anywhere prints "0 of 0 tested".
 *   4. …AND THE FLOOR IS STILL THE FLOOR. The ring's below-floor sentence names
 *      r.floors.items — "2 of 3 tested needed" — which is the one place the
 *      floor and the tested set are different questions. This pass did not
 *      touch it, and section 4 refuses a future pass that folds it in.
 *   5. ONE BUILDER IN THE SOURCE. The three faces call the owner and hold no
 *      arithmetic, no threshold and no read of their own; the two surfaces that
 *      legitimately size something else are named here rather than left to look
 *      like survivors.
 *   6. NOTHING NEW TO ARM. The lid and the feed row are painted by the section's
 *      own repaint, and the ring was already on HERO_REPAINT through the shared
 *      contract. Three faces joined the owner; no fourth subscription appeared.
 *   7. THE ARITHMETIC NEVER SAW THIS. Twin boot against HEAD over the offline
 *      corpus: the pair list, the Direction Match ledger and the formal tiers
 *      byte-identical.
 *   8. THE FIX IS LOAD-BEARING. Four counterfactuals, one per face plus the
 *      gate, each caught by the section that claims to catch it.
 *
 *   node scripts/test-wva-one-fraction-every-face.mjs
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
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`\n✗ wva one fraction every face: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

const grab = (re, s) => (re.exec(String(s)) || [])[1] || "";

// THE ONE THING ALLOWED AFTER THE FRACTION. The ring has room for two short lines
// and no more, so on the executive lane the scope's own label is appended to the
// count — "32 of 34 tested · all time" — rather than given a line of its own. That
// suffix predates this pass and is the hero saying WHICH record; the fraction in
// front of it still has to be the owner's, character for character. So every sweep
// below reads the sub-line in two parts and holds each to its own rule.
const subFraction = (sub) => String(sub).split(" · ")[0];
const subScope = (sub) => String(sub).slice(subFraction(sub).length);

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
must(WA && typeof WA.sectionHtml === "function" && typeof WA.compactBadgeHtml === "function" &&
     typeof WA.heroRead === "function" && typeof WA.heroMount === "function",
  "PDXWordAction no longer publishes the four renderers this file reads, so every assertion is vacuous");
must(typeof WA.figure === "function" && typeof WA.fractionOf === "function",
  "PDXWordAction does not publish the shared figure, so this file cannot hold the object the five " +
  "faces are supposed to be printing");

const P = (id) => win.CMP_DATA[id];
const ROSTER = Object.keys(win.CMP_DATA || {});
must(ROSTER.length > 300, `the roster loaded ${ROSTER.length} people, which is too few to sweep`);

// ── THE FIVE FACES, AS A READER MEETS THEM ───────────────────────────────────
// Every one of these is cut out of markup this harness just painted with the
// shipped renderers. The lid label is read out of the sentinel the fold is
// emitted as — applyLids() escapes it when it opens the control, so this is the
// exact text a reader taps. The ring's sub-line is read from whichever hero the
// profile actually mounted: the ring paints it as .pdxwa-hero-sub, and the shape
// hero — which takes the slot on a file with a deep record and a thin word
// ledger — paints the same string as .pdxwa-shape-dm-sub.
const LID_HEAD = "How this score is built · basis, method and sources";
const faces = (w, pid) => {
  const W = w.PDXWordAction, p = w.CMP_DATA[pid];
  let sec = "", chip = "", mount = "";
  try { sec = String(W.sectionHtml(pid, p) || ""); } catch { sec = ""; }
  try { chip = String(W.compactBadgeHtml(pid, p) || ""); } catch { chip = ""; }
  try { mount = String(W.heroMount(pid, p) || ""); } catch { mount = ""; }
  let h = null;
  try { h = W.heroRead(pid, p); } catch { h = null; }
  const feedAt = sec.indexOf('aria-label="Official Record');
  const label = grab(new RegExp('label="(' + LID_HEAD + '[^"]*)"'), sec);
  return {
    pid, sec, chip, mount, h,
    // the lid: its label, and the clause on the end of it (empty when there is none)
    label,
    lid: label ? label.slice(LID_HEAD.length).replace(/^ · /, "") : "",
    // the feeds panel's Official Record row
    feed: feedAt < 0 ? "" : grab(/<span class="pdxwa-feed-n">([^<]*)</, sec.slice(feedAt)),
    // the ring, painted and read
    sub: h ? String(h.sub || "") : "",
    ringSub: grab(/<div class="pdxwa-hero-sub">([^<]*)</, mount) ||
             grab(/<span class="pdxwa-shape-dm-sub">([^<]*)</, mount),
    ringText: h ? String(h.text || "") : "",
    // the two faces the pass before this one already owned
    chipDen: grab(/<span class="pdxwa-cbadge-den">([^<]*)</, chip),
    set: grab(/data-pdxwa-set="([^"]*)"/, sec),
    fig: W.figure(pid, p),
  };
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · lee, curtis, thune — five faces, one fraction");
// ═════════════════════════════════════════════════════════════════════════════
{
  const NAMED = ["lee", "curtis", "thune"];
  must(NAMED.every((pid) => P(pid)),
    `the roster no longer carries ${NAMED.filter((p) => !P(p)).join(", ")}, so the people the smoke ` +
    "named cannot be checked by name");
  for (const pid of NAMED) {
    const x = faces(win, pid);
    const want = x.fig.fraction;
    ok(want !== "", `${pid}: the owner has no fraction to print, so this comparison proves nothing`);
    ok(x.sec !== "", `${pid}: no ⚖️ section rendered`);
    ok(x.chip !== "", `${pid}: no letterhead chip rendered`);
    // THE CLAIM, IN THE ONLY FORM THAT MATTERS: five painted strings, character
    // for character, against the one the owner built.
    eq(x.lid, want,
      `${pid}: the apparatus lid's label does not carry the section's fraction — and the lid is INSIDE ` +
      "that section, a screen below the number block it is sizing");
    eq(x.feed, want,
      `${pid}: the Official Record row does not carry the section's fraction. The row that NAMES the ` +
      "test, disagreeing with the figure it is the test for");
    eq(x.sub, want,
      `${pid}: the hero's sub-line does not carry the section's fraction — the first number on the ` +
      "profile, sized against a different set than the section a screen below");
    eq(x.ringSub, want, `${pid}: the hero the profile actually mounted painted something else`);
    eq(subScope(x.sub), "",
      `${pid}: the ring appended a scope to the fraction. These three are legislators on the ` +
      "voting lane, where the count stands alone");
    eq(x.chipDen, want, `${pid}: the letterhead chip's denominator moved off the owner`);
    eq(x.set, want, `${pid}: the section's own number block moved off the owner`);
    // The lid's label still says what opening it shows — the clause was added to
    // a subject, not swapped for one.
    has(x.label, LID_HEAD, `${pid}: the lid label stopped naming its payload`);
    console.log(`      ${pid}: lid ≡ feed ≡ ring ≡ chip ≡ section  →  "${want}"`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · and the same for everybody, warm and cold");
// ═════════════════════════════════════════════════════════════════════════════
{
  const cold = boot({});
  for (const [state, w] of [["warm", win], ["cold", cold]]) {
    const drift = [];
    let lids = 0, feeds = 0, subs = 0;
    for (const pid of ROSTER) {
      const x = faces(w, pid);
      const want = x.fig.fraction;
      if (x.sec) {
        // A face that prints a fraction prints the owner's. A face with no
        // fraction to print prints none — which is section 3's half of the rule.
        if (x.lid) { lids++; if (x.lid !== want) drift.push(`${pid}/lid "${x.lid}" ≠ "${want}"`); }
        if (x.feed) { feeds++; if (x.feed !== want) drift.push(`${pid}/feed "${x.feed}" ≠ "${want}"`); }
        if (x.set && x.set !== want) drift.push(`${pid}/set "${x.set}" ≠ "${want}"`);
      }
      if (x.chipDen && x.chipDen !== want) drift.push(`${pid}/chip "${x.chipDen}" ≠ "${want}"`);
      // The ring's sub-line is a fraction only where there is a percentage over
      // it; the waiting states and the floor sentence are its other answers.
      if (x.sub && / tested( · |$)/.test(x.sub)) {
        subs++;
        if (subFraction(x.sub) !== want) drift.push(`${pid}/ring "${x.sub}" ≠ "${want}"`);
        // …and what follows it is the scope's own label or nothing at all — never
        // a second number, and never typed where it could drift from the card
        // under the ring.
        const tail = subScope(x.sub);
        if (tail && (!x.h.scoped || !x.h.scoped.scope ||
                     tail !== " · " + String(x.h.scoped.scope.label).toLowerCase())) {
          drift.push(`${pid}/scope "${tail}"`);
        }
      }
    }
    ok(lids > (state === "warm" ? 200 : 0) && feeds > (state === "warm" ? 200 : 0),
      `the ${state} boot painted ${lids} lid clauses and ${feeds} feed rows, too few for this sweep to mean anything`);
    eq(drift.slice(0, 5).join(" | "), "",
      `${drift.length} face(s) print a tested set that is not the owner's (${state} record). One ` +
      "builder, or a reader is shown two sizes of one figure on one screen");
    console.log(`      ${state}: ${lids} lids, ${feeds} feed rows, ${subs} ring sub-lines — all the owner's`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · both halves or neither, and no \"0 of 0 tested\" anywhere");
// ═════════════════════════════════════════════════════════════════════════════
{
  let pcts = 0, waits = 0, clauseless = 0;
  const naked = [], zero = [], stub = [];
  for (const pid of ROSTER) {
    const x = faces(win, pid);
    if (/%$/.test(x.ringText)) {
      pcts++;
      // THE RULE, ON THE LOUDEST FIGURE ON THE PAGE.
      if (!x.sub || !/ tested$/.test(subFraction(x.sub))) naked.push(`${pid}: "${x.ringText}" over "${x.sub}"`);
      if (subFraction(x.sub) !== x.fig.fraction) naked.push(`${pid}/not-the-owner`);
    } else if (x.h) {
      waits++;
      // Fail closed: a ring that cannot say both halves shows its own waiting
      // mark, never a number borrowed from a narrower set.
      if (!/^(⏳|—|)$/.test(x.ringText)) stub.push(`${pid}: "${x.ringText}"`);
    }
    // …and where the set cannot be said, the CLAUSE goes and the label stays.
    if (x.sec && !x.fig.fraction) {
      clauseless++;
      if (x.lid !== "") zero.push(`${pid}/lid "${x.label}"`);
      if (x.feed !== "") zero.push(`${pid}/feed "${x.feed}"`);
    }
    for (const [face, s] of [["lid", x.label], ["feed", x.feed], ["ring", x.sub], ["chip", x.chipDen]]) {
      if (s && /\b0 of\b|of 0 tested/.test(s)) zero.push(`${pid}/${face}: "${s}"`);
    }
  }
  ok(pcts > 100, `only ${pcts} rings published a percentage, too few to hold to the rule`);
  ok(waits > 100, `only ${waits} rings were in a waiting state, so the fail-closed half is unproven`);
  ok(clauseless > 100, `only ${clauseless} sections had no fraction to print, so the dropped clause is unproven`);
  eq(naked.slice(0, 4).join(" | "), "",
    `${naked.length} ring(s) publish the profile's biggest number with no set sizing it, or with a set ` +
    "that is not the owner's");
  eq(stub.slice(0, 4).join(" | "), "",
    `${stub.length} ring(s) print something other than a percentage or a waiting mark`);
  eq(zero.slice(0, 4).join(" | "), "",
    `${zero.length} face(s) print a fraction that sizes nothing. "0 of 0 tested" — on a control a ` +
    "reader has to tap, or under the number itself — is worse than no fraction at all");
  // The owner's own two answers, unchanged by this pass.
  eq(WA.fractionOf(0, 0), "", "fractionOf printed something for a set of nothing");
  eq(WA.fractionOf(5, 14), "5 of 14 tested", "fractionOf is no longer the ⚖️ section's own wording");
  console.log(`      ${pcts} rings with a % (all sized), ${waits} waiting, ${clauseless} lids with the clause dropped`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the floor is still the floor");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The ring's below-floor sentence counts toward r.floors.items — "2 of 3 tested
  // needed" — and that denominator is the publication floor, not the tested set.
  // It reads like the fraction and is a different statement, which is exactly why
  // it is the one line this pass left alone.
  has(WA_SRC, "else sub = c.tested + ' of ' + r.floors.items + ' tested needed';",
    "the ring's below-floor sentence stopped naming the floor. That denominator is r.floors.items — " +
    "folding it into the owner's fraction would print the tested set where a reader is being told how " +
    "much more is needed, which is a floor change wearing a copy pass's clothes");
  let floors = 0;
  const wrong = [];
  for (const pid of ROSTER) {
    const x = faces(win, pid);
    if (!x.h || !/ tested needed$/.test(x.sub)) continue;
    floors++;
    const r = x.h.read;
    eq(x.sub, r.coverage.tested + " of " + r.floors.items + " tested needed",
      `${pid}: the below-floor sentence is not the floor's own count`);
    if (x.sub === x.fig.fraction) wrong.push(pid);
    if (/%$/.test(x.ringText)) wrong.push(`${pid}/published`);
  }
  ok(floors > 10, `only ${floors} people sit under the floor with a countable start, too few to prove`);
  eq(wrong.slice(0, 3).join(", "), "",
    `${wrong.length} below-floor ring(s) either published a percentage or printed the tested set where ` +
    "the floor belongs");
  eq(WA.MIN_TESTED_ITEMS, 3, "the publication floor moved — this pass may not, and did not, touch it");
  console.log(`      ${floors} below-floor sub-lines, every one counting toward the floor and not the set`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · one builder in the source");
// ═════════════════════════════════════════════════════════════════════════════
{
  const span = (open, close) => {
    const i = WA_SRC.indexOf(open);
    must(i > 0, `word-action.js no longer holds ${open}`);
    const j = WA_SRC.indexOf(close, i);
    must(j > i, `${open} no longer ends with ${close}`);
    return WA_SRC.slice(i, j);
  };
  // The owner, reachable two ways and taking the section's read either way.
  has(WA_SRC, "function figureOf(pid, r, sr) {",
    "the owner that accepts an already-taken read is gone, so a surface inside the section pays for a " +
    "second scoring pass to print a string the section is already holding");
  has(WA_SRC, "var sr = pre || scopedRead(pid, p);",
    "the owner takes a bare read() instead of the scopedRead() the section and the ring take");

  const lid = span("function apparatusHtml(pid, p, r) {", 'return \'<div class="pdxwa-how">\'');
  has(lid, "var lidFig = figureOf(pid, r);", "the apparatus lid does not print the owner's object");
  has(lid, "(lidFig.fraction ? ' · ' + lidFig.fraction : '')",
    "the lid prints its clause ungated, so a set that cannot be said becomes \"0 of 0 tested\" on a " +
    "control a reader has to spend a tap on");

  const feed = span("rows.push({ ico: '🏛️', name: 'Official Record'", "ROW IS GONE.");
  has(feed, "n: figureOf(pid, r).fraction });", "the Official Record row does not print the owner's object");

  const hero = span("function heroRead(pid, p) {", "// One phrase for this wait");
  has(hero, "var fig = figure(pid, p, sr);", "the ring does not print the owner's object");
  has(hero, "var hasPct = fig.shows;",
    "the ring gates its percentage on something other than the owner's both-halves answer");
  has(hero, "if (hasPct) sub = fig.fraction;", "the ring's sub-line is not the owner's sentence");

  // None of the three may hold arithmetic, a threshold or a read of its own.
  for (const [what, s, reads] of [["the lid", lid, 0], ["the feed row", feed, 0], ["the ring", hero, 1]]) {
    const code = s.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
    ok(!/toFixed|Math\.|\/\s*100|\*\s*100|reduce\(/.test(code), `${what} grew arithmetic of its own`);
    ok(!/MIN_|publishable/.test(code), `${what} tests the publication floor itself`);
    ok(!/\.party\b|Republican|Democrat/i.test(code), `${what} reads a party`);
    // read() and scopedRead() are not memoized — each call is a full scoring pass —
    // so the count of them is the cost of this pass. The lid and the feed row are
    // handed the section's read and take none. The ring OWNS its read: it is the
    // top of its own call, so it takes exactly one and hands that one to the owner
    // rather than letting figure() take a second.
    eq((code.match(/scopedRead\(/g) || []).length, reads,
      `${what} takes ${(code.match(/scopedRead\(/g) || []).length} read(s) of its own where it should ` +
      `take ${reads}. Every extra one is a second scoring pass for a string already in hand — and, ` +
      "worse, a second tick at which the two halves of one figure can disagree");
  }
  has(hero, "var sr = scopedRead(pid, p);\n      var r = sr.main;",
    "the ring stopped taking the read it hands to the owner");
  // AND THE HAND-BUILT PAIR IS GONE FROM ALL THREE. The two survivors in this file
  // are named, because a bare count of the phrase would either flag them forever
  // or be loosened until it caught nothing:
  //   · the basis lid's coverage line — "5 of 14 testable statements", a
  //     different sentence about the same two integers, and already inside the
  //     section's own body
  //   · the current-term strip's own denominator — "N of M issues tested" for the
  //     SCOPED read, which must not be the all-time set; that is the whole point
  //     of a scoped figure
  //   · the ring's below-floor sentence, section 4's subject
  for (const [what, s] of [["the lid", lid], ["the feed row", feed]]) {
    ok(!/coverage\.tested|c\.tested \+ ' of '/.test(s.replace(/^\s*\/\/.*$/gm, "")),
      `${what} assembles N of M by hand beside the owner's copy of it`);
  }
  const heroCode = hero.replace(/^\s*\/\/.*$/gm, "");
  ok(!/c\.tested \+ ' of ' \+ c\.scorable/.test(heroCode),
    "the ring assembles the tested set by hand again");
  has(WA_SRC, "return (t && m) ? (t + ' of ' + m + ' tested') : '';",
    "fractionOf is no longer the one builder of the sentence, character for character");
  console.log("      lid, feed row and ring: owner only — no arithmetic, no floor, no second read");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · nothing new to arm");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The lid and the feed row are markup inside the ⚖️ section, so the section's
  // own repaint — the shared contract, armed once in bind() — repaints them. The
  // ring was already on it through bindHero. Three faces joined the owner and no
  // fourth subscription appeared, which is the claim here.
  const arms = (WA_SRC.match(/armFigureRepaint\(function \(\) \{/g) || []).length;
  eq(arms, 2,
    `word-action.js arms the shared repaint contract ${arms} times. Two surfaces mount and repaint — ` +
    "the letterhead chip and the ⚖️ section — and the three faces this pass moved are painted BY one " +
    "of those two or by the hero's own binder. A third arm is a third age");
  const subs = (WA_SRC.match(/window\.addEventListener\('pdx-/g) || []).length;
  const headSubs = ((HEAD("word-action.js") || WA_SRC).match(/window\.addEventListener\('pdx-/g) || []).length;
  eq(subs, headSubs,
    `word-action.js subscribes to ${subs} app events where HEAD subscribed to ${headSubs}. This pass ` +
    "gave three faces one fraction; it had no business teaching any of them to listen");
  for (const [fn, why] of [["function bindHero(uid, pid, p, opts) {", "the hero"],
                           ["function bind(uid, pid, p) {", "the ⚖️ section"]]) {
    const i = WA_SRC.indexOf(fn);
    must(i > 0, `${why}'s binder is gone from word-action.js`);
    const head = WA_SRC.slice(i, i + 1400);
    ok(/armFigureRepaint\(function \(\) \{|HERO_REPAINT/.test(head),
      `${why} no longer repaints on the shared arrival events, so a face inside it goes deaf`);
  }
  has(WA_SRC, "var HERO_REPAINT = ['pdx-consistency-warm', 'pdx-voting-warm', 'pdx-brief-timeout',",
    "the one event list moved");
  console.log(`      ${arms} arms, ${subs} subscriptions — the same as HEAD's`);
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
      // …and the sub-line itself, which is the one rendered string this pass
      // rewrote: same value as HEAD's, from a different builder.
      const ha = A.PDXWordAction.heroRead(pid, A.CMP_DATA[pid]);
      const hb = B.PDXWordAction.heroRead(pid, B.CMP_DATA[pid]);
      if (JSON.stringify(ha) !== JSON.stringify(hb)) drift.push(`${pid}/hero`);
      if (A.PDXConsistency && B.PDXConsistency) {
        if (JSON.stringify(A.PDXConsistency.scopedOverall(A.CMP_DATA[pid], pid)) !==
            JSON.stringify(B.PDXConsistency.scopedOverall(B.CMP_DATA[pid], pid))) drift.push(`${pid}/dm`);
        if (JSON.stringify(A.PDXConsistency.formalPatternIndex.shape(pid)) !==
            JSON.stringify(B.PDXConsistency.formalPatternIndex.shape(pid))) drift.push(`${pid}/formal`);
      }
    }
    ok(swept > 300, `the twin boot only swept ${swept} people`);
    eq(drift.slice(0, 6).join(" | "), "",
      `${drift.length} read(s) moved. Three faces stopped spelling a number and started asking for ` +
      "it: the pair list, the hero read, the Direction Match ledger and the formal tiers must be " +
      "byte-identical to HEAD's");
    console.log(`      ${swept} members swept; pair list, hero read, DM ledger and formal tiers identical`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the fix is load-bearing");
// ═════════════════════════════════════════════════════════════════════════════
{
  // (a) THE LID GOES BACK TO ITS OWN HAND, and sizes itself against a set one
  //     larger — which is exactly the shape of the original defect: two faithful
  //     prints of two different reads. Section 1 has to catch it.
  {
    const b = boot({
      warm: true,
      mutants: {
        "word-action.js": [[
          "      var label = 'How this score is built · basis, method and sources' +\n" +
          "        (lidFig.fraction ? ' · ' + lidFig.fraction : '');",
          "      var label = 'How this score is built · basis, method and sources · ' +\n" +
          "        r.coverage.tested + ' of ' + (r.coverage.scorable + 1) + ' tested';",
        ]],
      },
    });
    const x = faces(b, "lee");
    ok(x.lid !== "" && x.lid !== x.fig.fraction,
      "a lid back on its own arithmetic did not drift from the section's fraction, so section 1 is not " +
      "proving what it claims");
    console.log(`      · lid on its own hand → "${x.lid}" beside "${x.fig.fraction}" → caught`);
  }

  // (b) THE FEED ROW GOES BACK TO ITS OWN HAND. Same shape, different face: the
  //     row that names the test, sized against a set the test does not use.
  {
    const b = boot({
      warm: true,
      mutants: {
        "word-action.js": [[
          "        n: figureOf(pid, r).fraction });",
          "        n: c.tested + ' of ' + (c.scorable + 2) + ' tested' });",
        ]],
      },
    });
    const x = faces(b, "lee");
    ok(x.feed !== "" && x.feed !== x.fig.fraction,
      "a feed row back on its own arithmetic did not drift, so section 1's row comparison is guarding " +
      "nothing");
    console.log(`      · feed row on its own hand → "${x.feed}" → caught`);
  }

  // (c) THE RING PUBLISHES A PERCENTAGE WITH NO SET — the wrong fix, and the one
  //     the both-halves gate exists to refuse. Reachable by withholding the
  //     fraction from thin reads, which is the shape the defect took: the thin
  //     ones look strongest. Section 3 has to catch it.
  {
    const b = boot({
      warm: true,
      mutants: {
        "word-action.js": [
          ["      var hasPct = fig.shows;", "      var hasPct = r.pct !== null;"],
          ["    var fraction = fractionOf(tested, eligible);",
           "    var fraction = (tested > 20) ? fractionOf(tested, eligible) : '';"],
        ],
      },
    });
    let naked = 0;
    for (const pid of ROSTER) {
      const x = faces(b, pid);
      if (/%$/.test(x.ringText) && !/ tested$/.test(x.sub)) naked++;
    }
    ok(naked > 20,
      `only ${naked} ring(s) published the profile's biggest number over no set once the both-halves ` +
      "gate was removed, so section 3 is not proving that the gate is what keeps it off the page");
    console.log(`      · a % with no set → ${naked} rings would reach the page → caught`);
  }

  // (d) THE LID PRINTS ITS CLAUSE UNGATED, so a file with nothing tested carries
  //     "0 of 0 tested" on a control a reader is asked to tap. Section 3 has to
  //     catch that too — and it needs the 500-odd sections whose set cannot be
  //     said, which is why it counts them before claiming anything.
  {
    const b = boot({
      warm: true,
      mutants: {
        "word-action.js": [[
          "        (lidFig.fraction ? ' · ' + lidFig.fraction : '');",
          "        ' · ' + fractionOf(lidFig.tested, lidFig.eligible + 0) + '0 of 0 tested'.slice(0, lidFig.fraction ? 0 : 14);",
        ]],
      },
    });
    let bad = 0;
    for (const pid of ROSTER) {
      const x = faces(b, pid);
      if (x.label && /0 of 0 tested/.test(x.label)) bad++;
    }
    ok(bad > 100,
      `only ${bad} lid(s) printed a fraction that sizes nothing once the clause was ungated, so ` +
      "section 3's \"0 of 0\" refusal is guarding nothing");
    console.log(`      · lid clause ungated → ${bad} lids would promise a set they do not have → caught`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ wva one fraction every face: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error(`   · ${f}`);
  process.exit(1);
}
console.log(`\n✓ wva one fraction every face: all ${passed} assertions passed — one builder, five faces, ` +
  "one fraction\n");
