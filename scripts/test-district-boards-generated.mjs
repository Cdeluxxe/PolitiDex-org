#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-district-boards-generated.mjs — every Utah seat the roster can name
// ─────────────────────────────────────────────────────────────────────────────
// scripts/gen-district-boards.mjs writes one board document per Utah State
// House, State Senate and U.S. House seat that has a sitting pid, from ONE
// template (scripts/district-board.template.html), and appends one row per seat
// to BOARDS, BOARD_ROUTES, the Function's BOARD_SEATS, netlify.toml and sw.js.
// The six hand boards (SD-3, SD-6, SD-7, HD-15, HD-16, UT-2) are not generated
// and scripts/test-district-boards.mjs keeps reading them closely.
//
// WHAT THIS SUITE PROVES:
//   1. The generator is up to date: running it would change no byte.
//   2. BOARD_ROUTES = the six + the generated count, and all five allow-lists
//      (BOARDS, BOARD_ROUTES, BOARD_SEATS, the SW's docs map, the rewrites)
//      hold the same seats. Every rewrite has a file on disk. No splat.
//   3. Every generated file declares, twice, the seat its path names; its
//      canonical is its bare address; its noscript office is the roster's.
//   4. The six fixtures still name the same people.
//   5. A seat with no sitting pid has no row, no document and no rewrite.
//   6. Band 1 names the member on a generated board, and pdxSeatClaim still
//      refuses a pid on the wrong seat.
//   7. Driven /voice smoke: Layton 16/7/2 still open; Fillmore HD-29 opens a
//      board and names the member; a seat with no pid says the room is not open.
// ─────────────────────────────────────────────────────────────────────────────
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { HAND_SEATS, planBoards } from "./gen-district-boards.mjs";

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
  console.log(`\n   ✓ generated district boards: all ${passed} assertions passed`);
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

const { boards: PLAN, skipped: SKIPPED } = planBoards();
const HAND_ALIAS = { "ut-statesenate-3": "ut-sd-3", "ut-statesenate-6": "ut-sd-6", "ut-statesenate-7": "ut-sd-7",
  "ut-statehouse-15": "ut-hd-15", "ut-statehouse-16": "ut-hd-16", "ut-house-2": "ut-cd-2" };
const ALL = HAND_SEATS.map((s) => ({ seat: s, alias: HAND_ALIAS[s] })).concat(PLAN);
const ALL_SEATS = ALL.map((b) => b.seat).sort().join(",");
const ALL_ALIASES = ALL.map((b) => b.alias).sort().join(",");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the generator would change nothing");
// ═════════════════════════════════════════════════════════════════════════════
{
  let rc = 0, out = "";
  try {
    out = execFileSync(process.execPath, [join(ROOT, "scripts/gen-district-boards.mjs"), "--check"],
      { cwd: ROOT, encoding: "utf8" });
  } catch (e) { rc = e.status || 1; out = String(e.stdout || "") + String(e.stderr || ""); }
  eq(rc, 0, `gen-district-boards --check reports drift — run node scripts/gen-district-boards.mjs\n${out}`);
}
eq(HAND_SEATS.length, 6, "the generator skips exactly the six hand seats");
must(PLAN.length > 0, "the plan opened no board at all");
for (const b of PLAN) {
  ok(!HAND_SEATS.includes(b.seat), `${b.seat}: a hand seat was generated over`);
}
// THE PLAN COVERS EVERY SEAT ONCE: opened, hand-authored or skipped with a reason.
eq(PLAN.length + SKIPPED.length + HAND_SEATS.length, 75 + 29 + 4,
  "every Utah House, Senate and U.S. House seat is exactly one of opened / hand / skipped");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · one list, five copies, every rewrite backed by a file");
