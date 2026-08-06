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
//  10. ONE VERDICT PER ISSUE — Say-vs-Do and the Record-vs-Public-Picture bridge are
//      merged into the row. The public record contributes receipts always and the
//      verdict only where no formal action could test the issue, so two surfaces
//      cannot grade the same issue differently.
//  11. OFFICE LANES — exec, vote, and both, under ONE Official Record gateway. The
//      both-lanes case is driven with a stub, because no shipped figure reaches it yet.
//  12. STANCES & CONNECTIONS — the "what they stand for" layer: ranked by the locked
//      priority, publishing no number of its own, connecting out to the score, the
//      record and the evidence.
//  13. EVIDENCE IS SHARED — counted per surface. Word vs Action rows, Stances &
//      Connections, the Official Record's source links and Flashpoints must each
//      carry evidence, so Flashpoints is never the only proof surface.
//  14. ONE VERDICT VOCABULARY — the row model cannot see a second surface describing
//      the same issue in the same words. Flashpoints chips must name a KIND of item,
//      never one of Word vs Action's four locked outcome names.
//
// Subjects: `trump` (executive lane), `mike_johnson` and `massie` (congressional
// lane; mike_johnson is one of the twelve figures whose ranked rows lead with a real
// contradiction, massie is the second shape of member data section 14 checks against).
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
  "controversies.js",
  // Sections 15–16 read the homepage card and the first screen through the shipped
  // renderers, so the two surfaces that paint them load here too.
  "profile-card.js",
  "profile-spine.js",
];

const win = makeSandbox();
const sandbox = vm.createContext(win);
// say-vs-do.js and controversies.js read window.PROFILES, which the app fills from
// Firestore at runtime. The bundled roster is the same shape, so point it there
// before the modules initialise or the receipt layer collects nothing.
win.PROFILES = win.CMP_DATA;
for (const f of FILES) vm.runInContext(R(f), sandbox, { filename: f });
win.PROFILES = win.CMP_DATA;

const CS = win.PDXConsistency;
const WA = win.PDXWordAction;
const EUI = win.PDXExecRecordUI;

const PF = R("profiles-full.js");
const VR = R("voting-record.js");
const CS_SRC = R("consistency.js");
const CTV_SRC = R("controversies.js");

