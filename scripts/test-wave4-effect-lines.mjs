#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-wave4-effect-lines.mjs — wave 4 of full coverage: a row with no stored
// description speaks only where its own title states an effect
// ─────────────────────────────────────────────────────────────────────────────
// After wave 3, 31 member-voted measure-and-issue pairs stored no description
// anywhere and printed no line. db/vr-title-effect-lines.json records the read
// of each pair's own stored title: sixteen state an effect on the leaf and carry
// a line in _DOS_EFFECT under the WAVE 4 marker; fifteen do not and stay blank,
// each with the reason.
//
//   1. SOURCE: every new line carries a term from its own stored title, and the
//      title is more than the measure's bare number. It is no other leaf's line
//      or stored description for the same act, and the pair stores no `did`.
//   2. TALLY: it ends on the one roll the vote seeds hold for the act.
//   3. TENSE: a failed act opens "Proposed" or "Would have"; an act carries as
//      done only with a public law on file or a cited record putting its text in
//      public law; anything else that carried opens "Would".
//   4. THE LINE RULE: one sentence, 140 characters or fewer, no method words,
//      never the title itself.
//   5. IDENTITY: every key in the table names a sitting, never "|null|".
//   6. REFUSALS: each refused pair has a reason, has no line, and its rows print
//      nothing; the rows that stay mute are exactly the refused pairs' rows, and
//      no description-backed row is mute.
//   7. NOTHING SHIPPED MOVED: HEAD's lines are unchanged, _DOS_MECH,
//      _DOS_EXEC_EFFECT and _DOS_POINTER are byte-identical, and every effect
//      paragraph and pointer printed at HEAD prints the same now.
//   8. MUTATIONS: a borrowed line, a failed act written as done, a one-chamber
//      bill written as law, an enacted amendment written as pending, a changed
//      tally, a line missing its title's term, a line on a refused row, a line
//      from a bare-number title, an over-long line, a method word, a null
//      sitting, a rewritten wave-3 line and an edited pointer must each fail.
//
//   node scripts/test-wave4-effect-lines.mjs

import { readFileSync, readdirSync } from "node:fs";
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
const MARK = "// WAVE 4 OF FULL COVERAGE (v323)";
const LEDGER = JSON.parse(R("db/vr-title-effect-lines.json"));
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary|coded|coding|chip|mapped|mapping|filed as|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger)\b|PolitiDex|…|\.\.\./i;
const BARE = /^(?:H\.R\.|S\.|H\.J\.Res\.|S\.J\.Res\.|H\.Con\.Res\.|S\.Con\.Res\.|H\.Res\.|S\.Res\.|H\.Amdt\.|S\.Amdt\.)\s*\d+$/;

// Every recorded roll, by (number, congress): [{ch, roll, tl, res}].
const ROLLS = (() => {
  const t = {};
  for (const f of readdirSync(join(ROOT, "db")).filter((x) => x.endsWith(".json")).sort()) {
    let j; try { j = JSON.parse(R(`db/${f}`)); } catch { continue; }
    for (const v of j.votes || []) {
      const num = typeof v.measure === "string" ? v.measure : v.measure && v.measure.number;
      if (!num || v.rollNumber == null || !v.chamber) continue;
      let tl = null;
      if (v.totals && v.totals.yea != null) tl = [v.totals.yea, v.totals.nay];
      else if (v.partyTotals) {
        const P = Object.values(v.partyTotals);
        if (P.length) tl = [P.reduce((n, p) => n + p.yea, 0), P.reduce((n, p) => n + p.nay, 0)];
      }
      if (!tl) continue;
      const a = (t[`${num}|${v.congress}`] = t[`${num}|${v.congress}`] || {});
      const k = `${v.chamber}|${v.rollNumber}`;
      if (!a[k] || (v.totals && v.totals.yea != null)) a[k] = { ch: v.chamber, roll: v.rollNumber, tl, res: String(v.result || (a[k] && a[k].res) || "") };
      else if (!a[k].res && v.result) a[k].res = String(v.result);
    }
  }
  return t;
})();
const ENACTED = new Set();
for (const m of JSON.parse(R("db/vr-measure-identity.json")).measures || []) {
  if (m && (m.laws || []).length) ENACTED.add(`${String(m.number).trim()}|${m.congress}`);
}
// A cited record counts only if its quoted words are really in the cited file.
const citedLaw = (row) => {
  const m = /^(db\/[^:]+): (.+)$/.exec(String(row.enactedPer || ""));
  if (!m) return false;
  let txt = ""; try { txt = R(m[1]); } catch { return false; }
  return txt.includes(m[2]) && /Public Law|P\.L\./.test(m[2]) && txt.includes(row.number);
};

