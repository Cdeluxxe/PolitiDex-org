#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// THE DRAWER EYEBROW FOLLOWS THE TALLY
// ─────────────────────────────────────────────────────────────────────────────
// The line under the issue title in the drawer (_dosFinding) is the one owner of
// that sentence. It printed "Too thin to call a pattern — the record went both
// ways" over Trump's Iran file, whose key is a subject with no side, and over
// Schiff's Diplomacy & Restraint file, which is 7 for and 1 against. Neither is a
// split. The rules, in order:
//
//   1. A key in _RD_NO_POLE / _DOS_LEDGER_NO_SIDE says "No side published on this
//      subject" — never "both ways", never a percentage, never a verdict word.
//   2. A lopsided tally (≥3 on one side, ≤1 on the other) runs one way — never
//      "both ways", never "too thin".
//   3. Only a genuine split or a file below the floor keeps the thin/split copy.
//
// Plus a mutation pass: the renderer with rule 1 or rule 2 removed must fail the
// same checks, so the harness is proven to catch the old sentence.
//
//   node scripts/test-drawer-eyebrow.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// Same load order as test-issue-ledger.mjs.
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js",
];

const corpus = buildCorpus(ROOT);

function boot(get) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(get(f), ctx, { filename: f }); } catch (e) { win.__err = `${f}: ${e.message}`; }
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  return win;
}

const text = (html) =>
  String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const findLine = (h) => {
  const m = String(h).match(/<div class="pdxlg-find"[\s\S]*?<\/div>/);
  return m ? text(m[0]) : "";
};

const NO_SIDE = "No side published on this subject";
const BOTH = /both ways|both directions|two ways/;
const THIN = "Too thin to call a pattern";
const lopsided = (t) => Math.max(t.advances, t.opposes) >= 3 && Math.min(t.advances, t.opposes) <= 1;

// Every check returns a list of faults, so the mutation pass can run the same
// checks against a broken renderer and demand that they fire.
function check(win) {
  const CS = win.PDXConsistency;
  const faults = [];
  let pass = 0;
  const ok = (c, m) => { if (c) pass++; else faults.push(m); };
  if (!CS || typeof CS.dossierFinding !== "function") return { faults: ["dossierFinding not exported"], pass, stats: {} };
  if (win.__err) return { faults: [`boot: ${win.__err}`], pass, stats: {} };
  const NP = win._PDX_RD_NO_POLE || {};
  ok(NP.iran_policy && NP.ukraine_policy && NP.yemen_policy, "the three country keys left _RD_NO_POLE");

  const drawerFind = (pid, k) => findLine(CS.gapViewHtml(pid, k) || "");

  // ── Trump × Iran: the no-side sentence, and no "both ways" ────────────────
  {
    const r = CS.issueRow("trump", "iran_policy");
    const t = CS.dossierTally("trump", "iran_policy", r && r.ov);
    ok(t && t.acts > 0, "trump × iran_policy: no acts in the drawer");
    const f = CS.dossierFinding(r, t);
    ok(f.word === NO_SIDE, `trump × iran_policy: eyebrow word is ${JSON.stringify(f.word)}`);
    ok(!BOTH.test(f.q), `trump × iran_policy: eyebrow says ${JSON.stringify(f.q)}`);
    const l = drawerFind("trump", "iran_policy");
    ok(l.includes(NO_SIDE), `trump × iran_policy: rendered eyebrow is ${JSON.stringify(l)}`);
    ok(!BOTH.test(l) && !/%/.test(l) && !/Aligns|Cuts against/.test(l),
      `trump × iran_policy: rendered eyebrow reads a side: ${JSON.stringify(l)}`);
  }

  // ── Schiff × Diplomacy & Restraint: lopsided, never "both ways" ────────────
  {
    const r = CS.issueRow("schiff", "restraint");
    const t = CS.dossierTally("schiff", "restraint", r && r.ov);
    ok(t && lopsided(t) && t.advances > 0 && t.opposes > 0,
      `schiff × restraint: fixture is no longer a lopsided both-sided tally (${t && t.advances}–${t && t.opposes})`);
    const l = drawerFind("schiff", "restraint");
    ok(l && !BOTH.test(l), `schiff × restraint: ${t.advances}–${t.opposes} eyebrow says ${JSON.stringify(l)}`);
    ok(!l.includes(THIN), `schiff × restraint: ${t.advances}–${t.opposes} eyebrow is called thin: ${JSON.stringify(l)}`);
  }

  // ── The whole archive, rule by rule ───────────────────────────────────────
  const stats = { noSide: 0, oneWay: 0, split: 0, thin: 0 };
  let splitSample = null, belowFloorSample = null;
  for (const pid of Object.keys(win.CMP_DATA)) {
    let rows = [];
    try { rows = CS.issueRows(pid) || []; } catch { continue; }
    for (const r of rows) {
      const t = CS.dossierTally(pid, r.key, r.ov);
      if (!t || !t.acts) continue;
      const f = CS.dossierFinding(r, t);
      const where = `${pid} × ${r.key} (${t.advances}–${t.opposes})`;
      if (NP[r.key]) {
        stats.noSide++;
        ok(f.word === NO_SIDE, `${where}: subject key eyebrow is ${JSON.stringify(f.word)}`);
        ok(!BOTH.test(f.q), `${where}: subject key says ${JSON.stringify(f.q)}`);
      } else if (lopsided(t)) {
        stats.oneWay++;
        ok(!BOTH.test(f.q), `${where}: lopsided tally says ${JSON.stringify(f.q)}`);
        ok(f.word !== THIN, `${where}: lopsided tally is called too thin`);
      } else {
        if (BOTH.test(f.q)) { stats.split++; if (!splitSample && t.advances === t.opposes) splitSample = { pid, key: r.key, t, f }; }
        if (f.word === THIN) { stats.thin++; if (!belowFloorSample && t.advances + t.opposes < 4) belowFloorSample = { pid, key: r.key, t, f }; }
        // A "both ways" line only ever sits over a tally that has both sides.
        if (BOTH.test(f.q)) ok(t.advances > 0 && t.opposes > 0, `${where}: both ways over a one-sided tally`);
      }
    }
  }

  // ── A real split and a below-floor file keep the thin/split copy ──────────
  ok(!!splitSample, "no even-split drawer in the archive still says both ways");
  if (splitSample) {
    const l = drawerFind(splitSample.pid, splitSample.key);
    ok(BOTH.test(l), `${splitSample.pid} × ${splitSample.key} (${splitSample.t.advances}–${splitSample.t.opposes}): split eyebrow lost its copy: ${JSON.stringify(l)}`);
  }
  ok(!!belowFloorSample, "no below-floor drawer in the archive is still called too thin");
  // A named below-floor fixture: Lee on lands, 0–2.
  {
    const r = CS.issueRow("lee", "lands_preserve");
    const t = CS.dossierTally("lee", "lands_preserve", r && r.ov);
    const f = CS.dossierFinding(r, t);
    ok(t.advances + t.opposes < 4 && f.word === THIN,
      `lee × lands_preserve (${t.advances}–${t.opposes}): below-floor file is not called thin (${JSON.stringify(f.word)})`);
  }
  ok(stats.noSide > 0 && stats.oneWay > 100 && stats.split > 100,
    `population thinned out: ${JSON.stringify(stats)}`);
  return { faults, pass, stats, splitSample };
}

