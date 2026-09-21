#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for THE THREE BOARDS THAT OPENED BESIDE SD-3 — /district/ut-hd-16,
// /district/ut-sd-7 and /district/ut-cd-2
// ─────────────────────────────────────────────────────────────────────────────
// scripts/test-district-voice-sd3.mjs is the DEEP suite. It reads one board end
// to end — every band, every absence state, every wall — and it stays the file
// that does that, because reading a surface once carefully is worth more than
// reading it four times quickly.
//
// THIS IS THE SIBLING, AND IT ASKS ONE QUESTION FOUR TIMES: is each address the
// same contract as SD-3, for its own seat? The three new boards are copies of a
// contract and not a new product, so what needs proving is not that a board
// works — SD-3's suite proves that — but that adding rows to a table did not
// quietly make four pages into one page with four URLs.
//
// THE FAILURE MODES, EVERY ONE OF WHICH SHIPS LOOKING FINE:
//
//   1. EVERY BOARD PAINTS SD-3. district-board.js resolves ACTIVE from the
//      document, so a document that forgot to declare its seat prints North
//      Ogden's heading, John Johnson's name and Weber County's room under a
//      Layton URL. §3 asserts all four documents declare their seat TWICE, and
//      §4 boots each one and reads the name that came out.
//   2. THE OFFICE LINE IS TIDIED. SD-7's roster row reads "Utah Senate
//      President" because the member who holds Senate District 7 presides over
//      that chamber; HD-16's reads "UT State Representative". A template that
//      composed "State Senator" from the chamber would be editing the record to
//      fit the page. §4 pins each printed office against the roster row AND
//      against its literal, so a roster correction is visible here rather than
//      silently absorbed.
//   3. THE CONGRESSIONAL SEAT GETS A WRITTEN-DOWN NAME. UT-2's holder is a JOIN
//      through voter-hub-location.js's _pdxUsHouseSeat(state, district), and a
//      pid copied into the board table would outlive the next map. §4 boots
//      ut-cd-2 with the real owner present and asserts the join's answer, then
//      boots it WITHOUT the owner and asserts "no member on file" — not a
//      guess, not the previous holder, not a roster scan.
//   4. THE ALLOW-LIST BECOMES A PATTERN. Four rows in four places. A
//      `/district/*` splat, or a `^ut-statehouse-\d+$` in the Function, would
//      open 75 Utah House districts with no document and no room. §1 and §2
//      assert named rows and the absence of any wildcard.
//   5. A COUNT IS INVENTED, OR A ZERO IS DRESSED AS DATA. §5 boots each board
//      against a store holding nothing and asserts three zeroes WITH their
//      provenance, and that the request carried this board's own alias.
//   6. EQUITY LANGUAGE REACHES A PUBLIC BOARD. §7 sweeps all three new
//      documents the way SD-3's suite sweeps the first.
//   7. THE FUNCTION LEARNS TO SELECT A ROW. §8 asserts every statement is an
//      aggregate and that no field a person could be reconstructed from is on
//      the wire.
//   8. THE HUB OFFERS THE EMPTY SENTENCE FOR A SEAT THAT NOW HAS A BOARD. §6
//      paints /voice for a reader in each of the three districts and asserts the
//      card is a door, and that a neighbouring seat's card still is not.
//
// Eight sections:
//
//   1. THE ADDRESSES — three exact 200s each, its own document, no splat.
//   2. THE FOUR ALLOW-LISTS AGREE, and a neighbour is on none of them.
//   3. THE DOCUMENTS — the seat declared twice, root-absolute, precached.
//   4. BAND 1 — the roster's office string, verbatim, and UT-2 is a join.
//   5. BAND 2 — structurally zero, in words, for this board's own seat.
//   6. THE HUB — Open board, not the empty sentence.
//   7. NO EQUITY LANGUAGE.
//   8. THE FUNCTION — aggregates only, and never a person row.
//
//   node scripts/test-district-boards.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const there = (f) => existsSync(join(ROOT, f));

const MOD = R("district-board.js");
const DV = R("district-voice.js");
const VR = R("voice-room.js");
const LOC = R("voter-hub-location.js");
const FN = R("netlify/functions/district-board.mts");
const TOML = R("netlify.toml");
const SW = R("sw.js");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const no = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
function report() {
  if (failures.length) {
    console.log(`\n   ${passed} passed, ${failures.length} failed\n`);
    for (const f of failures) console.log(`   ✗ ${f}`);
    process.exit(1);
  }
  console.log(`\n   ✓ district boards: all ${passed} assertions passed`);
}
const must = (c, m) => { if (!c) { failures.push(`FIXTURE: ${m}`); report(); } else passed++; };

