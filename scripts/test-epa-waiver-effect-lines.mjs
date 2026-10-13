#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-epa-waiver-effect-lines.mjs — EPA waiver resolutions slice 4: H.J.Res. 88
// and H.J.Res. 89 speak on the two issues where their rows were blank
// ─────────────────────────────────────────────────────────────────────────────
// The two Congressional Review Act resolutions that revoked California's
// Advanced Clean Cars II and Advanced Clean Trucks waivers carry lines on three
// issues each, and printed nothing on States vs. Federal Power and Cost of
// Living — the two highest-volume blank pairs in the corpus. Neither pair stores
// a `did`. db/vr-epa-waiver-effect-lines.json records the one line each now
// carries in _DOS_EFFECT under the EPA WAIVER RESOLUTIONS SLICE 4 marker.
//
//   1. THE TABLE: the block holds exactly the four recorded pairs, each equal to
//      the record's line; the three lines already on each resolution are
//      unchanged.
//   2. THE LINE RULE: one sentence, 140 characters or fewer, ends on its stop,
//      no method word, no summing word, the act as the subject, never the title.
//   3. TENSE: both resolutions are law (the stored status is enacted), so each
//      line reads as done — never "Would" — and, like the lines already on them,
//      names no tally.
//   4. SOURCE: each line carries a term from its own pair's mapping rationale,
//      quoted as the cited migration wrote it; every figure it names is in that
//      pair's own stored text; it is no sibling issue's line, carries no
//      sibling's term, and lifts nothing from a sibling's rationale.
//   5. NOTHING SHIPPED MOVED: every other _DOS_EFFECT line (fiscal, long-did and
//      CRA among them), _DOS_EXEC_EFFECT, _DOS_MECH and _DOS_POINTER are
//      byte-identical to before the slice.
//   6. THE DRAWERS, LIVE-SHAPED: the seed maps these resolutions on three issues,
//      so their rows carry all five mappings the database holds. Each of the four
//      pairs printed nothing before and prints its line now, with its "Also on"
//      chips — the act's other four issues, never the one being read; with those
//      rows set aside every drawer renders byte-identically, and no row anywhere
//      prints a bill title, a mapping rationale or a method sentence.
//   7. MUTATIONS: an over-long line, a second sentence, a method word, a summed
//      figure, a law written as pending, a figure not in the source, a sibling's
//      line, a rewritten CRA line, an edited rationale, a chip for the issue being
//      read, and two renderers — one that prints the title under a row and one
//      that prints the mapping rationale — must each fail.
//
//   node scripts/test-epa-waiver-effect-lines.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";
import { keysAfter } from "./vr-slice-blocks.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "issue-colors.js", "consistency.js",
  "voting-record.js", "word-action.js", "profile-spine.js", "profiles-full.js",
];
const MARK = "    // EPA WAIVER RESOLUTIONS SLICE 4 (v364).";
const VERSION = 364;
const LEDGER = JSON.parse(R("db/vr-epa-waiver-effect-lines.json"));
const ACTS = Object.keys(LEDGER.measures);
// The tables as they stood before this slice: "key\tline" in table order for the
// two line tables (a later slice's own block is that slice's to pin), the source
// text for the two no slice writes to.
const PIN = {
  _DOS_EFFECT: { n: 312, sha: "5152766f6c9f7f54b027edb56fa1fa3f44d11a2bd893d077dedcceecab0be1f8" },
  _DOS_EXEC_EFFECT: { n: 52, sha: "43742a6d26eefc0437dd5e98a4b58a44cbc3ac46e8202c3aca14104abd8a52a7" },
  _DOS_MECH: "11a995d45af07637efe7e1bc1625efa27fb37c26d0718a1af1fdde654e5579a3",
  _DOS_POINTER: "cb4fcb1652dc2e45af694a7c63c8831c62e08715b201bcfde24adaadfce909e4",
};
const METHOD = /\b(?:precedent|mirror|discriminator|primary|secondary|on-axis|off-axis|vocabulary|coded|coding|chip|mapped|mapping|filed|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger|leaf|yea|nay|recorded as|cutting against)\b|PolitiDex|…|\.\.\./i;
const SUMMED = /\b(?:combined|in total|totall?ing|altogether|all told|net worth|summed|sum of|together with|overall|aggregate)\b/i;
const OPENS = /^(?:[A-Z][a-z]+ed|Set|Cut|Put|Made|Kept|Took|Let)\b/;

