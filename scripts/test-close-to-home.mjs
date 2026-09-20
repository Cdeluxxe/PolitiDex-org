#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-close-to-home.mjs — closing a person file has to LAND on the homepage
// ─────────────────────────────────────────────────────────────────────────────
// THE DEFECT, as it shipped. Closing a file at /p/<pid> put '/' in the address
// bar and left person.html on the screen. The reader was looking at the person
// shell with its modal shut — an empty document still carrying person.html's own
// `padding-top: calc(var(--pdx-chrome) + 0.75rem)` on <body> — at the homepage's
// address. That padding exists to clear this document's one-row bar and
// index.html does not declare it, so seeing it at '/' was the proof that the
// document underneath had never changed. Nothing was wrong with the CSS. The
// close was wrong: history.replaceState moves the address and fetches NOTHING,
// and since the person split there is no homepage underneath a person file to be
// revealed. person.html IS the page.
//
// So the close-to-home path has two halves, and this file holds both to account:
//
//   1. THE CLOSE MUST LEAVE. person-file.js's restore() navigates
//      (location.assign) when the document was served for a person address, and
//      still hands the address back in place on index.html, where the modal
//      really is an overlay over a page. Asserted in test-person-file.mjs, whose
//      cold-arrival probe used to assert the replaceState that WAS the bug.
//
//   2. AND THE NAVIGATION MUST LAND ON index.html. A '/' navigation answered
//      from cache with a sub-shell body is indistinguishable, from the reader's
//      side, from the replaceState defect — same address, same wrong document.
//      sw.js's pre-v187 policy wrote every document to the '/' key, so a phone
//      that has not had a shell bump since then still holds a person document
//      there. This file exercises handleNavigate against that exact cache.
//
//   node scripts/test-close-to-home.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ close-to-home: STALE HARNESS — ${m}`); process.exit(2); };

const SW = R("sw.js");
const ORIGIN = "https://politidex.fyi";

// ─────────────────────────────────────────────────────────────────────────────
// 1 · The close leaves
// ─────────────────────────────────────────────────────────────────────────────
section("1 · restore() navigates when the document was served for a person");

