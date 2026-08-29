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
 *   1. IDENTITY. Number, official title where one was recorded, chamber and
 *      sitting, the dates we hold, and a link to the document the mapping was
 *      read from. A sitting is not "119th Congress" for a Utah bill; it is the
 *      2024 General Session, and the letterhead reads it out of the same
 *      externalIds key the ingest wrote.
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
    // The ingested description, at the length the real ones run to. It is the
    // reason this pass exists: printed above the letterhead it pushed the chips
    // and the vote strip off a phone screen entirely.
    summary:
      "Title I establishes a Federal housing supply block grant and conditions a portion of surface " +
      "transportation formula funds on the adoption of by-right approval near fixed-guideway transit. " +
      "Title II shortens the environmental review window for qualifying residential projects and sets " +
      "deadlines for agency action on permit applications. Title III expands the low-income housing tax " +
      "credit allocation and makes the small-state minimum permanent. Title IV directs the Comptroller " +
      "General to report on local approval timelines. Title V bars a Federal Reserve central bank digital " +
      "currency issued directly to individuals.",
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
  for (const f of [...ENGINE_FILES, "issue-colors.js", "issue-scope.js", "bill-detail.js"]) {
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

// ═════════════════════════════════════════════════════════════════════════════
section("1 · identity — the census a reader arrives with nothing knowing");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(FED_LH, "H.R. 6644", "the federal letterhead does not print the bill number");
  // The official title is a sentence of legislative prose, so it went where the
  // rest of the prose went — into the fold. It is still on the page, verbatim.
  hasNot(FED_LH, "To increase the supply of housing",
    "the official title is back in the census, which is where it used to crowd out the chips");
  has(FED, "To increase the supply of housing",
    "the official title was dropped from the page rather than moved into the fold");
  has(FED_LH, "House", "the chamber is missing from the federal letterhead");
  has(FED_LH, "119th Congress", "the federal sitting is not named");
  has(FED_LH, "Introduced Dec 4, 2025", "the introduction date we hold is not printed");
  has(FED_LH, "Voted Feb 11, 2026", "the date of the recorded vote is not printed");
  // The mapping text beats the bill page: the mapping was made against THAT
  // document, so that is the one a reader checking our work needs.
  has(FED_LH, "https://www.congress.gov/bill/119th-congress/house-bill/6644/text/eh",
    "the letterhead does not link the document the mapping was read from");
  has(FED_LH, "Engrossed text", "the text link does not name which document it is");

  // Utah: the sitting comes out of externalIds, not out of a null congress.
  has(UT_LH, "H.B. 257", "the Utah letterhead does not print the bill number");
  has(UT_LH, "Utah House · 2024 General Session",
    "the Utah letterhead does not name the chamber and the named session together");
  hasNot(UT_LH, "th Congress", "a Utah bill is being filed under a Congress it was never in");
  hasNot(UT_LH, "nullth", "a null congress is leaking into the Utah identity line");
  has(UT_LH, "Enrolled text", "the enrolled text Utah mappings are read from is not named");
  has(UT_LH, "le.utah.gov", "the Utah text link does not point at the Utah Legislature");
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
  has(EMPTY_LH, "No recorded vote is on file for this measure yet",
    "the vote strip's own honest empty is missing");
  has(EMPTY_LH, "No topics are mapped to this measure yet",
    "an unmapped measure does not say that a vote on it counts on nothing");
  has(EMPTY_LH, "No link to the official text is on file",
    "a measure with no text link pretends to have one, or says nothing");
  has(EMPTY_LH, "No date is on file", "a measure with no dates says nothing about the gap");
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
section("4 · the vote strip counts votes, not parties, and opens the roll list");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const [name, lh, data, html] of [["H.R. 6644", FED_LH, HR6644, FED], ["H.B. 257", UT_LH, HB257, UT]]) {
    const t = data.rollcalls[0].totals;
    eq(count(lh, /class="bd-lh-strip"/g), data.rollcalls.length, `${name}: one vote strip per roll call`);
    has(lh, `<b>${t.yea}</b> Yea`, `${name}: the strip does not print the Yea count`);
    has(lh, `<b>${t.nay}</b> Nay`, `${name}: the strip does not print the Nay count`);
    has(lh, `<b>${t.present}</b> Present`, `${name}: Present is not counted on the strip`);
    has(lh, `<b>${t.notVoting}</b> Did not vote`, `${name}: the members who did not vote are not counted`);
    eq(count(lh, /class="bd-lh-vc /g), 4, `${name}: the strip shows something other than the four vote slots`);
    // The strip is a door to the roll list, and the roll list has the anchor it
    // aims at. Two halves of one jump; each is useless alone.
    has(lh, 'data-bd-goto="rolls"', `${name}: the vote strip does not tap through anywhere`);
    has(html, 'data-bd-anchor="rolls"', `${name}: nothing on the page answers to the strip's jump`);
    ok(html.indexOf('data-bd-anchor="rolls"') > html.indexOf('data-bd-goto="rolls"'),
      `${name}: the roll list the strip jumps to is above the strip, which makes the jump a no-op`);
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
  // Inside the letterhead: teaching line, then the tally, then the chips, then
  // the vote strips, and the identity table last. Reference material is reference
  // material; it does not get the top of the panel.
  const seq = [
    ["the teaching line", 'class="bd-lh-teach"'],
    ["the topic tally", 'class="bd-lh-tally"'],
    ["the chips", 'class="bd-lh-chips"'],
    ["the vote strips", 'class="bd-lh-votes"'],
    ["the identity table", 'class="bd-lh-facts"'],
  ];
  for (const [name, mark] of seq) has(FED_LH, mark, `${name} is not in the letterhead at all`);
  const at = seq.map(([name, mark]) => ({ name, i: FED_LH.indexOf(mark) }));
  for (let k = 1; k < at.length; k++) {
    ok(at[k - 1].i < at[k].i,
      `${at[k].name} is printed before ${at[k - 1].name} — the census order is wrong`);
  }

  // The narrative dump is out of the header and behind a closed disclosure.
  hasNot(FED.slice(0, FED.indexOf('class="bd-sec bd-lh"')), "Title I establishes",
    "the section-by-section description is still printed above the letterhead");
  has(FED, 'class="bd-fold"', "there is no fold on a bill that has prose to fold");
  ok(FED.indexOf('class="bd-fold"') > FED.indexOf('class="bd-sec bd-lh"'),
    "the fold is above the census it is supposed to sit under");
  has(FED, "Title I establishes", "the summary was dropped instead of folded");
  has(FED, "What’s in this act", "the fold does not say what is inside it");
  // Closed means closed: a native <details> with no open attribute, so the text
  // is in the DOM and none of it is painted until the reader asks.
  ok(/<details class="bd-fold">/.test(FED),
    "the fold ships open, or is not a real disclosure element");
  hasNot(FED, '<p class="bd-summary">',
    "the old always-open summary paragraph is still being rendered somewhere on the live face");
  // A bill with nothing to fold gets no fold. An empty disclosure is a promise
  // with nothing behind it.
  hasNot(EMPTY, 'class="bd-fold"', "a measure with no prose on file grew an empty fold");

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
    for (const f of [...ENGINE_FILES, "issue-colors.js", "issue-scope.js"]) {
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
