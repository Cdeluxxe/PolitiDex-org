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
//   4. BROAD NODES CARRY NO SCORE AND NO VERDICT, and a percentage appears ONLY
//      on a leaf whose issue Direction Match already scored — never on a branch,
//      never on a pattern-only row, and never computed here.
//   5. THE LEAF IS THE EXISTING DOOR. One openGap(), the same dossier every other
//      surface opens, no tree-only detail view.
//   6. COLOURS COME FROM PDXIssueColors. Same issue, same colour as everywhere
//      else; an unmapped issue takes the neutral fallback rather than borrowing.
//   7. MOBILE OPENS ONE BRANCH AT A TIME, and the rule is asserted as a rule.
//   8. IT IS NOT A SCORE. Direction Match, the verdict tally, every row verdict
//      and the position map are byte-identical with the whole module unloaded.
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
  const SCORE_WORDS = ["Contradicted", "Mixed", "Backed up", "Thin record"];
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
  ok(T.RANK.quiet === Math.max(...Object.values(T.RANK)),
    "quiet is the last rank there is — thin is never dressed as a strong finding");

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
  FACES.forEach((f, i) => {
    const label = `branch face ${i}`;
    lacks(f, "%", `${label}: no percentage`);
    ok(!/\b\d+\s*(of|\/)\s*\d+\b/.test(f), `${label}: no ratio either`);
    ["Supports", "Opposes", "Mixed", "Strongly", "Mostly", "Split", "Thin",
     "No clear pattern", "Aligns", "Cuts against", "Backs it up",
     "Says one thing", "Direction Match"].forEach((w) =>
      lacks(f, w, `${label}: carries no verdict, tier or stance word (${w})`));
    ok(/pdxtree-bn">\d+ issues?</.test(f), `${label}: the only number on it is a count of issues`);
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
  // Default state: exactly one branch open, and it is the first.
  const open = [...HTML.matchAll(/data-pdxtree-branch="([^"]*)" data-pdxtree-open="1"/g)]
    .map((m) => m[1]);
  eq(open.length, 1, "a freshly rendered tree has exactly one branch open");
  eq(open[0], GROUPS[0].key, "…and it is the first branch, not an arbitrary one");
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

// ─────────────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ stance tree: ${failures.length} failure(s)\n`);
  failures.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
console.log(`\n✓ stance tree: all ${passed} assertions passed`);
