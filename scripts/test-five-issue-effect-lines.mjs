#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-five-issue-effect-lines.mjs — effect lines on Data Centers, Water
// Conservation, Housing Affordability, Protect Public Lands and Energy
// ─────────────────────────────────────────────────────────────────────────────
// Every federal pair on these five issues already printed its line, and no
// measure on file changes data-center law. The gap was the Utah record: 31
// pairs, none storing a `did`. db/vr-five-issue-effect-lines.json quotes each
// bill's own Highlighted Provisions from the Legislature's record (and its text,
// where a line rests on it); 25 pairs carry a line written from those words in
// _DOS_EFFECT under the FIVE ISSUES SLICE 16 marker, two keep the lines v385
// shipped from their titles byte for byte, and four whose provisions state no
// clear change stay silent, each with the reason.
//
//   1. THE FIXTURE MEMBER: a House member's real rows on all five issues and on
//      Cut Federal Red Tape, plus a Utah row for every one of the 31 pairs. Every
//      lined pair prints its line once, under its own row; every silent pair
//      prints nothing; the Data Centers drawers carry no row and no line.
//   2. THE LINE RULE: one sentence, 140 characters or fewer, ending on a stop, no
//      method or sales words, keyed by a real Utah session. FROM THE BILL: every
//      `terms` phrase is in the bill's quoted words and in the line, and every
//      other content word in the line is in those words or the title, a
//      restatement the row's `plain` table ties to a word that is, or one of a
//      few effect verbs. Never the title itself, never another pair's line. An
//      enacted act reads as done; one that never passed opens "Would have".
//   3. THE LEDGER: 31 rows, every key on one of the five issues, every line in
//      the block and every block line in the ledger, every refusal reasoned and
//      lineless, and the data-center search recorded with nothing mapped.
//   4. NOTHING SHIPPED MOVED: every _DOS_EFFECT line at HEAD outside this slice
//      (Lands, Red Tape, the CRA batch, every federal line) is byte-identical;
//      _DOS_MECH, _DOS_EXEC_EFFECT and _DOS_POINTER are unchanged; the engine
//      outside the block is HEAD's; and the fixture's ledger with its effect rows
//      taken out renders as at HEAD on every leaf, so no score, count or
//      Direction Match moved.
//   5. MUTATIONS: an invented claim, a method word, a line borrowed from another
//      issue, a title used as a fallback or as the line, an over-long line, a
//      removed line, a line on a silent pair, a failed act written as law, a
//      sales word and an edited Lands line must each fail.
//
//   node scripts/test-five-issue-effect-lines.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";
import { preAudit, AUDITED } from "./vr-effect-audit.mjs";
import { keysAfter } from "./vr-slice-blocks.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js",
];
const MARK = "// FIVE ISSUES SLICE 16 (v386).";
const LEDGER = JSON.parse(R("db/vr-five-issue-effect-lines.json"));
const FIVE = new Set(["datacenter_growth", "datacenter_water", "datacenter_power", "water", "housing", "lands_preserve", "energy_production"]);
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary|coded|coding|chip|mapped|mapping|filed as|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger|direction match|pole)\b|PolitiDex|…|\.\.\./i;
const SALES = /\bmembers?(?:hip)?\b|\bstocks?\b|\bpremium\b|\bequity\b/i;

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ five-issue effect lines: STALE HARNESS — ${m}`); process.exit(2); } };

const norm = (x) => String(x || "").replace(/\s+/g, " ").trim();
const low = (x) => norm(x).toLowerCase();
const dec = (h) => String(h || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

const HEAD_SRC = (() => {
  try { return execFileSync("git", ["show", "HEAD:consistency.js"], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
})();
function mapOf(src, name) {
  const at = src.indexOf(`var ${name} = {`);
  if (at < 0) return null;
  const end = src.indexOf("\n  };", at);
  return { text: src.slice(at, end + 4), map: vm.runInNewContext("(" + src.slice(at + `var ${name} = `.length, end + 4) + ")") };
}

// ── THE FIXTURE MEMBER ──────────────────────────────────────────────────────
// Adam Smith's real federal rows from the shipped seeds (lands, energy, housing,
// water and red tape all among them), plus one Utah row in the API's RecordItem
// shape for each of the 31 pairs the ledger read. The Utah rows are fixtures:
// the point is that a row on these keys, whatever chamber, prints exactly what
// its pair's bill supports.
const PID = "adam_smith";
const corpus = buildCorpus(ROOT);
const FED = corpus.byMember.get(PID) || [];
must(FED.length > 50, `${PID} has no corpus record`);
const ut = (r) => ({
  kind: "vote", measureId: `${r.number}|${r.sitting}`, measureType: "bill", number: r.number, title: r.title,
  chamber: /^S\./.test(r.number) ? "utah senate" : "utah house", status: r.status,
  date: `${r.sitting.slice(0, 4)}-03-01T00:00:00.000Z`, action: "On passage, third reading", actionType: "passage",
  position: "yea", result: "passed", isParty: "with_party", supports: true, isProcedural: false,
  advanceInverted: false, isAmendment: false, parentMeasureId: null, rollcallId: null,
  congress: null, session: Number(r.sitting.slice(0, 4)), rollNumber: null,
  measureIdent: { session: r.sitting, readFrom: null, readFromUrl: null, officialTitle: null, billUrl: null },
  issues: [{ issueKey: r.issue, weight: 100, isPrimary: true, supportMeaning: "yea_supports", rationale: null }],
});
const UTAH = LEDGER.rows.map(ut);
const LEAVES = ["water", "housing", "lands_preserve", "energy_production", "gov_regulation", "datacenter_growth", "datacenter_water", "datacenter_power"];

function boot(src) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(f === "consistency.js" ? src : R(f), ctx, { filename: f }); } catch (e) { win.__err = `${f}: ${e.message}`; }
  }
  win.PROFILES = win.CMP_DATA;
  try { win.PDXVotingRecord.noteMember(PID, FED.concat(UTAH)); } catch (e) { win.__err = `noteMember: ${e.message}`; }
  return win;
}
const pairOf = (it, k) => {
  const num = norm(it.number);
  const sit = typeof it.congress === "number" ? it.congress : (it.measureIdent && it.measureIdent.session) || "";
  return `${num}|${sit}|${k}`;
};
// Every row the ledger prints for the fixture on one leaf: pair → effect lines.
function rendered(win, leaf) {
  const CS = win.PDXConsistency;
  let items = [], html = "";
  try { items = CS.dossierItems(PID, leaf) || []; } catch { return { rows: new Map(), html: "" }; }
  try { html = CS.dossierLedgerHtml(PID, leaf) || ""; } catch { html = ""; }
  const effs = new Map();
  for (const m of html.matchAll(/<tr class="pdxlg-effr" data-pdxlg-effr="(\d+)">([\s\S]*?)<\/tr>/g)) {
    effs.set(Number(m[1]), (effs.get(Number(m[1])) || []).concat(dec(m[2])));
  }
  const rows = new Map();
  for (const m of html.matchAll(/<tr data-pdxlg-row="(\d+)">/g)) {
    const i = Number(m[1]), d = items[i], it = (d && d.item) || {};
    if (!d || d.lane === "exec" || !norm(it.number)) continue;
    const p = pairOf(it, leaf);
    rows.set(p, (rows.get(p) || []).concat([effs.get(i) || []]));
  }
  return { rows, html };
}
const sansEffect = (h) => String(h).replace(/<tr class="pdxlg-effr"[\s\S]*?<\/tr>/g, "");

// ── ONE LINE AGAINST ITS OWN BILL ───────────────────────────────────────────
// Words a line may carry without the bill saying them: connectives, and the
// verbs that say what an act did to the law. Anything else comes from the bill.
const STOP = new Set(("a an the and or of to for in on by at as with from its it their them that this " +
  "these those who which when where may can before after into under over than more less some any each " +
  "every one all part per is against utah").split(" "));
const VERBS = new Set(("would have had set let made gave created extended raised barred required imposed " +
  "provided measured restricted authorized give gave").split(" "));
const words = (x) => String(x).toLowerCase().replace(/[’']/g, "'").match(/[a-z0-9%]+(?:[-'][a-z0-9]+)*/g) || [];
const stem = (w) => w.replace(/'s$/, "").replace(/ies$/, "y").replace(/(?:ing|ed|es|s)$/, "");
function uncovered(row, line) {
  const src = new Set(words([row.provisions, ...(row.textQuote || []), row.title].join(" ")).map(stem));
  const plain = new Set(Object.keys(row.plain || {}).map((w) => stem(w.toLowerCase())));
  const near = (w) => [...src].some((x) => x.length > 3 && w.length > 3 && (x.startsWith(w) || w.startsWith(x)));
  return words(line).filter((w) => !STOP.has(w) && !STOP.has(stem(w)) && !VERBS.has(w) && !src.has(stem(w)) && !plain.has(stem(w)) && !near(stem(w)));
}
const ENACTED = (row) => row.status === "enacted" || /Governor Signed/.test(String(row.enactedPer || ""));
function lineFault(row, v, E, M) {
  const s = norm(v), k = row.key;
  if (!s) return "no line is stored";
  if (s.length > 140) return `${s.length} characters`;
  if (!/[.!?]$/.test(s)) return "does not end on a stop";
  if (/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "more than one sentence";
  const mw = s.match(METHOD);
  if (mw) return `method word: ${mw[0]}`;
  if (SALES.test(s)) return "sales word";
  const [, sit, leaf] = k.split("|");
  if (!/^\d{4}GS$/.test(sit)) return `the sitting "${sit}" is not a Utah session`;
  if (!FIVE.has(leaf)) return `${leaf} is not one of the five issues`;
  if (M[k] && norm(M[k].did)) return "the pair stores a did, so the bill's provisions are not its source";
  if (low(s.replace(/[.!?]$/, "")) === low(row.title)) return "the line is the measure's title";
  const from = low([row.provisions, ...(row.textQuote || [])].join(" "));
  if (norm(row.provisions).length < 40 || !/^https:\/\/le\.utah\.gov\//.test(String(row.provisionsFrom))) return "no quoted provisions from the Legislature's record";
  if (!(row.terms || []).length) return "no terms tie the line to its bill";
  for (const t of row.terms) {
    if (!from.includes(low(t))) return `the term "${t}" is not in this bill's own words`;
    if (!low(s).includes(low(t))) return `the line does not carry its bill's term "${t}"`;
  }
  for (const [w, src] of Object.entries(row.plain || {})) if (!from.includes(low(src))) return `"${w}" restates "${src}", which this bill does not say`;
  const extra = uncovered(row, s);
  if (extra.length) return `words this bill does not support: ${extra.join(", ")}`;
  for (const [j, w] of Object.entries(E)) if (j !== k && norm(w) === s) return `borrowed from ${j}`;
  for (const [j, m] of Object.entries(M)) if (m && m.did && norm(m.did).includes(s.replace(/[.!?]$/, ""))) return `borrowed from ${j}'s stored did`;
  if (ENACTED(row) && /^(?:Would|Proposed)\b/.test(s)) return "an enacted act is written as though it did not take effect";
  if (!ENACTED(row) && !/^Would have\b/.test(s)) return "an act that never became law is written as though it took effect";
  return "";
}

