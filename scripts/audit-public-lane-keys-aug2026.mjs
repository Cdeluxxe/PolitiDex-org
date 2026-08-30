#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// audit-public-lane-keys-aug2026.mjs — what the public lane can actually reach
// ─────────────────────────────────────────────────────────────────────────────
// The public lane is the half of a profile that is sourced but not binding:
// statements, reported controversies, awards, legal matters. It is a separate
// test of a stated position and it is never inside Direction Match. Architecturally
// it is finished — PDXConsistency.publicTally() prints it on issue rows and in the
// dossier, and laneDisagreement() explains the moment the two records split.
//
// But a receipt only reaches any of that through ONE join: its issueKey. Without a
// key it is collected, it is searchable, it appears in the flashpoints feed — and
// it can never land on an issue row, never enter a tally, and never be one half of
// a formal/public disagreement. It is finished inventory sitting outside the
// surface built to display it, and nothing on the site says so.
//
// This audit measures that gap with the shipped modules rather than by reading
// them. It runs the real PDXReceipts.collect() and the real PDXConsistency row
// model in a node:vm sandbox, so what it counts is what a reader would see.
//
//   node scripts/audit-public-lane-keys-aug2026.mjs            # the reach report
//   node scripts/audit-public-lane-keys-aug2026.mjs --unkeyed  # the unkeyed inventory
//   node scripts/audit-public-lane-keys-aug2026.mjs --json     # machine-readable
//
// FOUR NUMBERS, AND WHY THESE FOUR.
//   · receipts with keys — the join itself, before any surface is involved.
//   · items landing on issue rows — a key is necessary but not sufficient: the
//     row model only counts a receipt on a row that EXISTS, which needs the member
//     to be in the roster and the key to be live in ISSUE_MAP.
//   · rows and profiles carrying a public tally — the reader-facing unit. One
//     profile gaining six keyed receipts on one issue moves one row, not six.
//   · disagreement explainer fires, by shape — the teaching surface. This is the
//     number that says whether new keys produced anything to learn from, and it
//     is broken out by shape because the shapes are not interchangeable:
//     public_only means the formal lane never reached the question, while
//     formal_against_public_backs is a genuine split between two records.
//
// No network, no database, no writes. Read-only over bundled data.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");
const ARGS = process.argv.slice(2);
const want = (f) => ARGS.includes(f);

// ── Fake DOM ────────────────────────────────────────────────────────────────
// Only as much as module top-level needs to evaluate. Nothing here renders; the
// audit reads models, not markup.
const mkEl = () => {
  const cls = new Set();
  const el = {
    style: {}, textContent: "", innerHTML: "", hidden: false, className: "", id: "",
    parentNode: null, scrollTop: 0, offsetTop: 0, offsetParent: null,
    classList: {
      add: (c) => cls.add(c), remove: (c) => cls.delete(c),
      toggle: (c, on) => { if (on) cls.add(c); else cls.delete(c); },
      contains: (c) => cls.has(c),
    },
    _attrs: {},
    setAttribute(k, v) { el._attrs[k] = v; },
    getAttribute: (k) => (k in el._attrs ? el._attrs[k] : null),
    focus() {}, scrollIntoView() {}, addEventListener() {}, removeEventListener() {},
    remove() {}, appendChild: (c) => c, removeChild: (c) => c,
    querySelector: () => null, querySelectorAll: () => [],
  };
  return el;
};
const ctx = {
  console, JSON, Math, Date, setTimeout, clearTimeout,
  setInterval: () => 0, clearInterval() {},
  Promise, String, Array, Object, RegExp, parseInt, parseFloat, isNaN, isFinite,
  encodeURIComponent, decodeURIComponent, Set, Map, Intl, Number, Boolean, Error,
  requestAnimationFrame: (f) => setTimeout(f, 0), cancelAnimationFrame() {},
  requestIdleCallback: (f) => setTimeout(f, 0),
  fetch: () => new Promise(() => {}),
  location: { href: "/", pathname: "/", search: "", hash: "", origin: "https://www.politidex.fyi" },
  history: { replaceState() {} },
  navigator: { userAgent: "node" },
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  getComputedStyle: () => ({ getPropertyValue: () => "" }),
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
  CustomEvent: class { constructor(t, o) { this.type = t; Object.assign(this, o || {}); } },
  Image: class {},
  document: {
    readyState: "complete", head: mkEl(), body: mkEl(), documentElement: mkEl(),
    createElement: mkEl, createTextNode: mkEl,
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
  },
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
ctx.addEventListener = () => {}; ctx.removeEventListener = () => {};
ctx.dispatchEvent = () => true;
ctx._pdxNavJump = () => {};
ctx._pdxRevealTarget = () => {};
ctx._getPhotoUrl = () => "";

const sandbox = vm.createContext(ctx);
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
  "gaps.js",
  "consistency.js",
  "voting-record.js",
];
// say-vs-do.js reads window.PROFILES, which the live app fills from Firestore.
// The bundled roster is the same shape; without it the receipt layer resolves no
// names and collect() would be measuring a different thing than the app shows.
ctx.PROFILES = ctx.CMP_DATA;
for (const f of FILES) vm.runInContext(read(f), sandbox, { filename: f });
ctx.PROFILES = ctx.CMP_DATA;

