#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-board-stance-return.mjs — "Set your positions" on a board returns to it
// ─────────────────────────────────────────────────────────────────────────────
// The green "Set your positions" control on every district board sent the
// reader to /my-stances with nothing to say where they came from, so after a
// save the only ways out were "Your file" (/me) and "← Home". Same class of bug
// the finder and Join already fixed with PDXReturn, and the fix is the same
// owner: the control is PDXReturn.studioHref(<this board>), and the studio's
// save or dismiss calls PDXReturn.studioSettled(), which is consume() with the
// studio's gate.
//
// Everything below runs the SHIPPED code — PDXReturn sliced out of its owner,
// the generated pdx-return.js, district-board.js and stance-studio.js with the
// real vocabulary and store — against a location that records rather than
// follows.
//
//   node scripts/test-board-stance-return.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { returnSlice, renderReturn } from "./gen-pdx-return.mjs";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => {
  if (c) return;
  console.error(`✗ board stance return: STALE HARNESS — ${m}`);
  process.exit(2);
};

const LOC = R("voter-hub-location.js");
const RET_SRC = returnSlice(LOC);
const PDX_RETURN_FILE = R("pdx-return.js");
const BOARD_JS = R("district-board.js");
const STUDIO_JS = R("stance-studio.js");
const MS_DOC = R("my-stances.html");
const SW = R("sw.js");

