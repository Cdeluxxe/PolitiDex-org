#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-drawer-record-first.mjs — the issue drawer opens on the record; how a row
// was coded is one tap away, and labelled as coding
// ─────────────────────────────────────────────────────────────────────────────
// The drawer used to print the coding notes — "Why it counts here", "Which way it
// cut", "On record · not in Direction Match" — on the closed face of every row,
// with the bill number the smallest thing on it. The closed row is now the record:
// the bill number, the kind of act, the clerk's word, one chip for which way the
// act cut on this issue, and the one sentence of what it did. Opening a row shows
// the full title, the door to the bill, the other issues the vote sits on and the
// coding, under a label that says it is coding.
//
//   1. CLOSED LEDGER ROWS: every table row carries the bill number as its door,
//      the kind, the clerk's word, one cut-or-support chip (none on a country
//      subject) and, where one is stored, its sentence. No "Also on" chips, no
//      coding sentence and no method word on the closed face.
//   2. CLOSED RECORD ROWS: every record-list <summary> carries the number, the
//      clerk's word or no-side label, one chip, and its sentence where stored, and
//      none of the coding lines or the Direction Match standing.
//   3. OPEN ROWS: the record row's coding lines sit only inside the block labelled
//      as coding; the ledger row's open content carries the full title where one is
//      stored, a door, the other issues, and the same labelled coding block.
//   4. DIRECTION MATCH, ONCE: where the issue is outside Direction Match the sheet
//      says so exactly once, above the list, and no row says it.
//   5. NOT SCORED YET: never printed on a drawer whose acts already cut one way.
//   6. THE PUBLIC-RECORD GAP: on a ledger sheet with nothing on the public side,
//      the empty Say-vs-Do note sits under the list, before the scoring disclosure.
//   7. MUTATIONS: coding back on a closed record row, coding back on a closed
//      ledger row, the coding label dropped, the Direction Match pill back on every
//      row, the chip dropped, and "Not scored yet" restored must each fail.
//
//   node scripts/test-drawer-record-first.mjs

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
const CODED_LABEL = "How this row was coded · not the vote itself";
const CODING = /Why it counts here:|How it was linked:|Which way it cut:|Said versus did:|Multi-issue bill:|Not yet explained by a curator/;
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary carries no|coded|filed as|rationale|weighted)\b/i;
const NOT_DM = /not in Direction Match/i;
const NO_POLE = new Set(["iran_policy", "ukraine_policy", "yemen_policy"]);
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
const before = (h, marker) => { const i = h.indexOf(marker); return i < 0 ? h : h.slice(0, i); };
// Each record-list row: its <summary> and what opens beneath it.
function recRows(h) {
  const out = [];
  const re = /<details class="pdxdos-rec[^"]*"[^>]*data-pdxdos-i="(\d+)"[^>]*>([\s\S]*?)<\/details>/g;
  let m;
  while ((m = re.exec(h))) {
    const inner = m[2], s = inner.indexOf("<summary>"), e = inner.indexOf("</summary>");
    out.push({ i: Number(m[1]), sum: inner.slice(s + 9, e), open: inner.slice(e + 10) });
  }
  return out;
}
// Each ledger table row, with its effect or pointer row.
function lgRows(h) {
  const out = [];
  for (const m of h.matchAll(/<tr data-pdxlg-row="(\d+)">([\s\S]*?)<\/tr>/g)) out.push({ i: Number(m[1]), tr: m[2] });
  return out;
}

