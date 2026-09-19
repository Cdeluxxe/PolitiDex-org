#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-money-two-chips.mjs — two money pills, two units, and never one number
// ─────────────────────────────────────────────────────────────────────────────
// The person-file letterhead carries TWO 💰 chips now:
//
//   💰 $774M itemized receipts · 2024 · FEC           → campaign filings block
//   💰 $1–5M disclosed · 10 yrs in office · 2024 FD   → disclosures block
//
// They sit inches apart, in one row, under one glyph, in one colour pair — and
// they are not two views of one number. The first is what a CAMPAIGN raised and
// reported to an election authority under contribution limits. The second is
// what a PERSON told a clerk they own while holding the office. Two archives,
// two units, two spans.
//
// Everything this file fences follows from that one sentence:
//
//   1. THERE ARE TWO OF THEM, MOUNTED IN ORDER, IN THE PILL ROW. Both after the
//      record chips and ⚖️, both before the party pill, receipts first, each
//      guarded so a page without the lane still renders a letterhead.
//   2. THE RECEIPTS PILL KEEPS ITS UNIT AND ITS PROVENANCE. "itemized receipts"
//      and the archive the filing came out of, read off the filing's own source
//      URL. A bare dollar figure beside a person's name is the one reading we
//      are certain is wrong, and with a personal-wealth pill four inches away
//      the unit is the only thing telling the two figures apart.
//   3. A RANGE NEVER BECOMES A NUMBER. A disclosure that reports "$1,000,001 –
//      $5,000,000" prints that band. No midpoint, no parse, no single dollar
//      figure anywhere on the pill, in the label, or in the section block —
//      because the form does not contain one and the filer never filed one.
//   4. MISSING IS NOT ZERO. No disclosure row means words, on every profile,
//      never "$0", never an absent pill. The table ships EMPTY, so this is the
//      state every profile on the site is in today.
//   5. THE CLICK TARGETS DIFFER. Receipts opens the campaign-filings block,
//      wealth opens the disclosures block. Checked by CALLING both against a
//      document and watching where focus lands, not by reading an attribute.
//   6. NO SUM, ANYWHERE. No surface adds, averages, ranks or ratios the two
//      figures; no expression in the disclosure module can, because it never
//      sees a receipts figure.
//   7. NO %, NO GRADE, NO TIER, ON EITHER PILL. Including the accessible name.
//   8. TWIN BOOT. Direction Match, the formal pattern index, the publication
//      floor and the mapped counts are byte-identical with BOTH chips mounted
//      and with neither, and the mount leaves no new global behind.
//   9. AND BEHIND THE DOORS, TWO BLOCKS AND NOTHING ELSE. The person file used
//      to carry a third money surface: a deferred drawer with a 0-100 funding
//      integrity number under a HIGH / MODERATE / LOW badge, three net-worth
//      tiles with a percent change, a wealth-over-time chart drawn from five
//      hand-written members, and an authored donor list. It is deleted, and
//      section 11 renders the real section to say so — no tier word, no report
//      card, no canvas, no percent change, no donor string that is not a line
//      on the filing, and no control that leaves the person file.
//  10. AND THE CURATION WAVE'S OWN RULES, because the table is hand-written and
//      the first wave has now run. Section 12 pins what may be typed into a row
//      (a figure as filed, the form's year, an https .gov link to the document,
//      three fields and no fourth, and no stored years of service), pins the
//      filed-category lookup pair by pair — the condition a ticked box is
//      allowed to be shortened to pill width under — and asserts the wave's
//      result: the Utah slice it went looking for ships ZERO rows, because
//      Utah's own in-office form prints no value at all and a federal FD prints
//      per-asset categories with no total, so there is no filed figure to quote
//      without adding ranges together or borrowing somebody's estimate.
//
//   node scripts/test-money-two-chips.mjs
//
// Real shipped modules in a node:vm sandbox over the REAL FTM_FUNDING seed and
// the real roster. The disclosure table is empty in the repo, so the on-file
// disclosure states are exercised through PDXFinance._setWealthTable — the same
// seam an ingest wave would fill — with rows shaped exactly as the header
// documents them. Nothing here writes a disclosure into the shipped table.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const FTM_SRC = R("ftm-data.js");
const LANE_SRC = R("finance-lane.js");
const FIN_SRC = R("pdx-finance.js");
const PFF = R("profiles-full.js");

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
const visible = (html) => String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const aria = (html) => (/aria-label="([^"]*)"/.exec(String(html)) || [])[1] || "";
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ money two chips: ${msg}`);
  process.exit(1);
};

// ── The real seed, lifted out of ftm-data.js ─────────────────────────────────
// Same lift the other two finance tests perform, for the same reason: a fixture
// would keep passing while the shipped filings broke.
function liftSeed() {
  const at = FTM_SRC.indexOf("var FTM_FUNDING = {");
  must(at > 0, "FTM_FUNDING is no longer in ftm-data.js");
  const end = FTM_SRC.indexOf("\n    };", at);
  must(end > at, "could not find the end of the FTM_FUNDING literal");
  const literal = FTM_SRC.slice(at + "var FTM_FUNDING = ".length, end + "\n    }".length);
  return new Function("return (" + literal + ");")();
}
const SEED = liftSeed();
const SEED_IDS = Object.keys(SEED);
must(SEED_IDS.length >= 10, `the funding seed is unexpectedly small (${SEED_IDS.length})`);
const AS_OF = (FTM_SRC.match(/var FTM_AS_OF = '([^']*)'/) || [])[1] || "";

// THE DISCLOSURE ROWS THE INGEST WAVE WOULD WRITE, shaped exactly as
// pdx-finance.js's header documents them. A BAND is the first fixture on purpose:
// it is the shape that must never be reduced to a number, and it is the shape
// almost every real federal disclosure has.
const FD_FIXTURE = {
  lee: { rangeOrExact: "$1–5M", year: "2024",
         formUrl: "https://efdsearch.senate.gov/search/view/annual/example/" },
  // An EXACT figure, for the jurisdictions that publish one. Same field, same
  // string handling — the difference is in the document, not in our arithmetic.
  curtis: { rangeOrExact: "$2,480,119", year: "2023",
            formUrl: "https://disclosures-clerk.house.gov/example.pdf" },
  // A band with no form link on file. The block must say so rather than render a
  // dead anchor that looks live.
  owens: { rangeOrExact: "$100,001–$250,000", year: "2024", formUrl: "" },
};

// THE REAL TENURE OWNER, LIFTED RATHER THAN REIMPLEMENTED. pdx-finance.js asks
// window._pdxTenure for the years on the disclosure pill and asks nobody else —
// it carries no copy of the arithmetic, because two answers to "how long have
// they served" is how the money chip and the letterhead's own 🗓️ pill come to
// disagree in the same row. voter-hub-location.js owns it, and that module is a
// homepage module with a DOM to boot, so its three tenure functions are lifted
// out of the shipped source and run alone. A fixture here would be the second
// implementation the shipped file just deleted.
const LOC_SRC = R("voter-hub-location.js");
function tenureOwnerSrc() {
  const at = LOC_SRC.indexOf("var _PDX_TENURE_MONTHS");
  must(at > 0, "voter-hub-location.js no longer opens its tenure block where expected");
  const end = LOC_SRC.indexOf("window._pdxTenurePill = function");
  must(end > at, "voter-hub-location.js no longer defines _pdxTenurePill after _pdxTenure");
  const src = LOC_SRC.slice(at, end);
  must(src.indexOf("window._pdxTenure = function") > 0,
    "the lifted block does not contain _pdxTenure — the lift boundaries moved");
  return src;
}
const TENURE_SRC = tenureOwnerSrc();

// A box with the roster, the filings and the disclosure helpers, in the shipped
// load order: ftm accessors, then pdx-finance.js, then the lane. `noTenure`
// leaves window._pdxTenure out, which is the state of person.html today.
function box(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  vm.runInContext(R("cmp-data.js"), ctx, { filename: "cmp-data.js" });
  if (!opts.noTenure) {
    vm.runInContext(TENURE_SRC, ctx, { filename: "voter-hub-location.js (tenure)" });
    must(typeof win._pdxTenure === "function", "the lifted tenure block installed no _pdxTenure");
  }
  win.PROFILES = win.CMP_DATA;
  win._FTM_BY_ID = {};
  for (const id of SEED_IDS) win._FTM_BY_ID[id] = { id, name: id, funding: SEED[id] };
  win.FTM_AS_OF = AS_OF;
  vm.runInContext(FIN_SRC, ctx, { filename: "pdx-finance.js" });
  must(win.PDXFinance, "pdx-finance.js did not install PDXFinance");
  vm.runInContext(LANE_SRC, ctx, { filename: "finance-lane.js" });
  must(win.PDXFinanceLane, "finance-lane.js did not install PDXFinanceLane");
  if (opts.disclosures) win.PDXFinance._setWealthTable(opts.disclosures);
  return win;
}
const BARE = box();                              // the repo as it ships: no FD rows
const FILLED = box({ disclosures: FD_FIXTURE }); // the repo after the wave
const L = BARE.PDXFinanceLane;
const F = BARE.PDXFinance;
const LF = FILLED.PDXFinanceLane;
const ROSTER = BARE.CMP_DATA || {};
must(Object.keys(ROSTER).length > 500, "cmp-data.js did not load a roster");

console.log(`   two chips: ${SEED_IDS.length} filings · ${Object.keys(ROSTER).length} rostered · ` +
  `${Object.keys(FD_FIXTURE).length} disclosure rows under test`);

// ── 1 · two chips, in order, in the pill row ─────────────────────────────────
{
  section("1 · the letterhead mounts two money pills, receipts then disclosures, before the party");

  const M1 = "PDXFinanceLane.letterheadChipMount(id)";
  const M2 = "PDXFinanceLane.wealthLetterheadChipMount(id, p)";
  has(PFF, M1, "the letterhead mounts the receipts chip");
  has(PFF, M2, "…and the disclosures chip");

  // ORDER IS THE CLAIM. Money is a side lane: two money pills above the name or
  // the formal-record chips would make finance the letterhead's lead read, and
  // the party pill between them would break the money into two unrelated facts.
  const order = [
    ['<h2 class="profile-name">', "the person's name"],
    ["_recChipsMount()", "the formal-record chips"],
    ["PDXWordAction.compactBadgeMount", "the ⚖️ chip"],
    [M1, "the 💰 receipts chip"],
    [M2, "the 💰 disclosures chip"],
    ['<span class="profile-party">', "the party pill"],
  ];
  let last = -1, lastWhat = "the top of the letterhead";
  for (const [needle, what] of order) {
    const at = PFF.indexOf(needle);
    ok(at > 0, `the letterhead renders ${what}`);
    ok(at > last, `${what} comes after ${lastWhat}`);
    last = at; lastWhat = what;
  }
  // …and the two are ADJACENT. Nothing between them: a chip row that reads
  // 💰 receipts · party · 💰 disclosed has told a reader the two are unrelated.
  const between = PFF.slice(PFF.indexOf(M1) + M1.length, PFF.indexOf(M2));
  lacks(between, "profile-party", "nothing but comment sits between the two money pills");
  lacks(between, "Mount(", "…and no third control was slipped between them");

  // BOTH GUARDED. A person file must render on a page where the lane never
  // arrived, and must fall back to NOTHING rather than to a placeholder — a
  // greyed "—" where a money figure goes is a figure.
  for (const [m, what] of [[M1, "receipts"], [M2, "disclosures"]]) {
    const at = PFF.indexOf(m);
    const call = PFF.slice(at - 240, at + m.length + 40);
    has(call, "typeof window.PDXFinanceLane", `the ${what} mount is guarded`);
    ok(/\?[\s\S]*:\s*''/.test(call), `…and the ${what} mount falls back to nothing`);
  }

  // THE MOUNTS THEMSELVES, called. Two buttons, both pills, in every state.
  for (const id of ["lee", "curtis", "nobody_at_all"]) {
    const a = L.letterheadChipMount(id);
    const b = L.wealthLetterheadChipMount(id, ROSTER[id] || null);
    has(a, 'class="pdx-mchip"', `${id}: the receipts mount renders a pill`);
    has(b, 'class="pdx-mchip"', `${id}: the disclosures mount renders a pill`);
    eq((a + b).split('data-pdx-mchip-lane="').length - 1, 2,
      `${id}: the row carries exactly two money lanes`);
    has(a, 'data-pdx-mchip-lane="receipts"', `${id}: …one of them receipts`);
    has(b, 'data-pdx-mchip-lane="wealth"', `${id}: …and one of them wealth`);
  }

  // THE DISCLOSURE PILL CARRIES NO HOST AND SCHEDULES NO TIMER, and that
  // asymmetry with the receipts pill is deliberate: the filings index is built
  // inside index.html's Follow-the-Money IIFE and can legitimately arrive after a
  // letterhead renders, which is what the receipts chip's one-shot repaint is
  // for. The disclosure table is an inline object literal loaded before any
  // profile renders. A re-read seam that can never fire is worse than none.
  lacks(L.wealthLetterheadChipMount("lee", ROSTER.lee || null), "pdx-mchip-host",
    "the disclosure pill mounts no re-read host it would never use");
  has(L.letterheadChipMount("lee"), "pdx-mchip-host",
    "…while the receipts pill keeps the host its deferred re-read needs");
}

// ── 2 · the receipts pill keeps its unit and its provenance ─────────────────
{
  section("2 · the receipts pill says what kind of dollars these are and where the paper is");

  const c = L.read("lee");
  must(c, "the lane composes no filing for lee");
  const pill = visible(L.letterheadChipHtml("lee"));
  has(pill, c.receiptsFmt, "the figure is the lane's own itemized base");
  has(pill, "itemized receipts", "…with the unit welded to it");
  has(pill, c.cycle, "…and the filing's own cycle year beside it");
  // THE ARCHIVE, off the filing's own source URL rather than typed here — which is
  // why this is derived from the seed's host.
  const SHORTS = [[/fec\.gov/, "FEC"], [/disclosures\.utah\.gov/, "Utah disclosures"],
                  [/opensecrets\.org/, "OpenSecrets"]];
  const shortOf = (u) => (SHORTS.find(([re]) => re.test(String(u || ""))) || [])[1] || "filed";
  has(pill, shortOf(c.source), "…and the archive it was transcribed from");
  for (const id of SEED_IDS) {
    const cc = L.read(id);
    if (!cc) continue;
    const w = visible(L.letterheadChipHtml(id));
    has(w, "itemized receipts", `${id}: the unit is on every on-file receipts pill`);
    has(w, shortOf(cc.source), `${id}: …as is the archive its own URL points at`);
  }
  // NOBODY EARNED IT. "$774M" of receipts is a fundraising operation, not income,
  // and no money surface may describe it as money the person made.
  for (const bad of ["earned", "earnings", "income", "salary", "made $", "worth", "net worth",
                     "paid", "took home"]) {
    lacks(pill.toLowerCase(), bad, `the receipts pill does not say "${bad}"`);
    lacks(aria(L.letterheadChipHtml("lee")).toLowerCase(), bad,
      `…nor does its accessible name ("${bad}")`);
  }
}

// ── 3 · a range never becomes a number ──────────────────────────────────────
{
  section("3 · a disclosed band prints as the band — no midpoint, no single figure");

  // $1–5M. A midpoint would be "$3M"; a parse would be 1000000 or 5000000; a
  // "simplification" would be "$5M" or "$1M". None of those is in the document.
  const wr = LF.wealthRead("lee", ROSTER.lee || null);
  eq(wr.state, "file", "a disclosure row reads as `file`");
  const pill = visible(LF.wealthLetterheadChipHtml("lee", ROSTER.lee || null));
  const label = aria(LF.wealthLetterheadChipHtml("lee", ROSTER.lee || null));
  const block = LF.wealthBlockHtml("lee", ROSTER.lee || { name: "Mike Lee" });
  has(pill, "$1–5M", "the pill prints the band exactly as filed");
  has(pill, "disclosed", "…with the verb that describes the act of filing");
  for (const [name, text] of [["the pill", pill], ["its accessible name", label],
                              ["the disclosures block", visible(block)]]) {
    // Every way the band could collapse into one number.
    for (const bad of ["$3M", "$3.0M", "$2.5M", "$5M ", "$1M ", "3000000", "$1,000,001",
                       "midpoint", "average", "approximately", "roughly", "about $", "~$",
                       "estimated", "est."]) {
      lacks(text, bad, `${name} does not reduce the band ("${bad}")`);
    }
    // And the band's own two ends are never printed alone as THE figure: no
    // "or $5M", no "or about $3M". (Prose may say "added together or divided" —
    // what is fenced is an "or" that offers a reader a number to settle on.)
    ok(!/\bor\s+(?:about\s+|roughly\s+|~)?\$/.test(text),
      `${name} does not offer an end of the band to settle on`);
  }
  // THE FIGURE IS A STRING END TO END. The helper hands back exactly what the row
  // carried, with no numeric field alongside it that a consumer could reach for.
  eq(typeof wr.disclosure.rangeOrExact, "string", "the disclosed figure is a string");
  eq(wr.disclosure.rangeOrExact, FD_FIXTURE.lee.rangeOrExact,
    "…and is byte-identical to the row as filed");
  for (const k of Object.keys(wr.disclosure)) {
    if (k === "tenureYears") continue;
    ok(typeof wr.disclosure[k] !== "number",
      `the disclosure read exposes no numeric ${k} a consumer could do arithmetic on`);
  }
  // AN EXACT FIGURE IS ALSO REPORTED AS PUBLISHED — same field, same handling, no
  // rounding into a band and no band invented around it.
  const exact = visible(LF.wealthLetterheadChipHtml("curtis", ROSTER.curtis || null));
  has(exact, "$2,480,119", "an exactly-published figure prints exactly");
  lacks(exact, "$2.5M", "…and is not rounded into a tidier one");
  lacks(exact, "–", "…nor dressed up as a range it was not filed as");

  // NO MIDPOINT MATH IN THE SOURCE, either. The wall is a property of the code:
  // there is no arithmetic operator applied to a disclosure figure anywhere.
  const STRIP = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const finBody = STRIP(FIN_SRC);
  for (const bad of ["parseFloat", "Number(", "parseInt(row", "/ 2", "* 0.5", "Math.round"]) {
    lacks(finBody, bad, `pdx-finance.js does no arithmetic on a filed figure ("${bad}")`);
  }
  has(FIN_SRC, "NO MIDPOINT MATH", "…and says so where the next reader will look");
}

// ── 4 · missing is not zero ─────────────────────────────────────────────────
{
  section("4 · no disclosure means words, on every profile — never $0, never an absent pill");

  // THE SHIPPED STATE OF THE REPO. The disclosure table is empty, so this is
  // every profile on the site today, which is exactly why the empty pill has to
  // be right before the ingest wave rather than after it.
  eq(F.wealth("lee", ROSTER.lee), null, "the shipped table answers null, not a zeroed object");
  eq(F.wealth("nobody_at_all", null), null, "…for an id the roster does not carry either");
  const sample = ["lee", "curtis", "mike_lee"].concat(Object.keys(ROSTER).slice(0, 25));
  let rendered = 0;
  for (const id of sample) {
    const html = L.wealthLetterheadChipMount(id, ROSTER[id] || null);
    if (!html) continue;
    rendered++;
    const words = visible(html);
    has(words, "No in-office wealth file on hand", `${id}: the empty pill says so in words`);
    // NEVER A ZERO AND NEVER A DIGIT. A grey 0 beside a name is a reading of a
    // person assembled out of data nobody has collected.
    ok(!/\$/.test(words), `${id}: …with no dollar sign on it`);
    ok(!/\d/.test(words), `${id}: …and no digit at all`);
    for (const bad of ["$0", "0", "none", "nil", "zero", "clean", "clear", "nothing to report",
                       "no concerns", "unremarkable", "not wealthy", "modest"]) {
      lacks(words.toLowerCase(), bad, `${id}: the empty pill does not say "${bad}"`);
    }
    // THE REASON GOES IN THE LONG FORM, where there is room for it.
    const label = aria(html);
    has(label, "missing data", `${id}: the accessible name carries the coverage disclosure`);
    has(label, "not a disclosure of zero", `${id}: …and says outright that it is not a zero`);
  }
  ok(rendered >= 20, `the empty pill reads right on every profile in the sample (${rendered})`);

  // NOW THE WHOLE ROSTER, not a sample of it. The sample above carries the long
  // failure messages because a named id is what a reader debugs with; this sweep
  // carries the guarantee, because "no digit on a missing disclosure" is only
  // worth anything if it holds for the twelve-hundredth profile as well as the
  // first. Offenders are collected rather than asserted per pid so that a
  // regression prints the names that broke instead of one arbitrary first name.
  const allIds = Object.keys(ROSTER);
  const noPill = [], withDollar = [], withDigit = [], wrongWords = [], wrongLabel = [];
  const ZEROISMS = ["$0", "none", "nil", "zero", "clean", "clear", "nothing to report",
                    "no concerns", "unremarkable", "not wealthy", "modest"];
  const zeroism = [];
  for (const id of allIds) {
    const html = L.wealthLetterheadChipMount(id, ROSTER[id] || null);
    if (!html) { noPill.push(id); continue; }
    const words = visible(html);
    const low = words.toLowerCase();
    if (/\$/.test(words)) withDollar.push(id);
    if (/\d/.test(words)) withDigit.push(id);
    if (words.indexOf("No in-office wealth file on hand") < 0) wrongWords.push(id);
    if (ZEROISMS.some((b) => low.indexOf(b) >= 0)) zeroism.push(id);
    const label = (aria(html) || "").toLowerCase();
    if (label.indexOf("missing data") < 0 || label.indexOf("not a disclosure of zero") < 0) {
      wrongLabel.push(id);
    }
  }
  const nameList = (a) => a.slice(0, 8).join(", ") + (a.length > 8 ? `, +${a.length - 8} more` : "");
  eq(noPill.length, 0,
    `every one of the ${allIds.length} rostered profiles gets a disclosure pill (missing: ${nameList(noPill)})`);
  eq(withDollar.length, 0,
    `no rostered profile prints a dollar sign for a disclosure nobody has filed (${nameList(withDollar)})`);
  eq(withDigit.length, 0,
    `…and no rostered profile prints a digit of any kind (${nameList(withDigit)})`);
  eq(wrongWords.length, 0,
    `every rostered profile says the absence in the same words (off-script: ${nameList(wrongWords)})`);
  eq(zeroism.length, 0,
    `no rostered profile reads the absence as a clean or zero finding (${nameList(zeroism)})`);
  eq(wrongLabel.length, 0,
    `every rostered profile carries "missing data, not a disclosure of zero" in its accessible name (${nameList(wrongLabel)})`);
  ok(allIds.length > 500,
    `the sweep really did cover the roster and not a truncated copy of it (${allIds.length} pids)`);
  // "YET" STAYS RETIRED, in the new copy as in the old. It describes a queue, and
  // for personal disclosures there is no scheduled wave to queue behind.
  const one = visible(L.wealthLetterheadChipHtml("lee", ROSTER.lee));
  lacks(one, "yet", "the empty disclosure pill promises no queue that does not exist");
  lacks(visible(L.letterheadChipHtml("nobody_at_all")), "yet",
    "…and neither does the empty receipts pill");
  // BOTH ABSENCES SPEAK ONE DIALECT. Two pills in one row wearing two different
  // grammars of "nothing here" would read as two different KINDS of nothing.
  has(one, "on hand", "the disclosure absence uses the lane's own words for an absence");
  has(visible(L.letterheadChipHtml("nobody_at_all")), "on hand", "…as does the receipts absence");

  // AND THE SHIPPED TABLE REALLY IS EMPTY — no invented disclosures went in with
  // the plumbing. This is the assertion that fails loudly when somebody fills
  // rows from a news article instead of a form.
  const shipped = FIN_SRC.slice(FIN_SRC.indexOf("var PDX_FD_DISCLOSURES = "),
                                FIN_SRC.indexOf("var FORM_LABEL"));
  has(shipped, "var PDX_FD_DISCLOSURES = {};", "the shipped disclosure table is empty");
  lacks(shipped, "rangeOrExact:", "…with no figure written into it");
  eq(F.coverage().onFile, 0, "…and coverage reports nothing on file rather than guessing");
  has(F.coverage().sentence, "missing data", "…in a sentence that says a blank is missing data");
}

// ── 5 · the click targets differ ────────────────────────────────────────────
{
  section("5 · receipts opens the filings block, wealth opens the disclosures block");

  // Two anchors in one document, each aria-hidden and zero-height in the shipped
  // markup, each marking a different block. "Which block got focus" is the whole
  // question, so both are real and distinguishable here.
  function docBox() {
    const win = box({ disclosures: FD_FIXTURE });
    const CL = win.PDXFinanceLane;
    const log = [];
    const mk = (id, tag) => {
      const blk = {
        id: id + "-block", attrs: { tabindex: null },
        hasAttribute(k) { return this.attrs[k] != null; },
        setAttribute(k, v) { this.attrs[k] = v; },
        getAttribute(k) { return this.attrs[k] == null ? null : this.attrs[k]; },
        focus() { log.push("focus:" + tag); },
        scrollIntoView() { log.push("scroll:" + tag); },
      };
      return {
        anchor: {
          id, nextElementSibling: blk, parentElement: null,
          getAttribute: (k) => (k === "aria-hidden" ? "true" : null),
          hasAttribute: () => true, setAttribute() {},
          focus() { log.push("focus:anchor:" + tag); },
          scrollIntoView(o) { log.push("scroll:anchor:" + tag + ":" + ((o && o.block) || "")); },
        }, blk,
      };
    };
    const filings = mk(CL.SECTION_ID, "filings");
    const wealth = mk(CL.WEALTH_SECTION_ID, "wealth");
    win.document.getElementById = (id) =>
      id === CL.SECTION_ID ? filings.anchor : id === CL.WEALTH_SECTION_ID ? wealth.anchor : null;
    win._pdxNavJump = (id) => { log.push("navJump:" + id); };
    win._pdxRevealTarget = (id) => { log.push("reveal:" + id); };
    win.open = (u) => { log.push("windowOpen:" + u); return null; };
    win.PDXPerson = { open: (p) => { log.push("personOpen:" + p); return true; } };
    win.history = { pushState: (a, b, u) => { log.push("pushState:" + u); } };
    return { win, CL, log, filings, wealth };
  }

  // TWO IDS, AND THEY ARE NOT THE SAME ID.
  ok(L.SECTION_ID && L.WEALTH_SECTION_ID, "both section ids are published");
  ok(L.SECTION_ID !== L.WEALTH_SECTION_ID, "…and they are two different targets");
  eq(L.WEALTH_SECTION_ID, "pdxsec-wealth", "the disclosures block has its own anchor id");

  {
    const { CL, log, filings, wealth } = docBox();
    eq(CL.openSection(), false, "openSection() returns false so an inline handler cannot navigate");
    has(log.join(","), "navJump:" + CL.SECTION_ID, "the receipts pill jumps to the filings block");
    has(log.join(","), "focus:filings", "…and focus lands on the filings block");
    lacks(log.join(","), "focus:wealth", "…and not on the disclosures block");
    eq(filings.blk.getAttribute("tabindex"), "-1", "…made focusable without joining the tab order");
    eq(wealth.blk.getAttribute("tabindex"), null, "…leaving the other block untouched");
  }
  {
    const { CL, log, filings, wealth } = docBox();
    eq(CL.openWealthSection(), false, "openWealthSection() returns false too");
    has(log.join(","), "navJump:" + CL.WEALTH_SECTION_ID,
      "the disclosure pill jumps to the disclosures block");
    has(log.join(","), "focus:wealth", "…and focus lands on the disclosures block");
    lacks(log.join(","), "focus:filings", "…and not on the donor composition");
    eq(wealth.blk.getAttribute("tabindex"), "-1", "…made focusable without joining the tab order");
    eq(filings.blk.getAttribute("tabindex"), null, "…leaving the other block untouched");
  }
  // NEITHER LEAVES THE PAGE. A reader who taps a pill beside a person's name and
  // lands on a national index has been navigated off the file they were reading.
  for (const fn of ["openSection", "openWealthSection"]) {
    const { CL, log } = docBox();
    CL[fn]();
    for (const exit of ["windowOpen", "personOpen", "pushState"]) {
      lacks(log.join(","), exit, `${fn}() takes no exit off the person file ("${exit}")`);
    }
  }
  // EACH PILL'S OWN HANDLER NAMES ITS OWN DOOR, and they are two handlers.
  const h1 = (/onclick="([^"]*)"/.exec(L.letterheadChipHtml("lee")) || [])[1] || "";
  const h2 = (/onclick="([^"]*)"/.exec(L.wealthLetterheadChipHtml("lee", ROSTER.lee)) || [])[1] || "";
  has(h1, "openSection()", "the receipts pill's handler opens the filings block");
  has(h2, "openWealthSection()", "the disclosure pill's handler opens the disclosures block");
  ok(h1 !== h2, "…and the two click targets are not the same call");
  for (const h of [h1, h2]) has(h, "event.stopPropagation()", "both pills stop the card click");

  // THE SPINE KNOWS THE NEW TARGET, or the jump reveals nothing on a deferred
  // stage and a reader lands on a collapsed box.
  const SPINE = R("profile-spine.js");
  has(SPINE, "'pdxsec-wealth': 'money'", "the spine maps the disclosures anchor to the money stage");
  // …and the section really emits it, in BOTH branches — a profile with no
  // campaign filing is not a profile with no disclosure question.
  const FTM = R("ftm-data.js");
  const sec = FTM.slice(FTM.indexOf("window._pdxFundingSection = function"),
                        FTM.indexOf("window._pdxCompareWith = function"));
  eq(sec.split("_pdxWealthBlock(pid, p)").length - 1, 2,
    "both branches of the money section render the disclosures block");
  has(FTM, 'id="pdxsec-wealth"', "…and the anchor exists for the jump to find");
}

// ── 6 · no sum, no ratio, no third number ───────────────────────────────────
{
  section("6 · nothing adds the two pills together, and the disclosure module cannot");

  // THE STRUCTURAL WALL: pdx-finance.js never sees a receipts figure, so no
  // expression in it could combine the two even by accident.
  const STRIP = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const finBody = STRIP(FIN_SRC);
  for (const bad of ["receipts", "receiptsFmt", "totalRaised", "raisedFmt", "funding.",
                     "compose(", "FTM_FUNDING"]) {
    lacks(finBody, bad, `pdx-finance.js cannot see a campaign figure ("${bad}")`);
  }
  has(FIN_SRC, "NO SUM", "…and the wall is written down where the next reader will look");

  // THE RENDERED WALL: no surface prints a combined figure, a ratio or a total.
  const surfaces = [
    ["the receipts pill", LF.letterheadChipHtml("lee")],
    ["the disclosure pill", LF.wealthLetterheadChipHtml("lee", ROSTER.lee)],
    ["the disclosures block", LF.wealthBlockHtml("lee", ROSTER.lee || { name: "Mike Lee" })],
  ];
  for (const [name, html] of surfaces) {
    const text = visible(html) + " " + aria(html);
    for (const bad of ["combined", "total money", "all money", "money total", "sum of",
                       "altogether", "per year in office", "per term", "a year in office",
                       "for every", "times more", "ratio"]) {
      lacks(text.toLowerCase(), bad, `${name} prints no combined read ("${bad}")`);
    }
  }
  // THE TWO FIGURES NEVER SHARE A PILL. Each pill carries exactly one dollar
  // figure, and it is its own.
  const rPill = visible(LF.letterheadChipHtml("lee"));
  const wPill = visible(LF.wealthLetterheadChipHtml("lee", ROSTER.lee));
  const c = LF.read("lee");
  has(rPill, c.receiptsFmt, "the receipts pill carries the receipts figure");
  lacks(rPill, "$1–5M", "…and not the disclosed band");
  has(wPill, "$1–5M", "the disclosure pill carries the disclosed band");
  lacks(wPill, c.receiptsFmt, "…and not the receipts figure");
  // …and each says out loud which kind of money it is, because a reader hearing
  // two dollar figures in a row has nothing else to go on.
  has(aria(LF.letterheadChipHtml("lee")).toLowerCase(), "not added",
    "the receipts label refuses the sum");
  has(aria(LF.wealthLetterheadChipHtml("lee", ROSTER.lee)).toLowerCase(), "not added",
    "…and so does the disclosure label");

  // THE HELPERS ARE THE TWO THE SPEC NAMES, AND THE SHAPE IS THE SHAPE.
  eq(typeof F.filing, "function", "PDXFinance.filing(pid) exists");
  eq(typeof F.wealth, "function", "PDXFinance.wealth(pid) exists");
  const w = FILLED.PDXFinance.wealth("lee", ROSTER.lee);
  eq(Object.keys(w).sort().join(","), "formUrl,rangeOrExact,tenureYears,year",
    "wealth() returns exactly { rangeOrExact, year, formUrl, tenureYears }");
  eq(FILLED.PDXFinance.wealth("no_such_person", null), null, "…or null, with nothing in between");
  // filing() is the LANE'S lookup, not a second copy of it — two owners is how a
  // chip and a helper come to disagree about whether a person has a filing.
  for (const id of SEED_IDS.slice(0, 6)) {
    eq(!!BARE.PDXFinance.filing(id), !!L.chipRead(id).composition,
      `${id}: filing() agrees with the lane about whether a filing exists`);
  }
  eq(BARE.PDXFinance.filing("nobody_at_all"), null, "…and answers null where there is none");

  // NEITHER IS AN INPUT TO ANYTHING SCORED. Declared on the object, so a later
  // reader can check the wall without reading the header.
  eq(F.scored, false, "PDXFinance declares scored: false");
  for (const k of ["directionMatch", "wordVsAction", "formalPatternTier", "publicationFloor",
                   "ballotSort", "yourMatch", "alignment"]) {
    ok((F.NEVER_FEEDS || []).indexOf(k) >= 0, `…and names ${k} in NEVER_FEEDS`);
  }
}

// ── 7 · no %, no grade, on either pill ──────────────────────────────────────
{
  section("7 · neither pill carries a percentage, a level or a verdict");

  const RATING = ["%", "score", "grade", "graded", "level", "rank", "ranked", "rating", "tier",
    "verdict", "/100", "out of 100", "points", "constituents-first", "constituents first",
    "wealthy", "rich", "millionaire", "billionaire", "top 1", "richest", "poorest",
    "above average", "below average", "more than most", "unusually"];
  const pills = [];
  for (const id of ["lee", "curtis", "owens", "nobody_at_all"].concat(Object.keys(ROSTER).slice(0, 8))) {
    pills.push([`${id} receipts`, LF.letterheadChipHtml(id)]);
    pills.push([`${id} wealth`, LF.wealthLetterheadChipHtml(id, ROSTER[id] || null)]);
  }
  for (const [name, html] of pills) {
    const words = visible(html).toLowerCase();
    const label = aria(html).toLowerCase();
    for (const bad of RATING) {
      lacks(words, bad, `${name}: the pill's text carries no "${bad}"`);
      // THE ACCESSIBLE NAME IS TEXT TOO — the longer copy, the copy nobody
      // re-reads, and a screen-reader user hearing "wealthy" is being told the
      // same wrong thing louder.
      lacks(label, bad, `${name}: the pill's accessible name carries no "${bad}"`);
    }
  }
  // THE DISCLOSURES BLOCK IS HELD TO THE SAME LINE, because a wall that stops at
  // the pill just moves the grade one jump away.
  for (const id of ["lee", "curtis", "owens", "nobody_at_all"]) {
    const t = visible(LF.wealthBlockHtml(id, ROSTER[id] || { name: "Someone" })).toLowerCase();
    for (const bad of RATING) lacks(t, bad, `${id}: the disclosures block carries no "${bad}"`);
  }
  // …AND /money's NET-WORTH BOARD NEVER FEEDS IT. That board holds net-worth
  // point estimates with a before/after and a percentage change; it is a
  // leaderboard with a sort, which is the one shape a per-person pill may not be
  // built out of. The disclosure lane is fed by filed forms or by nothing.
  const STRIP = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const bad of ["WEALTH_DATA", "PDXWealthLane", "pctChange", "dollarChange", "sparkHistory"]) {
    lacks(STRIP(FIN_SRC), bad, `pdx-finance.js does not read the net-worth board ("${bad}")`);
    lacks(STRIP(LANE_SRC), bad, `…and neither does finance-lane.js ("${bad}")`);
  }
}

