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
  for (const id of ["lee", "curtis", "owens"]) {
    const p = ROSTER[id] || { name: id };
    const fig = FD_FIXTURE[id].rangeOrExact;
    has(visible(LF.wealthLetterheadChipHtml(id, p)), fig, `${id}: the pill quotes the filed figure`);
    has(visible(LF.wealthBlockHtml(id, p)), fig, `${id}: …and so does the block it opens`);
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

  // AND THE DOCTRINE IS WRITTEN DOWN WHERE IT IS ENFORCED. Both empty-state
  // sentence shapes, and the sum wall, in the lane's own integrity note.
  const DOC = R("FINANCE_INTEGRITY.md");
  has(DOC, "No money file on hand", "FINANCE_INTEGRITY.md carries the receipts absence sentence");
  has(DOC, "No in-office wealth file on hand", "…and the disclosure absence sentence");
  has(DOC, "$1–5M disclosed", "…and the disclosure pill's own shape");
  has(DOC, "itemized receipts", "…and the receipts pill's own shape");
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
