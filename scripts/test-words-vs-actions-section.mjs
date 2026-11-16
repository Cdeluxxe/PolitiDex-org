#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-words-vs-actions-section.mjs — the Words and votes note in the
// person-file Related issues section
// ─────────────────────────────────────────────────────────────────────────────
// Each related line of the section is a pair: the issue whose related list
// brought it in (`via`) and the line. That issue's drawer lists the same pair,
// and the line carries the very note that drawer prints for it. Pins:
//   1. a qualifying conflict → the note inside that related line, its line
//      byte-identical to the one the drawer (gapViewHtml) prints for the pair
//   2. agreeing vote / reader on the other side / mixed stance / no stances →
//      no note, and the section byte-identical to today's (no reader stances)
//   3. across the real corpus: at most one note per related line, every note
//      the drawer's own, and with the notes removed the section is unchanged
//   4. the recency window is the drawer's: the newest vote inside it is named
//   5. the section asks the drawers' publishable-vote feed and repaints in
//      place only when its notes change; a second asker while the ask is in
//      flight is handed the same answer (one fetch)
//   6. no new route, score, confidence or second rule set
//
//   node scripts/test-words-vs-actions-section.mjs   (no database, no network)

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else if (failures.length < 60) failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const FILES = ["cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js", "stance-helpers.js",
  "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js", "exec-record-ui.js",
  "consistency.js", "voting-record.js", "word-action.js", "profile-spine.js", "profiles-full.js", "issue-colors.js", "related-issues.js"];
const corpus = buildCorpus(ROOT);
function boot() {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) vm.runInContext(R(f), ctx, { filename: f });
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) { try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member */ } }
  return win;
}
const win = boot();
const CS = win.PDXConsistency, RI = win.PDXRelatedIssues;
const realActs = CS.wordsVsActionsActs;
const sides = (m) => { win.PDXStanceSides = m ? { list: () => Object.entries(m).map(([key, position]) => ({ key, position, priority: "medium" })) } : undefined; };
const section = (pid) => RI.sectionHtml(pid, win.CMP_DATA[pid]) || "";
const NOTE_RE = /<div class="pdxri-wva pdxri-wva-line"[\s\S]*?<\/ul><\/div>/g;
const notesOf = (h) => h.match(NOTE_RE) || [];
const strip = (h) => h.replace(NOTE_RE, "");
const itemOf = (h) => (/<li class="pdxri-wva-item"[\s\S]*?<\/li>/.exec(h) || [""])[0];
const drawerItem = (pid, via, pair) => (new RegExp(`<li class="pdxri-wva-item" data-pdxri-wva-pair="${pair}"[\\s\\S]*?</li>`).exec(CS.gapViewHtml(pid, via) || "") || [""])[0];
// Each section note with the related line it sits in.
function placed(h) {
  return [...h.matchAll(/<li class="pdxri-item" data-pdxri-key="([^"]+)"[^>]*>([\s\S]*?)<\/li>(?=<li class="pdxri-item"|<\/ul><\/li>)/g)]
    .map((m) => ({ line: m[1], notes: notesOf(m[2]) })).filter((x) => x.notes.length);
}
const statedOf = (pid, k) => { const e = (win._polPositionMap(pid, win.CMP_DATA[pid]) || {})[k]; const s = String(e && e.stance || ""); return /^(support|oppose)$/.test(s) ? s : null; };
const OTHER = { support: "oppose", oppose: "support" };
const AG = (s) => (s === "support" ? "opposes" : "advances");

// ── fixtures from the real record ────────────────────────────────────────────
let clash = null, calm = null;
for (const pid of Object.keys(win.CMP_DATA)) {
  for (const k of Object.keys(win._polPositionMap(pid, win.CMP_DATA[pid]) || {})) {
    const s = statedOf(pid, k);
    if (!s || !RI.MAP[k]) continue;
    const acts = realActs(pid, k);
    if (!acts.length) continue;
    sides({ [k]: s });
    const h = section(pid);
    if (!h) continue;
    const bad = acts.some((a) => a.dir === AG(s));
    if (bad && !clash && notesOf(h).length) clash = { pid, k, s, h };
    if (!bad && !calm) calm = { pid, k, s, h };
  }
  if (clash && calm) break;
}
sides(null);
ok(!!clash && !!calm, `fixtures found (${clash && clash.pid + "/" + clash.k}; ${calm && calm.pid + "/" + calm.k})`);

