#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// gen-district-boards.mjs — every Utah district board the roster can name
// ─────────────────────────────────────────────────────────────────────────────
// ONE TEMPLATE, ONE GENERATOR, NOT SEVENTY HAND-WRITTEN DOCUMENTS.
//
// Six boards were opened by hand (SD-3, HD-16, SD-7, UT-2, HD-15, SD-6), each a
// document plus a row in four allow-lists. Every other Utah State House, State
// Senate and U.S. House seat — and the three statewide seats, the governor and
// both U.S. Senate seats (see planStatewide()) — is opened here, from the
// roster, on exactly that contract:
//
//   · a document, district-ut-<alias>.html, rendered from
//     scripts/district-board.template.html (HD-15's shell): the seat declared
//     twice, the canonical bare path, band 1 = the roster's pid;
//   · three 200 rewrites in netlify.toml (bare, trailing slash, .html);
//   · one row each in district-board.js BOARDS, district-voice.js BOARD_ROUTES
//     and netlify/functions/district-board.mts BOARD_SEATS;
//   · one row each in the composer's three seat lists — COMPOSER_SEATS in
//     netlify/lib/district-board-voice-core.mjs (the server gate the poll and
//     the Didit check also read), COMPOSER_SEATS in district-composer.js and
//     POLL_SEATS in district-poll.js — so every generated board takes a comment
//     and a poll vote from a Didit-verified resident of that seat, and from
//     nobody else;
//   · the precache entry, the nav-regex alias and the offline document map in
//     sw.js, because an offline /district/<alias> must be ITS OWN document.
//
// THE ROSTER IS THE GATE. A seat is opened only when:
//   state seat   window.pdxSeatedMemberFor(seat, n) names a pid, cmp-data.js has
//                a row for it, and window.pdxSeatClaim(pid, seat, n) is 'match'
//                (the record's own office + district claim THIS seat).
//   U.S. House   window._pdxUsHouseSeat('Utah', n) — the app's one owner of
//                that join — answers somebody. The row carries NO pid, as UT-2's
//                does; band 1 asks the join at paint time.
// A seat with no sitting pid is SKIPPED. Nothing here invents one, and there is
// no /district/* splat: a skipped seat has no document, no rewrite and no row,
// so /voice keeps saying "this room is not open" for it.
//
// EVERY OTHER STATE'S U.S. HOUSE AND U.S. SENATE SEATS (see planFederal()) are
// opened on the same gate, the same template and the same composer contract as
// a Utah board — a row on all three composer lists, so a comment and a poll vote
// are taken from a Didit-verified resident of that seat and from nobody else —
// with two differences, each a refusal rather than a feature:
//   · NO OFFLINE COPY. Four hundred documents are not precached onto a phone;
//     sw.js's three blocks stay Utah's, and a board outside Utah is a network
//     page like any other address the worker does not know.
//   · NO STATE LEGISLATIVE SEATS HERE. Those are planStateLegislative()'s, below.
//
// EVERY OTHER STATE'S STATE HOUSE AND STATE SENATE SEATS (see
// planStateLegislative()) are asked for too, and opened only when all three are
// true: the roster names a sitting member for the seat, the location resolver
// (window.pdxRepsForMe) already maps that state's legislative lines and seats
// that very member on that very number, and nothing about the seat's geometry
// is supplied here. Such a board is READ-ONLY — composer: false, on none of the
// three composer lists, no poll, no residency check — and, like a federal
// board, has no offline copy. A fourth condition sits on top of those three: the
// state's code is in STATE_LEG_BOARD_STATES, which is empty. The resolver maps
// the legislative lines of Utah, Texas, California, Florida, New York,
// Illinois, Pennsylvania, Ohio, Georgia, Michigan, North Carolina, Virginia,
// Washington, Arizona, New Jersey, Massachusetts, Tennessee, Colorado,
// Maryland, Minnesota, Wisconsin, Indiana, Missouri, Kentucky, Alabama and
// South Carolina, Iowa, Oklahoma, Kansas, Nevada, Nebraska, Arkansas, Oregon,
// Idaho, Montana, New Mexico, Wyoming, Mississippi, West Virginia, Hawaii,
// Louisiana, Maine, New Hampshire, Connecticut, Rhode Island, Vermont,
// Delaware, North Dakota, South Dakota and Alaska; no
// state was opened whole with those maps. The one exception is a list of
// races, not a state: STATE_LEG_BOARD_SEATS, read from pa-ballot-2026.js and
// ga-ballot-2026.js, opens a read-only board for each contested Pennsylvania
// and Georgia seat on the November 3, 2026 ballot and prints that race on it. Every other roster seat
// outside Utah is refused and logged.
//
// THE SIX HAND-OPENED DOCUMENTS ARE NEVER WRITTEN. Their rows stay above each
// generated block, byte for byte; the suite pins their bytes.
//
//   node scripts/gen-district-boards.mjs          write everything
//   node scripts/gen-district-boards.mjs --check  exit 1 if anything would change
// ─────────────────────────────────────────────────────────────────────────────

import { existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// The six boards opened by hand, in the order they opened. Their documents and
// rows are theirs; the generator only ever writes AFTER them.
export const HAND_SEATS = [
  "ut-statesenate-3",
  "ut-statehouse-16",
  "ut-statesenate-7",
  "ut-house-2",
  "ut-statehouse-15",
  "ut-statesenate-6",
];

// Utah's seat counts under the 2022 legislative plan and the 2026 congressional map.
const CHAMBERS = [
  { chamber: "statehouse", code: "hd", count: 75 },
  { chamber: "statesenate", code: "sd", count: 29 },
  { chamber: "house", code: "cd", count: 4 },
];

// ── EVERY OTHER STATE: U.S. HOUSE SEATS PER STATE, 2020 APPORTIONMENT ─────
// The number of districts each state has — a fact of the apportionment, not a
// list of who holds them. Each number is only how far planFederal() asks
// window._pdxUsHouseSeat(); a district the roster names nobody for is skipped.
// A single-district state is asked for district 1, the number this app stores
// for an at-large seat (see _pdxCdKey() in voter-hub-location.js). Utah is not
// here: its four districts are planned above.
export const FEDERAL_STATES = [
  ["al", "Alabama", 7], ["ak", "Alaska", 1], ["az", "Arizona", 9], ["ar", "Arkansas", 4],
  ["ca", "California", 52], ["co", "Colorado", 8], ["ct", "Connecticut", 5], ["de", "Delaware", 1],
  ["fl", "Florida", 28], ["ga", "Georgia", 14], ["hi", "Hawaii", 2], ["id", "Idaho", 2],
  ["il", "Illinois", 17], ["in", "Indiana", 9], ["ia", "Iowa", 4], ["ks", "Kansas", 4],
  ["ky", "Kentucky", 6], ["la", "Louisiana", 6], ["me", "Maine", 2], ["md", "Maryland", 8],
  ["ma", "Massachusetts", 9], ["mi", "Michigan", 13], ["mn", "Minnesota", 8], ["ms", "Mississippi", 4],
  ["mo", "Missouri", 8], ["mt", "Montana", 2], ["ne", "Nebraska", 3], ["nv", "Nevada", 4],
  ["nh", "New Hampshire", 2], ["nj", "New Jersey", 12], ["nm", "New Mexico", 3], ["ny", "New York", 26],
  ["nc", "North Carolina", 14], ["nd", "North Dakota", 1], ["oh", "Ohio", 15], ["ok", "Oklahoma", 5],
  ["or", "Oregon", 6], ["pa", "Pennsylvania", 17], ["ri", "Rhode Island", 2], ["sc", "South Carolina", 7],
  ["sd", "South Dakota", 1], ["tn", "Tennessee", 9], ["tx", "Texas", 38], ["vt", "Vermont", 1],
  ["va", "Virginia", 11], ["wa", "Washington", 10], ["wv", "West Virginia", 2], ["wi", "Wisconsin", 8],
  ["wy", "Wyoming", 1],
].map(([code, name, seats]) => ({ code, name, seats }));

const BEGIN = "@generated district-boards begin";
const END = "@generated district-boards end";

// ── THE ROSTER, RUN ONCE ────────────────────────────────────────────────────
export function loadRoster() {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  for (const f of ["cmp-data.js", "voter-hub-location.js", "seated-member.js"]) {
    vm.runInContext(R(f), ctx, { filename: f });
  }
  if (!win.CMP_DATA || typeof win.pdxSeatedMemberFor !== "function" ||
      typeof win.pdxSeatClaim !== "function" || typeof win._pdxUsHouseSeat !== "function") {
    throw new Error("gen-district-boards: the roster or its lookups did not load");
  }
  return win;
}

const ORD = (n) => {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return n + ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");
};

// The place label, AS THE ROSTER WRITES IT: the parenthetical on the record's
// own district string ("UT District 68 (Vernal, Uintah / Duchesne County)").
// A record with no parenthetical gets the plan's own words, not a guessed town.
function whereOf(state, n) {
  const m = /\(([^)]+)\)\s*$/.exec(String(state || ""));
  return m ? m[1].trim() : `District ${n} as the 2022 legislative plan draws it`;
}

// ── THE PLAN ────────────────────────────────────────────────────────────────
// Every seat, with either a board row or the reason it has none.
export function planBoards() {
  const win = loadRoster();
  const RO = win.CMP_DATA;
  const boards = [];
  const skipped = [];
  for (const { chamber, code, count } of CHAMBERS) {
    for (let n = 1; n <= count; n++) {
      const seat = `ut-${chamber}-${n}`;
      const alias = `ut-${code}-${n}`;
      if (HAND_SEATS.includes(seat)) continue;
      if (chamber === "house") {
        const holder = win._pdxUsHouseSeat("Utah", n) || "";
        const row = holder && RO[holder];
        if (!row) { skipped.push({ seat, alias, reason: "no sitting U.S. Representative on the roster" }); continue; }
        boards.push({
          seat, alias, chamber, district: n, pid: "", joinPid: holder,
          usHouse: { state: "Utah", district: n },
          member: row.name, office: row.office,
          h1: `Utah’s ${ORD(n)} Congressional District`,
          where: "The district as the court-ordered 2026 map draws it",
          kick: `UT-${n} district board`,
        });
        continue;
      }
      const pid = win.pdxSeatedMemberFor(seat, n) || "";
      if (!pid) { skipped.push({ seat, alias, reason: "no sitting pid on the roster" }); continue; }
      const row = RO[pid];
      if (!row) { skipped.push({ seat, alias, pid, reason: "pid has no cmp-data.js row" }); continue; }
      const claim = win.pdxSeatClaim(pid, seat, n);
      if (claim !== "match") { skipped.push({ seat, alias, pid, reason: `roster record does not claim this seat (${claim})` }); continue; }
      const body = chamber === "statehouse" ? "House" : "Senate";
      boards.push({
        seat, alias, chamber, district: n, pid,
        member: row.name, office: row.office,
        h1: `Utah ${body} District ${n}`,
        where: whereOf(row.state, n),
        kick: `${body} District ${n} board`,
      });
    }
  }
  planStatewide(win, boards, skipped);
  planFederal(win, boards, skipped);
  planStateLegislative(win, boards, skipped);
  for (const b of boards) {
    b.route = `/district/${b.alias}`;
    b.doc = `district-${b.alias}.html`;
    b.kickTitle = b.statewide
      ? `The board for ${b.h1}: who is in the room and what is on the table. A place, not a scorecard.`
      : `The district board for ${b.h1}: who is in the room and what is on the table. A place, not a scorecard.`;
  }
  return { boards, skipped };
}

