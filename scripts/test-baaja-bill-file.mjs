#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-baaja-bill-file.mjs — S. 5653 (BAAJA) has a bill file, generated from its ledger
// ─────────────────────────────────────────────────────────────────────────────
// S. 5653, the Bipartisan American Affordability and Jobs Act of 2026, had a
// full ground-truth ledger (db/bill-standard/119-s-5653.json) and no bill file,
// so the site search found nothing for "baaja", "BAAJA" or "S. 5653". The bill
// file is now generated from that ledger by scripts/gen-bill-docs.mjs.
//
// What must stay true:
//
//   1. THE FILE EXISTS. db/bill-docs.json holds "119|S. 5653", built from the
//      ledger, and the sitemap lists /b/119/S.%205653.
//   2. IT IS REACHABLE. /b/119/S.%205653 and the sitting-less /b/S.%205653 are
//      served the bill template and the edge writes the bill into the body:
//      number, title, short names, status, sponsors and history.
//   3. EVERY MAPPING ROW IS ON THE PAGE. All 18 ledger rows, in ledger order,
//      each with its key, its direction, its sections, its quote and its
//      rationale — with the ledger's completeness note and equality statement.
//   4. NO WEIGHT, PRIMARY LABEL OR RANKING LANGUAGE. Outside the equality
//      statement itself (which says rows carry none), the page carries no such
//      word, and the doc carries no such field.
//   5. SEARCH FINDS IT. "baaja", "BAAJA", "S. 5653" and "American Affordability"
//      each return the page in the eye.
//   6. NOTHING ELSE MOVED. The ledger still validates as it stands, the person
//      bill lists do not carry the ledger-published file, and every other bill
//      document is the one the migrations alone produce.
//
//   node scripts/test-baaja-bill-file.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";
import { billDocs } from "./gen-bill-docs.mjs";
import { validateLedger, RANKING_FIELDS } from "./bill-standard-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ baaja bill file: STALE HARNESS — ${m}`); process.exit(2); };

const ORIGIN = "https://politidex.fyi";
const NUM = "S. 5653";
const KEY = `119|${NUM}`;
const PAGE = `/b/119/${encodeURIComponent(NUM)}`;
const LEDGER = JSON.parse(R("db/bill-standard/119-s-5653.json"));
const DOCS = JSON.parse(R("db/bill-docs.json")).docs;
const DOC = DOCS[KEY];
must(LEDGER && Array.isArray(LEDGER.issues), "the S. 5653 ledger is readable");

// The page's text escape (share-preview.ts text()): &, < and > only.
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the bill file exists, from the ledger");
// ═════════════════════════════════════════════════════════════════════════════
ok(!!DOC, "db/bill-docs.json holds 119|S. 5653");
must(DOC, "no S. 5653 document to test");
eq(DOC.t, "Bipartisan American Affordability and Jobs Act of 2026", "the title is the ledger's short title");
eq(DOC.c, "senate", "the chamber is the Senate");
eq(DOC.st, "pending", "status: in committee is pending");
has(DOC.sl, "in committee", "the status label says it is in committee");
eq(JSON.stringify(DOC.sp), JSON.stringify({ s: ["capito"], c: ["lee", "whitehouse", "heinrich"] }), "the sponsor and three co-sponsors");
eq(DOC.rs, LEDGER.identity.congressGovUrl, "the record page is the ledger's Congress.gov page");
eq(DOC.h.length, LEDGER.status.timeline.length, "every timeline row is in the history");
eq(DOC.ld.f, "db/bill-standard/119-s-5653.json", "the doc names the ledger it came from");
has(R("sitemap.xml"), `<loc>${ORIGIN}/b/119/S.%205653</loc>`, "the sitemap lists /b/119/S.%205653");
eq(validateLedger(LEDGER, {
  issueKeys: new Set(JSON.parse(R("db/issue-keys.json")).keys),
  people: new Set(Object.keys(JSON.parse(R("db/share-index.json")).people)),
  strict: true,
}).errors.length, 0, "the ledger still passes the strict (publish) check");
ok(Object.keys(billDocs(ROOT)).length === Object.keys(DOCS).length, "db/bill-docs.json is current");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the page is reachable and written into the body");
// ═════════════════════════════════════════════════════════════════════════════
const BILL_HTML = R("bill.html");
const TOML = R("netlify.toml");
const bRules = [...TOML.matchAll(/\[\[redirects\]\]\s*\n\s*from\s*=\s*"([^"]+)"\s*\n\s*to\s*=\s*"([^"]+)"\s*\n\s*status\s*=\s*(\d+)/g)]
  .filter((m) => m[1].startsWith("/b/"));
