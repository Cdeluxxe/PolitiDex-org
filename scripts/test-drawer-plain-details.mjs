#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-drawer-plain-details.mjs — an opened Formal record row leads in plain words
// ─────────────────────────────────────────────────────────────────────────────
// Opening "Details" on a ledger row prints, before anything else:
//   1. one plain sentence of what the bill or amendment did on the open issue —
//      no tag labels, no internal issue keys, no emoji chips;
//   2. a "Why this counts as for / against" line in everyday words, whose side is
//      the same side the row's chip and the "Acts: N for · N against" tally count;
// and only after that the technical coding block, labelled as technical detail.
// A multi-issue bill still says the row is only its reading on the open issue.
//
//   SUBJECT: Thomas Massie × Support for Israel (every row), plus a sample sweep.
//   MUTATIONS: the plain block dropped, the side flipped, and the plain block
//   moved below the coding must each fail.
//
//   node scripts/test-drawer-plain-details.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js",
];
const TECH_LABEL = "Technical detail · how this row was coded";
const CODING = /Why it counts here:|How it was linked:|Which way it cut:|Said versus did:|Multi-issue bill:|Not yet explained by a curator|yea_supports|yea_opposes|_policy\b|_support\b/;
const NO_SIDE = new Set(["iran_policy", "ukraine_policy", "yemen_policy", "venezuela_policy"]);
const corpus = buildCorpus(ROOT);

function boot(src) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(f === "consistency.js" ? src : R(f), ctx, { filename: f }); } catch (e) { win.__err = `${f}: ${e.message}`; }
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  return win;
}
const text = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

function check(src, pairs) {
  const faults = [];
  let pass = 0, opened = 0;
  const ok = (c, m) => { if (c) pass++; else if (faults.length < 200) faults.push(m); };
  const win = boot(src);
  if (win.__err) return { faults: [`boot: ${win.__err}`], pass, opened };
  const CS = win.PDXConsistency;
  for (const [pid, key] of pairs) {
    let t = null, items = [];
    try { t = CS.dossierTally(pid, key, CS.issueRow(pid, key).ov); items = CS.dossierItems(pid, key) || []; } catch { t = null; }
    if (!t || !t.rows.length) { ok(false, `${pid} × ${key}: no formal record rows`); continue; }
    let forN = 0, againstN = 0;
    for (const r of t.rows) {
      const where = `${pid} × ${key}: row ${r.i} (${items[r.i] && items[r.i].ident})`;
      const mh = CS.dossierLedgerMoreHtml(pid, key, r.i) || "";
      opened++;
      const pAt = mh.indexOf('data-pdxlg-plain="1"');
      const cAt = mh.indexOf('data-pdxdos-coded="1"');
      ok(pAt >= 0, `${where}: no plain-language summary`);
      if (pAt < 0) continue;
      // 1 · leads, ahead of the title, doors and the coding
      ok(mh.startsWith('<div class="pdxlg-plain" data-pdxlg-plain="1">'), `${where}: the plain summary does not lead the opened row`);
      if (cAt >= 0) ok(pAt < cAt, `${where}: the plain summary sits below the technical notes`);
      const plain = (mh.match(/<div class="pdxlg-plain" data-pdxlg-plain="1">([\s\S]*?)<\/div><\/div>/) || ["", ""])[1];
      const did = text((plain.match(/data-pdxlg-plain-did="1">([\s\S]*?)<\/div>/) || ["", ""])[1]);
      ok(did.length >= 20 && /[.!?…]$/.test(did), `${where}: what-it-did sentence missing or not a sentence: "${did}"`);
      ok(!CODING.test(text(plain)), `${where}: the plain summary carries a tag or code: "${text(plain)}"`);
      ok(!/[\u{1F300}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}]/u.test(text(plain)), `${where}: the plain summary carries an emoji chip`);
      // 2 · the why line, on the tally's side
      const wm = /data-pdxlg-plain-why="(for|against|none)"><b>([^<]*)<\/b>\s*([^<]*)/.exec(plain);
      ok(!!wm, `${where}: no why line`);
      if (!wm) continue;
      // A country subject has no pole: the row prints no chip, so neither does this line.
      const want = NO_SIDE.has(key) ? "none" : r.dir === "advances" ? "for" : r.dir === "opposes" ? "against" : "none";
      ok(wm[1] === want, `${where}: why line says "${wm[1]}" but the tally counts it "${want}"`);
      if (want !== "none") ok(wm[2] === `Why this counts as ${want}:`, `${where}: why heading reads "${wm[2]}"`);
      ok(wm[3].trim().length > 20, `${where}: why line has no explanation`);
      if (wm[1] === "for") forN++; else if (wm[1] === "against") againstN++;
      // 3 · the technical block, labelled as such
      if (cAt >= 0) ok(mh.includes(`<div class="pdxdos-coded-k">${TECH_LABEL}</div>`), `${where}: the coding is not labelled as technical detail`);
      // 4 · multi-issue caveat kept
      const others = ((items[r.i] && items[r.i].item && items[r.i].item.issues) || []).length;
      if (items[r.i] && items[r.i].multi && others >= 2) ok(/This row is only its reading on/.test(text(mh)), `${where}: multi-issue caveat lost`);
    }
    if (!NO_SIDE.has(key)) ok(forN === t.advances && againstN === t.opposes, `${pid} × ${key}: why lines ${forN} for · ${againstN} against, tally ${t.advances} · ${t.opposes}`);
  }
  return { faults, pass, opened };
}

