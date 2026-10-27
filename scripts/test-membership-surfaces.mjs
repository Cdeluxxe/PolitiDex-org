#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-membership-surfaces.mjs — membership is named next to District Voice
// ─────────────────────────────────────────────────────────────────────────────
// What must stay true:
//
//   1. THE HOMEPAGE CARD AND /voice each carry one gold line, "Membership lifts
//      the daily cap for verified residents.", linking to /me#membership —
//      under the card's body and under the hallway's intro — and /me has that
//      #membership anchor inside its membership block.
//   2. ON A BOARD, a signed-in reader GET /api/membership calls not a member
//      sees one plain "Become a member" link to /me#membership, directly under
//      the locked line. A member, a signed-out reader and a failed read see
//      none — and the link carries no price, cap or month copy.
//   3. THE RESIDENCY CHECK NEVER ASKS MEMBERSHIP. canProve() and prove() do not
//      read it; the Prove button shows and starts for a non-member as before.
//   4. /me: "Become a member — $20 a year" is the block's primary control, with
//      "See your district rooms" (/voice) directly under it.
//   5. No equity, stock, share or earn language; membership is still said not
//      to verify residency or open a seat; the shell moved.
//
//   node scripts/test-membership-surfaces.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HEAD = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const flush = async (n = 12) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };

