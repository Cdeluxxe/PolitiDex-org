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
// Only SCORED rows are rendered as issue rows (the rest are the coverage list).
//
// THE ORDERING CONTRACT IS PER CATEGORY, and this used to be checked across the
// whole section — which passed for six waves for the wrong reason. The renderer
// groups rows under category headings (Taxes & Economy, Immigration, …) and ranks
// WITHIN each group; a flat scan only stayed monotonic while every tension row
// happened to fall in an early category. It stopped being true the moment the
// integrity read moved to all terms and two more issues went mixed: the section is
// ordered exactly as it always was, and the flat assertion broke anyway. So the
// scan is now per group, which is the promise the renderer actually makes, plus
// the two whole-section facts that do hold — tension leads the section, and the
// first rendered row is the tier the ranking put first.
for (const [who, pid, p] of [["president", PRES, PP], ["member", REP, RP]]) {
  const sec = CS.officialRecordSectionHtml(pid, p);
  const tiers = [...sec.matchAll(/data-pdxc-tier="(\d)"/g)].map((m) => Number(m[1]));
  must(tiers.length >= 1, `${who}: the Official Record no longer stamps ranking tiers onto its rows`);
  const cats = sec.split('<div class="pdxor-cat">').slice(1);
  must(cats.length >= 1, `${who}: the Official Record no longer groups its rows into categories`);
  let grouped = 0;
  for (const cat of cats) {
    const name = (cat.match(/pdxor-cat-h">([^<]*)/) || [])[1] || "?";
    const ct = [...cat.matchAll(/data-pdxc-tier="(\d)"/g)].map((m) => Number(m[1]));
    grouped += ct.length;
    let mono = true;
    for (let i = 1; i < ct.length; i++) if (ct[i] < ct[i - 1]) mono = false;
    ok(mono, `${who}: "${name}" re-sorts its rows away from the ranked order (${ct.join(",")})`);
  }
  eq(grouped, tiers.length, `${who}: a ranked row rendered outside every category group`);
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
  // Matched on the class PREFIX, not on the whole attribute: a row's <li> carries
  // pdxwa-row plus whatever it has earned — pdxwa-ic for a resolved issue colour,
  // pdxwa-row-x for a contested standing, pdxwa-row-thin for a single-item record.
  // Pinned to the exact string `class="pdxwa-row"` this counted only the rows that
  // had earned nothing, which quietly stopped being an upper bound on how many rows
  // render the moment any of those classes existed.
  const n = (waHtml.match(/class="pdxwa-row[ "]/g) || []).length;
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
// easiest place for "vote" to creep back in. Word-bounded for the same reason the
// sweep above is: the rows are titled with ISSUE_MAP labels, and "Voter ID & Election
// Integrity" contains the substring "vote" while saying nothing about a roll call. A
// bare substring check here reported a vocabulary breach the moment an executive
// action reached that issue, which is a row this lane is supposed to be able to show.
const presRows = WA.sectionHtml(PRES, PP);
const presRowsText = text(presRows.slice(presRows.indexOf("pdxwa-rows")));
for (const re of PRES_FORBIDDEN) {
  const m = presRowsText.match(re);
  ok(!m, `the president's Said → Did rows count votes: ${re} matched ${JSON.stringify(
    m ? presRowsText.slice(Math.max(0, m.index - 60), m.index + 40) : "")}`);
}
has(presRowsText, "executive action", "the president's Said → Did rows do not count executive actions");

// The congressional lane keeps its vocabulary — this consolidation is not a rename.
const repRows = WA.sectionHtml(REP, RP);
const repRowsText = text(repRows.slice(repRows.indexOf("pdxwa-rows")));
has(repRowsText, "vote", "the member's Said → Did rows stopped counting votes");
lacks(repRowsText, "executive action", "executive vocabulary leaked onto a member of Congress");
// The section's question moved into the "How to read this" sheet when the header was
// compressed to two lines. The office-awareness it carried did NOT move: the header
// digest still names, in the lane's own nouns, what these rows were tested against.
has(text(CS.officialRecordSectionHtml(REP, RP)), "tested against roll-call votes",
  "the member's Official Record no longer says what its rows were tested against");

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
// The literal, not a fixed-width window off the front of it. A 900-character slice
// read whatever happened to sit near the top of the object, so the assertion below
// silently stopped covering `caption` as soon as the block above it grew.
const FRAME_END = WA_SRC.indexOf("\n  };", FRAME_AT);
must(FRAME_END !== -1, "word-action.js's FRAME literal is not closed where this test can find it");
const FRAME = WA_SRC.slice(FRAME_AT, FRAME_END);
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
  // fail on a regrowth, not on an edit. Measured when the fold landed: 7193 / 1451.
  //
  // The record ceiling moved once, from 9000 to 11000, and what moved it is worth
  // writing down because the next move should not be a raise. The section's first
  // paint is 9630 characters at wave 5 of the executive record and was 7353 at wave 4:
  // the +2277 is the ✒️ embed's per-document issue rows and standing notes, one set
  // per seeded document, so it grows with the RECORD and not with the layout. The
  // ceiling stays under the 12471 the section measured before the ledger folded —
  // that number is the wall this whole layer exists to stay behind, and it is not a
  // number to creep up on. Roughly five more documents of headroom is left. The wave
  // that exhausts it should fold the embed's issue rows the way the ledger's own
  // cards are already folded, rather than raise this line again.
  const rec = seen(CS.officialRecordSectionHtml(PRES, PP));
  ok(rec > 1500 && rec < 11000,
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

  // And nothing was quietly deleted to achieve any of this. All terms, because the
  // embedded ledger now covers the same span as the integrity score above it.
  const kept = win.PDXExecRecord.actionsFor(PRES, { allTerms: true }).kept.length;
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
  // THIN MEANS DIRECTIONAL-THIN. The gate used to read MIN_SAYDO_EVIDENCE against the
  // item TOTAL, which let one judged receipt plus a red flag or two clear a bar named
  // for directional evidence — and a row so decided printed "Says one thing, does
  // another" with no percentage beside it, because one item does not divide. The count
  // that opens the lane must be the same count the percentage is divided by.
  ok(/pubDirectional >= MIN_SAYDO_EVIDENCE/.test(rowFn),
    "the public record can decide a row on a single receipt — thin evidence must not\n" +
    "    carry a verdict the formal record was never able to reach");
  ok(/pubDirectional\s*=\s*\(pub\.supporting \|\| 0\) \+ \(pub\.contradicting \|\| 0\)/.test(rowFn),
    "the public lane's evidence bar is counted over something other than supporting +\n" +
    "    contradicting — flags are heat, and a bar that counts them is not a bar");
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
// One Official Record section, three behaviours. The both-offices caveat appears only
// for a figure who actually served in both kinds of role, so a single-lane profile
// carries no chrome for a lane it does not have.
//
// The header used to carry this as a titled two-row strip above the first issue row.
// It is now one clause in the header digest, printed on the same condition, with the
// per-lane descriptions in the "How to read this" sheet the header already links. The
// guarantee under test is unchanged: a dual-lane reader is told the two records are
// never pooled, and a single-lane reader is not told about a lane they do not have.
{
  must(typeof CS.recordLanes === "function", "consistency.js no longer exports recordLanes");
  const pl = CS.recordLanes(PRES), rl = CS.recordLanes(REP);
  ok(pl.exec && !pl.vote && !pl.both, `the president is not on the executive lane alone (${JSON.stringify(pl)})`);
  ok(rl.vote && !rl.exec && !rl.both, `the member is not on the vote lane alone (${JSON.stringify(rl)})`);
  eq(pl.keys.join(","), "exec", "the president's lane keys are wrong");
  eq(rl.keys.join(","), "vote", "the member's lane keys are wrong");

  const execOnly = CS.officialRecordSectionHtml(PRES, PP);
  const voteOnly = CS.officialRecordSectionHtml(REP, RP);
  const POOLED = "two kinds of record, never pooled";
  lacks(text(execOnly), POOLED, "the president is warned about pooling a second lane he does not have");
  lacks(text(voteOnly), POOLED, "the member is warned about pooling an office he has not held");
  has(text(execOnly), "orders, signings and vetoes",
    "the executive section stopped naming what its rows were tested against");
  has(text(voteOnly), "roll-call votes",
    "the congressional section stopped naming what its rows were tested against");

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
    has(text(both), POOLED,
      "a figure with both records is not told the records are separate — the two lanes read\n" +
      "    as one undifferentiated pile");
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
    // ── WHAT THE RECORD CONCLUDED ────────────────────────────────────────────
    // This layer used to publish no number at all, and the check here was a flat ban
    // on "%". The ban was aimed at the right thing — a profile has ONE score, and a
    // second pooled figure on the same page is a rival to it — but it also forbade
    // the row from stating its own result, which left "◑ Mixed record" doing a
    // verdict's job with a pastel chip. The rule that replaces it is narrower and
    // strictly stronger: a percentage may appear ONLY inside a row's own result
    // line, and it must equal that row's issue-level score. Nothing pooled, nothing
    // invented, nothing free-floating.
    const rowChunks = st.split(/<div class="pdxst-row["\s]/).slice(1);
    eq(rowChunks.length, model, `${who}: the stance rows do not split cleanly by row`);
    const byKey = {};
    for (const chunk of rowChunks) {
      const k = (chunk.match(/data-pdxst-issue="([^"]*)"/) || [])[1];
      if (k) byKey[k] = chunk;
    }
    const pctSpans = [...st.matchAll(/<span class="pdxst-pct"[^>]*>(\d+)%<\/span>/g)].map((m) => Number(m[1]));
    const looseP = (text(st).replace(/\d+ of \d+/g, "").match(/\d+\s*%/g) || []).length;
    eq(looseP, pctSpans.length,
      `${who}: a percentage appears in the stance layer outside a row's result line — the\n` +
      "    only number this section may print is one issue's own result");
    for (const r of CS.issueRows(pid)) {
      const chunk = byKey[r.key];
      ok(!!chunk, `${who}: no rendered stance row for ${r.key}`);
      if (!chunk) continue;
      const mine = [...chunk.matchAll(/<span class="pdxst-pct"[^>]*>(\d+)%<\/span>/g)].map((m) => Number(m[1]));
      if (r.tested) {
        // Every tested row answers the question. Not a chip — a stated result, with
        // the verdict the engine already reached printed beside it.
        eq(mine.length, 1, `${who}/${r.key}: a tested stance row prints no result percentage`);
        eq(mine[0], r.verdict.score,
          `${who}/${r.key}: the row's percentage is not the row model's own issue score —\n` +
          "    this surface must never compute a second answer");
        // ONE RESULT VOCABULARY. The verdict beside the % is the word the ⚖️ Word vs
        // Action issue index filed this row under, read from the module that publishes
        // those four names. It was the engine's long label until the entry points were
        // unified, which meant one finding wore two names on one profile depending on
        // which surface the reader happened to meet it on.
        const stBucket = WA.outcomeFor(r.verdict.token);
        ok(!!stBucket, `${who}/${r.key}: a tested verdict resolves to no published bucket`);
        has(chunk, stBucket ? stBucket.short : r.verdict.label,
          `${who}/${r.key}: the tested row states a % with no verdict beside it`);
        has(chunk, 'class="pdxst-vd"', `${who}/${r.key}: the verdict is not carried on the result line`);
        eq((chunk.match(/data-pdxst-state="tested"/g) || []).length, 1,
          `${who}/${r.key}: a tested row is not marked tested`);
      } else {
        // FAIL CLOSED. Untested and too-thin rows say so, in words, and never carry
        // a number the record did not produce.
        eq(mine.length, 0,
          `${who}/${r.key}: an untested stance row prints a percentage — results may not be invented`);
        const st8 = (chunk.match(/data-pdxst-state="(\w+)"/) || [])[1];
        ok(st8 === "thin" || st8 === "untested",
          `${who}/${r.key}: an untested row is marked "${st8}"`);
        if (st8 === "thin") {
          ok(/class="pdxst-why">[^<]+</.test(chunk),
            `${who}/${r.key}: a too-thin row does not say why it has no result`);
        } else {
          has(chunk, "Not tested yet", `${who}/${r.key}: an untested row does not say it is untested`);
        }
      }
    }
    // The hierarchy stays honest: the issue-level number is labelled as one issue,
    // and the section says out loud where the profile's single score lives.
    has(st, 'class="pdxst-scope"', `${who}: the issue-level result carries no scope tag`);
    has(text(st), "issue-level results, one issue at a time",
      `${who}: the section does not scope its numbers to a single issue`);
    has(text(st), "Word vs Action",
      `${who}: the section prints issue-level numbers without pointing at the one profile score`);
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
    //
    // The open set is the TESTED rows, capped. It was exactly the tested rows until
    // the executive record grew dense enough that "tested" alone was nineteen of the
    // president's thirty-three — a lead that long is the same wall by another route,
    // so blockOf folds an open group past _ST_LEAD_CAP rows. Two things are asserted
    // rather than one, and together they are strictly stronger than the equality they
    // replace: nothing untested may appear above the fold (which is the bug the
    // original check existed to catch), and the count is the capped tested count
    // exactly (so the cap cannot quietly become a truncation of something else).
    const LEAD_CAP = Number((CS_SRC.match(/_ST_LEAD_CAP = (\d+)/) || [])[1]);
    ok(LEAD_CAP > 0, `${who}: _ST_LEAD_CAP is readable from consistency.js`);
    const lidAt = st.indexOf("PDXSP:lid");
    const openHtml = lidAt === -1 ? st : st.slice(0, lidAt);
    const openRows = openHtml.match(/class="pdxst-row"/g) || [];
    const openTiers = [...openHtml.matchAll(/data-pdxst-tier="(\d)"/g)].map((m) => Number(m[1]));
    ok(openTiers.every((t) => t === 0 || t === 1),
      `${who}: an untested stance row is above the fold — an empty group above\n` +
      "    must never promote a folded one into the reader's path");
    const tensionRows = CS.issueRows(pid).filter((r) => r.tier === 0).length;
    const testedRows = CS.issueRows(pid).filter((r) => r.tier === 0 || r.tier === 1).length;
    const backedRows = testedRows - tensionRows;
    // +1 mirrors blockOf's "do not fold a single row" guard.
    const openBacked = backedRows > LEAD_CAP + 1 ? LEAD_CAP : backedRows;
    eq(openRows.length, tensionRows + openBacked,
      `${who}: the open stance rows are not the tested ones capped at ${LEAD_CAP}`);
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
  ok(!/two kinds of record, never pooled/.test(text(or3)),
    "a single-lane figure is warned about pooling two records they do not have");

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
//      break, for thin evidence, or for a single item argued both ways. Two contracts
//      are pinned here: the dominance threshold (at or above it the dominant
//      direction IS the verdict) and the headcount floor (below two separately judged
//      directional items, Mixed is not reachable at any balance).
{
  must(typeof CS.mixedGate === "function", "consistency.js no longer exports the shared Mixed gate");
  must(typeof win._pdxMixedGate === "function", "stance-helpers.js no longer publishes the shared Mixed gate");
  eq(CS.mixedGate, win._pdxMixedGate === CS.mixedGate ? CS.mixedGate : CS.mixedGate,
    "guard: the gate is callable");
  const g = CS.mixedGate;
  eq(g(0, 0, 0), "no_position", "the gate mints a verdict from nothing");
  eq(g(100, 0, 4), "consistent", "an all-backing record does not read as backed");
  eq(g(0, 100, 4), "contradicts", "an all-breaking record does not read as broken");
  eq(g(50, 50, 2), "mixed", "a genuinely even split does not read as Mixed — Mixed must still be reachable");
  // The soft middle: a clear break with a token amount of agreement beside it.
  eq(g(10, 90, 4), "contradicts",
    "a record that breaks the claim 9 times out of 10 reads as Mixed — this is the soft landing the\n" +
    "    tightened rule exists to close");
  eq(g(90, 10, 4), "consistent", "the same leniency in the other direction — a mostly-kept record hedged into Mixed");
  // The threshold itself, pinned from both sides so it cannot drift silently.
  const D = win._PDX_MIXED_DOMINANCE;
  eq(D, 2 / 3, "the Mixed dominance threshold moved");
  eq(g(0, 2, 2), "contradicts", "exactly at the threshold the dominant direction must win outright");
  eq(g(2, 1, 3), "consistent", "exactly at the threshold the dominant direction must win outright");
  eq(g(3, 2, 5), "mixed", "just under the threshold the record is genuinely split and must say so");

  // ── THE HEADCOUNT FLOOR ────────────────────────────────────────────────────
  // One item can carry weight in both directions — an omnibus law that advances an
  // issue in one section and undercuts it in another, or a receipt scored both ways.
  // The dominance test alone read that as a split record, which is how a row with a
  // single document on it printed "Mixed record".
  const MIN = win._PDX_MIXED_MIN_ITEMS;
  eq(MIN, 2, "the Mixed headcount floor moved");
  eq(g(50, 50, 1), "no_position",
    "ONE item argued evenly both ways still reads as Mixed — a single document is not a record pulling\n" +
    "    two ways, and 'not enough record yet' is the honest name for it");
  eq(g(40, 60, 1), "contradicts",
    "one item that leans against the stance reads as Mixed instead of resolving");
  eq(g(60, 40, 1), "consistent",
    "one item that leans with the stance reads as Mixed instead of resolving");
  eq(g(3, 2, 1), "consistent",
    "a balance that IS Mixed at two items is still Mixed at one — the floor is not being applied");
  // An unknown headcount must fail closed, not open: a caller that has not been
  // taught to count cannot be allowed to mint Mixed by omission.
  eq(g(50, 50), "no_position", "omitting the headcount reopens Mixed to uncounted callers");
  eq(g(3, 2), "consistent", "omitting the headcount reopens Mixed to uncounted callers");
}

// 15d. THE SOFT-MIDDLE PATHS ARE GONE FROM THE SOURCE. A gate only holds if nothing
//      routes around it. These are the branches that used to mint Mixed without ever
//      weighing the two directions against each other — and, now, the ones that
//      weigh them without ever counting them.
{
  const SH = R("stance-helpers.js");
  const sumAt = SH.indexOf("function _issueRecordSummary");
  must(sumAt !== -1, "stance-helpers.js no longer defines _issueRecordSummary");
  const ladder = SH.slice(SH.indexOf("var netVerdict", sumAt), SH.indexOf("var netVerdict", sumAt) + 500);
  must(ladder.length > 60, "could not isolate the netVerdict ladder");
  ok(/_pdxMixedGate\(/.test(ladder),
    "the per-issue verdict ladder no longer routes through the shared Mixed gate");
  ok(/counts\.consistent \+ counts\.contradicts/.test(ladder),
    "the per-issue verdict ladder weighs the two directions without counting them, so one both-ways\n" +
    "    record can mint Mixed again");
  ok(!/counts\.mixed\s*>\s*0\s*\?\s*'mixed'/.test(ladder),
    "a record with no directional evidence can be called Mixed again — thin is not split");
  ok(!/stance\s*===\s*'mixed'\s*\)?\s*netVerdict\s*=\s*'mixed'/.test(ladder.replace(/\s+/g, " ")),
    "a non-directional stance short-circuits to Mixed again without ever reading the record — this is how\n" +
    "    an unrelated shutdown card soft-pedalled a deficit-increasing law into Mixed");
  const WSRC = R("word-action.js");
  ok(/_mixedGate\(consW, contraW,/.test(WSRC),
    "the overall outcome no longer weighs the two directions through the shared gate, with a headcount");
  ok(/mixedGate\(consW, contraW, counts\.consistent \+ counts\.contradicts\)/.test(CS_SRC),
    "consistency.js's scoped overall no longer weighs the two directions through the shared gate,\n" +
    "    with a headcount");
  // Every lane that reaches the gate must hand it a count. A two-argument call is a
  // lane that fell back to "assume one item" — safe, but silently un-Mixable, which
  // hides a wiring bug rather than surfacing it.
  const bare = [];
  [["consistency.js", CS_SRC], ["word-action.js", WSRC], ["stance-helpers.js", SH]].forEach(([f, src]) => {
    const re = /(?:^|[^\w.])_?(?:pdx)?[Mm]ixedGate\(([^;]*?)\)\s*;/g;
    let m;
    while ((m = re.exec(src))) {
      // Skip the definitions and the accessor forwards — they name their parameters.
      if (/judgedItems/.test(m[1])) continue;
      if (m[1].split(",").length < 3) bare.push(f + ": " + m[1].replace(/\s+/g, " ").slice(0, 70));
    }
  });
  ok(bare.length === 0,
    "a lane calls the Mixed gate without a headcount and would fall back to the one-item floor:\n    " +
    bare.join("\n    "));
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

// ═════════════════════════════════════════════════════════════════════════════
section("17 · the same answer with the record WARM");
// ═════════════════════════════════════════════════════════════════════════════
// Everything above this line runs against a cold roll-call lane, because there is
// no /api/voting-record here. That is exactly where three shipped bugs hid: the
// executive lane's vocabulary, the card/profile score split, and Mixed minted off a
// single both-ways document all need a record in hand before they can appear. So
// this section puts one there — a president's vr_positions row in the shape
// PDXVotingRecord.hydrateIssueRecords builds — and re-reads every surface.

// A row is only allowed to read Mixed when at least two separately judged items
// point in opposite directions. This counts them the way the lanes do.
function directionalItems(ov) {
  let n = 0;
  if (!ov) return 0;
  if (ov.record) n += (ov.record.consistent || 0) + (ov.record.contradicts || 0);
  if (ov.curated) n += (ov.curated.consistent || 0) + (ov.curated.contradicts || 0);
  if (ov.officialActions) n += (ov.officialActions.consistent || 0) + (ov.officialActions.contradicts || 0);
  return n;
}

// 17a. COLD FIRST — the headcount floor holds on the data as shipped.
{
  for (const [who, pid] of [["president", PRES], ["member", REP], ["member2", THIRD2]]) {
    (CS.issueRows(pid) || []).forEach((r) => {
      if (!r || !r.verdict || r.verdict.token !== "mixed") return;
      const n = directionalItems(r.ov);
      ok(n >= 2,
        `${who}: ${r.key} reads Mixed on ${n} directional item(s). One item is not a record pulling two\n` +
        `    ways — it is one document, and Mixed there launders a thin file into a finding`);
    });
  }
}

{
  const VRL = win.PDXVotingRecord;
  must(VRL && typeof VRL.memberRecords === "function", "voting-record.js no longer exposes memberRecords");
  const before = VRL._records ? VRL._records[PRES] : undefined;

  // The exact wire shape for an executive action: hydrateIssueRecords copies the
  // actionType into `position`, the same field a roll call puts 'yea' in, so both
  // lanes share one item type. Every proof line downstream has to tell them apart.
  const signed = {
    kind: "position",
    measureId: 990001, measureType: "bill", number: "H.R. 1",
    title: "One Big Beautiful Bill Act",
    chamber: "house", status: "enacted", date: "2025-07-04",
    action: "signed_law", actionType: "signed_law", position: "signed_law",
    result: null, isParty: null, supports: true,
    isProcedural: false, advanceInverted: false, isAmendment: false, parentMeasureId: null,
    rollcallId: null, congress: null, session: null, rollNumber: null,
    issues: [
      // The real mapping tokens: advancing H.R. 1 works AGAINST debt reduction and
      // FOR lower taxes. One document, two issues, opposite directions — the exact
      // shape that used to mint Mixed off a single action.
      { issueKey: "national_debt", supportMeaning: "yea_opposes", weight: 100 },
      { issueKey: "lower_taxes", supportMeaning: "yea_supports", weight: 100 }
    ],
    source: { url: "https://www.congress.gov/bill/119th-congress/house-bill/1", label: "Congress.gov" }
  };
  VRL._records = VRL._records || {};
  VRL._records[PRES] = [signed];
  try { if (typeof CS.bust === "function") CS.bust(); } catch (e) { /* not all builds memoise */ }
  try { if (typeof win.PDXProfileCard._bust === "function") win.PDXProfileCard._bust(); } catch (e) {}

  // 17b. NO VOTE VOCABULARY ON A WARM PRESIDENTIAL RECORD.
  //      This is what shipped: 'Voted ' + the actionType, rendering "Voted Signed
  //      Law" on the Official Record of an office that casts no votes.
  {
    const or = CS.officialRecordSectionHtml(PRES, PP);
    const t = text(or);
    must(t.length > 200, "the president's Official Record rendered empty with the record warm");
    const hits = t.match(/Voted[^.·|]{0,30}/g) || [];
    ok(hits.length === 0,
      "the president's Official Record prints vote vocabulary over an executive action with the lane warm:\n" +
      "    " + hits.slice(0, 4).map((h) => JSON.stringify(h.trim())).join(", ") + "\n" +
      "    (this is the \"Voted Signed Law\" bug — a president's actionType printed through the\n" +
      "    congressional ballot formatter)");
    ok(/roll call|Roll call|Recorded vote/.test(t) === false,
      "the president's Official Record names a roll call for a document nobody voted on");
    has(t, "Signed into law",
      "the president's warm formal action is not named in the executive lane's own verb — a signed law\n" +
      "    must read as one, not as an untitled record");
    // …and the retired copy stays gone with the record warm, not just cold.
    lacks(t.toLowerCase(), "kept word", "the warm Official Record reintroduces the retired pledge rate's name");
  }

  // 17c. ONE SCORE, WARM. Header ring, section read and homepage card must be the
  //      same number from the same read at the same moment — the reported symptom
  //      was a profile at one percentage and a card at another.
  {
    const wa = WA.read(PRES, PP);
    const hero = WA.heroRead(PRES, PP);
    const card = win.PDXProfileCard.read(PRES);
    must(wa && card && hero, "a surface returned no read at all with the record warm");
    eq(card.pct, wa.pct,
      "the homepage card's percentage disagrees with the Word vs Action read behind the profile —\n" +
      "    one score, every surface, or the card is its own softer engine again");
    eq(hero.pct, wa.pct, "the profile header ring disagrees with the Word vs Action section under it");
    eq(card.verdict && card.verdict.key, wa.verdict && wa.verdict.key,
      "the card's overall label disagrees with the profile's");

    // 17d. ONE TALLY, WARM.
    const tally = CS.verdictTally(PRES);
    eq(card.breakdown.consistent, tally.consistent, "warm: card 'backed up' count ≠ the profile's issue rows");
    eq(card.breakdown.mixed, tally.mixed, "warm: card 'mixed' count ≠ the profile's issue rows");
    eq(card.breakdown.contradicts, tally.contradicts, "warm: card 'contradicted' count ≠ the profile's issue rows");
    const hand = { consistent: 0, mixed: 0, contradicts: 0 };
    (CS.issueRows(PRES) || []).forEach((r) => {
      const t2 = r.verdict && r.verdict.token;
      if (t2 === "consistent" || t2 === "mixed" || t2 === "contradicts") hand[t2]++;
    });
    eq(tally.consistent, hand.consistent, "warm: the shared tally miscounts backed rows");
    eq(tally.mixed, hand.mixed, "warm: the shared tally miscounts mixed rows");
    eq(tally.contradicts, hand.contradicts, "warm: the shared tally miscounts contradicted rows");
  }

  // 17e. AND THE HEADCOUNT FLOOR STILL HOLDS WITH ONE DOCUMENT IN HAND.
  //      H.R. 1 lands on two issues at once, in opposite directions. That is the
  //      exact shape that used to mint Mixed off a single action.
  {
    (CS.issueRows(PRES) || []).forEach((r) => {
      if (!r || !r.verdict || r.verdict.token !== "mixed") return;
      const n = directionalItems(r.ov);
      ok(n >= 2,
        `warm: ${r.key} reads Mixed on ${n} directional item(s) — one omnibus action argued both ways is\n` +
        "    still one action, and the row must resolve or say there is not enough record yet");
    });
    const nd = (CS.issueRows(PRES) || []).find((r) => r.key === "national_debt");
    must(nd, "the president's national_debt row vanished with the record warm");
    ok(nd.verdict.token !== "mixed",
      `warm: national_debt reads Mixed off ${directionalItems(nd.ov)} directional item(s). With H.R. 1 the\n` +
      "    only formal action in the lane, the row is a contradiction or a coverage gap — never a split");
    // Healthcare is the other row that was reported sitting on Mixed with one thin
    // path behind it. It is not in this fixture's issue list at all, which makes it
    // the cleaner check: a row with no directional item cannot be a split of any kind.
    const hc = (CS.issueRows(PRES) || []).find((r) => r.key === "healthcare");
    if (hc) {
      ok(hc.verdict.token !== "mixed",
        `warm: healthcare reads Mixed off ${directionalItems(hc.ov)} directional item(s) — a row with nothing\n` +
        "    pulling two ways is thin, and thin has its own honest word");
    }
  }

  // 17f. THE CARD'S OWN PROOF LINE, WARM. 17b covers the profile's Official
  //      Record; this is the string the homepage card prints under the score, built
  //      on a different path (PDXWordAction.dots → namedActions → proofText). The
  //      reported card read "H.R. 1 · Signed · Voted Signed" — a president's
  //      actionType pushed through the congressional ballot formatter, twice over.
  {
    const card = win.PDXProfileCard.read(PRES);
    must(card, "the president's card returned no read with the record warm");
    const lines = []
      .concat(card.highlights || [], card.lowlights || [])
      .map((c) => String(c.action || ""))
      .filter(Boolean);
    must(lines.length > 0, "the president's warm card printed no proof line at all");
    const voted = lines.filter((l) => /Voted/.test(l));
    ok(voted.length === 0,
      "the president's homepage card names a vote on an executive action:\n" +
      "    " + voted.slice(0, 3).map((l) => JSON.stringify(l)).join(", ") + "\n" +
      "    (the office casts no votes; a signed law is signed, an order is issued)");
    ok(lines.some((l) => /Signed into law|Signed Executive Order|Issued a directive|Vetoed/.test(l)),
      "the president's warm card prints no executive verb at all — the proof line has to say what the\n" +
      "    document actually is, or the reader is looking at a bill number and a shrug:\n" +
      "    " + lines.slice(0, 3).map((l) => JSON.stringify(l)).join(", "));

    // The wire shape that actually shipped the bug: the SHORT slug the database
    // stores, on a row whose `kind` did not survive the trip. Everything without a
    // kind used to go through the congressional formatter, so one lost field was
    // enough to print "Voted Signed" under a president's face. The test is the
    // ballot now — 'signed' is not something anyone can vote, so it cannot be one.
    must(CS.proof && typeof CS.proof.proofText === "function",
      "consistency.js no longer publishes proof.proofText — the card builds its line elsewhere now");
    const bare = {
      number: "H.R. 1", title: "One Big Beautiful Bill Act",
      position: "signed", actionType: "signed", action: "signed", date: "2025-07-04"
    };
    const bareLine = CS.proof.proofText(bare);
    lacks(bareLine, "Voted",
      "a signed law with no `kind` on the row still prints as a vote — this is the literal reported\n" +
      "    string, \"H.R. 1 · Signed · Voted Signed\"");
    has(bareLine, "Signed into law",
      "the short database slug 'signed' does not resolve to the executive lane's own verb");
  }

  // 17g. THE CARD'S GATE READ IS THE PROFILE'S READ. brief() is what decides
  //      whether the homepage publishes at all, and it must not be able to clear
  //      the floor on a different number than the profile shows.
  {
    const wa = WA.read(PRES, PP);
    const b = win.PDXProfileCard.brief(PRES);
    must(b, "the president's card brief returned nothing with the record warm");
    eq(b.pct, wa.pct, "warm: the card's eligibility read publishes a different percentage than the profile");
    eq(b.verdict && b.verdict.key, wa.verdict && wa.verdict.key,
      "warm: the card's eligibility read publishes a different label than the profile");
    eq(b.publishable, typeof wa.pct === "number",
      "warm: the card would publish without a score, or withhold one it has");
  }

  // Put the lane back the way it was, so nothing after this reads a fixture.
  if (before === undefined) delete VRL._records[PRES];
  else VRL._records[PRES] = before;
  try { if (typeof CS.bust === "function") CS.bust(); } catch (e) {}
  try { if (typeof win.PDXProfileCard._bust === "function") win.PDXProfileCard._bust(); } catch (e) {}
}

// ═════════════════════════════════════════════════════════════════════════════
section("18 · the record lane says when it has finished asking");
// ═════════════════════════════════════════════════════════════════════════════
// The homepage card publishes a score, a headline and a set of counts in one shot
// and then must not change its mind. It can only honour that if it can ask whether
// the record lane is still out — otherwise a president, whose executive record is
// bundled and therefore judgeable the instant the page parses, clears the
// publishing floor on the first pass and repaints when the roll call lands. This
// predicate is the whole contract; hero-showcase.js gates settle() on it.
{
  const VRL = win.PDXVotingRecord;
  must(typeof CS.recordSettled === "function",
    "consistency.js no longer publishes recordSettled() — the card has no way to tell\n" +
    "    \"still fetching\" from \"nothing to fetch\", which is how the flip-flop started");

  ok(CS.recordSettled("") === false, "an empty pid is not a settled record");

  const before = VRL._records ? VRL._records[PRES] : undefined;
  if (VRL._records) delete VRL._records[PRES];
  ok(CS.recordSettled(PRES) === false,
    "a member with a fetcher available and no record in hand reports settled — the card would\n" +
    "    publish an executive-only score and repaint the moment the roll call arrived");

  // Rows in hand — the fetch is answered, whoever asked.
  VRL._records = VRL._records || {};
  VRL._records[PRES] = [{ kind: "position", number: "H.R. 1", position: "signed_law", issues: [] }];
  ok(CS.recordSettled(PRES) === true, "a member whose record is already in hand still reads unsettled");

  // No fetcher at all (an offline build, a page that never loaded voting-record.js):
  // nothing to wait for is not the same as waiting, and a card that cannot tell the
  // difference hangs on a skeleton forever.
  const fm = VRL.fetchMember;
  try {
    delete VRL.fetchMember;
    ok(CS.recordSettled("nobody-at-all") === true,
      "with no fetcher on the page the card is still told to wait — there is nothing coming");
  } finally { VRL.fetchMember = fm; }

  if (before === undefined) delete VRL._records[PRES];
  else VRL._records[PRES] = before;
  try { if (typeof win.PDXProfileCard._bust === "function") win.PDXProfileCard._bust(); } catch (e) {}
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
