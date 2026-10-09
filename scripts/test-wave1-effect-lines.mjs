#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-wave1-effect-lines.mjs — wave 1 of full coverage: plain sentences on the
// member-voted rows that already hold facts
// ─────────────────────────────────────────────────────────────────────────────
// Forty lines: the four school rows the search-leaves cap held back, then the
// widest-reaching member-voted rows still printing no line, on any leaf. Each is
// written from its own pair's stored `did` — H.Amdt. 257 alone, which has none,
// from its own stored title and the House roll that rejected it — and ends on
// the tally the vote seeds hold. Each is stored once on the measure-and-issue
// pair in _DOS_EFFECT.
//
// Rows left blank, and why — each is pinned below:
//   · facts only on another leaf: S.J.Res. 37 × Tariffs & Trade Authority and ×
//     Protect American Jobs (its description is on Household Prices); S.J.Res.
//     59 × Diplomacy & Restraint and × War Powers (on Peace Through Strength);
//     H.R. 29 × Mass Deportations and × State Standing (on the border and crime
//     leaves). Each has a bare number for a title.
//   · no facts on file at all: H.Amdt. 85, 87 and 97 and H.Con.Res. 14 (three
//     leaves) store no description anywhere and are titled by number alone.
//
//   1. SOURCE: every new line carries a term its own pair stores — its `did`, or,
//      for H.Amdt. 257, the measure's own title — and never another leaf's.
//   2. TALLY: it ends on the rolls the vote seeds hold, in the shape its outcome
//      allows.
//   3. TENSE: a failed act opens "Proposed" or "Would have"; any act with no
//      public law on file opens "Would" or "Proposed" — an amendment to a bill
//      that never became law included; an enacted act does not open "Would".
//   4. THE LINE RULE: one sentence, 140 characters or fewer, no method words, no
//      "PolitiDex", no ellipsis, never the title itself.
//   5. RENDERED, ROW BY ROW: on every leaf this wave touched, a row prints its
//      stored line and no other, a row with nothing stored prints no paragraph,
//      and Authority still prints nothing for S.J.Res. 37.
//   6. NOTHING SHIPPED WAS REWRITTEN: HEAD's _DOS_EFFECT lines — the forty from
//      the search-leaves pass among them — are unchanged, _DOS_EXEC_EFFECT is
//      byte-identical, and every row that printed at HEAD prints the same now.
//   7. MUTATIONS: a borrowed line, a failed act written as done, an amendment to
//      an unenacted bill written as done, a changed tally, an over-long line, a
//      method word, a title fallback, an Authority line and a rewritten line
//      from the last pass must each fail.
//
//   node scripts/test-wave1-effect-lines.mjs

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
  "public_schools", "edu_parental", "edu_college_cost", "school_choice",
  "states_federal_power", "permitting_reform", "tough_on_crime", "lgbtq_rights",
  "guard_authority", "lower_taxes", "cut_spending", "gov_regulation", "gov_services",
  "gun_rights", "econ_smallbiz", "econ_corp_account", "pro_life", "privacy_rights",
  "gov_transparency", "stock_trading_ban", "health_mental", "congress_oversight",
  "healthcare", "veterans",
  "tariffs_authority", "tariffs_prices", "econ_trade", "restraint", "war_powers",
  "deportations", "state_standing", "lands_preserve", "national_debt",
];
const BLANK = new Set([
  "S.J.Res. 37|119|tariffs_authority", "S.J.Res. 37|119|econ_trade",
  "S.J.Res. 59|119|restraint", "S.J.Res. 59|119|war_powers",
  "H.R. 29|119|deportations", "H.R. 29|119|state_standing",
  "H.Amdt. 97|119|lands_preserve", "H.Amdt. 85|119|lgbtq_rights", "H.Amdt. 87|119|lgbtq_rights",
  "H.Con.Res. 14|119|lower_taxes", "H.Con.Res. 14|119|national_debt", "H.Con.Res. 14|119|cut_spending",
]);
const CAP = 40;
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary|coded|coding|chip|mapped|mapping|filed as|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger)\b|PolitiDex|…|\.\.\./i;