function check(src) {
  const out = [];
  const need = (c, m) => { if (!c) out.push(m); };
  const E = mapOf(src, "_DOS_EFFECT"), X = mapOf(src, "_DOS_EXEC_EFFECT"), M = mapOf(src, "_DOS_MECH"), P = mapOf(src, "_DOS_POINTER");
  if (!E || !X || !M || !P) return ["effect maps not found in consistency.js"];
  const win = boot(src);
  if (win.__err) return [`boot: ${win.__err}`];
  const byKey = new Map(LEDGER.rows.map((r) => [r.key, r]));

  // 1 · the fixture member, on every leaf
  const seen = new Set();
  for (const leaf of LEAVES) {
    const { rows } = rendered(win, leaf);
    for (const [pair, lists] of rows) {
      seen.add(pair);
      const row = byKey.get(pair);
      const stored = E.map[pair] || (M.map[pair] && M.map[pair].did) || "";
      for (const got of lists) {
        need(got.length <= 1, `${pair}: ${got.length} effect lines under one row`);
        if (row && row.decision === "refuse") need(!got.length, `${pair}: a refused pair prints ${JSON.stringify(got[0])}`);
        if (row && (row.decision === "line" || row.decision === "kept")) need(got.length === 1 && got[0] === norm(row.line), `${pair}: prints ${JSON.stringify(got)}, the ledger says ${JSON.stringify(row.line)}`);
        if (got.length) {
          need(got[0] === norm(stored) || norm(stored).length > 140, `${pair}: prints a line that is not its own pair's`);
          need(got[0].length <= 140 && !METHOD.test(got[0].replace(/\bweight\b/g, "")) || !row, `${pair}: the printed line breaks the row rule`);
        }
      }
    }
  }
  for (const r of LEDGER.rows) need(seen.has(r.key), `${r.key}: the fixture's Utah row did not render`);
  for (const leaf of ["datacenter_growth", "datacenter_water", "datacenter_power"]) {
    need(rendered(win, leaf).rows.size === 0, `${leaf}: a Data Centers drawer carries a row with nothing mapped to it`);
    need(!Object.keys(E.map).some((k) => k.endsWith("|" + leaf)), `${leaf}: a Data Centers line with nothing mapped to it`);
  }
  // Federal rows the fixture carries on the five issues and on Red Tape print
  // exactly HEAD's lines.
  for (const k of ["H.J.Res. 131|119|lands_preserve", "H.J.Res. 131|119|gov_regulation", "H.J.Res. 131|119|energy_production",
    "H.R. 6644|119|housing", "H.R. 3684|117|water", "H.R. 3616|119|energy_production"]) {
    need(seen.has(k), `${k}: the fixture's federal row did not render`);
  }

  // 2–3 · the ledger and the block
  // The block runs from its marker to the next comment header or the map's end.
  const blockText = (() => {
    const a = src.indexOf(MARK);
    if (a < 0) return "";
    const end = src.indexOf("\n  };", a);
    const after = src.indexOf("\n    // ", src.indexOf("\n    '", a));
    return src.slice(a, (after > 0 && after < end ? after : end) + 1);
  })();
  const block = [...blockText.matchAll(/^    '([^']+)':$/gm)].map((m) => m[1]);
  need(block.length === LEDGER.rows.filter((r) => r.decision === "line" || r.decision === "kept").length, `the FIVE ISSUES block holds ${block.length} lines`);
  need(LEDGER.rows.length === 31, `${LEDGER.rows.length} rows in the ledger — the pass read 31 pairs`);
  const DC = LEDGER.dataCenters || {};
  need(DC.mapped === 0 && norm(DC.searched).length > 80 && norm(DC.found).length > 80 && !LEDGER.rows.some((r) => /^datacenter_/.test(r.issue)),
    "the data-center search is not recorded, or the ledger claims a data-center pair");
  for (const k of block) need(byKey.has(k) && /^(?:line|kept)$/.test(byKey.get(k).decision), `${k}: a block line the ledger does not record`);
  for (const row of LEDGER.rows) {
    const k = row.key;
    need(`${row.number}|${row.sitting}|${row.issue}` === k, `${k}: the ledger's identity fields do not spell its key`);
    need(FIVE.has(row.issue), `${k}: not one of the five issues`);
    if (row.decision === "line") {
      need(block.includes(k), `${k}: the line is not in the FIVE ISSUES block`);
      need(norm(row.line) === norm(E.map[k]), `${k}: the ledger line and the stored line differ`);
      const f = lineFault(row, E.map[k], E.map, M.map);
      need(f === "", `${k}: ${f}`);
    } else if (row.decision === "kept") {
      // Shipped in v385 and pinned: byte-identical to HEAD, and still a line the
      // row rule prints.
      need(block.includes(k) && norm(row.line) === norm(E.map[k]), `${k}: a kept line is not the stored line`);
      need(!HEAD_SRC || (mapOf(HEAD_SRC, "_DOS_EFFECT").map[k] === E.map[k]), `${k}: a kept v385 line was rewritten`);
      need(norm(row.why).length > 20, `${k}: kept with no reason`);
    } else {
      need(row.decision === "refuse" && norm(row.why).length > 20, `${k}: a refusal with no reason`);
      need(!(k in E.map) && !(k in P.map), `${k}: a refused pair carries a line`);
    }
  }

  // 4 · nothing shipped moved
  if (HEAD_SRC) {
    const hE = mapOf(HEAD_SRC, "_DOS_EFFECT"), hX = mapOf(HEAD_SRC, "_DOS_EXEC_EFFECT"), hM = mapOf(HEAD_SRC, "_DOS_MECH"), hP = mapOf(HEAD_SRC, "_DOS_POINTER");
    // Every line at HEAD is pinned, except a rewrite the v387 provisions audit
    // recorded (db/vr-effect-line-audit.json): S.B. 118 and H.B. 11 in this slice.
    for (const [k, v] of Object.entries(hE.map)) {
      const a = AUDITED.find((r) => r.key === k);
      need(E.map[k] === v || (a && preAudit(src) !== src && a.line === E.map[k] && (a.was === v || a.line === v)), `${k}: a shipped line changed`);
    }
    // A later slice's own block (vr-slice-blocks.mjs) is that slice's to pin.
    const later = keysAfter(src, "_DOS_EFFECT", 386);
    for (const k of Object.keys(E.map)) need(k in hE.map || block.includes(k) || later.has(k), `${k}: a new line outside the FIVE ISSUES block`);
    need(X.text === hX.text, "_DOS_EXEC_EFFECT changed");
    need(M.text === hM.text, "_DOS_MECH changed");
    need(P.text === hP.text, "_DOS_POINTER changed");
    const hWin = boot(HEAD_SRC);
    if (!hWin.__err) {
      for (const leaf of LEAVES) {
        need(sansEffect(rendered(win, leaf).html) === sansEffect(rendered(hWin, leaf).html), `${leaf}: the ledger moved outside its effect rows`);
      }
      // The engine itself is HEAD's file once each side's block is taken out.
      const cut = (x, mark) => {
        const a = x.indexOf("    " + mark);
        if (a < 0) return x;
        const end = x.indexOf("\n  };", a);
        return x.slice(0, a) + x.slice(end + 1);
      };
      need(src.indexOf(MARK) < 0 || cut(preAudit(src), MARK) === cut(preAudit(HEAD_SRC), HEAD_SRC.includes("// FIVE ISSUES SLICE 16 (v385).") ? "// FIVE ISSUES SLICE 16 (v385)." : MARK),
        "consistency.js moved outside the FIVE ISSUES block");
    }
  }
  return out;
}

