#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-thin-card-placement.mjs — the gateway first, the reason for the gap after
// ─────────────────────────────────────────────────────────────────────────────
// "Why this record is thin" is gated on _isThinProfile, which means it renders on
// exactly the profiles where 🌳 All Issues by Topic is the whole of the substance:
// no Direction Match, no shape strip, no bucket index, a tree of stated positions
// and nothing formal to test them against. It used to mount BETWEEN ⚖️ Word vs
// Action and that tree — eight sub-blocks of explanation standing in front of the
// only surface with something to show, on the one kind of profile that could least
// afford the delay.
//
// This harness pins the correction, and the three ways it could quietly rot:
//
//   1. THE ORDER. The tree → the multi-issue block → Word vs Action → the card.
//      The tree was promoted again since: it holds a gateway stage of its own
//      ahead of the score, while the card stays at the foot of the verdict stage.
//      The spine restages the body by sentinel, so "after the tree" is only true
//      while the card is still tagged verdict; one sentinel further down and it
//      reappears a stage away from what it explains. Source position proves none
//      of this on its own — the mounts are ordered here the way the assembler
//      orders them, by governing stage first.
//   2. THE TRIM. Four blocks, not eight. The at-a-glance facts row, the Spotlight
//      sub-card, the Compare/Add-to-team pair and the ↓ foot hint were each a
//      restatement of the letterhead, the banners, the rail or the Spotlight, and
//      none of them may come back — in the markup OR in the stylesheet.
//   3. THE POINTERS. Every door the card names has to be open on the profile the
//      card renders on. It named two that were not: ⚖️ Word vs Action's issue
//      index, which is gated on a two-issue floor and does not draw here at all,
//      and "Key Issue Stances", a heading that now lives sealed inside a deferred
//      drawer whose lid reads "📋 Every documented position". It names the tree.
//
// And the wall the trim is not allowed to cross: THINNESS STAYS SAID. Word vs
// Action's own thin copy, the tree's empty record slots and the card's lede all
// still say it. A shorter card may not become a quieter one.
//
//   node scripts/test-thin-card-placement.mjs
//
// Real shipped modules in a node:vm sandbox over the bundled roster. Subjects:
// `sarah_mcbride` and `khanna` (member lane, thin), `trump` (executive, scored).

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
  "issue-colors.js",
  "stance-tree.js",
  "ballot-axes.js",
  "controversies.js",
  "profile-card.js",
  "profile-spine.js",
  "profiles-full.js",
];

const win = makeSandbox();
const sandbox = vm.createContext(win);
win.PROFILES = win.CMP_DATA;
for (const f of FILES) vm.runInContext(R(f), sandbox, { filename: f });
win.PROFILES = win.CMP_DATA;

const PF_RAW = R("profiles-full.js");
const CSS = R("app.css");
// Source scans run over CODE. Every retirement in this file left a tombstone comment
// behind naming what went — matching raw source would fail on those tombstones.
const stripComments = (s) => String(s)
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ")
  .replace(/<!--[\s\S]*?-->/g, " ");
