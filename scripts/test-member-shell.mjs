#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// ONE SHELL, TWO LANES: a member profile is the same product as an executive one
// ─────────────────────────────────────────────────────────────────────────────
// A congressional member and a president answer the same question — "do they stand
// by what they said?" — and until this pass they answered it with two different
// products. The executive profile led with ⚖️ Word vs Action: Direction Match, the
// shape strip, one bucket of issues at a time, formal and public lanes on every
// row, a dossier behind each. The member profile led with the "Candidate Snapshot",
// a card that got there first and answered the same question in its own words: its
// own distribution strip, its own per-issue list with a THIRD verdict vocabulary
// (Match / Partial / Mismatch), its own navigation index of jump chips, and a
// promise-building scoreboard ("Promise record: Building"). ⚖️ Word vs Action then
// rendered underneath and said it all again, in the shared four-bucket words.
//
// The shared section was never the problem — it already renders identically on both
// lanes. The member-only furniture wrapped around it was. This harness gates the
// unification, and it is deliberately split:
//
//   1. THE RETIRED SURFACES CANNOT COME BACK — source assertions over profiles-full.js
//      and app.css, so a re-mount fails here and not in a reader's face.
//   2. THE CARD IS DEMOTED, NOT DELETED — it still mounts, still gated the same way,
//      but BELOW the shared section, and it now carries only what the shell cannot
//      derive: WHY the record is thin.
//   3. ONE SHELL ON BOTH LANES — the same markers on an executive and on members,
//      rendered through the shipped renderer on real data.
//   4. MEMBER ROLL-CALL WARMTH REACHES THE SHELL — driven with a stub, because the
//      member formal lane is an API in a live browser and cold in a sandbox.
//   5. THE HONEST THIN STATE — no strip and no bucket index when nothing can be
//      browsed by outcome, and "limited record" said in words instead.
//   6. THE EXECUTIVE PATH IS UNTOUCHED — the card returns nothing for a president,
//      and the exec section keeps every marker it had.
//   7. ONE VOCABULARY — no member-only word for an outcome the four buckets name.
//
//   node scripts/test-member-shell.mjs
//
// Subjects: `trump` (executive lane); `massie` and `mike_johnson` (member lane, two
// shapes of real data); `khanna` (member lane, warmed with stub roll-calls);
// `sarah_mcbride` (member lane, formal record settled and empty — the honest thin
// state). No database, no network, no DOM beyond gen-hero-showcase.mjs's stub.

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
  "controversies.js",
  "profile-card.js",
  "profile-spine.js",
  // The limited-record card lives here and publishes itself as a window global, so
  // the demoted card can be rendered directly rather than inferred from source.
  "profiles-full.js",
];

const win = makeSandbox();
const sandbox = vm.createContext(win);
win.PROFILES = win.CMP_DATA;
for (const f of FILES) vm.runInContext(R(f), sandbox, { filename: f });
win.PROFILES = win.CMP_DATA;

const CS = win.PDXConsistency;
const WA = win.PDXWordAction;
// Source scans run over CODE, not commentary. Every retired surface left a comment
// behind saying what it was and why it went — that is the point of the comments — so
// matching raw source would fail on its own tombstones. Strip them first: a mount can
// only come back as code.
const stripBlockComments = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, " ");
const stripJsComments = (s) => stripBlockComments(s)
  // Line comments, and the HTML comments the profile body uses inside its template.
  .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ")
  .replace(/<!--[\s\S]*?-->/g, " ");

const PF_RAW = R("profiles-full.js");
const PF = stripJsComments(PF_RAW);
const CSS = stripBlockComments(R("app.css"));

const PRES = "trump";
const MEMBERS = ["massie", "mike_johnson"];
const WARM_ID = "khanna";
const THIN_ID = "sarah_mcbride";