const blank = (m) => String(m).replace(/[^\n]/g, " ");
const htmlBare = (s) => String(s).replace(/<!--[\s\S]*?-->/g, blank);
const styleBare = (s) => String(s).replace(/<style\b[\s\S]*?<\/style>/gi, blank);
const scriptBare = (s) => String(s).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, blank);
const tagBare = (s) => String(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const textOf = (f) => tagBare(scriptBare(styleBare(htmlBare(R(f)))));

// ── THE FOUR BOARDS, AS THIS SUITE EXPECTS TO FIND THEM ─────────────────────
// SD-3 is the CONTROL and is carried through every section deliberately: the
// three new boards are its contract, so a change that broke the copies and the
// original in the same way would otherwise pass. Its own deep suite is
// scripts/test-district-voice-sd3.mjs.
//
// `office` is the roster's string and is pinned here as a LITERAL rather than
// read out of cmp-data.js and compared to itself. §4 asserts both directions:
// the roster still says this, and band 1 still prints what the roster says.
const BOARDS = [
  {
    alias: "ut-sd-3", seat: "ut-statesenate-3", doc: "district-ut-sd-3.html",
    chamber: "statesenate", label: "State Senate", district: "3",
    pid: "john_johnson", join: false, control: true,
    heading: "Utah Senate District 3", office: "UT State Senator", member: "John Johnson",
    county: "Weber County", city: "North Ogden",
  },
  {
    alias: "ut-hd-16", seat: "ut-statehouse-16", doc: "district-ut-hd-16.html",
    chamber: "statehouse", label: "State House", district: "16",
    pid: "tlee", join: false,
    heading: "Utah House District 16", office: "UT State Representative", member: "Trevor Lee",
    county: "Davis County", city: "Layton",
  },
  {
    alias: "ut-sd-7", seat: "ut-statesenate-7", doc: "district-ut-sd-7.html",
    chamber: "statesenate", label: "State Senate", district: "7",
    pid: "sadams", join: false,
    heading: "Utah Senate District 7", office: "Utah Senate President", member: "Stuart Adams",
    county: "Davis County", city: "Layton",
  },
  {
    alias: "ut-cd-2", seat: "ut-house-2", doc: "district-ut-cd-2.html",
    chamber: "house", label: "U.S. House", district: "2",
    // NO PID ON THE ROW THIS SUITE CARRIES EITHER. The expected holder below is
    // what the JOIN answers today, and §4 asks the join rather than asserting
    // the module knows this name.
    pid: "", join: true, joinPid: "maloy",
    heading: "2nd Congressional District", office: "U.S. Representative", member: "Celeste Maloy",
    county: "Washington County", city: "Cedar City",
  },
];
const NEW_BOARDS = BOARDS.filter((b) => !b.control);
must(NEW_BOARDS.length === 3, `this suite expects three new boards, found ${NEW_BOARDS.length}`);

// ═════════════════════════════════════════════════════════════════════════════
// 1 · THE ADDRESSES
// ═════════════════════════════════════════════════════════════════════════════
section("1 · four addresses, three spellings each, and not one wildcard");

// EVERY REDIRECT THE FILE DECLARES, parsed off the source rather than through a
// TOML library, because what is asserted is the shape a human reads in the file.
const RULES = [...TOML.matchAll(/\[\[redirects\]\]\s*\n((?:\s*[a-z_]+\s*=\s*[^\n]+\n)+)/g)]
  .map((m) => {
    const f = (k) => (new RegExp(`^\\s*${k}\\s*=\\s*"?([^"\\n]+)"?`, "m").exec(m[1]) || [, ""])[1].trim();
    return { from: f("from"), to: f("to"), status: f("status") };
  });
must(RULES.length > 20, `netlify.toml parsed to only ${RULES.length} redirects`);

const districtRules = RULES.filter((r) => r.from.indexOf("/district/") === 0);
for (const b of BOARDS) {
  const want = [`/district/${b.alias}`, `/district/${b.alias}/`, `/district/${b.alias}.html`];
  for (const from of want) {
    const hit = districtRules.filter((r) => r.from === from);
    eq(hit.length, 1, `${b.alias}: exactly one rewrite for ${from}`);
    if (hit.length === 1) {
      eq(hit[0].to, `/${b.doc}`, `${from} → this board's own document`);
      eq(hit[0].status, "200", `${from} is a rewrite and not a redirect`);
    }
  }
}
// AND NOTHING ELSE UNDER /district/ IS SERVED. The set of from-values is exactly
// the twelve above: a thirteenth rule would be an address with no document, and
// a splat would be all of them.
eq(districtRules.length, BOARDS.length * 3,
  `/district/ has exactly ${BOARDS.length * 3} rules — one document, three spellings, four boards`);
for (const r of districtRules) {
  ok(r.from.indexOf("*") < 0 && r.from.indexOf(":") < 0,
    `no pattern in a /district/ rule (${r.from})`);
}
// THE ORDER INVARIANT SD-3's SUITE ALREADY KEEPS, restated across four boards:
// first match wins in netlify.toml, so no earlier rule may shadow these.
for (const b of BOARDS) {
  const mine = RULES.findIndex((r) => r.from === `/district/${b.alias}`);
  const shadow = RULES.findIndex((r, i) =>
    i < mine && (r.from === "/*" || (r.from.indexOf("*") >= 0 && r.from.indexOf("/district") === 0)));
  eq(shadow, -1, `${b.alias}: an earlier wildcard rule would answer before this one`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 2 · THE FOUR ALLOW-LISTS
// ═════════════════════════════════════════════════════════════════════════════
section("2 · four lists, four rows each, and a neighbouring seat is on none of them");

// (a) THE CLIENT BOARD TABLE, run rather than read.
const bootBare = (seat) => {
  const win = makeSandbox();
  if (seat) win.__PDX_DISTRICT_BOARD_SEAT = seat;
  const ctx = vm.createContext(win);
  vm.runInContext(MOD, ctx, { filename: "district-board.js" });
  return win;
};
const W = bootBare("");
const B = W.PDXDistrictBoard;
must(B && B.BOARDS, "PDXDistrictBoard did not publish a BOARDS table");

eq(Object.keys(B.BOARD_SEATS).sort().join(","), BOARDS.map((b) => b.seat).sort().join(","),
  "district-board.js: the allow-list is exactly these four seats");
for (const b of BOARDS) {
  const row = B.board(b.alias);
  must(!!row, `district-board.js: board("${b.alias}") answered nothing`);
  eq(row.seat, b.seat, `${b.alias}: the canonical key`);
  eq(row.route, `/district/${b.alias}`, `${b.alias}: the route it prints`);
  eq(B.board(b.seat), row, `${b.alias}: the canonical spelling finds the same row`);
  eq(row.pid, b.pid, `${b.alias}: the pid on the row (a congressional row carries none)`);
}
// THE CONGRESSIONAL ROW NAMES A LOOKUP, NOT A PERSON.
const CD = B.board("ut-cd-2");
ok(CD.usHouse && CD.usHouse.district === 2, "ut-cd-2: the row carries the usHouse lookup");
eq(CD.usHouse.state, "Utah",
  "ut-cd-2: the lookup is given the state NAME — _pdxUsHouseSeat indexes on the roster's own string");

// (b) THE HUB'S ROUTE TABLE.
const dvWin = makeSandbox();
vm.runInContext(DV, vm.createContext(dvWin), { filename: "district-voice.js" });
const V = dvWin.PDXVoice;
must(V && V.BOARD_ROUTES, "district-voice.js did not publish BOARD_ROUTES");
eq(Object.keys(V.BOARD_ROUTES).sort().join(","), BOARDS.map((b) => b.seat).sort().join(","),
  "district-voice.js: BOARD_ROUTES holds exactly these four rows");
for (const b of BOARDS) {
  eq(V.BOARD_ROUTES[b.seat], `/district/${b.alias}`, `BOARD_ROUTES[${b.seat}]`);
  eq(V.boardPath(b.alias), `/district/${b.alias}`, `boardPath("${b.alias}") — the alias spelling`);
  eq(V.boardPath(b.seat), `/district/${b.alias}`, `boardPath("${b.seat}") — the canonical spelling`);
}

// (c) THE FUNCTION'S COPY, read off the source it ships.
const fnSeats = (() => {
  const m = /const BOARD_SEATS: Record<string, 1> = \{([\s\S]*?)\};/.exec(FN);
  must(!!m, "district-board.mts no longer declares BOARD_SEATS in a shape this suite can read");
  return [...m[1].matchAll(/"([a-z0-9-]+)":\s*1/g)].map((x) => x[1]).sort();
})();
eq(fnSeats.join(","), BOARDS.map((b) => b.seat).sort().join(","),
  "district-board.mts: BOARD_SEATS is the same four seats the client holds");
ok(!/\\d\+|\[0-9\]\+|\.\*/.test((/const BOARD_SEATS[\s\S]*?\};/.exec(FN) || [""])[0]),
  "district-board.mts: the allow-list is rows and not a pattern");

// (d) AND A NEIGHBOUR IS ON NONE OF THEM. HD-15 is next door to HD-16, SD-8 is
// next door to SD-7, UT-1 is next door to UT-2, and not one of them has a
// document, a room or a reader. This is the whole reason the list is a list.
for (const near of ["ut-hd-15", "ut-hd-17", "ut-sd-4", "ut-sd-8", "ut-cd-1", "ut-cd-3"]) {
  eq(B.board(near), null, `district-board.js: ${near} has no board`);
  eq(V.boardPath(near), "", `district-voice.js: ${near} gets no route`);
  ok(fnSeats.indexOf(near) < 0, `district-board.mts: ${near} is not on the server's list`);
  ok(!there(`district-${near}.html`), `…and ${near} has no document on disk either`);
}
// THE SPLAT IS ASSERTED ABSENT FROM THE RULES AND NOT FROM THE FILE. The
// comment block above those twelve rules explains at length why /district/* is
// the wrong shape here, so a substring sweep of the bytes would fail on the
// paragraph that keeps the wall.
ok(!RULES.some((r) => r.from.indexOf("/district") === 0 && r.from.indexOf("*") >= 0),
  "netlify.toml: no /district/ splat rule");
ok(!/from\s*=\s*"\/district\/[^"]*\*/.test(TOML), "netlify.toml: …by any spelling");

// ═════════════════════════════════════════════════════════════════════════════
// 3 · THE DOCUMENTS
// ═════════════════════════════════════════════════════════════════════════════
section("3 · each document says which seat it is, twice, and never infers it");

for (const b of BOARDS) {
  must(there(b.doc), `${b.doc} is not on disk`);
  const doc = R(b.doc);
  const text = textOf(b.doc);

  // THE SEAT, DECLARED TWICE. A sync flag in the head (read at module load, so
  // the scalar exports answer for this board) and the host's own attribute
  // (read by mount(), so the paint cannot resolve to another seat).
  has(doc, `window.__PDX_DISTRICT_BOARD_SEAT = '${b.alias}'`,
    `${b.doc}: the head declares this board's seat`);
  has(doc, `id="pdx-district-board" data-pdxdb-seat="${b.alias}"`,
    `${b.doc}: the host declares it too`);
  eq((doc.match(/__PDX_DISTRICT_BOARD_SEAT\s*=/g) || []).length, 1,
    `${b.doc}: the seat is declared once in the head, not twice with two answers`);
  // AND NO OTHER BOARD'S ALIAS IS DECLARED ON IT.
  for (const other of BOARDS) {
    if (other.alias === b.alias) continue;
    no(doc, `data-pdxdb-seat="${other.alias}"`, `${b.doc}: does not host ${other.alias}`);
    no(doc, `__PDX_DISTRICT_BOARD_SEAT = '${other.alias}'`, `${b.doc}: does not declare ${other.alias}`);
  }

  has(doc, "window.__PDX_DISTRICT_BOARD_DOC = true", `${b.doc}: the board-document flag`);
  has(doc, 'data-pdxdb-boot="waiting"', `${b.doc}: the host boots as waiting, not as a number`);
  has(doc, `<link rel="canonical" href="https://politidex.fyi/district/${b.alias}"`,
    `${b.doc}: canonical is its own address`);
  has(text, b.heading, `${b.doc}: the heading names this seat`);

  // ROOT-ABSOLUTE ONLY. /district/<alias>/ is served 200, so a bare src would
  // resolve under it, the rewrite would answer with this document, and the
  // browser would parse HTML as JavaScript.
  for (const u of [...doc.matchAll(/\b(?:src|href)="([^"]*)"/g)].map((m) => m[1])) {
    ok(/^(?:https?:|\/|#|mailto:|data:)/.test(u), `${b.doc}: "${u}" is not root-absolute`);
  }

  // NO HEADCOUNT IN THE SERVED MARKUP. Band 2's figures arrive from the
  // Function or they do not arrive; a number in the file is a number that is
  // true for nobody.
  const invented = [...text.matchAll(/\b(\d+)\s+(verified|residents?|neighbours?|neighbors?|people|participants)\b/gi)]
    .map((m) => m[0]);
  eq(invented.length, 0, `${b.doc}: no headcount in the served copy — found ${JSON.stringify(invented)}`);

  // THE SHELL KNOWS THIS DOCUMENT BY NAME.
  has(SW, `'/${b.doc}'`, `sw.js: ${b.doc} is precached`);
  has(SW, `'${b.alias}': '/${b.doc}'`, `sw.js: the offline branch maps /district/${b.alias} to its own document`);
}
// AND THE OFFLINE BRANCH ASKS THE MAP RATHER THAN THE FIRST BOARD. The single
// shell.match('/district-ut-sd-3.html') this replaced would have served Weber
// County's heading under every one of the four addresses.
has(SW, "const boardFile = districtBoardDoc(url && url.pathname);",
  "sw.js: the offline board response is resolved per path");
ok(!/shell\.match\(["']\/district-ut-sd-3\.html["']\)/.test(SW),
  "sw.js: no branch answers a district nav with SD-3's document unconditionally");

// THE MODULE IS ONE MODULE. Three boards, no third implementation.
for (const f of ["district-board-hd16.js", "district-board-sd7.js", "district-board-cd2.js",
                 "district-board-2.js"]) {
  ok(!there(f), `there is no forked board implementation (${f})`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 4 · BAND 1
// ═════════════════════════════════════════════════════════════════════════════
section("4 · band 1 prints the roster's own office string, and UT-2 is a join");

// THE ROSTER, RUN ONCE. It is the source band 1 reads and the source this suite
// compares against, so a roster edit shows up as a failure here rather than as a
// page quietly agreeing with itself.
const ROSTER = (() => {
  const win = makeSandbox();
  vm.runInContext(R("cmp-data.js"), vm.createContext(win), { filename: "cmp-data.js" });
  return win.CMP_DATA;
})();
must(ROSTER && Object.keys(ROSTER).length > 100, "cmp-data.js did not produce a roster");

// One board, booted with the files that document ships, and band 1 asked
// directly. `withJoin` decides whether voter-hub-location.js — the one owner of
// "who holds this congressional district" — is present, which is the difference
// between /district/ut-cd-2 in a browser and the same page with that script
// removed.
function band1(b, withJoin) {
  const win = makeSandbox();
  win.__PDX_DISTRICT_BOARD_SEAT = b.alias;
  const ctx = vm.createContext(win);
  const files = ["cmp-data.js", "issue-map.js"];
  if (withJoin) files.push("voter-hub-location.js");
  files.push("district-board.js");
  for (const f of files) vm.runInContext(R(f), ctx, { filename: f });
  const M = win.PDXDistrictBoard;
  must(M && typeof M.seatHtml === "function", `${b.alias}: the module did not publish seatHtml`);
  return { win, M, html: M.seatHtml() };
}

for (const b of BOARDS) {
  // A STATE BOARD IS BOOTED THE WAY ITS DOCUMENT BOOTS: without the location
  // module, which those three documents do not load and do not need.
  const withJoin = b.join;
  const { M, html } = band1(b, withJoin);
  const pid = b.join ? b.joinPid : b.pid;

  eq(M.SEAT, b.seat, `${b.alias}: the module resolved this document's seat`);
  eq(M.ALIAS, b.alias, `${b.alias}: …and its alias`);
  eq(M.ROUTE, `/district/${b.alias}`, `${b.alias}: …and its route`);
  eq(M.PID, pid, `${b.alias}: the holder the module answers`);

  const row = ROSTER[pid];
  must(row && row.name, `${b.alias}: the roster has no row for ${pid}`);
  // THE PIN, BOTH WAYS. The roster still spells the office this way…
  eq(row.office, b.office, `${b.alias}: the roster's office string for ${pid}`);
  eq(row.name, b.member, `${b.alias}: the roster's name for ${pid}`);
  // …and band 1 prints it as spelled, composing nothing.
  has(html, 'data-pdxdb-band="seat"', `${b.alias}: band 1 declares itself`);
  has(html, `<p class="pdxdb-seat-office">${b.office}</p>`,
    `${b.alias}: the office line is the roster's string, verbatim`);
  has(html, row.name, `${b.alias}: band 1 names the sitting member`);
  has(html, `href="/p/${pid}"`, `${b.alias}: …linked to their person file`);
  // NO SCORECARD. A district page that printed a member's record would be a
  // person page with a place's title.
  no(html, "data-party", `${b.alias}: band 1 prints no party`);
  ok(!/\b(score|kept|broken|pending)\b/i.test(html), `${b.alias}: band 1 prints no record figures`);
  ok(html.length < 1200, `${b.alias}: band 1 is a seat, not a dossier (${html.length} chars)`);
}

// THE CHAMBER IS NOT CONFUSED, IN EITHER DIRECTION. A state seat whose page
// called itself congressional would be wrong about which body makes the laws on
// its own table; the congressional one must not call itself a state seat.
for (const b of BOARDS) {
  const text = textOf(b.doc);
  const { html } = band1(b, b.join);
  const FEDERAL = /\b(Congress|Congressional|Congressman|Congresswoman|U\.S\. Senator|U\.S\. Representative|House of Representatives)\b/;
  if (b.join) {
    ok(FEDERAL.test(text), `${b.doc}: a congressional district says so`);
    ok(!/\bState (Senate|House|Senator|Representative)\b/.test(html),
      "ut-cd-2: band 1 does not call a federal seat a state one");
  } else {
    ok(!FEDERAL.test(text), `${b.doc}: a state seat's copy uses no federal word`);
    ok(!FEDERAL.test(html), `${b.alias}: …and neither does band 1`);
  }
}

// ── THE JOIN, AND THE SENTENCE WHEN IT IS EMPTY ─────────────────────────────
{
  // The owner is asked directly, with the arguments the board row carries.
  const { win } = band1(BOARDS[3], true);
  must(typeof win._pdxUsHouseSeat === "function",
    "voter-hub-location.js did not publish _pdxUsHouseSeat on the cd-2 boot");
  eq(win._pdxUsHouseSeat("Utah", 2), "maloy", "_pdxUsHouseSeat('Utah', 2) is the holder band 1 printed");
  // THE MODULE NEVER WRITES THAT NAME DOWN. This is the assertion that keeps the
  // congressional board honest across a redistricting.
  no(MOD, "maloy", "district-board.js does not carry a congressional pid");
  for (const b of BOARDS) no(R(b.doc), "maloy", `${b.doc} does not carry a congressional pid either`);
}
{
  // THE OWNER ABSENT — which is also a cold roster and a genuinely empty join,
  // and all three print the same sentence. NOT a guess, not a roster scan, not
  // the previous holder.
  const { M, html } = band1(BOARDS[3], false);
  eq(M.PID, "", "ut-cd-2 without the lookup: the module answers no holder");
  has(html, 'data-pdxdb-seat-state="nobody"', "ut-cd-2 without the lookup: band 1 says the state out loud");
  has(html, "No member on file for this seat.", "ut-cd-2 without the lookup: the honest sentence");
  ok(!/href="\/p\//.test(html), "…and no person link to nowhere");
  for (const name of ["Maloy", "Celeste", "Owens", "Curtis", "Stewart"]) {
    no(html, name, `ut-cd-2 without the lookup: band 1 does not guess "${name}"`);
  }
  // AND THE DOCUMENT LOADS THAT OWNER, so the browser case is the join and not
  // this fallback. It is the ONLY board document that does — the other three
  // resolve their holder from a roster key and adding a location module to say
  // so would be a personal "you are in" line nobody asked for.
  const loads = (f, u) => [...R(f).matchAll(/\bsrc="([^"]*)"/g)].some((m) => m[1].indexOf(u) >= 0);
  ok(loads("district-ut-cd-2.html", "/voter-hub-location.js"),
    "district-ut-cd-2.html loads the owner of the congressional join");
  for (const b of BOARDS) {
    if (b.join) continue;
    ok(!loads(b.doc, "/voter-hub-location.js"),
      `${b.doc}: no location module on a roster-keyed board`);
  }
  // NO PERSONAL LOCATION LINE ANYWHERE. "You are in HD-16" is a claim about a
  // stranger, and this pass did not seed residency.
  for (const b of BOARDS) {
    const text = textOf(b.doc);
    for (const p of ["You are in", "your district", "Your district", "you live in"]) {
      no(text, p, `${b.doc}: no personal residency claim ("${p}")`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 5 · BAND 2
// ═════════════════════════════════════════════════════════════════════════════
section("5 · who is in the room: three zeroes, their provenance, and this seat's alias");

function hostEl() {
  const el = {
    innerHTML: "", _attrs: {},
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null; },
    appendChild() {},
  };
  return el;
}
const flush = (n = 12) => {
  let p = Promise.resolve();
  for (let i = 0; i < n; i++) p = p.then(() => new Promise((r) => setTimeout(r, 0)));
  return p;
};

// THE EMPTY ROOM, WHICH IS THE TRUE STATE OF ALL FOUR BOARDS TODAY. Nothing has
// been filed in any of them, and the page's job is to say that in words rather
// than to print 0 and let a reader decide what it meant.
const EMPTY = (seat) => ({
  seat,
  counts: { verified: 0, stance: 0, participants: 0 },
  stores: { verified: true, stance: false, participants: true },
  rooms: [],
});

for (const b of BOARDS) {
  const win = makeSandbox();
  win.__PDX_DISTRICT_BOARD_SEAT = b.alias;
  const ctx = vm.createContext(win);
  const urls = [];
  win.fetch = (url) => {
    urls.push(String(url));
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(EMPTY(b.seat)) });
  };
  win.PDXStances = { all: () => [], count: () => 0 };
  win.PDXYourFile = { answered: () => [], position: () => null };
  win.PDXVotingRecord = { fetchMember: () => Promise.resolve({ items: [], summary: {} }) };
  for (const f of ["cmp-data.js", "issue-map.js", "issue-colors.js", "stance-sides.js"]) {
    vm.runInContext(R(f), ctx, { filename: f });
  }
  vm.runInContext(MOD, ctx, { filename: "district-board.js" });

  const M = win.PDXDistrictBoard;
  const el = hostEl();
  el.setAttribute("data-pdxdb-seat", b.alias);
  ok(M.mount(el) === true, `${b.alias}: the board mounts on its own host`);

  // THE REQUEST CARRIES THIS BOARD'S ALIAS AND NO OTHER. This is the assertion
  // that catches four pages sharing one seat.
  const counted = urls.filter((u) => u.indexOf("/api/district-board") === 0);
  eq(counted.length, 1, `${b.alias}: exactly one count request`);
  eq(counted[0], `/api/district-board?seat=${b.alias}`, `${b.alias}: …for this seat`);
  ok(urls.every((u) => u.indexOf("http") !== 0), `${b.alias}: nothing is fetched cross-origin`);

  const band = M.roomHtml("ok", EMPTY(b.seat));
  has(band, 'data-pdxdb-band="room"', `${b.alias}: band 2 declares itself`);
  // THREE ZEROES, EACH WITH ITS NOUN. Not a bare 0, not a dash, not a blank.
  eq((band.match(/data-pdxdb-count="0"/g) || []).length, 3,
    `${b.alias}: three counts, all structurally zero`);
  eq((band.match(/0 people/g) || []).length, 3, `${b.alias}: …each printed as a sentence`);
  // AND THE PROVENANCE. The stance row has no store at all and says so; the
  // other two have open stores holding nobody, which is a different fact.
  eq((band.match(/data-pdxdb-store="absent"/g) || []).length, 1,
    `${b.alias}: one figure has no store behind it`);
  eq((band.match(/data-pdxdb-store="present"/g) || []).length, 2,
    `${b.alias}: …and two are open stores holding nobody`);
  has(band, "on hand", `${b.alias}: the absence line is the money lane's grammar`);
  ok(!/\byet\b/i.test(tagBare(band)), `${b.alias}: band 2 promises no record that may not come`);
  ok(!/\d\s*%/.test(band), `${b.alias}: no proportion, so no majority`);

  // A READ THAT FAILED IS THE THIRD ANSWER AND IS NEVER A ZERO.
  const unread = M.roomHtml("unread", null);
  ok(!/data-pdxdb-count="0"/.test(unread), `${b.alias}: a failed read prints no zero`);
  has(unread, "could not read", `${b.alias}: …it says it could not read the room`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 6 · THE HUB
// ═════════════════════════════════════════════════════════════════════════════
section("6 · /voice offers a door for these three seats and still refuses the neighbours");

// THE RETURN HELPER, SLICED OUT OF ITS OWNER, exactly as test-voice-hub.mjs
// does: voice-room.js asks it for the finder's return intent, and the module
// that owns it is 255 KB of location picker.
const RET_SRC = (() => {
  const at = LOC.indexOf("window.PDXReturn = (function () {");
  must(at > 0, "voter-hub-location.js no longer declares window.PDXReturn");
  const end = LOC.indexOf("\n  })();", at);
  must(end > at, "the PDXReturn IIFE has no closing line this suite can find");
  return LOC.slice(at, end + "\n  })();".length);
})();

// The hub painted for real: district-voice.js and voice-room.js booted together
// in the order voice.html loads them, against a saved location that resolves the
// levels a reader in this district would have.
function hub(levels, loc, people) {
  const win = makeSandbox();
  let now = 1000000;
  win.Date = { now: () => now };
  const mk = (id) => ({
    id, innerHTML: "", _attrs: {},
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null; },
  });
  const els = {
    "pdx-voice-standing": mk("pdx-voice-standing"),
    "pdx-voice-seats": mk("pdx-voice-seats"),
  };
  win.document.getElementById = (id) => els[id] || null;
  win.__PDX_VOICE_DOC = true;
  win.location = {
    href: "https://politidex.fyi/voice", pathname: "/voice", search: "", hash: "",
    origin: "https://politidex.fyi", assign() {}, replace() {},
  };
  win._hasUserLocation = true;
  win._currentVoterLocation = loc;
  win.pdxRepsForMe = () => ({ located: true, state: loc.state, county: loc.county, levels });
  win.PROFILES = {};
  win.CMP_DATA = {};
  win._pdxPersonById = (pid) => (people && people[pid]) || null;
  const ctx = vm.createContext(win);
  let err = null;
  try {
    vm.runInContext(RET_SRC, ctx, { filename: "voter-hub-location.js#PDXReturn" });
    vm.runInContext(DV, ctx, { filename: "district-voice.js" });
    vm.runInContext(VR, ctx, { filename: "voice-room.js" });
  } catch (e) { err = e; }
  now += 20000;
  let state = "";
  try { state = win.PDXVoiceRoom.paint(); } catch (e) { err = err || e; }
  return { win, err, state, list: els["pdx-voice-seats"].innerHTML };
}
const level = (b) => ({
  key: b.chamber, seat: b.chamber, label: b.label, statewide: false,
  district: b.district, pid: b.join ? b.joinPid : b.pid, resolved: true,
});

// THE EMPTY SENTENCE, read off the module that owns it so the assertion cannot
// drift from the copy.
const NONE = V.COPY && V.COPY.boardNone;
must(typeof NONE === "string" && NONE.length > 10,
  "district-voice.js publishes no boardNone sentence for this suite to look for");

for (const b of NEW_BOARDS) {
  const pid = b.join ? b.joinPid : b.pid;
  const h = hub([level(b)], { state: "Utah", city: b.city, county: b.county },
    { [pid]: { name: b.member, pid } });
  ok(!h.err, `${b.alias}: the hub boots (${h.err ? h.err.message : "ok"})`);
  has(h.list, `href="/district/${b.alias}"`, `${b.alias}: the card carries a door to this board`);
  has(h.list, "Open board", `${b.alias}: …and the door reads "Open board"`);
  has(h.list, 'data-pdxvr-board="on"', `${b.alias}: …and the card says it has one`);
  no(h.list, NONE, `${b.alias}: the card is not the empty sentence`);
  has(h.list, b.member, `${b.alias}: the card still names the sitting member`);
  // NO COUNT IN THE HALLWAY. A hallway says which rooms exist and nothing about
  // how busy they are.
  ok(!/\b\d+\s+(people|person|neighbours|neighbors|residents)\b/i.test(tagBare(h.list)),
    `${b.alias}: the hub card prints no headcount`);
}

// AND THE NEIGHBOUR STILL GETS WORDS. HD-15 is not HD-16, and that exclusivity
// IS the product: a Layton reader handed the Weber board is handed a room they
// cannot speak in.
{
  const near = {
    key: "statehouse", seat: "statehouse", label: "State House", statewide: false,
    district: "15", pid: "defay_h15", resolved: true,
  };
  const h = hub([near], { state: "Utah", city: "Layton", county: "Davis County" },
    { defay_h15: { name: "Ariel Defay", pid: "defay_h15" } });
  ok(!h.err, `hd-15: the hub boots (${h.err ? h.err.message : "ok"})`);
  has(h.list, NONE, "hd-15: a seat with no board gets the empty sentence");
  has(h.list, 'data-pdxvr-board="off"', "hd-15: …and the card says it has no door");
  no(h.list, "Open board", "hd-15: …and no door labelled as one");
  for (const b of BOARDS) {
    no(h.list, `/district/${b.alias}`, `hd-15: no board address is offered (${b.alias})`);
  }
  ok(!/\byet\b/i.test(tagBare(h.list)), "hd-15: a seat with no board is not a seat waiting for one");
}

// ALL FOUR SEATS IN ONE READER'S HALLWAY, which is not a real location but is
// the arithmetic: four doors, four addresses, no address printed twice.
{
  const h = hub(BOARDS.map(level), { state: "Utah", city: "Layton", county: "Davis County" },
    Object.fromEntries(BOARDS.map((b) => {
      const pid = b.join ? b.joinPid : b.pid;
      return [pid, { name: b.member, pid }];
    })));
  ok(!h.err, `all four: the hub boots (${h.err ? h.err.message : "ok"})`);
  eq((h.list.match(/class="pdxvr-door"/g) || []).length, 4, "all four: four doors");
  for (const b of BOARDS) {
    eq((h.list.match(new RegExp(`href="/district/${b.alias}"`, "g")) || []).length, 1,
      `all four: ${b.alias} is offered exactly once`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 7 · NO EQUITY LANGUAGE
// ═════════════════════════════════════════════════════════════════════════════
section("7 · a public board does not read like a place to buy into");

// THE SPECIFIED SWEEP, over the raw bytes of each new document: a comment ships
// to the reader too, so "we sell nothing here" in a banner is still the
// vocabulary appearing on the page.
const BANNED_LITERAL = /share[s]|stock[s]|unit[s]|Reg CF|20%|freeze|dues/gi;
for (const b of NEW_BOARDS) {
  const hits = [...R(b.doc).matchAll(BANNED_LITERAL)].map((m) => m[0]);
  eq(hits.length, 0, `${b.doc}: zero matches for the equity sweep — found ${JSON.stringify(hits)}`);
}
// AND THE WIDER VOCABULARY, over what a reader actually sees.
const BANNED_WORDS = /\b(shares?|stocks?|units?|dues|freeze|frozen|equity|equities|dividend|investor|investment|valuation|pro rata|cap table|subscription agreement|accredited)\b/gi;
for (const b of NEW_BOARDS) {
  const hits = [...textOf(b.doc).matchAll(BANNED_WORDS)].map((m) => m[0]);
  eq(hits.length, 0, `${b.doc} (visible text): no equity vocabulary — found ${JSON.stringify(hits)}`);
}
for (const b of NEW_BOARDS) {
  const text = textOf(b.doc);
  ok(!/\d\s*%/.test(text), `${b.doc}: no percentage in the visible copy`);
  ok(!/\byet\b/i.test(text), `${b.doc}: the visible copy never says "yet"`);
  // NO COMPOSER, NO PROCESSOR, NO IDENTITY VENDOR. All three are still out.
  for (const v of ["stripe", "veriff", "persona", "plaid", "onfido", "jumio"]) {
    ok(!new RegExp("\\b" + v + "\\b", "i").test(R(b.doc)), `${b.doc}: no ${v}`);
  }
  for (const p of ["the district supports", "the district opposes", "majority of residents",
                   "most residents", "district favors", "district favours"]) {
    ok(!new RegExp(p, "i").test(R(b.doc)), `${b.doc}: no claim that "${p}…"`);
  }
  // AND NO DIRECTION MATCH ON A BOARD. It is a person-file instrument.
  for (const u of [...R(b.doc).matchAll(/\bsrc="([^"]*)"/g)].map((m) => m[1])) {
    ok(u.indexOf("direction-match") < 0, `${b.doc}: no Direction Match on a board (${u})`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 8 · THE FUNCTION
// ═════════════════════════════════════════════════════════════════════════════
section("8 · the endpoint still aggregates, and still cannot return a person");

// EVERY STATEMENT IS AN AGGREGATE. Not one select in this file names a column
// that is not a count or an issue key, so a client cannot reconstruct a person
// from what it is handed even by accident.
const selects = [...FN.matchAll(/\.select\(\{([\s\S]*?)\}\)/g)].map((m) => m[1]);
must(selects.length >= 8, `district-board.mts: found only ${selects.length} selects`);
for (const s of selects) {
  has(s, "countDistinct(", "every select is a COUNT DISTINCT and not a row read");
  const keys = [...s.matchAll(/([A-Za-z_$][\w$]*)\s*:/g)].map((m) => m[1]);
  ok(keys.every((k) => k === "v" || k === "issueKey"),
    `the only fields selected are counts and issue keys — found ${JSON.stringify(keys)}`);
}
// NO ROW READ AT ALL, by any other spelling.
for (const spelling of [".limit(", "selectDistinct", "select()", ".findFirst", ".findMany"]) {
  no(FN, spelling, `district-board.mts: no row read (${spelling})`);
}
// AND THE BODY IS FOUR FIELDS. Whatever else changes, nothing a person is
// identified by may be added to it.
const BODY = (/return json\(\{[\s\S]*?\n    \}\);/.exec(FN) || [""])[0];
must(BODY.length > 100, "the success response could not be located in district-board.mts");
for (const leak of ["authorHash", "author_hash", "userId", "user_id", "pid", "email", "name",
                    "address", "county", "createdAt", "body"]) {
  ok(!new RegExp(`(?:^|[\\s{,])${leak}\\s*:`).test(BODY),
    `district-board.mts: the response body carries no ${leak}`);
}
for (const k of ["seat", "counts", "stores", "rooms"]) {
  has(BODY, k, `district-board.mts: the response still carries ${k}`);
}
// IT IS READ-ONLY AND GET-ONLY. A read-only surface should be served by a
// Function that could not write if it were asked to.
has(FN, 'req.method.toUpperCase() !== "GET"', "district-board.mts: GET only");
for (const w of [".insert(", ".update(", ".delete(", "db.execute("]) {
  no(FN, w, `district-board.mts: no write (${w})`);
}
// AND AN OFF-LIST SEAT IS A 404 AND NEVER A ROW OF ZEROES. "Nobody is here" and
// "there is no here" are different sentences.
has(FN, 'code: "no_seat" }, 404', "district-board.mts: an off-list seat is 404");
has(FN, 'code: "unread" }, 503', "district-board.mts: a failed read is 503 and not a zero");
// THE FOUR ALIASES ALL NORMALIZE TO THEIR CANONICAL KEY BEFORE THE QUERY, so
// Postgres only ever sees one spelling of a seat.
{
  const src = (/const SEAT_KEY_RE[\s\S]*?\n}\n/.exec(FN) || [""])[0]
    .replace(/:\s*Record<string, string>/g, "").replace(/:\s*unknown/g, "").replace(/:\s*string/g, "");
  must(src.indexOf("normalizeSeatKey") > 0, "district-board.mts: normalizeSeatKey could not be lifted");
  const fnNorm = new Function(`${src}; return normalizeSeatKey;`)();
  for (const b of BOARDS) {
    eq(fnNorm(b.alias), b.seat, `district-board.mts: ${b.alias} normalizes to ${b.seat}`);
    eq(fnNorm(b.seat), b.seat, `district-board.mts: ${b.seat} is already canonical`);
    eq(fnNorm(b.alias.toUpperCase()), b.seat, `district-board.mts: a shouted ${b.alias} is the same seat`);
  }
  eq(fnNorm("ut-xx-2"), "", "district-board.mts: an unknown chamber is not a seat");
  eq(fnNorm("ut-hd-0"), "", "district-board.mts: district 0 is not a seat");
}

// ═════════════════════════════════════════════════════════════════════════════
await flush(4);
report();