// ── THE STATEWIDE SEATS: THE GOVERNOR AND BOTH U.S. SENATE SEATS ────────────
// Utah only, and only the seats window._pdxStatewideSeats('Utah') — the
// resolver's one owner of "who holds this state's at-large seats" — answers.
// Same gate as a district seat: a pid, a cmp-data.js row, and a record whose own
// office string is the seat. A seat that fails any of the three is SKIPPED and
// keeps "this room is not open" on /voice.
//
// THE KEY. The governor is one seat, so it is `ut-gov`. The two Senate seats are
// the same office twice and the resolver lists them in no stable order, so each
// is keyed by the roster pid of the member who holds it: `ut-us-senate-<pid>`.
// The key is the URL alias too — there is no second spelling to normalise.
export const STATEWIDE_KEY_RE = /^[a-z]{2}-(?:gov|us-senate-[a-z][a-z0-9_]*)$/;
function planStatewide(win, boards, skipped) {
  const RO = win.CMP_DATA;
  const sw = typeof win._pdxStatewideSeats === "function" ? win._pdxStatewideSeats("Utah") : null;
  const seats = [];
  if (!sw || sw.ambiguous) {
    skipped.push({ seat: "ut-gov", alias: "ut-gov", reason: "the statewide walk did not answer for Utah" });
    return;
  }
  seats.push({ kind: "governor", pid: String(sw.governor || ""), key: "ut-gov" });
  for (const pid of sw.senators || []) seats.push({ kind: "senate", pid: String(pid || ""), key: `ut-us-senate-${pid}` });
  for (const s of seats) {
    const row = s.pid && RO[s.pid];
    if (!row) { skipped.push({ seat: s.key, alias: s.key, pid: s.pid, reason: "no sitting pid with a cmp-data.js row" }); continue; }
    const office = String(row.office || "");
    const claims = s.kind === "governor" ? /^governor$/i.test(office) : /^U\.S\. Senator$/i.test(office);
    if (!claims || String(row.state || "") !== "Utah" || !STATEWIDE_KEY_RE.test(s.key)) {
      skipped.push({ seat: s.key, alias: s.key, pid: s.pid, reason: `roster record does not claim this seat (${office})` });
      continue;
    }
    const label = s.kind === "governor" ? "Governor" : "U.S. Senate";
    boards.push({
      seat: s.key, alias: s.key, chamber: s.kind, district: 0, pid: s.pid, statewide: true,
      member: row.name, office: row.office,
      h1: `${label} · ${row.name}`,
      where: "Statewide · the whole State of Utah",
      kick: `${label} board`,
    });
  }
}

