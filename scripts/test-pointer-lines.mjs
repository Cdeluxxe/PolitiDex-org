#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-pointer-lines.mjs — a row whose facts live on another leaf points there
// ─────────────────────────────────────────────────────────────────────────────
// Six member-voted pairs store nothing on their own leaf and carry a bare number
// for a title, but the same act already has a line on a sibling leaf. Under each
// of those rows the drawer prints one pointer, in a fixed shape:
//
//     Same act, filed on [leaf]: [that leaf's line]
//     Same act, filed on [leaf] (also filed on [leaf]): [the shorter line]
//
// The quoted line is read live from the other pair and never copied into this
// leaf's store. It sits in its own row class (pdxlg-ptrr), not the effect row,
// so nothing reads it as this leaf's own sentence.
//
//   S.J.Res. 37 × Tariffs & Trade Authority, × Protect American Jobs
//       → Tariffs & Household Prices
//   S.J.Res. 59 × Diplomacy & Restraint, × Congress and War Powers
//       → Peace Through Strength (shorter), also Iran
//   H.R. 29 × Mass Deportations & Border Security, × States Suing Washington
//       → Strong Border & Enforcement. Tough on Crime stores a description for
//         H.R. 29 but no line short enough to print, so it is not named.
//
// The six rows with no description anywhere — H.Amdt. 97, H.Amdt. 85, H.Amdt. 87,
// and H.Con.Res. 14 on three leaves — print nothing at all.
//
//   1. SHAPE: every pointer is the fixed shape, and only these six pairs carry one.
//   2. REAL LEAF, EXACT LINE: each named leaf is one the act is mapped to and that
//      has a printed line; the quoted line is that leaf's line byte for byte, and
//      the shorter where two qualify.
//   3. NOT THIS LEAF'S: the row has no effect paragraph and its own store has no
//      entry; the pointer never appears without its prefix.
//   4. BLANKS: the six no-facts rows print no paragraph of either kind.
//   5. AUTHORITY: the stored table still has no S.J.Res. 37 × Authority line.
//   6. NOTHING SHIPPED MOVED: HEAD's _DOS_EFFECT lines, _DOS_EXEC_EFFECT and every
//      effect paragraph printed at HEAD are unchanged.
//   7. MUTATIONS: the prefix dropped, a leaf with no line named, the line copied
//      into the store, the wrong leaf's line quoted, the longer line quoted, and a
//      pointer added to a seventh row must each fail.
//
//   node scripts/test-pointer-lines.mjs

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
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
// The six pointer rows and what each must quote.
const WANT = {
  "S.J.Res. 37|119|tariffs_authority": { to: "tariffs_prices", also: [] },
  "S.J.Res. 37|119|econ_trade": { to: "tariffs_prices", also: [] },
  "S.J.Res. 59|119|restraint": { to: "strong_defense", also: ["iran_policy"] },
  "S.J.Res. 59|119|war_powers": { to: "strong_defense", also: ["iran_policy"] },
  "H.R. 29|119|deportations": { to: "border_security", also: [] },
  "H.R. 29|119|state_standing": { to: "border_security", also: [] },
};
const NO_FACTS = [
  "H.Amdt. 97|119|lands_preserve", "H.Amdt. 85|119|lgbtq_rights", "H.Amdt. 87|119|lgbtq_rights",
  "H.Con.Res. 14|119|lower_taxes", "H.Con.Res. 14|119|national_debt", "H.Con.Res. 14|119|cut_spending",
];
const SHAPE = /^Same act, filed on (.+?)(?: \(also filed on (.+?)\))?: (.+)$/;

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
const norm = (x) => String(x || "").replace(/\s+/g, " ").trim();
const rowRule = (raw) => {
  const s = norm(raw);
  if (!s || s.length > 140 || !/[.!?]$/.test(s)) return "";
  if (/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "";
  return s;
};

// Every drawer, every row: its effect and pointer paragraphs.
function render(src) {
  const win = boot(src);
  if (win.__err) return { err: win.__err };
  const CS = win.PDXConsistency, rows = [];
  for (const pid of Object.keys(win.CMP_DATA)) {
    for (const k of Object.keys(win.ISSUE_MAP || {})) {
      let items = [], html = "";
      try { items = CS.dossierItems(pid, k) || []; } catch { continue; }
      if (!items.length) continue;
      try { html = CS.dossierLedgerHtml(pid, k) || ""; } catch { continue; }
      const grab = (cls) => {
        const m = new Map();
        for (const x of html.matchAll(new RegExp(`<tr class="${cls}" data-${cls}="(\\d+)">([\\s\\S]*?)<\\/tr>`, "g"))) {
          m.set(Number(x[1]), (m.get(Number(x[1])) || []).concat(dec(x[2])));
        }
        return m;
      };
      const eff = grab("pdxlg-effr"), ptr = grab("pdxlg-ptrr");
      for (const x of html.matchAll(/<tr data-pdxlg-row="(\d+)">/g)) {
        const i = Number(x[1]), d = items[i], it = (d && d.item) || {};
        const pair = d && d.lane === "exec" ? `${String(it.documentId || "").trim()}|${k}` : `${String(it.number == null ? "" : it.number).trim()}|${it.congress}|${k}`;
        rows.push({ pid, k, pair, item: it, eff: eff.get(i) || [], ptr: ptr.get(i) || [] });
      }
    }
  }
  return { win, rows };
}

function check(src, base) {
  const faults = [];
  let pass = 0;
  const ok = (c, m) => { if (c) pass++; else faults.push(m); };
  const E = mapOf(src, "_DOS_EFFECT"), X = mapOf(src, "_DOS_EXEC_EFFECT"), M = mapOf(src, "_DOS_MECH");
  const r = render(src);
  if (r.err) return { faults: [`boot: ${r.err}`], pass, printed: new Map() };
  const LBL = (k) => String((r.win.ISSUE_MAP[k] || {}).label || "").replace(/^[^A-Za-z0-9\s]+\s+/, "");
  // The line a leaf prints for an act: its table entry, or its short `did`.
  const lineOf = (pair) => E.map[pair] || rowRule(M.map[pair] && M.map[pair].did);
  const printed = new Map(), seenPtr = new Map();

  for (const row of r.rows) {
    if (row.eff.length) printed.set(`${row.pid}|${row.pair}`, row.eff[0]);
    const want = WANT[row.pair];
    if (!want) {
      ok(row.ptr.length === 0, `${row.pid} × ${row.k}: ${row.pair} prints a pointer though it is not one of the six — ${JSON.stringify(row.ptr[0])}`);
      continue;
    }
    seenPtr.set(row.pair, (seenPtr.get(row.pair) || 0) + 1);
    // ── 3 · not this leaf's ────────────────────────────────────────────────
    ok(row.eff.length === 0, `${row.pid} × ${row.k}: ${row.pair} prints an effect paragraph of its own — ${JSON.stringify(row.eff[0])}`);
    ok(row.ptr.length === 1, `${row.pid} × ${row.k}: ${row.pair} prints ${row.ptr.length} pointer paragraphs`);
    const p = row.ptr[0] || "";
    // ── 1 · shape ──────────────────────────────────────────────────────────
    const m = SHAPE.exec(p);
    ok(!!m, `${row.pair}: the pointer is not the fixed shape — it restates another leaf's line as this leaf's own: ${JSON.stringify(p)}`);
    if (!m) continue;
    const [, name, alsoNames, quoted] = m;
    // ── 2 · a real leaf, its exact line, the shorter one ───────────────────
    const mapped = new Set((row.item.issues || []).map((i) => i.issueKey));
    const act = row.pair.split("|").slice(0, 2).join("|");
    const named = Object.keys(r.win.ISSUE_MAP).find((k) => LBL(k) === name && mapped.has(k) && k !== row.k);
    ok(!!named, `${row.pair}: the pointer names "${name}", which is not a leaf this act is mapped to`);
    if (named) {
      const line = lineOf(`${act}|${named}`);
      ok(!!line, `${row.pair}: the pointer names ${named}, a leaf with no line for this act`);
      ok(quoted === line, `${row.pair}: the quoted line is not ${named}'s line — got ${JSON.stringify(quoted)}, stored ${JSON.stringify(line)}`);
      ok(named === want.to, `${row.pair}: points at ${named}, expected ${want.to}`);
      for (const a of String(alsoNames || "").split(" and ").filter(Boolean)) {
        const ak = Object.keys(r.win.ISSUE_MAP).find((k) => LBL(k) === a && mapped.has(k));
        ok(!!ak && !!lineOf(`${act}|${ak}`), `${row.pair}: also names "${a}", which has no line for this act`);
        if (ak && lineOf(`${act}|${ak}`)) ok(line.length <= lineOf(`${act}|${ak}`).length, `${row.pair}: quotes ${named}'s longer line over ${ak}'s shorter one`);
      }
      const wantAlso = want.also.map(LBL).join(" and ");
      ok((alsoNames || "") === wantAlso, `${row.pair}: also-names ${JSON.stringify(alsoNames || "")}, expected ${JSON.stringify(wantAlso)}`);
    }
    ok(!(row.pair in E.map), `${row.pair}: the pointed-at line was copied into this leaf's store`);
  }
  for (const pair of Object.keys(WANT)) ok((seenPtr.get(pair) || 0) > 0, `${pair}: no member row prints its pointer`);

  // ── 4 · the six no-facts rows ────────────────────────────────────────────
  for (const pair of NO_FACTS) {
    const rows = r.rows.filter((x) => x.pair === pair);
    ok(rows.length > 0, `${pair}: no member row carries this pair — the blank check has nothing to read`);
    for (const x of rows) ok(x.eff.length === 0 && x.ptr.length === 0, `${x.pid} × ${x.k}: ${pair} has nothing on file but prints a paragraph`);
    ok(!(pair in E.map) && !rowRule(M.map[pair] && M.map[pair].did), `${pair}: now stores a line — move it out of NO_FACTS with its source`);
  }

  // ── 5 · Authority ────────────────────────────────────────────────────────
  ok(!("S.J.Res. 37|119|tariffs_authority" in E.map), "Authority's stored table has an S.J.Res. 37 line");

  // ── 6 · nothing shipped moved ────────────────────────────────────────────
  if (headSrc) {
    const HE = mapOf(headSrc, "_DOS_EFFECT"), HX = mapOf(headSrc, "_DOS_EXEC_EFFECT");
    for (const [p, v] of Object.entries(HE.map)) ok(E.map[p] === v, `${p}: a shipped line was rewritten or removed`);
    // A later wave may add lines; none may land on a pointer row (checked above).
    ok(Object.keys(E.map).length >= Object.keys(HE.map).length, "the effect table lost an entry");
    ok(X.text === HX.text, "_DOS_EXEC_EFFECT (Trump's lines) is not byte-identical to HEAD");
    if (base) {
      for (const [k, v] of base) ok(printed.get(k) === v, `${k}: printed ${JSON.stringify(v)} at HEAD and now prints ${JSON.stringify(printed.get(k) || "")}`);
      ok(printed.size >= base.size, `${printed.size} effect paragraphs now, ${base.size} at HEAD`);
    }
  } else {
    console.log("   (no git baseline — the unchanged-lines check did not run)");
  }
  return { faults, pass, printed };
}

const CONS = R("consistency.js");
const headPrinted = headSrc ? check(headSrc, null).printed : null;
const live = check(CONS, headPrinted);

// ── 7 · mutations ───────────────────────────────────────────────────────────
const MUTANTS = [
  { name: "the prefix dropped, restating the line as this leaf's own",
    edit: (s) => s.replace("return 'Same act, filed on ' + _dosLeafName(hits[0].leaf) +\n      (also.length ? ' (also filed on ' + also.join(' and ') + ')' : '') + ': ' + hits[0].line;", "return hits[0].line;"),
    expect: /not the fixed shape/ },
  { name: "a leaf with no line named",
    edit: (s) => s.replace("if (line) hits.push({ leaf: to[i], line: line });", "hits.push({ leaf: to[i], line: line || '' });"),
    expect: /a leaf with no line|not the fixed shape/ },
  { name: "the line copied into this leaf's store",
    edit: (s) => s.replace("    'S.J.Res. 37|119|tariffs_prices':\n", "    'S.J.Res. 37|119|econ_trade':\n      'Would have ended the emergency behind the tariffs on Canadian imports, lifting those duties; the Senate passed it 51-48.',\n    'S.J.Res. 37|119|tariffs_prices':\n"),
    expect: /prints an effect paragraph of its own|copied into this leaf's store/ },
  { name: "the wrong leaf's line quoted",
    edit: (s) => s.replace("'Same act, filed on ' + _dosLeafName(hits[0].leaf)", "'Same act, filed on ' + _dosLeafName(hits[hits.length - 1].leaf === hits[0].leaf ? 'tariffs_china' : hits[hits.length - 1].leaf)"),
    expect: /is not a leaf this act is mapped to|quoted line is not|points at/ },
  { name: "the longer line quoted",
    edit: (s) => s.replace("hits.sort(function (a, b) { return a.line.length - b.line.length; });", "hits.sort(function (a, b) { return b.line.length - a.line.length; });"),
    expect: /longer line|points at/ },
  { name: "a pointer added to a seventh row",
    edit: (s) => s.replace("    'H.R. 29|119|state_standing': ['border_security', 'tough_on_crime']\n", "    'H.R. 29|119|state_standing': ['border_security', 'tough_on_crime'],\n    'H.Amdt. 236|119|cut_spending': ['america_first_fp']\n"),
    expect: /not one of the six/ },
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
  console.error(`\n✗ pointer lines: ${all.length} failure(s), ${live.pass} passed`);
  process.exit(1);
}
console.log(`\n✓ pointer lines: all ${live.pass} assertions passed, ${MUTANTS.length} mutations caught`);
