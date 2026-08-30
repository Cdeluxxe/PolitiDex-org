#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-person-cold-open.mjs — one request per person, and a first paint that stays
// ─────────────────────────────────────────────────────────────────────────────
// A cold /p/<pid> open is judged on one thing: how long until the reader can see
// which person this address is about. Two defects made that wait longer than the
// data ever required, and both are behavioural rather than textual — they only
// show up when the arrival path is actually RUN. So this file runs it, over the
// real shipped person-file.js and voting-record.js in a node:vm sandbox, with
// fetch replaced by a log.
//
//   1. TWO REQUESTS FOR ONE PERSON. index.html's head block starts the record
//      request from the first executable moment in the document, publishing it on
//      window.__pdxVRPrefetch for fetchMember to adopt. person-file.js's
//      bootAdopt then warmed the RAW PATH pid — and fetchMember canonicalises
//      with PDXCanonicalPid, which knows the voting-record retirements and not
//      the roster bridges. So /p/scott_chew prefetched `chew_h68` (right) and
//      then requested `scott_chew` (a URL nobody reads), with the useless one
//      ahead of the useful one on the connection. warmTarget resolves the pid
//      BEFORE the warm, so the request the head started is the request the file
//      uses: one in flight per person, at any moment, ever.
//   2. THE FIRST PAINT WAS COVERED UP. The edge writes a header naming the
//      person, their office and up to six formal-record rows into the first
//      bytes. openModal then opened its loading shell on top of it — a spinner
//      and the words "Loading Ro Khanna…" — because the full profile document
//      still had to be fetched. The page went backwards at the moment it was
//      meant to go forwards. arrivalSkeleton repeats that header's own strings,
//      as text, and the header is retired only once the real file is mounted.
//
// WHAT THIS FILE HOLDS:
//
//   1. THE ARRIVAL STILL OPENS THE NAMED PERSON — lee, khanna, chew_h68 and the
//      mike_lee alias, each through the one funnel, on the canonical id.
//   2. ONE IN-FLIGHT REQUEST PER PID. Asserted on the fetch log, not on the
//      source: a warm plus an open, an alias arrival, and two concurrent callers
//      all cost exactly one request for the member the file opens.
//   3. A PREFETCH FOR SOMEBODY ELSE IS ABANDONED, not left racing the request the
//      reader is waiting on — and claimed, so nothing can adopt an aborted promise.
//   4. THE SKELETON IS THAT PERSON'S OWN ROWS. It repeats the header's name,
//      office line and formal rows; it escapes them; and it refuses outright when
//      the header names anybody else, is generic, or is stamped for another
//      address.
//   5. THE HEADER YIELDS TO A FILE, NOT TO A SPINNER. Hidden on mount, kept while
//      the shell is up.
//
//   node scripts/test-person-cold-open.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) =>
  ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const hasnt = (h, n, m) => ok(!String(h).includes(n), `${m} — still contains ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ person cold open: STALE HARNESS — ${m}`); process.exit(2); };

const PF_SRC = R("person-file.js");
const VR_SRC = R("voting-record.js");

// ── The roster this file arrives against ─────────────────────────────────────
// Four people and the two bridge shapes that cost a second request in
// production: a roster bridge (scott_chew → chew_h68, PDX_PROFILE_ALIAS, which
// the head block mirrors) and a display-name slug (mike_lee → lee, which it
// cannot mirror because the slug is derived from the roster).
const ROSTER = {
  lee: { name: "Mike Lee", office: "U.S. Senator", state: "Utah" },
  khanna: { name: "Ro Khanna", office: "U.S. Representative", state: "California" },
  chew_h68: { name: "Scott Chew", office: "State Representative", state: "Utah" },
};
const ALIASES = { scott_chew: "chew_h68" };

// ── A crawl header, the shape share-preview.ts writes ────────────────────────
function header(opts) {
  const o = opts || {};
  const attrs = {
    "data-pdx-crawl-for": o.forPath || "/p/lee",
    ...(o.pid === null ? {} : { "data-pid": o.pid || "lee" }),
    ...(o.generic ? { "data-pdx-crawl-generic": "" } : {}),
  };
  const rows = (o.rows || [
    "Strongly opposes · Health care · 12 actions advanced",
    "Split · Housing · 3 actions advanced · 2 against",
  ]).map((t) => ({ textContent: t }));
  const kids = {
    h1: [{ textContent: o.name || "Mike Lee" }],
    p: [{ textContent: o.line || "U.S. Senator · Utah" }, { textContent: "Formal record" }],
    "[data-pdx-crawl-record] li": rows,
  };
  return {
    id: "pdx-crawl-person", hidden: false, style: {}, innerHTML: "",
    setAttribute(k, v) { attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k); },
    removeAttribute(k) { delete attrs[k]; },
    querySelector(sel) { return (kids[sel] || [])[0] || null; },
    querySelectorAll(sel) { return kids[sel] || []; },
    addEventListener() {},
  };
}