// ── 8 · the section carries what the pills gave up ──────────────────────────
{
  section("8 · two labelled blocks, coverage counts in the section, form link on the wealth block");

  const FTM = R("ftm-data.js");
  has(FTM, "Campaign filings", "the money section labels its campaign block");
  has(FTM, "Disclosures while serving", "…and its disclosures block");
  // COVERAGE IN THE SECTION, IN BOTH BRANCHES. It came off the pills, so this is
  // the surface that must have it — and the on-file branch is the one that used
  // to lack it, which was backwards: a reader looking at a real composition is
  // the reader most likely to assume everyone else came back clean.
  const sec = FTM.slice(FTM.indexOf("window._pdxFundingSection = function"),
                        FTM.indexOf("window._pdxCompareWith = function"));
  eq(sec.split("coverageHtml()").length - 1, 2,
    "both branches of the section print the filings coverage counts");
  const covered = visible(LF.wealthBlockHtml("lee", ROSTER.lee || { name: "Mike Lee" }));
  has(covered, "Coverage", "the disclosures block prints its own coverage line");
  has(covered, "missing data", "…and says a blank there is missing data");

  // THE FORM, WITH ITS YEAR, AS A LINK A READER CAN OPEN. A figure a reader
  // cannot trace to a document is an estimate.
  const withLink = LF.wealthBlockHtml("lee", ROSTER.lee || { name: "Mike Lee" });
  has(withLink, FD_FIXTURE.lee.formUrl, "the disclosures block links the form itself");
  has(withLink, 'rel="noopener noreferrer"', "…safely");
  has(visible(withLink), "2024", "…and names the year the form is for");
  has(visible(withLink), "FD", "…and which form it is");
  // NO DEAD ANCHOR. A row with no link says so instead of looking clickable.
  const noLink = LF.wealthBlockHtml("owens", ROSTER.owens || { name: "Burgess Owens" });
  has(noLink, "no link on file", "a row with no form URL says so");
  lacks(noLink, "<a", "…and renders no anchor at all rather than a dead one");

  // THE BLOCK QUOTES THE PILL. One read per lane, so the two cannot come to
  // report the archive differently.
  //   `owens`'s fixture is a filed federal CATEGORY, and the lookup in
  // pdx-finance.js shortens exactly those to pill width — so the pill quotes the
  // shortened band and the block quotes the same shortened band AND the ticked
  // box word for word. The pair itself is pinned in section 12; here the claim is
  // only that the two surfaces agree, and that the form's own language survives
  // somewhere a reader can see it.
  for (const id of ["lee", "curtis", "owens"]) {
    const p = ROSTER[id] || { name: id };
    const filed = FD_FIXTURE[id].rangeOrExact;
    const shown = FILLED.PDXFinance.bandLabel(filed);
    has(visible(LF.wealthLetterheadChipHtml(id, p)), shown, `${id}: the pill quotes the filed figure`);
    has(visible(LF.wealthBlockHtml(id, p)), shown, `${id}: …and so does the block it opens`);
    has(visible(LF.wealthBlockHtml(id, p)), filed,
      `${id}: …and the block still carries the form's own wording for it`);
  }
  // EVEN WITH NOTHING ON FILE THE BLOCK IS THERE, saying so. A silently absent
  // block reads as "nothing to declare", which is a finding.
  const emptyBlock = visible(L.wealthBlockHtml("lee", ROSTER.lee || { name: "Mike Lee" }));
  has(emptyBlock, "Disclosures while serving", "the block renders with no rows in the table");
  has(emptyBlock, "No in-office wealth file on hand", "…and says what it is holding");
  has(emptyBlock, "not a disclosure of zero", "…and that a blank is not a zero");

  // TENURE HAS ONE OWNER AND THIS FILE IS NOT IT. No copy of the arithmetic, no
  // stored span beside the disclosure, and nothing to disagree with the 🗓️ pill.
  lacks(FIN_SRC.slice(FIN_SRC.indexOf("var PDX_FD_DISCLOSURES"),
                      FIN_SRC.indexOf("function filing")), "tenureYears:",
    "the disclosure table stores no tenure of its own");
  has(FIN_SRC, "_pdxTenure", "…the one tenure owner is asked for it instead");
  {
    // The arithmetic itself must be GONE, not merely second in line: no date
    // parse, no year subtraction, no clock read anywhere in the module.
    const finBody = FIN_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const bad of ["termStart", "termEnd", "new Date(", "getFullYear", "getMonth",
                       "parseTermDate", "1776"]) {
      lacks(finBody, bad, `pdx-finance.js derives no tenure of its own ("${bad}")`);
    }
  }
  // THE REAL OWNER, ANSWERING FOR A REAL MEMBER: the span on the pill is the span
  // _pdxTenure reports for the same person file, to the year.
  {
    const win = box({ disclosures: FD_FIXTURE });
    const p = win.CMP_DATA.lee;
    const t = win._pdxTenure(p);
    must(t && typeof t.years === "number", "the lifted owner reports no tenure for lee");
    eq(win.PDXFinance.wealth("lee", p).tenureYears, t.years,
      "the disclosure read's tenure is the tenure owner's own number");
    has(visible(win.PDXFinanceLane.wealthLetterheadChipHtml("lee", p)),
      `${t.years} yrs in office`, "…and that is the span the pill prints");
  }
  // A sworn date under a year old reads in words, because "0 yrs in office"
  // beside a dollar figure reads as a zeroed figure.
  {
    const win = box({ disclosures: { fresh: { rangeOrExact: "$1–5M", year: "2025", formUrl: "" } } });
    const now = new Date();
    win.CMP_DATA.fresh = { name: "Fresh Member", office: "U.S. Representative",
                           termStart: `${now.getFullYear()}-0${Math.min(9, now.getMonth() + 1)}` };
    const w = visible(win.PDXFinanceLane.wealthLetterheadChipHtml("fresh", win.CMP_DATA.fresh));
    ok(!/\b0 yrs?\b/.test(w), "a first-year member's pill prints no zero tenure");
    has(w, "under 1 yr in office", "…it says the span is under a year instead");
  }
  // AND A PERSON FILE WITH NO SWORN DATE GETS NO INVENTED SPAN.
  {
    const win = box({ disclosures: { nodate: { rangeOrExact: "$1–5M", year: "2024", formUrl: "" } } });
    win.CMP_DATA.nodate = { name: "No Date", office: "U.S. Senator" };
    const w = visible(win.PDXFinanceLane.wealthLetterheadChipHtml("nodate", win.CMP_DATA.nodate));
    has(w, "$1–5M disclosed", "a row with no tenure on file still reports its figure");
    lacks(w, "in office", "…and invents no span to print beside it");
    eq(win.PDXFinance.wealth("nodate", win.CMP_DATA.nodate).tenureYears, null,
      "…and the read reports null rather than zero years");
  }
  // NOR DOES A DOCUMENT WITHOUT THE OWNER GET ONE. person.html does not load
  // voter-hub-location.js, so there the figure prints with no span — the same
  // thing every other tenure consumer on that document does, and strictly better
  // than a second copy of the arithmetic that agrees until it doesn't.
  {
    const win = box({ noTenure: true, disclosures: FD_FIXTURE });
    eq(typeof win._pdxTenure, "undefined", "the no-owner boot really has no tenure owner");
    const p = win.CMP_DATA.lee;
    eq(win.PDXFinance.wealth("lee", p).tenureYears, null,
      "with no owner loaded the disclosure read reports no tenure");
    const w = visible(win.PDXFinanceLane.wealthLetterheadChipHtml("lee", p));
    has(w, "$1–5M disclosed", "…the pill still reports the filed figure");
    has(w, "2024 FD", "…and still names the form and its year");
    lacks(w, "in office", "…and prints no span it could not read");
    ok(!/\b0 yrs?\b/.test(w), "…least of all a zero one");
  }
}

