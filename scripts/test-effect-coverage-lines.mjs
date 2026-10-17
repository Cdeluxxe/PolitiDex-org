#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-effect-coverage-lines.mjs — effect lines beyond the five issues
// ─────────────────────────────────────────────────────────────────────────────
// When this pass began, 397 mapped measure×issue pairs with a member row printed
// nothing under the row: 344 Utah pairs and 53 federal. db/vr-effect-coverage-
// lines.json reads every one. A Utah line is written from the bill's own
// Highlighted Provisions, quoted from the Legislature's record; a federal line
// from the enrolled or House-passed text on GovInfo, quoted in `sources`. Those
// lines sit in _DOS_EFFECT under the EFFECT COVERAGE SLICE 17 marker; every
// other pair stays silent, each with the reason.
//
//   1. THE FIXTURE MEMBER: one row per measure in the ledger, in the API's
//      RecordItem shape, carrying every issue the ledger read for it. On each of
//      those issues' drawers, every lined pair prints its own line once, under
//      its own row, and every silent pair prints nothing.
//   2. THE LINE RULE: one sentence, 140 characters or fewer, ending on a stop, no
//      method or sales words. FROM THE BILL: every `terms` phrase is in the
//      bill's quoted words and in the line; every other content word in the line
//      is in those words or the title, a `plain` restatement of a phrase they
//      hold, or one of a few effect verbs; every qualifier in `bounds` is still
//      in the line, so a line cannot drop "certain" and claim the whole field.
//      Never the title, never another pair's line, never a sibling's stored did.
//      A Utah act the Legislature's record shows as law reads as done; any other
//      opens "Would have". A federal line takes the tense its quoted text and
//      sibling lines settle.
//   3. THE LEDGER: the 397 pairs, each once; every line in the block and every
//      block line in the ledger; every refusal reasoned and lineless; no new
//      mapping (each key's issue is one the census read for that measure).
//   4. NOTHING SHIPPED MOVED: every _DOS_EFFECT line at HEAD is byte-identical;
//      _DOS_MECH, _DOS_EXEC_EFFECT and _DOS_POINTER are unchanged; consistency.js
//      outside the block is HEAD's; and the fixture's ledger with its effect rows
//      taken out renders as at HEAD on every leaf, so no score, count or
//      Direction Match moved.
//   5. MUTATIONS: an invented claim, a line broader than its bill, a method
//      word, a line borrowed from another issue, a title as the line, a title as
//      a fallback, an over-long line, a removed line, a line on a silent pair, a
//      failed act written as law, a sales word and an edited shipped line must
//      each fail.
//
//   node scripts/test-effect-coverage-lines.mjs
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
const MARK = "// EFFECT COVERAGE SLICE 17 (v388).";
const LEDGER = JSON.parse(R("db/vr-effect-coverage-lines.json"));
const ROWS = LEDGER.rows;
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary|coded|coding|chip|mapped|mapping|filed as|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger|direction match|pole|defines? terms|technical (?:and conforming )?changes)\b|PolitiDex|…|\.\.\./i;
const SALES = /\bmembers?(?:hip)?\b|\bstocks?\b|\bpremium\b|\bequity\b/i;

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ effect coverage lines: STALE HARNESS — ${m}`); process.exit(2); } };

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
// The block runs from its marker to the end of the table, or to a later
// slice's marker.
function blockOf(src) {
  const a = src.indexOf("    " + MARK);
  if (a < 0) return { text: "", keys: [] };
  const end = src.indexOf("\n  };", a);
  const next = src.slice(a + 4 + MARK.length, end).search(/\n {4}\/\/ [A-Z][A-Z -]* SLICE \d+ \(v\d+\)\./);
  const text = src.slice(a, next < 0 ? end + 1 : a + 4 + MARK.length + next + 1);
  return { text, keys: [...text.matchAll(/^    '([^']+)':$/gm)].map((m) => m[1]) };
}

// ── THE FIXTURE MEMBER ──────────────────────────────────────────────────────
// One RecordItem per measure the ledger read, carrying every issue it read for
// that measure, so each pair has exactly one row on its own leaf.
const PID = "adam_smith";
const measures = new Map();
for (const r of ROWS) {
  const m = `${r.number}|${r.sitting}`;
  if (!measures.has(m)) measures.set(m, { ...r, leaves: [] });
  measures.get(m).leaves.push(r.issue);
}
const item = (m) => {
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
};
// Executive-only federal pairs are a President's row, not a vote: no fixture
// vote row is made for them.
const FIXTURE = [...measures.values()].filter((m) => m.lane === "utah" || m.members > 1).map(item);
const LEAVES = [...new Set(ROWS.filter((r) => r.lane === "utah" || r.members > 1).map((r) => r.issue))].sort();

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
const pairOf = (it, k) => {
  const sit = typeof it.congress === "number" ? it.congress : (it.measureIdent && it.measureIdent.session) || "";
  return `${norm(it.number)}|${sit}|${k}`;
};
function rendered(win, leaf) {
  const CS = win.PDXConsistency;
  let items = [], html = "";
  try { items = CS.dossierItems(PID, leaf) || []; } catch { return { rows: new Map(), html: "" }; }
  try { html = CS.dossierLedgerHtml(PID, leaf) || ""; } catch { html = ""; }
  const effs = new Map(), rels = new Set();
  for (const m of html.matchAll(/<tr class="pdxlg-relr" data-pdxlg-relr="(\d+)">/g)) rels.add(Number(m[1]));
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
// An effect line brings its row's "Also on" chips with it (the other issues the
// act is stored on sit under its effect line), so both are the line's own rows.
const sansEffect = (h) => String(h).replace(/<tr class="pdxlg-(?:effr|relr)"[\s\S]*?<\/tr>/g, "");

// ── ONE LINE AGAINST ITS OWN BILL ───────────────────────────────────────────
const STOP = new Set(("a an the and or of to for in on by at as with from its it their them that this " +
  "these those who which when where may can before after into under over than more less some any each " +
  "every one all part per is against utah not no without also such other own has have be been being if " +
  "whether while within between through about only until").split(" "));
const VERBS = new Set(("would have had set let made gave created extended raised barred required imposed " +
  "provided measured restricted authorized give allowed banned prohibited repealed removed expanded increased " +
  "reduced lowered limited exempted established directed ended added applied enacted protected kept permitted " +
  "struck changed moved shifted put cut capped granted opened closed named tied sent held voided").split(" "));
const words = (x) => String(x).toLowerCase().replace(/[’']/g, "'").match(/[a-z0-9%]+(?:[-'][a-z0-9]+)*/g) || [];
const stem = (w) => w.replace(/'s$/, "").replace(/ies$/, "y").replace(/(?:ing|ed|es|s)$/, "");
const sourceText = (row) => row.lane === "federal"
  ? (row.sources || []).map((s) => s.quote).join(" ")
  : [row.provisions, ...(row.textQuote || [])].join(" ");
function uncovered(row, line) {
  const src = new Set(words([sourceText(row), row.title].join(" ")).map(stem));
  const plain = new Set(Object.keys(row.plain || {}).flatMap((w) => words(w)).map(stem));
  const near = (w) => [...src].some((x) => x.length > 3 && w.length > 3 && (x.startsWith(w) || w.startsWith(x)));
  return words(line).filter((w) => !STOP.has(w) && !STOP.has(stem(w)) && !VERBS.has(w) && !src.has(stem(w)) && !plain.has(stem(w)) && !near(stem(w)));
}
function lineFault(row, v, E, M) {
  const s = norm(v), k = row.key;
  if (!s) return "no line is stored";
  if (s.length > 140) return `${s.length} characters`;
  if (!/[.!?]$/.test(s)) return "does not end on a stop";
  if (/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "more than one sentence";
  if (!/^[A-Z][a-z]+\b/.test(s) || /^(?:This|The bill|It)\b/.test(s)) return "the act is not the subject";
  const mw = s.match(METHOD);
  if (mw) return `method word: ${mw[0]}`;
  if (SALES.test(s)) return "sales word";
  if (M[k] && norm(M[k].did)) return "the pair stores a did, so the bill's text is not its source";
  if (low(s.replace(/[.!?]$/, "")) === low(row.title)) return "the line is the measure's title";
  const from = low(sourceText(row));
  if (row.lane === "utah") {
    if (!/^\d{4}GS$/.test(row.sitting)) return `the sitting "${row.sitting}" is not a Utah session`;
    if (norm(row.provisions).length < 40 || !/^https:\/\/le\.utah\.gov\//.test(String(row.provisionsFrom))) return "no quoted provisions from the Legislature's record";
  } else {
    if (!(row.sources || []).length || !(row.sources || []).some((x) => /^https:\/\/www\.govinfo\.gov\//.test(x.from))) return "no quoted text from GovInfo";
  }
  if (!(row.terms || []).length) return "no terms tie the line to its bill";
  for (const t of row.terms) {
    if (!from.includes(low(t))) return `the term "${t}" is not in this bill's own words`;
    if (!low(s).includes(low(t))) return `the line does not carry its bill's term "${t}"`;
  }
  for (const [w, src] of Object.entries(row.plain || {})) if (!from.includes(low(src))) return `"${w}" restates "${src}", which this bill does not say`;
  const extra = uncovered(row, s);
  if (extra.length) return `broader than the bill — words it does not support: ${extra.join(", ")}`;
  for (const b of row.bounds || []) if (!low(s).includes(b)) return `broader than the bill — the line drops its qualifier "${b}"`;
  for (const [j, w] of Object.entries(E)) if (j !== k && norm(w) === s) return `borrowed from ${j}`;
  for (const [j, m] of Object.entries(M)) if (m && m.did && norm(m.did).includes(s.replace(/[.!?]$/, ""))) return `borrowed from ${j}'s stored did`;
  if (row.lane === "utah") {
    if (row.enacted && /^(?:Would|Proposed)\b/.test(s)) return "an enacted act is written as though it did not take effect";
    if (!row.enacted && !/^Would have\b/.test(s)) return "an act that never became law is written as though it took effect";
    if (row.enacted && !/^(?:Governor Signed|Became Law w\/o Governor Signature)/.test(String(row.enactedPer))) return "read as law with no signature or law-without-signature on the Legislature's record";
  } else if (!norm(row.tense)) return "no record of what settles the federal line's tense";
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
  // A pair this pass left silent may be written by a later slice from text this
  // pass did not read (the bill body, v389); its line is that slice's to hold.
  const later = keysAfter(src, "_DOS_EFFECT", 388);

  // 1 · the fixture member, on every leaf
  const seen = new Set();
  for (const leaf of LEAVES) {
    const { rows, strayRel } = rendered(win, leaf);
    need(!strayRel, `${leaf}: ${strayRel} "Also on" row(s) with no effect line above them`);
    for (const [pair, lists] of rows) {
      const row = byKey.get(pair);
      if (!row) continue;
      seen.add(pair);
      const stored = E.map[pair] || (M.map[pair] && M.map[pair].did) || "";
      for (const got of lists) {
        need(got.length <= 1, `${pair}: ${got.length} effect lines under one row`);
        if (row.decision === "refuse" && later.has(pair)) need(got.length === 1 && got[0] === norm(E.map[pair]), `${pair}: a later slice's pair prints ${JSON.stringify(got)}`);
        else if (row.decision === "refuse") need(!got.length, `${pair}: a silent pair prints ${JSON.stringify(got[0])}`);
        if (row.decision === "line") need(got.length === 1 && got[0] === norm(row.line), `${pair}: prints ${JSON.stringify(got)}, the ledger says ${JSON.stringify(row.line)}`);
        if (got.length) need(got[0] === norm(stored), `${pair}: prints a line that is not its own pair's`);
      }
    }
  }
  for (const r of ROWS) if (r.lane === "utah" || r.members > 1) need(seen.has(r.key), `${r.key}: the fixture's row did not render`);

  // 2–3 · the ledger and the block
  const { keys: block } = blockOf(src);
  const lined = ROWS.filter((r) => r.decision === "line");
  need(block.length === lined.length, `the EFFECT COVERAGE block holds ${block.length} lines, the ledger ${lined.length}`);
  need(ROWS.length === 397 && new Set(ROWS.map((r) => r.key)).size === 397, `${ROWS.length} ledger rows — the pass read 397 pairs, each once`);
  need(LEDGER.census && LEDGER.census.utahPairs === 344 && LEDGER.census.federalPairs === 53, "the census counts are not recorded");
  for (const k of block) need(byKey.has(k) && byKey.get(k).decision === "line", `${k}: a block line the ledger does not record`);
  for (const row of ROWS) {
    const k = row.key;
    need(`${row.number}|${row.sitting}|${row.issue}` === k, `${k}: the ledger's identity fields do not spell its key`);
    need(!/^datacenter_/.test(row.issue), `${k}: a Data Centers pair`);
    if (row.decision === "line") {
      need(block.includes(k), `${k}: the line is not in the EFFECT COVERAGE block`);
      need(norm(row.line) === norm(E.map[k]), `${k}: the ledger line and the stored line differ`);
      const f = lineFault(row, E.map[k], E.map, M.map);
      need(f === "", `${k}: ${f}`);
    } else {
      need(row.decision === "refuse" && norm(row.why).length > 20, `${k}: a refusal with no reason`);
      need((!(k in E.map) || later.has(k)) && !(k in P.map), `${k}: a silent pair carries a line`);
    }
  }
  // Two pairs of one act never print the same line.
  const seenLine = new Map();
  for (const r of lined) {
    const act = r.key.split("|").slice(0, 2).join("|"), l = norm(E.map[r.key]);
    need(!seenLine.has(act + "§" + l), `${r.key}: the same line as ${seenLine.get(act + "§" + l)}`);
    seenLine.set(act + "§" + l, r.key);
  }

  // 4 · nothing shipped moved
  if (HEAD_SRC && HEAD_SRC !== src) {
    const hE = mapOf(HEAD_SRC, "_DOS_EFFECT"), hX = mapOf(HEAD_SRC, "_DOS_EXEC_EFFECT"), hM = mapOf(HEAD_SRC, "_DOS_MECH"), hP = mapOf(HEAD_SRC, "_DOS_POINTER");
    const headBlock = new Set(blockOf(HEAD_SRC).keys);
    for (const [k, v] of Object.entries(hE.map)) if (!headBlock.has(k)) need(E.map[k] === v, `${k}: a shipped line changed`);
    for (const k of Object.keys(E.map)) need(k in hE.map || block.includes(k) || later.has(k), `${k}: a new line outside the EFFECT COVERAGE block`);
    need(X.text === hX.text, "_DOS_EXEC_EFFECT changed");
    need(M.text === hM.text, "_DOS_MECH changed");
    need(P.text === hP.text, "_DOS_POINTER changed");
    // This block and any later slice's after it, to the end of the table.
    const cut = (x) => { const a = x.indexOf("    " + MARK); return a < 0 ? x : x.slice(0, a) + x.slice(x.indexOf("\n  };", a) + 1); };
    need(cut(src) === cut(HEAD_SRC), "consistency.js moved outside the EFFECT COVERAGE block");
    const hWin = boot(HEAD_SRC);
    if (!hWin.__err) {
      for (const leaf of LEAVES) {
        need(sansEffect(rendered(win, leaf).html) === sansEffect(rendered(hWin, leaf).html), `${leaf}: the ledger moved outside its effect rows`);
      }
    }
  }
  return out;
}

