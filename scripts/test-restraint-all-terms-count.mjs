#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-restraint-all-terms-count.mjs — one count on Trump × Diplomacy & Restraint
// ─────────────────────────────────────────────────────────────────────────────
// The profile row, the stance-tree leaf and the drawer count every term. On
// Trump × Diplomacy & Restraint that is 4 actions — the vetoes of S.J. Res. 7 and
// S.J. Res. 68, Executive Order 14353 and Proclamation 11015 — 0 aligned and 4
// against, at 0%. That is the only count that prints.
//
// The executive record also holds a current-term slice of the same leaf: two
// actions, EO 14353 and Proclamation 11015, which the leaf's display tier keeps in
// its hidden `counts` field ("2 actions against"). It is not a second score and
// it reaches none of the three surfaces: no "2 actions", no "this term" clause,
// no "N scored · M on file" line. Nothing here reads the retired `isPrimary` flag,
// so no also-on sentence prints either — that cause is not in the code.
//
//   1. PROFILE ROW: 0% · 0 aligned · 4 against · 4 actions on record.
//   2. LEAF: depth "4 actions", 0%, nothing term-scoped printed.
//   3. DRAWER: four rows, first line "4 measures · 4 formal acts", 0 for · 4 against.
//   4. A LEAF WHOSE TERM SLICE IS THE WHOLE FILE prints no term clause either.
//   5. MUTATIONS: a term count printed on the card, and the 4 turned into a 2,
//      must each fail the checks above.
//
//   node scripts/test-restraint-all-terms-count.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "pdx-issue-family.js", "acct-spotlight-data.js", "say-vs-do.js",
  "exec-action-data.js", "exec-record.js", "exec-record-ui.js", "issue-colors.js",
  "consistency.js", "voting-record.js", "word-action.js", "profile-spine.js",
  "stance-tree.js",
];
const PID = "trump", RS = "restraint";
const ALL = ["Executive Order 14353", "Proclamation 11015",
  "S.J. Res. 68 (116th Congress)", "S.J. Res. 7 (116th Congress)"].sort();

function boot(patch) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    let src = R(f);
    if (patch && patch[f]) src = patch[f](src);
    vm.runInContext(src, ctx, { filename: f });
  }
  win.PROFILES = win.CMP_DATA;
  return win;
}
const text = (h) => String(h || "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ");

// The slice of a whole-profile render that belongs to one issue: from its label
// up to the next issue label the same render prints.
function slice(t, label, nextLabels) {
  const at = t.indexOf(label);
  if (at < 0) return "";
  let end = t.length;
  for (const n of nextLabels) {
    const j = t.indexOf(n, at + label.length);
    if (j > -1 && j < end) end = j;
  }
  return t.slice(at, end);
}

// Printed anywhere on these surfaces, any of these is a term-scoped or second count.
const TERM = /this term|current term|\b2 actions?\b|\b2 of 4\b|\bscored · \d+ on file|also-on/i;

