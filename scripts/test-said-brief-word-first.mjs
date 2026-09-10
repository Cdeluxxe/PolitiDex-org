#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-said-brief-word-first.mjs — the letterhead leads with the WORD when the
// formal lane is empty
// ─────────────────────────────────────────────────────────────────────────────
// /p/lyman opened like a sitting member with no file. A reader who came for "who
// is this person" was handed three absences in a row:
//
//   · the kicker: "record still being built"
//   · the 🏛 brief: a formal record of nothing — "1 issue on the formal record ·
//     0 votes and formal actions read"
//   · ⚖️ Word vs Action: "not enough on file"
//
// and a two-jobs explainer underneath that still called the record the main view.
// Meanwhile seven sourced stance cards sat on the same page, below the fold, each
// one a documented position with a citation. The material a reader wanted was
// there. The letterhead was reporting its absence.
//
// THE RULE THIS HARNESS HOLDS:
//
//   If the formal pattern index has zero readable acts AND there is at least one
//   cited stance card, the identity zone leads with a SAID brief — the same
//   visual system as the strongest-pattern rows, carrying the word instead of the
//   record. Otherwise the record-first brief stands exactly as it did.
//
// A SAID brief is a promotion of material that already exists, not a new claim.
// So the harder half of this file is the four refusals, each of which is a way
// the promotion could quietly turn into an invention:
//
//   · NO PERCENTAGE. Word vs Action needs both halves. One half publishes no
//     figure, and a word-first letterhead is by definition the one-half case.
//   · NO ROW CALLED RECORD OR PATTERN. The rows say SAID. They do not borrow the
//     record chip, and they do not borrow its colour — Supports, Opposes and
//     Mixed all render in house grey, because a stated side is not a verdict.
//   · NO SIDE INFERRED FROM PARTY. Every side word is read off the stance card's
//     own resolved stance, the same object the tree leaf and the issue dossier
//     read. A row with no cited card is not drawn at all.
//   · NO RECORD-FIRST FILE MOVED AN INCH. cox, lee and chew_h68 read the same
//     brief they read before, and the gate is asked with positive knowledge:
//     a lane that is still loading, or that failed to load, is not an empty lane.
//
// And one data fix rides along, because without it the rule could not fire on its
// own headline subject: publication-floor.js resolves stance-key aliases the way
// stance-helpers does, so lyman's seven citations — filed under phil_lyman —
// count toward the publication floor and toward this brief.
//
// Contracts:
//   1. the four empty-lane subjects lead with the SAID brief, in full furniture
//   2. their record-first brief is gone from the letterhead, absences and all
//   3. no percentage anywhere in the identity zone for the empty class
//   4. no row is labelled RECORD or PATTERN, and none borrows the record chip
//   5. every side word comes from a cited card's own resolved stance
//   6. the cap holds at 4–6, and the overflow door names the true total
//   7. every row is a door to that issue's dossier, on the word column
//   8. chew_h68 / cox / lee keep the record-first brief and get no SAID brief
//   9. the gate refuses without positive knowledge: loading, failed, no card
//  10. the two-jobs explainer is word-first for this class only
//  11. the alias floor: lyman counts phil_lyman's citations, in a sandbox with
//      no stance-helpers.js — the one the sitemap generator actually runs
//  12. no floor moved, and the tree filter the overflow door calls exists
//
//   node scripts/test-said-brief-word-first.mjs
//
// No DB, no network, no DOM beyond gen-hero-showcase.mjs's shared stub.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m}\n    expected ${JSON.stringify(b)}\n    got      ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h == null ? "" : h).includes(n), `${m}\n    missing ${JSON.stringify(n)}`);
const hasNot = (h, n, m) => ok(!String(h == null ? "" : h).includes(n), `${m}\n    should not contain ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);

// A probe target that has been renamed away is a STALE HARNESS, not a pass.
const must = (c, m) => {
  if (c) return;
  console.error(`✗ said brief: STALE HARNESS — ${m}\n\n` +
    "  This is not a passing state. Restore the probe target, or update this\n" +
    "  harness AND re-check the honesty rule it describes.");
  process.exit(2);
};

// ── The shipped modules, in load order, in the shared sandbox ────────────────
// voting-record.js rides along because §8 needs a subject whose formal lane is
// genuinely full, and noteMember() is the only honest way to put rows there.
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
  "formal-index.js",
  "issue-colors.js",
  "consistency.js",
  "voting-record.js",
  "word-action.js",
  "stance-tree.js",
  "profile-spine.js",
  // §14's three: the evidence surface that used to list one ducked-vote card per
  // documented position. coverage.js and inventory.js ride along because gaps.js
  // reads both, and a gaps list derived without them is not the one that ships.
  "coverage.js",
  "inventory.js",
  "gaps.js",
];

function boot() {
  const win = makeSandbox();
  const ls = {};
  const store = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(ls, k) ? ls[k] : null),
    setItem: (k, v) => { ls[k] = String(v); },
    removeItem: (k) => { delete ls[k]; },
  };
  win.localStorage = store;
  win.sessionStorage = store;
  win.auth = { currentUser: null };
  win.performance = { now: () => 0 };
  // THE ROLL-CALL LANE HAS ALREADY ANSWERED, AND ANSWERED WITH NOTHING for
  // everyone the fixture does not seed. Without a truthy memberRecords() every
  // profile sits in the warming state, which is the one state this gate must
  // never be confused with — a fetch in flight is not an empty term.
  // THE MEMBER PAYLOAD LANDED, AND FOR EVERYONE THE FIXTURE DOES NOT SEED IT
  // LANDED EMPTY — an ARRAY with nothing in it, which is what memberRecords
  // documents and what the API answers for a candidate or a state legislator
  // whose roll calls are not ingested. It is deliberately not `{}`: an object
  // with no length is not a payload, the gate refuses it, and every other
  // harness in scripts/ leans on exactly that to keep its cold boot cold.
  const rec = {};
  win.PDXVotingRecord = {
    memberRecords: (pid) => rec[pid] || [],
    fetchMember: () => {},
    noteMember: (pid, rows) => { rec[pid] = rows; },
  };
  const sandbox = vm.createContext(win);
  win.__err = [];
  for (const f of FILES) {
    try { vm.runInContext(R(f), sandbox, { filename: f }); }
    catch (e) { win.__err.push(`${f}: ${e.message}`); }
  }
  // voting-record.js publishes its own namespace at load, which replaces the
  // stub. Its noteMember() is kept — it is what files rows where every reader
  // downstream looks for them — and only the two fetching entry points are
  // pinned, so nothing in the sandbox goes looking for a network.
  const VR = win.PDXVotingRecord || {};
  const note = typeof VR.noteMember === "function" ? VR.noteMember.bind(VR) : (pid, rows) => { rec[pid] = rows; };
  VR.fetchMember = () => {};
  VR.noteMember = (pid, rows) => { rec[pid] = rows; note(pid, rows); };
  VR.memberRecords = (pid) => rec[pid] || [];
  win.PDXVotingRecord = VR;
  win.__rec = rec;
  return win;
}

const W = boot();
must(W.__err.length === 0, `the engine did not load cleanly: ${W.__err.join(" | ")}`);

const CS = W.PDXConsistency;
const WA = W.PDXWordAction;
const SP = W.PDXProfileSpine;
const TREE = W.PDXStanceTree;
const CMP = W.CMP_DATA || {};

must(CS && WA && SP, "consistency.js / word-action.js / profile-spine.js no longer publish their namespaces");
must(typeof WA.heroHtml === "function", "PDXWordAction.heroHtml is gone — the letterhead cannot be rendered");
must(typeof WA.saidLeadApplies === "function",
  "PDXWordAction.saidLeadApplies is gone — the gate this file exists for is not being asked");
must(typeof WA.saidRowSet === "function" && typeof WA.saidBriefHtml === "function",
  "PDXWordAction.saidRowSet / saidBriefHtml are gone — the brief has no accessor");
must(typeof WA.SAID_EYEBROW === "string" && typeof WA.SAID_NOTE === "string" &&
     typeof WA.SAID_CAP === "number",
  "PDXWordAction.SAID_EYEBROW / SAID_NOTE / SAID_CAP are gone — the reviewed copy is not published");
must(CS.formalPatternIndex && typeof CS.formalPatternIndex.shape === "function",
  "PDXConsistency.formalPatternIndex.shape is gone — the gate's reader cannot be asked");
must(typeof CS.issueRows === "function",
  "PDXConsistency.issueRows is gone — the side words have no source");
must(typeof SP.twoJobsWordFirst === "function",
  "PDXProfileSpine.twoJobsWordFirst is gone — the explainer cannot answer which view leads");

// ── Who the fixture is ──────────────────────────────────────────────────────
// Four people with no formal term on file and cited stance cards on hand. Three
// are sitting Utah State Representatives and one is a U.S. House candidate,
// which is the point: this class is defined by an empty formal lane, not by an
// office. Any office test would have thrown the three sitting members out.
const EMPTY = ["lyman", "jackie_larson", "grant_pace", "rob_bishop"];
// Three whose letterhead may not move: a state rep with 118 measures on file, a
// governor read through the executive lane, and a senator with roll calls.
const RECORDED = ["chew_h68", "cox", "lee"];
for (const pid of EMPTY.concat(RECORDED)) {
  must(CMP[pid], `${pid} is no longer in cmp-data.js — a fixture subject is gone`);
}

const person = (pid) => Object.assign({ id: pid }, CMP[pid]);

// lee's file, seeded honestly. In a browser he is vetoed twice over — once
// before his payload lands (the lane is still coming) and once after (the vote
// chip counts) — but a sandbox cannot fetch, so the rows are put on file here
// rather than leaning on a veto the fixture cannot reproduce. Three issues,
// eight roll calls each, one of them against: a real readable pattern.
let seq = 0;
const vote = (issueKey, position) => {
  seq++;
  return {
    kind: "vote", rollcallId: 9000 + seq, measureId: 9500 + seq,
    number: "S. " + (100 + seq), date: "2025-0" + ((seq % 9) + 1) + "-11",
    action: "On Passage", position, isProcedural: false, title: "Measure " + seq,
    issues: [{ issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
    source: { url: "https://www.congress.gov/roll-call-vote/" + (9000 + seq), label: "Congress.gov" },
  };
};
const many = (n, k, p) => Array.from({ length: n }, () => vote(k, p));
const VKEYS = Object.keys(W.ISSUE_MAP || {}).filter((k) => !/_balance$/.test(k)).slice(0, 3);
must(VKEYS.length === 3, "the taxonomy no longer offers three sideable issues for the seed");
W.PDXVotingRecord.noteMember("lee", [
  ...many(8, VKEYS[0], "yea"),
  ...many(8, VKEYS[1], "nay"),
  ...many(8, VKEYS[2], "yea"),
]);
must((CS.formalPatternIndex.shape("lee") || {}).read >= 1,
  "the seeded roll calls did not reach lee's formal pattern index — §8 would pass for the wrong reason");

const hero = {};
for (const pid of EMPTY.concat(RECORDED)) hero[pid] = WA.heroHtml(pid, person(pid));

console.log("said brief / word-first letterhead");

// ── 1. the four subjects lead with the SAID brief ───────────────────────────
section("1. the empty-lane class leads with what they said");
for (const pid of EMPTY) {
  ok(WA.saidLeadApplies(pid, person(pid)), `${pid}: the SAID gate does not fire`);
  has(hero[pid], "pdxwa-brief-said", `${pid}: the letterhead carries no SAID brief`);
  has(hero[pid], WA.SAID_EYEBROW, `${pid}: the eyebrow is not the reviewed sentence`);
  has(hero[pid], "no formal term on file yet", `${pid}: the eyebrow does not name the missing side`);
  has(hero[pid], WA.SAID_NOTE, `${pid}: the honest line under the list is missing`);
  has(hero[pid], "not a voting pattern", `${pid}: the honest line does not refuse the voting reading`);
  has(hero[pid], ">SAID<", `${pid}: no row carries the SAID tag`);
  has(hero[pid], 'data-ic="on"', `${pid}: the rows lost the issue colour rail`);
  has(hero[pid], "See all ", `${pid}: the overflow door to all stated positions is missing`);
}
eq(WA.SAID_EYEBROW, "What they have said — no formal term on file yet",
  "the eyebrow copy has drifted from the reviewed sentence");
eq(WA.SAID_NOTE,
  "No roll call or signed act on file. These are documented positions, not a voting pattern.",
  "the honest line has drifted from the reviewed sentence");

// ── 2. the record-first brief is gone from their letterhead ─────────────────
section("2. three absences are not the answer to \"who is this person\"");
for (const pid of EMPTY) {
  hasNot(hero[pid], "pdxwa-brief-empty", `${pid}: still leads with the empty record brief`);
  hasNot(hero[pid], "pdxwa-shape-depth", `${pid}: still prints a formal-record depth line`);
  hasNot(hero[pid], "The formal record", `${pid}: still headlines the formal record`);
  hasNot(hero[pid], "on the formal record", `${pid}: still counts issues on an empty formal record`);
  hasNot(hero[pid], "not enough on file", `${pid}: still prints the Word vs Action shortfall`);
  hasNot(hero[pid], "record still being built", `${pid}: still kicks off with the record's absence`);
  hasNot(hero[pid], "Strongest patterns", `${pid}: claims a pattern with nothing read`);
  hasNot(hero[pid], "Ran both ways", `${pid}: claims a split with nothing read`);
}

