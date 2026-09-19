#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-money-two-chips.mjs — two money pills, two units, and never one number
// ─────────────────────────────────────────────────────────────────────────────
// The person-file letterhead carries TWO 💰 chips now:
//
//   💰 $774M itemized receipts · 2024 · FEC       → campaign filings block
//   💰 FD on file · 2025 · House Clerk           → disclosures block
//
// They sit inches apart, in one row, under one glyph, in one colour pair — and
// they are not two views of one number. The first is what a CAMPAIGN raised and
// reported to an election authority under contribution limits. The second is
// not a figure at all: it reports WHICH DOCUMENT a person filed while holding
// the office, for which year, in whose archive. Two archives, two units, and
// only one of the two is money.
//
// The second pill used to wait for a dollar figure, and the first curation wave
// proved there is none to wait for: Utah's in-office statement carries no value
// at all, a federal FD carries a category of value per asset and no total, and
// every single-number source is somebody's estimate. So the claim moved from
// HOW MUCH to WHICH FORM — a claim the archive can actually support, and one
// that is true of the people who have in fact filed.
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
//   3. THE PILL NAMES A DOCUMENT AND NEVER A DOLLAR. "FD on file", the form's
//      own year, the archive read off the form URL's host. No dollar sign, no
//      figure, and no digit on it but the year — and a dollar row in the other
//      table cannot reach it, because the pill does not read that table at all.
//      The band lookup survives for the long block and is still arithmetic-free.
//   4. MISSING IS NOT ZERO. No document row means words, on every profile,
//      never "$0", never an absent pill. Four rows ship, so this is the state
//      1,116 of the 1,120 rostered profiles are in today.
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
//  10. AND THE CURATION WAVE'S OWN RULES, because both tables are hand-written.
//      Section 12 is the DOLLAR table: it pins what may be typed into a row (a
//      figure as filed, the form's year, an https .gov link, three fields and
//      no fourth, no stored years of service), pins the filed-category lookup
//      pair by pair, and asserts the first wave's result — ZERO rows, on
//      purpose, and now also that such a row cannot reach a pill even if one
//      were written.
//  11. AND SECTION 13 IS THE DOCUMENT INDEX, the table that can fill: every
//      shipped row's kind, year and .gov document; the pill contract for the
//      pids that have one and the empty copy for the 1,116 that do not; the
//      archive label derived from the URL host rather than typed by hand; and
//      the document gate, one broken row at a time.
//
//   node scripts/test-money-two-chips.mjs
//
// Real shipped modules in a node:vm sandbox over the REAL FTM_FUNDING seed and
// the real roster. The SHIPPED document rows are lifted out of pdx-finance.js
// and asserted as they ship; states the four of them do not cover are exercised
// through PDXFinance._setDocumentTable, and dollar rows — which no pill reads
// any more — through PDXFinance._setWealthTable. Those are the two seams an
// ingest wave fills. Nothing here writes a row into either shipped table.

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
  // A band with no form link on file. No pill reads this table any more, but the
  // gate still has to refuse this row.
  owens: { rangeOrExact: "$100,001–$250,000", year: "2024", formUrl: "" },
};

// THE DOCUMENT ROWS, WHICH ARE WHAT PILL 2 ACTUALLY READS. Three fields, and
// not one of them is a figure: which form, which year, which document. An FD in
// the Senate's archive, an FD in the clerk's, and a Utah conflict-of-interest
// statement — the three archives the shipped rows and the next wave's rows come
// out of, so both label paths and both KINDS run here.
const DOC_FIXTURE = {
  lee: { kind: "FD", year: 2024,
         formUrl: "https://efdsearch.senate.gov/search/view/annual/example/" },
  curtis: { kind: "FD", year: 2023,
            formUrl: "https://disclosures-clerk.house.gov/example.pdf" },
  cox: { kind: "COI", year: 2024, formUrl: "https://disclosures.utah.gov/example-form" },
};

// THE ROWS THE REPO REALLY SHIPS, LIFTED RATHER THAN RETYPED. A fixture would
// let the shipped table rot into something else — a news-story URL, a fourth
// field, a figure — while every assertion here kept passing against a copy that
// no reader ever sees. Section 13 takes these apart row by row.
function liftDocuments() {
  const at = FIN_SRC.indexOf("var PDX_FD_DOCUMENTS = {");
  must(at > 0, "pdx-finance.js no longer declares PDX_FD_DOCUMENTS");
  const end = FIN_SRC.indexOf("\n  };", at);
  must(end > at, "could not find the end of the PDX_FD_DOCUMENTS literal");
  const literal = FIN_SRC.slice(at + "var PDX_FD_DOCUMENTS = ".length, end + "\n  }".length);
  return new Function("return (" + literal + ");")();
}
const SHIPPED_DOCS = liftDocuments();
const DOC_PIDS = Object.keys(SHIPPED_DOCS);
must(DOC_PIDS.length > 0, "the shipped document index is empty — pill 2 can never fill");

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
  if (opts.documents) win.PDXFinance._setDocumentTable(opts.documents);
  return win;
}
const BARE = box();                            // the repo exactly as it ships
const FILLED = box({ documents: DOC_FIXTURE }); // the same repo, three other rows
const DOLLARS = box({ disclosures: FD_FIXTURE }); // dollar rows and no document rows
const L = BARE.PDXFinanceLane;
const F = BARE.PDXFinance;
const LF = FILLED.PDXFinanceLane;
const ROSTER = BARE.CMP_DATA || {};
must(Object.keys(ROSTER).length > 500, "cmp-data.js did not load a roster");