const LINE = "Membership lifts the daily cap for verified residents.";
const HREF = "/me#membership";
const LINK = `<a href="${HREF}">${LINE}</a>`;
const EQUITY = /\bequity\b|\bstocks?\b|\bshares?\b|\bshareholders?\b|\bearn(?:s|ed|ing|ings)?\b|\binvest/i;
const live = (html) => String(html).replace(/<!--[\s\S]*?-->/g, "");
const text = (html) => String(html).replace(/<[^>]+>/g, " ");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the homepage card and /voice name membership, and /me answers the link");
{
  const idx = live(R("index.html"));
  const card = (/<div class="pdxhv-card">[\s\S]*?<\/div>/.exec(idx) || [""])[0];
  ok(card.includes(LINK), "the homepage District Voice card carries the line, linked to /me#membership");
  const body = card.indexOf('class="pdxhv-line"'), line = card.indexOf(LINK), door = card.indexOf('id="pdx-home-voice-door"');
  ok(body >= 0 && line > body && door > line, "…directly under the card's body, above its door");
  ok(/class="pdxvm-member"/.test(card) && /\.pdxvm-member a\{color:#f5c842;/.test(idx), "…in the card's own gold (#f5c842, the kicker's colour)");
  eq(idx.split(LINE).length - 1, 1, "…once on the page");

  const voice = live(R("voice.html"));
  const sub = voice.indexOf('class="pdxvr-sub"'), vline = voice.indexOf(LINK), standing = voice.indexOf('id="pdx-voice-standing"');
  ok(sub >= 0 && vline > sub && standing > vline, "/voice carries the line under the intro, above the seat list");
  ok(/class="pdxvm-member"/.test(voice) && /\.pdxvm-member a \{ color: #f5c842;/.test(voice), "…in the same gold");
  eq(voice.split(LINE).length - 1, 1, "…once on the page");

  const me = live(R("me.html"));
  const block = (/<section class="pdx-me-membership"[\s\S]*?<\/section>/.exec(me) || [""])[0];
  ok(/id="membership"/.test(block), "/me has the #membership anchor inside its membership block");
  eq((me.match(/id="membership"/g) || []).length, 1, "…exactly one");
  ok(/Membership does not verify residency and does not open a seat/.test(block), "/me still says membership does not verify residency or open a seat");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · on a board, only a signed-in non-member sees “Become a member”");
const COMPOSER = R("district-composer.js");
const ALIAS = "ut-hd-16";
// The voice read for a signed-in, unverified reader (or a signed-out one), as the
// server's GET shapes it: locked, with the locked line.
const LOCKED = "Only verified residents of this seat get a voice that counts.";
async function board({ signedIn, membership, open = false }) {
  const calls = [];
  const nodes = {};
  const win = {
    console, JSON, String, Number, Boolean, Array, Object, RegExp, Error, Math, Date, Promise, URL,
    encodeURIComponent, decodeURIComponent, parseInt, isNaN,
    setTimeout() { return 0; }, clearTimeout() {},
    location: { pathname: `/district/${ALIAS}`, search: "", hash: "", origin: "https://politidex.fyi", assign() {} },
    document: { readyState: "complete", addEventListener() {}, getElementById(id) { return nodes[id] || null; } },
    auth: { currentUser: signedIn ? { isAnonymous: false, getIdToken: () => Promise.resolve("tok") } : null, onAuthStateChanged() {} },
    async fetch(url, init = {}) {
      const u = String(url);
      calls.push({ url: u, method: init.method || "GET" });
      if (u.startsWith("/api/membership")) {
        if (membership === "fail") return { ok: false, status: 500, json: async () => ({}) };
        return { ok: true, status: 200, json: async () => ({ signedIn: !!signedIn, member: membership === "member" }) };
      }
      if (u.startsWith("/api/district-board-voice")) {
        const voice = open ? { canPost: true, reason: "ok", line: "" }
          : { canPost: false, reason: signedIn ? "unverified" : "signed_out", line: LOCKED };
        return { ok: true, status: 200, json: async () => ({ posts: [], voice }) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    },
  };
  win.window = win;
  const host = {
    innerHTML: "", attrs: { "data-pdxdc-seat": ALIAS },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    querySelector() { return null; }, querySelectorAll() { return []; },
  };
  nodes["pdx-district-composer"] = host;
  vm.runInContext(COMPOSER, vm.createContext(win), { filename: "district-composer.js" });
  await flush();
  return { html: host.innerHTML, calls };
}
const linkOf = (html) => (/<p class="pdxdc-member" data-pdxdc-member="1">([\s\S]*?)<\/p>/.exec(html) || [])[1] || "";
{
  const non = await board({ signedIn: true, membership: "non" });
  const a = linkOf(non.html);
  eq(a, `<a class="pdxdc-member-a" href="${HREF}">Become a member</a>`, "a signed-in non-member sees one plain “Become a member” link to /me#membership");
  const locked = non.html.indexOf('data-pdxdc-locked="1"'), link = non.html.indexOf('data-pdxdc-member="1"'), form = non.html.indexOf("<form");
  ok(locked >= 0 && link > locked && form > link, "…directly under the locked line, above the composer form");
  ok(/Prove you live here/.test(non.html), "…and the residency check's button is still there for them");
  ok(!/\$20|\bcaps?\b|\bmonths?\b|\bmonthly\b|\bmembership\b/i.test(text(non.html)), "…and the board's composer area carries no price, cap, month or membership copy");
  eq(non.calls.filter((c) => c.url.startsWith("/api/membership")).length, 1, "…from one read of the caller's own flag");

  const mem = await board({ signedIn: true, membership: "member" });
  eq(linkOf(mem.html), "", "a member sees no link");
  const out = await board({ signedIn: false, membership: "non" });
  eq(linkOf(out.html), "", "a signed-out reader sees no link");
  eq(out.calls.filter((c) => c.url.startsWith("/api/membership")).length, 0, "…and the board never asks membership for them");
  const fail = await board({ signedIn: true, membership: "fail" });
  eq(linkOf(fail.html), "", "a failed membership read shows no link");
  const open = await board({ signedIn: true, membership: "non", open: true });
  ok(linkOf(open.html).includes("Become a member"), "a verified non-member with the box open still sees it under the locked line");
  ok(open.html.indexOf('data-pdxdc-member="1"') > open.html.indexOf('data-pdxdc-locked="1"'), "…in the same place");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the residency check never asks membership");
{
  // A function's text: from its declaration to the next top-level one.
  const body = (name) => {
    const at = COMPOSER.indexOf(`\n  function ${name}(`);
    if (at < 0) return "";
    const ends = ["\n  function ", "\n  // ── ", "\n  var "].map((m) => COMPOSER.indexOf(m, at + 1)).filter((x) => x > at);
    return COMPOSER.slice(at, ends.length ? Math.min(...ends) : COMPOSER.length);
  };
  for (const f of ["canProve", "prove", "proveHtml"]) {
    const b = body(f);
    ok(b.length > 20, `${f}() is where the harness expects it`);
    ok(!/MEMBER_API|loadMember|(?<![a-z])_member\b|\/api\/membership/.test(b), `${f}() never reads membership`);
  }
  eq((COMPOSER.match(/fetch\(MEMBER_API/g) || []).length, 1, "the composer reads /api/membership in exactly one place (the link)");
  ok(!/\/api\/membership['"]/.test(COMPOSER.replace(/var MEMBER_API = '\/api\/membership';/, "")), "…and names the endpoint only through MEMBER_API");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · /me: the join button is the primary control, with the rooms link under it");
async function meBlock({ signedIn, member }) {
  const nodes = {};
  const act = { innerHTML: "", addEventListener() {} };
  nodes["pdx-me-membership-act"] = act;
  const win = {
    console, JSON, String, Number, Boolean, Array, Object, RegExp, Error, Math, Date, Promise, URLSearchParams,
    setTimeout() { return 0; }, clearTimeout() {},
    location: { search: "", assign() {} },
    document: { readyState: "complete", addEventListener() {}, getElementById(id) { return nodes[id] || null; } },
    PDXAuth: { known: true },
    auth: { currentUser: signedIn ? { isAnonymous: false, getIdToken: () => Promise.resolve("tok") } : null, onAuthStateChanged() {} },
    async fetch() { return { ok: true, status: 200, json: async () => ({ signedIn: !!signedIn, member: !!member }) }; },
  };
  win.window = win;
  const ctx = vm.createContext(win);
  vm.runInContext("var auth = window.auth;", ctx);
  vm.runInContext(R("me-membership.js"), ctx, { filename: "me-membership.js" });
  await flush();
  return act.innerHTML;
}
{
  const h = await meBlock({ signedIn: true, member: false });
  ok(/<button type="button" class="pdxmm-join pdxmm-join--primary" data-pdxmm-join="1">Become a member — \$20 a year<\/button>/.test(h),
    "a signed-in non-member gets “Become a member — $20 a year” as the primary control");
  const btn = h.indexOf("pdxmm-join--primary"), rooms = h.indexOf('<p class="pdxmm-rooms" data-pdxmm-rooms="1"><a href="/voice">See your district rooms</a></p>');
  ok(btn >= 0 && rooms > btn, "…with “See your district rooms” (/voice) directly under it");
  ok(/\.pdxmm-join--primary \{[\s\S]*?background: linear-gradient\(135deg, #fad96a, #e6b800\);/.test(R("me-desk.css")), "…styled as the block's primary control, in the District Voice gold");
  ok(!/pdxmm-join--primary/.test(await meBlock({ signedIn: true, member: true })), "a member gets no join button");
  ok(!/pdxmm-join--primary/.test(await meBlock({ signedIn: false })), "a signed-out reader gets no join button");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · copy and shipping");
{
  const copy = [LINE, "Become a member", "See your district rooms", "Become a member — $20 a year"].join(" ");
  ok(!EQUITY.test(copy), "the new copy carries no equity, stock, share or earn language");
  for (const f of ["index.html", "voice.html", "me.html"]) {
    const t = text(live(R(f)));
    const near = t.slice(Math.max(0, t.indexOf(LINE.slice(0, 20)) - 400), t.indexOf(LINE.slice(0, 20)) + 400);
    ok(!/\bequity\b|\bstocks?\b|\bshareholders?\b|\bearn(?:s|ed|ing)?\b/i.test(near), `${f}: no equity language around the membership line`);
  }
  const SW = R("sw.js");
  for (const f of ["/index.html", "/voice.html", "/me.html", "/me-desk.css", "/district-composer.js", "/district-board.css"]) {
    if (f === "/index.html") continue; // precached as '/'
    ok(SW.includes(`'${f}',`), `${f} is precached`);
  }
  const v = (src) => +((/CACHE_VERSION = 'v(\d+)'/.exec(src || "") || [])[1] || 0);
  const head = HEAD("sw.js");
  if (head != null && HEAD("district-composer.js") !== COMPOSER) ok(v(SW) > v(head), "the shell version moved");
  else passed++;
  ok(/MIGRATION COST: none\.\nconst CACHE_VERSION = 'v\d+';/.test(SW), "the latest service-worker note says no migration");
}

console.log(`\n${failures.length ? "✗" : "✓"} membership surfaces: ${passed} passed, ${failures.length} failed`);
if (failures.length) { failures.forEach((f) => console.log("   ✗ " + f)); process.exit(1); }
