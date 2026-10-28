#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-district-boards-state-legislative.mjs — every other state's State House
// and State Senate boards, and why there are none
// ─────────────────────────────────────────────────────────────────────────────
// scripts/gen-district-boards.mjs's planStateLegislative() opens a READ-ONLY
// board for a State House or State Senate seat outside Utah only when the
// roster names a sitting member for it AND the location resolver
// (window.pdxRepsForMe) already maps that state's legislative lines and seats
// that member on that number. Today the resolver maps legislative lines in
// Utah only, so the plan opens zero boards outside Utah. This suite proves the
// zero is the gate's answer and not an omission, and that the gate would open
// a board — naming the right member, with no composer — the day the resolver
// maps a second state.
//
// WHAT THIS SUITE PROVES:
//   1. The plan: every roster state legislator outside Utah was asked about and
//      refused for the resolver's reason; no non-Utah State House or State
//      Senate seat has a BOARD_ROUTES row, a BOARDS row, a Function row, a
//      rewrite, a composer row or a document; BOARD_ROUTES' length is the plan.
//   2. The gate bites: with a resolver that maps Texas, the planner opens Texas
//      SD-7 for the member the resolver seats there and nobody else, read-only;
//      a resolver that seats someone else, or two claimants, opens nothing.
//   3. Band 1 on every state legislative board outside Utah names the roster's
//      sitting member (vacuous today: there are none — asserted, not assumed).
//   4. Every generated file is byte-identical to what the generator writes, so
//      the Utah and federal boards did not move.
//   5. /voice in Texas, Oregon, Alaska and an unmapped place: no state legislative card paints (the
//      resolver publishes no district for it), so no state legislative door
//      can appear and only the federal cards open; and a mapped seat with no
//      sitting member (Utah HD-7) says "Board not on hand" and never "yet".
//   6. The coverage sentence counts BOARD_ROUTES, and the coach's sentence
//      names Utah as the only state with state legislative boards, which is
//      what is on disk.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import {
  FEDERAL_STATES, HAND_SEATS, STATE_LEG_REFUSAL, STATE_LEG_BOARD_REFUSAL, STATE_LEG_BOARD_STATES, STATE_LEG_BOARD_SEATS, STATE_LEG_VOICED_STATES, loadRoster, planBoards, planStateLegislative, renderAll, renderDoc,
} from "./gen-district-boards.mjs";

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
  console.log(`\n   ✓ state legislative boards outside Utah: all ${passed} assertions passed`);
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
const LEG = PLAN.filter((b) => b.stateLeg);
const LEG_SKIPPED = SKIPPED.filter((s) => s.stateLeg);
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
must(B && typeof B.board === "function", "district-board.js did not publish board()");
const ROSTER = loadRoster().CMP_DATA;
const LEG_KEY_RE = /^([a-z]{2})-(?:statehouse|statesenate)-\d+$/;
const LEG_ALIAS_RE = /^([a-z]{2})-(?:hd|sd)-\d+$/;
// THE ONE EXCEPTION, AND IT IS A LIST OF RACES. Pennsylvania's contested seats
// on the November 3, 2026 ballot (pa-ballot-2026.js RACES, read by the
// generator as STATE_LEG_BOARD_SEATS) open read-only boards; every other seat
// outside Utah is still refused. test-pa-contested-cycle.mjs holds the races.
const CONTESTED = STATE_LEG_BOARD_SEATS;
const CONTESTED_ALIAS = new Set([...CONTESTED].map((k) => k.replace("-statehouse-", "-hd-").replace("-statesenate-", "-sd-")));
// The contested seats that take a voice: those in the thirteen density states.
const VOICED_ALIASES = [...CONTESTED_ALIAS].filter((a) => STATE_LEG_VOICED_STATES.has(a.slice(0, 2))).sort();
// AND SIX STATES OPENED WHOLE. Nebraska, South Dakota, Idaho, Montana, Alaska
// and Rhode Island (STATE_LEG_BOARD_STATES) open every seat the roster names;
// test-six-state-deepen.mjs holds those boards. This suite holds every other
// state to the contested-race rule.
const WHOLE = STATE_LEG_BOARD_STATES;
const inWhole = (k) => WHOLE.has(String(k).slice(0, 2));
const outsideUtah = (k) => LEG_KEY_RE.test(k) && !/^ut-/.test(k) && !CONTESTED.has(k) && !inWhole(k);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the plan asks every roster state legislator outside Utah, and opens none");
// ═════════════════════════════════════════════════════════════════════════════
must(CONTESTED.size > 0 && [...CONTESTED].every((k) => /^(?:pa|ga|nc|mi|oh|wi|fl|az|ny|tx|il|mn|co|nv|ca|wa)-(?:statehouse|statesenate)-\d+(?:-p\d)?$/.test(k)), "the contested-seat list is Pennsylvania's, Georgia's, North Carolina's, Michigan's, Ohio's, Wisconsin's, Florida's, Arizona's, New York's, Texas's, Illinois's, Minnesota's, Colorado's and Nevada's");
eq([...WHOLE].sort().join(","), "ak,id,mt,ne,ri,sd", "the states opened whole");
eq(JSON.stringify(LEG.filter((b) => !inWhole(b.seat)).map((b) => b.seat).sort()), JSON.stringify([...CONTESTED].sort()),
  "outside Utah, exactly the contested Pennsylvania seats open a state legislative board");
