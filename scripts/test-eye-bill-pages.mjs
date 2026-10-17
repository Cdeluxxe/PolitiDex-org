#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-eye-bill-pages.mjs — every bill page in the archive is findable in the eye
// ─────────────────────────────────────────────────────────────────────────────
// The eye's bill lane read two pools: the hand-curated marquee list
// (bills-index.js, ~30 bills) and the live /measures walk. A bill the walk had
// not reached was unfindable, and every Utah bill shared one key ("|H.B. 208"),
// so the second session's H.B. 208 was folded into the first and never shown.
//
// What must stay true:
//
//   1. THE INDEX IS THE BILL PAGES. bill-search-index.js holds exactly one row
//      per db/bill-docs.json document (same sitting, number, title, status), and
//      gen-bill-docs.mjs --check holds it current — the bill pages and the eye's
//      index are written in one run.
//   2. EVERY NUMBER FINDS ITS PAGE. Booted with that index and NO live list, the
//      eye answers each of the 540 bill numbers with a row whose href is that
//      bill's page, /b/<sitting>/<number> — including H.B. 585, S.B. 282 and
//      S.B. 318 of 2026GS. A bare "585" and "282" find their bill too, and a
//      Utah number shared across sessions returns every session's page.
//   3. A ROW OPENS THE RIGHT BILL. Tapping a row hands PDXBills.open the number
//      AND its sitting; the five corrected Utah bills read Enacted.
//   4. MUTATIONS ARE CAUGHT: a bill dropped from the index, the sitting dropped
//      from the key, a row's href pointing at another session.
//
//   node scripts/test-eye-bill-pages.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ eye bill pages: STALE HARNESS — ${m}`); process.exit(2); };

const DOCS = JSON.parse(R("db/bill-docs.json")).docs;
const pagePath = (s, n) => `/b/${encodeURIComponent(s)}/${encodeURIComponent(n)}`;
const SEARCH_SRC = R("bill-search-index.js");
const loadRows = (src) => { const w = {}; vm.runInNewContext(src, { window: w }); return w.PDX_BILL_SEARCH; };
const ROWS = loadRows(SEARCH_SRC);
must(Array.isArray(ROWS), "bill-search-index.js defines window.PDX_BILL_SEARCH");

// ── the mini-DOM (the shape test-eye-find-the-record.mjs boots the eye in) ───
function stubNode() {
  const set = new Set();
  const n = {
    id: "", className: "", innerHTML: "", textContent: "", value: "", tagName: "DIV",
    style: { setProperty() {}, removeProperty() {} }, dataset: {}, hidden: false, _attrs: {}, _li: {},
    classList: {
      add: (c) => set.add(c), remove: (c) => set.delete(c), contains: (c) => set.has(c),
      toggle: (c, on) => (on === undefined ? (set.has(c) ? set.delete(c) : set.add(c)) : (on ? set.add(c) : set.delete(c))),
    },
    setAttribute(k, v) { n._attrs[k] = String(v); }, getAttribute(k) { return k in n._attrs ? n._attrs[k] : null; },
    removeAttribute(k) { delete n._attrs[k]; },
    focus() {}, blur() {}, scrollIntoView() {}, click() {},
    addEventListener(t, f) { (n._li[t] = n._li[t] || []).push(f); }, removeEventListener() {}, remove() {},
    appendChild: (c) => c, insertBefore: (c) => c, insertAdjacentHTML() {},
    querySelector: () => null, querySelectorAll: () => [], closest: () => null, contains: () => true, matches: () => false,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 360, height: 400, bottom: 400, right: 360 }),
  };
  return n;
}

