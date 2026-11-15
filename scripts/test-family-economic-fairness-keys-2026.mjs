#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-family-economic-fairness-keys-2026.mjs — two register keys, no positions
// ─────────────────────────────────────────────────────────────────────────────
// The family & economic fairness keys pass (Nov 2026) adds keys to the
// issue register (ISSUE_MAP in alignment-tool.js and its verbatim copy
// issue-map.js), slots each under a core issue, pairs each both ways in the
// related-issues map, gives the stance scorer a vocabulary entry for each (the
// scorer covers exactly the register), and regenerates the three server-side
// mirrors: db/issue-keys.json, db/issue-core-categories.json and
// netlify/lib/related-issue-keys.mjs. No position is seeded: no stance card,
// no drawer card and no "Where this conflicts" line on any of them yet.
//
// THE CLEANUP (v564). The pass first added five keys. Three overlapped existing
// keys (Affordable Child Care / Paid Family & Medical Leave, Corporate
// Accountability) and were removed again; two stay: Wealth Inequality & Tax
// Fairness and Student Debt & College Access. Section 5 proves the three are
// gone everywhere and that, against the five-key commit, nothing but the
// cleanup moved.
//
// WHAT THIS SUITE PROVES:
//   1. THE REGISTER AND THE MAP: each key is in both register copies with its
//      display name and core issue, and in the map with its declared pairs,
//      both ways, each new key last in the existing keys' lists. Every register
//      key is in the map, every map key is in the register, the map is symmetric.
//   2. SITE AND GENERATOR IN LOCKSTEP: each generated mirror equals what its
//      generator writes from the site files right now; the scorer's topics are
//      exactly the register; the stance chunks are exactly politician-stances.js.
//   3. KEYS ONLY: no stance card names a new key; no drawer prints a conflicts
//      line for one, whatever the reader says on it.
//   5. THE CLEANUP: the three removed keys are in no register copy, map row,
//      scorer entry or generated list, and against the five-key commit only
//      their lines moved.
//   4. NOTHING ELSE MOVED since the base: stance records, roster, routes,
//      functions, documents and migrations are byte-identical; the register,
//      the map, the mirrors and the scorer vocabulary moved only by the declared
//      block; the shell moved one version for the precached files.
//
//   node scripts/test-family-economic-fairness-keys-2026.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { relatedIssueKeysFromSource } from "./gen-related-issue-keys.mjs";
import { buildTable as buildCoreTable } from "./gen-issue-core-categories.mjs";
import { RELATED_ISSUE_KEYS } from "../netlify/lib/related-issue-keys.mjs";
import * as S from "../netlify/lib/stance-score-core.mjs";
import { ISSUE_TOPIC_VOCAB } from "../netlify/lib/stance-topic-vocab.mjs";
import {
  DECLARED_STANCE_PASSES, ACCOUNTABILITY_KEYS, FAMILY_FAIRNESS_KEYS, FAMILY_FAIRNESS_PASS, FAMILY_FAIRNESS_REMOVED_KEYS, relatedIssuesMapOnly,
  withoutFamilyFairnessRegisterBlock, withoutFamilyFairnessIssueKeys, withoutFamilyFairnessCoreCategories,
  withoutFamilyFairnessTopicVocab, withoutFamilyFairnessRelatedIssues, swCodeOnly, CIVIC_KEYS, withoutCivicKeysKeyList,
  withoutPipelineStancesEdits, withoutPipelineStancesEntries, PIPELINE_STANCES_SHELL_BUMPS,
} from "./v103-chrome-seams.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
// The commit this pass was built on.
const BASE_REV = "981421e";
const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); } catch { return null; } };
const BASE = (f) => git(["show", `${BASE_REV}:${f}`]);
// The commit that carried all five keys, before the cleanup.
const FIVE_REV = "1aa9ea04";
const FIVE = (f) => git(["show", `${FIVE_REV}:${f}`]);

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`   ── ${t}`);