section("the tree");
{
  const out = check(R("consistency.js"));
  ok(out.length === 0, `the tree:\n      ${out.slice(0, 12).join("\n      ")}`);
  if (!out.length) console.log(`      ✓ ${LEDGER.rows.length} pairs read, ${LEDGER.rows.filter((r) => r.decision === "line").length} lines, fixture rows on ${LEAVES.length} leaves, nothing shipped moved`);
  const sw = R("sw.js");
  ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 386 && sw.includes("// v386 - EFFECT LINES FROM THE BILL ITSELF."), "the shell moved to v386 or later, with the v386 note");
}

section("mutations");
{
  const SRC = R("consistency.js");
  const swap = (from, to) => { must(SRC.includes(from), `mutation anchor missing: ${from.slice(0, 60)}`); return SRC.split(from).join(to); };
  const H11 = "'Barred cities and counties from requiring a garage for an owner-occupied affordable single-family home.'";
  const SB252 = "'Would have created tax credits for homebuilders who buy and install water efficient landscaping and fixtures.'";
  const LANDS = "'Removed the conservation withdrawal from roughly 1.2 million acres inside the Arctic National Wildlife Refuge.'";
  const muts = [
    ["an invented claim", swap(H11, "'Barred cities and counties from requiring a garage for an owner-occupied affordable single-family home or any lawn.'")],
    ["a line that drops its bill's terms", swap(H11, "'Eased parking rules across Utah.'")],
    ["a method word", swap(H11, "'Barred cities and counties from requiring a garage for an owner-occupied affordable single-family home, mapped to housing.'")],
    ["a method word the row rule lets through", swap(H11, "'Barred cities and counties from requiring a garage for an owner-occupied affordable home, per the rationale.'")],
    ["a line borrowed from another issue", swap(H11, LANDS)],
    ["a title used as the line", swap(H11, "'Housing Affordability Amendments.'")],
    ["a title used as a fallback", swap("return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '');",
      "return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || (item.title ? String(item.title) + '.' : ''));")],
    ["an over-long line", swap(H11, "'Barred cities and counties from requiring a garage for an owner-occupied affordable single-family home, and defined terms and made technical changes.'")],
    ["a removed line", swap(`    'S.B. 181|2025GS|housing':\n      ${H11},\n`, "")],
    ["a line on a silent pair", swap(`    'H.B. 11|2024GS|water':`, `    'H.B. 62|2024GS|water':\n      'Outlined coordination related to water and the public education system.',\n    'H.B. 11|2024GS|water':`)],
    ["an act that never passed written as law", swap(SB252, "'Created tax credits for homebuilders who buy and install water efficient landscaping and fixtures.'")],
    ["a sales word", swap(H11, "'Barred cities and counties from requiring a garage for an owner-occupied affordable single-family home for premium members.'")],
    ["an edited Lands line", swap(LANDS, "'Removed the conservation withdrawal from about 1.2 million acres inside the Arctic National Wildlife Refuge.'")],
  ];
  for (const [name, src] of muts) {
    const out = check(src);
    ok(out.length > 0, `mutation "${name}" was not caught`);
  }
  console.log(`      ✓ ${muts.length} mutations run`);
}

