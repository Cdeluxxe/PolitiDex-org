#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-voice-cd2-live-district.mjs — the congressional walk reads the live index's district
// ─────────────────────────────────────────────────────────────────────────────
// THE LIVE DEFECT THIS PINS. Smoke on a preview, roster on the page: /voice named
// Lee, Cox, Stevenson and Lisonbee, and the U.S. House District 2 card printed
// "No sitting member on hand for this seat" above Open board to /district/ut-cd-2,
// whose board names Celeste Maloy.
//
// THE READ. That card's pid is window._pdxUsHouseSeat('Utah', 2), a walk over the
// roster this document has. The board walks the BUNDLE, where maloy reads
// "Utah · District 2". /voice walks the LIVE index, where the same record is
//
//     maloy  state: "Utah"  district: "District 2 (Southwestern Utah & part of Salt Lake County)"
//
// and _pdxCdOfRosterDistrict() anchored "District N" to the end of the string,
// so the trailing description placed her in no district at all. Burgess Owens
// (UT-4) is written the same way and was dropped the same way. Not a timing
// problem and not an alias problem: there is no celeste_maloy document.
//
// The fixture below is a snapshot of the live documents themselves (name,
// office, state, district, termEnd), not a hand-written stand-in — the earlier
// suites passed against a district of "2" that the live index never writes.
//
// WHAT THIS SUITE PROVES
//   1. Clearfield (the smoke's reader: CD-2, SD-6, HD-14) and Layton: the CD-2
//      card reads "Sitting member: Celeste Maloy" at /p/maloy above Open board
//      to /district/ut-cd-2, with the roster on the page from the first paint.
//      The walk answers maloy on the live index and on the bundle alike.
//   2. Nobody else moved: UT-1 and UT-3 answer as before, UT-4 answers owens,
//      and the former member and former candidate written into UT-2 stay out.
//   3. MUTATION: the old anchored parser fails the card checks; a printer that
//      prints the empty sentence while the named row exists fails them too.
//   4. No named row: the on-file sentence stays, never "yet".
//   5. HD-16 names Trevor Lee, HD-15 names Ariel Defay, Clearfield's SD-6 and
//      HD-14 name Stevenson and Lisonbee. BOARD_ROUTES is 88.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${n}" missing`);
const no = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — "${n}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (!c) { console.error(`✗ voice CD-2 live district: STALE HARNESS — ${m}`); process.exit(1); } };

// Snapshot of the live Firestore documents (lightweight-index fields).
const LIVE = {
    "maloy": {
      "district": "District 2 (Southwestern Utah & part of Salt Lake County)",
      "state": "Utah",
      "name": "Celeste Maloy",
      "office": "🏛 U.S. Representative"
    },
    "owens": {
      "office": "🏛 U.S. Representative",
      "state": "Utah",
      "district": "District 4 (Salt Lake, Utah, Juab & Sanpete Counties)",
      "name": "Burgess Owens"
    },
    "bmoore": {
      "name": "Blake Moore",
      "district": "Utah's 1st Congressional District",
      "office": "🏛 U.S. Representative",
      "state": "Utah · UT-1"
    },
    "kennedy": {
      "name": "Mike Kennedy",
      "district": "Utah's 3rd Congressional District (UT-03)",
      "office": "🏛 U.S. Representative",
      "state": "Utah · UT-03 (Utah County/Provo)"
    },
    "cstewart": {
      "office": "🏛 Former U.S. Representative",
      "state": "Utah",
      "name": "Chris Stewart",
      "termEnd": "2023-09",
      "district": "Utah's 2nd Congressional District (2013–2023)"
    },
    "kreese": {
      "office": "🏛 Former Congressional Candidate (UT-02)",
      "state": "Utah",
      "name": "Kael Weston",
      "district": "District 2"
    },
    "tlee": {
      "name": "Trevor Lee",
      "office": "🏛 Utah State Representative - District 16",
      "district": "District 16",
      "state": "Utah · District 16 (Layton)"
    },
    "ariel_defay": {
      "state": "Utah",
      "name": "Ariel Defay",
      "office": "Utah State Representative",
      "district": "15"
    },
    "jstevenson": {
      "name": "Jerry Stevenson",
      "state": "Utah · District 6 (Davis County)",
      "office": "🏛 Utah State Senator",
      "district": "District 6"
    },
    "sadams": {
      "district": "Senate District 7",
      "office": "🏛 Utah Senate President",
      "name": "Stuart Adams",
      "state": "Utah · Davis County (Layton)"
    },
    "klisonbee": {
      "state": "Utah",
      "name": "Karianne Lisonbee",
      "district": "District 14 (Clearfield & Syracuse, Davis County)",
      "office": "State Representative"
    },
    "lee": {
      "state": "Utah",
      "office": "🏛 U.S. Senator",
      "name": "Mike Lee"
    },
    "curtis": {
      "office": "🏛 U.S. Senator",
      "state": "Utah",
      "name": "John Curtis"
    },
    "cox": {
      "office": "🦅 Governor",
      "state": "Utah",
      "name": "Spencer Cox"
    }
  };

