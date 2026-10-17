#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-effect-line-audit.mjs — every effect line on four high-traffic issues,
// held to its bill's own text
// ─────────────────────────────────────────────────────────────────────────────
// The provisions audit (v387) read all 48 effect lines printing on Water
// Conservation, Housing Affordability, Protect Public Lands and Expand Domestic
// Energy Production against the bill itself. db/vr-effect-line-audit.json
// records each: nine `rewritten` in place because the shipped line was broader,
// narrower or different from what the bill did, and 39 `kept` byte for byte.
//
//   1. COVERAGE: the ledger holds exactly the lines that print on those issues,
//      once each, and every one prints what the ledger says.
//   2. REWRITES, FROM THE BILL: the shipped line is `was` at HEAD; the new line
//      is stored; one sentence, 140 characters or fewer, no method or sales
//      words; every `terms` phrase is in the bill's quoted words and in the line;
//      every `plain` restatement points at a word the bill uses; every other
//      content word in the line comes from those words or a few effect verbs;
//      the source is GovInfo, Congress.gov or the Utah Legislature; no other
//      pair's line; tense as shipped ("Would" stays "Would", done stays done).
//   3. KEPT LINES are byte-identical to HEAD.
//   4. NOTHING ELSE MOVED: with the nine lines put back and the audit's two
//      comments taken out, consistency.js is HEAD's file byte for byte; every
//      member's drawer on those issues and the CRA siblings' issues renders as
//      at HEAD outside the audited effect rows, so no score, count or Direction
//      Match moved.
//   5. MUTATIONS: a line broader than its bill, a method word, a line borrowed
//      from another issue, a tense flip, a kept line edited and an unaudited
//      line edited must each fail.
//
//   node scripts/test-effect-line-audit.mjs
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
const LEDGER = JSON.parse(R("db/vr-effect-line-audit.json"));
const LEAVES = ["water", "housing", "lands_preserve", "energy_production"];
const ON = new RegExp(`\\|(?:${LEAVES.join("|")})$`);
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary|coded|coding|chip|mapped|mapping|filed as|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger|direction match|pole)\b|PolitiDex|…|\.\.\./i;
const SALES = /\bmembers?(?:hip)?\b|\bstocks?\b|\bpremium\b|\bequity\b/i;
const SOURCE = /^https:\/\/(?:www\.govinfo\.gov\/content\/pkg\/BILLS-|www\.congress\.gov\/amendment\/|le\.utah\.gov\/)/;

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ effect-line audit: STALE HARNESS — ${m}`); process.exit(2); } };
const norm = (x) => String(x || "").replace(/\s+/g, " ").trim();
const low = (x) => norm(x).toLowerCase();

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
// The renderer's row rule, lifted from the file under test.
function rowRule(src) {
  const m = src.match(/var _DOS_EFFECT_METHOD = (\/.+\/[a-z]*);/);
  const RX = m ? vm.runInNewContext(m[1]) : /$^/;
  return (raw) => {
    const s = norm(raw);
    if (!s || s.length > 140 || !/[.!?]$/.test(s)) return "";
    if (/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "";
    return RX.test(s) ? "" : s;
  };
}
// Every line that prints on the four issues: a _DOS_EFFECT line, else a short did.
function printedOn(src) {
  const E = mapOf(src, "_DOS_EFFECT").map, M = mapOf(src, "_DOS_MECH").map, ok1 = rowRule(src);
  const out = new Map();
  for (const k of new Set([...Object.keys(E), ...Object.keys(M)])) {
    if (!ON.test(k)) continue;
    const s = ok1(E[k] || (M[k] && M[k].did) || "");
    if (s) out.set(k, s);
  }
  return out;
}

// ── ONE REWRITE AGAINST ITS BILL ────────────────────────────────────────────
const STOP = new Set(("a an the and or of to for in on by at as with from its it their them that this these " +
  "those who which when where may can before after into under over than more less some any each every one all " +
  "part per is against unless without").split(" "));
const VERBS = new Set(("would have had set let made gave give created extended raised barred bar required imposed " +
  "provided measured restricted authorized struck open reinstated ordered deem letting").split(" "));
const words = (x) => String(x).toLowerCase().replace(/[’']/g, "'").match(/[a-z0-9%]+(?:[-'][a-z0-9]+)*/g) || [];
const stem = (w) => w.replace(/'s$/, "").replace(/ies$/, "y").replace(/(?:ing|ed|es|s)$/, "");
// The words a rewrite may draw on: the bill's quotes, and for a Congressional
// Review Act line the statute's own consequence.
const quoted = (row) => [...(row.quotes || []), ...(row.lawQuotes || [])];
// A tally is the recorded vote, not the bill's text; a rewrite may carry one only
// if the shipped line carried the same one.
const TALLY = /; the (?:House|Senate) [^;]*?\d+-\d+(?:, the Senate \d+-\d+)?\.$/;
const tallyOf = (x) => (norm(x).match(TALLY) || [""])[0];
function uncovered(row, line) {
  const src = new Set(words(quoted(row).join(" ")).map(stem));
  const plain = new Set(Object.keys(row.plain || {}).flatMap((w) => words(w)).map(stem));
  const near = (w) => [...src].some((x) => x.length > 3 && w.length > 3 && (x.startsWith(w) || w.startsWith(x)));
  return words(norm(line).replace(TALLY, ".")).filter((w) => !STOP.has(w) && !STOP.has(stem(w)) && !VERBS.has(w) && !src.has(stem(w)) && !plain.has(stem(w)) && !near(stem(w)));
}
function rewriteFault(row, line, E) {
  const s = norm(line), k = row.key;
  if (!s) return "no line is stored";
  if (s.length > 140) return `${s.length} characters`;
  if (!/[.!?]$/.test(s)) return "does not end on a stop";
  if (/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "more than one sentence";
  const mw = s.match(METHOD);
  if (mw) return `method word: ${mw[0]}`;
  if (SALES.test(s)) return "sales word";
  if (!SOURCE.test(String(row.source))) return "the source is not the bill's own record";
  if (!(row.quotes || []).length || row.quotes.some((q) => norm(q).length < 15)) return "no quoted bill text";
  if ((row.lawQuotes || []).length && !/^https:\/\/www\.law\.cornell\.edu\/uscode\//.test(String(row.lawSource))) return "a statute quote with no U.S. Code source";
  const t = tallyOf(s);
  if (t && t !== tallyOf(row.was)) return `a tally the shipped line did not carry (${t.slice(2)})`;
  const from = low(quoted(row).join(" "));
  if (!(row.terms || []).length) return "no terms tie the line to its bill";
  for (const t of row.terms) {
    if (!low(s).includes(low(t))) return `the line does not carry its bill's term "${t}"`;
    if (!from.includes(low(t)) && !(t in (row.plain || {}))) return `the term "${t}" is not in this bill's quoted words`;
  }
  for (const [w, src] of Object.entries(row.plain || {})) if (!from.includes(low(src))) return `"${w}" restates "${src}", which the quoted text does not say`;
  const extra = uncovered(row, s);
  if (extra.length) return `broader than the bill — words it does not support: ${extra.join(", ")}`;
  if (s === norm(row.was)) return "the rewrite is the shipped line";
  for (const [j, v] of Object.entries(E)) if (j !== k && norm(v) === s) return `borrowed from ${j}`;
  const would = (x) => /^(?:Would|Proposed)\b/.test(norm(x));
  if (would(row.was) !== would(s)) return "the rewrite changes whether the act took effect";
  return "";
}