eq(bRules.length, 1, "still exactly one /b/ rule");
ok(bRules[0] && bRules[0][1] === "/b/*" && bRules[0][2] === "/bill.html" && bRules[0][3] === "200", "/b/* serves /bill.html at 200");

const outDir = mkdtempSync(join(tmpdir(), "baaja-"));
execFileSync(join(ROOT, "node_modules/.bin/esbuild"),
  [join(ROOT, "netlify/edge-functions/share-preview.ts"), "--bundle", "--platform=node", "--format=esm", `--outfile=${join(outDir, "sp.mjs")}`, "--log-level=error"],
  { stdio: ["ignore", "ignore", "inherit"] });
const EDGE = (await import(join(outDir, "sp.mjs"))).default;
globalThis.fetch = async () => { throw new Error("offline"); };
async function serve(path) {
  const ctx = { next: async () => new Response(BILL_HTML, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }) };
  const res = await EDGE(new Request(ORIGIN + path), ctx);
  return res ? { status: res.status, html: await res.text() } : { status: 200, html: BILL_HTML };
}
const seamOf = (html) => (html.match(/<!--pdx:bill-doc-->[\s\S]*?<!--\/pdx:bill-doc-->/) || [""])[0];

const page = await serve(PAGE);
eq(page.status, 200, `${PAGE} answers 200`);
const body = seamOf(page.html);
has(body, `<h1 class="pdx-bill-num">${NUM}</h1>`, "the body names S. 5653 in its <h1>");
has(body, "Bipartisan American Affordability and Jobs Act of 2026", "the body carries the title");
has(body, "BAAJA", "the body carries the short name BAAJA");
has(body, "American Affordability", "the body carries the short name American Affordability");
has(body, "Pending — in committee", "the body carries the status");
for (const pid of ["capito", "lee", "whitehouse", "heinrich"]) has(body, `data-pdx-bill-sponsor="${pid}"`, `the body links sponsor ${pid}`);
has(body, "History · from the official record", "the body carries the history block");
has(body, 'data-pdx-bill-held="doc"', "the body is the snapshot document");
ok(!body.includes("data-pdx-bill-empty"), "S. 5653 is not the empty");
has(page.html, `<link rel="canonical" href="${ORIGIN}${PAGE}"`, "the page canonicalises to /b/119/S.%205653");
ok(!/name="robots" content="noindex"/.test(page.html), "the page is indexable");
has(page.html, "<title>S. 5653", "the head names the measure");

