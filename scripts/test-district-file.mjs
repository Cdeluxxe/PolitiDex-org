#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-district-file.mjs — one page per Utah district, and it is a list of doors
// ─────────────────────────────────────────────────────────────────────────────
// The district file is /d/<districtKey>: a neighbour's way into District Voice
// that is neither a pasted /d/<district>/<issue> URL nor the open forum. That
// sentence is the product rule, and every assertion below is one of its edges.
//
//   1. ONE ADDRESS, AND IT IS NOT THE ROOM'S. /d/<districtKey> takes exactly one
//      segment. The file's pattern refuses a room's address and the room's
//      pattern refuses a file's, so neither surface can open the other's URL.
//   2. THE PAGE IS WHAT THE BRIEF ASKED FOR. The district's own title, the
//      seated member as a link to their person file, the one line about who may
//      post, and a list of issue rooms with integer counts and a way in.
//   3. lands_preserve IS ON THE LIST FOR HD-68, AND IT OPENS THE EXISTING ROOM.
//      The room exists as a dd_threads row seeded by a migration, so it is a fact
//      of the schema in every environment rather than a side effect of somebody
//      having posted.
//   4. WHO REPRESENTS ME LEADS HERE, NOT TO THE FORUM. The HD-68 seat row's
//      control points at /d/ut-statehouse-68 and at nothing else.
//   5. A SIGNED-OUT VISITOR CAN READ IT. No token, no Authorization header, no
//      residency and no account in either request.
//   6. IT ASKS FOR NOTHING. No post, no Ask, no Grant, no poll answer, no
//      payment, no message. Residency is untouched.
//   7. NOT A SCORECARD. No party letter, no score, no grade, no composite
//      percentage, no ranking vocabulary and none of the verdict palette.
//
//   node scripts/test-district-file.mjs
//
// The client module runs in a node:vm sandbox with a small real DOM alongside
// district-room.js, so "the list carries lands_preserve" and "Open room goes to
// the room's address" are OBSERVED in painted markup rather than asserted about
// source text.

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import {
  DISTRICT_KEY_RE,
  ROOM_PATH_RE,
  ROOM_PREFIX,
  pollResultLine,
  pollTally,
} from "../netlify/lib/district-room-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const FILE_SRC = R("district-file.js");
const FILE_CSS = R("district-file.css");
const ROOM_SRC = R("district-room.js");
const FN_SRC = R("netlify/functions/district-room.mts");
const VR_SRC = R("netlify/functions/voting-record.mts");
const BALLOT_SRC = R("ballot-breakdown.js");
const WRM_SRC = R("who-represents-me.js");
const TOML = R("netlify.toml");
const INDEX = R("index.html");
const SW = R("sw.js");
const SEED_MIGRATION = R(
  "netlify/database/migrations/20261101000000_seed_dd_hd68_district_file_room.sql"
);
const DD_MIGRATION = R(
  "netlify/database/migrations/20261029000000_create_dd_district_discussion_tables/migration.sql"
);

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ district-file: ${msg}`);
  process.exit(1);
};

// Comments have to be able to name what the code refuses to build ("no party
// letter", "not a scorecard"), so every source-level assertion runs over a
// comment-stripped copy.
const strip = (src) =>
  String(src).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

// ═════════════════════════════════════════════════════════════════════════════
// THE SAME SMALL REAL DOM the room's suite uses, for the same reason: the shared
// sandbox returns null from getElementById, which district-file.js treats as
// "there is no page to build in", so the panel would refuse to open and nothing
// below could be observed.
function makeDom(pathname) {
  const win = makeSandbox();
  const nodes = [];
  function node(tag) {
    const n = {
      tagName: String(tag || "div").toUpperCase(),
      id: "", className: "", _html: "", textContent: "", hidden: false,
      children: [], parentNode: null, attrs: {}, disabled: false, scrollTop: 0,
      style: { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
      insertBefore(c, ref) {
        c.parentNode = this;
        const i = this.children.indexOf(ref);
        if (i < 0) this.children.push(c); else this.children.splice(i, 0, c);
        return c;
      },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      closest() { return null; },
      focus() {},
    };
    // The file builds its scroller as TWO containers — the Voice blocks and, under
    // them, the issue rooms — and hands one of them to district-voice.js BY ID. So
    // an assignment here registers the ids it declares as child nodes, in document
    // order, and drops the ones it replaced: without that, every container reads
    // as empty and the rooms list is unobservable.
    Object.defineProperty(n, "innerHTML", {
      enumerable: true, configurable: true,
      get() { return n._html; },
      set(html) {
        const s = String(html == null ? "" : html);
        n._html = s;
        const prune = (kid) => {
          kid.children.forEach(prune);
          const i = nodes.indexOf(kid);
          if (i >= 0) nodes.splice(i, 1);
        };
        n.children.forEach(prune);
        n.children = [];
        for (const m of s.matchAll(/<([a-zA-Z][\w-]*)[^>]*\sid="([^"]+)"/g)) {
          const child = node(m[1]);
          child.id = m[2];
          child.parentNode = n;
          n.children.push(child);
        }
      },
    });
    nodes.push(n);
    return n;
  }
  const body = node("body");
  const on = {};
  const doc = {
    readyState: "complete", cookie: "",
    body,
    head: node("head"),
    documentElement: node("html"),
    createElement: (t) => node(t),
    getElementById: (id) => nodes.find((n) => n.id === id) || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    __on: on,
    addEventListener(type, fn) {
      if (typeof fn !== "function") return;
      (on[String(type)] = on[String(type)] || []).push(fn);
    },
    removeEventListener() {}, dispatchEvent() { return true; },
  };
  const queue = [];
  win.setTimeout = (f, ms) => { queue.push({ f, ms: Number(ms) || 0 }); return queue.length; };
  win.clearTimeout = () => {};
  win.document = doc;
  win.location = {
    href: "https://www.politidex.fyi" + pathname,
    pathname, search: "", hash: "", origin: "https://www.politidex.fyi",
  };
  win.__pushed = [];
  win.history = {
    pushState(s, t, u) { win.__pushed.push(String(u)); },
    replaceState() {},
  };
  win.flushTimers = (maxDelay) => {
    const cap = maxDelay == null ? 0 : maxDelay;
    const due = [];
    for (let i = queue.length - 1; i >= 0; i--) {
      if (queue[i].ms <= cap) due.unshift(queue.splice(i, 1)[0]);
    }
    due.forEach((t) => { try { t.f(); } catch (e) {} });
  };
  return win;
}

// ── THE TWO READS, ANSWERED THE WAY THE FUNCTIONS ANSWER THEM ───────────────
// The district read is the shape netlify/functions/district-room.mts returns for
// GET /district, including a room with answers and a room without, so the counts
// line and the "no answers yet" line are both exercised. The issue-keys read is
// the shape netlify/functions/voting-record.mts returns.
const HD68 = "ut-statehouse-68";
const LANDS_TALLY = pollTally([
  { choice: "support", n: 4 },
  { choice: "oppose", n: 2 },
  { choice: "mixed", n: 1 },
]);
function districtPayload() {
  return {
    districtKey: HD68,
    label: "Utah State House District 68",
    state: "UT",
    seatKey: "statehouse",
    districtNumber: 68,
    rooms: [
      {
        issueKey: "lands_preserve",
        results: LANDS_TALLY,
        resultLine: pollResultLine(LANDS_TALLY),
        answered: true,
      },
      {
        issueKey: "water",
        results: pollTally([]),
        resultLine: pollResultLine(pollTally([])),
        answered: false,
      },
    ],
    issueKeys: ["lands_preserve", "water", "school_choice", "privacy_rights"],
  };
}
const ISSUE_KEYS_PAYLOAD = {
  politicianId: "chew_h68",
  minActs: 3,
  rows: [
    { issueKey: "school_choice", acts: 5 },
    { issueKey: "privacy_rights", acts: 7 },
    // Not in the district-room API's vocabulary → not a door.
    { issueKey: "not_a_shipped_key", acts: 9 },
  ],
};

const PEOPLE = {
  chew_h68: { name: "Scott Chew", office: "Utah State Representative" },
};
const FAMILY = {
  childLabel: (k) => ({
    lands_preserve: "Public lands",
    water: "Water",
    school_choice: "School choice",
    privacy_rights: "Privacy",
  }[k] || ""),
};
const PERSON_LINK = {
  anchor: (pid, label, opts) =>
    `<a class="${(opts && opts.cls) || ""}" href="/p/${pid}" data-pdx-person-link="${pid}">${label}</a>`,
};

// ── THE REAL RESOLVER, NOT A HAND-WRITTEN STUB ──────────────────────────────
// Who holds a seat is answered by window.pdxSeatedMemberFor in ballot-breakdown.js,
// so that file is booted in its own sandbox and the district file is handed the
// REAL function. A stub written to match one argument shape is exactly how HD-68
// came to paint "we have not resolved who holds this seat" over a seat the
// curated map holds: the suite agreed with the caller and neither agreed with the
// resolver. Nothing else from this sandbox is used.
const BALLOT_WIN = (() => {
  const w = makeSandbox();
  w.window = w;
  w.document = {
    readyState: "complete", body: null, addEventListener() {}, removeEventListener() {},
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
  };
  w.setTimeout = () => 0;
  w.clearTimeout = () => {};
  w.location = { pathname: "/", href: "https://www.politidex.fyi/", search: "", hash: "" };
  w.fetch = () => Promise.resolve({ ok: false, status: 0, json: () => Promise.resolve({}) });
  const c = vm.createContext(w);
  vm.runInContext(BALLOT_SRC, c, { filename: "ballot-breakdown.js" });
  return w;
})();
must(typeof BALLOT_WIN.pdxSeatedMemberFor === "function",
  "ballot-breakdown.js did not publish window.pdxSeatedMemberFor");
const seatedFor = (a, b) => BALLOT_WIN.pdxSeatedMemberFor(a, b);

// Boots BOTH modules into one context, room first — which is the order
// index.html loads them in, and the order district-file.js documents.
function boot(pathname, extras) {
  const win = makeDom(pathname || "/");
  win.__calls = [];
  win.fetch = (url, init) => {
    const u = String(url);
    win.__calls.push({ url: u, init: init || {} });
    let status = 200;
    let data = {};
    if (u.indexOf("/api/district-room/district") === 0) {
      const wanted = decodeURIComponent(u.split("district=")[1] || "");
      if (wanted === HD68) data = districtPayload();
      else { status = 404; data = { error: "no district", code: "no_district" }; }
    } else if (u.indexOf("/api/voting-record/member/") === 0) {
      data = ISSUE_KEYS_PAYLOAD;
    }
    return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(data) });
  };
  Object.assign(win, {
    _pdxPersonById: (pid) => PEOPLE[pid] || null,
    pdxSeatedMemberFor: (seatKey, n) => seatedFor(seatKey, n),
    PDXIssueFamily: FAMILY,
    PDXPersonLink: PERSON_LINK,
  }, extras || {});
  const ctx = vm.createContext(win);
  vm.runInContext(ROOM_SRC, ctx, { filename: "district-room.js" });
  vm.runInContext(FILE_SRC, ctx, { filename: "district-file.js" });
  return win;
}

// Runs the arrival boot and drains both reads.
async function settle(win) {
  win.flushTimers();
  for (let i = 0; i < 12; i++) await Promise.resolve();
  win.flushTimers();
  for (let i = 0; i < 12; i++) await Promise.resolve();
}

const W0 = boot("/");
const F = W0.PDXDistrictFile;
must(F && typeof F === "object", "district-file.js did not define window.PDXDistrictFile");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · one address, and it is not the room's");

eq(F.PREFIX, ROOM_PREFIX, "the file and the room share the /d/ prefix");
eq(F.DISTRICT_KEY_RE.source, DISTRICT_KEY_RE.source,
  "the file spells the district key exactly as the gate does");
eq(F.path(HD68), "/d/ut-statehouse-68", "the shipped district has an address");
eq(F.fromPath("/d/ut-statehouse-68"), HD68, "the file parses its own address");
eq(F.fromPath("/d/ut-statehouse-68/"), HD68, "a trailing slash still lands");

// THE TWO PATTERNS CANNOT OVERLAP. This is the whole reason /d/<district> is a
// second surface rather than a mode of the first one.
const ROOM_ADDR = "/d/ut-statehouse-68/lands_preserve";
eq(F.fromPath(ROOM_ADDR), null, "a room's address is not a district file");
ok(!ROOM_PATH_RE.test("/d/ut-statehouse-68"), "a district file's address is not a room");
ok(ROOM_PATH_RE.test(ROOM_ADDR), "and the room's own address still parses as a room");
for (const bad of [
  "/d/", "/d", "/d//", "/d/ut-statehouse-68/lands_preserve/",
  "/d/ut-statehouse-0", "/d/ut-council-68", "/i/lands_preserve",
  "/p/chew_h68", "/", "/d/ut-statehouse-68/lands_preserve/extra",
]) {
  eq(F.fromPath(bad), null, `${bad} is not a district file`);
}
// A KEY IS A KEY WHATEVER CASE IT ARRIVES IN. Somebody pastes a shouted URL out
// of an email; the file it names is the same file.
eq(F.fromPath("/d/UT-STATEHOUSE-68"), HD68, "a shouted address still lands on the same file");
// AND A WELL-SHAPED KEY IS NOT A PROMISE THAT THE DISTRICT EXISTS. Parsing says
// only that the address has a district's shape; whether there is a file is a
// separate question, and only the allow-list answers it.
eq(F.fromPath("/d/xx-statehouse-68"), "xx-statehouse-68", "an unreal state parses as a key");
eq(F.has("xx-statehouse-68"), false, "and still has no file");

// ONE DISTRICT SHIPS, AND THE ALLOW-LIST IS THE ONLY REASON.
eq(Object.keys(F.SHIPPED).join(","), HD68, "exactly one district ships a file today");
for (const other of ["ut-statehouse-1", "ut-statehouse-67", "ut-statesenate-6", "ut-house-2"]) {
  ok(DISTRICT_KEY_RE.test(other), `${other} is a well-shaped district key`);
  eq(F.path(other), "", `${other} has no file yet, so no link to one can be built`);
  eq(F.has(other), false, `${other} reports no file`);
  eq(F.enter(other), false, `${other} opens nothing`);
}

// The address is served this same index.html, which is what makes a cold visit
// possible at all — the same rewrite /p/<pid> and the room one segment deeper use.
has(TOML, '  from = "/d/*"', "netlify.toml rewrites /d/* to the shell");
ok(/from = "\/d\/\*"[\s\S]{0,120}to = "\/index\.html"[\s\S]{0,80}status = 200/.test(TOML),
  "the /d/* rewrite is a 200 rewrite and not a redirect");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a cold visit to /d/ut-statehouse-68 opens the file");

const WA = boot("/d/ut-statehouse-68");
await settle(WA);
eq(WA.PDXDistrictFile.isOpen(), true, "arriving on /d/ut-statehouse-68 opens the district file");
eq(WA.PDXDistrictFile.district(), HD68, "the file that opened is the one the address named");
const panel = WA.document.getElementById("pdx-district-file");
ok(panel && panel.hidden === false, "the file's panel is shown");
eq(panel.attrs["aria-modal"], "true", "the panel is a modal dialog");
eq(panel.attrs["aria-labelledby"], "pdx-district-file-title",
  "the panel is labelled by the district's own name");
// The panel owns the URL it arrived on, so it pushes nothing over it.
eq(WA.__pushed.length, 0, "arriving at the address does not re-stamp it");

const head = WA.document.getElementById("pdx-district-file-head");
const body = WA.document.getElementById("pdx-district-file-scroll");
ok(head && body, "the file painted a header and a body");

// A cold visit to a district with no file paints nothing over the front page.
const WB = boot("/d/ut-statehouse-1");
await settle(WB);
eq(WB.PDXDistrictFile.isOpen(), false, "a district with no file opens nothing on arrival");
eq(WB.__calls.length, 0, "and asks the API nothing about it");

// A cold visit to a ROOM address is the room's business, not this module's.
const WC = boot(ROOM_ADDR);
await settle(WC);
eq(WC.PDXDistrictFile.isOpen(), false, "a room's address does not open the district file");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the title, the seated member, and the one line");

has(head.innerHTML, "Utah State House District 68",
  "the title is the district's own label, as dd_districts spells it");
has(head.innerHTML, "/d/ut-statehouse-68", "the header prints the file's own address");

// THIS SUITE IS THE ROOMS-ONLY CASE, AND THAT IS WHY THE LINE IS HERE.
// district-voice.js is deliberately never booted below (section 4 asserts its
// absence), so every file this suite opens is a file with rooms and no Voice —
// which is also a real device: one that took district-file.js and not
// district-voice.js, and any seat Voice has not opened. On such a file the rooms
// lede IS the lede and it prints exactly as it always has.
//
// Where Voice IS mounted, Voice's own frame sentence leads and this one is
// dropped, because two ledes stacked at the top of a page made the reader
// arbitrate between them. Neither sentence was rewritten to fix that; one of them
// simply stops leading a page it does not describe. That half is asserted in
// scripts/test-district-voice.mjs, which boots both modules — the two suites
// together are the whole rule, and this assertion is the half that guarantees the
// rooms-only file did not change.
has(head.innerHTML,
  "Neighbors, issue by issue. Reading is open. Posting takes a reviewer grant.",
  "the one line says what this place is and who may post in it");
eq(F.COPY.line,
  "Neighbors, issue by issue. Reading is open. Posting takes a reviewer grant.",
  "and that line is owned in exactly one place");
eq((head.innerHTML.match(/pdxdf-line/g) || []).length, 1,
  "printed once, and once only, on a rooms-only file");

// THE SEATED MEMBER IS A NAME AND AN ADDRESS, AND IT IS ON THE LETTERHEAD.
// It sits in the header beside the district's own label because it is a fact
// about the district in the same way the label is — and because the header is
// painted from the ADDRESS on arrival, so the name is there before either GET
// returns and a read that never lands cannot cost the reader the officeholder.
has(head.innerHTML, 'href="/p/chew_h68"', "the seated member links to their person file");
has(head.innerHTML, "Scott Chew", "and is named");
has(head.innerHTML, "data-pdx-person-link=", "through PDXPersonLink, like every other surface");
lacks(body.innerHTML, "pdxdf-seat",
  "and the scrolling list does not repeat the seat, so a repaint cannot flicker it");
// AND NOTHING ELSE. No party letter, no score, no grade, no percentage.
for (const f of ["(R)", "(D)", "Republican", "Democrat", "score", "Score", "%", "grade",
  "Kept", "Broken", "Direction Match"]) {
  lacks(head.innerHTML, f, `the seated member's block carries no ${f}`);
}

