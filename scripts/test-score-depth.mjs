#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-score-depth.mjs — a published score says how much is under it
// ─────────────────────────────────────────────────────────────────────────────
// Two numbers in this product look identical and are not: 100% over three tested
// issues and 100% over forty. Until this pass only the stance tree said which one
// a reader was looking at, and only behind a lid. The headline, the homepage hero
// card and the onboarding preview all published the bare percentage — so the
// thinnest scores presented as the most confident, which is exactly backwards and
// is the first thing a hostile reader unmasks.
//
// The same shape one level down. A row's evidence strength counts ITEMS, so six
// recorded votes on one bill read as six. The dossier knew they were one document;
// the finding's open face did not say so.
//
// What this file keeps true:
//
//   1. DEPTH TRAVELS WITH THE FIGURE. Every surface that publishes the engine's
//      percentage prints the tested count beside it, in one vocabulary, from the
//      same read — so the caption cannot drift from the number it captions.
//   2. NO GATE. Not on thinness, not on perfection, not on a threshold. The
//      surfaces that would most like to omit the denominator are exactly the ones
//      that must not.
//   3. SCOPE FOLLOWS THE FIGURE. The current-term slice captions its own tested
//      count, never the all-time one.
//   4. SINGLE-MEASURE FINDINGS SAY SO IN THE OPEN. On the issue-index face, on the
//      stance-tree leaf, and on the Official Record row — not only inside the
//      dossier.
//   5. AND NEVER FALSELY. Multi-instrument rows carry no marker; two documents the
//      file could not name do not collapse into one; held items are not evidence.
//   6. THE MARKER IS DEPTH, NOT A DIFFERENT OUTCOME. Verdict, colour, word and
//      percentage are untouched by it.
//   7. PUBLIC LANE STAYS OUT of the tested count and out of the marker, exactly as
//      it stays out of the percentage.
//
// Score arithmetic is pinned separately and harder, in
// scripts/test-depth-no-score-drift.mjs, which boots the pre-pass tree beside this
// one and compares every published read.
//
//   node scripts/test-score-depth.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
// Source assertions look at CODE, not at the comments explaining the code. A
// retirement note or a rationale paragraph naming the thing it forbids must not
// read as the thing itself.
const CODE = (f) => R(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "consistency.js", "voting-record.js", "word-action.js", "stance-tree.js",
  "profile-card.js", "hero-showcase.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
function boot() {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  for (const [f, src] of SRC) {
    try { vm.runInContext(src, ctx, { filename: f }); }
    catch (e) { console.error(`  ! ${f}: ${e.message}`); }
  }
  return win;
}

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const lacks = (h, n, m) => ok(!String(h).includes(n), `${m} — found ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);

const win = boot();
const WA = win.PDXWordAction;
const CS = win.PDXConsistency;
const TREE = win.PDXStanceTree;
const PIDS = Object.keys(win.CMP_DATA || {});
ok(PIDS.length > 100, "the roster booted");

// Everyone the engine actually publishes a figure for, in this tree.
const PUBLISHED = [];
for (const pid of PIDS) {
  let r = null;
  try { r = WA.read(pid, win.CMP_DATA[pid]); } catch (e) { continue; }
  if (r && r.publishable && typeof r.pct === "number") PUBLISHED.push({ pid, r });
}
ok(PUBLISHED.length > 0, "at least one profile publishes a percentage");
console.log(`      (profiles publishing a Direction Match figure: ${PUBLISHED.length})`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the caption, its vocabulary, and its integer");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(typeof WA.depthCaption, "function", "PDXWordAction publishes depthCaption()");
  eq(typeof WA.testedOf, "function", "…and testedOf()");

  eq(WA.depthCaption(1), "1 issue tested", "singular is its own sentence");
  eq(WA.depthCaption(3), "3 issues tested", "…and the plural is the plural");
  eq(WA.depthCaption(32), "32 issues tested", "the integer is printed, not bucketed");

  // A caption is a promise that a number follows. Nothing rather than a lie when
  // there is no number to promise.
  eq(WA.depthCaption(0), "", "zero prints nothing at all");
  eq(WA.depthCaption(null), "", "…so does null");
  eq(WA.depthCaption(undefined), "", "…and undefined");
  eq(WA.depthCaption(NaN), "", "…and NaN");
  eq(WA.depthCaption(-4), "", "…and a negative count, which is not a count");

  // THE INTEGER IS THE ENGINE'S OWN. Not a recount, not a length, not a ratio: the
  // same coverage.tested read() divided by. A caption computing its own denominator
  // is a caption that can disagree with the figure it captions.
  for (const { pid, r } of PUBLISHED) {
    eq(WA.testedOf(r), r.coverage.tested, `${pid}: testedOf() is coverage.tested verbatim`);
  }
  has(CODE("word-action.js"), "r.coverage && r.coverage.tested",
    "testedOf() reads the coverage field rather than recounting anything");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · every profile that publishes a % publishes its depth");
// ═════════════════════════════════════════════════════════════════════════════
{
  let thinPerfect = null, deepest = null;
  for (const { pid, r } of PUBLISHED) {
    const html = WA.headlineHtml(pid, win.CMP_DATA[pid]);
    has(html, `${r.pct}%`, `${pid}: the headline prints the percentage`);
    has(html, `data-pdxwa-tested="${r.coverage.tested}"`,
      `${pid}: …and pins the same read's tested count beside it`);
    has(html, WA.depthCaption(r.coverage.tested),
      `${pid}: …in the shared vocabulary, not a local paraphrase`);

    // The caption must be INSIDE the number block, not somewhere in the prose
    // below it. A denominator a reader has to go looking for is not beside the
    // figure in any sense they benefit from.
    const num = html.match(/<div class="pdxwa-num[\s\S]*?<div class="pdxwa-say"/);
    ok(!!num && num[0].includes("pdxwa-num-n"),
      `${pid}: the caption sits in the same chrome as the numeral`);

    if (r.pct >= 90 && r.coverage.tested <= 6) thinPerfect = { pid, r, html };
    if (!deepest || r.coverage.tested > deepest.r.coverage.tested) deepest = { pid, r, html };
  }

  // NO GATE, demonstrated on the two ends of the range rather than asserted.
  ok(!!thinPerfect, "the roster still contains a ≥90% score on ≤6 tested issues to check");
  if (thinPerfect) {
    has(thinPerfect.html, `data-pdxwa-tested="${thinPerfect.r.coverage.tested}"`,
      `the thin-perfect profile (${thinPerfect.pid}, ${thinPerfect.r.pct}% on ` +
      `${thinPerfect.r.coverage.tested}) shows its depth — this is the case the pass exists for`);
    // …and it is not suppressed, rounded or floored away either.
    has(thinPerfect.html, `${thinPerfect.r.pct}%`,
      "…with the low-depth score still printed, not hidden to look stronger");
  }
  if (deepest) {
    has(deepest.html, `data-pdxwa-tested="${deepest.r.coverage.tested}"`,
      `the deepest profile (${deepest.pid}, ${deepest.r.coverage.tested} tested) shows it too`);
  }

  // THE GATE CANNOT BE ADDED BACK QUIETLY. depthTag is built from `hasPct` alone.
  const src = CODE("word-action.js");
  const i = src.indexOf("var depthTag = hasPct");
  ok(i >= 0, "the depth tag is conditioned on there being a percentage, and on nothing else");
  const tag = src.slice(i, i + 320);
  lacks(tag, "MIN_", "…not on a floor");
  lacks(tag, "isThin", "…not on thinness");
  ok(!/>=\s*\d|<=\s*\d/.test(tag), "…and not on a threshold of any kind");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · scope follows the figure");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The current-term slice is a different read of the same word. Its caption is
  // its own tested count; borrowing the all-time one would print a denominator for
  // a numerator that never used it.
  let sliced = 0;
  for (const { pid } of PUBLISHED) {
    const sr = WA.scopedRead(pid, win.CMP_DATA[pid]);
    if (!sr || !sr.applicable || !sr.current) continue;
    sliced++;
    const html = WA.headlineHtml(pid, win.CMP_DATA[pid]);
    has(html, `data-pdxwa-slice-tested="${sr.current.coverage.tested}"`,
      `${pid}: the slice pins its OWN tested count`);
    has(html, `data-pdxwa-tested="${sr.main.coverage.tested}"`,
      `${pid}: …and the headline keeps the all-time one`);
  }
  console.log(`      (current-term slices rendered in this tree: ${sliced})`);
  // The wiring is checkable even where the data does not exercise it.
  has(CODE("word-action.js"), "c.coverage.tested + ' of ' + c.coverage.scorable",
    "the slice's own denominator comes off the slice's own coverage");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · every other publisher of the same % carries the same depth");
// ═════════════════════════════════════════════════════════════════════════════
{
  // ── the fail-closed owner ────────────────────────────────────────────────
  // _pdxLedgerSlot is where `pct` is decided for every card that is not the
  // profile. If depth is optional there, it is optional everywhere downstream.
  const slot = CODE("compare-hub.js");
  const s0 = slot.indexOf("window._pdxLedgerSlot = function");
  ok(s0 >= 0, "_pdxLedgerSlot is present");
  const body = slot.slice(s0, slot.indexOf("window._pdxOfficeLine"));
  const returns = body.match(/return \{[\s\S]*?\};/g) || [];
  ok(returns.length >= 5, "…with every branch accounted for");
  for (const ret of returns) {
    ok(/tested:/.test(ret),
      "no branch of the ledger slot returns a shape without a tested field: " +
      ret.replace(/\s+/g, " ").slice(0, 72));
    // The invariant that matters: a number never arrives without its depth.
    ok(!/pct: null/.test(ret) || /tested: 0/.test(ret),
      "…and a null percentage carries a zero depth rather than a stale one");
  }

  // ── the homepage hero card ───────────────────────────────────────────────
  // It publishes the live figure to readers who have opened nothing, which makes
  // a bare "100%" there the least checkable claim on the site.
  const pc = win.PDXProfileCard;
  let heroChecked = 0;
  for (const { pid, r } of PUBLISHED) {
    let b = null;
    try { b = pc && pc.brief(pid); } catch (e) { b = null; }
    if (!b || typeof b.pct !== "number") continue;
    // signalHtml is module-private; assert on the data contract it reads plus the
    // source shape, which together are what make the card unable to omit depth.
    eq(b.coverage.tested, r.coverage.tested,
      `${pid}: brief() carries the same tested count the profile prints`);
    eq(b.testedSay, WA.depthCaption(r.coverage.tested),
      `${pid}: …and the caption the card prints is the profile's own words`);
    ok(b.testedSay !== "", `${pid}: …non-empty wherever there is a figure to qualify`);
    heroChecked++;
  }
  ok(heroChecked > 0, "at least one hero-card brief was checked");
  const hs = CODE("hero-showcase.js");
  has(hs, "pdx-hs-sig-pct-n", "the hero signal has a slot for the depth caption");
  // The card renderer is held to one integrity language and may not reach the
  // engine itself (pinned in scripts/test-hero-showcase.mjs), so the wording comes
  // through brief() — the same route the metric name already takes.
  has(hs, "d.testedSay", "…filled from brief(), not from a second read");
  lacks(hs, "PDXWordAction", "…without the renderer reaching the engine directly");
  has(CODE("profile-card.js"), "wa.depthCaption(r.coverage.tested)",
    "brief() phrases the caption once, off the read that produced the figure");
  // Same gate as the headline: a percentage, and nothing else.
  const dI = hs.indexOf("var depth = (pct === null");
  ok(dI >= 0, "…gated on there being a percentage");
  ok(!/>=\s*\d/.test(hs.slice(dI, dI + 260)), "…and on no threshold");
  const bI = CODE("profile-card.js").indexOf("testedSay:");
  ok(bI >= 0 && !/>=\s*\d/.test(CODE("profile-card.js").slice(bI, bI + 220)),
    "…and brief() applies no threshold of its own");

  // ── the Home Team onboarding preview ─────────────────────────────────────
  has(CODE("ballot-breakdown.js"), "tested: (typeof s.tested === 'number') ? s.tested : 0",
    "_liveDirectionMatch carries the slot's tested count through");
  has(CODE("ballot-breakdown.js"), "scoreTested: slot.tested || 0",
    "…and _homePreview hands it to the card");
  const idx = CODE("index.html");
  has(idx, "wa.depthCaption(r.scoreTested)",
    "renderRep prints it in the shared vocabulary");
  has(idx, 'data-pdx-tested="', "…and pins the integer for this test to read");
  const rI = idx.indexOf("var scN = (hasScore");
  ok(rI >= 0 && /hasScore/.test(idx.slice(rI, rI + 200)),
    "…whenever the card has a score, and on no other condition");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the single-measure definition counts documents, not items");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(!!(CS.instruments && typeof CS.instruments.spread === "function"),
    "PDXConsistency.instruments.spread is published");
  ok(typeof CS.instruments.row === "function", "…along with the row-shaped door");

  // Synthetic overlays, on issue keys nothing else uses, so each case is exactly
  // the shape it claims to be. The six-votes-one-bill case is the whole point and
  // cannot be built from committed data: it needs the live roll-call lane.
  const fa = (h) => ({ headline: h, verdict: "contradicts", date: "2025-01-01",
                       facts: "x", why: "", sourceUrl: "", sourceLabel: "" });
  const mk = (items) => ({ officialActions: { items, total: items.length },
                           record: null, execPool: null, execHeld: null });
  const spread = (key, ov) => CS.instruments.spread("__depthtest", key, ov);

  let s = spread("__six_one_bill", mk([fa("H.R. 1"), fa("H.R. 1"), fa("H.R. 1"),
                                       fa("H.R. 1"), fa("H.R. 1"), fa("H.R. 1")]));
  eq(s.judged, 6, "six judged items are six judged items");
  eq(s.docs, 1, "…on one document");
  eq(s.single, true, "…so the finding rests on a single measure");
  eq(s.ident, "H.R. 1", "…and it is named, so a reader can check the claim");

  s = spread("__two_bills", mk([fa("H.R. 1"), fa("H.R. 1"), fa("S. 200")]));
  eq(s.docs, 2, "two distinct measures count as two");
  eq(s.single, false, "…and a multi-instrument row is never tagged single");
  eq(s.ident, "", "…and names nothing, because there is no one thing to name");

  s = spread("__case_only", mk([fa("h.r. 1"), fa("H.R. 1")]));
  eq(s.docs, 1, "the same measure filed under two casings is still one measure");

  // FAILS CLOSED IN THE DIRECTION THAT MATTERS. Two instruments the file cannot
  // name are two instruments. Folding them together would invent a single-measure
  // finding, which is the one error this marker must never make.
  s = spread("__anon_two", mk([fa(""), fa("")]));
  eq(s.docs, 2, "two unnameable instruments do not collapse into one");
  eq(s.single, false, "…and produce no marker at all");

  // HELD IS NOT JUDGED. A document set aside for circularity neither supports the
  // finding nor thickens it.
  const ex = (id) => ({ documentId: id, title: id, actionClass: "executive_order",
                        standing: "in_force", date: "2025-01-01", issues: [{ issueKey: "x" }],
                        sourceUrl: "", sourceLabel: "" });
  const hd = (id) => ({ documentId: id, title: id, actionClass: "executive_order",
                        reason: "circular", date: "2025-01-01" });
  const ovx = (items, held) => ({ execPool: { items, held }, record: null, officialActions: null });

  s = spread("__exec_held", ovx([ex("EO 14257")], [hd("EO 99999"), hd("EO 88888")]));
  eq(s.judged, 1, "held documents are outside the judged evidence set");
  eq(s.docs, 1, "…so they do not thicken a single-measure finding");
  eq(s.single, true, "…which stays single");

  s = spread("__all_held", ovx([], [hd("EO 7")]));
  eq(s.judged, 0, "a row with nothing judged has judged zero");
  eq(s.single, false, "…and claims nothing");

  // A throw anywhere returns the empty spread rather than a wrong one.
  s = spread("__garbage", { officialActions: { items: null }, record: null });
  eq(s.single, false, "a malformed overlay produces no marker");

  // NOTHING SCORING READS IT. The accessor is display-only; if read() or a floor
  // learned about it, the marker would have become a score input.
  const wa = CODE("word-action.js");
  const rd = wa.indexOf("function read(");
  const rdEnd = wa.indexOf("function scopedRead(");
  ok(rd >= 0 && rdEnd > rd, "read() is present");
  lacks(wa.slice(rd, rdEnd), "instruments", "read() does not know the accessor exists");
  lacks(wa.slice(rd, rdEnd), "singleMeasure", "…nor the marker");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the marker, on the surfaces a reader sees without expanding anything");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Every tested formal row in the roster, sorted into the two cases.
  const single = [], multi = [];
  for (const pid of PIDS) {
    let rows = [];
    try { rows = CS.issueRows(pid) || []; } catch (e) { continue; }
    for (const r of rows) {
      let res = null;
      try { res = CS.rowResult(r); } catch (e) { continue; }
      if (!res || res.state !== "tested" || res.metric !== "Direction match") continue;
      if (r.verdict && r.verdict.basis === "public_record") continue;
      const sp = CS.instruments.row(r);
      (sp.single ? single : multi).push({ pid, r, sp, res });
    }
  }
  ok(single.length > 0, `the roster holds tested single-measure rows (${single.length})`);
  ok(multi.length > 0, `…and multi-instrument ones to check against (${multi.length})`);

  // MARQUEE ROWS ARE REQUIRED, not incidental. A presidential contradicts resting
  // on one document is the exact row a hostile reader opens first.
  const marquee = single.filter(
    (x) => x.r.verdict.token === "contradicts" || x.r.verdict.token === "mixed");
  ok(marquee.length > 0,
    `single-measure contradicts/mixed rows exist and must be marked (${marquee.length})`);
  ok(single.some((x) => x.pid === "trump" && x.r.verdict.token === "contradicts"),
    "…including a presidential single-document contradicts");

  // ── the issue-index face ─────────────────────────────────────────────────
  const headlines = {};
  const headline = (pid) => (headlines[pid] =
    headlines[pid] || WA.headlineHtml(pid, win.CMP_DATA[pid]));
  const rowOf = (html, key) => {
    const m = html.match(new RegExp(
      '<li class="pdxwa-oc-li"[^>]*data-pdxwa-issue="' + key + '"[\\s\\S]*?</li>'));
    return m ? m[0] : "";
  };

  let facesChecked = 0, marked = 0;
  for (const { pid, r, res } of single) {
    const li = rowOf(headline(pid), r.key);
    if (!li) continue;
    facesChecked++;
    has(li, "Single measure", `${pid}/${r.key}: the face says single measure in the open`);
    has(li, 'data-pdxwa-docs="1"', `${pid}/${r.key}: …and pins the document count`);
    // THE MARKER IS DEPTH, NOT A DIFFERENT OUTCOME.
    has(li, `${res.pct}%`, `${pid}/${r.key}: …with the per-issue figure unchanged`);
    const o = WA.outcomeFor(r.verdict.token);
    if (o) has(li, o.short, `${pid}/${r.key}: …and the verdict word unsoftened`);
    marked++;
  }
  ok(facesChecked > 0, "index faces were rendered and checked");
  eq(marked, facesChecked, "every single-measure row on a rendered face is marked");

  for (const { pid, r } of multi) {
    const li = rowOf(headline(pid), r.key);
    if (!li) continue;
    lacks(li, "Single measure",
      `${pid}/${r.key} rests on ${CS.instruments.row(r).docs} documents and is not tagged`);
  }

  // "Single measure" STANDS IN FOR "Thin evidence" and never merely adds to it —
  // one fact, said once. Nothing loses a chip: a marked row always has one.
  for (const { pid, r } of single) {
    const li = rowOf(headline(pid), r.key);
    if (!li) continue;
    lacks(li, "Thin evidence",
      `${pid}/${r.key}: the two chips do not both print the same fact`);
  }

  // ── the stance-tree leaf ─────────────────────────────────────────────────
  let leavesChecked = 0;
  for (const pid of ["trump", "bennie_thompson", "mike_johnson", "hawley"]) {
    let lfs = [];
    try { lfs = TREE.leaves(pid) || []; } catch (e) { continue; }
    for (const lf of lfs) {
      const rc = lf.record;
      if (!rc || (rc.state !== "scored" && rc.state !== "direction")) continue;
      const html = TREE.leafHtml(lf, "t");
      if (rc.single) {
        has(html, "1 measure", `${pid}/${lf.key}: the leaf names the document count`);
        has(html, 'data-pdxtree-docs="1"', `${pid}/${lf.key}: …and pins it`);
        if (rc.pct !== null) has(html, `${rc.pct}%`, `${pid}/${lf.key}: …score untouched`);
        leavesChecked++;
      } else {
        lacks(html, "pdxtree-one",
          `${pid}/${lf.key} spans ${rc.docs} documents and carries no marker`);
      }
    }
  }
  ok(leavesChecked > 0, `single-measure tree leaves were rendered and checked (${leavesChecked})`);

  // ── the dossier's assembled answer and the Official Record face ──────────
  // Both gate on judged ≥ 2, because at one judged item those surfaces already say
  // so exactly ("1 judged action on this issue. It is listed below." / the
  // composition meter's own `single` level). The gap they close is the row that
  // reads deep by item count and is not.
  const cj = CODE("consistency.js");
  has(cj, "_one.single && _one.judged > 1",
    "L1 says 'all of them are the same measure' off the shared accessor");
  has(cj, "lane += ' All of them are the same measure'",
    "…in the same sentence as the judged count it qualifies");
  has(cj, "(spread.single && spread.judged > 1) ? ' · all one measure' : ''",
    "the L2 closed face says it too");
  has(cj, "function _orOneMeasureChip",
    "the Official Record row face has a single-measure chip");
  has(cj, "_orOneMeasureChip(pid, s.key, s.ov)", "…and it is mounted on the row");
  const oc = cj.indexOf("function _orOneMeasureChip");
  const ocb = cj.slice(oc, oc + 700);
  has(ocb, "_insSpread", "…reading the one shared definition");
  has(ocb, "sp.judged < 2", "…and only where the item count overstates the spread");

  // The L1 sentence is not claimed on a row it is false of.
  const l1multi = CS.dossierSummaryHtml("trump", "tariffs_prices");
  lacks(l1multi, "the same measure", "an 8-document row makes no single-measure claim");
  has(l1multi, "8 judged actions", "…and still states its judged count");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the public lane is in neither the count nor the marker");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The percentage excludes it, so its denominator must too.
  for (const { pid, r } of PUBLISHED) {
    ok(r.coverage.tested <= r.coverage.scorable,
      `${pid}: the tested count cannot exceed the formal scorable pool`);
  }

  // A row the public record decided is never marked, whatever its formal file holds.
  const wa = CODE("word-action.js");
  const i = wa.indexOf("function singleMeasure(");
  ok(i >= 0, "singleMeasure() is present");
  const body = wa.slice(i, i + 800);
  has(body, "r.verdict.basis === 'public_record'", "…and refuses public-lane rows outright");
  has(body, "res.metric !== 'Direction match'", "…and rows outside the formal metric");
  has(body, "res.state !== 'tested'", "…and untested rows");

  let pubRows = 0;
  for (const pid of PIDS) {
    let rows = [];
    try { rows = CS.issueRows(pid) || []; } catch (e) { continue; }
    for (const r of rows) {
      if (!r.verdict || r.verdict.basis !== "public_record") continue;
      pubRows++;
      const li = WA.headlineHtml(pid, win.CMP_DATA[pid]).match(new RegExp(
        '<li class="pdxwa-oc-li"[^>]*data-pdxwa-issue="' + r.key + '"[\\s\\S]*?</li>'));
      if (li) lacks(li[0], "Single measure",
        `${pid}/${r.key} was decided by the public record and carries no formal marker`);
    }
  }
  console.log(`      (public-record rows swept: ${pubRows})`);

  // No party framing arrived with any of it.
  for (const f of ["word-action.js", "stance-tree.js", "hero-showcase.js"]) {
    const src = CODE(f);
    const bad = /\bparty\b/.test(src) && /depthCaption|singleMeasure|oneHtml|pdxwa-num-n/.test(src);
    ok(!bad || !/party[\s\S]{0,120}(depthCaption|singleMeasure|pdxwa-num-n)/.test(src),
      `${f}: nothing in the depth or marker path reads party`);
  }
}

console.log("");
if (failures.length) {
  console.error(`✗ score depth: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ score depth: every published % states its depth, and single-measure findings say so — ${passed} assertions passed\n`);
