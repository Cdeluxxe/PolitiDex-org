#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-effect-body-lines.mjs — effect lines from the bill body
// ─────────────────────────────────────────────────────────────────────────────
// The v388 coverage pass left 106 pairs silent. db/vr-effect-body-lines.json
// reopens the 31 that were silent only because the stored text was too thin and
// reads each one layer deeper — the Utah bill's own body, the federal
// House-passed text — and records the 75 left closed for a stronger reason.
// The lines sit in _DOS_EFFECT under the EFFECT BODY TEXT SLICE 18 marker.
//
//   1. THE FIXTURE MEMBER: one row per reopened measure, carrying every issue
//      read for it, plus one per not-reopened measure. Every lined pair prints
//      its own line once under its own row; every pair still silent, reopened
//      or not, prints nothing.
//   2. THE LINE RULE, PINNED TO THE BILL TEXT: one sentence, 140 characters or
//      fewer, ending on a stop, the act as the subject, no method or sales word.
//      Every `terms` phrase is in the bill's own quoted text and in the line;
//      every quote is a change the bill makes (inserted or struck text, or a
//      newly enacted section), never only reprinted law; every other content
//      word is in the provisions, quotes or title, a `plain` restatement of a
//      phrase they hold, or an effect verb; every qualifier in `bounds` stays
//      in the line. A Utah act the Legislature's record shows as law reads as
//      done, any other opens "Would have"; a federal line takes its sibling
//      lines' tense. Never the title, another pair's line or a stored did.
//   3. THE LEDGER: reopened and not-reopened together are exactly the v388
//      ledger's silent pairs, each once; a not-reopened pair carries a stronger
//      reason than thin text; every line is in the block and every block line
//      in the ledger; every pair still silent has its reason.
//   4. NOTHING SHIPPED MOVED: every _DOS_EFFECT line at HEAD is byte-identical,
//      the other three tables are unchanged, consistency.js outside the block is
//      HEAD's, and the fixture's drawers outside their effect rows render as at
//      HEAD on every leaf, so no score, count or Direction Match moved.
//   5. MUTATIONS: a line broader than its bill, a dropped qualifier, a claim the
//      text does not make, a method word, a line resting on reprinted law, a
//      borrowed line, a line on a pair still silent, a line on a pair not
//      reopened, a tense flip, a removed line and an edited shipped line must
//      each fail.
//
//   node scripts/test-effect-body-lines.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
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
const MARK = "// EFFECT BODY TEXT SLICE 18 (v389).";
const LEDGER = JSON.parse(R("db/vr-effect-body-lines.json"));
const COVERAGE = JSON.parse(R("db/vr-effect-coverage-lines.json")).rows;
const ROWS = LEDGER.rows, CLOSED = LEDGER.notReopened;
const CATEGORIES = new Set(["sibling", "unrelated", "earlierPass", "statusConflict", "notAnEffect", "execOnly"]);
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary|coded|coding|chip|mapped|mapping|filed as|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger|direction match|pole|defines? terms|technical (?:and conforming )?changes|this bill)\b|PolitiDex|…|\.\.\./i;
const SALES = /\bmembers?(?:hip)?\b|\bstocks?\b|\bpremium\b|\bequity\b|\bDEI\b/i;

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ effect body lines: STALE HARNESS — ${m}`); process.exit(2); } };

const norm = (x) => String(x || "").replace(/\s+/g, " ").trim();
const low = (x) => norm(x).toLowerCase();
const bare = (x) => low(String(x).replace(/\[\+|\+\]|\[-|-\]/g, " "));
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
function blockOf(src) {
  const a = src.indexOf("    " + MARK);
  if (a < 0) return { text: "", keys: [] };
  const end = src.indexOf("\n  };", a);
  const next = src.slice(a + 4 + MARK.length, end).search(/\n {4}\/\/ [A-Z][A-Z -]* SLICE \d+ \(v\d+\)\./);
  const text = src.slice(a, next < 0 ? end + 1 : a + 4 + MARK.length + next + 1);
  return { text, keys: [...text.matchAll(/^    '([^']+)':$/gm)].map((m) => m[1]) };
}

// ── THE FIXTURE MEMBER ──────────────────────────────────────────────────────
const PID = "adam_smith";
const covBy = new Map(COVERAGE.map((r) => [r.key, r]));
const ALL = [...ROWS.map((r) => ({ ...covBy.get(r.key), ...r })), ...CLOSED.map((c) => covBy.get(c.key)).filter(Boolean)];
const measures = new Map();
for (const r of ALL) {
  if (r.lane === "federal" && !(r.members > 1)) continue;   // a President's row is not a vote row
  const m = `${r.number}|${r.sitting}`;
  if (!measures.has(m)) measures.set(m, { ...r, leaves: [] });
  measures.get(m).leaves.push(r.issue);
}
const FIXTURE = [...measures.values()].map((m) => {
  const fed = m.lane === "federal";
  return {
    kind: "vote", measureId: `${m.number}|${m.sitting}`, measureType: /Amdt/.test(m.number) ? "amendment" : "bill", number: m.number, title: m.title,
    chamber: fed ? "house" : (/^S\./.test(m.number) ? "utah senate" : "utah house"), status: m.status || (m.enacted ? "enacted" : "introduced"),
    date: fed ? "2025-06-01T00:00:00.000Z" : `${m.sitting.slice(0, 4)}-03-01T00:00:00.000Z`, action: "On passage", actionType: "passage",
    position: "yea", result: "passed", isParty: "with_party", supports: true, isProcedural: false,
    advanceInverted: false, isAmendment: /Amdt/.test(m.number), parentMeasureId: null, rollcallId: null,
    congress: fed ? Number(m.sitting) : null, session: fed ? 1 : Number(m.sitting.slice(0, 4)), rollNumber: null,
    measureIdent: fed ? null : { session: m.sitting, readFrom: null, readFromUrl: null, officialTitle: null, billUrl: null },
    issues: m.leaves.map((k, i) => ({ issueKey: k, weight: 100 - i, isPrimary: i === 0, supportMeaning: "yea_supports", rationale: null })),
  };
});
const LEAVES = [...new Set([...measures.values()].flatMap((m) => m.leaves))].sort();

function boot(src) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(f === "consistency.js" ? src : R(f), ctx, { filename: f }); } catch (e) { win.__err = `${f}: ${e.message}`; }
  }
  win.PROFILES = win.CMP_DATA;
  try { win.PDXVotingRecord.noteMember(PID, FIXTURE); } catch (e) { win.__err = `noteMember: ${e.message}`; }
  return win;
}
const pairOf = (it, k) => `${norm(it.number)}|${typeof it.congress === "number" ? it.congress : (it.measureIdent && it.measureIdent.session) || ""}|${k}`;
function rendered(win, leaf) {
  const CS = win.PDXConsistency;
  let items = [], html = "";
  try { items = CS.dossierItems(PID, leaf) || []; } catch { return { rows: new Map(), html: "" }; }
  try { html = CS.dossierLedgerHtml(PID, leaf) || ""; } catch { html = ""; }
  const effs = new Map();
  for (const m of html.matchAll(/<tr class="pdxlg-effr" data-pdxlg-effr="(\d+)">([\s\S]*?)<\/tr>/g)) effs.set(Number(m[1]), (effs.get(Number(m[1])) || []).concat(dec(m[2])));
  const rows = new Map();
  for (const m of html.matchAll(/<tr data-pdxlg-row="(\d+)">/g)) {
    const i = Number(m[1]), d = items[i], it = (d && d.item) || {};
    if (!d || d.lane === "exec" || !norm(it.number)) continue;
    const p = pairOf(it, leaf);
    rows.set(p, (rows.get(p) || []).concat([effs.get(i) || []]));
  }
  return { rows, html };
}
const sansEffect = (h) => String(h).replace(/<tr class="pdxlg-(?:effr|relr)"[\s\S]*?<\/tr>/g, "");

// ── ONE LINE AGAINST ITS OWN BILL TEXT ──────────────────────────────────────
const STOP = new Set(("a an the and or of to for in on by at as with from its it their them that this these those who which " +
  "when where may can before after into under over than more less some any each every one all part per is against utah not no " +
  "without also such other own has have be been being if whether while within between through about only until").split(" "));
const VERBS = new Set(("would have had set let made gave created extended raised barred required imposed provided measured " +
  "restricted authorized give allowed banned prohibited repealed removed expanded increased reduced lowered limited exempted " +
  "established directed ended added applied enacted protected kept permitted struck changed moved shifted put cut capped " +
  "granted opened closed named tied sent held voided").split(" "));
const words = (x) => String(x).toLowerCase().replace(/[’']/g, "'").match(/[a-z0-9%]+(?:[-'][a-z0-9]+)*/g) || [];
const stem = (w) => w.replace(/'s$/, "").replace(/ies$/, "y").replace(/(?:ing|ed|es|s)$/, "");
const quotesOf = (row) => row.lane === "federal" ? (row.sources || []).map((s) => s.quote) : (row.textQuote || []);
// A Utah quote shows a change when it carries inserted or struck text, or comes
// from a section the bill newly enacts ("is enacted to read").
const isChange = (q, row) => /\[\+[\s\S]*?\+\]|\[-[\s\S]*?-\]/.test(q) || /enact/i.test(String(row.section || ""));
function lineFault(row, v, E, M) {
  const s = norm(v), k = row.key;
  if (!s) return "no line is stored";
  if (s.length > 140) return `${s.length} characters`;
  if (!/[.!?]$/.test(s)) return "does not end on a stop";
  if (/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "more than one sentence";
  if (!/^[A-Z][a-z]+\b/.test(s) || /^(?:This|The bill|It)\b/.test(s)) return "the act is not the subject";
  const mw = s.match(METHOD); if (mw) return `method word: ${mw[0]}`;
  if (SALES.test(s)) return "sales word";
  if (M[k] && norm(M[k].did)) return "the pair stores a did, so the bill's text is not its source";
  if (low(s.replace(/[.!?]$/, "")) === low(row.title)) return "the line is the measure's title";
  const Q = quotesOf(row);
  if (!Q.length) return "no quoted bill text";
  if (row.lane === "utah") {
    if (!/^https:\/\/le\.utah\.gov\//.test(String(row.textFrom))) return "the bill text is not from the Legislature's record";
    if (!Q.some((q) => isChange(q, row))) return "rests only on existing law the bill reprints — no inserted, struck or newly enacted text is quoted";
  } else if (!(row.sources || []).some((x) => /^https:\/\/www\.govinfo\.gov\//.test(x.from))) return "no quoted text from GovInfo";
  const quoted = bare(Q.join(" "));
  const from = bare([row.provisions || "", ...Q].join(" "));
  if (!(row.terms || []).length) return "no terms tie the line to its bill";
  for (const t of row.terms) {
    if (!quoted.includes(low(t))) return `the term "${t}" is not in this bill's quoted text`;
    if (!low(s).includes(low(t))) return `the line does not carry its bill's term "${t}"`;
  }
  for (const [w, src] of Object.entries(row.plain || {})) if (!from.includes(low(src))) return `"${w}" restates "${src}", which this bill does not say`;
  const srcW = new Set(words([from, row.title].join(" ")).map(stem));
  const plain = new Set(Object.keys(row.plain || {}).flatMap((w) => words(w)).map(stem));
  const near = (w) => [...srcW].some((x) => x.length > 3 && w.length > 3 && (x.startsWith(w) || w.startsWith(x)));
  const extra = words(s).filter((w) => !STOP.has(w) && !STOP.has(stem(w)) && !VERBS.has(w) && !srcW.has(stem(w)) && !plain.has(stem(w)) && !near(stem(w)));
  if (extra.length) return `broader than the bill — words it does not support: ${extra.join(", ")}`;
  for (const b of row.bounds || []) if (!low(s).includes(b)) return `broader than the bill — the line drops its qualifier "${b}"`;
  // "any", "all" and "every" claim the whole field; only the bill may say so.
  for (const w of s.match(/\b(?:any|all|every)\b/gi) || []) if (!new RegExp("\\b" + w + "\\b", "i").test(Q.join(" "))) return `broader than the bill — "${w}" is the line's word, not the bill's`;
  for (const [j, w] of Object.entries(E)) if (j !== k && norm(w) === s) return `borrowed from ${j}`;
  for (const [j, m] of Object.entries(M)) if (m && m.did && norm(m.did).includes(s.replace(/[.!?]$/, ""))) return `borrowed from ${j}'s stored did`;
  if (row.lane === "utah") {
    if (row.enacted && /^(?:Would|Proposed)\b/.test(s)) return "an enacted act is written as though it did not take effect";
    if (!row.enacted && !/^Would have\b/.test(s)) return "an act that never became law is written as though it took effect";
    if (row.enacted && !/^(?:Governor Signed|Became Law w\/o Governor Signature)/.test(String(row.enactedPer))) return "read as law with no signature on the Legislature's record";
  } else {
    if (!norm(row.tense)) return "no record of what settles the federal line's tense";
    const sib = Object.entries(E).find(([j]) => j !== k && j.startsWith(k.split("|").slice(0, 2).join("|") + "|"));
    if (sib && /^Would\b/.test(sib[1]) !== /^Would\b/.test(s)) return "its tense is not the tense of the act's other lines";
  }
  return "";
}