// THE ADDRESS ALONE IS ENOUGH, WHICH IS THE BUG THIS PAGE HAD. HD-68 painted
// "we have not resolved who holds this seat" over a seat that is curated, because
// the seat was asked for in ONE argument shape and the answer was dropped when
// the payload was not carrying that shape. The builder is handed the district key
// and nothing else here — no payload at all — and still names the member.
const seatFromKeyOnly = F.seatedHtml(HD68, null);
has(seatFromKeyOnly, 'href="/p/chew_h68"',
  "the seated member resolves from the district key with no payload");
has(seatFromKeyOnly, "Scott Chew", "and is named from it");
lacks(seatFromKeyOnly, F.COPY.seatedNone,
  "so the unresolved sentence is not printed over a seat we hold");
// A payload whose seat fields are missing or spelled some other way cannot undo
// it either: the key is the authority and the pair is only a shortcut.
has(F.seatedHtml(HD68, { label: "Utah State House District 68" }), 'href="/p/chew_h68"',
  "a payload with no seat fields still resolves through the address");
has(F.seatedHtml(HD68, { seatKey: "", districtNumber: null }), 'href="/p/chew_h68"',
  "and so does one carrying empty ones");

// A DISTRICT WHOSE SEAT IS NOT CURATED STILL SAYS SO. The honest answer is not
// removed by any of the above — it is what an unmapped district gets.
const seatUnmapped = F.seatedHtml("ut-statehouse-1", null);
has(seatUnmapped, F.COPY.seatedNone,
  "an unmapped district says we have not resolved who holds the seat");
