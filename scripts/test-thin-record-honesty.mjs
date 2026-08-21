#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-thin-record-honesty.mjs — whose gap is it, said on the row face
// ─────────────────────────────────────────────────────────────────────────────
// Four fifths of the issue rows this product renders are unscored, and the great
// majority of those are unscored for a reason that has nothing to do with the
// politician: we hold their votes, mapped and sourced, and we hold no stated
// position of theirs on that issue to test them against. The row face said
// "Thin record — There is a record here, but none of it takes a clear side on
// this claim", which is a sentence about THEM, and false twice over: there is no
// claim, and the votes take sides all day. The reader was being handed our
// documentation gap dressed as a shrug about their record.
//
// The rules this pins:
//
//   1. THE CLASSIFICATION IS HONEST. rowResult separates "we hold no stated
//      position" from "the record really is thin", and the no-position sentence
//      is never printed over a row that has a position on file.
//   2. THE INVENTORY IS SHOWN, NOT A SCORE. A no-position row states how many
//      instruments are on file, in the office's own noun, and stays unscored:
//      no percentage, no verdict promoted, no change to what the score counts.
//   3. THE COUNT IS THE DOOR. The same row carries a control into the issue
//      dossier, asking it to land on the formal enumeration — the destination
//      already existed, the invitation did not.
//   4. A TRULY THIN ROW IS UNTOUCHED. A row with a stated position and one
//      judged vote keeps its own reason and is never told it has no position.
//   5. A ROW NEVER DENIES A RECORD IT HOLDS. The mirror-image case: a stated
//      position IS on file, the formal record IS on file, and nothing joined
//      them — so the row fell to `limited` and printed the same false sentence
//      over a record that ran one way nine times out of nine. It now states what
//      the record did, in the index's own words, and says the row is not scored.
//
//   node scripts/test-thin-record-honesty.mjs
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

const win = makeSandbox();
const sandbox = vm.createContext(win);
win.PROFILES = win.CMP_DATA;
for (const f of FILES) vm.runInContext(R(f), sandbox, { filename: f });
win.PROFILES = win.CMP_DATA;

// A second realm, on demand. Section 8 needs a member the shipped data gives a
// directionless stated position to, which massie has none of, and it needs the
// same member twice — once with the record-direction index live and once with it
// removed — to prove Direction Match cannot see the difference.
const SRC = FILES.map((f) => [f, R(f)]);
function boot() {
  const w = makeSandbox();
  const sb = vm.createContext(w);
  w.PROFILES = w.CMP_DATA;
  for (const [f, src] of SRC) vm.runInContext(src, sb, { filename: f });
  w.PROFILES = w.CMP_DATA;
  return w;
}

const CS = win.PDXConsistency;
const WA = win.PDXWordAction;

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

const PID = "massie";

// ── Which issues does this member have a position on file for, and which not ──
// Both cases have to be REAL rows off the real row model, so the keys are chosen
// from what the profile actually carries rather than asserted.
const stanceKeys = new Set(
  CS.issueRows(PID).filter((r) => r.said).map((r) => r.key)
);
const ISSUE_KEYS = Object.keys(win.ISSUE_MAP || {});
const SILENT = ISSUE_KEYS.filter((k) => !stanceKeys.has(k))[0];
const SPOKEN = ISSUE_KEYS.filter((k) => stanceKeys.has(k))[0];
if (!SILENT || !SPOKEN) {
  console.error("✗ thin-record honesty: the fixture profile no longer offers both cases");
  process.exit(1);
}

