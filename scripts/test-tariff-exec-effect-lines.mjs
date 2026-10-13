#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-tariff-exec-effect-lines.mjs — tariff orders slice 2: the President's
// tariff and trade documents speak under every row they sit on
// ─────────────────────────────────────────────────────────────────────────────
// Sixteen executive documents in db/exec-action-seed.json carry a tariff or
// trade key, and none of their 37 pairs on the six tariff and trade keys printed
// a line under its row in the President's drawers. db/vr-tariff-exec-effect-lines.json
// records the one line each now carries in _DOS_EXEC_EFFECT, under the TARIFF
// ORDERS SLICE 2 marker, and the stored words it was written from.
//
//   1. THE TABLE: the block holds exactly the recorded pairs, each equal to the
//      record's line, and those are every pair on the six keys for the sixteen
//      documents — no pair that already printed a line, and nothing else. The two
//      documents on cost_living that carry no tariff or trade key stay blank.
//   2. THE LINE RULE: one sentence, 140 characters or fewer, ends on its stop,
//      no method word, no summing word, the act as the subject, never the title.
//   3. SOURCE: each line carries a term from its own pair's stored `plain`,
//      `rationale` or `counts` (or the document's title), and is no sibling key's
//      line, carries no sibling key's term, and borrows nothing from a vote line.
//   4. NOTHING SHIPPED MOVED: the fifteen executive lines already shipped,
//      _DOS_EFFECT (every vote line, the twenty fiscal lines among them),
//      _DOS_MECH and _DOS_POINTER are byte-identical to before the slice, and the
//      two tables stay separate: no vote key in the executive table, no document
//      in the vote table.
//   5. THE DRAWERS: each of the 37 pairs printed nothing before and prints its
//      line now; with those rows set aside, every drawer — the President's and
//      every member's — renders byte-identically, and no row anywhere prints a
//      title, a mapping rationale or `counts` note, or a method sentence.
//   6. MUTATIONS: an over-long line, a second sentence, a method word, a summed
//      figure, a line that opens on something other than the act, a fact not in
//      the pair's source, a sibling key's line, a vote's line, a rewritten
//      shipped executive line, an edited vote line, a vote key put in the
//      executive table, and two renderers — one that prints the title under a
//      row and one that prints the mapping rationale — must each fail.
//
//   node scripts/test-tariff-exec-effect-lines.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
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
const MARK = "    // TARIFF ORDERS SLICE 2 (v361).";
const LEDGER = JSON.parse(R("db/vr-tariff-exec-effect-lines.json"));
const KEYS = ["tariffs_prices", "tariffs_growth", "tariffs_china", "tariffs_authority", "econ_trade", "cost_living"];
const TRADE = /^(?:tariffs_|econ_trade$)/;
const ACTIONS = JSON.parse(R("db/exec-action-seed.json")).actions;
const PRES = "trump";
// sha256 over "key\tline" for the executive lines shipped before this slice, in
// table order, and over the source text of the three neighbouring tables as they
// stood before it. A changed byte in any of them moves a hash.
const PIN = {
  shippedExec: { n: 15, sha: "00b1236972e67c446b80fb7deb4ff3f967d3506d2b4b837c3cca42de82d78e55" },
  _DOS_EFFECT: "5aa83bf21664139cd4d6b9e43d5eb4ef16324a4f3460c0e7f4420e6d7aee2b09",
  _DOS_MECH: "11a995d45af07637efe7e1bc1625efa27fb37c26d0718a1af1fdde654e5579a3",
  _DOS_POINTER: "cb4fcb1652dc2e45af694a7c63c8831c62e08715b201bcfde24adaadfce909e4",
};
const METHOD = /\b(?:precedent|mirror|discriminator|primary|secondary|on-axis|off-axis|vocabulary|coded|coding|chip|mapped|mapping|filed|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger|leaf|issue|this record|row|stance|guardrail|advances|opposes|cuts against)\b|PolitiDex|…|\.\.\./i;
const SUMMED = /\b(?:combined|in total|totall?ing|altogether|all told|net worth|summed|sum of|together with|overall|aggregate|on net)\b/i;
// The act is the subject: the line opens on what the document did.
const OPENS = /^(?:[A-Z][a-z]+(?:-[a-z]+)?ed|Set|Put|Let|Kept|Took|Chose|Made|Cut|Ran|Sent)\b/;

