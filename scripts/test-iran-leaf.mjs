#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-iran-leaf.mjs — 🇮🇷 Iran is a leaf under Foreign Policy, not an alias
// ─────────────────────────────────────────────────────────────────────────────
// "iran" in Find a topic used to open Diplomacy & Restraint and Congress and War
// Powers on any file that had them, because "iran" was an alias on those keys.
// Now it is its own issue key, only acts whose own subject is Iran sit on it,
// and the old leaves answer "iran" only through such an act. The fence:
//
//   1. ONE KEY. iran_policy is in the vocabulary once, under Foreign Policy &
//      National Security, in the generated allow-list and the stored table.
//   2. NO POLE. It names a country, so the record engine never reads a side.
//   3. ONLY IRAN ACTS. A measure mapped to War Powers and not to Iran (S.J.Res. 7,
//      Yemen) never appears in the Iran drawer; neither do the Venezuela or
//      no-theatre war-powers rolls.
//   4. HONEST EMPTY. A file with no Iran act and no curated Iran position gets
//      "No topic on this file matches." for iran, even with a War Powers row.
//   5. MUTATION. Putting "iran" back as a bare alias on War Powers paints Iran on
//      that empty file, and the checker below catches it.
//
//   node scripts/test-iran-leaf.mjs

import { readFileSync } from "node:fs";
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
  "pdx-issue-family.js", "acct-spotlight-data.js", "say-vs-do.js",
  "exec-action-data.js", "exec-record.js", "exec-record-ui.js", "issue-colors.js",
  "consistency.js", "voting-record.js", "word-action.js", "profile-spine.js",
  "stance-tree.js",
];
const KEY = "iran_policy";

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const must = (c, m) => { if (c) { passed++; return; } console.error(`✗ iran leaf: ${m}`); process.exit(2); };
const section = (t) => console.log(`  · ${t}`);

