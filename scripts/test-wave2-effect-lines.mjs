#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-wave2-effect-lines.mjs — wave 2 of full coverage: forty more rows that
// store their own description
// ─────────────────────────────────────────────────────────────────────────────
// The next forty member-voted rows by reach that store a `did` on their own pair
// and still printed no line. Each is written from that `did` alone — no title is
// a source in this wave — and ends on the tally the vote seeds hold, stored once
// on the measure-and-issue pair in _DOS_EFFECT.
//
//   1. SOURCE: every new line carries a term its own pair's `did` stores, and is
//      no other leaf's line or description for the same act.
//   2. TALLY: it ends on the rolls the vote seeds hold, in the shape its outcome
//      allows.
//   3. TENSE: a failed act opens "Proposed" or "Would have"; any act with no
//      public law on file opens "Would" or "Proposed"; an enacted act does not.
//   4. THE LINE RULE: one sentence, 140 characters or fewer, no method words, no
//      "PolitiDex", no ellipsis, never the title itself.
//   5. RENDERED, ROW BY ROW: on every leaf this wave touched, a row prints its
//      stored line and no other; the six rows with nothing on file anywhere print
//      no paragraph; the pointer table is byte-identical to HEAD.
//   6. NOTHING SHIPPED WAS REWRITTEN: HEAD's _DOS_EFFECT lines are unchanged,
//      _DOS_EXEC_EFFECT is byte-identical, and every row that printed at HEAD
//      prints the same now.
//   7. MUTATIONS: a borrowed line, a failed act written as done, a one-chamber
//      bill written as law, a changed tally, an over-long line, a method word, a
//      title fallback, a pointer edited and a rewritten wave-1 line must each fail.
//
//   node scripts/test-wave2-effect-lines.mjs

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
  "gun_safety",
  "health_mental",
  "econ_growth",
  "tech_innovation",
  "econ_corp_account",
  "health_drug_prices",
  "healthcare_costs",
  "national_debt",
  "lgbtq_rights",
  "states_federal_power",
  "cost_living",
  "econ_smallbiz",
  "econ_workers",
  "family_support",
  "gov_services",
  "broadband",
  "infrastructure",
  "transit",
  "state_standing",
  "tough_on_crime",
  "cut_spending",
  "gov_waste",
  "election_integrity",
  "election_security",
  "voter_id",
  "voting_access",
  "foreign_balance",
  "gov_transparency",
  "lands_preserve",
  "lower_taxes",
  "tariffs_authority",
  "econ_trade",
  "restraint",
  "war_powers",
  "deportations",
];
// The six rows with no description anywhere still print nothing.
const BLANK = new Set([
  "H.Amdt. 97|119|lands_preserve", "H.Amdt. 85|119|lgbtq_rights", "H.Amdt. 87|119|lgbtq_rights",
  "H.Con.Res. 14|119|lower_taxes", "H.Con.Res. 14|119|national_debt", "H.Con.Res. 14|119|cut_spending",
]);
const CAP = 40;
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary|coded|coding|chip|mapped|mapping|filed as|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger)\b|PolitiDex|…|\.\.\./i;