console.log(`   two chips: ${SEED_IDS.length} filings · ${Object.keys(ROSTER).length} rostered · ` +
  `${DOC_PIDS.length} documents shipped (${DOC_PIDS.join(", ")}) · ` +
  `${Object.keys(DOC_FIXTURE).length} more under test`);

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
  section("3 · the disclosure pill names a document — no dollar, no digit but the year");

  // WHAT THE PILL CLAIMS NOW. "FD on file", the form's year, the archive the
  // link goes to. The old claim was a band, and a band is the one thing none of
  // these forms prints: the wave went looking and found no filed total anywhere
  // in the slice. This pill says a document exists, which is both true and
  // checkable.
  const wr = LF.wealthRead("lee", ROSTER.lee || null);
  eq(wr.state, "file", "a document row reads as `file`");
  eq(wr.kind, "FD", "…and names which form it is");
  eq(wr.year, "2024", "…and the form's own year");
  eq(wr.archive, "Senate EFD", "…and the archive read off the form URL's host");
  const pill = visible(LF.wealthLetterheadChipHtml("lee", ROSTER.lee || null));
  const label = aria(LF.wealthLetterheadChipHtml("lee", ROSTER.lee || null));
  const block = LF.wealthBlockHtml("lee", ROSTER.lee || { name: "Mike Lee" });
  // THE THREE CONTRACT TOKENS, IN ORDER, AS ONE STRING. Split across the pill in
  // any other order they would read as a different claim — an archive's year, a
  // year's form — so the order is the pin.
  has(pill, "FD on file · 2024 · Senate EFD",
    "the pill reads: form on file · year · archive");
  // AND NO DOLLAR, ANYWHERE ON IT. The year is the only digit the pill may
  // carry, plus the tenure span where the document that renders it already
  // knows one; everything else is removed by name and what is left must be
  // digit-free, because anything the pill computed would be in the remainder.
  const rest = pill.split("2024").join(" ")
    .replace(/\b\d+ yrs? in office\b/g, " ")
    .replace(/\bunder 1 yr in office\b/g, " ");
  ok(!/\$/.test(pill), `the pill carries no dollar sign ("${pill}")`);
  ok(!/\d/.test(rest), `…and no digit but the form year ("${rest.trim()}")`);
  for (const [name, text] of [["the pill", pill], ["its accessible name", label],
                              ["the disclosures block", visible(block)]]) {
    // Every shape a figure could arrive in on a surface that has none to report.
    for (const bad of ["$1–5M", "$3M", "$3.0M", "3000000", "$1,000,001",
                       "midpoint", "average", "approximately", "roughly", "about $", "~$",
                       "estimated", "est.", "net worth of", "worth about"]) {
      lacks(text, bad, `${name} reports no figure for a form that prints none ("${bad}")`);
    }
    ok(!/\bor\s+(?:about\s+|roughly\s+|~)?\$/.test(text),
      `${name} does not offer a reader a number to settle on`);
  }
  // THE READ IS THREE FIELDS AND A TENURE, AND NOT ONE OF THEM IS A FIGURE.
  eq(Object.keys(wr.disclosure).sort().join(","), "formUrl,kind,tenureYears,year",
    "the document read exposes exactly { kind, year, formUrl, tenureYears }");
  ok(!("rangeOrExact" in wr.disclosure),
    "…and carries no rangeOrExact for a consumer to print as a total");
  eq(typeof wr.disclosure.year, "string", "the form year is a string");
  for (const k of Object.keys(wr.disclosure)) {
    if (k === "tenureYears") continue;
    ok(typeof wr.disclosure[k] !== "number",
      `the document read exposes no numeric ${k} a consumer could do arithmetic on`);
  }
  // A UTAH CONFLICT-OF-INTEREST STATEMENT IS ITS OWN KIND, said in its own
  // words. It is not an FD and must not be labelled as one: it reports sources
  // and holdings with no values on the form at all.
  const coi = visible(LF.wealthLetterheadChipHtml("cox", ROSTER.cox || null));
  has(coi, "COI on file · 2024 · Utah", "a Utah statement reads: COI on file · year · Utah");
  lacks(coi, "FD", "…and is not labelled as a federal FD");
  ok(!/\$/.test(coi), `…with no dollar sign on it either ("${coi}")`);

  // A DOLLAR ROW CANNOT REACH THIS PILL AT ALL. The dollar table still exists,
  // still ships empty, and is still gated — but wealth() does not read it, so a
  // figure typed into it lands nowhere. This is the wall that makes "pill 2 is a
  // document chip" a property of the code rather than of the current data.
  eq(DOLLARS.PDXFinance.wealth("lee", ROSTER.lee || null), null,
    "a dollar row produces no disclosure read");
  const dPill = visible(DOLLARS.PDXFinanceLane.wealthLetterheadChipHtml("lee", ROSTER.lee || null));
  has(dPill, "No in-office wealth file on hand",
    "…and the pill stays in its empty state, because no document was filed with us");
  for (const bad of ["$1–5M", "$", "disclosed"]) {
    lacks(dPill, bad, `…carrying none of the dollar row's content ("${bad}")`);
  }
  lacks(visible(DOLLARS.PDXFinanceLane.wealthBlockHtml("lee", ROSTER.lee || { name: "Mike Lee" })),
    "$1–5M", "…and neither does the block behind it");

  // THE BAND LOOKUP SURVIVES, AND STILL DOES NO ARITHMETIC. It is the long
  // block's formatter for a transcribed holding, and section 12 holds it pair by
  // pair; what matters here is that it never grew a parse.
  eq(typeof F.bandLabel, "function", "the filed-band lookup is still published");
  eq(F.bandLabel("$1,000,001 - $5,000,000"), "$1–5M", "…and still compresses by lookup");
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

  // THE SHIPPED STATE OF THE REPO. Four document rows exist; the other 1,116
  // profiles are in the empty state, which is why the empty pill has to be right
  // in its own terms rather than as a placeholder waiting to be replaced.
  eq(F.wealth("lee", ROSTER.lee), null, "a pid with no document answers null, not a zeroed object");
  eq(F.wealth("nobody_at_all", null), null, "…for an id the roster does not carry either");
  const sample = ["lee", "curtis", "mike_lee"]
    .concat(Object.keys(ROSTER).filter((id) => !SHIPPED_DOCS[id]).slice(0, 25));
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
  const allIds = Object.keys(ROSTER).filter((id) => !SHIPPED_DOCS[id]);
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
    `every one of the ${allIds.length} rostered profiles with no document on file gets a ` +
    `disclosure pill (missing: ${nameList(noPill)})`);
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
  eq(allIds.length, Object.keys(ROSTER).length - DOC_PIDS.length,
    `the sweep covered every rostered pid but the ${DOC_PIDS.length} with a document on file`);

  // AND THE FOUR THAT DO HAVE A DOCUMENT ARE NOT IN THE EMPTY STATE — the carve-
  // out above would otherwise be a hole somebody could widen until the sweep
  // asserted nothing. Each of them reports its form, and none of them reports a
  // dollar.
  for (const id of DOC_PIDS) {
    const html = L.wealthLetterheadChipMount(id, ROSTER[id] || null);
    ok(!!html, `${id}: a pid with a document on file still gets a pill`);
    const words = visible(html);
    has(words, ` on file`, `${id}: …and it says a form is on file`);
    lacks(words, "No in-office wealth file on hand",
      `${id}: …rather than the empty copy, which would be false for this pid`);
    ok(!/\$/.test(words), `${id}: …with no dollar sign on it`);
  }
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
  has(shipped, "var PDX_FD_DISCLOSURES = {};", "the shipped dollar table is empty");
  lacks(shipped, "rangeOrExact:", "…with no figure written into it");
  eq(F.coverage().dollarRows, 0, "…and coverage reports zero dollar rows rather than guessing");
  eq(F.coverage().onFile, DOC_PIDS.length,
    "…while the count it reports to a reader is documents on file");
  eq(F.coverage().roster, Object.keys(ROSTER).length, "…out of the whole roster");
  has(F.coverage().sentence, "missing data", "…in a sentence that says a blank is missing data");
  lacks(F.coverage().sentence, "$", "…and carries no dollar sign of its own");
}

