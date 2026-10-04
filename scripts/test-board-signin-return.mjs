#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-board-signin-return.mjs — sign-in from a district board returns to it
// ─────────────────────────────────────────────────────────────────────────────
// From /district/ut-sd-3, "Join the People" in the chrome and the composer's
// "Sign in to start" both sent the reader to '/' with no account sheet, and the
// board that asked for an account never saw them again. Same class of bug /find
// already fixed with PDXReturn, and the fix is the same owner: every sign-in
// door on a board records the board as PDXReturn's `next`, the front page opens
// the sheet on that arrival, and closing it (sign-in or dismiss) spends the
// intent through PDXReturn.consume().
//
// Everything below runs the SHIPPED code — PDXReturn sliced out of its owner,
// the generated pdx-return.js, shell-account-chip.js, district-composer.js and
// the two front-page pieces of compare-hub.js — against a location it records
// rather than follows.
//
//   node scripts/test-board-signin-return.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { returnSlice, renderReturn } from "./gen-pdx-return.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => {
  if (c) return;
  console.error(`✗ board sign-in return: STALE HARNESS — ${m}`);
  process.exit(2);
};
const flush = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };

const LOC = R("voter-hub-location.js");
const RET_SRC = returnSlice(LOC);
const PDX_RETURN_FILE = R("pdx-return.js");
const CHIP = R("shell-account-chip.js");
const COMPOSER = R("district-composer.js");
const HUB = R("compare-hub.js");
const SW = R("sw.js");

const SD3 = "/district/ut-sd-3";
const HD29 = "/district/ut-hd-29";
const joinFor = (p) => `/?join=1&next=${encodeURIComponent(p)}`;

// ── A WINDOW THAT RECORDS NAVIGATION ─────────────────────────────────────────
function makeWin(pathname, search, extra = {}) {
  const nodes = {};
  const win = {
    console, JSON, String, Number, Boolean, Array, Object, RegExp, Error, Math, Date, Promise,
    encodeURIComponent, decodeURIComponent, parseInt, isNaN, setImmediate,
    __assigned: [],
    __timers: [],
    setTimeout(fn, ms) { win.__timers.push({ fn, ms }); return win.__timers.length; },
    clearTimeout() {},
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    location: {
      pathname: pathname || "/", search: search || "", hash: "", origin: "https://politidex.fyi",
      assign(u) { win.__assigned.push(String(u)); },
      replace(u) { win.__assigned.push(String(u)); },
    },
    document: {
      readyState: "complete",
      body: { style: {} },
      addEventListener() {},
      getElementById(id) { return nodes[id] || null; },
      querySelector() { return null; },
    },
    __nodes: nodes,
    ...extra,
  };
  win.window = win;
  win.self = win;
  return win;
}
function node(id, attrs = {}) {
  return {
    id, innerHTML: "", style: {}, attrs: { ...attrs },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    querySelector() { return null; },
  };
}
function run(win, src, name) {
  if (!win.__ctx) win.__ctx = vm.createContext(win);
  vm.runInContext(src, win.__ctx, { filename: name });
  return win;
}
const hrefOf = (html, cls) => {
  const m = new RegExp(`<a class="${cls}"[^>]*href="([^"]*)"`).exec(html) ||
    new RegExp(`<a[^>]*class="${cls}"[^>]*href="([^"]*)"`).exec(html);
  return m ? m[1].replace(/&amp;/g, "&") : null;
};

// ── THE BOARD SIDE: WHAT JOIN AND "SIGN IN TO START" POINT AT ────────────────
function chipOn(pathname, { board = true, ret = "file" } = {}) {
  const win = makeWin(pathname, "", {
    PDXAuth: { known: true, state: "out", user: null },
    __PDX_DISTRICT_BOARD_DOC: board ? true : undefined,
  });
  win.__nodes["pdx-shell-acct"] = node("pdx-shell-acct");
  if (ret === "file") run(win, PDX_RETURN_FILE, "pdx-return.js");
  if (ret === "owner") run(win, RET_SRC, "voter-hub-location.js#PDXReturn");
  run(win, CHIP, "shell-account-chip.js");
  return { win, href: hrefOf(win.__nodes["pdx-shell-acct"].innerHTML, "pdx-acct pdx-acct--join") };
}

