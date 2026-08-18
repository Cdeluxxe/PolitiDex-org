#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-record-direction-rows.mjs — the record pattern, on every row that has one
// ─────────────────────────────────────────────────────────────────────────────
// 🧭 Stances & Connections is the list a reader moves through a profile with:
// one row per tracked issue, each row a door into that issue's dossier. The
// record-direction index shipped onto SOME of those rows — the ones with no
// stated position and a characterisable record — and stayed quiet on the rest,
// including rows where it had already computed an answer. Three gaps:
//
//   · A row holding a record the index could characterise, but whose judged
//     handful was too small for Direction Match, printed "Not enough record to
//     judge this one yet." over fourteen votes it had counted.
//   · A row with no stated position said what the record did and that the row
//     is not scored — but never that the direction is not a stance of theirs.
//   · A row where the index LOOKED and declined printed a bare inventory, so
//     "14 votes on file" and "3 votes on file" ended the same way and the
//     reader could not tell which of them we had actually read.
//
// This pins the row grammar that closes them, and pins just as hard what must
// NOT move: the score, the metric, the order of the rows, and every control
// row where the honest answer is still silence.
//
//   node scripts/test-record-direction-rows.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, votes seeded
// the way a completed /api/voting-record fetch leaves the cache. Two realms —
// index live, index removed at the derivation — so "the score cannot see this"
// is a measurement rather than a claim. No database, no network, no browser.

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
  console.error(`✗ record-direction rows: ${msg}`);
  process.exit(2);
};

const PID = "massie";
const SPID = "schumer";
const NOUN = { one: "vote", many: "votes" };

// ── The fixture ──────────────────────────────────────────────────────────────
// Keys come off the real row model, never asserted, so a data change vacates
// the case loudly instead of quietly.
const probe = boot();
const stanceKeys = new Set(
  probe.PDXConsistency.issueRows(PID).filter((r) => r.said).map((r) => r.key)
);
const ISSUE_KEYS = Object.keys(probe.ISSUE_MAP || {});
const SILENT = ISSUE_KEYS.filter((k) => !stanceKeys.has(k) && !/_balance$/.test(k));
const BALANCE = ISSUE_KEYS.filter((k) => !stanceKeys.has(k) && /_balance$/.test(k))[0];
const SPOKEN = ISSUE_KEYS.filter((k) => stanceKeys.has(k))[0];
// DEEP: 14 mapped votes, 11 one way — the index speaks, and the row must say so.
// THIN3: three votes, two-to-one — the index LOOKS and declines on depth.
// BALANCE: a subject-named key — the index declines on the ISSUE, which is our
//   gap and not theirs, so the row must stay silent about thinness.
const [DEEP, THIN3] = SILENT;
must(DEEP && THIN3 && BALANCE && SPOKEN,
  "the fixture profile no longer offers a deep, a thin, a balance and a spoken key");

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
const HELD_DEEP = 14, HELD_THIN = 3, HELD_BAL = 4, HELD_SPOKEN = 5;
const SEED = [];
for (let i = 0; i < HELD_DEEP; i++) SEED.push(vote(i, DEEP, i < 11 ? "nay" : "yea"));
SEED.push(vote(30, THIN3, "nay"), vote(31, THIN3, "nay"), vote(32, THIN3, "yea"));
for (let i = 0; i < HELD_BAL; i++) SEED.push(vote(70 + i, BALANCE, "nay"));
// A stated position WITH a record that tests it: Direction Match's row, and the
// one row on this list the index must keep its mouth shut on.
for (let i = 0; i < HELD_SPOKEN; i++) SEED.push(vote(80 + i, SPOKEN, "yea"));

// The second member: a stated position with no direction in it, over a record
// that ran one way nine times. Direction Match rightly declines to score it and
// the row states both halves without joining them — the `unjudged` shape.
const sprobe = probe.PDXConsistency.issueRows(SPID);
const sCand = sprobe.filter(
  (r) => r.said && r.stance && r.stance.direction === 0 && !/_balance$/.test(r.key)
)[0];
const sScored = sprobe.filter(
  (r) => r.said && r.stance && r.stance.direction !== 0 && !/_balance$/.test(r.key)
)[0];
must(sCand && sScored,
  `${SPID} no longer carries a directionless stated position alongside a directional one`);
