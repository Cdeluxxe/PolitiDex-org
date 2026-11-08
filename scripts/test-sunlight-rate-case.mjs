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
 *   3. IT APPEARS ON /sunlight. sunlight.html prints the entry statically, and
 *      the markup agrees with the data.
 *   4. IT APPEARS IN SEARCH. In the real All-Seeing Eye, "rate case", "Rocky
 *      Mountain Power", "PSC", the docket number and "Office of Consumer
 *      Services" all print the Sunlight thread with the rate case in it.
 *   5. NEUTRAL FRAMING, AND NOTHING ELSE MOVED. No partisan language; the
 *      stance generator and District Voice do not name the tag.
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
    eq(rc.href, "/sunlight#rmp-24-035-04", "the entry points at its anchor on /sunlight");
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
section("the entry appears on /sunlight");
const html = R("sunlight.html");
const art = /<article[^>]*id="rmp-24-035-04"[^>]*>([\s\S]*?)<\/article>/.exec(html);
ok(art, "sunlight.html has no rate-case article");
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
      ok(/href="\/sunlight#rmp-24-035-04" data-eye-sunlight="item" data-kind="rate_case"/.test(t[1]), `[${lane}] "${q}" thread lacks the rate case`);
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

if (failures.length) {
  console.error(`\n✗ sunlight rate case: ${failures.length} failure(s)\n` + failures.map((f) => "   · " + f).join("\n"));
  process.exit(1);
}
console.log(`✓ sunlight rate case: ${passed} checks passed`);
