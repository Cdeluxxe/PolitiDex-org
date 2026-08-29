#!/usr/bin/env node
/**
 * test-issue-page.mjs — /issue/<key> is a list of acts, not a league table
 * ─────────────────────────────────────────────────────────────────────────────
 * Tapping 🏠 Housing Affordability — on a bill's letterhead or on a person's
 * brief — used to land on the ranked overlay of PEOPLE, and when the key had no
 * curated core of its own that overlay widened it into whichever core sorted
 * first. So the one question the chip asks ("which acts in the archive actually
 * moved this issue?") had no page at all, and asking it got you one member's
 * dossier on an unrelated topic.
 *
 * issue-page.js is that page. This file is the fence around it:
 *
 *   1. THE GATE. One page per VOCABULARY KEY. A slug that is not a key is
 *      refused, which is what leaves /issue/<spotlight-slug> to the spotlight.
 *   2. ABOVE THE FOLD IS BORROWED COPY AND COUNTS. The chip, the locked scope
 *      sentence and the ⓘ are issue-scope.js's, byte for byte. The counts are
 *      counts of rows on the page — and there is NO percentage.
 *   3. THE LIST IS EVERY MAPPING. Number, short title, subject-of-the-bill or
 *      rode-inside, chamber · last roll date · Yea–Nay, and a door to the bill.
 *      Nothing is truncated, no rider is hidden, no package is discounted.
 *   4. THE SORT. Subject first, then newest roll, and an unvoted mapped act
 *      still on the list rather than sorted out of existence.
 *   5. THE EMPTY KEY SAYS SO. "No mapped measure on file yet" plus the scope
 *      sentence, and NOT a backfill from the inline paint index.
 *   6. THE MEMBER BLOCK IS PUBLISHED POSITIONS ONLY, folded, grouped by what
 *      they published, carrying the tree's own pattern line — and never the
 *      Direction Match percentage that lives on the same leaf.
 *   7. THE WIRING. The bill chip, the person chip, the ⓘ card's door, the
 *      /issue/* router, and the browse route's last-roll field.
 *   8. MUTATION. Every fence above is driven against a deliberately broken
 *      copy of the module, and has to fail.
 *
 * ACCEPTANCE: /issue/housing lists H.R. 6644 as this bill's subject, plus every
 * other housing mapping. The measure's two housing-side facts are read out of
 * db/vr-issue-seed.json here, so this file fails if the seed stops saying them.
 *
 *   node scripts/test-issue-page.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = readFileSync(join(ROOT, "issue-page.js"), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} — missing ${JSON.stringify(needle)}`);
const hasNot = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg} — found ${JSON.stringify(needle)}`);
const section = (t) => console.log(`\n  · ${t}`);
const die = (msg) => { console.error(`✗ issue page: ${msg}`); process.exit(1); };
const flush = async () => { for (let i = 0; i < 12; i++) await new Promise((r) => setImmediate(r)); };

const KEY = "housing";

// ── THE ACCEPTANCE MEASURE, READ FROM THE SEED ──────────────────────────────
// Not retyped. The claim under test is "H.R. 6644 is listed as this bill's
// subject on /issue/housing", and the thing that makes it true is a mapping row
// in the shipped seed. Reading it here means the day that row changes, this file
// says so instead of passing against a copy of a fact that used to be.
const SEED = JSON.parse(readFileSync(join(ROOT, "db/vr-issue-seed.json"), "utf8"));
const SEED_6644 = (SEED.measures || []).find((m) => m && m.number === "H.R. 6644");
if (!SEED_6644) die("db/vr-issue-seed.json no longer carries H.R. 6644");
const SEED_HOUSING = (SEED_6644.issues || []).find((i) => i && i.issueKey === KEY);
if (!SEED_HOUSING) die("H.R. 6644 no longer carries a `housing` mapping in the seed");
if (!SEED_HOUSING.isPrimary) {
  die("H.R. 6644's `housing` mapping is no longer isPrimary — the acceptance sentence " +
      "('lists H.R. 6644 as this bill's subject') is a claim about that flag");
}
const SEED_PRIMARIES = (SEED_6644.issues || []).filter((i) => i.isPrimary).map((i) => i.issueKey);
if (SEED_PRIMARIES.length < 2) {
  die("H.R. 6644 no longer carries two primary mappings — the per-key lane read " +
      "(primaryIssueKeys, not primaryIssue) is what that case exists to fix");
}

// The browse-route payload as the Function now returns it. Facts are the shipped
// ones: id 88, the Senate's decisive roll (119/2 roll 53, 89-10, 2026-03-12) and
// the House concurrence, per db/vr-federal-mapping-seed-f2.json.
const M_6644 = {
  id: 88, number: "H.R. 6644", shortTitle: "21st Century ROAD to Housing Act",
  title: "21st Century Revitalizing Opportunity and Access to Development of Housing Act",
  chamber: "house", congress: 119, status: "enacted",
  primaryIssue: SEED_PRIMARIES[0],
  primaryIssueKeys: SEED_PRIMARIES,
  issueKeys: (SEED_6644.issues || []).map((i) => i.issueKey),
  isOmnibus: true, rollcallCount: 2, voteCount: 534,
  lastRoll: { chamber: "senate", voteDate: "2026-03-12T00:00:00.000Z", question: "On Passage of the Bill", result: "passed", yea: 89, nay: 10 },
  source: { url: SEED_6644.sourceUrl, label: "Congress.gov" },
};
// A PACKAGE that carried housing inside it. Newer roll than the acceptance
// measure on purpose: it is the row that proves the lane outranks the date.
const M_PKG = {
  id: 12, number: "H.R. 1", shortTitle: "One Big Beautiful Bill Act", chamber: "house", congress: 119,
  primaryIssue: "lower_taxes", primaryIssueKeys: ["lower_taxes"], issueKeys: ["lower_taxes", KEY],
  isOmnibus: true, rollcallCount: 1,
  lastRoll: { chamber: "house", voteDate: "2026-07-03T00:00:00.000Z", result: "passed", yea: 218, nay: 214 },
};
// A state measure whose housing mapping is the whole subject and which has no
// floor roll on file at all.
const M_UTAH = {
  id: 40, number: "H.B. 360", shortTitle: "Housing Attainability Amendments", chamber: "utah house",
  externalIds: { utahSession: "2025GS" }, primaryIssueKeys: [KEY], issueKeys: [KEY],
  isOmnibus: false, rollcallCount: 0, lastRoll: null,
};
// An older subject-lane roll, to pin "then by last roll (newest)" inside a lane.
const M_OLD = {
  id: 41, number: "S.B. 262", shortTitle: "Housing Affordability Modifications", chamber: "utah senate",
  externalIds: { utahSession: "2025GS" }, primaryIssueKeys: [KEY], issueKeys: [KEY],
  rollcallCount: 1,
  lastRoll: { chamber: "utah senate", voteDate: "2025-02-20T00:00:00.000Z", result: "passed", yea: 22, nay: 6 },
};
const PAYLOAD = [M_PKG, M_UTAH, M_6644, M_OLD]; // deliberately unsorted
const ALL_NUMBERS = PAYLOAD.map((m) => m.number);

function boot(src) {
  const win = makeSandbox();
  win.history = { pushState() {}, replaceState() {} };
  const ctx = vm.createContext(win);
  const files = [...ENGINE_FILES, "issue-colors.js", "issue-scope.js", "stance-tree.js"];
  for (const f of files) {
    vm.runInContext(readFileSync(join(ROOT, f), "utf8"), ctx, { filename: f });
  }
  vm.runInContext(src || SRC, ctx, { filename: "issue-page.js" });
  if (!win.PDXIssuePage) die("PDXIssuePage is unavailable after loading the module");
  return win;
}
// One page, rendered from a payload, through the module's own read path.
async function render(win, items, key) {
  win.PDXBills = {
    list: (f) => Promise.resolve({ items: items.slice(), page: f.page || 1, pageSize: 100, total: items.length, hasMore: false }),
    listSync: () => ({ items: [], _inline: true }),
    open() {},
  };
  const st = await win.PDXIssuePage.load(key || KEY);
  return { st, html: win.PDXIssuePage.bodyHtml(st) };
}

const WIN = boot();
const IP = WIN.PDXIssuePage;
const SCOPE = WIN.PDXIssueScope.read(KEY);
if (!SCOPE || !SCOPE.defined) die("issue-scope.js no longer carries a locked scope for `housing`");
const PAGE = await render(WIN, PAYLOAD);
const HTML = PAGE.html;
const ROWS = PAGE.st.rows;
const PEOPLE = PAGE.st.people;

// ── 1 · THE GATE ────────────────────────────────────────────────────────────
section("the gate: one page per vocabulary key");
ok(IP.has(KEY), "`housing` is a vocabulary key and the page refused it");
ok(IP.has("housing_build"), "`housing_build` is a key too — the page is per key, not per core issue");
ok(!IP.has("hr1-medicaid-cuts"), "a spotlight-shaped slug was accepted as an issue key");
ok(!IP.has(""), "an empty slug was accepted");
ok(!IP.has("not_a_real_issue_key"), "an unknown key was accepted");
ok(!IP.has("../secrets"), "a path-shaped slug was accepted");
eq(IP.open("not_a_real_issue_key"), false, "open() did not refuse a non-key");
eq(IP.open(""), false, "open() did not refuse an empty key");

// ── 2 · ABOVE THE FOLD ──────────────────────────────────────────────────────
section("above the fold: chip, the locked ⓘ prose, counts only");
has(HTML, SCOPE.label, "the chip does not carry the issue's own label");
has(HTML, SCOPE.chip, "the chip's position sentence is not the one issue-scope publishes");
has(HTML, SCOPE.inn, "the locked scope sentence is not the one issue-scope publishes");
has(HTML, 'data-pdxis-key="housing"', "the ⓘ control is not mounted beside the chip");
eq(IP.countsLine({ measures: 4, rolls: 3, people: 4 }),
  "4 measures on file · 3 with a floor roll · 4 readable member-rows",
  "the counts line is not the three counts in the stated order");
eq(IP.countsLine({ measures: 1, rolls: 1, people: 1 }),
  "1 measure on file · 1 with a floor roll · 1 readable member-row",
  "the counts line does not read singular for one of each");
const C = IP.counts(ROWS, PEOPLE);
eq(C.measures, PAYLOAD.length, "the measure count is not the number of rows on the page");
eq(C.rolls, PAYLOAD.filter((m) => m.lastRoll || m.rollcallCount > 0).length,
  "the floor-roll count is not the number of rows carrying a roll");
eq(C.people, PEOPLE.filter((p) => p.readable).length,
  "the member count is not the number of READABLE member rows");
has(HTML, IP.countsLine(C), "the counts line the page prints is not the one its own counter builds");
// No percentage, anywhere, in any form.
ok(!/\d\s*%/.test(HTML), "a percentage was printed on the page");
hasNot(HTML, "Direction Match", "Direction Match appears on the issue page");
hasNot(HTML, "pdxtree-pct", "the leaf's percentage slot leaked onto the page");
hasNot(HTML, "%</", "a percentage slot was rendered");

// ── 3 · THE LIST ────────────────────────────────────────────────────────────
section("the list: every mapping, one row");
for (const n of ALL_NUMBERS) has(HTML, `data-pdxip-bill="${n}"`, `${n} is mapped to this key and is not on the list`);
eq(ROWS.length, PAYLOAD.length, "the list is not every mapped measure");
has(HTML, "21st Century ROAD to Housing Act", "the row carries no short title");
// The acceptance sentence, as one assertion: 6644 is here AND it is the subject.
const R6644 = ROWS.find((r) => r.number === "H.R. 6644");
ok(!!R6644, "H.R. 6644 is not on /issue/housing");
eq(R6644.subject, true, "H.R. 6644 is not labelled this bill's subject on /issue/housing");
eq(IP.SUBJECT, "this bill’s subject", "the subject lane is not worded as the bill face words it");
eq(IP.RODE, "rode inside", "the rider lane is not worded as the bill face words it");
has(IP.rowHtml(R6644), IP.SUBJECT, "the subject row does not print the subject label");
const RPKG = ROWS.find((r) => r.number === "H.R. 1");
eq(RPKG.subject, false, "a package that carried this issue inside it was labelled the subject");
has(IP.rowHtml(RPKG), IP.RODE, "the rode-inside row does not print the rode-inside label");
// chamber · last roll date · Yea–Nay
eq(IP.rollLine(R6644), "Senate · Mar 12, 2026 · 89–10",
  "the row line is not chamber · last roll date · Yea–Nay");
eq(IP.rollLine(ROWS.find((r) => r.number === "H.B. 360")), "Utah House · no floor roll on file yet",
  "a measure with no floor roll does not say so in words");
has(HTML, "Senate · Mar 12, 2026 · 89–10", "the acceptance measure's roll line is not on the page");
// The lane read is per key, not off the single primaryIssue slot.
eq(IP.rowsFrom([M_6644], "housing_build")[0].subject, true,
  "the other axis H.R. 6644 is primary on does not read as its subject either");
eq(IP.rowsFrom([{ number: "X. 1", primaryIssue: "housing", issueKeys: ["housing"] }], KEY)[0].subject, true,
  "the inline index's single primary slot is not read when no per-key flags exist");
eq(IP.rowsFrom([{ number: "X. 2", primaryIssue: "lower_taxes", issueKeys: ["housing"] }], KEY)[0].subject, false,
  "a row whose primary is another key was called this bill's subject");
// The door.
has(HTML, 'data-pdxip-sitting="2025GS"', "a state row carries no session, so its door opens the wrong bill");
has(HTML, 'data-pdxip-sitting="119"', "a federal row carries no congress");
// Packages and riders stay.
has(HTML, IP.PKG_NOTE, "the page does not say that packages and riders are listed in full");
for (const w of ["Weighted", "holds the primary", "Primary:", "ranked below", "w100", "w80"]) {
  hasNot(HTML, w, `curator vocabulary (${w}) reached the issue page`);
}
ok(!/weight(ed)?\s*\d/i.test(HTML), "a curator weight number reached the issue page");
// The only sentence on the page that may say "discount" is the one promising
// that nothing is discounted.
eq(HTML.split("discount").length - 1, IP.PKG_NOTE.split("discount").length - 1,
  "the page discusses discounting outside the note that forbids it");

// ── 4 · THE SORT ────────────────────────────────────────────────────────────
section("the sort: subject first, then newest roll");
const ORDER = ROWS.map((r) => r.number);
eq(ORDER[0], "H.R. 6644", "the newest subject-lane roll is not first");
eq(ORDER[ORDER.length - 1], "H.R. 1",
  "a rider with the newest roll on the page outranked the subject rows");
const firstRider = ORDER.findIndex((n) => n === "H.R. 1");
const lastSubject = Math.max(...ROWS.map((r, i) => (r.subject ? i : -1)));
ok(lastSubject < firstRider, "a rode-inside row sorted above a subject-of-the-bill row");
eq(ORDER.indexOf("S.B. 262") < ORDER.indexOf("H.B. 360"), true,
  "inside one lane, a measure with a roll did not sort above one with none");
// The unvoted act is still there — the list and the roll count are allowed to
// disagree, and hiding the row is how they would be made to agree.
ok(ROWS.some((r) => !r.roll), "a mapped measure with no floor roll was dropped from the list");
eq(IP.sortRows([]).length, 0, "sorting an empty list is not empty");

// ── 5 · THE EMPTY KEY ───────────────────────────────────────────────────────
section("the empty key: says so, and does not backfill");
const EMPTY_HTML = IP.bodyHtml({ key: KEY, rows: [], people: [] });
has(EMPTY_HTML, "No mapped measure on file yet", "the empty key does not say what is on file");
eq(IP.EMPTY, "No mapped measure on file yet", "the empty-key sentence was reworded");
has(EMPTY_HTML, SCOPE.inn, "the empty key dropped the scope sentence");
has(EMPTY_HTML, "0 measures on file", "the empty key does not count zero out loud");
for (const n of ALL_NUMBERS) hasNot(EMPTY_HTML, n, `${n} was backfilled onto an empty key`);
// A live answer of zero is the empty state — NOT a cue to read the paint index.
{
  const w = boot();
  w.PDX_BILLS_INDEX = [{ number: "H.R. 9999", shortTitle: "Not mapped here", primaryIssue: KEY, issueKeys: [KEY] }];
  w.PDXBills = {
    list: () => Promise.resolve({ items: [], total: 0, hasMore: false }),
    listSync: () => ({ items: w.PDX_BILLS_INDEX.slice(), _inline: true }),
  };
  const st = await w.PDXIssuePage.load(KEY);
  eq(st.rows.length, 0, "an honest live answer of zero was backfilled from the inline paint index");
  eq(st.error, false, "an honest live answer of zero was reported as a failed read");
  hasNot(w.PDXIssuePage.bodyHtml(st), "H.R. 9999", "an unmapped inline row was invented onto the page");
}
// A FAILED read is the case the index exists for, and it is flagged as short.
{
  const w = boot();
  w.PDX_BILLS_INDEX = [{ number: "H.R. 9999", shortTitle: "Paint hint", primaryIssue: KEY, issueKeys: [KEY] },
                       { number: "H.R. 8888", shortTitle: "Another issue", primaryIssue: "lower_taxes", issueKeys: ["lower_taxes"] }];
  w.PDXBills = {
    list: () => Promise.resolve(w.PDXBills.listSync()),
    listSync: () => ({ items: w.PDX_BILLS_INDEX.slice(), _inline: true }),
  };
  const st = await w.PDXIssuePage.load(KEY);
  eq(st.error, true, "a failed live read was not reported");
  eq(st.rows.map((r) => r.number).join(","), "H.R. 9999",
    "the paint-index fallback was not filtered to this issue key");
  has(w.PDXIssuePage.bodyHtml(st), "could not be reached",
    "a short list from a failed read does not tell the reader it may be short");
}
// Every page of a multi-page answer is read: "every measure" is the surface.
{
  const w = boot();
  const pages = [[M_6644], [M_PKG], [M_UTAH]];
  const seen = [];
  w.PDXBills = {
    list: (f) => {
      seen.push(f.page || 1);
      const i = (f.page || 1) - 1;
      return Promise.resolve({ items: pages[i] || [], page: f.page || 1, hasMore: i < pages.length - 1 });
    },
    listSync: () => ({ items: [], _inline: true }),
  };
  const st = await w.PDXIssuePage.load(KEY);
  eq(seen.length, 3, "the page stopped reading before the archive stopped answering");
  eq(st.rows.length, 3, "measures past the first page are missing from the list");
  eq(st.error, false, "a complete paged read was reported as failed");
}
// One measure, one row, however many pools name it.
eq(IP.rowsFrom([M_6644, M_6644], KEY).length, 1, "the same measure was listed twice");

// ── 6 · WHO THE RECORD READS ────────────────────────────────────────────────
section("who the record reads: published positions, folded, no score");
has(HTML, IP.PEOPLE_TITLE, "the member block has no title");
has(HTML, "<details", "the member block is not folded");
ok(!/<details[^>]*\sopen/.test(HTML), "the member block is open on first paint");
ok(HTML.indexOf('data-pdxip-list="1"') < HTML.indexOf('data-pdxip-people="1"'),
  "the member block sits above the list it is second to");
// The buckets, and only these four words.
eq(IP.BUCKETS.map((b) => b.key).join(","), "supports,opposes,split,thin",
  "the published-direction buckets are not supports / opposes / split / thin");
eq(IP.BUCKETS.filter((b) => b.readable).map((b) => b.key).join(","), "supports,opposes,split",
  "a bucket with no readable direction was counted as a readable row");
// The real roster's published housing positions — the count is read off the same
// data the page reads, so this cannot pass by agreeing with a stale copy.
{
  const SD = WIN.ISSUE_STANCE_DATA || {};
  const expect = new Set();
  Object.keys(SD).forEach((pid) => {
    (SD[pid] || []).forEach((c) => { if (c && c.issueKey === KEY) expect.add(pid); });
  });
  ok(expect.size > 0, "no published housing position exists in the shipped stance data");
  eq(PEOPLE.length, expect.size,
    "the member block is not every member with a published position on this key");
  for (const p of PEOPLE) has(HTML, p.name, `${p.name} has a published position and is not named`);
}
// A synthetic roster: the four buckets, an off-key position, and the tree's line.
{
  const w = boot();
  w.CMP_DATA = {
    a_yes: { name: "Ada Yes" }, b_no: { name: "Bo No" }, c_mix: { name: "Cy Mix" },
    d_thin: { name: "Di Thin" }, e_other: { name: "Ed Other" },
  };
  w.PROFILES = {};
  w.ISSUE_STANCE_DATA = {
    a_yes: [{ topic: "Housing", issueKey: KEY, issueStance: "support", pos: "support" }],
    b_no: [{ topic: "Housing", issueKey: KEY, issueStance: "oppose", pos: "oppose" }],
    c_mix: [{ topic: "Housing", issueKey: KEY, issueStance: "mixed", pos: "mixed" }],
    d_thin: [{ topic: "Housing", issueKey: KEY, issueStance: "", pos: "" }],
    e_other: [{ topic: "Taxes", issueKey: "lower_taxes", issueStance: "support" }],
  };
  w.PDXStanceTree = {
    leaf: () => ({ record: { onRecord: true, label: "Advanced it 4 of the 5 times", counts: "5 acts · 3 documents", pct: 80, state: "scored" } }),
  };
  const rows = w.PDXIssuePage.peopleRows(KEY);
  eq(rows.map((r) => r.pid).join(","), "a_yes,b_no,c_mix,d_thin",
    "the member block is not the four published directions, in vocabulary order");
  eq(rows.map((r) => r.bucket).join(","), "supports,opposes,split,thin",
    "a published direction was bucketed as something else");
  eq(rows.filter((r) => r.readable).length, 3, "the thin row was counted as readable");
  const ph = w.PDXIssuePage.peopleHtml(rows, KEY);
  has(ph, "Advanced it 4 of the 5 times", "the member row does not carry the tree's pattern line");
  has(ph, "5 acts · 3 documents", "the member row does not carry the tree's own counts");
  ok(!/\d\s*%/.test(ph), "the leaf's Direction Match percentage was printed on a member row");
  hasNot(ph, "80", "the Direction Match figure reached the member block");
  has(ph, 'data-pdxst-dos="housing"', "the member row does not open that person's file on this issue");
  has(ph, 'data-pdxst-pid="a_yes"', "the member row's door names no person");
  hasNot(ph, "Ed Other", "a member with no published position on this key was listed");
  // Not a party sort, and not a party column.
  hasNot(ph, "data-party", "party reached the member block");
  ok(!/\bR\b\s*·|\bD\b\s*·/.test(ph), "a party letter was printed on a member row");
  // Inferred direction is not a position: a member the tree can read but who has
  // published nothing on this key stays off the block.
  w.ISSUE_STANCE_DATA = { e_other: [{ topic: "Taxes", issueKey: "lower_taxes", issueStance: "support" }] };
  eq(w.PDXIssuePage.peopleRows(KEY).length, 0,
    "a pattern-only member — record read, nothing published — was given a row");
  eq(w.PDXIssuePage.bodyHtml({ key: KEY, rows: [], people: [] }).includes("0 readable member-rows"), true,
    "an empty member block does not count zero out loud");
}

// ── 7 · THE WIRING ──────────────────────────────────────────────────────────
section("the wiring: both chips, the ⓘ door, the route, the field");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, " ");
const BD = strip(readFileSync(join(ROOT, "bill-detail.js"), "utf8"));
has(BD, "PDXIssuePage", "the bill letterhead's topic chip still does not know about the issue page");
ok(BD.indexOf("PDXIssuePage") < BD.indexOf("window.PDXIssueView && window.PDXIssueView.open) { close(); window.PDXIssueView.open(key)"),
  "the ranked overlay is still tried before the issue page");
has(BD, "IP.has(key) && IP.open(key)", "the bill chip does not check the key before it jumps");
const PS = strip(readFileSync(join(ROOT, "profile-spine.js"), "utf8"));
has(PS, "window.PDXIssuePage&&window.PDXIssuePage.has(K)", "the person's signature chip does not reach the issue page");
has(PS, "else if(window.PDXIssueView&&window.PDXIssueView.open)", "the person's chip lost its fallback");
const ISC = readFileSync(join(ROOT, "issue-scope.js"), "utf8");
has(ISC, "See all bills on this issue", "the ⓘ card carries no jump to the issue page");
has(ISC, "data-pdxis-bills", "the ⓘ card's jump is not a control");
eq(WIN.PDXIssueScope.BILLS_DOOR, "See all bills on this issue", "the ⓘ card's door copy is not published");
{
  // The door is offered only when a page will take the key, and never on the
  // stance-tree leaf's own door, which still opens that member's dossier.
  const card = WIN.PDXIssueScope.cardHtml(KEY);
  has(card, "See all bills on this issue", "the ⓘ card for a real key has no bills door");
  const ST = strip(readFileSync(join(ROOT, "stance-tree.js"), "utf8"));
  hasNot(ST, "PDXIssuePage", "the stance tree's leaf door was re-pointed away from the dossier");
  has(ST, "data-pdxtree-dos", "the stance tree's leaf lost its dossier door");
}
{
  const w = makeSandbox();
  const ctx = vm.createContext(w);
  for (const f of ["issue-colors.js", "issue-scope.js"]) {
    vm.runInContext(readFileSync(join(ROOT, f), "utf8"), ctx, { filename: f });
  }
  hasNot(w.PDXIssueScope.cardHtml("housing"), "See all bills on this issue",
    "the ⓘ card promises a page that is not on this boot");
}
const IDX = readFileSync(join(ROOT, "index.html"), "utf8");
has(IDX, 'src="/issue-page.js"', "index.html does not load the issue page module");
has(IDX, "syncIssuePage(slug, fromPop)", "the /issue/* router does not offer the slug to the issue page");
ok(IDX.indexOf("if (slug && SPOTLIGHTS[slug])") < IDX.indexOf("if (syncIssuePage(slug, fromPop)) return true;"),
  "the issue page is offered a slug the spotlight set already owns");
has(IDX, "IP.close({ fromPop: true })", "walking back off /issue/<key> does not close the page");
const NT = readFileSync(join(ROOT, "netlify.toml"), "utf8");
has(NT, '/issue/*', "netlify.toml no longer serves the app for /issue/<key>");
const VR = readFileSync(join(ROOT, "netlify/functions/voting-record.mts"), "utf8");
has(VR, "primaryIssueKeys", "the browse route does not publish every primary flag");
has(VR, "lastRoll", "the browse route does not publish the last floor roll");
has(VR, "vrRollcalls.voteDate", "the last roll is not read from the roll-call table");
ok(/lastRc\[rc\.measureId\] = rc/.test(VR), "the browse route does not pick the LAST roll");

// ── 8 · MUTATION ────────────────────────────────────────────────────────────
// Five probes, each one a fence above. The shipped file has to pass all five
// before a mutation is allowed to be required to fail one.
section("mutation: every fence above, driven");
async function probe(src) {
  const w = boot(src);
  const P = w.PDXIssuePage;
  const page = await render(w, PAYLOAD);
  const h = page.html;
  const order = page.st.rows.map((r) => r.number);
  const out = [];
  // (a) the acceptance sentence
  const r = page.st.rows.find((x) => x.number === "H.R. 6644");
  out.push(!!r && r.subject === true && h.includes(P.SUBJECT));
  // (b) every mapping, and the row line
  out.push(ALL_NUMBERS.every((n) => h.includes(`data-pdxip-bill="${n}"`)) &&
           h.includes("Senate · Mar 12, 2026 · 89–10"));
  // (c) the sort
  out.push(order[0] === "H.R. 6644" && order[order.length - 1] === "H.R. 1" &&
           order.indexOf("S.B. 262") < order.indexOf("H.B. 360"));
  // (d) counts only, no percentage
  out.push(h.includes(P.countsLine(P.counts(page.st.rows, page.st.people))) && !/\d\s*%/.test(h));
  // (e) the empty key, and the gate
  const e = P.bodyHtml({ key: KEY, rows: [], people: [] });
  out.push(e.includes("No mapped measure on file yet") && e.includes(SCOPE.inn) &&
           !ALL_NUMBERS.some((n) => e.includes(n)) && P.has(KEY) && !P.has("not_a_real_issue_key"));
  return out;
}
const BASE = await probe(SRC);
BASE.forEach((v, i) => ok(v, `the shipped module fails its own probe ${"abcde"[i]}`));

const MUTANTS = [
  ["the lane is read off the single primaryIssue slot again",
    (s) => s.replace("var subject = pk ? pk.indexOf(key) > -1 : (String(it.primaryIssue || '') === String(key));",
                     "var subject = (String(it.primaryIssue || '') === String(key));")],
  ["the list is truncated",
    (s) => s.replace("'<ol class=\"pdxip-rows\">' + rows.map(rowHtml).join('')",
                     "'<ol class=\"pdxip-rows\">' + rows.slice(0, 2).map(rowHtml).join('')")],
  ["riders are sorted out of the list",
    (s) => s.replace("if (r && r.number) out.push(r);", "if (r && r.number && r.subject) out.push(r);")],
  ["the lane stops outranking the date",
    (s) => s.replace("if (a.subject !== b.subject) return a.subject ? -1 : 1;", "")],
  ["the roll is sorted oldest first",
    (s) => s.replace("if (da !== db) return da < db ? 1 : -1;", "if (da !== db) return da < db ? -1 : 1;")],
  ["the Yea–Nay is dropped from the row line",
    (s) => s.replace("if (r.roll.yea != null && r.roll.nay != null) bits.push(r.roll.yea + '–' + r.roll.nay);", "")],
  ["the counts line grows a percentage",
    (s) => s.replace("return plural(c.measures, 'measure') + ' on file' +",
                     "return Math.round(100 * c.rolls / (c.measures || 1)) + '% voted · ' + plural(c.measures, 'measure') + ' on file' +")],
  ["the empty key loses its scope sentence",
    (s) => s.split("esc(s.defined ? s.inn : noDef())").join("''")],
  ["the gate lets any slug through",
    (s) => s.replace("if (!k || !/^[A-Za-z0-9_-]+$/.test(k)) return false;", "if (!k) return false; return true;")],
];
for (const [name, mutate] of MUTANTS) {
  const src = mutate(SRC);
  if (src === SRC) { failures.push(`mutation "${name}" did not change the source`); continue; }
  let res;
  try { res = await probe(src); } catch (e) { res = [false, false, false, false, false]; }
  const caught = res.some((v, i) => v !== BASE[i] && BASE[i]);
  ok(caught, `mutation survived: ${name}`);
}
// The member block has its own driver: the shipped roster's housing leaves are
// all unscored, so a synthetic one is the only way to prove the score cannot
// print and that a thin row cannot be counted as readable.
{
  function people(src) {
    const w = boot(src);
    w.CMP_DATA = { a_yes: { name: "Ada Yes" }, d_thin: { name: "Di Thin" }, e_other: { name: "Ed Other" } };
    w.PROFILES = {};
    w.ISSUE_STANCE_DATA = {
      a_yes: [{ topic: "Housing", issueKey: KEY, issueStance: "support" }],
      d_thin: [{ topic: "Housing", issueKey: KEY, issueStance: "" }],
      e_other: [{ topic: "Taxes", issueKey: "lower_taxes", issueStance: "support" }],
    };
    w.PDXStanceTree = { leaf: () => ({ record: { onRecord: true, label: "Advanced it 4 of the 5 times", counts: "5 acts", pct: 80 } }) };
    const rows = w.PDXIssuePage.peopleRows(KEY);
    return { rows, html: w.PDXIssuePage.peopleHtml(rows, KEY), counts: w.PDXIssuePage.counts([], rows) };
  }
  const base = people(SRC);
  ok(!/\d\s*%/.test(base.html) && base.counts.people === 1 && !base.html.includes("Ed Other"),
    "the shipped module fails its own member-block probe");
  const PEOPLE_MUTANTS = [
    ["the leaf's Direction Match is printed on the member row",
      (x) => x
        .replace("return { label: String(rc.label), counts: String(rc.counts || '') };",
                 "return { label: String(rc.label), counts: String(rc.counts || ''), pct: rc.pct };")
        .replace("'<span class=\"pdxip-p-pat\"><b>🏛 Record:</b> ' + esc(p.pattern.label) +",
                 "'<span class=\"pdxip-p-pat\"><b>🏛 Record:</b> ' + esc(p.pattern.label) + ' · ' + p.pattern.pct + '%' +"),
      (r) => /\d\s*%/.test(r.html)],
    ["a thin row is counted as a readable member-row",
      (x) => x.replace("{ key: 'thin', label: 'Thin', readable: false }", "{ key: 'thin', label: 'Thin', readable: true }"),
      (r) => r.counts.people !== 1],
  ];
  for (const [name, mutate, broke] of PEOPLE_MUTANTS) {
    const src = mutate(SRC);
    if (src === SRC) { failures.push(`mutation "${name}" did not change the source`); continue; }
    let caught = true;
    try { caught = broke(people(src)); } catch (e) { caught = true; }
    ok(caught, `mutation survived: ${name}`);
  }
  // The gate on the pattern line is the one mutation that is only wrong against
  // the SHIPPED data: every real `housing` leaf reads state 'none', so gating on
  // it silently empties the block the acceptance asks for.
  {
    const src = SRC.replace("if (!rc || !rc.label) return null;",
                            "if (!rc || !rc.label || !rc.onRecord) return null;");
    const w = boot(src);
    const rows = w.PDXIssuePage.peopleRows(KEY);
    const before = PEOPLE.filter((r) => r.pattern).length;
    ok(before > 0, "no shipped member row carries a pattern line, so the gate cannot be tested");
    ok(rows.filter((r) => r.pattern).length < before,
      "mutation survived: the shipped roster keeps its pattern lines even when gated on onRecord");
  }
}

// A live answer of zero backfilled from the paint index is invisible to a probe
// that renders a payload, so it gets its own driver.
{
  const src = SRC.replace("acc = acc.concat(d.items);",
                          "acc = acc.concat(d.items.length ? d.items : inlineItems(key));");
  if (src === SRC) failures.push('mutation "the empty key is backfilled" did not change the source');
  const w = boot(src);
  w.PDX_BILLS_INDEX = [{ number: "H.R. 9999", primaryIssue: KEY, issueKeys: [KEY] }];
  w.PDXBills = {
    list: () => Promise.resolve({ items: [], hasMore: false }),
    listSync: () => ({ items: w.PDX_BILLS_INDEX.slice(), _inline: true }),
  };
  const st = await w.PDXIssuePage.load(KEY);
  ok(st.rows.length > 0, "mutation survived: an honest zero is still empty when the fallback is unguarded");
}
// The paging mutation is only visible on a multi-page answer, so it gets its own
// driver rather than a probe that would pass it on a one-page fixture.
{
  const src = SRC.replace("if (d.hasMore && n < PAGE_CAP) return page(n + 1);", "");
  const w = boot(src);
  const pages = [[M_6644], [M_PKG]];
  w.PDXBills = {
    list: (f) => Promise.resolve({ items: pages[(f.page || 1) - 1] || [], hasMore: (f.page || 1) < pages.length }),
    listSync: () => ({ items: [], _inline: true }),
  };
  const st = await w.PDXIssuePage.load(KEY);
  ok(st.rows.length < 2, "mutation survived: the second page is read even when hasMore is ignored");
}

if (failures.length) {
  console.error(`\n✗ issue page — ${failures.length} failure(s):`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`\n✓ issue page — ${passed} assertions passed`);
