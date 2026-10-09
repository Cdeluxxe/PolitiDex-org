#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-israel-effect-lines.mjs — one sentence under each vote on Support for Israel
// ─────────────────────────────────────────────────────────────────────────────
// Support for Israel (israel_support). Each member-voted act on that leaf whose
// pair stores a `did` carries one line saying what it did to the leaf, stored
// once on the measure-and-issue pair in _DOS_EFFECT, so it shows for every member
// who voted on it. Every member-voted pair on this leaf stores a `did`, so every
// row carries a line; the one database-only pair (S.B. 97 of Utah's 2023 general
// session) stores none and stays blank.
//
//   1. THE LINE RULE: one sentence, 140 characters or fewer, ends on its stop,
//      no method words, no "PolitiDex", no ellipsis, never the measure's title,
//      and it names Israel.
//   2. NOT BORROWED: a line is never another leaf's line for the same act.
//   3. TENSE: an act with no public law on file opens "Would" or "Proposed" and
//      never claims it took effect; an enacted one does not open that way.
//   4. RENDERED, ROW BY ROW, for every member file: a row with a stored line
//      prints that line and no other; a row with nothing stored prints no extra
//      paragraph.
//   5. NOTHING SHIPPED WAS REWRITTEN: every line in HEAD's _DOS_EFFECT is
//      unchanged, _DOS_EXEC_EFFECT (Trump's lines) is byte-identical, and every
//      Support for Israel row that printed a line at HEAD prints it now.
//   6. COVERAGE: every member-voted pair on the leaf prints a line; the
//      database-only pair with no `did` has none.
//   7. MUTATIONS: a title fallback, a title stored as a line, a borrowed line, a
//      failed act written as done, an over-long line, a method word, an edited
//      Trump line and a rewritten shipped row must each fail.
//
//   node scripts/test-israel-effect-lines.mjs

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";
import { measureAddresses } from "./vr-measure-addresses.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js",
];
const KEYS = ["israel_support"];
const NAMES = { israel_support: /\bIsrael/ };
// The acts the archive records as law: a public law on the curated identity row.
const ENACTED = new Set();
for (const m of JSON.parse(R("db/vr-measure-identity.json")).measures || []) {
  if (m && (m.laws || []).length) ENACTED.add(`${String(m.number).trim()}|${m.congress}`);
}
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary|coded|coding|chip|mapped|mapping|filed as|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger)\b|PolitiDex|…|\.\.\./i;

const corpus = buildCorpus(ROOT);
const headSrc = (() => {
  try { return execFileSync("git", ["show", "HEAD:consistency.js"], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 }); }
  catch { return null; }
})();

function mapOf(src, name) {
  const at = src.indexOf(`var ${name} = {`);
  if (at < 0) return null;
  const end = src.indexOf("\n  };", at);
  return { text: src.slice(at, end + 4), map: vm.runInNewContext("(" + src.slice(at + `var ${name} = `.length, end + 4) + ")") };
}

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

