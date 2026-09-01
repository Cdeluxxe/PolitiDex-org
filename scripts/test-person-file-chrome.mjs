#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-person-file-chrome.mjs — stop lying during load, keep the tab on the
// person you opened
// ─────────────────────────────────────────────────────────────────────────────
// Three things a cold /p/<pid> did wrong, all of them chrome, all of them the
// same failure mode: a surface answered a question before it had the answer, and
// the answer it invented was worse than silence.
//
//   1. THE TOAST THAT CALLED A MEMBER WE CARRY UNKNOWN. /p/aaron_bean painted
//      the edge's crawl brief — his name, his seat, his formal record — then
//      raised "aaron_bean isn't someone we currently carry a record for", and
//      then opened his file. Three surfaces, two of them true. The sentence is a
//      claim about the ROSTER, and the roster was still arriving.
//   2. THE TAB THAT STAYED ON THE LAST PERSON. A person file is a modal, so
//      nothing in the browser chrome moved when one opened over another: opening
//      Hyde-Smith out of a Lee session left the tab, the window list and the
//      breadcrumb all saying Mike Lee.
//   3. THE CARD THAT CALLED A FORMAL RECORD EMPTY. Under a letterhead reading
//      "11 issues · 23 acts · 3 characterized", the mid-page card said "VIEW
//      FULL RECORD — STILL BEING BUILT" and the Official Record strip said "No
//      qualifying votes on record yet". Both were reading the same record; only
//      one of them was reading it after it arrived.
//
// What must stay true:
//
//   1. SILENCE BEATS A GUESS. The unknown-pid notice fires only once the arrival
//      wait has actually ended, and never while a roster holds the row.
//   2. IT STILL FIRES. A genuinely unknown slug still gets the honest answer
//      after the wait — the fix is a gate, not a mute.
//   3. THE TAB FOLLOWS THE FILE. adopt()/open() name the person; close returns
//      the front page's own wording. One helper, both ends.
//   4. "STILL BEING BUILT" IS A FINDING, SO IT NEEDS THE RECORD. A file with
//      acts on file and no cited position never renders the empty-record copy.
//   5. THE EMPTY OFFICIAL RECORD NAMES THE MISSING WORD. Not missing votes.
//   6. NO FLOOR MOVED. MIN_CITED_POSITIONS is still 2, in one file, and nobody
//      was marked publishable by hand.
//
//   node scripts/test-person-file-chrome.mjs
//
// No database, no network, no DOM library. Exit code is non-zero on failure.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
// Comments stripped, so a claim asserted here has to be made by CODE. Every
// argument in this repo is written in the comments, and none of them execute.
const CODE = (f) => R(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) { passed++; return true; } failures.push(m); return false; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const lacks = (h, n, m) => ok(!String(h).includes(n), `${m} — found ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ person-file chrome: STALE HARNESS — ${m}`); process.exit(2); };

const PF_SRC = R("person-file.js");

// ─────────────────────────────────────────────────────────────────────────────
// The harness: person-file.js in a sandbox, on a clock we own
// ─────────────────────────────────────────────────────────────────────────────
// The arrival path is a retry loop, so a fake clock is not a convenience here —
// it is the only way to say "600ms passed, the roster is still loading" and then
// assert on what the module had said by then. Timers queue; tick() drains them.
function makeClock() {
  let now = 0, seq = 0;
  const q = [];
  return {
    now: () => now,
    setTimeout(f, ms) { const id = ++seq; q.push({ id, at: now + (Number(ms) || 0), f }); return id; },
    clearTimeout(id) { const i = q.findIndex((t) => t.id === id); if (i >= 0) q.splice(i, 1); },
    tick(ms) {
      const until = now + ms;
      for (let guard = 0; guard < 100000; guard++) {
        q.sort((a, b) => a.at - b.at || a.id - b.id);
        if (!q.length || q[0].at > until) break;
        const t = q.shift();
        now = t.at;
        try { t.f(); } catch (e) { /* the module swallows its own throws */ }
      }
      now = until;
    },
    pending: () => q.length,
  };
}

const BEAN = { name: "Aaron Bean", office: "U.S. Representative", state: "Florida · FL-04" };
const LEE = { name: "Mike Lee", office: "U.S. Senator", state: "Utah" };
const ARMSTRONG = { name: "Alan Armstrong", office: "U.S. Senator", state: "Oklahoma" };
const ROSTER = { aaron_bean: BEAN, lee: LEE, alan_armstrong: ARMSTRONG };

