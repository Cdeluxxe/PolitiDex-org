#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-door-one-collapse.mjs — the Door 1 workspace IS the work; the four views
// are one line each
// ─────────────────────────────────────────────────────────────────────────────
// test-door-one-workspace.mjs pins that the desk exists, that it holds one mode
// at a time, and that making four surfaces into one loop let no reading or
// ranking into the chrome. It also pinned that each of those four surfaces now
// SAYS it is a view of the desk — and stopped there. They said it at full height,
// so a reader who opened a Door 1 door met the desk in the right mode and then
// the same four products again, in full, underneath it. More stacked prose than
// before the desk existed, which is the exact shape the desk exists to remove.
//
// This file pins the collapse, and pins its blast radius.
//
//   1. THE MECHANISM SHIPS WHOLE. One attribute from the script, one rule in the
//      stylesheet, both files behind a CACHE_VERSION that moved. And the
//      attribute is nowhere in index.html: with JS off there is nothing to
//      collapse and all four sections stand as the static HTML ships them.
//   2. FOUR STUBS, ONCE THERE IS A DESK. Every id in VIEWS carries the collapse
//      attribute after a successful sync(), and none of them before one.
//   3. THE STUB IS ONE LINE. The chapter's title, the line saying what it is a
//      view of, and exactly ONE control. No heading, no second offer.
//   4. THE CONTROL LANDS ON THE RIGHT MODE, and the body it collapsed is still
//      in the document — collapsed, not deleted.
//   5. THE HASHES STILL WORK. Every WORK_ID still routes through the shipped
//      router and still selects the mode it belongs to.
//   6. IT COLLAPSES ONLY ITS OWN FOUR. Door 2's workspace, Who Represents Me,
//      the proof band, the showcase, the person modal, Voter Academy, Mandate,
//      Community and finance are never stamped.
//   7. NO DESK, NO COLLAPSE. No mount, or no module behind any of the four
//      modes, and nothing is labelled or reduced.
//   8. A SHIPPED ISSUE KEY OPENS AS ITSELF. public lands is a real ISSUE_MAP key
//      that used to belong to no curated bundle: it resolved to nothing and the
//      desk printed the record lane's own no-vehicle sentence over a lookup
//      failure. The parent table has since given every published key exactly one
//      core, so it now resolves through the table as a CHILD of Climate, Energy
//      & Land — and the thing this section has always been about is unchanged: the
//      key opens as itself, the read is narrowed to that key, the ledger is asked
//      with the signature the ledger publishes, and with rows present the desk
//      lists people. The standalone branch survives as a backstop for a key that
//      arrives from data older than the table, and is exercised as one. An
//      UNKNOWN key still refuses.
//   9. NO FLOOR MOVED. No party, no percentage, no publication floor, no slice
//      sentence, and every named brief and Direction Match read byte-identical
//      with the desk loaded and without it.
//
//   node scripts/test-door-one-collapse.mjs
//
// Real shipped modules in a node:vm sandbox plus a mini-DOM: every claim below
// about a stub, an attribute or a people list is about markup this file painted.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const FILES = [
  "cmp-data.js",
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  "stance-helpers.js",
  "alignment-tool.js",
  "pdx-issue-family.js",
  "acct-spotlight-data.js",
  "say-vs-do.js",
  "consistency.js",
  "voting-record.js",
  "inventory.js",
  "issue-scope.js",
  "word-action.js",
  "profile-spine.js",
  "issue-colors.js",
  "person-link.js",
  "bills-index.js",
  "bills.js",
  "bill-detail.js",
  "claim-check.js",
  "issue-view.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
