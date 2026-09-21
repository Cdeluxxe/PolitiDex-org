#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-voice-sitting-member.mjs — /voice names who sits in the seat
// ─────────────────────────────────────────────────────────────────────────────
// THE LIVE DEFECT THIS PINS
//
// A Layton reader opened /voice and got six seat cards. Three of them named
// nobody:
//
//     State House District 16 · Davis County
//     No sitting member on hand for this seat.
//     Open board
//
// …and the same for Senate District 7. That sentence means "nobody holds this
// seat", printed directly above a door into the board FOR that seat — and one
// tap through the door, district-board.js named Trevor Lee and Stuart Adams,
// because it writes those two pids down in its own table.
//
// IT WAS NOT THE SEAT LIST AND IT WAS NOT THE ROSTER GATE (that was the
// previous pass — see test-voice-house-member.mjs). pdxRepsForMe() is the one
// seat list and it already asks the right joins:
//
//   · window._pdxUsHouseSeat(state, district) for the congressional seat, off
//     the roster's own district-qualified records. It is in
//     voter-hub-location.js, which /voice loads.
//   · window.pdxSeatedMemberFor(seatKey, n) for the two legislative seats. It
//     is declared inside ballot-breakdown.js — 407 KB of curated race
//     machinery voice.html deliberately does not load — so on the hallway the
//     call site was present, the function was not, and the resolver failed soft
//     to null exactly as it is written to.
//
// WHAT THE FIX IS, AND WHAT IT IS NOT. The lookup is LIFTED, not re-implemented:
// seated-member.js is the three district→pid tables and the one function over
// them, copied verbatim out of ballot-breakdown.js and pinned to it here. That
// is the same move profile-alias.js already is on this same document. No second
// seat-holder table, no second congressional answer, no new board.
//
// THE RULES THIS HARNESS HOLDS
//
//   1. THE TABLE IS ON THE LEAN DOCUMENT AND IT IS FOUR LITERALS. seated-member.js
//      carries ballot-breakdown.js's blocks byte for byte, declares no resolver,
//      reads no roster, names no seat and knows no board; voice.html loads it and
//      still loads none of the four modules the address exists to not load; the
//      worker precaches it.
//   2. THE FILL IS IN THE SEAT LIST'S OWNER. district-voice.js's seatsForMe()
//      takes the resolver's pid first, always, and consults the joins only for a
//      level that came back blank. voice-room.js stays a printer.
//   3. DRIVEN, LAYTON-SHAPED. The real resolver, the real hallway, a Davis
//      County reader who pinned CD-2 / SD-7 / HD-16 in the finder: three district
//      cards print "Sitting member: <a>Name</a>" AND an Open board door.
//   4. AND THE JOIN IS WHAT DOES IT. The same reader with the join stubbed off
//      goes back to the empty sentence, so rule 3 is not passing for some other
//      reason and the empty copy is not dead.
//   5. STATE GATING IS NOT OPTIONAL. A Missouri reader's CONGRESSIONAL card is
//      named off the roster; their State House and State Senate cards name
//      nobody and offer no room, because that table is keyed on a district
//      number with no state of its own.
//   6. A REAL EMPTY FILE STILL GETS THE EMPTY SENTENCE.
//   7. NOTHING ELSE MOVED. BOARD_ROUTES is still four named rows, no splat, no
//      composer, no equity, no score, and ballot-breakdown.js is byte-identical
//      to HEAD.
//
//   node scripts/test-voice-sitting-member.mjs
//
// No database, no network: every source of truth here is a committed file.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { deOrigin } from "./v103-chrome-seams.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const SM = R("seated-member.js");
const BB = R("ballot-breakdown.js");
const LOC = R("voter-hub-location.js");
const DV = R("district-voice.js");
const VR = R("voice-room.js");
const PA = R("profile-alias.js");
const VOICE_HTML = R("voice.html");
const SW = R("sw.js");

