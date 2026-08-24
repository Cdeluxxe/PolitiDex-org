#!/usr/bin/env node
/**
 * test-big-picture-ledger.mjs — the act face shows the WHOLE act
 * ─────────────────────────────────────────────────────────────────────────────
 * A reconciliation vehicle is not one thing that happens to mention thirteen
 * others. H.R. 1 rewrote the individual tax code, cut Medicaid eligibility,
 * trimmed SNAP, funded detention capacity, repealed clean-energy credits and
 * opened federal acreage to leasing — in ONE signature, on ONE roll call. A
 * member who voted Yea voted Yea on every one of those. So the surface a
 * citizen opens to read the act has one obligation before it has any other:
 * show the whole menu, topic by topic, and let the reader decide what matters.
 *
 * That is the property this file pins, and it pins it against the shipped
 * bill-detail.js rather than a description of it. Three ways the whole menu
 * used to shrink, each of them now an assertion:
 *
 *   1. TRUNCATION. The "explore these issues" chips were cut at eight. On a
 *      fourteen-topic act that silently deleted six topics from the one control
 *      that jumps into them — and since the list arrived primary-first from the
 *      API, the six deleted were the six the curation had already ranked last.
 *   2. RANK. A `primary` badge on one row makes the other thirteen read as
 *      footnotes to it. The curated flag still exists in the data and still
 *      rides the markup, but only as a filter key: it may not set the default
 *      view, and no row may be labelled second-class on arrival.
 *   3. STANCE-GATED MEMBER ROWS. A member's expansion listed only the topics we
 *      happened to hold a documented stance on, so a fourteen-topic act could
 *      collapse to two. The vote is a fact about all fourteen; the stance
 *      verdict is an extra that lands where we have one.
 *
 * The fixture is the real thing: H.R. 1's fourteen curated mappings, read out
 * of db/exec-action-seed.json and reshaped into what the Voting Record API
 * hands the panel. Using the seed rather than an invented bill means the counts
 * here move when the curation moves, which is the point — a future pass that
 * adds a fifteenth mapping should see this file demand a fifteenth row.
 *
 *   node scripts/test-big-picture-ledger.mjs
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

// ── the fixture: H.R. 1 as the Voting Record API hands it over ────────────────
// The seed is the curation's own record of what this law did. `direction` there
// is measure→issue; the panel reads `supportMeaning`, which says the same thing
// in the vocabulary a roll call speaks, so the translation is one line and no
// judgement is added on the way through.
const SEED = JSON.parse(readFileSync(join(ROOT, "db/exec-action-seed.json"), "utf8"));
const HR1 = SEED.actions.trump.find((a) => a.documentId === "Public Law 119-21");
if (!HR1 || !HR1.issues || HR1.issues.length < 9) {
  console.error("✗ big-picture ledger: the H.R. 1 seed is missing or too small to probe truncation");
  process.exit(1);
}
const ISSUES = HR1.issues.map((m) => ({
  issueKey: m.issueKey,
  supportMeaning: m.direction === "opposes" ? "yea_opposes" : "yea_supports",
  isPrimary: !!m.isPrimary,
  weight: m.weight,
  rationale: m.rationale || "",
}));
const N = ISSUES.length;
const PRIMARIES = ISSUES.filter((i) => i.isPrimary).length;

const MEASURE = {
  id: 1, number: "H.R. 1", congress: 119, chamber: "house", status: "enacted",
  title: "One Big Beautiful Bill Act",
  summary: "Reconciliation vehicle carrying tax, health, nutrition, immigration and energy provisions.",
  source: { url: "https://www.congress.gov/bill/119th-congress/house-bill/1", label: "Congress.gov" },
};

// A roll call small enough that the panel renders the per-member breakdown (it
// skips it above sixty voters to keep the DOM sane), with three members drawn
// from the live roster so the stance lookup is real rather than stubbed.
const ROSTER_PIDS = [];
const RC = {
  id: 9001, chamber: "house", question: "On Passage", result: "passed",
  voteDate: "2025-07-03", totals: { yea: 218, nay: 214 },
  votes: [], // filled below, once the roster is loaded
  source: { url: "https://clerk.house.gov/Votes/2025190", label: "Clerk of the House" },
};

// ── boot the shipped panel ────────────────────────────────────────────────────
// bill-detail.js exports only open()/close(), so the markup is captured where the
// panel actually writes it: the scroll container it looks up by id. Everything
// else in the DOM stub is the generic one the other suites boot the engine with.
function boot() {
  const win = makeSandbox();
  const capture = { innerHTML: "", scrollTop: 0 };
  win.document.getElementById = (id) => (id === "pdx-bd-scroll" ? capture : null);
  win.history = { replaceState() {}, pushState() {} };
  const ctx = vm.createContext(win);
  for (const f of [...ENGINE_FILES, "bill-detail.js"]) {
    vm.runInContext(readFileSync(join(ROOT, f), "utf8"), ctx, { filename: f });
  }
  if (!win.PDXBillDetail || typeof win.PDXBillDetail.open !== "function") {
    throw new Error("PDXBillDetail.open() unavailable after loading bill-detail.js");
  }
  if (typeof win._measureComponentBreakdown !== "function") {
    throw new Error("_measureComponentBreakdown is missing — the member rows cannot be checked");
  }
  return { win, capture };
}

// Three real House members, so _polPositionMap has something to find. Which three
// does not matter and is deliberately not asserted on: the claim under test is
// that every mapped topic appears for each of them, whatever we know about them.
function pickVoters(win) {
  const out = [];
  for (const [pid, p] of Object.entries(win.CMP_DATA || {})) {
    if (!p || p.chamber === "senate") continue;
    out.push({ politicianId: pid, position: out.length === 2 ? "nay" : "yea" });
    if (out.length === 3) break;
  }
  return out;
}

async function render(win, capture, data) {
  win.PDXBills = {
    get: () => Promise.resolve(data),
    list: () => Promise.resolve({ items: [] }),
    listSync: () => ({ items: [] }),
    isFollowed: () => false,
  };
  win.PDXBillDetail.open(1);
  // open() chains two promises before it writes; drain the microtask queue.
  for (let i = 0; i < 8; i++) await Promise.resolve();
  return capture.innerHTML;
}

const { win, capture } = boot();
RC.votes = pickVoters(win);
ROSTER_PIDS.push(...RC.votes.map((v) => v.politicianId));
const DATA = { measure: MEASURE, issues: ISSUES, rollcalls: [RC], positions: [], provisions: [], actions: [] };
const HTML = await render(win, capture, DATA);

console.log("\n📖 big-picture ledger — the act face shows the whole act");
if (!HTML || HTML.length < 2000) {
  console.error(`✗ big-picture ledger: the panel rendered ${HTML.length} characters — nothing below can be trusted`);
  process.exit(1);
}
ok(ROSTER_PIDS.length === 3, "the fixture roll call did not get three real members off the roster");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · every mapped topic is on the act face, and none of them is cut");
// ═════════════════════════════════════════════════════════════════════════════
// The ledger block and the jump chips are two different controls over the same
// list, and BOTH used to shrink it — the ledger by ordering, the chips by a hard
// slice(0, 8). Fourteen mappings in, fourteen rows and fourteen chips out.
{
  ok(N > 8, `fixture drift: H.R. 1 now carries ${N} mappings, which no longer exceeds the old eight-chip cut`);
  eq((HTML.match(/class="bd-omni-row/g) || []).length, N,
    "the topic ledger does not render one row per mapping");
  eq((HTML.match(/class="bd-person bd-issuejump"/g) || []).length, N,
    "the explore-these-issues chips are still being cut — every mapped topic gets a jump chip");
  for (const m of ISSUES) {
    has(HTML, `data-issue="${m.issueKey}"`, `${m.issueKey} is mapped to this act but is not on its face`);
    if (m.rationale) {
      has(HTML, m.rationale.replace(/&/g, "&amp;").replace(/'/g, "&#39;"),
        `${m.issueKey}: the row is there but its mechanism sentence is not`);
    }
  }
  // Equal treatment is structural, not a matter of tone: every row is the same
  // element with the same head, so no row can be given less to work with.
  eq((HTML.match(/class="bd-omni-head"/g) || []).length, N,
    "some ledger rows are built from a different, smaller structure than the others");
  has(HTML, `mapped to <strong>${N} topics</strong>`,
    "the lead sentence does not state how many topics the reader is about to be shown");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the default view is all topics, and the filter is only a filter");
// ═════════════════════════════════════════════════════════════════════════════
// A filter is allowed. A filter that ships pre-applied is a ranking wearing a
// filter's clothes. The visible state lives in one attribute, and the value that
// ships in the markup is "all" — which is also what a reader with no JavaScript
// gets, permanently, because the buttons are inert without it.
{
  eq((HTML.match(/data-bd-view="all"/g) || []).length, 1,
    "the topic list does not open in exactly one state, and that state is all-topics");
  ok(!/data-bd-view="(main|other)"/.test(HTML),
    "the topic list ships with a slice already applied — the default has to be every topic");
  has(HTML, 'data-bd-view-set="all"', "there is no way back to the full list");
  has(HTML, 'aria-pressed="true"', "no view button is marked as the current one");
  // Only the all-topics button is pressed on arrival.
  const pressed = [...HTML.matchAll(/data-bd-view-set="([a-z]+)" aria-pressed="true"/g)].map((m) => m[1]);
  eq(JSON.stringify(pressed), JSON.stringify(["all"]),
    "a slice other than all-topics is the pressed button when the panel opens");
  // The lane attribute is a filter key. It has to be present on every row (or the
  // filter would drop rows it cannot classify) and it may not be the thing that
  // decides the order the rows arrive in.
  eq((HTML.match(/data-bd-lane="(?:main|other)"/g) || []).length, N,
    "some rows carry no lane, so a slice of the list would silently lose them");
  eq((HTML.match(/data-bd-lane="main"/g) || []).length, PRIMARIES,
    "the main lane does not match the curated primary mappings");
  // The control only exists when it would actually divide something.
  const wantFilter = PRIMARIES > 0 && PRIMARIES < N;
  eq(HTML.includes("bd-viewfilter"), wantFilter,
    wantFilter ? "the view filter is missing on an act whose mappings split into two lanes"
               : "a view filter is drawn on an act where one of its slices would be empty");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · nothing on the face marks a mapped topic as the lesser one");
// ═════════════════════════════════════════════════════════════════════════════
// The vocabulary check. These words are not banned from the codebase — the flag
// is real data and the API still sorts by it — but a citizen reading the act may
// not be told, before they have read a word of it, which of its topics are
// footnotes. Where scope is a genuine fact it goes in the row's own sentence.
{
  hasNot(HTML, "bd-omni-primary", "the primary badge is back on the ledger row");
  for (const w of ["Primary issue", "Secondary", "secondary", "Supporting only", "supporting only"]) {
    hasNot(HTML, w, `the act face calls one of its own topics ${JSON.stringify(w)}`);
  }
  // No button in the view control names the flag either: the slices are described
  // by what is in them, so choosing one is a question about the act rather than
  // an invitation to agree with the curation.
  const btnText = [...HTML.matchAll(/data-bd-view-set="[a-z]+" aria-pressed="(?:true|false)">([^<]*)</g)]
    .map((m) => m[1]).join(" | ");
  ok(btnText.length > 0, "the view buttons rendered without labels");
  ok(!/primar|secondar|support|minor|major/i.test(btnText),
    `a view button ranks the slices instead of describing them: ${JSON.stringify(btnText)}`);
  has(btnText, "All topics", "the default slice is not called what it is");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · one vote, every topic — the member row is not gated on stance");
// ═════════════════════════════════════════════════════════════════════════════
// A Yea is a Yea on all fourteen. The expansion under a member's name lists all
// fourteen, each with what THEIR vote did to it, whether or not we hold a
// documented stance to compare it against. The say-vs-do verdict is additive: it
// appears on the rows where a stance exists and deletes no row where it doesn't.
{
  eq((HTML.match(/bd-vote-exp/g) || []).length, ROSTER_PIDS.length,
    "not every member on the roll call got an expandable per-topic breakdown");
  eq((HTML.match(/class="bd-svd-row"/g) || []).length, N * ROSTER_PIDS.length,
    "a member's breakdown is not listing every topic this act maps to");
  eq((HTML.match(/class="bd-svd-cap"/g) || []).length, ROSTER_PIDS.length,
    "a member's breakdown opens without saying what it is a breakdown of");
  has(HTML, "On this act — every topic it maps to",
    "the breakdown caption no longer scopes itself to this one act");
  eq((HTML.match(/class="bd-svd-count">\d+ topics</g) || []).length, ROSTER_PIDS.length,
    "the collapsed summary does not tell the reader how many topics are inside");
  has(HTML, `<span class="bd-svd-count">${N} topic`,
    `the collapsed summary should promise all ${N} topics before the reader opens it`);
  // Every topic row states an effect, because that is the whole content of the
  // claim: this person's vote pushed this thing forward, or cut against it.
  const effects = (HTML.match(/their vote (advances|cuts against) this/g) || []).length;
  eq(effects, N * ROSTER_PIDS.length,
    "some per-topic rows state no effect, which is the only thing they are there to say");
  ok(/their vote cuts against this/.test(HTML),
    "fixture drift: no member row shows a cuts-against effect, so the inverting path is untested");
  // A stance verdict may appear; it may never be the reason a row exists. There
  // are strictly fewer verdicts than rows here because the roster does not hold a
  // documented stance on all fourteen keys for all three members.
  const verdicts = (HTML.match(/class="bd-v bd-v-/g) || []).length;
  ok(verdicts <= N * ROSTER_PIDS.length,
    "more stance verdicts than topic rows — a verdict is being rendered without a topic");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the order is not the curation's ranking, and it can be the reader's");
// ═════════════════════════════════════════════════════════════════════════════
// Some order has to exist. This one is a stable taxonomy walk — the reader's own
// picked issues first, then category order, then the label alphabetically — so it
// is legible as an index rather than as a verdict. What it must NOT be is the
// API's primary-then-weight sort, which is the curation telling the reader what
// to care about while looking like a list.
{
  const order = [...HTML.matchAll(/class="bd-omni-issue bd-omni-link" data-issue="([^"]+)"/g)].map((m) => m[1]);
  eq(order.length, N, "the ledger order could not be read back off the markup");
  const byWeight = [...ISSUES].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.weight - a.weight)
    .map((i) => i.issueKey);
  ok(JSON.stringify(order) !== JSON.stringify(byWeight),
    "the ledger is still in primary-then-weight order — that is the API's sort, not a reader's index");
  // The chips walk the same order as the ledger. Two controls over one list that
  // disagree about its order are two lists, and the reader has to hold both.
  const chips = [...HTML.matchAll(/class="bd-person bd-issuejump" data-issue="([^"]+)"/g)].map((m) => m[1]);
  eq(JSON.stringify(chips), JSON.stringify(order),
    "the jump chips and the topic ledger disagree about the order of the same list");
  // And the library button follows the head of THAT order rather than reaching
  // past it for whichever row carries the primary flag.
  const legis = (HTML.match(/data-legis="([^"]+)"/) || [])[1];
  eq(legis, order[0], "the Legislation-library button jumps to a topic that is not the one heading the list");

  // The reader's own issues come first when they have any — the one personalising
  // input allowed here, and it reorders rather than removes.
  const b = boot();
  b.win._alignIssues = new Set([ISSUES[N - 1].issueKey, ISSUES[N - 2].issueKey]);
  const mine = await render(b.win, b.capture, DATA);
  const myOrder = [...mine.matchAll(/class="bd-omni-issue bd-omni-link" data-issue="([^"]+)"/g)].map((m) => m[1]);
  eq(myOrder.length, N, "picking issues changed how many topics the act is said to touch");
  ok([ISSUES[N - 1].issueKey, ISSUES[N - 2].issueKey].includes(myOrder[0]),
    "the reader's own picked issues do not come first on the act face");
  eq(JSON.stringify([...myOrder].sort()), JSON.stringify([...order].sort()),
    "the picked-issues ordering added or dropped a topic instead of reordering the same list");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · a single-topic act says so plainly, and grows no filter");
// ═════════════════════════════════════════════════════════════════════════════
// The degenerate case, because a control that appears on a one-row list is noise
// and a control that filters a list to itself is worse than noise.
{
  const b = boot();
  const one = await render(b.win, b.capture, { ...DATA, issues: [ISSUES[0]], rollcalls: [] });
  eq((one.match(/class="bd-omni-row/g) || []).length, 1, "the single-topic act did not render its one row");
  has(one, "mapped to one topic", "the single-topic act does not say plainly that it is one topic");
  hasNot(one, "bd-viewfilter", "a view filter was drawn over a list with one row in it");
  has(one, 'data-bd-view="all"', "even a one-row list ships in the all-topics state");
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ big-picture ledger: ${failures.length} failed, ${passed} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\n✓ big-picture ledger: all ${passed} assertions passed — ${N} topics in, ${N} topics on the face, all of them by default\n`);
