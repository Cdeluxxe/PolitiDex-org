#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for the "Prove you live here" button on the five composer boards
// ─────────────────────────────────────────────────────────────────────────────
//   1. THE DOCUMENTS — SD-3, HD-16, SD-7, HD-15 and UT-2 each carry a live
//      <script src="/district-composer.js"> (not one inside an HTML comment)
//      and the composer host for their own seat. A copy of UT-2 with the tag
//      removed fails the same check.
//   2. THE BUTTON — district-composer.js run in a sandbox against the REAL
//      board GET handler (district-board-voice-core.mjs), for every seat:
//        · signed in, no residency row (member or not) → the button paints
//          and a click POSTs /api/residency-verify with THIS board's seat;
//          a Didit session URL is opened, an error keeps the button and
//          prints the function's message or the fallback line;
//        · signed out → no button;
//        · vendor-verified for this seat → no button.
//
//   node scripts/test-residency-prove-button.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { COMPOSER_SEATS, handle } from "../netlify/lib/district-board-voice-core.mjs";
import { authorHash } from "../netlify/lib/district-voice-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let pass = 0;
let fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; } else { fail++; console.error("  ✗ " + msg); }
}
function eq(a, b, msg) { ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`); }
function section(t) { console.log("── " + t); }
const flush = async (n = 10) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };

// Board alias → canonical seat key.
const CLUSTER = {
  "ut-sd-3": "ut-statesenate-3",
  "ut-hd-16": "ut-statehouse-16",
  "ut-sd-7": "ut-statesenate-7",
  "ut-hd-15": "ut-statehouse-15",
  "ut-cd-2": "ut-house-2",
};
const COMPOSER = R("district-composer.js");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · each composer document loads the script that paints the button");
// ═════════════════════════════════════════════════════════════════════════════
// A live tag only: HTML comments are stripped first, so a commented-out tag
// does not count.
function loadsComposer(html, alias) {
  const live = String(html).replace(/<!--[\s\S]*?-->/g, "");
  const tag = /<script\b[^>]*\bsrc="\/district-composer\.js"[^>]*>\s*<\/script>/.test(live);
  const host = new RegExp(`id="pdx-district-composer"[^>]*data-pdxdc-seat="${alias}"`).test(live);
  return tag && host;
}
for (const alias of Object.keys(CLUSTER)) {
  ok(loadsComposer(R(`district-${alias}.html`), alias), `${alias}: does not load /district-composer.js under its composer host`);
}
{
  // THE MUTATION: UT-2 without the tag must fail.
  const cd2 = R("district-ut-cd-2.html");
  const cut = cd2.replace(/<script\b[^>]*\bsrc="\/district-composer\.js"[^>]*>\s*<\/script>/g, "");
  ok(cut !== cd2, "mutation: the UT-2 tag was not found to remove");
  eq(loadsComposer(cut, "ut-cd-2"), false, "mutation: UT-2 without its script tag still passed");
  const commented = cd2.replace(/(<script\b[^>]*\bsrc="\/district-composer\.js"[^>]*>\s*<\/script>)/g, "<!-- $1 -->");
  eq(loadsComposer(commented, "ut-cd-2"), false, "mutation: UT-2 with its tag commented out still passed");
}
{
  const docs = readdirSync(ROOT).filter((f) => /^district-[a-z]{2}-(?:(?:hd|sd|cd)-\d+|gov|us-senate-[a-z][a-z0-9_]*)\.html$/.test(f))
    // A read-only board (composer: false in district-board.js BOARDS — the
    // contested Pennsylvania legislative seats) is on no composer list.
    .filter((f) => !new RegExp("composer: false, alias: '" + ((/data-pdxdb-seat="([^"]+)"/.exec(R(f)) || [, "~"])[1]) + "'").test(R("district-board.js")));
  eq(Object.keys(COMPOSER_SEATS).length, docs.length, "one composer seat per board document");
  const unloaded = docs.filter((f) => !loadsComposer(R(f), (/data-pdxdb-seat="([^"]+)"/.exec(R(f)) || [, ""])[1]));
  eq(unloaded.length, 0, `every board document loads the composer for its own seat — ${JSON.stringify(unloaded)}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the button: signed in + unverified only, and its click starts the check");
// ═════════════════════════════════════════════════════════════════════════════
const UID = "reader-uid-1";

// The real GET handler over an in-memory store.
function boardDeps({ signedIn, verifiedOn = "", member = false }) {
  return {
    async verifyUser() { return signedIn ? { uid: UID, isAnonymous: false } : null; },
    async findResidency(seatKey, hash) {
      if (verifiedOn && seatKey === verifiedOn && hash === authorHash(UID, seatKey)) {
        return { seatKey, status: "verified", method: "vendor" };
      }
      return null;
    },
    async listPosts() { return []; },
    async findMembership() {
      return member ? { status: "active", currentPeriodEnd: "2999-01-01T00:00:00Z" } : null;
    },
    async issueExists() { return false; },
  };
}

function el() {
  return {
    __click: null,
    addEventListener(t, fn) { if (t === "click") this.__click = fn; },
  };
}

// Mount the composer on `alias` with a fake Firebase user (or none). `verify`
// answers POST /api/residency-verify.
async function boardOn(alias, state, verify, { search = "", seats = null } = {}) {
  const calls = [];
  const assigned = [];
  const nodes = {};
  const deps = boardDeps(state);
  const win = {
    console, JSON, String, Number, Boolean, Array, Object, RegExp, Error, Math, Date, Promise, URL,
    encodeURIComponent, decodeURIComponent, parseInt, isNaN,
    setTimeout() { return 0; }, clearTimeout() {},
    location: {
      pathname: `/district/${alias}`, search, hash: "", origin: "https://politidex.fyi",
      assign(u) { assigned.push(String(u)); },
    },
    document: {
      readyState: "complete",
      addEventListener() {},
      getElementById(id) { return nodes[id] || null; },
    },
    auth: {
      currentUser: state.signedIn ? { isAnonymous: false, getIdToken: () => Promise.resolve("tok") } : null,
      onAuthStateChanged() {},
    },
    async fetch(url, init = {}) {
      const u = String(url);
      calls.push({ url: u, method: init.method || "GET", body: init.body ? JSON.parse(init.body) : null });
      if (u.startsWith("/api/residency-verify")) {
        const r = verify || { status: 200, data: { url: "https://verify.didit.me/session/abc" } };
        return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.data };
      }
      const res = await handle(new Request("https://politidex.fyi" + u, { method: "GET" }), deps);
      return { ok: res.ok, status: res.status, json: () => res.json() };
    },
  };
  // The hallway's resolver, when the test puts one on the page.
  if (seats) win.PDXVoice = { seatsForMe: () => seats.map((k) => ({ seatKey: k, label: "x" })) };
  win.window = win;
  // The host re-parses its own markup into one live button, like the DOM would.
  const host = {
    innerHTML: "",
    attrs: { "data-pdxdc-seat": alias },
    __btn: null,
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    querySelector(sel) {
      if (sel === "[data-pdxdc-prove-btn]") {
        if (!/data-pdxdc-prove-btn="1"/.test(this.innerHTML)) return null;
        this.__btn = el();
        return this.__btn;
      }
      return null;
    },
  };
  nodes["pdx-district-composer"] = host;
  vm.runInContext(COMPOSER, vm.createContext(win), { filename: "district-composer.js" });
  await flush();
  return { host, calls, assigned, has: () => /data-pdxdc-prove-btn="1"/.test(host.innerHTML) };
}

