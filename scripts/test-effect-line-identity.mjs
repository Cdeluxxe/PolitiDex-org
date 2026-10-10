#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-effect-line-identity.mjs — an effect line is keyed by the measure's own
// identity, so a Utah bill can hold one and no other act can read it
// ─────────────────────────────────────────────────────────────────────────────
// The effect table used to key a line by number + congress + issue. A Utah row has
// no congress, so its key read "H.B. 68|null|…": one key for that number in every
// session, and not the key its bill page (/b/2024GS/H.B. 68) looks up. The key is
// now _dosEffectKey(): number | sitting | issue, where the sitting is the congress
// for a federal act and the recorded session for a state act. A row with neither
// gets no key at all.
//
//   1. THE KEY: federal rows resolve to number|congress|issue, Utah rows to
//      number|session|issue, and nothing ever resolves to a "|null|" key.
//   2. FEDERAL LINES UNCHANGED: every shipped line still resolves from its own
//      act — the old key and the new key are the same string for every entry,
//      and the new lookup returns what the old one did. Every effect paragraph
//      and pointer the corpus prints at HEAD prints the same now.
//   3. NO SHARING ACROSS IDENTITIES: a Utah row numbered like a federal act does
//      not read the federal line, a federal row does not read a Utah line, and
//      the same Utah number in another session does not read it either.
//   4. THE BILL PAGE AGREES: db/bill-docs.json is keyed number|sitting|issue, and
//      every line it prints is the table's line under the same identity.
//   5. THE TWELVE RIDER BLANKS STAY BLANK, under their real identities.
//   6. NOTHING ELSE MOVED: the effect, description, executive and pointer tables
//      are byte-identical to HEAD.
//
//   node scripts/test-effect-line-identity.mjs

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js",
];
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const must = (c, m) => { if (!c) { console.error(`\n  ✗ effect-line identity is STALE: ${m}\n`); process.exit(2); } };
const section = (t) => console.log(`\n   ── ${t}`);
const norm = (x) => String(x || "").replace(/\s+/g, " ").trim();

