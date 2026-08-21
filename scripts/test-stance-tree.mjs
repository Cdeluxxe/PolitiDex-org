#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-stance-tree.mjs — 🌳 the topic tree of stances
// ─────────────────────────────────────────────────────────────────────────────
// The profile's browse-all-stances surface, and a PRESENTATION surface only. It
// replaced a flat, ungrouped, uncoloured index of stated positions with a tree
// that puts what someone SAID beside what their formal RECORD did. That means it
// prints stance vocabulary twice on one line, and once for a fact that is not a
// stance at all. Everything below is the fence that makes that safe:
//
//   1. THE GROUPING MAP IS THE SHIPPED ONE. Thirteen core national issues in
//      their declared order, plus exactly one explicit trailing node for the
//      keys that belong to no core issue. No leaf is filed under a topic the
//      shared reverse lookup disagrees with.
//   2. EVERY LEAF STATE IS REACHABLE AND CORRECTLY WORDED. Four Said faces, four
//      Record slot states (scored / direction / on-file / none), four alignment
//      cues — and the cue appears ONLY where both halves of the line exist. ONE
//      mapped formal item is already a record: the Record slot is never blank on
//      an issue that has one, it prints the depth it is drawn from, and a
//      one-item record says out loud that it is an early signal.
//   3. PATTERN-ONLY ROWS ARE DISCLOSED THREE WAYS. Their own visible tag, the
//      full three-denial sentence in the accessible name, and a distinct skin.
//      An issue with neither a stated position nor a formal item is not a row.
//   4. BROAD NODES CARRY NO SCORE AND NO GRADE. A branch face may DESCRIBE what
//      is under it — counts of rows, in the bands' own lower-case words, adding up
//      to the count beside them — and it still carries no percentage, no ratio, no
//      tier word and no verdict word of the kind a leaf prints for a person. A
//      percentage appears ONLY on a leaf whose issue Direction Match already
//      scored — never on a branch, never on a pattern-only row, never computed here.
//   5. THE LEAF IS THE EXISTING DOOR. One openGap(), the same dossier every other
//      surface opens, no tree-only detail view.
//   6. COLOURS COME FROM PDXIssueColors. Same issue, same colour as everywhere
//      else; an unmapped issue takes the neutral fallback rather than borrowing.
//   7. MOBILE OPENS ONE BRANCH AT A TIME, and the rule is asserted as a rule.
//   8. IT IS NOT A SCORE. Direction Match, the verdict tally, every row verdict
//      and the position map are byte-identical with the whole module unloaded.
//   9. TENSION ORDER IS A SORT KEY AND NOTHING ELSE. Six bands, said-vs-record
//      disagreement first, depth breaking ties only INSIDE a band, and a
//      pattern-only row never ordered above a real said-plus-record tension. No
//      band is printed, published or turned into a figure, and the branch ORDER
//      stays the taxonomy's on every profile.
//  10. FILTERS ARE VIEWS. One active at a time, each one hiding rows and touching
//      nothing else: same leaf markup, same counts object, same scores, same
//      pattern-only disclosures. An empty view says so in words.
//  11. FLAT MODE UNDER THE THRESHOLD. One constant decides it, a handful of leaves
//      renders as one flat list in tension order with no accordions, and both
//      sides of the boundary are asserted on real profiles.
//
//   node scripts/test-stance-tree.mjs
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

// stance-tree.js is LAST, and B omits it — that is the byte-identical proof.
const BASE = [
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
  "issue-colors.js",
  "consistency.js",
  "voting-record.js",
  "word-action.js",
  "profile-spine.js",
];
const TREE = "stance-tree.js";
const SRC = new Map([...BASE, TREE].map((f) => [f, R(f)]));
function boot(withTree) {
  const win = makeSandbox();
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of BASE) vm.runInContext(SRC.get(f), sandbox, { filename: f });
  if (withTree) vm.runInContext(SRC.get(TREE), sandbox, { filename: TREE });
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
  console.error(`✗ stance tree: ${msg}`);
  process.exit(2);
};

// ── The fixture ──────────────────────────────────────────────────────────────
// KHANNA is the profile the brief names: real stated positions across support,
// oppose and mixed, and enough tracked issues to fill several topics. The record
// side is seeded, because a node sandbox never runs the /api/voting-record fetch
// and every pattern read would otherwise be cold.
const PID = "khanna";

const probe = boot(true);
must(!!probe.PDXStanceTree, "the module did not publish window.PDXStanceTree");
const stanceOf = {};
probe.PDXConsistency.issueRows(PID).forEach((r) => {
  if (r.stance && r.stance.key) stanceOf[r.key] = r.stance.key;
});
const ISSUE_KEYS = Object.keys(probe.ISSUE_MAP || {});
const SILENT = ISSUE_KEYS.filter((k) => !stanceOf[k] && !/_balance$/.test(k));
// Stated issues, picked by the direction we need to set the record against.
const SAID_SUPPORT = Object.keys(stanceOf).filter((k) => stanceOf[k] === "support");
const SAID_OPPOSE = Object.keys(stanceOf).filter((k) => stanceOf[k] === "oppose");
const SAID_MIXED = Object.keys(stanceOf).filter((k) => stanceOf[k] === "mixed");
must(SAID_SUPPORT.length >= 3, "the fixture no longer offers three supported issues");
must(SAID_OPPOSE.length >= 1, "the fixture no longer offers an opposed issue");
must(SAID_MIXED.length >= 1, "the fixture no longer offers a mixed stated position");
must(SILENT.length >= 4, "the fixture no longer offers four issues with nothing stated");

// ALIGNS:   stated Supports + a deep record advancing it
// CUTS:     stated Supports + a deep record against it
// SPLITCUE: stated Supports + a record that ran both ways
// MIXCUE:   stated Mixed    + a deep one-way record (nothing to agree WITH)
// SAIDONLY: stated Opposes  + no record at all
const [ALIGNS, CUTS, SPLITCUE] = SAID_SUPPORT;
const MIXCUE = SAID_MIXED[0];
const SAIDONLY = SAID_OPPOSE.filter((k) => k !== CUTS)[0];
// ONLY_STRONG: nothing stated + a deep uniform record → pattern-only, strong
// ONLY_THIN:   nothing stated + one vote              → pattern-only, thin, quiet
// ONLY_SPLIT:  nothing stated + a deep both-ways record → pattern-only, split
// UNREADABLE:  nothing stated + a record the index declines to characterise
const [ONLY_STRONG, ONLY_THIN, ONLY_SPLIT, UNREADABLE] = SILENT;
must(!!(ALIGNS && CUTS && SPLITCUE && MIXCUE && SAIDONLY),
  "the fixture no longer offers one stated issue per alignment cue");

const vote = (n, issueKey, position, opts) => {
  opts = opts || {};
  return {
    kind: "vote", rollcallId: 700 + n, measureId: 1100 + n, number: "H.R. " + (300 + n),
    date: "2025-0" + ((n % 9) + 1) + "-11", action: "On Passage", position: position,
    isProcedural: !!opts.proc, title: "Measure " + n,
    source: { url: "https://www.congress.gov/roll-call-vote/" + (700 + n), label: "Congress.gov" },
    issues: [{
      issueKey: issueKey, weight: 100,
      isPrimary: opts.primary !== false, supportMeaning: "yea_supports",
    }],
  };
};
const SEED = [];
for (let i = 0; i < 12; i++) SEED.push(vote(i, ALIGNS, "yea"));
for (let i = 0; i < 12; i++) SEED.push(vote(20 + i, CUTS, "nay"));
for (let i = 0; i < 6; i++) SEED.push(vote(40 + i, SPLITCUE, i % 2 ? "nay" : "yea"));
for (let i = 0; i < 12; i++) SEED.push(vote(50 + i, MIXCUE, "yea"));
for (let i = 0; i < 12; i++) SEED.push(vote(70 + i, ONLY_STRONG, "nay"));
SEED.push(vote(85, ONLY_THIN, "yea"));
for (let i = 0; i < 6; i++) SEED.push(vote(90 + i, ONLY_SPLIT, i % 2 ? "nay" : "yea"));
// Deep, one-sided and entirely incidental: the index refuses to characterise it,
// so it is NOT a readable pattern and must not become a row of its own.
for (let i = 0; i < 5; i++) SEED.push(vote(100 + i, UNREADABLE, "yea", { primary: false }));

