#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Unit tests for the PERSON-FILE SECTION OUTLINE — person-outline.js
// ─────────────────────────────────────────────────────────────────────────────
// The person file runs letterhead → brief → strongest patterns → the whole topic
// tree → Word vs Action → money → the public lane → the evidence locker, and the
// only thing that told a reader where they were in it was the gutter ticks on
// #modal-body. A scrollbar reports a fraction; it cannot name a section. So the
// sections got named: one control, two skins — a sticky column in the panel at
// 1024 and up, a wrapping chip row under the letterhead below that.
//
// Six properties carry that change, and every one of them fails quietly:
//
//   1. THE ORDER IS THE SPINE'S, RESTATED. The outline's rows are a subsequence
//      of profile-spine.js's STAGES, in STAGES order. If they were not, the
//      outline would be a second, disagreeing table of contents for the same
//      file, and the reader would have no way to tell which one was lying.
//
//   2. NO DEAD JUMPS. A row exists if and only if one of its destinations is in
//      the DOM, and the destination a row resolves to is one that is present.
//      Asserted over EVERY subset of the member destinations, not over the four
//      files that happen to be convenient — this is the whole promise of the
//      control and a spot check cannot make it.
//
//   3. THE MOUNT LIST EQUALS THE RENDERED STAGES. Maloy (formal record + tree),
//      Lee (deep), a thin Utah member, and Pohlman (a judge, rendered for real
//      through PDXJudgeFile._html). Rows are compared against what the shipping
//      renderers actually emitted, not against a fixture.
//
//   4. IT IS NOT A SECOND PRODUCT. The copy is section names. No score, no
//      percentage, no party, no Direction Match, and nothing on a judge that a
//      retention seat cannot answer — no Word vs Action row, no money row.
//
//   5. THE TOP OF THE FILE IS ONE ROW, AND IT IS NOT THE HUB. The letterhead and
//      the record brief are one screen on a member file — the brief renders
//      immediately under the photo — so they are one row, "Top of file", and it
//      resolves to the identity stage rather than to the pill rail or the share
//      controls that live inside it. It stays lit while either the letterhead or
//      the brief is the section on screen and releases the moment the topic tree
//      is. The brief keeps a row of its own in exactly one case: a file with a
//      brief and no letterhead, where the brief IS the top.
//
//   6. IT DOES NOT TAKE ANYTHING AWAY. The gutter scrollbar rules are untouched,
//      the phone skin never leaves the flow (position:fixed over #modal-footer
//      would sit on the Add-to-team button), and formal tiers and Direction Match
//      are byte-identical to HEAD.
//
//   node scripts/test-person-outline.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, real judge data.
// No database, no network, no browser.
// ─────────────────────────────────────────────────────────────────────────────

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
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const no = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present`);
const section = (t) => console.log(`\n   ── ${t}`);
// A probe that finds nothing must fail loudly, or a rename turns this whole file
// into a very fast, very green no-op.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ person outline: STALE PROBE — ${msg}`);
  process.exit(2);
};

// ── The four files this pass was designed against ────────────────────────────
// jefferson_burton is the thin Utah member: the shipping renderers emit neither
// a Word vs Action section nor a topic tree for him, which is exactly the file a
// jump list is most likely to invent rows for.
const MALOY = "maloy";
const LEE = "lee";
const THIN = "jefferson_burton";
const JUDGE = "jill_pohlman";

// ── Boot ─────────────────────────────────────────────────────────────────────
const MEMBER_FILES = [...ENGINE_FILES, "stance-tree.js", "controversies.js", "profile-spine.js"];
const JUDGE_FILES = ["judicial-data.js", "judicial-retention.js", "judge-file.js"];

function boot(get, files) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of files) {
    const src = get(f);
    if (src === null) continue;
    vm.runInContext(src, ctx, { filename: f });
  }
  win.PROFILES = win.CMP_DATA;
  return win;
}

const W = boot(R, MEMBER_FILES);
const J = boot(R, JUDGE_FILES);
must(W.CMP_DATA && Object.keys(W.CMP_DATA).length > 500, "the roster did not load");
must(W.PDXProfileSpine && Array.isArray(W.PDXProfileSpine.STAGES), "PDXProfileSpine.STAGES is gone");
must(W.PDXWordAction && typeof W.PDXWordAction.sectionHtml === "function", "PDXWordAction.sectionHtml is gone");
must(W.PDXStanceTree && typeof W.PDXStanceTree.sectionHtml === "function", "PDXStanceTree.sectionHtml is gone");
must(typeof W.PDXProfileSpine.briefHtml === "function", "PDXProfileSpine.briefHtml is gone");
must(J.PDXJudicial && J.PDXJudgeFile && typeof J.PDXJudgeFile._html === "function", "the judge renderer is gone");
for (const pid of [MALOY, LEE, THIN]) must(W.CMP_DATA[pid], `${pid} is not on the roster any more`);
must(J.PDXJudicial.judge(JUDGE), `${JUDGE} is not in the judicial data any more`);

