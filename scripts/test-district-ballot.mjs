#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-district-ballot.mjs — "This seat's ballot": what HD-68 can point at
// ─────────────────────────────────────────────────────────────────────────────
// WHO TALKS DOES NOT CHANGE. WHAT THEY CAN POINT AT DOES. /d/ut-statehouse-68 is
// still the only Voice file, District Voice is still keyed on the SEAT and never
// on a pid, reading is still open and writing is still the same verified-neighbour
// grant. What the page gained is one strip between Voice's question and the issue
// rooms, naming the officials this district answers to as LINKS TO PERSON FILES
// THAT ALREADY EXIST. Every assertion below is an edge of that sentence.
//
//   1. THE ADDRESS DID NOT MOVE. /d/ut-hd-68 still 301s to /d/ut-statehouse-68,
//      the alias and the canonical key are still one place, and no route, rewrite
//      or redirect was added.
//   2. ONLY THOSE OFFICES, AND NO EXTRA MEMBER. The seat's own member, the U.S.
//      House names the roster files for this geography, both U.S. Senators and the
//      Governor. Nobody else on the roster appears — asserted against the WHOLE
//      roster rather than against a short list of usual suspects.
//   3. ALPHABETICAL INSIDE AN OFFICE, and by nothing else. A name opens /p/<pid>;
//      a room row still opens the room.
//   4. THE ONE-LINER IS THE PERSON FILE'S OWN OR THERE IS NONE. Record first, in
//      the engine's own words; the SAID cards second, labelled as theirs; nothing
//      third. A thin file stays honest — no invented act, no placeholder row.
//   5. ZERO PERCENTAGE, PARTY OR SCORE ON THE STRIP. In the painted markup, in
//      the source, and in the stylesheet.
//   6. THE WRITE PATH IS UNTOUCHED. The strip sends no request at all: no fetch,
//      no API address, no POST, no form, no composer. Lee's and Cox's person files
//      still have no Voice neighbour link, and Chew's still has exactly the one
//      quiet HD-68 link it had.
//   7. NOT SLICE 2, NOT A SECOND DISTRICT, NOT A NAV ITEM.
//   8. THE SHELL SHIPS IT, BEHIND A BUMP — because precached shell files changed.
//
//   node scripts/test-district-ballot.mjs
//
// The client modules run in a node:vm sandbox with a small real DOM, and the
// one-liners are read through the REAL roster, the REAL stance resolver and the
// REAL pattern engine booted in a second sandbox. A hand-written stub standing in
// for those would be a suite that agrees with the caller while both disagree with
// the engine.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const BAL_SRC = R("district-ballot.js");
const BAL_CSS = R("district-ballot.css");
const FILE_SRC = R("district-file.js");
const FILE_CSS = R("district-file.css");
const ROOM_SRC = R("district-room.js");
const VOICE_SRC = R("district-voice.js");
const SEATS_SRC = R("ballot-breakdown.js");
const TOML = R("netlify.toml");
const INDEX = R("index.html");
const SW = R("sw.js");

const HD68 = "ut-statehouse-68";
const HD68_ALIAS = "ut-hd-68";
const CHEW = "chew_h68";
const FLAGSHIP_ISSUE = "lands_preserve";

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
// A stale probe has to fail loudly rather than quietly assert nothing: every
// fact below is read off a live object, and a missing one stops the run.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ district-ballot: ${msg}`);
  process.exit(1);
};

// Comments have to be able to name what the code refuses to build ("no party
// letter", "not a scorecard"), so every source-level assertion runs over a
// comment-stripped copy.
const strip = (src) =>
  String(src).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
const BAL_CODE = strip(BAL_SRC);
const BAL_STYLE = strip(BAL_CSS);

// ═════════════════════════════════════════════════════════════════════════════
// THE SAME SMALL REAL DOM the district file's own suite uses, for the same
// reason: the shared sandbox returns null from getElementById, which
// district-file.js reads as "there is no page to build in", so nothing below
// would paint. An innerHTML assignment registers the ids it declares as child
// nodes IN DOCUMENT ORDER and drops the ones it replaced — that ordering is what
// makes "Voice, then the ballot strip, then the rooms" observable rather than
// asserted about source text.
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
  win.history = { pushState(s, t, u) { win.__pushed.push(String(u)); }, replaceState() {} };
  win.flushTimers = () => {
    const due = queue.splice(0, queue.length);
    due.forEach((t) => { try { t.f(); } catch (e) {} });
  };
  return win;
}