// The button sits directly under the locked composer (the form), ahead of the note.
function placedUnderComposer(html) {
  const form = html.indexOf("</form>");
  const prove = html.indexOf('data-pdxdc-prove="1"');
  return form !== -1 && prove > form && !/<p class="pdxdb-foot">[^<]*<\/p>\s*<div class="pdxdc-prove"/.test(html);
}

for (const [alias, seatKey] of Object.entries(CLUSTER)) {
  // Signed in, no residency row, not a member — the reader from the report.
  // Membership does not gate the check: the click opens the Didit session.
  {
    const b = await boardOn(alias, { signedIn: true });
    ok(b.has(), `${alias}: a signed-in reader with no residency row sees no button`);
    ok(b.host.innerHTML.includes("Prove you live here"), `${alias}: the button does not read “Prove you live here”`);
    ok(placedUnderComposer(b.host.innerHTML), `${alias}: the button is not directly under the composer`);
    ok(b.host.__btn && typeof b.host.__btn.__click === "function", `${alias}: the button has no click handler`);
    if (b.host.__btn) b.host.__btn.__click();
    await flush();
    const post = b.calls.find((c) => c.url === "/api/residency-verify");
    ok(!!post, `${alias}: the click never reached /api/residency-verify`);
    eq(post && post.method, "POST", `${alias}: the click is a POST`);
    eq(JSON.stringify(post && post.body), JSON.stringify({ seat: alias, seats: [] }),
      `${alias}: with no resolver on the page the start sends this seat and no resolved seats`);
    eq(post && post.body && post.body.seat, alias, `${alias}: the click carries the board's own seat`);
    eq(b.assigned[0], "https://verify.didit.me/session/abc", `${alias}: a non-member's Didit session URL did not open`);
  }
  // A stale members-only refusal is never shown: the fallback line is.
  {
    const b = await boardOn(alias, { signedIn: true }, {
      status: 403, data: { error: "The ID and address check is open to members.", code: "not_member" },
    });
    if (b.host.__btn) b.host.__btn.__click();
    await flush();
    ok(b.has(), `${alias}: an error took the button off the board`);
    ok(!/members?\b/i.test(b.host.innerHTML), `${alias}: a members-only message is shown`);
    ok(b.host.innerHTML.includes("Residency check is not available right now"),
      `${alias}: a members-only refusal does not print the fallback line`);
    eq(b.assigned.length, 0, `${alias}: an error navigated somewhere`);
  }
  // Any other refusal still prints the function's own message.
  {
    const b = await boardOn(alias, { signedIn: true }, {
      status: 403, data: { error: "Your ID and address check is already done. It covered the seats your saved location named when you ran it, and this seat was not one of them.", code: "already_checked" },
    });
    if (b.host.__btn) b.host.__btn.__click();
    await flush();
    ok(b.host.innerHTML.includes("this seat was not one of them."), `${alias}: the function's message is not shown`);
  }
  // Signed in member, success → the Didit URL opens.
  {
    const b = await boardOn(alias, { signedIn: true, member: true });
    ok(b.has(), `${alias}: a signed-in member with no residency row sees no button`);
    if (b.host.__btn) b.host.__btn.__click();
    await flush();
    eq(b.assigned[0], "https://verify.didit.me/session/abc", `${alias}: the Didit session URL did not open`);
  }
  // An error with no message → the fallback line, button still there.
  {
    const b = await boardOn(alias, { signedIn: true }, { status: 503, data: {} });
    if (b.host.__btn) b.host.__btn.__click();
    await flush();
    ok(b.has(), `${alias}: a bare error took the button off`);
    ok(b.host.innerHTML.includes("Residency check is not available right now"),
      `${alias}: a bare error does not print the fallback line`);
  }
  // Every URL off Didit's hosts is refused — Veriff's included, now that no
  // Veriff session can be created.
  for (const bad of [
    "https://evil.example/x",
    "https://alchemy.veriff.com/v/abc",
    "https://magic.veriff.me/v/abc",
    "https://didit.me.evil.example/x",
    "https://evildidit.me/x",
    "http://verify.didit.me/session/abc",
    "javascript:alert(1)",
    "",
  ]) {
    const b = await boardOn(alias, { signedIn: true }, { status: 200, data: { url: bad } });
    if (b.host.__btn) b.host.__btn.__click();
    await flush();
    eq(b.assigned.length, 0, `${alias}: ${JSON.stringify(bad)} was opened`);
    ok(b.has(), `${alias}: refusing ${JSON.stringify(bad)} took the button off`);
  }
  for (const good of ["https://verify.didit.me/en/session/3FaJ9wLqX2Mz", "https://didit.me/session/abc"]) {
    const b = await boardOn(alias, { signedIn: true, member: true }, { status: 200, data: { url: good } });
    if (b.host.__btn) b.host.__btn.__click();
    await flush();
    eq(b.assigned[0], good, `${alias}: the Didit URL ${good} did not open`);
  }
  // Back from Didit, which appends its own query to the return address.
  for (const search of ["?residency=returned", "?residency=returned?verificationSessionId=s1&status=Approved",
                        "?residency=returned&verificationSessionId=s1&status=Approved"]) {
    const b = await boardOn(alias, { signedIn: true, member: true }, null, { search });
    ok(b.host.innerHTML.includes("Your check is with the vendor."), `${alias}: ${search} is not read as back from the vendor`);
  }
  // Signed out → no button, and nothing calls the function.
  {
    const b = await boardOn(alias, { signedIn: false });
    ok(!b.has(), `${alias}: a signed-out reader sees the button`);
    ok(!b.calls.some((c) => c.url.startsWith("/api/residency-verify")), `${alias}: signed out still called the function`);
  }
  // Verified for THIS seat → no button.
  {
    const b = await boardOn(alias, { signedIn: true, verifiedOn: seatKey, member: true });
    ok(!b.has(), `${alias}: a reader verified for this seat sees the button`);
    eq(b.host.attrs["data-pdxdc-state"], "open", `${alias}: a verified reader's composer did not open`);
  }
}