// person-outline.js is a plain IIFE that touches the DOM only inside its
// functions, so it boots in the member sandbox and its pure resolver is callable
// straight away.
vm.runInContext(R("person-outline.js"), vm.createContext(W), { filename: "person-outline.js" });
const OL = W.PDXPersonOutline;
must(OL && typeof OL.items === "function" && typeof OL.specs === "function",
  "PDXPersonOutline.items/specs are not exposed — this whole file tests nothing");

const MEMBER_SPECS = OL.specs("member");
const JUDGE_SPECS = OL.specs("judge");
must(MEMBER_SPECS.length >= 6 && JUDGE_SPECS.length >= 6, "a spec list emptied out");

const OL_SRC = R("person-outline.js");
const OL_CSS = R("person-outline.css");

// ═══════════════════════════════════════════════════════════════════════════════
section("1 · the order is the spine's, restated — not a second table of contents");
// ═══════════════════════════════════════════════════════════════════════════════
{
  const stageOrder = W.PDXProfileSpine.STAGES.map((s) => s.key);
  must(stageOrder.length > 8, "STAGES shrank below the size this assertion assumes");

  // Every member row names a real stage, and the rows appear in STAGES order.
  const idx = MEMBER_SPECS.map((s) => stageOrder.indexOf(s.key));
  eq(idx.filter((i) => i < 0).length, 0,
    `a member outline row names a stage the spine does not have: ${MEMBER_SPECS.filter((s, i) => idx[i] < 0).map((s) => s.key).join(", ")}`);
  const sorted = idx.slice().sort((a, b) => a - b);
  eq(idx.join(","), sorted.join(","),
    "the member outline is not in STAGES order — the outline and the file would disagree about the reading order");

  // The spec list is a SUBSET. It may not add a stage, and it may not promote one
  // the spine keeps silent (identity's rail is silent; the outline names it
  // because a reader jumping back to the letterhead is jumping to a place, not
  // to a rail marker — but no row may exist outside STAGES at all).
  ok(new Set(MEMBER_SPECS.map((s) => s.key)).size === MEMBER_SPECS.length,
    "a member stage is listed twice");

  // The merged top row still names a stage — the identity stage, which is where
  // it goes. A label is free to differ from the spine's internal key; a KEY is
  // not, because the key is what proves the row sits in the file's own order.
  const top = MEMBER_SPECS[0];
  eq(top.key, "identity", "the top row no longer names the identity stage");
  eq(top.label, "Top of file", "the top row was renamed");
  no(MEMBER_SPECS.map((x) => x.label).join(" | "), "Letterhead",
    "\"Letterhead\" came back as a row of its own — it is the same screen as the brief");

  // And the file does not keep its own copy of the order to drift from.
  no(OL_SRC, "PDXProfileSpine.STAGES",
    "person-outline.js reads STAGES at runtime — it probes the DOM instead, on purpose, so a stage that did not mount has no row");
  has(OL_SRC, ".pdxsp-stage-identity",
    "the outline no longer probes the assembler's stage containers");
}

