#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-record-pattern-tiers.mjs — the five-rung record pattern chip on a row
// ─────────────────────────────────────────────────────────────────────────────
// Slice 2 of the Vote Pattern Index, and a PRESENTATION slice only. Slice 1
// (test-record-direction.mjs) gave the silent rows a prose clause; this gives
// every row with formal items on file a scannable chip saying how one-sided that
// record was — Strongly / Mostly / Split / Thin / No clear pattern yet — in the
// site's own direction colours, with the counts beside the label.
//
// The chip says "supports" and "opposes", which is stance vocabulary on a fact
// that is not a stance. Everything below is the fence that makes that safe:
//
//   1. FIVE TIERS, ONE CASE EACH, off the SHIPPED gates. A uniform deep run is
//      Strongly; a dominant run with counter-votes is Mostly; a record that ran
//      both ways is Split with no direction at all; one to three one-way items
//      are Thin and are never worded as a tendency; everything the index
//      declines to characterise is "No clear pattern yet".
//   2. THIN IS VISIBLY SMALLER. Its own word, its own weight class, no fill —
//      and it never borrows Strongly's or Mostly's wording.
//   3. THE THRESHOLDS ARE NOT RE-IMPLEMENTED. The tier engine reads the index
//      and nothing else: no new floor, no new dominance ratio, and moving a
//      shipped gate moves the chip.
//   4. FAIL CLOSED, BOTH WAYS. An issue with no directional pole prints NO chip
//      (the shortfall is our mapping's). A record we may not characterise prints
//      the grey "No clear pattern yet" (the shortfall is the record's).
//   5. IT IS NOT A STANCE. It never touches a position map, a row with a stated
//      position shows BOTH the chip and "Says: …", and the chip carries the
//      sentence saying which is which.
//   6. IT IS NOT A SCORE. No percentage in the chip, nothing ordinal on it, the
//      row's own result/state/bucket/tier untouched — and Direction Match is
//      byte-identical with the whole thing switched off.
//   7. IT IS FORMAL-LANE ONLY. Public receipts cannot move it, and the exec lane
//      still declines.
//
//   node scripts/test-record-pattern-tiers.mjs
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
  "cmp-data.js",
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  "stance-helpers.js",
  "alignment-tool.js",
  "acct-spotlight-data.js",
  "say-vs-do.js",
  "exec-action-data.js",
  "exec-record.js",
  "exec-record-ui.js",
  "consistency.js",
  "voting-record.js",
  "word-action.js",
  "profile-spine.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
function boot() {
  const win = makeSandbox();
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const [f, src] of SRC) vm.runInContext(src, sandbox, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
}

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (hay, needle, msg) =>
  ok(String(hay).includes(needle), `${msg} — ${JSON.stringify(needle)} missing`);
const lacks = (hay, needle, msg) =>
  ok(!String(hay).includes(needle), `${msg} — ${JSON.stringify(needle)} present`);
const section = (t) => console.log(`  · ${t}`);
// A stale probe is not a pass: if the fixture stops offering a case, the file
// says so and stops rather than reporting green over an empty assertion.
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`✗ pattern tiers: ${msg}`);
  process.exit(2);
};

// ── The fixture ──────────────────────────────────────────────────────────────
// A House member for the seeded cases (one profile, every tier reachable) and
// SCHUMER as the acceptance target the brief names: a real Senate record, real
// stated positions, no seeding at all.
const PID = "massie";
const CONTROL = "schumer";

const probe = boot();
const stanceKeys = new Set(
  probe.PDXConsistency.issueRows(PID).filter((r) => r.said).map((r) => r.key)
);
const ISSUE_KEYS = Object.keys(probe.ISSUE_MAP || {});
const SILENT = ISSUE_KEYS.filter((k) => !stanceKeys.has(k) && !/_balance$/.test(k));
const BALANCE = ISSUE_KEYS.filter((k) => !stanceKeys.has(k) && /_balance$/.test(k))[0];
const SPOKEN = ISSUE_KEYS.filter((k) => stanceKeys.has(k))[0];
// STRONG:   14 mapped votes, ALL one way  → Strongly (uniform, deep)
// MOSTLY:   14 mapped votes, 11 one way   → Mostly   (dominant, with counter)
// UNIFORM:  two votes, both one way       → Thin     (a run, not a tendency)
// MIXED3:   three votes, two-to-one       → none     (under the floor, not uniform)
// SOLO:     one vote                      → Thin     (the one-vote lean)
// SPLIT:    six votes, three each         → Split, counts stated
// SHALLOW:  four votes, two each          → Split, counts withheld
// LOPSIDED: five procedural one way, one full-weight the other → Split, never Mostly
// INCID:    five one-way votes, none primary → none (no_primary fails closed)
const [STRONG, MOSTLY, UNIFORM, MIXED3, SOLO, SPLIT, SHALLOW, LOPSIDED, INCID] = SILENT;
if (!STRONG || !MOSTLY || !UNIFORM || !MIXED3 || !SOLO || !SPLIT || !SHALLOW ||
    !LOPSIDED || !INCID || !BALANCE || !SPOKEN) {
  console.error("✗ pattern tiers: the fixture profile no longer offers every case");
  process.exit(1);
}

