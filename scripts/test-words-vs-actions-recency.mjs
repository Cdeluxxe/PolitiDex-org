#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-words-vs-actions-recency.mjs — the recency window for Words and votes
// ─────────────────────────────────────────────────────────────────────────────
// related-issues.js WVA_WINDOW is the one place the window lives: `recent`
// (months, 'congress' or null) and an optional hard `cutoff`. Pins:
//   1. a recent conflicting vote is chosen over an older one — raw or curated;
//      the most recent always wins, a same-day tie goes to the raw roll call
//   2. only older conflicting votes → the note still appears, naming the newest
//   3. a hard cutoff drops older votes; nothing left → no note, drawer identical
//   4. 'congress' measures from Jan 3 of the current Congress
//   5. the real record: the named vote is the newest conflicting vote in the
//      window, else the newest overall; the window is defined once
//   6. the older-vote cue: a recent vote's note is byte-identical to the note
//      before the cue; a fallback vote says "an older vote" (or "a vote from
//      an earlier Congress" under 'congress'); selection is unchanged
//
//   node scripts/test-words-vs-actions-recency.mjs   (no database, no network)

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
const win = makeSandbox();
const ctx = vm.createContext(win);
win.PROFILES = win.CMP_DATA;
for (const f of FILES) vm.runInContext(R(f), ctx, { filename: f });
win.PROFILES = win.CMP_DATA;
for (const [pid, recs] of corpus.byMember) { try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member */ } }
const CS = win.PDXConsistency, RI = win.PDXRelatedIssues, W = RI.WVA_WINDOW;
const DEFAULT = { recent: W.recent, cutoff: W.cutoff };
eq(DEFAULT, { recent: 24, cutoff: null }, "default window: prefer the last 24 months, no hard cutoff");

// A real person, issue and pair with a stated side (the fixture's own data).
const realActs = CS.wordsVsActionsActs;
let fx = null;
for (const pid of Object.keys(win.CMP_DATA)) {
  const pm = win._polPositionMap(pid, win.CMP_DATA[pid]) || {};
  for (const k of Object.keys(pm)) {
    const s = String(pm[k] && pm[k].stance || "");
    if (!/^(support|oppose)$/.test(s) || !RI.MAP[k]) continue;
    const open = RI.MAP[k].find((o) => (RI.itemsFor(pid, win.CMP_DATA[pid], o) || []).some((it) => it.key === k));
    if (open && realActs(pid, k).some((a) => a.dir === (s === "support" ? "opposes" : "advances"))) { fx = { pid, k, s, open }; break; }
  }
  if (fx) break;
}
ok(!!fx, "fixture: a person with a stated side and conflicting votes");
const AGAINST = fx.s === "support" ? "opposes" : "advances", WITH = fx.s === "support" ? "advances" : "opposes";
win.PDXStanceSides = { list: () => [{ key: fx.k, position: fx.s, priority: "medium" }] };
const NOW = Date.parse("2026-11-16T12:00:00Z");
const act = (ident, date, dir = AGAINST, from = "curated", word = "Nay") => ({ dir, word, ident, date, url: `https://clerk.house.gov/evs/${ident.replace(/\W/g, "")}.xml`, from, procedural: false });
// Run the drawer with these acts standing in for the fixture issue's record.
function drawer(acts, win_ = {}) {
  Object.assign(W, DEFAULT, { now: () => NOW }, win_);
  CS.wordsVsActionsActs = (pid, key) => (pid === fx.pid && key === fx.k ? acts.map((a) => ({ ...a })) : []);
  try {
    const h = CS.gapViewHtml(fx.pid, fx.open) || "";
    const li = (/<li class="pdxri-wva-item"[^>]*data-pdxri-wva-key="[^"]*"[^>]*>[\s\S]*?<\/li>/.exec(h) || [""])[0];
    CS.wordsVsActionsActs = () => [];
    const bare = CS.gapViewHtml(fx.pid, fx.open) || "";
    const named = (/but voted \S+ on (.+?) \((\d{4}-\d\d-\d\d)\)/.exec(li.replace(/<[^>]+>/g, "")) || []);
    return { h, bare, li, named: named[1] ? `${named[1]} ${named[2]}` : null, from: (/data-pdxri-wva-from="(\w+)"/.exec(li) || [])[1] || null };
  } finally { CS.wordsVsActionsActs = realActs; Object.assign(W, DEFAULT, { now: () => Date.now() }); }
}

