#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-newly-elected-state-legislative-stated-2026-wave6.mjs — stated positions
// for the New York, Ohio, Pennsylvania and Texas State Senate, State House and
// (New York) State Assembly members elected November 3, 2026 on seats whose
// district board already exists. Same shape as the Wisconsin, Illinois, North
// Carolina, Georgia and Florida wave
// (scripts/test-newly-elected-state-legislative-stated-2026-wave5.mjs): the
// roster held no row for the winner (the board's ballot file names each one as a
// challenger, by name only), so this pass ADMITS one identity row each in
// cmp-data.js, declared in scripts/v103-chrome-seams.mjs (DECLARED_ADMISSIONS).
// Four states, not five: the only other states with boards (Arizona, California,
// Washington) had no published call in any board race; the record says so.
// ─────────────────────────────────────────────────────────────────────────────
// db/newly-elected-state-legislative-stated-2026-11-wave6.json names the set,
// each member's seat, campaign source, race call and issue keys, and everyone
// considered and left out with the reason. politician-stances.js (regenerated
// into politician-stances-ext.js) files each one's own published positions on
// existing issue keys, marked claim:'campaign'.
//
// WHAT THIS SUITE PROVES:
//   1. THE SET: every member is on the roster, as a candidate row this pass
//      admitted and nothing else; sits on a seat whose board existed at the base
//      and whose ballot file names them as the challenger; and holds stated
//      positions (support / oppose) on existing issue keys, each sourced from the
//      campaign page the record names, quoting it, and marked a campaign claim.
//      Every key is in the issue register and in the related-issues map. The four
//      states are new to these waves.
//   2. THE DRAWER'S STATED LINE: for every one of those positions the drawer
//      prints "Stated: Supports|Opposes", and the related-issues block lists a
//      related stated issue as "<issue>: supports · no record".
//   3. WHERE THIS CONFLICTS: a reader on the opposite side of a related pair
//      gets a conflicts line naming both issues, the member's stated side and
//      the reader's side, and the drawer prints it.
//   4. NOTHING ELSE MOVED: with the declared block carved out, cmp-data.js is
//      byte-identical to the base; every other person's stance entries, the core
//      chunk, the related-issues map, the drawer code, the boards, the ballot
//      files, the routes and the documents are byte-identical; the sitemap lists
//      the set's person pages. cmp-data.js is precached, so the shell moves one
//      version with a no-migration note and an unchanged precache list.
//
//   node scripts/test-newly-elected-state-legislative-stated-2026-wave6.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { DECLARED_STANCE_PASSES, DECLARED_ADMISSIONS, carveDeclaredAdmissions, relatedIssuesMapOnly, gapFillKeys, declaredPin, withoutHeroCrawl } from "./v103-chrome-seams.mjs";
// A later declared admission is that pass's product, pinned by its own suite.
const LATER_ADMITTED = DECLARED_ADMISSIONS.slice(DECLARED_ADMISSIONS.findIndex((d) => d.wave === "newly_elected_state_legislators_wave6_nov2026") + 1).flatMap((d) => d.pids);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
// The commit this pass was built on.
const BASE_REV = "f272800";
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
const NEW_YORK = ["joe_rand", "sarah_rogerson", "chris_mccreight", "chloe_pierce"];
const OHIO = ["megan_coy", "rose_lounsbury", "shelby_kimball"];
const PENNSYLVANIA = ["mark_pinsley", "chris_thomas_pa", "bryan_allen", "jeff_warren_pa", "kristin_egan", "elizabeth_moro"];
const TEXAS = ["stephanie_guerrero_saenz", "oziel_ochoa", "chris_jimenez", "zach_herbert", "zack_dunn", "tyler_smith"];
const SET = NEW_YORK.concat(OHIO, PENNSYLVANIA, TEXAS);
// Members whose stated positions include a pair the related-issues map holds,
// so a conflicts line is reachable on stated positions alone.
const NO_PAIR = ["mark_pinsley", "kristin_egan", "elizabeth_moro", "zach_herbert", "zack_dunn"];
const CONFLICT_SET = SET.filter((p) => !NO_PAIR.includes(p));
const EARLIER = ["mi", "co", "nv", "mn", "tn", "me", "ne", "ri", "id", "ak", "mt", "sd", "vt", "ut", "wi", "il", "nc", "ga", "fl"];
const BALLOT = { ny: "ny-ballot-2026.js", oh: "oh-ballot-2026.js", pa: "pa-ballot-2026.js", tx: "tx-ballot-2026.js" };
const REC = JSON.parse(R("db/newly-elected-state-legislative-stated-2026-11-wave6.json"));
const BASE_CMP = BASE("cmp-data.js");
const ADMIT = DECLARED_ADMISSIONS.find((d) => d.wave === "newly_elected_state_legislators_wave6_nov2026");
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

