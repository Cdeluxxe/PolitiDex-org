#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-blank-rows-slice6.mjs — blank rows slice 6: the next highest-volume
// pairs that printed nothing under their rows now say what the act did
// ─────────────────────────────────────────────────────────────────────────────
// db/vr-blank-rows-slice6.json records fifteen pairs on eight acts — the 2026
// farm bill, the Gulf of America and MEGOBARI acts, two FY2026 defense
// amendments, the GENIUS Act, the Rescissions Act and the Social Security
// Fairness Act — and the one line each now carries in _DOS_EFFECT under the
// BLANK ROWS SLICE 6 marker, written from that pair's own stored text.
//
//   1. THE TABLE: the block holds exactly the recorded pairs, each equal to the
//      record's line; the lines already on these acts are unchanged, and the
//      skipped pairs stay blank, each with its reason.
//   2. THE LINE RULE: one sentence, 140 characters or fewer, ends on its stop,
//      no method word, no summing word, the act as the subject, never the title.
//   3. TENSE AND TALLY: tense follows the stored outcome — enacted reads as done,
//      House-only opens "Would", failed opens "Would have"; every tally a line
//      names is a roll the record and the vote seeds hold, and a line on an act
//      that already carries lines ends on the same roll they do.
//   4. SOURCE: each pair stores no `did`; its rationale is quoted as the cited
//      file stores it; the line carries a term from its own rationale (or the
//      act's stored summary or title), every figure it names is in that stored
//      text or a recorded roll, and it is no sibling's line and carries no
//      sibling's term.
//   5. NOTHING SHIPPED MOVED: every other _DOS_EFFECT line, _DOS_EXEC_EFFECT,
//      _DOS_MECH and _DOS_POINTER are byte-identical to before the slice.
//   6. THE DRAWERS, LIVE-SHAPED: the acts' rows are rebuilt from the vote seeds
//      with every mapping the record holds. Each pair printed nothing before and
//      prints its line now, its "Also on" chips are the act's other stored issues
//      and never the one being read; with those rows set aside every drawer is
//      byte-identical, and no row prints a bill title, a rationale or a method
//      sentence.
//   7. MUTATIONS: an over-long line, a second sentence, a method word, a summed
//      figure, each wrong tense, a tally no roll holds, a figure not in the
//      source, a sibling's line, a rewritten shipped line, an edited rationale, a
//      line on a skipped pair, a chip for the issue being read, and two renderers
//      — the title under a row, the rationale under a row — must each fail.
//
//   node scripts/test-blank-rows-slice6.mjs

import { readFileSync, readdirSync } from "node:fs";
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
const MARK = "    // BLANK ROWS SLICE 6 (v366).";
const VERSION = 366;
const LEDGER = JSON.parse(R("db/vr-blank-rows-slice6.json"));
const ACTS = Object.keys(LEDGER.acts);
// The tables as they stood before this slice: "key\tline" in table order for the
// two line tables (a later slice's own block is that slice's to pin), the source
// text for the two no slice writes to.
const PIN = {
  _DOS_EFFECT: { n: 318, sha: "cabac996c0d7c9ef7d30cc21572b80429f5ccc459e9cee7d00dff298bc781f03" },
  _DOS_EXEC_EFFECT: { n: 54, sha: "64622bc283ed0c7a80ca2e0319e32e42da247ae7867954b3c0b75c1d7c8e9fea" },
  _DOS_MECH: "11a995d45af07637efe7e1bc1625efa27fb37c26d0718a1af1fdde654e5579a3",
  _DOS_POINTER: "cb4fcb1652dc2e45af694a7c63c8831c62e08715b201bcfde24adaadfce909e4",
};
const METHOD = /\b(?:precedent|mirror|discriminator|primary|secondary|on-axis|off-axis|vocabulary|coded|coding|chip|mapped|mapping|filed|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger|leaf|yea|nay|tagged|aligning with|symbolic)\b|PolitiDex|…|\.\.\./i;
const SUMMED = /\b(?:combined|in total|totall?ing|altogether|all told|net worth|summed|sum of|together with|overall|aggregate)\b/i;
const OPENS = /^(?:Would (?:have )?[a-z]+|[A-Z][a-z]+ed|Became|Set|Cut|Put|Made|Kept|Took|Let|Paired)\b/;

