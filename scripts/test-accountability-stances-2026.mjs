#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-accountability-stances-2026.mjs — three accountability keys, stated
// ─────────────────────────────────────────────────────────────────────────────
// db/accountability-stances-2026-11.json records three sourced campaign-claim
// positions for Donald Trump on three issues the register did not have. This
// pass adds those keys to the issue register (ISSUE_MAP in alignment-tool.js and
// its verbatim copy issue-map.js), pairs each one both ways in the related-issues
// map, and files one card per position in politician-stances.js (regenerated
// into the stance chunks). The record spells issues with hyphens; the register
// spells keys with underscores (v103-chrome-seams.mjs#accountabilityIssueKey).
//
// WHAT THIS SUITE PROVES:
//   1. THE REGISTER AND THE MAP: each key is in ISSUE_MAP with its display name,
//      in db/issue-keys.json, under a core issue, and in the related-issues map
//      with the declared pairs both ways; the whole map stays symmetric.
//   2. THE RECORD IS THE DATA: each position in the record is a card on its key
//      with the record's side, marked a campaign claim, citing every source the
//      record names with its quote; the stance map publishes it.
//   3. THE DRAWER'S STATED LINE prints each position.
//   4. WHERE THIS CONFLICTS: a reader on the other side of a position gets a
//      line naming both issues, the stated side and the reader's; a reader on
//      the same side gets none.
//   5. NOTHING ELSE MOVED: every other stance entry, Trump's existing cards, the
//      ext chunk, the roster, the routes, the documents and the functions are
//      byte-identical to the base; the register and the map moved only by the
//      declared block; the shell moved one version for the precached files; no
//      migration.
//
//   node scripts/test-accountability-stances-2026.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { DECLARED_STANCE_PASSES, ACCOUNTABILITY_PID_OF, accountabilityIssueKey, withoutAccountabilityRegisterBlock, swCodeOnly, relatedIssuesMapOnly } from "./v103-chrome-seams.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
// The commit this pass was built on.
const BASE_REV = "2882618";
const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); } catch { return null; } };
const BASE = (f) => git(["show", `${BASE_REV}:${f}`]);

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`   ── ${t}`);