const A = boot(true), B = boot(false);
A.PDXVotingRecord.noteMember(PID, SEED.map((v) => JSON.parse(JSON.stringify(v))));
B.PDXVotingRecord.noteMember(PID, SEED.map((v) => JSON.parse(JSON.stringify(v))));
const T = A.PDXStanceTree, CS = A.PDXConsistency, IC = A.PDXIssueColors;
const LEAVES = T.leaves(PID);
const byKey = {};
LEAVES.forEach((lf) => { byKey[lf.key] = lf; });
const GROUPS = T.groups(PID);
const HTML = T.html(PID, { uid: "t" });
const SECTION = T.sectionHtml(PID);
// One leaf's markup, isolated, so an assertion about a row cannot pass on some
// other row's text.
const rowIn = (html, key) => {
  for (const c of String(html).split('<div class="pdxtree-leaf').slice(1)) {
    if ((c.match(/data-pdxtree-issue="([^"]*)"/) || [])[1] === key) {
      return c.slice(0, c.indexOf("</button>") + "</button>".length);
    }
  }
  return "";
};
const chunkOf = (key) => {
  for (const c of HTML.split('<div class="pdxtree-leaf').slice(1)) {
    if ((c.match(/data-pdxtree-issue="([^"]*)"/) || [])[1] === key) return c;
  }
  return "";
};
// Branch faces only — everything from the toggle button to the panel it controls.
const FACES = [...HTML.matchAll(/<button type="button" class="pdxtree-bface"[\s\S]*?<\/button>/g)]
  .map((m) => m[0]);

must(LEAVES.length >= 10, `the fixture produced too few leaves (${LEAVES.length})`);
must(FACES.length >= 5, `the fixture produced too few branches (${FACES.length})`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the grouping map is the shipped one");
// ═════════════════════════════════════════════════════════════════════════════
{
  const topics = T.TOPICS();
  const core = A.CORE_NATIONAL_ISSUES || [];
  eq(topics.length, core.length + 1,
    "the tree declares every core national issue plus exactly one trailing node");
  core.forEach((c, i) => {
    eq(topics[i].key, c.key, `topic ${i} is the core issue declared at that position`);
    eq(topics[i].label, c.label, `…under the core issue's own label`);
  });
  eq(topics[topics.length - 1].key, T.OTHER.key,
    "the trailing node is the one for keys that belong to no core issue");
  eq(T.OTHER.key, "", "…and its key is the empty string PDXIssueColors.coreKeyFor returns");

  // Every leaf lands where the SHARED reverse lookup says it should — the tree
  // does not carry a second opinion about which topic an issue belongs to.
  let filed = 0, other = 0;
  LEAVES.forEach((lf) => {
    const want = (A.coreIssueForKey(lf.key) || {}).key || "";
    eq(lf.topic, want, `${lf.key}: filed under the topic coreIssueForKey names`);
    if (want) filed++; else other++;
  });
  ok(filed > 0, `the fixture files leaves under real core issues (${filed})`);
  ok(other > 0, `…and exercises the trailing node too (${other})`);

  const declared = new Set(topics.map((t) => t.key || "other"));
  GROUPS.forEach((g) => ok(declared.has(g.key), `${g.key}: is a declared topic, not an invented one`));
  eq(GROUPS.reduce((n, g) => n + g.count, 0), LEAVES.length,
    "every leaf is filed under exactly one branch — none dropped, none duplicated");
  // Branch order follows the declared order, so the tree reads the same on every
  // profile rather than reshuffling by how much record someone happens to have.
  const want = topics.map((t) => t.key || "other").filter((k) => GROUPS.some((g) => g.key === k));
  eq(GROUPS.map((g) => g.key).join(","), want.join(","),
    "branches appear in the core issue set's own declared order");

  // The mid level is a gate, not a default. It stays shut for the branch lengths
  // real profiles produce, and the gate itself is asserted directly.
  eq(T.midsFor([]), null, "an empty branch renders flat");
  const one = { group: "econ", groupLabel: "Economy" }, two = { group: "housing", groupLabel: "Housing" };
  eq(T.midsFor(new Array(T.MID.minLeaves - 1).fill(one)), null,
    "a short branch renders flat however it splits");
  eq(T.midsFor(new Array(T.MID.minLeaves).fill(one)), null,
    "a long branch that does NOT split renders flat — no single fake mid level");
  const mixed = new Array(T.MID.minLeaves).fill(one).map((x, i) => (i < 2 ? two : x));
  const mids = T.midsFor(mixed);
  ok(!!mids && mids.length === 2,
    "a long branch that splits into two real groups gets exactly those two mids");
  ok(!!mids && mids.every((m) => m.leaves.length >= T.MID.minPerGroup),
    "…and no mid holds fewer leaves than the per-group floor");
  const scatter = new Array(T.MID.minLeaves).fill(one)
    .map((x, i) => (i === 0 ? two : i === 1 ? { group: "g" + i, groupLabel: "G" } : x));
  const sm = T.midsFor(scatter);
  ok(!sm || sm[sm.length - 1].key === "_rest",
    "under-floor groups collect into one trailing mid instead of a row of one-leaf boxes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · leaf states — said and record, side by side");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(Object.keys(T.SAID).length, 4, "there are exactly four Said faces");
  eq(T.SAID.support.label, "Supports", "…Supports");
  eq(T.SAID.oppose.label, "Opposes", "…Opposes");
  eq(T.SAID.mixed.label, "Mixed", "…Mixed");
  eq(T.SAID.none.label, "No stated position", "…and the honest absence");

  // ── ONE LINE, TWO SLOTS, AND THE RECORD SLOT IS NEVER BLANK ───────────────
  // Said is their word. 🏛 Record is the formal file, and ONE mapped item is
  // already a record: the slot's job is to say what is on file and how deep it
  // goes, not to stay empty until a pattern engine clears a floor. Where
  // Direction Match has actually scored an issue the slot carries THAT verdict
  // instead of a tier description — a scored issue has a better sentence
  // available than "strongly supports", and it is the one the score section
  // beside it prints.
  const a = byKey[ALIGNS];
  must(!!a, `${ALIGNS}: the stated+record fixture row is missing`);
  eq(a.said.label, "Supports", `${ALIGNS}: the stated side is their own position`);
  eq(a.said.stated, true, "…marked as actually stated");
  eq(a.record.state, "scored", `${ALIGNS}: Direction Match scored this issue`);
  eq(a.record.label, "Backed up", "…so the Record slot speaks the score's own verdict, not a tier");
  eq(a.record.depth, "12 votes", "…with the depth of the file beside it");
  eq(a.record.pct, 100, "…and that issue's own percentage");
  eq(a.record.metric, "Direction match", "…named as Direction Match rather than a second metric");
  eq(a.cue.key, "aligns", "…and with both halves pointing the same way the cue is Aligns");
  eq(a.patternOnly, false, "…this is not a pattern-only row");
  const ah = chunkOf(ALIGNS);
  has(ah, "<b>Said:</b> Supports", `${ALIGNS}: the leaf prints Said in the markup`);
  has(ah, "<b>🏛 Record:</b> Backed up", "…and the record beside it, lane-marked");
  has(ah, 'class="pdxtree-depth"> · 12 votes<', "…with the depth as its own element, not folded into the label");
  has(ah, ">Aligns<", "…and the cue at the end of the line");
  ok(ah.indexOf("Said:") < ah.indexOf("Record:"),
    "…in that reading order: their word first, the record second");
  has(ah, 'data-pdxtree-rec="scored"',
    "…and the slot's state is published as data, so a filter can find the scored rows");

  const c = byKey[CUTS];
  must(!!c, `${CUTS}: the tension fixture row is missing`);
  eq(c.said.label, "Supports", `${CUTS}: stated Supports`);
  eq(c.record.state, "scored", "…and Direction Match scored it too");
  eq(c.record.label, "Contradicted", "…against a record that ran the other way");
  eq(c.record.pct, 0, "…at the percentage that record earns");
  eq(c.cue.key, "cuts_against", "…so the cue is Cuts against");
  has(chunkOf(CUTS), ">Cuts against<", "…and the leaf prints it");

  const s = byKey[SPLITCUE];
  eq(s.record.tier, "split", `${SPLITCUE}: a both-ways record is the split tier`);
  eq(s.record.directional, false, "…which claims no direction");
  eq(s.record.label, "Mixed", "…and reads as Mixed once the score has spoken on it");
  eq(s.cue.key, "split", "…so the comparison resolves to Split, not to agreement");

  const m = byKey[MIXCUE];
  eq(m.said.label, "Mixed", `${MIXCUE}: a stated Mixed position`);
  eq(m.record.state, "direction", "…which Direction Match does not score, so the slot describes the record");
  ok(m.record.directional, "…and that record DID take a side");
  eq(m.cue.key, "split", "…still resolves to Split — a mixed stance agrees with nothing");

  const so = byKey[SAIDONLY];
  must(!!so, `${SAIDONLY}: the stated-only fixture row is missing`);
  eq(so.said.stated, true, `${SAIDONLY}: the stated side is on file`);
  eq(so.record.state, "none", "…with no formal item behind it at all");
  eq(so.record.onRecord, false, "…so it is not on the record bar");
  ok(!!so.record.label, "…and the slot still says something rather than going blank");
  eq(so.cue, null, "…and therefore NO alignment cue: there is nothing to compare");
  lacks(chunkOf(SAIDONLY), 'class="pdxtree-cue',
    "…the leaf prints no cue element at all");
  has(chunkOf(SAIDONLY), 'data-pdxtree-cue=""',
    "…and publishes the empty cue as data, so a filter can find the untested rows");
  has(chunkOf(SAIDONLY), "<b>🏛 Record:</b> No formal record on this issue yet",
    "…while the Record slot prints the honest absence in words, not as an empty chip");

  // NEVER A BLANK CHIP. Every leaf on the tree resolves to one of the four slot
  // states, and every one of them has a sentence.
  const states = new Set(LEAVES.map((lf) => lf.record && lf.record.state));
  ["scored", "direction", "onfile", "none"].forEach((st) =>
    ok(states.has(st), `the fixture reaches the ${st} Record slot state`));
  ok(!states.has(undefined) && !states.has(null),
    "every leaf carries a Record slot — a leaf with none would render an empty chip");

  // Every rung of the vocabulary the fixture reaches is a shared engine's own
  // word: the pattern index's where the slot DESCRIBES a record, Direction
  // Match's where it REPORTS a score. Nothing is paraphrased here.
  const SCORE_WORDS = ["Contradicted", "Mixed", "Backed up", "Not enough on file"];
  const WA_SRC = R("word-action.js");
  SCORE_WORDS.forEach((w) =>
    has(WA_SRC, "short: '" + w + "'", `${w} is Direction Match's own short word, not the tree's`));
  const tiers = new Set(LEAVES.filter((l) => l.record).map((l) => l.record.tier));
  ["strong", "split", "thin", "none"].forEach((t) =>
    ok(tiers.has(t), `the fixture reaches the ${t} record tier`));
  LEAVES.forEach((lf) => {
    const rc = lf.record;
    if (!rc) return;
    ok(!!rc.label, `${lf.key}: the Record slot is never blank`);
    const engine = CS.recordPattern.tier(CS.issueRows(PID, [lf.key])[0]);
    if (!engine) {
      eq(rc.tier, "none", `${lf.key}: with no tier from the engine the slot claims none`);
      eq(rc.weight, "flat", `${lf.key}: …and no weight either`);
      return;
    }
    eq(rc.tier, engine.tier, `${lf.key}: the record tier is the shared engine's`);
    eq(rc.weight, engine.weight, `${lf.key}: …at the engine's own weight`);
    if (rc.state === "direction") {
      eq(rc.label, engine.label, `${lf.key}: a described record uses the engine's own label`);
    }
    if (rc.state === "scored") {
      ok(SCORE_WORDS.indexOf(rc.label) !== -1,
        `${lf.key}: a scored record speaks Direction Match's word (got ${JSON.stringify(rc.label)})`);
      eq(typeof rc.pct, "number", `${lf.key}: …and carries the percentage that word came from`);
    }
  });
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · pattern-only rows are disclosed, three ways");
// ═════════════════════════════════════════════════════════════════════════════
{
  const o = byKey[ONLY_STRONG];
  must(!!o, `${ONLY_STRONG}: the pattern-only fixture row is missing`);
  eq(o.said.stated, false, `${ONLY_STRONG}: nothing stated on this issue`);
  eq(o.said.label, "No stated position", "…and the leaf says exactly that");
  eq(o.patternOnly, true, "…so the row is marked pattern-only");
  eq(o.record.label, "Strongly opposes", "…over a record the engine read as strongly one-way");
  eq(o.record.state, "direction", "…which is a description of that record, not a score of it");
  eq(o.record.pct, null, "…and carries no percentage, because nothing scored it");
  eq(o.cue.key, "pattern_only", "…and the cue slot says Pattern only rather than a comparison");
  eq(o.cue.label, "Pattern only", "…in those words");

  const oh = chunkOf(ONLY_STRONG);
  has(oh, 'data-pdxtree-only="1"', "the row carries the pattern-only flag as data");
  has(oh, "is-patternonly", "…and its own skin class, so it cannot look like a stance");
  has(oh, "<b>Said:</b> No stated position", "…prints the absence rather than implying one");
  has(oh, ">Not in Direction Match<", "…and prints the disclosure tag on the row itself");
  // The full sentence — three separate denials — in the accessible name, because a
  // screen reader given only the tag loses two of the three.
  const say = (oh.match(/aria-label="([^"]*)"/) || [])[1] || "";
  has(say, "No stated position on file", "the accessible name states the absence");
  has(say, "not a quoted stance", "…denies that it is a stance");
  has(say, "not counted in Direction Match", "…and denies that it is scored");
  has(oh, "title=", "…and the same sentence rides the row's title for pointer users");
  eq(T.PATTERN_ONLY_TAG, "Not in Direction Match", "the tag is one string, in one place");
  has(T.PATTERN_ONLY_NOTE, "formal record pattern", "the note names what it was inferred from");

  // …and once for the tree, visibly, whenever any such row is on screen.
  has(HTML, "pdxtree-note-only", "the tree prints the pattern-only disclosure in its footer");
  has(HTML, T.PATTERN_ONLY_NOTE, "…in full, not abbreviated");
  has(HTML, T.NOTE, "…beside the standing note that separates Said from Record");
  has(T.NOTE, "never counted in Direction Match",
    "…which says the record lane is out of the score in so many words");

  // ── ONE ITEM IS THE START OF A PATTERN, AND IT SAYS SO ────────────────────
  // A single mapped vote is enough to put an issue on the tree with a Record
  // line. What it is NOT enough for is a finished finding, so the depth is
  // printed, the row is marked quiet, it sorts below every characterised record,
  // and the line itself carries the sentence that says time can still move it.
  const q = byKey[ONLY_THIN];
  must(!!q, `${ONLY_THIN}: the one-vote fixture row is missing`);
  eq(q.record.tier, "thin", `${ONLY_THIN}: one vote reads as thin`);
  eq(q.record.items, 1, "…over exactly one formal item");
  eq(q.record.depth, "1 vote", "…and the depth says so, singular");
  eq(q.record.early, true, "…flagged as an early signal rather than a settled one");
  ok(/more votes can change this/.test(q.record.earlyNote || ""),
    "…with the sentence that says time can still move it");
  eq(q.quiet, true, "…and a thin pattern-only row is marked quiet");
  const qh = chunkOf(ONLY_THIN);
  has(qh, "is-quiet", "…which reaches the markup as its own class");
  has(qh, "<b>🏛 Record:</b> Thin supports", "the one-vote row shows a Record line, not a blank");
  has(qh, 'class="pdxtree-depth"> · 1 vote<', "…with the depth of the file it is drawn from");
  has(qh, 'class="pdxtree-early"> — early signal; more votes can change this<',
    "…and the early-signal disclosure on the row itself, where the number is");
  ok(q.rank > byKey[ONLY_STRONG].rank,
    "…and it sorts below a pattern the engine actually characterised");
  eq(q.band, byKey[ONLY_STRONG].band,
    "…inside the same band, because depth is a tie-break and not a band of its own");
  eq(T.RANK.nofile, Math.max(...Object.values(T.RANK)),
    "nothing-on-file is the last band there is");
  ok(LEAVES.indexOf(byKey[ONLY_STRONG]) < LEAVES.indexOf(q),
    "…so a thin read never leads the band it shares with a characterised one");

  // A record the pattern index declines to characterise is still A RECORD. It
  // used to be dropped from the tree entirely — five votes on file, and an issue
  // the reader could not see at all — which is the blank this pass removed. It
  // comes back as a row that states what is on file and refuses to name a
  // direction, which is exactly what is true of it.
  const u = byKey[UNREADABLE];
  must(!!u, `${UNREADABLE}: the on-file-but-unreadable fixture row is missing`);
  const urow = CS.issueRows(PID, [UNREADABLE])[0];
  const utier = CS.recordPattern.tier(urow);
  eq(utier && utier.tier, "none", "the pattern engine really does decline to characterise it");
  eq(urow.said, false, "…and nothing is stated on it either");
  eq(u.record.state, "onfile", "…so the slot falls to the on-file state, not to nothing");
  eq(u.record.onRecord, true, "…because there IS a formal record here");
  eq(u.record.items, 5, "…of five items");
  eq(u.record.directional, false, "…from which no direction is read");
  eq(u.patternOnly, true, "…and with no stated position the row is pattern-only");
  eq(u.quiet, true, "…and quiet, because an unreadable record is not a finding");
  const uh = chunkOf(UNREADABLE);
  has(uh, "<b>🏛 Record:</b> Formal items on file · direction not clear yet",
    "the row says items are on file and that their direction is not clear yet");
  has(uh, 'class="pdxtree-depth"> · 5 votes<', "…with the count of them");
  lacks(uh, "pdxtree-pct", "…and no percentage, because nothing scored it");
  const usay = (uh.match(/aria-label="([^"]*)"/) || [])[1] || "";
  has(usay, "only incidentally", "…and the accessible name says WHY no direction was read");
  ok(!!T.leaf(PID, UNREADABLE), "…so the leaf builder admits it");
  // Nothing here wrote a pattern into a position map.
  const pm = A._polPositionMap(PID, A.CMP_DATA[PID]) || {};
  eq(pm[ONLY_STRONG], undefined,
    `${ONLY_STRONG}: no stance was invented in the position map from a vote pattern`);
  eq(Object.keys(pm).length, Object.keys(B._polPositionMap(PID, B.CMP_DATA[PID]) || {}).length,
    "the position map holds exactly the entries it held before the tree existed");
  ok(!/_polPositionMap\s*\(/.test(R("stance-tree.js")),
    "the module never calls the position map, so it has no write path into one");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · broad nodes are navigation — no score, no verdict");
// ═════════════════════════════════════════════════════════════════════════════
{
  // A PERCENTAGE ONLY WHERE ONE WAS EARNED. The tree computes no score of its
  // own; the only figure it prints is the Direction Match result an issue already
  // has, on the leaf for that issue. Everything else on the tree — every branch,
  // every described record, every pattern-only row — has no number to show and
  // shows none.
  const scoredKeys = LEAVES.filter((lf) => lf.record && lf.record.state === "scored").map((lf) => lf.key);
  must(scoredKeys.length > 0, "the fixture no longer scores any issue");
  must(scoredKeys.length < LEAVES.length, "the fixture no longer offers an unscored leaf to compare against");
  eq((HTML.match(/class="pdxtree-pct"/g) || []).length, scoredKeys.length,
    "there is exactly one percentage chip per issue Direction Match scored");
  LEAVES.forEach((lf) => {
    const h = chunkOf(lf.key);
    const wantPct = scoredKeys.indexOf(lf.key) !== -1;
    eq(/class="pdxtree-pct"/.test(h), wantPct,
      `${lf.key}: the % chip is present exactly when the issue has a Direction Match result`);
    // The leaf's own markup only — the last chunk on the page also carries the
    // tree's footer notes, and the standing note names the % as a concept.
    if (!wantPct) lacks(h.slice(0, h.indexOf("</button>") + 1), "%",
      `${lf.key}: an unscored leaf prints no percent sign at all`);
    if (lf.patternOnly) lacks(h, "class=\"pdxtree-pct\"", `${lf.key}: a pattern-only leaf gets no %`);
  });
  ok(!/\d+\s*(percent|pct)\b/i.test(HTML), "…and no percentage is spelled out in words either");
  eq((SECTION.match(/%/g) || []).length, (HTML.match(/%/g) || []).length,
    "the section that mounts the tree adds no percentage of its own");
  // A BRANCH FACE MAY NOW DESCRIBE WHAT IS UNDER IT, and it still may not grade
  // it. The summary is counts of rows in the bands' own lower-case words (asserted
  // exhaustively in section 12); what stays banned is the grade — a percentage, a
  // ratio, a tier word, and the verdict or stance vocabulary a leaf prints for a
  // person, which on a topic would read as a score of the topic.
  FACES.forEach((f, i) => {
    const label = `branch face ${i}`;
    lacks(f, "%", `${label}: no percentage`);
    ok(!/\b\d+\s*(of|\/)\s*\d+\b/.test(f), `${label}: no ratio either`);
    ["Supports", "Opposes", "Mixed", "Strongly", "Mostly", "Split", "Thin",
     "No clear pattern", "Aligns", "Cuts against", "Backs it up", "Backed up",
     "Contradicted", "Says one thing", "Direction Match", "Said:", "Record:"].forEach((w) =>
      lacks(f, w, `${label}: carries no verdict, tier or stance word (${w})`));
    ok(/pdxtree-bn">\d+ issues?</.test(f), `${label}: the count of issues is on it, as a count`);
    // Every number on the face is a count of rows — the issue count, or a band
    // count in the summary. Nothing else numeric is allowed on this element, in
    // the visible markup or in the title that carries the rest of the sentence.
    const ttl = (f.match(/ title="([^"]*)"/) || [])[1] || "";
    const nums = [...f.replace(/ title="[^"]*"/, "").matchAll(/\d+/g)].map((m) => m[0]);
    const bandNums = [...f.matchAll(/pdxtree-bsumbit[^>]*>(\d+) /g)].map((m) => m[1]);
    eq(nums.length, bandNums.length + 1,
      `${label}: the only numbers on it are the issue count and its band counts`);
    ok(/^[^·]+ · \d+ issues? ?(· \d+ [a-z ]+)*$/.test(ttl),
      `${label}: the title is the topic, the count and band counts — nothing else (${ttl})`);
  });
  // The branch shape itself offers nothing to score on.
  GROUPS.forEach((g) => {
    eq(typeof g.pct, "undefined", `${g.key}: the branch shape has no percentage`);
    eq(typeof g.score, "undefined", `${g.key}: …no score`);
    eq(typeof g.verdict, "undefined", `${g.key}: …and no verdict`);
    ok(typeof g.count === "number", `${g.key}: it has a count, which is navigation`);
  });
  // No leaf borrows the score's own type either.
  lacks(HTML, "pdxst-pct", "the tree borrows none of the score's markup");
  lacks(HTML, "pdxwa-", "…and none of Word vs Action's");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the leaf is the existing dossier door");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(typeof CS.openGap, "function", "PDXConsistency.openGap is the public door");
  const doors = [...HTML.matchAll(/data-pdxtree-dos="([^"]*)"/g)].map((m) => m[1]);
  eq(doors.length, LEAVES.length, "every leaf carries a door and nothing else does");
  eq(new Set(doors).size, doors.length, "…one per issue, never two");
  LEAVES.forEach((lf) => {
    const h = chunkOf(lf.key);
    has(h, `data-pdxtree-dos="${lf.key}"`, `${lf.key}: the door names its own issue`);
    has(h, `data-pdxtree-pid="${PID}"`, `${lf.key}: …and the politician`);
    ok(/data-pdxtree-origin="[^"]+"/.test(h),
      `${lf.key}: …and an origin, so the dossier's back pill returns to this row`);
    ok(/<button type="button" class="pdxtree-face"/.test(h),
      `${lf.key}: the door is a real button, reachable by keyboard`);
    has(h, "Opens the issue dossier", `${lf.key}: …and says so in its accessible name`);
  });
  // A pattern-only leaf opens the same dossier as a stated one. There is no
  // second detail view, and no second landing vocabulary.
  has(chunkOf(ONLY_STRONG), `data-pdxtree-dos="${ONLY_STRONG}"`,
    "a pattern-only leaf opens the same door as a stated one");
  const src = R("stance-tree.js");
  eq((src.match(/PDXConsistency\.openGap|CS\.openGap\(/g) || []).length, 2,
    "the module reaches openGap once, through one guarded call");
  ok(!/openDossier|PDXDossier\.open|window\.open\(/.test(src),
    "…and opens no dossier of its own");
  // The origin id is stable across the warm repaint, because the section and the
  // leaves inside it share one uid.
  const again = T.html(PID, { uid: "t" });
  eq((again.match(/data-pdxtree-origin="([^"]*)"/) || [])[1],
     (HTML.match(/data-pdxtree-origin="([^"]*)"/) || [])[1],
    "a repaint under the same uid reissues the same leaf ids");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · colours come from PDXIssueColors");
// ═════════════════════════════════════════════════════════════════════════════
{
  GROUPS.forEach((g) => {
    has(g.skin.style, "--pdx-ic:", `${g.key}: the branch paints from the shared custom properties`);
    const want = IC.getIssueColor(g.topicKey).color;
    has(g.skin.style, "--pdx-ic:" + want,
      `${g.key}: …in the colour PDXIssueColors gives this topic`);
  });
  const core = GROUPS.filter((g) => g.topicKey);
  const other = GROUPS.filter((g) => !g.topicKey)[0];
  ok(core.length > 0, "the fixture has core-coloured branches");
  core.forEach((g) => ok(g.skin.on, `${g.key}: is marked as a real core colour`));
  must(!!other, "the fixture no longer exercises the trailing node");
  eq(other.skin.on, false, "the trailing node is NOT marked as a core colour");
  has(other.skin.style, IC.FALLBACK.color,
    "…and takes the colour system's neutral fallback rather than borrowing a topic's");

  LEAVES.forEach((lf) => {
    const h = chunkOf(lf.key);
    has(h, "--pdx-ic:" + IC.getIssueColor(lf.key).color,
      `${lf.key}: the leaf paints the same colour this issue has everywhere else`);
    const branch = GROUPS.filter((g) => g.key === (lf.topic || "other"))[0];
    eq(IC.getIssueColor(lf.key).color, IC.getIssueColor(branch.topicKey).color,
      `${lf.key}: …which is its branch's colour, because the topic decides both`);
    eq(lf.skin.on, IC.isCore(lf.key), `${lf.key}: the coloured dot follows isCore, nothing else`);
  });
  // The stylesheet names no issue, which is what keeps that true.
  const css = R("stance-tree.css");
  has(css, "--pdx-ic", "the stylesheet consumes the shared properties");
  A.CORE_NATIONAL_ISSUES.forEach((c) =>
    lacks(css, c.key, `the stylesheet contains no per-issue rule (${c.key})`));
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · mobile opens one branch at a time");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(T.PHONE, "(max-width: 639px)", "the phone test is the site's own phone breakpoint");
  // Default state: exactly one branch open, and it is the branch holding the
  // highest-tension row on the profile — not taxonomy #1, which is where the old
  // rule left a reader when the contradiction sat in branch seven.
  const open = [...HTML.matchAll(/data-pdxtree-branch="([^"]*)" data-pdxtree-open="1"/g)]
    .map((m) => m[1]);
  eq(open.length, 1, "a freshly rendered tree has exactly one branch open");
  eq(open[0], T.defaultOpen(GROUPS), "…and it is the branch the default-open rule names");
  const topRank = Math.min(...LEAVES.map((lf) => lf.rank));
  const opened = GROUPS.filter((g) => g.key === open[0])[0];
  eq(Math.min(...opened.leaves.map((lf) => lf.rank)), topRank,
    "…which is a branch holding the highest-tension row on the profile");
  GROUPS.slice(0, GROUPS.indexOf(opened)).forEach((g) =>
    ok(Math.min(...g.leaves.map((lf) => lf.rank)) > topRank,
      `${g.key}: an earlier branch is skipped only because nothing in it ranks higher`));
  eq((HTML.match(/aria-expanded="true"/g) || []).length, 1,
    "…which is the one branch reporting itself expanded");
  eq((HTML.match(/<div class="pdxtree-panel"[^>]* hidden>/g) || []).length, GROUPS.length - 1,
    "every other panel is really hidden, not just visually collapsed");
  eq((HTML.match(/aria-controls="/g) || []).length, GROUPS.length,
    "every toggle names the panel it controls");

  // The rule itself.
  const [b0, b1] = GROUPS.map((g) => g.key);
  eq(T.nextOpen([b0], b1, true).join(","), b1,
    "on a phone, opening a second branch closes the first");
  eq(T.nextOpen([b0], b1, false).join(","), b0 + "," + b1,
    "on a wider screen, both stay open");
  eq(T.nextOpen([b0], b0, true).join(","), "",
    "tapping the open branch closes it, on a phone");
  eq(T.nextOpen([b0], b0, false).join(","), "",
    "…and on a desktop");
  eq(T.nextOpen([], b0, true).join(","), b0, "a fully collapsed tree still opens");
  const before = [b0];
  T.nextOpen(before, b1, true);
  eq(before.join(","), b0, "the rule copies rather than mutating what it was handed");

  // A repaint carries the reader's open branches across, instead of resetting to
  // the default — the record half of every leaf arrives after first paint.
  const kept = T.html(PID, { uid: "t", open: [b1] });
  has(kept, `data-pdxtree-branch="${b1}" data-pdxtree-open="1"`,
    "a repaint honours the branch the reader had open");
  lacks(kept, `data-pdxtree-branch="${b0}" data-pdxtree-open="1"`,
    "…and does not silently re-open the default one");
  has(R("stance-tree.js"), "pdx-consistency-warm",
    "the tree rebinds on the same warm event the rest of the profile repaints on");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · it is not a score — the numbers are byte-identical");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(!B.PDXStanceTree, "sandbox B really is the product without the tree");
  const rowsA = CS.issueRows(PID), rowsB = B.PDXConsistency.issueRows(PID);
  eq(rowsA.length, rowsB.length, "both sandboxes model the same rows");
  const bk = {};
  rowsB.forEach((r) => { bk[r.key] = r; });
  let scored = 0;
  rowsA.forEach((a) => {
    const b = bk[a.key];
    ok(!!b, `${a.key}: the row exists in both sandboxes`);
    if (!b) return;
    eq(a.verdict.token, b.verdict.token, `${a.key}: the verdict token is unchanged`);
    eq(a.verdict.score, b.verdict.score, `${a.key}: the verdict score is unchanged`);
    eq(a.tier, b.tier, `${a.key}: the row's tier is unchanged`);
    eq(JSON.stringify(a.stance), JSON.stringify(b.stance), `${a.key}: the stated position is unchanged`);
    if (typeof a.verdict.score === "number") scored++;
  });
  ok(scored > 0, "the fixture actually scores something for the comparison to protect");
  eq(JSON.stringify(CS.verdictTally(PID)), JSON.stringify(B.PDXConsistency.verdictTally(PID)),
    "the profile's verdict tally is byte-identical");
  eq(JSON.stringify(A.PDXWordAction.read(PID)), JSON.stringify(B.PDXWordAction.read(PID)),
    "the pooled Word vs Action read — the one headline percentage — is byte-identical");
  eq(JSON.stringify(A._polPositionMap(PID, A.CMP_DATA[PID])),
     JSON.stringify(B._polPositionMap(PID, B.CMP_DATA[PID])),
    "…and the position map is byte-identical");
  // The leaf shape offers nothing ordinal to a downstream sort but its own rank,
  // which never leaves the module.
  LEAVES.forEach((lf) => {
    eq(typeof lf.pct, "undefined", `${lf.key}: the leaf shape has no percentage`);
    eq(typeof lf.score, "undefined", `${lf.key}: …and no score`);
    eq(typeof lf.verdict, "undefined", `${lf.key}: …and no verdict`);
  });
  lacks(HTML, "data-pdxtree-rank", "the rank is not published to the DOM");
  // No party framing, anywhere.
  ["Democrat", "Republican", "party", "GOP", "partisan"].forEach((w) =>
    ok(!new RegExp("\\b" + w + "\\b", "i").test(HTML),
      `the tree carries no party framing (${w})`));
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · the mount");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(SECTION, 'id="pdxsec-stancetree"', "the section emits its own nav anchor");
  has(SECTION, 'id="pdxsec-glance"',
    "…and the legacy anchor the unmounted flat index owned, so old jumps still land");
  has(SECTION, "🌳 All Issues by Topic", "…under a heading that says what it is");
  has(SECTION, HTML.slice(0, 60), "…wrapping the tree itself");
  const PF = R("profiles-full.js");
  ok(/PDXStanceTree\.sectionHtml\(id\)/.test(PF), "the profile mounts the tree");
  ok(!/window\._renderStanceGlance\(id, p\)/.test(PF),
    "…and the flat Stance at a Glance wall it replaced is unmounted");
  const verdictStage = PF.slice(PF.indexOf("<!--PDXSP:verdict-->"), PF.indexOf("<!--PDXSP:record-->"));
  ok(verdictStage.indexOf("PDXStanceTree.sectionHtml(id)") > 0,
    "the tree mounts in the verdict stage, under the Word vs Action summary");
  ok(verdictStage.indexOf("PDXWordAction.sectionHtml(id, p)") <
     verdictStage.indexOf("PDXStanceTree.sectionHtml(id)"),
    "…after it, not before: the headline score still leads the stage");
  ok(/PDXWordAction\.sectionHtml\(id, p\)/.test(PF),
    "…and the headline Direction Match section is still mounted");
  eq(A.PDXProfileSpine.targetStage("pdxsec-stancetree"), "verdict",
    "the rail registers the tree against the stage it really sits in");
  eq(A.PDXProfileSpine.targetStage("pdxsec-glance"), "verdict",
    "…and the legacy anchor with it");
  has(R("sw.js"), "'/stance-tree.js'", "the service worker precaches the module");
  has(R("sw.js"), "'/stance-tree.css'", "…and its stylesheet");
  has(R("index.html"), 'src="stance-tree.js"', "the page loads the module");
  has(R("index.html"), 'href="/stance-tree.css"', "…and the stylesheet");
  const ix = R("index.html");
  ok(ix.indexOf('src="consistency.js"') < ix.indexOf('src="stance-tree.js"'),
    "…after consistency.js, which owns both engines it reads");
}

// ═════════════════════════════════════════════════════════════════════════════
section("10 · tension order is a sort key and nothing else");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The bands, as declared data — six of them, in the order a reader wants them.
  eq(T.BANDS.join(","), "cuts_against,mixed,aligns,pattern,onfile,nofile",
    "the six bands are declared in tension order");
  eq(Object.keys(T.RANK).length, T.BANDS.length, "…and there are exactly six of them");
  T.BANDS.forEach((b, i) => eq(T.RANK[b], i, `${b}: is band ${i} of the declared order`));
  T.BANDS.forEach((b) => ok(/^[a-z ]+$/.test(T.BAND_WORD[b] || ""),
    `${b}: has one lower-case word for a branch summary to print (${T.BAND_WORD[b]})`));

  // DEPTH BREAKS TIES INSIDE A BAND, NEVER ACROSS ONE. A thin record sorts last
  // among the rows it shares a band with and still ahead of the whole band below.
  ok(T.rankOf("cuts_against", "full") < T.rankOf("cuts_against", "thin"),
    "inside a band, a characterised record leads a thin one");
  ok(T.rankOf("cuts_against", "thin") < T.rankOf("mixed", "full"),
    "…and the thinnest row of a band still leads the band beneath it");
  ok(T.rankOf("pattern", "full") > T.rankOf("aligns", "flat"),
    "a pattern-only read never outranks a compared row, however weak that row's record");

  // The fixture, band by band: every one of the six is reached by a real row.
  eq(byKey[CUTS].band, "cuts_against", `${CUTS}: stated position against a deep record is the top band`);
  eq(byKey[SPLITCUE].band, "mixed", `${SPLITCUE}: a record that ran both ways is the mixed band`);
  eq(byKey[MIXCUE].band, "mixed", `${MIXCUE}: a stated Mixed lands in the same band`);
  eq(byKey[ALIGNS].band, "aligns", `${ALIGNS}: said and record pointing one way is the aligns band`);
  eq(byKey[ONLY_STRONG].band, "pattern", `${ONLY_STRONG}: pattern-only with a direction sorts after all three`);
  eq(byKey[ONLY_THIN].band, "pattern", `${ONLY_THIN}: …and a thin one with it, below it inside the band`);
  eq(byKey[ONLY_SPLIT].band, "onfile", `${ONLY_SPLIT}: a pattern with no clear direction is on-file, not a direction`);
  eq(byKey[UNREADABLE].band, "onfile", `${UNREADABLE}: …and so is a record the engine will not characterise`);
  eq(byKey[SAIDONLY].band, "nofile", `${SAIDONLY}: a stated position with nothing on file is the last band`);
  const seen = new Set(LEAVES.map((lf) => lf.band));
  T.BANDS.forEach((b) => ok(seen.has(b), `the fixture exercises the ${b} band`));

  // The order the module actually returns.
  LEAVES.forEach((lf, i) => {
    if (!i) return;
    ok(LEAVES[i - 1].rank <= lf.rank,
      `${lf.key}: leaves come back in band order (${LEAVES[i - 1].rank} → ${lf.rank})`);
  });
  // THE ONE RULE THE BRIEF NAMES OUTRIGHT: a pattern-only row can never sort above
  // a real said-plus-record tension.
  const compared = LEAVES.filter((lf) => !lf.patternOnly &&
    ["cuts_against", "mixed", "aligns"].indexOf(lf.band) !== -1);
  const only = LEAVES.filter((lf) => lf.patternOnly);
  must(compared.length > 0 && only.length > 0, "the fixture no longer holds both kinds of row");
  ok(Math.min(...only.map((lf) => lf.rank)) > Math.max(...compared.map((lf) => lf.rank)),
    "no pattern-only row sorts above any row where said and record were compared");
  ok(LEAVES[0].band === "cuts_against",
    "…and the first row on the profile is the said-vs-record contradiction");

  // The DOM follows it, inside every branch that renders flat.
  GROUPS.filter((g) => !g.mids).forEach((g) => {
    const panel = HTML.slice(HTML.indexOf(`data-pdxtree-branch="${g.key}"`));
    const keys = [...panel.slice(0, panel.indexOf("</div></div>"))
      .matchAll(/data-pdxtree-issue="([^"]*)"/g)].map((m) => m[1]);
    const ranks = keys.map((k) => byKey[k].rank);
    ranks.forEach((r, i) => ok(i === 0 || ranks[i - 1] <= r,
      `${g.key}: the rows inside the branch are in band order`));
  });

  // NOTHING ORDINAL LEAVES THE MODULE. The band is not published, not printed and
  // not a figure, and the ordering reads no scoring floor and no scoring engine.
  lacks(HTML, "data-pdxtree-band", "the band is not published to the DOM");
  lacks(HTML, "data-pdxtree-rank", "…and neither is the rank");
  // The CODE, not the header comment that names the floors in order to say it does
  // not read them.
  const body = R("stance-tree.js").slice(R("stance-tree.js").indexOf("(function () {"));
  ["MIN_TESTED_ITEMS", "MIN_TESTED_WEIGHT", "EVIDENCE_CAP", "_RD_", "_recordPatternTier",
   "_recordDisplayTier", "_pdxRecordDirection", "recordPattern.tier"].forEach((w) =>
    lacks(body, w, `the ordering reads no floor and no scoring engine of its own (${w})`));
  eq((body.match(/recordPattern\.display\(/g) || []).length, 1,
    "the record half of a leaf still comes from exactly one shared accessor, called once");
  LEAVES.forEach((lf) => {
    eq(typeof lf.band, "string", `${lf.key}: the band is a name`);
    eq(typeof lf.rank, "number", `${lf.key}: …and the rank an ordering integer, nothing printed`);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
section("11 · filters are views — they hide rows and touch nothing else");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(T.FILTERS.map((f) => f.key).join(","), "all,stance,cuts,aligns,only,onfile",
    "the chip set is the six the brief names, in that order");
  eq(T.FILTER_ALL, "all", "…and the default is the full set");
  eq(T.FILTERS[0].test, null, "…which has no predicate at all, so it can hide nothing");
  T.FILTERS.forEach((f) => ok(!!f.label && !!f.title,
    `${f.key}: the chip has a label and a sentence saying what it selects`));

  // Each filter, restated independently off the leaf shape. If a predicate drifts,
  // this disagrees with it rather than following it.
  const PRED = {
    all: () => true,
    stance: (lf) => !!lf.said.stated,
    cuts: (lf) => lf.band === "cuts_against",
    aligns: (lf) => lf.band === "aligns",
    only: (lf) => !!lf.patternOnly,
    onfile: (lf) => !!(lf.record && lf.record.onRecord),
  };
  const leavesBefore = JSON.stringify(LEAVES);
  const waBefore = JSON.stringify(A.PDXWordAction.read(PID));
  const countsBefore = JSON.stringify(T.counts(PID));
  const rowsBefore = JSON.stringify(CS.issueRows(PID).map((r) => [r.key, r.verdict.token, r.verdict.score]));

  T.FILTERS.forEach((f) => {
    const got = T.filter(LEAVES, f.key);
    const want = LEAVES.filter(PRED[f.key]);
    eq(got.length, want.length, `${f.key}: selects the rows the predicate names`);
    got.forEach((lf) => ok(LEAVES.indexOf(lf) !== -1,
      `${f.key}: selects rows already on the tree, never new ones`));
    if (f.key !== "all") ok(got.length < LEAVES.length || f.key === "onfile",
      `${f.key}: actually narrows the fixture`);

    // The SAME uid as the full view, so a row that differs by so much as its id
    // fails the byte-identical comparison below.
    const h = T.html(PID, { uid: "t", filter: f.key });
    has(h, `data-pdxtree-filter="${f.key}"`, `${f.key}: the view names itself on the tree element`);
    const keys = [...h.matchAll(/data-pdxtree-issue="([^"]*)"/g)].map((m) => m[1]);
    eq(keys.length, got.length, `${f.key}: renders exactly the rows it selected`);
    keys.forEach((k) => ok(PRED[f.key](byKey[k]), `${f.key}: ${k} belongs in this view`));
    // Scoped to the FILTER bar: the order control beside it carries aria-pressed
    // too, and the two groups answer different questions — which rows are on
    // screen, and in what arrangement. Exactly one of each is pressed.
    const fbar = (h.match(/<div class="pdxtree-filters"[\s\S]*?<\/div>/) || [""])[0];
    eq((fbar.match(/aria-pressed="true"/g) || []).length, 1,
      `${f.key}: exactly one chip is pressed`);
    ok(new RegExp(`data-pdxtree-filter="${f.key}" aria-pressed="true"`).test(h),
      `${f.key}: …and it is this one`);
    // A ROW SAYS THE SAME THING UNDER EVERY VIEW — byte for byte.
    if (got.length) eq(rowIn(h, got[0].key), rowIn(HTML, got[0].key),
      `${f.key}: the row for ${got[0].key} is byte-identical to its row in the full view`);
    // …including the one percentage a leaf may carry, and only where earned.
    eq((h.match(/class="pdxtree-pct"/g) || []).length,
       got.filter((lf) => lf.record && lf.record.state === "scored").length,
      `${f.key}: a percentage still appears only on a scored row`);
  });

  eq(JSON.stringify(LEAVES), leavesBefore, "filtering mutated no leaf");
  eq(JSON.stringify(A.PDXWordAction.read(PID)), waBefore, "…moved no score");
  eq(JSON.stringify(T.counts(PID)), countsBefore, "…and moved no count");
  eq(JSON.stringify(CS.issueRows(PID).map((r) => [r.key, r.verdict.token, r.verdict.score])),
     rowsBefore, "…and left every row verdict exactly where it was");

  // PATTERN-ONLY KEEPS EVERY DISCLOSURE UNDER ITS OWN FILTER.
  const oh = T.html(PID, { uid: "f", filter: "only" });
  const onlyN = T.filter(LEAVES, "only").length;
  must(onlyN > 0, "the fixture no longer holds a pattern-only row");
  has(oh, "pdxtree-note-only", "the pattern-only view keeps the tree's footer disclosure");
  has(oh, T.PATTERN_ONLY_NOTE, "…in full");
  eq((oh.match(/>Not in Direction Match</g) || []).length, onlyN + 1,
    "…and every row keeps its own tag, with the footer's alongside");
  [...oh.matchAll(/data-pdxtree-only="([^"]*)"/g)].forEach((m) =>
    eq(m[1], "1", "every row in the pattern-only view is flagged as one"));
  lacks(oh, "class=\"pdxtree-pct\"", "…and none of them carries a percentage");

  // AN EMPTY VIEW SAYS SO. Picked off a real profile that has no contradiction on
  // file rather than constructed, because that is the common case.
  let EMPTY_PID = "";
  for (const pid of Object.keys(A.CMP_DATA)) {
    const ls = T.leaves(pid);
    if (ls.length >= 2 && !T.filter(ls, "cuts").length) { EMPTY_PID = pid; break; }
  }
  must(!!EMPTY_PID, "no profile offers an empty filter to render");
  const eh = T.html(EMPTY_PID, { uid: "e", filter: "cuts" });
  has(eh, 'data-pdxtree-mode="empty"', "an empty view says so on the tree element");
  has(eh, T.EMPTY_NOTE, "…and says it in words");
  eq(T.EMPTY_NOTE, "None on this profile.", "…in the brief's own words");
  has(eh, "Cuts against:", "…naming the filter that came back empty");
  lacks(eh, 'class="pdxtree-leaf', "…with no rows");
  lacks(eh, "pdxtree-branch", "…and no empty branches either");
  ok(/data-pdxtree-filter="cuts" aria-pressed="true"/.test(eh),
    "…while still showing which filter is on");
  has(eh, 'data-pdxtree-filter="all"', "…and one control back to the full set");
  has(eh, "Show all issues", "…labelled as the way out");

  // An unknown view is the full one, never an empty one.
  eq(T.filter(LEAVES, "nope").length, LEAVES.length, "an unknown filter key selects everything");
  has(T.html(PID, { uid: "f", filter: "nope" }), 'data-pdxtree-filter="all"',
    "…and renders as the full view");

  // WHICH CHIPS EXIST IS A PROPERTY OF THE PROFILE.
  const chips = T.chipsFor(LEAVES, "all").map((f) => f.key);
  eq(chips[0], "all", "the full set is always the first chip");
  T.FILTERS.slice(1).forEach((f) => {
    const n = T.filter(LEAVES, f.key).length;
    eq(chips.indexOf(f.key) !== -1, n > 0 && n < LEAVES.length,
      `${f.key}: a chip exists exactly where it narrows this profile`);
  });
  ok(T.chipsFor(T.leaves(EMPTY_PID), "cuts").some((f) => f.key === "cuts"),
    "the active chip is drawn even when its own set is empty");
  const oneBand = LEAVES.filter((lf) => lf.band === "aligns" && lf.said.stated);
  must(oneBand.length > 0, "the fixture no longer holds an aligned stated row");
  eq(T.chipsFor(oneBand, "all").length, 0,
    "no bar at all where every chip would select everything or nothing");
  const bar = T.html(PID, { uid: "f" });
  has(bar, "pdxtree-filters", "the fixture's own tree does draw the bar");
  ok(/role="group" aria-label="Filter these issues"/.test(bar),
    "…as one labelled group of controls");
  T.FILTERS.forEach((f) => ok(!/\d/.test(f.label),
    `${f.key}: a chip carries no figure of its own — profileCounts stays the one source`));

  // A CHIP IS THE SAME BUILDER, NOT A SECOND CODE PATH: the handler re-renders the
  // tree through treeHtml with the new view, normalises the key through the filter
  // table first, and puts focus back on the chip its own re-render replaced.
  const hsrc = R("stance-tree.js");
  const handler = hsrc.slice(hsrc.indexOf("[data-pdxtree-filter]"), hsrc.indexOf("// The branch toggle."));
  has(handler, "treeHtml(", "the chip handler re-renders through the shared builder");
  has(handler, "filterOf(", "…normalising the key through the filter table first");
  has(handler, "focus()", "…and returning focus to the chip it replaced");
  ok(!/innerHTML\s*=/.test(handler), "…and hides no row by hand in the DOM");
}

// ═════════════════════════════════════════════════════════════════════════════
section("12 · a closed branch summarises the state under it");
// ═════════════════════════════════════════════════════════════════════════════
{
  const faceOf = (html, key) => {
    const all = [...html.matchAll(/<button type="button" class="pdxtree-bface"[\s\S]*?<\/button>/g)]
      .map((m) => m[0]);
    return all.filter((f) => f.includes(`data-pdxtree-toggle="${key}"`))[0] || "";
  };
  GROUPS.forEach((g) => {
    const sm = g.summary;
    eq(sm.total, g.count, `${g.key}: the summary describes exactly the rows filed under it`);
    eq(sm.bits.reduce((n, b) => n + b.n, 0), g.count,
      `${g.key}: …and its bits add up to the count beside them`);
    const order = sm.bits.map((b) => T.RANK[b.key]);
    order.forEach((v, i) => ok(i === 0 || order[i - 1] < v,
      `${g.key}: the bits run worst-tension first, in band order`));
    sm.bits.forEach((b) => eq(b.label, b.n + " " + T.BAND_WORD[b.key],
      `${g.key}/${b.key}: a bit is a count of rows and the band's own word`));

    const face = faceOf(HTML, g.key);
    must(!!face, `${g.key}: the branch face is missing from the markup`);
    has(face, "pdxtree-bsum", `${g.key}: the face carries the summary`);
    const shown = [...face.matchAll(/class="pdxtree-bsumbit b-([a-z_]+)( is-extra)?"/g)];
    eq(shown.length, Math.min(sm.bits.length, T.SUMMARY_MAX),
      `${g.key}: at most ${T.SUMMARY_MAX} bits are printed on the face`);
    eq(shown.map((m) => m[1]).join(","),
       sm.bits.slice(0, T.SUMMARY_MAX).map((b) => b.key).join(","),
      `${g.key}: …and they are the worst ones, in band order`);
    eq(!!shown[0][2], false, `${g.key}: the first bit is the one a narrow screen keeps`);
    shown.slice(1).forEach((m, i) => ok(!!m[2],
      `${g.key}: bit ${i + 1} is marked as an extra a narrow screen may drop`));
    has(face, sm.text.replace(/&/g, "&amp;"), `${g.key}: the whole sentence rides the face's title`);
    lacks(face, "%", `${g.key}: and no percentage anywhere on it`);
  });

  // The point of the exercise: a branch holding a contradiction says so while it
  // is still CLOSED, which is what "Economy · 6 issues" could not do.
  const tense = GROUPS.filter((g) => g.summary.bits.some((b) => b.key === "cuts_against"))[0];
  must(!!tense, "the fixture no longer files a contradiction under any branch");
  const tf = faceOf(HTML, tense.key);
  has(tf, "cuts against", "a branch holding a contradiction says so on its face");
  const closed = GROUPS.filter((g) => g.key !== T.defaultOpen(GROUPS) && g.summary.bits.length)[0];
  must(!!closed, "the fixture no longer has a closed branch to read");
  const cf = faceOf(HTML, closed.key);
  has(cf, 'aria-expanded="false"', `${closed.key}: is closed`);
  has(cf, "pdxtree-bsum", "…and still summarises its own state, count-only never being enough");

  // THE SUMMARY DESCRIBES THE VISIBLE SET, so it cannot disagree with the panel.
  const TP = "trump";
  must(T.count(TP) > T.FLAT.maxLeaves, "the deep exec-lane fixture is gone");
  const ah = T.html(TP, { uid: "s", filter: "aligns" });
  const afaces = [...ah.matchAll(/<button type="button" class="pdxtree-bface"[\s\S]*?<\/button>/g)]
    .map((m) => m[0]);
  must(afaces.length > 0, "the aligned view of the deep fixture no longer renders branches");
  afaces.forEach((f, i) => {
    const bits = [...f.matchAll(/pdxtree-bsumbit b-([a-z_]+)/g)].map((m) => m[1]);
    eq(bits.join(","), "aligns",
      `filtered branch ${i}: the summary counts only the rows still visible under it`);
  });
  T.groups(TP, T.filter(T.leaves(TP), "aligns")).forEach((g) => {
    eq(g.summary.total, g.count, `${g.key}: the filtered branch counts its filtered rows`);
    eq(g.leaves.every((lf) => lf.band === "aligns"), true, `${g.key}: …and holds only those rows`);
  });

  // A narrow screen keeps the count and the worst signal; the rest is in the title.
  const css = R("stance-tree.css");
  const phone = css.slice(css.indexOf("@media (max-width: 639px)"));
  has(phone, ".pdxtree-bsumbit.is-extra { display: none; }",
    "on a phone only the leading (worst) bit survives beside the count");
  lacks(css, "content: \"%\"", "the stylesheet adds no percentage to a branch either");
}

// ═════════════════════════════════════════════════════════════════════════════
section("13 · a handful of leaves renders flat");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(T.FLAT.maxLeaves, 5, "the threshold is five leaves");
  const src = R("stance-tree.js");
  eq((src.match(/maxLeaves/g) || []).length, 2,
    "the threshold is written in one place and read in one place");
  eq((src.match(/FLAT\.maxLeaves/g) || []).length, 1, "…by the mode rule alone");
  eq(T.modeFor(T.FLAT.maxLeaves), "flat", "at the threshold the tree renders flat");
  eq(T.modeFor(T.FLAT.maxLeaves + 1), "tree", "one leaf over it, the topic tree comes back");
  eq(T.modeFor(1), "flat", "a single leaf is never given an accordion");
  eq(T.modeFor(0), "flat", "…and neither is none");

  // BOTH SIDES OF THE BOUNDARY, ON REAL PROFILES.
  const pick = (n) => {
    for (const pid of Object.keys(A.CMP_DATA)) if (T.count(pid) === n) return pid;
    return "";
  };
  const FLATPID = pick(T.FLAT.maxLeaves), TREEPID = pick(T.FLAT.maxLeaves + 1);
  must(!!FLATPID && !!TREEPID,
    `no real profile sits on each side of the boundary (${FLATPID} / ${TREEPID})`);
  eq(T.count(TREEPID), T.count(FLATPID) + 1, "the two fixtures differ by exactly one leaf");
  const fh = T.html(FLATPID, { uid: "fl" }), th = T.html(TREEPID, { uid: "tr" });
  has(fh, 'data-pdxtree-mode="flat"', `${FLATPID}: ${T.FLAT.maxLeaves} leaves render flat`);
  has(fh, 'class="pdxtree-flat"', "…as one list");
  lacks(fh, "pdxtree-branch", "…with no topic accordions");
  lacks(fh, "aria-expanded", "…nothing to expand");
  lacks(fh, "pdxtree-panel", "…and no panels to hide rows in");
  eq((fh.match(/data-pdxtree-issue="/g) || []).length, T.FLAT.maxLeaves,
    "…and every leaf is on screen");
  eq((fh.match(/data-pdxtree-dos="/g) || []).length, T.FLAT.maxLeaves,
    "…each one still the door to its own dossier");
  has(th, 'data-pdxtree-mode="tree"', `${TREEPID}: one leaf more, and the tree is back`);
  has(th, "pdxtree-branch", "…with its branches");
  eq((th.match(/aria-expanded="true"/g) || []).length, 1, "…one of them open");

  // Tension order, and the same leaf chrome as the tree.
  const fl = T.leaves(FLATPID);
  const forder = [...fh.matchAll(/data-pdxtree-issue="([^"]*)"/g)].map((m) => m[1]);
  eq(forder.join(","), fl.map((lf) => lf.key).join(","), "the flat list is in tension order");
  has(fh, T.leafHtml(fl[0], "fl"),
    "a row in flat mode is byte-identical to the same row built for the tree");
  has(fh, "pdxtree-tally", "the flat view keeps the header tally");
  has(fh, T.NOTE, "…and the standing note that separates Said from Record");
  eq(/pdxtree-filters/.test(fh), T.chipsFor(fl, "all").length > 0,
    "…and keeps the filter bar exactly where the profile has something to narrow");

  // NARROWING BELOW THE THRESHOLD DROPS THE CHROME TOO — which is the deep-profile
  // case the brief is really about: four contradictions, one flat list, no hunting.
  const TP = "trump";
  const cuts = T.filter(T.leaves(TP), "cuts");
  must(cuts.length > 0 && cuts.length <= T.FLAT.maxLeaves,
    `the deep fixture no longer narrows below the threshold (${cuts.length})`);
  const nh = T.html(TP, { uid: "nn", filter: "cuts" });
  has(nh, 'data-pdxtree-mode="flat"', "a filter that narrows below the threshold renders flat");
  lacks(nh, "pdxtree-branch", "…with no accordions left to open");
  eq((nh.match(/data-pdxtree-issue="/g) || []).length, cuts.length,
    "…and exactly the narrowed rows on screen");
  has(T.html(TP, { uid: "nn" }), 'data-pdxtree-mode="tree"',
    "…while the unfiltered view of the same profile is still a tree");
}

// ─────────────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ stance tree: ${failures.length} failure(s)\n`);
  failures.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
console.log(`\n✓ stance tree: all ${passed} assertions passed`);