function sandbox(opts) {
  opts = opts || {};
  const calls = { openModal: [], replace: [], notice: [], journey: [], titles: [] };
  const clock = makeClock();
  let title = Object.prototype.hasOwnProperty.call(opts, "title")
    ? opts.title
    : "PolitiDex | Bound by Truth";
  const doc = {
    readyState: "complete",
    _listeners: {},
    _els: {},
    addEventListener(type, fn) { (doc._listeners[type] = doc._listeners[type] || []).push(fn); },
    getElementById(id) {
      if (!doc._els[id]) {
        const attrs = {};
        doc._els[id] = {
          id, innerHTML: "", style: {}, attrs,
          setAttribute(k, v) { attrs[k] = String(v); },
          getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
          removeAttribute(k) { delete attrs[k]; },
          querySelector() { return null; },
          querySelectorAll() { return []; },
        };
      }
      return doc._els[id];
    },
    querySelector(sel) { return sel === "#pdx-crawl-person" ? crawl : null; },
  };
  // THE EDGE'S FIRST-BYTE HEADER, as share-preview.ts writes it: stamped for the
  // address it was generated at, carrying the resolved pid, the name and up to
  // six formal-record rows. On a cold arrival this is the whole page for a beat,
  // and it is the surface the old toast contradicted.
  const crawl = opts.crawl ? (() => {
    const attrs = {
      "data-pdx-crawl-for": "/p/" + opts.crawl.at,
      "data-pid": opts.crawl.pid,
    };
    const rows = (opts.crawl.rows || []).map((t) => ({ textContent: t }));
    return {
      hidden: false, style: {},
      getAttribute: (k) => (Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null),
      hasAttribute: (k) => Object.prototype.hasOwnProperty.call(attrs, k),
      querySelector: (sel) => (sel === "h1" ? { textContent: opts.crawl.name } : null),
      querySelectorAll: (sel) => (/li$/.test(sel) ? rows : (sel === "p" ? [{ textContent: opts.crawl.line || "" }] : [])),
    };
  })() : null;
  // document.title is the surface under test in section 3, so it is a real
  // accessor and every write is kept — a helper that sets it twice, or sets it to
  // "undefined · PolitiDex", has nowhere to hide.
  Object.defineProperty(doc, "title", {
    get() { return title; },
    set(v) { title = String(v); calls.titles.push(String(v)); },
  });

  const win = {
    document: doc,
    console,
    location: Object.assign(
      { origin: "https://www.politidex.fyi", pathname: "/", search: "", hash: "", href: "https://www.politidex.fyi/" },
      opts.location || {}),
    history: { replaceState(a, b, url) { calls.replace.push(url); }, pushState() {} },
    _listeners: {},
    addEventListener(type, fn) { (win._listeners[type] = win._listeners[type] || []).push(fn); },
    setTimeout: (f, ms) => clock.setTimeout(f, ms),
    clearTimeout: clock.clearTimeout,
    URLSearchParams, encodeURIComponent, JSON, Math, Date,
    CMP_DATA: Object.prototype.hasOwnProperty.call(opts, "roster") ? opts.roster : ROSTER,
    PROFILES: opts.profiles || {},
    _pdxRosterState: Object.prototype.hasOwnProperty.call(opts, "rosterState") ? opts.rosterState : "done",
    PDXShareLinks: { notice(id, kicker, message) { calls.notice.push({ id, kicker, message }); return true; } },
    PDXPublicationFloor: { clears: (pid) => pid === "lee" },
    PDXJourney: { record(kind, o) { calls.journey.push({ kind, label: o && o.label, pid: o && o.nav && o.nav.pid }); } },
  };
  // The renderer is optional on purpose: an arrival whose renderer has not
  // loaded is one of the two real ways the old code reached its toast.
  if (opts.openModal !== false) {
    win.openModal = function (id) { calls.openModal.push(id); win._pdxCurrentProfileId = id; };
  }
  win.window = win;
  win.globalThis = win;
  const ctx = vm.createContext(win);
  new vm.Script(PF_SRC, { filename: "person-file.js" }).runInContext(ctx);
  return { win, doc, calls, clock, P: win.PDXPerson };
}
const cold = (pathname, opts) => sandbox(Object.assign({ location: { pathname } }, opts || {}));

