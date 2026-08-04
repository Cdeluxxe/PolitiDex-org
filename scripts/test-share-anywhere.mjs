#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Unit tests for the PERSON-LEVEL SHARE AFFORDANCE in share-anywhere.js
// ─────────────────────────────────────────────────────────────────────────────
// share-anywhere.js exists because the app had two good share pipelines and no
// way to reach either from the surfaces a phone user actually opens. It answers
// one question — "what is the strongest shareable artifact for this person?" —
// and it must always have an answer.
//
// Three properties are load-bearing, and each of them fails silently, which is
// why they are tested rather than trusted:
//
//   1. THE TIER ORDER AND THE GUARD BOUNDARY. The Official Record card wins, the
//      curated Say-vs-Do receipt is next, a profile link is last. The record read
//      must go through publicCardsFor — the guarded, wave-1-gated accessor — and
//      never through cardsFor, or this module would become a second way out of
//      the app that skips the trust guards.
//   2. THE HONEST FALLBACK. When neither pipeline can serve a person, the control
//      still works and SAYS it is sharing a link. The old wiring offered a Share
//      button that toasted "No receipt to share yet" — a control that fails is
//      worse than a control that is honest about what it can do.
//   3. THE FIXED-SIZE CONTRACT. The control renders VISIBLE and its hydration may
//      only change attributes, one glyph inside a fixed-width slot, and the text
//      inside a height-reserved hint box. It may never insert or remove a node,
//      and it may never change its visible label — either would move a mobile
//      sheet after it opened, which is the layout jumpiness the stability work
//      just settled.
//
// Section 5 then gates the WIRING: an affordance nobody mounts is not an
// affordance, and the whole point of the change was reaching four named surfaces.
//
//   node scripts/test-share-anywhere.mjs
//
// No database, no network, no browser. Exit code is non-zero on the first failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const failures = [];
let passed = 0;
const ok = (cond, msg) => { cond ? passed++ : failures.push(msg); };

// ── A DOM small enough to reason about ───────────────────────────────────────
// Only the surface share-anywhere.js touches, so a test failure points at the
// module rather than at a mock.
function mkEl(cls) {
  const el = {
    _cls: new Set(String(cls || "").split(/\s+/).filter(Boolean)),
    _attr: {},
    children: [],
    parentNode: null,
    textContent: "",
    classList: {
      add: (...c) => c.forEach((x) => el._cls.add(x)),
      remove: (...c) => c.forEach((x) => el._cls.delete(x)),
      contains: (x) => el._cls.has(x),
    },
    setAttribute: (k, v) => { el._attr[k] = String(v); },
    getAttribute: (k) => (k in el._attr ? el._attr[k] : null),
    removeAttribute: (k) => { delete el._attr[k]; },
    append(child) { child.parentNode = el; el.children.push(child); return child; },
    querySelector(sel) {
      const want = sel.replace(/^\./, "");
      for (const c of el.children) if (c._cls.has(want)) return c;
      return null;
    },
    querySelectorAll() { return []; },
    get className() { return [...el._cls].join(" "); },
  };
  return el;
}
// A button as the module will meet it: wrapper > (button > icon span, hint span).
function mkBtn(pid, tier, issue) {
  const wrap = mkEl("pdxsa-wrap");
  const btn = mkEl("pdxsa-share-btn pdxsa-t-" + (tier || "link"));
  const ico = mkEl("pdxsa-ico");
  const lbl = mkEl("pdxsa-lbl");
  lbl.textContent = "Share";
  const hint = mkEl("pdxsa-hint");
  btn.append(ico); btn.append(lbl);
  wrap.append(btn); wrap.append(hint);
  btn.setAttribute("data-pid", pid);
  if (issue) btn.setAttribute("data-issue", issue);
  btn.setAttribute("data-pdxsa-pending", "1");
  return { wrap, btn, ico, lbl, hint };
}