section("the tree");
{
  const out = check(R("consistency.js"));
  ok(out.length === 0, `the tree:\n      ${out.slice(0, 15).join("\n      ")}`);
  const lined = ROWS.filter((r) => r.decision === "line");
  if (!out.length) console.log(`      ✓ ${ROWS.length} pairs read, ${lined.length} lines (${lined.filter((r) => r.lane === "utah").length} Utah, ${lined.filter((r) => r.lane === "federal").length} federal), ${LEAVES.length} leaves rendered, nothing shipped moved`);
  const sw = R("sw.js");
  ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 388 && sw.includes("// v388 - EFFECT LINES BEYOND THE FIVE ISSUES."), "the shell moved to v388 or later, with the v388 note");
}

section("mutations");
{
  const SRC = R("consistency.js");
  const E = mapOf(SRC, "_DOS_EFFECT").map;
  const row = (k) => ROWS.find((r) => r.key === k);
  const q = (s) => `'${s}'`;
  const lineOf = (k) => { must(row(k) && row(k).decision === "line", `${k} is not a lined pair`); return row(k).line; };
  const swap = (from, to) => { must(SRC.includes(from), `mutation anchor missing: ${from.slice(0, 60)}`); return SRC.split(from).join(to); };
  const A = "H.B. 316|2024GS|lgbtq_rights", B = "H.B. 300|2025GS|voting_access", C = "H.B. 300|2025GS|voter_id";
  const F = "H.R. 6644|119|crypto_cbdc", S = "S.B. 102|2025GS|public_schools";
  const AL = lineOf(A), BL = lineOf(B), CL = lineOf(C), FL = lineOf(F);
  const SHIPPED = E["S.B. 181|2025GS|housing"];
  must(SHIPPED && row(S) && row(S).decision === "refuse", "mutation fixtures moved");
  const muts = [
    ["an invented claim", swap(q(AL), q(AL.replace("housing inmates", "housing dogs"))) ],
    ["a line broader than its bill", swap(q(AL), q(AL.replace(", with limited exceptions,", ""))) ],
    ["a method word", swap(q(BL), q(BL.replace("with certain exceptions", "mapped with exceptions"))) ],
    ["a line borrowed from another issue", swap(q(BL), q(CL)) ],
    ["a federal line broader than its bill", swap(q(FL), q(FL.replace(" until the bar sunsets at the end of 2030", " forever"))) ],
    ["a title used as the line", swap(q(BL), q(row(B).title + ".")) ],
    ["a title used as a fallback", swap("return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '');",
      "return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || (item.title ? String(item.title) + '.' : ''));")],
    ["an over-long line", swap(q(BL), q(BL.replace(/\.$/, ", and it also defined many terms and made several technical and conforming changes across the code."))) ],
    ["a removed line", swap(`    '${B}':\n      ${q(BL)},\n`, "") ],
    ["a line on a silent pair", swap(`    '${B}':`, `    '${S}':\n      'Required regular program reviews by the Education Interim Committee for certain public school programs.',\n    '${B}':`) ],
    ["an act that never became law written as law", swap(q(lineOf("H.B. 97|2024GS|gun_safety")), q(lineOf("H.B. 97|2024GS|gun_safety").replace(/^Would have created/, "Created"))) ],
    ["a sales word", swap(q(BL), q(BL.replace("a voter will not", "a member will not"))) ],
    ["an edited shipped line", swap(q(SHIPPED), q(SHIPPED.replace("Barred", "Stopped"))) ],
  ];
  for (const [name, src] of muts) {
    const out = check(src);
    ok(out.length > 0, `mutation "${name}" was not caught`);
  }
  console.log(`      ✓ ${muts.length} mutations run`);
}