// [a term the pair's own source holds, that source, the rolls the line ends on,
//  the closing shape]. "title" is used only where the pair stores no `did`.
const H = "house", S = "senate";
const SPEC = {
  "S. 2938|117|gun_safety": ["straw purchasing", "did", [[H, 299], [S, 242]], "cleared"],
  "S. 2938|117|health_mental": ["children’s and family mental-health services", "did", [[H, 299], [S, 242]], "cleared"],
  "H.R. 4346|117|econ_growth": ["semiconductor plants", "did", [[H, 404], [S, 271]], "cleared"],
  "H.R. 4346|117|tech_innovation": ["CHIPS for America Fund", "did", [[H, 404], [S, 271]], "cleared"],
  "H.R. 5376|117|econ_corp_account": ["15% minimum tax", "did", [[H, 420], [S, 325]], "cleared"],
  "H.R. 5376|117|health_drug_prices": ["insulin cost sharing", "did", [[H, 420], [S, 325]], "cleared"],
  "H.R. 5376|117|healthcare_costs": ["premium tax credits through 2025", "did", [[H, 420], [S, 325]], "cleared"],
  "H.R. 5376|117|national_debt": ["Deficit Reduction", "did", [[H, 420], [S, 325]], "cleared"],
  "H.R. 8404|117|lgbtq_rights": ["Defense of Marriage Act", "did", [[H, 513], [S, 362]], "cleared"],
  "H.R. 8404|117|states_federal_power": ["another state’s marriage record", "did", [[H, 513], [S, 362]], "cleared"],
  "H.R. 1319|117|cost_living": ["rental and utility", "did", [[H, 72], [S, 110]], "cleared"],
  "H.R. 1319|117|econ_smallbiz": ["Restaurant Revitalization Fund", "did", [[H, 72], [S, 110]], "cleared"],
  "H.R. 1319|117|econ_workers": ["September 2021", "did", [[H, 72], [S, 110]], "cleared"],
  "H.R. 1319|117|family_support": ["$3,600", "did", [[H, 72], [S, 110]], "cleared"],
  "H.R. 1319|117|healthcare_costs": ["COBRA", "did", [[H, 72], [S, 110]], "cleared"],
  "H.R. 3076|117|gov_services": ["six-day delivery", "did", [[H, 38], [S, 71]], "cleared"],
  "H.R. 3684|117|broadband": ["Broadband Equity, Access, and Deployment", "did", [[H, 369], [S, 314]], "cleared"],
  "H.R. 3684|117|infrastructure": ["roads and bridges", "did", [[H, 369], [S, 314]], "cleared"],
  "H.R. 3684|117|transit": ["freight rail", "did", [[H, 369], [S, 314]], "cleared"],
  "S. 5|119|state_standing": ["more than $100", "did", [[H, 23], [S, 7]], "cleared"],
  "S. 5|119|tough_on_crime": ["arrest or charge", "did", [[H, 23], [S, 7]], "cleared"],
  "H.R. 4|119|cut_spending": ["unobligated balances", "did", [[H, 168], [S, 411]], "cleared"],
  "H.R. 4|119|gov_waste": ["$9 billion", "did", [[H, 168], [S, 411]], "cleared"],
  "H.R. 4|119|national_debt": ["$9.4 billion", "did", [[H, 168], [S, 411]], "cleared"],
  "H.R. 22|119|election_integrity": ["documentary proof", "did", [[H, 102]], "passed"],
  "H.R. 22|119|election_security": ["federal databases", "did", [[H, 102]], "passed"],
  "H.R. 22|119|voter_id": ["REAL ID", "did", [[H, 102]], "passed"],
  "H.R. 22|119|voting_access": ["documentary proof of citizenship a precondition", "did", [[H, 102]], "passed"],
  "H.R. 192|118|election_security": ["non-citizens", "did", [[H, 232]], "passed"],
  "H.R. 8035|118|foreign_balance": ["already transferred", "did", [[H, 151]], "passed"],
  "H.R. 8281|118|election_security": ["documentary proof of U.S. citizenship", "did", [[H, 345]], "passed"],
  "H.R. 8281|118|states_federal_power": ["every registration channel", "did", [[H, 345]], "passed"],
  "H.R. 8281|118|voting_access": ["in person at an election office", "did", [[H, 345]], "passed"],
  "S. 1383|119|election_security": ["physical photo ID", "did", [[H, 69]], "passed"],
  "S. 1383|119|voting_access": ["provisional ballot", "did", [[H, 69]], "passed"],
  "H.R. 6126|118|cut_spending": ["$14.3 billion", "did", [[H, 577]], "passed"],
  "H.R. 3486|119|tough_on_crime": ["five-year mandatory minimum", "did", [[H, 264]], "passed"],
  "H.R. 4405|119|gov_transparency": ["Epstein", "did", [[H, 289]], "passed"],
  "H.R. 884|119|election_security": ["voting in a District", "did", [[H, 163]], "passed"],
  "H.Amdt. 235|119|cut_spending": ["Foreign Military Financing Program account by $3.3 billion", "did", [[H, 243]], "rejected"],
};
const ALSO = {};

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
  for (const k of Object.keys(E.map)) {
    if (!KEYS.includes(k.split("|")[2]) || k in SPEC) continue;
    ok(k in headE, `${k}: a line on a wave-2 leaf with no source in this pass`);
  }

  // ── blanks, and the two tariff leaves ──────────────────────────────────────
  for (const p of BLANK) {
    ok(!E.map[p] && !rowRule(M.map[p] && M.map[p].did), `${p}: the documented blank now carries a line — move it out of BLANK with its source`);
  }
  ok(!effOn.get("S.J.Res. 37|119|tariffs_authority"), "Tariffs & Trade Authority prints a line for S.J.Res. 37");
  ok(!M.map["S.J.Res. 37|119|tariffs_authority"], "S.J.Res. 37 now stores a did on Authority — its line can be written from that");

  // ── the pointer table is untouched ─────────────────────────────────────────
  const ptrTable = (x) => (String(x || "").match(/var _DOS_POINTER = \{[\s\S]*?\n  \};/) || [""])[0];
  ok(!!ptrTable(src), "the pointer table is not in consistency.js");
  if (headSrc) ok(ptrTable(src) === ptrTable(headSrc), "the pointer table changed");

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
const ADD_AT = "    'S. 2938|117|gun_safety':\n";
const add = (pair, line) => (s) => s.replace(ADD_AT, `    '${pair}':\n      '${line.replace(/'/g, "\\'")}',\n` + ADD_AT);
const MUTANTS = [
  { name: "a line borrowed from another leaf for the same act",
    edit: swap("H.R. 3684|117|infrastructure", "Funded drinking-water and wastewater systems, lead pipe removal and Western water storage; the House cleared it 228-206, the Senate 69-30."),
    expect: /borrowed from/ },
  { name: "a failed act written as if it took effect",
    edit: swap("H.Amdt. 235|119|cut_spending", "Cut the Foreign Military Financing Program account by $3.3 billion; the House rejected it 104-314."),
    expect: /failed act is written as though it took effect/ },
  { name: "a one-chamber bill written as law",
    edit: swap("H.R. 22|119|voter_id", "Required a passport, a citizenship-showing REAL ID, or a birth certificate with photo ID to register; the House passed it 220-208."),
    expect: /never became law is written as though it took effect/ },
  { name: "the tally changed",
    edit: swap("H.R. 884|119|election_security", "Would bar anyone who is not a U.S. citizen from voting in a District of Columbia election; the House passed it 266-184."),
    expect: /recorded tally/ },
  { name: "a line over 140 characters",
    edit: swap("H.R. 4|119|gov_waste", "Returned roughly $9 billion of enacted budget authority to the Treasury unspent, from foreign aid and public broadcasting; the House cleared it 214-212, the Senate 51-48."),
    expect: /characters/ },
  { name: "a method word in a line",
    edit: swap("H.R. 3076|117|gov_services", "Ended the Postal Service’s retiree health prepayment, scored as six-day delivery; the House cleared it 342-92, the Senate 79-19."),
    expect: /method word/ },
  { name: "title used as a fallback when nothing is stored",
    edit: (s) => s.replace("return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '');",
      "return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '') || String(item.shortTitle || item.title || '');"),
    expect: /has nothing stored but prints/ },
  { name: "a pointer edited",
    edit: (s) => s.replace("'S.J.Res. 37|119|econ_trade': ['tariffs_prices'],", "'S.J.Res. 37|119|econ_trade': ['tariffs_prices', 'tariffs_authority'],"),
    expect: /pointer table changed/ },
  { name: "one of wave 1's forty lines rewritten",
    edit: swap("H.R. 7008|119|stock_trading_ban", "Would bar members of Congress from buying individual stocks; the House passed it 232-198."),
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
  console.error(`\n✗ wave 2 effect lines: ${all.length} failure(s), ${live.pass} passed`);
  process.exit(1);
}
console.log(`\n✓ wave 2 effect lines: all ${live.pass} assertions passed, ${MUTANTS.length} mutations caught`);
