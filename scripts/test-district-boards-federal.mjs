#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-district-boards-federal.mjs — every other state's U.S. House and Senate
// boards
// ─────────────────────────────────────────────────────────────────────────────
// scripts/gen-district-boards.mjs's planFederal() opens a board for every U.S.
// House and U.S. Senate seat outside Utah that the roster names a sitting
// member for, from the same template, on the same three-band contract, the same
// allow-lists and the same composer, poll and Didit residency check as Utah's —
// with no offline copy.
//
// WHAT THIS SUITE PROVES:
//   1. The plan: every federal board is a named row of BOARD_ROUTES, BOARDS,
//      the Function's BOARD_SEATS and netlify.toml (three exact 200 rewrites),
//      and BOARD_ROUTES' length is the generator's plan. No splat.
//   2. Every federal seat is on all three composer lists and has its
//      dd_districts row; every federal document carries the composer and poll
//      hosts and the locked line, no equity language, and no offline copy. The
//      gate itself is scripts/test-district-boards-federal-voice.mjs.
//   3. Band 1 on every federal board names the sitting member the roster's own
//      join names, and a handful of fixtures are who they should be.
//   4. A seat the roster names nobody for has no board, and /voice says "Board
//      not on hand" for it and never "yet".
//   5. Utah is unchanged: every district-ut-*.html is the bytes it was, and the
//      Utah rows still lead every allow-list in their old order.
//   6. Driven /voice for Missouri, Wyoming and New York: the U.S. House and both
//      U.S. Senate cards open their boards; the governor's card does not.
//   7. The coverage sentence on /voice and the homepage counts BOARD_ROUTES.
// ─────────────────────────────────────────────────────────────────────────────
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { FEDERAL_STATES, HAND_SEATS, planBoards } from "./gen-district-boards.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const there = (f) => existsSync(join(ROOT, f));

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
    for (const f of failures.slice(0, 60)) console.log(`   ✗ ${f}`);
    process.exit(1);
  }
  console.log(`\n   ✓ federal district boards: all ${passed} assertions passed`);
}
const must = (c, m) => { if (!c) { failures.push(`FIXTURE: ${m}`); report(); } else passed++; };

const DV = R("district-voice.js");
const VR = R("voice-room.js");
const LOC = R("voter-hub-location.js");
const SM = R("seated-member.js");
const PA = R("profile-alias.js");
const FN = R("netlify/functions/district-board.mts");
const TOML = R("netlify.toml");
const SW = R("sw.js");

const { boards: PLAN, skipped: SKIPPED } = planBoards();
const FED = PLAN.filter((b) => b.federal);
// NE-2 opened read-only (FEDERAL_READ_ONLY_SEATS): every other federal board
// takes a voice. test-six-state-deepen.mjs holds NE-2 off the composer's lists.
const FED_VOICED = FED.filter((b) => !b.readOnly);
const UT = PLAN.filter((b) => !b.federal && !b.stateLeg && !b.outsideUtah);
const ROSTER = (() => {
  const w = makeSandbox();
  vm.runInContext(R("cmp-data.js"), vm.createContext(w), { filename: "cmp-data.js" });
  return w.CMP_DATA;
})();
const V = (() => {
  const w = makeSandbox();
  w.window = w;
  vm.runInContext(DV, vm.createContext(w), { filename: "district-voice.js" });
  return w.PDXVoice;
})();
const B = (() => {
  const w = makeSandbox();
  vm.runInContext(R("district-board.js"), vm.createContext(w), { filename: "district-board.js" });
  return w.PDXDistrictBoard;
})();
must(V && V.BOARD_ROUTES, "district-voice.js did not publish BOARD_ROUTES");
must(B && B.BOARD_SEATS, "district-board.js did not publish BOARD_SEATS");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · every federal board is a named row, and the count is the plan");
// ═════════════════════════════════════════════════════════════════════════════
must(FED.length > 0, "the plan opened no board outside Utah");
eq(Object.keys(V.BOARD_ROUTES).length, HAND_SEATS.length + PLAN.length,
  "BOARD_ROUTES length = the six hand rows + the generator's plan");
