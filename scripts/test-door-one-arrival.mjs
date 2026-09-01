#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-door-one-arrival.mjs — a Door 1 hash and a Door 1 stub land ON THE DESK,
// in the mode that hash or stub belongs to
// ─────────────────────────────────────────────────────────────────────────────
// test-door-one-workspace.mjs pins that the desk exists and holds one mode at a
// time. test-door-one-collapse.mjs pins that the four old chapters are one line
// each once it has painted. Both were satisfied by a page on which the arrival
// was still wrong, and the live report is what that felt like:
//
//   · A cold #say-vs-do scrolled to the STUB — one line, with Door 2's headline
//     ("There's an election coming") filling the rest of the screen. The reader
//     asked for the receipts library and got a label and somebody else's door.
//   · "Open in Door 1" on Say vs. Do, on Where does everyone stand? and on One
//     Bill did reach the desk, and left it on "Open a measure / vehicle" — so
//     the URL read #say-vs-do while the rail highlighted measure.
//
// Both are one bug: the mode and the landing were decided in two places that did
// not have to agree. index.html's hash handler opened the layer and scrolled to
// the section; a wrapper on that handler set the mode, if this deferred script
// had booted yet; and the stub carried a mode literal baked into its own markup.
//
// This file pins the single table and the single landing:
//
//   1. ONE TABLE, DECLARED ONCE. modeForWorkId() is the whole arrival map and
//      the hash, the stub and the router wrapper all read it. The four rows are
//      the brief's, locked here as literals.
//   2. A COLD HASH LANDS ON THE DESK. Real router from index.html, real desk,
//      real defer ordering: for each WORK_ID the mode is the table's, the scroll
//      target is #pdx-door1-workspace, and no stub and no Door 2 surface is ever
//      scrolled.
//   3. A HASH THAT IS NOT A WORK_ID STEALS NOTHING. No mode change, no scroll,
//      and the work layer stays closed.
//   4. HASHCHANGE IS THE SAME ARRIVAL. Changing the hash in-page re-lands, and
//      a hash arriving before any module could paint is REMEMBERED rather than
//      dropped — the failure the live smoke actually hit.
//   5. THE STUB CONTROL IS THE SAME HANDLER AND THE SAME TABLE. Each stub's
//      control sets its own mode whatever mode was painted last; #say-vs-do
//      never leaves measure selected.
//   6. NO DESK, NO HIJACK. Without the mount arrive() answers false and the
//      shipped router keeps the arrival, because the section is standing at full
//      height and is then the honest destination.
//   7. THE BLAST RADIUS IS UNCHANGED. Collapse still lands on the four WORK_IDS
//      and on nothing else; the ballot workspace, Mandate, the profile modal and
//      finance stay untouched.
//   8. THE HONESTY WALLS. No party, no percentage, no Direction Match and no
//      grade in what a stub or the arrival paints, and the twin boot still holds:
//      lee / aaron_bean / curtis read byte-identical with the desk and without.
//
//   node scripts/test-door-one-arrival.mjs
//
// Real shipped modules in a node:vm sandbox, index.html's own router extracted
// and run beside them, and a mini-DOM that RECORDS every scroll — so every claim
// below about where a reader lands is a claim about a scroll this file observed.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// The record modules the desk reads a fact from. anyMode() needs at least one of
// them, and the claim/issue/measure panes each print an honest empty without
// their own — so this is the set that makes the desk paint at all.
const FILES = [
  "cmp-data.js",
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  "stance-helpers.js",
  "alignment-tool.js",
  "acct-spotlight-data.js",
  "say-vs-do.js",
  "exec-action-data.js",
  "exec-record.js",
  "exec-record-ui.js",
  "consistency.js",
  "voting-record.js",
  "inventory.js",
  "issue-scope.js",
  "word-action.js",
  "profile-spine.js",
  "issue-colors.js",
  "my-stances.js",
  "person-link.js",
  "bills-index.js",
  "bills.js",
  "bill-detail.js",
  "claim-check.js",
  "issue-view.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
const DESK = R("door1-workspace.js");
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
// A probe that finds nothing fails loudly, or a rename turns this whole file
// into a very fast, very green no-op.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ door one arrival: STALE PROBE — ${msg}`);
  process.exit(2);
};