const CONS = R("consistency.js");
const MASSIE = [["massie", "israel_support"]];
const win0 = boot(CONS);
const SWEEP = [];
for (const pid of ["massie", "lee", "trump", "celeste_maloy", "john_curtis", "chellie_pingree"]) {
  try { for (const r of win0.PDXConsistency.issueRows(pid) || []) SWEEP.push([pid, r.key]); } catch { /* skip */ }
}
const live = check(CONS, MASSIE);
// The sweep: only rows with formal acts count.
const sweepPairs = SWEEP.filter(([p, k]) => {
  try { return (win0.PDXConsistency.dossierTally(p, k, win0.PDXConsistency.issueRow(p, k).ov).rows || []).length > 0; } catch { return false; }
});
const sweep = check(CONS, sweepPairs);

// A Massie Israel-support row must read against, with the plain sentence first.
const MUTANTS = [
  { name: "plain summary dropped", edit: (s) => s.replace("    out.push(_dosPlainHtml(d, issueKey));\n", ""), expect: /no plain-language summary/ },
  { name: "side flipped", edit: (s) => s.replace("var side = dir === 'advances' ? 'for' : 'against';", "var side = dir === 'advances' ? 'against' : 'for';"), expect: /but the tally counts it/ },
  { name: "plain summary moved below the coding",
    edit: (s) => s.replace("    out.push(_dosPlainHtml(d, issueKey));\n", "").replace("out.push(_dosCodedHtml(_dosMechanism(d, issueKey, teach, led && !d.held), d, true));", "out.push(_dosCodedHtml(_dosMechanism(d, issueKey, teach, led && !d.held), d, true));\n    out.push(_dosPlainHtml(d, issueKey));"),
    expect: /does not lead|below the technical notes/ },
];
const mutFaults = [];
for (const m of MUTANTS) {
  const src = m.edit(CONS);
  if (src === CONS) { mutFaults.push(`mutation "${m.name}": anchor not found`); continue; }
  const res = check(src, MASSIE);
  const caught = res.faults.some((x) => m.expect.test(x));
  console.log(`   mutation: ${m.name} → ${caught ? "caught" : "NOT CAUGHT"}`);
  if (!caught) mutFaults.push(`mutation "${m.name}" survived`);
}
const faults = [...live.faults, ...sweep.faults, ...mutFaults];
for (const f of faults.slice(0, 40)) console.log("  ✗ " + f);
console.log(`\n   Massie × Support for Israel: ${live.opened} rows opened · sweep: ${sweepPairs.length} issues, ${sweep.opened} rows opened`);
if (faults.length) { console.log(`✗ drawer plain details: ${faults.length} failure(s), ${live.pass + sweep.pass} passed`); process.exit(1); }
console.log(`✓ drawer plain details: all ${live.pass + sweep.pass} assertions passed, ${MUTANTS.length} mutations caught`);
