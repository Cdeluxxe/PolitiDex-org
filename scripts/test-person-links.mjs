#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   test-person-links.mjs — a surface that names a politician links to them
   ────────────────────────────────────────────────────────────────────────────
   /p/<pid> became a real document, and then nothing linked to it. Every card,
   row and cell that opened a person file did it with a click handler on a
   <div>, a <button> or an onclick attribute, so:

     · the homepage's served markup named nobody and linked nowhere, and the
       sitemap was the only path a crawler had into any person file;
     · "open in new tab" and middle-click — both features of <a href> and of
       nothing else — did nothing on every name on the site;
     · with JavaScript off, or before it ran, the page held no statement of
       where a record lived.

   This file pins the fix. What has to stay true:

     1. THE HELPER IS ON THE PAGE, BEFORE THE FIRST PAINT. One builder
        (person-link.js), loaded parser-blocking ahead of the first surface that
        can name someone, and precached with the rest of the shell.
     2. THE ADDRESS IS THE CANONICAL ONE. Driven against the app's own alias
        table: `scott_chew` is advertised as /p/chew_h68, because publishing two
        addresses for one officeholder is the defect the /p/ arrival path was
        fixed to prevent — reintroduced from the other end.
     3. THE PLAIN CLICK IS STILL THE APP'S. It opens the in-app file, exactly as
        the old handler did. A modified click, a middle click and a target are
        the browser's. A click another surface already took is not taken twice.
        And if nothing can open the file, the link is left to navigate.
     4. THE HOMEPAGE SAYS THE ADDRESSES OUT LOUD. view-source of / contains
        href="/p/lee" on a real anchor, generated from the same seed the cards
        rotate through, so the strip cannot name someone the rotation does not.
     5. EVERY LISTED SURFACE PAINTS A REAL LINK. The hero card name, the eye's
        people and stance rows, the seat rows, the compare column head, the race
        sheet's field names and the ballot workspace's candidates — driven, and
        asserted on the markup each one actually produces.
     6. AND NOTHING PAINTS A FAKE ONE. No javascript:void(0), no href="#" with
        the address hidden in a dataset, no anchor inside an anchor, no button
        inside the new link.

   Real shipped modules in node:vm sandboxes with a stub DOM. No network, no
   database, no browser.

     node scripts/test-person-links.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import {
  makeSandbox, loadEngine, canonicaliser, buildFeatured, buildCrawlHtml,
  readCrawlBlock, CRAWL_BEGIN, CRAWL_END, ALIAS_FILE,
} from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — ${JSON.stringify(needle)} missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — ${JSON.stringify(needle)} present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
// A probe whose target was renamed makes every assertion built on it vacuously
// true. That is a broken harness, not a passing contract.
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ person links: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

const HTML = R("index.html");
const PLINK = R("person-link.js");
const SW = R("sw.js");

