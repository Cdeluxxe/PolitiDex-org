#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex — a candidate on the ballot desk has a face
// ─────────────────────────────────────────────────────────────────────────────
// /ballot's desk is a seat, a field, and a row per candidate. Until this pass a
// row was a name, a lane label and a button — and the record that row opens has
// a headshot at the top of it. The reader met a candidate as a string here and
// as a person one tap later, and on a seat with five filings a column of names
// is the hardest form a field can take.
//
// The failure mode this harness exists for is not "no photo". It is the FOUR
// dishonest ways a photo can arrive:
//
//   1. A BROKEN FRAME. An emoji, a bare word or an empty string in src — every
//      one of which CMP_DATA and PROFILES carry in neighbouring fields. A
//      broken image on a candidate's row reads as a failure, which is worse
//      than the absence it is reporting.
//   2. A COLLAPSED ROW. A face with no reserved box reflows the field when it
//      lands, and a seat where two of five have portraits reads as a ragged
//      list rather than one column of rows.
//   3. THE WRONG PERSON. A retired alias resolves to the record it was folded
//      into (chew_h68 is the precedent), so a face looked up on the raw id and
//      a link built on the canonical one are two different people on one row.
//   4. A SECOND BEHAVIOUR. A face that opens a modal, or nothing, while the
//      name beside it pushes /p/<pid>. One row, one target.
//
// And one budget: the desk may not drag compare-hub.js — 10,000 lines of
// collection manager — onto this document to get a portrait URL. The curated
// map is data, it lives in /browse-photos.js, and that is what /ballot loads.
//
//   node scripts/test-ballot-desk-photos.mjs
//
// Static + a real module boot with a mini-DOM. No network, no browser, no key.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) => ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) => ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ ballot desk photos: ${msg}`);
  process.exit(1);
};

// The trusted portrait hosts, copied from scripts/test-photo-coverage.mjs on
// purpose rather than imported: that file gates the MAP, this one gates what
// reaches an <img> on the desk, and a row may not introduce a host the curated
// table was never allowed to hold.
const ALLOWED = new Set([
  "raw.githubusercontent.com",
  "upload.wikimedia.org",
  "commons.wikimedia.org",
  "bioguide.congress.gov",
  "le.utah.gov",
  "insurance.utah.gov",
]);

const BALLOT = R("ballot.html");
const WORK = R("ballot-workspace.js");
const CSS = R("ballot-workspace.css");
const PHOTOS = R("browse-photos.js");
const HUB = R("compare-hub.js");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · The table is on this document, and the hub is not");
// ═════════════════════════════════════════════════════════════════════════════
has(BALLOT, '<script defer src="/browse-photos.js"></script>',
  "ballot.html does not load /browse-photos.js, so _getPhotoUrl's last tier is empty here and every desk row is a placeholder");
lacks(BALLOT, 'src="/compare-hub.js"',
  "ballot.html loads compare-hub.js — the desk pulled 10,000 lines of collection manager onto the document for a photo URL");
has(BALLOT, '<script defer src="/ballot-breakdown.js"></script>',
  "ballot.html no longer loads ballot-breakdown.js, which is where _getPhotoUrl is defined");
// Data only. A file the two heaviest documents both load may not also do things.
for (const forbidden of ["document.", "addEventListener", "fetch(", "XMLHttpRequest", "localStorage"]) {
  lacks(PHOTOS, forbidden,
    `browse-photos.js contains ${forbidden} — it is a table of 715 URLs and is loaded by two documents for that reason alone`);
}
has(PHOTOS, "var BROWSE_PHOTOS = {",
  "browse-photos.js does not declare the map in the shape audit-photo-coverage.mjs and the federal census scripts parse");
has(PHOTOS, "window.BROWSE_PHOTOS = BROWSE_PHOTOS",
  "browse-photos.js does not publish the map on window, so nothing can read it");
lacks(HUB, "var BROWSE_PHOTOS = {\n",
  "compare-hub.js declares the curated map again — there are now two copies and they will drift");
has(HUB, "return window.BROWSE_PHOTOS || {}",
  "compare-hub.js no longer reads the map off window, so its own photo fallbacks resolve nothing");
{
  // The map parses, and it parses to the same thing on its own as it did inside
  // the hub. The count is the pin scripts/test-photo-coverage.mjs uses.
  const ctx = { console, JSON, Object, String, Math };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  vm.runInContext(PHOTOS, vm.createContext(ctx), { filename: "browse-photos.js" });
  const bp = ctx.BROWSE_PHOTOS || {};
  ok(Object.keys(bp).length > 300,
    `browse-photos.js publishes only ${Object.keys(bp).length} portraits — the map did not travel whole`);
  const bad = Object.entries(bp).filter(([, v]) => !/^(https:\/\/|\/[^/]|data:image\/)/i.test(String(v)));
  eq(bad.length, 0, `${bad.length} entries in the lifted map are not usable image URLs (${bad.slice(0, 3).map(([k]) => k).join(", ")})`);
}

