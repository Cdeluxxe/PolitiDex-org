#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// ONE FILE, EIGHT ROWS, ONE TOTAL — the recommit Yea on Support for Israel
// ─────────────────────────────────────────────────────────────────────────────
// A person file's Support for Israel card and issue drawer said "0 for · 8
// against"; the measure list under the drawer said "3 advancing · 5 opposing".
// Same eight rows. The three that disagreed were recommit / commit Yeas.
//
// THE OWNERS:
//   card    — _recordDirectionIndex (stance-helpers.js) → _voteEffectiveSupport
//   drawer  — _dosTally → _dosActDir (consistency.js)   → _voteEffectiveSupport
//   list    — _ledSplit → _dosItemDir (consistency.js)
// The first two count the MAPPED DIRECTION: the clerk's Yea/Nay, flipped by the
// stored `advanceInverted` (yeaBlocksMeasure in vr-pack.ts), then by the mapping's
// supportMeaning. The list read the clerk's Yea/Nay × supportMeaning and dropped
// `advanceInverted` — a stored direction. The stored direction wins, so the list
// is the surface that changed; nothing else moved.
//
// Asserted per row: clerk word, motion kind, stored direction, and which total
// each surface adds it to. Then the mutation this pass exists to stop — a
// recommit Yea counted as "for" with nothing stored saying so — must fail here.
// Then the unmapped row: out of every for/against line, named "unmapped".
//
//   node scripts/test-recommit-direction-split.mjs
//
// Real shipped modules in a node:vm sandbox. No database, no network.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "coverage.js", "profile-spine.js", "profiles-full.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
function boot(patch) {
  const win = makeSandbox();
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const [f, src] of SRC) vm.runInContext(patch ? patch(f, src) : src, sandbox, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
}

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ recommit direction split: ${msg}`);
  process.exit(2);
};
const section = (t) => console.log(`\n   ── ${t}`);
const txt = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const PID = "schumer";
const KEY = "israel_support";
const probe = boot();
must(probe.PDXConsistency && probe.PDXVotingRecord, "the shipped modules did not publish their globals");
must(probe.ISSUE_MAP && probe.ISSUE_MAP[KEY], `${KEY} is no longer an issue key`);
must(typeof probe._recordDirectionIndex === "function", "_recordDirectionIndex is not published — the card's owner moved");
const NO_POLE = probe._PDX_RD_NO_POLE || {};
must(!NO_POLE[KEY], `${KEY} is a no-pole key — the fixture needs a polable issue`);
const MEMBER_FLOOR = probe._PDX_RD_MEMBER_FLOOR;
must(Number.isInteger(MEMBER_FLOOR), "the published member floor is not an integer");
const FILLER = Object.keys(probe.ISSUE_MAP)
  .filter((k) => k !== KEY && !/_balance$/.test(k) && !NO_POLE[k]);

// ── The eight rows ───────────────────────────────────────────────────────────
// `inv` is what the ingest stores: yeaBlocksMeasure(question). The expected
// direction is derived from the stored fields, never from the number we want.
const ROWS = [
  { n: "H.R. 8034", pos: "yea", action: "On Motion to Recommit", inv: true, kind: "Recommit", sm: "yea_supports" },
  { n: "H.R. 6126", pos: "yea", action: "On Motion to Recommit with Instructions", inv: true, kind: "Recommit", sm: "yea_supports" },
  { n: "H.R. 7217", pos: "yea", action: "On Motion to Commit", inv: true, kind: "Commit", sm: "yea_supports" },
  { n: "H.R. 2882", pos: "nay", action: "On Passage", type: "passage", inv: false, kind: "Passage", sm: "yea_supports" },
  { n: "H.R. 5933", pos: "nay", action: "On Passage", type: "passage", inv: false, kind: "Passage", sm: "yea_supports" },
  { n: "H.R. 3266", pos: "nay", action: "On Passage", type: "passage", inv: false, kind: "Passage", sm: "yea_supports" },
  { n: "H.Res. 888", pos: "yea", action: "On Agreeing to the Resolution", type: "passage", inv: false, kind: "Passage", sm: "yea_opposes" },
  { n: "H.R. 8369", pos: "nay", action: "On Passage", type: "passage", inv: false, kind: "Passage", sm: "yea_supports" },
];
const storedDir = (r) => {
  let adv = r.pos === "yea";
  if (r.inv) adv = !adv;
  return ((r.sm !== "yea_opposes") === adv) ? "advances" : "opposes";
};

let seq = 0;
const vote = (issueKey, position, over) => {
  seq++;
  return Object.assign({
    kind: "vote", rollcallId: "rc-" + seq, measureId: 4400 + seq,
    number: "H.R. " + (9000 + seq), title: "Measure " + seq,
    date: "2024-0" + ((seq % 9) + 1) + "-11",
    action: "On Passage", actionType: "passage",
    position, isProcedural: false, advanceInverted: false, chamber: "house",
    source: { url: "https://clerk.house.gov/Votes/" + seq, label: "Clerk of the House" },
    issues: [{ issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
  }, over || {});
};
function seed(rows, extra) {
  seq = 0;
  const out = rows.map((r) => vote(KEY, r.pos, {
    number: r.n, title: "Israel measure " + r.n, action: r.action,
    actionType: r.type || "motion", isProcedural: !!r.inv, advanceInverted: r.inv,
    issues: r.sm === null ? [] : [{ issueKey: KEY, weight: 100, isPrimary: true, supportMeaning: r.sm }],
  }));
  (extra || []).forEach((v) => out.push(v));
  FILLER.slice(0, 2).forEach((k) => { for (let j = 0; j < MEMBER_FLOOR; j++) out.push(vote(k, "yea")); });
  return out;
}
function read(items, patch) {
  const W = boot(patch);
  const recs = JSON.parse(JSON.stringify(items));
  W.PDXVotingRecord.noteMember(PID, recs);
  const CS = W.PDXConsistency;
  const ov = CS.officialRecord(PID, KEY);
  const dosItems = CS.dossierItems(PID, KEY, ov) || [];
  return {
    W, CS, ov, dosItems,
    card: W._recordDirectionIndex(KEY, recs.filter((x) => (x.issues || []).some((m) => m.issueKey === KEY))),
    tally: CS.dossierTally(PID, KEY, ov),
    split: CS.ledger.split(PID, KEY, ov),
    dossier: CS.dossierRecordsHtml(PID, KEY),
  };
}
const byNum = (arr, n, f) => arr.find((x) => String(f(x) || "").trim() === n);

const A = read(seed(ROWS));
must(A.dosItems.length === 8, `the fixture listed ${A.dosItems.length} rows, not eight`);
must(A.tally.rows.length === 8, `the drawer tallied ${A.tally.rows.length} rows, not eight`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · each of the eight rows, one by one");
for (const r of ROWS) {
  const want = storedDir(r);
  const d = byNum(A.dosItems, r.n, (x) => x.ident);
  const t = byNum(A.tally.rows, r.n, (x) => x.d.ident);
  ok(d && t, `${r.n}: missing from the list or the drawer`);
  if (!d || !t) continue;
  eq(t.vote.word, r.pos === "yea" ? "Yea" : "Nay", `${r.n}: clerk's word`);
  eq(t.kind.word, r.kind, `${r.n}: motion kind`);
  eq(!!d.item.advanceInverted, r.inv, `${r.n}: stored inversion`);
  eq(d.support, r.sm, `${r.n}: stored support meaning`);
  eq(t.dir, want, `${r.n}: drawer adds it to the ${want} total`);
  eq(A.CS.ledger.itemDir(d.item, "record", KEY), want, `${r.n}: list (row read) adds it to the ${want} total`);
  const cardEff = A.W._voteEffectiveSupport(d.item, d.support);
  eq(cardEff === true ? "advances" : cardEff === false ? "opposes" : "", want,
    `${r.n}: card adds it to the ${want} total`);
}
// The three that used to disagree: a Yea on file, and against on every surface.
for (const r of ROWS.filter((x) => x.inv)) {
  eq(storedDir(r), "opposes", `${r.n}: a recommit/commit Yea on a yea_supports mapping is against`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the card, the drawer and the list print one total");
{
  const wantAdv = ROWS.filter((r) => storedDir(r) === "advances").length;
  const wantOpp = ROWS.filter((r) => storedDir(r) === "opposes").length;
  eq(wantAdv, 0, "fixture: nothing on file advances the issue");
  eq(wantOpp, 8, "fixture: all eight cut against it");
  eq(A.card.advances, wantAdv, "card: for");
  eq(A.card.opposes, wantOpp, "card: against");
  eq(A.tally.advances, wantAdv, "drawer: for");
  eq(A.tally.opposes, wantOpp, "drawer: against");
  eq(A.split.advances, wantAdv, "list: advancing");
  eq(A.split.opposes, wantOpp, "list: opposing");
  eq(A.split.unmapped, 0, "list: nothing here is unmapped");
  eq(A.CS.ledger.splitSay(A.split), "8 opposing", "list: chip-length split");
  const head = txt(A.dossier.slice(0, A.dossier.search(/<details class="pdxdos-rec(?![a-z])/)));
  has(head, "mapped direction: 8 opposing", "list: the closed face says it counts mapped direction");
  lacks(head, "3 advancing", "list: the clerk-word total is gone");
  // Row faces under the list agree with the header above them.
  eq((A.dossier.match(/▲ Advances/g) || []).length, 0, "list rows: no recommit Yea wears an advancing pill");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · mutation: a recommit Yea counted as for, with nothing stored saying so");
{
  // Strip the stored inversion out of the list's read — the pre-fix behaviour.
  const NEEDLE = "if (d.item && d.item.advanceInverted) adv = !adv;";
  must(R("consistency.js").indexOf(NEEDLE) >= 0, "the inversion line in _dosItemDir moved — the mutation cannot be planted");
  const M = read(seed(ROWS), (f, src) => f === "consistency.js" ? src.replace(NEEDLE, "") : src);
  const caught = M.split.advances !== 0 || M.split.opposes !== 8 ||
    M.split.advances !== M.tally.advances || M.split.opposes !== M.tally.opposes;
  ok(caught, "the mutation that counts recommit Yeas as for went undetected");
  eq(M.split.advances, 3, "mutation: it reproduces the reported 3 advancing");
  eq(M.split.opposes, 5, "mutation: …and 5 opposing");
  // And the fixture's own check would have failed against it.
  ok(M.split.advances !== A.tally.advances, "mutation: the list total diverges from the drawer's");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · a row with no stored direction is unmapped, not against");
{
  // The ninth row: a recommit Yea on this issue whose mapping carries no support
  // meaning. Planted at the one line _dosItems reads it from, so the list, the
  // drawer and the predicate all see the same empty field.
  const recs = seed(ROWS);
  recs.splice(8, 0, vote(KEY, "yea", {
    number: "H.R. 9999", title: "Unmapped Israel measure", action: "On Motion to Recommit",
    actionType: "motion", isProcedural: true, advanceInverted: true,
    issues: [{ issueKey: KEY, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
  }));
  const W2 = boot((f, src) => f === "consistency.js"
    ? src.replace("base.support = (m && m.supportMeaning) || '';",
        "base.support = (item && item.number === 'H.R. 9999') ? '' : ((m && m.supportMeaning) || '');")
    : src);
  must(R("consistency.js").indexOf("base.support = (m && m.supportMeaning) || '';") >= 0,
    "_dosItems no longer sets base.support that way — the unmapped probe cannot be planted");
  W2.PDXVotingRecord.noteMember(PID, JSON.parse(JSON.stringify(recs)));
  const CS2 = W2.PDXConsistency;
  const ov2 = CS2.officialRecord(PID, KEY);
  const items2 = CS2.dossierItems(PID, KEY, ov2) || [];
  const u = byNum(items2, "H.R. 9999", (x) => x.ident);
  must(u && u.support === "", "the unmapped probe did not take — H.R. 9999 still carries a meaning");
  const sp2 = CS2.ledger.split(PID, KEY, ov2);
  eq(sp2.advances, 0, "unmapped: not added to advancing");
  eq(sp2.opposes, 8, "unmapped: not added to opposing — the eight mapped rows only");
  eq(sp2.unmapped, 1, "unmapped: counted as unmapped");
  eq(sp2.unclear, 0, "unmapped: not filed with the curated rows that carry no direction");
  eq(sp2.noSide, 0, "unmapped: not described as taking no side");
  eq(CS2.ledger.splitSay(sp2), "8 opposing · 1 unmapped", "unmapped: named in the list");
  const t2 = CS2.dossierTally(PID, KEY, ov2);
  eq(t2.advances, 0, "unmapped: the drawer does not default it to for");
  eq(t2.opposes, 8, "unmapped: nor to against");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · fences");
{
  const SH = R("stance-helpers.js");
  has(SH, "if (itemOrPosition && typeof itemOrPosition === 'object' && itemOrPosition.advanceInverted) {",
    "_voteEffectiveSupport — Direction Match's read — still applies the inversion, untouched");
  // The engine's own read of the eight rows is unchanged: Direction Match sees
  // exactly what the card and the drawer always saw.
  for (const r of ROWS) {
    const d = byNum(A.dosItems, r.n, (x) => x.ident);
    const eff = A.W._voteEffectiveSupport(d.item, d.support);
    eq(eff, storedDir(r) === "advances", `${r.n}: the engine's effective support is the stored direction`);
  }
}

console.log(`\n${failures.length ? "✗" : "✓"} recommit direction split: ${passed} passed, ${failures.length} failed`);
if (failures.length) { for (const f of failures) console.log("   ✗ " + f); process.exit(1); }