function boot(eyeSrc, rows) {
  const win = makeSandbox();
  const panel = stubNode(), input = stubNode(), eye = stubNode(), clear = stubNode();
  input.tagName = "TEXTAREA";
  const ids = { "pdx-eye-panel": panel, "pdx-eye-input": input, "pdx-eye": eye, "pdx-eye-clear": clear };
  win.document.getElementById = (id) => ids[id] || null;
  const injected = [];
  const realCreate = win.document.createElement;
  win.document.createElement = (t) => { const n = realCreate ? realCreate.call(win.document, t) : stubNode(); if (String(t).toLowerCase() === "script") injected.push(n); return n; };
  win.history = { replaceState() {}, pushState() {} };
  const store = {};
  win.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  win.addEventListener = () => {};
  const ctx = vm.createContext(win);
  for (const f of [...ENGINE_FILES, "pdx-issue-family.js", "issue-colors.js"]) vm.runInContext(R(f), ctx, { filename: f });
  win.PROFILES = win.CMP_DATA;
  win.PDXLazyData = { ensure: () => Promise.resolve(true), loaded: () => true, whenReady: (k, cb) => cb() };
  win.PDX_BILLS_INDEX = [];
  win._issueLabel = (k) => (win.ISSUE_MAP && win.ISSUE_MAP[k] && win.ISSUE_MAP[k].label) || "";
  win.PDXSaved = { list: () => [], has: () => false };
  const opened = [];
  win.PDXBills = { open: (n, s) => { opened.push([n, s]); return true; } };
  vm.runInContext(eyeSrc, ctx, { filename: "all-seeing-eye.js" });
  must(win.PDXEye && typeof win.PDXEye.render === "function", "PDXEye.render is unavailable");
  // The bill-page index arrives the way the eye asks for it: after boot.
  if (rows) { win.PDX_BILL_SEARCH = rows; win.PDXEye.rebuild(); }
  eye.classList.add("is-open");
  return {
    win, opened, injected,
    search(q) { input.value = q; win.PDXEye.render(q); return panel.innerHTML || ""; },
  };
}

const rowHrefs = (html) => [...String(html).matchAll(/<a role="option" class="pdx-eye-item pdx-eye-item--bill"[^>]*href="([^"]+)"/g)]
  .map((m) => m[1].replace(/&amp;/g, "&"));