lacks(seatUnmapped, 'href="/p/', "and links to nobody");
eq(F.COPY.seatedNone, "We have not resolved who holds this seat.",
  "and that sentence is owned in exactly one place");

// The seat is resolved from the ADDRESS, not from the reader. A visitor with no
// location, no account and no resolver still gets the officeholder.
ok(!/pdxRepsForMe|pdxSeatHolders|_currentVoterLocation/.test(strip(FILE_SRC)),
  "the file never consults the reader's own location to name the seat");
has(strip(FILE_SRC), "window.pdxSeatedMemberFor",
  "it asks the location-independent resolver instead");
has(strip(BALLOT_SRC), "window.pdxSeatedMemberFor = function",
  "ballot-breakdown.js publishes that resolver");
ok(/statehouse[\s\S]{0,80}KR_STATE_HOUSE_INCUMBENTS\[n\]/.test(strip(BALLOT_SRC)),
  "and it reads the state-house seat off the curated incumbent map");
has(strip(BALLOT_SRC), "68:'chew_h68'",
  "and HD-68 is an entry in that map, so the seat is a curated fact");

// THE REAL RESOLVER, NOT THE SUITE'S STUB — this is the function the page calls,
// booted from ballot-breakdown.js above. Every shape the app spells this one seat
// in resolves to the one member, because they all name one seat.
eq(seatedFor("statehouse", 68), "chew_h68", "the seat key and the number resolve HD-68");
eq(seatedFor("statehouse", "68"), "chew_h68", "the number as a string resolves it");
eq(seatedFor(HD68), "chew_h68", "the composed district key alone resolves it");
eq(seatedFor(HD68, 68), "chew_h68", "the key and the number together resolve it");
eq(seatedFor("statehouse-68"), "chew_h68", "and so does the key without its state prefix");
eq(seatedFor("statehouse", "HD-68"), "chew_h68", "a number written HD-68 resolves it");
// THE SEAT VOCABULARY STAYS HONEST. 'statehouse' is the Utah chamber and 'house'
// is the U.S. House; neither falls back to the other's map, so no district is
// handed a member from a chamber it does not belong to.
eq(seatedFor("ut-house-2"), "maloy", "a U.S. House key reads the congressional map");
eq(seatedFor("house", 68), null,
  "and 68 names no U.S. House district, so it resolves to nobody rather than a state rep");
