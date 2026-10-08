#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-war-leaf-effect-lines.mjs — one sentence under each vote on the war leaves
// ─────────────────────────────────────────────────────────────────────────────
// War Powers, Iran, Ukraine and Yemen. Each mapped act on those leaves carries
// one line saying what it did to THAT leaf, stored once on the measure-and-issue
// pair in _DOS_EFFECT (members' votes) or _DOS_EXEC_EFFECT (a president's acts),
// so it shows for every member who voted on it. A pair with nothing on file to
// write from stays blank — S.J.Res. 59 on War Powers is the one such pair: it
// reached the leaf by a key split and stores no `did` there.
//
//   1. THE LINE RULE: one sentence, 140 characters or fewer, ends on its stop,
//      no method words, no "PolitiDex", no ellipsis, never the measure's title,
//      and it names its own leaf.
//   2. NOT BORROWED: a line is never another leaf's line for the same act.
//   3. RENDERED, ROW BY ROW, for every member file: a row with a stored line
//      prints that line and no other; a row with nothing stored prints no extra
//      paragraph.
//   4. NOTHING SHIPPED WAS REWRITTEN: every line in HEAD's _DOS_EFFECT is
//      unchanged, and _DOS_EXEC_EFFECT (Trump's lines) is byte-identical.
//   5. COVERAGE: every member-voted pair on the four leaves has a line, except
//      the documented blank.
//   6. MUTATIONS: a title fallback, a borrowed line, an over-long line, a method
//      word and an edited Trump line must each fail the checks above.
//
//   node scripts/test-war-leaf-effect-lines.mjs

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
const KEYS = ["war_powers", "iran_policy", "ukraine_policy", "yemen_policy"];
const NAMES = { war_powers: /War Powers|authoriz/i, iran_policy: /\bIran/, ukraine_policy: /\bUkrain/, yemen_policy: /\bYemen/ };
const BLANK = new Set(["S.J.Res. 59|119|war_powers"]);
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary|coded|coding|chip|mapped|mapping|filed as|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger)\b|PolitiDex|…|\.\.\./i;