const vote = (n, issueKey, position, opts) => {
  opts = opts || {};
  return {
    kind: "vote", rollcallId: 500 + n, measureId: 900 + n, number: "H.R. " + (100 + n),
    date: "2025-0" + ((n % 9) + 1) + "-14", action: "On Passage", position: position,
    isProcedural: !!opts.proc, title: "Measure " + n,
    source: { url: "https://www.congress.gov/roll-call-vote/" + (500 + n), label: "Congress.gov" },
    issues: [{
      issueKey: issueKey, weight: 100,
      isPrimary: opts.primary !== false, supportMeaning: "yea_supports",
    }],
  };
};
const SEED = [];
for (let i = 0; i < 12; i++) SEED.push(vote(i, STRONG, "yea"));
for (let i = 0; i < 14; i++) SEED.push(vote(20 + i, MOSTLY, i < 11 ? "nay" : "yea"));
SEED.push(vote(40, UNIFORM, "nay"), vote(41, UNIFORM, "nay"));
SEED.push(vote(45, MIXED3, "nay"), vote(46, MIXED3, "nay"), vote(47, MIXED3, "yea"));
SEED.push(vote(50, SOLO, "nay"));
for (let i = 0; i < 6; i++) SEED.push(vote(55 + i, SPLIT, i % 2 ? "nay" : "yea"));
for (let i = 0; i < 4; i++) SEED.push(vote(62 + i, SHALLOW, i % 2 ? "nay" : "yea"));
for (let i = 0; i < 5; i++) SEED.push(vote(70 + i, LOPSIDED, "yea", { proc: true }));
SEED.push(vote(75, LOPSIDED, "nay"));
// Deep, one-sided and entirely incidental: the omnibus problem wearing a
// confident face. The index refuses it; the chip must refuse it too.
for (let i = 0; i < 5; i++) SEED.push(vote(80 + i, INCID, "yea", { primary: false }));
SEED.push(vote(90, BALANCE, "nay"), vote(91, BALANCE, "nay"),
          vote(92, BALANCE, "nay"), vote(93, BALANCE, "nay"));
// A stated position WITH a deep one-way record: both facts, side by side.
for (let i = 0; i < 6; i++) SEED.push(vote(95 + i, SPOKEN, "yea"));

