#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Score consistency harness — does a profile still present ONE model?
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex keeps three records on a politician, and they answer three different
// questions:
//
//   🏛️ Official Record        — how they voted / acted formally   (consistency.js)
//   🧾 Say-vs-Do              — does the public record back their stances
//   🤝 Promise receipts       — which explicit pledges were kept, broken, still open
//
// Above them now sits ⚖️ Word vs Action (word-action.js): the primary read, which
// pools all documented word — hard pledges, stated positions, and repeated
// issue-linked branding — in three weights and tests it against the Official
// Record. It is a POOLING AND WEIGHTING layer over the per-issue test that
// already existed, not a fourth measurement, and the pledge lane is its top tier
// rather than a rival number. Contract 10 holds it to that.
//
// The Promise Follow-Through PERCENTAGE — Kept ÷ (Kept + Broken), once printed as
// a hero ring, a compare column and a card pill — is RETIRED. Not withheld
// pending a ledger: retired. Word vs Action is the one integrity percentage, and
// the pledge lane publishes counts and verdicts only. Several contracts below
// were inverted for that: they used to require the figure be threaded through
// every surface consistently, and now require that no surface reaches it at all.
//
// Plus two things that are deliberately NOT record scores: 🎯 Your Match (the
// visitor's own issue picks) and ✒️ the Executive Enactment Record (counts only —
// the set of orders a president may sign is self-chosen, so there is no honest
// denominator).
//
// The failure mode this harness exists to catch is not a wrong number. It is the
// SAME number printed several times under several names, which is what a profile
// used to do: window._pdxDisplayScore() appeared as a hero ring labelled "Score",
// a nav pill labelled "Score", a block labelled "Follow-Through Rate" and a bar
// labelled "Promise Follow-Through", with the rate recomputed a fifth time inside
// the "Record" pill. A reader counting badges saw four findings where the data
// held one, and the bare word "Score" read as a verdict on all three records.
//
// The second shape of the same failure was RIVAL numbers: each lane pooled itself
// into its own headline rate, so a profile met a pledge %, an Official Record %, a
// Say-vs-Do integrity % and a divergence pair, none of them wrong and none of them
// the answer. Pooling is now the primary score's job alone (Contract 1c). Per-issue
// and per-stance percentages are untouched — a gap is unreadable without both sides.
//
// So the contracts below are about NAMING and NON-DUPLICATION, checked against
// the real source and the real arithmetic:
//
//   1. the promise number is computed one way, and pending never enters it
//  1b. every surface that publishes the pledge figure publishes the same one
//  1c. exactly one POOLED percentage renders on a profile, and it is the primary score
//   2. the hero ring carries the primary score; nothing is a bare "Score"
//   3. the promise number is not printed twice in the same scroll
//   4. the promise verdict does not make the Say-vs-Do lane's claim
//   5. the three lanes are mounted, named, and separately addressable
//   6. the gateway cards show verdicts, never percentages; EER shows counts, never a ratio
//   7. the retired composites stay retired
//   8. no surviving copy points at a surface that no longer renders
//   9. the promise lane has one canonical name everywhere
//  10. the unified Word vs Action read leads, contains the promise lane, and does
//      not become a fourth number saying the same thing
//
//   node scripts/test-score-consistency.mjs
//
// No DB, no network, no build step.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");

