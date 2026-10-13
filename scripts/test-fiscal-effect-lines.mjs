#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-fiscal-effect-lines.mjs — budget and fiscal slice 1: the FY2025 budget
// resolution, the full-year CR and the 2025 reconciliation act speak under
// every row they sit on
// ─────────────────────────────────────────────────────────────────────────────
// H.Con.Res. 14, H.R. 1968 and H.R. 1 of the 119th are on the drawers of every
// House member who sat for them, and twenty of their measure-and-issue pairs
// printed nothing under the row. db/vr-fiscal-effect-lines.json records the one
// line each now carries in _DOS_EFFECT, under the BUDGET AND FISCAL SLICE 1
// marker, and the stored source it was written from.
//
//   1. THE TABLE: the block holds exactly the twenty recorded pairs, each equal
//      to the record's line, and no pair that already printed a line.
//   2. THE LINE RULE: one sentence, 140 characters or fewer, ends on its stop,
//      no method word, no summing word, the act as the subject, never the title.
//   3. TENSE AND TALLY: the adopted budget resolution opens "Would" and never
//      "Would have"; the two public laws read as done. Each ends on the House
//      roll on file, and the seeds agree with its count.
//   4. SOURCE: each line carries a term from its own pair's source — the `did`
//      where one is stored, otherwise its own mapping rationale, quoted as the
//      cited migration wrote it — and no sibling leaf's line or term.
//   5. NOTHING SHIPPED MOVED: every other _DOS_EFFECT line, _DOS_MECH (every
//      stored `did`), _DOS_EXEC_EFFECT and _DOS_POINTER are byte-identical to
//      the pre-slice table, and the lines already on these acts are unchanged.
//   6. THE DRAWERS, LIVE-SHAPED: the offline seed maps only part of these acts,
//      so the rows are rebuilt with every mapping the database holds. Each of
//      the twenty pairs printed nothing before and prints its line now; with
//      those rows set aside, every drawer renders byte-identically, and no row
//      anywhere prints a bill title, a mapping rationale or a method sentence.
//   7. MUTATIONS: an over-long line, a second sentence, a method word, a summed
//      figure, "Would have" on the resolution, a law written as pending, a
//      borrowed sibling line, a changed tally, a rewritten shipped line, an
//      edited `did`, and two renderers — one that prints the title under a row
//      and one that prints the mapping rationale — must each fail.
//
//   node scripts/test-fiscal-effect-lines.mjs

import { readFileSync, readdirSync } from "node:fs";
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
const MARK = "    // BUDGET AND FISCAL SLICE 1 (v360).";
const LEDGER = JSON.parse(R("db/vr-fiscal-effect-lines.json"));
const ACTS = Object.keys(LEDGER.measures);
// sha256 over "key\tline" for every _DOS_EFFECT entry outside this slice, in
// table order, and over the source text of the three neighbouring tables, as
// they stood before the slice landed. A changed byte in any of them moves a hash.
const PIN = {
  shipped: { n: 289, sha: "b512a4aea5b900c4ed49434e99fe3afe4b7f196cc535b8d7f4b40ecb87c30cc7" },
  _DOS_MECH: "11a995d45af07637efe7e1bc1625efa27fb37c26d0718a1af1fdde654e5579a3",
  _DOS_EXEC_EFFECT: "d3ef66922691a1d8136058cc9a45ccecd649d92573737bf561ee2cf4b1a9f06c",
  _DOS_POINTER: "cb4fcb1652dc2e45af694a7c63c8831c62e08715b201bcfde24adaadfce909e4",
};
const METHOD = /\b(?:precedent|mirror|discriminator|primary|secondary|on-axis|off-axis|vocabulary|coded|coding|chip|mapped|mapping|filed as|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger|leaf|yea|nay)\b|PolitiDex|…|\.\.\./i;
const SUMMED = /\b(?:combined|in total|totall?ing|altogether|all told|net worth|summed|sum of|together with|overall|aggregate)\b/i;
// The act is the subject: the line opens on what it did, never on a pronoun, an
// article, a voter or the measure's own number.
const OPENS = /^(?:Would [a-z]+|[A-Z][a-z]+ed|Kept|Made|Set|Cut|Sped)\b/;

