#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-first-visit-coach.mjs — the four-step, skippable first-visit walk
// ─────────────────────────────────────────────────────────────────────────────
// first-visit-coach.js walks a new reader through the core flow: see who
// represents you, this is the record, District Voice is the rooms for your
// seats, done. Every way it goes wrong ships looking fine:
//
//   1. IT SHOWS TO THE WRONG READER — a reader with a saved location, or one
//      who already skipped it.
//   2. IT COMES BACK after Skip or Got it.
//   3. ITS DOORS POINT SOMEWHERE NEW — step 1 must be the finder, step 3 /voice.
//   4. IT TRAPS — no Skip on some step, or a modal backdrop / focus trap.
//   5. EQUITY OR MEMBERSHIP VOCABULARY lands in its copy.
//   6. IT WRITES something other than its own flag.
//   7. SOMETHING ELSE MOVED WITH IT — the homepage District Voice gate, /voice,
//      the finder, the money surfaces, or the worker.
//
//   node scripts/test-first-visit-coach.mjs
//
// Real file, one node:vm sandbox per "visit", a minimal fake DOM. No network.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(Object.is(a, b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — ${JSON.stringify(n)} missing`);
const no = (h, n, m) => ok(String(h).indexOf(n) < 0, `${m} — ${JSON.stringify(n)} present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);

const SRC = R("first-visit-coach.js");
const stripComments = (s) => String(s)
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/^[ \t]*\/\/.*$/gm, " ");

// ── A minimal DOM: enough for getElementById, insertBefore and listeners ─────
function el(tag, id) {
  const e = {
    tagName: String(tag).toUpperCase(), id: id || "", className: "", innerHTML: "", textContent: "",
    parentNode: null, children: [], attrs: {}, listeners: {},
    get firstChild() { return this.children[0] || null; },
    get nextSibling() {
      if (!this.parentNode) return null;
      const k = this.parentNode.children.indexOf(this);
      return this.parentNode.children[k + 1] || null;
    },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    hasAttribute(k) { return k in this.attrs; },
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
    removeEventListener() {},
    appendChild(c) { return this.insertBefore(c, null); },
    insertBefore(c, before) {
      if (c.parentNode) c.parentNode.removeChild(c);
      const k = before ? this.children.indexOf(before) : -1;
      if (k >= 0) this.children.splice(k, 0, c); else this.children.push(c);
      c.parentNode = this;
      return c;
    },
    removeChild(c) {
      const k = this.children.indexOf(c);
      if (k >= 0) this.children.splice(k, 1);
      c.parentNode = null;
      return c;
    },
    querySelector() { return null; },
  };
  return e;
}

function memStore(seed) {
  const m = new Map(Object.entries(seed || {}));
  const writes = [];
  return {
    writes,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { writes.push(k); m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    dump: () => Object.fromEntries(m),
  };
}

// One page load. `page` is 'home' | 'voice' | 'find'.
function visit({ page = "home", located = false, local, session, extra } = {}) {
  const byId = {};
  const head = el("head"), body = el("body");
  const add = (parent, e) => { parent.appendChild(e); if (e.id) byId[e.id] = e; return e; };
  if (page === "home") {
    const hero = add(body, el("section", "hero"));
    const card = add(hero, el("div"));
    card.className = "pdxhv-card";
    add(card, el("a", "pdx-home-voice-door"));
    add(body, el("section", "who-represents-me"));
  } else {
    const main = add(body, el("main", page === "voice" ? "voice-room" : "pdx-find"));
    const wrap = add(main, el("div"));
    wrap.className = page === "voice" ? "pdxvr-wrap" : "pdxfd-wrap";
    add(main, el("div", "after-intro"));
    main.querySelector = () => wrap;
  }
  const events = [];
  const document = {
    readyState: "complete", head, body, documentElement: el("html"),
    getElementById: (id) => {
      const walk = (n) => { if (n.id === id) return n; for (const c of n.children) { const f = walk(c); if (f) return f; } return null; };
      return walk(body) || walk(head);
    },
    createElement: (t) => el(t),
    addEventListener() {}, dispatchEvent: (ev) => { events.push(ev); return true; },
  };
  const win = {
    document,
    localStorage: local || memStore(),
    sessionStorage: session || memStore(),
    _hasUserLocation: !!located,
    addEventListener() {}, removeEventListener() {},
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    CustomEvent: class { constructor(t, o) { this.type = t; Object.assign(this, o || {}); } },
    JSON, Math, Date, String, Number, parseInt,
  };
  if (page === "find") win.__PDX_FIND_DOC = true;
  if (page === "voice") win.__PDX_VOICE_DOC = true;
  Object.assign(win, extra || {});
  win.window = win;
  vm.runInContext(SRC, vm.createContext(win), { filename: "first-visit-coach.js" });
  const coach = document.getElementById("pdx-first-visit-coach");
  return { win, document, coach, events, C: win.PDXCoach };
}

// Click on an element carrying `attr="value"` inside the coach's current markup.
function click(v, attr, value, evExtra) {
  const target = {
    closest: (sel) => {
      const m = /^\[([\w-]+)\]$/.exec(sel);
      if (!m || m[1] !== attr) return null;
      return { getAttribute: (k) => (k === attr ? value : null) };
    },
  };
  let prevented = false;
  const ev = Object.assign({ target, preventDefault() { prevented = true; }, button: 0 }, evExtra || {});
  for (const f of (v.coach.listeners.click || [])) f(ev);
  return prevented;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · it appears only for a first visit");
// ═════════════════════════════════════════════════════════════════════════════
{
  const v = visit();
  ok(!!v.coach, "no location, no flag: the coach did not mount on the homepage");
  eq(v.C.shouldShow(), true, "shouldShow() with no location and no flag");
  eq(v.coach && v.coach.getAttribute("data-pdxfc-at"), "seat", "the walk does not open on step 1");
  // Placement: directly above the District Voice card, inside the hero.
  const hero = v.document.getElementById("hero");
  ok(v.coach && v.coach.parentNode === hero && hero.children[0] === v.coach &&
     hero.children[1].className === "pdxhv-card",
     "the coach is not mounted directly above the homepage District Voice card");
  eq(v.coach && v.coach.getAttribute("role"), "region", "the coach is not a plain region");
}
{
  const v = visit({ located: true });
  ok(!v.coach, "a reader with a saved location was shown the coach");
  eq(v.C.shouldShow(), false, "shouldShow() with a saved location");
}
{
  const local = memStore({ pdx_coach_seen: '{"v":1,"via":"skip"}' });
  const v = visit({ local });
  ok(!v.coach, "a reader who already dismissed the coach was shown it again");
}
for (const page of ["voice", "find"]) {
  const v = visit({ page });
  ok(!!v.coach, `no location, no flag: the coach did not mount on /${page}`);
  const main = v.document.getElementById(page === "voice" ? "voice-room" : "pdx-find");
  ok(v.coach && main.children[1] === v.coach, `/${page}: the coach is not directly under the page's intro`);
  ok(!visit({ page, located: true }).coach, `/${page}: a located reader was shown the coach`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · skip and finish set the flag, and it never comes back");
// ═════════════════════════════════════════════════════════════════════════════
for (const [label, run] of [
  ["skip on step 1", (v) => click(v, "data-pdxfc-act", "skip")],
  ["skip on step 3", (v) => { v.C._go(2); click(v, "data-pdxfc-act", "skip"); }],
  ["finish", (v) => { v.C._go(3); click(v, "data-pdxfc-act", "finish"); }],
]) {
  const local = memStore(), session = memStore();
  const v = visit({ local, session });
  run(v);
  ok(!v.document.getElementById("pdx-first-visit-coach"), `${label}: the coach is still on the page`);
  ok(!!local.getItem(v.C.KEY), `${label}: the flag was not written`);
  eq(session.getItem(v.C.STEP_KEY), null, `${label}: the in-tab step survived the dismissal`);
  ok(v.events.some((e) => e.type === "pdx:coach-dismissed"), `${label}: no dismissal event`);
  for (const page of ["home", "voice", "find"]) {
    ok(!visit({ page, local, session }).coach, `${label}: the coach reappeared on the next ${page} visit`);
  }
}
{
  // Skip is on EVERY step, so it never traps anyone.
  const v = visit();
  v.C.STEPS.forEach((_, i) => has(v.C._html(i), 'data-pdxfc-act="skip"', `step ${i + 1} has no Skip`));
  has(v.C._html(3), ">Got it<", "the last step has no Got it");
  eq(v.C.STEPS.length, 4, "the walk is not four steps");
  // Escape inside the card skips too.
  const local = memStore();
  const w = visit({ local });
  for (const f of (w.coach.listeners.keydown || [])) f({ key: "Escape" });
  ok(!!local.getItem(w.C.KEY), "Escape inside the coach does not dismiss it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the doors: finder, record, /voice");
// ═════════════════════════════════════════════════════════════════════════════
{
  const v = visit();
  const href = (i) => (/class="pdxfc-door" href="([^"]*)"/.exec(v.C._html(i)) || [, ""])[1];
  eq(href(0), "/find", "step 1's control is not the finder");
  has(v.C._html(0), 'data-pdxfc-door="finder"', "step 1's door is not marked as the finder");
  eq(href(1), "/stances", "step 2 does not point at the issue browser");
  eq(href(2), "/voice", "step 3's control is not /voice");
  eq(href(3), "", "the done step carries a door");
  has(v.C._html(0), "Start by setting your location so PolitiDex can show the people who already hold power over you.",
    "step 1's line drifted");
  has(v.C._html(1), "Every person file shows what they said and how they actually voted, with the bills and the short line under each vote.",
    "step 2's line drifted");
  has(v.C._html(2), "Anyone can read a board. Only verified residents of that seat get a voice that counts.",
    "step 3 does not carry the locked District Voice line verbatim");
  // The same locked line the boards carry.
  has(R("district-board.js"), "Anyone can read a board. Only verified residents of that seat get a voice that counts.",
    "the locked line moved in district-board.js — the coach and the boards must agree");
}
{
  // Homepage: a plain click on the finder door uses the shared lookup in place.
  let called = 0;
  const v = visit({ extra: { pdxFindMyReps: () => { called++; } } });
  const prevented = click(v, "data-pdxfc-door", "finder");
  eq(called, 1, "homepage: the finder door did not call pdxFindMyReps()");
  ok(prevented, "homepage: the finder door also navigated away");
  // A modified click is left to the browser (new tab to /find).
  const p2 = click(v, "data-pdxfc-door", "finder", { metaKey: true });
  ok(!p2 && called === 1, "a modified click on the finder door was intercepted");
}
{
  let opened = 0;
  const v = visit({ page: "find", extra: { openDistrictMapModal: () => { opened++; } } });
  click(v, "data-pdxfc-door", "finder");
  eq(opened, 1, "/find: the finder door did not open the map in place");
}
{
  // Following a door advances the walk for the next document.
  const session = memStore();
  const v = visit({ session });
  v.C._go(2);
  click(v, "data-pdxfc-door", "voice");
  eq(session.getItem(v.C.STEP_KEY), "3", "taking the /voice door does not advance the walk");
  const next = visit({ page: "voice", session, located: true });
  ok(!!next.coach, "a walk under way did not resume on /voice");
  eq(next.coach && next.coach.getAttribute("data-pdxfc-at"), "done", "the walk resumed on the wrong step");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · step 1 completes when a location is saved");
// ═════════════════════════════════════════════════════════════════════════════
{
  const v = visit();
  no(v.C._html(0), "pdxfc-ok", "step 1 claims a location before one is saved");
  v.win._hasUserLocation = true;
  const h = v.C._html(0);
  has(h, "pdxfc-ok", "step 1 does not mark itself complete once a location is saved");
  has(h, 'data-pdxfc-dot="now"', "the current step lost its marker");
  no(h, 'data-pdxfc-door="finder"', "step 1 still offers the finder after a location is saved");
  ok(/<li class="pdxfc-dot" data-pdxfc-dot="done"/.test(v.C._html(1)), "step 1's dot is not done on step 2");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · no equity, membership or payment copy; not a modal");
// ═════════════════════════════════════════════════════════════════════════════
{
  const v = visit();
  const copy = v.C.STEPS.map((_, i) => v.C._html(i)).join(" ").replace(/<[^>]*>/g, " ");
  const code = stripComments(SRC);
  for (const word of ["membership", "member", "premium", "stock", "share", "shares", "earn", "earning",
                      "equity", "Form C", "payment", "pay", "dues", "invest", "investor", "subscription"]) {
    const re = new RegExp(`\\b${word}\\b`, "i");
    ok(!re.test(copy), `the coach's copy carries "${word}"`);
    ok(!re.test(code), `first-visit-coach.js carries "${word}" outside a comment`);
  }
  // Each step stays short: at most two sentences of body copy (plus the
  // optional one-line note on step 3).
  v.C.STEPS.forEach((s, i) => {
    const n = (s.body.match(/[.!?](\s|$)/g) || []).length;
    ok(n >= 1 && n <= 2, `step ${i + 1}'s body is ${n} sentences`);
  });
  for (const trap of ["aria-modal", "inert", "overflow:hidden", "position:fixed", "backdrop", "focus-trap", "showModal"]) {
    no(code, trap, `the coach uses ${trap}, which makes it a modal`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · it writes only its own flag and touches no other door");
// ═════════════════════════════════════════════════════════════════════════════
{
  const local = memStore(), session = memStore();
  const v = visit({ local, session });
  v.C._go(1); v.C._go(2); click(v, "data-pdxfc-door", "voice"); v.C._go(3);
  click(v, "data-pdxfc-act", "finish");
  ok(local.writes.every((k) => k === "pdx_coach_seen"), `localStorage writes: ${local.writes.join(", ")}`);
  ok(session.writes.every((k) => k === "pdx_coach_step"), `sessionStorage writes: ${session.writes.join(", ")}`);
  const code = stripComments(SRC);
  for (const k of ["politidex_voter_location", "saveVoterLocation", "PDX_LOC_KEY", "pdx_first_run",
                   "residency", "dd_residency", "openAccount", "pdxOpenAccount", "acct-sheet", "PDXStore", "fetch(", "/api/"]) {
    no(code, k, `the coach reaches for ${k}`);
  }
  no(code, "/money", "the coach points at the money lane");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · wiring, and nothing else moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  const INDEX = R("index.html"), VOICE = R("voice.html"), FIND = R("find.html"), SW = R("sw.js");
  const TAG = '<script defer src="/first-visit-coach.js"></script>';
  for (const [n, doc] of [["index.html", INDEX], ["voice.html", VOICE], ["find.html", FIND]]) {
    eq(doc.split(TAG).length - 1, 1, `${n} does not load the coach exactly once`);
    ok(doc.indexOf(TAG) > doc.indexOf('src="/voter-hub-location.js"'),
      `${n} loads the coach before voter-hub-location.js`);
  }
  for (const n of ["money.html", "me.html", "ballot.html", "person.html"]) {
    if (existsSync(join(ROOT, n))) no(R(n), "first-visit-coach", `${n} loads the coach`);
  }
  // The homepage District Voice gate is untouched: the coach is not inside it.
  const a = INDEX.indexOf("<!-- pdx:home-voice-gate:begin -->");
  const b = INDEX.indexOf("<!-- pdx:home-voice-gate:end -->", a);
  ok(a > 0 && b > a, "the home voice gate markers are missing");
  no(INDEX.slice(a, b), "pdxfc", "the coach was written into the home voice gate");
  no(INDEX.slice(a, b), "first-visit-coach", "the coach was written into the home voice gate");
  // The worker: precached, and the shell moved.
  const assets = SW.slice(SW.indexOf("const SHELL_ASSETS = ["), SW.indexOf("];", SW.indexOf("const SHELL_ASSETS = [")));
  has(assets, "'/first-visit-coach.js'", "the coach is not precached");
  const ver = Number((/const CACHE_VERSION = 'v(\d+)'/.exec(SW) || [, 0])[1]);
  ok(ver >= 375, `CACHE_VERSION did not move for the coach (v${ver})`);
  has(SW, "// v375 - FIRST-VISIT COACH.", "the worker carries no note for the coach's version");
}

console.log("");
if (failures.length) {
  console.log(`   ${passed} passed, ${failures.length} failed\n`);
  for (const f of failures) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`   ✓ first-visit coach: all ${passed} assertions passed`);