section("the line rule on its own");
{
  // The same bad lines judged by lineFault alone against their own ledger row,
  // so a mutation written into both the table and the ledger is still caught.
  const SRC = R("consistency.js");
  const E = mapOf(SRC, "_DOS_EFFECT").map, M = mapOf(SRC, "_DOS_MECH").map;
  const row = (k) => ROWS.find((r) => r.key === k);
  const A = row("H.B. 316|2024GS|lgbtq_rights"), B = row("H.B. 300|2025GS|voting_access"), F = row("H.R. 6644|119|crypto_cbdc"), G = row("H.B. 97|2024GS|gun_safety");
  const cases = [
    [A, A.line.replace("housing inmates", "housing dogs"), /broader/],
    [A, A.line.replace(", with limited exceptions,", ""), /qualifier/],
    [B, "Eased voting rules across Utah.", /term|broader/],
    [B, B.line.replace("with certain exceptions", "mapped with exceptions"), /method word/],
    [B, row("H.B. 300|2025GS|voter_id").line, /term|borrowed|broader/],
    [B, E["S.B. 181|2025GS|housing"], /term|borrowed|broader/],
    [B, B.title + ".", /title|term/],
    [B, B.line.replace("a voter will not", "a member will not"), /sales word/],
    [F, F.line.replace(" until the bar sunsets at the end of 2030", " forever"), /broader/],
    [F, "Barred a central bank digital currency, as the Federal Reserve had planned to issue one.", /broader/],
    [G, G.line.replace(/^Would have created/, "Created"), /never became law/],
    [{ ...B, plain: { ...B.plain, mail: "mail ballot to every voter forever" } }, B.line, /restates/],
  ];
  for (const [r, line, want] of cases) {
    const f = lineFault({ ...r, line }, line, { ...E, [r.key]: line }, M);
    ok(want.test(f), `lineFault let ${JSON.stringify(String(line).slice(0, 60))} through (said ${JSON.stringify(f)})`);
  }
  console.log(`      ✓ ${cases.length} bad lines refused by the rule alone`);
}

console.log(`\n${failures.length ? "✗" : "✓"} effect coverage lines: ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
