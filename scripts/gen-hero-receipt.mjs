#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// 🧾 Hero receipt — generate the above-the-fold receipt seed
// ─────────────────────────────────────────────────────────────────────────────
// GOAL: a real, sourced, verdict-stamped receipt visible on a phone with zero
// scroll — without pulling the 154 KB-gzipped accountability dataset into the
// critical path.
//
// The full Say-vs-Do engine reads window.ACCT_SPOTLIGHT (acct-spotlight-data.js,
// ~154 KB gz), which pdx-lazy-data.js deliberately defers until a section nears
// the viewport, first interaction, or an idle callback. That deferral is correct
// and stays. But it means nothing rendered from PDXReceipts can be on screen at
// first paint, which is exactly what the hero now needs.
//
// So this generator precomputes a HANDFUL of receipts into a ~4 KB seed the hero
// can render immediately. The seed is a strict subset of what the live engine
// produces — never a second source of truth.
//
// WHY IT RUNS THE REAL ENGINE
// The selection and verdict rules (what counts as a contradiction, when a stamp
// may say "Says One Thing · Does Another" rather than "Red Flag On Record") live
// in say-vs-do.js and must not be reimplemented here — a second copy of those
// rules would drift, and drift in this direction means publishing a verdict the
// engine would not stand behind. Instead this loads the actual browser files
// into a Node VM with a stub DOM and calls window.PDXReceipts.collect(). The
// stamp on the hero card is therefore, byte for byte, the stamp the engine
// assigns. scripts/test-hero-receipt.mjs re-runs this in memory and fails if the
// shipped file differs.
//
// FAIL CLOSED
// Every gate here can only ever REMOVE a receipt. A candidate is dropped unless
// it carries a name, a headline, a verdict and a resolvable source URL. If
// nothing survives, the seed is an empty array and hero-receipt.js renders
// nothing at all — the hero is exactly what it is today. There is no placeholder
// receipt, no "example" card, and no fallback copy that could read as proof.
//
//   node scripts/gen-hero-receipt.mjs        # writes hero-receipt-data.js
//
// Deterministic: no timestamps, no randomness, stable ordering derived from the
// engine's own score. Re-running it on unchanged inputs produces an identical file.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

export const OUT_PATH = "hero-receipt-data.js";

// The browser files the engine needs, in load order. alignment-tool.js is here
// only because it owns window.ISSUE_MAP (see its line ~302); cmp-data.js supplies
// CMP_DATA for names/office; the stance files supply ISSUE_STANCE_DATA, which is
// what lets a receipt carry an explicit SAID side.
export const ENGINE_FILES = [
  "alignment-tool.js",
  "cmp-data.js",
  "politician-stances-core.js",
  "politician-stances.js",
  "politician-stances-ext.js",
  "acct-spotlight-data.js",
  "say-vs-do.js",
];

// How many receipts the hero rotates through. Small on purpose: this is payload
// on the critical path, and the hero shows one at a time.
export const MAX_RECEIPTS = 6;
// At most this many "words match actions" receipts ride along, so the rail can
// never read as a purely negative wall. Mirrors the fairness rule mount() already
// applies to the full Say-vs-Do band in say-vs-do.js.
export const MAX_CONSISTENT = 2;
// Stated-position text is trimmed to keep the seed small; the full text is one
// tap away in the real receipt.
export const SAID_MAX = 180;
export const DID_MAX = 180;

// ── A DOM stub just real enough to load the engine ───────────────────────────
// say-vs-do.js guards every DOM touch (mount() returns early when #say-vs-do is
// absent, and boot() wraps its calls in try/catch), so a null-returning document
// is enough to reach window.PDXReceipts without rendering anything.
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
    readyState: "complete",
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
    // Timers are stubbed to no-ops: boot() starts a refresh poll we neither need
    // nor want holding the process open.
    setTimeout() { return 0; }, clearTimeout() {},
    setInterval() { return 0; }, clearInterval() {},
    requestAnimationFrame() { return 0; }, cancelAnimationFrame() {},
    matchMedia() { return { matches: false, addEventListener() {}, addListener() {} }; },
    location: { href: "https://politidex.fyi/", pathname: "/", search: "", hash: "", origin: "https://politidex.fyi" },
    navigator: { userAgent: "node" },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    console,
    CustomEvent: class { constructor(t, o) { this.type = t; Object.assign(this, o || {}); } },
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
  };
  win.window = win;
  win.self = win;
  return win;
}

// Load the engine and hand back its collect() output. Throws loudly rather than
// returning a half-built set — a silent partial load would quietly narrow the
// candidate pool and change which receipt leads the page.
export function collectFromEngine(root) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  for (const f of ENGINE_FILES) {
    vm.runInContext(readFileSync(join(root, f), "utf8"), ctx, { filename: f });
  }
  if (!win.PDXReceipts || typeof win.PDXReceipts.collect !== "function") {
    throw new Error("PDXReceipts.collect() unavailable after loading the engine files");
  }
  return win.PDXReceipts.collect();
}

// Trim to a word boundary; never cut mid-word, never leave dangling punctuation.
export function trim(text, max) {
  const s = String(text == null ? "" : text).replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:.—-]+$/, "") + "…";
}