// ── EVERY OTHER STATE'S U.S. HOUSE AND U.S. SENATE SEATS ────────────────────
// The same two lookups the Utah rows use, asked with the roster's own state
// name, and the same refusal: no holder, no board.
//   U.S. House   window._pdxUsHouseSeat(<State>, n) answers somebody with a
//                cmp-data.js row. The row carries NO pid, as UT-2's does.
//   U.S. Senate  window._pdxStatewideSeats(<State>) names the pid, it has a
//                cmp-data.js row whose own state is <State>, and its office is
//                a U.S. Senate seat (a leadership or committee title included —
//                the resolver's own classifier already admitted it — and never a
//                state senate, a former member or a candidate). Keyed by pid,
//                exactly as Utah's two are: `<code>-us-senate-<pid>`.
// The governor is NOT opened outside Utah. Every board here is `federal`, which
// only keeps it out of sw.js; it takes a voice like any Utah board.
const US_SENATE_OFFICE_RE = /\bsenat(?:e|or)\b/i;
const NOT_US_SENATE_RE = /\bstate\s+senat|\bformer\b|\bex-|\bcandidate\b|\bnominee\b|-elect\b/i;
function planFederal(win, boards, skipped) {
  const RO = win.CMP_DATA;
  for (const { code, name, seats } of FEDERAL_STATES) {
    for (let n = 1; n <= seats; n++) {
      const seat = `${code}-house-${n}`;
      const alias = `${code}-cd-${n}`;
      const holder = win._pdxUsHouseSeat(name, n) || "";
      const row = holder && RO[holder];
      if (!row) { skipped.push({ seat, alias, reason: "no sitting U.S. Representative on the roster" }); continue; }
      const atLarge = seats === 1;
      boards.push({
        seat, alias, chamber: "house", district: n, pid: "", joinPid: holder, federal: true,
        usHouse: { state: name, district: n },
        member: row.name, office: row.office,
        h1: atLarge ? `${name}’s At-Large Congressional District` : `${name}’s ${ORD(n)} Congressional District`,
        where: atLarge ? `The whole State of ${name}, one at-large seat` : "The district as the current congressional map draws it",
        kick: atLarge ? `${code.toUpperCase()} at-large district board` : `${code.toUpperCase()}-${n} district board`,
      });
    }
    const sw = win._pdxStatewideSeats(name);
    if (!sw || sw.ambiguous) {
      skipped.push({ seat: `${code}-us-senate`, alias: `${code}-us-senate`, reason: `the statewide walk did not answer for ${name}` });
      continue;
    }
    for (const p of sw.senators || []) {
      const pid = String(p || "");
      const key = `${code}-us-senate-${pid}`;
      const row = pid && RO[pid];
      if (!row) { skipped.push({ seat: key, alias: key, pid, reason: "no sitting pid with a cmp-data.js row" }); continue; }
      const office = String(row.office || "");
      if (String(row.state || "") !== name || !US_SENATE_OFFICE_RE.test(office) ||
          NOT_US_SENATE_RE.test(office) || !STATEWIDE_KEY_RE.test(key)) {
        skipped.push({ seat: key, alias: key, pid, reason: `roster record does not claim this seat (${office})` });
        continue;
      }
      boards.push({
        seat: key, alias: key, chamber: "senate", district: 0, pid, statewide: true, federal: true,
        member: row.name, office: row.office,
        h1: `U.S. Senate · ${row.name}`,
        where: `Statewide · the whole State of ${name}`,
        kick: "U.S. Senate board",
      });
    }
  }
}