// ONE CHECK, EVERY RESOLVED SEAT: the start carries the hallway's seat keys,
// statewide blanks dropped and repeats folded, read from PDXVoice.seatsForMe().
for (const alias of Object.keys(CLUSTER)) {
  const resolved = ["ut-statehouse-15", "", "ut-house-2", "ut-statesenate-6", "ut-house-2"];
  const b = await boardOn(alias, { signedIn: true }, null, { seats: resolved });
  if (b.host.__btn) b.host.__btn.__click();
  await flush();
  const post = b.calls.find((c) => c.url === "/api/residency-verify");
  eq(JSON.stringify(post && post.body && post.body.seats), JSON.stringify(["ut-statehouse-15", "ut-house-2", "ut-statesenate-6"]),
    `${alias}: the start sends the hallway's resolved seat keys`);
  eq(post && post.body && post.body.seat, alias, `${alias}: …alongside this board's own seat`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the shell moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  const SW = R("sw.js");
  ok(Number(((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]) || 0) >= 331, "the shell moved at least to v331");
  ok(/v330 - [\s\S]*?MIGRATION COST: none/.test(SW), "v330's log says no migration");
  ok(/v331 - [\s\S]*?MIGRATION COST: none/.test(SW), "v331's log says no migration");
  ok(Number(((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]) || 0) >= 332, "the shell moved at least to v332");
  ok(/v332 - [\s\S]*?MIGRATION COST: none/.test(SW), "v332's log says no migration");
  ok(Number(((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]) || 0) >= 334, "the shell moved at least to v334");
  ok(/v334 - [\s\S]*?MIGRATION COST: none/.test(SW), "v334's log says no migration");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