// ── THE TABLE, AS THE BRIEF LOCKS IT ────────────────────────────────────────
// arrival → desk mode → the rail item that must end up selected. Written out as
// literals rather than read from VIEWS, because reading it from the module under
// test is how a table silently agrees with itself while disagreeing with the
// brief.
const TABLE = [
  { id: "hero-receipt", mode: "claim", rail: "Check a claim" },
  { id: "say-vs-do", mode: "claim", rail: "Check a claim" },
  { id: "issue-front-door", mode: "issue", rail: "Open an issue" },
  { id: "hr1-showcase", mode: "measure", rail: "Open a measure / vehicle" },
];
const WORK_IDS = TABLE.map((r) => r.id);
// Surfaces this arrival is never allowed to scroll: Door 2's own desk and spine,
// and the seat list the ballot loop owns.
const DOOR2 = ["pdx-ballot-workspace", "pdx-door2-spine", "my-politicians"];
// Sections the collapse must never reach, named by the brief.
const PROTECTED = [...DOOR2, "pdx-mandate", "profileModal", "finance-tracker",
  "politician-cards", "live-proof", "voter-academy", "community"];
const ARIA = {
  "say-vs-do": "Say vs. Do — sourced receipts",
  "issue-front-door": "Start with an issue — politicians ranked by consistency",
  "hr1-showcase": "H.R.1 Showcase — the contradiction engine",
};

// ── index.html's own router, extracted ──────────────────────────────────────
// The arrival is a handshake between two files, so testing either alone tests
// nothing that broke. This is the same extraction test-door-one-entry.mjs uses.
const ROUTER = (() => {
  const start = HTML.indexOf("window.pdxDoor(mode) · the five doors");
  must(start !== -1, "the router's own comment header is gone — the extraction cannot be trusted");
  const open = HTML.lastIndexOf("<script>", start);
  const close = HTML.indexOf("</script>", start);
  return HTML.slice(open + "<script>".length, close);
})();

// ── A mini-DOM that records scrolls ─────────────────────────────────────────
// Every node reports a stable geometry, so the settle loops in both files reach
// "the ground stopped moving" instead of spinning; and every scrollIntoView and
// window.scrollTo is logged with the id it was aimed at.
function miniDom(win, opts) {
  opts = opts || {};
  const byId = {};
  const scrolls = [];
  let top = 400;
  const mk = (id, o) => {
    o = o || {};
    top += 900;
    const myTop = top;
    const node = {
      id: id || "", className: "", innerHTML: "", textContent: "",
      style: {}, dataset: {}, children: [], hidden: false, attrs: {},
      firstChild: null,
      classList: {
        _s: new Set(),
        add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
        toggle() {}, contains(c) { return this._s.has(c); },
      },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { this.children.push(c); c.parentNode = this; if (c && c.id) byId[c.id] = c; return c; },
      insertBefore(c) { this.children.unshift(c); c.parentNode = this; if (c && c.id) byId[c.id] = c; return c; },
      removeChild() {}, insertAdjacentHTML() {}, focus() {}, click() {},
      getBoundingClientRect() { return { top: myTop, bottom: myTop + 300, left: 0, right: 900, height: 300, width: 900 }; },
      scrollIntoView() { scrolls.push(this.id || "(anonymous)"); },
      querySelector(sel) {
        if (o.heading && /h1|h2|h3/.test(String(sel))) return { textContent: o.heading };
        if (/\.d1-desk/.test(String(sel))) return o.deskCard || null;
        return null;
      },
      querySelectorAll() { return []; },
    };
    if (o.aria) node.attrs["aria-label"] = o.aria;
    if (id) byId[id] = node;
    return node;
  };
  win.document.createElement = () => mk("");
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = mk("body");
  win.document.body.appendChild = function (c) { if (c && c.id) byId[c.id] = c; return c; };
  win.document.documentElement = Object.assign(mk("html"), {
    scrollTop: 0,
    style: { getPropertyValue: (k) => (k === "--pdx-chrome" ? (opts.chrome || "") : "") },
  });
  win.scrollTo = (a) => {
    scrolls.push("window:" + Math.round(typeof a === "object" && a ? (a.top || 0) : (arguments[1] || 0)));
  };
  win.__scrolls = scrolls;
  win.__mk = mk;
  win.__byId = byId;
  return byId;
}