// [a term the pair's own source holds, that source, the rolls the line ends on,
//  the closing shape]. "title" is used only where the pair stores no `did`.
const H = "house", S = "senate";
const SPEC = {
  "H.R. 1319|117|public_schools": ["Elementary and Secondary School Emergency Relief Fund", "did", [[H, 72], [S, 110]], "cleared"],
  "H.R. 1049|119|edu_parental": ["foreign influence", "did", [[H, 314]], "passed"],
  "H.R. 3746|118|edu_college_cost": ["student-loan payment", "did", [[H, 243], [S, 146]], "cleared"],
  "H.Amdt. 257|119|school_choice": ["school choice pilot program", "title", [[H, 269]], "rejected"],
  "H.Amdt. 196|119|states_federal_power": ["pesticide labeling", "did", [[H, 148]], "agreed"],
  "H.R. 4776|119|permitting_reform": ["standing", "did", [[H, 356]], "passed"],
  "H.R. 3668|119|permitting_reform": ["natural-gas import and export", "did", [[H, 334]], "passed"],
  "H.R. 3898|119|permitting_reform": ["water-quality certification", "did", [[H, 330]], "passed"],
  "H.R. 5214|119|tough_on_crime": ["pretrial detention", "did", [[H, 298]], "passed"],
  "H.R. 3062|119|permitting_reform": ["certificate of crossing", "did", [[H, 277]], "passed"],
  "H.R. 5140|119|tough_on_crime": ["adult court", "did", [[H, 271]], "passed"],
  "H.R. 4922|119|tough_on_crime": ["from 24 to 18", "did", [[H, 270]], "passed"],
  "H.Amdt. 81|119|tough_on_crime": ["six months to two years", "did", [[H, 252]], "agreed"],
  "H.Amdt. 89|119|lgbtq_rights": ["single-sex facility", "did", [[H, 249]], "agreed"],
  "H.Amdt. 88|119|lgbtq_rights": ["gender identity", "did", [[H, 248]], "agreed"],
  "H.Amdt. 86|119|lgbtq_rights": ["TRICARE", "did", [[H, 246]], "agreed"],
  "S. 1071|119|guard_authority": ["full-time National Guard members", "did", [[H, 320], [S, 648]], "cleared"],
  "H.R. 1|119|lower_taxes": ["$2,200", "did", [[H, 190], [S, 372]], "cleared"],
  "H.R. 1|119|cut_spending": ["from 55 to 65", "did", [[H, 190], [S, 372]], "cleared"],
  "H.R. 6955|119|gov_regulation": ["risk profile", "did", [[H, 271]], "passed"],
  "H.R. 8595|119|gov_services": ["State Department", "did", [[H, 247]], "passed"],
  "H.R. 1181|119|gun_rights": ["merchant category code", "did", [[H, 240]], "passed"],
  "H.R. 6955|119|econ_smallbiz": ["three-year capital phase-in", "did", [[H, 271]], "passed"],
  "H.R. 6955|119|econ_corp_account": ["monopolistic", "did", [[H, 271]], "passed"],
  "H.R. 8595|119|pro_life": ["method of family planning", "did", [[H, 247]], "passed"],
  "H.R. 1181|119|privacy_rights": ["shopped at a gun store", "did", [[H, 240]], "passed"],
  "H.R. 7008|119|gov_transparency": ["seven to fourteen days", "did", [[H, 280]], "passed"],
  "H.R. 7008|119|stock_trading_ban": ["individual stocks", "did", [[H, 280]], "passed"],
  "H.R. 1181|119|states_federal_power": ["merchant category codes", "did", [[H, 240]], "passed"],
  "S. 331|119|health_mental": ["registration pathway", "did", [[H, 166], [S, 127]], "cleared"],
  "S. 331|119|tough_on_crime": ["100 grams", "did", [[H, 166], [S, 127]], "cleared"],
  "S. 2|119|tough_on_crime": ["$7.45 billion", "did", [[H, 214], [S, 163]], "cleared"],
  "H.R. 7888|118|privacy_rights": ["abouts", "did", [[H, 119], [S, 150]], "cleared"],
  "H.R. 7888|118|congress_oversight": ["reporting exemption", "did", [[H, 119], [S, 150]], "cleared"],
  "H.R. 3746|118|gov_services": ["SNAP work-requirement age", "did", [[H, 243], [S, 146]], "cleared"],
  "H.R. 3746|118|permitting_reform": ["lead agency", "did", [[H, 243], [S, 146]], "cleared"],
  "H.R. 2670|118|privacy_rights": ["April 19, 2024", "did", [[H, 723], [S, 343]], "cleared"],
  "S. 3373|117|healthcare": ["burn pits", "did", [[H, 309], [S, 280]], "cleared"],
  "S. 3373|117|veterans": ["service connection", "did", [[H, 309], [S, 280]], "cleared"],
  "S. 2938|117|gun_rights": ["under-21", "did", [[H, 299], [S, 242]], "cleared"],
};
// Where a line restates its term in other words, the words it may use instead.
const ALSO = {
  "S. 3373|117|veterans": ["service-connection"],
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
  if (!lost && !ENACTED.has(act) && !would) return "an act that never became law is written as though it took effect";
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
  // Lines a later wave wrote on these leaves, read from that wave's own block in
  // _DOS_EFFECT and held by that wave's own test.
  const later = (() => {
    const a = src.indexOf("// WAVE 2 OF FULL COVERAGE (v319)");
    if (a < 0) return new Set();
    return new Set([...src.slice(a, src.indexOf("\n  };", a)).matchAll(/^    '([^']+)':$/gm)].map((m) => m[1]));
  })();
  for (const k of Object.keys(E.map)) {
    if (!KEYS.includes(k.split("|")[2]) || k in SPEC || later.has(k)) continue;
    ok(k in headE, `${k}: a line on a wave-1 leaf with no source in this pass`);
  }

  // ── blanks, and the two tariff leaves ──────────────────────────────────────
  for (const p of BLANK) {
    ok(!E.map[p] && !rowRule(M.map[p] && M.map[p].did), `${p}: the documented blank now carries a line — move it out of BLANK with its source`);
  }
  ok(!effOn.get("S.J.Res. 37|119|tariffs_authority"), "Tariffs & Trade Authority prints a line for S.J.Res. 37");
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
const ADD_AT = "    'H.R. 1319|117|public_schools':\n";
const add = (pair, line) => (s) => s.replace(ADD_AT, `    '${pair}':\n      '${line.replace(/'/g, "\\'")}',\n` + ADD_AT);
const MUTANTS = [
  { name: "a line borrowed from another leaf for the same act",
    edit: swap("H.R. 7888|118|privacy_rights", "Reauthorized section 702 foreign-intelligence collection for two years; the House cleared it 273-147, the Senate 60-34."),
    expect: /borrowed from/ },
  { name: "a failed act written as if it took effect",
    edit: swap("H.Amdt. 257|119|school_choice", "Created a Defense Department school choice pilot program for members of the Armed Forces; the House rejected it 214-216."),
    expect: /failed act is written as though it took effect/ },
  { name: "an amendment to a bill that never became law written as done",
    edit: swap("H.Amdt. 86|119|lgbtq_rights", "Barred TRICARE from covering gender-related medical treatment, with narrow exceptions; the House agreed to it 221-207."),
    expect: /never became law is written as though it took effect/ },
  { name: "the tally changed",
    edit: swap("H.R. 5140|119|tough_on_crime", "Would send District minors 14 and older charged with listed violent offences to adult court; the House passed it 225-230."),
    expect: /recorded tally/ },
  { name: "a line over 140 characters",
    edit: swap("H.R. 7008|119|stock_trading_ban", "Would bar members of Congress, their spouses and their dependent children from buying any individual stocks at all; the House passed it 232-198."),
    expect: /characters/ },
  { name: "a method word in a line",
    edit: swap("S. 3373|117|healthcare", "Opened VA health care to veterans exposed to burn pits, scored as Agent Orange relief; the House cleared it 342-88, the Senate 86-11."),
    expect: /method word/ },
  { name: "title used as a fallback when nothing is stored",
    edit: (s) => s.replace("return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '');",
      "return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '') || String(item.shortTitle || item.title || '');"),
    expect: /has nothing stored but prints/ },
  { name: "an Authority line lifted from the Household Prices facts",
    edit: add("S.J.Res. 37|119|tariffs_authority", "Terminated the national emergency declaration that is the legal basis for the tariffs on Canadian imports, ending those duties."),
    expect: /Authority prints a line|documented blank now carries a line/ },
  { name: "one of the last pass's forty lines rewritten",
    edit: swap("S. 2|119|border_security", "Funded Border Patrol agents and port surveillance; the House cleared it 214-212, the Senate 52-47."),
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
  console.error(`\n✗ wave 1 effect lines: ${all.length} failure(s), ${live.pass} passed`);
  process.exit(1);
}
console.log(`\n✓ wave 1 effect lines: all ${live.pass} assertions passed, ${MUTANTS.length} mutations caught`);