const corpus = buildCorpus(ROOT);
const headSrc = (() => {
  try { return execFileSync("git", ["show", "HEAD:consistency.js"], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
})();
function mapOf(src, name) {
  const at = src.indexOf(`var ${name} = {`);
  if (at < 0) return null;
  const end = src.indexOf("\n  };", at);
  return { text: src.slice(at, end + 4), map: vm.runInNewContext("(" + src.slice(at + `var ${name} = `.length, end + 4) + ")") };
}
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
const dec = (h) => String(h || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
const norm = (x) => String(x || "").replace(/\s+/g, " ").trim();
const low = (x) => norm(x).toLowerCase();
const rowRule = (raw) => {
  const s = norm(raw);
  if (!s || s.length > 140 || !/[.!?]$/.test(s)) return "";
  if (/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "";
  return s;
};
const pairOf = (it, k) => {
  const num = String(it.number == null ? "" : it.number).trim();
  const sit = typeof it.congress === "number" ? it.congress : (it.measureIdent && it.measureIdent.session) || "";
  return `${num}|${sit}|${k}`;
};

// One line against its own pair's title and outcome.
function lineFault(row, v, E, M, title) {
  const s = norm(v), k = row.key;
  if (!s) return "no line is stored";
  if (s.length > 140) return `${s.length} characters`;
  if (!/[.!?]$/.test(s)) return "does not end on a stop";
  if (/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "more than one sentence";
  const mw = s.match(METHOD);
  if (mw) return `method word: ${mw[0]}`;
  const [num, cong] = k.split("|"), act = `${num}|${cong}`;
  if (!/^\d+$/.test(cong)) return `the sitting "${cong}" is not a congress`;
  if (M[k] && norm(M[k].did)) return "the pair stores a did, so a title is not its source";
  const t = norm(title);
  if (!t || BARE.test(t)) return "the title is a bare number and states no effect";
  if (low(s.replace(/[.!?]$/, "")) === low(t)) return "the line is the measure's title";
  const term = norm(row.term);
  if (!term || BARE.test(term) || low(term) === low(num)) return "the term is only the measure's number";
  if (!low(t).includes(low(term))) return `the term "${term}" is not in this pair's own title`;
  if (!low(s).includes(low(term))) return `the line does not carry its title term "${term}"`;
  for (const [j, w] of Object.entries(E)) if (j !== k && j.startsWith(act + "|") && norm(w) === s) return `borrowed from ${j}`;
  for (const [j, m] of Object.entries(M)) if (j !== k && j.startsWith(act + "|") && m && m.did && norm(m.did).includes(s.replace(/[.!?]$/, ""))) return `borrowed from ${j}'s stored did`;
  const rolls = Object.values(ROLLS[act] || {});
  if (rolls.length !== 1) return `the vote seeds hold ${rolls.length} rolls for the act, not one`;
  const [{ ch, tl: [a, b], res }] = rolls;
  const lost = /^(?:failed|rejected|not_agreed)/i.test(res) || (!res && a < b);
  const done = ENACTED.has(act) || citedLaw(row);
  if (lost && !/^(?:Proposed|Would have)\b/.test(s)) return "a failed act is written as though it took effect";
  if (!lost && done && /^(?:Would|Proposed)\b/.test(s)) return "an act that took effect is written as though it did not";
  if (!lost && !done && !/^Would\b/.test(s)) return "an act that never became law is written as though it took effect";
  const C = ch === "house" ? "House" : "Senate";
  const isAmdt = /Amdt\./.test(num);
  const tail = lost ? `; the ${C} rejected it ${a}-${b}.` : isAmdt ? `; the ${C} agreed to it ${a}-${b}.` : `; the ${C} passed it ${a}-${b}.`;
  return s.endsWith(tail) ? "" : `does not end on the recorded tally (${tail.slice(2)})`;
}

function check(src, ledger, base) {
  const faults = [];
  let pass = 0;
  const ok = (c, m) => { if (c) pass++; else faults.push(m); };
  const E = mapOf(src, "_DOS_EFFECT"), X = mapOf(src, "_DOS_EXEC_EFFECT"), M = mapOf(src, "_DOS_MECH"), P = mapOf(src, "_DOS_POINTER");
  const empty = { faults: ["effect maps not found in consistency.js"], pass, printed: new Map(), ptrs: new Map(), mute: 0 };
  if (!E || !X || !M || !P) return empty;
  const win = boot(src);
  if (win.__err) return { ...empty, faults: [`boot: ${win.__err}`] };
  const CS = win.PDXConsistency;
  const rowsByKey = new Map(ledger.rows.map((r) => [r.key, r]));

  // ── 5 · identity ───────────────────────────────────────────────────────────
  for (const k of Object.keys(E.map)) {
    ok(/^[^|]+\|(?:\d+|\d{4}[A-Z0-9]+)\|[a-z0-9_]+$/.test(k) && !/\|(?:null|undefined)\|/.test(k), `${k}: a line keyed without a real sitting`);
  }

  // ── 6 · rendered, on every leaf a row can sit on ──────────────────────────
  const leaves = new Set([...Object.keys(M.map), ...Object.keys(P.map), ...ledger.rows.map((r) => r.key)].map((k) => k.split("|")[2]));
  const printed = new Map(), ptrs = new Map(), titles = new Map(), seen = new Set();
  let mute = 0;
  for (const pid of Object.keys(win.CMP_DATA)) {
    for (const k of leaves) {
      let items = [], html = "";
      try { items = CS.dossierItems(pid, k) || []; } catch { continue; }
      if (!items.length) continue;
      try { html = CS.dossierLedgerHtml(pid, k) || ""; } catch { html = ""; }
      const effs = new Map(), prs = new Map();
      for (const m of html.matchAll(/<tr class="pdxlg-effr" data-pdxlg-effr="(\d+)">([\s\S]*?)<\/tr>/g)) effs.set(Number(m[1]), (effs.get(Number(m[1])) || []).concat(dec(m[2])));
      for (const m of html.matchAll(/<tr class="pdxlg-ptrr" data-pdxlg-ptrr="(\d+)">([\s\S]*?)<\/tr>/g)) prs.set(Number(m[1]), dec(m[2]));
      for (const m of html.matchAll(/<tr data-pdxlg-row="(\d+)">/g)) {
        const i = Number(m[1]), d = items[i], it = (d && d.item) || {};
        if (!d || d.lane === "exec" || !String(it.number || "").trim()) continue;
        const pair = pairOf(it, k), got = effs.get(i) || [];
        seen.add(pair);
        if (!titles.has(pair)) titles.set(pair, norm(it.title));
        if (got.length) printed.set(`${pid}|${pair}`, got[0]);
        if (prs.has(i)) ptrs.set(`${pid}|${pair}`, prs.get(i));
        const did = norm(M.map[pair] && M.map[pair].did);
        const silent = !got.length && !prs.has(i);
        if (silent) {
          mute++;
          ok(!did, `${pid} × ${k}: ${pair} stores a description and is mute`);
          ok(rowsByKey.has(pair) && rowsByKey.get(pair).decision === "refuse", `${pid} × ${k}: ${pair} is mute and the title ledger does not record why`);
        }
        const row = rowsByKey.get(pair);
        if (row && row.decision === "refuse") ok(!got.length, `${pid} × ${k}: ${pair} is a refused row and prints ${JSON.stringify(got[0])}`);
        if (row && row.decision === "line") ok(got.length === 1 && got[0] === norm(E.map[pair]), `${pid} × ${k}: ${pair} prints ${JSON.stringify(got)}, stored ${JSON.stringify(E.map[pair] || "")}`);
      }
    }
  }

  // ── 1–4, 6 · the ledger, row by row ───────────────────────────────────────
  const block = (() => {
    const a = src.indexOf(MARK);
    if (a < 0) return [];
    const end = src.indexOf("\n  };", a), next = src.indexOf("\n    // WAVE ", a + MARK.length);
    return [...src.slice(a, next > 0 && next < end ? next : end).matchAll(/^    '([^']+)':$/gm)].map((m) => m[1]);
  })();
  ok(block.length > 0, "the wave-4 block is not in _DOS_EFFECT");
  ok(ledger.rows.length === 31, `${ledger.rows.length} rows in the title ledger — the pass read 31 pairs`);
  for (const k of block) ok(rowsByKey.has(k) && rowsByKey.get(k).decision === "line", `${k}: a wave-4 line the title ledger does not record`);
  for (const row of ledger.rows) {
    const k = row.key;
    ok(seen.has(k), `${k}: no member row carries this pair`);
    ok(`${row.number}|${row.sitting}|${row.issue}` === k, `${k}: the ledger's identity fields do not spell its key`);
    const title = titles.get(k) || row.title;
    ok(norm(row.title) === norm(title), `${k}: the ledger quotes a title the row does not store`);
    if (row.decision === "line") {
      ok(block.includes(k), `${k}: the line is not in the wave-4 block`);
      ok(norm(row.line) === norm(E.map[k]), `${k}: the ledger line and the stored line differ`);
      const f = lineFault(row, E.map[k], E.map, M.map, title);
      ok(f === "", `${k}: ${f}`);
    } else {
      ok(row.decision === "refuse" && norm(row.why).length > 20, `${k}: a refusal with no reason`);
      ok(!(k in E.map), `${k}: a refused row carries a line — its title does not name the effect`);
    }
  }

  // ── 7 · nothing shipped moved ─────────────────────────────────────────────
  if (headSrc) {
    const HE = mapOf(headSrc, "_DOS_EFFECT");
    for (const [p, v] of Object.entries(HE.map)) ok(E.map[p] === v, `${p}: a shipped line was rewritten or removed`);
    for (const k of Object.keys(E.map)) ok(k in HE.map || block.includes(k), `${k}: a new line outside the wave-4 block`);
    for (const name of ["_DOS_MECH", "_DOS_EXEC_EFFECT", "_DOS_POINTER"]) {
      ok(mapOf(src, name).text === mapOf(headSrc, name).text, `${name} is not byte-identical to HEAD`);
    }
    if (base) {
      for (const [r, v] of base.printed) ok(printed.get(r) === v, `${r}: printed ${JSON.stringify(v)} at HEAD and now prints ${JSON.stringify(printed.get(r) || "")}`);
      for (const [r, v] of base.ptrs) ok(ptrs.get(r) === v, `${r}: the pointer printed ${JSON.stringify(v)} at HEAD and now prints ${JSON.stringify(ptrs.get(r) || "")}`);
    }
  } else {
    console.log("   (no git baseline — the unchanged-lines check did not run)");
  }
  return { faults, pass, printed, ptrs, mute };
}

const CONS = R("consistency.js");
const head = headSrc ? check(headSrc, LEDGER, null) : null;
const live = check(CONS, LEDGER, head);

// ── 8 · mutations ───────────────────────────────────────────────────────────
const swap = (pair, line) => (s) => s.replace(new RegExp(`('${pair.replace(/[.|$]/g, "\\$&")}':\\n\\s+)'[^']+'`), (_, h) => h + "'" + line.replace(/'/g, "\\'") + "'");
const flip = (key, patch) => ({ ...LEDGER, rows: LEDGER.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) });
const MUTANTS = [
  { name: "a line borrowed from another leaf for the same act",
    edit: swap("S.Amdt. 14|119|tough_on_crime", "Expanded the offences that trigger mandatory detention under the bill; the Senate agreed to it 70-25."),
    expect: /borrowed from|ledger line and the stored line differ/ },
  { name: "a failed act written as if it took effect",
    edit: swap("S.Amdt. 23|119|state_standing", "Struck the State attorney general cause of action; the Senate rejected it 46-49."),
    expect: /failed act is written as though it took effect/ },
  { name: "a one-chamber bill written as law",
    edit: swap("H.R. 2377|117|gun_safety", "Created a Federal Extreme Risk Protection Order; the House passed it 224-202."),
    expect: /never became law is written as though it took effect/ },
  { name: "an enacted amendment written as pending",
    edit: swap("S.Amdt. 8|119|tough_on_crime", "Would make crimes causing death or serious bodily injury grounds for mandatory detention; the Senate agreed to it 75-24."),
    expect: /took effect is written as though it did not/ },
  { name: "the tally changed",
    edit: swap("H.R. 1808|117|gun_safety", "Would have enacted an Assault Weapons Ban; the House passed it 218-213."),
    expect: /recorded tally/ },
  { name: "a line that drops its title's term",
    edit: swap("S.Amdt. 5463|119|back_police", "Proposed more money for police departments; the Senate rejected it 45-53."),
    expect: /does not carry its title term/ },
  { name: "a line on a row whose title names no effect",
    edit: (s) => s.replace("    'H.R. 1446|117|gun_safety':\n", "    'H.R. 7910|117|gun_safety':\n      'Would have protected kids; the House passed it 223-204.',\n    'H.R. 1446|117|gun_safety':\n"),
    expect: /refused row|title ledger does not record/ },
  { name: "a line written from a bare-number title",
    edit: (s) => s.replace("    'H.R. 1446|117|gun_safety':\n", "    'H.Con.Res. 14|119|cut_spending':\n      'Would set the fiscal 2026 budget blueprint; the House passed it 216-214.',\n    'H.R. 1446|117|gun_safety':\n"),
    ledger: flip("H.Con.Res. 14|119|cut_spending", { decision: "line", term: "H.Con.Res. 14", line: "Would set the fiscal 2026 budget blueprint; the House passed it 216-214." }),
    expect: /bare number/ },
  { name: "a line over 140 characters",
    edit: swap("H.Amdt. 256|119|lgbtq_rights", "Would prohibit male participation in female sports at every Department of Defense Education Activity school worldwide; the House agreed to it 221-203."),
    expect: /characters/ },
  { name: "a method word in a line",
    edit: swap("H.Amdt. 258|119|religious_liberty", "Would codify protections and responsibilities for chaplains, coded as religious liberty; the House agreed to it 221-210."),
    expect: /method word/ },
  { name: "a line keyed to a null sitting",
    edit: (s) => s.replace("    'H.R. 1446|117|gun_safety':\n", "    'H.R. 1446|null|gun_safety':\n      'Would have enhanced background checks; the House passed it 219-210.',\n    'H.R. 1446|117|gun_safety':\n"),
    expect: /without a real sitting/ },
  { name: "one of wave 3's lines rewritten",
    edit: swap("H.R. 5408|119|econ_workers", "Would speed up first union contracts; the House passed it 230-193."),
    expect: /a shipped line was rewritten/ },
  { name: "a pointer edited",
    edit: (s) => s.replace("'S.J.Res. 37|119|econ_trade': ['tariffs_prices'],", "'S.J.Res. 37|119|econ_trade': ['tariffs_prices', 'tariffs_authority'],"),
    expect: /_DOS_POINTER is not byte-identical/ },
];
const mutFaults = [];
for (const m of MUTANTS) {
  const src = m.edit(CONS);
  if (src === CONS) { mutFaults.push(`mutation "${m.name}": anchor not found`); continue; }
  const res = check(src, m.ledger || LEDGER, head);
  const caught = res.faults.some((x) => m.expect.test(x));
  console.log(`   mutation: ${m.name} → ${caught ? "caught" : "NOT CAUGHT"}`);
  if (!caught) mutFaults.push(`mutation "${m.name}" survived`);
}

const all = live.faults.concat(mutFaults);
if (all.length) {
  for (const f of all.slice(0, 40)) console.error("  ✗ " + f);
  if (all.length > 40) console.error(`  … and ${all.length - 40} more`);
  console.error(`\n✗ wave 4 effect lines: ${all.length} failure(s), ${live.pass} passed`);
  process.exit(1);
}
const L = LEDGER.rows.filter((r) => r.decision === "line").length;
console.log(`\n   ${L} lines · ${LEDGER.rows.length - L} refusals · ${live.mute} member rows still mute${head ? ` (${head.mute} at HEAD)` : ""}, every one a recorded refusal`);
console.log(`✓ wave 4 effect lines: all ${live.pass} assertions passed, ${MUTANTS.length} mutations caught`);
