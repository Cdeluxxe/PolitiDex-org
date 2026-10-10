#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-wave3-effect-lines.mjs — wave 3 of full coverage: no row that stores its
// own description is mute
// ─────────────────────────────────────────────────────────────────────────────
// After wave 2 and the rider rows, thirty-five member-voted pairs still stored a
// `did` too long or too many sentences to stand under a row, and still printed no
// line: 3,246 member rows that showed a reader only a date, a number and a vote.
// Each now has one sentence, written from that pair's own `did` alone — no title
// is a source in this wave — ending on the tally on file, and stored once in
// _DOS_EFFECT under the measure's own identity (number | sitting | issue).
//
//   1. SOURCE: every new line carries a term its own pair's `did` stores, and is
//      no other leaf's line or stored description for the same act.
//   2. TALLY: it ends on the roll the vote seeds hold, in the shape its outcome
//      allows. A recommit-only roll ends on that roll and names it.
//   3. TENSE: a public law on file reads as done; a House resolution the House
//      agreed to reads as done; any other act that carried opens "Would"; a
//      failed act opens "Proposed" or "Would have" — including one that drew a
//      majority short of its threshold.
//   4. THE LINE RULE: one sentence, 140 characters or fewer, no method words, no
//      "PolitiDex", no ellipsis, never the title itself.
//   5. IDENTITY: every key in the table names a sitting — a congress or a state
//      session code — and none is a "|null|" or "|undefined|" key.
//   6. RENDERED, ROW BY ROW: on every leaf this wave touched, each row prints its
//      stored line and no other; across every leaf with a stored `did`, no row
//      that stores one is mute; and every pointer names each sibling leaf that
//      has a line, still quoting the line it quoted at HEAD.
//   7. NOTHING SHIPPED WAS REWRITTEN: HEAD's _DOS_EFFECT lines are unchanged,
//      _DOS_MECH, _DOS_EXEC_EFFECT and _DOS_POINTER are byte-identical, and every
//      effect paragraph printed at HEAD prints the same now.
//   8. MUTATIONS: a borrowed line, a failed act written as done, a majority-short
//      amendment written as done, a one-chamber bill written as law, an enacted
//      act written as unfinished, an agreed House resolution written as pending,
//      a recommit roll written as passage, an over-long line, a method word, a
//      line missing its own term, a null sitting, a row left mute, a pointer that
//      drops a sibling, and a rewritten wave-2 line must each fail.
//
//   node scripts/test-wave3-effect-lines.mjs

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
const MARK = "// WAVE 3 OF FULL COVERAGE (v322)";
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary|coded|coding|chip|mapped|mapping|filed as|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger)\b|PolitiDex|…|\.\.\./i;