const sha = (s) => createHash("sha256").update(s).digest("hex");
const norm = (x) => String(x == null ? "" : x).replace(/\s+/g, " ").trim();
const low = (x) => norm(x).toLowerCase();
const dec = (h) => String(h || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
const splitKey = (k) => { const i = k.lastIndexOf("|"); return [k.slice(0, i), k.slice(i + 1)]; };

function mapOf(src, name) {
  const at = src.indexOf(`var ${name} = {`);
  if (at < 0) return null;
  const end = src.indexOf("\n  };", at);
  return { text: src.slice(at, end + 4), map: vm.runInNewContext("(" + src.slice(at + `var ${name} = `.length, end + 4) + ")") };
}
function blockKeys(src) {
  const a = src.indexOf(MARK);
  if (a < 0) return [];
  return [...src.slice(a, src.indexOf("\n  };", a)).matchAll(/^    '((?:[^'\\]|\\.)+)':$/gm)].map((m) => m[1].replace(/\\'/g, "'"));
}
// The table as it stood before this slice: the comma that joined the block and
// the block itself taken out whole.
function withoutSlice(src) {
  const a = src.indexOf(MARK);
  if (a < 0) return src;
  const comma = src.lastIndexOf(",\n", a);
  return src.slice(0, comma) + src.slice(src.indexOf("\n  };", a));
}

// ── the documents this slice covers, read from the seed ─────────────────────
const DOCS = new Map(); // documentId → action
for (const x of ACTIONS[PRES] || []) {
  if ((x.issues || []).some((m) => TRADE.test(m.issueKey))) DOCS.set(x.documentId, x);
}
const actionOf = (doc) => (ACTIONS[PRES] || []).find((x) => x.documentId === doc);
const mappingOf = (doc, k) => ((actionOf(doc) || {}).issues || []).find((m) => m.issueKey === k);

const corpus = buildCorpus(ROOT);
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
const presLeaves = [...new Set((ACTIONS[PRES] || []).flatMap((x) => (x.issues || []).map((m) => m.issueKey)))];
const leavesOf = (pid) => {
  if (pid === PRES) return presLeaves;
  const s = new Set();
  for (const it of corpus.byMember.get(pid) || []) for (const i of it.issues || []) if (i && i.issueKey) s.add(i.issueKey);
  return [...s];
};
const ALL_PIDS = [...new Set([PRES, ...corpus.byMember.keys()])];

// Every drawer rendered: html per pid|leaf, and per row the pair it sits on
// (document|issue for an executive row) and the line under it.
function render(src, pids) {
  const win = boot(src);
  if (win.__err) return { err: win.__err };
  const CS = win.PDXConsistency;
  const out = new Map();
  for (const pid of pids) {
    if (!win.CMP_DATA[pid]) continue;
    for (const k of leavesOf(pid)) {
      let items = [], html = "";
      try { items = CS.dossierItems(pid, k) || []; } catch { continue; }
      if (!items.length) continue;
      try { html = CS.dossierLedgerHtml(pid, k) || ""; } catch { html = ""; }
      const effs = new Map();
      for (const m of html.matchAll(/<tr class="pdxlg-effr" data-pdxlg-effr="(\d+)">([\s\S]*?)<\/tr>/g)) effs.set(Number(m[1]), dec(m[2]));
      const rows = [];
      for (const m of html.matchAll(/<tr data-pdxlg-row="(\d+)">/g)) {
        const i = Number(m[1]), d = items[i], it = (d && d.item) || {};
        if (!d) continue;
        const doc = d.lane === "exec" ? norm(it.documentId) : "";
        rows.push({
          i, exec: d.lane === "exec", pair: doc ? `${doc}|${k}` : "", eff: effs.get(i) || "",
          title: norm(d.title || it.title),
          notes: [d.rationale, d.counts].map(norm).filter(Boolean)
            .concat((it.issues || []).filter((x) => x && x.issueKey === k).flatMap((x) => [norm(x.rationale), norm(x.counts)]).filter(Boolean)),
        });
      }
      out.set(`${pid}|${k}`, { html, rows });
    }
  }
  return { out };
}
function stripSliceRows(view, NEW) {
  let h = view.html;
  for (const r of view.rows) {
    if (!NEW.has(r.pair) || !r.eff) continue;
    h = h.replace(new RegExp(`<tr class="pdxlg-effr" data-pdxlg-effr="${r.i}">[\\s\\S]*?<\\/tr>`), "");
  }
  return h;
}

