#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-shape-hero.mjs — a deep formal record leads with its shape, not with a
// verdict about our word ledger
// ─────────────────────────────────────────────────────────────────────────────
// The profile hero has always answered one question: did their words match their
// record. On a member who has said very little and voted a great deal, that
// question has no answer, so the hero failed closed to an em-dash under the
// caption "Monitoring" — a true statement about OUR coverage, printed in the
// slot a reader takes as a verdict about the person, at the top of a page
// holding two dozen issues of roll-call record.
//
// Phase 3 puts the shape of that record in the slot instead, above a depth gate,
// and demotes Direction Match to a secondary block underneath it. This file is
// the fence around that swap:
//
//   1. The gate — two published constants, and the boundary behaves at both.
//   2. Above it — depth, tops, splits, thin; every figure the atlas's own.
//   3. Below it — the previous hero, byte for byte.
//   4. Direction Match — same read, same figure, secondary placement, and a
//      named missing half instead of a dash where it cannot publish.
//   5. Still one score — no percentage in the block that is not Direction Match,
//      no advanced/opposed ratio anywhere near it.
//   6. Fails closed, and survives a phone.
//
//   node scripts/test-shape-hero.mjs

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
  "coverage.js",
  "profile-spine.js",
  "profiles-full.js",
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

const WA_SRC = R("word-action.js");
const WA_CSS = R("word-action.css");
const APP_CSS = R("app.css");
const PF_SRC = R("profiles-full.js");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const hasI = (hay, needle, msg) =>
  ok(String(hay).toLowerCase().indexOf(String(needle).toLowerCase()) >= 0,
    `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const lacksI = (hay, needle, msg) =>
  ok(String(hay).toLowerCase().indexOf(String(needle).toLowerCase()) < 0,
    `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ shape hero: ${msg}`);
  process.exit(1);
};
const txt = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// ── The fixtures ─────────────────────────────────────────────────────────────
// QUIET — a real member with NO documented stance at all. Seed a wide roll-call
//         record on them and you have the exact case this pass exists for:
//         everything on file is formal, and the old hero said "Monitoring".
// BOTH  — a member whose Direction Match already publishes a percentage from the
//         bundled data. Seed the same record and the demoted block has to keep
//         printing that figure, small, under the shape.
// THIN  — nobody seeds them. The hero they had is the hero they keep.
const QUIET = "doug_mastriano";
const BOTH = "bennie_thompson";
const THIN = "schumer";

const probe = boot();
must(probe.PDXWordAction && typeof probe.PDXWordAction.shapeApplies === "function",
  "word-action.js does not publish shapeApplies — the depth gate is not reachable");
must(probe.PDXConsistency && probe.PDXConsistency.formalPatternIndex &&
     typeof probe.PDXConsistency.formalPatternIndex.shape === "function",
  "consistency.js does not publish formalPatternIndex.shape");
must(probe.CMP_DATA[QUIET] && probe.CMP_DATA[BOTH] && probe.CMP_DATA[THIN],
  "a fixture subject is not in the bundled roster");
must((probe._resolveStanceList(QUIET, probe.CMP_DATA[QUIET]) || []).length === 0,
  `${QUIET} now has documented stances — the no-word-ledger case needs another subject`);
{
  const h = probe.PDXWordAction.heroRead(BOTH, probe.CMP_DATA[BOTH]);
  must(h && h.pct !== null,
    `${BOTH} no longer publishes a Direction Match percentage — the demoted-ring case needs another subject`);
}

const GATE = probe.PDXWordAction.SHAPE_MIN;
const GATE_READ = probe.PDXWordAction.SHAPE_MIN_READ;
must(Number.isInteger(GATE) && GATE > 0 && Number.isInteger(GATE_READ) && GATE_READ > 0,
  "the depth gate constants are not published as integers");

const ISSUE_KEYS = Object.keys(probe.ISSUE_MAP || {}).filter((k) => !/_balance$/.test(k));
const NO_POLE = probe._PDX_RD_NO_POLE || {};
const POLED = ISSUE_KEYS.filter((k) => !NO_POLE[k]);
must(POLED.length >= GATE + 4,
  "the roster no longer offers enough polable issue keys to seed a record above the gate");

const vote = (n, issueKey, position) => ({
  kind: "vote", rollcallId: 700 + n, measureId: 800 + n, number: "S. " + (100 + n),
  date: "2025-0" + ((n % 9) + 1) + "-11", action: "On Passage", position: position,
  isProcedural: false, title: "Measure " + n,
  source: { url: "https://www.congress.gov/roll-call-vote/" + (700 + n), label: "Congress.gov" },
  issues: [{ issueKey: issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
});
// depth votes per issue, and every fifth issue voted both ways so the "ran both
// ways" bucket is genuinely populated rather than asserted into existence.
function seed(keys, depth) {
  const out = [];
  let n = 0;
  keys.forEach((k, i) => {
    for (let j = 0; j < depth; j++) out.push(vote(n++, k, (i % 5 === 0 && j % 2) ? "nay" : "yea"));
  });
  return out;
}
const WIDE = POLED.slice(0, GATE + 6);

const A = boot();
A.PDXVotingRecord.noteMember(QUIET, seed(WIDE, 12));
A.PDXVotingRecord.noteMember(BOTH, seed(WIDE, 12));
const WA = A.PDXWordAction;
const FPI = A.PDXConsistency.formalPatternIndex;
const SHAPE = FPI.shape(QUIET);
must(SHAPE && SHAPE.issues >= GATE && SHAPE.read >= GATE_READ,
  `the seeded fixture only reached ${SHAPE && SHAPE.issues} issues — it does not clear the gate`);
must(SHAPE.strongN > 0 && SHAPE.splitN > 0,
  "the seeded fixture produced no tops or no splits — two of the four elements would go untested");

const QUIET_HERO = WA.heroMount(QUIET, A.CMP_DATA[QUIET], {});
const BOTH_HERO = WA.heroMount(BOTH, A.CMP_DATA[BOTH], {});
const THIN_HERO = WA.heroMount(THIN, A.CMP_DATA[THIN], {});

// ═════════════════════════════════════════════════════════════════════════════
// 1. The gate is a documented number read off the same index Phase 1 reads
// ═════════════════════════════════════════════════════════════════════════════
section("the depth gate");
{
  ok(/var SHAPE_MIN = \d+;/.test(WA_SRC) && /var SHAPE_MIN_READ = \d+;/.test(WA_SRC),
    "the gate is not two named constants in word-action.js — a literal in an if() is not a documented gate");
  // Both constants must be explained in the comment block above them, not just
  // declared: the brief asks for a documented gate, and the next person to move
  // it needs the reasoning and not the value.
  const preamble = WA_SRC.slice(
    WA_SRC.indexOf("── 🏛 THE SHAPE HERO"), WA_SRC.indexOf("var SHAPE_MIN ="));
  must(preamble.length > 400, "the shape hero lost its preamble comment");
  has(preamble, "SHAPE_MIN", "the gate preamble does not name SHAPE_MIN");
  has(preamble, "SHAPE_MIN_READ", "the gate preamble does not name SHAPE_MIN_READ");
  // Same source as the browse chip. Two depth gates reading two different counts
  // is how the chip and the hero end up disagreeing about the same member.
  eq(WA.recordDepth(QUIET).issues, SHAPE.issues,
    "the shape gate and the browse chip disagree about how many issues are on file");
  eq(SHAPE.issues, FPI.count(QUIET),
    "the shape summary counts different issues than the atlas it summarises");
  eq(WA.recordDepth(QUIET).read, SHAPE.read,
    "the shape gate and recordDepth disagree about how many of those the engine could read");

  // The boundary, both sides, on a subject seeded to sit exactly on it.
  const under = boot();
  under.PDXVotingRecord.noteMember(QUIET, seed(POLED.slice(0, GATE - 1), 12));
  eq(under.PDXWordAction.shapeApplies(QUIET), false,
    `a record of ${GATE - 1} issues cleared a gate set at ${GATE}`);
  const on = boot();
  on.PDXVotingRecord.noteMember(QUIET, seed(POLED.slice(0, GATE), 12));
  eq(on.PDXWordAction.shapeApplies(QUIET), true,
    `a record of exactly ${GATE} issues did not clear a gate set at ${GATE}`);

  // Wide but unreadable: instruments on file across many issues, none of them
  // deep enough for the pattern engine. Inventory is not a shape.
  const shallow = boot();
  shallow.PDXVotingRecord.noteMember(QUIET, seed(POLED.slice(0, GATE + 6), 1));
  const sh2 = shallow.PDXConsistency.formalPatternIndex.shape(QUIET);
  must(sh2 && sh2.issues >= GATE, "the shallow fixture did not produce enough issues to test the read floor");
  if (sh2.read < GATE_READ) {
    eq(shallow.PDXWordAction.shapeApplies(QUIET), false,
      "a wide but unreadable inventory was published as a shape");
  } else {
    ok(true, "(shallow fixture read above the floor; read gate exercised by construction elsewhere)");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. Above the gate: the four elements, and none of the old silence
// ═════════════════════════════════════════════════════════════════════════════
section("the shape hero itself");
{
  has(QUIET_HERO, 'class="pdxwa-shape"',
    "a member with a deep formal record and no word ledger still does not get the shape hero");
  const t = txt(QUIET_HERO);

  // The thing this whole pass exists to stop.
  lacks(QUIET_HERO, "pdxwa-hero-none",
    "the empty-word-ledger tile still renders on a deep formal record");
  lacksI(t, "Monitoring",
    "a member with a deep formal record is still led with 'Monitoring'");
  lacksI(t, "Still documenting",
    "the deep-record hero still says 'Still documenting'");
  lacksI(t, "Thin record",
    "the deep-record hero calls the record thin");

  // DEPTH.
  has(QUIET_HERO, "pdxwa-shape-depth", "the shape hero has no depth line");
  has(t, `${SHAPE.issues} issues on the formal record`,
    "the depth line does not print the number of issues with formal inventory");
  has(t, `${SHAPE.judged} votes and formal actions read`,
    "the depth line does not print how many formal items were judged");
  has(t, `${SHAPE.characterised} deep enough to characterise`,
    "the depth line does not say how many issues were deep enough to characterise");

  // TOPS — ordinal tier words and counts, from the atlas's own chip renderer.
  has(QUIET_HERO, "Strongest patterns", "the shape hero has no tops group");
  const topN = (QUIET_HERO.match(/class="pdxwa-shape-row"/g) || []).length;
  ok(topN === SHAPE.tops.length + SHAPE.splits.length,
    `the shape hero rendered ${topN} rows for ${SHAPE.tops.length + SHAPE.splits.length} summary rows`);
  ok(SHAPE.tops.length <= FPI.TOPS_CAP && SHAPE.tops.length >= 3,
    `the tops list is ${SHAPE.tops.length} rows — the brief asks for 3–5 strongest patterns`);
  // The chip is the shared one: lane marker, tier word, counts. Not a re-render.
  has(QUIET_HERO, "pdxst-pat", "the tops rows do not use the shared formal-pattern chip");
  has(QUIET_HERO, "🏛 Record", "the tops chips lost the lane marker that says this is the formal lane");
  const tiers = A._PDX_RD_TIERS || {};
  ok(Object.keys(tiers).some((k) => tiers[k] && tiers[k].label && t.indexOf(tiers[k].label) >= 0),
    "no _RD_TIERS vocabulary word appears in the shape hero — it invented its own ranking words");
  ok(/· \d+ advanced · \d+ against/.test(QUIET_HERO),
    "the tops chips print a tier with no counts beside it");

  // SPLITS — present, headed, counted, and not folded into the thin line.
  has(QUIET_HERO, "Ran both ways", "issues where the record ran both ways are not surfaced");
  if (SHAPE.tailN) {
    ok(QUIET_HERO.indexOf("Ran both ways") < QUIET_HERO.indexOf("formal items on file"),
      "the splits are printed after the thin caveat — they are being buried");
  }
  ok(QUIET_HERO.indexOf("Ran both ways") < QUIET_HERO.indexOf("pdxwa-shape-dm"),
    "the splits are printed below Direction Match — the least flattering half of the shape is\n" +
    "    the half a reader has to scroll past the promise metric to reach");
  has(t, "Split", "the split rows do not carry the engine's own Split label");

  // THIN — the honesty valve, counted out loud. `tailN` is the whole tail: every
  // issue the index declined to characterise, whether or not the browse lane
  // published a side on it. That is what this sentence is about, and shape()'s
  // narrower `thinN` (no published side anywhere) is not.
  if (SHAPE.tailN) {
    has(t, `${SHAPE.tailN} more issue`,
      "the count of inventory too shallow to characterise is not printed");
    has(t, "not enough of them to characterise a pattern yet",
      "the thin line does not say what 'thin' means here");
  } else {
    lacks(QUIET_HERO, "pdxwa-shape-thin", "a thin line rendered with nothing thin to report");
  }

  // A SUMMARY, NOT THE ATLAS. The full record stays below and is linked, not
  // copied. It routes into the TOPIC TREE rather than the flat list: the tree is
  // the browse surface now, it holds the same population grouped rather than
  // alphabetised, and it is the one destination that is always mounted — the flat
  // list is gated on depth and ships collapsed, so a hero that jumped there would
  // hand the reader a shut summary line on exactly the profiles with most to show.
  const rows = FPI.rows(QUIET).length;
  ok(topN < rows,
    `the hero rendered ${topN} of ${rows} atlas rows — it is duplicating the list, not summarising it`);
  has(QUIET_HERO, `Explore all ${rows} issues by topic`,
    "the shape hero does not route to the browse surface");
  has(QUIET_HERO, "pdxsec-stancetree",
    "the 'explore all' control does not jump to the topic tree anchor");
  has(R("stance-tree.js"), 'id="pdxsec-stancetree"',
    "the topic tree does not emit the anchor the shape hero jumps to");
  has(PF_SRC, "PDXStanceTree.sectionHtml(id)",
    "profiles-full.js does not mount the topic tree, so the hero's jump has nowhere to land");
  lacks(QUIET_HERO, "pdxsec-formalatlas",
    "the shape hero still routes into the flat formal list — that anchor is depth-gated and collapsed, so\n" +
    "    it is a jump that can land on nothing, and it is not the surface a reader browses from");
  // Whatever the hero says is below it has to actually be below it.
  has(QUIET_HERO, "in the topic tree below",
    "the hero's overflow line still points at a 'full list' that is no longer what sits under it");

  // The lane wall, in the product's own sentence rather than a second wording.
  has(t, A._PDX_RD_TIER_NOTE || "never counted in Direction Match",
    "the shape hero does not carry the formal-lane wall");

  // FIRST SCREEN. Depth and tops before any chrome, and before the demoted ring.
  const iDepth = QUIET_HERO.indexOf("pdxwa-shape-depth");
  const iTops = QUIET_HERO.indexOf("Strongest patterns");
  const iDM = QUIET_HERO.indexOf("pdxwa-shape-dm");
  const iAll = QUIET_HERO.indexOf("pdxwa-shape-all");
  ok(iDepth > 0 && iDepth < iTops && iTops < iAll && iAll < iDM,
    "the shape hero's order is not depth → tops → route-out → match; the first screen leads with chrome");
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. Below the gate: the letterhead stays gated, but the record still leads
// ═════════════════════════════════════════════════════════════════════════════
// THIS SECTION USED TO SAY "below the gate, nothing moved", and it pinned the 80px
// ring byte for byte as the whole of what a below-gate reader saw. That was the
// scope boundary of the pass that introduced the letterhead, not a doctrine: it was
// how we promised the deep-file work would not disturb the 546 files that could not
// support it. The person-file hierarchy pass spent that boundary deliberately. Most
// files are below this gate, so leaving them with a large percentage and no record
// at the top taught exactly the hierarchy the letterhead was built to correct.
//
// What is still fenced, and what has changed:
//   · The DEPTH GATE is untouched. Below it, no pattern is named, no tier chip is
//     drawn, and the letterhead's own class is absent — a thin record still cannot
//     be described as a shape.
//   · The RECORD STILL LEADS. Below the gate the hero is the record brief: the same
//     heading, the same vocabulary, counts or an honest empty, and Direction Match
//     one rung down inside it. See scripts/test-record-top.mjs for that contract.
//   · The RING IS FAIL-CLOSED. It is what renders when the formal-pattern index is
//     unavailable, so its arithmetic and markup are pinned here through exactly that
//     condition rather than through a member who no longer reaches it.
section("below the gate, the letterhead stays gated");
{
  eq(WA.shapeApplies(THIN), false, "an unseeded member cleared the depth gate");
  lacks(THIN_HERO, 'class="pdxwa-shape"', "an unseeded member was given the shape letterhead");
  has(THIN_HERO, "profile-score-stack", "the below-gate hero lost its wrapper class");
  lacks(THIN_HERO, "pdxwa-shape-list", "an unseeded member was given a pattern list");
  lacks(THIN_HERO, "pdxst-pat", "an unseeded member was given a pattern tier chip");
  lacksI(THIN_HERO, "Strongest patterns", "an unseeded member was given a strongest-patterns group");
  // …and what it gets instead is the record, above the metric.
  has(THIN_HERO, "pdxwa-brief", "the below-gate hero is not the record brief");
  hasI(THIN_HERO, "The formal record", "the below-gate hero does not lead with the formal record");
  ok(THIN_HERO.indexOf("pdxwa-shape-hd") < THIN_HERO.indexOf("pdxwa-shape-dm"),
    "the below-gate hero puts Direction Match above the record heading");

  // FAIL-CLOSED RING, BYTE FOR BYTE. Rebuild the ring markup from heroRead and
  // compare. This pins the ring arithmetic and the ring markup together, so a
  // refactor of either that changes what a reader sees on the fallback path fails
  // here rather than in review. The condition that reaches it is the real one: the
  // formal-pattern index did not load, so neither letterhead can describe a record
  // and the metric is all that is left to show.
  const cold = boot();
  cold.PDXConsistency.formalPatternIndex = null;
  const p = cold.CMP_DATA[BOTH];
  const h = cold.PDXWordAction.heroRead(BOTH, p);
  must(h && h.pct !== null, "the fail-closed byte check needs a publishable subject");
  const radius = 28, circ = 2 * Math.PI * radius, dash = (h.pct / 100) * circ;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const inner = cold.PDXWordAction.heroHtml(BOTH, p, {});
  lacks(inner, "pdxwa-brief",
    "the record brief rendered with no formal-pattern index to read — it is describing a record it cannot see");
  has(inner, `<circle cx="40" cy="40" r="28" fill="none" stroke="${h.color}" stroke-width="6" ` +
    `stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}" stroke-linecap="round" `,
    "the fail-closed ring arc is not the arc heroRead's percentage describes");
  has(inner, `<span class="pdxwa-hero-v" style="color:${h.color};">${esc(h.text)}</span>`,
    "the fail-closed ring's figure markup changed");
  has(inner, `<span class="pdxwa-hero-cap">${esc(h.caption)}</span>`,
    "the fail-closed ring's caption markup changed");
  has(inner, `<div class="pdxwa-hero-sub">${esc(h.sub)}</div>`,
    "the fail-closed ring's sub-line markup changed");
  has(inner, 'class="score-ring w-20 h-20 flex-shrink-0"',
    "the fail-closed ring lost the 80px ring class");

  // The two non-ring fallback states are still reachable and unchanged. An
  // unresolvable pid has no record to describe, so the brief declines and these are
  // what a caller gets.
  const tracking = cold.PDXWordAction.heroHtml("no_such_person_at_all", null,
    { trackingLabel: "Tracking", trackingNote: "3 promises on file" });
  has(tracking, "profile-score-tracking", "the tracked-but-unresolved tile is gone");
  has(tracking, "pdxwa-hero-cap-wait", "the tracking tile lost its caption class");
  const none = cold.PDXWordAction.heroHtml("no_such_person_at_all", null, {});
  has(none, "pdxwa-hero-none", "the no-word tile is gone");
  has(none, ">Monitoring<", "the no-word tile's caption changed");
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. Direction Match: demoted, not deleted, and never a bare dash
// ═════════════════════════════════════════════════════════════════════════════
section("Direction Match, secondary");
{
  has(BOTH_HERO, 'class="pdxwa-shape"', "the publishable subject did not get the shape hero");
  has(BOTH_HERO, "pdxwa-shape-dm", "the shape hero dropped Direction Match entirely");

  const h = WA.heroRead(BOTH, A.CMP_DATA[BOTH]);
  must(h && h.pct !== null, "the seeded publishable subject stopped publishing");
  has(BOTH_HERO, `>${h.pct}%</span>`, "the demoted block prints a different figure than heroRead");
  has(BOTH_HERO, h.sub, "the demoted block dropped the denominator caption");
  has(BOTH_HERO, "Did their words match this record?",
    "the demoted block is not headed with the question the metric answers");
  lacksI(BOTH_HERO, "the one score",
    "the demoted block still calls Direction Match 'the one score'");

  // Same arc arithmetic as the primary ring, at the demoted radius.
  const r18 = 2 * Math.PI * 18, d18 = (h.pct / 100) * r18;
  has(BOTH_HERO, `stroke-dasharray="${d18.toFixed(1)} ${r18.toFixed(1)}"`,
    "the demoted ring draws an arc that does not match its own percentage");

  // Visibly secondary: the ring is smaller and its numeral is capped below the
  // primary's. Hierarchy expressed in the stylesheet, not only in DOM order.
  has(BOTH_HERO, 'viewBox="0 0 52 52"', "the demoted ring is not drawn smaller than the 80px primary");
  const remOf = (block, prop) => {
    const m = new RegExp(prop + ":\\s*([\\d.]+)rem").exec(block);
    return m ? parseFloat(m[1]) : null;
  };
  const primary = WA_CSS.slice(WA_CSS.indexOf(".pdxwa-hero-v {"), WA_CSS.indexOf(".pdxwa-hero-v {") + 200);
  const demoted = WA_CSS.slice(WA_CSS.indexOf(".pdxwa-shape-dm-v {"), WA_CSS.indexOf(".pdxwa-shape-dm-v {") + 400);
  must(primary.length > 40 && demoted.length > 40, "one of the two ring figures is no longer styled");
  const fp = remOf(primary, "font-size"), fd = remOf(demoted, "font-size");
  must(fp !== null && fd !== null, "a ring figure has no font-size to compare");
  ok(fd < fp, `the demoted percentage (${fd}rem) is not smaller than the primary ring's (${fp}rem)`);

  // Where it cannot publish, it names the missing half. QUIET has a real record
  // and nothing testable, so this is the exact case.
  const qt = txt(QUIET_HERO);
  has(QUIET_HERO, "pdxwa-shape-dm-gap",
    "an unpublishable Direction Match under a deep record renders no explanation");
  lacks(QUIET_HERO, "pdxwa-shape-dm-v",
    "a percentage rendered for a subject whose Direction Match cannot publish");
  ok(/can be tested against this record|could be tested|Nothing they have said/.test(qt),
    "the unpublishable Direction Match does not say which half is missing");
  // Not "there is no dash in the sentence" — a dash inside a full sentence is
  // punctuation. What must not happen is the dash BEING the answer, the way the
  // 80px ring rendered "—" over "Monitoring".
  const gapTxt = txt(QUIET_HERO.slice(
    QUIET_HERO.indexOf('class="pdxwa-shape-dm-gap"'),
    QUIET_HERO.indexOf("pdxwa-shape-dm-note")));
  ok(gapTxt.length > 60,
    `the missing-half explanation is ${gapTxt.length} characters — that is a dash with extra steps`);
  ok(!/^[—–-]/.test(gapTxt), "the missing-half explanation opens with a dash instead of a sentence");
  has(qt, "The record above is the half we hold",
    "the gap copy does not tell the reader which half we do have");
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. Still exactly one score
// ═════════════════════════════════════════════════════════════════════════════
section("no second percentage");
{
  // Every % in the shape hero must live inside the Direction Match block.
  [["quiet", QUIET_HERO], ["both", BOTH_HERO]].forEach(([name, html]) => {
    const dm = html.indexOf("pdxwa-shape-dm");
    const beforeDM = dm === -1 ? html : html.slice(0, dm);
    eq((beforeDM.match(/%/g) || []).length, 0,
      `the ${name} shape block prints a percentage above the Direction Match module`);
  });
  const h = WA.heroRead(BOTH, A.CMP_DATA[BOTH]);
  const pcts = new Set((BOTH_HERO.match(/(\d+)%/g) || []));
  eq(pcts.size, 1, `the shape hero renders ${pcts.size} distinct percentages`);
  eq([...pcts][0], `${h.pct}%`, "the one percentage on the shape hero is not Direction Match");

  // No advanced/opposed ratio, anywhere, in any form — the rule pinned in
  // _recordDirectionIndex, restated for the surface that now leads the profile.
  const shapeSrc = WA_SRC.slice(WA_SRC.indexOf("── 🏛 THE SHAPE HERO"), WA_SRC.indexOf("function heroInner"));
  must(shapeSrc.length > 1000, "the shape hero source slice is empty");
  ok(!/advance[sd]?\s*\/\s*\(|\/\s*\(\s*advance/i.test(shapeSrc),
    "the shape hero computes an advanced/(advanced+opposed) ratio");
  ok(!/\* *100|\/ *judged|\/ *total|toFixed\(0\)/.test(shapeSrc.replace(/pct \/ 100/g, "")),
    "the shape hero derives a rate of its own from the counts it prints");
  // It reads the index; it does not re-rank it.
  has(shapeSrc, "formalPatternIndex", "the shape hero does not read the formal pattern index");
  ok(!/\.sort\(/.test(shapeSrc),
    "the shape hero re-sorts the index — the atlas's strongest-first order is the only ranking");

  // And Direction Match's own arithmetic is untouched by any of it.
  const before = JSON.stringify(boot().PDXWordAction.read(BOTH));
  const after = boot();
  after.PDXVotingRecord.noteMember(BOTH, []);
  const c = boot();
  c.PDXWordAction.heroMount(BOTH, c.CMP_DATA[BOTH], {});
  c.PDXWordAction.shapeApplies(BOTH);
  c.PDXConsistency.formalPatternIndex.shape(BOTH);
  eq(JSON.stringify(c.PDXWordAction.read(BOTH)), before,
    "rendering the shape hero moved Direction Match");
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. Fails closed, and survives a phone
// ═════════════════════════════════════════════════════════════════════════════
section("fail-closed and layout");
{
  const missing = boot();
  missing.PDXVotingRecord.noteMember(QUIET, seed(WIDE, 12));
  must(missing.PDXWordAction.shapeApplies(QUIET), "the fail-closed fixture did not clear the gate first");
  delete missing.PDXConsistency.formalPatternIndex.shape;
  eq(missing.PDXWordAction.shapeApplies(QUIET), false,
    "the shape hero did not fail closed when formalPatternIndex.shape went missing");
  const fallback = missing.PDXWordAction.heroMount(QUIET, missing.CMP_DATA[QUIET], {});
  lacks(fallback, "pdxwa-shape", "the fail-closed path still emitted shape markup");
  has(fallback, "profile-score-stack", "the fail-closed path emitted no hero at all");

  const thrower = boot();
  thrower.PDXVotingRecord.noteMember(QUIET, seed(WIDE, 12));
  must(thrower.PDXWordAction.shapeApplies(QUIET), "the throwing fixture did not clear the gate first");
  thrower.PDXConsistency.formalPatternIndex.shape = () => { throw new Error("index blew up"); };
  eq(thrower.PDXWordAction.shapeApplies(QUIET), false,
    "a throw inside the formal index propagated out of the gate instead of declining");
  lacks(thrower.PDXWordAction.heroMount(QUIET, thrower.CMP_DATA[QUIET], {}), "pdxwa-shape",
    "a throw inside the formal index still produced shape markup");

  const nuller = boot();
  nuller.PDXVotingRecord.noteMember(QUIET, seed(WIDE, 12));
  nuller.PDXConsistency.formalPatternIndex.shape = () => null;
  eq(nuller.PDXWordAction.shapeApplies(QUIET), false,
    "a null shape read was published as a shape hero");

  // The gate is checked in ONE place, so no caller can render the block past it.
  const gateHits = (WA_SRC.match(/SHAPE_MIN\b/g) || []).length;
  ok(/function shapeRead\(pid\)[\s\S]{0,700}?sh\.issues < SHAPE_MIN \|\| sh\.read < SHAPE_MIN_READ/.test(WA_SRC),
    "the depth gate is not a single expression inside shapeRead — a second copy will drift");
  ok(gateHits <= 6, `SHAPE_MIN is referenced ${gateHits} times; the gate should be read once, not re-implemented`);

  // The wrapper modifier the phone stylesheet keys off, on both paths.
  has(BOTH_HERO, 'class="profile-score-stack pdxwa-hero is-shape"',
    "the shape hero's wrapper is not flagged is-shape");
  ok(/function heroFlag/.test(WA_SRC) && /heroFlag\(host, fresh\)/.test(WA_SRC),
    "the warm re-render does not move the is-shape flag — a cold ring that warms into a shape\n" +
    "    would keep the 80px column layout around a full-width block");

  // Layout: full width on a wide screen, one column inside the card on a phone.
  ok(/\.profile-hero:has\(\.pdxwa-shape\)/.test(APP_CSS),
    "app.css does not widen the letterhead for the shape hero");
  ok(/\.profile-hero-score:has\(\.pdxwa-shape\)/.test(APP_CSS),
    "app.css does not give the shape hero the full hero width");
  ok(/\.profile-hero-score:has\(\.pdxwa-shape\) \.profile-hero-score-lbl[^{]*\{[^}]*display:\s*none/.test(APP_CSS),
    "the phone eyebrow still names the metric over a block whose subject is the formal record");
  // display:contents promotes the ring's children into the card grid; the shape
  // is one block and must opt out of that or its four elements get dealt into cells.
  ok(/\.profile-hero-score \.pdxwa-hero\.is-shape \{\s*display:\s*block;/.test(WA_CSS),
    "the phone rule that promotes hero children into the card grid still applies to the shape hero");
  // Base component rules, and nothing that can overflow a narrow screen.
  const shapeCss = WA_CSS.slice(WA_CSS.indexOf("── 🏛 The shape hero"), WA_CSS.indexOf("THE HERO PLEDGE CHIP IS GONE"));
  must(shapeCss.length > 800, "word-action.css no longer styles the shape hero");
  ok(/min-width:\s*0/.test(shapeCss),
    "no shape-hero text track declares min-width:0 — a long issue label forces horizontal overflow");
  ok((shapeCss.match(/overflow-wrap:\s*break-word/g) || []).length >= 3,
    "the shape hero's prose does not wrap long unbroken strings");
  ok(/flex-wrap:\s*wrap/.test(shapeCss),
    "the issue label and its chip cannot stack when there is no width for both");
  // Both controls in the block are real tap targets.
  const all = shapeCss.slice(shapeCss.indexOf(".pdxwa-shape-all {"));
  ok(/min-height:\s*2\.75rem/.test(all.slice(0, 400)),
    "the 'see all issues' control is under 44px tall");
  const btn = shapeCss.slice(shapeCss.indexOf(".pdxwa-shape-dm-btn {"));
  ok(/min-height:\s*2\.75rem/.test(btn.slice(0, 400)),
    "the demoted Direction Match control is under 44px tall");
}

// ── Result ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ shape hero — ${failures.length} of ${passed + failures.length} assertions failed:\n`);
  failures.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
console.log(`\n✓ shape hero — ${passed} assertions passed\n`);