// ── The mini-DOM, same shape the other Door 2 harnesses use ──────────────────
function miniDom(win, ids) {
  const byId = {};
  const el = (id) => {
    const node = {
      id: id || "", className: "", textContent: "", value: "",
      style: {}, dataset: {}, children: [], hidden: false, attrs: {}, _html: "",
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { this.children.push(c); if (c && c.id) byId[c.id] = c; return c; },
      removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, click() {},
      scrollIntoView() {}, querySelector() { return null; }, querySelectorAll() { return []; },
      getBoundingClientRect() { return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }; },
    };
    Object.defineProperty(node, "innerHTML", {
      get() { return node._html; },
      set(v) {
        node._html = String(v == null ? "" : v);
        const re = /\sid="([^"]+)"/g;
        let m;
        while ((m = re.exec(node._html)) !== null) if (!byId[m[1]]) byId[m[1]] = el(m[1]);
      },
    });
    if (id) byId[id] = node;
    return node;
  };
  (ids || []).forEach((i) => { byId[i] = el(i); });
  win.document.createElement = () => el("");
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = el("body");
  win.document.body.appendChild = function (c) { if (c && c.id) byId[c.id] = c; return c; };
  win.document.querySelector = () => null;
  win.document.querySelectorAll = () => [];
  return byId;
}

// THE DESK'S OWN MODULE LIST, not the hub's. browse-photos.js stands in for the
// <script> tag asserted above, and compare-hub.js is deliberately absent — this
// boot is the /ballot document, so a face that only resolves with the hub loaded
// is a face this harness must report as missing.
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "say-vs-do.js", "consistency.js", "voting-record.js", "word-action.js",
  "issue-colors.js", "my-stances.js", "voter-hub-location.js",
  "browse-photos.js", "seat-field.js", "ballot-breakdown.js",
  "person-file.js", "person-link.js", "race-sheet.js", "ballot-workspace.js",
];
const DOM_IDS = ["ballot-workspace", "bw-body", "bw-rail", "bw-count", "voter-hub", "who-represents-me"];
const LAYTON = { state: "Utah", city: "Layton", county: "Davis County" };

function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const nav = [];
  win.location = Object.assign({}, win.location, {
    assign(u) { nav.push(String(u)); }, replace(u) { nav.push("REPLACE:" + String(u)); },
  });
  win.__nav = nav;
  const store = {};
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; },
  };
  const sess = {};
  win.sessionStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(sess, k) ? sess[k] : null),
    setItem: (k, v) => { sess[k] = String(v); }, removeItem: (k) => { delete sess[k]; },
  };
  win.auth = { currentUser: null };
  win._cmpSelected = new Set();
  win.history = { replaceState() {}, pushState() {}, state: null, back() {} };
  win._pdxDisplayScore = () => null;
  const byId = miniDom(win, DOM_IDS);
  const sandbox = vm.createContext(win);
  const errors = [];
  FILES.forEach((f) => {
    try { vm.runInContext(R(f), sandbox, { filename: f }); }
    catch (e) { errors.push(`${f}: ${e.message}`); }
  });
  win.PROFILES = win.PROFILES || {};
  win._pdxPersonById = (pid) => { try { return (pid && win.CMP_DATA[pid]) ? win.CMP_DATA[pid] : null; } catch (e) { return null; } };
  win._hasUserLocation = true;
  win._currentVoterLocation = opts.location || LAYTON;
  win.__errors = errors;
  win.__byId = byId;
  return win;
}

const pane = (w, key) => {
  try { w.pdxBallotWorkspaceOpen(key); } catch (e) { return `THREW: ${e.message}`; }
  const n = w.document.getElementById("bw-body");
  return n ? String(n.innerHTML) : "";
};

const W = boot({});
must(W.__errors.length === 0,
  `a module failed to load, so every row below would be asserted against a stub:\n    ${W.__errors.join("\n    ")}`);
must(typeof W.pdxBallotWorkspaceOpen === "function", "the ballot workspace does not open");
must(typeof W._getPhotoUrl === "function",
  "window._getPhotoUrl is not on the /ballot document — the one resolver the row is supposed to agree with is missing");
