#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-voice-cd2-roster-arrival.mjs — /voice names UT-2's member once the roster lands
// ─────────────────────────────────────────────────────────────────────────────
// THE LIVE DEFECT THIS PINS. Smoke, private window, Layton/Clearfield: Who
// Represents Me named Celeste Maloy on U.S. House District 2, /district/ut-cd-2
// named her, and /voice printed "No sitting member on hand for this seat" above
// the Open board door. An alias row did not change it, because the alias was
// never the read that failed.
//
// THE READ THE CARD ACTUALLY USES. The congressional card's pid comes from
// window._pdxUsHouseSeat(state, 2): directly (district-voice.js seatPidFor →
// joinedPid) and through the resolver (pdxRepsForMe's `hp`). Both are a walk
// OVER the roster. The board and the front page walk the bundled roster, which
// is on the page before anything paints. /voice has only the LIVE index: paged,
// behind Firebase, and in a cold private window slower than the hallway's whole
// bounded paint schedule. A private window also has no memo. So every paint
// /voice took ran against an empty or partial roster, the walk answered nobody,
// and nothing asked again once the roster arrived. The legislative cards were
// spared because they read seated-member.js's district table, which is on the
// page from the start.
//
// THE FIX. voice-room.js takes the subscription /me's desk already takes,
// the resolver's own pdxRosterReady(), and paints on a short bounded tail after
// it until the loader reports done. And the congressional walk publishes the
// CANONICAL pid, so the card links /p/maloy whichever key the live document is
// filed under.
//
// WHAT THIS SUITE PROVES, against the real resolver slice, district-voice.js and
// voice-room.js on a fake clock:
//   1. Private window, no memo, roster arrives in two pages after the schedule
//      ends: the CD-2 card reads "Sitting member: Celeste Maloy" at /p/maloy,
//      above Open board to /district/ut-cd-2. Same result when the live document
//      is filed under the display-name slug.
//   2. MUTATION: without the subscription the card stays on the empty sentence.
//      A printer that prints the empty sentence while the named row exists fails.
//   3. No named row (a thin row only): the on-file sentence stays, with a working
//      person-file link, no name and no "yet".
//   4. HD-16 still names Trevor Lee and HD-15 still names Ariel Defay.
//   5. BOARD_ROUTES is still 88, and voice.html still loads no bundled roster.
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
const must = (c, m) => { if (!c) { console.error(`✗ voice CD-2 roster arrival: STALE HARNESS — ${m}`); process.exit(1); } };

const LOC = R("voter-hub-location.js");
const DV = R("district-voice.js");
const VR = R("voice-room.js");
const PA = R("profile-alias.js");
const SM = R("seated-member.js");

const swFrom = LOC.indexOf("var _pdxStatewideCache = {};");
const resTo = LOC.indexOf("window._vhSyncDistrictStrip = function()", swFrom);
must(swFrom !== -1 && resTo > swFrom, "voter-hub-location.js: the resolver slice is gone");
const RESOLVER = LOC.slice(swFrom, resTo);
must(RESOLVER.indexOf("window.pdxRosterReady = function") > 0, "the resolver slice no longer publishes pdxRosterReady");
must(RESOLVER.indexOf("window._pdxUsHouseSeat = function") > 0, "the resolver slice no longer publishes _pdxUsHouseSeat");
const RET_SRC = (() => {
  const at = LOC.indexOf("window.PDXReturn = (function () {");
  must(at > 0, "voter-hub-location.js no longer declares window.PDXReturn");
  const end = LOC.indexOf("\n  })();", at);
  return LOC.slice(at, end + "\n  })();".length);
})();

const LAYTON = { state: "Utah", city: "Layton", county: "Davis County", district: "2",
  stateSenateDistrict: "7", stateHouseDistrict: "16" };
const CLEARFIELD = { state: "Utah", city: "Clearfield", county: "Davis County", district: "2",
  stateSenateDistrict: "7", stateHouseDistrict: "16" };
const LAYTON_15 = { ...LAYTON, stateHouseDistrict: "15" };

// The live index's shape: `state: "Utah"` and the district in its own field.
const MALOY = { name: "Celeste Maloy", office: "U.S. Representative", state: "Utah", district: "2", party: "R", __lite: true };
const PAGE_1 = {
  sadams: { name: "Stuart Adams", office: "Utah Senate President", state: "UT District 7", party: "R", __lite: true },
  bmoore: { name: "Blake Moore", office: "U.S. Representative", state: "Utah", district: "1", party: "R", __lite: true },
  kennedy: { name: "Mike Kennedy", office: "U.S. Representative", state: "Utah", district: "3", party: "R", __lite: true },
};
const PAGE_2 = (maloyKey, maloyRec) => ({
  [maloyKey]: maloyRec,
  trevor_lee: { name: "Trevor Lee", office: "UT State Representative", state: "UT District 16", party: "R", __lite: true },
  ariel_defay: { name: "Ariel Defay", office: "Utah State Representative", state: "UT District 15", party: "R", __lite: true },
  owens: { name: "Burgess Owens", office: "U.S. Representative", state: "Utah", district: "4", party: "R", __lite: true },
});

