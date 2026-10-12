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
  const m = /^\$([\d,]+)\s*[-–]\s*\$([\d,]+)$/.exec(band);
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
    "aoc,bmoore,jeffries,jim_jordan,kennedy,maloy,mike_johnson,owens,scalise",
    "the document index is the four Utah rows plus the five-member House batch");

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
    const got = bars(blk);
    const allLines = forms.flatMap((f) => f.lines);
    eq(got.length, allLines.length, `${pid}: the block draws one dot per stored line, across every year`);
    eq(got.slice().sort().join("|"), allLines.map((l) => l.band).sort().join("|"),
      `${pid}: …each carrying the stored band string, byte for byte`);
    // THE HORIZONTAL AXIS IS FILING YEARS: one column per form, oldest left.
    has(blk, 'data-pdx-drawing="years"', `${pid}: the graph is the year drawing`);
    const cols = [...blk.matchAll(/<li class="pdx-yrs-col" data-pdx-year="(\d+)" data-pdx-points="(\d+)">([\s\S]*?)<\/li>/g)];
    const yrs = cols.map((m) => m[1]);
    eq(yrs.join(","), Object.keys(years).join(","), `${pid}: one column per form year, left to right, oldest first`);
    ok(yrs.every((y, i) => i === 0 || +y > +yrs[i - 1]), `${pid}: …strictly ascending`);
    for (const [, y, n, body] of cols) {
      const f = forms.find((x) => String(x.year) === y);
      eq(+n, years[y], `${pid} ${y}: the column draws one dot per stored line`);
      eq(bars(body).sort().join("|"), f.lines.map((l) => l.band).sort().join("|"),
        `${pid} ${y}: …and those dots are that year's stored bands`);
      has(body, `href="${f.formUrl}"`, `${pid} ${y}: the column links that year's .gov PDF`);
      has(visible(body), y, `${pid} ${y}: …and carries its year label`);
      ok(body.indexOf('class="pdx-yrs-year"') > body.indexOf('class="pdx-yrs-plot"'),
        `${pid} ${y}: the year label sits under the column's marks`);
    }
    eq((blk.match(/class="pdx-bands-dot(?: is-floor)?"/g) || []).length, Object.values(years).reduce((a, b) => a + b, 0),
      `${pid}: …and no dot that is not a stored line`);
    // Marks sit on a vertical log scale: a bigger box is a higher dot.
    const ys = [...blk.matchAll(/data-pdx-band="([^"]*)" data-pdx-point="[a-z]+" style="left:[\d.]+%;bottom:([\d.]+)%"/g)]
      .map((m) => [unesc(m[1]), +m[2]]);
    eq(ys.length, allLines.length, `${pid}: every dot has a vertical placement`);
    for (const [band, yv] of ys) {
      const want = 4 + 92 * (Math.log(expectedPoint(band).value) - Math.log(8000.5)) / (Math.log(50000000) - Math.log(8000.5));
      ok(Math.abs(yv - want) < 0.01, `${pid}: "${band}" sits at its point's height on the log scale`);
    }
    // The vertical axis is labelled only at boxes this member's lines use.
    const ticks = [...blk.matchAll(/class="pdx-yrs-tick"[^>]*>([^<]*)</g)].map((m) => unesc(m[1]));
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
    if (/pdx-bands/.test(blk)) drew++;
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

// ── report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ wealth bands: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.error("  · " + f);
  process.exit(1);
}
console.log(`\n✓ wealth bands: ${passed} passed`);