// ── THE RENDERED DRAWERS ────────────────────────────────────────────────────
const corpus = buildCorpus(ROOT);
const AUDITED = LEDGER.rows.filter((r) => r.decision === "rewritten");
const ACTS = new Set(AUDITED.map((r) => r.key.split("|").slice(0, 2).join("|")));
// Every member carrying a row on an audited act, on the four issues and on the
// other issues those acts sit on (Red Tape, Climate, the CRA siblings).
const PIDS = [...corpus.byMember].filter(([, its]) => its.some((i) => ACTS.has(`${i.number}|${i.congress}`))).map(([p]) => p);
const DRAWERS = [...new Set([...LEAVES, "gov_regulation", "climate_action", "states_federal_power", "cost_living", "strong_defense", "tariffs_prices"])];
function render(src) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(f === "consistency.js" ? src : R(f), ctx, { filename: f }); } catch (e) { return { err: `${f}: ${e.message}` }; }
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) { try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ } }
  const out = new Map();
  for (const pid of PIDS) for (const leaf of DRAWERS) {
    let h = "";
    try { h = win.PDXConsistency.dossierLedgerHtml(pid, leaf) || ""; } catch { h = ""; }
    if (h) out.set(`${pid}|${leaf}`, h);
  }
  return { out };
}
const effRows = (h) => [...String(h).matchAll(/<tr class="pdxlg-effr"[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
const sansEffect = (h) => String(h).replace(/<tr class="pdxlg-effr"[\s\S]*?<\/tr>/g, "");

// The file with the audit undone: the nine lines put back and its two comments out.
function undo(src) {
  let s = src;
  for (const r of AUDITED) s = s.split(`    '${r.key}':\n      '${r.line}',`).join(`    '${r.key}':\n      '${r.was}',`);
  s = s.replace(/\n  \/\/\n  \/\/ A LINE THE BILL DOES NOT SUPPORT IS REWRITTEN IN PLACE\.[\s\S]*?(?=\n  var _DOS_EFFECT = \{)/, "");
  s = s.replace("    // stay silent. S.B. 118 (2023GS) and H.B. 11 (2024GS) were written from their\n    // titles in v385 and rewritten from their provisions in v387. The sitting is\n    // the Utah session.",
    "    // stay silent. S.B. 118 (2023GS) and H.B. 11 (2024GS) keep the lines v385\n    // shipped from their titles, byte for byte. The sitting is the Utah session.");
  return s;
}

let HEAD_RENDER = null;
function check(src, opts) {
  const out = [];
  const need = (c, m) => { if (!c) out.push(m); };
  const E = mapOf(src, "_DOS_EFFECT"), M = mapOf(src, "_DOS_MECH"), X = mapOf(src, "_DOS_EXEC_EFFECT"), P = mapOf(src, "_DOS_POINTER");
  if (!E || !M || !X || !P) return ["effect maps not found in consistency.js"];
  const byKey = new Map(LEDGER.rows.map((r) => [r.key, r]));
  const printed = printedOn(src);

  // 1 · coverage
  need(LEDGER.rows.length === 48 && byKey.size === 48, `${LEDGER.rows.length} ledger rows — the audit read 48 lines`);
  for (const [k, s] of printed) {
    const r = byKey.get(k);
    need(!!r, `${k}: prints on an audited issue and the ledger does not record it`);
    if (r) need(norm(r.line) === s, `${k}: prints ${JSON.stringify(s)}, the ledger says ${JSON.stringify(r.line)}`);
  }
  for (const r of LEDGER.rows) need(printed.has(r.key), `${r.key}: in the ledger but prints nothing`);
  need(AUDITED.length === 9, `${AUDITED.length} rewrites recorded — the audit made 9`);

  const hE = HEAD_SRC ? mapOf(HEAD_SRC, "_DOS_EFFECT").map : null;
  for (const r of LEDGER.rows) {
    if (r.decision === "rewritten") {
      // 2 · a rewrite, from the bill
      need(norm(E.map[r.key]) === norm(r.line), `${r.key}: the stored line is not the audit's rewrite`);
      if (hE) need(hE[r.key] === r.was, `${r.key}: the shipped line HEAD holds is not the ledger's \`was\``);
      need(norm(r.why).length > 40, `${r.key}: a rewrite with no reason`);
      const f = rewriteFault(r, E.map[r.key], E.map);
      need(f === "", `${r.key}: ${f}`);
    } else {
      // 3 · kept, byte for byte
      need(r.decision === "kept" && norm(r.why).length > 20, `${r.key}: kept with no reason`);
      if (hE) {
        const head = hE[r.key] != null ? hE[r.key] : null;
        const now = E.map[r.key] != null ? E.map[r.key] : null;
        need(head === now, `${r.key}: a line that matched its bill was changed`);
      }
    }
  }

  // 4 · nothing else moved
  if (HEAD_SRC) {
    need(undo(src) === HEAD_SRC, "consistency.js moved beyond the nine audited lines and the audit's two comments");
    if (!opts || !opts.skipRender) {
      const now = render(src);
      need(!now.err, `render: ${now.err}`);
      const audited = new Set(AUDITED.map((r) => norm(r.line))), was = new Set(AUDITED.map((r) => norm(r.was)));
      for (const [k, h] of HEAD_RENDER.out) {
        const n = now.out.get(k);
        need(n != null, `${k}: the drawer no longer renders`);
        if (n == null) continue;
        need(sansEffect(n) === sansEffect(h), `${k}: the drawer moved outside its effect rows (a score, count or row changed)`);
        const a = effRows(h), b = effRows(n);
        need(a.length === b.length, `${k}: ${a.length} effect rows at HEAD, ${b.length} now`);
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
          if (a[i] === b[i]) continue;
          const da = norm(a[i].replace(/<[^>]+>/g, "")).replace(/&#39;/g, "'").replace(/&amp;/g, "&");
          const db = norm(b[i].replace(/<[^>]+>/g, "")).replace(/&#39;/g, "'").replace(/&amp;/g, "&");
          need(was.has(da) && audited.has(db), `${k}: an effect row changed that the audit did not rewrite (${JSON.stringify(da.slice(0, 60))})`);
        }
      }
    }
  }
  return out;
}

section("the tree");
{
  must(HEAD_SRC, "git show HEAD:consistency.js failed");
  HEAD_RENDER = render(HEAD_SRC);
  must(!HEAD_RENDER.err, `HEAD render: ${HEAD_RENDER.err}`);
  must(HEAD_RENDER.out.size > 100, `only ${HEAD_RENDER.out.size} drawers rendered at HEAD`);
  const out = check(R("consistency.js"));
  ok(out.length === 0, `the tree:\n      ${out.slice(0, 12).join("\n      ")}`);
  if (!out.length) console.log(`      ✓ 48 lines read, 9 rewritten from the bill, 39 kept; ${HEAD_RENDER.out.size} drawers across ${PIDS.length} members unchanged outside the audited rows`);
  const sw = R("sw.js");
  ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 387 && sw.includes("// v387 - EFFECT LINES CHECKED AGAINST THE BILL."), "the shell moved to v387 or later, with the v387 note");
}

section("mutations");
{
  const SRC = R("consistency.js");
  const row = (k) => AUDITED.find((r) => r.key === k);
  const swapLine = (k, to) => {
    const r = row(k) || LEDGER.rows.find((x) => x.key === k);
    const from = `    '${k}':\n      '${r.line}',`;
    must(SRC.includes(from), `mutation anchor missing for ${k}`);
    return SRC.split(from).join(`    '${k}':\n      '${to}',`);
  };
  const H11 = "H.B. 11|2024GS|water", H26 = "H.R. 26|119|energy_production";
  const muts = [
    ["a line broader than its bill", swapLine(H11, "Restricted the use of overhead spray irrigation by certain governmental entities and every homeowner.")],
    ["the shipped broad line put back", swapLine(H11, "Imposed water efficient landscaping requirements under Utah law.")],
    ["a method word", swapLine(H26, "Would bar the President from declaring a fracking moratorium unless an Act of Congress authorizes it, per the rationale.")],
    ["a line borrowed from another issue", swapLine(H26, mapOf(SRC, "_DOS_EFFECT").map["H.J.Res. 131|119|lands_preserve"])],
    ["a tense flip", swapLine(H26, "Barred the President from declaring a fracking moratorium unless an Act of Congress authorizes it; the House passed it 226-188.")],
    ["a kept line edited", swapLine("H.R. 3684|117|water", "Funded drinking-water and wastewater systems and lead pipe removal; the House cleared it 228-206, the Senate 69-30.")],
    ["an unaudited line on another issue edited", (() => {
      const k = "H.J.Res. 89|119|climate_action", v = mapOf(SRC, "_DOS_EFFECT").map[k];
      must(v, `${k} is not a shipped line`);
      return SRC.split(`    '${k}':\n      '${v}',`).join(`    '${k}':\n      'Struck the EPA waiver for California’s Omnibus Low NOx regulation and barred a substantially similar rule.',`);
    })()],
  ];
  for (const [name, src] of muts) ok(check(src, { skipRender: true }).length > 0, `mutation "${name}" was not caught`);
  console.log(`      ✓ ${muts.length} mutations run`);
}

section("the rewrite rule on its own");
{
  // The same faults judged by rewriteFault alone, so a bad line written into both
  // the table and the ledger is still refused.
  const E = mapOf(R("consistency.js"), "_DOS_EFFECT").map;
  const r = (k) => AUDITED.find((x) => x.key === k);
  const cases = [
    [r("H.B. 11|2024GS|water"), "Restricted the use of overhead spray irrigation by certain governmental entities and every homeowner.", /broader/],
    [r("H.R. 5376|117|energy_production"), "Reinstated Lease Sale 257 and barred wind and solar rights-of-way in the Gulf without recent onshore sales.", /broader/],
    [r("H.R. 1|119|energy_production"), "Required quarterly onshore oil and gas lease sales, at least 30 Gulf lease sales and coal sales, and sped permitting.", /broader/],
    [r("H.J.Res. 89|119|energy_production"), "Struck the EPA waiver for California’s Advanced Clean Trucks regulations and barred a substantially similar rule.", /term|broader/],
    [r("H.R. 26|119|energy_production"), "Would bar the President from declaring a fracking moratorium unless an Act of Congress authorizes it, as mapped.", /method word/],
    [r("H.R. 26|119|energy_production"), E["H.R. 3746|118|energy_production"], /term|broader|borrowed|tally/],
    [r("H.R. 26|119|energy_production"), "Would bar the President from declaring a fracking moratorium unless an Act of Congress authorizes it; the House passed it 300-100.", /tally/],
    [r("H.R. 1047|119|energy_production"), "Had FERC open a rulemaking letting transmission providers move new dispatchable power projects up the interconnection queue.", /took effect/],
    [{ ...r("H.B. 11|2024GS|water"), plain: { lawns: "all lawns" } }, r("H.B. 11|2024GS|water").line, /restates/],
  ];
  for (const [row, line, want] of cases) {
    const f = rewriteFault(row, line, { ...E, [row.key]: line });
    ok(want.test(f), `rewriteFault let ${JSON.stringify(String(line).slice(0, 60))} through (said ${JSON.stringify(f)})`);
  }
  console.log(`      ✓ ${cases.length} bad rewrites refused by the rule alone`);
}

console.log(`\n${failures.length ? "✗" : "✓"} effect-line audit: ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