// Keep only the fields the hero card renders. Everything else — facts, why,
// score, category, photo — stays out of the critical path.
function slim(r) {
  return {
    pid: r.pid,
    // Carried so a tap on the hero card can hand off to the real engine —
    // PDXReceipts.open(pid, issueKey) — once say-vs-do.js has loaded, instead of
    // re-implementing the receipt lightbox.
    issueKey: r.issueKey || "",
    name: r.name,
    sub: trim(r.sub, 60),
    party: r.party ? { label: r.party.label, color: r.party.color } : null,
    issue: r.issue ? { icon: r.issue.icon, label: r.issue.label } : null,
    said: r.said ? { text: trim(r.said.text, SAID_MAX), word: r.said.word } : null,
    did: trim(r.headline, DID_MAX),
    date: r.date || "",
    source: { label: r.source.label || "Source", url: r.source.url },
    verdict: { key: r.verdict.key, cls: r.verdict.cls, ico: r.verdict.ico, label: r.verdict.label },
  };
}

// A receipt is publishable on the hero only if a reader could check it, and
// could tell who they are looking at. This is the fail-closed gate: no name, no
// office line, no headline, no verdict or no http(s) source means the receipt
// never reaches the seed. The office line matters here in a way it does not
// further down the page — with no surrounding context, a bare name above a
// verdict stamp is an accusation the reader has no way to place.
export function publishable(r) {
  if (!r || !r.name || !r.sub || !r.headline || !r.verdict || !r.verdict.label) return false;
  const url = r.source && r.source.url;
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

// Alternate parties down the list so the hero rotation cannot open with a run of
// one party. Order within a party is preserved (the engine's own ranking), so
// this reorders for balance without ever promoting a weaker receipt over a
// stronger one within the same party.
export function interleaveByParty(list) {
  const buckets = new Map();
  for (const r of list) {
    const k = (r.party && r.party.label) || "?";
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(r);
  }
  // Largest bucket first so the biggest group is spread the widest.
  const queues = [...buckets.entries()].sort((a, b) => b[1].length - a[1].length).map(([, v]) => v);
  const out = [];
  let last = null;
  while (queues.some((q) => q.length)) {
    // Prefer the longest queue whose party differs from the one just emitted.
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

export function buildHeroReceipts(all) {
  // One receipt per politician, strongest first — the engine has already sorted
  // by score, so the first sighting of a pid is that person's strongest.
  const seen = new Set();
  const distinct = [];
  for (const r of all) {
    if (!publishable(r) || seen.has(r.pid)) continue;
    seen.add(r.pid);
    distinct.push(r);
  }

  // The hero leads with explicit say/do pairs: a stated position AND a documented
  // action. That pairing is the whole proposition, and it is the only kind of
  // receipt where the "Say vs. Do" framing is literally true. Contradictions
  // without a recorded stance are real findings but belong further down the page,
  // where they are not standing in for the concept.
  const contradictions = distinct.filter((r) => r.verdict.key === "contradicts" && r.said);
  const consistent = distinct.filter((r) => r.verdict.key === "consistent" && r.said);

  // Interleave the FULL pool before truncating. Slicing first would balance only
  // whatever the top-N happened to be, which is how you end up with a hero that
  // is four-fifths one party purely because that party's receipts scored highest.
  const leadCount = Math.max(0, MAX_RECEIPTS - Math.min(MAX_CONSISTENT, consistent.length));
  const lead = interleaveByParty(contradictions).slice(0, leadCount);
  const tail = interleaveByParty(consistent).slice(0, MAX_RECEIPTS - lead.length);

  return [...lead, ...tail].slice(0, MAX_RECEIPTS).map(slim);
}

export function buildHeroReceiptData(receipts) {
  const body = JSON.stringify(receipts, null, 2).replace(/\n/g, "\n  ");
  return `// ─────────────────────────────────────────────────────────────────────────────
// GENERATED FILE — do not edit by hand.
//   source:    the live Say-vs-Do engine (say-vs-do.js → PDXReceipts.collect())
//   generator: scripts/gen-hero-receipt.mjs
//   gate:      scripts/test-hero-receipt.mjs (fails if this file drifts)
//
// The few receipts the hero can render at first paint, so a first-time visitor
// sees one real, sourced, verdict-stamped receipt without scrolling — while the
// full accountability dataset (acct-spotlight-data.js, ~154 KB gz) stays lazily
// loaded exactly as before.
//
// Every entry here was produced by the real engine and carries a checkable
// source URL. This file is a CACHE of that engine's output, never a second
// source of truth: regenerate it, never hand-edit it. If it is empty, missing or
// malformed, hero-receipt.js renders nothing rather than inventing proof.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';
  // Idempotent, and never clobbers a payload another surface already installed.
  if (window.PDX_HERO_RECEIPT) return;
  window.PDX_HERO_RECEIPT = ${body};
})();
`;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

// Run directly → write the file. Imported by the test → just the pure builders.
if (process.argv[1] && process.argv[1].endsWith("gen-hero-receipt.mjs")) {
  const all = collectFromEngine(ROOT);
  const receipts = buildHeroReceipts(all);
  const text = buildHeroReceiptData(receipts);
  writeFileSync(join(ROOT, OUT_PATH), text);
  const parties = receipts.reduce((a, r) => {
    const k = (r.party && r.party.label) || "?";
    a[k] = (a[k] || 0) + 1;
    return a;
  }, {});
  const stamps = receipts.reduce((a, r) => {
    a[r.verdict.key] = (a[r.verdict.key] || 0) + 1;
    return a;
  }, {});
  console.log(
    `✓ wrote ${OUT_PATH} — ${receipts.length} receipt(s) from ${all.length} collected, ` +
    `${text.length} bytes\n  parties: ${JSON.stringify(parties)}  stamps: ${JSON.stringify(stamps)}`
  );
  if (!receipts.length) console.log("  ⚠ empty seed — the hero will render no receipt (fail-closed)");
}
