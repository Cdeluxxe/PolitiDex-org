#!/usr/bin/env node
/**
 * test-eye-lanes.mjs — the All-Seeing Eye searches one lane at a time
 * ─────────────────────────────────────────────────────────────────────────────
 * Formal and public are different jobs. "What did the record do" is answered by
 * issue files, the families they sit in, the roster and the measures; "what has
 * been said about it" is answered by spotlights, quotes and stated positions.
 * The Eye used to answer both into one list called "Issues & Hot Topics", where
 * a sourced investigation and a formal issue file competed on the same score for
 * the same slot — so a query like "land pres" could put a wildfire spotlight
 * above Protect Public Lands, and a reader looking for the record got a story.
 *
 * One box, two modes. What this file pins:
 *
 *   1. THE TOGGLE IS ON THE RESULTS, AND IT IS NOT A NEW QUERY. Formal record is
 *      the default; switching to Public and back leaves the query string alone
 *      and changes only which groups render and in what order.
 *   2. FORMAL LEADS WITH THE FILE. On a query that matches a vocabulary key or
 *      its label, the first issue-class hit is that key's own /i/ file or the
 *      core family it sits under — never a spotlight, because there are no
 *      spotlights in this mode at all.
 *   3. PUBLIC HOLDS NO FILE ROWS. Spotlights, quotes and positions; zero /i/
 *      rows, zero family rows.
 *   4. EVERY GROUP IS LABELLED, in both modes.
 *   5. A BUNDLE CHIP IS A FAMILY, NOT A LEADERBOARD. The Climate, Energy & Land
 *      row opens the family — the child shelf and /i/ — rather than the
 *      882-person consistency ranking.
 *   6. NO PARTY STRING IS A SORT KEY. Permute every party letter in the roster
 *      and the order of the people rows does not move, in either mode.
 *
 * The third lane — Mandate, which holds the People's Mandate reforms and is
 * neither of these two — has its own file: scripts/test-eye-mandate-lane.mjs.
 * What is pinned HERE is that formal and public still answer their own question,
 * and section 4 below asserts the group labels of these two lanes only.
 *
 * Real shipped modules in a node:vm sandbox, the real ISSUE_MAP, the real family
 * table and the real roster. The spotlight lane is the one fixture: a plausible
 * public-lands investigation, seeded precisely so it WOULD outrank the file if
 * the two lanes still shared a list.
 *
 *   node scripts/test-eye-lanes.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const EYE_SRC = R("all-seeing-eye.js");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} — missing ${JSON.stringify(needle)}`);
const no = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg} — found ${JSON.stringify(needle)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ eye lanes: STALE HARNESS — ${msg}`);
  process.exit(2);
};

const KEY = "lands_preserve";
// The queries the smoke names. Both must reach the same file.
const QUERIES = ["lands preserve", "land pres"];

// ── the one fixture: a spotlight that would win if the lanes still shared ────
// Every word in this title is a word the query matches, and the eye scores a
// spotlight's title the same way it scores a file's. If Formal ever readmits
// spotlights, this row leads the results — which is precisely the reported bug,
// reproduced on purpose rather than hoped against.
const SPOTLIGHTS = [
  {
    slug: "wildfire-season-public-lands",
    title: "Wildfire Season on Utah's Preserved Public Lands",
    place: "Utah",
    eyebrow: "Investigation",
    blurb: "Who pays to preserve the land that keeps burning, and who signed off on the leases.",
    searchKeywords: "land lands preserve preserved public lands wildfire",
  },
  {
    slug: "county-road-easements",
    title: "The County Road Easement Fight",
    place: "Garfield County",
    blurb: "RS 2477 claims across preserved federal land.",
    searchKeywords: "land preserve easement road",
  },
];

// ── boot ────────────────────────────────────────────────────────────────────
function stubNode() {
  const set = new Set();
  const n = {
    id: "", className: "", innerHTML: "", textContent: "", value: "", tagName: "DIV",
    style: { setProperty() {}, removeProperty() {} }, dataset: {}, hidden: false, _attrs: {},
    classList: {
      add: (c) => set.add(c), remove: (c) => set.delete(c),
      toggle: (c) => (set.has(c) ? set.delete(c) : set.add(c)), contains: (c) => set.has(c),
    },
    setAttribute(k, v) { n._attrs[k] = String(v); },
    getAttribute(k) { return k in n._attrs ? n._attrs[k] : null; },
    removeAttribute(k) { delete n._attrs[k]; },
    focus() {}, blur() {}, scrollIntoView() {}, click() {},
    addEventListener() {}, removeEventListener() {}, remove() {},
    appendChild: (c) => c, insertBefore: (c) => c, insertAdjacentHTML() {},
    querySelector: () => null, querySelectorAll: () => [], closest: () => null, contains: () => true,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 320, height: 44, bottom: 44, right: 320 }),
  };
  return n;
}

function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const panel = stubNode(), input = stubNode(), eye = stubNode(), clear = stubNode();
  input.tagName = "TEXTAREA";
  const ids = { "pdx-eye-panel": panel, "pdx-eye-input": input, "pdx-eye": eye, "pdx-eye-clear": clear };
  win.document.getElementById = (id) => ids[id] || null;
  win.history = { replaceState() {}, pushState() {} };
  const ctx = vm.createContext(win);
  // alignment-tool.js carries ISSUE_MAP and CORE_NATIONAL_ISSUES; the family
  // table and the colour table are what the file and family rows read their
  // parent and their tint from. consistency.js is in ENGINE_FILES and publishes
  // formalPatternIndex.count, which is how "people with a formal row first"
  // knows who has one.
  for (const f of [...ENGINE_FILES, "pdx-issue-family.js", "issue-colors.js"]) {
    vm.runInContext(R(f), ctx, { filename: f });
  }
  win.PROFILES = win.CMP_DATA;
  if (opts.party) {
    // THE PARTY MUTATION. Same roster, same names, same offices, every party
    // letter rotated. Nothing about relevance has changed, so nothing about the
    // order may change either.
    const rot = { R: "D", D: "I", I: "R" };
    const swapped = {};
    for (const [id, rec] of Object.entries(win.CMP_DATA || {})) {
      const p = String((rec && rec.party) || "").trim().charAt(0).toUpperCase();
      swapped[id] = { ...rec, party: rot[p] || rec.party };
    }
    win.CMP_DATA = swapped;
    win.PROFILES = swapped;
  }
  win.PDXSpotlight = { list: () => (opts.noSpotlights ? [] : SPOTLIGHTS) };
  win.PDXLazyData = {
    ensure: () => Promise.resolve(true), loaded: () => true,
    whenReady: (k, cb) => cb(),
  };
  win.PDX_BILLS_INDEX = win.PDX_BILLS_INDEX || [];
  win._issueLabel = (k) => (win.ISSUE_MAP && win.ISSUE_MAP[k] && win.ISSUE_MAP[k].label) || "";
  vm.runInContext(EYE_SRC, ctx, { filename: "all-seeing-eye.js" });
  must(win.PDXEye && typeof win.PDXEye.render === "function", "PDXEye.render is unavailable");
  must(typeof win.PDXEye.lane === "function", "PDXEye.lane() is not published — there is no toggle to test");
  return {
    win, panel, input,
    lane(m) { return win.PDXEye.lane(m); },
    search(q) {
      eye.classList.add("is-open");
      input.value = q;
      win.PDXEye.rebuild();
      win.PDXEye.render(q);
      return panel.innerHTML || "";
    },
  };
}

// Group headings, in painted order.
const CATS = (html) => [...String(html).matchAll(/data-cat="([^"]+)"/g)].map((m) => m[1]);
// One labelled group's markup, sliced off the rest. Several claims below are
// about POSITION — which row leads, which group a row sits under — and a panel
// that answers them in a different block has not answered them.
function catSlice(html, cat) {
  const s = String(html);
  const at = s.indexOf(`data-cat="${cat}"`);
  if (at === -1) return "";
  const next = s.indexOf('data-cat="', at + 10);
  return next === -1 ? s.slice(at) : s.slice(at, next);
}
// Every result ROW the panel painted, in painted order, as {kind, key}.
//
// SLICED TO THE ROWS ON PURPOSE. A row can carry cross-link chips inside it —
// "also see this person", "central to this spotlight" — and those chips use the
// same data-kind attribute as a row does. Reading data-kind off the whole panel
// therefore returns rows and chips interleaved, which is a different sequence
// from the one a reader sees, and every ordering claim in this file would be
// made against it. Rows are the anchors and buttons that open with
// class="pdx-eye-item", so that is what this matches.
const ROWS = (html) =>
  [...String(html).matchAll(/class="pdx-eye-item[^"]*"[^>]*?data-kind="([^"]+)"(?:\s+data-(?:key|id|slug)="([^"]*)")?/g)]
    .map((m) => ({ kind: m[1], key: m[2] || "" }));

const probe = boot();
must(probe.win.ISSUE_MAP && probe.win.ISSUE_MAP[KEY], `${KEY} is no longer a shipped ISSUE_MAP key`);
must(probe.win.PDXIssueFamily && typeof probe.win.PDXIssueFamily.coreOf === "function",
  "PDXIssueFamily.coreOf is not published — the file rows have no parent to name");
const CORE = probe.win.PDXIssueFamily.coreOf(KEY);
must(CORE, `${KEY} has no core parent, so the family half of this file tests nothing`);
must(probe.win.PDXConsistency && probe.win.PDXConsistency.formalPatternIndex &&
     typeof probe.win.PDXConsistency.formalPatternIndex.count === "function",
  "formalPatternIndex.count is gone — 'people with a formal row first' cannot be checked");
// THE EXTRACTOR HAS TO FIND ROWS. Every ordering claim below reads ROWS(), and a
// regex that matches nothing turns this file into a very fast, very green no-op —
// which is exactly what happened once already, when row markup and cross-link chip
// markup could not be told apart.
{
  const p = boot();
  const rows = ROWS(catSlice(p.search("lee"), "pol"));
  must(rows.length > 0 && rows.every((r) => r.kind === "pol" && r.key),
    `the row extractor found ${rows.length} people row(s) in the people group — the eye's row ` +
    `markup has changed shape and every ordering assertion in this file is vacuous`);
  p.lane("public");
  const spots = ROWS(catSlice(p.search("land preserve"), "spot"));
  must(spots.length > 0 && spots.every((r) => r.kind === "spotlight"),
    "the row extractor found no spotlight rows in the spotlight group");
}
// The spotlight fixture has to be a real competitor or section 2 is decoration.
{
  const bare = boot({ noSpotlights: true });
  bare.lane("public");
  const withSpots = boot();
  withSpots.lane("public");
  must(withSpots.search("land preserve").includes("wildfire-season-public-lands"),
    "the seeded spotlight does not answer 'land preserve' even in its own lane — it cannot " +
    "prove anything about the lane that excludes it");
}

console.log(`\n👁️  eye lanes — formal record | public & spotlights, over ${KEY}`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the toggle is on the results, and it is not a new query");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot();
  eq(B.lane(), "formal", "the Eye does not open on the formal record");
  const formal = B.search("land preserve");
  has(formal, 'data-eye-lane="formal"', "the results carry no formal-lane control");
  has(formal, 'data-eye-lane="public"', "the results carry no public-lane control");
  has(formal, "Formal record", "the formal setting is not labelled");
  has(formal, "Public &amp; spotlights", "the public setting is not labelled");
  has(formal, 'aria-pressed="true"', "neither setting reports itself as the current one");
  // THE QUERY IS NOT REWRITTEN. Switching lanes re-ranks what is already there;
  // the box keeps the words the reader typed, and going back is byte-identical.
  eq(B.lane("public"), "public", "the lane did not switch to public");
  const pub = B.search("land preserve");
  eq(B.input.value, "land preserve", "switching lanes rewrote the query string");
  eq(B.lane("formal"), "formal", "the lane did not switch back to formal");
  eq(B.search("land preserve"), formal, "switching to public and back did not restore the formal results");
  ok(pub !== formal, "the two lanes painted identical results — the toggle changes nothing");
  // An unknown setting is refused rather than accepted as a third lane.
  eq(B.lane("sideways"), "formal", "the Eye accepted a lane that does not exist");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · formal leads with the file, and holds no spotlight at all");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot();
  for (const q of QUERIES) {
    const html = B.search(q);
    // The first issue-class row is this key's own file, or the family it sits in.
    const issueish = ROWS(html).filter((r) => r.kind === "issuefile" || r.kind === "family" || r.kind === "spotlight");
    // The chips inside a row are excluded by ROWS, so a spotlight reachable only
    // as a cross-link is checked separately, below, against the whole panel.
    ok(issueish.length > 0, `formal "${q}" painted no issue-class row at all`);
    const first = issueish[0] || {};
    ok(first.kind === "issuefile" || first.kind === "family",
      `formal "${q}" leads its issue rows with ${JSON.stringify(first.kind)} — a file or a family was expected`);
    ok(first.key === KEY || first.key === CORE,
      `formal "${q}" leads with ${JSON.stringify(first.key)} — ${KEY} or its family ${CORE} was expected`);
    // ZERO SPOTLIGHTS. Not ranked lower — absent. Rows, cross-links and the
    // group heading alike.
    eq(issueish.filter((r) => r.kind === "spotlight").length, 0,
      `formal "${q}" painted a spotlight row`);
    no(html, 'data-kind="spotlight"', `formal "${q}" painted a spotlight row`);
    no(html, "wildfire-season-public-lands", `formal "${q}" reached a spotlight through some other markup`);
    no(html, "Issue Spotlights", `formal "${q}" printed the spotlight group heading`);
    // The file row is an address, not a modal: it points at /i/<key>.
    has(html, `/i/${KEY}`, `formal "${q}" printed a file row with no /i/ address on it`);
  }
  // The lane note says where the other half went, so an absence is explained
  // rather than just performed.
  has(B.search("land preserve"), "in the other lane",
    "the formal lane hides spotlights without telling the reader where they are");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · public holds the spotlights, and no file rows");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot();
  B.lane("public");
  for (const q of QUERIES) {
    const html = B.search(q);
    const rows = ROWS(html);
    eq(rows.filter((r) => r.kind === "issuefile").length, 0,
      `public "${q}" painted an issue-file row`);
    eq(rows.filter((r) => r.kind === "family").length, 0,
      `public "${q}" painted an issue-family row`);
    no(html, `href="/i/${KEY}"`, `public "${q}" painted a /i/ file address`);
    // The GROUP, not the words. The lane note names the other lane's contents in
    // prose ("Issue files and measures are in the other lane"), which is the
    // sentence that tells a reader where they went — so the claim is about
    // whether a file block was painted, not about whether the phrase occurs.
    ok(!CATS(html).includes("file"), `public "${q}" painted an issue-file group`);
    ok(!CATS(html).includes("fam"), `public "${q}" painted an issue-family group`);
  }
  // And it does hold the public lane's own work, or it is not a lane.
  const html = B.search("land preserve");
  ok(ROWS(html).some((r) => r.kind === "spotlight"),
    "the public lane painted no spotlight — it is an empty room, not the other half of the box");
  has(html, "Issue Spotlights", "the public lane does not label its spotlight group");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · every group is labelled, in both modes");
// ═════════════════════════════════════════════════════════════════════════════
// A row with no heading over it is a row whose lane the reader has to guess, and
// guessing is what this pass exists to stop.
{
  const B = boot();
  for (const lane of ["formal", "public"]) {
    B.lane(lane);
    const html = B.search("land preserve");
    const cats = CATS(html);
    ok(cats.length >= 2, `the ${lane} lane painted ${cats.length} labelled group(s) for a query with several`);
    // Each category block opens with its own heading element.
    for (const c of cats) {
      has(html, `data-cat="${c}"`, `the ${lane} lane painted a ${c} block with no heading`);
    }
    // Every painted row sits inside one of the labelled groups: no orphan rows
    // between the blocks.
    const kinds = new Set(ROWS(html).map((r) => r.kind));
    for (const k of kinds) {
      const expect = { pol: "pol", stance: "stance", bill: "bill", issuefile: "file", family: "fam", spotlight: "spot" }[k];
      if (!expect) continue;
      ok(cats.includes(expect),
        `the ${lane} lane painted a ${k} row with no ${expect} group heading over it`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · a bundle chip is a family, not a leaderboard");
// ═════════════════════════════════════════════════════════════════════════════
// The core row used to be the door to a ranked list of every person in the
// archive who has ever touched the bundle — "882 politicians, ranked by
// consistency". That is a characterisation of people, and this is a row about an
// issue: it opens the family, which is the child shelf and the /i/ file.
{
  const B = boot();
  const html = B.search("climate energy");
  const fam = ROWS(html).find((r) => r.kind === "family");
  ok(fam, "no family row answered a bundle query at all");
  if (fam) {
    has(html, `data-kind="family" data-key="${fam.key}"`, "the family row carries no key to open");
    has(html, `/i/${fam.key}`, "the family row does not address the family's own file");
    ok(probe.win.PDXIssueFamily.isCore(fam.key),
      `the family row's key ${JSON.stringify(fam.key)} is not one of the thirteen cores`);
  }
  // The row says what the family IS — how many keys are filed under it — and not
  // how many people can be ranked inside it.
  has(html, "Issue family", "the family row is not labelled as a family");
  // AND IT WEARS THE FAMILY'S COLOUR, from the one palette. The token is compared
  // to what PDXIssueColors publishes for that key rather than to a hex written
  // here, so a repalette moves both at once and a second table cannot appear.
  const IC = probe.win.PDXIssueColors;
  must(IC && typeof IC.styleFor === "function", "PDXIssueColors.styleFor is not published");
  if (fam) {
    has(html, IC.styleFor(fam.key), "the family row does not carry PDXIssueColors' own token for its key");
    has(html, 'data-kind="family" data-key="' + fam.key + '" data-ic="on"',
      "the family row carries no [data-ic] gate, so the stylesheet has nothing to spend the hue on");
  }
  // A file row wears its PARENT's colour, which is what makes a child chip and the
  // file it opens read as one subject.
  const fileHtml = boot().search("land preserve");
  has(fileHtml, IC.styleFor(CORE), `the ${KEY} file row does not wear its family's colour`);
  has(fileHtml, `data-kind="issuefile" data-key="${KEY}" data-ic="on"`,
    "the file row carries no [data-ic] gate");
  no(html, "ranked by consistency", "a bundle row still advertises the consistency ranking");
  no(html, "backs up their words", "a bundle row still advertises the word-vs-action lane");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · no party string is a sort key, in either mode");
// ═════════════════════════════════════════════════════════════════════════════
// The mutation is the whole assertion. Reading the comparator and finding no
// party term in it proves nothing about a boost applied three functions away, so
// the roster's party letters are rotated and the painted order is compared.
{
  const plain = boot();
  const rotated = boot({ party: true });
  for (const lane of ["formal", "public"]) {
    plain.lane(lane);
    rotated.lane(lane);
    for (const q of ["land preserve", "lee", "smith", "housing"]) {
      const a = ROWS(catSlice(plain.search(q), "pol")).filter((r) => r.kind === "pol").map((r) => r.key);
      const b = ROWS(catSlice(rotated.search(q), "pol")).filter((r) => r.kind === "pol").map((r) => r.key);
      ok(a.length > 0 || b.length > 0, `neither roster answered ${JSON.stringify(q)} in the ${lane} lane`);
      eq(b.join("|"), a.join("|"),
        `rotating every party letter moved the ${lane} people order for ${JSON.stringify(q)}`);
    }
  }
  // And the formal lane's own ordering rule is the record, not the letter: the
  // people it lists first are the ones with a formal row on file.
  plain.lane("formal");
  const F = plain.win.PDXConsistency.formalPatternIndex;
  const order = ROWS(catSlice(plain.search("lee"), "pol")).filter((r) => r.kind === "pol").map((r) => r.key);
  let seenEmpty = false, inverted = false;
  for (const pid of order) {
    const n = F.count(pid) || 0;
    if (n === 0) seenEmpty = true;
    else if (seenEmpty) inverted = true;
  }
  ok(!inverted, `the formal lane listed a person with no formal row above one who has some (${order.join(", ")})`);
}

// ── Report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ eye lanes: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`\n✓ eye lanes: all ${passed} assertions passed`);
console.log(`  2 of 3 lanes · ${QUERIES.length} queries · ${KEY} under ${CORE} · party rotation rejected`);