const CONS = R("consistency.js");
const HEAD = (() => {
  try { return execFileSync("git", ["show", "HEAD:consistency.js"], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
})();
function mapOf(src, name) {
  const at = src.indexOf(`var ${name} = {`);
  if (at < 0) return null;
  const end = src.indexOf("\n  };", at);
  return { text: src.slice(at, end + 4), map: vm.runInNewContext("(" + src.slice(at + `var ${name} = `.length, end + 4) + ")") };
}
// One function, lifted out of the shipped source by its own text.
function fnOf(src, name) {
  const at = src.indexOf(`  function ${name}(`);
  if (at < 0) return null;
  const end = src.indexOf("\n  }\n", at);
  return src.slice(at, end + 4);
}
const E = mapOf(CONS, "_DOS_EFFECT");
must(E, "_DOS_EFFECT is not in consistency.js");
const keyFn = fnOf(CONS, "_dosEffectKey");
must(keyFn, "_dosEffectKey is not in consistency.js");
const lineFn = fnOf(CONS, "_dosEffectLine"), okFn = fnOf(CONS, "_dosEffectOk");
must(lineFn && okFn, "_dosEffectLine / _dosEffectOk are not in consistency.js");
must(/_dosEffectKey\(item, issueKey\)/.test(lineFn), "_dosEffectLine does not read its key from _dosEffectKey");
const METHOD_SRC = (CONS.match(/  var _DOS_EFFECT_METHOD = [^\n]+\n/) || [""])[0];
const lift = (table) => vm.runInNewContext(
  `(function(){ var _DOS_EFFECT = ${JSON.stringify(table)};\n${METHOD_SRC}${keyFn}\n${okFn}\n${lineFn}\n` +
  `return { key: _dosEffectKey, line: _dosEffectLine }; })()`);
const NEW = lift(E.map);
// The old lookup, exactly as it shipped at HEAD (number + raw congress + issue),
// lifted from HEAD's own source over today's table.
const OLD = (() => {
  if (!HEAD) return null;
  const hl = fnOf(HEAD, "_dosEffectLine"), ho = fnOf(HEAD, "_dosEffectOk");
  const hm = (HEAD.match(/  var _DOS_EFFECT_METHOD = [^\n]+\n/) || [""])[0];
  if (!hl || !ho || /_dosEffectKey/.test(hl)) return null;
  return vm.runInNewContext(`(function(){ var _DOS_EFFECT = ${JSON.stringify(E.map)};\n${hm}${ho}\n${hl}\nreturn _dosEffectLine; })()`);
})();

const fed = (number, congress) => ({ kind: "vote", number, congress, measureIdent: null });
const utah = (number, session) => ({ kind: "vote", number, congress: null, measureIdent: { session } });

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the key is the measure's own identity");
eq(NEW.key(fed("H.R. 815", 118), "iran_policy"), "H.R. 815|118|iran_policy", "a federal act keys on its congress");
eq(NEW.key(utah("H.B. 68", "2024GS"), "justice_reform"), "H.B. 68|2024GS|justice_reform", "a Utah act keys on its session");
eq(NEW.key(utah("H.B. 68", "2025GS"), "justice_reform"), "H.B. 68|2025GS|justice_reform", "…and the same number in another session is another key");
eq(NEW.key({ kind: "vote", number: "H.B. 68", congress: null, measureIdent: null }, "justice_reform"), "",
  "a row with no congress and no session gets no key");
eq(NEW.key({ kind: "vote", number: "", congress: 119 }, "justice_reform"), "", "a row with no number gets no key");
eq(NEW.key(fed("H.R. 1", 119), ""), "", "no issue, no key");
ok(!/\|null\||\|undefined\|/.test([
  NEW.key(utah("S.B. 26", "2025GS"), "housing"), NEW.key({ number: "S.B. 26", congress: null }, "housing"),
  NEW.key({ number: "S.B. 26" }, "housing"), NEW.key({ number: "S.B. 26", congress: NaN }, "housing"),
].join(" ")), "no row ever resolves to a null or undefined sitting");
console.log(`      federal  H.R. 815 (118th) × iran_policy → ${NEW.key(fed("H.R. 815", 118), "iran_policy")}`);
console.log(`      Utah     H.B. 68 (2024GS) × justice_reform → ${NEW.key(utah("H.B. 68", "2024GS"), "justice_reform")}`);

section("2 · every shipped federal line still reaches its own act");
if (HEAD) must(OLD, "HEAD's _dosEffectLine could not be lifted for the old-key comparison");
const keys = Object.keys(E.map);
must(keys.length > 200, `only ${keys.length} lines in _DOS_EFFECT — the table was not read`);
for (const k of keys) {
  const m = /^(.+)\|(\d+)\|([a-z0-9_]+)$/.exec(k);
  ok(!!m, `${k}: a shipped line is not under a number|congress|issue key`);
  if (!m) continue;
  const item = fed(m[1], Number(m[2]));
  eq(NEW.key(item, m[3]), k, `${k}: the new key is not the old key`);
  // The line the act printed through the old key is the line it prints now.
  if (OLD) eq(NEW.line(item, m[3], null), OLD(item, m[3], null), `${k}: the new lookup and the old one disagree`);
  ok(norm(E.map[k]) === "" || NEW.line(item, m[3], null) !== "" || norm(E.map[k]).length > 140,
    `${k}: a line stored under the old key no longer reaches its act`);
}

section("3 · a line does not cross identities");
const FED_KEY = "H.R. 815|118|iran_policy";
must(E.map[FED_KEY], `${FED_KEY} is not a shipped line — re-aim this probe`);
ok(norm(NEW.line(fed("H.R. 815", 118), "iran_policy", null)) !== "", "the federal row prints its own line");
eq(NEW.line(utah("H.R. 815", "2024GS"), "iran_policy", null), "", "a Utah row numbered H.R. 815 does not read the federal line");
eq(NEW.line({ kind: "vote", number: "H.R. 815", congress: null, measureIdent: null }, "iran_policy", null), "",
  "a row numbered H.R. 815 with no sitting does not read it");
eq(NEW.line(fed("H.R. 815", 119), "iran_policy", null), "", "the same number in another congress does not read it");
// A Utah line exists nowhere yet; give the lifted lookup one, to show where it lands.
const UT_KEY = "H.B. 68|2024GS|justice_reform";
ok(!(UT_KEY in E.map), `${UT_KEY} is stored — this pass writes no new line`);
const PROBE = lift({ ...E.map, [UT_KEY]: "Probe line for the Utah identity." });
eq(PROBE.line(utah("H.B. 68", "2024GS"), "justice_reform", null), "Probe line for the Utah identity.", "a Utah line reaches its own session's row");
eq(PROBE.line(utah("H.B. 68", "2025GS"), "justice_reform", null), "", "…and not the same number in another session");
eq(PROBE.line(fed("H.B. 68", 118), "justice_reform", null), "", "…and not a federal row with the same number");
eq(PROBE.line({ kind: "vote", number: "H.B. 68", congress: null, measureIdent: null }, "justice_reform", null), "",
  "…and not a row with no sitting");
// The old key, for contrast: it handed every session the same "|null|" key.
eq(String("H.B. 68") + "|" + null + "|justice_reform", "H.B. 68|null|justice_reform", "(the old key a Utah row produced)");
ok(!Object.keys(E.map).some((k) => /\|null\|/.test(k)), "no shipped line sits under a null-sitting key");

section("4 · the bill page reads the same identity");
const docs = J("db/bill-docs.json").docs;
const MECH = mapOf(CONS, "_DOS_MECH").map;
const gen = R("scripts/gen-bill-docs.mjs");
ok(/const k = `\$\{num\}\|\$\{cong\}\|\$\{issue\}`;/.test(gen) && /lineFor\(a\.number, a\.sitting, k\)/.test(gen),
  "gen-bill-docs.mjs no longer keys a line by number|sitting|issue");
let docLines = 0;
const labels = {};
for (const m of R("issue-map.js").matchAll(/^\s+([a-z0-9_]+):\s*\{\s*label:\s*'([^']+)'/gm)) labels[m[2].replace(/^[^A-Za-z0-9\s]+\s+/, "")] = m[1];
for (const [, d] of Object.entries(docs)) {
  for (const x of d.m || []) {
    if (!x.l) continue;
    docLines++;
    const key = labels[x.i];
    // The page prints the table's line, else the pair's own short `did` — both
    // under the same number|sitting|issue identity, both through the row rule.
    const id = `${d.n}|${d.s}|${key}`;
    const want = NEW.line({ number: d.n, congress: Number(d.s) }, key, MECH[id] || null);
    ok(key && want === norm(x.l), `${d.s}/${d.n} × ${x.i}: the bill page prints a line the table does not hold under that identity`);
    ok(/^\d+$/.test(d.s), `${d.s}/${d.n}: a bill page prints a line for a non-federal sitting, and none is stored`);
  }
}
ok(docLines > 200, `only ${docLines} lines on bill pages — the projection was not read`);

section("5 · the twelve rider blanks stay blank");
const RIDER = J("db/vr-rider-effect-lines.json").rows;
const blanks = RIDER.filter((r) => r.decision === "blank");
eq(blanks.length, 12, "twelve rider rows are recorded blank");
for (const r of blanks) {
  const item = r.congress != null ? fed(r.number, r.congress) : utah(r.number, r.utahSession);
  const k = NEW.key(item, r.leaf);
  ok(!!k && !(k in E.map), `${r.key}: ${k || "(no key)"} now stores a line`);
  eq(NEW.line(item, r.leaf, null), "", `${r.key}: a blank rider row prints a line`);
}

section("6 · rendered on the corpus, and nothing else moved");
const corpus = buildCorpus(ROOT);
const LEAVES = [...new Set(keys.map((k) => k.split("|").pop()))];
function render(src) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(f === "consistency.js" ? src : R(f), ctx, { filename: f }); } catch (e) { return { err: `${f}: ${e.message}` }; }
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  const out = new Map();
  for (const pid of Object.keys(win.CMP_DATA)) {
    for (const k of LEAVES) {
      let html = "";
      try { if (!(win.PDXConsistency.dossierItems(pid, k) || []).length) continue; html = win.PDXConsistency.dossierLedgerHtml(pid, k) || ""; } catch { continue; }
      const rows = [...html.matchAll(/<tr class="pdxlg-(effr|ptrr)"[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1] + ":" + norm(m[2].replace(/<[^>]+>/g, "")));
      if (rows.length) out.set(`${pid}|${k}`, rows.join("\n"));
    }
  }
  return { out };
}
const now = render(CONS);
must(!now.err, `boot: ${now.err}`);
ok(now.out.size > 1000, `only ${now.out.size} drawers print an effect line or pointer — the corpus did not reach the engine`);
if (HEAD) {
  const was = render(HEAD);
  must(!was.err, `HEAD boot: ${was.err}`);
  let moved = 0;
  for (const [k, v] of was.out) if (now.out.get(k) !== v) { moved++; if (moved <= 5) ok(false, `${k}: printed differently from HEAD`); }
  for (const k of now.out.keys()) if (!was.out.has(k)) { moved++; if (moved <= 5) ok(false, `${k}: prints a line or pointer it did not print at HEAD`); }
  eq(moved, 0, "drawers whose effect lines or pointers moved");
  console.log(`      ${was.out.size} drawers with effect lines or pointers, identical to HEAD`);
  for (const name of ["_DOS_EFFECT", "_DOS_MECH", "_DOS_EXEC_EFFECT", "_DOS_POINTER"]) {
    ok(mapOf(CONS, name).text === mapOf(HEAD, name).text, `${name} is not byte-identical to HEAD`);
  }
} else console.log("   (no git baseline — the HEAD comparison did not run)");

if (failures.length) {
  console.error(`\n  ✗ effect-line identity: ${failures.length} failed, ${passed} passed`);
  for (const f of failures.slice(0, 40)) console.error("    · " + f);
  process.exit(1);
}
console.log(`\n  ✓ effect-line identity: ${passed} passed`);