const PF = stripComments(PF_RAW);
const CSS_CODE = CSS.replace(/\/\*[\s\S]*?\*\//g, " ");

const THIN = "sarah_mcbride";
const THIN2 = "khanna";
const PRES = "trump";

let pass = 0;
const fails = [];
const ok = (c, m) => { if (c) pass++; else fails.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
function must(c, m) {
  if (c) { pass++; return; }
  console.error(`\n✗ thin-card-placement harness is STALE — a contract cannot be verified:\n  ${m}\n`);
  process.exit(1);
}
const text = (h) => String(h || "")
  .replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ");
const has = (hay, n, m) => ok(text(hay).toLowerCase().includes(String(n).toLowerCase()), m);
const lacks = (hay, n, m) => ok(!text(hay).toLowerCase().includes(String(n).toLowerCase()), m);
const section = (n) => console.log(`\n${n}\n`);

must(typeof win._renderCandidateSnapshot === "function",
  "profiles-full.js no longer publishes the limited-record card");
must(win.CMP_DATA[THIN] && win.CMP_DATA[THIN2] && win.CMP_DATA[PRES],
  "one of the subjects is not in the bundled roster");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the mount order — the tree comes first");
// ═════════════════════════════════════════════════════════════════════════════
// Read RAW: the stage sentinels are HTML comments, so a stripped body has no stage
// boundaries to order against.
const BODY_AT = PF_RAW.indexOf("const _profileBody = ");
must(BODY_AT !== -1, "the profile body template moved");
const BODY = PF_RAW.slice(BODY_AT);

// Source position is not read position: the spine assembles the body by stage, and
// the tree was promoted out of the verdict stage into a gateway stage of its own
// without moving in the file. Every order claim below is resolved the way the
// assembler resolves it — governing stage first, source position only to break a
// tie inside one stage.
const SPINE = win.PDXProfileSpine;
must(SPINE && SPINE.STAGE_KEYS && SPINE.STAGE_KEYS.length > 5,
  "the profile spine did not boot, so reading order cannot be resolved");
const stageOf = (at) => {
  const tags = BODY.slice(0, at).match(/<!--PDXSP:([a-z0-9:_-]+)-->/g) || [];
  return tags.length ? tags[tags.length - 1].replace(/<!--PDXSP:|-->/g, "") : "identity";
};
const rank = (at) => SPINE.STAGE_KEYS.indexOf(stageOf(at)) * 1e9 + at;

const VERDICT = BODY.indexOf("<!--PDXSP:verdict-->");
const WA_AT = BODY.indexOf("PDXWordAction.sectionHtml(id, p)");
const TREE_AT = BODY.indexOf("PDXStanceTree.sectionHtml(id)");
const AXES_AT = BODY.indexOf("PDXBallotAxes.profileHtml(id, p)");
const CARD_AT = BODY.indexOf("${candidateSnapshot || thinNotice}");
must(VERDICT !== -1 && WA_AT !== -1 && TREE_AT !== -1 && AXES_AT !== -1 && CARD_AT !== -1,
  "one of the mounts this section orders was renamed — order cannot be read");

ok(rank(TREE_AT) < rank(WA_AT),
  "order: 🌳 All Issues by Topic no longer reads ahead of ⚖️ Word vs Action. On a thin profile\n" +
  "    the tree is the entire substance of the page, and the score is a number about a record\n" +
  "    the reader has not been shown yet");
ok(rank(TREE_AT) < rank(CARD_AT),
  "order: the limited-record card reads ABOVE 🌳 All Issues by Topic again. It renders\n" +
  "    only on profiles where the tree is the entire substance of the page, so at that\n" +
  "    position it delays the browse gateway on exactly the profiles that have nothing else");
ok(rank(AXES_AT) < rank(CARD_AT),
  "order: the card slid above the multi-issue block. The card is the FOOT of the verdict\n" +
  "    stage — everything that shows a reader something goes before the thing that explains\n" +
  "    why there is not more to show");
eq(stageOf(CARD_AT), "verdict",
  "the card fell out of the verdict stage — the spine restages the body by sentinel, so it\n" +
  "    would reappear under the Official Record, a stage away from the gap it explains");
eq(stageOf(TREE_AT), "explore",
  "the tree fell out of the gateway stage, which is the only reason it reads ahead of the score");
eq(stageOf(AXES_AT), "explore",
  "the multi-issue block was separated from the tree it annotates");
eq(BODY.split("${candidateSnapshot || thinNotice}").length - 1, 1,
  "the card is mounted more than once in the profile body");

// The gate is untouched. This pass moved the card; it did not change who sees it.
ok(/_renderCandidateSnapshot\(id, p, \{ isThin: _isThinProfile \}\)/.test(PF),
  "the card's gate changed — the mount must still pass _isThinProfile");
ok(/_isThinProfile\s*=\s*scoreNum === null && _resolvedCount === 0 && _pbThinTotal === 0/.test(PF),
  "the thin gate's own definition changed — this was a presentation pass, and WHO sees the\n" +
  "    card had to come out of it identical");
ok(/candidateSnapshot \|\| thinNotice/.test(BODY),
  "the plain thin-notice fallback is gone — a profile whose card fails now explains nothing");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the trim — four blocks, not eight");
// ═════════════════════════════════════════════════════════════════════════════
const card = win._renderCandidateSnapshot(THIN, win.CMP_DATA[THIN], { isThin: true }) || "";
must(card.length > 400, "the limited-record card renders nothing for a thin member");

// What it keeps: the why, the pointer, what the match rests on, what is being gathered.
has(card, "Why this record is thin", "the card no longer says what it is for");
has(card, "Limited Record", "the card dropped its limited-record badge");
ok(/class="cs-lede"/.test(card), "the card dropped the lede that carries the WHY");
ok(/class="cs-align-basis"/.test(card),
  "the card dropped the alignment basis line — 'an early read from stated priorities' vs\n" +
  "    'backed by documented positions' has no other home on the profile, and it is the one\n" +
  "    sentence that keeps a match score on a record-less candidate honest");
ok(/class="cs-gather"/.test(card),
  "the card dropped the 'We're actively gathering' list — the honest, unduplicated half");

// What it drops. Each of these is on the screen already, in a surface that owns it.
lacks(card, "Seat", "the card is restating the letterhead's office eyebrow as a fact chip");
ok(!/class="cs-facts"/.test(card),
  "the at-a-glance facts row is back. Seat and Party are the letterhead's; the next-election\n" +
  "    date is the election-status banner's, countdown and all; Race status is the candidacy\n" +
  "    banner's AND this card's own lede");
ok(!/cs-spot/.test(card),
  "the Spotlight sub-card is back — the Spotlight is its own surface on this profile and\n" +
  "    carries every story, not just the lead one this repeated");
ok(!/cs-act-btn|cs-actions/.test(card),
  "the Compare / Add-to-team button pair is back — the profile's third offer of the same two\n" +
  "    actions, after the sticky rail and the card's own align control");
ok(!/mypolToggleAnimated/.test(card),
  "the card is wiring an Add-to-team control again");
ok(!/cs-foot-hint/.test(card),
  "the ↓ foot hint is back, and it now points the wrong way: this card mounts UNDER the tree,\n" +
  "    so the positions it promised 'below' are above the reader");
ok(!/cs-align-guide/.test(card),
  "the 'New to a candidate?' tip is back — it says what the lede says, one paragraph up");

// Four top-level blocks under the head, and no more. Counted from the markup so a
// fifth cannot be added without this failing.
const blocks = (card.match(/<div class="cs-head">|<div class="cs-block cs-positions"|<div class="cs-align"|<div class="cs-gather">/g) || []).length;
eq(blocks, 4,
  "the card is not four blocks any more (head, positions pointer, align, gathering). It was\n" +
  "    eight before this pass, and every block past the fourth was something another surface\n" +
  "    on the same page already owned");

// The stylesheet went with the markup: rules that outlive their markup dress the next
// thing that reaches for the class name.
ok(!/\.cs-facts|\.cs-fact-k|\.cs-fact-v/.test(CSS_CODE), "app.css still styles the retired facts row");
ok(!/\.cs-spot\b|\.cs-spot-card|\.cs-spot-note|\.cs-spot-tie-row/.test(CSS_CODE),
  "app.css still styles the retired Spotlight sub-card");
ok(!/\.cs-act-btn|\.cs-actions|\.cs-foot-hint|\.cs-align-guide/.test(CSS_CODE),
  "app.css still styles the retired action pair, foot hint or guidance tip");
ok(!/\.ptn-act-btn|\.ptn-actions|\.ptn-next-label/.test(CSS_CODE),
  "app.css still styles the thin notice's retired button pair");
// The chip class itself survives — the full Spotlight modal is its other caller.
ok(/\.pdx-issue-tie/.test(CSS_CODE),
  "the .pdx-issue-tie chip was collateral damage — the full Spotlight modal still uses it");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the pointers name doors that are open");
// ═════════════════════════════════════════════════════════════════════════════
[THIN, THIN2].forEach((id) => {
  const c = win._renderCandidateSnapshot(id, win.CMP_DATA[id], { isThin: true }) || "";
  must(c.length > 400, `the card renders nothing for ${id}`);
  lacks(c, "Key Issue Stances",
    `${id}: the card points at "Key Issue Stances" again — that heading now lives inside a\n` +
    "    deferred drawer whose lid reads \"📋 Every documented position\", at the bottom of the\n" +
    "    spine and closed. A reader who follows the pointer finds no such section");
  lacks(c, "issue index",
    `${id}: the card points at ⚖️ Word vs Action's issue index again — it is gated on a\n` +
    "    two-issue floor and does not draw at all on the profiles this card renders for");
  lacks(c, "the record and your alignment are below",
    `${id}: the card is promising sections "below" that now sit above it`);
});

// The one door it does name is the one directly above it, by the tree's own heading.
const withStances = win._renderCandidateSnapshot(THIN2, win.CMP_DATA[THIN2], { isThin: true }) || "";
has(withStances, "documented position", "the card stopped naming what it counts");
has(withStances, "All Issues by Topic",
  "the card names no browse surface. 🌳 All Issues by Topic renders on exactly the profiles\n" +
  "    this card renders on, sits directly above it, and opens each issue into the same dossier");
const TREE_H = R("stance-tree.js").includes("🌳 All Issues by Topic");
ok(TREE_H, "the tree's heading was renamed — the card's pointer now names a section that does\n" +
  "    not exist under that name");

// The fallback notice obeys the same two rules: no third button row, no pointer that
// faces the wrong way now that it mounts under the tree.
const NOTICE_AT = PF.indexOf("const thinNotice = _isThinProfile");
must(NOTICE_AT !== -1, "the plain thin notice was renamed");
const NOTICE_SRC = PF.slice(PF.indexOf("const _thinNext =") , PF.indexOf("const candidateSnapshot"));
must(NOTICE_SRC.length > 200, "the thin notice source did not slice cleanly");
ok(!/ptn-act-btn|ptn-actions/.test(NOTICE_SRC),
  "the fallback notice's button pair is back — it renders in the card's place, so it cannot\n" +
  "    carry the pair the card just dropped");
ok(!/↓/.test(NOTICE_SRC),
  "the fallback notice still points ↓ at positions that are now above it");
ok(/All Issues by Topic/.test(NOTICE_SRC),
  "the fallback notice points at no browse surface at all");

// And the sibling one-liner in the deferred positions drawer, which described this
// card's old neighbourhood in so many words.
const LR_AT = PF.indexOf("var _lrRef = _lrSnap");
must(LR_AT !== -1, "the limited-record banner's cross-reference was renamed");
const LR_SRC = PF.slice(LR_AT, LR_AT + 600);
ok(/All Issues by Topic/.test(LR_SRC),
  "the stance-limited-note still hands the reader to ⚖️ Word vs Action's issue index — the\n" +
  "    surface that does not render on the profiles it describes");
ok(!/Word vs Action<\/strong> above indexes them/.test(LR_SRC),
  "the stance-limited-note's old 'indexes them by outcome' pointer is back");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · thinness is still said, and full profiles still omit the card");
// ═════════════════════════════════════════════════════════════════════════════
// A shorter card may not be a quieter one. The state is disclosed three times before
// a reader ever reaches the card, and this pass touched none of them.
//
// The member formal lane is an API in a live browser and cold in a sandbox, so the
// settled-and-empty state is driven with a stub, exactly as test-member-shell drives
// it. Cold, the section reads "Checking the formal record…"; settled, it reads the
// honest thin copy, and that is the copy this pass had to leave standing.
const WA = win.PDXWordAction;
must(win.PDXVotingRecord && typeof win.PDXVotingRecord.memberRecords === "function",
  "voting-record.js no longer exposes memberRecords — the settled thin state cannot be driven");
must(typeof win.PDXDataChanged === "function", "the derivation epoch is gone; memos cannot be busted");
const realMemberRecords = win.PDXVotingRecord.memberRecords;
win.PDXVotingRecord.memberRecords = (id) => (id === THIN ? [] : realMemberRecords(id));
win.PDXDataChanged();
const thinSection = WA.sectionHtml(THIN, win.CMP_DATA[THIN]) || "";
must(thinSection.length > 1000, "the thin member renders no section at all");
has(thinSection, "no formal action on record to test",
  "⚖️ Word vs Action stopped explaining the gap — with the card moved below the tree, this\n" +
  "    is the FIRST place a reader is told the record is thin, and it has to still say it");
has(thinSection, "not a mark against",
  "the section stopped saying a gap in the record is not a finding against the person");
has(card, "little of their word has been tested by a formal action yet",
  "the card's lede stopped stating the thin condition in its own words");
win.PDXVotingRecord.memberRecords = realMemberRecords;
win.PDXDataChanged();

// The card is still for thin records only. Trimming and moving it must not change WHO
// sees it — asserted through the shipped renderer, both ways round.
eq(win._renderCandidateSnapshot(PRES, win.CMP_DATA[PRES], { isThin: false }), "",
  "the limited-record card renders on a scored executive profile");
[THIN, THIN2].forEach((id) => {
  eq(win._renderCandidateSnapshot(id, win.CMP_DATA[id], { isThin: false }), "",
    `the card renders for ${id} without the thin gate`);
});

// ── Report ──────────────────────────────────────────────────────────────────
if (fails.length) {
  console.error(`\n✗ thin-card placement: ${fails.length} failed, ${pass} passed\n`);
  fails.forEach((f, i) => console.error(`  ${i + 1}. ${f}\n`));
  process.exit(1);
}
console.log(`\n✓ thin-card placement: all ${pass} assertions passed — gateway first, the gap explained after`);