// ── EVERY OTHER STATE'S STATE HOUSE AND STATE SENATE SEATS ──────────────────
// THE CANDIDATES ARE THE ROSTER'S, NOT A SEAT COUNT. Utah's loop above walks
// 1..75 because Utah's plan is drawn here; no other state's is, so the only
// seats asked about are the ones a sitting roster record names: a record whose
// own state is <State>, whose office is a state senate or state house seat, and
// whose own district string carries the number. Nothing is numbered that the
// roster did not number.
//
// THE RESOLVER IS THE GATE. Each candidate is put to window.pdxRepsForMe() —
// the app's one answer to "which seats is this location in, and who holds
// them" — as a location in <State> on that district. The board opens only if
// the matching level comes back `mapped` (the resolver draws that state's
// legislative lines), on the same number, with this very pid seated on it. A
// state the resolver does not map is refused for every one of its seats, and
// the reason is logged; no geometry, pid or seat is supplied to get past it.
//
// THE ROW IS READ-ONLY: `stateLeg`, kept off the composer's three lists and
// written `composer: false`, so the document prints the seat and the record and
// takes no comment, no poll vote and no residency claim. `stateLeg` keeps it
// out of sw.js too, exactly as an out-of-state congressional board is kept out.
const STATE_LEG_OFFICE_RE = /\b(?:state\s+senat(?:e|or)|state\s+(?:house|representative|rep\.?|assembly(?:member)?)|assemblymember|house\s+of\s+delegates|delegate)\b/i;
const STATE_LEG_NOT_SITTING_RE = /\bformer\b|\bex-|\bcandidate\b|\bnominee\b|-elect\b/i;
// A LETTERED SEAT ("HD 3B" in Minnesota's House) is keyed the way the resolver
// keys it — its place in the lettered table, from 1 — and printed with its
// letter. Only a chamber the resolver itself calls lettered is read this way,
// and only a record that writes a number and a letter; every other record is
// read exactly as before, so no other state's seat or bytes move.
function letteredSeat(win, name, chamber, district) {
  const m = /^\s*(?:HD\s*|District\s+)?([1-9][0-9]?)([A-Z])\s*$/i.exec(String(district == null ? "" : district));
  if (!m || typeof win.pdxLegChamberNamed !== "function" || !win.pdxLegChamberNamed(name, chamber)) return null;
  const code = m[1].padStart(2, "0") + m[2].toUpperCase();
  const key = typeof win.pdxLegDistrictKey === "function" ? win.pdxLegDistrictKey(name, chamber, code) : 0;
  return key > 0 ? { key, label: m[1] + m[2].toUpperCase() } : null;
}
function stateLegCandidates(RO, name, win = {}) {
  const out = [];
  for (const pid of Object.keys(RO)) {
    const row = RO[pid] || {};
    if (String(row.state || "") !== name) continue;
    const office = String(row.office || "");
    if (!STATE_LEG_OFFICE_RE.test(office) || STATE_LEG_NOT_SITTING_RE.test(office)) continue;
    const chamber = /senat/i.test(office) ? "statesenate" : "statehouse";
    const lettered = letteredSeat(win, name, chamber, row.district);
    if (lettered) { out.push({ pid, row, office, chamber, district: lettered.key, label: lettered.label }); continue; }
    const m = /^\s*(?:(?:SD|HD|AD|LD)\s*|District\s+)?([1-9][0-9]*)[A-Z]?\s*$/i.exec(String(row.district == null ? "" : row.district));
    out.push({ pid, row, office, chamber, district: m ? parseInt(m[1], 10) : 0 });
  }
  return out;
}
// One walk of the resolver, as a reader placed in <State> on district n of both
// chambers. The sandbox's location is restored after, so no walk leaks into the
// next one.
function resolverLevel(win, name, chamber, n) {
  const prevLoc = win._currentVoterLocation, prevHas = win._hasUserLocation;
  try {
    win._currentVoterLocation = { state: name, district: "", stateHouseDistrict: String(n || ""), stateSenateDistrict: String(n || "") };
    win._hasUserLocation = true;
    const r = typeof win.pdxRepsForMe === "function" ? win.pdxRepsForMe() : null;
    return ((r && r.levels) || []).find((l) => l && l.key === chamber) || null;
  } catch (e) {
    return null;
  } finally {
    win._currentVoterLocation = prevLoc;
    win._hasUserLocation = prevHas;
  }
}
export const STATE_LEG_REFUSAL = "the location resolver does not map this state's legislative lines";
// MAPPING A STATE'S LINES IS NOT OPENING ITS BOARDS. Texas's legislative lines
// (and California's, Florida's, New York's, Illinois's, Pennsylvania's,
// Ohio's, Georgia's, Michigan's, North Carolina's, Virginia's, Washington's,
// Arizona's, New Jersey's, Massachusetts's, Tennessee's, Colorado's,
// Maryland's, Minnesota's, Wisconsin's, Indiana's, Missouri's, Kentucky's,
// Alabama's, South Carolina's, Iowa's, Oklahoma's, Kansas's, Nevada's,
// Nebraska's, Arkansas's, Oregon's, Idaho's, Montana's,
// New Mexico's, Wyoming's, Mississippi's, West Virginia's, Hawaii's,
// Louisiana's, Maine's, New Hampshire's, Connecticut's, Rhode Island's and
// Vermont's, Delaware's, North Dakota's, South Dakota's and Alaska's since)
// are drawn by /find and resolved by pdxRepsForMe now, so the resolver gate
// below would seat its members — but that pass was scoped to the map and the
// seat card, with no new boards. Opening one is its own decision, made by
// adding the state's code here; until then a mapped seat is refused with this
// reason rather than the resolver's.
export const STATE_LEG_BOARD_STATES = new Set();
export const STATE_LEG_BOARD_REFUSAL = "state legislative boards are not opened in this state";
// ONE SEAT AT A TIME, WHERE THERE IS A RACE. A state that is not on the list
// above may still open a board for a single seat when that seat is one of the
// contested races a state's ballot file holds for the November 3, 2026 ballot
// (CONTESTED_FILES below — Pennsylvania's, Georgia's, North Carolina's, Michigan's, Ohio's, Wisconsin's, Florida's, Arizona's Senate, New York's, Texas's, Illinois's, then Minnesota's) — the seat key is
// read from that file's RACES, never typed here, so a board cannot open for a
// seat with no race behind it. Every other gate below still applies: the
// roster names the sitting member, the resolver seats that member on that
// number, and the board is read-only.
export const CONTESTED_FILES = [
  { code: "pa", file: "pa-ballot-2026.js", global: "PDXPaBallot" },
  { code: "ga", file: "ga-ballot-2026.js", global: "PDXGaBallot" },
  { code: "nc", file: "nc-ballot-2026.js", global: "PDXNcBallot" },
  { code: "mi", file: "mi-ballot-2026.js", global: "PDXMiBallot" },
  { code: "oh", file: "oh-ballot-2026.js", global: "PDXOhBallot" },
  { code: "wi", file: "wi-ballot-2026.js", global: "PDXWiBallot" },
  { code: "fl", file: "fl-ballot-2026.js", global: "PDXFlBallot" },
  { code: "az", file: "az-ballot-2026.js", global: "PDXAzBallot" },
  { code: "ny", file: "ny-ballot-2026.js", global: "PDXNyBallot" },
  { code: "tx", file: "tx-ballot-2026.js", global: "PDXTxBallot" },
  { code: "il", file: "il-ballot-2026.js", global: "PDXIlBallot" },
  { code: "mn", file: "mn-ballot-2026.js", global: "PDXMnBallot" },
];
const contestedModule = (c) => {
  const w = {}; w.window = w;
  vm.runInContext(R(c.file), vm.createContext(w), { filename: c.file });
  return w[c.global];
};
export function contestedSeats() {
  const out = new Set();
  for (const c of CONTESTED_FILES) {
    const M = contestedModule(c);
    for (const r of (M && M.RACES) || []) if (r.seat.indexOf(c.code + "-") === 0) out.add(r.seat);
  }
  return out;
}
export const STATE_LEG_BOARD_SEATS = contestedSeats();
// A lower chamber its state calls the Assembly is named so on its board.
// Wisconsin and New York are the only ones of these with a board today; the
// others name no board, so their bytes cannot move.
const ASSEMBLY_STATES = new Set(["ca", "ny", "nv", "nj", "wi"]);
export function planStateLegislative(win, boards, skipped, states = FEDERAL_STATES, boardStates = STATE_LEG_BOARD_STATES, boardSeats = STATE_LEG_BOARD_SEATS) {
  const RO = win.CMP_DATA;
  for (const { code, name } of states) {
    const opened = new Map();
    for (const c of stateLegCandidates(RO, name, win)) {
      const short = c.chamber === "statesenate" ? "sd" : "hd";
      const seat = c.district ? `${code}-${c.chamber}-${c.district}` : `${code}-${c.chamber}`;
      const alias = c.district ? `${code}-${short}-${c.district}` : `${code}-${short}`;
      const base = { seat, alias, pid: c.pid, stateLeg: true };
      const lvl = resolverLevel(win, name, c.chamber, c.district);
      if (!lvl || !lvl.mapped) { skipped.push({ ...base, reason: STATE_LEG_REFUSAL }); continue; }
      if (!boardStates.has(code) && !boardSeats.has(seat)) { skipped.push({ ...base, reason: STATE_LEG_BOARD_REFUSAL }); continue; }
      if (!c.district) { skipped.push({ ...base, reason: "roster record names no district number" }); continue; }
      if (String(lvl.district || "") !== String(c.district) || lvl.pid !== c.pid) {
        skipped.push({ ...base, reason: `the location resolver does not seat this member on this number (${lvl.pid || "nobody"})` });
        continue;
      }
      const body = c.chamber === "statesenate" ? "Senate" : (ASSEMBLY_STATES.has(code) ? "Assembly" : "House");
      const label = c.label || c.district;
      const list = opened.get(seat) || [];
      list.push({
        seat, alias, chamber: c.chamber, district: c.district, pid: c.pid,
        stateLeg: true, readOnly: true,
        member: c.row.name, office: c.row.office,
        h1: `${name} ${body} District ${label}`,
        where: `District ${label} as ${name}’s current legislative plan draws it`,
        kick: `${body} District ${label} board`,
      });
      opened.set(seat, list);
    }
    // Two records on one seat is a roster question, not a board: neither opens.
    for (const list of opened.values()) {
      if (list.length === 1) { boards.push(list[0]); continue; }
      for (const b of list) skipped.push({ seat: b.seat, alias: b.alias, pid: b.pid, stateLeg: true, reason: "two roster records claim this seat" });
    }
  }
}

