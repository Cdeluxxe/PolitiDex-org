#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-noside-acts.mjs — an abstention is not a quiet Yea
// ─────────────────────────────────────────────────────────────────────────────
// THE COLLISION, as a reader met it. On Speaker Schultz's profile, 🍎 Invest in
// Public Schools:
//
//   the brief    🏛 Record · Strongly supports · 4 advanced · 0 against
//   the dossier  5 votes listed here · 4 advancing … H.B. 400 · Did not vote
//
// Both numbers were right and neither surface said so. The chip counts JUDGED
// SIDES — the engine drops a Present, a Did Not Vote and an act with no recorded
// direction in pass 1 of _recordDirectionIndex, before a single floor, tier or
// lead is computed — and the dossier's enumeration lists everything ON FILE,
// which is also correct, because an abstention on a bill this issue was the
// subject of is a fact about the record and dropping it would be
// silence-means-absence in miniature. What was missing was any sentence joining
// the two, and a reader who subtracts gets a fourth Yea that does not exist.
//
// Worse, the abstention row LOOKED like a vote: same icon, same weight, same slot
// layout as the three Yeas above it, and a paragraph underneath headed "Which way
// it cut" explaining what a Yea here would have counted as — a polarity lesson
// about a ballot nobody cast.
//
// So this harness pins four things, and the first of them is that nothing moved:
//
//   1. THE COUNTS WERE ALREADY JUDGED-ONLY, AND STILL ARE. A no-side act may not
//      increment `advances` or `opposes`, may not raise `judged`, and may not push
//      a row to Strong or Mostly. Asserted by ADDING abstentions to a fixture and
//      requiring the tier, the tone, the label and both integers to come back
//      byte-identical.
//   2. THE LEFTOVER IS PUBLISHED. `noSide` is the count of acts on file that took
//      no side, and the brief may account for them — "3 advanced · 0 against · 1
//      no side" — beside the tally rather than inside it.
//   3. THE DOSSIER ROW IS VISIBLY NOT A VOTE. Yea and Nay keep the ▲/▼ side pill;
//      a no-side row gets the dashed frame, a first-line label in the clerk's own
//      distinction ("Did not vote" / "Present" / "No side"), and NO polarity
//      paragraph.
//   4. THE TWO SURFACES AGREE. On the same (member, issue) the brief's integers
//      are the dossier's judged counts, on a fixture that holds an abstention.
//
// And the fences: no published floor moved, the shared side phrase is still two
// integers and nothing else, and no mapping, weight or Direction Match input was
// touched.
//
//   node scripts/test-noside-acts.mjs
//
// Real shipped modules in a node:vm sandbox, votes seeded the way a completed
// /api/voting-record fetch leaves the cache.

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
function boot() {
  const win = makeSandbox();
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const [f, src] of SRC) vm.runInContext(src, sandbox, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
}
const SH_SRC = R("stance-helpers.js");
const C_SRC = R("consistency.js");
const WA_SRC = R("word-action.js");

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
  console.error(`✗ no-side acts: ${msg}`);
  process.exit(1);
};
const txt = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// ── The fixture ──────────────────────────────────────────────────────────────
// Schultz's shape, in the federal harness's own item vocabulary: one issue
// carrying N Yeas and one recorded absence, plus enough filler on other issues to
// clear the MEMBER coverage floor — which is a floor about how much of a person's
// file we hold, is not what this pass touches, and must be cleared by the FILLER
// so that no fixture below depends on an abstention to reach it.
const PID = "schumer";
const KEY = "public_schools";
const probe = boot();
must(probe.PDXConsistency && probe.PDXWordAction && probe.PDXVotingRecord,
  "the shipped modules did not publish their globals");
must(probe.ISSUE_MAP && probe.ISSUE_MAP[KEY], `${KEY} is no longer an issue key`);
const NO_POLE = probe._PDX_RD_NO_POLE || {};
must(!NO_POLE[KEY], `${KEY} is now a no-pole key — the fixture needs a polable issue`);
const MEMBER_FLOOR = probe._PDX_RD_MEMBER_FLOOR;
const MIN_JUDGED = probe._PDX_RD_MIN_JUDGED;
must([MEMBER_FLOOR, MIN_JUDGED].every(Number.isInteger),
  "the published floors are not integers — the fixture cannot be built against them");