function check(src) {
  const out = [];
  const need = (c, m) => { if (!c) out.push(m); };
  const E = mapOf(src, "_DOS_EFFECT"), X = mapOf(src, "_DOS_EXEC_EFFECT"), M = mapOf(src, "_DOS_MECH"), P = mapOf(src, "_DOS_POINTER");
  if (!E || !X || !M || !P) return ["effect maps not found in consistency.js"];
  const win = boot(src);
  if (win.__err) return [`boot: ${win.__err}`];
  const byKey = new Map(ROWS.map((r) => [r.key, r]));
  const closed = new Set(CLOSED.map((c) => c.key));
  // A later slice may write a pair this pass did not reopen for its sibling or
  // no-bearing reason, from a section this pass did not read (v390); its line is
  // that slice's to hold. A pair still silent after the body read, or closed for
  // a status, forecast or no-vote-row reason, stays silent here.
  const LATER_OK = new Set(["sibling", "unrelated"]);
  const later = new Set([...keysAfter(src, "_DOS_EFFECT", 389)].filter((k) => CLOSED.some((c) => c.key === k && LATER_OK.has(c.category))));

  // 1 · the fixture member
  const seen = new Set();
  for (const leaf of LEAVES) {
    for (const [pair, lists] of rendered(win, leaf).rows) {
      const row = byKey.get(pair);
      if (!row && !closed.has(pair)) continue;
      seen.add(pair);
      for (const got of lists) {
        need(got.length <= 1, `${pair}: ${got.length} effect lines under one row`);
        if (row && row.decision === "line") need(got.length === 1 && got[0] === norm(row.line), `${pair}: prints ${JSON.stringify(got)}, the ledger says ${JSON.stringify(row.line)}`);
        else if (later.has(pair)) need(got.length === 1 && got[0] === norm(E.map[pair]), `${pair}: a later slice's pair prints ${JSON.stringify(got)}`);
        else need(!got.length, `${pair}: a silent pair prints ${JSON.stringify(got[0])}`);
      }
    }
  }
  for (const [m] of measures) for (const r of ALL.filter((x) => `${x.number}|${x.sitting}` === m)) need(seen.has(r.key), `${r.key}: the fixture's row did not render`);

  // 2–3 · the ledger and the block
  const silent = COVERAGE.filter((r) => r.decision === "refuse").map((r) => r.key).sort();
  const read = [...ROWS.map((r) => r.key), ...CLOSED.map((c) => c.key)].sort();
  need(JSON.stringify(read) === JSON.stringify(silent), `the reopened and not-reopened pairs (${read.length}) are not exactly v388's ${silent.length} silent pairs, each once`);
  need(LEDGER.counts && LEDGER.counts.reopened === ROWS.length && LEDGER.counts.notReopened === CLOSED.length && LEDGER.counts.lines === ROWS.filter((r) => r.decision === "line").length, "the ledger's counts do not match its rows");
  for (const c of CLOSED) {
    need(CATEGORIES.has(c.category) && norm(c.why).length > 30, `${c.key}: not reopened without a stronger reason`);
    need((!(c.key in E.map) || later.has(c.key)) && !(c.key in P.map), `${c.key}: a pair not reopened carries a line`);
  }
  const { keys: block } = blockOf(src);
  const lined = ROWS.filter((r) => r.decision === "line");
  need(block.length === lined.length, `the EFFECT BODY TEXT block holds ${block.length} lines, the ledger ${lined.length}`);
  for (const k of block) need(byKey.has(k) && byKey.get(k).decision === "line", `${k}: a block line the ledger does not record`);
  for (const row of ROWS) {
    const k = row.key;
    need(`${row.number}|${row.sitting}|${row.issue}` === k, `${k}: the ledger's identity fields do not spell its key`);
    need(!/^datacenter_/.test(row.issue), `${k}: a Data Centers pair`);
    need(norm(row.priorWhy).length > 20, `${k}: reopened without the thin-text reason it was silent for`);
    if (row.decision === "line") {
      need(block.includes(k), `${k}: the line is not in the EFFECT BODY TEXT block`);
      need(norm(row.line) === norm(E.map[k]), `${k}: the ledger line and the stored line differ`);
      const f = lineFault(row, E.map[k], E.map, M.map);
      need(f === "", `${k}: ${f}`);
    } else {
      need(row.decision === "refuse" && norm(row.why).length > 20, `${k}: still silent with no reason`);
      need(!(k in E.map) && !(k in P.map), `${k}: a pair still silent carries a line`);
    }
  }

  // 4 · nothing shipped moved
  if (HEAD_SRC && HEAD_SRC !== src) {
    const hE = mapOf(HEAD_SRC, "_DOS_EFFECT"), hX = mapOf(HEAD_SRC, "_DOS_EXEC_EFFECT"), hM = mapOf(HEAD_SRC, "_DOS_MECH"), hP = mapOf(HEAD_SRC, "_DOS_POINTER");
    const headBlock = new Set(blockOf(HEAD_SRC).keys);
    for (const [k, v] of Object.entries(hE.map)) if (!headBlock.has(k)) need(E.map[k] === v, `${k}: a shipped line changed`);
    for (const k of Object.keys(E.map)) need(k in hE.map || block.includes(k) || later.has(k), `${k}: a new line outside the EFFECT BODY TEXT block`);
    need(X.text === hX.text, "_DOS_EXEC_EFFECT changed");
    need(M.text === hM.text, "_DOS_MECH changed");
    need(P.text === hP.text, "_DOS_POINTER changed");
    // This block and any later slice's after it, to the end of the table.
    const cut = (x) => { const a = x.indexOf("    " + MARK); return a < 0 ? x : x.slice(0, a) + x.slice(x.indexOf("\n  };", a) + 1); };
    need(cut(src) === cut(HEAD_SRC), "consistency.js moved outside the EFFECT BODY TEXT block");
    const hWin = boot(HEAD_SRC);
    if (!hWin.__err) for (const leaf of LEAVES) need(sansEffect(rendered(win, leaf).html) === sansEffect(rendered(hWin, leaf).html), `${leaf}: the ledger moved outside its effect rows`);
  }
  return out;
}