const corpus = buildCorpus(ROOT);
function boot(patch) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    let src = R(f);
    if (patch && patch[f]) src = patch[f](src);
    vm.runInContext(src, ctx, { filename: f });
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  return win;
}
const win = boot();
const T = win.PDXStanceTree, CS = win.PDXConsistency;
must(!!T && typeof T.find === "function", "PDXStanceTree.find is not published");
must(!!CS && typeof CS.dossierItems === "function", "PDXConsistency.dossierItems is not published");
const leafCount = (html) => (String(html).match(/class="pdxtree-leaf/g) || []).length;
const keysOf = (d) => ((d && d.item && d.item.issues) || []).map((x) => x.issueKey);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · one key, under Foreign Policy & National Security, everywhere");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const f of ["alignment-tool.js", "issue-map.js"]) {
    const n = (R(f).match(/^\s*iran_policy:\s*\{\s*label:/gm) || []).length;
    eq(n, 1, `${f} declares iran_policy exactly once`);
  }
  ok(!/^\s*iran:\s*\{\s*label:/m.test(R("alignment-tool.js")), "no second spelling (iran) is declared");
  const M = win.ISSUE_MAP[KEY];
  must(!!M, "ISSUE_MAP has no iran_policy");
  ok(/\bIran\b/.test(M.label) && M.label.replace(/[^A-Za-z ]/g, "").trim() === "Iran", `label is Iran (got ${M.label})`);
  eq(win.coreIssueForKey(KEY) && win.coreIssueForKey(KEY).key, "foreign_policy_defense", "core is Foreign Policy & National Security");
  const keys = JSON.parse(R("db/issue-keys.json"));
  const list = Array.isArray(keys) ? keys : (keys.keys || []);
  eq(list.filter((k) => k === KEY).length, 1, "db/issue-keys.json carries iran_policy once");
  const cores = JSON.parse(R("db/issue-core-categories.json"));
  eq((cores.categoryOf || {})[KEY], "foreign_policy_defense", "db/issue-core-categories.json files it under Foreign Policy");
  // The issue list is a stored table, so the key ships with a migration.
  const mig = R("netlify/database/migrations/20261105000000_vr_iran_policy_issue_key.sql");
  ok(/INSERT INTO "dd_issue_keys" \("issue_key"\) VALUES \('iran_policy'\)\s*ON CONFLICT DO NOTHING/.test(mig),
    "the migration adds iran_policy to dd_issue_keys");
  ok(!/number = 'S\.J\.Res\. 7'|number = 'S\.J\. Res\. 7'/.test(mig), "the migration maps nothing onto S.J.Res. 7");
  // The on-axis leaves it sits beside are still there.
  for (const k of ["restraint", "war_powers", "strong_defense", "israel_support"]) {
    ok(!!win.ISSUE_MAP[k], `${k} is still a leaf`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · no pole: a country is not a proposition");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(/iran_policy:\s*1/.test(R("stance-helpers.js").split("_RD_NO_POLE")[1] || ""), "iran_policy is in _RD_NO_POLE");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · only Iran acts sit in the Iran drawer");
// ═════════════════════════════════════════════════════════════════════════════
const seed = JSON.parse(R("db/vr-issue-seed.json"));
const onIran = seed.measures.filter((m) => (m.issues || []).some((i) => i.issueKey === KEY));
{
  must(onIran.length > 0, "no measure in db/vr-issue-seed.json is mapped to iran_policy");
  for (const m of onIran) {
    const i = m.issues.find((x) => x.issueKey === KEY);
    ok(/\bIran\b/.test(i.rationale), `${m.number}: the rationale names Iran as the subject`);
    ok(i.isPrimary === false, `${m.number}: filed alongside its existing rows, not as their replacement`);
    ok(m.issues.length > 1, `${m.number}: keeps its other leaves`);
  }
  for (const n of ["S.J.Res. 7", "S.J.Res. 83", "S.J.Res. 90", "S.J.Res. 98", "H.Con.Res. 108"]) {
    ok(!onIran.some((m) => m.number === n), `${n} is not an Iran act and is not mapped to Iran`);
  }

  // The drawer, on files that carry both leaves.
  const trumpIran = CS.dossierItems("trump", KEY) || [];
  must(trumpIran.length > 0, "Trump has no row in the Iran drawer (the S.J. Res. 68 veto should be one)");
  ok(trumpIran.every((d) => keysOf(d).includes(KEY)), "every row in Trump's Iran drawer carries the Iran key");
  ok(!trumpIran.some((d) => /S\.J\. ?Res\. 7\b/.test(d.ident || "")), "S.J. Res. 7 (Yemen) is not in Trump's Iran drawer");
  const wpOnly = (CS.dossierItems("trump", "war_powers") || []).filter((d) => !keysOf(d).includes(KEY));
  must(wpOnly.length > 0, "Trump has no War-Powers-only act to test against");
  const idents = new Set(trumpIran.map((d) => d.ident));
  ok(wpOnly.every((d) => !idents.has(d.ident)), "a measure mapped only to War Powers does not appear in the Iran drawer");

  // A senator with the whole war-powers slice.
  let senator = null;
  for (const [pid] of corpus.byMember) {
    const wp = CS.dossierItems(pid, "war_powers") || [];
    if (wp.some((d) => !keysOf(d).includes(KEY)) && (CS.dossierItems(pid, KEY) || []).length) { senator = pid; break; }
  }
  must(!!senator, "no member carries both an Iran roll and a non-Iran war-powers roll");
  const sIran = CS.dossierItems(senator, KEY);
  ok(sIran.every((d) => keysOf(d).includes(KEY)), `${senator}: every Iran row is an Iran act`);
  const sNon = (CS.dossierItems(senator, "war_powers") || []).filter((d) => !keysOf(d).includes(KEY));
  const sIds = new Set(sIran.map((d) => d.ident));
  ok(sNon.every((d) => !sIds.has(d.ident)), `${senator}: no War-Powers-only roll leaks into the Iran drawer`);
  ok(T.leaves(senator).some((l) => l.key === KEY), `${senator}: a mapped Iran roll puts the Iran leaf on the file`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · Trump: iran lists the Iran leaf; xyzzy stays empty");
// ═════════════════════════════════════════════════════════════════════════════
{
  const TL = T.leaves("trump");
  const hits = T.find(TL, "iran").map((l) => l.key);
  ok(hits.includes(KEY), "Trump search iran lists the Iran leaf");
  for (const q of ["iran war", "iran deal", "jcpoa"]) ok(T.find(TL, q).some((l) => l.key === KEY), `${q} finds the Iran leaf`);
  const zz = T.html("trump", { uid: "i", query: "xyzzy" });
  eq(leafCount(zz), 0, "xyzzy renders zero rows");
  eq((zz.match(/No topic on this file matches\./g) || []).length, 1, "xyzzy prints the miss line once");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · honest empty, and the mutation that would break it");
// ═════════════════════════════════════════════════════════════════════════════
// The honest-empty file is a real one, found rather than named: a person whose
// tree carries War Powers or Diplomacy & Restraint and whose file holds no Iran
// act at all. On that file "iran" must print the miss line.
function iranEmptyFile(w) {
  const P = w.PROFILES || w.CMP_DATA || {};
  for (const pid of Object.keys(P)) {
    const ls = w.PDXStanceTree.leaves(pid);
    if (!ls.some((l) => l.key === "war_powers" || l.key === "restraint")) continue;
    if (ls.some((l) => l.key === KEY)) continue;
    if ((w.PDXConsistency.dossierItems(pid, KEY) || []).length) continue;
    return { pid, ls };
  }
  return null;
}
// The checker: does "iran" open any leaf on a file with zero Iran maps?
const paintsIran = (w, e) => w.PDXStanceTree.find(e.ls, "iran").length > 0 ||
  !w.PDXStanceTree.html(e.pid, { uid: "z", query: "iran" }).includes(w.PDXStanceTree.FIND_NONE);
{
  const E = iranEmptyFile(win);
  must(!!E, "no file carries War Powers or Restraint without an Iran act to test against");
  eq((CS.dossierItems(E.pid, KEY) || []).length, 0, `${E.pid}: no Iran act on file`);
  ok(!paintsIran(win, E), `${E.pid}: iran finds nothing on a file with War Powers / Restraint and no Iran map`);
  const h = T.html(E.pid, { uid: "z", query: "iran" });
  eq(leafCount(h), 0, `${E.pid}: iran renders zero rows`);
  eq((h.match(/No topic on this file matches\./g) || []).length, 1, `${E.pid}: iran prints the miss line once`);

  // MUTATION: the old alias table, "iran" bare on War Powers and Restraint.
  const bad = boot({
    "stance-tree.js": (s) => s.replace("restraint: ['ukraine'],", "restraint: ['ukraine', 'iran'],\n    war_powers: ['iran'],"),
  });
  must(JSON.stringify(bad.PDXStanceTree.FIND_ALIASES.war_powers || []) === '["iran"]', "the mutation did not apply");
  const BE = { pid: E.pid, ls: bad.PDXStanceTree.leaves(E.pid) };
  ok(paintsIran(bad, BE), "MUTATION: an alias that paints Iran on a file with zero Iran maps is caught by the checker");
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
