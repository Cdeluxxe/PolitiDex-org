#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-civic-rules-safety-net-keys-2026.mjs — five register keys, no positions
// ─────────────────────────────────────────────────────────────────────────────
// The civic rules & safety net keys pass (Nov 2026) adds five keys to the issue
// register (ISSUE_MAP in alignment-tool.js and its verbatim copy issue-map.js):
// Redistricting & Gerrymandering, Birthright Citizenship, Medicaid & SNAP Work
// Requirements, Federal Reserve Independence and Senate Filibuster. It slots each
// under a core issue, pairs each both ways in the related-issues map, gives the
// stance scorer a narrow vocabulary entry for each (the scorer covers exactly
// the register), and regenerates the three server-side mirrors:
// db/issue-keys.json, db/issue-core-categories.json and
// netlify/lib/related-issue-keys.mjs. No position is seeded.
//
// WHAT THIS SUITE PROVES:
//   1. THE REGISTER AND THE MAP: each key is in both register copies with its
//      display name, a chip line, a scope note and no lean, under its core
//      issue, in every generated list, and in the map with its declared pairs,
//      both ways, each new key last in the existing keys' lists. Every register
//      key is in the map, every map key is in the register, the map is symmetric.
//   2. SITE AND GENERATOR IN LOCKSTEP: each mirror equals what its generator
//      writes now; the scorer's topics are exactly the register; the compiled
//      rules of every existing key are the base commit's, regex for regex.
//   3. KEYS ONLY: no stance card, published position or conflicts line on any.
//   4. NOTHING ELSE MOVED since the base: stance records, roster, documents,
//      routes, functions, edge functions, migrations and the sitemap are
//      byte-identical; the register, the map, the mirrors and the scorer
//      vocabulary moved only by the declared block; the shell moved one version.
//
//   node scripts/test-civic-rules-safety-net-keys-2026.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { relatedIssueKeysFromSource } from "./gen-related-issue-keys.mjs";
import { buildTable as buildCoreTable } from "./gen-issue-core-categories.mjs";
import { RELATED_ISSUE_KEYS } from "../netlify/lib/related-issue-keys.mjs";
import * as S from "../netlify/lib/stance-score-core.mjs";
import { ISSUE_TOPIC_VOCAB, buildTopicRules } from "../netlify/lib/stance-topic-vocab.mjs";
import {
  DECLARED_STANCE_PASSES, ACCOUNTABILITY_KEYS, FAMILY_FAIRNESS_KEYS, CIVIC_KEYS, CIVIC_KEYS_PASS,
  withoutCivicKeysRegisterBlock, withoutCivicKeysIssueKeys, withoutCivicKeysCoreCategories,
  withoutCivicKeysTopicVocab, withoutCivicKeysRelatedIssues, swCodeOnly,
} from "./v103-chrome-seams.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
// The commit this pass was built on.
const BASE_REV = "313cde9d";
const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); } catch { return null; } };
const BASE = (f) => git(["show", `${BASE_REV}:${f}`]);

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`   ── ${t}`);

const NEW_KEYS = {
  redistricting_gerrymandering: { name: "Redistricting & Gerrymandering", core: "election_integrity", pairs: ["voting_access", "democracy_balance", "scotus_reform", "election_integrity"] },
  birthright_citizenship: { name: "Birthright Citizenship", core: "immigration_border", pairs: ["deportations", "immigration_reform", "judicial_check", "immig_balance"] },
  safety_net_work_requirements: { name: "Medicaid & SNAP Work Requirements", core: "healthcare", pairs: ["healthcare", "health_rural", "cut_spending", "family_support"] },
  fed_independence: { name: "Federal Reserve Independence", core: "checks_and_balances", pairs: ["audit_spending", "cost_living", "checks_balances", "sound_money"] },
  senate_filibuster: { name: "Senate Filibuster", core: "checks_and_balances", pairs: ["checks_balances", "power_of_purse", "voting_access", "term_limits"] },
};
const KEYS = Object.keys(NEW_KEYS);