// ── 9 · twin boot: two display objects, one record ──────────────────────────
{
  section("9 · Direction Match and the formal index are byte-identical with both pills and with neither");

  const FILES = [
    "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
    "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
    "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
    "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
    "publication-floor.js", "profile-spine.js", "profiles-full.js",
  ];
  const SRC = FILES.map((f) => [f, R(f)]);
  const { byMember } = buildCorpus(ROOT);
  const ranked = [...byMember.entries()].sort((a, b) => b[1].length - a[1].length);
  const [PID, items] = ranked[0];
  must(items.length > 40, `the deepest corpus member is too thin (${PID}: ${items.length})`);

  // BOTH MODULES SHIP IN BOTH BOOTS, and the disclosure table is FILLED in both:
  // the only difference is whether the two letterhead pills were rendered. A
  // twin boot that left the table empty would be asserting that rendering
  // nothing changes nothing.
  const snapshot = (mountControls) => {
    const win = makeSandbox();
    const ctx = vm.createContext(win);
    const queue = [];
    win.setTimeout = (fn) => { queue.push(fn); return queue.length; };
    const hosts = new Map();
    let repaints = 0;
    win.document.querySelector = (sel) => {
      const uid = (/data-pdx-mchip-host="([^"]+)"/.exec(String(sel)) || [])[1];
      return (uid && hosts.get(uid)) || null;
    };
    const register = (html) => {
      const uid = (/data-pdx-mchip-host="([^"]+)"/.exec(html) || [])[1];
      const state = (/data-pdx-mchip-state="([^"]+)"/.exec(html) || [])[1] || null;
      if (!uid) return;
      hosts.set(uid, {
        firstChild: { getAttribute: (k) => (k === "data-pdx-mchip-state" ? state : null) },
        set innerHTML(v) { repaints++; },
        get innerHTML() { return ""; },
      });
    };
    const drain = () => {
      let n = 0;
      while (queue.length && n < 20000) { const fn = queue.shift(); try { fn(); } catch (e) {} n++; }
    };

    win.PROFILES = win.CMP_DATA;
    for (const [f, src] of SRC) vm.runInContext(src, ctx, { filename: f });
    win.PROFILES = win.CMP_DATA;
    win._FTM_BY_ID = {};
    win.FTM_AS_OF = AS_OF;
    for (const id of SEED_IDS) win._FTM_BY_ID[id] = { id, name: id, funding: SEED[id] };
    vm.runInContext(FIN_SRC, ctx, { filename: "pdx-finance.js" });
    vm.runInContext(LANE_SRC, ctx, { filename: "finance-lane.js" });
    // A disclosure on the member under test — the strongest form of the question:
    // does a filed range on THIS person, rendered on THIS person's letterhead,
    // move THIS person's record read?
    const table = Object.assign({}, FD_FIXTURE);
    table[PID] = { rangeOrExact: "$1–5M", year: "2024", formUrl: "https://example.gov/fd" };
    // A TICKED FEDERAL CATEGORY TOO, so the band-compression path the curation
    // wave added runs INSIDE the twin boot rather than beside it. A lookup that
    // could move a record read would move it here.
    const catPid = Object.keys(win.CMP_DATA).filter((k) => k !== PID && !table[k])[0];
    if (catPid) table[catPid] = { rangeOrExact: "$1,000,001 - $5,000,000", year: "2024",
                                  formUrl: "https://disclosures-clerk.house.gov/example.pdf" };
    win.PDXFinance._setWealthTable(table);
    const before = Object.keys(win).sort().join(",");

    const ids = [PID].concat(SEED_IDS).concat(Object.keys(win.CMP_DATA).slice(0, 40));
    let mountedR = 0, mountedW = 0;
    if (mountControls) {
      for (const round of [0, 1]) {
        for (const id of ids) {
          const a = win.PDXFinanceLane.letterheadChipMount(id);
          if (a && a.indexOf("pdx-mchip-host") >= 0) { mountedR++; if (!round) register(a); }
          const b = win.PDXFinanceLane.wealthLetterheadChipMount(id, win.CMP_DATA[id] || null);
          if (b && b.indexOf("pdx-mchip") >= 0) mountedW++;
          // …and the section blocks both pills are doors to, rendered too: the
          // jump mounts them, so they are part of what the letterhead causes.
          win.PDXFinanceLane.wealthBlockHtml(id, win.CMP_DATA[id] || null);
        }
        drain();
      }
    }
    const after = Object.keys(win).sort().join(",");
    win._pdxFinanceSignal = (pid) => win.PDXFinanceLane.read(pid);

    const out = [];
    win.PDXVotingRecord.noteMember(PID, items);
    if (mountControls) {
      for (const id of ids) {
        win.PDXFinanceLane.letterheadChipMount(id);
        win.PDXFinanceLane.wealthLetterheadChipMount(id, win.CMP_DATA[id] || null);
      }
      drain();
    }
    const wa = win.PDXWordAction.read(PID, win.CMP_DATA[PID]);
    out.push(["dm", wa && wa.pct, wa && wa.token, wa && wa.verdict, wa && wa.publishable,
      JSON.stringify((wa && wa.counts) || null), JSON.stringify((wa && wa.tiers) || null),
      JSON.stringify((wa && wa.floors) || null), JSON.stringify((wa && wa.coverage) || null)].join("|"));
    const rows = (win.PDXConsistency.formalPatternIndex.rows(PID) || []).map((r) =>
      [r.key, r.tier, r.token, r.n, r.adv, r.opp, r.confidence].join(":"));
    out.push(["tiers", rows.length, win.PDXConsistency.formalPatternIndex.count(PID),
      rows.join(",")].join("|"));
    const fl = win.PDXPublicationFloor.read(PID);
    out.push(["floor", fl.publishable, fl.cited, fl.promises, (fl.reasons || []).join(";")].join("|"));
    out.push(["mapped", JSON.stringify(win._pdxRecordMappedCounts(PID) || null)].join("|"));
    return { snap: out.join("\n"), mountedR, mountedW, repaints,
             leaked: before === after ? "" : "yes" };
  };

  const off = snapshot(false);
  const on = snapshot(true);
  ok(off.snap.length > 200, `the record snapshot has something in it (${off.snap.length} chars)`);
  ok(on.mountedR > 80, `the mounted boot rendered the receipts pills (${on.mountedR})`);
  ok(on.mountedW > 80, `…and the disclosure pills (${on.mountedW})`);
  eq(off.mountedR, 0, "…and the unmounted boot rendered neither");
  eq(off.mountedW, 0, "…neither of them");
  // The disclosure pill schedules no timer, so a filled table repaints nothing:
  // every chip it mounted was already telling the truth when it was written.
  eq(on.repaints, 0, "the disclosure pill queues no deferred repaint of its own");
  eq(on.snap, off.snap,
    "Direction Match, the formal pattern index, the publication floor and the mapped counts " +
    "are identical with both money pills mounted and with neither");
  eq(on.leaked, "", "mounting the two pills installed no new global on the window");
  console.log(`   twin boot · ${on.mountedR} receipts pills + ${on.mountedW} disclosure pills · ` +
    `${off.snap.length}-char record snapshot identical either way`);
}

