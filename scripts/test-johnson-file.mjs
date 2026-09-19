#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-johnson-file.mjs — one local person file, pinned as the local fixture
// ─────────────────────────────────────────────────────────────────────────────
// Trump is the fixture the money lane is written against: a filing on file, a
// figure with a unit, four House document rows in the index. Everything the
// lane can DO is provable on that one file.
//
// This file pins the other end, and it is the end almost every profile is at.
// Utah Sen. John Johnson, SD-3, North Ogden — a state senator with a real
// legislative record in the archive, no itemized campaign filing, and no
// in-office disclosure document, because disclosures.utah.gov answers a browser
// challenge rather than a form. He is the LOCAL full-spine fixture: the one file
// where you can read what a complete person document looks like when the money
// side of it is honestly empty and the record side of it is not.
//
// What must stay true, and why each one is here rather than in a money suite:
//
//   1. ONE JOHNSON, ONE SEAT. The roster carries a dozen Johnsons — a Speaker, a
//      Wisconsin senator, two other state senators in SD 1 and SD 27, a South
//      Dakota at-large Representative whose state abbreviates to SD, a Kanab
//      mayor and a UT-4 candidate. Exactly one of them is Utah Senate District
//      3, and a pass that merged two of them would produce a file that is two
//      people. So the uniqueness is asserted over the shipped roster, by seat.
//   2. THE OFFICE LINE IS A STATE SENATE SEAT. "UT State Senator · SD 3 · UT
//      District 3" — the roster's own three strings, in the letterhead's own
//      order, unrestyled. Not a U.S. Representative, not a member of Congress,
//      and not District 3 of Utah's THIRD CONGRESSIONAL DISTRICT, which is a
//      different person (kennedy) with a similar-looking string.
//   3. TWO MONEY PILLS, BOTH EMPTY, AND PILL 2 CARRIES NO DIGIT. The same two
//      components every other file mounts, in the same order, reading the same
//      shared copy — byte-identical to what a document-less profile gets
//      anywhere else on the roster once the first name is normalised out. He is
//      not specially worded and he is not specially styled.
//   4. NEITHER FINANCE TABLE CARRIES HIM. No key in PDX_FD_DOCUMENTS, no key in
//      PDX_FD_DISCLOSURES. The Utah form was LOOKED FOR and not chipped, and the
//      proof that it was not chipped is that his pid is absent from both tables
//      while the four shipped House rows are untouched.
//   5. THE MONEY SECTION IS TWO LABELLED BLOCKS. No canvas, no transparency
//      report, no percent change, no net-worth series, no control that leaves
//      the person file. The retired drawer is gone and this is the file it would
//      have been emptiest on.
//   6. THE RECEIPTS CONTRACT, IN WHICHEVER BRANCH THE ARCHIVE PUTS HIM. No row
//      today, so pill 1 and the filings block both carry the empty receipts
//      copy. If a curator writes one, the same section asserts the pill and the
//      block quote the SAME figure and the archive label comes off that URL's
//      host — so a Utah filing cannot be captioned OpenSecrets and a federal
//      number cannot land on a state senator.
//   7. THE MATCH CTA IS AN ADDRESS. With zero visitor positions the "Your Match"
//      block is rendered here for real, and its one control is an <a href> to
//      /my-stances?add=1. It used to be a button whose every branch was a no-op
//      on /p/<pid> except closeModal(), which closed the file.
//   8. THE FORMAL RECORD IS WHATEVER THE ARCHIVE EMITS. 75 sourced acts over 67
//      distinct measures, three sessions on file, no empty-file note. Pinned to
//      the numbers formal-index.js already publishes — not to an invented N, and
//      not padded with a biography.
//   9. TWIN BOOT. Rendering his letterhead pills, his disclosures block and his
//      whole money section moves neither his own nor a deep member's Direction
//      Match, formal pattern index, publication floor or mapped counts, and
//      leaves no new global behind.
//  10. NEVER_FEEDS, AND THE TWO LOAD CONSTRAINTS. The money modules still
//      publish the list of globals they may not write; money.html still does not
//      load pdx-finance.js; person.html still does not load voter-hub-location.js
//      just to print a tenure segment.
//
//   node scripts/test-johnson-file.mjs
//
// Shipped modules in a node:vm sandbox over the real roster, the real funding
// seed and the real document index. Nothing here writes a row into either
// finance table, and nothing here fetches anything.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// THE PID, WRITTEN ONCE. Everything below resolves through this constant, so a
// rename shows up as one failure with a name on it rather than forty.
const PID = "john_johnson";
const SEAT = /\bSD[\s-]?3\b/;          // the state-senate district token
const UTAH = /\b(UT|Utah)\b/i;

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) =>
  ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) =>
  ok(String(h).indexOf(n) >= 0, `${m} — ${JSON.stringify(n)} missing`);