// ── Sandbox ──────────────────────────────────────────────────────────────────
const noopEl = () => ({
  style: {}, textContent: "", hidden: false, innerHTML: "",
  classList: { add() {}, remove() {}, contains: () => false },
  setAttribute() {}, getAttribute: () => null, removeAttribute() {},
  appendChild() {}, removeChild() {}, querySelector: () => null,
  querySelectorAll: () => [], addEventListener() {}, closest: () => null,
});
// Document-level listeners are recorded rather than discarded: the module binds
// one to the curated feed's arrival event, and that listener is the only thing
// standing between a memoised tier and a stale answer (section 4).
const docListeners = {};
const fire = (name) => (docListeners[name] || []).forEach((fn) => fn({ type: name }));
const ctx = {
  console,
  document: {
    readyState: "complete",
    head: noopEl(), body: noopEl(), documentElement: noopEl(),
    createElement: noopEl, getElementById: () => null,
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener(name, fn) { (docListeners[name] = docListeners[name] || []).push(fn); },
  },
  location: { hash: "", origin: "https://politidex.fyi", pathname: "/" },
  navigator: {},
  setTimeout: (fn) => { try { fn(); } catch (e) {} return 0; },
  clearTimeout: () => {},
  setInterval: () => 0, clearInterval: () => {},
  JSON, Math, Date, Promise, Object, Array, String, Number, Boolean,
  encodeURIComponent, decodeURIComponent,
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
ctx.addEventListener = () => {};

ctx.PROFILES = ctx.window.PROFILES = {
  rep_record:  { name: "Rep Record",  office: "U.S. House" },
  rep_receipt: { name: "Rep Receipt", office: "U.S. House" },
  rep_nothing: { name: "Rep Nothing", office: "State House" },
};

// The two owning modules, stubbed at exactly their public read surface. Note
// cardsFor is present and always throws: if share-anywhere.js ever reaches for
// the UNGUARDED list, section 1 turns red instead of shipping a card that
// skipped the guards.
const CARD = {
  pid: "rep_record", issueKey: "national_debt", measureNumber: "H.R. 1",
  issue: { label: "💰 National Debt" }, verdict: { key: "contradicts", cls: "v-contradicts" },
};
const CARD_OTHER = Object.assign({}, CARD, { issueKey: "healthcare", measureNumber: "H.R. 9", issue: { label: "🏥 Health Care" } });
const RECEIPT = { pid: "rep_receipt", name: "Rep Receipt", headline: "Promised, then voted the other way", verdict: { key: "contradicts" }, issue: { label: "🧾 Taxes" } };

const calls = [];
ctx.PDXReceiptCards = ctx.window.PDXReceiptCards = {
  cardsFor() { throw new Error("share-anywhere must not read the unguarded card list"); },
  publicCardsFor(pid, o) {
    if (pid !== "rep_record") return [];
    const iss = (o && o.issueKey) || "";
    if (iss === "healthcare") return [CARD_OTHER];
    if (iss && iss !== "national_debt") return [];
    return [CARD];
  },
  warm(pid) { calls.push(["warm", pid]); return Promise.resolve(null); },
  share(card, btn) { calls.push(["rc.share", card, btn]); return "rc"; },
};
ctx.PDXReceipts = ctx.window.PDXReceipts = {
  forPolitician(pid) { return pid === "rep_receipt" ? RECEIPT : null; },
  find(pid, iss) { return (pid === "rep_receipt" && iss === "taxes") ? RECEIPT : null; },
  share(r, btn) { calls.push(["svd.share", r, btn]); return "svd"; },
};
ctx.pdxSharePolitician = ctx.window.pdxSharePolitician = (pid) => { calls.push(["link", pid]); };
ctx._showToast = ctx.window._showToast = (m) => { calls.push(["toast", m]); };

const SRC = read("share-anywhere.js");
// The source-level assertions below are about what the module DOES, and this file
// is heavily commented — including quoting the dead-end toast it replaced. So they
// run against the code with comments removed, or the prose would answer for the
// code. `[^:]` keeps `https://` out of the line-comment match.
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
vm.createContext(ctx);
new vm.Script(SRC, { filename: "share-anywhere.js" }).runInContext(ctx);

const SA = ctx.window.PDXShareAnywhere;
ok(!!SA, "module: share-anywhere.js registers window.PDXShareAnywhere");

const run = async () => {

// ── 1. Tier order and the guard boundary ─────────────────────────────────────
{
  const a = SA.state("rep_record");
  ok(a && a.tier === "record", "tier: a member with a guard-cleared card resolves to 'record'");
  ok(a && a.card === CARD, "tier: the resolved card is the one publicCardsFor returned, unmodified");
  ok(/H\.R\. 1/.test(a.what) && /National Debt/.test(a.what),
     "tier: 'what' names the bill AND the issue — the two things that make the image checkable");

  const b = SA.state("rep_receipt");
  ok(b && b.tier === "receipt", "tier: no record card but a curated receipt resolves to 'receipt'");
  ok(b && b.receipt === RECEIPT, "tier: the resolved receipt is PDXReceipts' own object");

  const c = SA.state("rep_nothing");
  ok(c && c.tier === "link", "tier: a member with neither resolves to 'link' rather than to null");
  ok(SA.state("rep_nothing") !== null && SA.state("") === null,
     "tier: state() is null ONLY for an empty pid — never for a person");

  // Issue scoping: a row about one issue must not silently share another.
  const d = SA.state("rep_record", { issueKey: "healthcare" });
  ok(d.card === CARD_OTHER, "tier: an issueKey selects that issue's card");
  const e = SA.state("rep_record", { issueKey: "border_security" });
  ok(e.tier === "record" && e.card === CARD,
     "tier: an issue with no card of its own falls back to the member's strongest card, not to a link");

  ok(/publicCardsFor/.test(CODE) && !/\bcardsFor\s*\(/.test(CODE.replace(/publicCardsFor/g, "publicCF")),
     "guards: the record read goes through publicCardsFor only — the unguarded cardsFor is never called");
  ok(!/renderImage|canvasToBlob|navigator\.share/.test(CODE),
     "guards: this module renders no image and calls no share API itself, so 'sourced, dated, verdict-stamped, branded' stays a property of the two pipelines");
}

// ── 2. The honest fallback ───────────────────────────────────────────────────
{
  const link = SA.state("rep_nothing");
  ok(/no verdict-stamped share card/i.test(link.label),
     "fallback: the accessible name states that no card is on file rather than implying one");
  ok(/profile/i.test(link.label), "fallback: the accessible name says a profile link is what will be sent");
  ok(/link/i.test(link.hint) && /no verdict-stamped card/i.test(link.hint),
     "fallback: the visible hint says the same thing the accessible name does");
  ok(link.ico === "🔗", "fallback: the link tier is cued by a link glyph, not by a card glyph");

  const rec = SA.state("rep_record");
  ok(/Official Record/.test(rec.label) && /source/.test(rec.label),
     "fallback: the record tier promises the source, because the card prints it");
  const rcp = SA.state("rep_receipt");
  ok(/Say-vs-Do/.test(rcp.label), "fallback: the receipt tier names the curated feed by its own name");
  ok(rec.label !== rcp.label && rcp.label !== link.label,
     "fallback: all three tiers describe themselves differently — the label is the promise");

  ok(!/No receipt to share yet/.test(CODE),
     "fallback: the dead-end toast the old wiring showed is not reachable from this module");
}

// ── 3. The fixed-size contract ───────────────────────────────────────────────
{
  const html = SA.buttonHtml({ pid: "rep_nothing", hint: true, block: true, fallback: "copy" });
  ok(html && html.indexOf("pdxsa-share-btn") !== -1, "markup: buttonHtml emits the control");
  ok(!/\shidden\b/.test(html) && !/display:\s*none/.test(html),
     "markup: the control renders VISIBLE — fail-open, so hydration cannot make it appear");
  ok(/class="pdxsa-ico"/.test(html), "markup: the icon lives in its own fixed-width slot");
  ok(/class="pdxsa-lbl">Share</.test(html), "markup: the visible label is present and neutral before the tier is known");
  ok(/data-pdxsa-fallback="copy"/.test(html), "markup: the in-sheet fallback mode is carried on the element");
  ok(/data-pdxsa-tier="link"/.test(html), "markup: the current tier is on the element, so CSS and tests can both read it");
  ok(/class="pdxsa-hint"/.test(html), "markup: the hint line is emitted when the host asks for it");
  ok(SA.buttonHtml({ pid: "" }) === "", "markup: no pid means no control rather than a broken one");

  // What hydration is allowed to change. This is the layout-shift contract.
  const { wrap, btn, ico, lbl, hint } = mkBtn("rep_record", "link");
  const beforeChildren = btn.children.length;
  const beforeLabel = lbl.textContent;
  const beforeWrap = wrap.children.length;
  SA.apply(btn, SA.state("rep_record"));
  ok(btn.children.length === beforeChildren && wrap.children.length === beforeWrap,
     "stability: apply() inserts and removes no nodes");
  ok(lbl.textContent === beforeLabel,
     "stability: apply() leaves the visible label untouched, so the control's width cannot change");
  ok(ico.textContent === "🏛️", "stability: apply() swaps only the glyph inside the fixed-width icon slot");
  ok(btn.classList.contains("pdxsa-t-record") && !btn.classList.contains("pdxsa-t-link"),
     "stability: apply() moves the tier class so the accent colour follows the answer");
  ok(/Official Record/.test(btn.getAttribute("aria-label") || ""),
     "stability: apply() upgrades the accessible name to name the real artifact");
  ok(/Official Record card/.test(hint.textContent),
     "stability: apply() repaints the hint inside its height-reserved box");
  ok(btn.getAttribute("data-pdxsa-pending") === null,
     "stability: a hydrated button is not hydrated twice");

  ok(!/\.hidden\s*=|removeAttribute\(\s*['"]hidden|removeChild|parentNode\.removeChild/.test(CODE),
     "stability: nothing in this module hides, reveals or deletes its own control");
  ok(/pdxsa-busy/.test(CODE) && !/innerHTML\s*=\s*['"][^'"]*Building/.test(CODE),
     "stability: the busy state is a class, not a label rewrite that would resize the button mid-gesture");
}

// ── 4. Dispatch ──────────────────────────────────────────────────────────────
{
  calls.length = 0;
  const r1 = SA.share("rep_record", null);
  ok(calls.some((c) => c[0] === "rc.share" && c[1] === CARD),
     "dispatch: the record tier hands the card straight to PDXReceiptCards.share");
  ok(r1 === "rc", "dispatch: the record tier returns the pipeline's own result synchronously when the card is ready");

  calls.length = 0;
  SA.share("rep_receipt", null);
  ok(calls.some((c) => c[0] === "svd.share" && c[1] === RECEIPT),
     "dispatch: the receipt tier hands the receipt to PDXReceipts.share");
  ok(!calls.some((c) => c[0] === "rc.share"),
     "dispatch: a receipt is never routed through the Official Record pipeline");

  calls.length = 0;
  await SA.share("rep_nothing", null);
  ok(calls.some((c) => c[0] === "warm" && c[1] === "rep_nothing"),
     "dispatch: an empty-looking member is WARMED inside the same tap before the link fallback is accepted");
  ok(calls.some((c) => c[0] === "link" && c[1] === "rep_nothing"),
     "dispatch: with nothing on file the tap opens the profile share sheet — it does not fail");
  ok(calls.some((c) => c[0] === "toast" && /profile link/i.test(c[1])),
     "dispatch: the reader is told a link is being shared instead of a card");

  // Warming happens once per member, however many buttons ask.
  calls.length = 0;
  await Promise.all([SA.warm("rep_nothing"), SA.warm("rep_nothing")]);
  ok(calls.filter((c) => c[0] === "warm").length === 0,
     "dispatch: a settled member is not re-warmed by later buttons");

  // Memoisation must never outlive the answer it cached. Two cases: a 'link' read
  // before the record settled is provisional and must be re-read, and a settled
  // 'link' must be dropped when the curated feed finally loads — otherwise the
  // weakest tier is frozen in for the session and a real receipt is denied.
  let lateReceipt = null;
  ctx.PDXReceipts.forPolitician = (pid) => {
    if (pid === "rep_receipt") return RECEIPT;
    if (pid === "rep_late" || pid === "rep_prov") return lateReceipt;
    return null;
  };
  ok(SA.state("rep_prov").tier === "link", "memo: a member with nothing loaded yet reads as 'link'");
  lateReceipt = { pid: "rep_prov", name: "Rep Prov", headline: "Arrived late", verdict: { key: "flag" } };
  ok(SA.state("rep_prov").tier === "receipt",
     "memo: a 'link' read BEFORE the record settled is provisional and re-read, never cached");

  lateReceipt = null;
  await SA.warm("rep_late");
  ok(SA.state("rep_late").tier === "link", "memo: a settled member with nothing on file reads as 'link'");
  lateReceipt = { pid: "rep_late", name: "Rep Late", headline: "Arrived late", verdict: { key: "flag" } };
  ok(SA.state("rep_late").tier === "link", "memo: that settled answer is cached, so guards are not re-run per keystroke");
  fire("pdx:data:acctSpotlight");
  ok(SA.state("rep_late").tier === "receipt",
     "memo: the cache is dropped when the on-demand curated feed arrives, so a late receipt is surfaced rather than denied");

  const h = mkBtn("rep_receipt", "link");
  calls.length = 0;
  h.btn.setAttribute("data-pdxsa-fallback", "copy");
  ctx.window._pdxCopyShareLink = () => calls.push(["copy"]);
  await SA.share("rep_nothing", h.btn);
  ok(calls.some((c) => c[0] === "copy") && !calls.some((c) => c[0] === "link"),
     "dispatch: a button already inside the share sheet copies the link instead of reopening the sheet it stands in");
}

// ── 5. The wiring — the four surfaces the affordance was built for ───────────
{
  const html = read("index.html");
  ok(/<script defer src="share-anywhere\.js"><\/script>/.test(html),
     "wiring: index.html loads share-anywhere.js");
  ok(html.indexOf('id="pdx-share-artifact"') !== -1,
     "wiring: the share sheet has an artifact row — the one row every compact card and the profile modal header inherit");
  ok(html.indexOf("share-anywhere.js") > html.indexOf("receipt-cards.js"),
     "wiring: the resolver loads after both pipelines it chooses between");

  const pf = read("profiles-full.js");
  ok(/pdx-share-artifact/.test(pf) && /PDXShareAnywhere/.test(pf),
     "wiring: pdxSharePolitician fills the artifact row, so the FULL PROFILE and every compact card reach the image share");
  ok(/hydrateSoon/.test(pf), "wiring: the artifact row is hydrated after it is painted");

  const eye = read("all-seeing-eye.js");
  ok(/function shareAct/.test(eye), "wiring: SEARCH RESULTS have a share action");
  ok(/id === 'share'/.test(eye), "wiring: the search share action is handled rather than declared and ignored");
  ok(/Share the record card/.test(eye) && /Share the receipt/.test(eye) && /Share profile link/.test(eye),
     "wiring: the search action names the artifact it will send, so its label is a promise the tap keeps");
  ok(/acts\.push\(shareAct\(e\.id, e\.issueKey \|\| ''\)\)/.test(eye),
     "wiring: a search RECEIPT row shares that row's issue, not some other issue of the same member");

  const cons = read("consistency.js");
  ok(/_saShareHtml/.test(cons) && /pdxgap-hshare/.test(cons),
     "wiring: the mobile compact profile sheet (the gap sheet) has a person-level share in its header");
  ok(/_saHydrateSoon\(\);/.test(cons), "wiring: the gap sheet hydrates that control on every open");
  ok(/_rcShareHtml\(pid, issueKey, \{ block: true \}\)/.test(cons),
     "wiring: the 🏛️ column keeps its own fail-closed, Official-Record-only button — the new control complements it rather than replacing it");

  const css = read("say-vs-do.css");
  ok(/@media \(hover: none\)/.test(css) && /\.svd-mini-share \{\s*\n?\s*opacity: 1;/.test(css.replace(/\r/g, "")),
     "wiring: the Say-vs-Do mini card's share button is fully visible on touch, where :hover never fires");
  ok(/\.pdxsa-hint \{[\s\S]*?min-height/.test(css),
     "wiring: the hint box reserves its height, which is what lets the fallback be stated in prose");
  ok(/\.pdxsa-share-btn \.pdxsa-ico \{[\s\S]*?width:/.test(css),
     "wiring: the icon slot has a fixed width in CSS, not only in the markup's intent");

  const svd = read("say-vs-do.js");
  ok(/anchored/.test(svd) && /btn && btn\.getBoundingClientRect/.test(svd),
     "wiring: the desktop destination menu tolerates having no anchor, so a surface that closes itself before sharing does not throw");

  const sw = read("sw.js");
  ok(/'\/share-anywhere\.js'/.test(sw), "wiring: the service worker precaches the resolver");
  // A floor, not a pin: the point is that the shell version moved past the
  // release that added this asset, so it actually ships. Pinning the exact
  // version makes every later, unrelated bump fail here for no reason.
  const swv = sw.match(/CACHE_VERSION\s*=\s*['"]v(\d+)['"]/);
  ok(swv && Number(swv[1]) >= 40,
     `wiring: the shell version is bumped so the new asset actually ships (found ${swv ? "v" + swv[1] : "none"})`);
}

  // ── report ─────────────────────────────────────────────────────────────────
  if (failures.length) {
    console.error("\n✗ share anywhere: " + failures.length + " failure(s)\n");
    failures.forEach((f) => console.error("  · " + f));
    console.error("");
    process.exit(1);
  }
  console.log("✓ share anywhere: all " + passed + " assertions passed");
};

run().catch((e) => { console.error(e); process.exit(1); });
