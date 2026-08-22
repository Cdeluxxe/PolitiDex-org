#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-one-browse-path.mjs — one browse surface, one deep dive
// ─────────────────────────────────────────────────────────────────────────────
// A profile used to carry TWO full issue browsers. 🌳 All Issues by Topic sat
// under the score as the gateway; 🧭 Stances & Connections sat below it as a peer
// section, publishing the same person×issue set — what they said, what the record
// did, usually a percentage, and a door into the same dossier — ranked
// sharpest-first instead of grouped by topic. On a dense profile that second
// browser ran past a hundred and fifty thousand characters. A reader met the same
// thirty-seven rows twice, in two arrangements, with no way to tell which one was
// the answer.
//
// This pass demotes it. The rule the harness pins is one sentence: ONE BROWSE
// SURFACE (the tree), ONE DEEP DIVE (the issue dossier). Everything the demoted
// section could do that the tree could not has a new home, and this file is where
// each of those homes is checked:
//
//   1. THE SECTION IS NOT MOUNTED — and the tree is what stands in its place.
//      Its renderer is still defined and exported (the same disposition Stance at
//      a Glance and Connecting the Dots have), because the tree's leaves, the
//      dossier and a dozen harnesses read the same row model through it.
//   2. NO READER IS STRANDED. #pdxsec-stances still resolves: the tree answers to
//      it, so every rail pill, deep link and shared hash lands on the surface that
//      holds those positions.
//   3. THE TENSION RANKING SURVIVES AS A VIEW OF THE TREE. One control, two
//      states — Order: Topic | Tension — reordering the same leaves with the same
//      comparator. Not a second section, not a second sort key, not a re-score.
//   4. THE ONE UNIQUE EXIT MOVED. "🔍 Everyone on this issue" lived on a stance
//      row and nowhere else; it is a step in the dossier's "Where to next" row
//      now, and it fails closed in both directions that matter.
//   5. THE RAIL NAMES THE TREE for browse-all-issues, and no copy still tells a
//      reader that issues are browsed in the demoted section.
//   6. NOTHING WAS RE-SCORED. A leaf says exactly the same thing in either order,
//      byte for byte, and the order chrome publishes no figure of its own.
//
// Subjects: `trump` (37 leaves, dense formal record) and `khanna` (11 leaves,
// pre-warm — every record slot cold, which is the fail-closed case).
//
//   node scripts/test-one-browse-path.mjs
//
// No database, no network, no DOM beyond gen-hero-showcase.mjs's shared stub.

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
  "issue-colors.js",
  "stance-tree.js",
  "profile-spine.js",
];

const win = makeSandbox();
const sandbox = vm.createContext(win);
win.PROFILES = win.CMP_DATA;
for (const f of FILES) vm.runInContext(R(f), sandbox, { filename: f });
win.PROFILES = win.CMP_DATA;

const CS = win.PDXConsistency;
const T = win.PDXStanceTree;
const SP = win.PDXProfileSpine;

const PRES = "trump";
const THIN = "khanna";

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (hay, needle, msg) =>
  ok(String(hay).includes(needle), `${msg} — ${JSON.stringify(needle)} missing`);
const lacks = (hay, needle, msg) =>
  ok(!String(hay).includes(needle), `${msg} — ${JSON.stringify(needle)} present`);
const section = (t) => console.log(`  · ${t}`);
const must = (cond, what) => {
  if (cond) return;
  console.error(`\nSTALE HARNESS: ${what}`);
  process.exit(2);
};

must(CS && typeof CS.stancesSectionHtml === "function", "PDXConsistency.stancesSectionHtml is gone");
must(T && typeof T.html === "function", "PDXStanceTree.html is gone");
must(T.count(PRES) > T.FLAT.maxLeaves, `${PRES} no longer has enough leaves to render a tree`);
must(T.count(THIN) > T.FLAT.maxLeaves, `${THIN} no longer has enough leaves to render a tree`);

// The profile body, comments stripped — a mount is a call, and a call inside a
// comment is not one. Every source assertion below reads this, never the raw file.
const BODY = (() => {
  const src = R("profiles-full.js")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  const at = src.indexOf("const _profileBody = ");
  must(at !== -1, "the profile body template moved");
  return src.slice(at);
})();