const lacks = (h, n, m) =>
  ok(String(h).indexOf(n) < 0, `${m} — ${JSON.stringify(n)} present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => {
  if (c) return;
  console.error(`✗ johnson file: STALE HARNESS — ${m}`);
  process.exit(2);
};
const visible = (html) => String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const aria = (html) => (/aria-label="([^"]*)"/.exec(String(html)) || [])[1] || "";

const FTM_SRC = R("ftm-data.js");
const FIN_SRC = R("pdx-finance.js");
const LANE_SRC = R("finance-lane.js");
const PFF = R("profiles-full.js");

// ── the shipped seed and the shipped document index, lifted not retyped ──────
// Same lift the money suites perform, for the same reason: a fixture copy would
// keep every assertion below passing while the shipped rows rotted into
// something else. THE POINT OF THIS FILE IS THAT A REAL ROW DOES NOT EXIST FOR
// THIS PID, and only the real table can say that.
function liftLiteral(src, decl, endMark, what) {
  const at = src.indexOf(decl);
  must(at > 0, `${what} is no longer declared as "${decl}"`);
  const end = src.indexOf(endMark, at);
  must(end > at, `could not find the end of the ${what} literal`);
  // endMark carries the statement's own semicolon so the search cannot stop on a
  // brace inside the table; the slice drops it and keeps the literal.
  const body = src.slice(at + decl.length, end + endMark.length - 1);
  return new Function("return (" + body + ");")();
}
const SEED = liftLiteral(FTM_SRC, "var FTM_FUNDING = ", "\n    };", "FTM_FUNDING");
const SEED_IDS = Object.keys(SEED);
must(SEED_IDS.length >= 10, `the funding seed is unexpectedly small (${SEED_IDS.length})`);
const AS_OF = (FTM_SRC.match(/var FTM_AS_OF = '([^']*)'/) || [])[1] || "";
const DOCS = liftLiteral(FIN_SRC, "var PDX_FD_DOCUMENTS = ", "\n  };", "PDX_FD_DOCUMENTS");
const DOLLARS = liftLiteral(FIN_SRC, "var PDX_FD_DISCLOSURES = ", ";", "PDX_FD_DISCLOSURES");
const DOC_PIDS = Object.keys(DOCS);
must(DOC_PIDS.length > 0, "the shipped document index is empty — pill 2 can never fill for anyone");

// A box in the shipped load order: roster, filings, pdx-finance.js, the lane,
// then ftm-data.js for the section renderer. person.html carries no
// voter-hub-location.js, so no window._pdxTenure is installed here either —
// this is the letterhead a reader of /p/john_johnson actually receives.
function box() {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  vm.runInContext(R("cmp-data.js"), ctx, { filename: "cmp-data.js" });
  win.PROFILES = win.CMP_DATA;
  win._FTM_BY_ID = {};
  for (const id of SEED_IDS) win._FTM_BY_ID[id] = { id, name: id, funding: SEED[id] };
  win.FTM_AS_OF = AS_OF;
  vm.runInContext(FIN_SRC, ctx, { filename: "pdx-finance.js" });
  must(win.PDXFinance, "pdx-finance.js did not install PDXFinance");
  vm.runInContext(LANE_SRC, ctx, { filename: "finance-lane.js" });
  must(win.PDXFinanceLane, "finance-lane.js did not install PDXFinanceLane");
  vm.runInContext(FTM_SRC, ctx, { filename: "ftm-data.js" });
  must(typeof win._pdxFundingSection === "function",
    "ftm-data.js installed no _pdxFundingSection — the money section cannot be rendered");
  return win;
}
const W = box();
const ROSTER = W.CMP_DATA || {};
must(Object.keys(ROSTER).length > 500, "cmp-data.js did not load a roster");
const P = ROSTER[PID];
must(P, `the roster has no row for ${PID} at all — the pid moved or the row was deleted`);

console.log(`   johnson file: ${PID} · ${Object.keys(ROSTER).length} rostered · ` +
  `${SEED_IDS.length} filings · ${DOC_PIDS.length} documents (${DOC_PIDS.join(", ")})`);

// ── 1 · one Johnson, one seat ───────────────────────────────────────────────
{
  section("1 · exactly one roster pid is Utah Senate District 3");

  // EVERY JOHNSON IN THE ROSTER, then the ones seated in Utah Senate District 3.
  // The seat test is the district token and the state string together, because
  // neither alone is enough: "SD 3" alone would also be a Minnesota or Tennessee
  // senate seat, and "Utah" alone catches a Kanab mayor and a UT-4 candidate.
  const johnsons = Object.keys(ROSTER).filter((id) =>
    /johnson/i.test(String(ROSTER[id].name || "")) || /johnson/i.test(id));
  ok(johnsons.length > 4,
    `the roster still carries the other Johnsons this test exists to distinguish (${johnsons.length})`);
  const seated = johnsons.filter((id) => {
    const r = ROSTER[id];
    const blob = [r.office, r.state, r.district].filter(Boolean).join(" ");
    return SEAT.test(blob) && UTAH.test(blob);
  });
  eq(seated.join(","), PID, "exactly one Johnson holds Utah Senate District 3");

  // AND NOBODY ELSE HOLDS IT EITHER, Johnson or not. A second row for the same
  // seat is the shape of the merge this pass was asked to check for: two people
  // where the state has one senator.
  const sameSeat = Object.keys(ROSTER).filter((id) => {
    const r = ROSTER[id];
    const blob = [r.office, r.state, r.district].filter(Boolean).join(" ");
    return SEAT.test(blob) && UTAH.test(blob);
  });
  eq(sameSeat.join(","), PID, "…and no other roster row claims the same seat");

  // THE OTHER JOHNSONS ARE STILL THEMSELVES. Named, because the failure mode is
  // one of them quietly acquiring Johnson SD-3's district or office string.
  const OTHERS = {
    mike_johnson: "Louisiana",
    ron_johnson: "Wisconsin",
    mark_johnson_mn: "Minnesota",
    jack_johnson_tn: "Tennessee",
    dusty_johnson: "South Dakota",
  };
  for (const [id, where] of Object.entries(OTHERS)) {
    const r = ROSTER[id];
    if (!r) { ok(true, `${id} is no longer rostered, which is not this file's business`); continue; }
    has([r.state, r.office].join(" "), where, `${id} is still seated in ${where}`);
    ok(!(SEAT.test([r.office, r.state, r.district].filter(Boolean).join(" ")) &&
         UTAH.test([r.office, r.state, r.district].filter(Boolean).join(" "))),
      `${id} has not acquired the Utah SD-3 seat`);
  }
  console.log(`   ${johnsons.length} Johnsons rostered · 1 in Utah SD-3 · ${johnsons.length - 1} elsewhere`);
}

