#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-wealth-bands.mjs — the range-band graph draws filed bands, as bands
// ─────────────────────────────────────────────────────────────────────────────
// The disclosures block on a person file can carry a range-band graph: one bar
// per line on the form the 💰 disclosure pill names, spanning the category of
// value the filer ticked. This file fences what that graph is allowed to be:
//
//   1. THE SHIPPED ROWS ARE THE FOUR HOUSE FDs, as transcribed: one bar per
//      stored line on Moore, Maloy and Kennedy, none on Owens, and no graph on
//      any profile without a row.
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
// funding seed. Sections 2-6 use a fixture through PDXFinance._setHoldingsTable,
// the test-only seam; section 1 reads the shipped table as it ships.

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
  const end = FIN_SRC.indexOf("\n  };", at);
  must(end > at, `could not find the end of the ${name} literal`);
  const literal = FIN_SRC.slice(at + `var ${name} = `.length, end + "\n  }".length);
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
  if (opts.oge) vm.runInContext(R("pdx-fd-oge.js"), ctx, { filename: "pdx-fd-oge.js" });
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

const dollars = (n) => {
  const [i, d] = n.toFixed(2).split(".");
  return "$" + i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + d;
};
// A DENSE BOX draws a capped number of dots and prints how many more lines it
// holds; a box's stored lines are its dots plus that remainder. The remainder
// is per box — per category — so it carries the category's ladder label, and
// these comparisons run on ladder labels (one box can hold two spellings).
const moreOf = (html) => [...String(html).matchAll(/data-pdx-more-band="([^"]*)" data-pdx-more="(\d+)"/g)]
  .flatMap((m) => Array(+m[2]).fill(unesc(m[1])));
