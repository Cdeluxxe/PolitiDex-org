#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-finance-lane.mjs — the money lane reports a composition, and the grade it
// used to publish is gone
// ─────────────────────────────────────────────────────────────────────────────
// Campaign finance was already on the site, but not as a lane: it arrived as a
// 0–100 "Constituents-First signal" with a coloured tile, three graded levels
// (Constituents-First / Mixed Funding / Special-Interest Heavy) and a "Why this
// score" list of ±point badges. Next to ⚖️ Word vs Action's percentage and Your
// Match's percentage that was a third match % about a person — and unlike those
// two it rested on no formal record and cleared no publication floor. Worse, the
// coverage: itemized filings exist for 13 of the 757 people the site carries, so
// a red badge was a verdict built from data the site does not have, and the 744
// with no badge could not tell "checked and clear" from "never checked".
//
// The score is retired and finance-lane.js publishes composition instead. This
// file is the fence around that decision:
//
//   1. NO SCORE, ANYWHERE, IN ANY SHAPE. The read carries no `score`, `level`,
//      `label`, `color` or `reasons`; the rendered block has no /100, no tile and
//      no "Why this score"; no threshold in the module reads a share.
//   2. THE ARITHMETIC IS DELETED, NOT DORMANT. index.html no longer contains the
//      50-base, the ±bonus table, the 3..97 clamp or the level cut-offs. A retired
//      grade with a live accessor is how a retired grade comes back.
//   3. THE PALETTE DOES NOT GRADE EITHER. This codebase's yes/no colours (#4ade80,
//      #f87171) do not appear in the lane, in the recap, or in the Money Tree's
//      bucket palette. Green-for-grassroots beside red-for-PAC delivers the verdict
//      after the words stop.
//   4. COVERAGE IS DISCLOSED, EVERY TIME, IN WORDS. Both counts, plus the explicit
//      statement that a missing filing is missing DATA. Equal in honesty to the
//      Direction Match floors.
//   5. IT RENDERS IN BOTH STATES. The absent state is a sentence about the data. It
//      is never a sentence about the person.
//   6. NO MOTIVE LANGUAGE. A filing shows where money came from. It does not show
//      why anyone voted for anything.
//   7. THE WALL HOLDS. Statically: Direction Match, the publication floor and the
//      record lane do not name the finance lane at all. At runtime: seeding a full
//      filing changes no Direction Match figure, no formal pattern tier, no count
//      and no floor.
//
//   node scripts/test-finance-lane.mjs
//
// Real shipped modules in a node:vm sandbox, and the REAL FTM_FUNDING seed lifted
// out of index.html, so what is composed here is what a browser composes.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const INDEX = R("index.html");
const LANE_SRC = R("finance-lane.js");

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
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ finance-lane: ${msg}`);
  process.exit(1);
};

// ── The real seed, lifted out of index.html ─────────────────────────────────
// The funding buckets live in an inline script. Reading them here rather than
// re-typing them is the whole point: a fixture would pass while the shipped data
// broke. `new Function` over the literal only — no page script is executed.
function liftSeed() {
  const at = INDEX.indexOf("var FTM_FUNDING = {");
  must(at > 0, "FTM_FUNDING is no longer in index.html");
  const end = INDEX.indexOf("\n    };", at);
  must(end > at, "could not find the end of the FTM_FUNDING literal");
  const literal = INDEX.slice(at + "var FTM_FUNDING = ".length, end + "\n    }".length);
  return new Function("return (" + literal + ");")();
}
const SEED = liftSeed();
const SEED_IDS = Object.keys(SEED);
must(SEED_IDS.length >= 10, `the funding seed is unexpectedly small (${SEED_IDS.length})`);
const AS_OF = (INDEX.match(/var FTM_AS_OF = '([^']*)'/) || [])[1] || "";

// A sandbox with the lane loaded and the real seed indexed the way index.html
// indexes it, so read()/entryHtml() resolve exactly as they do in a browser.
function laneBox(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win._FTM_BY_ID = {};
  if (!opts.empty) {
    for (const id of SEED_IDS) win._FTM_BY_ID[id] = { id, name: id, funding: SEED[id] };
  }
  win.FTM_AS_OF = AS_OF;
  vm.runInContext(LANE_SRC, ctx, { filename: "finance-lane.js" });
  must(win.PDXFinanceLane, "finance-lane.js did not install PDXFinanceLane");
  return win;
}
const L = laneBox().PDXFinanceLane;

// ── 1 · the read carries no grade ───────────────────────────────────────────
{
  section("1 · no score, no level, no graded label, in any shape");

  eq(L.scored, false, "the lane declares itself unscored");
  const GONE = ["score", "level", "label", "color", "reasons", "grade", "rating", "rank"];
  for (const id of SEED_IDS) {
    const c = L.read(id);
    ok(c, `${id}: composes from the shipped seed`);
    if (!c) continue;
    for (const k of GONE) {
      ok(!(k in c), `${id}: the read carries no \`${k}\` field`);
    }
    eq(c.scored, false, `${id}: the read says so on itself`);
  }

  // No number in this module stands for the whole person.
  const c = L.read(SEED_IDS[0]);
  eq(typeof c.receipts, "number", "receipts is a dollar total, which is a fact about a filing");
  const sum = c.rows.reduce((n, r) => n + r.amount, 0);
  eq(sum, c.receipts, "the rows account for every dollar in the base");
  const shareSum = c.rows.reduce((n, r) => n + r.share, 0);
  ok(Math.abs(shareSum - 100) <= 2,
    `the shares are shares OF that base (${shareSum}% across ${c.rows.length} rows)`);
  ok(c.rows.every((r) => r.amount > 0), "a zero bucket is omitted, not drawn as an empty bar");
  const desc = c.rows.every((r, i) => i === 0 || c.rows[i - 1].amount >= r.amount);
  ok(desc, "rows are sorted by dollars, largest first");
  eq(c.largest.key, c.rows[0].key, "`largest` is the head of that sorted list and nothing more");

  // NO THRESHOLD READS A SHARE. The retired score's cut-offs (65 / 45) and its
  // clamp (3 / 97) are the exact literals that must not be back. Comments are
  // stripped first — the header explains the retirement and has to be able to
  // quote what it retired.
  const body = LANE_SRC.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, " ");
  for (const lit of [">= 65", ">= 45", "< 45", "* 50", "* 30", "* 20",
    "score =", ".score", "level =", "clamp"]) {
    lacks(body, lit, `the lane's code carries no \`${lit}\``);
  }
}