const DESK = R("door1-workspace.js");
const CSS = R("door1-workspace.css");
const HTML = R("index.html");
const SW = R("sw.js");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const no = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ door one collapse: STALE PROBE — ${msg}`);
  process.exit(2);
};

// ── The four, and the sections that are NOT this file's to touch ─────────────
// The second list is the wall. Each id is a real surface owned by someone else:
// Door 2's spine and workspace, the homepage's own proof band and showcase, the
// person modal, and four doors of their own. If the collapse ever reaches one of
// them, the homepage loses a product rather than a duplicate.
const SURFACES = ["hero-receipt", "say-vs-do", "issue-front-door", "hr1-showcase"];
const PROTECTED = [
  "my-politicians",          // Who Represents Me / the ballot workspace's seat list
  "pdx-ballot-workspace",    // Door 2's desk
  "pdx-door2-spine",         // Door 2's own spine mount
  "live-proof",              // the proof band on the first screen
  "politician-cards",        // the homepage showcase
  "profileModal",            // the person file
  "voter-academy",
  "pdx-mandate",
  "community",
  "finance-tracker",
];
// The section titles index.html gives these four, so the stub can be checked
// against a real accessible name rather than against the module's fallback.
const ARIA = {
  "say-vs-do": "Say vs. Do — sourced receipts",
  "issue-front-door": "Start with an issue — the tracked record on each issue family",
  "hr1-showcase": "H.R.1 Showcase — the contradiction engine",
};

function miniDom(win) {
  const byId = {};
  const mk = (id, opts) => {
    opts = opts || {};
    const node = {
      id: id || "", className: "", innerHTML: "", textContent: "",
      style: {}, dataset: {}, children: [], hidden: false, attrs: {},
      firstChild: null,
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { this.children.push(c); c.parentNode = this; if (c && c.id) byId[c.id] = c; return c; },
      insertBefore(c) { this.children.unshift(c); c.parentNode = this; if (c && c.id) byId[c.id] = c; return c; },
      removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, click() {},
      scrollIntoView() {},
      // The heading the module painted, when this probe says one was painted.
      querySelector(sel) {
        if (opts.heading && /h1|h2|h3/.test(String(sel))) return { textContent: opts.heading };
        return null;
      },
      querySelectorAll() { return []; },
    };
    if (opts.aria) node.attrs["aria-label"] = opts.aria;
    if (id) byId[id] = node;
    return node;
  };
  win.document.createElement = () => mk("");
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = mk("body");
  win.document.body.appendChild = function (c) { if (c && c.id) byId[c.id] = c; return c; };
  mk("pdx-eye-input");
  win.__mk = mk;
  return byId;
}

function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const sess = opts.session || {};
  win.sessionStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(sess, k) ? sess[k] : null),
    setItem: (k, v) => { sess[k] = String(v); },
    removeItem: (k) => { delete sess[k]; },
  };
  win.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  win.auth = { currentUser: null };
  win.addEventListener = () => {};
  win.dispatchEvent = () => true;
  // The sandbox has no network, so the ledger's own read rejects and warns — a true
  // statement about a build box, and not a finding. Only that one line is muted.
  const quiet = (f) => (...a) =>
    String(a[0] || "").indexOf("no network at build time") >= 0 ? undefined : f(...a);
  win.console = Object.assign({}, console, { warn: quiet(console.warn), error: quiet(console.error) });
  const byId = miniDom(win);
  // The four, each with the accessible name index.html gives it, plus whatever
  // heading this probe says its module painted.
  SURFACES.forEach((id) =>
    win.__mk(id, { aria: ARIA[id] || "", heading: (opts.headings || {})[id] || "" }));
  PROTECTED.forEach((id) => win.__mk(id));
  if (!opts.noMount) { win.__mk("pdx-door1-workspace"); win.__mk("pdx-d1-body"); }
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  win.__loadErrors = [];
  if (!opts.noModules) {
    for (const [f, src] of SRC) {
      try { vm.runInContext(src, ctx, { filename: f }); }
      catch (e) { win.__loadErrors.push(`${f}: ${e.message}`); }
      // THE STUB HAS TO LAND HERE, not after the loop. There is no fetch in a
      // sandbox, so the real read rejects, and the ledger's catch marks every key
      // it was asked for as loaded — honestly, since a failed read and an issue
      // with no roll calls are the same "no vote evidence" outcome. A stub
      // installed after that has nothing left to answer. Swapping the data layer
      // the moment it exists is the only point at which this is provable, and it
      // swaps ONE function: everything above it is the shipped ledger.
      if (f === "voting-record.js" && opts.records) {
        win.PDXVotingRecord.fetchIssueRecords = opts.records;
      }
    }
  }
  win.PROFILES = win.CMP_DATA;
  win.__routed = [];
  win.pdxDoorWork = (id) => { win.__routed.push("work:" + id); return true; };
  win.pdxDoor = (mode) => { win.__routed.push("door:" + mode); return true; };
  if (opts.beforeDesk) opts.beforeDesk(win);
  if (!opts.withoutDesk) vm.runInContext(DESK, ctx, { filename: "door1-workspace.js" });
  win.__session = sess;
  win.__byId = byId;
  return win;
}

const paint = (w) => {
  w.PDXDoor1.sync();
  const h = w.document.getElementById("pdx-d1-body");
  return h ? String(h.innerHTML) : "";
};
const stripOf = (w, id) => {
  const s = w.document.getElementById("d1-strip-" + id);
  return s ? String(s.innerHTML) : "";
};
const collapsedOf = (w, id) => {
  const h = w.document.getElementById(id);
  return h ? h.getAttribute("data-door1-collapsed") : "MISSING";
};

const probe = boot();
must(probe.PDXDoor1 && typeof probe.PDXDoor1.sync === "function",
  `the desk did not export sync() — boot errors: ${probe.__loadErrors.join(" | ")}`);
must(Array.isArray(probe.PDXDoor1.VIEWS) && probe.PDXDoor1.VIEWS.length === 4,
  "VIEWS is not the four-surface list this file is about");
must(typeof probe.PDXDoor1._live === "function", "the desk does not publish whether it painted");
must(probe.ISSUE_MAP && probe.ISSUE_MAP.lands_preserve,
  "lands_preserve is no longer a shipped ISSUE_MAP key — section 8 is about a key that exists");
must(Array.isArray(probe.CORE_NATIONAL_ISSUES) && probe.CORE_NATIONAL_ISSUES.length > 5,
  "the curated bundles did not load");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · The collapse is one attribute and one rule, shipped as a pair");

{
  // THE ATTRIBUTE, written by the script.
  has(DESK, "data-door1-collapsed",
    "the script sets no collapse attribute, so the stylesheet rule below has nothing to match");
  // THE RULE, in the stylesheet. Everything except the stub slot goes, and the
  // exception is spelled out rather than implied.
  has(CSS, '[data-door1-collapsed="1"] > *:not(.d1-strip-slot)',
    "the stylesheet has no rule that collapses a stamped section's body");
  has(CSS, "display: none !important",
    "the collapse rule does not actually hide anything");
  // THE STUB SURVIVES IT. A rule that hid the slot too would collapse the
  // section to nothing at all, which is deletion with extra steps.
  ok(/\.d1-strip-slot\s*\{\s*display:\s*block/.test(CSS),
    "the stub slot is not kept displayed, so the collapse would hide the stub as well");

  // NO-JS IS EXPANDED-IN-PLACE, and that is not a promise — it is the absence of
  // the attribute from the shipped HTML. Nothing in index.html can collapse.
  no(HTML, "data-door1-collapsed",
    "index.html ships the collapse attribute, so a reader with JS off would meet four\n" +
    "    one-line stubs and no way to expand them");

  // THE PAIR MOVED TOGETHER. The script sets an attribute the old stylesheet has
  // no rule for; the stylesheet has a rule the old script never triggers.
  const ver = Number(String(SW.match(/CACHE_VERSION\s*=\s*'v(\d+)'/)?.[1] || 0));
  must(ver > 0, "CACHE_VERSION is not readable from sw.js any more");
  ok(ver >= 106, `CACHE_VERSION is v${ver} — the workspace pair changed and must ship behind a bump`);
  has(SW, "// v106 - ", "there is no v106 entry in the version log explaining the bump");
  has(SW, "'/door1-workspace.js'", "the desk script left the precache manifest");
  has(SW, "'/door1-workspace.css'", "the desk stylesheet left the precache manifest");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · Four sections become stubs, once there is a desk to be views of");

{
  const w = boot();
  // Before the first sync nothing is stamped: the module boots itself, so this
  // is asserted the only way it can be — on a page with no mount, in section 7.
  eq(w.PDXDoor1.sync(), true, "the desk did not paint on a page carrying every module");
  eq(w.PDXDoor1._live(), true, "the desk painted but does not report itself live");
  for (const v of w.PDXDoor1.VIEWS) {
    eq(collapsedOf(w, v.id), "1", `#${v.id} is still standing at full height under the desk`);
    ok(stripOf(w, v.id).length > 0, `#${v.id} was collapsed with no stub left behind`);
  }
  // And the list is exactly four. A fifth entry here is a fifth section this
  // file would be silently allowed to reduce.
  eq(w.PDXDoor1.VIEWS.map((v) => v.id).sort().join(","), SURFACES.slice().sort().join(","),
    "VIEWS is not the four WORK_ID surfaces");

  // Idempotent. Three paints, one slot, one attribute.
  const host = w.document.getElementById("say-vs-do");
  const n = host.children.length;
  paint(w); paint(w);
  eq(host.children.length, n, "a repaint inserted a second stub into the collapsed section");
  eq(collapsedOf(w, "say-vs-do"), "1", "a repaint lost the collapse");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · The stub is one line: a title, what it is, one control");