const bars = (html) => [...String(html).matchAll(/data-pdx-band="([^"]*)"/g)].map((m) => unesc(m[1]));
const geom = (html) => [...String(html).matchAll(/class="pdx-bands-bar[^"]*" style="left:([\d.]+)%;width:([\d.]+)%"/g)]
  .map((m) => ({ left: +m[1], width: +m[2] }));

// ── 1 · the shipped timelines, as transcribed ───────────────────────────────
// THE FORMS AND NO OTHER. Each member's row is a timeline of House Clerk forms,
// newest = the pill's form. The years and per-year line counts are pinned so a
// line added or dropped is a decision a test sees, and every bar and every dot
// on every live block is checked against the stored string.
const SHIPPED_TIMELINES = {
  bmoore:     { 2021: 89, 2022: 48, 2023: 43, 2024: 17, 2025: 16 },
  maloy:      { 2023: 3, 2024: 3, 2025: 3 },
  kennedy:    { 2024: 24, 2025: 28 },
  jeffries:   { 2021: 29, 2022: 24, 2023: 22, 2024: 24, 2025: 32 },
  scalise:    { 2021: 1, 2022: 1, 2023: 1, 2024: 1, 2025: 0 },
  jim_jordan: { 2021: 5, 2022: 3, 2023: 3, 2024: 3, 2025: 18 },
  aoc:        { 2021: 4, 2022: 4, 2023: 3, 2024: 3, 2025: 3 },
};
const SHIPPED_DOC_IDS = {
  bmoore: "10046400,10051783,10071732,10066531,10074823",
  maloy: "10061120,10069198,10081600",
  kennedy: "10066533,10074834",
  jeffries: "10046507,10052944,10059158,10066511,10076550",
  scalise: "10046343,10051856,10057111,10067107,10075779",
  jim_jordan: "10046901,10053666,10058918,10067361,10076961",
  aoc: "10046833,10052480,10060351,10066093,10081499",
};
// The midpoint of a filed box, worked out HERE from the filed spelling's own two
// ends — independently of DISCLOSED_POINTS — so the literal table is checked
// against arithmetic rather than against itself.
const filedEnds = (band) => {
  const m = /^\$([\d,]+)\s*(?:[-–]|to)\s*\$([\d,]+)$/.exec(band);
  return m ? [Number(m[1].replace(/,/g, "")), Number(m[2].replace(/,/g, ""))] : null;
};
const expectedPoint = (band) => {
  if (/^over \$50,000,000$/i.test(band)) return { field: "floor", value: 50000000 };
  const e = filedEnds(band);
  return e ? { field: "midpoint", value: (e[0] + e[1]) / 2 } : null;
};
{
  section("1 · the shipped timelines: every form, every line, every disclosed point");
  const F = BARE.PDXFinance, L = BARE.PDXFinanceLane;
  eq(F.holdingsDefects().length, 0, "the shipped holdings table passes its gate");
  eq(Object.keys(SHIPPED_HOLDINGS).sort().join(","), Object.keys(SHIPPED_TIMELINES).sort().join(","),
    "rows ship for exactly the transcribed members");
  eq(DOC_PIDS.slice().sort().join(","),
    "aoc,bmoore,jeffries,jim_jordan,kennedy,maloy,mike_johnson,owens,scalise,trump",
    "the document index is the four Utah rows, the five-member House batch and the President's OGE row");

  for (const [pid, years] of Object.entries(SHIPPED_TIMELINES)) {
    const row = SHIPPED_HOLDINGS[pid];
    ok(row && Array.isArray(row.forms), `${pid}: the row is a timeline of forms`);
    const forms = row.forms;
    eq(forms.map((f) => String(f.year)).join(","), Object.keys(years).join(","), `${pid}: the form years, oldest first`);
    eq(forms.map((f) => /\/(\d+)\.pdf$/.exec(f.formUrl)[1]).join(","), SHIPPED_DOC_IDS[pid],
      `${pid}: …each the document id the clerk's yearly index lists`);
    const newest = forms[forms.length - 1];
    eq(String(newest.year), String(SHIPPED_DOCS[pid].year), `${pid}: the newest form is the pill's year`);
    eq(newest.formUrl, SHIPPED_DOCS[pid].formUrl, `${pid}: …and the pill's .gov URL`);
    for (const f of forms) {
      ok(/^https:\/\/disclosures-clerk\.house\.gov\/public_disc\/financial-pdfs\//.test(f.formUrl) &&
         f.formUrl.indexOf(`/${f.year}/`) > 0, `${pid} ${f.year}: the form is a House Clerk PDF filed under its own year`);
      eq(f.lines.length, years[f.year], `${pid} ${f.year}: ${years[f.year]} lines stored`);
      for (const l of f.lines) {
        ok(Object.prototype.hasOwnProperty.call(F.FILED_BAND_LABELS, l.band) && / - |^Over /.test(l.band),
          `${pid} ${f.year}: "${l.band}" is a filed category in the form's own spelling`);
        const want = expectedPoint(l.band);
        ok(want && l[want.field] === want.value,
          `${pid} ${f.year}: "${l.asset}" carries the ${want && want.field} its filed box determines`);
        eq(Object.keys(l).sort().join(","), ["asset", "band", want.field].sort().join(","),
          `${pid} ${f.year}: a stored line is asset, band and one disclosed point`);
      }
    }

    // The block: one column per form year, one dot per stored line.
    const blk = L.wealthBlockHtml(pid, ROSTER[pid]);
    has(visible(blk), "FD on file", `${pid}: the block still reports its form`);
    const got = bars(blk).map((b) => F.bandLabel(b)).concat(moreOf(blk));
    const allLines = forms.flatMap((f) => f.lines);
    eq(got.length, allLines.length, `${pid}: the block draws one dot per stored line, across every year`);
    eq(got.slice().sort().join("|"), allLines.map((l) => F.bandLabel(l.band)).sort().join("|"),
      `${pid}: …each in the stored band's own box`);
    // Every drawn dot carries its stored band string byte for byte.
    const storedBands = new Set(allLines.map((l) => l.band));
    ok(bars(blk).every((b) => storedBands.has(b)), `${pid}: every drawn dot carries a stored band string, byte for byte`);
    // THE HORIZONTAL AXIS IS FILING YEARS: one column per form, oldest left.
    has(blk, 'data-pdx-drawing="years"', `${pid}: the graph is the year drawing`);
    const cols = [...blk.matchAll(/<li class="pdx-yrs-band" data-pdx-year="(\d+)" data-pdx-points="(\d+)" style="[^"]*">([\s\S]*?)<\/li>/g)];
    const yrs = cols.map((m) => m[1]);
    const drawnYears = Object.keys(years).filter((y) => years[y] > 0);
    eq(yrs.join(","), drawnYears.join(","), `${pid}: one column per form year with a ladder line, left to right, oldest first`);
    for (const y of Object.keys(years).filter((y) => years[y] === 0)) {
      lacks(blk, `data-pdx-year="${y}"`, `${pid} ${y}: a year with no ladder line draws no column and no summary`);
    }
    ok(yrs.every((y, i) => i === 0 || +y > +yrs[i - 1]), `${pid}: …strictly ascending`);
    for (const [, y, n, body] of cols) {
      const f = forms.find((x) => String(x.year) === y);
      eq(+n, years[y], `${pid} ${y}: the column draws one dot per stored line`);
      eq(bars(body).map((b) => F.bandLabel(b)).concat(moreOf(body)).sort().join("|"), f.lines.map((l) => F.bandLabel(l.band)).sort().join("|"),
        `${pid} ${y}: …and those dots are that year's stored bands`);
      has(body, `href="${f.formUrl}"`, `${pid} ${y}: the column links that year's .gov PDF`);
      has(visible(body), y, `${pid} ${y}: …and carries its year label`);
      ok(body.indexOf('class="pdx-yrs-year"') > body.indexOf('class="pdx-yrs-plot"'),
        `${pid} ${y}: the year label sits under the column's marks`);
    }
    eq((blk.match(/class="pdx-bands-dot(?: is-floor)?"/g) || []).length + moreOf(blk).length,
      Object.values(years).reduce((a, b) => a + b, 0),
      `${pid}: …and no dot that is not a stored line (a dense box's remainder is counted, not drawn)`);
    // Marks sit on a vertical log scale: a bigger box is a higher dot.
    const ys = [...blk.matchAll(/data-pdx-band="([^"]*)" data-pdx-point="[a-z]+" style="left:[\d.]+%;bottom:([\d.]+)%"/g)]
      .map((m) => [unesc(m[1]), +m[2]]);
    eq(ys.length + moreOf(blk).length, allLines.length, `${pid}: every drawn dot has a vertical placement`);
    for (const [band, yv] of ys) {
      const want = 4 + 92 * (Math.log(expectedPoint(band).value) - Math.log(8000.5)) / (Math.log(50000000) - Math.log(8000.5));
      ok(Math.abs(yv - want) < 0.01, `${pid}: "${band}" sits at its point's height on the log scale`);
    }
    // The vertical axis is labelled only at boxes this member's lines use.
    // The per-line graph's own axis (the range graph below it has its own).
    const g1 = blk.slice(blk.indexOf('data-pdx-graph="years"'), blk.indexOf('class="pdx-rng-wrap"') >= 0 ? blk.indexOf('class="pdx-rng-wrap"') : blk.length);
    const ticks = [...g1.matchAll(/class="pdx-yrs-tick"[^>]*>([^<]*)</g)].map((m) => unesc(m[1]));
    const usedLabels = new Set(allLines.map((l) => {
      const p = F.DISCLOSED_POINTS[F.bandLabel(l.band)];
      return p.label + " " + p.basis;
    }));
    eq(ticks.slice().sort().join("|"), [...usedLabels].sort().join("|"), `${pid}: axis ticks are exactly the points its lines carry`);
    // The method is named where the figure is.
    has(visible(blk), "How each figure was made", `${pid}: the source line under the graph is there`);
    has(visible(blk), "Midpoint of the filed category", `${pid}: …and names the midpoint method`);
    const titles = [...blk.matchAll(/class="pdx-bands-dot(?: is-floor)?"[^>]*title="([^"]*)"/g)].map((m) => unesc(m[1]));
    ok(titles.length && titles.every((t) => /(Midpoint of the filed category|Floor of the open-ended category): \$/.test(t)),
      `${pid}: every dot's accessible title names the method beside its figure`);

    // NO UNDISCLOSED POINT. Every dollar token in the graph's visible text is a
    // filed band label or the point label of a line this member actually filed.
    const graph = L.holdingsGraphHtml(pid);
    const allowedTok = new Set();
    for (const f of forms) for (const l of f.lines) {
      allowedTok.add(F.bandLabel(l.band));
      allowedTok.add(F.DISCLOSED_POINTS[F.bandLabel(l.band)].label);
    }
    // A linked public award under the graph is the third kind of figure allowed:
    // its published obligation, to the cent, and only where overlap() lists it.
    const ov = F.overlap(pid);
    for (const a of (ov && ov.awards) || []) allowedTok.add(dollars(a.obligated));
    let vis = visible(unesc(graph));
    for (const t of forms.flatMap((f) => f.lines.map((l) => l.asset)).sort((x, y) => y.length - x.length)) {
      vis = vis.split(t).join(" ");
    }
    const toks = vis.match(/\$[\d.,]+[KM]?(?:–[\d.,]+[KM]?)?/g) || [];
    ok(toks.length > 0, `${pid}: the graph prints bands and points`);
    for (const t of toks) ok(allowedTok.has(t), `${pid}: "${t}" is a filed band or a point a stored line carries`);
    ok(!/%/.test(vis), `${pid}: no percent outside a filed asset name`);
    for (const bad of ["total", "sum of", "combined", "altogether", "average", "estimated",
                       "net worth of", "per year", "change", "grew", "growth"]) {
      lacks(vis.toLowerCase(), bad, `${pid}: the graph prints no summed or reduced figure ("${bad}")`);
    }
    has(visible(graph), "is not drawn; the form linked above lists every line",
      `${pid}: the graph says lines off the ladder are not drawn`);
  }

  // The members with a document but no drawable line keep their block as it was.
  for (const pid of ["owens", "mike_johnson"]) {
    const blk = L.wealthBlockHtml(pid, ROSTER[pid]);
    has(visible(blk), "FD on file", `${pid}: the block reports the form`);
    lacks(blk, "pdx-bands", `${pid}: …and draws no graph, because no line sits on the ladder`);
  }
  has(FIN_SRC, "Owens: his 2025 form", "the table says why Owens has none");
  has(FIN_SRC, "Mike Johnson: every annual report", "…and why Mike Johnson has none");

  // The gate still refuses a shipped row whose newest form points at a different year or URL.
  const nf = SHIPPED_HOLDINGS.bmoore.forms;
  const last = nf[nf.length - 1];
  for (const [what, patch] of [["year", { year: 2026 }],
      ["url", { formUrl: "https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2025/10074824.pdf" }]]) {
    const W = box({ holdings: { bmoore: { forms: nf.slice(0, -1).concat([{ ...last, ...patch }]) } } });
    ok(W.PDXFinance.holdingsDefects().some((d) => /does not match the document row/.test(d)),
      `a shipped row whose newest form points at a different ${what} is refused by the gate`);
    lacks(W.PDXFinanceLane.wealthBlockHtml("bmoore", ROSTER.bmoore), "pdx-bands", `…and draws nothing (${what})`);
  }
  // …and an older form filed under the wrong year's path.
  {
    const bad = nf.map((f, i) => (i === 0 ? { ...f, year: 2020 } : f));
    const W = box({ holdings: { bmoore: { forms: bad } } });
    ok(W.PDXFinance.holdingsDefects().some((d) => /not filed under the form.s own year/.test(d)),
      "an older form whose URL is not filed under its own year is refused");
  }

  // Everyone else: no graph, and the empty words.
  let drew = 0, words = 0;
  const rest = Object.keys(ROSTER).filter((id) => !SHIPPED_HOLDINGS[id]);
  for (const id of rest) {
    const blk = L.wealthBlockHtml(id, ROSTER[id]);
    if (/<div class="pdx-bands"/.test(blk)) drew++;
    if (!SHIPPED_DOCS[id] && visible(blk).indexOf("No in-office wealth file on hand") < 0) words++;
  }
  eq(drew, 0, `no block without holdings rows draws a graph (${rest.length} pids)`);
  eq(words, 0, "…and every one without a document keeps the empty words");
}

// ── 2 · a person with lines on hand ─────────────────────────────────────────
{
  section("2 · one bar per filed line, each carrying its stored band, grouped and placed by rung");
  const F = FILLED.PDXFinance;
  eq(F.holdingsDefects().length, 0, "the fixture passes the gate");
  const h = F.holdings(PID);
  ok(h && Array.isArray(h.lines), "holdings() answers for the fixture pid");
  eq(h.lines.length, LINES.length, "…with every line");
  eq(Object.keys(h).sort().join(","), "formUrl,lines,rungs,year,years",
    "holdings() returns { year, formUrl, rungs, lines, years } and nothing summed");
  for (const l of h.lines) {
    eq(Object.keys(l).sort().join(","), "asset,band,filed,point,rung", `${l.asset}: a line is asset, band, filed, rung, point`);
    eq(l.point, null, `${l.asset}: a line stored with no midpoint or floor carries no point — exact bands only, as before`);
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
  const gAt = LANE_SRC.indexOf("// ── THE WEALTH GRAPH");
  const gSrc = STRIP(LANE_SRC.slice(gAt, LANE_SRC.indexOf("// ── THE DISCLOSURES BLOCK", gAt)));
  const hAt = FIN_SRC.indexOf("function holdings(pid)");
  const hSrc = STRIP(FIN_SRC.slice(hAt, FIN_SRC.indexOf("// ── COVERAGE", hAt)));
  for (const [name, src] of [["holdingsGraphHtml", gSrc], ["holdings()", hSrc]]) {
    // The basis may be NAMED ("midpoint", "floor"); it may not be COMPUTED here,
    // and no point may be added to another. The only midpoints that exist are
    // DISCLOSED_POINTS' literal entries, pinned against the filed ends in section 7.
    for (const bad of [".reduce(", "/ 2", "/2)", "* 0.5", "parseFloat", "parseInt", "Number(",
                       "+= l.", "+= d.", "point.value +", "+ d.point.value", "total"]) {
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
    ["a midpoint typed as a string", row(null, { midpoint: "$3M" }), "not the disclosed midpoint"],
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
  const gAt = LANE_SRC.indexOf("// ── THE WEALTH GRAPH");
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

// ── 7 · disclosed midpoints and floors ──────────────────────────────────────
{
  section("7 · a disclosed point is the filed box's midpoint or floor, named, and nothing else");
  const F = BARE.PDXFinance;
  // THE LITERAL TABLE, CHECKED AGAINST ARITHMETIC ON THE FILED ENDS. Every filed
  // spelling the ladder knows maps to a rung whose point is the arithmetic middle
  // of that spelling's own two ends — or, for the open top box, its floor.
  eq(Object.keys(F.DISCLOSED_POINTS).join("|"), F.BAND_LADDER.join("|"), "one disclosed point per rung, in ladder order");
  for (const filed of Object.keys(F.FILED_BAND_LABELS)) {
    const p = F.DISCLOSED_POINTS[F.FILED_BAND_LABELS[filed]];
    const norm = filed.replace(/–/g, " - ").replace(/\s+/g, " ");
    const want = expectedPoint(norm);
    ok(want, `${filed}: the test can read the filed box's ends`);
    eq(p.basis, want.field, `${filed}: basis is ${want.field}`);
    eq(p.value, want.value, `${filed}: value is the ${want.field} of the filed ends`);
  }
  eq(F.POINT_METHOD.midpoint, "Midpoint of the filed category", "the midpoint sentence, verbatim");
  eq(F.POINT_METHOD.floor, "Floor of the open-ended category", "the floor sentence, verbatim");

  // A FIXTURE WITH BOTH BASES, on a real document row.
  const mk = (band, extra) => ({ asset: "Example Holding", band, ...extra });
  const PL = [
    mk("$15,001 - $50,000", { midpoint: 32500.5 }),
    mk("$1,000,001 - $5,000,000", { midpoint: 3000000.5 }),
    mk("Over $50,000,000", { floor: 50000000 }),
    mk("$50,001 - $100,000"),
  ];
  const W = box({ holdings: { [PID]: { forms: [
    { year: 2024, formUrl: DOC.formUrl.replace("/2025/", "/2024/").replace(/\d+\.pdf$/, "1.pdf"), lines: [PL[0]] },
    { year: DOC.year, formUrl: DOC.formUrl, lines: PL } ] } } });
  eq(W.PDXFinance.holdingsDefects().length, 0, "a two-form fixture with midpoints and a floor passes the gate");
  const blk = W.PDXFinanceLane.wealthBlockHtml(PID, ROSTER[PID]);
  has(blk, 'data-pdx-point="midpoint"', "a closed box with a stored midpoint draws a mark");
  has(blk, 'data-pdx-point="floor"', "…and the open box with a stored floor draws one");
  eq((blk.match(/data-pdx-point=/g) || []).length, 4, "…one dot per stored point across both years; the line with no stored point draws none");
  has(visible(blk), "$3M midpoint", "the label names the midpoint");
  has(visible(blk), "$50M floor", "…and calls the open box's figure a floor, not a midpoint");
  lacks(visible(blk), "$50M midpoint", "…never a midpoint");
  has(visible(blk), "Midpoint of the filed category", "the source line names the midpoint method");
  has(visible(blk), "Floor of the open-ended category", "…and the floor method");
  has(blk, 'class="pdx-bands-dot is-floor"', "the floor dot is drawn as a ring, not a disc");
  eq([...blk.matchAll(/data-pdx-year="(\d+)" data-pdx-points="(\d+)"/g)].map((m) => m[1] + ":" + m[2]).join(","),
    "2024:1,2025:3", "the year drawing has one column per form, oldest left, one dot per stored point");
  // A SINGLE-YEAR PROFILE STILL DRAWS: one column, its year under it.
  {
    const S = box({ holdings: { [PID]: { year: DOC.year, formUrl: DOC.formUrl, lines: [PL[1], PL[2]] } } });
    const sb = S.PDXFinanceLane.wealthBlockHtml(PID, ROSTER[PID]);
    eq([...sb.matchAll(/data-pdx-year="(\d+)" data-pdx-points="(\d+)"/g)].map((m) => m[1] + ":" + m[2]).join(","),
      String(DOC.year) + ":2", "a single-year profile draws one column with its two dots");
    has(sb, `href="${DOC.formUrl}"`, "…linked to its form");
    has(visible(sb), "Floor of the open-ended category", "…with the source line under it");
  }
  // Only exact bands: no mark, no timeline, no source line, the old copy.
  const E = box({ holdings: { [PID]: { year: DOC.year, formUrl: DOC.formUrl, lines: [PL[3]] } } });
  const eb = E.PDXFinanceLane.wealthBlockHtml(PID, ROSTER[PID]);
  lacks(eb, "data-pdx-point", "a row with only exact bands draws no mark");
  lacks(eb, "pdx-yrs", "…and no year drawing");
  has(eb, 'data-pdx-band="$50,001 - $100,000"', "…but still draws its band, as before");
  lacks(eb, "How each figure was made", "…and no source line");
  has(visible(eb), "No middle value is worked out", "…and keeps the bands-only copy, as before");

  // THE GATE REFUSES EVERY POINT A FILED BOX DOES NOT DETERMINE.
  const one = (line) => box({ holdings: { [PID]: { year: DOC.year, formUrl: DOC.formUrl, lines: [line] } } }).PDXFinance;
  for (const [what, line, rule] of [
    ["a rounded midpoint", mk("$1,000,001 - $5,000,000", { midpoint: 3000000 }), "not the disclosed midpoint"],
    ["a midpoint from another box", mk("$1,000,001 - $5,000,000", { midpoint: 15000000.5 }), "not the disclosed midpoint"],
    ["a midpoint on the open box", mk("Over $50,000,000", { midpoint: 50000000 }), "not the disclosed midpoint"],
    ["a floor on a closed box", mk("$1,000,001 - $5,000,000", { floor: 1000001 }), "not the floor"],
    ["both a midpoint and a floor", mk("Over $50,000,000", { midpoint: 1, floor: 50000000 }), "both a midpoint and a floor"],
    ["a midpoint on an off-ladder box", mk("$1 - $1,000", { midpoint: 500.5 }), "not a filed category"],
    ["a midpoint with no band", { asset: "x", midpoint: 8000.5 }, "not a filed category"],
    ["an estimate field", mk("$1,001 - $15,000", { estimate: 9000 }), "unrecognised field estimate"],
  ]) {
    const D = one(line);
    ok(D.holdingsDefects().some((d) => d.indexOf(rule) >= 0), `${what}: refused ("${rule}")`);
    eq(D.holdings(PID), null, `${what}: …and nothing is read`);
  }

  // THE PILLS AND THE WALL. Byte-identical with the shipped timelines, with the
  // fixture, and with the table emptied.
  const EMPTY = box({ holdings: {} });
  for (const id of Object.keys(SHIPPED_TIMELINES).concat(["mike_johnson", "owens"])) {
    for (const [name, X] of [["shipped", BARE], ["fixture", W]]) {
      eq(X.PDXFinanceLane.letterheadChipHtml(id), EMPTY.PDXFinanceLane.letterheadChipHtml(id),
        `${id}: the receipts pill is byte-identical (${name} vs empty holdings)`);
      eq(X.PDXFinanceLane.wealthLetterheadChipHtml(id, ROSTER[id]),
        EMPTY.PDXFinanceLane.wealthLetterheadChipHtml(id, ROSTER[id]),
        `${id}: …and so is the disclosure pill (${name})`);
    }
    const pill = visible(BARE.PDXFinanceLane.wealthLetterheadChipHtml(id, ROSTER[id]));
    has(pill, "FD on file", `${id}: the disclosure pill is a document chip`);
    ok(!/\$/.test(pill), `${id}: …with no dollar figure on it`);
  }
  // The disclosure module still cannot see a campaign figure, and the points
  // table holds numbers only — no code path from it reaches the receipts lane.
  const pts = STRIP(FIN_SRC.slice(FIN_SRC.indexOf("var DISCLOSED_POINTS"), FIN_SRC.indexOf("function holdings(pid)")));
  for (const bad of ["receipts", "filing(", "FTM", "PDXFinanceLane", "Math.", "/ 2"]) {
    lacks(pts, bad, `the disclosed-points code reaches no campaign figure and computes nothing ("${bad}")`);
  }
}

// ── 8 · committee overlap and related awards ────────────────────────────────
{
  section("8 · a filed defense holding beside a defense committee seat, and the company's public awards");
  const F = BARE.PDXFinance, L = BARE.PDXFinanceLane;
  eq(F.overlapDefects().length, 0, "the shipped seat and award tables pass their gate");
  const withOverlap = Object.keys(SHIPPED_TIMELINES).filter((pid) => F.overlap(pid));
  eq(withOverlap.join(","), "bmoore", "only Moore has an overlap on file among the timeline members");
  for (const pid of Object.keys(SHIPPED_TIMELINES).concat(["mike_johnson", "owens"])) {
    if (pid === "bmoore") continue;
    lacks(L.wealthBlockHtml(pid, ROSTER[pid]), "pdx-overlap", `${pid}: no overlap on file, so no section at all`);
  }

  const o = F.overlap("bmoore");
  eq(o.items.map((i) => i.ticker + ":" + i.committee + ":" + i.forms.map((f) => f.year).join("/")).sort().join(","),
    "BA:HASC:2021/2022,RTX:HASC:2021/2022", "Moore: BA and RTX, on House Armed Services, 2021 and 2022");
  // DERIVED, NOT TYPED: every flagged year has a stored line naming the ticker
  // on that year's form, inside the seat's years.
  const forms = SHIPPED_HOLDINGS.bmoore.forms;
  for (const it of o.items) {
    for (const f of it.forms) {
      const form = forms.find((x) => String(x.year) === f.year);
      ok(form.lines.some((l) => l.asset.indexOf(`(${it.ticker})`) >= 0),
        `${it.ticker} ${f.year}: a stored line on that year's form names the ticker`);
      eq(f.formUrl, form.formUrl, `${it.ticker} ${f.year}: …and the flag links that form`);
    }
  }
  // HELD OFF THE COMMITTEE IS NOT AN OVERLAP. Moore's 2023 form still lists both,
  // and he was no longer on Armed Services, so 2023 is not flagged.
  const f23 = forms.find((x) => x.year === 2023);
  ok(f23.lines.some((l) => /\(BA\)/.test(l.asset)) && f23.lines.some((l) => /\(RTX\)/.test(l.asset)),
    "Moore's 2023 form still carries BA and RTX lines");
  ok(o.items.every((i) => i.forms.every((f) => f.year !== "2023")), "…and 2023 is not flagged, because the seat ended with the 117th Congress");

  const blk = L.wealthBlockHtml("bmoore", ROSTER.bmoore);
  const vis = visible(blk);
  has(vis, "Holds BA while on House Armed Services.", "the BA sentence, verbatim");
  has(vis, "Holds RTX while on House Armed Services.", "the RTX sentence, verbatim");
  has(blk, 'href="https://www.govinfo.gov/content/pkg/BILLS-117hres63eh/html/BILLS-117hres63eh.htm"',
    "the committee roster record is linked");
  for (const y of ["2021", "2022"]) {
    const url = forms.find((x) => String(x.year) === y).formUrl;
    ok(blk.split(`href="${url}"`).length - 1 >= 2, `the ${y} annual report is linked from the flag as well as from its column`);
  }
  ok(blk.indexOf("pdx-overlap") > blk.indexOf("pdx-bands-src"), "the section sits under the graph and its source line");

  // THE AWARDS: one per company per graph year, each a linked public award.
  const graphYears = forms.map((f) => String(f.year));
  const rows = [...blk.matchAll(/<li class="pdx-overlap-award" data-pdx-award="([^"]+)" data-pdx-obligated="([^"]+)"><a href="([^"]+)"[\s\S]*?<\/li>/g)];
  eq(rows.length, 2 * graphYears.length, "one award line per company per year the graph covers");
  for (const [li, id, amt, url] of rows) {
    ok(/^https:\/\/www\.usaspending\.gov\/award\/CONT_AWD_/.test(url) && url.indexOf(id) > 0,
      `${id}: links its own USASpending award page`);
    has(visible(li), dollars(+amt), `${id}: …and prints the published obligation, to the cent`);
    eq((visible(li).match(/\$[\d,.]+/g) || []).length, 1, `${id}: …and no other dollar figure`);
  }
  eq(o.awards.map((a) => a.ticker + a.year).sort().join(","),
    graphYears.flatMap((y) => ["BA" + y, "RTX" + y]).sort().join(","), "…each ticker once in each graph year");
  const ovText = visible(blk.slice(blk.indexOf('<div class="pdx-overlap"')));
  for (const bad of ["total", "combined", "sum of", "altogether", "net worth", "% ", "per year", "profit of", "earned"]) {
    lacks(ovText.toLowerCase(), bad, `the overlap section prints no summed or derived figure ("${bad}")`);
  }
  // No equity language in PolitiDex's own copy for this section.
  const oAt = LANE_SRC.indexOf("// ── COMMITTEE OVERLAP, UNDER THE GRAPH");
  const oSrc = STRIP(LANE_SRC.slice(oAt, LANE_SRC.indexOf("function holdingsGraphHtml", oAt))).toLowerCase();
  for (const bad of ["stock", "share", "equity", "form c", "conflict", "corrupt", "suspicious", ".reduce(", "+= a."]) {
    lacks(oSrc, bad, `the overlap renderer carries no "${bad}"`);
  }

  // EITHER SIDE MISSING, NO SECTION.
  {
    const noAwards = box(); noAwards.PDXFinance._setOverlapTables(null, {});
    eq(noAwards.PDXFinance.overlap("bmoore"), null, "no awards on file: overlap() is null");
    lacks(noAwards.PDXFinanceLane.wealthBlockHtml("bmoore", ROSTER.bmoore), "pdx-overlap", "…and no section");
    const noSeats = box(); noSeats.PDXFinance._setOverlapTables({}, null);
    eq(noSeats.PDXFinance.overlap("bmoore"), null, "no seat on file: overlap() is null");
    lacks(noSeats.PDXFinanceLane.wealthBlockHtml("bmoore", ROSTER.bmoore), "pdx-overlap", "…and no section");
    const off = box(); off.PDXFinance._setOverlapTables({ bmoore: [{ committee: "HASC", congress: 119, years: [2025, 2026],
      rosterUrl: "https://www.govinfo.gov/x", rosterLabel: "x" }] }, null);
    eq(off.PDXFinance.overlap("bmoore"), null, "a seat in years with no covered holding on file draws nothing");
  }
  // THE GATE.
  const seat = (patch) => ({ bmoore: [{ committee: "HASC", congress: 117, years: [2021, 2022],
    rosterUrl: "https://www.govinfo.gov/x", rosterLabel: "x", ...patch }] });
  const award = (patch) => ({ BA: [{ year: 2021, awardId: "W58RGZ21C0015", recipient: "THE BOEING COMPANY",
    agency: "Department of the Army", description: "x", obligated: 1,
    url: "https://www.usaspending.gov/award/CONT_AWD_W58RGZ21C0015_9700_-NONE-_-NONE-", ...patch }] });
  for (const [what, seats, awards, rule] of [
    ["a committee that is not covered", seat({ committee: "WAYS" }), null, "not a covered committee"],
    ["a roster that is not .gov", seat({ rosterUrl: "https://example.com/roster" }), null, ".gov roster"],
    ["a seat with a stored overlap", seat({ ticker: "BA" }), null, "unrecognised field ticker"],
    ["an award off USASpending/SAM", null, award({ url: "https://example.com/award/W58RGZ21C0015" }), "USASpending or SAM.gov"],
    ["an award url for another award", null, award({ url: "https://www.usaspending.gov/award/CONT_AWD_OTHER" }), "own award id"],
    ["an amount typed as a string", null, award({ obligated: "$3.4B" }), "published positive amount"],
    ["a profit field", null, award({ profit: 5 }), "unrecognised field profit"],
    ["awards for a ticker off the list", null, { MSFT: award({}).BA }, "not on the list"],
  ]) {
    const X = box(); X.PDXFinance._setOverlapTables(seats, awards);
    ok(X.PDXFinance.overlapDefects().some((d) => d.indexOf(rule) >= 0), `${what}: refused ("${rule}")`);
    eq(X.PDXFinance.overlap("bmoore"), null, `${what}: …and nothing prints`);
  }
  // THE PILLS, with the overlap tables filled and emptied.
  const E = box(); E.PDXFinance._setOverlapTables({}, {});
  for (const id of ["bmoore", "maloy", "kennedy"]) {
    eq(BARE.PDXFinanceLane.letterheadChipHtml(id), E.PDXFinanceLane.letterheadChipHtml(id),
      `${id}: the receipts pill is byte-identical with the overlap on and off`);
    eq(BARE.PDXFinanceLane.wealthLetterheadChipHtml(id, ROSTER[id]), E.PDXFinanceLane.wealthLetterheadChipHtml(id, ROSTER[id]),
      `${id}: …and so is the disclosure pill`);
    lacks(BARE.PDXFinanceLane.wealthLetterheadChipHtml(id, ROSTER[id]), "Holds ", `${id}: the overlap never reaches a pill`);
  }
}

// ── 9 · the President's OGE forms ───────────────────────────────────────────
{
  section("9 · Trump's OGE 278e reports: year columns, disclosed points, the office overlap");
  const OGE_SRC = R("pdx-fd-oge.js");
  const OGE = new Function("window", OGE_SRC.replace(/^[\s\S]*?var ROWS = /, "return ").replace(/;\s*if \(W\.PDXFinance[\s\S]*$/, ";"))({});
  const T = OGE.trump;
  const DOC_T = SHIPPED_DOCS.trump;
  ok(DOC_T && /^https:\/\/extapps2\.oge\.gov\//.test(DOC_T.formUrl), "trump's document row is OGE's own posting");

  // BEFORE THE DATA FILE: a placeholder in words, no graph, and the file named.
  eq(BARE.PDXFinance.lazyHoldingsSrc("trump"), "/pdx-fd-oge.js", "trump's lines live in /pdx-fd-oge.js");
  eq(BARE.PDXFinance.holdings("trump"), null, "…and holdings() is null until it arrives");
  const pre = BARE.PDXFinanceLane.wealthBlockHtml("trump", ROSTER.trump);
  has(pre, 'data-pdx-bands-wait="trump"', "the block draws a placeholder while the lines load");
  lacks(pre, '<div class="pdx-bands"', "…and no graph");
  lacks(visible(pre.slice(pre.indexOf("pdx-bands-wait"))).replace(/Coverage[\s\S]*$/, ""), "$", "…and no figure");
  ok(!/pdx-fd-oge\.js/.test(R("sw.js").slice(R("sw.js").indexOf("const SHELL_ASSETS"))),
    "the data file is not in the service worker's precached shell");
  for (const doc of ["index.html", "person.html"]) lacks(R(doc), "pdx-fd-oge.js", `${doc} does not load it up front`);

  // AFTER: the same gate, every form, every line, every point.
  const X = box({ oge: true });
  const F = X.PDXFinance, L = X.PDXFinanceLane;
  eq(F.holdingsDefects().length, 0, "trump's rows pass the holdings gate");
  eq(F.lazyHoldingsSrc("trump"), "", "…and once merged, nothing is left to fetch");
  eq(T.forms.map((f) => f.year).join(","), "2024,2025", "two forms: calendar 2024 and 2025");
  eq(T.forms.map((f) => f.lines.length).join(","), "1854,4826", "…with 1,854 and 4,826 lines on the ladder");
  const last = T.forms[T.forms.length - 1];
  eq(String(last.year), String(DOC_T.year), "the newest form is the pill's year");
  eq(last.formUrl, DOC_T.formUrl, "…and the pill's .gov URL");
  ok(T.forms.every((f) => /^https:\/\/extapps2\.oge\.gov\/201\/Presiden\.nsf\//.test(f.formUrl)), "every form is on OGE's presidential index");
  let badPoint = 0, badBand = 0, badKeys = 0;
  for (const f of T.forms) for (const l of f.lines) {
    const want = expectedPoint(l.band);
    if (!want || l[want.field] !== want.value) badPoint++;
    if (!Object.prototype.hasOwnProperty.call(F.FILED_BAND_LABELS, l.band) || !/ - | to |^Over /.test(l.band)) badBand++;
    if (Object.keys(l).sort().join(",") !== ["asset", "band", want ? want.field : "?"].sort().join(",")) badKeys++;
  }
  eq(badPoint, 0, "every stored midpoint or floor is the one its filed box determines");
  eq(badBand, 0, "…every band is a filed category in the form's own spelling");
  eq(badKeys, 0, "…and every line is asset, band and one disclosed point");
  const floors = T.forms.flatMap((f) => f.lines).filter((l) => "floor" in l);
  ok(floors.length > 0 && floors.every((l) => /^Over \$50,000,000$/.test(l.band) && l.floor === 50000000),
    `the open top box is stored as its floor (${floors.length} lines)`);

  const blk = L.wealthBlockHtml("trump", ROSTER.trump);
  has(blk, 'data-pdx-drawing="years"', "the block draws the year columns");
  const cols = [...blk.matchAll(/<li class="pdx-yrs-band" data-pdx-year="(\d+)" data-pdx-points="(\d+)" style="[^"]*">([\s\S]*?)<\/li>/g)];
  eq(cols.map((c) => c[1]).join(","), "2024,2025", "one column per form, oldest left");
  for (const [, y, n, body] of cols) {
    const f = T.forms.find((x) => String(x.year) === y);
    eq(+n, f.lines.length, `${y}: the column counts every stored line`);
    has(body, `href="${f.formUrl}"`, `${y}: …and links that year's OGE PDF`);
    eq(bars(body).map((b) => F.bandLabel(b)).concat(moreOf(body)).sort().join("|"), f.lines.map((l) => F.bandLabel(l.band)).sort().join("|"),
      `${y}: …its dots plus each dense box's printed remainder are exactly that year's stored bands`);
    ok((body.match(/class="pdx-bands-dot/g) || []).length <= 24 * 10, `${y}: …and it draws at most 24 dots per box`);
  }
  has(visible(blk), "Floor of the open-ended category", "the source line names the floor method");
  has(visible(blk), "Midpoint of the filed category", "…and the midpoint method");

  // NO DOLLAR FIGURE THAT IS NOT A BAND, A STORED POINT OR A LINKED AWARD.
  const ov = F.overlap("trump");
  const allowed = new Set();
  for (const f of T.forms) for (const l of f.lines) {
    allowed.add(F.bandLabel(l.band)); allowed.add(F.DISCLOSED_POINTS[F.bandLabel(l.band)].label);
  }
  for (const a of ov.awards) allowed.add(dollars(a.obligated));
  const graph = L.holdingsGraphHtml("trump");
  let gv = visible(unesc(graph));
  const toks = gv.match(/\$[\d.,]+[KM]?(?:–[\d.,]+[KM]?)?/g) || [];
  const stray = toks.filter((t) => !allowed.has(t));
  eq(stray.length, 0, `no dollar figure outside a band, a stored point or a linked award (${stray.slice(0, 5).join(", ")})`);
  for (const bad of ["total", "net worth of", "combined", "per year", "% change", "profit of"]) {
    lacks(gv.toLowerCase(), bad, `trump's graph prints no summed or derived figure ("${bad}")`);
  }

  // THE OFFICE OVERLAP: shares of a listed company on a form from a year in office.
  eq(ov.items.map((i) => i.kind + ":" + i.ticker + ":" + i.forms.map((f) => f.year).join("/")).sort().join(","),
    "office:BA:2025,office:GD:2025,office:HII:2025,office:LHX:2025,office:LMT:2025,office:NOC:2025,office:RTX:2025",
    "all seven listed companies, on the 2025 form, while in office");
  const f24 = T.forms.find((f) => f.year === 2024);
  ok(f24.lines.some((l) => /LOCKHEED MARTIN/.test(l.asset)), "the 2024 form also lists Lockheed Martin…");
  ok(ov.items.every((i) => i.forms.every((f) => f.year === "2025")), "…but 2024 is not flagged: he took office in January 2025");
  for (const t of ["LMT", "RTX", "BA", "GD", "NOC", "HII", "LHX"]) {
    has(visible(blk), `Held ${t} while in office.`, `the ${t} sentence, verbatim`);
  }
  has(visible(blk), "office: President of the United States", "…naming the office");
  has(blk, `href="${DOC_T.formUrl}"`, "…and linking the report that records the date of appointment");
  const rows = [...blk.matchAll(/<li class="pdx-overlap-award" data-pdx-award="([^"]+)" data-pdx-obligated="([^"]+)"><a href="([^"]+)"/g)];
  eq(rows.length, 7 * 2, "one award line per company per graph year (7 companies, 2024 and 2025)");
  ok(rows.every(([, id, , url]) => /^https:\/\/www\.usaspending\.gov\/award\//.test(url) && url.indexOf(id) > 0),
    "…each linked to its own USASpending award page");
  // A note or bond of the company is not a holding of its shares.
  {
    const D = box({ holdings: { trump: { forms: [{ year: 2025, formUrl: DOC_T.formUrl, lines: [
      { asset: "THE BOEING COMPANY SENIOR UNSECURED NOTE DUE 05/01/2027", band: "$1,000,001 - $5,000,000", midpoint: 3000000.5 }] }] } } });
    eq(D.PDXFinance.overlap("trump"), null, "a form whose only Boeing line is a note draws no overlap");
    lacks(D.PDXFinanceLane.wealthBlockHtml("trump", ROSTER.trump), "pdx-overlap", "…and no section");
  }
  // A FORM WITH NO LADDER LINES DRAWS NOTHING.
  {
    const E = box({ holdings: { trump: { forms: [
      { year: 2024, formUrl: T.forms[0].formUrl, lines: [] }, { year: 2025, formUrl: DOC_T.formUrl, lines: [] }] } } });
    eq(E.PDXFinance.holdings("trump"), null, "a timeline whose forms carry no ladder line is refused");
    lacks(E.PDXFinanceLane.wealthBlockHtml("trump", ROSTER.trump), 'class="pdx-bands', "…and draws nothing");
  }
  // THE MERGE DOOR: listed pids only, once.
  eq(X.PDXFinance._mergeHoldings({ bmoore: { forms: [] } }), 0, "a pid not listed for a data file cannot merge rows");
  eq(X.PDXFinance._mergeHoldings(OGE), 0, "…and trump's rows merge only once");
  // A row pointing at a different year or URL is still refused.
  {
    const bad = box({ holdings: { trump: { forms: [T.forms[0], { ...last, formUrl: T.forms[0].formUrl.replace("4EC9", "0000") }] } } });
    ok(bad.PDXFinance.holdingsDefects().some((d) => /does not match the document row/.test(d)), "a newest form with the wrong URL is refused");
  }
  // THE PILLS, byte for byte, with the data file in and out.
  for (const id of ["trump", "bmoore", "kennedy"]) {
    eq(X.PDXFinanceLane.letterheadChipHtml(id), BARE.PDXFinanceLane.letterheadChipHtml(id), `${id}: receipts pill identical with the OGE lines loaded`);
    eq(X.PDXFinanceLane.wealthLetterheadChipHtml(id, ROSTER[id]), BARE.PDXFinanceLane.wealthLetterheadChipHtml(id, ROSTER[id]),
      `${id}: …and the disclosure pill`);
  }
  ok(!/\$/.test(visible(X.PDXFinanceLane.wealthLetterheadChipHtml("trump", ROSTER.trump))), "trump's pill carries no dollar figure");
  // No equity language in PolitiDex's own copy for the office sentence.
  const oAt = LANE_SRC.indexOf("// ── COMMITTEE OVERLAP, UNDER THE GRAPH");
  const oSrc = STRIP(LANE_SRC.slice(oAt, LANE_SRC.indexOf("function holdingsGraphHtml", oAt))).toLowerCase();
  for (const bad of ["stock", "share", "equity", "form c"]) lacks(oSrc, bad, `the overlap copy carries no "${bad}"`);
}

// ── 10 · the summary line under each year column ────────────────────────────
{
  section("10 · every year column carries '<year> · <n> lines · highest band <point>'");
  const X = box({ oge: true });
  const F = X.PDXFinance, L = X.PDXFinanceLane;
  const OGE = new Function("window", R("pdx-fd-oge.js").replace(/^[\s\S]*?var ROWS = /, "return ").replace(/;\s*if \(W\.PDXFinance[\s\S]*$/, ";"))({});
  const rows = { ...SHIPPED_HOLDINGS, trump: OGE.trump };
  // The expected line, worked out from the stored rows alone: the count of
  // stored lines, and the highest box by its disclosed point.
  const expectLine = (f) => {
    let best = null;
    for (const l of f.lines) {
      const v = expectedPoint(l.band).value;
      if (!best || v > best.v) best = { v, band: l.band };
    }
    const p = F.DISCLOSED_POINTS[F.bandLabel(best.band)];
    const n = f.lines.length;
    return `${f.year} · ${n.toLocaleString("en-US")} ${n === 1 ? "line" : "lines"} · highest band ${p.label} ${p.basis}`;
  };
  let checked = 0;
  for (const pid of Object.keys(SHIPPED_TIMELINES).concat(["trump"])) {
    const blk = L.wealthBlockHtml(pid, ROSTER[pid]);
    const sums = [...blk.matchAll(/<li class="pdx-yrs-band" data-pdx-year="(\d+)"[\s\S]*?<span class="pdx-yrs-sum"[^>]*>([\s\S]*?)<\/span><\/span>[\s\S]*?<\/li>/g)]
      .map((m) => [m[1], unesc(m[2].replace(/<[^>]+>/g, ""))]);
    const forms = rows[pid].forms.filter((f) => f.lines.length);
    eq(sums.map((x) => x[0]).join(","), forms.map((f) => String(f.year)).join(","), `${pid}: one summary per drawn column, oldest first`);
    for (const f of forms) {
      const got = (sums.find((x) => x[0] === String(f.year)) || [])[1];
      eq(got, expectLine(f), `${pid} ${f.year}: the summary line`);
      checked++;
    }
    // The summary sits under its column's marks, inside the column's link.
    ok(sums.length === 0 || /<span class="pdx-yrs-plot"[\s\S]*?<\/span><span class="pdx-yrs-sum"/.test(blk), `${pid}: the summary sits under the marks`);
  }
  ok(checked >= 30, `every drawn year column was checked (${checked})`);
  has(visible(L.wealthBlockHtml("trump", ROSTER.trump)), "2025 · 4,826 lines · highest band $50M floor", "trump 2025, verbatim");
  has(visible(L.wealthBlockHtml("bmoore", ROSTER.bmoore)), "2025 · 16 lines · highest band $3M midpoint", "Moore 2025, verbatim");
  // A YEAR WITH NO LADDER LINES DRAWS NOTHING: Scalise's 2025 form carries none.
  const sc = L.wealthBlockHtml("scalise", ROSTER.scalise);
  lacks(sc, 'data-pdx-year="2025"', "Scalise 2025: no column");
  lacks(visible(sc), "2025 · ", "…and no summary line");
  // NO NEW DOLLAR FIGURE: every figure in a summary is a stored point's label.
  for (const pid of ["trump", "bmoore", "kennedy", "jeffries"]) {
    const blk = L.wealthBlockHtml(pid, ROSTER[pid]);
    const labels = new Set(Object.values(F.DISCLOSED_POINTS).map((p) => p.label));
    for (const m of blk.matchAll(/<span class="pdx-yrs-hi">([^<]*)</g)) {
      const t = (unesc(m[1]).match(/\$[\d.,]+[KM]?/g) || []);
      ok(t.length === 1 && labels.has(t[0]), `${pid}: summary figure "${t[0]}" is a disclosed point`);
    }
    for (const m of blk.matchAll(/<span class="pdx-yrs-n">([^<]*)</g)) {
      ok(!/\$/.test(m[1]), `${pid}: the line count carries no dollar sign ("${m[1]}")`);
    }
  }
  // THE PILLS, with the summary present and removed.
  const OFF = box({ oge: true });
  OFF.PDXFinanceLane._setYearSummary(false);
  lacks(OFF.PDXFinanceLane.wealthBlockHtml("trump", ROSTER.trump), "pdx-yrs-sum", "the seam removes the summary line");
  for (const id of ["trump", "bmoore", "kennedy", "scalise", "aoc"]) {
    eq(OFF.PDXFinanceLane.letterheadChipHtml(id), X.PDXFinanceLane.letterheadChipHtml(id), `${id}: receipts pill identical with the summary removed`);
    eq(OFF.PDXFinanceLane.wealthLetterheadChipHtml(id, ROSTER[id]), X.PDXFinanceLane.wealthLetterheadChipHtml(id, ROSTER[id]),
      `${id}: …and the disclosure pill`);
  }
  // Everything else under the graph is unchanged by the summary.
  const on = X.PDXFinanceLane.wealthBlockHtml("trump", ROSTER.trump);
  const off = OFF.PDXFinanceLane.wealthBlockHtml("trump", ROSTER.trump);
  const cut = (h) => h.slice(h.indexOf('<p class="pdx-bands-src"'));
  eq(cut(on), cut(off), "the source line, the overlap section and the award list are byte-identical with the summary on and off");
  eq((on.match(/class="pdx-bands-dot/g) || []).length, (off.match(/class="pdx-bands-dot/g) || []).length, "…and so are the dots");
  // No equity language in the summary copy.
  const sAt = LANE_SRC.indexOf("THE SUMMARY LINE:");
  const sSrc = STRIP(LANE_SRC.slice(sAt, LANE_SRC.indexOf("bands.push(", sAt))).toLowerCase();
  for (const bad of ["stock", "share", "equity", "total", "net worth", "%"]) lacks(sSrc, bad, `the summary code carries no "${bad}"`);
}

// ── 11 · one continuous graph across every year ─────────────────────────────
{
  section("11 · one graph per person: every year's band on one year axis, oldest left");
  const X = box({ oge: true });
  const F = X.PDXFinance, L = X.PDXFinanceLane;
  const OGE = new Function("window", R("pdx-fd-oge.js").replace(/^[\s\S]*?var ROWS = /, "return ").replace(/;\s*if \(W\.PDXFinance[\s\S]*$/, ";"))({});
  const rows = { ...SHIPPED_HOLDINGS, trump: OGE.trump };
  for (const pid of Object.keys(SHIPPED_TIMELINES).concat(["trump"])) {
    const blk = L.wealthBlockHtml(pid, ROSTER[pid]);
    const forms = rows[pid].forms.filter((f) => f.lines.length);
    eq((blk.match(/class="pdx-yrs"/g) || []).length, 1, `${pid}: one graph`);
    eq((blk.match(/class="pdx-yrs-area"/g) || []).length, 1, `${pid}: …with one shared plot area`);
    eq((blk.match(/class="pdx-yrs-bands"/g) || []).length, 1, `${pid}: …holding every year's band`);
    lacks(blk, "pdx-yrs-col", `${pid}: no per-year column boxes remain`);
    const bands = [...blk.matchAll(/<li class="pdx-yrs-band" data-pdx-year="(\d+)" data-pdx-points="(\d+)" style="left:([\d.]+)%;width:([\d.]+)%">([\s\S]*?)<\/li>/g)]
      .map((m) => ({ year: +m[1], n: +m[2], left: +m[3], width: +m[4], body: m[5] }));
    eq(bands.map((b) => b.year).join(","), forms.map((f) => f.year).join(","), `${pid}: every year with a ladder line, left to right`);
    const y0 = forms[0].year, span = forms[forms.length - 1].year - y0 + 1;
    for (const b of bands) {
      const f = forms.find((x) => x.year === b.year);
      ok(Math.abs(b.left - 100 * (b.year - y0) / span) < 0.001 && Math.abs(b.width - 100 / span) < 0.001,
        `${pid} ${b.year}: the band sits at its year's slot on the axis`);
      eq(b.n, f.lines.length, `${pid} ${b.year}: …counts that year's stored lines`);
      eq(bars(b.body).map((x) => F.bandLabel(x)).concat(moreOf(b.body)).sort().join("|"),
        f.lines.map((l) => F.bandLabel(l.band)).sort().join("|"), `${pid} ${b.year}: …its dots (and dense-box remainders) are that year's lines`);
      ok((b.body.match(/class="pdx-bands-dot/g) || []).length <= 24 * 10, `${pid} ${b.year}: …capped at 24 dots per box`);
      has(b.body, `href="${f.formUrl}"`, `${pid} ${b.year}: …linked to that year's PDF`);
      ok(b.body.indexOf('class="pdx-yrs-sum"') > b.body.indexOf('class="pdx-yrs-plot"'), `${pid} ${b.year}: …with its summary under its dots`);
    }
    ok(bands.every((b, i) => i === 0 || b.left > bands[i - 1].left), `${pid}: bands run strictly left to right`);
  }
  // Scalise's empty 2025 is absent; his axis runs 2021–2024.
  const sc = L.wealthBlockHtml("scalise", ROSTER.scalise);
  lacks(sc, 'data-pdx-year="2025"', "a year with no ladder lines is absent from the axis");
  has(sc, "--pdx-yrs-span:4", "…and the axis spans only the years drawn");
  // Pills, byte for byte.
  for (const id of ["trump", "bmoore", "maloy", "kennedy", "jeffries", "scalise", "jim_jordan", "aoc"]) {
    eq(X.PDXFinanceLane.wealthLetterheadChipHtml(id, ROSTER[id]), BARE.PDXFinanceLane.wealthLetterheadChipHtml(id, ROSTER[id]), `${id}: disclosure pill identical`);
    eq(X.PDXFinanceLane.letterheadChipHtml(id), BARE.PDXFinanceLane.letterheadChipHtml(id), `${id}: receipts pill identical`);
  }
}

// ── 12 · the second graph: one range bar per year ───────────────────────────
{
  section("12 · a range bar per year, lowest to highest disclosed point, under the per-line graph");
  const X = box({ oge: true });
  const F = X.PDXFinance, L = X.PDXFinanceLane;
  const OGE = new Function("window", R("pdx-fd-oge.js").replace(/^[\s\S]*?var ROWS = /, "return ").replace(/;\s*if \(W\.PDXFinance[\s\S]*$/, ";"))({});
  const rows = { ...SHIPPED_HOLDINGS, trump: OGE.trump };
  const lnLo = Math.log(8000.5), lnSpan = Math.log(50000000) - lnLo;
  const yAt = (v) => 4 + 92 * (Math.log(v) - lnLo) / lnSpan;
  // Every person with the first graph has the second.
  let firsts = 0;
  for (const id of new Set(Object.keys(ROSTER).concat(["trump"]))) {
    const blk = L.wealthBlockHtml(id, ROSTER[id]);
    const a = blk.indexOf('data-pdx-graph="years"') >= 0, b = blk.indexOf('data-pdx-graph="range"') >= 0;
    if (a) firsts++;
    eq(b, a, `${id}: has the range graph exactly when it has the per-line graph`);
  }
  eq(firsts, 8, "eight people draw the per-line graph, and so the range graph");
  for (const pid of Object.keys(SHIPPED_TIMELINES).concat(["trump"])) {
    const blk = L.wealthBlockHtml(pid, ROSTER[pid]);
    const forms = rows[pid].forms.filter((f) => f.lines.length);
    eq((blk.match(/data-pdx-graph="range"/g) || []).length, 1, `${pid}: one range graph`);
    ok(blk.indexOf('data-pdx-graph="range"') > blk.indexOf('data-pdx-graph="years"') &&
       blk.indexOf('data-pdx-graph="range"') < blk.indexOf('class="pdx-bands-src"'), `${pid}: …under the per-line graph, above the source line`);
    const rng = blk.slice(blk.indexOf('class="pdx-rng-wrap"'), blk.indexOf('class="pdx-bands-src"'));
    lacks(rng, "pdx-bands-dot", `${pid}: the range graph draws no individual dots`);
    const bars = [...rng.matchAll(/<li class="pdx-rng-band" data-pdx-year="(\d+)" data-pdx-range-lo="([^"]+)" data-pdx-range-hi="([^"]+)" style="left:([\d.]+)%;width:([\d.]+)%">([\s\S]*?)<\/li>/g)]
      .map((m) => ({ year: +m[1], lo: unesc(m[2]), hi: unesc(m[3]), left: +m[4], width: +m[5], body: m[6] }));
    eq(bars.map((b) => b.year).join(","), forms.map((f) => f.year).join(","), `${pid}: one bar per year with a ladder line, oldest left`);
    const y0 = forms[0].year, slots = forms[forms.length - 1].year - y0 + 1;
    for (const b of bars) {
      const f = forms.find((x) => x.year === b.year);
      const vals = f.lines.map((l) => expectedPoint(l.band).value);
      const vLo = Math.min(...vals), vHi = Math.max(...vals);
      const pLo = Object.values(F.DISCLOSED_POINTS).find((p) => p.value === vLo);
      const pHi = Object.values(F.DISCLOSED_POINTS).find((p) => p.value === vHi);
      eq(F.DISCLOSED_POINTS[b.lo], pLo, `${pid} ${b.year}: the bar starts at the year's lowest stored point (${pLo.label} ${pLo.basis})`);
      eq(F.DISCLOSED_POINTS[b.hi], pHi, `${pid} ${b.year}: …and ends at its highest (${pHi.label} ${pHi.basis})`);
      const m = /class="pdx-rng-bar[^"]*" style="bottom:([\d.]+)%;height:([\d.]+)%"/.exec(b.body);
      ok(m && Math.abs(+m[1] - yAt(vLo)) < 0.01 && Math.abs(+m[1] + +m[2] - yAt(vHi)) < 0.02,
        `${pid} ${b.year}: …placed on the same log scale`);
      eq((b.body.match(/class="pdx-rng-bar/g) || []).length, 1, `${pid} ${b.year}: one bar`);
      has(b.body, `href="${f.formUrl}"`, `${pid} ${b.year}: …linked to that year's PDF`);
      const sum = unesc((/<span class="pdx-yrs-sum"[^>]*>([\s\S]*?)<\/span><\/span>/.exec(b.body) || [])[1] || "").replace(/<[^>]+>/g, "");
      const n = f.lines.length;
      eq(sum, `${f.year} · ${n.toLocaleString("en-US")} ${n === 1 ? "line" : "lines"} · highest band ${pHi.label} ${pHi.basis}`,
        `${pid} ${b.year}: …with the same summary line under it`);
      ok(Math.abs(b.left - 100 * (b.year - y0) / slots) < 0.001 && Math.abs(b.width - 100 / slots) < 0.001,
        `${pid} ${b.year}: …at its year's slot on the axis`);
    }
    // NO NEW FIGURE: every dollar token in the range graph is a stored point.
    const labels = new Set(Object.values(F.DISCLOSED_POINTS).map((p) => p.label));
    const toks = visible(unesc(rng)).match(/\$[\d.,]+[KM]?/g) || [];
    ok(toks.every((t) => labels.has(t)), `${pid}: every figure in the range graph is a stored point`);
    for (const bad of ["total", "net worth of", "combined", "% change", "sum of", "stock", "share", "equity"]) {
      lacks(visible(rng).toLowerCase(), bad, `${pid}: the range graph prints no "${bad}"`);
    }
  }
  // A year with no ladder lines is absent.
  const sc = L.wealthBlockHtml("scalise", ROSTER.scalise);
  const scr = sc.slice(sc.indexOf('class="pdx-rng-wrap"'), sc.indexOf('class="pdx-bands-src"'));
  lacks(scr, 'data-pdx-year="2025"', "Scalise 2025 draws no range bar");
  // EVERYTHING ELSE IS BYTE-IDENTICAL WITH THE RANGE GRAPH ON AND OFF.
  const OFF = box({ oge: true });
  OFF.PDXFinanceLane._setRangeGraph(false);
  for (const pid of Object.keys(SHIPPED_TIMELINES).concat(["trump"])) {
    const on = X.PDXFinanceLane.wealthBlockHtml(pid, ROSTER[pid]);
    const off = OFF.PDXFinanceLane.wealthBlockHtml(pid, ROSTER[pid]);
    lacks(off, "pdx-rng", `${pid}: the seam removes the range graph`);
    const strip = on.replace(/<div class="pdx-rng-wrap">[\s\S]*?(?=<p class="pdx-bands-src")/, "");
    eq(strip, off, `${pid}: the per-line graph, source line, overlap and awards are byte-identical with the range graph removed`);
    eq(X.PDXFinanceLane.wealthLetterheadChipHtml(pid, ROSTER[pid]), OFF.PDXFinanceLane.wealthLetterheadChipHtml(pid, ROSTER[pid]),
      `${pid}: disclosure pill identical`);
    eq(X.PDXFinanceLane.letterheadChipHtml(pid), OFF.PDXFinanceLane.letterheadChipHtml(pid), `${pid}: receipts pill identical`);
  }
  // No sum in the range code.
  const rAt = LANE_SRC.indexOf("// ── THE SECOND GRAPH");
  const rSrc = STRIP(LANE_SRC.slice(rAt, LANE_SRC.indexOf("// ── COMMITTEE OVERLAP", rAt)));
  for (const bad of [".reduce(", "+= l.point", "+= l.", "total", "stock", "share", "equity"]) lacks(rSrc, bad, `the range code carries no "${bad}"`);
}

// ── 13 · the stylesheet puts both graphs on one left-to-right time axis ─────
{
  section("13 · finance-lane.css lays every year band out on the time axis, in both graphs");
  const CSS = R("finance-lane.css").replace(/\/\*[\s\S]*?\*\//g, "");
  // Every declaration that applies to a class, merged across rules.
  const decl = (cls) => {
    const out = {};
    for (const m of CSS.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const sels = m[1].split(",").map((x) => x.trim());
      if (!sels.some((x) => x === "." + cls)) continue;
      for (const d of m[2].split(";")) {
        const [k, ...v] = d.split(":");
        if (k && v.length) out[k.trim()] = v.join(":").trim();
      }
    }
    return out;
  };
  const X = box({ oge: true });
  const L = X.PDXFinanceLane;
  // The band classes the two graphs actually render, read off the markup.
  const liClasses = new Set();
  for (const pid of Object.keys(SHIPPED_TIMELINES).concat(["trump"])) {
    const blk = L.wealthBlockHtml(pid, ROSTER[pid]);
    for (const m of blk.matchAll(/<li class="(pdx-(?:yrs|rng)-band)"/g)) liClasses.add(m[1]);
  }
  eq([...liClasses].sort().join(","), "pdx-rng-band,pdx-yrs-band", "both graphs render year bands");
  for (const cls of liClasses) {
    const d = decl(cls);
    eq(d.position, "absolute", `.${cls} is absolutely positioned, so its inline left/width place it on the time axis`);
    eq(d.top, "0", `.${cls} …from the top of the field`);
    eq(d.bottom, "0", `.${cls} …to the bottom`);
  }
  eq(decl("pdx-yrs-bands").position, "absolute", ".pdx-yrs-bands is one absolute layer over the whole field");
  eq(decl("pdx-yrs-bands").inset, "0", "…covering it edge to edge");
  eq(decl("pdx-yrs-field").position, "relative", ".pdx-yrs-field is the positioning context for every band");
  ok(/var\(--pdx-yrs-span/.test(decl("pdx-yrs-field")["min-width"] || ""), "…and widens with the number of year slots instead of wrapping");
  eq(decl("pdx-yrs-body")["overflow-x"], "auto", "a long axis scrolls sideways rather than wrapping to a new row");
  for (const cls of ["pdx-yrs-field", "pdx-yrs-bands", "pdx-yrs-band", "pdx-rng-band"]) {
    const d = decl(cls);
    ok(!/wrap/.test(d["flex-wrap"] || "") && !/grid|flex/.test(d.display || ""), `.${cls} has no flex or grid flow that could stack or wrap bands`);
  }
  const bar = decl("pdx-rng-bar");
  eq(bar.position, "absolute", "the range bar is placed by its inline bottom and height");
  eq(bar.left, bar.right, `…and centred in its year's slot (left ${bar.left} = right ${bar.right})`);
  eq(decl("pdx-yrs-plot").position, "relative", "each band's plot is the context its bar and dots are placed in");

  // The range graph's bands, read in order, run strictly left to right in
  // non-overlapping slots, each one slot wide.
  for (const pid of Object.keys(SHIPPED_TIMELINES).concat(["trump"])) {
    const blk = L.wealthBlockHtml(pid, ROSTER[pid]);
    const rng = blk.slice(blk.indexOf('data-pdx-graph="range"'), blk.indexOf('class="pdx-bands-src"'));
    const b = [...rng.matchAll(/<li class="pdx-rng-band" data-pdx-year="(\d+)"[^>]*style="left:([\d.]+)%;width:([\d.]+)%"/g)]
      .map((m) => ({ y: +m[1], l: +m[2], w: +m[3] }));
    ok(b.length > 0, `${pid}: the range graph has bands`);
    ok(b.every((x, i) => i === 0 || (x.y > b[i - 1].y && x.l >= b[i - 1].l + b[i - 1].w - 0.001)),
      `${pid}: range bands run strictly left to right by year, side by side, never overlapping`);
    ok(b.every((x) => x.l >= 0 && x.l + x.w <= 100.001), `${pid}: …all inside one shared plot`);
  }
}

// ── report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ wealth bands: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.error("  · " + f);
  process.exit(1);
}
console.log(`\n✓ wealth bands: ${passed} passed`);