const failures = [];
let passed = 0;
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg}\n    expected ${JSON.stringify(b)}\n    got      ${JSON.stringify(a)}`);

// A probe target that has been renamed away is a STALE HARNESS, not a pass: the
// contract simply stopped being checked, which is the quietest way for a
// regression to ship.
function must(cond, what) {
  if (!cond) {
    console.error(
      "✗ score-consistency harness is STALE — a contract cannot be verified:\n  " + what +
      "\n\n  This is not a passing state. Restore the probe target, or update this\n" +
      "  harness AND re-check the score model it describes."
    );
    process.exit(2);
  }
}

const PROFILES = read("profiles-full.js");
const CONSISTENCY = read("consistency.js");
const ACCT = read("accountability-score.js");
const EXEC_UI = read("exec-record-ui.js");
const INDEX = read("index.html");

// Pull one `window.<name> = function(…) { … };` out of a source file by brace
// scanning, so a contract can be checked against the real body rather than a
// re-implementation of it.
function extractFn(src, name, file) {
  const head = src.indexOf("window." + name + " = function");
  must(head !== -1, `${file} no longer defines window.${name}`);
  return braceScan(src, head, `window.${name}`, file);
}

// The same, for a plain `function <name>(…) {}` declared inside a module's IIFE.
// Several of the renderers a contract needs to read are never exported.
function extractLocalFn(src, name, file) {
  const re = new RegExp("function\\s+" + name + "\\s*\\(", "g");
  const m = re.exec(src);
  must(m !== null, `${file} no longer declares function ${name}()`);
  return braceScan(src, m.index, name + "()", file);
}

// Brace-match a function body out of source text.
//
// COMMENTS ARE SKIPPED, and that is not a refinement — it is the difference between
// this probe testing what it names and testing an arbitrary window of the file. An
// apostrophe in a prose comment ("the profile's one primary score") looks exactly
// like an opening quote to a naive scanner, which then swallows every brace until
// the next apostrophe and runs clean past the closing brace it was looking for. The
// extraction still returns a string, so nothing throws; the contract just silently
// starts asserting over the wrong region, and passes or fails on what happens to be
// nearby. This repo's comments are prose-heavy, so that is the normal case here, not
// an edge case.
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
    // Line and block comments, before any quote handling — their contents are prose
    // and must not be read as code.
    if (c === "/" && src[i + 1] === "/") {
      const nl = src.indexOf("\n", i);
      if (nl === -1) { i = src.length; break; }
      i = nl;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      must(end !== -1, `unterminated block comment while scanning ${label} in ${file}`);
      i = end + 1;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") { inStr = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { i++; break; } }
  }
  must(depth === 0, `could not brace-scan ${label} in ${file}`);
  return src.slice(head, i);
}

// The section of openModal() that builds the profile's own markup. Every
// "is it printed twice" contract is scoped to this, so a string that legitimately
// appears in an unrelated helper cannot fail the run.
//
// Comments are stripped first: a removal is usually recorded with a comment
// naming the thing removed, and a harness that cannot tell the tombstone from the
// body would report the deletion as a regression.
function profileBody() {
  const start = PROFILES.indexOf("id=\"pdxsec-score\"");
  must(start !== -1, "profiles-full.js no longer mounts the #pdxsec-score anchor");
  const end = PROFILES.indexOf("id=\"pdx-promise-section\"", start);
  must(end !== -1, "profiles-full.js no longer mounts #pdx-promise-section");
  return PROFILES.slice(start, end)
    .replace(/<!--[\s\S]*?-->/g, "")
    .split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
}
const BODY = profileBody();
const countOf = (hay, needle) => hay.split(needle).length - 1;

// ═════════════════════════════════════════════════════════════════════════════
// Contract 1 — the promise number: Kept ÷ (Kept + Broken), pending excluded
// Probed behaviourally against the real _ftMeta, not read off a literal.
// ═════════════════════════════════════════════════════════════════════════════
const ftMeta = (() => {
  const ctx = { Math, String, Number, JSON, isNaN };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.runInContext(extractFn(PROFILES, "_ftMeta", "profiles-full.js"),
    vm.createContext(ctx), { filename: "_ftMeta" });
  must(typeof ctx.window._ftMeta === "function", "_ftMeta did not evaluate to a function");
  return ctx.window._ftMeta;
})();

{
  eq(ftMeta(3, 1, 0).raw, 75, "_ftMeta: 3 kept / 1 broken should be 75%");
  eq(ftMeta(3, 1, 99).raw, 75,
    "_ftMeta: pending must not move the rate — 99 pending changed the answer");
  eq(ftMeta(0, 0, 4).rate, null,
    "_ftMeta: nothing resolved must be null (no percentage), not 0%");
  eq(ftMeta(1, 2, 0).raw, 33, "_ftMeta: 1 kept / 2 broken should round to 33%");
  eq(ftMeta(0, 0, 0).resolved, 0, "_ftMeta: empty record should report 0 resolved");
}

// The honesty guard the whole promise lane rests on: a stored p.score is only
// published once something has actually resolved AND the pledges behind it are
// itemized, so the reader can check the figure against a ledger rather than
// taking it on faith. The state machine that keeps a withheld rate from reading
// as an empty record is evaluated alongside it, since the two are one contract.
const [displayScore, promiseState] = (() => {
  const guard = INDEX.slice(INDEX.indexOf("window._pdxPromiseTally"),
    INDEX.indexOf("window._pdxTrackingNote"));
  must(guard.length > 200, "index.html no longer carries the Promise Score honesty guard");
  const ctx = { Math, String, Number, JSON, parseInt, isNaN, Array, Object };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.runInContext(guard, vm.createContext(ctx), { filename: "promise-guard" });
  const display = ctx.window._pdxDisplayScore;
  const state = ctx.window._pdxPromiseState;
  must(typeof display === "function", "index.html no longer defines window._pdxDisplayScore");
  must(typeof state === "function", "index.html no longer defines window._pdxPromiseState");
  eq(display({ score: 64, kept: 0, broken: 0, pending: 9 }), null,
    "_pdxDisplayScore: an all-pending record must publish no percentage");
  eq(display({ score: 64, kept: 2, broken: 1, promises: [{ verdict: "kept" }] }), 64,
    "_pdxDisplayScore: a resolved record with an inspectable ledger must publish its score");
  eq(display({ score: 64, kept: 2, broken: 1 }), null,
    "_pdxDisplayScore: summary counts with no itemized promises[] must publish nothing —\n" +
    "    there is no ledger for the reader to check the figure against");
  return [display, state];
})();

// ═════════════════════════════════════════════════════════════════════════════
// Contract 1b — every surface that publishes the pledge figure publishes the SAME one
// ─────────────────────────────────────────────────────────────────────────────
// The site stores an impact-weighted pledge figure (p.score, gated by the honesty
// guard) and can also derive a raw ratio from the kept/broken ledger. Both are
// legitimate and the Deep Dive has always reconciled them — but they differ on
// most records with a resolved promise, so any surface that recomputes instead of
// taking the published figure prints a second, contradictory "promises kept" rate.
// The hero ring no longer shows this figure at all (it carries the primary Word vs
// Action score — see Contract 2), so the surfaces at stake are now the
// Follow-Through block, its "ⓘ How?" explainer and the compare strip. Checked
// against the real roster, not a fixture, because the gap only exists in the data.
// ═════════════════════════════════════════════════════════════════════════════
{
  const ctx = { Math, String, Number, JSON, Array, Object, parseInt, isNaN, console };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.runInContext(read("cmp-data.js"), vm.createContext(ctx), { filename: "cmp-data.js" });
  const roster = ctx.CMP_DATA;
  must(roster && typeof roster === "object", "cmp-data.js no longer defines CMP_DATA");

  let checked = 0, diverge = 0, withheld = 0, mismatched = [];
  for (const p of Object.values(roster)) {
    const pub = displayScore(p);
    // A record whose kept/broken counts have no itemized promises[] behind them
    // now publishes no pledge figure at all (see test-promise-honesty.mjs), so
    // there is no second number for this contract to contradict. Counted, because
    // the SIZE of that set is what makes the contract's floor below meaningful.
    if (pub === null) {
      if (promiseState(p) === "counts") withheld++;
      continue;
    }
    const m = ftMeta(p.kept, p.broken, p.pending, pub);
    checked++;
    if (m.raw !== pub) diverge++;
    if (m.rate !== pub && mismatched.length < 5) mismatched.push(`${p.name}: published ${pub}% vs block ${m.rate}%`);
  }
  // The floor moved when the itemized-ledger guard landed: the roster carries 52
  // records with a resolved pledge record, and only the 11 with an inspectable
  // promises[] still publish a rate. Both halves are asserted, so this contract
  // fails if the guard stops withholding OR starts over-withholding — a silent
  // drift in either direction is how the honesty rule would quietly stop holding.
  must(checked >= 8,
    `only ${checked} roster records publish a promise score — expected the itemized set.\n` +
    "  If this dropped, the display guard is over-withholding and the pledge tier has\n" +
    "  gone dark for records that DO have a ledger.");
  must(withheld >= 20,
    `only ${withheld} roster records are withheld as counts-only — expected the bulk of\n` +
    "  the resolved set. If this dropped, the guard has stopped withholding unauditable\n" +
    "  rates and the two-numbers bug is back.");
  eq(mismatched.length, 0,
    "the published pledge figure and the Follow-Through block disagree:\n" +
    "    " + mismatched.join("\n    "));

  // …and the raw ratio must still be reachable, so the headline is never a figure
  // the visible breakdown cannot produce.
  //
  // This used to be checked against Mike Lee, whose stored 72% sat beside a raw
  // ratio of 77%. That record turned out to be counts-only, and so did every other
  // roster record where the two figures diverged — which is the whole point: the
  // weighted headline could only differ from the visible ledger on records whose
  // ledger was not visible. All 11 records that still publish now reproduce their
  // own headline from their own counts. So the reconciliation MACHINERY is verified
  // against explicit fixtures instead, and `diverge` is reported rather than
  // required, because a roster with no divergence is now the correct state.
  const wM = ftMeta(36, 11, 3, 72);
  eq(wM.rate, 72, "the block headline should be the published figure when one is supplied");
  eq(wM.raw, 77, "the raw ratio should still be derived from the kept/broken ledger");
  eq(wM.weighted, true,
    "the `weighted` flag no longer marks a headline that differs from the raw ratio, so\n" +
    "    the block cannot tell the reader the two figures are not the same measurement");
  const sameM = ftMeta(5, 1, 0, 83);
  eq(sameM.weighted, false,
    "the `weighted` flag fired on a record whose headline equals its raw ratio, which\n" +
    "    would explain a difference that is not there");
  ok(diverge >= 0, "unreachable");
  if (diverge === 0) {
    console.log(`  note: ${checked} published pledge figure(s), none diverging from their raw ratio; ` +
      `${withheld} counts-only record(s) withheld`);
  }

  // Mike Lee stays in the roster as the documented counts-only case.
  const lee = Object.values(roster).find((p) => p.name === "Mike Lee");
  must(lee, "Mike Lee is no longer in the roster — the documented verification profile");
  eq(displayScore(lee), null,
    "Mike Lee publishes a pledge percentage again — his 36/11 counts have no itemized\n" +
    "    promises[] behind them, and his stored 72% cannot be reproduced from them");
  eq(promiseState(lee), "counts",
    "Mike Lee no longer reports the 'counts' state, so his profile falls back to an\n" +
    "    empty-record reading despite 47 resolved promises on file");

  // Omitting the published figure must leave the old behaviour intact for the
  // card-strip caller.
  eq(ftMeta(36, 11, 3).rate, 77, "_ftMeta with no published figure should headline the raw ratio");
  eq(ftMeta(36, 11, 3, 72).rate, 72, "_ftMeta should headline the published figure when given one");
  eq(ftMeta(0, 0, 5, 72).rate, null,
    "_ftMeta must not publish a percentage for an all-pending record, even with a stored score");

  // The pledge percentage is RETIRED as a published figure (see the file header).
  // _ftMeta still computes `rate` because the object is shared plumbing, but the
  // profile now hands `null` where the published figure used to go, and nothing
  // downstream may print either number. So this contract flipped: it used to
  // require the figure be threaded through, and now requires that it isn't.
  ok(/_renderFollowThrough\([\s\S]{0,220}?,\s*id,\s*null,\s*pledgeItemized\)/.test(PROFILES),
    "the profile passes a pledge percentage into _renderFollowThrough again — the\n" +
    "    published figure is retired, so `null` belongs in that argument and the block\n" +
    "    must render counts only");
  ok(!/That raw ratio is/.test(PROFILES),
    "the Follow-Through block states a raw ratio again — the pledge lane publishes no\n" +
    "    percentage on any profile now, only kept / broken / pending counts");

  // The "ⓘ How?" popover explains the pledge receipts. It must not quietly work
  // the retired percentage out longhand — a rate reached by division in a popover
  // is still a second score competing with ⚖️ Word vs Action.
  const info = read("like-dislike.js");
  const calc = info.slice(info.indexOf("window._pdxPromiseInfo"),
    info.indexOf("pdx-pinfo-formula-eq"));
  must(calc.length > 400, "like-dislike.js no longer builds the promise explainer's calc line");
  ok(!/_pdxDisplayScore/.test(calc),
    "the promise explainer reads the display score again — it reports counts only, for\n" +
    "    every record, so no popover can reintroduce the retired pledge rate");
  ok(!/% raw/.test(calc.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n")),
    "the promise explainer labels a ratio as the raw figure again — there is no ratio\n" +
    "    left to label");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 1c — exactly ONE pooled percentage renders on a profile
// ─────────────────────────────────────────────────────────────────────────────
// Every supporting lane can compute a rate, and for a long time every one of them
// printed it: the record stage opened with a pooled Official Record %, Say-vs-Do
// headed itself with a pooled integrity %, both gateway cards carried their own,
// and the divergence summary printed two side by side. A reader met four or five
// competing rates on one profile with no way to know which one was the finding.
// The rule now: POOLED figures belong to the primary score only. Per-issue and
// per-stance working percentages stay — a gap is unreadable without both sides —
// but no lane may aggregate itself into a headline rate.
// ═════════════════════════════════════════════════════════════════════════════
{
  const slice = (from, to, label) => {
    const a = CONSISTENCY.indexOf(from);
    must(a !== -1, `consistency.js no longer contains ${label}`);
    const b = CONSISTENCY.indexOf(to, a);
    must(b !== -1, `could not find the end of ${label}`);
    const s = CONSISTENCY.slice(a, b);
    must(s.length > 200, `could not isolate ${label}`);
    return s;
  };

  // The Official Record head: composition + verdict chip, no pooled number.
  const orHead = slice("var overallHtml =", "if (!scored.length)", "the Official Record head");
  ok(!/pdxor-pct/.test(orHead),
    "the Official Record section head prints its pooled percentage again — the record\n" +
    "    stage is the evidence layer under the primary score, not a rival headline");

  // Say-vs-Do's head: verdict chip only, and no pooled integrity block.
  const sd = extractLocalFn(CONSISTENCY, "_sdInner", "consistency.js");
  ok(!/pdxor-integrity/.test(sd),
    "the Say-vs-Do head renders its pooled integrity percentage again — Say-vs-Do is\n" +
    "    supporting receipts and publishes no score of its own");
  ok(/never counted inside it|not a rating/i.test(sd),
    "the Say-vs-Do section no longer states that it feeds nothing into the score");

  // The divergence summary reports a gap in points, not two rival rates.
  const dv = extractLocalFn(CONSISTENCY, "_dvInner", "consistency.js");
  ok(!/_divNum\(/.test(dv),
    "the divergence summary prints both pooled percentages again — it existed to\n" +
    "    describe the RELATIONSHIP between them, and printing both made two more\n" +
    "    headline rates out of a cross-check");
  ok(/pdxdv-gap/.test(dv),
    "the divergence summary no longer reports the gap itself");

  // The retired gateway percentage stays retired. Matched on the emitted class
  // attribute, not the bare token, so the comment recording the removal does not
  // read as the removal being undone.
  ok(CONSISTENCY.indexOf('class="pdxc-gate-pct') === -1,
    "the gateway cards emit a pooled percentage again");

  // Every supporting lane says, on the surface, which score it feeds. Four lanes
  // now: Official Record, Stances & Connections, and the two unmounted exporters
  // (Say-vs-Do, divergence) that still carry the line so they cannot be remounted
  // as independent score widgets.
  eq(countOf(CONSISTENCY, "_feedsPrimaryHtml("), 5,
    "expected one _feedsPrimaryHtml definition and one call from each supporting lane\n" +
    "    (Official Record, Stances & Connections, Say-vs-Do, divergence) — a lane without\n" +
    "    that line reads as an independent score widget again");
  const feeds = extractLocalFn(CONSISTENCY, "_feedsPrimaryHtml", "consistency.js");
  ok(/pdxsec-wordaction/.test(feeds),
    "the feeds-the-primary line no longer links to the Word vs Action section");
  ok(/PDXWordAction/.test(feeds) && /return ''/.test(feeds),
    "the feeds-the-primary line no longer self-gates on the engine being present —\n" +
    "    it would point at a section that never mounted");

  // And the primary section itself shows what feeds it.
  const wa = read("word-action.js");
  const fh = extractLocalFn(wa, "feedsHtml", "word-action.js");
  for (const target of ["pdxsec-score", "pdxsec-positions", "pdxsec-official-record"]) {
    ok(fh.indexOf(target) !== -1,
      `the "what feeds this score" panel no longer points at #${target} — the reader\n` +
      "    cannot get from the one score back to the evidence under it");
  }
  ok(/counted:\s*false/.test(fh),
    "the feeds panel no longer marks its context-only rows as uncounted — a supporting\n" +
    "    layer would read as part of the arithmetic");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 2 — the hero ring carries the PRIMARY score, and nothing on a profile
