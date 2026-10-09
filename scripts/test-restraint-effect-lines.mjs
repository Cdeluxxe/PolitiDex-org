#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-restraint-effect-lines.mjs — one sentence under each vote on Diplomacy & Restraint
// ─────────────────────────────────────────────────────────────────────────────
// Diplomacy & Restraint (restraint). Each member-voted act on that leaf whose pair
// stores a `did` carries one line saying what it did to the leaf, stored once on
// the measure-and-issue pair in _DOS_EFFECT, so it shows for every member who
// voted on it. H.R. 8035's own `did` is already short enough to stand under its
// row and is not rewritten. S.J.Res. 59 reaches the leaf with no `did` and stays
// blank, as does H.Amdt. 252, which only the database maps here. Trump's four
// executive lines on the leaf are pinned word for word.
//
//   1. THE LINE RULE: one sentence, 140 characters or fewer, ends on its stop,
//      no method words, no "PolitiDex", no ellipsis, never the measure's title,
//      and it names the U.S. military engagement it would end or sustain.
//   2. NOT BORROWED: a line is never another leaf's line for the same act.
//   3. TENSE: an act with no public law on file opens "Would" or "Proposed" and
//      never claims it took effect; an enacted one does not open that way.
//   4. RENDERED, ROW BY ROW, for every member file: a row with a stored line
//      prints that line and no other; a row with nothing stored prints no extra
//      paragraph.
//   5. NOTHING SHIPPED WAS REWRITTEN: every line in HEAD's _DOS_EFFECT is
//      unchanged, _DOS_EXEC_EFFECT (Trump's lines) is byte-identical, his four
//      restraint lines are the ones below, and every row that printed a line at
//      HEAD prints it now.
//   6. COVERAGE: every member-voted pair on the leaf prints a line except the
//      documented blank; the database-only pairs with no `did` have none.
//   7. MUTATIONS: a title fallback, a title stored as a line, a borrowed line, a
//      failed act written as done, an over-long line, a method word, an edited
//      Trump line and a rewritten shipped line must each fail.
//
//   node scripts/test-restraint-effect-lines.mjs

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
const KEYS = ["restraint"];
const NAMES = { restraint: /\b(?:forces|hostilities|military|force authorizations)\b/ };
const BLANK = new Set(["S.J.Res. 59|119|restraint"]);
// Trump's four executive lines on this leaf, as they shipped.
const TRUMP = {
  "S.J. Res. 7 (116th Congress)|restraint":
    "Vetoed the resolution directing U.S. forces out of the Yemen conflict, keeping them committed; the Senate failed to override it 53-45.",
  "S.J. Res. 68 (116th Congress)|restraint":
    "Vetoed the resolution directing U.S. forces out of hostilities with Iran; the Senate failed to override it 49-44.",
  "Executive Order 14353|restraint":
    "Made defending Qatar against any armed attack standing U.S. policy, adding an open-ended military commitment abroad.",
  "Proclamation 11015|restraint":
    "Committed the United States to destroying cartel organizations across the Western Hemisphere with any necessary resources.",
};
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
  if ((a.issueKeys || []).includes("restraint")) DB_PAIRS.push(`${a.number}|${a.sitting}|restraint`);
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
  ok(seenPairs.size >= 13, `only ${seenPairs.size} member pairs on Diplomacy & Restraint — fixture thinned out`);
  for (const p of seenPairs) {
    if (BLANK.has(p)) ok(!E.map[p] && !rowRule(didOf(p)), `${p}: the documented blank now carries a line — move it out of BLANK with its source`);
    else ok(!!(E.map[p] || rowRule(didOf(p))), `${p}: a member-voted pair on Diplomacy & Restraint prints no line`);
  }
  for (const [p, v] of Object.entries(TRUMP)) ok(X.map[p] === v, `${p}: Trump's shipped line changed`);
  ok(DB_PAIRS.length >= 14, `only ${DB_PAIRS.length} database-mapped pairs on Diplomacy & Restraint — the projection thinned out`);
  for (const p of DB_PAIRS) {
    if (!didOf(p)) ok(!E.map[p], `${p}: stores no did on Diplomacy & Restraint but carries a line`);
  }
  return { faults, pass, printed };
}

const CONS = R("consistency.js");
const headPrinted = headSrc ? check(headSrc, null).printed : null;
const live = check(CONS, headPrinted);

// ── 6 · mutations ───────────────────────────────────────────────────────────
const MUTANTS = [
  { name: "title used as a fallback when nothing is stored",
    edit: (s) => s.replace("return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '');",
      "return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '') || String(item.shortTitle || item.title || '');"),
    expect: /has nothing stored but prints/ },
  { name: "the measure's title stored as its line",
    edit: (s) => s.replace(/('H\.R\. 815\|118\|restraint':\n\s+)'[^']+'/, (_, h) => h + "'Making emergency supplemental appropriations for the fiscal year ending September 30, 2024, and for other purposes.'"),
    expect: /is the measure's title/ },
  { name: "a line borrowed from the Iran leaf",
    edit: (s) => { const m = /'S\.J\.Res\. 104\|119\|iran_policy':\n\s+'([^']+)',/.exec(s); return s.replace(/('S\.J\.Res\. 104\|119\|restraint':\n\s+)'[^']+'/, (_, h) => h + "'" + m[1] + "'"); },
    expect: /borrowed from/ },
  { name: "a failed act written as if it took effect",
    edit: (s) => s.replace("'Would have directed U.S. forces out of any hostilities in Lebanon", "'Directed U.S. forces out of any hostilities in Lebanon"),
    expect: /never became law is written as though it took effect/ },
  { name: "a line over 140 characters",
    edit: (s) => s.replace("the House rejected it 189-235.'", "the House rejected it 189-235 on a recorded vote taken in the summer of 2026.'"),
    expect: /characters/ },
  { name: "a method word in a line",
    edit: (s) => s.replace("'Sustained U.S. military support to two active wars and Pacific", "'Weighted as U.S. military support to two active wars and Pacific"),
    expect: /method word/ },
  { name: "one of Trump's four restraint lines edited",
    edit: (s) => s.replace("adding an open-ended military commitment abroad.'", "adding an open-ended commitment abroad.'"),
    expect: /Trump's shipped line changed|_DOS_EXEC_EFFECT/ },
  { name: "a line that already shipped for the same act rewritten",
    edit: (s) => s.replace("'Added repeal of the 2002 and 1991 Iraq war authorizations to the House defense bill;", "'Added repeal of the Iraq war authorizations to the House defense bill;"),
    expect: /a shipped line was rewritten/ },
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
  console.error(`\n✗ Diplomacy & Restraint effect lines: ${all.length} failure(s), ${live.pass} passed`);
  process.exit(1);
}
console.log(`\n✓ Diplomacy & Restraint effect lines: all ${live.pass} assertions passed, ${MUTANTS.length} mutations caught`);
