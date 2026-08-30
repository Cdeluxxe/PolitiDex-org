#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// 🎴 Homepage showcase — generate the featured-roster seed
// ─────────────────────────────────────────────────────────────────────────────
// The homepage showcase rotates full politician SUMMARY cards — photo, the one
// ⚖️ Word vs Action read, coverage, the backed-up / mixed / contradicted
// breakdown, highlights and lowlights. This generator decides WHO is eligible to
// appear. It does not decide what their card says.
//
// WHY THIS FILE CARRIES NO VERDICTS — the important part
// gen-hero-receipt.mjs, its sibling, bakes real verdict stamps into a seed. That
// works because a curated receipt's verdict comes from acct-spotlight-data.js,
// which is a committed file: the engine can reach a conclusion with no network.
//
// A summary card cannot be seeded that way. Its verdict is pooled across every
// documented position, and the ACTION half of most of those comparisons is the
// roll-call record — which lives in the database behind /api/voting-record and is
// only warm in a live browser. Running the real stack in a VM here and asking for
// the marquee profiles' reads returns, verbatim:
//
//   massie      pub=n word=34 scorable=10 tested=0 warming=true  verdict=Loading the record…
//   jim_jordan  pub=n word=17 scorable=13 tested=0 warming=true  verdict=Loading the record…
//   chip_roy    pub=n word=11 scorable=8  tested=0 warming=true  verdict=Loading the record…
//
// Every one of them below the publishing floor, because nothing has been tested
// yet. A seed built from that would either ship a hero of "Loading the record…"
// cards or — far worse — freeze a thin, understated verdict into a static file
// and keep showing it after the record filled in. Both are the failure this
// product exists to avoid, so neither is on offer.
//
// So the division of labour is:
//   this file          → WHO is a candidate, ranked by coverage we can measure
//                        without a network, plus the framing text.
//   hero-showcase.js   → asks PDXProfileCard for the LIVE read at runtime and
//                        drops anyone whose read is not publishable.
//
// The seed can therefore only ever be an invitation list. It cannot put a
// verdict on screen, understate one, or keep a stale one alive.
//
// WHAT "COVERAGE WE CAN MEASURE" MEANS
// Two figures, both from committed data:
//   scorable — documented positions a formal action is capable of testing, via
//              the real PDXWordAction.read() (so the definition cannot drift).
//   actionIssues — distinct issues on which acct-spotlight-data.js already holds
//              a sourced, directional voting action. This is the curated half of
//              the ACTION side, and it is the best available predictor that a
//              live read will clear the floor.
// Ranked scorable*2 + actionIssues*3: breadth of word matters, but an issue with
// a real action attached matters more, because that is what gets tested.
//
// FAIL CLOSED
// Every gate can only REMOVE someone. No name, no office line, no documented
// word → not in the seed. If nothing survives, the list is empty and
// hero-showcase.js renders nothing at all.
//
// THE SECOND OUTPUT: THE STATIC RECORD LINKS
// The cards themselves are painted by JavaScript into an empty <div>, which means
// the homepage's served markup names nobody and links nowhere. A crawler reading
// / therefore never learns that /p/lee exists, and a reader with JavaScript off
// sees an empty slot. So this generator also writes a small strip of real
// <a href="/p/<canonicalPid>">Name</a> links into index.html, between sentinels,
// for exactly the people in the seed it just built. Same source, same order, one
// file — the strip cannot name someone the rotation does not, and the gate test
// fails if the two ever disagree.
//
// The href is the CANONICAL pid, resolved through the app's own PDXProfilePid
// (profile-evidence.js, loaded here for that one function). A retired alias like
// `scott_chew` is the display slug of a record filed under `chew_h68`, and the
// advertised address has to be the one the record actually lives at — publishing
// both is how one officeholder ends up indexed as two people.
//
//   node scripts/gen-hero-showcase.mjs      # writes hero-showcase-data.js
//                                           # and the strip inside index.html
//
// Deterministic: no timestamps, no randomness, ordering derived from the ranking
// above with pid as the tiebreak. Re-running on unchanged inputs is a no-op.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

export const OUT_PATH = "hero-showcase-data.js";
export const INDEX_PATH = "index.html";