const R = ctx.window.PDXReceipts;
const CS = ctx.window.PDXConsistency;
const ISSUE_MAP = ctx.window.ISSUE_MAP || {};
if (!R || typeof R.collect !== "function") { console.error("PDXReceipts.collect() unavailable"); process.exit(1); }
if (!CS || typeof CS.issueRows !== "function") { console.error("PDXConsistency.issueRows() unavailable"); process.exit(1); }

// ── 1 · the join ────────────────────────────────────────────────────────────
const receipts = R.collect() || [];
const keyed = receipts.filter((r) => r.issueKey);
const unkeyed = receipts.filter((r) => !r.issueKey);

// A key that is not in the live ISSUE_MAP reaches no row either — worth separating
// from "has a key" so the headline number cannot flatter itself.
const keyedLive = keyed.filter((r) => ISSUE_MAP[r.issueKey]);
const keyedDead = keyed.filter((r) => !ISSUE_MAP[r.issueKey]);

// ── 2 · what lands on rows ──────────────────────────────────────────────────
// Walk every profile that owns at least one receipt. issueRows() is the same model
// the profile page and the issue index read, so a receipt counted here is a receipt
// a reader can see.
// The denominator is every profile in the roster, not only the ones that already
// own a receipt. Restricting it to receipt-holders would quietly measure coverage
// against the population that already has coverage — the rows a reader opens and
// finds empty are exactly the ones this pass is about.
const rosterPids = Object.keys(ctx.CMP_DATA || {});
const receiptPids = new Set(receipts.map((r) => r.pid));
const pids = Array.from(new Set(rosterPids.concat(Array.from(receiptPids))));
let rowItems = 0, rowsWithPublic = 0, rowsTotal = 0, profilesWithPublic = 0;
const shapes = Object.create(null);
const perProfileRows = new Map();
for (const pid of pids) {
  let rows = [];
  try { rows = CS.issueRows(pid) || []; } catch (e) { rows = []; }
  perProfileRows.set(pid, rows.length);
  rowsTotal += rows.length;
  let any = false;
  for (const row of rows) {
    const p = row && row.public;
    if (p && p.count > 0) { rowItems += p.count; rowsWithPublic++; any = true; }
    let g = null;
    try { g = CS.laneDisagreement ? CS.laneDisagreement(row) : null; } catch (e) { g = null; }
    if (g && g.shape) shapes[g.shape] = (shapes[g.shape] || 0) + 1;
  }
  if (any) profilesWithPublic++;
}

// ── report ──────────────────────────────────────────────────────────────────
const byIssue = (list) => {
  const m = Object.create(null);
  for (const r of list) m[r.issueKey] = (m[r.issueKey] || 0) + 1;
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
};

const summary = {
  receiptsTotal: receipts.length,
  receiptsKeyed: keyed.length,
  receiptsKeyedLiveIssue: keyedLive.length,
  receiptsKeyedDeadIssue: keyedDead.length,
  receiptsUnkeyed: unkeyed.length,
  profilesWithAnyReceipt: receiptPids.size,
  profilesWalked: pids.length,
  itemsOnIssueRows: rowItems,
  rowsWithPublicTally: rowsWithPublic,
  rowsTotal: rowsTotal,
  rowsWithPublicPct: rowsTotal ? +(rowsWithPublic * 100 / rowsTotal).toFixed(2) : 0,
  profilesWithPublicTally: profilesWithPublic,
  disagreementShapes: shapes,
  disagreementTotal: Object.values(shapes).reduce((a, b) => a + b, 0),
};

if (want("--json")) {
  console.log(JSON.stringify({
    summary,
    keyedByIssue: byIssue(keyedLive),
    unkeyed: unkeyed.map((r) => ({
      pid: r.pid, name: r.name, sub: r.sub, category: r.category, impact: r.impact,
      date: r.date, headline: r.headline, facts: r.facts, why: r.why,
      source: r.source && r.source.label, url: r.source && r.source.url,
      verdict: r.verdict && r.verdict.key,
    })),
  }, null, 2));
  process.exit(0);
}

if (want("--unkeyed")) {
  for (const r of unkeyed) {
    console.log(`\n── ${r.pid} · ${r.name}${r.sub ? " · " + r.sub : ""}`);
    console.log(`   [${r.category || "—"}/${r.impact}] ${r.date || "—"}  ${r.headline}`);
    console.log(`   facts: ${String(r.facts || "").slice(0, 400)}`);
    if (r.why) console.log(`   why:   ${String(r.why).slice(0, 260)}`);
    console.log(`   src:   ${r.source && r.source.label}`);
  }
  console.log(`\n${unkeyed.length} unkeyed receipts`);
  process.exit(0);
}

console.log("── public-lane reach ──────────────────────────────────────────");
for (const [k, v] of Object.entries(summary)) {
  if (k === "disagreementShapes") continue;
  console.log(`  ${k.padEnd(26)} ${v}`);
}
console.log("  disagreement shapes:");
for (const [s, n] of Object.entries(shapes).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${s.padEnd(30)} ${n}`);
}
if (!Object.keys(shapes).length) console.log("    (none)");
console.log("\n── keyed receipts by issue (top 30) ───────────────────────────");
for (const [k, n] of byIssue(keyedLive).slice(0, 30)) console.log(`  ${k.padEnd(26)} ${n}`);
console.log(`\n  ${byIssue(keyedLive).length} distinct issue keys carry a receipt`);
if (keyedDead.length) {
  console.log("\n── keyed to an issue NOT in the live ISSUE_MAP ────────────────");
  for (const [k, n] of byIssue(keyedDead)) console.log(`  ${k.padEnd(26)} ${n}`);
}
