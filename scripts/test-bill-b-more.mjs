#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-bill-b-more.mjs — the longer topic text opens behind "More" on /b/ pages
// ─────────────────────────────────────────────────────────────────────────────
// The bill panel prints a topic's stored rationale only through
// window._pdxReaderRationale, receipt-cards.js's scrubber. bill.html — the
// document every /b/<sitting>/<number> address is served — did not load it, so
// on a bill page opened directly the "More" control never appeared. bill.html
// now loads reader-rationale.js, the scrubber's one block copied byte for byte
// by scripts/gen-reader-rationale.mjs.
//
// What must stay true, on H.R. 1 and H.R. 22 booted with bill.html's OWN scripts
// (no receipt-cards.js):
//
//   1. THE COPY IS THE ORIGINAL. reader-rationale.js is current with its
//      generator, its block is byte-identical to receipt-cards.js's, and
//      bill.html loads it before bill-detail.js.
//   2. "More" WHERE THERE IS LONGER TEXT. Every topic row whose stored rationale
//      survives the scrubber carries one closed "More" disclosure (the same
//      native <details> and 44px summary the front-page panel uses), and
//      opening it reveals exactly the text the front-page panel would show.
//   3. NO EMPTY "More". A row with no rationale, or one that is nothing but a
//      curators' note, has no "More" at all.
//   4. THE SHORT LINE STAYS THE DEFAULT, from bill-official.json's effects.
//   5. MUTATIONS ARE CAUGHT. The longer text shipped open, a row's "More"
//      omitted, or bill.html without the scrubber all fail 2.
//
//   node scripts/test-bill-b-more.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { rationaleSlice } from "./gen-reader-rationale.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ bill /b/ More: STALE HARNESS — ${m}`); process.exit(2); };

const ORIGIN = "https://politidex.fyi";
const BILL_HTML = R("bill.html");
const BD_SRC = R("bill-detail.js");
const OFFICIAL = R("bill-official.json");
const DOCS = JSON.parse(R("db/bill-docs.json")).docs;
const EFFECTS = JSON.parse(OFFICIAL).effects || {};
const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const DOC_SCRIPTS = [...BILL_HTML.matchAll(/<script\b[^>]*\bsrc="\/([^"]+)"[^>]*><\/script>/g)].map((m) => m[1]);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the copy is the original, and bill.html loads it");
// ═════════════════════════════════════════════════════════════════════════════
{
  let fresh = true;
  try { execFileSync(process.execPath, [join(ROOT, "scripts/gen-reader-rationale.mjs"), "--check"], { stdio: "pipe" }); }
  catch { fresh = false; }
  ok(fresh, "reader-rationale.js is stale — run node scripts/gen-reader-rationale.mjs");
  const slice = rationaleSlice(R("receipt-cards.js"));
  ok(R("reader-rationale.js").includes(slice), "reader-rationale.js carries receipt-cards.js's scrubber block byte for byte");
  ok(/window\._pdxReaderRationale = readerRationale;/.test(R("receipt-cards.js")), "receipt-cards.js still owns window._pdxReaderRationale");
  const rr = DOC_SCRIPTS.indexOf("reader-rationale.js"), bd = DOC_SCRIPTS.indexOf("bill-detail.js");
  ok(rr >= 0, "bill.html loads /reader-rationale.js");
  ok(rr >= 0 && bd > rr, "bill.html loads the scrubber before the panel");
  ok(!DOC_SCRIPTS.includes("receipt-cards.js"), "bill.html still does not load the 239 KB share-card module");
}

// H.R. 22's "Whose Rule Governs" row, with the rationale the migration stored.
const MIG = R("netlify/database/migrations/20261123000000_vr_save_act_hr22_sponsors_and_state_rule.sql");
const HR22_STATE = (/VALUES \(m_id, 'states_federal_power', 45, false,\s*'yea_opposes', '((?:[^']|'')+)'/.exec(MIG) || [])[1];
must(HR22_STATE && HR22_STATE.length > 300, "the migration holds H.R. 22's long states_federal_power rationale");

