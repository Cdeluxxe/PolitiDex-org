#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Unit tests for the VOTE-DERIVED SHARE CARDS in receipt-cards.js
// ─────────────────────────────────────────────────────────────────────────────
// receipt-cards.js is a second feed into the share-card renderer that already
// ships in say-vs-do.js: it turns Official Record verdicts (a member's own floor
// vote against their own stated position on the same ISSUE_MAP key) into images
// through the existing canvas / share pipeline.
//
// A share card is the only PolitiDex surface that travels WITHOUT its context —
// no link to follow, no methodology panel one tap away, nothing to correct it
// once it is a PNG in someone's feed. So the thing worth testing here is not
// that cards get built; it is that the wrong ones DON'T. This harness gates:
//
//   1. the GUARDS, each against the specific defect it exists to stop — a
//      nomination proxy, an incoherent issue key, a mis-filed stance, a
//      procedural question, a circular vote-derived "they said", a duplicated
//      measure identity, and a verdict that disagrees with the profile it links
//      to. Every guard must fail CLOSED;
//   2. the CARD CONTRACT — name, office, issue, they-said, bill · question ·
//      position · date, a citable URL, a visible method link and a verdict stamp,
//      all sourced from the input and nothing invented;
//   3. the OMNIBUS SPLIT — one vote, both directions, read off the stored mapping;
//   4. the BOUNDARY — no Official Record verdict reaches a Say-vs-Do score, and a
//      card's deep link lands on the Official Record view, not the Say-vs-Do one.
//
//   node scripts/test-receipt-cards.mjs
//
// No database, no network, no browser. Exit code is non-zero on the first failure.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── Sandbox ───────────────────────────────────────────────────────────────────
// Enough document for the boot guards in say-vs-do.js / receipt-cards.js to
// no-op. setInterval is stubbed to a dead token so say-vs-do.js's refresh poll
// cannot hold the process open.
const noopEl = () => ({
  style: {}, textContent: "", hidden: false, className: "", innerHTML: "",
  classList: { add() {}, remove() {}, contains: () => false },
  setAttribute() {}, getAttribute: () => null, appendChild() {}, removeChild() {},
  querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {}, focus() {}, scrollIntoView() {},
  closest: () => null, insertAdjacentHTML() {}, remove() {},
});
const ctx = {
  console,
  document: {
    readyState: "complete",
    head: noopEl(), body: noopEl(), documentElement: noopEl(),
    createElement: noopEl, getElementById: () => null,
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {},
  },
  location: { hash: "", origin: "https://politidex.fyi", pathname: "/" },
  navigator: {},
  setTimeout: () => 0, clearTimeout: () => {},
  setInterval: () => 0, clearInterval: () => {},
  requestAnimationFrame: () => 0,
  JSON, Math, Date, Promise, encodeURIComponent, decodeURIComponent,
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
ctx.addEventListener = () => {};

// ── Fixtures, declared BEFORE load so the modules see them like a real page ───
ctx.ISSUE_MAP = ctx.window.ISSUE_MAP = {
  national_debt:     { label: "💰 National Debt" },
  lower_taxes:       { label: "🧾 Lower Taxes" },
  healthcare:        { label: "🏥 Health Care" },
  climate_action:    { label: "🌍 Climate Action" },
  border_security:   { label: "🛂 Border Security" },
  gov_regulation:    { label: "📋 Government Regulation" },
  lands_preserve:    { label: "🏞️ Public Lands" },
  school_choice:     { label: "🎓 School Choice" },
  tariffs_authority: { label: "⚖️ Tariff Authority" },
  america_first_fp:  { label: "🌐 America First Foreign Policy" },
  restraint:         { label: "🕊️ Military Restraint" },
  strong_defense:    { label: "🛡️ Strong Defense" },
};

const SRC = (u) => ({ url: u, label: "Congress.gov" });

// One member, one stated position per issue — each written to exercise exactly
// one branch of the guards.
ctx.ISSUE_STANCE_DATA = ctx.window.ISSUE_STANCE_DATA = {
  testrep: [
    { issueKey: "national_debt", issueStance: "support", topic: "National Debt",
      text: "The deficit is the defining threat to the next generation and I will not vote to add to it." },
    { issueKey: "lower_taxes", issueStance: "support", topic: "Taxes",
      text: "Every bracket should keep more of what it earns." },
    { issueKey: "healthcare", issueStance: "support", topic: "Health Care",
      text: "Medicaid coverage in this district must be protected." },
    { issueKey: "climate_action", issueStance: "support", topic: "Climate",
      text: "Emissions have to fall this decade, not the next one." },
    { issueKey: "school_choice", issueStance: "support", topic: "Schools",
      text: "Families should be able to choose the school that fits their child." },
    { issueKey: "gov_regulation", issueStance: "oppose", topic: "Regulation",
      text: "Federal rulemaking has outrun the Congress that authorised it." },
    { issueKey: "lands_preserve", issueStance: "oppose", topic: "Public Lands",
      text: "Public land should stay in public hands." },
    // Guard 3 — the incoherent key. This text is the congressional-authority
    // reading of `tariffs_authority`, filed as support, which is what makes the
    // key unshippable.
    { issueKey: "tariffs_authority", issueStance: "support", topic: "Tariffs",
      text: "The Constitution gives Congress — not the president — the power to set tariffs." },
    // Guard 4 — a restraint position filed under america_first_fp.
    { issueKey: "america_first_fp", issueStance: "support", topic: "Foreign Policy",
      text: "No more endless wars: Congress never authorised this deployment." },
    // Guard 10 — a stated position that is itself a vote.
    { issueKey: "border_security", issueStance: "support", topic: "Border",
      text: "Voted against an amendment (H.Amdt. 252) that would have stripped the funding." },
  ],
};
ctx.PROFILES = ctx.window.PROFILES = {
  testrep: { name: "Rep. Test Member", office: "U.S. House", district: "TX-07", state: "TX", party: "R" },
};

// The record. Shapes match voting-record.js's hydrateIssueRecords output.
const RECORDS = [
  // The workhorse: a real omnibus, five mapped issues, both directions.
  {
    kind: "vote", measureId: 1, congress: 119, session: 1, rollNumber: 190, measureType: "bill", number: "H.R. 1",
    title: "One Big Beautiful Bill Act", chamber: "house", result: "Passed",
    date: "2025-07-03", action: "On Passage", position: "yea",
    isProcedural: false, advanceInverted: false,
    source: SRC("https://www.congress.gov/bill/119th-congress/house-bill/1?q=1"),
    issues: [
      { issueKey: "lower_taxes", weight: 100, isPrimary: true, supportMeaning: "yea_supports",
        rationale: "Extends and expands the 2017 individual rate cuts." },
      { issueKey: "national_debt", weight: 65, isPrimary: false, supportMeaning: "yea_opposes",
        rationale: "CBO scores the package as adding to the deficit over ten years." },
      { issueKey: "healthcare", weight: 60, isPrimary: false, supportMeaning: "yea_opposes" },
      { issueKey: "climate_action", weight: 55, isPrimary: false, supportMeaning: "yea_opposes" },
      { issueKey: "border_security", weight: 55, isPrimary: false, supportMeaning: "yea_supports" },
    ],
  },
  // Guard 1 — a confirmation vote carrying a policy key at full weight.
  {
    kind: "vote", measureId: 2, congress: 119, session: 1, rollNumber: 61, measureType: "nomination", number: "PN 100",
    title: "Nomination of a Secretary of Health and Human Services", chamber: "senate",
    result: "Confirmed", date: "2025-02-13", action: "On the Nomination", position: "yea",
    isProcedural: false, source: SRC("https://www.congress.gov/nomination/119th-congress/100"),
    issues: [{ issueKey: "healthcare", weight: 100, isPrimary: true, supportMeaning: "yea_opposes" }],
  },
  // Guard 3 — the incoherent key.
  {
    kind: "vote", measureId: 3, congress: 119, session: 1, rollNumber: 129, measureType: "resolution", number: "S.J.Res. 37",
    title: "Terminating the national emergency underlying certain tariffs", chamber: "senate",
    result: "Rejected", date: "2025-04-30", action: "On Passage", position: "nay",
    isProcedural: false, source: SRC("https://www.congress.gov/bill/119th-congress/senate-joint-resolution/37"),
    issues: [{ issueKey: "tariffs_authority", weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
  },
  // Guard 4 — america_first_fp resting on the restraint stance above.
  {
    kind: "vote", measureId: 4, congress: 119, session: 1, rollNumber: 168, measureType: "amendment", number: "H.Amdt. 252",
    title: "Amendment prohibiting funds for unauthorized hostilities", chamber: "house",
    result: "Failed", date: "2025-06-18", action: "On Agreeing to the Amendment", position: "nay",
    isProcedural: false, source: SRC("https://www.congress.gov/amendment/119th-congress/house-amendment/252"),
    issues: [
      { issueKey: "america_first_fp", weight: 80, isPrimary: true, supportMeaning: "yea_supports" },
      { issueKey: "strong_defense", weight: 40, isPrimary: false, supportMeaning: "yea_opposes" },
    ],
  },
  // Guard 6 — procedural question.
  {
    kind: "vote", measureId: 5, congress: 119, session: 1, rollNumber: 70, measureType: "bill", number: "H.R. 22",
    title: "SAVE Act", chamber: "house", result: "Failed",
    date: "2025-03-04", action: "On Motion to Recommit", position: "yea",
    isProcedural: true, source: SRC("https://www.congress.gov/bill/119th-congress/house-bill/22"),
    issues: [{ issueKey: "gov_regulation", weight: 70, isPrimary: true, supportMeaning: "yea_supports" }],
  },
  // Guard 11 — ONE bill number arriving through TWO measure ids, the client-side
  // backstop for a database that has not applied the identity-merge migration.
  {
    kind: "vote", measureId: 56, congress: 119, session: 1, rollNumber: 200, measureType: "bill", number: "S.J.Res. 18",
    title: "Disapproving a rule on public land management", chamber: "senate",
    result: "Passed", date: "2025-05-08", action: "On Passage", position: "yea",
    isProcedural: false, source: SRC("https://www.congress.gov/bill/119th-congress/senate-joint-resolution/18"),
    issues: [{ issueKey: "lands_preserve", weight: 90, isPrimary: true, supportMeaning: "yea_opposes",
      // Guard 13 wants a plain-English operative effect on any disapproval-titled
      // measure, and in production every mapping carries one.
      rationale: "A Congressional Review Act resolution striking a federal rule; a yea removes the public-land management regulation." }],
  },
  {
    kind: "vote", measureId: 141, congress: 119, session: 1, rollNumber: 201, measureType: "resolution", number: "S.J.Res. 18",
    title: "Disapproving a rule on public land management", chamber: "senate",
    result: "Passed", date: "2025-05-08", action: "On Passage", position: "yea",
    isProcedural: false, source: SRC("https://www.congress.gov/bill/119th-congress/senate-joint-resolution/18"),
    issues: [{ issueKey: "lands_preserve", weight: 90, isPrimary: true, supportMeaning: "yea_opposes",
      // Guard 13 wants a plain-English operative effect on any disapproval-titled
      // measure, and in production every mapping carries one.
      rationale: "A Congressional Review Act resolution striking a federal rule; a yea removes the public-land management regulation." }],
  },
  // Guard 9 — school_choice: two votes matching the stance, one against it. A
  // contradiction card exists locally but the NET record does not say contradicts.
  {
    kind: "vote", measureId: 7, congress: 119, session: 1, rollNumber: 247, measureType: "bill", number: "H.R. 5",
    title: "Educational Choice for Children Act", chamber: "house", result: "Passed",
    date: "2025-09-10", action: "On Passage", position: "yea", isProcedural: false,
    source: SRC("https://www.congress.gov/bill/119th-congress/house-bill/5"),
    issues: [{ issueKey: "school_choice", weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
  },
  {
    kind: "vote", measureId: 8, congress: 119, session: 1, rollNumber: 260, measureType: "bill", number: "H.R. 6",
    title: "Charter School Expansion Act", chamber: "house", result: "Passed",
    date: "2025-10-01", action: "On Passage", position: "yea", isProcedural: false,
    source: SRC("https://www.congress.gov/bill/119th-congress/house-bill/6"),
    issues: [{ issueKey: "school_choice", weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
  },
  {
    kind: "vote", measureId: 9, congress: 119, session: 1, rollNumber: 271, measureType: "bill", number: "H.R. 7",
    title: "Public School Funding Floor Act", chamber: "house", result: "Passed",
    date: "2025-10-15", action: "On Passage", position: "yea", isProcedural: false,
    source: SRC("https://www.congress.gov/bill/119th-congress/house-bill/7"),
    issues: [{ issueKey: "school_choice", weight: 40, isPrimary: true, supportMeaning: "yea_opposes" }],
  },
];

// A second member used only for the record-quality guards, so the fixtures above
// stay readable. No stated positions are needed: these must be refused before a
// stance is ever consulted.
ctx.ISSUE_STANCE_DATA.thinrep = [
  { issueKey: "climate_action", issueStance: "support", text: "Emissions have to fall this decade." },
];
ctx.PROFILES.thinrep = { name: "Rep. Thin Record", office: "U.S. House", state: "OH", party: "D" };
const THIN_RECORDS = [
  { kind: "vote", measureId: 20, congress: 119, session: 1, rollNumber: 99, measureType: "bill", number: "H.R. 30", title: "Clean Grid Act",
    chamber: "house", result: "Passed", date: "2025-04-01", action: "On Passage", position: "yea",
    isProcedural: false, source: null,                    // guard 7 — no source URL
    issues: [{ issueKey: "climate_action", weight: 100, isPrimary: true, supportMeaning: "yea_opposes" }] },
];

// A third member, whose record on an issue runs BOTH ways — the row the split
// card exists for, and the only row shape that can produce one.
//
// `national_debt` is deliberately built so the strongest vote on the WITH side is
// a confirmation vote (guard 1 territory) and the strongest on the AGAINST side
// is an ordinary bill. That is the case the both-sides picker has to survive
// without loosening anything: the top item on a side is refused, so the card
// either steps down to the strongest CITABLE vote on that side or it does not
// build. `climate_action` is the same shape with a nomination as the ONLY item
// on its against side, so there is nothing to step down to and no card at all.
ctx.ISSUE_STANCE_DATA.splitrep = [
  { issueKey: "national_debt", issueStance: "support", topic: "National Debt",
    text: "Washington cannot keep spending money it does not have." },
  { issueKey: "climate_action", issueStance: "support", topic: "Climate",
    text: "Emissions have to fall this decade, not the next one." },
];
ctx.PROFILES.splitrep = { name: "Sen. Split Record", office: "U.S. Senate", state: "ID", party: "R" };
const SPLIT_RECORDS = [
  // WITH the stance, and the heaviest item on that side — and a nomination, so a
  // card may not cite it. 100.
  { kind: "vote", measureId: 30, congress: 119, session: 1, rollNumber: 40, measureType: "nomination", number: "PN 200",
    title: "Nomination of a Director of the Office of Management and Budget", chamber: "senate",
    result: "Confirmed", date: "2025-02-06", action: "On the Nomination", position: "yea", isProcedural: false,
    source: SRC("https://www.congress.gov/nomination/119th-congress/200"),
    issues: [{ issueKey: "national_debt", weight: 100, isPrimary: true, supportMeaning: "yea_supports" }] },
  // WITH the stance, citable, and second-heaviest — the vote the card must reach
  // by stepping down. 60.
  { kind: "vote", measureId: 31, congress: 119, session: 1, rollNumber: 88, measureType: "bill", number: "S. 82",
    title: "Federal Spending Cap Act", chamber: "senate", result: "Passed",
    date: "2025-03-11", action: "On Passage", position: "yea", isProcedural: false,
    source: SRC("https://www.congress.gov/bill/119th-congress/senate-bill/82"),
    issues: [{ issueKey: "national_debt", weight: 60, isPrimary: true, supportMeaning: "yea_supports",
      rationale: "Caps discretionary spending below the current baseline." }] },
  // AGAINST the stance, citable. 90 — so consistent 160 vs contradicting 90 over
  // three judged votes: materially split, neither side dominant, net = mixed.
  { kind: "vote", measureId: 32, congress: 119, session: 1, rollNumber: 152, measureType: "bill", number: "S. 1024",
    title: "Emergency Supplemental Appropriations Act", chamber: "senate", result: "Passed",
    date: "2025-06-24", action: "On Passage", position: "yea", isProcedural: false,
    source: SRC("https://www.congress.gov/bill/119th-congress/senate-bill/1024"),
    issues: [{ issueKey: "national_debt", weight: 90, isPrimary: true, supportMeaning: "yea_opposes",
      rationale: "Adds $300 billion in unoffset spending over the ten-year window." }] },
  // climate_action: mixed on the numbers (80 with, 100 against, two judged
  // votes), but the against side is a confirmation vote and nothing else.
  { kind: "vote", measureId: 33, congress: 119, session: 1, rollNumber: 51, measureType: "bill", number: "S. 500",
    title: "Clean Energy Deployment Act", chamber: "senate", result: "Passed",
    date: "2025-02-27", action: "On Passage", position: "yea", isProcedural: false,
    source: SRC("https://www.congress.gov/bill/119th-congress/senate-bill/500"),
    issues: [{ issueKey: "climate_action", weight: 80, isPrimary: true, supportMeaning: "yea_supports" }] },
  { kind: "vote", measureId: 34, congress: 119, session: 1, rollNumber: 63, measureType: "nomination", number: "PN 300",
    title: "Nomination of an Administrator of the Environmental Protection Agency", chamber: "senate",
    result: "Confirmed", date: "2025-03-04", action: "On the Nomination", position: "yea", isProcedural: false,
    source: SRC("https://www.congress.gov/nomination/119th-congress/300"),
    issues: [{ issueKey: "climate_action", weight: 100, isPrimary: true, supportMeaning: "yea_opposes" }] },
];

// A fourth member, whose record on these issues is made of formal instruments
// that are NOT floor votes: a signed law, an issued executive order, a
// cosponsorship, and one issue whose record runs both ways with a roll call on
// one side and a signature on the other. These are the instruments the record
// system already scores — `supports` is the boolean Direction Match reads for
// them — and what is new is only that they may now leave the app.
ctx.ISSUE_STANCE_DATA.actrep = [
  { issueKey: "lower_taxes", issueStance: "support", topic: "Taxes",
    text: "Working families should keep more of what they earn, and I will sign the bill that does it." },
  { issueKey: "border_security", issueStance: "support", topic: "Border",
    text: "The southern border has to be brought under control on day one." },
  { issueKey: "school_choice", issueStance: "support", topic: "Schools",
    text: "Families should be able to choose the school that fits their child." },
  { issueKey: "national_debt", issueStance: "support", topic: "National Debt",
    text: "Washington cannot keep spending money it does not have." },
];
ctx.PROFILES.actrep = { name: "Pres. Act Record", office: "President", state: "US", party: "R" };
const ACT_RECORDS = [
  // HARD ACT — signed into law. A deciding instrument: it has legal effect.
  { kind: "position", actionType: "signed", action: "signed", position: "signed",
    number: "H.R. 5371", title: "Tax Relief for Working Families Act",
    supports: true, date: "2025-11-12", isProcedural: false, result: null,
    congress: null, session: null, rollNumber: null,
    source: { url: "https://www.congress.gov/bill/119th-congress/house-bill/5371", label: "Congress.gov" },
    issues: [{ issueKey: "lower_taxes", weight: 100, isPrimary: true, supportMeaning: "yea_supports",
      rationale: "Lowers the bottom two individual rates for tax years 2026 through 2030." }] },
  // HARD ACT — an executive order, whose own address is far too long to set on
  // the footer line. The card must still build, citing the PolitiDex record page
  // in the footer while keeping the Federal Register document as its source.
  { kind: "position", actionType: "issued", action: "issued", position: "issued",
    number: "Executive Order 14165", title: "Securing Our Borders",
    supports: true, date: "2025-01-20", isProcedural: false, result: null,
    congress: null, session: null, rollNumber: null,
    source: { url: "https://www.federalregister.gov/documents/2025/01/30/2025-02015/securing-our-borders-and-protecting-the-american-people",
      label: "Federal Register" },
    issues: [{ issueKey: "border_security", weight: 90, isPrimary: true, supportMeaning: "yea_supports",
      rationale: "Directs the resumption of physical barrier construction along the southern border." }] },
  // SOFT ACT — a cosponsorship. Real, sourced, on the record, and not a vote on
  // anything: the card may carry it and may not word it as one.
  { kind: "position", actionType: "cosponsor", action: "cosponsor", position: "cosponsor",
    number: "S. 331", title: "Educational Opportunity Scholarship Act",
    supports: true, date: "2025-01-30", isProcedural: false, result: null,
    congress: null, session: null, rollNumber: null,
    source: { url: "https://www.congress.gov/bill/119th-congress/senate-bill/331", label: "Congress.gov" },
    issues: [{ issueKey: "school_choice", weight: 70, isPrimary: true, supportMeaning: "yea_supports",
      rationale: "Creates a federal scholarship-granting organisation tax credit." }] },
  // A MIXED row with one roll call on the with side and one signature on the
  // against side — the case where a split card may not say "voted" about either
  // its counts or the side that is not a vote.
  { kind: "vote", measureId: 40, congress: 119, session: 1, rollNumber: 310, measureType: "bill", number: "H.R. 900",
    title: "Federal Spending Restraint Act", chamber: "house", result: "Passed",
    date: "2025-04-15", action: "On Passage", position: "yea", isProcedural: false,
    source: SRC("https://www.congress.gov/bill/119th-congress/house-bill/900"),
    issues: [{ issueKey: "national_debt", weight: 80, isPrimary: true, supportMeaning: "yea_supports",
      rationale: "Caps discretionary spending below the current baseline." }] },
  { kind: "position", actionType: "signed", action: "signed", position: "signed",
    number: "H.R. 1200", title: "Emergency Supplemental Appropriations Act",
    supports: true, date: "2025-08-05", isProcedural: false, result: null,
    congress: null, session: null, rollNumber: null,
    source: { url: "https://www.congress.gov/bill/119th-congress/house-bill/1200", label: "Congress.gov" },
    issues: [{ issueKey: "national_debt", weight: 90, isPrimary: true, supportMeaning: "yea_opposes",
      rationale: "Adds $300 billion in unoffset spending over the ten-year window." }] },
];

// Stub the record data layer the module reads through.
const RECORD_STORE = { testrep: RECORDS, thinrep: THIN_RECORDS, splitrep: SPLIT_RECORDS, actrep: ACT_RECORDS };
ctx.window.PDXVotingRecord = {
  memberRecords: (pid) => RECORD_STORE[pid] || null,
  fetchMember: (pid) => Promise.resolve({ items: RECORD_STORE[pid] || [] }),
  noteMember: () => {},
};

const sandbox = vm.createContext(ctx);
for (const file of ["stance-helpers.js", "consistency.js", "say-vs-do.js", "receipt-cards.js"]) {
  vm.runInContext(readFileSync(join(ROOT, file), "utf8"), sandbox, { filename: file });
}

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (hay, needle, msg) =>
  ok(String(hay).includes(needle), `${msg} (${JSON.stringify(needle)} missing from ${JSON.stringify(hay)})`);
const lacks = (hay, needle, msg) =>
  ok(!String(hay).includes(needle), `${msg} (${JSON.stringify(needle)} unexpectedly present in ${JSON.stringify(hay)})`);

const RC = ctx.window.PDXReceiptCards;
ok(!!RC, "export: window.PDXReceiptCards exists");
if (!RC) { console.error("✖ PDXReceiptCards not exported — cannot continue"); process.exit(1); }
for (const fn of ["cardsFor", "contradiction", "consistency", "omnibus", "find", "audit", "warm", "share", "guards"]) {
  ok(RC[fn] != null, `export: PDXReceiptCards.${fn} is present`);
}

// Index the audit once — every guard assertion reads off it.
const auditRows = RC.audit("testrep");
const row = (issueKey, want) => auditRows.find((a) => a.issueKey === issueKey && a.want === want) || null;
const reasonFor = (issueKey, want) => { const r = row(issueKey, want); return r ? r.reason : "(no such candidate)"; };
const eligible = (issueKey, want) => { const r = row(issueKey, want); return !!(r && r.eligible); };

// ══ 1. THE GUARDS ════════════════════════════════════════════════════════════

// ── Guard 1 · nominations ─────────────────────────────────────────────────────
// The single largest exclusion: confirmation votes are mapped as policy proxies,
// so "the record shows: voted Yea on health care" would rest on a vote about a
// person. Nothing on a nomination may ever become a card.
ok(!eligible("healthcare", "contradicts"), "guard 1: a nomination-backed contradiction is not eligible");
has(reasonFor("healthcare", "contradicts"), "confirmation vote",
  "guard 1: the reason names the nomination proxy");
for (const r of auditRows) {
  ok(!(r.eligible && r.measureType === "nomination"),
    `guard 1: no eligible card cites a nomination (${r.issueKey}/${r.measure})`);
}
// And directly, so the guard cannot be reached only by accident of the fixtures.
ok(!!RC.guards.blockRecord({ kind: "vote", measureType: "nomination", position: "yea", number: "PN 1", action: "On the Nomination", date: "2025-01-01", source: SRC("https://x.test/1") }),
  "guard 1: blockRecord refuses measure_type = nomination outright");

// ── Guard 3 · tariffs_authority ───────────────────────────────────────────────
// Support-filed stances under this key mean opposite things, so the one measure
// mapping reads backwards for one of them.
for (const want of ["contradicts", "consistent"]) {
  ok(!eligible("tariffs_authority", want), `guard 3: no tariffs_authority ${want} card is eligible`);
}
has(RC.guards.blockIssue("anyone", "tariffs_authority", "any stance"), "opposite meanings",
  "guard 3: the reason names the incoherent semantics");
ok(RC.guards.blockedIssueKeys.tariffs_authority, "guard 3: tariffs_authority is on the blocked-key list");

// ── Guard 4 · america_first_fp resting on a restraint position ────────────────
ok(!eligible("america_first_fp", "contradicts"), "guard 4: restraint-framed afp contradiction is not eligible");
ok(!eligible("america_first_fp", "consistent"), "guard 4: restraint-framed afp consistency is not eligible");
has(RC.guards.blockIssue("someone_else", "america_first_fp", "No more endless wars in the region."),
  "restraint", "guard 4: restraint-framed stance text blocks the key for any pid");
for (const pid of ["aoc", "khanna", "tlaib", "jayapal", "lee"]) {
  has(RC.guards.blockIssue(pid, "america_first_fp", "America First means our allies pay their share."),
    "re-filed under `restraint`", `guard 4: ${pid} is held on america_first_fp pending the re-file`);
}
// The same key is NOT blocked for an America-First-framed stance from a pid that
// is not on the hold list — the guard is scoped to the defect, not to the issue.
eq(RC.guards.blockIssue("other_rep", "america_first_fp", "America First means our allies pay their share."), "",
  "guard 4: an America-First-framed stance from an unaffected pid is not blocked");
// `restraint` itself is shippable — the fix this guard is waiting on is available.
eq(RC.guards.blockIssue("aoc", "restraint", "Congress never authorised this deployment."), "",
  "guard 4: the `restraint` key the stances should be re-filed under is itself shippable");
// The MEASURE side of the same defect: four of the measures mapped to
// america_first_fp are ALSO mapped to `restraint` (the Iran / Lebanon / Ukraine
// war-powers measures), so a card citing one rests on a restraint position no
// matter which way the member voted or how their stance is framed.
const DUAL = {
  kind: "vote", measureType: "resolution", number: "S.J.Res. 59", title: "Iran war powers resolution",
  action: "On Passage of the Joint Resolution", position: "nay", date: "2025-06-27", isProcedural: false,
  source: SRC("https://www.congress.gov/bill/119th-congress/senate-joint-resolution/59"),
  issues: [
    { issueKey: "america_first_fp", weight: 70, isPrimary: false, supportMeaning: "yea_supports" },
    { issueKey: "restraint", weight: 100, isPrimary: true, supportMeaning: "yea_supports" },
  ],
};
has(RC.guards.blockIssue("some_rep", "america_first_fp", "America First means our allies pay their share.", DUAL),
  "curated as both america_first_fp and `restraint`",
  "guard 4: a vote curated as both keys cannot carry an America-First card");
eq(RC.guards.blockIssue("some_rep", "restraint", "Congress must authorise this.", DUAL), "",
  "guard 4: the same dual-mapped vote CAN carry a `restraint` card — that is the key it belongs to");
// A single-key america_first_fp measure is unaffected: the guard is scoped to the
// conflation, not to the issue.
eq(RC.guards.blockIssue("some_rep", "america_first_fp", "America First means our allies pay their share.", {
  issues: [{ issueKey: "america_first_fp", weight: 70, supportMeaning: "yea_supports" }],
}), "", "guard 4: an america_first_fp-only measure is not blocked by the conflation guard");

// ── Guards 5–8 · what a citable record must carry ─────────────────────────────
const GOOD = { kind: "vote", measureType: "bill", number: "H.R. 1", title: "A Real Bill",
  action: "On Passage", position: "yea", date: "2025-07-03", isProcedural: false,
  source: SRC("https://www.congress.gov/bill/119th-congress/house-bill/1") };
eq(RC.guards.blockRecord(GOOD), "", "guard 5-8: a complete, substantive, sourced vote passes");
// A `position` row whose action type is not one of the formal instruments this
// file knows how to name is refused: there is nothing honest to call it, and
// "voted" is the one thing it certainly is not.
has(RC.guards.blockRecord({ ...GOOD, kind: "position" }),
  "not a formal-record instrument with an honest label",
  "guard 5: a record row whose act this file cannot name is refused");
// The instruments it CAN name travel. Direction is read off `supports`, because
// a signature, a veto or a cosponsorship has no yea/nay to read.
const COSPONSOR = { kind: "position", actionType: "cosponsor", action: "cosponsor",
  position: "cosponsor", number: "S. 331",
  title: "Halt All Lethal Trafficking of Fentanyl Act", supports: true,
  date: "2025-01-30", isProcedural: false,
  source: SRC("https://www.congress.gov/bill/119th-congress/senate-bill/331") };
eq(RC.guards.blockRecord(COSPONSOR), "",
  "guard 5: a sourced, dated, directional cosponsorship is a citable formal instrument");
has(RC.guards.blockRecord({ ...COSPONSOR, supports: null }), "which way this act cut",
  "guard 5: an act whose direction the record does not state has nothing to report");
has(RC.guards.blockRecord({ ...COSPONSOR, number: "" }), "nothing that names what was acted on",
  "guard 5: an act must name the measure it was taken on");
has(RC.guards.blockRecord({ ...COSPONSOR, source: null }), "no source URL",
  "guard 5: an act with no source is not checkable, exactly like a vote with none");
has(RC.guards.blockRecord({ ...GOOD, position: "present" }), "no directional vote",
  "guard 5: present / not-voting carries no direction to report");
has(RC.guards.blockRecord({ ...GOOD, isProcedural: true }), "procedural",
  "guard 6: a procedural question is refused — the nuance cannot travel with the image");
has(RC.guards.blockRecord({ ...GOOD, advanceInverted: true }), "procedural",
  "guard 6: an inverted-direction vote is refused for the same reason");
has(RC.guards.blockRecord({ ...GOOD, number: "" }), "no bill number", "guard 7: a card must cite a bill number");
has(RC.guards.blockRecord({ ...GOOD, action: "" }), "no recorded question", "guard 7: a card must cite the question");
has(RC.guards.blockRecord({ ...GOOD, date: "" }), "no date", "guard 7: a card must carry a date");
has(RC.guards.blockRecord({ ...GOOD, source: null }), "no source URL", "guard 7: a card must carry a source URL");
has(RC.guards.blockRecord({ ...GOOD, source: { label: "Congress.gov" } }), "no source URL",
  "guard 7: a source with a label but no URL is not checkable");
has(RC.guards.blockRecord({ ...GOOD, title: "Roll call 310" }), "provisional",
  "guard 8: a provisional 'Roll call NNN' title names nothing a reader can look up");
eq(RC.guards.blockRecord(null), "no record", "guard 5-8: a missing record fails closed");
// End to end: the unsourced record on the second member yields no card at all.
eq(RC.find("thinrep"), null, "guard 7: a member whose only mapped vote has no source URL gets no card");
has(reasonFor2(RC.audit("thinrep"), "climate_action", "contradicts"), "no source URL",
  "guard 7: the audit reports the missing source URL as the reason");
function reasonFor2(rows, issueKey, want) {
  const r = rows.find((a) => a.issueKey === issueKey && a.want === want);
  return r ? r.reason : "(no such candidate)";
}

// ── Guard 10 · a circular receipt ─────────────────────────────────────────────
// A "they said" that is itself a vote makes both halves of the card the same
// fact, and quietly moves a legislative action onto the Say-vs-Do side.
ok(!eligible("border_security", "contradicts") && !eligible("border_security", "consistent"),
  "guard 10: a vote-derived stated position yields no card");
has(RC.guards.blockStance("Voted against an amendment (H.Amdt. 252) to strip the funding."), "circular",
  "guard 10: a stance written as a vote is refused");
has(RC.guards.blockStance("Cosponsored S. 5 to expand the credit."), "circular",
  "guard 10: a stance written as a co-sponsorship is refused");
has(RC.guards.blockStance("Backs H.R. 1 as written."), "circular",
  "guard 10: a stance that cites a measure number is refused");
eq(RC.guards.blockStance("Every bracket should keep more of what it earns."), "",
  "guard 10: an ordinary stated position passes");
has(RC.guards.blockStance(""), "no stated position", "guard 10: an empty stance fails closed");

// ── Guard 11 · duplicated measure identity ────────────────────────────────────
// The client-side backstop for the identity-merge migration.
ok(!eligible("lands_preserve", "consistent") && !eligible("lands_preserve", "contradicts"),
  "guard 11: an issue reached through two measure ids for one bill number yields no card");
const dupReason = reasonFor("lands_preserve", "consistent") + reasonFor("lands_preserve", "contradicts");
has(dupReason, "duplicate identity", "guard 11: the reason names the unmerged duplicate identity");
eq(RC.guards.blockDuplicateIdentity(RECORDS, "lower_taxes", "H.R. 1"), "",
  "guard 11: a bill with one identity row is not blocked");
eq(RC.guards.blockDuplicateIdentity(RECORDS, "lands_preserve", ""), "",
  "guard 11: a missing number is handled by the record guards, not this one");

// ── Guard 9 · verdict stability ───────────────────────────────────────────────
// A card must show the same verdict the profile it links to shows, computed over
// the WHOLE record. Otherwise anyone who follows the link is right to call the
// card wrong.
ok(!eligible("school_choice", "contradicts"),
  "guard 9: a local contradiction is refused when the net record does not say contradicts");
has(reasonFor("school_choice", "contradicts"), "net record verdict",
  "guard 9: the reason names the disagreement with the profile");
has(RC.guards.stableVerdict({ netVerdict: "mixed" }, "contradicts"), "net record verdict",
  "guard 9: a mixed net record refuses a contradiction card");
eq(RC.guards.stableVerdict({ netVerdict: "contradicts" }, "contradicts"), "",
  "guard 9: a matching net verdict passes");
has(RC.guards.stableVerdict(null, "consistent"), "no record summary",
  "guard 9: a missing summary fails closed");
// Every card that IS eligible agrees with its own net verdict, by construction.
for (const r of auditRows) {
  if (!r.eligible) continue;
  eq(r.netVerdict, r.want, `guard 9: eligible ${r.issueKey} card matches the net record verdict`);
}

// A member with no stated position on an issue cannot have a say-vs-do card at
// all — there is nothing for the vote to be measured against.
const noStanceRow = auditRows.find((a) => a.issueKey === "strong_defense");
if (noStanceRow) has(noStanceRow.reason, "no stated position",
  "guards: an unmapped-to-a-stance issue is refused for want of something to check");

// ══ 2. THE CARD CONTRACT ═════════════════════════════════════════════════════
// The profile's own proof helper, and the fixtures indexed by bill number, so a
// card's record line can be checked against the string the app already prints.
const P0 = ctx.window.PDXConsistency && ctx.window.PDXConsistency.proof;
const RECORD_BY_NUM = {};
for (const r of RECORDS) if (!RECORD_BY_NUM[r.number]) RECORD_BY_NUM[r.number] = r;

const contra = RC.contradiction("testrep");
ok(!!contra, "cards: a contradiction card is built from the pre-cleared set");
if (contra) {
  eq(contra.issueKey, "national_debt", "cards: the strongest eligible contradiction is the debt vote");
  eq(contra.verdict.key, "contradicts", "cards: verdict stamp is the contradiction stamp");
  eq(contra.verdict.cls, "v-contradicts", "cards: verdict class matches the existing renderer vocabulary");
  // politician name / office
  eq(contra.name, "Rep. Test Member", "cards: politician name comes from the roster");
  has(contra.sub, "U.S. House", "cards: office line is present");
  has(contra.sub, "TX-07", "cards: district is present");
  // issue
  eq(contra.issue.label, "National Debt", "cards: issue label is the ISSUE_MAP label, emoji split off");
  eq(contra.issue.icon, "💰", "cards: issue icon is split into its own field, as the renderer expects");
  // They said
  eq(contra.said.word, "Supports", "cards: the said line names the direction of the stated position");
  has(contra.said.text, "defining threat", "cards: the said line quotes the stated position verbatim");
  // The record shows: bill, question, position, date
  eq(contra.headline, "H.R. 1 · On Passage · Voted Yea",
    "cards: the record line is bill · question · position, in that order");
  eq(contra.date, "2025-07-03", "cards: the date is the ISO day, matchable against the Clerk's record");
  has(contra.facts, "One Big Beautiful Bill Act", "cards: the supporting line names the measure");
  has(contra.facts, "CBO scores the package", "cards: the curated rationale for the mapping is carried through");
  has(contra.facts, "Passed", "cards: the chamber outcome is carried through");
  // source URL + method link + mark. The stored source is a congress.gov BILL
  // page — it does not show the vote — so what the card prints is the derived
  // canonical roll-call page, and the stored URL is kept only for the audit.
  eq(contra.source.url, "https://clerk.house.gov/Votes/2025190",
    "cards: the cited URL is the chamber's own roll-call page, derived, not the stored source");
  eq(contra.sourceStored, "https://www.congress.gov/bill/119th-congress/house-bill/1?q=1",
    "cards: the URL the ingest recorded is retained so the derivation is auditable");
  eq(contra.verifyUrl, "clerk.house.gov/Votes/2025190",
    "cards: the printed URL drops only the scheme, so it can be typed by hand");
  has(contra.method, "#methodology", "cards: a method link is on the card itself, not only in the app");
  eq(contra.origin, "official_record", "cards: the card declares which system produced its verdict");
  // one claim per card
  eq(contra.measureNumber, "H.R. 1", "cards: exactly one measure is cited");
  // Nothing invented: every claim on the card traces to the input.
  const inputText = JSON.stringify(RECORDS[0]) + JSON.stringify(ctx.ISSUE_STANCE_DATA.testrep);
  ok(inputText.includes(contra.said.text), "honesty: the said line is quoted, not paraphrased");
  lacks(contra.headline, "H.R. 22", "honesty: no other bill leaks into the record line");
  lacks(JSON.stringify(contra), "PN 100", "honesty: the excluded nomination appears nowhere on the card");
}

const consist = RC.consistency("testrep");
ok(!!consist, "cards: a consistency card is built from the pre-cleared set");
if (consist) {
  eq(consist.verdict.key, "consistent", "cards: verdict stamp is the consistency stamp");
  eq(consist.impact, "positive", "cards: a consistency card reads 'AND the record shows'");
  // Ranking is by mapping weight, verdict margin and recency — not by which
  // verdict is more provocative. The strongest consistency here is the one the
  // engine scores highest, whatever bill that lands on; what must hold is that it
  // is a real, fully-cited vote.
  ok(/^(H|S)[.\w ]*\.? ?\d+ · .+ · Voted (Yea|Nay)$/.test(consist.headline),
    `cards: a consistency card cites bill · question · position (got ${JSON.stringify(consist.headline)})`);
  eq(consist.headline, P0 ? P0.proofText(RECORD_BY_NUM[consist.measureNumber]) : consist.headline,
    "cards: same proof format on a consistency card");
  has(consist.method, "#methodology", "cards: method stays visible on a consistency card too");
  eq(consist.origin, "official_record", "cards: consistency cards declare their system too");
}
// The H.R. 1 consistency side specifically: the SAME vote that contradicts the
// debt stance backs the tax stance. Both cards must exist, independently.
const taxCard = RC.find("testrep", "lower_taxes");
ok(!!taxCard, "cards: the tax side of the same omnibus vote is its own eligible card");
if (taxCard) {
  eq(taxCard.verdict.key, "consistent", "cards: the tax side of H.R. 1 reads as consistent");
  eq(taxCard.headline, "H.R. 1 · On Passage · Voted Yea", "cards: the tax card cites the same one vote");
  has(taxCard.facts, "Extends and expands",
    "cards: the tax mapping's own curated rationale is carried through");
  ok(contra && contra.measureNumber === taxCard.measureNumber,
    "cards: one vote can yield two cards on two issues — that is the mapping, not a contradiction in the data");
}
eq(contra && contra.impact, "negative", "cards: a contradiction card reads 'BUT the record shows'");

// One card per (member, issue) — a member never gets two cards arguing.
const all = RC.cardsFor("testrep");
const keys = all.map((c) => c.issueKey);
eq(keys.length, new Set(keys).size, "cards: at most one card per member-issue");
ok(all.length >= 2, "cards: the pre-cleared set yields at least a contradiction and a consistency");
// Strongest first.
for (let i = 1; i < all.length; i++) {
  ok(all[i - 1].score >= all[i].score, "cards: cards are ordered strongest first");
}
// find() honours an issue key, for deep links.
eq(RC.find("testrep", "national_debt").issueKey, "national_debt", "cards: find() resolves one issue");
eq(RC.find("testrep", "tariffs_authority"), null, "cards: find() on a blocked key returns nothing");
eq(RC.find("nobody_here"), null, "cards: an unknown member yields no card rather than throwing");

// The proof line is the SAME string the profile's Official Record row prints, so
// the card and the page can never disagree about what the record says.
if (P0 && contra) {
  eq(contra.headline, P0.proofText(RECORDS[0]),
    "cards: the card's record line is the profile's own proof text, not a second phrasing");
}
// The one documented divergence: a question that repeats its own measure number
// reads as a stutter once the number is already the first field, so the card
// collapses the repeat. Nothing but the duplicated number is removed.
eq(RC.proofLine({ kind: "vote", number: "H.J.Res. 88", action: "On the Joint Resolution H.J.Res. 88",
  position: "yea" }), "H.J.Res. 88 · On the Joint Resolution · Voted Yea",
  "cards: a question that repeats the bill number is collapsed on the card");
eq(RC.proofLine({ kind: "vote", number: "H.R. 1", action: "On Passage", position: "yea" }),
  "H.R. 1 · On Passage · Voted Yea",
  "cards: an ordinary question is left exactly as the Clerk recorded it");
// The number must survive even if the question is nothing BUT the number.
has(RC.proofLine({ kind: "vote", number: "H.R. 1", action: "H.R. 1", position: "nay" }), "H.R. 1",
  "cards: collapsing never empties the record line");

// ══ 3. THE OMNIBUS SPLIT CARD ════════════════════════════════════════════════
const omni = RC.omnibus("testrep", "H.R. 1");
ok(!!omni, "omnibus: the H.R. 1 split card is built");
if (omni) {
  eq(omni.verdict.key, "omnibus", "omnibus: the stamp names the split, not a severity");
  eq(omni.verdict.cls, "v-omnibus", "omnibus: the class has a CSS rule to match");
  eq(omni.split.count, 5, "omnibus: the disclosed count is the real mapped count");
  ok(omni.split.advances.length > 0 && omni.split.opposes.length > 0,
    "omnibus: both directions are named — that IS the card");
  has(omni.split.advances.join(" · "), "Lower Taxes", "omnibus: names an issue the vote advanced");
  has(omni.split.opposes.join(" · "), "National Debt", "omnibus: names an issue the same vote cut against");
  has(omni.split.opposes.join(" · "), "Health Care", "omnibus: names every opposed issue in the mapping");
  // The say-vs-do verdict is preserved for anything reading the card in code.
  ok(omni.saydoVerdict && ["contradicts", "consistent"].includes(omni.saydoVerdict.key),
    "omnibus: the underlying say-vs-do verdict is preserved on the card");
  eq(omni.headline, "H.R. 1 · On Passage · Voted Yea", "omnibus: still cites exactly one vote");
  has(omni.method, "#methodology", "omnibus: method stays visible");
  // Nothing invented: every label in the split is an issue this bill is mapped to.
  const mapped = RECORDS[0].issues.map((i) => ctx.window.ISSUE_MAP[i.issueKey].label.replace(/^\S+\s/, ""));
  for (const label of omni.split.advances.concat(omni.split.opposes)) {
    ok(mapped.includes(label), `honesty: split label '${label}' comes from this bill's own mapping`);
  }
  // The excluded keys cannot appear even as split context.
  lacks(JSON.stringify(omni.split), "Tariff", "honesty: a blocked key never appears in the split");
}
// A single-issue vote is not an omnibus and gets no split card.
eq(RC.splitFor(RECORDS[6], "lands_preserve"), null, "omnibus: a single-issue vote has no split to disclose");
// A package that pushes every issue the same way is not a split either.
eq(RC.splitFor({
  kind: "vote", position: "yea",
  issues: [
    { issueKey: "lower_taxes", weight: 100, supportMeaning: "yea_supports" },
    { issueKey: "border_security", weight: 80, supportMeaning: "yea_supports" },
  ],
}, "lower_taxes"), null, "omnibus: a one-direction package is an ordinary vote, not a split");
// Asking for a bill that is not eligible yields nothing rather than a near-miss.
eq(RC.omnibus("testrep", "PN 100"), null, "omnibus: a nomination cannot become a split card");

// ══ 4. THE EDITORIAL BOUNDARY ════════════════════════════════════════════════
// Official Record verdicts must not reach a Say-vs-Do score. The chokepoint is
// PDXReceipts.collect(), which drops category 'voting'; this feed never writes to
// it. Building every card must leave the curated feed exactly as it was.
const R = ctx.window.PDXReceipts;
ok(!!R, "boundary: PDXReceipts (the curated feed) is loaded alongside");
if (R) {
  const before = R.collect().length;
  RC.cardsFor("testrep"); RC.omnibus("testrep", "H.R. 1"); RC.contradiction("testrep");
  eq(R.collect().length, before, "boundary: building vote-derived cards adds nothing to the Say-vs-Do feed");
  for (const rec of R.collect()) {
    ok(rec.origin !== "official_record", "boundary: no Official Record card is inside the curated feed");
  }
  // A card's deep link lands on the Official Record gap view, NOT the Say-vs-Do
  // receipt lightbox — a legislative action must not open on a Say-vs-Do surface.
  if (contra) {
    eq(contra.hash, "#record=testrep~national_debt", "boundary: a card links to the Official Record view");
    const link = R.linkFor(contra, "", { canonical: true });
    has(link, "#record=testrep~national_debt", "boundary: the shared link carries the record hash");
    lacks(link, "#receipt=", "boundary: the shared link never resolves to the Say-vs-Do lightbox");
    has(link, "politidex.fyi", "boundary: a shared link is canonical, so it works off-device");
    // The curated feed's own links are untouched.
    has(R.linkFor("testrep", "national_debt", { canonical: true }), "#receipt=",
      "boundary: curated receipts still use the #receipt= hash");
  }
}
// The one-tap share path is the existing pipeline, not a second one.
eq(typeof RC.share, "function", "share: PDXReceiptCards.share exists");
ok(RC.share.length <= 2, "share: share(card|pid, btn) keeps the existing one-tap signature");

// ══ 5. SOURCE-LEVEL CONTRACTS ════════════════════════════════════════════════
// The additive renderer changes: three optional fields say-vs-do.js must read, and
// the collect() boundary line that must stay.
const svd = readFileSync(join(ROOT, "say-vs-do.js"), "utf8");
for (const bit of ["r.verifyUrl", "r.method", "r.split", "r.hash", "omnibus:"]) {
  has(svd, bit, `renderer: say-vs-do.js reads ${bit}`);
}
has(svd, "'voting'", "renderer: the collect() boundary that drops legislative items is still there");
const css = readFileSync(join(ROOT, "say-vs-do.css"), "utf8");
has(css, ".svd-receipt.v-omnibus", "renderer: the omnibus verdict class has a CSS rule");
const html = readFileSync(join(ROOT, "index.html"), "utf8");
has(html, 'src="receipt-cards.js"', "wiring: index.html loads receipt-cards.js");
ok(html.indexOf('src="receipt-cards.js"') > html.indexOf('src="consistency.js"'),
  "wiring: receipt-cards.js loads after the modules it reads");
// The hooks this module depends on, so a rename fails loudly here rather than
// silently emptying the feed.
const rc = readFileSync(join(ROOT, "receipt-cards.js"), "utf8");
for (const hook of ["_issueRecordSummary", "_measureComponentBreakdown", "memberRecords", "PDXReceipts.share"]) {
  has(rc, hook, `hook: receipt-cards.js still reads ${hook}`);
}
// The curated spotlight data may be NAMED in this file's prose (it explains the
// boundary), but it must never be READ: a vote-derived card that reached into
// ACCT_SPOTLIGHT would be mixing the two systems at the source.
const rcCode = rc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
lacks(rcCode, "ACCT_SPOTLIGHT", "boundary: the vote-derived feed never reads the curated spotlight data");
lacks(rcCode, "PDXReceipts.collect", "boundary: the vote-derived feed never writes into the curated feed");

// ══ 6. THE SHARE AFFORDANCE ══════════════════════════════════════════════════
// A host surface cannot know at render time whether a card exists — the record
// arrives async. So the button is rendered CLOSED (hidden + pending) and
// hydrate() either reveals it or deletes it. That default state is the whole
// contract: an unhydratable button is invisible, so a share is never offered
// that the guards would refuse to honour.

const btnHtml = RC.buttonHtml({ pid: "testrep", issueKey: "national_debt" });
has(btnHtml, "hidden", "affordance: a freshly rendered share button starts hidden");
has(btnHtml, 'data-pdxrc-pending="1"', "affordance: a freshly rendered button is marked pending");
has(btnHtml, 'data-pid="testrep"', "affordance: the button carries the member it will resolve");
has(btnHtml, 'data-issue="national_debt"', "affordance: the button carries the issue it will resolve");
has(btnHtml, 'type="button"', "affordance: the control is a button, not a bare link");
has(btnHtml, "aria-label", "affordance: the control is labelled for screen readers");
eq(RC.buttonHtml({}), "", "affordance: no member means no button at all");
eq(RC.buttonHtml(), "", "affordance: buttonHtml() with no options returns nothing rather than throwing");
has(RC.buttonHtml({ pid: "testrep", issueKey: "x", block: true }), "pdxrc-block",
  "affordance: block:true asks for the full-width mobile variant");
has(RC.buttonHtml({ pid: "testrep", measure: "H.R. 1", stopKeys: true }), "stopPropagation",
  "affordance: stopKeys:true keeps key events out of an enclosing role=button card");
has(RC.buttonHtml({ pid: 'a"b', issueKey: "<x>" }), "&quot;",
  "affordance: attribute values are escaped before they reach the DOM");
lacks(RC.buttonHtml({ pid: "testrep", issueKey: "<x>" }), "<x>",
  "affordance: an issue key cannot inject markup");

// A DOM small enough to read and complete enough to exercise reveal-vs-delete.
const fakeBtn = (attrs) => {
  const b = {
    attrs: attrs, removed: false, classes: [], innerHTML: "", props: {},
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    setAttribute: (k, v) => { b.props[k] = v; },
    removeAttribute: (k) => { delete attrs[k]; },
    classList: { add: (c) => b.classes.push(c) },
  };
  b.parentNode = { removeChild: (n) => { n.removed = true; n.parentNode = null; } };
  return b;
};
// hydrate() selects `.pdxrc-share-btn[data-pdxrc-pending]`, so the stub root has
// to honour the pending filter — that filter is what makes a second pass free.
const fakeRoot = (btns) => ({
  querySelectorAll: () => btns.filter((b) => b.getAttribute("data-pdxrc-pending") != null),
});

const goodBtn = fakeBtn({ "data-pid": "testrep", "data-issue": "national_debt", "data-pdxrc-pending": "1" });
const blockedBtn = fakeBtn({ "data-pid": "testrep", "data-issue": "tariffs_authority", "data-pdxrc-pending": "1" });
const omniBtn = fakeBtn({ "data-pid": "testrep", "data-measure": "H.R. 1", "data-pdxrc-pending": "1" });
const pidlessBtn = fakeBtn({ "data-pdxrc-pending": "1" });
const unknownBtn = fakeBtn({ "data-pid": "nobody_here", "data-issue": "healthcare", "data-pdxrc-pending": "1" });
const splitBtn = fakeBtn({ "data-pid": "splitrep", "data-issue": "national_debt", "data-pdxrc-pending": "1" });

const shown = await RC.hydrate(fakeRoot([goodBtn, blockedBtn, omniBtn, pidlessBtn, unknownBtn, splitBtn]));

eq(shown, 3, "hydrate: exactly the three resolvable buttons were revealed");
eq(goodBtn.removed, false, "hydrate: an eligible issue card keeps its share button");
eq(goodBtn.attrs["data-pdxrc-pending"], undefined, "hydrate: a revealed button is no longer pending");
eq(goodBtn.attrs.hidden, undefined, "hydrate: a revealed button is no longer hidden");
has(goodBtn.innerHTML, "Share this vote", "hydrate: a revealed issue button says what it shares");
ok(goodBtn.classes.some((c) => /^pdxrc-v-/.test(c)),
  "hydrate: a revealed button carries the verdict accent it will print");
has(goodBtn.props.title || "", "National Debt",
  "hydrate: the tooltip names the issue the card is about");
has(goodBtn.props.title || "", "source URL",
  "hydrate: the tooltip tells the reader what the image will contain before they send it");
eq(blockedBtn.removed, true, "hydrate: FAIL CLOSED — a blocked issue key loses its share button entirely");
eq(unknownBtn.removed, true, "hydrate: FAIL CLOSED — an unknown member loses its share button entirely");
eq(pidlessBtn.removed, true, "hydrate: a button with no member is removed rather than left hidden forever");
eq(omniBtn.removed, false, "hydrate: the H.R. 1 omnibus split card keeps its share button");
has(omniBtn.innerHTML, "split vote", "hydrate: the omnibus button says it is a split vote, not a single verdict");
eq(splitBtn.removed, false, "hydrate: a split-record row keeps its share button");
has(splitBtn.innerHTML, "split record",
  "hydrate: and the button says it shares a split record, not a single-side verdict");
ok(splitBtn.classes.indexOf("pdxrc-v-mixed") > -1,
  "hydrate: with the mixed verdict accent, so the control matches the card it sends");
has(splitBtn.props.title || "", "S. 82 & S. 1024",
  "hydrate: the tooltip names BOTH bills, because both of them are the evidence");

// Every verdict this module can stamp on a button needs an accent rule to stamp
// it with, or the newest card ships with an uncoloured control.
{
  const svdCss = readFileSync(join(ROOT, "say-vs-do.css"), "utf8");
  for (const key of Object.keys(RC.VERDICTS)) {
    has(svdCss, ".pdxrc-" + RC.VERDICTS[key].cls,
      `affordance: the ${key} verdict has a button accent in say-vs-do.css`);
  }
}

// Second pass must be a no-op: nothing is left pending, so nothing is touched.
const again = await RC.hydrate(fakeRoot([goodBtn, omniBtn]));
eq(again, 0, "hydrate: re-running over already-revealed buttons reveals nothing new");

// The reveal path and the click path must resolve the SAME card, or a button can
// promise one thing and share another.
ok((rc.match(/cardForButton\(/g) || []).length >= 3,
  "affordance: reveal and click both resolve through the one cardForButton()");

// ── Mount points: each surface renders the slot through the shared API ────────
const hr1 = readFileSync(join(ROOT, "hr1-showcase.js"), "utf8");
has(hr1, "RC.buttonHtml(", "mount: the H.R. 1 showcase asks receipt-cards.js for the control");
has(hr1, "measure: HR1_SHARE_NUMBER", "mount: the showcase share button is scoped to the H.R. 1 split card");
has(hr1, "stopKeys: true", "mount: the showcase button shields the card's own key handler");
has(hr1, "RC.hydrate(", "mount: the showcase hydrates after it mounts");
has(hr1, "hr1-rc-foot", "mount: the showcase share control lives in the receipt-card footer");
lacks(hr1.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""), "isProcedural",
  "mount: the showcase does not re-implement a guard of its own");

const consSrc = readFileSync(join(ROOT, "consistency.js"), "utf8");
has(consSrc, "pdxor-share", "mount: the profile record/stance row has a share slot");
has(consSrc, "pdxgap-share", "mount: the Official Record gap view has a share slot");
has(consSrc, "_rcShareHtml", "mount: both consistency slots render through one helper");
has(consSrc, "PDXReceiptCards", "mount: consistency.js reads the share API rather than building cards");
ok((consSrc.match(/_rcHydrateSoon\(\)/g) || []).length >= 3,
  "mount: consistency.js hydrates on first render, on gap open and on record warm");

// The gap view is two columns — 🏛️ Official Record and 🧾 Say-vs-Do. The share
// control belongs to the record side only; a share button on the curated side
// would blend the two feeds the editorial model keeps apart.
const gapFn = consSrc.slice(consSrc.indexOf("function _gapViewHtml"));
const gapBody = gapFn.slice(0, gapFn.indexOf("\n  function ", 10));
ok(gapBody.indexOf("pdxgap-share") > -1, "mount: the gap share slot is inside _gapViewHtml");
ok(gapBody.indexOf("pdxgap-share") > gapBody.indexOf("offBody"),
  "boundary: the gap share button sits on the Official Record side of the split");

// ── The method link has to land somewhere ─────────────────────────────────────
has(rc, "#methodolog", "method: receipt-cards.js routes the link its own cards print");
has(rc, "openMethodology('cards')", "method: the card's method link opens the share-card rules");
has(consSrc, "function openMethodology", "method: consistency.js owns the methodology sheet");
has(consSrc, 'data-pdxm-row=', "method: methodology rows are addressable so a link can focus one");
has(consSrc, 'pdxm-row-focus', "method: the focused row is marked when arrived at from a card");

// ── The methodology copy must actually state the five rules ──────────────────
// Asserted on the PLAIN-LANGUAGE wording, not on field names: the whole point of
// the section is that a reader who never opens the schema can still check us.
const mIdx = consSrc.indexOf("Cards you can share");
ok(mIdx > -1, "method: the share-card methodology section exists");
const mSection = consSrc.slice(mIdx, consSrc.indexOf("'cards')", mIdx) + 8);
ok(mSection.length > 800 && mSection.length < 5000,
  "method: the share-card section is one bounded row, not the whole sheet");
for (const [what, pattern] of [
  ["the measure→issue mapping and that a person recorded why", /recorded why|rationale/i],
  ["that mappings are never inferred from a bill's text", /never infer/i],
  ["which way a Yes points (supportMeaning)", /supports the issue or opposes it/i],
  ["procedural and inverted questions", /procedural/i],
  ["the primary-issue judgment", /primarily/i],
  ["one card, one issue", /one card, one issue/i],
  ["the source URL requirement", /source URL/i],
  ["the method link back", /link back to this page/i],
]) {
  ok(pattern.test(mSection), `method copy: covers ${what}`);
}
lacks(mSection, "Republican", "method copy: no party characterization");
lacks(mSection, "Democrat", "method copy: no party characterization");

// ── Share text: one standard shape, and it must not mislabel the feed ─────────
// The caption is the half of a share that arrives as TEXT — pasted into a
// message, quoted above a link, read aloud by a screen reader while the image is
// still loading. It has to stand on its own, and it has to be the SAME shape
// whichever verdict was reached: a caption whose wording shifts with the finding
// is a caption doing rhetoric.
//
// Asserted on output. Grepping this module for the strings that build the
// caption only ever proved that some branch mentions them.
has(svd, "origin === 'official_record'", "share text: the caption branches on which feed the card came from");
has(svd, "isRecordCard", "share text: one predicate decides, not a scattered check");
{
  const cards = RC.cardsFor("testrep");
  const byVerdict = (k) => cards.find((c) => c.verdict.key === k);
  const contra = byVerdict("contradicts");
  const consis = byVerdict("consistent");
  const omni = RC.omnibus("testrep", "H.R. 1");
  ok(contra && consis && omni,
    "share text: the fixture reaches all three record verdicts, so the shape is compared across them");

  // The invariant skeleton. Every line here must appear on a contradiction, a
  // consistency and a split card alike — including the two that make the claim
  // checkable at all, the source URL and the path back to this same receipt.
  const SKELETON = [
    "🏛️ OFFICIAL RECORD — ",
    "\nVerdict: ",
    "\nTheir stated position: ",
    "\nThe record: ",
    "\nSource: ",
    "\nHow this is judged: politidex.fyi/#methodology",
    "\nCheck it yourself: https://politidex.fyi/#record=",
  ];
  for (const [label, card] of [["contradiction", contra], ["consistency", consis], ["omnibus", omni]]) {
    const cap = R._caption(card);
    for (const part of SKELETON) {
      has(cap, part, `share text: the ${label} caption carries "${part.trim()}"`);
    }
    has(cap, card.issue.label,
      `share text: the ${label} caption names the ISSUE — a quoted position and a bill number alone say nothing about what the pair is about`);
    has(cap, card.source.url,
      `share text: the ${label} caption carries the FULL source URL, scheme and all, so it is clickable from a paste`);
    has(cap, card.saidNote,
      `share text: the ${label} caption repeats the undated disclosure the image prints`);
    has(cap, card.verdict.label,
      `share text: the ${label} caption states the verdict in the same words the stamp does`);
    // The verdict is reached by comparing a recorded STANCE against a vote, and
    // the image prints that stance word ahead of the quote. A caption that
    // printed only the quote made the same claim with its subject removed — a
    // reader could not see what the vote was being held against.
    ok(!card.said.word || cap.indexOf("Their stated position: " + card.said.word + " — “") > -1,
      `share text: the ${label} caption carries the stance word the verdict is computed against, as the image does`);
    // The old caption swapped "Record:" for "But the record:" on a negative
    // finding — and on a split card inherited that choice from the say-vs-do
    // verdict underneath it, so the wording moved for a reason no reader could
    // see. Nothing about the vote changes with the verdict, so neither does the
    // line reporting it.
    lacks(cap, "But the record",
      `share text: the ${label} caption reports the vote in the same words regardless of the finding`);
    ok(cap.indexOf("🏛️ OFFICIAL RECORD") === 0,
      `share text: the ${label} caption opens with the origin badge, so a truncating platform cannot hide which feed it came from`);
    has(cap.split("\n")[0], card.name,
      `share text: the ${label} caption's first line — the one that survives truncation — names the member`);
  }

  // A split card's whole point is WHICH issues moved which way. The old caption
  // gave only counts, which is the one thing a reader cannot check.
  const om = R._caption(omni);
  has(om, "The same vote moved 5 mapped issues",
    "share text: the split caption says how many issues the one vote moved");
  for (const name of omni.split.advances.concat(omni.split.opposes)) {
    has(om, name, `share text: the split caption names ${name} rather than counting it`);
  }
  has(om, "Advances: " + omni.split.advances.join(", "),
    "share text: and says which way each group went, read off the stored mapping");
  has(om, "Opposes: " + omni.split.opposes.join(", "),
    "share text: one labelled line per side — fourteen names in a paragraph is not readable on a phone");
  // The list is the context; the focus issue is the claim. On H.R. 1 the split
  // runs to fourteen names and two of them read as synonyms on opposite sides,
  // so the caption states outright which side the card's own issue landed on.
  ok(["advances", "opposes"].includes(omni.split.focusEffect),
    "share text: the split knows which side the card's own issue came down on");
  has(om, "On " + omni.issue.label + " — the issue this card is about — the vote came down on the " +
    omni.split.focusEffect + " side.",
    "share text: and the caption says so, rather than leaving it to be found in the list");
  eq(omni.split[omni.split.focusEffect][0], omni.issue.label,
    "share text: the image's one-line row leads with that issue, so truncation cannot hide it");
  lacks(R._caption(contra), "the issue this card is about",
    "share text: an ordinary single-issue card has no split to locate, so it says nothing about sides");

  // The CRA effect sentence. Guard 13 refuses any disapproval card without one,
  // and the image prints it in its own tier — it must travel with the text too,
  // because "voted Yea on S.J.Res. 18" tells a reader nothing on its own. Built
  // here from a live card plus the fixture's own stored rationale: the two
  // disapproval records in this file exist to trip the duplicate-identity guard,
  // so no built card carries the slot, but the live Wave 1 set does.
  {
    const effect = "A yea removes the public-land management regulation.";
    const cra = Object.assign({}, contra, { factParts: [effect, "Some Measure Title", "House · Passed"] });
    has(R._caption(cra), "What a Yea did: " + effect,
      "share text: a disapproval caption spells out what a Yea actually did");
    lacks(R._caption(contra), "What a Yea did:",
      "share text: and an ordinary bill's caption does not, because there is no such sentence to quote");
  }

  // ── The other two fact tiers ────────────────────────────────────────────────
  // factParts[0] exists only on a disapproval vote, and on 192 of the 212 core
  // public cards it is empty. A caption that prints [0] and nothing else names a
  // bill number, a procedural question and a verdict — and never says what the
  // measure was about. [1] (the title) and [2] (the curated mapping rationale)
  // are already on the card, already sanitised, already sourced.
  {
    const cap = R._caption(contra);
    has(cap, "The measure: " + contra.factParts[1],
      "share text: an ordinary bill's caption names the measure, not only its number");
    has(cap, "Why it counts on " + contra.issue.label + ": " + contra.factParts[2],
      "share text: and gives the curated reason the vote counts on THIS issue, in plain English");
    // Different provenance, different label — the disapproval effect and the
    // mapping rationale are never merged under one heading.
    ok(cap.indexOf("What a Yea did:") === -1,
      "share text: the mapping rationale is not passed off as a statement of what a Yea did");
    const bare = Object.assign({}, contra, { factParts: ["", "", "", "House · Passed"] });
    const bareCap = R._caption(bare);
    lacks(bareCap, "The measure:",
      "share text: a card with no title says nothing rather than inventing one");
    lacks(bareCap, "Why it counts on",
      "share text: and a card with no curated rationale says nothing rather than guessing one");
  }

  // Quoted prose routinely contains its own quotation marks. Nesting them inside
  // the caption's curly pair reads as a typo, and a trim landing inside one leaves
  // it unbalanced.
  {
    const q = Object.assign({}, contra, {
      said: { word: "Supports", text: 'Says it is "so important" that we act, and calls it "urgent".' },
    });
    const cap = R._caption(q);
    has(cap, "“Says it is 'so important' that we act, and calls it 'urgent'.”",
      "share text: inner double quotes become singles so the outer pair stays unambiguous");
    eq((cap.match(/[“”]/g) || []).length, 2,
      "share text: exactly one curly pair in the stated-position line");
  }

  // A middle segment clipped to a stub — "H.J.Res. 89 · On the… · Voted Yea" — is
  // worse than no middle segment: it reads as a broken string rather than as an
  // abbreviation. Below a usable width the question is dropped outright.
  // A trim that lands on a function word promises a noun the reader never gets.
  // Both of these were real short-post output before the orphan drop.
  {
    const orphan = Object.assign({}, contra, {
      said: { text: "Founded the Conservative Climate Caucus to give Republicans a constructive seat at the climate table.", word: "Supports" },
    });
    const tw = R._tweetText(orphan);
    lacks(tw, "Republicans a…", "share text: a clipped line does not end on an article");
    lacks(tw, ", and…", "share text: nor on a dangling conjunction");
    has(tw, "Republicans", "share text: and the orphan drop takes the orphan, not the content");
  }

  {
    const t = R._trimHeadline("H.J.Res. 89 · On the Joint Resolution · Voted Yea", 34);
    ok(t.length <= 34, `share text: the stub-drop honours the budget (${t.length})`);
    lacks(t, "On the…", "share text: no clipped question stub survives the trim");
    has(t, "Voted Yea", "share text: and the vote is still there after the question is dropped");
  }

  // A stored title that OPENS with the measure number. "Voted Nay on H.Amdt. 232"
  // followed by a title that starts "H.Amdt. 232 (Boebert)…" says the number
  // twice; cutting the number off the title instead leaves "(Boebert) to H.R.
  // 8595 — …" dangling. Neither is acceptable, so the title becomes the object of
  // the sentence and the lead stops naming the measure separately.
  {
    const amdt = Object.assign({}, contra, {
      measureNumber: "H.Amdt. 232",
      headline: "H.Amdt. 232 · On Agreeing to the Amendment · Voted Nay",
      factParts: ["", "H.Amdt. 232 (Boebert) to H.R. 8595 — eliminate funding for the Fulbright Program", "", ""],
    });
    const tw = R._tweetText(amdt);
    has(tw, "Voted Nay on H.Amdt. 232 (Boebert)",
      "share text: a title that already names the measure is the object of the sentence");
    lacks(tw, "H.Amdt. 232 — H.Amdt. 232",
      "share text: the measure number is never printed twice");
    lacks(tw, "— (Boebert)",
      "share text: and stripping the number never leaves a sponsor parenthetical dangling");
    has(tw, "Fulbright",
      "share text: the Did budget reaches the part of the title that says what the vote did");
  }

  // The disapproval effect sentence describes THE MEASURE, not this member's
  // vote. Hung off an em dash after "Voted Nay on H.J.Res. 88" it reads as though
  // the nay did the rolling back — the exact opposite of the record. A full stop
  // keeps the two claims apart.
  {
    const nayCra = Object.assign({}, contra, {
      measureNumber: "H.J.Res. 88",
      headline: "H.J.Res. 88 · On Passage · Voted Nay",
      factParts: ["A yea rolls back a major state climate rule.",
        "Providing for congressional disapproval of the EPA waiver", "", ""],
    });
    const tw = R._tweetText(nayCra);
    has(tw, "Voted Nay on H.J.Res. 88. A yea rolls back",
      "share text: the effect sentence is a second sentence, not an apposition on the vote");
    lacks(tw, "Voted Nay on H.J.Res. 88 — A yea",
      "share text: a nay is never presented as having done what a yea does");
  }

  // The post. It is built from a REQUIRED LIST, not from whatever survives a
  // trim: marker, verdict, the stated position, what the vote did, the path back
  // to the judging, and the chamber's own record. The old build carried neither
  // the position nor the measure, which left "Says One Thing · Voted Another"
  // with both of its terms missing.
  // 440, not 280. The required list does not fit 280 on a Senate citation — the
  // two addresses alone cost ~157 there — and the builder is instructed to spend
  // the overrun on Said and Did rather than drop either. Measured across the 212
  // core public cards the posts run 308–434; the ceiling is the guard that the
  // overrun stays BOUNDED, not that it stays inside a platform limit.
  const POST_CEILING = 440;
  for (const [label, card] of [["contradiction", contra], ["omnibus", omni]]) {
    const long = Object.assign({}, card, { headline: card.headline + " — " + "a very long question line".repeat(12) });
    const tw = R._tweetText(long);
    has(tw, card.source.url,
      `share text: a ${label} post keeps its source URL even when the headline is far too long`);
    ok(tw.endsWith(card.source.url),
      `share text: and keeps it whole and last, where a client will linkify it`);
    has(tw, "\nCheck: https://politidex.fyi/#record=",
      `share text: a ${label} post also carries the path back to the receipt`);
    has(tw, "\nSource: ", `share text: and labels which of the two addresses is the government's own`);
    ok(tw.indexOf("#record=" + card.pid) > -1,
      `share text: pointed at THIS member's record, not at the homepage`);
    has(tw, "\nSaid: ", `share text: a ${label} post states the position the verdict is computed against`);
    has(tw, "\nDid: ", `share text: and says what the member actually did, in its own labelled line`);
    // 280 cannot hold the required list on a Senate citation. What IS bounded is
    // the overrun: only the two content floors grow, so the post has a ceiling.
    ok(tw.length <= POST_CEILING, `share text: the overrun stays bounded (${tw.length})`);
    ok(R._tweetText(card).indexOf("🏛️ OFFICIAL RECORD") === 0,
      `share text: a ${label} post is marked as Official Record, not as a curated receipt`);
  }
  // The long case: a Senate citation is ~86 characters of URL on its own. Neither
  // address gives way, and neither does the vote — "H.R. 1 · On Passage of the
  // Bill · Voted Yea" trimmed from the right loses "Voted Yea" first, which leaves
  // a post that states a verdict and then declines to say what the member did.
  {
    const senate = Object.assign({}, contra, {
      headline: "H.R. 1 · " + "On a Motion to Concur in a Very Long Question Line ".repeat(6) + "· Voted Yea",
      source: { label: "U.S. Senate", url: "https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00318.htm" },
    });
    const tw = R._tweetText(senate);
    ok(tw.endsWith(senate.source.url), "share text: a long Senate URL still survives whole");
    has(tw, "\nCheck: https://politidex.fyi/#record=", "share text: and so does the check path beside it");
    ok(tw.length <= POST_CEILING, `share text: on the longest citation shape in the ledger (${tw.length})`);
    has(tw, "Voted Yea", "share text: and so does the vote — the direction is never what gives way");
    has(tw, "H.R. 1", "share text: with the measure named, so the citation can be matched to it");
    lacks(tw, "On a Motion to Concur in a Very Long Question Line On a",
      "share text: and the procedural question — recoverable from either link — is what does");
  }
  // The middle-out trim, on its own.
  eq(R._trimHeadline("H.R. 1 · On Passage · Voted Yea", 200), "H.R. 1 · On Passage · Voted Yea",
    "share text: a headline that already fits is returned untouched");
  {
    const t = R._trimHeadline("H.R. 1 · On a Motion to Concur in the Senate Amendment to the Bill · Voted Nay", 46);
    ok(t.length <= 46, `share text: the trimmed headline honours the budget (${t.length})`);
    ok(t.startsWith("H.R. 1 · "), "share text: the measure number is reserved at the front");
    ok(t.endsWith("· Voted Nay"), "share text: and the vote is reserved at the back");
    ok(t.indexOf("Motion") > -1, "share text: what is left of the question still leads the middle");
  }
  eq(R._trimHeadline("Did another thing entirely, at length, in prose", 20).length <= 20, true,
    "share text: a headline with no vote segment falls through to the ordinary trim");

  // The boundary, from the other side: a curated Say-vs-Do receipt takes the
  // original path and must not pick up any of the record wording.
  const curated = {
    name: "Rep. Curated Example", verdict: { key: "contradicts", label: "Says One Thing · Voted Another" },
    said: { text: "A stated thing." }, headline: "Did another thing", impact: "negative",
    date: "2025-03-01", source: { label: "Deseret News", url: "https://example.org/story" },
  };
  const cc = R._caption(curated);
  ok(cc.indexOf("🧾 ") === 0, "share text: a curated receipt still opens with its own mark");
  lacks(cc, "OFFICIAL RECORD", "share text: and is never labelled Official Record");
  lacks(cc, "Their stated position:", "share text: it keeps its own past-tense framing");
  has(cc, "Said: ", "share text: which is the wording it always used");
  has(cc, "But the record: ", "share text: including the impact-keyed prefix, unchanged");
  has(cc, "Checked on PolitiDex · politidex.fyi",
    "share text: and its own closing line, unchanged");
  lacks(cc, "How this is judged:",
    "share text: the record feed's method line does not leak onto a curated receipt");
  ok(R._tweetText(curated).indexOf("🧾 ") === 0,
    "share text: the curated post is unchanged too");
}

// ── Wave 1 scope lock ────────────────────────────────────────────────────────
// The hold list held four umbrella keys until the August 2026 taxonomy split
// narrowed three of them until "Supports" meant one thing (gov_regulation,
// america_first_fp, states_federal_power). Those three are gone from the list
// BECAUSE the defect behind them was fixed upstream, in ISSUE_MAP and in the
// mapping table — not because the gate was loosened, which is what the
// blockedIssueKeys and blockIssue assertions below still pin.
ok(!!RC.guards.wave1HoldIssueKeys.checks_balances,
  "wave 1: checks_balances is held out of the public wave");
has(RC.guards.wave1HoldIssueKeys.checks_balances, "general institutional-posture",
  "wave 1: the hold states why, so lifting it is a decision and not a guess");
for (const lifted of ["gov_regulation", "america_first_fp", "states_federal_power"]) {
  ok(!RC.guards.wave1HoldIssueKeys[lifted],
    "wave 1: " + lifted + " was narrowed rather than held, so it is off the list");
}
ok(!RC.guards.blockedIssueKeys.checks_balances,
  "wave 1: the hold is its own gate, not a permanent block — the guards stay separable");
ok(!!RC.guards.blockedIssueKeys.tariffs_authority,
  "wave 1: tariffs_authority stays permanently blocked, not merely held");
has(RC.guards.wave1Hold("checks_balances"), "held",
  "wave 1: the hold is applied by its own gate, reachable independently of the guards");
eq(RC.guards.wave1Hold("lower_taxes"), "", "wave 1: the hold touches nothing outside its own key");
eq(RC.guards.blockIssue("someone_else", "america_first_fp", "America First means putting our own workers first.", null), "",
  "wave 1: lifting a hold did not turn guard 4 into a blanket block, or disarm it");
ok(!!RC.guards.blockIssue("someone_else", "america_first_fp", "No more endless wars in the region.", null),
  "wave 1: guard 4 still catches a restraint position filed under the aid key");

// ══ 7. CHECKABLE OFF-APP ═════════════════════════════════════════════════════
// The three things a skeptic with only the image needs: an address that opens
// the roll call, no claim about chronology the data cannot support, and — on a
// resolution that cancels something — a sentence saying what a Yea did.

// ── Part 1 · canonical citations ─────────────────────────────────────────────
const cc = RC.canonicalCitation;
const VOTE = (o) => ({ kind: "vote", chamber: "house", date: "2025-07-03", ...o });

// Derived from the explicit tuple, whatever the stored URL happens to be.
eq(cc(VOTE({ congress: 119, session: 1, rollNumber: 190, source: SRC("https://www.congress.gov/bill/119th-congress/house-bill/1") })).url,
  "https://clerk.house.gov/Votes/2025190", "citation: a House vote cites the Clerk's own vote page");
eq(cc(VOTE({ chamber: "senate", congress: 119, session: 1, rollNumber: 7, source: SRC("https://x.test/whatever") })).url,
  "https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00007.htm",
  "citation: a Senate vote cites the public LIS roll-call page, roll number padded to five");
eq(cc(VOTE({ chamber: "senate", congress: 118, session: 2, rollNumber: 456, source: SRC("https://x.test/1") })).url,
  "https://www.senate.gov/legislative/LIS/roll_call_votes/vote1182/vote_118_2_00456.htm",
  "citation: the LIS path is keyed on congress and session, not on the year");
// The Clerk keys on the calendar year of the vote, so the date drives the path.
eq(cc(VOTE({ date: "2024-11-12", congress: 118, session: 2, rollNumber: 456, source: SRC("https://x.test/1") })).url,
  "https://clerk.house.gov/Votes/2024456", "citation: the Clerk path uses the vote's calendar year, roll unpadded");

// Recovered from a URL that encodes the tuple, for a payload sent before the
// server carried the fields.
eq(cc(VOTE({ source: SRC("https://api.congress.gov/v3/house-vote/119/1/308"), date: "2025-12-02" })).url,
  "https://clerk.house.gov/Votes/2025308", "citation: the tuple is recovered from an api.congress.gov path");
eq(cc(VOTE({ source: SRC("https://www.govtrack.us/congress/votes/119-2025/h122"), date: "2025-05-08" })).url,
  "https://clerk.house.gov/Votes/2025122", "citation: the tuple is recovered from a GovTrack VOTE path");
// A GovTrack BILL page carries no roll call, so nothing may be derived from it.
eq(cc(VOTE({ source: SRC("https://www.govtrack.us/congress/bills/119/hr3838") })), null,
  "citation: a bill page is not a roll-call page — no address, no card");

// Already canonical → passed through byte for byte.
const passthru = "https://clerk.house.gov/Votes/2025190";
eq(cc(VOTE({ source: SRC(passthru) })).url, passthru, "citation: an already-canonical Clerk URL is not rewritten");
const lis = "https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00478.htm";
eq(cc(VOTE({ chamber: "senate", source: SRC(lis) })).url, lis, "citation: an already-canonical LIS URL is not rewritten");

// Fail closed — every one of these is a real shape in the ledger.
for (const [what, item] of [
  ["a bill's all-actions page with no roll number",
    VOTE({ chamber: "senate", source: SRC("https://www.congress.gov/bill/119th-congress/senate-joint-resolution/37/all-actions") })],
  ["a chamber's vote INDEX rather than a vote",
    VOTE({ chamber: "senate", source: SRC("https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_119_1.htm") })],
  ["a member's own press release",
    VOTE({ source: SRC("https://baumgartner.house.gov/media/press-releases/some-vote") })],
  ["no source at all", VOTE({ source: null })],
  ["a House vote with no date to key the Clerk path on",
    VOTE({ date: null, congress: 119, session: 1, rollNumber: 190, source: SRC("https://x.test/1") })],
  ["a chamber we do not have a public vote page for",
    VOTE({ chamber: "", congress: 119, session: 1, rollNumber: 12, source: SRC("https://x.test/1") })],
  ["a co-sponsorship, which has no roll call", { kind: "position", chamber: "house", source: SRC(passthru) }],
]) {
  eq(cc(item), null, `citation: fails closed on ${what}`);
  ok(!!RC.guards.blockCitation(item), `citation: guard 12 blocks ${what}`);
}
has(RC.guards.blockCitation(VOTE({ source: SRC("https://api.congress.gov/v3/house-vote/119") })), "api.congress.gov",
  "citation: guard 12 names the api endpoint when that is the reason, so the audit is actionable");
eq(RC.guards.blockCitation(VOTE({ source: SRC(passthru) })), "", "citation: guard 12 passes a derivable vote");

// Nothing an api endpoint or an ellipsis can reach the image through.
for (const card of RC.cardsFor("testrep").concat([RC.omnibus("testrep", "H.R. 1")]).filter(Boolean)) {
  const where = card.issueKey;
  lacks(card.verifyUrl, "api.congress.gov", `citation: no api endpoint is printed on the ${where} card`);
  lacks(card.verifyUrl, "…", `citation: the printed URL on the ${where} card is not elided`);
  ok(/^(clerk\.house\.gov|senate\.gov)\//.test(card.verifyUrl),
    `citation: the ${where} card prints a chamber roll-call page`);
  eq(card.verifyUrl, card.source.url.replace(/^https:\/\/(www\.)?/, ""),
    `citation: the printed address and the linked address on the ${where} card are the same page`);
  ok(card.source.label === "U.S. House Clerk" || /^U\.S\. (House Clerk|Senate) · roll call \d+$/.test(card.source.label),
    `citation: the ${where} card's source label names the chamber page it cites`);
}
// The renderer must not re-introduce a truncation layer under the guard.
const svdVerify = svd.slice(svd.indexOf("if (r.verifyUrl) {", svd.indexOf("function renderCanvas")));
const svdVerifyBlock = svdVerify.slice(0, svdVerify.indexOf("if (r.method)"));
lacks(svdVerifyBlock, "wrapText", "citation: the VERIFY line is not wrapped or ellipsized by the renderer");
has(svdVerifyBlock, "measureText", "citation: the VERIFY line is measured and shrunk to fit instead");

// ── Part 2 · chronology ──────────────────────────────────────────────────────
// Not one stance block in the corpus carries a date, so no card may imply order.
const dated = (RC.cardsFor("testrep")[0] || {});
eq(dated.saidLabel, "THEIR STATED POSITION", "chronology: the said block is labelled in the present tense");
has(dated.saidNote, "undated", "chronology: the card states on its face that the position is undated");
has(dated.saidNote, "does not claim it came before the vote",
  "chronology: the card disclaims the sequence rather than implying it");
lacks(JSON.stringify(dated.said), "date", "chronology: no date is attached to the stated position");
has(svd, "r.saidLabel || 'THEY SAID'", "chronology: the renderer honours the card's own said label");
has(svd, "if (r.saidNote)", "chronology: the renderer draws the undated disclosure on the image");
// The caption is asserted on its OUTPUT (Part 4b below); here, only that the
// two present-tense pieces reach it at all.
has(R._caption(dated), "Their stated position:",
  "chronology: the pasted caption uses the same present-tense framing");
has(R._caption(dated), dated.saidNote, "chronology: the pasted caption carries the disclosure too");
// A curated Say-vs-Do receipt sets neither field and is drawn exactly as before.
ok(svd.indexOf("r.saidLabel ||") > 0 && svd.indexOf("saidLabel:") < 0,
  "chronology: saidLabel is read by the renderer and set only by the vote-derived feed");

// ── Part 3 · what a Yea did ──────────────────────────────────────────────────
const CRA_TITLE = "Providing for congressional disapproval under chapter 8 of title 5, United States Code, of the rule submitted by the Internal Revenue Service relating to gross proceeds reporting by brokers";
ok(RC.isDisapproval({ title: CRA_TITLE }), "plain english: a CRA disapproval title is recognised");
ok(RC.isDisapproval({ title: "A joint resolution nullifying a rule on overdraft lending" }),
  "plain english: a nullification title is recognised");
ok(RC.isDisapproval({ title: "Terminating the national emergency underlying certain tariffs" }),
  "plain english: a national-emergency termination is recognised");
ok(!RC.isDisapproval({ title: "One Big Beautiful Bill Act" }),
  "plain english: an ordinary bill is not swept into the disapproval rule");

const craIssues = [
  { issueKey: "tech_innovation", weight: 60, isPrimary: false,
    rationale: "Supporters framed the rule as unworkable for decentralized software." },
  { issueKey: "gov_regulation", weight: 100, isPrimary: true,
    rationale: "Congressional Review Act resolution repealing the IRS reporting rule; a yea rolls back the mandate." },
];
const craItem = { kind: "vote", title: CRA_TITLE, issues: craIssues };
// The effect is a property of the MEASURE, so any of its mappings may supply it.
eq(RC.yeaEffect(craItem, craIssues[0]).text, "A yea rolls back the mandate.",
  "plain english: the operative effect is borrowed from another mapping on the same measure");
eq(RC.yeaEffect(craItem, craIssues[0]).fromSelected, false,
  "plain english: the card knows the effect came from a sibling mapping, not its own");
eq(RC.yeaEffect(craItem, craIssues[1]).fromSelected, true,
  "plain english: a mapping's own rationale is preferred over a sibling's");
ok(JSON.stringify(craIssues).includes("a yea rolls back the mandate"),
  "plain english: the sentence is quoted from stored data, not composed");
// Refuse when no curator ever wrote one down.
const craMute = { kind: "vote", title: CRA_TITLE, issues: [{ issueKey: "gov_regulation",
  rationale: "Supporters framed the rule as a drag on U.S. crypto development." }] };
eq(RC.yeaEffect(craMute, craMute.issues[0]), null, "plain english: motivation is not an operative effect");
has(RC.guards.blockPlainEffect(craMute, "gov_regulation"), "what a Yea did",
  "plain english: guard 13 refuses a disapproval card that cannot say what a Yea did");
eq(RC.guards.blockPlainEffect(craItem, "tech_innovation"), "",
  "plain english: guard 13 passes when any mapping states the effect");
eq(RC.guards.blockPlainEffect({ kind: "vote", title: "Farm Bill", issues: [] }, "any"), "",
  "plain english: guard 13 touches nothing but disapproval-style measures");
// End to end: the effect leads the supporting line, so the line budget can never
// drop the one clause a reader cannot reconstruct from the title.
const craCard = RC.find("testrep", "lands_preserve");
ok(!craCard || /^A yea removes/.test(craCard.facts),
  "plain english: on a disapproval card the operative effect is the first thing in the supporting line");

// ── The seam left behind when the clause is lifted out ───────────────────────
// Promoting the "a yea …" clause to its own tier cuts it out of the middle of a
// curated sentence, and the punctuation that joined it stays behind. The live
// ledger was printing one of these on a public-facing card — S.J.Res. 18's
// rationale ends "…nullify a federal rule; a yea strikes the CFPB overdraft
// regulation off the books.", and lifting the clause left "…federal rule; ."
// with the semicolon and the full stop sitting next to each other.
{
  eq(RC.tidyRemainder("A CRA resolution whose effect is to nullify a federal rule; "),
    "A CRA resolution whose effect is to nullify a federal rule.",
    "plain english: the separator orphaned at the cut is removed and the sentence is closed");
  eq(RC.tidyRemainder("A CRA resolution whose effect is to nullify a federal rule; ."),
    "A CRA resolution whose effect is to nullify a federal rule.",
    "plain english: and a full stop left stranded after it does not print as \"; .\"");
  eq(RC.tidyRemainder("Rescinds unobligated balances, "), "Rescinds unobligated balances.",
    "plain english: a trailing comma is treated the same way");
  eq(RC.tidyRemainder("Already a whole sentence."), "Already a whole sentence.",
    "plain english: a rationale that needed no repair is returned untouched");
  eq(RC.tidyRemainder("Ends with a quote he called “unworkable”"),
    "Ends with a quote he called “unworkable”.",
    "plain english: closing punctuation is respected rather than counted as the end of the sentence");
  eq(RC.tidyRemainder(" ;  . "), "",
    "plain english: a remainder that is only punctuation drops out instead of shipping as a stray mark");
  eq(RC.tidyRemainder(""), "", "plain english: nothing in, nothing out");
  // The repair must not rewrite the curators' words — only the seam.
  const src = "Congressional Review Act resolution repealing the IRS reporting rule; a yea rolls back the mandate.";
  const kept = RC.tidyRemainder(src.replace(/\ba yea\b[^.;]*/i, ""));
  eq(kept, "Congressional Review Act resolution repealing the IRS reporting rule.",
    "plain english: the surviving clause is the curators' own, unedited");
  lacks(kept, "yea", "plain english: and the promoted clause is not left duplicated behind it");
  // Through the real builder, on the real shape: no card's supporting text may
  // ship a dangling separator, whatever the ledger hands it.
  const built = RC.cardsFor("testrep").concat([RC.omnibus("testrep", "H.R. 1")]).filter(Boolean);
  ok(built.length > 0, "plain english: there are built cards to check the seam on");
  for (const c of built) {
    ok(!/[;,]\s*[.!?]/.test(c.facts), `plain english: ${c.measureNumber} prints no orphaned separator`);
    for (const p of c.factParts) {
      ok(!/^[\s;,.]+$/.test(p) || p === "",
        `plain english: ${c.measureNumber} ships no fact segment that is only punctuation`);
    }
  }
}
if (craCard) {
  eq((craCard.facts.match(/a yea removes/gi) || []).length, 1,
    "plain english: the effect is stated once, not repeated out of the rationale it came from");
}

// ── Part 4 · guard 14, the citation was READ and not merely built ─────────────
// canonicalCitation constructs an address; construction is not verification. The
// denylist in receipt-cards.js exists to refuse the addresses that were fetched
// and did NOT turn out to name the vote on the card. The only thing that can make
// that list wrong is drift — someone edits the list by hand, or the evidence file
// is refreshed and the list is not — so the test derives the expected list from
// the evidence and compares, rather than restating it. Offline: the JSON is the
// committed record of a network run, not a new one.
{
  const evidence = JSON.parse(readFileSync(join(ROOT, "db/vr-citation-check.json"), "utf8"));
  const denied = RC.guards.unresolvedCitations;
  const fromEvidence = (evidence.results || [])
    .filter((r) => r.ok === false).map((r) => r.url).sort();
  eq(JSON.stringify(Object.keys(denied).sort()), JSON.stringify(fromEvidence),
    "guard 14: the refused-citation list is exactly what the link check could not confirm");
  eq((evidence.unresolved || []).length, fromEvidence.length,
    "guard 14: the evidence file's own summary agrees with its per-URL results");
  for (const [url, entry] of Object.entries(denied)) {
    ok(/^https:\/\/(www\.senate\.gov|clerk\.house\.gov)\//.test(url),
      "guard 14: a refused address is still a chamber roll-call page, not junk");
    ok(entry.why.length > 40 && !/^error|^failed/i.test(entry.why),
      "guard 14: the refusal says in plain words what a reader would have found");
    // The measure recorded on the entry is the one the CHAMBER names, and it has to
    // be the same string the evidence file captured — that value is what decides
    // whether a repaired card publishes, so a hand-edit that drifts from the
    // evidence would quietly re-open the hole this guard exists to close.
    const ev = (evidence.unresolved || []).find((u) => u.url === url);
    eq(entry.measure || "", (ev && ev.pageMeasure) || "",
      "guard 14: the entry's page-measure matches the evidence it was taken from");
  }
  // Measure-awareness, both directions. This is the whole reason entries carry a
  // measure: a repair migration and this file deploy independently, so the guard
  // has to be correct BEFORE the ledger is fixed (refuse — the card would print the
  // wrong bill) and AFTER (publish — card and page now name the same one), with no
  // second deploy in between.
  //
  // Driven by FIXTURES, not by whatever the live list happens to hold. When the
  // ledger is healthy that list is empty — as it is now that the Laken Riley repair
  // has deployed — and a test that read its cases out of it would quietly stop
  // checking anything at exactly the moment it still needs to work for the next
  // conflict. The fixture is injected into the live object, exercised, and removed.
  {
    const CASES = [
      { chamber: "senate", congress: 119, session: 1, rollNumber: 7,
        wrong: "H.R. 29", pageMeasure: "S. 5",
        why: "the roll-call page for this vote is recorded under a different measure number, so a reader following the citation would not find the bill named on the card" },
      { chamber: "house", congress: 119, session: 1, rollNumber: 23,
        wrong: "H.R. 29", pageMeasure: "S 5",
        why: "the Clerk's record of this roll call is a vote on a different bill than the one named on the card, so a reader following the citation would not find the measure the card cites" },
    ];
    for (const c of CASES) {
      const at = (number) => ({ kind: "vote", date: "2025-01-20", number,
        source: SRC("https://www.congress.gov/bill/119th-congress/house-bill/29"),
        chamber: c.chamber, congress: c.congress, session: c.session, rollNumber: c.rollNumber });
      const url = RC.canonicalCitation(at(c.wrong)).url;
      ok(/^https:\/\/(www\.senate\.gov|clerk\.house\.gov)\//.test(url),
        "guard 14: the fixture address is a real chamber roll-call page the deriver produces");
      eq(RC.guards.blockUnverifiedCitation(at(c.wrong)), "",
        "guard 14: with nothing listed, the citation is not blocked");
      denied[url] = { measure: c.pageMeasure, why: c.why };
      try {
        ok(!!RC.guards.blockUnverifiedCitation(at(c.wrong)),
          "guard 14: before the repair, a card naming the wrong measure is refused");
        eq(RC.guards.blockUnverifiedCitation(at(c.pageMeasure)), "",
          "guard 14: after the repair, a card naming the measure the page names publishes");
        eq(RC.guards.blockUnverifiedCitation(at(c.pageMeasure.replace(/[.\s]/g, ""))), "",
          "guard 14: agreement is judged on the bill token, not on chamber punctuation");
        // The printable-form comparison the card-level sweep below depends on. Done
        // here, against a live www address, because an empty denylist cannot prove it.
        const printableKey = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
        ok(new Map(Object.entries(denied).map(([u, e]) =>
          [u.replace(/^https?:\/\//i, "").replace(/^www\./i, ""), e])).has(printableKey),
          "guard 14: the printable-form index resolves a www address (the card sweep is not vacuous)");
        // An entry with no measure is refused outright — there is no ledger state
        // that could come to agree with a dead link.
        denied[url] = { why: c.why };
        ok(!!RC.guards.blockUnverifiedCitation(at(c.pageMeasure)),
          "guard 14: an entry with no measure refuses every card, however the ledger changes");
      } finally {
        delete denied[url];
      }
      eq(RC.guards.blockUnverifiedCitation(at(c.wrong)), "",
        "guard 14: the fixture is removed again and leaves no residue");
    }
  }
  // Fail OPEN is the failure mode to fear here: an empty or mis-keyed denylist
  // silently publishes the bad card. A vote that WAS confirmed must pass, and an
  // underivable one must fall to guard 12 rather than being waved through here.
  eq(RC.guards.blockUnverifiedCitation(VOTE({ congress: 119, session: 1, rollNumber: 190,
    source: SRC("https://clerk.house.gov/Votes/2025190") })), "",
    "guard 14: a confirmed citation is not blocked");
  eq(RC.guards.blockUnverifiedCitation(VOTE({ source: SRC("https://x.test/nothing") })), "",
    "guard 14: an underivable citation is guard 12's refusal to make, not guard 14's");
  // No card may ship an address guard 14 would refuse FOR THAT CARD. Phrased as
  // "no card ships a denied address" this would start failing the day the repair
  // migration lands and an S. 5 card correctly cites the S. 5 roll-call page —
  // which is the outcome the repair exists to produce, not a regression.
  //
  // Both sides are compared in printable form. card.verifyUrl is what the footer
  // prints, and printableUrl() strips the scheme AND the leading "www.", so
  // "https://" + card.verifyUrl reconstructs "https://senate.gov/…" and never
  // equals the "https://www.senate.gov/…" key it is meant to be tested against.
  // Comparing the raw strings made this assertion pass for every Senate citation
  // no matter what the denylist said. That the printable index really does resolve
  // a www address is proved by the fixture block above, which can hold an entry
  // open long enough to check it; here the list is legitimately empty.
  const printable = (u) => String(u || "").replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  const sameNum = (a, b) => String(a || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase()
    === String(b || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const deniedByPrint = new Map(Object.entries(denied).map(([u, e]) => [printable(u), e]));
  for (const card of RC.cardsFor("testrep").concat([RC.omnibus("testrep", "H.R. 1")]).filter(Boolean)) {
    for (const u of [card.verifyUrl, card.source.url]) {
      const entry = deniedByPrint.get(printable(u));
      ok(!entry || (entry.measure && sameNum(entry.measure, card.measureNumber)),
        `citation: no card ships an address the link check refused for that card's measure (${card.issueKey})`);
    }
  }
}

// ── Part 5 · the bill title survives the line budget ──────────────────────────
// The supporting block has a hard line budget and used to be one joined string,
// so a long rationale could push the cut into the measure title and ship a card
// reading "…the One Big Beautiful Bill Ac…". That is the one string a reader
// needs intact to go and check the vote, so the card now hands the renderer
// SEGMENTS and the renderer drops whole trailing ones instead of cutting.
{
  const card = RC.cardsFor("testrep").find((c) => c.measureNumber === "H.R. 1")
    || RC.omnibus("testrep", "H.R. 1");
  ok(Array.isArray(card.factParts) && card.factParts.length >= 2,
    "facts: the card carries its supporting block as segments, not only as one string");
  eq(card.factProtected, 2, "facts: the protected prefix is the effect slot and the title slot");
  eq(card.factParts[1], "One Big Beautiful Bill Act",
    "facts: slot 1 is always the measure title, so the renderer never has to guess");
  eq(card.factParts.filter(Boolean).join(" — "), card.facts,
    "facts: the segments and the joined string are the same content, so captions lose nothing");
  ok(card.facts.indexOf("One Big Beautiful Bill Act") !== -1,
    "facts: the joined string still names the measure");

  // Measure real wrapped output. A monospace metric is enough: the guarantee
  // under test is "no cut inside the protected prefix", which is about which
  // segments are emitted, not about a particular typeface.
  const fake = { measureText: (s) => ({ width: String(s).length * 14 }) };
  const W = 952;   // ≈68 characters to the line under that metric
  const TITLE = "A Very Long Measure Title That Runs On For Quite A While Indeed";
  const seg = (parts) => {
    const r = { factParts: parts, factProtected: 2 };
    r.facts = parts.filter(Boolean).join(" — ");
    return r;
  };

  // A rationale far too long for the budget: it has to go entirely.
  const bloated = seg(["", TITLE, new Array(60).fill("rationale").join(" "), "House · Passed"]);
  const old = R._wrapText(fake, bloated.facts, W, 3);
  ok(/…$/.test(old[old.length - 1]),
    "facts: the fixture really does overflow the budget, or this test proves nothing");
  ok(/rationale…$/.test(old[old.length - 1]),
    "facts: and the old joined-string path ended the card mid-sentence");
  const cut = R._factLines(fake, bloated, W, 3);
  ok(cut.join(" ").indexOf(TITLE) !== -1,
    "facts: the whole title is rendered even when the block will not fit");
  ok(cut.join(" ").indexOf("rationale") === -1,
    "facts: the rationale is dropped entire rather than cut mid-sentence");
  ok(!/…$/.test(cut[cut.length - 1]),
    "facts: dropping a segment removes the ellipsis instead of moving it");
  eq(R._factLines(fake, bloated, W, 0).length, 0,
    "facts: no line budget renders nothing, never a stray ellipsis");

  // The guarantee, stated as a sweep rather than as one lucky fixture: at every
  // budget from "the protected prefix just fits" upward, the prefix is emitted
  // whole and nothing trails off. Below that line the fallback takes over, which
  // is the documented and unavoidable case.
  //
  // Read off the BLOCKS rather than off a joined string. Each segment now starts
  // its own line and carries its own tier, so "the prefix is intact" is a claim
  // about which segments were emitted and what text each one holds — a claim the
  // blocks answer exactly, where a string prefix test would only be re-deriving
  // the separator the renderer no longer uses.
  {
    const effecty = seg([new Array(40).fill("effect").join(" "), TITLE,
      new Array(60).fill("rationale").join(" "), "House · Passed"]);
    const lineCount = (t) => R._wrapText(fake, t, W, 0).length;
    const floor = lineCount(effecty.factParts[0]) + lineCount(TITLE);
    for (let b = floor; b <= floor + 4; b++) {
      const blocks = R._factBlocks(fake, effecty, W, b);
      eq(blocks[0] && blocks[0].tier, "effect",
        `facts: at a ${b}-line budget what a Yea did leads the block`);
      eq(blocks[0] && blocks[0].text, effecty.factParts[0],
        `facts: at a ${b}-line budget the effect sentence is emitted whole`);
      eq(blocks[1] && blocks[1].tier, "title",
        `facts: at a ${b}-line budget the title is its own tier, on its own line`);
      eq(blocks[1] && blocks[1].text, TITLE,
        `facts: at a ${b}-line budget the title is emitted whole`);
      const got = R._factLines(fake, effecty, W, b);
      ok(!/…$/.test(got[got.length - 1]), `facts: at a ${b}-line budget nothing trails off`);
      ok(got.length <= b, `facts: at a ${b}-line budget the block stays inside the budget`);
    }
    // One line under the floor is exactly where the documented fallback lives.
    // Both protected segments still appear — a card that quietly stopped naming
    // the bill would look like a card with nothing to say about it — and the cut
    // is marked inside whichever segment the budget ran out in.
    const under = R._factBlocks(fake, effecty, W, floor - 1);
    eq(under.map((b) => b.tier).join(","), "effect,title",
      "facts: below the floor neither protected segment is silently dropped");
    eq(R._factLines(fake, effecty, W, floor - 1).length, floor - 1,
      "facts: below the floor the budget is spent, not abandoned");
    ok(under.some((b) => b.lines.some((l) => /…$/.test(l))),
      "facts: and the one case that must truncate marks the cut where it happened");
  }

  // A segment never shares a line with the segment after it. This is the whole
  // point of tiering: painted in three different weights and colours, two
  // segments on one line would render as one line in two colours, which reads as
  // a rendering fault rather than as a hierarchy.
  {
    const tiered = seg(["A yea repealed the rule.", TITLE, "Curated rationale.", "House · Passed"]);
    const blocks = R._factBlocks(fake, tiered, W, 7);
    eq(blocks.map((b) => b.tier).join(","), "effect,title,tail",
      "facts: the block is emitted as effect, then title, then everything else");
    eq(blocks[2].text, "Curated rationale. — House · Passed",
      "facts: the supporting segments share the last tier and keep their separator");
    for (const b of blocks) {
      eq(b.lines.join(" "), b.text,
        `facts: the ${b.tier} tier's lines reconstruct its own text and nothing else`);
      ok(R._factTiers[b.tier], `facts: the ${b.tier} tier has a defined weight and colour`);
    }
    const tiers = blocks.map((b) => R._factTiers[b.tier]);
    eq(new Set(tiers.map((t) => t.fill)).size, 3,
      "facts: the three tiers are actually distinguishable — three colours, not one");
  }

  // Order matters: the tail goes before the rationale, and the title never goes.
  // Sized so title + rationale fit in three lines but the tail tips it to four.
  const snug = seg(["", TITLE, new Array(12).fill("rationale").join(" "), "House · Passed"]);
  const roomy = R._factLines(fake, snug, W, 6);
  ok(roomy.join(" ").indexOf("House · Passed") !== -1,
    "facts: when it all fits, nothing is dropped");
  const mid = R._factLines(fake, snug, W, 3);
  ok(mid.join(" ").indexOf("rationale") !== -1,
    "facts: a rationale that fits is kept");
  ok(mid.join(" ").indexOf("House · Passed") === -1,
    "facts: the least load-bearing segment is the first to go");

  // The unavoidable case still fails safe: a title too long for the budget on
  // its own is ellipsized rather than dropped, because a blank block is worse.
  const monster = seg(["", new Array(80).fill("Title").join(" ")]);
  const forced = R._factLines(fake, monster, W, 2);
  eq(forced.length, 2, "facts: an unfittable title fills the budget rather than blanking it");
  ok(/…$/.test(forced[1]), "facts: and says so with an ellipsis rather than stopping silently");

  // A card from another feed carries no segments; it must render as before — the
  // original single run, in the original colour, with nothing tiered onto it.
  eq(R._factLines(fake, { facts: "plain string" }, W, 3).join(" "), "plain string",
    "facts: a card with no segments keeps the original behaviour");
  {
    const curated = R._factBlocks(fake, { facts: "plain string" }, W, 3);
    eq(curated.length, 1, "facts: a curated receipt is one block, not a tiered stack");
    eq(curated[0].tier, "plain", "facts: and is painted in the tier it always was");
    eq(R._factTiers.plain.fill, "#b7c6de",
      "facts: the curated tier still carries the pre-existing supporting colour");
    eq(R._factTiers.plain.font, '400 29px "Barlow", sans-serif',
      "facts: and the pre-existing supporting font — curated cards render byte-identically");
  }

  // No shipped card may be cut inside its protected prefix at the full budget,
  // and each protected segment must arrive as its own block.
  for (const c of RC.cardsFor("testrep").concat([RC.omnibus("testrep", "H.R. 1")]).filter(Boolean)) {
    const blocks = R._factBlocks(fake, c, W, 7);
    const want = (c.factParts || []).slice(0, 2).filter(Boolean);
    eq(blocks.slice(0, want.length).map((b) => b.text).join(" "), want.join(" "),
      `facts: the ${c.issueKey} card renders its protected prefix whole, segment by segment`);
    ok(!blocks.slice(0, want.length).some((b) => /…/.test(b.lines.join(""))),
      `facts: and no ellipsis lands inside the ${c.issueKey} card's title or effect line`);
  }
}

// ── Part 5b · nothing on the card is too small to read on a phone ─────────────
// The canvas is authored at 1080×1350 and almost always consumed at a fraction
// of that: a timeline thumbnail, a screenshot forwarded to a group chat. Every
// point of type scale is therefore load-bearing, and the lines most tempting to
// shrink — the undated-stance disclosure, the method link, the address — are
// exactly the ones whose whole job is to be read. So the floor is asserted
// against the source rather than trusted to review.
//
// This reads the renderer's font declarations directly. That is deliberate: the
// alternative is a stub ctx recording every `font` assignment, which would only
// prove the sizes the fixtures happen to reach, and the sizes worth protecting
// live on optional branches.
{
  const FLOOR = 20;
  const src = readFileSync(join(ROOT, "say-vs-do.js"), "utf8");
  const body = src.slice(src.indexOf("function renderCanvas"), src.indexOf("function isRecordCard"));
  ok(body.length > 2000, "legibility: the renderer body was located, so this sweep is not vacuous");
  const sizes = [...body.matchAll(/\b(\d+)px "Barlow/g)].map((m) => Number(m[1]));
  ok(sizes.length >= 12, "legibility: the renderer's type scale was read off the source");
  for (const s of sizes) {
    ok(s >= FLOOR, `legibility: no fixed type on the card is under ${FLOOR}px (found ${s}px)`);
  }
  // The address is the one line allowed to shrink, because it may never be
  // elided — see the shrink loop. Its floor is lower, and stated.
  const shrink = body.match(/for \(var vSize = (\d+); vSize > (\d+); vSize--\)/);
  ok(!!shrink, "legibility: the address shrink loop is still the only variable type on the card");
  eq(Number(shrink[1]), 22, "legibility: the address starts at the footer's body size");
  ok(Number(shrink[2]) + 1 >= 15,
    `legibility: and never shrinks below 15px (floor is ${Number(shrink[2]) + 1}px)`);
  // The address shares its row with the right-hand origin mark, so its width
  // budget has to account for that mark or a long Senate URL is overprinted.
  has(body, "contentW - ctx.measureText(isRecordCard(r) ? 'OFFICIAL RECORD' : 'SAY vs. DO').width",
    "legibility: the address is held clear of the origin watermark by measurement, not by a guessed margin");
}

// Method copy has to describe all three, or the card's method link points at a
// page that no longer matches the card.
{
  const mIdx2 = consSrc.indexOf("Cards you can share");
  const mSec2 = consSrc.slice(mIdx2, consSrc.indexOf("'cards')", mIdx2) + 8);
  for (const [what, pattern] of [
    ["the canonical roll-call page rule", /clerk\.house\.gov/],
    ["that a developer API endpoint is never printed", /developer API endpoint/i],
    ["that URLs are never shortened", /never shortened/i],
    ["the plain-English rule for disapproval resolutions", /what a Yea actually did/i],
    ["that stated positions are undated", /undated/i],
    // The copy is read out of the JS source, where an apostrophe is backslash-escaped.
    ["that no date is invented", /can\\?'t source a date for/i],
  ]) {
    ok(pattern.test(mSec2), `method copy: covers ${what}`);
  }
}

// ══ 5c. ARRIVAL ══════════════════════════════════════════════════════════════
// A share card's whole claim is "check it yourself", and the checking happens at
// the far end of the link — on someone else's phone, with no PolitiDex history
// behind it. Two things have to hold there or the claim is empty: the link must
// open the SAME (member, issue) view the card was about, and that view must lead
// somewhere. handleHash() opens the gap sheet directly over whatever page the app
// happened to boot on, so dismissing it is a dead end unless the sheet says where
// to go next.
{
  const C = ctx.window.PDXConsistency;
  ok(!!C, "arrival: the consistency module that owns the landing view is loaded");
  eq(typeof RC.handleHash, "function",
    "arrival: the hash router is exposed, so the round trip is asserted and not assumed");

  // ── The round trip, driven through the real router ──────────────────────────
  // Every shippable card's own hash is fed to the real handleHash and the real
  // openGap is spied on. This is the one contract that spans two files, so it is
  // tested on behaviour rather than on the two halves agreeing in prose.
  // The split card is in this list too: its footer address is the issue record
  // rather than a chamber page, so "the link opens the view the card describes"
  // is the whole of its citation contract and not merely a convenience.
  const shippable = RC.cardsFor("testrep")
    .concat(RC.cardsFor("splitrep"))
    .concat([RC.omnibus("testrep", "H.R. 1")])
    .filter(Boolean);
  ok(shippable.length >= 2, "arrival: there are cards to follow (contradiction, consistency, split, omnibus)");
  const realOpen = C.openGap;
  const realHash = ctx.location.hash;
  const calls = [];
  try {
    C.openGap = function (pid, issue) { calls.push([pid, issue]); };
    for (const card of shippable) {
      const m = String(card.hash || "").match(/^#record=([^~&]+)~([^&]+)$/);
      ok(!!m, `arrival: ${card.measureNumber} card carries a pid~issue record hash`);
      if (!m) continue;
      calls.length = 0;
      ctx.location.hash = card.hash;
      RC.handleHash();
      eq(calls.length, 1, `arrival: following ${card.hash} opens exactly one view`);
      eq((calls[0] || [])[0], m[1], "arrival: on the same member the card is about");
      eq((calls[0] || [])[1], m[2], "arrival: on the same issue the card is about");
    }
    // A record link with no issue on it has nowhere specific to land, so it must
    // NOT silently open some other issue's comparison — the profile is the honest
    // fallback. handleHash's own branch already does this; assert it stays.
    calls.length = 0;
    let profiled = null;
    const realProfile = ctx.window.showProfile;
    ctx.window.showProfile = function (pid) { profiled = pid; };
    try {
      ctx.location.hash = "#record=testrep";
      RC.handleHash();
    } finally {
      if (realProfile === undefined) delete ctx.window.showProfile;
      else ctx.window.showProfile = realProfile;
    }
    eq(calls.length, 0, "arrival: an issue-less record link never guesses an issue to open");
    eq(profiled, "testrep", "arrival: it lands on that member's profile instead");
  } finally {
    C.openGap = realOpen;
    ctx.location.hash = realHash;
  }

  // ── The way out of the landing view ─────────────────────────────────────────
  eq(typeof C.nextStepHtml, "function", "arrival: the landing view builds a next-step row");
  const next = C.nextStepHtml("testrep", "national_debt");
  has(next, "pdxgap-next", "arrival: the row is present on the sheet the deep link opens");
  has(next, "Where to next", "arrival: and it is labelled, so it reads as a way out rather than as more content");
  // Three concrete moves, widening: another issue on this member, the whole
  // profile, your own delegation. Each has to point at a destination that
  // already exists — a next step that opens nothing is worse than none.
  has(next, 'data-pdxc-profile="testrep"', "arrival: next step — open this member's full profile");
  has(next, 'href="#voter-hub"', "arrival: next step — find your own reps, at the app's real hub anchor");
  has(next, "data-pdxc-gapclose", "arrival: leaving the sheet closes it first, so the hub is not left behind a modal");
  // The "check another issue" step is conditional and NAMED. It needs a member
  // with a scored record, which this harness deliberately does not stub globally
  // — the guard tests must not see scores. So the two readers consistency.js
  // scores through are stubbed for the length of this check and then removed:
  // 'testrep' gets a real Official Record summary on two issues, which is the
  // shape a Wave 1 arrival actually has (vote record, no curated Say-vs-Do).
  const realSummary = ctx.window._pdxRecordIssueSummary;
  const SCORED = { lower_taxes: { total: 2, consistent: 2, contradicts: 0, netVerdict: "consistent" },
                   national_debt: { total: 2, consistent: 0, contradicts: 2, netVerdict: "contradicts" } };
  let scoredNext;
  try {
    ctx.window._pdxRecordIssueSummary = (pid, key) =>
      (pid === "testrep" ? SCORED[key] || null : null);
    scoredNext = C.nextStepHtml("testrep", "national_debt");
  } finally {
    if (realSummary === undefined) delete ctx.window._pdxRecordIssueSummary;
    else ctx.window._pdxRecordIssueSummary = realSummary;
  }
  const another = scoredNext.match(/data-pdxc-gap="([^"]+)" data-pdxc-gap-pid="testrep"/);
  ok(!!another, "arrival: next step — check a second issue on this member");
  eq(another && another[1], "lower_taxes",
    "arrival: it offers the other scored issue, never the one already on screen");
  if (another) {
    const label = (ctx.window.ISSUE_MAP[another[1]] || {}).label || "";
    ok(label && scoredNext.includes(label),
      "arrival: the second issue is named on the button, not left as a generic 'another issue'");
  }
  // Fail closed the other way: with nothing else scored, the button that would
  // open an empty comparison is not offered at all — the two unconditional steps
  // still ship, so the sheet is never a dead end.
  lacks(next, "data-pdxc-gap=", "arrival: no second-issue button when there is no second issue to open");
  has(next, "data-pdxc-profile", "arrival: the unconditional steps ship regardless");

  // ── What the arrival actually READS at the top of that view ─────────────────
  // The header was written for a reader already inside the app, who knew whose
  // profile they were on. It is now the first thing a stranger sees after tapping
  // a shared image, and for that reader it failed twice: it never named the
  // member, and — because a card only ships where the Official Record has depth
  // the curated Say-vs-Do layer does not — it opened with "— One side only" and a
  // sentence explaining there was nothing to compare. Measured against the live
  // pool that was every one of the 212 core public cards.
  eq(typeof C.gapViewHtml, "function", "arrival: the landing view is a pure builder");
  {
    const realSummary2 = ctx.window._pdxRecordIssueSummary;
    const realProfiles = ctx.window.PROFILES;
    let view;
    try {
      ctx.window._pdxRecordIssueSummary = (pid, key) =>
        (pid === "testrep" && key === "national_debt"
          ? { total: 4, consistent: 1, contradicts: 3, netVerdict: "contradicts" } : null);
      ctx.window.PROFILES = Object.assign({}, realProfiles, {
        testrep: { name: "Test Representative", office: "U.S. Representative", state: "Idaho", party: "R" },
      });
      view = C.gapViewHtml("testrep", "national_debt");
    } finally {
      if (realSummary2 === undefined) delete ctx.window._pdxRecordIssueSummary;
      else ctx.window._pdxRecordIssueSummary = realSummary2;
      if (realProfiles === undefined) delete ctx.window.PROFILES;
      else ctx.window.PROFILES = realProfiles;
    }
    has(view, "Test Representative",
      "arrival: the member is named — the landing view has to be visibly the same object as the image");
    has(view, "pdxgap-who", "arrival: the name has its own slot, above the issue");
    has(view, "U.S. Representative", "arrival: with the office that identifies which Test Representative");
    has(view, "🏛️ Official Record",
      "arrival: an Official-Record-only issue is framed as the Official Record, not as a comparison");
    lacks(view, "One side only",
      "arrival: the arrival is never greeted by a chip saying there is nothing to compare");
    lacks(view, "nothing to line up head-to-head",
      "arrival: nor by a sentence apologising for it — the card made a claim, the page states it");
    has(view, "4 judged votes on this issue",
      "arrival: the depth behind the verdict leads, because it is the thing the image could not carry");
    // Nothing is hidden by the reframing: the 🧾 side still renders, with its own
    // honest empty state. The boundary is the point of the sheet.
    has(view, "Say-vs-Do", "arrival: the Say-vs-Do side is still shown, not suppressed");
    has(view, "pdxgap-next", "arrival: and the way out is still on the same view");
  }

  // The three controls are only real if something handles them. The gap sheet is
  // built by innerHTML into a delegate-bound document, so the handlers live in
  // consistency.js's click delegate, not on the nodes.
  for (const [attr, what] of [
    ["[data-pdxc-profile]", "the profile step"],
    ["[data-pdxc-gapclose]", "the leave-the-sheet step"],
    ["[data-pdxc-gap]", "the second-issue step"],
  ]) {
    has(consSrc, `closest('${attr}')`, `arrival: ${what} is wired into the click delegate`);
  }
  const dStart = consSrc.indexOf("function bindGateway");
  const delegate = consSrc.slice(dStart, consSrc.indexOf("pdx-consistency-warm", dStart));
  ok(delegate.length > 500, "arrival: the click delegate was located, so this check is not vacuous");
  ok(delegate.indexOf("data-pdxc-profile") > -1 && delegate.indexOf("closeGap()") > -1,
    "arrival: opening the profile closes the sheet first, so the reader is not left under a modal");
}

// ── Phase 10 · what the share image actually prints ──────────────────────────
// Three defects found by laying the real renderer over the live core-tier pool
// (212 cards: 153 issue cards + 59 omnibus splits). All three are presentation
// only — no verdict, no citation and no mapping moves — but each one produced an
// artefact that a stranger could not read, or could read wrongly.
{
  // 1. A truncated issue name is not an issue name.
  //
  // The split rows list the OTHER curated issues the same cited vote moved. They
  // were clamped to a single line, and wrapText ellipsizes what it cannot fit —
  // so the H.R. 1 card announced "THE SAME VOTE MOVED 14 MAPPED ISSUES" and then
  // printed two real names followed by "Middle-Class Tax…", a fragment that
  // reads like a third issue, names nothing, and cannot be looked up. Whole
  // labels now, with the remainder COUNTED.
  const wide = { font: "" };
  wide.measureText = (s) => ({ width: String(s).length * 10 });
  const three = ["Alpha Issue", "Beta Issue", "Gamma Issue"];

  eq(R._labelListLines(wide, three, 4000, 2).join(" | "),
    "Alpha Issue · Beta Issue · Gamma Issue",
    "split rows: a list that fits is printed whole, on one line, unchanged");

  {
    // Room for two labels plus the counter, but not for all three names, so one has to go.
    const lines = R._labelListLines(wide, three, 360, 1);
    lacks(lines.join(" "), "…",
      "split rows: an over-long issue list is never ellipsized mid-label");
    has(lines.join(" "), "+1 more",
      "split rows: what did not fit is counted instead — a claim the reader can go and check");
    eq(three.filter((n) => lines.join(" ").indexOf(n) > -1).length, 2,
      "split rows: and every name that IS printed is printed whole");
  }

  {
    // Two lines of budget must carry more names than one, or the extra line is
    // decoration rather than a fix.
    const one = R._labelListLines(wide, three, 360, 1).join(" ");
    const two = R._labelListLines(wide, three, 360, 2).join(" ");
    ok(three.filter((n) => two.indexOf(n) > -1).length >
       three.filter((n) => one.indexOf(n) > -1).length,
      "split rows: the second line buys whole names, not a longer counter");
  }

  {
    // The pathological case: one label alone is wider than the row. Ellipsizing
    // it would print a fragment; the bare count is at least true.
    const lines = R._labelListLines(wide, ["A Ludicrously Long Single Issue Label", "B"], 60, 1);
    lacks(lines.join(" "), "…",
      "split rows: even when nothing fits, no half-name is printed");
    has(lines.join(" "), "2 issues",
      "split rows: the honest fallback is the count, which is still readable at thumbnail size");
  }
  eq(R._labelListLines(wide, [], 400, 2).length, 0, "split rows: an empty list draws nothing");
  eq(R._labelListLines(wide, three, 400, 0).length, 0, "split rows: no vertical budget draws nothing");

  // 2. No ledger tokens on a public artefact.
  //
  // The last line of the fact block printed the stored `result` verbatim. Across
  // the corpus that field holds "passed", "Passed", "failed", "agreed_to" and
  // "rejected" side by side, so one card read "House · agreed_to" — a database
  // enum, underscore and all, on the one artefact whose whole job is looking
  // like a public record — while two cards from the same starter set disagreed
  // about whether "passed" is capitalised.
  {
    const P = (result) => {
      const parts = RC.supportingParts({ chamber: "house", title: "A Bill", result: result }, null);
      return parts[parts.length - 1];
    };
    eq(P("agreed_to"), "House · Agreed to", "fact tail: an underscored ledger token is never printed raw");
    eq(P("passed"), "House · Passed", "fact tail: outcomes are sentence case…");
    eq(P("Passed"), "House · Passed", "fact tail: …whichever casing the ledger happens to hold");
    eq(P("failed"), "House · Failed", "fact tail: including the ones that did not pass");
    lacks(P("agreed_to"), "_", "fact tail: nothing on the card carries a schema underscore");
  }

  // 3. A zero-width joiner is not an icon.
  //
  // One ISSUE_MAP label opens with a bare ZWJ before its emoji. \s does not match
  // a format character, so the icon split failed outright: the card fell back to
  // the generic 🎯 while still printing the real emoji inside the label text, and
  // carried two icons, one of them wrong — plus an invisible character that lands
  // as a tofu box on whichever phone renders the caption.
  {
    const realMap = ctx.window.ISSUE_MAP;
    let meta;
    try {
      ctx.window.ISSUE_MAP = Object.assign({}, realMap, {
        zwtest: { label: "‍🌈 Protect Something" },
      });
      meta = RC.issueMeta("zwtest");
    } finally {
      ctx.window.ISSUE_MAP = realMap;
    }
    eq(meta.icon, "🌈", "issue label: the real emoji is recognised as the icon, not replaced by a fallback");
    eq(meta.label, "Protect Something", "issue label: and it is not ALSO left inside the text");
    lacks(meta.label + meta.icon, "‍", "issue label: no zero-width character survives onto a share artefact");
  }
}

// ── Guard 15 · the stated position has to be independent of the vote ─────────
// The two cards that refuted themselves on public view were both caught in
// fields guard 10 never read. These are the live shapes, reduced to the parts
// the guard looks at.
{
  const HOUSE = "https://clerk.house.gov/Votes/2025190";
  const item = { kind: "vote", chamber: "house", source: { url: HOUSE } };
  const B = (pos) => RC.guards.blockDependentStance(pos, item);

  eq(B(null), "", "guard 15: no stated position is guard 10's business, not this one");
  eq(B({ text: "Warns the debt is unsustainable and backs spending cuts.",
        source: { url: "https://lankford.senate.gov/news/press-releases/" } }), "",
    "guard 15: a standing position in the member's own terms passes");

  // kclark / healthcare, as it stands in the corpus: the stance's source IS the
  // roll call the card cites, so the two halves of the card are one document.
  has(B({ text: "As Minority Whip, worked to hold Democrats against the One Big Beautiful Bill Act.",
         source: { url: HOUSE } }), "the very roll call this card cites",
    "guard 15: a stated position sourced to the cited roll call is refused");
  has(B({ text: "Backs spending cuts.", source: { url: "http://www.clerk.house.gov/Votes/2025190/" } }),
    "the very roll call this card cites",
    "guard 15: scheme, www and a trailing slash do not disguise the same address");

  // durbin / healthcare: a different roll call, but still a roll call — the
  // "stated position" is a vote record however it is written up.
  has(B({ text: "Opposed the bill over its Medicaid reductions.",
         source: { url: "https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00372.htm" } }),
    "sourced to a roll call", "guard 15: a stated position sourced to any roll call is refused");

  // The evidence field, which guard 10 does not read.
  has(B({ text: "Backs spending cuts.", evidence: "Recorded a Nay vote on H.R. 1, Roll Call 372.",
         source: { url: "https://example.gov/statement" } }), "evidenced by",
    "guard 15: a position whose evidence is a measure number is vote-derived");
  has(B({ text: "Backs spending cuts.", evidence: "Recorded a Nay vote on the measure, Roll Call 372.",
         source: { url: "https://example.gov/statement" } }), "evidenced by a vote",
    "guard 15: and so is one whose evidence is a roll call cited without its number");

  // jeffries / national_debt: nothing in text, evidence or source names a vote.
  // What inverts the sign is that the position is a REACTION to one bill, so the
  // stance word records support for that bill rather than for the goal the issue
  // names — and the card then reads the word as if it were about the goal.
  has(B({ text: "Anchored his opposition in the CBO's ~$3.4T deficit estimate.",
         source: { url: "https://time.com/7299967/jeffries-speech/" } }), "reaction to one bill",
    "guard 15: a position framed as opposition to a bill cannot stand in for a position on the issue");
  eq(B({ text: "Says the annual defense authorization ensures the military has the resources it needs.",
        evidence: "Statement on the FY25 National Defense Authorization Act.",
        source: { url: "https://mikejohnson.house.gov/news/documentsingle.aspx?DocumentID=1492" } }), "",
    "guard 15: naming a bill the member has commented on is not the same as reacting to the cited one");

  // Guard 10's own text test, widened to the participle that walked through it.
  has(RC.guards.blockStance("Advanced border bills, voting for the Laken Riley Act."),
    "written as a vote", "guard 15: 'voting for' is the same circular receipt as 'voted for'");
  eq(RC.guards.blockStance("A fiscal conservative who publishes an annual waste report."), "",
    "guard 15: and prose that merely describes a record still passes");
}

// ── Guard 17 · measure↔issue topical holds ────────────────────────────────
{
  const P = RC.guards.wave1HoldPair;

  eq(P(null, "tech_balance"), "", "guard 17: no item is not a mismatch");
  eq(P({ number: "S. 1582" }, ""), "", "guard 17: no issue key is not a mismatch");

  has(P({ number: "S. 1582" }, "tech_balance"), "stablecoin",
    "guard 17: AI-guardrail stances judged by the GENIUS Act are held");
  has(P({ number: "S. 1582" }, "tech_innovation"), "semiconductors",
    "guard 17: chip-manufacturing stances judged by the GENIUS Act are held");
  has(P({ number: "S. 146" }, "tech_balance"), "content-removal",
    "guard 17: right-to-repair and export-control stances judged by TAKE IT DOWN are held");
  has(P({ number: "H.R. 28" }, "public_schools"), "athletic eligibility",
    "guard 17: a school-funding stance judged by a Title IX sports bill is held");
  has(P({ number: "H.Amdt. 251" }, "foreign_balance"), "joint military exercises",
    "guard 17: an arms-transfer stance judged by an exercise-cost amendment is held");
  has(P({ number: "H.Amdt. 255" }, "healthcare"), "military health coverage",
    "guard 17: a health-disparities stance judged by a TRICARE exclusion is held");
  has(P({ number: "H.R. 3633" }, "econ_growth"), "digital-asset",
    "guard 17: a domestic-manufacturing stance judged by a crypto market bill is held");

  // The hold is per PAIR, not per key and not per measure — a repaired mapping
  // lifts one card cluster and leaves the rest of the ledger untouched.
  eq(P({ number: "S. 1582" }, "crypto_cbdc"), "",
    "guard 17: the GENIUS Act still judges stances that are actually about stablecoins");
  eq(P({ number: "H.R. 28" }, "lgbtq_rights"), "",
    "guard 17: the same measure's on-point mapping is untouched");
  eq(P({ number: "H.R. 1" }, "tech_balance"), "",
    "guard 17: the same key under a different measure is untouched");
  eq(P({ number: "H.R. 8800" }, "strong_defense"), "",
    "guard 17: an on-topic pair is not held");

  // Every key in the table must be the "<number> :: <issueKey>" shape the
  // lookup builds, or the entry is dead weight that reads as a live hold.
  for (const k of Object.keys(RC.guards.wave1HoldPairs)) {
    ok(/^[^:]+ :: [a-z0-9_]+$/.test(k), "guard 17: hold key is well formed — " + k);
    ok(String(RC.guards.wave1HoldPairs[k]).indexOf("held out of wave 1") === 0,
      "guard 17: hold reason states it is a wave-1 hold — " + k);
  }
}

// ── Guard 18 · curator housekeeping must not reach public text ────────────
{
  const P = RC.guards.publicRationale;

  eq(P(""), "", "guard 18: nothing in, nothing out");
  eq(P("Tightens immigration enforcement."), "Tightens immigration enforcement.",
    "guard 18: a clean rationale is returned unchanged");

  // The weighting frame goes; the caveat inside it stays, with its capital back.
  eq(P("FY2027 National Defense Authorization Act — authorizes DoD military activities; a yea funds the armed forces. Weighted 80 rather than 100 because this NDAA also carries unrelated social-policy riders (see H.Amdt. 254-256), so passage is not a pure defense-posture signal."),
     "FY2027 National Defense Authorization Act — authorizes DoD military activities; a yea funds the armed forces. This NDAA also carries unrelated social-policy riders, so passage is not a pure defense-posture signal.",
    "guard 18: the weighting frame and its row cross-reference go, the caveat stays");
  has(P("Reauthorizes demonstration authority. Weighted below a full-strength mapping on purpose: this is program administration, not a vote on benefit levels."),
    "This is program administration, not a vote on benefit levels.",
    "guard 18: an 'on purpose:' weighting frame is lifted the same way");
  has(P("Continues federal spending at existing levels. Weighted low on purpose: the alternative on the floor was a lapse in appropriations, not spending cuts."),
    "The alternative on the floor was a lapse in appropriations",
    "guard 18: so is a weighting note with no number in it");
  lacks(P("Would strike the appropriation; a yea defunds international climate finance. Weighted 75 because it is a single line item rather than a change in domestic climate policy."),
    "Weighted", "guard 18: no weighting language survives in any form");

  // Curator filing notes go whole — they are about the ledger, not the world.
  lacks(P("Bars a district court from granting relief broader than the parties before it. Previously filed under \"Balance the Budget\", which the bill does not touch."),
    "Previously filed", "guard 18: a 'previously filed under' note is dropped entirely");
  lacks(P("A yea preserves that state option. Matches the direction already carried by this bill's \"Dual federal–state oversight\" provision row, which had no measure-level counterpart."),
    "provision row", "guard 18: so is a cross-reference to a provision row the reader cannot see");
  has(P("A yea preserves that state option. Matches the direction already carried by this bill's \"Dual federal–state oversight\" provision row, which had no measure-level counterpart."),
    "A yea preserves that state option.", "guard 18: and the substantive sentence in front of it survives");

  // Disclosure is about the world and is protected.
  has(P("Recorded as a yea cutting against judicial checks on the executive; supporters make the opposite case, that one district judge should not set national policy. Previously filed under \"Balance the Budget\", which the bill does not touch."),
    "supporters make the opposite case",
    "guard 18: genuine public disclosure is not housekeeping and is kept");
  has(P("Secondary: the same package also carries federal housing-assistance provisions, so a yea advances housing affordability."),
    "The same package also carries", "guard 18: an internal section label is stripped and the sentence recapitalised");
  lacks(P("Secondary: the same package also carries federal housing-assistance provisions, so a yea advances housing affordability."),
    "Secondary:", "guard 18: and the label itself does not print");

  // The backstop: anything the sanitizer does not know how to clean is refused
  // rather than published.
  const B = RC.guards.blockHousekeeping;
  eq(B({ number: "H.R. 1", issues: [{ issueKey: "x", rationale: "Cuts federal spending." }] }, "x"), "",
    "guard 18: a clean mapping is not blocked");
  has(B({ number: "H.R. 1", title: "Weighted differently in the ledger" ,
          issues: [{ issueKey: "x", rationale: "Cuts federal spending." }] }, "x"),
    "measure title carries curator housekeeping",
    "guard 18: housekeeping in the title is refused — no sanitizer touches the title");
}

// ── The public share gate ─────────────────────────────────────────────────
{
  const G = RC.publicShareBlock, T = RC.publicTier;
  const base = () => ({
    hasOffice: true, party: { label: "R" }, date: "2025-07-03",
    source: { url: "https://clerk.house.gov/Votes/2025190" }, verifyUrl: "clerk.house.gov/Votes/2025190",
    said: { text: "A fiscal conservative who backs spending cuts.", word: "Supports" },
    facts: "Rescinds previously appropriated funds, cutting federal spending. — House · passed",
    issueKey: "cut_spending", measureNumber: "H.R. 4", recordSummary: { total: 4 },
    // Every built card names the kind of act it reports, and the gate requires
    // it, so the stand-in carries the one a roll-call card carries.
    instrument: { key: "vote", label: "Recorded floor vote", strength: "deciding", note: "" }
  });

  eq(G(null), "no card", "gate: nothing is not public");
  eq(G(base()), "", "gate: a complete, deep, clean card is public");
  eq(T(base()), "core", "gate: and four judged votes make it core");

  const thin = base(); thin.recordSummary = { total: 1 };
  eq(G(thin), "", "gate: one judged vote does not block — depth is preferred, not required");
  eq(T(thin), "thin", "gate: it is labelled thin instead");

  const noOffice = base(); noOffice.hasOffice = false;
  has(G(noOffice), "member profile is incomplete", "gate: a card with no office line is not public");
  eq(T(noOffice), "", "gate: and has no tier");
  const noParty = base(); noParty.party = null;
  has(G(noParty), "member profile is incomplete", "gate: nor is one with no party");
  const noDate = base(); noDate.date = "";
  has(G(noDate), "no vote date", "gate: nor is one with no vote date");
  const noCite = base(); noCite.verifyUrl = "";
  has(G(noCite), "no citation", "gate: nor is one a reader could not check");
  const noSaid = base(); noSaid.said = { text: "  " };
  has(G(noSaid), "no stated position", "gate: nor is one with nothing on the said side");

  // The four trust criteria, re-asserted on the finished text.
  const leaky = base(); leaky.facts = "Cuts spending. Weighted 60 rather than 100. — House · passed";
  has(G(leaky), "curator housekeeping", "gate: housekeeping in the finished facts is caught at the door");
  const circular = base(); circular.said = { text: "Voted for the Laken Riley Act.", word: "Supports" };
  has(G(circular), "reads as a vote", "gate: a stance that is itself a vote is caught at the door");
  const held = base(); held.issueKey = "checks_balances";
  has(G(held), "held", "gate: an umbrella issue key is not public");
  const mismatch = base(); mismatch.issueKey = "tech_balance"; mismatch.measureNumber = "S. 1582";
  has(G(mismatch), "held out of wave 1", "gate: a topical mismatch is not public");

  // The starter five must survive the gate on the test fixture's own terms:
  // the gate is a filter over cardsFor, never a separate list that can drift.
  const built = RC.cardsFor("testrep");
  const gated = RC.publicCardsFor("testrep");
  ok(gated.length <= built.length, "gate: the public set is a subset of the built set");
  gated.forEach(c => eq(G(c), "", "gate: every card it returns passes it — " + c.issueKey));
  // Core before thin, so a surface taking the first card takes the strongest.
  const tiers = gated.map(T);
  ok(tiers.indexOf("thin") === -1 || tiers.indexOf("core") === -1 ||
     tiers.lastIndexOf("core") < tiers.indexOf("thin"),
    "gate: core cards are offered before thin ones");
}

// ══ 8. THE SPLIT CARD ════════════════════════════════════════════════════════
// The third shape. A row whose formal record runs BOTH ways is the deepest thing
// the product owns and, until now, the one finding that could not leave the app:
// the two single-sided cards are both refused on it by guard 9, correctly, because
// neither of them is what the record says. The split card says what the record
// says — and it is allowed to exist only where TWO votes, one per side, each clear
// the identical chain a single-sided card's one vote has to clear.
//
// So these assertions are mostly about what the card CANNOT do. It cannot appear
// on a row that is not mixed; it cannot appear with evidence on one side only; it
// cannot cite a vote a one-sided card would have been refused for citing; and it
// cannot print a percentage, which is the one way a split could quietly become a
// second score sitting next to Direction Match.
{
  const splitAudit = RC.audit("splitrep");
  const sRow = (issueKey, want) =>
    splitAudit.find((a) => a.issueKey === issueKey && a.want === want) || null;
  const sReason = (issueKey, want) => { const r = sRow(issueKey, want); return r ? r.reason : "(no such candidate)"; };
  const sEligible = (issueKey, want) => { const r = sRow(issueKey, want); return !!(r && r.eligible); };

  // ── Mixed-only eligibility ──────────────────────────────────────────────────
  // The candidate is offered off the engine's own net verdict, so a row that is
  // not split never sees one — there is no separate "is this interesting enough"
  // judgement that could drift.
  ok(auditRows.every((r) => r.want !== "mixed"),
    "split: a member with no mixed row is offered no split candidate at all");
  eq(sRow("national_debt", "mixed") && sRow("national_debt", "mixed").netVerdict, "mixed",
    "split: the fixture row is genuinely split on the engine's own reckoning");
  ok(sEligible("national_debt", "mixed"), "split: a deep two-directional row is eligible");
  // And the reverse: the two single-sided cards are still refused on that same
  // row, by the same guard 9 that refused them before this shape existed. The
  // split card is an addition, not a loophole around verdict stability.
  for (const want of ["contradicts", "consistent"]) {
    ok(!sEligible("national_debt", want),
      `split: guard 9 still refuses the ${want} card on a split row`);
  }
  has(sReason("national_debt", "contradicts"), "net record verdict",
    "split: and still says why — the profile this card links to does not say contradicts");
  // The consistent candidate on this row is stopped one guard EARLIER: the top
  // with-side vote is a nomination, so guard 1 refuses it before the verdict is
  // ever consulted. Both refusals are correct and neither is reachable only by
  // accident of the fixture, so guard 9 is also asserted on its own below.
  has(sReason("national_debt", "consistent"), "confirmation vote",
    "split: the consistent card on that row is refused earlier still, by guard 1");
  for (const want of ["contradicts", "consistent"]) {
    has(RC.guards.stableVerdict({ netVerdict: "mixed" }, want), "net record verdict",
      `split: a mixed net record refuses the ${want} card outright`);
  }
  has(RC.guards.stableVerdict({ netVerdict: "consistent" }, "mixed"), "net record verdict",
    "split: guard 9 refuses a split card on a row the record does not call split");
  eq(RC.guards.stableVerdict({ netVerdict: "mixed" }, "mixed"), "",
    "split: and passes only where the net verdict is mixed");

  // ── Both-sides evidence ─────────────────────────────────────────────────────
  // climate_action is split on the numbers and has exactly one contradicting
  // item: a confirmation vote. Guard 1 refuses it, there is nothing to step down
  // to, and a "split" card citing one side and asserting the other is a one-sided
  // card wearing a fairer name — so there is no card.
  eq(sRow("climate_action", "mixed") && sRow("climate_action", "mixed").netVerdict, "mixed",
    "split: the second fixture row is split too, so the refusal below is about the evidence");
  ok(!sEligible("climate_action", "mixed"),
    "split: a split row with no citable vote on one side yields no card");
  has(sReason("climate_action", "mixed"), "the against-side example",
    "split: and the audit names WHICH side had nothing to cite");
  has(sReason("climate_action", "mixed"), "confirmation vote",
    "split: with the guard that refused it, verbatim — the guard was applied, not waived");
  eq(RC.find("splitrep", "climate_action"), null, "split: and no card is built for it");

  // The step-down, directly. The heaviest with-side vote on national_debt is a
  // nomination; the card must reach past it to the strongest CITABLE vote rather
  // than either citing it or giving up. Every candidate goes through the same
  // item chain — this is the difference between "the top item is uncitable so
  // nothing travels" and "the strongest citable item travels".
  {
    const pos = ctx.window._polPositionMap("splitrep", ctx.PROFILES.splitrep) || {};
    const nd = pos.national_debt;
    const items = SPLIT_RECORDS.filter((r) => r.issues.some((i) => i.issueKey === "national_debt"));
    const pick = (side) =>
      RC.strongestCitable("splitrep", "national_debt", nd, SPLIT_RECORDS, items, nd.stance, side);
    const w = pick("with"), a = pick("against");
    eq(w.item && w.item.number, "S. 82", "split: the with side steps down past the nomination to a bill");
    ok(w.steppedDown, "split: and reports that it stepped down rather than pretending it was the top item");
    eq(a.item && a.item.number, "S. 1024", "split: the against side cites its top item, which is already citable");
    eq(a.steppedDown, false, "split: and does not claim a step-down it did not make");
    eq(w.blocked, "", "split: a side with a citable vote reports no refusal");
    // The item chain is the SAME one the single-sided cards use — asserted by
    // running it against the vote the step-down skipped.
    has(RC.itemBlock("splitrep", "national_debt", nd, SPLIT_RECORDS.find((r) => r.number === "PN 200"), SPLIT_RECORDS),
      "confirmation vote", "split: the skipped vote is skipped BECAUSE the shared chain refuses it");
    eq(RC.itemBlock("splitrep", "national_debt", nd, SPLIT_RECORDS.find((r) => r.number === "S. 82"), SPLIT_RECORDS), "",
      "split: and the vote it settled on passes that same chain outright");
  }

  // ── The card ────────────────────────────────────────────────────────────────
  const split = RC.find("splitrep", "national_debt");
  ok(!!split, "split: the eligible row builds a card");
  if (split) {
    eq(split.verdict.key, "mixed", "split: it carries its own verdict, not a softened contradiction");
    has(split.verdict.label, "Split Record", "split: labelled as a split record on its face");
    // The finding, in the form a reader can repeat. Counts, not a ratio.
    has(split.headline, "voted with their stated position 2 times and against it 1 time",
      "split: the headline teaches the split in the form the ticket asked for");
    eq(split.sides.counts.with, 2, "split: the with count is the engine's own");
    eq(split.sides.counts.against, 1, "split: and so is the against count");
    eq(split.sides.counts.with, split.recordSummary.consistent,
      "split: the printed counts are the row's counts — nothing is recounted for the card");
    eq(split.sides.counts.against, split.recordSummary.contradicts,
      "split: on both sides");
    eq(split.recordSummary.netVerdict, "mixed", "split: and the card agrees with the row it links to");

    // One named, dated, sourced example on each side.
    eq(split.sides.with.number, "S. 82", "split: a named measure on the with side");
    eq(split.sides.against.number, "S. 1024", "split: and a different one on the against side");
    for (const [side, face] of [["with", split.sides.with], ["against", split.sides.against]]) {
      ok(/^\d{4}-\d{2}-\d{2}$/.test(face.date), `split: the ${side}-side example is dated`);
      has(face.url, "senate.gov", `split: and addressed at the chamber's own record`);
      ok(!!face.proof, `split: and says how the member voted on it`);
      ok(face.verify && face.verify.length <= 96,
        `split: the ${side}-side address prints whole, un-elided (${face.verify})`);
    }
    ok(split.sides.with.url !== split.sides.against.url,
      "split: two votes means two addresses — a split citing one page twice is one vote");

    // Never the nomination, anywhere on the card.
    lacks(JSON.stringify(split), "PN 200",
      "split: the vote guard 1 refuses is nowhere on the finished card");
    eq(split.measureNumbers.join(" & "), "S. 82 & S. 1024",
      "split: both cited measures travel, so the wave-1 pair holds can be re-checked against each");

    // The footer address. No government page is the record of two roll calls, so
    // the card's own address is the issue record that holds both — and each
    // vote's chamber address is printed beside it on the image regardless.
    has(split.source.url, "#record=splitrep", "split: the footer points at the record that holds both votes");
    has(split.source.url, "national_debt", "split: on this issue specifically, not the member's homepage");
    ok(split.verifyUrl && split.verifyUrl.length <= 96,
      `split: and prints as an address a reader can retype (${split.verifyUrl})`);
    eq(split.date, "2025-03-11 – 2025-06-24",
      "split: the footer date spans both votes rather than misattributing one to the other");
    eq(split.origin, "official_record", "split: it is a formal-record card like every other one here");

    // ── No second score ──────────────────────────────────────────────────────
    // The single hardest rule on this shape: counts are countable things, and a
    // percentage of the record would read as a PolitiDex number sitting next to
    // Direction Match. There is one score.
    const surfaces = {
      headline: split.headline, facts: split.facts,
      caption: R._caption(split), post: R._tweetText(split),
    };
    for (const [where, text] of Object.entries(surfaces)) {
      lacks(text, "%", `split: no percentage reaches the ${where}`);
      ok(!/\b\d+\s*(?:percent|pct)\b/i.test(text), `split: nor a percentage spelled out in the ${where}`);
    }
    // The card says outright why its counts and its two examples differ, rather
    // than letting a reader assume the counts describe only the votes shown.
    has(split.facts, "every judged vote", "split: the card says the counts cover the whole judged record");
    has(split.facts, "strongest we can cite", "split: and that the examples are the strongest citable ones");

    // ── The text half of the share ───────────────────────────────────────────
    const cap = R._caption(split);
    has(cap, "🏛️ OFFICIAL RECORD — ", "split caption: same marker as every record card");
    has(cap, "\nTheir stated position: ", "split caption: the said side the verdict is computed against");
    has(cap, "Voted with their position: ", "split caption: the with-side example is labelled");
    has(cap, "Voted against it: ", "split caption: and so is the against-side one");
    has(cap, split.sides.with.url, "split caption: carrying the with-side chamber address in full");
    has(cap, split.sides.against.url, "split caption: and the against-side one");
    has(cap, "\nCheck it yourself: https://politidex.fyi/#record=splitrep",
      "split caption: and the path back to the record that holds both");
    has(cap, "How this is judged: politidex.fyi/#methodology", "split caption: with the method link");

    const post = R._tweetText(split);
    ok(post.indexOf("🏛️ OFFICIAL RECORD") === 0, "split post: marked as Official Record");
    has(post, "\nVoted with: " + split.sides.with.url, "split post: both government addresses travel, labelled by side");
    has(post, "\nVoted against: " + split.sides.against.url, "split post: neither side is the one left unfootnoted");
    has(post, "\nCheck: https://politidex.fyi/#record=splitrep", "split post: alongside the path back to the receipt");
    has(post, "\nSaid: ", "split post: the stated position survives the two extra addresses");
    has(post, "\nDid: ", "split post: and so does what the member actually did");
    has(post, "and against it", "split post: which is stated as both sides, not as one");
    // Two chamber addresses cost ~170 characters on a Senate row. The overrun is
    // bounded by the same content floors as every other record post.
    ok(post.length <= 560, `split post: the overrun stays bounded (${post.length})`);
  }

  // ── What the image actually paints ──────────────────────────────────────────
  // The caption and the post are text and were asserted above. The image is the
  // half most people will ever see, and a split card is the one shape where the
  // evidence can be crowded off the bottom by a long bill title — so the real
  // renderer is run against a recording context and the output is read back.
  if (split) {
    const painted = [];
    const grad = { addColorStop() {} };
    const fake2d = {
      canvas: { width: 1080, height: 1350 }, font: "", fillStyle: "", strokeStyle: "",
      lineWidth: 0, globalAlpha: 1, textBaseline: "", textAlign: "",
      // Deliberately pessimistic: 12px per character is wider than Barlow at any
      // of the sizes used here, so anything that fits under this measurement fits
      // on the real canvas.
      measureText: (s) => ({ width: String(s).length * 12 }),
      fillText: (s, _x, y) => painted.push({ s: String(s), y }),
      strokeText() {}, fillRect() {}, strokeRect() {}, clearRect() {},
      beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, arcTo() {},
      quadraticCurveTo() {}, bezierCurveTo() {}, rect() {}, fill() {}, stroke() {},
      clip() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
      setTransform() {}, drawImage() {},
      createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => null,
    };
    const realCreate = ctx.document.createElement;
    ctx.document.createElement = (tag) => {
      const el = realCreate(tag);
      if (String(tag).toLowerCase() === "canvas") {
        el.width = 0; el.height = 0;
        el.getContext = () => fake2d;
        el.toBlob = (cb) => cb(null);
      }
      return el;
    };
    await R.renderImage(split).catch(() => {});   // the blob is not the point; the paint log is
    ctx.document.createElement = realCreate;

    const FOOT_TOP = 1350 - 64 - 96 - (30 + 28);  // IMG_H − PAD − footer − verify/method reserve
    const drew = (needle) => painted.filter((p) => p.s.indexOf(needle) > -1);
    ok(painted.length > 0, "split image: the renderer ran and painted something");
    const evidence = [
      ["VOTED WITH THEIR POSITION  ·  2 TIMES", "the with-side label carries its count"],
      ["VOTED AGAINST IT  ·  1 TIME", "the against-side label carries its count, singular"],
      ["S. 82", "the with-side measure is named"],
      ["Federal Spending Cap Act", "with its title"],
      ["S. 1024", "the against-side measure is named"],
      ["Emergency Supplemental Appropriations Act", "with its title"],
      [split.sides.with.verify, "the with-side chamber address is printed on the image"],
      [split.sides.against.verify, "the against-side chamber address is too"],
    ];
    for (const [needle, why] of evidence) {
      const hits = drew(needle);
      ok(hits.length > 0, `split image: ${why} (${needle})`);
      hits.forEach((p) => ok(p.y < FOOT_TOP,
        `split image: and is painted above the footer rule, not over it (${needle} at y=${p.y})`));
    }
    // The caveat is the honesty of this card, so it gets reserved room rather
    // than whatever is left — printed once, whole, above the footer.
    const note = drew("Counts cover every judged vote");
    eq(note.length, 1, "split image: the counts caveat is painted exactly once, not also as a fact block");
    if (note.length) {
      ok(note[0].y < FOOT_TOP, `split image: and above the footer rule (y=${note[0].y})`);
      lacks(note[0].s, "…", "split image: and whole — an ellipsized caveat is a caveat that did not travel");
    }
    // No percentage survives into the pixels either.
    painted.forEach((p) => lacks(p.s, "%", "split image: nothing painted on the card is a percentage"));
  }

  // ── The public gate ─────────────────────────────────────────────────────────  // The gate re-asserts the both-sides rule on the FINISHED card, because this is
  // the last place to catch a renderer or a caller that produced a one-sided
  // "split" — and the last place to catch a percentage.
  {
    const G = RC.publicShareBlock;
    eq(G(split), "", "split gate: a complete split card is public");
    eq(RC.publicTier(split), "core", "split gate: three judged votes make it core");

    const oneSided = JSON.parse(JSON.stringify(split)); oneSided.sides.against = null;
    has(G(oneSided), "missing the cited vote on one side",
      "split gate: a split card with one side missing is refused at the door");
    const noAddr = JSON.parse(JSON.stringify(split)); noAddr.sides.with.url = "";
    has(G(noAddr), "no citation a reader could follow",
      "split gate: nor one whose example a reader could not check");
    const pct = JSON.parse(JSON.stringify(split)); pct.headline = "Voted with their position 67% of the time.";
    has(G(pct), "second score",
      "split gate: nor one that prints a share of the record as a percentage");
    const leaky = JSON.parse(JSON.stringify(split));
    leaky.sides.against.effect = "Adds to the deficit. Weighted 60 rather than 100.";
    has(G(leaky), "curator housekeeping",
      "split gate: the housekeeping check reads the both-sides text too, not only the fact block");
  }

  // ── Nothing else moved ──────────────────────────────────────────────────────
  // The whole existing pipeline is untouched: the single-sided cards still build
  // for the members that earn them, none of them grew a `sides` field, and no
  // split card appeared anywhere a mixed row did not exist.
  const splitCards = RC.cardsFor("splitrep");
  eq(splitCards.length, 1, "split: one card per member×issue still holds — the split row gets one card, not three");
  eq(RC.contradiction("splitrep"), null, "split: a split row does not also emit a contradiction card");
  eq(RC.consistency("splitrep"), null, "split: nor a consistency card");
  const testCards = RC.cardsFor("testrep");
  ok(testCards.length > 0, "split: the existing member still builds cards");
  testCards.forEach((c) => {
    ok(c.verdict.key === "contradicts" || c.verdict.key === "consistent",
      `split: existing cards keep their own verdicts (${c.issueKey} → ${c.verdict.key})`);
    ok(!c.sides, `split: and carry no both-sides block (${c.issueKey})`);
    has(R._caption(c), "\nSource: ", `split: and still print their single source line (${c.issueKey})`);
  });
  ok(!!RC.contradiction("testrep") && !!RC.consistency("testrep"),
    "split: both single-sided entry points still return a card");
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMAL INSTRUMENTS BEYOND FLOOR VOTES
// ───────────────────────────────────────────────────────────────────────────
// The record system has always scored more than roll calls: a signed law, a
// veto, an issued executive order, a cosponsorship, a court filing. Direction
// Match reads all of them today, through the same `supports` boolean, and none
// of them could leave the app. What follows pins the exit being opened without
// the wall coming down with it — every shared item says what KIND of act it is,
// and a supporting act is never dressed in the language of a deciding one.
// ═══════════════════════════════════════════════════════════════════════════
{
  // ── The table itself ──────────────────────────────────────────────────────
  const I = RC.INSTRUMENTS, of = RC.instrumentOf;
  eq(I.vote.strength, "deciding", "instruments: a recorded floor vote is a deciding act");
  for (const k of ["signed", "vetoed", "issued"]) {
    eq(I[k].strength, "deciding", `instruments: ${k} has legal effect, so it is a deciding act`);
  }
  for (const k of ["sponsor", "cosponsor", "statement", "amicus", "plaintiff", "committee_vote"]) {
    eq(I[k].strength, "supporting", `instruments: ${k} is on the record and decides nothing, so it is a supporting act`);
    ok(/\bnot\b/.test(I[k].note),
      `instruments: and carries a sentence saying what it is NOT, onto every card that uses it (${k})`);
  }
  eq(of(null), null, "instruments: nothing is not an instrument");
  eq(of({ kind: "position", actionType: "vibes" }), null,
    "instruments: an action type this file cannot name honestly is not an instrument");
  eq(of({ kind: "position", actionType: "vote" }), null,
    "instruments: and a `position` row may not claim to be a floor vote");
  eq(of({ kind: "vote" }).key, "vote", "instruments: a roll call is one");
  // The executive documents are named individually, off the number the record
  // already stores — a proclamation is not an executive order and the card says
  // which it is.
  eq(of({ kind: "position", actionType: "issued", number: "Executive Order 14165" }).label,
    "Issued executive order", "instruments: an EO is named as an EO");
  eq(of({ kind: "position", actionType: "issued", number: "Proclamation 11043" }).label,
    "Issued proclamation", "instruments: a proclamation is named as a proclamation");
  eq(of({ kind: "position", actionType: "issued", number: "Presidential Memorandum of March 1" }).label,
    "Issued presidential memorandum", "instruments: and a memorandum as a memorandum");
  eq(of({ kind: "position", actionType: "issued", number: "" }).label, "Issued executive action",
    "instruments: an issued document the number does not identify falls back to the general label, not to a guess");

  // ── Worked example 1 · a HARD act: signed into law ────────────────────────
  const signed = RC.find("actrep", "lower_taxes");
  ok(!!signed, "hard act: a signed law with an identity, a date and a source builds a card");
  if (signed) {
    eq(signed.instrument.label, "Signed into law", "hard act: the card names the instrument");
    eq(signed.instrument.strength, "deciding", "hard act: and records that it is a deciding one");
    eq(signed.verdict.key, "consistent", "hard act: the verdict key is the engine's, unchanged");
    eq(signed.verdict.label, "Action Matched The Words",
      "hard act: and the stamp is said in the language of an act, not of a vote");
    has(signed.headline, "Signed into law", "hard act: the headline says what was done");
    lacks(signed.headline, "Voted", "hard act: and never says it was voted");
    eq(signed.didLine, "Signed H.R. 5371 into law", "hard act: the short form a post has room for");
    eq(signed.source.url, "https://www.congress.gov/bill/119th-congress/house-bill/5371",
      "hard act: the citation is the stored document, not a derived roll-call address");
    eq(RC.publicShareBlock(signed), "", "hard act: and it clears the public gate");
    const cap = R._caption(signed);
    has(cap, "What kind of act this is: Signed into law",
      "hard act caption: fact slot 0 is labelled for what it holds");
    lacks(cap, "What a Yea did", "hard act caption: which is not the disapproval label");
    lacks(cap, "came before the vote", "hard act caption: nor does the undated-stance note call it a vote");
    has(cap, "came before the act.", "hard act caption: it calls it an act");
    has(R._tweetText(signed), "Did: Signed H.R. 5371 into law",
      "hard act post: the act leads the Did line, with the measure after it");
  }

  // A hard act whose own address is longer than the footer line can set. The
  // receipt is real, so the card is not thrown away over typography: the footer
  // prints the PolitiDex record page — which cites the document by name and by
  // address — and the document's own address travels in the caption at full
  // length, exactly as the two-address split card already does.
  const eo = RC.find("actrep", "border_security");
  ok(!!eo, "hard act: an executive order builds a card");
  if (eo) {
    eq(eo.instrument.label, "Issued executive order", "hard act: named from the document number");
    eq(eo.verifyUrl, "politidex.fyi/#record=actrep~border_security",
      "hard act: an unprintable document address falls back to the record page, never to an ellipsis");
    has(eo.source.url, "federalregister.gov",
      "hard act: and the document itself stays the card's source");
    has(R._caption(eo), eo.source.url,
      "hard act caption: so the Federal Register address travels in full where there is room for it");
    eq(RC.publicShareBlock(eo), "", "hard act: it is public");
  }

  // ── Worked example 2 · a SOFT act: a cosponsorship ────────────────────────
  const soft = RC.find("actrep", "school_choice");
  ok(!!soft, "soft act: a sourced, dated cosponsorship builds a card");
  if (soft) {
    eq(soft.instrument.label, "Cosponsored", "soft act: the card names the instrument");
    eq(soft.instrument.strength, "supporting",
      "soft act: and records that it decides nothing — this is the wall, in a field");
    has(soft.instrument.note, "It is not a vote on it.",
      "soft act: the sentence that keeps it from reading as a deciding vote is on the card");
    eq(soft.didLine, "Cosponsored S. 331", "soft act: the short form says what was done");
    eq(soft.factParts[0], soft.instrument.note,
      "soft act: and the note is in the protected fact slot, so the line budget can never drop it");
    // The whole of the copy this file composes, checked for the vocabulary of a
    // roll call. The measure title and the curated rationale are quoted, not
    // written here, so they are not in scope — a bill named the Voting Rights
    // Act is not this card calling a cosponsorship a vote.
    const composed = [soft.headline, soft.verdict.label, soft.didLine, soft.instrument.label].join(" · ");
    ok(!RC.guards.voteWordRe.test(composed),
      "soft act: no line this file wrote about a cosponsorship uses vote language");
    eq(RC.publicShareBlock(soft), "", "soft act: it clears the public gate");
    eq(RC.publicTier(soft), "thin",
      "soft act: on a one-item record it ships as thin, the same as a one-vote record does");
    const cap = R._caption(soft);
    has(cap, "What kind of act this is: Cosponsoring puts a name to a bill",
      "soft act caption: the reader is told what kind of act this is before anything else about it");
    lacks(cap, "Voted", "soft act caption: and is never told they voted");
    has(R._tweetText(soft), "Did: Cosponsored S. 331",
      "soft act post: the post says cosponsored, in the one line it has for what happened");
  }

  // The gate is the backstop, not the wording. A card that somehow reached it
  // with vote language over a soft act is refused there too.
  if (soft) {
    const faked = JSON.parse(JSON.stringify(soft));
    faked.headline = "S. 331 · On Passage · Voted Yea";
    has(RC.publicShareBlock(faked), "worded as a floor vote",
      "soft act gate: vote language over a supporting act does not leave the building");
    const unlabelled = JSON.parse(JSON.stringify(soft));
    unlabelled.instrument.note = "";
    has(RC.publicShareBlock(unlabelled), "differs from a deciding floor vote",
      "soft act gate: nor does a soft act with the note stripped off it");
    const partyframed = JSON.parse(JSON.stringify(soft));
    partyframed.headline = "S. 331 · Cosponsored, broke with their party to do it";
    has(RC.publicShareBlock(partyframed), "party behaviour",
      "gate: and no card frames a formal act as party behaviour, on any instrument");
    const undated = JSON.parse(JSON.stringify(soft));
    undated.date = "";
    ok(!!RC.publicShareBlock(undated),
      "soft act gate: a date is 'when available' to BUILD and required to SHIP — an undated act is never published");
  }

  // ── The split card, when one side is not a vote ───────────────────────────
  const both = RC.find("actrep", "national_debt");
  ok(!!both, "mixed act split: a row with a roll call on one side and a signature on the other builds");
  if (both) {
    eq(both.verdict.key, "mixed", "mixed act split: the verdict key is the engine's, unchanged");
    eq(both.verdict.label, "Split Record · Acted Both Ways",
      "mixed act split: said in the language of an act, because one of the two is not a vote");
    has(both.headline, "acted in line with their stated position",
      "mixed act split: so is the counted headline — the counts cover both items, not two votes");
    lacks(both.headline, "voted", "mixed act split: which is why it does not say voted");
    eq(both.sides.with.instrument.key, "vote", "mixed act split: the with side is the roll call");
    eq(both.sides.against.instrument.key, "signed", "mixed act split: the against side is the signature");
    eq(both.sides.with.head, undefined,
      "mixed act split: a side that IS a vote keeps the label it has always had");
    eq(both.sides.against.head, "ACTED AGAINST IT",
      "mixed act split: and only the side that is not a vote is relabelled");
    eq(both.instrument.strength, "deciding",
      "mixed act split: a signature and a roll call are both deciding acts, so the card says so");
    has(both.countsNote, "every judged action",
      "mixed act split: the counts caveat counts actions, because that is what the counts cover");
    const cap = R._caption(both);
    has(cap, "Voted with their position: H.R. 900",
      "mixed act split caption: the vote side is introduced as a vote");
    has(cap, "Acted against it: H.R. 1200 · Signed into law",
      "mixed act split caption: and the signature as a signature");
    has(cap, "every judged action", "mixed act split caption: with the counts caveat that matches");
    const post = R._tweetText(both);
    has(post, "\nVoted with: " + both.sides.with.url,
      "mixed act split post: both addresses travel, each labelled for what it is");
    has(post, "\nActed against: " + both.sides.against.url,
      "mixed act split post: neither side is the one left unfootnoted, and neither is mislabelled");
    has(post, "Did: Acted in line with their position 1× (H.R. 900) and against it 1× (H.R. 1200)",
      "mixed act split post: the Did line counts both items without calling either a vote");
  }

  // ── A pure-vote split is untouched ────────────────────────────────────────
  // The same code path, on a row whose two sides are both roll calls, must
  // produce exactly the strings it produced before any of this existed.
  const voteSplit = RC.find("splitrep", "national_debt");
  if (voteSplit) {
    eq(voteSplit.verdict.label, "Split Record · Voted Both Ways",
      "vote split: an all-roll-call split keeps the vote stamp");
    has(voteSplit.headline, "voted with their stated position",
      "vote split: and the vote headline");
    eq(voteSplit.didLine, "", "vote split: and supplies no act line, so the post builds its own as before");
    eq(voteSplit.instrument.key, "vote", "vote split: the card is about votes");
    has(R._caption(voteSplit), "Counts cover every judged vote on this issue",
      "vote split caption: with the counts caveat unchanged, word for word");
    has(R._tweetText(voteSplit), "\nVoted with: ", "vote split post: and the side labels unchanged");
  }

  // ── The walls ─────────────────────────────────────────────────────────────
  // 1 · Direction Match. Opening the exit changed no score, and the reason it
  // changed none is that the engine was already reading these instruments: the
  // summary it produces for a row of acts is the same object the card reports,
  // computed by the shared engine and not by this file.
  const actSummary = ctx.window._issueRecordSummary(
    "lower_taxes", "support",
    ACT_RECORDS.filter((r) => (r.issues || []).some((m) => m.issueKey === "lower_taxes")));
  eq(actSummary.total, 1, "score path: the engine judges a signed law exactly as it did before this pass");
  eq(actSummary.consistent, 1, "score path: and counts it on the side its `supports` boolean puts it");
  if (signed) {
    eq(signed.recordSummary.total, actSummary.total,
      "score path: the card reports the engine's count rather than one of its own");
    eq(signed.recordSummary.netVerdict, actSummary.netVerdict, "score path: and the engine's verdict");
  }
  // 2 · No party framing, anywhere, on any built card.
  for (const pid of ["testrep", "splitrep", "actrep"]) {
    for (const c of RC.cardsFor(pid)) {
      const composed = [c.headline, c.verdict.label, c.didLine, c.countsNote, c.recordLabel,
        c.instrument && c.instrument.label, c.instrument && c.instrument.note]
        .filter(Boolean).join(" · ");
      ok(!RC.guards.partyFrameRe.test(composed),
        `walls: no party framing in the copy this file composes (${pid} · ${c.issueKey})`);
    }
  }
  // 3 · A supporting act never outranks a deciding one for the single card a
  // member × issue gets. Ranking is where a silent upgrade would happen.
  const ranked = RC.candidates("actrep").filter((c) => !c.blocked);
  let seenSupporting = false;
  for (const c of ranked) {
    const ins = c.item ? RC.instrumentOf(c.item) : null;
    const supporting = !!ins && ins.strength === "supporting";
    if (supporting) seenSupporting = true;
    else ok(!seenSupporting,
      "walls: every deciding act is ranked above every supporting one, so a cosponsorship cannot take the slot a vote would fill");
  }

  // ── Fail closed ───────────────────────────────────────────────────────────
  // A disapproval-style measure carried by anything other than a roll call. The
  // curators' only plain-English sentence says what a YEA did; nothing on file
  // says what a signature on the same resolution did, and this file does not
  // write one.
  has(RC.guards.blockPlainEffect({ kind: "position", actionType: "signed", number: "H.J.Res. 88",
    title: "Disapproving the rule submitted by the Environmental Protection Agency",
    issues: [{ issueKey: "climate_action", weight: 90, supportMeaning: "yea_opposes",
      rationale: "A yea rolls back a major state climate rule." }] }, "climate_action"),
    "it cannot state what this act did",
    "fail closed: a disapproval resolution carried by a signature is refused, not narrated");
  // The citation rules are the vote rules, applied to a document.
  const C0 = RC.citationFor;
  eq(C0({ kind: "position", actionType: "signed", number: "H.R. 1",
    source: { url: "http://example.gov/law" } }), null,
    "fail closed: a document cited over plain http is not an address a reader could trust");
  eq(C0({ kind: "position", actionType: "signed", number: "H.R. 1",
    source: { url: "https://api.congress.gov/v3/bill/119/hr/1" } }), null,
    "fail closed: nor is an API endpoint a reader cannot open");
  eq(C0({ kind: "position", actionType: "signed", number: "H.R. 1",
    source: { url: "https://www.congress.gov/bill?x=1" } }), null,
    "fail closed: nor one carrying a query a strip would silently change");
  eq(C0({ kind: "position", actionType: "signed", number: "H.R. 1",
    source: { url: "https://www.congress.gov/bill/119th-congress/house-bill/1" } }).print,
    "congress.gov/bill/119th-congress/house-bill/1",
    "fail closed: a clean https document address is printed with the scheme stripped and nothing else");

  // ── Arrival ───────────────────────────────────────────────────────────────
  // A shared act opens the same politician × issue Official Record the card is
  // about — the same round trip a vote card makes, on the real router.
  {
    const calls = [];
    const C = ctx.window.PDXConsistency;
    const realOpen = C.openGap;
    const realHash = ctx.location.hash;
    try {
      C.openGap = function (pid, issue) { calls.push([pid, issue]); };
      for (const c of RC.cardsFor("actrep")) {
        calls.length = 0;
        ctx.location.hash = c.hash;
        RC.handleHash();
        eq(JSON.stringify(calls), JSON.stringify([[c.pid, c.issueKey]]),
          `arrival: an act card's link opens its own politician × issue record (${c.issueKey})`);
      }
    } finally {
      C.openGap = realOpen;
      ctx.location.hash = realHash;
    }
  }
}

// Reading the record must not mutate it.
const recBefore = JSON.stringify(RECORDS);
RC.audit("testrep"); RC.cardsFor("testrep"); RC.omnibus("testrep", "H.R. 1");
eq(JSON.stringify(RECORDS), recBefore, "honesty: building cards never mutates the record it read");

// ── Report ────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`✖ ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  • " + f);
  process.exit(1);
}
console.log(`✓ ${passed} assertions passed — vote-derived share cards + trust guards`);

