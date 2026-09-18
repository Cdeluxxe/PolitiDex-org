#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-locker-door.mjs — the Evidence Locker is a door on the homepage, and an
// ADDRESS everywhere else
// ─────────────────────────────────────────────────────────────────────────────
// The locker is a four-view workspace: a sticky quick-jump map, a filter toolbar,
// a discovery showcase, a featured rail and a grid of every receipt on file. All
// of it used to be mounted, open, on every visit to `/` — thousands of pixels of
// somebody else's research cockpit, laid out and painted for a reader who never
// asked for it. The door pass got it off the critical path by parking those 388
// lines in <template id="el-workspace-tpl"> behind a closed door. The eighth
// split finished the job: the workspace is a DOCUMENT now, at /evidence, and the
// template left the homepage with it.
//
// So this file tests the same claim it always did — "the front page is a door,
// not a workspace" — with the workspace assertions pointed at the document that
// carries it. Nothing was deleted here; the pins MOVED, exactly as the markup
// did, which is why every id, every filter mirror and every bill-number helper
// is still asserted somewhere below.
//
//   PHASE 0 — the homepage ships a door and NOTHING ELSE of the locker. The
//             workspace markup is inside <template id="el-workspace-tpl"> in
//             evidence.html — parsed into an inert fragment outside the document
//             tree until _mount() asks for it — and is absent from index.html
//             altogether. Not one id moved, so every deep link still resolves.
//   PHASE 1 — the count fails closed. The door's one line ships [hidden] with no
//             number in it, and only ever prints a figure the page can actually
//             count from the receipts it holds. The count is the one thing the
//             homepage kept, because four other surfaces read it.
//   PHASE 2 — with no template in the document, every way of opening the locker
//             becomes a NAVIGATION to /evidence carrying the filter it was asked
//             for; with the template (that is, on /evidence itself) every one of
//             them still mounts, and the address does not ask the server for
//             itself in a loop.
//   PHASE 3 — the workspace is a workspace: search, person, issue AND bill
//             number, and a receipt that names a measure opens THE bill object
//             (PDXBillDetail) rather than a locker-shaped copy of one.
//   PHASE 4 — the fence. No roll call is copied into the locker, and neither the
//             door nor the split changed any evidence, count, strength grade or
//             mapping.
//
//   node scripts/test-locker-door.mjs
//
// Real shipped files: index.html, evidence.html and netlify.toml are read as
// text, and evidence-locker.js runs in a node:vm sandbox against a DOM small
// enough to see exactly what it touches — which is the only way to prove a
// NEGATIVE about first paint ("the section was never appended to") and the only
// way to prove a navigation happened without a browser.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const HTML = R("index.html");
const EV = R("evidence.html");
// Comment-stripped views, for the pins that count STRUCTURE. Both documents'
// prose names the ids of the doors and the template in order to explain them,
// and a comment can neither be nor hide a second copy of anything. Comments are
// BLANKED rather than removed so every offset in the bare view is the same
// offset in the raw one, and a slice found in one can be taken from the other.
const blankOut = (s) => String(s).replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "));
// A second, narrower blanking for the same reason: CSS block comments INSIDE
// <style> elements. The door's own stylesheet explains which rule left with the
// template ("the .el-closed/.el-shell display rule went with the template") and
// the mobile-polish block explains where its locker half went, so both name
// classes they no longer carry. A /* … */ can no more paint a card than an HTML
// comment can. Scoped to <style> on purpose: a `/*` inside a JavaScript string
// is not the start of a comment, and this must never blank live code.
const blankStyle = (s) => String(s).replace(/<style\b[\s\S]*?<\/style>/gi, (b) =>
  b.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")));
const BARE = blankStyle(blankOut(HTML));
const EV_BARE = blankStyle(blankOut(EV));
const EL = R("evidence-locker.js");
const TOML = R("netlify.toml");
const CSS = R("app-2.css");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const must = (cond, msg) => {
  if (!cond) { console.error(`\n✗ locker door — PRECONDITION FAILED: ${msg}\n`); process.exit(1); }
  passed++;
};

// ── The two sections, and where the workspace lives now ──────────────────────
// index.html keeps the section (the counts other surfaces read are wired to it,
// and #evidence-locker is a bookmark readers already hold) and carries a door
// inside it. evidence.html keeps the same section id and carries the template.
const secStart = BARE.indexOf('<section id="evidence-locker"');
must(secStart > 0, "index.html has no #evidence-locker section at all");
const secEnd = HTML.indexOf("</section>", secStart);
must(secEnd > secStart, "index.html's #evidence-locker section is unterminated");
const FIRST_PAINT = HTML.slice(secStart, secEnd);   // the whole of it: it is a door now

must(BARE.indexOf('<template id="el-workspace-tpl">') < 0,
  "index.html still carries the locker workspace template — the split did not happen");

const evSecStart = EV_BARE.indexOf('<section id="evidence-locker"');
must(evSecStart > 0, "evidence.html has no #evidence-locker section — the workspace has no host");
const tplStart = EV_BARE.indexOf('<template id="el-workspace-tpl">', evSecStart);
must(tplStart > 0, "the locker workspace is not inside a <template> on evidence.html — it is in the render tree");
const tplEnd = EV.indexOf("</template>", tplStart);
const evSecEnd = EV.indexOf("</section>", tplEnd > 0 ? tplEnd : evSecStart);
must(tplEnd > tplStart && evSecEnd > tplEnd, "the workspace <template> is unterminated inside the section");

const TEMPLATE = EV.slice(tplStart, tplEnd);            // inert: not in the render tree
const EV_FIRST_PAINT = EV.slice(evSecStart, tplStart);  // what /evidence paints before the mount

// ═══════════════ PHASE 0 · the homepage ships a door ═════════════════════════
{
  ok(/id="el-door"/.test(FIRST_PAINT), "there is no door in the section's first paint");
  ok(/id="el-door-open"/.test(FIRST_PAINT), "the door has no control to open it");
  // .el-closed was the SHUT STATE of a shell this document no longer has, and
  // the rule that acted on it (#evidence-locker.el-closed .el-shell) went with
  // the template. A class with no rule and no shell is a lie about the markup.
  ok(!/(?<![-\w])el-closed/.test(BARE), "index.html still ships the shut-state class for a shell it does not have");
  ok(!/(?<![-\w])el-closed/.test(EV_BARE), "evidence.html ships the shut-state class — the workspace arrives open there");
  ok(/classList\.remove\('el-closed'\)/.test(EL),
    "the engine stopped clearing el-closed — a cached document that still ships it would mount an invisible shell");

  // The whole workspace, id by id, must be on the inert side of the template
  // boundary IN THE DOCUMENT THAT OWNS IT, and must not exist at all on the
  // homepage. These are the elements that carry the locker's height.
  const WORKSPACE_IDS = [
    "el-shell", "el-jump", "el-toolbar", "el-results", "el-quickcats", "el-showcase",
    "el-featured", "el-recent", "el-types", "el-status", "el-empty", "el-count",
    "el-modal-overlay", "el-f-search", "el-f-category", "el-f-issue", "el-f-pol",
    "el-f-sort", "el-reset",
  ];
  for (const id of WORKSPACE_IDS) {
    const needle = id === "el-shell" ? 'class="el-shell"' : `id="${id}"`;
    ok(TEMPLATE.indexOf(needle) >= 0, `#${id} is not inside evidence.html's workspace template`);
    ok(EV_FIRST_PAINT.indexOf(needle) < 0, `#${id} paints on /evidence before the mount — the template boundary moved`);
    ok(BARE.indexOf(needle) < 0, `#${id} is still on index.html — the workspace did not leave the front page`);
  }

  // Cold `/` renders no cards, and no container that could hold one — and now
  // there is no template on the page for one to hide in either.
  // Anchored so the needle is a CLASS and not a suffix: the front page has its
  // own .pdx-sel-card (the chamber picker), and "sel-card" ends in "el-card".
  // A locker class is always preceded by a `.`, a quote or a space, never by a
  // word character or a hyphen.
  ok(!/(?<![-\w])el-card/.test(BARE), "a locker card class appears on the homepage");
  ok(!/(?<![-\w])el-grid/.test(BARE), "the results grid appears on the homepage");

  // ONE COPY OF THE LOCKER WORKSPACE, which is what this pin was always for: a
  // second <template id="el-workspace-tpl"> would be the duplicate surface the
  // door pass removed, coming back — and after the split, a copy on the homepage
  // would be the whole split coming back.
  //
  // IT IS NOT "ONE TEMPLATE ON THE PAGE" ANY MORE, AND THE REASON IS THAT THE
  // PATTERN SPREAD. The /me pass demoted the My Stances wall the same way this
  // pass demoted the locker — a short card over an inert <template
  // id="ms-shell-tpl"> — because the reader's positions now live at /me and the
  // homepage should not carry a second editor of them laid out on every load.
  // So the assertion is an ALLOWLIST: every template on the page is a door this
  // repo has deliberately built, and an id nobody has justified fails here.
  const tplIds = [...BARE.matchAll(/<template\b[^>]*\bid="([^"]*)"/g)].map((m) => m[1]);
  // BACK TO ONE, AND THE REMOVAL IS THE RECORD OF A ROOM LEAVING. For one pass
  // this list also carried pdx-admin-tools: the curator's DATABASE EXPANSION and
  // Politician Manager had been painting for anonymous visitors, so they were
  // wrapped inert here and cloned into place only on the allowed branch of the
  // front page's admin gate. That wrapper is not on this document any more —
  // the tools are admin.html, served at /admin, and index.html no longer holds
  // the markup, the template, the allow-list or a link to it. So the id comes
  // back off the allowlist rather than being left in as a courtesy: an
  // allowlist that still names a template nobody ships is an allowlist that
  // would silently welcome it back. admin.html carries its own copy, and
  // scripts/test-admin-shell.mjs is what fences the wrapper there. A third id
  // still fails here until somebody justifies it.
  const KNOWN_TPL = ["ms-shell-tpl"];
  const strays = tplIds.filter((id) => !KNOWN_TPL.includes(id));
  eq(strays.join(","), "", "index.html carries a <template> no door has justified");
  eq(tplIds.filter((id) => id === "el-workspace-tpl").length, 0,
    "index.html carries a copy of the locker workspace again");
  eq((BARE.match(/<\/template>/g) || []).length, tplIds.length,
    "index.html opens and closes a different number of <template> elements");
  const evTplIds = [...EV_BARE.matchAll(/<template\b[^>]*\bid="([^"]*)"/g)].map((m) => m[1]);
  eq(evTplIds.join(","), "el-workspace-tpl", "evidence.html carries something other than exactly the workspace template");
  eq((EV_BARE.match(/<\/template>/g) || []).length, 1, "evidence.html's template is not closed exactly once");

  // THE ADDRESS CHANGED, AND THAT IS THE POINT. Every inbound link in the page
  // used to be the hash #evidence-locker, which was only ever reachable by
  // scrolling the front page. They are the address now — a real anchor, which
  // survives a middle-click, a copy-link and a load with no JavaScript.
  ok(/href="\/evidence"/.test(FIRST_PAINT),
    "the door's control is not a real link to /evidence — it would not survive a middle-click or a copy-link");
  ok((BARE.match(/href="\/evidence"/g) || []).length >= 3,
    "the desktop nav entry, the mobile drawer entry and the section door do not all point at /evidence");
  eq((BARE.match(/href="#evidence-locker"/g) || []).length, 0,
    "an in-page link still points at the hash — on a homepage with no workspace that scrolls the reader to a door");

  // …and the addresses themselves: /evidence is the document, /locker is an
  // alias to it and NOT a second 200, because two paths serving one room is the
  // canonical splitting in half.
  const RULES = [...TOML.matchAll(/^\[\[redirects\]\]\s*\n((?:^[ \t]{2}\S.*\n)+)/gm)].map((m) => {
    const body = m[1];
    const field = (k) => (body.match(new RegExp(`^\\s*${k}\\s*=\\s*"?([^"\\n]+)"?`, "m")) || [])[1];
    return { from: field("from"), to: field("to"), status: field("status") };
  });
  const rule = (from) => RULES.find((r) => r.from === from);
  for (const from of ["/evidence", "/evidence/"]) {
    const r = rule(from);
    ok(r && r.to === "/evidence.html" && String(r.status) === "200",
      `netlify.toml does not serve ${from} as evidence.html at 200 (got ${r ? r.to + " " + r.status : "no rule"})`);
  }
  for (const from of ["/locker", "/locker/*"]) {
    const r = rule(from);
    ok(r && r.to === "/evidence" && String(r.status) === "301",
      `${from} is not a 301 to /evidence — the old address must land, and must not be a second 200 (got ${r ? r.to + " " + r.status : "no rule"})`);
  }
}

// ═══════════════ PHASE 1 · the count fails closed ════════════════════════════
{
  const line = /<p class="el-door-count" id="el-door-count"([^>]*)>([\s\S]*?)<\/p>/.exec(FIRST_PAINT);
  must(line, "the door has no one-line count element");
  ok(/\bhidden\b/.test(line[1]), "the door's count line does not ship hidden — an empty line would paint");
  eq(line[2].trim(), "", "the door's count line ships with content in it — a number no one has counted yet");
  ok(!/receipts on file/.test(FIRST_PAINT),
    "the phrase 'receipts on file' is hard-coded into the markup rather than being written from a real count");

  // The count is computed from the receipts the page holds, with the same
  // headline de-duplication the library build uses — not from a stored figure.
  // It is also the reason the engine still ships on a document with no
  // workspace: the door's line, the Mandate cards, the depth pills and My Team's
  // tallies all read it, and none of them needs a grid.
  ok(/function _countOnFile\(\)/.test(EL), "there is no _countOnFile() — the door's number has no source");
  const countFn = EL.slice(EL.indexOf("function _countOnFile()"), EL.indexOf("var _doorTries"));
  ok(/_roster\(\)/.test(countFn) && /SPOTLIGHT_DATA/.test(countFn) && /rec\.spotlight/.test(countFn),
    "_countOnFile() does not count the same sources the library is built from");
  ok(/seen\[hk\]/.test(countFn), "_countOnFile() skips the per-member headline de-duplication _build() applies");
  ok(/localStorage|sessionStorage|fetch\(/.test(countFn) === false,
    "_countOnFile() reads a stored or fetched figure instead of counting what the page holds");
  const paintFn = EL.slice(EL.indexOf("function _paintDoorCount()"), EL.indexOf("function _wireDoor()"));
  ok(/if \(!n\) \{/.test(paintFn) && /line\.hidden = false;/.test(paintFn),
    "_paintDoorCount() does not keep the line hidden when it has nothing to count");
  ok(/_items \? _items\.length/.test(paintFn),
    "the built library is not authoritative for the door's number once it exists");
}

// ═══════════════ The sandbox · a DOM small enough to see what is touched ═════
// getElementById answers for the door's own elements and — when the caller asks
// for it — for the template, and null for everything else. `tpl: false` is the
// shape of the homepage since the split: a section, a door, and no workspace to
// mount. Every append onto the section is recorded, so "nothing mounted" is an
// assertion rather than an absence of evidence, and every navigation is recorded
// too, because on a document with no template "opening the locker" IS a trip.
function makeDom(opts) {
  opts = opts || {};
  const listeners = { document: {}, window: {} };
  const appended = [];
  const navs = [];
  const el = (id, extra) => Object.assign({
    id, hidden: false, innerHTML: "", value: "", style: {}, className: "",
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    getAttribute() { return null; }, setAttribute() {},
    addEventListener(t, fn) { (this.__l || (this.__l = {}))[t] = fn; },
    removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    appendChild() {}, scrollIntoView() {}, focus() {}, click() {},
  }, extra || {});

  const section = el("evidence-locker", {
    appendChild(node) { appended.push(node); },
    scrollIntoView() { this.__scrolled = true; },
  });
  const template = el("el-workspace-tpl", {
    content: { cloneNode() { return { __clonedWorkspace: true }; } },
  });
  const door = el("el-door");
  const count = el("el-door-count", { hidden: true });
  const open = el("el-door-open");
  const nodes = {
    "evidence-locker": section,
    "el-door": door, "el-door-count": count, "el-door-open": open,
  };
  if (opts.tpl !== false) nodes["el-workspace-tpl"] = template;

  const document = {
    readyState: "complete", cookie: "",
    getElementById(id) { return nodes[id] || null; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    createElement() { return el("created"); },
    addEventListener(t, fn) { (listeners.document[t] || (listeners.document[t] = [])).push(fn); },
    removeEventListener() {},
    dispatchEvent(e) {
      (listeners.document[e && e.type] || []).forEach((fn) => { try { fn(e); } catch (_) {} });
      return true;
    },
    head: el("head"), body: el("body"), documentElement: el("html"),
  };
  // A location that RECORDS. assign / href / replace are the three spellings
  // _navToLocker tries in that order, and all three are captured so the test
  // reads the same whichever one the sandbox allows.
  let hrefStr = "https://www.politidex.fyi" + (opts.pathname || "/") + (opts.search || "") + (opts.hash || "");
  const location = {
    pathname: opts.pathname || "/", search: opts.search || "", hash: opts.hash || "",
    origin: "https://www.politidex.fyi",
    assign(to) { navs.push(to); },
    replace(to) { navs.push(to); },
    get href() { return hrefStr; },
    set href(v) { navs.push(v); hrefStr = v; },
  };
  const win = {
    document,
    addEventListener(t, fn) { (listeners.window[t] || (listeners.window[t] = [])).push(fn); },
    removeEventListener() {},
    // Immediate timers so the module's own boot fallback runs synchronously. The
    // retry loops it can reach are all bounded by their own counters.
    setTimeout(fn) { try { fn(); } catch (_) {} return 0; }, clearTimeout() {},
    setInterval() { return 0; }, clearInterval() {},
    requestAnimationFrame() { return 0; }, cancelAnimationFrame() {},
    requestIdleCallback() { return 0; },
    matchMedia() { return { matches: false, addEventListener() {}, addListener() {} }; },
    getComputedStyle() { return { getPropertyValue() { return ""; } }; },
    location,
    history: { replaceState() {}, pushState() {} },
    navigator: { userAgent: "node" },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    fetch() { return Promise.reject(new Error("test-locker-door: no network")); },
    console: { log() {}, warn() {}, error() {}, info() {} },
    CustomEvent: class { constructor(t, o) { this.type = t; Object.assign(this, o || {}); } },
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
  };
  win.window = win; win.self = win;
  win.__t = { appended, listeners, nodes, navs };
  return win;
}

function boot(opts) {
  const win = makeDom(opts);
  const ctx = vm.createContext(win);
  if (opts && opts.data) {
    for (const f of ["cmp-data.js", "spotlight-cards-data.js"]) {
      vm.runInContext(R(f), ctx, { filename: f });
    }
    win.PROFILES = win.CMP_DATA;
  }
  vm.runInContext(EL, ctx, { filename: "evidence-locker.js" });
  return win;
}

// ═══════════════ PHASE 2 · what opens the locker ═════════════════════════════
{
  // ── Cold `/`: no workspace, nothing mounted, nothing navigated ────────────
  const cold = boot({ pathname: "/", tpl: false, data: true });
  ok(cold.PDXEvidenceLocker && typeof cold.PDXEvidenceLocker.open === "function",
    "the locker exposes no opener — the door's control would have nothing to call");
  eq(cold.__t.appended.length, 0,
    "the workspace was mounted on a cold homepage — the cards are back on first paint");
  eq(cold.__t.navs.length, 0, "a cold homepage navigated somewhere on its own — arriving is not asking");
  eq(cold.__t.nodes["el-door"].hidden, false, "the door hid itself on a cold homepage");
  eq(cold.PDXEvidenceLocker.mounted(), false, "the locker reports itself mounted on a cold homepage");

  // …and the door still carries a real number, off data that is already in the
  // page. This is the honest floor: no network, no workspace, no promise. It is
  // also the whole reason the engine still ships on a document with no grid.
  const n = cold.PDXEvidenceLocker.count();
  ok(n > 0, "the door counted nothing against the shipped evidence data — the line would never appear");
  eq(cold.__t.nodes["el-door-count"].hidden, false,
    "the door's count line stayed hidden even though there was a real number to print");
  ok(/receipts? on file/.test(cold.__t.nodes["el-door-count"].innerHTML),
    "the door's count line does not say how many receipts are on file");
  ok(new RegExp(">" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "<")
      .test(cold.__t.nodes["el-door-count"].innerHTML),
    "the number printed on the door is not the number the page counted");

  // ── The door's own control, on a document with no workspace ───────────────
  // It is a plain link and the handler LETS GO. Preventing the default here
  // would hand the click to _openLocker(), which navigates to the same place and
  // is then raced by the hash write — two navigations for one tap.
  const clicked = boot({ pathname: "/", tpl: false, data: true });
  const ctrl = clicked.__t.nodes["el-door-open"];
  must(ctrl.__l && typeof ctrl.__l.click === "function", "the door's control has no click handler");
  let defaultPrevented = false;
  ctrl.__l.click({ preventDefault() { defaultPrevented = true; }, button: 0 });
  ok(!defaultPrevented,
    "the door's control swallowed the click on a document with no workspace — the browser must be left to follow the href");
  eq(clicked.__t.appended.length, 0, "clicking the door mounted a workspace that is not in the document");
  eq(clicked.location.hash, "", "clicking the door wrote a hash on a page that cannot open at it");

  // A modified click is always the browser's business.
  const midClick = boot({ pathname: "/", tpl: false, data: true });
  let prevented2 = false;
  midClick.__t.nodes["el-door-open"].__l.click({ preventDefault() { prevented2 = true; }, metaKey: true });
  ok(!prevented2 && midClick.__t.appended.length === 0,
    "a command-click on the door was hijacked instead of opening /evidence in a new tab");

  // ── The same control on a document that HAS the workspace ─────────────────
  // /evidence mounts on arrival, so this is the shape of any future document
  // that ships both the door and the template: the tap opens it in place.
  const inPlace = boot({ pathname: "/", data: true });
  let prevented3 = false;
  inPlace.__t.nodes["el-door-open"].__l.click({ preventDefault() { prevented3 = true; }, button: 0 });
  ok(prevented3, "on a document that owns the workspace the door still navigated away instead of opening in place");
  eq(inPlace.__t.appended.length, 1, "clicking the door did not mount the workspace");
  ok(inPlace.__t.appended[0].__clonedWorkspace,
    "clicking the door appended something other than a clone of the workspace template");
  eq(inPlace.__t.nodes["el-door"].hidden, true, "the door is still showing over the open workspace");
  eq(inPlace.PDXEvidenceLocker.mounted(), true, "the locker does not report itself mounted after the door opened");
  eq(inPlace.location.hash, "#evidence-locker",
    "opening the door in place left no address behind — a reload would land on the closed door");

  // ── EVERY DEEP LINK BECOMES AN ADDRESS, AND CARRIES ITS FILTER ────────────
  // Roughly fifteen call sites on the homepage plus digital-library.js and
  // my-profile.js funnel through _pdxOpenEvidenceLocker. None of them was
  // rewritten: _openLocker's failed mount is what turns all of them into trips.
  const deep = boot({ pathname: "/", tpl: false, data: true });
  deep._pdxOpenEvidenceLocker({ issue: "water_drought" });
  eq(deep.PDXEvidenceLocker.mounted(), false, "a filtered deep-link mounted a workspace the document does not have");
  eq(deep.__t.appended.length, 0, "a filtered deep-link appended something to the door's section");
  eq(deep.__t.navs[0], "/evidence?issue=water_drought",
    "a filtered deep-link did not become the address with the same filter on it");

  const person = boot({ pathname: "/", tpl: false, data: true });
  person._pdxOpenEvidenceLocker({ pol: "lee" });
  eq(person.__t.navs[0], "/evidence?pol=lee", "a single-politician deep-link lost its politician");

  const team = boot({ pathname: "/", tpl: false, data: true });
  team._pdxOpenEvidenceLocker({ pols: ["lee", "curtis"] });
  eq(team.__t.navs[0], "/evidence?pols=lee%2Ccurtis",
    "a saved-team browse did not carry its list — the comma is what _queryOpts splits on");

  const bare = boot({ pathname: "/", tpl: false, data: true });
  bare._pdxOpenEvidenceLocker();
  eq(bare.__t.navs[0], "/evidence", "an unfiltered 'open the locker' did not become the plain address");

  // ── NO LOOP. A document that wants the workspace and cannot mount it ──────
  // (a stale cached shell at the address, say) must NOT ask the server for
  // itself over and over.
  const stale = boot({ pathname: "/evidence", tpl: false, data: true });
  eq(stale.__t.navs.length, 0, "a document AT /evidence with no template navigated to itself");
  eq(stale.__t.appended.length, 0, "something was appended to the section with no template present");
  eq(stale.PDXEvidenceLocker.mounted(), false, "the locker reported a mount with no template to mount");
  const staleDeep = boot({ pathname: "/evidence", tpl: false, data: true });
  staleDeep._pdxOpenEvidenceLocker({ issue: "water_drought" });
  eq(staleDeep.__t.navs.length, 0, "a deep-link on the address itself re-requested the address");

  // ── The address, with the workspace: it mounts on arrival ─────────────────
  const direct = boot({ pathname: "/evidence", data: true });
  eq(direct.__t.appended.length, 1, "a direct hit on /evidence did not mount the workspace");
  eq(direct.PDXEvidenceLocker.mounted(), true, "/evidence did not open the locker");
  eq(direct.__t.navs.length, 0, "arriving at /evidence navigated somewhere else");
  const trailing = boot({ pathname: "/evidence/", data: true });
  eq(trailing.PDXEvidenceLocker.mounted(), true, "/evidence/ (trailing slash) did not open the locker");
  // The first spelling still mounts, so a link somebody already sent works even
  // if the 301 is ever lost.
  const legacy = boot({ pathname: "/locker", data: true });
  eq(legacy.PDXEvidenceLocker.mounted(), true, "the legacy /locker path no longer mounts the workspace");

  // ── A filtered arrival applies its filter through the public opener ───────
  const arrival = boot({ pathname: "/evidence", search: "?issue=water_drought&pols=lee,curtis", data: true });
  eq(arrival.PDXEvidenceLocker.mounted(), true, "a filtered arrival at /evidence did not mount the workspace");
  eq(arrival.__t.navs.length, 0, "a filtered arrival bounced instead of applying its filter");

  // ── The hash, cold and live, on a page with no workspace ─────────────────
  const hashCold = boot({ pathname: "/", hash: "#evidence-locker", tpl: false, data: true });
  eq(hashCold.__t.appended.length, 0, "a shared #evidence-locker link mounted a workspace that is not there");
  eq(hashCold.__t.navs[0], "/evidence", "a shared #evidence-locker link did not send the reader to the room");
  const live = boot({ pathname: "/", tpl: false, data: true });
  eq(live.__t.navs.length, 0, "precondition: the live-hash case navigated during boot");
  const hashHandlers = live.__t.listeners.window.hashchange || [];
  must(hashHandlers.length > 0, "nothing listens for hashchange — an in-page nav link would open nothing");
  live.location.hash = "#evidence-locker";
  hashHandlers.forEach((fn) => fn({ type: "hashchange" }));
  eq(live.__t.navs[0], "/evidence", "navigating to #evidence-locker in-page opened neither a workspace nor the room");

  // ── Mounting is idempotent, where mounting happens ───────────────────────
  const twice = boot({ pathname: "/evidence", data: true });
  twice.PDXEvidenceLocker.open();
  twice.PDXEvidenceLocker.open();
  eq(twice.__t.appended.length, 1, "the workspace was mounted more than once");

  // ── THE URL IS THE FILTER, BOTH WAYS ─────────────────────────────────────
  // _lockerHref and _queryOpts are each other's inverse, and they are the seam
  // the whole split rests on: a link made from a filter has to land on that
  // filter. Extracted and run rather than pattern-matched, because the claim is
  // about strings a reader can paste, not about the shape of the source.
  const navSrc = EL.slice(EL.indexOf("var _NAV_KEYS = ["), EL.indexOf("    function _mount() {"));
  must(navSrc.length > 500, "could not extract the navigation helpers from evidence-locker.js");
  const bag = {
    location: { pathname: "/", search: "" },
    console: { warn() {}, error() {} },
  };
  vm.runInNewContext(navSrc + "\n;this.href=_lockerHref;this.opts=_queryOpts;this.keys=_NAV_KEYS;", bag);
  const { href, opts: qopts, keys } = bag;

  eq(href({}), "/evidence", "no filter produces something other than the plain address");
  eq(href(), "/evidence", "a missing filter object throws or produces a query");
  eq(href({ issue: "water_drought" }), "/evidence?issue=water_drought", "one filter is not one parameter");
  eq(href({ issue: "a b&c=d" }), "/evidence?issue=a%20b%26c%3Dd",
    "the value is not encoded, so a filter could forge a second parameter");
  eq(href({ pols: ["a", "", null, "b"] }), "/evidence?pols=a%2Cb", "an array filter is not joined and cleaned");
  eq(href({ pols: [] }), "/evidence", "an empty list produced an empty parameter");
  eq(href({ nonsense: "x", issue: "guns" }), "/evidence?issue=guns", "an unknown key reached the address");
  // A FIXED ORDER, not Object.keys order: the same ask has to produce the same
  // URL or two readers comparing links see two different strings.
  eq(href({ mandate: "m", issue: "guns", pol: "lee" }), "/evidence?pol=lee&issue=guns&mandate=m",
    "the parameters are emitted in call order instead of the declared key order");
  eq(keys.join(","), "pol,pols,issue,category,type,search,bill,uid,mandate",
    "the navigable key set changed — _applyOpen and the address must read the same keys");

  const parse = (search) => { bag.location.search = search; return qopts(); };
  eq(parse(""), null, "an address with no query produced an options object instead of null");
  eq(parse("?"), null, "a bare '?' produced an options object");
  eq(JSON.stringify(parse("?issue=guns")), '{"issue":"guns"}', "one parameter did not come back as one filter");
  eq(JSON.stringify(parse("?issue=guns&nonsense=1")), '{"issue":"guns"}', "an unknown parameter was let into the filter");
  eq(JSON.stringify(parse("?issue=")), "null", "an empty parameter was applied as a filter");
  eq(JSON.stringify(parse("?pols=lee,curtis")), '{"pols":["lee","curtis"]}',
    "pols did not come back as the list _applyOpen reads");
  eq(JSON.stringify(parse("?search=clean+air")), '{"search":"clean air"}', "a '+' in a query was not read as a space");
  eq(JSON.stringify(parse("?issue=a%20b%26c%3Dd")), '{"issue":"a b&c=d"}', "the value was not decoded on arrival");
  // The round trip, which is the assertion the reader actually cares about.
  const ask = { pol: "lee", pols: ["lee", "curtis"], issue: "water_drought", category: "environment",
                type: "vote", search: "clean air", bill: "H.B. 461", uid: "u1", mandate: "m1" };
  eq(JSON.stringify(parse(href(ask).slice("/evidence".length))), JSON.stringify(ask),
    "a link made from a filter does not land on that filter");

  // ── The surfaces that hang off the workspace markup travel with it ───────
  ok(/pdx:locker:mounted/.test(EL), "the mount fires no event — the quick-jump bar and density switch could not wire");
  ok((EV.match(/pdx:locker:mounted/g) || []).length >= 2,
    "evidence.html's workspace-dependent scripts do not listen for the mount");
  ok(/document\.addEventListener\('pdx:locker:mounted', setup\)/.test(EV),
    "the quick-jump nav is not wired on mount — window.rebuildEvidenceNav would stay undefined");
  ok(/window\.rebuildEvidenceNav/.test(EV),
    "evidence.html does not define rebuildEvidenceNav — the engine calls it after every filter change");
  eq((BARE.match(/pdx:locker:mounted/g) || []).length, 0,
    "index.html still listens for a mount that can never happen there");
  ok(!/rebuildEvidenceNav/.test(BARE),
    "index.html still carries the quick-jump nav — it has no #el-jump to wire");
  ok(!/pdx-el-density/.test(BARE),
    "index.html still carries the density switch — it has no #el-results to toggle");
  ok(/pdx-el-density/.test(EV), "the density switch did not travel with the grid it toggles");
}

// ═══════════════ PHASE 3 · the workspace, and the bill number ════════════════
{
  // The filter row: search + person + issue were already there; the bill number
  // is the one the door pass added, and it is typed rather than picked. It is
  // asserted against evidence.html's template now, because that is where the
  // toolbar lives — and against index.html's absence, because a filter field on
  // a page with no grid is a control that filters nothing.
  ok(/id="el-f-bill"/.test(TEMPLATE), "there is no bill-number filter in the toolbar");
  ok(/for="el-f-bill">Bill number</.test(TEMPLATE), "the bill-number filter has no label");
  ok(!/el-f-bill/.test(BARE), "the bill-number filter is still on the homepage");
  ok(/\.el-field \.el-f-text/.test(CSS), "the bill-number input is unstyled — it would not match the row it sits in");

  ok(/_state\.bill/.test(EL), "the bill filter is not part of the locker's filter state");
  const matches = EL.slice(EL.indexOf("function _matches(it)"), EL.indexOf("// Numeric rank for the strength sort"));
  ok(/if \(_state\.bill\)/.test(matches), "_matches() ignores the bill filter");
  ok(/_billKey\(_state\.bill\)/.test(matches), "the bill filter is matched raw rather than through the shared key");
  ok(/b\.key\.indexOf\(bq\)/.test(matches), "the bill filter does not match a partial number");
  ok(/b\.ref; \}\)\.join\(' '\)/.test(matches), "bill numbers are not searchable from the main search box");

  // ── The helpers, against real text ────────────────────────────────────────
  const helpers = EL.slice(EL.indexOf("var _EL_BILL_PRINT"), EL.indexOf("function _billDoorHtml"));
  must(helpers.length > 200, "could not extract the bill-number helpers from evidence-locker.js");
  const bag = { _esc: (s) => String(s) };
  vm.runInNewContext(helpers + "\n;this.refs=_billRefs;this.key=_billKey;", bag);
  const { refs, key } = bag;

  const one = (t) => (refs(t)[0] || {}).ref;
  eq(one("She carried H.B. 461 to the floor"), "H.B. 461", "a dotted Utah bill number is not read");
  eq(one("voted against HB0461 in committee"), "H.B. 461", "the legislature's own HB0461 form is not read");
  eq(one("sponsored HB 461"), "H.B. 461", "an undotted, spaced bill number is not read");
  eq(one("opposed S.B. 186"), "S.B. 186", "a senate bill number is not read");
  eq(one("voted for H.R. 1"), "H.R. 1", "a federal house bill number is not read");
  eq(one("voted against S. 2938"), "S. 2938", "a federal senate bill number is not read");
  eq(one("backed H.J.R. 12"), "H.J.R. 12", "a joint resolution number is not read");

  // Same bill, three spellings, one key — that is what makes the filter work.
  eq(key("H.B. 461"), key("HB0461"), "HB0461 and H.B. 461 do not share a filter key");
  eq(key("H.B. 461"), key("hb 461"), "a lowercase, spaced number does not share a filter key");
  ok(key("H.B. 461").indexOf("461") >= 0, "a reader who types just the digits could not find the bill");
  ok(key("H.B. 4") === "hb4" && key("HB0004") === "hb4", "leading zeros are not normalized away");

  // Things that are not bills.
  eq(refs("drove U.S. 89 through Kanab").length, 0, "a highway number was read as a Senate bill");
  eq(refs("cited 42 U.S.C. 1983 in the filing").length, 0, "a statute citation was read as a Senate bill");
  eq(refs("won by 461 votes").length, 0, "a bare number was read as a bill");
  eq(refs("").length, 0, "empty text produced a bill reference");

  // De-duplicated, and stable.
  eq(refs("H.B. 461 and HB0461 and hb 461").length, 1, "the same bill was read three times");
  eq(refs("H.B. 461 and S.B. 186").length, 2, "two distinct bills in one receipt were not both read");

  // ── Against the shipped library, not a fixture ────────────────────────────
  const live = boot({ pathname: "/", tpl: false, data: true });
  let named = 0, sample = null;
  const scan = (list) => {
    (list || []).forEach((it) => {
      if (!it || !it.headline) return;
      const hits = refs(it.headline + " . " + (it.facts || ""));
      if (hits.length) { named++; sample = sample || hits[0].ref; }
    });
  };
  Object.keys(live.SPOTLIGHT_DATA || {}).forEach((pid) => scan(live.SPOTLIGHT_DATA[pid]));
  Object.keys(live.CMP_DATA || {}).forEach((pid) => scan((live.CMP_DATA[pid] || {}).spotlight));
  ok(named > 0,
    "no receipt in the shipped library names a bill number — the filter and the bill door are dead code");
  ok(/^[A-Z]/.test(String(sample || "")), `the first real bill number read out of the library is malformed: ${sample}`);

  // ── The bill door: one bill object, not a fourth one ──────────────────────
  ok(/function _billDoorHtml\(/.test(EL), "receipts have no door to the measure they name");
  const doorFn = EL.slice(EL.indexOf("function _billDoorHtml("), EL.indexOf("    function _build()"));
  ok(/data-el-bill=/.test(doorFn), "the bill door carries no bill number");
  ok(!/href=/.test(doorFn), "the bill door hard-codes an address instead of asking the bill panel to resolve one");
  ok(/_billDoorHtml\(it\)/.test(EL), "the bill door is never rendered on a card");
  ok(/el-modal-bills/.test(EL), "the bill door is missing from the receipt's own detail view");
  ok(/PDXBillDetail/.test(EL) && /B\.open\(ref, ''\)/.test(EL),
    "the bill door does not hand the number to PDXBillDetail — the app would have two bill surfaces");
  ok(/PDXBills\.open\(ref\)/.test(EL), "the bill door goes dead when the detail panel is absent");
  ok(/\.el-billdoor/.test(CSS), "the bill door is unstyled");
  // AND ON /evidence THAT NAME IS AN ADDRESS. The document with the workspace has
  // no bill panel, so it seams both names to /b/<sitting>/<number> — the bill's
  // own record — rather than leaving the tap dead.
  ok(/window\.PDXBillDetail = \{/.test(EV) && /window\.PDXBills = \{/.test(EV),
    "evidence.html does not seam the two bill names — a receipt's measure tap would go nowhere there");
  ok(/'\/b\/'/.test(EV), "evidence.html's bill seam does not resolve to /b/<number>");

  // The locker must not grow its own bill renderer.
  ok(!/measures|rollcalls|voteDate|externalIds/.test(doorFn),
    "the bill door reaches into measure data — the bill object is being rebuilt inside the locker");

  // A row tap still opens the three things it always opened: the receipt, the
  // person, and now the measure. No fourth object.
  ok(/_openModalItem\(_itemsByUid\[card\.getAttribute\('data-uid'\)\]\)/.test(EL),
    "tapping a row no longer opens the receipt");
  ok(/showProfile\(/.test(EL), "a receipt no longer opens the person it belongs to");
}

// ═══════════════ PHASE 4 · the fence ═════════════════════════════════════════
{
  // Formal roll calls are not copied into the locker. The library is built from
  // curated spotlight evidence and nothing else — no roll list, no vote row, no
  // voting-record read anywhere in the file.
  const build = EL.slice(EL.indexOf("    function _build()"), EL.indexOf("    // ── Dev / curator Triage Workflow"));
  must(build.length > 1000, "could not extract _build() — the ingestion assertion would be vacuous");
  ok(/rec\.spotlight/.test(build) && /SD\[id\]/.test(build),
    "_build() no longer reads the curated spotlight evidence");
  for (const forbidden of ["PDXVotingRecord", "rollcall", "rollCall", "voting-record", "voteDate", "ACCT_SPOTLIGHT"]) {
    ok(build.indexOf(forbidden) < 0, `_build() reads ${forbidden} — formal record is being copied into the locker`);
    ok(EL.indexOf(forbidden) < 0, `evidence-locker.js references ${forbidden} — the locker is ingesting formal record`);
  }
  ok(!/\/api\//.test(EL), "the locker fetches an API — the library is built from data already in the page");

  // The things this run was told not to touch.
  ok(!/DirectionMatch|_pdxDirectionMatch|direction_match/.test(EL),
    "the locker now reaches into Direction Match");
  // (The money theme's own surfaces, by name. "campaign finance" is an ISSUE_MAP
  // keyword and has been in this file's issue vocabulary all along.)
  for (const money of ["finance-lane", "PDXFinance", "_pdxFinance", "itemized", "small-dollar", "letterheadChipMount"]) {
    ok(EL.indexOf(money) < 0, `the locker now reaches into the money theme (${money})`);
  }
  ok(/window\._pdxCategoryOf|_issueMap\(\)/.test(EL),
    "the locker stopped reading the shared issue mapping — mappings were reimplemented instead of reused");

  // The data-only consumers of the evidence index keep working with no workspace
  // mounted: the index is still warmed in the background on a cold homepage, and
  // after the split that is the ONLY thing the engine does on `/`.
  for (const api of [
    "_pdxEvidenceOnRecord", "_pdxEvidenceCountForPeople", "_pdxEvidenceIssueKeysForPerson",
    "_pdxEvidenceDepthForPerson", "_pdxEvidenceDepthPill", "_pdxEvidenceInferredStancesForPerson",
  ]) {
    ok(new RegExp("window\\." + api + " = ").test(EL), `${api} is gone — a surface elsewhere on the page reads it`);
  }
  const init = EL.slice(EL.indexOf("    function _init() {"), EL.indexOf("    // Primary path: runs after"));
  ok(/requestIdleCallback\(_kick/.test(init),
    "the closed door no longer warms the evidence index — the on-record counts and depth pills would go quiet");
  ok(/_wireDoor\(\);/.test(init) && /_wireRoutes\(\);/.test(init),
    "_init() does not wire the door and its routes");
  ok(!/_wireModal\(\);/.test(init),
    "_init() still wires the workspace at boot — the wiring belongs to the mount");
  // And the engine is still on BOTH documents: the homepage for the counts, the
  // address for the workspace. A split that dropped it from `/` would starve
  // four surfaces that never wanted a grid.
  ok(/<script src="\/evidence-locker\.js"><\/script>/.test(BARE),
    "index.html no longer loads the evidence engine — the door's count and the depth pills read it");
  ok(/src="\/evidence-locker\.js"/.test(EV_BARE), "evidence.html does not load the engine that paints it");
}

// ── Result ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ locker door — ${failures.length} of ${passed + failures.length} assertions failed:\n`);
  failures.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
console.log(`\n✓ locker door — ${passed} assertions passed\n`);