// ── The audit every painted surface goes through ─────────────────────────────
// One scanner, applied to real painted markup rather than to a promise about it.
// It reads the person anchors out of a string and reports every way the pattern
// could have been faked or nested. Deliberately literal: no DOM parser here, so
// what it checks is what a crawler reading the bytes would see.
function linkAudit(html, where) {
  const src = String(html || "");
  const found = [];
  const bad = [];
  let i = 0;
  while ((i = src.indexOf("<a", i)) >= 0) {
    const gt = src.indexOf(">", i);
    if (gt < 0) break;
    const tag = src.slice(i, gt + 1);
    if (!/^<a[\s>]/.test(tag)) { i = gt + 1; continue; }
    if (tag.indexOf("data-pdx-person-link") < 0) { i = gt + 1; continue; }
    const close = src.indexOf("</a>", gt);
    const inner = close < 0 ? src.slice(gt + 1) : src.slice(gt + 1, close);
    const href = (tag.match(/href="([^"]*)"/) || [])[1];
    const pid = (tag.match(/data-pdx-person-link="([^"]*)"/) || [])[1];
    found.push({ tag, inner, href, pid });
    if (!href) bad.push(`${where}: a person link has no href at all — ${tag}`);
    if (href && !/^\/p\/[A-Za-z0-9_]+$/.test(href)) {
      bad.push(`${where}: href is not a person address — ${JSON.stringify(href)}`);
    }
    if (href && pid && href !== `/p/${pid}`) {
      bad.push(`${where}: the href and the click target disagree — ${href} vs ${pid}`);
    }
    if (/<a[\s>]/.test(inner)) bad.push(`${where}: an anchor is nested inside a person link — ${tag}`);
    if (/<button[\s>]/.test(inner)) bad.push(`${where}: a <button> is nested inside a person link — ${tag}`);
    if (/\srole="button"/.test(tag)) {
      bad.push(`${where}: a person link claims role="button", which tells a screen reader it is not a link — ${tag}`);
    }
    // An anchor with no accessible text is a link to nowhere for a reader who
    // cannot see the photo it wraps.
    const text = inner.replace(/<[^>]*>/g, "").replace(/&[a-z]+;|&#\d+;/g, "x").trim();
    if (!text && !/aria-label="[^"]+"/.test(tag)) {
      bad.push(`${where}: a person link has neither text nor an aria-label — ${tag}`);
    }
    i = close < 0 ? gt + 1 : close + 4;
  }
  // The two lies the brief ruled out by name, checked over the whole surface and
  // not only inside the anchors, because either one could appear on a sibling
  // control that opens the same file.
  if (/href="javascript:/i.test(src)) bad.push(`${where}: href="javascript:…" is painted somewhere on this surface`);
  if (/href="#"[^>]*data-pdx-person-link/.test(src) || /data-pdx-person-link[^>]*href="#"/.test(src)) {
    bad.push(`${where}: a person link uses href="#" with the address hidden in a dataset`);
  }
  return { found, bad };
}
const audit = (html, where, least) => {
  const { found, bad } = linkAudit(html, where);
  bad.forEach((b) => failures.push(b));
  if (!bad.length) passed++;
  ok(found.length >= (least === undefined ? 1 : least),
    `${where}: painted ${found.length} person link(s), expected at least ${least === undefined ? 1 : least}`);
  return found;
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the one helper is on the page, before anything can name anybody");
// ═════════════════════════════════════════════════════════════════════════════
const tagAt = HTML.indexOf('<script src="/person-link.js"></script>');
must(tagAt !== -1, "index.html no longer loads /person-link.js as a parser-blocking script");
const heroAt = HTML.indexOf('src="/hero-showcase.js"');
must(heroAt !== -1, "index.html no longer loads hero-showcase.js — the ordering check is vacuous");
ok(tagAt < heroAt,
  "wiring: person-link.js loads AFTER the hero renderer, so the first frame of the first surface that\n" +
  "    names anyone paints a name with no address on it");
lacks(HTML.slice(tagAt, tagAt + 60), "defer",
  "wiring: person-link.js is deferred — the hero paints its identity frame during parse, so a deferred\n" +
  "    helper is a helper that is not there when the first card is built");
has(SW, "'/person-link.js',", "wiring: the service worker no longer precaches person-link.js");
must(/CACHE_VERSION = 'v(\d+)'/.test(SW), "sw.js no longer declares CACHE_VERSION");
ok(Number(SW.match(/CACHE_VERSION = 'v(\d+)'/)[1]) >= 93,
  "wiring: CACHE_VERSION was not bumped past the release that added person-link.js, so an existing\n" +
  "    reader keeps a shell that has no such file and every link falls back to a plain name");

// BUDGET. This file sits in the parser-blocking head, ahead of the hero — the
// same critical path test-hero-showcase.mjs measures and the reason its own
// budget was raised for this pass. It is a link builder and a click router and
// nothing else, so if it ever needs more than this, something that belongs to a
// surface has been moved into it.
const plinkGz = gzipSync(Buffer.from(PLINK, "utf8")).length;
ok(plinkGz < 5 * 1024,
  `wiring: payload — person-link.js is ${plinkGz} B gzipped (budget 5 KB) on the parser-blocking\n` +
  "    critical path");

// The pid shape is pinned in four places and they have to agree, or an id one of
// them accepts becomes an address another one refuses to serve.
must(/var PID_RE = \/\^\[A-Za-z0-9_\]\+\$\//.test(PLINK), "person-link.js's PID_RE moved");
must(/var PATH_RE = \/\^\\\/p\\\/\(\[A-Za-z0-9_\]\+\)\\\/\?\$\//.test(R("person-file.js")),
  "person-file.js's PATH_RE moved — the shape agreement check is vacuous");
ok(R("publication-floor.js").includes("var PID_RE = /^[a-z0-9_]+$/"),
  "wiring: the floor's pid shape moved, so nothing here proves the address shape is still shared");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the address is the canonical one, resolved by the app's own table");
// ═════════════════════════════════════════════════════════════════════════════
// The REAL alias table, loaded the way the generator loads it. A hand-written
// stub here would prove only that this test agrees with itself.
const ENGINE = loadEngine(ROOT, [ALIAS_FILE]);
const canon = canonicaliser(ENGINE);
must(typeof ENGINE.PDXProfilePid === "function", "PDXProfilePid is not available from the shipped files");
must(canon("scott_chew") === "chew_h68",
  "the shipped alias table no longer folds scott_chew into chew_h68 — the retired-id case is vacuous");

// person-link.js, driven on top of that same table.
function helper(over) {
  const win = makeSandbox();
  win.PDXProfilePid = ENGINE.PDXProfilePid;
  const clicks = [];
  win.PDXPerson = { open: (pid, o) => { clicks.push([pid, o && o.section]); return true; } };
  Object.assign(win, over || {});
  vm.runInContext(PLINK, vm.createContext(win), { filename: "person-link.js" });
  return { win, PL: win.PDXPersonLink, clicks };
}
const H = helper();
must(H.PL && typeof H.PL.anchor === "function", "person-link.js did not export PDXPersonLink.anchor()");

eq(H.PL.href("lee"), "/p/lee", "helper: the plain case");
eq(H.PL.href("scott_chew"), "/p/chew_h68",
  "helper: a retired id is advertised at its own address, which publishes one officeholder as two");
eq(H.PL.href("chew_h68"), "/p/chew_h68", "helper: the canonical id resolves to itself");
eq(H.PL.href("nobody_here_at_all"), "/p/nobody_here_at_all",
  "helper: an id nobody has ruled on was rewritten — the table hops only where it has a record, and a\n" +
  "    link to the id the row already opens is right everywhere else");
eq(H.PL.href(""), "", "helper: an empty id produced an address");
eq(H.PL.href("../../etc/passwd"), "", "helper: a non-pid string was turned into a path");
eq(H.PL.href('lee" onmouseover="x'), "", "helper: an attribute break-out was accepted as a pid");
eq(H.PL.attrs("scott_chew"), 'href="/p/chew_h68" data-pdx-person-link="chew_h68"',
  "helper: the click target is not the canonical id, so the link and the app would open two people");
has(H.PL.attrs("lee", { section: "pdxsec-standout" }), 'data-pdx-person-section="pdxsec-standout"',
  "helper: a section is not carried, so a card that lands on the record cannot say so");
lacks(H.PL.attrs("lee", { section: "pdxsec-standout" }), "/p/lee#",
  "helper: the section leaked into the href — one person, one advertised address");

const A = H.PL.anchor("scott_chew", "Scott Chew", { cls: "x-name" });
has(A, 'href="/p/chew_h68"', "helper: anchor() dropped the address");
has(A, ">Scott Chew<", "helper: anchor() dropped the label");
audit(A, "helper: anchor()");
eq(H.PL.anchor("../nope", "Nobody"), "<span>Nobody</span>",
  "helper: an unlinkable id produced an anchor anyway — a name with no address is a span, never an\n" +
  "    <a> with no href");
has(H.PL.anchor("lee", "x", { html: '<mark>M</mark>ike Lee' }), "<mark>M</mark>ike Lee",
  "helper: rich inner markup (the eye's query highlighting) is not passed through");
has(H.PL.anchor("lee", '<script>alert(1)</script>'), "&lt;script&gt;",
  "helper: a label is interpolated unescaped");

// FAIL OPEN: with no alias table loaded — the state the page is in for the first
// few milliseconds — the raw id is still a working address.
const cold = helper({ PDXProfilePid: undefined });
eq(cold.PL.href("lee"), "/p/lee", "helper: with no alias table the plain case stopped linking");
eq(cold.PL.href("scott_chew"), "/p/scott_chew",
  "helper: the cold fallback is the raw id — right for everyone but the retired handful, and better\n" +
  "    than no link");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the plain click is the app's; the rest belong to the browser");
// ═════════════════════════════════════════════════════════════════════════════
// A minimal anchor, and an event shaped like the one the document listener gets.
const mkAnchor = (attrs) => ({
  _a: Object.assign({ "data-pdx-person-link": "lee" }, attrs || {}),
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._a, k) ? this._a[k] : null; },
  closest(sel) { return sel === "a[data-pdx-person-link]" ? this : null; },
});
const mkEvent = (over) => {
  const ev = {
    defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false,
    shiftKey: false, altKey: false,
    preventDefault() { this.defaultPrevented = true; this._prevented = true; },
  };
  ev.target = (over && over.target) || mkAnchor();
  return Object.assign(ev, over || {});
};
const fire = (h, over) => { const ev = mkEvent(over); h.PL._onClick(ev); return ev; };

{
  const h = helper();
  const ev = fire(h);
  eq(h.clicks.length, 1, "click: a plain click did not open the in-app file — the whole point of keeping the\n" +
    "    click is that the reader stays where they are");
  eq(ev._prevented, true, "click: a plain click was allowed to navigate as well, so the file opens twice");
}
{
  const h = helper();
  const ev = fire(h, { metaKey: true });
  eq(h.clicks.length, 0, "click: ⌘-click was swallowed by the app — that is the reader asking for a new tab");
  eq(ev._prevented, undefined, "click: ⌘-click was preventDefault'd, which is how an href stops working");
}
{
  const h = helper();
  fire(h, { button: 1 });
  eq(h.clicks.length, 0, "click: a middle click was swallowed by the app");
}
for (const k of ["ctrlKey", "shiftKey", "altKey"]) {
  const h = helper();
  fire(h, { [k]: true });
  eq(h.clicks.length, 0, `click: ${k} is the browser's, and the app took it`);
}
{
  const h = helper();
  const ev = fire(h, { defaultPrevented: true });
  eq(h.clicks.length, 0,
    "click: a click a surface already handled was opened a second time — every listed surface prevents\n" +
    "    the default when it opens the file itself, and this listener has to read that");
}
{
  const h = helper();
  fire(h, { target: mkAnchor({ target: "_blank" }) });
  eq(h.clicks.length, 0, "click: a link that asked for a new tab was opened in place instead");
}
{
  // Nothing can open it: PDXPerson absent, showProfile absent. The default must
  // NOT be prevented, so the href navigates and the reader still gets the file.
  const h = helper({ PDXPerson: undefined, showProfile: undefined });
  const ev = fire(h);
  eq(ev._prevented, undefined,
    "click: with no opener on the page the click was still cancelled, which turns a real address into a\n" +
    "    dead name — the one thing an <a href> is supposed to survive");
}
{
  // The legacy funnel is still honoured, because several surfaces still route
  // through it and a half-loaded page will have one and not the other.
  const opened = [];
  const h = helper({ PDXPerson: undefined, showProfile: (pid) => opened.push(pid) });
  const ev = fire(h);
  eq(opened.join(), "lee", "click: showProfile() is no longer the fallback opener");
  eq(ev._prevented, true, "click: the fallback open did not cancel the navigation");
}
{
  // The section rides along on the click, not on the address.
  const h = helper();
  fire(h, { target: mkAnchor({ "data-pdx-person-section": "pdxsec-standout" }) });
  eq(String(h.clicks[0] && h.clicks[0][1]), "pdxsec-standout",
    "click: the section the surface asked for did not reach PDXPerson.open");
}
{
  // A click on something that is not a person link is not this listener's.
  const h = helper();
  const ev = mkEvent({ target: { closest: () => null } });
  h.PL._onClick(ev);
  eq(h.clicks.length, 0, "click: a click on unrelated markup opened a person file");
  eq(ev._prevented, undefined, "click: a click on unrelated markup was cancelled");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · view-source of / states the addresses, from the same seed");
// ═════════════════════════════════════════════════════════════════════════════
must(HTML.indexOf(CRAWL_BEGIN) !== -1 && HTML.indexOf(CRAWL_END) !== -1,
  "the hero crawl sentinels are gone from index.html");
eq(HTML.split(CRAWL_BEGIN).length - 1, 1, "homepage: the crawl-block begin sentinel appears more than once");
eq(HTML.split(CRAWL_END).length - 1, 1, "homepage: the crawl-block end sentinel appears more than once");

const STRIP = readCrawlBlock(HTML);
must(STRIP.length > 0, "the static record strip is empty — section 4 is vacuous");
has(HTML, 'href="/p/lee"',
  "homepage: the served markup does not contain href=\"/p/lee\" — a crawler reading / still has no way\n" +
  "    to discover a person file, which is the defect this pass exists to fix");
const stripLinks = audit(STRIP, "homepage strip", 6);
has(STRIP, '<a class="pdx-hs-crawl-a" href="/p/lee" data-pdx-person-link="lee">Mike Lee</a>',
  "homepage: the Mike Lee row is not a plain, whole anchor with the name inside it");
lacks(STRIP, "<nav", "homepage: the strip is a <nav> — these are record links in the page, not site navigation");
lacks(STRIP, "onclick", "homepage: the strip carries an inline handler; the href is the behaviour here");
lacks(STRIP, "hidden", "homepage: the strip is hidden markup, which is a different thing with a worse name");

// It cannot drift from the cards: same generator, same seed, same order.
const featured = buildFeatured(ENGINE);
must(featured.length > 0, "the hero seed builder returned nobody — the drift check is vacuous");
eq(STRIP, buildCrawlHtml(featured, canon),
  "homepage: the strip in index.html is not what scripts/gen-hero-showcase.mjs would write for the\n" +
  "    current seed — re-run the generator. A strip that names a different set from the rotation is\n" +
  "    exactly the second, drifting list this was built to avoid");
eq(stripLinks.map((l) => l.pid).join(","), featured.map((r) => canon(r.pid)).join(","),
  "homepage: the strip's people are not the seed's people, in the seed's order");
eq(stripLinks.filter((l) => !/^\/p\/[a-z0-9_]+$/.test(l.href)).length, 0,
  "homepage: an advertised address is outside the roster's own id shape");

// Every href in the strip is canonical, and so is every pid the CARDS will paint
// from the same seed — the hero's identity frame runs before the alias table
// loads, so a retired id in the seed would be advertised raw on the card.
const rawAliases = featured.filter((r) => canon(r.pid) !== r.pid);
eq(rawAliases.map((r) => r.pid).join(","), "",
  "homepage: the seed carries a retired id, so the painted card would advertise the alias while the\n" +
  "    strip advertises the canonical address — two URLs for one officeholder. Fix the seed, not the\n" +
  "    link: hero-showcase.js paints before profile-evidence.js can fold it");

// The seed is also what hero-showcase-data.js ships, so the strip is anchored to
// the file the browser actually reads, not only to a rebuild.
const SEEDJS = R("hero-showcase-data.js");
for (const l of stripLinks) {
  has(SEEDJS, `"pid": "${l.pid}"`,
    `homepage: the strip advertises ${l.pid}, who is not in the shipped seed the cards rotate through`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the homepage hero card: the NAME is the link, not the card");
// ═════════════════════════════════════════════════════════════════════════════
{
  const HERO = R("hero-showcase.js");
  // The hero shows ONE card per boot (the day index picks it), so each fixture
  // here is one person — which also makes the alias case unambiguous rather than
  // dependent on which card came up.
  const paintHero = (seed) => {
    const host = {
      innerHTML: "", hidden: true, style: {}, dataset: {},
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
      setAttribute() {}, getAttribute: () => null, removeAttribute() {},
      addEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
      closest: () => null, appendChild: (c) => c, scrollIntoView() {},
    };
    const win = makeSandbox();
    win.document.getElementById = (id) => (id === "hero-showcase" ? host : null);
    win.requestAnimationFrame = (fn) => fn();
    win.PDXProfilePid = ENGINE.PDXProfilePid;
    win.PDX_HERO_SHOWCASE = seed;
    win._getPhotoUrl = (pid) => `https://img.test/${pid}.jpg`;
    const ctx = vm.createContext(win);
    vm.runInContext(PLINK, ctx, { filename: "person-link.js" });
    vm.runInContext(HERO, ctx, { filename: "hero-showcase.js" });
    return String(host.innerHTML);
  };

  const out = paintHero([
    { pid: "lee", name: "Mike Lee", office: "U.S. Senator · Utah", party: { label: "R", color: "#f87171" } },
  ]);
  must(out.length > 0, "the hero renderer painted nothing at all — section 5 is vacuous");
  has(out, 'href="/p/lee"', "hero card: the name is not a link to the record it opens");
  const links = audit(out, "hero card");
  eq(links.length, 1,
    "hero card: expected exactly one person link on the card — the name. The card itself holds a share\n" +
    "    button and a record button, so wrapping it would nest controls inside a link");
  has(out, '<h2 class="pdx-hs-name"><a', "hero card: the link is not the heading's own name");
  lacks(out, '<a class="pdx-hs-card"', "hero card: the whole card became an anchor, nesting its buttons inside a link");
  has(out, 'data-pdx-person-section="pdxsec-standout"',
    "hero card: the link no longer lands on the record section, so tapping the name lands somewhere\n" +
    "    other than where tapping the card always did");

  // The alias fixture, painted by a real surface: the raw retired id goes in, the
  // canonical address comes out.
  const aliased = paintHero([
    { pid: "scott_chew", name: "Scott Chew", office: "State Representative · Utah", party: null },
  ]);
  must(/Scott Chew/.test(aliased), "the hero painted no card for the alias fixture — the alias case is vacuous");
  has(aliased, 'href="/p/chew_h68"',
    "hero card: a card built from the retired id does not advertise the canonical address");
  lacks(aliased, 'href="/p/scott_chew"', "hero card: the retired alias is being advertised as an address");
  audit(aliased, "hero card (alias)");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the All-Seeing Eye: people rows and stance rows are links");
// ═════════════════════════════════════════════════════════════════════════════
{
  const EYE = R("all-seeing-eye.js");
  const node = (cls) => {
    const set = new Set(String(cls || "").split(/\s+/).filter(Boolean));
    return {
      innerHTML: "", value: "", tagName: "DIV", style: {}, scrollHeight: 22,
      classList: {
        add: (c) => set.add(c), remove: (c) => set.delete(c), contains: (c) => set.has(c),
        toggle: (c, on) => { const w = on === undefined ? !set.has(c) : !!on; if (w) set.add(c); else set.delete(c); return w; },
      },
      addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
      setAttribute() {}, getAttribute: () => null, removeAttribute() {},
      focus() {}, blur() {}, scrollIntoView() {},
      querySelector: () => null, querySelectorAll: () => [], closest: () => null,
      contains: () => false, matches: () => false, appendChild: (c) => c,
    };
  };
  const panel = node(), input = node(), eye = node(), clear = node();
  input.tagName = "TEXTAREA";
  const win = makeSandbox();
  const ids = { "pdx-eye-panel": panel, "pdx-eye-input": input, "pdx-eye": eye, "pdx-eye-clear": clear };
  win.document.getElementById = (id) => ids[id] || null;
  win.PDXProfilePid = ENGINE.PDXProfilePid;
  const ROSTER = {
    chew_h68: { name: "Scott Chew", office: "State Representative", state: "Utah", party: "R" },
    lee: { name: "Mike Lee", office: "U.S. Senator", state: "Utah", party: "R" },
  };
  win.CMP_DATA = ROSTER;
  win.PROFILES = ROSTER;
  win.ISSUE_STANCE_DATA = {
    chew_h68: [{ topic: "Water", text: "Backed the closed-loop cooling rule.", issueKey: "water", pos: "supports" }],
  };
  win.PDXLazyData = { loaded: () => true, ensure: () => Promise.resolve(true), whenReady: (k, cb) => cb && cb() };
  const ctx = vm.createContext(win);
  vm.runInContext(PLINK, ctx, { filename: "person-link.js" });
  vm.runInContext(EYE, ctx, { filename: "all-seeing-eye.js" });
  must(win.PDXEye && typeof win.PDXEye.render === "function", "PDXEye.render() is not exposed — section 6 is vacuous");

  // THE DEFAULT LANE IS THE FORMAL ONE, and a person row is in both — a name is a
  // name whichever lane you are reading. The match tolerates the highlight
  // <mark> the row wraps the matched term in, because the row's own name span is
  // the thing being checked and it has never been one flat string.
  win.PDXEye.render("Chew");
  const out = String(panel.innerHTML);
  must(/Scott <mark>Chew<\/mark>|Scott Chew/.test(out),
    "the eye found nobody for a roster it was handed — section 6 is vacuous");
  has(out, 'href="/p/chew_h68"',
    "eye: a people row is not a link to the record it opens, so nothing in the panel can be opened in a\n" +
    "    new tab and no crawler can walk from the search into a file");
  lacks(out, 'href="/p/scott_chew"', "eye: a row advertises the retired alias");
  const links = audit(out, "eye rows");
  ok(links.every((l) => l.tag.includes('role="option"')),
    "eye: a person row lost role=\"option\", which is what makes the panel a listbox to a screen reader");
  lacks(out, '<button type="button" role="option" class="pdx-eye-item" data-i',
    "eye: a person row is still a <button> — the address exists and is not in the markup");

  // The stance answer names a person too, and it reaches the same row builder by
  // a different route (a topic query, not a name query), so it gets its own pass.
  // A STANCE IS A QUOTE, so it lives in the Eye's public lane — a stated position
  // is not a formal act, and the two lanes were split precisely so that one list
  // stops pretending otherwise. The lane is set rather than clicked because the
  // stub DOM has no event dispatch; PDXEye.lane() is the same state the toggle
  // writes, and the query string is untouched by either.
  eq(win.PDXEye.lane("public"), "public", "the Eye has no public lane to put a quote in");
  win.PDXEye.render("water");
  const stance = String(panel.innerHTML);
  must(/pdx-eye-item/.test(stance) && /Scott Chew|chew_h68/.test(stance),
    "a topic query named nobody for a roster that has exactly one stance on it — the stance-row check\n" +
    "    is vacuous, so it now fails instead of passing quietly");
  audit(stance, "eye stance rows");
  lacks(stance, 'href="/p/scott_chew"', "eye: a stance row advertises the retired alias");
  eq(win.PDXEye.lane("formal"), "formal", "the Eye cannot be put back in its default lane");

  // The rows that are NOT a person keep their buttons: there is no address to
  // advertise for a bill, an issue lane or a saved search, and inventing one
  // would be worse than a button. Stated as an invariant over the source's row
  // builders rather than over one fixture's output, because a fixture that
  // happens to yield no bill row would make an output check say nothing.
  const rows = EYE.match(/^ *return (?:rowOpen\(|'<button type="button" role="option" class=")[^\n]*pdx-eye-item[^\n]*$/gm) || [];
  ok(rows.length >= 6,
    `eye: found ${rows.length} row builders, expected the six the panel has — this invariant is\n` +
    "    reading the wrong thing");
  // rowOpen() is the builder that asks PDXPersonLink for an address and falls
  // back to a button when there is none, so the count of its callers is the count
  // of row kinds that live at /p/<pid>. There are three: the roster row, the
  // stance row, and — since the Eye grew a judicial lane — the judge row. A
  // retention seat is not in CMP_DATA and never will be, but /p/<judge> is a
  // served path with a complete file behind it, so an anchor is the honest
  // element for it and a button would be the one hiding a real address.
  ok(rows.filter((r) => r.includes("rowOpen(")).length === 3,
    "eye: the rows built by rowOpen() are no longer the three kinds that have a /p/ file, so either\n" +
    "    one of them lost its link or a row gained an address it has no file for");
  // A MANDATE ROW IS THE THIRD LEGITIMATE BUTTON. A People's Mandate item is a
  // proposed vehicle: it has no /i/ file, no /p/ file and no address of any kind,
  // so a button is the honest element for it and an href would be the invention
  // this list exists to forbid.
  ok(rows.filter((r) => r.includes("<button")).every((r) => /data-kind="(bill|saved|mandate)"|idx \+ '" ' \+ attr/.test(r)),
    "eye: a row that is neither a bill, a saved search, a mandate nor an issue lane is still a bare <button>");
  // AND THE THIRD KIND OF ROW THAT NOW HAS AN ADDRESS — WHERE THERE IS ONE. /i/<key>
  // is a served path, so a LEAF issue-file row is an anchor for the same reason a
  // person row is: copy, new tab, middle click. A FAMILY row is not, and that is not
  // an oversight: a core is the set of keys filed under it, issueProfileHtml() paints
  // a census for one key, and there is nothing at /i/<coreKey> for an anchor to open.
  // Both rows come off one builder, so the builder decides its own element — which is
  // the thing this section is really about, since inventing an address for a row that
  // has no file is the exact failure it forbids everywhere else.
  has(EYE, "function fileRowHtml", "eye: the issue-file / family row builder is gone");
  const fileRow = EYE.slice(EYE.indexOf("function fileRowHtml"), EYE.indexOf("function issueFileItem"));
  has(fileRow, '<a role="option"', "eye: an issue-file row is a button, and /i/<key> is a real address");
  has(fileRow, '<button type="button" role="option"',
    "eye: the row builder has only one element, so a family with no file is still an anchor");
  // The path is still asked for rather than spelled: issueFileHref() is the gate —
  // published key, and not one of the thirteen cores — and issueFileUrl() behind it
  // is what asks the address module for the spelling.
  has(fileRow, "issueFileHref(", "eye: the row builder no longer asks whether there is a file at that address");
  has(EYE, "function issueFileHref", "eye: the gate that answers 'is there a file here' is gone");
  const gate = EYE.slice(EYE.indexOf("function issueFileHref"), EYE.indexOf("function isCoreKey"));
  has(gate, "issueFileUrl(", "eye: an issue-file row spells its own path instead of asking the address module");
  has(gate, "isCoreKey(", "eye: the gate no longer refuses a core, so a family row can address a file again");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · Who Represents Me: the whole seat row is the link");
// ═════════════════════════════════════════════════════════════════════════════
{
  const WRM = R("who-represents-me.js");
  const mkEl = (id) => {
    const attrs = {};
    return {
      id, innerHTML: "",
      setAttribute: (k, v) => { attrs[k] = String(v); },
      getAttribute: (k) => (k in attrs ? attrs[k] : null),
      removeAttribute: (k) => { delete attrs[k]; },
      scrollIntoView() {},
    };
  };
  const sec = mkEl("who-represents-me");
  const host = mkEl("wrm-reps");
  const win = makeSandbox();
  win.document.getElementById = (i) => (i === "who-represents-me" ? sec : (i === "wrm-reps" ? host : null));
  win.PDXProfilePid = ENGINE.PDXProfilePid;
  win._hasUserLocation = true;
  // The resolver hands the band whatever id the seat map holds, retired or not,
  // and the roster answers for both spellings — which is exactly the state that
  // makes the href, not the row, the thing that has to canonicalise.
  win._pdxPersonById = (pid) => ({
    scott_chew: { name: "Scott Chew", party: "R", office: "State Representative" },
    chew_h68: { name: "Scott Chew", party: "R", office: "State Representative" },
    lee: { name: "Mike Lee", party: "R", office: "U.S. Senator" },
  }[pid] || null);
  win._getPhotoUrl = () => "/img/x.jpg";
  win.pdxRepsForMe = () => ({
    located: true, national: false, state: "Utah", area: "Vernal, Uintah County",
    redrawn: false, districtsResolvable: true,
    levels: [
      { key: "ussenate1", label: "U.S. Senate", tierLabel: "U.S. Senate", color: "#f0abfc",
        statewide: true, district: null, distLabel: "U.S. Senate · Utah", pid: "lee", resolved: true },
      { key: "statehouse", label: "State House", tierLabel: "State House", color: "#2dd4bf",
        statewide: false, district: "69", distLabel: "State House · District 69", pid: "scott_chew", resolved: true },
    ],
  });
  const ctx = vm.createContext(win);
  vm.runInContext(PLINK, ctx, { filename: "person-link.js" });
  vm.runInContext(WRM, ctx, { filename: "who-represents-me.js" });
  const out = String(host.innerHTML);
  must(out.length > 0 && /Mike Lee/.test(out), "the band painted no rows — section 7 is vacuous");
  has(out, '<a class="wrm-row"', "seat rows: the row is not a link");
  has(out, 'href="/p/lee"', "seat rows: the row does not carry the address of the record it opens");
  has(out, 'href="/p/chew_h68"',
    "seat rows: a row built from the retired id does not advertise the canonical address");
  lacks(out, 'href="/p/scott_chew"', "seat rows: a row advertises the retired alias");
  lacks(out, 'onclick="if(window.showProfile)',
    "seat rows: the inline onclick is still there beside the href, so a plain click can open the file\n" +
    "    twice");
  audit(out, "seat rows", 2);
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the compare column head, the race sheet, the ballot workspace");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The compare grid's column head is one cell inside a <th> that already holds an
  // avatar, an office line and a pledge note, so the NAME is the link and the cell
  // is not. Driven by lifting the shipped builder out of the module: the table
  // itself needs the whole compare stack to paint, and this is the line that
  // decides the markup.
  const CMP = R("compare-table.js");
  const from = CMP.indexOf("const _cmpNameLink");
  const to = CMP.indexOf("const _getPhoto");
  must(from > 0 && to > from, "compare-table.js's _cmpNameLink helper is gone — section 8 is vacuous");
  must(CMP.includes('<div class="cmp-col-name">${_cmpNameLink(pid, p.name)}</div>'),
    "the compare column head no longer routes its name through _cmpNameLink");
  const win = makeSandbox();
  win.PDXProfilePid = ENGINE.PDXProfilePid;
  const ctx = vm.createContext(win);
  vm.runInContext(PLINK, ctx, { filename: "person-link.js" });
  vm.runInContext(
    CMP.slice(from, to) + "\nwindow.__probe = _cmpNameLink;",
    ctx, { filename: "compare-table.js[_cmpNameLink]" });
  const cell = String(win.__probe("scott_chew", "Scott Chew"));
  has(cell, 'href="/p/chew_h68"', "compare head: the column name is not a link to the canonical record");
  audit(cell, "compare head");
  const unlinkable = String(win.__probe("../nope", "Nobody"));
  has(unlinkable, "Nobody", "compare head: an unlinkable id lost the name entirely");
  lacks(unlinkable, "<a", "compare head: an unlinkable id painted an anchor — an <a> with no href is worse\n" +
    "    than a span, because it is a link the reader cannot use and a crawler cannot follow");
  lacks(unlinkable, "href", "compare head: an unlinkable id painted an href anyway");
}

// The race sheet and the ballot workspace, driven against the real roster on the
// real stack — the same boot the seat-spine and overview suites use.
{
  const FILES = [
    "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
    "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
    "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
    "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
    "profile-spine.js", "issue-colors.js", "my-stances.js", "voter-hub-location.js",
    "compare-hub.js", "ballot-breakdown.js", "who-represents-me.js",
  ];
  const byId = {};
  const el = (id) => {
    const n = {
      id: id || "", className: "", innerHTML: "", textContent: "", style: {}, dataset: {},
      children: [], hidden: false, attrs: {},
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { this.children.push(c); if (c && c.id) byId[c.id] = c; return c; },
      removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, click() {},
      scrollIntoView() {}, querySelector: () => null, querySelectorAll: () => [],
      closest: () => null,
    };
    if (id) byId[id] = n;
    return n;
  };
  const win = makeSandbox();
  const store = {}, sess = {};
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; },
  };
  win.sessionStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(sess, k) ? sess[k] : null),
    setItem: (k, v) => { sess[k] = String(v); }, removeItem: (k) => { delete sess[k]; },
  };
  win.auth = { currentUser: null };
  win._cmpSelected = [];
  win.document.createElement = () => el("");
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = el("body");
  win.document.body.appendChild = (c) => { if (c && c.id) byId[c.id] = c; return c; };
  ["who-represents-me", "wrm-reps", "vh-district-strip", "voter-hub", "ballot-workspace", "bw-body"].forEach(el);
  const ctx = vm.createContext(win);
  vm.runInContext(PLINK, ctx, { filename: "person-link.js" });
  win.PROFILES = win.CMP_DATA;
  const errs = [];
  for (const f of FILES) {
    try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { errs.push(`${f}: ${e.message}`); }
  }
  vm.runInContext(R("profile-evidence.js"), ctx, { filename: "profile-evidence.js" });
  vm.runInContext(R("race-sheet.js"), ctx, { filename: "race-sheet.js" });
  vm.runInContext(R("ballot-workspace.js"), ctx, { filename: "ballot-workspace.js" });
  win.PROFILES = win.CMP_DATA;
  win._hasUserLocation = true;
  win._currentVoterLocation = { state: "Utah", city: "Provo", county: "Utah County", district: "3" };

  must(typeof win.PDXProfilePid === "function",
    `the alias table did not load on the app stack — boot errors: ${errs.join(" | ")}`);
  must(win.PDXRaceSheet && typeof win.PDXRaceSheet._field === "function",
    `the race sheet model is not available — boot errors: ${errs.join(" | ")}`);

  // The race sheet: every field name, on every tab it paints.
  const seats = (win.PDXBallotWorkspace && win.PDXBallotWorkspace._seats)
    ? win.PDXBallotWorkspace._seats().map((s) => s.key) : ["senate"];
  const seat = seats.find((k) => win.PDXRaceSheet._field(k).length >= 2) || seats[0];
  must(win.PDXRaceSheet._field(seat).length >= 1, "no seat on this ballot has a field — section 8 is vacuous");
  win.pdxOpenRaceSheet(seat);
  const ov = win.document.getElementById("pdx-racesheet-overlay");
  const sheet = ov ? String(ov.innerHTML) : "";
  must(sheet.length > 500, "the race sheet painted nothing — its half of section 8 is vacuous");
  has(sheet, '<a class="rs-name"', "race sheet: a field name is not a link to that candidate's record");
  has(sheet, '<a class="rs-ovprof"', "race sheet: \"Open profile\" is not a link to the profile it opens");
  lacks(sheet, 'class="rs-name" onclick="if(window.showProfile)',
    "race sheet: a field name still opens only through an inline handler");
  const rsLinks = audit(sheet, "race sheet", 2);
  ok(rsLinks.every((l) => /^\/p\/[a-z0-9_]+$/.test(l.href)),
    "race sheet: an advertised address is outside the roster id shape");

  // The ballot workspace: candidate names and the seat's current holder.
  if (win.PDXBallotWorkspace && typeof win.PDXBallotWorkspace.sync === "function") {
    win.PDXBallotWorkspace.sync();
    const bw = String((win.document.getElementById("bw-body") || {}).innerHTML || "");
    must(bw.length > 200, "the ballot workspace painted nothing — its half of section 8 is vacuous");
    has(bw, '<a class="bw-cand-name"', "ballot workspace: a candidate name is not a link to their record");
    lacks(bw, 'class="bw-cand-name" onclick=',
      "ballot workspace: a candidate name still opens only through an inline handler");
    audit(bw, "ballot workspace");
    // The pick control is a sibling, not a child: a button inside a link is
    // neither, and it is the one thing a reader must not fire by accident.
    ok(!/<a[^>]*data-pdx-person-link[^>]*>[\s\S]{0,400}?<button[^>]*class="bw-pick/.test(bw),
      "ballot workspace: the pick button is inside the candidate link");
  } else {
    failures.push("ballot workspace: PDXBallotWorkspace.sync() is not exposed, so nothing was driven");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · what this pass promised not to touch");
// ═════════════════════════════════════════════════════════════════════════════
// The letterhead was already right, and the pass leaned on that rather than
// touching it: the person file's kicker prints the citable address as a real
// anchor, with the same click policy person-link.js now applies everywhere else
// (a plain click re-stamps in place, a modified click is the browser's). Pinned
// here because "already compliant" is a claim this file should have to keep.
{
  const PF = R("person-file.js");
  const at = PF.indexOf("function kicker(pid)");
  must(at > 0, "person-file.js's kicker() is gone — the letterhead claim is vacuous");
  const K = PF.slice(at, PF.indexOf("function kickerClick", at));
  has(K, '<a class="pf-kick-addr" href="',
    "letterhead: the citable address is no longer an anchor, so the one surface that was already a real\n" +
    "    link stopped being one");
  ok(/href="' \+ esc\(path\(pid\)\)/.test(K),
    "letterhead: the kicker's href is no longer the person path, so the advertised address is not the\n" +
    "    one the file was opened at");
  lacks(K, 'href="#"', "letterhead: the address became a fragment");
  lacks(K, "javascript:", "letterhead: the address became a javascript: URL");
}

// The address only works because the SPA rewrite and the edge function serve it.
// Neither was changed here, and neither may be changed to make a link work.
const TOML = R("netlify.toml");
has(TOML, 'from = "/p/*"', "untouched: the /p/* rewrite is gone, so every href in this pass 404s");
has(TOML, 'to = "/index.html"', "untouched: the /p/* rewrite no longer serves the app");
has(R("netlify/edge-functions/share-preview.ts"), '"/p/*"',
  "untouched: the edge function no longer runs on /p/*, so the crawl block is not injected");
// person-link.js is a link builder. If it ever reads a record, a score or the
// floor, the "a link is navigation, not a claim" rule has been lost.
for (const banned of ["fetch(", "PDXPublicationFloor", "directionMatch", "score", "party"]) {
  lacks(PLINK.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""), banned,
    `untouched: person-link.js reads or prints ${JSON.stringify(banned)} — it builds addresses and nothing else`);
}
// And the strip states no verdict about the people it names.
for (const banned of ["%", "Direction Match", "score", "Backs it up", "Contradict"]) {
  lacks(STRIP, banned, `homepage: the strip prints ${JSON.stringify(banned)} — it is a list of addresses, not a scoreboard`);
}

console.log("");
if (failures.length) {
  console.error(`✗ person links: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ person links: every listed surface names a politician with a real /p/<pid> link — ${passed} assertions passed\n`);