// ── 2 · the office line is a state senate seat ──────────────────────────────
{
  section("2 · the office line reads as a state senator for District 3, not a member of Congress");

  // THE LETTERHEAD'S OWN COMPOSITION, from the letterhead's own template. The
  // eyebrow prints p.office; the line under the name joins p.district and
  // p.state. Those three strings, in that order, are the office string a reader
  // sees — nothing here restyles them or writes a fourth.
  const heroAt = PFF.indexOf("<!-- Hero header");
  must(heroAt > 0, "profiles-full.js no longer opens the letterhead with the Hero header comment");
  const heroEnd = PFF.indexOf("<!-- WHAT USED TO BE HERE.", heroAt);
  must(heroEnd > heroAt, "the letterhead's closing landmark moved");
  const HERO = PFF.slice(heroAt, heroEnd);
  has(HERO, "${p.office || 'Public Official'}", "the eyebrow prints the roster's own office string");
  has(HERO, "var parts=[p.district,p.state].filter(Boolean)",
    "…and the office line under the name is the roster's district and state, joined");
  has(HERO, "${p.party ?", "…and the party chip is whatever the roster prints");

  const OFFICE = [P.office, P.district, P.state].filter(Boolean).join(" · ");
  console.log(`   office line · ${OFFICE}`);
  ok(/senat/i.test(OFFICE), `the office line says he sits in a senate ("${OFFICE}")`);
  ok(SEAT.test(OFFICE) || /\bDistrict 3\b/.test(OFFICE),
    `…for District 3 ("${OFFICE}")`);
  ok(UTAH.test(OFFICE), `…in Utah ("${OFFICE}")`);
  // AND NOT THE OTHER CHAMBER, IN ANY OF ITS SPELLINGS. Utah's third
  // CONGRESSIONAL district is a different person; a string that reads as federal
  // would put this file in front of a reader looking for that one.
  for (const bad of [/U\.S\./, /United States/i, /\bCongress/i, /Representative/i,
                     /\bHouse\b/i, /\bRep\.?\b/, /Senator for Utah\b/i]) {
    ok(!bad.test(OFFICE), `…and does not call him ${String(bad)} ("${OFFICE}")`);
  }
  eq(P.district, "SD 3", "the district field is the state-senate seat");
  eq(P.party, "R", "the party chip is the roster's own letter");
  // ONE PERSON, NOT TWO. A second row would have shown up in section 1; this
  // pins that the one row is not itself two people spliced together.
  eq(String(P.name), "John Johnson", "the name is the one the roster prints");
  ok(!/\bcandidate\b/i.test(String(P.office || "")),
    "he is a seated senator on this row, not a candidate row wearing a seat");
}