// One /voice document on a fake clock. Script order is voice.html's.
function voicePage(loc, opts) {
  const o = opts || {};
  const win = makeSandbox();
  let now = 1000000;
  const timers = [];
  win.Date = { now: () => now };
  win.setTimeout = (fnc, ms) => { timers.push({ at: now + (Number(ms) || 0), fnc }); return timers.length; };
  const advance = (ms) => {
    const until = now + ms;
    for (;;) {
      timers.sort((a, b) => a.at - b.at);
      const t = timers[0];
      if (!t || t.at > until) break;
      timers.shift();
      now = t.at;
      try { t.fnc(); } catch (e) { failures.push(`timer threw: ${e && e.message}`); }
    }
    now = until;
  };
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
  // A PRIVATE WINDOW: the saved location, and no memo of resolved seats.
  win._currentVoterLocation = JSON.parse(JSON.stringify(loc));
  win.PROFILES = {};
  win._pdxRosterState = "loading";
  const ctx = vm.createContext(win);
  vm.runInContext(PA, ctx, { filename: "profile-alias.js" });
  vm.runInContext(SM, ctx, { filename: "seated-member.js" });
  vm.runInContext(o.resolver || RESOLVER, ctx, { filename: "voter-hub-location.js[pdxRepsForMe]" });
  vm.runInContext(RET_SRC, ctx, { filename: "voter-hub-location.js#PDXReturn" });
  vm.runInContext(DV, ctx, { filename: "district-voice.js" });
  vm.runInContext(o.vr || VR, ctx, { filename: "voice-room.js" });
  // The live index arrives in two pages, both AFTER the hallway's own schedule
  // has run out (its last tick is at GRACE_MS + 120).
  const grace = win.PDXVoiceRoom.GRACE_MS;
  const p2 = o.page2 || PAGE_2("maloy", MALOY);
  timers.push({ at: now + grace + 2000, fnc: () => { Object.assign(win.PROFILES, PAGE_1); } });
  timers.push({ at: now + grace + 3500, fnc: () => { Object.assign(win.PROFILES, p2); win._pdxRosterState = "done"; } });
  return { win, advance, list: () => els["pdx-voice-seats"].innerHTML, grace };
}