const sha = (s) => createHash("sha256").update(s).digest("hex");
const norm = (x) => String(x == null ? "" : x).replace(/\s+/g, " ").trim();
const low = (x) => norm(x).toLowerCase();
const dec = (h) => String(h || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function mapOf(src, name) {
  const at = src.indexOf(`var ${name} = {`);
  if (at < 0) return null;
  const end = src.indexOf("\n  };", at);
  return { text: src.slice(at, end + 4), map: vm.runInNewContext("(" + src.slice(at + `var ${name} = `.length, end + 4) + ")") };
}
// The slice's keys, read from the marked block to the end of the table.
function blockKeys(src) {
  const a = src.indexOf(MARK);
  if (a < 0) return [];
  const end = src.indexOf("\n  };", a);
  return [...src.slice(a, end).matchAll(/^    '([^']+)':$/gm)].map((m) => m[1]);
}
// The table as it stood before this slice: the marked block taken out whole.
function withoutSlice(src) {
  const a = src.indexOf(MARK);
  if (a < 0) return src;
  return src.slice(0, a) + src.slice(src.indexOf("\n  };", a) + 1);
}

// ── the rolls the seeds hold, by number|congress → chamber|roll → [yea, nay] ──
const SEED_ROLLS = (() => {
  const t = {};
  for (const f of readdirSync(join(ROOT, "db")).filter((x) => /^vr-.*seed.*\.json$/.test(x)).sort()) {
    let j; try { j = JSON.parse(R(`db/${f}`)); } catch { continue; }
    for (const v of j.votes || []) {
      const num = norm(typeof v.measure === "string" ? v.measure : v.measure && v.measure.number);
      const cong = (v.measure && v.measure.congress) || v.congress || j.congress;
      const ch = v.chamber || (v.measure && v.measure.chamber) || j.chamber;
      if (!num || v.rollNumber == null || !ch) continue;
      let tl = null;
      if (v.totals && v.totals.yea != null) tl = [v.totals.yea, v.totals.nay];
      else if (v.partyTotals) {
        const P = Object.values(v.partyTotals);
        if (P.length) tl = [P.reduce((n, p) => n + p.yea, 0), P.reduce((n, p) => n + p.nay, 0)];
      }
      const a = (t[`${num}|${cong}`] = t[`${num}|${cong}`] || {});
      const k = `${ch}|${v.rollNumber}`;
      (a[k] = a[k] || []).push({ file: f, tl, vote: v });
    }
  }
  return t;
})();
const ENACTED = new Set();
for (const m of JSON.parse(R("db/vr-measure-identity.json")).measures || []) {
  if (m && (m.laws || []).length) ENACTED.add(`${norm(m.number)}|${m.congress}`);
}

// ── live-shaped rows ────────────────────────────────────────────────────────
// The seed maps only some of these acts' issues (and H.R. 1968 not at all), so
// the offline corpus drops or thins their rows. Each roll the seeds hold for
// them is rebuilt here for every member it records, in the corpus's own item
// shape, carrying every mapping the database holds (ledger.measures).
const corpus = buildCorpus(ROOT);
const titleOf = new Map();
for (const recs of corpus.byMember.values()) for (const it of recs) if (ACTS.includes(it.measureId) && !titleOf.has(it.measureId)) titleOf.set(it.measureId, it.title);
for (const m of JSON.parse(R("db/vr-measure-identity.json")).measures || []) {
  const k = `${norm(m.number)}|${m.congress}`;
  if (ACTS.includes(k) && !titleOf.has(k)) titleOf.set(k, m.title);
}
const LIVE = new Map(); // pid → rebuilt items
(() => {
  const seen = new Set();
  for (const act of ACTS) {
    const [number, congress] = act.split("|");
    const issues = LEDGER.measures[act].issues;
    for (const [rk, hits] of Object.entries(SEED_ROLLS[act] || {})) {
      const [chamber, roll] = rk.split("|");
      for (const { vote: v } of hits) {
        for (const c of v.memberVotes || []) {
          const id = `${rk}|${c.politicianId}`;
          if (!c.politicianId || !c.position || seen.has(id)) continue;
          seen.add(id);
          const mt = (v.measure && v.measure.measureType) || v.measureType || (/Res\./.test(number) ? "resolution" : "bill");
          const it = {
            kind: "vote", measureId: act, measureType: mt, number, title: titleOf.get(act) || number,
            chamber, status: "", date: v.voteDate ? new Date(v.voteDate).toISOString() : null,
            action: v.question || null, actionType: v.actionType || "passage", position: c.position,
            result: v.result || null, isParty: c.isParty || null, supports: null,
            isProcedural: false, advanceInverted: false, isAmendment: false, parentMeasureId: null,
            rollcallId: Number(roll), congress: Number(congress), session: v.session || 1, rollNumber: Number(roll),
            issues: issues.map((i) => ({ ...i })),
            source: { url: v.sourceUrl || "", label: v.sourceLabel || "" },
          };
          LIVE.set(c.politicianId, (LIVE.get(c.politicianId) || []).concat([it]));
        }
      }
    }
  }
})();

function boot(src) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(f === "consistency.js" ? src : R(f), ctx, { filename: f }); } catch (e) { win.__err = `${f}: ${e.message}`; }
  }
  win.PROFILES = win.CMP_DATA;
  const pids = new Set([...corpus.byMember.keys(), ...LIVE.keys()]);
  for (const pid of pids) {
    const base = (corpus.byMember.get(pid) || []).filter((it) => !ACTS.includes(it.measureId));
    try { win.PDXVotingRecord.noteMember(pid, base.concat(LIVE.get(pid) || [])); } catch { /* not a member surface */ }
  }
  return win;
}

