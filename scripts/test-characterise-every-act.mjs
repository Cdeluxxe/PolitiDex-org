#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-characterise-every-act.mjs — every judged act is characterised, and
// PRIMARY is a label on the bill rather than a key to the finding
// ─────────────────────────────────────────────────────────────────────────────
// THE OWNER RULE, in the words it was handed down in. A (member, issue) row with
// judged formal acts ALWAYS gets a side read:
//
//     1–2 the same way        → Thin supports / Thin opposes
//     both ways               → Split, with its two counts
//     deeper one way          → Mostly / Strongly, on the EXISTING count floors
//     zero judged acts        → the existing no-side / procedural / empty reasons
//
// PRIMARY, secondary and stowaway never suppress that read. "Not about this
// issue" and every other incidental unread is banned outright where judged acts
// exist, because it was never a statement about the member: it was a statement
// about the vehicle the vote arrived on, printed in the slot where the reader
// looks for what the member did.
//
// WHAT PRIMARY STILL IS. A stored flag and a sentence about the vehicle — "this
// measure's subject is the issue" as against "this was tested inside a larger
// package". It is printed BESIDE the finding, on the row, in the dossier and on
// the 🚂 line. It is not, anywhere, a term in a condition that decides whether an
// act may be read. That distinction is the whole of this file, and section 7 is
// the strongest form of it: the constant is set to 99 — a floor no member in the
// corpus can clear — and not one tier, label, count or percentage may move.
//
// WHAT IS DELIBERATELY NOT ASSERTED HERE. That a widened read reaches a score. It
// must not. Rows the pattern engine will not characterise are published by
// quoting the browse lane and carry `deferred: true`; the alignment side map and
// the record baseline both refuse them, and the depth floors they failed are
// unchanged. Section 6 holds that wall. Direction Match never sees any of this
// lane at all.
//
//   node scripts/test-characterise-every-act.mjs
//
// Real shipped modules in a node:vm sandbox, over the live record corpus, plus a
// second sandbox booted from mutated source for section 7.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "profile-spine.js", "profiles-full.js",
];
const SRC = new Map(FILES.map((f) => [f, readFileSync(join(ROOT, f), "utf8")]));

let passed = 0, failed = 0;
// Three hundred thousand assertions can fail three hundred thousand times over one
// mistake, so the messages are capped and the COUNT is not.
const failures = [];
const ok = (cond, msg) => {
  if (cond) { passed++; return; }
  failed++;
  if (failures.length < 40) failures.push(msg);
};
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const no = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" is still printed`);
const section = (t) => console.log(`\n   ── ${t}`);
// A probe that finds nothing proves nothing. Every sweep below counts what it
// looked at and this is what refuses to pass on an empty one.
const must = (cond, msg) => { if (!cond) { console.error(`\n  ✗ characterise-every-act is STALE: ${msg}\n`); process.exit(2); } };

const boot = (mutate) => {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    let src = SRC.get(f);
    if (mutate && mutate[f]) src = mutate[f](src);
    vm.runInContext(src, ctx, { filename: f });
  }
  win.PROFILES = win.CMP_DATA;
  return win;
};

const { byMember } = buildCorpus(ROOT);
must(byMember.size > 100, `too few members in the corpus to sweep (${byMember.size})`);
const seed = (win) => {
  for (const [pid, recs] of byMember) {
    try { win.PDXVotingRecord.noteMember(pid, JSON.parse(JSON.stringify(recs))); } catch (e) { /* skip */ }
  }
  return win;
};

const A = seed(boot());
const CS = A.PDXConsistency;
must(CS && typeof CS.issueRows === "function", "PDXConsistency.issueRows unavailable");
must(typeof A._pdxRecordDirection === "function", "_pdxRecordDirection is not published");
console.log(`      ${byMember.size} members seeded from the shipped record corpus`);

