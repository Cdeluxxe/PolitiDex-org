#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-search-leaf-effect-lines.mjs — the missing sentence on the search leaves
// ─────────────────────────────────────────────────────────────────────────────
// Tariffs, immigration, energy, water, housing and schools. A member-voted row
// with no line got one where its own pair already held the facts: a `did` stored
// on that pair, or — with none — the measure's own stored title and a recorded
// outcome. Each line is stored once on the measure-and-issue pair in _DOS_EFFECT
// and ends on the tally the vote seeds hold. Forty lines, the cap for the pass.
//
// Rows left blank, and why — each is pinned below:
//   · S.J.Res. 37 × Tariffs & Trade Authority — no `did` on the pair and a bare
//     number for a title; the act's description sits on Household Prices.
//   · H.R. 29 × Mass Deportations — the same: its only description is on the
//     border leaf, and its title is its number.
//   · H.R. 1319 × public schools, H.R. 1049 × parental rights, H.R. 3746 ×
//     college cost and H.Amdt. 257 × school choice held their own facts but fell
//     past the forty-line cap; wave 1 (v317) wrote them, and its own test,
//     test-wave1-effect-lines.mjs, holds them.
//
//   1. SOURCE: every new line carries a term its own pair stores — its `did`, or,
//      where it has none, the measure's own title — and never another leaf's.
//   2. TALLY: it ends on the rolls the vote seeds hold, in the shape its outcome
//      allows.
//   3. TENSE: a failed act opens "Proposed" or "Would have"; an act with no public
//      law on file opens "Would" unless it is an adopted amendment saying what it
//      wrote into its bill; an enacted act does not open "Would".
//   4. THE LINE RULE: one sentence, 140 characters or fewer, no method words, no
//      "PolitiDex", no ellipsis, never the title itself.
//   5. RENDERED, ROW BY ROW: on every leaf this pass touched, a row prints its
//      stored line and no other, a row with nothing stored prints no paragraph,
//      Authority prints nothing for S.J.Res. 37 and Household Prices prints its
//      own line on every S.J.Res. 37 row.
//   6. NOTHING SHIPPED WAS REWRITTEN: HEAD's _DOS_EFFECT lines are unchanged,
//      _DOS_EXEC_EFFECT is byte-identical, and every row that printed at HEAD
//      prints the same now.
//   7. MUTATIONS: a borrowed line, a failed act written as done, an over-long
//      line, a method word, a title fallback, an Authority line lifted from
//      Household Prices and a rewritten shipped line must each fail.
//
//   node scripts/test-search-leaf-effect-lines.mjs

import { readFileSync, readdirSync } from "node:fs";
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
const KEYS = [
  "tariffs_prices", "tariffs_authority", "tariffs_china", "tariffs_growth",
  "border_security", "immigration_reform", "immig_legal", "immig_balance", "immig_fentanyl", "deportations",
  "energy_production", "enviro_energy", "lands_energy", "climate_action",
  "water", "water_storage", "housing", "housing_build", "housing_support", "homeless",
  "school_choice", "public_schools", "edu_parental", "edu_college_cost",
];
const BLANK = new Set([
  "S.J.Res. 37|119|tariffs_authority", "H.R. 29|119|deportations",
]);
// Lines a later pass wrote on these leaves, read from that pass's own block in
// _DOS_EFFECT and held by that pass's own test.
const laterLines = (src) => {
  const a = src.indexOf("// WAVE 1 OF FULL COVERAGE (v317)");
  if (a < 0) return new Set();
  return new Set([...src.slice(a, src.indexOf("\n  };", a)).matchAll(/^    '([^']+)':$/gm)].map((m) => m[1]));
};
const CAP = 40;
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary|coded|coding|chip|mapped|mapping|filed as|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger)\b|PolitiDex|…|\.\.\./i;