// The alias table's home. Loaded on top of the engine, not as part of it: nothing
// in the ranking below reads it, and it is here only so the hrefs can be built
// with the app's OWN canonicalisation rather than a second copy of the table.
export const ALIAS_FILE = "profile-evidence.js";

// The block this generator owns inside index.html. Everything between these two
// lines is rewritten wholesale; everything outside them is never touched. A
// missing or duplicated sentinel is a hard error rather than a guess, because the
// alternative is a generator that edits 2 MB of hand-written markup by feel.
export const CRAWL_BEGIN = "<!-- pdx:hero-crawl:begin -->";
export const CRAWL_END = "<!-- pdx:hero-crawl:end -->";

// The browser files the read needs, in load order. Deliberately the smallest set
// that gets a real PDXWordAction.read(): cmp-data for the roster, the stance
// bundles for documented word, stance-helpers for _resolveStanceList, and
// alignment-tool for ISSUE_MAP's 110-key vocabulary. compare-hub.js is NOT here
// — it is large, DOM-heavy, and the only thing this needs from it is an office
// line, which is formatted locally instead.
export const ENGINE_FILES = [
  "cmp-data.js",
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  "stance-helpers.js",
  "alignment-tool.js",
  "acct-spotlight-data.js",
  "say-vs-do.js",
  "consistency.js",
  "word-action.js",
];

// How many candidates the seed carries. Larger than the number of cards the hero
// will show, on purpose: the runtime read drops everyone below the publishing
// floor, so the list needs slack or a good day at the database is the only thing
// standing between the showcase and an empty hero.
export const MAX_CANDIDATES = 18;
// A candidate needs at least this many testable positions to be worth inviting.
// Below it the live read will almost certainly fail the floor, and an invitation
// that is always declined is just payload.
export const MIN_SCORABLE = 6;

// ── A DOM stub just real enough to load the engine ───────────────────────────
// Every module here guards its DOM touches (mount() returns early without its
// host, boot() is wrapped in try/catch), so null-returning lookups are enough to
// reach the engine without rendering anything.
function stubEl() {
  return {
    style: {}, dataset: {}, children: [], hidden: false, innerHTML: "", textContent: "",
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    appendChild() {}, removeChild() {}, insertAdjacentHTML() {}, remove() {},
    addEventListener() {}, removeEventListener() {}, focus() {}, click() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
  };
}

export function makeSandbox() {
  const document = {
    readyState: "complete", cookie: "",
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return stubEl(); },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    head: stubEl(), body: stubEl(), documentElement: stubEl(),
  };
  const win = {
    document,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    // Timers are no-ops: several modules start refresh polls we neither need nor
    // want holding the process open.
    setTimeout() { return 0; }, clearTimeout() {},
    setInterval() { return 0; }, clearInterval() {},
    requestAnimationFrame() { return 0; }, cancelAnimationFrame() {},
    requestIdleCallback() { return 0; },
    matchMedia() { return { matches: false, addEventListener() {}, addListener() {} }; },
    getComputedStyle() { return { getPropertyValue() { return ""; } }; },
    location: { href: "https://www.politidex.fyi/", pathname: "/", search: "", hash: "", origin: "https://www.politidex.fyi" },
    navigator: { userAgent: "node" },
    screen: { width: 1280, height: 800 }, devicePixelRatio: 1,
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    // Anything reaching for the network gets a rejection rather than a hang. The
    // ranking below is defined entirely over committed files; a fetch firing here
    // would be a bug, and a rejected promise surfaces it.
    fetch() { return Promise.reject(new Error("gen-hero-showcase: no network at build time")); },
    Image: class {},
    console,
    CustomEvent: class { constructor(t, o) { this.type = t; Object.assign(this, o || {}); } },
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
  };
  win.window = win;
  win.self = win;
  return win;
}

