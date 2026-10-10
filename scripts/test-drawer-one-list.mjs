#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-drawer-one-list.mjs — one list in the issue drawer, and the empty
// public-record note does not split it
// ─────────────────────────────────────────────────────────────────────────────
// A drawer with formal acts on file used to print them twice: the vote table at
// the top, then the same bills again as a second list further down, with the
// empty Say-vs-Do note expanded between them. The table is now the list. Under it
// the empty note is one closed line, "No public-record item on file for this
// issue."; under that, "How this is scored" stays a closed disclosure.
//
//   1. ONE LIST: on every drawer with a vote table, each act appears once — one
//      table row per act, no second record list, and no bill-number door outside
//      the table on the closed sheet.
//   2. THE EMPTY NOTE: where the public side is empty it is a closed <details>
//      whose summary is exactly the one line; opening it shows the gap (the
//      coverage explanation). On a vote-table sheet it sits under the list and
//      above "How this is scored".
//   3. HOW THIS IS SCORED: closed when the drawer opens, under the note.
//   4. NO CODING ON THE CLOSED SHEET: nothing between the top of the sheet and the
//      scoring disclosure carries a coding line, except inside a closed row.
//   5. NO VOTES, STILL THE NOTE: a drawer with no vote table still prints the empty
//      note as the same closed line.
//   6. MUTATIONS: the second list restored, the note opened by default, the note's
//      line reworded, the note moved back between the lists, and the disclosure
//      opened by default must each fail.
//
//   node scripts/test-drawer-one-list.mjs

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
const LINE = "No public-record item on file for this issue.";
const CODING = /Why it counts here:|How it was linked:|Which way it cut:|Said versus did:|Method notes/;
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
  .replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
// The empty note: its opening tag, its summary, and what opens beneath it.
function noteOf(h) {
  const a = h.search(/<(details|div) class="pdxgap-solo"[^>]*data-pdxgap-public="empty"/);
  if (a < 0) return null;
  const tag = h.slice(a, h.indexOf(">", a) + 1);
  const close = tag.startsWith("<details") ? "</details>" : "</div>";
  // The note holds no nested <details>, so its first close is its own.
  const end = h.indexOf(close, a);
  const body = h.slice(a, end + close.length);
  const sm = /<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*)$/.exec(body);
  return { at: a, tag, body, summary: sm ? text(sm[1]) : null, rest: sm ? sm[2] : "" };
}

function check(src, opts = {}) {
  const faults = [];
  let pass = 0, withTable = 0, withoutTable = 0, notes = 0;
  const ok = (c, m) => { if (c) pass++; else if (faults.length < 300) faults.push(m); };
  const win = boot(src);
  if (win.__err) return { faults: [`boot: ${win.__err}`], pass };
  const CS = win.PDXConsistency;
  let pids = Object.keys(win.CMP_DATA);
  if (opts.pids) pids = pids.filter((p) => opts.pids.includes(p));
  for (const pid of pids) {
    let keys = [];
    try { keys = (CS.issueRows(pid) || []).map((r) => r.key); } catch { continue; }
    for (const key of keys) {
      let h = "";
      try { h = CS.gapViewHtml(pid, key) || ""; } catch (e) { ok(false, `${pid} × ${key}: gapViewHtml threw ${e.message}`); continue; }
      if (!h) continue;
      const where = `${pid} × ${key}`;
      const hasTable = /<table class="pdxlg-t"/.test(h);
      const how = h.indexOf('<details class="pdxgap-how"');
      const note = noteOf(h);

      // ── 2, 5 · the empty note ───────────────────────────────────────────────
      if (note) {
        notes++;
        ok(note.tag.startsWith("<details") && !/\bopen\b/.test(note.tag), `${where}: the empty public-record note is not a closed disclosure`);
        ok(note.summary !== null && note.summary.replace(/^🧾\s*/, "") === LINE, `${where}: the empty note's closed line is not "${LINE}" — got ${JSON.stringify(note.summary)}`);
        ok(/Curated public-record evidence/.test(text(note.rest)) && /gap in our coverage/.test(text(note.rest)), `${where}: opening the empty note does not show the gap`);
      }

      if (!hasTable) {
        withoutTable++;
        continue;
      }
      withTable++;
      // ── 1 · one list ────────────────────────────────────────────────────────
      ok(!/<details class="pdxdos-recs"/.test(h), `${where}: a second copy of the vote list is on the sheet`);
      const rows = [...h.matchAll(/<tr data-pdxlg-row="(\d+)">/g)].map((m) => m[1]);
      ok(new Set(rows).size === rows.length, `${where}: an act appears twice in the table`);
      const closed = how < 0 ? h : h.slice(0, how);
      const tbl = (closed.match(/<div class="pdxgap-list"[\s\S]*?<\/tbody><\/table><\/div><\/div>/) || [""])[0];
      const outside = closed.replace(tbl, "");
      ok(!/class="pdxdos-rec-id|class="pdxlg-num/.test(outside), `${where}: a bill row is printed outside the one list on the closed sheet`);
      // ── 2, 3 · order: list, then note, then the disclosure ─────────────────
      const listAt = h.indexOf('<div class="pdxgap-list"');
      ok(listAt >= 0, `${where}: the vote table is not the sheet's list`);
      if (note) ok(note.at > listAt && (how < 0 || note.at < how), `${where}: the empty note does not sit under the list and above "How this is scored"`);
      ok(how > listAt, `${where}: "How this is scored" is not under the list`);
      ok(!/<details class="pdxgap-how"[^>]*\bopen\b/.test(h), `${where}: "How this is scored" is open on open`);
      // ── 4 · nothing about coding on the closed sheet ────────────────────────
      const noRows = closed.replace(/<tr class="pdxlg-morer"[\s\S]*?<\/tr>/g, "");
      const shown = note ? noRows.replace(note.rest, "") : noRows;
      ok(!CODING.test(text(shown)), `${where}: a coding line is on the closed sheet`);
    }
  }
  return { faults, pass, withTable, withoutTable, notes };
}