const alias = await serve(`/b/${encodeURIComponent(NUM)}`);
eq(alias.status, 200, "/b/S.%205653 answers 200");
has(seamOf(alias.html), `<h1 class="pdx-bill-num">${NUM}</h1>`, "/b/S.%205653 is the same bill file");
has(alias.html, `<link rel="canonical" href="${ORIGIN}${PAGE}"`, "/b/S.%205653 canonicalises to the full address");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · every mapping row, with key, direction, quote and rationale");
// ═════════════════════════════════════════════════════════════════════════════
eq(LEDGER.issues.length, 18, "the ledger holds 18 mapping rows");
const items = [...body.matchAll(/<li data-pdx-bill-map data-key="([^"]+)" data-direction="([^"]+)">([\s\S]*?)<\/li>/g)];
eq(items.length, 18, "the page lists 18 mapping rows");
LEDGER.issues.forEach((row, i) => {
  const it = items[i];
  if (!it) return ok(false, `row ${i + 1} (${row.issueKey}) is missing`);
  eq(it[1], row.issueKey, `row ${i + 1}: key`);
  eq(it[2], row.supportMeaning, `row ${i + 1} (${row.issueKey}): direction`);
  has(it[3], `<code data-pdx-bill-map-key>${row.issueKey}</code>`, `row ${i + 1}: the key is printed`);
  has(it[3], `data-pdx-bill-map-direction="${row.supportMeaning}"`, `row ${i + 1}: the direction is printed`);
  has(it[3], row.supportMeaning === "yea_supports" ? "A yea vote supports this issue" : "A yea vote opposes this issue", `row ${i + 1}: the direction in words`);
  has(it[3], `“${esc(row.quote)}”`, `row ${i + 1} (${row.issueKey}): the quote, verbatim`);
  has(it[3], `<span data-pdx-bill-map-section>${esc(row.quoteRef)}</span>`, `row ${i + 1}: the quoted section`);
  for (const ref of row.provisionRefs) has(it[3], esc(ref), `row ${i + 1}: section ${ref}`);
  has(it[3], esc(row.rationale), `row ${i + 1} (${row.issueKey}): the rationale, verbatim`);
});
const splits = LEDGER.issues.reduce((m, r) => ((m[r.issueKey] = (m[r.issueKey] || []).concat(r.supportMeaning)), m), {});
for (const k of ["tribal_consultation", "property_rights", "mine_cleanup"]) {
  eq(JSON.stringify([...(splits[k] || [])].sort()), JSON.stringify(["yea_opposes", "yea_supports"]), `${k} is split one row per direction`);
}
has(body, `data-pdx-bill-ledger-equality>${esc(LEDGER.mappingEqualityNote)}</p>`, "the equality statement is on the page");
has(body, esc(LEDGER.completeness.E_issue_mapping.note), "the completeness note is on the page");
has(body, "mine_cleanup", "the new mine_cleanup key is on the page");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · no weight, primary label or ranking language");
// ═════════════════════════════════════════════════════════════════════════════
const RANK_WORDS = /\bweights?\b|\bweighted\b|\bprimary\b|\bsecondary\b|\branks?\b|\branked\b|\branking\b|\bpriority\b|\btop issue\b|\bmain issue\b|\bheadline issue\b/i;
const withoutEq = body.replace(/<p class="pdx-bill-ledger-eq"[\s\S]*?<\/p>/, "");
const words = withoutEq.replace(/<[^>]+>/g, " ");
ok(!RANK_WORDS.test(words), `the page prints ranking language outside the equality statement: ${(words.match(RANK_WORDS) || [])[0]}`);
const ldJson = JSON.stringify(DOC.ld);
for (const f of RANKING_FIELDS) ok(!new RegExp(`"${f}"\\s*:`).test(ldJson), `the doc carries no ${f} field`);
for (const r of DOC.ld.rows) ok(Object.keys(r).every((k) => ["k", "i", "d", "r", "qr", "q", "w", "u"].includes(k)), `row ${r.k} carries only key, label, direction, sections, quote and rationale`);