{
  const probe = sandbox();
  must(probe.P && typeof probe.P.open === "function", "PDXPerson did not register in a sandbox");
  must(typeof probe.P.chrome === "function", "PDXPerson.chrome is not exported — the tab helper has no seam to test");
  must(typeof probe.P.displayName === "function", "PDXPerson.displayName is not exported");
}

// ─────────────────────────────────────────────────────────────────────────────
// 1 · The unknown-pid toast waits for the wait
// ─────────────────────────────────────────────────────────────────────────────
section("1 · we do not call a member we carry unknown");

// THE LIVE DEFECT, REPLAYED. The roster is still loading and the bundled index
// does not have the row yet — a service worker serving a cmp-data.js from before
// the federal roster wave is exactly this state. Then the row lands. At no point
// in that sequence may a reader be told we do not carry Aaron Bean.
{
  const c = cold("/p/aaron_bean", { roster: {}, rosterState: "loading" });
  c.clock.tick(600);
  eq(c.calls.notice.length, 0,
     "the arrival raised the unknown-pid notice while the roster was still loading");
  eq(c.calls.openModal.length, 0, "the arrival opened a file it could not resolve");
  // The row arrives — a merged live roster, or the revalidated bundled index.
  c.win.CMP_DATA.aaron_bean = BEAN;
  c.win._pdxRosterState = "done";
  c.clock.tick(20000);
  eq(c.calls.notice.length, 0,
     "the row landed during the wait and the arrival still told the reader we do not carry him");
  eq(c.calls.openModal[0], "aaron_bean", "the arrival did not open the file once the row was there");
}

// AND WITH THE ROW IN HAND THE WHOLE TIME, even when the wait runs out for a
// different reason: the renderer never loaded, so there is nothing to open. That
// is a broken page, and "we don't carry this person" is still not what it is.
{
  const c = cold("/p/aaron_bean", { openModal: false, rosterState: "loading" });
  c.clock.tick(30000);
  eq(c.calls.notice.length, 0,
     "CMP_DATA held the row and the arrival called him unknown because the renderer had not loaded");
}

// The same, one beat at a time: the notice must be absent at EVERY point of a
// wait on a person we carry, not merely absent at the end of it.
{
  const c = cold("/p/aaron_bean", { roster: {}, rosterState: "loading" });
  let spoke = -1;
  for (let t = 0; t < 40; t++) {
    c.clock.tick(200);
    if (t === 10) { c.win.CMP_DATA.aaron_bean = BEAN; c.win._pdxRosterState = "done"; }
    if (c.calls.notice.length && spoke < 0) spoke = t;
  }
  eq(spoke, -1, `the notice fired at tick ${spoke} of a wait on a person the roster went on to hold`);
}

// THE REPORTED SCREEN, EXACTLY. The edge resolved /p/aaron_bean server-side and
// painted his name, his seat and his formal record into the first byte. Then the
// client's bundled roster turns out to be a stale service-worker copy from before
// the federal roster wave, so it has no row for him, and the live roster reports
// itself done without one either. HEAD's arrival waited out its grace and then
// raised "aaron_bean isn't someone we currently carry a record for" — directly
// under a header, still on screen, listing the acts we hold for him.
//
// The wait has genuinely ended here, so the first half of the gate does not save
// this; what saves it is that the page already disproves the sentence.
{
  const c = cold("/p/aaron_bean", {
    roster: {}, rosterState: "done",
    crawl: { at: "aaron_bean", pid: "aaron_bean", name: "Aaron Bean",
             line: "U.S. Representative · Florida · FL-04",
             rows: ["Advances · Border Security · 8 advanced · 2 against"] },
  });
  c.clock.tick(30000);
  eq(c.calls.notice.length, 0,
     "the arrival contradicted the edge's own first-byte header and told the reader we do not carry Aaron Bean");
  // And the header is left standing, because it is the only true thing on screen.
  eq(c.calls.openModal.length, 0, "the arrival opened a file for a pid no roster could resolve");
  ok(c.win.document.querySelector("#pdx-crawl-person").hidden === false,
     "the arrival hid the crawl header it could not replace");
}

