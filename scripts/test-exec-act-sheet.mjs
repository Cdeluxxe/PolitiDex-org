#!/usr/bin/env node
/**
 * test-exec-act-sheet.mjs — an executive act stops pretending it needed a vote
 * ─────────────────────────────────────────────────────────────────────────────
 * A presidential memorandum is a formal act of one official. It is signed, it is
 * published in the Federal Register, it can later be revoked or superseded, and
 * at no point in that life does it go to a House or Senate floor. So a bill sheet
 * that greets one with "No recorded roll-call votes for this measure yet" tells a
 * reader two things that are not true: that a vote was due, and that the archive
 * is missing it. The "yet" promises a tally that will never arrive.
 *
 * The fix is copy, not scope. The sheet already holds everything a reader needs
 * about a solo instrument — the Federal Register link, the date, the status, the
 * topics it was mapped to — and this suite is about what it SAYS around them:
 *
 *   1. THE PROCESS SENTENCE, VERBATIM. One official issued it; it does not go to
 *      a roll call; the formal record is the issuance and any later
 *      revoke/supersede, not a yea/nay. Locked wording, on the sheet and on the
 *      fallback card.
 *   2. THE MISSING-VOTE SENTENCE IS GONE FROM THIS INSTRUMENT. Not moved lower,
 *      not softened — absent. It is a claim about a chamber file, and a
 *      memorandum has no chamber file to be empty.
 *   3. A DISAPPROVAL VOTE BELONGS TO THE DISAPPROVAL MEASURE. If a later Congress
 *      voted on a CRA resolution, that resolution has its own number and its own
 *      sheet. This one still shows no floor tally.
 *   4. THE REST OF THE RECORD SURVIVES. Link, date, status, topic mapping, and
 *      "standing describes the instrument, not its effect."
 *   5. A BILL IS STILL A BILL. S. 4021 — a senate measure with an empty chamber
 *      file — must go on saying no roll call, because for a bill that sentence is
 *      the truth. This is the guard that stops the fix from becoming a blanket
 *      excuse for every missing tally in the archive.
 *
 * The fixture is 90 FR 8245, the real memorandum shipped in exec-action-data.js,
 * carried here as a measure row.
 *
 *   node scripts/test-exec-act-sheet.mjs
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
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} — missing ${JSON.stringify(needle)}`);
const hasNot = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg} — found ${JSON.stringify(needle)}`);
const section = (t) => console.log(`\n  · ${t}`);

// The locked sentence, as one string. bill-detail.js wraps it over three
// concatenated source lines; what a reader sees is this.
const SAY = "This is an executive act. One official issued it; it does not go to a House or " +
  "Senate roll call. The formal record here is the issuance (and any later revoke/supersede), " +
  "not a yea/nay.";
const CRA = "A later vote on a related disapproval resolution belongs to that measure and is " +
  "counted there; it is not a floor tally for this instrument.";
const STANDING = "Standing describes the instrument, not its effect.";
// The two sentences a solo instrument must never be handed.
const ROLLGAP = "No recorded roll-call votes for this measure yet.";
const VOTEGAP = "No recorded vote on file.";

// ── the fixtures ─────────────────────────────────────────────────────────────
// 90 FR 8245, the cost-of-living memorandum of January 20, 2025. measureType
// "memorandum", chamber "executive", two mapped topics so the packaging half of
// the teaching line is exercised, zero rollcalls, and a Federal Register link
// that has to survive the copy change intact.
const FR8245 = {
  measure: {
    id: 90245, number: "Presidential Memorandum, 90 FR 8245", congress: null, chamber: "executive",
    measureType: "memorandum", status: "enacted",
    title: "Delivering Emergency Price Relief for American Families and Defeating the Cost-of-Living Crisis",
    introducedAt: "2025-01-20",
    externalIds: {
      federalRegisterUrl: "https://www.federalregister.gov/documents/2025/01/28/2025-01900/delivering-emergency-price-relief-for-american-families-and-defeating-the-cost-of-living-crisis",
      mappingReadFrom: "as issued",
      mappingTextUrl: "https://www.federalregister.gov/documents/2025/01/28/2025-01900/delivering-emergency-price-relief-for-american-families-and-defeating-the-cost-of-living-crisis",
    },
    source: {
      url: "https://www.federalregister.gov/documents/2025/01/28/2025-01900/delivering-emergency-price-relief-for-american-families-and-defeating-the-cost-of-living-crisis",
      label: "Federal Register",
    },
  },
  issues: [
    { issueKey: "cost_living", supportMeaning: "yea_supports", isPrimary: true, rationale: "Directs agencies to pursue price relief." },
    { issueKey: "housing", supportMeaning: "yea_supports", isPrimary: false, rationale: "Names housing supply among the directed actions." },
  ],
  rollcalls: [], positions: [], provisions: [], actions: [],
};

// An executive order, to prove the predicate is not memorandum-only and does not
// depend on the chamber column being filled in.
const EO = {
  measure: {
    id: 14173, number: "Executive Order 14173", congress: null, chamber: null,
    measureType: "executive_order", status: "enacted",
    title: "Ending Illegal Discrimination and Restoring Merit-Based Opportunity",
    introducedAt: "2025-01-21",
    source: { url: "https://www.federalregister.gov/documents/2025/01/22/2025-01953/", label: "Federal Register" },
  },
  issues: [{ issueKey: "end_dei", supportMeaning: "yea_supports", isPrimary: true, rationale: "" }],
  rollcalls: [], positions: [], provisions: [], actions: [],
};

// THE CONTROL. A senate bill with an empty chamber file. For this measure the
// missing-vote sentence is the honest one and has to survive untouched.
const BILL = {
  measure: {
    id: 4021, number: "S. 4021", congress: 119, chamber: "senate", measureType: "bill",
    status: "introduced", title: "A bill",
  },
  issues: [], rollcalls: [], positions: [], provisions: [], actions: [],
};

// A CRA disapproval resolution — voted on, with a real tally. It is a DIFFERENT
// measure from the order it disapproves, and this fixture exists to say so: its
// tally appears on its own sheet and nowhere near FR 8245's.
const CRA_RES = {
  measure: {
    id: 5510, number: "S.J. Res. 51", congress: 119, chamber: "senate", measureType: "resolution",
    status: "passed_senate", title: "A joint resolution of disapproval",
    introducedAt: "2025-03-04",
  },
  issues: [{ issueKey: "cost_living", supportMeaning: "yea_opposes", isPrimary: true, rationale: "" }],
  rollcalls: [{
    id: 9901, chamber: "senate", question: "On Passage of the Joint Resolution", result: "passed",
    voteDate: "2025-03-19", totals: { yea: 51, nay: 47, present: 0, notVoting: 2 }, votes: [],
    source: { url: "https://www.senate.gov/legislative/LIS/roll_call_votes/", label: "Senate" },
  }],
  positions: [], provisions: [], actions: [],
};

// ── boot the shipped panel ───────────────────────────────────────────────────
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

// The vote section, sliced off the rest — several claims below are about what a
// reader finds where they went looking for votes, and a page that answers them
// three sections lower has not answered them.
function rolls(html) {
  const i = html.indexOf('data-bd-anchor="rolls"');
  if (i < 0) return "";
  const j = html.indexOf("</section>", i);
  return j < 0 ? html.slice(i) : html.slice(i, j + 10);
}
// The teaching line — the first prose on the sheet. "Does not LEAD with" is a
// claim about this string specifically.
function teach(html) {
  const i = html.indexOf('class="bd-lh-teach"');
  if (i < 0) return "";
  const j = html.indexOf("</p>", i);
  return j < 0 ? html.slice(i) : html.slice(i, j + 4);
}

const { win, capture } = boot();
const MEMO = await render(win, capture, FR8245);
const ORDER = await render(win, capture, EO);
const SENATE = await render(win, capture, BILL);
const DISAPPROVAL = await render(win, capture, CRA_RES);

console.log("\n✒️ executive acts — one official issued it, nobody voted on it");
for (const [name, html] of [
  ["90 FR 8245", MEMO], ["EO 14173", ORDER], ["S. 4021", SENATE], ["S.J. Res. 51", DISAPPROVAL],
]) {
  if (!html || html.length < 600) {
    console.error(`✗ exec act sheet: ${name} rendered ${html.length} characters — nothing below can be trusted`);
    process.exit(1);
  }
}
ok(rolls(MEMO).length > 120, "the memorandum sheet has no vote-anchored section at all");
ok(teach(MEMO).length > 60, "the memorandum sheet has no teaching line at all");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the process sentence, verbatim, where a reader went looking for votes");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(MEMO, SAY, "the memorandum sheet does not carry the executive-act sentence");
  has(ORDER, SAY, "the executive-order sheet does not carry the executive-act sentence");
  // The sentence lands in the section a reader opens expecting a tally, and the
  // heading over it stops promising one.
  has(rolls(MEMO), SAY, "the executive-act sentence is not in the vote section — a reader looking for the tally never sees why there isn't one");
  has(rolls(MEMO), "Why there is no roll call", "the vote section still heads itself as roll-call votes over a paragraph saying there are none");
  hasNot(rolls(MEMO), "Roll-call votes", "the vote-section heading still promises a tally the instrument cannot have");
  // And it is the LEAD. The teaching line is the first prose on the sheet.
  has(teach(MEMO), "This is an executive act.", "the sheet does not LEAD with the process sentence");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the missing-vote sentences are absent, not relocated");
// ═════════════════════════════════════════════════════════════════════════════
{
  hasNot(MEMO, ROLLGAP, "the memorandum is still told a roll call is missing 'yet'");
  hasNot(MEMO, VOTEGAP, "the memorandum still leads with 'No recorded vote on file'");
  hasNot(ORDER, ROLLGAP, "the executive order is still told a roll call is missing 'yet'");
  hasNot(ORDER, VOTEGAP, "the executive order still says 'No recorded vote on file'");
  // "Not relocated" is the point of checking the whole document rather than the
  // section: a page that moved the sentence one block down would pass a sliced
  // assertion and still be wrong.
  hasNot(teach(MEMO), "No recorded", "the teaching line still opens on an absence");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · a disapproval vote belongs to the disapproval measure");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(MEMO, CRA, "the memorandum does not say where a later disapproval vote is counted");
  // No tally, no vote chip, no yea/nay arithmetic anywhere on the instrument's
  // face. If a CRA resolution's numbers ever leaked onto this sheet, they would
  // read as this document's floor result.
  hasNot(MEMO, "bd-tally", "a vote tally rendered on an instrument that never had one");
  hasNot(MEMO, "bd-lh-vchip", "a vote chip rendered on an instrument that never had one");
  hasNot(MEMO, "On Passage", "a floor question rendered on an instrument that never reached a floor");
  // The disapproval resolution keeps its own tally, on its own sheet, and is not
  // handed the executive-act excuse.
  has(DISAPPROVAL, "bd-tally", "the disapproval resolution lost its own roll-call tally");
  has(DISAPPROVAL, "On Passage of the Joint Resolution", "the disapproval resolution lost its own floor question");
  hasNot(DISAPPROVAL, SAY, "a voted resolution was handed the executive-act sentence");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the rest of the record survives the copy change");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(MEMO, "federalregister.gov", "the memorandum lost its Federal Register link");
  has(MEMO, "Presidential Memorandum, 90 FR 8245", "the memorandum lost its own document number");
  has(MEMO, "Jan 20, 2025", "the memorandum lost the date it was issued");
  has(MEMO, "Enacted", "the memorandum lost its status chip");
  // Topic mapping intact — both keys, still chips.
  has(MEMO, 'data-issue="cost_living"', "the memorandum lost its primary topic mapping");
  has(MEMO, 'data-issue="housing"', "the memorandum lost its second topic mapping");
  has(MEMO, STANDING, "the sheet dropped 'Standing describes the instrument, not its effect.'");
  // The packaging half of the teaching line is about issuance, not about riding
  // on a vote nobody held.
  has(teach(MEMO), "One official issued them together", "the two-topic memorandum still explains its packaging in vote language");
  // Doctrine, unchanged: no percentage and no party word on this face.
  hasNot(rolls(MEMO), "%", "a percentage appeared in the executive-act explainer");
  for (const w of ["Republican", "Democrat", "GOP"]) {
    hasNot(rolls(MEMO), w, `the executive-act explainer names a party (${w})`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4b · the topic chips do not describe a vote nobody held");
// ═════════════════════════════════════════════════════════════════════════════
{
  // WHAT WAS WRONG. Every topic chip on the sheet read "A Yea advances this" —
  // including on this memorandum, three inches under a letterhead that says in so
  // many words that there was no vote to cast. The direction is the curators' own
  // and is unchanged; the ACTOR is what was wrong, because an executive measure
  // is issued rather than voted.
  has(MEMO, "As issued, advances this", "the memorandum's topic chip does not use issuance language");
  hasNot(MEMO, "A Yea advances this", "the memorandum's topic chip still describes a vote nobody held");
  hasNot(MEMO, "A Yea cuts against this", "the memorandum's topic chip still describes a vote nobody held");
  has(ORDER, "As issued, advances this", "the executive order's topic chip does not use issuance language");
  hasNot(ORDER, "A Yea", "the executive order's sheet still puts a Yea on a topic chip");
  // THE DIRECTION SURVIVES, and so does everything that counts on it: the class
  // is what the colour and every row count read, and it is untouched.
  has(MEMO, 'class="bd-eff bd-eff-adv"', "the memorandum's chip lost the class the colour and the counts read");
  const rowN = (String(MEMO).match(/class="bd-omni-row/g) || []).length;
  ok(rowN === 2, `the memorandum's topic rows changed in number — got ${rowN}, want 2`);
  // A VOTED MEASURE IS UNTOUCHED. The disapproval resolution had a roll call, so a
  // Yea is exactly what its chip is about.
  has(DISAPPROVAL, "A Yea cuts against this", "a voted resolution lost the Yea its chip is actually about");
  hasNot(DISAPPROVAL, "As issued", "a voted resolution's chip now talks about issuance");
  // And the provisions strip says it the same way, lead sentence included.
  const PROV = await render(win, capture, {
    ...FR8245,
    provisions: [{ label: "Emergency price relief directive", supportMeaning: "yea_supports", issueKey: "cost_living", description: "Directs agency heads." }],
  });
  has(PROV, "Key provisions", "the provisions strip did not render for the memorandum");
  has(PROV, "which way it cuts on each as issued", "the provisions lead still asks which way a Yea cuts on an issued measure");
  hasNot(PROV, "which way a Yea cuts on each", "the provisions lead still puts a Yea on an issued measure");
  const PROVBILL = await render(win, capture, {
    ...CRA_RES,
    provisions: [{ label: "A named piece", supportMeaning: "yea_supports", issueKey: "cost_living", description: "" }],
  });
  has(PROVBILL, "which way a Yea cuts on each", "a voted measure's provisions lead lost the Yea it is about");
  has(PROVBILL, "A Yea advances this", "a voted measure's provision chip lost the Yea it is about");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · a bill with an empty chamber file still says so");
// ═════════════════════════════════════════════════════════════════════════════
// THE GUARD THAT KEEPS THE FIX HONEST. Everything above is a licence to stop
// saying "no vote on file", and a licence that applies to every measure would
// have deleted a true sentence from the whole archive. S. 4021 is a senate bill
// that genuinely has no roll call on file, and it must go on saying exactly that.
{
  has(SENATE, ROLLGAP, "a senate bill with an empty chamber file stopped saying no roll call was recorded");
  has(SENATE, VOTEGAP, "a senate bill with an empty chamber file stopped leading with 'No recorded vote on file'");
  hasNot(SENATE, SAY, "a senate bill was told it is an executive act");
  hasNot(SENATE, CRA, "a senate bill was handed the disapproval-measure clarifier");
  has(rolls(SENATE), "Roll-call votes", "the senate bill lost its roll-call heading");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the summary hole is named, never filled");
// ═════════════════════════════════════════════════════════════════════════════
// C. Where no plain-language "what this text does" exists, the sheet says so
// beside the official link rather than leaving a reader to read the title as a
// description. Nothing is generated: a title is what an act is called.
{
  has(MEMO, "No plain-language summary on file yet", "the memorandum has no summary and does not say so");
  has(SENATE, "No plain-language summary on file yet", "the bare bill has no summary and does not say so");
  // The line sits in the identity block, with the link — not adrift in a section
  // of its own.
  const dl = MEMO.slice(MEMO.indexOf('<dl class="bd-ident">'), MEMO.indexOf("</dl>") + 5);
  has(dl, "No plain-language summary on file yet", "the missing-summary line is not printed beside the official source link");
  // NO SUMMARY WAS INVENTED. The one thing the sheet must not do is turn the
  // title into a description, so the title's own words may not appear as prose
  // introduced by a summary class.
  hasNot(MEMO, '<p class="bd-summary">', "a summary paragraph rendered for a measure that has none");
  hasNot(MEMO, "bd-fold", "a prose fold rendered for a measure with no summary to fold");
  // And a measure that HAS one is untouched: no gap line, and the summary prints.
  const WITH = await render(win, capture, {
    ...FR8245,
    measure: { ...FR8245.measure, summary: "Directs the heads of all executive departments to deliver emergency price relief." },
  });
  has(WITH, "Directs the heads of all executive departments", "a measure with a summary on file no longer prints it");
  hasNot(WITH, "No plain-language summary on file yet", "a measure with a summary on file is still told it has none");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the guards are load-bearing (mutations must break the claims)");
// ═════════════════════════════════════════════════════════════════════════════
// Each claim above is only worth its line if a plausible regression fails it.
// These are the three regressions this pass exists to prevent.
{
  const src = readFileSync(join(ROOT, "bill-detail.js"), "utf8");
  // (a) drop the predicate → the memorandum is a measure like any other
  const noPred = src.replace(/function isExecutiveAct\(m\) \{[\s\S]*?\n  \}/,
    "function isExecutiveAct(m) { return false; }");
  ok(noPred !== src, "GUARD BROKEN: isExecutiveAct is not shaped as this suite expects — mutation (a) matched nothing");
  // (b) widen the predicate to everything → the bill loses a true sentence
  const allExec = src.replace(/function isExecutiveAct\(m\) \{[\s\S]*?\n  \}/,
    "function isExecutiveAct(m) { return true; }");
  ok(allExec !== src, "GUARD BROKEN: mutation (b) matched nothing");
  for (const [label, mutated, fixture, want] of [
    ["(a) predicate returns false", noPred, FR8245, ROLLGAP],
    ["(b) predicate returns true", allExec, BILL, SAY],
    // (c) with the predicate off, the memorandum's chips go back to describing a
    //     vote nobody held — which is what makes section 4b load-bearing.
    ["(c) predicate returns false, topic chip", noPred, FR8245, "A Yea advances this"],
  ]) {
    const w = makeSandbox();
    const cap = { innerHTML: "", scrollTop: 0 };
    w.document.getElementById = (id) => (id === "pdx-bd-scroll" ? cap : null);
    w.history = { replaceState() {}, pushState() {} };
    const c = vm.createContext(w);
    for (const f of [...ENGINE_FILES, "issue-colors.js", "issue-scope.js", "receipt-cards.js"]) {
      vm.runInContext(readFileSync(join(ROOT, f), "utf8"), c, { filename: f });
    }
    vm.runInContext(mutated, c, { filename: "bill-detail.mutated.js" });
    const out = await render(w, cap, fixture);
    ok(String(out).includes(want),
      `GUARD BROKEN: mutation ${label} did not change what the sheet says — the assertions above prove nothing`);
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ exec act sheet: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`\n✓ exec act sheet: all ${passed} assertions passed`);
console.log("  4 fixtures · memorandum · executive order · senate bill · disapproval resolution · 3 mutations rejected");