section("the tree");
{
  const out = check(R("consistency.js"));
  ok(out.length === 0, `the tree:\n      ${out.slice(0, 15).join("\n      ")}`);
  const lined = ROWS.filter((r) => r.decision === "line");
  if (!out.length) console.log(`      ✓ ${ROWS.length} pairs reopened, ${lined.length} lines, ${ROWS.length - lined.length} still silent, ${CLOSED.length} not reopened, nothing shipped moved`);
  const sw = R("sw.js");
  ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 389 && sw.includes("// v389 - EFFECT LINES FROM THE BILL BODY."), "the shell moved to v389 or later, with the v389 note");
}

const SRC = R("consistency.js");
const E0 = mapOf(SRC, "_DOS_EFFECT").map, M0 = mapOf(SRC, "_DOS_MECH").map;
const row = (k) => ROWS.find((r) => r.key === k);
const lineOf = (k) => { must(row(k) && row(k).decision === "line", `${k} is not a lined pair`); return row(k).line; };
const q = (s) => `'${s}'`;
const swap = (from, to) => { must(SRC.includes(from), `mutation anchor missing: ${from.slice(0, 60)}`); return SRC.split(from).join(to); };
const TAX = "H.B. 106|2025GS|lower_taxes", GUN = "H.B. 507|2023GS|gun_rights", DEI = "H.B. 451|2023GS|end_dei", FED = "H.R. 3633|119|econ_growth";
const STILL = ROWS.find((r) => r.decision === "refuse"), CLOSE = CLOSED.find((c) => c.category === "sibling" && /GS\|/.test(c.key));
must(STILL && CLOSE, "mutation fixtures moved");