// ═════════════════════════════════════════════════════════════════════════════
// THE REAL ENGINES, IN THEIR OWN SANDBOX. The roster, the SAID cards, the stance
// resolver and the pattern engine, booted from the shipped files. The strip is
// handed these rather than a stub for the reason the district file's suite boots
// the real seat resolver: a stub written to match the caller is how a surface and
// its suite come to agree with each other and with nothing else.
const ENGINE = (() => {
  const w = makeSandbox();
  w.window = w;
  w.document = {
    readyState: "complete", body: null, cookie: "",
    addEventListener() {}, removeEventListener() {},
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, classList: { add() {} } }),
  };
  w.setTimeout = () => 0;
  w.clearTimeout = () => {};
  w.location = { pathname: "/", href: "https://www.politidex.fyi/", search: "", hash: "" };
  w.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  w.fetch = () => Promise.resolve({ ok: false, status: 0, json: () => Promise.resolve({}) });
  const c = vm.createContext(w);
  for (const f of ["cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
                   "stance-helpers.js", "consistency.js", "ballot-breakdown.js"]) {
    vm.runInContext(R(f), c, { filename: f });
  }
  return w;
})();
must(ENGINE.CMP_DATA && typeof ENGINE.CMP_DATA === "object", "cmp-data.js did not publish the roster");
must(typeof ENGINE._resolveStanceList === "function", "stance-helpers.js did not publish _resolveStanceList");
must(ENGINE.PDXConsistency && ENGINE.PDXConsistency.recordStandout &&
     typeof ENGINE.PDXConsistency.recordStandout.pick === "function",
     "consistency.js did not publish recordStandout.pick");
must(typeof ENGINE.pdxSeatedMemberFor === "function",
     "ballot-breakdown.js did not publish pdxSeatedMemberFor");
must(ENGINE._PDX_RD_SAYS_LEAD, "stance-helpers.js did not publish the record lead phrase");
const LEAD = ENGINE._PDX_RD_SAYS_LEAD;

// window._pdxPersonById is a one-line CMP_DATA lookup that lives inside a
// DOM-heavy module (compare-table.js); the lookup itself is reproduced here over
// the REAL roster rather than booting that whole file for one line.
const personById = (pid) => (pid && ENGINE.CMP_DATA[pid]) ? ENGINE.CMP_DATA[pid] : null;
const nameOf = (pid) => String((personById(pid) || {}).name || "");

const PERSON_LINK = {
  href: (pid) => "/p/" + pid,
  anchor: (pid, label, opts) =>
    `<a class="${(opts && opts.cls) || ""}" href="/p/${pid}" data-pdx-person-link="${pid}">${label}</a>`,
  anchorHtml: (pid, label) => `<a href="/p/${pid}">${label}</a>`,
};
const FAMILY = {
  label: (k) => String(k).replace(/_/g, " "),
  childLabel: (k) => String(k).replace(/_/g, " "),
  path: (k) => "/i/" + k,
};

const ROOMS_PAYLOAD = {
  districtKey: HD68, seatKey: "statehouse", districtNumber: 68,
  label: "Utah State House District 68",
  rooms: [{ issueKey: FLAGSHIP_ISSUE, label: "lands preserve", posts: 0, line: "No answers yet." }],
  issueKeys: [FLAGSHIP_ISSUE],
};
// A fresh seat: one poll, zero takes, zero verified neighbours, a signed-out
// reader. Enough for the Voice block to paint, which is all this suite asks of
// it — the Voice block's own contents are test-district-voice.mjs's business.
const SEAT_PAYLOAD = {
  seat: { seatKey: HD68, path: "/d/" + HD68, alias: false, state: "UT",
          seatClass: "statehouse", districtNumber: 68, label: "Utah State House District 68" },
  poll: { id: 1, issueKey: FLAGSHIP_ISSUE, question: "On public lands in this district, which should state policy weigh more heavily?",
          options: [{ key: "protect", label: "Protect Public Lands", count: 0 },
                    { key: "develop", label: "Develop them", count: 0 }],
          answered: 0, countLine: "No answers yet.", myAnswer: null },
  takes: [], neighbors: { verified: 0, line: "No verified neighbors yet." },
  voice: { canPost: false, reason: "signed_out", note: "Sign in to post." },
  limits: { takeMax: 280, takesCap: 20 },
};

// Boots the four client modules in the order index.html loads them. `opts.people`
// replaces the roster lookup for the one probe that needs a person file to be
// MISSING; every other boot reads the real roster.
function boot(pathname, opts) {
  const o = opts || {};
  const win = makeDom(pathname || "/");
  win.__calls = [];
  win.__posts = [];
  win.fetch = (url, init) => {
    const u = String(url);
    const i = init || {};
    win.__calls.push({ url: u, init: i });
    if (String(i.method || "GET").toUpperCase() !== "GET") win.__posts.push({ url: u, init: i });
    let status = 200;
    let data = {};
    if (u.indexOf("/api/district-voice") === 0) data = SEAT_PAYLOAD;
    else if (u.indexOf("/api/district-room/district") === 0) {
      const wanted = decodeURIComponent(u.split("district=")[1] || "");
      if (wanted === HD68) data = ROOMS_PAYLOAD;
      else { status = 404; data = { error: "no district", code: "no_district" }; }
    } else if (u.indexOf("/api/voting-record/member/") === 0) {
      data = { rows: [{ issueKey: FLAGSHIP_ISSUE }] };
    }
    return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(data) });
  };
  Object.assign(win, {
    auth: { currentUser: null },
    _pdxPersonById: o.people ? ((pid) => o.people[pid] || null) : personById,
    _resolveStanceList: (pid, p) => ENGINE._resolveStanceList(pid, p),
    _PDX_RD_SAYS_LEAD: LEAD,
    PDXConsistency: o.consistency || ENGINE.PDXConsistency,
    pdxSeatedMemberFor: (k, n) => ENGINE.pdxSeatedMemberFor(k, n),
    PDXIssueFamily: FAMILY,
    PDXPersonLink: PERSON_LINK,
  }, o.extras || {});
  const ctx = vm.createContext(win);
  vm.runInContext(ROOM_SRC, ctx, { filename: "district-room.js" });
  vm.runInContext(FILE_SRC, ctx, { filename: "district-file.js" });
  if (!o.noVoice) vm.runInContext(VOICE_SRC, ctx, { filename: "district-voice.js" });
  if (!o.noBallot) vm.runInContext(BAL_SRC, ctx, { filename: "district-ballot.js" });
  return win;
}

