#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Unit tests for the DOSSIER JOIN — profile-dossier.js + the surfaces it feeds
// ─────────────────────────────────────────────────────────────────────────────
// The profile had seven strong accountability surfaces and no shared story.
// Evidence, Spotlights, the Official Record, Say-vs-Do, Stances, the Voting
// Record and Connecting the Dots each re-told one story in its own vocabulary,
// at its own depth, in whatever order it had been appended. profile-dossier.js
// is the join: one five-link chain — word → action → evidence → issue/spotlight
// → outcome — that every one of those surfaces is expressed in terms of.
//
// A join layer is the easiest place in this app to start lying, because it is
// the one place that speaks for sections it does not own. So these tests are
// organised around the five rules in the module's own header, and each is tried
// rather than trusted:
//
//   1. DERIVE, NEVER ASSERT. Every number a chain row shows must come back out
//      of the same accessor the full section uses. Nothing is recomputed here.
//
//   2. ONE PRIMARY SCORE. The join emits no percentage, ever — not in a row, not
//      in a digest, not in a rail. It points at ⚖️ Word vs Action instead.
//
//   3. NO NEW DATA. With the Locker, the Spotlight registry and the record all
//      absent, every renderer must return '' — never an empty frame, never a
//      guessed label, never a chip standing in for a number it does not have.
//
//   4. LINKS, NOT COPIES. Compression moves depth behind a control; it never
//      deletes it. The compact rail and digest must still reach every
//      destination the full blocks reached.
//
//   5. ONE ISSUE, ONE NAME. The vocabulary that made the page read as separate
//      features is the actual defect being fixed, so the labels are asserted to
//      match the ones Word vs Action resolves.
//
// Sections:
//   1. Load, shape, and the five links
//   2. Rule 3 — nothing invented when the feeds are missing
//   3. Rule 1 — the receipt layer derives from the Locker's own depth index
//   4. Rule 5 — one issue, one name
//   5. Rule 2 — no second percentage anywhere in the join
//   6. The chain: PDXWordAction owns ① ② ⑤, the join adds ③ ④
//   7. Rule 4 — compression by disclosure: the rail and the digest
//   8. IA: the synthesis sits UNDER the score it derives from
//   9. Section rivalry: the surfaces name each other in one vocabulary
//  10. Thomas Massie, the reference profile — the real join, end to end
//  11. Shipping + mobile
//
//   node scripts/test-profile-dossier.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const failures = [];
let passed = 0;
const ok = (cond, msg) => { cond ? passed++ : failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg}\n    expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
// An assertion built on a probe that has been renamed is vacuously true, which
// is a broken harness rather than a passing module. Fail loudly and differently.
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ profile dossier: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

const DO_SRC = read("profile-dossier.js");
const DO_CSS = read("profile-dossier.css");
const WA_SRC = read("word-action.js");
const CONNECT = read("profile-connect.js");
const PF = read("profiles-full.js");
const ACCT = read("accountability-score.js");
const INDEX = read("index.html");
const SW = read("sw.js");

// ── The 110-key issue vocabulary, lifted from its real definition ────────────
// Read out of alignment-tool.js rather than re-declared, so a label change in
// the app is seen by section 4 instead of silently agreeing with a stale copy.
function realIssueMap() {
  const at = read("alignment-tool.js");
  const i = at.indexOf("var ISSUE_MAP = {");
  must(i !== -1, "alignment-tool.js no longer defines `var ISSUE_MAP = {`");
  const start = at.indexOf("{", i);
  let depth = 0, j = start;
  for (; j < at.length; j++) {
    if (at[j] === "{") depth++;
    else if (at[j] === "}") { depth--; if (!depth) { j++; break; } }
  }
  const map = vm.runInNewContext("(" + at.slice(start, j) + ")");
  must(Object.keys(map).length > 80, "ISSUE_MAP extraction produced too few keys to be the real map");
  return map;
}
const ISSUE_MAP = realIssueMap();

// ── Sandbox ──────────────────────────────────────────────────────────────────
/**
 * Load profile-dossier.js over a world that can be told exactly which feeds
 * exist. Every stub here mirrors the SHAPE of the real accessor, because the
 * whole point of the module is that it reads the real ones:
 *   depth:     _pdxEvidenceDepthForPerson → { issueKey: {count, level, tier, bars, label} }
 *   evMap:     _issueEvidenceMap          → { issueKey: {position, promises[], spotlight[], counts{}} }
 *   spots:     PDXSpotlight.forIssueKey   → [{slug, title}]
 *   dots:      PDXWordAction.dots         → the chain rows the score itself built
 */
