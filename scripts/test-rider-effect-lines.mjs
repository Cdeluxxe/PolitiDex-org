#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-rider-effect-lines.mjs — the 31 rider rows: a line from the act's own
// stored text, or a blank the text explains
// ─────────────────────────────────────────────────────────────────────────────
// The two rider-audit passes added 31 secondary rows (db/vr-rider-audit.json,
// db/vr-rider-audit-onaxis.json). This pass writes one sentence for each row
// whose own stored title / short title / summary — the text those audits quoted
// and saved — states an effect on the leaf, and stores it once in
// consistency.js _DOS_EFFECT, in the block marked RIDER ROWS (v320). The ledger
// db/vr-rider-effect-lines.json records every one of the 31: its line, or why it
// stays blank.
//
//   1. COVERAGE: the ledger holds exactly the 31 filed rider pairs; the block holds
//      exactly its `line` rows; a `blank` row stores nothing and says why.
//   2. SOURCE: each line carries a term that is in that act's own saved text, and
//      is no other leaf's line or stored description for the same act.
//   3. TALLY AND TENSE: each line ends on the rolls the vote seeds hold; a failed
//      act opens "Proposed" or "Would have"; an act with no law on file opens
//      "Would" or "Proposed"; an enacted act does not.
//   4. THE LINE RULE: one sentence, 140 characters or fewer, no method word,
//      never the title.
//   5. RENDERED: booted on the shipped engine, each rider row prints its line and
//      each blank row prints nothing.
//   6. NOTHING SHIPPED MOVED: every _DOS_EFFECT line at HEAD is unchanged, and
//      _DOS_MECH, _DOS_EXEC_EFFECT and _DOS_POINTER are byte-identical to HEAD.
//   7. MUTATIONS: a borrowed line, a failed act written as done, a one-chamber
//      act written as law, a changed tally, a long line, a method word, a line on
//      a blank row, and a rewritten shipped line each fail.
//
//   node scripts/test-rider-effect-lines.mjs

import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));
const MARK = "// RIDER ROWS (v320)";
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js",
];
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary|coded|coding|chip|mapped|mapping|filed as|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger|audit)\b|PolitiDex|…|\.\.\./i;
const must = (c, m) => { if (!c) { console.error(`\n  ✗ rider effect lines are STALE: ${m}\n`); process.exit(2); } };
const norm = (x) => String(x || "").replace(/\s+/g, " ").trim();

const LEDGER = J("db/vr-rider-effect-lines.json");
const W1 = J("db/vr-rider-audit.json"), W2 = J("db/vr-rider-audit-onaxis.json");
const sit = (f) => (f.congress != null ? String(f.congress) : "null");
const FILED = new Map([...W1.filed, ...W2.filed].map((f) => [`${f.number}|${sit(f)}|${f.wouldJoin}`, f]));
// The act's own saved text, as the audit that filed the row saved it.
const ownText = (row) => {
  const k = `${row.number}|${row.congress != null ? row.congress : row.utahSession}`;
  const m = (W1.measures && W1.measures[k]) || (W2.measures && W2.measures[k]);
  return m ? norm([m.title, m.shortTitle, m.summary].filter(Boolean).join(" ")) : "";
};

// Every recorded roll the vote seeds hold: totals, else the party totals.
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
// Law on file: the identity table's laws, or the act's own text saying it was
// enacted as a public law.
const LAWS = new Set();
for (const m of J("db/vr-measure-identity.json").measures || []) {
  if (m && (m.laws || []).length) LAWS.add(`${String(m.number).trim()}|${m.congress}`);
}
const enacted = (row) => LAWS.has(`${row.number}|${row.congress}`) ||
  /\bEnacted as\b[^.]*?\b(?:Public Law|P\.L\.)\s*\d/.test(ownText(row));