// [a term the pair's own source holds, that source, the rolls the line ends on,
//  the closing shape]. "title" is used only where the pair stores no `did`.
const H = "house", S = "senate";
const SPEC = {
  "S.J.Res. 37|119|tariffs_prices": ["Canadian imports", "did", [[S, 160]], "passed"],
  "S. 2|119|border_security": ["$9.55 billion", "did", [[H, 214], [S, 163]], "cleared"],
  "H.R. 3486|119|border_security": ["five", "did", [[H, 264]], "passed"],
  "H.R. 2056|119|border_security": ["immigration status", "did", [[H, 171]], "passed"],
  "H.R. 29|119|border_security": ["burglary", "did", [[H, 6]], "passed"],
  "S.Amdt. 5813|119|immigration_reform": ["DACA renewal applications", "did", [[S, 156]], "rejected"],
  "S. 2|119|immig_fentanyl": ["fentanyl", "did", [[H, 214], [S, 163]], "cleared"],
  "S. 1071|119|immig_fentanyl": ["Fentanyl Sanctions Act", "did", [[H, 320], [S, 648]], "cleared"],
  "S. 331|119|immig_fentanyl": ["Schedule I", "did", [[H, 166], [S, 127]], "cleared"],
  "S. 1605|117|immig_fentanyl": ["fentanyl source countries", "did", [[H, 405], [S, 499]], "cleared"],
  "H.R. 815|118|immig_fentanyl": ["FEND Off Fentanyl Act", "did", [[S, 154]], "concurred"],
  "S. 2296|119|immig_fentanyl": ["Fentanyl Sanctions Act", "did", [[S, 570]], "passed"],
  "S. 2|119|deportations": ["$44 billion", "did", [[H, 214], [S, 163]], "cleared"],
  "H.R. 2056|119|deportations": ["lawful federal request", "did", [[H, 171]], "passed"],
  "S. 5|119|deportations": ["theft", "did", [[H, 23], [S, 7]], "cleared"],
  "S.Amdt. 8|119|deportations": ["mandatory-detention list", "title", [[S, 6]], "agreed"],
  "S.Amdt. 14|119|deportations": ["trigger mandatory detention", "title", [[S, 3]], "agreed"],
  "H.Amdt. 248|119|energy_production": ["Santa Ynez", "did", [[H, 260]], "agreed"],
  "H.R. 3616|119|energy_production": ["reliability", "did", [[H, 347]], "passed"],
  "H.R. 3632|119|energy_production": ["retirement", "did", [[H, 342]], "passed"],
  "H.R. 3628|119|energy_production": ["ratemaking standard", "did", [[H, 323]], "passed"],
  "H.R. 1047|119|energy_production": ["dispatchable power projects", "did", [[H, 279]], "passed"],
  "H.R. 3746|118|energy_production": ["Mountain Valley Pipeline", "did", [[H, 243], [S, 146]], "cleared"],
  "H.R. 5376|117|energy_production": ["wind and solar rights-of-way", "did", [[H, 420], [S, 325]], "cleared"],
  "S.J.Res. 71|119|energy_production": ["Executive Order 14156", "did", [[S, 554]], "rejected"],
  "S.J.Res. 10|119|energy_production": ["January 2025", "did", [[S, 95]], "rejected"],
  "H.R. 4090|119|lands_energy": ["mining", "did", [[H, 55]], "passed"],
  "H.R. 1366|119|lands_energy": ["Abandoned Hardrock Mine Fund", "did", [[H, 358]], "passed"],
  "H.R. 4690|119|climate_action": ["new and renovated federal buildings", "did", [[H, 134]], "passed"],
  "H.Amdt. 234|119|climate_action": ["$139,575,000 for the Global Environment Facility", "title", [[H, 242]], "rejected"],
  "H.Amdt. 207|119|climate_action": ["farm equipment", "did", [[H, 152]], "agreed"],
  "H.R. 4758|119|climate_action": ["building energy codes", "did", [[H, 78]], "passed"],
  "H.Amdt. 79|119|climate_action": ["electric and hybrid", "did", [[H, 251]], "agreed"],
  "H.R. 5376|117|climate_action": ["geothermal", "did", [[H, 420], [S, 325]], "cleared"],
  "H.R. 3684|117|water": ["wastewater systems", "did", [[H, 369], [S, 314]], "cleared"],
  "H.R. 6644|119|housing": ["HUD-VASH", "did", [[H, 224], [S, 53]], "cleared"],
  "H.R. 6644|119|housing_build": ["single-staircase", "did", [[H, 224], [S, 53]], "cleared"],
  "S. 2296|119|housing_build": ["fourplexes", "did", [[S, 570]], "passed"],
  "S. 2296|119|homeless": ["Continuum of Care", "did", [[S, 570]], "passed"],
  "S. 2938|117|public_schools": ["school safety programs", "did", [[H, 299], [S, 242]], "cleared"],
};
// Where a line restates its term in other words, the words it may use instead.
const ALSO = {
  "H.R. 3486|119|border_security": ["five years"],
  "H.R. 2056|119|deportations": ["lawful federal requests"],
  "S.Amdt. 8|119|deportations": ["mandatory-detention list"],
  "S.Amdt. 14|119|deportations": ["trigger mandatory detention"],
  "H.R. 3632|119|energy_production": ["retiring"],
  "H.R. 4090|119|lands_energy": ["mining permits"],
  "H.Amdt. 207|119|climate_action": ["farm-equipment"],
  "H.R. 4758|119|climate_action": ["building energy code"],
  "S.J.Res. 37|119|tariffs_prices": ["Canadian imports"],
};