must(W.BROWSE_PHOTOS && Object.keys(W.BROWSE_PHOTOS).length > 300,
  "the curated map did not reach the boot, so 'this candidate has no photo' would be true of everybody");
must(W.PDXPersonLink && typeof W.PDXPersonLink.pid === "function", "person-link.js is not loaded");

// Every seat the desk can open for this reader, from the desk's own list.
const SEATS = (W.PDXBallotWorkspace._seats() || []).map((s) => s.key);
must(SEATS.length > 0, "the desk offers this reader no seats at all");

// ── One row, parsed ─────────────────────────────────────────────────────────
// The row is read as markup rather than through a DOM query because the failure
// this file is about is IN the markup: which element the <img> is nested in.
function rows(html) {
  const out = [];
  const re = /<li class="bw-cand[^"]*">([\s\S]*?)<\/li>/g;
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}
const ATTR = (tag, name) => {
  const m = new RegExp(name + '="([^"]*)"').exec(tag);
  return m ? m[1] : null;
};

// ═════════════════════════════════════════════════════════════════════════════
section("2 · Every named desk card: a real portrait, or the placeholder");
// ═════════════════════════════════════════════════════════════════════════════
let cards = 0, withFace = 0, withPlaceholder = 0;
const seen = [];
for (const key of SEATS) {
  const html = pane(W, key);
  lacks(html, "THREW:", `the ${key} desk threw instead of painting`);
  for (const row of rows(html)) {
    cards++;
    const face = /<span class="bw-face([^"]*)"[^>]*>([\s\S]*?)<\/span>/.exec(row);
    ok(!!face, `a ${key} candidate row has no face element at all — the row is a name again`);
    if (!face) continue;
    const img = /<img\b[^>]*>/.exec(row);
    const href = ATTR(/<a class="bw-cand-name"[^>]*>/.exec(row)?.[0] || "", "href");
    const pid = href ? href.replace("/p/", "") : "";
    seen.push(pid);
    if (img) {
      withFace++;
      const src = ATTR(img[0], "src") || "";
      ok(/^https:\/\//.test(src), `${pid}: the desk's portrait is not an https URL — ${src}`);
      const host = (src.split("/")[2] || "").toLowerCase();
      ok(ALLOWED.has(host), `${pid}: the desk's portrait comes from ${host}, which is outside the trusted portrait hosts`);
      // The box, in both places. The attribute pair is the intrinsic ratio the
      // browser reserves before the bytes arrive; the stylesheet is what the
      // placeholder shares with it.
      eq(ATTR(img[0], "width"), "38", `${pid}: the portrait carries no width attribute, so the row reflows when it lands`);
      eq(ATTR(img[0], "height"), "38", `${pid}: the portrait carries no height attribute, so the row reflows when it lands`);
      eq(ATTR(img[0], "loading"), "lazy", `${pid}: the portrait is not lazy-loaded, so a five-candidate field costs five images before the seat panel is read`);
      has(img[0], "onerror=", `${pid}: the portrait has no onerror, so a dead URL paints a broken frame on a candidate's row`);
      // THE ROW AGREES WITH THE PERSON FILE BY CONSTRUCTION. Same resolver, same
      // canonical pid, so the face here and the face one tap later are one fact.
      eq(src, W._getPhotoUrl(pid),
        `${pid}: the desk paints a different portrait than window._getPhotoUrl gives the person file for the same pid`);
      lacks(img[0], "onclick", `${pid}: the portrait carries a click handler of its own — the link it sits in is the behaviour`);
    } else {
      withPlaceholder++;
      has(face[2], "&#127963;", `${pid}: no portrait and no courthouse either — the row has a hole where a face goes`);
      has(face[0], "is-empty", `${pid}: the placeholder does not carry .bw-face.is-empty, so it has no box and the row collapses`);
      eq(W._getPhotoUrl(pid), "",
        `${pid}: the desk painted the placeholder for somebody the resolver CAN answer for`);
    }
    lacks(row, 'src=""', `${pid}: an <img> with an empty src — that is the broken frame, painted deliberately`);
  }
}
must(cards > 0, "no candidate rows painted at all, so this file asserted nothing");
ok(withFace >= 4,
  `only ${withFace} of ${cards} desk rows resolved a real portrait — the Utah delegation's faces are in the curated map, so this is the map failing to reach the document`);
console.log(`      ${cards} desk rows: ${withFace} portraits, ${withPlaceholder} placeholders`);