const CONS = R("consistency.js");
const live = check(CONS);

const SAMPLE = { pids: ["lee", "trump", "chellie_pingree", "blake_moore", "celeste_maloy", "john_curtis", "massie"] };
const MUTANTS = [
  { name: "the second copy of the vote list restored",
    edit: (s) => s.replace("(_lgOn ? '' : _dosRecordsHtml(pid, issueKey, _dosRow, off)) +", "_dosRecordsHtml(pid, issueKey, _dosRow, off) +"),
    expect: /second copy of the vote list/ },
  { name: "the empty note opened by default",
    edit: (s) => s.replace("'<details class=\"pdxgap-solo\" data-pdxgap-public=\"empty\">' +", "'<details class=\"pdxgap-solo\" data-pdxgap-public=\"empty\" open>' +"),
    expect: /not a closed disclosure/ },
  { name: "the empty note expanded back into a heading and paragraphs",
    edit: (s) => s.replace("'<details class=\"pdxgap-solo\" data-pdxgap-public=\"empty\">' +", "'<div class=\"pdxgap-solo\" data-pdxgap-public=\"empty\">' +").replace("_sdGapHtml(pid, issueKey) +\n        '</details>';", "_sdGapHtml(pid, issueKey) +\n        '</div>';"),
    expect: /not a closed disclosure/ },
  { name: "the closed line reworded",
    edit: (s) => s.replace("var _GAP_SOLO_LINE = 'No public-record item on file for this issue.';", "var _GAP_SOLO_LINE = 'Say-vs-Do — nothing on file for this issue yet';"),
    expect: /closed line is not/ },
  { name: "the note moved back between the list and a second list",
    edit: (s) => s.replace("(_lgOn ? '' : _dosRecordsHtml(pid, issueKey, _dosRow, off)) +", "_dosRecordsHtml(pid, issueKey, _dosRow, off) +")
      .replace("_dosVrLinkHtml(pid, issueKey, off) + '</div>' + _dosSaidHtml(_dosRow) + _gapUnder : '') +", "_dosVrLinkHtml(pid, issueKey, off) + '</div>' + _dosSaidHtml(_dosRow) : '') +"),
    expect: /second copy of the vote list|does not sit under the list/ },
  { name: "\"How this is scored\" opened by default",
    edit: (s) => s.replace("'<details class=\"pdxgap-how\" data-pdxgap-how=\"1\">' +", "'<details class=\"pdxgap-how\" data-pdxgap-how=\"1\" open>' +"),
    expect: /is open on open/ },
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
if (live.withTable < 1000) all.push(`only ${live.withTable} drawers with a vote table — the corpus did not reach the engine`);
if (live.withoutTable < 1) all.push("no drawer without a vote table was swept — the no-votes case is vacuous");
if (all.length) {
  for (const f of all.slice(0, 40)) console.error("  ✗ " + f);
  if (all.length > 40) console.error(`  … and ${all.length - 40} more`);
  console.error(`\n✗ drawer one list: ${all.length} failure(s), ${live.pass} passed`);
  process.exit(1);
}
console.log(`\n   ${live.withTable} drawers with a vote table · ${live.withoutTable} without · ${live.notes} empty public-record notes, every one a closed line`);
console.log(`✓ drawer one list: all ${live.pass} assertions passed, ${MUTANTS.length} mutations caught`);