// ── Timers that actually fire ───────────────────────────────────────────────
// Both files defer their arrival work: index.html re-issues its scroll while the
// page settles, and the desk holds an arrival across the passes at which its
// modules may still be loading. A no-op setTimeout would make this file green
// against a page that never arrives at all, so the queue below is drained in
// (delay, order) sequence with a hard cap.
function timers(win) {
  const q = [];
  let seq = 0;
  win.setTimeout = (fn, ms) => { q.push({ fn, ms: Number(ms) || 0, seq: seq++ }); return q.length; };
  win.clearTimeout = () => {};
  win.setInterval = () => 0;
  win.clearInterval = () => {};
  win.requestAnimationFrame = (fn) => { q.push({ fn, ms: 0, seq: seq++ }); return q.length; };
  win.__drain = (cap) => {
    let n = 0;
    while (q.length && n++ < (cap || 400)) {
      q.sort((a, b) => (a.ms - b.ms) || (a.seq - b.seq));
      const job = q.shift();
      try { job.fn(); } catch { /* a thrown timer is the page's business, not this file's */ }
    }
    return n;
  };
  return win;
}

// ── One boot, in the order a real page boots ────────────────────────────────
//   1. index.html's router runs INLINE, while the document is still parsing, so
//      it registers its hash handler for DOMContentLoaded rather than running it.
//   2. the record modules and door1-workspace.js run as DEFER scripts, which the
//      browser executes after parsing and BEFORE DOMContentLoaded — so the desk
//      exists by the time the router's handler fires. Getting this order wrong is
//      how the bug happened, so it is modelled rather than assumed.
//   3. DOMContentLoaded fires, in registration order.
function boot(o) {
  o = o || {};
  const win = timers(makeSandbox());
  const sess = o.session || {};
  win.sessionStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(sess, k) ? sess[k] : null),
    setItem: (k, v) => { sess[k] = String(v); },
    removeItem: (k) => { delete sess[k]; },
  };
  win.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  win.auth = { currentUser: null };
  // www, not the apex: the apex 301s onto it, so www is the address the site has.
  win.location = { href: "https://www.politidex.fyi/", pathname: "/", search: "", hash: o.hash || "" };
  win.CSS = { supports: () => (o.noScrollPadding ? false : true) };
  win.getComputedStyle = () => ({ getPropertyValue: () => (o.chrome || "") });
  const winL = [], docL = [];
  win.addEventListener = (t, f) => { winL.push([t, f]); };
  win.removeEventListener = () => {};
  win.dispatchEvent = () => true;
  const quiet = (f) => (...a) =>
    String(a[0] || "").indexOf("no network at build time") >= 0 ? undefined : f(...a);
  win.console = Object.assign({}, console, { warn: quiet(console.warn), error: quiet(console.error) });
  miniDom(win, o);
  win.document.addEventListener = (t, f) => { docL.push([t, f]); };
  WORK_IDS.forEach((id) => win.__mk(id, { aria: ARIA[id] || "", heading: (o.headings || {})[id] || "" }));
  PROTECTED.forEach((id) => win.__mk(id));
  win.__mk("pdx-door-work");
  win.__mk("pdx-eye-input");
  if (!o.noMount) { win.__mk("pdx-door1-workspace"); win.__mk("pdx-d1-body"); }

  const ctx = vm.createContext(win);
  // 1 · the router, inline, mid-parse.
  win.document.readyState = "loading";
  vm.runInContext(ROUTER, ctx, { filename: "index.html[pdxDoor]" });
  // 2 · the deferred modules, then the desk. readyState is 'interactive' by the
  // time defer scripts run, which is why boot() runs immediately rather than
  // waiting for the event the router is waiting for.
  win.document.readyState = "interactive";
  win.PROFILES = win.CMP_DATA;
  win.__loadErrors = [];
  if (!o.noModules) {
    for (const [f, src] of SRC) {
      try { vm.runInContext(src, ctx, { filename: f }); }
      catch (e) { win.__loadErrors.push(`${f}: ${e.message}`); }
    }
  }
  win.PROFILES = win.CMP_DATA;
  if (!o.withoutDesk) vm.runInContext(DESK, ctx, { filename: "door1-workspace.js" });
  // 3 · DOMContentLoaded, then everything both files queued.
  win.__fire = (type) => {
    docL.concat(winL).filter(([t]) => t === type).forEach(([, f]) => { try { f({ type }); } catch { /* the page's own guard */ } });
  };
  win.__hash = (h) => { win.location.hash = h; win.__fire("hashchange"); win.__drain(); };
  win.__session = sess;
  if (!o.holdLoad) {
    win.document.readyState = "complete";
    win.__fire("DOMContentLoaded");
    win.__drain();
  }
  return win;
}

