#!/usr/bin/env node
/**
 * test-bill-letterhead.mjs — a bill profile opens like a person file
 * ─────────────────────────────────────────────────────────────────────────────
 * A person file starts with a census: who this is, in which chamber, and the
 * doors out. A bill deserves the same courtesy, because a citizen who arrives
 * at H.R. 6644 from a person-file row arrives knowing nothing — not the number,
 * not the session, not what the act touched, not whether anyone voted on it.
 * The letterhead is that census, and it has four jobs:
 *
 *   1. IDENTITY, WITH THE TITLE ROW. Number, official title where one was
 *      recorded, chamber and sitting, the dates we hold, and a link to the
 *      document the mapping was read from. Those five facts answer "which act is
 *      this", a reader asks it before anything else, and they are printed once —
 *      in the header, under the title — rather than spread over a line here, a
 *      link there and a table under the vote strips. A sitting is not "119th
 *      Congress" for a Utah bill; it is the 2024 General Session, read out of the
 *      same externalIds key the ingest wrote.
 *   2. THE TEACHING LINE. One recorded vote counts on every mapped topic. That
 *      is the whole doctrine of this archive in one sentence, and it sits above
 *      the topic list rather than in a footnote under it.
 *   3. THE TOPIC TALLY AND ITS CHIPS. N mapped, X the bill's own subject, Y rode
 *      inside — and every one of the N is a chip you can tap, paired with the
 *      shipped ⓘ scope control. A chip that cannot be tapped is a dead label,
 *      and a dead label is how a rider quietly stops counting. Subject and
 *      rode-inside are drawn the same way because the label is provenance, not
 *      weight.
 *   4. THE VOTE STRIP. Yea / Nay / Present / Did not vote, tapping through to
 *      the roll list. No party column, no party breakdown, and no percentage
 *      anywhere on this face.
 *
 * Where a fact is missing the letterhead says which fact is missing. The three
 * fixtures below are a federal multi-key act, a Utah multi-key act in a named
 * session, and a measure with nothing on file — the last one existing purely to
 * prove the honest empties are real sentences and not blank space.
 *
 *   node scripts/test-bill-letterhead.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} — missing ${JSON.stringify(needle)}`);
const hasNot = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg} — found ${JSON.stringify(needle)}`);
const section = (t) => console.log(`\n  · ${t}`);
const count = (hay, re) => (String(hay).match(re) || []).length;

// ── the fixtures ─────────────────────────────────────────────────────────────
// H.R. 6644 is the acceptance case for the federal side: a housing bill whose
// mappings include both housing keys as its own subject plus two riders. The
// pair matters — housing and housing_build are different issue faces, and a
// reader who taps either has to land on the right one.
const HR6644 = {
  measure: {
    id: 6644, number: "H.R. 6644", congress: 119, chamber: "house", status: "passed_house",
    title: "Housing Supply and Permitting Act",
    introducedAt: "2025-12-04",
    // The ingested description, at the length the real ones run to — a section-
    // by-section wall, which is the reason this pass exists: printed above the
    // letterhead it pushed the chips and the vote strip off a phone screen
    // entirely, and it is long enough that no identity row could hold it.
    //   THE SHORT CASE IS NOT THIS CASE. A description that reads as a list of
    // levers — the seeded summaries on 90 FR 8245 and EO 14162 run to a
    // paragraph — now renders in the identity block above the chips instead of
    // folding, and scripts/test-instrument-summaries.mjs owns that half. This
    // fixture holds the half that still folds, so both surfaces stay tested and
    // neither one ever prints the other one’s text.
    summary:
      "Title I establishes a Federal housing supply block grant and conditions a portion of surface " +
      "transportation formula funds on the adoption of by-right approval near fixed-guideway transit. " +
      "Title II shortens the environmental review window for qualifying residential projects and sets " +
      "deadlines for agency action on permit applications. Title III expands the low-income housing tax " +
      "credit allocation and makes the small-state minimum permanent. Title IV directs the Comptroller " +
      "General to report on local approval timelines. Title V bars a Federal Reserve central bank digital " +
      "currency issued directly to individuals. " +
      "Title VI reauthorizes the rural housing preservation program through fiscal year 2031 and sets " +
      "aside a portion of its funds for manufactured housing. Title VII requires the Secretary of " +
      "Housing and Urban Development to publish a model by-right zoning code within one year and to " +
      "report annually on the jurisdictions that adopt it. Title VIII amends the Interstate Land Sales " +
      "Full Disclosure Act to exempt certain small subdivisions from registration. Title IX establishes " +
      "a revolving loan fund for the water and sewer connections serving new residential construction, " +
      "and authorizes appropriations for it through fiscal year 2030. Title X contains technical and " +
      "conforming amendments, sets the effective date of each title, and provides that no provision " +
      "takes effect until the Comptroller General certifies the baseline data required under Title IV.",
    externalIds: {
      congressGovUrl: "https://www.congress.gov/bill/119th-congress/house-bill/6644",
      mappingReadFrom: "engrossed",
      mappingTextUrl: "https://www.congress.gov/bill/119th-congress/house-bill/6644/text/eh",
      officialTitle: "To increase the supply of housing and to reform Federal permitting.",
    },
    source: { url: "https://www.congress.gov/bill/119th-congress/house-bill/6644", label: "Congress.gov" },
  },
  issues: [
    { issueKey: "housing_build", supportMeaning: "yea_supports", isPrimary: true, rationale: "Preempts local density caps near transit." },
    { issueKey: "housing", supportMeaning: "yea_supports", isPrimary: true, rationale: "Expands the low-income housing tax credit." },
    { issueKey: "permitting_reform", supportMeaning: "yea_supports", isPrimary: false, rationale: "Shortens NEPA review windows for housing." },
    { issueKey: "crypto_cbdc", supportMeaning: "yea_opposes", isPrimary: false, rationale: "" },
  ],
  rollcalls: [{
    id: 7701, chamber: "house", question: "On Passage", result: "passed", voteDate: "2026-02-11",
    totals: { yea: 231, nay: 197, present: 1, notVoting: 6 },
    votes: [],
    source: { url: "https://clerk.house.gov/Votes/2026031", label: "Clerk of the House" },
  }],
  positions: [], provisions: [], actions: [],
};

// Utah H.B. 257: congress is NULL and the sitting lives in externalIds. Anything
// that reads m.congress to name the session prints nothing here, which is how
// the state half of the archive used to lose its own identity line.
const HB257 = {
  measure: {
    id: 4257, number: "H.B. 257", congress: null, chamber: "utah house", status: "enacted",
    title: "Sex-based Designations for Privacy, Anti-bullying, and Women's Opportunities",
    introducedAt: "2024-01-16",
    externalIds: {
      utahSession: "2024GS",
      billStatusUrl: "https://le.utah.gov/~2024/bills/static/HB0257.html",
      mappingReadFrom: "enrolled",
      mappingTextUrl: "https://le.utah.gov/~2024/bills/hbillenr/HB0257.pdf",
    },
    source: { url: "https://le.utah.gov/~2024/bills/static/HB0257.html", label: "Utah Legislature" },
  },
  issues: [
    { issueKey: "lgbtq_rights", supportMeaning: "yea_opposes", isPrimary: true, rationale: "Restricts facility access by birth sex." },
    { issueKey: "education", supportMeaning: "yea_opposes", isPrimary: false, rationale: "Adds compliance duties for school districts." },
  ],
  rollcalls: [{
    id: 8802, chamber: "utah house", question: "3rd Reading", result: "passed", voteDate: "2024-01-19",
    totals: { yea: 57, nay: 14, present: 0, notVoting: 4 },
    votes: [],
    source: { url: "https://le.utah.gov/~2024/bills/static/HB0257.html", label: "Utah Legislature" },
  }],
  positions: [], provisions: [], actions: [],
};

// The bare measure: no mapping, no vote, no text link, no dates. Every gap the
// letterhead can hit, all at once.
const BARE = {
  measure: { id: 99, number: "S. 4021", congress: 119, chamber: "senate", status: "introduced", title: "A bill" },
  issues: [], rollcalls: [], positions: [], provisions: [], actions: [],
};

// ── boot the shipped panel ───────────────────────────────────────────────────
// issue-scope.js rides along because the ⓘ control on each chip is ITS markup,
// not the panel's — if the two ever stop agreeing, the chips lose their scope
// affordance and this suite is where that shows up.
function boot() {
  const win = makeSandbox();
  const capture = { innerHTML: "", scrollTop: 0 };
  const hosts = { "pdx-bd-scroll": capture };
  win.document.getElementById = (id) => hosts[id] || null;
  win.history = { replaceState() {}, pushState() {} };
  const ctx = vm.createContext(win);
  for (const f of [...ENGINE_FILES, "issue-colors.js", "issue-scope.js", "receipt-cards.js", "bill-detail.js"]) {
    vm.runInContext(readFileSync(join(ROOT, f), "utf8"), ctx, { filename: f });
  }
  if (!win.PDXBillDetail || typeof win.PDXBillDetail.open !== "function") {
    throw new Error("PDXBillDetail.open() unavailable after loading bill-detail.js");
  }
  if (!win.PDXIssueScope || typeof win.PDXIssueScope.controlHtml !== "function") {
    throw new Error("PDXIssueScope.controlHtml() unavailable — the chip's ⓘ cannot be checked");
  }
  return { win, capture };
}

async function render(win, capture, data) {
  capture.innerHTML = "";
  win.PDXBills = {
    get: () => Promise.resolve(data),
    list: () => Promise.resolve({ items: [] }),
    listSync: () => ({ items: [] }),
    isFollowed: () => false,
  };
  win.PDXBillDetail.open(data.measure.id);
  for (let i = 0; i < 12; i++) await Promise.resolve();
  return capture.innerHTML;
}

// The letterhead only, sliced off the rest of the panel: several claims below
// ("no percentage", "no party word") are about THIS block and would be trivially
// satisfiable by a page that keeps the offending text one section lower.
function letterhead(html) {
  const i = html.indexOf('class="bd-sec bd-lh"');
  if (i < 0) return "";
  const j = html.indexOf("</section>", i);
  return j < 0 ? html.slice(i) : html.slice(i, j + 10);
}

// The header: everything from the number chip down to the end of the buttons,
// which is where identity now lives. Sliced for the same reason the letterhead
// is — "the official title is with the title row" is a claim about POSITION, and
// a page that keeps it two sections lower must not be able to satisfy it.
function head(html) {
  const i = html.indexOf('<div class="bd-head">');
  if (i < 0) return "";
  const j = html.indexOf('class="bd-sec bd-lh"', i);
  return j < 0 ? html.slice(i) : html.slice(i, j);
}

const { win, capture } = boot();
const FED = await render(win, capture, HR6644);
const UT = await render(win, capture, HB257);
const EMPTY = await render(win, capture, BARE);

console.log("\n📜 bill letterhead — a bill profile opens like a person file");
for (const [name, html] of [["H.R. 6644", FED], ["H.B. 257", UT], ["S. 4021", EMPTY]]) {
  if (!html || html.length < 800) {
    console.error(`✗ bill letterhead: ${name} rendered ${html.length} characters — nothing below can be trusted`);
    process.exit(1);
  }
  ok(letterhead(html).length > 200, `${name}: the panel rendered without a letterhead block at all`);
}
const FED_LH = letterhead(FED);
const UT_LH = letterhead(UT);
const EMPTY_LH = letterhead(EMPTY);
const FED_HEAD = head(FED);
const UT_HEAD = head(UT);
const EMPTY_HEAD = head(EMPTY);
for (const [name, block] of [["H.R. 6644", FED_HEAD], ["H.B. 257", UT_HEAD], ["S. 4021", EMPTY_HEAD]]) {
  ok(block.length > 100, `${name}: the panel rendered without a header block at all`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · identity — the census a reader arrives with nothing knowing");
// ═════════════════════════════════════════════════════════════════════════════
// WHICH ACT IS THIS, ANSWERED WITH THE TITLE. All five facts — number, official
// title, chamber and sitting, the dates we hold, and the document the mapping was
// read from — are printed together in the header, above the census. They used to
// be spread over four positions: a chamber line under the title, a text link
// under the buttons, a table under the vote strips, and the official title inside
// a fold. Assembling an identity out of four places is work, and the page said
// "House · 119th Congress" twice while the reader did it.
{
  has(FED_HEAD, "H.R. 6644", "the federal header does not print the bill number");
  has(FED_HEAD, "To increase the supply of housing",
    "the official title is not printed with the title row");
  // The prose fold is for the section-by-section description and nothing else: an
  // identity fact behind a disclosure is an identity fact a reader has to hunt for.
  const FOLD = FED.slice(FED.indexOf('class="bd-sec bd-foldsec"'));
  hasNot(FOLD, "To increase the supply of housing",
    "the official title is printed twice — once as identity and once inside the fold");
  has(FED_HEAD, "House", "the chamber is missing from the federal header");
  has(FED_HEAD, "119th Congress", "the federal sitting is not named");
  has(FED_HEAD, "Introduced Dec 4, 2025", "the introduction date we hold is not printed");
  // ONE DATE PER CHAMBER, NOT ONE DATE PER BILL. This read "Voted Feb 11, 2026"
  // when it was written, and on a one-roll fixture that was fine. It is not fine as
  // doctrine: a measure that passed both chambers has two floor dates, and printing
  // the latest of them unlabelled tells a reader neither which chamber it belongs to
  // nor that the other chamber voted at all. The identity line names the chamber and
  // drops the year, because the introduction date beside it has already fixed the
  // year and this line's job is to be short.
  has(FED_HEAD, "House Feb 11", "the recorded vote is not dated by the chamber that cast it");
  hasNot(FED_HEAD, "Voted Feb 11", "the identity line still prints an unattributed vote date");
  // The mapping text beats the bill page: the mapping was made against THAT
  // document, so that is the one a reader checking our work needs.
  has(FED_HEAD, "https://www.congress.gov/bill/119th-congress/house-bill/6644/text/eh",
    "the header does not link the document the mapping was read from");
  has(FED_HEAD, "Engrossed text", "the text link does not name which document it is");
  // SAID ONCE. Each of these is printed in exactly one place on the whole face.
  for (const fact of ["119th Congress", "Engrossed text", "Introduced Dec 4, 2025",
                      "To increase the supply of housing"]) {
    eq(count(FED, new RegExp(fact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")), 1,
      `${JSON.stringify(fact)} is printed more than once on the bill face`);
  }
  // And the letterhead is the census only — the paperwork went up, not down.
  hasNot(FED_LH, "Engrossed text", "the identity table is back under the vote strips");
  hasNot(FED_LH, 'class="bd-ident"', "the identity block is being rendered inside the letterhead");

  // Utah: the sitting comes out of externalIds, not out of a null congress.
  has(UT_HEAD, "H.B. 257", "the Utah header does not print the bill number");
  has(UT_HEAD, "Utah House · 2024 General Session",
    "the Utah header does not name the chamber and the named session together");
  hasNot(UT_HEAD, "th Congress", "a Utah bill is being filed under a Congress it was never in");
  hasNot(UT_HEAD, "nullth", "a null congress is leaking into the Utah identity line");
  has(UT_HEAD, "Enrolled text", "the enrolled text Utah mappings are read from is not named");
  has(UT_HEAD, "le.utah.gov", "the Utah text link does not point at the Utah Legislature");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the teaching line, and the honest empty where there is no vote");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(FED_LH, "One recorded vote. It counts on every topic below.",
    "the one-vote-counts-everywhere teaching line is not on the federal face");
  has(UT_LH, "One recorded vote. It counts on every topic below.",
    "the teaching line is not on the Utah face");
  // No vote on file is a fact, not an absence to paper over — and it must not
  // claim a vote counted on anything.
  hasNot(EMPTY_LH, "One recorded vote", "a measure with no roll call is claiming a recorded vote");
  has(EMPTY_LH, "No recorded vote on file",
    "a measure with no roll call does not say so above its topic list");
  // ZERO ROLLS MEANS ZERO CHIPS, AND ONE SENTENCE. The letterhead used to carry an
  // honest empty of its own here — "No recorded vote is on file for this measure yet
  // — it may have died in committee, or the tally may not have reached us." The
  // sentence was true and it was the third statement of the same absence on one
  // face: the teaching line above says "No recorded vote on file", and the roll-call
  // section below says it in the place a reader goes looking for votes. Two of those
  // are one too many, so the rail is now simply absent when there is nothing to put
  // on it, and the roll-call section keeps the sentence.
  hasNot(EMPTY_LH, "No recorded vote is on file for this measure yet",
    "the letterhead is restating an absence the teaching line and the roll-call section both already state");
  hasNot(EMPTY_LH, 'class="bd-lh-votes"',
    "a measure with no roll calls is still painting an empty vote-chip rail");
  has(EMPTY, "No recorded roll-call votes for this measure yet",
    "the roll-call section does not state the absence the letterhead stopped stating");
  has(EMPTY_LH, "No topics are mapped to this measure yet",
    "an unmapped measure does not say that a vote on it counts on nothing");
  has(EMPTY_HEAD, "No link to the official text is on file",
    "a measure with no text link pretends to have one, or says nothing");
  has(EMPTY_HEAD, "No date is on file", "a measure with no dates says nothing about the gap");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the tally is arithmetic, and every mapped key is a live chip");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const [name, lh, data] of [["H.R. 6644", FED_LH, HR6644], ["H.B. 257", UT_LH, HB257]]) {
    const n = data.issues.length;
    const subj = data.issues.filter((i) => i.isPrimary).length;
    has(lh, `${n} topics mapped · ${subj} this bill’s subject · ${n - subj} rode inside`,
      `${name}: the tally does not add up to the mappings the API handed over`);
    eq(count(lh, /class="bd-lh-chip"/g), n, `${name}: one chip per mapped key`);
    // Every chip is a door, and every door is paired with a scope control that
    // is its SIBLING — a delegated closest() would swallow one inside the other.
    eq(count(lh, /class="bd-lh-chip" data-issue="/g), n,
      `${name}: some chips are labels rather than doors into the issue face`);
    // The ⓘ ships for the keys the scope engine holds a definition for, and only
    // those — inventing a scope card for a key with no text would be worse than
    // omitting the control. So the count is measured against the engine's own
    // coverage, and the SIBLING relationship is checked on every one it does ship.
    const scoped = data.issues.filter((i) => !!win.PDXIssueScope.read(i.issueKey));
    ok(scoped.length > 0, `${name}: fixture drift — no mapped key has a scope definition to check`);
    eq(count(lh, /data-pdxis-key=/g), scoped.length,
      `${name}: the chips do not carry one ⓘ per key the scope engine can define`);
    eq(count(lh, /<\/button>\s*<button type="button" class="pdxis-key"/g), scoped.length,
      `${name}: the ⓘ is not a sibling of the chip it belongs to`);
    for (const m of data.issues) {
      has(lh, `data-issue="${m.issueKey}"`, `${name}: ${m.issueKey} is mapped but has no chip`);
      if (win.PDXIssueScope.read(m.issueKey)) {
        has(lh, `data-pdxis-key="${m.issueKey}"`, `${name}: ${m.issueKey}'s chip has no scope control`);
      }
    }
    // The lane words appear, and appear the same number of times as the lane
    // they describe — neither is drawn as the bigger number.
    eq(count(lh, /this bill’s subject<\/span>/g), subj, `${name}: subject chips are not all labelled`);
    eq(count(lh, /rode inside<\/span>/g), n - subj, `${name}: rode-inside chips are not all labelled`);
    eq(count(lh, /class="bd-lh-chip-lane"/g), n, `${name}: some chip omits its lane label entirely`);
  }
  // The acceptance pair, named because it is the case that used to fail: two
  // adjacent housing keys, both present, both tappable, resolved to different
  // issue faces.
  has(FED_LH, 'data-issue="housing"', "housing has no chip on H.R. 6644");
  has(FED_LH, 'data-issue="housing_build"', "housing_build has no chip on H.R. 6644");
  ok(/data-issue="housing"[^>]*>/.test(FED_LH) && /data-issue="housing_build"[^>]*>/.test(FED_LH),
    "one of the two housing keys is a dead label rather than a door");
  // Real labels, not key names run through a prettifier.
  hasNot(FED_LH, "Housing Build", "a chip is printing the raw key instead of the shipped issue label");
  hasNot(UT_LH, "Lgbtq Rights", "a chip is printing a mangled key instead of the shipped issue label");
  // A missing rationale is named as missing, and does not discount the vote.
  has(FED_LH, "carries no mapping rationale yet",
    "the one key with no rationale is not declared — or is declared with the wrong verb");
  has(FED_LH, "The vote still counts in full.",
    "a missing rationale is being allowed to read as a lesser vote");
  hasNot(UT_LH, "mapping rationale yet", "a fully-reasoned bill is claiming a missing rationale");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the vote chip is one line, and it lands on its own roll call");
// ═════════════════════════════════════════════════════════════════════════════
// THE CHIP REPLACED A CARD THAT DUPLICATED A SECTION. H.R. 6644 painted a fat
// card per roll call under the topic chips — motion title, chamber, date, result,
// four tally pills, "See who voted →" — and then painted the same roll calls
// again, in full, in the roll-call section below. Every fact on the card was a
// fact the section already carried, so a third of the opening screen restated
// what one scroll would reach, and two copies of one roll call left a reader to
// work out which was authoritative.
//   So the letterhead keeps one line per roll: chamber, day, outcome, margin,
// and how many members were not on the roll. The four-slot Yea / Nay / Present /
// Did not vote strip this suite used to require is deliberately gone; the
// assertions below check the section still prints all four, which is where the
// full tally always belonged.
{
  for (const [name, lh, data, html] of [["H.R. 6644", FED_LH, HR6644, FED], ["H.B. 257", UT_LH, HB257, UT]]) {
    const t = data.rollcalls[0].totals;
    const rc = data.rollcalls[0];
    eq(count(lh, /class="bd-lh-vchip"/g), data.rollcalls.length, `${name}: one vote chip per roll call`);
    // ONE LINE, AND THIS IS THE LINE. Read back as text, with the tags removed, so
    // the assertion is on what a reader sees rather than on the span soup.
    const chipText = lh.slice(lh.indexOf('class="bd-lh-votes"'))
      .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    has(chipText, `${t.yea}\u2013${t.nay}`, `${name}: the chip does not print the margin`);
    hasNot(chipText, "%", `${name}: a percentage has appeared on the vote chip`);
    if (t.notVoting) has(chipText, `${t.notVoting} DNV`, `${name}: the members not on the roll are not counted on the chip`);
    if (!t.present) hasNot(chipText, "present", `${name}: the chip prints a Present count of nobody`);
    // A zero is not a fact about anybody, and neither Yea nor Nay is labelled: the
    // margin is read as a margin, in the order every roll call in the record uses.
    hasNot(chipText, "Yea", `${name}: the chip is re-labelling the tally it summarises`);
    hasNot(chipText, "Did not vote", `${name}: the chip is printing the section's own tally labels`);

    // WHAT THE CHIP DOES NOT SAY, AND WHERE IT WENT. The motion title, the clerk's
    // link and the names are the roll-call section's, printed once, down there.
    hasNot(lh, rc.question, `${name}: the motion title is still on the letterhead as well as in the roll-call section`);
    has(html, rc.question, `${name}: the motion title has been dropped from the roll-call section too`);
    hasNot(lh, rc.source.url, `${name}: the official roll-call link is still duplicated onto the letterhead`);
    has(html, rc.source.url, `${name}: the official roll-call link is not in the roll-call section`);
    hasNot(lh, "See who voted", `${name}: the letterhead still promises the names it no longer opens`);
    // The section keeps the full four-slot tally the chip stopped carrying.
    for (const [k, lb] of [["yea", "Yea"], ["nay", "Nay"], ["present", "Present"], ["notVoting", "Not voting"]]) {
      if (t[k] == null) continue;
      has(html, `${lb} ${t[k]}`, `${name}: the roll-call section has lost the ${lb} count`);
    }

    // The chip is a door to its OWN roll call, and the roll list has the anchor it
    // aims at. Two halves of one jump; each is useless alone.
    has(lh, 'data-bd-goto="rolls"', `${name}: the vote chip does not tap through anywhere`);
    if (rc.id != null) {
      has(lh, `data-bd-roll="${rc.id}"`, `${name}: the chip does not name the roll call it lands on`);
      has(html, `data-bd-rc="${rc.id}"`, `${name}: nothing in the roll list answers to the chip's roll-call id`);
    }
    has(html, 'data-bd-anchor="rolls"', `${name}: nothing on the page answers to the chip's jump`);
    ok(html.indexOf('data-bd-anchor="rolls"') > html.indexOf('data-bd-goto="rolls"'),
      `${name}: the roll list the chip jumps to is above the chip, which makes the jump a no-op`);
  }
  has(EMPTY, 'data-bd-anchor="rolls"',
    "the roll-call section loses its anchor when there are no roll calls, so the jump target vanishes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · doctrine — no percentage, no party, no rank on this face");
// ═════════════════════════════════════════════════════════════════════════════
{
  const BANNED = [
    "Primary issue", "Secondary", "secondary", "Supporting only", "supporting only",
    "lesser", "Lesser", "footnote", "side issue", "minor provision", "just a", "merely",
    "thin", "Thin", "Republican", "Democrat", "GOP", "party line", "R–", "D–",
  ];
  for (const [name, lh] of [["H.R. 6644", FED_LH], ["H.B. 257", UT_LH], ["S. 4021", EMPTY_LH]]) {
    for (const w of BANNED) hasNot(lh, w, `${name}: the letterhead ranks or party-frames with ${JSON.stringify(w)}`);
    ok(!/\d\s*%/.test(lh) && !lh.includes("percent"),
      `${name}: a percentage is on the bill face, where there is no denominator to divide by`);
  }
  // The lane is a label. Structurally: both lanes are the same element with the
  // same classes, so no chip can be given less to work with than another.
  eq(count(FED_LH, /class="bd-lh-chipw"/g), HR6644.issues.length,
    "the chips are not all built from the same wrapper");
  ok(!/class="bd-lh-chip[^"]*(primary|main|top)/i.test(FED_LH),
    "a chip is carrying a rank in its class name");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the census is first, and the prose is folded under it");
// ═════════════════════════════════════════════════════════════════════════════
// The letterhead existed and was correct; it was just underneath two thousand
// characters of section-by-section description, which is the same as not having
// it. This section is about ORDER — what a reader meets before they scroll.
{
  // THE COLD OPEN, IN ORDER: the number, the title, which act this is, the two
  // buttons, then the census — teaching line, tally, chips, vote strips. Five
  // things above the fold and not one of them repeated.
  const seq = [
    ["the number", 'class="bd-num"'],
    ["the title", 'class="bd-title"'],
    ["the identity block", 'class="bd-ident"'],
    ["the buttons", 'class="bd-actions"'],
    ["the teaching line", 'class="bd-lh-teach"'],
    ["the topic tally", 'class="bd-lh-tally"'],
    ["the chips", 'class="bd-lh-chips"'],
    ["the vote strips", 'class="bd-lh-votes"'],
  ];
  for (const [name, mark] of seq) has(FED, mark, `${name} is not on the bill face at all`);
  const at = seq.map(([name, mark]) => ({ name, i: FED.indexOf(mark) }));
  for (let k = 1; k < at.length; k++) {
    ok(at[k - 1].i < at[k].i,
      `${at[k].name} is printed before ${at[k - 1].name} — the cold-open order is wrong`);
  }
  // All of it before the prose fold, which is what "above the fold" means here.
  ok(at[at.length - 1].i < FED.indexOf('class="bd-sec bd-foldsec"'),
    "part of the cold open is printed after the prose fold");
  // The two lines the header used to carry alongside identity are gone from it,
  // because identity says both already.
  hasNot(FED_HEAD, 'class="bd-meta"', "the header still prints its own chamber-and-sitting line");
  hasNot(FED_HEAD, 'class="bd-src bd-src-top"', "the header still prints its own link to the record");

  // The narrative dump is out of the header and behind a closed disclosure.
  hasNot(FED.slice(0, FED.indexOf('class="bd-sec bd-lh"')), "Title I establishes",
    "the section-by-section description is still printed above the letterhead");
  has(FED, 'class="bd-fold"', "there is no fold on a bill that has prose to fold");
  ok(FED.indexOf('class="bd-fold"') > FED.indexOf('class="bd-sec bd-lh"'),
    "the fold is above the census it is supposed to sit under");
  has(FED, "Title I establishes", "the summary was dropped instead of folded");
  has(FED, "What’s in this act", "the fold does not say what is inside it");
  hasNot(FED, 'class="bd-fold-official"',
    "the fold is still building an official-title paragraph, which identity now owns");
  // Closed means closed: a native <details> with no open attribute, so the text
  // is in the DOM and none of it is painted until the reader asks.
  ok(/<details class="bd-fold">/.test(FED),
    "the fold ships open, or is not a real disclosure element");
  hasNot(FED, '<p class="bd-summary">',
    "the old always-open summary paragraph is still being rendered somewhere on the live face");
  // A bill with nothing to fold gets no fold. An empty disclosure is a promise
  // with nothing behind it.
  hasNot(EMPTY, 'class="bd-fold"', "a measure with no prose on file grew an empty fold");

  // AND A DESCRIPTION SHORT ENOUGH TO READ AS LEVERS DOES NOT FOLD AT ALL. The
  // fold's reason for existing is length: two thousand characters of Titles is a
  // footnote and belongs under the census. A paragraph that says who must do what
  // by when is the answer to the first question a reader asks, and it is printed
  // in the identity block above the chips instead — one field, one printing,
  // never both. scripts/test-instrument-summaries.mjs owns that surface in full;
  // this is the seam, asserted here so neither pass can move it without the other
  // noticing.
  const SHORT = await render(win, capture, {
    ...HR6644,
    measure: {
      ...HR6644.measure,
      summary: "Requires the Secretary of Housing and Urban Development to publish a model " +
        "by-right zoning code within one year. Directs the Comptroller General to report on " +
        "local approval timelines. Authorizes appropriations through fiscal year 2031.",
    },
  });
  hasNot(SHORT, 'class="bd-fold"', "a description short enough for the identity block was folded as well");
  has(SHORT.slice(SHORT.indexOf('<dl class="bd-ident">'), SHORT.indexOf("</dl>")),
    "Requires the Secretary of Housing and Urban Development to publish a model",
    "a description short enough for the identity block was not printed there");
  ok(SHORT.indexOf('class="bd-ident-sum"') < SHORT.indexOf('class="bd-lh-chips"'),
    "the short description is printed below the topic chips it is supposed to explain");
  eq(count(SHORT, /Directs the Comptroller General to report on local approval timelines/g), 1,
    "the short description is printed more than once on the face");

  // The roll list is behind its own door, and the door says how many names.
  has(FED, 'data-bd-anchor="rolls"', "the roll-call section lost its anchor");

  // Every chip carries the site's own colour for its key — the same four tokens
  // the tree and the compare surfaces read, from the same module.
  const tinted = count(FED_LH, /data-ic="on"/g);
  eq(tinted, HR6644.issues.length, "not every chip is carrying the site's issue colour tokens");
  for (const v of ["--pdx-ic:", "--pdx-ic-soft:", "--pdx-ic-wash:", "--pdx-ic-ink:"]) {
    has(FED_LH, v, `the chips are missing the ${v} token, so they cannot match the rest of the site`);
  }
  // The colour is the ISSUE's, not the lane's: identical keys must get identical
  // tokens wherever they appear, and the two lanes must not resolve to two
  // palettes. Checked against the shipped module rather than a copy of it.
  for (const m of HR6644.issues) {
    const want = win.PDXIssueColors.styleFor(m.issueKey);
    ok(want && FED_LH.includes(want),
      `${m.issueKey}'s chip is not tinted with the shipped token for that key`);
  }
  const subjKey = HR6644.issues.find((i) => i.isPrimary).issueKey;
  const rodeKey = HR6644.issues.find((i) => !i.isPrimary).issueKey;
  ok(win.PDXIssueColors.styleFor(subjKey) !== undefined && win.PDXIssueColors.styleFor(rodeKey) !== undefined,
    "the colour module cannot resolve one of the fixture's keys");
  // No second palette for provenance: the lane is a word on the chip, and the
  // only thing that decides a chip's colour is its key.
  const chipStyles = [...FED_LH.matchAll(/data-issue="([^"]+)"[^>]*style="([^"]*)"/g)];
  eq(chipStyles.length, HR6644.issues.length, "a chip's tint is not attached to its own key");
  for (const [, key, style] of chipStyles) {
    eq(style, win.PDXIssueColors.styleFor(key),
      `${key}'s chip was tinted by something other than the issue palette`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the guards are load-bearing (mutations must break the claims)");
// ═════════════════════════════════════════════════════════════════════════════
// Every assertion above is only worth its line count if the shipped source is
// what satisfies it. These four mutations each break one claim; if a mutation
// leaves the suite green, the claim was being met by accident.
{
  const SRC = readFileSync(join(ROOT, "bill-detail.js"), "utf8");
  // Each anchor has to be unique in the file: bill-detail.js builds chips in four
  // places, and a mutation that lands on the wrong one changes nothing here and
  // then reports the guard as load-bearing.
  const mutate = (from, to, label) => {
    const n = SRC.split(from).length - 1;
    eq(n, 1, `mutation setup: ${label} — the anchor matches ${n} places, so the mutation is not aimed at the letterhead`);
    return SRC.replace(from, to);
  };
  async function renderMutant(src, data) {
    const win2 = makeSandbox();
    const cap = { innerHTML: "", scrollTop: 0 };
    win2.document.getElementById = (id) => (id === "pdx-bd-scroll" ? cap : null);
    win2.history = { replaceState() {}, pushState() {} };
    const ctx2 = vm.createContext(win2);
    for (const f of [...ENGINE_FILES, "issue-colors.js", "issue-scope.js", "receipt-cards.js"]) {
      vm.runInContext(readFileSync(join(ROOT, f), "utf8"), ctx2, { filename: f });
    }
    vm.runInContext(src, ctx2, { filename: "bill-detail.mutant.js" });
    win2.PDXBills = { get: () => Promise.resolve(data), list: () => Promise.resolve({ items: [] }), listSync: () => ({ items: [] }), isFollowed: () => false };
    win2.PDXBillDetail.open(data.measure.id);
    for (let i = 0; i < 12; i++) await Promise.resolve();
    return cap.innerHTML;
  }

  // (a) cut the chip list the way the old jump chips were cut.
  const cut = await renderMutant(
    mutate("var chips = ordered.map(function (it) {\n      var lane = it.isPrimary",
           "var chips = ordered.slice(0, 2).map(function (it) {\n      var lane = it.isPrimary", "chip truncation"),
    HR6644);
  ok(count(letterhead(cut), /class="bd-lh-chip"/g) < HR6644.issues.length,
    "a truncated chip list still renders every chip — the per-key count is not actually measuring the chips");

  // (b) turn the chips back into dead labels.
  const dead = await renderMutant(
    mutate('<button type="button" class="bd-lh-chip" data-issue="', '<span class="bd-lh-chip" data-noissue="', "dead labels"),
    HR6644);
  ok(count(letterhead(dead), /class="bd-lh-chip" data-issue="/g) === 0,
    "the door assertion passes even when the chips are not doors");

  // (c) drop the utahSession read, so a state bill falls back to its null congress.
  const nosit = await renderMutant(
    mutate("var us = String(extIds(m).utahSession || '');", "var us = '';", "Utah sitting"),
    HB257);
  ok(!letterhead(nosit).includes("2024 General Session"),
    "the Utah session line survives the removal of the only read that produces it");

  // (d) let the tally count only the bill's own subject, the way a primary gate would.
  const gated = await renderMutant(
    mutate("var rode = ordered.length - subj;", "var rode = 0;", "rode-inside tally"),
    HR6644);
  ok(!letterhead(gated).includes("2 rode inside"),
    "the tally arithmetic reports the right number even when the source stops computing it");

  // (e) cut the colour tokens off the chips.
  const grey = await renderMutant(
    mutate("      var st = C.styleFor(key);", "      var st = '';", "chip tint"),
    HR6644);
  ok(count(letterhead(grey), /data-ic="on"/g) === 0,
    "the chips still report issue colours when the colour module's answer is thrown away");

  // (f) put the prose back in the header, where it used to bury the census.
  const dumped = await renderMutant(
    mutate("      letterheadHtml(m, issues, data) +\n      foldSection(m) +",
           "      '<p class=\"bd-summary\">' + esc(m.summary || '') + '</p>' +\n      letterheadHtml(m, issues, data) +",
           "prose fold"),
    HR6644);
  ok(!/<details class="bd-fold">/.test(dumped),
    "the fold assertion passes on a page that prints the summary open above the letterhead");
}

// ── report ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.log(`✗ bill letterhead: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`✓ bill letterhead: all ${passed} assertions passed`);
console.log(`  ${HR6644.issues.length} federal chips · ${HB257.issues.length} Utah chips · 4 vote slots · 3 fixtures · 6 mutations rejected`);