const SKEY = sCand.key, SHELD = 9;
const SSEED = [];
for (let i = 0; i < SHELD; i++) SSEED.push(vote(200 + i, SKEY, "yea"));
for (let i = 0; i < 12; i++) SSEED.push(vote(300 + i, sScored.key, "yea"));

// Realm A: shipped. Realm B: identical seeds, the index removed at the
// derivation — `_pdxRecordDirection` fails closed without it, so B is exactly
// this list as it stood before any of this existed.
const A = boot(), B = boot();
B._recordDirectionIndex = undefined;
const clone = (s) => s.map((v) => JSON.parse(JSON.stringify(v)));
for (const w of [A, B]) {
  w.PDXVotingRecord.noteMember(PID, clone(SEED));
  w.PDXVotingRecord.noteMember(SPID, clone(SSEED));
}
const CS = A.PDXConsistency, CSB = B.PDXConsistency;
const rowsA = CS.issueRows(PID), rowsB = CSB.issueRows(PID);
const rowOf = (k, rows) => (rows || rowsA).filter((r) => r.key === k)[0];
const dirOf = (pid, k, label) =>
  A._pdxRecordDirection(pid, k, { noun: NOUN, label: label || "" });

// The rendered row, sliced out of the real section markup.
const chunkOf = (html, k) => {
  for (const c of String(html).split(/<div class="pdxst-row["\s]/).slice(1)) {
    if ((c.match(/data-pdxst-issue="([^"]*)"/) || [])[1] === k) return c;
  }
  return "";
};
const orderOf = (html) =>
  (String(html).match(/data-pdxst-issue="[^"]*"/g) || []).join(",");
const htmlA = CS.stancesSectionHtml(PID), htmlB = CSB.stancesSectionHtml(PID);
const shtmlA = CS.stancesSectionHtml(SPID);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the fixture is the real shape, and it is the shape this pass is about");
// ═════════════════════════════════════════════════════════════════════════════
{
  const deep = rowOf(DEEP), thin = rowOf(THIN3), bal = rowOf(BALANCE), spoke = rowOf(SPOKEN);
  must(deep && thin && bal && spoke, "the seeded rows are missing from the row model");
  eq(deep.said, false, "the deep row genuinely has no stated position on file");
  eq(CS.rowResult(deep).held, HELD_DEEP, "…over a record that is genuinely on file");
  eq(dirOf(PID, DEEP, deep.label).token, "record_direction",
    "…and the index characterises that record");
  eq(dirOf(PID, THIN3, thin.label).token, "record_thin",
    "the thin row is one the index looked at and declined on depth");
  eq(dirOf(PID, THIN3, thin.label).suppressed, null,
    "…on depth, not because of the issue vocabulary");
  eq(dirOf(PID, BALANCE, bal.label).suppressed, "balance_key",
    "the balance row is one the index declined on the ISSUE, not on their record");
  eq(spoke.tested, true, "the spoken row is scored, which is the case that must not move");
  const held = rowOf(SKEY, CSB.issueRows(SPID)) && rowOf(SKEY, CS.issueRows(SPID));
  must(held, `${SPID}'s held row is missing from the row model`);
  eq(held.said, true, "the held row does carry a stated position");
  eq(held.verdict.token, "limited", "…which Direction Match still declines to score");
  eq(CS.rowResult(held).shape, "unjudged", "…leaving the stated-and-held shape this pins");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · nothing here reaches the score, the order or the metric");
// ═════════════════════════════════════════════════════════════════════════════
{
  // THE WALL THIS PASS IS MOST EASILY ACCUSED OF BREACHING. Every scored
  // quantity on every row of both members, with the index live and with it
  // gone: identical. The rendered markup differs, so the comparison is not
  // vacuous — that difference is the entire deliverable.
  for (const pid of [PID, SPID]) {
    const ra = CS.issueRows(pid), rb = CSB.issueRows(pid);
    eq(ra.length, rb.length, `${pid}: both realms model the same number of rows`);
    const byKeyB = {};
    rb.forEach((r) => { byKeyB[r.key] = r; });
    let scored = 0;
    for (const a of ra) {
      const b = byKeyB[a.key];
      must(b, `${pid}/${a.key}: the row vanished when the index was removed`);
      const qa = CS.rowResult(a), qb = CSB.rowResult(b);
      eq(JSON.stringify({
        tested: a.tested, token: a.verdict.token, score: a.verdict.score,
        basis: a.verdict.basis, tier: a.tier,
        state: qa.state, pct: qa.pct, metric: qa.metric,
      }), JSON.stringify({
        tested: b.tested, token: b.verdict.token, score: b.verdict.score,
        basis: b.verdict.basis, tier: b.tier,
        state: qb.state, pct: qb.pct, metric: qb.metric,
      }), `${pid}/${a.key}: a scored quantity moved when the index was switched on`);
      if (a.tested) {
        scored++;
        eq(qa.why, qb.why, `${pid}/${a.key}: a scored row's reason line changed`);
        ok(!qa.dir, `${pid}/${a.key}: a scored row is Direction Match's row and gets no record line`);
      }
    }
    must(scored > 0, `${pid}: no scored rows in the fixture — the equality above proves nothing`);
    eq(JSON.stringify(CS.verdictTally(pid)), JSON.stringify(CSB.verdictTally(pid)),
      `${pid}: the verdict tally moved`);
  }
  // NEVER A RANK KEY AND NEVER A FILTER KEY. The shared ranking contract —
  // rankIssueRows(), which every surface on the profile sorts by — is byte-identical
  // with the index live and with it gone. That is the invariant this pair protects:
  // the index cannot promote a row past another row anywhere a rank is read.
  for (const pid of [PID, SPID]) {
    eq(CS.rankIssueRows(CS.issueRows(pid)).map((r) => r.key).join(","),
       CSB.rankIssueRows(CSB.issueRows(pid)).map((r) => r.key).join(","),
      `${pid}: the shared row ranking moved when the index was switched on`);
  }
  // In the RENDERED list it is a presentation order, inside one group and no further.
  // "On the formal record — no stated position yet" paints the rows the index can
  // characterise before the ones it cannot, which is the point of the group; so the
  // assertion is not that no row moves but that no row moves ACROSS A HEADING — the
  // groups appear in the same order, holding the same rows, in both realms.
  const groupsOf = (html) => {
    const out = [];
    for (const seg of String(html).split(/<div class="pdxst-grp-h">/).slice(1)) {
      const label = (seg.match(/^([^<]*)</) || [])[1] || "";
      out.push([label, (seg.split(/<div class="pdxst-grp-h">/)[0]
        .match(/data-pdxst-issue="[^"]*"/g) || []).slice().sort().join(",")]);
    }
    return JSON.stringify(out);
  };
  eq(groupsOf(htmlA), groupsOf(htmlB),
    "a row changed which group heading it renders under when the index was switched on");
  eq((htmlA.match(/data-pdxst-issue=/g) || []).length,
     (htmlB.match(/data-pdxst-issue=/g) || []).length,
    "…and no row is added or filtered out by it");
  ok(htmlA !== htmlB, "…while the markup does differ, so this section measures something");
  ok(htmlA.length > htmlB.length, "…and differs by saying more, not less");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · wherever the index can speak, the row it belongs to says so");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The requirement, swept rather than sampled: no unscored row in this list
  // holds a printable record direction that the row itself fails to print.
  let spoke = 0;
  for (const pid of [PID, SPID]) {
    const html = (pid === PID) ? htmlA : shtmlA;
    for (const r of CS.issueRows(pid)) {
      const res = CS.rowResult(r);
      const d = dirOf(pid, r.key, r.label);
      if (!d || !d.clause) continue;
      if (r.tested) {                       // Direction Match's row: silence is the rule
        ok(!res.dir, `${pid}/${r.key}: a scored row printed a record direction`);
        continue;
      }
      if (!res.dir) {
        // The one sanctioned silence on an unscored row: the judged handful came
        // from the public lane, and two lanes may not share one sentence.
        eq(r.verdict.basis, "public_record",
          `${pid}/${r.key}: the index can speak here and the row stays silent`);
        continue;
      }
      spoke++;
      has(res.why, d.clause,
        `${pid}/${r.key}: the row's reason line omits the clause the index produced`);
      const chunk = chunkOf(html, r.key);
      must(chunk, `${pid}/${r.key}: the row does not render`);
      has(chunk, "pdxst-why", `${pid}/${r.key}: the record line has nowhere to render`);
      // Still a door into the issue dossier, which is how this list is read.
      has(chunk, "pdxst-open", `${pid}/${r.key}: the row stopped being tappable`);
      has(chunk, `data-pdxst-dos="${r.key}"`,
        `${pid}/${r.key}: the row no longer opens its own issue dossier`);
      // Still not a score, on the face or in the slot.
      eq(res.pct, null, `${pid}/${r.key}: a record-direction row acquired a percentage`);
      ok(!/%/.test(res.why), `${pid}/${r.key}: a percentage leaked into the record line`);
      has(chunk, "pdxst-pct-na", `${pid}/${r.key}: the result slot is no longer explicitly empty`);
    }
  }
  must(spoke >= 2, `only ${spoke} row(s) exercised the sweep — the fixture went quiet`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · a row with no stated position: the record, and the whole disclosure");
// ═════════════════════════════════════════════════════════════════════════════
{
  const deep = rowOf(DEEP), res = CS.rowResult(deep);
  const d = dirOf(PID, DEEP, deep.label);
  eq(res.shape, "no_stance", "the row is classified as held-with-nothing-stated");
  eq(res.label, "Not scored yet", "…and its word is about our coverage, not their conduct");
  // The four parts the requirement names, in the order the row prints them.
  has(res.why, HELD_DEEP + " votes on file", "1: the inventory it holds, stated first");
  has(res.why, d.clause, "2: what the formal record did, in the index's own words");
  has(res.why, "no stated position from them yet", "3: no stated position on file");
  has(res.why, "not a stated stance", "4: and the direction is not a stance of theirs");
  has(res.why, "isn’t scored", "…and the row says outright that it is not scored");
  ok(res.why.indexOf(String(HELD_DEEP)) < res.why.indexOf(d.clause),
    "the count is the sentence's subject, not an afterthought");
  // The disclosure is the one the compare cells and the share cards use, so a
  // reader meets the same sentence wherever this finding surfaces.
  const NOTE = CS.recordDirection && CS.recordDirection.NOTE;
  must(typeof NOTE === "string" && NOTE, "the shared record-direction disclosure is unreachable");
  for (const part of ["what the record itself did", "not a stated stance"]) {
    has(NOTE, part, `the shared disclosure still says "${part}"`);
    has(res.why, part, `…and the row says it too, rather than inventing its own words`);
  }
  // The count is the door, and it lands on the record enumeration.
  const chunk = chunkOf(htmlA, DEEP);
  has(chunk, "pdxst-why-go", "the row offers the way to check the count it printed");
  has(chunk, 'data-pdxst-focus="record"', "…landing on the record itself");
  // The tooltip and the aria-label carry the same disclosure, with the issue
  // named — a screen-reader user lands here with no heading in earshot.
  const tip = (chunk.match(/class="pdxst-result[^"]*" title="([^"]*)"/) || [])[1] || "";
  has(tip, "recorded votes on", "the tooltip names the issue and the count");
  has(tip, "not a stated stance", "…and carries the disclosure too");
  lacks(tip, "%", "…and no percentage");
  const slot = (chunk.match(/pdxst-pct-na" aria-label="([^"]*)"/) || [])[1] || "";
  has(slot, "no stated position", "the empty result slot says why it is empty");
  // …and it never authors a stance, a verdict or a party frame.
  for (const bad of ["Backed up", "Contradicted", "Mixed record", "Broke", "Kept"]) {
    lacks(res.why, bad, `no verdict word on a record-direction row — "${bad}"`);
  }
  ok(!/\bthey (support|oppose)\b|supports this|opposes this|their position\b/i.test(res.why),
    "…and never turns the record into a position they hold");
  ok(!/Democrat|Republican|\bparty\b|caucus/i.test(res.why), "…and never reaches for party");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · a row with a stated position keeps it — scored, or stated-and-untested");
// ═════════════════════════════════════════════════════════════════════════════
{
  // (a) Scored: Direction Match owns this row and the index says nothing. The
  // stated position, the percentage and the verdict are all still on the face.
  const spoke = rowOf(SPOKEN), sres = CS.rowResult(spoke);
  eq(sres.state, "tested", "the scored row is still scored");
  eq(typeof sres.pct, "number", "…still carries its percentage");
  eq(sres.metric, "Direction match", "…under its own metric name");
  ok(!sres.dir, "…and no record-direction line competes with it");
  eq(dirOf(PID, SPOKEN, spoke.label).token, "record_direction",
    "…even though the index would have had plenty to say");
  const schunk = chunkOf(htmlA, SPOKEN);
  // BYTE-IDENTICAL EXCEPT THE PATTERN CHIP. Slice 2 added one chip to the top line
  // of every row with a formal record, this one included — see _stPatternHtml. It
  // is not a reason line, not a result and not a stance: strip it and the scored
  // row is character-for-character what it was before the index existed, which is
  // the wall this case has always been about. The chip's own walls are pinned in
  // test-record-pattern-tiers.mjs.
  const noChip = (h) => h.replace(/<span class="pdxst-pat [^]*?<\/span><\/span>/, "");
  eq(noChip(schunk), chunkOf(htmlB, SPOKEN),
    "the scored row renders byte-identically to before, but for the pattern chip");
  has(schunk, "pdxst-pat", "…which is on it, because the record has a pattern");
  has(schunk, "pdxor-stance", "…with its stated position still on the row");
  ok(schunk.indexOf("pdxst-pat") < schunk.indexOf("pdxor-stance"),
    "…the record's pattern first, their stated word after it");
  ok(!sres.dir, "…and still no record-direction REASON LINE competing with the score");

  // (b) Stated, on the record, never judged against each other: the position
  // stays, and the record now speaks beside it instead of being denied.
  const held = rowOf(SKEY, CS.issueRows(SPID)), hres = CS.rowResult(held);
  const hd = dirOf(SPID, SKEY, held.label);
  eq(hres.shape, "unjudged", "the stated-and-held row keeps its own shape");
  has(hres.why, SHELD + " votes on file", "…leads with the record it holds");
  has(hres.why, hd.clause, "…states what that record did");
  has(hres.why, "judged against their stated position", "…and names the gap as the gap");
  eq(hres.pct, null, "…with no percentage");
  const hchunk = chunkOf(shtmlA, SKEY);
  has(hchunk, "pdxor-stance", "the stated position is still on the row");
  has(hchunk, "pdxst-open", "…and the row still opens the issue dossier");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · where the index declined: which declines are about their record");
// ═════════════════════════════════════════════════════════════════════════════
{
  // A record too short to characterise IS a fact about their record, so the row
  // says so in the index's own words — a reader can now tell "we read it and it
  // is too thin" apart from "we have not read it".
  const thin = rowOf(THIN3), tres = CS.rowResult(thin);
  const tlabel = A._PDX_RD_TOKENS.record_thin.label;
  has(tres.why, HELD_THIN + " votes on file", "the thin row still states its inventory");
  has(tres.why, tlabel.charAt(0).toLowerCase() + tlabel.slice(1),
    "…and says the index read it and could not characterise it");
  has(tres.why, "no stated position from them yet", "…and still says why it is unscored");
  lacks(tres.why, "advanced it", "…without manufacturing a direction");
  lacks(tres.why, "cut against it", "…in either direction");
  lacks(tres.why, "ran both ways", "…or a split it never established");
  ok(!/%/.test(tres.why), "…and no percentage");

  // A decline about the ISSUE is our gap, not theirs. "Too thin to characterise"
  // over a subject-named key would be a claim about their record that we have
  // not established, so the row stays exactly as it was.
  const bal = rowOf(BALANCE), bres = CS.rowResult(bal);
  has(bres.why, HELD_BAL + " votes on file", "the balance row states its inventory");
  lacks(bres.why, tlabel.charAt(0).toLowerCase() + tlabel.slice(1),
    "…and never blames their record for a gap in our issue vocabulary");
  eq(bres.why, CSB.rowResult(rowOf(BALANCE, rowsB)).why,
    "…so that row's sentence is byte-identical to the pre-index product");
  // The row's OWN markup, with the group scaffolding around it removed: a silent row
  // sits in a different position inside its group in the two realms (see section 2),
  // so a raw chunk comparison would be measuring which lid follows it rather than
  // what it renders.
  const rowMarkupOf = (html, k) =>
    chunkOf(html, k).split(/<!--PDXSP:|<div class="pdxst-grp/)[0].replace(/(<\/div>)+$/, "");
  eq(rowMarkupOf(htmlA, BALANCE), rowMarkupOf(htmlB, BALANCE),
    "…and so is its markup");

  // The empty control: a stated position, nothing formal on file. Nothing to
  // say, and the row says nothing — identical to before, both realms.
  const empty = rowsA.filter((r) => (CS.rowResult(r).held === 0) && r.verdict.token === "no_record")[0];
  must(empty, "the fixture no longer offers a row with no record at all");
  const eres = CS.rowResult(empty);
  eq(eres.shape, "no_record", "the empty control is still the empty shape");
  eq(eres.why, CSB.rowResult(rowOf(empty.key, rowsB)).why,
    "…with the sentence it always had");
  lacks(eres.why, "on file —", "…and no clause bolted onto an empty record");
  lacks(eres.why, "too thin", "…and no complaint about a record that does not exist");
  eq(chunkOf(htmlA, empty.key), chunkOf(htmlB, empty.key), "…rendering byte-identically");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · a record only partly judged states which part");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The row this pass adds a shape for: a deep record the index characterised,
  // a stated position, and a judged handful too small for Direction Match. The
  // shipped sentence was "Not enough record to judge this one yet." — a claim
  // about the whole record when the shortfall is in the judged subset alone.
  //
  // Built as a model row rather than seeded: the combination needs the say-vs-do
  // lane to judge strictly fewer items than the index counts, which the fixture
  // cannot be made to do by adding votes. _stSaid documents hand-built rows as a
  // supported shape, and every field below is copied from the live model.
  const deep = rowOf(DEEP);
  const mk = (basis, extra) => Object.assign({
    pid: PID, key: DEEP, label: deep.label, lane: "legis", said: true,
    stance: { label: "Protect public lands", text: "They said so", direction: 1 },
    verdict: { token: "limited", label: "Thin record", score: null, basis: basis,
               ico: "◦", color: "#9fb4d4", cls: "limited" },
    evidence: { actions: HELD_DEEP, total: HELD_DEEP, strength: "strong" },
    tested: false,
  }, extra);
  const pres = CS.rowResult(mk("action", { ov: { record: { consistent: 1, contradicts: 1 } } }));
  const d = dirOf(PID, DEEP, deep.label);
  eq(pres.shape, "part_judged", "the partly-judged row gets its own shape");
  eq(pres.state, "thin", "…still unscored");
  eq(pres.pct, null, "…still no percentage");
  eq(pres.label, "Not scored yet",
    "…and its word agrees with the fourteen votes on the line below it");
  has(pres.why, HELD_DEEP + " votes on file", "the row states the record it holds");
  has(pres.why, d.clause, "…what that record did");
  has(pres.why, "only 2 votes", "…and how much of it was actually judged");
  has(pres.why, "judged against their stated position", "…against what");
  has(pres.why, "not enough to score this row yet", "…and that this is why there is no score");
  lacks(pres.why, "Not enough record to judge this one yet",
    "the sentence that denied the record it holds is gone");
  ok(!/%/.test(pres.why), "…and no percentage");
  ok(!!pres.invite, "the count it printed is a door, like every other count on this list");

  // NO PUBLIC-LANE BLENDING. Same row, judged handful from the public record:
  // one sentence may not hold a formal count and a public count. That row keeps
  // the old wording, and the index stays out of it.
  const qres = CS.rowResult(mk("public_record", { public: { supporting: 1, contradicting: 1 } }));
  eq(qres.shape, "thin", "a public-basis split is not given the formal record's sentence");
  ok(!qres.dir, "…and carries no record-direction line at all");
  lacks(qres.why, d.clause, "…so no formal clause appears beside a public count");
  eq(qres.metric, "Public-record match", "…and the lane still names itself");

  // The rendered surfaces know the shape too: its own empty-slot reason, its own
  // tooltip, and its own divider — not the thin row's, which would be false here.
  const cons = R("consistency.js");
  has(cons, "res.shape === 'part_judged'",
    "the result renderer branches on the new shape rather than falling through to thin");
  has(cons, "shp === 'part_judged'",
    "…and so does the group divider in the stance list");
  has(cons, "too little of this record has been judged",
    "…with an empty-slot reason that is true of this row");
  has(cons, "only part of it judged against what they said",
    "…and a divider that does not call it thin");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the walls, read off the rendered list");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const [pid, html] of [[PID, htmlA], [SPID, shtmlA]]) {
    for (const r of CS.issueRows(pid)) {
      const res = CS.rowResult(r);
      if (!res.dir) continue;
      const chunk = chunkOf(html, r.key);
      ok(!/class="pdxst-pct"[^>]*>\s*\d+%/.test(chunk),
        `${pid}/${r.key}: a record-direction row prints a percentage`);
      ok(!/Democrat|Republican|caucus|party line/i.test(chunk),
        `${pid}/${r.key}: a record-direction row reaches for party`);
      // The vocabulary stays the index's own effect language.
      ok(/advanced it|cut against it|ran both ways/.test(chunk),
        `${pid}/${r.key}: the row's record line is not in record vocabulary`);
    }
  }
  // The two populations that share the `limited` token each name themselves, so a
  // reader is never handed "Too thin to judge yet" over a row that just stated
  // fourteen votes and what they did. The held-with-nothing-stated rows now say it
  // in a GROUP HEADING of their own rather than in a divider inside the tested
  // group — same sentence, one level up, and outside the "backs it up" fold.
  has(htmlA, "On the formal record — no stated position yet",
    "the held-with-nothing-stated group names itself");
  ok(new RegExp('pdxst-grp-h">On the formal record — no stated position yet · \\d+<')
    .test(htmlA), "…as a counted heading, not as a divider inside another group");
  has(shtmlA, "not yet judged against each other",
    "…and so does the stated-and-held group");
  // Teaching, not a new glossary: the row's vocabulary is the shipped one.
  const learn = R("pdx-learn.js");
  has(learn, "recorddirection", "the record-direction term is still taught");
  ok(!/record[_-]?direction[_-]?row/i.test(learn),
    "…and this pass added no second, row-only vocabulary to teach");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · a record with nothing stated for it is its own group, not a footnote");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The rows this whole file is about resolve to `limited`, which is a verdict, so
  // they landed in ROW_TIER.tested under "Tested — and the record backs it up" —
  // sorted last inside it by _VERDICT_RANK and therefore past the lead cap, behind a
  // fold that promised issues the record backs up. Nothing was tested on them and
  // nothing was backed up. They are a group now. What is pinned here is the group's
  // heading, its count, that a reader meets it without opening anything, that its
  // fold names itself, that the rows the index can characterise come first, and that
  // every row stayed exactly as unscored and as tappable as it was.
  const GRP = "On the formal record — no stated position yet";
  const LEAD_CAP = Number((R("consistency.js").match(/_ST_LEAD_CAP = (\d+)/) || [])[1]);
  must(LEAD_CAP > 0, "_ST_LEAD_CAP is no longer readable from consistency.js");
  // Membership is read off each row's already-resolved result — no stated position,
  // over a formal record that is genuinely on file. Nothing is re-derived here.
  const heldRows = CS.issueRows(PID).filter((r) => {
    const res = CS.rowResult(r);
    return r.tier === 1 && res.shape === "no_stance" && (res.held || 0) > 0;
  });
  must(heldRows.length >= 3,
    "the fixture no longer seeds a group's worth of held-with-nothing-stated rows");
  const segOf = (html, label) => {
    const at = String(html).indexOf('pdxst-grp-h">' + label);
    if (at === -1) return "";
    const rest = String(html).slice(at);
    const next = rest.indexOf('<div class="pdxst-grp-h">', 1);
    return next === -1 ? rest : rest.slice(0, next);
  };
  const seg = segOf(htmlA, GRP);
  must(seg, "the group is missing from the rendered list");
  eq((seg.match(/data-pdxst-issue="/g) || []).length, heldRows.length,
    "the group does not hold exactly the rows that belong to it");
  has(seg, GRP + " · " + heldRows.length, "the heading does not count its own rows");
  // NOT UNDER A SCORED HEADING. The tested group keeps the rows a verdict tested.
  const backed = segOf(htmlA, "Tested — and the record backs it up");
  ok(!heldRows.some((r) => backed.includes('data-pdxst-issue="' + r.key + '"')),
    "a row with a formal record and nothing stated renders under the backs-it-up heading");
  // MET, NOT SOUGHT. Everything outside every lid is what a reader sees with nothing
  // opened — this group, at this size, has to be entirely in there.
  const unfold = (html) => String(html).replace(/<!--PDXSP:lid[\s\S]*?<!--PDXSP:\/lid-->/g, "");
  const visible = unfold(htmlA);
  eq((segOf(visible, GRP).match(/data-pdxst-issue="/g) || []).length,
     Math.min(heldRows.length, LEAD_CAP),
    "the group's lead is not the first " + LEAD_CAP + " of its rows");
  has(visible, GRP, "the group heading itself is inside a fold");
  // STRONGEST FIRST. A row the index characterised must never render below one it
  // could not speak on — that ordering is the difference between a group a reader
  // learns something from and a list of blanks with the findings at the bottom.
  const order = [...seg.matchAll(/data-pdxst-issue="([^"]*)"/g)].map((m) => m[1]);
  let silentSeen = false, inverted = 0;
  for (const k of order) {
    if (CS.rowResult(rowOf(k)).dir) { if (silentSeen) inverted++; } else silentSeen = true;
  }
  eq(inverted, 0, "a row the index cannot characterise renders above one it can");
  ok(order.some((k) => CS.rowResult(rowOf(k)).dir) &&
     order.some((k) => !CS.rowResult(rowOf(k)).dir),
    "the group holds only one kind of row — the ordering above proves nothing");
  // AND NOTHING ABOUT THE ROWS THEMSELVES MOVED: unscored, no percentage, still a
  // door into the same dossier, still saying what the record did where it can.
  for (const k of order) {
    const r = rowOf(k), res = CS.rowResult(r), chunk = chunkOf(htmlA, k);
    ok(typeof res.pct !== "number", `${k}: a row in the unscored group carries a percentage`);
    ok(res.state !== "tested", `${k}: a row in the unscored group resolved as scored`);
    eq(r.tested, false, `${k}: the move made a row testable`);
    ok(!/class="pdxst-pct"[^>]*>\s*\d+%/.test(chunk), `${k}: the group prints a percentage`);
    has(chunk, 'data-pdxst-dos="' + k + '"', `${k}: the row is no longer a door into its dossier`);
    has(chunk, res.held + " " + (res.held === 1 ? NOUN.one : NOUN.many) + " on file",
      `${k}: the row stopped stating the record it holds`);
    if (res.dir) {
      ok(/advanced it|cut against it|ran both ways/.test(chunk),
        `${k}: the row lost its record-direction line in the move`);
    }
  }
  // ── THE FOLD, on a member with more of this than a lead can hold ────────────
  // The shipped case is bigger than this fixture: a sitting senator's list runs to
  // fifty-odd of these rows, so the group folds past its lead exactly as the tested
  // group does. What must not survive the fold is the label — "Show 52 more issues
  // the record backs up" over rows nothing was tested on is the sentence this pass
  // exists to delete. A third realm, seeded wide, so the label is measured and not
  // read off the source.
  const WIDE = SILENT.slice(2, 2 + LEAD_CAP + 4);
  must(WIDE.length === LEAD_CAP + 4, "the fixture no longer offers enough silent keys");
  const WSEED = [];
  WIDE.forEach((k, n) => {
    for (let i = 0; i < 4; i++) WSEED.push(vote(400 + n * 10 + i, k, "yea"));
  });
  const C = boot();
  C.PDXVotingRecord.noteMember(PID, clone(WSEED));
  const CSC = C.PDXConsistency, htmlC = CSC.stancesSectionHtml(PID);
  const wideHeld = CSC.issueRows(PID).filter((r) => {
    const res = CSC.rowResult(r);
    return r.tier === 1 && res.shape === "no_stance" && (res.held || 0) > 0;
  });
  must(wideHeld.length > LEAD_CAP + 1, "the wide realm did not seed past the lead cap");
  has(htmlC, GRP + " · " + wideHeld.length, "the group heading does not count its own rows");
  eq((segOf(unfold(htmlC), GRP).match(/data-pdxst-issue="/g) || []).length, LEAD_CAP,
    "the group's lead is not capped like every other open group");
  const fold = (htmlC.match(/id="st-open-held" label="([^"]*)"/) || [])[1] || "";
  must(fold, "the rows past the group's lead do not fold");
  has(fold, "no stated position", "the fold over the group does not say what it holds");
  lacks(fold, "backs up", "the fold over the group promises issues the record backs up");
  has(fold, String(wideHeld.length - LEAD_CAP), "…or does not count what it holds");
  // The tested group's own fold keeps its own sentence, unchanged.
  const tfold = (htmlC.match(/id="st-open-tested" label="([^"]*)"/) || [])[1] || "";
  if (tfold) has(tfold, "the record backs up", "the tested group's fold lost its label");
}

// ── Result ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ record-direction rows: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.error(`  ✖ ${f}`);
  process.exit(1);
}
console.log(`✔ record-direction rows: ${passed} checks passed — every row that holds a ` +
  `characterisable record states it, and the score, the order and the honest silences are untouched`);