// ── 1 · the qualifying conflict ──────────────────────────────────────────────
{
  sides({ [clash.k]: clash.s });
  const h = section(clash.pid);
  const at = placed(h);
  ok(at.length >= 1, "a qualifying conflict puts a note in the section");
  for (const { line, notes } of at) {
    eq(notes.length, 1, `one note on the ${line} line`);
    const n = notes[0];
    const via = (/data-pdxri-wva="([^"]+)"/.exec(n) || [])[1];
    ok(n.includes(`data-pdxri-wva-pair="${line}"`), `the note on ${line} is that line's pair`);
    ok(n.includes(`data-pdxri-wva-key="${clash.k}"`), `the note on ${line} names the conflicting issue`);
    ok(/<div class="pdxri-wva-h"[^>]*>Words and votes<\/div>/.test(n), "the note carries the drawer's heading");
    const d = drawerItem(clash.pid, via, line);
    ok(!!d, `the ${via} drawer prints a note for ${line}`);
    eq(itemOf(n), d, `the section note on ${line} is byte-identical to the drawer's`);
    ok(RI.wordsVsActionsHtml(clash.pid, win.CMP_DATA[clash.pid], via).includes(itemOf(n)), "…and to wordsVsActionsHtml's");
  }
  sides(null);
  eq(strip(h), section(clash.pid), "with the note removed the section is byte-identical to today's");
}

// ── 2 · no note, section unchanged ───────────────────────────────────────────
for (const [why, m, pid] of [
  ["agreeing vote", { [calm.k]: calm.s }, calm.pid],
  ["reader on the other side", { [clash.k]: OTHER[clash.s] }, clash.pid],
  ["mixed stance", { [clash.k]: "mixed" }, clash.pid],
]) {
  sides(null);
  const today = section(pid);
  sides(m);
  const h = section(pid);
  ok(!/pdxri-wva/.test(h), `${why} → no note`);
  eq(h, today, `${why} → section byte-identical`);
  CS.wordsVsActionsActs = () => [];
  try { eq(section(pid), today, `${why} → identical to a section where the note cannot fire`); } finally { CS.wordsVsActionsActs = realActs; }
}
sides(null);
ok(!/pdxri-wva/.test(section(clash.pid)), "no stances → no note");

// ── 3 · the real corpus ──────────────────────────────────────────────────────
{
  let files = 0, notes = 0;
  for (const pid of Object.keys(win.CMP_DATA)) {
    const pm = win._polPositionMap(pid, win.CMP_DATA[pid]) || {};
    const m = {};
    for (const k of Object.keys(pm)) { const s = statedOf(pid, k); if (s) m[k] = s; }
    if (!Object.keys(m).length) continue;
    sides(null);
    const today = section(pid);
    sides(m);
    const h = section(pid);
    if (!notesOf(h).length) { eq(h, today, `${pid}: no note → section unchanged`); continue; }
    files++;
    eq(strip(h), today, `${pid}: with the notes removed the section is unchanged`);
    const at = placed(h);
    eq(at.reduce((n, x) => n + x.notes.length, 0), notesOf(h).length, `${pid}: every note sits inside a related line`);
    for (const { line, notes: ns } of at) {
      eq(ns.length, 1, `${pid}/${line}: at most one note per related line`);
      const via = (/data-pdxri-wva="([^"]+)"/.exec(ns[0]) || [])[1];
      eq(itemOf(ns[0]), drawerItem(pid, via, line), `${pid}/${line}: the note is the ${via} drawer's`);
      notes++;
    }
    if (files >= 80) break;
  }
  sides(null);
  ok(files > 0, "real corpus: some files carry a section note");
  console.log(`   real corpus: ${files} files with section notes · ${notes} notes compared to their drawers`);
}

// ── 4 · the drawer's recency window ──────────────────────────────────────────
{
  const W = RI.WVA_WINDOW, keep = { recent: W.recent, cutoff: W.cutoff, now: W.now };
  const NOW = Date.parse("2026-11-16T12:00:00Z");
  const act = (ident, date, from = "curated") => ({ dir: AG(clash.s), word: "Nay", ident, date, url: "", from, procedural: false });
  Object.assign(W, { now: () => NOW });
  CS.wordsVsActionsActs = (pid, key) => (pid === clash.pid && key === clash.k
    ? [act("H.R. 10", "2019-03-01T00:00:00Z"), act("H.R. 20", "2026-05-01T00:00:00Z"), act("H.R. 30", "2025-08-01T00:00:00Z")] : []);
  try {
    sides({ [clash.k]: clash.s });
    const ns = notesOf(section(clash.pid));
    ok(ns.length >= 1 && ns.every((n) => /but voted Nay on H\.R\. 20 \(2026-05-01\)/.test(n)), "the newest conflicting vote inside the window is named");
    Object.assign(W, { cutoff: 36 });
    CS.wordsVsActionsActs = (pid, key) => (pid === clash.pid && key === clash.k ? [act("H.R. 50", "2019-03-01T00:00:00Z")] : []);
    const h = section(clash.pid);
    sides(null);
    ok(!/pdxri-wva/.test(h) && h === section(clash.pid), "a hard cutoff with nothing left → no note, section unchanged");
  } finally { CS.wordsVsActionsActs = realActs; Object.assign(W, keep); sides(null); }
}