const FILLER = Object.keys(probe.ISSUE_MAP)
  .filter((k) => k !== KEY && !/_balance$/.test(k) && !NO_POLE[k]);

let seq = 0;
const vote = (issueKey, position, number) => ({
  kind: "vote", rollcallId: 900 + seq, measureId: 1200 + seq,
  number: number || "S. " + (200 + seq), date: "2025-0" + ((seq++ % 9) + 1) + "-14",
  action: "On Passage", position: position, isProcedural: false,
  title: "Measure " + seq,
  source: { url: "https://www.congress.gov/roll-call-vote/" + (900 + seq), label: "Congress.gov" },
  issues: [{ issueKey: issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
});
// `yeas` on KEY, then `opts.nays` Nays on KEY, then one item per entry in
// `noSides` (a position string), then filler on other issues so the member floor
// is cleared without them.
//
// The Nays exist for one reason, and it is worth naming here rather than in the
// section that uses them: a record must hold `_RD_MIN_JUDGED` judged acts before
// it may be characterised at all, and this pass is forbidden from moving that
// floor. So three Yeas and an abstention is a THIN row — the brief reports thin
// issues as a count, not as a listed row — and the fixture that carries "3
// advanced" onto the brief's face is three Yeas, one Nay and the abstention. The
// abstention is still the item under test in both.
function seed(yeas, noSides, opts) {
  opts = opts || {};
  seq = 0;
  const out = [];
  for (let i = 0; i < yeas; i++) out.push(vote(KEY, "yea", "H.B. " + (100 + i)));
  for (let i = 0; i < (opts.nays || 0); i++) out.push(vote(KEY, "nay", "H.B. " + (300 + i)));
  (noSides || []).forEach((p, i) => out.push(vote(KEY, p, "H.B. " + (400 + i))));
  const spread = opts.spread || 2;
  const depth = opts.depth || MEMBER_FLOOR;
  FILLER.slice(0, spread).forEach((k) => {
    for (let j = 0; j < depth; j++) out.push(vote(k, "yea"));
  });
  return out;
}
function read(items) {
  const W = boot();
  W.PDXVotingRecord.noteMember(PID, JSON.parse(JSON.stringify(items)));
  const FPI = W.PDXConsistency.formalPatternIndex;
  const rows = FPI.rows(PID) || [];
  const row = rows.find((x) => x.key === KEY) || null;
  const shape = FPI.shape(PID);
  const flat = shape
    ? (shape.tops || []).concat(shape.splits || []).find((x) => x.key === KEY) || null
    : null;
  return { W, row, shape, flat,
    brief: W.PDXWordAction.heroMount(PID, W.CMP_DATA[PID], {}),
    dossier: W.PDXConsistency.dossierRecordsHtml(PID, KEY),
    split: W.PDXConsistency.ledger.split(PID, KEY, W.PDXConsistency.officialRecord(PID, KEY)) };
}
// The row as it renders in the brief's own markup — the <li> for this issue.
function briefRow(html) {
  const re = /<li class="pdxwa-shape-row"/g;
  let m;
  while ((m = re.exec(html))) {
    const end = html.indexOf("</li>", m.index);
    const slice = html.slice(m.index, end + 5);
    if (slice.indexOf('data-pdxst-dos="' + KEY + '"') >= 0) return slice;
  }
  return "";
}
// Every <details class="pdxdos-rec…"> in a dossier record list, sliced whole —
// the ROWS only. The list's own wrapper is `pdxdos-recs`, one letter away, and a
// prefix match would count it as a sixth act.
function dosRows(html) {
  const out = [];
  const re = /<details class="pdxdos-rec(?![a-z])[^"]*"/g;
  let m;
  while ((m = re.exec(html))) {
    const end = html.indexOf("</details>", m.index);
    out.push(html.slice(m.index, end + 10));
  }
  return out;
}
const dosRowFor = (html, number) =>
  dosRows(html).find((r) => r.indexOf(">" + number + "<") >= 0) || "";

// The acceptance fixture, verbatim: three Yeas and one Did Not Vote.
const A = read(seed(3, ["not_voting"]));
must(A.row, "the fixture issue produced no formal-index row");
// …and the same three Yeas with a Nay beside them, which is the same abstention
// on a record deep enough to be characterised, and therefore the version of this
// fixture the brief will actually print a row for.
const A2 = read(seed(3, ["not_voting"], { nays: 1 }));
must(A2.row, "the characterised fixture produced no formal-index row");
const A2_BRIEF_ROW = briefRow(A2.brief);
must(A2_BRIEF_ROW, "the characterised fixture's row did not render in the brief");

// ═════════════════════════════════════════════════════════════════════════════
// 1. THREE YEAS AND ONE DID NOT VOTE IS THREE
// ═════════════════════════════════════════════════════════════════════════════
section("1 · 3 yea + 1 DNV → the count is 3, never 4");
{
  eq(A.row.judged, 3, "the index judged the abstention");
  eq(A.row.pat.advances, 3, "the abstention was counted as advancing");
  eq(A.row.pat.opposes, 0, "the abstention was counted as opposing");
  eq(A.row.noSide, 1, "the index did not publish the no-side count");
  eq(A.row.noSideCount, "1 no side", "the leftover phrase is not the shipped wording");
  eq(A.row.held, 4, "the row's own inventory dropped the abstention — it IS on file");
  eq(A.row.pat.sideCounts, "3 advanced · 0 against",
    "the two-sided tally is not the judged sides");
  // THE WHOLE POINT, AS A STRING. Whatever countable the tier chooses to print,
  // the number in it is 3 — and no form of "4" may appear as an advanced count.
  eq(A.row.counts, "3 votes advanced",
    "the row's own countable is not the judged count");
  lacks(A.row.counts, "4", "the row's countable counted the abstention");
  // WHY THIS ROW IS NOT ON THE BRIEF'S FACE, said out loud so a later reader does
  // not mistake the absence for a regression. Three judged acts is under the
  // per-issue floor this pass may not move, so the row is thin, and the brief
  // reports the whole thin tail as a sentence ("N more issues have formal items
  // on file but not enough of them to characterise a pattern yet") rather than as
  // listed rows. Nothing here is a leftover of the fix; it is the shipped
  // hierarchy, and the assertion is that the row lands in that bucket rather than
  // being promoted into the tally by an abstention.
  eq(A.row.tier, "thin", "three judged acts were characterised");
  ok(!A.flat, "a thin row was listed among the brief's characterised patterns");
  // AND IN WHICH TAIL BUCKET. shape() no longer merges "this row's published side
  // is thin" with "this row has no published side" — a thin row is READ thin, and
  // the card's "too thin to characterise" tally (`thinN`) must not claim it. The
  // whole-tail size the brief prints is `tailN`, and it still counts this row.
  eq(A.shape && A.shape.readThinN, 1, "the read-thin issue is not counted as read thin in the brief's shape");
  eq(A.shape && A.shape.thinN, 0, "a row with a published thin side was counted as having nothing readable");
  eq(A.shape && A.shape.tailN, 1, "the thin issue left the brief's whole-tail count");

  // …so the acceptance's own sentence — the brief says 3 advanced, not 4 — is
  // pinned on the fixture the brief prints: the same three Yeas and the same
  // abstention, one Nay deeper.
  eq(A2.row.judged, MIN_JUDGED, "the characterised fixture is not at the judged floor");
  eq(A2.row.pat.advances, 3, "the abstention was counted as a fourth advance");
  eq(A2.row.noSide, 1, "the characterised fixture dropped the leftover count");
  const t = txt(A2_BRIEF_ROW);
  has(t, "3 advanced", "the brief row does not name 3 as the advanced count");
  lacks(t, "4 advanced", "the brief row counted the abstention as a fourth advance");
  lacks(t, "4 votes advanced", "the brief row counted the abstention as a fourth vote");
  has(t, "1 no side", "the brief row does not account for the abstention");
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. AND IT CANNOT PUSH THE ROW TO STRONG OR MOSTLY
// ═════════════════════════════════════════════════════════════════════════════
// The strongest form of requirement 1: not "the arithmetic excludes them" but
// "adding them changes NOTHING". Same Yeas, four extra no-side acts across all
// three flavours the clerk records, and every field the reader sees comes back
// identical — including the tier, which is the one an abstention could only ever
// inflate.
section("2 · abstentions cannot promote a tier");
{
  const bare = read(seed(MIN_JUDGED, []));
  const withNone = read(seed(MIN_JUDGED, ["not_voting", "present", "absent", "excused"]));
  must(bare.row && withNone.row, "the promotion fixture produced no row");
  ["tier", "tone", "weight", "patLabel", "counts", "judged"].forEach((f) => {
    eq(withNone.row[f], bare.row[f],
      `adding abstentions changed the row's ${f} — a no-side act moved a tier`);
  });
  eq(withNone.row.pat.advances, bare.row.pat.advances,
    "an abstention incremented `advances`");
  eq(withNone.row.pat.opposes, bare.row.pat.opposes,
    "an abstention incremented `opposes`");
  eq(withNone.row.pat.sideCounts, bare.row.pat.sideCounts,
    "an abstention moved the two-sided tally");
  eq(bare.row.noSide, 0, "a record with no abstentions published a leftover");
  eq(bare.row.noSideCount, "", "a record with no abstentions published a leftover phrase");
  eq(withNone.row.noSide, 4, "the four no-side acts were not all counted as leftovers");
  // …and the inventory DID grow, because they are on file. A change of zero in the
  // counts next to a change of zero in the inventory would mean the acts had been
  // dropped, which is a different bug wearing this test's passing result.
  eq(withNone.row.held - bare.row.held, 4,
    "the abstentions are not in the row's inventory — they were dropped, not declined");
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. THE BRIEF ACCOUNTS FOR THE LEFTOVER
// ═════════════════════════════════════════════════════════════════════════════
section("3 · '4 advanced · 0 against · 1 no side'");
{
  // Schultz's exact shape: deep enough for the two-integer phrase, one abstention.
  const B = read(seed(MIN_JUDGED, ["not_voting"]));
  must(B.row && B.flat, "the deep fixture produced no row");
  const t = txt(briefRow(B.brief));
  has(t, MIN_JUDGED + " advanced · 0 against",
    "the brief row lost the two-integer tally");
  has(t, "1 no side", "the brief row does not account for the abstention");
  eq(B.flat.noSide, 1, "the flattened shape row dropped the leftover count");
  eq(B.flat.noSideCount, "1 no side", "the flattened shape row's phrase is wrong");
  // ONE PHRASE, ONE ORDER. Sides first, leftover last, and the leftover is never
  // spliced into the tally the rest of the product prints.
  ok(t.indexOf(MIN_JUDGED + " advanced · 0 against") < t.indexOf("1 no side"),
    "the leftover printed before the tally");
  lacks(t, "no side · ", "the leftover was spliced ahead of another count");
  // NEVER A SIDE. The leftover may not be summed into either integer anywhere.
  lacks(t, (MIN_JUDGED + 1) + " advanced",
    "the abstention was added to the advanced count");
  // The screen reader hears the same three facts as the eye.
  const say = (/aria-label="([^"]*)"/.exec(briefRow(B.brief)) || [])[1] || "";
  has(say, "1 no side", "the announced row omits the leftover the face prints");
  // A record with nothing to disclose says nothing — no third zero on every chip.
  const C = read(seed(MIN_JUDGED, []));
  lacks(txt(briefRow(C.brief)), "no side",
    "a record with no abstentions still printed a leftover");
  eq(C.flat && C.flat.noSideCount, "", "the phrase is not empty on a clean record");
  ok(typeof probe._recordNoSidePhrase === "function",
    "stance-helpers.js does not publish _recordNoSidePhrase");
  eq(probe._recordNoSidePhrase({ noSide: 2 }), "2 no side",
    "the shared leftover phrase is not the shipped wording");
  eq(probe._recordNoSidePhrase({ noSide: 0 }), "",
    "the shared leftover phrase printed a zero");
  eq(probe._recordNoSidePhrase(null), "",
    "the shared leftover phrase does not fail closed on nothing");
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. THE DOSSIER ROW IS VISIBLY NOT A VOTE
// ═════════════════════════════════════════════════════════════════════════════
section("4 · Yea gets the side chip; the abstention gets a dashed no-side row");
{
  const D = read(seed(3, ["not_voting", "present"]));
  const rows = dosRows(D.dossier);
  eq(rows.length, 5, "the dossier did not list every act on file");
  const yea = dosRowFor(D.dossier, "H.B. 100");
  const dnv = dosRowFor(D.dossier, "H.B. 400");
  const prs = dosRowFor(D.dossier, "H.B. 401");
  must(yea && dnv && prs, "a fixture act did not render its dossier row");

  // The Yea is untouched: side pill, no no-side furniture, polarity paragraph.
  has(yea, "pdxdos-rec-dir", "the Yea row lost its side pill");
  has(txt(yea), "▲ Advances", "the Yea row lost its direction word");
  lacks(yea, "pdxdos-rec-nos", "a Yea was filed as a no-side row");
  has(txt(yea), "Which way it cut", "the Yea row lost its polarity paragraph");

  // The abstention is not.
  has(dnv, "pdxdos-rec-nos", "the abstention row carries no no-side treatment");
  has(dnv, "pdxdos-rec-nosl", "the abstention row carries no first-line label");
  lacks(dnv, "pdxdos-rec-dir", "the abstention row wears a side pill");
  lacks(txt(dnv), "▲ Advances", "the abstention row claims a direction");
  lacks(txt(dnv), "▼ Cuts against", "the abstention row claims a direction");
  lacks(txt(dnv), "Which way it cut",
    "the abstention row still explains which way it cut");
  lacks(txt(dnv), "a Yea counts as",
    "the abstention row still teaches the polarity of a ballot nobody cast");
  // The clerk's own distinction, kept: an absence and a Present are two facts.
  has(txt(dnv), "Did not vote", "the abstention row does not say it was an absence");
  has(txt(prs), "Present", "the Present row does not say it was a Present");
  lacks(txt(prs), "Did not vote", "a recorded Present is labelled as an absence");
  // ONE STATEMENT OF ONE FACT. The label replaces the act phrase it duplicates —
  // on the FACE. The opened body still narrates the absence in a sentence ("What
  // it did: Did not vote on the question …"), which is the body's job.
  // The face is the row's FIRST LINE: the <summary>'s slot row, up to the first
  // "What it did:" explainer, which is a sentence and not a slot.
  const face = (h) => {
    const i = h.indexOf("<summary");
    let j = h.indexOf('<span class="pdxdos-rec-why', i);
    if (j < 0) j = h.indexOf("</summary>", i);
    return i < 0 || j < 0 ? "" : txt(h.slice(i, j));
  };
  must(face(dnv), "the abstention row rendered no summary face");
  eq((face(dnv).match(/Did not vote/g) || []).length, 1,
    "the absence is stated twice on the row face");
  lacks(face(dnv), "Voted", "the abstention row face says the member voted");
  // The label leads the line: a reader scanning the list finds it before the bill.
  ok(dnv.indexOf("pdxdos-rec-nosl") < dnv.indexOf("pdxdos-rec-id"),
    "the no-side label does not lead the row's first line");
  // …and the row is still LISTED and still opens. Muted is not hidden.
  has(dnv, 'data-pdxdos-key="' + KEY + '"', "the abstention row lost its dossier key");
  has(txt(dnv), "H.B. 400", "the abstention row lost the bill it is about");
  // The dashed treatment is in the shipped stylesheet, not invented by this test.
  has(C_SRC, ".pdxdos-rec-nos{", "consistency.js ships no no-side row style");
  has(C_SRC, "border-left:2px dashed", "the no-side row is not dashed");
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. THE TWO SURFACES AGREE ON THE SAME ISSUE
// ═════════════════════════════════════════════════════════════════════════════
// The reported defect was not a wrong number, it was two right numbers that could
// not be reconciled. So the pin is the reconciliation: brief integers === dossier
// judged counts, and the dossier's inventory === judged + leftover.
section("5 · brief integers are the dossier's judged counts");
{
  const E = read(seed(MIN_JUDGED, ["not_voting"]));
  must(E.row && E.split, "the reconciliation fixture produced no read");
  eq(E.split.advances, E.row.pat.advances,
    "the dossier's advancing count is not the brief's advanced count");
  eq(E.split.opposes, E.row.pat.opposes,
    "the dossier's opposing count is not the brief's against count");
  eq(E.split.listed, MIN_JUDGED + 1, "the dossier did not list the abstention");
  eq(E.split.listed - E.split.directional, E.row.noSide,
    "the rows the dossier put on no side are not the count the brief discloses");
  // …in its own bucket. It used to land in `unclear` beside the act whose mapping
  // carries no support meaning at all, and those are not the same fact: one says
  // our file is incomplete, the other says the clerk recorded that they did not
  // vote. The dossier row's dashed frame is drawn from the same predicate, so the
  // header's integer and the rows underneath it cannot come apart.
  eq(E.split.noSide, 1, "the dossier did not bucket the abstention as no-side");
  eq(E.split.unclear, 0,
    "the abstention is still filed as 'no direction mapped' — a claim about our file, not theirs");
  // And the sentence under the list says so in words, without calling it a vote.
  const line = E.W.PDXConsistency.ledger.splitLine(E.split, KEY);
  has(line, MIN_JUDGED + " advance it", "the dossier's sentence lost its judged count");
  has(line, "1 took no side",
    "the dossier's sentence does not account for the abstention");
  lacks(line, "with no direction mapped",
    "the dossier's sentence still describes a recorded absence as an incomplete file");
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. AND NO FLOOR, MAPPING OR DIRECTION-MATCH INPUT MOVED
// ═════════════════════════════════════════════════════════════════════════════
section("6 · the fences");
{
  eq(probe._PDX_RD_MEMBER_FLOOR, 12, "the member coverage floor moved");
  eq(probe._PDX_RD_MIN_JUDGED, 4, "the per-issue judged floor moved");
  eq(probe._PDX_RD_SPLIT_MIN_JUDGED, 6, "the split publication floor moved");
  eq(probe._PDX_RD_SPLIT_MIN_SIDE, 2, "the smaller-side floor moved");
  // The shared two-integer phrase is still two integers and the word between them.
  const phrase = probe._recordSidePhrase;
  eq(phrase({ advances: 3, opposes: 1 }), "3 advanced · 1 against",
    "the shared side phrase changed wording");
  eq(phrase({ advances: 3, opposes: 1, noSide: 9 }), "3 advanced · 1 against",
    "the leftover leaked into the shared side phrase");
  // The leftover is a DISCLOSURE. Nothing in the engine may gate on it: the four
  // decisions an abstention could have inflated are named in the source as reading
  // `judged`, and none of them reads `noSide`.
  const gates = SH_SRC.slice(SH_SRC.indexOf("var tw = out.advances + out.opposes"),
    SH_SRC.indexOf("out.characterised = !!_RD_TOKENS[out.token].characterised"));
  must(gates.length > 200, "the index's gate block could not be located");
  lacks(gates, "noSide", "a tier gate now reads the no-side count");
  lacks(gates, "out.total", "a tier gate now reads the whole inventory");
  // And the brief's leftover is printed, never summed. The count is the numeric
  // field; `noSideCount` is the phrase, and concatenating a phrase into a sentence
  // is not arithmetic, so the fence names the number.
  ok(!/\bnoSide\s*[+\-*/]/.test(WA_SRC.replace(/noSideCount/g, "NSC")),
    "word-action.js does arithmetic on the leftover count");
  ok(!/[+\-*/]\s*x\.noSide\b/.test(WA_SRC.replace(/noSideCount/g, "NSC")),
    "word-action.js folds the leftover count into another number");
  // No percentage anywhere near it.
  ok(!/%/.test(String(A.row.noSideCount)), "the leftover carries a percentage");
  ["mostly", "strongly", "supports", "opposes", "advanced", "against"].forEach((w) => {
    lacks(String(A.row.noSideCount).toLowerCase(), w,
      `the leftover borrowed the direction word "${w}"`);
  });
}

// ── Report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ no-side acts: ${failures.length} of ${passed + failures.length} assertions failed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`\n✓ no-side acts: all ${passed} assertions passed`);
console.log(`   Present / Did not vote / no side: counted, listed, disclosed — never advanced.`);
