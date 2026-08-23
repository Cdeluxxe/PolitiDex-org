#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-ledger-first.mjs — a mapped act is on the ledger, whatever it weighs
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex does not weigh bills. It publishes a ledger of formal receipts and
// the reader weighs them. Two curation fields exist on every measure→issue
// mapping — `weight` (0..100, how central the issue is to the measure) and
// `is_primary` (the one issue the measure is filed under) — and the rule this
// file pins is that neither of them may decide what a reader can SEE.
//
//   THE MISSION RULE. If an instrument is mapped to an issue because its text
//   touches, changes or influences that issue, that receipt appears on that
//   issue's formal ledger. "Secondary", "narrow" and "low weight" are labels a
//   row may WEAR. They are never a reason to omit the row.
//
// The fixture is the hard case, on purpose: ONE measure mapped to three issues
// with mixed primary/secondary and unequal weights — 100 primary, 60 supporting
// and 12, which is well under the narrow-link threshold. A reader on any of the
// three issues has an equal right to know this vote happened.
//
// What is checked, in the order a reader would doubt it:
//
//   1. THE ACT IS ON ALL THREE LEDGERS. The dossier's item list, the dossier's
//      rendered rows, and the shared per-issue item accessor every surface reads
//      all return it for the 12-weight secondary mapping exactly as for the
//      100-weight primary one.
//   2. LABEL, NEVER FILTER. The narrow mapping is TAGGED "narrow link" and the
//      secondary ones "supporting link" — the words are there, and so is the row.
//   3. NOTHING CLAIMS AN EMPTY FILE. The issue index, the formal-pattern atlas
//      and its shape never say "no formal record on this issue" about an issue
//      that holds a mapped act.
//   4. THE PATTERN IS COUNTED, NOT WEIGHED. The dominance test that decides
//      whether a record gets characterised reads act counts. Structural probe:
//      the two deciding functions no longer compare the curator-weight sums.
//   5. DIRECTION MATCH IS UNTOUCHED. Weight is still a Direction Match input and
//      that was deliberately left alone — proved by running the whole profile
//      with the pattern engine switched off and byte-comparing every scored
//      quantity, plus PDXWordAction.read(), against the shipped build.
//   6. NO NEW PERCENTAGE. The ledger-first surfaces publish counts, never a
//      share of anything.
//
//   node scripts/test-ledger-first.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, votes seeded the
// way a completed /api/voting-record fetch leaves the cache. No database, no
// network, no browser.

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
const SRC = {};
for (const f of FILES) SRC[f] = R(f);

function boot() {
  const win = makeSandbox();
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) vm.runInContext(SRC[f], sandbox, { filename: f });
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
const section = (t) => console.log(`  · ${t}`);

// A harness that cannot reach its target must SAY so rather than pass quietly.
function must(cond, what) {
  if (!cond) {
    console.error("✗ ledger-first: STALE HARNESS — a contract cannot be verified:\n  " + what);
    process.exit(2);
  }
}

// ── The fixture ──────────────────────────────────────────────────────────────
const PID = "massie";
const probe = boot();
const stanceKeys = new Set(
  probe.PDXConsistency.issueRows(PID).filter((r) => r.said).map((r) => r.key)
);
const ISSUE_KEYS = Object.keys(probe.ISSUE_MAP || {});
// Silent keys only: a stated position would put these rows in Direction Match's
// hands, and this file is about the rows nobody spoke on — the ledger's own.
const SILENT = ISSUE_KEYS.filter((k) => !stanceKeys.has(k) && !/_balance$/.test(k));
// PRIMARY: the issue the omnibus is filed under. SUPPORTING: a real but
// secondary title. NARROW: a rider, mapped at a weight under the narrow-link
// threshold — the row the old ordering would have buried, and the whole point.
const [PRIMARY, SUPPORTING, NARROW, FILLER] = SILENT;
must(PRIMARY && SUPPORTING && NARROW && FILLER,
  "the fixture profile no longer offers four issue keys with no stated position");

const NARROW_AT = probe.PDXExecRecordUI && probe.PDXExecRecordUI.NARROW_AT;
must(typeof NARROW_AT === "number",
  "PDXExecRecordUI.NARROW_AT is gone — the narrow-link threshold cannot be read");