const dec = (h) => String(h || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

// The titles a line must never be: every printed title the site holds for a measure.
const TITLES = (() => {
  const out = new Map();
  const add = (n, t) => { if (!n || !t) return; const k = String(n).trim(); if (!out.has(k)) out.set(k, new Set()); out.get(k).add(String(t).trim().replace(/[.!?]$/, "").toLowerCase()); };
  for (const m of R("bills-index.js").matchAll(/number:\s*'([^']+)',\s*title:\s*'([^']*)'(?:,\s*shortTitle:\s*'([^']*)')?/g)) { add(m[1], m[2]); add(m[1], m[3]); }
  return out;
})();

// The drawer's own row rule (_dosEffectOk), so a pair's short `did` — the line
// it already prints with nothing in _DOS_EFFECT — is the line it is held to.
const rowRule = (raw) => {
  const s = String(raw == null ? "" : raw).replace(/\s+/g, " ").trim();
  if (!s || s.length > 140 || !/[.!?]$/.test(s)) return "";
  if (/[.!?]\s+["\u201c(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "";
  return s;
};

// The pairs only the applied migrations map on this leaf — they reach a drawer
// through the live record, not the shipped seed.
const DB_PAIRS = [];
for (const a of measureAddresses(ROOT).published) {
  if ((a.issueKeys || []).includes("israel_support")) DB_PAIRS.push(`${a.number}|${a.sitting}|israel_support`);
}

function check(src, base) {
  const faults = [];
  const printed = new Map();
  let pass = 0;
  const ok = (c, m) => { if (c) pass++; else faults.push(m); };
  const E = mapOf(src, "_DOS_EFFECT"), X = mapOf(src, "_DOS_EXEC_EFFECT");
  if (!E || !X) return { faults: ["effect maps not found in consistency.js"], pass };
  const win = boot(src);
  if (win.__err) return { faults: [`boot: ${win.__err}`], pass };
  const CS = win.PDXConsistency;
  const M = mapOf(src, "_DOS_MECH");
  const didOf = (p) => (M && M.map[p] && M.map[p].did) || "";

  // Titles seen on the rows themselves, too.
  const rowTitles = new Map();
  const seenPairs = new Set();

  // ── 3 · rendered, row by row ─────────────────────────────────────────────
  for (const pid of Object.keys(win.CMP_DATA)) {
    for (const k of KEYS) {
      let items = [], html = "";
      try { items = CS.dossierItems(pid, k) || []; } catch { continue; }
      if (!items.length) continue;
      try { html = CS.dossierLedgerHtml(pid, k) || ""; } catch { html = ""; }
      const effs = new Map();
      for (const m of html.matchAll(/<tr class="pdxlg-effr" data-pdxlg-effr="(\d+)">([\s\S]*?)<\/tr>/g)) {
        const i = Number(m[1]);
        effs.set(i, (effs.get(i) || []).concat(dec(m[2])));
      }
      const rows = [...html.matchAll(/<tr data-pdxlg-row="(\d+)">/g)].map((m) => Number(m[1]));
      for (const i of rows) {
        const d = items[i], it = (d && d.item) || {};
        const got = effs.get(i) || [];
        ok(got.length <= 1, `${pid} × ${k}: row ${d && d.ident} prints ${got.length} effect paragraphs`);
        let pair, want;
        if (d && d.lane === "exec") {
          pair = `${String(it.documentId || "").trim()}|${k}`; want = X.map[pair] || "";
        } else {
          pair = `${String(it.number == null ? "" : it.number).trim()}|${it.congress}|${k}`; want = E.map[pair] || rowRule(didOf(pair));
          seenPairs.add(pair);
          for (const t of [it.title, it.shortTitle]) if (t) { if (!rowTitles.has(it.number)) rowTitles.set(it.number, new Set()); rowTitles.get(it.number).add(String(t).trim().replace(/[.!?]$/, "").toLowerCase()); }
        }
        if (got.length) printed.set(`${pid}|${pair}`, got[0]);
        if (want) ok(got.length === 1 && got[0] === want, `${pid} × ${k}: ${pair} prints ${JSON.stringify(got)}, stored ${JSON.stringify(want)}`);
        else ok(got.length === 0, `${pid} × ${k}: ${pair} has nothing stored but prints ${JSON.stringify(got[0])}`);
      }
    }
  }

  // ── 1, 2 & 3 · the line rule, no borrowing, and tense, for every line here ─
  const lines = [];
  for (const [p, v] of Object.entries(E.map)) { const m = /^(.*)\|(\d+)\|([a-z_]+)$/.exec(p); if (m) lines.push({ pair: p, act: `${m[1]}|${m[2]}`, num: m[1], key: m[3], v, map: "E" }); }
  for (const [p, v] of Object.entries(X.map)) { const m = /^(.*)\|([a-z_]+)$/.exec(p); if (m) lines.push({ pair: p, act: m[1], num: m[1], key: m[2], v, map: "X" }); }
  for (const L of lines.filter((x) => KEYS.includes(x.key))) {
    const s = String(L.v);
    ok(s.length <= 140, `${L.pair}: ${s.length} characters`);
    ok(/[.!?]$/.test(s), `${L.pair}: does not end on a stop`);
    ok(!/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US")), `${L.pair}: more than one sentence`);
    ok(!METHOD.test(s), `${L.pair}: method word: ${(s.match(METHOD) || [""])[0]}`);
    // Trump's executive lines shipped as written and are held byte-identical in
    // section 4, so the leaf-name rule binds the member lines this pass wrote.
    if (L.map === "E") ok(NAMES[L.key].test(s), `${L.pair}: does not name its leaf`);
    if (L.map === "E") {
      const would = /^(?:Would|Proposed)\b/.test(s);
      if (!ENACTED.has(L.act)) ok(would, `${L.pair}: an act that never became law is written as though it took effect`);
      else ok(!would, `${L.pair}: an enacted act is written as though it did not take effect`);
    }
    const t = s.replace(/[.!?]$/, "").toLowerCase();
    const titles = new Set([...(TITLES.get(L.num) || []), ...(rowTitles.get(L.num) || [])]);
    ok(!titles.has(t), `${L.pair}: the line is the measure's title`);
    for (const o of lines) {
      if (o === L || o.act !== L.act || o.key === L.key) continue;
      ok(o.v !== L.v, `${L.pair}: the line is borrowed from ${o.pair}`);
    }
  }

  // ── 4 · nothing shipped was rewritten ─────────────────────────────────────
  if (headSrc) {
    const HE = mapOf(headSrc, "_DOS_EFFECT"), HX = mapOf(headSrc, "_DOS_EXEC_EFFECT");
    for (const [p, v] of Object.entries(HE.map)) ok(E.map[p] === v, `${p}: a shipped line was rewritten or removed`);
    ok(X.text === HX.text, "_DOS_EXEC_EFFECT (Trump's lines) is not byte-identical to HEAD");
    if (base) {
      for (const [r, v] of base) ok(printed.get(r) === v, `${r}: printed ${JSON.stringify(v)} at HEAD and now prints ${JSON.stringify(printed.get(r) || "")}`);
    }
  } else {
    console.log("   (no git baseline — the unchanged-lines check did not run)");
  }

  // ── 5 · coverage ───────────────────────────────────────────────────────────
  ok(seenPairs.size >= 23, `only ${seenPairs.size} member pairs on Support for Israel — fixture thinned out`);
  for (const p of seenPairs) ok(!!(E.map[p] || rowRule(didOf(p))), `${p}: a member-voted pair on Support for Israel prints no line`);
  ok(DB_PAIRS.length >= 19, `only ${DB_PAIRS.length} database-mapped pairs on Support for Israel — the projection thinned out`);
  for (const p of DB_PAIRS) {
    if (!didOf(p)) ok(!E.map[p], `${p}: stores no did on Support for Israel but carries a line`);
  }
  return { faults, pass, printed };
}

const CONS = R("consistency.js");
const headPrinted = headSrc ? check(headSrc, null).printed : null;
const live = check(CONS, headPrinted);

// ── 6 · mutations ───────────────────────────────────────────────────────────
const ADD_AT = "    'S.J.Res. 138|119|israel_support':\n";
const add = (pair, line) => (s) => s.replace(ADD_AT, `    '${pair}':\n      '${line.replace(/'/g, "\\'")}',\n` + ADD_AT);
// Every member row on this leaf carries a line, so the title fallback is tried on
// a row whose line is taken away: it must print nothing, not the bill's title.
const DROP_8800 = /    'H\.R\. 8800\|119\|israel_support':\n      '[^']+',\n/;
const MUTANTS = [
  { name: "title used as a fallback when nothing is stored",
    edit: (s) => s.replace(DROP_8800, "").replace("return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '');",
      "return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '') || _dosEffectOk(String(item.shortTitle || item.title || '') + '.');"),
    expect: /has nothing stored but prints/ },
  { name: "the measure's title stored as its line",
    edit: (s) => s.replace(/('H\.R\. 6126\|118\|israel_support':\n\s+)'[^']+'/, (_, h) => h + "'Israel Security Supplemental Appropriations Act, 2024.'"),
    expect: /is the measure's title/ },
  { name: "a line borrowed from the America First leaf",
    edit: (s) => { const m = /'H\.Amdt\. 235\|119\|america_first_fp':\n\s+'([^']+)',/.exec(s); return s.replace(/('H\.Amdt\. 235\|119\|israel_support':\n\s+)'[^']+'/, (_, h) => h + "'" + m[1] + "'"); },
    expect: /borrowed from/ },
  { name: "a failed act written as if it took effect",
    edit: (s) => s.replace("'Would have blocked the export of assault rifles to Israel;", "'Blocked the export of assault rifles to Israel;"),
    expect: /never became law is written as though it took effect/ },
  { name: "a line over 140 characters",
    edit: (s) => s.replace("the House agreed to it 360-67.'", "the House agreed to it 360-67 on a recorded vote taken in November 2023.'"),
    expect: /characters/ },
  { name: "a method word in a line",
    edit: (s) => s.replace("Appropriated $500 million for Israeli missile defense", "Weighted as $500 million for Israeli missile defense"),
    expect: /method word/ },
  { name: "one of Trump's lines edited",
    edit: (s) => s.replace("with no cost-sharing condition attached.'", "with no cost-sharing condition attached at all.'"),
    expect: /_DOS_EXEC_EFFECT|prints/ },
  { name: "a line that already shipped for the same act rewritten",
    edit: (s) => s.replace("from use for Israel, a standing aid commitment; the House rejected it 104-314.'", "from use for Israel; the House rejected it 104-314.'"),
    expect: /a shipped line was rewritten|at HEAD and now prints/ },
];
const mutFaults = [];
for (const m of MUTANTS) {
  const src = m.edit(CONS);
  if (src === CONS) { mutFaults.push(`mutation "${m.name}": anchor not found`); continue; }
  const res = check(src, headPrinted);
  const caught = res.faults.some((x) => m.expect.test(x));
  console.log(`   mutation: ${m.name} → ${caught ? "caught" : "NOT CAUGHT"}`);
  if (!caught) mutFaults.push(`mutation "${m.name}" survived`);
}

const all = live.faults.concat(mutFaults);
if (all.length) {
  for (const f of all.slice(0, 40)) console.error("  ✗ " + f);
  if (all.length > 40) console.error(`  … and ${all.length - 40} more`);
  console.error(`\n✗ Support for Israel effect lines: ${all.length} failure(s), ${live.pass} passed`);
  process.exit(1);
}
console.log(`\n✓ Support for Israel effect lines: all ${live.pass} assertions passed, ${MUTANTS.length} mutations caught`);