// [a term the pair's own `did` holds, the roll the line ends on, the closing shape].
const H = "house", S = "senate";
const SPEC = {
  "H.R. 5408|119|econ_workers": ["arbitration panel", [H, 216], "passed"],
  "H.Con.Res. 113|119|national_debt": ["reconciliation", [H, 281], "agreed"],
  "H.R. 7148|119|health_drug_prices": ["100 percent of drug rebates", [H, 53], "concurred"],
  "H.Amdt. 261|119|privacy_rights": ["speed-enforcement camera", [H, 275], "agreed"],
  "H.R. 1041|119|gun_safety": ["fiduciary", [H, 190], "passed"],
  "H.R. 1041|119|gun_rights": ["danger to themselves or others", [H, 190], "passed"],
  "H.R. 7148|119|health_rural": ["Medicare-Dependent Hospital", [H, 53], "concurred"],
  "H.Amdt. 236|119|cut_spending": ["Foreign Military Financing", [H, 244], "rejected"],
  "H.R. 7148|119|pro_life": ["abortion-funding restrictions", [H, 53], "concurred"],
  "H.Res. 1399|119|gov_transparency": ["sexual harassment", [H, 233], "agreed"],
  "H.R. 9237|119|veterans": ["concurrent receipt", [H, 249], "recommit"],
  "H.R. 7148|119|foreign_balance": ["$6.2 billion in Foreign Military Financing", [H, 53], "concurred"],
  "H.R. 7757|119|tech_balance": ["AI chatbot", [H, 228], "passed"],
  "H.R. 8884|119|social_security": ["disability-insurance demonstration projects", [H, 283], "passed"],
  "H.Amdt. 266|119|cut_spending": ["200,000 civilian positions", [H, 276], "rejected"],
  "H.Amdt. 242|119|gov_transparency": ["Afghanistan War Commission", [H, 255], "rejected"],
  "H.R. 1|117|voting_access": ["same-day registration", [H, 62], "passed"],
  "H.R. 5746|117|voting_access": ["drop boxes", [H, 9], "passed"],
  "H.R. 4|117|voting_access": ["photo-ID rules", [H, 260], "passed"],
  "H.R. 4|117|states_federal_power": ["preclearance", [H, 260], "passed"],
  "H.R. 1|117|gov_transparency": ["ten years of tax returns", [H, 62], "passed"],
  "H.R. 29|119|tough_on_crime": ["shoplifting", [H, 6], "passed"],
  "S.J.Res. 7|119|broadband": ["Wi-Fi hotspots", [S, 238], "passed"],
  "S.Amdt. 3535|119|congress_oversight": ["inspector general", [S, 563], "threshold"],
  "S.Amdt. 3535|119|audit_spending": ["internal auditor", [S, 563], "threshold"],
  "H.R. 815|118|foreign_balance": ["three theatres", [S, 154], "concurred"],
  "H.R. 815|118|tech_balance": ["Foreign Adversary Controlled Applications", [S, 154], "concurred"],
  "H.R. 6329|119|gov_transparency": ["best reasonably available evidence", [H, 71], "passed"],
  "S. 2296|119|back_police": ["COPS Strong Communities Program", [S, 570], "passed"],
  "H.R. 2965|119|gov_regulation": ["regulatory budget", [H, 310], "passed"],
  "H.R. 4305|119|gov_regulation": ["Red Tape Hotline", [H, 311], "passed"],
  "H.J.Res. 78|119|gov_regulation": ["longfin smelt", [H, 113], "passed"],
  "H.R. 1049|119|gov_transparency": ["foreign influence", [H, 314], "passed"],
  "H.R. 2965|119|econ_smallbiz": ["offset", [H, 310], "passed"],
  "H.R. 4305|119|econ_smallbiz": ["burden of complying", [H, 311], "passed"],
};
const KEYS = [...new Set(Object.keys(SPEC).map((k) => k.split("|")[2]))];