// ── 5 · the click targets differ ────────────────────────────────────────────
{
  section("5 · receipts opens the filings block, wealth opens the disclosures block");

  // Two anchors in one document, each aria-hidden and zero-height in the shipped
  // markup, each marking a different block. "Which block got focus" is the whole
  // question, so both are real and distinguishable here.
  function docBox() {
    const win = box({ documents: DOC_FIXTURE });
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
  lacks(rPill, "on file", "…and not the disclosure pill's words");
  lacks(rPill, "FD", "…nor the name of a form it is not");
  has(wPill, "FD on file", "the disclosure pill names the document");
  lacks(wPill, c.receiptsFmt, "…and not the receipts figure");
  ok(!/\$/.test(wPill), "…and carries no dollar figure of its own to be added to it");
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
  eq(Object.keys(w).sort().join(","), "formUrl,kind,tenureYears,year",
    "wealth() returns exactly { kind, year, formUrl, tenureYears }");
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
  for (const id of ["lee", "curtis", "cox", "nobody_at_all"].concat(Object.keys(ROSTER).slice(0, 8))) {
    pills.push([`${id} receipts`, LF.letterheadChipHtml(id)]);
    pills.push([`${id} wealth`, LF.wealthLetterheadChipHtml(id, ROSTER[id] || null)]);
  }
  // AND THE PIDS WHOSE DOCUMENTS REALLY SHIP, in the boot that has them. A wall
  // exercised only against fixtures is a wall around the fixtures.
  for (const id of DOC_PIDS) {
    pills.push([`${id} wealth (shipped)`, L.wealthLetterheadChipHtml(id, ROSTER[id] || null)]);
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
  for (const id of ["lee", "curtis", "cox", "nobody_at_all"].concat(DOC_PIDS)) {
    for (const [what, lane] of [["fixture", LF], ["shipped", L]]) {
      const t = visible(lane.wealthBlockHtml(id, ROSTER[id] || { name: "Someone" })).toLowerCase();
      for (const bad of RATING) {
        lacks(t, bad, `${id}: the disclosures block (${what}) carries no "${bad}"`);
      }
    }
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

  // THE FORM, WITH ITS YEAR, AS A LINK A READER CAN OPEN. The pill's whole claim
  // is that a document exists, so the document itself is the one thing the block
  // must be able to hand over.
  const withLink = LF.wealthBlockHtml("lee", ROSTER.lee || { name: "Mike Lee" });
  has(withLink, DOC_FIXTURE.lee.formUrl, "the disclosures block links the form itself");
  has(withLink, 'rel="noopener noreferrer"', "…safely");
  has(visible(withLink), "2024", "…and names the year the form is for");
  has(visible(withLink), "FD", "…and which form it is");
  has(visible(withLink), "Senate EFD", "…and the archive it came out of");
  // NO ROW WITHOUT A DOCUMENT, SO NO DEAD ANCHOR. A row whose URL is missing is
  // not a thinner version of this claim — there is no claim left to make — so
  // the lookup refuses it outright and the pill stays in its empty state.
  {
    const win = box({ documents: { owens: { kind: "FD", year: 2024, formUrl: "" } } });
    eq(win.PDXFinance.wealth("owens", win.CMP_DATA.owens || null), null,
      "a document row with no URL is not a document on file");
    const blk = win.PDXFinanceLane.wealthBlockHtml("owens", win.CMP_DATA.owens || { name: "Burgess Owens" });
    has(visible(blk), "No in-office wealth file on hand", "…so the block says nothing is on hand");
    lacks(blk, "<a", "…and renders no anchor at all rather than a dead one");
  }

  // THE BLOCK QUOTES THE PILL. One read per lane, so the two cannot come to
  // report the form, the year or the archive differently — which is exactly how a
  // pill comes to name an authority that is not the one its link opens.
  for (const id of Object.keys(DOC_FIXTURE)) {
    const p = ROSTER[id] || { name: id };
    const read = LF.wealthRead(id, p);
    const pillText = visible(LF.wealthLetterheadChipHtml(id, p));
    const blockText = visible(LF.wealthBlockHtml(id, p));
    for (const [what, token] of [["form", read.kind], ["year", read.year],
                                 ["archive", read.archive]]) {
      has(pillText, token, `${id}: the pill names the ${what} ("${token}")`);
      has(blockText, token, `${id}: …and so does the block it opens`);
    }
    has(LF.wealthBlockHtml(id, p), `href="${DOC_FIXTURE[id].formUrl}"`,
      `${id}: …and the block hands over the document the pill is talking about`);
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
    "neither hand-written table stores a tenure of its own");
  for (const bad of ["tenureYears", "yearsInOffice", "yearsServed", "sinceTakingOffice"]) {
    lacks(JSON.stringify(SHIPPED_DOCS), bad,
      `…and no shipped document row carries one ("${bad}")`);
  }
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
    const win = box({ documents: DOC_FIXTURE });
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
    const win = box({ documents: { fresh: { kind: "FD", year: 2025,
                                            formUrl: "https://example.gov/fd.pdf" } } });
    const now = new Date();
    win.CMP_DATA.fresh = { name: "Fresh Member", office: "U.S. Representative",
                           termStart: `${now.getFullYear()}-0${Math.min(9, now.getMonth() + 1)}` };
    const w = visible(win.PDXFinanceLane.wealthLetterheadChipHtml("fresh", win.CMP_DATA.fresh));
    ok(!/\b0 yrs?\b/.test(w), "a first-year member's pill prints no zero tenure");
    has(w, "under 1 yr in office", "…it says the span is under a year instead");
  }
  // AND A PERSON FILE WITH NO SWORN DATE GETS NO INVENTED SPAN.
  {
    const win = box({ documents: { nodate: { kind: "FD", year: 2024,
                                             formUrl: "https://example.gov/fd.pdf" } } });
    win.CMP_DATA.nodate = { name: "No Date", office: "U.S. Senator" };
    const w = visible(win.PDXFinanceLane.wealthLetterheadChipHtml("nodate", win.CMP_DATA.nodate));
    has(w, "FD on file · 2024", "a row with no tenure on file still reports its form");
    lacks(w, "in office", "…and invents no span to print beside it");
    eq(win.PDXFinance.wealth("nodate", win.CMP_DATA.nodate).tenureYears, null,
      "…and the read reports null rather than zero years");
  }
  // NOR DOES A DOCUMENT WITHOUT THE OWNER GET ONE. person.html does not load
  // voter-hub-location.js, so there the figure prints with no span — the same
  // thing every other tenure consumer on that document does, and strictly better
  // than a second copy of the arithmetic that agrees until it doesn't.
  {
    const win = box({ noTenure: true, documents: DOC_FIXTURE });
    eq(typeof win._pdxTenure, "undefined", "the no-owner boot really has no tenure owner");
    const p = win.CMP_DATA.lee;
    eq(win.PDXFinance.wealth("lee", p).tenureYears, null,
      "with no owner loaded the disclosure read reports no tenure");
    const w = visible(win.PDXFinanceLane.wealthLetterheadChipHtml("lee", p));
    has(w, "FD on file · 2024 · Senate EFD",
      "…the pill still reports the form, the year and the archive");
    lacks(w, "in office", "…and prints no span it could not read");
    ok(!/\b0 yrs?\b/.test(w), "…least of all a zero one");
    // AND THE OWNER IS NOT PULLED IN TO FORCE ONE. person.html carries no
    // voter-hub-location.js today, and the document chip is not a reason to load
    // a homepage module onto a person file.
    lacks(R("person.html"), 'src="/voter-hub-location.js"',
      "person.html loads the tenure owner's homepage module to force a span onto the pill");
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
    // A DOCUMENT ON THE MEMBER UNDER TEST — the strongest form of the question:
    // does a filed form on THIS person, rendered on THIS person's letterhead,
    // move THIS person's record read?
    const table = Object.assign({}, DOC_FIXTURE, SHIPPED_DOCS);
    table[PID] = { kind: "FD", year: 2024, formUrl: "https://example.gov/fd.pdf" };
    // A UTAH CONFLICT-OF-INTEREST ROW TOO, so both kinds, both sentences and both
    // archive labels run INSIDE the twin boot rather than beside it. A lookup
    // that could move a record read would move it here.
    const catPid = Object.keys(win.CMP_DATA).filter((k) => k !== PID && !table[k])[0];
    if (catPid) table[catPid] = { kind: "COI", year: 2024,
                                  formUrl: "https://disclosures.utah.gov/example-form" };
    win.PDXFinance._setDocumentTable(table);
    // AND THE DOLLAR TABLE FILLED AS WELL, in both boots. No pill reads it, which
    // is precisely why it belongs here: if a figure typed into it could reach a
    // record read by some other path, this is where that would show up.
    win.PDXFinance._setWealthTable(FD_FIXTURE);
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
  has(DOC, "FD on file", "…and the disclosure pill's own shape");
  has(DOC, "COI on file", "…in both of the two kinds it can report");
  has(DOC, "itemized receipts", "…and the receipts pill's own shape");
  lacks(DOC, "$1–5M disclosed",
    "…and no longer documents a dollar-shaped disclosure pill, which is not what ships");
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

  // 11c. THE EMPTY DISCLOSURE BLOCK, IN THE DOM, ON EVERY ROSTERED PROFILE WITH
  //      NO DOCUMENT ON FILE. Four rows ship, so this is the state of the other
  //      1,116: heading, the "on hand" sentence, the missing-data paragraph. No
  //      figure, no axis, no percent, no before-and-after. The four that do have
  //      a document are swept straight after, against their own contract.
  {
    const bad = { dollar: [], digitless: [], percent: [], words: [], chart: [] };
    const ids = Object.keys(W.CMP_DATA).filter((id) => !SHIPPED_DOCS[id]);
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
    eq(ids.length, Object.keys(W.CMP_DATA).length - DOC_PIDS.length,
      "…minus exactly the pids with a document on file");

    // AND THE FOUR WITH A DOCUMENT, IN THE SAME DOM. The block reports the form
    // and hands over the document; it still draws nothing, rates nothing and
    // prints no figure of its own.
    for (const id of DOC_PIDS) {
      const blk = String(W.PDXFinanceLane.wealthBlockHtml(id, W.CMP_DATA[id]) || "");
      const vis = visible(blk);
      const own = vis.slice(0, vis.indexOf("Coverage") === -1 ? vis.length : vis.indexOf("Coverage"));
      has(own, "Disclosures while serving", `${id}: the filled block keeps the heading`);
      has(own, " on file", `${id}: …and reports that a form is on file`);
      has(blk, SHIPPED_DOCS[id].formUrl, `${id}: …and links the document itself`);
      has(blk, 'rel="noopener noreferrer"', `${id}: …safely`);
      ok(!/\$/.test(own), `${id}: …with no dollar sign in the block's own copy`);
      ok(!/%/.test(vis), `${id}: …and no percent anywhere in it`);
      ok(!/<canvas|Chart\s*\(|axis/i.test(blk), `${id}: …and nothing drawn`);
    }
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
  // The document index is CLEARED in this boot. Three of the five pids below have
  // a real document row shipping today, and the claim being tested is what a
  // DOLLAR row does on its own: with both tables filled, a passing assertion
  // could be the document row's doing.
  const WB = box({ disclosures: WAVE, documents: {} });
  const WL = WB.PDXFinanceLane;
  const WF = WB.PDXFinance;
  for (const id of WAVE_IDS) must(WB.CMP_DATA[id], `${id} is not on the roster — the wave fixture is stale`);

  // 12a. THE DOLLAR TABLE IS EMPTY, AND ITS EMPTINESS IS THE WAVE'S FINDING —
  //      permanently, not pending. Section 4 already asserts the literal; what is
  //      new here is that the wave RAN, so this is a curated zero rather than an
  //      untouched stub, and the reason is written down where the next person
  //      will find it. The pill that used to wait on this table is now a document
  //      chip (section 13), which is why nothing about this zero is temporary.
  eq(F.coverage().dollarRows, 0, "the first curation wave shipped zero dollar rows");
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

  // 12c. AND A DOLLAR ROW, HOWEVER LEGAL, REACHES NO PILL AND NO BLOCK. Every
  //      one of the five rows above passes the gate, and not one of them puts a
  //      figure on a letterhead: wealth() reads the document index and nothing
  //      else. This is the difference between "we have no dollar rows today" and
  //      "a dollar row is not what this pill reports" — the first is data, the
  //      second is the code, and it is the second that has to hold when somebody
  //      finds a form with a number on it.
  for (const id of WAVE_IDS) {
    const person = WB.CMP_DATA[id];
    const row = WAVE[id];
    const shown = WF.bandLabel(row.rangeOrExact);
    eq(WF.wealth(id, person), null, `${id}: a dollar row is not a document on file`);
    const pill = visible(WL.wealthLetterheadChipHtml(id, person));
    has(pill, "No in-office wealth file on hand",
      `${id}: …so the pill reports what it actually has, which is no document`);
    ok(!/\$/.test(pill), `${id}: …with no dollar sign on it ("${pill}")`);
    ok(!/\d/.test(pill), `${id}: …and no digit at all ("${pill}")`);
    for (const bad of [shown, row.rangeOrExact, row.year, "disclosed", "$3M", "midpoint",
                       "average", "approximately", "about $", "~$", "up to", "at least",
                       "%", "net worth", "wealthy"]) {
      lacks(pill, bad, `${id}: the pill carries none of the dollar row's content ("${bad}")`);
    }
    // NOR DOES THE BLOCK BEHIND IT. A figure that cannot reach the pill but can
    // reach the block one jump away is the same claim in a larger typeface.
    const blk = visible(WL.wealthBlockHtml(id, person));
    lacks(blk, shown, `${id}: the disclosures block prints no dollar row's figure`);
    lacks(blk, row.formUrl, `${id}: …and links no dollar row's form`);
    has(blk, "No in-office wealth file on hand", `${id}: …it says nothing is on hand instead`);
    // AND NEITHER PILL BORROWS FROM THE OTHER LANE.
    const r = WL.read(id);
    if (r && r.receiptsFmt) {
      lacks(pill, r.receiptsFmt, `${id}: the disclosure pill carries no campaign receipts figure`);
      lacks(visible(WL.letterheadChipHtml(id)), shown,
        `${id}: …and the receipts pill carries no disclosed band`);
    }
  }

  // 12d. EVERY PID WITH NO DOCUMENT ON FILE STILL HAS NO $ AND NO DIGIT ON THE
  //      DISCLOSURE PILL. Swept over the whole roster in both boots: the repo as
  //      it ships, and the repo with five legal DOLLAR rows in it, where the risk
  //      is a pill borrowing a figure from the other table or from a neighbour.
  for (const [what, win] of [["as shipped", BARE], ["with the wave's dollar rows in", WB]]) {
    const lane = win.PDXFinanceLane;
    const roster = win.CMP_DATA;
    const cov = win.PDXFinance.coverage();
    const ids = Object.keys(roster).filter((id) => !SHIPPED_DOCS[id]);
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
  for (const [what, win] of [["as shipped", BARE], ["with the wave's dollar rows in", WB]]) {
    eq(win.PDXFinance.wealth("trump", win.CMP_DATA.trump || null), null,
      `${what}: trump has no disclosure row`);
    const t = visible(win.PDXFinanceLane.wealthLetterheadChipHtml("trump", win.CMP_DATA.trump || null));
    has(t, "No in-office wealth file on hand", `${what}: …and his pill says so in words`);
    ok(!/\$|\d/.test(t), `${what}: …with no figure and no digit on it ("${t}")`);
  }
  lacks(tableSlice, "trump", "no trump row went into the shipped dollar table");
  ok(!Object.prototype.hasOwnProperty.call(SHIPPED_DOCS, "trump"),
    "…and none went into the shipped document index, which holds no OGE URL for him");
  ok(!Object.prototype.hasOwnProperty.call(WAVE, "trump"),
    "…and none is in the fixture either, because this pass holds no form URL for him");

  // 12f. PILL 1 IS THE FILINGS BLOCK'S FIGURE AND PILL 2 IS THE DISCLOSURES
  //      BLOCK'S DOCUMENT, AND NEITHER BLOCK CARRIES THE OTHER'S. One read per
  //      lane is the mechanism; this is the read of the assembled markup, over
  //      the rows the repo really ships plus three more.
  const SB = (() => {
    const win = box({ disclosures: WAVE, documents: Object.assign({}, SHIPPED_DOCS, DOC_FIXTURE) });
    const ctx = vm.createContext(win);
    vm.runInContext(FTM_SRC, ctx, { filename: "ftm-data.js" });
    must(typeof win._pdxFundingSection === "function", "ftm-data.js installed no _pdxFundingSection");
    return win;
  })();
  const docIds = Object.keys(SHIPPED_DOCS).concat(Object.keys(DOC_FIXTURE));
  const seeded = docIds.filter((id) => SEED[id]);
  const subjects12 = seeded.concat(docIds.filter((id) => !SEED[id]));
  ok(subjects12.length >= 3, `too few document pids to check both branches (${subjects12.length})`);
  for (const id of subjects12) {
    const person = SB.CMP_DATA[id];
    if (!person) continue;
    const dom = String(SB._pdxFundingSection(id, person) || "");
    const cut = dom.indexOf("Disclosures while serving");
    ok(cut > 0, `${id}: the section renders the disclosures block`);
    const filingBlock = dom.slice(0, cut);
    const discBlock = dom.slice(cut);
    const read = SB.PDXFinanceLane.wealthRead(id, person);
    const stamp = read.kind + " on file";
    const r = SB.PDXFinanceLane.read(id);
    has(visible(discBlock), stamp, `${id}: the disclosures block reports pill 2's document`);
    has(discBlock, read.disclosure.formUrl, `${id}: …and links it`);
    lacks(visible(filingBlock), stamp, `${id}: …and the filings block reports no document`);
    lacks(visible(filingBlock), `${read.year} · ${read.archive}`,
      `${id}: …nor the document's year-and-archive stamp, which belongs to the other lane`);
    if (r && r.receiptsFmt) {
      has(visible(filingBlock), r.receiptsFmt, `${id}: the filings block quotes pill 1's figure`);
      lacks(visible(discBlock), r.receiptsFmt,
        `${id}: …and pill 1's figure never appears in the disclosure block`);
      // AND PILL 2'S WORDS ARE NEVER A RECEIPTS TOTAL. "on file" beside an
      // itemized-receipts figure would read as a claim about the money.
      lacks(visible(SB.PDXFinanceLane.letterheadChipHtml(id)), "on file",
        `${id}: pill 2's words appear on the receipts pill`);
    }
    // NO SUM OF THE TWO ANYWHERE IN THE SECTION, and no percentage of one
    // against the other.
    lacks(visible(dom), "combined", `${id}: the section combines no two figures`);
    lacks(visible(dom), "% of", `${id}: …and takes no ratio of them`);
    // AND THE DOLLAR ROWS ARE STILL IN THIS BOOT'S OTHER TABLE, REACHING NOTHING.
    if (WAVE[id]) {
      lacks(visible(dom), SB.PDXFinance.bandLabel(WAVE[id].rangeOrExact),
        `${id}: a dollar row reached the assembled money section`);
    }
  }

  // 12g. THE SOURCE OF A DOLLAR ROW IS STILL THE FORM, ASSERTED PRESENT. Nothing
  //      renders these rows any more, and the gate is kept anyway: it is what
  //      makes a future transcribed holding a curation decision rather than a
  //      typing one, and a gate that is deleted while the table survives is how
  //      an estimate gets in later.
  eq(typeof WF.curationDefects, "function", "PDXFinance.curationDefects() is the dollar gate");
  eq(WF.curationDefects().join(" | "), "", "the shipped table has no curation defect");
  eq(WF.curationDefects(WAVE).join(" | "), "", "…and neither would the wave's rows");
  for (const id of WAVE_IDS) {
    ok(/^https:\/\/[^\/]*\.gov\//.test(WAVE[id].formUrl),
      `${id}: the row points at an https .gov document`);
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

  console.log(`   dollar table · 0 rows shipped, on purpose · ${LADDER.length} filed categories ` +
    `pinned · ${WAVE_IDS.length} legal rows and 13 illegal ones through the gate · ` +
    `none of them reaching a pill`);
}

// ── 13 · the document index, which is the table that can fill ─────────────
{
  section("13 · the document index: which form, which year, whose archive, and the gate");

  // WHAT THIS TABLE IS. Three fields per pid — kind, year, formUrl — and not one
  // of them is a figure. It exists because the dollar table cannot fill: no form
  // in the slice prints a total, so the only true thing to say about a person who
  // HAS filed is that the document exists and here it is. That claim the archive
  // supports, and this section is what it costs to make it.
  //
  // Four rows ship. Every one of them is a House annual FD (filing type O) whose
  // PDF was fetched from the clerk's own host before it was written down. The
  // pids that were looked for and NOT written are as much a part of the wave:
  // Utah's disclosure site answers a browser challenge rather than a document,
  // the Senate's archive needs an accepted-terms session, Curtis's only 2025 row
  // is an extension rather than an annual, and no OGE URL for Trump was in hand.
  // Empty stayed the true sentence for those.

  // 13a. THE SHIPPED ROWS, TAKEN APART. Lifted from the module rather than
  //      retyped, so this is the table a reader actually gets.
  ok(DOC_PIDS.length >= 4, `the document index ships rows (${DOC_PIDS.length}: ${DOC_PIDS.join(", ")})`);
  for (const pid of DOC_PIDS) {
    const row = SHIPPED_DOCS[pid];
    ok(!!ROSTER[pid], `${pid}: the document row is for somebody on the roster`);
    ok(row.kind === "FD" || row.kind === "COI", `${pid}: kind is FD or COI ("${row.kind}")`);
    ok(/^[12][0-9]{3}$/.test(String(row.year)), `${pid}: the year is four digits ("${row.year}")`);
    ok(/^https:\/\/[^\/?#]*\.gov(?:[:\/?#]|$)/i.test(row.formUrl),
      `${pid}: the form URL is https and on a .gov host`);
    eq(Object.keys(row).sort().join(","), "formUrl,kind,year",
      `${pid}: the row is exactly three fields`);
    // NO FIGURE AND NO TENURE, IN ANY SPELLING. This table is a document index;
    // a number in it is the dollar table growing back in the wrong file.
    for (const bad of ["rangeOrExact", "amount", "total", "netWorth", "value", "assets",
                       "holdings", "band", "figure", "tenureYears", "years", "yearsInOffice"]) {
      ok(!(bad in row), `${pid}: the row carries no ${bad}`);
    }
    // AND IT POINTS AT THE MEMBER'S OWN DOCUMENT, not the index it was found in.
    // The clerk publishes a year's filings as a zip and a tab-separated index;
    // chipping either would put a pill on a person and hand the reader a
    // directory of twelve hundred other people.
    ok(!/\.zip(?:[?#]|$)/i.test(row.formUrl), `${pid}: the URL is not a zip index`);
    ok(!/\.txt(?:[?#]|$)/i.test(row.formUrl), `${pid}: …nor the index text file`);
    ok(/\/[^\/?#]+\.(?:pdf|aspx)(?:[?#]|$)/i.test(row.formUrl) || row.kind === "COI",
      `${pid}: …it is a document, not a directory ("${row.formUrl}")`);
  }
  // THE SOURCE SLICE ITSELF CARRIES NO ESTIMATE AND NO FIGURE, which is the
  // assertion that fails when somebody fills a row from a news story.
  const docSlice = FIN_SRC.slice(FIN_SRC.indexOf("var PDX_FD_DOCUMENTS = {"),
                                 FIN_SRC.indexOf("var KIND_LABELS"));
  ok(docSlice.length > 100, "the document table slice was found in the module source");
  for (const bad of ["forbes", "Forbes", "opensecrets", "OpenSecrets", "WEALTH_DATA",
                     "rangeOrExact", "netWorth", "estimated", "sltrib", "http://"]) {
    lacks(docSlice, bad, `no document row came in off an estimate or a story ("${bad}")`);
  }

  // 13b. THE PILL CONTRACT, ON THE PIDS THAT REALLY HAVE A DOCUMENT. Three
  //      tokens in one order, and the accessible name saying what the pill is
  //      not — because a money-coloured chip under a 💰 glyph is read as a figure
  //      by anybody scanning, and this one is a filing.
  for (const pid of DOC_PIDS) {
    const row = SHIPPED_DOCS[pid];
    const person = ROSTER[pid] || null;
    const html = L.wealthLetterheadChipMount(pid, person);
    ok(!!html, `${pid}: the pill is never hidden`);
    const words = visible(html);
    const label = aria(html);
    has(words, `${row.kind} on file · ${row.year} · ${F.archiveFor(row.formUrl)}`,
      `${pid}: the pill reads: form on file · year · archive`);
    ok(!/\$/.test(words), `${pid}: …with no dollar sign on it ("${words}")`);
    const rest = words.split(String(row.year)).join(" ")
      .replace(/\b\d+ yrs? in office\b/g, " ")
      .replace(/\bunder 1 yr in office\b/g, " ");
    ok(!/\d/.test(rest), `${pid}: …and no digit but the form year ("${rest.trim()}")`);
    // THE ACCESSIBLE NAME STATES WHAT IT IS AND WHAT IT IS NOT.
    has(label, "on file", `${pid}: the accessible name says a document is on file`);
    has(label, "not a net worth", `${pid}: …that it is not a net worth`);
    has(label, "not a band total", `${pid}: …not a band total`);
    has(label, "not a dollar figure", `${pid}: …and not a dollar figure of any kind`);
    ok(!/\$/.test(label), `${pid}: …and carries no dollar sign itself`);
    for (const bad of ["$0", "zero", "net worth of", "wealthy", "rich", "estimated"]) {
      lacks(label.toLowerCase(), bad, `${pid}: the accessible name does not say "${bad}"`);
    }
  }
  // AND THE PILL NEVER GOES MISSING ON ANY PROFILE, filled or empty — a hidden
  // pill is the one state that reads as a finding about the person.
  {
    const missing = Object.keys(ROSTER).filter((id) =>
      !L.wealthLetterheadChipMount(id, ROSTER[id] || null));
    eq(missing.length, 0, `the disclosure pill is never hidden (${missing.slice(0, 6).join(", ")})`);
  }

  // 13c. THE ARCHIVE COMES OFF THE URL HOST AND IS NEVER TYPED BY HAND. A pill
  //      that names an authority its link does not go to is the provenance bug
  //      this lane exists to prevent.
  eq(typeof F.archiveFor, "function", "PDXFinance.archiveFor(url) is published");
  for (const [url, expected] of [
    ["https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/1.pdf", "House Clerk"],
    ["https://efdsearch.senate.gov/search/view/annual/x/", "Senate EFD"],
    ["https://disclosures.utah.gov/x", "Utah"],
    ["https://extapps2.oge.gov/201/Presiden.nsf/x", "OGE"],
  ]) {
    eq(F.archiveFor(url), expected, `the host of ${url.slice(8, 40)}… is labelled "${expected}"`);
  }
  // A .gov HOST NOBODY MAPPED IS LABELLED WITH THE HOST ITSELF rather than with
  // a guess at which office runs it.
  eq(F.archiveFor("https://finance.example.gov/forms/1.pdf"), "finance.example.gov",
    "an unmapped .gov host is named as the host it is");
  eq(F.archiveFor(""), "", "no URL produces no archive label");
  for (const pid of DOC_PIDS) {
    const row = SHIPPED_DOCS[pid];
    const read = L.wealthRead(pid, ROSTER[pid] || null);
    eq(read.archive, F.archiveFor(row.formUrl),
      `${pid}: the lane's archive label is the one the URL's host produces`);
    ok(row.formUrl.indexOf(".gov") > 0, `${pid}: …and that host is a .gov host`);
  }

  // 13d. THE LONG BLOCK: the same form, the same year, the same archive, the
  //      document as an anchor, and one sentence about why none of it is a total.
  for (const pid of DOC_PIDS) {
    const row = SHIPPED_DOCS[pid];
    const blk = L.wealthBlockHtml(pid, ROSTER[pid] || { name: pid });
    const vis = visible(blk);
    has(vis, "Disclosures while serving", `${pid}: the block keeps its heading`);
    has(vis, `${row.kind} on file`, `${pid}: …and reports the same form as the pill`);
    has(vis, String(row.year), `${pid}: …with the form's year`);
    has(vis, F.archiveFor(row.formUrl), `${pid}: …and the archive that published it`);
    has(blk, `href="${row.formUrl}"`, `${pid}: …and renders the document as an anchor`);
    has(blk, 'rel="noopener noreferrer"', `${pid}: …safely`);
    has(blk, 'target="_blank"', `${pid}: …in a new tab, off the person file`);
    // THE SENTENCE, VERBATIM. Both halves of it: what each form reports, and
    // that PolitiDex will not turn either into a figure.
    has(vis, "A Utah conflict-of-interest statement reports sources and holdings, not a " +
             "dollar total; a federal FD reports per-asset categories, not a net worth.",
      `${pid}: the block says what these forms report instead of a total`);
    has(vis, "PolitiDex will not add those boxes into a figure.",
      `${pid}: …and that we will not add them up`);
    // NO HOLDINGS INVENTED. Nothing was transcribed in this pass, so the block
    // stops at the document. A list here would be lines nobody read off a form.
    for (const bad of ["<li", "<table", "Holdings", "Assets", "Reported assets", "Sources of income"]) {
      lacks(blk, bad, `${pid}: the block invents no transcribed lines ("${bad}")`);
    }
    ok(!/\$/.test(vis.slice(0, vis.indexOf("Coverage") === -1 ? vis.length : vis.indexOf("Coverage"))),
      `${pid}: …and prints no dollar figure of its own`);
    // AND NO THIRD SURFACE GREW BACK IN IT.
    for (const bad of ["<canvas", "transparency", "TRANSPARENCY", "% change", "pdx-fund-cmp",
                       "out of 100", "grade"]) {
      lacks(blk, bad, `${pid}: the disclosures block carries no ${bad}`);
    }
  }
  // PILL 1'S FIGURE IS NOT IN THERE EITHER, on a pid that has both.
  for (const pid of DOC_PIDS) {
    const r = L.read(pid);
    if (!r || !r.receiptsFmt) continue;
    lacks(visible(L.wealthBlockHtml(pid, ROSTER[pid] || { name: pid })), r.receiptsFmt,
      `${pid}: pill 1's figure appears in the disclosure block`);
    lacks(visible(L.letterheadChipHtml(pid)), "on file",
      `${pid}: …and pill 2's words appear on the receipts pill`);
  }

  // 13e. THE DOCUMENT GATE, ONE BROKEN ROW AT A TIME. Each fixture is the legal
  //      row with exactly one thing wrong with it, so a rule that stopped
  //      working fails here by name instead of quietly letting a row in.
  eq(typeof F.documentDefects, "function", "PDXFinance.documentDefects() is the document gate");
  eq(F.documentDefects().join(" | "), "", "the shipped document index has no defect");
  eq(F.documentDefects(DOC_FIXTURE).join(" | "), "", "…and neither would the fixture rows");
  const LEGAL_DOC = { kind: "FD", year: 2025,
                      formUrl: "https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/1.pdf" };
  const brokeDoc = (patch) => {
    const row = Object.assign({}, LEGAL_DOC, patch);
    for (const k of Object.keys(patch)) if (patch[k] === undefined) delete row[k];
    return F.documentDefects({ x: row }).join(" | ");
  };
  eq(F.documentDefects({ x: LEGAL_DOC }).join(" | "), "", "a legal document row passes the gate");
  eq(F.documentDefects({ x: Object.assign({}, LEGAL_DOC, { kind: "COI" }) }).join(" | "), "",
    "…and so does a Utah conflict-of-interest row");
  has(brokeDoc({ kind: undefined }), "kind", "a row with no kind is a defect");
  has(brokeDoc({ kind: "NET" }), "kind", "…as is a kind that is not FD or COI");
  has(brokeDoc({ kind: "FD annual report" }), "kind", "…or a free-text description of one");
  has(brokeDoc({ year: undefined }), "four-digit", "a row with no form year is a defect");
  has(brokeDoc({ year: "25" }), "four-digit", "…as is a half-written one");
  has(brokeDoc({ year: "2025-06-01" }), "four-digit", "…or a whole filing date");
  has(brokeDoc({ formUrl: undefined }), "formUrl", "a row with no document URL is a defect");
  has(brokeDoc({ formUrl: "" }), "formUrl", "…as is an empty one");
  has(brokeDoc({ formUrl: "https://www.forbes.com/profile/example/" }), ".gov",
    "…as is a net-worth estimate standing in for a form");
  has(brokeDoc({ formUrl: "https://www.opensecrets.org/personal-finances/example" }), ".gov",
    "…as is an outside aggregator's page");
  has(brokeDoc({ formUrl: "http://disclosures-clerk.house.gov/1.pdf" }), ".gov",
    "…as is an unencrypted link");
  has(brokeDoc({ formUrl: "https://www.sltrib.com/news/politics/example/" }), ".gov",
    "…as is a news story about the filing");
  has(brokeDoc({ rangeOrExact: "$1–5M" }), "figure", "a figure on a document row is a defect");
  has(brokeDoc({ netWorth: "$5M" }), "figure", "…in any spelling");
  has(brokeDoc({ assets: [] }), "figure", "…including a holdings array");
  has(brokeDoc({ tenureYears: 10 }), "tenure comes only from _pdxTenure",
    "a row carrying years of service is a defect — tenure has one owner");
  has(brokeDoc({ years: 10 }), "tenure comes only from _pdxTenure", "…in any spelling");
  has(brokeDoc({ docId: "10074823" }), "unrecognised field docId",
    "a fourth field is a defect, whatever it is called");
  has(brokeDoc({ source: "Deseret News" }), "unrecognised field source",
    "…including a second provenance beside the document");
  eq(F.documentDefects({ x: null }).join(" | "), "x: row is not an object",
    "and a row that is not a row says so");
  // A DEFECT NAMES THE PID AND THE RULE, AND ECHOES NEITHER A FIGURE NOR A
  // SESSION TOKEN. These lists are read in a terminal by somebody who has not
  // opened the form yet, and some archives carry a session id in the query
  // string: host and path are enough to find the row again.
  for (const d of F.documentDefects({ x: Object.assign({}, LEGAL_DOC, { year: "25" }) })) {
    has(d, "x", "a defect names the pid it belongs to");
    has(d, "year", "…and the rule that was broken");
  }
  {
    const tokened = "http://efdsearch.senate.gov/search/view/annual/x/?ROLLUP_TOKEN=abc123secret&s=1";
    const out = F.documentDefects({ x: Object.assign({}, LEGAL_DOC, { formUrl: tokened }) }).join(" | ");
    has(out, "efdsearch.senate.gov", "a URL defect names the host so the row can be found");
    lacks(out, "ROLLUP_TOKEN", "…and does not echo the query string");
    lacks(out, "abc123secret", "…or anything carried in it");
  }
  for (const d of F.documentDefects({ x: Object.assign({}, LEGAL_DOC, { rangeOrExact: "$9,999,999" }) })) {
    lacks(d, "9,999,999", "a defect message never echoes a figure");
  }
  // RUNNING THE GATE IS A READ.
  eq(F.documentDefects(SHIPPED_DOCS).length, 0, "running the gate over the shipped rows stays clean");
  eq(Object.keys(SHIPPED_DOCS).length, DOC_PIDS.length, "…and the table it read is untouched");

  // 13f. THE WALLS, THE SHELL AND THE WRITTEN RECORD.
  eq(F.scored, false, "PDXFinance still declares scored: false");
  for (const k of ["directionMatch", "wordVsAction", "formalPatternTier", "publicationFloor",
                   "ballotSort", "anyCrossPersonRanking"]) {
    ok((F.NEVER_FEEDS || []).indexOf(k) >= 0, `…and NEVER_FEEDS still names ${k}`);
  }
  // THE DOCUMENT INDEX IS NOT WIRED INTO /money. That page is an estimate board
  // with a sort and a percent change on it; a filed-document claim rendered
  // beside one would be read as the same kind of fact.
  const MON = R("money.html");
  for (const bad of ["PDX_FD_DOCUMENTS", "documentDefects", 'src="/pdx-finance.js"',
                     "on file ·"]) {
    lacks(MON, bad, `/money does not carry the document index ("${bad}")`);
  }
  // THE SHELL SHIPS THE NEW TABLE, and says what changed in it.
  const SW13 = R("sw.js");
  const ver13 = (SW13.match(/const CACHE_VERSION = '([^']+)'/) || [])[1];
  ok(ver13 && ver13 !== "v223", `the cache version moved past v223 for the document index (${ver13})`);
  // THIS VERSION'S ENTRY ALONE. Sliced from its own heading to the next one, so
  // a claim satisfied by an older entry further down does not count.
  const entryAt = SW13.indexOf(`// ${ver13} -`);
  ok(entryAt > 0, `the changelog above the constant has an entry for ${ver13}`);
  // WHERE THIS ENTRY ENDS. The newest entry sits directly above the constant,
  // so its end is the constant — unless a later numbered heading exists, in
  // which case that heading is the end. Matching a bare "// v" would stop at
  // the first prose comment further down the worker that happens to start with
  // a word beginning in v, and measure 700 lines of unrelated file manifest.
  const nextHead = SW13.slice(entryAt + 1).match(/\n\/\/ v\d+ - /);
  const constAt = SW13.indexOf("const CACHE_VERSION");
  const endAt = nextHead ? entryAt + 1 + nextHead.index : constAt;
  const entryText = SW13.slice(entryAt, Math.min(endAt, constAt));
  ok(entryText.split("\n").length <= 48,
    `the ${ver13} entry stays inside the shell's changelog budget (${entryText.split("\n").length} lines)`);
  for (const pid of DOC_PIDS) {
    has(entryText, pid, `the changelog entry lists the ${pid} document row`);
  }
  has(entryText.toLowerCase(), "zero dollar rows", "…and says no dollar rows were added");
  for (const store of ["location", "district", "team", "stance"]) {
    has(entryText, store, `…and that the ${store} store is untouched`);
  }
  has(entryText, "voter-hub-location.js", "…and names the tenure owner as unchanged");
  // AND THE DOCTRINE IS WRITTEN DOWN.
  const FI13 = R("FINANCE_INTEGRITY.md");
  has(FI13, "document chip", "FINANCE_INTEGRITY.md says pill 2 is a document chip");
  has(FI13, "PDX_FD_DOCUMENTS", "…and names the table that fills");
  has(FI13, "on purpose", "…and that the dollar table stays empty on purpose");
  for (const pid of DOC_PIDS) {
    has(FI13, pid, `…and records the ${pid} row`);
  }

  console.log(`   documents · ${DOC_PIDS.length} rows shipped (${DOC_PIDS.join(", ")}) · ` +
    `${Object.keys(ROSTER).length - DOC_PIDS.length} profiles in the empty state · ` +
    `21 illegal rows through the document gate`);
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