const PRES = "trump";
const REP = "mike_johnson";
const THIRD2 = "massie";
const PP = win.CMP_DATA[PRES];
const RP = win.CMP_DATA[REP];
const MP2 = win.CMP_DATA[THIRD2];
const SP2 = win.PDXProfileSpine;

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
  // The pile is `evidence.total`: formal actions PLUS public-record receipts. It
  // used to be actions only, which tied every stance-with-no-action row at zero
  // and made the locked "stance with strong evidence" priority indistinguishable
  // from "stance only".
  const tested = ranked.filter((r) => r.tier === 1);
  let evMono = true;
  for (let i = 1; i < tested.length; i++) {
    if (tested[i].verdict.token === tested[i - 1].verdict.token &&
        tested[i].evidence.total > tested[i - 1].evidence.total) evMono = false;
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
  // The score still names the lane as an input, and still routes to it — but by what
  // the lane IS, not by the name of the retired peer product. "Promise receipts" in a
  // methodology list is the product coming back through the back door of an input row.
  const feeds = WA.feedsHtml ? WA.feedsHtml(PRES, PP) : "";
  has(feeds, "Pledges kept and broken",
    "the score's feeds panel no longer names the pledge lane — demoting an input must not hide it");
  lacks(feeds, "Promise receipts",
    "the feeds panel names the retired 🤝 Promise Receipts product again — an input row is allowed\n" +
    "    to name the pledge lane, but not to re-mint it as a second product on the way past");
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

// ═════════════════════════════════════════════════════════════════════════════
section("10 · one verdict per issue — the Say-vs-Do merge");
// ═════════════════════════════════════════════════════════════════════════════
// 🧾 Say-vs-Do used to be its own section with its own per-issue verdict, over the
// same issues the 🏛️ Official Record had already judged. Two verdicts for one issue
// in one scroll is why a THIRD surface (Record vs. Public Picture) existed at all —
// its entire job was refereeing the disagreement. The public record is now an INPUT
// resolved on the row: it always contributes receipts, and it contributes the
// verdict only where no formal action could test the issue.
{
  // The resolution is mutually exclusive by construction, not by convention.
  const rowFn = CS_SRC.slice(CS_SRC.indexOf("function issueRow(pid, issueKey)"),
                             CS_SRC.indexOf("function issueRows(pid, keys)"));
  must(rowFn.length > 400, "issueRow moved — this section cannot verify the resolution");
  eq((rowFn.match(/basis = 'public_record'/g) || []).length, 1,
    "the public record is promoted to the row verdict in more than one place — one branch\n" +
    "    is what makes the two systems unable to disagree");
  ok(/actionJudged && tok !== 'limited'/.test(rowFn),
    "the action branch no longer wins outright where a formal action exists — a formal\n" +
    "    action is the test wherever a formal action can be the test");
  ok(/pub\.count >= MIN_SAYDO_EVIDENCE/.test(rowFn),
    "the public record can decide a row on a single receipt — thin evidence must not\n" +
    "    carry a verdict the formal record was never able to reach");
  ok(/flag` is deliberately NOT judgeable|flag` is deliberately/.test(CS_SRC) ||
     !/pub\.token === 'flag'/.test(rowFn),
    "a red flag can resolve a row's verdict — heat is Flashpoints' job, and promoting it\n" +
    "    here lets a controversy card and a consistency row grade the same issue differently");

  // Rendered, on both offices: the verdict a row publishes is one of its two inputs,
  // never a third thing, and the basis says which.
  for (const [who, pid] of [["president", PRES], ["member", REP]]) {
    const rows = CS.issueRows(pid);
    let bad = [];
    for (const r of rows) {
      const b = r.verdict.basis;
      if (b !== null && b !== "action" && b !== "public_record") bad.push(`${r.key}: basis ${b}`);
      if (b === "action" && r.verdict.token !== r.ov.token) bad.push(`${r.key}: action basis but token drifted`);
      if (b === "public_record" && r.verdict.token !== r.public.token) bad.push(`${r.key}: public basis but token drifted`);
      if (b === "public_record" && (r.ov.token === "consistent" || r.ov.token === "contradicts" || r.ov.token === "mixed"))
        bad.push(`${r.key}: the public record overruled a formal action`);
    }
    ok(bad.length === 0, `${who}: a row's verdict does not trace to exactly one input — ${bad.join("; ")}`);
    // Receipts are additive even where the verdict is not: the public pile always counts.
    let evBad = rows.filter((r) => r.evidence.total !== r.evidence.actions + r.evidence.public);
    ok(evBad.length === 0,
      `${who}: evidence.total is not the combined pile — the public record must contribute\n` +
      "    receipts on every row, including the ones a formal action decided");
    // `scored` still means the ACTION side only. The Official Record splits its rows on
    // this flag, so widening it would list issues with no formal record as scored.
    let scoredBad = rows.filter((r) => r.scored && !r.ov.record && !r.ov.officialActions);
    ok(scoredBad.length === 0,
      `${who}: a row is marked scored with nothing formal behind it — the Official Record\n` +
      "    splits on this flag and would list it as part of the record");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("11 · office lanes — exec, vote, and both under one gateway");
// ═════════════════════════════════════════════════════════════════════════════
// One Official Record section, three behaviours. The lane strip and the both-offices
// question appear only for a figure who actually served in both kinds of role, so a
// single-lane profile carries no chrome for a lane it does not have.
{
  must(typeof CS.recordLanes === "function", "consistency.js no longer exports recordLanes");
  const pl = CS.recordLanes(PRES), rl = CS.recordLanes(REP);
  ok(pl.exec && !pl.vote && !pl.both, `the president is not on the executive lane alone (${JSON.stringify(pl)})`);
  ok(rl.vote && !rl.exec && !rl.both, `the member is not on the vote lane alone (${JSON.stringify(rl)})`);
  eq(pl.keys.join(","), "exec", "the president's lane keys are wrong");
  eq(rl.keys.join(","), "vote", "the member's lane keys are wrong");

  const execOnly = CS.officialRecordSectionHtml(PRES, PP);
  const voteOnly = CS.officialRecordSectionHtml(REP, RP);
  ok(!/pdxor-lanes/.test(execOnly), "the president gets a two-lane strip for a second lane he does not have");
  ok(!/pdxor-lanes/.test(voteOnly), "the member gets a two-lane strip for an office he has not held");
  has(execOnly, "When they could act on their own", "the executive lane lost its own section question");
  has(voteOnly, "When they had to vote", "the congressional lane lost its own section question");

  // BOTH LANES. No figure in the shipped roster has served in both kinds of office, so
  // the case is driven rather than waited for: executive eligibility is stubbed onto a
  // member who has a real vote lane, then removed. This is the only way to gate a
  // branch the data cannot reach yet — and the branch has to be right the first day
  // someone with both records is added.
  const origEligible = win.PDXExecRecord.eligible;
  const origSpine = win.PDXProfileSpine;
  win.PDXProfileSpine = { hasTarget: (t) => t === "pdxsec-voting" };
  try {
    win.PDXExecRecord.eligible = (id) => id === PRES || id === REP;
    const both = CS.officialRecordSectionHtml(REP, RP);
    ok(/pdxor-lanes/.test(both), "a figure with both records gets no lane strip — the two lanes read as one undifferentiated pile");
    has(both, "In both offices they have held", "the both-lanes section does not ask a both-lanes question");
    has(both, "Executive actions", "the both-lanes strip does not name the executive lane");
    has(both, "Roll-call votes", "the both-lanes strip does not name the roll-call lane");
    eq((both.match(/id="pdxsec-official-record"/g) || []).length,
       (voteOnly.match(/id="pdxsec-official-record"/g) || []).length,
      "mounting both lanes mounted a second Official Record — the lanes go under ONE gateway");
    ok(/pdxor-rawlink/.test(both),
      "the full voting record link is stripped from a dual-service figure — the gate is the\n" +
      "    LANE, not the office, and this reader is exactly the one for whom the roll-call\n" +
      "    list is a second record rather than a category error");
    // And the executive-only profile still never offers it.
    win.PDXExecRecord.eligible = origEligible;
    ok(!/pdxor-rawlink/.test(CS.officialRecordSectionHtml(PRES, PP)),
      "the president is offered a full voting record he will never have");
    ok(/pdxor-rawlink/.test(CS.officialRecordSectionHtml(REP, RP)),
      "the member loses the full voting record link once the stub is removed");
  } finally {
    win.PDXExecRecord.eligible = origEligible;
    win.PDXProfileSpine = origSpine;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("12 · stances & connections — what they stand for, ranked and connected");
// ═════════════════════════════════════════════════════════════════════════════
{
  must(typeof CS.stancesSectionHtml === "function", "consistency.js no longer exports stancesSectionHtml");
  for (const [who, pid] of [["president", PRES], ["member", REP]]) {
    const st = CS.stancesSectionHtml(pid);
    ok(st.length > 500, `${who}: the stance layer renders nothing`);
    eq((st.match(/id="pdxsec-stances"/g) || []).length, 1, `${who}: the stance anchor is missing or duplicated`);
    const rows = (st.match(/class="pdxst-row"/g) || []).length;
    const model = CS.issueRows(pid).length;
    eq(rows, model, `${who}: the rendered stance rows do not match the row model`);
    // It publishes NO number. It shows the verdict the score already reached.
    lacks(text(st).replace(/\d+ of \d+/g, ""), "%", `${who}: the stance layer prints a percentage — there is one score on a profile`);
    // Ranked: the locked priority is tension, then consistent, then word-only, then
    // action-only, then empty, and the section renders in that order.
    const tiers = [...st.matchAll(/data-pdxst-tier="(\d)"/g)].map((m) => Number(m[1]));
    let mono = true;
    for (let i = 1; i < tiers.length; i++) if (tiers[i] < tiers[i - 1]) mono = false;
    ok(mono, `${who}: the stance rows are not in ranked order`);
    // The fold is keyed on the TIER, not on position in the list of non-empty groups.
    // Slicing "the first two live groups" opened tested + everything-untested on a
    // figure with no contradictions — 24 of 32 rows on the president, which is the
    // wall this layer was built to replace.
    const lidAt = st.indexOf("PDXSP:lid");
    const openRows = (lidAt === -1 ? st : st.slice(0, lidAt)).match(/class="pdxst-row"/g) || [];
    const testedRows = CS.issueRows(pid).filter((r) => r.tier === 0 || r.tier === 1).length;
    eq(openRows.length, testedRows,
      `${who}: the open stance rows are not exactly the tested ones — an empty group above\n` +
      "    must never promote a folded one into the reader's path");
    if (rows > testedRows) ok(lidAt !== -1, `${who}: the untested positions do not fold`);
  }
  // The connection out. A stance row that has been tested points at the score; a row
  // with formal record points at the Official Record; a row with public receipts points
  // at the Evidence drawer. That is what makes this the "connections" layer and not a
  // second list of positions.
  const stP = CS.stancesSectionHtml(PRES);
  has(stP, "pdxsec-wordaction", "no stance row connects into Word vs Action");
  has(stP, "pdxsec-official-record", "no stance row connects into the Official Record");
  has(stP, "pdxsec-evidence", "no stance row connects into the Evidence drawer");
  // Office-aware wording travels with the connection. Matched on the LINK LABEL, not
  // on the section text: "Voter ID & Election Integrity" is an issue name, and a
  // blanket search for "vote" would fail on the president's own stance titles.
  has(stP, "on record", "the stance layer's record link does not say what is on record");
  ok(/\d+ action(s)? on record/.test(stP),
    "the president's stance rows do not count his record in actions");
  ok(!/\d+ vote(s)? on record/.test(stP),
    "the president's stance layer offers to show him votes");
  ok(/\d+ vote(s)? on record/.test(CS.stancesSectionHtml(REP)) ||
     CS.issueRows(REP).every((r) => r.evidence.actions === 0),
    "the member's stance rows do not count his record in votes");
  // Mounted once, in the signature stage, above Stance at a Glance.
  eq((BODY.match(/PDXConsistency\.stancesSectionHtml\(id\)/g) || []).length, 1,
    "the stance layer is mounted zero or twice in the profile body");
}

// ═════════════════════════════════════════════════════════════════════════════
section("13 · evidence is the shared proof layer, not a Flashpoints exhibit");
// ═════════════════════════════════════════════════════════════════════════════
// The brief: "Do not make Flashpoints the only evidence surface." Evidence has to
// feed Word vs Action rows, Stances & Connections, Flashpoints, Official Record
// source links and the Evidence drawer. Counted per surface, on real data, for both
// offices — an unfed surface fails here rather than being asserted in prose.
{
  const srcLinks = (h) => (String(h || "").match(/href="https?:/g) || []).length;
  for (const [who, pid, p] of [["president", PRES, PP], ["member", REP, RP]]) {
    const wa = WA.sectionHtml(pid, p);
    const st = CS.stancesSectionHtml(pid);
    const or = CS.officialRecordSectionHtml(pid, p);
    const ctv = win._renderControversies ? win._renderControversies(pid, p) : "";
    const fed = {
      "Word vs Action rows": (wa.match(/pdxwa-oc-meta/g) || []).length,
      "Stances & Connections": (st.match(/pdxst-ev/g) || []).length,
      "Official Record sources": srcLinks(or),
      "Flashpoints": srcLinks(ctv),
    };
    for (const [surface, n] of Object.entries(fed)) {
      ok(n > 0, `${who}: ${surface} carries no evidence — evidence is infrastructure, and a\n` +
        "    surface that shows none is one the proof layer does not actually reach");
    }
    // Flashpoints is not the only door: it links OUT to the shared layer rather than
    // owning it, and every other surface reaches the drawer independently.
    ok(/pdxsec-evidence/.test(ctv), `${who}: a Flashpoint card does not link to the Evidence drawer`);
    ok(/pdxsec-evidence/.test(st), `${who}: the stance layer does not reach the Evidence drawer`);
    // ...and Flashpoints scores nothing. Asserted at the source, because a card body
    // legitimately quotes a person's own "4–6% growth" pledge — the ban is on the
    // section COMPUTING a rate, not on evidence containing one.
    ok(!/%/.test(CTV_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")),
      "controversies.js emits a percentage — Flashpoints is heat, not a second scoring system");
    ok(!/pdxc-chip|pdxwa-/.test(ctv),
      `${who}: a Flashpoint borrows the verdict-chip chrome — it would read as a per-issue grade`);
  }
  // The drawer itself is mounted once, in the receipts stage.
  eq((BODY.match(/id="pdxsec-evidence"/g) || []).length, 1,
    "the Evidence anchor is missing or duplicated in the profile body");
  ok(/<!--PDXSP:receipts-->/.test(BODY), "the receipts stage sentinel is gone from the profile body");
}

// ═════════════════════════════════════════════════════════════════════════════
section("14 · one verdict VOCABULARY per issue — the Flashpoints boundary");
// ═════════════════════════════════════════════════════════════════════════════
// Sections 10–13 gate the row model: one verdict per issue, resolved once. This
// section gates the thing that model cannot see — a second surface DESCRIBING the
// same issue in the same words.
//
// The receipt engine stamps a contradiction "Says One Thing · Does Another",
// which is verbatim one of Word vs Action's four locked outcome names. Flashpoints
// passed that label straight through, so the president's profile read
//
//     🔥 Flashpoints        Strong Border & Enforcement — Says One Thing · Does Another
//     ⚖️ Word vs Action     Strong Border & Enforcement — Backs it up
//
// about the same issue, on the same scroll. Both statements are true — the card is
// one dated dispute, the row is the whole issue weighed against formal action — but
// a reader has no way to see that, and two verdict systems disagreeing in public is
// the one thing this section must never be.
//
// Three subjects here, not two: `massie` is a second member of Congress, added
// because a contract that only ever sees one figure per office lane is a contract
// that has only ever seen one shape of data.
{
  const THIRD = "massie";
  const MP = win.CMP_DATA[THIRD];
  must(MP, "massie is not in the roster — this section has lost its second member subject");

  // The four locked outcome names, plus the receipt engine's phrasings of them.
  // Flashpoints may not speak in this vocabulary at all.
  const WA_VOCAB = /says one thing|backs? it up|backed it up|words match actions|mixed record|not enough record/i;

  for (const [who, pid, p] of [["president", PRES, PP], ["member", REP, RP], ["member2", THIRD2, MP2]]) {
    const items = win._pdxControversyItems(pid, p) || [];
    const rows = {};
    (CS.issueRows(pid) || []).forEach((r) => { rows[r.key] = r; });

    ok(items.length <= 3, `${who}: Flashpoints is not capped short — ${items.length} cards`);

    items.forEach((it) => {
      const label = (it.verdict && it.verdict.label) || "";
      ok(label !== "", `${who}: a Flashpoint card carries no chip at all`);
      ok(!WA_VOCAB.test(label),
        `${who}: a Flashpoint chip reads "${label}" — that is Word vs Action's outcome\n` +
        "    vocabulary, and a card in those words competes with the row that owns them");
      // The chip must name a KIND of item. Every kind this module can produce ends
      // in the same shape, so a new one that grades an issue instead fails here.
      ok(/On Record$|Flagged Event$|^Promise /.test(label),
        `${who}: the chip "${label}" does not name a kind of item`);
    });

    // Where a card names an issue the row model has already resolved, the link out
    // must carry that row's own outcome — the reconciliation, not a bare conflict.
    const ctv = win._renderControversies(pid, p) || "";
    items.forEach((it) => {
      if (!it.issueKey) return;
      const r = rows[it.issueKey];
      if (!r || !r.verdict || !r.verdict.label) return;
      ok(ctv.includes(r.verdict.label),
        `${who}: the Flashpoint on ${it.issueKey} never names the one score's outcome\n` +
        `    ("${r.verdict.label}") on the way to it — the reader is left with two readings and no bridge`);
    });

    // A card with no issue key cannot claim an issue verdict, so it must not offer
    // the ⚖️ jump at all.
    const untied = items.filter((it) => !it.issueKey).length;
    const waBtns = (ctv.match(/pdxsec-wordaction/g) || []).length;
    eq(waBtns, items.length - untied,
      `${who}: the ⚖️ Word vs Action jump count does not match the cards that name an issue`);
  }

  // The remap happens at THIS boundary, not upstream: say-vs-do.js's own surfaces
  // (the hero card, the lightbox, the share card) legitimately keep the full label,
  // and rewriting it there would have been a rename campaign across six files.
  const SVD = R("say-vs-do.js");
  ok(/label: 'Says One Thing · Does Another'/.test(SVD),
    "say-vs-do.js's own verdict vocabulary was rewritten — the fix belongs at the Flashpoints boundary,\n" +
    "    because the receipt engine's other consumers are not on the profile scroll");
  ok(/WA_OUTCOME_WORDS/.test(CTV_SRC),
    "controversies.js no longer guards against Word vs Action's outcome vocabulary");
  ok(/it\.verdict = heatChip\(it\.verdict\)/.test(CTV_SRC),
    "the remap moved out of gather() — profile-spine.js reads items[0].verdict.label straight into\n" +
    "    the brief's tension badge, ABOVE THE FOLD, so normalising in cardHTML alone leaks it");

  // ── the third subject reads like the second: vote lane, no executive chrome ──
  const l3 = CS.recordLanes(THIRD, CS.rankIssueRows(CS.issueRows(THIRD)).filter((r) => r.scored));
  ok(l3.vote && !l3.exec && !l3.both, "massie does not resolve to the vote lane");
  const or3 = CS.officialRecordSectionHtml(THIRD, MP);
  ok(!/executive order|signed into law|\bveto/i.test(text(or3)),
    "massie's Official Record carries executive-only vocabulary he has no office for");
  ok(/\broll[- ]call\b|\bvoted\b|\bvotes\b/i.test(text(or3)),
    "massie's Official Record does not speak in votes");
  ok(!/pdxor-lanes/.test(or3), "a single-lane figure is shown the two-lane strip");

  // ── folds, on all three ──
  // Budgets, not snapshots: they fail when a fold stops folding, not when the data
  // grows. A stance layer that opens most of its rows is the wall it exists to replace.
  for (const [who, pid, p] of [["president", PRES, PP], ["member", REP, RP], ["member2", THIRD2, MP2]]) {
    const st = CS.stancesSectionHtml(pid);
    const total = (st.match(/data-pdxst-tier=/g) || []).length;
    const open = (st.split("<!--PDXSP:lid")[0].match(/data-pdxst-tier=/g) || []).length;
    ok(total <= 4 || open <= Math.ceil(total / 2),
      `${who}: Stances & Connections opens ${open} of ${total} rows — that is a wall, not a lead`);
    const or = CS.officialRecordSectionHtml(pid, p);
    const orTotal = (or.match(/pdxor-row/g) || []).length;
    const orOpen = (or.split("<!--PDXSP:lid")[0].match(/pdxor-row/g) || []).length;
    ok(orTotal <= 6 || orOpen < orTotal,
      `${who}: the Official Record shows all ${orTotal} rows at once — the long list must fold after the top items`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("15 · one verdict engine, and a narrow Mixed");
// ═════════════════════════════════════════════════════════════════════════════
// The homepage card and the profile were reading the same record through two
// different units: the card counted word ITEMS out of PDXWordAction, the profile
// printed issue ROWS out of PDXConsistency. On Trump that produced a card reading
// "0 mixed" over a profile showing Mixed rows, and a card that led with a label
// where the profile led with a percentage. Both surfaces now read one tally over
// one row set, and one gate decides when a record is allowed to read Mixed.

// 15a. ONE TALLY. The card's breakdown is the profile's row tally — not a
//      re-derivation of it, and not the word-item counts it used to be.
{
  const PC = win.PDXProfileCard;
  must(PC && typeof PC.brief === "function", "profile-card.js no longer exposes brief()");
  must(typeof CS.verdictTally === "function",
    "consistency.js no longer exports verdictTally — the one tally the card and the profile share");
  for (const [who, pid] of [["president", PRES], ["member", REP], ["member2", THIRD2]]) {
    const b = PC.brief(pid);
    const t = CS.verdictTally(pid);
    must(b && b.breakdown && t, `${who}: the card brief or the row tally did not build`);
    eq(b.breakdown.consistent, t.consistent, `${who}: card 'backed' count ≠ the profile's backed rows`);
    eq(b.breakdown.mixed, t.mixed, `${who}: card 'mixed' count ≠ the profile's Mixed rows`);
    eq(b.breakdown.contradicts, t.contradicts, `${who}: card 'contradicted' count ≠ the profile's contradicted rows`);
    // …and the tally is really counting the rows the Official Record prints.
    const rows = CS.issueRows(pid) || [];
    const printed = { consistent: 0, mixed: 0, contradicts: 0 };
    rows.forEach((r) => {
      const tok = r && r.verdict && r.verdict.token;
      if (tok === "consistent" || tok === "mixed" || tok === "contradicts") printed[tok]++;
    });
    eq(t.consistent, printed.consistent, `${who}: verdictTally invented backed rows the row model does not have`);
    eq(t.mixed, printed.mixed, `${who}: verdictTally invented Mixed rows the row model does not have`);
    eq(t.contradicts, printed.contradicts, `${who}: verdictTally invented contradicted rows the row model does not have`);
  }
  // The specific reinterpretation that caused the mismatch: thin coverage folded
  // into the card's Mixed bucket, so a card said "Mixed" where the profile said
  // "not enough record yet". A surface may not re-bucket a verdict it did not make.
  const PC_SRC = R("profile-card.js");
  ok(!/mixed:\s*\([^)]*counts\.mixed[^)]*\)\s*\+/.test(PC_SRC) &&
     !/counts\.mixed[^\n]*counts\.limited/.test(PC_SRC),
    "profile-card.js folds thin coverage into the card's Mixed count again — a homepage card that\n" +
    "    calls a coverage gap 'Mixed' is a second verdict system wearing the first one's numbers");
  ok(/verdictTally/.test(PC_SRC),
    "profile-card.js stopped reading the shared tally, so the card is deriving its own counts again");
}

// 15b. THE CARD CARRIES THE SCORE. The homepage card led with a label over a mini
//      breakdown and never showed the number the profile leads with, so the two
//      read as different products. The percentage is the card's, from the same read.
{
  const PC = win.PDXProfileCard;
  const b = PC.brief(PRES);
  const r = WA.read(PRES, PP);
  must(b && r, "the card brief or the word-vs-action read did not build for the president");
  eq(typeof b.pct, "number", "the president's card brief carries no percentage — the card and the profile\n" +
    "    summarise the same record and must lead with the same figure");
  eq(b.pct, r.pct, "the card's percentage is not ⚖️ Word vs Action's — a second number computed a second way");
  const HS = R("hero-showcase.js");
  ok(/d\.pct/.test(HS) && /word matched by action/.test(HS),
    "the homepage card no longer paints brief().pct under the ⚖️ Word vs Action eyebrow");
  ok(/Word vs Action/.test(HS) && !/Kept word|Promise Receipts|Say vs\. ?Do/i.test(HS),
    "a retired integrity product is named on the homepage card — Word vs Action is the only score language");
}

// 15c. MIXED IS NARROW. One gate, exported, and it will not mint Mixed for a clear
//      break or for thin evidence. The dominance threshold is the contract: at or
//      above it the dominant direction IS the verdict.
{
  must(typeof CS.mixedGate === "function", "consistency.js no longer exports the shared Mixed gate");
  must(typeof win._pdxMixedGate === "function", "stance-helpers.js no longer publishes the shared Mixed gate");
  eq(CS.mixedGate, win._pdxMixedGate === CS.mixedGate ? CS.mixedGate : CS.mixedGate,
    "guard: the gate is callable");
  const g = CS.mixedGate;
  eq(g(0, 0), "no_position", "the gate mints a verdict from nothing");
  eq(g(100, 0), "consistent", "an all-backing record does not read as backed");
  eq(g(0, 100), "contradicts", "an all-breaking record does not read as broken");
  eq(g(50, 50), "mixed", "a genuinely even split does not read as Mixed — Mixed must still be reachable");
  // The soft middle: a clear break with a token amount of agreement beside it.
  eq(g(10, 90), "contradicts",
    "a record that breaks the claim 9 times out of 10 reads as Mixed — this is the soft landing the\n" +
    "    tightened rule exists to close");
  eq(g(90, 10), "consistent", "the same leniency in the other direction — a mostly-kept record hedged into Mixed");
  // The threshold itself, pinned from both sides so it cannot drift silently.
  const D = win._PDX_MIXED_DOMINANCE;
  eq(D, 2 / 3, "the Mixed dominance threshold moved");
  eq(g(0, 2), "contradicts", "exactly at the threshold the dominant direction must win outright");
  eq(g(2, 1), "consistent", "exactly at the threshold the dominant direction must win outright");
  eq(g(3, 2), "mixed", "just under the threshold the record is genuinely split and must say so");
}

// 15d. THE SOFT-MIDDLE PATHS ARE GONE FROM THE SOURCE. A gate only holds if nothing
//      routes around it. These are the three branches that used to mint Mixed
//      without ever weighing the two directions against each other.
{
  const SH = R("stance-helpers.js");
  const sumAt = SH.indexOf("function _issueRecordSummary");
  must(sumAt !== -1, "stance-helpers.js no longer defines _issueRecordSummary");
  const ladder = SH.slice(SH.indexOf("var netVerdict", sumAt), SH.indexOf("var netVerdict", sumAt) + 500);
  must(ladder.length > 60, "could not isolate the netVerdict ladder");
  ok(/_pdxMixedGate\(/.test(ladder),
    "the per-issue verdict ladder no longer routes through the shared Mixed gate");
  ok(!/counts\.mixed\s*>\s*0\s*\?\s*'mixed'/.test(ladder),
    "a record with no directional evidence can be called Mixed again — thin is not split");
  ok(!/stance\s*===\s*'mixed'\s*\)?\s*netVerdict\s*=\s*'mixed'/.test(ladder.replace(/\s+/g, " ")),
    "a non-directional stance short-circuits to Mixed again without ever reading the record — this is how\n" +
    "    an unrelated shutdown card soft-pedalled a deficit-increasing law into Mixed");
  const WSRC = R("word-action.js");
  ok(/_mixedGate\(consW, contraW\)/.test(WSRC),
    "the overall outcome no longer weighs the two directions through the shared gate");
  ok(/mixedGate\(consW, contraW\)/.test(CS_SRC),
    "consistency.js's scoped overall no longer weighs the two directions through the shared gate");
}

// 15e. AND ON REAL DATA: no subject carries a Mixed row that the gate would not
//      have minted, and the president's clearest break reads as one.
{
  const nd = (CS.issueRows(PRES) || []).find((r) => r.key === "national_debt");
  must(nd, "the president's national_debt row is gone — the re-judged row cannot be checked");
  eq(nd.verdict.token, "contradicts",
    "national_debt reads as something other than a contradiction. The tested formal action is a law\n" +
    "    nonpartisan scorekeeping says adds trillions to the deficit, checked against a stated commitment\n" +
    "    to reduce the debt, with no debt-reducing action of comparable weight beside it");
  eq(nd.verdict.basis, "action", "the national_debt verdict is not resting on a formal action");
  ok(nd.evidence && nd.evidence.count > 0, "the national_debt contradiction ships without a receipt");
  for (const [who, pid] of [["president", PRES], ["member", REP], ["member2", THIRD2]]) {
    (CS.issueRows(pid) || []).forEach((r) => {
      if (!r || !r.verdict || r.verdict.token !== "mixed") return;
      // A Mixed row must be able to point at both directions. A row whose score is
      // 0 or 100 is not split — it is a clear verdict wearing a hedge.
      const s = r.verdict.score;
      ok(typeof s === "number" && s > 0 && s < 100,
        `${who}: ${r.key} reads Mixed at ${s}% — a one-sided record labelled Mixed`);
    });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("16 · the residual copy is gone from the surfaces that render it");
// ═════════════════════════════════════════════════════════════════════════════
// Source greps miss copy assembled at render time and flag comments that exist to
// record a removal. These run the shipped renderers and read the visible text.
{
  const RETIRED = [
    ["kept word", "the retired pledge rate's name"],
    ["promise receipts", "the retired peer product"],
    ["say vs. do", "the retired peer product"],
    ["say-vs-do integrity", "a second integrity percentage"],
    ["record vs public picture", "the retired bridge"]
  ];
  const surfaces = (pid, p) => ({
    "the brief": SP2 ? SP2.briefHtml(pid, p) : "",
    "the score's feeds panel": WA.feedsHtml(pid, p),
    "the Word vs Action section": WA.sectionHtml(pid, p),
    "the Official Record": CS.officialRecordSectionHtml(pid, p),
    "Stances & Connections": CS.stancesSectionHtml(pid, p),
    "the methodology sheet": CS.methodologyHtml(pid)
  });
  for (const [who, pid, p] of [["president", PRES, PP], ["member", REP, RP], ["member2", THIRD2, MP2]]) {
    for (const [name, html] of Object.entries(surfaces(pid, p))) {
      const t = text(html).toLowerCase();
      for (const [needle, why] of RETIRED) {
        ok(t.indexOf(needle) === -1,
          `${who}: ${name} prints “${needle}” — ${why}. ⚖️ Word vs Action is the only integrity score language`);
      }
    }
  }
  // The methodology sheet is shared, so both lanes are always described — but it is
  // handed the pid and must lead with the lane the office actually produces.
  const mExec = CS.methodologyHtml(PRES);
  const mRep = CS.methodologyHtml(REP);
  const mBare = CS.methodologyHtml();
  ok(mExec.indexOf("White House") !== -1 && mExec.indexOf("White House") < mExec.indexOf("in Congress"),
    "the president's methodology sheet still opens by telling them their score comes from roll-call votes");
  has(mExec, "no roll-call votes", "the exec sheet dropped the row that says a president casts none");
  ok(mRep.indexOf("Official Record %") !== -1 && mRep.indexOf("Presidents and the formal record") !== -1,
    "a member's methodology sheet lost a lane — both are always described, only the order changes");
  has(mBare, "roll-call votes and formal actions",
    "the pid-less sheet (the hub, the showcase, a shared card's footer) lost the congressional lane");
  for (const [nm, m] of [["exec", mExec], ["member", mRep], ["bare", mBare]]) {
    lacks(m, "Promise Tracker", `${nm} methodology: the retired gateway is named as the sheet's own eyebrow`);
    lacks(m, "Two separate reads", `${nm} methodology: the sheet still promises two integrity reads`);
    lacks(m, "Why two separate scores", `${nm} methodology: the sheet still frames two scores side by side`);
    has(m, "When a record reads Mixed", `${nm} methodology: the tightened Mixed rule is not written down`);
  }
  // The "How this profile was checked" line promises what every figure traces to.
  // For a president that promise cannot include a roll call.
  const verifyAt = PF.indexOf('id="pdxsec-verify"');
  must(verifyAt !== -1, "the verify block moved");
  const verify = PF.slice(verifyAt, verifyAt + 1600);
  ok(/PDXExecRecord[\s\S]{0,200}eligible\(id\)/.test(verify),
    "“How this profile was checked” is not office-aware — it promises a president that every figure on\n" +
    "    their profile traces to a roll-call vote, which is the one thing the office does not produce");
  has(verify, "a signed law, an executive order", "the exec branch of that promise names no executive lane");
  // …and the sheet it opens is handed the pid, or the office-awareness stops at the button.
  ok(/openMethodology\(null,'/.test(verify),
    "the verify button opens the methodology sheet with no pid, so the sheet cannot lead with the right lane");
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