// Search every page's number; return the keys whose page did not come back.
function missesFor(E, docs) {
  const miss = [];
  for (const d of Object.values(docs)) {
    const want = pagePath(d.s, d.n);
    if (!rowHrefs(E.search(d.n)).includes(want)) miss.push(`${d.s}|${d.n}`);
  }
  return miss;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the index is the bill pages");
// ═════════════════════════════════════════════════════════════════════════════
eq(ROWS.length, Object.keys(DOCS).length, "one index row per bill page");
const rowKeys = new Set(ROWS.map((r) => `${r[0]}|${r[1]}`));
ok(Object.keys(DOCS).every((k) => rowKeys.has(k)), "every bill page has an index row");
ok(ROWS.every((r) => DOCS[`${r[0]}|${r[1]}`] && DOCS[`${r[0]}|${r[1]}`].t === r[2] && DOCS[`${r[0]}|${r[1]}`].st === r[3]),
  "every row carries its page's title and status");
for (const k of ["2026GS|H.B. 585", "2026GS|S.B. 282", "2026GS|S.B. 318"]) ok(rowKeys.has(k), `${k} is in the index`);
let fresh = true;
try { execFileSync(process.execPath, [join(ROOT, "scripts/gen-bill-docs.mjs"), "--check"], { stdio: "ignore" }); } catch (e) { fresh = false; }
ok(fresh, "gen-bill-docs.mjs --check: the bill pages and the eye's index are current together");
ok(/OUT_SEARCH/.test(R("scripts/gen-bill-docs.mjs")) && /curSearch !== outSearch/.test(R("scripts/gen-bill-docs.mjs")),
  "the bill-page generator writes and checks the eye's index in the same run");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · every number finds its page");
// ═════════════════════════════════════════════════════════════════════════════
const EYE = R("all-seeing-eye.js");
const E = boot(EYE, ROWS);
{
  // Booted before the index has landed, the eye's first search asks for it.
  const cold = boot(EYE, undefined);
  cold.search("585");
  ok(cold.injected.some((n) => /\/bill-search-index\.js$/.test(String(n.src || ""))), "the eye asks for /bill-search-index.js when it does not hold it");
}
const miss = missesFor(E, DOCS);
eq(miss.length, 0, `every bill number returns its page${miss.length ? ": " + miss.slice(0, 8).join(", ") : ""}`);
console.log(`      ${Object.keys(DOCS).length} numbers searched, ${Object.keys(DOCS).length - miss.length} found their page`);
for (const [q, want] of [
  ["585", "2026GS|H.B. 585"], ["282", "2026GS|S.B. 282"], ["H.B. 585", "2026GS|H.B. 585"], ["hb 585", "2026GS|H.B. 585"],
  ["S.B. 318", "2026GS|S.B. 318"], ["S.B. 16", "2023GS|S.B. 16"], ["Data Center Amendments", "2026GS|H.B. 585"],
]) {
  const [s, n] = want.split("|");
  ok(rowHrefs(E.search(q)).includes(pagePath(s, n)), `"${q}" returns ${want}`);
}
// A Utah number shared across sessions returns each session's page.
const shared = Object.values(DOCS).filter((d) => /GS$/.test(d.s)).reduce((m, d) => ((m[d.n] = (m[d.n] || []).concat(d)), m), {});
const multi = Object.entries(shared).filter(([, l]) => l.length > 1);
must(multi.length > 0, "the archive holds a Utah number filed in more than one session");
let multiOk = 0;
for (const [n, list] of multi) {
  const hrefs = rowHrefs(E.search(n));
  if (list.every((d) => hrefs.includes(pagePath(d.s, d.n)))) multiOk++;
  else failures.push(`"${n}" does not return every session's page (${list.map((d) => d.s).join(", ")})`);
}
eq(multiOk, multi.length, `every shared Utah number returns all its sessions (${multi.length} numbers)`);

// ═════════════════════════════════════════════════════════════════════════════
section("3 · a row opens the right bill");
// ═════════════════════════════════════════════════════════════════════════════
{
  const html = E.search("H.B. 585");
  ok(/data-kind="bill" data-number="H\.B\. 585" data-sitting="2026GS"/.test(html), "the row carries its sitting");
  ok(EYE.includes("navigate('bill', { number: e.number, id: e.id, sitting: e.sitting || '' })") &&
    EYE.includes("window.PDXBills.open(data.number || data.id, data.sitting || '')") &&
    EYE.includes("window.PDXBills.open(e.number || e.id, e.sitting || '')"),
    "a tap hands PDXBills.open the number and its sitting");
  for (const n of ["S.B. 16", "S.B. 288"]) ok(/Enacted/.test((E.search(n).match(new RegExp(`data-number="${n.replace(/\./g, "\\.")}" data-sitting="2023GS"[\\s\\S]*?<\\/a>`)) || [""])[0]), `2023GS ${n} reads Enacted in the eye`);
  for (const n of ["H.B. 153", "H.B. 182", "H.B. 529"]) ok(/Enacted/.test((E.search(n).match(new RegExp(`data-number="${n.replace(/\./g, "\\.")}" data-sitting="2024GS"[\\s\\S]*?<\\/a>`)) || [""])[0]), `2024GS ${n} reads Enacted in the eye`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · mutations are caught");
// ═════════════════════════════════════════════════════════════════════════════
const caught = (name, bad) => { ok(bad, `mutation not caught: ${name}`); console.log(`      mutation: ${name} → ${bad ? "caught" : "MISSED"}`); };
{
  const rows = ROWS.filter((r) => !(r[0] === "2026GS" && r[1] === "H.B. 585"));
  caught("H.B. 585 dropped from the index", missesFor(boot(EYE, rows), { k: DOCS["2026GS|H.B. 585"] }).length > 0);
}
{
  const src = EYE.replace("var natKey = sitting + '|' + b.number;", "var natKey = String(b.congress || '') + '|' + b.number;");
  must(src !== EYE, "the natural key is where this mutation looks for it");
  const docs = Object.fromEntries(multi.flatMap(([, l]) => l).map((d) => [`${d.s}|${d.n}`, d]));
  caught("the sitting dropped from the bill key", missesFor(boot(src, ROWS), docs).length > 0);
}
{
  const src = EYE.replace("billPageHref(e.sitting, e.number)", "billPageHref('2025GS', e.number)");
  must(src !== EYE, "the row href is where this mutation looks for it");
  caught("a row's href pointed at another session", missesFor(boot(src, ROWS), { a: DOCS["2023GS|S.B. 16"] }).length > 0);
}
caught("a known bill number with no result", missesFor(E, { x: { s: "2026GS", n: "H.B. 99999" } }).length > 0);

if (failures.length) {
  console.error(`\n✗ eye bill pages: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures.slice(0, 30)) console.error(`  · ${f}`);
  process.exit(1);
}
console.log(`\n✓ eye bill pages: every bill page in the archive is findable in the eye by its number — ${passed} assertions passed`);