section("mutations");
{
  const TL = lineOf(TAX), GL = lineOf(GUN), DL = lineOf(DEI), FL = lineOf(FED);
  const SHIPPED = E0["S.B. 181|2025GS|housing"];
  const muts = [
    ["a line broader than its bill", swap(q(GL), q(GL.replace("one non-violent, non-domestic felony", "any felony")))],
    ["a dropped qualifier", swap(q(DL), q(DL.replace(", with exceptions", "")))],
    ["a claim the text does not make", swap(q(TL), q(TL.replace("4.5%", "4%")))],
    ["a method word", swap(q(TL), q(TL.replace(/^Cut/, "Coded as cutting")))],
    ["a federal line broader than its bill", swap(q(FL), q(FL.replace("solely for creating or publishing blockchain software", "for any activity")))],
    ["a line borrowed from another issue", swap(q(TL), q(E0["H.B. 264|2025GS|climate_action"]))],
    ["a line on a pair still silent", swap(`    '${TAX}':`, `    '${STILL.key}':\n      'Barred the practice entirely.',\n    '${TAX}':`)],
    ["a line on a pair not reopened", swap(`    '${TAX}':`, `    '${CLOSE.key}':\n      'Barred the practice entirely.',\n    '${TAX}':`)],
    ["a tense flip", swap(q(DL), q(DL.replace(/^Would have barred/, "Barred")))],
    ["a removed line", swap(`    '${TAX}':\n      ${q(TL)},\n`, "")],
    ["an edited shipped line", swap(q(SHIPPED), q(SHIPPED.replace("Barred", "Stopped")))],
  ];
  for (const [name, src] of muts) ok(check(src).length > 0, `mutation "${name}" was not caught`);
  console.log(`      ✓ ${muts.length} mutations run`);
}

