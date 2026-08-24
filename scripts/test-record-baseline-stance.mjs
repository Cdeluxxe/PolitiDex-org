#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-record-baseline-stance.mjs — the record as a baseline, and its wall
// ─────────────────────────────────────────────────────────────────────────────
// A politician with two hundred roll calls and eighteen sourced quotes used to
// read, on sixty-odd other issues, as a person with no position at all. The
// quotes are the limit of our research, not the limit of what they did — so
// where nothing is stated and the formal record itself reads a side, that
// direction now stands in as the issue's BASELINE position.
//
// That is a useful thing and a dangerous one, and this file exists for the
// danger. A derived position is one short step from a claimed one, and one
// shorter step from a claimed one being scored. The contracts here are:
//
//   1. DERIVED FROM THE RECORD LANE AND NOTHING ELSE. The baseline is a
//      projection of _fpiRows() — the same tiers, the same words, the same
//      floors. It invents no direction the pattern engine declined to read.
//   2. STATED ALWAYS WINS. Where a position is on file in their own words, the
//      baseline is not consulted, not merged, and not shown.
//   3. IT NEVER SAYS "SAYS". Every surface that prints one marks it as the
//      record's own direction and states that it is outside Direction Match.
//   4. DIRECTION MATCH CANNOT SEE IT. The percentage, the tested set, and the
//      stated position map are byte-identical with the baseline read and
//      without it — because the baseline has no write path into the word lane
//      at all, not because a flag happens to be off.
//   5. NO STANCE FROM SILENCE. An issue with no quote AND no readable record
//      produces nothing. Fail-closed is still closed.
//
//   node scripts/test-record-baseline-stance.mjs
//
// No database, no network, no browser. Exit 1 on a failed assertion, 2 when a
// probe target has moved and a contract can no longer be checked at all.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

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
function must(cond, what) {
  if (cond) return;
  console.error(
    "✗ baseline harness is STALE — a contract cannot be verified:\n  " + what +
    "\n\n  This is not a passing state. Restore the probe target, or update this\n" +
    "  harness AND re-check the lane rule it describes."
  );
  process.exit(2);
}

const ENGINE = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "profile-spine.js", "issue-colors.js",
];