// ── 10 · the shipped documents load it, and the shell caches it ─────────────
{
  section("10 · load order, the service worker, and the walls written down");

  // DEFER RUNS IN DOCUMENT ORDER, so the helper must sit between the filings
  // index and the lane that reads it on every document with a letterhead.
  for (const doc of ["index.html", "person.html"]) {
    const src = R(doc);
    const ftm = src.indexOf('src="/ftm-data.js"');
    const fin = src.indexOf('src="/pdx-finance.js"');
    const lane = src.indexOf('src="/finance-lane.js"');
    ok(ftm > 0 && fin > 0 && lane > 0, `${doc} loads all three money modules`);
    ok(ftm < fin && fin < lane, `${doc} loads them in dependency order`);
  }
  // /money has no letterhead, and its script budget is the reason the budget
  // exists. It must not be quietly pulled in there.
  lacks(R("money.html"), 'src="/pdx-finance.js"',
    "/money does not load the disclosure helpers it has no letterhead for");

  // THE SHELL CACHES IT WITH THE LANE. A precached lane with no disclosure
  // module would put every profile's second pill in its empty state for the
  // wrong reason — and the reason is the entire content of that pill.
  const SW = R("sw.js");
  has(SW, "'/pdx-finance.js'", "the service worker precaches the disclosure module");
  const ver = (SW.match(/const CACHE_VERSION = '([^']+)'/) || [])[1];
  ok(ver && ver !== "v219", `the cache version moved past v219 for the new shell file (${ver})`);
  has(SW, `// ${ver} -`, "…and the changelog above the constant has an entry for it");

  // /money SAYS WHAT IT IS, ABOVE ITS OWN BOARD. The net-worth leaderboard there
  // is an estimate board with a percent change on it, and a reader who has just
  // met the disclosure pill on a person file has to be told that this is not the
  // same figure — in the block that is not the filing, before any card.
  {
    const MON = R("money.html");
    const at = MON.indexOf("Estimates, not a filing:");
    ok(at > 0, "/money's estimate board does not say it is not the person-file disclosure pill");
    has(MON.slice(at, at + 400), "not the person file's 💰 disclosure pill",
      "…the sentence does not name the pill it is distinguishing itself from");
    has(MON.slice(at, at + 400), "no figure on it is a filed FD figure",
      "…and does not say its figures are not filed FD figures");
    ok(at < MON.indexOf("⚠ DISCLAIMER:</strong> Net worth change"),
      "…and it arrives after the board's own disclaimer rather than at the top of the box");
  }
  lacks(R("money.html"), 'src="/pdx-finance.js"',
    "/money still does not load the disclosure module — the sentence is copy, not a second pill");

  // AND THE DOCTRINE IS WRITTEN DOWN WHERE IT IS ENFORCED. Both empty-state
  // sentence shapes, and the sum wall, in the lane's own integrity note.
  const DOC = R("FINANCE_INTEGRITY.md");
  has(DOC, "No money file on hand", "FINANCE_INTEGRITY.md carries the receipts absence sentence");
  has(DOC, "No in-office wealth file on hand", "…and the disclosure absence sentence");
  has(DOC, "$1–5M disclosed", "…and the disclosure pill's own shape");
  has(DOC, "itemized receipts", "…and the receipts pill's own shape");
}

