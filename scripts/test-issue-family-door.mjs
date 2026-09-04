#!/usr/bin/env node
/**
 * test-issue-family-door.mjs — a family opens the desk, and no list is filtered by party
 * ─────────────────────────────────────────────────────────────────────────────
 * Two destinations in this app named an issue FAMILY and then mounted a league
 * table of people.
 *
 * The bundle footer on Door 1 said "open the full Climate, Energy & Land
 * ledger" and routed through pdxDoor1IssueFace, whose middle branch was
 * PDXIssueView.open. Climate, Energy & Land holds seventeen tracked keys and is
 * not a leaf file, so there was no ledger to open: what arrived was every
 * tracked politician ranked head to head by consistency, filed under the
 * family's name, with "Any party / R / D / Ind" pills across the top. The topic
 * chip on a person's file did the same thing from the other side — it printed
 * the family's label, handed the overlay the LEAF key, and answered a question
 * about one person with a characterisation of every other one.
 *
 * And the party pills argued with the reading underneath them. That list
 * measures a person against their OWN stated position; a caucus letter has
 * nothing to do with whether they kept it, so filtering by party turned a
 * say-vs-do read into a partisan scoreboard.
 *
 * What this file pins:
 *
 *   1. THE FOOTER OFFERS THE FAMILY'S KEYS, THROUGH THE DESK'S ONE DOOR. The
 *      bundle overview's footer calls window.pdxDoor1Issue(core), names the
 *      number of keys behind it, and promises no ledger. pdxDoor1IssueFace —
 *      the second issue door, whose middle branch was the overlay — does not
 *      exist on the page at all.
 *   2. SEVENTEEN GREEN CHIPS, WHICH IS THE SMOKE. The climate bundle paints one
 *      chip per tracked key, every one of them carrying the family's own hue,
 *      every one of them opening on the desk — and the footer's count and the
 *      family note's count are that shelf's length, not a second opinion.
 *   3. PRESSING THE FOOTER OPENS THE DESK AND BUILDS NO RANKING. The onclick is
 *      lifted out of the painted markup and run: the desk lands on the family,
 *      PDXIssueView.open is never called, and no overlay opens.
 *   4. #issue=<core> LANDS ON THE DESK TOO — including on a cold page where the
 *      desk's deferred script has not run yet. Driven through a captured timer
 *      queue: the first attempt finds no door, the wait is scheduled, the desk's
 *      script runs, and the arrival lands on the family the address named.
 *      Bounded, and never a ranking of the bundle as a substitute.
 *   5. A LEAF IS STILL A DESTINATION. pdxDoor1Issue(leaf) scopes the desk to that
 *      key and reads out its record; PDXIssueView.open(leaf) still opens the
 *      consistency overlay, because the ranking was never the defect — being the
 *      thing a family's name opened was.
 *      And the leaf's own file agrees: /i/<leaf>'s crumb names the family and
 *      opens the DESK on it, never PDXIssueView and never /i/<core>. Its
 *      letterhead's "how this issue was tested" block is a summary of the desk's
 *      census and nothing else: it never spells the desk's ledger markup, never
 *      reads caucus, and never orders anybody.
 *   6. NOTHING SORTS OR FILTERS BY PARTY. No party control in the overlay's
 *      chrome, none in its stylesheet, none in its filter, and the ranked rows
 *      themselves are not grouped by caucus — checked on the live rows, not on
 *      the markup that would have listed the pills.
 *      The desk's own bands of people now carry a filter row, which is the same
 *      temptation on a second surface: direction, vehicle, chamber and name are
 *      the four axes it offers, and the one it does not is swept for on the
 *      isolated source of the block that builds the chips. The process line
 *      beside it gets the same sweep. Both are cut from one census, and that
 *      census comes back byte-identical with every caucus letter on the roster
 *      swapped.
 *   7. THE FIXES ARE LOAD-BEARING. Eight source mutations that put each defect
 *      back — including a fourth chip group, keyed on caucus, beside the filter
 *      row's three; every one of them has to break something above.
 *
 * Real shipped modules in a node:vm sandbox: the real family table, the real
 * ISSUE_MAP, the real roster, the real record corpus, and both doors LOADED —
 * so "no ranking was built" is a claim about a live builder that could have run.
 *
 *   node scripts/test-issue-family-door.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// Load order, as index.html defers them.
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
];
const SRC = FILES.map((f) => [f, R(f)]);
const VIEW_SRC = R("issue-view.js");
const DESK_SRC = R("door1-workspace.js");
const FILE_SRC = R("issue-file.js");
const VIEW_CSS = R("issue-view.css");
const HELPERS_SRC = R("stance-helpers.js");

const CORE = "climate_energy";
// The head escapes what it prints, and this label carries an "&" — so the
// marker is the part of the family's name that survives esc() unchanged.
const CORE_LABEL = "Climate, Energy";
const LEAF = "lands_preserve";
const HUE = "#2ECC71";        // the family's own tint, from issue-colors.js
const KIDS = 17;              // the keys the parent table files under it
const ORIGIN = "https://www.politidex.fyi";

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const has = (hay, needle, msg) => ok(String(hay).indexOf(needle) >= 0, `${msg} — missing ${JSON.stringify(needle)}`);
const no = (hay, needle, msg) => ok(String(hay).indexOf(needle) < 0, `${msg} — found ${JSON.stringify(needle)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ issue family door: STALE HARNESS — ${msg}`);
  process.exit(2);
};

const corpus = buildCorpus(ROOT);
must(corpus && corpus.byMember && corpus.byMember.size > 100,
  "the record corpus did not load enough members to sweep");

// ── a DOM real enough for a desk and an overlay ─────────────────────────────
function mkNode(id, reg) {
  const set = new Set();
  const sel = {};
  const n = {
    id: id || "", className: "", innerHTML: "", textContent: "", value: "", tagName: "DIV",
    style: { setProperty() {}, removeProperty() {} }, dataset: {}, children: [], hidden: false,
    attrs: {}, firstChild: null,
    classList: {
      add: (c) => set.add(c), remove: (c) => set.delete(c),
      toggle: (c, on) => (on === undefined ? (set.has(c) ? set.delete(c) : set.add(c)) : (on ? set.add(c) : set.delete(c))),
      contains: (c) => set.has(c),
    },
    setAttribute(k, v) { n.attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(n.attrs, k) ? n.attrs[k] : null; },
    removeAttribute(k) { delete n.attrs[k]; },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    appendChild(c) { n.children.push(c); if (c && c.id && reg) reg(c); return c; },
    insertBefore(c) { n.children.unshift(c); if (c && c.id && reg) reg(c); return c; },
    removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, blur() {}, click() {},
    scrollIntoView() {},
    // The overlay writes its chrome into a child it finds by class. Memoised so
    // the node issue-view.js painted into is the node this test reads back.
    querySelector(s) {
      const k = String(s);
      if (!sel[k]) sel[k] = mkNode("", reg);
      return sel[k];
    },
    querySelectorAll() { return []; },
    closest() { return null; }, contains() { return true; },
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 320, height: 44, bottom: 44, right: 320 }),
  };
  n.__sel = sel;
  return n;
}

// opts.deferDesk — leave door1-workspace.js unloaded and hand back runDesk(), so
// section 4 can drive the cold window where the desk's script has not run.
// opts.captureTimers — collect setTimeout callbacks instead of dropping them.
function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const sess = {};
  win.sessionStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(sess, k) ? sess[k] : null),
    setItem: (k, v) => { sess[k] = String(v); },
    removeItem: (k) => { delete sess[k]; },
  };
  win.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  win.__sess = sess;
  win.location = { href: ORIGIN + "/", pathname: "/", search: "", hash: opts.hash || "", origin: ORIGIN,
    assign(u) { win.__nav.push(String(u)); } };
  win.__nav = [];
  win.history = { replaceState() {}, pushState() {} };
  win.__listeners = {};
  win.addEventListener = (t, f) => { (win.__listeners[t] = win.__listeners[t] || []).push(f); };
  win.__timers = [];
  if (opts.captureTimers) {
    win.setTimeout = (f, ms) => { win.__timers.push({ f, ms }); return win.__timers.length; };
    win.clearTimeout = () => {};
  }
  win.flush = (rounds) => {
    for (let i = 0; i < (rounds || 1); i++) {
      const q = win.__timers.splice(0, win.__timers.length);
      for (const t of q) { try { t.f(); } catch (e) { /* a settle pass may need a DOM this harness lacks */ } }
    }
  };

  const byId = {};
  const reg = (n) => { if (n && n.id) byId[n.id] = n; };
  const mk = (id) => { const n = mkNode(id, reg); reg(n); return n; };
  ["pdx-door1-workspace", "pdx-d1-body", "issue-front-door"].forEach(mk);
  win.document.createElement = () => mkNode("", reg);
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = mk("body");
  win.document.body.style = { overflow: "" };
  win.document.querySelector = () => null;
  win.document.activeElement = null;
  win.__byId = byId;

  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  win.__loadErrors = [];
  for (const [f, src] of SRC) {
    const use = (opts.swap && opts.swap[f]) || src;
    try { vm.runInContext(use, ctx, { filename: f }); }
    catch (e) { win.__loadErrors.push(`${f}: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
  // PARTY-BLIND, PROVED BY SUBSTITUTION. Every caucus letter on the roster is
  // swapped before anything is ranked. If a list's membership or its order moves,
  // party got a vote somewhere in the read.
  if (opts.flipParty) {
    const flip = (p) => {
      const c = String(p || "").trim().charAt(0).toUpperCase();
      if (c === "R") return "Democrat";
      if (c === "D") return "Republican";
      return p;
    };
    for (const id of Object.keys(win.CMP_DATA || {})) {
      const d = win.CMP_DATA[id];
      if (d && d.party) d.party = flip(d.party);
    }
  }
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  win.PDXVotingRecord.fetchIssueRecords = function (keys) {
    const ks = (keys || []).slice();
    const byPid = {};
    for (const [pid] of corpus.byMember) {
      let items = [];
      for (const k of ks) {
        let part = [];
        try { part = win._pdxRecordIssueItems(pid, k) || []; } catch { part = []; }
        items = items.concat(part);
      }
      if (items.length) byPid[pid] = items;
    }
    return Promise.resolve({ byPid, truncated: false });
  };
  win.PDXVotingRecord.fetchCompare = function () { return Promise.resolve({ byPid: {} }); };
  win._issueLabel = (k) => (win.ISSUE_MAP[k] && win.ISSUE_MAP[k].label) || "";
  win.PDXSpotlight = { list: () => [] };
  // The People's Mandate lookup is declared inline in index.html, and the topic
  // chip's row builder calls it for its third chip. Answering "no reform maps to
  // this key" is what the page answers for most keys, and Mandate is not what
  // this file is about.
  win._pdxMandateForIssue = () => [];
  win.PDXLazyData = { ensure: () => Promise.resolve(true), loaded: () => true, whenReady: (k, cb) => cb() };
  win.PDX_BILLS_INDEX = win.PDX_BILLS_INDEX || [];
  win.__routed = [];
  win.pdxDoorWork = (id) => { win.__routed.push("work:" + id); return true; };
  win.pdxDoor = (mode) => { win.__routed.push("door:" + mode); return true; };

  vm.runInContext(opts.view || VIEW_SRC, ctx, { filename: "issue-view.js" });
  win.__runDesk = () => vm.runInContext(opts.desk || DESK_SRC, ctx, { filename: "door1-workspace.js" });
  if (!opts.deferDesk) win.__runDesk();

  // Every call to the overlay's own entrance, counted — and still delegated, so
  // a leaf goes on opening.
  win.__opens = [];
  const realOpen = win.PDXIssueView.open;
  win.PDXIssueView.open = function (k, o) { win.__opens.push(String(k)); return realOpen.call(this, k, o); };
  win.__eval = (js) => vm.runInContext(js, ctx, { filename: "onclick" });
  return win;
}

const deskPaint = (w) => {
  w.PDXDoor1.sync();
  const h = w.document.getElementById("pdx-d1-body");
  return h ? String(h.innerHTML) : "";
};
const openBundle = (w, key) => { w.pdxDoor1Issue(key); return deskPaint(w); };
const panelHtml = (w) => {
  const ov = w.document.getElementById("pdx-issue-overlay");
  if (!ov) return "";
  return String((ov.__sel[".iv-panel"] || {}).innerHTML || "");
};
const overlayOpen = (w) => {
  const ov = w.document.getElementById("pdx-issue-overlay");
  return !!(ov && ov.classList.contains("is-open"));
};
// Every key chip on the shelf, with the attributes that matter.
const keyChips = (html) =>
  [...String(html).matchAll(/<button type="button" class="d1-chip is-key[^"]*"([^>]*)>([^<]*)</g)]
    .map((m) => ({ attrs: m[1], label: m[2] }));
const footer = (html) => {
  const m = /<p class="d1-more">([\s\S]*?)<\/p>/.exec(String(html));
  return m ? m[0] : "";
};

const w0 = boot();
must(!w0.__loadErrors.length, "modules failed to load: " + w0.__loadErrors.join("; "));
must(typeof w0.pdxDoor1Issue === "function", "the desk's issue door did not export");
must(typeof w0.PDXIssueView.buildRanking === "function", "PDXIssueView.buildRanking is gone — the desk reads it");
must((w0.PDXIssueFamily.childrenOf(CORE) || []).length === KIDS,
  `the family table no longer files ${KIDS} keys under ${CORE}`);

console.log("── issue family door · a family opens the desk, and no list is filtered by party");

// ══════════════════════════════════════════════════════════════════════════
section("1 · the footer offers the family's keys, through the desk's one door");
// ══════════════════════════════════════════════════════════════════════════
const bundle = openBundle(w0, CORE);
must(bundle.indexOf("d1-fam-note") >= 0, "the bundle overview did not paint — no family note in the desk body");
const foot = footer(bundle);
ok(foot.length > 0, "the climate bundle painted no footer — the inventory is at or under the list cap, " +
  "so the sentence this section is about never rendered");
has(foot, "window.pdxDoor1Issue('" + CORE + "')", "the footer opens the family through the desk's one door");
has(foot, "open its " + KIDS + " keys", "the footer names what is behind it: the family's keys");
has(foot, "has no ledger of its own", "the footer says a family has no ledger");
no(foot, "pdxDoor1IssueFace", "the footer no longer routes through the second issue door");
no(foot, "open the full", "the footer no longer offers to open a full anything");
no(foot, "PDXIssueView", "the footer does not reach the ranking overlay");
no(bundle, "ranked by consistency", "the bundle overview does not offer a consistency ranking");
eq(typeof w0.pdxDoor1IssueFace, "undefined",
  "pdxDoor1IssueFace is gone from the page — one desk, one issue door");
no(DESK_SRC, "pdxDoor1IssueFace = ", "no second issue door is declared in door1-workspace.js");

// ══════════════════════════════════════════════════════════════════════════
section("2 · seventeen green chips, which is the smoke");
// ══════════════════════════════════════════════════════════════════════════
const chips = keyChips(bundle);
eq(chips.length, KIDS, `the climate bundle paints one chip per tracked key`);
const green = chips.filter((c) => c.attrs.indexOf(HUE) >= 0).length;
eq(green, KIDS, `every key chip carries the family's own hue ${HUE}`);
const deskOpeners = chips.filter((c) => /onclick="window\.pdxDoor1Issue\('[a-z0-9_]+'\)"/.test(c.attrs)).length;
eq(deskOpeners, KIDS, "every key chip opens its key on the desk");
has(chips.map((c) => c.attrs).join(" "), "'" + LEAF + "'", `the shelf carries ${LEAF} as its own chip`);
has(bundle, "is a family of " + KIDS + " keys, not a single file",
  "the family note counts the shelf that is actually there");
const nMore = /<p class="d1-more">(\d+) more with a formal row/.exec(bundle);
ok(!!nMore, "the footer counts the people it is not listing");
// The footer's key count and the note's key count are one read of childKeys().
eq((foot.match(new RegExp("open its " + KIDS + " keys")) || []).length, 1,
  "the footer and the family note agree on how many keys the family holds");

// ══════════════════════════════════════════════════════════════════════════
section("3 · pressing the footer opens the desk and builds no ranking");
// ══════════════════════════════════════════════════════════════════════════
const w1 = boot();
const b1 = openBundle(w1, CORE);
const onclick = /<button type="button" class="d1-link" onclick="([^"]+)"/.exec(footer(b1));
must(!!onclick, "the footer's control carries no onclick to press");
w1.__sess["pdx_d1_issue"] = "";      // forget the family, so the press is what lands on it
w1.__opens.length = 0;
w1.__eval(onclick[1].replace(/&#39;/g, "'").replace(/&amp;/g, "&"));
eq(w1.__sess["pdx_d1_issue"], CORE, "the press lands the desk on the family the footer named");
eq(w1.__opens.length, 0, "the press called PDXIssueView.open " + w1.__opens.length + " time(s) — it must call it none");
eq(overlayOpen(w1), false, "no ranking overlay opened");
const after = deskPaint(w1);
eq(keyChips(after).length, KIDS, "and what the desk paints is the family's key shelf");

// ══════════════════════════════════════════════════════════════════════════
section("4 · #issue=<core> lands on the desk, even before the desk has booted");
// ══════════════════════════════════════════════════════════════════════════
// Warm page first: the overlay's own entrance, handed a family.
const w2 = boot();
w2.__opens.length = 0;
w2.PDXIssueView.open(CORE);
eq(w2.__sess["pdx_d1_issue"], CORE, "PDXIssueView.open(core) hands the family to the desk");
eq(overlayOpen(w2), false, "and paints no ranking of the bundle");
eq(panelHtml(w2), "", "the overlay panel was never written to");
has(deskPaint(w2), "is a family of " + KIDS + " keys", "the desk read out the family instead");
// A key no bundle claims is not reparented into the first family on the list.
const w2b = boot();
w2b.PDXIssueView.open("no_such_issue_key_at_all");
eq(overlayOpen(w2b), false, "an unclaimed key opens no ranking either");
no(panelHtml(w2b), "Climate", "and is not filed under a stranger's family");
// Cold page: the address arrives, the desk's deferred script has not run.
const w3 = boot({ deferDesk: true, captureTimers: true, hash: "#issue=" + CORE });
eq(typeof w3.pdxDoor1Issue, "undefined", "the desk's script really has not run yet");
const hashers = w3.__listeners["hashchange"] || [];
ok(hashers.length > 0, "issue-view.js registered a hashchange handler");
hashers.forEach((f) => f());
eq(overlayOpen(w3), false, "the cold arrival paints no ranking while it waits");
ok(w3.__timers.length > 0, "the wait for the door was scheduled");
w3.__runDesk();
w3.flush(4);
eq(w3.__sess["pdx_d1_issue"], CORE, "and once the desk's script runs, the arrival lands on the family");
eq(overlayOpen(w3), false, "still no ranking");

// ══════════════════════════════════════════════════════════════════════════
section("5 · a leaf is still a destination");
// ══════════════════════════════════════════════════════════════════════════
const w4 = boot();
const leafDesk = openBundle(w4, LEAF);
eq(w4.__sess["pdx_d1_issue"], LEAF, "the desk holds the leaf key");
has(leafDesk, "d1-chip is-key is-open", "the leaf's own chip is marked open on the shelf");
no(leafDesk, "is a family of", "a leaf gets a record, not the family sentence");
ok(leafDesk.length > bundle.length / 4, "the leaf desk painted a body of its own");
// And the consistency overlay still opens on a key — it was never the defect.
const w5 = boot();
w5.PDXIssueView.open(LEAF);
eq(overlayOpen(w5), true, "PDXIssueView.open(leaf) still opens the overlay");
const leafPanel = panelHtml(w5);
has(leafPanel, "ranked by consistency", "the consistency ranking survives on a key");
has(leafPanel, "backs up their words", "with its own reading intact");
has(leafPanel, "Narrowed to one issue", "and says which key it is narrowed to");
has(leafPanel, "desk · all its keys", "its widening control offers the desk, not a bundle ranking");
// Widening leaves rather than clearing the key in place.
const w6 = boot();
w6.PDXIssueView.open(LEAF);
w6.__sess["pdx_d1_issue"] = "";
w6.PDXIssueView.open(CORE);
eq(w6.__sess["pdx_d1_issue"], CORE, "widening from a leaf goes to the family's desk");
eq(overlayOpen(w6), false, "and closes the ranking behind it");

// ── AND THE LEAF'S OWN FILE SENDS THE FAMILY TO THE SAME PLACE ──────────────
// /i/<leaf> grew a letterhead and a live crumb, and the crumb names the FAMILY.
// A core is not a file — pdx-issue-profile.js refuses /i/<core> — so the crumb
// had exactly two places it could go: the desk's one issue door, or the ranked
// overlay this whole file exists to keep families out of. The behaviour is
// asserted on a painted panel in scripts/test-issue-file-address.mjs; what is
// asserted HERE is the wall, on the source, in this file's own terms.
no(FILE_SRC, "PDXIssueView", "issue-file.js reaches for the ranked overlay — a family crumb is a desk door");
no(FILE_SRC, "pdxDoor1IssueFace", "issue-file.js reaches for the second issue door that no longer exists");
has(FILE_SRC, "window.pdxDoor1Issue", "issue-file.js's crumb does not use the desk's one issue door");
for (const pill of ["data-fparty", "Any party", "iv-fbtn--"]) {
  no(FILE_SRC, pill, `issue-file.js paints a party control (${pill}) on the file's letterhead`);
}
// Comments stripped for these two: the file's own header names both phrases in
// the course of saying it does not print them, and a note is not a paint.
const FILE_CODE = FILE_SRC.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
for (const rank of ["ranked by consistency", "backs up their words", "Direction Match"]) {
  no(FILE_CODE, rank, `issue-file.js's letterhead prints "${rank}" — that is the overlay's reading, not a file's`);
}

// ── AND THE LETTERHEAD'S PROCESS BLOCK IS A SUMMARY, NOT A SECOND DESK ──────
// The file grew a "how this issue was tested" block: PRIMARY against provision
// against procedural, primary-only against package-only against mixed, and the
// acts by class. Counts, all of them, and every one read off the census the desk
// already computed — which is the only reason a question this shaped belongs on
// a leaf's letterhead at all. Were the panel to spell the desk's ledger markup
// itself, two builders would be painting one issue again and these family walls
// would have a second surface to hold. It jumps by the id the census hands it.
no(FILE_CODE, "d1-led", "issue-file.js spells the desk's ledger markup — the panel summarises, it does not rebuild");
has(FILE_SRC, "pr.measures && pr.measures.id", "the panel's jump is not taken from the census's own anchor id");
for (const axis of ["party", "caucus", "Republican", "Democrat"]) {
  no(FILE_CODE, axis, `issue-file.js's process block reads caucus (${axis}) — no count on this file is by party`);
}
for (const rankish of ["sort", "Sort", "rank", "Rank"]) {
  no(FILE_CODE, rankish, `issue-file.js orders something (${rankish}) — the letterhead counts, it does not rank`);
}

// ══════════════════════════════════════════════════════════════════════════
section("6 · nothing sorts or filters by party");
// ══════════════════════════════════════════════════════════════════════════
for (const [what, html] of [["the overlay's chrome", leafPanel], ["the bundle overview", bundle], ["the leaf desk", leafDesk]]) {
  no(html, "data-fparty", `${what} paints no party control`);
  no(html, "Any party", `${what} offers no "Any party" reset`);
  no(html, "iv-fbtn--", `${what} paints no caucus-tinted pill`);
}
no(VIEW_SRC, "data-fparty", "issue-view.js declares no party control");
no(VIEW_SRC, "_fParty", "issue-view.js keeps no party filter state");
// The stylesheet, with its comments stripped: the note explaining why the three
// caucus pills are gone names them, and a note is not a rule.
const CSS_RULES = VIEW_CSS.replace(/\/\*[\s\S]*?\*\//g, "");
for (const pill of [".iv-fbtn--R", ".iv-fbtn--D", ".iv-fbtn--I"]) {
  no(CSS_RULES, pill, `issue-view.css declares no ${pill} rule`);
}
// The letter beside a name is identity and stays printed — what left is the
// control that sorted and filtered on it.
has(VIEW_SRC, "iv-row-party", "the party letter beside a name is still printed as identity");

// ── PARTY-BLIND, BY SUBSTITUTION ────────────────────────────────────────────
// Stronger than reading the markup for a missing pill: every R on the roster is
// made a D and every D an R, and both the ranking and the desk's family
// inventory have to come back in the same order with the same people. A read
// that sorted, filtered, tie-broke or scored on caucus could not survive this.
const wFlip = boot({ flipParty: true });
const order = (w) => (w.PDXIssueView.buildRanking(w.PDXIssueFamily.coreObject(CORE), LEAF) || [])
  .map((r) => r && r.id).join(",");
const straight = order(w0);
ok(straight.split(",").length > 8, `the ranking produced ${straight.split(",").length} rows to compare`);
eq(order(wFlip), straight, "the leaf ranking is byte-identical with every caucus letter swapped");
const roll = (html) => [...String(html).matchAll(/d1-person-a[^>]*>([^<]*)</g)].map((m) => m[1]).join(",");
const invStraight = roll(bundle);
ok(invStraight.split(",").length > 8, `the family inventory listed ${invStraight.split(",").length} people to compare`);
eq(roll(openBundle(wFlip, CORE)), invStraight,
  "and the desk's family inventory is byte-identical with every caucus letter swapped");
// Belt and braces on the doctrine the desk already wrote down for itself.
has(DESK_SRC, "NO PARTY, EVER", "the desk still declares its own party rule");

// ── AND THE NEW FILTER ROW FILTERS ON EVERYTHING BUT CAUCUS ─────────────────
// The bands of people above grew a slice: direction, vehicle, chamber, name.
// Four axes, and the axis a reader arriving from the old ranking would most
// expect to find beside them is the one that is not there. Swept on the two
// source regions themselves rather than on a paint, because the slice is a view
// of one census and its interesting failure is a field it should never have
// read. Comments stripped both times: the slice block's own header names the
// pills it refuses and lists the sorts it will not offer, and a note is not a
// control.
const deskRegion = (a, b) => DESK_SRC.slice(DESK_SRC.indexOf(a), DESK_SRC.indexOf(b))
  .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
const SLICE_CODE = deskRegion("// OPENING A SLICE", "THE LEDGER MODEL");
const PROC_CODE = deskRegion("function ledgerMenu", "// OPENING A SLICE");
ok(SLICE_CODE.length > 2000, `the filter row isolated ${SLICE_CODE.length} bytes of code to sweep`);
ok(PROC_CODE.length > 500, `the process line isolated ${PROC_CODE.length} bytes of code to sweep`);
for (const [what, code] of [["the filter row", SLICE_CODE], ["the process line", PROC_CODE]]) {
  for (const axis of ["party", "Party", "caucus", "Republican", "Democrat", "data-fparty", "Any party", "iv-fbtn--"]) {
    no(code, axis, `${what} reads or paints caucus (${axis})`);
  }
  for (const order of [".sort(", "reverse(", "WVA", "Direction Match", "Your Match", "donat"]) {
    no(code, order, `${what} reorders the list (${order}) — a slice narrows, it never re-sorts`);
  }
}
// The four axes it does offer, named, so the sweep above cannot pass by deleting
// the row: direction from the index's own bands, vehicle from the standalone and
// provision counts already on each row, chamber from the office, name typed.
for (const axis of ["Advanced", "Primary-only", "U.S. Senate", 'type="search"']) {
  has(SLICE_CODE, axis, `the filter row no longer offers its ${axis} axis`);
}
// And the process line still asks the consistency module for its locked sentence
// instead of keeping a copy of the wording.
has(PROC_CODE, "M.say", "the process line stopped quoting PDXConsistency.menu for its locked sentence");

// ── AN EMPTY LEAF GETS NO CHIPS AND NO FIGURES ──────────────────────────────
// Nothing awaited the leaf's record read in this file's synchronous pass, so its
// ledger holds no rows — the same state a reader sees for the moment the desk is
// still reading. A list with no rows has no slice to open and no process figure
// to publish, and the desk paints neither. This is the busy gate seen from the
// desk's side; the panel's side of it is asserted on a warmed key in
// scripts/test-issue-file-address.mjs.
const leafCensus = w4.PDXDoor1.issueCensus(LEAF);
eq(leafCensus && leafCensus.people, 0, "the leaf's ledger unexpectedly holds rows in this pass");
no(leafDesk, "d1-led-slice", "an empty leaf desk paints a filter row over nothing");
no(leafDesk, "d1-led-chip", "an empty leaf desk paints a chip with nobody behind it");
// The census a slice and a process line are both cut from, under substitution.
openBundle(wFlip, LEAF);
eq(JSON.stringify(wFlip.PDXDoor1.issueCensus(LEAF)), JSON.stringify(leafCensus),
  "the census the slice and the process line are cut from moves when caucus letters are swapped");

// ══════════════════════════════════════════════════════════════════════════
section("7 · the topic chip on a person's file opens the record on its own key");
// ══════════════════════════════════════════════════════════════════════════
// The chip read the key's CORE, printed the family's label — "Where all stand:
// Climate, Energy & Land" — and handed PDXIssueView the LEAF key. Three
// different things in one control: a family named, a ranking opened, a key
// ranked. It names the key it holds now, and opens that key on the desk.
const wChip = boot();
const chipPid = Object.keys(wChip.CMP_DATA || {})[0];
must(!!chipPid, "the roster is empty, so there is no person file to paint a chip on");
const chipRow = wChip._pdxStanceConnectRow(chipPid, wChip.CMP_DATA[chipPid], { issueKey: LEAF, position: "" });
ok(String(chipRow).indexOf("is-topic") >= 0, "the person file still paints a topic chip");
has(chipRow, "window.pdxDoor1Issue('" + LEAF + "')", "the chip opens its own key on the desk");
has(chipRow, "/i/" + LEAF, "with the key's own file as the fallback for a page where the desk has not booted");
has(chipRow, "The record on:", "the chip says it opens a record");
no(chipRow, "PDXIssueView", "the chip does not reach the ranking overlay");
no(chipRow, "Where all stand", "and no longer promises where everyone stands");
no(chipRow, "Climate, Energy", "the family's label no longer stands in for the key's");
has(chipRow, "Public Lands", "the chip prints the key's own label");

// ══════════════════════════════════════════════════════════════════════════
section("8 · the fixes are load-bearing");
// ══════════════════════════════════════════════════════════════════════════
// The gate, spelled once: probe 1 removes it, and probe 2 removes it to get at
// the wall behind it.
const GATE = "    if (!t || !t.focusKey) {\n      deskDoor(t ? t.core.key : String(keyOrIssueKey == null ? '' : keyOrIssueKey), 0);\n      return;\n    }";
const probes = [
  {
    name: "the family gate in open() is removed",
    run: () => {
      const src = VIEW_SRC.replace(GATE, "    if (!t) { return; }");
      must(src !== VIEW_SRC, "probe 1 matched nothing — the gate was reworded");
      const w = boot({ view: src });
      w.PDXIssueView.open(CORE);
      // The state leaks: the overlay is flagged open under the family's name and
      // the desk was never handed the key.
      return overlayOpen(w) || w.__sess["pdx_d1_issue"] !== CORE;
    },
  },
  {
    name: "the wall in renderChrome() is removed as well",
    run: () => {
      // The wall is defence in depth: open()'s gate turns a family away before
      // renderChrome runs, so the only way to drive the wall is to take the gate
      // out first. With the gate gone the wall still refuses to paint — that is
      // this probe's control — and with both gone the family ranking paints, with
      // the bundle's own label over it.
      const gateless = VIEW_SRC.replace(GATE, "    if (!t) { return; }");
      must(gateless !== VIEW_SRC, "probe 2 matched nothing — the gate was reworded");
      const control = boot({ view: gateless });
      control.PDXIssueView.open(CORE);
      must(panelHtml(control).indexOf("ranked by consistency") < 0,
        "the wall did not hold with the gate removed — probe 2 has no control");
      const src = gateless.replace("if (!_focusKey) { deskDoor(_coreKey, 0); return; }", "if (!_focusKey) { /* */ }");
      must(src !== gateless, "probe 2 matched nothing — the wall was reworded");
      const w = boot({ view: src });
      w.PDXIssueView.open(CORE);
      const h = panelHtml(w);
      return h.indexOf("ranked by consistency") >= 0 && h.indexOf(CORE_LABEL) >= 0;
    },
  },
  {
    name: "the footer goes back to the ranked overlay",
    run: () => {
      const src = DESK_SRC.replace(
        "'<button type=\"button\" class=\"d1-link\" onclick=\"window.pdxDoor1Issue(\\'' +\n          jsq(core.key) + '\\')\">open its ' + kidN + ' key' + (kidN === 1 ? '' : 's') +",
        "'<button type=\"button\" class=\"d1-link\" onclick=\"window.PDXIssueView.open(\\'' +\n          jsq(core.key) + '\\')\">open the full ledger' + (kidN === 1 ? '' : '') +");
      must(src !== DESK_SRC, "probe 3 matched nothing — the footer was reworded");
      const w = boot({ desk: src });
      const f = footer(openBundle(w, CORE));
      return f.indexOf("window.pdxDoor1Issue('" + CORE + "')") < 0 || f.indexOf("PDXIssueView") >= 0;
    },
  },
  {
    name: "the party pills go back on the filter line",
    run: () => {
      const src = VIEW_SRC.replace("        scopeSet +",
        "        '<div class=\"iv-filter-set\">' +\n" +
        "          '<button type=\"button\" class=\"iv-fbtn\" data-fparty=\"\">Any party</button>' +\n" +
        "          '<button type=\"button\" class=\"iv-fbtn iv-fbtn--R\" data-fparty=\"R\">R</button>' +\n" +
        "        '</div>' + scopeSet +");
      must(src !== VIEW_SRC, "probe 4 matched nothing — the filter line was reworded");
      const w = boot({ view: src });
      w.PDXIssueView.open(LEAF);
      const h = panelHtml(w);
      return h.indexOf("data-fparty") >= 0 && h.indexOf("Any party") >= 0;
    },
  },
  {
    name: "the key shelf loses the family's hue",
    run: () => {
      const src = DESK_SRC.replace(
        "        return '<button type=\"button\" class=\"d1-chip is-key' + (k === focusKey ? ' is-open' : '') + '\"' +\n          skinAttrs(k) +",
        "        return '<button type=\"button\" class=\"d1-chip is-key' + (k === focusKey ? ' is-open' : '') + '\"' +");
      must(src !== DESK_SRC, "probe 5 matched nothing — the key shelf was reworded");
      const w = boot({ desk: src });
      return keyChips(openBundle(w, CORE)).filter((c) => c.attrs.indexOf(HUE) >= 0).length !== KIDS;
    },
  },
  {
    name: "the filter row grows a caucus chip",
    run: () => {
      // Section 6 sweeps a region of the desk's source rather than a paint, so
      // it owes a demonstration that the region it isolated is the region the
      // chips are actually built in. A fourth chip group goes in beside the
      // three, keyed on caucus, and the same isolation and the same token list
      // have to come back with a hit.
      const src = DESK_SRC.replace(
        "                 chipGroup('ch', 'Chamber', c.ch);",
        "                 chipGroup('ch', 'Chamber', c.ch) +\n" +
        "                 chipGroup('party', 'Party', c.party || []);");
      must(src !== DESK_SRC, "probe 8 matched nothing — the filter row's chip groups were reworded");
      const code = src.slice(src.indexOf("// OPENING A SLICE"), src.indexOf("THE LEDGER MODEL"))
        .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
      return ["party", "Party", "caucus", "Republican", "Democrat"].some((a) => code.indexOf(a) >= 0);
    },
  },
  {
    name: "the topic chip goes back to the ranked overlay",
    run: () => {
      const src = HELPERS_SRC.replace(
        "\"if(window.pdxDoor1Issue&&window.pdxDoor1Issue('\" + jsKey + \"')){}\" +",
        "\"window.PDXIssueView&&window.PDXIssueView.open('\" + jsKey + \"');\" +");
      must(src !== HELPERS_SRC, "probe 7 matched nothing — the chip was reworded");
      const w = boot({ swap: { "stance-helpers.js": src } });
      const row = w._pdxStanceConnectRow(chipPid, w.CMP_DATA[chipPid], { issueKey: LEAF, position: "" });
      return String(row).indexOf("PDXIssueView") >= 0;
    },
  },
  {
    name: "the widen control ranks the bundle in place again",
    run: () => {
      const src = VIEW_SRC.replace("if (wd) { deskDoor(_coreKey, 0); return; }",
        "if (wd) { _focusKey = ''; renderChrome(); return; }");
      must(src !== VIEW_SRC, "probe 6 matched nothing — the widen handler was reworded");
      return src.indexOf("_focusKey = ''; renderChrome()") >= 0 && VIEW_SRC.indexOf("_focusKey = ''; renderChrome()") < 0;
    },
  },
];
for (const p of probes) {
  let broke = false;
  try { broke = !!p.run(); } catch (e) { broke = true; }
  ok(broke, `PROBE SURVIVED — ${p.name}, and nothing here noticed`);
  if (broke) console.log(`      · ${p.name} → caught`);
}

// ── report ──────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  for (const f of failures) console.error(`   ✗ ${f}`);
  console.error(`\n✗ issue family door: ${failures.length} failure(s), ${passed} passed`);
  process.exit(1);
}
console.log(`✓ issue family door: ${passed} assertions passed`);