// ── 1 · recent beats older; most recent always ───────────────────────────────
let r = drawer([act("H.R. 10", "2019-03-01T00:00:00Z"), act("H.R. 20", "2026-05-01T00:00:00Z"), act("H.R. 30", "2025-08-01T00:00:00Z")]);
eq(r.named, "H.R. 20 2026-05-01", "the most recent conflicting vote inside the window is named");
r = drawer([act("H.R. 11", "2020-01-01T00:00:00Z", AGAINST, "raw", "Aye"), act("H.R. 21", "2026-02-01T00:00:00Z", AGAINST, "curated")]);
eq([r.named, r.from], ["H.R. 21 2026-02-01", "curated"], "a recent curated vote beats an older raw one — the most recent always wins");
r = drawer([act("H.R. 12", "2026-03-01T00:00:00Z", AGAINST, "raw", "Aye"), act("H.R. 22", "2023-03-01T00:00:00Z")]);
eq([r.named, r.from], ["H.R. 12 2026-03-01", "raw"], "a recent raw vote beats an older curated one");
r = drawer([act("H.R. 13", "2026-04-01T18:00:00Z", AGAINST, "curated"), act("H.R. 14", "2026-04-01T09:00:00Z", AGAINST, "raw", "Aye")]);
eq([r.named, r.from], ["H.R. 14 2026-04-01", "raw"], "a same-day tie goes to the publishable raw roll call");
r = drawer([act("H.R. 15", "2026-06-01T00:00:00Z", WITH), act("H.R. 16", "2025-01-15T00:00:00Z")]);
eq(r.named, "H.R. 16 2025-01-15", "a newer vote that AGREES with the stated side is never named");

// ── 2 · only older conflicting votes → the note, naming the newest of them ───
r = drawer([act("H.R. 17", "2018-05-01T00:00:00Z"), act("H.R. 18", "2021-09-01T00:00:00Z"), act("H.R. 19", "2026-09-01T00:00:00Z", WITH)]);
eq(r.named, "H.R. 18 2021-09-01", "only older conflicting votes → the note still appears, naming the newest");
ok(r.li.includes('href="https://clerk.house.gov/evs/HR18.xml"'), "the older vote's record is linked");
r = drawer([act("H.R. 40", ""), act("H.R. 41", "2017-01-01T00:00:00Z")]);
eq(r.named, "H.R. 41 2017-01-01", "a dated older vote is preferred to an undated one");
r = drawer([act("H.R. 42", "")]);
ok(/data-pdxri-wva-key/.test(r.li) && /but voted Nay on H\.R\. 42 which|but voted Nay on H\.R\. 42,/.test(r.li.replace(/<[^>]+>/g, "")), "an undated conflicting vote still makes a note with no cutoff");

// ── 3 · a hard cutoff ────────────────────────────────────────────────────────
r = drawer([act("H.R. 50", "2019-03-01T00:00:00Z")], { cutoff: 36 });
ok(!/pdxri-wva/.test(r.h), "36-month cutoff: a 2019 vote → no note");
eq(r.h, r.bare, "no qualifying vote under the cutoff → drawer byte-identical");
r = drawer([act("H.R. 51", "2019-03-01T00:00:00Z"), act("H.R. 52", "2024-03-01T00:00:00Z")], { cutoff: 36 });
eq(r.named, "H.R. 52 2024-03-01", "36-month cutoff, 24-month window: an older vote inside the cutoff is the fallback");
r = drawer([act("H.R. 53", "")], { cutoff: 36 });
ok(!/pdxri-wva/.test(r.h), "an undated vote never passes a hard cutoff");
r = drawer([act("H.R. 54", "2026-10-01T00:00:00Z"), act("H.R. 55", "2026-01-01T00:00:00Z")], { recent: 3, cutoff: 6 });
eq(r.named, "H.R. 54 2026-10-01", "a tight window and cutoff still pick the newest");
r = drawer([act("H.R. 56", "2026-01-01T00:00:00Z")], { recent: null, cutoff: null });
eq(r.named, "H.R. 56 2026-01-01", "no window at all → the newest conflicting vote, as before");

// ── 4 · the current Congress ─────────────────────────────────────────────────
r = drawer([act("H.R. 60", "2024-12-20T00:00:00Z"), act("H.R. 61", "2025-01-10T00:00:00Z")], { recent: "congress" });
eq(r.named, "H.R. 61 2025-01-10", "'congress' on 2026-11-16 → since Jan 3 2025");
r = drawer([act("H.R. 62", "2025-01-02T00:00:00Z")], { recent: "congress", cutoff: "congress" });
ok(!/pdxri-wva/.test(r.h), "'congress' cutoff: a vote from the previous Congress → no note");
function at(iso, acts, w) {
  Object.assign(W, DEFAULT, w, { now: () => Date.parse(iso) });
  CS.wordsVsActionsActs = (pid, key) => (pid === fx.pid && key === fx.k ? acts : []);
  try { return CS.gapViewHtml(fx.pid, fx.open) || ""; }
  finally { CS.wordsVsActionsActs = realActs; Object.assign(W, DEFAULT, { now: () => Date.now() }); }
}
ok(/H\.R\. 63/.test(at("2027-01-02T12:00:00Z", [act("H.R. 63", "2025-06-01T00:00:00Z")], { recent: "congress", cutoff: "congress" })), "on Jan 2 2027 the 119th Congress still sits");
ok(!/pdxri-wva/.test(at("2027-01-05T12:00:00Z", [act("H.R. 64", "2025-06-01T00:00:00Z")], { recent: "congress", cutoff: "congress" })), "after Jan 3 2027 the new Congress starts the window");