// ── Seeds ────────────────────────────────────────────────────────────────────
// SILENT: a deep formal record — six sourced roll calls, mapped, no position of
// theirs on file. This is the shape 8,000-odd live rows are in.
// SPOKEN: a position we DO hold, and a record that genuinely takes no side on it —
// two votes cast "present", which is the other thing `limited` means. This is the
// row the old sentence was written for, and the one it must keep.
const vote = (n, issueKey, position) => ({
  kind: "vote", rollcallId: 500 + n, measureId: 900 + n, number: "H.R. " + (100 + n),
  date: "2025-0" + ((n % 9) + 1) + "-14", action: "On Passage", position: position,
  isProcedural: false, title: "Measure " + n,
  source: { url: "https://www.congress.gov/roll-call-vote/" + (500 + n), label: "Congress.gov" },
  issues: [{ issueKey: issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
});
const HELD = 6;
const seeded = [];
for (let i = 0; i < HELD; i++) seeded.push(vote(i, SILENT, i % 2 ? "nay" : "yea"));
seeded.push(vote(90, SPOKEN, "present"));
seeded.push(vote(91, SPOKEN, "present"));
win.PDXVotingRecord.noteMember(PID, seeded);

const rows = CS.issueRows(PID);
const rowOf = (k) => rows.filter((r) => r.key === k)[0];
const silent = rowOf(SILENT), spoken = rowOf(SPOKEN);
ok(!!silent && !!spoken, "fixture: both rows are in the row model");

// One chunk per rendered row, keyed by issue.
const html = CS.stancesSectionHtml(PID);
const chunks = {};
for (const chunk of html.split(/<div class="pdxst-row["\s]/).slice(1)) {
  const k = (chunk.match(/data-pdxst-issue="([^"]*)"/) || [])[1];
  if (k) chunks[k] = chunk;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the classification separates our gap from their record");
// ═════════════════════════════════════════════════════════════════════════════
{
  const res = CS.rowResult(silent);
  eq(silent.said, false, "the seeded row genuinely has no stated position on file");
  eq(res.shape, "no_stance", "a row with instruments and no position is classified as ours to fix");
  eq(res.held, silent.evidence.actions, "the inventory count is the row's own count, not a second one");
  ok(res.held >= HELD, "every seeded instrument is counted on the face");
  has(res.why, "no stated position from them yet",
    "the reason names the missing position rather than shrugging at the record");
  has(res.why, res.held + " ", "the reason leads with what we actually hold");
  lacks(res.why, "takes a clear side",
    "the old sentence — a claim about their record that was never true here — is gone");

  // …and the other direction: a row we DO hold a position for must never be told
  // it has none. This is the false-negative that would make the new copy a lie.
  const sres = CS.rowResult(spoken);
  eq(spoken.said, true, "the control row does have a stated position on file");
  ok(sres.shape !== "no_stance", "a row with a position on file is never filed as no-position");
  lacks(sres.why, "no stated position", "…and never told the reader it has none");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · inventory on the face, and no score anywhere near it");
// ═════════════════════════════════════════════════════════════════════════════
{
  const chunk = chunks[SILENT] || "";
  ok(!!chunk, "the no-position row is rendered");
  has(chunk, "on file", "the row states the inventory it holds");
  has(chunk, "no stated position from them yet", "…and why that inventory is not a result");
  lacks(chunk, "takes a clear side on this claim", "…without blaming the record for our gap");

  // THE ROW STAYS UNSCORED. Three ways a number could leak onto it, all closed.
  const res = CS.rowResult(silent);
  eq(res.pct, null, "the result carries no percentage");
  eq(res.state, "thin", "the row's state is unchanged — this pass moved copy, not scoring");
  eq(silent.tested, false, "the row is still not a tested row");
  eq(silent.verdict.score, null, "the verdict still holds no score");
  ok(!/class="pdxst-pct"[^>]*>\s*\d+%/.test(chunk), "no percentage is printed on the row");
  has(chunk, "pdxst-pct-na", "the result slot stays explicitly empty");
  // The count is inventory, in the office's own noun, and never a rate.
  ok(/\d+ votes on file/.test(chunk), "the count is stated as votes on file");
  lacks(chunk, "% on file", "the count is never dressed as a match rate");

  // THE WORD IS NOT A VERDICT EITHER. The issue index's coverage noun names a pile
  // this row is not in, and printing it here says the record fell short when what
  // fell short is our documentation. The label states the actual fact. Both the
  // retired noun and the shipped one are refused, so neither can come back by way
  // of this face.
  eq(res.label, "Not scored yet", "the verdict word says what is true — the row is unscored");
  lacks(chunk, "Thin record", "…and never borrows the index's retired name for a thin record");
  lacks(chunk, "Not enough on file", "…and never borrows the index's coverage noun either");
  eq(res.bucket, null, "the row claims no place in the issue index's buckets");
  // The empty slot is read aloud on its own, so it carries the distinction too.
  const slot = (chunk.match(/<span class="pdxst-pct pdxst-pct-na"[^>]*>/) || [])[0] || "";
  has(slot, "no stated position to score the record against",
    "the empty result slot names our gap rather than their record");
  lacks(slot, "not enough record", "…and does not tell a screen reader the record is short");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the count is a door, and it lands on the enumeration");
// ═════════════════════════════════════════════════════════════════════════════
{
  const chunk = chunks[SILENT] || "";
  const why = (chunk.match(/<div class="pdxst-why">[\s\S]*?<\/div>/) || [])[0] || "";
  has(why, "pdxst-why-go", "the reason line carries a control");
  has(why, 'data-pdxst-dos="' + SILENT + '"', "…aimed at this issue's dossier");
  has(why, 'data-pdxst-pid="' + PID + '"', "…for this politician");
  has(why, 'data-pdxst-focus="record"', "…asking it to land on the formal list, not the top");
  has(why, "see the votes", "…and inviting the reader in the row's own noun");
  // ONE DOOR, ONE NAME. The dossier is reachable from four places and is read
  // aloud identically in all of them; a fifth entrance with its own name would be
  // a second destination as far as a screen-reader user is concerned.
  const aria = (why.match(/aria-label="([^"]*)"/) || [])[1] || "";
  has(aria, "Open the issue dossier: " + silent.label,
    "the control shares the dossier's one accessible name");

  // The destination is real: the formal enumeration exists, is addressable, and
  // lists what the face promised.
  const recs = CS.dossierRecordsHtml(PID, SILENT);
  has(recs, "data-pdxgap-record=", "the dossier's formal list is addressable");
  const items = CS.dossierItems(PID, SILENT) || [];
  eq(items.length, silent.evidence.actions,
    "the list opens onto exactly the number the row face advertised");

  // A row with nothing to show is never given the invitation.
  const sres = CS.rowResult(spoken);
  ok(!sres.invite || sres.shape === "no_stance",
    "the invitation is only ever attached to a row that holds instruments");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · a truly thin row keeps its own reason");
// ═════════════════════════════════════════════════════════════════════════════
{
  const chunk = chunks[SPOKEN] || "";
  ok(!!chunk, "the control row is rendered");
  const sres = CS.rowResult(spoken);
  // The control is only a control if it is actually in the thin state — a vacuous
  // `if` here would let the copy rule rot without a failure.
  eq(sres.state, "thin", "the control row is genuinely too thin to judge");
  lacks(chunk, "no stated position from them yet",
    "a row we hold a position for is never given the no-position copy");
  ok(/(takes a clear side on this claim|takes a side on this one|is not enough to judge this one yet|Not enough record to judge this one yet)/.test(chunk),
    "…and still says, in its own terms, why it has no result");
  lacks(chunk, "pdxst-why-go", "…and offers no inventory door it cannot honour");
  // …and keeps the word and the aria it earned. The honest-word change above is
  // scoped to the no-position shape; a row that really is thin is still thin, and
  // renaming it would trade one inaccuracy for another.
  eq(sres.shape, "thin", "the control row is classified as genuinely thin");
  lacks(chunk, "Not scored yet", "a genuinely thin row does not borrow the no-position word");
  const cslot = (chunk.match(/<span class="pdxst-pct pdxst-pct-na"[^>]*>/) || [])[0] || "";
  has(cslot, "not enough record", "…and its empty slot still reads as a thin record");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the issue index never had this row to mis-word");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The two faces read the same rowResult, so a change in the classification
  // reaches both. They do not hold the same rows: ⚖️ Word vs Action is an index of
  // word-versus-action findings, and outcomeBuckets() admits no wordless row into
  // its "Not enough on file" pile (the `!r.stance.label` guard). That is why the false
  // sentence only ever appeared on the stance face — and why the index's own
  // "Stated, but nothing on file yet can test it" subtitle is true of every row it
  // actually shows. Pinned here so a later change to that guard cannot quietly
  // push 8,000 wordless rows into a bucket whose subtitle says they stated a
  // position.
  const idx = WA.headlineHtml(PID, win.PROFILES[PID]) || "";
  ok(!!idx, "the issue index renders");
  lacks(idx, 'data-pdxwa-issue="' + SILENT + '"',
    "a row with no stated position is not filed as a word-versus-action result");
  const guard = R("word-action.js");
  ok(/!r\.stance\.label && r\.verdict\.token === 'limited'/.test(guard),
    "the index still refuses wordless rows, which is what keeps its bucket subtitle true");
  has((WA.outcomeFor("limited") || {}).sub || "", "Stated, but",
    "…and the subtitle still describes the rows it does hold");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the score path is untouched");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Every tested row still reports its number, and no unscored row acquired one.
  let tested = 0;
  for (const r of CS.issueRows(PID)) {
    const res = CS.rowResult(r);
    if (r.tested) {
      tested++;
      eq(typeof res.pct, "number", `${r.key}: a tested row still prints its result`);
      eq(res.metric, r.verdict.basis === "public_record" ? "Public-record match" : "Direction match",
        `${r.key}: the metric name still follows the lane that produced it`);
    } else {
      eq(res.pct, null, `${r.key}: an unscored row acquired a percentage`);
    }
  }
  const tally = CS.verdictTally ? CS.verdictTally(PID) : null;
  ok(!tally || typeof tally === "object", "the tally still answers");
  console.log(`    ${tested} tested row(s) · ${CS.issueRows(PID).length} rows in the model`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the dossier behind the door tells the same story");
// ═════════════════════════════════════════════════════════════════════════════
{
  // L1 reprints the row's reason, so it inherits the fix — but it also writes two
  // sentences of its own about the lane and the score, and both used to assert a
  // decision this row never reached.
  const l1 = CS.dossierSummaryHtml(PID, SILENT, silent) || "";
  has(l1, "no stated position from them yet", "the summary carries the row's reason");
  lacks(l1, "Decided by the formal record",
    "…and does not claim a decision on a row that reached none");
  has(l1, "would be decided by the formal record",
    "…naming the lane that would decide it instead");
  lacks(l1, "too thin to divide",
    "…and does not tell the reader their record was too thin");
  has(l1, "no stated position here to test",
    "…saying instead why the pooled figure did not move");
  lacks(l1, "Thin record", "…and never prints the index's retired word for a thin record");
  lacks(l1, "Not enough on file", "…nor the coverage noun that replaced it");

  // The control keeps every sentence it had.
  const cl1 = CS.dossierSummaryHtml(PID, SPOKEN, spoken) || "";
  has(cl1, "Decided by the formal record", "a decided lane still says so");
  has(cl1, "too thin to divide", "…and a genuinely thin row keeps its own score line");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · a row never denies a record it holds");
// ═════════════════════════════════════════════════════════════════════════════
// THE MIRROR-IMAGE CASE. Section 1 covers the row we hold no position for.
// This is the row we hold BOTH halves for and joined neither: a stated position
// with no direction in it — "mixed", the shape the shipped stance data gives 479
// rows — so ⚖️ Direction Match correctly declines to score it and _stSplit()
// returns nothing. That silence used to be printed as a claim about the record:
// "There is a record here, but none of it takes a clear side on this claim",
// over nine roll calls that every one of them advanced the issue.
//
// Nothing here re-opens the score. The row is still `limited`, still unscored,
// still carries no percentage; only the sentence explaining the empty slot
// changed, and it changed to something the index had already computed.
const DPID = "schumer";
const dwin = boot();
// The control realm: identical bytes, identical seed, index removed at the
// derivation — `_pdxRecordDirection` fails closed without it, so this is the
// product exactly as it stood before the index existed.
const cwin = boot();
cwin._recordDirectionIndex = undefined;
{
  const DCS = dwin.PDXConsistency, CCS = cwin.PDXConsistency;
  // The key is chosen off the real row model: a stated position with no
  // direction, on an issue that HAS a support pole (a "…Balance" key names a
  // subject, not a direction, and the index rightly refuses to characterise
  // one). If the shipped data ever stops offering that combination the fixture
  // vacates loudly rather than passing on an empty case.
  const cand = DCS.issueRows(DPID).filter(
    (r) => r.said && r.stance && r.stance.direction === 0 && !/_balance$/.test(r.key)
  )[0];
  // A second issue this member DOES state a direction on, seeded alongside: it
  // lifts the profile over the index's member-coverage floor and gives the
  // comparison below some genuinely scored rows to protect.
  const scoredCand = DCS.issueRows(DPID).filter(
    (r) => r.said && r.stance && r.stance.direction !== 0 && !/_balance$/.test(r.key)
  )[0];
  ok(!!cand, `${DPID} still carries a stated position with no direction in it`);
  ok(!!scoredCand, `…alongside one it does state a direction on`);
  if (!cand || !scoredCand) {
    console.error("✗ thin-record honesty: the held-record fixture no longer exists");
    process.exit(1);
  }
  const DKEY = cand.key;
  const HELD9 = 9;
  const dvote = (n, k, pos) => ({
    kind: "vote", rollcallId: 700 + n, measureId: 950 + n, number: "S. " + (200 + n),
    date: "2025-0" + ((n % 9) + 1) + "-11", action: "On Passage", position: pos,
    isProcedural: false, title: "Measure " + n,
    source: { url: "https://www.congress.gov/roll-call-vote/" + (700 + n), label: "Congress.gov" },
    issues: [{ issueKey: k, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
  });
  const dseed = [];
  for (let i = 0; i < HELD9; i++) dseed.push(dvote(i, DKEY, "yea"));
  for (let i = 0; i < 12; i++) dseed.push(dvote(300 + i, scoredCand.key, "yea"));
  dwin.PDXVotingRecord.noteMember(DPID, dseed.map((v) => JSON.parse(JSON.stringify(v))));
  cwin.PDXVotingRecord.noteMember(DPID, dseed.map((v) => JSON.parse(JSON.stringify(v))));

  const held = DCS.issueRows(DPID).filter((r) => r.key === DKEY)[0];
  const res = DCS.rowResult(held);

  // ── The fixture is the real shape, not a convenient one ────────────────────
  eq(held.said, true, "the held row does have a stated position on file");
  eq(held.verdict.token, "limited", "…and Direction Match still declines to score it");
  eq(res.state, "thin", "…so the row is in the unscored state this section is about");
  ok((held.evidence.actions || 0) >= HELD9, "…over a record that is genuinely on file");
  const dir = dwin._pdxRecordDirection(DPID, DKEY, { noun: { one: "vote", many: "votes" } });
  eq(dir.token, "record_direction", "the index characterises the record as one-way");
  eq(dir.advances, HELD9, "…counting every one of the seeded votes on the advancing side");
  eq(dir.opposes, 0, "…and none on the other");

  // ── The false sentence is gone, and what replaced it is the index's ────────
  eq(res.shape, "unjudged", "the row is classified as held-but-unjudged, not as thin");
  lacks(res.why, "none of it takes a clear side",
    "the sentence denying a record that ran one way nine times is gone");
  lacks(res.why, "takes a side on this one", "…and its empty-record variant is not borrowed either");
  has(res.why, HELD9 + " votes on file", "the face leads with the inventory it holds");
  has(res.why, dir.clause, "…then states what that record did, in the index's own words");
  has(res.why, "isn’t scored", "…and says outright that this row is not scored");
  has(res.why, "judged against their stated position",
    "…naming the gap as the reason, which is where the gap actually is");

  // ── It is still not a score, and still not a stance ────────────────────────
  eq(res.pct, null, "no percentage reaches the row");
  eq(held.tested, false, "the row is still not a tested row");
  eq(held.verdict.score, null, "the verdict still holds no score");
  eq(res.metric, "Direction match", "the metric name is unchanged");
  ok(!/%/.test(res.why), "and no percentage is smuggled into the sentence");
  for (const bad of ["Backed up", "Contradicted", "Mixed record", "Broke", "Kept"]) {
    lacks(res.why, bad, `the row earns no verdict word — "${bad}" is not printed`);
  }
  ok(!/\bthey (support|oppose)\b|supports this|opposes this|in favour|against the position/i.test(res.why),
    "…and never turns votes into a position they hold");
  ok(!/Democrat|Republican|party|caucus/i.test(res.why), "…and never reaches for party");

  // ── The rendered surfaces agree with the face ──────────────────────────────
  const dhtml = DCS.stancesSectionHtml(DPID) || "";
  const dchunks = {};
  for (const chunk of dhtml.split(/<div class="pdxst-row["\s]/).slice(1)) {
    const k = (chunk.match(/data-pdxst-issue="([^"]*)"/) || [])[1];
    if (k) dchunks[k] = chunk;
  }
  const dchunk = dchunks[DKEY] || "";
  ok(!!dchunk, "the held row is rendered");
  has(dchunk, "votes on file", "the rendered row states the inventory");
  lacks(dchunk, "none of it takes a clear side", "…and not the sentence it replaced");
  ok(!/class="pdxst-pct"[^>]*>\s*\d+%/.test(dchunk), "no percentage is printed on the row");
  const dslot = (dchunk.match(/<span class="pdxst-pct pdxst-pct-na"[^>]*>/) || [])[0] || "";
  lacks(dslot, "not enough record",
    "the empty slot stops telling a screen reader the record is too short");
  has(dslot, "judged against what they said",
    "…and names the real reason the slot is empty");
  lacks(dchunk, "Too thin to judge yet",
    "the group divider stops filing a nine-vote row under thin");
  has(dhtml, "not yet judged against each other",
    "…and gives these rows a heading that is true of them");

  // ── The dossier behind the door says the same thing ────────────────────────
  const dl1 = DCS.dossierSummaryHtml(DPID, DKEY, held) || "";
  has(dl1, "would be decided by the formal record",
    "the dossier names the lane rather than asserting a decision this row never reached");
  lacks(dl1, "too thin to divide",
    "…and does not tell the reader their record was too thin to divide");
  has(dl1, "has been judged against the position they state",
    "…saying instead why the pooled figure did not move");

  // ── Direction Match cannot see any of it ───────────────────────────────────
  const dRows = DCS.issueRows(DPID), cRows = CCS.issueRows(DPID);
  eq(dRows.length, cRows.length, "both realms model the same rows");
  eq(JSON.stringify(DCS.officialRecord(DPID)), JSON.stringify(CCS.officialRecord(DPID)),
    "Direction Match is byte-identical with the index live");
  eq(JSON.stringify(DCS.sayVsDo(DPID)), JSON.stringify(CCS.sayVsDo(DPID)),
    "…and so is the public lane");
  eq(JSON.stringify(DCS.verdictTally(DPID)), JSON.stringify(CCS.verdictTally(DPID)),
    "…and the verdict tally");
  const cByKey = {};
  cRows.forEach((r) => { cByKey[r.key] = r; });
  let scored9 = 0, changed9 = 0;
  for (const a of dRows) {
    const b = cByKey[a.key];
    if (!b) { ok(false, `${a.key}: the row exists in both realms`); continue; }
    const ra = DCS.rowResult(a), rb = CCS.rowResult(b);
    eq(a.verdict.token, b.verdict.token, `${a.key}: the verdict token is unchanged`);
    eq(a.verdict.score, b.verdict.score, `${a.key}: the verdict score is unchanged`);
    eq(a.tested, b.tested, `${a.key}: testedness is unchanged`);
    eq(a.tier, b.tier, `${a.key}: the row's tier is unchanged`);
    eq(ra.pct, rb.pct, `${a.key}: the percentage is unchanged`);
    eq(ra.state, rb.state, `${a.key}: the result state is unchanged`);
    eq(ra.label, rb.label, `${a.key}: the verdict word is unchanged`);
    eq(ra.metric, rb.metric, `${a.key}: the metric name is unchanged`);
    eq(ra.held, rb.held, `${a.key}: the inventory count is unchanged`);
    if (ra.state === "tested") {
      scored9++;
      eq(ra.why, rb.why, `${a.key}: a scored row's reason line is untouched`);
      ok(ra.shape === "tested", `${a.key}: a scored row keeps the tested shape`);
    }
    if (ra.why !== rb.why) changed9++;
  }
  ok(scored9 > 0, "the fixture actually scores something for the comparison to protect");
  ok(changed9 > 0, "…and the two realms really do differ, so none of the above passed vacuously");

  // ── A truly thin row still gains no direction language ─────────────────────
  // Same member, same key, same directionless stance, same coverage — one vote
  // instead of nine. The index has nothing to characterise at that depth, so the
  // row keeps the sentence that is true of it and gains no clause.
  const twin = boot();
  {
    const tseed = [dvote(80, DKEY, "yea")];
    for (let i = 0; i < 12; i++) tseed.push(dvote(300 + i, scoredCand.key, "yea"));
    twin.PDXVotingRecord.noteMember(DPID, tseed);
    const trow = twin.PDXConsistency.issueRows(DPID).filter((r) => r.key === DKEY)[0];
    const tres = twin.PDXConsistency.rowResult(trow);
    const tdir = twin._pdxRecordDirection(DPID, DKEY, { noun: { one: "vote", many: "votes" } });
    eq(tdir.token, "record_thin", "one vote characterises nothing, member coverage or not");
    eq(tdir.clause, "", "…and offers the row no clause to print");
    eq(tres.state, "thin", "the one-vote control is genuinely in the unscored state");
    eq(tres.shape, "thin", "…and is still classified as thin, not as held-but-unjudged");
    has(tres.why, "takes a clear side",
      "…keeping the sentence that is true of a record this short");
    ok(!/advanced it|cut against it|ran both ways/.test(tres.why),
      "…and inventing no direction out of one vote");
    eq(tres.pct, null, "…and still carrying no percentage");
  }
}

if (failures.length) {  console.error(`\n✗ thin-record honesty: ${failures.length} failure(s)`);
  for (const f of failures) console.error("  · " + f);
  process.exit(1);
}
console.log(`\n✓ thin-record honesty: all ${passed} assertions passed — ${HELD} held ${
  silent.lane === "exec" ? "actions" : "votes"} on ${silent.label}, stated as inventory and never as a score`);
