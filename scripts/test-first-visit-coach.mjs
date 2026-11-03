#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-first-visit-coach.mjs — the delayed first-visit welcome popup
// ─────────────────────────────────────────────────────────────────────────────
// first-visit-coach.js waits a few seconds after load, then shows a first-time
// reader one plain-language popup: set your location, search anything and see
// what they said versus how they voted, and what District Voice is. Every way it
// goes wrong ships looking fine:
//
//   1. IT SHOWS TO THE WRONG READER — a reader with a saved location, or one
//      who already closed it — or it shows before the delay, over the hero.
//   2. IT COMES BACK after Not now, ×, Escape, Got it or Set my location.
//   3. "SET MY LOCATION" POINTS SOMEWHERE NEW — it must be the finder.
//   4. IT TRAPS — no way out on some path, a focus trap, an inert page or a
//      scroll lock.
//   5. EQUITY OR MEMBERSHIP VOCABULARY lands in its copy.
//   6. IT WRITES something other than its own flag.
//   7. SOMETHING ELSE MOVED WITH IT — the homepage District Voice gate, /voice,
//      the finder, the money surfaces, or the worker.
//
//   node scripts/test-first-visit-coach.mjs
//
// Real file, one node:vm sandbox per "visit", a minimal fake DOM and a manual
// clock. No network.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { STATE_LEG_BOARD_SEATS, STATE_LEG_BOARD_STATES } from "./gen-district-boards.mjs";

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

// ── A minimal DOM ─────────────────────────────────────────────────────────────
function el(tag, id) {
  return {
    tagName: String(tag).toUpperCase(), id: id || "", className: "", innerHTML: "", textContent: "",
    parentNode: null, children: [], attrs: {}, listeners: {}, focused: 0,
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
    removeEventListener(t, f) { this.listeners[t] = (this.listeners[t] || []).filter((g) => g !== f); },
    appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); this.children.push(c); c.parentNode = this; return c; },
    removeChild(c) { const k = this.children.indexOf(c); if (k >= 0) this.children.splice(k, 1); c.parentNode = null; return c; },
    focus() { this.focused++; },
  };
}