// A GENUINELY UNKNOWN SLUG STILL SPEAKS even with a header in the document — the
// header is generic (no data-pid) precisely because the edge could not name it,
// and index.html's inline guard neutralises a block generated for another address.
{
  const c = cold("/p/persona_non_grata", {
    crawl: { at: "aaron_bean", pid: "aaron_bean", name: "Aaron Bean", rows: [] },
  });
  c.clock.tick(30000);
  eq(c.calls.notice.length, 1,
     "a header generated for a DIFFERENT address silenced the honest not-found answer");
}

// And the tab can be named from that header before either roster answers, which
// on a cold arrival is the only place the name exists.
{
  const c = cold("/p/aaron_bean", {
    roster: {}, rosterState: "loading",
    crawl: { at: "aaron_bean", pid: "aaron_bean", name: "Aaron Bean", rows: [] },
  });
  eq(c.P.displayName("aaron_bean"), "Aaron Bean",
     "displayName cannot read the name the edge already printed on the page");
}

// A thin file is thin, and that is a different sentence. /p/alan_armstrong has a
// row and no formal record; the arrival opens it and says nothing about carrying
// him, because we do.
{
  const c = cold("/p/alan_armstrong");
  c.clock.tick(20000);
  eq(c.calls.notice.length, 0, "a thin file was reported as a person we do not carry");
  eq(c.calls.openModal[0], "alan_armstrong", "the thin file did not open");
  has(c.doc.getElementById("modal-file-kicker").innerHTML, "Person file",
      "the thin file opened without its kicker");
  lacks(c.doc.getElementById("modal-file-kicker").innerHTML, "currently carry",
        "the kicker on a thin file borrowed the unknown-pid wording");
}

section("2 · a genuinely unknown slug still gets the honest answer");

// THE GATE IS NOT A MUTE. Nobody by this name, in either roster, ever.
{
  const c = cold("/p/persona_non_grata", { rosterState: "loading" });
  c.clock.tick(600);
  eq(c.calls.notice.length, 0, "the unknown slug was answered before the wait had ended");
  c.clock.tick(30000);
  eq(c.calls.notice.length, 1, "an unknown slug got no answer at all once the wait ended");
  eq(c.calls.notice[0].id, "pdx-person-unresolved", "the notice changed its id");
  has(c.calls.notice[0].message, "persona_non_grata", "the notice does not name the address that failed");
  has(c.calls.notice[0].message, "currently carry a record for",
      "the honest not-found sentence was reworded — it is the one thing this branch is for");
  eq(c.calls.openModal.length, 0, "an unknown slug opened a file anyway");
}

// The same, with the roster reporting failure rather than success — the answer is
// still given, because a roster that errored is a roster that has landed.
{
  const c = cold("/p/persona_non_grata", { rosterState: "error" });
  c.clock.tick(30000);
  eq(c.calls.notice.length, 1, "a failed roster load left an unknown slug with no answer");
}

// And exactly once. A retry loop that speaks on every tick is its own defect.
{
  const c = cold("/p/persona_non_grata");
  c.clock.tick(60000);
  eq(c.calls.notice.length, 1, "the notice fired more than once for one arrival");
  eq(c.clock.pending(), 0, "the arrival loop is still polling after it answered");
}