function check(win) {
  const faults = [];
  let pass = 0;
  const ok = (c, m) => { if (c) pass++; else faults.push(m); };
  const CS = win.PDXConsistency, XR = win.PDXExecRecord, TREE = win.PDXStanceTree;
  if (!CS || !XR || !TREE) return { faults: ["engines not published"], pass };

  // The fixture is still the one this file is about: four on file every term,
  // two in the current-term slice. Without the slice there is nothing to leak.
  const allN = (XR.issue(PID, RS, { allTerms: true }) || {}).actions || [];
  const curN = (XR.issue(PID, RS) || {}).actions || [];
  ok(allN.length === 4, `fixture: all-terms pool holds ${allN.length}, want 4`);
  ok(curN.length === 2, `fixture: current-term slice holds ${curN.length}, want 2`);

  const r = CS.issueRow(PID, RS);
  const label = (r && r.label) ? String(r.label).replace(/^\S+\s+/, "") : "Diplomacy & Restraint";
  const others = (CS.issueRows(PID) || []).filter((x) => x.key !== RS)
    .map((x) => String(x.label || "").replace(/^\S+\s+/, "")).filter(Boolean);

  // ── 1. the profile row ────────────────────────────────────────────────────
  ok(r && r.evidence && r.evidence.actions === 4, `profile: evidence.actions is ${r && r.evidence && r.evidence.actions}`);
  const row = slice(text(CS.stancesSectionHtml(PID)), label, others);
  ok(row.length > 0, "profile: no Diplomacy & Restraint row rendered");
  ok(/\b0%/.test(row), "profile: the row lost its 0%");
  ok(/0 aligned · 4 against/.test(row), `profile: the counts are not 0 aligned · 4 against`);
  ok(/\b4 actions on record\b/.test(row), "profile: the row does not say 4 actions on record");
  ok(!TERM.test(row), `profile: a term-scoped or second count printed: ${(row.match(TERM) || [""])[0]}`);

  // ── 2. the stance-tree leaf ───────────────────────────────────────────────
  const lf = TREE.leaf(PID, RS);
  ok(lf && lf.record && lf.record.depth === "4 actions", `leaf: depth is ${JSON.stringify(lf && lf.record && lf.record.depth)}`);
  ok(lf && lf.record && lf.record.items === 4, `leaf: items is ${lf && lf.record && lf.record.items}`);
  ok(lf && lf.record && lf.record.pct === 0, `leaf: pct is ${lf && lf.record && lf.record.pct}`);
  const leaf = slice(text(TREE.html(PID)), label, others);
  ok(/Record: Contradicted · 4 actions/.test(leaf), `leaf: rendered record is not "Contradicted · 4 actions"`);
  ok(!TERM.test(leaf), `leaf: a term-scoped or second count printed: ${(leaf.match(TERM) || [""])[0]}`);

  // ── 3. the drawer ─────────────────────────────────────────────────────────
  const ids = (CS.dossierItems(PID, RS) || []).map((d) => d.ident).sort();
  ok(JSON.stringify(ids) === JSON.stringify(ALL), `drawer: lists ${ids.join(" | ")}`);
  const dr = text(CS.gapViewHtml(PID, RS));
  ok(/On this issue: 4 measures · 4 formal acts/.test(dr), "drawer: first line is not the four-act inventory");
  ok(/Acts: 0 for · 4 against/.test(dr), "drawer: tally is not 0 for · 4 against");
  ok(!TERM.test(dr), `drawer: a term-scoped or second count printed: ${(dr.match(TERM) || [""])[0]}`);

  // ── 4. a leaf whose term slice is the whole file gets no term clause ──────
  let matched = 0;
  for (const x of CS.issueRows(PID) || []) {
    if (x.lane !== "exec") continue;
    const a = ((XR.issue(PID, x.key, { allTerms: true }) || {}).actions || []).length;
    const c = ((XR.issue(PID, x.key) || {}).actions || []).length;
    if (!a || a !== c) continue;
    matched++;
    const t = slice(text(CS.stancesSectionHtml(PID)), String(x.label || "").replace(/^\S+\s+/, ""),
      others.concat(label).filter((l) => l !== String(x.label || "").replace(/^\S+\s+/, "")));
    ok(!/this term alone/.test(t), `${PID} × ${x.key}: ${a} of ${a} this term printed a term clause`);
  }
  ok(matched > 0, "no Trump leaf whose term slice is the whole file — fixture thinned out");
  return { faults, pass };
}

const live = check(boot());

// ── 5. mutations ───────────────────────────────────────────────────────────
const MUTANTS = [
  { name: "term count printed on the leaf (hidden counts field shown)",
    file: "stance-tree.js",
    from: "(rc.depth ? '<i class=\"pdxtree-depth\"> · ' + esc(rc.depth) + '</i>' : '') +",
    to: "(rc.depth ? '<i class=\"pdxtree-depth\"> · ' + esc(rc.depth) + (rc.counts ? ' · ' + esc(rc.counts) : '') + '</i>' : '') +",
    expect: /^leaf: a term-scoped/ },
  { name: "term clause printed on the profile row when both scopes agree",
    file: "consistency.js",
    from: "if (all.token === cur.token) return null;",
    to: "",
    expect: /^profile: a term-scoped/ },
  { name: "the 4 turned into a 2 (leaf depth read off the current-term slice)",
    file: "consistency.js",
    from: "var items = Math.max(_stHeld(r) || 0, (idx && idx.total) || 0);",
    to: "var items = (idx && idx.total) || 0;",
    expect: /^leaf: depth is/ },
  { name: "the 4 turned into a 2 (row evidence read off the current-term slice)",
    file: "consistency.js",
    from: "return (r && r.evidence && r.evidence.actions) || 0;",
    to: "return (r && r.lane === 'exec' && window.PDXExecRecord) ? ((window.PDXExecRecord.issue(r.pid, r.key) || {}).actions || []).length : ((r && r.evidence && r.evidence.actions) || 0);",
    expect: /^leaf: (depth|items)/ },
];
const mutFaults = [];
for (const m of MUTANTS) {
  const src = R(m.file);
  if (!src.includes(m.from)) { mutFaults.push(`mutation "${m.name}": anchor not found in ${m.file}`); continue; }
  let res;
  try { res = check(boot({ [m.file]: (s) => s.replace(m.from, m.to) })); }
  catch (e) { res = { faults: [`boot threw: ${e.message}`] }; }
  const caught = res.faults.some((x) => m.expect.test(x));
  console.log(`   mutation: ${m.name} → ${caught ? "caught" : "NOT CAUGHT"}`);
  if (!caught) mutFaults.push(`mutation "${m.name}" survived`);
}

const all = live.faults.concat(mutFaults);
if (all.length) {
  for (const f of all) console.error("  ✗ " + f);
  console.error(`\n✗ restraint all-terms count: ${all.length} failure(s), ${live.pass} passed`);
  process.exit(1);
}
console.log(`\n✓ restraint all-terms count: all ${live.pass} assertions passed, ${MUTANTS.length} mutations caught`);
