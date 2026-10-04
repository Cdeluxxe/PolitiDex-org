#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-statewide-boards.mjs — the governor and both U.S. Senate seats, as readers
// ─────────────────────────────────────────────────────────────────────────────
// A Layton reader's /voice named Spencer Cox, Mike Lee and John Curtis on three
// cards that said the room is not open. Three statewide boards now exist on the
// district boards' contract, as generated rows (scripts/gen-district-boards.mjs,
// planStatewide()) and nothing else:
//
//   /district/ut-gov                Governor    · cox
//   /district/ut-us-senate-lee      U.S. Senate · lee
//   /district/ut-us-senate-curtis   U.S. Senate · curtis
//
// WHAT THIS SUITE PROVES:
//   1. Each address rewrites (three exact spellings, 200) to its own document,
//      which declares the seat twice; every allow-list holds the three rows.
//   2. Band 1 paints from the live roster pid: name, the roster's office
//      string, a link to /p/<pid>. No party letter, no score.
//   3. Band 2 is counts only and structurally zero against an empty store.
//   4. No composer: the read-only line on all three, no "Say something" box,
//      no "Posting ships next", no composer host; HD-16 keeps its locked box.
//      MUTATION: the shipping sentence put back on ut-gov is caught.
//   5. /voice for Layton, driven for real: the three statewide cards are Open
//      board onto the new paths, not the empty sentence.
//   6. HD-29 and SD-6 are unchanged.
//   7. MUTATION: a fourth statewide seat with no row still prints "this room is
//      not open" and never "yet".
//   8. The homepage count is BOARD_ROUTES.length (88).
// ─────────────────────────────────────────────────────────────────────────────
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

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
    for (const f of failures) console.log(`   ✗ ${f}`);
    process.exit(1);
  }
  console.log(`\n   ✓ statewide boards: all ${passed} assertions passed`);
}
const must = (c, m) => { if (!c) { failures.push(`FIXTURE: ${m}`); report(); } else passed++; };

const MOD = R("district-board.js");
const DV = R("district-voice.js");
const VR = R("voice-room.js");
const LOC = R("voter-hub-location.js");
const SM = R("seated-member.js");
const PA = R("profile-alias.js");
const FN = R("netlify/functions/district-board.mts");
const TOML = R("netlify.toml");
const SW = R("sw.js");
const HOME = R("index.html");

const ROSTER = (() => {
  const w = makeSandbox();
  vm.runInContext(R("cmp-data.js"), vm.createContext(w), { filename: "cmp-data.js" });
  return w.CMP_DATA;
})();

// [alias, pid, name, office]
const SEATS = [
  ["ut-gov", "cox", "Spencer Cox", "Governor"],
  ["ut-us-senate-lee", "lee", "Mike Lee", "U.S. Senator"],
  ["ut-us-senate-curtis", "curtis", "John Curtis", "U.S. Senator"],
];