// ── 2 · the arithmetic is deleted from index.html, not dormant ───────────────
{
  section("2 · the retired score's arithmetic is gone from index.html");

  // The exact lines the old _financeSignal was made of.
  const DEAD = [
    "var reasons = [], score = 50",
    "if (score < 3) score = 3",
    "if (score > 97) score = 97",
    "label = 'Constituents-First'",
    "label = 'Mixed Funding'",
    "label = 'Special-Interest Heavy'",
    "Why this score",
    "'/100'",
    "darkMap",
    "_finPct",
    "_finTitleCase",
    "_finBar(",
    "_finStack(",
  ];
  // Comments stripped: the block that replaced the arithmetic documents what it
  // replaced, and has to be able to name it.
  const CODE = INDEX.replace(/<!--[\s\S]*?-->/g, " ").replace(/^\s*\/\/[^\n]*$/gm, " ");
  for (const d of DEAD) lacks(CODE, d, `index.html no longer contains ${d}`);

  // …and the one accessor everything went through now delegates to the lane.
  has(INDEX, "function _financeSignal(p) {", "the accessor is still there for its callers");
  has(INDEX, "return L.compose(p, { asOf: FTM_AS_OF });",
    "…and it delegates to the single composition read");
  has(INDEX, '<script defer src="/finance-lane.js"></script>', "the lane is shipped");

  // No user-visible string anywhere still grades anyone. Comments are exempt on
  // purpose — they are how the retirement stays explained — so this strips them.
  const noComments = INDEX
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/^\s*\/\/[^\n]*$/gm, " ");
  for (const bad of ["Constituents-First signal is scored", "65–100 Constituents-First",
    "45–64 Mixed Funding", "Below 45 Special-Interest Heavy"]) {
    lacks(noComments, bad, `no shipped markup still says "${bad}"`);
  }

  // The consumers that used to read the removed fields.
  for (const f of ["impact-ledger.js", "my-profile.js", "profiles-full.js"]) {
    const src = R(f).replace(/\/\*[\s\S]*?\*\/|^\s*\/\/[^\n]*$/gm, " ");
    lacks(src, "sig.score", `${f} does not read a finance score`);
    lacks(src, "sig.level", `${f} does not read a finance level`);
    ok(!/sig\.color/.test(src), `${f} does not read a finance verdict colour`);
  }
}

