#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-long-did-effect-lines.mjs — long-did overrides slice 3: a pair whose
// stored `did` is too long for a row speaks in one sentence written from it
// ─────────────────────────────────────────────────────────────────────────────
// Three pairs on H.R. 8595 of the 119th — election_security, voter_id and
// voting_access — store a `did` in _DOS_MECH that runs past 140 characters or
// past one sentence, so the row printed nothing. db/vr-long-did-effect-lines.json
// records the one line each now carries in _DOS_EFFECT under the LONG-DID
// OVERRIDES SLICE 3 marker. Two more pairs named for this slice, H.R. 1968 ×
// health_rural and × immig_fentanyl, already carry the line budget and fiscal
// slice 1 wrote from their own `did`, and are held unchanged here.
//
//   1. THE TABLE: the block holds exactly the three recorded pairs, each equal
//      to the record's line; the two H.R. 1968 pairs keep their slice-1 lines.
//   2. THE LINE RULE: one sentence, 140 characters or fewer, ends on its stop,
//      no method word, no summing word, the act as the subject, never the title.
//   3. TENSE AND TALLY: H.R. 8595 passed the House only, so each line opens
//      "Would" (never "Would have") and ends on the passage roll the seeds hold.
//   4. SOURCE: each pair's stored `did` is byte-identical to the record's copy,
//      is too long for the row on its own, and holds the term the line carries;
//      every figure the line names is in that `did` or the tally; the line is no
//      sibling leaf's line, carries no sibling's term, and lifts nothing from a
//      sibling's `did` or mapping rationale.
//   5. NOTHING SHIPPED MOVED: every other _DOS_EFFECT line (fiscal and CRA
//      among them), _DOS_MECH (every stored `did`), _DOS_EXEC_EFFECT (the tariff
//      slice among it) and _DOS_POINTER are byte-identical to before the slice.
//   6. THE DRAWERS, LIVE-SHAPED: the seed maps H.R. 8595 on four keys only, so
//      its rows carry every mapping the database holds. Each of the three pairs
//      printed nothing before and prints its line now; with those rows set
//      aside every drawer renders byte-identically, and no row anywhere prints a
//      bill title, a mapping rationale or a method sentence.
//   7. MUTATIONS: an over-long line, a second sentence, a method word, a summed
//      figure, "Would have", a law written as done, a figure not in the `did`, a
//      sibling's line, a changed tally, an edited `did`, a rewritten fiscal line,
//      a rewritten H.R. 1968 line, and two renderers — one that prints the title
//      under a row and one that prints the mapping rationale — must each fail.
//
//   node scripts/test-long-did-effect-lines.mjs

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";
import { keysAfter } from "./vr-slice-blocks.mjs";
import { preAudit } from "./vr-effect-audit.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// consistency.js as it stood before the v387 provisions audit; see
// scripts/vr-effect-audit.mjs and scripts/test-effect-line-audit.mjs.
const R = (f) => (f === "consistency.js" ? preAudit(readFileSync(join(ROOT, f), "utf8")) : readFileSync(join(ROOT, f), "utf8"));
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js",
];
const MARK = "    // LONG-DID OVERRIDES SLICE 3 (v362).";
const VERSION = 362;
const LEDGER = JSON.parse(R("db/vr-long-did-effect-lines.json"));
const ACT = LEDGER.measure.key;
// The tables as they stood before this slice. "key\tline" in table order for the
// two line tables (a later slice's own block is that slice's to pin), the source
// text for the two that no slice writes to.
const PIN = {
  _DOS_EFFECT: { n: 309, sha: "a72613c874e79404dab6a92daac8d4d282907c6d76631de5a7a9c4517a8fef3b" },
  _DOS_EXEC_EFFECT: { n: 52, sha: "43742a6d26eefc0437dd5e98a4b58a44cbc3ac46e8202c3aca14104abd8a52a7" },
  _DOS_MECH: "11a995d45af07637efe7e1bc1625efa27fb37c26d0718a1af1fdde654e5579a3",
  _DOS_POINTER: "cb4fcb1652dc2e45af694a7c63c8831c62e08715b201bcfde24adaadfce909e4",
};
const METHOD = /\b(?:precedent|mirror|discriminator|primary|secondary|on-axis|off-axis|vocabulary|coded|coding|chip|mapped|mapping|filed|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger|leaf|yea|nay|division|sec\.)\b|PolitiDex|…|\.\.\./i;
const SUMMED = /\b(?:combined|in total|totall?ing|altogether|all told|net worth|summed|sum of|together with|overall|aggregate)\b/i;
const OPENS = /^Would (?!have\b)[a-z]+\b/;