// ── 1 · THE SECTION IS NOT MOUNTED ──────────────────────────────────────────
section("1 · the demoted section, and what stands in its place");
{
  eq((BODY.match(/PDXConsistency\.stancesSectionHtml\(/g) || []).length, 0,
    "🧭 Stances & Connections is mounted on the profile again — that is a second full\n" +
    "    issue browser over the same rows the tree already lists");
  eq((BODY.match(/PDXStanceTree\.sectionHtml\(/g) || []).length, 1,
    "the topic tree — the one browse surface — is not mounted exactly once");
  // Demoted, not deleted. The row model behind those rows is what the tree's
  // leaves and the dossier are built from, and a dozen harnesses read a row's
  // full face through this renderer.
  ok(typeof CS.stancesSectionHtml === "function" && CS.stancesSectionHtml(PRES).length > 0,
    "the renderer was deleted rather than unmounted — the archive, and every harness that\n" +
    "    reads a row's full face through it, goes with it");
  // No fallback mount either: nothing may re-open it as a lid, a drawer or a
  // deferred fold. A closed drawer holding a duplicate browser is still a
  // duplicate browser.
  lacks(BODY, "stancesSectionHtml",
    "the profile body still names stancesSectionHtml somewhere — the section is back in the\n" +
    "    first-read path, however it is folded");
}

// ── 2 · NO READER IS STRANDED ───────────────────────────────────────────────
section("2 · every old way in still lands on the tree");
{
  const st = T.sectionHtml(PRES);
  has(st, 'id="pdxsec-stancetree"', "the tree stopped emitting its own anchor");
  has(st, 'id="pdxsec-glance"', "the tree dropped the legacy #pdxsec-glance alias");
  has(st, 'id="pdxsec-stances"',
    "the tree does not answer to #pdxsec-stances — the demoted section owned that anchor,\n" +
    "    so every jump and deep link naming it now lands nowhere");
  // …and the spine's registry agrees, so the rail demotes none of the three.
  // The tree used to be registered into the verdict stage, riding under the score
  // it was the browse surface for. It has its own stage now — the gateway — and it
  // reads AHEAD of the score rather than under it, because browsing the record is
  // not a footnote to being told a number about it.
  eq(SP.targetStage("pdxsec-stancetree"), "explore", "the tree is not registered in the gateway stage");
  const keys = SP.STAGE_KEYS;
  ok(keys.indexOf("explore") < keys.indexOf("verdict"),
    "the gateway stage no longer precedes the score — the one browse path is back under the number");
  eq(SP.targetStage("pdxsec-stances"), SP.targetStage("pdxsec-stancetree"),
    "#pdxsec-stances resolves to a different stage than the surface that now emits it");
  eq(SP.targetStage("pdxsec-glance"), SP.targetStage("pdxsec-stancetree"),
    "#pdxsec-glance resolves to a different stage than the surface that now emits it");
  // One anchor, one element: an alias that renders twice is an ambiguous target.
  eq((st.match(/id="pdxsec-stances"/g) || []).length, 1,
    "the tree emits #pdxsec-stances more than once");
}

// ── 3 · THE TENSION RANKING IS A VIEW OF THE TREE ───────────────────────────
section("3 · Order: Topic | Tension — one control, no second section");
{
  eq(T.SORTS.length, 2, "the order control is not exactly two states");
  eq(T.SORT_DEFAULT, "topic", "the default order is not Topic");
  eq(T.sortOf("nonsense").key, "topic",
    "an unrecognised order is not normalised to Topic — an attribute a reader never set\n" +
    "    must never be able to render an arrangement nobody asked for");
  // ONE COMPARATOR. The flat tension list and the branch panels are the same
  // order or the tree contradicts itself about what comes first.
  ok(typeof T.order === "function",
    "the tension comparator is not exported — the flat list and the branch panels must be\n" +
    "    assertable as ONE order rather than two that happen to agree today");
  const all = T.leaves(PRES);
  const ordered = T.order(all).map((lf) => lf.key);
  eq(ordered.join("|"), all.map((lf) => lf.key).join("|"),
    "leaves() and order() disagree about tension order — two rankings on one surface");

  for (const pid of [PRES, THIN]) {
    const topic = T.html(pid, { uid: "t" });
    const tension = T.html(pid, { uid: "t", sort: "tension" });
    has(topic, 'data-pdxtree-sort="topic"', `${pid}: the tree does not record its order`);
    has(tension, 'data-pdxtree-sort="tension"', `${pid}: the tension view does not record its order`);
    has(topic, 'data-pdxtree-mode="tree"', `${pid}: topic order is not the topic tree`);
    has(tension, 'data-pdxtree-mode="flat"',
      `${pid}: tension order still renders branches — a ranking across topics inside topic\n` +
      "    accordions is a ranking a reader cannot see");
    // The control is drawn in both, exactly once per state, one of them pressed.
    for (const [name, h] of [["topic", topic], ["tension", tension]]) {
      const bar = (h.match(/<div class="pdxtree-sort"[\s\S]*?<\/div>/) || [""])[0];
      ok(bar.length > 0, `${pid}/${name}: the order control is not drawn`);
      eq((bar.match(/data-pdxtree-sort="/g) || []).length, 2,
        `${pid}/${name}: the order control is not exactly two chips`);
      eq((bar.match(/aria-pressed="true"/g) || []).length, 1,
        `${pid}/${name}: the order control does not mark exactly one state as pressed`);
    }
    // SAME ROWS. Not a filter, not a cap, not a sample.
    const keysOf = (h) => [...String(h).matchAll(/data-pdxtree-dos="([^"]*)"/g)].map((m) => m[1]);
    const kt = keysOf(topic), kx = keysOf(tension);
    eq(kx.length, kt.length, `${pid}: the two orders show a different number of issues`);
    eq(kx.slice().sort().join("|"), kt.slice().sort().join("|"),
      `${pid}: the two orders show a different SET of issues — an order that hides a row is a filter`);
    // …in the shared ranking, sharpest first.
    const want = T.order(T.leaves(pid)).map((lf) => lf.key);
    eq(kx.join("|"), want.join("|"),
      `${pid}: the tension list is not in the tree's own comparator order`);
    // The one line the arrangement owes a reader, and only in the view it describes.
    has(tension, "pdxtree-ordernote", `${pid}: tension order does not say what "sharpest" means`);
    lacks(topic, "pdxtree-ordernote", `${pid}: topic order carries the tension explainer anyway`);
  }
  // FAIL CLOSED. Nothing to arrange, no control: a view already rendering as one
  // flat list is already in tension order, and an empty view gets the empty note.
  const small = Object.keys(win.CMP_DATA).find((id) => {
    const n = T.count(id); return n > 0 && n <= T.FLAT.maxLeaves;
  });
  must(small, "no profile in the fixture renders under the flat threshold any more");
  lacks(T.html(small, { uid: "s" }), '<div class="pdxtree-sort"',
    `${small}: a profile already rendering as one flat list is offered an order control that\n` +
    "    cannot change anything");
  const emptied = T.html(THIN, { uid: "e", sort: "tension", filter: "cuts" });
  has(emptied, "pdxtree-empty", "a filter with no rows under tension order does not say so");
  lacks(emptied, "pdxtree-schip",
    "an empty view still offers an order control — there is nothing to arrange");
  eq(T.html("no_such_person_at_all", { uid: "z" }), "",
    "a profile with no leaves renders something rather than nothing");
}

// ── 4 · THE ONE UNIQUE EXIT MOVED ───────────────────────────────────────────
section("4 · 🔍 Everyone on this issue — re-homed, and failing closed");
{
  const KEY = "restraint";
  const rows = CS.issueRows(PRES) || [];
  must(rows.some((r) => r.key === KEY), `${PRES} no longer holds a row for ${KEY}`);
  const IC = win.PDXIssueColors;
  must(IC && typeof IC.isCore === "function", "PDXIssueColors.isCore is gone");
  must(IC.isCore(KEY), `${KEY} is no longer a Core National Issue — pick another fixture`);

  // FAIL CLOSED (1): no Issue View module, no link. A door into a module that
  // never loaded is worse than three exits instead of four.
  const before = win.PDXIssueView;
  win.PDXIssueView = undefined;
  lacks(CS.nextStepHtml(PRES, KEY), "Everyone on this issue",
    "the dossier offers the Issue View when the module that answers it is not on the page");

  // With the overlay loaded, the exit is there — once, as the same [data-pdxst-go]
  // route the stance rows used, so there is one handler and not a second one.
  win.PDXIssueView = { open() {} };
  const next = CS.nextStepHtml(PRES, KEY);
  has(next, "Everyone on this issue",
    "the dossier does not offer 🔍 Everyone on this issue — it lived on a stance row and\n" +
    "    nowhere else, so demoting that section strands it");
  eq((next.match(/Everyone on this issue/g) || []).length, 1,
    "the dossier offers the Issue View more than once");
  has(next, 'data-pdxst-go="issue"',
    "the re-homed exit does not use the existing issue route — that is a second navigation\n" +
    "    path into the same overlay");
  has(next, `data-pdxst-key="${KEY}"`, "the re-homed exit does not carry the issue it would open");
  // …and it is in the assembled sheet, not only in the fragment builder.
  has(CS.gapViewHtml(PRES, KEY, {}), "Everyone on this issue",
    "the assembled dossier does not carry the re-homed exit");

  // FAIL CLOSED (2): a key the Issue View cannot rank gets no link into an empty
  // ranking. Every non-core key on this profile is checked, not just one.
  const nonCore = rows.map((r) => r.key).filter((k) => !IC.isCore(k));
  if (nonCore.length) {
    const leaked = nonCore.filter((k) => String(CS.nextStepHtml(PRES, k)).includes("Everyone on this issue"));
    eq(leaked.length, 0,
      `the dossier offers the Issue View for ${leaked.length} key(s) it cannot rank — ` +
      `e.g. ${leaked[0]}`);
  }
  win.PDXIssueView = before;

  // The OTHER line the demoted rows carried — "where this lands in the score" —
  // was already level 1 of the dossier, and is still stated there exactly once.
  const l1 = CS.dossierSummaryHtml(PRES, KEY);
  has(l1, "pdxdos-score", "dossier level 1 lost the where-this-lands-in-the-score line");
  has(l1, "pooled", "dossier level 1 no longer says the profile's figure is the pooled one");
  eq((l1.match(/pdxdos-score/g) || []).length, 1, "dossier level 1 states the score line twice");
}

// ── 5 · THE RAIL AND THE COPY NAME THE TREE ─────────────────────────────────
section("5 · pointers name the browse surface that exists");
{
  const PC = R("profile-connect.js");
  const step1 = (PC.match(/\{ key: 'glance',[\s\S]*?\},/) || [""])[0];
  must(step1.length > 0, "the rail's first step is no longer keyed 'glance'");
  has(step1, "target: 'pdxsec-stancetree'",
    "the rail's positions step does not aim at the tree — the gateway is the tree, so the\n" +
    "    chain's 'they said' step has to land on it");
  lacks(step1, "pdxsec-stances",
    "the rail's positions step aims at the demoted section's anchor rather than the tree");
  ok(!/'pdxsec-stances'/.test(PC),
    "profile-connect.js still routes something at #pdxsec-stances by name");
  // No user-facing copy may still send a reader to the demoted section to browse.
  // Comments are the archive and are allowed to name it; rendered strings are not.
  const rendered = (src) => src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  for (const f of ["profiles-full.js", "profile-connect.js", "stance-tree.js", "word-action.js"]) {
    lacks(rendered(R(f)), "Stances &amp; Connections",
      `${f} still prints "Stances & Connections" to a reader — that section is not on the page`);
  }
  // The tree's own heading is the browse-all promise, unchanged by this pass.
  has(T.sectionHtml(PRES), "All Issues by Topic", "the tree stopped naming itself the all-issues surface");
}

// ── 6 · NOTHING WAS RE-SCORED ───────────────────────────────────────────────
section("6 · an arrangement, not a second scoreboard");
{
  for (const pid of [PRES, THIN]) {
    const topic = T.html(pid, { uid: "t" });
    const tension = T.html(pid, { uid: "t", sort: "tension" });
    // Every leaf, byte for byte, in both orders. Same ids, same slots, same
    // percentages, same door — only the sequence differs.
    const leavesOf = (h) => {
      const out = {};
      for (const chunk of String(h).split('<div class="pdxtree-leaf').slice(1)) {
        const k = (chunk.match(/data-pdxtree-dos="([^"]*)"/) || [])[1];
        if (k) out[k] = chunk.slice(0, chunk.indexOf("</div>"));
      }
      return out;
    };
    const a = leavesOf(topic), b = leavesOf(tension);
    const keys = Object.keys(a);
    must(keys.length > 0, `${pid}: the leaf scan found no leaves — the markup moved`);
    const drift = keys.filter((k) => a[k] !== b[k]);
    eq(drift.length, 0,
      `${pid}: ${drift.length} leaf/leaves say something different in tension order ` +
      `(e.g. ${drift[0]}) — an order must not be able to change a row`);
    // The order chrome itself publishes no figure.
    const bar = (tension.match(/<div class="pdxtree-sort"[\s\S]*?<\/div>/) || [""])[0];
    ok(!/\d+%/.test(bar), `${pid}: the order control prints a percentage`);
    ok(!/\d/.test(bar.replace(/data-pdxtree-sort="[^"]*"/g, "")),
      `${pid}: the order control prints a count — a chip is a view, not a tally`);
    ok(!/\d+%/.test(T.SORT_NOTE), "the tension explainer prints a percentage");
  }
  // And the pooled figure is untouched: the tree reads the shared counts object
  // and the demotion added no arithmetic of its own.
  const c = T.counts(PRES);
  must(c, `${PRES} has no shared counts object`);
  eq(T.counts(PRES).tested, CS.profileCounts(PRES).tested,
    "the tree's tested count drifted from the shared counts object");
}

// ── REPORT ──────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.log(`✗ one browse path: ${failures.length} failure(s) (${passed} passed)\n`);
  failures.forEach((f) => console.log("  ✗ " + f));
  console.log("");
  process.exit(1);
}
console.log(`✓ one browse path: all ${passed} assertions passed — one tree to browse, one dossier to read`);
console.log(`  ${PRES}: ${T.count(PRES)} leaves · ${THIN}: ${T.count(THIN)} leaves (pre-warm)`);