function check(src, ledger, { pids = ALL_PIDS, base = null } = {}) {
  const faults = [];
  let pass = 0;
  const ok = (c, m) => { if (c) pass++; else faults.push(m); };
  const X = mapOf(src, "_DOS_EXEC_EFFECT"), E = mapOf(src, "_DOS_EFFECT");
  if (!X || !E) return { faults: ["effect tables not found in consistency.js"], pass };
  const NEW = new Set(ledger.rows.map((r) => r.key));
  const block = blockKeys(src);
  const rendererRule = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary (?:carries|has) no|coded|chip|mapped|filed as|weighted)\b/i;
  const lineOf = (k) => (X.map[k] ? norm(X.map[k]) : "");

  // ── 1 · the table ─────────────────────────────────────────────────────────
  ok(block.length > 0, "the tariff orders slice block is not in _DOS_EXEC_EFFECT");
  ok(ledger.rows.length === 37 && ledger.lines === 37, `${ledger.rows.length} rows in the record — the slice wrote 37 pairs`);
  ok(block.length === NEW.size && block.every((k) => NEW.has(k)), `the block holds ${JSON.stringify(block.filter((k) => !NEW.has(k)))} outside the record, or misses some of its pairs`);
  ok(DOCS.size === 16 && ledger.documents.length === 16 && ledger.documents.every((d) => DOCS.has(d)), `the record names ${ledger.documents.length} documents, the seed carries ${DOCS.size} with a tariff or trade key`);
  const shippedX = Object.entries(X.map).filter(([k]) => !NEW.has(k));
  const want = [];
  for (const [doc, x] of DOCS) for (const m of x.issues || []) {
    const k = `${doc}|${m.issueKey}`;
    if (KEYS.includes(m.issueKey) && !shippedX.some(([j]) => j === k)) want.push(k);
  }
  ok(want.length === NEW.size && want.every((k) => NEW.has(k)), `the slice should cover ${want.length} blank pairs on the six keys; missing ${JSON.stringify(want.filter((k) => !NEW.has(k)))}`);
  for (const ex of ledger.excluded || []) {
    const k = `${ex.documentId}|${ex.issue}`;
    const x = actionOf(ex.documentId);
    ok(!!x && !DOCS.has(ex.documentId) && !!mappingOf(ex.documentId, ex.issue), `${k}: an excluded pair the seed does not carry as a non-trade document`);
    ok(!(k in X.map), `${k}: a document with no tariff or trade key carries a line in this slice`);
    ok(norm(ex.why).length > 20, `${k}: excluded with no reason`);
  }

  // ── 4 · nothing shipped moved, and the tables stay apart ──────────────────
  ok(shippedX.length === PIN.shippedExec.n && sha(shippedX.map(([k, v]) => k + "\t" + v).join("\n")) === PIN.shippedExec.sha,
    "a shipped executive line was rewritten, removed or added outside the slice");
  ok(sha(E.text) === PIN._DOS_EFFECT, "_DOS_EFFECT (the vote lines, the fiscal slice among them) is not byte-identical to before the slice");
  for (const name of ["_DOS_MECH", "_DOS_POINTER"]) {
    const t = mapOf(src, name);
    ok(t && sha(t.text) === PIN[name], `${name} is not byte-identical to before the slice`);
  }
  const allDocs = new Set((ACTIONS[PRES] || []).map((x) => x.documentId));
  for (const k of Object.keys(X.map)) ok(!/^[^|]+\|\d+\|[a-z0-9_]+$/.test(k), `${k}: a vote-shaped key in the executive table`);
  for (const k of Object.keys(E.map)) ok(!allDocs.has(splitKey(k)[0]), `${k}: an executive document in the vote table`);

  // ── 2–3 · line by line ────────────────────────────────────────────────────
  const voteLines = Object.values(E.map).map(norm);
  for (const row of ledger.rows) {
    const k = row.key, s = lineOf(k);
    const [doc, issue] = splitKey(k);
    const x = DOCS.get(doc), m = mappingOf(doc, issue);
    ok(!!x && !!m, `${k}: the seed carries no such document and issue`);
    if (!x || !m) continue;
    ok(row.documentId === doc && row.issue === issue && KEYS.includes(issue), `${k}: the record's identity fields do not spell its key`);
    ok(norm(row.title) === norm(x.title), `${k}: the record quotes a title the seed does not store`);
    ok(s && s === norm(row.line), `${k}: the stored line and the record's line differ`);
    // 2 · the rule
    ok(s.length > 0 && s.length <= 140, `${k}: ${s.length} characters`);
    ok(/[.!?]$/.test(s), `${k}: does not end on a stop`);
    ok(!/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US")), `${k}: more than one sentence`);
    const mw = s.match(METHOD);
    ok(!mw, `${k}: method word "${mw && mw[0]}"`);
    const sw = s.match(SUMMED);
    ok(!sw, `${k}: a summed or combined figure ("${sw && sw[0]}")`);
    ok(OPENS.test(s), `${k}: the act is not the subject — opens "${s.split(" ").slice(0, 2).join(" ")}"`);
    ok(low(s.replace(/[.!?]$/, "")) !== low(x.title) && !low(s).includes(low(x.title)), `${k}: the line is the document's title`);
    // 3 · source
    const term = norm(row.term), field = row.termIn;
    const own = field === "title" ? x.title : m[field];
    ok(["plain", "rationale", "counts", "title"].includes(field) && low(own).includes(low(term)) && term.length >= 6,
      `${k}: the term "${term}" is not in this pair's own ${field}`);
    ok(low(s).includes(low(term)), `${k}: the line does not carry its source term "${term}"`);
    // No new facts: every figure the line names is a figure its own pair stores.
    const srcText = [m.plain, m.rationale, m.counts, x.title].map(norm).join(" ");
    for (const fig of s.match(/\d[\d,.]*\d|\d/g) || []) ok(srcText.includes(fig), `${k}: the figure "${fig}" is not in this pair's own stored text`);
    for (const [j, w] of Object.entries(X.map)) {
      if (j === k || splitKey(j)[0] !== doc) continue;
      ok(norm(w) !== s, `${k}: borrowed from ${j}`);
      ok(!low(w).includes(low(term)), `${k}: its term "${term}" is ${j}'s line`);
    }
    for (const sm of x.issues || []) {
      if (sm.issueKey === issue) continue;
      for (const f of ["plain", "rationale", "counts"]) {
        ok(!low(sm[f]).includes(low(s.replace(/[.!?]$/, ""))), `${k}: borrowed from ${doc}|${sm.issueKey}'s ${f}`);
      }
    }
    ok(!voteLines.includes(s), `${k}: a vote's line`);
    ok(!voteLines.some((v) => low(v).includes(low(term))), `${k}: its term "${term}" is a vote's line`);
  }

  // ── 5 · the drawers ───────────────────────────────────────────────────────
  const now = render(src, pids);
  if (now.err) return { faults: faults.concat([`boot: ${now.err}`]), pass };
  const gained = new Set();
  for (const [dk, view] of now.out) {
    for (const r of view.rows) {
      if (r.eff) {
        ok(!r.title || low(r.eff) !== low(r.title), `${dk}: ${r.pair || "a row"} prints its title under the row`);
        ok(!r.notes.some((n) => low(n) === low(r.eff)), `${dk}: ${r.pair || "a row"} prints a mapping rationale or counts note under the row`);
        ok(!rendererRule.test(r.eff), `${dk}: ${r.pair || "a row"} prints a method sentence under the row`);
      }
      if (NEW.has(r.pair)) {
        ok(r.eff === lineOf(r.pair), `${dk}: ${r.pair} prints ${JSON.stringify(r.eff)}, stored ${JSON.stringify(lineOf(r.pair))}`);
        if (r.eff) gained.add(r.pair);
      }
    }
  }
  for (const k of NEW) ok(gained.has(k), `${k}: no drawer row prints it`);
  if (base) {
    for (const [dk, view] of base.out) {
      const cur = now.out.get(dk);
      ok(!!cur, `${dk}: the drawer stopped rendering`);
      if (!cur) continue;
      for (const r of view.rows) if (NEW.has(r.pair)) ok(!r.eff, `${dk}: ${r.pair} printed ${JSON.stringify(r.eff)} before the slice`);
      ok(stripSliceRows(cur, NEW) === view.html, `${dk}: the drawer moved beyond the slice's own rows`);
    }
    ok(now.out.size === base.out.size, `${now.out.size} drawers render now, ${base.out.size} before`);
  }
  return { faults, pass, drawers: now.out.size, gained: gained.size };
}