// Every recorded roll, by (number, congress, chamber, roll): tally, result, question.
const ROLL = (() => {
  const t = {};
  for (const f of readdirSync(join(ROOT, "db")).filter((x) => x.endsWith(".json")).sort()) {
    let j; try { j = JSON.parse(R(`db/${f}`)); } catch { continue; }
    for (const v of j.votes || []) {
      const num = typeof v.measure === "string" ? v.measure : v.measure && v.measure.number;
      if (!num || v.rollNumber == null || !v.chamber) continue;
      const k = `${num}|${v.congress}|${v.chamber}|${v.rollNumber}`;
      let tl = null;
      if (v.totals && v.totals.yea != null) tl = [v.totals.yea, v.totals.nay];
      else if (v.partyTotals) {
        const P = Object.values(v.partyTotals);
        if (P.length) tl = [P.reduce((n, p) => n + p.yea, 0), P.reduce((n, p) => n + p.nay, 0)];
      }
      if (!tl) continue;
      if (!t[k] || (v.totals && v.totals.yea != null)) t[k] = { tl, res: String(v.result || t[k]?.res || ""), q: String(v.question || t[k]?.q || "") };
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
  try { return execFileSync("git", ["show", "HEAD:consistency.js"], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
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
// The drawer's own row rule (_dosEffectOk) for a pair's short `did`.
const rowRule = (raw) => {
  const s = norm(raw);
  if (!s || s.length > 140 || !/[.!?]$/.test(s)) return "";
  if (/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "";
  return s;
};
const pairOf = (it, k) => {
  const num = String(it.number == null ? "" : it.number).trim();
  const sit = typeof it.congress === "number" ? it.congress : (it.measureIdent && it.measureIdent.session) || "";
  return `${num}|${sit}|${k}`;
};

// One line against its own pair's facts.
function lineFault(k, v, E, M, titles) {
  const s = norm(v);
  if (s.length > 140) return `${s.length} characters`;
  if (!/[.!?]$/.test(s)) return "does not end on a stop";
  if (/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "more than one sentence";
  const mw = s.match(METHOD);
  if (mw) return `method word: ${mw[0]}`;
  const [num, cong] = k.split("|"), act = `${num}|${cong}`;
  if (!/^\d+$/.test(cong)) return `the sitting "${cong}" is not a congress`;
  if ((titles.get(num) || new Set()).has(s.replace(/[.!?]$/, "").toLowerCase())) return "the line is the measure's title";
  for (const [j, w] of Object.entries(E)) {
    if (j !== k && j.startsWith(act + "|") && norm(w) === s) return `borrowed from ${j}`;
  }
  for (const [j, m] of Object.entries(M)) {
    if (j !== k && j.startsWith(act + "|") && m && m.did && norm(m.did).includes(s.replace(/[.!?]$/, ""))) return `borrowed from ${j}'s stored did`;
  }
  const sp = SPEC[k];
  if (!sp) return "names no source the pair stores";
  const [term, [ch, r], shape] = sp;
  const own = norm(M[k] && M[k].did);
  if (!own) return "the pair stores no did to write from";
  if (!own.includes(term)) return `the term "${term}" is not in this pair's own did`;
  if (!s.includes(term)) return `the line does not carry its source term "${term}"`;
  const roll = ROLL[`${num}|${cong}|${ch}|${r}`];
  if (!roll) return "the vote seeds hold no tally for its roll";
  const [a, b] = roll.tl;
  const recommit = /recommit/i.test(roll.q);
  if ((shape === "recommit") !== recommit) return "the roll it ends on is not the shape it claims (recommit)";
  const lost = !recommit && (/^(?:failed|rejected|not_agreed)/i.test(roll.res) || (!roll.res && a < b));
  const done = ENACTED.has(act) || (/^H\.Res\./.test(num) && !lost);
  const failedStart = /^(?:Proposed|Would have)\b/.test(s), would = /^(?:Would|Proposed)\b/.test(s);
  if (lost && !failedStart) return "a failed act is written as though it took effect";
  if (!lost && done && would) return "an act that took effect is written as though it did not";
  if (!lost && !done && !/^Would\b/.test(s)) return "an act that never became law is written as though it took effect";
  const C = ch === H ? "House" : "Senate";
  const tail = shape === "concurred" ? `; the ${C} concurred ${a}-${b}.`
    : shape === "passed" ? `; the ${C} passed it ${a}-${b}.`
    : shape === "agreed" ? `; the ${C} agreed to it ${a}-${b}.`
    : shape === "rejected" ? `; the ${C} rejected it ${a}-${b}.`
    : shape === "recommit" ? `; a motion to recommit it failed in the ${C} ${a}-${b}.`
    : `; it failed ${a}-${b} under a three-fifths threshold.`;
  if (shape === "threshold" && !(lost && a > b)) return "a threshold close on a roll that was not a majority short of its bar";
  return s.endsWith(tail) ? "" : `does not end on the recorded tally (${tail.slice(2)})`;
}

function check(src, base) {
  const faults = [];
  let pass = 0;
  const ok = (c, m) => { if (c) pass++; else faults.push(m); };
  const E = mapOf(src, "_DOS_EFFECT"), X = mapOf(src, "_DOS_EXEC_EFFECT"), M = mapOf(src, "_DOS_MECH"), P = mapOf(src, "_DOS_POINTER");
  if (!E || !X || !M || !P) return { faults: ["effect maps not found in consistency.js"], pass, printed: new Map(), ptrs: new Map() };
  const win = boot(src);
  if (win.__err) return { faults: [`boot: ${win.__err}`], pass, printed: new Map(), ptrs: new Map() };
  const CS = win.PDXConsistency;
  const titles = new Map();
  const addTitle = (n, t) => { if (!n || !t) return; const k = String(n).trim(); if (!titles.has(k)) titles.set(k, new Set()); titles.get(k).add(norm(t).replace(/[.!?]$/, "").toLowerCase()); };
  for (const m of R("bills-index.js").matchAll(/number:\s*'([^']+)',\s*title:\s*'([^']*)'(?:,\s*shortTitle:\s*'([^']*)')?/g)) { addTitle(m[1], m[2]); addTitle(m[1], m[3]); }

  // ── 5 · identity ───────────────────────────────────────────────────────────
  for (const k of Object.keys(E.map)) {
    ok(/^[^|]+\|(?:\d+|\d{4}[A-Z0-9]+)\|[a-z0-9_]+$/.test(k) && !/\|(?:null|undefined)\|/.test(k), `${k}: a line keyed without a real sitting`);
  }

  // ── 6 · rendered, row by row, on every leaf that stores a did ─────────────
  const leaves = new Set(Object.keys(M.map).map((k) => k.split("|")[2]));
  for (const k of Object.keys(P.map)) leaves.add(k.split("|")[2]);
  const printed = new Map(), ptrs = new Map(), seen = new Set();
  let mute = 0, backed = 0;
  for (const pid of Object.keys(win.CMP_DATA)) {
    for (const k of leaves) {
      let items = [], html = "";
      try { items = CS.dossierItems(pid, k) || []; } catch { continue; }
      if (!items.length) continue;
      try { html = CS.dossierLedgerHtml(pid, k) || ""; } catch { html = ""; }
      const effs = new Map(), prs = new Map();
      for (const m of html.matchAll(/<tr class="pdxlg-effr" data-pdxlg-effr="(\d+)">([\s\S]*?)<\/tr>/g)) effs.set(Number(m[1]), (effs.get(Number(m[1])) || []).concat(dec(m[2])));
      for (const m of html.matchAll(/<tr class="pdxlg-ptrr" data-pdxlg-ptrr="(\d+)">([\s\S]*?)<\/tr>/g)) prs.set(Number(m[1]), dec(m[2]));
      for (const m of html.matchAll(/<tr data-pdxlg-row="(\d+)">/g)) {
        const i = Number(m[1]), d = items[i], it = (d && d.item) || {};
        if (!d || d.lane === "exec") continue;
        addTitle(it.number, it.title); addTitle(it.number, it.shortTitle);
        const pair = pairOf(it, k), got = effs.get(i) || [];
        seen.add(pair);
        if (got.length) printed.set(`${pid}|${pair}`, got[0]);
        if (prs.has(i)) ptrs.set(`${pid}|${pair}`, prs.get(i));
        const did = norm(M.map[pair] && M.map[pair].did);
        if (did) { backed++; if (!got.length && !prs.has(i)) { mute++; ok(false, `${pid} × ${k}: ${pair} stores a description and is mute`); } }
        if (!KEYS.includes(k)) continue;
        const want = E.map[pair] || rowRule(did);
        ok(got.length <= 1, `${pid} × ${k}: ${pair} prints ${got.length} effect paragraphs`);
        if (want) ok(got.length === 1 && got[0] === norm(want), `${pid} × ${k}: ${pair} prints ${JSON.stringify(got)}, stored ${JSON.stringify(want)}`);
        else ok(got.length === 0, `${pid} × ${k}: ${pair} has nothing stored but prints ${JSON.stringify(got[0])}`);
      }
      // A pointer names every sibling leaf it lists that is mapped and has a line.
      for (const [i, line] of prs) {
        const d = items[i], it = (d && d.item) || {}, pair = pairOf(it, k);
        const to = P.map[pair] || [], act = pair.split("|").slice(0, 2).join("|");
        const mapped = new Set((it.issues || []).map((x) => x && x.issueKey));
        const lit = to.filter((l) => l !== k && mapped.has(l) && (E.map[`${act}|${l}`] || rowRule(M.map[`${act}|${l}`] && M.map[`${act}|${l}`].did)));
        const m = /^Same act, filed on (.+?)(?: \(also filed on (.+?)\))?: (.+)$/.exec(line);
        const named = m ? 1 + (m[2] ? m[2].split(" and ").length : 0) : 0;
        ok(named === lit.length, `${pid} × ${k}: the pointer on ${pair} names ${named} leaf/leaves, ${lit.length} sibling(s) have a line`);
      }
    }
  }
  ok(backed > 1000, `only ${backed} description-backed rows — the sweep did not reach the store`);

  // ── 1–4 · every line this wave wrote, against its own facts ───────────────
  const block = (() => {
    const a = src.indexOf(MARK);
    if (a < 0) return [];
    return [...src.slice(a, src.indexOf("\n  };", a)).matchAll(/^    '([^']+)':$/gm)].map((m) => m[1]);
  })();
  ok(block.length > 0, "the wave-3 block is not in _DOS_EFFECT");
  for (const k of block) ok(k in SPEC, `${k}: a wave-3 line with no source in this test`);
  for (const k of Object.keys(SPEC)) {
    ok(k in E.map, `${k}: the line this wave wrote is missing`);
    if (k in E.map) { const f = lineFault(k, E.map[k], E.map, M.map, titles); ok(f === "", `${k}: ${f}`); }
    ok(seen.has(k), `${k}: no member row carries this pair — the line has nowhere to print`);
  }

  // ── 7 · nothing shipped was rewritten ─────────────────────────────────────
  if (headSrc) {
    const HE = mapOf(headSrc, "_DOS_EFFECT");
    for (const [p, v] of Object.entries(HE.map)) ok(E.map[p] === v, `${p}: a shipped line was rewritten or removed`);
    for (const k of Object.keys(E.map)) ok(k in HE.map || block.includes(k), `${k}: a new line outside the wave-3 block`);
    for (const name of ["_DOS_MECH", "_DOS_EXEC_EFFECT", "_DOS_POINTER"]) {
      ok(mapOf(src, name).text === mapOf(headSrc, name).text, `${name} is not byte-identical to HEAD`);
    }
    if (base) {
      for (const [r, v] of base.printed) ok(printed.get(r) === v, `${r}: printed ${JSON.stringify(v)} at HEAD and now prints ${JSON.stringify(printed.get(r) || "")}`);
      // A pointer may name one more sibling; the line it quotes does not move.
      const quoted = (x) => String(x || "").replace(/^.*?\): |^Same act, filed on [^:]+: /, "");
      for (const [r, v] of base.ptrs) ok(ptrs.has(r) || printed.has(r), `${r}: printed a pointer at HEAD and now prints nothing`);
      for (const [r, v] of base.ptrs) if (ptrs.has(r)) ok(quoted(ptrs.get(r)) === quoted(v), `${r}: the pointer quoted ${JSON.stringify(quoted(v))} at HEAD and now quotes ${JSON.stringify(quoted(ptrs.get(r)))}`);
    }
  } else {
    console.log("   (no git baseline — the unchanged-lines check did not run)");
  }
  return { faults, pass, printed, ptrs, mute, backed };
}

const CONS = R("consistency.js");
const head = headSrc ? check(headSrc, null) : null;
const live = check(CONS, head);

// ── 8 · mutations ───────────────────────────────────────────────────────────
const swap = (pair, line) => (s) => s.replace(new RegExp(`('${pair.replace(/[.|$]/g, "\\$&")}':\\n\\s+)'[^']+'`), (_, h) => h + "'" + line.replace(/'/g, "\\'") + "'");
const MUTANTS = [
  { name: "a line borrowed from another leaf for the same act",
    edit: swap("H.R. 6329|119|gov_transparency", "Would require agencies to publish the critical factual material they rely on in rulemaking; the House passed it 362-1."),
    expect: /borrowed from/ },
  { name: "a failed act written as if it took effect",
    edit: swap("H.Amdt. 266|119|cut_spending", "Required a Pentagon report on options for cutting 200,000 civilian positions and the savings each yields; the House rejected it 175-254."),
    expect: /failed act is written as though it took effect/ },
  { name: "a majority-short amendment written as if it took effect",
    edit: swap("S.Amdt. 3535|119|congress_oversight", "Required Senate confirmation of the Federal Reserve and CFPB inspector general; it failed 53-43 under a three-fifths threshold."),
    expect: /failed act is written as though it took effect/ },
  { name: "a one-chamber bill written as law",
    edit: swap("H.R. 5408|119|econ_workers", "Put a clock on a first union contract, ending in mediation and then an arbitration panel’s award; the House passed it 230-193."),
    expect: /never became law is written as though it took effect/ },
  { name: "an enacted act written as unfinished",
    edit: swap("H.R. 7148|119|health_drug_prices", "Would require pharmacy benefit managers to pass 100 percent of drug rebates through to the health plan; the House concurred 217-214."),
    expect: /took effect is written as though it did not/ },
  { name: "an agreed House resolution written as pending",
    edit: swap("H.Res. 1399|119|gov_transparency", "Would direct the House Committee on Ethics to release its records of settlements involving sexual harassment; the House agreed to it 420-0."),
    expect: /took effect is written as though it did not/ },
  { name: "a recommit roll written as passage",
    edit: swap("H.R. 9237|119|veterans", "Would grant concurrent receipt of disability and retired pay to some combat retirees; the House passed it 210-211."),
    expect: /recorded tally/ },
  { name: "a line over 140 characters",
    edit: swap("H.R. 2965|119|gov_regulation", "Would cap the Small Business Administration’s small-business regulatory budget at zero net new cost in each fiscal year; the House passed it 223-190."),
    expect: /characters/ },
  { name: "a method word in a line",
    edit: swap("H.R. 4305|119|gov_regulation", "Would make the Red Tape Hotline a statutory duty, coded as an SBA Office of Advocacy task; the House passed it 269-146."),
    expect: /method word/ },
  { name: "a line that drops its own pair's term",
    edit: swap("H.R. 1041|119|gun_safety", "Would narrow when the VA reports a veteran to the background-check system; the House passed it 216-201."),
    expect: /does not carry its source term/ },
  { name: "a line keyed to a null sitting",
    edit: (s) => s.replace("    'H.R. 5408|119|econ_workers':\n", "    'H.R. 5408|null|econ_workers':\n      'Would put a clock on a first union contract; the House passed it 230-193.',\n    'H.R. 5408|119|econ_workers':\n"),
    expect: /without a real sitting/ },
  { name: "a description-backed row left mute",
    edit: (s) => s.replace(/\n    'H\.R\. 8884\|119\|social_security':\n      '[^']+',/, ""),
    expect: /stores a description and is mute/ },
  { name: "a pointer that drops a sibling leaf with a line",
    edit: (s) => s.replace("(also.length ? ' (also filed on ' + also.join(' and ') + ')' : '')", "''"),
    expect: /sibling\(s\) have a line/ },
  { name: "one of wave 2's forty lines rewritten",
    edit: swap("H.R. 884|119|election_security", "Would bar non-citizens from voting in District of Columbia elections; the House passed it 266-148."),
    expect: /a shipped line was rewritten/ },
];
const mutFaults = [];
for (const m of MUTANTS) {
  const src = m.edit(CONS);
  if (src === CONS) { mutFaults.push(`mutation "${m.name}": anchor not found`); continue; }
  const res = check(src, head);
  const caught = res.faults.some((x) => m.expect.test(x));
  console.log(`   mutation: ${m.name} → ${caught ? "caught" : "NOT CAUGHT"}`);
  if (!caught) mutFaults.push(`mutation "${m.name}" survived`);
}

const all = live.faults.concat(mutFaults);
if (all.length) {
  for (const f of all.slice(0, 40)) console.error("  ✗ " + f);
  if (all.length > 40) console.error(`  … and ${all.length - 40} more`);
  console.error(`\n✗ wave 3 effect lines: ${all.length} failure(s), ${live.pass} passed`);
  process.exit(1);
}
console.log(`\n   ${live.backed} description-backed member rows · ${live.mute} mute${head ? ` (${head.mute} at HEAD)` : ""}`);
console.log(`✓ wave 3 effect lines: all ${live.pass} assertions passed, ${MUTANTS.length} mutations caught`);