const sha = (s) => createHash("sha256").update(s).digest("hex");
const norm = (x) => String(x == null ? "" : x).replace(/\s+/g, " ").trim();
const low = (x) => norm(x).toLowerCase();
const dec = (h) => String(h || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
// The renderer's own row rule, quoted: one sentence, 140 or fewer, its stop.
const rowRule = (raw) => {
  const s = norm(raw);
  if (!s || s.length > 140 || !/[.!?]$/.test(s)) return "";
  if (/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "";
  return s;
};

function mapOf(src, name) {
  const at = src.indexOf(`var ${name} = {`);
  if (at < 0) return null;
  const end = src.indexOf("\n  };", at);
  return { text: src.slice(at, end + 4), map: vm.runInNewContext("(" + src.slice(at + `var ${name} = `.length, end + 4) + ")") };
}
function blockEnd(src, a) {
  const end = src.indexOf("\n  };", a);
  const re = /\n {4}\/\/ [A-Z][A-Z -]* SLICE \d+ \(v\d+\)\./g;
  re.lastIndex = a + MARK.length;
  const m = re.exec(src);
  return m && m.index < end ? m.index : end;
}
function blockKeys(src) {
  const a = src.indexOf(MARK);
  if (a < 0) return [];
  return [...src.slice(a, blockEnd(src, a)).matchAll(/^    '([^']+)':$/gm)].map((m) => m[1]);
}
function withoutSlice(src) {
  const a = src.indexOf(MARK);
  if (a < 0) return src;
  return src.slice(0, a) + src.slice(blockEnd(src, a) + 1);
}

// ── the rolls the seeds hold for the act ────────────────────────────────────
const SEED_ROLLS = (() => {
  const t = {};
  for (const f of readdirSync(join(ROOT, "db")).filter((x) => /^vr-.*seed.*\.json$/.test(x)).sort()) {
    let j; try { j = JSON.parse(R(`db/${f}`)); } catch { continue; }
    for (const v of j.votes || []) {
      const num = norm(typeof v.measure === "string" ? v.measure : v.measure && v.measure.number);
      const cong = (v.measure && v.measure.congress) || v.congress || j.congress;
      if (`${num}|${cong}` !== ACT || v.rollNumber == null) continue;
      let tl = null;
      if (v.totals && v.totals.yea != null) tl = [v.totals.yea, v.totals.nay];
      else if (v.partyTotals) {
        const P = Object.values(v.partyTotals);
        if (P.length) tl = [P.reduce((n, p) => n + p.yea, 0), P.reduce((n, p) => n + p.nay, 0)];
      }
      const k = `${v.chamber || j.chamber}|${v.rollNumber}`;
      (t[k] = t[k] || []).push({ file: f, tl });
    }
  }
  return t;
})();
const ENACTED = (JSON.parse(R("db/vr-measure-identity.json")).measures || [])
  .some((m) => `${norm(m.number)}|${m.congress}` === ACT && (m.laws || []).length);

// ── live-shaped rows: every H.R. 8595 row carries every mapping on file ─────
const corpus = buildCorpus(ROOT);
const ISSUES = LEDGER.measure.issues;
const titleOf = (() => { for (const recs of corpus.byMember.values()) for (const it of recs) if (it.measureId === ACT) return norm(it.title); return ""; })();
function boot(src) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(f === "consistency.js" ? src : R(f), ctx, { filename: f }); } catch (e) { win.__err = `${f}: ${e.message}`; }
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    const list = recs.map((it) => (it.measureId === ACT ? { ...it, issues: ISSUES.map((i) => ({ ...i })) } : it));
    try { win.PDXVotingRecord.noteMember(pid, list); } catch { /* not a member surface */ }
  }
  return win;
}
const holders = [...corpus.byMember].filter(([, recs]) => recs.some((it) => it.measureId === ACT)).map(([pid]) => pid);
const leavesOf = (pid) => {
  const s = new Set();
  for (const it of corpus.byMember.get(pid) || []) for (const i of (it.measureId === ACT ? ISSUES : it.issues || [])) if (i && i.issueKey) s.add(i.issueKey);
  return [...s];
};
const ALL_PIDS = [...corpus.byMember.keys()];

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
        if (!d || d.lane === "exec") continue;
        const num = norm(it.number);
        rows.push({
          i, pair: num && typeof it.congress === "number" ? `${num}|${it.congress}|${k}` : "",
          eff: effs.get(i) || "", title: norm(it.title),
          rationales: (it.issues || []).map((x) => norm(x && x.rationale)).filter(Boolean),
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
    // The "Also on" chip row (v363) rides under an effect line and goes with it.
    h = h.replace(new RegExp(`<tr class="pdxlg-relr" data-pdxlg-relr="${r.i}">[\\s\\S]*?<\\/tr>`), "");
  }
  return h;
}