const cardFor = (html, label) => String(html).split('<li class="pdxvr-seat"')
  .filter((p) => p.indexOf(label) !== -1)[0] || "";
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
  if (card.indexOf("/p/celeste_maloy") >= 0) f.push("the card advertises the display-name slug");
  if (!/<a class="pdxvr-door" href="\/district\/ut-cd-2">Open board<\/a>/.test(card)) f.push("Open board does not go to /district/ut-cd-2");
  const who = card.indexOf('class="pdxvr-who"'), door = card.indexOf('class="pdxvr-door"');
  if (!(who >= 0 && door > who)) f.push("the member line is not above the Open board door");
  return f;
};
const settle = (pg) => pg.advance(pg.grace + 60000);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · private window: the roster lands late, and the CD-2 card names Maloy");
// ═════════════════════════════════════════════════════════════════════════════
for (const [who, loc] of [["Layton", LAYTON], ["Clearfield", CLEARFIELD]]) {
  const pg = voicePage(loc);
  pg.advance(pg.grace + 500);
  // THE REPORTED STATE, reproduced: the whole schedule ran before the roster.
  has(cardFor(pg.list(), "U.S. House District 2"), EMPTY, `${who}: before the roster, the card is the reported empty sentence`);
  settle(pg);
  eq(JSON.stringify(cd2Faults(pg.list())), "[]", `${who}: after the roster lands, the CD-2 card names Celeste Maloy`);
  eq(pg.win.PDXVoice.boardPath("ut-house-2"), "/district/ut-cd-2", `${who}: CD-2's board is still on the allow-list`);
}
{
  // The live document filed under the slug of her display name: the walk
  // publishes the canonical pid, so the link is still the board's /p/maloy.
  const pg = voicePage(LAYTON, { page2: PAGE_2("celeste_maloy", MALOY) });
  settle(pg);
  eq(JSON.stringify(cd2Faults(pg.list())), "[]", "slug-filed live document: the card names Celeste Maloy at /p/maloy");
  eq(pg.win._pdxUsHouseSeat("Utah", "2"), "maloy", "slug-filed live document: the congressional walk answers the canonical pid");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · mutations: no subscription, or an empty printer, fails");
// ═════════════════════════════════════════════════════════════════════════════
{
  const mutVR = VR.replace("try { window.pdxRosterReady(afterRoster); } catch (e) { _rosterHooked = false; }", "");
  must(mutVR !== VR, "the subscription mutation found nothing to replace");
  const pg = voicePage(LAYTON, { vr: mutVR });
  settle(pg);
  ok(cd2Faults(pg.list()).length > 0, "a hallway that never hears the roster land still named Maloy — the subscription is not what fixes it");
  has(cardFor(pg.list(), "U.S. House District 2"), EMPTY, "…and that hallway shows the reported empty sentence");
}
{
  const mutVR = VR.replace("var href = pid ? personHref(pid) : '';", "var href = '';");
  must(mutVR !== VR, "the empty-sentence mutation found nothing to replace");
  const pg = voicePage(LAYTON, { vr: mutVR });
  settle(pg);
  ok(cd2Faults(pg.list()).length > 0, "a card printing the empty sentence while the named row exists passed the CD-2 checks");
}

{
  // MUTATION: the walk publishing whichever key the live row was filed under
  // advertises the slug, not the board's address.
  const mutRes = RESOLVER.replace("idx[key] = _pdxCanonPid(pid);", "idx[key] = pid;");
  must(mutRes !== RESOLVER, "the canonical-pid mutation found nothing to replace");
  const pg = voicePage(LAYTON, { resolver: mutRes, page2: PAGE_2("celeste_maloy", MALOY) });
  settle(pg);
  ok(cd2Faults(pg.list()).length > 0, "a walk that publishes the slug still linked /p/maloy — the canonical pid is not what does it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · no named row: the on-file sentence stays, and never says yet");
// ═════════════════════════════════════════════════════════════════════════════
{
  const THIN = { office: "U.S. Representative", state: "Utah", district: "2", __lite: true };
  const pg = voicePage(LAYTON, { page2: PAGE_2("maloy", THIN) });
  settle(pg);
  const card = cardFor(pg.list(), "U.S. House District 2");
  has(card, ON_FILE, "thin row: the card falls back to the on-file sentence");
  has(card, '<a class="pdxvr-name" href="/p/maloy">Open the person file</a>', "thin row: …with a working person-file link");
  no(card, "Celeste Maloy", "thin row: a name was printed from a row that carries none");
  no(card.toLowerCase(), "yet", "thin row: the card says \"yet\"");
  has(card, 'href="/district/ut-cd-2"', "thin row: Open board left the card");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · HD-16 still names Trevor Lee, HD-15 still names Ariel Defay");
// ═════════════════════════════════════════════════════════════════════════════
{
  const pg = voicePage(LAYTON);
  settle(pg);
  has(cardFor(pg.list(), "State House District 16"),
    'Sitting member: <a class="pdxvr-name" href="/p/tlee">Trevor Lee</a>', "HD-16 names Trevor Lee");
  const pg15 = voicePage(LAYTON_15);
  settle(pg15);
  has(cardFor(pg15.list(), "State House District 15"),
    'Sitting member: <a class="pdxvr-name" href="/p/defay_h15">Ariel Defay</a>', "HD-15 names Ariel Defay");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · nothing else moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = makeSandbox();
  vm.runInContext(DV, vm.createContext(w), { filename: "district-voice.js" });
  eq(Object.keys(w.PDXVoice.BOARD_ROUTES).length, 88, "BOARD_ROUTES length");
  const VOICE = R("voice.html");
  for (const f of ["/cmp-data.js", "/ballot-breakdown.js", "/profile-evidence.js", "/compare-hub.js"]) {
    no(VOICE, `src="${f}"`, `voice.html loads ${f}`);
  }
  // The subscription is the resolver's, the same one /me takes — not a poll.
  has(VR, "window.pdxRosterReady(afterRoster)", "voice-room.js subscribes to the resolver's roster announcement");
  has(R("me-desk.js"), "window.pdxRosterReady(renderSoon)", "…the same subscription /me's desk takes");
  no(VR, "setInterval", "voice-room.js polls");
}

if (failures.length) {
  console.log(`\n   ${passed} passed, ${failures.length} failed\n`);
  for (const f of failures) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`\n   ✓ voice CD-2 roster arrival: all ${passed} assertions passed`);