const VHL = R("voter-hub-location.js");
const OLD_PARSE = "var s = String(v == null ? '' : v).trim();\n    if (!s || /\\bsenate\\b/i.test(s)) return '';";
const NEW_PARSE = "var s = String(v == null ? '' : v).trim().replace(/\\s*\\([^()]*\\)\\s*$/, '');\n    if (!s || /\\bsenate\\b/i.test(s)) return '';";
must(VHL.indexOf(NEW_PARSE) > 0, "voter-hub-location.js no longer sets a trailing description aside in _pdxCdOfRosterDistrict");

const CLEARFIELD = { state: "Utah", city: "Clearfield", county: "Davis County", district: "2", stateSenateDistrict: "6", stateHouseDistrict: "14" };
const LAYTON = { state: "Utah", city: "Layton", county: "Davis County", district: "2", stateSenateDistrict: "7", stateHouseDistrict: "16" };
const LAYTON_15 = { ...LAYTON, stateHouseDistrict: "15" };

// One /voice document, script order voice.html's, the roster already on the page.
function voicePage(loc, o = {}) {
  const win = makeSandbox();
  let now = 1000000;
  win.Date = { now: () => now };
  const mk = (id) => ({ id, innerHTML: "", _a: {},
    setAttribute(k, v) { this._a[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._a, k) ? this._a[k] : null; } });
  const els = { "pdx-voice-standing": mk("pdx-voice-standing"), "pdx-voice-seats": mk("pdx-voice-seats") };
  win.document.getElementById = (id) => els[id] || null;
  win.__PDX_VOICE_DOC = true;
  win.location = { href: "https://politidex.fyi/voice", pathname: "/voice", search: "", hash: "", origin: "https://politidex.fyi", assign() {}, replace() {} };
  win._hasUserLocation = true;
  win.PROFILES = {};
  for (const [k, v] of Object.entries(o.live || LIVE)) win.PROFILES[k] = { ...v, __lite: true };
  win._pdxRosterState = "done";
  const ctx = vm.createContext(win);
  for (const f of ["profile-alias.js", "seated-member.js"]) vm.runInContext(R(f), ctx, { filename: f });
  vm.runInContext(o.vhl || VHL, ctx, { filename: "voter-hub-location.js" });
  // The full module resets the saved location on boot; put the reader back.
  win._hasUserLocation = true;
  win._currentVoterLocation = JSON.parse(JSON.stringify(loc));
  vm.runInContext(R("district-voice.js"), ctx, { filename: "district-voice.js" });
  vm.runInContext(o.vr || R("voice-room.js"), ctx, { filename: "voice-room.js" });
  now += 20000;
  win.PDXVoiceRoom.paint();
  return { win, list: () => els["pdx-voice-seats"].innerHTML };
}