function build({ depth, evMap, spots, dots, wa, issueMap = ISSUE_MAP } = {}) {
  const win = {};
  const calls = [];
  const timers = [];
  const ctx = {
    window: win,
    document: { querySelector: () => null, getElementById: () => null },
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    console
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  win.addEventListener = () => {};
  if (issueMap) win.ISSUE_MAP = issueMap;
  if (depth) win._pdxEvidenceDepthForPerson = (pid) => { calls.push(["depth", pid]); return depth; };
  if (evMap) win._issueEvidenceMap = (pid, p) => { calls.push(["evmap", pid]); return evMap; };
  if (spots) {
    win.PDXSpotlight = {
      forIssueKey: (k) => { calls.push(["spots", k]); return spots[k] || []; },
      open: (slug) => calls.push(["open", slug])
    };
  }
  if (dots || wa) {
    win.PDXWordAction = wa || { dots: (pid, p, o) => { calls.push(["dots", pid, o && o.limit]); return dots; } };
  }
  win._pdxOpenEvidenceLocker = (o) => calls.push(["locker", o.pol, o.issue]);
  win.closeModal = () => calls.push(["closeModal"]);

  vm.runInContext(DO_SRC, ctx, { filename: "profile-dossier.js" });
  must(!!win.PDXDossier, "profile-dossier.js did not define window.PDXDossier");
  return { DO: win.PDXDossier, win, calls, flush: () => timers.splice(0).forEach((f) => f()) };
}

// A chain row in the shape PDXWordAction.dots actually returns.
const dot = (issueKey, over = {}) => ({
  issueKey,
  title: "Topic " + issueKey,
  tier: { key: "position", ico: "🧭", label: "Position", weight: 2 },
  word: "Says something documented about " + issueKey + ".",
  sources: [{ label: "example.house.gov", url: "https://example.house.gov/" }],
  actions: [{ text: "H.R. 1 · On Passage · Voted Yea" }],
  outcome: { judged: 4 },
  verdict: { key: "consistent", ico: "✓", label: "Backs it up", color: "#6ee7a0" },
  ...over
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. Load, shape, and the five links
// ═════════════════════════════════════════════════════════════════════════════
{
  const { DO } = build();
  for (const fn of ["receiptsFor", "spotlightsFor", "chain", "receiptChipHtml",
                    "chainHtml", "legendHtml", "railHtml", "digestHtml",
                    "openSpotlight", "openLocker"]) {
    must(typeof DO[fn] === "function", `PDXDossier.${fn} is missing — the harness cannot exercise the join`);
  }
  ok(/if \(window\.PDXDossier\) return;/.test(DO_SRC),
     "the join is not idempotent — a second load would redefine it mid-session, and every other module in this app guards against exactly that");

  // The five links ARE the product. Their order is the argument the profile makes.
  must(Array.isArray(DO.LINKS), "PDXDossier.LINKS is not an array");
  eq(DO.LINKS.map((l) => l.key).join(" → "), "word → action → evidence → issue → outcome",
     "the chain is no longer word → action → evidence → issue/spotlight → outcome, which is the one sequence every surface is supposed to be expressed in");
  eq(DO.LINKS.map((l) => l.n).join(","), "1,2,3,4,5",
     "the links are not numbered 1–5, so the legend and the per-row labels cannot be read as the same structure");
  for (const l of DO.LINKS) {
    ok(l.label && l.label.length > 1, `link "${l.key}" has no plain-language label`);
    ok(l.ico && l.ico.length > 0, `link "${l.key}" has no glyph, so it cannot be recognised across sections at a glance`);
    ok(l.ask && /\?$/.test(l.ask), `link "${l.key}" no longer states the reader question it answers`);
  }
  // The labels are the shared vocabulary. If they drift, the whole fix unwinds.
  eq(DO.LINKS.map((l) => l.label).join(" | "), "They said | They did | The receipts | The issue | So",
     "the link labels changed — profile-connect.js's navigation chain hardcodes these same five words, so they must be changed together or the page speaks two vocabularies again");
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. Rule 3 — nothing invented when the feeds are missing
// ═════════════════════════════════════════════════════════════════════════════
{
  // No Locker, no registry, no score. Every renderer must return the empty
  // string, because an empty frame is a claim that something should be here.
  const { DO } = build();
  eq(DO.chainHtml("x", {}), "", "the chain renders a frame with no rows in it when Word vs Action has produced nothing");
  eq(DO.railHtml("x", []), "", "the compact spotlight rail renders with zero spotlights");
  eq(DO.railHtml("x", null), "", "the compact spotlight rail renders on a null list instead of failing closed");
  eq(DO.digestHtml("x", []), "", "the spotlight digest renders with nothing to digest");
  eq(DO.digestHtml("x", null), "", "the spotlight digest renders on a null list");
  eq(DO.spotlightsFor("gun_rights").length, 0, "the join claims spotlights with no registry loaded");
  eq(DO.chain("x", {}).length, 0, "the join built chain rows with no Word vs Action present");

  const r = DO.receiptsFor("x", {}, "gun_rights");
  eq(r.locker, null,
     "the Locker count is 0 rather than null before the library loads — 0 asserts 'nothing filed', null admits 'not known yet', and the difference is the honesty of the chip");
  eq(r.any, false, "the receipt layer reports receipts it cannot name");
  eq(DO.receiptChipHtml("x", "gun_rights", r), "",
     "a receipt chip is emitted with no receipts behind it");
}
{
  // The Locker has loaded and genuinely holds nothing on this issue. That is a
  // different fact from "not loaded", and the chip must still stay silent.
  const { DO } = build({ depth: { national_debt: { count: 3, level: "strong", tier: "Strong", bars: "●●●" } } });
  const r = DO.receiptsFor("x", {}, "gun_rights");
  eq(r.locker, 0, "a loaded Locker with nothing on this issue does not resolve to a definite zero");
  eq(DO.receiptChipHtml("x", "gun_rights", r), "", "a Locker chip is emitted for an issue the loaded library holds nothing on");
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. Rule 1 — the receipt layer derives from the Locker's own depth index
// ═════════════════════════════════════════════════════════════════════════════
{
  const depth = {
    israel_support: { count: 6, level: "strong", tier: "Strong", bars: "●●●", label: "Support for Israel" },
    national_debt:  { count: 2, level: "limited", tier: "Limited", bars: "●○○", label: "The National Debt" }
  };
  const evMap = {
    israel_support: {
      issueKey: "israel_support",
      position: { stance: "oppose" },
      promises: [{ title: "A", verdict: "kept" }, { title: "B", verdict: "broken" }, { title: "C", verdict: "pending" }],
      spotlight: [
        { headline: "H1", impact: "positive", media: { video: "https://x" }, source: { label: "Clerk" } },
        { headline: "H2", impact: "negative", source: { label: "Clerk" } }
      ],
      counts: { promisesKept: 1, promisesBroken: 1, promisesPending: 1, spotlight: 2, spotlightPositive: 1, spotlightNegative: 1 }
    }
  };
  const { DO, calls } = build({ depth, evMap });
  const r = DO.receiptsFor("massie", {}, "israel_support");

  // Every field is read back, not recomputed.
  eq(r.locker, 6, "the Locker count is not the count the Locker's own depth index reports");
  eq(r.tier, "Strong", "the evidence tier is not the Locker's own word for it");
  eq(r.bars, "●●●", "the strength bars are re-derived here instead of reusing the Locker's, so the chain could show ●●● where the Locker shows ●●○");
  eq(r.onRecord.length, 2, "the on-record count does not match the issue evidence map's spotlight items");
  eq(r.videos, 1, "video receipts are not counted from the items' own media payload");
  eq(r.sourced, 2, "cited receipts are not counted from the items' own source payload");
  eq(r.kept, 1, "kept promises are not read from the evidence map's own promise ledger");
  eq(r.broken, 1, "broken promises are not read from the evidence map's own promise ledger");
  eq(r.pending, 1, "pending promises are not read from the evidence map's own promise ledger");
  eq(r.supporting, 1, "▲ supporting items are not read from the map's impact counts");
  eq(r.cutting, 1, "▼ cutting items are not read from the map's impact counts");
  eq(r.any, true, "an issue with six Locker items and three promises reports no receipts");

  // …and it asked the real accessors, with the real politician id.
  ok(calls.some((c) => c[0] === "depth" && c[1] === "massie"),
     "the receipt layer never asked _pdxEvidenceDepthForPerson, so its numbers came from somewhere else");
  ok(calls.some((c) => c[0] === "evmap" && c[1] === "massie"),
     "the receipt layer never asked _issueEvidenceMap, so its on-record and promise counts came from somewhere else");

  // The chips say all three, and the Locker chip deep-links to pol + issue.
  const chips = DO.receiptChipHtml("massie", "israel_support", r);
  ok(/📂/.test(chips) && /6 in the Locker/.test(chips), "the Locker chip does not state how much is filed");
  ok(/●●●/.test(chips), "the Locker chip drops the strength bars, so depth and strength stop being visible together");
  ok(/🧾 2 on record/.test(chips), "the on-record chip does not state how many receipts back this issue");
  ok(/1 📹/.test(chips) && /2 cited/.test(chips), "the on-record chip hides the video and citation breakdown");
  ok(/1 kept/.test(chips) && /1 broken/.test(chips) && /1 pending/.test(chips),
     "the promise chip does not carry the kept/broken/pending ledger for this issue");
  ok(/openLocker\('massie','israel_support'\)/.test(chips),
     "the Locker chip does not deep-link to this politician AND this issue — a receipt chip that opens an unfiltered vault is the isolated-vault problem again");
  ok(/aria-label="Strong evidence — 6 items/.test(chips),
     "the Locker chip's accessible name does not say what the bars mean, so a screen reader gets '📂 6' with no strength");

  // The wiring actually opens the filtered Locker.
  const b = build({ depth, evMap });
  b.DO.openLocker("massie", "israel_support");
  ok(b.calls.some((c) => c[0] === "locker" && c[1] === "massie" && c[2] === "israel_support"),
     "openLocker does not pass both the politician and the issue through to the Evidence Locker");
}
{
  // Rule 1 in its sharpest form: the join must not invent a pid. A chip that
  // deep-links to the wrong person is worse than no chip.
  const src = DO_SRC.slice(DO_SRC.indexOf("function chainHtml"), DO_SRC.indexOf("function legendHtml"));
  must(src.length > 100, "profile-dossier.js no longer defines chainHtml");
  ok(!/\.replace\(/.test(src),
     "chainHtml patches the politician id into finished markup with a string replace instead of threading it through rowHtml — that is how a row ends up deep-linking to the wrong person");
  ok(/rowHtml\(d, pid\)/.test(src),
     "chainHtml no longer passes the real politician id to each row");
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. Rule 5 — one issue, one name
// ═════════════════════════════════════════════════════════════════════════════
{
  // The defect this whole mission is about, reduced to one assertion: link ④ and
  // the Word vs Action section below it must name the same issue the same way.
  // word-action.js resolves ISSUE_MAP's label and strips its leading glyph; the
  // join has to resolve it identically or the reader meets two vocabularies.
  const waLabel = (key) => {
    const e = ISSUE_MAP[key];
    if (e && e.label) return String(e.label).replace(/^[^\w]+\s*/, "");
    return String(key || "").replace(/_/g, " ");
  };
  ok(/ISSUE_MAP/.test(DO_SRC),
     "the join no longer reads ISSUE_MAP, so its issue names can differ from the ones ⚖️ Word vs Action prints two inches below it");
  ok(/window\.ISSUE_MAP/.test(WA_SRC),
     "word-action.js no longer resolves labels from ISSUE_MAP — this test's premise is stale, re-derive what the score calls an issue");

  const { DO } = build({ dots: [dot("israel_support")], depth: {}, evMap: {} });
  const html = DO.chainHtml("massie", {});
  eq(waLabel("israel_support"), "Support for Israel",
     "the harness's copy of what Word vs Action calls this issue is stale");
  ok(html.indexOf("Support for Israel") !== -1,
     "link ④ does not use the same issue name ⚖️ Word vs Action uses — this is the exact rivalry the mission is fixing, one issue printed two ways within one screen");
  ok(html.indexOf("israel support") === -1,
     "link ④ still falls back to a de-underscored raw key even though ISSUE_MAP has a real label for it");

  // The page-wide hook still wins, because other surfaces defer to it too.
  const b = build({ dots: [dot("israel_support")] });
  b.win._issueLabel = () => "PAGE HOOK LABEL";
  const h2 = b.DO.chainHtml("massie", {});
  ok(/PAGE HOOK LABEL/.test(h2),
     "the join ignores window._issueLabel, which every other surface in the app checks first — so a page-wide relabel would move every section except this one");

  // No label at all still degrades to something readable.
  const b3 = build({ dots: [dot("some_unmapped_key")], issueMap: {} });
  const h3 = b3.DO.chainHtml("massie", {});
  ok(/some unmapped key/.test(h3),
     "an issue with no entry in the vocabulary renders a raw snake_case key at the reader");
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. Rule 2 — no second percentage anywhere in the join
// ═════════════════════════════════════════════════════════════════════════════
{
  // The mission's hardest constraint is "keep one primary score only". A
  // synthesis layer is where a second one always appears, so this is tested on
  // the rendered output of every renderer at once, not on intent.
  const { DO } = build({
    dots: [dot("israel_support"), dot("national_debt", { verdict: { key: "contradicts", ico: "⚠", label: "Says one thing, does another", color: "#f87171" } })],
    depth: { israel_support: { count: 6, level: "strong", tier: "Strong", bars: "●●●" } },
    evMap: { israel_support: { promises: [{ verdict: "kept" }], spotlight: [{ headline: "H", impact: "positive" }], counts: { promisesKept: 1, promisesBroken: 0, promisesPending: 0, spotlight: 1, spotlightPositive: 1, spotlightNegative: 0 } } },
    spots: { israel_support: [{ slug: "israel-gaza-aid", title: "Israel, Gaza & U.S. Aid" }] }
  });
  const all = [
    DO.chainHtml("massie", {}),
    DO.legendHtml(),
    DO.railHtml("massie", [{ slug: "a", title: "A" }]),
    DO.digestHtml("massie", [{ headline: "H", date: "Jul 2026", impact: "positive", issueKey: "israel_support", anchor: "sl-x-1" }])
  ].join("\n");
  must(all.length > 1500, "the renderers produced almost nothing — this section would pass vacuously");
  eq((all.match(/%/g) || []).length, 0,
     "the join emits a percent sign — ⚖️ Word vs Action is the only surface allowed to publish a percentage, and a second one on the same screen is two primary scores");
  ok(!/\bpct\b/.test(DO_SRC.replace(/\/\/[^\n]*/g, "")),
     "profile-dossier.js reads or names a pct, which is the first step toward publishing a second score");
  ok(!/Math\.round/.test(DO_SRC),
     "the join rounds something — every figure it shows is supposed to come back out of an accessor already formatted");

  // …and it explicitly hands the reader off to the one score instead.
  const rows = DO.chainHtml("massie", {});
  eq((rows.match(/pdxdo-toscore/g) || []).length, 2,
     "each chain row does not end by pointing at the one primary score, so link ⑤ states an outcome with nowhere to check it");
  ok(/_pdxNavJump\('pdxsec-wordaction'/.test(rows),
     "link ⑤ does not route to the Word vs Action section by the drawer-aware jump, so a row inside a closed drawer would scroll nowhere");
  ok(/counted in ⚖️ Word vs Action/.test(rows),
     "link ⑤ no longer says that this row is COUNTED in the primary score — without that, the chain reads as a competing verdict");
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. The chain: PDXWordAction owns ① ② ⑤, the join adds ③ ④
// ═════════════════════════════════════════════════════════════════════════════
{
  const order = ["gun_rights", "national_debt", "israel_support"];
  const { DO, calls } = build({
    dots: order.map((k) => dot(k)),
    depth: {}, evMap: {},
    spots: { national_debt: [{ slug: "debt", title: "The National Debt" }] }
  });
  const rows = DO.chain("massie", {}, { limit: 3 });
  eq(rows.length, 3, "the join dropped or added rows relative to what the score produced");
  eq(rows.map((r) => r.issueKey).join(","), order.join(","),
     "the join REORDERED the score's rows — Word vs Action puts contradictions first on purpose, and re-sorting them here makes the synthesis disagree with the section it summarises");
  for (const r of rows) {
    ok(r.receipts && typeof r.receipts === "object", `row ${r.issueKey} has no receipt layer attached`);
    ok(Array.isArray(r.spotlights), `row ${r.issueKey} has no spotlight layer attached`);
  }
  eq(rows[1].spotlights.length, 1, "the spotlight layer did not resolve through the registry's own reverse index");
  ok(calls.some((c) => c[0] === "dots" && c[1] === "massie" && c[2] === 3),
     "the join did not ask PDXWordAction.dots for the rows, so it is deciding for itself what counts as word");

  // The join must not compute a verdict. It carries the score's own.
  eq(rows[0].verdict.label, "Backs it up", "the row's verdict is not the one the score attached to it");
  ok(!/officialRecord|isIndependentWord|TIERS|brandingIssueKey/.test(DO_SRC),
     "the join reaches into the scoring model's internals — it is allowed to read finished rows and nothing else, or it becomes a second scorer");

  // Every row carries all five links, in order, exactly once.
  const html = DO.chainHtml("massie", {});
  eq((html.match(/class="pdxdo-row"/g) || []).length, 3, "the rendered chain does not carry one element per row");
  for (const l of DO.LINKS) {
    eq((html.match(new RegExp("pdxdo-step-" + l.key, "g")) || []).length, 3,
       `link ${l.n} (${l.key}) does not appear exactly once per row, so the rows stop being the same shape`);
  }
  const first = html.slice(html.indexOf("<li"), html.indexOf("</li>"));
  const at = DO.LINKS.map((l) => first.indexOf("pdxdo-step-" + l.key));
  ok(at.every((n, i) => n !== -1 && (i === 0 || n > at[i - 1])),
     "the five links do not render in chain order within a row, so the row cannot be read as word → action → evidence → issue → outcome");
  ok(/<ol class="pdxdo-chain">/.test(html),
     "the chain is not an ordered list, so assistive tech gets no sense that these rows are a sequence");

  // Thin links say so rather than going quiet.
  const b = build({ dots: [dot("gun_rights", { actions: [] })] });
  const thin = b.DO.chainHtml("massie", {});
  ok(/No formal action on this issue is on record yet\./.test(thin),
     "a row with no formal action renders an empty link ② instead of saying the record is thin");
  ok(/pdxdo-thin/.test(thin),
     "a thin link is not marked as thin, so it reads with the same weight as a documented one");
  ok(/Nothing filed against this issue in the Evidence Locker yet\./.test(thin),
     "a row with no receipts renders an empty link ③ — the honest version names the place the receipt WOULD appear");
  ok(/No Issue Spotlight covers this one yet\./.test(thin),
     "a row with no spotlight renders an empty link ④");

  // The legend names the structure once, so the per-row labels read as repetition.
  const legend = build({}).DO.legendHtml();
  for (const l of DO.LINKS) {
    ok(legend.indexOf(l.label) !== -1, `the legend omits link ${l.n} (${l.label})`);
    ok(legend.indexOf(">" + l.n + "<") !== -1, `the legend omits the number for link ${l.label}`);
  }
  eq((legend.match(/→/g) || []).length, 4, "the legend does not join the five links with arrows, so it reads as a list of features rather than a chain");
  ok(/aria-label="How each row below is built"/.test(legend),
     "the legend has no accessible name explaining what it is a legend FOR");
}
{
  // A throwing feed must degrade to a row, not to a blank section.
  const win = {};
  const ctx = { window: win, document: { querySelector: () => null }, setTimeout: () => 0, console };
  ctx.globalThis = ctx; vm.createContext(ctx);
  win.addEventListener = () => {};
  win.ISSUE_MAP = ISSUE_MAP;
  win.PDXWordAction = { dots: () => [dot("gun_rights")] };
  win._pdxEvidenceDepthForPerson = () => { throw new Error("locker exploded"); };
  win._issueEvidenceMap = () => { throw new Error("evmap exploded"); };
  win.PDXSpotlight = { forIssueKey: () => { throw new Error("registry exploded"); } };
  vm.runInContext(DO_SRC, ctx, { filename: "profile-dossier.js" });
  const html = win.PDXDossier.chainHtml("massie", {});
  ok(html && /pdxdo-row/.test(html),
     "one throwing feed takes the whole chain down — the join sits above six independent subsystems, so it has to survive any of them failing");
  ok(/Nothing filed against this issue in the Evidence Locker yet\./.test(html),
     "a throwing Locker is reported as a definite 'nothing filed' rather than being left silent");
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. Rule 4 — compression by disclosure: the rail and the digest
// ═════════════════════════════════════════════════════════════════════════════
{
  const sps = [
    { slug: "israel-gaza-aid", title: "Israel, Gaza & U.S. Aid" },
    { slug: "epstein-files-transparency", title: "The Epstein Files" }
  ];
  const { DO } = build();
  const rail = DO.railHtml("massie", sps);
  // Compact: one line, no cards, but every destination survives.
  ok(/pdxis-rail/.test(rail), "the compact spotlight rail is not the rail class the profile styles");
  ok(/Featured in 2 Issue Spotlights/.test(rail),
     "the rail does not state how many spotlights feature this official, so compressing the block hides the count");
  eq((rail.match(/data-spotlight="/g) || []).length, 2,
     "the rail does not carry one tappable target per spotlight — index.html wires clicks off data-spotlight, so a missing attribute is a dead chip");
  for (const sp of sps) {
    ok(rail.indexOf(sp.slug) !== -1, `the rail dropped the ${sp.slug} destination during compression`);
  }
  ok(/Israel, Gaza &amp; U\.S\. Aid/.test(rail),
     "the rail does not escape spotlight titles, so an ampersand in a title would break the markup");
  ok(/role="group"/.test(rail) && /aria-label="Issue Spotlights featuring this official"/.test(rail),
     "the rail has no accessible grouping, so a screen reader meets two unlabelled buttons after the hero");
  eq((rail.match(/pdxis-rail-b/g) || []).length, 2, "the rail's chips are not one control per spotlight");
  ok(rail.indexOf("Featured in 2") < rail.indexOf("israel-gaza-aid"),
     "the rail names the chips before it says what they are, so the hierarchy reads backwards");
  eq(DO.railHtml("massie", [sps[0]]).indexOf("Issue Spotlight<") !== -1, true,
     "the rail says '1 Issue Spotlights' — the singular is not handled");

  // The digest: two lines an item, and every row reaches its own full card.
  const items = [
    { headline: "Massie forced a floor vote on his own amendment to zero out Israel aid", date: "Jul 2026", impact: "positive", issueKey: "israel_support", badge: "Notable Actions", anchor: "sl-driver-massie-0" },
    { headline: "Massie voted to end U.S. participation in hostilities with Iran", date: "Jul 2026", impact: "negative", issueKey: "restraint", anchor: "sl-driver-massie-1" },
    { headline: "An item with no anchor of its own", date: "Jan 2025", issueKey: "states_federal_power" }
  ];
  const dg = build({ depth: { israel_support: { count: 6, level: "strong", tier: "Strong", bars: "●●●" } }, evMap: {} })
    .DO.digestHtml("massie", items, { p: {} });
  eq((dg.match(/class="pdxdo-dg /g) || []).length, 3, "the digest does not render one row per item");
  ok(/▲/.test(dg) && /▼/.test(dg) && /•/.test(dg),
     "the digest does not carry the ▲/▼/• impact glyph, which is the only thing that makes a compressed list scannable");
  eq((dg.match(/_pdxNavJump\('sl-driver-massie-/g) || []).length, 2,
     "the digest rows do not jump to their own full cards by the drawer-aware jump — the full cards now live inside a closed drawer, so a bare scroll would land on a zero-height element");
  ok(/<div class="pdxdo-dg-b"/.test(dg),
     "an item with no anchor still renders as a button, so the reader is offered a control that does nothing");
  ok(/aria-label="Read the full item: Massie forced a floor vote/.test(dg),
     "a digest row's accessible name does not say that tapping it reads the item in full");
  ok(/📂 <span class="pdxdo-bars">●●●<\/span> 6 in the Locker/.test(dg),
     "the digest does not reuse the chain's receipt chips, so the compressed spotlight list stops showing what backs each item");
  ok(/Support for Israel/.test(dg) && /Notable Actions/.test(dg),
     "the digest drops the issue name or the item's own badge, both of which are what let a two-line row stand in for a card");

  // Rule 4, stated as a property of the profile template: the full cards moved
  // behind a lid, they were not deleted.
  ok(/PDXDossier\.digestHtml/.test(PF),
     "the profile no longer renders the compact digest, so the spotlight block is back to full-height cards");
  const slBlock = PF.slice(PF.indexOf("var slDigest = "), PF.indexOf("var slDigest = ") + 2600);
  must(slBlock.length > 800, "profiles-full.js no longer builds the spotlight digest — this section's premise is stale");
  ok(/dd-toggle-btn/.test(slBlock) && /dd-body dd-free/.test(slBlock),
     "the full spotlight cards are not behind a drawer lid, so compression either deleted them or did not happen");
  ok(/Read all/.test(slBlock) && /in full/.test(slBlock),
     "the drawer lid does not say how much is inside it, which is the difference between progressive disclosure and hiding");
  ok(/aria-expanded="false"/.test(slBlock),
     "the spotlight drawer does not report its collapsed state to assistive tech");
  ok(/slFull \+= _slDriverHeader\(\) \+ slDrivers\.join\(''\)/.test(PF) && /slFull \+= _slNewsHeader\(\) \+ slNews\.join\(''\)/.test(PF),
     "the driver and news cards are no longer both carried into the drawer — one of the two layers was dropped rather than compressed");
  ok(/anchorId: anc/.test(PF),
     "the spotlight cards no longer carry their own anchors, so digest rows have nothing to jump to");
  // The accountability score's own jump into a spotlight driver has to open the lid.
  const focus = ACCT.slice(ACCT.indexOf("_slFocusSpotlight"), ACCT.indexOf("_slFocusSpotlight") + 1400);
  must(focus.length > 300, "accountability-score.js no longer defines _slFocusSpotlight");
  ok(/_pdxNavJump\('sl-driver-'/.test(focus),
     "the accountability→spotlight jump does not use the drawer-aware jump, so clicking a score driver now scrolls to a collapsed drawer and looks broken");
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. IA: the synthesis is gone, not merely moved
// ═════════════════════════════════════════════════════════════════════════════
{
  // History: Connecting the Dots first rendered on the `brief` stage, above the
  // score; phase 5 moved it under the score so a derived summary could not precede
  // the thing it derives. That fixed the ordering and left the duplication. On
  // Trump it was ~13,000 characters of markup — joined say→did rows, a five-link
  // chain and a chip row — every one of which the score section now renders itself
  // in its own vocabulary. So the mount is removed. The function survives in
  // profile-connect.js; nothing on the profile calls it.
  eq((PF.match(/_pdxConnectDots\(/g) || []).length, 0,
     "profiles-full.js mounts Connecting the Dots again — its rows, chain and chips restate the score's own\n" +
     "    say→did rows, so a reader meets the same synthesis twice in one scroll");
  ok(/CONNECTING THE DOTS IS UNMOUNTED/.test(PF),
     "the note recording WHY the synthesis was unmounted is gone, so the next reader will re-add it");
  const scoreAt = PF.indexOf("PDXWordAction.sectionHtml(id, p)");
  must(scoreAt !== -1, "profiles-full.js no longer mounts the Word vs Action section");
  const scoreStage = PF.lastIndexOf("<!--PDXSP:", scoreAt);
  ok(PF.slice(scoreStage, scoreStage + 24).indexOf("PDXSP:brief") === -1,
     "the score is back on the brief stage — the first screen is not where a scored verdict is argued in full");

  // And the spotlight rail sits above the spine as an entry point, not a block.
  ok(/PDXDossier\.railHtml/.test(INDEX),
     "index.html no longer prefers the compact rail, so the profile is back to full-width spotlight callouts above the accountability spine");
  const rel = INDEX.slice(INDEX.indexOf("window._pdxRelatedSpotlight = function"), INDEX.indexOf("window._pdxRelatedSpotlight = function") + 3200);
  must(rel.length > 500, "index.html no longer defines window._pdxRelatedSpotlight");
  ok(/rail \|\|/.test(rel),
     "the rail is not preferred with the old callout markup as a fallback — the compression should degrade, not hard-switch");
  ok(/\[data-spotlight\]|data-spotlight/.test(rel),
     "the rail's chips are not wired, so the compact entry point does not open anything");
}

// ═════════════════════════════════════════════════════════════════════════════
// 9. Section rivalry: the surfaces name each other in one vocabulary
// ═════════════════════════════════════════════════════════════════════════════
{
  // The navigation chain in profile-connect.js and the joined rows here are two
  // renderings of ONE structure. They must use the same five words.
  const { DO } = build();
  for (const l of DO.LINKS) {
    ok(CONNECT.indexOf(l.n + " · " + l.label) !== -1,
       `profile-connect.js's navigation chain does not label its step "${l.n} · ${l.label}" — that mismatch is the rivalry defect: the reader meets one vocabulary in the synthesis and a different one two inches below`);
  }
  ok(/PDXDossier/.test(CONNECT) && /chainHtml/.test(CONNECT),
     "profile-connect.js does not render the joined chain, so Connecting the Dots is back to being a lens list");
  ok(/WA\.dotsHtml/.test(CONNECT),
     "profile-connect.js has no fallback to the score's own rows when the join is absent, so a load-order slip would empty the section");
  ok(/pcd-chain-head/.test(CONNECT) && /Follow the same five links/.test(CONNECT),
     "the navigation chain does not tell the reader it is the SAME five links, so it reads as a second, competing structure");

  // Sections that are context rather than tests have to say which they are.
  const feeds = WA_SRC.slice(WA_SRC.indexOf("function feedsHtml"), WA_SRC.indexOf("function feedsHtml") + 5200);
  must(feeds.length > 1000, "word-action.js no longer defines feedsHtml");
  ok(/Evidence Locker/.test(feeds),
     "the score's 'what feeds this' panel does not name the Evidence Locker — leaving the receipt layer unnamed is what made it read as an isolated vault");
  ok(/Issue Spotlights/.test(feeds),
     "the score's 'what feeds this' panel does not name Issue Spotlights, so the spotlights keep reading as a standalone feature");
  ok(/counted: false/.test(feeds),
     "every feed row is marked as counted, so the panel cannot distinguish what the percentage is MADE of from what merely supports it");
  ok(/pdxsec-evidence/.test(feeds) && /spotlight-modal-section/.test(feeds),
     "the context rows do not link to the sections they name, so naming them adds no navigation");
  ok(/context, never a test/.test(feeds),
     "the spotlight row does not state that it is context rather than a test — an unqualified feed row implies it moves the score");

  // One section, one primary read. The join is not allowed a headline verdict.
  ok(!/headlineHtml|sectionHtml/.test(DO_SRC),
     "profile-dossier.js renders a headline or a section of its own — it is a join layer, and a second headline verdict on the same page is a second primary score");
}

// ═════════════════════════════════════════════════════════════════════════════
// 10. Thomas Massie, the reference profile — the real join, end to end
// ═════════════════════════════════════════════════════════════════════════════
// Not a fixture. This boots the real curated stance data, the real spotlight
// card data, the real roster record and the REAL _issueEvidenceMap out of
// stance-helpers.js, then runs the real Word vs Action model and the real join
// over them. Only the Official Record is stubbed, because it arrives from the
// network at runtime and there is no roll-call seed in the repo to read.
{
  function extractFn(src, sig) {
    const i = src.indexOf(sig);
    must(i !== -1, `stance-helpers.js no longer defines ${sig}`);
    let d = 0, j = src.indexOf("{", i), k = j;
    for (; k < src.length; k++) {
      if (src[k] === "{") d++;
      else if (src[k] === "}") { d--; if (!d) { k++; break; } }
    }
    return src.slice(i, k);
  }

  const win = {};
  const ctx = {
    window: win,
    document: { querySelector: () => null, getElementById: () => null, createElement: () => ({ set innerHTML(_v) {}, querySelector: () => null }) },
    setTimeout: () => 0, console
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  win.addEventListener = () => {};
  win.removeEventListener = () => {};
  win.dispatchEvent = () => {};
  for (const f of ["politician-stances-core.js", "politician-stances-ext.js",
                   "spotlight-cards-data.js", "acct-spotlight-data.js", "cmp-data.js"]) {
    vm.runInContext(read(f), ctx, { filename: f });
  }
  const CMP = ctx.CMP_DATA || win.CMP_DATA;
  must(CMP && CMP.massie, "CMP_DATA.massie is gone — the reference profile has no roster record");
  const p = CMP.massie;
  eq(p.name, "Thomas Massie", "CMP_DATA.massie is no longer Thomas Massie");

  // The real evidence join, run in place rather than reimplemented here.
  const SH = read("stance-helpers.js");
  ctx.ISSUE_STANCE_DATA = win.ISSUE_STANCE_DATA;
  ctx.STANCE_ALIASES = win.STANCE_ALIASES || {};
  ctx.CMP_DATA = CMP;
  vm.runInContext(
    extractFn(SH, "function _stanceSlug(") + "\n" +
    extractFn(SH, "function _resolveStanceList(") + "\n" +
    extractFn(SH, "function _issueEvidenceMap(") + "\n" +
    "window._issueEvidenceMap=_issueEvidenceMap;window._resolveStanceList=_resolveStanceList;",
    ctx, { filename: "stance-helpers-extract" });

  const stances = win._resolveStanceList("massie", p) || [];
  ok(stances.length >= 25,
     `Massie's curated position count fell to ${stances.length} — the reference case depends on a deep stance record`);
  const evMap = win._issueEvidenceMap("massie", p);
  const evKeys = Object.keys(evMap);
  ok(evKeys.length >= 25,
     `the real evidence join produced only ${evKeys.length} issue buckets for Massie — the join is what makes evidence visibly support stances`);
  const withEvidence = evKeys.filter((k) => evMap[k].spotlight.length > 0);
  ok(withEvidence.length >= 10,
     `only ${withEvidence.length} of Massie's issues have on-record evidence attached — the mission's success test is evidence VISIBLY supporting stances and votes, and that needs real overlap, not one example`);
  ok(evMap.israel_support && evMap.israel_support.position,
     "Massie's Israel-aid position is no longer in the join, and it is the clearest word→action→receipt→spotlight case on the profile");
  ok(evMap.israel_support && evMap.israel_support.spotlight.length > 0,
     "Massie's Israel-aid position has no on-record item behind it — the receipt layer would have nothing to show on his strongest row");

  // The real scoring model over the real word, with a controlled record.
  win.ISSUE_MAP = ISSUE_MAP;
  const REC = {
    israel_support:       { score: 100, token: "consistent",  judged: 4 },
    states_federal_power: { score: 100, token: "consistent",  judged: 5 },
    tariffs_prices:       { score: 0,   token: "contradicts", judged: 3 },
    cut_spending:         { score: 100, token: "consistent",  judged: 8 }
  };
  const V = {
    consistent:  { key: "consistent",  ico: "✓", label: "Backs it up", short: "Their record backs up what they say.", tone: "good", color: "#6ee7a0", cls: "good" },
    contradicts: { key: "contradicts", ico: "⚠", label: "Says one thing, does another", short: "Their record cuts against it.", tone: "bad", color: "#f87171", cls: "bad" },
    mixed:       { key: "mixed",       ico: "◑", label: "Mixed record", short: "Their record cuts both ways.", tone: "mid", color: "#fbbf24", cls: "mid" },
    limited:     { key: "limited",     ico: "…", label: "Limited record", short: "Not enough on record yet.", tone: "none", color: "#9fb4d4", cls: "none" },
    no_record:   { key: "no_record",   ico: "—", label: "No record", short: "Nothing on record.", tone: "none", color: "#9fb4d4", cls: "none" },
    no_stance:   { key: "no_stance",   ico: "—", label: "No stated position", short: "No position on file.", tone: "none", color: "#9fb4d4", cls: "none" },
    pending:     { key: "pending",     ico: "⏳", label: "Loading the record…", short: "Loading the record…", tone: "none", color: "#9fb4d4", cls: "none" }
  };
  win.PDXConsistency = {
    VERDICTS: V,
    proof: { proofText: (it) => it && it.proof },
    officialRecord: (_pid, k) => {
      const r = REC[k];
      if (!r) return { score: null, token: "no_record", pending: false };
      return { score: r.score, token: r.token, record: { consistent: r.judged, contradicts: 0 }, sources: ["votes"] };
    }
  };
  win._pdxRecordIssueItems = (_pid, k) =>
    REC[k] ? [{ proof: "H.R. 1 · On Passage · Voted Yea" }, { proof: "H.R. 2 · On Passage · Voted Nay" }] : null;
  win._pdxEvidenceDepthForPerson = () => ({
    israel_support: { count: 6, level: "strong", tier: "Strong", bars: "●●●", label: "Support for Israel" }
  });
  win.PDXSpotlight = {
    forIssueKey: (k) => (k === "israel_support" ? [{ slug: "israel-gaza-aid", title: "Israel, Gaza & U.S. Aid" }] : []),
    forPolitician: () => [{ slug: "israel-gaza-aid" }, { slug: "epstein-files-transparency" }]
  };
  vm.runInContext(read("word-action.js"), ctx, { filename: "word-action.js" });
  vm.runInContext(DO_SRC, ctx, { filename: "profile-dossier.js" });
  const WA = win.PDXWordAction, DO = win.PDXDossier;

  const ledger = WA.read("massie", p);
  ok(ledger.items.length >= 30,
     `Massie's word ledger holds only ${ledger.items.length} items — the reference profile is the case for pooling positions and branding alongside pledges`);
  eq(p.kept + p.broken + p.pending, 37,
     "Massie's promise ledger no longer totals 37 — the reference example's point is that his headline rested on promises alone");
  eq(p.score, 73, "Massie's roster promise score is no longer 73, so the worked example's numbers are stale");

  const chain = DO.chain("massie", p, { limit: 3 });
  eq(chain.length, 3, `the real join produced ${chain.length} chain rows for Massie instead of 3`);
  const isr = chain.find((d) => d.issueKey === "israel_support");
  must(!!isr, "Massie's israel_support row is not in the chain — the worked example depends on it");
  ok(isr.word && isr.word.length > 40, "Massie's Israel row carries no documented word at link ①");
  ok(isr.actions.length > 0, "Massie's Israel row carries no formal action at link ②");
  eq(isr.receipts.locker, 6, "Massie's Israel row does not read the Locker's own count at link ③");
  eq(isr.receipts.onRecord.length > 0, true, "Massie's Israel row has no on-record receipt at link ③");
  eq(isr.spotlights.length, 1, "Massie's Israel row does not reach its Issue Spotlight at link ④");
  eq(isr.verdict.key, "consistent", "Massie's Israel row does not carry the record's own verdict at link ⑤");

  const html = DO.chainHtml("massie", p, { limit: 3 });
  ok(html.length > 3000, `the rendered Massie chain is only ${html.length} bytes — it is supposed to carry three full five-link rows`);
  eq((html.match(/%/g) || []).length, 0,
     "the rendered Massie chain contains a percent sign, so the profile now shows two primary scores");
  ok(/Support for Israel/.test(html),
     "the Massie chain names his Israel issue differently from the way ⚖️ Word vs Action names it");
  ok(/🔦 Israel, Gaza &amp; U\.S\. Aid/.test(html),
     "the Massie chain does not link his Israel row into the Issue Spotlight that argues the issue out");
  ok(/📂 <span class="pdxdo-bars">●●●<\/span> 6 in the Locker/.test(html),
     "the Massie chain does not show the strength and depth of what is filed behind his Israel position");
  ok(/Says one thing, does another/.test(html),
     "the Massie chain shows no contradiction even though the stubbed record reports one on tariffs — the chain is supposed to lead with what cuts against him");
  ok(html.indexOf("tariffs_prices") < html.indexOf("israel_support"),
     "the Massie chain does not lead with the contradiction, which is the order the score itself puts his rows in");

  // His curated word is real, and the profile's own data still carries it. The
  // core stance module ships minified, so both key spellings are accepted.
  const massieKey = /["']?massie["']?\s*:\s*\[/;
  ok(massieKey.test(read("politician-stances-core.js")) || massieKey.test(read("politician-stances-ext.js")),
     "Massie's curated stance block is gone from both stance data modules");
  ok(massieKey.test(read("spotlight-cards-data.js")),
     "Massie's spotlight cards are gone, so his profile has no on-record receipts to compress");
}

// ═════════════════════════════════════════════════════════════════════════════
// 11. Shipping + mobile
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(/<script defer src="profile-dossier\.js"><\/script>/.test(INDEX),
     "ship: the join is not loaded, so every surface that reads it silently falls back");
  ok(INDEX.indexOf('src="word-action.js"') < INDEX.indexOf('src="profile-dossier.js"'),
     "ship: the join loads before the score it reads finished rows from");
  ok(INDEX.indexOf('src="profile-dossier.js"') < INDEX.indexOf('src="profile-connect.js"'),
     "ship: Connecting the Dots loads before the join it renders, so its first paint would miss the chain");
  ok(/<link rel="stylesheet" href="\/profile-dossier\.css" media="print" onload="this\.media='all'" \/>/.test(INDEX),
     "ship: the join's stylesheet is not non-blocking — the blocking-CSS budget is full and a profile is never the first paint");
  ok(/<noscript><link rel="stylesheet" href="\/profile-dossier\.css" \/><\/noscript>/.test(INDEX),
     "ship: with JS off the stylesheet no longer applies, so the chain renders as an unstyled nested list");

  ok(/'\/profile-dossier\.js'/.test(SW) && /'\/profile-dossier\.css'/.test(SW),
     "ship: the join's assets are not precached, so a repeat visit gets an unjoined or unstyled profile");
  const v = SW.match(/CACHE_VERSION\s*=\s*['"]v(\d+)['"]/);
  ok(v && Number(v[1]) >= 45,
     `ship: CACHE_VERSION is not bumped past the join's arrival, so returning visitors keep the old shell (found ${v ? "v" + v[1] : "none"})`);

  // Mobile-first. The chain is five stacked links per row and the digest is the
  // whole point of the compression, so both have to work at the narrowest width.
  // A link's VALUE is the long part, so at the base width it drops onto its own
  // row under the number and label and gets the full column; only on a wide
  // screen do the three parts sit side by side.
  const step = DO_CSS.slice(DO_CSS.indexOf(".pdxdo-step {"), DO_CSS.indexOf(".pdxdo-step-n {"));
  must(step.length > 60, "profile-dossier.css no longer defines .pdxdo-step");
  ok(/grid-template-areas: 'n k' '\. v';/.test(step),
     "mobile: a chain step does not give its value a row of its own at the base width, so the five links would fight the label for horizontal space on a phone");
  ok(/@media \(min-width: 641px\)/.test(DO_CSS),
     "mobile: the wider layout is not the exception — mobile-first is the convention every other stylesheet here follows");
  const wide = DO_CSS.slice(DO_CSS.indexOf("@media (min-width: 641px)"));
  ok(/grid-template-columns: 1\.15rem 6\.4rem 1fr;/.test(wide) && /grid-template-areas: 'n k v';/.test(wide),
     "mobile: the desktop rule does not fold the step onto one row, so the chain never gets its tabular reading on a wide screen");
  ok(/min-height: 2\.5rem|min-height: 2\.75rem/.test(DO_CSS),
     "mobile: the chips, the rail buttons and the digest rows are not thumb-sized — every one of them is a primary navigation control now");
  ok(/@media \(prefers-reduced-motion: reduce\)/.test(DO_CSS),
     "mobile: the join's transitions are not dropped for readers who ask for less motion");
  ok(/-webkit-line-clamp/.test(DO_CSS),
     "mobile: a digest headline is not clamped, so one long headline undoes the compression it is part of");
  ok(/overflow-x: auto|flex-wrap: wrap/.test(DO_CSS),
     "mobile: the rail's chips neither wrap nor scroll, so a third spotlight title would overflow the viewport");
}

// ── report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error("\n✗ profile dossier: " + failures.length + " failure(s)\n");
  failures.forEach((f) => console.error("  · " + f));
  console.error("");
  process.exit(1);
}
console.log("✓ profile dossier: all " + passed + " assertions passed");