// ── RENDERING ───────────────────────────────────────────────────────────────
const html = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  .replace(/’/g, "&rsquo;");
const js = (s) => "'" + String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

const RETURN_TAG =
  "  <!-- THE RETURN INTENT. PDXReturn, generated byte for byte from its owner\n" +
  "       (voter-hub-location.js) by scripts/gen-pdx-return.mjs, so Join and every\n" +
  "       sign-in door on this board carry it back here. Before the chip. -->\n" +
  "  <script defer src=\"/pdx-return.js\"></script>\n";

// THE STUDIO DOOR IN THE FALLBACK, spelled the way PDXReturn.studioHref()
// spells it for the live band: this board's own address as `next`, encoded.
// A reader without JavaScript cannot be walked back by consume(), but the
// address still says where they came from, and the suite pins every board to
// its own path.
export const studioDoor = (alias) => `/my-stances?next=${encodeURIComponent(`/district/${alias}`)}`;

// THE RACE ON A CONTESTED SEAT'S BOARD. A board opened by STATE_LEG_BOARD_SEATS
// prints its race — every name on the ballot, each with the formal acts on
// file and their effect lines — in the document itself, so the room is never
// empty and needs no script to read. Every other board gets '' and its bytes
// do not move.
const RACE_MODULES = {};
function raceBlock(b) {
  if (!b.stateLeg || !STATE_LEG_BOARD_SEATS.has(b.seat)) return "";
  const c = CONTESTED_FILES.find((x) => b.seat.indexOf(x.code + "-") === 0);
  const M = RACE_MODULES[c.code] || (RACE_MODULES[c.code] = contestedModule(c));
  const r = M.RACES.find((x) => x.seat === b.seat);
  return [
    `    <!-- THE RACE: ${c.file}, written by scripts/gen-district-boards.mjs. -->`,
    `    <link rel="stylesheet" href="/pa-ballot.css" />`,
    `    <div class="pdxpa-board-race" id="pdx-${c.code}-race" data-pdx${c.code}-seat="${b.seat}">`,
    `      <p class="pdxpa-kick">On the ${M.ELECTION} ballot · <a href="/ballot/${c.code}">your legislative ballot</a></p>`,
    `      ${M.raceHtml(r)}`,
    `    </div>`,
    "",
  ].join("\n") + "\n";
}