const BILLS = [
  { key: "119|H.R. 1", id: 1001, number: "H.R. 1", title: "One Big Beautiful Bill Act" },
  { key: "119|H.R. 22", id: 1022, number: "H.R. 22", title: "SAVE Act" },
];
for (const b of BILLS) {
  must(DOCS[b.key] && (DOCS[b.key].m || []).length >= 4, `${b.key} has a bill document with its topics`);
  b.keys = DOCS[b.key].m.map((x) => x.k).filter(Boolean);
}
// Each bill: row 1 has no rationale, row 2 has only a curators' note (scrubs to
// nothing), H.R. 22's state-rule row has its real stored text, the rest a long
// reader sentence.
const NOTE_ONLY = "Weighted 80 rather than 100.";
const rationaleFor = (b, k, i) => k === "states_federal_power" ? HR22_STATE.replace(/''/g, "'")
  : i === 1 ? "" : i === 2 ? NOTE_ONLY
  : `Section ${i + 2} of ${b.number} is the provision that reaches this topic, and the stored text on it runs well past what a short line can carry.`;
const fixture = (b) => ({
  measure: { id: b.id, number: b.number, congress: 119, chamber: "house", status: "passed_house", title: b.title },
  issues: b.keys.map((k, i) => ({ issueKey: k, supportMeaning: i % 3 === 2 ? "yea_opposes" : "yea_supports", rationale: rationaleFor(b, k, i) })),
  rollcalls: [], positions: [], provisions: [], actions: [],
});

async function panel(b, { scripts = DOC_SCRIPTS, bd = BD_SRC } = {}) {
  const win = makeSandbox();
  win.__PDX_BILL_DOC = true;
  const p = "/b/119/" + encodeURIComponent(b.number);
  win.location = { href: ORIGIN + p, pathname: p, search: "", hash: "", origin: ORIGIN };
  const capture = { innerHTML: "", scrollTop: 0 };
  win.document.getElementById = (id) => (id === "pdx-bd-scroll" ? capture : null);
  win.history = { replaceState() {}, pushState() {} };
  win.fetch = (u) => String(u) === "/bill-official.json"
    ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(OFFICIAL)) })
    : Promise.reject(new Error("offline"));
  const ctx = vm.createContext(win);
  for (const f of scripts) vm.runInContext(f === "bill-detail.js" ? bd : R(f), ctx, { filename: f });
  const data = fixture(b);
  win.PDXBills = { get: () => Promise.resolve(data), list: () => Promise.resolve({ items: [] }), listSync: () => ({ items: [] }), isFollowed: () => false };
  for (let pass = 0; pass < 2; pass++) {
    win.PDXBillDetail.open(data.measure.id);
    for (let i = 0; i < 40; i++) await Promise.resolve();
  }
  return { html: capture.innerHTML, win };
}
const rowsOf = (h) => [...h.matchAll(/<div class="bd-omni-row[^"]*"[^>]*>([\s\S]*?)(?=<div class="bd-omni-row|<\/div><\/div><\/section>)/g)].map((m) => m[1]);
const keyOf = (r) => (/data-issue="([^"]+)"/.exec(r) || [])[1];

// The front-page answer: what receipt-cards.js's own scrubber makes of each row.
const FRONT = (() => {
  const w = makeSandbox();
  vm.runInContext(R("receipt-cards.js"), vm.createContext(w), { filename: "receipt-cards.js" });
  must(typeof w._pdxReaderRationale === "function", "receipt-cards.js boots and exposes the scrubber");
  return w._pdxReaderRationale;
})();