const corpus = buildCorpus(ROOT);
const headSrc = (() => {
  try { return execFileSync("git", ["show", "HEAD:consistency.js"], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 }); }
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

// The titles a line must never be: every printed title the site holds for a measure.
const TITLES = (() => {
  const out = new Map();
  const add = (n, t) => { if (!n || !t) return; const k = String(n).trim(); if (!out.has(k)) out.set(k, new Set()); out.get(k).add(String(t).trim().replace(/[.!?]$/, "").toLowerCase()); };
  for (const m of R("bills-index.js").matchAll(/number:\s*'([^']+)',\s*title:\s*'([^']*)'(?:,\s*shortTitle:\s*'([^']*)')?/g)) { add(m[1], m[2]); add(m[1], m[3]); }
  return out;
})();

function check(src) {
  const faults = [];
  let pass = 0;
  const ok = (c, m) => { if (c) pass++; else faults.push(m); };
  const E = mapOf(src, "_DOS_EFFECT"), X = mapOf(src, "_DOS_EXEC_EFFECT");
  if (!E || !X) return { faults: ["effect maps not found in consistency.js"], pass };
  const win = boot(src);
  if (win.__err) return { faults: [`boot: ${win.__err}`], pass };
  const CS = win.PDXConsistency;

  // Titles seen on the rows themselves, too.
  const rowTitles = new Map();
  const seenPairs = new Set();

  // ── 3 · rendered, row by row ─────────────────────────────────────────────
  for (const pid of Object.keys(win.CMP_DATA)) {
    for (const k of KEYS) {
      let items = [], html = "";
      try { items = CS.dossierItems(pid, k) || []; } catch { continue; }
      if (!items.length) continue;
      try { html = CS.dossierLedgerHtml(pid, k) || ""; } catch { html = ""; }
      const effs = new Map();
      for (const m of html.matchAll(/<tr class="pdxlg-effr" data-pdxlg-effr="(\d+)">([\s\S]*?)<\/tr>/g)) {
        const i = Number(m[1]);
        effs.set(i, (effs.get(i) || []).concat(dec(m[2])));
      }
      const rows = [...html.matchAll(/<tr data-pdxlg-row="(\d+)">/g)].map((m) => Number(m[1]));
      for (const i of rows) {
        const d = items[i], it = (d && d.item) || {};
        const got = effs.get(i) || [];
        ok(got.length <= 1, `${pid} × ${k}: row ${d && d.ident} prints ${got.length} effect paragraphs`);
        let pair, want;
        if (d && d.lane === "exec") {
          pair = `${String(it.documentId || "").trim()}|${k}`; want = X.map[pair] || "";
        } else {
          pair = `${String(it.number == null ? "" : it.number).trim()}|${it.congress}|${k}`; want = E.map[pair] || "";
          seenPairs.add(pair);
          for (const t of [it.title, it.shortTitle]) if (t) { if (!rowTitles.has(it.number)) rowTitles.set(it.number, new Set()); rowTitles.get(it.number).add(String(t).trim().replace(/[.!?]$/, "").toLowerCase()); }
        }
        if (want) ok(got.length === 1 && got[0] === want, `${pid} × ${k}: ${pair} prints ${JSON.stringify(got)}, stored ${JSON.stringify(want)}`);
        else ok(got.length === 0, `${pid} × ${k}: ${pair} has nothing stored but prints ${JSON.stringify(got[0])}`);
      }
    }
  }

  // ── 1 & 2 · the line rule, and no borrowing, for every war-leaf line ──────
  const lines = [];
  for (const [p, v] of Object.entries(E.map)) { const m = /^(.*)\|(\d+)\|([a-z_]+)$/.exec(p); if (m) lines.push({ pair: p, act: `${m[1]}|${m[2]}`, num: m[1], key: m[3], v, map: "E" }); }
  for (const [p, v] of Object.entries(X.map)) { const m = /^(.*)\|([a-z_]+)$/.exec(p); if (m) lines.push({ pair: p, act: m[1], num: m[1], key: m[2], v, map: "X" }); }
  for (const L of lines.filter((x) => KEYS.includes(x.key))) {
    const s = String(L.v);
    ok(s.length <= 140, `${L.pair}: ${s.length} characters`);
    ok(/[.!?]$/.test(s), `${L.pair}: does not end on a stop`);
    ok(!/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US")), `${L.pair}: more than one sentence`);
    ok(!METHOD.test(s), `${L.pair}: method word: ${(s.match(METHOD) || [""])[0]}`);
    ok(NAMES[L.key].test(s), `${L.pair}: does not name its leaf`);
    const t = s.replace(/[.!?]$/, "").toLowerCase();
    const titles = new Set([...(TITLES.get(L.num) || []), ...(rowTitles.get(L.num) || [])]);
    ok(!titles.has(t), `${L.pair}: the line is the measure's title`);
    for (const o of lines) {
      if (o === L || o.act !== L.act || o.key === L.key) continue;
      ok(o.v !== L.v, `${L.pair}: the line is borrowed from ${o.pair}`);
    }
  }

  // ── 4 · nothing shipped was rewritten ─────────────────────────────────────
  if (headSrc) {
    const HE = mapOf(headSrc, "_DOS_EFFECT"), HX = mapOf(headSrc, "_DOS_EXEC_EFFECT");
    for (const [p, v] of Object.entries(HE.map)) ok(E.map[p] === v, `${p}: a shipped line was rewritten or removed`);
    ok(X.text === HX.text, "_DOS_EXEC_EFFECT (Trump's lines) is not byte-identical to HEAD");
  } else {
    console.log("   (no git baseline — the unchanged-lines check did not run)");
  }

  // ── 5 · coverage ───────────────────────────────────────────────────────────
  ok(seenPairs.size >= 16, `only ${seenPairs.size} member pairs on the war leaves — fixture thinned out`);
  for (const p of seenPairs) {
    if (BLANK.has(p)) ok(!E.map[p], `${p}: the documented blank now carries a line — move it out of BLANK with its source`);
    else ok(!!E.map[p], `${p}: a member-voted pair on a war leaf has no line`);
  }
  return { faults, pass };
}

const CONS = R("consistency.js");
const live = check(CONS);

// ── 6 · mutations ───────────────────────────────────────────────────────────
const ADD_AT = "    'H.Amdt. 99|119|war_powers':\n";
const add = (pair, line) => (s) => s.replace(ADD_AT, `    '${pair}':\n      '${line.replace(/'/g, "\\'")}',\n` + ADD_AT);
const MUTANTS = [
  { name: "title used as a fallback when nothing is stored",
    edit: (s) => s.replace("return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '');",
      "return _dosEffectOk(_DOS_EFFECT[k] || (mech && mech.did) || '') || String(item.shortTitle || item.title || '');"),
    expect: /has nothing stored but prints/ },
  { name: "the measure's title stored as its line",
    edit: add("S.J.Res. 59|119|war_powers", "Iran War Powers Resolution."),
    expect: /is the measure's title/ },
  { name: "a line borrowed from the Iran leaf",
    edit: (s) => { const m = /'S\.J\.Res\. 59\|119\|iran_policy':\n\s+'([^']+)',/.exec(s); return add("S.J.Res. 59|119|war_powers", m[1])(s); },
    expect: /borrowed from/ },
  { name: "a line over 140 characters",
    edit: (s) => s.replace("the House agreed to it 261-167.'", "the House agreed to it 261-167 on a recorded vote taken on September 10, 2025.'"),
    expect: /characters/ },
  { name: "a method word in a line",
    edit: (s) => s.replace("Added repeal of the 2002", "Coded as repeal of the 2002"),
    expect: /method word/ },
  { name: "one of Trump's lines edited",
    edit: (s) => s.replace("the Senate failed to override it 53-45.',\n    'S.J. Res. 7 (116th Congress)|war_powers'",
      "the Senate failed to override it, 53-45.',\n    'S.J. Res. 7 (116th Congress)|war_powers'"),
    expect: /_DOS_EXEC_EFFECT|prints/ },
];
const mutFaults = [];
for (const m of MUTANTS) {
  const src = m.edit(CONS);
  if (src === CONS) { mutFaults.push(`mutation "${m.name}": anchor not found`); continue; }
  const res = check(src);
  const caught = res.faults.some((x) => m.expect.test(x));
  console.log(`   mutation: ${m.name} → ${caught ? "caught" : "NOT CAUGHT"}`);
  if (!caught) mutFaults.push(`mutation "${m.name}" survived`);
}

const all = live.faults.concat(mutFaults);
if (all.length) {
  for (const f of all.slice(0, 40)) console.error("  ✗ " + f);
  if (all.length > 40) console.error(`  … and ${all.length - 40} more`);
  console.error(`\n✗ war leaf effect lines: ${all.length} failure(s), ${live.pass} passed`);
  process.exit(1);
}
console.log(`\n✓ war leaf effect lines: all ${live.pass} assertions passed, ${MUTANTS.length} mutations caught`);