// ── The shipped renderer ─────────────────────────────────────────────────────
const live = check(boot(R));
console.log(`   eyebrow rules over the archive: ${JSON.stringify(live.stats)}`);
if (live.splitSample) {
  const s = live.splitSample;
  console.log(`   split sample: ${s.pid} × ${s.key} ${s.t.advances}–${s.t.opposes} → "${s.f.word} — ${s.f.q}"`);
}

// ── Mutations: each must make the checks above fail ──────────────────────────
const CONS = R("consistency.js");
const MUTANTS = [
  { name: "old split sentence forced onto iran_policy (no-side rule removed)",
    from: "if (_dosNoSideKey(r && r.key)) {", to: "if (false) {",
    expect: /trump × iran_policy/ },
  { name: "lopsided rule removed",
    from: "if (_dosLopsided(t)) {", to: "if (false) {",
    expect: /schiff × restraint/ },
];
const mutFaults = [];
for (const m of MUTANTS) {
  if (!CONS.includes(m.from)) { mutFaults.push(`mutation "${m.name}": anchor not found in consistency.js`); continue; }
  const src = CONS.replace(m.from, m.to);
  const res = check(boot((f) => (f === "consistency.js" ? src : R(f))));
  const caught = res.faults.some((x) => m.expect.test(x));
  console.log(`   mutation: ${m.name} → ${caught ? "caught" : "NOT CAUGHT"} (${res.faults.length} fault(s))`);
  if (!caught) mutFaults.push(`mutation "${m.name}" survived`);
}

const all = live.faults.concat(mutFaults);
if (all.length) {
  for (const f of all.slice(0, 40)) console.error("  ✗ " + f);
  if (all.length > 40) console.error(`  … and ${all.length - 40} more`);
  console.error(`\n✗ drawer eyebrow: ${all.length} failure(s), ${live.pass} passed`);
  process.exit(1);
}
console.log(`\n✓ drawer eyebrow: all ${live.pass} assertions passed, ${MUTANTS.length} mutations caught`);