const CONS = R("consistency.js");
const BEFORE = withoutSlice(CONS);
const baseAll = render(BEFORE, ALL_PIDS);
if (baseAll.err) { console.error(`✗ tariff exec effect lines: boot before the slice: ${baseAll.err}`); process.exit(2); }
const live = check(CONS, LEDGER, { base: baseAll });

// ── 6 · mutations ───────────────────────────────────────────────────────────
// Mutants render only the President's drawers, against a baseline built the
// same way.
const baseP = render(BEFORE, [PRES]);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const swap = (pair, line) => (s) => s.replace(new RegExp(`('${esc(pair.replace(/'/g, "\\'"))}':\\n\\s+)'(?:[^'\\\\]|\\\\.)+'`), (_, h) => h + "'" + line.replace(/'/g, "\\'") + "'");
const lineFor = (k) => LEDGER.rows.find((r) => r.key === k).line;
const relined = (k, line) => ({ ...LEDGER, rows: LEDGER.rows.map((r) => (r.key === k ? { ...r, line } : r)) });
const MUTANTS = [];
const mut = (name, edit, expect, line) => MUTANTS.push({ name, edit, expect, line });
const L = (k, line, name, expect) => mut(name, swap(k, line), expect, [k, line]);
L("Executive Order 14257|tariffs_prices",
  "Put duties on nearly the whole import base from nearly every trading partner with no offsetting relief of any kind at all for household purchasers.",
  "a line over 140 characters", /characters/);
L("Executive Order 14389|tariffs_prices",
  "Ended collection of the emergency-powers duties. It provided for refunds of duties already paid.",
  "a second sentence", /more than one sentence/);
L("Executive Order 14257|econ_trade",
  "Used import duties, mapped here, as the instrument for reshoring manufacturing and rebuilding supply chains.",
  "a method word", /method word/);
L("Proclamation 11012|tariffs_growth",
  "Imposed a temporary 10 percent surcharge under the balance-of-payments provision, on top of the other duties combined.",
  "a summed figure", /summed or combined/);
L("Executive Order 14228|tariffs_china",
  "The order doubled the China tariff from 10 percent to 20 percent, finding Beijing had not moved against the fentanyl trade.",
  "a line that opens on something other than the act", /act is not the subject/);
L("Executive Order 14358|tariffs_china",
  "Kept the higher China tariff rates suspended for a further twelve months, saving importers about $40 billion.",
  "a fact not in the pair's source", /figure "40" is not in this pair's own stored text/);
L("Proclamation 10896|tariffs_prices", lineFor("Proclamation 10896|tariffs_growth"),
  "a sibling key's line", /borrowed from|is Proclamation 10896\|tariffs_growth's line|does not carry its source term/);
L("Executive Order 14193|tariffs_authority",
  "Would have ended the emergency behind the tariffs on Canadian imports, lifting those duties; the Senate passed it 51-48.",
  "a vote's line", /a vote's line|does not carry its source term|act is not the subject/);
mut("a shipped executive line rewritten",
  swap("NSPM-2|iran_policy", "Ordered maximum pressure on Iran and new sanctions."),
  /shipped executive line/);
mut("a vote line edited",
  swap("H.R. 1|119|family_support", "Raised the child tax credit to $2,200 per child; the House cleared it 218-214, the Senate 50-50."),
  /_DOS_EFFECT .* is not byte-identical/);
mut("a vote key put in the executive table",
  (s) => s.replace(MARK, "    'S.J.Res. 37|119|tariffs_prices':\n      'Ended the emergency behind the Canada tariffs.',\n" + MARK),
  /vote-shaped key|shipped executive line/);
mut("a renderer that prints the title under a row",
  (s) => s.replace("return _dosEffectOk(_DOS_EXEC_EFFECT[String(it.documentId).trim() + '|' + issueKey]);",
    "return _dosEffectOk(_DOS_EXEC_EFFECT[String(it.documentId).trim() + '|' + issueKey]) || String(it.title || '');"),
  /prints its title under the row/);
mut("a renderer that prints the mapping rationale under a row",
  (s) => s.replace("return _dosEffectOk(_DOS_EXEC_EFFECT[String(it.documentId).trim() + '|' + issueKey]);",
    "var _mm = (it.issues || []).filter(function (x) { return x && x.issueKey === issueKey; })[0]; return (_mm && (_mm.rationale || _mm.counts)) || _dosEffectOk(_DOS_EXEC_EFFECT[String(it.documentId).trim() + '|' + issueKey]);"),
  /prints a mapping rationale|method sentence/);

const mutFaults = [];
for (const m of MUTANTS) {
  const src = m.edit(CONS);
  if (src === CONS) { mutFaults.push(`mutation "${m.name}": anchor not found`); continue; }
  const res = check(src, m.line ? relined(m.line[0], m.line[1]) : LEDGER, { pids: [PRES], base: baseP });
  const caught = res.faults.some((x) => m.expect.test(x));
  console.log(`   mutation: ${m.name} → ${caught ? "caught" : "NOT CAUGHT"}`);
  if (!caught) mutFaults.push(`mutation "${m.name}" survived${res.faults.length ? ` (faults: ${res.faults.slice(0, 2).join(" | ")})` : ""}`);
}

const all = live.faults.concat(mutFaults);
if (all.length) {
  for (const f of all.slice(0, 40)) console.error("  ✗ " + f);
  if (all.length > 40) console.error(`  … and ${all.length - 40} more`);
  console.error(`\n✗ tariff exec effect lines: ${all.length} failure(s), ${live.pass} passed`);
  process.exit(1);
}
console.log(`\n   ${LEDGER.rows.length} lines on ${LEDGER.documents.length} documents · ${live.gained} pairs printing in the President's drawers · ${live.drawers} drawers compared`);
console.log(`✓ tariff exec effect lines: all ${live.pass} assertions passed, ${MUTANTS.length} mutations caught`);