// ═════════════════════════════════════════════════════════════════════════════
const dvWin = makeSandbox();
vm.runInContext(DV, vm.createContext(dvWin), { filename: "district-voice.js" });
const V = dvWin.PDXVoice;
must(V && V.BOARD_ROUTES, "district-voice.js did not publish BOARD_ROUTES");
eq(Object.keys(V.BOARD_ROUTES).length, 6 + PLAN.length, "BOARD_ROUTES length = six hand rows + the generated count");
eq(Object.keys(V.BOARD_ROUTES).sort().join(","), ALL_SEATS, "BOARD_ROUTES holds exactly the planned seats");

const bWin = makeSandbox();
vm.runInContext(MOD, vm.createContext(bWin), { filename: "district-board.js" });
const B = bWin.PDXDistrictBoard;
must(B && B.BOARD_SEATS, "district-board.js did not publish BOARD_SEATS");
eq(Object.keys(B.BOARD_SEATS).sort().join(","), ALL_SEATS, "district-board.js BOARDS holds the same seats");

const fnSeats = (() => {
  const m = /const BOARD_SEATS: Record<string, 1> = \{([\s\S]*?)\};/.exec(FN);
  must(!!m, "district-board.mts no longer declares BOARD_SEATS in a readable shape");
  return [...m[1].matchAll(/"([a-z0-9-]+)":\s*1/g)].map((x) => x[1]).sort().join(",");
})();
eq(fnSeats, ALL_SEATS, "the Function's BOARD_SEATS holds the same seats");