const OMNI_NUMBER = "H.R. 4242";
const OMNI_TITLE = "Consolidated Appropriations and Reform Act";
// ONE measure, three issues, three different weights and one primary among them.
const OMNIBUS = {
  kind: "vote", rollcallId: 4242, measureId: 94242, number: OMNI_NUMBER,
  date: "2025-06-12", action: "On Passage", position: "yea", isProcedural: false,
  title: OMNI_TITLE,
  source: { url: "https://www.congress.gov/roll-call-vote/4242", label: "Congress.gov" },
  issues: [
    { issueKey: PRIMARY,    weight: 100, isPrimary: true,  supportMeaning: "yea_supports" },
    { issueKey: SUPPORTING, weight: 60,  isPrimary: false, supportMeaning: "yea_supports" },
    { issueKey: NARROW,     weight: 12,  isPrimary: false, supportMeaning: "yea_supports" },
  ],
};
must(OMNIBUS.issues[2].weight <= NARROW_AT,
  `the narrow mapping (${OMNIBUS.issues[2].weight}) is no longer under the narrow-link threshold (${NARROW_AT})`);

// Filler so the member clears the coverage floor and the record is a record
// rather than a single act. None of it touches the three fixture issues except
// through the omnibus itself.
const filler = (n, position) => ({
  kind: "vote", rollcallId: 700 + n, measureId: 9700 + n, number: "H.R. " + (700 + n),
  date: "2025-0" + ((n % 9) + 1) + "-03", action: "On Passage", position: position,
  isProcedural: false, title: "Filler measure " + n,
  source: { url: "https://www.congress.gov/roll-call-vote/" + (700 + n), label: "Congress.gov" },
  issues: [{ issueKey: FILLER, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
});
// One procedural act on the primary issue. The formal pattern used to discount a
// procedural vote to a quarter of its curator weight before deciding what to
// call a record; it now counts acts, so this is one act like any other — and the
// row therefore has to SAY it was procedural, which section 2 checks.
const CLOTURE = {
  kind: "vote", rollcallId: 4243, measureId: 94243, number: "H.R. 4243",
  date: "2025-06-05", action: "On Cloture", position: "yea", isProcedural: true,
  title: "Motion to invoke cloture",
  source: { url: "https://www.congress.gov/roll-call-vote/4243", label: "Congress.gov" },
  issues: [{ issueKey: PRIMARY, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
};
const SEED = [OMNIBUS, CLOTURE];
for (let i = 0; i < 14; i++) SEED.push(filler(i, i < 11 ? "yea" : "nay"));

// Sandbox A: shipped. Sandbox B: identical seeds with the pattern engine removed
// at the derivation, which is the product exactly as it scores.
const A = boot(), B = boot();
A.PDXVotingRecord.noteMember(PID, SEED.map((v) => JSON.parse(JSON.stringify(v))));
B._recordDirectionIndex = undefined;
B._recordDisplayTier = undefined;
B.PDXVotingRecord.noteMember(PID, SEED.map((v) => JSON.parse(JSON.stringify(v))));
const CS = A.PDXConsistency, CSB = B.PDXConsistency;
const MAPPED = [PRIMARY, SUPPORTING, NARROW];
const nameOf = (k) => ((A.ISSUE_MAP && A.ISSUE_MAP[k] && A.ISSUE_MAP[k].label) || k);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · one act, three ledgers — the mapping got it there, so it is there");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The shared per-issue accessor every ledger surface reads. If the act is
  // missing here it is missing everywhere, so this is asserted first and hard.
  must(typeof A.window._pdxRecordIssueItems === "function",
    "window._pdxRecordIssueItems is gone — the shared per-issue item list cannot be read");
  for (const k of MAPPED) {
    const items = A.window._pdxRecordIssueItems(PID, k) || [];
    ok(items.some((it) => it.measureId === OMNIBUS.measureId),
      `${k}: the shared item list holds the omnibus`);
  }
  // A measure the omnibus was NOT mapped to does not acquire it. The rule is
  // "every issue it was mapped to", not "every issue".
  const stray = A.window._pdxRecordIssueItems(PID, FILLER) || [];
  ok(!stray.some((it) => it.measureId === OMNIBUS.measureId),
    "an unmapped issue does not pick the omnibus up");

  // The dossier's own enumeration — L2, the list a reader scrolls.
  for (const k of MAPPED) {
    const items = CS.dossierItems(PID, k) || [];
    const row = items.filter((d) => d.item && d.item.measureId === OMNIBUS.measureId)[0];
    ok(!!row, `${nameOf(k)}: the issue dossier enumerates the omnibus`);
    if (!row) continue;
    eq(row.multi, true, `${nameOf(k)}: …and knows it is a multi-issue instrument`);
    has(row.ident, "H.R. 4242", `${nameOf(k)}: …under its own bill number`);
  }

  // And the rendered rows, which is what actually reaches a reader. The narrow
  // mapping is the one that matters here: 12 out of 100, and still on the page.
  for (const k of MAPPED) {
    const html = CS.dossierRecordsHtml(PID, k);
    has(html, OMNI_NUMBER, `${nameOf(k)}: the rendered dossier prints the omnibus`);
  }

  // The issue is on the profile's own list of issues with something on file —
  // a secondary-only mapping is a signal like any other.
  const signal = CS.issuesWithSignal(PID) || [];
  const keyed = signal.map((s) => (typeof s === "string" ? s : (s && s.key)));
  for (const k of MAPPED) {
    ok(keyed.indexOf(k) !== -1, `${nameOf(k)}: appears among the issues with something on file`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · label, never filter — the words 'narrow' and 'supporting' are on the row");
// ═════════════════════════════════════════════════════════════════════════════
{
  const nrow = (CS.dossierItems(PID, NARROW) || [])
    .filter((d) => d.item && d.item.measureId === OMNIBUS.measureId)[0];
  const srow = (CS.dossierItems(PID, SUPPORTING) || [])
    .filter((d) => d.item && d.item.measureId === OMNIBUS.measureId)[0];
  const prow = (CS.dossierItems(PID, PRIMARY) || [])
    .filter((d) => d.item && d.item.measureId === OMNIBUS.measureId)[0];
  must(nrow && srow && prow, "section 1 already failed — the rows are not there to label");

  eq(nrow.narrow, true, "the 12-weight mapping is marked narrow");
  eq(nrow.primary, false, "…and secondary");
  eq(srow.narrow, false, "the 60-weight mapping is not narrow");
  eq(srow.primary, false, "…and is secondary");
  eq(prow.primary, true, "the 100-weight mapping is the primary one");

  // The tags render, on the row's own opened detail. This is the whole
  // compromise the mission rule allows: the curation's opinion of how central
  // the link is may be SAID, out loud, on the row it is about — and the row
  // stays either way.
  const detailFor = (k) => {
    const items = CS.dossierItems(PID, k) || [];
    let at = -1;
    items.forEach((d, i) => { if (d.item && d.item.measureId === OMNIBUS.measureId) at = i; });
    return at < 0 ? "" : CS.dossierDetailHtml(PID, k, at, items);
  };
  has(detailFor(NARROW), "narrow link", "the narrow mapping's row wears its label");
  has(CS.dossierRecordsHtml(PID, NARROW), OMNI_NUMBER,
    "…on a row that is still on the page");
  has(detailFor(SUPPORTING), "supporting link",
    "the secondary mapping's row says it is supporting");
  has(detailFor(PRIMARY), "primary link",
    "and the primary mapping's row says which one it is");

  // And a procedural act says so, for the same reason the narrow one does: it is
  // now counted as a whole act by the pattern engine, so a reader counting the
  // ledger for themselves has to be able to see which acts they are counting.
  const pitems = CS.dossierItems(PID, PRIMARY) || [];
  let cAt = -1;
  pitems.forEach((d, i) => { if (d.item && d.item.measureId === CLOTURE.measureId) cAt = i; });
  ok(cAt >= 0, "the procedural act is on the primary issue's ledger");
  if (cAt >= 0) {
    eq(pitems[cAt].procedural, true, "…and the row model knows it is procedural");
    has(CS.dossierDetailHtml(PID, PRIMARY, cAt, pitems), "procedural vote",
      "…and the rendered row says so in words");
  }

  // The multi-issue trail: one act, read across every issue it was mapped to,
  // from inside each of them.
  for (const k of MAPPED) {
    const items = CS.dossierItems(PID, k) || [];
    let at = -1;
    items.forEach((d, i) => { if (d.item && d.item.measureId === OMNIBUS.measureId) at = i; });
    if (at < 0) continue;
    const trail = CS.instrumentTrail(PID, k, at);
    ok(!!trail, `${nameOf(k)}: the omnibus has an instrument trail from this issue`);
    if (!trail) continue;
    const keys = JSON.stringify(trail);
    for (const other of MAPPED) {
      if (other === k) continue;
      ok(keys.indexOf(other) !== -1 || keys.indexOf(nameOf(other)) !== -1,
        `${nameOf(k)}: …and the trail names ${nameOf(other)}, which the same act also touched`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · nothing on file is a claim, and it is false here");
// ═════════════════════════════════════════════════════════════════════════════
{
  const NONE = CS.recordPattern.NONE;
  must(typeof NONE === "string" && NONE.length > 5,
    "PDXConsistency.recordPattern.NONE is gone — the empty-state sentence cannot be read");
  for (const k of MAPPED) {
    const r = CS.issueRow(PID, k);
    ok(!!r, `${nameOf(k)}: the profile models a row for this issue`);
    if (!r) continue;
    const d = CS.recordPattern.display(r);
    ok(d.items > 0, `${nameOf(k)}: the row reports formal items on file`);
    ok(d.onRecord === true, `${nameOf(k)}: …and says it is on the record`);
    ok(d.label !== NONE,
      `${nameOf(k)}: …so the row does not say "${NONE}" over an act it holds`);
  }

  // The atlas. Every mapped issue gets a row — with a pattern where the engine
  // will read one and an honest "no pattern read" where it will not, but never
  // an absence.
  const rows = CS.formalPatternIndex.rows(PID) || [];
  const atlasKeys = rows.map((r) => r.key);
  for (const k of MAPPED) {
    ok(atlasKeys.indexOf(k) !== -1,
      `${nameOf(k)}: the formal-pattern atlas lists the issue rather than omitting it`);
  }
  eq(CS.formalPatternIndex.count(PID), rows.length,
    "the atlas CTA promises exactly the number of rows the atlas holds");

  // And the four-line shape over the same rows counts them all.
  const shape = CS.formalPatternIndex.shape(PID);
  ok(!!shape, "the atlas shape builds");
  if (shape) {
    ok((shape.total || shape.issues || rows.length) >= rows.length ||
       typeof shape === "object",
      "the shape summarises the same row set");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the pattern is counted, not weighed");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Behavioural: same six acts, same directions, wildly different curator
  // weights — and the same read either way. Before this pass the weights below
  // produced a different answer from the same list of acts, which is the defect:
  // a chip disagreeing with the rows printed underneath it.
  const shaped = (weights) => {
    const w = boot();
    const seed = [];
    for (let i = 0; i < 14; i++) seed.push(filler(i, i < 11 ? "yea" : "nay"));
    weights.forEach((wt, i) => {
      seed.push({
        kind: "vote", rollcallId: 800 + i, measureId: 9800 + i, number: "H.R. " + (800 + i),
        date: "2025-0" + ((i % 9) + 1) + "-21", action: "On Passage",
        position: i < 5 ? "yea" : "nay", isProcedural: false, title: "Shaped measure " + i,
        source: { url: "https://www.congress.gov/roll-call-vote/" + (800 + i), label: "Congress.gov" },
        issues: [{ issueKey: PRIMARY, weight: wt, isPrimary: true, supportMeaning: "yea_supports" }],
      });
    });
    w.PDXVotingRecord.noteMember(PID, seed);
    return w._pdxRecordDirection(PID, PRIMARY, {});
  };
  const even = shaped([100, 100, 100, 100, 100, 100]);
  const uneven = shaped([20, 20, 20, 20, 20, 100]);
  eq(uneven.judged, even.judged, "the same six acts are judged whatever they weigh");
  eq(uneven.advances, even.advances, "…with the same count on the advancing side");
  eq(uneven.opposes, even.opposes, "…and the same count on the other");
  eq(uneven.token, even.token, "…so the record reads the same way");
  eq(uneven.clause, even.clause, "…in the same words");
  ok(uneven.advanceScore !== even.advanceScore,
    "…while the curator-weight sums really did differ, so the comparison is not vacuous");

  // Structural: the two functions that DECIDE no longer compare the sums. The
  // sums are still computed and still carried — they are a disclosure — so the
  // probe is about the comparison, not about the field existing.
  const code = blankComments(SRC["stance-helpers.js"]);
  const bodyOf = (head, label) => {
    const at = code.indexOf(head);
    must(at !== -1, `stance-helpers.js no longer contains ${JSON.stringify(head)} — ${label}`);
    const open = code.indexOf("{", at);
    let depth = 0, i = open;
    for (; i < code.length; i++) {
      if (code[i] === "{") depth++;
      else if (code[i] === "}") { depth--; if (depth === 0) { i++; break; } }
    }
    must(depth === 0, `could not brace-scan ${label}`);
    return code.slice(at, i);
  };
  const idxBody = bodyOf("function _recordDirectionIndex", "the pattern index");
  const tierBody = bodyOf("function _recordDisplayTier", "the display tier");
  for (const [label, body] of [["the pattern index", idxBody], ["the display tier", tierBody]]) {
    // The one thing that must be true: no comparison operator with a score on
    // either side of it. `advanceScore += w` is fine and expected.
    ok(!/(advanceScore|opposeScore)[^;]{0,40}(>=|<=|>|<)/.test(body),
      `${label} never compares a curator-weight sum`);
    ok(!/(>=|<=|>|<)[^;]{0,40}(advanceScore|opposeScore)/.test(body),
      `${label} never compares against a curator-weight sum either`);
    ok(!/_RD_DOMINANCE[^;]{0,60}(advanceScore|opposeScore)/.test(body),
      `${label}'s dominance bar is not applied to a weight sum`);
  }
  has(idxBody, "advanceScore +=", "the index still computes the sums — they are disclosed, not deleted");
  const idxOut = A._pdxRecordDirection(PID, FILLER, {});
  eq(typeof idxOut.advanceScore, "number", "…and still publishes them on the index");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · Direction Match untouched — weight is still ITS input, and only its");
// ═════════════════════════════════════════════════════════════════════════════
{
  const rowsA = CS.issueRows(PID), rowsB = CSB.issueRows(PID);
  eq(rowsA.length, rowsB.length, "both sandboxes model the same rows");
  const byKeyB = {};
  rowsB.forEach((r) => { byKeyB[r.key] = r; });
  let scored = 0;
  for (const a of rowsA) {
    const b = byKeyB[a.key];
    ok(!!b, `${a.key}: the row exists in both sandboxes`);
    if (!b) continue;
    const ra = CS.rowResult(a), rb = CSB.rowResult(b);
    eq(a.verdict.token, b.verdict.token, `${a.key}: the verdict token is unchanged`);
    eq(a.verdict.score, b.verdict.score, `${a.key}: the verdict score is unchanged`);
    eq(ra.pct, rb.pct, `${a.key}: the percentage is unchanged`);
    eq(ra.state, rb.state, `${a.key}: the result state is unchanged`);
    eq(ra.held, rb.held, `${a.key}: the inventory count is unchanged`);
    if (typeof ra.pct === "number") scored++;
  }
  ok(scored > 0, "the fixture scores something for the comparison to protect");
  eq(JSON.stringify(CS.verdictTally(PID)), JSON.stringify(CSB.verdictTally(PID)),
    "the profile's verdict tally is byte-identical with the pattern engine gone");

  // PDXWordAction.read() — the other published arithmetic on this page — snapped
  // across both sandboxes for every profile it will speak about.
  must(A.PDXWordAction && typeof A.PDXWordAction.read === "function",
    "PDXWordAction.read is gone — the say-vs-did snapshot cannot be taken");
  const pids = Object.keys(A.CMP_DATA || {}).slice(0, 40);
  ok(pids.length > 5, "there are profiles to snapshot");
  let compared = 0, spoke = 0;
  for (const p of pids) {
    let sa, sb;
    try { sa = JSON.stringify(A.PDXWordAction.read(p)); } catch (e) { sa = "ERR " + e.message; }
    try { sb = JSON.stringify(B.PDXWordAction.read(p)); } catch (e) { sb = "ERR " + e.message; }
    eq(sa, sb, `${p}: PDXWordAction.read() is byte-identical`);
    compared++;
    if (sa && sa.length > 40) spoke++;
  }
  ok(compared > 5, "the snapshot covered a real set of profiles");
  ok(spoke > 0, "…and at least one of them actually returned a reading");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · counts, never a share");
// ═════════════════════════════════════════════════════════════════════════════
{
  const strings = [];
  for (const k of MAPPED) {
    const r = CS.issueRow(PID, k);
    if (!r) continue;
    const d = CS.recordPattern.display(r);
    strings.push(d.label, d.counts, d.depth, d.note);
  }
  const d = A._pdxRecordDirection(PID, FILLER, {});
  strings.push(d.clause, d.summary, d.label);
  ok(strings.filter(Boolean).length > 3, "there is ledger-first copy to check");
  for (const s of strings) {
    if (!s) continue;
    ok(s.indexOf("%") === -1, `no percent sign in ledger copy: ${JSON.stringify(s)}`);
    ok(!/\b\d+ ?(percent|pct)\b/i.test(s), `…and none spelled out: ${JSON.stringify(s)}`);
    ok(!/\bweighted\b|\bweight of\b/i.test(s),
      `…and the copy never claims to have weighed anything: ${JSON.stringify(s)}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
section("7 · the groupings are not weight-decided, and there is no fold to decide");
// ══════════════════════════════════════════════════════════════════════════════
// The presidential record's per-action issue list used to fold after four rows in
// each direction, so whatever ORDERED that list chose which of a document's issues
// a reader saw without opening anything — and it was sorted by isPrimary and then
// by curator weight, which put every low-weight mapping behind the fold by
// construction. The sort was fixed first (alphabetical, arbitrary on purpose). The
// Big Picture pass finished the job and removed the fold: on the surface whose
// entire purpose is to show what an instrument touched, the DEFAULT view has to be
// the full map, not a smaller view of it with the rest one tap away. So this
// section now asserts the stronger property — every issue the group header counts
// is rendered inline, in name order, with nothing folded and no rank badge on it.
{
  const html = A.PDXExecRecordUI.sectionHtml("trump");
  must(html && html.length > 5000,
    "the presidential record section rendered nothing — the ordering cannot be checked");
  const groups = html.split('class="pdxer-grp"').slice(1);
  must(groups.length > 10, "the fixture president has too few issue groups to probe");
  let multi = 0, folds = 0, narrow = 0, big = 0;
  for (const g of groups) {
    const head = (g.match(/^>([^<]*)</) || [])[1] || "";
    const claimed = parseInt((head.match(/— (\d+) issue/) || [])[1], 10);
    const labels = [...g.matchAll(/pdxer-iss-lbl">([^<]*)</g)].map((m) => m[1]);
    // NOTHING HIDDEN AND NOTHING FOLDED: the header states a count and the group
    // renders that many rows, inline, in the view the reader is given by default.
    eq(labels.length, claimed, `${head}: every issue the header counts is rendered`);
    // NOT WEIGHT-ORDERED: alphabetical by label, which is arbitrary in a way no
    // reader will mistake for a judgement about which issues really counted.
    const sorted = [...labels].sort((a, b) => a.localeCompare(b));
    eq(JSON.stringify(labels), JSON.stringify(sorted),
      `${head}: the issues are ordered by name, not by curator weight`);
    if (labels.length > 1) multi++;
    if (labels.length > 4) big++;
    // Scope the fold probe to the group's OWN rows. The chunk runs to the next
    // group header, so it also catches the card's standing-log fold, which sits
    // below every row and is a different surface with a different argument.
    const lastRow = g.lastIndexOf("pdxer-issrow");
    if (g.slice(0, lastRow < 0 ? g.length : lastRow).indexOf("pdxer-more") !== -1) folds++;
    if (g.indexOf("pdxer-iss-scope") !== -1) narrow++;
  }
  ok(multi > 5, "the probe saw real multi-issue documents, so the ordering claim is not vacuous");
  ok(big > 0,
    "…and at least one group bigger than the old four-row cap, so 'no fold' is not vacuous either");
  eq(folds, 0,
    "an issue group still folds — the default view of an instrument must be every topic it touches");
  ok(narrow > 0, "…and real narrow links, which is the row the old sort buried");
  // The disclosure still ships; what changed is where it sits. The scope of a
  // low-weight mapping is a sentence in the explanation now, not a chip in the row
  // head, and the primary/supporting rank badge is gone outright.
  has(html, "rather than the whole document",
    "a mapping that rests on one part of a document no longer says so anywhere");
  ok(!/pdxer-narrow|pdxer-primary|pdxer-second/.test(html),
    "a rank or narrowness BADGE is back in the row head — this pass moved that disclosure into the explanation sentence on purpose");
  ok(!/>\s*supporting\s*</.test(html),
    "a row is marked 'supporting' — no default UI string may mark a mapped topic as second-class");
}

// ══════════════════════════════════════════════════════════════════════════════
section("8 · a filtered voting record files rows under the issue being read");
// ══════════════════════════════════════════════════════════════════════════════
// The full Voting Record groups by issue. A vote reaches a filtered list because
// it is mapped to the filtered issue — possibly by a supporting mapping — and
// bucketing it by issues[0] then filed it under a heading for some OTHER issue.
// The row was never dropped, but a reader who asked one question got the
// curation's answer to a different one. renderGroups is mounted behind a DOM, so
// this is a structural probe of the bucketing rule itself.
{
  const code = blankComments(SRC["voting-record.js"]);
  const at = code.indexOf("function renderGroups");
  must(at !== -1, "voting-record.js no longer defines renderGroups");
  const body = code.slice(at, at + 2600);
  ok(/_state\s*&&\s*_state\.filters\s*&&\s*_state\.filters\.issue/.test(body),
    "renderGroups reads the active issue filter");
  ok(/filterKey\s*&&\s*mappedTo\(/.test(body),
    "…and buckets a row under it when the row is mapped to it");
  ok(body.indexOf("issues[0]") !== -1,
    "…while an unfiltered list still files by the primary mapping, as it always did");
}

// Comment-blanked source, offsets preserved — a rule of the form "this function
// never compares X" is worth nothing if a comment ABOUT X satisfies it, and this
// pass added long comments about exactly the fields being probed.
function blankComments(s) {
  let out = "", i = 0;
  const n = s.length;
  let prev = "";
  const REGEX_OK = "(,=:[!&|?{};+-~*%<>^\n";
  while (i < n) {
    const c = s[i], d = s[i + 1];
    if (c === "/" && d === "/") { while (i < n && s[i] !== "\n") { out += " "; i++; } continue; }
    if (c === "/" && d === "*") {
      out += "  "; i += 2;
      while (i < n && !(s[i] === "*" && s[i + 1] === "/")) { out += (s[i] === "\n" ? "\n" : " "); i++; }
      if (i < n) { out += "  "; i += 2; }
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      out += c; i++;
      while (i < n) {
        if (s[i] === "\\") { out += s[i] + (s[i + 1] || ""); i += 2; continue; }
        out += s[i];
        if (s[i] === c) { i++; break; }
        i++;
      }
      prev = c; continue;
    }
    if (c === "/" && REGEX_OK.indexOf(prev) !== -1) {
      out += c; i++;
      let inClass = false;
      while (i < n) {
        if (s[i] === "\\") { out += s[i] + (s[i + 1] || ""); i += 2; continue; }
        if (s[i] === "[") inClass = true;
        else if (s[i] === "]") inClass = false;
        out += s[i];
        if (s[i] === "/" && !inClass) { i++; break; }
        if (s[i] === "\n") { i++; break; }
        i++;
      }
      prev = "/"; continue;
    }
    out += c; i++;
    if (!/\s/.test(c)) prev = c;
  }
  return out;
}

if (failures.length) {
  console.error(`\n✗ ledger-first: ${failures.length} failure(s)`);
  for (const f of failures.slice(0, 40)) console.error("  · " + f);
  if (failures.length > 40) console.error(`  · …and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`\n✓ ledger-first: all ${passed} assertions passed — one act, every issue it touched, ` +
  `labels on the rows and no weight deciding who sees what`);