section("the line rule on its own");
{
  // The same bad lines, judged by lineFault alone against their own ledger row,
  // so a mutation written into both the table and the ledger is still caught.
  const SRC = R("consistency.js");
  const E = mapOf(SRC, "_DOS_EFFECT").map, M = mapOf(SRC, "_DOS_MECH").map;
  const row = (k) => LEDGER.rows.find((r) => r.key === k);
  const G = row("S.B. 181|2025GS|housing"), S252 = row("S.B. 252|2023GS|water");
  const GL = G.line;
  const cases = [
    [G, "Barred cities and counties from requiring a garage for an owner-occupied affordable single-family home or any lawn.", /does not support: .*lawn/],
    [G, "Eased parking rules across Utah.", /term/],
    [G, "Barred cities and counties from requiring a garage for an owner-occupied affordable home, per the rationale.", /method word/],
    [G, E["H.J.Res. 131|119|lands_preserve"], /term|borrowed|does not support/],
    [G, "Housing Affordability Amendments.", /title|term/],
    [G, "Barred cities and counties from requiring a garage for an owner-occupied affordable home for premium members.", /sales word|does not support/],
    [G, E["S.B. 271|2023GS|housing"], /term|borrowed|does not support/],
    [S252, "Created tax credits for homebuilders who buy and install water efficient landscaping and fixtures.", /never became law/],
    [{ ...G, plain: { ...G.plain, garage: "garage on every lot" } }, GL, /restates/],
  ];
  for (const [r, line, want] of cases) {
    const f = lineFault({ ...r, line }, line, { ...E, [r.key]: line }, M);
    ok(want.test(f), `lineFault let ${JSON.stringify(line.slice(0, 60))} through (said ${JSON.stringify(f)})`);
  }
  console.log(`      ✓ ${cases.length} bad lines refused by the rule alone`);
}

console.log(`\n${failures.length ? "✗" : "✓"} five-issue effect lines: ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