const sha = (s) => createHash("sha256").update(s).digest("hex");
const norm = (x) => String(x == null ? "" : x).replace(/\s+/g, " ").trim();
const low = (x) => norm(x).toLowerCase();
const dec = (h) => String(h || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
const figs = (s) => new Set(String(s || "").match(/\d[\d,.]*\d|\d/g) || []);
const tallies = (s) => [...String(s || "").matchAll(/\b(\d+)-(\d+)\b/g)].map((m) => `${m[1]}-${m[2]}`);

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

// ── the rolls the vote seeds hold for each act ──────────────────────────────
const SEED = (() => {
  const t = {};
  for (const f of readdirSync(join(ROOT, "db")).filter((x) => /^vr-.*seed.*\.json$/.test(x)).sort()) {
    let j; try { j = JSON.parse(R(`db/${f}`)); } catch { continue; }
    for (const v of j.votes || []) {
      const num = norm(typeof v.measure === "string" ? v.measure : v.measure && v.measure.number);
      const cong = (v.measure && v.measure.congress) || v.congress || j.congress;
      const act = `${num}|${cong}`;
      if (!ACTS.includes(act) || v.rollNumber == null) continue;
      let tl = null;
      if (v.totals && v.totals.yea != null) tl = [v.totals.yea, v.totals.nay];
      else if (v.partyTotals) {
        const P = Object.values(v.partyTotals);
        if (P.length) tl = [P.reduce((n, p) => n + p.yea, 0), P.reduce((n, p) => n + p.nay, 0)];
      }
      const ch = v.chamber || (v.measure && v.measure.chamber) || j.chamber;
      (t[act] = t[act] || []).push({ file: f, ch, roll: v.rollNumber, tl, vote: v });
    }
  }
  return t;
})();

// ── live-shaped rows: every row on the slice's acts, rebuilt from the vote ───
// seeds with every mapping the record holds (several acts are not in the seed's
// mapping table, so the offline corpus drops or thins their rows).
const corpus = buildCorpus(ROOT);
const titleOf = {};
for (const recs of corpus.byMember.values()) for (const it of recs) if (ACTS.includes(it.measureId) && !titleOf[it.measureId]) titleOf[it.measureId] = it.title;
for (const a of ACTS) if (!titleOf[a]) titleOf[a] = LEDGER.acts[a].title;
const LIVE = new Map();
{
  const seen = new Set();
  for (const act of ACTS) {
    const [number, congress] = act.split("|");
    for (const { ch, roll, vote: v } of SEED[act] || []) {
      for (const c of v.memberVotes || []) {
        const id = `${act}|${ch}|${roll}|${c.politicianId}`;
        if (!c.politicianId || !c.position || seen.has(id)) continue;
        seen.add(id);
        const q = String(v.question || "").toLowerCase();
        const mt = (v.measure && v.measure.measureType) || v.measureType || (/Amdt/.test(number) ? "amendment" : /Res\./.test(number) ? "resolution" : "bill");
        LIVE.set(c.politicianId, (LIVE.get(c.politicianId) || []).concat([{
          kind: "vote", measureId: act, measureType: mt, number, title: titleOf[act], chamber: ch, status: "",
          date: v.voteDate ? new Date(v.voteDate).toISOString() : null, action: v.question || null,
          actionType: v.actionType || (mt === "amendment" ? "amendment" : "passage"), position: c.position,
          result: v.result || null, isParty: c.isParty || null, supports: null,
          isProcedural: false, advanceInverted: q.includes("recommit") || q.includes("to table"),
          isAmendment: mt === "amendment", parentMeasureId: null,
          rollcallId: Number(roll), congress: Number(congress), session: v.session || 1, rollNumber: Number(roll),
          issues: LEDGER.acts[act].issues.map((i) => ({ ...i })),
          source: { url: v.sourceUrl || "", label: v.sourceLabel || "" },
        }]));
      }
    }
  }
}
const records = new Map();
for (const pid of new Set([...corpus.byMember.keys(), ...LIVE.keys()])) {
  records.set(pid, (corpus.byMember.get(pid) || []).filter((it) => !ACTS.includes(it.measureId)).concat(LIVE.get(pid) || []));
}
const holders = [...LIVE.keys()];
function boot(src) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(f === "consistency.js" ? src : R(f), ctx, { filename: f }); } catch (e) { win.__err = `${f}: ${e.message}`; }
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, list] of records) {
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
        const act = num && typeof it.congress === "number" ? `${num}|${it.congress}` : "";
        rows.push({
          i, act, pair: act ? `${act}|${k}` : "", eff: effs.get(i) || "", rel: rels.get(i) || null, title: norm(it.title),
          rationales: (it.issues || []).map((x) => norm(x && x.rationale)).filter(Boolean),
          stored: [...new Set((it.issues || []).map((x) => x && x.issueKey).filter(Boolean))],
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
  ok(block.length > 0, "the slice 6 block is not in _DOS_EFFECT");
  ok(ledger.rows.length === 15 && ledger.lines === 15, `${ledger.rows.length} rows in the record — the slice wrote 15 pairs`);
  ok(block.length === NEW.size && block.every((k) => NEW.has(k)), `the block holds ${JSON.stringify(block.filter((k) => !NEW.has(k)))} outside the record, or misses some of its pairs`);
  // A pair skipped here may be written by a later slice once what held it back
  // is gone (slice 8 wrote the three the migration projection hid); its line is
  // that slice's to hold.
  const laterE = keysAfter(src, "_DOS_EFFECT", VERSION);
  for (const sk of ledger.skipped || []) {
    ok((!(sk.key in E.map) || laterE.has(sk.key)) && !NEW.has(sk.key), `${sk.key}: a skipped pair carries a line`);
    ok(norm(sk.why).length > 30 && sk.members > 0, `${sk.key}: skipped with no reason or volume`);
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
    ok(t && sha(t.text) === PIN[name], `${name} is not byte-identical to before the slice`);
  }

  // ── 2–4 · line by line ────────────────────────────────────────────────────
  for (const row of ledger.rows) {
    const k = row.key, s = lineOf(k), act = row.act, a = ledger.acts[act];
    ok(!!a && k === `${act}|${row.issue}`, `${k}: the record's identity fields do not spell its key`);
    if (!a) continue;
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
    for (const t of [titleOf[act], a.title]) ok(!t || (low(s) !== low(t) && !low(s).includes(low(t).replace(/[.!?]$/, ""))), `${k}: the line is the act's title`);
    // 3 · tense and tally
    const st = a.status;
    if (st === "enacted") ok(!/^(?:Would|Proposed)\b/.test(s), `${k}: an enacted act is written as though it did not take effect`);
    else if (st === "failed") ok(/^Would have\b/.test(s), `${k}: a failed act must open "Would have"`);
    else ok(/^Would (?!have\b)/.test(s), `${k}: an act that passed one chamber must open "Would", never "Would have" or as done`);
    const rolls = new Set(a.rolls.map((r) => `${r.yea}-${r.nay}`));
    for (const t of tallies(s)) ok(rolls.has(t), `${k}: the tally ${t} is no roll the record holds`);
    for (const r of a.rolls) for (const h of (SEED[act] || []).filter((x) => x.ch === r.chamber && Number(x.roll) === r.roll && x.tl)) {
      ok(h.tl[0] === r.yea && h.tl[1] === r.nay, `${act}: ${h.file} counts ${r.chamber} roll ${r.roll} ${h.tl.join("-")}, the record ${r.yea}-${r.nay}`);
    }
    const sibLines = Object.entries(E.map).filter(([j]) => j !== k && j.startsWith(act + "|") && !NEW.has(j));
    if (sibLines.length) {
      const tail = s.includes(";") ? s.slice(s.lastIndexOf(";")) : "";
      ok(sibLines.some(([, v]) => v.endsWith(tail) && tail), `${k}: does not end on the roll the act's other lines use`);
    }
    // 4 · source
    const mapping = a.issues.find((i) => i.issueKey === row.issue);
    ok(!!mapping && norm(mapping.rationale) === norm(row.rationale), `${k}: the quoted rationale is not the mapping's`);
    let file = ""; try { file = /^(?:netlify\/database\/migrations\/[^/]+\.sql|db\/[^/]+\.json)$/.test(row.rationaleAt) ? R(row.rationaleAt) : ""; } catch { file = ""; }
    const inFile = file && (file.replace(/''/g, "'").includes(row.rationale) || file.includes(JSON.stringify(row.rationale).slice(1, -1)));
    ok(!!inFile, `${k}: ${row.rationaleAt} does not hold the quoted rationale`);
    const own = row.termIn === "rationale" ? row.rationale : row.termIn === "summary" ? a.summary : row.termIn === "title" ? a.title : "";
    const term = norm(row.term);
    ok(term.length >= 8 && low(own).includes(low(term)), `${k}: the term "${term}" is not in its own ${row.termIn}`);
    ok(low(s).includes(low(term)), `${k}: the line does not carry its source term "${term}"`);
    const srcFigs = figs([row.rationale, a.summary, a.title].join(" "));
    for (const f of figs(s.replace(/\b\d+-\d+\b/g, ""))) ok(srcFigs.has(f), `${k}: the figure "${f}" is not in this pair's own stored text`);
    for (const [j, w] of Object.entries(E.map)) {
      if (j === k || !j.startsWith(act + "|")) continue;
      ok(norm(w) !== s, `${k}: borrowed from ${j}`);
      ok(!low(w).includes(low(term)), `${k}: its term "${term}" is ${j}'s line`);
    }
    const body = s.split(";")[0].replace(/[.!?]$/, "");
    for (const i of a.issues) {
      if (i.issueKey === row.issue) continue;
      ok(!low(i.rationale).includes(low(body)), `${k}: borrowed from ${act}|${i.issueKey}'s rationale`);
      const did = M.map[`${act}|${i.issueKey}`] && M.map[`${act}|${i.issueKey}`].did;
      ok(!low(did).includes(low(body)), `${k}: borrowed from ${act}|${i.issueKey}'s did`);
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
        const want = r.stored.filter((x) => x !== view.k);
        if (want.length) ok(!!r.rel && JSON.stringify(r.rel) === JSON.stringify(want), `${dk}: ${r.pair}'s Also on chips are ${JSON.stringify(r.rel)}, stored ${JSON.stringify(want)}`);
        else ok(!r.rel, `${dk}: ${r.pair} is stored on one issue and prints chips`);
        ok(!(r.rel || []).includes(view.k), `${dk}: ${r.pair} shows a chip for the issue being read`);
      }
    }
  }
  for (const k of NEW) {
    const act = k.split("|").slice(0, 2).join("|");
    // An act the offline vote seeds hold no member votes on cannot be rendered
    // here; the record must say so, and the seeds must really be empty for it.
    if (!(SEED[act] || []).some((x) => (x.vote.memberVotes || []).length)) {
      ok(ledger.acts[act] && ledger.acts[act].noSeedRows === true && norm(ledger.acts[act].noSeedRowsWhy).length > 30, `${k}: no seed rows to render and the record does not say so`);
      continue;
    }
    ok(!(ledger.acts[act] && ledger.acts[act].noSeedRows), `${act}: the record says the seeds hold no rows, and they do`);
    ok(gained.has(k), `${k}: no member row prints it`);
  }
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
if (baseAll.err) { console.error(`✗ blank rows slice 6: boot before the slice: ${baseAll.err}`); process.exit(2); }
console.log(`  · ${holders.length} members carry rows on the slice's ${ACTS.length} acts, rebuilt with every stored mapping`);
const live = check(CONS, LEDGER, { base: baseAll });

// ── 7 · mutations ───────────────────────────────────────────────────────────
const baseH = render(BEFORE, holders);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const swap = (pair, line) => (s) => s.replace(new RegExp(`('${esc(pair)}':\\n\\s+)'(?:[^'\\\\]|\\\\.)+'`), (_, h) => h + "'" + line.replace(/'/g, "\\'") + "'");
const relined = (k, line) => ({ ...LEDGER, rows: LEDGER.rows.map((r) => (r.key === k ? { ...r, line } : r)) });
const MUTANTS = [];
const L = (k, line, name, expect) => MUTANTS.push({ name, edit: swap(k, line), expect, line: [k, line] });
L("H.R. 7567|119|rural_ag", "Would reauthorize farm commodity programs, crop insurance and reference prices for every producer in every state; the House passed it 224-200.",
  "a line over 140 characters", /characters/);
L("H.R. 7567|119|family_support", "Would reauthorize SNAP and nutrition programs. They are the largest share of farm-bill spending; the House passed it 224-200.",
  "a second sentence", /more than one sentence/);
L("S. 1582|119|tech_innovation", "Established a national framework for digital-asset innovation, a primary reading; the House cleared it 308-122, the Senate 68-30.",
  "a method word", /method word/);
L("H.R. 4|119|gov_services", "Cut funding for public-media and international programs combined; the House cleared it 214-212, the Senate 51-48.",
  "a summed figure", /summed or combined/);
L("H.R. 82|118|cost_living", "Would increase monthly retirement income for affected teachers, firefighters, police and other public workers.",
  "an enacted act written as pending", /enacted act is written as though it did not/);
L("H.Amdt. 97|119|lands_preserve", "Barred Endangered Species Act critical-habitat designation on military and some Guard lands; the House rejected it 200-228.",
  "a failed amendment written as done", /must open "Would have"/);
L("H.R. 276|119|america_first", "Renamed the Gulf of Mexico the Gulf of America in federal law, locking in the executive order; the House passed it 211-206.",
  "a House-only bill written as law", /passed one chamber must open "Would"/);
L("H.R. 36|119|foreign_balance", "Would require sanctions on Georgian officials found to block Georgia’s Euro-Atlantic integration; the House passed it 350-42.",
  "a tally no roll holds", /is no roll the record holds/);
L("S. 1582|119|tech_innovation", "Established a national framework for digital-asset innovation for issuers above $50 billion; the House cleared it 308-122, the Senate 68-30.",
  "a figure not in the source", /figure "50" is not/);
L("H.R. 4|119|audit_spending", "Ended federal funding for NPR and PBS member stations; the House cleared it 214-212, the Senate 51-48.",
  "a sibling's line", /borrowed from|its term|does not carry its source term/);
MUTANTS.push({ name: "a shipped line rewritten",
  edit: swap("H.R. 4|119|gov_waste", "Returned about $9 billion to the Treasury; the House cleared it 214-212, the Senate 51-48."),
  expect: /shipped _DOS_EFFECT line/ });
MUTANTS.push({ name: "an edited rationale", edit: (s) => s,
  ledger: { ...LEDGER, rows: LEDGER.rows.map((r) => (r.key === "H.R. 82|118|cost_living" ? { ...r, rationale: r.rationale.replace("teachers", "nurses") } : r)) },
  expect: /does not hold the quoted rationale|is not the mapping's/ });
MUTANTS.push({ name: "a line on a skipped pair",
  edit: (s) => s.replace(MARK, "    'H.R. 82|118|national_debt':\n      'Added about $196 billion to federal deficits over a decade.',\n" + MARK),
  expect: /a skipped pair carries a line|shipped _DOS_EFFECT line/ });
MUTANTS.push({ name: "a chip for the issue being read",
  edit: (s) => s.replace("if (!k || k === issueKey || seen[k] || !_DOS_REL_KEY.test(k)) continue;", "if (!k || seen[k] || !_DOS_REL_KEY.test(k)) continue;"),
  expect: /chip for the issue being read|Also on chips are|stored on one issue and prints chips/ });
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
  console.error(`\n✗ blank rows slice 6: ${all.length} failure(s), ${live.pass} passed`);
  process.exit(1);
}
console.log(`\n   ${LEDGER.rows.length} lines · ${live.gained} pairs printing on member rows · ${live.drawers} drawers compared`);
console.log(`✓ blank rows slice 6: all ${live.pass} assertions passed, ${MUTANTS.length} mutations caught`);
