#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Score consistency harness — does a profile still present ONE model?
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex keeps three records on a politician, and they answer three different
// questions:
//
//   🏛️ Official Record        — how they voted / acted formally   (consistency.js)
//   🧾 Say-vs-Do              — does the public record back their stances
//   🤝 Promise Follow-Through — kept vs broken promises, Kept ÷ (Kept + Broken)
//
// Above them now sits ⚖️ Word vs Action (word-action.js): the primary read, which
// pools all documented word — hard pledges, stated positions, and repeated
// issue-linked branding — in three weights and tests it against the Official
// Record. It is a POOLING AND WEIGHTING layer over the per-issue test that
// already existed, not a fourth measurement, and Promise Follow-Through is its
// top tier rather than a rival number. Contract 10 holds it to that.
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
// So the contracts below are about NAMING and NON-DUPLICATION, checked against
// the real source and the real arithmetic:
//
//   1. the promise number is computed one way, and pending never enters it
//   2. no surface on a profile is labelled a bare, unqualified "Score"
//   3. the promise number is not printed twice in the same scroll
//   4. the promise verdict does not make the Say-vs-Do lane's claim
//   5. the three lanes are mounted, named, and separately addressable
//   6. Say-vs-Do shows a verdict, never a percentage; EER shows counts, never a ratio
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
  const open = src.indexOf("{", head);
  must(open !== -1, `window.${name} in ${file} has no body`);
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
  must(depth === 0, `could not brace-scan window.${name} in ${file}`);
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
// published once something has actually resolved.
const displayScore = (() => {
  const guard = INDEX.slice(INDEX.indexOf("window._pdxPromiseTally"),
    INDEX.indexOf("window._pdxPromiseState"));
  must(guard.length > 200, "index.html no longer carries the Promise Score honesty guard");
  const ctx = { Math, String, Number, JSON, parseInt, isNaN, Array, Object };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.runInContext(guard, vm.createContext(ctx), { filename: "promise-guard" });
  const display = ctx.window._pdxDisplayScore;
  must(typeof display === "function", "index.html no longer defines window._pdxDisplayScore");
  eq(display({ score: 64, kept: 0, broken: 0, pending: 9 }), null,
    "_pdxDisplayScore: an all-pending record must publish no percentage");
  eq(display({ score: 64, kept: 2, broken: 1 }), 64,
    "_pdxDisplayScore: a resolved record must publish its stored score");
  return display;
})();

// ═════════════════════════════════════════════════════════════════════════════
// Contract 1b — the hero ring and the Follow-Through block print the SAME number
// ─────────────────────────────────────────────────────────────────────────────
// The site publishes an impact-weighted headline (the stored p.score, gated by
// the honesty guard) and derives a raw ratio from the kept/broken ledger. Both
// are legitimate and the Deep Dive has always reconciled them — but they differ
// on most records with a resolved promise, so when the hero ring showed one and
// the Follow-Through block computed the other, a profile printed two different
// "promises kept" percentages a few hundred pixels apart. Checked against the
// real roster, not a fixture, because the gap only exists in the data.
// ═════════════════════════════════════════════════════════════════════════════
{
  const ctx = { Math, String, Number, JSON, Array, Object, parseInt, isNaN, console };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.runInContext(read("cmp-data.js"), vm.createContext(ctx), { filename: "cmp-data.js" });
  const roster = ctx.CMP_DATA;
  must(roster && typeof roster === "object", "cmp-data.js no longer defines CMP_DATA");

  let checked = 0, diverge = 0, mismatched = [];
  for (const p of Object.values(roster)) {
    const pub = displayScore(p);
    if (pub === null) continue;
    const m = ftMeta(p.kept, p.broken, p.pending, pub);
    checked++;
    if (m.raw !== pub) diverge++;
    if (m.rate !== pub && mismatched.length < 5) mismatched.push(`${p.name}: ring ${pub}% vs block ${m.rate}%`);
  }
  must(checked > 20, `only ${checked} roster records carry a published promise score — expected the full set`);
  must(diverge > 0,
    "no roster record diverges between the weighted headline and the raw ratio, so this\n" +
    "  contract can no longer detect the two-numbers bug it exists to prevent");
  eq(mismatched.length, 0,
    "the hero ring and the Follow-Through block disagree on the promise percentage:\n" +
    "    " + mismatched.join("\n    "));

  // …and the raw ratio must still be reachable, so the headline is never a
  // figure the visible breakdown cannot produce.
  const lee = Object.values(roster).find((p) => p.name === "Mike Lee");
  must(lee, "Mike Lee is no longer in the roster — the documented verification profile");
  const leeM = ftMeta(lee.kept, lee.broken, lee.pending, displayScore(lee));
  eq(leeM.rate, displayScore(lee), "Mike Lee: the block headline should be the published score");
  eq(leeM.raw, Math.round(lee.kept / (lee.kept + lee.broken) * 100),
    "Mike Lee: the raw ratio should still be derived from the kept/broken ledger");
  ok(leeM.weighted === (leeM.rate !== leeM.raw),
    "the `weighted` flag no longer tracks whether the headline differs from the raw ratio");

  // Omitting the published figure must leave the old behaviour intact for the
  // card-strip caller.
  eq(ftMeta(36, 11, 3).rate, 77, "_ftMeta with no published figure should headline the raw ratio");
  eq(ftMeta(36, 11, 3, 72).rate, 72, "_ftMeta should headline the published figure when given one");
  eq(ftMeta(0, 0, 5, 72).rate, null,
    "_ftMeta must not publish a percentage for an all-pending record, even with a stored score");

  // The profile has to actually hand the published figure over.
  ok(/_renderFollowThrough\(\(keptCount[^)]*\)[^)]*\)[^)]*\)[^)]*,\s*id,\s*scoreNum\)/.test(PROFILES) ||
     /_renderFollowThrough\([^;]*,\s*id,\s*scoreNum\)/.test(PROFILES),
    "the profile no longer passes the published score into _renderFollowThrough — the\n" +
    "    block will recompute its own raw ratio and contradict the hero ring again");
  ok(/That raw ratio is/.test(PROFILES),
    "the Follow-Through block no longer states the raw ratio behind the weighted headline");

  // The "ⓘ How?" popover opens FROM the headline number, so it cannot answer
  // with a different one.
  const info = read("like-dislike.js");
  const calc = info.slice(info.indexOf("window._pdxPromiseInfo"),
    info.indexOf("pdx-pinfo-formula-eq"));
  must(calc.length > 400, "like-dislike.js no longer builds the promise explainer's calc line");
  ok(/_pdxDisplayScore/.test(calc),
    "the promise explainer computes only the raw ratio — opened from the weighted\n" +
    "    headline it then shows a different number than the one the visitor tapped");
  ok(/% raw/.test(calc),
    "the promise explainer no longer labels its ratio as the raw figure");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 2 — nothing on a profile is labelled a bare "Score"
