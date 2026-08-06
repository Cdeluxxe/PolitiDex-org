#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// ONE SPINE: the profile is a single accountability system, not a stack of them
// ─────────────────────────────────────────────────────────────────────────────
// The profile had grown four things that all answered "did they keep their word":
// ⚖️ Word vs Action (a %), the Promise Tracker gateway (a second % and its own
// chrome), the curated vote-highlights tally (a third kept/broken count over five
// hand-picked rows), and — for presidents only — an Executive Enactment Record
// sitting beside the Official Record as a rival lane. A reader met the same
// question four times and got four differently-scoped answers.
//
// This harness gates the consolidation. It is deliberately split between source
// assertions (a mount cannot come back without this file failing) and rendered
// assertions (the shipped engine, on real data, for both office types):
//
//   1. ONE INTEGRITY PRODUCT — one percentage, one owner. No gateway mount, no
//      curated tally, no rival pledge rate anywhere in the profile body.
//   2. ONE OFFICIAL RECORD LANE — the executive ledger renders INSIDE the Official
//      Record; the congressional voting section does not render for a president.
//   3. THE ISSUE ROW — the stable unit. Every field a later stance ranking needs is
//      present, typed, and either real or an explicitly null placeholder.
//   4. THE SORT — tension before consistent before word-only before action-only
//      before empty, and the Official Record renders in that order.
//   5. SAID → DID → VERDICT → RECEIPTS — the spine is literally rendered, in that
//      order, on the card that carries the number.
//   6. NO VOTE VOCABULARY ON A PRESIDENT — and the congressional lane keeps it.
//   7. NO "NOTHING STATED YET" LEADING THE RECORD.
//   8. THE CONDENSATION — the duplicate products are gone, not relocated: no promise
//      section, no promise chrome above the fold, no second name for the one score,
//      no Connecting the Dots essay, and no third per-issue verdict vocabulary.
//   9. AND IT IS MEASURABLY SHORTER — first-paint visible text, counted on the shipped
//      renderers against real data, with a budget that fails if the page regrows.
//
// Subjects: `trump` (executive lane) and `mike_johnson` (congressional lane, and one
// of the twelve figures whose ranked rows lead with a real contradiction).
//
//   node scripts/test-profile-unification.mjs
//
// No database, no network, no DOM beyond gen-hero-showcase.mjs's shared stub.

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
];

const win = makeSandbox();
const sandbox = vm.createContext(win);
for (const f of FILES) vm.runInContext(R(f), sandbox, { filename: f });

const CS = win.PDXConsistency;
const WA = win.PDXWordAction;
const EUI = win.PDXExecRecordUI;

const PF = R("profiles-full.js");
const VR = R("voting-record.js");

const PRES = "trump";
const REP = "mike_johnson";
const PP = win.CMP_DATA[PRES];
const RP = win.CMP_DATA[REP];