// ── 3 · the palette does not grade either ───────────────────────────────────
{
  section("3 · no yes/no colours in the money lane");

  // #4ade80 (this codebase's green) and #f87171 (its red) are the two colours that
  // carry a verdict on sight. Neither may appear in the lane or its consumers'
  // finance code.
  const YES_NO = ["#4ade80", "#f87171", "#86efac", "#fca5a5"];
  const LANE_CODE = LANE_SRC.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, " ");
  for (const hex of YES_NO) lacks(LANE_CODE, hex, `finance-lane.js does not use ${hex}`);
  for (const hex of Object.values(L.COLORS)) {
    ok(YES_NO.indexOf(hex.toLowerCase()) < 0, `bucket colour ${hex} is not a verdict colour`);
  }
  // THIS ASSERTION IS THE REVERSE OF THE ONE IT REPLACES, DELIBERATELY.
  // It used to read `eq(new Set(hexes).size, hexes.length, "every bucket is a
  // distinguishable colour")` — five buckets, five hues, categorical and ranking
  // nothing. The money theme retires that. Two reasons, and the second is the one
  // that mattered: `selfFunded` was #ffb86c, an amber whose meaning was a
  // donor-mix category, which is the banned channel however carefully the legend
  // is worded; and the lane now has ONE pair, so a five-hue bar sitting under a
  // green-and-gold chip and a green-and-gold header contradicted both of them.
  // Buckets are now distinguished by their label and their dollar figure, and the
  // composition is drawn as one gold-on-slate bar per bucket, so the share is
  // carried by length. Reversing it back would need a reason written down here.
  const hexes = Object.values(L.COLORS).map((h) => h.toLowerCase());
  eq(new Set(hexes).size, 1, "every bucket is the same colour — the money gold");
  eq(hexes[0], "#c9992f", "…and that colour is the money token's gold outline");
  // The stacked bar is gone with the palette. It always filled 100% (the buckets
  // sum to `receipts` by construction), so it measured nothing while looking like
  // a measurement.
  lacks(LANE_CODE, "overflow:hidden;margin-bottom:0.5rem;background:rgba(10,15,30,0.6)",
    "the five-segment stacked composition bar is gone");
  {
    const comp = L.compositionHtml(L.read(SEED_IDS[0]));
    const track = (comp.match(/background:#3d4f66/g) || []).length;
    const fill = (comp.match(/background:#c9992f/g) || []).length;
    ok(track >= 2, `each bucket row draws its own slate track (saw ${track})`);
    eq(fill, track, "…and exactly one gold fill per slate track");
    lacks(comp, "#fb923c",
      "the outside-spending eyebrow no longer reports a level in orange");
  }

  const MP = R("my-profile.js");
  const mixBlock = MP.slice(MP.indexOf("var MIX = ["), MP.indexOf("function group3"));
  for (const hex of YES_NO) lacks(mixBlock, hex, `the Money Tree palette does not use ${hex}`);
  // This used to assert `has(mixBlock, "LANE_COLORS")` — the Money Tree borrowed
  // finance-lane.js's five hues so one bucket was never two colours on two
  // surfaces. It now declares no colours at all: the lane's palette is a single
  // gold, and reading five identical values out of it to paint five bars the same
  // colour would only look like a distinction. The stronger guarantee is the one
  // asserted here instead — the Money Tree names no hex.
  lacks(mixBlock, "#", "the Money Tree declares no colour of its own, in any hex");
  lacks(MP, "LANE_COLORS = ", "…and no longer keeps a local copy of the lane's palette");
  {
    const MPC0 = R("my-profile.css");
    has(MPC0, "--pdx-money-line", "the Money Tree's bars take their gold from the money token");
    has(MPC0, "--pdx-money-rest", "…and their track from the money token's slate");
    lacks(MPC0, ".mp-mix-seg", "the stacked segment class is gone with the stack");
    lacks(MPC0, ".mp-mix-dot", "…and so is the colour-key legend dot");
  }
  const MPC = R("my-profile.css");
  lacks(MPC, ".mp-lean.is-grass { color: #86efac",
    "the funding-mix badge is no longer green for one answer and amber for another");
  lacks(R("impact-ledger.js"), "background:#4ade80",
    "the recap's small-dollar bar is no longer green");

  // The retired label badge took its inline verdict colour with it.
  lacks(MP, "esc(sig.label)", "my-profile no longer prints a graded finance label");
  has(MP, "Largest reported source", "…it prints the largest reported source instead");
}

// ── 4 · coverage, disclosed in words, every time ─────────────────────────────
{
  section("4 · coverage disclosure as honest as the Direction Match floors");

  const cov = L.coverage();
  eq(cov.onFile, SEED_IDS.length, "the on-file count is read off the index, not hard-coded");
  const box = laneBox();
  box.CMP_DATA = {};
  for (let i = 0; i < 757; i++) box.CMP_DATA["p" + i] = { name: "p" + i };
  const cov2 = box.PDXFinanceLane.coverage();
  eq(cov2.roster, 757, "the roster count is read off CMP_DATA, not hard-coded");
  eq(cov2.thin, true, `13 of 757 is disclosed as thin coverage`);
  has(cov2.sentence, String(cov2.onFile), "the sentence quotes the numerator");
  has(cov2.sentence, "757", "…and the denominator");
  has(cov2.sentence, "missing data", "…and says a blank is missing data");
  ok(/not a finding about the person/.test(cov2.sentence),
    "…and says explicitly that it is not a finding about the person");

  // The disclosure is attached to the read, so a surface cannot render the
  // composition and forget the coverage.
  const c = box.PDXFinanceLane.read(SEED_IDS[0]);
  ok(c.coverage && c.coverage.sentence === cov2.sentence,
    "every composition read carries the disclosure with it");
  has(visible(box.PDXFinanceLane.coverageHtml()), "missing data",
    "the standalone disclosure renders the same sentence");

  // A thin lane still discloses when the roster is unknown, rather than going quiet.
  const blind = laneBox();
  blind.CMP_DATA = null; blind.PROFILES = null;
  const cb = blind.PDXFinanceLane.coverage();
  eq(cb.thin, true, "an unknown roster is thin, not clear");
  has(cb.sentence, "not a finding", "…and still says a blank is not a finding");
}

// ── 5 · both states render, and the absent one is about the data ────────────
{
  section("5 · on file and not on file both render");

  const onFile = L.entryHtml(SEED_IDS[0]);
  ok(onFile.length > 100, "the on-file entry row renders");
  has(visible(onFile), "Campaign finance", "…labelled as the finance lane");
  has(onFile, 'href="#follow-the-money"', "…and it is the door into the full breakdown");
  has(visible(onFile), "Largest reported source", "…naming the largest reported source");
  ok(/\$\d/.test(visible(onFile)), "…in dollars");

  const off = L.entryHtml("nobody_has_this_id");
  ok(off.length > 100, "the NOT-on-file entry row renders too — a blank is not an answer");
  has(visible(off), "No money file on hand", "…and says so plainly");
  has(visible(off), "missing data", "…and says that is missing data");
  // AND IT NAMES THE ARCHIVE. An absence with no named cause is the one a reader
  // fills in themselves, so the empty lane says which disclosure system the filing
  // would have come from — and says "none opened" where PolitiDex has none, rather
  // than pointing at an archive it has not looked in.
  has(visible(off), "Source gap", "…and names the source gap in one line");
  {
    const gapBox = makeSandbox();
    const gctx = vm.createContext(gapBox);
    gapBox.CMP_DATA = {
      fed_person:   { name: "Fed", office: "U.S. Representative", state: "Maine" },
      utah_person:  { name: "Utah", office: "State Attorney General", state: "Utah" },
      other_person: { name: "Other", office: "Lieutenant Governor", state: "Michigan" }
    };
    vm.runInContext(LANE_SRC, gctx, { filename: "finance-lane.js" });
    const G = gapBox.PDXFinanceLane;
    eq(G.sourceGap("fed_person").authority, "FEC",
      "a federal office's missing filing points at the FEC");
    eq(G.sourceGap("utah_person").authority, "Utah state disclosures",
      "a Utah state office's points at Utah's disclosure system");
    eq(G.sourceGap("other_person").authority, "none opened",
      "an office with no source open says exactly that, and names no archive");
    eq(G.sourceGap("other_person").url, "",
      "…and links nowhere, because there is nowhere honest to link");
    // No filing, donor, committee or figure is conjured by any branch.
    for (const pid of ["fed_person", "utah_person", "other_person"]) {
      const line = G.sourceGap(pid).line;
      ok(!/\$\d/.test(line), `${pid}: the source-gap line invents no dollar figure`);
      eq(G.chipRead(pid).state, "empty", `${pid}: naming the gap does not conjure a file`);
      for (const bad of ["clean", "nothing to report", "no concerns"]) {
        lacks(line.toLowerCase(), bad, `${pid}: the source-gap line does not say "${bad}"`);
      }
    }
  }
  const offWords = visible(off).toLowerCase();
  for (const bad of ["clean", "clear", "nothing to report", "no concerns", "good", "bad",
    "special-interest", "constituents-first", "score", "grade"]) {
    lacks(offWords, bad, `the absent state does not say "${bad}"`);
  }

  // The profile section that mounts it renders in both states now.
  const PF = R("profiles-full.js");
  has(PF, "L.entryHtml(id, p)", "the profile money section mounts the entry row");
  has(PF, "if (!finSig) {", "…and has a branch for no filing at all");
  ok(PF.indexOf("if (!entry) return ''") > PF.indexOf("if (!finSig) {"),
    "…returning nothing only when even the row could not be built");
}

// ── 6 · no motive language ──────────────────────────────────────────────────
{
  section("6 · a filing says where money came from, not why anyone voted");

  const MOTIVE = ["bought", "buying", "bribe", "bribed", "beholden", "in the pocket",
    "owned by", "paid for by their", "corrupt", "kickback", "quid pro quo",
    "because they were paid", "sold out", "captured by", "puppet", "bankrolled to vote"];
  const surfaces = [
    ["composition block", L.compositionHtml(L.read(SEED_IDS[0]))],
    ["entry row, on file", L.entryHtml(SEED_IDS[0])],
    ["entry row, absent", L.entryHtml("nobody")],
    ["coverage note", L.coverageHtml()],
  ];
  for (const [name, html] of surfaces) {
    const words = visible(html).toLowerCase();
    for (const m of MOTIVE) lacks(words, m, `${name} carries no motive language ("${m}")`);
    lacks(words, "/100", `${name} carries no out-of-100 figure`);
    lacks(words, "why this score", `${name} carries no "why this score" list`);
  }

  const block = L.compositionHtml(L.read(SEED_IDS[0]));
  has(visible(block), "Composition as filed", "the block says what it is");
  has(visible(block), "not a score", "…and what it is not");
  has(visible(block), "Verify at source", "…and where to check it");
  has(visible(block), "Reported receipts, by source", "…and reports the buckets as filed");

  // Outside spending: a level word and never an invented dollar figure.
  const withOutside = SEED_IDS.map((id) => L.read(id)).find((c) => c && c.outside);
  ok(withOutside, "the seed carries at least one filing with outside spending");
  if (withOutside) {
    const oh = visible(L.compositionHtml(withOutside)).toLowerCase();
    has(oh, "outside spending", "outside spending is reported");
    has(oh, "not itemized to the candidate", "…with the reason there is no dollar figure for it");
    ok(!/outside[^.]{0,40}\$\d/.test(oh), "…and no dollar figure is invented for it");
  }
}

// ── 7 · the wall ────────────────────────────────────────────────────────────
{
  section("7 · finance is not an input to Direction Match, a tier, a floor or a count");

  for (const k of ["directionMatch", "wordVsAction", "formalPatternTier",
    "publicationFloor", "formalActCounts", "ballotSort", "yourMatch"]) {
    ok((L.NEVER_FEEDS || []).indexOf(k) >= 0, `NEVER_FEEDS names ${k}`);
  }

  // STATIC: the engines do not know the lane exists.
  // Campaign-finance IDENTIFIERS only. Neither "funding" nor "campaign-finance"
  // on its own qualifies: consistency.js's curated prose describes
  // government-funding bills and the campaign-money titles inside H.R. 1, which
  // is legislation being described, not a donation being read.
  const FIN = /PDXFinanceLane|_pdxFinance|_financeSignal|smallDollar|selfFunded|largeIndividual/;
  for (const f of ["word-action.js", "publication-floor.js", "voting-record.js",
    "stance-helpers.js", "consistency.js"]) {
    const src = R(f);
    ok(!FIN.test(src), `${f} does not name the finance lane or any funding bucket`);
  }

  // RUNTIME: seed a full filing and every record figure is byte-identical.
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

  const snapshot = (withFinance) => {
    const win = makeSandbox();
    const ctx = vm.createContext(win);
    win.PROFILES = win.CMP_DATA;
    for (const [f, src] of SRC) vm.runInContext(src, ctx, { filename: f });
    win.PROFILES = win.CMP_DATA;
    if (withFinance) {
      // Everything a browser has: the index, the lane, and the accessor every
      // finance surface calls.
      win._FTM_BY_ID = {};
      for (const id of SEED_IDS) win._FTM_BY_ID[id] = { id, name: id, funding: SEED[id] };
      // …including one for the member under test, which is the strongest form of
      // the question: does a filing on THIS person move THIS person's record read?
      win._FTM_BY_ID[PID] = { id: PID, name: PID, funding: SEED[SEED_IDS[0]] };
      win.FTM_AS_OF = AS_OF;
      vm.runInContext(LANE_SRC, ctx, { filename: "finance-lane.js" });
      win._pdxFinanceSignal = (pid) => win.PDXFinanceLane.read(pid);
      must(win._pdxFinanceSignal(PID), "the finance seed did not attach to the test member");
    }
    win.PDXVotingRecord.noteMember(PID, items);
    const out = [];
    const wa = win.PDXWordAction.read(PID, win.CMP_DATA[PID]);
    out.push(["dm", wa && wa.pct, wa && wa.token, wa && wa.verdict, wa && wa.publishable,
      JSON.stringify((wa && wa.counts) || null), JSON.stringify((wa && wa.tiers) || null),
      JSON.stringify((wa && wa.floors) || null), JSON.stringify((wa && wa.coverage) || null)].join("|"));
    const rows = (win.PDXConsistency.formalPatternIndex.rows(PID) || []).map((r) =>
      [r.key, r.tier, r.token, r.n, r.adv, r.opp, r.confidence].join(":"));
    out.push(["tiers", rows.length, rows.join(",")].join("|"));
    const fl = win.PDXPublicationFloor.read(PID);
    out.push(["floor", fl.publishable, fl.cited, fl.promises, (fl.reasons || []).join(";")].join("|"));
    out.push(["mapped", JSON.stringify(win._pdxRecordMappedCounts(PID) || null)].join("|"));
    return out.join("\n");
  };
  const without = snapshot(false);
  const withF = snapshot(true);
  ok(without.length > 300, `the record snapshot has something in it (${without.length} chars)`);
  eq(withF, without,
    "Direction Match, the tiers, the publication floor and the mapped counts are identical " +
    "with a full filing on file and with none");
}

// ── 8 · the letterhead chip is a door, not a second money section ────────────
{
  section("8 · the compact money chip on the person letterhead");

  const box = laneBox();
  box.CMP_DATA = {};
  for (let i = 0; i < 757; i++) box.CMP_DATA["p" + i] = { name: "p" + i };
  // A file that exists but carries no itemized composition — the partial state.
  box._FTM_BY_ID.partial_person = {
    id: "partial_person", name: "Partial", totalRaised: 420000,
    topDonors: [{ name: "A", amount: 2 }, { name: "B", amount: 1 }],
    sectors: { Finance: 2, Energy: 1 },
  };
  const CL = box.PDXFinanceLane;

  // THE TARGET IS THIS PAGE. The chip's whole point is that it does not navigate
  // off the person file, so the id it jumps to is the money section's own anchor
  // on the profile — never the site-level #follow-the-money index.
  eq(CL.SECTION_ID, "pdxsec-funding", "the chip targets the money section on this person file");
  has(R("index.html"), `id="${CL.SECTION_ID}"`, "…and that anchor is emitted by the money section");
  const PFF = R("profiles-full.js");
  has(PFF, "PDXFinanceLane.letterheadChipMount(id)",
    "the letterhead mounts the chip");
  ok(PFF.indexOf("letterheadChipMount(id)") < PFF.indexOf('<span class="profile-party">'),
    "…inside the identity block, among the status pills");

  // THREE STATES, AND THE EMPTY ONE IS NOT OPTIONAL. A chip that only appeared
  // where a filing exists would leave "no chip" to be read as "clean".
  eq(CL.chipRead(SEED_IDS[0]).state, "file", "a filing on file reads as `file`");
  eq(CL.chipRead("partial_person").state, "thin", "a record with no composable base reads as `thin`");
  eq(CL.chipRead("chew_h68").state, "empty", "a person with no money file reads as `empty`");
  for (const id of [SEED_IDS[0], "partial_person", "chew_h68", "nobody_at_all"]) {
    const html = CL.letterheadChipHtml(id);
    ok(html.length > 80, `${id}: the chip renders`);
    has(html, "<button", `${id}: …as a control, because it goes somewhere`);
    has(html, `data-pdx-mchip-state="${CL.chipRead(id).state}"`, `${id}: …declaring its state`);
    has(html, "PDXFinanceLane.openSection()", `${id}: …and its action is the jump`);
    lacks(html, "#follow-the-money", `${id}: …which does not leave the person file`);
    ok(CL.letterheadChipMount(id).indexOf("pdx-mchip-host") > 0, `${id}: the mount emits a host`);
  }

  // ONE LINE: a figure and at most three highlights. A fourth highlight is a
  // strip that has not admitted it yet.
  for (const id of SEED_IDS.concat(["partial_person", "chew_h68"])) {
    const words = visible(CL.letterheadChipHtml(id));
    const segs = words.split("·").length;
    ok(segs <= 4, `${id}: the chip is a figure plus at most 3 highlights (${segs} segments)`);
    ok(words.indexOf("\n") < 0, `${id}: …on one line`);
    has(words, "💰", `${id}: …under the money glyph`);
  }

  // The on-file chip says what the spec asks of it, and every figure on it comes
  // off the lane's one composition read rather than a second sum.
  const c = CL.read("lee");
  const lee = visible(CL.letterheadChipHtml("lee"));
  has(lee, c.receiptsFmt, "the figure is the lane's own itemized base");
  has(lee, c.largest.short, "…and the top source, named");
  has(lee, "13 of 757 filed", "…and the coverage counts, quoted");
  // THE DOLLARS CARRY THEIR UNIT, so the figure cannot be read as personal wealth.
  // A bare "$8.6M" beside a person's name is a number about a PERSON; the same
  // figure with "itemized" and the filing's own cycle on it is a number about a
  // DOCUMENT, and the chip has one line in which to say which it is.
  has(lee, "itemized", "the figure states what kind of dollars it is");
  has(lee, c.cycle + " cycle", "…and which cycle's filing they came out of");
  // …AND WHERE THE PAPERWORK IS, read off the filing's own source URL rather than
  // typed at the call site or guessed from the office — which is why this is
  // asserted against the host in the seed rather than against a literal. Lee's
  // filing is an OpenSecrets transcription; a federally-sourced one says "FEC".
  const ARCHIVE_BY_HOST = [[/fec\.gov/, "FEC file"],
                           [/disclosures\.utah\.gov/, "Utah disclosure file"],
                           [/opensecrets\.org/, "OpenSecrets file"]];
  const archiveTag = (url) => (ARCHIVE_BY_HOST.find(([re]) => re.test(String(url || ""))) || [])[1] || "filed";
  has(lee, archiveTag(c.source), "…and the archive the filing was transcribed from");
  ok(SEED_IDS.some((id) => /fec\.gov/.test(String((SEED[id] || {}).source || ""))),
    "the seed holds at least one FEC-sourced filing to name");
  for (const id of SEED_IDS) {
    const cc = CL.read(id);
    if (!cc) continue;
    has(visible(CL.letterheadChipHtml(id)), archiveTag(cc.source),
      `${id}: the chip names the archive its own source URL points at`);
  }
  // The source COUNT gave up its place on the pill to that provenance and is still
  // spoken in full by the accessible name — the pill may carry fewer segments than
  // the longer form, never more.
  const leeAria = (/aria-label="([^"]*)"/.exec(CL.letterheadChipHtml("lee")) || [])[1] || "";
  has(leeAria, c.rows.length + " reported source", "the accessible name still counts the sources");
  has(leeAria, "itemized campaign receipts", "…and says whose receipts these are");
  // NO GRADE, NO "GRASSROOTS". The unit and the provenance are facts about a
  // document; neither is a licence to characterise the money or the person.
  for (const bad of ["grassroots", "small-dollar funded", "people-powered", "self-funded candidate",
    "dark money", "special interest"]) {
    lacks(lee.toLowerCase(), bad, `the on-file chip does not say "${bad}"`);
  }
  // COUNTS, NEVER A SHARE. A percentage on the letterhead is the first screen
  // of a score: it is one number, comparable across people, with no unit
  // attached to it. Every chip state is held to counts and dollar figures.
  for (const id of SEED_IDS.concat(["partial_person", "chew_h68", "nobody_at_all"])) {
    lacks(visible(CL.letterheadChipHtml(id)), "%", `${id}: the chip carries no percentage`);
  }

  // The absent states are sentences about the DATA. Same fence as the entry row.
  const emptyWords = visible(CL.letterheadChipHtml("chew_h68")).toLowerCase();
  has(emptyWords, "no money file on hand", "the empty chip says plainly that nothing is on file");
  const thinWords = visible(CL.letterheadChipHtml("partial_person")).toLowerCase();
  has(thinWords, "partial money file", "the partial chip says the file is partial");
  ok(/\d+ items?/.test(thinWords), "…and counts what is on it");
  for (const bad of ["clean", "clear", "nothing to report", "no concerns", "good", "bad",
    "score", "grade", "level", "rank", "/100", "special-interest", "constituents-first"]) {
    lacks(emptyWords, bad, `the empty chip does not say "${bad}"`);
    lacks(thinWords, bad, `the partial chip does not say "${bad}"`);
  }
  // …and the long form a screen reader hears carries the coverage disclosure,
  // because that is where "a blank is missing data" has room to be said.
  for (const id of ["chew_h68", "partial_person"]) {
    const aria = (/aria-label="([^"]*)"/.exec(CL.letterheadChipHtml(id)) || [])[1] || "";
    has(aria, "missing data", `${id}: the accessible name carries the coverage disclosure`);
    has(aria, "not a finding about the person", `${id}: …including that it is not a finding`);
  }

  // NO MOTIVE LANGUAGE, on the chip either.
  for (const id of [SEED_IDS[0], "partial_person", "chew_h68"]) {
    const w = visible(CL.letterheadChipHtml(id)).toLowerCase();
    for (const m of ["bought", "bribe", "beholden", "corrupt", "owned by", "captured by",
      "sold out", "puppet"]) {
      lacks(w, m, `${id}: the chip carries no motive language ("${m}")`);
    }
  }

  // NO RING, NO RAMP, NO RANK. One neutral accent in all three states — a chip
  // that went green on a diffuse base and amber on a concentrated one would be
  // the retired Constituents-First verdict delivered in colour.
  // Comments stripped, on the same terms section 1 strips the lane's: the
  // stylesheet's header explains WHY it uses no verdict colour, and it cannot do
  // that without naming the two colours it is refusing.
  const CSS = R("finance-lane.css").replace(/\/\*[\s\S]*?\*\//g, " ");
  for (const hex of ["#4ade80", "#f87171", "#86efac", "#fca5a5", "#6ee7a0", "#f5c842"]) {
    lacks(CSS, hex, `finance-lane.css does not use the verdict colour ${hex}`);
  }
  for (const id of [SEED_IDS[0], "partial_person", "chew_h68"]) {
    const html = CL.letterheadChipHtml(id);
    ok(!/style="/.test(html), `${id}: the chip carries no inline colour of its own`);
  }
  // Every state takes the same class, so none of them can be styled as a verdict.
  const classes = [SEED_IDS[0], "partial_person", "chew_h68"]
    .map((id) => (/class="(pdx-mchip)"/.exec(CL.letterheadChipHtml(id)) || [])[1]);
  eq(new Set(classes).size, 1, "all three states render under one chip class");
  has(R("index.html"), 'href="/finance-lane.css"', "the chip's stylesheet is shipped");

  // THE CHIP IS NOT THE SECTION. Nothing that belongs below is duplicated up here.
  const onFileChip = visible(CL.letterheadChipHtml("lee")).toLowerCase();
  // "cycle" IS OFF THIS LIST ON PURPOSE. It was here because the section's own
  // heading carries it and the chip had no business repeating a heading. It now
  // carries it as the UNIT on the dollars — "$8.6M itemized 2024 cycle" — which is
  // not a restatement of the section but the one thing that stops the figure being
  // read as this person's net worth. The rest of the list is unchanged.
  for (const owned of ["outside spending", "not itemized to the candidate", "verify at source",
    "composition as filed", "updated"]) {
    lacks(onFileChip, owned, `the chip does not restate the section's "${owned}"`);
  }
  ok(onFileChip.indexOf("<svg") < 0 && onFileChip.indexOf("<canvas") < 0,
    "…and mounts no graph, so the hero cannot grow by a chart");
  const chipHtmlRaw = CL.letterheadChipHtml("lee");
  for (const tag of ["<svg", "<canvas", "<table", "<img", "<ul", "<li", "<div"]) {
    lacks(chipHtmlRaw, tag, `the chip contains no <${tag.slice(1)}> — it is a pill, not a block`);
  }

  // THE WALL, on the new surface too. The chip is a display object; it may not
  // have introduced a finance read into any engine.
  const FIN2 = /PDXFinanceLane|_pdxFinance|_financeSignal|smallDollar|selfFunded|largeIndividual/;
  for (const f of ["word-action.js", "publication-floor.js", "voting-record.js",
    "stance-helpers.js", "consistency.js"]) {
    ok(!FIN2.test(R(f)), `${f} still does not name the finance lane after the chip shipped`);
  }
  ok(!/letterheadChip|pdx-mchip/.test(R("word-action.js")),
    "the ⚖️ letterhead badge knows nothing about the 💰 one beside it");
}

// ── Result ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  failures.forEach((f) => console.error(`   ✗ ${f}`));
  console.error(`\n✗ finance-lane: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
const cov = L.coverage();
console.log(`✓ finance-lane: all ${passed} assertions passed`);
console.log(`   ${cov.onFile} filings on file · composition only · no score, no level, no ramp`);