const NOUN = { noun: { one: "vote", many: "votes" }, label: "" };
const idxOf = (win, pid, key) => {
  try { return win._pdxRecordDirection(pid, key, NOUN) || null; } catch (e) { return null; }
};
const DIRECTION_WORD = /supports|opposes|advanc|against/i;
const LABEL_SET =
  /^(Strongly|Mostly|Thin) (supports|opposes)$|^Split$|^No clear pattern yet$|^No vote here took a side$/;

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the floors are exactly where they were");
// ═════════════════════════════════════════════════════════════════════════════
// The brief moved no floor. A pass that quietly lowered _RD_SPLIT_MIN_JUDGED, or
// _RD_MIN_JUDGED, would produce the same widened copy by cheating, so the floors
// are pinned at their shipped values in source and through the published mirrors.
{
  const src = SRC.get("stance-helpers.js");
  const PINS = [
    ["_RD_MIN_STRENGTH = 4", "the weight a record needs before it is deep"],
    ["_RD_THIN_MIN_STRENGTH = 0.6", "…and before one act is worth stating at all"],
    ["_RD_MIN_JUDGED = 4", "the depth floor for a characterisation"],
    ["_RD_DOMINANCE = 0.75", "the share of weight one side needs to be the record"],
    ["_RD_THIN_MIN = 2", "the items a uniform run states itself over"],
    ["_RD_MIN_PRIMARY = 1", "the primary count the package sentence is worded from"],
    ["_RD_SPLIT_MIN_JUDGED = 6", "the depth a split needs before it prints counts"],
    ["_RD_SPLIT_MIN_SIDE = 2", "the smaller side's floor before it is a side"],
    ["_RD_MEMBER_FLOOR = 12", "the member-level coverage floor"],
  ];
  for (const [pin, what] of PINS) has(src, `var ${pin};`, `${what}: ${pin}`);
  eq(A._PDX_RD_MIN_JUDGED, 4, "the published depth floor agrees with the source");
  eq(A._PDX_RD_DOMINANCE, 0.75, "…and the dominance floor");
  eq(A._PDX_RD_SPLIT_MIN_JUDGED, 6, "…and the split depth floor");
  eq(A._PDX_RD_SPLIT_MIN_SIDE, 2, "…and the split side floor");
  eq(A._PDX_RD_MEMBER_FLOOR, 12, "…and the member coverage floor");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · PRIMARY appears in no condition that decides a read");
// ═════════════════════════════════════════════════════════════════════════════
// The source-level statement of "a label, not a key". _RD_MIN_PRIMARY may be
// declared, and may be read to word the package sentence — `pkgOnly`, once on
// each of the two tier lanes. Anywhere else it is a gate, and this is the check
// that fails when one is put back.
{
  const lines = SRC.get("stance-helpers.js").split("\n");
  const live = [];
  lines.forEach((ln, i) => {
    const code = ln.replace(/^\s*\/\/.*$/, "");            // whole-line comments out
    if (code.indexOf("_RD_MIN_PRIMARY") < 0) return;
    if (/^\s*\/\//.test(ln)) return;
    live.push({ n: i + 1, ln: ln.trim() });
  });
  must(live.length > 0, "_RD_MIN_PRIMARY has left stance-helpers.js entirely — this file is untestable");
  eq(live.length, 3, `_RD_MIN_PRIMARY is live on ${live.length} lines (${live.map((l) => l.n).join(", ")})`);
  eq(live[0].ln, "var _RD_MIN_PRIMARY = 1;", "the first live line is the declaration");
  for (const l of live.slice(1)) {
    eq(l.ln, "var pkgOnly = (idx.primary || 0) < _RD_MIN_PRIMARY;",
      `line ${l.n} reads the primary count for something other than the package sentence`);
  }
  // And the two disclosure lines are one per lane, not two on the same one.
  const src = SRC.get("stance-helpers.js");
  const pat = src.indexOf("function _recordPatternTier");
  const dis = src.indexOf("function _recordDisplayTier");
  must(pat > 0 && dis > pat, "the two tier lanes are no longer in source order — section 2 is untestable");
  ok(src.indexOf("var pkgOnly", pat) < dis, "the pattern lane words its own package sentence");
  ok(src.indexOf("var pkgOnly", dis) > dis, "…and so does the display lane");
  // Nothing in this file may argue the retired position any more, either.
  no(src, "must stay unread", "a comment still argues that a 0-primary row must stay unread");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the two named rows — Curtis and Lee on housing");
// ═════════════════════════════════════════════════════════════════════════════
// The reported bug, in the two members it was reported on. One vote each on
// H.R. 6644, one way each, and the same reading on all four surfaces a reader can
// reach: the tree's Record slot, the row's own chip, the formal-pattern index and
// the issue dossier.
{
  const WANT = [
    ["curtis", "housing", "Thin supports", "1 vote advanced", "support"],
    ["curtis", "housing_build", "Thin supports", "1 vote advanced", "support"],
    ["lee", "housing", "Thin opposes", "1 vote against", "oppose"],
    ["lee", "housing_build", "Thin opposes", "1 vote against", "oppose"],
  ];
  const fpiOf = (pid, key) =>
    ((CS.formalPatternIndex.rows(pid) || []).filter((x) => x && x.key === key)[0]) || null;
  for (const [pid, key, label, counts, tone] of WANT) {
    const row = (CS.issueRows(pid) || []).filter((r) => r && r.key === key)[0];
    must(!!row, `${pid}/${key}: the row is gone from the profile — the reported case is untestable`);
    const tree = CS.recordPattern.display(row) || {};
    eq(tree.tier, "thin", `${pid}/${key}: the tree states the side, thinly`);
    eq(tree.label, label, `${pid}/${key}: …in the shipped words`);
    eq(tree.counts, counts, `${pid}/${key}: …with the count beside it`);
    eq(tree.tone, tone, `${pid}/${key}: …and the right side`);
    const chip = String(CS.recordPattern.html(row) || "");
    has(chip, label, `${pid}/${key}: the row chip prints the same label`);
    const x = fpiOf(pid, key);
    must(!!x, `${pid}/${key}: the row is gone from the formal index`);
    eq(x.read, true, `${pid}/${key}: the formal index reads it`);
    eq(x.tier, "thin", `${pid}/${key}: at the same tier`);
    eq(x.patLabel, label, `${pid}/${key}: in the same words`);
    eq(x.why, null, `${pid}/${key}: and carries no refusal reason under a published side`);
    const d = CS.dossierRead(pid, key) || {};
    eq(d.state, "reads", `${pid}/${key}: the dossier reads it too`);
    eq(d.tier, "thin", `${pid}/${key}: at the same tier again`);
    has(String(d.label || d.patLabel || ""), label, `${pid}/${key}: and in the same words again`);
    // The engine itself — not a display fallback standing in for it.
    const pt = CS.recordPattern.tier(row) || {};
    eq(pt.tier, "thin", `${pid}/${key}: the pattern engine characterises the act`);
    eq(pt.label, label, `${pid}/${key}: …in those words`);
    eq(tree.display, false, `${pid}/${key}: …so the tree is not falling back to the browse lane`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the owner rule, over every row in the corpus");
// ═════════════════════════════════════════════════════════════════════════════
// Judged acts on a poled issue, on one side or both: a read, on every surface, at
// one tier, shaped by the count floors and nothing else.
const CENSUS = { rows: 0, judged: 0, checked: 0, refused: 0, deferred: 0, pkg: 0, tiers: {} };
{
  const BANNED = [
    "Not about this issue",
    "brushed the subject",
    "only incidentally",
    "rather than being about it",
  ];
  for (const pid of byMember.keys()) {
    const fpi = {};
    (CS.formalPatternIndex.rows(pid) || []).forEach((x) => { if (x && x.key) fpi[x.key] = x; });
    for (const row of (CS.issueRows(pid) || [])) {
      if (!row || !row.key || row.lane === "exec") continue;
      CENSUS.rows++;
      const idx = idxOf(A, pid, row.key);
      const judged = idx ? (idx.judged || 0) : 0;
      const adv = idx ? (idx.advances || 0) : 0;
      const opp = idx ? (idx.opposes || 0) : 0;
      const x = fpi[row.key];
      const tree = CS.recordPattern.display(row) || null;
      const d = CS.dossierRead(pid, row.key) || null;
      // Zero judged acts, no pole, or nothing that took a side: the refusals the
      // brief keeps. They are allowed to refuse and are not swept here.
      if (judged < 1 || (idx && idx.suppressed) || (adv + opp) < 1) {
        if (x && !x.read) CENSUS.refused++;
        continue;
      }
      CENSUS.judged++;
      // (a) THE READ EXISTS, EVERYWHERE.
      must(!!x, `${pid}/${row.key}: a judged row fell out of the formal index entirely`);
      eq(x.read, true, `${pid}/${row.key}: the formal index refuses a judged act`);
      ok(!!(tree && tree.tier && tree.tier !== "none"),
        `${pid}/${row.key}: the tree prints no side over judged acts`);
      ok(!!(d && d.state === "reads"), `${pid}/${row.key}: the dossier refuses a judged act`);
      // (b) ONE TIER ACROSS THE SURFACES.
      eq(x.tier, tree && tree.tier, `${pid}/${row.key}: index and tree disagree about the tier`);
      eq(d.tier, tree && tree.tier, `${pid}/${row.key}: dossier and tree disagree about the tier`);
      // THE LABEL IS ASKED OF THE INDEX, not of the tree's slot. On a row with a
      // stated position the slot's headline is the say-vs-do verdict — "Backed up",
      // "Contradicted", "Mixed" — and the pattern's own words ride underneath it.
      // `patLabel` is the pattern wording on every row, spoken or silent, so it is
      // the field the owner rule is about.
      const patLb = String(x.patLabel || "");
      ok(LABEL_SET.test(patLb),
        `${pid}/${row.key}: "${patLb}" is not in the published label set`);
      // (c) THE SHAPE IS THE COUNT FLOORS' BUSINESS, AND NOTHING ELSE'S.
      const t = tree.tier;
      CENSUS.tiers[t] = (CENSUS.tiers[t] || 0) + 1;
      if (adv > 0 && opp > 0) {
        ok(t === "split" || t === "mostly" || t === "strong",
          `${pid}/${row.key}: a both-ways record read "${t}"`);
        if (t === "split") {
          eq(patLb, "Split", `${pid}/${row.key}: a split is labelled Split`);
          if (judged >= A._PDX_RD_SPLIT_MIN_JUDGED) {
            ok(/\d/.test(String(x.counts || "")),
              `${pid}/${row.key}: a split over the depth floor prints no counts`);
          }
        }
      } else {
        ok(t !== "split", `${pid}/${row.key}: a one-way record read as a split`);
        ok(DIRECTION_WORD.test(patLb),
          `${pid}/${row.key}: a one-way record's label withholds the direction`);
        if (judged <= 3) {
          eq(t, "thin", `${pid}/${row.key}: ${judged} act(s) one way is the thin tier`);
          ok(/^Thin /.test(patLb), `${pid}/${row.key}: …worded thin`);
        }
        if (t === "strong" || t === "mostly") {
          ok(judged >= A._PDX_RD_MIN_JUDGED,
            `${pid}/${row.key}: "${t}" was reached on ${judged} judged act(s), under the floor`);
        }
      }
      // (d) NO REFUSAL WORDING SURVIVES ANYWHERE ON A READ ROW.
      const blob = [x.patLabel, x.counts, x.lede, x.why && x.why.note, x.why && x.why.lb,
                    tree.label, tree.counts, tree.note, tree.packageNote,
                    d.label, d.lede, d.why && d.why.lb, d.why && d.why.note]
        .filter(Boolean).join(" | ");
      for (const b of BANNED) no(blob, b, `${pid}/${row.key}: a read row still carries "${b}"`);
      CENSUS.checked++;
      if (x.deferred) CENSUS.deferred++;
      // (e) THE PACKAGE SENTENCE STAYS ON THE ROWS THAT EARNED IT — beside the
      //     finding, never instead of it.
      if (tree.packageOnly) {
        CENSUS.pkg++;
        has(String(tree.note || tree.packageNote || ""), "mainly about something else",
          `${pid}/${row.key}: a package-borne row does not say how the vote arrived`);
        ok(!!tree.tier && tree.tier !== "none",
          `${pid}/${row.key}: …and the disclosure replaced the finding`);
      }
    }
  }
  must(CENSUS.checked > 5000, `only ${CENSUS.checked} judged rows were swept`);
  must(CENSUS.pkg > 50, `only ${CENSUS.pkg} package-borne rows were swept`);
  console.log(`      ${CENSUS.rows} rows · ${CENSUS.judged} with judged acts on a poled issue`);
  console.log(`      tiers: ${JSON.stringify(CENSUS.tiers)}`);
  console.log(`      ${CENSUS.pkg} package-borne reads · ${CENSUS.deferred} quoted from the browse lane · ${CENSUS.refused} honest refusals`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · a package-only row shows the read AND the package line");
// ═════════════════════════════════════════════════════════════════════════════
// The 🚂 disclosure travels beside the finding. One real row, in full: the tier,
// the label, the arrival sentence, the stowaway object and the menu sentence that
// carries the fact the retired refusal used to carry.
{
  let sample = null;
  for (const pid of byMember.keys()) {
    for (const row of (CS.issueRows(pid) || [])) {
      if (!row || !row.key || row.lane === "exec") continue;
      const tree = CS.recordPattern.display(row) || null;
      if (!tree || !tree.packageOnly || !tree.tier || tree.tier === "none") continue;
      const x = ((CS.formalPatternIndex.rows(pid) || []).filter((r) => r && r.key === row.key)[0]) || null;
      if (!x || !x.vehicle || !x.vehicle.only) continue;
      sample = { pid, key: row.key, tree, x };
      break;
    }
    if (sample) break;
  }
  must(!!sample, "no package-only row with a published read exists in the corpus");
  const { pid, key, tree, x } = sample;
  console.log(`      package-only sample: ${pid}/${key} → ${tree.tier} · ${tree.label}`);
  ok(tree.tier === "thin" || tree.tier === "split" || tree.tier === "strong" || tree.tier === "mostly",
    `${pid}/${key}: a package-only row reads at a real tier`);
  eq(x.read, true, `${pid}/${key}: and the index reads it`);
  eq(x.why, null, `${pid}/${key}: with no refusal reason underneath`);
  has(String(tree.note || tree.packageNote || ""), "mainly about something else",
    `${pid}/${key}: the arrival sentence is on the row`);
  eq(x.vehicle.only, true, `${pid}/${key}: the 🚂 disclosure says every act arrived that way`);
  ok(!!x.vehicle.stowaway, `${pid}/${key}: …and names the row a stowaway`);
  // The facts the retired refusal used to carry are still published — on the menu
  // context, which the dossier mounts BESIDE the finding.
  const m = CS.menu && CS.menu.context ? CS.menu.context(pid, key) : null;
  must(!!m, `${pid}/${key}: the menu context is gone — the disclosure has nowhere left to live`);
  eq(m.state, "provision_only", `${pid}/${key}: the menu context names the package state`);
  eq(m.lb, "Only tested as a provision inside larger packages",
    `${pid}/${key}: in the shipped menu vocabulary`);
  // And the sentence is a disclosure, not a verdict: it is not the row's label.
  ok(String(tree.label || "").indexOf("provision") < 0,
    `${pid}/${key}: the package sentence was promoted into the finding`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the copy widened and the score did not");
// ═════════════════════════════════════════════════════════════════════════════
// Rows published by quoting the browse lane carry `deferred: true`. They are read
// by readers and by nothing that counts: not the alignment side map, not the
// record baseline. The depth floors they failed are still the floors.
{
  let swept = 0;
  for (const pid of byMember.keys()) {
    const rows = CS.formalPatternIndex.rows(pid) || [];
    const def = rows.filter((x) => x && x.deferred);
    if (!def.length) continue;
    const sides = (A._alignRecordSideMap(pid) || {}).sides || {};
    const bl = {};
    (CS.baseline.rows(pid) || []).forEach((b) => { if (b && b.key) bl[b.key] = b; });
    for (const x of def) {
      swept++;
      eq(x.read, true, `${pid}/${x.key}: a quoted row is a read row`);
      ok(!sides[x.key], `${pid}/${x.key}: a quoted row reached the alignment side map`);
      ok(!bl[x.key], `${pid}/${x.key}: a quoted row reached the record baseline`);
    }
  }
  must(swept > 100, `only ${swept} quoted rows were swept`);
  console.log(`      ${swept} quoted rows read by readers and by nothing that counts`);
  // The wall, in source, on both surfaces that count.
  has(SRC.get("alignment-tool.js"), "if (!x.read || x.deferred || !side || !conf) return;",
    "the alignment side map's fail-closed line no longer refuses a quoted row");
  has(SRC.get("consistency.js"), "if (!x || !x.read || x.deferred || x.said) return null;",
    "the record baseline no longer refuses a quoted row");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the mutation — PRIMARY set to 99 changes not one finding");
// ═════════════════════════════════════════════════════════════════════════════
// "A label only", stated as an experiment. _RD_MIN_PRIMARY becomes a floor no
// member in the corpus can clear, so every row in the app is package-borne as far
// as the constant is concerned. If the flag were a key to any finding, tiers would
// collapse and Direction Match would move. Nothing may move except the disclosure
// sentence the constant exists to word — which is asserted to change, so that a
// mutation that failed to apply cannot pass this section by accident.
{
  const MUT = "var _RD_MIN_PRIMARY = 1;";
  must(SRC.get("stance-helpers.js").indexOf(MUT) > 0,
    "the declaration has moved — the mutation can no longer be applied");
  const M = seed(boot({ "stance-helpers.js": (s) => s.replace(MUT, "var _RD_MIN_PRIMARY = 99;") }));
  eq(M._PDX_RD_MIN_JUDGED, 4, "the mutant booted with its other floors intact");
  const MS = M.PDXConsistency;
  const fields = ["tier", "patLabel", "counts", "tone", "read", "deferred", "directional", "weight"];
  let cmpRows = 0, moved = 0, pkgMoved = 0;
  for (const pid of byMember.keys()) {
    const a = {}, b = {};
    (CS.formalPatternIndex.rows(pid) || []).forEach((x) => { if (x && x.key) a[x.key] = x; });
    (MS.formalPatternIndex.rows(pid) || []).forEach((x) => { if (x && x.key) b[x.key] = x; });
    for (const k of Object.keys(a)) {
      const x = a[k], y = b[k];
      ok(!!y, `${pid}/${k}: the row vanished from the mutant index`);
      if (!y) continue;
      cmpRows++;
      for (const f of fields) {
        if (x[f] !== y[f]) moved++;
        eq(y[f], x[f], `${pid}/${k}: "${f}" moved when PRIMARY became unreachable`);
      }
    }
    // The tree's Record slot, on the same rows.
    for (const row of (CS.issueRows(pid) || [])) {
      if (!row || !row.key || row.lane === "exec") continue;
      const ta = CS.recordPattern.display(row) || null;
      const mrow = (MS.issueRows(pid) || []).filter((r) => r && r.key === row.key)[0];
      const tb = mrow ? (MS.recordPattern.display(mrow) || null) : null;
      if (!ta || !ta.tier || ta.tier === "none") continue;
      ok(!!tb, `${pid}/${row.key}: the mutant tree prints nothing where the shipped one reads`);
      if (!tb) continue;
      eq(tb.tier, ta.tier, `${pid}/${row.key}: the tree's tier moved under the mutation`);
      eq(tb.label, ta.label, `${pid}/${row.key}: …or its label`);
      eq(tb.counts, ta.counts, `${pid}/${row.key}: …or its counts`);
      if (ta.packageOnly !== tb.packageOnly) pkgMoved++;
    }
  }
  must(cmpRows > 5000, `only ${cmpRows} index rows were compared against the mutant`);
  must(pkgMoved > 0,
    "the mutation changed no package disclosure at all — it did not apply, so section 7 proves nothing");
  console.log(`      ${cmpRows} index rows compared · ${moved} fields moved · ${pkgMoved} disclosures re-worded`);

  // ⚖️ DIRECTION MATCH, THE FIGURE ITSELF. Byte-identical across every profile.
  const WA = A.PDXWordAction, WB = M.PDXWordAction;
  must(WA && typeof WA.read === "function", "PDXWordAction.read is unavailable — the twin boot proves nothing");
  const pids = Object.keys(A.CMP_DATA).sort();
  let live = 0, dmMoved = 0;
  for (const pid of pids) {
    const shot = (W) => {
      try {
        const r = W.read(pid) || null;
        if (!r) return "null";
        return JSON.stringify([r.pct, r.publishable, r.tested, r.verdict && r.verdict.label,
                               (r.pairs || []).length]);
      } catch (e) { return `err:${e && e.message}`; }
    };
    const sa = shot(WA), sb = shot(WB);
    if (sa !== "null") live++;
    if (sa !== sb) dmMoved++;
    eq(sb, sa, `${pid}: Direction Match moved when PRIMARY became unreachable`);
  }
  must(live > 100, `only ${live} profiles produced a Direction Match read`);
  console.log(`      ${pids.length} profiles compared · ${live} with a live read · ${dmMoved} moved`);
}

// ── report ───────────────────────────────────────────────────────────────────
if (failed) {
  console.error(`\n✗ characterise-every-act: ${failed} failure(s) (${passed} passed):`);
  failures.slice(0, 25).forEach((f) => console.error(`  • ${f}`));
  if (failed > failures.length) console.error(`  … and ${failed - failures.length} more`);
  process.exit(1);
}
console.log(`\n✓ every judged act is characterised, and PRIMARY is a label only — ${passed} checks passed`);