let pass = 0;
const fails = [];
function ok(cond, msg) { if (cond) pass++; else fails.push(msg); }
function eq(a, b, msg) {
  if (a === b) pass++;
  else fails.push(`${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
}
function must(cond, msg) {
  if (cond) { pass++; return; }
  console.error(`\n✗ profile-unification harness is STALE — a contract cannot be verified:\n  ${msg}\n`);
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

must(CS && WA && EUI, "the modules under test did not load");
must(PP && RP, "both subjects are in CMP_DATA");
must(typeof CS.issueRow === "function" && typeof CS.rankIssueRows === "function",
  "consistency.js no longer exports the issue-row model");

// The profile body, isolated once — every "is it mounted" assertion reads this. The
// rail is built above it, so the body runs from its template literal to end of file.
const BODY_AT = PF.indexOf("const _profileBody = ");
must(BODY_AT !== -1, "the profile body template moved");
const BODY = PF.slice(BODY_AT);
must(BODY.length > 5000, "the isolated profile body is implausibly short");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · one integrity product");
// ═════════════════════════════════════════════════════════════════════════════

// The Promise Tracker gateway is a whole second front door — its own card, its own
// framing question, its own read of the pledge table. Pledges are an INPUT to Word
// vs Action now, so the gateway keeps its delegated click handlers (bound from the
// Official Record) and loses its section.
ok(!/PDXConsistency\.gatewayHtml\(/.test(BODY),
  "the Promise Tracker gateway is mounted in the profile body again — a second card asking\n" +
  "    the same question as ⚖️ Word vs Action is the duplicate product this pass removed");
ok(!/id="pdxsec-promise-tracker"/.test(PF),
  "the Promise Tracker anchor is back in the profile — the section it named is gone, so the\n" +
  "    anchor can only produce a jump into nothing");
// …but the handlers it owned are still bound, or the record's deep links go dead.
ok(/bindGateway\(\)/.test(R("consistency.js")),
  "nothing binds the gateway's delegated handlers any more — removing the card must not take\n" +
  "    the Official Record's row shortcuts with it");
eq(typeof CS.gatewayHtml, "function",
  "gatewayHtml stopped being exported — the renderer is unmounted, not deleted, and other\n" +
  "    surfaces may still call it");

// The curated vote-highlights tally: a kept/broken/partial count over five annotated
// rows, printed a screen below a percentage computed over everything.
ok(!/_vrTally|_tallyChip/.test(PF),
  "the curated vote-highlights kept/broken tally is back — five hand-picked rows tallied as\n" +
  "    though they were a record is a rival scorecard with a worse denominator");
ok(/not a tally of anything/.test(PF),
  "the curated selection no longer says it tallies nothing, which is what a reader arriving\n" +
  "    from a percentage will assume it does");

// One percentage, one owner. The rail is the compressed version of the whole page,
// so it is the cheapest place to check that only one number claims to be the score.
const rail = PF.slice(PF.indexOf("const _navItems = []"), PF.indexOf("// A single pill isn't a"));
must(rail.length > 400, "could not isolate the profile nav rail");
eq((rail.match(/value: _waVal/g) || []).length, 1,
  "the rail's one percentage is not the ⚖️ pill's");
ok(!/scoreNum \+ '%'/.test(rail), "the rail prints the pledge rate as a second headline");
eq((rail.match(/label: 'Promises'/g) || []).length, 0,
  "the rail carries a pledge pill — phase 5 cut two down to one, and phase 6 cut the survivor:\n" +
  "    a kept/broken tally one pill from the ⚖️ percentage is a second scoreboard in the header strip");
eq((rail.match(/label: 'Record'/g) || []).length, 1, "the rail carries more than one Record pill");
ok(!/PDXExecRecordUI\.navPill/.test(rail),
  "the rail still carries a separate Enactments pill for the executive lane");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · one Official Record lane");
// ═════════════════════════════════════════════════════════════════════════════

const embed = EUI.embedHtml(PRES);
must(embed && embed.length > 500, "the executive lane renders nothing for the president");
const presSec = CS.officialRecordSectionHtml(PRES, PP);
must(presSec && presSec.length > 500, "the president's Official Record renders nothing");

has(presSec, 'class="pdxer pdxer-embed"',
  "the executive ledger is not inside the Official Record — a president with two record\n" +
  "    sections has to be told which one is the record");
has(presSec, 'id="pdxsec-exec-record"',
  "the merged lane dropped the executive anchor, so every existing deep link breaks");
eq((presSec.match(/id="pdxsec-exec-record"/g) || []).length, 1,
  "the executive anchor appears more than once in one section");
ok(presSec.indexOf('data-pdxc-official-pid') < presSec.indexOf("pdxer-embed"),
  "the executive ledger renders ABOVE the issue rows — the document list is the evidence\n" +
  "    for the verdicts, so it follows them");
// The embedded rendering must not reintroduce a section title claiming to be a record
// of its own. It is a ledger under a heading, not a second product.
lacks(text(embed), "Executive Enactment Record",
  "the embedded ledger still titles itself a Record — that is the rival product's name");
has(text(embed), "behind this record",
  "the embedded ledger does not present itself as the evidence for the record above it");

// The other half of the merge: a president has no roll call, so the congressional
// voting section must not mount at all — an empty vote table on a president is vote
// vocabulary by implication.
eq(win._renderVotingRecord(PRES, PP), "",
  "the congressional voting section renders for a president — presidents cast no roll-call votes");
ok(/PDXExecRecord[\s\S]{0,200}eligible\(id\)/.test(VR),
  "voting-record.js no longer gates on the executive office, so the section is only empty by\n" +
  "    accident of the data rather than by design");
// …and it still mounts for a member.
ok(String(win._renderVotingRecord(REP, RP) || "").length > 0,
  "the congressional voting section stopped rendering for a member of Congress");
// A member never gets the executive ledger.
eq(EUI.embedHtml(REP), "", "the executive ledger renders for a member of Congress");
lacks(CS.officialRecordSectionHtml(REP, RP), "pdxer-embed",
  "a member's Official Record carries the executive ledger");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the issue row is the stable unit");
// ═════════════════════════════════════════════════════════════════════════════

// Every field a later stance ranking needs, on every row, for both office types.
// This is the "no redesign later" contract: a ranking should be a new sort over
// these, not another pass over the renderer.
for (const [who, pid] of [["president", PRES], ["member", REP]]) {
  const rows = CS.issueRows(pid);
  must(rows.length > 3, `${who}: too few issue rows to test the row model`);
  for (const r of rows) {
    const tag = `${who} row ${r.key}`;
    ok(typeof r.key === "string" && r.key, `${tag}: has no issue key`);
    ok(typeof r.label === "string" && r.label, `${tag}: has no label`);
    // SAID — direction is a number so a ranking can compare it, never a word.
    ok(r.stance && (r.stance.direction === null || typeof r.stance.direction === "number"),
      `${tag}: stance direction is neither a number nor an explicit null`);
    ok(r.stance.direction === null || [1, 0, -1].indexOf(r.stance.direction) !== -1,
      `${tag}: stance direction is outside {+1, 0, −1}`);
    // DID — linked actions, and the lane they came from.
    ok(r.actions && typeof r.actions.count === "number", `${tag}: has no action count`);
    ok(r.actions.lane === null || r.actions.lane === r.lane, `${tag}: action lane disagrees with row lane`);
    // VERDICT — the issue verdict, from the one engine.
    ok(r.verdict && typeof r.verdict.token === "string", `${tag}: has no verdict token`);
    // RECEIPTS — count AND strength, because "2 receipts" and "thin" are different
    // claims and a ranking wants both.
    ok(typeof r.evidence.count === "number", `${tag}: has no evidence count`);
    ok(["none", "thin", "moderate", "strong"].indexOf(r.evidence.strength) !== -1,
      `${tag}: evidence strength "${r.evidence.strength}" is off the scale`);
    eq(r.evidence.count, r.actions.count, `${tag}: receipts and actions disagree on the count`);
    // TESTABILITY — the state, not a guess at a score.
    ok(["tested", "thin", "warming", "awaiting_record", "awaiting_word", "untestable"]
      .indexOf(r.testability) !== -1, `${tag}: testability "${r.testability}" is not a declared state`);
    ok(r.tier >= 0 && r.tier <= 4, `${tag}: tier is outside the declared range`);
    // WEIGHTS — declared, null, never invented.
    ok(r.weights && "salience" in r.weights && "recency" in r.weights,
      `${tag}: the ranking weight placeholders are gone`);
    eq(r.weights.salience, null, `${tag}: a salience weight was invented — no ranking ships this pass`);
    eq(r.weights.recency, null, `${tag}: a recency weight was invented`);
  }
}
// The row is a projection, not a second engine: its verdict is officialIssue()'s.
{
  const k = CS.issuesWithSignal(PRES, "official")[0];
  const row = CS.issueRow(PRES, k);
  const ov = CS.officialRecord(PRES, k);
  eq(row.verdict.token, ov.token, "the row invents a verdict instead of reading officialIssue()");
  eq(row.verdict.score, ov.score, "the row invents a score");
}
// A stance the engine can see but the position table cannot print is not "no stance":
// tiering reads the engine, rendering reads what it can quote.
{
  const rows = CS.issueRows(REP).filter((r) => !r.stance.key && r.ov.hasStance);
  for (const r of rows) {
    ok(r.tier !== 4, `${r.key}: an issue the engine has a stance for is filed as "nothing on file"`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the sort: sharpest first, empty last");
// ═════════════════════════════════════════════════════════════════════════════

const T = CS.ROW_TIER;
eq(T.tension, 0, "the tension tier is no longer first");
eq(T.empty, 4, "the empty tier is no longer last");

for (const [who, pid] of [["president", PRES], ["member", REP]]) {
  const ranked = CS.rankIssueRows(CS.issueRows(pid));
  let mono = true;
  for (let i = 1; i < ranked.length; i++) if (ranked[i].tier < ranked[i - 1].tier) mono = false;
  ok(mono, `${who}: ranked rows are not in tier order`);
  // Within the top tier, the deeper receipt pile wins — "best evidence first".
  const tested = ranked.filter((r) => r.tier === 1);
  let evMono = true;
  for (let i = 1; i < tested.length; i++) {
    if (tested[i].verdict.token === tested[i - 1].verdict.token &&
        tested[i].evidence.count > tested[i - 1].evidence.count) evMono = false;
  }
  ok(evMono, `${who}: inside one verdict, a thinner row outranks a better-evidenced one`);
}
// The member subject is one of the profiles with a real contradiction, so this is a
// live check that tension actually leads and not just that the comparator would.
{
  const ranked = CS.rankIssueRows(CS.issueRows(REP));
  must(ranked.some((r) => r.tier === 0), "the congressional subject no longer has a tension row to sort");
  eq(ranked[0].tier, 0, "a contradiction exists on this profile but does not lead the ranked rows");
  eq(ranked[0].verdict.token, "contradicts", "the leading row is not the contradiction");
}

// And the Official Record renders in that order rather than re-sorting behind it.
// Only SCORED rows are rendered as issue rows (the rest are the coverage list), so
// what this checks is that the rendered sequence never runs backwards through the
// tiers and that its first row is the ranking's first scored row.
for (const [who, pid, p] of [["president", PRES, PP], ["member", REP, RP]]) {
  const sec = CS.officialRecordSectionHtml(pid, p);
  const tiers = [...sec.matchAll(/data-pdxc-tier="(\d)"/g)].map((m) => Number(m[1]));
  must(tiers.length >= 1, `${who}: the Official Record no longer stamps ranking tiers onto its rows`);
  let mono = true;
  for (let i = 1; i < tiers.length; i++) if (tiers[i] < tiers[i - 1]) mono = false;
  ok(mono, `${who}: the Official Record re-sorts its rows away from the ranked order`);
  const firstScored = CS.rankIssueRows(CS.issueRows(pid)).filter((r) => r.scored)[0];
  eq(tiers[0], firstScored.tier,
    `${who}: the section does not lead with the row the ranking put first`);
  // The ranking inputs ride along on the row, so a later ranking can be built and
  // debugged against the rendered DOM instead of a parallel data path.
  ok(/data-pdxc-test="/.test(sec), `${who}: the rendered rows carry no testability state`);
  ok(/data-pdxc-ev="/.test(sec), `${who}: the rendered rows carry no evidence count`);
}
// The congressional subject is one of the twelve profiles with a real contradiction,
// so this is a live check that tension actually reaches the top of the render — not
// just that the comparator would put it there.
{
  const sec = CS.officialRecordSectionHtml(REP, RP);
  const tiers = [...sec.matchAll(/data-pdxc-tier="(\d)"/g)].map((m) => Number(m[1]));
  eq(tiers[0], 0, "a contradiction exists on this profile but is not the first row of its record");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · Said → Did → Verdict → Receipts");
// ═════════════════════════════════════════════════════════════════════════════

for (const [who, pid, p] of [["president", PRES, PP], ["member", REP, RP]]) {
  const waHtml = WA.sectionHtml(pid, p);
  must(waHtml && waHtml.length > 500, `${who}: Word vs Action renders nothing`);
  has(waHtml, "pdxwa-rows", `${who}: Word vs Action shows no issue rows under the number`);
  const t = text(waHtml);
  const iSaid = t.indexOf("Said");
  const iDid = t.indexOf("Did", iSaid);
  const iRec = t.indexOf("Receipts", iDid);
  ok(iSaid !== -1 && iDid > iSaid && iRec > iDid,
    `${who}: the spine does not read Said → Did → Receipts in that order`);
  has(t, "Where this number comes from",
    `${who}: the rows do not say they are the derivation of the score above them`);
  has(waHtml, "pdxsec-official-record",
    `${who}: the rows offer no way into the full breakdown`);
  // Only the sharpest few. This is a summary of a section, not the section.
  const n = (waHtml.match(/class="pdxwa-row"/g) || []).length;
  ok(n >= 1 && n <= 3, `${who}: ${n} top rows rendered — this block summarises, it does not duplicate`);
  // Each rendered row shows a verdict beside the issue, so the chain terminates.
  eq((waHtml.match(/class="pdxwa-row-verdict"/g) || []).length, n,
    `${who}: a top row shows Said and Did but no verdict`);
  // Never lead the derivation with a gap.
  lacks(t, "No position stated on this issue",
    `${who}: a row with nothing said is being used to explain the score`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · no vote vocabulary on a president");
// ═════════════════════════════════════════════════════════════════════════════

// The seed's own circularity prose legitimately describes what a stance card cites
// ("cites the bill page"), so that phrase is dropped — the sweep is for the app's
// voice, not for quoted source metadata.
const presSweep = text(presSec + " " + WA.sectionHtml(PRES, PP))
  .split("cites the bill page").join(" ");
// Word-bounded, because "ten years" contains "yea" and a substring sweep would
// report a vocabulary breach on every dated sentence in the seed.
const PRES_FORBIDDEN = [
  /\bvoted\b/i, /\bvotes?\b/i, /\broll[- ]calls?\b/i, /\byeas?\b/i, /\bnays?\b/i,
  /\bmapped votes?\b/i, /\bno votes yet\b/i,
];
for (const re of PRES_FORBIDDEN) {
  const m = presSweep.match(re);
  ok(!m, `the president's record surfaces use vote vocabulary: ${re} matched ${JSON.stringify(
    m ? presSweep.slice(Math.max(0, m.index - 60), m.index + 40) : "")}`);
}
has(presSweep, "executive action", "the president's record never names what they actually did");
// The lane noun reaches the derivation rows too — this is the newest surface and the
// easiest place for "vote" to creep back in.
const presRows = WA.sectionHtml(PRES, PP);
const presRowsText = text(presRows.slice(presRows.indexOf("pdxwa-rows")));
lacks(presRowsText, "vote", "the president's Said → Did rows count votes");
has(presRowsText, "executive action", "the president's Said → Did rows do not count executive actions");

// The congressional lane keeps its vocabulary — this consolidation is not a rename.
const repRows = WA.sectionHtml(REP, RP);
const repRowsText = text(repRows.slice(repRows.indexOf("pdxwa-rows")));
has(repRowsText, "vote", "the member's Said → Did rows stopped counting votes");
lacks(repRowsText, "executive action", "executive vocabulary leaked onto a member of Congress");
has(text(CS.officialRecordSectionHtml(REP, RP)), "When they had to vote",
  "the member's Official Record no longer asks the roll-call question");

// The last place vote vocabulary survives a merge is a cross-reference: a sub-line
// on some OTHER section describing what the Official Record is made of. Those have
// to switch lanes with everything else.
ok(/Official Record \(laws signed, vetoes and orders\)/.test(PF),
  "the Spotlight sub-line still describes a president's Official Record as votes — a\n" +
  "    parenthetical is where the retired vocabulary hides");
ok(/Official Record \(votes and formal actions\)/.test(PF),
  "…and the congressional wording of that same sub-line was lost in the swap");
ok(/PDXExecRecord[\s\S]{0,160}eligible\(id\)[\s\S]{0,600}Official Record \(laws signed/.test(PF),
  "the Spotlight sub-line picks its lane without consulting the office gate");

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the record does not lead with what is missing");
// ═════════════════════════════════════════════════════════════════════════════

// "Nothing stated yet" as the first thing in a record section tells a reader the
// record is empty when it is not — it is the caption of a gap, sorted to the top by
// an alphabet. Both the string and the ordering are gone.
for (const [who, pid, p] of [["president", PRES, PP], ["member", REP, RP]]) {
  const sec = CS.officialRecordSectionHtml(pid, p);
  const t = text(sec);
  lacks(t, "Nothing stated yet", `${who}: the record still captions a row "Nothing stated yet"`);
  // The first scored row a reader meets carries real evidence.
  const first = CS.rankIssueRows(CS.issueRows(pid)).filter((r) => r.scored)[0];
  must(first, `${who}: nothing scored, so the leading-row contract cannot be checked`);
  ok(first.evidence.count > 0, `${who}: the leading scored row has no receipts behind it`);
}
// The caption is gone from the source too, not just from today's data — a string
// that survives in a template comes back the moment a branch changes. Comment lines
// are excluded: the note explaining why it was removed is the point of removing it.
ok(!R("consistency.js").split("\n")
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .some((l) => l.indexOf("Nothing stated yet") !== -1),
  "the 'Nothing stated yet' caption is still renderable from consistency.js");

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the condensation: removed, not relocated");
// ═════════════════════════════════════════════════════════════════════════════

// Phase 5 unified the vocabulary and left the volume. A reader opening Trump still
// met, in order: a percentage, a pledge chip under it, a "Promises · 6K · 6B · 2P"
// rail pill, a ~13,000-character Connecting the Dots essay, and a Promise Receipts
// section — five promise-flavoured surfaces before the record itself. Phase 6 removes
// the surfaces rather than renaming them.

// 8a. One name for the one number. "Kept word" on the ring and "Word vs Action" on
//     the section a screen below were two labels for one figure.
const WA_SRC = R("word-action.js");
const FRAME_AT = WA_SRC.indexOf("var FRAME = {");
must(FRAME_AT !== -1, "word-action.js no longer defines FRAME");
const FRAME = WA_SRC.slice(FRAME_AT, FRAME_AT + 900);
ok(/caption:\s*'Word vs Action'/.test(FRAME),
  "the ring caption is not the section's own name — a second name for one number is read as a\n" +
  "    second number, which is the whole failure mode this spine exists to close");
ok(!/caption:\s*'Kept word'/.test(FRAME), "the 'Kept word' caption is back");

// 8b. No promise chrome above the fold. Not the chip, not its styling, not the ledger
//     that was assembled to feed it, not the rail pill beside the percentage.
ok(!/pledgeChipHtml/.test(WA_SRC), "word-action.js builds the hero pledge chip again");
ok(!/pdxwa-hero-pledge/.test(WA_SRC) && !/pdxwa-hero-pledge/.test(R("word-action.css")),
  "the hero pledge chip's markup or styling is back in the header");
ok(!/pledge:\s*pledgeLedger/.test(PF),
  "the profile hands the hero a pledge ledger again — the counts were only ever assembled to\n" +
  "    draw a chip, and the chip is what put promise counts above the fold");
{
  const heroFn = WA_SRC.slice(WA_SRC.indexOf("function heroInner"), WA_SRC.indexOf("function bindHero"));
  must(heroFn.length > 400, "word-action.js no longer defines heroInner");
  ok(!/kept/.test(heroFn) && !/broken/.test(heroFn),
    "the hero prints kept/broken counts — the pledge lane is a tier INSIDE the percentage");
}

// 8c. Promise Receipts is not a section. The ledger still exists — it is an input to
//     the score and a reader must be able to audit it — but it lives in the collapsed
//     drawers, reached from the score's own feeds list, not mounted as a peer lane.
{
  const ftAt = BODY.indexOf("_renderFollowThrough(");
  must(ftAt !== -1, "the pledge ledger is not mounted anywhere — it is an input, not a deletion");
  eq((BODY.match(/_renderFollowThrough\(/g) || []).length, 1,
    "the pledge ledger is mounted more than once");
  // Stage membership is decided by the nearest preceding sentinel, and a `dw:<id>`
  // sentinel routes its chunk into that drawer wherever the drawer's spec puts it.
  const tag = (BODY.slice(0, ftAt).match(/<!--PDXSP:([a-z0-9:_-]+)-->/g) || []).pop();
  eq(tag, "<!--PDXSP:dw:promises-->",
    "the pledge ledger is mounted outside the promises drawer — an open promise section is a peer\n" +
    "    lane no matter what it is called");
  const spec = PF.slice(PF.indexOf("{ id: 'promises', stage: 'drawers'"), PF.indexOf("{ id: 'promises', stage: 'drawers'") + 900);
  must(spec.length > 100, "the promises drawer spec moved");
  ok(/defer:\s*true/.test(spec),
    "the promises drawer is no longer deferred, so the ledger is parsed into the document on the\n" +
    "    tap that opens the profile even though nobody asked to see it");
  // #pdxsec-score rode down with the ledger, so every existing jump still resolves.
  ok(BODY.indexOf('id="pdxsec-score"') > ftAt - 400 && BODY.indexOf('id="pdxsec-score"') < ftAt,
    "the #pdxsec-score anchor did not travel with the ledger it names — the score's feeds list and\n" +
    "    the controversies jump would both land nowhere");
  ok(/PROMISE RECEIPTS NO LONGER MOUNTS HERE/.test(PF),
    "the note recording where Promise Receipts went is gone, so it will be remounted");
  // The score still names the lane as an input, and still routes to it.
  const feeds = WA.feedsHtml ? WA.feedsHtml(PRES, PP) : "";
  has(feeds, "Promise receipts",
    "the score's feeds panel no longer names the pledge lane — demoting an input must not hide it");
}

// 8d. Connecting the Dots is unmounted. Its joined rows, its five-link chain and its
//     chip row all restate what the score section renders in its own vocabulary.
eq((PF.match(/_pdxConnectDots\(/g) || []).length, 0,
  "Connecting the Dots is mounted again — a synthesis printed beside the score it synthesises is\n" +
  "    the same evidence twice, and on a president it was ~13,000 characters of it");
ok(/CONNECTING THE DOTS IS UNMOUNTED/.test(PF),
  "the note recording why the synthesis was unmounted is gone");

// 8e. No THIRD per-issue verdict vocabulary. The Connected Evidence cards used to
//     print "Record backs the stance" / "Record cuts against it" / "Record is mixed",
//     computed from a different pool than either Word vs Action or the Official
//     Record — free to disagree with both, on the same issue, in the same scroll.
{
  const readFor = PF.slice(PF.indexOf("function readFor(e)"), PF.indexOf("function readFor(e)") + 900);
  must(readFor.length > 200, "profiles-full.js no longer defines the evidence read");
  for (const banned of ["Record backs", "Record cuts", "Record is mixed", "Action in progress"]) {
    ok(readFor.indexOf(banned) === -1,
      `the evidence cards publish a verdict of their own ("${banned}") — that is a third read of\n` +
      "    the same question, scoped to a fourth pool of evidence");
  }
  for (const gone of ["evd-backs", "evd-cuts", "evd-mixed", "evd-progress"]) {
    ok(!R("app.css").includes("." + gone),
      `app.css still colours evidence cards by verdict (.${gone}) — the colour is the claim`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · and it is measurably shorter");
// ═════════════════════════════════════════════════════════════════════════════

// The brief was "visibly shorter", so it is measured rather than asserted. First
// paint only: deferred drawers are dropped and closed <details> are reduced to their
// summary, because text a reader has to open is not text they were handed. Innermost
// -first and repeated to a fixed point, so nested folds collapse correctly.
{
  const firstPaint = (html) => {
    let h = String(html || "").replace(/<!--PDXSP:lid[^>]*defer-->[\s\S]*?<!--PDXSP:\/lid-->/g, "");
    let prev;
    do {
      prev = h;
      h = h.replace(/<details(?![^>]*\bopen\b)[^>]*>((?:(?!<details)[\s\S])*?)<\/details>/g,
        (m, inner) => { const sm = inner.match(/<summary[\s\S]*?<\/summary>/); return sm ? sm[0] : ""; });
    } while (h !== prev);
    return h;
  };
  const seen = (html) => text(firstPaint(html)).trim().length;

  // Budgets are ceilings with headroom, not snapshots of today's byte count: they
  // fail on a regrowth, not on an edit. Measured at the time of writing: 7193 / 1451.
  const rec = seen(CS.officialRecordSectionHtml(PRES, PP));
  ok(rec > 1500 && rec < 9000,
    `the Official Record's first paint is ${rec} characters — it was 12471 before the ledger folded,\n` +
    "    and it is the one section a reader is meant to keep, so it must not be the longest thing\n" +
    "    on the page by an order of magnitude again");

  // The executive ledger folds. Every document is still there and still in date order;
  // the term is not printed inline.
  const embed = EUI.embedHtml ? EUI.embedHtml(PRES) : "";
  must(embed.length > 500, "the executive ledger no longer embeds in the Official Record");
  ok(/pdxer-fold/.test(embed),
    "the executive ledger prints the whole term inline again — a full presidential term of actions\n" +
    "    under one heading is where the record section stopped being readable");
  const shownCards = (firstPaint(embed).match(/<article class="pdxer-card"/g) || []).length;
  const allCards = (embed.match(/<article class="pdxer-card"/g) || []).length;
  ok(shownCards <= 3 && shownCards >= 1,
    `${shownCards} executive action cards render on first paint — the newest few are the preview`);
  ok(allCards > shownCards,
    "the fold hides nothing, so either the data shrank or the ledger is not actually folded");

  // And nothing was quietly deleted to achieve any of this.
  const kept = win.PDXExecRecord.actionsFor(PRES).kept.length;
  eq(allCards, kept, "the folded ledger does not carry every action on file — folding is not dropping");
}

// ─────────────────────────────────────────────────────────────────────────────
if (fails.length) {
  console.error(`\n✗ profile unification: ${fails.length} failure(s) (${pass} passed)\n`);
  for (const f of fails) console.error("  ✗ " + f);
  process.exit(1);
}
const pr = CS.rankIssueRows(CS.issueRows(PRES));
const rr = CS.rankIssueRows(CS.issueRows(REP));
console.log(`\n✓ profile unification: ${pass} assertions passed — one score, one record lane, one spine`);
console.log(`  trump: ${pr.length} issue rows · ${pr.filter((r) => r.scored).length} scored · leading tier ${pr[0].tier}`);
console.log(`  ${REP}: ${rr.length} issue rows · ${rr.filter((r) => r.scored).length} scored · leading tier ${rr[0].tier}`);