// ═════════════════════════════════════════════════════════════════════════════
section("5 · search finds it");
// ═════════════════════════════════════════════════════════════════════════════
const ROWS = (() => { const w = {}; vm.runInNewContext(R("bill-search-index.js"), { window: w }); return w.PDX_BILL_SEARCH; })();
const ROW = ROWS.find((r) => r[0] === "119" && r[1] === NUM);
ok(!!ROW, "S. 5653 is in the eye's bill index");
ok(ROW && /\(BAAJA\)$/.test(ROW[2]) && /American Affordability/.test(ROW[2]), "the index row's searched title carries the short names");
eq(ROW && ROW.length, 6, "the row keeps the index's six-field shape");
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
function bootEye(rows, inline) {
  const w = makeSandbox();
  const panel = stubNode(), input = stubNode(), eye = stubNode(), clear = stubNode();
  input.tagName = "TEXTAREA";
  const ids = { "pdx-eye-panel": panel, "pdx-eye-input": input, "pdx-eye": eye, "pdx-eye-clear": clear };
  w.document.getElementById = (id) => ids[id] || null;
  w.history = { replaceState() {}, pushState() {} };
  const store = {};
  w.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  w.addEventListener = () => {};
  const ctx = vm.createContext(w);
  for (const f of [...ENGINE_FILES, "pdx-issue-family.js", "issue-colors.js"]) vm.runInContext(R(f), ctx, { filename: f });
  w.PROFILES = w.CMP_DATA;
  w.PDXLazyData = { ensure: () => Promise.resolve(true), loaded: () => true, whenReady: (k, cb) => cb() };
  w.PDX_BILLS_INDEX = inline || [];
  w._issueLabel = (k) => (w.ISSUE_MAP && w.ISSUE_MAP[k] && w.ISSUE_MAP[k].label) || "";
  w.PDXSaved = { list: () => [], has: () => false };
  w.PDXBills = { open: () => true };
  vm.runInContext(R("all-seeing-eye.js"), ctx, { filename: "all-seeing-eye.js" });
  must(w.PDXEye && typeof w.PDXEye.render === "function", "PDXEye.render is unavailable");
  w.PDX_BILL_SEARCH = rows; w.PDXEye.rebuild();
  eye.classList.add("is-open");
  return (q) => { input.value = q; w.PDXEye.render(q); return panel.innerHTML || ""; };
}
const hrefs = (html) => [...String(html).matchAll(/<a role="option" class="pdx-eye-item pdx-eye-item--bill"[^>]*href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
const INLINE = (() => { const w = {}; vm.runInNewContext(R("bills-index.js"), { window: w }); return w.PDX_BILLS_INDEX; })();
for (const [label, search] of [["page index", bootEye(ROWS)], ["page + curated index", bootEye(ROWS, INLINE)]]) {
  for (const q of ["baaja", "BAAJA", "S. 5653", "American Affordability", "Bipartisan American Affordability and Jobs Act"]) {
    const got = hrefs(search(q));
    ok(got.includes(PAGE), `${label}: "${q}" finds ${NUM} (got ${got.slice(0, 5).join(", ")})`);
    console.log(`      ${label}: "${q}" → ${NUM} at row ${got.indexOf(PAGE) + 1} of ${got.length}`);
  }
}
// Without the short names, "baaja" would find nothing: the title does not hold it.
{
  const bare = ROWS.map((r) => (r[1] === NUM ? [r[0], r[1], DOC.t, ...r.slice(3)] : r));
  ok(!hrefs(bootEye(bare)("baaja")).includes(PAGE), "the short names are what make \"baaja\" find the page");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · nothing else moved");
// ═════════════════════════════════════════════════════════════════════════════
const PB = JSON.parse(R("person-bills.json"));
ok(!PB.bills.some((b) => b[0] === "119" && b[1] === NUM), "person bill lists do not carry the ledger-published file");
const migrationOnly = billDocs(ROOT, { noLedgers: true });
ok(!migrationOnly[KEY], "the migrations alone hold no S. 5653 document");
eq(Object.keys(DOCS).filter((k) => !migrationOnly[k]).join(","), KEY, "the ledger adds exactly one document");
ok(Object.keys(migrationOnly).every((k) => JSON.stringify(migrationOnly[k]) === JSON.stringify(DOCS[k])), "every other bill document is unchanged");
ok(ROWS.every((r) => r.length === 6), "every index row keeps the six-field shape");
ok(ROWS.every((r) => r[1] === NUM || !DOCS[`${r[0]}|${r[1]}`] || r[2] === (DOCS[`${r[0]}|${r[1]}`].t || "")), "only the ledger-published row's searched title differs from its stored title");
eq(R("all-seeing-eye.js"), execFileSync("git", ["show", "HEAD:all-seeing-eye.js"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }), "the eye itself is unchanged");

console.log(`\n   ${failures.length ? "✗" : "✓"} baaja bill file: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log(`      ✗ ${f.slice(0, 300)}`);
process.exit(failures.length ? 1 : 0);