eq(seatedFor("ut-statesenate-26"), "dhinkins", "a state senate key reads the senate map");
eq(seatedFor("ut-statehouse-1"), null, "a district the map does not hold resolves to null");
eq(seatedFor("statehouse", 0), null, "and so does a number that is not a district");
eq(seatedFor("", 68), null, "a seat key that names no chamber resolves to nobody");
eq(seatedFor(null, null), null, "and neither does nothing at all");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the list of issue rooms — lands_preserve is on it, and it opens");

// THE ROOMS LIST LIVES UNDER THE VOICE BLOCKS. The scroller holds two containers
// — District Voice first, then the rooms — because a seat's live question and its
// neighbours' takes are the page and the rooms are where a subject is continued.
// The list itself is unchanged, and this is where it hangs.
const roomsEl = WA.document.getElementById("pdx-district-file-rooms");
ok(roomsEl, "the scroller holds a container for the issue rooms");
const list = roomsEl ? roomsEl.innerHTML : "";
// AND THE LIST DOES NOT DEPEND ON VOICE BEING THERE. district-voice.js is not
// loaded in this suite at all — the file asks for it, does not find it, and still
// paints every room. A district whose Voice module failed to load is a district
// with rooms, not a blank panel.
eq(!!WA.PDXVoice, false, "district-voice.js is not loaded here");
ok(list.length > 0, "and the rooms still painted without it");
has(list, "Public lands", "lands_preserve is on the list, under its own label");
has(list, 'href="/d/ut-statehouse-68/lands_preserve"',
  "and Open room hits /d/ut-statehouse-68/lands_preserve");
eq(W0.PDXDistrictRoom.path(HD68, "lands_preserve"), ROOM_ADDR,
  "which is the address the room's own module builds for that pair");
has(list, "Open room", "the row's way in says what it does");

// THE COUNTS ARE INTEGERS, AND THEY ARE THE GATE'S OWN SENTENCE.
has(list, "4 support · 2 oppose · 1 mixed", "a room with answers prints three integers");
eq(pollResultLine(LANDS_TALLY), "4 support · 2 oppose · 1 mixed",
  "and that sentence is the shared gate's, not this page's");
lacks(list, "%", "no percentage is printed anywhere on the list");
has(list, "No answers yet.", "a room nobody has answered says so instead of printing zeroes");

// BOTH BRANCHES, AND ONLY THESE TWO.
const rowsMerged = F.rows(districtPayload(), ISSUE_KEYS_PAYLOAD.rows.map((r) => r.issueKey));
eq(rowsMerged.map((r) => r.issueKey).join(","),
  "privacy_rights,lands_preserve,school_choice,water",
  "the two branches merge into one list, ordered by the issue's printed label");
lacks(rowsMerged.map((r) => r.issueKey).join(","), "not_a_shipped_key",
  "a record key outside the district-room API's vocabulary is not a door");
// The room is the stronger fact: an issue that is both an open room and on the
// record appears ONCE, with its counts.
const dupes = F.rows(districtPayload(), ["lands_preserve", "lands_preserve", "water"]);
eq(dupes.filter((r) => r.issueKey === "lands_preserve").length, 1,
  "an issue on both branches appears exactly once");
eq(dupes.find((r) => r.issueKey === "lands_preserve").line, "4 support · 2 oppose · 1 mixed",
  "and it appears as the room, with the room's counts");

// NO ROOM PER ISSUE KEY. The vocabulary comes back so keys can be CHECKED
// against it, never so a row can be painted for each of them.
const wideVocab = districtPayload();
wideVocab.issueKeys = Array.from({ length: 121 }, (_, i) => `key_${i}`);
eq(F.rows(wideVocab, []).length, 2,
  "a 121-key vocabulary still produces exactly the rooms that exist");

// THE LIST IS NOT RANKED BY ANYTHING. Reversing the server's order and inflating
// one room's counts changes nothing about where a row lands.
const shuffled = districtPayload();
shuffled.rooms = shuffled.rooms.slice().reverse();
shuffled.rooms[0].results = pollTally([{ choice: "support", n: 999 }]);
eq(F.rows(shuffled, []).map((r) => r.issueKey).join(","),
  F.rows(districtPayload(), []).map((r) => r.issueKey).join(","),
  "neither the server's order nor a room's counts move a row");

// THE ROOM EXISTS AS A ROW, IN EVERY ENVIRONMENT. A fresh branch database is
// seeded by migrations alone, so the door the brief requires cannot depend on
// somebody having posted.
has(DD_MIGRATION, "('ut-statehouse-68', 'UT', 'statehouse', 68, 'Utah State House District 68')",
  "dd_districts already seeds HD-68 with the label the page prints");