const PF = R("person-file.js");
ok(/function leaveHome\(\)\s*\{[\s\S]{0,200}?location\.assign\('\/'\)/.test(PF),
   "person-file.js no longer has a leaveHome() that calls location.assign('/') — the close is back to moving " +
   "the address without fetching a document, which leaves the closed person shell on screen at '/'");
// THE GATE IS isPersonDoc(), WHICH SUBSUMES ARRIVAL. This read /if \(ARRIVAL\)/
// until the person document got its own flag: isPersonDoc() is
// `window.__PDX_PERSON_DOC === true || !!ARRIVAL`, so every address ARRIVAL
// admitted is still admitted and nothing new is. What it fixes is the OTHER
// half of the same question — a person.html served without the head block, or
// assembled by a harness — and what it must still refuse is index.html, where
// the profile modal genuinely is an overlay over a page and the close is the
// replaceState further down.
ok(/if \(isPersonDoc\(\)\)\s*\{[\s\S]{0,600}?leaveHome\(\)/.test(PF),
   "person-file.js's restore() no longer gates leaving on the person document — either it stopped leaving, or it now " +
   "navigates out of index.html's own modal, where the close really is an overlay over a page");

// ─────────────────────────────────────────────────────────────────────────────
// 2 · The banners the guard reads are still there to read
// ─────────────────────────────────────────────────────────────────────────────
// subShellIdOf() identifies a document by the identity line each sub-shell opens
// with, rather than by a marker meta — the sub-shells copy numbered LINE RANGES
// out of index.html and out of each other, and the shell-contract suites assert
// those regions byte-identical BY LINE NUMBER, so inserting a line into any of
// the four documents dislocates every range beneath it. The cost of reusing prose
// is that prose can be reworded, and a reworded banner would silently disarm the
// guard. That is what this section is for: reword one and this fails, loudly.
section("2 · every sub-shell still declares itself where the worker looks");

const banner = /const SUB_SHELL_BANNER_RE = (\/.+\/);/.exec(SW);
must(banner, "sw.js no longer declares SUB_SHELL_BANNER_RE in the form this file reads");
const CEIL = /const SHELL_SNIFF_CHARS = (\d+);/.exec(SW);
must(CEIL, "sw.js no longer declares SHELL_SNIFF_CHARS");
const RE = vm.runInNewContext(banner[1]);
const sniffChars = Number(CEIL[1]);

for (const [file, id] of [
  ["person.html", "person"],
  ["issue.html", "issue"],
  ["spotlight.html", "spotlight"],
]) {
  const head = R(file).slice(0, sniffChars);
  const m = RE.exec(head);
  ok(!!m, `${file} no longer carries its identity banner inside the first ${sniffChars} characters — ` +
          "sw.js can no longer tell this document apart from the homepage, and the '/' guard is disarmed");
  if (m) eq(m[1], id, `${file}'s banner names the wrong shell to sw.js`);
}

// The discriminator only works if the homepage is NOT one. Checked against the
// whole 2.2 MB, not just the prefix: a banner-shaped sentence anywhere in
// index.html would be a latent false positive the day somebody widens the window.
ok(!RE.test(R("index.html")),
   "index.html matches the sub-shell banner regex — the '/' guard would refuse the homepage itself");

// ─────────────────────────────────────────────────────────────────────────────
// 3 · The homepage cannot reach a sub-shell fallback
// ─────────────────────────────────────────────────────────────────────────────
section("3 · isHome is a factor in all three sub-shell fallbacks");

for (const flag of ["isPerson", "isIssue", "isSpotlight"]) {
  const decl = new RegExp(`const ${flag} = !isHome &&`).test(SW);
  ok(decl, `sw.js: ${flag} is no longer gated on !isHome — a later edit to its regex could hand '/' a sub-shell`);
}
ok(/const isHome = key === '\/';/.test(SW), "sw.js no longer names the homepage navigation");

// ─────────────────────────────────────────────────────────────────────────────
// 4 · handleNavigate, exercised
// ─────────────────────────────────────────────────────────────────────────────
section("4 · a poisoned '/' entry is refused, dropped, and never written");

// A Response stub with a real streaming body, chunked deliberately small so the
// prefix loop has to iterate — and counting the bytes handed out, so "reads a
// bounded prefix" is a measured claim rather than a described one.
function mkRes(body, opts) {
  opts = opts || {};
  const text = String(body);
  const res = {
    ok: opts.ok !== false,
    status: opts.status || 200,
    type: "basic",
    _body: text,
    _served: 0,
    _cancelled: false,
    clone() { const c = mkRes(text, opts); c._parent = res; return c; },
    async text() { res._served += text.length; return text; },
    get body() {
      const bytes = new TextEncoder().encode(text);
      let off = 0;
      return {
        getReader() {
          return {
            async read() {
              if (off >= bytes.length) return { done: true, value: undefined };
              const value = bytes.slice(off, off + 97);   // odd size: splits multi-byte chars
              off += 97;
              const owner = res._parent || res;
              owner._served += value.length;
              return { done: false, value };
            },
            async cancel() { const owner = res._parent || res; owner._cancelled = true; },
          };
        },
      };
    },
  };
  return res;
}

function fakeCache() {
  const m = new Map();
  const k = (r) => (typeof r === "string" ? new URL(r, ORIGIN).href : String(r && r.url ? r.url : r));
  return {
    _m: m,
    async match(r) { return m.get(k(r)); },
    async put(r, res) { m.set(k(r), res); },
    async delete(r) { return m.delete(k(r)); },
    async keys() { return [...m.keys()].map((url) => ({ url })); },
  };
}

// sw.js is a classic script, so its top-level `function` declarations land on the
// context object and can be called directly — but its top-level `const`s do NOT.
// Lexical declarations live in the context's global lexical scope, which is shared
// with any later script run in the same context but is not reflected as properties
// on the global object. Hence `_eval`: SHELL_CACHE and RUNTIME_CACHE are reachable
// by evaluating their names in the worker's own context, not by reading them off it.
function bootWorker() {
  const buckets = {};
  const ctx = {
    console,
    URL, URLSearchParams, TextDecoder, TextEncoder, Request: function () {},
    // A Response that remembers its body, so the offline fallback can be told
    // apart from a document rather than merely counted as non-null.
    Response: function (body, init) { return mkRes(body == null ? '' : String(body), init || {}); },
    setTimeout, clearTimeout,
    fetch: async () => null,
    caches: {
      async open(n) { return (buckets[n] = buckets[n] || fakeCache()); },
      async keys() { return Object.keys(buckets); },
      async delete(n) { delete buckets[n]; return true; },
      async match() { return undefined; },
    },
  };
  ctx.self = ctx;
  ctx.globalThis = ctx;
  ctx.location = { origin: ORIGIN, href: ORIGIN + "/" };
  ctx.self.location = ctx.location;
  ctx.addEventListener = () => {};
  ctx.skipWaiting = async () => {};
  ctx.clients = { claim: async () => {}, matchAll: async () => [] };
  const c = vm.createContext(ctx);
  new vm.Script(SW, { filename: "sw.js" }).runInContext(c);
  ctx._eval = (expr) => vm.runInContext(expr, c);
  return ctx;
}

const nav = (path) => ({ url: ORIGIN + path, mode: "navigate", method: "GET" });

const PERSON_DOC = R("person.html");
const HOME_DOC = R("index.html");

const W = bootWorker();
must(typeof W.handleNavigate === "function", "handleNavigate is not reachable on the worker context");
must(typeof W.subShellIdOf === "function", "subShellIdOf is not reachable on the worker context");
const SHELL_CACHE = W._eval("SHELL_CACHE");
const RUNTIME_CACHE = W._eval("RUNTIME_CACHE");
must(typeof SHELL_CACHE === "string" && SHELL_CACHE, "SHELL_CACHE is not reachable in the worker context");
must(typeof RUNTIME_CACHE === "string" && RUNTIME_CACHE, "RUNTIME_CACHE is not reachable in the worker context");

// The identifier itself, against the real documents.
eq(await W.subShellIdOf(mkRes(PERSON_DOC)), "person", "subShellIdOf misreads the real person.html");
eq(await W.subShellIdOf(mkRes(HOME_DOC)), "", "subShellIdOf claims the real index.html is a sub-shell");
eq(await W.subShellIdOf(mkRes(R("issue.html"))), "issue", "subShellIdOf misreads the real issue.html");
eq(await W.subShellIdOf(mkRes(R("spotlight.html"))), "spotlight", "subShellIdOf misreads the real spotlight.html");
eq(await W.subShellIdOf(null), "", "subShellIdOf threw or guessed on a missing response");

// A body with no banner is ACCEPTED. Fail-open is deliberate: a document cached
// before this pass must be served, not refused.
eq(await W.subShellIdOf(mkRes("<!DOCTYPE html><html><head><title>whatever</title>")), "",
   "an unmarked document is being treated as a sub-shell — the guard fails closed instead of open");

// Bounded prefix, measured: identifying the 2.2 MB homepage must not decode it.
{
  const probe = mkRes(HOME_DOC);
  await W.subShellIdOf(probe);
  ok(probe._served > 0, "subShellIdOf never read the body at all");
  ok(probe._served <= sniffChars * 4 + 512,
     `subShellIdOf read ${probe._served} bytes of a ${HOME_DOC.length}-char document — the prefix ceiling is not being honoured`);
  ok(probe._cancelled, "subShellIdOf drained the stream instead of cancelling it");
}

// ── The live symptom: '/' holding a person document ────────────────────────
{
  const w = bootWorker();
  const shell = await w.caches.open(SHELL_CACHE);
  await shell.put("/", mkRes(PERSON_DOC));              // the pre-v187 poisoning
  let fetched = 0;
  w.fetch = async () => { fetched++; return mkRes(HOME_DOC); };

  const res = await w.handleNavigate(nav("/"));
  eq(await w.subShellIdOf(res), "", "a '/' navigation was answered with the cached person document");
  eq(fetched, 1, "the poisoned entry was served from cache instead of going to the network");

  // …and it is GONE, so the next homepage navigation is clean rather than paying
  // the check forever. The network's own homepage body took its place.
  const healed = await shell.match("/");
  ok(!!healed, "the '/' slot was left empty instead of being refilled by the network");
  eq(await w.subShellIdOf(healed), "", "the poisoned '/' entry survived the navigation that refused it");
}

// ── The write half: '/' must not LEARN to be a sub-shell ───────────────────
{
  const w = bootWorker();
  const shell = await w.caches.open(SHELL_CACHE);
  w.fetch = async () => mkRes(PERSON_DOC);

  const res = await w.handleNavigate(nav("/"));
  // The reader still sees what the network said — refusing to remember a
  // document is the worker's business; refusing to show it is not.
  eq(await w.subShellIdOf(res), "person", "handleNavigate swallowed the network's response for '/'");
  eq(await shell.match("/"), undefined,
     "a sub-shell body was written into the '/' slot — this is the defect that made one device's homepage a person file for good");
}

// ── Offline, holding poison: refuse it AND be rid of it ────────────────────
// The refusal alone would leave the entry in place to be refused again on every
// navigation for the life of the device. The network is down here, so nothing
// arrives to overwrite it and the deletion is the only thing that can clear it.
{
  const w = bootWorker();
  const shell = await w.caches.open(SHELL_CACHE);
  await shell.put("/", mkRes(PERSON_DOC));
  w.fetch = async () => { throw new Error("offline"); };

  const res = await w.handleNavigate(nav("/"));
  const id = res && typeof res.clone === "function" ? await w.subShellIdOf(res) : "";
  eq(id, "", "an offline homepage navigation was answered with the poisoned person document");
  eq(await shell.match("/"), undefined,
     "the poisoned '/' entry survived an offline navigation — the check would be paid on every navigation forever instead of once");
}

// ── A 5xx must not be mistaken for a heal ──────────────────────────────────
// The network answered, so `res` is truthy, but a non-ok response is never
// stored — so the slot still holds poison and inferring "healed" from "the
// network replied" would leave it there.
{
  const w = bootWorker();
  const shell = await w.caches.open(SHELL_CACHE);
  await shell.put("/", mkRes(PERSON_DOC));
  w.fetch = async () => mkRes("<h1>Bad Gateway</h1>", { ok: false, status: 502 });

  await w.handleNavigate(nav("/"));
  eq(await shell.match("/"), undefined,
     "a 502 on the homepage left the poisoned '/' entry in place");
}

// ── A clean homepage entry is still served instantly ───────────────────────
{
  const w = bootWorker();
  const shell = await w.caches.open(SHELL_CACHE);
  await shell.put("/", mkRes(HOME_DOC));
  let fetched = 0;
  w.fetch = async () => { fetched++; return mkRes(HOME_DOC); };

  const res = await w.handleNavigate(nav("/"));
  eq(res._body.length, HOME_DOC.length, "a cached homepage was not served from cache");
  ok(!!(await shell.match("/")), "the stale-while-revalidate homepage entry was dropped");
}

// ── Offline, with a poisoned '/' and nothing else: refuse, don't lie ───────
{
  const w = bootWorker();
  const shell = await w.caches.open(SHELL_CACHE);
  await shell.put("/", mkRes(PERSON_DOC));
  w.fetch = async () => { throw new Error("offline"); };

  const res = await w.handleNavigate(nav("/d/hd68"));
  ok(res, "the offline path returned nothing at all");
  const id = res && typeof res.clone === "function" ? await w.subShellIdOf(res) : "";
  eq(id, "", "an offline navigation to /d/<district> was handed the person document sitting under '/'");
}

// ── And none of this touched the person lane ───────────────────────────────
{
  const w = bootWorker();
  w.fetch = async () => mkRes(PERSON_DOC);
  const res = await w.handleNavigate(nav("/p/lee"));
  eq(await w.subShellIdOf(res), "person", "a person address stopped being answered with its own document");
  const runtime = await w.caches.open(RUNTIME_CACHE);
  ok(!!(await runtime.match("/p/lee")),
     "a person document is no longer keyed to its own address in the runtime bucket");
  const shell = await w.caches.open(SHELL_CACHE);
  eq(await shell.match("/"), undefined, "a person navigation wrote to the '/' shell slot");
}

// ─────────────────────────────────────────────────────────────────────────────
// 5 · The shell bump that carries it
// ─────────────────────────────────────────────────────────────────────────────
section("5 · the version moved, so a warm device gets this worker");

const ver = /const CACHE_VERSION = 'v(\d+)';/.exec(SW);
must(ver, "sw.js no longer declares a CACHE_VERSION in the form this file reads");
ok(Number(ver[1]) >= 188,
   `CACHE_VERSION is v${ver[1]} — app.css and person-file.js are precached and both changed for this fix`);

console.log("");
if (failures.length) {
  console.error(`✗ close-to-home: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ close-to-home: the X leaves, and '/' can only ever be index.html — ${passed} assertions passed\n`);