// Every recorded roll, by (number, congress, chamber, roll): its tally.
const ROLL = (() => {
  const t = {};
  for (const f of readdirSync(join(ROOT, "db")).filter((x) => x.endsWith(".json")).sort()) {
    let j; try { j = JSON.parse(R(`db/${f}`)); } catch { continue; }
    for (const v of j.votes || []) {
      const num = typeof v.measure === "string" ? v.measure : v.measure && v.measure.number;
      if (!num || v.rollNumber == null || !v.chamber) continue;
      const k = `${num}|${v.congress}|${v.chamber}|${v.rollNumber}`;
      if (v.totals && v.totals.yea != null) t[k] = [v.totals.yea, v.totals.nay];
      else if (!t[k] && v.partyTotals) {
        const P = Object.values(v.partyTotals);
        if (P.length) t[k] = [P.reduce((n, p) => n + p.yea, 0), P.reduce((n, p) => n + p.nay, 0)];
      }
    }
  }
  return t;
})();
const ENACTED = new Set();
for (const m of JSON.parse(R("db/vr-measure-identity.json")).measures || []) {
  if (m && (m.laws || []).length) ENACTED.add(`${String(m.number).trim()}|${m.congress}`);
}

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
// The drawer's own row rule (_dosEffectOk), so a pair's short `did` is the line it
// is held to when nothing is in the table.
const rowRule = (raw) => {
  const s = norm(raw);
  if (!s || s.length > 140 || !/[.!?]$/.test(s)) return "";
  if (/[.!?]\s+["\u201c(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "";
  return s;
};

// One line against its own pair's facts.
function lineFault(k, v, E, M, titles) {
  const s = norm(v);
  if (s.length > 140) return `${s.length} characters`;
  if (!/[.!?]$/.test(s)) return "does not end on a stop";
  if (/[.!?]\s+["\u201c(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "more than one sentence";
  const mw = s.match(METHOD);
  if (mw) return `method word: ${mw[0]}`;
  const [num, cong, key] = k.split("|"), act = `${num}|${cong}`;
  if ((titles.get(num) || new Set()).has(s.replace(/[.!?]$/, "").toLowerCase())) return "the line is the measure's title";
  for (const [j, w] of Object.entries(E)) {
    if (j !== k && j.startsWith(act + "|") && norm(w) === s) return `borrowed from ${j}`;
  }
  for (const [j, m] of Object.entries(M)) {
    if (j !== k && j.startsWith(act + "|") && m && m.did && norm(m.did).includes(s.replace(/[.!?]$/, ""))) return `borrowed from ${j}'s stored did`;
  }
  const sp = SPEC[k];
  if (!sp) return "names no source the pair stores";
  const [term, src, rolls, shape] = sp;
  const own = norm(M[k] && M[k].did);
  if (src === "did" && !own.includes(term)) return `the term "${term}" is not in this pair's own did`;
  if (src === "title") {
    if (own) return "written from the title though the pair stores a did";
    if (![...(titles.get(num) || [])].some((t) => t.includes(term.toLowerCase()))) return `the term "${term}" is not in the measure's own title`;
  }
  if (![term, ...(ALSO[k] || [])].some((w) => s.includes(w))) return `the line does not carry its source term "${term}"`;
  const tl = rolls.map(([ch, r]) => ROLL[`${num}|${cong}|${ch}|${r}`]);
  if (tl.some((x) => !x)) return "the archive holds no tally for one of its rolls";
  const [a, b] = tl;
  const lost = a[0] < a[1];
  const failedStart = /^(?:Proposed|Would have)\b/.test(s), would = /^(?:Would|Proposed)\b/.test(s);
  if (lost && !failedStart) return "a failed act is written as though it took effect";
  if (!lost && ENACTED.has(act) && would) return "an enacted act is written as though it did not take effect";
  if (!lost && !ENACTED.has(act)) {
    const amendmentInBill = shape === "agreed" && /\bbill\b|\bbill’s\b/.test(s);
    if (!would && !amendmentInBill) return "an act that never became law is written as though it took effect";
  }
  const C = (ch) => (ch === H ? "House" : "Senate");
  const tail = shape === "cleared" ? `; the House cleared it ${a[0]}-${a[1]}, the Senate ${b[0]}-${b[1]}.`
    : shape === "concurred" ? `; the ${C(rolls[0][0])} concurred ${a[0]}-${a[1]}.`
    : shape === "passed" ? `; the ${C(rolls[0][0])} passed it ${a[0]}-${a[1]}.`
    : shape === "agreed" ? `; the ${C(rolls[0][0])} agreed to it ${a[0]}-${a[1]}.`
    : `; the ${C(rolls[0][0])} rejected it ${a[0]}-${a[1]}.`;
  return s.endsWith(tail) ? "" : `does not end on the recorded tally (${tail.slice(2)})`;
}

function check(src, base) {
  const faults = [];
  let pass = 0;
  const ok = (c, m) => { if (c) pass++; else faults.push(m); };
  const E = mapOf(src, "_DOS_EFFECT"), X = mapOf(src, "_DOS_EXEC_EFFECT"), M = mapOf(src, "_DOS_MECH");
  if (!E || !X || !M) return { faults: ["effect maps not found in consistency.js"], pass, printed: new Map() };
  const win = boot(src);
  if (win.__err) return { faults: [`boot: ${win.__err}`], pass, printed: new Map() };
  const CS = win.PDXConsistency;
  const titles = new Map();
  const addTitle = (n, t) => { if (!n || !t) return; const k = String(n).trim(); if (!titles.has(k)) titles.set(k, new Set()); titles.get(k).add(norm(t).replace(/[.!?]$/, "").toLowerCase()); };
  for (const m of R("bills-index.js").matchAll(/number:\s*'([^']+)',\s*title:\s*'([^']*)'(?:,\s*shortTitle:\s*'([^']*)')?/g)) { addTitle(m[1], m[2]); addTitle(m[1], m[3]); }
  const printed = new Map(), seen = new Set(), effOn = new Map();

  // ── 5 · rendered, row by row ───────────────────────────────────────────────
  const rows = [];
  for (const pid of Object.keys(win.CMP_DATA)) {
    for (const k of KEYS) {
      let items = [], html = "";
      try { items = CS.dossierItems(pid, k) || []; } catch { continue; }
      if (!items.length) continue;
      try { html = CS.dossierLedgerHtml(pid, k) || ""; } catch { html = ""; }
      const effs = new Map();
      for (const m of html.matchAll(/<tr class="pdxlg-effr" data-pdxlg-effr="(\d+)">([\s\S]*?)<\/tr>/g)) {
        effs.set(Number(m[1]), (effs.get(Number(m[1])) || []).concat(dec(m[2])));
      }
      for (const m of html.matchAll(/<tr data-pdxlg-row="(\d+)">/g)) {
        const i = Number(m[1]), d = items[i], it = (d && d.item) || {};
        if (d && d.lane !== "exec") { addTitle(it.number, it.title); addTitle(it.number, it.shortTitle); }
        rows.push({ pid, k, d, it, got: effs.get(i) || [] });
      }
    }
  }
  for (const { pid, k, d, it, got } of rows) {
    ok(got.length <= 1, `${pid} × ${k}: row ${d && d.ident} prints ${got.length} effect paragraphs`);
    let pair, want;
    if (d && d.lane === "exec") { pair = `${String(it.documentId || "").trim()}|${k}`; want = X.map[pair] || ""; }
    else {
      pair = `${String(it.number == null ? "" : it.number).trim()}|${it.congress}|${k}`;
      want = E.map[pair] || rowRule(M.map[pair] && M.map[pair].did);
      seen.add(pair);
      if (got.length) effOn.set(pair, (effOn.get(pair) || 0) + 1);
    }
    if (got.length) printed.set(`${pid}|${pair}`, got[0]);
    if (want) ok(got.length === 1 && got[0] === want, `${pid} × ${k}: ${pair} prints ${JSON.stringify(got)}, stored ${JSON.stringify(want)}`);
    else ok(got.length === 0, `${pid} × ${k}: ${pair} has nothing stored but prints ${JSON.stringify(got[0])}`);
  }

  // ── 1–4 · every line this pass wrote, against its own facts ───────────────
  ok(Object.keys(SPEC).length <= CAP, `${Object.keys(SPEC).length} new lines — the pass is capped at ${CAP}`);
  for (const k of Object.keys(SPEC)) {
    ok(k in E.map, `${k}: the line this pass wrote is missing`);
    if (k in E.map) ok(lineFault(k, E.map[k], E.map, M.map, titles) === "", `${k}: ${lineFault(k, E.map[k], E.map, M.map, titles)}`);
    ok(seen.has(k), `${k}: no member row carries this pair — the line has nowhere to print`);
  }
  // Any other line on these leaves that is not one this pass wrote shipped before.
  const headE = headSrc ? mapOf(headSrc, "_DOS_EFFECT").map : {};
  const later = laterLines(src);
  for (const k of Object.keys(E.map)) {
    if (!KEYS.includes(k.split("|")[2]) || k in SPEC || later.has(k)) continue;
    ok(k in headE, `${k}: a line on a search leaf with no source in this pass`);
  }

  // ── blanks, and the two tariff leaves ──────────────────────────────────────
  for (const p of BLANK) {
    ok(!E.map[p] && !rowRule(M.map[p] && M.map[p].did), `${p}: the documented blank now carries a line — move it out of BLANK with its source`);
  }
  ok(!effOn.get("S.J.Res. 37|119|tariffs_authority"), "Tariffs & Trade Authority prints a line for S.J.Res. 37");
  ok((effOn.get("S.J.Res. 37|119|tariffs_prices") || 0) >= 16, "Household Prices does not print its line on every S.J.Res. 37 row");
  ok(!M.map["S.J.Res. 37|119|tariffs_authority"], "S.J.Res. 37 now stores a did on Authority — its line can be written from that");

  // ── 6 · nothing shipped was rewritten ─────────────────────────────────────
  if (headSrc) {
    const HE = mapOf(headSrc, "_DOS_EFFECT"), HX = mapOf(headSrc, "_DOS_EXEC_EFFECT");
    for (const [p, v] of Object.entries(HE.map)) ok(E.map[p] === v, `${p}: a shipped line was rewritten or removed`);
    ok(X.text === HX.text, "_DOS_EXEC_EFFECT (Trump's lines) is not byte-identical to HEAD");
    if (base) for (const [r, v] of base) ok(printed.get(r) === v, `${r}: printed ${JSON.stringify(v)} at HEAD and now prints ${JSON.stringify(printed.get(r) || "")}`);
  } else {
    console.log("   (no git baseline — the unchanged-lines check did not run)");
  }
  return { faults, pass, printed };
}

const CONS = R("consistency.js");
const headPrinted = headSrc ? check(headSrc, null).printed : null;
const live = check(CONS, headPrinted);

// ── 7 · mutations ───────────────────────────────────────────────────────────
const swap = (pair, line) => (s) => s.replace(new RegExp(`('${pair.replace(/[.|$]/g, "\\$&")}':\\n\\s+)'[^']+'`), (_, h) => h + "'" + line.replace(/'/g, "\\'") + "'");
const ADD_AT = "    'S.J.Res. 37|119|tariffs_prices':\n";
const add = (pair, line) => (s) => s.replace(ADD_AT, `    '${pair}':\n      '${line.replace(/'/g, "\\'")}',\n` + ADD_AT);
const MUTANTS = [
  { name: "a line borrowed from another leaf for the same act",
    edit: swap("S. 2|119|deportations", "Funded $9.55 billion for Border Patrol agents and $3.45 billion for ports and surveillance; the House cleared it 214-212, the Senate 52-47."),
    expect: /borrowed from/ },
  { name: "a failed act written as if it took effect",
    edit: swap("S.J.Res. 10|119|energy_production", "Ended the January 2025 national energy emergency that expedites energy projects; the Senate rejected it 47-52."),
    expect: /failed act is written as though it took effect/ },
  { name: "a one-chamber bill written as law",
    edit: swap("H.R. 3632|119|energy_production", "Required power plant owners to give notice before retiring a generating unit; the House passed it 222-202."),
    expect: /never became law is written as though it took effect/ },
  { name: "the tally changed",
    edit: swap("H.R. 4090|119|lands_energy", "Would order Interior to list pending federal-land mining permits and approve those ready at once; the House passed it 224-159."),
    expect: /recorded tally/ },
  { name: "a line over 140 characters",
    edit: swap("S. 2938|117|public_schools", "Funded school safety programs and school-based mental-health services, with Medicaid guidance for services in schools; the House cleared it 234-193, the Senate 65-33."),
    expect: /characters/ },
  { name: "a method word in a line",
    edit: swap("H.R. 3684|117|water", "Funded drinking-water and wastewater systems, coded as Western water storage; the House cleared it 228-206, the Senate 69-30."),
    expect: /method word/ },
  { name: "title used as a fallback when nothing is stored",
    edit: (s) => s.replace("return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '');",
      "return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '') || String(item.shortTitle || item.title || '');"),
    expect: /has nothing stored but prints/ },
  { name: "an Authority line lifted from the Household Prices facts",
    edit: add("S.J.Res. 37|119|tariffs_authority", "Terminated the national emergency declaration that is the legal basis for the tariffs on Canadian imports, ending those duties."),
    expect: /Authority prints a line|documented blank now carries a line/ },
  { name: "a shipped line rewritten",
    edit: (s) => s.replace("barred a substantially similar waiver.',\n    'S.J.Res. 18|119|gov_regulation'", "barred a similar waiver.',\n    'S.J.Res. 18|119|gov_regulation'"),
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
  console.error(`\n✗ search leaf effect lines: ${all.length} failure(s), ${live.pass} passed`);
  process.exit(1);
}
console.log(`\n✓ search leaf effect lines: all ${live.pass} assertions passed, ${MUTANTS.length} mutations caught`);