// Every drawer a target member opens, rendered: html per pid|leaf, and per row
// the pair it sits on and the line under it.
function render(src, pids, leavesFor) {
  const win = boot(src);
  if (win.__err) return { err: win.__err };
  const CS = win.PDXConsistency;
  const out = new Map();
  for (const pid of pids) {
    if (!win.CMP_DATA[pid]) continue;
    for (const k of leavesFor(pid)) {
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
// A drawer's html with this slice's own line rows taken out, for comparison
// against the drawer as it rendered before the slice.
function stripSliceRows(view, NEW) {
  let h = view.html;
  for (const r of view.rows) {
    if (!NEW.has(r.pair) || !r.eff) continue;
    h = h.replace(new RegExp(`<tr class="pdxlg-effr" data-pdxlg-effr="${r.i}">[\\s\\S]*?<\\/tr>`), "");
  }
  return h;
}

const ALL_PIDS = [...new Set([...corpus.byMember.keys(), ...LIVE.keys()])];
const leavesOf = (pid) => {
  const s = new Set();
  for (const it of (corpus.byMember.get(pid) || []).concat(LIVE.get(pid) || [])) for (const i of it.issues || []) if (i && i.issueKey) s.add(i.issueKey);
  return [...s];
};

function check(src, ledger, { pids = ALL_PIDS, base = null } = {}) {
  const faults = [];
  let pass = 0;
  const ok = (c, m) => { if (c) pass++; else faults.push(m); };
  const E = mapOf(src, "_DOS_EFFECT"), M = mapOf(src, "_DOS_MECH");
  if (!E || !M) return { faults: ["effect tables not found in consistency.js"], pass };
  const NEW = new Set(ledger.rows.map((r) => r.key));
  const block = blockKeys(src);
  const rendererRule = new RegExp(/\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary (?:carries|has) no|coded|chip|mapped|filed as|weighted)\b/.source, "i");

  // ── 1 · the table ─────────────────────────────────────────────────────────
  ok(block.length > 0, "the budget and fiscal slice block is not in _DOS_EFFECT");
  ok(ledger.rows.length === 20 && ledger.lines === 20, `${ledger.rows.length} rows in the record — the slice wrote 20 pairs`);
  ok(block.length === NEW.size && block.every((k) => NEW.has(k)), `the block holds ${JSON.stringify(block.filter((k) => !NEW.has(k)))} outside the record, or misses some of its pairs`);
  const lineOf = (k) => (E.map[k] ? norm(E.map[k]) : "");

  // ── 5 · nothing shipped moved ─────────────────────────────────────────────
  const shipped = Object.entries(E.map).filter(([k]) => !NEW.has(k));
  ok(shipped.length === PIN.shipped.n && sha(shipped.map(([k, v]) => k + "\t" + v).join("\n")) === PIN.shipped.sha,
    "a shipped _DOS_EFFECT line was rewritten, removed or added outside the slice");
  for (const name of ["_DOS_MECH", "_DOS_EXEC_EFFECT", "_DOS_POINTER"]) {
    const t = mapOf(src, name);
    ok(t && sha(t.text) === PIN[name], `${name} is not byte-identical to the table before the slice${name === "_DOS_MECH" ? " — a stored did was edited" : ""}`);
  }
  for (const act of ACTS) {
    for (const [k, v] of Object.entries(ledger.measures[act].shippedLines || {})) {
      ok(!NEW.has(k), `${k}: already printed a line and is in the slice`);
      const now = v.from === "did" ? norm(M.map[k] && M.map[k].did) : lineOf(k);
      ok(now === norm(v.line), `${k}: the line it already printed changed`);
      if (v.from === "did") ok(!(k in E.map), `${k}: a short did now has a _DOS_EFFECT line over it`);
    }
  }

  // ── 2–4 · line by line ────────────────────────────────────────────────────
  for (const row of ledger.rows) {
    const k = row.key, s = lineOf(k);
    const [num, cong, issue] = k.split("|"), act = `${num}|${cong}`;
    const meas = ledger.measures[act];
    ok(!!meas, `${k}: its act is not in the record's measures`);
    if (!meas) continue;
    ok(`${row.number}|${row.congress}|${row.issue}` === k, `${k}: the record's identity fields do not spell its key`);
    ok(s && s === norm(row.line), `${k}: the stored line and the record's line differ`);
    // 2 · the rule
    ok(s.length > 0 && s.length <= 140, `${k}: ${s.length} characters`);
    ok(/[.!?]$/.test(s), `${k}: does not end on a stop`);
    ok(!/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US")), `${k}: more than one sentence`);
    const mw = s.match(METHOD);
    ok(!mw, `${k}: method word "${mw && mw[0]}"`);
    const sw = s.match(SUMMED);
    ok(!sw && (s.match(/\$[\d,.]+/g) || []).length <= 1, `${k}: a summed or combined figure${sw ? ` ("${sw[0]}")` : ""}`);
    ok(OPENS.test(s), `${k}: the act is not the subject — opens "${s.split(" ").slice(0, 2).join(" ")}"`);
    const title = norm(titleOf.get(act));
    ok(!title || (low(s) !== low(title) && !low(s).includes(low(title).replace(/[.!?]$/, ""))), `${k}: the line is the measure's title`);
    // 3 · tense and tally
    const law = ENACTED.has(act);
    ok((meas.status === "enacted") === law, `${act}: recorded as ${meas.status}, and the identity record ${law ? "holds" : "holds no"} public law`);
    if (meas.status === "adopted") ok(/^Would (?!have\b)/.test(s), `${k}: an adopted resolution must open "Would", never "Would have"`);
    else ok(!/^(?:Would|Proposed)\b/.test(s), `${k}: a public law is written as though it did not take effect`);
    const rl = meas.roll;
    const C = rl.chamber === "house" ? "House" : "Senate";
    const verb = meas.status === "adopted" ? "adopted" : act === "H.R. 1|119" ? "cleared" : "passed";
    const tail = `; the ${C} ${verb} it ${rl.yea}-${rl.nay}`;
    ok(s.endsWith(tail + ".") || (rl.also && s.endsWith(`${tail}, the ${rl.also.chamber === "senate" ? "Senate" : "House"} ${rl.also.yea}-${rl.also.nay}.`)),
      `${k}: does not end on the recorded roll ("${tail.slice(2)}")`);
    for (const r of [rl, rl.also].filter(Boolean)) {
      const hits = (SEED_ROLLS[act] || {})[`${r.chamber}|${r.roll}`] || [];
      ok(hits.length > 0, `${act}: ${r.chamber} roll ${r.roll} is in no vote seed`);
      for (const h of hits) if (h.tl) ok(h.tl[0] === r.yea && h.tl[1] === r.nay, `${act}: ${h.file} counts ${r.chamber} roll ${r.roll} ${h.tl.join("-")}, the line says ${r.yea}-${r.nay}`);
    }
    // 4 · source
    const did = norm(M.map[k] && M.map[k].did);
    ok((row.source === "did") === !!did, `${k}: the record names "${row.source}" as its source, and the pair ${did ? "stores" : "stores no"} did`);
    const mapping = (meas.issues || []).find((i) => i.issueKey === issue);
    ok(!!mapping, `${k}: the act carries no ${issue} mapping in the record`);
    if (row.source === "did") ok(norm(row.sourceText) === did, `${k}: the quoted did is not the stored one`);
    else {
      ok(mapping && norm(mapping.rationale) === norm(row.sourceText), `${k}: the quoted rationale is not the mapping's`);
      const m = /^netlify\/database\/migrations\/[^/]+\.sql$/.exec(row.sourceAt || "");
      let sql = ""; try { sql = m ? R(row.sourceAt).replace(/''/g, "'") : ""; } catch { sql = ""; }
      ok(!!sql && sql.includes(row.sourceText), `${k}: ${row.sourceAt} does not hold the quoted rationale`);
    }
    const term = norm(row.term);
    ok(term.length >= 8 && low(row.sourceText).includes(low(term)), `${k}: the term "${term}" is not in its own source`);
    ok(low(s).includes(low(term)), `${k}: the line does not carry its source term "${term}"`);
    for (const [j, w] of Object.entries(E.map)) {
      if (j === k || !j.startsWith(act + "|")) continue;
      ok(norm(w) !== s, `${k}: borrowed from ${j}`);
      ok(!low(w).includes(low(term)), `${k}: its term "${term}" is ${j}'s line`);
    }
    for (const i of meas.issues || []) {
      if (i.issueKey === issue) continue;
      const sib = `${act}|${i.issueKey}`;
      ok(!(M.map[sib] && norm(M.map[sib].did).includes(s.replace(/[.!?]$/, ""))), `${k}: borrowed from ${sib}'s stored did`);
      ok(!low(i.rationale).includes(low(s.split(";")[0])), `${k}: borrowed from ${sib}'s rationale`);
    }
  }

  // ── 6 · the drawers ───────────────────────────────────────────────────────
  const now = render(src, pids, leavesOf);
  if (now.err) return { faults: faults.concat([`boot: ${now.err}`]), pass };
  const gained = new Set();
  for (const [dk, view] of now.out) {
    for (const r of view.rows) {
      if (!r.eff) continue;
      ok(!r.title || low(r.eff) !== low(r.title), `${dk}: ${r.pair} prints its bill title under the row`);
      ok(!r.rationales.some((x) => low(x) === low(r.eff)), `${dk}: ${r.pair} prints a mapping rationale under the row`);
      ok(!rendererRule.test(r.eff), `${dk}: ${r.pair} prints a method sentence under the row`);
      if (NEW.has(r.pair)) {
        ok(r.eff === lineOf(r.pair), `${dk}: ${r.pair} prints ${JSON.stringify(r.eff)}, stored ${JSON.stringify(lineOf(r.pair))}`);
        gained.add(r.pair);
      }
    }
    for (const r of view.rows) if (NEW.has(r.pair)) ok(!!r.eff, `${dk}: ${r.pair} still prints nothing`);
  }
  for (const k of NEW) ok(gained.has(k), `${k}: no rebuilt member row prints it`);
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
const baseAll = render(BEFORE, ALL_PIDS, leavesOf);
if (baseAll.err) { console.error(`✗ fiscal effect lines: boot before the slice: ${baseAll.err}`); process.exit(2); }
console.log(`  · ${LIVE.size} members with live-shaped rows on ${ACTS.join(", ")}`);
const live = check(CONS, LEDGER, { base: baseAll });

// ── 7 · mutations ───────────────────────────────────────────────────────────
// Mutants render only the members who carry the rebuilt rows, against a
// baseline built the same way.
const TARGET = [...LIVE.keys()];
const baseT = render(BEFORE, TARGET, leavesOf);
const swap = (pair, line) => (s) => s.replace(new RegExp(`('${esc(pair)}':\\n\\s+)'(?:[^'\\\\]|\\\\.)+'`), (_, h) => h + "'" + line.replace(/'/g, "\\'") + "'");
const lineFor = (k) => LEDGER.rows.find((r) => r.key === k).line;
const relined = (k, line) => ({ ...LEDGER, rows: LEDGER.rows.map((r) => (r.key === k ? { ...r, line } : r)) });
const MUTANTS = [];
const mut = (name, edit, expect, line) => MUTANTS.push({ name, edit, expect, line });
{
  const k = "H.R. 1968|119|strong_defense";
  const L = "Increased defense appropriations over the prior year for every service branch, the Coast Guard and the intelligence community; the House passed it 217-213.";
  mut("a line over 140 characters", swap(k, L), /characters/, [k, L]);
}
{
  const k = "H.R. 1968|119|gov_services";
  const L = "Funded the federal government through the end of FY2025. It averted a shutdown; the House passed it 217-213.";
  mut("a second sentence", swap(k, L), /more than one sentence/, [k, L]);
}
{
  const k = "H.R. 1|119|school_choice";
  const L = "Created a K-12 private-school scholarship organizations credit, a secondary row; the House cleared it 218-214, the Senate 50-50.";
  mut("a method word", swap(k, L), /method word/, [k, L]);
}
{
  const k = "H.R. 1|119|national_debt";
  const L = "Raised the statutory debt ceiling by $5 trillion, $9 trillion all told; the House cleared it 218-214, the Senate 50-50.";
  mut("a summed figure", swap(k, L), /summed or combined/, [k, L]);
}
{
  const k = "H.Con.Res. 14|119|strong_defense";
  const L = "Would have reserved reconciliation room for a defense-spending increase; the House adopted it 216-214.";
  mut("\"Would have\" on the adopted resolution", swap(k, L), /never "Would have"/, [k, L]);
}
{
  const k = "H.R. 1|119|deportations";
  const L = "Would appropriate tens of billions of dollars for immigration detention and removal; the House cleared it 218-214, the Senate 50-50.";
  mut("a public law written as pending", swap(k, L), /did not take effect/, [k, L]);
}
{
  const k = "H.R. 1|119|family_support";
  const L = lineFor("H.R. 1|119|tax_middle_class");
  mut("a sibling leaf's line borrowed", swap(k, L), /borrowed from|is H\.R\. 1\|119\|tax_middle_class's line|does not carry its source term/, [k, L]);
}
{
  const k = "H.R. 1968|119|national_debt";
  const L = "Continued deficit-level federal spending for the full 2025 fiscal year; the House passed it 218-213.";
  mut("a changed tally", swap(k, L), /recorded roll/, [k, L]);
}
mut("a shipped line rewritten",
  swap("H.R. 1|119|lower_taxes", "Made the 2017 tax cuts permanent; the House cleared it 218-214, the Senate 50-50."),
  /shipped _DOS_EFFECT line|line it already printed changed/);
mut("a stored did edited",
  (s) => s.replace("did: 'The 2025 reconciliation act appropriated new funding for border enforcement and immigration operations.'",
    "did: 'Appropriated new funding for border enforcement.'"),
  /_DOS_MECH is not byte-identical|line it already printed changed/);
mut("a renderer that prints the bill title under a row",
  (s) => s.replace("return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '');",
    "return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '') || String(item.title || '');"),
  /prints its bill title/);
mut("a renderer that prints the mapping rationale under a row",
  (s) => s.replace("return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '');",
    "var _mm = (item.issues || []).filter(function (x) { return x && x.issueKey === issueKey; })[0]; return (_mm && _mm.rationale) || _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '');"),
  /prints a mapping rationale|method sentence/);

const mutFaults = [];
for (const m of MUTANTS) {
  const src = m.edit(CONS);
  if (src === CONS) { mutFaults.push(`mutation "${m.name}": anchor not found`); continue; }
  const res = check(src, m.line ? relined(m.line[0], m.line[1]) : LEDGER, { pids: TARGET, base: baseT });
  const caught = res.faults.some((x) => m.expect.test(x));
  console.log(`   mutation: ${m.name} → ${caught ? "caught" : "NOT CAUGHT"}`);
  if (!caught) mutFaults.push(`mutation "${m.name}" survived${res.faults.length ? ` (faults: ${res.faults.slice(0, 2).join(" | ")})` : ""}`);
}

const all = live.faults.concat(mutFaults);
if (all.length) {
  for (const f of all.slice(0, 40)) console.error("  ✗ " + f);
  if (all.length > 40) console.error(`  … and ${all.length - 40} more`);
  console.error(`\n✗ fiscal effect lines: ${all.length} failure(s), ${live.pass} passed`);
  process.exit(1);
}
console.log(`\n   ${LEDGER.rows.length} lines · ${live.gained} pairs printing on member rows · ${live.drawers} drawers compared`);
console.log(`✓ fiscal effect lines: all ${live.pass} assertions passed, ${MUTANTS.length} mutations caught`);
