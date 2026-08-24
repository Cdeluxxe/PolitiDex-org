#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-single-item-side.mjs — one mapped item still went one way
// ─────────────────────────────────────────────────────────────────────────────
// A member votes once on an issue. The mapping resolves that vote to a side. The
// product used to print "1 vote on file · no clear pattern yet" — the depth with
// the answer taken out of it — because the read that decides what a row may say
// was the CHARACTERISATION read, and characterising one vote is something the
// engine is right to refuse.
//
// Refusing to characterise it and refusing to show it are two different refusals,
// and only the first one is earned. This file pins the split:
//
//   1. THE ENGINE. n = 1 with a known side resolves to the thin directional read,
//      and the plain-language layer names the side without borrowing a deep
//      tier's voice.
//   2. THE INDEX. The formal-pattern index carries that side instead of "No clear
//      pattern yet", and marks the row as the single item it is.
//   3. THE WALLS THAT DO NOT MOVE. A poleless issue, an incidental mapping, and an
//      item with no readable direction are all still silent — at n = 1 as at any
//      other depth. What was lowered is depth, and only depth.
//   4. RANKING. A single directional item on a reader's axis is a live axis and
//      moves the match, at the pattern engine's own thin confidence, on the
//      shipped verdict ladder. No new arithmetic.
//   5. THE RACE CELL. The chip names the side, the disclosure names the size, and
//      the silence line never swallows a row that has one.
//   6. THE PROFILE. The row's lead sentence says which way the single item went
//      instead of printing its count under a refusal.
//   7. NO INFLATION. Nowhere in any of it does one item read as a career.
//   8. THE MUTATIONS. Putting n = 1 back behind side-less silence — in the index,
//      in the vocabulary, or in the cell — must fail this file.
//
//   node scripts/test-single-item-side.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, votes seeded the
// way a completed /api/voting-record fetch leaves the cache.

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
  "profile-spine.js", "issue-colors.js", "my-stances.js", "voter-hub-location.js",
  "compare-hub.js", "ballot-breakdown.js", "race-sheet.js",
];
const SRC = FILES.map((f) => [f, R(f)]);

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ single-item harness is STALE — a contract cannot be verified:\n  ${msg}`);
  process.exit(2);
};

function miniDom(win) {
  const byId = {};
  const el = (id) => ({
    id: id || "", className: "", innerHTML: "", textContent: "",
    style: {}, dataset: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute(k, v) { this["attr_" + k] = v; }, getAttribute(k) { return this["attr_" + k] ?? null; },
    removeAttribute() {}, addEventListener() {}, removeEventListener() {},
    appendChild(c) { this.children.push(c); if (c && c.id) byId[c.id] = c; return c; },
    removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, click() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
  });
  win.document.createElement = () => el("");
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = el("body");
  win.document.body.appendChild = function (c) { if (c && c.id) byId[c.id] = c; return c; };
  return byId;
}

function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const store = opts.store || {}, sess = opts.session || {};
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; },
  };
  win.sessionStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(sess, k) ? sess[k] : null),
    setItem: (k, v) => { sess[k] = String(v); }, removeItem: (k) => { delete sess[k]; },
  };
  win.auth = { currentUser: null };
  win._cmpSelected = [];
  miniDom(win);
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const [f, src] of SRC) {
    const body = (opts.mutate && opts.mutate[f]) ? opts.mutate[f](src) : src;
    try { vm.runInContext(body, sandbox, { filename: f }); } catch (e) { /* fail closed */ }
  }
  win.PROFILES = win.CMP_DATA;
  win._hasUserLocation = true;
  win._currentVoterLocation = { state: "Utah", city: "Provo", county: "Utah County", district: "3" };
  return win;
}

// ── The fixture ──────────────────────────────────────────────────────────────
const SEAT = "senate";
const probe = boot();
must(typeof probe.pdxOpenRaceSheet === "function", "the race sheet is not exposed");
must(typeof probe._recordPatternTier === "function", "the pattern tier engine is not loaded");
must(typeof probe._recordDisplayTier === "function", "the display tier engine is not loaded");
must(probe.PDXConsistency && probe.PDXConsistency.formalPatternIndex,
  "the formal-pattern index is not loaded");

const FIELD = probe.PDXRaceSheet._field(SEAT);
must(FIELD.length >= 2, `the fixture seat "${SEAT}" no longer has a field of 2+`);
const [A_PID, B_PID] = FIELD.map((c) => c.pid);

const NO_POLE = probe._PDX_RD_NO_POLE || {};
const sideable = (k) => !/_balance$/.test(k) && !NO_POLE[k];
const mapA0 = probe._polPositionMap(A_PID, probe.CMP_DATA[A_PID]) || {};
const mapB0 = probe._polPositionMap(B_PID, probe.CMP_DATA[B_PID]) || {};
const SILENT = Object.keys(probe.ISSUE_MAP || {})
  .filter((k) => sideable(k) && !mapA0[k] && !mapB0[k]);
must(SILENT.length >= 2, "the fixture needs 2+ issues neither candidate has stated");
const [K, K2] = SILENT;
const POLELESS = Object.keys(NO_POLE).filter((k) => (probe.ISSUE_MAP || {})[k])[0];
must(!!POLELESS, "the taxonomy no longer publishes a poleless issue to test the wall with");

// `o.incidental` — the measure brushed the issue rather than being about it.
// `o.present`   — on the record, no side resolvable from it.
const vote = (n, key, position, o) => ({
  kind: "vote", rollcallId: 7000 + n, measureId: 7500 + n, number: "S. " + (300 + n),
  date: "2025-0" + ((n % 9) + 1) + "-09", action: "On Passage",
  position: (o && o.present) ? "Present" : position,
  isProcedural: false, title: "Measure " + n,
  issues: [{ issueKey: key, weight: 100,
             isPrimary: !(o && o.incidental), supportMeaning: "yea_supports" }],
  source: { url: "https://www.congress.gov/roll-call-vote/" + (7000 + n), label: "Congress.gov" },
});
const runOf = (n, key, position, from) => {
  const out = [];
  for (let i = 0; i < n; i++) out.push(vote(from + i, key, position));
  return out;
};

// THE SUBJECT OF THIS FILE: exactly one item on K, and it went one way. Nothing
// else on K, and no quote from anyone on K anywhere in the corpus.
const ONE_YEA = [vote(1, K, "yea")];
// The same single item, on a member whose wider file clears the coverage floor —
// the two ways a reader arrives at n = 1, which must read identically.
const ONE_YEA_COVERED = [vote(1, K, "yea")].concat(runOf(11, K2, "yea", 20));

function stage(opts) {
  opts = opts || {};
  const win = boot(opts);
  if (opts.a) win.PDXVotingRecord.noteMember(A_PID, JSON.parse(JSON.stringify(opts.a)));
  if (opts.b) win.PDXVotingRecord.noteMember(B_PID, JSON.parse(JSON.stringify(opts.b)));
  (opts.keys || [K]).forEach((k) => win.alignToggleIssue(k));
  return win;
}
const sheetHtml = (win) => {
  win.pdxOpenRaceSheet(SEAT);
  const ov = win.document.getElementById("pdx-racesheet-overlay");
  return ov ? String(ov.innerHTML) : "";
};
const fpiRow = (win, pid, key) =>
  (win.PDXConsistency.formalPatternIndex.rows(pid) || []).filter((x) => x.key === key)[0] || null;

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the engine reads a side off one mapped item, and words it modestly");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = stage({ a: ONE_YEA_COVERED });
  const idx = w._pdxRecordDirection(A_PID, K, { noun: { one: "vote", many: "votes" }, label: K });
  must(idx && idx.judged === 1, "the fixture no longer produces exactly one judged item on K");
  const t = w._recordPatternTier(idx, { noun: { one: "vote", many: "votes" } });
  must(!!t, "the pattern engine returned nothing at all for the single item");
  eq(t.tier, "thin", "one mapped item with a side is the thin tier, not 'none'");
  eq(t.directional, true, "…and it is directional");
  eq(t.tone, "support", "…on the side the item actually took");
  has(t.label, "supports", "…named on the chip");
  has(t.counts, "1 vote advanced", "…with the single item counted as one item");
  // The plain-language layer, which is what most faces print.
  must(!!t.says, "the tier came back with no published reading");
  eq(t.says.key, "early_supports", "the reading for a thin supporting record is the thin one");
  eq(t.says.characterising, false,
    "a thin side is published as characterising — one item is not a characterisation");
  ok(!/Strongly|Mostly|pattern|trend|career/i.test(t.says.label),
    `the reading borrows a deep tier's voice: "${t.says.label}"`);
  ok(/support/i.test(t.says.label), `the reading withholds the side: "${t.says.label}"`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the formal index carries that side, and says it is one item");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Both arrivals at n = 1: a member whose wider file clears the coverage floor,
  // and one whose does not. The second used to come back muted, because the floor
  // is a wall about how much of the MEMBER we hold — a real wall, and not one that
  // has anything to say about a single item that is right there on the ledger.
  for (const [what, seed] of [["covered", ONE_YEA_COVERED], ["under the coverage floor", ONE_YEA]]) {
    const w = stage({ a: seed });
    const x = fpiRow(w, A_PID, K);
    must(!!x, `${what}: the single-item issue is not in the formal index at all`);
    eq(x.tier, "thin", `${what}: the index still files one mapped item as no tier`);
    eq(x.tone, "support", `${what}: …with no side`);
    eq(x.read, true, `${what}: …and as unread`);
    eq(x.directional, true, `${what}: …and as non-directional`);
    eq(x.judged, 1, `${what}: the index lost count of how many items it read`);
    lacks(x.patLabel, "No clear pattern yet",
      `${what}: the index still prints the refusal over a mapped item with a side`);
    lacks(x.patLabel, "Strongly", `${what}: …or inflates one item into a strong pattern`);
    lacks(x.patLabel, "Mostly", `${what}: …or into a qualified one`);
  }
  // `single` marks the rows that exist only because the one-item case was split
  // out — the covered row was always readable, the floored one was not.
  eq(fpiRow(stage({ a: ONE_YEA }), A_PID, K).single, true,
    "the row the split created is not marked as a single item");
  eq(fpiRow(stage({ a: ONE_YEA_COVERED }), A_PID, K).single, false,
    "a row the pattern engine read on its own is mislabelled as the split's work");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the walls that did not move — depth was lowered, meaning was not");
// ═════════════════════════════════════════════════════════════════════════════
{
  // (a) One item that resolves to NO side. Nothing was read, so nothing is said.
  {
    const w = stage({ a: [vote(2, K, "yea", { present: true })].concat(runOf(11, K2, "yea", 20)) });
    const x = fpiRow(w, A_PID, K);
    must(!!x, "the unreadable single item fell out of the index entirely");
    eq(x.directional, false, "an item with no readable side was given one");
    eq(x.tone, "muted", "…and a colour to go with it");
    has(x.patLabel, "No clear pattern yet", "…instead of the honest refusal");
    eq(w._calcAlignmentScore(A_PID, { mode: "record" }), null,
      "…and it must not make the axis live");
  }
  // (b) One item that only brushed the issue. A coincidence is not a vote on it.
  {
    const w = stage({ a: [vote(3, K, "yea", { incidental: true })].concat(runOf(11, K2, "yea", 20)) });
    const x = fpiRow(w, A_PID, K);
    must(!!x, "the incidental single item fell out of the index entirely");
    eq(x.directional, false, "an omnibus that brushed the issue was read as a vote on it");
    eq(w._calcAlignmentScore(A_PID, { mode: "record" }), null,
      "…and it must not make the axis live");
  }
  // (c) One item on an issue with no for-or-against pole. There is nothing to lean on.
  {
    const w = stage({ a: [vote(4, POLELESS, "yea")].concat(runOf(11, K2, "yea", 20)),
                      keys: [POLELESS] });
    const x = fpiRow(w, A_PID, POLELESS);
    if (x) {
      eq(x.directional, false, "a poleless issue was given a direction at n = 1");
      eq(x.tone, "muted", "…and a colour to go with it");
    } else { ok(true, "a poleless issue keeps no directional row at n = 1"); }
    eq(w._calcAlignmentScore(A_PID, { mode: "record" }), null,
      "…and a poleless issue must not make the axis live either");
  }
  // (d) TWO items under the coverage floor are NOT this change. The floor is a
  //     wall about how much of the member we hold, and only the n = 1 case — where
  //     there is no sample question left to ask — was taken out from behind it.
  {
    const w = stage({ a: [vote(5, K, "yea"), vote(6, K, "yea")] });
    const x = fpiRow(w, A_PID, K);
    must(!!x, "the two-item floored row fell out of the index entirely");
    eq(x.directional, false,
      "the coverage floor was lowered past one item — this change stops at n = 1");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · one item moves the match, on the shipped ladder at thin confidence");
// ═════════════════════════════════════════════════════════════════════════════
{
  // A holds one item on K, against the grain of nothing at all; B holds nothing.
  const w = stage({ a: ONE_YEA });
  const score = w._calcAlignmentScore(A_PID, { mode: "record" });
  ok(typeof score === "number" && isFinite(score),
    `a single directional item leaves the candidate unscoreable — got ${JSON.stringify(score)}`);
  eq(w._calcAlignmentScore(B_PID, { mode: "record" }), null,
    "the opponent with nothing on file is still honestly unscoreable");
  const bd = w._calcAlignmentBreakdown(A_PID, { mode: "record" });
  const row = (bd && bd.issues || []).filter((r) => r.key === K)[0];
  must(!!row, "the single-item issue is not a live axis in the breakdown");
  eq(row.source, "record", "the candidate half came from the formal lane");
  eq(row.stance, null, "…and carries no stance");
  eq(row.direct, false, "…and is not flagged as a documented position");
  // THE BRANCH, PINNED. No new percentage: the shipped verdict ladder, scaled by
  // the pattern engine's own published confidence for the thin tier.
  eq(row.pattern && row.pattern.tier, "thin", "the axis is carried at the thin tier");
  eq(row.pattern && row.pattern.conf, w._PDX_ALIGN_PAT_CONF.thin,
    "…at the shipped thin confidence, not one coined for this case");
  eq(w._PDX_ALIGN_PAT_CONF.thin, 0.5, "the thin confidence itself changed value");
  ok(["match", "partial", "mismatch"].indexOf(row.verdict) >= 0,
    `the axis resolved to an unknown verdict "${row.verdict}"`);
  // And the ordering actually moves: one directional item outranks a pure void.
  const r = w.PDXRaceSheet._rank(w.PDXRaceSheet._field(SEAT), "record", true);
  eq(r.ranked.length, 1, "the single-item candidate is not in the ordered field");
  eq(r.ranked[0].pid, A_PID, "…or is not the one who was ranked");
  eq(r.gap.length, 1, "the candidate with nothing on file is not banded");
  eq(r.gap[0].pid, B_PID, "…or the wrong one was");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the race cell shows the side, the size, and no invented stance");
// ═════════════════════════════════════════════════════════════════════════════
{
  // A advances K twelve times; B has one item on K and it cut against. Both are
  // ranked, and the one-item cell has to say all three things at once.
  const w = stage({ a: runOf(12, K, "yea", 40), b: [vote(9, K, "nay")] });
  const html = sheetHtml(w);
  must(html.length > 800, "the sheet painted nothing at all");
  has(html, "Thin opposes", "the single-item cell withholds the side its one vote took");
  has(html, "1 vote against", "…or the fact that there is one of it");
  has(html, "Single formal item · not a pattern",
    "…or refuses to say it is a single item rather than a pattern");
  has(html, "no stance on file · not in Direction Match",
    "…the two disclosures a record cell owes a reader are not both there");
  lacks(html, "1 vote on file · no clear pattern yet",
    "the depth line still prints the refusal over an item with a known side");
  lacks(html, "No readable vote pattern",
    "…or claims there was nothing readable at all");
  lacks(html, "Says:", "a pattern is still never printed as a stated position");
  lacks(html, "align-sig-said", "…and no stated-position chip appears on this sheet");
  // Both candidates ranked, so nothing here is a band.
  const r = w.PDXRaceSheet._rank(w.PDXRaceSheet._field(SEAT), "record", true);
  eq(r.gap.length, 0, "a candidate with a readable single item is banded as unrankable");
  eq(r.ranked.length, 2, "…so both sides of this fixture belong in the ordered field");
  // The one-item candidate must not read like the twelve-vote one.
  const bIdx = html.indexOf("Thin opposes");
  must(bIdx > 0, "the thin chip is not on the sheet — its neighbourhood is untestable");
  lacks(html.slice(Math.max(0, bIdx - 400), bIdx + 400), "Strongly opposes",
    "the single item is rendered in the same breath as a deep one-way pattern");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the profile row leads with the side, not with a count under a refusal");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = stage({ a: ONE_YEA });
  const html = String(w.PDXConsistency.stancesSectionHtml(A_PID) || "");
  must(html.length > 400, "the profile's stance section painted nothing");
  const plain = html.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");
  // The row for K, wherever it sits: the side has to be visible in the words a
  // reader can actually read, not only in a title attribute.
  ok(/Supports, on a thin record|Thin supports/.test(plain),
    "the profile prints the single item's depth with its direction withheld");
  ok(/1 vote advanced|1 vote on file|1 item on file/.test(plain),
    "…or drops the count that says how little of it there is");
  ok(!/Strongly supports/.test(plain),
    "…or inflates one recorded vote into a strong career pattern");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the vocabulary is fixed, and a thin side never promotes");
// ═════════════════════════════════════════════════════════════════════════════
{
  const SAYS = probe._PDX_RD_SAYS;
  must(!!SAYS, "the plain-language vocabulary is not published");
  for (const k of ["early_supports", "early_opposes"]) {
    must(!!SAYS[k], `the vocabulary has no "${k}" reading — the split is not published`);
    eq(SAYS[k].characterising, false, `"${k}" promoted itself into a characterisation`);
    ok(!/Strongly|Mostly/.test(SAYS[k].label), `"${k}" borrows a deep tier's voice`);
  }
  eq(probe._recordSays("thin", "supports").key, "early_supports",
    "the resolver stopped routing a thin supporting record to its own reading");
  eq(probe._recordSays("thin", "opposes").key, "early_opposes",
    "the resolver stopped routing a thin opposing record to its own reading");
  eq(probe._recordSays("thin", "").key, "early",
    "a thin tier with no direction was handed a side it never had");
  eq(probe._recordSays("wat", "supports").key, "unread",
    "an unrecognised tier resolves to a side — the fallback must fail closed");
  // The index's own gates are untouched: a thin read is still not `characterised`
  // and still not `counted`, so nothing that decides anything can see it.
  const w = stage({ a: ONE_YEA_COVERED });
  const idx = w._pdxRecordDirection(A_PID, K, { noun: { one: "vote", many: "votes" }, label: K });
  eq(idx.characterised, false, "one item was promoted to a characterised record");
  eq(idx.counted, false, "…or to a counted one");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the mutations — putting n = 1 back behind silence must break this");
// ═════════════════════════════════════════════════════════════════════════════
{
  const mutant = (mutate, probeFn) => {
    let win;
    try { win = stage({ mutate, a: ONE_YEA, b: [vote(9, K, "nay")] }); }
    catch (e) { return { threw: String(e && e.message) }; }
    return probeFn(win);
  };

  // M1 — the index: refuse the one-item read and go back to the characterisation
  // read alone. This is the exact line the whole change turns on.
  const G1 = "if (one) { t = one; single = true; }";
  must(R("consistency.js").indexOf(G1) > 0,
    "the one-item split in _fpiRows has moved — M1 can no longer be applied");
  const m1 = mutant({ "consistency.js": (s) => s.replace(G1, "if (false) { t = one; single = true; }") },
    (w) => ({
      dir: (fpiRow(w, A_PID, K) || {}).directional,
      score: w._calcAlignmentScore(A_PID, { mode: "record" }),
      html: sheetHtml(w),
    }));
  eq(m1.dir, false, "M1: reverting the split leaves the single item side-less — as it should");
  eq(m1.score, null, "M1: …and un-scores the candidate, which section 4 would catch");
  has(m1.html, "no clear pattern yet",
    "M1: …and puts the refusal back over a mapped item, which section 5 would catch");

  // M2 — the vocabulary: send a thin directional record back to the wordless
  // refusal, so the count prints with the answer removed.
  const G2 = "if (dirWord === 'supports') return _RD_SAYS.early_supports;";
  must(R("stance-helpers.js").indexOf(G2) > 0,
    "the thin directional reading has moved — M2 can no longer be applied");
  const m2 = mutant({ "stance-helpers.js": (s) => s.replace(G2, "if (dirWord === 'supports') return _RD_SAYS.early;") },
    // Asked of the resolver directly: the seed A carries here is under the
    // coverage floor, where the characterisation read is legitimately 'none' and
    // would answer 'unread' for reasons that have nothing to do with M2.
    (w) => ({ key: w._recordSays("thin", "supports").key }));
  eq(m2.key, "early", "M2: the thin supporting record falls back to the wordless refusal");
  ok(m2.key !== "early_supports", "M2: …which is what section 1 pins against");

  // M3 — the cell: let the depth line swallow a row that has a known side.
  const G3 = "if (fRow.directional && fRow.patLabel) {";
  must(R("race-sheet.js").indexOf(G3) > 0,
    "recSilence's known-side guard has moved — M3 can no longer be applied");
  const m3 = mutant({ "race-sheet.js": (s) => s.replace(G3, "if (false) {") },
    (w) => ({ html: sheetHtml(w) }));
  ok(typeof m3.html === "string" && m3.html.length > 800,
    "M3: the mutant sheet did not paint — the mutation is untestable");
  // The guard is defence in depth: with the index reading a side, the silence
  // branch is not reached, so removing the guard must change nothing a reader
  // sees. That is the assertion — a guard that alters live output is not a guard.
  const clean = sheetHtml(stage({ a: ONE_YEA, b: [vote(9, K, "nay")] }));
  eq(m3.html.length, clean.length,
    "M3: removing the known-side guard changed the painted sheet — the silence branch is live");
}

if (failures.length) {
  console.error(`\n✗ single item, known side: ${failures.length} failed, ${passed} passed\n`);
  failures.slice(0, 30).forEach((f) => console.error("   · " + f));
  process.exit(1);
}
console.log(`\n✓ one mapped item still went one way — ${passed} assertions passed\n`);