// STRUCTURAL: both halves of the gate, in code, in the module that owns them.
{
  const src = CODE("person-file.js");
  has(src, "if (_waitOpen) return false;",
      "the unresolved notice is no longer gated on the arrival wait being over");
  has(src, "if (knownHere(asked)) return false;",
      "…or no longer re-reads the rosters and the edge's own header before claiming we hold nobody");
  has(src, "_waitOpen = true;", "nothing ever opens the wait, so the gate is permanently open");
  has(src, "function stopWait()", "the wait has no single place that closes it");
  // The ceiling is the SAME ceiling. A fix that bought its honesty with a longer
  // stare would be a different, worse bug.
  for (const [k, v] of [["CEILING", "15000"], ["MAX_TRIES", "40"], ["SETTLED_GRACE", "240"], ["STEP", "120"]])
    has(src, `var ${k} = ${v};`, `the arrival wait's ${k} moved — this pass may not lengthen the wait`);
  ok(!/window\.(PDX)?ROSTER2|_pdxRoster2|SECOND_ROSTER/i.test(src),
     "person-file.js grew a second roster — the gate re-reads the two that exist");
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 · The tab and the trail follow the person
// ─────────────────────────────────────────────────────────────────────────────
section("3 · document.title and the crumb name the file that is open");

{
  const c = cold("/p/aaron_bean");
  c.clock.tick(20000);
  eq(c.doc.title, "Aaron Bean · PolitiDex", "the tab did not follow the adopted person file");
  eq(c.calls.journey.length, 1, "the arrival recorded no breadcrumb for the person it opened");
  eq(c.calls.journey[0].kind, "profile", "the crumb is not a profile step");
  eq(c.calls.journey[0].pid, "aaron_bean", "the crumb names somebody else");
  eq(c.calls.journey[0].label, "Aaron Bean", "the crumb is not labelled with the person's name");

  // A second person, opened from inside the first — the reported case.
  c.P.open("lee");
  eq(c.doc.title, "Mike Lee · PolitiDex", "opening a second file left the tab on the first person");
  eq(c.calls.journey[c.calls.journey.length - 1].pid, "lee", "…and left the crumb on the first person");

  // Close: the front page's own wording, not a person and not a blank.
  c.P.restore();
  eq(c.doc.title, "PolitiDex | Bound by Truth", "closing the file left the tab on the person");
  eq(c.calls.journey.length, 2, "closing the file recorded a breadcrumb — closing is the end of a step, not one");
}

// A HOMEPAGE SESSION keeps whatever title the document arrived with, because on
// "/" the served title is the shell's own and there is nothing to prefer over it.
{
  const c = sandbox({ title: "PolitiDex | Bound by Truth" });
  c.P.open("lee");
  eq(c.doc.title, "Mike Lee · PolitiDex", "an in-app open did not name the tab");
  c.P.restore();
  eq(c.doc.title, "PolitiDex | Bound by Truth", "an in-app close did not put the front page back");
}

// A COLD /p/ ARRIVAL MUST NOT ADOPT THE EDGE'S TITLE AS "HOME". share-preview.ts
// has already rewritten <title> to this person before any app code runs, so a
// helper that captured document.title at module load would restore a person on
// close and the tab would never come home.
{
  const c = cold("/p/aaron_bean", { title: "Aaron Bean — U.S. Representative · PolitiDex" });
  c.clock.tick(20000);
  c.P.restore();
  eq(c.doc.title, "PolitiDex | Bound by Truth",
     "closing a cold-arrival file restored the edge's person title as the front page");
}

// ONE HELPER, BOTH ENDS. Not two spellings that can drift.
{
  const src = CODE("person-file.js");
  const setters = src.match(/document\.title\s*=/g) || [];
  eq(setters.length, 2,
     `document.title is written in ${setters.length} places in person-file.js — the helper is one function with one person branch and one home branch`);
  has(src, "chrome(pid)", "open() does not call the tab helper");
  has(src, "chrome('')", "restore() does not call the same helper to come home");
  has(src, "HOME_TITLE = 'PolitiDex | Bound by Truth'", "the front page's own wording is not the constant it restores to");
  // NO FINDING IN THE TAB. It is the most-quoted string on the page.
  const chromeFn = src.slice(src.indexOf("function chrome(pid)"));
  const body = chromeFn.slice(0, chromeFn.indexOf("\n  }"));
  ok(!/\d\s*%|Direction Match|score|verdict/i.test(body),
     "the tab helper puts a finding in document.title — a title is a headline everywhere the file is not");
  ok(!/\b(Republican|Democrat|GOP|party)\b/i.test(body), "the tab helper names a party");
}

// The name comes from the roster, and from the edge's header when the roster has
// not answered — which on a cold arrival is the only place it exists.
{
  const c = cold("/p/aaron_bean");
  eq(c.P.displayName("aaron_bean"), "Aaron Bean", "displayName cannot name a roster row");
  eq(c.P.displayName("nobody_at_all"), "", "displayName invented a name for a pid with no record");
  // A pid it cannot name must not blank a good title.
  c.P.chrome("aaron_bean");
  c.P.chrome("nobody_at_all");
  eq(c.doc.title, "Aaron Bean · PolitiDex",
     "an unnameable pid overwrote the tab with a title built from nothing");
  ok(!c.calls.titles.some((t) => /undefined|null|^ · /.test(t)),
     `the tab was written with a placeholder name (saw ${JSON.stringify(c.calls.titles)})`);
}

// Compare does not fight the reader: the last adopted person file wins until
// close, so nothing in person-file.js re-titles on a compare or a data event.
{
  const src = CODE("person-file.js");
  ok(!/addEventListener\((['"])(pdx-compare|PDXDataChanged|pdx-voting-warm)\1[\s\S]{0,400}document\.title/.test(src),
     "person-file.js re-titles the tab from a data event — the file the reader opened owns the tab until they close it");
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 · "Still being built" is a finding, so it needs the whole record
// ─────────────────────────────────────────────────────────────────────────────
section("4 · a Bean-class file (acts on file, no cited position) is never called empty");

// The card is a string builder over the stats object beside it, so it is lifted
// out and run against fixtures rather than mounted — the decision under test is
// which words come out for which counts, and that is all this needs.
function lift(file, name) {
  const src = R(file);
  const at = src.indexOf(name);
  must(at >= 0, `${name} is gone from ${file}`);
  const open = src.indexOf("{", src.indexOf("function", at));
  must(open > 0, `${name} in ${file} no longer reads as a function`);
  let depth = 0, end = -1;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (!depth) { end = i; break; } }
    else if (ch === "'" || ch === '"' || ch === "`") {
      for (i++; i < src.length; i++) { if (src[i] === "\\") i++; else if (src[i] === ch) break; }
    } else if (ch === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; }
    else if (ch === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i) + 1; }
  }
  must(end > open, `${name} in ${file} could not be brace-matched`);
  return src.slice(at, end + 1);
}

const CTA_SRC = lift("profiles-full.js", "window._pdxStanceRecordCta = function (id, p)");
must(/thinRecord/.test(CTA_SRC), "the record CTA no longer decides on a thinRecord flag");

function cardFor(stats) {
  const ctx = {
    console, JSON, Math,
    setTimeout: () => 0,
    document: { querySelectorAll: () => [], querySelector: () => null },
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  ctx._pdxStanceRecordStats = () => stats;
  ctx._pdxEvJsId = (x) => String(x);
  ctx._pdxWordRecordShareSlot = () => "";
  vm.runInContext(CTA_SRC + ";", vm.createContext(ctx), { filename: "record-cta" });
  return String(ctx.window._pdxStanceRecordCta("aaron_bean", {}) || "");
}

const EMPTY_COPY = ["still being built", "No qualifying votes", "no record", "No record", "nothing on file"];

// BEAN, COLD. 23 acts in the formal brief the reader can see, nothing cited, the
// roll-call lane not yet warm. This is the reported screen.
{
  const html = cardFor({ tracked: 0, withEvidence: 0, gaps: 0, formal: 0, formalActs: 23, formalRead: false });
  ok(html.length > 0, "the record CTA rendered nothing for a Bean-class file");
  for (const s of EMPTY_COPY)
    lacks(html, s, `a file with 23 acts on the formal record rendered the empty-record copy`);
  has(html, "View the Full Record on the Issues", "the Bean-class card lost its label entirely");
}

// BEAN, WARM. Same person one repaint later: 11 formal issue rows, 23 acts, still
// nothing cited. Same answer — the copy must not depend on the clock.
{
  const html = cardFor({ tracked: 0, withEvidence: 0, gaps: 0, formal: 11, formalActs: 23, formalRead: true });
  for (const s of EMPTY_COPY) lacks(html, s, "a warm Bean-class file rendered the empty-record copy");
  has(html, "11 issues on the formal record", "the warm Bean-class card stopped naming the formal list");
}

// THE LANE HAS NOT ANSWERED and there is nothing else either. "Still being built"
// would be a finding about a record nobody has read yet, so the label is neutral
// and the reader gets the real one a beat later.
{
  const html = cardFor({ tracked: 0, withEvidence: 0, gaps: 0, formal: 0, formalActs: 0, formalRead: false });
  lacks(html, "still being built",
        "the card called the record unbuilt before the record lane had answered for this person");
}

// THE UTAH EMPTY-TEN CASE. Nothing cited, and a lane that ANSWERED with nothing.
// This is the one state the phrase was written for, and it keeps it.
{
  const html = cardFor({ tracked: 0, withEvidence: 0, gaps: 0, formal: 0, formalActs: 0, formalRead: true });
  has(html, "still being built",
      "a read-and-empty file lost the honest 'still being built' label — the fix is the condition, not the copy");
}

// A curated-only file is unaffected: it was never in this branch.
{
  const html = cardFor({ tracked: 7, withEvidence: 4, gaps: 2, formal: 0, formalActs: 0, formalRead: true });
  lacks(html, "still being built", "a file with seven tracked issues was called unbuilt");
  has(html, "7 issues tracked", "the curated wording moved");
}

// The stats the card reads actually carry the two new facts, computed from the
// index's own shape and — before it warms — from the edge's first-byte brief.
{
  const ctx = {
    console, JSON, Math, Date, setTimeout, clearTimeout,
    document: {
      readyState: "complete",
      head: { appendChild() {} }, body: { appendChild() {} },
      createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
      getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
      addEventListener() {},
    },
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; ctx.addEventListener = () => {};
  vm.runInContext(R("stance-helpers.js"), vm.createContext(ctx), { filename: "stance-helpers.js" });
  const stats = ctx.window._pdxStanceRecordStats;
  must(typeof stats === "function", "_pdxStanceRecordStats is gone from stance-helpers.js");

  // Cold: no consistency engine at all, and the only formal record in the
  // document is the header the edge wrote.
  ctx.window.PDXPerson = { crawlRecord: (pid) => (pid === "aaron_bean" ? [{ text: "a" }, { text: "b" }, { text: "c" }] : []) };
  const cold1 = stats("aaron_bean", {});
  eq(cold1.formalActs, 3, "the stats ignore the formal rows the edge already printed on the page");
  eq(cold1.formalRead, false, "the stats claim the record lane answered when no record cache exists");

  // Warm: the index answers, and its act count is the one that is used.
  ctx.window.PDXConsistency = {
    formalPatternIndex: { count: () => 11, shape: () => ({ issues: 11, judged: 23, characterised: 3 }) },
  };
  ctx.window.PDXVotingRecord = { memberRecords: (pid) => (pid === "aaron_bean" ? [] : null) };
  const warm1 = stats("aaron_bean", {});
  eq(warm1.formal, 11, "the stats lost the formal issue count");
  eq(warm1.formalActs, 23, "the stats do not read the act count out of the index's own shape");
  eq(warm1.formalRead, true, "the stats do not notice that the record lane has answered");
  const cold2 = stats("nobody_at_all", {});
  eq(cold2.formalRead, false, "the stats report a warm lane for a member with no cached record");
}

// ─────────────────────────────────────────────────────────────────────────────
// 5 · An empty Official Record names the missing word, not missing votes
// ─────────────────────────────────────────────────────────────────────────────
section("5 · the WVA empty state is renamed, not hidden");

const CS = (() => {
  const noopEl = () => ({
    style: {}, textContent: "", hidden: false, className: "", innerHTML: "",
    setAttribute() {}, appendChild() {}, querySelector: () => null,
    querySelectorAll: () => [], addEventListener() {}, focus() {}, scrollIntoView() {},
  });
  const ctx = {
    console,
    document: {
      readyState: "complete",
      head: noopEl(), body: noopEl(), documentElement: noopEl(),
      createElement: noopEl, getElementById: () => null,
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener() {},
    },
    setTimeout, clearTimeout, JSON, Math, Date,
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; ctx.addEventListener = () => {};
  const box = vm.createContext(ctx);
  for (const f of ["stance-helpers.js", "consistency.js"])
    vm.runInContext(R(f), box, { filename: f });
  return ctx;
})();
must(CS.window.PDXConsistency && typeof CS.window.PDXConsistency.scopedOverall === "function",
     "PDXConsistency.scopedOverall is not exported");

// A MEMBER WHOSE FORMAL RECORD HAS ANSWERED AND WHOSE CITED WORD IS EMPTY. The
// roll-up pairs nothing, and that is a fact about the missing stated position.
{
  CS.window.PDXVotingRecord = { memberRecords: () => [] };
  const ov = CS.window.PDXConsistency.scopedOverall("official", "aaron_bean");
  eq(ov.issues, 0, "the fixture is no longer the empty-roll-up case this section is about");
  eq(ov.token, "no_stance", "an empty Official Record roll-up still reports itself as an empty voting record");
  const label = String(ov.verdict && ov.verdict.label);
  has(label, "stated position", "the empty Official Record does not name the missing stated position");
  lacks(label, "votes", "the empty Official Record still says 'votes' — it is the word that is missing, not the votes");
  lacks(label, "vote", "the empty Official Record still names votes");
  eq(ov.score, null, "the empty roll-up invented a score");
}

// AND WHEN THE LANE HAS NOT ANSWERED, it says so — the same token and the same
// warm request the per-issue path already uses, so the strip and its rows cannot
// disagree about whether the record has arrived.
{
  CS.window.PDXVotingRecord = { memberRecords: () => null };
  const ov = CS.window.PDXConsistency.scopedOverall("official", "somebody_cold");
  eq(ov.token, "pending", "an unread record lane reports itself as an empty one");
  lacks(String(ov.verdict && ov.verdict.label), "No qualifying votes",
        "an unread record lane prints the missing-votes sentence");
}

// THE STATE IS STILL THERE. Renamed, not suppressed: a hidden empty state is the
// same lie told by omission.
{
  CS.window.PDXVotingRecord = { memberRecords: () => [] };
  const ov = CS.window.PDXConsistency.scopedOverall("official", "aaron_bean");
  ok(ov.verdict && ov.verdict.label && ov.verdict.label.length > 4,
     "the empty Official Record verdict lost its label — the empty state must be named, not hidden");
  ok(!!(ov.verdict.ico || ov.verdict.cls), "the empty verdict lost the chip vocabulary it renders with");
}

// Say-vs-Do is a different lane and keeps its own honest sentence.
{
  const src = CODE("consistency.js");
  has(src, "no_record: 'Nothing on the public record yet'", "the Say-vs-Do empty copy moved");
  has(src, "no_stance: 'No stated position to test'",
      "the official scope's empty copy no longer names the missing stated position");
  has(src, "no_record: 'No qualifying votes on record yet'",
      "the ISSUE-level missing-vote sentence was removed — a stated position with no vote mapped to it IS a missing vote");
  has(src, "!keys.length", "the roll-up no longer separates an empty key list from an empty record");
}

// THE TWO-JOBS SENTENCE IS LOCKED. Both copies, byte for byte, in the two files
// that render it.
{
  const TWO_JOBS = "No stated position on file — this is what the record itself did, " +
                   "not a stated stance and not a score.";
  const inFile = (f) => R(f).replace(/'\s*\+\s*\n\s*'/g, "");
  has(inFile("receipt-cards.js"), TWO_JOBS, "receipt-cards.js's two-jobs sentence was edited");
  has(inFile("consistency.js"), TWO_JOBS, "consistency.js's two-jobs sentence was edited");
}

// ─────────────────────────────────────────────────────────────────────────────
// 6 · No floor moved, and nobody was published by hand
// ─────────────────────────────────────────────────────────────────────────────
section("6 · the publication floor is where it was");

{
  const FLOOR = R("publication-floor.js");
  has(FLOOR, "var MIN_CITED_POSITIONS = 2;", "MIN_CITED_POSITIONS moved");
  const decls = (FLOOR.match(/MIN_CITED_POSITIONS\s*=/g) || []).length;
  eq(decls, 1, "MIN_CITED_POSITIONS is assigned more than once in the file that owns it");

  // No second floor anywhere this pass touched.
  for (const f of ["person-file.js", "profiles-full.js", "stance-helpers.js", "consistency.js"])
    ok(!/MIN_CITED/.test(CODE(f)), `${f} declares or reads its own cited-position floor — there is one floor, in one file`);

  // The generated Utah lane was not hand-edited to let Bean through.
  const FI = R("formal-index.js");
  ok(!/aaron_bean/.test(FI), "aaron_bean was hand-added to the generated formal index");
  has(FI, "gen-formal-index", "formal-index.js lost the note saying it is generated");

  // The service worker ships the changed modules, so it has to be bumped.
  const SW = R("sw.js");
  const m = SW.match(/const CACHE_VERSION = 'v(\d+)';/);
  must(!!m, "sw.js's CACHE_VERSION no longer reads as written");
  ok(Number(m[1]) >= 103,
     `CACHE_VERSION is v${m[1]} — person-file.js, profiles-full.js, stance-helpers.js and consistency.js all changed, and a warm device would keep the old copies`);

  // No party metric and no second percentage entered any span this pass wrote.
  const ctaBody = CTA_SRC.replace(/^\s*\/\/.*$/gm, "");
  ok(!/\d\s*%|toFixed|Math\.round/.test(ctaBody), "the record CTA grew a number of its own");
  ok(!/\b(Republican|Democrat|GOP|partisan)\b/i.test(ctaBody), "the record CTA names a party");
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ person-file chrome: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("   · " + f);
  console.error("");
  process.exit(1);
}
console.log(`✓ person-file chrome: the load does not lie and the tab names the person — ${passed} assertions passed\n`);