const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js", "issue-colors.js",
  "related-issues.js",
];
const win = makeSandbox();
{
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { failures.push(`boot ${f}: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
}
const boot = (src) => { const w = {}; w.window = w; vm.runInContext(String(src), vm.createContext(w)); return w; };
const stanceData = (src) => boot(src).ISSUE_STANCE_DATA || {};
const RI = win.PDXRelatedIssues, CS = win.PDXConsistency, MAP = (RI && RI.MAP) || {};
const lbl = (k) => String(win.ISSUE_MAP[k].label).replace(/^[^A-Za-z0-9]+/, "").trim();
const REG = Object.keys(win.ISSUE_MAP || {}).sort();

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the five keys are in the register, the core table, the generated lists and the map, both ways");
// ═════════════════════════════════════════════════════════════════════════════
{
  const reg = boot(R("issue-map.js")).ISSUE_MAP || {};
  const allow = JSON.parse(R("db/issue-keys.json"));
  const cores = JSON.parse(R("db/issue-core-categories.json"));
  eq(JSON.stringify(CIVIC_KEYS), JSON.stringify(KEYS), "the seams module declares a different key list");
  const at = R("alignment-tool.js");
  for (const k of KEYS) {
    const d = NEW_KEYS[k];
    ok(/^[a-z]+(?:_[a-z]+)+$/.test(k), `${k}: not an underscore key`);
    ok(!!win.ISSUE_MAP[k], `${k} is not in ISSUE_MAP (alignment-tool.js)`);
    ok(!!reg[k], `${k} is not in ISSUE_MAP (issue-map.js)`);
    if (!win.ISSUE_MAP[k]) continue;
    eq(JSON.stringify(reg[k]), JSON.stringify(win.ISSUE_MAP[k]), `${k}: the two register copies differ`);
    eq(lbl(k), d.name, `${k}: display name`);
    eq(win.ISSUE_MAP[k].lean, undefined, `${k}: carries a lean`);
    eq(JSON.stringify(win.ISSUE_MAP[k].stanceKeys), "[]", `${k}: stanceKeys`);
    ok(typeof win.ISSUE_MAP[k].chip === "string" && win.ISSUE_MAP[k].chip.length > 20, `${k}: no one-line position`);
    // A scope note sits right above the entry, under the pass's header.
    ok(new RegExp(String.raw`// CIVIC RULES & SAFETY NET KEYS PASS \(Nov 2026[^\n]*\n(?: {6}//[^\n]*\n)*? {6}// SCOPE \(${k}\):[^\n]*\n(?: {6}//[^\n]*\n)* {6}${k}: `).test(at), `${k}: no scope note above its register entry`);
    ok(allow.keys.includes(k), `${k} is not in db/issue-keys.json`);
    eq(cores.categoryOf[k], d.core, `${k}: core issue (db/issue-core-categories.json)`);
    const ci = (win.CORE_NATIONAL_ISSUES || []).find((c) => c.key === d.core);
    ok(ci && ci.keys.slice(-KEYS.filter((o) => NEW_KEYS[o].core === d.core).length).includes(k), `${k}: not appended to the ${d.core} core issue`);
    ok(RELATED_ISSUE_KEYS.includes(k), `${k} is not in netlify/lib/related-issue-keys.mjs`);
    eq(JSON.stringify(MAP[k]), JSON.stringify(d.pairs), `${k}: its related-issues list`);
    for (const r of d.pairs) {
      ok(!!win.ISSUE_MAP[r] && !KEYS.includes(r), `${k} pairs with ${r}, which is not an existing register key`);
      const back = MAP[r] || [];
      ok(back.includes(k), `${r} does not list ${k} back`);
      const tail = back.slice(back.findIndex((x) => KEYS.includes(x)));
      eq(JSON.stringify(tail), JSON.stringify(KEYS.filter((o) => NEW_KEYS[o].pairs.includes(r))), `${r}: the appended tail`);
    }
  }
  // The new keys' own rows are the last five rows of the map.
  eq(JSON.stringify(Object.keys(MAP).slice(-KEYS.length)), JSON.stringify(KEYS), "the five rows are not at the end of the map");
  eq(allow.count, allow.keys.length, "the allow-list count is its length");
  eq(allow.count, 135, "db/issue-keys.json holds 135 keys");
  eq(cores.count, Object.keys(cores.categoryOf).length, "the core table count is its length");
  eq(cores.count, 135, "db/issue-core-categories.json holds 135 keys");
  for (const k of [...ACCOUNTABILITY_KEYS, ...FAMILY_FAIRNESS_KEYS]) ok(!!win.ISSUE_MAP[k] && !!MAP[k] && allow.keys.includes(k), `${k} (an earlier pass) went missing`);
  for (const k of REG) ok(RELATED_ISSUE_KEYS.includes(k), `register key ${k} is not in the related-issues map`);
  for (const k of RELATED_ISSUE_KEYS) ok(!!win.ISSUE_MAP[k], `map key ${k} is not in the register`);
  eq(JSON.stringify(Object.keys(MAP).sort()), JSON.stringify(REG), "the map's rows are not the register");
  for (const [k, list] of Object.entries(MAP)) {
    ok(new Set(list).size === list.length, `${k}: a related key is listed twice`);
    ok(!list.includes(k), `${k}: lists itself`);
    for (const r of list) ok((MAP[r] || []).includes(k), `the map is not symmetric: ${k} lists ${r}, ${r} does not list ${k}`);
  }
  const region = (src) => { const s = String(src), a = s.indexOf("    var ISSUE_MAP = {"); return s.slice(a, s.indexOf("window._pdxEvidenceCategor", a)); };
  eq(region(R("alignment-tool.js")), region(R("issue-map.js")), "alignment-tool.js and issue-map.js registers differ");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · site and generator in lockstep; existing scorer rules unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  const allow = JSON.parse(R("db/issue-keys.json"));
  eq(JSON.stringify(allow.keys), JSON.stringify(REG), "db/issue-keys.json is not the register (run node scripts/gen-issue-keys.mjs)");
  for (const k of REG) {
    const kw = win.ISSUE_MAP[k].keywords;
    if (Array.isArray(kw) && kw.length) eq(JSON.stringify(allow.keywords[k]), JSON.stringify(kw), `db/issue-keys.json keywords for ${k}`);
  }
  eq(R("db/issue-core-categories.json"), JSON.stringify(buildCoreTable(), null, 2) + "\n", "db/issue-core-categories.json is stale (run node scripts/gen-issue-core-categories.mjs)");
  eq(JSON.stringify(RELATED_ISSUE_KEYS), JSON.stringify(relatedIssueKeysFromSource(R("related-issues.js"))), "netlify/lib/related-issue-keys.mjs is stale (run node scripts/gen-related-issue-keys.mjs)");
  eq(JSON.stringify(RELATED_ISSUE_KEYS), JSON.stringify(REG), "the related-issues map's keys are not the register's");
  eq(JSON.stringify([...S.SCORED_TOPICS].sort()), JSON.stringify(REG), "the stance scorer's topics are not the register");
  for (const k of KEYS) {
    ok(S.hasRulesFor(k), `the scorer has no rules for ${k}`);
    eq(ISSUE_TOPIC_VOCAB[k] && ISSUE_TOPIC_VOCAB[k].label, NEW_KEYS[k].name, `${k}: scorer label`);
    eq(ISSUE_TOPIC_VOCAB[k] && ISSUE_TOPIC_VOCAB[k].pos, win.ISSUE_MAP[k] && win.ISSUE_MAP[k].chip, `${k}: scorer pos is not the register chip`);
  }
  // Each new key reads its own clear statements, in the register's polarity.
  const reads = [
    ["I will fight to end partisan gerrymandering.", "redistricting_gerrymandering", "support"],
    ["We must protect birthright citizenship.", "birthright_citizenship", "support"],
    ["We will end birthright citizenship.", "birthright_citizenship", "oppose"],
    ["I support Medicaid work requirements.", "safety_net_work_requirements", "support"],
    ["I will defend the independence of the Federal Reserve.", "fed_independence", "support"],
    ["We must protect the filibuster.", "senate_filibuster", "support"],
    ["We must abolish the filibuster.", "senate_filibuster", "oppose"],
  ];
  for (const [s, k, side] of reads) { const c = S.classify(s, k); eq(c && c.side, side, `${k}: "${s}"`); }
  // Every existing key's compiled rules are the base commit's, regex for regex.
  const ser = (r) => JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v instanceof RegExp ? `${v.source}/${v.flags}` : v])));
  const baseVocab = BASE("netlify/lib/stance-topic-vocab.mjs");
  if (baseVocab == null) {
    console.log("     (no git baseline — compiled-rule comparison skipped)");
  } else {
    const dir = mkdtempSync(join(tmpdir(), "pdx-civic-vocab-"));
    const p = join(dir, "base-vocab.mjs");
    writeFileSync(p, baseVocab);
    const B = await import(pathToFileURL(p).href);
    const baseRules = B.buildTopicRules(), nowRules = buildTopicRules();
    eq(JSON.stringify(Object.keys(nowRules).filter((k) => !KEYS.includes(k))), JSON.stringify(Object.keys(baseRules)), "the scorer's existing vocabulary keys moved");
    for (const k of Object.keys(baseRules)) ok(ser(baseRules[k]) === ser(nowRules[k]), `${k}: compiled vocabulary rules changed`);
    for (const k of Object.keys(baseRules)) ok(JSON.stringify(B.ISSUE_TOPIC_VOCAB[k]) === JSON.stringify(ISSUE_TOPIC_VOCAB[k]), `${k}: vocabulary spec changed`);
    ok(ser(S.TOPIC_RULES.cost_living) !== "" && ser(S.TOPIC_RULES.healthcare_costs) !== "", "core topics missing");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · keys only: no stance card, no published position, no conflicts line");
// ═════════════════════════════════════════════════════════════════════════════
{
  const all = [stanceData(R("politician-stances.js")), win.ISSUE_STANCE_DATA || {}];
  for (const d of all) for (const [pid, cards] of Object.entries(d)) for (const c of cards || []) ok(!KEYS.includes(c.issueKey), `${pid}: a stance card on ${c.issueKey}`);
  for (const f of ["politician-stances.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js", "cmp-data.js"]) {
    const src = R(f);
    for (const k of KEYS) ok(!src.includes(k), `${f} names ${k}`);
  }
  const pids = Object.keys(win.CMP_DATA || {}).filter((p) => (win.ISSUE_STANCE_DATA || {})[p]).slice(0, 40).concat(["trump"]);
  for (const k of KEYS) {
    for (const pid of pids) {
      const prof = win.CMP_DATA[pid];
      const pm = (win._polPositionMap && win._polPositionMap(pid, prof)) || {};
      ok(!pm[k], `${pid} × ${k}: the stance map publishes a position`);
      for (const side of ["support", "oppose"]) {
        win.PDXStanceSides = { list: () => [{ key: k, position: side, priority: "medium" }] };
        for (const r of NEW_KEYS[k].pairs) {
          const cf = (RI.conflictsFor(pid, prof, r) || []).filter((x) => x.bKey === k || x.aKey === k);
          eq(cf.length, 0, `${pid} × ${r} · ${k} (${side}): a conflicts line for a key with no position`);
        }
      }
    }
    win.PDXStanceSides = { list: () => [{ key: k, position: "support", priority: "medium" }] };
    for (const r of NEW_KEYS[k].pairs) ok(!(CS.gapViewHtml("trump", r) || "").includes(`data-pdxri-cf="${k}"`), `trump × ${r}: the drawer prints a conflicts line for ${k}`);
  }
  delete win.PDXStanceSides;
  const d = DECLARED_STANCE_PASSES.find((x) => x.pass === CIVIC_KEYS_PASS);
  ok(!!d, `${CIVIC_KEYS_PASS} is not a declared stance pass`);
  if (d) eq(JSON.stringify(d.pids), "[]", "the declared pass names people — it seeds no position");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · nothing else moved; no route or gate; one shell version; no migration");
// ═════════════════════════════════════════════════════════════════════════════
{
  if (BASE("issue-map.js") == null) {
    console.log("     (no git baseline — byte-identity checks skipped)");
  } else {
    for (const f of ["alignment-tool.js", "issue-map.js"]) eq(withoutCivicKeysRegisterBlock(R(f)), BASE(f), `${f} changed outside the declared register block`);
    eq(withoutCivicKeysIssueKeys(R("db/issue-keys.json")), BASE("db/issue-keys.json"), "db/issue-keys.json moved by more than the five keys");
    eq(withoutCivicKeysCoreCategories(R("db/issue-core-categories.json")), BASE("db/issue-core-categories.json"), "db/issue-core-categories.json moved by more than the five keys");
    eq(withoutCivicKeysRelatedIssues(R("related-issues.js")), BASE("related-issues.js"), "related-issues.js changed outside the declared edits");
    eq(withoutCivicKeysTopicVocab(R("netlify/lib/stance-topic-vocab.mjs")), BASE("netlify/lib/stance-topic-vocab.mjs"), "the scorer vocabulary changed outside the declared block");
    const baseRel = (/RELATED_ISSUE_KEYS = (\[[^\n]*\]);/.exec(BASE("netlify/lib/related-issue-keys.mjs")) || [])[1];
    eq(JSON.stringify(RELATED_ISSUE_KEYS.filter((k) => !KEYS.includes(k))), JSON.stringify(JSON.parse(baseRel || "[]")), "netlify/lib/related-issue-keys.mjs moved by more than the five keys");
    // The existing keys' register entries and map rows: only appended new keys.
    const baseWin = (() => { const w = makeSandbox(); const c = vm.createContext(w); vm.runInContext(BASE("alignment-tool.js"), c); vm.runInContext(BASE("related-issues.js"), c); return { reg: w.ISSUE_MAP, map: w.PDXRelatedIssues.MAP }; })();
    eq(JSON.stringify(REG.filter((k) => !KEYS.includes(k))), JSON.stringify(Object.keys(baseWin.reg).sort()), "an existing register key was added or removed");
    for (const k of Object.keys(baseWin.reg)) ok(JSON.stringify(win.ISSUE_MAP[k]) === JSON.stringify(baseWin.reg[k]), `${k}: its register entry moved`);
    for (const [k, list] of Object.entries(baseWin.map)) {
      const now = MAP[k] || [];
      eq(JSON.stringify(now.slice(0, list.length)), JSON.stringify(list), `${k}: its existing pairs moved`);
      ok(now.slice(list.length).every((x) => KEYS.includes(x)), `${k}: something other than a new key was appended`);
    }
    // Stance records, roster, drawer code, routes, documents and the sitemap.
    for (const f of ["politician-stances.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
      "cmp-data.js", "cmp-data-detail.js", "consistency.js", "stance-helpers.js", "word-action.js", "stance-sides.js", "my-stances.js",
      "voting-record.js", "acct-spotlight-data.js", "exec-action-data.js", "hero-showcase-data.js", "issue-scope.js", "person.html", "index.html", "issue.html",
      "netlify.toml", "_redirects", "db/vr-issue-seed.json", "db/bill-docs.json", "db/schema.ts", "sitemap.xml",
      "netlify/lib/stance-score-core.mjs"]) {
      const b = BASE(f);
      let now = null; try { now = R(f); } catch { /* absent */ }
      eq(now, b, `${f} changed`);
    }
    const ls = (rev, dir) => (git(["show", `${rev}:${dir === "." ? "" : dir}`]) || "").split("\n").slice(2).filter(Boolean).map((n) => n.replace(/\/$/, "")).sort();
    const list = (dir) => { try { return readdirSync(join(ROOT, dir)).sort(); } catch { return []; } };
    eq(list(".").filter((f) => f.endsWith(".html")).join(","), ls(BASE_REV, ".").filter((f) => f.endsWith(".html")).join(","), "a document was added or removed");
    for (const f of list(".").filter((f) => f.endsWith(".html"))) { const b = BASE(f); if (b != null) ok(R(f) === b, `${f} changed`); }
    for (const d of ["netlify/functions", "netlify/edge-functions", "netlify/database/migrations"]) {
      eq(list(d).join(","), ls(BASE_REV, d).join(","), `${d}: an entry was added or removed`);
      // Every tracked file under the directory, nested ones included.
      const tracked = (git(["ls-tree", "-r", "--name-only", BASE_REV, "--", d]) || "").split("\n").filter(Boolean);
      for (const p of tracked) { let now = null; try { now = R(p); } catch { /* absent */ } ok(now === BASE(p), `${p} changed`); }
    }

    // Precached files changed (the register and the map), so the shell moves
    // one version; worker code and precache list do not.
    const sw = R("sw.js"), baseSw = BASE("sw.js");
    const pre = (src) => (String(src).match(/^  '\/[^']*',$/gm) || []).map((l) => l.slice(4, -2));
    for (const f of ["alignment-tool.js", "issue-map.js", "related-issues.js"]) ok(pre(sw).includes(f), `${f} is not precached`);
    eq(swCodeOnly(sw), swCodeOnly(baseSw), "sw.js worker code or precache list changed");
    const ver = (src) => Number((/^const CACHE_VERSION = 'v(\d+)';$/m.exec(String(src)) || [])[1]);
    eq(ver(sw), ver(baseSw) + 1, `the shell did not move exactly one version (v${ver(baseSw)} → v${ver(sw)})`);
    ok(/v565 - FIVE CIVIC RULES & SAFETY NET KEYS\.[\s\S]*?MIGRATION COST: none\./.test(sw), "the v565 note is missing or does not say no migration");
  }
}

if (failures.length) {
  console.error(`\n✗ civic rules & safety net keys: ${failures.length} failure(s)\n  - ` + failures.slice(0, 40).join("\n  - "));
  process.exit(1);
}
console.log(`✓ civic rules & safety net keys: all ${passed} assertions passed`);