function check(src, opts = {}) {
  const faults = [];
  let pass = 0, drawers = 0, ledRows = 0, recN = 0, opened = 0;
  const ok = (c, m) => { if (c) pass++; else if (faults.length < 400) faults.push(m); };
  const win = boot(src);
  if (win.__err) return { faults: [`boot: ${win.__err}`], pass };
  const CS = win.PDXConsistency;
  if (!CS || typeof CS.gapViewHtml !== "function" || typeof CS.dossierLedgerMoreHtml !== "function") {
    return { faults: ["the drawer API (gapViewHtml, dossierLedgerMoreHtml) is not published"], pass };
  }
  let pids = Object.keys(win.CMP_DATA);
  if (opts.pids) pids = pids.filter((p) => opts.pids.includes(p));
  for (const pid of pids) {
    let keys = [];
    try { keys = (CS.issueRows(pid) || []).map((r) => r.key); } catch { continue; }
    if (opts.limit) keys = keys.slice(0, opts.limit);
    for (const key of keys) {
      let h = "", items = [], t = null;
      try { h = CS.gapViewHtml(pid, key) || ""; } catch (e) { ok(false, `${pid} × ${key}: gapViewHtml threw ${e.message}`); continue; }
      try { items = CS.dossierItems(pid, key) || []; } catch { items = []; }
      try { t = CS.dossierTally(pid, key, CS.issueRow(pid, key).ov); } catch { t = null; }
      if (!items.length) continue;
      drawers++;
      const where = `${pid} × ${key}`;
      const ledger = (h.match(/<div class="pdxlg"[\s\S]*?<\/tbody><\/table><\/div><\/div>/) || [""])[0];

      // ── 1 · closed ledger rows ──────────────────────────────────────────────
      for (const r of lgRows(h)) {
        ledRows++;
        const d = items[r.i] || {};
        ok(/class="pdxlg-num[^"]*"/.test(r.tr), `${where}: ledger row ${r.i} has no bill-number door`);
        ok(/class="pdxlg-k"/.test(r.tr), `${where}: ledger row ${r.i} names no kind`);
        ok(/class="pdxlg-v pdxlg-v-[yno]"/.test(r.tr), `${where}: ledger row ${r.i} has no clerk's word`);
        const chips = (r.tr.match(/class="pdxlg-cut /g) || []).length;
        ok(chips === (NO_POLE.has(key) ? 0 : 1), `${where}: ledger row ${r.i} carries ${chips} cut-or-support chips`);
        ok(!/pdxlg-chips|pdxlg-chip\b/.test(r.tr), `${where}: ledger row ${r.i} prints the other issues on its closed face`);
        ok(!CODING.test(text(r.tr)) && !METHOD.test(text(r.tr)), `${where}: ledger row ${r.i} prints the method on its closed face`);
        if (d.effLine) ok(new RegExp(`data-pdxlg-effr="${r.i}"`).test(h), `${where}: ledger row ${r.i} lost its sentence`);
        ok(new RegExp(`<tr class="pdxlg-morer" data-pdxlg-morer="${r.i}" hidden><td colspan="5" class="pdxlg-more" data-pdxlg-more="1"></td></tr>`).test(h),
          `${where}: ledger row ${r.i} is not closed and empty until opened`);
        // ── 3 · the ledger row, opened ────────────────────────────────────────
        if (opts.open === false) continue;
        let mh = "";
        try { mh = CS.dossierLedgerMoreHtml(pid, key, r.i) || ""; } catch (e) { mh = ""; }
        opened++;
        const ttl = String(d.title || "").trim();
        if (ttl && ttl !== d.ident) ok(text(mh).includes(text(ttl)), `${where}: ledger row ${r.i} opens without its full title`);
        ok(/pdxbill-door|pdxbill-page|pdxdoc-ext|data-pdxbill/.test(mh), `${where}: ledger row ${r.i} opens with no door to the bill`);
        const others = ((d.item && d.item.issues) || []).filter((x) => x && x.issueKey && x.issueKey !== key).length;
        if (others) ok(/pdxlg-more-also/.test(mh) && /pdxlg-chip/.test(mh), `${where}: ledger row ${r.i} opens without the other issues the vote sits on`);
        codedOnlyInBlock(mh, `${where}: ledger row ${r.i} (open)`);
      }

      // ── 2, 3 · record rows, closed and open ─────────────────────────────────
      for (const r of recRows(h)) {
        recN++;
        const d = items[r.i] || {};
        const s = text(r.sum);
        ok(/class="pdxdos-rec-id[^"]*"/.test(r.sum), `${where}: record row ${r.i} has no bill number`);
        ok(!/pdxdos-rec-why|pdxdos-coded/.test(r.sum) && !CODING.test(s), `${where}: record row ${r.i} prints the method on its closed face`);
        ok(!METHOD.test(s), `${where}: record row ${r.i} carries a method word on its closed face`);
        ok(!NOT_DM.test(s) && !/pdxdos-rec-led/.test(r.sum), `${where}: record row ${r.i} repeats the Direction Match standing`);
        ok(!/pdxlg-chip/.test(r.sum), `${where}: record row ${r.i} prints the other issues on its closed face`);
        const chip = (r.sum.match(/class="pdxdos-rec-dir"|class="pdxdos-rec-nosl"|pdxdos-rec-vd pdxdos-rec-hold/g) || []).length;
        ok(chip <= 2 && (r.sum.match(/class="pdxdos-rec-dir"/g) || []).length <= 1, `${where}: record row ${r.i} carries more than one direction chip`);
        if (d.effLine) ok(s.includes(text(d.effLine)), `${where}: record row ${r.i} lost its sentence`);
        codedOnlyInBlock(r.open, `${where}: record row ${r.i} (open)`);
      }

      // ── 4 · Direction Match, once ───────────────────────────────────────────
      const tops = (h.match(/data-pdxdos-led="1"/g) || []).length;
      ok(tops <= 1, `${where}: the Direction Match standing is said ${tops} times at the top`);
      if (tops) {
        const at = h.indexOf('data-pdxdos-led="1"');
        const firstList = Math.min(...[h.indexOf('<div class="pdxlg"'), h.indexOf('<details class="pdxdos-recs"')].filter((x) => x >= 0));
        ok(at < firstList, `${where}: the Direction Match standing is not above the list`);
      }
      ok(!/class="pdxdos-led"(?! pdxdos-led-top)/.test(h), `${where}: the Direction Match note is still inside the list`);

      // ── 5 · Not scored yet ──────────────────────────────────────────────────
      if (t && (t.advances + t.opposes) > 0) ok(!/Not scored yet/.test(text(h)), `${where}: "Not scored yet" printed though the record cuts ${t.advances} for, ${t.opposes} against`);

      // ── 6 · the public-record gap under the list ────────────────────────────
      if (ledger && /data-pdxgap-public="empty"/.test(h)) {
        const g = h.indexOf('data-pdxgap-public="empty"'), l = h.indexOf('<div class="pdxlg"'), w = h.indexOf('<details class="pdxgap-how"');
        ok(g > l && (w < 0 || g < w), `${where}: the public-record gap is not directly under the list`);
      }
    }
  }
  function codedOnlyInBlock(open, where) {
    // The block is the last thing in an open row: its label, then its lines.
    const blocks = [...open.matchAll(/<div class="pdxdos-coded" data-pdxdos-coded="1"><div class="pdxdos-coded-k">([^<]*)<\/div>([\s\S]*?)<\/div>(?=<\/div>|$)/g)];
    let rest = open;
    for (const b of blocks) {
      ok(text(b[1]) === CODED_LABEL, `${where}: the coding block is not labelled as coding`);
      rest = rest.replace(b[0], "");
    }
    ok(!CODING.test(text(rest)), `${where}: a coding line sits outside the block labelled as coding`);
    if (CODING.test(text(open))) ok(blocks.length === 1, `${where}: coding lines with ${blocks.length} labelled blocks`);
  }
  return { faults, pass, drawers, ledRows, recN, opened };
}

const CONS = R("consistency.js");
const live = check(CONS);

const SAMPLE = { pids: ["lee", "trump", "chellie_pingree", "blake_moore", "celeste_maloy", "john_curtis"], open: true };
const MUTANTS = [
  { name: "the coding back on a closed record row",
    edit: (s) => s.replace("'<summary>' + head + '</summary>' +", "'<summary>' + head + _dosCodedHtml(m, d) + '</summary>' +"),
    expect: /record row \d+ prints the method on its closed face/ },
  { name: "the coding back on a closed ledger row",
    edit: (s) => s.replace("'<td class=\"pdxlg-c\">' + _dosCutChip(p, issueKey) +", "'<td class=\"pdxlg-c\">' + _dosCutChip(p, issueKey) + esc(_dosWhySentence(d)) + ' Why it counts here: ' +"),
    expect: /ledger row \d+ prints the method on its closed face/ },
  { name: "the coding label dropped",
    edit: (s) => s.replace("var DOS_CODED_LABEL = 'How this row was coded · not the vote itself';", "var DOS_CODED_LABEL = 'What happened';"),
    expect: /not labelled as coding/ },
  { name: "the Direction Match pill back on every row",
    edit: (s) => s.replace("'<span class=\"pdxdos-rec-line\">' +", "'<span class=\"pdxdos-rec-line\">' + (ledRow ? '<span class=\"pdxdos-rec-vd pdxdos-rec-led\">' + esc(_LED.status) + '</span>' : '') +"),
    expect: /repeats the Direction Match standing/ },
  { name: "the cut-or-support chip dropped",
    edit: (s) => s.replace("function _dosCutChip(p, issueKey) {\n    if (_DOS_LEDGER_NO_SIDE[issueKey]) return '';", "function _dosCutChip(p, issueKey) {\n    return '';"),
    expect: /cut-or-support chips/ },
  { name: "\"Not scored yet\" restored on a drawer that names a direction",
    edit: (s) => s.replace("var _hideNS = !!(opts && opts.dirNamed) && res.label === 'Not scored yet';", "var _hideNS = false;"),
    expect: /"Not scored yet" printed/ },
];
const mutFaults = [];
for (const m of MUTANTS) {
  const src = m.edit(CONS);
  if (src === CONS) { mutFaults.push(`mutation "${m.name}": anchor not found`); continue; }
  const res = check(src, SAMPLE);
  const caught = res.faults.some((x) => m.expect.test(x));
  console.log(`   mutation: ${m.name} → ${caught ? "caught" : "NOT CAUGHT"}`);
  if (!caught) mutFaults.push(`mutation "${m.name}" survived`);
}

const all = live.faults.concat(mutFaults);
if (live.drawers < 1000) all.push(`only ${live.drawers} drawers swept — the corpus did not reach the engine`);
if (all.length) {
  for (const f of all.slice(0, 40)) console.error("  ✗ " + f);
  if (all.length > 40) console.error(`  … and ${all.length - 40} more`);
  console.error(`\n✗ drawer record-first: ${all.length} failure(s), ${live.pass} passed`);
  process.exit(1);
}
console.log(`\n   ${live.drawers} drawers · ${live.ledRows} ledger rows (${live.opened} opened) · ${live.recN} record rows`);
console.log(`✓ drawer record-first: all ${live.pass} assertions passed, ${MUTANTS.length} mutations caught`);
