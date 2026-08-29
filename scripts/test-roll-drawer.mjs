#!/usr/bin/env node
/**
 * test-roll-drawer.mjs — the tally is the face, the names are behind a door
 * ─────────────────────────────────────────────────────────────────────────────
 * A House roll call is 430 names. Printed open, they were the act face: a reader
 * who came to find out what the bill did met the tallies, the topic ledger and
 * the one-instrument sentence, and then four hundred rows of surname-and-Yea
 * with everything else — sponsors, the timeline, related measures — somewhere
 * underneath. The letterhead's vote strip has always said "See who voted", and
 * on the old face that promise was already spent before it was made.
 *
 * So the list folds. What this file exists to guarantee is that folding it did
 * not become a quieter way of shortening it:
 *
 *   1. EVERY NAME IS STILL THERE. All of them, in the markup, on first render —
 *      no slice, no "and 380 others", no lazy build. A closed <details> paints
 *      nothing until it is opened; it deletes nothing either, so find-in-page
 *      reaches every row the moment it is open and no count on this face is
 *      computed from what happens to be visible.
 *   2. THE DOOR SAYS WHAT IS BEHIND IT. How many names, and whether the reader's
 *      own representatives are among them, before they spend the tap.
 *   3. THE LETTERHEAD'S STRIP OPENS IT. "See who voted" is a door or it is a
 *      label; the strip carries which roll call it belongs to, and the handler
 *      opens that one rather than all of them.
 *   4. THE READER'S OWN FILTERS, AND ONLY THE READER'S. Position pills and a
 *      name search, both of them CSS over rows that stay in the DOM. Neither
 *      may change a tally, and neither may be the default.
 *   5. YOUR REPS FIRST. The one legitimate reason to move a name up a list of
 *      four hundred is that this reader is represented by it.
 *   6. NO NEW ARITHMETIC. No percentage, no party column, no share of the
 *      chamber — the drawer prints positions and names and nothing else.
 *
 *   node scripts/test-roll-drawer.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = readFileSync(join(ROOT, "bill-detail.js"), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} — missing ${JSON.stringify(needle)}`);
const hasNot = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg} — found ${JSON.stringify(needle)}`);
const count = (hay, re) => (String(hay).match(re) || []).length;
const section = (t) => console.log(`\n  · ${t}`);
const die = (msg) => { console.error(`✗ roll drawer: ${msg}`); process.exit(1); };

const MEASURE = {
  id: 1, number: "H.R. 6644", congress: 119, chamber: "house", status: "passed_house",
  title: "Housing Supply and Permitting Act",
  source: { url: "https://www.congress.gov/bill/119th-congress/house-bill/6644", label: "Congress.gov" },
};
const ISSUES = [
  { issueKey: "housing", supportMeaning: "yea_supports", isPrimary: true, rationale: "Expands the credit." },
  { issueKey: "permitting_reform", supportMeaning: "yea_supports", isPrimary: false, rationale: "Shortens review." },
];

function boot() {
  const win = makeSandbox();
  const capture = { innerHTML: "", scrollTop: 0 };
  win.document.getElementById = (id) => (id === "pdx-bd-scroll" ? capture : null);
  win.history = { replaceState() {}, pushState() {} };
  const ctx = vm.createContext(win);
  for (const f of [...ENGINE_FILES, "bill-detail.js"]) {
    vm.runInContext(readFileSync(join(ROOT, f), "utf8"), ctx, { filename: f });
  }
  if (!win.PDXBillDetail) die("PDXBillDetail is unavailable");
  return { win, capture };
}
async function render(b, data) {
  b.win.PDXBills = {
    get: () => Promise.resolve(data), list: () => Promise.resolve({ items: [] }),
    listSync: () => ({ items: [] }), isFollowed: () => false,
  };
  b.win.PDXBillDetail.open(1);
  for (let i = 0; i < 10; i++) await Promise.resolve();
  return b.capture.innerHTML;
}

// A roll call at the scale that motivated the pass: every House member the
// roster holds, spread across all four recorded positions. Real politician ids,
// so the names in the rows are the names the rest of the site prints.
const B = boot();
const HOUSE = Object.entries(B.win.CMP_DATA || {})
  .filter(([, p]) => p && p.chamber !== "senate").map(([pid]) => pid);
if (HOUSE.length < 80) die(`the roster only offered ${HOUSE.length} House members — too few to be a real roll call`);
const POSITIONS = ["yea", "nay", "present", "not_voting"];
const VOTES = HOUSE.map((pid, i) => ({
  politicianId: pid,
  // Mostly Yea and Nay, with a handful of each of the other two, so every slice
  // the filter offers has something in it.
  position: i % 37 === 5 ? "present" : i % 23 === 7 ? "not_voting" : (i % 2 ? "yea" : "nay"),
}));
const TALLY = POSITIONS.reduce((acc, p) => (acc[p] = VOTES.filter((v) => v.position === p).length, acc), {});
for (const p of POSITIONS) if (!TALLY[p]) die(`fixture drift: nobody in the fixture voted ${p}`);

// Two of them represent the reader. Stubbed the way compare-hub publishes it.
const LOCAL = new Set([HOUSE[HOUSE.length - 1], HOUSE[HOUSE.length - 2]]);
B.win._pdxIsLocalToUser = (pid) => LOCAL.has(pid);

const RC = {
  id: 7701, chamber: "house", question: "On Passage", result: "passed", voteDate: "2026-02-11",
  totals: { yea: TALLY.yea, nay: TALLY.nay, present: TALLY.present, notVoting: TALLY.not_voting },
  votes: VOTES,
  source: { url: "https://clerk.house.gov/Votes/2026031", label: "Clerk of the House" },
};
const DATA = { measure: MEASURE, issues: ISSUES, rollcalls: [RC], positions: [], provisions: [], actions: [] };
const HTML = await render(B, DATA);
if (!HTML || HTML.length < 4000) die(`the act face rendered ${HTML.length} characters`);

// The drawer only, sliced off the rest of the panel — there is one roll call on
// the fixture, so the roll-call section's end is the drawer's end.
const dropAt = HTML.indexOf('<details class="bd-rolldrop">');
if (dropAt < 0) die("the roll call's names are not behind a drawer at all");
const DROP = HTML.slice(dropAt, HTML.indexOf("</section>", dropAt) + 10);
// And its head: what a reader meets while it is still closed, plus the controls
// that sit above the rows. Several claims below are about THIS, and would be
// trivially satisfied by four hundred rows that happen to contain the words.
const HEAD = HTML.slice(dropAt, HTML.indexOf('<div class="bd-votes"', dropAt));
if (!DROP || !HEAD) die("the drawer could not be sliced out of the page");

console.log(`\n🗳️  roll drawer — ${VOTES.length} names, ${LOCAL.size} of them the reader's own`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · closed on arrival, and closed is not shortened");
// ═════════════════════════════════════════════════════════════════════════════
{
  // A native disclosure with no `open`: works with no JS, and the browser paints
  // none of the rows until the reader asks for them.
  ok(/<details class="bd-rolldrop">/.test(HTML), "the drawer ships open, or is not a real disclosure element");
  hasNot(HTML, '<details class="bd-rolldrop" open', "the drawer ships open");
  // Every single voter is in the markup. This is the assertion the whole fold
  // depends on: fold, do not truncate.
  eq(count(HTML, /class="bd-vote-row/g), VOTES.length,
    "the drawer is not rendering one row per recorded vote — the fold has become a cut");
  for (const pid of [HOUSE[0], HOUSE[1], HOUSE[HOUSE.length - 1]]) {
    has(HTML, `data-pid="${pid}"`, `${pid} voted on this roll call but is not in the drawer`);
  }
  // No summarising language anywhere near it.
  ok(!/and \d+ others/i.test(HTML), "the roll list is claiming 'and N others' instead of printing them");
  ok(!/show (all|more)/i.test(HTML), "the roll list has a load-more control, which means it is not all there");
  // The names live inside the drawer, not beside it.
  const votesAt = HTML.indexOf('<div class="bd-votes"', dropAt);
  ok(votesAt > dropAt, "the list of names is outside the drawer that is supposed to hold it");
  // And the tally the reader meets first is untouched by any of this.
  has(HTML, `Yea ${TALLY.yea}`, "the roll call's own tally is no longer above the drawer");
  has(HTML, `Nay ${TALLY.nay}`, "the roll call's own tally is no longer above the drawer");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the door says what is behind it");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(HEAD, "See who voted", "the drawer does not use the words the vote strip promises");
  has(HEAD, `${VOTES.length} names on this roll call`, "the closed drawer does not say how many names are inside");
  has(HEAD, `your ${LOCAL.size} reps first`, "the drawer does not say the reader's own reps are at the top");
  // With no location set there is no claim about the reader's reps at all.
  const b2 = boot();
  const anon = await render(b2, DATA);
  has(anon, `${VOTES.length} names on this roll call`, "the count vanishes when no location is set");
  ok(!/your \d+ reps? first/.test(anon), "the drawer promises the reader's reps first with no location to place them");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the letterhead's strip is the door, and it opens this roll call");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(HTML, `data-bd-roll-open="${RC.id}"`, "the vote strip does not name the roll call it opens");
  has(HTML, `data-bd-rc="${RC.id}"`, "nothing in the roll list answers to the strip's roll call id");
  ok(HTML.indexOf('data-bd-goto="rolls"') < HTML.indexOf(`data-bd-rc="${RC.id}"`),
    "the strip is below the roll list it jumps to");
  // The handler: the jump opens the drawer as well as scrolling to it, because a
  // control labelled "See who voted" that lands on a shut door is a dead label.
  has(SRC, "function openRollDrop", "nothing opens the drawer on the strip's own tap");
  has(SRC, "openRollDrop(t, btn && btn.getAttribute", "the jump no longer opens the drawer it lands on");
  ok(/d\.open = true/.test(SRC), "openRollDrop does not actually open anything");
  // One roll call at a time: the id scopes it.
  has(SRC, "sec.querySelector('[data-bd-rc=\"' + rcid + '\"]')",
    "the jump opens every drawer on the measure rather than the one its strip belongs to");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the reader's filters — attributes and CSS, never a shorter list");
// ═════════════════════════════════════════════════════════════════════════════
{
  // One pill per position that actually has somebody in it, plus All, each
  // stating the count it will show.
  eq(count(HEAD, /class="bd-rf-btn"/g), POSITIONS.length + 1,
    "the filter does not offer one slice per recorded position plus the whole list");
  has(HEAD, `data-bd-roll-set="all" aria-pressed="true"`, "the drawer does not open on the whole roll call");
  eq(count(HEAD, /aria-pressed="true"/g), 1, "more than one slice of the roll call is selected at once");
  for (const p of POSITIONS) {
    has(HEAD, `data-bd-roll-set="${p}"`, `${p} is recorded on this roll call but cannot be filtered to`);
    has(HEAD, `<b>${TALLY[p]}</b>`, `the ${p} pill does not state how many rows it shows`);
  }
  has(HEAD, `All <b>${VOTES.length}</b>`, "the all-slice does not state the size of the roll call");
  // Present and Did not vote are different acts and stay different slices.
  has(HEAD, 'data-bd-roll-set="present"', "Present has been folded into some other slice");
  has(HEAD, 'data-bd-roll-set="not_voting"', "the members who did not vote have lost their own slice");
  // Every row carries its own position key, which is the only thing the filter
  // acts on — so filtering is CSS over a list that never gets shorter.
  eq(count(HTML, /data-bd-pos="/g), VOTES.length, "some member row carries no position key for the filter to read");
  for (const p of POSITIONS) {
    eq(count(HTML, new RegExp(`data-bd-pos="${p}"`, "g")), TALLY[p],
      `the position keys do not agree with the record about how many members voted ${p}`);
  }
  // A search box, and a place for it to say it found nothing.
  has(HEAD, "data-bd-roll-find", "there is no way to look for one name in four hundred");
  has(HEAD, 'class="bd-rf-none"', "a search that matches nothing has nowhere to say so");
  // The hiding is one CSS rule per slice, keyed to the attribute the reader set.
  for (const p of POSITIONS) {
    has(SRC, `.bd-votes[data-bd-roll-view="${p}"] .bd-vote-row:not([data-bd-pos="${p}"]){display:none;}`,
      `the ${p} slice is not a single attribute-keyed rule over rows that stay in the DOM`);
  }
  has(SRC, ".bd-vote-row.bd-vhide{display:none;}", "the name search hides rows by some means other than a marker class");
  // And the JS only ever marks rows; it never removes them.
  const find = SRC.slice(SRC.indexOf("function findInRoll"), SRC.indexOf("// Open the Issue View"));
  ok(find.length > 200, "findInRoll moved");
  ok(!/removeChild|remove\(\)|innerHTML/.test(find), "the name search is deleting rows instead of marking them");
  has(find, "classList.toggle('bd-vhide'", "the name search does not mark the rows that miss");
  const setv = SRC.slice(SRC.indexOf("function setRollView"), SRC.indexOf("function findInRoll"));
  ok(!/removeChild|remove\(\)|innerHTML/.test(setv), "the position filter is deleting rows instead of hiding them");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · your reps first, and nothing else reorders the list");
// ═════════════════════════════════════════════════════════════════════════════
{
  const order = [...HTML.matchAll(/class="bd-vote-name" data-pid="([^"]+)"/g)].map((m) => m[1]);
  eq(order.length, VOTES.length, "the row order could not be read back");
  for (const pid of LOCAL) {
    ok(order.indexOf(pid) < LOCAL.size,
      `${pid} represents this reader but is not in the first ${LOCAL.size} rows`);
  }
  // Below the reader's own, the order is position then name — arbitrary on
  // purpose, so no reader mistakes row order for importance.
  const rest = order.slice(LOCAL.size);
  const posOf = Object.fromEntries(VOTES.map((v) => [v.politicianId, v.position]));
  const rank = { yea: 1, nay: 2, present: 3, not_voting: 4 };
  const ranks = rest.map((pid) => rank[posOf[pid]]);
  eq(JSON.stringify(ranks), JSON.stringify([...ranks].sort((a, b) => a - b)),
    "below the reader's own reps the rows are not grouped by position");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · no new arithmetic, no party, no rank");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(!/\d\s*%/.test(DROP) && !DROP.includes("percent"),
    "there is a percentage in the roll drawer, where the tally above already has the counts");
  ok(!/Republican|Democrat|\bGOP\b|party/i.test(DROP), "the roll drawer brings party into a list of names");
  // The rank vocabulary is checked against the drawer's OWN WORDS — the door, the
  // filter, the note. The rows below are four hundred surnames off the roster and
  // one of them is genuinely called Lesser; a banned-word sweep over other
  // people's names would be measuring the roster, not this panel.
  for (const w of ["Primary", "secondary", "lesser", "footnote", "more important", "key vote"]) {
    hasNot(HEAD, w, `the roll drawer ranks part of the record with ${JSON.stringify(w)}`);
  }
  // Every row is the same element with the same parts, so no member can be given
  // less to work with than another.
  const rowClasses = [...HTML.matchAll(/<div class="(bd-vote-row[^"]*)"/g)].map((m) => m[1]);
  eq(new Set(rowClasses).size, 1, `the rows are not all the same element: ${[...new Set(rowClasses)].join(" / ")}`);
  // The reader's own reps are marked, and that is the only badge in the list.
  eq(count(HTML, /class="bd-rel"/g), LOCAL.size, "the local-rep badge is on the wrong number of rows");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the honest empties");
// ═════════════════════════════════════════════════════════════════════════════
{
  // A roll call we hold a tally for but no names: no drawer, and the gap is
  // stated rather than papered over with an empty door.
  const nonames = await render(boot(), { ...DATA, rollcalls: [{ ...RC, votes: [] }] });
  hasNot(nonames, "bd-rolldrop", "a roll call with no member votes on file grew an empty drawer");
  has(nonames, "Individual member votes for this roll call are not in the record yet",
    "a roll call with no names on file says nothing about the gap");
  has(nonames, 'data-bd-anchor="rolls"', "the roll section lost its anchor when it had no names");
  // A roll call where everyone voted the same way: the pills would say 'all'
  // twice, so there are none — and the search still works.
  const unan = await render(boot(), {
    ...DATA,
    rollcalls: [{ ...RC, votes: VOTES.map((v) => ({ ...v, position: "yea" })) }],
  });
  has(unan, "bd-rolldrop", "a unanimous roll call lost its drawer");
  hasNot(unan, "bd-rf-btn", "a unanimous roll call offers a filter with one slice in it");
  has(unan, "data-bd-roll-find", "a unanimous roll call lost the name search, which is the control that still helps");
  eq(count(unan, /class="bd-vote-row/g), VOTES.length, "the unanimous roll call is not printing every name");
}

// ── report ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.log(`✗ roll drawer: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`✓ roll drawer: all ${passed} assertions passed`);
console.log(`  ${VOTES.length} names folded, none dropped · 5 slices · ${LOCAL.size} local reps first · 0 percentages`);