has(DD_MIGRATION, "('lands_preserve')", "dd_issue_keys already seeds lands_preserve");
has(SEED_MIGRATION, 'INSERT INTO "dd_threads"', "the forward migration inserts a thread");
has(SEED_MIGRATION, "'ut-statehouse-68', 'lands_preserve'", "for HD-68 × lands_preserve");
has(SEED_MIGRATION, "ON CONFLICT", "and it is idempotent");
lacks(SEED_MIGRATION, "DROP ", "the migration drops nothing");
lacks(SEED_MIGRATION, "ALTER TABLE", "and alters nothing");
lacks(SEED_MIGRATION, "DELETE ", "and deletes nothing");
// One row and one only — no district × issue cross product.
eq((SEED_MIGRATION.match(/INSERT INTO/g) || []).length, 1,
  "exactly one insert, so exactly one room is seeded");

// ═════════════════════════════════════════════════════════════════════════════
section("5 · Who Represents Me leads here, and not to the forum");

const UT_REPS = {
  located: true, national: false, state: "Utah", districtsResolvable: true,
  levels: [
    { key: "statehouse", seat: "statehouse", statewide: false, district: "68",
      distLabel: "State House · District 68" },
    { key: "statesenate", seat: "statesenate", statewide: false, district: "6",
      distLabel: "State Senate · District 6" },
  ],
};
const WW = boot("/", {
  pdxRepsForMe: () => UT_REPS,
  PDXStances: { all: () => [{ issueKey: "lands_preserve" }] },
});
const hd68Mount = WW.PDXDistrictRoom.seatMountHtml(UT_REPS.levels[0], "Utah");
has(hd68Mount, 'href="/d/ut-statehouse-68"', "the HD-68 seat row's control href is /d/ut-statehouse-68");
has(hd68Mount, "District rooms", "and it is labelled District rooms");
has(hd68Mount, 'data-pdxdf-open="ut-statehouse-68"',
  "a plain left click opens the file in-app rather than reloading the shell");
// AND IT DOES NOT GO TO THE FORUM. Not on this row, not anywhere in either module.
lacks(hd68Mount, "#open-forum", "the control does not send a neighbour to the open forum");
lacks(strip(ROOM_SRC), "open-forum", "district-room.js names no forum anchor");
lacks(strip(FILE_SRC), "open-forum", "district-file.js names no forum anchor");
lacks(strip(FILE_SRC), "pdx_forum", "and reaches no forum table");

// A DISTRICT WITH NO FILE GETS NO CONTROL, so no row points at a door nobody is
// behind. SD-6 is a real, mapped, seeded district — it simply has no file yet.
const sd6Mount = WW.PDXDistrictRoom.seatMountHtml(UT_REPS.levels[1], "Utah");
lacks(sd6Mount, "District rooms", "a district with no file gets no control");
lacks(sd6Mount, 'href="/d/ut-statesenate-6"', "and no link to a file that does not exist");

// The control rides the mount Who Represents Me already paints, so it appears on
// the seat row rather than in a second block of this module's own.
has(strip(WRM_SRC), "DR.seatMountHtml(lv, reps && reps.state)",
  "Who Represents Me still gets the block from the room's one mount");
lacks(strip(WRM_SRC), "PDXDistrictFile",
  "and Who Represents Me does not reach the file directly");

// THE CONTROL'S RULES TRAVEL WITH THE MODULE THAT MAKES IT POSSIBLE. It only
// exists when district-file.js is loaded, so its two rules are in the file's own
// stylesheet and the room's stylesheet is byte-identical. A device holding the
// room's CSS but not this pair has no unstyled control on the seat row - it has
// no control at all.
has(FILE_CSS, ".pdxdr-mount-file", "the file's stylesheet dresses the control's block");
has(FILE_CSS, ".pdxdr-filelink", "and the control itself");
const ROOM_CSS = R("district-room.css");
lacks(ROOM_CSS, "pdxdr-mount-file", "the room's stylesheet gained no rule for it");
lacks(ROOM_CSS, "pdxdr-filelink", "and none for the control");

// The mount block is unchanged for a page that loads the room WITHOUT the file:
// the control is the only new thing in it, and it disappears with the module.
const WNoFile = makeDom("/");
WNoFile.__calls = [];
WNoFile.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
Object.assign(WNoFile, {
  pdxRepsForMe: () => UT_REPS,
  PDXStances: { all: () => [{ issueKey: "lands_preserve" }] },
  PDXIssueFamily: FAMILY,
});
vm.runInContext(ROOM_SRC, vm.createContext(WNoFile), { filename: "district-room.js" });
const bare = WNoFile.PDXDistrictRoom.seatMountHtml(UT_REPS.levels[0], "Utah");
lacks(bare, "District rooms", "with district-file.js absent the mount prints no control");
lacks(bare, 'href="/d/ut-statehouse-68"', "and no link to the file");
has(bare, 'href="/d/ut-statehouse-68/lands_preserve"',
  "while the room's own chips are exactly what they were");

// ═════════════════════════════════════════════════════════════════════════════
section("6 · a signed-out visitor can read the list");

// The cold arrival above ran with no auth, no uid and no token in the sandbox,
// and it painted the whole list. That is the assertion; these are its edges.
has(list, "Public lands", "a signed-out visitor reads the rooms");
has(list, "4 support · 2 oppose · 1 mixed", "including the counts");
eq(WA.__calls.length, 2, "on exactly two reads");
for (const c of WA.__calls) {
  const h = (c.init && c.init.headers) || {};
  eq(h.Authorization, undefined, "no Authorization header is sent");
  eq(h.authorization, undefined, "and not in lower case either");
  eq((c.init && c.init.method) || "GET", "GET", "both reads are GETs");
  eq((c.init && c.init.body) || undefined, undefined, "with no body");
}
has(WA.__calls[0].url, "/api/district-room/district?district=ut-statehouse-68",
  "the first read is the district's rooms");
has(WA.__calls[1].url, "/api/voting-record/member/chew_h68/issue-keys",
  "the second is the seated member's readable issues");
// No token machinery at all in this module.
for (const t of ["getIdToken", "Bearer", "Authorization", "firebase", "signInAnonymously"]) {
  lacks(strip(FILE_SRC), t, `the file has no ${t} in it`);
}

// The server route is open too: reading it verifies nobody.
const fnSrc = strip(FN_SRC);
const dSlice = fnSrc.slice(fnSrc.indexOf("async function readDistrict"));
const dBody = dSlice.slice(0, dSlice.indexOf("\n}\n") + 2);
ok(dBody.length > 0, "the Function has a readDistrict route");
lacks(dBody, "verifyUser", "reading a district file verifies nobody");
lacks(dBody, "ddResidency", "and reads no residency row");
lacks(dBody, "insert(", "listing a district's rooms creates no row");
lacks(dBody, "update(", "and updates none");
lacks(dBody, "delete(", "and deletes none");
has(dBody, "no_district", "an unmapped district is a 404 rather than an empty page");
has(fnSrc, 'if (path === "/district")', "and the route is dispatched");
ok(/path === "\/district"[\s\S]{0,140}method === "GET"/.test(fnSrc),
  "GET only — nothing is written through this address");