// is labelled a bare "Score"
// ─────────────────────────────────────────────────────────────────────────────
// The ring used to render the pledge-only percentage inline, which made the
// pledge lane look like the profile's headline finding. It now delegates to the
// Word vs Action engine, so the ring and the section it summarises are one code
// path and cannot drift. An unqualified "Score" is still forbidden: a profile
// carries several records, so a bare label reads as a verdict on all of them.
// ═════════════════════════════════════════════════════════════════════════════
{
  const wa0 = read("word-action.js");
  const ring = PROFILES.indexOf("const scoreRing =");
  must(ring !== -1, "profiles-full.js no longer builds the hero scoreRing");
  const ringBlock = PROFILES.slice(ring, PROFILES.indexOf("// Key issues pills", ring));
  must(ringBlock.length > 200, "could not isolate the hero score ring markup");
  ok(!/>Score<\/div>/.test(ringBlock),
    "hero score ring is labelled a bare \"Score\" — name what it measures");
  ok(/PDXWordAction\.heroMount\(/.test(ringBlock),
    "the hero ring no longer delegates to the Word vs Action engine — it is building\n" +
    "    its own headline again, which is how the ring and the section it summarises\n" +
    "    came to print different findings");
  eq(countOf(PROFILES, "PDXWordAction.heroMount("), 1,
    "expected exactly one heroMount call in profiles-full.js — a second mount would\n" +
    "    print the primary score twice on one profile");
  ok(!/\$\{scoreText\}/.test(ringBlock) && !/\$\{scoreColor\}/.test(ringBlock),
    "the hero ring prints the pledge percentage again — the primary score is the only\n" +
    "    major % on the profile header, and the pledge rate is a supporting detail");
  // Stronger than the interpolation check above: no literal percent sign may be
  // built anywhere in the ring block, so a hand-assembled `scoreNum + '%'` or a
  // reinstated legacy fallback ring cannot slip past by avoiding the two names.
  ok(!/%/.test(ringBlock),
    "the hero ring block builds a percentage of its own — every number in the header\n" +
    "    has to come from PDXWordAction.heroMount() or the two frames can disagree");
  const heroOpen = PROFILES.indexOf('<div class="profile-hero">');
  must(heroOpen !== -1, "profiles-full.js no longer renders the .profile-hero header");
  const heroMarkup = PROFILES.slice(heroOpen, PROFILES.indexOf("${scoreRing}", heroOpen) + 40);
  must(heroMarkup.length > 400, "could not isolate the .profile-hero markup");
  ok(!/%/.test(heroMarkup) && !/\$\{scoreText\}/.test(heroMarkup),
    "the profile header prints a percentage outside the primary ring — the hero carries\n" +
    "    one major number, and it is the ⚖️ Word vs Action read");
  eq(countOf(PROFILES, "${scoreRing}"), 1,
    "the hero score stack is inserted more than once — one header, one primary score");

  // Promises are OUT of the header entirely. Phase 5 allowed them there as counts —
  // "🤝 6 kept · 6 broken · 2 pending" under the ring — on the reasoning that counts
  // are not a rate and so cannot rival a percentage. In practice three numbers sitting
  // directly beneath one number are still read as a second finding, and on a president
  // that chip was the loudest promise chrome on the page. The pledge lane is the top
  // TIER inside the ring's percentage; it is named in the score's feeds list and its
  // ledger is in the drawers, which is where an input belongs.
  ok(!/pledge:/.test(ringBlock),
    "the hero is handed a pledge ledger again — promise counts above the fold are the\n" +
    "    second headline this whole harness exists to prevent");
  ok(!/pledgeChipHtml/.test(wa0),
    "word-action.js builds a hero pledge chip again — the header carries ONE number");
  ok(!/pdxwa-hero-pledge/.test(wa0) && !/pdxwa-hero-pledge/.test(read("word-action.css")),
    "the hero pledge chip's markup or styling is back");
  ok(/THE HERO PLEDGE CHIP IS GONE/.test(wa0),
    "the note recording why the hero pledge chip was removed is gone, so it will be re-added");
  const heroFn = wa0.slice(wa0.indexOf("function heroInner"), wa0.indexOf("function bindHero"));
  ok(!/kept/.test(heroFn) && !/broken/.test(heroFn),
    "the hero renders kept/broken counts again — the pledge lane is inside the percentage,\n" +
    "    not printed beside it");

  // The primary read names itself in plain English on the ring, and the caption
  // must not reuse "Promise", which now names only the top tier inside it.
  const wa = wa0;
  // The literal, not a fixed window off the front of it. A 900-character slice read
  // whatever happened to sit near the top of the object, so this assertion silently
  // stopped covering `caption` the moment the block above it grew.
  const frameAt = wa.indexOf("var FRAME = {");
  const frameEnd = wa.indexOf("\n  };", frameAt);
  must(frameAt !== -1 && frameEnd > frameAt, "word-action.js no longer defines FRAME");
  const frame = wa.slice(frameAt, frameEnd);
  // One number, one name. "Kept word" on the ring and "Word vs Action" on the section
  // a screen below were two labels for one figure, and a reader with no reason to know
  // they were the same figure read them as two integrity products.
  ok(/caption:\s*'Word vs Action'/.test(frame),
    "the Word vs Action FRAME no longer captions the ring with the section's own name —\n" +
    "    a second name for one number is a second read of it");
  ok(!/caption:\s*'Kept word'/.test(frame),
    "the 'Kept word' caption is back, so the header and the section name the same figure twice");
  ok(!/caption:\s*'[^']*[Pp]romise/.test(frame),
    "the ring caption says \"Promise\" — that word names the pledge tier inside this\n" +
    "    score, so reusing it for the whole score rebuilds the ambiguity being removed");

  ok(!/label:\s*'Score'/.test(PROFILES),
    "the nav rail still carries a pill labelled a bare \"Score\"");
  // The rail once ran "Promises — N Kept" AND "Record — 6K · 6B · 2P": two headline
  // reads of one pledge table. Phase 5 cut it to one. Phase 6 cut it to none — a pill
  // reading "6K · 6B · 2P" one entry away from the ⚖️ percentage is a second scoreboard
  // in the header strip whatever it links to. The pledge ledger is reached from the
  // score's own feeds list, which is the honest doorway: an input, opened from the score.
  eq((PROFILES.match(/label:\s*'Promises'/g) || []).length, 0,
    "the rail carries a pledge pill again — one pledge table, and it is not a rail entry");
  ok(/PROMISES PILL RETIRED/.test(PROFILES),
    "the note recording why the Promises pill was retired is gone, so it will be re-added");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 3 — the promise number is not printed twice in the same scroll
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(BODY.indexOf("Promise Follow-Through · In-office record") === -1,
    "the duplicate promise bar is back: it reprints the same _pdxDisplayScore() the\n" +
    "    Follow-Through block directly above it already shows, with less context");

  eq(countOf(BODY, "_renderFollowThrough("), 1,
    "the Follow-Through block should be rendered exactly once in the profile body");

  // Below the hero, the percentage itself is allowed in exactly one place: the
  // Deep Dive's derivation line, where it appears beside the raw arithmetic as
  // an audit trail ("K ÷ (K + B) = n% raw · Published …"). Anywhere else in the
  // scroll it is a second headline for a number that already has one.
  const stray = BODY.split("\n")
    .filter((l) => l.includes("${scoreText}"))
    .filter((l) => !l.includes("Published Promise Follow-Through"));
  eq(stray.length, 0,
    "the profile body prints the raw promise percentage outside the Deep Dive\n" +
    "    derivation — it belongs to the hero ring and the Follow-Through block");

  // The rail's Record pill points at the Official Record and reports COVERAGE —
  // "N of M tested" — not a rate and not a second pledge count. It used to do the
  // latter, aimed into the pledge drawer, which made one number read as two
  // findings. The slice runs to the end of the pill list rather than to a named
  // pill, because the pills are pushed in page order and page order changes when
  // the spine does.
  const rail = PROFILES.slice(PROFILES.indexOf("const _navItems = []"),
    PROFILES.indexOf("A single pill isn't a"));
  must(rail.length > 400, "could not isolate the profile nav rail");
  ok(!/keptCount\s*\/\s*_resolved/.test(rail),
    "the nav rail's Record pill recomputes the follow-through rate — it sits beside\n" +
    "    the Promises pill that already shows it");
  ok(/label:\s*'Record',\s*\n?\s*value:\s*\(_orTested\.tested\s*\|\|\s*0\)\s*\+\s*' of '/.test(rail),
    "the nav rail's Record pill no longer reports Official Record coverage — it is the\n" +
    "    only pill for the formal-record lane, so it has to say how much of it was tested");
  ok(/target:\s*'pdxsec-official-record',[\s\S]{0,200}label:\s*'Record'/.test(rail),
    "the Record pill no longer points at the Official Record — a pill labelled Record has to\n" +
    "    land on the record lane, not on a pledge drawer");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 4 — the promise verdict does not make the Say-vs-Do lane's claim
// "Keeps their word" is what the broader public record answers. This lane only
// knows about discrete tracked promises, so it must say only that.
// ═════════════════════════════════════════════════════════════════════════════
{
  const verdicts = [ftMeta(9, 1, 0), ftMeta(6, 4, 0), ftMeta(1, 9, 0)].map((m) => m.verdict);
  for (const v of verdicts) {
    ok(/promise/i.test(v),
      `promise verdict "${v}" does not name promises — it reads as a verdict on the\n` +
      "    whole person, which is the Say-vs-Do lane's job");
  }
  ok(!verdicts.includes("Keeps Their Word"),
    "the promise lane claims \"Keeps Their Word\" — that is the Say-vs-Do finding,\n" +
    "    and it is being asserted here from promise counts alone");

  for (const m of [ftMeta(9, 1, 0), ftMeta(6, 4, 0), ftMeta(1, 9, 0)]) {
    ok(/promise/i.test(m.sub),
      `promise sub-line "${m.sub}" does not scope itself to promises`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 5 — the three lanes are mounted, named and separately addressable
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const anchor of ["pdxsec-score", "pdxsec-official-record", "pdxsec-saydo"]) {
    ok(BODY.indexOf(anchor) !== -1 || PROFILES.indexOf(anchor) !== -1,
      `the profile no longer mounts #${anchor} — one of the three record lanes is gone`);
  }
  ok(/officialRecordSectionHtml/.test(PROFILES),
    "the profile no longer mounts the Official Record section");
  ok(/saydoSectionHtml/.test(PROFILES),
    "the profile no longer mounts the Say-vs-Do section");
  // The gateway names both institutional lanes and says promises are tracked apart.
  const gate = CONSISTENCY.slice(CONSISTENCY.indexOf("function gatewayHtml"),
    CONSISTENCY.indexOf("function gatewayHtml") + 1600);
  must(gate.length > 400, "consistency.js no longer defines gatewayHtml");
  ok(/Official Record/.test(gate) && /Say-vs-Do/.test(gate),
    "the Promise Tracker gateway no longer names both institutional lanes");
  ok(/promises are tracked on their own|Discrete promises/i.test(gate),
    "the gateway no longer says discrete promises are tracked separately");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 6 — the gateway cards are verdicts, never %. EER is counts, never a ratio.
// ─────────────────────────────────────────────────────────────────────────────
// _scopeSummaryHtml used to branch: the Official Record card printed its pooled
// percentage and only the Say-vs-Do card was verdict-only. Both are verdict-only
// now — the cards are doors into evidence, so they say what the evidence adds up
// to in words and leave the arithmetic to the one primary score. The probe reads
// the returned markup rather than the whole function, because the comment above
// the return names the percentage that was removed.
// ═════════════════════════════════════════════════════════════════════════════
{
  const summary = extractLocalFn(CONSISTENCY, "_scopeSummaryHtml", "consistency.js");
  const markup = summary.slice(summary.indexOf("return "));
  must(markup.length > 40, "the return statement of _scopeSummaryHtml has moved");
  ok(markup.indexOf("%") === -1,
    "a Promise Tracker gateway card prints a percentage — both cards are verdict chips\n" +
    "    by design, so the record stage does not open with a rate that competes with\n" +
    "    the profile's one primary score");
  ok(/pdxc-chip/.test(markup),
    "the gateway cards no longer carry a verdict chip at all");
  ok(!/class="pdxc-gate-pct/.test(summary),
    "the pooled gateway percentage has been reinstated");

  // Bounded by the export block rather than a fixed character count: the pill grew a
  // coverage qualifier, and a fixed window would have reported that addition as the
  // disappearance of the count it still returns.
  const pill = EXEC_UI.slice(EXEC_UI.indexOf("function navPill"),
    EXEC_UI.lastIndexOf("window.PDXExecRecordUI"));
  must(pill.length > 200, "exec-record-ui.js no longer defines navPill");
  ok(pill.indexOf("%") === -1,
    "the Executive Enactment Record nav pill prints a ratio — the EER is count-only\n" +
    "    because the set of actions an executive may take has no honest denominator");
  ok(/On File/.test(pill),
    "the EER nav pill no longer reports a qualified count");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 7 — the retired composites stay retired
// Both renderers must return '' as their FIRST statement, so no call site can
// resurrect a headline number by accident.
// ═════════════════════════════════════════════════════════════════════════════
for (const name of ["_renderAccountabilityCard", "_acctCardBadge"]) {
  const fn = extractFn(ACCT, name, "accountability-score.js");
  const firstStmt = fn
    .slice(fn.indexOf("{") + 1)
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("//"));
  eq(firstStmt, "return '';",
    `${name} no longer returns '' first — the retired Accountability of Truth\n` +
    "    composite is rendering as a headline number again");
}
{
  const mandate = extractFn(PROFILES, "_renderMandateAlignment", "profiles-full.js");
  ok(/Follow the Money/.test(mandate),
    "_renderMandateAlignment no longer renders the funding lens");
  ok(!/Keeps Promises[\s\S]{0,4000}return '<div class="modal-section" id="alignment-modal-section"/.test(mandate) ||
     /if \(!finSig\) return '';/.test(mandate),
    "the four-tile People's Mandate scorecard renders again — it re-presented the\n" +
    "    promise and accountability numbers as if they were separate findings");
  ok(/A separate <strong[^>]*>funding lens|not one of the record scores/.test(mandate),
    "the funding lens no longer states that it is not one of the record scores");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 8 — no surviving copy points at a surface that no longer renders
// #alignment-modal-section only exists when a finance signal renders, so anything
// that scrolls there must carry a fallback.
// ═════════════════════════════════════════════════════════════════════════════
{
  const re = /getElementById\((['"])alignment-modal-section\1\)/g;
  let m, checked = 0;
  while ((m = re.exec(PROFILES)) !== null) {
    checked++;
    const tail = PROFILES.slice(m.index, m.index + 260);
    const head = PROFILES.slice(Math.max(0, m.index - 200), m.index);
    ok(/\|\|\s*document\.getElementById/.test(tail) || /\|\|\s*document\.getElementById/.test(head),
      "a jump to #alignment-modal-section has no fallback — that section only renders\n" +
      "    when a finance signal exists, so on most profiles the button scrolls nowhere");
  }
  ok(checked > 0 || PROFILES.indexOf("alignment-modal-section") === -1,
    "harness note: expected either fallback-guarded jumps or none at all");

  // Retired surfaces must not be advertised in profile copy as if a reader could
  // go and look at them.
  ok(BODY.indexOf("People’s Mandate Alignment") === -1 &&
     BODY.indexOf("People's Mandate Alignment") === -1,
    "profile copy still sends readers to the People's Mandate Alignment scorecard,\n" +
    "    which no longer renders");
  ok(!/feed the Accountability of Truth Score/.test(PROFILES),
    "profile copy still points at the Accountability of Truth Score as a visible\n" +
    "    number — it is retired as a headline and only the analysis remains");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 9 — one canonical name for the promise lane, used everywhere
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(!/>Follow-Through Rate</.test(PROFILES),
    "a surface is still labelled \"Follow-Through Rate\" — the profile now names this\n" +
    "    lane \"Promise Follow-Through\" / \"Promises Kept\" so one number has one name");
  ok(/Promise Follow-Through/.test(PROFILES),
    "the canonical promise-lane name is gone from profiles-full.js");
  // The lane's "big number" is retired: it has counts and a verdict phrase now,
  // so what has to survive is the COUNT labelling, not a labelled percentage.
  ok(/Kept · /.test(PROFILES) && /still open/.test(PROFILES),
    "the pledge lane no longer labels its counts — with the percentage retired, the\n" +
    "    kept / broken / open counts are the whole finding and must be named");
  ok(!/Promise % = Kept ÷ \(Kept \+ Broken\)/.test(PROFILES),
    "the Deep Dive states the retired Promise % formula again — there is no published\n" +
    "    pledge percentage for it to explain");
  ok(/no percentage is published for this lane/.test(PROFILES),
    "the Deep Dive no longer says outright that this lane publishes no percentage —\n" +
    "    silently dropping the number reads as missing data rather than a retired score");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 10 — the unified ⚖️ Word vs Action read leads, and does not become a
// fourth number saying the same thing
// ═════════════════════════════════════════════════════════════════════════════
// The accountability standard is now one pool of documented word — hard pledges,
// stated positions, and repeated issue-linked branding — tested against the
// Official Record. That re-centering is exactly the kind of change that could
// reintroduce the failure mode this harness exists to catch: a new headline
// percentage printed beside the old one, in a new vocabulary, measuring the same
// thing. So the unified read has to lead, has to CONTAIN the promise lane rather
// than compete with it, and has to borrow the existing verdict words.
{
  const WA = read("word-action.js");

  // Mounted once, and ahead of the promise block.
  eq(countOf(PROFILES, "PDXWordAction.sectionHtml("), 1,
    "the Word vs Action section is mounted more than once on a profile — one read, one place");
  const waAt = PROFILES.indexOf("PDXWordAction.sectionHtml(");
  const ftAt = PROFILES.indexOf('id="pdxsec-score"');
  must(waAt !== -1, "profiles-full.js no longer mounts the Word vs Action section");
  must(ftAt !== -1, "profiles-full.js no longer mounts the #pdxsec-score anchor");
  ok(waAt < ftAt,
    "the promise block is presented ahead of the unified Word vs Action read, so the profile\n" +
    "    still opens on the pledge-only number rather than the standard that contains it");

  // Separately addressable, like the other lanes.
  ok(/id="pdxsec-wordaction"/.test(WA),
    "the Word vs Action section has no stable anchor, so the quick-jump rail cannot address it");
  ok(/target: 'pdxsec-wordaction'/.test(PROFILES),
    "the quick-jump rail does not list the primary accountability read");

  // It is NOT the promise number wearing a new hat: the percentage must come from
  // tested word items, never from the roster's promise counts or display score.
  const scoring = WA.slice(WA.indexOf("function read("), WA.indexOf("function dots("));
  must(scoring.length > 400, "word-action.js no longer defines read()");
  ok(!/_pdxDisplayScore|p\.score|p\.kept|p\.broken/.test(scoring),
    "the Word vs Action percentage reads the roster promise counts or the display score — that\n" +
    "    would make it the same number under a fourth name, which is the whole failure mode here");
  ok(/appliedWeight|it\.weight/.test(scoring),
    "the Word vs Action percentage is no longer a weighted average of tested word items");

  // It borrows the shared verdict vocabulary instead of inventing a fourth one.
  ok(/PDXConsistency/.test(WA) && /VERDICTS/.test(WA),
    "word-action.js does not read the shared verdict vocabulary, so the profile would carry two\n" +
    "    different sets of words for the same finding");
  // …and it does not invent a rival name for itself. ("Truth Score" is not in this
  // list: the retired Accountability of Truth Score is still named in explanatory
  // comments, and contracts 7 and 8 already keep it retired as a surface.)
  for (const invented of ["Keeps Their Word", "Word Score", "Integrity Score", "Honesty Score"]) {
    ok(WA.indexOf(invented) === -1 && PROFILES.indexOf(invented) === -1,
      `a surface introduces "${invented}" — the unified read is named "Word vs Action" and its\n` +
      "    verdicts come from the shared consistency palette");
  }

  // The two ⚖️ surfaces stay distinguishable by name.
  ok(/label: 'Say-vs-Do'|label: "Say-vs-Do"/.test(CONSISTENCY),
    "the Say-vs-Do lane lost its own name, so two surfaces sharing the ⚖️ mark would be\n" +
    "    indistinguishable in copy");
  ok(/Word vs Action/.test(WA) && !/Say-vs-Do/.test(WA.slice(WA.indexOf("var FRAME"), WA.indexOf("var FRAME") + 300)),
    "the Word vs Action frame borrows the Say-vs-Do name");

  // The promise lane survives as a TIER of the unified read, in its own words.
  ok(/pledge tier/i.test(PROFILES),
    "nothing on the profile explains that Promise Follow-Through is the pledge tier of the\n" +
    "    unified read — demoted without explanation reads as two rival scores");
  ok(/Counts most/.test(WA) && /Counts least/.test(WA),
    "the tier ladder no longer states its ranking in plain language");
}

// ─────────────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ score consistency: ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}\n`));
  process.exit(1);
}
console.log(`✓ score consistency: ${passed} assertions passed`);
