#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-drawer-formal-tally.mjs — Formal record first, with a for / against tally
// ─────────────────────────────────────────────────────────────────────────────
// On every issue drawer with formal acts:
//   · the Formal record section sits above Related issues, Where this
//     conflicts, Words and votes and Evidence;
//   · the large green / red tally sits at the top of that section, directly
//     under the "On this issue: N measures · M formal acts" line and above the
//     smaller "Acts: X for · Y against" line, and prints the same two numbers;
//   · the tally uses the Advances / Cuts against chip colours.
//
//   node scripts/test-drawer-formal-tally.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };

const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "issue-map.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js", "issue-colors.js",
  "related-issues.js", "share-anywhere.js",
];
const corpus = buildCorpus(ROOT);
const win = makeSandbox();
const ctx = vm.createContext(win);
win.PROFILES = win.CMP_DATA;
for (const f of FILES) {
  try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { failures.push(`boot ${f}: ${e.message}`); }
}
win.PROFILES = win.CMP_DATA;
for (const [pid, recs] of corpus.byMember) {
  try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member */ }
}
const CS = win.PDXConsistency;

const REC = 'data-pdxgap-sec="record"';
const BELOW = {
  related: 'class="pdxri pdxri-drawer"',
  conflicts: 'class="pdxri-conflicts"',
  wva: 'class="pdxri-wva"',
  evidence: 'data-pdxgap-sec="evidence"',
};
const SAMPLE = ["lee", "schiff", "trump", "warren", "cruz", "romney", "ocasio_cortez", "sanders", "mcconnell", "massie"];
let sheets = 0, withRel = 0, withEv = 0, withBig = 0;
for (const pid of SAMPLE) {
  if (!win.CMP_DATA[pid]) continue;
  for (const r of CS.issueRows(pid) || []) {
    const h = CS.gapViewHtml(pid, r.key) || "";
    const tally = h.indexOf('data-pdxlg-tally="1"');
    if (tally < 0) continue; // no formal acts → not this suite's subject
    sheets++;
    const tag = `${pid} × ${r.key}`;
    const rec = h.indexOf(REC);
    ok(rec >= 0, `${tag}: no Formal record section`);
    for (const [k, m] of Object.entries(BELOW)) {
      const i = h.indexOf(m);
      if (i < 0) continue;
      if (k === "related") withRel++;
      if (k === "evidence") withEv++;
      ok(i > rec, `${tag}: ${k} sits above the Formal record`);
    }
    const side = /<div class="pdxlg-side"[^>]*>Acts: (\d+) for · (\d+) against/.exec(h);
    const bigAt = h.indexOf('<div class="pdxlg-big"');
    if (!side) { ok(bigAt < 0, `${tag}: big tally printed on an issue with no for / against line`); continue; }
    withBig++;
    ok(bigAt > rec, `${tag}: the big tally is not inside the Formal record`);
    ok(bigAt > tally && bigAt < side.index, `${tag}: the big tally is not between the "On this issue" line and the "Acts" line`);
    const tallyEnd = h.indexOf("</div>", tally) + 6;
    ok(tallyEnd === bigAt, `${tag}: the big tally does not sit immediately under the "On this issue" line`);
    const f = /data-pdxlg-big-for="(\d+)"><b>(\d+)<\/b>/.exec(h), a = /data-pdxlg-big-against="(\d+)"><b>(\d+)<\/b>/.exec(h);
    ok(f && f[1] === side[1] && f[2] === side[1], `${tag}: big "for" ${f && f[2]} ≠ Acts line ${side[1]}`);
    ok(a && a[1] === side[2] && a[2] === side[2], `${tag}: big "against" ${a && a[2]} ≠ Acts line ${side[2]}`);
    ok(h.indexOf('<div class="pdxlg-big"', bigAt + 1) < 0, `${tag}: big tally printed twice`);
  }
}
ok(sheets > 50, `only ${sheets} drawers with formal acts sampled`);
ok(withRel > 10, `only ${withRel} drawers with Related issues sampled`);
ok(withEv > 0, `no drawer with Evidence sampled`);
ok(withBig > 50, `only ${withBig} drawers with the big tally`);

// Colours: the same green and red as the Advances / Cuts against chips.
const SRC = R("consistency.js");
const chipA = /'\.pdxlg-cut-a\{color:(#[0-9a-f]+);/.exec(SRC), chipO = /'\.pdxlg-cut-o\{color:(#[0-9a-f]+);/.exec(SRC);
const bigA = /'\.pdxlg-big-a\{color:(#[0-9a-f]+);/.exec(SRC), bigO = /'\.pdxlg-big-o\{color:(#[0-9a-f]+);/.exec(SRC);
ok(chipA && bigA && chipA[1] === bigA[1], "big 'for' is not the Advances chip green");
ok(chipO && bigO && chipO[1] === bigO[1], "big 'against' is not the Cuts against chip red");
const bigNum = /'\.pdxlg-big b\{font-size:([\d.]+)rem/.exec(SRC), sideSz = /'\.pdxlg-side\{font-size:([\d.]+)rem/.exec(SRC);
ok(bigNum && sideSz && +bigNum[1] > +sideSz[1] * 2, "big tally numbers are not markedly larger than the Acts line");

console.log(`   ${sheets} drawers with formal acts · ${withBig} with the big tally · ${withRel} with Related issues · ${withEv} with Evidence`);
if (failures.length) {
  console.log(`✗ drawer formal tally: ${failures.length} failure(s), ${passed} passed`);
  failures.slice(0, 30).forEach((f) => console.log("  - " + f));
  process.exit(1);
}
console.log(`✓ drawer formal tally: ${passed} checks passed`);
