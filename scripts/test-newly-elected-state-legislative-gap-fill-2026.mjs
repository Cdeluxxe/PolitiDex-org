#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-newly-elected-state-legislative-gap-fill-2026.mjs — the gap-fill pass on
// the six newly elected state legislative waves (November 2026).
// ─────────────────────────────────────────────────────────────────────────────
// Several newly elected state legislators came out of their wave with only two
// to four stated positions. This pass re-read every one of them whose campaign
// issues or platform page still read, and appended any further explicit,
// on-topic claim on an issue key already in the related-issues map, marked
// claim:'campaign'. db/newly-elected-state-legislative-gap-fill-2026-11.json
// names each addition (members) and everyone re-read with nothing further
// (unchanged), with the reason. Declared in scripts/v103-chrome-seams.mjs
// (DECLARED_STANCE_PASSES, newly_elected_state_legislative_gap_fill_nov2026).
//
// WHAT THIS SUITE PROVES:
//   1. THE SET: every member below five stated positions at the base is either
//      filled (members) or left unchanged with a reason. A filled member's wave
//      cards are byte-identical and first; each added card is on an existing,
//      mapped key they did not hold, a support/oppose campaign claim sourced from
//      the page the wave record names (or one of its own sub-pages), quoting it,
//      with the "Campaign claim, not a vote" detail line.
//   2. THE DRAWER'S STATED LINE: every added position prints "Stated:
//      Supports|Opposes" in the drawer, and a related stated issue reads
//      "<issue>: supports · no record".
//   3. WHERE THIS CONFLICTS: for every member whose additions complete a pair the
//      related-issues map holds, a reader on the opposite side gets a conflicts
//      line naming both issues, the member's stated side and the reader's; an
//      agreeing reader gets none.
//   4. NOTHING ELSE MOVED: no roster row (cmp-data.js byte-identical), no board,
//      no issue key (issue-map.js, alignment-tool.js), the related-issues map,
//      the drawer code, the routes and documents, every other person's stance
//      entries and the precached core chunk are byte-identical to the base; no
//      migration. Rose Lounsbury now clears the homepage showcase cutoff, so the
//      generated strip (index.html, hero-showcase-data.js) is regenerated and
//      the shell moves one version with a no-migration note.
//
//   node scripts/test-newly-elected-state-legislative-gap-fill-2026.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { DECLARED_STANCE_PASSES, GAP_FILL_ADDED, swCodeOnly, withoutHeroCrawl } from "./v103-chrome-seams.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
// The commit this pass was built on.
const BASE_REV = "46154f1";
const git = (args) => {
  try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};
const BASE = (f) => git(["show", `${BASE_REV}:${f}`]);
const BASE_LS = (dir) => { const o = git(["ls-tree", "--name-only", dir ? `${BASE_REV}:${dir}` : BASE_REV]); return o == null ? null : o.split("\n").filter(Boolean); };

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`   ── ${t}`);