{
  const w = boot({ headings: { "hero-receipt": "📜 The Receipt" } });
  paint(w);
  for (const v of w.PDXDoor1.VIEWS) {
    const s = stripOf(w, v.id);
    has(s, "A VIEW of the Door 1 workspace", `#${v.id}'s stub does not say what it is a view of`);
    has(s, "Open in Door 1", `#${v.id}'s stub carries no way onto the desk`);
    has(s, `PDXDoor1.toDesk('${v.mode}')`, `#${v.id}'s stub does not aim at its own mode`);
    // EXACTLY ONE CONTROL. Two offers on a stub is the section becoming a
    // product again by the shortest available route.
    eq((s.match(/<button/g) || []).length, 1,
      `#${v.id}'s stub carries more than one control`);
    eq((s.match(/<a\s/g) || []).length, 0,
      `#${v.id}'s stub carries a link as well as its control`);
    // NOT A HEADING. A fifth <h2> on the homepage is a fifth product.
    for (const t of ["<h1", "<h2", "<h3", "<h4"]) {
      no(s, t, `#${v.id}'s stub carries a ${t} — it must read as a label, not a section`);
    }
    // And no figure of any kind on the stub.
    no(s, "%", `#${v.id}'s stub prints a percentage`);
  }
  // THE TITLE IS THE SECTION'S OWN. A painted heading wins; failing that the
  // accessible name index.html gives the section; failing that VIEWS' short
  // label. None of the three is this file's invention.
  has(stripOf(w, "hero-receipt"), "📜 The Receipt",
    "the stub ignored the heading the module painted and named the chapter itself");
  for (const id of Object.keys(ARIA)) {
    has(stripOf(w, id), ARIA[id],
      `#${id}'s stub does not carry the section's own accessible name as its title`);
  }
  // And with neither, the short label — never an empty title.
  const bare = boot();
  paint(bare);
  const v0 = bare.PDXDoor1.VIEWS[0];
  has(stripOf(bare, v0.id), v0.label,
    "a section with no heading and no accessible name got a stub with no title");
  has(bare.PDXDoor1._title({ getAttribute: () => null }, v0), v0.label,
    "the title reader does not fall back to the short label");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · The control lands on the mode, and the body is collapsed not deleted");

{
  for (const v of probe.PDXDoor1.VIEWS) {
    const w = boot();
    paint(w);
    // Exactly what the stub's onclick does.
    w.PDXDoor1.toDesk(v.mode);
    eq(w.PDXDoor1._mode(), v.mode,
      `"Open in Door 1" on #${v.id} did not put the desk in ${v.mode} mode`);
    has(paint(w), `data-d1-mode="${v.mode}"`,
      `the desk did not repaint in ${v.mode} mode after the stub handed off to it`);
  }
  // NOT DELETED. The section is still in the document, still addressable by id,
  // still carries its children, and its innerHTML was never touched.
  const w = boot();
  const host = w.document.getElementById("say-vs-do");
  host.innerHTML = "<p>the module's own body</p>";
  paint(w);
  ok(w.document.getElementById("say-vs-do") !== null,
    "the collapsed section left the document");
  has(host.innerHTML, "the module's own body",
    "the collapse emptied the section instead of hiding it — a module repainting into\n" +
    "    #say-vs-do would be painting into a hole");
  no(DESK, ".removeChild(", "the desk removes DOM nodes from the surfaces it collapses");
  no(DESK, ".remove()", "the desk deletes nodes from the surfaces it collapses");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · Every WORK_ID hash still opens, and still selects its mode");

{
  // The router is index.html's; this asserts the declaration is still there and
  // that the wrapper on it still translates each id into a desk mode.
  const decl = HTML.match(/var WORK_IDS = \[[^\]]*\]/);
  must(decl, "index.html no longer declares WORK_IDS");
  for (const id of SURFACES) {
    has(decl[0], `'${id}'`, `${id} left WORK_IDS, so its inbound anchors are dead`);
  }
  for (const v of probe.PDXDoor1.VIEWS) {
    const w = boot();
    paint(w);
    // The arrival a hash makes: openWork(id), wrapped.
    eq(w.pdxDoorWork(v.id), true, `the wrapper broke the router's return value for ${v.id}`);
    ok(String(w.__routed).indexOf("work:" + v.id) >= 0,
      `#${v.id} no longer reaches the shipped router`);
    eq(w.PDXDoor1._mode(), v.mode,
      `the hash #${v.id} did not open ${v.mode} mode on the desk`);
    // And it did not leave the loop: no new surface, no fifth door.
    has(paint(w), 'class="d1-rail"', `arriving on #${v.id} left the reader without the rail`);
  }
  // The smoke case, named in the brief.
  const m = boot(); paint(m); m.pdxDoorWork("hr1-showcase");
  eq(m.PDXDoor1._mode(), "measure", "#hr1-showcase did not open measure mode");
  const i = boot(); paint(i); i.pdxDoorWork("issue-front-door");
  eq(i.PDXDoor1._mode(), "issue", "#issue-front-door did not open issue mode");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · It collapses only its own four");

{
  const w = boot();
  paint(w);
  for (const id of PROTECTED) {
    eq(collapsedOf(w, id), null,
      `#${id} was collapsed by Door 1's chrome — it is not Door 1's to reduce`);
    eq(w.document.getElementById(id).getAttribute("data-door1-of"), null,
      `#${id} was stamped as owned by Door 1's desk`);
    eq(stripOf(w, id), "", `#${id} was given a Door 1 view stub`);
  }
  // The blast radius is VIEWS and nothing else — asserted at source, because a
  // querySelectorAll or a class sweep would reach further than the list.
  no(DESK, "querySelectorAll", "the desk sweeps the document instead of naming its four surfaces");
  no(DESK, "document.querySelector(", "the desk selects surfaces it has not named");
  // Door 2's files know nothing about this, and must not need to.
  for (const f of ["door2-spine.js", "ballot-workspace.js", "first-run.js"]) {
    no(R(f), "data-door1-collapsed", `${f} was taught about Door 1's collapse`);
    no(R(f), "PDXDoor1", `${f} was made to depend on Door 1's desk`);
  }
  // FIRST RUN STAYS TWO DOORS. Its two paths are the reps lookup and the ballot
  // workspace; neither is in Door 1's old stack, and this pass did not add a
  // third.
  const FR = R("first-run.js");
  for (const id of SURFACES) {
    no(FR, id, `first-run.js now aims a path at #${id} — the ranking is two doors`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · No desk, no collapse");

{
  // No mount: an older cached index.html, or any other page carrying the four
  // surfaces. Nothing is labelled and nothing is reduced.
  const bare = boot({ noMount: true });
  eq(bare.PDXDoor1.sync(), false, "the desk claimed a paint with no mount to paint into");
  eq(bare.PDXDoor1._live(), false, "the desk reports itself live with no mount");
  bare.PDXDoor1.views();
  for (const id of SURFACES) {
    eq(collapsedOf(bare, id), null,
      `#${id} was collapsed in favour of a desk that never mounted`);
    eq(stripOf(bare, id), "", `#${id} was labelled a view of a desk that never mounted`);
  }

  // A mount, but not one module behind any of the four modes. The desk fails
  // closed, and a section must not be reduced for it.
  const none = boot({ noModules: true });
  eq(none.PDXDoor1.sync(), false, "the desk painted with no module behind a single mode");
  eq(none.PDXDoor1._live(), false, "the desk reports itself live with nothing to host");
  none.PDXDoor1.views();
  for (const id of SURFACES) {
    eq(collapsedOf(none, id), null, `#${id} was collapsed in favour of an empty desk`);
  }

  // And the collapse comes back once the desk does. The attribute is set on the
  // paint, not once and forever at boot.
  const w = boot();
  paint(w);
  eq(collapsedOf(w, "hr1-showcase"), "1", "a live desk did not collapse its views");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · A shipped issue key opens as itself; an unknown one still refuses");

{
  const D = probe.PDXDoor1;
  // THE KEY IS REAL, AND IT NOW HAS A PARENT. It has a label and a chip in
  // ISSUE_MAP, and as of the September 2026 parent-table pass exactly one core
  // lists it — which is what put a chip for it on a branch instead of leaving it
  // reachable only by typing its name. Read off the table rather than named here,
  // because a literal copied into a test is a second taxonomy in miniature.
  const PARENT = probe.CORE_NATIONAL_ISSUES
    .filter((c) => (c.keys || []).indexOf("lands_preserve") >= 0)[0] || null;
  must(PARENT, "lands_preserve is in no curated bundle — every published key is supposed to have " +
    "exactly one parent (see scripts/test-issue-family.mjs)");
  const t = D._resolveIssue("lands_preserve");
  ok(t !== null, "a shipped ISSUE_MAP key still resolves to nothing, so the desk prints the\n" +
    "    record lane's no-vehicle sentence over a failure of its own lookup");
  // THE THING THIS SECTION IS ACTUALLY ABOUT, and the part a parent does not move:
  // the target is scoped to the ONE key that was asked for. What changed is only
  // where the desk browses from.
  eq(t && t.focusKey, "lands_preserve", "the resolved target does not scope to the key that was asked for");
  eq(t && t.standalone, false, "a key with a parent was resolved as if it had none");
  eq(t && t.core && t.core.key, PARENT.key, "the key was filed under a core other than its parent");
  ok(t && t.core && t.core.keys.indexOf("lands_preserve") >= 0,
    "the resolved core does not list the key that resolved to it");
  // NO MAPPING INVENTED. The parent is the one the table declares — not the
  // nearest bundle by keyword, and not a bundle stood up for this key.
  eq(probe.CORE_NATIONAL_ISSUES.filter((c) => (c.keys || []).indexOf("lands_preserve") >= 0).length, 1,
    "more than one bundle claims this key, so which parent the desk names is a coin flip");

  // THE STANDALONE BRANCH IS A BACKSTOP, AND STILL WORKS. Nothing the register
  // publishes can reach it any more, so it is exercised the only honest way left:
  // a booted desk whose table has been replaced by one that omits the key, which
  // is exactly the shape "data older than the table" arrives in. The key still
  // opens as itself, ranked on its own record, with no bundle invented for it.
  // The desk asks three lookups in the order they shipped — the family table, then
  // alignment-tool's own reverse lookup, then a scan of the shelf — so all three
  // have to come back empty for this to be the "older than the table" case rather
  // than a test that only silenced the first one.
  {
    const s = boot();
    const without = s.CORE_NATIONAL_ISSUES.map((c) =>
      Object.assign({}, c, { keys: (c.keys || []).filter((k) => k !== "lands_preserve") }));
    s.CORE_NATIONAL_ISSUES = without;
    const wasLookup = s.coreIssueForKey;
    s.coreIssueForKey = (k) =>
      (k === "lands_preserve" ? null : wasLookup && wasLookup(k)) || null;
    must(!s.PDXIssueFamily || s.PDXIssueFamily.coreOf("lands_preserve") === "",
      "the family table still parents the key after the table was replaced, so the backstop " +
      "below is not being reached");
    const u = s.PDXDoor1._resolveIssue("lands_preserve");
    must(u, "the backstop no longer opens a shipped key that no core lists");
    eq(u.standalone, true, "an unparented key was resolved without being marked standalone");
    eq(u.focusKey, "lands_preserve", "the backstop does not scope to the key asked for");
    eq(u.core.keys.join(","), "lands_preserve",
      "the standalone target ranks something other than the one key asked for");
    eq(u.core.label, probe.ISSUE_MAP.lands_preserve.label,
      "the standalone target is not labelled with the key's own shipped label");
    ok(!without.some((c) => c.key === u.core.key),
      "the unparented key was folded into a curated bundle");
    // …and the sentence that goes with it is still the one that names no bundle.
    s.pdxDoor1Open("issue");
    s.pdxDoor1Issue("lands_preserve");
    has(paint(s), "is not inside any of the tracked issues above",
      "the backstop lists a standalone issue without saying it is outside the shelf");
  }

  // AN UNKNOWN KEY STILL REFUSES. The leniency is "shipped but uncurated", not
  // "anything a caller hands us".
  must(!probe.ISSUE_MAP["not_an_issue_key_at_all"], "probe: the fake key is somehow real");
  eq(D._resolveIssue("not_an_issue_key_at_all"), null,
    "a key the stance vocabulary does not carry resolved anyway");
  eq(D._resolveIssue(""), null, "an empty key resolved to something");

  // THE SCOPE SENTENCE. A reader looking at a list for one key under a shelf of
  // thirteen is owed the line that says which key, and — now that the key has a
  // parent — which family, and that the read is the key and not the family.
  const escq = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const w = boot({ session: { pdx_d1_mode: "issue", pdx_d1_issue: "lands_preserve" } });
  const out = paint(w);
  has(out, `Scoped to <b>${escq(probe.ISSUE_MAP.lands_preserve.label)}</b>`,
    "the desk lists one key's record without saying which key it is scoped to");
  has(out, `inside ${escq(PARENT.label)}`,
    "the desk does not name the family the key it is reading belongs to");
  has(out, "not the whole bundle",
    "the desk does not say the read is the key rather than its whole family");
  no(out, "is not inside any of the tracked issues above",
    "the desk still calls a parented key unparented");
  has(out, probe.ISSUE_MAP.lands_preserve.label,
    "the issue is not named on the desk in its own shipped words");

  // THE LEDGER IS ASKED THE WAY THE LEDGER ASKS TO BE ASKED, and for this key that
  // is the only way that works. PDXIssueView.warmVotes takes a key OR an already
  // resolved target. Handed a key it calls resolveTarget, which is resolveCore plus
  // a narrowing — and resolveCore is precisely what returns nothing for a shipped
  // key no curated bundle lists. So a desk that passes the bare key warms nothing
  // for the one case it had to resolve by hand, the ranking runs on receipts and
  // stated positions alone, and an issue whose entire record is roll calls comes out
  // looking like an issue with no record.
  {
    const spy = [];
    const s = boot({
      session: { pdx_d1_mode: "issue" },
      beforeDesk(win) {
        const orig = win.PDXIssueView.warmVotes;
        win.PDXIssueView.warmVotes = function (a, b, c) {
          spy.push({ a, b, argc: arguments.length });
          return orig.apply(this, arguments);
        };
      },
    });
    s.pdxDoor1Issue("lands_preserve");
    eq(spy.length, 1, "picking an issue did not ask the ledger for its roll-call record");
    ok(spy[0] && spy[0].a && typeof spy[0].a === "object" && Array.isArray(spy[0].a.keys),
      "the desk handed the ledger a bare key, which the ledger re-resolves — and there is\n" +
      "    no bundle to resolve for this key, so nothing is warmed and the record reads empty");
    // The target's key set is its PARENT's, because a bundled key resolves to its
    // bundle — and the narrowing is the second argument, which is what makes the
    // read this key's own. That second argument is the thing that must never drift:
    // it is what the ledger reads by, and a cousin's key here is a cousin's census.
    ok(spy[0] && spy[0].a && spy[0].a.keys.indexOf("lands_preserve") >= 0,
      "the desk asked the ledger about a key set that does not contain the key the reader picked");
    eq(spy[0] && spy[0].a && spy[0].a.key, PARENT.key,
      "the desk asked the ledger about a bundle other than the key's own parent");
    eq(spy[0] && spy[0].b, "lands_preserve", "the scope was dropped on the way to the ledger");
    // And no fourth-argument dependence: the export takes no callback, so a desk
    // that repainted from one would never repaint. It repaints on the event the
    // ledger actually fires.
    ok(spy[0].argc <= 2, "the desk passes a callback the ledger's export does not accept");
    has(DESK, "'pdx-issue-votes'",
      "the desk does not listen for the event the ledger fires when a batch lands, so a\n" +
      "    read that finishes after the paint would never reach the reader");
  }

  // THE EXPORT ITSELF TAKES BOTH SHAPES. The desk is not the only caller; the front
  // door and the person file still hand it a key, and that must keep resolving.
  {
    const w = boot();
    const IV = w.PDXIssueView;
    ok(!(() => { try { IV.warmVotes("housing"); return false; } catch { return true; } })(),
      "the ledger's warmVotes stopped accepting a bare issue key, which every other\n" +
      "    caller on the site passes it");
    ok(!(() => { try { IV.warmVotes({ key: "x", label: "x", keys: ["lands_preserve"] }, ""); return false; } catch { return true; } })(),
      "the ledger's warmVotes rejects a resolved target");
    // A string has no `keys`, so the two shapes cannot collide.
    eq(typeof "housing".keys, "undefined", "probe: a string somehow has a keys field");
  }

  // AND WITH ROWS ON FILE, THE DESK READS THE RECORD OUT. Two reads are stubbed —
  // the issue lane's own slice read, which is how a field is DISCOVERED, and that
  // member's whole record, which is what the formal-pattern index characterises.
  // Both matter and they are not the same read: the slice read deliberately never
  // warms PDXVotingRecord._records, so a desk that only did the first one would
  // discover a person and then have nothing to say about them. What is proved here
  // is the desk's behaviour given roll-call evidence on this key: it prints that
  // person, in the INDEX's words, and not an empty. Everything between the two
  // stubs and the markup is shipped code.
  {
    const ACT = {
      measureId: "hjres131-119", number: "H.J.Res. 131", title: "A resolution",
      chamber: "senate", position: "Yea", date: "2025-05-01", kind: "vote",
      issues: [{ issueKey: "lands_preserve" }],
    };
    const s = boot({
      session: { pdx_d1_mode: "issue" },
      records: () => Promise.resolve({ byPid: { lee: [ACT] } }),
      beforeDesk: (w) => {
        // The whole record, seeded the way a completed /api/voting-record read
        // leaves it. Without this the row is honestly COLD rather than empty —
        // which the next block checks — and the index has no file to read.
        try { w.PDXVotingRecord.noteMember("lee", [ACT]); } catch { /* not a member surface */ }
      },
    });
    s.pdxDoor1Issue("lands_preserve");
    await new Promise((r) => setTimeout(r, 40));
    const listed = paint(s);
    has(listed, "d1-led-census",
      "with roll-call rows on file the desk printed no ledger — the fix to the\n" +
      "    resolver alone does not open the issue if the record is never asked for");
    has(listed, 'href="/p/lee"', "the row on file is not attributed to the member who holds it");
    has(listed, 'data-pdxst-dos="lands_preserve"',
      "the row does not open that member's own acts on this key");
    // The characterisation is the index's, not this desk's and not this file's.
    const x = s.PDXConsistency.formalPatternIndex.rowFor("lee", "lands_preserve");
    must(x, "the formal-pattern index publishes no row for a member with an act on this key");
    has(listed, x.patLabel, "the printed chip is not the formal-pattern index's own label");
    const band = s.PDXConsistency.formalPatternIndex.band(x);
    has(listed, "is-" + band, `the row was not filed in the ${band} band the index puts it in`);
    no(listed, s.PDXConsistency.menu.PHRASES.no_vehicle.note,
      "the desk printed the record lane's no-vehicle sentence over a record it was holding");
    // Nothing was invented to fill the row: no figure, and no caucus token outside
    // the office's own name (see the office carve-out in test-door-one-workspace).
    no(listed, "%", "a percentage arrived with the ledger");
    const noOffice = listed.replace(/<span class="d1-led-o">[\s\S]*?<\/span>/g, "");
    for (const tok of ["Republican", "(R)", "Democrat"]) {
      no(noOffice, tok, `the ledger prints "${tok}"`);
    }
  }

  // AND A ROW WHOSE FULL RECORD IS NOT IN YET SAYS SO. The slice read found the
  // person; their file has not landed. That is not an empty record and must not be
  // painted as one — the pane says it is still reading.
  {
    const s = boot({
      session: { pdx_d1_mode: "issue" },
      records: () => Promise.resolve({
        byPid: {
          lee: [{ measureId: "hjres131-119", number: "H.J.Res. 131", title: "A resolution",
                  chamber: "senate", position: "Yea", date: "2025-05-01", kind: "vote",
                  issues: [{ issueKey: "lands_preserve" }] }],
        },
      }),
    });
    s.pdxDoor1Issue("lands_preserve");
    await new Promise((r) => setTimeout(r, 40));
    const cold = paint(s);
    no(cold, s.PDXConsistency.menu.PHRASES.no_vehicle.note,
      "a person whose full record has not arrived was painted as a record that holds nothing");
    has(cold, "Reading the roll-call record", "the pane does not say it is still reading");
  }

  // AND THE NO-VEHICLE SENTENCE IS STILL THERE FOR A REAL EMPTY. Removing a false
  // empty must not remove the true one: a read that comes back with nothing is a
  // fact about the calendar, and the floor's own sentence is what says so.
  {
    const s = boot({
      session: { pdx_d1_mode: "issue" },
      records: () => Promise.resolve(null),
    });
    s.pdxDoor1Issue("lands_preserve");
    await new Promise((r) => setTimeout(r, 40));
    const empty = paint(s);
    has(empty, s.PDXConsistency.menu.PHRASES.no_vehicle.note,
      "an issue with genuinely no readable row lost the floor's own honest empty");
    no(empty, 'class="d1-people"', "the desk listed people out of an empty record");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · No floor moved");

{
  // THE WALLS, ON PAINTED MARKUP — desk and stubs together, every mode.
  let ALL = "";
  for (const mode of ["claim", "person", "issue", "measure"]) {
    const w = boot({ session: { pdx_d1_mode: mode, pdx_d1_issue: "lands_preserve" } });
    ALL += paint(w);
    for (const id of SURFACES) ALL += stripOf(w, id);
  }
  must(ALL.length > 4000, `the sweep painted almost nothing (${ALL.length} chars)`);
  for (const tok of ["Republican", "Democrat", "GOP", "partisan", "(R)", "(D)"]) {
    no(ALL, tok, `the desk or a stub prints "${tok}" — party is not a group, a sort or a mark`);
  }
  no(ALL, "%", "a percentage reached the desk or a stub");
  for (const tok of ["Direction Match", "consistency score", "grade", "Mandate"]) {
    no(ALL, tok, `"${tok}" reached Door 1's chrome`);
  }
  // AND AT SOURCE: the engines this file must not read.
  for (const tok of ["_calcAlignment", "scopedOverall", "_msPriorityWeight",
    "PDXFinance", "PDXMandate", "PublicationFloor", "MIN_CITED_POSITIONS"]) {
    no(DESK, tok, `the desk reads ${tok}`);
  }
  // The stylesheet is checked for PRINTED copy, not for units: `100%` is a width and
  // `46%` is a gradient stop. A figure would have to arrive through content:.
  ok(!/content:\s*["'][^"']*%/.test(CSS),
    "the stylesheet prints a percentage through content: — the collapse is not a meter");

  // THE FLOOR AND THE SLICE SENTENCE ARE WHERE THEY WERE.
  has(R("word-action.js"), "not a career score.",
    "the slice sentence moved out of word-action.js");
  has(R("word-action.js"), "var SLICE_CUTOFF = 32;",
    "the slice gate's cutoff moved");

  // TWIN BOOT. The desk wraps shipped globals and collapses shipped sections;
  // neither may change a single byte of any brief or any Direction Match read.
  const withDesk = boot();
  const without = boot({ withoutDesk: true });
  must(withDesk.PDXWordAction && typeof withDesk.PDXWordAction.heroHtml === "function",
    "the brief renderer is not reachable — the twin boot would prove nothing");
  let swept = 0;
  for (const pid of ["lee", "curtis", "bmoore", "aaron_bean"]) {
    const a = (() => { try { return without.PDXWordAction.heroHtml(pid); } catch { return "ERR"; } })();
    const b = (() => { try { return withDesk.PDXWordAction.heroHtml(pid); } catch { return "ERR"; } })();
    must(a !== "ERR", `the brief for ${pid} could not be rendered at all`);
    eq(b, a, `${pid}'s formal brief changed when the Door 1 desk was on the page`);
    swept++;
    for (const scope of ["", "economy_cost_of_living", "climate_energy", "lands_preserve"]) {
      const f = (w) => {
        try { return JSON.stringify(w.PDXConsistency.scopedOverall(pid, scope || null)); }
        catch { return "ERR"; }
      };
      eq(f(withDesk), f(without),
        `${pid}'s Direction Match read on "${scope || "all"}" changed with the desk loaded`);
    }
  }
  console.log(`      ${swept} briefs and ${swept * 4} scoped reads: no drift with the desk on the page`);
  // And the four sections the desk collapsed are untouched files.
  for (const f of ["hero-receipt.js", "hr1-showcase.js", "issue-view.js", "say-vs-do.js",
    "publication-floor.js", "person-file.js"]) {
    no(R(f), "door1-workspace", `${f} was made to know about the desk that collapses it`);
    no(R(f), "PDXDoor1", `${f} was made to depend on the desk`);
  }
}

if (failures.length) {
  console.error(`\n✗ door one collapse: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error(`   · ${f}`);
  process.exit(1);
}
console.log(`\n✓ door one collapse: all ${passed} assertions passed — 4 stubs, 1 desk, 0 stranded products\n`);