// ═══════════════════════════════════════════════════════════════════════════════
section("2 · no dead jumps — every destination is one the app actually emits");
// ═══════════════════════════════════════════════════════════════════════════════
{
  // A destination no renderer emits could never resolve, so it would be a row
  // that is silently always absent — or, worse, one that resolves the day
  // somebody reuses the id for something else. Each candidate has to be findable
  // in the shipped source.
  const SRC = ["profiles-full.js", "consistency.js", "word-action.js", "stance-tree.js",
    "controversies.js", "finance-lane.js", "profile-spine.js", "judge-file.js", "index.html"]
    .map((f) => R(f)).join("\n");
  // Two emission idioms in this codebase, and both count: an id written inline
  // into a template, and an id handed to a helper that writes the attribute.
  // The stage classes are a third — composed from the stage key — so what has to
  // exist for those is the prefix, once, and then the key.
  const SPINE = R("profile-spine.js");
  const stageKeys = W.PDXProfileSpine.STAGES.map((s) => s.key);
  has(SPINE, "'<div class=\"pdxsp-stage pdxsp-stage-' + st.key +",
    "the assembler no longer builds the stage class the outline probes for");
  for (const spec of [...MEMBER_SPECS, ...JUDGE_SPECS]) {
    for (const t of spec.targets) {
      if (t.charAt(0) === ".") {
        const key = t.replace(".pdxsp-stage-", "");
        ok(stageKeys.indexOf(key) >= 0,
          `${spec.key}: ${t} names a stage the assembler never emits — that row can only ever be a dead jump`);
        continue;
      }
      const id = t.slice(1);
      ok(SRC.indexOf(`id="${id}"`) >= 0 || SRC.indexOf(`'${id}'`) >= 0,
        `${spec.key}: nothing in the shipped source emits ${t} — that row can only ever be a dead jump`);
    }
  }

  // Now the resolver itself, over EVERY combination of what may or may not have
  // mounted. 2^7 for the member list: the promise is "a row exists iff one of its
  // destinations is present, and it resolves to a present one", and that is a
  // property of all subsets, not of four files.
  const all = [];
  for (const s of MEMBER_SPECS) for (const t of s.targets) all.push(t);
  const uniq = [...new Set(all)];
  must(uniq.length >= 6 && uniq.length <= 16, `the member candidate list is ${uniq.length} long — this sweep sizes itself off it`);
  const stageOrder = MEMBER_SPECS.map((s) => s.key);
  let subsets = 0;
  const bad = [];
  for (let mask = 0; mask < (1 << uniq.length); mask++) {
    const present = new Set(uniq.filter((_, i) => mask & (1 << i)));
    const rows = OL.items("member", (c) => present.has(c));
    subsets++;
    // (a) every row resolves to something present
    for (const r of rows) if (!present.has(r.target)) bad.push(`mask ${mask}: ${r.key} → absent ${r.target}`);
    // (b) a section with a present candidate has a row, and one without has none
    //     — unless it folds into a row that IS listed, in which case it has no
    //     line of its own and is watched under that row instead. Both halves are
    //     checked: a folded stage must lose its row AND keep its watch entry,
    //     because a fold that dropped the watch would leave the merged row dark
    //     while the folded stage was the thing on screen.
    for (const s of MEMBER_SPECS) {
      const reachable = s.targets.some((t) => present.has(t));
      const listed = rows.some((r) => r.key === s.key);
      const parent = s.foldsInto ? rows.find((r) => r.key === s.foldsInto) : null;
      const want = reachable && !parent;
      if (want !== listed) bad.push(`mask ${mask}: ${s.key} reachable=${reachable} listed=${listed} folded=${!!parent}`);
      if (reachable && parent) {
        const hit = s.targets.find((t) => present.has(t));
        if (parent.spy.indexOf(hit) < 0) {
          bad.push(`mask ${mask}: ${s.key} folded into ${s.foldsInto} but ${hit} is not watched`);
        }
      }
    }
    // (b2) never two rows for the top of the file
    if (rows.filter((r) => r.key === "identity" || r.key === "brief").length > 1) {
      bad.push(`mask ${mask}: the letterhead and the brief are two rows again`);
    }
    // (b3) every watch entry belongs to a row that exists, and points somewhere
    //      present — a watch on an absent element would pin the spy to a stage
    //      the reader can never be in.
    for (const w of OL.spyPlan(rows)) {
      if (!rows.some((r) => r.key === w.key)) bad.push(`mask ${mask}: watch ${w.target} has no row`);
      if (!present.has(w.target)) bad.push(`mask ${mask}: watch ${w.target} is not in the DOM`);
    }
    // (c) order never changes
    const order = rows.map((r) => stageOrder.indexOf(r.key));
    if (order.join(",") !== order.slice().sort((x, y) => x - y).join(",")) bad.push(`mask ${mask}: out of order`);
    // (d) the first present candidate wins, always — the fallbacks are ranked
    for (const r of rows) {
      const spec = MEMBER_SPECS.find((s) => s.key === r.key);
      eq(r.target, spec.targets.find((t) => present.has(t)), `mask ${mask}: ${r.key} did not take its first reachable destination`);
      break; // one per subset is enough to keep the failure list readable
    }
  }
  eq(subsets, 1 << uniq.length, "the subset sweep did not run over every combination");
  eq(bad.slice(0, 8).join(" | "), "", `${bad.length} subset(s) broke the no-dead-jumps rule`);
  console.log(`      ${subsets} destination combinations swept, every row reachable in all of them`);

  // An outline of one row is a label, not an outline, and mount() says so.
  ok(OL.MIN_ITEMS >= 2, "MIN_ITEMS dropped below two — a one-row outline is chrome with no function");
  has(OL_SRC, "if (list.length < MIN_ITEMS) return;", "mount() no longer refuses to build a one-row outline");
}