const WAVES = ["", "-wave2", "-wave3", "-wave4", "-wave5", "-wave6"].map((w) => `db/newly-elected-state-legislative-stated-2026-11${w}.json`);
const REC = JSON.parse(R("db/newly-elected-state-legislative-gap-fill-2026-11.json"));
const FILLED = (REC.members || []).map((m) => m.pid);
const UNCHANGED = (REC.unchanged || []).map((m) => m.pid);
// Filled members whose additions complete a related pair (so a conflicts line is
// reachable on stated positions alone); the rest added only unpaired keys.
const NO_PAIR = ["vinny_spotleson", "cindy_johnson", "samantha_wilcox", "brent_reinke"];
const CONFLICT_SET = FILLED.filter((p) => !NO_PAIR.includes(p));

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
const stanceData = (src) => { const w = {}; w.window = w; vm.runInContext(String(src), vm.createContext(w)); return w.ISSUE_STANCE_DATA || {}; };
const text = (h) => String(h || "").replace(/<span class="pdxri-ico"[^>]*>[^<]*<\/span> /g, "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const block = (h) => (/<div class="pdxri pdxri-drawer"[\s\S]*?<\/ul><\/div>/.exec(h) || [""])[0];
const lines = (h) => [...block(h).matchAll(/<li class="pdxri-item"[\s\S]*?<\/li>/g)].map((m) => text(m[0]));
const WORD = { support: "supports", oppose: "opposes" };
const SAYS = { support: "Stated: Supports", oppose: "Stated: Opposes" };
const OTHER = { support: "oppose", oppose: "support" };

const win = boot();
if (win.__err) failures.push(`boot: ${win.__err}`);
const RI = win.PDXRelatedIssues, CS = win.PDXConsistency, MAP = RI && RI.MAP;
const lbl = (k) => String(win.ISSUE_MAP[k].label).replace(/^[^A-Za-z0-9]+/, "").trim();
const S = win.ISSUE_STANCE_DATA;
const baseSrc = BASE("politician-stances.js");
const before = baseSrc == null ? null : stanceData(baseSrc);

// The wave record each member came from.
const waveOf = {};
for (const f of WAVES) for (const m of JSON.parse(R(f)).members || []) waveOf[m.pid] = { file: f, m };

// ═════════════════════════════════════════════════════════════════════════════
section("1 · thin members are filled from their own campaign page, or left unchanged with a reason");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(FILLED.length >= 17, `the filled set shrank (${FILLED.length})`);
  eq(new Set(FILLED.concat(UNCHANGED)).size, FILLED.length + UNCHANGED.length, "a member is both filled and unchanged, or listed twice");
  eq(REC.threshold, 5, "the record's threshold is not five stated positions");
  // Every wave member below the threshold at the base is accounted for.
  if (before) {
    const thin = Object.keys(waveOf).filter((pid) => (before[pid] || []).length < REC.threshold).sort();
    eq(JSON.stringify(FILLED.concat(UNCHANGED).sort()), JSON.stringify(thin), "the record does not account for exactly the members below five stated positions at the base");
  }
  // The seams declare exactly the filled members.
  const pass = DECLARED_STANCE_PASSES.find((d) => d.pass === "newly_elected_state_legislative_gap_fill_nov2026");
  ok(pass && pass.pids.slice().sort().join(",") === FILLED.slice().sort().join(","), "the declared stance pass is not exactly the filled set");
  for (const u of REC.unchanged || []) {
    ok(typeof u.reason === "string" && u.reason.length > 30, `${u.pid}: unchanged with no reason`);
    ok(waveOf[u.pid] && u.source === waveOf[u.pid].m.source, `${u.pid}: unchanged entry does not name the wave record's campaign page`);
    if (before) eq(JSON.stringify(S[u.pid]), JSON.stringify(before[u.pid]), `${u.pid}: left unchanged but the stance entries moved`);
    eq(JSON.stringify((S[u.pid] || []).map((e) => e.issueKey)), JSON.stringify(waveOf[u.pid].m.issueKeys), `${u.pid}: the data no longer matches the wave record`);
  }
  const ext = stanceData(R("politician-stances-ext.js"));
  const src = stanceData(R("politician-stances.js"));
  for (const m of REC.members || []) {
    const pid = m.pid, w = waveOf[pid], list = S[pid] || [];
    if (!ok(!!w, `${pid}: not a member of any newly elected state legislative wave`)) continue;
    eq(m.wave, w.file, `${pid}: the record names the wave wrongly`);
    eq(m.source, w.m.source, `${pid}: the record's source is not the wave record's campaign page`);
    eq(JSON.stringify(m.issueKeysBefore), JSON.stringify(w.m.issueKeys), `${pid}: issueKeysBefore is not the wave record's issue keys`);
    ok(!!win.CMP_DATA[pid], `${pid} is not on the roster`);
    ok(JSON.stringify(ext[pid]) === JSON.stringify(src[pid]), `${pid}: the ext chunk is not regenerated from politician-stances.js`);
    ok(Array.isArray(m.added) && m.added.length >= 1, `${pid}: filled with nothing added`);
    const n0 = w.m.issueKeys.length;
    // The wave's own cards come first and are byte-identical.
    if (before) {
      ok((before[pid] || []).length < REC.threshold, `${pid}: already held ${REC.threshold}+ stated positions at the base`);
      eq(JSON.stringify(list.slice(0, n0)), JSON.stringify(before[pid]), `${pid}: the wave's own cards moved`);
    }
    const keys = list.map((e) => e.issueKey);
    eq(JSON.stringify(keys), JSON.stringify(w.m.issueKeys.concat(m.added.map((a) => a.issueKey))), `${pid}: the data is not the wave's keys followed by the added keys`);
    eq(JSON.stringify(GAP_FILL_ADDED[pid]), JSON.stringify(m.added.map((a) => a.issueKey)), `${pid}: GAP_FILL_ADDED does not match the record`);
    eq(keys.length, new Set(keys).size, `${pid} files two entries on one key`);
    list.slice(n0).forEach((e, i) => {
      const a = m.added[i] || {};
      ok(!w.m.issueKeys.includes(e.issueKey), `${pid} × ${e.issueKey}: not a new key for this member`);
      ok(!!win.ISSUE_MAP[e.issueKey], `${pid}: ${e.issueKey} is not an existing issue key`);
      ok(Array.isArray(MAP && MAP[e.issueKey]), `${pid}: ${e.issueKey} is not in the related-issues map`);
      ok(e.issueStance === "support" || e.issueStance === "oppose", `${pid} × ${e.issueKey}: stance is not support/oppose`);
      eq(e.issueStance, a.issueStance, `${pid} × ${e.issueKey}: the stance does not match the record`);
      eq(e.pos, e.issueStance, `${pid} × ${e.issueKey}: pos and issueStance disagree`);
      eq(e.claim, "campaign", `${pid} × ${e.issueKey}: not marked a campaign claim`);
      eq(e.text, a.text, `${pid} × ${e.issueKey}: the text does not match the record`);
      const u = (e.source && e.source.url) || "";
      ok(u === m.source || u.startsWith(m.source.replace(/\/$/, "") + "/"), `${pid} × ${e.issueKey}: not sourced from the wave record's campaign page (${u})`);
      // Waves one to five pin every card to the exact page; only the sixth
      // wave's record allows a platform sub-page.
      if (!/-wave6\.json$/.test(w.file)) eq(u, m.source, `${pid} × ${e.issueKey}: a sub-page where the wave pins the exact page`);
      ok(e.source && e.source.label, `${pid} × ${e.issueKey}: no source label`);
      ok(typeof e.text === "string" && e.text.length > 20 && e.text.length <= 240, `${pid} × ${e.issueKey}: text missing or too long`);
      ok(!/\bequit(y|able)\b|utah[- ]first/i.test(e.text + " " + e.topic), `${pid} × ${e.issueKey}: equity or Utah-first wording`);
      ok(/"[^"]{8,}"/.test(e.text), `${pid} × ${e.issueKey}: the text does not quote the campaign page`);
      eq(e.detail, `Campaign claim, not a vote — ${e.source.label}.`, `${pid} × ${e.issueKey}: the detail line does not say campaign claim, not a vote`);
    });
    const pm = win._polPositionMap(pid, win.CMP_DATA[pid]) || {};
    for (const e of list) eq(pm[e.issueKey] && pm[e.issueKey].stance, e.issueStance, `${pid} × ${e.issueKey}: the stance map does not publish the stated position`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the drawer's stated line reads the added positions");
// ═════════════════════════════════════════════════════════════════════════════
{
  let stated = 0, related = 0;
  for (const m of REC.members || []) {
    const pid = m.pid, list = S[pid] || [];
    const added = new Set(m.added.map((a) => a.issueKey));
    for (const e of list) {
      const h = CS.gapViewHtml(pid, e.issueKey) || "";
      if (added.has(e.issueKey)) {
        ok(h.includes(SAYS[e.issueStance]), `${pid} × ${e.issueKey}: the drawer does not print "${SAYS[e.issueStance]}"`);
        stated++;
      }
      const ln = lines(h);
      for (const o of list) {
        if (o === e || !(MAP[e.issueKey] || []).includes(o.issueKey)) continue;
        if (!added.has(e.issueKey) && !added.has(o.issueKey)) continue;
        ok(ln.includes(`${lbl(o.issueKey)}: ${WORD[o.issueStance]} · no record`),
          `${pid} × ${e.issueKey}: the related line for ${o.issueKey} does not read stated — ${JSON.stringify(ln)}`);
        related++;
      }
    }
  }
  eq(stated, (REC.members || []).reduce((n, m) => n + m.added.length, 0), "not every added position reached the drawer");
  ok(related >= CONFLICT_SET.length * 2, `too few related stated lines through an added key (${related})`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · a reader against a related stated position gets a conflicts line");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const m of REC.members || []) {
    const pid = m.pid, list = S[pid] || [];
    const added = new Set(m.added.map((a) => a.issueKey));
    const pairs = [];
    for (const e of list) for (const o of list) {
      if (e !== o && (MAP[e.issueKey] || []).includes(o.issueKey) && (added.has(e.issueKey) || added.has(o.issueKey))) pairs.push([e, o]);
    }
    if (NO_PAIR.includes(pid)) { eq(pairs.length, 0, `${pid}: listed as unpaired but an added key completes a related pair`); continue; }
    if (!ok(pairs.length > 0, `${pid}: no related pair runs through an added key`)) continue;
    for (const [e, o] of pairs) {
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
    }
  }
  // The voucher pair: Rose Lounsbury's added opposition to school choice runs
  // against her filed public-schools support, so a voucher supporter sees it.
  win.PDXStanceSides = { list: () => [{ key: "school_choice", position: "support", priority: "high" }] };
  const rl = (RI.conflictsFor("rose_lounsbury", win.CMP_DATA.rose_lounsbury, "public_schools") || []).find((x) => x.bKey === "school_choice");
  ok(rl && / on School Choice & Education Freedom they oppose; you support\.$/.test(RI.conflictText(rl)), "rose_lounsbury: the school-choice conflicts line is missing");
  delete win.PDXStanceSides;
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · no roster row, board or issue key moved; no route, gate, migration or shell move");
// ═════════════════════════════════════════════════════════════════════════════
{
  if (before == null) {
    console.log("     (no git baseline — byte-identity checks skipped)");
  } else {
    const after = stanceData(R("politician-stances.js"));
    eq(Object.keys(after).length, Object.keys(before).length, "a person was added to or removed from the stance data");
    const moved = Object.keys(after).filter((pid) => JSON.stringify(before[pid]) !== JSON.stringify(after[pid])).sort();
    eq(JSON.stringify(moved), JSON.stringify(FILLED.slice().sort()), "a person outside the filled set has different stance entries");
    // Roster rows, issue keys, the related-issues map, drawer code, gates and routes.
    for (const f of ["cmp-data.js", "cmp-data-detail.js", "issue-map.js", "alignment-tool.js", "issue-colors.js",
      "related-issues.js", "consistency.js", "stance-helpers.js", "stance-sides.js", "my-stances.js", "voting-record.js",
      "state-senate-stances.js", "politician-stances-core.js", "district-board.js",
      "person.html", "issue.html", "ballot.html", "netlify.toml", "_redirects"]) {
      let now = null; try { now = R(f); } catch { /* absent */ }
      eq(now, BASE(f), `${f} changed`);
    }
    const keysNow = Object.keys(win.ISSUE_MAP).sort().join(",");
    const w0 = makeSandbox(); const c0 = vm.createContext(w0);
    try { vm.runInContext(BASE("alignment-tool.js"), c0); } catch { /* fixture */ }
    if (w0.ISSUE_MAP) eq(keysNow, Object.keys(w0.ISSUE_MAP).sort().join(","), "the issue keys changed");
    // Boards: every district board and the members' own boards are byte-identical.
    const ls = BASE_LS();
    if (ls) {
      const boardsNow = readdirSync(ROOT).filter((f) => /^district-.*\.html$/.test(f)).sort();
      eq(boardsNow.join(","), ls.filter((f) => /^district-.*\.html$/.test(f)).sort().join(","), "a board was added or removed");
      const htmlNow = readdirSync(ROOT).filter((f) => f.endsWith(".html")).sort();
      eq(htmlNow.join(","), ls.filter((f) => f.endsWith(".html")).sort().join(","), "a document was added or removed");
      let fnNow = []; try { fnNow = readdirSync(join(ROOT, "netlify/functions")); } catch { /* none */ }
      eq(fnNow.sort().join(","), (BASE_LS("netlify/functions") || []).sort().join(","), "a function (route) was added or removed");
      const migNow = readdirSync(join(ROOT, "netlify/database/migrations")).sort();
      eq(migNow.join(","), (BASE_LS("netlify/database/migrations") || []).sort().join(","), "a migration was added or removed");
    }
    for (const m of REC.members || []) for (const b of JSON.parse(R(m.wave)).members.find((x) => x.pid === m.pid).boards || []) {
      eq(R(b), BASE(b), `${m.pid}: the board ${b} changed`);
    }
    // The ballot files that name these members.
    for (const f of readdirSync(ROOT).filter((x) => /^[a-z]{2}-ballot-2026\.js$/.test(x))) eq(R(f), BASE(f), `${f} changed`);
  }
  // The homepage strip: Rose Lounsbury's added cards lift her into the
  // showcase, so the generator was re-run. index.html moves only inside the
  // generated strip, which now names her; hero-showcase-data.js names her too.
  const idx = R("index.html"), baseIdx = BASE("index.html");
  if (baseIdx != null) {
    eq(withoutHeroCrawl(idx), withoutHeroCrawl(baseIdx), "index.html changed outside the generated record strip");
    ok(!baseIdx.includes('href="/p/rose_lounsbury"'), "fixture: the base strip already named Rose Lounsbury");
  }
  ok(idx.includes('<a class="pdx-hs-crawl-a" href="/p/rose_lounsbury" data-pdx-person-link="rose_lounsbury">Rose Lounsbury</a>'), "the homepage strip does not name Rose Lounsbury");
  ok(!idx.includes('href="/p/tlaib" data-pdx-person-link="tlaib"'), "the homepage strip still names Rashida Tlaib");
  ok(/rose_lounsbury/.test(R("hero-showcase-data.js")), "hero-showcase-data.js does not carry Rose Lounsbury");
  // The service worker: the precached shell (index.html, hero-showcase-data.js)
  // changed, so it moves exactly one version with a no-migration note, and
  // nothing but its comments and version line moves.
  const sw = R("sw.js");
  const pre = (s) => (s.match(/^  '\/[^']*',$/gm) || []).map((l) => l.slice(4, -2));
  const baseSw = BASE("sw.js");
  if (baseSw != null) {
    const ver = (s) => +((/const CACHE_VERSION = 'v(\d+)'/.exec(s) || [])[1] || 0);
    eq(ver(sw), ver(baseSw) + 1, "the shell did not move exactly one version");
    ok(/v552 - NEWLY ELECTED STATE LEGISLATORS, GAP FILL[\s\S]*?MIGRATION COST: none\.\nconst CACHE_VERSION = 'v552';/.test(sw), "the version note is missing or does not say no migration");
    eq(swCodeOnly(sw), swCodeOnly(baseSw), "sw.js changed beyond its version note");
    eq(JSON.stringify(pre(sw)), JSON.stringify(pre(baseSw)), "the precache list changed");
  }
  ok(pre(sw).includes("hero-showcase-data.js"), "fixture: the showcase data is precached");
  ok(pre(sw).includes("politician-stances-core.js") && !pre(sw).includes("politician-stances-ext.js"), "fixture: the precache list");
  ok(!pre(sw).includes("politician-stances.js"), "the stance source is precached");
  const sm = R("sitemap.xml");
  for (const pid of FILLED) ok(sm.includes(`<loc>https://politidex.fyi/p/${pid}</loc>`), `${pid}: the sitemap does not list the person page`);
}

if (failures.length) {
  console.error(`\n✗ newly-elected state legislative gap fill: ${failures.length} failure(s)\n  - ` + failures.slice(0, 40).join("\n  - "));
  process.exit(1);
}
console.log(`✓ newly-elected state legislative gap fill: all ${passed} assertions passed`);
