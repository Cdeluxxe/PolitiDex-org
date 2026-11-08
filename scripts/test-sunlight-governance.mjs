#!/usr/bin/env node
/**
 * test-sunlight-governance.mjs — Sunlight Governance, Phase 1
 * ─────────────────────────────────────────────────────────────────────────────
 * What this file pins:
 *
 *   1. THE TAG EXISTS AND CAN BE APPLIED. sunlight-governance.js publishes
 *      window.PDXSunlight with the `sunlight_governance` category tag; it can be
 *      applied manually to an issue, a bill, a rate case or a lobbying record,
 *      removed again, and auto-applied only when an item's own text names a
 *      regulated-utility subject.
 *   2. THE LANDING PAGE RENDERS. sunlight.html (served at /sunlight, with
 *      /sunlight-governance as an alias) carries the two-sentence explanation
 *      and names the Philippines Digital Bayanihan Chain as the working
 *      proof-of-concept — and the module's copy of the two sentences matches.
 *   3. SEARCH OPENS ONE THREAD. In the real All-Seeing Eye, "utility",
 *      "Rocky Mountain Power", "rate case" and "PSC" print the Sunlight
 *      Governance thread with the landing page in it, and tagged items in the
 *      same thread when any are registered. A query on an unrelated subject
 *      prints no thread.
 *   4. NOTHING ELSE MOVED. The issue register, the stance generator and
 *      District Voice do not name the tag.
 *
 *   node scripts/test-sunlight-governance.mjs
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

// ═════════════════════════════════════════════════════════════════════════════
// 1 · The category tag
// ═════════════════════════════════════════════════════════════════════════════
section("the category tag exists and can be applied");
{
  const w = {};
  w.window = w;
  const ctx = vm.createContext(w);
  vm.runInContext(R("sunlight-governance.js"), ctx, { filename: "sunlight-governance.js" });
  const S = w.PDXSunlight;
  ok(S && typeof S === "object", "window.PDXSunlight is not published");
  eq(S.TAG.key, "sunlight_governance", "tag key");
  eq(S.TAG.label, "Sunlight Governance", "tag label");
  eq(S.TAG.href, "/sunlight", "tag points at the landing page");
  for (const k of ["issue", "bill", "rate_case", "lobbying"]) ok(S.ITEM_KINDS.includes(k), `item kind ${k} cannot carry the tag`);

  // Manual application.
  const bill = { kind: "bill", id: "HB-1", title: "An act about school lunches" };
  ok(!S.isTagged(bill), "an untagged item reads as tagged");
  S.tag(bill);
  ok(S.isTagged(bill), "tag() did not apply the tag");
  eq(bill.tagSource, "manual", "manual tag source");
  S.tag(bill);
  eq(bill.tags.filter((t) => t === "sunlight_governance").length, 1, "tag() applied the tag twice");
  S.untag(bill);
  ok(!S.isTagged(bill), "untag() did not remove the tag");

  // Automatic application: only on the item's own regulated-utility text.
  const rc = { kind: "rate_case", id: "UT-24-035-04", title: "Rocky Mountain Power general rate case" };
  S.autoTag(rc);
  ok(S.isTagged(rc), "autoTag() did not tag a Rocky Mountain Power rate case");
  eq(rc.tagSource, "auto", "auto tag source");
  const lob = { kind: "lobbying", id: "L1", title: "Lobbying disclosure", summary: "Contacts with the Public Service Commission" };
  ok(S.isTagged(S.autoTag(lob)), "autoTag() did not tag a lobbying record naming the PSC");
  const unrelated = { kind: "issue", id: "i1", title: "Sunlight hours and daylight saving time" };
  ok(!S.isTagged(S.autoTag(unrelated)), "autoTag() tagged an item that names no regulated-utility subject");
  ok(!S.isTagged(S.autoTag({ kind: "bill", title: "Pspca act" })), "autoTag() matched 'psc' inside another word");

  // Registry.
  eq(S.items().length, 0, "Phase 1 ships live tagged entries — the registry must start empty");
  ok(!S.register(unrelated), "register() accepted an untagged item");
  ok(!S.register({ kind: "tweet", title: "Rate case", tags: ["sunlight_governance"] }), "register() accepted an unknown kind");
  ok(S.register(rc), "register() refused a tagged rate case");
  ok(S.register(rc), "re-registering an item failed");
  eq(S.items().length, 1, "re-registering duplicated the item");
  S.clear();
  eq(S.items().length, 0, "clear() left items");

  // Query matcher.
  for (const q of ["utility", "Rocky Mountain Power", "rate case", "PSC", "utah psc rate case", "utilities"]) {
    ok(S.matchesQuery(q), `matchesQuery("${q}") is false`);
  }
  for (const q of ["mike lee", "housing", "", "psca"]) ok(!S.matchesQuery(q), `matchesQuery("${q}") is true`);
  const res = S.search("rate case");
  ok(res && res.landing && res.landing.href === "/sunlight", "search() does not return the landing page");

  // ═══════════════════════════════════════════════════════════════════════════
  // 2 · The landing page
  // ═══════════════════════════════════════════════════════════════════════════
  section("the landing page renders the explanation and the Bayanihan reference");
  ok(existsSync(join(ROOT, "sunlight.html")), "sunlight.html is missing");
  const html = R("sunlight.html");
  ok(/<link rel="canonical" href="https:\/\/politidex\.fyi\/sunlight" \/>/.test(html), "canonical is not /sunlight");
  ok(/<h1[^>]*>Sunlight Governance<\/h1>/.test(html), "the page has no Sunlight Governance heading");
  const lede = /<p class="sg-lede" id="sg-explanation">([\s\S]*?)<\/p>/.exec(html);
  ok(lede, "the explanation paragraph is missing");
  if (lede) {
    const text = lede[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    eq(sentences.length, 2, "the explanation is not exactly two sentences");
    ok(/Philippines Digital Bayanihan Chain/.test(text), "the explanation does not name the Philippines Digital Bayanihan Chain");
    ok(/proof-of-concept/.test(text), "the Bayanihan reference is not framed as the working proof-of-concept");
    ok(/regulated monopolies/.test(text), "the explanation does not frame the category as transparency in regulated monopolies");
    eq(sentences.join(" "), S.EXPLANATION.join(" "), "the page and PDXSunlight.EXPLANATION disagree");
    // Neutral framing: no party or ideological labels.
    ok(!/\b(republican|democrat|conservative|liberal|progressive|left-wing|right-wing|corrupt|greed)/i.test(text),
      "the explanation carries partisan or ideological language");
  }
  // /sunlight is served by pretty URLs from sunlight.html; the long spelling is
  // a forwarding document that canonicalises to /sunlight.
  ok(existsSync(join(ROOT, "sunlight-governance.html")), "the /sunlight-governance alias is missing");
  const alias = R("sunlight-governance.html");
  ok(/http-equiv="refresh" content="0; url=\/sunlight"/.test(alias), "/sunlight-governance does not forward to /sunlight");
  ok(/<link rel="canonical" href="https:\/\/politidex\.fyi\/sunlight" \/>/.test(alias), "the alias does not canonicalise to /sunlight");
}

// ═════════════════════════════════════════════════════════════════════════════
// 3 · Search, through the real eye
// ═════════════════════════════════════════════════════════════════════════════
section("search for a listed term surfaces the Sunlight Governance thread");
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
function boot(withModule) {
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
  if (withModule) vm.runInContext(R("sunlight-governance.js"), ctx, { filename: "sunlight-governance.js" });
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
  const E = boot(true);
  for (const lane of ["formal", "public"]) {
    for (const q of ["utility", "Rocky Mountain Power", "rate case", "PSC"]) {
      const h = E.search(q, lane);
      const t = thread(h);
      ok(t, `[${lane}] "${q}" prints no Sunlight Governance thread`);
      if (t) ok(/href="\/sunlight" data-eye-sunlight="landing"/.test(t[1]), `[${lane}] "${q}" thread does not link the landing page`);
    }
    ok(!thread(E.search("housing", lane)), `[${lane}] an unrelated query printed the Sunlight thread`);
  }
  ok(!thread(E.search("rate case", "mandate")), "the mandate lane printed the Sunlight thread");

  // Tagged items, when present, ride in the SAME thread as the landing page.
  E.win.PDXSunlight.register({ kind: "rate_case", id: "UT-24-035-04", title: "Rocky Mountain Power general rate case", href: "/sunlight#ut-24-035-04" });
  E.win.PDXSunlight.register(E.win.PDXSunlight.tag({ kind: "lobbying", id: "L-7", title: "Utility lobbying disclosure, 2026" }));
  const h = E.search("rate case", "formal");
  const t = thread(h);
  ok(t, "with tagged items registered, the thread is missing");
  if (t) {
    ok(t[1].includes("Rocky Mountain Power general rate case"), "a tagged rate case is not in the thread");
    ok(t[1].includes("Utility lobbying disclosure, 2026"), "a tagged lobbying record is not in the thread");
    ok(t[1].indexOf('data-eye-sunlight="landing"') < t[1].indexOf('data-eye-sunlight="item"'), "the landing page does not lead the thread");
    eq((t[1].match(/data-eye-sunlight-thread/g) || []).length, 0, "the thread was printed more than once");
  }
  eq((h.match(/data-eye-sunlight-thread="1"/g) || []).length, 1, "tagged items were split across more than one thread");
}
{
  // A document that did not ship the module fetches it once, lazily.
  const E = boot(false);
  E.search("rate case", "formal");
  E.search("utility", "formal");
  eq(E.appended.filter((el) => el && el.src === "/sunlight-governance.js").length, 1, "the eye did not lazy-load sunlight-governance.js exactly once");
}

// ═════════════════════════════════════════════════════════════════════════════
// 4 · Nothing else moved
// ═════════════════════════════════════════════════════════════════════════════
section("the stance generator, District Voice and the issue register do not name the tag");
for (const f of ["issue-map.js", "alignment-tool.js", "stance-studio.js", "voice-room.js", "issue-page.js", "issue.html", "voice.html"]) {
  if (existsSync(join(ROOT, f))) ok(!/sunlight_governance|Sunlight Governance/.test(R(f)), `${f} names the Sunlight Governance tag`);
}

if (failures.length) {
  console.error(`\n✗ sunlight governance: ${failures.length} failure(s)\n` + failures.map((f) => "   · " + f).join("\n"));
  process.exit(1);
}
console.log(`✓ sunlight governance: ${passed} checks passed`);
