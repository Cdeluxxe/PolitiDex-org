#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-words-vs-actions-pages.mjs — the Words and votes note on the issue and
// ballot pages, identical to the person page's
// ─────────────────────────────────────────────────────────────────────────────
// Each page is booted with ITS OWN script list, in document order, read from
// its HTML — plus the real stance reader and stores over a saved device stance,
// and the member's votes arriving as they do in the browser. Pins:
//   1. issue.html and ballot.html load every script the note depends on
//   2. a qualifying conflict → the identical note block on all three pages
//   3. agreeing vote / reader on the other side / mixed stance / no stances →
//      no note, and each drawer byte-identical to one where the note cannot fire
//   4. through the REAL publish gate: a publishable raw vote is preferred on
//      every page (same block); a bill failing any rule gives no raw-feed note
//   5. the raw feed is asked after the WARM repaint too (a drawer opened before
//      the votes arrived), once per person, only for a drawer with a vote table;
//      ballot.html (no sign-in script) only ever asks the public gated endpoint
//
//   node scripts/test-words-vs-actions-pages.mjs   (no database, no network)

import { readFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import * as esbuild from "esbuild";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else if (failures.length < 60) failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const dir = mkdtempSync(join(tmpdir(), "wva-pages-"));
const outP = join(dir, "pub.mjs");
await esbuild.build({ entryPoints: [join(ROOT, "netlify/lib/vote-actions-publish.ts")], bundle: true, platform: "node", format: "esm", outfile: outP, logLevel: "silent" });
const P = await import(pathToFileURL(outP).href);

const PAGES = { "person.html": "/p/chellie_pingree", "issue.html": "/i/healthcare_costs", "ballot.html": "/ballot" };
const scriptsOf = (page) => [...R(page).replace(/<!--[\s\S]*?-->/g, "").matchAll(/<script\b[^>]*\bsrc="\/([^"?#]+\.js)"[^>]*>/g)].map((m) => m[1]).filter((f) => existsSync(join(ROOT, f)));
const STORE_FILES = ["stance-sides.js", "my-stances.js", "your-file.js"];
const NEEDS = ["cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js", "stance-helpers.js", "voting-record.js", "consistency.js", "related-issues.js", "stance-sides.js", "my-stances.js"];

// ── 1 · the pages load what the note needs ───────────────────────────────────
for (const page of Object.keys(PAGES)) {
  const s = scriptsOf(page);
  for (const f of NEEDS) ok(s.includes(f), `${page}: loads ${f}`);
  ok(s.indexOf("consistency.js") >= 0 && s.indexOf("voting-record.js") >= 0, `${page}: drawer and vote record both on the page`);
}
ok(!scriptsOf("ballot.html").includes("firebase-boot.js"), "ballot.html has no sign-in script (public endpoint only)");
// The drawers on those pages ARE the person page's drawer: one openGap, one
// gapViewHtml, one note generator — nothing re-implemented per page.
{
  const cs = R("consistency.js");
  ok(/var sdos = [^\n]*closest\('\[data-pdxst-dos\]'\)/.test(cs) || /closest\('\[data-pdxst-dos\]'\)/.test(cs), "the ledger-row door (issue page) is handled in consistency.js");
  ok(/if \(openGap\(sdos\.getAttribute\('data-pdxst-pid'\)/.test(cs), "the ledger-row door opens openGap");
  ok(/closest\('\[data-pdxc-gap\]'\)[\s\S]{0,200}openGap\(gap\.getAttribute\('data-pdxc-gap-pid'\)/.test(cs), "the data-pdxc-gap door opens openGap");
  ok(/data-pdxc-gap="/.test(R("race-sheet.js")), "the ballot race sheet opens drawers through data-pdxc-gap");
  ok(/_gapWvaHtml\(pid, issueKey\) \+/.test(cs) && (cs.match(/wordsVsActionsHtml\(/g) || []).length === 1, "the note is built once, inside gapViewHtml");
  for (const f of ["issue-file.js", "issue-view.js", "door1-workspace.js", "race-sheet.js", "your-ballot.js", "ballot-workspace.js"])
    ok(!/wordsVsActions|pdxri-wva|_wvaActs/.test(R(f)), `${f} does not re-implement the note`);
}

const corpus = buildCorpus(ROOT);
// One page, booted from its own script list, with a saved device stance.
function bootPage(page, sides) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  const mem = {};
  if (sides) {
    const items = {};
    for (const [k, position] of Object.entries(sides)) items[k] = { issueKey: k, position, priority: "medium", updatedAt: 1, createdAt: 1 };
    mem.pdx_my_stances_v1 = JSON.stringify({ version: 1, items, tombstones: {}, settings: {}, updatedAt: 1 });
  }
  win.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
  win.location = Object.assign({}, win.location, { pathname: PAGES[page], href: "https://politidex.fyi" + PAGES[page] });
  win.fetch = async () => { throw new Error("no network"); };
  win.console = Object.assign({}, console, { log() {}, info() {}, warn() {}, debug() {}, error() {} });
  const errs = {};
  for (const f of scriptsOf(page)) {
    try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { errs[f] = e.message; }
    if (!win.PROFILES && win.CMP_DATA) win.PROFILES = win.CMP_DATA;
  }
  for (const f of NEEDS) if (errs[f]) failures.push(`${page}: ${f} threw on boot — ${errs[f]}`);
  for (const f of STORE_FILES) if (!scriptsOf(page).includes(f)) { try { vm.runInContext(R(f), ctx, { filename: f }); } catch { /* optional */ } }
  win.PROFILES = win.PROFILES || win.CMP_DATA;
  // The member's votes arrive, as the pack fetch delivers them in the browser.
  for (const [pid, recs] of corpus.byMember) { try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member */ } }
  return win;
}
const WVA = (h) => (/<div class="pdxri-wva"[\s\S]*?<\/ul><\/div>/.exec(h) || [""])[0];
const view = (win, pid, key) => win.PDXConsistency.gapViewHtml(pid, key) || "";
function withoutNote(win, fn) { const keep = win.PDXConsistency.wordsVsActionsActs; win.PDXConsistency.wordsVsActionsActs = () => []; try { return fn(); } finally { win.PDXConsistency.wordsVsActionsActs = keep; } }

// ── fixtures (the person page's real record) ─────────────────────────────────
const probe = bootPage("person.html", null);
const CS0 = probe.PDXConsistency, RI0 = probe.PDXRelatedIssues;
const statedOf = (pid, k) => { const e = (probe._polPositionMap(pid, probe.CMP_DATA[pid]) || {})[k]; const s = String(e && e.stance || ""); return /^(support|oppose)$/.test(s) ? s : null; };
const against = (s) => (s === "support" ? "opposes" : "advances");
let clash = null, calm = null;
for (const pid of Object.keys(probe.CMP_DATA)) {
  for (const k of Object.keys(probe._polPositionMap(pid, probe.CMP_DATA[pid]) || {})) {
    const s = statedOf(pid, k);
    if (!s || !RI0.MAP[k]) continue;
    const acts = CS0.wordsVsActionsActs(pid, k);
    if (!acts.length) continue;
    const open = RI0.MAP[k].find((o) => (RI0.itemsFor(pid, probe.CMP_DATA[pid], o) || []).some((it) => it.key === k));
    if (!open) continue;
    const bad = acts.some((a) => a.dir === against(s));
    if (bad && !clash) clash = { pid, k, s, open };
    if (!bad && !calm) calm = { pid, k, s, open };
  }
  if (clash && calm) break;
}
ok(!!clash && !!calm, `fixtures found (${clash && clash.pid + "/" + clash.k}; ${calm && calm.pid + "/" + calm.k})`);
const OTHER = { support: "oppose", oppose: "support" };

// ── 2/3 · the same note, and no note, on every page ──────────────────────────
let personBlock = null;
for (const page of Object.keys(PAGES)) {
  const w = bootPage(page, { [clash.k]: clash.s });
  ok(!!(w.PDXStances && w.PDXStanceSides), `${page}: the real stance reader and store published`);
  const h = view(w, clash.pid, clash.open);
  const b = WVA(h);
  ok(b && b.includes(`data-pdxri-wva-key="${clash.k}"`), `${page}: a qualifying conflict shows the Words and votes note`);
  if (page === "person.html") personBlock = b;
  else eq(b, personBlock, `${page}: the note block is identical to the person page's`);
  eq(h.replace(b, ""), withoutNote(w, () => view(w, clash.pid, clash.open)), `${page}: with the note removed the drawer is byte-identical`);
  for (const [why, sides, pid, key] of [
    ["agreeing vote", { [calm.k]: calm.s }, calm.pid, calm.open],
    ["reader on the other side", { [clash.k]: OTHER[clash.s] }, clash.pid, clash.open],
    ["mixed stance", { [clash.k]: "mixed" }, clash.pid, clash.open],
    ["no stances", null, clash.pid, clash.open],
  ]) {
    const wx = bootPage(page, sides);
    const hx = view(wx, pid, key);
    ok(!/pdxri-wva/.test(hx), `${page}: ${why} → no note`);
    eq(hx, withoutNote(wx, () => view(wx, pid, key)), `${page}: ${why} → drawer byte-identical`);
  }
}

// ── 4 · the real gate, on every page ─────────────────────────────────────────
// The calm fixture's curated acts agree; a raw roll call on one of them, voted
// the other way, makes the note — only when its bill passes the gate.
const ct = CS0.dossierTally(calm.pid, calm.k);
const row = ct.rows.find((p) => p.dir && p.dir !== "none" && !p.d.execAct && p.d.item && /^(yea|nay)$/i.test(p.d.item.position) && CS0.voteActionBillKey(p.d));
ok(!!row, "fixture: an agreeing curated roll call with a bill key");
const it = row.d.item, bk = CS0.voteActionBillKey(row.d);
const flipped = String(it.position).toLowerCase() === "yea" ? "no" : "yes";
const rawRow = { billKey: bk, chamber: it.chamber, congress: +it.congress, session: +it.session, rollNumber: +it.rollNumber, voteDate: "2026-11-02T00:00:00.000Z",
  vote: flipped, voteRaw: flipped === "yes" ? "Yea" : "Nay", voteKind: "rule", isProcedural: true, question: "On Ordering the Previous Question",
  sourceUrl: "https://clerk.house.gov/evs/raw/pages.xml", sourceLabel: "Clerk", rawRef: "house/x.json" };
const goodStats = { billKey: bk, measureType: "bill", tagCount: 1, rows: 430, unmappedRows: 0, unknownKindRows: 0, missingRawRows: 0, proceduralRows: 430, rolls: 1 };
async function gated(page, stats) {
  const w = bootPage(page, { [calm.k]: calm.s });
  const deps = { rowsForPolitician: async () => [rawRow], statsForBills: async () => [stats] };
  const seen = [];
  w.fetch = async (u) => { seen.push(String(u)); return { ok: true, json: async () => JSON.parse(JSON.stringify(await P.publishedForPolitician(calm.pid, deps))) }; };
  await w.PDXConsistency.loadVoteActionLinks(calm.pid, () => {});
  await new Promise((r) => setTimeout(r, 10));
  return { seen, h: view(w, calm.pid, calm.open) };
}
let rawBlock = null;
for (const page of Object.keys(PAGES)) {
  const pass = await gated(page, goodStats);
  eq(pass.seen, [`/api/vote-actions/published?pid=${encodeURIComponent(calm.pid)}`], `${page}: the public gated endpoint is the one asked`);
  const b = WVA(pass.h);
  ok(/data-pdxri-wva-from="raw"/.test(b) && b.includes("https://clerk.house.gov/evs/raw/pages.xml") && /a procedural vote, which ran against it/.test(b),
    `${page}: a publishable raw vote is preferred, procedural labelled`);
  if (page === "person.html") rawBlock = b; else eq(b, rawBlock, `${page}: the raw-feed note is identical to the person page's`);
  for (const [rule, patch] of [["has_topic_tag", { tagCount: 0 }], ["members_mapped", { unmappedRows: 3 }], ["raw_payload_stored", { missingRawRows: 1 }], ["vote_kind_known", { unknownKindRows: 1 }], ["not_nomination", { measureType: "nomination" }]]) {
    const held = await gated(page, { ...goodStats, ...patch });
    ok(!/pdxri-wva/.test(held.h), `${page}: bill held by ${rule} → no note from the raw feed`);
  }
}

// ── 5 · the warm repaint asks too ────────────────────────────────────────────
const src = R("consistency.js");
const warm = src.slice(src.indexOf("THE OPEN DOSSIER"), src.indexOf("THE OPEN DOSSIER") + 1800);
ok(/gbody\.innerHTML = warmHtml;\s*_xlAfterPaint\(gb, _gapOpen\.pid, _gapOpen\.key, warmHtml\);/.test(warm), "the warm repaint asks for the raw feed once the vote table exists");
ok(/body\.innerHTML = html;\s*_xlAfterPaint\(sheet, pid, issueKey, html\);/.test(src), "openGap asks through the same helper");
for (const page of ["issue.html", "ballot.html"]) {
  const w = bootPage(page, { [clash.k]: clash.s });
  const seen = [];
  w.fetch = async (u) => { seen.push(String(u)); return { ok: true, json: async () => ({ billKeys: {} }) }; };
  const sheet = { hidden: false, querySelector: () => null };
  w.PDXConsistency.voteActionsAfterPaint(sheet, clash.pid, clash.open, '<div class="pdxgap-loading">⏳ Loading the record…</div>');
  await new Promise((r) => setTimeout(r, 5));
  eq(seen.length, 0, `${page}: a drawer still loading its votes does not ask`);
  w.PDXConsistency.voteActionsAfterPaint(sheet, clash.pid, clash.open, view(w, clash.pid, clash.open));
  w.PDXConsistency.voteActionsAfterPaint(sheet, clash.pid, clash.open, view(w, clash.pid, clash.open));
  await new Promise((r) => setTimeout(r, 5));
  eq(seen, [`/api/vote-actions/published?pid=${encodeURIComponent(clash.pid)}`], `${page}: once the vote table is painted, one ask per person, to the public endpoint`);
}

// ── no new routes, scores or stored state ────────────────────────────────────
const toml = R("netlify.toml").split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");
ok(!/words-vs|wva/i.test(toml), "no new route");
ok(!/wva|wordsVsActions/.test(R("word-action.js") + R("politician-stances.js") + R("voting-record.js")), "no scoring or stance-store file reads the note");

rmSync(dir, { recursive: true, force: true });
if (failures.length) {
  console.log(`\n✗ words vs actions on pages: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`✓ words vs actions on pages: ${passed} checks passed`);