// `extra` is loaded AFTER the engine and after its own health check, so a file
// added for the hrefs' sake cannot quietly change who is eligible or how they
// rank — the seed is already decided by the time it runs.
export function loadEngine(root, extra) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  for (const f of ENGINE_FILES) {
    vm.runInContext(readFileSync(join(root, f), "utf8"), ctx, { filename: f });
  }
  if (!win.PDXWordAction || typeof win.PDXWordAction.read !== "function") {
    throw new Error("PDXWordAction.read() unavailable after loading the engine files");
  }
  if (!win.CMP_DATA || !Object.keys(win.CMP_DATA).length) {
    throw new Error("CMP_DATA is empty after loading the engine files");
  }
  for (const f of (extra || [])) {
    vm.runInContext(readFileSync(join(root, f), "utf8"), ctx, { filename: f });
  }
  return win;
}

// ── The one address per person, resolved the app's way ───────────────────────
// PDXProfilePid is the same function person-file.js, the /p/ arrival path and
// person-link.js all ask, so the address printed in the markup is the address the
// app serves. FAIL LOUD here, unlike in the browser: at build time an unavailable
// alias table means the strip would silently advertise raw ids, and a retired one
// among them would publish a second URL for a record that already has one.
export function canonicaliser(win) {
  const f = win && win.PDXProfilePid;
  if (typeof f !== "function") {
    throw new Error(`PDXProfilePid unavailable after loading ${ALIAS_FILE}`);
  }
  return (pid) => {
    const raw = String(pid || "");
    let out = raw;
    const hop = f(raw);
    if (hop) {
      const h = String(hop);
      if (h) out = h;
    }
    if (!/^[A-Za-z0-9_]+$/.test(out)) {
      throw new Error(`not a pid-shaped address: ${JSON.stringify(out)} (from ${JSON.stringify(raw)})`);
    }
    return out;
  };
}

// The curated ACTION side, counted the way consistency.js counts it — voting
// category only, sourced only, directional only, and only on an issue key the
// live ISSUE_MAP still recognises. Reimplementing the filter is unavoidable here
// (consistency.js keeps its index private), so it is kept to a literal transcript
// of buildOfficialActions()' four guards and nothing more. It counts; it never
// concludes.
export function actionIssueCount(win, pid) {
  const acct = (win.ACCT_SPOTLIGHT || {})[pid];
  if (!Array.isArray(acct)) return 0;
  const map = win.ISSUE_MAP || {};
  const keys = new Set();
  for (const it of acct) {
    if (!it || String(it.category || "").toLowerCase() !== "voting") continue;
    if (!it.source || !it.source.url) continue;
    if (it.impact !== "positive" && it.impact !== "negative") continue;
    if (!it.issueKey || !map[it.issueKey]) continue;
    keys.add(it.issueKey);
  }
  return keys.size;
}

// The office line, formatted the way _pdxOfficeLine would if compare-hub.js were
// loaded. The seed carries it so the card's second line is present in the very
// first frame, before any module that could compute it has run.
export function officeLine(p) {
  return [p.office, p.district, p.state].filter(Boolean).join(" · ");
}

export function partyOf(raw) {
  const c = String(raw || "").trim().charAt(0).toUpperCase();
  if (c === "R") return { label: "R", color: "#f87171" };
  if (c === "D") return { label: "D", color: "#60a5fa" };
  if (c === "I") return { label: "I", color: "#a78bfa" };
  return null;
}

// A candidate is eligible only if a reader could tell who they are looking at and
// there is documented word to build a card from. Identity matters as much as
// coverage: a card is a report card ON someone, and a nameless or placeless one is
// not checkable.
export function eligible(p, r) {
  if (!p || !p.name || !officeLine(p)) return false;
  if (!r || !r.coverage || !r.coverage.word) return false;
  return (r.coverage.scorable || 0) >= MIN_SCORABLE;
}

export function rank(win) {
  const rows = [];
  for (const pid of Object.keys(win.CMP_DATA)) {
    const p = win.CMP_DATA[pid];
    let r = null;
    try { r = win.PDXWordAction.read(pid, p); } catch (e) { continue; }
    if (!eligible(p, r)) continue;
    const actionIssues = actionIssueCount(win, pid);
    rows.push({
      pid,
      name: String(p.name),
      office: officeLine(p),
      party: partyOf(p.party),
      scorable: r.coverage.scorable || 0,
      word: r.coverage.word || 0,
      actionIssues,
      _score: (r.coverage.scorable || 0) * 2 + actionIssues * 3,
    });
  }
  // pid is the tiebreak so the ordering is total and the file is reproducible.
  rows.sort((a, b) => b._score - a._score || b.scorable - a.scorable || (a.pid < b.pid ? -1 : 1));
  return rows;
}

