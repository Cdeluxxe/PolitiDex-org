#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-dossier-every-act.mjs — the measure list lists every mapped act
// ─────────────────────────────────────────────────────────────────────────────
// THE DEFECT, as a reader met it. Speaker Schultz, 🍎 Invest in Public Schools:
//
//   the brief                 Strongly supports · 4 advanced · 0 against · 1 no side
//   the row's door            "See all 5 mapped votes on this issue →"
//   the dossier's measure list  4 votes listed here · 3 advancing
//                               S.B. 102 · H.B. 497 · S.B. 173 · H.B. 400
//
// H.B. 477 — a Yea, on file, mapped to the issue, counted in the verdict — had no
// row. Nothing on the page said so. Three surfaces printed three different
// integers about the same five acts and a reader who tried to reconcile them
// could only conclude that one of the three was lying, with no way to tell which.
//
// WHY IT WAS DROPPED. The list was not built from the mapped record. It was built
// through _orProofPicks, whose job is to pick the ONE or TWO representative votes
// a profile row's proof line quotes — and which carried a fallback dedupe key made
// of seven OPTIONAL identifier fields (rollcallId, measureId, number, date,
// action, title, position). Two distinct acts that happen to agree on all seven —
// the same bill's House and Senate roll calls on the same question on the same
// day, filed by an ingest that never populated a roll-call id — keyed identically,
// and the second one was discarded. Not filtered, not paginated, not clipped by
// CSS: silently deduplicated against a sibling, by a key built for a collision
// that is not that collision.
//
// THE FIX, and what this harness pins:
//
//   1. EVERY MAPPED ACT IS LISTED. listed === the row's own inventory === the
//      integer the door offers. _orProofPicks dedupes by object identity only,
//      which is the collision it was actually written for: topConsistent and
//      topContradiction are references INTO the array the item list re-derives, so
//      the same vote from both sources is the same object.
//   2. THE HEADER'S INTEGERS ARE THE BRIEF'S INTEGERS. advancing / opposing / no
//      side, from the rows, in the same words the brief uses.
//   3. A DROP CAN NEVER BE SILENT AGAIN. _dosCoverage measures the list against
//      the record's own inventory and the face discloses any shortfall. Pinned by
//      REPRODUCING the defect — dropping one Yea from the roll-up's source — and
//      requiring the surface to say so.
//   4. A NO-SIDE ROW IS A FULL CARD. Dashed frame, leading "Did not vote" pill,
//      bill number + title + session on the face, no side pill, no polarity
//      paragraph.
//
// And the fences: no floor, mapping, weight or Direction Match input moved.
//
//   node scripts/test-dossier-every-act.mjs
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
const C_SRC = R("consistency.js");

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
  console.error(`✗ dossier every act: ${msg}`);
  process.exit(1);
};
const txt = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// ── The fixture: Schultz's shape ─────────────────────────────────────────────
// Four Yeas and one recorded absence on one issue, each on its own measure with
// its own title and sitting, plus filler on other issues so the MEMBER coverage
// floor is cleared by the filler rather than by anything under test here.
const PID = "schumer";
const KEY = "public_schools";
const probe = boot();
must(probe.PDXConsistency && probe.PDXVotingRecord && probe.PDXWordAction,
  "the shipped modules did not publish their globals");
must(probe.ISSUE_MAP && probe.ISSUE_MAP[KEY], `${KEY} is no longer an issue key`);
const NO_POLE = probe._PDX_RD_NO_POLE || {};
must(!NO_POLE[KEY], `${KEY} is now a no-pole key — the fixture needs a polable issue`);
const MEMBER_FLOOR = probe._PDX_RD_MEMBER_FLOOR;
const MIN_JUDGED = probe._PDX_RD_MIN_JUDGED;
must(Number.isInteger(MEMBER_FLOOR) && Number.isInteger(MIN_JUDGED),
  "the published floors are not integers — the fixture cannot be built against them");
const FILLER = Object.keys(probe.ISSUE_MAP)
  .filter((k) => k !== KEY && !/_balance$/.test(k) && !NO_POLE[k]);