function memStore(seed) {
  const m = new Map(Object.entries(seed || {}));
  const writes = [];
  return {
    writes,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { writes.push(k); m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}

// One page load. `page` is 'home' | 'voice' | 'find'.
// A dialog fixture with the geometry the popup reads. `open` is what a reader
// sees; the closed ones are the shapes that fooled the earlier rect-only check.
function dialog(id, { open = false, parked = null } = {}) {
  const box = open ? { left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 }
    : parked === "offscreen" ? { left: 0, top: 2000, right: 800, bottom: 2600, width: 800, height: 600 }
    : parked === "transparent" || parked === "invisible" ? { left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 }
    : { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  const style = { display: open || parked ? "flex" : "none", visibility: parked === "invisible" ? "hidden" : "visible",
                  opacity: parked === "transparent" ? "0" : "1" };
  return { id, className: "", __style: style, getBoundingClientRect: () => box, getClientRects: () => (box.width ? [box] : []) };
}

function visit({ page = "home", located, local, session, extra, dialogOpen = false, dialogs, readyState = "interactive" } = {}) {
  local = local || memStore();
  // What voter-hub-location.js would publish: a chosen record under its own key.
  if (located === undefined) {
    let rec = null;
    try { rec = JSON.parse(local.getItem("politidex_voter_location") || "null"); } catch (e) { rec = null; }
    located = !!(rec && rec.state && rec.src === "set");
  }
  const DIALOGS = dialogs || [
    dialog("pd-ec-modal"),                          // display:none
    dialog("pdx-medium-panel", { parked: "offscreen" }),
    dialog("compare-overlay", { parked: "transparent" }),
    dialog("office-modal", { parked: "invisible" }),
  ].concat(dialogOpen ? [dialog("modal-overlay", { open: true })] : []);
  const logs = [];
  const head = el("head"), body = el("body");
  if (page === "home") body.appendChild(el("section", "who-represents-me"));
  const title = el("h2", "pdxfc-title");
  const docListeners = {};
  const events = [];
  const timers = [];
  let now = 0;
  const document = {
    readyState, head, body, documentElement: el("html"), activeElement: null,
    getElementById: (id) => {
      if (id === "pdxfc-title") return title;
      const walk = (n) => { if (n.id === id) return n; for (const c of n.children) { const f = walk(c); if (f) return f; } return null; };
      return walk(body) || walk(head);
    },
    // Closed dialogs first (some of them still laid out), then (optionally) an
    // open one — the popup must look past every closed match.
    querySelectorAll: () => DIALOGS,
    createElement: (t) => el(t),
    addEventListener(t, f) { (docListeners[t] = docListeners[t] || []).push(f); },
    removeEventListener(t, f) { docListeners[t] = (docListeners[t] || []).filter((g) => g !== f); },
    dispatchEvent: (ev) => { events.push(ev); return true; },
  };
  const win = {
    document,
    localStorage: local,
    sessionStorage: session || memStore(),
    _hasUserLocation: !!located,
    addEventListener() {}, removeEventListener() {},
    setTimeout: (f, ms) => { timers.push({ f, at: now + (ms || 0), done: false }); return timers.length; },
    clearTimeout: (id) => { if (timers[id - 1]) timers[id - 1].done = true; },
    setInterval: () => 0, clearInterval() {},
    CustomEvent: class { constructor(t, o) { this.type = t; Object.assign(this, o || {}); } },
    getComputedStyle: (n) => n.__style || { display: "block", visibility: "visible", opacity: "1" },
    innerWidth: 800, innerHeight: 600,
    console: { info: (m) => logs.push(String(m)), log() {}, warn() {}, error() {} },
    JSON, Math, Date, String, Number, parseInt, parseFloat,
  };
  if (page === "find") win.__PDX_FIND_DOC = true;
  if (page === "voice") win.__PDX_VOICE_DOC = true;
  Object.assign(win, extra || {});
  win.window = win;
  vm.runInContext(SRC, vm.createContext(win), { filename: "first-visit-coach.js" });
  const v = {
    win, document, events, title, docListeners, logs, C: win.PDXCoach,
    fire(t) { for (const f of (docListeners[t] || [])) f({}); },
    dialogs: DIALOGS,
    popup: () => document.getElementById("pdx-first-visit-coach"),
    // Advance the manual clock, firing every timer that comes due.
    tick(ms) {
      const end = now + ms;
      for (;;) {
        const due = timers.filter((t) => !t.done && t.at <= end).sort((a, b) => a.at - b.at)[0];
        if (!due) break;
        now = due.at; due.done = true; due.f();
      }
      now = end;
    },
    key(k) { for (const f of (docListeners.keydown || [])) f({ key: k }); },
  };
  return v;
}

// Click on an element carrying `attr="value"` inside the popup.
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
  for (const f of (v.popup().listeners.click || [])) f(ev);
  return prevented;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · it appears only for a first visit, and only after the delay");
// ═════════════════════════════════════════════════════════════════════════════
{
  const D = visit().C.DELAY_MS;
  ok(D >= 8000 && D <= 10000, `the delay is ${D} ms — it should be 8–10 seconds`);
  for (const page of ["home", "voice", "find"]) {
    const v = visit({ page });
    ok(!v.popup(), `${page}: the popup is on screen before the delay`);
    v.tick(D - 1);
    ok(!v.popup(), `${page}: the popup opened before ${D} ms`);
    v.tick(1);
    const p = v.popup();
    ok(!!p, `${page}: no location, no flag — the popup did not open after the delay`);
    ok(!!p && p.parentNode === v.document.body, `${page}: the popup is not a page-level overlay on <body>`);
    eq(p && p.getAttribute("role"), "dialog", `${page}: the popup is not a dialog`);
    eq(p && p.getAttribute("aria-labelledby"), "pdxfc-title", `${page}: the popup has no accessible name`);
    ok(v.title.focused > 0, `${page}: focus did not move to the popup when it opened`);
  }
}
{
  const v = visit({ located: true });
  v.tick(60000);
  ok(!v.popup(), "a reader with a saved location was shown the popup");
  eq(v.C.shouldShow(), false, "shouldShow() with a saved location");
}
{
  // A location set during the delay cancels the popup.
  const v = visit();
  v.tick(3000);
  v.win._hasUserLocation = true;
  v.tick(60000);
  ok(!v.popup(), "the popup opened for a reader who set a location during the delay");
}
{
  const local = memStore({ pdx_coach_seen: '{"v":2,"via":"skip"}' });
  const v = visit({ local });
  v.tick(60000);
  ok(!v.popup(), "a reader who already dismissed the popup was shown it again");
}
{
  // Closed dialogs that are still laid out (off-screen, opacity 0, visibility
  // hidden) must not hold the popup back — that was the "never shows" bug.
  const v = visit();
  v.tick(v.C.DELAY_MS);
  ok(!!v.popup(), "a closed-but-laid-out dialog kept the popup from opening");
}
{
  // A dialog the reader can see delays the popup; when it closes, the popup opens.
  const v = visit({ dialogOpen: true });
  v.tick(v.C.DELAY_MS);
  ok(!v.popup(), "the popup opened on top of another open dialog");
  ok(v.logs.some((l) => /waiting: #modal-overlay is open/.test(l)), "no console line says what the popup is waiting behind");
  v.dialogs[v.dialogs.length - 1].__style.display = "none";
  v.dialogs[v.dialogs.length - 1].getBoundingClientRect = () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 });
  v.tick(2000);
  ok(!!v.popup(), "the popup did not open once the other dialog closed");
}
{
  // A dialog that never closes delays the popup at most 30s — it never cancels it.
  const v = visit({ dialogOpen: true });
  v.tick(v.C.DELAY_MS + 29000);
  ok(!v.popup(), "the popup stopped waiting behind an open dialog too early");
  v.tick(2000);
  ok(!!v.popup(), "a dialog that never closed cancelled the popup");
  ok(v.logs.some((l) => /showing anyway/.test(l)), "no console line says the popup showed anyway");
}
{
  // The clock starts at DOMContentLoaded, not window 'load' (which a slow
  // resource can hold back indefinitely).
  const v = visit({ readyState: "loading" });
  v.tick(60000);
  ok(!v.popup(), "the popup started its clock before the document was parsed");
  v.fire("DOMContentLoaded");
  v.tick(v.C.DELAY_MS);
  ok(!!v.popup(), "the popup did not open after DOMContentLoaded + the delay (it must not wait for window load)");
  no(SRC, "addEventListener('load'", "the popup still waits for window 'load'");
}

// ═════════════════════════════════════════════════════════════════════════════
section("1b · clearing both keys and reloading always shows it, and the console says why");
// ═════════════════════════════════════════════════════════════════════════════
{
  const LOC = JSON.stringify({ state: "Ohio", city: "Columbus", src: "set" });
  // A returning reader: the popup was closed once, and a location is saved.
  const local = memStore({ pdx_coach_seen: '{"v":2,"via":"skip"}', politidex_voter_location: LOC });
  for (const page of ["home", "voice", "find"]) {
    const v = visit({ page, local });
    v.tick(60000);
    ok(!v.popup(), `${page}: a returning reader was shown the popup`);
    ok(v.logs.some((l) => /^\[PolitiDex coach v\d+\] skipped: pdx_coach_seen is set/.test(l)),
      `${page}: no console line says it skipped because pdx_coach_seen is set`);
  }
  // Only the flag cleared: the location still holds it back, and says so.
  local.removeItem("pdx_coach_seen");
  {
    const v = visit({ local });
    v.tick(60000);
    ok(!v.popup(), "a reader with a saved location was shown the popup after clearing only the flag");
    ok(v.logs.some((l) => /skipped: a location is saved/.test(l)), "no console line says it skipped for a saved location");
  }
  // Both cleared, hard refresh: every page shows it after the delay.
  local.removeItem("politidex_voter_location");
  for (const page of ["home", "voice", "find"]) {
    for (const readyState of ["loading", "interactive", "complete"]) {
      const v = visit({ page, local, readyState });
      if (readyState === "loading") v.fire("DOMContentLoaded");
      v.tick(v.C.DELAY_MS - 1);
      ok(!v.popup(), `${page}/${readyState}: the popup opened before the delay`);
      v.tick(1);
      ok(!!v.popup(), `${page}/${readyState}: both keys cleared — the popup did not open after the delay`);
      ok(v.logs.some((l) => /first visit: showing in 9s/.test(l)), `${page}/${readyState}: no console line for the scheduled show`);
      ok(v.logs.some((l) => /\] showing\.$/.test(l)), `${page}/${readyState}: no console line when it showed`);
    }
  }
  // The flag key is still the only one the popup knows; it never clears the location.
  const code = stripComments(SRC);
  no(code, "removeItem('politidex_voter_location'", "the popup clears the location key");
  // reset() replays it on the current page.
  {
    const l2 = memStore();
    const v = visit({ local: l2 });
    v.tick(v.C.DELAY_MS);
    click(v, "data-pdxfc-act", "skip");
    ok(!v.popup() && !!l2.getItem("pdx_coach_seen"), "skip did not close and flag");
    v.C.reset();
    v.tick(v.C.DELAY_MS);
    ok(!!v.popup(), "PDXCoach.reset() did not replay the popup on this page");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · every way out sets the flag, and it never comes back");
// ═════════════════════════════════════════════════════════════════════════════
for (const [label, run] of [
  ["Not now", (v) => click(v, "data-pdxfc-act", "skip")],
  ["Got it", (v) => click(v, "data-pdxfc-act", "finish")],
  ["Escape", (v) => v.key("Escape")],
  ["the backdrop", (v) => { const p = v.popup(); for (const f of p.listeners.click) f({ target: p }); }],
  ["Set my location", (v) => click(v, "data-pdxfc-door", "finder")],
]) {
  const local = memStore();
  const v = visit({ local });
  v.tick(v.C.DELAY_MS);
  ok(!!v.popup(), `${label}: the popup did not open`);
  run(v);
  ok(!v.popup(), `${label}: the popup is still on the page`);
  ok(!!local.getItem(v.C.KEY), `${label}: the flag was not written`);
  ok(v.events.some((e) => e.type === "pdx:coach-dismissed"), `${label}: no dismissal event`);
  eq((v.docListeners.keydown || []).length, 0, `${label}: the Escape listener outlived the popup`);
  for (const page of ["home", "voice", "find"]) {
    const next = visit({ page, local });
    next.tick(60000);
    ok(!next.popup(), `${label}: the popup reappeared on the next ${page} visit`);
  }
}
{
  const h = visit().C._html();
  has(h, 'data-pdxfc-act="skip">Not now<', "there is no Not now");
  has(h, 'aria-label="Close"', "there is no close (×) button");
  has(h, 'data-pdxfc-act="finish">Got it<', "there is no Got it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · Set my location points at the finder");
// ═════════════════════════════════════════════════════════════════════════════
{
  const h = visit().C._html();
  const doors = [...h.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)];
  eq(doors.length, 1, "the popup carries more than one link");
  // next=/ so a confirmed pin on /find brings the reader back to the
  // homepage band, where the guided path is on step 2.
  eq(doors[0] && doors[0][1], "/find?next=%2F", "Set my location does not point at the finder with the way back");
  eq(doors[0] && doors[0][2], "Set my location", "the finder door is not labelled Set my location");
  has(h, 'data-pdxfc-door="finder"', "the door is not marked as the finder");
}
{
  // Homepage: a plain click closes the popup and follows the link to /find
  // (it goes to the finder and returns to the path), recording step 2.
  let called = 0;
  const session = memStore();
  const v = visit({ session, extra: { pdxFindMyReps: () => { called++; } } });
  v.tick(v.C.DELAY_MS);
  const prevented = click(v, "data-pdxfc-door", "finder");
  eq(called, 0, "homepage: Set my location opened the picker in place instead of going to /find");
  ok(!prevented, "homepage: Set my location did not follow its link to /find");
  ok(!v.popup(), "homepage: the popup stayed over the finder");
  eq(JSON.parse(session.getItem("pdx_path_v1") || "{}").step, "see", "homepage: Set my location did not move the path to step 2");
}
{
  let called = 0;
  const v = visit({ extra: { pdxFindMyReps: () => { called++; } } });
  v.tick(v.C.DELAY_MS);
  const prevented = click(v, "data-pdxfc-door", "finder", { metaKey: true });
  ok(!prevented && called === 0, "a modified click on Set my location was intercepted");
}
{
  let opened = 0;
  const v = visit({ page: "find", extra: { openDistrictMapModal: () => { opened++; } } });
  v.tick(v.C.DELAY_MS);
  click(v, "data-pdxfc-door", "finder");
  eq(opened, 1, "/find: Set my location did not open the map in place");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · plain copy, no equity or membership language, no trap");
// ═════════════════════════════════════════════════════════════════════════════
{
  const v = visit();
  const P = v.C.POINTS;
  eq(P.length, 3, "the popup does not make three points");
  has(P[0], "Set your location so PolitiDex can show the people who already represent you.", "point 1 drifted");
  ok(/search any politician, bill, topic or claim/i.test(P[1]) && /what they said versus how they voted/.test(P[1]),
    "point 2 does not say search anything, said versus voted");
  has(P[2], "District Voice is the rooms for your seats.", "point 3 does not name District Voice");
  has(P[2], "Anyone can read a board. Only verified residents of that seat get a voice that counts.",
    "point 3 does not carry the locked District Voice line verbatim");
  has(R("district-board.js"), "Anyone can read a board. Only verified residents of that seat get a voice that counts.",
    "the locked line moved in district-board.js — the popup and the boards must agree");

  const copy = v.C._html().replace(/<[^>]*>/g, " ");
  const code = stripComments(SRC);
  for (const word of ["membership", "member", "premium", "stock", "share", "shares", "earn", "earning",
                      "equity", "Form C", "payment", "pay", "dues", "invest", "investor", "subscription"]) {
    const re = new RegExp(`\\b${word}\\b`, "i");
    ok(!re.test(copy), `the popup's copy carries "${word}"`);
    ok(!re.test(code), `first-visit-coach.js carries "${word}" outside a comment`);
  }
  // Short: every point is one or two sentences after the name line.
  // The ceiling rose from 90 to 100 for the one Utah-first sentence and nothing else.
  ok(copy.replace(/\s+/g, " ").trim().split(" ").length <= 100, "the popup is not short");
  // No trap: no inert page, no aria-modal claim that hides the page, no scroll
  // lock on <body>/<html>, and no Tab interception.
  no(code, "setAttribute('aria-modal'", "the popup marks itself aria-modal, which hides the page from assistive tech");
  for (const trap of ["inert", "body.style", "documentElement.style", "focus-trap", "showModal", "'Tab'", '"Tab"']) {
    no(code, trap, `the popup uses ${trap}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4b · one Utah-first sentence under District Voice, and it is true");
// ═════════════════════════════════════════════════════════════════════════════
{
  const v = visit();
  const NOTE = "State legislative boards and mapping are live in Utah first. Other states will be added over time. U.S. House and U.S. Senate boards are open in every state.";
  eq(v.C.SCOPE_NOTE, NOTE, "the Utah-first sentence drifted");
  // The three points are exactly as they were, and the note is not one of them.
  eq(JSON.stringify(v.C.POINTS), JSON.stringify([
    "Set your location so PolitiDex can show the people who already represent you.",
    "Search any politician, bill, topic or claim and see what they said versus how they voted.",
    "District Voice is the rooms for your seats. Anyone can read a board. Only verified residents of that seat get a voice that counts.",
  ]), "the three points changed");
  const h = v.C._html();
  eq(h.split(NOTE).length - 1, 1, "the Utah-first sentence is not on the popup exactly once");
  {
    const w = visit();
    w.tick(w.C.DELAY_MS);
    const live = w.popup() ? w.popup().innerHTML : "";
    eq(live.split(NOTE).length - 1, 1, "the opened popup does not carry the Utah-first sentence exactly once");
  }
  eq((h.match(/<li\b/g) || []).length, 3, "the Utah-first sentence became a fourth step");
  // Under the third point: inside its <li>, after the District Voice line.
  const items = h.split("<li").slice(1);
  ok(items[2] && items[2].indexOf(NOTE) > items[2].indexOf("a voice that counts."),
    "the Utah-first sentence is not under the District Voice point");
  ok(items[0].indexOf(NOTE) < 0 && items[1].indexOf(NOTE) < 0, "the Utah-first sentence sits under the wrong point");
  // One sentence, not a disclaimer block: a plain span, no heading, no box —
  // and VISIBLE whatever the stylesheet does: its own inline styles say so.
  const span = (/<span class="pdxfc-scope"[^>]*>State legislative boards/.exec(h) || [""])[0];
  ok(span.length > 0, "the Utah-first sentence is not a plain span");
  const inline = (/style="([^"]*)"/.exec(span) || [, ""])[1];
  for (const want of ["display:block", "visibility:visible", "opacity:1", "color:#9fb5a8"]) {
    has(inline, want, "the Utah-first sentence does not carry its own visible inline style");
  }
  for (const hide of ["display:none", "visibility:hidden", "opacity:0;", "height:0", "max-height:0", "clip", "overflow:hidden", "hidden"]) {
    no(span.replace(/visibility:visible/g, ""), hide, `the Utah-first sentence is hidden or clipped (${hide})`);
  }
  // Nothing on the path to it hides it: not its <li>, not the list, not the card.
  const path = h.slice(0, h.indexOf(NOTE));
  no(path, " hidden", "an element around the Utah-first sentence is hidden");
  no(path, "aria-hidden=\"true\">State legislative", "the Utah-first sentence is aria-hidden");
  for (const cls of ["pdxfc-points", "pdxfc-point", "pdxfc-card"]) {
    const r = (new RegExp(`\\.${cls}\\{[^}]*\\}`).exec(SRC) || [""])[0];
    for (const hide of ["display:none", "visibility:hidden", "max-height:0", "height:0", "overflow:hidden"]) {
      no(r, hide, `.${cls} hides or clips the Utah-first sentence (${hide})`);
    }
  }
  // No condition can drop it: it renders on every render of the popup.
  eq(v.C._html().split(NOTE).length - 1, 1, "a second render dropped the Utah-first sentence");
  const rule = (/\.pdxfc-scope\{[^}]*\}/.exec(SRC) || [""])[0];
  for (const want of ["display:block !important", "visibility:visible !important"]) has(rule, want, "the sheet rule does not force the Utah-first line visible");
  ok(rule.length > 0, "the Utah-first sentence has no rule");
  for (const box of ["border", "background", "box-shadow"]) no(rule, box, `the Utah-first sentence is styled as a box (${box})`);
  // Its color is one the District Voice card already uses.
  const colors = rule.match(/#[0-9a-f]{3,6}\b/gi) || [];
  const INDEX = R("index.html");
  const gate = INDEX.slice(INDEX.indexOf("<!-- pdx:home-voice-gate:begin -->"), INDEX.indexOf("<!-- pdx:home-voice-gate:end -->"));
  ok(colors.length > 0 && colors.every((c) => gate.toLowerCase().indexOf(c.toLowerCase()) >= 0),
    `the Utah-first sentence uses a color the District Voice card does not (${colors.join(", ")})`);

  // TRUE TO THE SITE. Every State House and State Senate board document is a
  // Utah seat, and every board outside Utah is a U.S. House or U.S. Senate seat
  // (district-<code>-cd-<n>, district-<code>-us-senate-<pid>); the finder says
  // state legislative lines are drawn in Utah; and the U.S. House resolves
  // outside Utah (so the sentence does not claim representatives are Utah-only).
  const boards = readdirSync(ROOT).filter((f) => /^district-.*\.html$/.test(f));
  // The one exception is a list of races, not a state: the contested
  // Pennsylvania seats on the Nov. 3, 2026 ballot (pa-ballot-2026.js), each a
  // read-only board. Utah is still first, and a state is still not "added".
  const contested = new Set([...STATE_LEG_BOARD_SEATS].map((k) => `district-${k.replace("-statehouse-", "-hd-").replace("-statesenate-", "-sd-")}.html`));
  // And six states opened whole since (STATE_LEG_BOARD_STATES: Nebraska, South
  // Dakota, Idaho, Montana, Alaska, Rhode Island), each with a read-only
  // governor board; test-six-state-deepen.mjs holds them. Utah was still first,
  // and other states are still being added.
  const whole = (f) => STATE_LEG_BOARD_STATES.has(f.slice(9, 11));
  // A governor's board is a statewide seat, not a state legislative one; the
  // election-day wave opened one in every state with a governor's race.
  const outside = boards.filter((f) => !f.startsWith("district-ut-") && !contested.has(f) && !whole(f) && !/^district-[a-z]{2}-gov\.html$/.test(f));
  ok(boards.length > 0 && outside.every((f) => /^district-[a-z]{2}-(?:cd-[1-9][0-9]*|us-senate-[a-z][a-z0-9_]*)\.html$/.test(f)),
    `a state legislative board outside Utah exists, so "Utah first" is out of date: ${outside.filter((f) => !/^district-[a-z]{2}-(?:cd-|us-senate-)/.test(f)).join(", ")}`);
  ok(outside.length > 0, "no U.S. House or U.S. Senate board exists outside Utah, so the sentence's last clause is false");
  ok(/State Senate and State House<\/strong> seats need\s+district lines, which we map in <strong>Utah<\/strong>/.test(R("find.html")),
    "the finder no longer says state legislative lines are mapped in Utah — recheck the Utah-first sentence");
  ok(existsSync(join(ROOT, "scripts/test-federal-house-locator.mjs")) &&
     /U\.S\. House resolves outside Utah/.test(R("scripts/test-federal-house-locator.mjs")),
    "the U.S. House national locator is gone — recheck the Utah-first sentence");
  no(NOTE, "represent", "the Utah-first sentence says representatives are Utah-only, which is false");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · it writes only its own flag and touches no other door");
// ═════════════════════════════════════════════════════════════════════════════
{
  const local = memStore(), session = memStore();
  const v = visit({ local, session });
  v.tick(v.C.DELAY_MS);
  click(v, "data-pdxfc-act", "finish");
  ok(local.writes.length > 0 && local.writes.every((k) => k === "pdx_coach_seen"), `localStorage writes: ${local.writes.join(", ")}`);
  // sessionStorage carries only the guided path's own step, for this visit.
  ok(session.writes.every((k) => k === "pdx_path_v1"), `sessionStorage writes: ${session.writes.join(", ")}`);
  const code = stripComments(SRC);
  for (const k of ["politidex_voter_location", "saveVoterLocation", "PDX_LOC_KEY", "pdx_first_run",
                   "residency", "dd_residency", "openAccount", "pdxOpenAccount", "acct-sheet", "PDXStore",
                   "pdx_stance", "fetch(", "/api/"]) {
    no(code, k, `the popup reaches for ${k}`);
  }
  no(code, "/money", "the popup points at the money lane");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · wiring, and nothing else moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  const INDEX = R("index.html"), VOICE = R("voice.html"), FIND = R("find.html"), SW = R("sw.js");
  const TAG = '<script defer src="/first-visit-coach.js"></script>';
  for (const [n, doc] of [["index.html", INDEX], ["voice.html", VOICE], ["find.html", FIND]]) {
    eq(doc.split(TAG).length - 1, 1, `${n} does not load the popup exactly once`);
    ok(doc.indexOf(TAG) > doc.indexOf('src="/voter-hub-location.js"'),
      `${n} loads the popup before voter-hub-location.js`);
  }
  for (const n of ["money.html", "me.html", "ballot.html", "person.html"]) {
    if (existsSync(join(ROOT, n))) no(R(n), "first-visit-coach", `${n} loads the popup`);
  }
  // The homepage District Voice gate is untouched: the popup is not inside it.
  const a = INDEX.indexOf("<!-- pdx:home-voice-gate:begin -->");
  const b = INDEX.indexOf("<!-- pdx:home-voice-gate:end -->", a);
  ok(a > 0 && b > a, "the home voice gate markers are missing");
  no(INDEX.slice(a, b), "pdxfc", "the popup was written into the home voice gate");
  no(INDEX.slice(a, b), "first-visit-coach", "the popup was written into the home voice gate");
  // The worker: precached, and the shell moved for the popup.
  const assets = SW.slice(SW.indexOf("const SHELL_ASSETS = ["), SW.indexOf("];", SW.indexOf("const SHELL_ASSETS = [")));
  has(assets, "'/first-visit-coach.js'", "the popup is not precached");
  const ver = Number((/const CACHE_VERSION = 'v(\d+)'/.exec(SW) || [, 0])[1]);
  ok(ver >= 378, `CACHE_VERSION did not move for the reliability pass (v${ver})`);
  has(SW, "// v378 - FIRST-VISIT POPUP, RELIABLE.", "the worker carries no note for the reliability pass");
  // Network-first for the popup, so a deploy is never one load behind.
  has(SW, "const FRESH_FIRST = new Set(['/first-visit-coach.js']);", "the popup script is not network-first");
  ok(SW.indexOf("FRESH_FIRST.has(url.pathname)") > 0 &&
     SW.indexOf("FRESH_FIRST.has(url.pathname)") < SW.indexOf("event.respondWith(handleStatic(req));"),
    "the network-first route is not ahead of the stale-while-revalidate route");
  const fresh = SW.slice(SW.indexOf("async function handleFresh"), SW.indexOf("\n}\n", SW.indexOf("async function handleFresh")));
  ok(fresh.indexOf("await fetch(req)") >= 0 && fresh.indexOf("await fetch(req)") < fresh.indexOf("shell.match(req)"),
    "handleFresh does not try the network before the cache");
  // The script's own build tag names the worker version that last shipped it —
  // never one ahead of the worker (a later, unrelated bump need not touch it).
  const build = Number((/var BUILD = 'v(\d+)';/.exec(SRC) || [, 0])[1]);
  ok(build >= 378 && build <= ver, `the popup's BUILD tag (v${build}) is not a shipped worker version (v378–v${ver})`);
  has(SW, "// v376 - FIRST-VISIT POPUP.", "the worker carries no note for the popup's version");
  has(SW, "// v377 - FIRST-VISIT POPUP, UTAH FIRST.", "the worker carries no note for the Utah-first sentence");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the guided path: location → seats → rooms → optional stance");
// ═════════════════════════════════════════════════════════════════════════════
{
  const LOC = JSON.stringify({ state: "Utah", city: "Provo", src: "set" });
  const CONT = visit().C.CONTINUE_MS;
  const stepOf = (v) => { const p = v.popup(); const m = p && /data-pdxfc-step="([a-z]+)"/.exec(p.innerHTML); return p ? (m ? m[1] : "loc") : ""; };
  const goClick = (v, which) => click(v, "data-pdxfc-go", which);

  // First visit, no location: the modal and its three steps.
  {
    const v = visit();
    v.tick(v.C.DELAY_MS);
    ok(!!v.popup(), "path: first visit with no location did not show the modal");
    eq((v.popup().innerHTML.match(/<li\b/g) || []).length, 3, "path: the first-visit modal does not list three steps");
    has(v.popup().innerHTML, "Here’s how it works", "path: the first-visit modal lost its title");
  }

  // Set my location → /find → back on the homepage with a location: step 2.
  const local = memStore(), session = memStore();
  {
    const v = visit({ local, session });
    v.tick(v.C.DELAY_MS);
    click(v, "data-pdxfc-door", "finder");
    eq(v.C.pathStep(), "see", "path: Set my location did not record step 2");
  }
  {
    // /find with the pin confirmed: the welcome does not reappear there.
    const f = visit({ page: "find", local, session });
    f.tick(60000);
    ok(!f.popup(), "path: the modal showed on /find after Set my location");
  }
  local.setItem("politidex_voter_location", LOC);
  let scrolled = 0;
  {
    const v = visit({ local, session });
    v.document.getElementById("who-represents-me").scrollIntoView = () => { scrolled++; };
    v.tick(CONT);
    ok(!!v.popup(), "path: returning from /find with a location did not show step 2");
    eq(stepOf(v), "see", "path: the homepage did not show step 2");
    ok(scrolled > 0, "path: step 2 did not scroll to the Who Represents Me band");
    has(v.popup().innerHTML, v.C.SEE_LINE, "path: step 2 lost its one sentence");
    has(v.popup().innerHTML, ">Open my rooms<", "path: step 2 has no Open my rooms");
    has(v.popup().innerHTML, 'href="/voice"', "path: Open my rooms does not go to /voice");
    ok(/pdxfc--dock/.test(v.popup().className), "path: step 2 covers the band instead of docking");
    const prevented = goClick(v, "rooms");
    ok(!prevented && !v.popup(), "path: Open my rooms did not close and follow its link");
    eq(v.C.pathStep(), "rooms", "path: Open my rooms did not record step 3");
  }
  {
    // A second homepage load mid-path does not repeat step 2.
    const v = visit({ local, session });
    v.tick(60000);
    ok(!v.popup(), "path: step 2 reappeared on the homepage after Open my rooms");
  }
  {
    const v = visit({ page: "voice", local, session });
    v.tick(CONT);
    eq(stepOf(v), "rooms", "path: /voice did not show step 3");
    const h = v.popup().innerHTML;
    has(h, v.C.ROOMS_LINE, "path: step 3 lost its sentence");
    has(h, ">Take a stance<", "path: step 3 has no Take a stance");
    has(h, ">I’m good for now<", "path: step 3 has no I’m good for now");
    has(h, 'href="/my-stances?add=1&amp;next=%2Fvoice"', "path: Take a stance does not open the studio with the way back to /voice");
    goClick(v, "stance");
    eq(v.C.pathStep(), "stance", "path: Take a stance did not record the studio visit");
  }
  {
    // Back on /voice from the studio: one closing card, then the path ends.
    const v = visit({ page: "voice", local, session });
    v.tick(CONT);
    eq(stepOf(v), "end", "path: /voice after the studio did not close the path");
    click(v, "data-pdxfc-act", "finish");
    const w = visit({ page: "voice", local, session });
    w.tick(60000);
    ok(!w.popup(), "path: the path came back after it ended");
  }
  {
    // I'm good for now ends it.
    const s2 = memStore({ pdx_path_v1: '{"step":"rooms"}' });
    const v = visit({ page: "voice", local: memStore({ politidex_voter_location: LOC }), session: s2 });
    v.tick(CONT);
    click(v, "data-pdxfc-act", "finish");
    ok(!v.popup(), "path: I’m good for now did not close step 3");
    ok(JSON.parse(s2.getItem("pdx_path_v1")).off, "path: I’m good for now did not end the path");
  }

  // Not now dismisses it and it does not come back in the same session.
  for (const page of ["home", "voice"]) {
    const l = memStore(), s3 = memStore();
    const v = visit({ page, local: l, session: s3 });
    v.tick(v.C.DELAY_MS);
    click(v, "data-pdxfc-act", "skip");
    ok(!v.popup(), `path/${page}: Not now did not dismiss`);
    for (const p2 of ["home", "voice", "find"]) {
      const n = visit({ page: p2, local: memStore(), session: s3 });   // even with the welcome flag gone
      n.tick(60000);
      ok(!n.popup(), `path/${page}: after Not now it showed again on ${p2} in the same session`);
    }
  }
  {
    // Not now mid-path (step 2) ends the path too.
    const s4 = memStore({ pdx_path_v1: '{"step":"see"}' });
    const l = memStore({ politidex_voter_location: LOC, pdx_coach_seen: "1" });
    const v = visit({ local: l, session: s4 });
    v.tick(CONT);
    click(v, "data-pdxfc-act", "skip");
    const n = visit({ page: "voice", local: l, session: s4 });
    n.tick(60000);
    ok(!n.popup(), "path: Not now on step 2 did not end the path for the session");
  }

  // Only with no location, or when asked.
  {
    const v = visit({ local: memStore({ politidex_voter_location: LOC }) });
    v.tick(60000);
    ok(!v.popup(), "path: a reader with a location and no running path was shown the modal");
  }

  // Show me the next step: on the homepage and /voice, never /find; a reader
  // with a location skips step 1.
  for (const [page, want] of [["home", "see"], ["voice", "rooms"]]) {
    const l = memStore({ politidex_voter_location: LOC, pdx_coach_seen: "1" });
    const s5 = memStore({ pdx_path_v1: '{"off":1}' });
    const v = visit({ page, local: l, session: s5 });
    const btn = v.document.getElementById("pdx-path-next");
    ok(!!btn, `path/${page}: no Show me the next step control`);
    eq(btn && btn.textContent, "Show me the next step", `path/${page}: the control is mislabelled`);
    for (const f of (btn ? btn.listeners.click : [])) f({});
    eq(stepOf(v), want, `path/${page}: Show me the next step with a location did not skip step 1`);
    ok(btn.hidden === true, `path/${page}: the control stayed visible over the open step`);
    click(v, "data-pdxfc-act", "skip");
    ok(btn.hidden === false, `path/${page}: the control did not come back after the step closed`);
  }
  for (const page of ["home", "voice"]) {
    const v = visit({ page, local: memStore({ pdx_coach_seen: "1" }), session: memStore({ pdx_path_v1: '{"off":1}' }) });
    v.C.showNext();
    eq(stepOf(v), "loc", `path/${page}: Show me the next step with no location did not start at step 1`);
  }
  ok(!visit({ page: "find" }).document.getElementById("pdx-path-next"), "path: /find carries the next-step control");

  // No equity language anywhere on the path.
  const C = visit().C;
  const copy = ["see", "rooms", "end"].map((s) => C._stepHtml(s)).join(" ").replace(/<[^>]*>/g, " ") + " Show me the next step";
  for (const word of ["membership", "member", "stock", "stocks", "share", "shares", "shareholder", "equity",
                      "invest", "investor", "dividend", "earn", "pay", "premium", "subscription", "owner", "ownership"]) {
    ok(!new RegExp(`\\b${word}\\b`, "i").test(copy), `path: the guided path's copy carries "${word}"`);
  }

  // No new pages, and the homepage District Voice card and /voice header are
  // not touched by the path.
  const INDEX = R("index.html"), VOICE = R("voice.html");
  const a = INDEX.indexOf("<!-- pdx:home-voice-gate:begin -->"), b = INDEX.indexOf("<!-- pdx:home-voice-gate:end -->");
  no(INDEX.slice(a, b), "pdx-path", "path: the homepage District Voice card mentions the path");
  no(VOICE, "pdx-path", "path: voice.html was edited for the path");
  has(VOICE, '<h1 class="pdxvr-h1">The rooms for your seats</h1>', "path: the /voice header changed");
}

console.log("");
if (failures.length) {
  console.log(`   ${passed} passed, ${failures.length} failed\n`);
  for (const f of failures) console.log(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`   ✓ first-visit popup: all ${passed} assertions passed`);