export function renderDoc(b, template = R("scripts/district-board.template.html")) {
  const h1 = html(b.h1);
  const where = html(b.where);
  const noscript = b.statewide
    ? [
        `        <p class="pdx-sh-note">`,
        `          This is the board for the statewide seat ${h1} &mdash; ${where}.`,
        `          It needs JavaScript to read the seat&rsquo;s roster row, the count of`,
        `          who is in the room, and the measures on this seat&rsquo;s table.`,
        `          You can still`,
        `          <a href="/p/${b.pid}">read the sitting member&rsquo;s record</a>`,
        `          (<span data-pdxdb-roster-name>${html(b.member)}</span>,`,
        `          <span data-pdxdb-roster-office>${html(b.office)}</span>),`,
        `          <a href="/#who-represents-me">see who represents you</a>, or`,
        `          <a href="${studioDoor(b.alias)}">set your own positions</a>.`,
        `        </p>`,
      ]
    : b.usHouse
    ? [
        `        <p class="pdx-sh-note">`,
        `          This is the district board for ${h1}, as the`,
        `          ${b.federal ? "current congressional" : "court-ordered 2026"} map draws it. It needs`,
        `          JavaScript to read who holds the seat, the count of who is in the`,
        `          room, and the measures on this district&rsquo;s table — and which`,
        `          member holds a congressional district is a lookup, so there is no`,
        `          name for this fallback to print. You can still`,
        `          <a href="/#who-represents-me">see who represents you</a> or`,
        `          <a href="${studioDoor(b.alias)}">set your own positions</a>.`,
        `        </p>`,
      ]
    : [
        `        <p class="pdx-sh-note">`,
        `          This is the district board for ${h1} &mdash; ${where}.`,
        `          It needs JavaScript to read the seat&rsquo;s roster row, the count of`,
        `          who is in the room, and the measures on this district&rsquo;s table.`,
        `          You can still`,
        `          <a href="/p/${b.pid}">read the sitting member&rsquo;s record</a>`,
        `          (<span data-pdxdb-roster-name>${html(b.member)}</span>,`,
        `          <span data-pdxdb-roster-office>${html(b.office)}</span>),`,
        `          <a href="/#who-represents-me">see who represents you</a>, or`,
        `          <a href="${studioDoor(b.alias)}">set your own positions</a>.`,
        `        </p>`,
      ];
  const vars = {
    FILE: b.doc,
    H1_CAPS: b.h1.toUpperCase(),
    ROSTER_NOTE: b.usHouse
      ? `the U.S. House join _pdxUsHouseSeat('${b.usHouse.state}', ${b.district}), which names no pid here`
      : b.statewide ? `${b.chamber} (statewide) → ${b.pid}`
      : `${b.chamber} ${b.district} → ${b.pid}`,
    ALIAS: b.alias,
    H1_HTML: h1,
    WHERE_HTML: where,
    US_HOUSE_SCRIPT: b.usHouse ? `  <script defer src="/voter-hub-location.js"></script>\n` : "",
    // The composer's seat resolver. A congressional board already loads
    // voter-hub-location.js above, and loading it twice would run it twice.
    COMPOSER_VHL_SCRIPT: b.usHouse ? "" : `  <script defer src="/voter-hub-location.js"></script>\n`,
    // PDXReturn for the chrome's Join. A congressional board already has it from
    // voter-hub-location.js above; every other board gets the generated copy.
    RETURN_SCRIPT: b.usHouse ? "" : RETURN_TAG,
    NOSCRIPT: noscript.join("\n"),
    RACE_HTML: raceBlock(b),
  };
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => {
    if (!(k in vars)) throw new Error(`gen-district-boards: unknown template slot ${m}`);
    return vars[k];
  });
}

function boardsRows(boards) {
  return boards.map((b) => {
    const f = [
      `seat: ${js(b.seat)}`, b.readOnly ? "composer: false" : "composer: true", `alias: ${js(b.alias)}`, `route: ${js(b.route)}`, `pid: ${js(b.pid)}`,
    ];
    if (b.usHouse) f.push(`usHouse: { state: ${js(b.usHouse.state)}, district: ${b.district} }`);
    if (b.statewide) f.push("statewide: true");
    f.push(`h1: ${js(b.h1)}`, `where: ${js(b.where)}`, `kick: ${js(b.kick)}`, `kickTitle: ${js(b.kickTitle)}`);
    return `    ${js(b.seat)}: { ${f.join(", ")} },`;
  });
}

// Replace everything strictly between the begin and end marker lines.
function splice(src, file, lines) {
  const a = src.indexOf(BEGIN);
  const z = src.indexOf(END);
  if (a < 0 || z < 0 || z < a) throw new Error(`gen-district-boards: ${file} has no generated block markers`);
  if (src.indexOf(BEGIN, a + 1) >= 0) throw new Error(`gen-district-boards: ${file} has two generated blocks`);
  const from = src.indexOf("\n", a) + 1;
  const to = src.lastIndexOf("\n", z) + 1;
  return src.slice(0, from) + (lines.length ? lines.join("\n") + "\n" : "") + src.slice(to);
}

// The nav regex is one literal (a regex cannot hold a marker comment), so the
// whole line is rewritten from the hand aliases plus the generated ones.
const HAND_ALIASES = ["ut-sd-3", "ut-hd-16", "ut-sd-7", "ut-cd-2", "ut-hd-15", "ut-sd-6"];
function navReLine(boards) {
  const all = HAND_ALIASES.concat(boards.map((b) => b.alias));
  return `  /^\\/district\\/(?:${all.join("|")})(?:\\/|\\.html)?$/;`;
}