async function composerOn(pathname, voice) {
  const win = makeWin(pathname, "", {
    fetch() {
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve({ posts: [], postsEmpty: "", voice }),
      });
    },
  });
  win.__nodes["pdx-district-composer"] = node("pdx-district-composer", { "data-pdxdc-seat": "ut-sd-3" });
  run(win, PDX_RETURN_FILE, "pdx-return.js");
  run(win, COMPOSER, "district-composer.js");
  await flush();
  const html = win.__nodes["pdx-district-composer"].innerHTML;
  return { win, html, href: hrefOf(html, "pdxdc-signin") };
}

// ── THE FRONT PAGE: THE SHEET, AND WHAT CLOSING IT DOES ─────────────────────
function sliceFn(src, open, close) {
  const a = src.indexOf(open);
  must(a >= 0, `compare-hub.js no longer has ${open.trim()}`);
  const b = src.indexOf(close, a);
  must(b > a, `compare-hub.js: ${open.trim()} has no end this suite can find`);
  return src.slice(a, b + close.length);
}
const CLOSE_SRC = sliceFn(HUB, "    function closeAuthModal() {", "\n    }\n");
const ARRIVAL_SRC = sliceFn(HUB, "    function _joinArrival() {", "    else _joinArrival();");

// Arrive on the front page by following `href`, with PDXReturn from its OWNER
// (index.html loads voter-hub-location.js) — or from a mutated copy of it.
function frontPage(href, { state = "out", retSrc = RET_SRC } = {}) {
  const u = new URL(href, "https://politidex.fyi");
  const win = makeWin(u.pathname, u.search, { PDXAuth: { known: true, state, user: null } });
  const overlay = node("auth-overlay");
  win.__nodes["auth-overlay"] = overlay;
  win.__nodes["modal-overlay"] = { style: { display: "none" } };
  win.__nodes["comment-overlay"] = { style: { display: "none" } };
  win.__opened = 0;
  win.__authCbs = [];
  win.auth = { onAuthStateChanged(cb) { win.__authCbs.push(cb); return () => {}; } };
  run(win, retSrc, "voter-hub-location.js#PDXReturn");
  // compare-hub.js is a synchronous script, so the page is still loading when
  // it runs and _joinArrival waits for DOMContentLoaded. Each case below fires
  // that moment itself, once.
  win.document.readyState = "loading";
  run(win, "function openAuthModal(){ window.__opened++; }\n" + CLOSE_SRC + "\n" + ARRIVAL_SRC +
    "\nwindow.closeAuthModal = closeAuthModal;", "compare-hub.js[auth]");
  return win;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · SD-3: Join and the composer's sign-in line carry /district/ut-sd-3");
// ═════════════════════════════════════════════════════════════════════════════
{
  const { href } = chipOn(SD3);
  eq(href, joinFor(SD3), "SD-3 chrome: Join does not carry the board as its intent");

  const signedOut = {
    canPost: false, reason: "signed_out",
    line: "Only verified residents of this seat get a voice that counts.",
    note: "Sign in to start. Reading stays open to everyone.",
  };
  const c = await composerOn(SD3, signedOut);
  eq(c.href, joinFor(SD3), "SD-3 composer: “Sign in to start” does not carry the board as its intent");
  ok(/data-pdxdc-signin="1"[^>]*>Sign in to start\./.test(c.html),
    "SD-3 composer: the sign-in line is not a link reading “Sign in to start.”");

  // A signed-in, unverified reader is not asked to sign in again.
  const u = await composerOn(SD3, { ...signedOut, reason: "unverified", note: "Verification is not connected." });
  eq(u.href, null, "SD-3 composer: an unverified (already signed-in) reader was handed a sign-in link");
  ok(u.html.includes("Verification is not connected."), "SD-3 composer: the unverified note stopped printing");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · after the sheet settles, the reader is back on the board");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Signed out on arrival → the sheet opens; ✕ (a dismiss) sends them back.
  const w = frontPage(joinFor(SD3));
  w._joinArrival();
  eq(w.__opened, 1, "front page: the arrival from SD-3's Join did not open the account sheet");
  eq(w.__assigned.length, 0, "front page: the reader was moved before the sheet settled");
  w.closeAuthModal();
  eq(w.__assigned[0], SD3, "dismiss: closing the sheet did not land on /district/ut-sd-3");
  ok(!w.__assigned.some((a) => a === "/" || a === "/me" || /who-represents-me/.test(a)),
    "dismiss: the settle landed somewhere that was not the saved intent");

  // A successful sign-in also ends in closeAuthModal() (every success path in
  // compare-hub.js calls it); the settle is the same call.
  const s = frontPage(joinFor(SD3));
  s._joinArrival();
  s.PDXAuth.state = "in";
  s.closeAuthModal();
  eq(s.__assigned[0], SD3, "sign-in: a completed sign-in did not land on /district/ut-sd-3");

  // Already signed in when they arrive → no sheet, straight back.
  const already = frontPage(joinFor(SD3), { state: "in" });
  already._joinArrival();
  eq(already.__opened, 0, "already in: the sheet opened for a reader who is signed in");
  eq(already.__assigned[0], SD3, "already in: the reader was not sent straight back to the board");

  // Auth not known yet → wait for Firebase, then open.
  const cold = frontPage(joinFor(SD3));
  cold.PDXAuth = { known: false, state: "unknown" };
  cold._joinArrival();
  eq(cold.__opened, 0, "cold: the sheet opened before Firebase answered");
  cold.PDXAuth = { known: true, state: "out" };
  cold.__authCbs.forEach((cb) => cb(null));
  eq(cold.__opened, 1, "cold: the sheet did not open once Firebase answered signed-out");
  cold.__authCbs.forEach((cb) => cb(null));
  eq(cold.__opened, 1, "cold: a second auth announcement opened the sheet twice");

  // The composer's link is the same address, so it settles the same way.
  const c = await composerOn(SD3, { canPost: false, reason: "signed_out", note: "Sign in to start." });
  const cw = frontPage(c.href);
  cw._joinArrival();
  cw.closeAuthModal();
  eq(cw.__assigned[0], SD3, "composer: “Sign in to start” did not come back to /district/ut-sd-3");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · HD-29 (a generated board, read-only) returns to itself");
// ═════════════════════════════════════════════════════════════════════════════
{
  const doc = R("district-ut-hd-29.html");
  ok(doc.includes("__PDX_DISTRICT_BOARD_DOC = true"), "hd-29: the document no longer says it is a board");
  const { href } = chipOn(HD29);
  eq(href, joinFor(HD29), "HD-29 chrome: Join does not carry /district/ut-hd-29");
  const w = frontPage(href);
  w._joinArrival();
  w.closeAuthModal();
  eq(w.__assigned[0], HD29, "HD-29: the settle did not land on /district/ut-hd-29");

  // A congressional board has PDXReturn from its owner, not the copy.
  const cd = chipOn("/district/ut-cd-1", { ret: "owner" });
  eq(cd.href, joinFor("/district/ut-cd-1"), "CD-1 chrome: Join does not carry the board (owner-loaded PDXReturn)");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · no intent, no jump: the front page's own Join and the other shells");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The reader opened / and hit Join: the sheet opens in place, carries no
  // intent, and closing it moves nobody.
  const home = frontPage("/");
  home._joinArrival();
  eq(home.__opened, 0, "/: the arrival handler opened a sheet nobody asked for");
  home.openAuthModal();
  home.closeAuthModal();
  eq(home.__assigned.length, 0, "/: closing the front page's own sheet navigated the reader");
  eq(home.PDXReturn.wantsJoin(), false, "/: a bare front page reports a join intent");
  eq(home.PDXReturn.joinHref("/"), "/", "/: a Join whose door is the front page gained an intent");

  // /voice is not a board: its chip keeps today's plain '/'.
  eq(chipOn("/voice", { board: false }).href, "/", "/voice: the chrome's Join grew a board intent");
  // A board whose PDXReturn failed to load degrades to today's '/'.
  eq(chipOn(SD3, { ret: "none" }).href, "/", "SD-3 without PDXReturn: Join is not the plain '/'");

  // A location `next` (from /find's door) never rides a sign-in out of the page.
  const loc = frontPage("/?next=%2Fvoice");
  loc.closeAuthModal();
  eq(loc.__assigned.length, 0, "location intent: closing the sheet spent a finder `next`");
  // A mangled intent with the marker lands nowhere — never /voice, never /.
  const bad = frontPage("/?join=1&next=%2F%2Fevil.example");
  bad._joinArrival();
  bad.closeAuthModal();
  eq(bad.__assigned.length, 0, "mangled: a join with an off-origin next navigated the reader");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · mutation: without consume() the reader is left on /");
// ═════════════════════════════════════════════════════════════════════════════
{
  const CALL = "      window._pdxAuthSettled = true;\n      return consume();";
  ok(RET_SRC.includes(CALL), "authSettled() no longer spends the intent through consume()");
  const mutant = RET_SRC.replace(CALL, "      window._pdxAuthSettled = true;\n      return false;");
  const w = frontPage(joinFor(SD3), { retSrc: mutant });
  w._joinArrival();
  w.closeAuthModal();
  eq(w.__assigned.length, 0, "mutation: dropping consume() still moved the reader — section 2 proves nothing");
  ok(w.__assigned[0] !== SD3, "mutation: the mutant reached the board anyway");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · one owner: the copy, the tags and the shell");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(PDX_RETURN_FILE === renderReturn(LOC),
    "pdx-return.js drifted from voter-hub-location.js — run node scripts/gen-pdx-return.mjs");
  ok(!/[?&]next=|'next'/.test(CHIP.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")),
    "shell-account-chip.js spells the intent parameter itself");
  ok(!/[?&]next=|'next'/.test(COMPOSER.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")),
    "district-composer.js spells the intent parameter itself");

  // Every BOARD_ROUTES page has PDXReturn before its chip.
  const DV = R("district-voice.js");
  const routes = [...DV.matchAll(/'(\/district\/ut-[a-z]{2}-\d+)'/g)].map((m) => m[1]);
  must(routes.length > 80, `BOARD_ROUTES has too few rows to test (${routes.length})`);
  for (const r of new Set(routes)) {
    const f = `district-${r.split("/").pop()}.html`;
    const doc = R(f);
    const chipAt = doc.indexOf('src="/shell-account-chip.js"');
    const retAt = Math.max(doc.indexOf('src="/pdx-return.js"'), doc.indexOf('src="/voter-hub-location.js"'));
    ok(chipAt > 0 && retAt > 0 && retAt < chipAt, `${f}: PDXReturn is not loaded before the account chip`);
  }
  ok(R("district-ut-sd-3.html").indexOf('src="/pdx-return.js"') <
    R("district-ut-sd-3.html").indexOf('src="/district-composer.js"'),
    "district-ut-sd-3.html: PDXReturn is not loaded before the composer");

  ok(SW.includes("  '/pdx-return.js',"), "sw.js: /pdx-return.js is not precached");
  const ver = (SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1];
  ok(Number(ver) >= 257, `sw.js: CACHE_VERSION is v${ver}; the board shells changed and it did not move`);
  ok(/v257 - [\s\S]*?MIGRATION COST: none/.test(SW), "sw.js: the v257 entry does not say migration none");
}

console.log("");
if (failures.length) {
  for (const f of failures) console.log(`   ✗ ${f}`);
  console.log(`\n✗ board sign-in return: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ board sign-in return: all ${passed} assertions passed — Join and “Sign in to start” go out carrying the board and come back to it`);