// ── The arrival, run ─────────────────────────────────────────────────────────
// person-file.js + voting-record.js in one context, wired the way the document
// wires them, with the network replaced by a log this file resolves by hand.
function arrive(opts) {
  const o = opts || {};
  const calls = { openModal: [], replace: [], warmEvents: [] };
  const els = {};
  const crawl = o.crawl === false ? null : header(o.header || {});
  const doc = {
    readyState: "complete", cookie: "", _listeners: {},
    addEventListener(t, f) { (doc._listeners[t] = doc._listeners[t] || []).push(f); },
    removeEventListener() {}, dispatchEvent() { return true; },
    getElementById(id) {
      if (id === "pdx-crawl-person" && crawl) return crawl;
      if (!Object.prototype.hasOwnProperty.call(els, id)) els[id] = { id, style: {}, hidden: false, innerHTML: "", setAttribute() {}, getAttribute: () => null, removeAttribute() {}, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] };
      return els[id];
    },
    querySelector(sel) { return sel === "#pdx-crawl-person" ? crawl : null; },
    querySelectorAll() { return []; },
    createElement() { return { style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }; },
    head: { appendChild() {} }, body: { appendChild() {} },
  };

  // Every request this arrival issues, in order. Nothing resolves until this
  // file says so, which is how "while the first is in flight" is expressible.
  const log = [];
  const gate = [];
  const win = {
    document: doc,
    location: {
      origin: "https://www.politidex.fyi", pathname: o.pathname || "/p/lee",
      search: "", hash: "", href: "https://www.politidex.fyi" + (o.pathname || "/p/lee"),
    },
    history: { replaceState(a, b, url) { calls.replace.push(url); }, pushState() {} },
    _listeners: {},
    addEventListener(t, f) { (win._listeners[t] = win._listeners[t] || []).push(f); },
    removeEventListener() {},
    dispatchEvent(e) { if (e && e.type === "pdx-voting-warm") calls.warmEvents.push(e.detail && e.detail.pid); return true; },
    setTimeout() { return 0; }, clearTimeout() {},
    setInterval() { return 0; }, clearInterval() {},
    requestAnimationFrame() { return 0; }, requestIdleCallback() { return 0; },
    matchMedia() { return { matches: false, addEventListener() {}, addListener() {} }; },
    getComputedStyle() { return { getPropertyValue: () => "" }; },
    navigator: { userAgent: "node" },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    URLSearchParams, encodeURIComponent, console,
    CustomEvent: class { constructor(t, d) { this.type = t; Object.assign(this, d || {}); } },
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
    fetch(url) {
      log.push(String(url));
      let res;
      const p = new Promise((r) => { res = r; });
      gate.push({ url: String(url), res });
      return p;
    },
    openModal(id) { calls.openModal.push(id); win._pdxCurrentProfileId = id; },
    CMP_DATA: o.roster || ROSTER,
    PROFILES: {},
    _pdxRosterState: o.rosterState || "done",
    PDXPublicationFloor: { clears: () => true },
    PDX_PROFILE_ALIAS: o.aliases || ALIASES,
    ACCT_ALIAS: {},
    ISSUE_MAP: {},
  };
  win.window = win; win.self = win; win.globalThis = win;

  // The two resolvers person-file.js consults through window, reproduced rather
  // than loaded (profile-evidence.js and stance-helpers.js are DOM-coupled, and
  // what matters here is the ORDER: a roster bridge, then the retirements).
  win.PDXProfilePid = function (id) {
    if (!id) return id;
    const hasRec = (x) => !!(win.PROFILES[x] || win.CMP_DATA[x]);
    const direct = win.PDX_PROFILE_ALIAS[id];
    if (direct && direct !== id && hasRec(direct)) return direct;
    return id;
  };
  win.PDXCanonicalPid = function (id) { return id; };   // no retirement in this cast

  const ctx = vm.createContext(win);
  new vm.Script(VR_SRC, { filename: "voting-record.js" }).runInContext(ctx);
  new vm.Script(PF_SRC, { filename: "person-file.js" }).runInContext(ctx);

  return {
    win, calls, doc, log, gate, crawl, P: win.PDXPerson,
    // The head block's hand-over, as index.html publishes it: a request already
    // in flight, its exact URL, and the abort handle bootAdopt may pull.
    prefetch(pid) {
      // The exact URL fetchMember builds — _query already carries its own "?",
      // and _adoptPrefetch matches on the FULL url, so a near-miss here would
      // silently test the un-adopted path instead.
      const url = "/api/voting-record/member/" + encodeURIComponent(pid) +
        win.PDXVotingRecord._query({ pageSize: 100 });
      const box = { pid, url, aborted: false };
      box.promise = win.fetch(url).then((r) => (r && r.ok ? r.json() : null));
      box.abandon = function () { box.aborted = true; };
      win.__pdxVRPrefetch = box;
      return box;
    },
    // Answer whatever is in flight for this member.
    deliver(pid, items) {
      const hit = gate.find((g) => g.url.indexOf("/member/" + pid + "?") >= 0 && !g.done);
      must(!!hit, `nothing ever requested /member/${pid}`);
      hit.done = true;
      hit.res({ ok: true, status: 200, json: () => Promise.resolve({ items: items || [] }) });
    },
    members(pid) { return log.filter((u) => u.indexOf("/member/" + pid + "?") >= 0); },
    memberLog() { return log.filter((u) => u.indexOf("/member/") >= 0).map((u) => u.split("/member/")[1].split("?")[0]); },
  };
}

