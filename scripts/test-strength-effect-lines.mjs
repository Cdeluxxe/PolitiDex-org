#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-strength-effect-lines.mjs — one sentence under each vote on Peace Through Strength
// ─────────────────────────────────────────────────────────────────────────────
// Peace Through Strength (strong_defense). Each member-voted act on that leaf
// whose pair stores a `did` carries one line saying what it did to the leaf,
// stored once on the measure-and-issue pair in _DOS_EFFECT, so it shows for every
// member who voted on it. H.R. 8595's own `did` is already short enough to stand
// under its row and is not rewritten. The pairs only the database maps on this
// leaf with no `did` there (H.Amdt. 252, H.Con.Res. 14, 89 and 108, H.R. 1,
// H.R. 1968 and H.R. 3838 of the 119th, the Rubio nomination) stay blank.
//
//   1. THE LINE RULE: one sentence, 140 characters or fewer, ends on its stop,
//      no method words, no "PolitiDex", no ellipsis, never the measure's title,
//      and it names the military or security effect.
//   2. NOT BORROWED: a line is never another leaf's line for the same act.
//   3. TENSE: an act with no public law on file opens "Would" or "Proposed" and
//      never claims it took effect; an enacted one does not open that way.
//   4. RENDERED, ROW BY ROW, for every member file: a row with a stored line
//      prints that line and no other; a row with nothing stored prints no extra
//      paragraph.
//   5. NOTHING SHIPPED WAS REWRITTEN: every line in HEAD's _DOS_EFFECT is
//      unchanged, _DOS_EXEC_EFFECT (Trump's lines) is byte-identical, and every
//      Peace Through Strength row that printed a line at HEAD prints it now.
//   6. COVERAGE: every member-voted pair on the leaf prints a line; the
//      database-only pairs with no `did` have none.
//   7. MUTATIONS: a title fallback, a title stored as a line, a borrowed line, a
//      failed act written as done, an over-long line, a method word, an edited
//      Trump line and a rewritten shipped row must each fail.
//
//   node scripts/test-strength-effect-lines.mjs

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
const KEYS = ["strong_defense"];
const NAMES = { strong_defense: /\b(?:defen[cs]e|military|forces|Pentagon|intelligence|weapons|Deterrence)\b/i };
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
  if ((a.issueKeys || []).includes("strong_defense")) DB_PAIRS.push(`${a.number}|${a.sitting}|strong_defense`);
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
  ok(seenPairs.size >= 22, `only ${seenPairs.size} member pairs on Peace Through Strength — fixture thinned out`);
  for (const p of seenPairs) ok(!!(E.map[p] || rowRule(didOf(p))), `${p}: a member-voted pair on Peace Through Strength prints no line`);
  ok(DB_PAIRS.length >= 27, `only ${DB_PAIRS.length} database-mapped pairs on Peace Through Strength — the projection thinned out`);
  for (const p of DB_PAIRS) {
    if (!didOf(p)) ok(!E.map[p], `${p}: stores no did on Peace Through Strength but carries a line`);
  }
  return { faults, pass, printed };
}

const CONS = R("consistency.js");
const headPrinted = headSrc ? check(headSrc, null).printed : null;
const live = check(CONS, headPrinted);

// ── 6 · mutations ───────────────────────────────────────────────────────────
const ADD_AT = "    'S.J.Res. 185|119|strong_defense':\n";
const add = (pair, line) => (s) => s.replace(ADD_AT, `    '${pair}':\n      '${line.replace(/'/g, "\\'")}',\n` + ADD_AT);
const MUTANTS = [
  { name: "title used as a fallback when nothing is stored",
    edit: (s) => s.replace("return _dosEffectOk(_DOS_EXEC_EFFECT[String(it.documentId).trim() + '|' + issueKey]);",
      "return _dosEffectOk(_DOS_EXEC_EFFECT[String(it.documentId).trim() + '|' + issueKey]) || String(it.title || '');"),
    expect: /has nothing stored but prints/ },
  { name: "the measure's title stored as its line",
    edit: add("H.R. 8595|119|strong_defense", "National Security, Department of State, and Related Programs Appropriations Act, 2027."),
    expect: /is the measure's title/ },
  { name: "a line borrowed from the Iran leaf",
    edit: (s) => { const m = /'S\.J\.Res\. 104\|119\|iran_policy':\n\s+'([^']+)',/.exec(s); return s.replace(/('S\.J\.Res\. 104\|119\|strong_defense':\n\s+)'[^']+'/, (_, h) => h + "'" + m[1] + "'"); },
    expect: /borrowed from/ },
  { name: "a failed act written as if it took effect",
    edit: (s) => s.replace("'Would have funded U.S. military accounts to replace Pentagon stocks;", "'Funded U.S. military accounts to replace Pentagon stocks;"),
    expect: /never became law is written as though it took effect/ },
  { name: "a line over 140 characters",
    edit: (s) => s.replace("the House agreed to it 215-214.'", "the House agreed to it 215-214 on a recorded vote taken late in July 2026.'"),
    expect: /characters/ },
  { name: "a method word in a line",
    edit: (s) => s.replace("Authorized FY2022 military end strengths", "Weighted as authorizing FY2022 military end strengths"),
    expect: /method word/ },
  { name: "one of Trump's lines edited",
    edit: (s) => s.replace("with no cost-sharing condition attached.'", "with no cost-sharing condition attached at all.'"),
    expect: /_DOS_EXEC_EFFECT|prints/ },
  { name: "a row that already shipped a line rewritten",
    edit: add("H.R. 8595|119|strong_defense", "Appropriated FY2027 national security accounts; the House passed it 216-212."),
    expect: /at HEAD and now prints/ },
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
  console.error(`\n✗ Peace Through Strength effect lines: ${all.length} failure(s), ${live.pass} passed`);
  process.exit(1);
}
console.log(`\n✓ Peace Through Strength effect lines: all ${live.pass} assertions passed, ${MUTANTS.length} mutations caught`);