// A profile carries three records. An unqualified "Score" reads as a verdict on
// all three when it only ever described one.
// ═════════════════════════════════════════════════════════════════════════════
{
  const ring = PROFILES.indexOf("const scoreRing =");
  must(ring !== -1, "profiles-full.js no longer builds the hero scoreRing");
  const ringBlock = PROFILES.slice(ring, PROFILES.indexOf("// Key issues pills", ring));
  must(ringBlock.length > 200, "could not isolate the hero score ring markup");
  ok(!/>Score<\/div>/.test(ringBlock),
    "hero score ring is labelled a bare \"Score\" — name the lane it measures (it is the promise lane)");
  ok(/>Promises<\/div>/.test(ringBlock),
    "hero score ring no longer names the promise lane");

  ok(!/label:\s*'Score'/.test(PROFILES),
    "the nav rail still carries a pill labelled a bare \"Score\"");
  ok(/label:\s*'Promises'/.test(PROFILES),
    "the nav rail no longer carries the Promises pill");
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

  // The nav rail's Record pill reports COUNTS. The rate is the pill directly
  // above it; recomputing it here made one number look like two findings.
  const rail = PROFILES.slice(PROFILES.indexOf("const _navItems = []"),
    PROFILES.indexOf("Controversies — the neutral flashpoints block"));
  must(rail.length > 400, "could not isolate the profile nav rail");
  ok(!/keptCount\s*\/\s*_resolved/.test(rail),
    "the nav rail's Record pill recomputes the follow-through rate — it sits beside\n" +
    "    the Promises pill that already shows it");
  ok(/label:\s*'Record',\s*value:\s*keptCount\s*\+\s*'K/.test(rail),
    "the nav rail's Record pill no longer reports kept/broken counts");
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
// Contract 6 — Say-vs-Do is a verdict, never a %. EER is counts, never a ratio.
// ═════════════════════════════════════════════════════════════════════════════
{
  const summary = CONSISTENCY.slice(CONSISTENCY.indexOf("function _scopeSummaryHtml"),
    CONSISTENCY.indexOf("function _gateCard"));
  must(summary.length > 200, "consistency.js no longer defines _scopeSummaryHtml");
  const saydoBranch = summary.slice(summary.indexOf("// Say-vs-Do"));
  must(saydoBranch.length > 40, "the Say-vs-Do branch of _scopeSummaryHtml has moved");
  ok(saydoBranch.indexOf("%") === -1,
    "the Say-vs-Do gateway card now prints a percentage — it is a verdict chip by design");

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
  ok(/Promises Kept/.test(PROFILES),
    "the Follow-Through block no longer labels its big number");
  ok(/Promise % = Kept ÷ \(Kept \+ Broken\)/.test(PROFILES),
    "the Deep Dive no longer states the promise formula");
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