section("the line rule on its own");
{
  // Judged by lineFault alone against the ledger row, so a mutation written into
  // both the table and the ledger is still caught.
  const T = row(TAX), G = row(GUN), D = row(DEI), F = row(FED);
  const reprint = { ...T, textQuote: T.textQuote.map((x) => x.replace(/\[\+|\+\]|\[-[^\]]*-\]/g, "")) };
  const cases = [
    [G, G.line.replace("one non-violent, non-domestic felony", "any felony"), /broader|term/],
    [G, G.line.replace("one non-violent, non-domestic felony", "every non-domestic felony"), /broader/],
    [D, D.line.replace(", with exceptions", ""), /qualifier/],
    [T, T.line.replace("4.5%", "4%"), /broader/],
    [T, T.line.replace(/^Cut/, "Coded as cutting"), /method word/],
    [T, T.line, /reprints/, reprint],
    [F, F.line.replace("solely for creating or publishing blockchain software", "for any activity"), /broader|term|qualifier/],
    [T, E0["H.B. 264|2025GS|climate_action"], /term|borrowed|broader/],
    [D, D.line.replace(/^Would have barred/, "Barred"), /never became law/],
    [D, D.line.replace("statements on anti-racism", "DEI statements on anti-racism").slice(0, 140), /sales word|characters|stop/],
    [{ ...G, plain: { ...G.plain, firearm: "every firearm forever" } }, G.line, /restates/],
  ];
  for (const [r, line, want, base] of cases) {
    const rr = base || r;
    const f = lineFault({ ...rr, line }, line, { ...E0, [rr.key]: line }, M0);
    ok(want.test(f), `lineFault let ${JSON.stringify(String(line).slice(0, 60))} through (said ${JSON.stringify(f)})`);
  }
  console.log(`      ✓ ${cases.length} bad lines refused by the rule alone`);
}

console.log(`\n${failures.length ? "✗" : "✓"} effect body lines: ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