function mapOf(src, name) {
  const at = src.indexOf(`var ${name} = {`);
  if (at < 0) return null;
  const end = src.indexOf("\n  };", at);
  return { text: src.slice(at, end + 4), map: vm.runInNewContext("(" + src.slice(at + `var ${name} = `.length, end + 4) + ")") };
}
function blockKeys(src) {
  const a = src.indexOf(MARK);
  if (a < 0) return [];
  return [...src.slice(a, src.indexOf("\n  };", a)).matchAll(/^    '([^']+)':$/gm)].map((m) => m[1]);
}
const headSrc = (() => {
  try { return execFileSync("git", ["show", "HEAD:consistency.js"], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
})();

// One line against its own pair's facts.
function lineFault(row, v, E, M) {
  const s = norm(v);
  if (s.length > 140) return `${s.length} characters`;
  if (!/[.!?]$/.test(s)) return "does not end on a stop";
  if (/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "more than one sentence";
  const mw = s.match(METHOD);
  if (mw) return `method word: ${mw[0]}`;
  const text = ownText(row);
  const act = `${row.number}|${sit(row)}`;
  for (const t of [W1.measures, W2.measures].flatMap((x) => Object.entries(x || {})))
    if (t[0] === `${row.number}|${row.congress}` && [t[1].title, t[1].shortTitle].some((x) => x && norm(x).replace(/[.!?]$/, "").toLowerCase() === s.replace(/[.!?]$/, "").toLowerCase()))
      return "the line is the measure's title";
  for (const [j, w] of Object.entries(E)) if (j !== row.key && j.startsWith(act + "|") && norm(w) === s) return `borrowed from ${j}`;
  for (const [j, m] of Object.entries(M)) {
    if (j !== row.key && j.startsWith(act + "|") && m && m.did && norm(m.did).includes(s.replace(/[.!?]$/, ""))) return `borrowed from ${j}'s stored did`;
  }
  if (!row.term || !text.includes(row.term)) return `the term "${row.term}" is not in the act's own text`;
  if (!s.includes(row.term)) return `the line does not carry its source term "${row.term}"`;
  const tl = (row.rolls || []).map(([ch, r]) => ROLL[`${row.number}|${row.congress}|${ch}|${r}`]);
  if (!tl.length || tl.some((x) => !x)) return "no tally on file for one of its rolls";
  const [a, b] = tl;
  const lost = a[0] < a[1];
  const failedStart = /^(?:Proposed|Would have)\b/.test(s), would = /^(?:Would|Proposed)\b/.test(s);
  if (lost && !failedStart) return "a failed act is written as though it took effect";
  if (!lost && enacted(row) && would) return "an enacted act is written as though it did not take effect";
  if (!lost && !enacted(row) && !would) return "an act that never became law is written as though it took effect";
  const C = (ch) => (ch === "house" ? "House" : "Senate");
  const ch0 = C(row.rolls[0][0]);
  const tail = row.shape === "cleared" ? `; the House cleared it ${a[0]}-${a[1]}, the Senate ${b[0]}-${b[1]}.`
    : row.shape === "concurred" ? `; the ${ch0} concurred ${a[0]}-${a[1]}.`
    : row.shape === "passed" ? `; the ${ch0} passed it ${a[0]}-${a[1]}.`
    : row.shape === "agreed" ? `; the ${ch0} agreed to it ${a[0]}-${a[1]}.`
    : `; the ${ch0} rejected it ${a[0]}-${a[1]}.`;
  return s.endsWith(tail) ? "" : `does not end on the recorded tally (${tail.slice(2)})`;
}

// ── 5 · rendered: a real member, one record per rider pair ──────────────────
const pdxRow = (row) => ({
  kind: "vote", measureId: `${row.number}|${sit(row)}`, measureType: /Amdt/.test(row.number) ? "amendment" : "bill",
  number: row.number, title: ownText(row).slice(0, 80), chamber: (row.rolls && row.rolls[0] && row.rolls[0][0]) || "house",
  status: row.status, date: "2025-06-01T00:00:00.000Z", action: "On Passage", actionType: "passage",
  position: "yea", result: "passed", isParty: null, supports: null, isProcedural: false, advanceInverted: false,
  isAmendment: /Amdt/.test(row.number), parentMeasureId: null, rollcallId: 1, congress: row.congress, session: 1,
  rollNumber: 1, issues: [{ issueKey: row.leaf, weight: 40, isPrimary: false, supportMeaning: "yea_supports", rationale: null }],
  source: { url: "https://www.congress.gov/", label: "Congress.gov" },
});
function rendered(src) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(f === "consistency.js" ? src : R(f), ctx, { filename: f }); } catch (e) { return { err: `${f}: ${e.message}` }; }
  }
  win.PROFILES = win.CMP_DATA;
  const out = new Map();
  // One member per row so no two rider pairs share a drawer.
  const pids = Object.keys(win.CMP_DATA || {});
  LEDGER.rows.forEach((row, i) => {
    const pid = pids[i];
    try { win.PDXVotingRecord.noteMember(pid, [pdxRow(row)]); } catch { /* not a member surface */ }
    let items = [], html = "";
    try { items = win.PDXConsistency.dossierItems(pid, row.leaf) || []; html = win.PDXConsistency.dossierLedgerHtml(pid, row.leaf) || ""; } catch { /* nothing */ }
    const at = items.findIndex((d) => d && d.item && d.item.number === row.number);
    const effs = [...html.matchAll(/<tr class="pdxlg-effr" data-pdxlg-effr="(\d+)">([\s\S]*?)<\/tr>/g)]
      .filter((m) => Number(m[1]) === at).map((m) => norm(m[2].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')));
    out.set(row.key, { found: at >= 0, effs });
  });
  return { out };
}

function check(src) {
  const faults = [];
  let pass = 0;
  const ok = (c, m) => { if (c) pass++; else faults.push(m); };
  const E = mapOf(src, "_DOS_EFFECT"), M = mapOf(src, "_DOS_MECH"), X = mapOf(src, "_DOS_EXEC_EFFECT");
  if (!E || !M || !X) return { faults: ["effect maps not found in consistency.js"], pass };
  const block = blockKeys(src);
  const lines = LEDGER.rows.filter((r) => r.decision === "line"), blanks = LEDGER.rows.filter((r) => r.decision === "blank");

  // ── 1 · coverage ───────────────────────────────────────────────────────────
  ok(FILED.size === 31, `the rider passes filed ${FILED.size} rows, not 31`);
  ok(LEDGER.rows.length === 31 && new Set(LEDGER.rows.map((r) => r.key)).size === 31, "the ledger does not hold the 31 rows once each");
  for (const r of LEDGER.rows) ok(FILED.has(r.key), `${r.key} is not one of the rider rows`);
  ok(lines.length === LEDGER.lines && blanks.length === LEDGER.blank, "the ledger's counts do not match its rows");
  ok(block.length === new Set(block).size && block.slice().sort().join(",") === lines.map((r) => r.key).sort().join(","),
    "the RIDER ROWS block is not exactly the ledger's line rows");
  for (const k of block) ok(FILED.has(k), `${k}: a line in the rider block on a pair the rider passes did not file`);
  for (const r of blanks) {
    ok(!(r.key in E.map), `${r.key}: a blank row now stores a line`);
    ok(!(M.map[r.key] && M.map[r.key].did), `${r.key}: a blank row now stores a description`);
    ok(typeof r.reason === "string" && r.reason.length > 30, `${r.key}: a blank row does not say why`);
    ok(/states no|does not say|says nothing|label only/.test(r.reason), `${r.key}: a blank's reason is not that the text does not explain it`);
  }

  // ── 2–4 · every line, against its own pair's facts ────────────────────────
  for (const r of lines) {
    ok(E.map[r.key] === r.line, `${r.key}: the stored line is not the ledger's`);
    const f = lineFault(r, E.map[r.key] || "", E.map, M.map);
    ok(f === "", `${r.key}: ${f}`);
  }

  // ── 5 · rendered ───────────────────────────────────────────────────────────
  const rr = rendered(src);
  if (rr.err) ok(false, `boot: ${rr.err}`);
  else {
    for (const r of LEDGER.rows) {
      const g = rr.out.get(r.key);
      if (!g || !g.found) { ok(false, `${r.key}: the row did not reach the drawer`); continue; }
      if (r.decision === "line") ok(g.effs.length === 1 && g.effs[0] === norm(r.line), `${r.key}: prints ${JSON.stringify(g.effs)}, stored ${JSON.stringify(r.line)}`);
      else ok(g.effs.length === 0, `${r.key}: a blank row prints ${JSON.stringify(g.effs[0])}`);
    }
  }

  // ── 6 · nothing shipped moved ─────────────────────────────────────────────
  if (headSrc) {
    const HE = mapOf(headSrc, "_DOS_EFFECT"), HM = mapOf(headSrc, "_DOS_MECH"), HX = mapOf(headSrc, "_DOS_EXEC_EFFECT");
    const headBlock = new Set(blockKeys(headSrc));
    for (const [p, v] of Object.entries(HE.map)) ok(E.map[p] === v, `${p}: a shipped line was rewritten or removed`);
    for (const k of Object.keys(E.map)) ok(k in HE.map || block.includes(k) || headBlock.has(k), `${k}: a new line outside the rider block`);
    ok(M.text === HM.text, "_DOS_MECH is not byte-identical to HEAD");
    ok(X.text === HX.text, "_DOS_EXEC_EFFECT is not byte-identical to HEAD");
    const ptr = (x) => (String(x || "").match(/var _DOS_POINTER = \{[\s\S]*?\n  \};/) || [""])[0];
    ok(ptr(src) && ptr(src) === ptr(headSrc), "the pointer table changed");
  } else console.log("   (no git baseline — the unchanged-lines check did not run)");
  return { faults, pass };
}

const CONS = R("consistency.js");
must(blockKeys(CONS).length > 0, "the RIDER ROWS (v320) block is not in _DOS_EFFECT");
const live = check(CONS);

// ── 7 · mutations ───────────────────────────────────────────────────────────
const swap = (pair, line) => (s) => s.replace(new RegExp(`('${pair.replace(/[.|$]/g, "\\$&")}':\\n\\s+)'[^']+'`), (_, h) => h + "'" + line.replace(/'/g, "\\'") + "'");
const MUTANTS = [
  { name: "a line borrowed from a sibling leaf of the same act",
    edit: swap("H.R. 3746|118|cut_spending", "Tightened TANF work rules and raised the SNAP work-requirement age to 54; the House cleared it 314-117, the Senate 63-36."),
    expect: /borrowed from|not the ledger's/ },
  { name: "a failed act written as done",
    edit: swap("H.Amdt. 97|119|strong_defense", "Exempted military personnel from Endangered Species Act bans in national defense operations; the House rejected it 200-228."),
    expect: /failed act is written as though it took effect/ },
  { name: "a one-chamber act written as law",
    edit: swap("H.R. 3633|119|crypto_cbdc", "Set a market-structure framework for digital assets, splitting oversight between the CFTC and the SEC; the House passed it 294-134."),
    expect: /never became law is written as though it took effect/ },
  { name: "the tally changed",
    edit: swap("H.R. 6329|119|gov_regulation", "Would require agencies to publish the critical factual material they rely on in rulemaking; the House passed it 362-10."),
    expect: /recorded tally/ },
  { name: "a line over 140 characters",
    edit: swap("H.R. 1319|117|tax_middle_class", "Expanded the child tax credit for families with children across the country for the 2021 tax year, fully refundable; the House cleared it 220-211, the Senate 50-49."),
    expect: /characters/ },
  { name: "a method word",
    edit: swap("H.R. 1319|117|housing_support", "Funded emergency rental and homeowner assistance, mapped here; the House cleared it 220-211, the Senate 50-49."),
    expect: /method word/ },
  { name: "a line written on a blank row",
    edit: (s) => s.replace("    'H.R. 1968|119|border_security':\n", "    'H.R. 7148|119|healthcare':\n      'Carried Health Care Extenders; the House concurred 217-214.',\n    'H.R. 1968|119|border_security':\n"),
    expect: /blank row now stores a line|not exactly the ledger/ },
  { name: "a shipped line rewritten",
    edit: swap("H.R. 3746|118|gov_services", "Tightened TANF work rules; the House cleared it 314-117, the Senate 63-36."),
    expect: /shipped line was rewritten/ },
];
const mutFaults = [];
for (const m of MUTANTS) {
  const src = m.edit(CONS);
  if (src === CONS) { mutFaults.push(`mutation "${m.name}": anchor not found`); continue; }
  const res = check(src);
  const caught = res.faults.some((x) => m.expect.test(x));
  console.log(`   mutation: ${m.name} → ${caught ? "caught" : "NOT CAUGHT"}`);
  if (!caught) mutFaults.push(`mutation "${m.name}" survived`);
}

const all = live.faults.concat(mutFaults);
if (all.length) {
  for (const f of all.slice(0, 40)) console.error("  ✗ " + f);
  console.error(`\n✗ rider effect lines: ${all.length} failure(s), ${live.pass} passed`);
  process.exit(1);
}
console.log(`\n✓ rider effect lines: all ${live.pass} assertions passed, ${MUTANTS.length} mutations caught · ${LEDGER.lines} lines, ${LEDGER.blank} blank`);