function problems(html, b) {
  const out = [];
  const rows = rowsOf(html);
  if (rows.length !== b.keys.length) out.push(`${b.number}: ${rows.length} rows for ${b.keys.length} keys`);
  let withMore = 0;
  rows.forEach((r) => {
    const k = keyOf(r);
    const i = b.keys.indexOf(k);
    const want = FRONT(rationaleFor(b, k, i)) || "";
    const line = (EFFECTS[b.key] || {})[k] || "";
    const details = [...r.matchAll(/<details\b[^>]*>[\s\S]*?<\/details>/g)].map((m) => m[0]);
    const more = /^<details class="bd-omni-more" data-bd-more><summary class="bd-omni-more-sum">More<\/summary><div class="bd-omni-why">([^<]*)<\/div><\/details>$/.exec(details[0] || "");
    const eff = (/<div class="bd-omni-eff" data-bd-eff-for="[^"]+">([^<]*)<\/div>/.exec(r) || [])[1];
    if (unescape(eff || "") !== line) out.push(`${b.number} ${k}: the default line is not the page's short line`);
    // Nothing of the longer text is visible with every disclosure shut.
    const shut = r.replace(/<details\b(?![^>]*\bopen\b)[^>]*>[\s\S]*?<\/details>/g, "");
    if (/bd-omni-why/.test(shut)) out.push(`${b.number} ${k}: the longer text is visible by default`);
    if (want && want !== line) {
      if (!more) { out.push(`${b.number} ${k}: a row with longer stored text has no closed "More"`); return; }
      withMore++;
      if (unescape(more[1]) !== want) out.push(`${b.number} ${k}: opening "More" does not reveal the stored text the front page shows`);
      if (details.length !== 1) out.push(`${b.number} ${k}: ${details.length} disclosures on one row`);
    } else if (details.length) {
      out.push(`${b.number} ${k}: an empty or redundant "More" on a row with no longer text`);
    }
  });
  if (!withMore) out.push(`${b.number}: no row carried a "More" — the check proved nothing`);
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
section("2–4 · a pure /b/ boot: More where there is longer text, none where there is not");
// ═════════════════════════════════════════════════════════════════════════════
const BOOT = {};
for (const b of BILLS) {
  const r = await panel(b);
  must(r.html.includes(b.number), `${b.number} panel rendered`);
  BOOT[b.number] = r.html;
  eq(problems(r.html, b), [], `${b.number} on /b/`);
  const rowFor = (k) => rowsOf(r.html).find((x) => keyOf(x) === k);
  const none = rowFor(b.keys[1]), noteOnly = rowFor(b.keys[2]);
  ok(!!none && !/data-bd-more/.test(none), `${b.number}: the row with no stored rationale has no "More"`);
  ok(!!noteOnly && !/data-bd-more/.test(noteOnly), `${b.number}: the row whose rationale is only a curators' note has no "More"`);
  ok(/A Yea (?:advances|cuts against) this/.test(r.html), `${b.number}: the direction chips are still on the rows`);
}
{
  const row = rowsOf(BOOT["H.R. 22"]).find((r) => keyOf(r) === "states_federal_power") || "";
  ok(/<details class="bd-omni-more" data-bd-more><summary/.test(row), "H.R. 22 · Whose Rule Governs: a closed More on /b/");
  ok(unescape((/<div class="bd-omni-why">([^<]*)</.exec(row) || [])[1] || "").includes("documentary proof of United States citizenship"),
    "H.R. 22 · Whose Rule Governs: opening More reveals the stored text");
}
ok(/\.bd-omni-more-sum\{[^}]*min-height:44px/.test(BD_SRC), "the More summary keeps its 44px target");

// ═════════════════════════════════════════════════════════════════════════════
section("5 · mutations are caught");
// ═════════════════════════════════════════════════════════════════════════════
{
  const b = BILLS[1];
  const open = BD_SRC.replace(`'<details class="bd-omni-more" data-bd-more><summary`, `'<details class="bd-omni-more" data-bd-more open><summary`);
  must(open !== BD_SRC, "the open-by-default mutation found its target");
  ok(problems((await panel(b, { bd: open })).html, b).length > 0, "the longer text shipped open passes");

  const omit = BD_SRC.replace(`(why && why !== line\n          ?`, `(false\n          ?`);
  must(omit !== BD_SRC, "the omit-More mutation found its target");
  ok(problems((await panel(b, { bd: omit })).html, b).length > 0, "a row's More omitted passes");

  const noScrub = DOC_SCRIPTS.filter((f) => f !== "reader-rationale.js");
  ok(problems((await panel(b, { scripts: noScrub })).html, b).length > 0, "bill.html without the scrubber passes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the shell moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  const SW = R("sw.js");
  ok(SW.includes("  '/bill.html',"), "sw: bill.html is a precached shell asset");
  const ver = Number((/const CACHE_VERSION = 'v(\d+)';/.exec(SW) || [])[1]);
  ok(ver >= 402, `sw: CACHE_VERSION moved for the changed bill.html (v${ver})`);
}

if (failures.length) {
  console.error(`\n✗ bill /b/ More: ${failures.length} failure(s), ${passed} passed`);
  for (const f of failures) console.error("   · " + f);
  process.exit(1);
}
console.log(`\n✓ bill /b/ More: ${passed} checks passed — on a pure /b/ page the longer topic text opens behind the same closed More`);