const sha = (s) => createHash("sha256").update(s).digest("hex");
const norm = (x) => String(x == null ? "" : x).replace(/\s+/g, " ").trim();
const low = (x) => norm(x).toLowerCase();
const dec = (h) => String(h || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
const figs = (s) => new Set(String(s || "").match(/\d[\d,.]*\d|\d/g) || []);

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

// ── live-shaped rows: every row on the two acts carries every stored mapping ──
const corpus = buildCorpus(ROOT);
const issuesOf = (act) => LEDGER.measures[act].issues;
const titleOf = {};
for (const recs of corpus.byMember.values()) for (const it of recs) if (ACTS.includes(it.measureId) && !titleOf[it.measureId]) titleOf[it.measureId] = norm(it.title);
const records = new Map([...corpus.byMember].map(([pid, recs]) => [pid,
  recs.map((it) => (ACTS.includes(it.measureId) ? { ...it, issues: issuesOf(it.measureId).map((i) => ({ ...i })) } : it))]));
const holders = [...records].filter(([, recs]) => recs.some((it) => ACTS.includes(it.measureId))).map(([pid]) => pid);
function boot(src, recs = records) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(f === "consistency.js" ? src : R(f), ctx, { filename: f }); } catch (e) { win.__err = `${f}: ${e.message}`; }
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, list] of recs) {
    try { win.PDXVotingRecord.noteMember(pid, list); } catch { /* not a member surface */ }
  }
  return win;
}
const leavesOf = (pid) => {
  const s = new Set();
  for (const it of records.get(pid) || []) for (const i of it.issues || []) if (i && i.issueKey) s.add(i.issueKey);
  return [...s];
};
const ALL_PIDS = [...records.keys()];

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
      const effs = new Map(), rels = new Map();
      for (const m of html.matchAll(/<tr class="pdxlg-effr" data-pdxlg-effr="(\d+)">([\s\S]*?)<\/tr>/g)) effs.set(Number(m[1]), dec(m[2]));
      for (const m of html.matchAll(/<tr class="pdxlg-relr" data-pdxlg-relr="(\d+)">([\s\S]*?)<\/tr>/g)) rels.set(Number(m[1]), [...m[2].matchAll(/data-pdxlg-rel-key="([^"]+)"/g)].map((x) => x[1]));
      const rows = [];
      for (const m of html.matchAll(/<tr data-pdxlg-row="(\d+)">/g)) {
        const i = Number(m[1]), d = items[i], it = (d && d.item) || {};
        if (!d || d.lane === "exec") continue;
        const num = norm(it.number);
        rows.push({
          i, pair: num && typeof it.congress === "number" ? `${num}|${it.congress}|${k}` : "",
          act: num && typeof it.congress === "number" ? `${num}|${it.congress}` : "",
          eff: effs.get(i) || "", rel: rels.get(i) || null, title: norm(it.title),
          rationales: (it.issues || []).map((x) => norm(x && x.rationale)).filter(Boolean),
        });
      }
      out.set(`${pid}|${k}`, { k, html, rows });
    }
  }
  return { out };
}
function stripSliceRows(view, NEW) {
  let h = view.html;
  for (const r of view.rows) {
    if (!NEW.has(r.pair) || !r.eff) continue;
    h = h.replace(new RegExp(`<tr class="pdxlg-effr" data-pdxlg-effr="${r.i}">[\\s\\S]*?<\\/tr>`), "");
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
  ok(block.length > 0, "the EPA waiver slice block is not in _DOS_EFFECT");
  ok(ledger.rows.length === 4 && ledger.lines === 4, `${ledger.rows.length} rows in the record — the slice wrote 4 pairs`);
  ok(block.length === NEW.size && block.every((k) => NEW.has(k)), `the block holds ${JSON.stringify(block.filter((k) => !NEW.has(k)))} outside the record, or misses some of its pairs`);

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
    ok(t && sha(t.text) === PIN[name], `${name} is not byte-identical to before the slice`);
  }

  // ── 2–4 · line by line ────────────────────────────────────────────────────
  for (const row of ledger.rows) {
    const k = row.key, s = lineOf(k);
    const [num, cong, issue] = k.split("|"), act = `${num}|${cong}`;
    const meas = ledger.measures[act];
    ok(!!meas && `${row.number}|${row.congress}|${row.issue}` === k, `${k}: the record's identity fields do not spell its key`);
    if (!meas) continue;
    ok(s && s === norm(row.line), `${k}: the stored line and the record's line differ`);
    ok(!(M.map[k] && norm(M.map[k].did)), `${k}: the pair stores a did, so its rationale is not its source`);
    // 2 · the rule
    ok(s.length > 0 && s.length <= 140, `${k}: ${s.length} characters`);
    ok(/[.!?]$/.test(s), `${k}: does not end on a stop`);
    ok(!/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US")), `${k}: more than one sentence`);
    const mw = s.match(METHOD);
    ok(!mw, `${k}: method word "${mw && mw[0]}"`);
    const sw = s.match(SUMMED);
    ok(!sw, `${k}: a summed or combined figure ("${sw && sw[0]}")`);
    ok(OPENS.test(s), `${k}: the act is not the subject — opens "${s.split(" ").slice(0, 2).join(" ")}"`);
    for (const t of [titleOf[act], meas.title]) ok(!t || (low(s) !== low(t) && !low(s).includes(low(t).replace(/[.!?]$/, ""))), `${k}: the line is the resolution's title`);
    // 3 · tense
    ok(meas.status === "enacted", `${act}: the record says ${meas.status}, not enacted`);
    ok(!/^(?:Would|Proposed)\b/.test(s), `${k}: a resolution that became law is written as though it did not`);
    ok(!/; the (?:House|Senate) /.test(s) && !/\b\d+-\d+\b/.test(s), `${k}: names a tally, which no line on this resolution does`);
    // 4 · source
    const mapping = (meas.issues || []).find((i) => i.issueKey === issue);
    ok(!!mapping && norm(mapping.rationale) === norm(row.source.rationale), `${k}: the quoted rationale is not the mapping's`);
    let sql = ""; try { sql = /^netlify\/database\/migrations\/[^/]+\.sql$/.test(row.source.rationaleAt) ? R(row.source.rationaleAt).replace(/''/g, "'") : ""; } catch { sql = ""; }
    ok(!!sql && sql.includes(row.source.rationale), `${k}: ${row.source.rationaleAt} does not hold the quoted rationale`);
    const own = row.termIn === "rationale" ? row.source.rationale : row.termIn === "summary" ? meas.summary : row.termIn === "title" ? meas.title : "";
    const term = norm(row.term);
    ok(term.length >= 8 && low(own).includes(low(term)), `${k}: the term "${term}" is not in its own ${row.termIn}`);
    ok(low(s).includes(low(term)), `${k}: the line does not carry its source term "${term}"`);
    const srcFigs = figs([row.source.rationale, meas.summary, meas.title].join(" "));
    for (const f of figs(s)) ok(srcFigs.has(f), `${k}: the figure "${f}" is not in this pair's own stored text`);
    for (const [j, w] of Object.entries(E.map)) {
      if (j === k || !j.startsWith(act + "|")) continue;
      ok(norm(w) !== s, `${k}: borrowed from ${j}`);
      ok(!low(w).includes(low(term)), `${k}: its term "${term}" is ${j}'s line`);
    }
    for (const i of meas.issues || []) {
      if (i.issueKey === issue) continue;
      ok(!low(i.rationale).includes(low(s.replace(/[.!?]$/, ""))), `${k}: borrowed from ${act}|${i.issueKey}'s rationale`);
      ok(!low(i.rationale).includes(low(term)), `${k}: its term "${term}" is ${act}|${i.issueKey}'s rationale`);
    }
  }
  // 1 · the lines already on these resolutions
  for (const act of ACTS) for (const i of ledger.measures[act].issues) {
    const k = `${act}|${i.issueKey}`;
    if (NEW.has(k)) continue;
    ok(!!lineOf(k), `${k}: the line already on this resolution is gone`);
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
      if (ACTS.includes(r.act) && r.eff) {
        const want = issuesOf(r.act).map((i) => i.issueKey).filter((x) => x !== view.k);
        ok(!!r.rel && JSON.stringify(r.rel) === JSON.stringify(want), `${dk}: ${r.act}'s Also on chips are ${JSON.stringify(r.rel)}, stored ${JSON.stringify(want)}`);
        ok(!(r.rel || []).includes(view.k), `${dk}: ${r.act} shows a chip for the issue being read`);
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
      for (const r of view.rows) if (NEW.has(r.pair)) ok(!r.eff && !r.rel, `${dk}: ${r.pair} printed ${JSON.stringify(r.eff)} before the slice`);
      ok(stripSliceRows(cur, NEW) === view.html, `${dk}: the drawer moved beyond the slice's own rows`);
    }
    ok(now.out.size === base.out.size, `${now.out.size} drawers render now, ${base.out.size} before`);
  }
  return { faults, pass, drawers: now.out.size, gained: gained.size };
}

const CONS = R("consistency.js");
const BEFORE = withoutSlice(CONS);
const baseAll = render(BEFORE, ALL_PIDS);
if (baseAll.err) { console.error(`✗ EPA waiver effect lines: boot before the slice: ${baseAll.err}`); process.exit(2); }
console.log(`  · ${holders.length} members carry H.J.Res. 88 or 89 rows, rebuilt with all five mappings each`);
const live = check(CONS, LEDGER, { base: baseAll });

// ── 7 · mutations ───────────────────────────────────────────────────────────
const baseH = render(BEFORE, holders);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const swap = (pair, line) => (s) => s.replace(new RegExp(`('${esc(pair)}':\\n\\s+)'(?:[^'\\\\]|\\\\.)+'`), (_, h) => h + "'" + line.replace(/'/g, "\\'") + "'");
const relined = (k, line) => ({ ...LEDGER, rows: LEDGER.rows.map((r) => (r.key === k ? { ...r, line } : r)) });
const S88 = "H.J.Res. 88|119|states_federal_power", C88 = "H.J.Res. 88|119|cost_living";
const S89 = "H.J.Res. 89|119|states_federal_power", C89 = "H.J.Res. 89|119|cost_living";
const MUTANTS = [];
const L = (k, line, name, expect) => MUTANTS.push({ name, edit: swap(k, line), expect, line: [k, line] });
L(S88, "Repealed the waiver that let California set stricter vehicle emission standards than the national floor, narrowing that state authority for every state.",
  "a line over 140 characters", /characters/);
L(C88, "Removed the rising zero-emission sales requirement. So the mix of new vehicles offered there is set by the market.",
  "a second sentence", /more than one sentence/);
L(S89, "Repealed the federal waiver that let California set stricter heavy-truck standards than the national floor, a secondary reading.",
  "a method word", /method word/);
L(C89, "Ended the zero-emission share in all adopting states combined, leaving fleet purchasers free to buy conventional trucks.",
  "a summed figure", /summed or combined/);
L(S88, "Would repeal the waiver that let California set stricter vehicle emission standards than the national floor.",
  "a law written as pending", /did not/);
L(C89, "Ended the zero-emission share required of new trucks in 40 adopting states, leaving fleet purchasers free to buy conventional trucks.",
  "a figure not in the source", /figure "40" is not/);
L(C88, "Struck the EPA waiver for California’s Advanced Clean Cars II regulations and barred a substantially similar rule.",
  "a sibling's line", /borrowed from|does not carry its source term/);
MUTANTS.push({ name: "a CRA line rewritten",
  edit: swap("H.J.Res. 88|119|gov_regulation", "Struck the EPA waiver letting California enforce Advanced Clean Cars II."),
  expect: /shipped _DOS_EFFECT line/ });
MUTANTS.push({ name: "an edited rationale",
  edit: (s) => s, ledger: { ...LEDGER, rows: LEDGER.rows.map((r) => (r.key === S89 ? { ...r, source: { ...r.source, rationale: r.source.rationale.replace("heavy-truck", "truck") } } : r)) },
  expect: /does not hold the quoted rationale|is not the mapping's/ });
MUTANTS.push({ name: "a chip for the issue being read",
  edit: (s) => s.replace("if (!k || k === issueKey || seen[k] || !_DOS_REL_KEY.test(k)) continue;", "if (!k || seen[k] || !_DOS_REL_KEY.test(k)) continue;"),
  expect: /chip for the issue being read|Also on chips are/ });
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
  if (src === CONS && !m.ledger) { mutFaults.push(`mutation "${m.name}": anchor not found`); continue; }
  const res = check(src, m.ledger || (m.line ? relined(m.line[0], m.line[1]) : LEDGER), { pids: holders, base: baseH });
  const caught = res.faults.some((x) => m.expect.test(x));
  console.log(`   mutation: ${m.name} → ${caught ? "caught" : "NOT CAUGHT"}`);
  if (!caught) mutFaults.push(`mutation "${m.name}" survived${res.faults.length ? ` (faults: ${res.faults.slice(0, 2).join(" | ")})` : ""}`);
}

const all = live.faults.concat(mutFaults);
if (all.length) {
  for (const f of all.slice(0, 40)) console.error("  ✗ " + f);
  if (all.length > 40) console.error(`  … and ${all.length - 40} more`);
  console.error(`\n✗ EPA waiver effect lines: ${all.length} failure(s), ${live.pass} passed`);
  process.exit(1);
}
console.log(`\n   ${LEDGER.rows.length} lines · ${live.gained} pairs printing on member rows · ${live.drawers} drawers compared`);
console.log(`✓ EPA waiver effect lines: all ${live.pass} assertions passed, ${MUTANTS.length} mutations caught`);