// ── 6 · the older-vote cue ───────────────────────────────────────────────────
// The note as it was printed before the cue existed, built from its parts.
const escH = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function legacyLi(li) {
  const pair = (/data-pdxri-wva-pair="([^"]*)"/.exec(li) || [])[1], from = (/data-pdxri-wva-from="(\w+)"/.exec(li) || [])[1];
  const text = (/>([^<]*)(?: <a |<\/li>)/.exec(li) || [])[1];
  const href = (/<a href="([^"]*)"/.exec(li) || [])[1];
  return `<li class="pdxri-wva-item" data-pdxri-wva-pair="${pair}" data-pdxri-wva-key="${fx.k}" data-pdxri-wva-from="${from}">${text}` +
    (href ? ` <a href="${href}" target="_blank" rel="noopener">official record</a>` : "") + "</li>";
}
r = drawer([act("H.R. 70", "2026-05-01T00:00:00Z"), act("H.R. 71", "2019-03-01T00:00:00Z")]);
ok(!/older vote|earlier Congress|data-pdxri-wva-older/.test(r.li), "a recent vote carries no cue");
eq(r.li, legacyLi(r.li), "a recent vote's note is byte-identical to the note before the cue");
ok(/\(2026-05-01\), which ran against it; you /.test(r.li), "a recent vote's sentence is unchanged");
r = drawer([act("H.R. 72", "2026-05-01T00:00:00Z", AGAINST, "raw", "Aye")]);
ok(!/older vote/.test(r.li) && r.li === legacyLi(r.li), "a recent raw vote: no cue, unchanged markup");
r = drawer([act("H.R. 73", "2021-09-01T00:00:00Z"), act("H.R. 74", "2018-01-01T00:00:00Z")]);
eq(r.named, "H.R. 73 2021-09-01", "the fallback still names the newest older vote (selection unchanged)");
ok(/\(2021-09-01\), an older vote, which ran against it/.test(r.li), "an older fallback vote is named with the cue");
ok(/data-pdxri-wva-older="1"/.test(r.li), "the older note is marked in its markup");
r = drawer([act("H.R. 76", "")]);
ok(/on H\.R\. 76, an older vote, which ran against it/.test(r.li), "an undated vote counts as older and is cued");
r = drawer([act("H.R. 77", "2019-01-01T00:00:00Z")], { recent: null });
ok(!/older vote/.test(r.li) && r.li === legacyLi(r.li), "no window at all → nothing is a fallback, no cue");
r = drawer([act("H.R. 78", "2024-06-01T00:00:00Z")], { recent: "congress" });
ok(/\(2024-06-01\), a vote from an earlier Congress, which ran against it/.test(r.li), "'congress' window → the cue names an earlier Congress");
r = drawer([act("H.R. 79", "2025-06-01T00:00:00Z")], { recent: "congress" });
ok(!/earlier Congress/.test(r.li), "'congress' window, vote in the current Congress → no cue");
r = drawer([{ ...act("H.R. 80", "2020-02-02T00:00:00Z"), procedural: true }]);
ok(/\(2020-02-02\), an older vote, a procedural vote, which ran against it/.test(r.li), "cue and procedural label together");
ok(/function wvaOlderCue\(\)/.test(R("related-issues.js")) && (R("related-issues.js").match(/an older vote'/g) || []).length === 1, "the cue is worded once, in the note function");
for (const f of ["consistency.js", "profiles-full.js", "word-action.js"]) ok(!/older vote|wvaOlder/.test(R(f)), `${f} adds no second cue`);

// ── 5 · the real record, and one window ──────────────────────────────────────
Object.assign(W, DEFAULT, { now: () => NOW });
const real = realActs(fx.pid, fx.k).filter((a) => a.dir === AGAINST);
const since = Date.UTC(2024, 10, 16, 12, 0);
const t = (a) => Date.parse(a.date || "") || -Infinity;
const inside = real.filter((a) => t(a) >= since);
const pool = (inside.length ? inside : real).slice().sort((x, y) => t(y) - t(x));
const h = CS.gapViewHtml(fx.pid, fx.open) || "";
const li = (new RegExp(`<li class="pdxri-wva-item"[^>]*data-pdxri-wva-key="${fx.k}"[^>]*>[\\s\\S]*?</li>`).exec(h) || [""])[0].replace(/<[^>]+>/g, "");
ok(li.includes(`on ${pool[0].ident} (${String(pool[0].date).slice(0, 10)})`), `real record: the newest conflicting vote ${inside.length ? "in the window" : "overall"} is named — ${li}`);
Object.assign(W, DEFAULT, { now: () => Date.now() });
ok((R("related-issues.js").match(/var WVA_WINDOW = /g) || []).length === 1, "the window is defined once");
for (const f of ["consistency.js", "word-action.js", "voting-record.js"]) ok(!/WVA_WINDOW|recent:\s*24/.test(R(f)), `${f} defines no second window`);
ok(!/score|confiden/i.test(R("related-issues.js").slice(R("related-issues.js").indexOf("THE RECENCY WINDOW"), R("related-issues.js").indexOf("function wordsVsActionsFor"))), "the window adds no score or confidence");

if (failures.length) {
  console.log(`\n✗ words vs actions recency: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`✓ words vs actions recency: ${passed} checks passed`);