let passed = 0;
const fails = [];
const ok = (c, m) => { if (c) passed++; else fails.push(m); };
const must = (c, m) => { ok(c, m); if (!c) { report(); process.exit(1); } };
const eq = (a, b, m) => ok(a === b, `${m}\n    expected: ${JSON.stringify(b)}\n    actual:   ${JSON.stringify(a)}`);
const has = (s, n, m) => ok(String(s).indexOf(n) !== -1, m);
const no = (s, n, m) => ok(String(s).indexOf(n) === -1, m);
const section = (t) => console.log(`\n   ── ${t}`);
// Every rule here is about CODE, not prose. These files explain themselves at
// length and name what they deliberately do NOT do, so a "this file must not
// read the roster" rule asked of the raw text fails on the sentence saying it
// does not. Comments out, then ask.
const code = (src) => String(src)
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .split("\n").map((l) => l.replace(/(^|[^:"'`\\])\/\/.*$/, "$1")).join("\n");
const SM_CODE = code(SM);
const VR_CODE = code(VR);
const DV_CODE = code(DV);

function report() {
  if (fails.length) {
    console.log(`\n✗ voice sitting member: ${fails.length} failing of ${passed + fails.length}\n`);
    fails.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    console.log("");
  } else {
    console.log(`\n✓ voice sitting member: ${passed} checks passed`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 1 · THE LIFTED TABLE: FOUR LITERALS, PINNED, AND NOTHING ELSE
// ═════════════════════════════════════════════════════════════════════════════
section("1 · seated-member.js is ballot-breakdown.js's tables and nothing else");

// THE BYTE PIN, ONE BLOCK AT A TIME. ballot-breakdown.js stays the source of
// truth — the file with the per-district reasoning, and the file an entry is
// added to. If the two drift, this fails rather than letting two documents hold
// two opinions about who sits in a district.
const lineOf = (src, idx) => src.slice(0, idx).split("\n").length;
const BLOCKS = [
  ["    var KR_CONGRESSIONAL_INCUMBENTS = {", "the U.S. House table"],
  ["    var KR_STATE_HOUSE_INCUMBENTS = {", "the Utah State House table"],
  ["    var KR_STATE_SENATE_INCUMBENTS = {", "the Utah State Senate table"],
  ["    function _pdxSeatKeyOf(raw) {", "the seat-key reader and the lookup itself"],
];
for (const [start, what] of BLOCKS) {
  const a = BB.indexOf(start);
  must(a > 0, `ballot-breakdown.js no longer declares ${what} at "${start.trim()}"`);
  const END = "\n    };";
  const b = BB.indexOf(END, a);
  must(b > a, `${what} in ballot-breakdown.js has no closing line this suite can find`);
  const SRC = BB.slice(a, b + END.length);
  const from = lineOf(BB, a), to = lineOf(BB, b + END.length);
  has(SM, `COPIED VERBATIM FROM ballot-breakdown.js LINES ${from}–${to}`,
    `table: seated-member.js does not declare which lines of ballot-breakdown.js ${what} came from — a\n` +
    "    mirror with no stated source is a second opinion waiting to happen");
  ok(SM.indexOf(SRC) > 0,
    `table: ballot-breakdown.js lines ${from}–${to} (${what}) are not present in seated-member.js byte for\n` +
    "    byte — either the copy drifted or the declared range is stale. Re-derive it, do not hand-edit");
}

// THE ASSIGNMENT YIELDS ON THIS SIDE. ballot-breakdown.js writes the function
// unguarded and is pinned to HEAD below, so the guard has to be here: a document
// carrying both gets ONE function whatever the script order resolves to.
has(SM_CODE, "if (typeof window.pdxSeatedMemberFor !== 'function') {",
  "table: seated-member.js assigns pdxSeatedMemberFor unguarded — on a document that also carries the\n" +
  "    owner, two copies would race and the page would depend on script order");

// AND IT IS THE TABLES AND NOTHING ELSE. No roster read, no location, no seat
// key, no board, no label: the reasons it is 9 KB instead of 407 KB.
[["CMP_DATA", "a roster read — this file maps a district to a pid, it does not look anybody up"],
  ["PROFILES", "a roster read — this file maps a district to a pid, it does not look anybody up"],
  ["pdxRepsForMe", "the seat list, which is the resolver's"],
  ["_currentVoterLocation", "the saved location — this file is keyed on a SEAT, never on a reader"],
  ["_pdxUsHouseSeat", "the congressional join, which stays in voter-hub-location.js"],
  ["BOARD_ROUTES", "the board allow-list"],
  ["/district/", "a board address"],
  ["innerHTML", "the DOM — it prints nothing"],
  ["pdxRosterWarm", "the roster gate, which is the resolver's and is asked in the hallway"]]
  .forEach(([s, why]) => no(SM_CODE, s, `table: seated-member.js reads or writes ${s} — ${why}`));

// THE DOCUMENT LOADS IT, AND STILL LOADS NONE OF WHAT IT EXISTS TO NOT LOAD.
has(VOICE_HTML, '<script defer src="/seated-member.js"></script>',
  "doc: voice.html does not load seated-member.js, so pdxSeatedMemberFor is still absent and the two\n" +
  "    legislative cards still report a vacancy");
["cmp-data.js", "ballot-breakdown.js", "profile-evidence.js", "compare-hub.js", "app.css"].forEach((f) =>
  ok(!new RegExp(`<(?:script|link)[^>]*(?:src|href)="/${f.replace(".", "\\.")}"`).test(VOICE_HTML),
    `doc: voice.html now loads ${f} — the seat's member is not worth re-linking the homepage stack for;\n` +
    "    that is the entire reason seated-member.js exists"));
const srcs = [...VOICE_HTML.matchAll(/<script\b[^>]*\bsrc="(\/[^"]+)"/g)].map((m) => m[1]);
ok(srcs.indexOf("/seated-member.js") > 0 && srcs.indexOf("/seated-member.js") < srcs.indexOf("/district-voice.js"),
  "doc: seated-member.js is loaded after district-voice.js — both are deferred so this is not a bug today,\n" +
  "    and the document should read as the table arriving before its reader");

// THE WORKER SHIPS IT WITH THE ROOM.
const VER = (/const CACHE_VERSION = '(v\d+)'/.exec(SW) || [, ""])[1];
ok(/^v\d+$/.test(VER) && Number(VER.slice(1)) >= 245,
  `sw: CACHE_VERSION is "${VER}" — a new shell asset shipped and a warm device would keep serving a\n` +
  "    voice.html that never requests it");
const SHELL = (() => {
  const a = SW.indexOf("const SHELL_ASSETS = [");
  must(a > 0, "sw.js no longer declares SHELL_ASSETS as one literal array");
  const b = SW.indexOf("\n];", a);
  must(b > a, "sw.js's SHELL_ASSETS array has no closing line this suite can find");
  return SW.slice(a, b);
})();
has(SHELL, "'/seated-member.js'",
  "sw: /seated-member.js is not precached — offline, /voice would report a vacancy on two seats whose\n" +
  "    boards it is offering a door into");

// ═════════════════════════════════════════════════════════════════════════════
// 2 · THE FILL IS IN THE SEAT LIST'S OWNER, AND IT ONLY EVER FILLS A BLANK
// ═════════════════════════════════════════════════════════════════════════════
section("2 · seatsForMe() fills a blank; voice-room.js stays a printer");

has(DV_CODE, "function joinedPid(level, seatKey, stateName)",
  "hallway: district-voice.js no longer owns the seated-member fill, so either it moved into the printer\n" +
  "    or it is gone");
has(DV_CODE, "if (!pid) pid = joinedPid(lv, seatKey, reps.state);",
  "hallway: the fill does not run after the resolver's own pid, which means either the resolver's answer\n" +
  "    can be overruled or the fill never runs at all");
{
  // THE RESOLVER'S PID IS READ FIRST AND THE FILL IS GUARDED ON IT BEING BLANK.
  const at = DV_CODE.indexOf("var pid = String(lv.pid == null ? '' : lv.pid);");
  ok(at > 0, "hallway: seatsForMe() no longer reads the level's own pid before anything else");
  const fillAt = DV_CODE.indexOf("joinedPid(lv, seatKey, reps.state)");
  ok(at > 0 && fillAt > at,
    "hallway: the join is consulted before the level's own pid — a lean-document fallback that can\n" +
    "    overrule the resolver is not a fallback");
}
// THE TWO LANES, AND THE STATE GATE ON THE ONE THAT NEEDS IT.
{
  const a = DV_CODE.indexOf("function joinedPid(level, seatKey, stateName)");
  const b = DV_CODE.indexOf("\n  }", DV_CODE.indexOf("pdxSeatedMemberFor", a));
  const blk = DV_CODE.slice(a, b);
  must(a > 0 && b > a, "hallway: joinedPid's body cannot be read by this suite");
  has(blk, "window._pdxUsHouseSeat(stateName, n)",
    "hallway: the U.S. House lane does not go through the app's one congressional join");
  has(blk, "window.pdxSeatedMemberFor(seatKey, n)",
    "hallway: the legislative lane does not go through the seated-member lookup");
  has(blk, "if (!seatKey) return '';",
    "hallway: the legislative lane is not gated on the composed seat key — that table is keyed on a\n" +
    "    district NUMBER with no state of its own, so ungated it answers 'tlee' for HD-16 in any state");
  // AND THE CONGRESSIONAL LANE IS THE ROSTER'S, NOT THE CURATED TABLE'S. A
  // written-down congressional pid is a second answer to a question a
  // court-ordered map can change.
  ok(blk.indexOf("_pdxUsHouseSeat") < blk.indexOf("pdxSeatedMemberFor"),
    "hallway: the U.S. House lane is not asked before the seated-member table, so a congressional seat\n" +
    "    can be answered from a written-down pid that outlives a redistricting");
  const hLane = blk.slice(blk.indexOf("if (seat === 'house')"), blk.indexOf("if (!seatKey)"));
  no(hLane, "pdxSeatedMemberFor",
    "hallway: the U.S. House lane falls through to the curated congressional table — that is the second\n" +
    "    answer district-board.js refuses for the same seat, for the same reason");
  // NOTHING HERE NAMES ANYBODY OR OPENS ANYTHING.
  no(blk, "name", "hallway: joinedPid reads a display name — it resolves a pid and the printer does the rest");
  no(blk, "boardPath", "hallway: joinedPid decides whether a board opens");
}
{
  // AND THE FILL IS NOT A SECOND, STRICTER GATE. pdxRepsForMe() is what decides
  // which pids survive, and its own seated() lane hands down a district-table
  // pid without re-asking the roster gate — so this one must not re-ask it
  // either. A fill that did would name the member with one cached copy of the
  // resolver and report a vacancy with the other, for the same reader and the
  // same seat, which is this pass's defect pointed backwards.
  const a = DV_CODE.indexOf("function joinedPid(level, seatKey, stateName)");
  const blk = DV_CODE.slice(a, DV_CODE.indexOf("\n  }", DV_CODE.indexOf("pdxSeatedMemberFor", a)));
  ["pdxRosterWarm", "pdxRosterRec", "PROFILES", "CMP_DATA"].forEach((t) => no(blk, t,
    `hallway: the fill weighs ${t} before handing a joined pid down. Whether a resolved pid still holds\n` +
    "    the seat is the resolver's ruling, made in one file, and a lean page second-guessing it is a\n" +
    "    second answer"));
}
// THE PRINTER IS STILL A PRINTER: no seat keys, no chambers, no state names.
[["statehouse", "a chamber name"], ["statesenate", "a chamber name"],
  ["pdxSeatedMemberFor", "the seated-member lookup"], ["_pdxUsHouseSeat", "the congressional join"],
  ["Utah", "a state name"], ["BOARD_ROUTES", "the board allow-list"]]
  .forEach(([s, why]) => no(VR_CODE, s, `printer: voice-room.js reads ${s} — ${why}. The hallway borrows every fact from district-voice.js`));
// AND THE COPY IS UNCHANGED. No "yet", and the empty sentence still exists.
has(VR, "No sitting member on hand for this seat.",
  "copy: the empty sentence was reworded or removed — it is still the right sentence when nobody resolves");
no(VR, "on hand for this seat yet",
  'copy: the empty sentence grew a "yet" — the hallway does not promise a member is coming');

// ═════════════════════════════════════════════════════════════════════════════
// 3 · DRIVEN: THE LAYTON READER, THE REAL RESOLVER, THE REAL HALLWAY
// ═════════════════════════════════════════════════════════════════════════════
section("3 · three district cards name a member and open a board");

// The resolver is sliced out of its owner and run for real — the same slice
// test-voice-house-member.mjs and test-who-represents-me.mjs drive, so the three
// suites cannot be testing three different resolvers.
const swFrom = LOC.indexOf("var _pdxStatewideCache = {};");
const resTo = LOC.indexOf("window._vhSyncDistrictStrip = function()", swFrom);
must(swFrom !== -1 && resTo > swFrom,
  "voter-hub-location.js no longer runs from _pdxStatewideCache down to _vhSyncDistrictStrip — the\n" +
  "  resolver slice this suite drives is gone");
const RESOLVER = LOC.slice(swFrom, resTo);
const RET_SRC = (() => {
  const at = LOC.indexOf("window.PDXReturn = (function () {");
  must(at > 0, "voter-hub-location.js no longer declares window.PDXReturn");
  const end = LOC.indexOf("\n  })();", at);
  return LOC.slice(at, end + "\n  })();".length);
})();

// THE LIVE INDEX, AND IT IS THE ONLY PEOPLE INDEX ON THE PAGE. voice.html
// carries no cmp-data.js, so window.PROFILES — the Firestore rows firebase-boot
// lists, which carry name / office / state — is all there is. The `state`
// strings are the roster's own two dialects: "Utah · District 2" for a member of
// Congress and "UT District 16" for a state legislator.
const PEOPLE = {
  tlee: { name: "Trevor Lee", office: "Utah State Representative", state: "UT District 16", party: "R" },
  sadams: { name: "Stuart Adams", office: "Utah State Senator", state: "UT District 7", party: "R" },
  maloy: { name: "Celeste Maloy", office: "U.S. Representative", state: "Utah · District 2", party: "R" },
  chew_h68: { name: "Scott Chew", office: "Utah State Representative", state: "UT District 68", party: "R" },
  mo_rep5: { name: "Emanuel Cleaver", office: "U.S. Representative", state: "Missouri · MO-5", party: "D" },
};

// THE READERS. Both pinned in the finder — no curated area, no memo, no ballot,
// which is the shape /find leaves behind and the shape the defect lives in.
const LAYTON = {
  who: "Layton",
  loc: { state: "Utah", city: "Layton", county: "Davis County", district: "2", stateSenateDistrict: "7", stateHouseDistrict: "16" },
  // seat key → [district number, pid, display name, board alias]
  cards: {
    house: ["2", "maloy", "Celeste Maloy", "ut-cd-2"],
    statesenate: ["7", "sadams", "Stuart Adams", "ut-sd-7"],
    statehouse: ["16", "tlee", "Trevor Lee", "ut-hd-16"],
  },
};
const KC = {
  who: "Kansas City",
  loc: { state: "Missouri", city: "Kansas City", county: "Jackson County", district: "5", stateSenateDistrict: "9", stateHouseDistrict: "16" },
};

// ── THE LEAN DOCUMENT ─────────────────────────────────────────────────────────
// Exactly what voice.html loads and nothing more: profile-alias.js,
// seated-member.js, the resolver, district-voice.js, voice-room.js, and one live
// people index. No CMP_DATA, no _pdxPersonById, no _pdxVoterBallot, no
// keyRacesRelevantData. `seated:false` takes seated-member.js off the page,
// which is rule 4.
function voiceCtx(s, opts) {
  const o = opts || {};
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
  win._currentVoterLocation = JSON.parse(JSON.stringify(s.loc));
  win.PROFILES = JSON.parse(JSON.stringify(o.live || PEOPLE));
  const ctx = vm.createContext(win);
  vm.runInContext(PA, ctx, { filename: "profile-alias.js" });
  // AND THE SANDBOX LOADS WHAT THE DOCUMENT LOADS. seated-member.js goes on only
  // because voice.html's own <script> list says so (`srcs`, read in section 1),
  // so taking the tag off the document fails the cards below and not merely the
  // rule that reads the markup. `seated:false` is the deliberate removal.
  const onDoc = srcs.indexOf("/seated-member.js") !== -1;
  if (o.seated !== false && onDoc) vm.runInContext(SM, ctx, { filename: "seated-member.js" });
  vm.runInContext(RESOLVER, ctx, { filename: "voter-hub-location.js[pdxRepsForMe]" });
  vm.runInContext(RET_SRC, ctx, { filename: "voter-hub-location.js#PDXReturn" });
  // RULE 2's OTHER HALF, AND IT IS THE REASON THE FILL IS IN seatsForMe() RATHER
  // THAN ONLY IN THE RESOLVER. district-voice.js is a PRECACHED shell asset and
  // voter-hub-location.js is RUNTIME-cached and unversioned, so a warm device can
  // pair this pass's hallway with a resolver copy that predates the lane asking
  // pdxSeatedMemberFor(). `stale:true` is that pairing: the real walk, with every
  // district-level pid stripped, which is exactly what the older copy returned.
  if (o.stale) {
    const real = win.pdxRepsForMe;
    win.pdxRepsForMe = function () {
      const r = real();
      if (!r || !r.levels) return r;
      r.levels = r.levels.map((l) => (l && !l.statewide ? Object.assign({}, l, { pid: null, resolved: false }) : l));
      return r;
    };
  }
  vm.runInContext(DV, ctx, { filename: "district-voice.js" });
  vm.runInContext(VR, ctx, { filename: "voice-room.js" });
  return { win, paint: () => win.PDXVoiceRoom.paint(), list: () => els["pdx-voice-seats"].innerHTML };
}

const lvl = (reps, k) => (reps.levels || []).filter((l) => l.key === k)[0] || null;
const seatOf = (win, k) => (win.PDXVoice.seatsForMe() || []).filter((s) => s.key === k)[0] || null;
// ONE CARD, NOT THE LIST. Both U.S. Senate rows and the Governor row resolve
// nobody on a lean document with no statewide roster and they print the empty
// sentence, because that is the truth about them — so each rule below reads one
// <li> and only that one.
const cardFor = (html, label, n) => {
  for (const part of String(html).split('<li class="pdxvr-seat"')) {
    if (part.indexOf("pdxvr-chamber") !== -1 &&
        part.indexOf(label + " District " + n) !== -1) return part;
  }
  return "";
};
const LABEL = { house: "U.S. House", statesenate: "State Senate", statehouse: "State House" };

// ── RULE 3: THE HALLWAY, WARM, FOR REAL ───────────────────────────────────────
{
  const v = voiceCtx(LAYTON);
  const reps = v.win.pdxRepsForMe();
  v.paint();
  const html = v.list();
  eq(v.win.PDXVoiceRoom.standing(), "placed",
    "Layton: the hallway did not reach the 'placed' standing, so there are no seat cards to read");

  for (const key of Object.keys(LAYTON.cards)) {
    const [n, pid, name, alias] = LAYTON.cards[key];
    const l = lvl(reps, key);
    must(!!l, `Layton: the resolver published no ${key} level at all`);
    eq(l.district, n,
      `Layton: the resolver did not resolve ${key} to district ${n} — the fixture no longer describes the\n` +
      "    reported reader");
    const s = seatOf(v.win, key);
    must(!!s, `Layton: seatsForMe() dropped the ${key} seat`);
    eq(s.pid, pid, `Layton: seatsForMe() did not seat ${pid} in ${key} district ${n}`);
    eq(s.board, `/district/${alias}`,
      `Layton: the ${key} card's door is not /district/${alias} — the address is the allow-list's`);

    const card = cardFor(html, LABEL[key], n);
    must(!!card, `Layton: the hallway painted no ${LABEL[key]} District ${n} card at all`);
    has(card, `Sitting member: <a class="pdxvr-name" href="/p/${pid}">${name}</a>`,
      `Layton: the ${LABEL[key]} District ${n} card does not print "Sitting member: ${name}" linked to\n` +
      `    /p/${pid} — which is the whole of this pass`);
    has(card, ">Open board</a>",
      `Layton: the ${LABEL[key]} District ${n} card lost its Open board door`);
    has(card, `href="/district/${alias}"`,
      `Layton: the ${LABEL[key]} District ${n} card's door does not point at /district/${alias}`);
    no(card, "No sitting member on hand for this seat",
      `Layton: the ${LABEL[key]} District ${n} card still reports a vacancy on a seat the joins answer for`);
    no(card, "The member who holds this seat is on file",
      `Layton: the ${LABEL[key]} District ${n} card describes a member it could name`);
    no(card, "room not open",
      `Layton: the ${LABEL[key]} District ${n} card says the room is not open on a seat in BOARD_ROUTES`);
  }

  // THREE CARDS, AND THEY ARE THE THREE DISTRICT SEATS. The statewide rows are
  // still there, still name nobody on a lean page, and still carry no door.
  eq((html.match(/Sitting member: <a class="pdxvr-name"/g) || []).length, 3,
    "Layton: the hallway named a number of members other than three — the two U.S. Senate rows and the\n" +
    "    Governor resolve nobody on a document with no statewide roster, and must not start being invented");
  eq((html.match(/>Open board<\/a>/g) || []).length, 3,
    "Layton: the hallway printed a number of Open board doors other than three — the allow-list holds\n" +
    "    exactly these three of this reader's seats");
  eq((html.match(/<li class="pdxvr-seat"/g) || []).length, 6,
    "Layton: the hallway did not print six seat cards — a reader has every seat their location names");
}

// ── RULE 2's PAIRING: A STALE RESOLVER, A FRESH HALLWAY ───────────────────────
{
  const v = voiceCtx(LAYTON, { stale: true });
  v.paint();
  const html = v.list();
  for (const key of Object.keys(LAYTON.cards)) {
    const [n, pid, name] = LAYTON.cards[key];
    eq(seatOf(v.win, key).pid, pid,
      `stale resolver: seatsForMe() did not fill the ${key} pid itself. district-voice.js is precached and\n` +
      "    voter-hub-location.js is runtime-cached, so a warm device can pair this hallway with a resolver\n" +
      "    that never asks these joins — and the fill in seatsForMe() is what covers that");
    has(cardFor(html, LABEL[key], n), `Sitting member: <a class="pdxvr-name" href="/p/${pid}">${name}</a>`,
      `stale resolver: the ${LABEL[key]} District ${n} card does not name ${name}`);
  }
}

// ── RULE 4: AND THE JOIN IS WHAT DOES IT ──────────────────────────────────────
section("4 · with the join off the page, the empty sentence comes back");
{
  const bare = voiceCtx(LAYTON, { seated: false });
  bare.paint();
  const html = bare.list();
  // The two legislative seats are the ones seated-member.js answers. Both lose
  // their member and both keep their door, which is the reported defect exactly.
  for (const key of ["statesenate", "statehouse"]) {
    const [n, , name, alias] = LAYTON.cards[key];
    eq(seatOf(bare.win, key).pid, "",
      `join off: the ${key} pid survives with seated-member.js off the page, so section 3 is passing for\n` +
      "    some reason other than the join and would keep passing if the join were removed");
    const card = cardFor(html, LABEL[key], n);
    must(!!card, `join off: no ${LABEL[key]} District ${n} card was painted`);
    has(card, "No sitting member on hand for this seat",
      `join off: the ${LABEL[key]} District ${n} card does not fall back to the empty sentence, which means\n` +
      "    the sentence is now unreachable and the copy is dead");
    no(card, name, `join off: the card names ${name} with nothing on the page that could know it`);
    no(card, "yet", `join off: the ${LABEL[key]} card promises a member is coming`);
    // THE DOOR IS UNCHANGED BY ANY OF THIS. The board is the allow-list's answer
    // and it never depended on a member resolving.
    has(card, `href="/district/${alias}"`,
      `join off: the ${LABEL[key]} District ${n} card lost its door because the member did not resolve —\n` +
      "    the board is a fact about the seat, not about its holder");
  }
  // AND THE CONGRESSIONAL CARD IS UNTOUCHED BY THAT REMOVAL, because it is
  // answered by a different join that lives in a different file.
  has(cardFor(html, "U.S. House", "2"), 'Sitting member: <a class="pdxvr-name" href="/p/maloy">Celeste Maloy</a>',
    "join off: the U.S. House card lost its member when seated-member.js came off the page — that lane is\n" +
    "    _pdxUsHouseSeat's and must not depend on the legislative table");
}

// ── THE STATE STRING IS THE ROSTER'S, NOT THE POSTAL CODE ─────────────────────
{
  // 'UT' reduces to "ut" through _pdxStateName and matches no roster record ever
  // written, so a caller passing the postal code gets a blank and the card reads
  // as a vacancy. This is the shape of that mistake, asserted directly against
  // the join so the rule is pinned wherever the call site moves to.
  const v = voiceCtx(LAYTON);
  eq(v.win._pdxUsHouseSeat("Utah", "2"), "maloy",
    "join: _pdxUsHouseSeat cannot name UT-2 from the roster's own state string");
  eq(v.win._pdxUsHouseSeat("UT", "2"), null,
    "join: _pdxUsHouseSeat answered for the postal code — if that ever starts working, the reason the\n" +
    "    hallway must pass reps.state has quietly stopped being true and this suite should say so");
  has(DV_CODE, "window._pdxUsHouseSeat(stateName, n)",
    "hallway: the congressional lane does not pass a state through — see above on why the postal code is\n" +
    "    not an argument this join accepts");
  has(DV_CODE, "joinedPid(lv, seatKey, reps.state)",
    "hallway: the congressional lane is not handed reps.state, which is the roster's own state string");
}

// ═════════════════════════════════════════════════════════════════════════════
// 5 · STATE GATING: A MISSOURI READER GETS A NAMED CD AND NO LEGISLATURE
// ═════════════════════════════════════════════════════════════════════════════
section("5 · Missouri's congressional seat is named; its legislature is not");
{
  const v = voiceCtx(KC);
  v.paint();
  const html = v.list();

  // THE CD IS NAMED, because congressional districts are ONE federal map and the
  // roster records which district a member holds.
  const cd = seatOf(v.win, "house");
  must(!!cd, "Missouri: seatsForMe() dropped the U.S. House seat for a reader who pinned one");
  eq(cd.district, "5", "Missouri: the resolver did not carry the reader's own pinned CD-5");
  eq(cd.pid, "mo_rep5",
    "Missouri: the U.S. House card names nobody though the roster holds a record that says it holds MO-5 —\n" +
    "    the congressional join is not Utah-only and must not become so");
  eq(cd.board, "",
    "Missouri: a Missouri CD was given a board — BOARD_ROUTES holds four named Utah rows and nothing\n" +
    "    computes a fifth");
  const cdCard = cardFor(html, "U.S. House", "5");
  must(!!cdCard, "Missouri: no U.S. House District 5 card was painted");
  has(cdCard, 'Sitting member: <a class="pdxvr-name" href="/p/mo_rep5">Emanuel Cleaver</a>',
    "Missouri: the U.S. House card does not name the member the roster holds for MO-5");
  no(cdCard, ">Open board</a>",
    "Missouri: the U.S. House card offers a board — there is no board for MO-5 and no room to walk into");

  // AND THE LEGISLATURE IS NOT, which is the half that matters. That table is
  // keyed on a district NUMBER inside a chamber with no state of its own: asked
  // bare for "State House 16" it answers Trevor Lee, who represents Layton, Utah.
  for (const key of ["statesenate", "statehouse"]) {
    const s = seatOf(v.win, key);
    if (s) {
      eq(s.pid, "",
        `Missouri: the ${key} card named somebody. seated-member.js is keyed on a district NUMBER with no\n` +
        "    state in it, so an ungated lookup hands a Kansas City reader a Utah legislator");
      eq(s.seatKey, "",
        `Missouri: a ${key} seat key was composed for a state this app does not draw legislative lines for`);
      eq(s.board, "", `Missouri: the ${key} card was given a board`);
    } else { passed++; }
  }
  no(html, "Trevor Lee",
    "Missouri: Trevor Lee — Utah House District 16 — appears on a Kansas City reader's hallway. That is\n" +
    "    the ungated-table defect, and it is the worst kind of wrong: confident, plausible and somebody\n" +
    "    else's member");
  no(html, "Stuart Adams",
    "Missouri: Stuart Adams — Utah Senate District 7 — appears on a Kansas City reader's hallway");
  eq((html.match(/>Open board<\/a>/g) || []).length, 0,
    "Missouri: a door opened on a hallway where no seat is in the allow-list");
  has(html, "No sitting member on hand for this seat",
    "Missouri: nothing on the hallway prints the empty sentence, so the legislative cards are claiming\n" +
    "    something about seats this app cannot resolve");
}

// ═════════════════════════════════════════════════════════════════════════════
// 6 · A REAL EMPTY FILE STILL GETS THE EMPTY SENTENCE
// ═════════════════════════════════════════════════════════════════════════════
section("6 · a seat the roster holds nobody for stays empty, and says so plainly");
{
  // THE JOINS ANSWER WITH A PID; THE ROSTER IS WHAT NAMES ONE. So the hallway has
  // three sentences, not two, and this section pins which case gets which — the
  // whole point being that a name never appears without a record behind it and
  // the empty sentence never appears when one is there.
  //
  //   · a pid, and a record that names them  → "Sitting member: <a>Name</a>"
  //   · a pid, and no record to name them    → "The member who holds this seat is
  //                                             on file." plus a working door to
  //                                             that person's own file
  //   · no pid at all                        → "No sitting member on hand for
  //                                             this seat."
  //
  // The middle one is the printer's, deliberate and older than this pass (its own
  // comment: a pid with no display record "does not get a sentence reading as
  // nobody, and it does not get a raw id printed as if it were somebody's name").
  // What this pass had to not do is turn the third sentence into a dead branch.
  const cold = voiceCtx(LAYTON, { live: {} });
  cold.paint();
  const ch = cold.list();
  no(ch, "Trevor Lee", "cold index: a name appeared from a people index that holds nobody");
  no(ch, "Celeste Maloy", "cold index: a name appeared from a people index that holds nobody");
  eq((ch.match(/Sitting member: <a class="pdxvr-name"/g) || []).length, 0,
    "cold index: a card printed a sitting member's name with no record on the page to read it from");
  // AND A COLD INDEX IS NOT A VACANCY. An empty roster is a page mid-load — the
  // gate says so in those words — so the two legislative pids stand and the
  // reader gets a working door to each person's file instead of a false vacancy.
  has(cardFor(ch, "State House", "16"),
    'The member who holds this seat is on file. <a class="pdxvr-name" href="/p/tlee">Open the person file</a>',
    "cold index: HD-16's card reads as a vacancy while the people index is still empty. An index with no\n" +
    "    rows is a page mid-load, not a seat whose member resigned, and the pid resolved fine");
  // …AND THE CONGRESSIONAL CARD IS THE REAL EMPTY FILE. _pdxUsHouseSeat reads the
  // ROSTER — it holds no congressional pid of its own, by design, because a
  // written-down one outlives a court-ordered map — so with no rows there is
  // genuinely nobody to seat, and the third sentence is the true one.
  has(cardFor(ch, "U.S. House", "2"), "No sitting member on hand for this seat",
    "cold index: the U.S. House card claims a member on a page whose only people index is empty. That\n" +
    "    join is the roster's, so with no roster there is nobody to name and the empty sentence is the\n" +
    "    honest answer");
  eq((ch.match(/>Open board<\/a>/g) || []).length, 3,
    "cold index: the three doors closed because nobody could be named — a board is a fact about the seat,\n" +
    "    not about its holder");
  no(ch, "yet", "cold index: a card promises a member is coming");

  // ONE SEAT NAMED, ITS NEIGHBOURS NOT. The live index holds Trevor Lee's row and
  // nobody else's: HD-16 prints the name, SD-7 falls to the middle sentence, and
  // CD-2 falls to the empty one. A loaded name in one card fills no other card.
  const partial = voiceCtx(LAYTON, { live: { tlee: PEOPLE.tlee } });
  partial.paint();
  const ph = partial.list();
  has(cardFor(ph, "State House", "16"), 'Sitting member: <a class="pdxvr-name" href="/p/tlee">Trevor Lee</a>',
    "partial index: the one seat the index can name lost its name because its neighbours could not be named");
  has(cardFor(ph, "State Senate", "7"),
    'The member who holds this seat is on file. <a class="pdxvr-name" href="/p/sadams">Open the person file</a>',
    "partial index: SD-7's card does not fall to the on-file sentence. Its pid resolved and the index holds\n" +
    "    no row to name them — that is neither a name nor a vacancy, and the printer has a third sentence\n" +
    "    for exactly it");
  has(cardFor(ph, "U.S. House", "2"), "No sitting member on hand for this seat",
    "partial index: the U.S. House card claims a member the roster holds no record for");
  eq((ph.match(/Sitting member: <a class="pdxvr-name"/g) || []).length, 1,
    "partial index: a card other than HD-16 named somebody, on an index holding exactly one row");
  no(ph, "yet", "partial index: an empty card promises a member is coming");
}

// ═════════════════════════════════════════════════════════════════════════════
// 7 · NOTHING ELSE MOVED
// ═════════════════════════════════════════════════════════════════════════════
section("7 · four named board rows, an untouched owner, and no new surface");

// BOARD_ROUTES IS FOUR NAMED ROWS AND NOT A PATTERN. The way a naming pass would
// quietly open a room is by widening the board table instead of adding to it.
const BR = (/var BOARD_ROUTES = \{([\s\S]*?)\n  \};/.exec(DV) || [, ""])[1];
must(!!BR, "district-voice.js no longer declares BOARD_ROUTES as one literal");
const brRows = [...BR.matchAll(/'([a-z0-9-]+)':\s*'(\/district\/[a-z0-9-]+)'/g)];
eq(brRows.length, 4,
  "boards: BOARD_ROUTES no longer holds exactly four rows. This pass names a member; it does not open or\n" +
  "    close a room, and a fifth board is a separate decision with a document behind it");
eq(brRows.length, (BR.match(/:\s*'\//g) || []).length,
  "boards: a BOARD_ROUTES row is not a literal seat key mapped to a literal address");
[["ut-statesenate-3", "/district/ut-sd-3"], ["ut-statehouse-16", "/district/ut-hd-16"],
  ["ut-statesenate-7", "/district/ut-sd-7"], ["ut-house-2", "/district/ut-cd-2"]]
  .forEach(([k, route]) => ok(brRows.some(([, a, b]) => a === k && b === route),
    `boards: ${k} → ${route} left the table`));
ok(!/\[|RegExp|\+|`/.test(BR), "boards: a BOARD_ROUTES row is computed rather than written down");
ok(!/\/district\/\*/.test(DV), "scope: district-voice.js splatted /district/*");
ok(!/\/district\/\*/.test(SM), "scope: seated-member.js splatted /district/*");
eq((DV_CODE.match(/BOARD_ROUTES = /g) || []).length, 1,
  "hallway: district-voice.js declares BOARD_ROUTES more than once");

// NO COMPOSER, NO SCORE, NO EQUITY, ANYWHERE THIS PASS TOUCHED.
[["seated-member.js", SM_CODE], ["voice-room.js", VR_CODE]].forEach(([f, src]) => {
  ["equity", "score", "composer", "textarea"].forEach((s) =>
    no(src.toLowerCase(), s, `scope: ${f} grew ${s} copy or machinery in a pass about naming a member`));
});
no(code(VOICE_HTML).toLowerCase(), "equity", "scope: voice.html grew equity copy");

// THE OWNER IS UNTOUCHED. seated-member.js is a copy; ballot-breakdown.js is
// where an entry is added, and this pass had no business inside it.
const HEAD = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 }); }
  catch (e) { return null; }
};
[["ballot-breakdown.js", "the tables' owner — entries are added there and re-derived here"],
  ["district-board.js", "the board engine, which resolves its own seat and is not on this path"],
  ["profile-alias.js", "the previous pass's lifting, which this one only sits beside"],
  ["voice-room.js", "the printer — this pass moved the fill into the seat list's owner instead"],
  ["who-represents-me.js", "the front-page band, which already named these members"]].forEach(([f, why]) => {
    const h = HEAD(f);
    if (h == null) { passed++; return; }
    eq(deOrigin(R(f)), deOrigin(h), `untouched: ${f} changed in this pass and it should not have — ${why}`);
  });

// AND THE FOUR BOARD DOCUMENTS EACH STILL DECLARE THEIR OWN SEAT, so nothing
// here can make a sibling document paint the first board's member.
for (const [, , route] of brRows) {
  const alias = String(route).split("/").pop();
  const doc = R(`district-${alias}.html`);
  has(doc, `window.__PDX_DISTRICT_BOARD_SEAT = '${alias}';`,
    `doc: district-${alias}.html does not declare its own seat in the head`);
  ok(!new RegExp(`<script[^>]*src="/seated-member\\.js"`).test(doc),
    `doc: district-${alias}.html loads seated-member.js — a board names its holder from its own row or\n` +
    "    through _pdxUsHouseSeat, and it already carries cmp-data.js");
}

report();
process.exit(fails.length ? 1 : 0);
