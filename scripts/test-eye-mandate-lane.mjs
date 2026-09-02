#!/usr/bin/env node
/**
 * test-eye-mandate-lane.mjs — a mandate is a third lane, not Public and not Formal
 * ─────────────────────────────────────────────────────────────────────────────
 * The Eye had two lanes: Formal (issue files, the families they sit in, the
 * roster, the measures) and Public (spotlights, quotes, stated positions). The
 * People's Mandate is neither. Dropped into Public a proposed reform reads as a
 * quote — a thing somebody SAID — when it is a thing citizens are ASKING FOR and
 * nobody may have said a word about it. Dropped into Formal it reads as a
 * measure — a thing that was VOTED ON — when a proposed vehicle has no tally at
 * all, not even a failed one. Both readings lend the document a standing it has
 * not got, so it gets a lane of its own.
 *
 * What this file pins:
 *
 *   1. THE THIRD CONTROL EXISTS, AND SWITCHING TO IT IS NOT A NEW QUERY. Three
 *      lanes are printed in every mode, the box still says what the reader
 *      typed, and the sentence under the control names how many hits sit in the
 *      OTHER TWO lanes.
 *   2. FORMAL HOLDS ZERO MANDATE ROWS, and no mandate group.
 *   3. PUBLIC HOLDS ZERO MANDATE ROWS, and no mandate group.
 *   4. MANDATE HOLDS ONLY MANDATE ROWS: zero /i/ file rows, zero spotlight rows,
 *      zero family rows, zero people rows, and no /i/ address anywhere in it.
 *   5. NO MANDATE HEADCOUNT IN A FORMAL DENOMINATOR. The same query is run on an
 *      Eye that indexes the reforms and on one that indexes none; the Formal and
 *      Public counts printed on the control are identical either way.
 *   6. THE EMPTY LANE IS SHIPPED, NOT HIDDEN. With zero reforms indexed the
 *      control still carries Mandate and the panel still prints the locked
 *      sentence, verbatim. Sentence or cards — never both.
 *   7. A MANDATE ROW IS NOT A RECORD: no percentage, no party letter, no formal
 *      pattern chip, no action strip, no "backs it up", and rotating every party
 *      letter in the roster does not move the list.
 *   8. THE DOOR IS THE MANDATE SURFACE THAT ALREADY EXISTS. The row carries the
 *      reform's agenda id and the navigate arm hands it to the shipped
 *      _pdxMandateFocusReform bridge, with #agenda as the only fallback.
 *
 * Real shipped modules in a node:vm sandbox, the real ISSUE_MAP, the real family
 * table, the real roster. The mandate registry is the one fixture, seeded in the
 * shape the shipped bridge publishes (index.html) — three real reforms, copied
 * field for field, because the bridge is inline script and cannot be booted
 * here. Section 8 checks that registry and its opener are still what this file
 * pretends they are.
 *
 *   node scripts/test-eye-mandate-lane.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const EYE_SRC = R("all-seeing-eye.js");
const INDEX_SRC = R("index.html");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} — missing ${JSON.stringify(needle)}`);
const no = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg} — found ${JSON.stringify(needle)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ eye mandate lane: STALE HARNESS — ${msg}`);
  process.exit(2);
};

// The locked copy. Not paraphrased here on purpose: this string is the empty
// state's whole job, and a test that matched it loosely would let it drift.
const EMPTY_SENTENCE =
  "No mandate on file for this search. A mandate is a proposed vehicle — not a vote and not a quote.";

// ── the fixtures ────────────────────────────────────────────────────────────
// Three shipped reforms, copied out of the bridge's own MANDATE_ITEMS: one
// single-issue, one that spans two tracked issues, one whose words collide with
// a formal file ("water") so the other-lane counts are genuinely non-zero.
const MANDATES = [
  { agendaId: "agenda-termlimits", title: "term limits for congress", issueKey: "term_limits", icon: "⏳", name: "Term Limits for Congress" },
  { agendaId: "agenda-stocks", title: "ban congressional stock trading", issueKey: "stock_trading_ban", issueKeys: ["stock_trading_ban", "gov_transparency"], icon: "📈", name: "Ban Congressional Stock Trading" },
  { agendaId: "agenda-water", title: "protect western water compact rights", issueKey: "water", issueKeys: ["water", "water_storage"], icon: "💧", name: "Protect Western Water Rights" },
];
// A spotlight, so the public lane is not empty by accident and so section 4's
// "zero spotlight rows" is a claim about a lane that had one to offer.
const SPOTLIGHTS = [
  {
    slug: "term-limits-pledge-tracker",
    title: "Who Signed the Term Limits Pledge, and Who Kept It",
    place: "Utah",
    eyebrow: "Investigation",
    blurb: "The water compact fight and the term limits pledge, side by side.",
    searchKeywords: "term limits pledge water congress stock trading",
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
  for (const f of [...ENGINE_FILES, "pdx-issue-family.js", "issue-colors.js"]) {
    vm.runInContext(R(f), ctx, { filename: f });
  }
  win.PROFILES = win.CMP_DATA;
  if (opts.party) {
    // Same roster, same names, same offices, every party letter rotated.
    const rot = { R: "D", D: "I", I: "R" };
    const swapped = {};
    for (const [id, rec] of Object.entries(win.CMP_DATA || {})) {
      const p = String((rec && rec.party) || "").trim().charAt(0).toUpperCase();
      swapped[id] = { ...rec, party: rot[p] || rec.party };
    }
    win.CMP_DATA = swapped;
    win.PROFILES = swapped;
  }
  win.PDXSpotlight = { list: () => SPOTLIGHTS };
  win.PDXLazyData = { ensure: () => Promise.resolve(true), loaded: () => true, whenReady: (k, cb) => cb() };
  win.PDX_BILLS_INDEX = win.PDX_BILLS_INDEX || [];
  win._issueLabel = (k) => (win.ISSUE_MAP && win.ISSUE_MAP[k] && win.ISSUE_MAP[k].label) || "";
  // THE ONE FIXTURE. `noMandate` is the honest zero the spec ships for: an Eye
  // whose bridge indexed nothing at all.
  if (!opts.noMandate) win._pdxMandateItems = MANDATES;
  vm.runInContext(EYE_SRC, ctx, { filename: "all-seeing-eye.js" });
  must(win.PDXEye && typeof win.PDXEye.render === "function", "PDXEye.render is unavailable");
  must(typeof win.PDXEye.lane === "function", "PDXEye.lane() is not published — there is no control to test");
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
function catSlice(html, cat) {
  const s = String(html);
  const at = s.indexOf(`data-cat="${cat}"`);
  if (at === -1) return "";
  const next = s.indexOf('data-cat="', at + 10);
  return next === -1 ? s.slice(at) : s.slice(at, next);
}
// Every result ROW, in painted order, as {kind, key}. Anchored to the row's own
// class so the cross-link chips INSIDE a row — which carry the same data-kind —
// are not counted as rows of their own.
const ROWS = (html) =>
  [...String(html).matchAll(/class="pdx-eye-item[^"]*"[^>]*?data-kind="([^"]+)"(?:\s+data-(?:key|id|slug|number)="([^"]*)")?/g)]
    .map((m) => ({ kind: m[1], key: m[2] || "" }));
// The count printed on one lane's button.
const laneCount = (html, id) => {
  const m = String(html).match(
    new RegExp(`data-eye-lane="${id}"[^>]*>.*?<span class="pdx-eye-lane-n">(\\d+)</span>`)
  );
  return m ? Number(m[1]) : null;
};

// ── harness self-checks ─────────────────────────────────────────────────────
const probe = boot();
must(probe.win.ISSUE_MAP, "ISSUE_MAP did not load — the other two lanes have nothing to hold");
for (const m of MANDATES) {
  const keys = m.issueKeys || [m.issueKey];
  must(keys.some((k) => probe.win.ISSUE_MAP[k]),
    `fixture ${m.agendaId} names no shipped ISSUE_MAP key (${keys.join(", ")}) — the copy is stale`);
}
const QUERIES = ["term limits", "water"];
{
  const p = boot();
  p.lane("mandate");
  const rows = ROWS(p.search(QUERIES[0]));
  must(rows.length > 0, "the row extractor found nothing in the mandate lane — every claim below is vacuous");
  must(rows.some((r) => r.kind === "mandate"), "no mandate row ranked for 'term limits' — the fixture never enters the index");
  p.lane("formal");
  must(ROWS(p.search(QUERIES[0])).length > 0, "the formal lane answered nothing for 'term limits'");
  p.lane("public");
  must(ROWS(p.search(QUERIES[0])).some((r) => r.kind === "spotlight"),
    "the seeded spotlight never ranked in the public lane — 'zero spotlight rows' would prove nothing");
}

console.log("📜 eye mandate lane — a proposed vehicle is not a vote and not a quote");

// ── 1 · the third control, and the query it does not touch ──────────────────
section("1 · three lanes are printed, and switching is not a new query");
{
  const B = boot();
  for (const mode of ["formal", "public", "mandate"]) {
    eq(B.lane(mode), mode, `the Eye refused the ${mode} lane`);
    const html = B.search(QUERIES[0]);
    has(html, 'data-eye-lane="formal"', `the ${mode} lane dropped the Formal control`);
    has(html, 'data-eye-lane="public"', `the ${mode} lane dropped the Public control`);
    has(html, 'data-eye-lane="mandate"', `the ${mode} lane dropped the Mandate control`);
    has(html, 'aria-pressed="true"', `no lane is marked as the one the reader is in (${mode})`);
    eq((html.match(/aria-pressed="true"/g) || []).length, 1,
      `more than one lane is marked current in ${mode}`);
    eq(B.input.value, QUERIES[0], `the ${mode} lane rewrote the query in the box`);
  }
  // A lane that does not exist is not a lane.
  B.lane("mandate");
  eq(B.lane("sideways"), "mandate", "the Eye accepted a lane that does not exist");
  // COUNTS UNDER THE CONTROL NAME THE OTHER TWO. In the mandate lane the
  // sentence has to say where the formal and public answers went, by number.
  const mHtml = B.search(QUERIES[0]);
  const say = (mHtml.match(/<span class="pdx-eye-lane-say">([\s\S]*?)<\/span>\s*<\/div>/) || [, ""])[1];
  has(say, "Formal record holds <b>", "the mandate lane does not say how many formal hits there are");
  has(say, "Public &amp; spotlights holds <b>", "the mandate lane does not say how many public hits there are");
  no(say, "Mandate holds", "the mandate lane counted itself as one of the other lanes");
  for (const id of ["formal", "public", "mandate"]) {
    ok(typeof laneCount(mHtml, id) === "number", `the ${id} control carries no count for this search`);
  }
  ok((laneCount(mHtml, "mandate") || 0) > 0, "the mandate control printed no count for a search that ranks reforms");
}

// ── 2 · formal holds zero mandate rows ──────────────────────────────────────
section("2 · formal record: zero mandate rows, and no mandate group");
{
  const B = boot();
  B.lane("formal");
  for (const q of QUERIES) {
    const html = B.search(q);
    const rows = ROWS(html);
    eq(rows.filter((r) => r.kind === "mandate").length, 0,
      `the formal lane painted a mandate row for ${JSON.stringify(q)}`);
    ok(!CATS(html).includes("mand"), `the formal lane opened a mandate group for ${JSON.stringify(q)}`);
    no(html, "proposed vehicle</span>", `a formal row called itself a proposed vehicle for ${JSON.stringify(q)}`);
    no(html, 'data-kind="mandate"', `the formal lane carries mandate markup for ${JSON.stringify(q)}`);
  }
}

// ── 3 · public holds zero mandate rows ──────────────────────────────────────
section("3 · public & spotlights: zero mandate rows, and no mandate group");
{
  const B = boot();
  B.lane("public");
  for (const q of QUERIES) {
    const html = B.search(q);
    eq(ROWS(html).filter((r) => r.kind === "mandate").length, 0,
      `the public lane painted a mandate row for ${JSON.stringify(q)}`);
    ok(!CATS(html).includes("mand"), `the public lane opened a mandate group for ${JSON.stringify(q)}`);
    no(html, 'data-kind="mandate"', `the public lane carries mandate markup for ${JSON.stringify(q)}`);
  }
}

// ── 4 · mandate holds only mandates ─────────────────────────────────────────
section("4 · mandate: no file rows, no spotlight rows, nothing but reforms");
{
  const B = boot();
  B.lane("mandate");
  for (const q of QUERIES) {
    const html = B.search(q);
    const rows = ROWS(html);
    const strays = rows.filter((r) => r.kind !== "mandate").map((r) => `${r.kind}:${r.key}`);
    eq(strays.join(", "), "", `the mandate lane painted a row that is not a reform for ${JSON.stringify(q)}`);
    eq(rows.filter((r) => r.kind === "issuefile").length, 0, `an /i/ file row is in the mandate lane (${q})`);
    eq(rows.filter((r) => r.kind === "family").length, 0, `a family row is in the mandate lane (${q})`);
    eq(rows.filter((r) => r.kind === "spotlight").length, 0, `a spotlight row is in the mandate lane (${q})`);
    eq(rows.filter((r) => r.kind === "pol").length, 0, `a person row is in the mandate lane (${q})`);
    // A reform has no /i/ address, so the lane prints none — not even the lead
    // block's, which is withheld here for the same reason.
    no(html, 'href="/i/', `the mandate lane printed an issue-file address (${q})`);
    // Every group is labelled, and this lane's one group says what it holds.
    eq(CATS(html).join(","), "mand", `the mandate lane painted groups other than its own (${q})`);
    has(html, "proposed vehicles", `the mandate group is not labelled for what it holds (${q})`);
  }
  // The blank, focused state is the lane's shelf — not four spotlight
  // suggestions wearing a mandate label.
  const blank = B.search("");
  has(blank, 'data-eye-lane="mandate"', "the blank mandate lane dropped its own control");
  eq(ROWS(blank).filter((r) => r.kind !== "mandate").map((r) => r.kind).join(", "), "",
    "the blank mandate lane suggested rows from another lane");
  ok(ROWS(blank).length > 0, "the blank mandate lane offered nothing, though reforms are indexed");
  no(blank, EMPTY_SENTENCE, "the blank mandate lane claimed no mandate is on file while printing cards");
}

// ── 5 · no mandate headcount in a formal denominator ────────────────────────
section("5 · the other two lanes' counts do not move when reforms are indexed");
{
  const withM = boot(), without = boot({ noMandate: true });
  for (const q of QUERIES) {
    for (const mode of ["formal", "public"]) {
      withM.lane(mode); without.lane(mode);
      const a = withM.search(q), b = without.search(q);
      eq(laneCount(a, "formal"), laneCount(b, "formal"),
        `indexing the reforms changed the formal count in ${mode} for ${JSON.stringify(q)}`);
      eq(laneCount(a, "public"), laneCount(b, "public"),
        `indexing the reforms changed the public count in ${mode} for ${JSON.stringify(q)}`);
      eq(ROWS(a).length, ROWS(b).length,
        `indexing the reforms changed what the ${mode} lane paints for ${JSON.stringify(q)}`);
    }
  }
  // And the reforms are counted somewhere: their own slot, nowhere else.
  withM.lane("mandate");
  const m = withM.search(QUERIES[0]);
  without.lane("mandate");
  eq(laneCount(without.search(QUERIES[0]), "mandate"), 0, "an Eye with no reforms indexed still counted some");
  ok((laneCount(m, "mandate") || 0) > 0, "the reforms are indexed but the mandate lane counts none");
}

// ── 6 · the empty lane ships ────────────────────────────────────────────────
section("6 · an empty mandate lane is a sentence, never a hidden lane");
{
  const B = boot({ noMandate: true });
  // The blank, focused state, with nothing indexed at all.
  B.lane("mandate");
  const blank = B.search("");
  has(blank, 'data-eye-lane="mandate"', "the Mandate control was dropped when the lane is empty");
  has(blank, EMPTY_SENTENCE, "the empty mandate lane does not print the locked sentence");
  eq(ROWS(blank).length, 0, "the empty mandate lane painted rows out of nowhere");
  // A real search, still nothing on file.
  for (const q of [...QUERIES, "lee"]) {
    const html = B.search(q);
    has(html, 'data-eye-lane="mandate"', `the Mandate control vanished on ${JSON.stringify(q)}`);
    has(html, EMPTY_SENTENCE, `the empty mandate lane does not say so for ${JSON.stringify(q)}`);
    eq(ROWS(html).length, 0, `the empty mandate lane painted a row for ${JSON.stringify(q)}`);
    no(html, "still loading", `the empty mandate lane blamed a load for ${JSON.stringify(q)}`);
  }
  // The lane is in the control from the OTHER lanes too, even holding nothing.
  for (const mode of ["formal", "public"]) {
    B.lane(mode);
    has(B.search(QUERIES[0]), 'data-eye-lane="mandate"',
      `the ${mode} lane hid the empty Mandate lane from the control`);
  }
  // A search that ranks reforms elsewhere but none here: sentence, no cards.
  const C = boot();
  C.lane("mandate");
  const none = C.search("lee");
  has(none, EMPTY_SENTENCE, "a search with no reform on file did not print the locked sentence");
  eq(ROWS(none).length, 0, "a search with no reform on file painted a card anyway");
  // Never mixed: a lane that printed cards never also claims nothing is on file.
  const some = C.search(QUERIES[0]);
  ok(ROWS(some).length > 0, "the mandate lane ranked nothing for a query its fixture answers");
  no(some, EMPTY_SENTENCE, "the mandate lane printed cards AND the empty sentence");
}

// ── 7 · a mandate row is not a record ───────────────────────────────────────
section("7 · no percentage, no party, no pattern chip, no 'backs it up'");
{
  const B = boot();
  B.lane("mandate");
  for (const q of [...QUERIES, ""]) {
    const html = B.search(q);
    const slice = catSlice(html, "mand") || html;
    no(slice, "%", `the mandate lane printed a percentage for ${JSON.stringify(q)}`);
    no(slice, "backs it up", `the mandate lane offered "backs it up" for ${JSON.stringify(q)}`);
    no(slice, "Direction Match", `the mandate lane printed a Direction Match for ${JSON.stringify(q)}`);
    no(slice, "pdx-eye-act", `a mandate row carries an action strip for ${JSON.stringify(q)}`);
    no(slice, "pdx-eye-rel", `a mandate row carries formal cross-link chips for ${JSON.stringify(q)}`);
    // The party pills are drawn from these three colours and nothing else in the
    // panel uses them, so their absence is the absence of a party letter.
    for (const c of ["#f87171", "#60a5fa", "#a78bfa"]) {
      no(slice, c, `a party pill's colour is in the mandate lane for ${JSON.stringify(q)}`);
    }
  }
  // ROTATE EVERY PARTY LETTER. The list is the same list, in the same order.
  const plain = boot(), rotated = boot({ party: true });
  plain.lane("mandate"); rotated.lane("mandate");
  for (const q of [...QUERIES, ""]) {
    const a = ROWS(plain.search(q)).map((r) => r.key).join(" > ");
    const b = ROWS(rotated.search(q)).map((r) => r.key).join(" > ");
    eq(b, a, `rotating every party letter moved the mandate list for ${JSON.stringify(q)}`);
  }
}

// ── 8 · the door is the surface that already exists ─────────────────────────
section("8 · a mandate row opens the mandate section, not a new workshop");
{
  const B = boot();
  B.lane("mandate");
  const rows = ROWS(B.search(QUERIES[0])).filter((r) => r.kind === "mandate");
  ok(rows.length > 0, "no mandate row to open");
  for (const r of rows) {
    ok(/^agenda-/.test(r.key), `a mandate row carries no agenda id to open (${JSON.stringify(r.key)})`);
    ok(MANDATES.some((m) => m.agendaId === r.key), `a mandate row invented an agenda id (${r.key})`);
  }
  // The arm that opens it, read off the shipped source: the existing bridge, and
  // #agenda as the only fallback. No issue view, no /i/ door, no new global.
  const arm = (EYE_SRC.match(/else if \(kind === 'mandate'\) \{[\s\S]*?\n      \}/) || [""])[0];
  ok(arm.length > 0, "all-seeing-eye.js has no navigate() arm for a mandate row");
  has(arm, "_pdxMandateFocusReform", "the mandate row does not open the reform's own card");
  has(arm, "_pdxMandateFocus", "the mandate row has no per-issue fallback");
  has(arm, "getElementById('agenda')", "the mandate row has no fallback to the Mandate section itself");
  no(arm, "PDXIssueView", "a mandate row opens the issue ranking");
  no(arm, "pdxDoor1Issue", "a mandate row opens an issue file");
  // AND THE SURFACES IT NAMES ARE STILL SHIPPED. Both are inline in index.html,
  // which is why they are asserted here rather than booted.
  has(INDEX_SRC, "window._pdxMandateFocusReform = function", "the per-reform mandate opener is gone from index.html");
  has(INDEX_SRC, "window._pdxMandateFocus = function", "the per-issue mandate opener is gone from index.html");
  has(INDEX_SRC, "window._pdxMandateItems = MANDATE_ITEMS", "the mandate registry is no longer published");
  has(INDEX_SRC, 'id="agenda"', "the Mandate section itself is gone from index.html");
  // The lane reads the registry rather than keeping a copy of it.
  has(EYE_SRC, "window._pdxMandateItems", "the Eye stopped reading the one mandate registry");
  eq((EYE_SRC.match(/agenda-termlimits/g) || []).length, 0,
    "all-seeing-eye.js hardcodes a reform of its own");
  // Nothing in the Eye files a mandate against the formal machinery.
  const idx = EYE_SRC.indexOf("kind: 'mandate'");
  ok(idx > 0, "the mandate index entry is gone");
  const entry = EYE_SRC.slice(idx, idx + 900);
  no(entry, "formalPatternIndex", "a mandate row was handed to the formal pattern index");
  no(entry, "PDXConsistency", "a mandate row was handed to the consistency engine");
}

// ── Report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ eye mandate lane: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`\n✓ eye mandate lane: all ${passed} assertions passed`);
console.log(`  3 lanes · ${MANDATES.length} reforms indexed · the empty lane ships · party rotation rejected`);
