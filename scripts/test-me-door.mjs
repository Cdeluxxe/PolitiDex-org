#!/usr/bin/env node
// test-me-door.mjs — a tap on /me shows that it is opening, and the desk's
// first paint is the account card and the seat lines.
//
//   1 · me-door.js: pressed on pointerdown, "Opening your desk…" on the click,
//       one load per tap, no load at all on /me, modified clicks untouched.
//   2 · every shell with a /me control has the door on it.
//   3 · me.html loads the Firebase SDK AFTER the desk modules.
//   4 · the desk, booted with the account unknown: card and seats paint,
//       positions / stars / saved say they are loading, nothing says signed out.
import { readFileSync } from "node:fs";
import vm from "node:vm";

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log("   · " + m); } }
const read = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");

const DOOR = read("me-door.js");
const ME = read("me.html");
const DESK = read("me-desk.js");

// ── 1 · the door ────────────────────────────────────────────────────────────
function bootDoor(pathname) {
  const listeners = {};
  const nodes = [];
  function node(tag) {
    const cls = new Set();
    const n = {
      tagName: tag.toUpperCase(), id: "", attrs: {}, children: [], parentNode: null, textContent: "",
      classList: { add: (...c) => c.forEach((x) => cls.add(x)), remove: (...c) => c.forEach((x) => cls.delete(x)), contains: (c) => cls.has(c) },
      setAttribute(k, v) { this.attrs[k] = String(v); if (k === "id") this.id = String(v); },
      getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
      hasAttribute(k) { return k in this.attrs; },
      removeAttribute(k) { delete this.attrs[k]; },
      appendChild(c) { c.parentNode = this; this.children.push(c); nodes.push(c); return c; },
      removeChild(c) { this.children = this.children.filter((x) => x !== c); const i = nodes.indexOf(c); if (i >= 0) nodes.splice(i, 1); c.parentNode = null; return c; },
      closest(sel) { return sel === "a[href]" && this.tagName === "A" && "href" in this.attrs ? this : null; },
    };
    return n;
  }
  const head = node("head"), body = node("body");
  const doc = {
    head, body, documentElement: node("html"),
    createElement: node,
    getElementById: (id) => nodes.find((n) => n.id === id) || null,
    addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); },
  };
  const assigned = [];
  const win = {
    document: doc, URL, setTimeout: () => 0, clearTimeout() {},
    location: { pathname, search: "", href: "https://politidex.fyi" + pathname, origin: "https://politidex.fyi", assign: (u) => assigned.push(u) },
    addEventListener() {}, scrollTo() {},
  };
  win.window = win;
  vm.runInContext(DOOR, vm.createContext(win));
  const link = (href, attrs) => { const a = node("a"); a.setAttribute("href", href); Object.entries(attrs || {}).forEach(([k, v]) => a.setAttribute(k, v)); return a; };
  const fire = (type, target, extra) => {
    const ev = Object.assign({ target, button: 0, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }, extra || {});
    (listeners[type] || []).forEach((f) => f(ev));
    return ev;
  };
  return { win, doc, link, fire, assigned };
}

{
  const d = bootDoor("/");
  ok(d.win.PDXMeDoor && d.win.PDXMeDoor.LINE === "Opening your desk…", "door: publishes the line, worded as specified");
  const a = d.link("/me");
  d.fire("pointerdown", a);
  ok(a.classList.contains("pdx-me-pressed"), "door: the control is pressed on pointerdown");
  ok(!d.doc.getElementById("pdx-me-door-line"), "door: the line waits for the click, after the press");
  const c1 = d.fire("click", a);
  ok(!c1.defaultPrevented, "door: the first tap is the anchor's own navigation");
  ok(a.classList.contains("pdx-me-opening") && a.getAttribute("aria-busy") === "true", "door: the control goes busy");
  const line = d.doc.getElementById("pdx-me-door-line");
  ok(line && line.textContent === "Opening your desk…" && line.getAttribute("role") === "status", "door: the line is a status with words in it");
  const c2 = d.fire("click", a);
  ok(c2.defaultPrevented, "door: a second tap while opening stacks no second load");
  const other = d.link("/me?tab=ballot");
  ok(d.fire("click", other).defaultPrevented, "door: any other /me control is also swallowed while opening");
  d.win.PDXMeDoor.clear();
  ok(!d.doc.getElementById("pdx-me-door-line") && !a.classList.contains("pdx-me-opening"), "door: clear() takes the state down");
}
{
  const d = bootDoor("/");
  const a = d.link("/me");
  ok(!d.fire("click", a, { metaKey: true }).defaultPrevented && !a.classList.contains("pdx-me-opening"), "door: a cmd-click is left alone");
  ok(!d.fire("click", d.link("/me", { target: "_blank" })).defaultPrevented, "door: target=_blank is left alone");
  ok(!d.fire("click", d.link("/voice")).defaultPrevented && !d.win.PDXMeDoor.isOpening(), "door: other addresses are not marked");
  ok(!d.fire("click", d.link("https://example.org/me")).defaultPrevented && !d.win.PDXMeDoor.isOpening(), "door: another origin's /me is not ours");
}
{
  const d = bootDoor("/me");
  const ev = d.fire("click", d.link("/me"));
  ok(ev.defaultPrevented && !d.win.PDXMeDoor.isOpening(), "door: on /me the desk is open, so a tap on /me loads nothing");
  ok(!d.fire("click", d.link("/me#me-saved")).defaultPrevented, "door: a same-page fragment is the browser's scroll");
}
{
  const d = bootDoor("/");
  d.win.PDXMeDoor.open("/me?tag=x#me-saved");
  d.win.PDXMeDoor.open("/me?tag=x#me-saved");
  ok(d.assigned.length === 1, "door: open() assigns once however many times it is called");
}

