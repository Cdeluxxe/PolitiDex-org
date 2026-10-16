#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-five-issue-effect-lines.mjs — effect lines on Data Centers, Water
// Conservation, Housing Affordability, Protect Public Lands and Energy
// ─────────────────────────────────────────────────────────────────────────────
// Every federal pair on these five issues already printed its line. The gap was
// the Utah record: 31 pairs, none storing a `did`. db/vr-five-issue-effect-lines.json
// records the read of each pair's own stored title — two name what the act did
// and carry a line in _DOS_EFFECT under the FIVE ISSUES SLICE 16 marker; 29 name only a
// subject and stay silent, each with the reason.
//
//   1. THE FIXTURE MEMBER: a House member's real rows on all five issues and on
//      Cut Federal Red Tape, plus Utah rows for both lined pairs and five refused
//      ones. Every qualifying pair prints its line once, under its own row; every
//      refused pair prints nothing.
//   2. THE LINE RULE: one sentence, 140 characters or fewer, ending on a stop, no
//      method words, carrying its own title's term, never the title itself, no
//      other pair's line, keyed by a real Utah session, enacted act in past tense.
//   3. THE LEDGER: 31 rows, every key on one of the five issues, every line in
//      the block and every block line in the ledger, every refusal reasoned and
//      lineless, and no data-center pair.
//   4. NOTHING SHIPPED MOVED: HEAD's _DOS_EFFECT lines (Lands, Red Tape, the CRA
//      batch and the rest) are byte-identical; _DOS_MECH, _DOS_EXEC_EFFECT and
//      _DOS_POINTER are unchanged; the fixture's ledger, with effect rows taken
//      out, renders the same as at HEAD on every leaf, so no score, count or
//      Direction Match moved.
//   5. MUTATIONS: a method word, a line borrowed from another issue, a title used
//      as a fallback, a title used as the line, an over-long line, a removed
//      line and an edited Lands line must each fail.
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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js",
];
const MARK = "// FIVE ISSUES SLICE 16 (v385).";
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
// water and red tape all among them), plus Utah rows in the API's RecordItem
// shape for the two lined pairs and five refused ones. The Utah rows are
// fixtures: the point is that a row on these keys, whatever chamber, prints
// exactly what its pair qualifies for.
const PID = "adam_smith";
const corpus = buildCorpus(ROOT);
const FED = corpus.byMember.get(PID) || [];
must(FED.length > 50, `${PID} has no corpus record`);
const ut = (number, session, issueKey, title, extra) => ({
  kind: "vote", measureId: `${number}|${session}`, measureType: "bill", number, title,
  chamber: /^S\./.test(number) ? "utah senate" : "utah house", status: "enacted",
  date: "2024-02-21T17:50:00.000Z", action: "On passage, third reading", actionType: "passage",
  position: "yea", result: "passed", isParty: "with_party", supports: true, isProcedural: false,
  advanceInverted: false, isAmendment: false, parentMeasureId: null, rollcallId: null,
  congress: null, session: Number(session.slice(0, 4)), rollNumber: null,
  measureIdent: { session, readFrom: null, readFromUrl: null, officialTitle: null, billUrl: null },
  issues: [{ issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports", rationale: null }],
  ...(extra || {}),
});
const UTAH = [
  ut("S.B. 118", "2023GS", "water", "Water Efficient Landscaping Incentives"),
  ut("H.B. 11", "2024GS", "water", "Water Efficient Landscaping Requirements"),
  ut("S.B. 118", "2024GS", "water", "Water Efficiency Amendments", { status: "introduced" }),
  ut("H.B. 217", "2023GS", "water", "School Energy and Water Reductions"),
  ut("S.B. 181", "2025GS", "housing", "Housing Affordability Amendments"),
  ut("S.B. 271", "2023GS", "housing", "Home Ownership Requirements"),
  ut("H.B. 201", "2025GS", "energy_production", "Energy Resource Amendments"),
];
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

// ── ONE LINE AGAINST ITS OWN PAIR ───────────────────────────────────────────
function lineFault(row, v, E, M) {
  const s = norm(v), k = row.key;
  if (!s) return "no line is stored";
  if (s.length > 140) return `${s.length} characters`;
  if (!/[.!?]$/.test(s)) return "does not end on a stop";
  if (/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "more than one sentence";
  const mw = s.match(METHOD);
  if (mw) return `method word: ${mw[0]}`;
  if (SALES.test(s)) return "sales word";
  const [num, sit, leaf] = k.split("|");
  if (!/^\d{4}GS$/.test(sit)) return `the sitting "${sit}" is not a Utah session`;
  if (!FIVE.has(leaf)) return `${leaf} is not one of the five issues`;
  if (M[k] && norm(M[k].did)) return "the pair stores a did, so a title is not its source";
  const t = norm(row.title);
  if (low(s.replace(/[.!?]$/, "")) === low(t)) return "the line is the measure's title";
  const term = norm(row.term);
  if (!term || !low(t).includes(low(term))) return `the term "${term}" is not in this pair's own title`;
  if (!low(s).includes(low(term))) return `the line does not carry its title term "${term}"`;
  for (const [j, w] of Object.entries(E)) if (j !== k && norm(w) === s) return `borrowed from ${j}`;
  for (const [j, m] of Object.entries(M)) if (m && m.did && norm(m.did).includes(s.replace(/[.!?]$/, ""))) return `borrowed from ${j}'s stored did`;
  if (row.status !== "enacted") return "only an enacted act carries a line here";
  if (/^(?:Would|Proposed)\b/.test(s)) return "an enacted act is written as though it did not take effect";
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
        if (row && row.decision === "line") need(got.length === 1 && got[0] === norm(row.line), `${pair}: prints ${JSON.stringify(got)}, the ledger says ${JSON.stringify(row.line)}`);
        if (got.length) {
          need(got[0] === norm(stored) || norm(stored).length > 140, `${pair}: prints a line that is not its own pair's`);
          need(got[0].length <= 140 && !METHOD.test(got[0].replace(/\bweight\b/g, "")) || !row, `${pair}: the printed line breaks the row rule`);
        }
      }
    }
  }
  for (const k of ["S.B. 118|2023GS|water", "H.B. 11|2024GS|water", "S.B. 118|2024GS|water", "H.B. 217|2023GS|water",
    "S.B. 181|2025GS|housing", "S.B. 271|2023GS|housing", "H.B. 201|2025GS|energy_production"]) {
    need(seen.has(k), `${k}: the fixture's Utah row did not render`);
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
  need(block.length === LEDGER.rows.filter((r) => r.decision === "line").length, `the FIVE ISSUES block holds ${block.length} lines`);
  need(LEDGER.rows.length === 31, `${LEDGER.rows.length} rows in the ledger — the pass read 31 pairs`);
  need(LEDGER.dataCenterPairs === 0 && !LEDGER.rows.some((r) => /^datacenter_/.test(r.issue)), "the ledger claims a data-center pair");
  for (const k of block) need(byKey.has(k) && byKey.get(k).decision === "line", `${k}: a block line the ledger does not record`);
  for (const row of LEDGER.rows) {
    const k = row.key;
    need(`${row.number}|${row.sitting}|${row.issue}` === k, `${k}: the ledger's identity fields do not spell its key`);
    need(FIVE.has(row.issue), `${k}: not one of the five issues`);
    if (row.decision === "line") {
      need(block.includes(k), `${k}: the line is not in the FIVE ISSUES block`);
      need(norm(row.line) === norm(E.map[k]), `${k}: the ledger line and the stored line differ`);
      const f = lineFault(row, E.map[k], E.map, M.map);
      need(f === "", `${k}: ${f}`);
    } else {
      need(row.decision === "refuse" && norm(row.why).length > 20, `${k}: a refusal with no reason`);
      need(!(k in E.map) && !(k in P.map), `${k}: a refused pair carries a line`);
    }
  }

  // 4 · nothing shipped moved
  if (HEAD_SRC) {
    const hE = mapOf(HEAD_SRC, "_DOS_EFFECT"), hX = mapOf(HEAD_SRC, "_DOS_EXEC_EFFECT"), hM = mapOf(HEAD_SRC, "_DOS_MECH"), hP = mapOf(HEAD_SRC, "_DOS_POINTER");
    for (const [k, v] of Object.entries(hE.map)) need(E.map[k] === v, `${k}: a shipped line changed`);
    for (const k of Object.keys(E.map)) need(k in hE.map || block.includes(k), `${k}: a new line outside the FIVE ISSUES block`);
    need(X.text === hX.text, "_DOS_EXEC_EFFECT changed");
    need(M.text === hM.text, "_DOS_MECH changed");
    need(P.text === hP.text, "_DOS_POINTER changed");
    const hWin = boot(HEAD_SRC);
    if (!hWin.__err) {
      for (const leaf of LEAVES) {
        need(sansEffect(rendered(win, leaf).html) === sansEffect(rendered(hWin, leaf).html), `${leaf}: the ledger moved outside its effect rows`);
      }
      // The engine itself is HEAD's file once the block is taken out.
      const at = src.indexOf("    " + MARK);
      need(at < 0 || src.slice(0, at) + src.slice(at + blockText.length + 4) === HEAD_SRC,
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
  ok(/const CACHE_VERSION = 'v385';/.test(sw) && sw.includes("// v385 - EFFECT LINES ON FIVE ISSUES."), "the shell moved to v385 with its note");
}

section("mutations");
{
  const SRC = R("consistency.js");
  const swap = (from, to) => { must(SRC.includes(from), `mutation anchor missing: ${from.slice(0, 60)}`); return SRC.split(from).join(to); };
  const SB = "'Provided water efficient landscaping incentives under Utah law.'";
  const LANDS = "'Removed the conservation withdrawal from roughly 1.2 million acres inside the Arctic National Wildlife Refuge.'";
  const muts = [
    ["a method word", swap(SB, "'Provided water efficient landscaping incentives, mapped to water.'")],
    ["a method word the row rule lets through", swap(SB, "'Provided water efficient landscaping incentives, per the rationale.'")],
    ["a line borrowed from another issue", swap(SB, LANDS)],
    ["a title used as the line", swap(SB, "'Water Efficient Landscaping Incentives.'")],
    ["a title used as a fallback", swap("return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '');",
      "return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || (item.title ? String(item.title) + '.' : ''));")],
    ["an over-long line", swap(SB, "'Provided water efficient landscaping incentives under Utah law, for conservancy districts, owners and local governments tracking efficiency standards.'")],
    ["a removed line", swap(`    'S.B. 118|2023GS|water':\n      ${SB},\n`, "")],
    ["a line on a refused pair", swap(`    'H.B. 11|2024GS|water':`, `    'S.B. 271|2023GS|housing':\n      'Imposed home ownership requirements under Utah law.',\n    'H.B. 11|2024GS|water':`)],
    ["a sales word", swap(SB, "'Provided water efficient landscaping incentives to premium members.'")],
    ["an edited Lands line", swap(LANDS, "'Removed the conservation withdrawal from about 1.2 million acres inside the Arctic National Wildlife Refuge.'")],
  ];
  for (const [name, src] of muts) {
    const out = check(src);
    ok(out.length > 0, `mutation "${name}" was not caught`);
  }
  console.log(`      ✓ ${muts.length} mutations run`);
}

console.log(`\n${failures.length ? "✗" : "✓"} five-issue effect lines: ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
