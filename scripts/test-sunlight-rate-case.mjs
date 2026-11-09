#!/usr/bin/env node
/**
 * test-sunlight-rate-case.mjs — Sunlight Governance, Phase 2
 * ─────────────────────────────────────────────────────────────────────────────
 * The first live Sunlight Governance entry: Rocky Mountain Power's general
 * rate case before the Public Service Commission of Utah, Docket No. 24-035-04.
 * What this file pins:
 *
 *   1. THE ITEM EXISTS AND IS TAGGED. sunlight-entries.js publishes the rate
 *      case as kind 'rate_case', manually tagged sunlight_governance, and it is
 *      registered with PDXSunlight whichever of the two files loads first.
 *   2. THE ENTRY CARRIES WHAT IT MUST. A redaction note, the Office of
 *      Consumer Services reference, a public-vs-full comparison, the related
 *      PSC-oversight votes already on PolitiDex, and the narrow ask "Publish
 *      one confidential contract" — with no call to pass a law.
 *   3. IT APPEARS ON /sunlight/rocky-mountain-power.
 *      sunlight-rocky-mountain-power.html prints the entry statically, and
 *      the markup agrees with the data.
 *   4. IT APPEARS IN SEARCH. In the real All-Seeing Eye, "rate case", "Rocky
 *      Mountain Power", "PSC", the docket number and "Office of Consumer
 *      Services" all print the Sunlight thread with the rate case in it.
 *   5. NEUTRAL FRAMING, AND NOTHING ELSE MOVED. No partisan language; the
 *      stance generator and District Voice do not name the tag.
 *   6. FILED VS. ORDERED (Phase 4). The utility's application and the PSC's
 *      April 25, 2025 order, each with a date and a public PSC link, in the
 *      data and on /sunlight; and the "Public filings since the order" note
 *      turns into an Update with a link when a filing is added to the list.
 *
 *   node scripts/test-sunlight-rate-case.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const section = (t) => console.log(`   ── ${t}`);
const ID = "UT-PSC-24-035-04";
const PARTISAN = /\b(republican|democrat|conservative|liberal|progressive|left-wing|right-wing|corrupt|greed|gop)\b/i;
const LAW_CALL = /\b(pass (a|the|new) (law|bill)|enact (a|new) (law|legislation)|call (on|your) (legislator|lawmaker|representative)s?|contact your legislator)\b/i;

// ═════════════════════════════════════════════════════════════════════════════
// 1 · The item exists and is tagged — in either load order
// ═════════════════════════════════════════════════════════════════════════════
section("the rate-case item exists, is tagged and registers in either load order");
function load(order) {
  const w = {};
  w.window = w;
  const ctx = vm.createContext(w);
  for (const f of order) vm.runInContext(R(f), ctx, { filename: f });
  return w;
}
ok(existsSync(join(ROOT, "sunlight-entries.js")), "sunlight-entries.js is missing");
let item;
for (const order of [["sunlight-governance.js", "sunlight-entries.js"], ["sunlight-entries.js", "sunlight-governance.js"]]) {
  const w = load(order);
  const S = w.PDXSunlight;
  const list = S.items();
  const rc = list.find((it) => it.id === ID);
  ok(rc, `[${order[0]} first] the rate case is not registered`);
  eq(list.length, 1, `[${order[0]} first] Phase 2 ships exactly one live entry`);
  if (rc) {
    eq(rc.kind, "rate_case", "kind");
    ok(S.isTagged(rc), "the rate case does not carry the sunlight_governance tag");
    ok(rc.tags.includes("sunlight_governance"), "tags[] lacks sunlight_governance");
    eq(rc.tagSource, "manual", "the entry is tagged manually, not by auto-match");
    eq(rc.href, "/sunlight/rocky-mountain-power#rmp-24-035-04", "the entry points at its anchor on /sunlight/rocky-mountain-power");
    item = rc;
  }
}
{
  // The module alone still ships no entries of its own.
  const w = load(["sunlight-governance.js"]);
  eq(w.PDXSunlight.items().length, 0, "sunlight-governance.js registers entries without sunlight-entries.js");
}

// ═════════════════════════════════════════════════════════════════════════════
// 2 · What the entry carries
// ═════════════════════════════════════════════════════════════════════════════
section("the entry includes the redaction note, the OCS reference, the comparison, votes and the ask");
if (item) {
  ok(/Rocky Mountain Power/.test(item.title) && /24-035-04/.test(item.title), "title does not name the utility and docket");
  eq(item.regulator, "Public Service Commission of Utah", "regulator");
  eq(item.orderDate, "2025-04-25", "order date");
  ok(/^https:\/\/pscdocs\.utah\.gov\/electric\/24docs\/2403504\//.test(item.source.url), "source is not the public PSC docket");

  // Redaction note.
  ok(item.redaction && /confidential/i.test(item.redaction.note), "no redaction note");
  ok(/does not state what share/i.test(item.redaction.note), "the note does not say whether the share is stated");
  ok(item.redaction.items.length >= 3, "fewer than three confidential portions named");
  for (const r of item.redaction.items) {
    ok(r.quote && /confidential|redacted/i.test(r.quote), `redaction item "${r.what}" has no confidential/redacted quote`);
    ok(Number.isInteger(r.page) && r.page > 0, `redaction item "${r.what}" has no page reference`);
  }

  // Office of Consumer Services.
  eq(item.ocs && item.ocs.name, "Office of Consumer Services", "OCS reference");
  ok(item.ocs.positions.length >= 3, "fewer than three OCS positions");
  for (const p of item.ocs.positions) ok(Number.isInteger(p.page), `OCS position lacks a page: ${p.text.slice(0, 40)}`);
  ok(item.ocs.positions.some((p) => /9\.375%/.test(p.text)), "the OCS return-on-equity recommendation is missing");

  // Before-and-after comparison.
  ok(Array.isArray(item.comparison) && item.comparison.length >= 2, "no public-vs-full comparison");
  for (const c of item.comparison) ok(c.item && c.publicVersion && c.fullVisibility, `comparison row incomplete: ${c.item}`);

  // Related votes (bills already on PolitiDex).
  const bills = item.relatedVotes.bills;
  ok(bills.length >= 1, "no related votes");
  const search = R("bill-search-index.js");
  for (const b of bills) {
    ok(search.includes(`["${b.session}","${b.number}"`), `${b.number} (${b.session}) is not on PolitiDex`);
    eq(b.href, `/b/${b.session}/${b.number.replace(/ /g, "%20")}`, `${b.number} bill-page link`);
    ok(b.votes.length >= 1 && b.votes.every((v) => /^\d+-\d+-\d+$/.test(v.tally) && /^https:\/\/le\.utah\.gov\//.test(v.url)), `${b.number} votes lack a tally or source`);
  }

  // The ask.
  eq(item.ask.label, "Publish one confidential contract", "ask label");
  ok(/burden/i.test(item.ask.text) && /utility/i.test(item.ask.text), "the ask does not keep the burden on the utility");
  ok(!LAW_CALL.test(item.ask.text), "the ask calls for legislation");
  ok(/does not ask for any new law/.test(item.ask.text), "the ask does not say it is not a call for a law");

  // Neutral framing across the whole entry.
  ok(!PARTISAN.test(JSON.stringify(item)), "the entry carries partisan or ideological language");
}

// ═════════════════════════════════════════════════════════════════════════════
// 3 · The landing page
// ═════════════════════════════════════════════════════════════════════════════
section("the entry appears on /sunlight/rocky-mountain-power");
const html = R("sunlight-rocky-mountain-power.html");
const art = /<article[^>]*id="rmp-24-035-04"[^>]*>([\s\S]*?)<\/article>/.exec(html);
ok(art, "sunlight-rocky-mountain-power.html has no rate-case article");
if (art && item) {
  const open = /<article[^>]*id="rmp-24-035-04"[^>]*>/.exec(html)[0];
  ok(open.includes(`data-sunlight-item="${ID}"`), "article does not carry the item id");
  ok(open.includes('data-tags="sunlight_governance"'), "article is not tagged on the page");
  ok(open.includes('data-kind="rate_case"'), "article kind");
  const body = art[1];
  const text = body.replace(/<[^>]+>/g, " ").replace(/&middot;/g, "·").replace(/&amp;/g, "&").replace(/\s+/g, " ");
  ok(text.includes(item.title), "the page title disagrees with the data");
  ok(text.includes(item.redaction.note), "the page redaction note disagrees with the data");
  ok(/data-sg-redaction-note/.test(body), "the redaction note is not marked");
  for (const r of item.redaction.items) ok(text.includes(r.quote), `page lacks redaction quote: ${r.what}`);
  ok(/What the Office of Consumer Services argued/.test(text), "page has no OCS heading");
  for (const p of item.ocs.positions) ok(text.includes(p.text), `page lacks OCS position: ${p.text.slice(0, 50)}`);
  ok(/data-sg-compare/.test(body), "page has no comparison table");
  ok(/Public version/.test(text) && /Full visibility would show/.test(text), "comparison columns are not labelled");
  for (const c of item.comparison) {
    ok(text.includes(c.item), `comparison row missing: ${c.item}`);
    ok(text.includes(c.publicVersion), `public column disagrees: ${c.item}`);
    ok(text.includes(c.fullVisibility), `full-visibility column disagrees: ${c.item}`);
  }
  for (const b of item.relatedVotes.bills) {
    ok(body.includes(`href="${b.href}"`), `page does not link ${b.number}`);
    for (const v of b.votes) ok(text.includes(v.tally), `page lacks ${b.number} tally ${v.tally}`);
  }
  ok(/data-sg-ask/.test(body) && text.includes("Publish one confidential contract"), "page has no ask");
  ok(text.includes(item.ask.text), "the page ask disagrees with the data");
  ok(body.includes(item.source.url), "page does not link the public order");
  ok(!PARTISAN.test(text), "the page entry carries partisan or ideological language");
  ok(!LAW_CALL.test(text), "the page entry calls for legislation");
}
ok(!/No items carry the Sunlight Governance tag yet/.test(html), "the landing page still says no items are on file");

// ═════════════════════════════════════════════════════════════════════════════
// 4 · Search, through the real eye
// ═════════════════════════════════════════════════════════════════════════════
section("search surfaces the rate case in the Sunlight Governance thread");
function stubNode() {
  const set = new Set();
  const n = {
    id: "", className: "", innerHTML: "", textContent: "", value: "", tagName: "DIV",
    style: { setProperty() {}, removeProperty() {} }, dataset: {}, hidden: false, _attrs: {},
    classList: { add: (c) => set.add(c), remove: (c) => set.delete(c), toggle: (c) => (set.has(c) ? set.delete(c) : set.add(c)), contains: (c) => set.has(c) },
    setAttribute(k, v) { n._attrs[k] = String(v); }, getAttribute(k) { return k in n._attrs ? n._attrs[k] : null; },
    removeAttribute(k) { delete n._attrs[k]; },
    focus() {}, blur() {}, scrollIntoView() {}, click() {}, addEventListener() {}, removeEventListener() {}, remove() {},
    appendChild: (c) => c, insertBefore: (c) => c, insertAdjacentHTML() {},
    querySelector: () => null, querySelectorAll: () => [], closest: () => null, contains: () => true, matches: () => false,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 320, height: 44, bottom: 44, right: 320 }),
  };
  return n;
}
function boot(files) {
  const win = makeSandbox();
  const panel = stubNode(), input = stubNode(), eye = stubNode(), clear = stubNode();
  input.tagName = "TEXTAREA";
  const ids = { "pdx-eye-panel": panel, "pdx-eye-input": input, "pdx-eye": eye, "pdx-eye-clear": clear };
  win.document.getElementById = (id) => ids[id] || null;
  win.history = { replaceState() {}, pushState() {} };
  const store = {};
  win.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  const ctx = vm.createContext(win);
  for (const f of [...ENGINE_FILES, "pdx-issue-family.js", "issue-colors.js", "formal-index.js", "bills-index.js", "profile-evidence.js", "person-link.js"]) {
    vm.runInContext(R(f), ctx, { filename: f });
  }
  for (const f of files) vm.runInContext(R(f), ctx, { filename: f });
  win.PROFILES = Object.assign({}, win.CMP_DATA);
  win.PDXSpotlight = { list: () => [], registry: {} };
  win.PDXLazyData = { ensure: () => Promise.resolve(true), loaded: () => true, whenReady: (k, cb) => cb() };
  win._issueLabel = (k) => (win.ISSUE_MAP && win.ISSUE_MAP[k] && win.ISSUE_MAP[k].label) || "";
  win.__pdxEyeBillsLive = (win.PDX_BILLS_INDEX || []).slice();
  win._getPhotoUrl = (id) => `/img/${id}.jpg`;
  const appended = [];
  win.document.head.appendChild = (el) => { appended.push(el); return el; };
  vm.runInContext(R("all-seeing-eye.js"), ctx, { filename: "all-seeing-eye.js" });
  return {
    win, appended,
    search(q, lane) {
      eye.classList.add("is-open");
      input.value = q;
      if (lane) win.PDXEye.lane(lane);
      win.PDXEye.rebuild();
      win.PDXEye.render(q);
      return panel.innerHTML || "";
    },
  };
}
const thread = (h) => /data-eye-sunlight-thread="1"([\s\S]*?)(?=<div class="pdx-eye-cat" data-cat=|<div class="pdx-eye-hint|$)/.exec(h);
{
  const E = boot(["sunlight-governance.js", "sunlight-entries.js"]);
  for (const lane of ["formal", "public"]) {
    for (const q of ["rate case", "Rocky Mountain Power", "PSC", "utility", "24-035-04", "Office of Consumer Services"]) {
      const t = thread(E.search(q, lane));
      ok(t, `[${lane}] "${q}" prints no Sunlight thread`);
      if (!t) continue;
      ok(t[1].includes('data-eye-sunlight="landing"'), `[${lane}] "${q}" thread lacks the landing page`);
      ok(/href="\/sunlight\/rocky-mountain-power#rmp-24-035-04" data-eye-sunlight="item" data-kind="rate_case"/.test(t[1]), `[${lane}] "${q}" thread lacks the rate case`);
      ok(t[1].includes("Rocky Mountain Power general rate case, Utah PSC Docket No. 24-035-04"), `[${lane}] "${q}" thread lacks the rate-case title`);
    }
    ok(!thread(E.search("housing", lane)), `[${lane}] an unrelated query printed the Sunlight thread`);
  }
}
{
  // A document with neither file fetches each once.
  const E = boot([]);
  E.search("rate case", "formal");
  E.search("utility", "formal");
  eq(E.appended.filter((el) => el && el.src === "/sunlight-entries.js").length, 1, "the eye did not lazy-load sunlight-entries.js exactly once");
  eq(E.appended.filter((el) => el && el.src === "/sunlight-governance.js").length, 1, "the eye did not lazy-load sunlight-governance.js exactly once");
}

// ═════════════════════════════════════════════════════════════════════════════
// 5 · Nothing else moved
// ═════════════════════════════════════════════════════════════════════════════
section("the stance generator and District Voice do not name the tag or the entry");
for (const f of ["issue-map.js", "alignment-tool.js", "stance-studio.js", "voice-room.js", "issue-page.js", "issue.html", "voice.html"]) {
  if (existsSync(join(ROOT, f))) ok(!/sunlight_governance|Sunlight Governance|sunlight-entries/.test(R(f)), `${f} names the Sunlight Governance tag`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 6 · Filed vs. Ordered, and the public filings since the order (Phase 4)
// ═════════════════════════════════════════════════════════════════════════════
section("Filed vs. Ordered lists the utility request and the PSC order with dates and links");
const PSC_DOC = /^https:\/\/pscdocs\.utah\.gov\/electric\/24docs\/2403504\/[^\s"]+\.pdf$/;
if (item) {
  const fo = item.filedVsOrdered;
  ok(Array.isArray(fo) && fo.length === 2, "Filed vs. Ordered is not a two-line pair");
  const filed = (fo || []).find((r) => r.step === "filed");
  const ordered = (fo || []).find((r) => r.step === "ordered");
  ok(filed, "no Filed line");
  ok(ordered, "no Ordered line");
  if (filed) {
    ok(/Rocky Mountain Power/.test(filed.label) && /Application for General Rate Increase/.test(filed.title), "the Filed line is not the utility's application");
    eq(filed.date, "2024-06-28", "Filed date");
    ok(PSC_DOC.test(filed.url), "the Filed line does not link a public PSC document");
  }
  if (ordered) {
    ok(/PSC/.test(ordered.label), "the Ordered line is not the PSC's");
    eq(ordered.date, "2025-04-25", "Ordered date");
    eq(ordered.date, item.orderDate, "the Ordered line is the entry's order");
    eq(ordered.url, item.source.url, "the Ordered line links the public order");
  }
  // No percentages, scores or reading of either document.
  const foText = JSON.stringify(fo);
  ok(!/%|\bscore|\$\d/.test(foText), "Filed vs. Ordered carries a figure, percentage or score");
  ok(!PARTISAN.test(foText), "Filed vs. Ordered carries partisan language");

  // On /sunlight.
  const tbl = /<table[^>]*data-sg-filed-ordered[^>]*>([\s\S]*?)<\/table>/.exec(html);
  ok(tbl, "/sunlight has no Filed vs. Ordered section");
  ok(/<h3[^>]*>Filed vs\. Ordered<\/h3>/.test(html), "/sunlight has no Filed vs. Ordered heading");
  if (tbl) {
    const t = tbl[1];
    const E = load(["sunlight-entries.js"]).PDXSunlightEntries;
    for (const r of fo || []) {
      const row = new RegExp(`<tr data-sg-fo="${r.step}">([\\s\\S]*?)</tr>`).exec(t);
      ok(row, `/sunlight lacks the ${r.step} line`);
      if (!row) continue;
      ok(row[1].includes(r.label), `${r.step} label disagrees with the data`);
      ok(row[1].includes(`<time datetime="${r.date}">${E.longDate(r.date)}</time>`), `${r.step} date disagrees with the data`);
      ok(row[1].includes(`href="${r.url}"`) && row[1].includes(`>${r.title}</a>`), `${r.step} link disagrees with the data`);
    }
    ok(!/%/.test(t.replace(/<[^>]+>/g, "")), "the page's Filed vs. Ordered prints a percentage");
  }
}

section("the filings note turns into an Update when a filing is added to the list");
{
  const w = load(["sunlight-governance.js", "sunlight-entries.js"]);
  const E = w.PDXSunlightEntries;
  const rc = E.byId[ID];
  ok(Array.isArray(rc.filingsSinceOrder), "the entry has no filings list");
  eq(rc.filingsSinceOrder.length, 0, "the filings list starts empty");
  const before = E.filingsNote();
  eq(before.hasUpdates, false, "an empty list is not an update");
  eq(before.note, "No new public PSC filings flagged since the April 25, 2025 order.", "the empty note");
  ok(!/Update/.test(E.filingsHtml(before)), "the empty note reads as an update");

  // The page's static block is the empty-list rendering.
  const blk = /<div[^>]*data-sg-filings="([a-z]+)"[^>]*>([\s\S]*?)<\/div>/.exec(html);
  ok(blk, "/sunlight has no filings block");
  ok(/<h3[^>]*>Public filings since the order<\/h3>/.test(html), "/sunlight has no filings heading");
  if (blk) {
    eq(blk[1], "none", "the static block is not the empty state");
    eq(blk[2], E.filingsHtml(before), "the static block disagrees with the empty note");
  }
  ok(/<script src="\/sunlight-entries\.js" defer><\/script>/.test(html), "/sunlight does not load the entry to repaint the note");

  // Add a dated, sourced filing to the list: the note becomes an Update.
  const filing = { date: "2026-07-31", title: "Order Approving Settlement Stipulation", url: "https://pscdocs.utah.gov/electric/24docs/2403504/example-7-31-2026.pdf" };
  rc.filingsSinceOrder.push({ date: "2024-12-01", title: "Before the order", url: "https://pscdocs.utah.gov/x.pdf" }, { date: "2026-08-01", title: "No link" }, filing);
  const after = E.filingsNote();
  eq(after.hasUpdates, true, "a dated, sourced filing after the order is an update");
  eq(after.updates.length, 1, "only dated, sourced filings after the order count");
  const h = E.filingsHtml(after);
  ok(h.startsWith("<p><b>Update:</b> A new public filing in Docket No. 24-035-04 since the April 25, 2025 order.</p>"), "the note does not read as an Update");
  ok(h.includes(`<a href="${filing.url}" rel="noopener">${filing.title}</a>`), "the Update does not link the filing");
  ok(h.includes('<time datetime="2026-07-31">July 31, 2026</time>'), "the Update does not date the filing");
  ok(!h.includes("Before the order") && !h.includes("No link"), "an undated, unsourced or pre-order row was printed");

  // The page repaints its block from the list.
  const el = { innerHTML: blk ? blk[2] : "", attrs: { "data-sg-filings": "none" }, setAttribute(k, v) { this.attrs[k] = v; } };
  ok(E.paint({ querySelector: (sel) => (sel === "[data-sg-filings]" ? el : null) }), "paint did not find the block");
  eq(el.attrs["data-sg-filings"], "new", "the repainted block is not marked new");
  eq(el.innerHTML, h, "the repainted block is not the Update");
  ok(!PARTISAN.test(h), "the filings note carries partisan language");
}

if (failures.length) {
  console.error(`\n✗ sunlight rate case: ${failures.length} failure(s)\n` + failures.map((f) => "   · " + f).join("\n"));
  process.exit(1);
}
console.log(`✓ sunlight rate case: ${passed} checks passed`);