let pass = 0;
const fails = [];
function ok(cond, msg) { if (cond) pass++; else fails.push(msg); }
function eq(a, b, msg) {
  if (a === b) pass++;
  else fails.push(`${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
}
function must(cond, msg) {
  if (cond) { pass++; return; }
  console.error(`\n✗ member-shell harness is STALE — a contract cannot be verified:\n  ${msg}\n`);
  process.exit(1);
}
function has(hay, needle, msg) {
  ok(String(hay == null ? "" : hay).toLowerCase().indexOf(String(needle).toLowerCase()) !== -1, msg);
}
function lacks(hay, needle, msg) {
  ok(String(hay == null ? "" : hay).toLowerCase().indexOf(String(needle).toLowerCase()) === -1, msg);
}
const text = (h) => String(h || "")
  .replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ");
function section(n) { console.log(`\n${n}\n`); }

must(CS && WA, "the modules under test did not load");
must(typeof win._renderCandidateSnapshot === "function",
  "profiles-full.js no longer publishes the limited-record card as window._renderCandidateSnapshot");
must(typeof WA.sectionHtml === "function", "word-action.js no longer exports sectionHtml");
must(win.CMP_DATA[PRES] && MEMBERS.every((m) => win.CMP_DATA[m]) && win.CMP_DATA[WARM_ID] && win.CMP_DATA[THIN_ID],
  "one of the subjects is not in the bundled roster");

// The profile body, isolated once — the mount-order assertions read this slice, and
// they read it RAW: the stage sentinels are HTML comments, so a stripped body has no
// verdict stage to order against.
const BODY_AT = PF_RAW.indexOf("const _profileBody = ");
must(BODY_AT !== -1, "the profile body template moved");
const BODY = PF_RAW.slice(BODY_AT);
must(BODY.length > 5000, "the isolated profile body is implausibly short");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the retired surfaces cannot come back");
// ═════════════════════════════════════════════════════════════════════════════

// The card's own navigation index — a row of jump chips ("Positions", "Your match",
// "Spotlight") that duplicated the sticky rail and competed with the issue index for
// the same job. Two navigation models on one page is one too many.
ok(!/cs-map-chip|cs-map-row|_csJump|mapChips/.test(PF),
  "the Snapshot's jump-chip index is mounted again — the profile is back to two navigation\n" +
  "    models, and neither of them is the shape strip the reader is told to tap");
ok(!/\.cs-map/.test(CSS),
  "app.css still styles .cs-map* — the rules outlived the markup and will dress the next\n" +
  "    thing that reaches for those class names");

// The card's own distribution strip. The shape strip in ⚖️ Word vs Action IS the
// distribution, in the four locked bucket colours, and it is the control that opens
// the buckets. A second strip a screen below it, in different colours, over a
// different denominator, is the exact confusion this pass removed.
ok(!/cs-dist-chip|cs-dist-you/.test(PF),
  "the Snapshot's distribution strip is back — a second shape over the same positions,\n" +
  "    in a palette the four buckets do not use");
ok(!/\.cs-dist/.test(CSS), "app.css still styles the retired .cs-dist* strip");

// The card's own per-issue list, with its own source tags and its own verdict words.
// The issue rows carry the formal and public lanes with the shared disclosure rules;
// the per-issue match verdict belongs to How You Compare.
ok(!/_csPositionRow|cs-pos-list|cs-pos-badge|cs-pos-legend|cs-pos-more/.test(PF),
  "the Snapshot's per-issue position list is back — the same issues, listed twice on one\n" +
  "    profile, with two different verdicts available for the same row");
ok(!/\.cs-pos-list|\.cs-pos-badge|\.cs-pos-legend|\.cs-pos-more|\.cs-pos-intro/.test(CSS),
  "app.css still styles the retired per-issue list");
ok(!/cs-src-rec|cs-src-stated/.test(PF),
  "the Snapshot's own Recorded/Stated source tags are back — the formal-vs-public\n" +
  "    disclosure belongs to the issue rows, which say it the same way on both lanes");
ok(!/\.cs-src-rec|\.cs-src-stated/.test(CSS), "app.css still styles the retired source tags");
ok(!/cs-vd-match|cs-vd-partial|cs-vd-mismatch/.test(PF),
  "the Snapshot's per-issue Match/Partial/Mismatch verdicts are back — a third vocabulary\n" +
  "    for an issue's standing, a few hundred pixels under the four locked buckets");
ok(!/\.cs-vd-match|\.cs-vd-partial|\.cs-vd-mismatch/.test(CSS),
  "app.css still styles the retired per-issue verdict pills");
ok(!/cs-stance-badge|cs-b-support|cs-b-oppose|cs-b-priority/.test(PF + CSS),
  "the Snapshot's support/oppose/mixed stance badges are back in the markup or the stylesheet");

// The promise-building scoreboard. Pledges are a weighted tier INSIDE Word vs Action;
// a "Promise record: Building" fact is a second, softer answer to the one question.
ok(!/Promise record/.test(PF),
  "the Snapshot's \"Promise record\" fact is back — a second read on kept-and-broken word,\n" +
  "    stated as a status instead of tested against the record");
ok(!/Kept-and-broken promises/.test(PF),
  "the card promises a kept/broken tally again in its \"what we're gathering\" list");
ok(!/Vote\/bill-backed|Issue positions:/.test(PF),
  "the card is counting coverage again — how much of the word the record tests is the\n" +
  "    shared section's denominator, said once");

// And the name. "Candidate Snapshot" framed the card as the profile's summary; it is
// not one any more, and sitting members are not candidates.
ok(!/Candidate Snapshot/.test(PF),
  "the card calls itself the Candidate Snapshot again — the name claims the summary slot\n" +
  "    that Direction Match now holds on both lanes");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the card is demoted, not deleted");
// ═════════════════════════════════════════════════════════════════════════════

const SECTION_AT = BODY.indexOf("PDXWordAction.sectionHtml(id, p)");
const CARD_AT = BODY.indexOf("${candidateSnapshot || thinNotice}");
const VERDICT_AT = BODY.indexOf("<!--PDXSP:verdict-->");
must(SECTION_AT !== -1, "the shared ⚖️ Word vs Action mount moved out of the profile body");
must(CARD_AT !== -1, "the limited-record card is no longer mounted in the profile body at all");
must(VERDICT_AT !== -1, "the verdict stage sentinel moved");

ok(VERDICT_AT < SECTION_AT && SECTION_AT < CARD_AT,
  "the limited-record card mounts before ⚖️ Word vs Action again — first thing on a thin\n" +
  "    member is then the member-only card, which is what made the two lanes read as two\n" +
  "    products; it must sit UNDER the shared section, inside the same verdict stage");

// The spine restages the body by sentinel, so "under the section" is only true while
// the card is still inside the VERDICT stage — tagged into another stage it would
// reappear a stage away from the thing it exists to explain. The verdict stage is
// no longer one contiguous run of the file: the topic tree was promoted in front of
// the score without leaving the neighbourhood, so the body re-declares the verdict
// after it. What matters is the sentinel GOVERNING the card, not the distance to
// the next one.
const stageOf = (at) => {
  const tags = BODY.slice(0, at).match(/<!--PDXSP:([a-z0-9:_-]+)-->/g) || [];
  return tags.length ? tags[tags.length - 1].replace(/<!--PDXSP:|-->/g, "") : "identity";
};
eq(stageOf(CARD_AT), "verdict",
  "the limited-record card fell out of the verdict stage — the spine will restage it away\n" +
  "    from the section whose gap it exists to explain");
eq(stageOf(SECTION_AT), "verdict",
  "⚖️ Word vs Action is no longer tagged into the verdict stage, so the card and the section\n" +
  "    it explains can now be separated by the assembler");

// One mount, not two: a card that renders in both places is worse than either.
eq(BODY.split("${candidateSnapshot || thinNotice}").length - 1, 1,
  "the limited-record card is mounted more than once in the profile body");

// Demoted, but not quietly dropped: the gate is unchanged, and the plain notice is
// still the fallback, so a thin profile is never left with no explanation at all.
ok(/candidateSnapshot \|\| thinNotice/.test(BODY),
  "the thin-notice fallback is gone — a profile whose card fails to render now explains\n" +
  "    nothing about why its record is empty");
ok(/_renderCandidateSnapshot\(id, p, \{ isThin: _isThinProfile \}\)/.test(PF),
  "the card's gate changed — it must still be _isThinProfile, so this pass moved the card\n" +
  "    without changing who sees it");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · one shell on both lanes");
// ═════════════════════════════════════════════════════════════════════════════

// The markers that make the shell the shell. Each is one of the seven things the
// brief said a member profile must present in the same order an executive does.
const SHELL = [
  ["Direction match", "the Direction Match framing"],
  ["The shape behind the average", "the shape strip's own heading"],
  ['class="pdxwa-comp-b"', "the shape strip itself"],
  ["data-pdxwa-seg=", "the strip/switcher gateway that opens a bucket"],
  ['class="pdxwa-oc"', "the issue index"],
  ["data-pdxwa-oc-panel=", "the one-bucket-at-a-time panels"],
  ["data-pdxwa-dos=", "the dossier door on an issue row"],
  ["data-pdxwa-pub=", "the public lane on an issue row"],
];

const execHtml = WA.sectionHtml(PRES, win.CMP_DATA[PRES]) || "";
must(execHtml.length > 5000, "the executive subject no longer renders a ⚖️ Word vs Action section");

SHELL.forEach(([needle, what]) => {
  has(execHtml, needle, `executive lane (${PRES}) lost ${what}`);
});

// massie has enough settled rows for the whole shell; mike_johnson is the shape whose
// ranked rows lead with a real contradiction. Both are members, neither is warmed.
const memberHtml = {};
MEMBERS.forEach((id) => { memberHtml[id] = WA.sectionHtml(id, win.CMP_DATA[id]) || ""; });
must(memberHtml.massie.length > 5000, "the member subject no longer renders a ⚖️ Word vs Action section");

SHELL.forEach(([needle, what]) => {
  has(memberHtml.massie, needle,
    `member lane (massie) is missing ${what} — the two lanes are diverging again`);
});

// The bucket words are one published vocabulary. A member must be told the same four
// things a president is, in the same words.
["Contradicted", "Mixed", "Backed up", "Not enough on file"].forEach((word) => {
  has(execHtml, word, `the executive index dropped the "${word}" bucket`);
  has(memberHtml.massie, word, `the member index dropped the "${word}" bucket — the shared\n` +
    `    four-outcome vocabulary is not shared any more`);
});

// One bucket open at a time, on both lanes. Not zero (nothing to read), not all
// (the fold this pass replaced).
const openCount = (h) => (h.match(/pdxwa-oc-grp is-on/g) || []).length;
eq(openCount(execHtml), 1, "the executive index does not open exactly one bucket");
eq(openCount(memberHtml.massie), 1, "the member index does not open exactly one bucket");
eq(openCount(memberHtml.mike_johnson), 1,
  "the member index with a real contradiction does not open exactly one bucket");

// The formal lane keeps its member-specific reality — a member's test is a roll-call
// vote, an executive's is a formal action — while everything around it stays shared.
has(text(memberHtml.massie), "vote", "the member's formal lane stopped naming votes — the one\n" +
  "    thing that is legitimately member-specific is the vocabulary of the formal record");
lacks(text(execHtml), "roll-call vote", "the executive section picked up member vote vocabulary");

// The public lane discloses the same way on both lanes: sourced, separate, and never
// folded into the score.
has(execHtml, "Not in Direction Match", "the executive rows stopped disclosing that the public\n" +
  "    lane is outside the score");
has(memberHtml.massie, "Not in Direction Match",
  "the member rows stopped disclosing that the public lane is outside the score — the\n" +
  "    disclosure rule must not depend on which office the subject holds");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · member roll-call warmth reaches the shared shell");
// ═════════════════════════════════════════════════════════════════════════════

// The member formal lane is /api/voting-record — warm in a browser, absent here. The
// cold sandbox is why a member's rows read "pending" above; stubbing the feed is the
// only way to assert that real member roll-call data lands in the shared shell rather
// than in some member-only rendering of it.
must(win.PDXVotingRecord && typeof win.PDXVotingRecord.memberRecords === "function",
  "voting-record.js no longer exposes memberRecords — the member formal lane cannot be driven");
must(typeof win.PDXDataChanged === "function", "the derivation epoch is gone; memos cannot be busted");

const warmKeys = (CS.issueRows(WARM_ID) || []).map((r) => r.key).filter(Boolean).slice(0, 6);
must(warmKeys.length >= 4, "the warm subject has too few issue rows to drive the formal lane");

const realMemberRecords = win.PDXVotingRecord.memberRecords;
const stubbed = [];
warmKeys.forEach((k, i) => {
  [0, 1].forEach((j) => {
    const n = stubbed.length + 1;
    stubbed.push({
      id: "rc" + n, kind: "vote", position: (i + j) % 2 ? "Nay" : "Yea",
      billTitle: "Test measure " + n, billNumber: "H.R. " + (100 + n),
      question: "On Passage", date: "2025-03-0" + ((n % 9) + 1),
      issues: [{ issueKey: k, supportMeaning: "support", weight: 100 }],
      sourceUrl: "https://clerk.house.gov/Votes/2025" + n,
    });
  });
});
win.PDXVotingRecord.memberRecords = (id) => (id === WARM_ID ? stubbed : realMemberRecords(id));
win.PDXDataChanged();

const warmRows = CS.issueRows(WARM_ID) || [];
ok(warmRows.some((r) => r.verdict && r.verdict.token !== "pending"),
  "a member's rows stay \"pending\" after the roll-call feed answers — the shared shell would\n" +
  "    then never settle on a member profile no matter how much record exists");
ok(warmRows.some((r) => r.actions && r.actions.count > 0),
  "warmed roll-calls do not reach the issue row's formal lane");

const warmHtml = WA.sectionHtml(WARM_ID, win.CMP_DATA[WARM_ID]) || "";
must(warmHtml.length > 5000, "the warmed member renders no section at all");
[['class="pdxwa-comp-b"', "the shape strip"], ['class="pdxwa-oc"', "the issue index"],
 ["data-pdxwa-seg=", "the bucket gateway"], ["data-pdxwa-dos=", "the dossier door"],
 ["data-pdxwa-pub=", "the public lane"]].forEach(([needle, what]) => {
  has(warmHtml, needle, `a member with a warm roll-call record is missing ${what} — the shell is\n` +
    `    not reaching the lane whose data actually arrives over the wire`);
});
// Warm member rows count their votes in the shared row meta, not in a member-only tally.
has(text(warmHtml), "vote", "the warmed member's rows do not show the roll-calls behind them");

win.PDXVotingRecord.memberRecords = realMemberRecords;
win.PDXDataChanged();

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the honest thin state");
// ═════════════════════════════════════════════════════════════════════════════

// A settled, empty formal record — the freshman member case. This is not "loading";
// it is "there is nothing to test the word against yet", and the shell has to say so
// rather than draw an empty shape.
win.PDXVotingRecord.memberRecords = (id) => (id === THIN_ID ? [] : realMemberRecords(id));
win.PDXDataChanged();

const thinRows = CS.issueRows(THIN_ID) || [];
ok(thinRows.length > 0 && thinRows.every((r) => !r.tested),
  "the thin subject has a tested issue — it is no longer the thin case this section gates");

const thinHtml = WA.sectionHtml(THIN_ID, win.CMP_DATA[THIN_ID]) || "";
must(thinHtml.length > 1000, "the thin member renders no section at all — a member with documented\n" +
  "    word but no record must still get the shell's honest empty state");

has(text(thinHtml), "Limited record", "the thin member is not told its record is limited");
has(text(thinHtml), "no formal action on record to test",
  "the thin member's section stopped explaining WHY there is no verdict");
has(text(thinHtml), "not a mark against",
  "the thin member's section stopped saying that a gap in the record is not a finding\n" +
  "    against them — the honesty rule this pass had to preserve");
lacks(thinHtml, 'class="pdxwa-comp-b"',
  "a shape strip is drawn for a member with nothing to shape — an empty distribution over\n" +
  "    zero verdicts invents density the record does not have");
lacks(thinHtml, 'class="pdxwa-oc"',
  "the bucket index is drawn for a member with no bucketed issue — browsing by outcome\n" +
  "    when no outcome exists is the fake densification this pass had to avoid");
// No score on a record that cannot produce one: the Direction Match readout reads as
// a dash in the limited state, never as a percentage over zero tested statements.
const thinNum = (thinHtml.match(/pdxwa-num-v">([^<]*)</) || [])[1];
must(thinNum !== undefined, "the Direction Match readout is no longer identifiable in the markup");
ok(!/%/.test(thinNum),
  `the thin member's Direction Match readout prints a percentage ("${thinNum}") — a score\n` +
  "    over zero tested statements is exactly the invented density this pass had to avoid");
has(thinHtml, "pdxwa-num-limited",
  "the thin member's score readout is not drawn in the limited state");

// The demoted card, on the same subject, carries the one thing the shell cannot
// derive — why the record is thin — and points at the shared section for the rest.
const thinCard = win._renderCandidateSnapshot(THIN_ID, win.CMP_DATA[THIN_ID], { isThin: true }) || "";
must(thinCard.length > 500, "the limited-record card renders nothing for a thin member");
has(text(thinCard), "Why this record is thin",
  "the card no longer says what it is for — explaining the gap is the only job it kept");
has(text(thinCard), "Limited Record", "the card dropped its limited-record badge");
// It points at ONE door, and at the one that is open on these profiles. It used to
// name ⚖️ Word vs Action's issue index (gated on a two-issue floor, so absent here)
// and "Key Issue Stances" (a heading that now lives sealed inside a deferred drawer
// titled "📋 Every documented position"). Both are stale; the tree is not.
has(text(thinCard), "All Issues by Topic",
  "the card stopped pointing at 🌳 All Issues by Topic — the browse gateway it sits\n" +
  "    directly under, and the only issue surface that renders on a thin profile");
lacks(text(thinCard), "Key Issue Stances",
  "the card is pointing at \"Key Issue Stances\" again — that heading is inside a closed,\n" +
  "    deferred drawer with a different lid, so a reader who follows the pointer finds nothing");
lacks(text(thinCard), "Contradicted", "the card is grading issues again in bucket words");
lacks(text(thinCard), "Backed up", "the card is grading issues again in bucket words");

win.PDXVotingRecord.memberRecords = realMemberRecords;
win.PDXDataChanged();

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the executive path is untouched");
// ═════════════════════════════════════════════════════════════════════════════

// The card has never rendered for a president and still does not: the gate is
// _isThinProfile, and an executive with a scored record is not thin. Asserted through
// the shipped renderer, both ways round.
eq(win._renderCandidateSnapshot(PRES, win.CMP_DATA[PRES], { isThin: false }), "",
  "the limited-record card renders on a non-thin profile — moving it must not change WHO\n" +
  "    sees it, only where it sits");
MEMBERS.forEach((id) => {
  eq(win._renderCandidateSnapshot(id, win.CMP_DATA[id], { isThin: false }), "",
    `the limited-record card renders for ${id} without the thin gate`);
});

// The executive section is byte-for-byte what it was before the card moved: the card
// is not mounted inside it, and none of its markers depend on the member furniture.
const execAgain = WA.sectionHtml(PRES, win.CMP_DATA[PRES]) || "";
eq(execAgain.length, execHtml.length,
  "the executive section changed length across the member-lane work in this harness");
lacks(execHtml, "cand-snapshot",
  "the limited-record card leaked into the executive section");
lacks(execHtml, "Why this record is thin",
  "the executive section is explaining a thin record it does not have");
// The exec-only term-scope strip stays exec-only — a member's roll-call record is not
// term-scoped anywhere in this engine, so this is the one thing that must NOT unify.
ok(!/pdxwa-scope/.test(memberHtml.massie),
  "the term-scope strip reached a member profile — a member's record is not scoped by term\n" +
  "    in this engine, so the strip would be a control over nothing");

// ═════════════════════════════════════════════════════════════════════════════
section("7 · one vocabulary");
// ═════════════════════════════════════════════════════════════════════════════

// The four outcome names are published once, by word-action.js. Nothing member-only
// may describe an issue's standing in words that compete with them.
const CARD_AT2 = PF.indexOf("window._renderCandidateSnapshot = function");
must(CARD_AT2 !== -1, "the limited-record card's definition moved");
const CARD_SRC = PF.slice(CARD_AT2, PF.indexOf("window.", CARD_AT2 + 40) > CARD_AT2
  ? PF.indexOf("\n  window.", CARD_AT2 + 40) : CARD_AT2 + 20000);
must(CARD_SRC.length > 2000, "the isolated card source is implausibly short");

["Match ", "Mismatch", "Partial"].forEach((w) => {
  ok(CARD_SRC.indexOf(">" + w) === -1 && CARD_SRC.indexOf(w + "<") === -1,
    `the card renders "${w.trim()}" as a per-issue verdict again — the reader now has two\n` +
    `    words for the same issue's standing depending on which card they read`);
});

// The pointer copy the card kept must speak the shell's language, not its own.
const pointer = text(win._renderCandidateSnapshot("massie", win.CMP_DATA.massie, { isThin: true }) || "");
has(pointer, "documented position", "the card stopped naming what it counts");
has(pointer, "grouped by topic",
  "the card no longer tells the reader where the positions are browsed — the sentence that\n" +
  "    hands the job to 🌳 All Issues by Topic, which is the surface directly above it");
has(pointer, "All Issues by Topic",
  "the card's pointer names no destination — it must name the tree, by the tree's own heading");

// And the sibling surfaces point at the same place by the same name.
has(R("stance-helpers.js"), "Word vs Action",
  "the comparison tool's limited-record copy stopped pointing at the shared section");
ok(!/Candidate Snapshot/.test(R("stance-helpers.js") + R("ballot-breakdown.js")),
  "another surface still sends the reader to the Candidate Snapshot by name");

// ── Report ──────────────────────────────────────────────────────────────────
if (fails.length) {
  console.error(`\n✗ member shell: ${fails.length} failed, ${pass} passed\n`);
  fails.forEach((f, i) => console.error(`  ${i + 1}. ${f}\n`));
  process.exit(1);
}
console.log(`\n✓ member shell: all ${pass} assertions passed — one shell, two lanes, only the data depth differs`);