eq(FED.length, FED.filter((b) => b.usHouse).length + FED.filter((b) => b.statewide).length,
  "every federal board is a U.S. House or a U.S. Senate seat");
ok(FED.every((b) => !/^ut-/.test(b.seat)), "no federal board is a Utah seat");
ok(!FED.some((b) => /-(?:gov|statehouse|statesenate|hd|sd)-?/.test(b.seat)),
  "no governor and no state legislative seat outside Utah");
eq(new Set(FED.map((b) => b.seat)).size, FED.length, "no seat is planned twice");
const fnSeats = (() => {
  const m = /const BOARD_SEATS[^=]*=\s*\{([\s\S]*?)\n\};/.exec(FN);
  return m ? new Set([...m[1].matchAll(/"([^"]+)":\s*1/g)].map((x) => x[1])) : new Set();
})();
const RULES = [...TOML.matchAll(/\[\[redirects\]\]\s*\n\s*from = "([^"]+)"\s*\n\s*to = "([^"]+)"\s*\n\s*status = (\d+)/g)]
  .map((m) => ({ from: m[1], to: m[2], status: m[3] }));
ok(!RULES.some((r) => r.from.indexOf("/district") === 0 && r.from.indexOf("*") >= 0), "no /district/* splat");
const STATE_OF = Object.fromEntries(FEDERAL_STATES.map((s) => [s.code, s]));
for (const b of FED) {
  eq(V.BOARD_ROUTES[b.seat], `/district/${b.alias}`, `${b.seat}: BOARD_ROUTES names its board`);
  eq(V.boardPath(b.seat), `/district/${b.alias}`, `${b.seat}: boardPath() answers it`);
  const row = B.board(b.alias);
  ok(!!row && row.seat === b.seat, `${b.alias}: BOARDS has the row`);
  ok(!!row && row.composer === !b.readOnly, `${b.alias}: the BOARDS row carries the composer flag`);
  ok(fnSeats.has(b.seat), `${b.seat}: on the Function's BOARD_SEATS`);
  for (const sfx of ["", "/", ".html"]) {
    const r = RULES.filter((x) => x.from === `/district/${b.alias}${sfx}`);
    eq(r.length, 1, `${b.alias}: exactly one rewrite for /district/${b.alias}${sfx}`);
    ok(r[0] && r[0].to === `/${b.doc}` && r[0].status === "200", `${b.alias}${sfx}: a 200 onto its own document`);
  }
  ok(there(b.doc), `${b.doc}: on disk`);
  const st = STATE_OF[b.seat.slice(0, 2)];
  must(!!st, `${b.seat}: not one of the fifty states`);
  if (b.usHouse) {
    eq(b.usHouse.state, st.name, `${b.alias}: the join is asked with the roster's state name`);
    ok(b.district >= 1 && b.district <= st.seats, `${b.alias}: district ${b.district} is one ${st.name} has`);
    eq(b.pid, "", `${b.alias}: a congressional row carries no pid`);
    eq(row && row.usHouse && row.usHouse.state, st.name, `${b.alias}: BOARDS' usHouse names ${st.name}`);
  } else {
    eq(b.seat, `${st.code}-us-senate-${b.pid}`, `${b.alias}: a Senate key is the state and the holder's pid`);
    eq(String(ROSTER[b.pid].state), st.name, `${b.alias}: the senator's own record is ${st.name}'s`);
  }
}
{
  const per = {};
  for (const b of FED.filter((x) => x.statewide)) per[b.seat.slice(0, 2)] = (per[b.seat.slice(0, 2)] || 0) + 1;
  ok(Object.values(per).every((n) => n <= 2), "no state has more than two Senate boards");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the composer, the poll and the residency check, and no offline copy");
// ═════════════════════════════════════════════════════════════════════════════
{
  const listOf = (src, re) => { const m = re.exec(src); return m ? m[1] : ""; };
  const CORE = listOf(R("netlify/lib/district-board-voice-core.mjs"), /export const COMPOSER_SEATS = \{([\s\S]*?)\n\};/);
  const DC = listOf(R("district-composer.js"), /@generated district-boards begin([\s\S]*?)@generated district-boards end/);
  const DP = listOf(R("district-poll.js"), /@generated district-boards begin([\s\S]*?)@generated district-boards end/);
  must(CORE.length > 0 && DC.length > 0 && DP.length > 0, "a composer list could not be located");
  eq(FED.filter((b) => b.readOnly).map((b) => b.seat).join(","), "ne-house-2", "the read-only federal boards");
  for (const b of FED.filter((x) => x.readOnly)) no(CORE, `"${b.seat}"`, `${b.seat}: a read-only board is on the server's COMPOSER_SEATS`);
  for (const b of FED_VOICED) {
    has(CORE, `"${b.seat}": "${b.alias}"`, `${b.seat}: on the server's COMPOSER_SEATS`);
    has(DC, `'${b.alias}': 1`, `${b.alias}: on district-composer.js's list`);
    has(DP, `'${b.alias}': 1`, `${b.alias}: on district-poll.js's list`);
    no(SW, `/${b.doc}`, `${b.doc}: not precached`);
    no(SW, `'${b.alias}'`, `${b.alias}: not in sw.js's offline map`);
  }
  for (const b of UT) has(CORE, `"${b.seat}"`, `${b.seat}: Utah's generated board keeps its composer`);
  const navRe = (SW.match(/const DISTRICT_BOARD_NAV_RE =\s*\n\s*(\/.*\/);/) || [])[1] || "";
  must(navRe.length > 0, "sw.js: DISTRICT_BOARD_NAV_RE could not be read");
  ok(FED.every((b) => navRe.indexOf(b.alias + "|") < 0 && navRe.indexOf(b.alias + ")") < 0),
    "sw.js: no federal alias in DISTRICT_BOARD_NAV_RE");
}
// The same contract every Utah board's document carries: both hosts, both
// modules, the served state locked, and the locked line verbatim.
const COMPOSER_MARKS = [
  '<div id="pdx-district-poll" data-pdxdp-seat="{A}" hidden></div>',
  '<div id="pdx-district-composer" data-pdxdc-seat="{A}" data-pdxdc-state="locked">',
  '<script defer src="/district-composer.js"></script>',
  '<script defer src="/district-poll.js"></script>',
  '<script defer src="/district-voice.js"></script>',
  '<p class="pdxdc-locked" data-pdxdc-locked="1">Only verified residents of this seat get a voice that counts.</p>',
  'disabled aria-disabled="true"',
];
const EQUITY = /\bequity\b|\bstocks?\b|earn (?:a|your) share|\bshareholders?\b|\bdividends?\b|\binvest(?:or|ment)s?\b|\bunits?\b|\bform c\b|\bcrowdfund/i;
const textOf = (h) => String(h).replace(/<!--[\s\S]*?-->/g, " ").replace(/<script\b[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
for (const b of FED) {
  const doc = R(b.doc);
  for (const m of COMPOSER_MARKS) has(doc, m.replace(/\{A\}/g, b.alias), `${b.doc}: carries the composer contract`);
  no(doc, "{{", `${b.doc}: no unrendered template slot`);
  // ONE COPY OF THE RESOLVER. A congressional board already loads it for band 1.
  eq((doc.match(/src="\/voter-hub-location\.js"/g) || []).length, 1, `${b.doc}: voter-hub-location.js loaded once`);
  ok(!EQUITY.test(doc), `${b.doc}: no equity, stock, unit, share or Form C language`);
  ok(!/\byet\b/i.test(textOf(doc)), `${b.doc}: the visible copy never says "yet"`);
  has(doc, `window.__PDX_DISTRICT_BOARD_SEAT = '${b.alias}'`, `${b.doc}: declares its seat in the head`);
  has(doc, `data-pdxdb-seat="${b.alias}"`, `${b.doc}: declares its seat on the host`);
  has(doc, '<script defer src="/district-board.js"></script>', `${b.doc}: the three bands' module`);
}
// Every federal seat has the dd_districts row the voice tables' foreign key needs.
{
  const MIG = R("netlify/database/migrations/20261129000000_dd_districts_federal_board_seats.sql");
  for (const b of FED_VOICED) {
    const re = b.usHouse
      ? new RegExp(`\\('${b.seat}', '${b.seat.slice(0, 2).toUpperCase()}', 'house', ${b.district}, '`)
      : new RegExp(`\\('${b.seat}', '${b.seat.slice(0, 2).toUpperCase()}', 'us-senate', 0, '`);
    ok(re.test(MIG), `${b.seat}: dd_districts row`);
  }
  ok(!/\b(?:CREATE|ALTER|DROP)\b/i.test(MIG.replace(/^--.*$/gm, "")), "the seat migration writes rows only — no schema change");
  ok(/ON CONFLICT \("district_id"\) DO NOTHING;\s*$/.test(MIG), "…and overwrites nothing");
}
{
  const w = makeSandbox();
  vm.runInContext(R("district-board.js"), vm.createContext(w), { filename: "district-board.js" });
  const C = w.PDXDistrictBoard.COPY || {};
  ok(!EQUITY.test(JSON.stringify(C).replace(/\bunit\b/gi, "")), "nothing the board module can print is equity language");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · band 1 names the sitting member on every federal board");
// ═════════════════════════════════════════════════════════════════════════════
const JOIN = (() => {
  const w = makeSandbox();
  const ctx = vm.createContext(w);
  for (const f of ["cmp-data.js", "voter-hub-location.js"]) vm.runInContext(R(f), ctx, { filename: f });
  return w;
})();
const escHtml = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
function band1(alias, withJoin) {
  const win = makeSandbox();
  win.__PDX_DISTRICT_BOARD_SEAT = alias;
  const ctx = vm.createContext(win);
  const files = ["cmp-data.js", "issue-map.js"];
  if (withJoin) files.push("voter-hub-location.js");
  files.push("district-board.js");
  for (const f of files) vm.runInContext(R(f), ctx, { filename: f });
  return { M: win.PDXDistrictBoard, html: win.PDXDistrictBoard.seatHtml() };
}
for (const b of FED) {
  const want = b.usHouse ? JOIN._pdxUsHouseSeat(b.usHouse.state, b.district) : b.pid;
  must(!!want, `${b.alias}: the roster no longer names a holder`);
  const { M, html } = band1(b.alias, !!b.usHouse);
  eq(M.SEAT, b.seat, `${b.alias}: the module resolved this document's seat`);
  eq(M.PID, want, `${b.alias}: band 1's holder is the roster's`);
  has(html, escHtml(ROSTER[want].name), `${b.alias}: band 1 names ${ROSTER[want].name}`);
  has(html, `href="/p/${want}"`, `${b.alias}: …linked to /p/${want}`);
  if (b.usHouse) {
    const { M: bare, html: bareHtml } = band1(b.alias, false);
    eq(bare.PID, "", `${b.alias}: with no join on the document, band 1 guesses nobody`);
    no(bareHtml, escHtml(ROSTER[want].name), `${b.alias}: …and names nobody`);
  }
}
const FIXTURES = [
  ["mo-cd-5", "emanuel_cleaver", "Emanuel Cleaver"],
  ["wy-cd-1", "harriet_hageman", "Harriet M. Hageman"],
  ["vt-cd-1", "becca_balint", "Becca Balint"],
  ["mo-us-senate-hawley", "hawley", "Josh Hawley"],
  ["tx-us-senate-cruz", "cruz", "Ted Cruz"],
];
for (const [alias, pid, name] of FIXTURES) {
  const b = FED.filter((x) => x.alias === alias)[0];
  must(!!b, `${alias}: no longer planned`);
  eq(b.joinPid || b.pid, pid, `${alias}: the holder is ${pid}`);
  eq(b.member, name, `${alias}: the member is ${name}`);
}
// THE PERSON-FILE DOOR ON A DOCUMENT WITHOUT THE JOIN. seated-member.js's
// congressional table is Utah's four districts keyed by number, so another
// state's district 2 must not borrow Utah's member.
{
  const w = makeSandbox();
  const ctx = vm.createContext(w);
  for (const f of ["cmp-data.js", "seated-member.js", "district-board.js"]) vm.runInContext(R(f), ctx, { filename: f });
  const M = w.PDXDistrictBoard;
  must(typeof M.personLinkHtml === "function" || typeof M.boardForPid === "function", "district-board.js: no person-file door to test");
  const door = (pid) => (typeof M.boardForPid === "function" ? (M.boardForPid(pid) || {}).alias || "" : M.personLinkHtml(pid));
  const maloy = door("maloy");
  ok(String(maloy).indexOf("ut-cd-2") >= 0, "Maloy's person-file door is still UT-2's");
  for (const b of FED.filter((x) => x.usHouse && x.district <= 4)) {
    no(String(door(w.pdxSeatedMemberFor(`ut-house-${b.district}`))), b.alias,
      `${b.alias}: a Utah member's door never opens another state's district ${b.district}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · a seat the roster names nobody for has no board");
// ═════════════════════════════════════════════════════════════════════════════
const FED_SKIPPED = SKIPPED.filter((s) => !/^ut-/.test(s.seat));
must(FED_SKIPPED.length > 0, "the federal plan skipped nothing, so this section tests nothing");
for (const s of FED_SKIPPED) {
  eq(V.boardPath(s.seat), "", `${s.seat}: no BOARD_ROUTES row`);
  eq(B.board(s.alias), null, `${s.alias}: no BOARDS row`);
  ok(!fnSeats.has(s.seat), `${s.seat}: not on the Function's list`);
  ok(!there(`district-${s.alias}.html`), `${s.alias}: no document on disk`);
  ok(!RULES.some((r) => ["", "/", ".html"].some((sfx) => r.from === `/district/${s.alias}${sfx}`)), `${s.alias}: no rewrite`);
}
eq(V.COPY.boardNone, "Board not on hand for this seat.", "the empty card's sentence");
ok(!/\byet\b/i.test(V.COPY.boardNone + " " + V.COPY.boardWhy), "the empty card never says \"yet\"");

// ═════════════════════════════════════════════════════════════════════════════
section("5 · Utah is unchanged");
// ═════════════════════════════════════════════════════════════════════════════
// The digest of every district-ut-*.html as it stood before any board outside
// Utah opened: the five composer boards' neighbours, the hand six, the 82
// generated Utah boards and the three statewide ones. A Utah board changes
// only on purpose, and on that day this digest moves with it.
const UT_DOCS_SHA256 = "b01c8c1c2f7a608a7362bd9d1fb43ff8efa6bb5c942456a3e6ff0d488bd88490";
{
  const fl = readdirSync(ROOT).filter((f) => /^district-ut-.*\.html$/.test(f)).sort();
  eq(fl.length, HAND_SEATS.length + UT.length, "one Utah document per Utah board");
  const h = createHash("sha256");
  for (const f of fl) { h.update(f + "\0"); h.update(readFileSync(join(ROOT, f))); h.update("\0"); }
  eq(h.digest("hex"), UT_DOCS_SHA256, "every district-ut-*.html is byte-identical");
  // The allow-lists: Utah's rows first, in the order they always had, and the
  // federal rows after them.
  const keys = Object.keys(V.BOARD_ROUTES);
  const utN = HAND_SEATS.length + UT.length;
  ok(keys.slice(0, utN).every((k) => /^ut-/.test(k)), "BOARD_ROUTES: Utah's rows lead");
  eq(keys.slice(HAND_SEATS.length, utN).join(","), UT.map((b) => b.seat).join(","), "BOARD_ROUTES: Utah's generated rows keep their order");
  ok(keys.slice(utN).every((k) => !/^ut-/.test(k)), "BOARD_ROUTES: every row after Utah's is another state's");
  for (const b of UT) {
    const row = B.board(b.alias);
    ok(!!row && row.composer === true, `${b.alias}: Utah's row still carries its composer`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · /voice outside Utah: the U.S. House and both U.S. Senate cards open");
// ═════════════════════════════════════════════════════════════════════════════
const swFrom = LOC.indexOf("var _pdxStatewideCache = {};");
const resTo = LOC.indexOf("window._vhSyncDistrictStrip = function()", swFrom);
must(swFrom !== -1 && resTo > swFrom, "voter-hub-location.js: the resolver slice is gone");
const RESOLVER = LOC.slice(swFrom, resTo);
const RET_SRC = (() => {
  const at = LOC.indexOf("window.PDXReturn = (function () {");
  const end = LOC.indexOf("\n  })();", at);
  return LOC.slice(at, end + "\n  })();".length);
})();
function voice(loc) {
  const win = makeSandbox();
  let now = 1000000;
  win.Date = { now: () => now };
  const mk = (id) => ({
    id, innerHTML: "", _attrs: {},
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null; },
  });
  const els = { "pdx-voice-standing": mk("pdx-voice-standing"), "pdx-voice-seats": mk("pdx-voice-seats") };
  win.document.getElementById = (id) => els[id] || null;
  win.__PDX_VOICE_DOC = true;
  win.location = { href: "https://politidex.fyi/voice", pathname: "/voice", search: "", hash: "", origin: "https://politidex.fyi", assign() {}, replace() {} };
  win._hasUserLocation = true;
  win._currentVoterLocation = JSON.parse(JSON.stringify(loc));
  win.PROFILES = JSON.parse(JSON.stringify(ROSTER));
  const ctx = vm.createContext(win);
  vm.runInContext(PA, ctx, { filename: "profile-alias.js" });
  vm.runInContext(SM, ctx, { filename: "seated-member.js" });
  vm.runInContext(RESOLVER, ctx, { filename: "voter-hub-location.js[pdxRepsForMe]" });
  vm.runInContext(RET_SRC, ctx, { filename: "voter-hub-location.js#PDXReturn" });
  vm.runInContext(DV, ctx, { filename: "district-voice.js" });
  vm.runInContext(VR, ctx, { filename: "voice-room.js" });
  now += 20000;
  win.PDXVoiceRoom.paint();
  return { html: els["pdx-voice-seats"].innerHTML, seats: win.PDXVoice.seatsForMe() };
}
const cards = (html) => String(html).split('<li class="pdxvr-seat"').slice(1);
const cardWith = (html, needle) => cards(html).filter((c) => c.indexOf(needle) !== -1)[0] || "";
const opens = (who, html, alias, pid) => {
  const card = cardWith(html, `href="/district/${alias}"`);
  must(!!card, `${who}: no card opens /district/${alias}`);
  has(card, ">Open board</a>", `${who}: ${alias} has an Open board door`);
  has(card, `href="/p/${pid}"`, `${who}: ${alias}'s card names ${pid}`);
  no(card, "not on hand", `${who}: ${alias} does not also say the board is not on hand`);
};
{
  const sw = JOIN._pdxStatewideSeats("Missouri");
  const { html, seats } = voice({ state: "Missouri", city: "Kansas City", county: "Jackson County", district: "5" });
  opens("Kansas City", html, "mo-cd-5", "emanuel_cleaver");
  for (const pid of sw.senators) opens("Kansas City", html, `mo-us-senate-${pid}`, pid);
  const gov = seats.filter((s) => s.key === "governor")[0];
  ok(!!gov && gov.board === "", "Kansas City: the governor's card has no board outside Utah");
  eq(seats.filter((s) => s.board).length, 3, "Kansas City: exactly three doors — the U.S. House seat and both Senate seats");
  // THE CHECK NAMES EXACTLY THE THREE BOARDED SEATS, Missouri's and no other.
  eq(seats.filter((s) => s.boardKey).map((s) => s.boardKey).sort().join(","),
    ["mo-house-5"].concat(sw.senators.map((p) => `mo-us-senate-${p}`)).sort().join(","),
    "Kansas City: the residency check is handed MO-5 and both Missouri Senate seats");
  ok(!/\byet\b/i.test(html.replace(/<[^>]+>/g, " ")), "Kansas City: the hallway never says \"yet\"");
}
{
  const { html } = voice({ state: "Wyoming", city: "Cheyenne", county: "Laramie County", district: "1" });
  opens("Cheyenne", html, "wy-cd-1", "harriet_hageman");
}
{
  // NEW YORK'S 14TH: the roster names nobody, so the House card has no door.
  must(FED_SKIPPED.some((s) => s.seat === "ny-house-14"), "NY-14 is no longer a seat the roster names nobody for");
  const { html, seats } = voice({ state: "New York", city: "Queens", county: "Queens County", district: "14" });
  const house = seats.filter((s) => s.key === "house")[0];
  must(!!house, "Queens: no U.S. House card");
  eq(house.board, "", "Queens: NY-14 has no board");
  const card = cardWith(html, "U.S. House District 14");
  must(!!card, "Queens: the U.S. House card did not paint");
  has(card, "Board not on hand for this seat.", "Queens: NY-14 says the board is not on hand");
  no(card, "Open board", "Queens: NY-14 has no door");
  no(card, "/district/", "Queens: NY-14 offers no board address");
  ok(!/\byet\b/i.test(card.replace(/<[^>]+>/g, " ")), "Queens: NY-14's card never says \"yet\"");
  const sw = JOIN._pdxStatewideSeats("New York");
  for (const pid of sw.senators) opens("Queens", html, `ny-us-senate-${pid}`, pid);
}
{
  // FEDERAL_STATE_CODE is the generator's fifty states, Utah included.
  const want = FEDERAL_STATES.map((s) => `${s.name.toLowerCase()}=${s.code}`).concat(["utah=ut"]).sort().join(",");
  const got = Object.keys(V.FEDERAL_STATE_CODE).map((k) => `${k}=${V.FEDERAL_STATE_CODE[k]}`).sort().join(",");
  eq(got, want, "district-voice.js FEDERAL_STATE_CODE = the generator's states");
  eq(JSON.stringify(V.STATE_CODE), JSON.stringify({ utah: "ut" }), "STATE_CODE is still Utah's alone");
  eq(V.federalKeyForLevel({ seat: "statehouse", district: "5" }, "Missouri", ""), "", "no State House key outside Utah");
  eq(V.federalKeyForLevel({ seat: "governor", statewide: true }, "Missouri", "kehoe"), "", "no governor key outside Utah");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the coverage sentence counts BOARD_ROUTES on /voice and the homepage");
// ═════════════════════════════════════════════════════════════════════════════
{
  const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven",
    "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const under100 = (n) => n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
  const spell = (n) => n < 100 ? under100(n)
    : ONES[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + under100(n % 100) : "");
  const N = Object.keys(V.BOARD_ROUTES).length;
  const w = spell(N);
  const sentence = `${w[0].toUpperCase() + w.slice(1)} seats have a board on file today. Every other seat says the room is not open.`;
  has(R("index.html"), `<p class="pdxhv-note">${sentence}</p>`, "the homepage card counts BOARD_ROUTES");
  has(R("voice.html"), `<p class="pdxvr-cover" data-pdxvr-cover="1">${sentence}</p>`, "/voice counts BOARD_ROUTES");
  ok(!/\d/.test(sentence), "the count is spelled, not printed as a figure");
}

report();