// Alternate parties down the list so the rotation cannot open with a run of one
// party. Order within a party is preserved, so this balances without ever
// promoting a weaker candidate over a stronger one from the same party. Lifted
// wholesale from gen-hero-receipt.mjs, whose hero has the same problem.
export function interleaveByParty(list) {
  const buckets = new Map();
  for (const r of list) {
    const k = (r.party && r.party.label) || "?";
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(r);
  }
  const queues = [...buckets.entries()]
    .sort((a, b) => (b[1].length - a[1].length) || (a[0] < b[0] ? -1 : 1))
    .map(([, v]) => v);
  const out = [];
  let last = null;
  while (queues.some((q) => q.length)) {
    const pick =
      queues.filter((q) => q.length && ((q[0].party && q[0].party.label) || "?") !== last)
            .sort((a, b) => b.length - a.length)[0] ||
      queues.filter((q) => q.length).sort((a, b) => b.length - a.length)[0];
    const r = pick.shift();
    last = (r.party && r.party.label) || "?";
    out.push(r);
  }
  return out;
}

function slim(r) {
  return {
    pid: r.pid,
    name: r.name,
    office: r.office,
    party: r.party,
    // Carried for the test's benefit and for anyone reading the file wondering
    // why this order. Not rendered: the card prints the LIVE coverage, and a
    // build-time figure on screen beside a runtime one is how two numbers that
    // disagree end up on the same card.
    _coverage: { scorable: r.scorable, word: r.word, actionIssues: r.actionIssues },
  };
}

export function buildFeatured(win) {
  // Interleave the FULL eligible pool before truncating. Slicing first would
  // balance only whatever the top-N happened to be.
  return interleaveByParty(rank(win)).slice(0, MAX_CANDIDATES).map(slim);
}