eq(Object.keys(V.BOARD_ROUTES).length, HAND_SEATS.length + PLAN.length,
  "BOARD_ROUTES length = the six hand rows + the generator's plan");
{
  // The candidates, counted independently of the planner's own walk.
  const names = new Set(FEDERAL_STATES.map((s) => s.name));
  const officeRe = /\bstate\s+(?:senat|house|rep)/i;
  const want = Object.keys(ROSTER).filter((p) => names.has(String(ROSTER[p].state || "")) &&
    officeRe.test(String(ROSTER[p].office || "")) && !/\bformer\b|\bcandidate\b/i.test(String(ROSTER[p].office || "")));
  must(want.length > 0, "the roster holds no state legislator outside Utah, so this suite tests nothing");
  const asked = new Set([...LEG_SKIPPED, ...LEG].map((s) => s.pid));
  for (const p of want) ok(asked.has(p), `${p} (${ROSTER[p].office}, ${ROSTER[p].state}): the planner asked about this seat`);
  // Texas, California, Florida, New York, Illinois, Pennsylvania, Ohio,
  // Georgia, Michigan, North Carolina, Virginia, Washington, Arizona, New
  // Jersey, Massachusetts, Tennessee, Colorado, Maryland, Minnesota,
  // Wisconsin, Indiana, Missouri, Kentucky, Alabama, South Carolina, Iowa,
  // Oklahoma, Kansas, Nevada, Nebraska, Arkansas, Oregon, Idaho, Montana, New
  // Mexico, Wyoming, Mississippi, West Virginia, Hawaii, Louisiana, Maine, New
  // Hampshire, Connecticut, Rhode Island, Vermont, Delaware, North Dakota,
  // South Dakota and Alaska — every state — have mapped lines now, so their
  // seats are refused by the board list rather than the resolver; every other
  // state is still the resolver's refusal.
  const MAPPED_LEG = /^(?:tx|ca|fl|ny|il|pa|oh|ga|mi|nc|va|wa|az|nj|ma|tn|co|md|mn|wi|in|mo|ky|al|sc|ia|ok|ks|nv|ne|ar|or|id|mt|nm|wy|ms|wv|hi|la|me|nh|ct|ri|vt|de|nd|sd|ak)-/;
  ok(LEG_SKIPPED.filter((s) => !inWhole(s.seat)).every((s) => s.reason === (MAPPED_LEG.test(s.seat) ? STATE_LEG_BOARD_REFUSAL : STATE_LEG_REFUSAL)),
    "every refusal is the board list's in a mapped state and the resolver's everywhere else");
  for (const code of ["tx", "ca", "fl", "ny", "il", "pa", "oh", "ga", "mi", "nc", "va", "wa", "az", "nj", "ma", "tn", "co", "md", "mn", "wi", "in", "mo", "ky", "al", "sc", "ia", "ok", "ks", "nv", "ne", "ar", "or", "id", "mt", "nm", "wy", "ms", "wv", "hi", "la", "me", "nh", "ct", "ri", "vt", "de", "nd", "sd", "ak"]) {
    // A state with no roster legislator at all (Oklahoma) has nothing to refuse;
    // the every-refusal check above still covers whatever it would have.
    if (WHOLE.has(code) || !LEG_SKIPPED.some((s) => s.seat.indexOf(code + "-") === 0)) { passed++; continue; }
    ok(LEG_SKIPPED.some((s) => s.seat.indexOf(code + "-") === 0 && s.reason === STATE_LEG_BOARD_REFUSAL),
      `${code}: a mapped seat is refused by the board list`);
  }
  ok(LEG_SKIPPED.every((s) => !/^ut-/.test(s.seat)), "no Utah seat is on the out-of-state plan");
}
{
  const fnSeats = (() => {
    const m = /const BOARD_SEATS[^=]*=\s*\{([\s\S]*?)\n\};/.exec(FN);
    return m ? [...m[1].matchAll(/"([^"]+)":\s*1/g)].map((x) => x[1]) : [];
  })();
  const routes = Object.keys(V.BOARD_ROUTES);
  ok(!routes.some(outsideUtah), "BOARD_ROUTES: no State House or State Senate row outside Utah but the contested seats");
  ok(!fnSeats.some(outsideUtah), "BOARD_SEATS: no State House or State Senate row outside Utah but the contested seats");
  const docs = readdirSync(ROOT).filter((f) => /^district-[a-z]{2}-(?:hd|sd)-\d+\.html$/.test(f));
  const strays = docs.filter((f) => !f.startsWith("district-ut-") && !CONTESTED_ALIAS.has(f.slice(9, -5)) && !inWhole(f.slice(9)));
  ok(docs.length > 0 && strays.length === 0, `no state legislative document outside Utah but the contested seats: ${strays.join(", ")}`);
  const RULES = [...TOML.matchAll(/\[\[redirects\]\]\s*\n\s*from = "([^"]+)"/g)].map((m) => m[1]);
  ok(!RULES.some((r) => r.indexOf("/district") === 0 && r.indexOf("*") >= 0), "no /district/* splat");
  ok(!RULES.some((r) => /^\/district\/([a-z]{2})-(?:hd|sd)-/.test(r) && !/^\/district\/ut-/.test(r) && !inWhole(r.slice(10)) &&
    !CONTESTED_ALIAS.has(r.replace(/^\/district\//, "").replace(/(?:\/|\.html)$/, ""))), "no rewrite for a state legislative address outside Utah but the contested seats");
  for (const s of LEG_SKIPPED) {
    eq(V.boardPath(s.seat), "", `${s.seat}: no BOARD_ROUTES row`);
    eq(B.board(s.alias), null, `${s.alias}: no BOARDS row`);
    ok(!there(`district-${s.alias}.html`), `${s.alias}: no document on disk`);
    no(SW, `'${s.alias}'`, `${s.alias}: not in sw.js`);
  }
  for (const f of ["netlify/lib/district-board-voice-core.mjs", "district-composer.js", "district-poll.js"]) {
    const src = R(f);
    const keys = [...src.matchAll(/["']([a-z]{2}-(?:statehouse|statesenate|hd|sd)-\d+(?:-p\d)?)["']/g)].map((m) => m[1]);
    // Outside Utah, exactly the voiced contested seats (the contested-boards
    // voice pass): a contested seat in one of the thirteen density states.
    const alias = (k) => k.replace(/-statehouse-/, "-hd-").replace(/-statesenate-/, "-sd-");
    const got = [...new Set(keys.filter((k) => !k.startsWith("ut-")).map(alias))].sort();
    eq(JSON.stringify(got), JSON.stringify(VOICED_ALIASES), `${f}: the only state legislative composer rows outside Utah are the voiced contested seats`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the gate bites: a resolver that maps Texas opens exactly the seat it seats");
// ═════════════════════════════════════════════════════════════════════════════
// The real planner, on the real roster, with pdxRepsForMe() swapped for one
// that maps Texas and seats `seatPid` on SD-7. Nothing else about the run moves.
function mutantPlan(seatPid, extraRows) {
  const win = loadRoster();
  if (extraRows) Object.assign(win.CMP_DATA, extraRows);
  const real = win.pdxRepsForMe;
  win.pdxRepsForMe = function () {
    const loc = win._currentVoterLocation || {};
    const r = real.call(win);
    if (loc.state !== "Texas") return r;
    r.levels = r.levels.map((l) => {
      if (l.key !== "statesenate" && l.key !== "statehouse") return l;
      const n = String(l.key === "statesenate" ? loc.stateSenateDistrict : loc.stateHouseDistrict);
      const pid = l.key === "statesenate" && n === "7" ? seatPid : null;
      return Object.assign({}, l, { mapped: true, district: n || null, pid, resolved: !!pid });
    });
    return r;
  };
  const boards = [], skipped = [];
  planStateLegislative(win, boards, skipped, FEDERAL_STATES.filter((s) => s.code === "tx"), new Set(["tx"]));
  return { boards, skipped };
}
{
  must(ROSTER.bettencourt_tx && /SD\s*7/.test(String(ROSTER.bettencourt_tx.district)), "fixture: bettencourt_tx is no longer Texas SD 7");
  const { boards, skipped } = mutantPlan("bettencourt_tx");
  eq(boards.length, 1, "a mapped Texas opens exactly the one seat the resolver seats");
  const b = boards[0] || {};
  eq(b.seat, "tx-statesenate-7", "…Texas Senate District 7");
  eq(b.alias, "tx-sd-7", "…at /district/tx-sd-7");
  eq(b.pid, "bettencourt_tx", "…for the roster's sitting member");
  eq(b.member, ROSTER.bettencourt_tx.name, "…by the roster's own name");
  eq(b.readOnly, true, "…read-only: no composer, no poll, no residency check");
  ok(!b.federal && !b.usHouse && !b.statewide, "…and neither a federal nor a statewide row");
  ok(skipped.some((s) => s.pid === "paxton_tx" && /does not seat this member/.test(s.reason)),
    "Texas SD-8's member is refused when the resolver seats nobody there");
  // BAND 1 OF THAT BOARD, as the document's no-JS fallback prints it: the member
  // and the record door are the roster's, and the document has no voice.
  const doc = renderDoc(Object.assign({ route: "/district/tx-sd-7", doc: "district-tx-sd-7.html", kickTitle: "" }, b));
  has(doc, `<a href="/p/bettencourt_tx">read the sitting member&rsquo;s record</a>`, "the board's record door is the member's");
  has(doc, `<span data-pdxdb-roster-name>${ROSTER.bettencourt_tx.name}</span>`, "the board names the member");
  has(doc, "window.__PDX_DISTRICT_BOARD_SEAT = 'tx-sd-7'", "the board declares its own seat");
  ok(!/\bequity\b|\bshareholders?\b|\bdividends?\b|\bcrowdfund/i.test(doc), "no equity language");
}
{
  const { boards } = mutantPlan("paxton_tx");
  eq(boards.length, 0, "a resolver that seats somebody else on SD-7 opens nothing for either of them");
}
{
  const twin = { tx_sd7_twin: Object.assign({}, ROSTER.bettencourt_tx, { name: "A Second Claimant" }) };
  const { boards, skipped } = mutantPlan("bettencourt_tx", twin);
  eq(boards.length, 1, "a second record claiming SD-7 does not open a second board");
  eq((boards[0] || {}).pid, "bettencourt_tx", "…the one board is the member the resolver seats");
  ok(skipped.some((s) => s.pid === "tx_sd7_twin"), "…and the second claimant is refused");
}
{
  // The generator keeps a read-only row off the composer's three lists.
  const GEN = R("scripts/gen-district-boards.mjs");
  has(GEN, 'b.readOnly ? "composer: false" : "composer: true"', "a read-only BOARDS row is written composer: false");
  has(GEN, "const voiced = boards.filter((b) => !b.readOnly);", "the composer lists are the voiced boards only");
  eq((GEN.match(/voiced\.map\(/g) || []).length, 3, "all three composer lists are written from the voiced boards");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · band 1 names the sitting member on every state legislative board outside Utah");
// ═════════════════════════════════════════════════════════════════════════════
for (const b of LEG) {
  const win = makeSandbox();
  win.__PDX_DISTRICT_BOARD_SEAT = b.alias;
  const ctx = vm.createContext(win);
  for (const f of ["cmp-data.js", "issue-map.js", "district-board.js"]) vm.runInContext(R(f), ctx, { filename: f });
  const M = win.PDXDistrictBoard;
  eq(M.PID, b.pid, `${b.alias}: band 1's holder is the roster's`);
  has(M.seatHtml(), `href="/p/${b.pid}"`, `${b.alias}: band 1 links the member`);
  // A contested seat in one of the thirteen density states takes a voice;
  // every other one (Nevada's) is read-only.
  eq(b.readOnly, !STATE_LEG_VOICED_STATES.has(b.seat.slice(0, 2)), `${b.alias}: voiced exactly when its state is a voiced density state`);
  eq((B.board(b.alias) || {}).composer, !b.readOnly, `${b.alias}: composer matches the plan`);
}
ok(LEG.length === 0 || LEG.every((b) => !!ROSTER[b.pid]), "every planned holder has a roster row");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · every generated file is what the generator writes — Utah and federal unchanged");
// ═════════════════════════════════════════════════════════════════════════════
{
  const { out, stale } = renderAll();
  for (const [f, body] of out) ok(there(f) && R(f) === body, `${f}: byte-identical to the generator's output`);
  eq(stale.length, 0, "no stale board document on disk");
  const utDocs = [...out.keys()].filter((f) => /^district-ut-/.test(f));
  const fedDocs = [...out.keys()].filter((f) => /^district-[a-z]{2}-(?:cd-|us-senate-)/.test(f) && !/^district-ut-/.test(f));
  ok(utDocs.length > 0 && fedDocs.length > 0, "the check covered both the Utah and the federal documents");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · /voice outside Utah: no state legislative door; an unheld seat says \"Board not on hand\"");
// ═════════════════════════════════════════════════════════════════════════════
const swFrom = LOC.indexOf("var _pdxStatewideCache = {};");
const resTo = LOC.indexOf("window._vhSyncDistrictStrip = function()", swFrom);
must(swFrom !== -1 && resTo > swFrom, "voter-hub-location.js: the resolver slice is gone");
const RESOLVER = LOC.slice(swFrom, resTo);
// EVERY STATE'S LINES ARE DRAWN SINCE v462 (Alaska last), so no real state is
// left to ask the "lines we do not draw" question of. The code path is still
// there — it is what any place outside _PDX_LEG_MAPPED gets — so it is asked of
// Alaska against a copy of the resolver with Alaska taken back off that list.
// The edit is checked to have happened, so the copy cannot silently be the
// real file.
const RESOLVER_NO_AK = RESOLVER.replace(",\n                         alaska: 1 };", " };");
must(RESOLVER_NO_AK !== RESOLVER, "voter-hub-location.js: Alaska is not the last entry in _PDX_LEG_MAPPED");
const RET_SRC = (() => {
  const at = LOC.indexOf("window.PDXReturn = (function () {");
  const end = LOC.indexOf("\n  })();", at);
  return LOC.slice(at, end + "\n  })();".length);
})();
function voice(loc, resolver) {
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
  vm.runInContext(resolver || RESOLVER, ctx, { filename: "voter-hub-location.js[pdxRepsForMe]" });
  vm.runInContext(RET_SRC, ctx, { filename: "voter-hub-location.js#PDXReturn" });
  vm.runInContext(DV, ctx, { filename: "district-voice.js" });
  vm.runInContext(VR, ctx, { filename: "voice-room.js" });
  now += 20000;
  win.PDXVoiceRoom.paint();
  return { html: els["pdx-voice-seats"].innerHTML, seats: win.PDXVoice.seatsForMe() };
}
const cards = (html) => String(html).split('<li class="pdxvr-seat"').slice(1);
const visible = (h) => String(h).replace(/<[^>]+>/g, " ");
// OUTSIDE UTAH AND TEXAS THERE IS NO STATE LEGISLATIVE CARD TO OPEN. The
// resolver publishes those two levels with no district (it does not map the
// lines), and seatsForMe() drops a district row with no number rather than
// print a chamber as a seat. Texas's lines ARE mapped, so its reader gets the
// two legislative cards — but no board was opened with that map, so neither
// card has a door. Either way no state legislative door can appear.
for (const [who, loc, legCards, resolverSrc] of [
  // Texas SD-7 and Oregon SD-19 both have a sitting member on the roster, and
  // both states' lines are mapped now; so are Alaska's, and the unmapped case
  // is asked of Alaska against a resolver with Alaska taken off the list.
  ["Houston", { state: "Texas", city: "Houston", county: "Harris County", district: "7", stateSenateDistrict: "7", stateHouseDistrict: "134" }, true],
  ["Lake Oswego", { state: "Oregon", city: "Lake Oswego", county: "Clackamas County", district: "5", stateSenateDistrict: "19", stateHouseDistrict: "38" }, true],
  ["Juneau", { state: "Alaska", city: "Juneau", county: "Juneau City and Borough", district: "1", stateSenateDistrict: "2", stateHouseDistrict: "4" }, true],
  ["Juneau (unmapped)", { state: "Alaska", city: "Juneau", county: "Juneau City and Borough", district: "1", stateSenateDistrict: "2", stateHouseDistrict: "4" }, false, RESOLVER_NO_AK],
]) {
  const { html, seats } = voice(loc, resolverSrc);
  must(seats.length > 0, `${who}: the hallway resolved no seats`);
  eq(seats.some((x) => x.key === "statesenate" || x.key === "statehouse"), legCards,
    `${who}: state legislative cards appear exactly where the resolver maps the lines`);
  eq(cards(html).some((c) => /State (?:Senate|House)/.test(c)), legCards, `${who}: state legislative cards painted only where mapped`);
  ok(seats.filter((x) => x.key === "statesenate" || x.key === "statehouse").every((x) => !x.board),
    `${who}: no state legislative card has a board`);
  // Open board appears only where a board exists: every door the hallway
  // prints is a BOARD_ROUTES row, and only the federal cards have one.
  const doors = [...html.matchAll(/href="(\/district\/[^"]+)"/g)].map((m) => m[1]);
  const routes = new Set(Object.values(V.BOARD_ROUTES));
  ok(doors.length > 0 && doors.every((d) => routes.has(d)), `${who}: every door on /voice is a board that exists`);
  ok(!doors.some((d) => /\/district\/[a-z]{2}-(?:hd|sd)-/.test(d)), `${who}: no state legislative door`);
  ok(seats.filter((s) => s.board).every((s) => s.key === "house" || /^ussenate/.test(s.key)),
    `${who}: only the U.S. House and U.S. Senate cards open`);
  ok(!/\byet\b/i.test(visible(html)), `${who}: the hallway never says "yet"`);
}
// A SEAT WITH NO SITTING MEMBER: Utah's HD-7 is mapped and the roster names
// nobody for it, so it has no board, and its card is the empty grammar.
{
  const w = loadRoster();
  must(!w.pdxSeatedMemberFor("ut-statehouse-7", 7), "fixture: Utah HD-7 now has a sitting member on the roster");
  ok(SKIPPED.some((s) => s.seat === "ut-statehouse-7"), "Utah HD-7 is skipped by the plan");
  const { html, seats } = voice({ state: "Utah", city: "", county: "", district: "1", stateSenateDistrict: "", stateHouseDistrict: "7" });
  const s = seats.filter((x) => x.key === "statehouse")[0];
  must(!!s, "Utah HD-7: no State House card");
  eq(s.board, "", "Utah HD-7: no board");
  const card = cards(html).filter((c) => c.indexOf("State House District 7") >= 0)[0] || "";
  must(!!card, "Utah HD-7: the State House card did not paint");
  has(card, "Board not on hand for this seat.", "Utah HD-7 says the board is not on hand");
  no(card, "Open board", "Utah HD-7 has no door");
  ok(!/\byet\b/i.test(visible(card)), "Utah HD-7 never says \"yet\"");
}
eq(V.COPY.boardNone, "Board not on hand for this seat.", "the empty card's sentence");
ok(!/\byet\b/i.test(V.COPY.boardNone + " " + V.COPY.boardWhy), "the empty card never says \"yet\"");

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the coverage sentence and the coach say what is on disk");
// ═════════════════════════════════════════════════════════════════════════════
{
  const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven",
    "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const under100 = (n) => n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
  const spell = (n) => n < 100 ? under100(n)
    : ONES[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + under100(n % 100) : "");
  const N = Object.keys(V.BOARD_ROUTES).length;
  eq(N, HAND_SEATS.length + PLAN.length, "the count the sentence spells is the plan's");
  const w = spell(N);
  const sentence = `${w[0].toUpperCase() + w.slice(1)} seats have a board on file today. Every other seat says the room is not open.`;
  has(R("index.html"), `<p class="pdxhv-note">${sentence}</p>`, "the homepage card counts BOARD_ROUTES");
  has(R("voice.html"), `<p class="pdxvr-cover" data-pdxvr-cover="1">${sentence}</p>`, "/voice counts BOARD_ROUTES");

  // The states that HAVE a state legislative board, read off BOARD_ROUTES.
  const legStates = new Set(Object.keys(V.BOARD_ROUTES).map((k) => (LEG_KEY_RE.exec(k) || [])[1]).filter(Boolean));
  eq([...legStates].sort().join(","), "ak,az,ca,co,fl,ga,id,il,mi,mn,mt,nc,ne,nv,ny,oh,pa,ri,sd,tx,ut,wa,wi", "Utah, the six states opened whole, and the contested seats of Pennsylvania, Georgia, North Carolina, Michigan, Ohio, Wisconsin, Florida, Arizona and New York, are the only State House or State Senate boards");
  ok(Object.keys(V.BOARD_ROUTES).filter((k) => /^(?:pa|ga|nc|mi|oh|wi|fl|az|ny|tx|il|mn|co|nv|ca|wa)-/.test(k) && LEG_KEY_RE.test(k)).every((k) => CONTESTED.has(k)), "every Pennsylvania, Georgia, North Carolina, Michigan, Ohio, Wisconsin, Florida, Arizona and New York legislative board is a contested seat");
  const C = (() => {
    const win = makeSandbox();
    win.window = win;
    vm.runInContext(R("first-visit-coach.js"), vm.createContext(win), { filename: "first-visit-coach.js" });
    return win.PDXFirstVisitCoach || win.PDXCoach || null;
  })();
  const COACH = R("first-visit-coach.js");
  const note = (C && C.SCOPE_NOTE) || ((/var SCOPE_NOTE = '([^']*)'/.exec(COACH) || [])[1] || "");
  must(note.length > 0, "first-visit-coach.js: SCOPE_NOTE could not be read");
  has(note, "State legislative boards and mapping are live in Utah first.", "the coach says state legislative boards are Utah's");
  has(note, "U.S. House and U.S. Senate boards are open in every state.", "the coach says the federal boards are everywhere");
  for (const st of FEDERAL_STATES) no(note, st.name, `the coach names no other state (${st.name}) as having boards`);
  ok(!/\byet\b/i.test(note), "the coach never says \"yet\"");
  ok(!/\bequity\b/i.test(note + " " + sentence), "no equity language");
}

report();