const decodeAmp = (s) => String(s).replace(/&amp;/g, "&");
const nextOf = (href) => {
  const m = /[?&]next=([^&#]*)/.exec(String(href || ""));
  return m ? decodeURIComponent(m[1]) : null;
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · one owner: PDXReturn grew a studio door, and the copy is the copy");
// ═════════════════════════════════════════════════════════════════════════════
eq(PDX_RETURN_FILE, renderReturn(LOC), "pdx-return.js is byte-for-byte its owner (run node scripts/gen-pdx-return.mjs)");
{
  const w = makeSandbox();
  vm.runInContext(RET_SRC, vm.createContext(w), { filename: "voter-hub-location.js#PDXReturn" });
  const P = w.PDXReturn;
  must(P && typeof P.studioHref === "function", "PDXReturn has no studioHref()");
  must(typeof P.studioSettled === "function", "PDXReturn has no studioSettled()");
  eq(P.STUDIO, "/my-stances", "the studio's address is /my-stances");
  eq(P.studioHref("/district/ut-sd-9", true), "/my-stances?add=1&next=%2Fdistrict%2Fut-sd-9", "the add door carries the board");
  eq(P.studioHref("/district/ut-sd-9", false), "/my-stances?next=%2Fdistrict%2Fut-sd-9", "the plain door carries the board");
  eq(P.studioHref("https://evil.example/district/ut-sd-9", true), "/my-stances?add=1", "an off-origin next is dropped");
  eq(P.studioHref("//evil.example", false), "/my-stances", "a protocol-relative next is dropped");
  eq(P.studioHref("/find", false), "/my-stances", "the finder is not a destination");
  eq(P.studioHref("/", false), "/my-stances", "the front page carries no intent");
  eq(P.studioHref("", true), "/my-stances?add=1", "no next, no parameter");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · every board document's control names its own path");
// ═════════════════════════════════════════════════════════════════════════════
const boardDocs = readdirSync(ROOT).filter((f) => /^district-ut-.*\.html$/.test(f));
ok(boardDocs.length === 88, `every board document is swept (${boardDocs.length})`);
for (const f of boardDocs) {
  const s = R(f);
  const alias = f.replace(/^district-/, "").replace(/\.html$/, "");
  const own = `/district/${alias}`;
  const studioLinks = [...s.matchAll(/<a href="(\/my-stances[^"]*)"/g)].map((m) => decodeAmp(m[1]));
  ok(studioLinks.length > 0, `${f}: the board carries a studio control`);
  for (const h of studioLinks) eq(nextOf(h), own, `${f}: its studio link returns to ${own}`);
  const m = /window\.__PDX_DISTRICT_BOARD_SEAT = '([^']+)'/.exec(s);
  eq(m && m[1], alias, `${f}: the document declares the seat its path names`);
  ok(s.includes('src="/pdx-return.js"') || s.includes('src="/voter-hub-location.js"'),
     `${f}: PDXReturn is on the document, so the painted control can carry the board`);
}

// THE PAINTED CONTROL, every state that prints "Set your positions", on every
// board. The board resolves its own seat from the document flag; the route is
// the mounted board's, and the next on every studio link is that route.
function paintStance(alias, count, sides) {
  const w = makeSandbox();
  w.__PDX_DISTRICT_BOARD_SEAT = alias;
  w.PDXStanceSides = {
    count: () => count, complete: () => count >= 0,
    list: () => sides || [], label: (p) => (p === "support" ? "Support" : "Oppose"),
  };
  const ctx = vm.createContext(w);
  vm.runInContext(PDX_RETURN_FILE, ctx, { filename: "pdx-return.js" });
  vm.runInContext(BOARD_JS, ctx, { filename: "district-board.js" });
  return w;
}
{
  const w0 = paintStance("ut-sd-9", 0);
  const routes = Object.values(w0.PDXDistrictBoard.BOARDS).map((b) => b.route);
  eq(routes.length, 88, "district-board.js's BOARDS length is unchanged");
  for (const b of Object.values(w0.PDXDistrictBoard.BOARDS)) {
    const none = paintStance(b.alias, 0).PDXDistrictBoard;
    eq(none.ROUTE, b.route, `${b.alias}: the board mounted is the one the document declared`);
    const set = decodeAmp((/data-pdxdb-stance-cta="set"/.test(none.stanceHtml([])) &&
      /<a class="pdxdb-stance-cta" href="([^"]*)"/.exec(none.stanceHtml([])) || [])[1] || "");
    ok(set.startsWith("/my-stances?add=1&"), `${b.alias}: a reader with nothing is still offered the add flow`);
    eq(nextOf(set), b.route, `${b.alias}: "Set your positions" (none) returns to ${b.route}`);
    ok(none.stanceHtml([]).includes("Set your positions"), `${b.alias}: the control still says Set your positions`);

    const unread = paintStance(b.alias, -1).PDXDistrictBoard.stanceHtml([]);
    const uh = decodeAmp((/<a class="pdxdb-stance-cta" href="([^"]*)"/.exec(unread) || [])[1] || "");
    eq(nextOf(uh), b.route, `${b.alias}: "Set your positions" (unread) returns to the board`);
    ok(!uh.includes("add=1"), `${b.alias}: an unread reader is not told they hold nothing`);
  }
  const mine = paintStance("ut-hd-29", 2, [{ key: "housing", position: "support" }]).PDXDistrictBoard;
  const offTable = mine.stanceHtml(["water"]);
  eq(nextOf(decodeAmp((/<a class="pdxdb-stance-cta" href="([^"]*)"/.exec(offTable) || [])[1])), "/district/ut-hd-29",
     "off-table: the plain door returns to the board");
  // A board document without PDXReturn falls back to today's plain addresses.
  const bare = makeSandbox();
  bare.__PDX_DISTRICT_BOARD_SEAT = "ut-sd-9";
  bare.PDXStanceSides = { count: () => 0, complete: () => true, list: () => [], label: () => "" };
  vm.runInContext(BOARD_JS, vm.createContext(bare), { filename: "district-board.js" });
  ok(bare.PDXDistrictBoard.stanceHtml([]).includes('href="/my-stances?add=1"'),
     "no PDXReturn on the document: the plain add door, no invented intent");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the studio: a save or a dismiss walks the reader back");
// ═════════════════════════════════════════════════════════════════════════════
function makeDoc() {
  const nodes = {};
  const node = (id) => {
    const n = {
      id, _html: "", textContent: "", attrs: {}, style: {},
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {}, removeEventListener() {}, scrollIntoView() {},
      querySelector() { return null; }, querySelectorAll() { return []; },
      appendChild(c) { return c; }, insertBefore(c) { return c; }, removeChild(c) { return c; },
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    };
    Object.defineProperty(n, "innerHTML", {
      get() { return this._html; },
      set(v) { this._html = String(v == null ? "" : v); },
    });
    nodes[id] = n;
    return n;
  };
  node("my-stances"); node("mst"); node("mst-hits");
  const home = node("pdx-ms-home"); home.attrs.href = "/"; home.textContent = "← Home";
  return {
    readyState: "complete", cookie: "", activeElement: null,
    body: node("body"), head: node("head"), documentElement: node("html"),
    createElement: () => node(""),
    getElementById: (id) => nodes[id] || null,
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
  };
}
function studio(search, { held, stancesDoc = true } = {}) {
  const store = {};
  if (held) {
    const items = {};
    for (const [k, p] of Object.entries(held)) {
      items[k] = { issueKey: k, position: p, priority: "medium", note: "", createdAt: 1, updatedAt: 1 };
    }
    store.pdx_my_stances_v1 = JSON.stringify({ version: 1, items, updatedAt: 1 });
  }
  const win = {
    console, JSON, Math, Date, String, Number, Boolean, Array, Object, RegExp, Error, Promise, Set, Map,
    URLSearchParams, encodeURIComponent, decodeURIComponent, parseInt, parseFloat, isNaN,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame() { return 0; },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    CustomEvent: function (t, d) { return { type: t, detail: (d && d.detail) || null }; },
    __assigned: [],
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem(k, v) { store[k] = String(v); }, removeItem(k) { delete store[k]; },
      key: (i) => Object.keys(store)[i] || null, get length() { return Object.keys(store).length; },
    },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  };
  win.window = win; win.self = win;
  win.document = makeDoc();
  if (stancesDoc) win.__PDX_STANCES_DOC = true;
  win.location = {
    href: "https://politidex.fyi/my-stances" + search, pathname: "/my-stances", search, hash: "",
    origin: "https://politidex.fyi",
    assign(u) { win.__assigned.push(String(u)); }, replace(u) { win.__assigned.push(String(u)); },
  };
  win.history = { pushState() {}, replaceState(a, b, u) {
    const q = String(u).indexOf("?");
    win.location.search = q >= 0 ? String(u).slice(q).replace(/#.*$/, "") : "";
  } };
  const ctx = vm.createContext(win);
  for (const f of ["issue-map.js", "issue-scope.js", "issue-colors.js", "stance-sides.js", "my-stances.js",
                   "pdx-return.js"]) {
    vm.runInContext(R(f), ctx, { filename: f });
  }
  vm.runInContext(STUDIO_JS, ctx, { filename: "stance-studio.js" });
  must(win.PDXStanceStudio, "stance-studio.js did not publish window.PDXStanceStudio");
  return win;
}
const BOARD = "/district/ut-hd-29";
const FROM_BOARD_ADD = `?add=1&next=${encodeURIComponent(BOARD)}`;
const FROM_BOARD = `?next=${encodeURIComponent(BOARD)}`;
{
  // A first-run reader from the board: ?add=1 is cleared by the studio, next stays.
  const w = studio(FROM_BOARD_ADD);
  eq(w.location.search, FROM_BOARD, "the studio clears ?add=1 and leaves the intent on the address");
  eq(w.document.getElementById("pdx-ms-home").getAttribute("href"), BOARD, "“← Home” points at the board the reader came from");
  eq(w.__assigned.length, 0, "opening the studio moves nobody");
  w.PDXStanceStudio.pick("housing");
  eq(w.__assigned.length, 0, "picking an issue moves nobody");
  w.PDXStanceStudio.answer("housing", "support");
  eq(w.PDXStanceStudio.position("housing"), "support", "the save happened");
  eq(JSON.stringify(w.__assigned), JSON.stringify([BOARD]), "after a save, consume() returns to the board and not /me");
  ok(!w.__assigned.includes("/me"), "…and never to /me");
}
{
  const w = studio(FROM_BOARD, { held: { housing: "support" } });
  w.PDXStanceStudio.pick("housing");
  w.PDXStanceStudio.clear("housing");
  eq(JSON.stringify(w.__assigned), JSON.stringify([BOARD]), "a clear is a save: back to the board");
}
{
  const w = studio(FROM_BOARD_ADD);
  w.PDXStanceStudio.skip();
  eq(JSON.stringify(w.__assigned), JSON.stringify([BOARD]), "“Skip for now” dismisses back to the board");
  const w2 = studio(FROM_BOARD_ADD);
  w2.PDXStanceStudio.answer("housing", "unsure");
  eq(JSON.stringify(w2.__assigned), JSON.stringify([BOARD]), "“Not sure” settles the visit back to the board");
  const w3 = studio(FROM_BOARD);
  ok(w3.PDXStanceStudio.dismiss() === true, "dismiss() reports the move");
  eq(JSON.stringify(w3.__assigned), JSON.stringify([BOARD]), "dismiss() returns to the board");
}
{
  // FROM /me OR THE NAV: no intent, so a save stays put and "Your file" is /me.
  const w = studio("?add=1");
  w.PDXStanceStudio.answer("housing", "support");
  w.PDXStanceStudio.skip();
  eq(w.__assigned.length, 0, "a /me-originated visit is not sent to any board");
  eq(w.document.getElementById("pdx-ms-home").getAttribute("href"), "/", "…and its “← Home” is unchanged");
  ok(MS_DOC.includes('<a href="/me">Your file</a>'), "…and “Your file” still finishes on /me");
  const fromMe = studio(`?next=${encodeURIComponent("/me")}`);
  fromMe.PDXStanceStudio.answer("housing", "support");
  eq(JSON.stringify(fromMe.__assigned), JSON.stringify(["/me"]), "a studio visit that named /me ends on /me");
}
for (const bad of [
  "https%3A%2F%2Fevil.example%2Fdistrict%2Fut-hd-29",
  "%2F%2Fevil.example",
  "javascript%3Aalert(1)",
  "%2Fdistrict%2F..%2F..%2Fadmin",
  "%2Ffind",
  "%2Fdistrict%2FUT%20HD%2029%3Cscript%3E",
]) {
  const w = studio(`?next=${bad}`);
  w.PDXStanceStudio.answer("housing", "support");
  eq(w.__assigned.length, 0, `off-allow-list next=${bad} is ignored after a save`);
  eq(w.document.getElementById("pdx-ms-home").getAttribute("href"), "/", `…and “← Home” is not pointed at ${bad}`);
}
{
  // THE GATE IS THE STUDIO'S DOCUMENT. A next on some other page is not spent
  // by a studio settle.
  const w = studio(FROM_BOARD, { stancesDoc: false });
  w.PDXStanceStudio.answer("housing", "support");
  eq(w.__assigned.length, 0, "without __PDX_STANCES_DOC the studio intent is never spent");
  // And the owner's other gates are untouched: no save, no move.
  const p = makeSandbox();
  p.location = { pathname: "/my-stances", search: FROM_BOARD, assign(u) { p.__a = u; } };
  p.__PDX_STANCES_DOC = true;
  vm.runInContext(RET_SRC, vm.createContext(p), { filename: "PDXReturn" });
  eq(p.PDXReturn.consume(), false, "consume() alone, before any save or dismiss, moves nobody");
  eq(p.PDXReturn.studioSettled(), true, "studioSettled() spends it");
  eq(p.__a, BOARD, "…to the board");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the walls: copy, composers, allow-lists, the shell");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = makeSandbox();
  vm.runInContext(BOARD_JS, vm.createContext(w), { filename: "district-board.js" });
  const C = w.PDXDistrictBoard.COPY;
  ok(/read against something/.test(C.stanceCtaNote), "the green card says positions are how the list is read against something");
  const BANNED = /\b(equity|stocks?|shares?|veriff|post now|dividend|invest(?:or|ment)?)\b/i;
  for (const k of ["stanceCta", "stanceCtaNote", "stanceMineNote", "stanceMore"]) {
    ok(!BANNED.test(C[k]), `COPY.${k} carries no equity / stock / Veriff / post-now copy`);
  }
  ok(!BANNED.test(STUDIO_JS.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")),
     "the studio carries none of it either");
}
{
  const dv = makeSandbox();
  vm.runInContext(R("district-voice.js"), vm.createContext(dv), { filename: "district-voice.js" });
  eq(Object.keys(dv.PDXVoice.BOARD_ROUTES).length, 88, "BOARD_ROUTES length is unchanged");
  ok(!/from\s*=\s*"\/district\/\*"/.test(R("netlify.toml")), "no /district/* splat");
  const COMPOSER = ["district-ut-sd-3.html", "district-ut-hd-16.html", "district-ut-sd-7.html",
                    "district-ut-hd-15.html", "district-ut-cd-2.html"];
  for (const f of COMPOSER) {
    const s = R(f);
    ok(s.includes('src="/district-composer.js"') && s.includes('src="/district-poll.js"'),
       `${f} keeps the locked composer and the poll`);
  }
  const neighbours = boardDocs.filter((f) => !COMPOSER.includes(f));
  const leaking = neighbours.filter((f) => R(f).includes("district-composer.js") || R(f).includes('id="pdx-district-composer"'));
  eq(leaking.length, 0, `neighbour boards still have no composer — ${JSON.stringify(leaking)}`);
}
{
  const bare = MS_DOC.replace(/<!--[\s\S]*?-->/g, "");
  const ret = bare.indexOf('<script defer src="/pdx-return.js">');
  const st = bare.indexOf('<script defer src="/stance-studio.js">');
  ok(ret > 0 && st > ret, "/my-stances loads pdx-return.js before the studio");
  ok(!bare.includes('src="/voter-hub-location.js"'), "…and not the 240 KB picker that owns it");
  ok(SW.includes("'/pdx-return.js'") || SW.includes("'/my-stances.html'"), "the studio document is in the shell");
  ok(Number(((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]) || 0) >= 273, "the shell moved at least to v273");
  ok(/v273 - SET YOUR POSITIONS RETURNS TO THE BOARD[\s\S]*?MIGRATION COST: none/.test(SW), "v273's log says no migration");
}

if (failures.length) {
  console.error(`\n✗ board stance return: ${failures.length} failed, ${passed} passed`);
  for (const f of failures.slice(0, 40)) console.error(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`\n✓ board stance return: all ${passed} assertions passed — “Set your positions” goes out carrying the board and comes back to it`);