const REMOVED = ["affordable_childcare_family_leave", "corporate_concentration_antitrust", "paid_sick_leave_worker_protections"];
const NEW_KEYS = {
  wealth_inequality_tax_fairness: { name: "Wealth Inequality & Tax Fairness", core: "spending_debt_waste", pairs: ["cut_spending", "cost_living", "econ_growth"] },
  student_debt_college_access: { name: "Student Debt & College Access", core: "education_parental", pairs: ["cost_living", "healthcare", "edu_college_cost", "econ_workers"] },
};
const KEYS = Object.keys(NEW_KEYS);
// The display names the request pairs by, as the register spells them.
const PAIR_NAMES = {
  cost_living: "Tackle the Cost of Living", econ_workers: "Raise Wages & Protect Workers", healthcare: "Expand Healthcare Access",
  gov_regulation: "Cut Federal Red Tape", econ_growth: "Pro-Growth Deregulation", housing_build: "Build More Housing",
  cut_spending: "Cut Federal Spending & Reduce Debt", edu_college_cost: "Lower College & Trade Costs",
};

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
section("1 · the two kept keys are in the register and in the related-issues map, both ways");
// ═════════════════════════════════════════════════════════════════════════════
{
  const reg = boot(R("issue-map.js")).ISSUE_MAP || {};
  const allow = JSON.parse(R("db/issue-keys.json"));
  const cores = JSON.parse(R("db/issue-core-categories.json"));
  eq(JSON.stringify(FAMILY_FAIRNESS_KEYS), JSON.stringify(KEYS), "the seams module declares a different key list");
  for (const [k, n] of Object.entries(PAIR_NAMES)) ok(win.ISSUE_MAP[k] && lbl(k) === n, `${k} is not "${n}" in the register`);
  for (const k of KEYS) {
    const d = NEW_KEYS[k];
    ok(/^[a-z]+(?:_[a-z]+)+$/.test(k), `${k}: not an underscore key`);
    ok(!!win.ISSUE_MAP[k], `${k} is not in ISSUE_MAP (alignment-tool.js)`);
    ok(!!reg[k], `${k} is not in ISSUE_MAP (issue-map.js)`);
    if (!win.ISSUE_MAP[k]) continue;
    eq(lbl(k), d.name, `${k}: display name`);
    eq(win.ISSUE_MAP[k].lean, undefined, `${k}: carries a lean`);
    eq(JSON.stringify(win.ISSUE_MAP[k].stanceKeys), "[]", `${k}: stanceKeys`);
    ok(typeof win.ISSUE_MAP[k].chip === "string" && win.ISSUE_MAP[k].chip.length > 20, `${k}: no chip line`);
    ok(!/\bequity\b|utah[- ]first/i.test(win.ISSUE_MAP[k].label + " " + win.ISSUE_MAP[k].chip), `${k}: equity or Utah-first wording`);
    ok(allow.keys.includes(k), `${k} is not in db/issue-keys.json`);
    eq(cores.categoryOf[k], d.core, `${k}: core issue (db/issue-core-categories.json)`);
    const ci = (win.CORE_NATIONAL_ISSUES || []).find((c) => c.key === d.core);
    ok(ci && ci.keys.slice(-KEYS.filter((o) => NEW_KEYS[o].core === d.core).length).includes(k), `${k}: not appended to the ${d.core} core issue`);
    ok(RELATED_ISSUE_KEYS.includes(k), `${k} is not in netlify/lib/related-issue-keys.mjs`);
    eq(JSON.stringify(MAP[k]), JSON.stringify(d.pairs), `${k}: its related-issues list`);
    for (const r of d.pairs) {
      ok(!!win.ISSUE_MAP[r], `${k} pairs with ${r}, which is not in the register`);
      // A later declared pass's keys (the civic rules & safety net keys) may follow.
      const back = withoutCivicKeysKeyList(MAP[r] || []);
      ok(back.includes(k), `${r} does not list ${k} back`);
      // New keys are last in an existing key's list, in declared order.
      const tail = back.slice(back.findIndex((x) => KEYS.includes(x)));
      ok(tail.every((x) => KEYS.includes(x)), `${r}: ${k} is not in the appended tail of its list`);
      eq(JSON.stringify(tail), JSON.stringify(KEYS.filter((o) => NEW_KEYS[o].pairs.includes(r))), `${r}: the appended tail`);
    }
  }
  eq(allow.count, allow.keys.length, "the allow-list count is its length");
  eq(cores.count, Object.keys(cores.categoryOf).length, "the core table count is its length");
  // The previous pass's three keys stay, under their own names.
  for (const k of ACCOUNTABILITY_KEYS) ok(!!win.ISSUE_MAP[k] && !!MAP[k] && allow.keys.includes(k), `${k} (accountability pass) went missing`);
  // Every register key is in the map; every map key is in the register; symmetric.
  for (const k of REG) ok(RELATED_ISSUE_KEYS.includes(k), `register key ${k} is not in the related-issues map`);
  for (const k of RELATED_ISSUE_KEYS) ok(!!win.ISSUE_MAP[k], `map key ${k} is not in the register`);
  for (const [k, list] of Object.entries(MAP)) {
    ok(new Set(list).size === list.length, `${k}: a related key is listed twice`);
    ok(!list.includes(k), `${k}: lists itself`);
    for (const r of list) ok((MAP[r] || []).includes(k), `the map is not symmetric: ${k} lists ${r}, ${r} does not list ${k}`);
  }
  // The two register copies stay byte-identical over the vocabulary region.
  const region = (src) => { const s = String(src), a = s.indexOf("    var ISSUE_MAP = {"); return s.slice(a, s.indexOf("window._pdxEvidenceCategor", a)); };
  eq(region(R("alignment-tool.js")), region(R("issue-map.js")), "alignment-tool.js and issue-map.js registers differ");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · site and generator in lockstep");
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
  // The scorer covers exactly the register, each new key under its register name.
  eq(JSON.stringify([...S.SCORED_TOPICS].sort()), JSON.stringify(REG), "the stance scorer's topics are not the register");
  for (const k of KEYS) {
    ok(S.hasRulesFor(k), `the scorer has no rules for ${k}`);
    eq(ISSUE_TOPIC_VOCAB[k] && ISSUE_TOPIC_VOCAB[k].label, NEW_KEYS[k].name, `${k}: scorer label`);
    eq(ISSUE_TOPIC_VOCAB[k] && ISSUE_TOPIC_VOCAB[k].pos, win.ISSUE_MAP[k] && win.ISSUE_MAP[k].chip, `${k}: scorer pos is not the register chip`);
  }
  // The stance chunks the site loads are exactly politician-stances.js.
  const src = stanceData(R("politician-stances.js"));
  const chunks = Object.assign({}, stanceData(R("politician-stances-core.js")), stanceData(R("politician-stances-ext.js")));
  eq(JSON.stringify(Object.keys(chunks).sort()), JSON.stringify(Object.keys(src).sort()), "the stance chunks do not carry every person in politician-stances.js");
  ok(Object.keys(src).every((p) => JSON.stringify(chunks[p]) === JSON.stringify(src[p])), "the stance chunks are not regenerated from politician-stances.js");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · keys only: no stance card, no drawer card, no conflicts line");
// ═════════════════════════════════════════════════════════════════════════════
{
  const all = [stanceData(R("politician-stances.js")), win.ISSUE_STANCE_DATA || {}];
  for (const d of all) for (const [pid, cards] of Object.entries(d)) for (const c of cards || []) ok(!KEYS.includes(c.issueKey), `${pid}: a stance card on ${c.issueKey}`);
  const sss = R("state-senate-stances.js");
  for (const k of KEYS) ok(!sss.includes(k), `state-senate-stances.js names ${k}`);
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
  const d = DECLARED_STANCE_PASSES.find((x) => x.pass === FAMILY_FAIRNESS_PASS);
  ok(!!d, `${FAMILY_FAIRNESS_PASS} is not a declared stance pass`);
  if (d) eq(JSON.stringify(d.pids), "[]", "the declared pass names people — it seeds no position");
  // Only a later keys-only pass (the civic rules & safety net keys) may follow it.
  const after = DECLARED_STANCE_PASSES.slice(DECLARED_STANCE_PASSES.findIndex((x) => x.pass === FAMILY_FAIRNESS_PASS) + 1);
  ok(after.every((x) => x.pass === "civic_rules_safety_net_keys_nov2026" && x.pids.length === 0), "a pass other than the declared later keys-only pass follows this one");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · nothing else moved; no route or gate; one shell version; no migration");
// ═════════════════════════════════════════════════════════════════════════════
{
  if (BASE("issue-map.js") == null) {
    console.log("     (no git baseline — byte-identity checks skipped)");
  } else {
    for (const f of ["alignment-tool.js", "issue-map.js"]) eq(withoutFamilyFairnessRegisterBlock(withoutPipelineStancesEdits(f, R(f))), BASE(f), `${f} changed outside the declared register block`);
    eq(withoutFamilyFairnessIssueKeys(R("db/issue-keys.json")), BASE("db/issue-keys.json"), "db/issue-keys.json moved by more than the two keys");
    eq(withoutFamilyFairnessCoreCategories(R("db/issue-core-categories.json")), BASE("db/issue-core-categories.json"), "db/issue-core-categories.json moved by more than the two keys");
    eq(withoutFamilyFairnessRelatedIssues(R("related-issues.js")), BASE("related-issues.js"), "related-issues.js changed outside the declared edits");
    eq(withoutFamilyFairnessTopicVocab(R("netlify/lib/stance-topic-vocab.mjs")), BASE("netlify/lib/stance-topic-vocab.mjs"), "the scorer vocabulary changed outside the declared block");
    const baseRel = (/RELATED_ISSUE_KEYS = (\[[^\n]*\]);/.exec(BASE("netlify/lib/related-issue-keys.mjs")) || [])[1];
    eq(JSON.stringify(withoutCivicKeysKeyList(RELATED_ISSUE_KEYS).filter((k) => !KEYS.includes(k))), JSON.stringify(JSON.parse(baseRel || "[]")), "netlify/lib/related-issue-keys.mjs moved by more than the two keys");
    // The previous pass's register lines are untouched.
    const reg = R("alignment-tool.js");
    for (const k of ACCOUNTABILITY_KEYS) {
      const line = (s) => (new RegExp(`\\n {6}${k}: [^\\n]*`).exec(String(s)) || [])[0];
      eq(line(reg), line(BASE("alignment-tool.js")), `${k}: its register line moved`);
      const mline = (src) => (new RegExp(`\\n {4}${k}: \\[[^\\]]*\\]`).exec(String(src)) || [])[0];
      eq(mline(R("related-issues.js")), mline(BASE("related-issues.js")), `${k}: its related-issues list moved`);
    }
    // Stance records, roster, drawer code, routes and documents.
    for (const f of ["politician-stances.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
      "cmp-data.js", "cmp-data-detail.js", "consistency.js", "stance-helpers.js", "word-action.js", "stance-sides.js", "my-stances.js",
      "voting-record.js", "acct-spotlight-data.js", "exec-action-data.js", "hero-showcase-data.js", "issue-scope.js", "person.html", "index.html", "issue.html",
      "netlify.toml", "_redirects", "db/vr-issue-seed.json", "db/bill-docs.json", "db/schema.ts", "sitemap.xml"]) {
      const b = BASE(f);
      let now = null; try { now = R(f); } catch { /* absent */ }
      now = withoutPipelineStancesEdits(f, now); // a later declared pass's edits aside
      eq(now, b, `${f} changed`);
    }
    // A tree's entries at a revision (git show REV:dir prints "tree …", a blank line, then one name per line; subtrees end in "/").
    const ls = (rev, dir) => (git(["show", `${rev}:${dir === "." ? "" : dir}`]) || "").split("\n").slice(2).filter(Boolean).map((n) => n.replace(/\/$/, "")).sort();
    const list = (dir) => { try { return readdirSync(join(ROOT, dir)).sort(); } catch { return []; } };
    eq(list(".").filter((f) => f.endsWith(".html")).join(","), ls(BASE_REV, ".").filter((f) => f.endsWith(".html")).join(","), "a document was added or removed");
    eq(withoutPipelineStancesEntries(list("netlify/functions")).join(","), ls(BASE_REV, "netlify/functions").join(","), "a function (route) was added or removed");
    eq(list("netlify/edge-functions").join(","), ls(BASE_REV, "netlify/edge-functions").join(","), "an edge function was added or removed");
    eq(withoutPipelineStancesEntries(list("netlify/database/migrations")).join(","), ls(BASE_REV, "netlify/database/migrations").join(","), "a migration was added or removed");
    for (const f of list("netlify/functions")) { const b = BASE(`netlify/functions/${f}`); if (b != null) eq(withoutPipelineStancesEdits(`netlify/functions/${f}`, R(`netlify/functions/${f}`)), b, `netlify/functions/${f} changed`); }

    // Precached files changed (the register and the map), so the shell moves
    // one version; worker code and precache list do not.
    const sw = R("sw.js"), baseSw = BASE("sw.js");
    const pre = (src) => (String(src).match(/^  '\/[^']*',$/gm) || []).map((l) => l.slice(4, -2));
    for (const f of ["alignment-tool.js", "issue-map.js", "related-issues.js"]) ok(pre(sw).includes(f), `${f} is not precached`);
    eq(swCodeOnly(sw), swCodeOnly(baseSw), "sw.js worker code or precache list changed");
    const ver = (src) => Number((/^const CACHE_VERSION = 'v(\d+)';$/m.exec(String(src)) || [])[1]);
    // v563 shipped the five keys; v564 is the cleanup.
    // v565 (the civic rules & safety net keys pass) moves it once more.
    eq(ver(sw), ver(baseSw) + 2 + (/^\/\/ v565 - FIVE CIVIC RULES & SAFETY NET KEYS\./m.test(sw) ? 1 : 0) + (/^\/\/ v566 - PROMOTED PIPELINE STANCE CARDS\./m.test(sw) ? PIPELINE_STANCES_SHELL_BUMPS : 0), `the shell did not move exactly two versions, plus the declared later pass (v${ver(baseSw)} → v${ver(sw)})`);
    ok(/v563 - FIVE FAMILY & ECONOMIC FAIRNESS KEYS\.[\s\S]*?MIGRATION COST: none\./.test(sw), "the v563 note is missing or does not say no migration");
    ok(/v564 - THREE OVERLAPPING KEYS REMOVED\.[\s\S]*?MIGRATION COST: none\./.test(sw), "the v564 note is missing or does not say no migration");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the cleanup: three overlapping keys gone, nothing else moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(JSON.stringify(FAMILY_FAIRNESS_REMOVED_KEYS), JSON.stringify(REMOVED), "the seams module declares a different removed list");
  const reg2 = boot(R("issue-map.js")).ISSUE_MAP || {};
  const allow = JSON.parse(R("db/issue-keys.json")), cores = JSON.parse(R("db/issue-core-categories.json"));
  const textFiles = ["alignment-tool.js", "issue-map.js", "related-issues.js", "netlify/lib/stance-topic-vocab.mjs", "netlify/lib/related-issue-keys.mjs",
    "db/issue-keys.json", "db/issue-core-categories.json", "politician-stances.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js"];
  for (const k of REMOVED) {
    ok(!win.ISSUE_MAP[k], `${k} is still in ISSUE_MAP (alignment-tool.js)`);
    ok(!reg2[k], `${k} is still in ISSUE_MAP (issue-map.js)`);
    ok(!(win.CORE_NATIONAL_ISSUES || []).some((c) => c.keys.includes(k)), `${k} is still under a core issue`);
    ok(!MAP[k], `${k} still has a related-issues list`);
    for (const [r, list] of Object.entries(MAP)) ok(!list.includes(k), `${r} still lists ${k}`);
    ok(!(k in ISSUE_TOPIC_VOCAB) && !S.hasRulesFor(k) && !S.SCORED_TOPICS.includes(k), `${k} is still in the scorer`);
    ok(!allow.keys.includes(k) && !(k in (allow.keywords || {})), `${k} is still in db/issue-keys.json`);
    ok(!(k in cores.categoryOf), `${k} is still in db/issue-core-categories.json`);
    ok(!RELATED_ISSUE_KEYS.includes(k), `${k} is still in netlify/lib/related-issue-keys.mjs`);
    for (const f of textFiles) ok(!R(f).includes(k), `${f} still names ${k}`);
  }
  // 130, plus the civic rules & safety net keys pass's five once it is in.
  const later = CIVIC_KEYS.filter((k) => allow.keys.includes(k)).length;
  eq(allow.count, 130 + later, "db/issue-keys.json holds 130 keys plus the later pass's");
  eq(cores.count, 130 + later, "db/issue-core-categories.json holds 130 keys plus the later pass's");
  if (FIVE("issue-map.js") == null) {
    console.log("     (no five-key commit — cleanup byte checks skipped)");
  } else {
    const fiveMap = (() => { const w = makeSandbox(); const c = vm.createContext(w); vm.runInContext(FIVE("alignment-tool.js"), c); vm.runInContext(FIVE("related-issues.js"), c); return { reg: w.ISSUE_MAP, map: w.PDXRelatedIssues.MAP }; })();
    // The kept keys — the two from this pass and the three from the one before — are unchanged.
    for (const k of [...KEYS, ...ACCOUNTABILITY_KEYS]) {
      eq(JSON.stringify(win.ISSUE_MAP[k]), JSON.stringify(fiveMap.reg[k]), `${k}: its register entry moved in the cleanup`);
      eq(JSON.stringify(MAP[k]), JSON.stringify(fiveMap.map[k]), `${k}: its related-issues list moved in the cleanup`);
      const ventry = (src) => (new RegExp(`\\n  ${k}: \\{ label: [\\s\\S]*?\\] \\},\\n`).exec(String(src)) || [])[0];
      ok(!!ventry(R("netlify/lib/stance-topic-vocab.mjs")) && ventry(R("netlify/lib/stance-topic-vocab.mjs")) === ventry(FIVE("netlify/lib/stance-topic-vocab.mjs")), `${k}: its scorer entry moved in the cleanup`);
      ok(!!ISSUE_TOPIC_VOCAB[k], `${k}: no scorer entry`);
    }
    // Every other register entry is the five-key commit's.
    eq(JSON.stringify(Object.keys(fiveMap.reg).filter((k) => !REMOVED.includes(k)).sort()), JSON.stringify(withoutCivicKeysKeyList(REG)), "the cleanup removed or added a key other than the three");
    for (const k of withoutCivicKeysKeyList(REG)) ok(JSON.stringify(win.ISSUE_MAP[k]) === JSON.stringify(fiveMap.reg[k]), `${k}: register entry moved in the cleanup`);
    // Every other map row is the five-key commit's with only the three keys taken out.
    for (const [k, list] of Object.entries(fiveMap.map)) {
      if (REMOVED.includes(k)) continue;
      eq(JSON.stringify(withoutCivicKeysKeyList(MAP[k])), JSON.stringify(list.filter((x) => !REMOVED.includes(x))), `${k}: map row moved by more than the cleanup`); // a later declared pass's keys aside
    }
    eq(withoutCivicKeysKeyList(Object.keys(MAP)).length, Object.keys(fiveMap.map).length - REMOVED.length, "the map gained or lost a row other than the three");
    // Stance records, roster, documents, drawer code and the precache list did not move.
    for (const f of ["politician-stances.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
      "cmp-data.js", "cmp-data-detail.js", "consistency.js", "stance-helpers.js", "word-action.js", "stance-sides.js", "my-stances.js",
      "hero-showcase-data.js", "issue-scope.js", "person.html", "index.html", "issue.html", "netlify.toml", "sitemap.xml", "db/schema.ts"]) {
      let now = null; try { now = R(f); } catch { /* absent */ }
      now = withoutPipelineStancesEdits(f, now); // a later declared pass's edits aside
      eq(now, FIVE(f), `${f} changed in the cleanup`);
    }
    const ls = (rev, dir) => (git(["show", `${rev}:${dir}`]) || "").split("\n").slice(2).filter(Boolean).map((n) => n.replace(/\/$/, "")).sort();
    const list = (dir) => { try { return readdirSync(join(ROOT, dir)).sort(); } catch { return []; } };
    for (const d of ["netlify/functions", "netlify/edge-functions", "netlify/database/migrations"]) eq(withoutPipelineStancesEntries(list(d)).join(","), ls(FIVE_REV, d).join(","), `${d}: an entry was added or removed in the cleanup`);
    eq(swCodeOnly(R("sw.js")), swCodeOnly(FIVE("sw.js")), "sw.js worker code or precache list changed in the cleanup");
    const ver = (src) => Number((/^const CACHE_VERSION = 'v(\d+)';$/m.exec(String(src)) || [])[1]);
    eq(ver(R("sw.js")), ver(FIVE("sw.js")) + 1 + (/^\/\/ v565 - FIVE CIVIC RULES & SAFETY NET KEYS\./m.test(R("sw.js")) ? 1 : 0), "the cleanup did not move the shell exactly one version (plus the declared later pass)");
    ok(relatedIssuesMapOnly(R("related-issues.js")) !== relatedIssuesMapOnly(FIVE("related-issues.js")), "fixture: the cleanup did move the map");
  }
}

if (failures.length) {
  console.error(`\n✗ family & economic fairness keys: ${failures.length} failure(s)\n  - ` + failures.slice(0, 40).join("\n  - "));
  process.exit(1);
}
console.log(`✓ family & economic fairness keys: all ${passed} assertions passed`);
