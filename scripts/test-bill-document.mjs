#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-bill-document.mjs — a bill address is a document, not a panel over "/"
// ─────────────────────────────────────────────────────────────────────────────
// /b/119/H.J.Res.%20131 was in the sitemap and every drawer link pointed at it,
// and the server answered it with index.html. The bill appeared only after the
// homepage's JavaScript opened a panel; the edge rewrote the head and put nothing
// in the body, so a crawler got the homepage. The issue page's measure row was a
// <button> that wrote no href and dropped #bill/… on top of /issue/<key>.
//
// What must stay true:
//
//   1. THE PATH IS ITS OWN DOCUMENT. /b/* is served /bill.html at 200 by the one
//      /b/ rule — not index.html, and no second splat. bill.html is a template:
//      root-absolute paths, the edge's head tags in the edge's attribute order,
//      one marked body seam, and no bill named on its own.
//   2. THE EDGE WRITES THE BILL INTO THE BODY. /b/119/H.J.Res.%20131 comes back
//      with its number, its sitting, its stored title and its stored effect lines
//      in the body, canonicalised to itself, with no network call — and the
//      response is not the homepage. No score, no direction, no tally.
//   3. A MEASURE THE ARCHIVE DOES NOT HOLD IS THE EMPTY. An unknown number and an
//      unknown sitting both paint the empty (404, noindex), never a made-up bill,
//      and neither is in the sitemap. A database we could not ask says so too.
//   4. THE SITEMAP IS THE DOCUMENTS. Every /b/ line is a db/bill-docs.json entry
//      and every entry is a line; both generated files are current.
//   5. THE ISSUE-PAGE ROW IS AN ANCHOR to the same /b/ href the drawer and the
//      board write, falling back to the external bill URL, then /i/<key>.
//   6. NO #bill/ IN THE BAR. The panel opened on the homepage leaves /b/… in the
//      bar and nothing appended; closing gives the old address back. Mutations
//      that put #bill/ back, or the button back, are caught.
//
//   node scripts/test-bill-document.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const no = (h, n, m) => ok(!String(h).includes(n), `${m} — found ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ bill document: STALE HARNESS — ${m}`); process.exit(2); };

