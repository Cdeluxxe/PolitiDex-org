#!/usr/bin/env node
/**
 * test-bill-noise-pass.mjs — the bill face says each thing once, in reader copy
 * ─────────────────────────────────────────────────────────────────────────────
 * H.R. 6644 was the case that showed the bill profile explaining itself twice and
 * leaking its own filing system. Three separate faults, all visible in one cold
 * open:
 *
 *   · IDENTITY WAS SCATTERED. Which act is this? The number was in the header,
 *     the chamber and sitting on a line under the title, the link to the official
 *     record under the buttons, the dates in a table below two vote strips, and
 *     the official title inside a closed fold. Five facts, four positions, and
 *     "House · 119th Congress" printed twice on the way past.
 *   · THE TOPICS WERE PRINTED TWICE. The ledger listed every mapped topic, and a
 *     second block below it announced "The same 4 topics, one instrument" — the
 *     same count, restated, under a list the reader had just finished. Above the
 *     ledger a lead paragraph restated the count a third time and a tally
 *     restated the directions the rows already carry.
 *   · THE CURATORS' NOTES WERE ON THE VOTER'S PAGE. `rationale` is a working
 *     field, and H.R. 6644's housing row ends "Weighted 80 rather than 100 and
 *     ranked below the housing_build primary because supply is the limb the Act's
 *     own long title names; the weight is what ranks the two axes, not the flag."
 *     Printed to a voter that is an invitation to believe their representative's
 *     vote counted 80 percent on housing. It counted in full.
 *
 * So this file guards the cold open, and it guards it against the SHIPPED SEED
 * rather than a fixture written to pass. The two housing rationales below are read
 * out of db/vr-issue-seed.json at run time, which is why this suite fails if the
 * scrubber is weakened OR if a later curator writes a new note in a shape the
 * sweep does not know. Two synthetic rider rows carry the phrasings the brief
 * named explicitly, including "housing_build 100 holds the primary", so the
 * coverage does not depend on the seed happening to contain them.
 *
 *   1. THE COLD OPEN: title, identity, chips and both vote strips, all of it
 *      above the folded prose, and every identity fact printed exactly once.
 *   2. ONE TOPIC SURFACE: one chip strip, one ledger, one short row per key.
 *   3. READER COPY ONLY: no weight number, no flag talk, no raw key, no label
 *      prefix, anywhere in the text a reader can see.
 *   4. THE ROLLS STAY SHUT: a closed native <details>, with every name inside it.
 *   5. TWIN BOOT: the same page with the scrubber absent, and the same Direction
 *      Match either way — this pass is display copy and touches no score.
 *
 * A note from mutating the sweep against these assertions: knocking out any ONE
 * of its phrasings leaks nothing, because the sentences curators actually write
 * carry three or four markers each ("Weighted 80 rather than 100 and ranked below
 * the housing_build primary … not the flag" trips five). That redundancy is the
 * point, and it is also why this file asserts on the rendered face rather than on
 * the regex: the only mutations it catches are the ones that would really ship —
 * the sweep bypassed, its vocabulary emptied, or the raw field printed straight.
 *
 *   node scripts/test-bill-noise-pass.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} — missing ${JSON.stringify(needle)}`);
const hasNot = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg} — found ${JSON.stringify(needle)}`);
const count = (hay, re) => (String(hay).match(re) || []).length;
const section = (t) => console.log(`\n  · ${t}`);
const die = (msg) => { console.error(`\n✗ bill noise pass: STALE HARNESS — ${msg}\n`); process.exit(2); };

// ── the fixture: the real curated mappings, read out of the shipped seed ──────
const SEED = JSON.parse(R("db/vr-issue-seed.json"));
const SEEDED = (SEED.measures || []).find((m) => m.number === "H.R. 6644");
if (!SEEDED || !SEEDED.issues || SEEDED.issues.length < 2) die("H.R. 6644 is no longer in db/vr-issue-seed.json");
const REAL = SEEDED.issues.map((i) => ({
  issueKey: i.issueKey,
  supportMeaning: i.supportMeaning || "yea_supports",
  isPrimary: !!i.isPrimary,
  weight: i.weight,
  rationale: i.rationale || "",
}));
// The seed's own record of what a curator note looks like, so the assertions
// below can prove the leak was real before proving it is gone.
const RAW = REAL.map((i) => i.rationale).join(" ");
if (!/Weighted 80/.test(RAW) || !/ranked below/.test(RAW) || !/Primary:/.test(RAW)) {
  die("the seeded H.R. 6644 rationales no longer contain the curator notes this suite exists to catch");
}
// The measure's two riders, whose rationales live in an applied migration rather
// than in a JSON seed. Written here in the same house style — and carrying the
// exact phrasings the brief named — so the sweep is tested against them too.
const SYNTH = [
  {
    issueKey: "permitting_reform", supportMeaning: "yea_supports", isPrimary: false, weight: 60,
    rationale: "Secondary: Title II shortens the environmental review window for qualifying " +
      "residential projects and sets deadlines for agency action on permit applications; a yea " +
      "shortens federal review. Weighted 60 because housing_build 100 holds the primary and this " +
      "row is ranked below it, and the weight is what ranks the two axes, not the flag.",
  },
  {
    issueKey: "crypto_cbdc", supportMeaning: "yea_opposes", isPrimary: false, weight: 40,
    rationale: "Title V bars a Federal Reserve central bank digital currency issued directly to " +
      "individuals, so a yea cuts against a retail CBDC. Re-keyed from gov_regulation in the " +
      "August 2026 taxonomy split; recorded neutrally at w40 and mapped below the housing rows.",
  },
];
const ISSUES = REAL.concat(SYNTH);
const N = ISSUES.length;
const MEASURE = {
  id: 88, number: "H.R. 6644", congress: 119, chamber: "house", status: "passed_house",
  title: "21st Century ROAD to Housing Act",
  introducedAt: "2025-12-04",
  summary:
    "Title I establishes a Federal housing supply block grant and conditions a portion of surface " +
    "transportation formula funds on the adoption of by-right approval near fixed-guideway transit. " +
    "Title II shortens the environmental review window for qualifying residential projects.",
  externalIds: {
    congressGovUrl: "https://www.congress.gov/bill/119th-congress/house-bill/6644",
    mappingReadFrom: "engrossed",
    mappingTextUrl: "https://www.congress.gov/bill/119th-congress/house-bill/6644/text/eh",
    officialTitle: "To increase the supply of housing in America, and for other purposes.",
  },
  source: { url: SEEDED.sourceUrl, label: "Congress.gov" },
};
// Two hundred names, because the roll drawer's whole reason for existing is that
// a list this long must not be on screen when the page opens.
const NAMES = Array.from({ length: 200 }, (_, k) => ({
  politicianId: `member_${k}`, name: `Member ${k}`,
  position: k < 118 ? "yea" : k < 190 ? "nay" : "not_voting",
}));
const ROLLS = [
  {
    id: 224, chamber: "house", question: "On Motion to Concur", result: "passed", voteDate: "2026-02-11",
    totals: { yea: 358, nay: 32, present: 1, notVoting: 4 }, votes: NAMES,
    source: { url: "https://clerk.house.gov/Votes/2026224", label: "Clerk of the House" },
  },
  {
    id: 53, chamber: "senate", question: "On Passage of the Bill", result: "passed", voteDate: "2026-03-12",
    totals: { yea: 89, nay: 10, present: 0, notVoting: 1 }, votes: [],
    source: { url: "https://www.senate.gov/votes/53", label: "U.S. Senate" },
  },
];
const DATA = { measure: MEASURE, issues: ISSUES, rollcalls: ROLLS, positions: [], provisions: [], actions: [] };

// ── boot ─────────────────────────────────────────────────────────────────────
// `withScrubber` is the twin-boot switch: the reader-copy sweep lives in
// receipt-cards.js, and leaving it out is exactly what a stripped or offline boot
// looks like. The page must degrade to "no scope sentence", never to a leak.
function boot(withScrubber) {
  const win = makeSandbox();
  const capture = { innerHTML: "", scrollTop: 0 };
  win.document.getElementById = (id) => (id === "pdx-bd-scroll" ? capture : null);
  win.history = { replaceState() {}, pushState() {} };
  const files = [...ENGINE_FILES, "issue-colors.js", "issue-scope.js"];
  if (withScrubber) files.push("receipt-cards.js");
  files.push("bill-detail.js");
  const ctx = vm.createContext(win);
  for (const f of files) vm.runInContext(R(f), ctx, { filename: f });
  if (!win.PDXBillDetail) die("PDXBillDetail is unavailable after loading bill-detail.js");
  if (withScrubber && typeof win._pdxReaderRationale !== "function") {
    die("receipt-cards.js no longer publishes window._pdxReaderRationale");
  }
  return { win, capture };
}
async function render(b, data) {
  b.capture.innerHTML = "";
  b.win.PDXBills = {
    get: () => Promise.resolve(data), list: () => Promise.resolve({ items: [] }),
    listSync: () => ({ items: [] }), isFollowed: () => false,
  };
  b.win.PDXBillDetail.open(data.measure.id);
  for (let i = 0; i < 12; i++) await Promise.resolve();
  return b.capture.innerHTML;
}

const B = boot(true);
const HTML = await render(B, DATA);
if (!HTML || HTML.length < 3000) die(`the act face rendered ${HTML.length} characters`);
const HEAD = HTML.slice(HTML.indexOf('<div class="bd-head">'), HTML.indexOf('class="bd-sec bd-lh"'));
const FOLD_AT = HTML.indexOf('class="bd-sec bd-foldsec"');
if (FOLD_AT < 0) die("the prose fold is not on the face, so 'above the fold' has no meaning here");
// Everything a reader can actually read: attribute values (which legitimately
// carry raw issue keys) are inside the tags this strips away.
const TEXT = HTML.replace(/<[^>]*>/g, " ").replace(/&#39;/g, "'").replace(/&amp;/g, "&")
  .replace(/\s+/g, " ");

console.log(`\n🧾 bill noise pass — H.R. 6644: ${N} topics, ${ROLLS.length} rolls, ${NAMES.length} names`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the cold open: title, identity, chips, both strips, then the prose");
// ═════════════════════════════════════════════════════════════════════════════
{
  const seq = [
    ["the number", 'class="bd-num"'],
    ["the title", 'class="bd-title"'],
    ["the identity block", 'class="bd-ident"'],
    ["the teaching line", 'class="bd-lh-teach"'],
    ["the chips", 'class="bd-lh-chips"'],
    ["the vote strips", 'class="bd-lh-votes"'],
  ];
  for (const [name, mark] of seq) has(HTML, mark, `${name} is not on the bill face`);
  const at = seq.map(([name, mark]) => ({ name, i: HTML.indexOf(mark) }));
  for (let k = 1; k < at.length; k++) {
    ok(at[k - 1].i < at[k].i, `${at[k].name} is printed before ${at[k - 1].name}`);
  }
  ok(at[at.length - 1].i < FOLD_AT, "part of the cold open is printed after the prose fold");
  // Both strips, above the fold, one per roll call in the record.
  eq(count(HTML.slice(0, FOLD_AT), /class="bd-lh-strip"/g), ROLLS.length,
    "the vote strips are not all above the folded prose");

  // IDENTITY, IN THE HEADER, ONCE EACH.
  has(HEAD, "H.R. 6644", "the number is not in the header");
  has(HEAD, "To increase the supply of housing in America", "the official title is not with the title row");
  has(HEAD, "House · 119th Congress", "the chamber and sitting are not printed together as identity");
  has(HEAD, "Introduced Dec 4, 2025", "the introduction date is not in the identity block");
  // Two roll calls, so "Voted" is the day the measure was last decided — the
  // House concurrence in February is not the date this bill was disposed of.
  has(HEAD, "Voted Mar 12, 2026", "the identity block does not date the measure by its last recorded vote");
  hasNot(HEAD, "Voted Feb 11, 2026", "the identity block dates the measure by the earlier of its two votes");
  has(HEAD, "house-bill/6644/text/eh", "the header does not link the text the mapping was read from");
  has(HEAD, "Engrossed text", "the text link does not name which document it is");
  for (const fact of ["House · 119th Congress", "Engrossed text", "Introduced Dec 4, 2025", "Voted Mar 12, 2026",
                      "To increase the supply of housing in America"]) {
    eq(HTML.split(fact).length - 1, 1, `${JSON.stringify(fact)} is printed more than once on the face`);
  }
  // The lines the header used to carry beside identity, and the fold's copy of
  // the official title, are gone — that duplication was the complaint.
  hasNot(HEAD, 'class="bd-meta"', "the header still prints its own chamber-and-sitting line");
  hasNot(HTML, 'class="bd-src bd-src-top"', "the header still prints its own link to the record");
  hasNot(HTML, 'class="bd-fold-official"', "the fold still prints its own copy of the official title");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · one topic surface — one chip strip, one ledger, one row per key");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(count(HTML, /class="bd-lh-chips"/g), 1, "there is more than one chip strip on the face");
  eq(count(HTML, /class="bd-lh-chip"/g), N, "the chip strip does not carry one chip per mapped key");
  eq(count(HTML, /class="bd-omni-list"/g), 1, "there is more than one topic ledger on the face");
  eq(count(HTML, /class="bd-omni-row/g), N, "the ledger does not carry one row per mapped key");
  // The second surface is gone from the page, the source and the stylesheet.
  hasNot(HTML, "bd-onebag", "the second topic block is back on the face");
  hasNot(HTML, "The same 4 topics, one instrument", "the duplicate count line is back");
  const SRC = R("bill-detail.js");
  hasNot(SRC, "coTravelSection", "the deleted co-travel section is still in the source");
  hasNot(SRC, "bd-onebag", "the deleted section's markup or styles are still shipping");
  hasNot(SRC, "LANE_DOCTRINE", "the ledger's lane disclaimer paragraph is still in the source");
  // The ledger opens with its rows: no lead paragraph restating the letterhead,
  // no direction tally restating what each row already says.
  const LEDGER = HTML.slice(HTML.indexOf("Every topic this act touches"));
  hasNot(LEDGER, 'class="bd-lead"', "the ledger restates the letterhead in a lead paragraph");
  hasNot(LEDGER, 'class="bd-omni-summary"', "the ledger has a direction tally above its rows");
  // What each row DOES keep: the label, the lane word, the direction, and a
  // sentence about what the act did there.
  eq(count(LEDGER, /class="bd-omni-lane-l"/g), N, "some ledger row lost its subject/rode-inside label");
  eq(count(LEDGER, /A Yea (?:advances|cuts against) this/g), N,
    "some ledger row lost its Yea-advances / Yea-cuts direction");
  const subj = ISSUES.filter((i) => i.isPrimary).length;
  eq(count(LEDGER, /This bill’s subject/g), subj, "the subject rows are not all labelled");
  eq(count(LEDGER, /Rode inside this bill/g), N - subj, "the rode-inside rows are not all labelled");
  ok(count(LEDGER, /class="bd-omni-why"/g) >= 3,
    "the scrubber has eaten the scope sentences instead of the notes inside them");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · reader copy only — no weight, no flag, no raw key, no label");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The phrasings the brief named, verbatim.
  for (const w of ["Weighted 80", "Weighted 60", "housing_build 100 holds the primary",
                   "Primary:", "Secondary:", "ranked below", "not the flag",
                   "the weight is what ranks", "recorded neutrally", "Re-keyed",
                   "taxonomy split", "w40", "w100"]) {
    hasNot(TEXT, w, `the bill face is printing curator copy: ${JSON.stringify(w)}`);
  }
  // And the shapes, so a phrasing nobody has written yet is caught too.
  for (const [label, re] of [
    ["a weighting word", /\bweight(?:s|ed|ing)?\b/i],
    ["a shorthand weight", /\bw\d{2,3}\b/],
    ["a ranking verb", /\boutranks?\b|\branked (?:below|above|beside)\b/i],
    ["a raw issue key", /\b[a-z]{3,}_[a-z][a-z_]*\b/],
    ["a label prefix", /(?:^|[.!?]\s)(?:Primary|Secondary|Note|Internal)\s*:/],
  ]) {
    const m = TEXT.match(re);
    ok(!m, `${label} is on the bill face: ${JSON.stringify(m && TEXT.slice(Math.max(0, m.index - 60), m.index + 80))}`);
  }
  // THE ATTRIBUTION LINE IS THE ONE PLACE "mapped" BELONGS. "4 topics mapped ·
  // 2 this bill's subject · 2 rode inside" is not homework, it is the disclosure
  // that PolitiDex assigned these topics and Congress did not — a reader who
  // cannot tell those apart cannot argue with either. So the filing vocabulary is
  // banned everywhere a row explains itself, and permitted only in the tally that
  // says who did the filing.
  {
    const LEDGER_TEXT = TEXT.slice(TEXT.indexOf("Every topic this act touches"));
    for (const [label, re] of [
      ["the filing system", /\bmapp(?:ed|ing|ings)\b|\bunmapped\b|\bre-keyed\b|\btaxonomy\b/i],
      ["the archive talking about itself", /\b(?:this|the) (?:row|key|axis|facet|corpus)\b/i],
      ["a migration filename", /\.sql\b|\bmigration \d{6}/i],
    ]) {
      const m = LEDGER_TEXT.match(re);
      ok(!m, `${label} is in a ledger row: ${JSON.stringify(m && LEDGER_TEXT.slice(Math.max(0, m.index - 60), m.index + 80))}`);
    }
    eq(count(TEXT, /topics mapped/g), 1, "the topic count is attributed more than once on the face");
  }

  // The leak was real, and the sentence in front of it survived: the reader still
  // gets the curators' own words about what the act did, minus the note.
  has(TEXT, "housing affordability is its own subject rather than a title inside a vehicle",
    "the housing row's scope sentence was thrown away along with the note attached to it");
  has(TEXT, "Eleven of the Act's twelve titles are housing titles",
    "the housing row lost the sentence that says how much of the act is housing");
  has(TEXT, "a yea is a vote to build more housing",
    "the housing_build row lost its scope sentence");
  has(TEXT, "shortens federal review", "the permitting rider lost its scope sentence");
  // Nothing was rewritten to get there. Every sentence a reader sees is a sentence
  // a curator wrote, so the face can never say something the record does not.
  const why = [...HTML.matchAll(/class="bd-omni-why">([^<]*)</g)].map((x) => x[1]);
  ok(why.length >= 3, "the scope sentences could not be read back off the face");
  const corpus = ISSUES.map((i) => i.rationale).join(" ")
    .replace(/\s+/g, " ");
  for (const sen of why) {
    const plain = sen.replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
    for (const part of plain.split(/(?<=[.!?])\s+(?=[A-Z`])/)) {
      const p = part.trim();
      if (p.length < 25) continue;
      ok(corpus.includes(p) || corpus.includes(p.charAt(0).toLowerCase() + p.slice(1)),
        `a sentence on the face is not a sentence any curator wrote: ${JSON.stringify(p.slice(0, 70))}`);
    }
  }
  // The letterhead's own gap copy counts what a reader can read, not what the
  // field happens to hold: a row scrubbed to nothing is an unexplained row.
  const LH = HTML.slice(HTML.indexOf('class="bd-sec bd-lh"'), HTML.indexOf("</section>", HTML.indexOf('class="bd-sec bd-lh"')));
  const emptied = ISSUES.filter((i) => !B.win._pdxReaderRationale(i.rationale)).length;
  const declared = /(\d+) of these topics|No mapping rationale is on file/.test(LH);
  eq(declared, emptied > 0, "the letterhead's unexplained-topic count disagrees with what the rows print");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the rolls stay shut, with every name still inside");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(HTML, '<details class="bd-rolldrop">', "the roll list is not a native disclosure element");
  ok(!/<details class="bd-rolldrop"[^>]*\sopen/.test(HTML), "the roll drawer ships open");
  ok(!/<details[^>]*\sopen/.test(HTML), "something on this face ships as an open disclosure");
  has(HTML, "See who voted", "the closed drawer does not say what opening it gives you");
  has(HTML, "200 names on this roll call", "the drawer does not say how many names are inside");
  // Closed is not truncated: all 200 rows are in the DOM, and all of them are
  // inside the drawer rather than above it.
  const drawerAt = HTML.indexOf('<details class="bd-rolldrop">');
  eq(count(HTML, /class="bd-vote-name"/g), NAMES.length, "the roll list was truncated rather than folded");
  eq(count(HTML, /class="bd-vote-row"/g), NAMES.length, "some member of this roll call has no row in the markup");
  ok(HTML.indexOf('class="bd-vote-name"') > drawerAt,
    "the names are printed above the drawer that is meant to hold them");
  // Closed is not summarised either: the yeas, the nays and the abstentions are
  // all in there, so nothing about this roll is inferred from what is on screen.
  eq(count(HTML, /class="bd-pos bd-pos-yea"/g), NAMES.filter((v) => v.position === "yea").length,
    "the drawer does not hold every yea");
  eq(count(HTML, /class="bd-pos bd-pos-nay"/g), NAMES.filter((v) => v.position === "nay").length,
    "the drawer does not hold every nay");
  // Nothing opens it on first paint: the only caller is the reader's own jump.
  const SRC = R("bill-detail.js");
  const opens = [...SRC.matchAll(/openRollDrop\(/g)].length;
  ok(opens >= 2, "openRollDrop is no longer both defined and called — the probe has gone stale");
  const callers = SRC.split("openRollDrop(").slice(1).map((chunk, i) => i);
  ok(callers.length >= 1, "openRollDrop has no callers at all");
  ok(!/bodyHtml[\s\S]{0,4000}openRollDrop\(/.test(SRC.slice(SRC.indexOf("function bodyHtml"), SRC.indexOf("function ensureOverlay"))),
    "the body builder opens the roll drawer while assembling the page");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · twin boot — no scrubber is a quieter page, never a leaking one");
// ═════════════════════════════════════════════════════════════════════════════
{
  const COLD = await render(boot(false), DATA);
  ok(COLD.length > 3000, "the act face did not render without receipt-cards.js");
  const coldText = COLD.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  for (const w of ["Weighted 80", "Primary:", "ranked below", "housing_build 100 holds the primary"]) {
    hasNot(coldText, w, `with the scrubber absent the raw note is printed: ${JSON.stringify(w)}`);
  }
  // It degrades in one direction only: the scope sentences go, and every other
  // thing on the page is byte-identical.
  eq(count(COLD, /class="bd-omni-why"/g), 0, "the no-scrubber boot printed a scope sentence from somewhere");
  eq(count(COLD, /class="bd-omni-row/g), N, "the no-scrubber boot dropped a ledger row");
  eq(count(COLD, /A Yea (?:advances|cuts against) this/g), count(HTML, /A Yea (?:advances|cuts against) this/g),
    "the no-scrubber boot changed which way a Yea cuts on some row");
  const strip = (h) => h.replace(/<div class="bd-omni-why">[^<]*<\/div>/g, "")
    .replace(/<p class="bd-lh-gap">[^<]*<\/p>/g, "");
  eq(strip(COLD), strip(HTML), "the two boots differ somewhere other than the scope sentences");
  // And it says so: with nothing publishable on any row, the letterhead declares
  // every topic unexplained rather than leaving the silence unexplained.
  has(COLD, "The vote still counts in full.",
    "the no-scrubber boot drops the sentences and does not say the vote still counts");

  // THE SCORE DID NOT MOVE. Direction Match is computed by the record card from
  // the curated corpus, and this pass is display copy on a different surface, so
  // it must not be able to reach the figure. Measured the way the other twin-boot
  // probes measure it — the formal pattern rows plus the Direction Match object,
  // fingerprinted per member — with the reader-copy sweep loaded and without it.
  const dm = (withScrubber) => {
    const win = makeSandbox();
    const ctx = vm.createContext(win);
    win.PROFILES = win.CMP_DATA;
    const files = [...ENGINE_FILES, "voting-record.js", "record-card.js"];
    if (withScrubber) files.push("receipt-cards.js", "bill-detail.js");
    for (const f of files) vm.runInContext(R(f), ctx, { filename: f });
    win.PROFILES = win.CMP_DATA;
    const rc = win.PDXRecordCard;
    const cs = win.PDXConsistency;
    if (!rc || typeof rc.read !== "function") die("PDXRecordCard.read is unavailable");
    if (!cs || !cs.formalPatternIndex) die("PDXConsistency.formalPatternIndex is unavailable");
    const pids = Object.keys(win.CMP_DATA || {}).slice(0, 40);
    if (pids.length < 10) die(`the profile corpus came back with ${pids.length} members`);
    return pids.map((pid) => {
      let m = null;
      try { m = rc.read(pid); } catch (e) { return `${pid}=err:${e.message}`; }
      const d = (m && m.directionMatch) || null;
      const rows = (cs.formalPatternIndex.rows(pid) || [])
        .map((r) => [r.key, r.tier || "", r.total || 0, r.judged || 0].join("|")).sort().join(";");
      return `${pid}=${JSON.stringify(d)}|${m && m.tier}|${rows}`;
    }).join("\n");
  };
  const hot = dm(true);
  const cold = dm(false);
  ok(hot.length > 200, "the Direction Match fingerprint came back empty");
  eq(hot, cold, "loading the reader-copy scrubber moves a Direction Match figure");
}

// ── report ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.log(`✗ bill noise pass: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`✓ bill noise pass: all ${passed} assertions passed`);
console.log(`  ${N} topics · one chip strip · one ledger · ${ROLLS.length} strips above the fold · ${NAMES.length} names behind one tap\n`);