// ── The static strip ─────────────────────────────────────────────────────────
// A paragraph, not a <nav> and not a list of cards: it names the people whose
// records the rotation invites and links each name to that record's address. It
// is left VISIBLE — small and muted, under the slot — because a hidden block of
// links is a different thing with a bad name, and because with JavaScript off
// this strip is the only way into a record from the homepage. It does not double
// the cards: the cards are portraits with a live read, this is one line of text.
export function crawlLinks(featured, canon) {
  return featured.map((r) => {
    const pid = canon(r.pid);
    return { pid, name: String(r.name) };
  });
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildCrawlHtml(featured, canon) {
  const links = crawlLinks(featured, canon);
  if (!links.length) {
    // Fail closed, like every other gate in this file: no seed, no strip. An
    // empty paragraph with a label and nothing after it would be worse markup
    // than none.
    return "";
  }
  const anchors = links.map((l) =>
    `      <a class="pdx-hs-crawl-a" href="/p/${l.pid}" data-pdx-person-link="${esc(l.pid)}">${esc(l.name)}</a>`
  ).join("\n");
  return [
    "    <p class=\"pdx-hs-crawl\">",
    // "Read a record", not "Records on file": being in the seed means there is
    // documented word worth inviting, not that the file is complete or that it
    // clears the publication floor. The floor is asked at the door
    // (person-file.js's kicker), never here. A link is navigation, not a claim.
    "      <span class=\"pdx-hs-crawl-l\">Read a record:</span>",
    anchors,
    "    </p>",
  ].join("\n");
}

// Rewrites only what is between the sentinels, and refuses anything else. The
// returned string is the whole file, so the caller decides whether to write it —
// which is what lets the gate test compare without touching the working tree.
export function patchIndex(html, block) {
  const b = html.indexOf(CRAWL_BEGIN);
  const e = html.indexOf(CRAWL_END);
  if (b < 0 || e < 0) throw new Error("index.html: hero crawl sentinels not found");
  if (html.indexOf(CRAWL_BEGIN, b + 1) >= 0 || html.indexOf(CRAWL_END, e + 1) >= 0) {
    throw new Error("index.html: hero crawl sentinels appear more than once");
  }
  if (e < b) throw new Error("index.html: hero crawl sentinels are out of order");
  const head = html.slice(0, b + CRAWL_BEGIN.length);
  const tail = html.slice(e);
  return head + "\n" + (block ? block + "\n" : "") + "    " + tail;
}

// The inverse, for the gate test: what is in the file right now.
export function readCrawlBlock(html) {
  const b = html.indexOf(CRAWL_BEGIN);
  const e = html.indexOf(CRAWL_END);
  if (b < 0 || e < 0) throw new Error("index.html: hero crawl sentinels not found");
  return html.slice(b + CRAWL_BEGIN.length, e).replace(/^\n/, "").replace(/\n?[ \t]*$/, "");
}

export function buildData(featured) {
  const body = JSON.stringify(featured, null, 2).replace(/\n/g, "\n  ");
  return `// ─────────────────────────────────────────────────────────────────────────────
// GENERATED FILE — do not edit by hand.
//   source:    cmp-data.js + the stance bundles + acct-spotlight-data.js,
//              measured through the real PDXWordAction.read()
//   generator: scripts/gen-hero-showcase.mjs
//   gate:      scripts/test-hero-showcase.mjs (fails if this file drifts)
//
// The homepage showcase's INVITATION LIST: who is eligible to appear in the
// rotating summary cards, ranked by the coverage that can be measured without a
// network, and party-interleaved so the rotation cannot open with a run of one
// party.
//
// THERE ARE NO VERDICTS IN THIS FILE, AND THERE CANNOT BE. A summary card's
// ⚖️ Word vs Action read is pooled across every documented position, and the
// action half of most of those comparisons is the roll-call record — which is
// only warm in a live browser. hero-showcase.js asks PDXProfileCard for the live
// read and drops anyone whose read is not publishable. Being in this list is
// permission to be considered, never permission to be graded.
//
// If this list is empty, missing or malformed, the showcase renders nothing.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';
  // Idempotent, and never clobbers a payload another surface already installed.
  if (window.PDX_HERO_SHOWCASE) return;
  window.PDX_HERO_SHOWCASE = ${body};
})();
`;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

// Run directly → write the file. Imported by the test → just the pure builders.
if (process.argv[1] && process.argv[1].endsWith("gen-hero-showcase.mjs")) {
  const win = loadEngine(ROOT, [ALIAS_FILE]);
  const featured = buildFeatured(win);
  const text = buildData(featured);
  writeFileSync(join(ROOT, OUT_PATH), text);

  // Second output: the same people, as real links, inside index.html.
  const canon = canonicaliser(win);
  const block = buildCrawlHtml(featured, canon);
  const idxPath = join(ROOT, INDEX_PATH);
  const before = readFileSync(idxPath, "utf8");
  const after = patchIndex(before, block);
  if (after !== before) writeFileSync(idxPath, after);
  const hopped = featured.filter((r) => canon(r.pid) !== r.pid);
  const parties = featured.reduce((a, r) => {
    const k = (r.party && r.party.label) || "?";
    a[k] = (a[k] || 0) + 1;
    return a;
  }, {});
  console.log(
    `✓ wrote ${OUT_PATH} — ${featured.length} candidate(s) from ${Object.keys(win.CMP_DATA).length} in the roster, ` +
    `${text.length} bytes\n  parties: ${JSON.stringify(parties)}` +
    `\n  scorable range: ${Math.min(...featured.map((r) => r._coverage.scorable))}–${Math.max(...featured.map((r) => r._coverage.scorable))}`
  );
  console.log(
    `  ${INDEX_PATH}: ${crawlLinks(featured, canon).length} static record link(s)` +
    `${after === before ? " (unchanged)" : " (rewritten)"}` +
    `${hopped.length ? `\n  ⚠ ${hopped.length} seed pid(s) are retired aliases; the strip advertises the canonical address, ` +
      `but the painted card links the raw id until profile-evidence.js loads: ` +
      hopped.map((r) => `${r.pid}→${canon(r.pid)}`).join(", ") : ""}`
  );
  if (!featured.length) console.log("  ⚠ empty list — the showcase will render nothing (fail-closed)");
}