async function settle(win) {
  for (let i = 0; i < 4; i++) {
    win.flushTimers();
    for (let j = 0; j < 20; j++) await Promise.resolve();
  }
}

const W0 = boot("/");
const B = W0.PDXDistrictBallot;
must(B && typeof B === "object", "district-ballot.js did not define window.PDXDistrictBallot");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the address did not move — one district, one alias, one place");

// The 301 is the one thing a reader's saved link depends on, and it is asserted
// on the shipped config rather than on a comment about it.
const aliasBlock = /\[\[redirects\]\][^[]*from\s*=\s*"\/d\/ut-hd-68"[^[]*/.exec(TOML);
must(aliasBlock, "netlify.toml no longer carries a redirect from /d/ut-hd-68");
has(aliasBlock[0], 'to = "/d/' + HD68 + '"', "/d/ut-hd-68 still points at the canonical key");
has(aliasBlock[0], "status = 301", "and it is still a 301, not a rewrite");
const aliasSplat = /\[\[redirects\]\][^[]*from\s*=\s*"\/d\/ut-hd-68\/\*"[^[]*/.exec(TOML);
must(aliasSplat, "netlify.toml no longer carries the alias splat redirect");
has(aliasSplat[0], "status = 301", "the alias's room addresses still 301 too");
// No route was added for the strip: it is a block on a page that already exists.
eq((TOML.match(/from = "\/d\/ut-hd-68/g) || []).length, 2,
  "the alias is redirected from exactly twice — the file and its rooms, and nothing new");
lacks(TOML, "district-ballot", "no route, rewrite or redirect was added for the strip");

// The module answers for this district and for no other, and it normalizes the
// alias the same way every other district surface does.
eq(Object.keys(B.BALLOT_SEATS).length, 1, "exactly ONE district has a ballot strip");
eq(Object.keys(B.BALLOT_SEATS)[0], HD68, "and it is HD-68");
eq(B.shipped(HD68), true, "the canonical key is shipped");
eq(B.shipped(HD68_ALIAS), true, "the alias resolves to the same strip");
eq(B.normalizeKey(HD68_ALIAS), HD68, "because the alias normalizes to the canonical key first");
for (const other of ["ut-statehouse-69", "ut-statesenate-20", "ut-house-3", "ca-statehouse-68"]) {
  eq(B.shipped(other), false, `no strip for ${other} — one district, and adding a second is a decision`);
  eq(B.html(other), "", `and ${other} renders nothing at all`);
}
eq(B.html(""), "", "an empty key renders nothing");
eq(B.html("not-a-key"), "", "and so does a key this app does not speak");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · only those offices, and no extra member");

const MODEL = B.rows(HD68);
must(MODEL.length, "the strip's model is empty — the roster or the resolver did not reach it");
eq(JSON.stringify(MODEL.map((o) => o.label)),
  JSON.stringify(["Utah State House", "U.S. House", "U.S. Senate", "Governor"]),
  "four offices: the seat this file is, then the stack outward from it");
const PIDS = MODEL.map((o) => o.people.map((p) => p.pid));
eq(JSON.stringify(PIDS),
  JSON.stringify([[CHEW], ["maloy", "lyman"], ["curtis", "lee"], ["cox"]]),
  "the seat's own member, the two U.S. House names the roster files, both Senators, the Governor");

// THE SEAT'S OWN MEMBER IS RESOLVED, NOT LISTED. No second copy of the incumbent
// table lives in the strip, so the day the seat changes hands the strip changes
// with it and nobody has to remember this file exists.
eq(B.seatedPid(HD68), CHEW, "Chew is resolved from the seat key by the app's one resolver");
eq(B.seatedPid(HD68_ALIAS), CHEW, "and the alias reaches the same member");
lacks(BAL_CODE, "'" + CHEW + "'", "the pid is nowhere in the source — the seat names the member");
lacks(BAL_CODE, "KR_STATE_HOUSE_INCUMBENTS", "and there is no second copy of the incumbent table");

// NOBODY ELSE ON THE ROSTER IS ON THIS STRIP. Asserted against the WHOLE roster:
// a short list of usual suspects would pass the day somebody adds a seventh name.
const SHOWN = new Set([CHEW, "maloy", "lyman", "lee", "curtis", "cox"]);
const MARKUP = B.html(HD68);
must(MARKUP, "the strip painted nothing");
let strangers = [];
for (const pid of Object.keys(ENGINE.CMP_DATA)) {
  if (SHOWN.has(pid)) continue;
  if (MARKUP.indexOf('/p/' + pid + '"') >= 0) strangers.push(pid);
}
eq(JSON.stringify(strangers), "[]", "no other person on the roster is linked from the strip");
// The two the brief names explicitly as NOT on it: the curated congressional
// table answers UT-3 with kennedy, and the strip does not silently add him.
for (const pid of ["kennedy", "bmoore", "owens"]) {
  lacks(MARKUP, "/p/" + pid, `${pid} is not on the strip — no extra member is added`);
}
eq(Object.keys(ENGINE.CMP_DATA).filter((p) => MARKUP.indexOf('data-pdx-person-link="' + p + '"') >= 0).length,
  6, "exactly six people are named");

// A pid the roster has no row for is DROPPED, not printed and not minted. This
// probe removes the Governor's row and the whole office goes with it — there is
// no "Governor: cox" fallback built from the pid string.
{
  const people = {};
  for (const pid of [CHEW, "maloy", "lyman", "lee", "curtis"]) people[pid] = personById(pid);
  const w = boot("/", { people });
  const rows = w.PDXDistrictBallot.rows(HD68);
  eq(JSON.stringify(rows.map((o) => o.label)),
    JSON.stringify(["Utah State House", "U.S. House", "U.S. Senate"]),
    "an office whose every pid is missing from the roster is dropped whole");
  lacks(w.PDXDistrictBallot.html(HD68), "Governor",
    "and no empty heading is printed over it");
  lacks(w.PDXDistrictBallot.html(HD68), "cox", "no person is invented from a pid string");
}

// EACH ROW PRINTS THAT PERSON'S OWN ROSTER OFFICE LINE, and the strip asserts no
// district of its own about anybody. This district's geography is UT-3 and the
// roster files Maloy under District 2; writing "UT-3" beside her here would mint
// a fact the roster does not hold, in the one file whose whole job is pointing at
// files that already exist.
const maloyRow = MODEL[1].people.find((p) => p.pid === "maloy");
const lymanRow = MODEL[1].people.find((p) => p.pid === "lyman");
eq(maloyRow.office, String(ENGINE.CMP_DATA.maloy.office), "Maloy's row prints Maloy's own office string");
eq(lymanRow.office, String(ENGINE.CMP_DATA.lyman.office), "and Lyman's prints his");
has(MARKUP, "UT-3", "the roster's own (UT-3) filing shows where the roster puts it");
eq((MARKUP.match(/UT-3/g) || []).length, 1, "and exactly once — the strip claims no district itself");
lacks(BAL_CODE, "UT-3", "the string is the roster's, not this file's");
lacks(BAL_CODE, "District 2", "and no district number is written about anybody here");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · alphabetical inside an office · a name opens a person file");

// ALPHABETICAL ON THE DISPLAYED NAME, which is the string the reader's eye runs
// down. Both shared offices are asserted, and both are asserted against the REAL
// names rather than against the order the table happens to list.
eq(MODEL[1].people.map((p) => p.name).join(" / "), "Celeste Maloy / Phil Lyman",
  "Maloy before Lyman");
eq(MODEL[2].people.map((p) => p.name).join(" / "), "John Curtis / Mike Lee",
  "Curtis before Lee");
for (const office of MODEL) {
  const names = office.people.map((p) => p.name);
  eq(JSON.stringify(names), JSON.stringify(names.slice().sort((a, b) => a.localeCompare(b))),
    `${office.label} is in name order`);
}
// The table's own pid order is NOT the printed order, which is what proves the
// sort ran rather than the list happening to be right.
eq(B.BALLOT_SEATS[HD68][2].pids.join(","), "lee,curtis",
  "the table lists the Senators in one order…");
eq(MODEL[2].people.map((p) => p.pid).join(","), "curtis,lee",
  "…and the strip prints them in the other, because the sort is on the name");

// A NAME OPENS /p/<pid>, through the app's one funnel.
for (const pid of SHOWN) {
  has(MARKUP, 'href="/p/' + pid + '"', `${pid}'s name is a link to their person file`);
  has(MARKUP, 'data-pdx-person-link="' + pid + '"', `and it opens through the app's one person funnel`);
}
has(BAL_CODE, "PDXPersonLink", "the anchor is built by PDXPersonLink, not hand-rolled");
lacks(BAL_CODE, "'/p/'", "so this file composes no /p/ href of its own");
// No module missing → no broken promise: without PDXPersonLink the row is plain
// text rather than a link that goes nowhere.
{
  const w = boot("/", { extras: { PDXPersonLink: null } });
  const html = w.PDXDistrictBallot.html(HD68);
  has(html, "Scott Chew", "with the link module absent the names still print");
  lacks(html, "<a", "as plain text rather than as an anchor that could not open");
}

// TAPPING AN ISSUE ROOM STILL OPENS THE ROOM, NOT A POLITICIAN.
{
  const w = boot("/d/" + HD68);
  await settle(w);
  const rooms = w.document.getElementById("pdx-district-file-rooms");
  const ballot = w.document.getElementById("pdx-district-file-ballot");
  must(rooms && ballot, "the file did not paint its rooms and its ballot slot");
  has(rooms.innerHTML, "/d/" + HD68 + "/" + FLAGSHIP_ISSUE,
    "a room row still points at the room's own two-segment address");
  lacks(rooms.innerHTML, "/p/", "and a room row opens no person file");
  lacks(ballot.innerHTML, "/d/" + HD68 + "/", "and the strip opens no room");

  // THE ORDER A READER ACTUALLY SEES: Voice's question, then the ballot strip,
  // then the issue rooms.
  const scroll = w.document.getElementById("pdx-district-file-scroll");
  eq(JSON.stringify(scroll.children.map((c) => c.id)),
    JSON.stringify(["pdx-district-file-voice", "pdx-district-file-ballot", "pdx-district-file-rooms"]),
    "the strip sits under the question / This week and above the issue rooms");
  has(ballot.innerHTML, B.COPY.kick, "the strip is painted on the canonical address");
  has(ballot.innerHTML, "Scott Chew", "with the seat's own member on it");
  has(ballot.innerHTML, "Mike Lee", "and the Senators");

  // WHO TALKS DOES NOT CHANGE. The Voice block still carries no pid — the strip
  // is a sibling of it, not a block inside it, and that is the whole reason it is
  // a separate module.
  const voice = w.document.getElementById("pdx-district-file-voice");
  must(voice, "the Voice container is gone");
  for (const pid of SHOWN) {
    lacks(voice.innerHTML, pid, `no ${pid} in the Voice block — a take belongs to the seat`);
  }

  // THE TAKE IS KEYED TO AN ISSUE AND IS NEVER REQUIRED TO NAME THE MEMBER. The
  // composer's key is the poll's issue, and the strip added no field to it.
  lacks(ballot.innerHTML, "pdxv-", "the strip does not reach into Voice's class names");
  lacks(ballot.innerHTML, "<textarea", "and it carries no composer of its own");
}

// The same file on the ALIAS address paints the same strip.
{
  const w = boot("/d/" + HD68_ALIAS);
  await settle(w);
  const ballot = w.document.getElementById("pdx-district-file-ballot");
  must(ballot, "the alias arrival painted no ballot slot");
  has(ballot.innerHTML, "Scott Chew", "the alias arrival paints the same strip");
  has(ballot.innerHTML, 'data-pdxb-seat="' + HD68 + '"', "keyed on the canonical seat");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the one-liner is the person file's own, or there is none");

// SAID, LABELLED AS THEIRS, from the REAL stance cards. Read off the engine and
// compared, so the strip cannot print a topic the person file does not hold.
for (const pid of SHOWN) {
  const list = ENGINE._resolveStanceList(pid, personById(pid)) || [];
  const topic = (list.find((s) => s && s.topic) || {}).topic || "";
  const line = B.lineFor(pid);
  if (!topic) { ok(line === null, `${pid} has no card and no line`); continue; }
  must(line, `${pid} has stance cards on file and the strip printed no line`);
  eq(line.kind, "said", `${pid}'s line is the SAID card, because the formal record holds no pattern yet`);
  eq(line.text, "Said: " + topic, `and it is that card's own topic, labelled as theirs`);
}
// EMPTY / THIN FILES STAY HONEST. Lyman is the brief's own example: stance cards,
// no formal acts on file. He gets a Said: line and no record line, and no act is
// invented to fill the gap.
{
  const line = B.lineFor("lyman");
  eq(line.kind, "said", "Lyman's line is SAID");
  has(MARKUP, "Said: Public Land Ownership", "his own first card, in his own words");
  const so = ENGINE.PDXConsistency.recordStandout.pick("lyman");
  eq(!!so.any, false, "the formal record holds no pattern for him…");
  lacks(MARKUP, LEAD + ": ", "…so no record line is printed for anybody who has none");
}
eq(B.lineFor("nobody_at_all"), null, "a pid with no file at all gets no line");
eq(B.lineFor(""), null, "and neither does an empty pid");
// A ROW WITH NO LINE IS A ROW WITH NO LINE. No placeholder, no skeleton, no
// "no record yet" filler sentence standing in for one.
{
  const w = boot("/", { extras: { _resolveStanceList: () => [] } });
  const html = w.PDXDistrictBallot.html(HD68);
  has(html, "Scott Chew", "with no cards and no record the names still print");
  lacks(html, "pdxb-line", "and not one line element is painted");
  for (const bad of ["No record", "Nothing on file", "Coming soon", "not yet"]) {
    lacks(html, bad, `no "${bad}" placeholder stands in for a line`);
  }
}

// RECORD FIRST, in the engine's own words. The formal record hydrates from the
// public /api/voting-record read rather than from shipped JS, so the pattern path
// is exercised with the engine ANSWERING — the precedence, the wording and the
// refusals are the assertions, and none of them is a second copy of the engine.
{
  const row = { label: "Public lands", saysLabel: "Advanced protection", patLabel: "x",
                counts: "8 advanced · 3 against", held: 11, noun: { one: "act", many: "acts" } };
  const consistency = { recordStandout: { pick: (pid) =>
    pid === "lee" ? { any: true, consistent: [row], mixed: [] } : { any: false, consistent: [], mixed: [] } } };
  const w = boot("/", { consistency });
  const Bx = w.PDXDistrictBallot;
  const line = Bx.lineFor("lee");
  eq(line.kind, "record", "a member whose record HOLDS a pattern gets the record line");
  eq(line.text, "Public lands — " + LEAD + ": Advanced protection",
    "the issue, the app's own lead phrase, and the engine's own word");
  has(line.text, LEAD, "the lead phrase is read from the engine and not reworded here");
  lacks(line.text, "8 advanced", "the counts stay on the person file this name links to");
  lacks(line.text, "11", "and no depth number is printed on the strip");
  eq(Bx.lineFor("curtis").kind, "said", "and a member with no pattern still gets their SAID card");
  const html = Bx.html(HD68);
  has(html, 'data-pdxb-line="record"', "the two kinds are distinguishable to a test…");
  has(html, 'data-pdxb-line="said"', "…and both are on the strip");
  eq((html.match(/pdxb-line/g) || []).length, 12,
    "one line per person, and six people — no row gets two");
}
// A LINE THAT ARRIVES WITH A PERCENTAGE IN IT IS DROPPED, NOT TRIMMED. The
// engines upstream are free to grow one without knowing this strip reads them,
// and a mangled sentence would still be a sentence.
{
  const consistency = { recordStandout: { pick: () => ({ any: true,
    consistent: [{ label: "Public lands", saysLabel: "Advanced protection 80%" }], mixed: [] }) } };
  const w = boot("/", { consistency, extras: { _resolveStanceList: () => [] } });
  const line = w.PDXDistrictBallot.lineFor("lee");
  eq(line, null, "a record line carrying a percentage is dropped whole");
  lacks(w.PDXDistrictBallot.html(HD68), "80", "and nothing of it reaches the strip");
  lacks(w.PDXDistrictBallot.html(HD68), "pdxb-line", "the row prints no line at all instead");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · zero percentage, party or score — on the strip, in the source, in the sheet");

lacks(MARKUP, "%", "no percentage in the painted strip");
for (const bad of ["Republican", "Democrat", "Democratic", "GOP", "(R)", "(D)", "party",
                   "Party", "caucus", "score", "Score", "grade", "Grade", "rank", "Rank",
                   "leaderboard", "Direction Match", "Mandate", "composite", "vs "]) {
  lacks(MARKUP, bad, `the strip paints no "${bad}"`);
}
// Nothing on the strip is a number at all, which is the shortest way to say that
// nothing on it can be read as a score.
// Everything that legitimately carries a digit is removed first: the person ids
// in the hrefs, the seat key in the strip's own data attribute, and the roster's
// own "(UT-3)" office text. What is left must have no figure in it at all.
const FIGURELESS = MARKUP
  .replace(/\/p\/[a-z0-9_]+/g, "").replace(/data-pdx-person-link="[a-z0-9_]+"/g, "")
  .replace(/data-pdxb-seat="[a-z0-9-]+"/g, "").replace(/UT-3/g, "")
  .replace(/&#[0-9]+;/g, "");
eq(/[0-9]/.test(FIGURELESS), false,
  "there is no figure on the strip outside a pid, the seat key and the roster's own office text");
for (const bad of ["party", "caucus", "score", "grade", "rank", "leaderboard", "upvote",
                   "downvote", "trending", "popular", "karma", "reputation", "directionMatch",
                   "percent", "textarea", "<form", "toFixed", "Math.round"]) {
  lacks(BAL_CODE, bad, `the module's code has no "${bad}"`);
}
// THE ONE PERCENT SIGN IN THE FILE IS THE ONE IT REFUSES. A line that arrives
// from an engine upstream carrying a percentage is dropped whole, and that guard
// is the only place the character appears.
eq((BAL_CODE.match(/%/g) || []).length, 1,
  "the only percent sign in the module is the one in the guard that drops a line for having it");
has(BAL_CODE, "indexOf('%')", "and that is what it does with it");
// The sort is on the name and on nothing that could stand in for a ranking.
has(BAL_CODE, "localeCompare", "the sort is a name comparison");
eq((BAL_CODE.match(/\.sort\(/g) || []).length, 1, "and it is the only sort in the file");

// THE SHEET: no verdict palette, no party colour, and nothing that scales.
for (const hex of ["#4ade80", "#86efac", "#22c55e", "#f87171", "#ef4444", "#dc2626",
                   "#16a34a", "#b91c1c"]) {
  lacks(BAL_STYLE, hex, `the stylesheet takes none of the verdict palette (${hex})`);
}
lacks(BAL_STYLE, "%", "no rule in the sheet takes a percentage — nothing scales with a count");
for (const bad of ["linear-gradient", "width: calc", "transform: scale", "var(--pct",
                   "progress", "meter"]) {
  lacks(BAL_STYLE, bad, `and no "${bad}" — there is no bar, fill or ring to draw`);
}
has(BAL_STYLE, "#7dd3fc", "it takes the same one cool accent the file, the room and Voice take");
// NO SHEET REACHES INTO ANOTHER'S CLASS NAMES.
for (const foreign of [".pdxv", ".pdxdr-", ".pdxdf-"]) {
  lacks(BAL_STYLE, foreign, `the sheet does not style ${foreign}* — that belongs to another file`);
}
lacks(strip(FILE_CSS), ".pdxb-", "and district-file.css does not style the strip's rows");
has(strip(FILE_CSS), ".pdxdf-ballot", "it styles only its own container for it");
// NOT A MINI-PROFILE: no face, no bio, no chip row, no stat.
for (const bad of ["<img", "photo", "headshot", "avatar", "bio", "blurb", "summary"]) {
  lacks(BAL_CODE, bad, `no "${bad}" — a row is a name, an office and at most one line`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the write path is untouched — and the strip asks for nothing");

// NO REQUEST AT ALL. Not a gated one, not a read: every fact the strip prints is
// already in the page, so there is nothing for it to ask anybody.
lacks(BAL_CODE, "fetch", "there is no fetch in the module");
lacks(BAL_CODE, "/api/", "no API address");
lacks(BAL_CODE, "POST", "no POST");
lacks(BAL_CODE, "Authorization", "no Authorization header");
lacks(BAL_CODE, "getIdToken", "no token is minted");
lacks(BAL_CODE, "localStorage", "and nothing is written to the device either");
eq((BAL_CODE.match(/'\/api\/[^']*'/g) || []).length, 0, "the module reaches zero API addresses");

// Observed, not asserted about source: the strip's own mount adds no call, and
// the district file still reaches exactly the two addresses it reached before.
{
  const withStrip = boot("/d/" + HD68);
  await settle(withStrip);
  const without = boot("/d/" + HD68, { noBallot: true });
  await settle(without);
  const urls = (w) => [...new Set(w.__calls.map((c) => c.url.split("?")[0]))].sort().join(",");
  eq(urls(withStrip), urls(without),
    "the page with the strip and the page without it make the SAME requests");
  eq(withStrip.__posts.length, 0, "the strip writes nothing");
  eq(without.__posts.length, 0, "and neither did the page before it");
  for (const c of withStrip.__calls) {
    eq(!!(c.init.headers || {}).Authorization, false,
      "still no Authorization header anywhere on the file — reading is open");
  }
}

// THE PERSON FILE'S ONE QUIET LINK IS UNCHANGED. Voice gives a person file a link
// TO a place, and only for somebody who SITS in a Voice seat. The strip points the
// other way — from the place to the person — and it added no link back.
{
  const V = W0.PDXVoice;
  must(V && typeof V.personLinkHtml === "function", "district-voice.js did not boot beside the strip");
  eq(V.personLinkHtml("lee"), "", "Lee's person file still has no Voice neighbour link");
  eq(V.personLinkHtml("cox"), "", "Cox's still has none");
  for (const pid of ["maloy", "lyman", "curtis", "kennedy"]) {
    eq(V.personLinkHtml(pid), "", `${pid}'s still has none`);
  }
  const chewLink = V.personLinkHtml(CHEW);
  has(chewLink, "/d/" + HD68, "Chew's still has the quiet HD-68 neighbour link");
  eq((chewLink.match(/<a /g) || []).length, 1, "exactly one link, and only the one");
  has(chewLink, "Neighbors in this seat", "with the wording it already had");
  eq(V.seatForPid("lee"), "", "and the seat→member direction is unchanged: Lee sits in no Voice seat");
  eq(V.seatForPid(CHEW), HD68, "Chew sits in this one");
}
// The strip does not mint a second answer to that question.
lacks(BAL_CODE, "seatForPid", "the strip does not answer which seat a person sits in");
lacks(BAL_CODE, "pf-kick-voice", "and it adds no link to any person file");
lacks(BAL_CODE, "PDXVoice", "it reads nothing out of Voice…");
lacks(strip(VOICE_SRC), "PDXDistrictBallot", "…and Voice reads nothing out of it");
lacks(strip(VOICE_SRC), "pdxb-", "no module reaches into the other's class names");

// THE GATE IS WHERE IT WAS. The strip is client markup and could not move it.
const VOICE_FN = strip(R("netlify/lib/district-voice-core.mjs"));
lacks(VOICE_FN, "district-ballot", "the write gate knows nothing about the strip");
lacks(VOICE_FN, "pdxb", "and nothing the strip paints reaches it");
has(VOICE_FN, "canPost", "and still decides who may post, in the same place");

// ═════════════════════════════════════════════════════════════════════════════
section("7 · not slice 2, not a second district, not a nav item");

for (const bad of ["reply", "Reply", "like", "Like", "heart", "react",
                   "digest", "subscribe", "identity", "verify", "Veriff", "Stripe"]) {
  lacks(BAL_CODE, bad, `slice 2 is still unshipped — no "${bad}" in the module`);
}
// The one "thread" in the file is the copy REFUSING to be one: the strip's own
// sentence says talking here is still neighbours of this district and not a
// statewide thread. That sentence is required, and it is the only occurrence.
eq((BAL_CODE.match(/thread/g) || []).length, 1, "the word appears exactly once…");
has(B.COPY.frame, "not a statewide thread", "…in the sentence that refuses to be one");
has(MARKUP, "not a statewide thread", "and it is painted on the strip");
has(MARKUP, "this district’s ballot", "beside what the names on it are");
lacks(BAL_CODE, "nav", "no nav item was added");
eq((INDEX.match(/district-ballot\.js/g) || []).length, 1,
  "index.html registers the module exactly once");
eq((INDEX.match(/district-ballot\.css/g) || []).length, 2,
  "and the stylesheet twice — the non-blocking link and its noscript fallback");
has(INDEX, '<script defer src="/district-ballot.js"></script>',
  "loaded deferred, like every module beside it");
has(INDEX, '<link rel="stylesheet" href="/district-ballot.css" media="print" onload="this.media=\'all\'" />',
  "and the sheet on the same non-blocking path as the three district sheets");
// Order matters only as documentation — the strip mounts on open, long after
// every deferred script has parsed — but the file is registered after the module
// that mounts it, which is what the comment in index.html says.
ok(INDEX.indexOf('src="/district-ballot.js"') > INDEX.indexOf('src="/district-file.js"'),
  "registered after the district file that mounts it");

// THE MOUNT FAILS SOFT IN BOTH DIRECTIONS, which is what keeps a boot without the
// strip identical to the page that shipped before it.
{
  const w = boot("/d/" + HD68, { noBallot: true });
  await settle(w);
  const ballot = w.document.getElementById("pdx-district-file-ballot");
  must(ballot, "the container is not emitted without the module — the slot is the file's");
  eq(ballot.innerHTML, "", "and with the module absent it paints nothing at all");
  has(w.document.getElementById("pdx-district-file-rooms").innerHTML, "Issue rooms",
    "the rooms list is exactly what it was");
}
has(strip(FILE_SRC), "PDXDistrictBallot", "the file asks for the module by name…");
has(strip(FILE_SRC), "pdx-district-file-ballot", "…hands it one container by id…");
eq((strip(FILE_SRC).match(/ballotMount\(/g) || []).length, 2,
  "…and mounts it once per open, beside Voice");
// Direction Match, the formal tiers, the finance lane and the Mandate math are
// not reachable from this file.
for (const bad of ["directionMatch", "PDXFinanceLane", "mandate", "Mandate", "formalTier",
                   "scopedOverall", "alignSetIntensity"]) {
  lacks(BAL_CODE, bad, `the strip does not touch ${bad}`);
}
// It reads the pattern engine and the stance resolver, and writes to neither.
has(BAL_CODE, "recordStandout", "it reads the pattern engine's own selection");
has(BAL_CODE, "_resolveStanceList", "and the shared stance resolver");
eq((BAL_CODE.match(/window\.[A-Za-z_$][\w$]*\s*=/g) || []).length, 1,
  "and it publishes exactly ONE namespace and writes no other global");
has(BAL_CODE, "window.PDXDistrictBallot =", "which is PDXDistrictBallot");

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the shell ships it, behind a bump");

has(SW, "'/district-ballot.js',", "the service worker precaches the module");
has(SW, "'/district-ballot.css',", "and the stylesheet");
// The bump is required because precached shell files changed: two are new, and
// district-file.js / district-file.css both moved.
for (const f of ["'/district-file.js',", "'/district-file.css',",
                 "'/district-voice.js',", "'/district-voice.css',"]) {
  has(SW, f, `${f} is still precached`);
}
const ver = /const CACHE_VERSION = '(v\d+)'/.exec(SW);
must(ver, "sw.js no longer declares a CACHE_VERSION");
ok(parseInt(ver[1].slice(1), 10) >= 175,
  `CACHE_VERSION is ${ver[1]} — a changed precached shell file requires the bump`);
has(SW, "politidex-shell-${CACHE_VERSION}", "the shell cache name still carries the version");
has(SW, "politidex-runtime-${CACHE_VERSION}", "and so does the runtime cache");
// One version log entry per bump, naming what moved.
has(SW, "// v" + ver[1].slice(1) + " - ",
  "the version log has a prose entry for this bump, in the form the shell suites read");

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ district-ballot: ${failures.length} failed assertion(s)\n`);
  failures.forEach((f) => console.error("   · " + f));
  process.exit(1);
}
console.log(`\n✓ district-ballot: all ${passed} assertions passed`);
console.log("   one district, four offices · six names, no extra member · alphabetical " +
  "inside an office · record first, said second, nothing third · no percentage, party " +
  "or score · the strip asks for nothing · Lee / Cox keep no neighbor link · Chew keeps " +
  "exactly one · precached behind " + ver[1]);