function check(src, ledger, { pids = ALL_PIDS, base = null } = {}) {
  const faults = [];
  let pass = 0;
  const ok = (c, m) => { if (c) pass++; else faults.push(m); };
  const E = mapOf(src, "_DOS_EFFECT"), M = mapOf(src, "_DOS_MECH"), X = mapOf(src, "_DOS_EXEC_EFFECT");
  if (!E || !M || !X) return { faults: ["effect tables not found in consistency.js"], pass };
  const NEW = new Set(ledger.rows.map((r) => r.key));
  const block = blockKeys(src);
  const rendererRule = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary (?:carries|has) no|coded|chip|mapped|filed as|weighted)\b/i;
  const lineOf = (k) => (E.map[k] ? norm(E.map[k]) : "");

  // ── 1 · the table ─────────────────────────────────────────────────────────
  ok(block.length > 0, "the long-did slice block is not in _DOS_EFFECT");
  ok(ledger.rows.length === 3 && ledger.lines === 3, `${ledger.rows.length} rows in the record — the slice wrote 3 pairs`);
  ok(block.length === NEW.size && block.every((k) => NEW.has(k)), `the block holds ${JSON.stringify(block.filter((k) => !NEW.has(k)))} outside the record, or misses some of its pairs`);
  for (const sk of ledger.skipped || []) {
    ok(!NEW.has(sk.key) && !block.includes(sk.key), `${sk.key}: a skipped pair is in this slice`);
    ok(lineOf(sk.key) === norm(sk.line), `${sk.key}: the line slice 1 wrote for it changed`);
    ok(norm(sk.why).length > 20, `${sk.key}: skipped with no reason`);
  }

  // ── 5 · nothing shipped moved ─────────────────────────────────────────────
  const newerE = keysAfter(src, "_DOS_EFFECT", VERSION);
  const keptE = Object.entries(E.map).filter(([k]) => !NEW.has(k) && !newerE.has(k));
  ok(keptE.length === PIN._DOS_EFFECT.n && sha(keptE.map(([k, v]) => k + "\t" + v).join("\n")) === PIN._DOS_EFFECT.sha,
    "a shipped _DOS_EFFECT line was rewritten, removed or added outside the slice");
  const newerX = keysAfter(src, "_DOS_EXEC_EFFECT", VERSION);
  const keptX = Object.entries(X.map).filter(([k]) => !newerX.has(k));
  ok(keptX.length === PIN._DOS_EXEC_EFFECT.n && sha(keptX.map(([k, v]) => k + "\t" + v).join("\n")) === PIN._DOS_EXEC_EFFECT.sha,
    "_DOS_EXEC_EFFECT is not byte-identical to before the slice");
  for (const name of ["_DOS_MECH", "_DOS_POINTER"]) {
    const t = mapOf(src, name);
    ok(t && sha(t.text) === PIN[name], `${name} is not byte-identical to before the slice${name === "_DOS_MECH" ? " — a stored did was edited" : ""}`);
  }

  // ── 2–4 · line by line ────────────────────────────────────────────────────
  const rl = ledger.measure.roll;
  const tail = `; the House passed it ${rl.yea}-${rl.nay}.`;
  for (const row of ledger.rows) {
    const k = row.key, s = lineOf(k);
    const [num, cong, issue] = k.split("|");
    ok(`${num}|${cong}` === ACT && `${row.number}|${row.congress}|${row.issue}` === k, `${k}: the record's identity fields do not spell its key`);
    ok(s && s === norm(row.line), `${k}: the stored line and the record's line differ`);
    // 2 · the rule
    ok(s.length > 0 && s.length <= 140, `${k}: ${s.length} characters`);
    ok(/[.!?]$/.test(s), `${k}: does not end on a stop`);
    ok(!/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US")), `${k}: more than one sentence`);
    const mw = s.match(METHOD);
    ok(!mw, `${k}: method word "${mw && mw[0]}"`);
    const sw = s.match(SUMMED);
    ok(!sw, `${k}: a summed or combined figure ("${sw && sw[0]}")`);
    ok(!titleOf || (low(s) !== low(titleOf) && !low(s).includes(low(titleOf))), `${k}: the line is the measure's title`);
    // 3 · tense and tally
    ok(!ENACTED && ledger.measure.status === "passed_house", `${ACT}: the record says ${ledger.measure.status}, and the identity record ${ENACTED ? "holds" : "holds no"} public law`);
    ok(OPENS.test(s), `${k}: an act that passed one chamber must open "Would", never "Would have" or as done`);
    ok(s.endsWith(tail), `${k}: does not end on the recorded roll ("${tail.slice(2, -1)}")`);
    const hits = SEED_ROLLS[`${rl.chamber}|${rl.roll}`] || [];
    ok(hits.length > 0, `${ACT}: ${rl.chamber} roll ${rl.roll} is in no vote seed`);
    for (const h of hits) if (h.tl) ok(h.tl[0] === rl.yea && h.tl[1] === rl.nay, `${ACT}: ${h.file} counts roll ${rl.roll} ${h.tl.join("-")}, the line says ${rl.yea}-${rl.nay}`);
    // 4 · source
    const did = norm(M.map[k] && M.map[k].did);
    ok(!!did && did === norm(row.did), `${k}: the stored did is not the record's copy`);
    ok(!rowRule(did), `${k}: the stored did would stand under the row on its own, so it needs no line`);
    const term = norm(row.term);
    ok(term.length >= 8 && low(did).includes(low(term)), `${k}: the term "${term}" is not in its own did`);
    ok(low(s).includes(low(term)), `${k}: the line does not carry its source term "${term}"`);
    // Whole figures, not substrings: "30" is not in a did that says "303A".
    const didFigs = new Set(did.match(/\d[\d,.]*\d|\d/g) || []);
    for (const fig of s.replace(tail, "").match(/\d[\d,.]*\d|\d/g) || []) ok(didFigs.has(fig), `${k}: the figure "${fig}" is not in its own did`);
    for (const [j, w] of Object.entries(E.map)) {
      if (j === k || !j.startsWith(ACT + "|")) continue;
      ok(norm(w) !== s, `${k}: borrowed from ${j}`);
      ok(!low(w).includes(low(term)), `${k}: its term "${term}" is ${j}'s line`);
    }
    const body = s.slice(0, s.length - tail.length);
    for (const i of ISSUES) {
      if (i.issueKey === issue) continue;
      const sib = `${ACT}|${i.issueKey}`;
      ok(!low(M.map[sib] && M.map[sib].did).includes(low(body)), `${k}: borrowed from ${sib}'s stored did`);
      ok(!low(i.rationale).includes(low(body)), `${k}: borrowed from ${sib}'s rationale`);
    }
  }

  // ── 6 · the drawers ───────────────────────────────────────────────────────
  const now = render(src, pids);
  if (now.err) return { faults: faults.concat([`boot: ${now.err}`]), pass };
  const gained = new Set();
  for (const [dk, view] of now.out) {
    for (const r of view.rows) {
      if (r.eff) {
        ok(!r.title || low(r.eff) !== low(r.title), `${dk}: ${r.pair} prints its bill title under the row`);
        ok(!r.rationales.some((x) => low(x) === low(r.eff)), `${dk}: ${r.pair} prints a mapping rationale under the row`);
        ok(!rendererRule.test(r.eff), `${dk}: ${r.pair} prints a method sentence under the row`);
      }
      if (NEW.has(r.pair)) {
        ok(r.eff === lineOf(r.pair), `${dk}: ${r.pair} prints ${JSON.stringify(r.eff)}, stored ${JSON.stringify(lineOf(r.pair))}`);
        if (r.eff) gained.add(r.pair);
      }
    }
  }
  for (const k of NEW) ok(gained.has(k), `${k}: no member row prints it`);
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
if (baseAll.err) { console.error(`✗ long-did effect lines: boot before the slice: ${baseAll.err}`); process.exit(2); }
console.log(`  · ${holders.length} members carry H.R. 8595 rows, rebuilt with all ${ISSUES.length} mappings`);
const live = check(CONS, LEDGER, { base: baseAll });

// ── 7 · mutations ───────────────────────────────────────────────────────────
const baseH = render(BEFORE, holders);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const swap = (pair, line) => (s) => s.replace(new RegExp(`('${esc(pair)}':\\n\\s+)'(?:[^'\\\\]|\\\\.)+'`), (_, h) => h + "'" + line.replace(/'/g, "\\'") + "'");
const relined = (k, line) => ({ ...LEDGER, rows: LEDGER.rows.map((r) => (r.key === k ? { ...r, line } : r)) });
const ES = "H.R. 8595|119|election_security", VI = "H.R. 8595|119|voter_id", VA = "H.R. 8595|119|voting_access";
const MUTANTS = [];
const L = (k, line, name, expect) => MUTANTS.push({ name, edit: swap(k, line), expect, line: [k, line] });
L(ES, "Would bar states from processing any federal registration application by mail, motor-vehicle or agency without documentary proof of citizenship; the House passed it 217-209.",
  "a line over 140 characters", /characters/);
L(VI, "Would bar officials from handing a voter a ballot. It requires valid photo identification; the House passed it 217-209.",
  "a second sentence", /more than one sentence/);
L(VA, "Would gate both steps of casting a federal ballot behind a document, a secondary reading; the House passed it 217-209.",
  "a method word", /method word/);
L(VI, "Would bar officials from handing a voter a ballot without photo identification, in total for every voter; the House passed it 217-209.",
  "a summed figure", /summed or combined/);
L(ES, "Would have barred states from processing a federal registration application without documentary proof of citizenship; the House passed it 217-209.",
  "\"Would have\" on a bill that passed the House", /must open "Would"/);
L(VA, "Gated both steps of casting a federal ballot, registering and voting, behind a document; the House passed it 217-209.",
  "a House-only bill written as law", /must open "Would"/);
L(VI, "Would bar officials from handing a voter a ballot 30 days early without photo identification; the House passed it 217-209.",
  "a figure not in the did", /figure "30" is not in its own did/);
L(VA, "Would bar officials from handing an in-person voter a federal ballot without valid photo identification; the House passed it 217-209.",
  "a sibling's line", /borrowed from|is H\.R\. 8595\|119\|voter_id's line|does not carry its source term/);
L(ES, "Would bar states from processing a federal registration application without documentary proof of citizenship; the House passed it 218-209.",
  "a changed tally", /recorded roll/);
MUTANTS.push({ name: "a stored did edited",
  edit: (s) => s.replace("Sec. 103 of the same Division B adds a new section 303A", "Sec. 103 of Division B adds a new section 303A"),
  expect: /_DOS_MECH is not byte-identical|stored did is not the record's copy/ });
MUTANTS.push({ name: "a fiscal line rewritten",
  edit: swap("H.R. 1|119|family_support", "Raised the child tax credit to $2,200; the House cleared it 218-214, the Senate 50-50."),
  expect: /shipped _DOS_EFFECT line/ });
MUTANTS.push({ name: "an H.R. 1968 line rewritten",
  edit: swap("H.R. 1968|119|health_rural", "Extended rural health programs; the House passed it 217-213."),
  expect: /line slice 1 wrote for it changed|shipped _DOS_EFFECT line/ });
MUTANTS.push({ name: "a renderer that prints the bill title under a row",
  edit: (s) => s.replace("return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '');",
    "return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '') || String(item.title || '');"),
  expect: /prints its bill title/ });
MUTANTS.push({ name: "a renderer that prints the mapping rationale under a row",
  edit: (s) => s.replace("return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '');",
    "var _mm = (item.issues || []).filter(function (x) { return x && x.issueKey === issueKey; })[0]; return (_mm && _mm.rationale) || _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '');"),
  expect: /prints a mapping rationale|method sentence/ });

const mutFaults = [];
for (const m of MUTANTS) {
  const src = m.edit(CONS);
  if (src === CONS) { mutFaults.push(`mutation "${m.name}": anchor not found`); continue; }
  const res = check(src, m.line ? relined(m.line[0], m.line[1]) : LEDGER, { pids: holders, base: baseH });
  const caught = res.faults.some((x) => m.expect.test(x));
  console.log(`   mutation: ${m.name} → ${caught ? "caught" : "NOT CAUGHT"}`);
  if (!caught) mutFaults.push(`mutation "${m.name}" survived${res.faults.length ? ` (faults: ${res.faults.slice(0, 2).join(" | ")})` : ""}`);
}

const all = live.faults.concat(mutFaults);
if (all.length) {
  for (const f of all.slice(0, 40)) console.error("  ✗ " + f);
  if (all.length > 40) console.error(`  … and ${all.length - 40} more`);
  console.error(`\n✗ long-did effect lines: ${all.length} failure(s), ${live.pass} passed`);
  process.exit(1);
}
console.log(`\n   ${LEDGER.rows.length} lines · ${(LEDGER.skipped || []).length} pairs already carrying a line, held · ${live.gained} pairs printing on member rows · ${live.drawers} drawers compared`);
console.log(`✓ long-did effect lines: all ${live.pass} assertions passed, ${MUTANTS.length} mutations caught`);