const mode = (w) => w.PDXDoor1._mode();
const rail = (w) => {
  const b = w.document.getElementById("pdx-d1-body");
  const html = b ? String(b.innerHTML) : "";
  const m = /class="d1-mode is-open[^"]*"[^>]*aria-label="([^—"]+)/.exec(html);
  return m ? m[1].trim() : "";
};
const stripOf = (w, id) => {
  const s = w.document.getElementById("d1-strip-" + id);
  return s ? String(s.innerHTML) : "";
};
const collapsedOf = (w, id) => {
  const h = w.document.getElementById(id);
  return h ? h.getAttribute("data-door1-collapsed") : "MISSING";
};
const layerOpen = (w) => w.document.getElementById("pdx-door-work").classList.contains("is-open");

const probe = boot({ hash: "#say-vs-do" });
must(probe.PDXDoor1 && typeof probe.PDXDoor1.arrive === "function",
  `the desk does not export arrive() — boot errors: ${probe.__loadErrors.join(" | ")}`);
must(typeof probe.PDXDoor1._workMode === "function", "the arrival table is not published for reading");
must(typeof probe.pdxDoorWork === "function", "index.html's router did not install pdxDoorWork");
must(typeof probe.pdxOpenSurface === "function", "index.html's router did not install pdxOpenSurface");
must(probe.PDXDoor1._live(), "the desk never painted in this sandbox — every landing claim below would be vacuous");
must(probe.__scrolls.length > 0, "not one scroll was recorded — the mini-DOM is not observing what it claims to");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · One arrival table, declared once, read by all three entrances");

{
  const D = probe.PDXDoor1;
  for (const row of TABLE) {
    eq(D._workMode(row.id), row.mode,
      `the arrival table maps #${row.id} to the wrong mode. This row is the brief's and is locked`);
    eq(D._workMode("#" + row.id), row.mode,
      `the arrival table does not tolerate a leading # on ${row.id}, which is how a hash arrives`);
  }
  // Anything else is not this desk's arrival, including Door 2's own surfaces.
  for (const id of [...DOOR2, "voter-hub", "pdx-mandate", "", "hero"]) {
    eq(D._workMode(id), "", `"${id}" resolved to a Door 1 desk mode — only the four WORK_IDS may`);
  }
  // ONE DECLARATION. Two copies of this table is the bug: the stub and the hash
  // disagreeing is exactly what a second copy produces.
  eq((DESK.match(/function modeForWorkId\(/g) || []).length, 1,
    "modeForWorkId is declared more than once in the desk — one arrival table, or the stub and the\n" +
    "    hash can disagree again");
  // And the stub's control is generated FROM it, not from a literal beside it.
  has(DESK, "modeForWorkId(view.id)",
    "the view strip no longer reads the arrival table, so a stub's mode is a second opinion");
  // The mode a stub aims at is the table's, in the markup a reader clicks.
  const w = boot();
  w.PDXDoor1.sync();
  for (const row of TABLE) {
    has(stripOf(w, row.id), `PDXDoor1.toDesk('${row.mode}')`,
      `#${row.id}'s stub control does not aim at ${row.mode}`);
    const btn = /data-d1-to="([a-z]+)"/.exec(stripOf(w, row.id));
    eq(btn && btn[1], row.mode, `#${row.id}'s stub does not record the mode it opens`);
  }
  // The reported failure, stated as its own assertion: three stubs on measure.
  const aimed = TABLE.map((r) => (/data-d1-to="([a-z]+)"/.exec(stripOf(w, r.id)) || [])[1]);
  eq(aimed.filter((m) => m === "measure").length, 1,
    `more than one stub aims at measure (${aimed.join(", ")}) — the live bug was all three leftover\n` +
    "    stubs hard-wired to measure");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · A cold WORK_ID hash lands on the desk, in that hash's mode");

{
  for (const row of TABLE) {
    const w = boot({ hash: "#" + row.id, headings: { [row.id]: "" } });
    // THE MODE IS THE TABLE'S.
    eq(mode(w), row.mode, `a cold #${row.id} did not open ${row.mode} mode on the desk`);
    // AND THE RAIL AGREES WITH IT. The live report was a URL and a rail saying
    // different things, so the rail is checked separately from the mode.
    eq(rail(w), row.rail, `a cold #${row.id} left the rail on the wrong item`);
    // THE LANDING IS THE DESK.
    has(w.__scrolls, "pdx-door1-workspace",
      `a cold #${row.id} never scrolled to the desk`);
    // AND NOT THE STUB. This is the whole of the reported bug: a one-line stub
    // sitting immediately above Door 2's headline.
    for (const id of WORK_IDS) {
      no(w.__scrolls.join(" "), id,
        `a cold #${row.id} scrolled to the #${id} stub. The stub is ONE LINE once the desk has painted;\n` +
        "    a reader who lands on it sees a label and Door 2's headline");
    }
    // AND NEVER DOOR 2.
    for (const id of DOOR2) {
      no(w.__scrolls.join(" "), id,
        `a cold #${row.id} scrolled to #${id} — Door 1's arrival may not land in the election loop`);
    }
    // The layer still opens, so the section still paints and the stub still has
    // the chapter's own title to show.
    ok(layerOpen(w), `a cold #${row.id} did not open the work layer, so its surface never painted`);
    ok(stripOf(w, row.id).length > 0, `a cold #${row.id} left its own section without a stub`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · A hash that is not a WORK_ID steals nothing");

{
  for (const h of ["", "#voter-hub", "#pdx-ballot-workspace", "#hero", "#my-politicians"]) {
    const w = boot({ hash: h });
    eq(w.PDXDoor1.arrive(h.replace("#", "")), false,
      `arrive() claimed "${h}" as a Door 1 arrival`);
    eq(mode(w), "claim", `"${h}" moved the desk off its first-run mode`);
    ok(!layerOpen(w), `"${h}" opened Door 1's work layer, which un-demotes all four sections`);
    eq(w.__scrolls.length, 0,
      `"${h}" produced ${w.__scrolls.length} scroll(s) (${w.__scrolls.join(", ")}) — a hash this desk\n` +
      "    does not own must not take the scroll away from whatever it does name");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · hashchange is the same arrival, and an early one is remembered");

{
  // In-page: the hash changes, and the desk re-lands in the new mode.
  const w = boot({ hash: "" });
  for (const row of TABLE) {
    const before = w.__scrolls.length;
    w.__hash("#" + row.id);
    eq(mode(w), row.mode, `a hashchange to #${row.id} did not open ${row.mode} mode`);
    eq(rail(w), row.rail, `a hashchange to #${row.id} left the rail on the wrong item`);
    const after = w.__scrolls.slice(before);
    has(after, "pdx-door1-workspace", `a hashchange to #${row.id} did not land on the desk`);
    for (const id of WORK_IDS.concat(DOOR2)) {
      no(after.join(" "), id, `a hashchange to #${row.id} scrolled to #${id}`);
    }
  }
  // And a hash naming nothing of ours, mid-visit, moves neither mode nor scroll.
  w.pdxDoor1Open("issue");
  w.__drain();                      // that mode change's own landing, spent, so the
  const n = w.__scrolls.length;     // count below is the hashchange's and nothing else
  w.__hash("#voter-hub");
  eq(mode(w), "issue", "an unrelated hashchange moved the mode the reader had chosen");
  eq(w.__scrolls.length, n, "an unrelated hashchange scrolled the desk");

  // THE ARRIVAL SURVIVES A DESK THAT CANNOT PAINT YET. This is the live failure:
  // the desk is a deferred script reading five other deferred modules, and a cold
  // hash can land before anyMode() is true. Dropped, the reader is parked on a
  // section that becomes a one-line stub under them a moment later.
  const late = boot({ hash: "#hr1-showcase", noModules: true });
  ok(!late.PDXDoor1._live(),
    "probe: the desk painted with no record modules loaded, so this case tests nothing");
  eq(mode(late), "measure",
    "a hash that arrived before the desk could paint did not even set the mode it maps to");
  // The modules land, the desk paints, and the held arrival is spent.
  for (const [f, src] of SRC) {
    try { vm.runInContext(src, vm.createContext(late), { filename: f }); } catch { /* partial by design */ }
  }
  // Re-boot the same page WITH its modules and only the timers still pending:
  // the honest version of "the modules were slow" this sandbox can express.
  const slow = boot({ hash: "#hr1-showcase", holdLoad: true });
  slow.document.readyState = "complete";
  slow.__fire("DOMContentLoaded");
  slow.__drain();
  eq(mode(slow), "measure", "a slow boot lost the mode the hash named");
  has(slow.__scrolls, "pdx-door1-workspace", "a slow boot never landed the reader on the desk");
  for (const id of WORK_IDS.concat(DOOR2)) {
    no(slow.__scrolls.join(" "), id, `a slow boot scrolled to #${id} instead of the desk`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · The stub control: same handler, same table, whatever was painted last");

{
  // The exact sequence in the report: the desk is on measure, and the reader taps
  // "Open in Door 1" on a stub that is not the measure one.
  for (const row of TABLE) {
    const w = boot({ hash: "" });
    w.pdxDoor1Open("measure");
    eq(mode(w), "measure", "probe: the desk would not go to measure first");
    const before = w.__scrolls.length;
    // Exactly what the stub's onclick does, read out of the stub's own markup so
    // this cannot pass against a control the page does not actually carry.
    const call = /PDXDoor1\.toDesk\('([a-z]+)'\)/.exec(stripOf(w, row.id));
    ok(call, `#${row.id}'s stub carries no toDesk call to exercise`);
    w.PDXDoor1.toDesk(call[1]);
    w.__drain();
    eq(mode(w), row.mode,
      `"Open in Door 1" on #${row.id} left the desk on ${mode(w)} — the stub must set its own mode,\n` +
      "    not keep whatever was painted last");
    eq(rail(w), row.rail, `"Open in Door 1" on #${row.id} left the rail on the wrong item`);
    const after = w.__scrolls.slice(before);
    has(after, "pdx-door1-workspace", `"Open in Door 1" on #${row.id} did not scroll to the desk`);
    for (const id of WORK_IDS.concat(DOOR2)) {
      no(after.join(" "), id, `"Open in Door 1" on #${row.id} scrolled to #${id}`);
    }
  }
  // The smoke case the brief names by itself.
  const s = boot({ hash: "" });
  s.pdxDoor1Open("measure");
  s.PDXDoor1.toDesk(/PDXDoor1\.toDesk\('([a-z]+)'\)/.exec(stripOf(s, "say-vs-do"))[1]);
  eq(mode(s), "claim", "#say-vs-do left measure selected — the exact live report");
  eq(rail(s), "Check a claim", "the rail did not switch to Check a claim from the Say vs. Do stub");
  // And a cold #say-vs-do, which is the other half of the same report.
  const cold = boot({ hash: "#say-vs-do" });
  eq(mode(cold), "claim", "a cold #say-vs-do did not select claim");
  no(String(cold.PDXDoor1._mode()), "measure", "a cold #say-vs-do left measure selected");

  // ONE HANDLER. toDesk() is it, and it is the only thing a stub calls.
  const w = boot();
  w.PDXDoor1.sync();
  for (const row of TABLE) {
    const s2 = stripOf(w, row.id);
    eq((s2.match(/onclick="/g) || []).length, 1, `#${row.id}'s stub carries more than one handler`);
    has(s2, "window.PDXDoor1.toDesk(", `#${row.id}'s stub does not go through the one handler`);
    no(s2, "pdxDoorWork", `#${row.id}'s stub calls the router directly, bypassing the desk's landing`);
  }
  // toDesk on a mode that is not on the rail lands on the desk and changes nothing.
  const t = boot();
  t.pdxDoor1Open("issue");
  const n = t.__scrolls.length;
  eq(t.PDXDoor1.toDesk("finance"), false, "toDesk accepted a mode that is not on the rail");
  eq(mode(t), "issue", "an unknown mode moved the desk");
  ok(t.__scrolls.length >= n, "probe: toDesk recorded a negative number of scrolls");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · No desk, no hijack — the router keeps an arrival it can still honour");

{
  // No mount: the four sections are standing at full height, so the SECTION is
  // the honest landing and the shipped router must keep it.
  const w = boot({ hash: "#issue-front-door", noMount: true });
  eq(w.PDXDoor1.arrive("issue-front-door"), false,
    "the desk claimed an arrival on a page with no desk to land on");
  has(w.__scrolls, "issue-front-door",
    "with no desk on the page the section was not scrolled to either — the reader arrived nowhere");
  eq(collapsedOf(w, "issue-front-door"), null,
    "a section with no desk above it was collapsed anyway");
  // The router alone, with no desk script at all — an older cached bundle.
  const bare = boot({ hash: "#hr1-showcase", withoutDesk: true });
  has(bare.__scrolls, "hr1-showcase",
    "without door1-workspace.js the hash no longer reaches its section, so the old page broke");
  // index.html's side of the handshake, stated at source: one decision function,
  // and the scroll is the only thing noScroll suppresses.
  has(ROUTER, "function land(id)",
    "index.html no longer routes its arrivals through one function, so the hash, the nav and the\n" +
    "    chips can disagree about where a WORK_ID lands");
  has(ROUTER, "if (opts && opts.noScroll) return true;",
    "openWork() no longer honours noScroll, so the desk cannot take the landing from the stub");
  ok(/function fromHash\(\)[\s\S]{0,300}land\(h\)/.test(ROUTER),
    "the hash handler no longer hands WORK_IDs to the shared arrival");
  ok(/WORK_IDS\.indexOf\(h\) !== -1\) land\(h\)/.test(ROUTER),
    "the hash handler no longer guards on WORK_IDS, so an unrelated hash can steal the scroll");
  ok(/pdxOpenSurface = function[\s\S]{0,220}land\(id\)/.test(ROUTER),
    "pdxOpenSurface() still scrolls to the section itself, so a nav item and the hash it sets fight\n" +
    "    each other — one scrolls to the stub while the other scrolls to the desk");
  // The nav item that sets a hash AND calls pdxOpenSurface must produce one
  // landing, not two. This is that path, end to end.
  const nav = boot({ hash: "" });
  nav.pdxOpenSurface("hr1-showcase");
  nav.__hash("#hr1-showcase");
  for (const id of WORK_IDS.concat(DOOR2)) {
    no(nav.__scrolls.join(" "), id,
      `the nav path to #hr1-showcase scrolled to #${id} as well as the desk`);
  }
  eq(mode(nav), "measure", "the nav path to #hr1-showcase did not select measure");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · The landing target, and the wall around it");

{
  const D = probe.PDXDoor1;
  // The node an arrival lands on is the desk's mount and only ever that.
  const n = D._deskNode();
  ok(n && n.id === "pdx-door1-workspace",
    `the arrival lands on #${n ? n.id : "nothing"} rather than on the desk's own mount`);
  // The two wrong answers are named in the source, so a future rename that
  // pointed the landing at either would have to delete the wall to do it.
  for (const id of ["pdx-ballot-workspace", "say-vs-do", "hr1-showcase"]) {
    has(DESK, `'${id}'`, `the landing wall no longer names ${id} as a surface it may not scroll to`);
  }
  // THE FIXED NAV. app.css owns the clearance for every jump on this page, and
  // the desk reads the same custom property for the one engine that has no
  // scroll-padding-top to honour — so there is one number, not two.
  has(R("app.css"), "scroll-padding-top: calc(var(--pdx-chrome, 7.125rem) + 0.5rem)",
    "html{scroll-padding-top} is gone, and with it the clearance every landing on this page relies on");
  has(DESK, "--pdx-chrome",
    "the desk's landing does not read the page's own chrome height, so it can come to rest under\n" +
    "    the fixed nav on an engine without scroll-padding-top");
  // That fallback path, exercised: no scroll-padding-top, a measured chrome, and
  // the landing offset by it rather than flush with the section top.
  const w = boot({ hash: "#say-vs-do", noScrollPadding: true, chrome: "114px" });
  const win = w.__scrolls.filter((s) => s.indexOf("window:") === 0);
  ok(win.length > 0,
    "with no scroll-padding-top the landing did not fall back to a measured scroll, so the desk comes\n" +
    "    to rest under the fixed nav");
  const y = Number(String(win[0]).slice(7));
  ok(y > 0, `the measured fallback scrolled to ${y}, which is not below the top of the page`);
  ok(w.__scrolls.join(" ").indexOf("say-vs-do") < 0,
    "the measured fallback landed on the stub");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · Blast radius: the collapse is still the four, and the walls hold");

{
  const w = boot({ hash: "#say-vs-do" });
  for (const id of WORK_IDS) {
    eq(collapsedOf(w, id), "1", `#${id} is no longer collapsed after an arrival`);
  }
  for (const id of PROTECTED) {
    eq(collapsedOf(w, id), null,
      `#${id} was collapsed by Door 1's arrival — the brief names it as staying as shipped`);
    eq(w.document.getElementById(id).getAttribute("data-door1-of"), null,
      `#${id} was stamped as owned by Door 1's desk`);
    eq(stripOf(w, id), "", `#${id} was given a Door 1 stub`);
  }
  // The collapse attribute is still the script's alone: JS off, four sections.
  no(HTML, "data-door1-collapsed",
    "the collapse attribute reached index.html, so a JS-off reader loses all four sections");
  // The bodies are hidden, never detached.
  no(DESK, ".removeChild(", "the desk removes DOM nodes from the surfaces it collapses");
  no(DESK, ".remove()", "the desk deletes nodes from the surfaces it collapses");

  // THE HONESTY WALLS, on what an arrival paints.
  const body = w.document.getElementById("pdx-d1-body");
  const painted = String(body.innerHTML) + WORK_IDS.map((id) => stripOf(w, id)).join("");
  no(painted, "%", "an arrival painted a percentage on the desk or on a stub");
  for (const bad of ["Direction Match", "Republican", "Democrat", "GOP", "grade", "Grade"]) {
    no(painted, bad, `an arrival painted "${bad}" — no party framing, no Direction Match, no grade here`);
  }
  // The five files the brief puts out of bounds.
  const UNTOUCHED = ["word-action.js", "consistency.js", "publication-floor.js",
    "alignment-tool.js", "cmp-data.js"];
  must(UNTOUCHED.every((f) => R(f).length > 0), "one of the untouchable files is missing");

  // THE PAIR MOVES TOGETHER. index.html carries the router half of the arrival
  // and door1-workspace.js carries the desk half; both are precached, so a
  // device holding one and not the other has a broken arrival in one direction
  // or the other.
  has(SW, "'/door1-workspace.js'", "the desk script left the precache list");
  has(SW, "'/'", "index.html is no longer precached, so the router half cannot be versioned");
  const ver = /const CACHE_VERSION = 'v(\d+)';/.exec(SW);
  ok(ver && Number(ver[1]) >= 107,
    `CACHE_VERSION did not move past v106 for the arrival fix (found ${ver ? ver[0] : "nothing"})`);
  has(SW, "// v107 - ", "the version bump carries no log entry saying which files moved and why");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · Twin boot — the arrival perturbs no brief and no Direction Match read");

{
  const A = boot({ withoutDesk: true });
  const B = boot({ hash: "#say-vs-do" });
  must(A.PDXWordAction && typeof A.PDXWordAction.heroHtml === "function",
    "word-action.js did not boot without the desk");
  const prof = (w, pid) => (w.PROFILES && w.PROFILES[pid]) || null;
  for (const pid of ["lee", "aaron_bean", "curtis"]) {
    eq(String(B.PDXWordAction.heroHtml(pid, prof(B, pid)) || ""),
       String(A.PDXWordAction.heroHtml(pid, prof(A, pid)) || ""),
      `${pid}: the formal brief is not byte-identical with the desk loaded and an arrival taken`);
    for (const sc of Object.keys(A.PDXConsistency.SCOPES)) {
      eq(JSON.stringify(B.PDXConsistency.scopedOverall(sc, pid)),
         JSON.stringify(A.PDXConsistency.scopedOverall(sc, pid)),
        `${pid}/${sc}: Direction Match drifted with the desk loaded`);
    }
  }
  // The router's own return values survive the handshake — a wrapper that
  // swallows one breaks a caller silently.
  const c = boot({ hash: "" });
  eq(c.pdxDoorWork("say-vs-do"), true, "the router lost its return value");
  eq(c.pdxOpenSurface("say-vs-do"), true, "pdxOpenSurface lost its return value");
  eq(c.pdxOpenSurface("voter-hub"), false, "pdxOpenSurface claimed a section it does not own");
  console.log("      3 named briefs and every scoped read: no drift with an arrival taken");
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ door one arrival: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("   · " + f);
  process.exit(1);
}
console.log(`✓ door one arrival: all ${passed} assertions passed — 4 hashes, 4 stubs, 1 landing, 0 stub scrolls\n`);