const RULES = [...TOML.matchAll(/\[\[redirects\]\]\s*\n((?:\s*[a-z_]+\s*=\s*[^\n]+\n)+)/g)].map((m) => {
  const f = (k) => (new RegExp(`^\\s*${k}\\s*=\\s*"?([^"\\n]+)"?`, "m").exec(m[1]) || [, ""])[1].trim();
  return { from: f("from"), to: f("to"), status: f("status") };
});
const districtRules = RULES.filter((r) => r.from.indexOf("/district/") === 0);
eq(districtRules.length, ALL.length * 3, "three rewrites per board and no other /district/ rule");
ok(!RULES.some((r) => r.from.indexOf("/district") === 0 && r.from.indexOf("*") >= 0), "no /district/* splat");
for (const r of districtRules) {
  eq(r.status, "200", `${r.from} is a rewrite, not a redirect`);
  ok(there(r.to.replace(/^\//, "")), `${r.from} rewrites to ${r.to}, which is not on disk`);
  const alias = r.from.replace(/^\/district\//, "").replace(/(\/|\.html)$/, "");
  eq(r.to, `/district-${alias}.html`, `${r.from} rewrites to its own alias's document`);
}
for (const b of PLAN) {
  for (const sfx of ["", "/", ".html"]) {
    eq(districtRules.filter((r) => r.from === `/district/${b.alias}${sfx}`).length, 1,
      `${b.alias}: exactly one rewrite for /district/${b.alias}${sfx}`);
  }
}

{
  const slice = SW.slice(SW.indexOf("const DISTRICT_BOARD_NAV_RE ="),
    SW.indexOf("\n}", SW.indexOf("function districtBoardDoc(")) + 2);
  must(slice.indexOf("function districtBoardDoc(") > 0, "sw.js: the offline board block moved apart");
  const off = vm.runInNewContext(slice + "\n;({ re: DISTRICT_BOARD_NAV_RE, docs: DISTRICT_BOARD_DOCS, doc: districtBoardDoc })");
  eq(Object.keys(off.docs).sort().join(","), ALL_ALIASES, "sw.js: DISTRICT_BOARD_DOCS holds the same aliases");
  for (const b of PLAN) {
    for (const sp of [`/district/${b.alias}`, `/district/${b.alias}/`, `/district/${b.alias}.html`]) {
      eq(off.doc(sp), `/${b.doc}`, `sw.js: ${sp} offline is its own document`);
    }
    has(SW, `'/${b.doc}',`, `sw.js: ${b.doc} is precached`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · every generated document is the seat its path names");
// ═════════════════════════════════════════════════════════════════════════════
const onDisk = (() => {
  const out = execFileSync("ls", [ROOT], { encoding: "utf8" }).split("\n");
  return out.filter((f) => /^district-ut-(hd|sd|cd)-\d+\.html$/.test(f));
})();
eq(onDisk.length, ALL.length, "one district-ut-*.html per board and no orphan document");
for (const f of onDisk) {
  const alias = f.replace(/^district-/, "").replace(/\.html$/, "");
  const doc = R(f);
  const heads = [...doc.matchAll(/window\.__PDX_DISTRICT_BOARD_SEAT = '([^']+)'/g)].map((m) => m[1]);
  const hosts = [...doc.matchAll(/id="pdx-district-board" data-pdxdb-seat="([^"]+)"/g)].map((m) => m[1]);
  eq(heads.join(","), alias, `${f}: the head declares the seat its path names, once`);
  eq(hosts.join(","), alias, `${f}: the host declares the seat its path names, once`);
  has(doc, `<link rel="canonical" href="https://politidex.fyi/district/${alias}"`, `${f}: canonical is its bare address`);
}
for (const b of PLAN) {
  const doc = R(b.doc);
  has(doc, "GENERATED", `${b.doc}: carries the generated notice`);
  has(doc, "window.__PDX_DISTRICT_BOARD_DOC = true", `${b.doc}: the board-document flag`);
  if (b.usHouse) {
    has(doc, '<script defer src="/voter-hub-location.js"></script>', `${b.doc}: a congressional board loads the join`);
    no(doc, b.member, `${b.doc}: a congressional document writes no representative's name down`);
  } else {
    has(doc, `<a href="/p/${b.pid}">`, `${b.doc}: noscript links the sitting member's file`);
    has(doc, `<span data-pdxdb-roster-office>${b.office}</span>`, `${b.doc}: noscript office is the roster's string`);
  }
  // ROOT-ABSOLUTE ONLY: /district/<alias>/ is served 200.
  for (const u of [...doc.matchAll(/\b(?:src|href)="([^"]*)"/g)].map((m) => m[1])) {
    ok(/^(?:https?:|\/|#|mailto:|data:)/.test(u), `${b.doc}: "${u}" is not root-absolute`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the six hand boards still name the same people");
// ═════════════════════════════════════════════════════════════════════════════
const ROSTER = (() => {
  const w = makeSandbox();
  vm.runInContext(R("cmp-data.js"), vm.createContext(w), { filename: "cmp-data.js" });
  return w.CMP_DATA;
})();
function band1(alias, withJoin) {
  const win = makeSandbox();
  win.__PDX_DISTRICT_BOARD_SEAT = alias;
  const ctx = vm.createContext(win);
  const files = ["cmp-data.js", "issue-map.js"];
  if (withJoin) files.push("voter-hub-location.js");
  files.push("district-board.js");
  for (const f of files) vm.runInContext(R(f), ctx, { filename: f });
  return { win, M: win.PDXDistrictBoard, html: win.PDXDistrictBoard.seatHtml() };
}
const FIXTURES = [
  ["ut-sd-3", "john_johnson", "John Johnson", false],
  ["ut-sd-6", "jstevenson", "Jerry Stevenson", false],
  ["ut-sd-7", "sadams", "Stuart Adams", false],
  ["ut-hd-15", "defay_h15", "Ariel Defay", false],
  ["ut-hd-16", "tlee", "Trevor Lee", false],
  ["ut-cd-2", "maloy", "Celeste Maloy", true],
];
for (const [alias, pid, name, join] of FIXTURES) {
  const { M, html } = band1(alias, join);
  eq(M.PID, pid, `${alias}: band 1's holder`);
  has(html, name, `${alias}: band 1 still names ${name}`);
  has(html, `href="/p/${pid}"`, `${alias}: …linked to /p/${pid}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · a seat with no sitting pid has no board");
// ═════════════════════════════════════════════════════════════════════════════
must(SKIPPED.length > 0, "the plan skipped nothing, so this section tests nothing");
for (const s of SKIPPED) {
  eq(V.boardPath(s.seat), "", `${s.seat}: no BOARD_ROUTES row`);
  eq(B.board(s.alias), null, `${s.alias}: no BOARDS row`);
  ok(fnSeats.split(",").indexOf(s.seat) < 0, `${s.seat}: not on the Function's list`);
  ok(!there(`district-${s.alias}.html`), `${s.alias}: no document on disk`);
  ok(!districtRules.some((r) => r.from.indexOf(`/district/${s.alias}`) === 0 &&
    /^(\/|\.html)?$/.test(r.from.slice(`/district/${s.alias}`.length))), `${s.alias}: no rewrite`);
}
const HD17 = SKIPPED.filter((s) => s.alias === "ut-hd-17")[0];
ok(!!HD17 && /no sitting pid/.test(HD17.reason), "HD-17 is skipped because the roster names nobody for it");

// ═════════════════════════════════════════════════════════════════════════════
section("6 · band 1 on a generated board, and the claim gate");
// ═════════════════════════════════════════════════════════════════════════════
for (const b of PLAN) {
  const { M, html } = band1(b.alias, !!b.usHouse);
  const pid = b.usHouse ? b.joinPid : b.pid;
  eq(M.SEAT, b.seat, `${b.alias}: the module resolved this document's seat`);
  eq(M.PID, pid, `${b.alias}: band 1's holder is the planned pid`);
  has(html, `<p class="pdxdb-seat-office">${ROSTER[pid].office}</p>`, `${b.alias}: band 1 prints the roster's office verbatim`);
  has(html, ROSTER[pid].name, `${b.alias}: band 1 names ${ROSTER[pid].name}`);
}
{
  const hd29 = PLAN.filter((b) => b.alias === "ut-hd-29")[0];
  const hd68 = PLAN.filter((b) => b.alias === "ut-hd-68")[0];
  ok(hd29 && hd29.pid === "bolinder_h68" && hd29.member === "Bridger Bolinder", "HD-29 (Fillmore) is Bridger Bolinder's board");
  ok(hd68 && hd68.pid === "chew_h68" && hd68.member === "Scott Chew", "HD-68 (Vernal) is Scott Chew's board");
}
{
  const w = makeSandbox();
  const ctx = vm.createContext(w);
  for (const f of ["cmp-data.js", "voter-hub-location.js"]) vm.runInContext(R(f), ctx, { filename: f });
  eq(w.pdxSeatClaim("jstevenson", "ut-statesenate-7", 7), "mismatch", "pdxSeatClaim: Stevenson does not claim SD-7");
  eq(w.pdxSeatClaim("sadams", "ut-statesenate-6", 6), "mismatch", "pdxSeatClaim: Adams does not claim SD-6");
  eq(w.pdxSeatClaim("chew_h68", "ut-statehouse-29", 29), "mismatch", "pdxSeatClaim: Chew does not claim HD-29");
  for (const b of PLAN.filter((x) => !x.usHouse)) {
    eq(w.pdxSeatClaim(b.pid, b.seat, b.district), "match", `pdxSeatClaim: ${b.pid} claims ${b.seat}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · smoke: /voice for Layton, Fillmore, and a seat nobody holds");
// ═════════════════════════════════════════════════════════════════════════════
// The lean document, driven the way scripts/test-voice-sitting-member.mjs
// drives it: profile-alias.js, seated-member.js, the resolver slice,
// district-voice.js and voice-room.js, with a finder-pinned location and the
// roster as the live people index.
const swFrom = LOC.indexOf("var _pdxStatewideCache = {};");
const resTo = LOC.indexOf("window._vhSyncDistrictStrip = function()", swFrom);
must(swFrom !== -1 && resTo > swFrom, "voter-hub-location.js: the resolver slice is gone");
const RESOLVER = LOC.slice(swFrom, resTo);
const RET_SRC = (() => {
  const at = LOC.indexOf("window.PDXReturn = (function () {");
  const end = LOC.indexOf("\n  })();", at);
  return LOC.slice(at, end + "\n  })();".length);
})();
function voice(loc, pinPid) {
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
  if (pinPid) {
    const real = win.pdxRepsForMe;
    win.pdxRepsForMe = function () {
      const r = real();
      if (!r || !r.levels) return r;
      r.levels = r.levels.map((l) => (l && Object.prototype.hasOwnProperty.call(pinPid, l.key)
        ? Object.assign({}, l, { pid: pinPid[l.key], resolved: true }) : l));
      return r;
    };
  }
  vm.runInContext(DV, ctx, { filename: "district-voice.js" });
  vm.runInContext(VR, ctx, { filename: "voice-room.js" });
  now += 20000;
  win.PDXVoiceRoom.paint();
  return els["pdx-voice-seats"].innerHTML;
}
const cardFor = (html, label, n) => {
  for (const part of String(html).split('<li class="pdxvr-seat"')) {
    if (part.indexOf("pdxvr-chamber") !== -1 && part.indexOf(label + " District " + n) !== -1) return part;
  }
  return "";
};
const opened = (who, html, label, n, pid, name, alias) => {
  const card = cardFor(html, label, n);
  must(!!card, `${who}: no ${label} District ${n} card`);
  has(card, `Sitting member: <a class="pdxvr-name" href="/p/${pid}">${name}</a>`, `${who}: ${label} ${n} names ${name}`);
  has(card, ">Open board</a>", `${who}: ${label} ${n} has an Open board door`);
  has(card, `href="/district/${alias}"`, `${who}: ${label} ${n}'s door is /district/${alias}`);
};
{
  const html = voice({ state: "Utah", city: "Layton", county: "Davis County", district: "2", stateSenateDistrict: "7", stateHouseDistrict: "16" });
  opened("Layton", html, "State House", 16, "tlee", "Trevor Lee", "ut-hd-16");
  opened("Layton", html, "State Senate", 7, "sadams", "Stuart Adams", "ut-sd-7");
  opened("Layton", html, "U.S. House", 2, "maloy", "Celeste Maloy", "ut-cd-2");
}
{
  const html = voice({ state: "Utah", city: "Fillmore", county: "Millard County", district: "4", stateSenateDistrict: "27", stateHouseDistrict: "29" });
  opened("Fillmore", html, "State House", 29, "bolinder_h68", "Bridger Bolinder", "ut-hd-29");
  no(cardFor(html, "State House", 29), "room is not open", "Fillmore: HD-29 no longer says the room is not open");
}
{
  const html = voice({ state: "Utah", city: "Farmington", county: "Davis County", district: "2", stateSenateDistrict: "7", stateHouseDistrict: "17" });
  const card = cardFor(html, "State House", 17);
  must(!!card, "Farmington: no State House District 17 card");
  has(card, "this room is not open", "Farmington: HD-17, which the roster names nobody for, says the room is not open");
  no(card, "Open board", "Farmington: HD-17 has no door");
  no(card, "/district/", "Farmington: HD-17 offers no board address");
}
{
  // THE WRONG PID, PINNED: Stevenson on the SD-7 card. The claim gate drops it
  // and the card names Adams, the member the district table seats there.
  const html = voice({ state: "Utah", city: "Layton", county: "Davis County", district: "2", stateSenateDistrict: "7", stateHouseDistrict: "16" },
    { statesenate: "jstevenson" });
  const card = cardFor(html, "State Senate", 7);
  no(card, "Jerry Stevenson", "claim gate: a pinned SD-6 pid does not reach the SD-7 card");
  no(card, "/district/ut-sd-6", "claim gate: …nor SD-6's door");
  opened("claim gate", html, "State Senate", 7, "sadams", "Stuart Adams", "ut-sd-7");
}

report();