// ═════════════════════════════════════════════════════════════════════════════
section("3 · The face is inside the link the name is inside");
// ═════════════════════════════════════════════════════════════════════════════
for (const key of SEATS) {
  for (const row of rows(pane(W, key))) {
    // Anchor open, face, name, anchor close — in that order, with nothing else
    // opening a target in between. This single regex is the whole of item 4 in
    // the header: one row, one tap target, and the img is a child of it.
    const nested = /<a class="bw-cand-name"[^>]*>\s*<span class="bw-face[^"]*"[^>]*>[\s\S]*?<\/span>\s*<span class="bw-cand-label">[^<]+<\/span>\s*<\/a>/.exec(row);
    ok(!!nested,
      `a ${key} row does not nest the face and the name inside one <a href="/p/…">: ${row.slice(0, 200)}`);
    const a = /<a class="bw-cand-name"[^>]*>([\s\S]*?)<\/a>/.exec(row);
    if (a) {
      lacks(a[1], "<a ", "a person link on the desk contains a second anchor");
      lacks(a[1], "<button", "a person link on the desk contains a button — a control inside a link is neither");
      ok(/^\/p\/[A-Za-z0-9_]+$/.test(ATTR(/<a class="bw-cand-name"[^>]*>/.exec(row)[0], "href") || ""),
        "a desk person link's href is not a /p/<pid> address");
    }
    // The pick button is still outside the link, and still the only button.
    ok(row.indexOf('class="bw-pick') > row.indexOf("</a>"),
      "the pick button moved inside the candidate's link");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · A retired id never renders — not in the href, not in the src");
// ═════════════════════════════════════════════════════════════════════════════
// PDXProfilePid folds a retired spelling into the record it was merged with.
// candOpen() runs every id through it (via PDXPersonLink.attrs) and the face
// runs the same id through the same function, so the two halves of a row cannot
// name two different people. What this section pins is that the desk PRINTS the
// survivor: a canonical pid is its own canonical pid.
{
  let checked = 0;
  for (const pid of seen) {
    if (!pid) continue;
    checked++;
    eq(W.PDXPersonLink.pid(pid), pid,
      `the desk printed ${pid}, which is an alias — the record it opens is filed under another id`);
  }
  ok(checked > 0, "no pids were collected from the desk, so the alias pin is vacuous");
  // And the resolver's own hop still works on the canonical id, which is the
  // chew_h68 case: the portrait is filed under the card key, the row asks with
  // the roster id, and the face still arrives.
  const alias = W.PDX_PROFILE_ALIAS || {};
  const pair = Object.keys(alias).find((k) => W.BROWSE_PHOTOS[k] && alias[k] && !W.BROWSE_PHOTOS[alias[k]]);
  if (pair) {
    eq(W._getPhotoUrl(alias[pair]), W.BROWSE_PHOTOS[pair],
      `a portrait filed under the card key ${pair} does not resolve on the roster id ${alias[pair]}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · No party ring, no new fetch, no second copy of the rule");
// ═════════════════════════════════════════════════════════════════════════════
{
  const block = CSS.slice(CSS.indexOf(".bw-face {"), CSS.indexOf(".bw-cand-tags"));
  must(block.length > 40, "the .bw-face rule is gone from ballot-workspace.css, so the face has no box");
  for (const tint of ["#ef4444", "#dc2626", "#3b82f6", "#2563eb", "party", "--pdx-party"]) {
    lacks(block, tint,
      `the face's box carries ${tint} — a tinted ring around a headshot is a party read, and this surface already prints three measurements`);
  }
  has(block, "width: 38px", "the face's box has no fixed width, so a portrait arriving late reflows the row");
  has(block, "height: 38px", "the face's box has no fixed height");
  has(CSS, ".bw-face.is-empty", "the placeholder has no rule of its own, so a missing portrait is an unstyled glyph");
  has(CSS, "object-fit: cover", "the portrait is not cover-fitted, so a tall headshot distorts in a square box");
}
lacks(WORK, "fetch(",
  "ballot-workspace.js fetches something — a portrait URL is already in memory and the desk may not ask the network for one");
// ONE RESOLVER. The row asks _getPhotoUrl first; the two direct map reads under
// it are for a document that does not load it, not a second opinion — so the
// desk must not carry its own alias walk or its own tier order.
has(WORK, "window._getPhotoUrl(p)", "the desk no longer asks the app's one photo resolver");
lacks(WORK, "PDX_PROFILE_ALIAS", "the desk grew its own alias table — that hop belongs to _getPhotoUrl alone");
has(WORK, "function canonPid(", "the desk does not canonicalise the pid it paints a face for");

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ ballot desk photos: ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`\n✓ ballot desk photos: ${passed} checks passed\n`);