// Every document this generator may own: a Utah district seat's or statewide
// seat's, or another state's U.S. House, U.S. Senate, State House or State
// Senate seat's.
export const BOARD_DOC_RE = /^district-(?:ut-(?:(?:hd|sd|cd)-\d+|gov|us-senate-[a-z][a-z0-9_]*)|[a-z]{2}-(?:(?:cd|hd|sd)-\d+|us-senate-[a-z][a-z0-9_]*))\.html$/;

export function renderAll() {
  const { boards, skipped } = planBoards();
  const out = new Map();

  out.set("district-board.js", splice(R("district-board.js"), "district-board.js", boardsRows(boards)));
  out.set("district-voice.js", splice(R("district-voice.js"), "district-voice.js",
    boards.map((b) => `    ${js(b.seat)}: ${js(b.route)},`)));
  out.set("netlify/functions/district-board.mts", splice(R("netlify/functions/district-board.mts"),
    "district-board.mts", boards.map((b) => `  "${b.seat}": 1,`)));
  // Every board but a read-only one is on the composer's three lists. Only the
  // sw.js blocks below are Utah's alone.
  const utah = boards.filter((b) => !b.federal && !b.stateLeg);
  const voiced = boards.filter((b) => !b.readOnly);
  out.set("netlify/lib/district-board-voice-core.mjs", splice(R("netlify/lib/district-board-voice-core.mjs"),
    "district-board-voice-core.mjs", voiced.map((b) => `  "${b.seat}": "${b.alias}",`)));
  out.set("district-composer.js", splice(R("district-composer.js"), "district-composer.js",
    voiced.map((b) => `    ${js(b.alias)}: 1,`)));
  out.set("district-poll.js", splice(R("district-poll.js"), "district-poll.js",
    voiced.map((b) => `    ${js(b.alias)}: 1,`)));
  out.set("netlify.toml", splice(R("netlify.toml"), "netlify.toml", boards.flatMap((b) => [
    `# ${b.h1.replace("’", "'").replace("·", "-")} — ${b.usHouse ? "U.S. House join" : b.pid}`,
    ...["", "/", ".html"].flatMap((sfx) => [
      "[[redirects]]",
      `  from = "/district/${b.alias}${sfx}"`,
      `  to = "/${b.doc}"`,
      "  status = 200",
    ]),
    "",
  ])));

  // sw.js carries THREE generated blocks, so its markers are suffixed.
  let sw = R("sw.js");
  const swBlock = (src, tag, lines) => {
    const b = `${BEGIN} ${tag}`, e = `${END} ${tag}`;
    const a = src.indexOf(b), z = src.indexOf(e);
    if (a < 0 || z < a) throw new Error(`gen-district-boards: sw.js has no ${tag} block`);
    const from = src.indexOf("\n", a) + 1, to = src.lastIndexOf("\n", z) + 1;
    return src.slice(0, from) + (lines.length ? lines.join("\n") + "\n" : "") + src.slice(to);
  };
  sw = swBlock(sw, "precache", utah.map((b) => `  '/${b.doc}',`));
  sw = swBlock(sw, "nav-re", ["const DISTRICT_BOARD_NAV_RE =", navReLine(utah)]);
  sw = swBlock(sw, "docs", utah.map((b) => `  ${js(b.alias)}: '/${b.doc}',`));
  out.set("sw.js", sw);

  const tpl = R("scripts/district-board.template.html");
  for (const b of boards) out.set(b.doc, renderDoc(b, tpl));

  // A generated document whose seat fell off the roster is removed, never left
  // behind as an address with no row.
  const keep = new Set([...HAND_ALIASES.map((a) => `district-${a}.html`), ...boards.map((b) => b.doc)]);
  const stale = readdirSync(ROOT).filter((f) => BOARD_DOC_RE.test(f) && !keep.has(f));

  return { boards, skipped, out, stale };
}

function main() {
  const check = process.argv.includes("--check");
  const { boards, skipped, out, stale } = renderAll();
  const drift = [];
  for (const [f, body] of out) {
    const p = join(ROOT, f);
    const cur = existsSync(p) ? readFileSync(p, "utf8") : null;
    if (cur === body) continue;
    drift.push(f);
    if (!check) writeFileSync(p, body);
  }
  for (const f of stale) {
    drift.push(`${f} (stale)`);
    if (!check) unlinkSync(join(ROOT, f));
  }
  const leg = boards.filter((b) => b.stateLeg).length;
  const fed = boards.filter((b) => b.federal).length;
  const legSkipped = skipped.filter((s) => s.stateLeg);
  console.log(`gen-district-boards: ${boards.length} generated boards (${boards.length - fed - leg} Utah, ${fed} other states' U.S. House and U.S. Senate, ${leg} other states' state legislative), ${skipped.length} seats skipped`);
  if (!leg) {
    const states = new Set(legSkipped.map((s) => s.seat.slice(0, 2)));
    console.log(`  0 state legislative boards outside Utah: ${legSkipped.length} roster seats in ${states.size} states refused (${STATE_LEG_REFUSAL})`);
  }
  if (check) {
    if (drift.length) {
      console.log(`  out of date: ${drift.join(", ")}\n  run: node scripts/gen-district-boards.mjs`);
      process.exit(1);
    }
    console.log("  up to date");
  } else {
    console.log(drift.length ? `  wrote ${drift.length} file(s)` : "  nothing to write");
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
