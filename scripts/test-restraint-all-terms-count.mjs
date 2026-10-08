#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-restraint-all-terms-count.mjs — all terms is the profile; a term is a filter
// ─────────────────────────────────────────────────────────────────────────────
// The profile row, the stance-tree leaf and the drawer count every term, on every
// issue. On Trump × Diplomacy & Restraint that is 4 actions — the vetoes of S.J.
// Res. 7 and S.J. Res. 68, Executive Order 14353 and Proclamation 11015 — 0
// aligned and 4 against, at 0%. On load that is the only count that prints, and
// no term word rides with it.
//
// The executive record also holds a current-term slice (EO 14353 and Proclamation
// 11015 here; EO 14150 alone on America First, whose whole file is 2). The leaf
// keeps it in its hidden `counts` field. It is not a score and it reaches the
// card, the leaf and the drawer only through the drawer's term control, after the
// reader selects a term. No also-on sentence prints — that cause is not in the code.
//
//   1. PROFILE ROW: 0% · 0 aligned · 4 against · 4 actions on record.
//   2. LEAF: depth "4 actions", 0%, nothing term-scoped printed.
//   3. DRAWER: four rows, "4 measures · 4 formal acts", 0 for · 4 against.
//   4. EVERY EXEC ISSUE, including those whose current term reads differently
//      from the whole file (America First), prints the all-time count and no
//      "this term alone" line on load — face, accessible name or tooltip.
//   5. FILTER: selecting a term lists only that term's rows and names the term;
//      clearing it returns the whole file.
//   6. MUTATIONS: a term count printed on load, and the all-time 4 turned into the
//      current-term 2, must each fail the checks above.
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
const TERM = /this term|current term|\bterm \d+ only\b|\b2 actions?\b|\b2 of 4\b|\bscored · \d+ on file|also-on/i;
// The same, for any issue: a term word that is not the reader's own control.
const TERM_WORD = /this term|current term|term alone|\bterm \d+ only\b|in the current term/i;
// The control may name terms on its buttons; that is the filter, not a count.
const noControl = (h) => String(h || "").replace(/<div class="pdxlg-termf"[\s\S]*?<\/div>/g, "");
// Raw HTML, attributes included, so an aria-label or title cannot carry it either.
const raw = (h) => noControl(h).replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');

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
  const drH = CS.gapViewHtml(PID, RS) || "";
  const dr = text(noControl(drH));
  ok(/On this issue: 4 measures · 4 formal acts/.test(dr), "drawer: first line is not the four-act inventory");
  ok(/Acts: 0 for · 4 against/.test(dr), "drawer: tally is not 0 for · 4 against");
  ok(!TERM.test(dr), `drawer: a term-scoped or second count printed: ${(dr.match(TERM) || [""])[0]}`);

  // ── 4. every exec issue: the all-time count, and no term word, on load ────
  const stH = CS.stancesSectionHtml(PID) || "", treeH = TREE.html(PID) || "";
  ok(!TERM_WORD.test(raw(stH)), `profile on load: a term word printed: ${(raw(stH).match(TERM_WORD) || [""])[0]}`);
  ok(!TERM_WORD.test(raw(treeH)), `leaf on load: a term word printed: ${(raw(treeH).match(TERM_WORD) || [""])[0]}`);
  let differs = 0;
  for (const x of CS.issueRows(PID) || []) {
    if (x.lane !== "exec") continue;
    const a = ((XR.issue(PID, x.key, { allTerms: true }) || {}).actions || []).length;
    const c = ((XR.issue(PID, x.key) || {}).actions || []).length;
    const d = CS.gapViewHtml(PID, x.key) || "";
    ok(!TERM_WORD.test(raw(d)), `drawer ${PID} × ${x.key} on load: a term word printed: ${(raw(d).match(TERM_WORD) || [""])[0]}`);
    const lf2 = TREE.leaf(PID, x.key);
    if (lf2 && lf2.record && lf2.record.items) {
      ok(lf2.record.items === Math.max(a, x.evidence.actions || 0), `leaf ${PID} × ${x.key}: items ${lf2.record.items}, all-time ${a}`);
    }
    if (a && c && c < a) differs++;
  }
  ok(differs > 0, "no Trump issue whose current term differs from the whole file — fixture thinned out");
  // America First: the whole file is 2 (1 for · 1 against), the current term 1.
  {
    const AF = "america_first";
    const ra = CS.issueRow(PID, AF);
    ok(ra && ra.evidence && ra.evidence.actions === 2, `america_first: evidence.actions is ${ra && ra.evidence && ra.evidence.actions}`);
    const seg = slice(text(stH), "America First ›", others.filter((l) => l !== "America First").concat(label));
    ok(/1 aligned · 1 against/.test(seg), "america_first: the row lost its all-time 1 aligned · 1 against");
    ok(/\b2 actions on record\b/.test(seg), "america_first: the row does not say 2 actions on record");
    ok(!/this term alone/.test(seg), "america_first: the row prints a this-term-alone line on load");
  }

  // ── 5. the term control filters only when selected ─────────────────────────
  {
    ok(/data-pdxlg-termf="1"/.test(drH), "filter: the Restraint drawer offers no term control");
    ok(!/data-pdxlg-term-on=/.test(drH), "filter: the Restraint drawer opened with a term selected");
    const cur = String(XR.currentTerm(PID) || "");
    ok(cur === "47", `filter: current term is ${cur}`);
    const curIds = ((XR.issue(PID, RS) || {}).actions || []).map((a) => a.documentId).sort();
    const pick = (term) => CS.dossierLedgerHtml(PID, RS, null, null, { term });
    const idsIn = (h) => ALL.filter((id) => text(h).includes(id)).sort();
    const f47 = pick(cur);
    ok(JSON.stringify(idsIn(f47)) === JSON.stringify(curIds), `filter 47: lists ${idsIn(f47).join(" | ")}`);
    ok(new RegExp(`Term ${cur} only: 2 measures · 2 formal acts of 4 on this issue`).test(text(noControl(f47))),
      "filter 47: the tally does not say which term and how many of the file");
    ok(/Acts: 0 for · 2 against/.test(text(f47)), "filter 47: the side line is not the term's own");
    ok(/data-pdxlg-term-on="47"/.test(f47) && /data-pdxlg-term="47" aria-pressed="true"/.test(f47),
      "filter 47: the control does not show the term as selected");
    const f45 = pick("45");
    ok(JSON.stringify(idsIn(f45)) === JSON.stringify(["S.J. Res. 68 (116th Congress)", "S.J. Res. 7 (116th Congress)"]),
      `filter 45: lists ${idsIn(f45).join(" | ")}`);
    ok(/Term 45 only:/.test(text(f45)), "filter 45: does not name the term");
    const cleared = pick("");
    ok(JSON.stringify(idsIn(cleared)) === JSON.stringify(ALL), `filter cleared: lists ${idsIn(cleared).join(" | ")}`);
    ok(/On this issue: 4 measures · 4 formal acts/.test(text(cleared)) && !/data-pdxlg-term-on=/.test(cleared),
      "filter cleared: the whole file did not come back");
    ok(!TERM.test(text(noControl(cleared))), "filter cleared: a term word stayed behind");
    // A term that is not on file is no filter at all.
    ok(JSON.stringify(idsIn(pick("12"))) === JSON.stringify(ALL), "filter: an unknown term dropped rows");
  }
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
  { name: "this-term-alone clause printed on the profile row on load",
    file: "consistency.js",
    from: "      '<span class=\"pdxst-comp-against\"><b>' + split.against + '</b> against</span>'\n    ];",
    to: "      '<span class=\"pdxst-comp-against\"><b>' + split.against + '</b> against</span>',\n      (r.lane === 'exec' && window.PDXExecRecord ? '<span>this term alone: (' + ((window.PDXExecRecord.issue(r.pid, r.key) || {}).actions || []).length + ' actions)</span>' : '')\n    ];",
    expect: /^(profile|america_first)/ },
  { name: "drawer opens on the current term instead of every term",
    file: "consistency.js",
    from: "want = (want == null) ? '' : String(want);",
    to: "want = want || String((window.PDXExecRecord && window.PDXExecRecord.currentTerm(pid)) || '');",
    expect: /^(drawer|filter)/ },
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