function boot() {
  const win = makeSandbox();
  const store = {};
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; },
  };
  win.performance = { now: () => 0 };
  const sandbox = vm.createContext(win);
  win.__err = [];
  for (const f of ENGINE) {
    try { vm.runInContext(R(f), sandbox, { filename: f }); }
    catch (e) { win.__err.push(`${f}: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
  return win;
}

// ── Seeded formal files ──────────────────────────────────────────────────────
let seq = 0;
const vote = (issueKey, position) => {
  seq++;
  return {
    kind: "vote", rollcallId: 7000 + seq, measureId: 7500 + seq,
    number: "S. " + (200 + seq), date: "2025-0" + ((seq % 9) + 1) + "-04",
    action: "On Passage", position, isProcedural: false, title: "Measure " + seq,
    issues: [{ issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
    source: { url: "https://www.congress.gov/roll-call-vote/" + (7000 + seq), label: "Congress.gov" },
  };
};
const many = (n, issueKey, position) => Array.from({ length: n }, () => vote(issueKey, position));

const probe = boot();
must(probe.__err.length === 0, `the engine did not load cleanly: ${probe.__err.join(" | ")}`);
const CSP = probe.PDXConsistency;
must(CSP && CSP.baseline, "PDXConsistency.baseline is not exported — there is no baseline to test");
must(CSP.formalPatternIndex, "the formal pattern index the baseline projects is not loaded");

const stanceMap = (win, pid) => win._polPositionMap(pid, win.CMP_DATA[pid]) || {};
const stanceCount = (win, pid) => Object.keys(stanceMap(win, pid)).length;

// The subject: a sitting member who already has sourced positions, so the same
// fixture can exercise the override AND the fill in one profile.
const SPOKEN = Object.keys(probe.CMP_DATA)
  .filter((pid) => /Senator|Representative/i.test(String(probe.CMP_DATA[pid].office || "")))
  .filter((pid) => stanceCount(probe, pid) >= 6)
  .sort();
must(SPOKEN.length >= 1, "the fixture has no member with 6+ stated positions");
const PID = SPOKEN[0];
const STATED_KEYS = Object.keys(stanceMap(probe, PID)).sort();

// Four issues nobody has quoted this person on: one deep and one-directional,
// one deep the other way, one split down the middle, one left entirely empty.
const FREE = Object.keys(probe.ISSUE_MAP || {})
  .filter((k) => !/_balance$/.test(k))
  .filter((k) => STATED_KEYS.indexOf(k) === -1);
must(FREE.length >= 4, "the taxonomy no longer offers four unquoted issues for this member");
const [K_UP, K_DOWN, K_SPLIT, K_NONE] = FREE;
// And one issue they HAVE spoken on, seeded the opposite way, so "stated wins"
// is tested against a record that would have produced a different answer.
const K_SAID = STATED_KEYS[0];
// _polPositionMap values are the curated cards themselves; the side is one field
// on them, and it is the only field any of this cares about.
const sideOf = (v) => (v && typeof v === "object" ? v.stance : v) || "";
const SAID_SIDE = sideOf(stanceMap(probe, PID)[K_SAID]);

const REC = [
  ...many(9, K_UP, "yea"),
  ...many(9, K_DOWN, "nay"),
  ...many(5, K_SPLIT, "yea"),
  ...many(5, K_SPLIT, "nay"),
  ...many(9, K_SAID, SAID_SIDE === "support" ? "nay" : "yea"),
];

function seeded() {
  const win = boot();
  win.PDXVotingRecord.noteMember(PID, JSON.parse(JSON.stringify(REC)));
  win.PDXVotingRecord.memberRecords = (pid) => (pid === PID ? REC : null);
  return win;
}

const W = seeded();
const CS = W.PDXConsistency;
const FPI = CS.formalPatternIndex.rows(PID) || [];
must(FPI.length >= 4, `the formal index read ${FPI.length} rows — the fixture did not take`);
const fpiBy = {};
FPI.forEach((x) => { fpiBy[x.key] = x; });
must(!!fpiBy[K_UP] && fpiBy[K_UP].read,
  `${K_UP} did not become a readable formal row — the baseline has nothing to project`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the baseline is the record lane, projected — not a second engine");
// ═════════════════════════════════════════════════════════════════════════════
{
  const rows = CS.baseline.rows(PID);
  ok(Array.isArray(rows), "baseline.rows returns a list");
  ok(rows.length >= 3, `the seeded unquoted issues surface a baseline (${rows.length} rows)`);

  const by = {};
  rows.forEach((r) => { by[r.key] = r; });

  // Every published field is the formal row's own field. Not "similar to" — the
  // same value, read from the same object, so a change to the record lane's
  // characterisation moves the baseline with it and cannot leave it behind.
  rows.forEach((r) => {
    const x = fpiBy[r.key];
    ok(!!x, `${r.key}: every baseline row traces back to a formal row`);
    if (!x) return;
    eq(r.tier, x.tier, `${r.key}: the tier is the record lane's tier`);
    eq(r.tone, x.tone, `${r.key}: …the tone is its tone`);
    eq(r.patLabel, x.patLabel, `${r.key}: …and the chip label is its label`);
    eq(r.counts, x.counts || "", `${r.key}: …over the counts it judged`);
    eq(x.said, undefined === x.said ? undefined : false,
      `${r.key}: a baseline row is never one with something stated on it`);
    eq(r.derived, true, `${r.key}: the row says of itself that it is derived`);
    eq(r.stated, false, `${r.key}: …and that nothing was stated`);
    eq(r.basis, "record", `${r.key}: …and names the lane it came from`);
    ok(["support", "oppose", "mixed"].indexOf(r.stance) >= 0,
      `${r.key}: the side is one of the three the product already knows`);
  });

  // The three shapes the fixture built, each landing where the engine puts it.
  const up = by[K_UP], down = by[K_DOWN], split = by[K_SPLIT];
  ok(!!up, `${K_UP}: a deep one-directional record produces a baseline`);
  ok(!!down, `${K_DOWN}: …in both directions`);
  if (up) eq(up.stance, "support", `${K_UP}: nine yeas read as support`);
  if (down) eq(down.stance, "oppose", `${K_DOWN}: nine nays read as oppose`);
  if (split) eq(split.stance, "mixed", `${K_SPLIT}: five each way reads as mixed, not as a side`);
  if (split) eq(split.tier, "split", `${K_SPLIT}: …at the engine's own split tier`);

  // And the wording is the record lane's, verbatim.
  if (up) {
    has(up.text, CS.baseline.LEAD, `${K_UP}: the sentence opens with the record lane's lead`);
    has(up.text, up.word, `${K_UP}: …then the direction word`);
    eq(up.lead, CS.baseline.LEAD, `${K_UP}: the lead is published on the row too`);
    lacks(up.text, "Says", `${K_UP}: nothing in the sentence claims they said it`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a stated position is not overridden, and silence is not filled");
// ═════════════════════════════════════════════════════════════════════════════
{
  const map = CS.baseline.map(PID);
  eq(!!map[K_SAID], false,
    `${K_SAID}: an issue with a position in their own words gets no baseline…`);
  ok(!!fpiBy[K_SAID] && fpiBy[K_SAID].read,
    `${K_SAID}: …even though its record is deep enough to read a direction from`);
  ok(!!fpiBy[K_SAID] && fpiBy[K_SAID].tone !== SAID_SIDE,
    `${K_SAID}: …and that direction disagrees with what they said, which is the point`);

  eq(!!map[K_NONE], false, `${K_NONE}: no quote and no record produces no position`);
  eq(CS.baseline.for(PID, K_NONE), null, "…and asking for one directly returns null");
  eq(CS.baseline.for(PID, "not_an_issue_key_at_all"), null,
    "…as does asking about an issue that does not exist");

  // The merged view is the one a surface actually reads: stated first, baseline
  // only in the gaps, and never both on one key.
  const merged = CS.baseline.positions(PID, W.CMP_DATA[PID]);
  const stated = stanceMap(W, PID);
  Object.keys(stated).forEach((k) => {
    ok(!!merged[k], `${k}: every stated position survives into the merged view`);
    eq(merged[k].basis, "stated", `${k}: …still labelled as stated`);
    eq(merged[k].stance, sideOf(stated[k]), `${k}: …on the side they actually took`);
  });
  const overlap = Object.keys(merged).filter(
    (k) => merged[k].basis === "record" && Object.prototype.hasOwnProperty.call(stated, k));
  eq(overlap.length, 0, "no key is filled from the record while a quote exists for it");
  eq(Object.keys(merged).length, Object.keys(stated).length + CS.baseline.rows(PID).length,
    "the merged view is exactly stated plus the gaps the record could fill");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · every surface that prints one marks it, and disowns the score");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(CS.baseline.NOTE, "not a quoted stance", "the standing note denies it is a stance");
  has(CS.baseline.NOTE, "not counted in Direction Match", "…and denies that it is scored");
  eq(CS.baseline.NOT_DM, "Not in Direction Match", "the short tag is one string in one place");

  const html = CS.formalPatternIndex.html(PID, {}) || "";
  must(html.length > 400, "the formal pattern index rendered nothing to read");
  const chips = html.match(/<span class="pdxor-stance pdxor-baseline[\s\S]*?<\/span>\s*<\/span>/g) || [];
  ok(chips.length >= 3, `the index prints a baseline chip on the unquoted rows (${chips.length})`);
  ok((html.match(/data-pdxfpi-baseline="1"/g) || []).length === chips.length,
    "…and flags each of those rows as baseline-bearing in its data");
  chips.forEach((c, i) => {
    has(c, "Baseline:", `chip ${i}: leads with the Baseline label`);
    lacks(c, "Says:", `chip ${i}: …and never with Says`);
    has(c, CS.baseline.NOT_DM, `chip ${i}: …and carries the Direction Match denial on its face`);
    has(c, 'title="', `chip ${i}: …with the full sentence for pointer users`);
    has(c, 'aria-label="', `chip ${i}: …and for a screen reader, which cannot see the tag`);
  });
  // A stated row is untouched by any of this.
  has(html, " Says: ", "a row with a stated position still prints Says");

  // The alignment tools, the tree and the sheet each carry their own copy of the
  // same denial. Checked as strings here so a rewording that drops the wall is a
  // failure in this file rather than a quiet regression on three surfaces.
  has(W._PDX_ALIGN_BASE_NOTE, "never counted in Direction Match",
    "the alignment chip's note denies the score");
  eq(W._PDX_ALIGN_BASE_TAG, "From the record", "…and names the lane in two words");
  const tree = R("stance-tree.js");
  has(tree, "not counted in Direction Match", "the tree's baseline note denies the score");
  const sheet = R("race-sheet.js");
  has(sheet, "not in Direction Match", "the race sheet's baseline cell denies it too");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · Direction Match cannot see the baseline — structurally");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Two identical boots. One is asked for every baseline the profile has before
  // Direction Match is read; the other is never asked at all. If reading the
  // baseline could move the score, these two would disagree.
  const cold = seeded();
  const warm = seeded();
  const warmRows = warm.PDXConsistency.baseline.rows(PID);
  warm.PDXConsistency.baseline.positions(PID, warm.CMP_DATA[PID]);
  warmRows.forEach((r) => warm.PDXConsistency.baseline.for(PID, r.key));
  ok(warmRows.length >= 3, "the warm boot really did read a baseline first");

  const readDm = (win) => {
    const wa = win.PDXWordAction && win.PDXWordAction.read(PID);
    return wa ? { pct: wa.pct, tested: (wa.tested || []).length, state: wa.state } : null;
  };
  const dCold = readDm(cold), dWarm = readDm(warm);
  must(!!dCold, "Direction Match returned nothing on the fixture — there is no score to protect");
  eq(dWarm.pct, dCold.pct, "the percentage is identical with the baseline read and without");
  eq(dWarm.tested, dCold.tested, "…and so is the count of issues it tested");
  eq(dWarm.state, dCold.state, "…and the state it reports");

  // The stated position map — the thing the word lane actually reads — is the
  // same object in both, with the same keys. The baseline lives beside it.
  eq(stanceCount(warm, PID), stanceCount(cold, PID),
    "the stated position map did not grow a single key");
  eq(Object.keys(stanceMap(warm, PID)).sort().join(","), STATED_KEYS.join(","),
    "…and holds exactly the keys it held before any of this");
  eq(!!stanceMap(warm, PID)[K_UP], false,
    `${K_UP}: a baselined issue never appears in the stated map`);

  // The isolation is structural, not conditional: the word ledger reads the raw
  // curated cards, and there is no code path from the baseline into them.
  const cons = R("consistency.js");
  const wa = R("word-action.js");
  lacks(wa, "baseline", "word-action.js does not mention the baseline at all");
  lacks(wa, "_polBaselineMap", "…and cannot reach its published accessor");
  ok(/_resolveStanceList/.test(wa) || /_pdxLedgerSlot/.test(cons),
    "the word lane still resolves stances from the curated list it always did");
  // The one assignment the baseline makes is to its own global. If a future edit
  // points it at _polPositionMap instead, this fails loudly.
  ok(/window\._polBaselineMap\s*=/.test(cons),
    "the baseline publishes under its own name");
  lacks(cons, "window._polPositionMap = baselinePositions",
    "…and never takes over the stated map's name");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · it is a read, and reads do not cost");
// ═════════════════════════════════════════════════════════════════════════════
{
  const a = CS.baseline.rows(PID);
  const b = CS.baseline.rows(PID);
  eq(a, b, "a second read inside one epoch is the same memoized list");
  eq(CS.baseline.count(PID), a.length, "the published count agrees with the list");
  if (typeof W.PDXDataChanged === "function") {
    W.PDXDataChanged();
    const c = CS.baseline.rows(PID);
    eq(c.length, a.length, "…and it rebuilds to the same answer after the epoch turns");
    ok(c !== a, "…from a genuinely fresh pass, not a stale cache");
  }
  // Somebody with no formal file at all is not an error, it is an empty list.
  const other = Object.keys(W.CMP_DATA).find((k) => k !== PID);
  eq(CS.baseline.rows(other).length, 0, "a profile with no formal record has no baseline");
  eq(CS.baseline.for(other, K_UP), null, "…and no baseline on any issue");
}

if (failures.length) {
  console.error(`\n✗ record baseline: ${failures.length} failure(s)\n`);
  failures.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
console.log(`\n✓ record baseline: all ${passed} assertions passed`);