// ── 11 · the rendered money section is two blocks and nothing else ──────────
{
  section("11 · the person-file money DOM carries no tier, no report card, no chart, no % change");

  // WHAT THIS SECTION IS FOR. The two pills are doors, and until now the pins on
  // them were pins on the DOORS. This one renders what is BEHIND them — the real
  // _pdxFundingSection from the shipped ftm-data.js, over the real roster and the
  // real seed — and reads the markup a person actually receives.
  //
  // It exists because the person file used to carry a third money surface: a
  // deferred drawer holding a "FINANCIAL TRANSPARENCY REPORT" with a 0-100
  // funding-integrity number under a HIGH / MODERATE / LOW badge, three
  // net-worth tiles with a percent change, a "Wealth Over Time" chart drawn from
  // a table of five hand-written members, and a donor list that was not the
  // lines of any filing on the page. All of it is deleted. Source-level pins in
  // test-profile-spine.mjs say the markup is not in profiles-full.js; these say
  // the assembled DOM does not contain it either, which is the claim a reader
  // cares about.
  const secBox = () => {
    const win = box();
    const ctx = vm.createContext(win);
    // ftm-data.js whole, not a lifted slice: _pdxFundingSection composes the
    // filings block, the coverage line and _pdxWealthBlock, and a slice would
    // let a removed piece survive in the part that was not lifted.
    vm.runInContext(FTM_SRC, ctx, { filename: "ftm-data.js" });
    must(typeof win._pdxFundingSection === "function",
      "ftm-data.js installed no _pdxFundingSection — the money section cannot be rendered at all");
    return win;
  };
  const W = secBox();
  // Three kinds of profile, because the section has two branches and the pills
  // have two states: people with a real filing in the seed, and people with
  // none, which is nearly everyone.
  const filed = SEED_IDS.filter((id) => W.CMP_DATA[id]).slice(0, 6);
  const unfiled = Object.keys(W.CMP_DATA).filter((id) => !SEED[id]).slice(0, 12);
  must(filed.length >= 3, `too few seeded pids resolve against the roster to test the on-file branch (${filed.length})`);
  const subjects = filed.concat(unfiled);

  // THE WHOLE MONEY SURFACE OF A PERSON FILE, assembled the way the document
  // assembles it: the two letterhead pills, then the section both of them open.
  const moneyDom = (id) => {
    const p = W.CMP_DATA[id] || null;
    return String(W.PDXFinanceLane.letterheadChipMount(id)) +
           String(W.PDXFinanceLane.wealthLetterheadChipMount(id, p)) +
           String(W._pdxFundingSection(id, p) || "");
  };

  // 11a. THE BANNED SHAPES, AS PHRASES. These are the names the deleted card
  //      went by, and they are checked case-insensitively over both the markup
  //      and the visible text, so a class name or an aria-label counts.
  const PHRASES = [
    [/transparency report/i, "a financial transparency report"],
    [/net worth over time/i, "a net-worth-over-time series"],
    [/wealth over time/i, "a wealth-over-time series"],
    [/%\s*change/i, "a percent change"],
    [/follow the money/i, "a duplicate follow-the-money heading"],
    [/integrity (score|number|rating)/i, "a funding integrity score"],
    [/\b(?:\d{1,2}|100)\s*\/\s*100\b/, "an x-out-of-100 figure"],
    [/out of 100\b/i, "an out-of-100 figure"],
    [/<canvas/i, "a canvas to draw a chart into"],
    [/Chart\s*\(/, "a Chart.js construction"],
  ];
  // TIER WORDS. The brief's own regex is /LOW|MED|HIGH/i, and applied to English
  // prose as a bare alternation it matches "named", "medium", "follow" and
  // "highest" as substrings — it cannot distinguish a badge from a sentence. So
  // the tier check is the badge FORM: a standalone tier word, case-sensitively
  // uppercase, which is exactly how the deleted badge printed HIGH, MODERATE and
  // LOW, plus the same words as standalone lowercase words anywhere in the
  // visible text. One filed field legitimately uses one of those words and is
  // carved out below, in one place, by name.
  const TIER_UPPER = /\b(?:LOW|MED|MEDIUM|MODERATE|HIGH)\b/;
  const TIER_WORD = /\b(?:low|med|medium|moderate|high)\b/i;
  // THE ONE CARVE-OUT, NAMED AND BOUNDED. finance-lane.js prints the filing's own
  // outside-spending level in the composition eyebrow — "Outside spending
  // reported — low" — as text, with the note and the source link beside it. That
  // is a field of the filing being reported, not a rating of the person: it
  // describes independent expenditure volume, it carries its own provenance, and
  // it is not derived from anything. It is removed from the string the tier sweep
  // reads, and then checked separately for the provenance that makes it a report.
  const stripOutsideEyebrow = (html) =>
    html.replace(/🕳️ Outside spending reported[^<]*/g, "🕳️ Outside spending reported");

  let checked = 0;
  for (const id of subjects) {
    const dom = moneyDom(id);
    must(dom.length > 200, `${id}: the money surface rendered almost nothing (${dom.length} chars)`);
    const vis = visible(dom);
    for (const [re, what] of PHRASES) {
      ok(!re.test(dom), `${id}: the money DOM contains ${what}`);
    }
    const scrubbed = stripOutsideEyebrow(dom);
    ok(!TIER_UPPER.test(scrubbed),
      `${id}: the money DOM prints an uppercase tier badge — that is the retired grade's own\n` +
      `    typography, and the money surface reports a filing rather than rating one`);
    ok(!TIER_WORD.test(visible(stripOutsideEyebrow(dom)).replace(/[^\w\s]/g, " ")),
      `${id}: a bare tier word is visible in the money section outside the filing's own\n` +
      `    outside-spending field — a one-word verdict beside a dollar figure is a grade`);
    // AND NO SCORING LANGUAGE — EXCEPT WHERE THE LANE REFUSES IT. Two fixed
    // sentences in the filings block say the counts are "not a rating" and that
    // "nothing here is rated, ranked, or read by" the verdict surfaces. Those are
    // the refusal, not the thing refused, so any sentence that negates the word
    // is dropped before the sweep reads what is left.
    const claims = vis.split(/(?<=[.!])\s+|\s+—\s+/).filter((t) =>
      !/not a (?:rating|score|grade|finding)|nothing (?:here )?is (?:rated|ranked)|nothing is compared|is not read as one|nothing on this lane/i.test(t));
    ok(!/\b(?:score|grade|rating|rank(?:ed|ing)?)\b/i.test(claims.join(" ")),
      `${id}: the money section uses the language of scoring, ranking or grading in a sentence\n` +
      `    that is not refusing it — "${(claims.find((t) => /\b(?:score|grade|rating|rank(?:ed|ing)?)\b/i.test(t)) || "").slice(0, 90)}"`);
    checked++;
  }
  ok(checked === subjects.length, `every subject's money DOM was read (${checked}/${subjects.length})`);

  // THE CARVE-OUT IS A REPORT, NOT A BADGE. Where the level prints, the note and
  // the source that make it a filed field print with it.
  {
    const withLevel = filed.map(moneyDom).filter((d) => /Outside spending reported — /.test(d));
    if (withLevel.length) {
      for (const d of withLevel) {
        has(d, "Outside spending is not itemized to the candidate",
          "the outside-spending level prints without the sentence that says why it has no dollar figure");
        ok(/Outside spending reported — [^<]+<\/span><br>[^<]/.test(d),
          "the outside-spending level prints without the filing's own note beneath it");
      }
      ok(true, `the outside-spending carve-out was exercised on a real filing (${withLevel.length} of ${filed.length})`);
    } else {
      ok(true, "no seeded filing carries an outside-spending level today, so the carve-out is unused");
    }
  }

  // 11b. TWO BLOCKS, IN ORDER, AND NO THIRD ONE. The section is the filings
  //      block then the disclosures block. A third money block is how the
  //      transparency card arrived the first time.
  for (const id of [filed[0], unfiled[0]]) {
    const dom = String(W._pdxFundingSection(id, W.CMP_DATA[id] || null) || "");
    const f = dom.indexOf("Campaign filings");
    const d = dom.indexOf("Disclosures while serving");
    ok(f > 0, `${id}: the section renders the campaign filings block`);
    ok(d > f, `${id}: …and the disclosures block after it`);
    eq(dom.split("Disclosures while serving").length - 1, 1,
      `${id}: the disclosures block renders exactly once`);
    eq((dom.match(/data-pdx-money-block="/g) || []).length, 2,
      `${id}: the money section is two labelled blocks — a third block is the transparency card's shape`);
  }

  // 11c. THE EMPTY DISCLOSURE BLOCK, IN THE DOM, ON EVERY ROSTERED PROFILE. The
  //      table ships empty, so this is the state of the whole roster: heading,
  //      the "on hand" sentence, the missing-data paragraph. No figure, no axis,
  //      no percent, no before-and-after.
  {
    const bad = { dollar: [], digitless: [], percent: [], words: [], chart: [] };
    const ids = Object.keys(W.CMP_DATA);
    for (const id of ids) {
      const blk = String(W.PDXFinanceLane.wealthBlockHtml(id, W.CMP_DATA[id]) || "");
      const vis = visible(blk);
      // The coverage sentence under the block counts the roster, so digits are
      // expected there and nowhere else: the block's own copy is checked with the
      // coverage line removed.
      const own = vis.slice(0, vis.indexOf("Coverage") === -1 ? vis.length : vis.indexOf("Coverage"));
      if (/\$/.test(own)) bad.dollar.push(id);
      if (/\d/.test(own)) bad.digitless.push(id);
      if (/%/.test(vis)) bad.percent.push(id);
      if (own.indexOf("No in-office wealth file on hand") < 0 ||
          own.indexOf("not a disclosure of zero") < 0) bad.words.push(id);
      if (/<canvas|Chart\s*\(|axis/i.test(blk)) bad.chart.push(id);
    }
    const nameList = (a) => a.slice(0, 8).join(", ") + (a.length > 8 ? `, +${a.length - 8} more` : "");
    eq(bad.dollar.length, 0, `the empty disclosure block prints a dollar sign on ${bad.dollar.length} profiles (${nameList(bad.dollar)})`);
    eq(bad.digitless.length, 0, `…and a digit on ${bad.digitless.length} profiles (${nameList(bad.digitless)})`);
    eq(bad.percent.length, 0, `…and a percent on ${bad.percent.length} profiles (${nameList(bad.percent)})`);
    eq(bad.words.length, 0, `…and reads wrong on ${bad.words.length} profiles (${nameList(bad.words)})`);
    eq(bad.chart.length, 0, `…and draws something on ${bad.chart.length} profiles (${nameList(bad.chart)})`);
    ok(ids.length > 500, `the DOM sweep covered the whole roster (${ids.length} pids)`);
  }

  // 11d. NO DONOR NAME THAT IS NOT A LINE ON THE FILING IN BLOCK 1. The deleted
  //      card listed donors of its own. Every donor string the section prints now
  //      has to be findable in the filing record the lane read for that pid — not
  //      similar to one, IN it.
  for (const id of filed) {
    const rec = W._pdxFinanceFiling ? W._pdxFinanceFiling(id) : null;
    must(rec, `${id}: the lane has no filing record to check the rendered donors against`);
    const fromRecord = JSON.stringify(rec);
    const dom = String(W._pdxFundingSection(id, W.CMP_DATA[id]) || "");
    // Donor and bucket labels are the only free text the filings block prints
    // from data; everything else is fixed copy. Both label shapes are collected.
    const labels = [...dom.matchAll(/class="pdx-fund-top-name"[^>]*>([^<]+)</g)].map((m) => m[1])
      .concat([...dom.matchAll(/<span style="flex:1;min-width:0;[^"]*">([^<]+)<\/span>/g)].map((m) => m[1]));
    // A sweep over an empty list is a pass that means nothing, so the extraction
    // itself is checked: the filings block prints a top funder and its buckets.
    ok(labels.length >= 2,
      `${id}: no donor or bucket labels were extracted from the filings block — the markup shape\n` +
      `    moved and this donor-provenance sweep is reading nothing (${labels.length} found)`);
    for (const raw of labels) {
      const label = raw.replace(/&amp;/g, "&").trim();
      if (!label) continue;
      ok(fromRecord.indexOf(label) >= 0 || /contributions|transfers|self-funding/i.test(label),
        `${id}: the filings block prints "${label}", which is not a line on the filing it read —\n` +
        `    a donor name that is not in the record is an authored donor list`);
    }
  }

  // 11e. NO CROSS-PERSON DOOR OUT OF EITHER BLOCK. The ⚖️ Compare funding button
  //      stood in the filings block and closed the person file to open the
  //      Compare tool with this person in it. A compare launched from a filing is
  //      the ranking read the lane refuses, and a reader who taps inside a money
  //      block should still be on the file they were reading.
  for (const id of [filed[0], unfiled[0]]) {
    const dom = String(W._pdxFundingSection(id, W.CMP_DATA[id] || null) || "");
    lacks(dom, "pdx-fund-cmp", `${id}: the compare-funding control is back in the money section`);
    lacks(dom, "_pdxCompareWith", `${id}: …or its handler is, which is the same door`);
    lacks(dom, "openCompare", `${id}: …or a second way into the compare tool`);
    lacks(dom, "closeModal", `${id}: nothing in the money section closes the person file`);
  }
  // The function itself stays defined: /money scrubs any .pdx-fund-cmp it finds
  // rather than assuming none renders, and the Compare Hub is documented against
  // that entry point. What is gone is the markup that called it.
  has(FTM_SRC, "window._pdxCompareWith = function",
    "the compare entry point was deleted as well — /money's scrub and the Compare Hub both name it");
  lacks(R("profiles-full.js"), "pdx-fund-cmp",
    "profiles-full.js grew its own compare-funding control");
}

// ── 12 · the first curation wave, and the rules a hand-written row lives by ─
{
  section("12 · the wave shipped zero rows, and the gate says what a row would have to be");

  // WHAT HAPPENED. The first curation wave went looking for filed in-office
  // figures for the Utah slice the site already carries: the governor, both US
  // senators, the four US House members who represent Utah, and the Utah
  // Legislature's District 3 people. It shipped NO ROWS, and the reason is in
  // the documents rather than in the looking:
  //
  //   · Utah's own in-office disclosure (Utah Code 20A-11-1603 / 1604) reports
  //     employers, entities, income sources and holdings above thresholds, and
  //     positions. It carries no band, no category ladder and no total. There
  //     is no figure on it to quote.
  //   · A federal FD reports a CATEGORY OF VALUE per asset. It prints no
  //     aggregate and no net worth. One figure out of a page of ticked boxes is
  //     ranges added together, which is the arithmetic this whole lane refuses.
  //   · Forbes, OpenSecrets' net-worth estimates and this site's own /money
  //     board each publish one number per person, and every one of them is
  //     somebody's estimate — the exact thing a pill reading "disclosed" must
  //     not be carrying.
  //
  // So this section pins two things. FIRST, the wave's result, so that filling
  // the table later is a decision somebody makes with a form open. SECOND, the
  // machinery the next wave needs, exercised against rows shaped exactly as a
  // curated row must be shaped — the lookup that lets a ticked box fit in a
  // pill, and the gate that will not let a row in without the document.

  // THE ROWS A NEXT WAVE WOULD WRITE. Every one is legal under the gate: a
  // figure as filed, the form's own year, an https .gov link to the document
  // itself, three fields and no fourth.
  const WAVE = {
    // A ticked federal category, in the clerk's own spelling.
    bmoore: { rangeOrExact: "$1,000,001 - $5,000,000", year: "2024",
              formUrl: "https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2024/10074823.pdf" },
    // The same band spelled with an en dash, which is a different key.
    kennedy: { rangeOrExact: "$100,001\u2013$250,000", year: "2024",
               formUrl: "https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2024/10074834.pdf" },
    // The top box, which is not a range with two ends at all.
    maloy: { rangeOrExact: "Over $50,000,000", year: "2024",
             formUrl: "https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2024/10081600.pdf" },
    // An exactly-published figure, for a jurisdiction that prints one.
    cox: { rangeOrExact: "$247,003", year: "2024",
           formUrl: "https://disclosures.utah.gov/example-form" },
    // The form's own lowest box, which says a word and not a number. It is not a
    // key in the lookup, so it prints as filed — and it is never a zero.
    lee: { rangeOrExact: "None (or less than $1,001)", year: "2024",
           formUrl: "https://efdsearch.senate.gov/search/view/annual/example/" },
  };
  const WAVE_IDS = Object.keys(WAVE);
  const WB = box({ disclosures: WAVE });
  const WL = WB.PDXFinanceLane;
  const WF = WB.PDXFinance;
  for (const id of WAVE_IDS) must(WB.CMP_DATA[id], `${id} is not on the roster — the wave fixture is stale`);

  // 12a. THE SHIPPED TABLE IS EMPTY, AND ITS EMPTINESS IS THE WAVE'S FINDING.
  //      Section 4 already asserts the literal; what is new here is that the
  //      wave RAN, so this is a curated zero rather than an untouched stub, and
  //      the reason is written down where the next person will find it.
  eq(F.coverage().onFile, 0, "the first curation wave shipped zero rows");
  const tableSlice = FIN_SRC.slice(FIN_SRC.indexOf("var PDX_FD_DISCLOSURES = "),
                                   FIN_SRC.indexOf("var FORM_LABEL"));
  has(tableSlice, "var PDX_FD_DISCLOSURES = {};", "…as an empty object literal, not a commented-out row");
  for (const bad of ["forbes", "Forbes", "opensecrets", "OpenSecrets", "WEALTH_DATA",
                     "net worth", "netWorth", "estimated"]) {
    lacks(tableSlice, bad, `no row came in off an estimate ("${bad}")`);
  }
  // THE FINDING IS ON THE RECORD IN PROSE TOO. A zero-row wave that leaves no
  // trace reads, to the next reader, as a wave that never ran — and the next
  // reader's fix for "the table is empty" is to fill it from a news story.
  const FI = R("FINANCE_INTEGRITY.md");
  has(FI, "20A-11-1603", "the integrity doc names the Utah statute whose form carries no value");
  has(FI, "category of value", "…and what a federal FD reports instead of a total");
  has(FIN_SRC, "20A-11-1603", "…and the module header carries the same finding");
  has(FIN_SRC, "ZERO ROWS", "…and says plainly what the wave shipped");

  // 12b. THE FILED-CATEGORY LOOKUP, PINNED PAIR BY PAIR. A ticked box may be
  //      shortened for display only because this list exists and this test holds
  //      it value-for-value. Written out here independently of the module: if
  //      the two ever disagree, one of them is wrong and the test is the one
  //      somebody has to argue with.
  const LADDER = [
    ["$1,001 - $15,000", "$1\u201315K"],
    ["$1,001\u2013$15,000", "$1\u201315K"],
    ["$15,001 - $50,000", "$15\u201350K"],
    ["$15,001\u2013$50,000", "$15\u201350K"],
    ["$50,001 - $100,000", "$50\u2013100K"],
    ["$50,001\u2013$100,000", "$50\u2013100K"],
    ["$100,001 - $250,000", "$100\u2013250K"],
    ["$100,001\u2013$250,000", "$100\u2013250K"],
    ["$250,001 - $500,000", "$250\u2013500K"],
    ["$250,001\u2013$500,000", "$250\u2013500K"],
    ["$500,001 - $1,000,000", "$500K\u20131M"],
    ["$500,001\u2013$1,000,000", "$500K\u20131M"],
    ["$1,000,001 - $5,000,000", "$1\u20135M"],
    ["$1,000,001\u2013$5,000,000", "$1\u20135M"],
    ["$5,000,001 - $25,000,000", "$5\u201325M"],
    ["$5,000,001\u2013$25,000,000", "$5\u201325M"],
    ["$25,000,001 - $50,000,000", "$25\u201350M"],
    ["$25,000,001\u2013$50,000,000", "$25\u201350M"],
    ["Over $50,000,000", "over $50M"],
    ["over $50,000,000", "over $50M"],
  ];
  eq(typeof WF.bandLabel, "function", "PDXFinance.bandLabel(figure) is the one compression");
  for (const [filed, shown] of LADDER) {
    eq(WF.bandLabel(filed), shown, `the form's "${filed}" is shown as "${shown}"`);
    // AND IT IS STILL A BAND. Every shortened value keeps two ends or the word
    // that says there is no upper one — a compression that produced a single
    // figure would be the midpoint by another route.
    ok(/\u2013/.test(shown) || /^over /.test(shown),
      `"${shown}" is still a band and not one number`);
  }
  eq(Object.keys(WF.FILED_BAND_LABELS).length, LADDER.length,
    "the shipped ladder holds exactly the pairs this test pins — no unpinned mapping");
  for (const [filed, shown] of LADDER) {
    eq(WF.FILED_BAND_LABELS[filed], shown, `…and holds "${filed}" as "${shown}"`);
  }
  // A MISS PASSES THROUGH VERBATIM. Exact figures, a state's own phrasing, the
  // form's lowest box, and anything nobody anticipated.
  for (const raw of ["$247,003", "None (or less than $1,001)", "$1\u20135M",
                     "$2,480,119", "Between $1M and $5M", "$1,000,002 - $5,000,000"]) {
    eq(WF.bandLabel(raw), raw, `an unmapped figure prints as filed ("${raw}")`);
  }
  eq(WF.bandLabel(""), "", "an empty figure compresses to nothing rather than to a zero");
  eq(WF.bandLabel(null), "", "…and so does a missing one");
  // NO DIGIT-READING ANYWHERE NEAR IT. The lookup is literal keys; a parse is
  // how a band becomes a bound and a bound becomes a number.
  const finBody = FIN_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const bad of ["parseFloat", "parseInt", "Number(", "Math.", "/ 2", "* 2", "toFixed",
                     ".split(", "replace(/,", "midpoint"]) {
    lacks(finBody, bad, `the disclosure module does no arithmetic on a figure ("${bad}")`);
  }

  // 12c. EVERY ROW A WAVE COULD WRITE PRINTS AS A BAND OR AN EXACT STRING, WITH
  //      NO EXTRA ARITHMETIC ON THE LETTERHEAD. The pill is taken apart: the
  //      figure, the tenure span and the form year are removed by name, and what
  //      is left must contain no dollar sign and no digit at all. Anything the
  //      pill computed would be in the remainder.
  for (const id of WAVE_IDS) {
    const person = WB.CMP_DATA[id];
    const row = WAVE[id];
    const shown = WF.bandLabel(row.rangeOrExact);
    const pill = visible(WL.wealthLetterheadChipHtml(id, person));
    has(pill, shown, `${id}: the pill prints the filed figure as filed`);
    has(pill, "disclosed", `${id}: …with the verb that describes filing the form`);
    has(pill, row.year + " FD", `${id}: …and which form, of which year`);
    const rest = pill.split(shown).join(" ")
      .replace(/\b\d+ yrs? in office\b/g, " ")
      .replace(/\bunder 1 yr in office\b/g, " ")
      .split(row.year).join(" ");
    ok(!/\$/.test(rest),
      `${id}: the pill prints no second dollar figure beside the filed one ("${rest.trim()}")`);
    ok(!/\d/.test(rest),
      `${id}: the pill prints no digit the form did not ("${rest.trim()}")`);
    // AND NONE OF THE WAYS A BAND COLLAPSES. Checked on the pill, where there is
    // no room for the form's own wording to explain itself.
    for (const bad of ["$3M", "$3,000,000", "3000000", "$2.5M", "$25M ", "midpoint",
                       "average", "approximately", "about $", "~$", "up to", "at least",
                       "%", "net worth", "wealthy"]) {
      lacks(pill, bad, `${id}: the pill does not reduce or characterise the filed figure ("${bad}")`);
    }
    // THE SUM IS NOT THERE EITHER: the receipts figure is a different archive and
    // must not appear on this pill, nor this figure on that one.
    const r = WL.read(id);
    if (r && r.receiptsFmt) {
      lacks(pill, r.receiptsFmt, `${id}: the disclosure pill carries no campaign receipts figure`);
      lacks(visible(WL.letterheadChipHtml(id)), shown, `${id}: …and the receipts pill carries no disclosed band`);
    }
  }

  // 12d. EVERY PID NOT IN THE TABLE STILL HAS NO $ AND NO DIGIT ON THE
  //      DISCLOSURE PILL. Swept over the whole roster in both boots: the repo as
  //      it ships (no rows at all) and the repo with the wave's rows in, where
  //      the risk is a pill borrowing a neighbour's figure.
  for (const [what, win] of [["as shipped", BARE], ["with the wave's rows in", WB]]) {
    const lane = win.PDXFinanceLane;
    const roster = win.CMP_DATA;
    const cov = win.PDXFinance.coverage();
    const ids = Object.keys(roster).filter((id) => !(win === WB && WAVE[id]));
    ok(ids.length > 500, `${what}: the sweep covered the roster (${ids.length} pids)`);
    const withCash = [], withDigit = [], withZero = [], labelCash = [], labelDigit = [];
    for (const id of ids) {
      const html = lane.wealthLetterheadChipHtml(id, roster[id] || null);
      const text = visible(html);
      const label = aria(html);
      if (text.indexOf("$") >= 0) withCash.push(id);
      if (/\d/.test(text)) withDigit.push(id);
      if (/\b0\b|zero/i.test(text)) withZero.push(id);
      if (label.indexOf("$") >= 0) labelCash.push(id);
      // The accessible name carries the coverage sentence, which legitimately
      // counts rows and people. Those two numbers are the ONLY digits allowed in
      // it — any other is a figure about this person.
      for (const n of label.match(/\d+/g) || []) {
        if (n !== String(cov.roster) && n !== String(cov.onFile)) labelDigit.push(`${id}:${n}`);
      }
    }
    const list = (a) => a.slice(0, 5).join(", ") + (a.length > 5 ? ` +${a.length - 5}` : "");
    eq(withCash.length, 0, `${what}: no pid without a row prints a dollar sign (${list(withCash)})`);
    eq(withDigit.length, 0, `${what}: …or a digit (${list(withDigit)})`);
    eq(withZero.length, 0, `${what}: …or a zero (${list(withZero)})`);
    eq(labelCash.length, 0, `${what}: …or a dollar sign in its accessible name (${list(labelCash)})`);
    eq(labelDigit.length, 0, `${what}: …or any digit but the coverage counts (${list(labelDigit)})`);
    // AND IT SAYS THE RIGHT THING INSTEAD.
    const one = visible(lane.wealthLetterheadChipHtml(ids[0], roster[ids[0]] || null));
    has(one, "No in-office wealth file on hand", `${what}: the empty pill says what is missing`);
  }

  // 12e. TRUMP STAYS EMPTY. This pass holds no OGE or FD document URL for him,
  //      and he is the person a reader is most likely to arrive at with a number
  //      already in mind — which is exactly why an unsourced row on him would be
  //      the most expensive one on the site.
  for (const [what, win] of [["as shipped", BARE], ["with the wave's rows in", WB]]) {
    eq(win.PDXFinance.wealth("trump", win.CMP_DATA.trump || null), null,
      `${what}: trump has no disclosure row`);
    const t = visible(win.PDXFinanceLane.wealthLetterheadChipHtml("trump", win.CMP_DATA.trump || null));
    has(t, "No in-office wealth file on hand", `${what}: …and his pill says so in words`);
    ok(!/\$|\d/.test(t), `${what}: …with no figure and no digit on it ("${t}")`);
  }
  lacks(tableSlice, "trump", "no trump row went into the shipped table");
  ok(!Object.prototype.hasOwnProperty.call(WAVE, "trump"),
    "…and none is in the fixture either, because this pass holds no form URL for him");

  // 12f. PILL 1 IS THE FILINGS BLOCK'S FIGURE AND PILL 2 IS THE DISCLOSURES
  //      BLOCK'S, AND NEITHER BLOCK CARRIES THE OTHER'S. One read per lane is
  //      the mechanism; this is the read of the assembled markup.
  const SB = (() => {
    const win = box({ disclosures: WAVE });
    const ctx = vm.createContext(win);
    vm.runInContext(FTM_SRC, ctx, { filename: "ftm-data.js" });
    must(typeof win._pdxFundingSection === "function", "ftm-data.js installed no _pdxFundingSection");
    return win;
  })();
  const seeded = WAVE_IDS.filter((id) => SEED[id]);
  const subjects12 = seeded.concat(WAVE_IDS.filter((id) => !SEED[id]));
  ok(subjects12.length >= 3, `too few wave pids to check both branches (${subjects12.length})`);
  for (const id of subjects12) {
    const person = SB.CMP_DATA[id];
    const dom = String(SB._pdxFundingSection(id, person) || "");
    const cut = dom.indexOf("Disclosures while serving");
    ok(cut > 0, `${id}: the section renders the disclosures block`);
    const filingBlock = dom.slice(0, cut);
    const discBlock = dom.slice(cut);
    const shown = SB.PDXFinance.bandLabel(WAVE[id].rangeOrExact);
    const r = SB.PDXFinanceLane.read(id);
    has(visible(discBlock), shown, `${id}: the disclosures block quotes pill 2's figure`);
    lacks(visible(filingBlock), shown, `${id}: …and the filings block does not`);
    if (r && r.receiptsFmt) {
      has(visible(filingBlock), r.receiptsFmt, `${id}: the filings block quotes pill 1's figure`);
      lacks(visible(discBlock), r.receiptsFmt, `${id}: …and the disclosures block does not`);
    }
    // NO SUM OF THE TWO ANYWHERE IN THE SECTION, and no percentage of one
    // against the other.
    lacks(visible(dom), "combined", `${id}: the section combines no two figures`);
    lacks(visible(dom), "% of", `${id}: …and takes no ratio of them`);
  }

  // 12g. THE SOURCE OF A ROW IS THE FORM, ASSERTED PRESENT. Every row carries an
  //      https link to a .gov document, the block renders it as a real anchor,
  //      and the gate refuses a row that cannot point at one.
  eq(typeof WF.curationDefects, "function", "PDXFinance.curationDefects() is the gate");
  eq(WF.curationDefects().join(" | "), "", "the shipped table has no curation defect");
  eq(WF.curationDefects(WAVE).join(" | "), "", "…and neither would the wave's rows");
  for (const id of WAVE_IDS) {
    const row = WAVE[id];
    ok(/^https:\/\/[^\/]*\.gov\//.test(row.formUrl), `${id}: the row points at an https .gov document`);
    const blk = String(WL.wealthBlockHtml(id, WB.CMP_DATA[id]));
    has(blk, row.formUrl, `${id}: the disclosures block links that document`);
    has(blk, 'rel="noopener noreferrer"', `${id}: …safely`);
    has(visible(blk), row.year, `${id}: …and names the form's year`);
    // AND THE FORM'S OWN WORDING SURVIVES THE COMPRESSION, where there was one.
    if (WF.bandLabel(row.rangeOrExact) !== row.rangeOrExact) {
      has(visible(blk), row.rangeOrExact, `${id}: the block prints the ticked box word for word`);
      has(visible(blk), "Ticked on the form as", `${id}: …and says that is what it is`);
    }
  }
  // THE GATE'S OWN RULES, ONE BROKEN ROW AT A TIME. Each fixture is the legal
  // row with exactly one thing wrong with it, so a rule that stopped working
  // fails here by name instead of quietly letting a row in.
  const LEGAL = { rangeOrExact: "$1,000,001 - $5,000,000", year: "2024",
                  formUrl: "https://disclosures-clerk.house.gov/example.pdf" };
  const broken = (patch) => {
    const row = Object.assign({}, LEGAL, patch);
    for (const k of Object.keys(patch)) if (patch[k] === undefined) delete row[k];
    return WF.curationDefects({ x: row }).join(" | ");
  };
  eq(WF.curationDefects({ x: LEGAL }).join(" | "), "", "a legal row passes the gate");
  has(broken({ formUrl: undefined }), "formUrl", "a row with no form URL is a defect");
  has(broken({ formUrl: "" }), "formUrl", "…as is an empty one");
  has(broken({ formUrl: "https://www.forbes.com/profile/example/" }), "not an https link to a .gov",
    "…as is a net-worth estimate standing in for a form");
  has(broken({ formUrl: "https://www.opensecrets.org/personal-finances/example" }), "not an https link to a .gov",
    "…as is an outside aggregator's page");
  has(broken({ formUrl: "http://disclosures-clerk.house.gov/example.pdf" }), "not an https link to a .gov",
    "…as is an unencrypted link");
  has(broken({ formUrl: "https://www.sltrib.com/news/politics/example/" }), "not an https link to a .gov",
    "…as is a news story about the form");
  has(broken({ rangeOrExact: "" }), "rangeOrExact is empty", "a row with no figure is a defect");
  has(broken({ rangeOrExact: "$0" }), "zero", "…as is a figure of zero, which is the one thing a blank is not");
  has(broken({ year: undefined }), "four-digit form year", "a row with no form year is a defect");
  has(broken({ year: "24" }), "four-digit form year", "…as is a half-written one");
  has(broken({ tenureYears: 10 }), "tenure comes only from _pdxTenure",
    "a row carrying years of service is a defect — tenure has one owner");
  has(broken({ years: 10 }), "tenure comes only from _pdxTenure", "…in any spelling");
  has(broken({ midpoint: "$3M" }), "unrecognised field midpoint",
    "a fourth field is a defect, whatever it is called");
  has(broken({ source: "Forbes 2024" }), "unrecognised field source",
    "…including a second provenance beside the form URL");
  eq(WF.curationDefects({ x: null }).join(" | "), "x: row is not an object",
    "and a row that is not a row says so");
  // THE GATE REPORTS, IT DOES NOT REPAIR OR ECHO. A defect names the pid and the
  // rule; it never prints the figure, because a defect list is read in a terminal
  // by somebody who has not opened the form yet.
  const defects = WF.curationDefects({ x: Object.assign({}, LEGAL, { rangeOrExact: "$9,999,999" }) });
  for (const d of defects) lacks(d, "9,999,999", "a defect message never echoes the figure");
  // …AND IT CHANGES NOTHING. Running the gate is a read.
  eq(WF.curationDefects(WAVE).length, 0, "running the gate twice over a clean table stays clean");
  eq(Object.keys(WAVE).length, WAVE_IDS.length, "…and the table it read is untouched");

  console.log(`   wave · 0 rows shipped · ${LADDER.length} filed categories pinned · ` +
    `${WAVE_IDS.length} legal rows and 13 illegal ones through the gate`);
}

// ── report ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  for (const f of failures) console.log(`   ✗ ${f}`);
  console.log(`\n✗ money two chips: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ money two chips: all ${passed} assertions passed`);
console.log("   two pills · two units · two doors · no sum, no midpoint, no zero");