// ═══════════════════════════════════════════════════════════════════════════════
section("3 · the mount list equals the rendered stages");
// ═══════════════════════════════════════════════════════════════════════════════
// Rendered, not assumed: the three member sections that can be produced outside a
// browser are produced, and the outline is asked what it would list given exactly
// what came back. The letterhead and the evidence locker are unconditional in the
// profile template, so they are present by construction; the standout strip, the
// finance lane and Flashpoints are gated inside openModal's own template and are
// left out of the probe — section 2 already proves, over every subset, that the
// outline lists them only when they are there.
{
  const emitted = (pid) => {
    const p = W.CMP_DATA[pid] || {};
    const set = new Set([".pdxsp-stage-identity", "#pdxsec-evidence"]);
    const add = (html, cand) => { if (html && String(html).indexOf(`id="${cand.slice(1)}"`) >= 0) set.add(cand); };
    let brief = "";
    try { brief = W.PDXProfileSpine.briefHtml(pid, p) || ""; } catch { brief = ""; }
    if (/class="pdxbr/.test(brief)) set.add(".pdxsp-stage-brief");
    try { add(W.PDXWordAction.sectionHtml(pid, p) || "", "#pdxsec-wordaction"); } catch { /* no read */ }
    try { add(W.PDXStanceTree.sectionHtml(pid) || "", "#pdxsec-stancetree"); } catch { /* no tree */ }
    return set;
  };

  for (const pid of [MALOY, LEE, THIN]) {
    const present = emitted(pid);
    const rows = OL.items("member", (c) => present.has(c));
    // Exactly the sections that rendered, and nothing else — with the top of the
    // file counted once, the way a reader meets it.
    const expected = [];
    for (const sp of MEMBER_SPECS) {
      if (!sp.targets.some((t) => present.has(t))) continue;
      if (sp.foldsInto && expected.some((e) => e.key === sp.foldsInto)) continue;
      expected.push({ key: sp.key, label: sp.label });
    }
    eq(rows.map((r) => r.label).join(" / "), expected.map((e) => e.label).join(" / "),
      `${pid}: the outline does not name exactly the sections that rendered`);
    for (const r of rows) ok(present.has(r.target), `${pid}: row "${r.label}" points at ${r.target}, which did not render`);
    console.log(`      ${pid}: ${rows.map((r) => r.label).join(" · ")}`);
  }

  // Maloy is the worked example: he has a formal record and a topic tree, which
  // is the pairing the outline exists for — Farmers & Rural Communities lives in
  // the tree under Economy and is named nowhere above it.
  const maloy = emitted(MALOY);
  ok(maloy.has(".pdxsp-stage-brief"), `${MALOY}: the brief did not render — section 3 is testing the wrong file`);
  ok(maloy.has("#pdxsec-stancetree"), `${MALOY}: the topic tree did not render — section 3 is testing the wrong file`);
  const maloyList = OL.items("member", (c) => maloy.has(c));
  const maloyRows = maloyList.map((r) => r.label);
  has(maloyRows.join("|"), "Top of file", `${MALOY}: no top-of-file row`);
  no(maloyRows.join("|"), "Formal record",
    `${MALOY}: the brief still gets a row of its own, and it lands a thumb-width from the letterhead row`);
  has(maloyRows.join("|"), "All issues by topic", `${MALOY}: no topic-tree row`);
  eq(maloyList[0].target, ".pdxsp-stage-identity",
    `${MALOY}: the first row does not go to the top of the file`);
  eq(maloyList[0].spy.join(" "), ".pdxsp-stage-identity .pdxsp-stage-brief",
    `${MALOY}: the top row does not watch both the letterhead and the brief`);

  // Lee is the deep file: strictly more rows than the thin one.
  const deep = OL.items("member", (c) => emitted(LEE).has(c)).length;
  const thin = OL.items("member", (c) => emitted(THIN).has(c)).length;
  ok(deep > thin, `a deep file (${deep} rows) does not get a longer outline than a thin one (${thin} rows)`);
  ok(thin >= OL.MIN_ITEMS, `${THIN}: the thin file falls below MIN_ITEMS, so this file gets no outline at all`);

  // Pohlman, rendered for real. The judge file's whole body is a pure function of
  // the judge record, so this is the actual DOM the outline would probe.
  const jf = J.PDXJudgeFile._html(J.PDXJudicial.judge(JUDGE));
  must(jf && jf.length > 1000, `${JUDGE}: the judge file rendered nothing`);
  const jpresent = new Set(JUDGE_SPECS.flatMap((s) => s.targets).filter((t) => jf.indexOf(`id="${t.slice(1)}"`) >= 0));
  const jrows = OL.items("judge", (c) => jpresent.has(c));
  eq(jrows.length, JUDGE_SPECS.length,
    `${JUDGE}: the outline lists ${jrows.length} of ${JUDGE_SPECS.length} judicial sections — every one of them is in the rendered file`);
  eq(jrows.map((r) => r.label).join(" / "),
    "Retention / JPEC / How filled / Formal record / Prior retention / About the court",
    `${JUDGE}: the judicial outline is not the judicial stages`);
  console.log(`      ${JUDGE}: ${jrows.map((r) => r.label).join(" · ")}`);

  // And when a judicial block stands down — publicLane() is data-gated, so most
  // courts get no court strip — the row goes with it.
  const noCourt = new Set([...jpresent].filter((t) => t !== "#pdxjf-court"));
  const shorter = OL.items("judge", (c) => noCourt.has(c)).map((r) => r.label);
  no(shorter.join("|"), "About the court", "a judge with no court strip still gets a row pointing at one");
}

// ═══════════════════════════════════════════════════════════════════════════════
section("4 · one jump to the top — the stage, not the hub, and one spy for both");
// ═══════════════════════════════════════════════════════════════════════════════
{
  const top = MEMBER_SPECS.find((x) => x.key === "identity");
  const brief = MEMBER_SPECS.find((x) => x.key === "brief");
  must(top && brief, "the top row or the brief spec is gone");

  // ── the merge ────────────────────────────────────────────────────────────
  // The destination is the identity STAGE: the first paint of the file, photo
  // and office, with the brief the next thing under it. Not an id inside it,
  // because every id inside it belongs to one part of that screen.
  eq(top.targets.join(" "), ".pdxsp-stage-identity",
    "the top row aims at something other than the identity stage container");
  eq(brief.foldsInto, "identity",
    "the brief no longer folds into the top row — a member file would show two rows for one screen");

  // With both mounted: one row, labelled for the top, watching both.
  const both = new Set([".pdxsp-stage-identity", ".pdxsp-stage-brief"]);
  const merged = OL.items("member", (c) => both.has(c));
  eq(merged.length, 1, "the letterhead and the brief still resolve to two rows");
  eq(merged[0].label, "Top of file", "the merged row is not named for the top of the file");
  eq(merged[0].target, ".pdxsp-stage-identity", "the merged row does not go to the letterhead");
  eq(merged[0].spy.join(" "), ".pdxsp-stage-identity .pdxsp-stage-brief",
    "the merged row does not watch the brief as well as the letterhead");

  // A brief with no letterhead keeps ONE row, named for what it is, on the brief.
  const briefOnly = OL.items("member", (c) => c === ".pdxsp-stage-brief");
  eq(briefOnly.length, 1, "a file with a brief and no letterhead lost its top row entirely");
  eq(briefOnly[0].label, "Formal record", "the brief-only fallback is not named for the formal record");
  eq(briefOnly[0].target, ".pdxsp-stage-brief", "the brief-only fallback does not land on the brief");
  // …and never on the tree, in any arrangement.
  no(brief.targets.join(" "), "pdxsec-stancetree", "the formal-record row can resolve to the topic tree");
  const letterOnly = OL.items("member", (c) => c === ".pdxsp-stage-identity");
  eq(letterOnly.map((r) => r.label).join(" "), "Top of file",
    "a letterhead with no brief does not produce the single top row");

  // ── it is not the hub ────────────────────────────────────────────────────
  // The pill rail sits INSIDE the identity stage, between the letterhead and the
  // banners, and it carries figures. It stays exactly where it is — the outline
  // just never points at it, and never hands it focus.
  const HUBSEL = ["#pdx-profile-nav", ".pdx-pnav", ".pdx-share-overlay", "pdxsec-match", "pdx-pnav-pill"];
  const everyTarget = [...MEMBER_SPECS, ...JUDGE_SPECS].flatMap((x) => x.targets);
  for (const h of HUBSEL) {
    ok(!everyTarget.some((t) => t.indexOf(h.replace(/^[#.]/, "")) >= 0),
      `an outline row resolves into the hub (${h}) — a jump to the top of the file would park a reader on a toolbar`);
  }
  has(OL_SRC, "#pdx-profile-nav,.pdx-pnav",
    "the outline no longer knows which nodes are hub chrome, so a heading inside the rail can take focus");
  has(OL_SRC, "function inHub(", "the hub exclusion is gone from person-outline.js");
  has(OL_SRC, "if (!inHub(hs[i])) return hs[i];",
    "headingOf() focuses the first heading it finds again, hub or not");
  // The reader lands on the name, which is what they see first — named by the
  // row rather than left to source order.
  eq(top.focus, ".profile-name", "the top row no longer names the heading it hands focus");
  has(R("profiles-full.js"), 'h2 class="profile-name"',
    "the letterhead no longer carries .profile-name, so the top row focuses nothing");
  has(OL_SRC, "headingOf(document.getElementById(id), item.focus)",
    "the jump stopped passing the row's preferred heading");

  // The topic tree is its own row, and it is the tree's own id.
  const tree = MEMBER_SPECS.find((x) => x.key === "explore");
  eq(tree.targets[0], "#pdxsec-stancetree", "the topic-tree row does not aim at the tree");

  // ── the spy ──────────────────────────────────────────────────────────────
  // One entry per watched element, in reading order, each tagged with the row it
  // lights. The decision is pure — "the last entry the reading line has passed" —
  // so it is driven here directly instead of through a browser.
  const maloyish = OL.items("member", (c) =>
    [".pdxsp-stage-identity", ".pdxsp-stage-brief", "#pdxsec-stancetree", "#pdxsec-evidence"].indexOf(c) >= 0);
  const plan = OL.spyPlan(maloyish);
  eq(plan.map((w) => w.key).join(" "), "identity identity explore receipts",
    "the watch list is not one entry per stage, tagged with the row it lights");
  const at = (n) => {
    const flags = [];
    for (let i = 0; i < plan.length; i++) flags[i] = i < n;
    return plan[OL.activeAt(flags, plan.length)].key;
  };
  eq(at(0), "identity", "before anything has scrolled past, the top row is not the active one");
  eq(at(1), "identity", "with the letterhead on screen the top row is not active");
  eq(at(2), "identity", "with the BRIEF on screen the top row went dark — it is one row for both");
  eq(at(3), "explore", "the top row stayed active once the topic tree was the heading on screen");
  eq(at(4), "receipts", "the spy does not follow the reader past the tree");
  // The watch order is the file's order: a folded stage is watched after its
  // parent, never before, or "the last one passed" would name the wrong row.
  const stageOrder = W.PDXProfileSpine.STAGES.map((x) => x.key);
  ok(stageOrder.indexOf("brief") > stageOrder.indexOf("identity"),
    "the spine no longer puts the brief under the letterhead, so this merge is describing a file that does not exist");
  ok(stageOrder.indexOf("explore") > stageOrder.indexOf("brief"),
    "the topic tree no longer comes after the brief, so releasing the top row at the tree is the wrong release point");
  has(OL_SRC, "spyPlan(state.items)", "arm() no longer builds its watch list from the resolved rows");
  has(OL_SRC, "activeAt(above, spy.length)", "the spy no longer uses the shared active-entry rule");

  // A judge file was not touched by the merge: no letterhead row was ever on it,
  // and its formal row is its own section, not a fold of anything.
  eq(JUDGE_SPECS.filter((x) => x.foldsInto).length, 0, "a judicial row started folding into another");
  eq(JUDGE_SPECS.map((x) => x.key).join(" "), "retention jpec seat formal history court",
    "the judicial rows changed — the merge was a member-file change only");
  const jHead = HEAD("person-outline.js");
  if (jHead) {
    const cut = (t) => {
      const i = t.indexOf("var JUDGE = ["), j = t.indexOf("];", i);
      return i < 0 ? "" : t.slice(i, j);
    };
    eq(cut(OL_SRC), cut(jHead), "the JUDGE spec list is not byte-identical to HEAD");
  }

  // The jump goes through the shared chrome-aware scroll, so a destination inside
  // a closed drawer is mounted and every lid above it opened before the scroll —
  // and the heading is focused, not just scrolled to.
  has(OL_SRC, "window._pdxNavJump(id, null)",
    "the outline no longer jumps through _pdxNavJump — a destination inside a deferred drawer would not mount");
  has(OL_SRC, "h.focus({ preventScroll: true })",
    "the jump no longer focuses the section heading");
  has(OL_SRC, "PDXProfileSpine.hasTarget",
    "the outline no longer asks the spine whether a deferred destination is reachable");
}

// ═══════════════════════════════════════════════════════════════════════════════
section("5 · not a second product — section names, and nothing else");
// ═══════════════════════════════════════════════════════════════════════════════
{
  const labels = [...MEMBER_SPECS, ...JUDGE_SPECS].map((s) => s.label);
  for (const l of labels) {
    ok(!/\d/.test(l), `outline copy carries a figure: "${l}"`);
    ok(!/%|percent|score|rating|grade/i.test(l), `outline copy carries a score: "${l}"`);
    ok(!/\b(Republican|Democrat|Democratic|GOP|party|partisan)\b/i.test(l), `outline copy names a party: "${l}"`);
    ok(!/direction match/i.test(l), `outline copy promotes Direction Match: "${l}"`);
    ok(l.length <= 24, `outline copy is a sentence rather than a section name: "${l}"`);
  }
  // The one non-name string in the control, and it says what the list is.
  has(OL_SRC, "In this file", "the outline lost the kicker that says what the list is");

  // No judge gets a row a retention seat cannot answer.
  const jl = JUDGE_SPECS.map((s) => s.label).join(" | ");
  no(jl, "Word vs Action", "a judge file gets a Word vs Action row — a retention seat has no word-versus-action read");
  no(jl, "Money", "a judge file gets a money row — there is no finance lane on a retention seat");
  eq(JUDGE_SPECS.filter((s) => /money|funding|word vs action|direction/i.test(s.label)).length, 0,
    "a judicial row names a member-only lane");
  // …and the judge list is not just the member list with two rows removed: it is
  // the judicial stages, off the judge file's own ids.
  for (const s of JUDGE_SPECS) has(s.targets.join(" "), "#pdxjf-", `judicial row "${s.label}" does not point at a judge-file id`);

  // The current row changes weight, not colour. Colour on this site means a
  // rating, so a coloured outline row would read as a score for its section.
  const active = OL_CSS.slice(OL_CSS.indexOf(".pdxol-item.is-current"));
  must(active.length > 40, "the .pdxol-item.is-current rule is gone");
  const firstRule = active.slice(0, active.indexOf("}"));
  has(firstRule, "font-weight: 700", "the current outline row is no longer distinguished by weight");
  has(firstRule, "text-decoration: underline", "the current outline row is no longer underlined");
  ok(!/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/i.test(firstRule.replace(/color:\s*#f2f6ff/i, "")) ||
     /color:\s*#f2f6ff/i.test(firstRule),
    "the current outline row took on a colour beyond going from steel to plain text");
}

// ═══════════════════════════════════════════════════════════════════════════════
section("6 · it takes nothing away — the gutter, the footer, the pill rail");
// ═══════════════════════════════════════════════════════════════════════════════
{
  // The gutter scrollbar is what this control was asked NOT to replace.
  const APP = R("app.css");
  has(APP, "#modal-body::-webkit-scrollbar", "the gutter scrollbar rule is gone from app.css");
  has(APP, "#modal-body::-webkit-scrollbar-thumb", "the gutter scrollbar thumb rule is gone from app.css");
  no(OL_CSS, "::-webkit-scrollbar", "person-outline.css restyles the gutter scrollbar it was told to leave alone");

  // The phone skin stays in the flow. position:fixed there would put the chip row
  // over #modal-footer and the Add-to-team button in it.
  const phone = OL_CSS.slice(OL_CSS.indexOf("@media (max-width: 1023.98px)"), OL_CSS.indexOf("@media (min-width: 1024px)"));
  must(phone.length > 200, "the phone media block is gone from person-outline.css");
  ok(!/position:\s*fixed/.test(phone), "the phone chip row uses position:fixed — it would sit over #modal-footer");
  ok(!/position:\s*sticky/.test(phone), "the phone chip row is sticky — it was asked to scroll away with the letterhead");
  no(phone, "#modal-footer", "the phone rules reach into the footer");
  no(OL_CSS, "position: fixed", "person-outline.css positions the outline out of the flow somewhere");
  has(phone, "flex-wrap: wrap", "the phone chip row no longer wraps");

  // The desktop skin buys its column by growing the panel, and only when a rail
  // is really there, so a file without one is unchanged.
  const wide = OL_CSS.slice(OL_CSS.indexOf("@media (min-width: 1024px)"));
  has(wide, "#modal-panel:has(> #modal-body > .pdxol--rail)",
    "the panel widening is no longer gated on the rail being in the DOM — every file would move");
  has(wide, "position: sticky", "the desktop rail is no longer sticky");
  has(wide, "grid-template-columns", "the desktop rail no longer gets its own column");

  // The chip row goes under the letterhead, below the banners, above the first
  // claim — which is the end of the identity stage, because the assembler puts
  // everything above the first sentinel there.
  has(OL_SRC, "body.querySelector('.pdxsp-stage-identity')",
    "the phone chip row no longer mounts at the end of the identity stage");

  // The existing pill rail, which is allowed to carry figures, is untouched, and
  // the outline rides its re-arm signal rather than adding a second watcher.
  has(OL_SRC, "window._pdxNavRearmSoon", "the outline no longer re-resolves when a deferred drawer mounts");
  const PF = R("profiles-full.js");
  has(PF, "window.PDXPersonOutline.mount(id)", "openModal no longer mounts the outline");
  has(PF, "#modal-body", "profiles-full.js probe went stale");
  ok(PF.indexOf("window._pdxInitProfileNav === 'function') window._pdxInitProfileNav();") <
     PF.indexOf("window.PDXPersonOutline.mount(id)"),
    "the outline mounts before the pill rail it reads its offset from");
  // Judge files never called _pdxInitProfileNav, so they arm the outline themselves.
  const JFS = R("judge-file.js");
  has(JFS, "window.PDXPersonOutline.mount(pid)", "the judge renderer no longer arms the outline");
  no(JFS, "window._pdxInitProfileNav", "the judge renderer started arming the member pill rail, whose figures are a legislator's");
  for (const id of ["pdxjf-retention", "pdxjf-jpec", "pdxjf-seat", "pdxjf-formal", "pdxjf-history", "pdxjf-court"]) {
    has(JFS, id, `judge-file.js no longer carries ${id}`);
  }

  // The spy reads geometry the observer already measured. A per-frame
  // getBoundingClientRect sweep of a profile subtree is the thing this codebase
  // does not do.
  has(OL_SRC, "new IntersectionObserver", "the outline's scroll-spy is not an IntersectionObserver");
  has(OL_SRC, "root: body", "the spy is not rooted on the modal scroller");
  // Comments stripped first: the reason this file does not sweep layout is
  // written down in it, and a probe that reads prose passes on the prose.
  const OL_CODE = OL_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  must(OL_CODE.indexOf("IntersectionObserver") >= 0, "stripping comments took the spy with it");
  no(OL_CODE, "getBoundingClientRect", "the outline measures layout itself instead of reading the observer's rects");

  // No site-wide nav destination was added.
  const IDX = R("index.html");
  has(IDX, '<script defer src="/person-outline.js"></script>', "person-outline.js is not registered in index.html");
  has(IDX, 'href="/person-outline.css"', "person-outline.css is not registered in index.html");
  no(IDX, 'href="#pdx-file-outline"', "the outline became a link target in the page chrome");
}

// ═══════════════════════════════════════════════════════════════════════════════
section("7 · the service worker ships both new files, under a new version");
// ═══════════════════════════════════════════════════════════════════════════════
{
  const SW = R("sw.js");
  const m = /const CACHE_VERSION = 'v(\d+)';/.exec(SW);
  must(m, "CACHE_VERSION is not in sw.js in the form this file checks");
  const v = Number(m[1]);
  const prev = HEAD("sw.js");
  if (prev) {
    const pm = /const CACHE_VERSION = 'v(\d+)';/.exec(prev);
    if (pm) ok(v > Number(pm[1]), `CACHE_VERSION did not move past HEAD's v${pm[1]} — warm devices would serve the old shell against the new outline`);
  }
  has(SW, `// v${v} - `, `sw.js has no prose log entry for v${v}`);
  has(SW, "'/person-outline.js'", "person-outline.js is not precached");
  has(SW, "'/person-outline.css'", "person-outline.css is not precached");
}

// ═══════════════════════════════════════════════════════════════════════════════
section("8 · twin boot — formal tiers and Direction Match are byte-identical");
// ═══════════════════════════════════════════════════════════════════════════════
{
  const corpus = buildCorpus(ROOT);
  must(corpus && corpus.byMember && corpus.byMember.size > 300, "the record corpus did not load enough members to sweep");

  const seed = (win) => {
    for (const [pid, recs] of corpus.byMember) {
      try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
    }
    return win;
  };
  const FILES = [...ENGINE_FILES, "voting-record.js", "profile-spine.js"];
  const A = seed(boot(HEAD, FILES));
  const B = seed(boot(R, FILES));
  must(A.PDXConsistency && typeof A.PDXConsistency.scopedOverall === "function", "HEAD's consistency.js did not boot");
  must(B.PDXWordAction && typeof B.PDXWordAction.read === "function", "the working tree's word-action.js did not boot");
  must(A.PDXConsistency.formalPatternIndex && typeof A.PDXConsistency.formalPatternIndex.shape === "function",
    "the formal-pattern index no longer publishes shape()");

  const scopes = Object.keys(B.PDXConsistency.SCOPES);
  must(scopes.length > 0, "PDXConsistency.SCOPES is empty");
  const drift = [];
  let swept = 0;
  for (const [pid] of corpus.byMember) {
    swept++;
    for (const sc of scopes) {
      if (JSON.stringify(A.PDXConsistency.scopedOverall(sc, pid)) !==
          JSON.stringify(B.PDXConsistency.scopedOverall(sc, pid))) drift.push(`${pid}/${sc}`);
    }
    if (JSON.stringify(A.PDXWordAction.read(pid)) !== JSON.stringify(B.PDXWordAction.read(pid))) drift.push(`${pid}/ledger`);
    if (JSON.stringify(A.PDXConsistency.formalPatternIndex.shape(pid)) !==
        JSON.stringify(B.PDXConsistency.formalPatternIndex.shape(pid))) drift.push(`${pid}/formal`);
  }
  ok(swept > 300, `the twin boot only swept ${swept} files`);
  eq(drift.slice(0, 8).join(" | "), "",
    `${drift.length} formal tier / Direction Match read(s) moved — this pass added a jump list and must move none`);
  console.log(`      ${swept} files swept across ${scopes.length} scopes; no tier or match read moved`);

  // The judge file's own reads are untouched too: the only change there was ids.
  const JA = boot(HEAD, JUDGE_FILES), JB = boot(R, JUDGE_FILES);
  must(JA.PDXJudgeFile && JB.PDXJudgeFile, "a judge sandbox did not boot");
  let judges = 0;
  const jdrift = [];
  for (const j of JB.PDXJudicial.all()) {
    judges++;
    const a = JA.PDXJudgeFile._html(JA.PDXJudicial.judge(j.pid)) || "";
    const b = JB.PDXJudgeFile._html(JB.PDXJudicial.judge(j.pid)) || "";
    // The ids are the whole diff. Strip them and the two files must be equal.
    if (a.replace(/ id="pdxjf-[a-z]+"/g, "") !== b.replace(/ id="pdxjf-[a-z]+"/g, "")) jdrift.push(j.pid);
  }
  ok(judges > 100, `the judge sweep only rendered ${judges} files`);
  eq(jdrift.slice(0, 6).join(" "), "", `${jdrift.length} judge file(s) changed by more than the new section ids`);
  console.log(`      ${judges} judge files rendered; the section ids are the entire diff`);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ person outline: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error(`  · ${f}`);
  process.exit(1);
}
console.log(`✓ person outline: ${passed} assertions passed\n`);