// The core stance chunk with the people a LATER declared stance pass moved set
// aside (v103-chrome-seams.mjs): their cards are that pass's product, pinned by
// its own suite. Every other person's entries still compare byte for byte.
const coreSansLater = (src) => {
  if (src == null) return src;
  const own = DECLARED_STANCE_PASSES.findIndex((d) => d.pass === "newly_elected_state_legislative_stated_nov2026_wave6");
  const later = new Set(DECLARED_STANCE_PASSES.slice(own + 1).flatMap((d) => d.pids));
  const w = {}; w.window = w; vm.runInContext(String(src), vm.createContext(w));
  const t = w.ISSUE_STANCE_DATA || {};
  return JSON.stringify(Object.keys(t).filter((p) => !later.has(p)).map((p) => [p, t[p]]));
};
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
  for (const pid of SET) ok(recPids.includes(pid), `${pid} is not in db/newly-elected-state-legislative-stated-2026-11-wave6.json`);
  ok(SET.length >= 19, "the defined set shrank");
  eq(recPids.length, SET.length, "the record names members outside the defined set");
  // Four states beyond the nineteen earlier waves covered; every other state
  // with a board is named as not covered, with the reason.
  const states = new Set((REC.members || []).map((m) => m.seat.split("-")[0]));
  ok(states.size === 4 && !EARLIER.some((s) => states.has(s)), `the wave covers ${[...states].join(", ")}`);
  for (const st of ["az", "ca", "wa"]) ok(typeof (REC.statesNotCovered || {})[st] === "string" && REC.statesNotCovered[st].length > 20, `${st}: a state with boards is neither covered nor explained`);
  eq(JSON.stringify([...states].sort()), JSON.stringify([...REC.states].sort()), "the record's states do not match its members");
  // No member of this wave was already in an earlier wave.
  for (const f of ["db/newly-elected-state-legislative-stated-2026-11.json", "db/newly-elected-state-legislative-stated-2026-11-wave2.json",
    "db/newly-elected-state-legislative-stated-2026-11-wave3.json", "db/newly-elected-state-legislative-stated-2026-11-wave4.json",
    "db/newly-elected-state-legislative-stated-2026-11-wave5.json"]) {
    const prev = (JSON.parse(R(f)).members || []).map((m) => m.pid);
    for (const pid of SET) ok(!prev.includes(pid), `${pid} is already in ${f}`);
  }
  // Everyone considered and left out carries a reason and no stance entries.
  for (const l of REC.leftOut || []) {
    ok(typeof l.reason === "string" && l.reason.length > 20, `${l.pid}: left out with no reason`);
    ok(!(l.pid in S), `${l.pid}: left out but holds stance entries`);
    ok(!win.CMP_DATA[l.pid] || BASE_CMP == null || BASE_CMP.includes(`\n "${l.pid}": {`), `${l.pid}: left out but admitted to the roster`);
    ok(!SET.includes(l.pid), `${l.pid}: both left out and in the set`);
  }
  // Only State Senate and State House seats, each with a board that already exists.
  for (const m of REC.members || []) {
    ok(/^[a-z]{2}-state(senate|house)-\d+$/.test(m.seat || ""), `${m.pid}: not a state legislative seat (${m.seat})`);
    const short = String(m.seat).replace("statesenate", "sd").replace("statehouse", "hd");
    ok(Array.isArray(m.boards) && m.boards.length >= 1, `${m.pid}: no board named for ${m.seat}`);
    for (const b of m.boards || []) {
      ok(b === `district-${short}.html` || b.startsWith(`district-${short}-p`), `${m.pid}: ${b} is not a board for ${m.seat}`);
      ok(existsSync(join(ROOT, b)), `${m.pid}: no existing board ${b}`);
      ok(BASE(b) != null || BASE_LS() == null, `${m.pid}: the board ${b} was opened by this pass`);
    }
    const p = win.CMP_DATA[m.pid] || {};
    ok(p.state && m.office.indexOf(p.state) === 0 && String(p.district) === String(m.district), `${m.pid}: the roster row is not on ${m.seat} (${m.district})`);
    ok(p.candidate === true && /State (Senate|House|Assembly)/.test(p.office || "") && (/statesenate/.test(m.seat) === /State Senate/.test(p.office)), `${m.pid}: the roster row is not a candidate row for this chamber`);
    ok(/Candidate \(District \d+\)$/.test(p.office || "") && p.name === m.name, `${m.pid}: the roster row's office or name does not match the record`);
    // A row this pass admitted: absent at the base, inside the declared block now.
    if (BASE_CMP != null) ok(!BASE_CMP.includes(`\n "${m.pid}": {`), `${m.pid}: already on the roster at the base`);
    ok(ADMIT && ADMIT.pids.includes(m.pid), `${m.pid}: not a declared admission`);
    // The board's own ballot file names them as the challenger in this seat's race.
    const st = m.seat.split("-")[0], ch = m.seat.split("-")[1], n = m.seat.split("-")[2];
    const bsrc = R(BALLOT[st] || "");
    const race = new RegExp(`chamber: '${ch}', district: ${n},[\\s\\S]*?field: \\[([\\s\\S]*?)\\] \\}`).exec(bsrc);
    const onBallot = `{ name: '${String(m.nameOnBallot || m.name).replace(/'/g, "\\'")}', party: '${m.party}'`;
    ok(race && race[1].includes(onBallot) && /incumbent: true/.test(race[1]),
      `${m.pid}: ${BALLOT[st]} does not name them as the challenger for ${m.seat}`);
    ok(/^https:\/\//.test(m.source || ""), `${m.pid}: no campaign source`);
    // Every entry cites the campaign page the record names (or one of its own
    // sub-pages, where the platform is split across pages).
    for (const e of S[m.pid] || []) {
      const u = (e.source && e.source.url) || "";
      ok(u === m.source || u.startsWith(m.source.replace(/\/$/, "") + "/"), `${m.pid} × ${e.issueKey}: not sourced from the campaign page the record names (${u})`);
    }
    eq(m.rosterRow, "admitted", `${m.pid}: the record does not mark the roster row as admitted`);
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
    // The gap-fill pass (db/newly-elected-state-legislative-gap-fill-2026-11.json)
    // appends its claims after the wave's own cards.
    eq(JSON.stringify(keys), JSON.stringify(gapFillKeys(pid, m.issueKeys)), `${pid}: the record's issue keys do not match the data`);
    for (const e of list) {
      ok(!!win.ISSUE_MAP[e.issueKey], `${pid}: ${e.issueKey} is not an existing issue key`);
      ok(Array.isArray(MAP && MAP[e.issueKey]), `${pid}: ${e.issueKey} is not in the related-issues map`);
      ok(e.issueStance === "support" || e.issueStance === "oppose", `${pid} × ${e.issueKey}: stance is not support/oppose`);
      eq(e.claim, "campaign", `${pid} × ${e.issueKey}: not marked a campaign claim`);
      ok(e.source && /^https:\/\//.test(e.source.url || "") && e.source.label, `${pid} × ${e.issueKey}: no source`);
      ok(typeof e.text === "string" && e.text.length > 20 && e.text.length <= 240, `${pid} × ${e.issueKey}: text missing or too long`);
      ok(!/\bequit(y|able)\b|utah[- ]first/i.test(e.text + " " + e.topic), `${pid} × ${e.issueKey}: equity or Utah-first wording`);
      ok(/"[^"]{8,}"/.test(e.text), `${pid} × ${e.issueKey}: the text does not quote the campaign page`);
      ok(e.detail === `Campaign claim, not a vote — ${e.source.label}.`, `${pid} × ${e.issueKey}: the detail line does not say campaign claim, not a vote`);
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
section("4 · nothing else moved; no new route or gate; one shell move, no migration");
// ═════════════════════════════════════════════════════════════════════════════
{
  const base = BASE("politician-stances.js");
  if (base == null) {
    console.log("     (no git baseline — byte-identity checks skipped)");
  } else {
    const before = stanceData(base), after = stanceData(R("politician-stances.js"));
    for (const pid of SET) ok(!(pid in before), `${pid} already had stance entries at the base`);
    const others = Object.keys(before);
    // A LATER declared stance pass may add a card to someone already here; that
    // card is the later pass's product, pinned by its own suite.
    const laterMoved = new Set(DECLARED_STANCE_PASSES.slice(DECLARED_STANCE_PASSES.findIndex((d) => d.pass === "newly_elected_state_legislative_stated_nov2026_wave6") + 1).flatMap((d) => d.pids));
    ok(others.filter((pid) => !laterMoved.has(pid)).every((pid) => JSON.stringify(before[pid]) === JSON.stringify(after[pid])), "another person's stance entries changed");
    // People a LATER declared stance pass added (v103-chrome-seams.mjs) are that
    // pass's product, pinned by its own suite.
    const own = DECLARED_STANCE_PASSES.findIndex((d) => d.pass === "newly_elected_state_legislative_stated_nov2026_wave6");
    const later = new Set(DECLARED_STANCE_PASSES.slice(own + 1).flatMap((d) => d.pids));
    eq(Object.keys(after).filter((pid) => !later.has(pid) || pid in before || SET.includes(pid)).length, others.length + SET.length, "a person other than the set was added");
    // The roster: the declared block is the only move.
    const cmpNow = R("cmp-data.js");
    ok(!!ADMIT && ADMIT.pids.slice().sort().join(",") === SET.slice().sort().join(","), "the declared admission is not exactly the set");
    ok(cmpNow.includes(ADMIT.banner), "the declared block's banner is missing");
    eq(carveDeclaredAdmissions(cmpNow) === carveDeclaredAdmissions(BASE_CMP), true, "cmp-data.js moved outside the declared admission block");
    const keysOf = (s) => (s.match(/^ "([a-z0-9_]+)": \{$/gm) || []).length;
    eq(keysOf(cmpNow) - keysOf(BASE_CMP) - LATER_ADMITTED.length, SET.length, "the roster grew by other than the set");
    const blockAt = cmpNow.indexOf(ADMIT.banner), blockEnd = cmpNow.indexOf("\n// ── ", blockAt + 1);
    ok(blockEnd > blockAt && cmpNow.slice(blockEnd, blockEnd + 200).includes("Newly elected state legislators, Wisconsin"), "the fifth wave's block no longer follows this one");
    for (const f of ["politician-stances-core.js", "cmp-data-detail.js", "related-issues.js", "consistency.js",
      "stance-sides.js", "my-stances.js", "voting-record.js", "person.html", "index.html", "issue.html", "ballot.html", "netlify.toml", "_redirects",
      ...Object.values(BALLOT), ...(REC.members || []).flatMap((m) => m.boards)]) {
      const b = BASE(f);
      let now = null; try { now = R(f); } catch { /* absent */ }
      if (f === "related-issues.js") { eq(relatedIssuesMapOnly(now), relatedIssuesMapOnly(b), `${f}: the related-issues map changed`); continue; }
      if (f === "politician-stances-core.js") { eq(coreSansLater(now), coreSansLater(b), `${f} changed`); continue; }
      // consistency.js, index.html and netlify.toml: once only declared later
      // revisions (v103-chrome-seams.mjs) moved them since the base, they pin to HEAD.
      if (f === "index.html") { eq(withoutHeroCrawl(now), withoutHeroCrawl(declaredPin(BASE_REV, f, ROOT)), `${f} changed outside the generated record strip`); continue; }
      if (f === "consistency.js" || f === "netlify.toml") { eq(now, declaredPin(BASE_REV, f, ROOT), `${f} changed`); continue; }
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
  // cmp-data.js is precached and changed, so the shell moves exactly one
  // version with a no-migration note; the precache list does not change.
  // politician-stances-ext.js and sitemap.xml are runtime entries, and the
  // precached stance chunk is byte-identical.
  const sw = R("sw.js");
  const pre = (s) => (s.match(/^  '\/[^']*',$/gm) || []).map((l) => l.slice(4, -2));
  ok(pre(sw).includes("cmp-data.js") && pre(sw).includes("politician-stances-core.js"), "fixture: the precache list");
  ok(!pre(sw).includes("politician-stances-ext.js") && !pre(sw).includes("sitemap.xml"), "a runtime file this pass changed is precached");
  const baseSw = BASE("sw.js");
  if (baseSw != null) {
    const ver = (s) => +((/const CACHE_VERSION = 'v(\d+)'/.exec(s) || [])[1] || 0);
    // This pass moved the shell one version (v527); a later pass may move it further.
    ok(ver(sw) >= ver(baseSw) + 1, "the shell did not move one version for the precached roster");
    ok(/v527 - NEWLY ELECTED STATE LEGISLATORS IN NEW YORK, OHIO, PENNSYLVANIA AND TEXAS[\s\S]*?MIGRATION COST: none\.\n(\/\/[^\n]*\n)*const CACHE_VERSION = 'v\d+'/.test(sw), "the version note is missing or does not say no migration");
    eq(JSON.stringify(pre(sw)), JSON.stringify(pre(declaredPin(BASE_REV, "sw.js", ROOT))), "the precache list changed");
    eq(coreSansLater(R("politician-stances-core.js")), coreSansLater(BASE("politician-stances-core.js")), "the precached stance chunk changed");
  }
  const sm = R("sitemap.xml");
  for (const pid of SET) ok(sm.includes(`<loc>https://politidex.fyi/p/${pid}</loc>`), `${pid}: the sitemap does not list the person page`);
  let migs = []; try { migs = readdirSync(join(ROOT, "netlify/database/migrations")); } catch { /* none */ }
  for (const f of migs) ok(declaredPin(BASE_REV, `netlify/database/migrations/${f}`, ROOT) != null, `${f}: a migration this pass added`);
}

if (failures.length) {
  console.error(`\n✗ newly-elected state legislative stated (wave 6): ${failures.length} failure(s)\n  - ` + failures.slice(0, 40).join("\n  - "));
  process.exit(1);
}
console.log(`✓ newly-elected state legislative stated (wave 6): all ${passed} assertions passed`);