// ── 2 · on every shell with a /me control ─────────────────────────────────────
ok(read("my-stances.html").includes('<script async src="/me-door.js"></script>'), "shells: my-stances.html loads me-door.js async");
ok(/door\.src = '\/me-door\.js'/.test(read("shell-account-chip.js")), "shells: shell-account-chip.js brings the door to every shell and board that wears it");
ok(/meDoor\.src = '\/me-door\.js'/.test(read("compare-hub.js")), "shells: compare-hub.js brings the door to the front page beside its chip");
ok(/'\/me-door\.js'/.test((read("sw.js").match(/const SHELL_ASSETS = \[([\s\S]*?)\n\];/) || [])[1] || ""), "sw: me-door.js is precached");

// ── 3 · the SDK is behind the desk ─────────────────────────────────────────────
// Deferred scripts run after the parse; plain scripts at the end of <body> run
// during it. So the desk modules are plain tags after the mount, and the SDK
// stays deferred — which is what puts the desk ahead of it.
const at = (s) => ME.indexOf(s);
const DESK_MODS = ["voter-hub-location", "stance-sides", "my-stances", "your-file", "district-voice", "me-desk"];
for (const m of DESK_MODS) {
  ok(ME.includes(`<script src="/${m}.js"></script>`) && !ME.includes(`<script defer src="/${m}.js">`), `me.html: ${m}.js is a plain script, not queued behind the deferred SDK`);
  ok(at(`<script src="/${m}.js">`) > at('<main id="me-desk"'), `me.html: ${m}.js runs after the mount is parsed`);
}
ok(/<script defer src="https:\/\/www\.gstatic\.com\/firebasejs\/[^"]+firebase-app-compat\.js"><\/script>/.test(ME), "me.html: the SDK is still deferred");
ok(at('<script src="/me-desk.js">') > at('<script src="/voter-hub-location.js">'), "me.html: the location store runs before the desk");
ok(ME.includes('<div id="pdx-me-membership-act"><p class="pdxmm-note" role="status">Checking membership…</p></div>'), "me.html: the membership slot says it is checking before its module runs");

// ── 4 · the desk with the account unknown ─────────────────────────────────────
function bootDesk(authKnown, raw) {
  const store = Object.assign({}, raw || {});
  const nodes = [];
  const mk = (id) => { const n = { id, innerHTML: "", classList: { add() {}, remove() {} }, scrollIntoView() {} }; nodes.push(n); return n; };
  const mount = mk("me-desk");
  const win = {
    __PDX_ME_DOC: true, console, setTimeout: () => 0, clearTimeout() {},
    document: { readyState: "complete", getElementById: (id) => nodes.find((n) => n.id === id) || null, querySelectorAll: () => [], addEventListener() {} },
    location: { pathname: "/me", search: "", hash: "", href: "https://politidex.fyi/me" },
    history: { pushState() {} }, addEventListener() {},
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem() {}, removeItem() {} },
    PDXAuth: { state: authKnown ? "out" : "unknown", user: null, known: authKnown },
    auth: { currentUser: null, onAuthStateChanged() {} },
    TEAM_POSITIONS: [{ key: "house", label: "U.S. House", icon: "" }],
    pdxRepsForMe: () => ({ located: true, state: "UT" }),
    _hasUserLocation: true,
    _voterLocationLabel: () => ({ place: "Salt Lake County, Utah", detail: "" }),
    PROFILES: {},
  };
  win.window = win;
  vm.runInContext(DESK, vm.createContext(win));
  return { win, html: String(mount.innerHTML) };
}
{
  const { win, html } = bootDesk(false, { pdx_last_account: JSON.stringify({ uid: "u1", label: "jane" }) });
  ok(win.PDXMeDesk && win.PDXMeDesk.accountKnown() === false, "desk: an unanswered account is not known");
  ok(html.includes('id="me-identity"') && html.includes("Salt Lake County, Utah"), "desk: the first paint has the account card and the place");
  ok(html.includes('id="me-ballot"'), "desk: the first paint has the seat lines");
  ok(html.includes(">jane<") && html.includes("Checking account…"), "desk: the card names the remembered label and says it is checking");
  ok(!html.includes("Not signed in") && !html.includes("data-me-signin") && !html.includes("data-me-signout"), "desk: checking is not signed out — no Sign in, no Log out");
  for (const [id, line] of [["me-positions", "Loading your positions"], ["me-stars", "Loading the issues you rank harder"], ["me-saved", "Loading your saved work"]])
    ok(html.includes(`id="${id}"`) && html.includes(line), `desk: ${id} keeps its place and says it is loading`);
}
{
  const { html } = bootDesk(true);
  ok(html.includes("Not signed in") && !html.includes("me-loading"), "desk: once the account answers, the desk is whole and says what it knows");
}

console.log(fail ? `✗ me-door: ${fail} failed, ${pass} passed` : `✓ me-door: all ${pass} assertions passed — a tap on /me shows that it is opening, and the desk paints its card first`);
process.exit(fail ? 1 : 0);