// ═════════════════════════════════════════════════════════════════════════════
section("1 · three addresses, three rewrites each, every allow-list holds them");
// ═════════════════════════════════════════════════════════════════════════════
const dvWin = makeSandbox();
vm.runInContext(DV, vm.createContext(dvWin), { filename: "district-voice.js" });
const V = dvWin.PDXVoice;
must(!!(V && V.BOARD_ROUTES), "district-voice.js did not publish BOARD_ROUTES");
const fnSeats = (() => {
  const m = /const BOARD_SEATS: Record<string, 1> = \{([\s\S]*?)\};/.exec(FN);
  must(!!m, "district-board.mts no longer declares BOARD_SEATS in a readable shape");
  return [...m[1].matchAll(/"([a-z0-9_-]+)":\s*1/g)].map((x) => x[1]);
})();
ok(!/from = "\/district\/[^"]*\*/.test(TOML), "no /district/* splat");
for (const [alias, pid] of SEATS) {
  eq(ROSTER[pid] && ROSTER[pid].state, "Utah", `${pid}: the roster row is Utah's`);
  eq(V.BOARD_ROUTES[alias], `/district/${alias}`, `${alias}: BOARD_ROUTES row`);
  eq(V.boardPath(alias), `/district/${alias}`, `${alias}: boardPath() answers it`);
  ok(fnSeats.indexOf(alias) >= 0, `${alias}: on the Function's BOARD_SEATS`);
  const doc = `district-${alias}.html`;
  ok(there(doc), `${alias}: ${doc} is on disk`);
  for (const sfx of ["", "/", ".html"]) {
    ok(new RegExp(`\\[\\[redirects\\]\\]\\s*\\n\\s*from = "/district/${alias}${sfx.replace(".", "\\.")}"\\n\\s*to = "/${doc}"\\n\\s*status = 200`).test(TOML),
      `${alias}: /district/${alias}${sfx} is an exact 200 rewrite onto /${doc}`);
  }
  const html = R(doc);
  eq([...html.matchAll(/window\.__PDX_DISTRICT_BOARD_SEAT = '([^']+)'/g)].map((m) => m[1]).join(","), alias,
    `${doc}: the head declares its own seat once`);
  eq([...html.matchAll(/id="pdx-district-board" data-pdxdb-seat="([^"]+)"/g)].map((m) => m[1]).join(","), alias,
    `${doc}: the host declares its own seat once`);
  has(html, `<link rel="canonical" href="https://politidex.fyi/district/${alias}"`, `${doc}: canonical is its bare address`);
  has(html, `<a href="/p/${pid}">`, `${doc}: noscript links /p/${pid}`);
  no(html, 'id="pdx-district-composer"', `${doc}: carries no composer host`);
  no(html, "district-composer.js", `${doc}: loads no composer`);
  has(SW, `'/${doc}',`, `sw.js: ${doc} is precached`);
}
{
  const slice = SW.slice(SW.indexOf("const DISTRICT_BOARD_NAV_RE ="),
    SW.indexOf("\n}", SW.indexOf("function districtBoardDoc(")) + 2);
  const off = vm.runInNewContext(slice + "\n;({ re: DISTRICT_BOARD_NAV_RE, doc: districtBoardDoc })");
  for (const [alias] of SEATS) {
    ok(off.re.test(`/district/${alias}`), `sw.js: /district/${alias} is a board navigation`);
    eq(off.doc(`/district/${alias}/`), `/district-${alias}.html`, `sw.js: /district/${alias} offline is its own document`);
  }
  eq(off.doc("/district/ut-us-senate-romney"), "", "sw.js: a statewide key with no row has no offline document");
  ok(!off.re.test("/district/ut-ltgov"), "sw.js: an unlisted statewide address is not a board navigation");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · band 1 is the roster row, and only the roster row");
// ═════════════════════════════════════════════════════════════════════════════
function board(alias, fetchImpl) {
  const win = makeSandbox();
  win.__PDX_DISTRICT_BOARD_SEAT = alias;
  if (fetchImpl) win.fetch = fetchImpl;
  const ctx = vm.createContext(win);
  for (const f of ["cmp-data.js", "issue-map.js", "district-board.js"]) vm.runInContext(R(f), ctx, { filename: f });
  return { win, M: win.PDXDistrictBoard };
}
const tagsOf = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
for (const [alias, pid, name, office] of SEATS) {
  const { M } = board(alias);
  eq(M.SEAT, alias, `${alias}: the module resolved this document's seat`);
  eq(M.PID, pid, `${alias}: band 1's holder is the live roster pid`);
  eq(ROSTER[pid].office, office, `${pid}: the roster's office string`);
  const html = M.seatHtml();
  has(html, `href="/p/${pid}"`, `${alias}: band 1 links /p/${pid}`);
  has(html, `>${name}</a>`, `${alias}: band 1 names ${name}`);
  has(html, `<p class="pdxdb-seat-office">${office}</p>`, `${alias}: band 1 prints the roster's office verbatim`);
  const text = tagsOf(html);
  ok(!/\((?:R|D|I)\)|\bRepublican\b|\bDemocrat/.test(text), `${alias}: band 1 prints no party (${text})`);
  ok(!/\d+\s*\/\s*100|\bscore\b|\bgrade\b|%/i.test(text), `${alias}: band 1 prints no score (${text})`);
  eq(M.scored, false, `${alias}: the surface publishes no score`);
  // The person file's control goes to this board and nobody else's.
  has(M.personLinkHtml(pid), `href="/district/${alias}"`, `${pid}: person-file control opens ${alias}`);
}
{
  const { M } = board("ut-gov");
  eq(M.board("ut-us-senate-romney"), null, "a statewide key with no row is no board");
  eq(M.board("ut-ltgov"), null, "a statewide-shaped address with no row is no board");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · band 2 counts only, structurally zero");
// ═════════════════════════════════════════════════════════════════════════════
for (const [alias] of SEATS) {
  const { M } = board(alias);
  const zero = { seat: alias, counts: { verified: 0, stance: 0, participants: 0 },
    stores: { verified: true, stance: false, participants: true }, rooms: [] };
  const html = M.roomHtml("ok", zero);
  const nums = (tagsOf(html).match(/\d+/g) || []);
  ok(nums.length > 0 && nums.every((n) => n === "0"), `${alias}: band 2 prints zeroes and only zeroes (${nums.join(",")})`);
  no(html, "@", `${alias}: band 2 prints no email`);
  has(html, "No district stance record on hand", `${alias}: the missing store says so`);
  no(tagsOf(html), " yet", `${alias}: band 2 never says "yet"`);
  // A failed read is not a zero.
  has(M.roomHtml("unread", null), "This is not a count of zero", `${alias}: a failed read is not a zero`);
}
// ═════════════════════════════════════════════════════════════════════════════
section("4 · no composer: the read-only line on all three, HD-16 keeps its box");
// ═════════════════════════════════════════════════════════════════════════════
const READ_ONLY = "This room is read-only. Only verified residents of a seat with a composer get a voice that counts.";
// The whole board as a reader sees it: mounted on the document's own host, the
// same way the page paints it. `src` lets the mutation below swap the module.
function paintWhole(alias, src) {
  const win = makeSandbox();
  win.__PDX_DISTRICT_BOARD_SEAT = alias;
  const mk = (id, attrs) => ({
    id, innerHTML: "", _a: attrs || {},
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._a, k) ? this._a[k] : null; },
    setAttribute(k, v) { this._a[k] = String(v); },
  });
  const els = { "pdx-district-board": mk("pdx-district-board", { "data-pdxdb-seat": alias }) };
  win.document.getElementById = (id) => els[id] || null;
  const ctx = vm.createContext(win);
  for (const f of ["cmp-data.js", "issue-map.js"]) vm.runInContext(R(f), ctx, { filename: f });
  vm.runInContext(src || MOD, ctx, { filename: "district-board.js" });
  win.PDXDistrictBoard.mount(els["pdx-district-board"]);
  return els["pdx-district-board"].innerHTML;
}
// Every way a reader board could still promise a box. Returns what it found.
function promises(html, doc) {
  const bad = [];
  for (const n of ["Posting ships next", "Say something", "pdxdb-compose", "pdxdb-say", "<input", "<textarea", "<form"]) {
    if (String(html).indexOf(n) >= 0) bad.push(n);
  }
  const words = tagsOf(html);
  for (const w of [/\bnext\b/i, /\bships\b/i, /\byet\b/i]) if (w.test(words)) bad.push(String(w));
  if (doc && doc.indexOf('id="pdx-district-composer"') >= 0) bad.push("composer host");
  if (doc && doc.indexOf("/district-composer.js") >= 0) bad.push("composer script");
  return bad;
}
for (const [alias] of SEATS) {
  const doc = R(`district-${alias}.html`);
  const html = paintWhole(alias);
  eq(promises(html, doc).join(", "), "", `${alias}: the board promises no composer`);
  eq((html.match(/data-pdxdb-readonly="1"/g) || []).length, 1, `${alias}: one read-only line`);
  has(html, READ_ONLY, `${alias}: the read-only line, word for word`);
  // The rest of the board did not go with the box.
  has(html, 'class="pdxdb-purpose"', `${alias}: the purpose line stays`);
  has(html, "Who is in the room", `${alias}: the counts band stays`);
  has(html, 'data-pdxdb-band="table"', `${alias}: the issue list stays`);
  has(tagsOf(M_SEAT(alias)), SEATS.find((r) => r[0] === alias)[2], `${alias}: the seat stays`);
}
function M_SEAT(alias) { return board(alias).M.seatHtml(); }
{
  // MUTATION: the old shipping sentence put back on ut-gov must be caught.
  const mutated = MOD.replace(
    /readOnlyLine: '[^']*' \+\s*'[^']*',/,
    "readOnlyLine: 'Posting ships next. A box that kept your sentence on this device would look like a post.',");
  must(mutated !== MOD, "mutation: could not find COPY.readOnlyLine to mutate");
  const bad = promises(paintWhole("ut-gov", mutated), R("district-ut-gov.html"));
  ok(bad.indexOf("Posting ships next") >= 0, "mutation: the shipping sentence on ut-gov is caught");
  ok(bad.length > 0, "mutation: the check fails on a mutated ut-gov");
}
{
  // HD-16 KEEPS ITS LOCKED BOX AND ITS LOCKED LINE, and the board leaves it the slot.
  const hd16 = R("district-ut-hd-16.html");
  has(hd16, 'id="pdx-district-composer"', "HD-16: the composer host is still there");
  has(hd16, 'data-pdxdc-seat="ut-hd-16"', "HD-16: the host names its seat");
  has(hd16, "/district-composer.js", "HD-16: still loads the composer");
  has(hd16, "Only verified residents of this seat get a voice that counts.", "HD-16: the locked line stays");
  has(hd16, "disabled", "HD-16: the served box is locked");
  no(hd16, READ_ONLY, "HD-16: the served document does not carry the read-only line");
}
{
  const sd3 = R("district-ut-sd-3.html");
  has(sd3, 'id="pdx-district-composer"', "SD-3: the composer host is still there");
  has(sd3, "/district-composer.js", "SD-3: still loads the composer");
  for (const f of ["district-ut-sd-6.html", "district-ut-hd-29.html"]) {
    no(R(f), 'id="pdx-district-composer"', `${f}: still has no composer`);
  }
  const DC = R("district-composer.js");
  // Veriff is the one residency vendor now wired (the composer links to its
  // hosted page); Stripe stays out — one vendor, not both.
  for (const bad of ["ut-gov", "us-senate", "zip", "Stripe"]) {
    no(DC.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ""), bad, `district-composer.js code names ${bad}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · /voice for Layton: the three statewide cards are Open board");
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
const LAYTON = { state: "Utah", city: "Layton", county: "Davis County", district: "2", stateSenateDistrict: "7", stateHouseDistrict: "16" };
function voice(loc, extra) {
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
  if (extra) {
    const real = win.pdxRepsForMe;
    win.pdxRepsForMe = function () {
      const r = real();
      if (r && r.levels) r.levels = r.levels.concat(extra);
      return r;
    };
  }
  vm.runInContext(DV, ctx, { filename: "district-voice.js" });
  vm.runInContext(VR, ctx, { filename: "voice-room.js" });
  now += 20000;
  win.PDXVoiceRoom.paint();
  return { win, html: els["pdx-voice-seats"].innerHTML };
}
const cards = (html) => String(html).split('<li class="pdxvr-seat"').slice(1);
const cardByPid = (html, pid) => cards(html).filter((c) => c.indexOf(`href="/p/${pid}"`) >= 0)[0] || "";
{
  const { win, html } = voice(LAYTON);
  eq(win.PDXVoiceRoom.standing(), "placed", "Layton: the hallway reached 'placed'");
  for (const [alias, pid, name] of SEATS) {
    const card = cardByPid(html, pid);
    must(!!card, `Layton: no card names /p/${pid} — the resolver did not seat ${name}`);
    has(card, `Sitting member: <a class="pdxvr-name" href="/p/${pid}">${name}</a>`, `Layton: the card names ${name}`);
    has(card, `<a class="pdxvr-door" href="/district/${alias}">Open board</a>`, `Layton: ${name}'s card opens /district/${alias}`);
    has(card, 'data-pdxvr-board="on"', `Layton: ${name}'s card is marked as boarded`);
    no(card, "Board not on hand", `Layton: ${name}'s card is not the empty sentence`);
    no(card, "this room is not open", `Layton: ${name}'s card does not say the room is not open`);
  }
  // THE DISTRICT DOORS ARE UNCHANGED BESIDE THEM.
  for (const a of ["ut-hd-16", "ut-sd-7", "ut-cd-2"]) has(html, `href="/district/${a}"`, `Layton: ${a}'s door is still there`);
  eq((html.match(/>Open board<\/a>/g) || []).length, 6, "Layton: six seats, six doors");
  eq(cards(html).length, 6, "Layton: six seat cards");
  no(html, "yet", "Layton: no card says yet");
  // seatKeyForLevel() still composes nothing for a statewide level: the /d/ lane is untouched.
  for (const s of win.PDXVoice.seatsForMe().filter((x) => x.statewide)) {
    eq(s.seatKey, "", `Layton: the statewide ${s.key} row composed a seat key`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · HD-29 and SD-6 are unchanged");
// ═════════════════════════════════════════════════════════════════════════════
for (const [alias, seat, pid, name] of [
  ["ut-hd-29", "ut-statehouse-29", "bolinder_h68", "Bridger Bolinder"],
  ["ut-sd-6", "ut-statesenate-6", "jstevenson", "Jerry Stevenson"],
]) {
  eq(V.BOARD_ROUTES[seat], `/district/${alias}`, `${alias}: BOARD_ROUTES row unchanged`);
  const { M } = board(alias);
  eq(M.SEAT, seat, `${alias}: seat unchanged`);
  eq(M.PID, pid, `${alias}: holder unchanged`);
  has(M.seatHtml(), `>${name}</a>`, `${alias}: band 1 still names ${name}`);
  has(M.readOnlyHtml(), READ_ONLY, `${alias}: a generated board prints the same read-only line`);
  no(M.readOnlyHtml(), "Posting ships next", `${alias}: …and no longer promises a box`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · mutation: a fourth statewide seat with no row stays shut");
// ═════════════════════════════════════════════════════════════════════════════
{
  const FOURTH = [
    { key: "ltgovernor", seat: "ltgovernor", label: "Lieutenant Governor", tierLabel: "Lieutenant Governor",
      statewide: true, mapped: true, district: null, distLabel: "Lieutenant Governor · Utah", pid: null, resolved: false },
    { key: "ussenate3", seat: "senate", label: "U.S. Senate", tierLabel: "U.S. Senate",
      statewide: true, mapped: true, district: null, distLabel: "U.S. Senate · Utah", pid: "romney", resolved: true },
  ];
  const { win, html } = voice(LAYTON, FOURTH);
  const byName = (n) => cards(html).filter((c) => c.indexOf(`>${n}</p>`) >= 0)[0] || "";
  const lt = byName("Lieutenant Governor · Utah");
  must(!!lt, "mutation: the fourth statewide card was not painted");
  has(lt, "this room is not open", "mutation: the unlisted statewide seat says the room is not open");
  has(lt, 'data-pdxvr-board="off"', "mutation: the unlisted statewide seat has no door");
  no(lt, "/district/", "mutation: the unlisted statewide seat offers no board address");
  no(lt, "yet", "mutation: the unlisted statewide seat never says yet");
  const s3 = cards(html).filter((c) => c.indexOf("/p/romney") >= 0 || (c.indexOf("U.S. Senate · Utah") >= 0 && c.indexOf('data-pdxvr-board="off"') >= 0))[0] || "";
  must(!!s3, "mutation: the third Senate card was not painted");
  has(s3, "this room is not open", "mutation: a Senate seat whose holder has no row says the room is not open");
  no(s3, "/district/", "mutation: …and offers no board address");
  no(s3, "yet", "mutation: …and never says yet");
  eq(win.PDXVoice.statewideKeyForLevel(FOURTH[1], "Utah", "romney"), "ut-us-senate-romney",
    "mutation: the key is composed — it is the missing ROW that keeps the room shut");
  eq(win.PDXVoice.boardPath("ut-us-senate-romney"), "", "mutation: no row, no path");
  // The other three still open beside it.
  for (const [alias] of SEATS) has(html, `href="/district/${alias}"`, `mutation: ${alias} still opens`);
  // Another state's statewide seat composes no key at all.
  eq(win.PDXVoice.statewideKeyForLevel({ seat: "governor", statewide: true }, "Missouri", "kehoe"), "",
    "mutation: another state's governor composed a board key");
  eq(win.PDXVoice.statewideKeyForLevel({ seat: "senate", statewide: true }, "Utah", ""), "",
    "mutation: a Senate seat with no holder composed a board key");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the homepage counts BOARD_ROUTES");
// ═════════════════════════════════════════════════════════════════════════════
{
  const n = Object.keys(V.BOARD_ROUTES).length;
  eq(n, 88, "BOARD_ROUTES holds 85 district rows and the three statewide ones");
  has(HOME, '<p class="pdxhv-note">Eighty-eight seats have a board on file today. Every other seat says the room is not open.</p>',
    "the homepage count is BOARD_ROUTES.length, spelled");
  has(SW, "// v259 - ", "the SW moved one version (v259 entry filed)");
}

report();