// ── 5 · the publishable-vote feed, and the in-place repaint ──────────────────
{
  const w2 = boot();
  const CS2 = w2.PDXConsistency, RI2 = w2.PDXRelatedIssues;
  const real2 = CS2.wordsVsActionsActs;
  w2.setTimeout = (f) => { f(); return 0; };
  const asked = [];
  let answer = null;
  CS2.loadVoteActionLinks = (pid, cb) => { asked.push(pid); answer = cb; return null; };
  const heard = {};
  w2.addEventListener = (t, f) => { (heard[t] = heard[t] || []).push(f); };
  // calm: the curated record agrees; the raw roll call, once it arrives, runs the other way.
  w2.PDXStanceSides = { list: () => [{ key: calm.k, position: calm.s, priority: "medium" }] };
  const painted = RI2.sectionHtml(calm.pid, w2.CMP_DATA[calm.pid]);
  ok(!/pdxri-wva/.test(painted), "first paint: no note yet");
  eq(asked, [calm.pid], "the section asks the drawers' publishable-vote feed, once");
  RI2.sectionHtml(calm.pid, w2.CMP_DATA[calm.pid]);
  eq(asked, [calm.pid], "a second paint does not ask again");
  let writes = 0, html = painted;
  const el = { getAttribute: (a) => (a === "data-pid" ? calm.pid : null), get outerHTML() { return html; }, set outerHTML(v) { writes++; html = v; } };
  w2.document.getElementById = (id) => (id === "pdxsec-related-issues" ? el : null);
  answer();
  eq(writes, 0, "the feed changed no note → the painted section is not touched");
  (heard["pdx-consistency-warm"] || []).forEach((f) => f({ detail: { pid: calm.pid } }));
  eq(writes, 0, "the votes-arrived event changed no note → not touched");
  CS2.wordsVsActionsActs = (pid, key) => (pid === calm.pid && key === calm.k
    ? [{ dir: AG(calm.s), word: "Aye", ident: "H.R. 77", date: "2026-11-02", url: "https://clerk.house.gov/evs/raw/x.xml", from: "raw", procedural: true }] : real2(pid, key));
  answer();
  eq(writes, 1, "the raw roll call makes a note → the section is repainted in place");
  ok(/data-pdxri-wva-from="raw"/.test(html) && /a procedural vote, which ran against it/.test(html), "the repainted note is the raw roll call's");
  answer();
  eq(writes, 1, "the same notes again → no second repaint");
  CS2.wordsVsActionsActs = real2;
  ok((heard["pdx-consistency-warm"] || []).length === 1, "the section hears the votes-arrived event once");
}
{
  // The real feed: a second asker while the ask is in flight gets the answer too.
  const w3 = boot();
  let release, n = 0;
  w3.fetch = () => { n++; return new Promise((r) => { release = () => r({ ok: true, json: async () => ({ billKeys: {} }) }); }); };
  const got = [];
  w3.PDXConsistency.loadVoteActionLinks(calm.pid, () => got.push("section"));
  w3.PDXConsistency.loadVoteActionLinks(calm.pid, () => got.push("drawer"));
  release();
  await new Promise((r) => setTimeout(r, 10));
  eq(n, 1, "one fetch per person");
  eq(got, ["section", "drawer"], "both askers are handed the answer");
  w3.PDXConsistency.loadVoteActionLinks(calm.pid, () => got.push("late"));
  await new Promise((r) => setTimeout(r, 5));
  eq([n, got.length], [1, 2], "an ask after the answer is already on file fetches nothing");
}

// ── 6 · no new route, score or rule set ──────────────────────────────────────
{
  const toml = R("netlify.toml").split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");
  ok(!/words-vs|wva|related-issues/i.test(toml), "no new route");
  const src = R("related-issues.js");
  const blk = src.slice(src.indexOf("WORDS AND VOTES IN THE PERSON-FILE SECTION"), src.indexOf("window.PDXRelatedIssues = {"));
  ok(blk.length > 0 && !/score|confiden|WVA_WINDOW|wvaPick|wvaSide|directionOf/i.test(blk), "the section adds no score, confidence, window or rule of its own");
  ok(/wordsVsActionsFor\(pid, p, v, mine\)/.test(blk), "the section reads the drawer's note generator");
  ok((src.match(/var WVA_WINDOW = /g) || []).length === 1 && (src.match(/function wvaPick\(/g) || []).length === 1, "one window, one picker");
  ok(!/pdxri-wva|wordsVsActions/.test(R("profiles-full.js")), "profiles-full.js does not re-implement the note");
}

if (failures.length) {
  console.log(`\n✗ words vs actions in the section: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`✓ words vs actions in the section: ${passed} checks passed`);