const PASS = "accountability_stances_nov2026";
const REC = JSON.parse(R("db/accountability-stances-2026-11.json"));
const NEW_KEYS = {
  public_health_vs_chemical_liability: { name: "Public Health vs. Chemical Company Liability", core: "healthcare", pairs: ["cost_living", "gov_regulation", "healthcare"] },
  epstein_files_transparency: { name: "Epstein Files Transparency", core: "checks_and_balances", pairs: ["gov_transparency"] },
  no_new_wars: { name: "No New Wars", core: "foreign_policy_defense", pairs: ["restraint", "war_powers", "strong_defense"] },
};
const KEYS = Object.keys(NEW_KEYS);
const SAYS = { support: "Stated: Supports", oppose: "Stated: Opposes" }; // the drawer header chip
const OTHER = { support: "oppose", oppose: "support" };

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
const stanceData = (src) => { const w = {}; w.window = w; vm.runInContext(String(src), vm.createContext(w)); return w.ISSUE_STANCE_DATA || {}; };
const issueMapOf = (src) => { const w = {}; w.window = w; vm.runInContext(String(src), vm.createContext(w)); return w.ISSUE_MAP || {}; };
const RI = win.PDXRelatedIssues, CS = win.PDXConsistency, MAP = (RI && RI.MAP) || {};
const lbl = (k) => String(win.ISSUE_MAP[k].label).replace(/^[^A-Za-z0-9]+/, "").trim();
const S = win.ISSUE_STANCE_DATA || {};
const PIDS = REC.members.map((m) => ACCOUNTABILITY_PID_OF[m.id]);
const POSITIONS = REC.members.flatMap((m) => m.positions.map((p) => ({ pid: ACCOUNTABILITY_PID_OF[m.id], key: accountabilityIssueKey(p.issue), p })));

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the new keys are in the register and in the related-issues map");
// ═════════════════════════════════════════════════════════════════════════════
{
  const reg = issueMapOf(R("issue-map.js"));
  const allow = JSON.parse(R("db/issue-keys.json"));
  const cores = JSON.parse(R("db/issue-core-categories.json"));
  const relKeys = R("netlify/lib/related-issue-keys.mjs");
  eq(JSON.stringify(POSITIONS.map((x) => x.key).sort()), JSON.stringify(KEYS.slice().sort()), "the record's issues are not exactly the three new keys");
  for (const k of KEYS) {
    const d = NEW_KEYS[k];
    ok(!!win.ISSUE_MAP[k], `${k} is not in ISSUE_MAP (alignment-tool.js)`);
    ok(!!reg[k], `${k} is not in ISSUE_MAP (issue-map.js)`);
    if (!win.ISSUE_MAP[k]) continue;
    eq(lbl(k), d.name, `${k}: display name`);
    eq(win.ISSUE_MAP[k].lean, undefined, `${k}: carries a lean`);
    ok(!/\bequity\b|utah[- ]first/i.test(win.ISSUE_MAP[k].label + " " + win.ISSUE_MAP[k].chip), `${k}: equity or Utah-first wording`);
    ok(allow.keys.includes(k), `${k} is not in db/issue-keys.json`);
    eq(cores.categoryOf[k], d.core, `${k}: core issue`);
    ok(relKeys.includes(`"${k}"`), `${k} is not in netlify/lib/related-issue-keys.mjs`);
    eq(JSON.stringify(MAP[k]), JSON.stringify(d.pairs), `${k}: its related-issues list`);
    for (const r of d.pairs) {
      ok(!!win.ISSUE_MAP[r], `${k} pairs with ${r}, which is not in the register`);
      ok((MAP[r] || []).includes(k), `${r} does not list ${k} back`);
      eq((MAP[r] || []).slice(-1)[0] === k || KEYS.some((o) => o !== k && (MAP[r] || []).slice(-1)[0] === o), true, `${r}: ${k} is not appended at the end of its list`);
    }
  }
  eq(allow.count, allow.keys.length, "the allow-list count is its length");
  const base = BASE("db/issue-keys.json");
  if (base != null) eq(JSON.stringify(allow.keys), JSON.stringify(JSON.parse(base).keys.concat(KEYS).sort()), "db/issue-keys.json moved by more than the three keys");
  // The whole map stays symmetric and names only register keys.
  for (const [k, list] of Object.entries(MAP)) {
    ok(!!win.ISSUE_MAP[k], `map key ${k} is not in the register`);
    for (const r of list) ok((MAP[r] || []).includes(k), `the map is not symmetric: ${k} lists ${r}, ${r} does not list ${k}`);
  }
  // The two register copies stay byte-identical over the vocabulary region.
  const region = (src) => { const s = String(src), a = s.indexOf("    var ISSUE_MAP = {"); return s.slice(a, s.indexOf("window._pdxEvidenceCategor", a)); };
  eq(region(R("alignment-tool.js")), region(R("issue-map.js")), "alignment-tool.js and issue-map.js registers differ");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · each position in the record is a sourced campaign-claim card");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(REC.pass, "accountability-stances-2026-11", "record pass");
  const d = DECLARED_STANCE_PASSES.find((x) => x.pass === PASS);
  ok(!!d, `${PASS} is not a declared stance pass`);
  if (d) eq(JSON.stringify(d.pids), JSON.stringify(PIDS), "the declared pids are not the record's");
  for (const m of REC.members) {
    const pid = ACCOUNTABILITY_PID_OF[m.id];
    ok(!!pid && !!win.CMP_DATA[pid], `${m.id} does not resolve to a roster entry`);
    if (pid && win.CMP_DATA[pid]) ok(String(win.CMP_DATA[pid].name).includes(m.name), `${pid}: roster name is not ${m.name}`);
  }
  const src = stanceData(R("politician-stances.js")), core = stanceData(R("politician-stances-core.js")), ext = stanceData(R("politician-stances-ext.js"));
  for (const pid of PIDS) ok(JSON.stringify(Object.assign({}, core, ext)[pid]) === JSON.stringify(src[pid]), `${pid}: the chunks are not regenerated from politician-stances.js`);
  for (const { pid, key, p } of POSITIONS) {
    const cards = (S[pid] || []).filter((c) => c.issueKey === key);
    if (!eq(cards.length, 1, `${pid} × ${key}: card count`)) continue;
    const c = cards[0];
    eq(c.issueStance, p.value, `${pid} × ${key}: side`);
    eq(c.pos, p.value, `${pid} × ${key}: pos`);
    eq(c.claim, "campaign", `${pid} × ${key}: not marked a campaign claim`);
    ok(c.source && /^https:\/\//.test(c.source.url || "") && c.source.label, `${pid} × ${key}: no source`);
    ok(typeof c.text === "string" && c.text.length > 20 && c.text.length <= 240, `${pid} × ${key}: text missing or too long`);
    ok(!/\bequity\b|utah[- ]first/i.test(c.text + " " + c.topic + " " + (c.evidence || "")), `${pid} × ${key}: equity or Utah-first wording`);
    eq((c.sources || []).length, p.sources.length, `${pid} × ${key}: sources count`);
    p.sources.forEach((s, i) => {
      const cs = (c.sources || [])[i] || {};
      eq(cs.link, s.link, `${pid} × ${key} source ${i}: link`);
      eq(cs.date, s.date, `${pid} × ${key} source ${i}: date`);
      eq(cs.type, s.type, `${pid} × ${key} source ${i}: type`);
      ok(String(cs.excerpt || "").includes(s.quote), `${pid} × ${key} source ${i}: the record's quote is not the excerpt`);
    });
    const pm = win._polPositionMap(pid, win.CMP_DATA[pid]) || {};
    eq(pm[key] && pm[key].stance, p.value, `${pid} × ${key}: the stance map does not publish the position`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the drawer's stated line reads each position");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const { pid, key, p } of POSITIONS) {
    const h = (CS && CS.gapViewHtml(pid, key)) || "";
    ok(h.includes(SAYS[p.value]), `${pid} × ${key}: the drawer does not print "${SAYS[p.value]}"`);
    ok(h.includes(NEW_KEYS[key].name), `${pid} × ${key}: the drawer does not name the issue`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · where this conflicts: the other side gets a line, the same side none");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const { pid, key, p } of POSITIONS) {
    const prof = win.CMP_DATA[pid];
    let hits = 0;
    for (const r of NEW_KEYS[key].pairs) {
      // The reader stands against the stated position on the new key only.
      win.PDXStanceSides = { list: () => [{ key, position: OTHER[p.value], priority: "medium" }] };
      const c = (RI.conflictsFor(pid, prof, r) || []).find((x) => x.bKey === key);
      if (!ok(!!c, `${pid} × ${r} · ${key}: no conflicts line for an opposite-side reader`)) continue;
      eq(RI.conflictText(c), `${lbl(r)} and ${lbl(key)}: on ${lbl(key)} they ${p.value}; you ${OTHER[p.value]}.`,
        `${pid} × ${r} · ${key}: the line does not name both issues, the stated side and the reader's`);
      eq(c.sides[0].how, "stated", `${pid} × ${r} · ${key}: the conflict is not read from the stated position`);
      const h = CS.gapViewHtml(pid, r) || "";
      ok(h.includes(`data-pdxri-cf="${key}"`), `${pid} × ${r}: the drawer does not print the conflicts line for ${key}`);
      // A reader on the same side gets no conflict.
      win.PDXStanceSides = { list: () => [{ key, position: p.value, priority: "medium" }] };
      eq((RI.conflictsFor(pid, prof, r) || []).length, 0, `${pid} × ${r} · ${key}: a same-side reader still gets a conflict`);
      ok(!(CS.gapViewHtml(pid, r) || "").includes(`data-pdxri-cf="${key}"`), `${pid} × ${r}: the drawer prints a conflict for a same-side reader`);
      hits++;
    }
    eq(hits, NEW_KEYS[key].pairs.length, `${pid} × ${key}: not every pair reached the conflicts check`);
    // The new key's own drawer, where it lists a related issue, reads the same way.
    win.PDXStanceSides = { list: () => [{ key, position: OTHER[p.value], priority: "medium" }] };
    const own = RI.conflictsFor(pid, prof, key);
    if (own && own.length) for (const c of own) ok(RI.conflictText(c).startsWith(`${lbl(key)} and `) && RI.conflictText(c).includes(`on ${lbl(key)} they ${p.value}; you ${OTHER[p.value]}.`), `${pid} × ${key}: own-drawer line ${RI.conflictText(c)}`);
    win.PDXStanceSides = { list: () => [{ key, position: p.value, priority: "medium" }] };
    eq((RI.conflictsFor(pid, prof, key) || []).length, 0, `${pid} × ${key}: a same-side reader gets a conflict in the key's own drawer`);
  }
  delete win.PDXStanceSides;
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · nothing else moved; no route or gate; one shell version; no migration");
// ═════════════════════════════════════════════════════════════════════════════
{
  const base = BASE("politician-stances.js");
  if (base == null) {
    console.log("     (no git baseline — byte-identity checks skipped)");
  } else {
    // People a LATER declared stance pass moved are that pass's product.
    const own = DECLARED_STANCE_PASSES.findIndex((x) => x.pass === PASS);
    const later = new Set(DECLARED_STANCE_PASSES.slice(own + 1).flatMap((x) => x.pids));
    const before = stanceData(base), after = stanceData(R("politician-stances.js"));
    eq(JSON.stringify(Object.keys(after).filter((p) => !later.has(p)).sort()), JSON.stringify(Object.keys(before).filter((p) => !later.has(p)).sort()), "a person was added to or removed from the stance data");
    ok(Object.keys(before).filter((p) => !PIDS.includes(p) && !later.has(p)).every((p) => JSON.stringify(before[p]) === JSON.stringify(after[p])), "another person's stance entries changed");
    for (const pid of PIDS) {
      if (later.has(pid)) continue;
      const b = before[pid] || [], a = after[pid] || [];
      eq(JSON.stringify(a.slice(0, b.length)), JSON.stringify(b), `${pid}: an existing card changed or moved`);
      eq(JSON.stringify(a.slice(b.length).map((c) => c.issueKey)), JSON.stringify(POSITIONS.filter((x) => x.pid === pid).map((x) => x.key)), `${pid}: the appended cards are not the record's, in order`);
    }
    if (!later.size) eq(R("politician-stances-ext.js"), BASE("politician-stances-ext.js"), "politician-stances-ext.js changed");

    // The register moved only by the three declared entries and their core slots.
    const stripReg = withoutAccountabilityRegisterBlock;
    for (const f of ["alignment-tool.js", "issue-map.js"]) eq(stripReg(R(f)), BASE(f), `${f} changed outside the declared register block`);
    // The related-issues module moved only by its declared edits.
    const edits = JSON.parse(R("scripts/related-issues-declared-edits-accountability-2026-11.json")).edits;
    let ri = R("related-issues.js");
    for (const e of edits) { ok(ri.split(e.after).length === 2, `related-issues.js: a declared edit is not there exactly once`); ri = ri.replace(e.after, () => e.before); }
    eq(ri, BASE("related-issues.js"), "related-issues.js changed outside the declared edits");
    ok(relatedIssuesMapOnly(R("related-issues.js")) !== relatedIssuesMapOnly(BASE("related-issues.js")), "fixture: the map did move");

    // Roster, drawer code, routes and documents.
    for (const f of ["cmp-data.js", "cmp-data-detail.js", "state-senate-stances.js", "consistency.js", "stance-helpers.js", "word-action.js",
      "stance-sides.js", "my-stances.js", "voting-record.js", "acct-spotlight-data.js", "exec-action-data.js", "person.html", "index.html", "issue.html",
      "netlify.toml", "_redirects", "db/vr-issue-seed.json", "db/bill-docs.json", "db/schema.ts"]) {
      const b = BASE(f);
      let now = null; try { now = R(f); } catch { /* absent */ }
      eq(now, b, `${f} changed`);
    }
    const ls = (rev, dir) => (git(["ls-tree", "--name-only", `${rev}:${dir}`]) || "").split("\n").filter(Boolean).sort();
    const baseRoot = ls(BASE_REV, ".");
    if (baseRoot.length) {
      eq(readdirSync(ROOT).filter((f) => f.endsWith(".html")).sort().join(","), baseRoot.filter((f) => f.endsWith(".html")).join(","), "a document was added or removed");
      let fn = []; try { fn = readdirSync(join(ROOT, "netlify/functions")).sort(); } catch { /* none */ }
      eq(fn.join(","), ls(BASE_REV, "netlify/functions").join(","), "a function (route) was added or removed");
      let ef = []; try { ef = readdirSync(join(ROOT, "netlify/edge-functions")).sort(); } catch { /* none */ }
      eq(ef.join(","), ls(BASE_REV, "netlify/edge-functions").join(","), "an edge function was added or removed");
      let mg = []; try { mg = readdirSync(join(ROOT, "netlify/database/migrations")).sort(); } catch { /* none */ }
      eq(mg.join(","), ls(BASE_REV, "netlify/database/migrations").join(","), "a migration was added or removed");
    }

    // Precached files changed (the register, the map, the core stance chunk),
    // so the shell moves one version; worker code and precache list do not.
    const sw = R("sw.js"), baseSw = BASE("sw.js");
    const pre = (src) => (String(src).match(/^  '\/[^']*',$/gm) || []).map((l) => l.slice(4, -2));
    for (const f of ["alignment-tool.js", "issue-map.js", "related-issues.js", "politician-stances-core.js"]) ok(pre(sw).includes(f), `${f} is not precached`);
    ok(!pre(sw).includes("politician-stances-ext.js"), "the ext chunk is precached");
    eq(swCodeOnly(sw), swCodeOnly(baseSw), "sw.js worker code or precache list changed");
    const ver = (src) => Number((/^const CACHE_VERSION = 'v(\d+)';$/m.exec(String(src)) || [])[1]);
    ok(later.size ? ver(sw) >= ver(baseSw) + 1 : ver(sw) === ver(baseSw) + 1, `the shell did not move exactly one version (v${ver(baseSw)} → v${ver(sw)})`);
    ok(/v562 - THREE ACCOUNTABILITY KEYS, STATED\.[\s\S]*?MIGRATION COST: none\./.test(sw), "the v562 note is missing or does not say no migration");
  }
}

if (failures.length) {
  console.error(`\n✗ accountability stances: ${failures.length} failure(s)\n  - ` + failures.slice(0, 40).join("\n  - "));
  process.exit(1);
}
console.log(`✓ accountability stances: all ${passed} assertions passed`);