const ORIGIN = "https://politidex.fyi";
const ACCEPT = "/b/119/H.J.Res.%20131";
const UNKNOWN_NUM = "/b/119/H.R.%20999999";
const UNKNOWN_SIT = "/b/999/H.J.Res.%20131";
const BILL_HTML = R("bill.html");
const INDEX_HTML = R("index.html");
const DOCS = JSON.parse(R("db/bill-docs.json")).docs;
must(DOCS && DOCS["119|H.J.Res. 131"], "db/bill-docs.json holds H.J.Res. 131");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · /b/* serves bill.html, by the one rule");
// ═════════════════════════════════════════════════════════════════════════════
const TOML = R("netlify.toml");
const rules = [...TOML.matchAll(/\[\[redirects\]\]\s*\n\s*from\s*=\s*"([^"]+)"\s*\n\s*to\s*=\s*"([^"]+)"\s*\n\s*status\s*=\s*(\d+)/g)]
  .map((m) => ({ from: m[1], to: m[2], status: m[3] }));
must(rules.length > 20, `netlify.toml's redirect rules parsed (${rules.length})`);
function resolveAddr(p) {
  for (const r of rules) {
    if (r.from.endsWith("/*")) { const base = r.from.slice(0, -1); if (p.startsWith(base)) return r; }
    else if (r.from === p) return r;
  }
  return null;
}
for (const addr of [ACCEPT, "/b/2025GS/H.B.%20400", "/b/H.R.%201", UNKNOWN_NUM]) {
  const hit = resolveAddr(addr);
  ok(hit && hit.to === "/bill.html" && hit.status === "200",
    `${addr} is served /bill.html at 200 (got ${hit ? hit.to + " " + hit.status : "no rule"})`);
  ok(!hit || hit.to !== "/index.html", `${addr} is still a rewrite to index.html`);
}
const bRules = rules.filter((r) => r.from.startsWith("/b/"));
eq(bRules.length, 1, "exactly one /b/ rule — no second splat answers an unknown number");

// The template.
has(BILL_HTML, "bill.html — THE FIFTEENTH SHELL", "bill.html declares itself (the service worker's banner guard reads this)");
ok(BILL_HTML.indexOf("THE FIFTEENTH SHELL") < 4096, "the banner sits inside the prefix sw.js sniffs");
const seamRe = /<!--pdx:bill-doc-->[\s\S]*?<!--\/pdx:bill-doc-->/;
eq((BILL_HTML.match(/<!--pdx:bill-doc-->/g) || []).length, 1, "bill.html has exactly one body seam");
ok(seamRe.test(BILL_HTML), "the seam is opened and closed");
const staticSeam = (BILL_HTML.match(seamRe) || [""])[0];
has(staticSeam, "data-pdx-bill-pending", "the shipped seam is the pending state");
ok(!/H\.R\.|H\.J\.Res|S\.J\.Res|H\.B\./.test(staticSeam), "the template names no bill on its own");
for (const m of BILL_HTML.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
  const u = m[1];
  if (/^(?:https?:|data:|#|mailto:)/.test(u)) continue;
  ok(u.startsWith("/"), `bill.html carries a relative same-origin path (${u}) — at /b/<s>/<n> it resolves under /b/ and comes back as HTML`);
}
no(BILL_HTML, "#bill/", "bill.html spells the retired #bill/ address");
for (const s of ["/share-links.js", "/bills.js", "/bill-detail.js"]) has(BILL_HTML, `src="${s}"`, `bill.html loads ${s}`);
// The edge's head tags, in the order and attribute shape its regexes match.
for (const t of [
  /<title>[^<]*<\/title>/, /<link\s+rel="canonical"\s+href="/, /<meta\s+name="description"\s+content="/,
  /<meta\s+property="og:title"\s+content="/, /<meta\s+property="og:description"\s+content="/,
  /<meta\s+property="og:url"\s+content="/, /<meta\s+property="og:image"\s+content="/,
  /<meta\s+name="twitter:title"\s+content="/, /<meta\s+name="twitter:image"\s+content="/,
]) ok(t.test(BILL_HTML), `bill.html carries the head tag the edge rewrites: ${t}`);
ok(BILL_HTML.length < INDEX_HTML.length / 20, "bill.html is a template, not a copy of the homepage");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the edge writes the bill into the body");
// ═════════════════════════════════════════════════════════════════════════════
const outDir = mkdtempSync(join(tmpdir(), "bill-doc-"));
const bundle = (src, out) => execFileSync(join(ROOT, "node_modules/.bin/esbuild"),
  [src, "--bundle", "--platform=node", "--format=esm", `--outfile=${out}`, "--log-level=error"],
  { stdio: ["ignore", "ignore", "inherit"] });
bundle(join(ROOT, "netlify/edge-functions/share-preview.ts"), join(outDir, "share-preview.mjs"));
const EDGE = (await import(join(outDir, "share-preview.mjs"))).default;

const realFetch = globalThis.fetch;
let fetched = [];
function stubFetch(answer) {
  fetched = [];
  globalThis.fetch = async (u) => {
    fetched.push(String(u));
    if (answer === "throw") throw new Error("offline");
    if (typeof answer === "number") return new Response("{}", { status: answer, headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify(answer), { status: 200, headers: { "content-type": "application/json" } });
  };
}
// The CDN's half: the rewrite chain hands the edge whatever document the rule
// names. A test that served index.html here would be testing the old defect.
async function serve(path, doc = BILL_HTML) {
  const ctx = { next: async () => new Response(doc, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }) };
  const res = await EDGE(new Request(ORIGIN + path), ctx);
  if (!res) return { status: 200, html: doc, untouched: true };
  return { status: res.status, html: await res.text(), untouched: false };
}
const seamOf = (html) => (html.match(seamRe) || [""])[0];
const SCORE = /\d\s?%|\bscore\b|\bgrade\b|\bverdict\b|\bsupports?\b|\bopposes?\b|\byeas?\b|\bnays?\b|\bdirection\b|Direction Match/i;

stubFetch("throw"); // a held bill must need no network at all
const doc = await serve(ACCEPT);
ok(!doc.untouched, "the edge rewrote the bill document");
eq(doc.status, 200, "a held bill answers 200");
eq(fetched.length, 0, "a held bill is written from the snapshot, with no network call");
const body = seamOf(doc.html);
has(body, `<h1 class="pdx-bill-num">H.J.Res. 131</h1>`, "the body names the measure in its <h1>");
has(body, "119th Congress", "the body names the sitting");
has(body, "Coastal Plain Oil and Gas Leasing Program Record of Decision", "the body carries the stored title");
has(body, "Removed the conservation withdrawal from roughly 1.2 million acres inside the Arctic National Wildlife Refuge.",
  "the body carries the stored effect line for this measure");
has(body, "Protect Public Lands", "each effect line is labelled with the issue it is the effect on");
has(body, `data-pdx-bill-for="${ACCEPT}"`, "the body is stamped with the address it was written for");
has(body, `data-pdx-bill-held="doc"`, "the body says where the identity came from");
no(body, "data-pdx-bill-empty", "a held bill is not the empty");
ok(!SCORE.test(body.replace(/<[^>]+>/g, " ")), `the body prints a score, a direction or a tally: ${body.replace(/<[^>]+>/g, " ").match(SCORE)}`);
no(body.toLowerCase(), "congress.gov", "the body carries no scraped Congress.gov text or citation-as-content");
has(doc.html, `<link rel="canonical" href="${ORIGIN}${ACCEPT}"`, "the document canonicalises to itself");
has(doc.html, "<title>H.J.Res. 131", "the head names the measure");
no(doc.html, "name=\"robots\" content=\"noindex\"", "a held bill is indexable");
no(doc.html, "__PDX_SHARE_TARGET__", "no #bill/ hint is injected for the homepage to open");
no(doc.html, "#bill/", "the document carries no #bill/ address");
// …and it is not the homepage.
ok(doc.html !== INDEX_HTML, "the response is the homepage");
ok(doc.html.length < INDEX_HTML.length / 10, "the response is the size of the homepage");
const homeTitle = (INDEX_HTML.match(/<title>([^<]*)<\/title>/) || [])[1];
ok(homeTitle && !doc.html.includes(`<title>${homeTitle}</title>`), "the response carries the homepage's <title>");
has(doc.html, "bill.html — THE FIFTEENTH SHELL", "the response is the bill template");

// A sitting-less address resolves when the number is unique, and canonicalises
// to the full address.
{
  const one = Object.values(DOCS).filter((d) => Object.values(DOCS).filter((x) => x.n === d.n).length === 1)[0];
  must(one, "a number unique across the archive exists");
  const p = "/b/" + encodeURIComponent(one.n);
  const r = await serve(p);
  has(seamOf(r.html), `<h1 class="pdx-bill-num">${one.n.replace(/&/g, "&amp;")}</h1>`, `${p} names the one measure it can mean`);
  has(r.html, `<link rel="canonical" href="${ORIGIN}/b/${encodeURIComponent(one.s)}/${encodeURIComponent(one.n)}"`,
    `${p} canonicalises to the address with its sitting`);
}
// A state measure gets its session in words, not a congress.
{
  const ut = Object.values(DOCS).find((d) => /^\d{4}GS$/.test(d.s));
  must(ut, "a Utah general-session document exists");
  const r = await serve(`/b/${ut.s}/${encodeURIComponent(ut.n)}`);
  has(seamOf(r.html), `${ut.s.slice(0, 4)} General Session`, "a state bill names its session in words");
  no(seamOf(r.html), "Congress", "a state bill borrows no congress");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · a measure the archive does not hold is the empty");
// ═════════════════════════════════════════════════════════════════════════════
for (const p of [UNKNOWN_NUM, UNKNOWN_SIT]) {
  stubFetch(404);
  const r = await serve(p);
  const s = seamOf(r.html);
  eq(r.status, 404, `${p}: a measure the archive does not hold is a real 404`);
  has(s, `data-pdx-bill-empty="1"`, `${p}: the body is the empty`);
  has(s, "No measure on file at this address", `${p}: the empty says so plainly`);
  no(s, "data-pdx-bill-held", `${p}: the empty claims no held bill`);
  ok(!/H\.R\. 999999|H\.J\.Res\. 131|119th Congress/.test(s), `${p}: the empty prints a bill anyway`);
  no(s, "pdx-bill-effects", `${p}: the empty carries effect lines`);
  has(r.html, `<meta name="robots" content="noindex" />`, `${p}: the empty is not indexable`);
  has(r.html, `<link rel="canonical" href="${ORIGIN}/"`, `${p}: the empty canonicalises to nothing of its own`);
  ok(fetched.length === 1 && /measure-ref/.test(fetched[0]), `${p}: the archive was asked before the empty was written`);
}
{
  stubFetch(500);
  const r = await serve(UNKNOWN_NUM);
  eq(r.status, 200, "an archive we could not ask is not a 404");
  has(seamOf(r.html), `data-pdx-bill-empty="unconfirmed"`, "…and says it could not confirm, not that nothing exists");
  has(r.html, `name="robots" content="noindex"`, "…and is not indexable");
}
{
  // A measure the live ingest added after the snapshot: identity only.
  stubFetch({ measure: { congress: 119, number: "H.R. 999999", title: "A Test Act", chamber: "house", sourceUrl: "https://x" } });
  const r = await serve(UNKNOWN_NUM);
  const s = seamOf(r.html);
  eq(r.status, 200, "a live-held measure answers 200");
  has(s, `<h1 class="pdx-bill-num">H.R. 999999</h1>`, "a live-held measure is named from the archive's answer");
  has(s, `data-pdx-bill-held="live"`, "…and marked as live-held");
  no(s, "pdx-bill-effects", "…with no effect line the snapshot does not store");
}
globalThis.fetch = realFetch;
// An unknown ?bill= on the front page is not a dead end: the front page passes through.
{
  stubFetch(404);
  const r = await serve("/?bill=119/H.R.%20999999", INDEX_HTML);
  ok(r.untouched || r.status === 200, "an unknown ?bill= on the front page is not turned into a 404 page");
  globalThis.fetch = realFetch;
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the sitemap is the documents that exist");
// ═════════════════════════════════════════════════════════════════════════════
const XML = R("sitemap.xml");
const billLocs = [...XML.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => u.startsWith(ORIGIN + "/b/"));
const docLocs = Object.values(DOCS).map((d) => `${ORIGIN}/b/${encodeURIComponent(d.s)}/${encodeURIComponent(d.n)}`);
eq(billLocs.length, docLocs.length, "the sitemap lists one /b/ line per bill document");
eq(billLocs.filter((u) => !docLocs.includes(u)).length, 0, "the sitemap lists a /b/ address with no document");
eq(docLocs.filter((u) => !billLocs.includes(u)).length, 0, "a bill document is missing from the sitemap");
has(XML, `<loc>${ORIGIN}${ACCEPT}</loc>`, "the acceptance address is in the sitemap");
no(XML, UNKNOWN_NUM, "a number the archive does not hold is in the sitemap");
no(XML, UNKNOWN_SIT, "an unknown sitting is in the sitemap");
has(R("scripts/gen-sitemap.mjs"), "bill-docs.json", "gen-sitemap.mjs reads its bill rows from the documents");
for (const g of ["gen-bill-docs.mjs", "gen-sitemap.mjs"]) {
  let fresh = true;
  try { execFileSync(process.execPath, [join(ROOT, "scripts", g), "--check"], { stdio: "ignore" }); } catch (e) { fresh = false; }
  ok(fresh, `${g} --check: the committed output is stale`);
}
// The generator's row rule is the drawer's row rule.
{
  const src = R("consistency.js");
  const a = src.indexOf("function _dosEffectOk(raw) {");
  must(a !== -1, "consistency.js still carries _dosEffectOk");
  const fnSrc = src.slice(a, src.indexOf("\n  }", a) + 4);
  const methodSrc = (src.match(/var _DOS_EFFECT_METHOD = (\/[^\n]+\/i);/) || [])[1];
  must(methodSrc, "consistency.js still carries _DOS_EFFECT_METHOD");
  const drawer = vm.runInNewContext(`var _DOS_EFFECT_METHOD = ${methodSrc}; ${fnSrc}; _dosEffectOk`);
  const { effectOk } = await import(join(ROOT, "scripts/gen-bill-docs.mjs"));
  for (const d of Object.values(DOCS)) for (const e of d.e || []) eq(drawer(e.l), e.l, `${d.n}: a stored line the drawer would not print`);
  for (const s of ["", "Too long. " + "x".repeat(150) + ".", "Two sentences. Here.", "The chip was coded against it.", "No stop"])
    eq(effectOk(s), drawer(s), `the generator and the drawer disagree on ${JSON.stringify(s.slice(0, 30))}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the issue-page row is an anchor to the same path");
// ═════════════════════════════════════════════════════════════════════════════
function fakeEl(tag) {
  const el = {
    tagName: String(tag || "div").toUpperCase(), id: "", className: "", hidden: false, innerHTML: "", textContent: "",
    style: {}, children: [], attrs: {}, listeners: {},
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, on) { (on === undefined ? !this._s.has(c) : on) ? this._s.add(c) : this._s.delete(c); return this._s.has(c); }, contains(c) { return this._s.has(c); } },
    appendChild(c) { this.children.push(c); if (c && c.id) DOM.ids[c.id] = c; return c; },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); return c; },
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    hasAttribute(k) { return k in this.attrs; }, removeAttribute(k) { delete this.attrs[k]; },
    addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; }, closest() { return null; }, contains() { return false; },
    focus() {},
  };
  return el;
}
const DOM = { ids: {} };
function makeWin(href) {
  DOM.ids = {};
  const u = new URL(href);
  const listeners = {};
  const hist = [];
  const loc = { href: u.href, origin: u.origin, pathname: u.pathname, search: u.search, hash: u.hash };
  const setUrl = (next) => {
    const n = new URL(next, loc.href);
    Object.assign(loc, { href: n.href, pathname: n.pathname, search: n.search, hash: n.hash });
  };
  const document = {
    readyState: "complete",
    head: fakeEl("head"), body: fakeEl("body"), documentElement: fakeEl("html"),
    createElement: (t) => fakeEl(t),
    getElementById(id) {
      if (DOM.ids[id]) return DOM.ids[id];
      if (id === "pdx-bd-scroll" && DOM.ids["pdx-bd-overlay"]) return (DOM.ids[id] = fakeEl("div"));
      return null;
    },
    querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {},
  };
  const win = {
    document, location: loc, console, URL, URLSearchParams, Promise, JSON, Math, Date, Object, Array, String, Number, RegExp,
    history: {
      state: null,
      pushState(s, _t, next) { hist.push(["push", next]); this.state = s; setUrl(next); },
      replaceState(s, _t, next) { hist.push(["replace", next]); this.state = s; setUrl(next); },
    },
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); }, removeEventListener() {},
    dispatchEvent(e) { (listeners[e.type] || []).forEach((fn) => fn(e)); return true; },
    Event: class { constructor(t) { this.type = t; } }, CustomEvent: class { constructor(t, o) { this.type = t; Object.assign(this, o || {}); } },
    HashChangeEvent: null,
    setTimeout() { return 0; }, clearTimeout() {}, matchMedia() { return { matches: false }; },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    fetch() { return Promise.reject(new Error("no network in this test")); },
    navigator: {},
  };
  win.window = win; win.self = win;
  win.__hist = hist; win.__listeners = listeners;
  return win;
}
function load(win, files, override = {}) {
  const ctx = vm.createContext(win);
  for (const f of files) vm.runInContext(override[f] != null ? override[f] : R(f), ctx, { filename: f });
  return win;
}

const IP_SRC = R("issue-page.js");
function rowFor(src, item, key) {
  const w = load(makeWin(ORIGIN + "/"), ["share-links.js", "issue-page.js"], { "issue-page.js": src });
  const P = w.PDXIssuePage;
  must(P && P.rowsFrom && P.rowHtml, "PDXIssuePage publishes rowsFrom and rowHtml");
  const rows = P.rowsFrom([item], key);
  return { w, html: rows.length ? P.rowHtml(rows[0]) : "" };
}
const ITEM_131 = { id: 131, number: "H.J.Res. 131", title: "Coastal plain disapproval", congress: 119, chamber: "house",
  issueKeys: ["lands_preserve"], source: { url: "https://www.congress.gov/bill/119th-congress/house-joint-resolution/131" } };
{
  const { w, html } = rowFor(IP_SRC, ITEM_131, "lands_preserve");
  ok(/^<li class="pdxip-row"[^>]*><a class="pdxip-open" href="/.test(html), "the issue-page row is an anchor");
  has(html, `href="${ACCEPT}"`, "the row's href is the bill's document");
  no(html, "<button", "the row is still a button");
  no(html, "#bill/", "the row writes #bill/");
  const drawer = String(w.PDXShareLinks.bill("119", "H.J.Res. 131")).replace(ORIGIN, "");
  eq(drawer, ACCEPT, "the drawer's builder writes the same href");
  // The district board's own builder, read out of the shipped file.
  const db = R("district-board.js");
  const a = db.indexOf("function measureHref(item, issueKey) {");
  must(a !== -1, "district-board.js still carries measureHref");
  const board = vm.runInNewContext(db.slice(a, db.indexOf("\n  }\n", a) + 4) + "; measureHref");
  eq(board({ number: "H.J.Res. 131", measureIdent: { session: "119" } }, "lands_preserve"), ACCEPT,
    "the board's builder writes the same href for the same sitting and number");
}
{
  // A Utah row keeps its session as the sitting.
  const { html } = rowFor(IP_SRC, { id: 9, number: "H.B. 400", title: "Absenteeism", chamber: "utah house",
    externalIds: { utahSession: "2025GS" }, issueKeys: ["education"] }, "education");
  has(html, `href="/b/2025GS/H.B.%20400"`, "a state row's href carries its session");
}
{
  // No number: the external bill URL, then /i/<key>.
  const ext = rowFor(IP_SRC, { id: 77, title: "A numberless act", issueKeys: ["guns"], source: { url: "https://example.gov/act" } }, "guns").html;
  has(ext, `href="https://example.gov/act"`, "a row with no number falls back to its external bill URL");
  has(ext, `rel="noopener"`, "…opened as leaving the site");
  no(ext, "/b/", "…and is given no /b/ address");
  const bare = rowFor(IP_SRC, { id: 78, title: "Another numberless act", issueKeys: ["guns"] }, "guns").html;
  has(bare, `href="/i/guns"`, "with no external URL either, the row falls back to /i/<key>");
}
{
  // Mutation: the button comes back.
  const mut = IP_SRC.replace(`'<a class="pdxip-open" href="' + escAttr(href) + '"' +`, `'<button type="button" class="pdxip-open"' +`);
  ok(mut !== IP_SRC, "mutation (button) applied to issue-page.js");
  const { html } = rowFor(mut, ITEM_131, "lands_preserve");
  ok(!(/<a class="pdxip-open" href="\/b\/119\/H\.J\.Res\.%20131"/.test(html)), "the harness did not notice the row turning back into a button");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · no #bill/ in the bar");
// ═════════════════════════════════════════════════════════════════════════════
const BD_SRC = R("bill-detail.js");
// One open from a homepage page, through the panel's own path: an inline card,
// and a live list that cannot resolve an id, so the card-only panel paints.
async function openOnHome(src, start = ORIGIN + "/issue/lands_preserve") {
  const w = makeWin(start);
  w.PDXBills = {
    listSync: () => ({ items: [{ number: "H.J.Res. 131", congress: 119, title: "Coastal plain disapproval", chamber: "house", issueKeys: [] }] }),
    list: () => Promise.resolve({ items: [] }),
    get: () => Promise.resolve(null),
  };
  load(w, ["share-links.js", "bill-detail.js"], { "bill-detail.js": src });
  must(w.PDXBillDetail && w.PDXBillDetail.open, "PDXBillDetail.open is available");
  w.PDXBillDetail.open("H.J.Res. 131", "119");
  for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r));
  return w;
}
const barClean = (w) => !/#bill\//.test(w.location.href) && w.__hist.every(([, u]) => !/#bill\//.test(String(u)));
{
  const w = await openOnHome(BD_SRC);
  eq(w.location.pathname, ACCEPT, "opening the panel on the homepage puts the bill's document address in the bar");
  eq(w.location.hash, "", "…with nothing appended");
  ok(barClean(w), "no history entry the panel wrote carries #bill/");
  eq(w.__hist[0] && w.__hist[0][0], "push", "a tap pushes the address, so Back closes the panel");
  w.PDXBillDetail.close();
  eq(w.location.pathname, "/issue/lands_preserve", "closing gives the bar back the address it took");
  ok(barClean(w), "closing writes no #bill/ either");
}
{
  // A legacy #bill/ link still opens, and the hash is taken out of the bar.
  const w = makeWin(ORIGIN + "/#bill/119/H.J.Res.%20131");
  w.PDXBills = { listSync: () => ({ items: [{ number: "H.J.Res. 131", congress: 119, title: "x" }] }), list: () => Promise.resolve({ items: [] }), get: () => Promise.resolve(null) };
  load(w, ["share-links.js", "bill-detail.js"]);
  for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r));
  eq(w.location.hash, "", "a legacy #bill/ arrival drops the hash");
  eq(w.location.pathname, ACCEPT, "…and lands the bar on the bill's document address");
}
{
  // On the bill document itself the panel opens from the path and writes nothing.
  const w = makeWin(ORIGIN + ACCEPT);
  w.PDXBills = { listSync: () => ({ items: [{ number: "H.J.Res. 131", congress: 119, title: "x" }] }), list: () => Promise.resolve({ items: [] }), get: () => Promise.resolve(null) };
  load(w, ["share-links.js", "bill-detail.js"]);
  for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r));
  ok(DOM.ids["pdx-bd-overlay"] && !DOM.ids["pdx-bd-overlay"].hidden, "the /b/ document opens the panel from its own path");
  eq(w.location.href, ORIGIN + ACCEPT, "…and leaves the address exactly as it arrived");
  w.PDXBillDetail.close();
  eq(w.location.href, ORIGIN + ACCEPT, "closing the panel on the document keeps the document's address");
}
{
  // share-links no longer converts a /b/ path into a hash.
  const w = load(makeWin(ORIGIN + ACCEPT), ["share-links.js"]);
  eq(w.location.hash, "", "share-links.js leaves a /b/ path alone");
}
{
  // MUTATIONS. Each puts #bill/ back in the bar a different way; each must fail.
  const muts = [
    ["push writes the hash", BD_SRC.replace("history.pushState({ pdxBill: want }, '', want);",
      "history.pushState({ pdxBill: want }, '', here + location.search + '#bill/' + encodeURIComponent(sit) + '/' + encodeURIComponent(_current.number));")],
    ["the bar is not moved and the hash is appended", BD_SRC.replace("  function syncPath() {\n",
      "  function syncPath() {\n    try { history.replaceState(null, '', location.pathname + location.search + '#bill/' + encodeURIComponent(_current.sitting || '') + '/' + encodeURIComponent(_current.number)); } catch (e) {} return;\n")],
  ];
  for (const [name, src] of muts) {
    ok(src !== BD_SRC, `mutation "${name}" applied to bill-detail.js`);
    const w = await openOnHome(src);
    ok(!(barClean(w) && w.location.pathname === ACCEPT), `mutation "${name}" was not caught — #bill/ is back in the bar`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the service worker knows the shell");
// ═════════════════════════════════════════════════════════════════════════════
{
  const SW = R("sw.js");
  ok(/const SHELL_ASSETS = \[[\s\S]*?'\/bill\.html',[\s\S]*?\];/.test(SW), "sw.js precaches /bill.html");
  ok(/const BILL_NAV_RE = /.test(SW) && /shell\.match\('\/bill\.html'\)/.test(SW), "an offline /b/ navigation falls back to /bill.html");
  const banner = new RegExp((SW.match(/const SUB_SHELL_BANNER_RE = \/(.+)\/;/) || [])[1] || "^$");
  ok(banner.test(BILL_HTML.slice(0, 4096)), "the banner guard recognises bill.html");
  ok(!banner.test(INDEX_HTML.slice(0, 4096)), "…and still does not recognise index.html");
  const v = (SW.match(/const CACHE_VERSION = 'v(\d+)';/) || [])[1];
  ok(Number(v) >= 296, `CACHE_VERSION moved for the new shell (v${v})`);
}

if (failures.length) {
  console.error(`\n✗ bill document: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  · " + f);
  process.exit(1);
}
console.log(`\n✓ bill document: /b/<sitting>/<number> is its own document — ${passed} assertions passed`);