// ── 3 · two money pills, both empty, and pill 2 carries no digit ────────────
{
  section("3 · the letterhead mounts two money pills and pill 2 is the shared empty-document copy");

  // THE TEMPLATE MOUNTS EXACTLY TWO, IN ORDER, BEFORE THE PARTY CHIP. Counted
  // rather than eyeballed, because "do not add a third money chip" is a count.
  const heroAt = PFF.indexOf("<!-- Hero header");
  const HERO = PFF.slice(heroAt, PFF.indexOf("<!-- WHAT USED TO BE HERE.", heroAt));
  const mounts = HERO.match(/PDXFinanceLane\.\w+ChipMount\(/g) || [];
  eq(mounts.length, 2, "the letterhead mounts two money chips and no third");
  const r1 = HERO.indexOf("letterheadChipMount(id)");
  const r2 = HERO.indexOf("wealthLetterheadChipMount(id, p)");
  const rc = HERO.indexOf("_recChipsMount()");
  const wa = HERO.indexOf("PDXWordAction.compactBadgeMount");
  const party = HERO.indexOf("${p.party ?");
  ok(rc > 0 && wa > rc, "the record chips and the ⚖️ chip come first");
  ok(r1 > wa, "…then receipts");
  ok(r2 > r1, "…then disclosures, adjacent to its twin");
  ok(party > r2, "…and the party pill last");

  const pill1 = W.PDXFinanceLane.letterheadChipMount(PID);
  const pill2 = W.PDXFinanceLane.wealthLetterheadChipMount(PID, P);
  ok(!!pill1, "the receipts pill renders on this file");
  ok(!!pill2, "the disclosures pill renders on this file");
  const v1 = visible(pill1), v2 = visible(pill2);
  console.log(`   pill 1 · ${v1}`);
  console.log(`   pill 2 · ${v2}`);

  has(v2, "No in-office wealth file on hand", "pill 2 says the document is not on hand, in words");
  ok(!/\$/.test(v2), "…with no dollar sign on it");
  ok(!/\d/.test(v2), `…and no digit at all ("${v2}")`);
  for (const bad of ["$0", "none", "nil", "zero", "clean", "clear", "nothing to report",
                     "no concerns", "unremarkable", "not wealthy", "modest", "transparent"]) {
    lacks(v2.toLowerCase(), bad, `…and does not say "${bad}"`);
  }
  // THE LONG FORM CARRIES THE REASON, which is where the coverage denominator
  // belongs — a count on a pill with no denominator beside it is worse missing.
  const label2 = aria(pill2);
  has(label2, "missing data", "pill 2's accessible name carries the coverage disclosure");
  has(label2, "not a disclosure of zero", "…and says outright it is not a zero");
  has(label2, "not a report that they did not file", "…nor a report that he failed to file");
  // AND IT IS NOT HIS OWN SENTENCE. Byte-identical, once the first name is
  // normalised out, to what every other document-less profile on the roster
  // gets. He is not specially worded, which is the whole claim of this pass.
  const peers = Object.keys(ROSTER).filter((id) => id !== PID && !DOCS[id]).slice(0, 6);
  must(peers.length >= 3, "not enough document-less peers to compare the shared copy against");
  const norm = (html, who) => {
    const first = String((who && who.name) || "").split(" ")[0];
    let out = visible(html);
    if (first) out = out.split(first).join("«first»");
    return out;
  };
  const mine2 = norm(pill2, P);
  for (const id of peers) {
    const peer = W.PDXFinanceLane.wealthLetterheadChipMount(id, ROSTER[id]);
    eq(norm(peer, ROSTER[id]), mine2, `pill 2 is the same component and copy as ${id}'s`);
  }
  // THE ⚖️ CHIP IS THE SHARED COMPONENT AND IT DOES NOT GHOST. Below the tested
  // floor word-action.js returns nothing at all rather than a dashed placeholder,
  // and the mount is an empty host worth zero pixels until a read arrives.
  const W2 = box();
  const ctx2 = vm.createContext(W2);
  for (const f of ["issue-map.js", "stance-sides.js", "politician-stances-core.js",
                   "politician-stances-ext.js", "state-senate-stances.js", "stance-helpers.js",
                   "say-vs-do.js", "publication-floor.js", "word-action.js"]) {
    try { vm.runInContext(R(f), ctx2, { filename: f }); } catch (e) {}
  }
  must(W2.PDXWordAction && typeof W2.PDXWordAction.compactBadgeMount === "function",
    "word-action.js no longer publishes compactBadgeMount");
  const badge = String(W2.PDXWordAction.compactBadgeMount(PID, P) || "");
  const badgeNow = String(W2.PDXWordAction.compactBadgeHtml
    ? (W2.PDXWordAction.compactBadgeHtml(PID, P) || "") : "");
  eq(visible(badge), "", "the ⚖️ chip's mount is an empty host, not a placeholder");
  for (const ghost of ["—", "–", "n/a", "N/A", "??", "--"]) {
    lacks(visible(badge) + " " + visible(badgeNow), ghost,
      `neither the ⚖️ host nor its first read prints a ghost "${ghost}"`);
  }
  ok(badgeNow === "" || /\d/.test(visible(badgeNow)),
    "…and where it does render it carries a real figure rather than a dash");
}

// ── 4 · neither finance table carries him ───────────────────────────────────
{
  section("4 · no document row and no dollar row was added for this pid");

  ok(!Object.prototype.hasOwnProperty.call(DOCS, PID),
    `PDX_FD_DOCUMENTS carries no ${PID} key`);
  ok(!Object.prototype.hasOwnProperty.call(DOLLARS, PID),
    `PDX_FD_DISCLOSURES carries no ${PID} key`);
  eq(Object.keys(DOLLARS).length, 0, "…and the dollar table is still empty for everyone");
  // THE FOUR HOUSE ROWS ARE UNTOUCHED. This pass was not allowed to change them,
  // and the cheapest way to "fix" an empty Utah pill would have been to widen
  // that table until something matched.
  eq(DOC_PIDS.sort().join(","), ["bmoore", "kennedy", "maloy", "owens"].sort().join(","),
    "the shipped document index is still exactly the four House rows");
  for (const id of DOC_PIDS) {
    eq(DOCS[id].kind, "FD", `${id} is still a federal FD row`);
    eq(String(DOCS[id].year), "2025", `…for 2025`);
    ok(/^https:\/\/disclosures-clerk\.house\.gov\//.test(String(DOCS[id].formUrl || "")),
      `…linking the clerk's own document`);
  }
  // AND THE UTAH CHALLENGE PAGE IS NOT IN EITHER TABLE, for him or for anyone.
  // "Looked for, not chipped" means the archive's front door was not written
  // down as if it were a member's form.
  const both = JSON.stringify(DOCS) + JSON.stringify(DOLLARS);
  lacks(both, "disclosures.utah.gov", "no row points at the Utah challenge page");
  lacks(both, PID, `…and neither table mentions ${PID} in any field`);
  // THE LANE AGREES, AT RUNTIME, not just in the literal.
  eq(W.PDXFinance.filing(PID), null, "PDXFinance.filing() has no document row for this pid");
  eq(W.PDXFinance.wealth(PID, P), null, "…and PDXFinance.wealth() has no dollar row either");
}

// ── 5 · the money section is two labelled blocks ────────────────────────────
{
  section("5 · the rendered money section is two labelled blocks and nothing else");

  const dom = String(W._pdxFundingSection(PID, P) || "");
  ok(dom.length > 400, `the money section renders on this file (${dom.length} chars)`);
  const words = visible(dom);

  const blocks = dom.match(/data-pdx-money-block="([a-z]+)"/g) || [];
  eq(blocks.length, 2, "exactly two money blocks");
  eq(blocks.join(","), 'data-pdx-money-block="filings",data-pdx-money-block="wealth"',
    "…campaign filings first, disclosures second");
  const heads = (dom.match(/<h4 class="pdx-money-block-h">([^<]*)<\/h4>/g) || [])
    .map((h) => h.replace(/<[^>]*>/g, ""));
  eq(heads.join(" | "), "Campaign filings | Disclosures while serving",
    "…and both are labelled, so neither reads as a continuation of the other");

  // THE RETIRED DRAWER, BY EVERY NAME IT WENT BY.
  for (const [re, what] of [
    [/transparency report/i, "a financial transparency report"],
    [/net worth (of|is|:|\$)/i, "a net-worth figure"],
    [/\$[\d,]/, "a dollar figure"],
    [/wealth over time/i, "a wealth-over-time series"],
    [/%\s*change/i, "a percent change"],
    [/integrity (score|number|rating)/i, "a funding integrity score"],
    [/out of 100\b/i, "an out-of-100 figure"],
    [/<canvas/i, "a canvas to draw a chart into"],
    [/Chart\s*\(/, "a Chart.js construction"],
    [/\bcompare\b/i, "a compare-funding control that leaves the person file"],
    [/href="\/(money|compare)/i, "a link off this file into the money board"],
    [/\b(transparent|wealthy|rank(ed|ing)?)\b/i, "a grade, a rank or a wealth word"],
  ]) {
    ok(!re.test(dom), `the money section carries no ${what}`);
  }
  // "NET WORTH" APPEARS ONCE AND ONLY INSIDE A REFUSAL. The empty disclosures
  // block says a federal FD reports categories "not a net worth"; that is the
  // sentence that stops a reader waiting for a figure, so the phrase is checked
  // for its polarity rather than banned outright.
  for (const m of words.match(/.{0,12}net worth/gi) || []) {
    ok(/\bnot a net worth$/i.test(m.trim()),
      `every mention of net worth on this file is a refusal ("${m.trim()}")`);
  }

  // NO FIGURE OF ANY KIND ON THIS FILE'S MONEY SECTION, because there is no
  // filing and no document behind either block. The only digits allowed through
  // are the two coverage denominators, which are counts of OUR archive.
  // THE THREE DIGITS A READER IS ALLOWED TO MEET HERE, removed by name before the
  // sweep: the two coverage denominators, which are counts of OUR archive rather
  // than of his money, and the seat itself, which the source-gap line quotes out
  // of the roster to say which archive was never opened.
  const stripped = words
    .replace(/Itemized filings are on file for \d+ of the \d+ people PolitiDex carries\./g, " ")
    .replace(/The in-office disclosure form itself is on file for \d+ of the \d+ people PolitiDex carries\./g, " ")
    .split(String(P.state)).join(" ");
  ok(!/\$/.test(words), "…and no dollar sign anywhere in it");
  ok(!/\d/.test(stripped), `…and no digit but the coverage denominators ("${stripped.slice(0, 120)}")`);

  // BOTH EMPTY STATES SAY WHAT IS MISSING AND WHOSE FAULT IT IS.
  has(words, "No money file on hand", "the filings block says no filing is on hand");
  has(words, "missing data on our side", "…and puts the gap on our side");
  has(words, "No in-office wealth file on hand", "the disclosures block says no document is on hand");
  has(words, "not a disclosure of zero", "…and that a blank is not a zero");
  has(words, "not a report that John did not file", "…nor a report that he failed to file");
  // THE ONE SENTENCE THIS PASS ADDED, AND WHY IT IS HERE. A reader told only
  // "no document on hand" waits for a DOLLAR FIGURE to arrive when the hand
  // work is done. None is coming — neither form states a total — so the empty
  // branch says so where the blank is.
  has(words, "A Utah conflict-of-interest statement reports sources and holdings, not a dollar total",
    "the empty disclosures block names what the form would have reported");
  has(words, "not a net worth", "…and that a federal FD states no total either");
  has(words, "will not publish one here in place of the form",
    "…and refuses to put a figure where the document is not");
  lacks(words, "holdings list", "no holdings are listed in place of the form");
  // NO FORM LINK, BECAUSE THERE IS NO MEMBER DOCUMENT TO LINK. A link to the
  // archive's front door reads as a link to his form.
  lacks(dom, "disclosures.utah.gov", "the block links no Utah URL, because none is a member document");
  ok(!/<a [^>]*href="http/i.test(dom.slice(dom.indexOf('data-pdx-money-block="wealth"'))),
    "…and the disclosures block carries no outbound link at all");
}

// ── 6 · the receipts contract, in whichever branch the archive puts him ─────
{
  section("6 · pill 1 and the filings block agree, in whichever state the archive leaves them");

  const ARCH = LANE_SRC.slice(LANE_SRC.indexOf("var ARCHIVES = ["),
    LANE_SRC.indexOf("function archiveOf(url)"));
  must(/disclosures\\?\.utah\\?\.gov/.test(ARCH),
    "finance-lane.js's archive table no longer knows the Utah host");
  must(/Utah disclosures/.test(ARCH), "…or no longer labels it Utah disclosures");
  const row = SEED[PID] || null;
  const pill1 = String(W.PDXFinanceLane.letterheadChipMount(PID) || "");
  const dom = String(W._pdxFundingSection(PID, P) || "");
  const filings = dom.slice(dom.indexOf('data-pdx-money-block="filings"'),
    dom.indexOf('data-pdx-money-block="wealth"'));
  must(filings.length > 100, "the filings block could not be sliced out of the section");

  if (!row) {
    // TODAY'S BRANCH. No itemized filing for this seat, so both the pill and the
    // block it opens carry the empty receipts copy — and neither borrows a
    // federal number from a namesake or from a statewide index.
    console.log("   no receipts row on file — both surfaces carry the empty copy");
    has(visible(pill1), "No money file on hand", "pill 1 is the empty receipts copy");
    has(visible(filings), "No money file on hand", "…and so is the filings block");
    eq(W.PDXFinanceLane.read(PID), null, "the lane resolves no filing for this pid");
    lacks(pill1 + filings, "opensecrets", "no OpenSecrets figure was pasted onto a state senator");
    lacks(pill1 + filings, "fec.gov", "…and no FEC file is claimed for a state seat");
    ok(!/\$/.test(visible(pill1)), "pill 1 prints no dollar sign");
    // THE GAP NAMES THE ARCHIVE THAT WOULD HAVE HELD IT, from the office string
    // alone — an unopened archive, not a search that came back empty.
    has(visible(filings), "no disclosure source open", "the filings block names the source gap");
    has(visible(filings), "unopened archive", "…and calls it unopened rather than clean");
  } else {
    // THE DAY A CURATOR WRITES ONE. The pill's figure has to appear in the block
    // it opens — a filled pill over an empty block is the shape of a filing
    // written into the funding seed with no record behind it — and the archive
    // label has to come off that filing's own host.
    const read = W.PDXFinanceLane.read(PID);
    ok(!!read, "a seeded filing resolves through the lane");
    has(visible(pill1), String(read.receiptsFmt), "pill 1 quotes the filing's figure");
    has(visible(filings), String(read.receiptsFmt),
      "…and the filings block quotes the same figure");
    has(visible(pill1), "itemized receipts", "…with its unit welded on");
    const host = (String(row.source || "").split("//")[1] || "").split("/")[0].toLowerCase();
    must(host, "the seeded row carries no source URL to read an archive off");
    const expect = /disclosures\.utah\.gov$/.test(host) ? "Utah disclosures"
      : /fec\.gov$/.test(host) ? "FEC"
      : /opensecrets\.org$/.test(host) ? "OpenSecrets" : "filed";
    has(visible(pill1), expect, `…and the archive label (${expect}) comes off the URL host (${host})`);
    if (/^UT /.test(String(P.office || ""))) {
      lacks(visible(pill1).toLowerCase(), "opensecrets",
        "a state senator's filing is not captioned OpenSecrets");
    }
  }
}

// ── 7 · the match CTA is an address ─────────────────────────────────────────
{
  section("7 · with zero visitor positions the match block's one control is a link to /my-stances");

  // THE REAL BRANCH, RENDERED. The "Your Match" block is an inline IIFE in the
  // profile body, so it is sliced out of the shipped source and CALLED with the
  // state a first-time visitor actually has: no alignment signature, no stance
  // store, no score function. Reading the source for an href would not have
  // caught the old defect, which was that the control ran and did nothing.
  const anchorAt = PFF.indexOf('<span id="pdxsec-match"');
  must(anchorAt > 0, "profiles-full.js no longer carries the #pdxsec-match anchor");
  const openAt = PFF.indexOf("${(() => {", anchorAt);
  must(openAt > anchorAt, "the match block is no longer an inline arrow after its anchor");
  let depth = 0, end = -1;
  for (let j = PFF.indexOf("{", openAt + 3); j < PFF.length; j++) {
    const c = PFF[j];
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (!depth) { end = j; break; } }
  }
  must(end > openAt, "could not balance the match block's braces");
  must(PFF.slice(end, end + 5) === "})()}", "the match block does not close where expected");
  const call = PFF.slice(openAt + 2, end + 1) + ")()";
  const render = new Function("id", "p", "_alignIssues", "_calcAlignmentScore", "window",
    "return " + call + ";");

  const zero = String(render(PID, P, undefined, undefined, W) || "");
  ok(zero.length > 200, `the zero-positions branch renders something (${zero.length} chars)`);
  has(zero, 'href="/my-stances?add=1"', "the control is an address, and it is the picker's");
  ok(!/<button/i.test(zero), "…not a button");
  ok(!/onclick/i.test(zero), "…and it runs no script, so it cannot fall through a branch");
  lacks(zero, "closeModal", "…and above all it does not close the file the reader came to read");
  lacks(zero, "_krAlignGuideToPicker", "…nor call the homepage overlay that is not on this document");
  lacks(zero, "alignment-panel", "…nor scroll to a panel /p/<pid> does not carry");
  const zv = visible(zero);
  has(zv, "See your match with John", "the invitation names the person");
  ok(!/\d/.test(zv), `…and claims no match figure with nothing to compute it from ("${zv}")`);
  ok(!/%/.test(zv), "…and prints no percentage");
  // THE FILLED BRANCH STILL WORKS, so the fix did not strand the other half.
  const sides = new Set(["end_dei", "healthcare"]);
  const filledProbe = String(render(PID, P, sides, () => 64, W) || "");
  has(filledProbe, "64", "a visitor with positions still gets their figure");
  has(filledProbe, "Partial match", "…and its verdict word");

  // AND THE MATCH DOES NOT READ MONEY, in either branch. Direction Match is a
  // record read; a funding figure reaching it would make the letterhead's money
  // pills into inputs to a verdict.
  for (const bad of ["PDXFinance", "_pdxFunding", "FinanceLane", "receipts",
                     "FD_DOCUMENTS", "wealth", "funding"]) {
    lacks(call, bad, `the match block never reads ${bad}`);
  }
  // …and prints no dollar figure of its own. Bare "$" would match the template
  // literal's own interpolations, so the shape checked is a dollar and a digit.
  ok(!/\$\s*[\d,]/.test(zero + filledProbe), "the match block prints no dollar figure");

  // THE DESTINATION IS SERVED, AND IT IS THE ONE STORE. A deep link to a route
  // nobody rewrites is a dead control with a nicer status bar.
  const TOML = R("netlify.toml");
  has(TOML, 'from = "/my-stances"', "netlify.toml serves /my-stances");
  has(TOML, "/my-stances.html", "…from the document that teaches positions");
  const STUDIO = R("stance-studio.js");
  has(STUDIO, "get('add') === '1'", "the studio reads ?add=1 and opens the picker");
  has(R("my-stances.js"), "pdx_my_stances_v1", "…and the one stance store key is unchanged");
  // THE BALLOT DESK MADE THE SAME MOVE, and this is the precedent it set.
  has(R("ballot-workspace.js"), 'href="/my-stances?add=1"',
    "the ballot desk's unranked line points at the same address");

  // ZERO SIDES MEANS ZERO SIDES, through the one shared reader. No ghost chip,
  // no defaulted position, no invented match.
  const WS = makeSandbox();
  const ctxs = vm.createContext(WS);
  for (const f of ["cmp-data.js", "issue-map.js", "stance-sides.js"]) {
    vm.runInContext(R(f), ctxs, { filename: f });
  }
  must(WS.PDXStanceSides, "stance-sides.js did not install PDXStanceSides");
  eq(WS.PDXStanceSides.count(), 0, "a visitor with no store holds no sides");
  eq(WS.PDXStanceSides.list().length, 0, "…and the shared reader invents none");
  eq(WS.PDXStanceSides.countLine(0), "0 positions on file", "…and says so as a length, not a ratio");
}

// ── 8 · the formal record is whatever the archive already emits ─────────────
{
  section("8 · the formal record is the archive's own count, pinned rather than invented");

  const WF = makeSandbox();
  const ctxf = vm.createContext(WF);
  for (const f of ["cmp-data.js", "formal-index.js", "issue-map.js", "stance-sides.js",
                   "politician-stances-core.js", "politician-stances-ext.js",
                   "state-senate-stances.js", "stance-helpers.js", "say-vs-do.js",
                   "publication-floor.js", "word-action.js", "consistency.js"]) {
    try { vm.runInContext(R(f), ctxf, { filename: f }); } catch (e) {}
  }
  must(WF.PDXFormalIndex, "formal-index.js did not install PDXFormalIndex");
  const acts = WF.PDXFormalIndex.acts(PID);
  const measures = WF.PDXFormalIndex.measures(PID);
  console.log(`   formal record · ${acts} sourced acts over ${measures} distinct measures · ` +
    `${(WF.PDXFormalIndex.SESSIONS_ON_FILE || []).join(", ")}`);

  // THE COUNTS THE ARCHIVE EMITS TODAY, pinned so a thinning of the store shows
  // up here rather than as a quietly shorter sentence on the file. If the store
  // ever goes to zero this asserts the empty-file sentence instead of a number.
  if (acts > 0) {
    eq(acts, 75, "the Utah store holds 75 sourced acts for this seat");
    eq(measures, 67, "…over 67 distinct measures");
    eq(WF.PDXFormalIndex.has(PID), true, "…so the file is not an empty one");
    eq(WF.PDXFormalIndex.emptyNote(PID), null,
      "…and carries no reviewed empty-file note, because it is not empty");
  } else {
    const note = WF.PDXFormalIndex.emptyNote(PID);
    ok(!!note, "an emptied store prints the reviewed empty-file sentence, not a fake number");
    ok(!/\d/.test(String(note)), "…and that sentence claims no count");
  }
  eq((WF.PDXFormalIndex.SESSIONS_ON_FILE || []).join(","), "2023GS,2024GS,2025GS",
    "three Utah general sessions are on file");

  // THE PUBLICATION FLOOR READS THE SAME STORE and clears on that record. The
  // point of pinning it is that nothing about the money pass moved it.
  const fl = WF.PDXPublicationFloor.read(PID);
  eq(fl.formal, measures, "the publication floor counts the same measures the index does");
  eq(fl.cited, 9, "…and nine cited positions");
  eq(fl.promises, 0, "…and no pledges, because none are on file for this seat");
  eq(fl.publishable, true, "…and the file clears the floor on its record alone");

  // WORD VS ACTION IS PENDING, NOT ZERO. No roll-call record is loaded on a
  // state file, so the engine has no percentage — and it says pending rather
  // than printing a 0% that would read as a finding.
  const wa = WF.PDXWordAction.read(PID, ROSTER[PID]);
  eq(wa.pct, null, "Word vs Action has no percentage on this file");
  eq(wa.token, "pending", "…and reports itself pending rather than scored");
  eq(wa.publishable, false, "…and below its own publication floor");
  eq(wa.counts.consistent + wa.counts.contradicts + wa.counts.mixed + wa.counts.limited, 0,
    "…with nothing tested either way");
  // THE PATTERN INDEX IS EMPTY AND SAYS SO WITH A LENGTH.
  eq(WF.PDXConsistency.formalPatternIndex.count(PID), 0,
    "the formal pattern index holds no tier rows for this file");
  eq((WF.PDXConsistency.formalPatternIndex.rows(PID) || []).length, 0,
    "…and hands back an empty list rather than a hand-written row");
  // NO HAND-WRITTEN VERDICT PHRASES ANYWHERE ON HIS RECORD ITEMS. Every item is
  // an existing evidence object out of the shipped store, with its own sources.
  const items = wa.items || [];
  ok(items.length > 0, `the record lane has items to show (${items.length})`);
  for (const it of items) {
    ok(!/strongly (support|oppose)s/i.test(String(it.text || "")),
      `no hand-written "strongly supports" row (${it.id})`);
    if (it.tier === "position" && it.text) {
      ok(Array.isArray(it.sources) && it.sources.length > 0,
        `${it.id} carries its own source rather than an assertion`);
      for (const s of it.sources) {
        ok(/^https:\/\//.test(String(s.url || "")), `${it.id}'s source is a real URL`);
      }
    }
  }
  const empties = items.filter((i) => !i.sources || !i.sources.length);
  for (const e of empties) {
    eq(String(e.text || ""), "", `${e.id} has no evidence, so it makes no claim either`);
  }
}

// ── 9 · twin boot ───────────────────────────────────────────────────────────
{
  section("9 · rendering his money surfaces moves no record read, and leaks no global");

  const FILES = [
    "cmp-data.js", "formal-index.js", "politician-stances-core.js", "politician-stances-ext.js",
    "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
    "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
    "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
    "publication-floor.js", "profile-spine.js", "profiles-full.js",
  ];
  const SRC = FILES.map((f) => [f, R(f)]);
  const { byMember } = buildCorpus(ROOT);
  const ranked = [...byMember.entries()].sort((a, b) => b[1].length - a[1].length);
  const [DEEP, items] = ranked[0];
  must(items.length > 40, `the deepest corpus member is too thin (${DEEP}: ${items.length})`);
  // THE CORPUS IS FEDERAL-ONLY, so this file's subject is not in it. That is why
  // the twin boot reads a DEEP member's record while rendering JOHNSON's money
  // surfaces: the question is whether his file can move somebody's verdict, and
  // a subject with no roll-call record could not answer it either way.
  ok(!byMember.has(PID), "the roll-call corpus is federal, so this seat has no rows in it");

  const snapshot = (renderJohnson) => {
    const win = makeSandbox();
    const ctx = vm.createContext(win);
    const queue = [];
    win.setTimeout = (fn) => { queue.push(fn); return queue.length; };
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
    vm.runInContext(FTM_SRC, ctx, { filename: "ftm-data.js" });
    const before = Object.keys(win).sort().join(",");

    let rendered = 0;
    if (renderJohnson) {
      for (const round of [0, 1]) {
        rendered += String(win.PDXFinanceLane.letterheadChipMount(PID) || "").length ? 1 : 0;
        rendered += String(win.PDXFinanceLane.wealthLetterheadChipMount(PID, win.CMP_DATA[PID]) || "").length ? 1 : 0;
        rendered += String(win.PDXFinanceLane.wealthBlockHtml(PID, win.CMP_DATA[PID]) || "").length ? 1 : 0;
        rendered += String(win._pdxFundingSection(PID, win.CMP_DATA[PID]) || "").length ? 1 : 0;
        drain();
      }
    }
    const after = Object.keys(win).sort().join(",");

    const out = [];
    win.PDXVotingRecord.noteMember(DEEP, items);
    if (renderJohnson) {
      win.PDXFinanceLane.letterheadChipMount(PID);
      win.PDXFinanceLane.wealthLetterheadChipMount(PID, win.CMP_DATA[PID]);
      win._pdxFundingSection(PID, win.CMP_DATA[PID]);
      drain();
    }
    // BOTH SUBJECTS, because a leak could land on either: the deep federal
    // member whose record is loaded, and Johnson's own thin state file.
    for (const pid of [DEEP, PID]) {
      const wa = win.PDXWordAction.read(pid, win.CMP_DATA[pid]);
      out.push(["dm", pid, wa && wa.pct, wa && wa.token, wa && wa.verdict && wa.verdict.key,
        wa && wa.publishable, JSON.stringify((wa && wa.counts) || null),
        JSON.stringify((wa && wa.tiers) || null), JSON.stringify((wa && wa.floors) || null),
        JSON.stringify((wa && wa.coverage) || null)].join("|"));
      const rows = (win.PDXConsistency.formalPatternIndex.rows(pid) || []).map((r) =>
        [r.key, r.tier, r.token, r.n, r.adv, r.opp, r.confidence].join(":"));
      out.push(["tiers", pid, rows.length,
        win.PDXConsistency.formalPatternIndex.count(pid), rows.join(",")].join("|"));
      const fl = win.PDXPublicationFloor.read(pid);
      out.push(["floor", pid, fl.publishable, fl.cited, fl.promises, fl.formal,
        (fl.reasons || []).join(";")].join("|"));
      out.push(["mapped", pid, JSON.stringify(win._pdxRecordMappedCounts(pid) || null)].join("|"));
      out.push(["formal", pid, win.PDXFormalIndex.acts(pid), win.PDXFormalIndex.measures(pid),
        JSON.stringify(win.PDXFormalIndex.emptyNote(pid))].join("|"));
    }
    return { snap: out.join("\n"), rendered, leaked: before === after ? "" : "yes" };
  };

  const off = snapshot(false);
  const on = snapshot(true);
  ok(off.snap.length > 300, `the record snapshot has something in it (${off.snap.length} chars)`);
  eq(on.rendered, 8, "the rendering boot rendered his four money surfaces, twice");
  eq(off.rendered, 0, "…and the other boot rendered none of them");
  eq(on.snap, off.snap,
    "Direction Match, the formal pattern index, the publication floor, the mapped counts and " +
    "the formal index are identical with his money surfaces rendered and with none of them");
  eq(on.leaked, "", "rendering his file installed no new global on the window");
  console.log(`   twin boot · ${DEEP} (${items.length} roll calls) + ${PID} · ` +
    `${off.snap.length}-char snapshot identical either way`);
}

// ── 10 · NEVER_FEEDS and the two load constraints ───────────────────────────
{
  section("10 · the money modules still declare what they may not write, and stay off two pages");

  for (const [name, mod] of [["PDXFinance", W.PDXFinance], ["PDXFinanceLane", W.PDXFinanceLane]]) {
    const never = mod.NEVER_FEEDS || [];
    ok(never.length > 0, `${name} publishes a NEVER_FEEDS list`);
    for (const k of ["directionMatch", "wordVsAction", "formalPatternTier", "publicationFloor"]) {
      ok(never.indexOf(k) >= 0, `…and it still names ${k}`);
    }
    eq(mod.scored, false, `…and ${name} still declares scored: false`);
  }
  // THE SHIPPED GLOBALS THE MONEY MODULES MUST NOT HAVE WRITTEN. Booted alone,
  // with no record module in the box at all, so anything present came from them.
  const solo = box();
  for (const g of ["PDXWordAction", "PDXConsistency", "PDXPublicationFloor",
                   "_pdxRecordMappedCounts", "PDXFormalIndex"]) {
    eq(typeof solo[g], "undefined", `the money modules did not install ${g}`);
  }

  // /money IS AN ESTIMATE BOARD WITH A SORT ON IT. A filed-document claim
  // rendered beside one would read as the same kind of fact.
  const MON = R("money.html");
  lacks(MON, 'src="/pdx-finance.js"', "money.html does not load pdx-finance.js");
  lacks(MON, "PDX_FD_DOCUMENTS", "…nor reach for the document index");
  // AND person.html CARRIES NO HOMEPAGE LOCATION MODULE just to print tenure.
  // NAMED IN A DENYLIST COMMENT IS NOT THE SAME AS LOADED, so the check is the
  // script tag, not the string — person.html explains at length which homepage
  // modules it refuses, and both of these are on that list by name.
  const PER = R("person.html");
  ok(!/<script[^>]+voter-hub-location\.js/.test(PER),
    "person.html loads no voter-hub-location.js script tag");
  ok(!/<script[^>]+alignment-tool\.js/.test(PER),
    "…and still denylists the alignment engine");
  ok(/<script[^>]+issue-map\.js/.test(PER),
    "…while carrying the issue register the shared readers need");
  // WEALTH_DATA IS NOT READ INTO THIS FILE. It is the estimate board's table.
  for (const f of ["finance-lane.js", "pdx-finance.js", "profiles-full.js"]) {
    lacks(R(f), "WEALTH_DATA", `${f} does not read WEALTH_DATA`);
  }
}

// ── 11 · the shell and the written record ───────────────────────────────────
{
  section("11 · the shell moved one version and the doctrine is written down");

  const SW = R("sw.js");
  const ver = (SW.match(/const CACHE_VERSION = '(v\d+)'/) || [])[1];
  must(ver, "sw.js no longer declares a CACHE_VERSION in the form this file reads");
  ok(Number(ver.slice(1)) >= 225,
    `CACHE_VERSION is ${ver} — finance-lane.js and profiles-full.js both changed and a warm ` +
    `device would serve the old empty-disclosure copy and the old dead button`);
  const entryAt = SW.indexOf(`// ${ver} - `);
  ok(entryAt > 0, `the changelog carries an entry for ${ver}`);
  const nextHead = SW.slice(entryAt + 1).match(/\n\/\/ v\d+ - /);
  const constAt = SW.indexOf("const CACHE_VERSION");
  const entry = SW.slice(entryAt, Math.min(nextHead ? entryAt + 1 + nextHead.index : constAt, constAt));
  ok(entry.split("\n").length <= 48,
    `the ${ver} entry stays inside the changelog budget (${entry.split("\n").length} lines)`);
  // THE CLAIMS ARE READ OUT OF v225 — THE PASS THAT PINNED THIS FILE — NOT OUT OF
  // WHATEVER IS LIVE. An earlier draft asked the newest entry to name Johnson and
  // to say that no document row, no dollar row and none of the four stores moved.
  // A bump renames both cache buckets, so every later pass bumps too, and a pass
  // that moved something else entirely owes no sentence about this file; the draft
  // therefore passed while v225 was live and failed on the next unrelated bump.
  // The log is append-only and its entries are immutable, so the pin is the
  // version that made the claim. The live version is still checked as a floor
  // above, and the live entry is still held to the changelog budget.
  const PIN = "v225";
  const pinAt = SW.indexOf(`// ${PIN} - `);
  ok(pinAt > 0, `the changelog still carries the ${PIN} entry — the one that pinned this file`);
  const pinNext = SW.slice(pinAt + 1).match(/\n\/\/ v\d+ - /);
  const pinned = SW.slice(pinAt, pinNext ? pinAt + 1 + pinNext.index : constAt);
  const low = pinned.toLowerCase();
  has(low, "johnson", `the ${PIN} entry names the file that pass pinned`);
  has(low, "no document row", "…and says no document row was added");
  has(low, "no dollar row", "…nor a dollar row");
  for (const store of ["location", "district", "team", "stance"]) {
    has(low, store, `…and that the ${store} store is untouched`);
  }

  const FI = R("FINANCE_INTEGRITY.md");
  has(FI, "SD-3", "FINANCE_INTEGRITY.md records the SD-3 proof");
  has(FI, "empty-document proof", "…and calls it the empty-document proof for the Utah COI");
  has(FI, "no member URL", "…because the archive answers no member document");
}

// ── report ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  for (const f of failures) console.log(`   ✗ ${f}`);
  console.log(`\n✗ johnson file: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ johnson file: all ${passed} assertions passed`);
console.log("   one Johnson · one seat · two empty pills · 75 acts on file · no row invented");