// ── 3. no percentage on the empty class ─────────────────────────────────────
section("3. one half of Word vs Action publishes no figure");
for (const pid of EMPTY) {
  hasNot(hero[pid], "%", `${pid}: a percentage reached the letterhead`);
  hasNot(hero[pid], "Direction Match", `${pid}: Direction Match is named over an empty lane`);
  hasNot(hero[pid], "Word vs Action —", `${pid}: the compare slot published over an empty lane`);
  const set = WA.saidRowSet(pid);
  hasNot(WA.saidBriefHtml(pid, person(pid), set), "%", `${pid}: the brief itself prints a percentage`);
}

// ── 4. no row is labelled RECORD or PATTERN ─────────────────────────────────
section("4. a stated side is not a verdict, and does not dress as one");
for (const pid of EMPTY) {
  const set = WA.saidRowSet(pid);
  const html = WA.saidBriefHtml(pid, person(pid), set);
  hasNot(html, "RECORD", `${pid}: a SAID row is labelled RECORD`);
  hasNot(html, "PATTERN", `${pid}: a SAID row is labelled PATTERN`);
  hasNot(html, "🏛 Record", `${pid}: a SAID row borrows the record lane tag`);
  hasNot(html, "pdxst-pat", `${pid}: a SAID row borrows the formal-record chip`);
  hasNot(html, "data-pdxst-pat", `${pid}: a SAID row carries a pattern tier`);
  hasNot(html, "Strongly supports", `${pid}: a stated side is worded as a record pattern`);
  has(html, "pdxwa-said-pat", `${pid}: the side word is not in the word-lane chip`);
}
// The side word is house grey in every direction, so no verdict tone is
// borrowed: one class, no per-side modifier, and the stylesheet says so once.
const CSS = R("word-action.css");
must(/\.pdxwa-said-pat\s*\{/.test(CSS), "word-action.css no longer styles .pdxwa-said-pat");
ok(!/\.pdxwa-said-pat\[[^\]]*(support|oppose|mixed)/i.test(CSS),
  "the side word is styled per direction — a stated side is borrowing a verdict colour");

// ── 5. every side word comes from a cited card ──────────────────────────────
section("5. the side is read off the card, never off the party");
const WORDS = { support: "Supports", oppose: "Opposes", mixed: "Mixed" };
for (const pid of EMPTY) {
  const set = WA.saidRowSet(pid);
  const rows = CS.issueRows(pid) || [];
  const byKey = {};
  for (const r of rows) if (r && r.key) byKey[r.key] = r;
  ok(set.shown.length > 0, `${pid}: the brief has no rows to check`);
  for (const x of set.shown) {
    const r = byKey[x.key];
    ok(!!(r && r.stance && r.stance.key),
      `${pid}/${x.key}: the row has no resolved stance behind it`);
    if (!(r && r.stance)) continue;
    eq(x.side, r.stance.key, `${pid}/${x.key}: the side does not match the card's resolved stance`);
    ok(!!(r.stance.source && r.stance.source.url),
      `${pid}/${x.key}: a row was drawn from a card with no citation`);
    ok(x.sideLabel === WORDS[x.side] || x.sideLabel === (r.stance.label || ""),
      `${pid}/${x.key}: the side word is not one of Supports / Opposes / Mixed (got ${JSON.stringify(x.sideLabel)})`);
  }
}
// The gate counts citations, not cards: a subject whose only positions are
// uncited gets no SAID brief, because there would be nothing to open.
{
  const pid = EMPTY[0];
  const set = WA.saidRowSet(pid);
  eq(set.cited, set.rows.length, `${pid}: the cited count and the drawn rows disagree`);
  ok(set.stated >= set.cited, `${pid}: more citations than stated positions — the counts are crossed`);
}

// ── 6. the cap, and the door that names the true total ──────────────────────
section("6. four to six strongest, and an honest total behind them");
ok(WA.SAID_CAP >= 4 && WA.SAID_CAP <= 6,
  `the cap is ${WA.SAID_CAP}, outside the reviewed 4–6`);
for (const pid of EMPTY) {
  const set = WA.saidRowSet(pid);
  ok(set.shown.length <= WA.SAID_CAP,
    `${pid}: ${set.shown.length} rows drawn over a cap of ${WA.SAID_CAP}`);
  const html = WA.saidBriefHtml(pid, person(pid), set);
  const total = set.stated || set.cited;
  has(html, `See all ${total} position`, `${pid}: the overflow door does not name the true total`);
  // Curator order, not a re-sort: the rows are the profile's own row order.
  const keys = (CS.issueRows(pid) || [])
    .filter((r) => r && r.key && r.stance && r.stance.key && r.stance.source && r.stance.source.url)
    .map((r) => r.key).slice(0, WA.SAID_CAP);
  eq(set.shown.map((x) => x.key).join(","), keys.join(","),
    `${pid}: the brief re-ordered the cited cards instead of keeping the profile's order`);
}
// One subject on each side of the cap, so both branches are exercised.
{
  const over = EMPTY.filter((pid) => WA.saidRowSet(pid).cited > WA.SAID_CAP);
  ok(over.length > 0, "no fixture subject exceeds the cap — the overflow branch is untested");
  for (const pid of over) {
    has(WA.saidBriefHtml(pid, person(pid), WA.saidRowSet(pid)), "pdxwa-shape-more",
      `${pid}: more cited cards than rows shown, and no line saying so`);
  }
}

// ── 7. every row is a door to that issue's dossier ──────────────────────────
section("7. each row opens the issue, on the word column");
for (const pid of EMPTY) {
  const set = WA.saidRowSet(pid);
  const html = WA.saidBriefHtml(pid, person(pid), set);
  for (const x of set.shown) {
    has(html, `data-pdxst-dos="${x.key}"`, `${pid}/${x.key}: the row is not a dossier door`);
  }
  has(html, `data-pdxst-pid="${pid}"`, `${pid}: the doors do not carry the subject`);
  has(html, "data-pdxst-origin=", `${pid}: the doors have no return anchor`);
  // No formal focus: 'record' would land a person with no record on the one
  // panel that has nothing in it, so the sheet opens at the top, on what they
  // said. There is no 'word' focus to ask for and none was invented.
  hasNot(html, "data-pdxst-focus", `${pid}: a SAID row asks the dossier for a formal panel`);
  has(html, "pdxst-open", `${pid}: the row label is not the dossier's own opener`);
}

// ── 8. the record-first files do not move ───────────────────────────────────
section("8. a file with a record still leads with the record");
for (const pid of RECORDED) {
  ok(!WA.saidLeadApplies(pid, person(pid)), `${pid}: the SAID gate fired over a real record`);
  hasNot(hero[pid], "pdxwa-brief-said", `${pid}: a SAID brief reached the letterhead`);
  hasNot(hero[pid], WA.SAID_EYEBROW, `${pid}: the SAID eyebrow reached the letterhead`);
  hasNot(hero[pid], WA.SAID_NOTE, `${pid}: the SAID note reached the letterhead`);
  hasNot(hero[pid], ">SAID<", `${pid}: a SAID tag reached the letterhead`);
  has(hero[pid], "pdxwa-brief", `${pid}: the record brief is gone from the letterhead`);
  has(hero[pid], "🏛", `${pid}: the record brief lost its lane mark`);
}
has(hero.lee, "Strongest patterns", "lee: the seeded pattern is not reported");
has(hero.cox, "pdxwa-brief-empty", "cox: the reviewed one-line empty brief is gone");
has(hero.chew_h68, "pdxwa-brief-empty", "chew_h68: the reviewed one-line empty brief is gone");

// ── 9. the gate refuses without positive knowledge ──────────────────────────
section("9. demoting the record takes knowing, not guessing");
ok(!WA.saidLeadApplies("", null), "the gate fires on an empty pid");
ok(!WA.saidLeadApplies("no_such_person_at_all", { id: "no_such_person_at_all" }),
  "the gate fires on a pid with no identity");
{
  // A LANE STILL IN FLIGHT IS NOT AN EMPTY LANE, and this is how lee's own
  // profile behaves in a browser: the head's prefetch box names him, his member
  // payload has not been filed yet, and every reader downstream reads zero rows
  // for a senator who has thousands. The gate must sit down on that state, not
  // promote his stance cards over a record that is two hundred milliseconds away.
  const cold = boot();
  must(cold.__err.length === 0, `the cold sandbox did not load: ${cold.__err.join(" | ")}`);
  cold.__pdxVRPrefetch = { pid: "lee" };
  cold.PDXVotingRecord.memberRecords = () => null;
  const CWA = cold.PDXWordAction;
  ok(!CWA.saidLeadApplies("lee", Object.assign({ id: "lee" }, cold.CMP_DATA.lee)),
    "lee: the gate fires while the roll-call lane is still unanswered");
  has(CWA.heroHtml("lee", Object.assign({ id: "lee" }, cold.CMP_DATA.lee)), "pdxwa-brief",
    "lee: nothing at all is printed while his record is in flight");
}
{
  // AND A LANE THAT FAILED IS NOT AN EMPTY LANE EITHER. briefWaitOver() counts an
  // expired 6s deadline as "the wait is over", which is right for the record's
  // own sentence — "it did not load, reload to try again" — and wrong here: a
  // fetch that never came back says nothing about whether a term exists, so it
  // may not buy a word-first letterhead. The give-up flag is set by a timer and
  // exported to nobody, so this refusal is checked where it is written: the gate
  // asks briefGaveUp itself, over and above the empty-file door.
  const SRC = R("word-action.js");
  const gate = (SRC.match(/function saidLead\(pid, p\) \{[\s\S]*?\n  \}/) || [])[0];
  must(!!gate, "saidLead() is not in word-action.js under that name — the gate cannot be read");
  has(gate, "briefEmptyLegal(pid)",
    "the gate does not ask whether this file may be called empty at all");
  has(gate, "briefGaveUp(pid)",
    "the gate does not refuse a record that failed to load");
  has(gate, "saidNoTerm(pid)",
    "the gate no longer asks whether a formal term exists to test — a real record could take the word-first brief");
  // AND WHAT saidNoTerm ITSELF MAY WEIGH. The rule is the ACTS: characterised
  // reads and judged items, both zero, and every row on the index inert. It may
  // not turn on `read`, because a row reads `true` off the browse lane's
  // published tier — a characterisation quoted from the member's own stated
  // positions — and letting that hold the record-first letterhead is the defect
  // this brief was filed over: one unread mapped issue outranking seven sourced
  // sentences.
  const noterm = (SRC.match(/function saidNoTerm\(pid\) \{[\s\S]*?\n  \}/) || [])[0];
  must(!!noterm, "saidNoTerm() is not in word-action.js under that name — the predicate cannot be read");
  has(noterm, "sh.characterised", "saidNoTerm does not refuse a characterised read");
  has(noterm, "sh.judged", "saidNoTerm does not refuse judged formal acts");
  has(noterm, "saidRowInert", "saidNoTerm does not test the rows it is counting");
  ok(noterm.indexOf("sh.read") === -1,
    "saidNoTerm turns on sh.read — a read quoted from stated positions is not evidence of a formal term");
  const inert = (SRC.match(/function saidRowInert\(x\) \{[\s\S]*?\n  \}/) || [])[0];
  must(!!inert, "saidRowInert() is not in word-action.js under that name — the row test cannot be read");
  has(inert, "x.judged", "saidRowInert does not read the acts the index weighed on the row");
  has(inert, "pending", "saidRowInert calls a row that is still loading inert");
  ok(gate.indexOf("office") === -1 && gate.indexOf("status") === -1,
    "the gate reads an office or a status — this class is an empty formal lane, and three of its four subjects are sitting state representatives");
}
{
  // NO CITED CARD IS NO BRIEF, whatever the formal lane says: there would be
  // nothing to open and nothing to cite. Swept over the front of the roster so
  // the rule is checked on people this feature was never about.
  const bare = EMPTY.every((pid) => WA.saidRowSet(pid).cited > 0);
  ok(bare, "a fixture subject has no cited card — §1 would be passing vacuously");
  const silent = Object.keys(CMP).filter((pid) => WA.saidRowSet(pid).cited === 0).slice(0, 40);
  ok(silent.length > 0, "no stance-silent profile in the roster — the refusal is untested");
  for (const pid of silent) {
    ok(!WA.saidLeadApplies(pid, person(pid)),
      `${pid}: the gate fired with no cited position to show`);
  }
}

// ── 10. the two-jobs explainer, word-first for this class only ──────────────
section("10. Word is the main view until a term exists");
for (const pid of EMPTY) {
  ok(SP.twoJobsWordFirst(pid, person(pid)),
    `${pid}: the two-jobs explainer still calls the record the main view`);
}
for (const pid of RECORDED) {
  ok(!SP.twoJobsWordFirst(pid, person(pid)),
    `${pid}: the two-jobs explainer went word-first over a real record`);
}
ok(!SP.twoJobsWordFirst("", null), "the explainer's word-first switch fires with no subject");

// ── 11. the alias floor, in the sandbox the sitemap actually runs ───────────
section("11. one person, two keys, one publication decision");
{
  // gen-sitemap.mjs loads exactly these five files in a bare vm — no
  // stance-helpers.js, so no STANCE_ALIASES global. That is why the floor's own
  // hop chain has to include the display-name slug: it is the only hop that can
  // reach phil_lyman's cards from the roster id lyman in this context.
  const nw = { document: {} };
  nw.window = nw;
  const ns = vm.createContext(nw);
  for (const f of ["cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
                   "formal-index.js", "publication-floor.js"]) {
    try { vm.runInContext(R(f), ns, { filename: f }); }
    catch (e) { must(false, `${f} does not load in the sitemap's sandbox: ${e.message}`); }
  }
  const PF = nw.PDXPublicationFloor;
  must(PF && typeof PF.read === "function", "PDXPublicationFloor.read is gone");
  must(typeof PF._stanceList === "function",
    "PDXPublicationFloor._stanceList is gone — the alias hop chain has no accessor");
  ok(!nw.STANCE_ALIASES, "stance-helpers leaked into the sitemap sandbox — §11 proves nothing");
  const cards = (nw.ISSUE_STANCE_DATA || {}).phil_lyman || [];
  const cited = cards.filter((c) => c && c.source && c.source.url).length;
  must(cited >= 2, "phil_lyman's cards lost their citations — the alias case is untestable");
  const read = PF.read("lyman");
  eq(read.cited, cited, "lyman: the floor does not count phil_lyman's cited cards");
  ok(read.publishable, `lyman: still fails the publication floor (${read.reasons.join(", ")})`);
  eq(PF._stanceList("lyman", null) === ((nw.ISSUE_STANCE_DATA || {}).phil_lyman || null), true,
    "lyman: the hop chain does not land on phil_lyman's list");
  // The hop is a resolution, not a fallback that guesses: an id with no direct
  // list, no alias and no matching name slug still reads nothing.
  eq(PF._stanceList("no_such_person_at_all", null), null,
    "the hop chain invents a stance list for an unknown id");
  eq(PF.read("no_such_person_at_all").publishable, false,
    "the floor publishes an id with no identity and no content");
}

// ── 12. no floor moved, and the overflow door has somewhere to go ───────────
section("12. nothing was lowered to make this fit");
{
  const nw = { document: {} };
  nw.window = nw;
  const ns = vm.createContext(nw);
  for (const f of ["cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
                   "formal-index.js", "publication-floor.js"]) vm.runInContext(R(f), ns, { filename: f });
  eq(nw.PDXPublicationFloor.MIN_CITED_POSITIONS, 2,
    "the publication floor's cited minimum moved");
}
must(TREE && typeof TREE.showFilter === "function",
  "PDXStanceTree.showFilter is gone — the overflow door calls a function that does not exist");
has(WA.saidBriefHtml(EMPTY[0], person(EMPTY[0]), WA.saidRowSet(EMPTY[0])),
  "showFilter('stance')", "the overflow door does not ask the tree for the stated view");
ok(TREE.showFilter("stance", null) === false,
  "showFilter claims a hit with no document to work on");
ok(TREE.showFilter("not_a_filter_at_all", null) === false,
  "showFilter throws or claims a hit on an unknown filter key");

// ── 13. an unread crumb is not a term ───────────────────────────────────────
// THE REPORTED STATE, REPRODUCED. /p/lyman mounted the record-first brief over
// "1 issue on the formal record · 0 votes and formal actions read · 0 deep
// enough to characterise" — a formal pattern index holding exactly one row that
// no act stands behind. Two things put a row there: a curated official action
// with no measure named (lyman's, now off the backfill — see the note in
// consistency.js), and a row the index reads off the browse lane's published
// tier, which is a characterisation quoted from the member's OWN STATED
// POSITIONS. The second is the one that cannot be fixed in the data, and it is
// why the gate no longer asks `read` at all: a read borrowed from the word lane
// is not evidence of a formal term, and one of them may not outrank seven
// sourced sentences.
section("13. an unread crumb is not a term");
{
  const cr = boot();
  must(cr.__err.length === 0, `the crumb sandbox did not load: ${cr.__err.join(" | ")}`);
  const CWA = cr.PDXWordAction;
  const FPI = cr.PDXConsistency.formalPatternIndex;
  const realShape = FPI.shape, realRows = FPI.rows;
  const SUBJ = "grant_pace";
  const subj = Object.assign({ id: SUBJ }, cr.CMP_DATA[SUBJ]);
  const stub = (shape, rows) => {
    FPI.shape = (pid) => (pid === SUBJ ? shape : realShape(pid));
    FPI.rows = (pid) => (pid === SUBJ ? rows : realRows(pid));
  };
  must(CWA.saidLeadApplies(SUBJ, subj),
    "the crumb fixture does not take the SAID brief with an empty index — §13 would prove nothing");

  // ONE ROW, READ OFF THE WORD LANE, NO ACT BEHIND IT. The exact reported shape.
  stub({ issues: 1, read: 1, judged: 0, characterised: 0, strongN: 0, splitN: 0,
         readThinN: 1, readOtherN: 0, thinN: 0, tailN: 1, tops: [], splits: [] },
       [{ key: "lands_local", tier: "thin", judged: 0, read: true, deferred: true,
          held: 1, why: null, displayTier: "thin" }]);
  ok(CWA.saidLeadApplies(SUBJ, subj),
    "one row read off the browse lane, with no judged act behind it, still outranks the word lane");
  hasNot(CWA.heroHtml(SUBJ, subj), "issue on the formal record",
    "the depth line still prints its three zeroes over a file with no formal term");
  hasNot(CWA.heroHtml(SUBJ, subj), "%",
    "a percentage reached the letterhead on a file with one half of Word vs Action");

  // AN UNREAD, NO-SIDE ROW WITH ITEMS ON FILE. lyman's own shape before the
  // backfill entry came off: held 1, judged 0, no direction claimed.
  stub({ issues: 1, read: 0, judged: 0, characterised: 0, strongN: 0, splitN: 0,
         readThinN: 0, readOtherN: 0, thinN: 1, tailN: 1, tops: [], splits: [] },
       [{ key: "lands_local", tier: "unread", judged: 0, read: false, held: 1,
          why: { id: "no_side" }, displayTier: "" }]);
  ok(CWA.saidLeadApplies(SUBJ, subj),
    "one unread no-side row with nothing judged on it still holds the record-first letterhead");

  // AND THE THREE REFUSALS. A judged act, a characterised read, and a row that is
  // still loading each keep the record first — the widening may not swallow any
  // of them.
  stub({ issues: 1, read: 1, judged: 3, characterised: 0, strongN: 0, splitN: 0,
         readThinN: 1, readOtherN: 0, thinN: 0, tailN: 1, tops: [], splits: [] },
       [{ key: "lands_local", tier: "thin", judged: 3, read: true, held: 3, why: null }]);
  ok(!CWA.saidLeadApplies(SUBJ, subj),
    "three judged acts on one row were treated as an inert crumb");
  stub({ issues: 1, read: 1, judged: 8, characterised: 1, strongN: 1, splitN: 0,
         readThinN: 0, readOtherN: 0, thinN: 0, tailN: 0, tops: [], splits: [] },
       [{ key: "lands_local", tier: "strong", judged: 8, read: true, held: 8, why: null }]);
  ok(!CWA.saidLeadApplies(SUBJ, subj),
    "a characterised read was demoted by the word lane");
  stub({ issues: 1, read: 0, judged: 0, characterised: 0, strongN: 0, splitN: 0,
         readThinN: 0, readOtherN: 0, thinN: 1, tailN: 1, tops: [], splits: [] },
       [{ key: "lands_local", tier: "unread", judged: 0, read: false, held: 1,
          why: { id: "pending" }, displayTier: "" }]);
  ok(!CWA.saidLeadApplies(SUBJ, subj),
    "a row that says it is still loading was read as an empty formal lane");
  FPI.shape = realShape;
  FPI.rows = realRows;
}
{
  // AND THE MAPPING GHOST ITSELF. lyman's one "formal issue" was a Ballotpedia
  // biography line — "pressed the same public-lands themes in legislation",
  // 2019–2024, no measure, no vote, no date — carried into the formal pattern
  // index by an official-action backfill entry whose own rule excludes
  // pattern-summary items. It is off the map, and the item is still in the
  // spotlight data where it always was.
  const cs = R("consistency.js");
  ok(cs.indexOf("'lyman||carried his public lands fight from protest into the statehouse': 'lands_local'") === -1,
    "the lyman public-lands narrative is mapped as a formal action again — one biography line, one 'issue on the formal record'");
  has(R("acct-spotlight-data.js"), "Carried his public-lands fight from protest into the statehouse",
    "the spotlight item itself was deleted — the fix was to stop claiming it as an act, not to drop the material");
  eq((CS.formalPatternIndex.shape("lyman") || {}).issues, 0,
    "lyman's formal pattern index still lists a row");
}

// ── 14. the evidence surface does not bill a position as a ducked vote ──────
// SEVEN OPEN GAPS, EACH WITH A ＋ SUGGEST A LEAD BUTTON, on a file with no seat:
// "No action on file — 🏠 Housing Affordability", "No action on file — 💧 Water
// Conservation", and so on down the list. Every one of them was OUR homework
// stated as THEIR omission, and no lead could ever close one: there is no vote
// to find. One band, one sentence, and the positions stay open in the ✒️ brief.
section("14. the evidence surface states the absent term once");
const GAPS = W.PDXGaps;
must(GAPS && typeof GAPS.forPolitician === "function" && typeof GAPS.sectionHtml === "function",
  "PDXGaps.forPolitician / sectionHtml are gone — the evidence surface cannot be asked");
must(GAPS.TYPES && GAPS.TYPES.no_formal_term,
  "PDXGaps.TYPES.no_formal_term is gone — the collapsed band has no taxonomy entry");
ok(GAPS.TYPES.no_formal_term.askable === false,
  "the no-formal-term band is askable — it would carry a ＋ Suggest a lead for an act that cannot exist");
for (const pid of EMPTY) {
  const gaps = GAPS.forPolitician(pid, person(pid));
  const ducked = gaps.filter((g) => g.type === "no_action_yet");
  const band = gaps.filter((g) => g.type === "no_formal_term");
  eq(ducked.length, 0, `${pid}: the evidence surface still lists one ducked-vote card per position`);
  eq(band.length, 1, `${pid}: the absent formal term is not stated once`);
  const n = WA.saidRowSet(pid).cited;
  eq(band[0].label,
    `No formal term to test yet — ${n} documented ${n === 1 ? "position" : "positions"}, 0 acts on file.`,
    `${pid}: the one sentence is not the reviewed one, or its count disagrees with the letterhead`);
  const sec = GAPS.sectionHtml(pid, person(pid));
  has(sec, band[0].label, `${pid}: the section does not print the sentence`);
  hasNot(sec, "No action on file —", `${pid}: a "No action on file" row survives in the section`);
  hasNot(sec, "Held by the method", `${pid}: the sentence was filed under our own method holding material out`);
}
{
  // NOT A ROUTE ROUND THE GAP PANEL FOR EVERYONE. chew_h68's record is in the
  // shipped index rather than in this index's rows, so a predicate built on the
  // rows alone would call their file termless and swallow five real gaps. The
  // empty-file door is what stops it, and this is the check that says so.
  for (const pid of RECORDED) {
    const gaps = GAPS.forPolitician(pid, person(pid));
    eq(gaps.filter((g) => g.type === "no_formal_term").length, 0,
      `${pid}: a file with a record on hand was handed the no-formal-term band`);
  }
  has(GAPS.sectionHtml("chew_h68", person("chew_h68")), "No action on file —",
    "chew_h68's real per-issue gaps were collapsed away with the class that has no term");
}

// ── Verdict ─────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ said brief: ${failures.length} failed, ${passed} passed\n`);
  for (const f of failures) console.error(`  · ${f}`);
  process.exit(1);
}
console.log(`✓ said brief: ${passed} checks passed`);
