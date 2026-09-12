#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-support-routing.mjs — one destination for "Support PolitiDex", and
// /p/null is not a person
// ─────────────────────────────────────────────────────────────────────────────
// Two reports from one phone.
//
// THE FIRST: tapping anything labelled Support / Support PolitiDex landed on
// four different surfaces and never on the donate card. Desktop's overflow
// "Donate" did open the card. The hamburger item set the hash, and a native
// jump into a 2.3 MB document whose sections mount lazily finished somewhere
// else. The footer and the reader's own profile rail had NO money control at
// all — so the nearest Support-looking thing was the People's Mandate or the
// backing lane, and neither of those is about money. Where the card did open on
// a phone, the Your Trail bar (position:fixed; bottom:0; z-index:45) painted
// "Compare with another" over the Venmo button and the QR.
//
// THE SECOND: /p/null was the second most visited path in the app —
// 358 views. encodeURIComponent(null) === "null", so every `if (!pid)` guard in
// the app passed the word a missing value stringifies into, and the router
// published an address for a politician named null.
//
// What must stay true:
//
//   1. ONE DESTINATION. Every control whose visible label means "give money to
//      the project" resolves to #support-politidex — the same card desktop
//      already opened. The four surfaces (hamburger, desktop overflow, footer,
//      profile rail) are named individually, with what each one hit BEFORE this
//      pass recorded beside it.
//   2. NOT THE OTHER PRODUCTS. The People's Mandate, the Open Discussion forum,
//      Join the People and support-lane.js's backing counts keep their own ids.
//      A control that is not about money never carries the donate hash, and
//      nothing points those lanes at Venmo.
//   3. THE ARRIVAL. The hash mounts the CARD: an open person file is closed, the
//      scroll is re-issued while the ground above the card is still moving, the
//      card parks under the measured nav, a re-tap of the hash already in the
//      bar still arrives, and the address is never left as /p/null.
//   4. THE PID WALL. null / undefined / "" / the literal "null" produce no
//      /p/ address anywhere — router, share URLs, record card, person links,
//      head prefetch, crawl stamp, sitemap, edge target parser, SW cache key.
//      A real unknown id still gets the honest "we don't carry them" answer.
//   5. THE TRAIL CANNOT COVER THE QR, and the mechanism is asserted, not
//      assumed: the card is lifted above the bar's layer AND the bar is tucked
//      on this hash only. The trail is not deleted from the rest of the site.
//   6. NO REGRESSION. No score, party metric, Direction Match or finance badge
//      enters any of this; the shipped Venmo copy is unchanged; no new payment
//      processor and no donation total, goal or progress bar.
//
//   node scripts/test-support-routing.mjs

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
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const lacks = (h, n, m) => ok(!String(h).includes(n), `${m} — ${JSON.stringify(n)} present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
// A stale harness is not a pass. Anything that means "this file can no longer
// see the thing it is checking" exits 2 rather than reporting green.
const must = (c, m) => { if (c) return; console.error(`✗ support routing: STALE HARNESS — ${m}`); process.exit(2); };

// Comments carry the doctrine and the doctrine quotes the very strings being
// refused ("/p/null", "venmo"), so every source-level assertion reads a
// comment-stripped copy.
const stripJS = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
const stripCSS = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ");
const stripHTML = (s) => s.replace(/<!--[\s\S]*?-->/g, " ");

const INDEX = R("index.html");
const INDEX_H = stripHTML(INDEX);
const ROUTE_JS = R("support-route.js");
const ROUTE_CSS = stripCSS(R("support-route.css"));
const JOURNEY_CSS = stripCSS(R("journey.css"));
const MOBILE_CSS = stripCSS(R("mobile-polish.css"));
const APP_CSS = stripCSS(R("app.css"));
const MYPROFILE = R("my-profile.js");
const PF_SRC = R("person-file.js");
const SW = R("sw.js");
const LANE_JS = stripJS(R("support-lane.js"));
const LANE_CSS = stripCSS(R("support-lane.css"));
const SITEMAP = R("scripts/gen-sitemap.mjs");
const SHARE_TARGET = R("netlify/lib/share-target.ts");

const HASH = "#support-politidex";
const ID = "support-politidex";

// ── The visible label of a control, with tags, glyphs and entities removed ──
const label = (html) => String(html)
  .replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
  .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  // Emoji and pictographs are decoration on these controls, not the label.
  .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu, " ")
  .replace(/\s+/g, " ").trim();

// Every <a>/<button> in a chunk of markup, as {tag, attrs, label}.
function controls(html) {
  const out = [];
  const re = /<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    out.push({ tag: m[1].toLowerCase(), attrs: m[2], label: label(m[3]), raw: m[0] });
  }
  return out;
}
const hrefOf = (c) => {
  const m = /\bhref\s*=\s*"([^"]*)"/i.exec(c.attrs);
  return m ? m[1] : "";
};

// A named region of the shell, by its opening marker and closing tag.
function region(html, openMarker, closeTag) {
  const i = html.indexOf(openMarker);
  must(i >= 0, `index.html no longer contains ${JSON.stringify(openMarker)}`);
  const j = html.indexOf(closeTag, i);
  must(j > i, `no ${closeTag} after ${JSON.stringify(openMarker)}`);
  return html.slice(i, j);
}

/* A <div> region, balanced. The nav panels nest, so slicing to the first
   </div> after the marker cuts the panel off above its own items — which
   would make a missing money control look like a passing surface. */
function divRegion(html, marker) {
  const at = html.indexOf(marker);
  must(at >= 0, `index.html no longer contains ${JSON.stringify(marker)}`);
  const open = html.lastIndexOf("<div", at);
  must(open >= 0, `${JSON.stringify(marker)} is no longer inside a <div>`);
  const re = /<div\b|<\/div>/gi;
  re.lastIndex = open;
  let depth = 0, m;
  while ((m = re.exec(html)) !== null) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(open, m.index + m[0].length);
  }
  must(false, `unbalanced <div> around ${JSON.stringify(marker)}`);
}

/* Every declaration this stylesheet makes for one selector, concatenated in
   source order — the same helper test-mobile-body-lock.mjs uses, and for the
   same reason: a selector re-declared in a media block must not make the base
   rule look missing. */
function rule(css, selector) {
  const needle = selector + " {";
  const bodies = [];
  let at = -1;
  for (;;) {
    const i = css.indexOf(needle, at + 1);
    if (i === -1) break;
    at = i;
    const end = css.indexOf("}", i);
    if (end !== -1) bodies.push(css.slice(i + needle.length, end));
  }
  return bodies.length ? bodies.join("\n") : null;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the module registers, and owns the vocabulary");
// ═════════════════════════════════════════════════════════════════════════════
// support-route.js runs in a node:vm sandbox with a DOM small enough to be
// read in one sitting and honest about the three things the arrival depends on:
// what the hash is, whether an overlay holds the document, and where the card
// is in document space.
function sandbox(opts) {
  opts = opts || {};
  const calls = { closeModal: [], scrollTo: [], intent: [], menuHidden: [] };
  const timers = [];
  const rootCls = new Set();
  // The card's document-space top. `drift` moves it once, after the first
  // scroll, the way a section mounting above the card moves it in the
  // real document — which is the thing the settling retry exists for.
  let cardTop = opts.cardTop === undefined ? 4200 : opts.cardTop;
  let drifted = false;

  const mkEl = (id) => ({
    id,
    style: {},
    hidden: false,
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); if (id === "mobileMenu" && c === "hidden") calls.menuHidden.push(1); },
      remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    getBoundingClientRect() {
      return { top: cardTop - (win.pageYOffset || 0), left: 0, width: 358, height: 700 };
    },
  });

  const els = {};
  const doc = {
    readyState: "complete",
    _listeners: {},
    documentElement: {
      classList: {
        add(c) { rootCls.add(c); },
        remove(c) { rootCls.delete(c); },
        contains(c) { return rootCls.has(c); },
      },
      scrollTop: 0,
    },
    body: { style: { overflow: opts.bodyOverflow || "" }, classList: { add() {}, remove() {}, contains: () => false } },
    addEventListener(t, f) { (doc._listeners[t] = doc._listeners[t] || []).push(f); },
    getElementById(id) {
      if (opts.missing && opts.missing.indexOf(id) >= 0) return null;
      if (!els[id]) els[id] = mkEl(id);
      return els[id];
    },
  };

  const win = {
    document: doc,
    pageYOffset: opts.scrollY || 0,
    location: Object.assign(
      { origin: "https://www.politidex.fyi", pathname: "/", search: "", hash: "", href: "https://www.politidex.fyi/" },
      opts.location || {}
    ),
    _listeners: {},
    addEventListener(t, f) { (win._listeners[t] = win._listeners[t] || []).push(f); },
    setTimeout(f, ms) { timers.push({ f, ms }); return timers.length; },
    requestAnimationFrame(f) { timers.push({ f, ms: 0, raf: true }); return timers.length; },
    scrollTo(a) {
      calls.scrollTo.push(a);
      if (a && typeof a.top === "number") win.pageYOffset = a.top;
      if (opts.drift && !drifted) { drifted = true; cardTop += opts.drift; }
    },
    getComputedStyle() {
      return { getPropertyValue: (p) => (p === "--pdx-chrome" ? (opts.chrome || "114px") : "") };
    },
    closeModal() { calls.closeModal.push(win._pdxCurrentProfileId || "open"); win._pdxCurrentProfileId = null; },
    PDXStability: {
      isLocked: () => !!opts.locked,
      markIntent: (ms) => calls.intent.push(ms),
    },
  };
  if (opts.profileOpen) win._pdxCurrentProfileId = opts.profileOpen;
  win.window = win;
  win.globalThis = win;
  const ctx = vm.createContext(win);
  new vm.Script(ROUTE_JS, { filename: "support-route.js" }).runInContext(ctx);

  // Drain every queued timer/frame, repeatedly, so a settling retry chain runs
  // to its own end rather than one step of it.
  const drain = (rounds = 6) => {
    for (let i = 0; i < rounds; i++) {
      const batch = timers.splice(0, timers.length);
      if (!batch.length) return;
      batch.forEach((t) => { try { t.f(); } catch (e) {} });
    }
  };
  const fire = (type, ev) => ((win._listeners[type] || []).forEach((f) => { try { f(ev || {}); } catch (e) {} }));
  const fireDoc = (type, ev) => ((doc._listeners[type] || []).forEach((f) => { try { f(ev || {}); } catch (e) {} }));
  return { win, doc, calls, drain, fire, fireDoc, rootCls, els, S: win.PDXSupportRoute };
}

const base = sandbox();
must(base.S && typeof base.S.arrive === "function", "PDXSupportRoute did not register in a sandbox");
eq(base.S.ID, ID, "the module names a different card id");
eq(base.S.HASH, HASH, "the module names a different donate hash");

// The money vocabulary, and the words that are NOT money. "Support" on its own
// is the backing lane's verb for a politician and the Mandate's for a demand —
// if it were money-labelled here, the audit below would demand the donate hash
// on every backing button in the app.
["Donate", "Donate with Venmo", "Support PolitiDex", "Support the movement"].forEach((s) =>
  ok(base.S.isMoneyLabel(s), `${JSON.stringify(s)} is not recognised as a money label`));
["Support", "Supported", "Back this", "People's Mandate", "Open Discussion", "Join the People"].forEach((s) =>
  ok(!base.S.isMoneyLabel(s), `${JSON.stringify(s)} is treated as a money label — it is not about money`));

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the four surfaces, and what each one hit before");
// ═════════════════════════════════════════════════════════════════════════════
// RECORDED, NOT ASSUMED. This is what a phone tap on each surface's
// Support-labelled control reached before this pass. Two of the four had a money
// control already (and they are the two that worked on desktop); the other two
// had none at all, which is why a reader looking for a way to give found the
// Mandate — a different product with a different id.
const BEFORE = [
  { surface: "mobile hamburger (#mobileMenu)", was: "#support-politidex", note: "set the hash; the native jump finished on another section" },
  { surface: "desktop overflow (Community ▾ → Donate)", was: "#support-politidex", note: "worked — this is the card the others must reach" },
  { surface: "footer (About column)", was: "", note: "no money control existed; the nearest label was People's Mandate → #agenda" },
  { surface: "profile rail (#my-profile)", was: "", note: "no money control existed; the rail's gold CTA was → #voter-hub" },
];
BEFORE.forEach((b) => console.log(`      ${b.surface}: ${b.was ? b.was : "(none)"} — ${b.note}`));

const HAMBURGER = divRegion(INDEX_H, 'id="mobileMenu"');
const OVERFLOW = divRegion(INDEX_H, 'aria-label="Community menu"');
const FOOTER = region(INDEX_H, "<footer", "</footer>");

const moneyIn = (html, what) => {
  const hits = controls(html).filter((c) => base.S.isMoneyLabel(c.label));
  must(hits.length > 0, `${what} has no money-labelled control at all — the surface or its label moved`);
  return hits;
};

[["the hamburger", HAMBURGER], ["the desktop overflow", OVERFLOW], ["the footer", FOOTER]].forEach(([what, html]) => {
  const hits = moneyIn(html, what);
  hits.forEach((c) => {
    const href = hrefOf(c);
    ok(href === HASH || href === "/" + HASH,
      `${what}: ${JSON.stringify(c.label)} resolves to ${JSON.stringify(href)}, not the donate hash`);
    has(c.attrs, "data-pdx-support", `${what}: ${JSON.stringify(c.label)} carries no data-pdx-support declaration`);
  });
  console.log(`      ${what}: ${hits.length} money control${hits.length === 1 ? "" : "s"} → ${HASH}`);
});

// The profile rail is rendered by my-profile.js, so its control is asserted in
// the source that builds it.
const railMoney = controls(MYPROFILE).filter((c) => /Support PolitiDex/i.test(c.label));
must(railMoney.length > 0, "my-profile.js renders no Support PolitiDex control");
railMoney.forEach((c) => {
  has(hrefOf(c), HASH, "the profile rail's money control does not resolve to the donate hash");
  has(c.attrs, "data-pdx-support", "the profile rail's money control carries no data-pdx-support declaration");
});
// And it is a DOOR, not a second donate surface.
const railSrc = stripJS(MYPROFILE);
["venmo", "@PolitiDex", "qrserver"].forEach((n) =>
  lacks(railSrc.toLowerCase(), n.toLowerCase(), `my-profile.js names ${JSON.stringify(n)} — the rail is a door to the one card, not a second one`));

// Every money-labelled control ANYWHERE in the shell, not just on the four
// surfaces: the only ones allowed to point somewhere other than the hash are
// the two inside the card itself, which are the payment path.
const VENMO_OK = /^(?:https:\/\/venmo\.com\/u\/PolitiDex|venmo:\/\/)/;
const strays = controls(INDEX_H)
  .filter((c) => base.S.isMoneyLabel(c.label))
  .map((c) => ({ label: c.label, href: hrefOf(c) }))
  .filter((c) => !(c.href === HASH || c.href === "/" + HASH || VENMO_OK.test(c.href)));
eq(strays.length, 0,
  `money-labelled controls resolve somewhere that is neither the donate card nor Venmo: ${JSON.stringify(strays)}`);

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the other products keep their own ids");
// ═════════════════════════════════════════════════════════════════════════════
// Mandate, forum, Join the People and the backing lane are separate products.
// None of their controls may carry the donate hash, and none of them may be
// pointed at Venmo.
const NOT_MONEY = [
  { what: "the People's Mandate", href: "#agenda" },
  { what: "the Open Discussion forum", href: "#open-forum" },
  { what: "the Community Exchange", href: "#community-exchange" },
];
NOT_MONEY.forEach(({ what, href }) => {
  const hits = controls(INDEX_H).filter((c) => hrefOf(c) === href);
  must(hits.length > 0, `no control in index.html points at ${href} any more — ${what} moved`);
  hits.forEach((c) => {
    lacks(c.attrs, "data-pdx-support", `${what} (${href}) was declared a money control`);
    ok(!base.S.isMoneyLabel(c.label), `${what} (${href}) now wears a money label: ${JSON.stringify(c.label)}`);
  });
  ok(hits.every((c) => hrefOf(c) !== HASH), `${what} resolves to the donate hash`);
});
// Join the People is an auth control: a button, no href, and it must stay that way.
const joinCtl = controls(INDEX_H).filter((c) => /JOIN THE PEOPLE/i.test(c.label));
must(joinCtl.length > 0, "index.html no longer has a Join the People control");
joinCtl.forEach((c) => {
  eq(hrefOf(c), "", "Join the People gained an href");
  lacks(c.attrs, "data-pdx-support", "Join the People was declared a money control");
  has(c.attrs, "openAuthModal", "Join the People no longer opens the auth modal");
});
// The backing lane: no donate hash, no Venmo, no money hook — in either file.
[["support-lane.js", LANE_JS], ["support-lane.css", LANE_CSS]].forEach(([name, src]) => {
  [HASH, "venmo", "data-pdx-support", "PDXSupportRoute"].forEach((n) =>
    lacks(src.toLowerCase(), n.toLowerCase(), `${name} names ${JSON.stringify(n)} — the backing lane is not the donate lane`));
});
// …and symmetrically, the donate lane knows nothing about backing counts.
[["support-route.js", stripJS(ROUTE_JS)], ["support-route.css", ROUTE_CSS]].forEach(([name, src]) => {
  ["PDXSupportLane", "backing", "momentum", "mandate"].forEach((n) =>
    lacks(src.toLowerCase(), n.toLowerCase(), `${name} names ${JSON.stringify(n)} — the donate lane is not the backing lane`));
});

// ═════════════════════════════════════════════════════════════════════════════
section("4 · hash arrival mounts the card");
// ═════════════════════════════════════════════════════════════════════════════
// COLD LOAD on the donate hash, with a person file open over it.
const cold = sandbox({ location: { hash: HASH }, profileOpen: "mike_lee", cardTop: 4200, chrome: "114px" });
cold.drain();
ok(cold.rootCls.has(cold.S.STATE_CLASS), `a cold arrival did not put ${cold.S.STATE_CLASS} on <html>`);
eq(cold.calls.closeModal.length, 1, "a cold arrival on the donate hash left the person file open over the card");
ok(cold.calls.scrollTo.length >= 1, "a cold arrival issued no scroll at all — the native jump is what was landing elsewhere");
const landed = cold.calls.scrollTo[0];
eq(landed.top, 4200 - 114 - 12, "the card was not parked under the measured nav");
ok(cold.calls.intent.length >= 1, "the scroll was not marked as intent — pdx-stability would 'correct' it back");
eq(cold.win.location.pathname, "/", "the arrival moved the address off the homepage");
lacks(String(cold.win.location.pathname + cold.win.location.href), "/p/null",
  "the donate arrival left /p/null in the address");

// A CARD THAT DOES NOT MOVE is parked once and then left alone — re-issuing a
// scroll at a reader who has already started scrolling is its own bug.
eq(cold.calls.scrollTo.length, 1, "a settled card was scrolled at more than once");

// THE SETTLE. A card that MOVES after the first jump — because a section above
// it mounted late — is followed. This is the whole reason one control used to
// land on four different surfaces.
const drift = sandbox({ location: { hash: HASH }, cardTop: 4200, drift: 900, chrome: "114px" });
drift.drain();
ok(drift.calls.scrollTo.length >= 2,
  `the card moved 900px after the first jump and the scroll was never re-issued (${drift.calls.scrollTo.length} scrolls) — this is the four-surfaces bug`);
ok(drift.calls.scrollTo.length <= 3,
  `the scroll was issued ${drift.calls.scrollTo.length} times — more than three fights a reader who has started scrolling`);
eq(drift.calls.scrollTo[drift.calls.scrollTo.length - 1].top, 4200 + 900 - 114 - 12,
  "the final scroll parked the card at the offset it had BEFORE the ground moved");

// THE RE-TAP. Tapping a control whose hash is already in the bar fires no
// hashchange; the arrival has to come from the click.
const tap = sandbox({ location: { hash: HASH }, cardTop: 3000 });
tap.drain();
const before = tap.calls.scrollTo.length;
tap.fireDoc("click", { target: { nodeType: 1, hasAttribute: (a) => a === "data-pdx-support", getAttribute: () => null, parentNode: null } });
tap.drain();
ok(tap.calls.scrollTo.length > before, "a second tap on the donate control with the hash already set did nothing");

// AN IN-APP TAP from a person file: hash changes, file closes, card is parked.
const inapp = sandbox({ location: { pathname: "/p/cox", hash: "" }, profileOpen: "cox", cardTop: 2500 });
inapp.drain();
ok(!inapp.rootCls.has(inapp.S.STATE_CLASS), "the state class is set while the donate hash is NOT active");
inapp.win.location.hash = HASH;
inapp.fire("hashchange", {});
inapp.drain();
ok(inapp.rootCls.has(inapp.S.STATE_CLASS), "a hashchange onto the donate hash did not set the state class");
eq(inapp.calls.closeModal.length, 1, "an in-app tap left the person file open over the card");
eq(inapp.calls.menuHidden.length >= 1, true, "an in-app tap left the mobile drawer open over its own destination");
ok(inapp.calls.scrollTo.length >= 1, "an in-app tap parked nothing");

// LEAVING the hash takes the class off again — the trail is tucked on this hash
// only, so the class must not outlive it.
inapp.win.location.hash = "#tracker";
inapp.fire("hashchange", {});
inapp.drain();
ok(!inapp.rootCls.has(inapp.S.STATE_CLASS), "the state class survived leaving the donate hash — the trail would stay hidden");

// THE DOCUMENT STAYS LOCKED IF AN OVERLAY IS OPEN. The card's own
// .pdx-donate-scroll is the scroller on a phone; scrolling the document under
// somebody else's overlay would undo their lock and drift their surface.
const locked = sandbox({ location: { hash: HASH }, locked: true, cardTop: 4200 });
locked.drain();
eq(locked.calls.scrollTo.length, 0, "the arrival scrolled the document while an overlay held it locked");
ok(locked.rootCls.has(locked.S.STATE_CLASS), "a locked arrival still has to tuck the trail");

// The phone scroll contract the card ships with is untouched by all of this.
const donateScroll = rule(MOBILE_CSS, ".pdx-donate .pdx-donate-scroll");
must(donateScroll, "mobile-polish.css no longer declares .pdx-donate .pdx-donate-scroll");
has(donateScroll, "overflow-y: auto", "the card is no longer its own scroller on a phone");
has(donateScroll, "100dvh", "the card's scroller is no longer bounded by the visible viewport");

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the trail cannot cover the Venmo button or the QR");
// ═════════════════════════════════════════════════════════════════════════════
// THE MECHANISM, ASSERTED. Two independent halves, because either one alone is
// a single point of failure on a surface a reader reached to give money.
const bar = rule(JOURNEY_CSS, ".pj-bar");
must(bar, "journey.css no longer declares .pj-bar");
const zBar = /z-index:\s*(\d+)/.exec(bar);
must(zBar, ".pj-bar declares no z-index — the stacking assertion below has nothing to compare");
has(bar, "position: fixed", ".pj-bar is no longer fixed — re-derive which half of the fix is load-bearing");

const card = rule(ROUTE_CSS, "#" + ID);
must(card, "support-route.css no longer declares a rule for #" + ID);
const zCard = /z-index:\s*(\d+)/.exec(card);
must(zCard, "support-route.css declares no z-index for the donate card");
ok(Number(zCard[1]) > Number(zBar[1]),
  `the donate card (z-index ${zCard[1]}) does not sit above the trail bar (z-index ${zBar[1]})`);
has(card, "position: relative", "the card's z-index has no positioned box to apply to");

// Half two: the hash-scoped tuck. Both the id and the class form are named,
// because journey.js has painted the bar under each at different times.
const TUCK = /html\.pdx-support-hash\s+(#pdx-journey|\.pj-bar)/g;
const tucked = new Set((ROUTE_CSS.match(TUCK) || []).map((m) => m.split(/\s+/).pop()));
ok(tucked.has("#pdx-journey"), "support-route.css does not tuck #pdx-journey on the donate hash");
ok(tucked.has(".pj-bar"), "support-route.css does not tuck .pj-bar on the donate hash");
const tuckBody = rule(ROUTE_CSS, "html.pdx-support-hash #pdx-journey,\nhtml.pdx-support-hash .pj-bar");
must(tuckBody, "the tuck rule's selector list changed shape — re-read the sheet");
has(tuckBody, "display: none !important",
  "the tuck does not beat journey.css's .pj-bar.is-open{display:block}");
eq(base.S.STATE_CLASS, "pdx-support-hash", "the module and the stylesheet disagree about the state class name");

// THE TRAIL IS NOT DELETED FROM THE REST OF THE SITE. journey.css still opens
// its own bar, and nothing in this pass hides it unconditionally.
has(JOURNEY_CSS, ".pj-bar.is-open", "journey.css no longer has an is-open state — the bar was removed, not tucked");
ok(!/(^|\})\s*(?:#pdx-journey|\.pj-bar)\s*\{[^}]*display:\s*none\s*!important/.test(ROUTE_CSS),
  "support-route.css hides the trail unconditionally — it must be scoped to the donate hash");
// And nothing clears, dismisses or rewrites the reader's trail.
["PDXJourney", "pj-dismiss", "clear("].forEach((n) =>
  lacks(stripJS(ROUTE_JS), n, `support-route.js touches ${JSON.stringify(n)} — the trail is tucked, not cleared`));

// The native hash jump has to agree with the module's parking offset, or a
// pasted link and a tap land in two places.
has(card, "scroll-margin-top", "the card has no scroll-margin-top — a native hash jump parks it behind the nav");
has(card, "--pdx-chrome", "the card's scroll offset is not the measured nav height");
has(INDEX, "--pdx-chrome: 7.125rem", "index.html's --pdx-chrome fallback literal moved — support-route.css still carries the old one");
has(card, "7.125rem", "support-route.css's --pdx-chrome fallback does not match index.html's");

// ═════════════════════════════════════════════════════════════════════════════
section("6 · /p/null is not a person");
// ═════════════════════════════════════════════════════════════════════════════
// person-file.js in a sandbox: the router itself.
function personSandbox(opts) {
  opts = opts || {};
  const calls = { openModal: [], notice: [], replace: [] };
  const timers = [];
  const els = {};
  const doc = {
    readyState: "complete",
    _listeners: {},
    addEventListener(t, f) { (doc._listeners[t] = doc._listeners[t] || []).push(f); },
    getElementById(id) {
      if (!els[id]) {
        const attrs = {};
        els[id] = {
          id, innerHTML: "", className: "", style: {}, attrs,
          addEventListener() {}, querySelector: () => null,
          setAttribute(k, v) { attrs[k] = String(v); },
          getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
          removeAttribute(k) { delete attrs[k]; },
          hasAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k); },
          classList: { add() {}, remove() {}, contains: () => false },
        };
      }
      return els[id];
    },
    querySelector: () => null,
  };
  const win = {
    document: doc,
    location: Object.assign(
      { origin: "https://www.politidex.fyi", pathname: "/", search: "", hash: "", href: "" },
      opts.location || {}
    ),
    history: {
      replaceState(a, b, url) { calls.replace.push(url); try { win.location.pathname = String(url).split(/[?#]/)[0]; } catch (e) {} },
      pushState() {},
    },
    _listeners: {},
    addEventListener(t, f) { (win._listeners[t] = win._listeners[t] || []).push(f); },
    setTimeout(f, ms) { timers.push({ f, ms: Number(ms) || 0 }); return timers.length; },
    clearTimeout() {},
    URLSearchParams,
    encodeURIComponent,
    fetch() { calls.fetched = (calls.fetched || 0) + 1; return new Promise(() => {}); },
    openModal(id) { calls.openModal.push(id); win._pdxCurrentProfileId = id; },
    CMP_DATA: { mike_lee: { name: "Mike Lee", office: "U.S. Senator", state: "Utah" } },
    PROFILES: {},
    _pdxRosterState: "done",
    PDXShareLinks: { notice(id, kicker, message) { calls.notice.push({ id, message }); return true; } },
    PDXPublicationFloor: { clears: (pid) => pid === "mike_lee" },
  };
  win.window = win;
  win.globalThis = win;
  const ctx = vm.createContext(win);
  new vm.Script(PF_SRC, { filename: "person-file.js" }).runInContext(ctx);
  const drain = (rounds = 60) => {
    for (let i = 0; i < rounds; i++) {
      const batch = timers.splice(0, timers.length);
      if (!batch.length) return;
      batch.forEach((t) => { try { t.f(); } catch (e) {} });
    }
  };
  return { win, calls, drain, P: win.PDXPerson };
}

const P = personSandbox().P;
must(P && typeof P.realPid === "function", "PDXPerson exports no realPid predicate");

// The predicate, over every shape a missing pid arrives in.
[null, undefined, "", "   ", "null", "NULL", "Null", "undefined", "NaN"].forEach((v) =>
  ok(!P.realPid(v), `realPid(${JSON.stringify(v)}) is true — that is the /p/null bug`));
["mike_lee", "cox", "chew_h68", "nullify_h1", "annullo"].forEach((v) =>
  ok(P.realPid(v), `realPid(${JSON.stringify(v)}) is false — a real pid was refused`));

// The builders. A sentinel gets NO address, not "/p/" plus the word.
[null, undefined, "", "null", "undefined", "NaN"].forEach((v) => {
  eq(P.path(v), "", `PDXPerson.path(${JSON.stringify(v)}) minted an address`);
  eq(P.url(v), "", `PDXPerson.url(${JSON.stringify(v)}) minted an address`);
});
eq(P.path("mike_lee"), "/p/mike_lee", "PDXPerson.path stopped minting real addresses");
eq(P.url("mike_lee"), "https://www.politidex.fyi/p/mike_lee", "PDXPerson.url stopped minting real addresses");

// THE ARRIVAL. /p/null opens nothing, says nothing (nobody typed it), and does
// not leave the address as /p/null.
["/p/null", "/p/undefined", "/p/NaN"].forEach((path) => {
  const a = personSandbox({ location: { pathname: path } });
  eq(a.P.adopt(), "", `${path} adopted a person`);
  eq(a.calls.openModal.length, 0, `${path} opened a person file`);
  eq(a.calls.notice.length, 0, `${path} told the reader we don't carry "null" — nobody asked for null`);
  ok(a.calls.replace.length >= 1, `${path} left the address as ${path}`);
  eq(String(a.calls.replace[0]).split(/[?#]/)[0], "/", `${path} was rewritten somewhere other than the front page`);
  lacks(String(a.calls.replace.join(" ")), "/p/", `${path} was redirected to another /p/ address`);
  // No request is spent on a member named null.
  a.drain();
  eq(a.calls.fetched || 0, 0, `${path} spent a record request on a pid that names nobody`);
});

// A REAL UNKNOWN ID IS A DIFFERENT CASE and keeps the honest answer.
const unknown = personSandbox({ location: { pathname: "/p/definitely_not_a_politician" } });
eq(unknown.P.adopt(), "", "an unknown id adopted somebody");
eq(unknown.calls.openModal.length, 0, "an unknown id opened a person file");
eq(unknown.calls.notice.length, 1, "an unknown id no longer gets the honest empty-file answer");
has(unknown.calls.notice[0].message, "definitely_not_a_politician", "the notice does not name the id that was asked for");

// And a real person still opens.
const real = personSandbox({ location: { pathname: "/p/mike_lee" } });
eq(real.P.adopt(), "mike_lee", "/p/mike_lee stopped opening Mike Lee");
eq(real.calls.openModal.length, 1, "/p/mike_lee did not open exactly one file");

// ── Every other emitter of a /p/ address ────────────────────────────────────
// The greps the brief asks for: no shipped file may concatenate "/p/" with a
// pid it has not put through the wall. Test fixtures are excluded — they build
// addresses for known-good ids on purpose.
const SENTINEL_SRC = /null\|undefined\|nan/i;
const EMITTERS = [
  "share-links.js", "record-card.js", "profiles-full.js", "self-defection.js",
  "person-link.js", "person-file.js", "sw.js", "scripts/gen-sitemap.mjs",
  "netlify/lib/digest-record-core.mjs", "netlify/lib/share-target.ts",
];
EMITTERS.forEach((f) => {
  const src = R(f);
  must(/['"`]\/p\/|\/p\/\$\{/.test(src), `${f} no longer builds a /p/ address — the emitter list is stale`);
  ok(SENTINEL_SRC.test(stripJS(src)) || /realPid|SENTINEL/.test(stripJS(src)),
    `${f} concatenates a /p/ address with no sentinel guard in sight`);
});
// The head prefetch and the crawl stamp, inline in index.html.
const prefetch = INDEX.slice(INDEX.indexOf("── The prefetch"), INDEX.indexOf("── The prefetch") + 4000);
must(prefetch.length > 100, "index.html's head prefetch block moved");
ok(/null\|undefined\|nan/i.test(prefetch), "the head prefetch would still warm a record for a member named null");
const crawl = INDEX.slice(INDEX.indexOf("pdx-crawl-person"), INDEX.indexOf("pdx-crawl-person") + 4000);
ok(/null\|undefined\|nan/i.test(crawl), "the crawl guard would still stamp the header for /p/null");

// The sitemap never advertises one.
ok(/null\|undefined\|nan/i.test(SITEMAP), "gen-sitemap.mjs would advertise /p/null to a search engine");
// The edge's target parser never canonicalises one.
has(SHARE_TARGET, "SENTINEL_ID", "share-target.ts has no sentinel wall — /p/null would get a canonical and an og:url");
ok(/SENTINEL_ID\.test\(p\)/.test(SHARE_TARGET) && /SENTINEL_ID\.test\(person\[1\]\)/.test(SHARE_TARGET),
  "share-target.ts checks the sentinel on only one of the two person forms (?p= and /p/)");

// The trail chip's address comes from PDXPerson.path, which is now walled; assert
// the chip builder asks for it rather than concatenating its own.
const JOURNEY_JS = stripJS(R("journey.js"));
ok(!/['"`]\/p\/['"`]\s*\+/.test(JOURNEY_JS) && !/\/p\/\$\{/.test(JOURNEY_JS),
  "journey.js builds its own /p/ address — the trail chip must go through PDXPerson");

// Person links refuse the word outright: no link rather than a link to nobody.
const LINK_SRC = R("person-link.js");
const linkCtx = vm.createContext({ window: {}, document: { addEventListener() {} }, encodeURIComponent });
linkCtx.window.document = linkCtx.document;
linkCtx.globalThis = linkCtx;
new vm.Script(LINK_SRC, { filename: "person-link.js" }).runInContext(linkCtx);
const L = linkCtx.window.PDXPersonLink;
must(L && typeof L.href === "function", "PDXPersonLink did not register");
["null", "undefined", "NaN", ""].forEach((v) => {
  eq(L.href(v), "", `PDXPersonLink.href(${JSON.stringify(v)}) minted an address`);
  eq(L.attrs(v), "", `PDXPersonLink.attrs(${JSON.stringify(v)}) minted an href`);
});
eq(L.href("mike_lee"), "/p/mike_lee", "PDXPersonLink stopped linking real people");

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no score, no party, no Direction Match, no new money surface");
// ═════════════════════════════════════════════════════════════════════════════
const NEW_FILES = [["support-route.js", stripJS(ROUTE_JS)], ["support-route.css", ROUTE_CSS]];
NEW_FILES.forEach(([name, src]) => {
  ["score", "grade", "Direction Match", "directionMatch", "party", "republican", "democrat",
   "finance", "badge", "percent", "%"].forEach((n) =>
    lacks(src.toLowerCase(), n.toLowerCase(), `${name} names ${JSON.stringify(n)} — routing carries no finding`));
  // No processor other than the one that shipped, and no total.
  ["stripe", "paypal", "cash.app", "gofundme", "donorbox", "patreon", "goal", "progress", "raised", "total"].forEach((n) =>
    lacks(src.toLowerCase(), n.toLowerCase(), `${name} names ${JSON.stringify(n)}`));
});

// THE SHIPPED CARD IS UNCHANGED. Universal link first, deep link second, one
// handle, one QR, no processor, no number.
const CARD = region(INDEX_H, 'id="' + ID + '"', "</section>");
const uni = CARD.indexOf("https://venmo.com/u/PolitiDex");
const deep = CARD.indexOf("venmo://");
ok(uni >= 0, "the card no longer offers the Venmo universal link");
ok(deep >= 0, "the card no longer offers the venmo:// deep link");
ok(uni < deep, "the venmo:// deep link is offered before the universal link — a bare scheme fails silently without the app");
has(CARD, 'rel="noopener noreferrer"', "the card's Venmo link lost rel=noopener");
// The visible handle ships as the entity &#64;PolitiDex, which is still one
// handle naming one place.
eq((CARD.match(/(?:@|&#64;)PolitiDex/g) || []).length, 1,
  "the card does not name the Venmo handle exactly once");
has(CARD, "venmo.com/u/PolitiDex", "the QR and the handle no longer name the same place");
["stripe", "paypal", "cash.app", "gofundme", "donorbox", "patreon"].forEach((n) =>
  lacks(CARD.toLowerCase(), n, `the donate card added ${JSON.stringify(n)} — no new payment processor`));
ok(!/\$\s?\d/.test(CARD.replace(/\$\{[^}]*\}/g, "")), "the donate card now publishes a dollar figure");
["goal", "progress", "raised so far", "% funded"].forEach((n) =>
  lacks(CARD.toLowerCase(), n, `the donate card added ${JSON.stringify(n)} — a donation is not a score`));

// The service worker ships the pair and the version moved.
const ver = /const CACHE_VERSION = 'v(\d+)';/.exec(SW);
must(ver, "sw.js no longer declares CACHE_VERSION in the expected form");
ok(Number(ver[1]) > 178, `CACHE_VERSION is still v${ver[1]} — index.html, person-file.js and a shell nav file all changed`);
has(SW, "'/support-route.js'", "support-route.js is not in the precache list");
has(SW, "'/support-route.css'", "support-route.css is not in the precache list");
// And index.html loads both, non-blocking.
has(INDEX, 'href="/support-route.css" media="print"', "support-route.css is not loaded with the non-blocking media swap");
has(INDEX, '<script defer src="/support-route.js"></script>', "support-route.js is not deferred");
ok(INDEX.indexOf('src="/journey.js"') < INDEX.indexOf('src="/support-route.js"'),
  "support-route.js loads before journey.js — the bar it tucks would not exist yet");
has(INDEX, "<noscript><link rel=\"stylesheet\" href=\"/support-route.css\" /></noscript>",
  "support-route.css has no noscript fallback");

// ── Result ──────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  failures.forEach((f) => console.error(`   ✗ ${f}`));
  console.error(`\n✗ support routing: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ support routing: all ${passed} assertions passed`);
console.log(`   4 surfaces → ${HASH} · trail tucked + card lifted · /p/null opens nobody and does not stay in the bar`);
