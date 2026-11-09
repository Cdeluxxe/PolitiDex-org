#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-newly-elected-state-legislative-stated-2026.mjs — stated positions for
// the State Senate and State House members elected November 3, 2026 on seats
// whose district board already exists
// ─────────────────────────────────────────────────────────────────────────────
// db/newly-elected-state-legislative-stated-2026-11.json names the winners the
// roster held as candidate rows with no stance entries, each on a seat with a
// board, and politician-stances.js (regenerated into politician-stances-ext.js)
// files each one's own published positions on existing issue keys, marked
// claim:'campaign'. Same shape as the federal pass
// (scripts/test-newly-elected-stated-2026.mjs).
//
// WHAT THIS SUITE PROVES:
//   1. THE SET: every member in the defined set below is on the roster, sits on
//      a seat whose board exists, and holds stated positions (support / oppose)
//      on existing issue keys, each sourced from the campaign page the record
//      names and marked a campaign claim, not a vote. Every key is in the issue
//      register and in the related-issues map.
//   2. THE DRAWER'S STATED LINE: for every one of those positions the drawer
//      prints "Stated: Supports|Opposes", and the related-issues block lists a
//      related stated issue as "<issue>: supports · no record".
//   3. WHERE THIS CONFLICTS: a reader on the opposite side of a related pair
//      gets a conflicts line naming both issues, the member's stated side and
//      the reader's side, and the drawer prints it.
//   4. NOTHING ELSE MOVED: every other person's stance entries, the core chunk,
//      the roster, the related-issues map, the drawer code, the routes and the
//      documents are byte-identical to the base; the sitemap lists the set's
//      person pages. No precached file changed, so the shell does not move; no
//      migration.
//
//   node scripts/test-newly-elected-state-legislative-stated-2026.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { DECLARED_STANCE_PASSES, swCodeOnly, withoutWave5RosterRows } from "./v103-chrome-seams.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
// The commit this pass was built on.
const BASE_REV = "b955e65";
const BASE = (f) => {
  try { return execFileSync("git", ["show", `${BASE_REV}:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};
const BASE_LS = () => {
  try { return execFileSync("git", ["ls-tree", "--name-only", BASE_REV], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n").filter(Boolean); }
  catch { return null; }
};

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`   ── ${t}`);

// The defined set: at least these newly elected state legislators carry stated positions.
const SENATE = ["theresa_brooks"];
const HOUSE = ["jaime_churches", "jan_maino", "alex_hawkins", "joseph_mcclusky", "sarah_pounds"];
const SET = SENATE.concat(HOUSE);
// Members whose stated positions include a pair the related-issues map holds,
// so a conflicts line is reachable on stated positions alone.
const CONFLICT_SET = ["theresa_brooks", "jaime_churches", "jan_maino", "joseph_mcclusky", "sarah_pounds"];

const REC = JSON.parse(R("db/newly-elected-state-legislative-stated-2026-11.json"));
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js", "issue-colors.js",
  "related-issues.js",
];
function boot() {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { win.__err = `${f}: ${e.message}`; }
  }
  win.PROFILES = win.CMP_DATA;
  return win;
}
const stanceData = (src) => { const w = {}; w.window = w; vm.runInContext(src, vm.createContext(w)); return w.ISSUE_STANCE_DATA || {}; };
const text = (h) => String(h || "").replace(/<span class="pdxri-ico"[^>]*>[^<]*<\/span> /g, "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const block = (h) => (/<div class="pdxri pdxri-drawer"[\s\S]*?<\/ul><\/div>/.exec(h) || [""])[0];
const lines = (h) => [...block(h).matchAll(/<li class="pdxri-item"[\s\S]*?<\/li>/g)].map((m) => text(m[0]));
const WORD = { support: "supports", oppose: "opposes" };
const SAYS = { support: "Stated: Supports", oppose: "Stated: Opposes" }; // the drawer header chip (v542)
const OTHER = { support: "oppose", oppose: "support" };

const win = boot();
if (win.__err) failures.push(`boot: ${win.__err}`);
const RI = win.PDXRelatedIssues, CS = win.PDXConsistency, MAP = RI && RI.MAP;
const lbl = (k) => String(win.ISSUE_MAP[k].label).replace(/^[^A-Za-z0-9]+/, "").trim();
const S = win.ISSUE_STANCE_DATA;

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the defined set holds stated positions on existing issue keys");
// ═════════════════════════════════════════════════════════════════════════════
{
  const recPids = (REC.members || []).map((m) => m.pid);
  for (const pid of SET) ok(recPids.includes(pid), `${pid} is not in db/newly-elected-state-legislative-stated-2026-11.json`);
  ok(SET.length >= 6, "the defined set shrank");
  // Only State Senate and State House seats, each with a board that already exists.
  for (const m of REC.members || []) {
    ok(/^[a-z]{2}-state(senate|house)-\d+$/.test(m.seat || ""), `${m.pid}: not a state legislative seat (${m.seat})`);
    const short = String(m.seat).replace("statesenate", "sd").replace("statehouse", "hd");
    ok(existsSync(join(ROOT, `district-${short}.html`)), `${m.pid}: no existing board for ${m.seat}`);
    ok(BASE(`district-${short}.html`) != null || BASE_LS() == null, `${m.pid}: the board for ${m.seat} was opened by this pass`);
    const p = win.CMP_DATA[m.pid] || {};
    ok(p.state && m.office.indexOf(p.state) === 0 && String(p.district) === m.seat.split("-").pop(), `${m.pid}: the roster row is not on ${m.seat}`);
    ok(/^https:\/\//.test(m.source || ""), `${m.pid}: no campaign source`);
    for (const e of S[m.pid] || []) eq(e.source && e.source.url, m.source, `${m.pid} × ${e.issueKey}: not sourced from the campaign page the record names`);
  }
  const ext = stanceData(R("politician-stances-ext.js"));
  const src = stanceData(R("politician-stances.js"));
  for (const m of REC.members || []) {
    const pid = m.pid, list = S[pid] || [];
    ok(!!win.CMP_DATA[pid], `${pid} is not on the roster`);
    ok(/^https:\/\//.test(m.raceCall || ""), `${pid} has no race-call source`);
    ok(list.length >= 1, `${pid} has no stated positions`);
    ok(JSON.stringify(ext[pid]) === JSON.stringify(src[pid]), `${pid}: the ext chunk is not regenerated from politician-stances.js`);
    const keys = list.map((e) => e.issueKey);
    eq(keys.length, new Set(keys).size, `${pid} files two entries on one key`);
    eq(JSON.stringify(keys), JSON.stringify(m.issueKeys), `${pid}: the record's issue keys do not match the data`);
    for (const e of list) {
      ok(!!win.ISSUE_MAP[e.issueKey], `${pid}: ${e.issueKey} is not an existing issue key`);
      ok(Array.isArray(MAP && MAP[e.issueKey]), `${pid}: ${e.issueKey} is not in the related-issues map`);
      ok(e.issueStance === "support" || e.issueStance === "oppose", `${pid} × ${e.issueKey}: stance is not support/oppose`);
      eq(e.claim, "campaign", `${pid} × ${e.issueKey}: not marked a campaign claim`);
      ok(e.source && /^https:\/\//.test(e.source.url || "") && e.source.label, `${pid} × ${e.issueKey}: no source`);
      ok(typeof e.text === "string" && e.text.length > 20 && e.text.length <= 240, `${pid} × ${e.issueKey}: text missing or too long`);
      ok(!/\bequity\b|utah[- ]first/i.test(e.text + " " + e.topic), `${pid} × ${e.issueKey}: equity or Utah-first wording`);
    }
    const pm = win._polPositionMap(pid, win.CMP_DATA[pid]) || {};
    for (const e of list) eq(pm[e.issueKey] && pm[e.issueKey].stance, e.issueStance, `${pid} × ${e.issueKey}: the stance map does not publish the stated position`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the drawer's stated line reads the new positions");
// ═════════════════════════════════════════════════════════════════════════════
{
  let related = 0;
  for (const pid of SET) {
    const list = S[pid] || [];
    for (const e of list) {
      const h = CS.gapViewHtml(pid, e.issueKey) || "";
      ok(h.includes(SAYS[e.issueStance]), `${pid} × ${e.issueKey}: the drawer does not print "${SAYS[e.issueStance]}"`);
      const ln = lines(h);
      for (const o of list) {
        if (o === e || !(MAP[e.issueKey] || []).includes(o.issueKey)) continue;
        ok(ln.includes(`${lbl(o.issueKey)}: ${WORD[o.issueStance]} · no record`),
          `${pid} × ${e.issueKey}: the related line for ${o.issueKey} does not read stated — ${JSON.stringify(ln)}`);
        related++;
      }
    }
  }
  ok(related >= CONFLICT_SET.length * 2, `too few related stated lines (${related})`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · a stance against a stated position produces a conflicts line");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const pid of CONFLICT_SET) {
    const list = S[pid] || [];
    let hit = false;
    for (const e of list) {
      const o = list.find((x) => x !== e && (MAP[e.issueKey] || []).includes(x.issueKey));
      if (!o) continue;
      // The reader stands against the related issue's stated position only.
      win.PDXStanceSides = { list: () => [{ key: o.issueKey, position: OTHER[o.issueStance], priority: "medium" }] };
      const c = (RI.conflictsFor(pid, win.CMP_DATA[pid], e.issueKey) || []).find((x) => x.bKey === o.issueKey);
      if (!ok(!!c, `${pid} × ${e.issueKey} · ${o.issueKey}: no conflicts line`)) continue;
      eq(RI.conflictText(c), `${lbl(e.issueKey)} and ${lbl(o.issueKey)}: on ${lbl(o.issueKey)} they ${o.issueStance}; you ${OTHER[o.issueStance]}.`,
        `${pid} × ${e.issueKey} · ${o.issueKey}: the line does not name both issues, the stated side and the reader's`);
      eq(c.sides[0].how, "stated", `${pid}: the conflict is not read from the stated position`);
      const h = CS.gapViewHtml(pid, e.issueKey) || "";
      ok(h.includes(`data-pdxri-cf="${o.issueKey}"`), `${pid} × ${e.issueKey}: the drawer does not print the conflicts line`);
      // A reader on the same side gets no conflict.
      win.PDXStanceSides = { list: () => [{ key: o.issueKey, position: o.issueStance, priority: "medium" }] };
      eq((RI.conflictsFor(pid, win.CMP_DATA[pid], e.issueKey) || []).length, 0, `${pid} × ${e.issueKey}: an agreeing reader still gets a conflict`);
      hit = true;
      break;
    }
    ok(hit, `${pid}: no stated pair reached the conflicts check`);
  }
  delete win.PDXStanceSides;
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · nothing else moved; no new route or gate; no shell move, no migration");
// ═════════════════════════════════════════════════════════════════════════════
{
  const base = BASE("politician-stances.js");
  if (base == null) {
    console.log("     (no git baseline — byte-identity checks skipped)");
  } else {
    const before = stanceData(base), after = stanceData(R("politician-stances.js"));
    for (const pid of SET) ok(!(pid in before), `${pid} already had stance entries at the base`);
    const others = Object.keys(before);
    ok(others.every((pid) => JSON.stringify(before[pid]) === JSON.stringify(after[pid])), "another person's stance entries changed");
    // People a LATER declared stance pass added (v103-chrome-seams.mjs) are that
    // pass's product, pinned by its own suite.
    const own = DECLARED_STANCE_PASSES.findIndex((d) => d.pass === "newly_elected_state_legislative_stated_nov2026");
    const later = new Set(DECLARED_STANCE_PASSES.slice(own + 1).flatMap((d) => d.pids));
    eq(Object.keys(after).filter((pid) => !later.has(pid)).length, others.length + SET.length, "a person other than the set was added");
    for (const f of ["politician-stances-core.js", "cmp-data.js", "cmp-data-detail.js", "related-issues.js", "consistency.js",
      "stance-sides.js", "my-stances.js", "voting-record.js", "person.html", "index.html", "issue.html", "ballot.html", "netlify.toml", "_redirects"]) {
      const b = BASE(f);
      let now = null; try { now = R(f); } catch { /* absent */ }
      // A later pass's declared roster block (wave 5) is that pass's product.
      if (f === "cmp-data.js") now = withoutWave5RosterRows(now);
      eq(now, b, `${f} changed`);
    }
    const ls = BASE_LS();
    if (ls) {
      const htmlNow = readdirSync(ROOT).filter((f) => f.endsWith(".html")).sort();
      const htmlBase = ls.filter((f) => f.endsWith(".html")).sort();
      eq(htmlNow.length, htmlBase.length, "a document was added or removed");
      const fnDir = join(ROOT, "netlify/functions");
      let fnNow = []; try { fnNow = readdirSync(fnDir); } catch { /* none */ }
      let fnBase = [];
      try { fnBase = execFileSync("git", ["ls-tree", "--name-only", `${BASE_REV}:netlify/functions`], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n").filter(Boolean); } catch { /* none */ }
      eq(fnNow.sort().join(","), fnBase.sort().join(","), "a function (route) was added or removed");
    }
  }
  // No precached file changed: politician-stances-core.js (the precached chunk)
  // is byte-identical, and politician-stances-ext.js and sitemap.xml are runtime
  // entries. So the shell does not move and nothing is migrated.
  const sw = R("sw.js");
  const pre = (sw.match(/^  '\/[^']*',$/gm) || []).map((l) => l.slice(4, -2));
  ok(pre.includes("politician-stances-core.js"), "fixture: the precache list");
  ok(!pre.includes("politician-stances-ext.js") && !pre.includes("sitemap.xml"), "a file this pass changed is precached");
  const baseSw = BASE("sw.js");
  if (baseSw != null) {
    // A later pass may move the shell for its own precached file; the worker
    // code and the precache list still compare.
    eq(swCodeOnly(sw), swCodeOnly(baseSw), "sw.js changed although no precached file did");
    eq(R("politician-stances-core.js"), BASE("politician-stances-core.js"), "the precached stance chunk changed");
  }
  const sm = R("sitemap.xml");
  for (const pid of SET) ok(sm.includes(`<loc>https://politidex.fyi/p/${pid}</loc>`), `${pid}: the sitemap does not list the person page`);
  let migs = []; try { migs = readdirSync(join(ROOT, "netlify/database/migrations")); } catch { /* none */ }
  for (const f of migs) ok(BASE(`netlify/database/migrations/${f}`) != null, `${f}: a migration this pass added`);
}

if (failures.length) {
  console.error(`\n✗ newly-elected state legislative stated: ${failures.length} failure(s)\n  - ` + failures.slice(0, 40).join("\n  - "));
  process.exit(1);
}
console.log(`✓ newly-elected state legislative stated: all ${passed} assertions passed`);