const SESSION = "2023GS";
let seq = 0;
// One roll call. `over` overwrites any field, which is how the collision fixture
// in section 3 builds two acts that agree on every field of the retired key.
const vote = (issueKey, position, number, title, over) => {
  seq++;
  return Object.assign({
    kind: "vote", rollcallId: "rc-" + seq, measureId: 1200 + seq,
    number: number || "S. " + (200 + seq),
    title: title || "Measure " + seq,
    date: "2023-0" + ((seq % 9) + 1) + "-14",
    action: "On passage, third reading",
    position: position, isProcedural: false, chamber: "house",
    measureIdent: { session: SESSION },
    source: { url: "https://le.utah.gov/rollcall/" + seq, label: "Utah State Legislature" },
    issues: [{ issueKey: issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
  }, over || {});
};
const BILLS = [
  ["S.B. 102", "Public Education Reporting Amendments"],
  ["H.B. 497", "Public Education Compliance"],
  ["S.B. 173", "Market Informed Compensation for Teachers"],
  ["H.B. 477", "Full-day Kindergarten Amendments"],
];
const ABSENT = ["H.B. 400", "School Absenteeism Amendments"];
function seed(extra) {
  seq = 0;
  const out = BILLS.map(([n, t]) => vote(KEY, "yea", n, t));
  out.push(vote(KEY, "not_voting", ABSENT[0], ABSENT[1]));
  (extra || []).forEach((v) => out.push(v));
  FILLER.slice(0, 2).forEach((k) => {
    for (let j = 0; j < MEMBER_FLOOR; j++) out.push(vote(k, "yea"));
  });
  return out;
}
function read(items) {
  const W = boot();
  W.PDXVotingRecord.noteMember(PID, JSON.parse(JSON.stringify(items)));
  const CS = W.PDXConsistency;
  const ov = CS.officialRecord(PID, KEY);
  const rows = CS.formalPatternIndex.rows(PID) || [];
  return {
    W, CS, ov,
    row: rows.find((x) => x.key === KEY) || null,
    items: CS.dossierItems(PID, KEY, ov) || [],
    cov: CS.dossierCoverage(PID, KEY),
    split: CS.ledger.split(PID, KEY, ov),
    dossier: CS.dossierRecordsHtml(PID, KEY),
    brief: W.PDXWordAction.heroMount(PID, W.CMP_DATA[PID], {}),
  };
}
// Every <details class="pdxdos-rec…"> in the list, sliced whole — the ROWS only.
// The list's own wrapper is `pdxdos-recs`, one letter away, and a prefix match
// would count it as an extra act.
function dosRows(html) {
  const out = [];
  const re = /<details class="pdxdos-rec(?![a-z])[^"]*"/g;
  let m;
  while ((m = re.exec(html))) out.push(html.slice(m.index, html.indexOf("</details>", m.index) + 10));
  return out;
}
const dosRowFor = (html, number) =>
  dosRows(html).find((r) => r.indexOf(">" + number + "<") >= 0) || "";
// The closed face of the list — everything before the first row. `rawHead` keeps
// the markup (the disclosure is identified by its class), `dosHead` is its text.
const rawHead = (html) => {
  const i = html.indexOf('<details class="pdxdos-rec"');
  const j = html.indexOf('<details class="pdxdos-rec ');
  const cut = [i, j].filter((x) => x >= 0).sort((a, b) => a - b)[0];
  return cut >= 0 ? html.slice(0, cut) : html;
};
const dosHead = (html) => txt(rawHead(html));
// The brief's <li> for this issue.
function briefRow(html) {
  const re = /<li class="pdxwa-shape-row"/g;
  let m;
  while ((m = re.exec(html))) {
    const slice = html.slice(m.index, html.indexOf("</li>", m.index) + 5);
    if (slice.indexOf('data-pdxst-dos="' + KEY + '"') >= 0) return slice;
  }
  return "";
}

const A = read(seed());
must(A.row, "the fixture issue produced no formal-index row");
must(A.ov && A.ov.record, "the fixture produced no record read on this issue");

// ═════════════════════════════════════════════════════════════════════════════
// 1. FIVE ACTS ON FILE, FIVE CARDS
// ═════════════════════════════════════════════════════════════════════════════
section("1 · listed === the inventory === the door's integer");
{
  eq(A.ov.record.total, 5, "the record read does not see all five mapped acts");
  eq(A.row.held, 5, "the row's own inventory does not hold all five acts");
  eq(A.items.length, 5, "the dossier's measure list dropped a mapped act");
  eq(A.cov.listed, 5, "the coverage read disagrees with the list it measured");
  eq(A.cov.expected, 5, "the coverage read does not know how many acts are on file");
  eq(A.cov.short, 0, "a complete list is being reported as short");
  // The three integers a reader can compare across three surfaces, pinned equal.
  eq(A.items.length, A.row.held,
    "listed is not the row's held count — the list and the brief disagree on the inventory");
  eq(A.items.length, A.ov.record.total,
    "listed is not the record total — the list and the door disagree on the inventory");
  // And rendered, not merely computed: five <details>, one per act, all named.
  const rows = dosRows(A.dossier);
  eq(rows.length, 5, "the rendered list does not hold one card per mapped act");
  for (const [n, t] of BILLS.concat([ABSENT])) {
    ok(dosRowFor(A.dossier, n), `${n} has no card in the measure list`);
    has(A.dossier, t, `${n}'s title is nowhere on the measure list`);
  }
  // THE MISSING YEA, by name. This is the reported symptom as an assertion.
  const y = dosRowFor(A.dossier, "H.B. 477");
  ok(y, "H.B. 477 — a Yea on file — has no card in the measure list");
  has(txt(y), "Advances", "the listed Yea does not carry its side");
  // The enumeration on the closed face names all five too, so a reader who never
  // opens the list still cannot be shown a shorter set than the one that exists.
  const head = dosHead(A.dossier);
  for (const [n] of BILLS.concat([ABSENT])) {
    has(head, n, `${n} is missing from the closed face's enumeration`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. THE HEADER PRINTS THE BRIEF'S INTEGERS
// ═════════════════════════════════════════════════════════════════════════════
section("2 · 4 advancing · 1 no side · 5 listed — on both surfaces");
{
  eq(A.split.listed, 5, "the split did not count every listed card");
  eq(A.split.advances, 4, "the split lost a Yea");
  eq(A.split.opposes, 0, "the split invented an opposing act");
  eq(A.split.noSide, 1, "the split did not bucket the absence as no-side");
  eq(A.split.unclear, 0,
    "the absence is still filed as 'no direction mapped' — the clerk recorded it perfectly well");
  eq(A.split.held, 0, "the fixture holds nothing unscorable");
  eq(A.split.directional, 4, "the directional denominator is not the two sides");
  eq(A.CS.ledger.splitSay(A.split), "4 advancing · 1 no side",
    "the chip-length split does not carry all three integers");

  const head = dosHead(A.dossier);
  has(head, "5 votes listed here", "the closed face does not lead with the row count");
  has(head, "4 advancing", "the closed face does not carry the advancing count");
  has(head, "1 no side", "the closed face does not account for the act that took no side");
  lacks(head, "3 advancing", "the closed face is still short an advancing act");
  lacks(head, "4 votes listed here", "the closed face is still short a card");

  // …and they are the SAME integers the brief prints, on the same issue.
  eq(A.row.pat.advances, A.split.advances, "the brief's advanced count is not the list's");
  eq(A.row.pat.opposes, A.split.opposes, "the brief's against count is not the list's");
  eq(A.row.noSide, A.split.noSide, "the brief's leftover is not the list's");
  const br = briefRow(A.brief);
  must(br, "the fixture's issue row did not render in the brief");
  const brt = txt(br);
  has(brt, "4 advanced", "the brief's tally lost a Yea");
  has(brt, "0 against", "the brief's tally invented an opposing act");
  has(brt, "1 no side", "the brief does not disclose the leftover");
  // The sentence form accounts for the leftover in words, without calling it a vote.
  const line = A.CS.ledger.splitLine(A.split, KEY);
  has(line, "4 advance it", "the sentence lost the judged count");
  has(line, "1 took no side", "the sentence does not account for the absence");
  lacks(line, "1 with no direction mapped",
    "the sentence still describes a recorded absence as an incomplete file");
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. THE DROP, REPRODUCED — AND NOW LOUD
// ═════════════════════════════════════════════════════════════════════════════
// The reported failure was not the missing row on its own. It was the missing row
// with every other surface still counting it, and nothing anywhere saying a card
// had been removed. So the pin is the defect itself: take one Yea out of the
// roll-up's source, leave the record summary alone — which is exactly the shape
// the two readers were in — and require the face to say so.
section("3 · a short list says it is short");
{
  const W = boot();
  W.PDXVotingRecord.noteMember(PID, JSON.parse(JSON.stringify(seed())));
  const CS = W.PDXConsistency;
  const full = CS.dossierItems(PID, KEY, CS.officialRecord(PID, KEY)) || [];
  eq(full.length, 5, "the unpatched fixture is not the five-act one");
  // Drop H.B. 477 from the ITEM reader only. _pdxRecordIssueSummary is untouched,
  // so the record still counts five and the door still offers five — the exact
  // divergence the reader met.
  const inner = W._pdxRecordIssueItems;
  W._pdxRecordIssueItems = function (pid, issueKey) {
    const out = inner(pid, issueKey);
    if (!out || issueKey !== KEY) return out;
    return out.filter((it) => String(it.number || "") !== "H.B. 477");
  };
  const ov = CS.officialRecord(PID, KEY);
  eq(ov.record.total, 5, "the record summary was disturbed — the fixture no longer diverges");
  const cov = CS.dossierCoverage(PID, KEY);
  eq(cov.listed, 4, "the drop did not take effect");
  eq(cov.expected, 5, "the coverage read did not notice the record holds five");
  eq(cov.short, 1, "a dropped card is still being reported as a complete list");
  const html = CS.dossierRecordsHtml(PID, KEY);
  has(rawHead(html), "pdxdos-gap-short",
    "a list one card short of its own record renders no disclosure — the drop is still silent");
  has(dosHead(html), "5 votes on this issue are on file and 4 of them are listed here",
    "the disclosure does not name both integers");
  lacks(dosHead(html), "Nothing has been dropped",
    "the load-state wording is being used for a list that is genuinely short");
  // And the disclosure is not on by default — a complete list stays quiet.
  lacks(rawHead(A.dossier), "pdxdos-gap-short",
    "a complete list renders the shortfall warning");
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. TWO ACTS THAT AGREE ON EVERY FIELD OF THE RETIRED KEY ARE STILL TWO
// ═════════════════════════════════════════════════════════════════════════════
// The same measure, the same question, the same day, the same ballot, no roll-call
// id — one act in the House and one in the Senate. Under the seven-field key these
// were one row and the summary went on counting two.
section("4 · the field-key collision no longer eats a card");
{
  const twin = (chamber) => vote(KEY, "yea", "", "Education Base Budget", {
    rollcallId: "", measureId: "", number: "", date: "2023-02-09",
    action: "On passage, third reading", chamber: chamber, rollNumber: chamber === "house" ? 41 : 88,
  });
  const B = read(seed([twin("house"), twin("senate")]));
  must(B.ov && B.ov.record, "the collision fixture produced no record read");
  eq(B.ov.record.total, 7, "the record summary does not count both sibling acts");
  eq(B.items.length, 7, "the measure list collapsed two distinct acts into one card");
  eq(B.cov.short, 0, "the collision fixture reports a shortfall it does not have");
  eq(dosRows(B.dossier).length, 7, "the rendered list is short a card");
  // …and the key that did it is gone from the source, not merely widened again.
  const pick = C_SRC.slice(C_SRC.indexOf("function _orProofPicks"));
  const body = pick.slice(0, pick.indexOf("\n  }\n"));
  lacks(body, "it.rollcallId ||",
    "_orProofPicks still builds a dedupe key out of optional identifier fields");
  lacks(body, "seen[k]", "_orProofPicks still dedupes by field key rather than by identity");
  has(body, "pushed.indexOf(item)", "_orProofPicks no longer dedupes by object identity");
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. THE NO-SIDE CARD IS A FULL CARD
// ═════════════════════════════════════════════════════════════════════════════
section("5 · H.B. 400 is a whole card, not a footnote");
{
  const card = dosRowFor(A.dossier, "H.B. 400");
  must(card, "the absence has no card in the measure list");
  has(card, "pdxdos-rec-nos", "the absence card carries no dashed no-side treatment");
  has(card, '<span class="pdxdos-rec-nosl">Did not vote</span>',
    "the absence card has no leading 'Did not vote' pill");
  // Number, title and sitting — all three on the face, none of them inside the row.
  const ct = txt(card);
  has(ct, "H.B. 400", "the absence card does not name the bill");
  has(ct, ABSENT[1], "the absence card does not name what the bill was");
  has(ct, SESSION, "the absence card does not say which sitting the bill belongs to");
  has(ct, "Did not vote", "the absence card does not say the ballot was not cast");
  // The pill leads: it is the row's standing, and a reader scanning five cards for
  // the one that is not a vote must find it without reading any of them.
  ok(card.indexOf("pdxdos-rec-nosl") < card.indexOf("pdxdos-rec-id"),
    "the 'Did not vote' pill does not lead the card");
  // No side pill, and no lesson about the polarity of a ballot nobody cast.
  lacks(card, "pdxdos-rec-dir", "the absence card wears a side pill");
  lacks(ct, "▲ Advances", "the absence card is marked as advancing the issue");
  lacks(ct, "Which way it cut", "the absence card still teaches the polarity of an uncast ballot");
  lacks(ct, "counts as support for the issue",
    "the absence card still explains what a Yea here would have meant");
  // A cast ballot keeps all of it, so the change is about no-side rows only.
  const yea = dosRowFor(A.dossier, "H.B. 477");
  const yt = txt(yea);
  lacks(yea, "pdxdos-rec-nos", "a cast Yea is being treated as a no-side row");
  has(yea, "pdxdos-rec-dir", "the cast Yea lost its side pill");
  has(yt, "Which way it cut", "the cast Yea lost its polarity paragraph");
  has(yt, BILLS[3][1], "the cast Yea does not name what the bill was");
  has(yt, SESSION, "the cast Yea does not say which sitting the bill belongs to");
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. THE FENCES
// ═════════════════════════════════════════════════════════════════════════════
section("6 · no floor, mapping or Direction Match input moved");
{
  eq(probe._PDX_RD_MEMBER_FLOOR, 12, "the member coverage floor moved");
  eq(probe._PDX_RD_MIN_JUDGED, 4, "the per-issue judged floor moved");
  eq(probe._PDX_RD_SPLIT_MIN_JUDGED, 6, "the split publication floor moved");
  eq(probe._PDX_RD_SPLIT_MIN_SIDE, 2, "the smaller-side floor moved");
  eq(probe._PDX_RD_DOMINANCE, 0.75, "the dominance threshold moved");
  // The no-side count is disclosed, never arithmetic: it may not be added to,
  // subtracted from or multiplied into any side count anywhere in the split.
  const led = C_SRC.slice(C_SRC.indexOf("function _ledSplit"));
  const lbody = led.slice(0, led.indexOf("function _ledSplitLine"));
  ok(!/noSide\s*[+\-*/]\s*[a-z0-9]/i.test(lbody.replace(/noSide\+\+/g, "NSI")),
    "the no-side count is being combined arithmetically with a side count");
  ok(/s\.directional = s\.advances \+ s\.opposes;/.test(lbody),
    "the directional denominator is no longer the two judged sides alone");
  // The list is not capped. A truncated enumeration is the same hiding problem.
  const recs = C_SRC.slice(C_SRC.indexOf("function _dosRecordsHtml"));
  const rbody = recs.slice(0, recs.indexOf("\n  }\n"));
  lacks(rbody, "items.slice(", "the measure list caps the rows it renders");
  // The rows used to be written by an inline items.map() here. They are emitted by
  // _dosRowsHtml now, because the no-side cards sort after the judged sides behind
  // a divider line and a sort has to hold the whole set before the first row is
  // written. The contract has not changed — every item on file renders, none is
  // capped — so it is checked in the two places the set now passes through.
  has(rbody, "_dosRowsHtml(ord", "the measure list no longer hands its rows to _dosRowsHtml");
  has(rbody, "ord.rows.map(function (p)",
    "the enumeration no longer reads the same ordered set the rows are drawn from");
  const ordf = C_SRC.slice(C_SRC.indexOf("function _dosOrder"));
  const obody = ordf.slice(0, ordf.indexOf("\n  }\n"));
  lacks(obody, ".slice(", "the row ordering caps the set it hands on");
  has(obody, "sided.concat(nos)",
    "_dosOrder no longer returns both of its buckets — a no-side card would be sorted\n" +
    "    out of the list entirely, which is the hiding problem in a new place");
  const rowsf = C_SRC.slice(C_SRC.indexOf("function _dosRowsHtml"));
  const rowsb = rowsf.slice(0, rowsf.indexOf("\n  }\n"));
  has(rowsb, "i < ord.rows.length",
    "the row writer no longer walks the whole ordered set");
  lacks(rowsb, ".slice(", "the row writer caps the rows it emits");
}

console.log("");
if (failures.length) {
  console.error(`✗ dossier every act — ${failures.length} failed of ${passed + failures.length}`);
  for (const f of failures) console.error(`   · ${f}`);
  process.exit(1);
}
console.log(`✓ dossier every act — ${passed} assertions`);