const tick = () => new Promise((r) => setImmediate(r));

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the arrival still opens the named person");
// ═════════════════════════════════════════════════════════════════════════════
{
  must(arrive().P && typeof arrive().P.bootAdopt === "function", "PDXPerson.bootAdopt did not register");

  for (const [path, want] of [["/p/lee", "lee"], ["/p/khanna", "khanna"],
                              ["/p/chew_h68", "chew_h68"], ["/p/mike_lee", "lee"],
                              ["/p/scott_chew", "chew_h68"]]) {
    const a = arrive({ pathname: path, header: { forPath: path, pid: want } });
    eq(a.P.bootAdopt(), path.slice(3).replace(/\/$/, ""), `${path}: the arrival reports the pid it is working on`);
    eq(a.calls.openModal, [want], `${path} opens ${want}, through the one funnel`);
    ok(String(a.calls.replace[0] || "").endsWith("/p/" + want),
      `${path} stamps the canonical address (got ${JSON.stringify(a.calls.replace[0])})`);
  }

  // An id nobody carries opens nobody — and is not answered until the roster is
  // in, so a slow network cannot make a real person "unknown".
  const ghost = arrive({ pathname: "/p/definitely_not_a_politician", crawl: false, rosterState: "loading" });
  eq(ghost.P.bootAdopt(), "definitely_not_a_politician", "an unknown arrival still reports what it tried");
  eq(ghost.calls.openModal, [], "…and opens nobody while the roster is still loading");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · one in-flight request per pid");
// ═════════════════════════════════════════════════════════════════════════════
{
  // (a) The plain case: bootAdopt warms, then open() warms again. One request.
  const a = arrive({ pathname: "/p/lee", header: { forPath: "/p/lee", pid: "lee" } });
  a.P.bootAdopt();
  eq(a.memberLog(), ["lee"], "a cold /p/lee arrival issues exactly one member request");
  a.P.open("lee");
  eq(a.memberLog(), ["lee"], "opening the same person while that request is in flight adds none");
  a.P.open("lee");
  eq(a.memberLog(), ["lee"], "…and neither does opening it again");

  // (b) THE DEFECT. /p/scott_chew: the head correctly prefetched chew_h68; the
  // warm must adopt that request rather than spend a second one on the raw path
  // spelling, which fetchMember would not canonicalise (PDXCanonicalPid carries
  // the retirements, not the roster bridges).
  const b = arrive({ pathname: "/p/scott_chew", header: { forPath: "/p/scott_chew", pid: "chew_h68" } });
  const box = b.prefetch("chew_h68");
  eq(b.memberLog(), ["chew_h68"], "the head's prefetch is the first request on the wire");
  b.P.bootAdopt();
  eq(b.memberLog(), ["chew_h68"], "the arrival adopts it instead of asking for /member/scott_chew");
  eq(b.members("scott_chew"), [], "the raw path spelling is never requested");
  eq(box.aborted, false, "…and the prefetch it adopted is not abandoned");
  eq(box.claimed, true, "the box is claimed, so no second caller can adopt it too");
  eq(b.calls.openModal, ["chew_h68"], "the file still opens under the canonical id");

  // (c) Two concurrent callers for one member: fetchMember's memo answers the
  // second, so "in flight" is a state the second caller can see.
  const c = arrive({ pathname: "/p/khanna", header: { forPath: "/p/khanna", pid: "khanna" } });
  const VR = c.win.PDXVotingRecord;
  const p1 = VR.fetchMember("khanna", { pageSize: 100 });
  const p2 = VR.fetchMember("khanna", { pageSize: 100 });
  eq(c.memberLog(), ["khanna"], "two concurrent fetchMember calls issue one request");
  ok(p1 === p2, "…because the second caller is handed the first caller's promise");
  c.deliver("khanna", [{ id: 1 }]);
  await Promise.all([p1, p2]);
  await tick();
  eq(c.memberLog(), ["khanna"], "and the answer landing does not issue another");

  // (d) A record already in the sync cache is not re-requested at all.
  const d = arrive({ pathname: "/p/lee", header: { forPath: "/p/lee", pid: "lee" } });
  d.win.PDXVotingRecord.noteMember("lee", [{ id: 1 }]);
  d.P.bootAdopt();
  eq(d.memberLog(), [], "an arrival whose record is already warm asks for nothing");
  eq(d.calls.openModal, ["lee"], "…and still opens the file");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · a prefetch for somebody else is abandoned, not left racing");
// ═════════════════════════════════════════════════════════════════════════════
{
  // /p/mike_lee is the case the head block cannot resolve: the display-name slug
  // is derived from the roster, which the head does not have. So it prefetches
  // `mike_lee` and the file opens `lee`. That request is now dead weight on the
  // one connection the reader is waiting on, so it is aborted and claimed.
  const a = arrive({ pathname: "/p/mike_lee", header: { forPath: "/p/mike_lee", pid: "lee" } });
  const box = a.prefetch("mike_lee");
  a.P.bootAdopt();
  eq(box.aborted, true, "the wrong member's prefetch is aborted");
  eq(box.claimed, true, "…and claimed, so fetchMember cannot adopt an aborted promise");
  eq(a.memberLog(), ["mike_lee", "lee"], "the request the file waits on is issued, and it is the only new one");
  eq(a.calls.openModal, ["lee"], "the file opens the person the address resolves to");
  a.P.open("lee");
  eq(a.memberLog(), ["mike_lee", "lee"], "opening does not spend a third request");

  // A prefetch that IS about this arrival is left alone.
  const b = arrive({ pathname: "/p/lee", header: { forPath: "/p/lee", pid: "lee" } });
  const good = b.prefetch("lee");
  b.P.bootAdopt();
  eq(good.aborted, false, "a prefetch for the right member is never aborted");
  eq(b.memberLog(), ["lee"], "…and no second request goes out beside it");

  // A box fetchMember has already taken is somebody's answer, not ours to abort.
  const c = arrive({ pathname: "/p/mike_lee", header: { forPath: "/p/mike_lee", pid: "lee" } });
  const taken = c.prefetch("mike_lee");
  taken.claimed = true;
  c.P.bootAdopt();
  eq(taken.aborted, false, "an already-claimed box is left alone");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the loading shell is that person's own rows");
// ═════════════════════════════════════════════════════════════════════════════
{
  const a = arrive({ pathname: "/p/lee", header: { forPath: "/p/lee", pid: "lee" } });
  const sk = a.P.arrivalSkeleton("lee");
  ok(!!sk, "an arrival header stamped for this address yields a skeleton");
  has(sk, "Mike Lee", "the name the first paint already showed is repeated");
  has(sk, "U.S. Senator · Utah", "…with the office line under it");
  has(sk, "Strongly opposes · Health care · 12 actions advanced", "…and the header's own formal rows");
  has(sk, "Split · Housing · 3 actions advanced · 2 against", "…all of them, in order");
  has(sk, "Loading the latest roster…", "the wait is stated");
  has(sk, "pdx-file-skel-status", "…as a status line rather than as the content");
  ok(sk.indexOf("Mike Lee") < sk.indexOf("Loading the latest roster…"),
    "the name is above the status, not replaced by it");
  hasnt(sk, "Loading Mike Lee…", "the shell no longer says only that it is loading a person it can already name");
  has(sk, 'data-pdx-file-skel="lee"', "the skeleton says who it is standing in for");
  has(sk, 'role="status"', "…and announces itself to a screen reader");

  // At most six rows: the shell is a held first paint, not a second brief.
  const many = arrive({
    pathname: "/p/lee",
    header: { forPath: "/p/lee", pid: "lee", rows: ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"] },
  });
  const big = many.P.arrivalSkeleton("lee");
  has(big, "<li>r6</li>", "six rows are repeated");
  hasnt(big, "<li>r7</li>", "…and the seventh is not");

  // Escaped as text. The header came off the wire; nothing here re-hosts markup.
  const evil = arrive({
    pathname: "/p/lee",
    header: { forPath: "/p/lee", pid: "lee", name: 'Mike <img src=x onerror="boom()">', rows: ["<script>boom()</script>"] },
  });
  const esc = evil.P.arrivalSkeleton("lee");
  hasnt(esc, "<img", "a name carrying markup is escaped, not rendered");
  hasnt(esc, "<script>boom", "…and so is a row");
  has(esc, "&lt;img", "the escaped form is what ships");

  // REFUSALS. Each of these must fall back to the spinner the shell always had,
  // and above all must never lend one person's rows to another person's file.
  eq(a.P.arrivalSkeleton("khanna"), "", "the header's rows are refused for a different person");
  const gen = arrive({ pathname: "/p/nobody", header: { forPath: "/p/nobody", pid: null, generic: true } });
  eq(gen.P.arrivalSkeleton("nobody"), "", "a generic header names nobody, so it yields nothing");
  const stale = arrive({ pathname: "/p/khanna", header: { forPath: "/p/lee", pid: "lee" } });
  eq(stale.P.arrivalSkeleton("khanna"), "", "a header stamped for another address is refused");
  eq(stale.P.arrivalSkeleton("lee"), "", "…for its own person too, because the address is what was poisoned");
  const none = arrive({ pathname: "/p/lee", crawl: false });
  eq(none.P.arrivalSkeleton("lee"), "", "a document with no header yields nothing");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the header yields to a file, not to a spinner");
// ═════════════════════════════════════════════════════════════════════════════
{
  // openModal returns early on the loading shell whenever the full profile
  // document still has to be fetched — which, on a cold arrival, is every time.
  // Hiding the header there is how the paint was lost.
  const shell = arrive({ pathname: "/p/lee", header: { forPath: "/p/lee", pid: "lee" } });
  shell.win.openModal = function () { /* the shell path: nothing is mounted */ };
  shell.P.bootAdopt();
  eq(shell.crawl.hidden, false, "an open that only reached the loading shell keeps the first paint");
  eq(shell.crawl.style.display, undefined, "…and does not hide it by inline style either");

  // Then the renderer mounts, and calls back.
  shell.win._pdxCurrentProfileId = "lee";
  shell.P.mounted("lee");
  eq(shell.crawl.hidden, true, "the mount retires the header");
  eq(shell.crawl.style.display, "none", "…belt and braces");

  // The ordinary path, where openModal mounts synchronously, hides it at once.
  const full = arrive({ pathname: "/p/lee", header: { forPath: "/p/lee", pid: "lee" } });
  full.P.bootAdopt();
  eq(full.crawl.hidden, true, "an open that mounted the file hides the header");

  // Idempotent: openModal re-runs once the lazy document lands.
  const again = arrive({ pathname: "/p/lee", header: { forPath: "/p/lee", pid: "lee" } });
  again.win._pdxCurrentProfileId = "lee";
  again.P.mounted("lee");
  again.P.mounted("lee");
  eq(again.crawl.hidden, true, "a repeat mount is a no-op, not an error");

  // The mark the cold-open line's last number comes from.
  const marks = [];
  const m = arrive({ pathname: "/p/lee", header: { forPath: "/p/lee", pid: "lee" } });
  m.win.PDXPerf = { mark(n) { marks.push(n); } };
  m.win._pdxCurrentProfileId = "lee";
  m.P.mounted("lee");
  ok(marks.indexOf("file-named") >= 0, "the mount takes the name-on-file mark");
}

console.log("");
if (failures.length) {
  console.error(`✗ person cold open: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ person cold open: one request per person, and a first paint that stays — ${passed} assertions passed\n`);