// Sandbox A: shipped. Sandbox B: identical seeds, the derivation switched off —
// no index means no tier means no chip, which is the product before this slice.
const A = boot(), B = boot();
A.PDXVotingRecord.noteMember(PID, SEED.map((v) => JSON.parse(JSON.stringify(v))));
B._recordDirectionIndex = undefined;
B.PDXVotingRecord.noteMember(PID, SEED.map((v) => JSON.parse(JSON.stringify(v))));
const CS = A.PDXConsistency, CSB = B.PDXConsistency;
const rowsA = CS.issueRows(PID), rowsB = CSB.issueRows(PID);
const rowOf = (k) => rowsA.filter((r) => r.key === k)[0];
const tierOf = (k) => { const r = rowOf(k); return r ? CS.recordPattern.tier(r) : null; };
const chipOf = (k) => { const r = rowOf(k); return r ? CS.recordPattern.html(r) : ""; };
const chunkOf = (html, k) => {
  for (const c of html.split(/<div class="pdxst-row["\s]/).slice(1)) {
    if ((c.match(/data-pdxst-issue="([^"]*)"/) || [])[1] === k) return c;
  }
  return "";
};
const HTML = CS.stancesSectionHtml(PID);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · five tiers, one case each");
// ═════════════════════════════════════════════════════════════════════════════
{
  const t = tierOf(STRONG);
  ok(!!t, "a deep uniform record produces a tier");
  eq(t.tier, "strong", "…and it is the strong tier");
  eq(t.label, "Strongly supports", "…labelled Strongly supports");
  eq(t.tone, "support", "…toned to the advancing side");
  eq(t.weight, "full", "…at full weight");
  eq(t.counts, "12 advanced · 0 against", "…with both counts beside it");
  eq(t.token, "record_direction", "…and it is reading the index's own token");

  const m = tierOf(MOSTLY);
  eq(m.tier, "mostly", "a dominant record with counter-votes is the mostly tier");
  eq(m.label, "Mostly opposes", "…labelled Mostly opposes");
  eq(m.tone, "oppose", "…toned to the side that dominated");
  eq(m.weight, "strong", "…one rung below a uniform run");
  eq(m.counts, "3 advanced · 11 against", "…with both counts, advances first");

  const s = tierOf(SPLIT);
  eq(s.tier, "split", "a deep both-ways record is the split tier");
  eq(s.label, "Split", "…labelled Split and nothing else");
  eq(s.tone, "mixed", "…in the neutral mixed tone");
  eq(s.directional, false, "…and it claims no direction");
  eq(s.counts, "3 advanced · 3 against", "…and states both counts");

  const sh = tierOf(SHALLOW);
  eq(sh.tier, "split", "a shallow both-ways record is still Split");
  eq(sh.counts, "", "…but withholds its margin, exactly as the index does");

  const u = tierOf(UNIFORM);
  eq(u.tier, "thin", "two one-way votes are the thin tier");
  eq(u.label, "Thin opposes", "…labelled Thin opposes");
  eq(u.tone, "oppose", "…and still direction-coloured");
  eq(u.counts, "2 votes against", "…naming its own countable, not a zero side");

  const one = tierOf(SOLO);
  eq(one.tier, "thin", "a single vote is the thin tier — the one-vote lean");
  eq(one.label, "Thin opposes", "…labelled Thin opposes");
  eq(one.counts, "1 vote against", "…with the one count spelled out");
  eq(one.judged, 1, "…off one judged item");

  const n = tierOf(MIXED3);
  eq(n.tier, "none", "three votes running both ways is no clear pattern");
  eq(n.label, "No clear pattern yet", "…and says so");
  eq(n.tone, "muted", "…in the neutral muted tone");
  eq(n.directional, false, "…claiming no direction");
  eq(n.counts, "", "…and printing no counts to argue with");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · thin never borrows a deep tier's voice");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const k of [UNIFORM, SOLO]) {
    const t = tierOf(k);
    ok(/^Thin /.test(t.label), `${k}: a thin tier's label starts with Thin`);
    ok(!/Strongl|Mostly/i.test(t.label), `${k}: …and never says Strongly or Mostly`);
    eq(t.weight, "thin", `${k}: …and carries the thin weight`);
    ok(t.judged <= 3, `${k}: …off no more than three judged items`);
    const chip = chipOf(k);
    has(chip, 'class="pdxst-pat w-thin"', `${k}: the chip renders at thin weight`);
    lacks(chip, "w-full", `${k}: …and never at full weight`);
  }
  // The weight ladder is a rendering rank and the tiers sit on it in this order.
  const rank = { full: 3, strong: 2, thin: 1, flat: 0 };
  ok(rank[tierOf(STRONG).weight] > rank[tierOf(MOSTLY).weight],
    "a uniform deep run outweighs a lean with counter-votes");
  ok(rank[tierOf(MOSTLY).weight] > rank[tierOf(SOLO).weight],
    "…and a lean with counter-votes outweighs a one-vote lean");
  ok(rank[tierOf(SOLO).weight] > rank[tierOf(MIXED3).weight],
    "…and a one-vote lean outweighs no pattern at all");
  // Thin gets no fill; the deep tiers do. That is what "visibly weaker" means here.
  const fill = (h) => (h.match(/--bg:([^;"]*)/) || [])[1];
  ok(/rgba\(74,222,128/.test(fill(chipOf(STRONG))), "the strong chip is filled in its own hue");
  ok(/rgba\(10,15,30/.test(fill(chipOf(SOLO))), "…the thin chip is not filled at all");
  ok(fill(chipOf(MOSTLY)) !== fill(chipOf(STRONG)), "…and mostly is fainter than strongly");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the site's direction colours, not a new palette");
// ═════════════════════════════════════════════════════════════════════════════
{
  const TONE = CS.recordPattern.TONE;
  eq(TONE.support.c, "#4ade80", "support is the site's support green");
  eq(TONE.oppose.c, "#f87171", "oppose is the site's oppose red");
  eq(TONE.mixed.c, "#f5c842", "mixed is the site's mixed amber");
  // The same three the stated-position chip uses — one vocabulary of colour.
  const css = R("consistency.js");
  has(css, "support: { lb: 'Supports', c: '#4ade80'", "…the stated-position chip uses the same green");
  const appcss = R("app.css");
  has(appcss, "#4ade80", "…and so does the shared stance palette");
  has(appcss, "#f87171", "…on both poles");
  // Direction is carried by hue on the chip, so a support chip and an oppose chip
  // can never render the same colour.
  ok((chipOf(STRONG).match(/--c:([^;]*)/) || [])[1] !==
     (chipOf(MOSTLY).match(/--c:([^;]*)/) || [])[1],
    "a supporting pattern and an opposing pattern do not share a colour");
  has(chipOf(MIXED3), "--c:#8fa6c6", "and no-pattern is grey, not a direction");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · fail closed — and the two failures are different");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The ISSUE has no directional pole: no chip at all. "No clear pattern yet"
  // over a balance key would be a claim about their record we never established.
  const b = tierOf(BALANCE);
  eq(b, null, "a balance key gets no chip");
  const bchunk = chunkOf(HTML, BALANCE);
  ok(!!bchunk, "…the balance row still renders");
  lacks(bchunk, "pdxst-pat", "…with no pattern chip on it");
  eq(A._pdxRecordDirection(PID, BALANCE, {}).suppressed, "balance_key",
    "…and the suppression is the issue's, as the index says");

  // The RECORD is the problem: the grey label, which is the true statement.
  const inc = tierOf(INCID);
  eq(inc.tier, "none", "a deep but entirely incidental record gets no pattern");
  eq(inc.label, "No clear pattern yet", "…and says exactly that");
  ok(!/Strongl|Mostly|supports|opposes/i.test(inc.label),
    "…never a direction read off bills this issue was not the subject of");
  eq(A._pdxRecordDirection(PID, INCID, {}).suppressed, "no_primary",
    "…and the shipped no_primary gate is what refused it");

  // A member we barely hold a record for: below the coverage floor, no pattern.
  const C = boot();
  C.PDXVotingRecord.noteMember(PID, [vote(1, STRONG, "yea"), vote(2, STRONG, "yea"),
    vote(3, STRONG, "yea")].map((v) => JSON.parse(JSON.stringify(v))));
  const thinRow = C.PDXConsistency.issueRows(PID).filter((r) => r.key === STRONG)[0];
  const ct = C.PDXConsistency.recordPattern.tier(thinRow);
  eq(C._pdxRecordDirection(PID, STRONG, {}).suppressed, "coverage_floor",
    "a member under the coverage floor is suppressed by the shipped gate");
  eq(ct.tier, "none", "…so the chip falls to no clear pattern");

  // Unrecognised index states fail closed too, not open.
  eq(A._recordPatternTier({ token: "record_something_new", total: 3, judged: 3,
    advances: 3, opposes: 0, primary: 3, counted: true }).tier, "none",
    "a token the engine does not recognise lands on no clear pattern");
  eq(A._recordPatternTier(null), null, "no index means no chip");
  eq(A._recordPatternTier({ token: "record_none", total: 0, judged: 0, advances: 0,
    opposes: 0, primary: 0 }), null, "an empty record means no chip");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · it is not a stance");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The chip is derived; the position map is authored. Nothing crossed over.
  const before = JSON.stringify(A._polPositionMap
    ? A._polPositionMap(PID, A.CMP_DATA[PID]) : {});
  CS.stancesSectionHtml(PID);
  for (const k of [STRONG, MOSTLY, SOLO, SPLIT]) { tierOf(k); chipOf(k); }
  const after = JSON.stringify(A._polPositionMap
    ? A._polPositionMap(PID, A.CMP_DATA[PID]) : {});
  eq(after, before, "rendering every chip writes nothing into the position map");
  for (const k of [STRONG, MOSTLY, UNIFORM, SOLO, SPLIT]) {
    eq(A.PDXConsistency.positionStance
      ? A.PDXConsistency.positionStance(PID, k) : null,
      B.PDXConsistency.positionStance ? B.PDXConsistency.positionStance(PID, k) : null,
      `${k}: the stated stance is what it was with the chip switched off`);
  }
  // A row that HAS a stated position shows both facts, chip first, "Says:" intact.
  const st = tierOf(SPOKEN);
  ok(!!st, "a row with a stated position still gets a record chip");
  eq(st.label, "Strongly supports", "…saying what the record did");
  const sc = chunkOf(HTML, SPOKEN);
  has(sc, "pdxst-pat", "…the chip renders on that row");
  has(sc, "Says: ", "…and the stated position keeps its own chip");
  ok(sc.indexOf("pdxst-pat") < sc.indexOf("pdxor-stance"),
    "…with the record chip first in reading order");
  // And the chip says which is which, in one sentence, in one place.
  has(chipOf(STRONG), "not a stated position", "the chip discloses that it is not a stance");
  has(chipOf(STRONG), "never counted in Direction Match", "…and that it is not in the score");
  eq(A._PDX_RD_TIER_NOTE, tierOf(STRONG).note, "…from the one published sentence");
  has(chipOf(STRONG), "🏛 Record", "…and the lane marker names whose fact it is");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · it is not a score — Direction Match is byte-identical");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(rowsA.length, rowsB.length, "both sandboxes model the same rows");
  const byKeyB = {};
  rowsB.forEach((r) => { byKeyB[r.key] = r; });
  let scored = 0, chips = 0;
  for (const a of rowsA) {
    const b = byKeyB[a.key];
    ok(!!b, `${a.key}: the row exists in both sandboxes`);
    if (!b) continue;
    const ra = CS.rowResult(a), rb = CSB.rowResult(b);
    eq(a.verdict.token, b.verdict.token, `${a.key}: the verdict token is unchanged`);
    eq(a.verdict.score, b.verdict.score, `${a.key}: the verdict score is unchanged`);
    eq(a.tier, b.tier, `${a.key}: the row's tier is unchanged`);
    eq(a.tested, b.tested, `${a.key}: testedness is unchanged`);
    eq(ra.pct, rb.pct, `${a.key}: the percentage is unchanged`);
    eq(ra.state, rb.state, `${a.key}: the result state is unchanged`);
    eq(JSON.stringify(ra.bucket), JSON.stringify(rb.bucket), `${a.key}: the bucket is unchanged`);
    eq(ra.label, rb.label, `${a.key}: the verdict word is unchanged`);
    eq(ra.held, rb.held, `${a.key}: the inventory count is unchanged`);
    if (typeof ra.pct === "number") scored++;
    if (CS.recordPattern.tier(a)) chips++;
  }
  ok(scored > 0, "the fixture actually scores something for the comparison to protect");
  ok(chips >= 8, `…and the chip attached to the rows (${chips})`);
  eq(JSON.stringify(CS.verdictTally(PID)), JSON.stringify(CSB.verdictTally(PID)),
    "the profile's verdict tally is byte-identical");
  const waA = A.PDXWordAction && A.PDXWordAction.read
    ? JSON.stringify(A.PDXWordAction.read(PID)) : null;
  const waB = B.PDXWordAction && B.PDXWordAction.read
    ? JSON.stringify(B.PDXWordAction.read(PID)) : null;
  eq(waA, waB, "the pooled Word vs Action read is byte-identical");
  // The chip carries no number that could be sorted, ranked or averaged.
  for (const k of [STRONG, MOSTLY, UNIFORM, SOLO, SPLIT, MIXED3]) {
    const t = tierOf(k);
    if (!t) continue;
    eq(typeof t.pct, "undefined", `${k}: the tier shape has no percentage`);
    eq(typeof t.score, "undefined", `${k}: …and no score`);
    lacks(t.label, "%", `${k}: the label carries no percent sign`);
    lacks(t.counts, "%", `${k}: the counts carry no percent sign`);
    ok(!/\b\d+ ?(percent|pct)\b/i.test(t.label + " " + t.counts),
      `${k}: …and never spells one out`);
    ok(!/\bout of\b|\brate\b|\bshare\b/i.test(t.label + " " + t.counts),
      `${k}: …and never phrases the counts as a proportion`);
    const chip = chipOf(k);
    ok(!/\d+%/.test(chip), `${k}: no percentage renders in the chip`);
    lacks(chip, "pdxst-pct", `${k}: …and it borrows none of the score's type`);
  }
  // The index's own permission flags were not loosened to make thin chips legal.
  const solo = A._pdxRecordDirection(PID, SOLO, {});
  eq(solo.characterised, false, "a one-vote record is still not characterised");
  eq(solo.counted, false, "…and its counts are still not card-eligible");
  eq(A._pdxRecordDirection(PID, SHALLOW, {}).counted, false,
    "a shallow split's counts are still withheld from anything that gates on counted");
  // The row's rendered data attributes — what anything downstream could sort on.
  for (const k of [STRONG, SOLO, MIXED3]) {
    const a = chunkOf(HTML, k), b = chunkOf(CSB.stancesSectionHtml(PID), k);
    eq((a.match(/data-pdxst-state="([^"]*)"/) || [])[1],
       (b.match(/data-pdxst-state="([^"]*)"/) || [])[1], `${k}: the row's state attribute is unchanged`);
    eq((a.match(/data-pdxst-tier="([^"]*)"/) || [])[1],
       (b.match(/data-pdxst-tier="([^"]*)"/) || [])[1], `${k}: the row's tier attribute is unchanged`);
  }
  ok(HTML !== CSB.stancesSectionHtml(PID), "the two sandboxes really do render differently");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · formal lane only");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Public receipts cannot move the chip: same seeds, the public lane stripped.
  const D = boot();
  D.PDXVotingRecord.noteMember(PID, SEED.map((v) => JSON.parse(JSON.stringify(v))));
  const withPub = {}, noPub = {};
  for (const k of [STRONG, MOSTLY, UNIFORM, SOLO, SPLIT, SHALLOW, MIXED3]) {
    withPub[k] = JSON.stringify(tierOf(k));
  }
  // …and the tier engine, called directly on an index result, takes no receipt
  // argument at all — there is no parameter through which one could arrive.
  eq(A._recordPatternTier.length <= 2, true,
    "the tier engine takes the index and an options bag, and nothing else");
  for (const k of Object.keys(withPub)) {
    const r = D.PDXConsistency.issueRows(PID).filter((x) => x.key === k)[0];
    noPub[k] = JSON.stringify(D.PDXConsistency.recordPattern.tier(r));
    eq(noPub[k], withPub[k], `${k}: the tier is a pure read of the formal index`);
  }
  // No party framing anywhere in the vocabulary.
  const vocab = Object.keys(A._PDX_RD_TIERS).map((k) => {
    const t = A._PDX_RD_TIERS[k];
    return [t.lead, t.label].filter(Boolean).join(" ");
  }).join(" ") + " " + A._PDX_RD_TIER_NOTE;
  ok(!/party|partisan|loyal|democrat|republican|caucus|leadership/i.test(vocab),
    "the tier vocabulary frames a record, never a party");
  // The exec lane still declines — it needs its own verb, and gets its own pass.
  const execRow = rowsA.filter((r) => r.lane === "exec")[0];
  if (execRow) eq(CS.recordPattern.tier(execRow), null, "an executive row gets no chip yet");
  else ok(true, "no executive rows on this fixture");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · acceptance — Schumer and a control member");
// ═════════════════════════════════════════════════════════════════════════════
// The brief's own done-when, on a real Senate profile and a real House one: rows
// with formal votes show a tiered label with counts and a direction colour,
// including the one-vote lean, while Direction Match does not move. Each member
// is seeded over ITS OWN issue keys — a Senate profile's keys are not a House
// profile's, and asserting a shared key would test the fixture, not the chip.
{
  for (const pid of [CONTROL, PID]) {
    const E = boot(), F = boot();
    // Keys off the real row model and the real issue map — never asserted, so a
    // data change vacates the case loudly instead of quietly. A row only exists
    // once something is on file for it, so the silent keys are drawn from the map
    // and the seed below is what brings their rows into being.
    const base = E.PDXConsistency.issueRows(pid);
    const said = new Set(base.filter((r) => r.said).map((r) => r.key));
    const silent = ISSUE_KEYS
      .filter((k) => !said.has(k) && !/_balance$/.test(k));
    const spoken = base.filter((r) => r.said && r.lane !== "exec").map((r) => r.key)[0];
    must(silent.length >= 5 && spoken,
      `${pid}: the profile no longer offers five silent keys and a spoken one`);
    const [sStrong, sMostly, sSplit, sThin, sNone] = silent;
    const seed = [];
    for (let i = 0; i < 12; i++) seed.push(vote(i, sStrong, "nay"));      // Strongly opposes
    for (let i = 0; i < 10; i++) seed.push(vote(20 + i, sMostly, i < 8 ? "yea" : "nay")); // Mostly supports
    for (let i = 0; i < 10; i++) seed.push(vote(40 + i, sSplit, i % 2 ? "nay" : "yea"));  // Split
    seed.push(vote(60, sThin, "nay"));                                    // Thin opposes, n=1
    seed.push(vote(65, sNone, "nay"), vote(66, sNone, "nay"), vote(67, sNone, "yea")); // no pattern
    for (let i = 0; i < 6; i++) seed.push(vote(70 + i, spoken, "yea"));   // record + stated word
    E.PDXVotingRecord.noteMember(pid, seed.map((v) => JSON.parse(JSON.stringify(v))));
    F._recordDirectionIndex = undefined;
    F.PDXVotingRecord.noteMember(pid, seed.map((v) => JSON.parse(JSON.stringify(v))));

    const P = E.PDXConsistency, PB = F.PDXConsistency;
    const rows = P.issueRows(pid);
    const tOf = (k) => {
      const r = rows.filter((x) => x.key === k)[0];
      return r ? P.recordPattern.tier(r) : null;
    };
    const want = [
      [sStrong, "strong", "Strongly opposes", "0 advanced · 12 against", "oppose", "full"],
      [sMostly, "mostly", "Mostly supports", "8 advanced · 2 against", "support", "strong"],
      [sSplit, "split", "Split", "5 advanced · 5 against", "mixed", "full"],
      [sThin, "thin", "Thin opposes", "1 vote against", "oppose", "thin"],
      [sNone, "none", "No clear pattern yet", "", "muted", "flat"],
    ];
    for (const [k, tier, label, counts, tone, weight] of want) {
      const t = tOf(k);
      ok(!!t, `${pid}/${k}: the row carries a pattern chip`);
      if (!t) continue;
      eq(t.tier, tier, `${pid}/${k}: the tier`);
      eq(t.label, label, `${pid}/${k}: the label`);
      eq(t.counts, counts, `${pid}/${k}: the counts beside it`);
      eq(t.tone, tone, `${pid}/${k}: the direction colour`);
      eq(t.weight, weight, `${pid}/${k}: the visual weight`);
    }
    // Every chip on the profile, tier included, comes from the published sets.
    let chipped = 0; const tiers = {};
    for (const r of rows) {
      const t = P.recordPattern.tier(r);
      if (!t) continue;
      chipped++; tiers[t.tier] = (tiers[t.tier] || 0) + 1;
      ok(/^(Strongly|Mostly|Thin) (supports|opposes)$|^Split$|^No clear pattern yet$/
        .test(t.label), `${pid}/${r.key}: "${t.label}" is in the published label set`);
      ok(["support", "oppose", "mixed", "muted"].indexOf(t.tone) >= 0,
        `${pid}/${r.key}: the tone is one of the four`);
      ok(["full", "strong", "thin", "flat"].indexOf(t.weight) >= 0,
        `${pid}/${r.key}: the weight is one of the four`);
      if (t.tier === "none" || t.tier === "split") {
        ok(!/supports|opposes/.test(t.label),
          `${pid}/${r.key}: a directionless tier words no direction`);
      }
    }
    // All five rungs, on one real profile, at once — the done-when in one line.
    for (const rung of ["strong", "mostly", "split", "thin", "none"]) {
      ok((tiers[rung] || 0) > 0, `${pid}: the ${rung} tier renders on this profile`);
    }
    ok(chipped >= 5, `${pid}: the chip reaches the rows with a record (${chipped})`);
    console.log(`      ${pid}: ${chipped} chips — ${JSON.stringify(tiers)}`);

    // Direction Match does not move, on this profile, with the chip switched off.
    const byB = {};
    PB.issueRows(pid).forEach((r) => { byB[r.key] = r; });
    for (const r of rows) {
      const b = byB[r.key]; if (!b) continue;
      const ra = P.rowResult(r), rb = PB.rowResult(b);
      eq(ra.pct, rb.pct, `${pid}/${r.key}: the percentage is unchanged`);
      eq(ra.state, rb.state, `${pid}/${r.key}: the result state is unchanged`);
      eq(r.verdict.token, b.verdict.token, `${pid}/${r.key}: the verdict is unchanged`);
      eq(r.tier, b.tier, `${pid}/${r.key}: the row tier is unchanged`);
    }
    eq(JSON.stringify(P.verdictTally(pid)), JSON.stringify(PB.verdictTally(pid)),
      `${pid}: the verdict tally is byte-identical`);

    // The rendered section. ONE RECORD VOICE PER ROW, as of the record-first pass.
    // An unscored row holding formal acts used to print the tier chip in the row
    // top AND — after that pass added it — the promoted record lead underneath, so
    // the same index was read out twice in two vocabularies: "🏛 Record · Strongly
    // opposes · 0 advanced · 12 against", then "The record indicates: Opposes — 0
    // advanced · 12 against". The lead won that tie (it carries the frame, the
    // published reading and the door into the acts) and the chip now stands down on
    // exactly those rows.
    //
    // WHAT IS PINNED HERE IS THAT THE ROW STILL SPEAKS, not which of the two says
    // it. The tier vocabulary itself is unchanged and still renders — the formal
    // atlas draws a pdxst-pat chip per issue, the receipt cards quote the labels
    // verbatim, and the chip returns on this surface the moment the lead stands
    // down. The engine assertions above are the tier vocabulary's real contract and
    // none of them moved.
    const html = P.stancesSectionHtml(pid);
    const oneVoice = (chunk, what) => {
      const chip = /class="pdxst-pat/.test(chunk);
      const lead = /class="pdxst-lead/.test(chunk);
      ok(chip !== lead, `${what}: the record is stated ${chip && lead ? "twice" : "not at all"} on this row`);
    };
    // Every rung reaches the reader, in whichever voice that row uses.
    // Visible words only — a label surviving in a title= attribute is not the row
    // speaking to a reader.
    const plain = (h) =>
      String(h || "").replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");
    const say = (k) => plain(chunkOf(html, k));
    for (const [k, tierLabel, saysLabel] of [
      [sStrong, "Strongly opposes", "Opposes"],
      [sMostly, "Mostly supports", "Mostly supports"],
      [sSplit, "Split", "Mixed"],
      [sNone, "No clear pattern yet", "No clear pattern yet"],
    ]) {
      const chunk = chunkOf(html, k);
      ok(!!chunk, `${pid}/${k}: the row renders`);
      if (!chunk) continue;
      oneVoice(chunk, `${pid}/${k}`);
      const t = say(k);
      ok(t.includes(tierLabel) || t.includes(saysLabel),
        `${pid}/${k}: the row states neither "${tierLabel}" nor "${saysLabel}"`);
    }
    // The chip's vocabulary is still what the ATLAS speaks, on the same profile.
    const atlas = P.formalPatternIndex.html(pid, { mount: "face" });
    has(atlas, 'class="pdxst-pat', `${pid}: the tier chip stopped rendering anywhere on the profile`);
    has(atlas, "Strongly", `${pid}: …including a deep one-way pattern`);
    has(atlas, "Thin", `${pid}: …and the thin one-vote lean`);

    has(html, "Not in Direction Match", `${pid}: the public-lane disclosure survives`);
    has(html, "On the formal record", `${pid}: the no-stated-position heading survives`);
    has(html, "not a stated position", `${pid}: …and the record layer's own disclosure travels with it`);
    const sc = chunkOf(html, sThin);
    ok(!!sc, `${pid}: the one-vote row renders`);
    oneVoice(sc, `${pid}/${sThin}`);
    // n = 1. The engine calls this "Thin opposes"; the published reading declines to
    // characterise a record of one vote at all and says "Too early to say". Either
    // is honest, and BOTH are useless without the count, so the count is what this
    // pins — the direction is on the row either way.
    has(sc, "1 vote against", `${pid}: the one-vote row drops the count that is its whole content`);
    ok(/Thin opposes|Too early to say/.test(plain(sc)),
      `${pid}: the one-vote row characterises its single vote as something stronger than it is`);
  }
}

if (failures.length) {
  console.error(`\n✗ pattern tiers: ${failures.length} of ${passed + failures.length} assertions failed`);
  failures.slice(0, 30).forEach((f) => console.error("   · " + f));
  process.exit(1);
}
console.log(`\n✓ pattern tiers: all ${passed} assertions passed — ` +
  `${tierOf(STRONG).label} · ${tierOf(STRONG).counts}; ` +
  `${tierOf(SOLO).label} · ${tierOf(SOLO).counts} — and Direction Match byte-identical either way`);
