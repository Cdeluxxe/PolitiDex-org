#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-wealth-bands.mjs — the range-band graph draws filed bands, as bands
// ─────────────────────────────────────────────────────────────────────────────
// The disclosures block on a person file can carry a range-band graph: one bar
// per line on the form the 💰 disclosure pill names, spanning the category of
// value the filer ticked. This file fences what that graph is allowed to be:
//
//   1. THE SHIPPED TABLE IS EMPTY, and so no profile draws a bar. Every block
//      reads exactly as it did before the graph existed.
//   2. A PERSON WITH LINES ON HAND gets one bar per line, each carrying the band
//      string exactly as stored, grouped by category, largest first, placed on
//      the form's own ladder by rung — left edge where the category begins,
//      right edge where it ends.
//   3. NO MIDPOINT, NO SUM, NO STRAY DIGIT. The only digits in the graph's
//      visible text are the filed band labels and the asset names as filed.
//   4. A PERSON WITH NO DISCLOSURE gets no graph and the existing empty words,
//      even if a holdings row were typed in for them.
//   5. THE GATE refuses every broken row, one rule at a time, and a refused row
//      draws nothing.
//   6. THE WALL. Both pills are byte-identical with the table filled and empty;
//      wealth() keeps its four keys; the disclosure module still cannot see a
//      campaign figure; and the graph code reads no filing and no tenure.
//
//   node scripts/test-wealth-bands.mjs
//
// Real shipped modules in a node:vm sandbox over the real roster and the real
// funding seed. Lines exist only through PDXFinance._setHoldingsTable, the
// test-only seam; nothing here writes into the shipped table.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const FTM_SRC = R("ftm-data.js");
const LANE_SRC = R("finance-lane.js");
const FIN_SRC = R("pdx-finance.js");

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
const unesc = (s) => String(s).replace(/&quot;/g, '"').replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ wealth bands: ${msg}`);
  process.exit(1);
};
const STRIP = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// ── The real seed and the shipped tables, lifted ─────────────────────────────
function liftSeed() {
  const at = FTM_SRC.indexOf("var FTM_FUNDING = {");
  must(at > 0, "FTM_FUNDING is no longer in ftm-data.js");
  const end = FTM_SRC.indexOf("\n    };", at);
  const literal = FTM_SRC.slice(at + "var FTM_FUNDING = ".length, end + "\n    }".length);
  return new Function("return (" + literal + ");")();
}
function liftTable(name) {
  const at = FIN_SRC.indexOf(`var ${name} = {`);
  must(at > 0, `pdx-finance.js no longer declares ${name}`);
  const end = FIN_SRC.indexOf(";", at);
  const literal = FIN_SRC.slice(at + `var ${name} = `.length, end);
  return new Function("return (" + literal + ");")();
}
const SEED = liftSeed();
const SEED_IDS = Object.keys(SEED);
const AS_OF = (FTM_SRC.match(/var FTM_AS_OF = '([^']*)'/) || [])[1] || "";
const SHIPPED_DOCS = (() => {
  const at = FIN_SRC.indexOf("var PDX_FD_DOCUMENTS = {");
  const end = FIN_SRC.indexOf("\n  };", at);
  return new Function("return (" +
    FIN_SRC.slice(at + "var PDX_FD_DOCUMENTS = ".length, end + "\n  }".length) + ");")();
})();
const SHIPPED_HOLDINGS = liftTable("PDX_FD_HOLDINGS");
const DOC_PIDS = Object.keys(SHIPPED_DOCS);
must(DOC_PIDS.length > 0, "no shipped document rows to hang a fixture off");

function box(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  vm.runInContext(R("cmp-data.js"), ctx, { filename: "cmp-data.js" });
  win.PROFILES = win.CMP_DATA;
  win._FTM_BY_ID = {};
  for (const id of SEED_IDS) win._FTM_BY_ID[id] = { id, name: id, funding: SEED[id] };
  win.FTM_AS_OF = AS_OF;
  vm.runInContext(FIN_SRC, ctx, { filename: "pdx-finance.js" });
  vm.runInContext(LANE_SRC, ctx, { filename: "finance-lane.js" });
  must(win.PDXFinance && win.PDXFinanceLane, "the money modules did not install");
  if (opts.documents) win.PDXFinance._setDocumentTable(opts.documents);
  if (opts.holdings) win.PDXFinance._setHoldingsTable(opts.holdings);
  if (opts.section) {
    vm.runInContext(FTM_SRC, ctx, { filename: "ftm-data.js" });
    must(typeof win._pdxFundingSection === "function", "ftm-data.js installed no _pdxFundingSection");
  }
  return win;
}

// THE FIXTURE. A real shipped document row, with test-only lines typed in the
// shapes the form uses: the clerk's spaced hyphen, the en-dash spelling, two
// lines in one category, and the open-topped category. Asset names carry no
// digits so the digit sweep below is reading the bands and nothing else.
const PID = DOC_PIDS[0];
const DOC = SHIPPED_DOCS[PID];
const LINES = [
  { asset: "Example Index Fund", band: "$15,001 - $50,000" },
  { asset: "Family Farm Parcel", band: "$1,000,001 - $5,000,000" },
  { asset: "Money Market Account", band: "$1,000,001–$5,000,000" },
  { asset: "Rental Property", band: "$5,000,001 - $25,000,000" },
  { asset: "Trust Interest", band: "Over $50,000,000" },
];
const FIXTURE = { [PID]: { year: DOC.year, formUrl: DOC.formUrl, lines: LINES } };
const SHORT = { "$15,001 - $50,000": "$15–50K", "$1,000,001 - $5,000,000": "$1–5M",
  "$1,000,001–$5,000,000": "$1–5M", "$5,000,001 - $25,000,000": "$5–25M",
  "Over $50,000,000": "over $50M" };

const BARE = box();
const FILLED = box({ holdings: FIXTURE });
const ROSTER = BARE.CMP_DATA;
must(Object.keys(ROSTER).length > 500, "cmp-data.js did not load a roster");

console.log(`   wealth bands: ${Object.keys(SHIPPED_HOLDINGS).length} holdings rows shipped · ` +
  `${LINES.length} fixture lines on ${PID}`);

const bars = (html) => [...String(html).matchAll(/data-pdx-band="([^"]*)"/g)].map((m) => unesc(m[1]));
const geom = (html) => [...String(html).matchAll(/class="pdx-bands-bar[^"]*" style="left:([\d.]+)%;width:([\d.]+)%"/g)]
  .map((m) => ({ left: +m[1], width: +m[2] }));

// ── 1 · the shipped table is empty, and nothing draws ───────────────────────
{
  section("1 · the shipped holdings table is empty, so no profile draws a bar");
  eq(Object.keys(SHIPPED_HOLDINGS).length, 0, "PDX_FD_HOLDINGS ships with no rows");
  eq(BARE.PDXFinance.holdingsDefects().length, 0, "…and the gate finds nothing wrong with it");
  let drew = 0, nonNull = 0;
  for (const id of Object.keys(ROSTER)) {
    if (BARE.PDXFinance.holdings(id) !== null) nonNull++;
    if (/pdx-bands/.test(BARE.PDXFinanceLane.wealthBlockHtml(id, ROSTER[id]))) drew++;
  }
  eq(nonNull, 0, "holdings() answers null for every rostered pid");
  eq(drew, 0, "…and no disclosures block on the roster carries a graph");
  for (const id of DOC_PIDS) {
    const blk = BARE.PDXFinanceLane.wealthBlockHtml(id, ROSTER[id]);
    has(visible(blk), " on file", `${id}: the document block still reports its form`);
    lacks(blk, "pdx-bands", `${id}: …and draws no bands with no lines on hand`);
  }
}

// ── 2 · a person with lines on hand ─────────────────────────────────────────
{
  section("2 · one bar per filed line, each carrying its stored band, grouped and placed by rung");
  const F = FILLED.PDXFinance;
  eq(F.holdingsDefects().length, 0, "the fixture passes the gate");
  const h = F.holdings(PID);
  ok(h && Array.isArray(h.lines), "holdings() answers for the fixture pid");
  eq(h.lines.length, LINES.length, "…with every line");
  eq(Object.keys(h).sort().join(","), "formUrl,lines,rungs,year",
    "holdings() returns { year, formUrl, rungs, lines } and nothing summed");
  for (const l of h.lines) {
    eq(Object.keys(l).sort().join(","), "asset,band,filed,rung", `${l.asset}: a line is asset, band, filed, rung`);
  }

  const blk = FILLED.PDXFinanceLane.wealthBlockHtml(PID, ROSTER[PID]);
  const graph = FILLED.PDXFinanceLane.holdingsGraphHtml(PID);
  ok(graph.length > 0, "the graph renders");
  has(blk, graph, "…inside the disclosures block");
  ok(blk.indexOf(graph) > blk.indexOf("pdx-money-block-src"), "…after the form link");

  const got = bars(graph);
  eq(got.length, LINES.length, "the graph draws exactly one bar per stored line");
  eq(got.slice().sort().join("|"), LINES.map((l) => l.band).sort().join("|"),
    "…and each bar's band is the stored range string, byte for byte");

  // Order: largest category first, filing order within one.
  eq(h.lines.map((l) => l.asset).join("|"),
    "Trust Interest|Rental Property|Family Farm Parcel|Money Market Account|Example Index Fund",
    "lines are ordered by the category the filer reported, largest first");
  const groupHeads = [...graph.matchAll(/class="pdx-bands-group-h">([^<]*)</g)].map((m) => unesc(m[1]));
  eq(groupHeads.join("|"), "over $50M|$5–25M|$1–5M|$15–50K", "…and grouped under those categories");

  // Labels: "asset · band", the band as the form's own ladder label.
  const labels = [...graph.matchAll(/class="pdx-bands-label">([^<]*)</g)].map((m) => unesc(m[1]));
  for (const l of LINES) {
    ok(labels.indexOf(`${l.asset} · ${SHORT[l.band]}`) >= 0,
      `${l.asset}: the label reads "${l.asset} · ${SHORT[l.band]}"`);
  }

  // Geometry: rung r of n, left edge at the category's floor, right at its top.
  const n = F.BAND_LADDER.length;
  const g = geom(graph);
  eq(g.length, LINES.length, "every bar has a placement");
  h.lines.forEach((l, i) => {
    const want = 100 * l.rung / n;
    ok(Math.abs(g[i].left - want) < 0.01, `${l.asset}: left edge sits at the floor of its category`);
    const top = l.rung === n - 1 ? 100 : 100 * (l.rung + 1) / n;
    ok(Math.abs(g[i].left + g[i].width - top) < 0.01, `${l.asset}: right edge sits at the top of its category`);
  });
  eq(geom(graph)[2].left, geom(graph)[3].left, "two lines in one category share both edges");
  ok(/pdx-bands-bar is-open/.test(graph), "the open-topped category is drawn open, not closed on an invented ceiling");
  eq((graph.match(/is-open/g) || []).length, 1, "…and only that one");
}

// ── 3 · no midpoint, no sum, no stray digit ─────────────────────────────────
{
  section("3 · no midpoint, no summed total, and no digit that is not a filed band");
  const graph = FILLED.PDXFinanceLane.holdingsGraphHtml(PID);
  let vis = visible(unesc(graph));
  // Strip every filed string the graph is allowed to print, then nothing with a
  // digit or a dollar sign may be left.
  const allowed = LINES.map((l) => SHORT[l.band]).concat(LINES.map((l) => l.asset))
    .sort((a, b) => b.length - a.length);
  for (const s of allowed) vis = vis.split(s).join(" ");
  ok(!/\d/.test(vis), `no digit outside a filed band in the graph's visible text — left: "${vis}"`);
  ok(!/\$/.test(vis), "…and no dollar sign outside one");
  ok(!/%/.test(visible(graph)), "…and no percent");
  const words = visible(graph).toLowerCase();
  for (const bad of ["total", "sum of", "combined", "altogether", "average", "estimated",
                     "about $", "~$", "≈", "approximately", "net worth of", "midpoint is",
                     "per year", "change"]) {
    lacks(words, bad, `the graph prints no combined or reduced figure ("${bad}")`);
  }
  // No middle value can be printed if none is computed: every dollar token in
  // the visible text must be one of the filed band labels.
  const tokens = visible(unesc(graph)).match(/(?:over )?\$[\d.,]+[KM]?(?:–[\d.,]+[KM]?)?/g) || [];
  const labelSet = new Set(Object.values(SHORT));
  for (const t of tokens) ok(labelSet.has(t), `dollar token "${t}" is a filed band label`);
  // The source refuses the arithmetic, too: no midpoint and no reduction over
  // lines in the graph's code or the holdings read.
  const gAt = LANE_SRC.indexOf("function holdingsGraphHtml");
  const gSrc = STRIP(LANE_SRC.slice(gAt, LANE_SRC.indexOf("// ── THE DISCLOSURES BLOCK", gAt)));
  const hAt = FIN_SRC.indexOf("function holdings(pid)");
  const hSrc = STRIP(FIN_SRC.slice(hAt, FIN_SRC.indexOf("// ── COVERAGE", hAt)));
  for (const [name, src] of [["holdingsGraphHtml", gSrc], ["holdings()", hSrc]]) {
    for (const bad of [".reduce(", "/ 2", "/2)", "parseFloat", "parseInt", "Number(", "midpoint", "+= l.", "total"]) {
      lacks(src, bad, `${name} contains no arithmetic on a figure ("${bad}")`);
    }
  }
  // No equity / crowdfunding language anywhere in the graph's own copy.
  for (const bad of ["stock", "equity", "share", "form c"]) {
    lacks(STRIP(gSrc).toLowerCase().replace(/pdx-bands/g, ""), bad, `the graph's copy uses no "${bad}" language`);
  }
  // And no tier, rank or scoring vocabulary.
  ok(!/\b(?:low|med|medium|moderate|high|score|grade|rating|rank(?:ed|ing)?)\b/i.test(visible(graph)),
    "the graph's visible text carries no tier or scoring word");
  ok(!/<canvas|Chart\s*\(|axis/i.test(graph), "…and it is plain markup, no canvas and no axis");
}

// ── 4 · no disclosure, no graph ─────────────────────────────────────────────
{
  section("4 · a person with no disclosure shows no graph and the existing empty words");
  const other = Object.keys(ROSTER).find((id) => !SHIPPED_DOCS[id]);
  // A holdings row typed in for a person with no document cannot reach the page.
  const W = box({ section: true, holdings: { ...FIXTURE,
    [other]: { year: DOC.year, formUrl: DOC.formUrl, lines: LINES } } });
  eq(W.PDXFinance.holdings(other), null, `${other}: no document row, so holdings() is null`);
  ok(W.PDXFinance.holdingsDefects().some((d) => d.indexOf(other + ": no document row") === 0),
    `${other}: …and the gate names the row`);
  for (const id of [other].concat(Object.keys(ROSTER).filter((x) => !SHIPPED_DOCS[x]).slice(1, 6))) {
    const blk = W.PDXFinanceLane.wealthBlockHtml(id, ROSTER[id]);
    lacks(blk, "pdx-bands", `${id}: no graph`);
    has(visible(blk), "No in-office wealth file on hand", `${id}: …and the empty words remain`);
    has(visible(blk), "not a disclosure of zero", `${id}: …with the missing-data sentence`);
    const sec = String(W._pdxFundingSection(id, ROSTER[id]) || "");
    lacks(sec, "pdx-bands", `${id}: the assembled money section draws no bands`);
    eq((sec.match(/data-pdx-money-block="/g) || []).length, 2, `${id}: …and is still two blocks`);
  }
  // The person WITH lines: still two blocks, the graph inside the second.
  const sec = String(W._pdxFundingSection(PID, ROSTER[PID]) || "");
  eq((sec.match(/data-pdx-money-block="/g) || []).length, 2, `${PID}: the section is still two blocks with the graph in it`);
  eq(bars(sec).length, LINES.length, `${PID}: …and the assembled section carries every bar once`);
  // And the document going away takes the graph with it.
  const gone = box({ documents: {}, holdings: FIXTURE });
  eq(gone.PDXFinance.holdings(PID), null, "with the document row removed, holdings() is null");
  lacks(gone.PDXFinanceLane.wealthBlockHtml(PID, ROSTER[PID]), "pdx-bands", "…and nothing draws");
}

// ── 5 · the gate ────────────────────────────────────────────────────────────
{
  section("5 · the holdings gate refuses each broken row, and a refused row draws nothing");
  const row = (patch, linePatch) => {
    const r = { year: DOC.year, formUrl: DOC.formUrl,
      lines: LINES.map((l, i) => (i === 0 && linePatch ? { ...l, ...linePatch } : { ...l })), ...patch };
    for (const k of Object.keys(r)) if (r[k] === undefined) delete r[k];
    if (linePatch) for (const k of Object.keys(r.lines[0])) if (r.lines[0][k] === undefined) delete r.lines[0][k];
    return { [PID]: r };
  };
  const CASES = [
    ["a different form url", row({ formUrl: "https://disclosures-clerk.house.gov/other.pdf" }), "does not match"],
    ["a different year", row({ year: 1999 }), "does not match"],
    ["a non-.gov url", row({ formUrl: "https://www.opensecrets.org/x" }), ".gov"],
    ["no lines", row({ lines: [] }), "non-empty"],
    ["a $0 band", row(null, { band: "$0" }), "ladder"],
    ["an exact figure", row(null, { band: "$2,480,119" }), "ladder"],
    ["a short label instead of the filed spelling", row(null, { band: "$1–5M" }), "ladder"],
    ["no asset name", row(null, { asset: "  " }), "asset"],
    ["a value field on a line", row(null, { value: 3000000 }), "unrecognised field value"],
    ["a midpoint field on a line", row(null, { midpoint: "$3M" }), "unrecognised field midpoint"],
    ["a total on the row", row({ total: "$9M" }), "unrecognised field total"],
    ["stored tenure", row({ tenureYears: 4 }), "_pdxTenure"],
  ];
  for (const [what, table, rule] of CASES) {
    const W = box({ holdings: table });
    const defects = W.PDXFinance.holdingsDefects();
    ok(defects.some((d) => d.indexOf(rule) >= 0), `${what}: the gate names it ("${rule}") — got ${JSON.stringify(defects)}`);
    eq(W.PDXFinance.holdings(PID), null, `${what}: …and holdings() refuses the row`);
    lacks(W.PDXFinanceLane.wealthBlockHtml(PID, ROSTER[PID]), "pdx-bands", `${what}: …and nothing draws`);
  }
  // The ladder is the form's own, in its own order, pinned label for label.
  eq(BARE.PDXFinance.BAND_LADDER.join("|"),
    "$1–15K|$15–50K|$50–100K|$100–250K|$250–500K|$500K–1M|$1–5M|$5–25M|$25–50M|over $50M",
    "BAND_LADDER is the form's category ladder, in order");
  const labels = new Set(Object.values(BARE.PDXFinance.FILED_BAND_LABELS));
  for (const r of BARE.PDXFinance.BAND_LADDER) ok(labels.has(r), `${r}: every rung is a filed-band label`);
  for (const v of labels) ok(BARE.PDXFinance.BAND_LADDER.indexOf(v) >= 0, `${v}: every filed-band label has a rung`);
}

// ── 6 · the wall ────────────────────────────────────────────────────────────
{
  section("6 · the two money pills are unchanged and the wall between them still stands");
  const ids = [PID].concat(SEED_IDS.filter((id) => ROSTER[id]).slice(0, 4));
  for (const id of ids) {
    eq(FILLED.PDXFinanceLane.letterheadChipHtml(id), BARE.PDXFinanceLane.letterheadChipHtml(id),
      `${id}: the receipts pill is byte-identical with lines on hand`);
    eq(FILLED.PDXFinanceLane.wealthLetterheadChipHtml(id, ROSTER[id]),
      BARE.PDXFinanceLane.wealthLetterheadChipHtml(id, ROSTER[id]),
      `${id}: …and so is the disclosure pill`);
  }
  const wPill = visible(FILLED.PDXFinanceLane.wealthLetterheadChipHtml(PID, ROSTER[PID]));
  has(wPill, "FD on file", "the disclosure pill is still a document chip");
  ok(!/\$/.test(wPill), "…with no dollar figure on it");
  for (const l of LINES) lacks(wPill, SHORT[l.band], `…and no band from the graph ("${SHORT[l.band]}")`);
  eq(Object.keys(FILLED.PDXFinance.wealth(PID, ROSTER[PID])).sort().join(","),
    "formUrl,kind,tenureYears,year", "wealth() still returns exactly its four keys");

  // The disclosure module still cannot see a campaign figure.
  const finBody = STRIP(FIN_SRC);
  for (const bad of ["receipts", "receiptsFmt", "totalRaised", "raisedFmt", "funding.", "compose(", "FTM_FUNDING", "_FTM_BY_ID"]) {
    lacks(finBody, bad, `pdx-finance.js cannot see a campaign figure ("${bad}")`);
  }
  // The graph reads holdings and nothing else: no filing, no receipts, no tenure.
  const gAt = LANE_SRC.indexOf("function holdingsGraphHtml");
  const gSrc = STRIP(LANE_SRC.slice(gAt, LANE_SRC.indexOf("// ── THE DISCLOSURES BLOCK", gAt)));
  for (const bad of ["recordFor", "read(", "chipRead", "receipts", "_FTM", "filing", "_pdxTenure",
                     "tenure", "termStart", "termEnd"]) {
    lacks(gSrc, bad, `holdingsGraphHtml reads no filing and no tenure ("${bad}")`);
  }
  const hAt = FIN_SRC.indexOf("var PDX_FD_HOLDINGS");
  const hSrc = STRIP(FIN_SRC.slice(hAt, FIN_SRC.indexOf("// ── COVERAGE", hAt)));
  for (const bad of ["W._pdxTenure", "termStart", "termEnd", "tenureYears("]) {
    lacks(hSrc, bad, `the holdings code computes no tenure ("${bad}")`);
  }
  // The service worker moved, because three precached shell files changed.
  const SW = R("sw.js");
  const ver = (SW.match(/const CACHE_VERSION = '([^']+)'/) || [])[1];
  ok(ver && +ver.slice(1) >= 350, `the shell version moved for the changed precached files (${ver})`);
  has(SW, `// ${ver} -`, "…with a changelog entry");
}

// ── report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ wealth bands: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.error("  · " + f);
  process.exit(1);
}
console.log(`\n✓ wealth bands: ${passed} passed`);