const cardFor = (html, label) => String(html).split('<li class="pdxvr-seat"').filter((p) => p.indexOf(label) !== -1)[0] || "";
const EMPTY = "No sitting member on hand for this seat.";
const ON_FILE = "The member who holds this seat is on file";
const cd2Faults = (html) => {
  const f = [];
  const card = cardFor(html, "U.S. House District 2");
  if (!card) return ["no U.S. House District 2 card"];
  if (card.indexOf('Sitting member: <a class="pdxvr-name" href="/p/maloy">Celeste Maloy</a>') < 0)
    f.push("the card does not print Sitting member: Celeste Maloy at /p/maloy");
  if (card.indexOf(EMPTY) >= 0) f.push("the card prints the empty sentence while the named row exists");
  if (card.indexOf(ON_FILE) >= 0) f.push("the card prints the on-file sentence while the named row exists");
  if (!/<a class="pdxvr-door" href="\/district\/ut-cd-2">Open board<\/a>/.test(card)) f.push("Open board does not go to /district/ut-cd-2");
  const who = card.indexOf('class="pdxvr-who"'), door = card.indexOf('class="pdxvr-door"');
  if (!(who >= 0 && door > who)) f.push("the member line is not above the Open board door");
  return f;
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the live index names UT-2, and the card says so");
// ═════════════════════════════════════════════════════════════════════════════
for (const [who, loc] of [["Clearfield", CLEARFIELD], ["Layton", LAYTON]]) {
  const pg = voicePage(loc);
  eq(pg.win._pdxUsHouseSeat("Utah", 2), "maloy", `${who}: the congressional walk over the live index answers maloy`);
  eq(JSON.stringify(cd2Faults(pg.list())), "[]", `${who}: the CD-2 card names Celeste Maloy under the board's door`);
}
{
  // THE BOARD'S ANSWER: the same walk over the bundle the board document carries.
  const w = makeSandbox();
  w._currentVoterLocation = { state: "", city: "", county: "", district: "" };
  const ctx = vm.createContext(w);
  vm.runInContext(R("cmp-data.js"), ctx, { filename: "cmp-data.js" });
  vm.runInContext(R("profile-alias.js"), ctx, { filename: "profile-alias.js" });
  vm.runInContext(VHL, ctx, { filename: "voter-hub-location.js" });
  eq(w._pdxUsHouseSeat("Utah", 2), "maloy", "the board's walk over the bundle answers maloy — the same member");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · nobody else moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  const { win } = voicePage(CLEARFIELD);
  eq(win._pdxUsHouseSeat("Utah", 1), "bmoore", "UT-1 still answers bmoore");
  eq(win._pdxUsHouseSeat("Utah", 3), "kennedy", "UT-3 still answers kennedy");
  eq(win._pdxUsHouseSeat("Utah", 4), "owens", "UT-4 now answers owens, written the same way as maloy");
  // The former member and the former candidate whose districts name UT-2 stay out.
  const onlyFormer = { cstewart: LIVE.cstewart, kreese: LIVE.kreese, bmoore: LIVE.bmoore };
  eq(voicePage(CLEARFIELD, { live: onlyFormer }).win._pdxUsHouseSeat("Utah", 2), null,
    "a former member and a former candidate written into UT-2 are not seated");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · mutations");
// ═════════════════════════════════════════════════════════════════════════════
{
  const oldVhl = VHL.replace(NEW_PARSE, OLD_PARSE);
  must(oldVhl !== VHL, "the parser mutation found nothing to replace");
  const pg = voicePage(CLEARFIELD, { vhl: oldVhl });
  eq(pg.win._pdxUsHouseSeat("Utah", 2), null, "the old anchored parser reproduces the smoke: UT-2 answers nobody");
  has(cardFor(pg.list(), "U.S. House District 2"), EMPTY, "…and the card prints the reported empty sentence");
  ok(cd2Faults(pg.list()).length > 0, "the old parser passed the CD-2 checks");
}
{
  const VR = R("voice-room.js");
  const mutVR = VR.replace("var href = pid ? personHref(pid) : '';", "var href = '';");
  must(mutVR !== VR, "the empty-sentence mutation found nothing to replace");
  ok(cd2Faults(voicePage(CLEARFIELD, { vr: mutVR }).list()).length > 0,
    "a card printing the empty sentence while the named row exists passed the CD-2 checks");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · no named row: the on-file sentence stays, never yet");
// ═════════════════════════════════════════════════════════════════════════════
{
  const thin = JSON.parse(JSON.stringify(LIVE));
  delete thin.maloy.name;
  const card = cardFor(voicePage(CLEARFIELD, { live: thin }).list(), "U.S. House District 2");
  has(card, ON_FILE, "no named row: the card falls back to the on-file sentence");
  has(card, '<a class="pdxvr-name" href="/p/maloy">Open the person file</a>', "no named row: …with a working person-file link");
  no(card, "Celeste Maloy", "no named row: a name was printed from a row that carries none");
  no(card.toLowerCase(), "yet", "no named row: the card says yet");
  has(card, 'href="/district/ut-cd-2"', "no named row: Open board left the card");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the other cards");
// ═════════════════════════════════════════════════════════════════════════════
{
  const cf = voicePage(CLEARFIELD).list();
  has(cardFor(cf, "State Senate District 6"), ">Jerry Stevenson</a>", "Clearfield SD-6 names Jerry Stevenson");
  has(cardFor(cf, "State House District 14"), ">Karianne Lisonbee</a>", "Clearfield HD-14 names Karianne Lisonbee");
  has(cardFor(voicePage(LAYTON).list(), "State House District 16"),
    'Sitting member: <a class="pdxvr-name" href="/p/tlee">Trevor Lee</a>', "Layton HD-16 names Trevor Lee");
  has(cardFor(voicePage(LAYTON_15).list(), "State House District 15"),
    'Sitting member: <a class="pdxvr-name" href="/p/defay_h15">Ariel Defay</a>', "Layton HD-15 names Ariel Defay");
  const w = makeSandbox();
  vm.runInContext(R("district-voice.js"), vm.createContext(w), { filename: "district-voice.js" });
  eq(Object.keys(w.PDXVoice.BOARD_ROUTES).length, 88, "BOARD_ROUTES length");
}

if (failures.length) {
  console.log(`\n   ${passed} passed, ${failures.length} failed\n`);
  for (const f of failures) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`\n   ✓ voice CD-2 live district: all ${passed} assertions passed`);