// ═════════════════════════════════════════════════════════════════════════════
section("7 · it asks for nothing, and residency is untouched");

const fileSrc = strip(FILE_SRC);
for (const verb of ["method: 'POST'", 'method: "POST"', "residency/attest", "residency/grant",
  "poll/vote", "/thread", "/flag", "attest"]) {
  lacks(fileSrc, verb, `the file never does ${verb}`);
}
// The word "grant" DOES appear, once, in the one line the brief dictated —
// "Posting takes a reviewer grant." Saying who may post is not offering to post.
eq((fileSrc.match(/grant/g) || []).length, 1, "the only grant here is a sentence about one");
lacks(fileSrc, "textarea", "there is no composer on this page");
lacks(fileSrc, "<form", "and no form");
for (const other of ["stripe", "checkout", "subscribe", "message",
  "floors", "pack", "offline"]) {
  lacks(fileSrc.toLowerCase(), other.toLowerCase(), `and nothing about ${other}`);
}
// It reaches exactly two addresses, and both are reads.
const urls = [...new Set(fileSrc.match(/'\/api\/[^']*'/g) || [])].sort();
eq(urls.join(","), "'/api/district-room/district','/api/voting-record/member/'",
  "two API addresses, and there is no third");

// ═════════════════════════════════════════════════════════════════════════════
section("8 · not a scorecard, and none of the verdict palette");

for (const banned of ["party", "caucus", "score", "rank", "leaderboard", "upvote", "downvote",
  "trending", "popular", "karma", "reputation", "directionMatch", "sameHere", "likes"]) {
  ok(fileSrc.toLowerCase().indexOf(banned.toLowerCase()) < 0,
    `district-file.js does not spend the word "${banned}"`);
}
lacks(fileSrc, "%", "the file computes no percentage");
const cssRules = strip(FILE_CSS);
for (const hue of ["#4ade80", "#86efac", "#22c55e", "#f87171", "#ef4444", "#dc2626"]) {
  lacks(cssRules, hue, `the district file does not wear ${hue}`);
}
ok(!/#f8[0-9a-f]{4}|#e[0-9a-f]1[0-9a-f]{3}/i.test(cssRules), "it wears no red");
for (const banned of ["party", "score", "rank", "verdict", "kept", "broken"]) {
  ok(cssRules.toLowerCase().indexOf(banned) < 0, `and no .${banned} class to paint one`);
}
// Nothing in the stylesheet can scale with how busy a room is.
for (const scaler of ["width: calc(var", "--pdxdf-fill", "transform: scaleX"]) {
  lacks(cssRules, scaler, `no ${scaler} for a count to drive`);
}

// ── THE RECORD BRANCH HAS A FLOOR ────────────────────────────────────────────
// A single incidental omnibus brush is not a pattern, and the floor lives in the
// record lane rather than being re-decided on this page.
const vr = strip(VR_SRC);
has(vr, "const ISSUE_PATTERN_MIN_ACTS = 3", "the record lane owns the act floor");
has(vr, "async function getMemberIssueKeys", "and the route that applies it");
ok(/n >= ISSUE_PATTERN_MIN_ACTS/.test(vr), "issues below the floor are simply absent");
ok(/\/\^\\\/member\\\/\(\[\^\/\]\+\)\\\/issue-keys\$\//.test(vr) ||
   vr.indexOf("/member/([^/]+)/issue-keys$/") >= 0,
  "the route is dispatched");
has(vr, "ISSUE_KEYS.has(key)", "every key is checked against the shipped allow-list");
// It returns a key and an integer, and nothing that could become a verdict.
const vrSlice = vr.slice(vr.indexOf("async function getMemberIssueKeys"));
const vrBody = vrSlice.slice(0, vrSlice.indexOf("\n}\n") + 2);
for (const leak of ["position", "supports", "title", "voteDate", "isParty", "sourceUrl"]) {
  lacks(vrBody, leak, `the issue-keys route does not disclose ${leak}`);
}
lacks(fileSrc, "acts", "and the page never prints the act count as a number beside a door");

// ═════════════════════════════════════════════════════════════════════════════
section("9 · one owner, and the shell ships it");

// EXACTLY ONE MODULE OWNS /d/<districtKey>. Scanning every top-level client file.
const CLIENT_JS = readdirSync(ROOT)
  .filter((f) => f.endsWith(".js") && f !== "district-file.js");
const FILE_USERS = CLIENT_JS.filter((f) => /PDXDistrictFile/.test(strip(R(f))));
eq(FILE_USERS.sort().join(","), "district-room.js",
  "only the room's seat mount reaches the district file, and nothing else does");
const indexMarkup = INDEX.replace(/<!--[\s\S]*?-->/g, " ");
lacks(indexMarkup, "PDXDistrictFile",
  "there is no nav item, no top-level door and no inline caller in index.html");
lacks(indexMarkup, 'href="/d/', "index.html links no district file directly");

has(INDEX, 'href="/district-file.css"', "index.html loads the file's stylesheet");
has(INDEX, 'src="/district-file.js"', "index.html loads the file");
ok(/media="print" onload="this\.media='all'"[^>]*\/>\s*\n\s*<noscript><link rel="stylesheet" href="\/district-file\.css" \/><\/noscript>/.test(INDEX),
  "the stylesheet is non-blocking, with a noscript fallback");
ok(/<script defer src="\/district-file\.js"><\/script>/.test(INDEX),
  "the module is deferred");
// Root-absolute, so a cold visit to /d/<key> resolves the assets from the shell
// rather than from /d/.
lacks(INDEX, 'src="district-file.js"', "the script is root-absolute, not relative");
lacks(INDEX, 'href="district-file.css"', "and so is the stylesheet");
// Loaded AFTER district-room.js, which is the order the module documents.
ok(INDEX.indexOf('src="/district-room.js"') < INDEX.indexOf('src="/district-file.js"'),
  "the file is loaded after the room it asks for a room's address");

// ═════════════════════════════════════════════════════════════════════════════
section("9b · the page is a place — a letterhead, a rail, and one fold");

// ── THE LETTERHEAD NAMES THE GROUND, AND QUOTES IT ──────────────────────────
// A seat file whose title is "Utah State House District 68" has told the reader
// the number of the box they live in and nothing about where that is. The answer
// is already published: the seated member's own roster row spells the district as
// "UT District 68 (Vernal, Uintah / Duchesne County)". The page reads the
// parenthetical out of that one string and prints it.
//
// IT IS QUOTED, NOT COMPOSED. There is no county table, no basin name and no
// region map in this module — asserted below — so a seat whose roster row has no
// parenthetical prints no line at all rather than a plausible guess.
{
  const withPlace = boot("/d/" + HD68, {
    _pdxPersonById: (pid) => (pid === "chew_h68"
      ? { name: "Scott Chew", office: "Utah State Representative",
          state: "UT District 68 (Vernal, Uintah / Duchesne County)",
          party: "R", score: 71, kept: 3, broken: 1 }
      : null),
  });
  const h = withPlace.PDXDistrictFile.headHtml(HD68, { label: "Utah State House District 68" });
  has(h, "Vernal, Uintah / Duchesne County", "the place line is the roster's own parenthetical");
  has(h, "pdxdf-place", "printed as the letterhead's place line");
  lacks(h, "UT District 68 (", "and the bracket itself is not reprinted around it");
  // ONE FIELD OFF THAT ROW, AND ONLY ONE. The same row carries a party letter, a
  // score and a kept/broken tally. None of them reach the page.
  for (const leak of ["(R)", "R)", "71", "score", "Kept", "Broken", "%"]) {
    lacks(h, leak, `and nothing else off that row — no ${leak}`);
  }
}
// A roster row with no parenthetical, a roster row with none of the field at all,
// and a page with no roster: three ways of not knowing, and all three print
// nothing rather than a guess.
for (const [what, row] of [
  ["no parenthetical", { name: "Scott Chew", office: "Utah State Representative", state: "Utah" }],
  ["no state field", { name: "Scott Chew", office: "Utah State Representative" }],
  ["an empty one", { name: "Scott Chew", office: "Utah State Representative", state: "" }],
]) {
  const w9 = boot("/d/" + HD68, { _pdxPersonById: () => row });
  const h9 = w9.PDXDistrictFile.headHtml(HD68, { label: "Utah State House District 68" });
  lacks(h9, "pdxdf-place", `a roster row with ${what} prints no place line`);
  has(h9, "Scott Chew", "and the seat is still named");
}
// No geography of this module's own, in the source.
for (const invented of ["Uintah Basin", "Vernal", "County", "Basin", "county"]) {
  lacks(fileSrc, invented, `district-file.js names no place of its own (${invented})`);
}

// ── THE SEATED MEMBER IS AN IDENTITY ROW ────────────────────────────────────
// A face, a name, an office. The portrait comes from the app's one photo
// resolver and from nowhere else, and it is FAIL-SOFT in both directions.
{
  const wFace = boot("/d/" + HD68, { _getPhotoUrl: (pid) => (pid === "chew_h68" ? "https://example.test/chew.jpg" : "") });
  const seat = wFace.PDXDistrictFile.seatedHtml(HD68, null);
  has(seat, 'src="https://example.test/chew.jpg"', "the seated member's portrait is painted");
  has(seat, "pdxdf-seat-face", "in the letterhead's own face slot");
  has(seat, 'alt=""', "decorative — the name beside it is the row's label");
  has(seat, 'href="/p/chew_h68"', "and the name is still the door");
  eq((seat.match(/<img/g) || []).length, 1, "exactly one image in the row");
}
has(strip(FILE_SRC), "window._getPhotoUrl", "the portrait is asked of the app's one resolver");
lacks(fileSrc, "images/legislator", "the module builds no portrait URL of its own");
// This suite's own boot provides NO resolver, which is the fail-soft case: the
// row above in section 3 painted the whole seat with no image element in it.
lacks(head.innerHTML, "<img", "a page with no photo resolver paints no image element");
has(head.innerHTML, "Scott Chew", "and still names the member");

// ── THE ROOMS FOLD, AND THE FOLD IS NOT A RANKING ───────────────────────────
// The list was eight rows at identical weight, four of which said nothing but
// "No answers yet." So the rooms with answers stay open at full size and the
// quiet ones go behind ONE control. The split is the same yes/no the row's own
// line already prints — not a count, not a threshold, not a popularity order.
has(list, "pdxdf-fold", "the quiet rooms sit behind a fold");
has(list, "More issues this seat touches", "and the control says what is behind it");
eq(F.COPY.roomsFold, "More issues this seat touches",
  "that control's wording is owned in exactly one place");
has(list, "<details", "the fold is a <details>, so it opens with no JavaScript");
has(list, "<summary", "with a real summary as its control");
lacks(list, "aria-expanded", "and it does not re-describe a state the element already announces");
// THE ANSWERED ROOM IS NOT IN THE FOLD, and the quiet ones are. The payload has
// one answered room (lands_preserve) and three doors.
{
  const foldAt = list.indexOf("pdxdf-fold");
  const landsAt = list.indexOf("Public lands");
  ok(landsAt >= 0 && foldAt >= 0 && landsAt < foldAt,
    "the room with answers is above the fold, at full size");
  has(list.slice(foldAt), "No answers yet.", "and the rooms with none are inside it");
  lacks(list.slice(0, foldAt), "No answers yet.",
    "with no honest-empty room left stranded outside");
  eq((list.slice(0, foldAt).match(/pdxdf-row/g) || []).length, 1,
    "exactly one room is open: the one somebody answered");
  eq((list.slice(foldAt).match(/pdxdf-row/g) || []).length, 3,
    "and the other three are folded");
  has(list, '<span class="pdxdf-foldn">3</span>',
    "the control says how many doors are behind it, as an integer");
}
// EVERY ROOM IS STILL ON THE PAGE. Folding is not dropping: all four keys paint.
for (const lbl of ["Public lands", "Water", "School choice", "Privacy"]) {
  has(list, lbl, `${lbl} is still painted`);
}
// AND THE ORDER IS UNTOUCHED. rows() is the only thing that orders this list and
// it was not changed — the fold splits the output, it does not sort it.
eq(F.rows(districtPayload(), ISSUE_KEYS_PAYLOAD.rows.map((r) => r.issueKey))
    .map((r) => r.issueKey).join(","),
  "privacy_rights,lands_preserve,school_choice,water",
  "the merged row order is exactly what it was before the fold existed");
// A district where EVERY room has answers has nothing to fold, and prints no
// control — an empty fold would be a door to an empty room.
{
  const allLive = districtPayload();
  allLive.rooms = allLive.rooms.map((r) => ({
    ...r, answered: true, results: LANDS_TALLY, resultLine: "4 support · 2 oppose · 1 mixed",
  }));
  allLive.issueKeys = allLive.rooms.map((r) => r.issueKey);
  const liveOnly = F.listHtml(HD68, allLive, []);
  lacks(liveOnly, "pdxdf-fold", "a district with no quiet rooms prints no fold");
  lacks(liveOnly, "More issues this seat touches", "and no control for one");
}
// A district with NO rooms at all is still the one honest sentence, not a fold.
{
  const none = F.listHtml(HD68, { issueKeys: [], rooms: [] }, []);
  has(none, F.COPY.noRooms, "a district with no rooms says so");
  lacks(none, "pdxdf-fold", "and prints no fold");
  lacks(none, "pdxdf-row", "and no row");
}

// ── THE ISSUE'S COLOUR IS A RAIL, AND IT IS BORROWED ────────────────────────
// The rail comes from PDXIssueColors as inline custom properties, so this module
// holds no per-issue rule and cannot disagree with the room, the person file or
// Voice about what colour an issue is. THIS SUITE LOADS NO COLOUR MODULE, which
// is the fail-soft case: every row gets the neutral rail and no data-ic at all.
lacks(list, 'data-ic="on"', "with no colour module on the page, no row claims a colour");
lacks(list, "--pdx-ic", "and no inline colour property is emitted");
has(strip(FILE_SRC), "window.PDXIssueColors", "the colour is asked of the module that owns it");
has(strip(FILE_SRC), "C.skin(", "through its skin() resolver, like every other surface");
lacks(fileSrc, "#2ECC71", "and the module hard-codes no issue colour of its own");
ok(!/#[0-9a-f]{6}/i.test(fileSrc), "no hex colour is written in the module at all");
// The rail is one width for every row, in the sheet, so it can never read as an
// amount of anything.
ok(/\.pdxdf-row\s*\{[^}]*border-left:\s*3px/.test(cssRules),
  "the rail is 3px on every row");
ok(/\.pdxdf-row\[data-ic="on"\]\s*\{\s*border-left-color:\s*var\(--pdx-ic\)/.test(cssRules),
  "and a resolved key changes its colour, never its width");

// ── ONE DISPLAY FACE, ONE KICKER FACE ──────────────────────────────────────
// The page had one accent-blue uppercase label per block at the weight of the
// sentence under it, six of them down the page, so its furniture was as loud as
// its content. The title is now the display face; every label is the kicker face
// in slate.
ok(/\.pdxdf-title\s*\{[^}]*Bebas Neue/.test(cssRules), "the district's name is in the display face");
ok(/\.pdxdf-title\s*\{[^}]*clamp\(/.test(cssRules),
  "sized against the VIEWPORT, and against nothing on the page");
for (const kicker of ["pdxdf-listhd", "pdxdf-seat-hd", "pdxdf-fam", "pdxdf-place"]) {
  ok(new RegExp("\\." + kicker + "[^{]*\\{[^}]*Barlow Condensed").test(cssRules),
    `.${kicker} is set in the kicker face`);
}
// And no label is set in the display face, which is what "kickers must not
// out-shout the question" means in a stylesheet.
for (const kicker of ["pdxdf-listhd", "pdxdf-seat-hd", "pdxdf-fam", "pdxdf-foldhd"]) {
  ok(!new RegExp("\\." + kicker + "[^{]*\\{[^}]*Bebas Neue").test(cssRules),
    `.${kicker} is not set in the display face`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("10 · the handoff — a person modal is never left lurking over the file");

// The one control that opens this file from outside Door 2 is "Neighbors in this
// seat" on a person file, and that link lives INSIDE the person modal. The modal
// and this panel share z-index 50 (the number both need to clear the site's fixed
// nav), so document order decides which covers which — and build() deliberately
// inserts this overlay BEFORE #modal-overlay so a ROOM opened from a FILE lands
// on top of the file. The same order put the file under an open person modal, and
// a reader who tapped the link watched nothing happen.
//
// So the file closes the person file on the way in. closeModal() is not edited
// and is not asked to behave differently; it is simply called, once, and only
// when the overlay is actually up.
{
  const w = boot("/");
  const over = w.document.createElement("div");
  over.id = "modal-overlay";
  w.document.body.appendChild(over);
  over.style.display = "flex";
  const closes = [];
  // Recorded at CALL time: closeModal hands the address back through
  // PDXPerson.restore(), so this file has to take the bar AFTER that, never before.
  w.closeModal = () => { closes.push(w.__pushed.length); over.style.display = "none"; };

  eq(w.PDXDistrictFile.enter(HD68), true, "the file opens from inside a person modal");
  eq(closes.length, 1, "and closes it, exactly once");
  eq(closes[0], 0, "before taking the address, not after");
  eq(over.style.display, "none", "with nothing left lurking over the panel");
  ok(w.__pushed.includes("/d/" + HD68), "and the reader is standing at the file's address");
  eq(w.PDXDistrictFile.isOpen(), true, "on the file, which is the surface they asked for");
}
// A MODAL THAT IS NOT UP IS LEFT ALONE, because closeModal() rewrites the address
// on its way out and a reader who never opened a person file has an address that
// is nobody's to move.
{
  const w = boot("/");
  const over = w.document.createElement("div");
  over.id = "modal-overlay";
  w.document.body.appendChild(over);
  over.style.display = "none";
  let called = 0;
  w.closeModal = () => { called++; };
  eq(w.PDXDistrictFile.enter(HD68), true, "the file opens with the modal closed");
  eq(called, 0, "and closeModal is not called on a modal nobody opened");
}
// And a page with no person modal at all opens the file without reaching for one.
{
  const w = boot("/");
  let called = 0;
  w.closeModal = () => { called++; };
  eq(w.PDXDistrictFile.enter(HD68), true, "the file opens on a page with no person modal");
  eq(called, 0, "and asks nothing of closeModal");
}
// A refused key closes nothing — the handoff is part of opening a file, not a
// side effect of tapping something that names no file.
{
  const w = boot("/");
  const over = w.document.createElement("div");
  over.id = "modal-overlay";
  w.document.body.appendChild(over);
  over.style.display = "flex";
  let called = 0;
  w.closeModal = () => { called++; };
  eq(w.PDXDistrictFile.enter("ut-statehouse-67"), false, "a district with no file opens nothing");
  eq(called, 0, "and closes nothing on the way to opening nothing");
  eq(over.style.display, "flex", "the person file the reader was reading is still there");
}

// ═════════════════════════════════════════════════════════════════════════════
section("11 · the shell ships it");

has(SW, "'/district-file.js',", "the service worker precaches the module");
has(SW, "'/district-file.css',", "and the stylesheet");
const ver = /const CACHE_VERSION = '(v\d+)'/.exec(SW);
ok(ver && parseInt(ver[1].slice(1), 10) >= 160,
  `the shell cache version is bumped for the seat fix — got ${ver && ver[1]}`);

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ district-file: ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.error(`   · ${f}`);
  process.exit(1);
}
console.log(`\n✓ district-file: all ${passed} assertions passed`);
console.log(
  "   one address, not the room's · HD-68 lists lands_preserve · Open room hits the room · " +
  "WRM leads here, not the forum · signed-out reads it · asks for nothing · no verdict palette · " +
  "rooms-only keeps its lede · no person modal left lurking"
);
