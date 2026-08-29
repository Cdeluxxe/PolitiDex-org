#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-locker-door.mjs — the Evidence Locker is a door on the homepage, not a
// workspace on the homepage
// ─────────────────────────────────────────────────────────────────────────────
// The locker is a four-view workspace: a sticky quick-jump map, a filter toolbar,
// a discovery showcase, a featured rail and a grid of every receipt on file. All
// of it used to be mounted, open, on every visit to `/` — thousands of pixels of
// somebody else's research cockpit, laid out and painted for a reader who never
// asked for it. What ships on the front page now is a closed door and one line.
//
//   PHASE 0 — the homepage ships a door. The workspace markup is inside
//             <template id="el-workspace-tpl">, which is parsed into an inert
//             fragment outside the document tree: zero height, zero paint. Not
//             one id moved, so every inbound deep link still resolves.
//   PHASE 1 — the count fails closed. The door's one line ships [hidden] with no
//             number in it, and only ever prints a figure the page can actually
//             count from the receipts it holds.
//   PHASE 2 — a cold `/` mounts nothing; /locker, #evidence-locker and the door's
//             own control all mount the same workspace.
//   PHASE 3 — the workspace is a workspace: search, person, issue AND bill
//             number, and a receipt that names a measure opens THE bill object
//             (PDXBillDetail) rather than a locker-shaped copy of one.
//   PHASE 4 — the fence. No roll call is copied into the locker, and the door
//             changed no evidence, no count, no strength grade and no mapping.
//
//   node scripts/test-locker-door.mjs
//
// Real shipped files: index.html and netlify.toml are read as text, and
// evidence-locker.js runs in a node:vm sandbox against a DOM small enough to see
// exactly what it touches — which is the only way to prove a NEGATIVE about first
// paint ("the section was never appended to").

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const HTML = R("index.html");
const EL = R("evidence-locker.js");
const TOML = R("netlify.toml");
const CSS = R("app-2.css");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const must = (cond, msg) => {
  if (!cond) { console.error(`\n✗ locker door — PRECONDITION FAILED: ${msg}\n`); process.exit(1); }
  passed++;
};

// ── The section, and where the workspace lives inside it ─────────────────────
const secStart = HTML.indexOf('<section id="evidence-locker"');
must(secStart > 0, "index.html has no #evidence-locker section at all");
const tplStart = HTML.indexOf('<template id="el-workspace-tpl">', secStart);
const tplEnd = HTML.indexOf("</template>", tplStart);
const secEnd = HTML.indexOf("</section>", tplEnd > 0 ? tplEnd : secStart);
must(tplStart > 0, "the locker workspace is not inside a <template> — it is still in the render tree");
must(tplEnd > tplStart && secEnd > tplEnd, "the workspace <template> is unterminated inside the section");

const SECTION = HTML.slice(secStart, secEnd);
const TEMPLATE = HTML.slice(tplStart, tplEnd);        // inert: not in the render tree
const FIRST_PAINT = HTML.slice(secStart, tplStart);   // everything the section paints cold

// ═══════════════ PHASE 0 · the homepage ships a door ═════════════════════════
{
  ok(/<section id="evidence-locker" class="el-closed/.test(HTML),
    "the section does not ship closed (no el-closed class) — the shell would paint before JS runs");
  ok(/id="el-door"/.test(FIRST_PAINT), "there is no door in the section's first paint");
  ok(/id="el-door-open"/.test(FIRST_PAINT), "the door has no control to open it");

  // The whole workspace, id by id, must be on the inert side of the template
  // boundary. These are the elements that carry the locker's height.
  const WORKSPACE_IDS = [
    "el-shell", "el-jump", "el-toolbar", "el-results", "el-quickcats", "el-showcase",
    "el-featured", "el-recent", "el-types", "el-status", "el-empty", "el-count",
    "el-modal-overlay", "el-f-search", "el-f-category", "el-f-issue", "el-f-pol",
    "el-f-sort", "el-reset",
  ];
  for (const id of WORKSPACE_IDS) {
    const needle = id === "el-shell" ? 'class="el-shell"' : `id="${id}"`;
    ok(TEMPLATE.indexOf(needle) >= 0, `#${id} is not inside the workspace template`);
    ok(FIRST_PAINT.indexOf(needle) < 0, `#${id} still paints on a cold homepage — the locker did not leave the stack`);
  }

  // Cold `/` renders no cards, and no container that could hold one. (The grid is
  // filled by _render() into #el-results, which is itself inside the template.)
  ok(FIRST_PAINT.indexOf("el-card") < 0, "a locker card class appears in the section's first paint");
  ok(FIRST_PAINT.indexOf("el-grid") < 0, "the results grid appears in the section's first paint");

  // Exactly one template element, and it is this one — a second would mean a
  // second copy of the workspace, which is the thing we just removed.
  const tplIds = [...HTML.matchAll(/<template\b[^>]*\bid="([^"]*)"/g)].map((m) => m[1]);
  eq(tplIds.join(","), "el-workspace-tpl", "index.html carries a <template> that is not the locker workspace");
  eq((HTML.match(/<\/template>/g) || []).length, 1, "index.html closes more than one <template>");

  // The address did not change. Every inbound link in the page still points at
  // #evidence-locker, which is why nothing else needed editing.
  ok((HTML.match(/href="#evidence-locker"/g) || []).length >= 4,
    "the in-page links to #evidence-locker are gone — inbound addresses were rewritten instead of kept");

  // …and /locker is served, not redirected.
  ok(/from = "\/locker"/.test(TOML) && /from = "\/locker\/\*"/.test(TOML),
    "netlify.toml has no /locker rewrite — a direct hit on the path would 404");
  const lockerRule = TOML.slice(TOML.indexOf('from = "/locker"'));
  ok(/to = "\/index\.html"/.test(lockerRule.slice(0, 120)) && /status = 200/.test(lockerRule.slice(0, 160)),
    "/locker does not serve index.html with status 200");
}

// ═══════════════ PHASE 1 · the count fails closed ════════════════════════════
{
  const line = /<p class="el-door-count" id="el-door-count"([^>]*)>([\s\S]*?)<\/p>/.exec(FIRST_PAINT);
  must(line, "the door has no one-line count element");
  ok(/\bhidden\b/.test(line[1]), "the door's count line does not ship hidden — an empty line would paint");
  eq(line[2].trim(), "", "the door's count line ships with content in it — a number no one has counted yet");
  ok(!/receipts on file/.test(FIRST_PAINT),
    "the phrase 'receipts on file' is hard-coded into the markup rather than being written from a real count");

  // The count is computed from the receipts the page holds, with the same
  // headline de-duplication the library build uses — not from a stored figure.
  ok(/function _countOnFile\(\)/.test(EL), "there is no _countOnFile() — the door's number has no source");
  const countFn = EL.slice(EL.indexOf("function _countOnFile()"), EL.indexOf("var _doorTries"));
  ok(/_roster\(\)/.test(countFn) && /SPOTLIGHT_DATA/.test(countFn) && /rec\.spotlight/.test(countFn),
    "_countOnFile() does not count the same sources the library is built from");
  ok(/seen\[hk\]/.test(countFn), "_countOnFile() skips the per-member headline de-duplication _build() applies");
  ok(/localStorage|sessionStorage|fetch\(/.test(countFn) === false,
    "_countOnFile() reads a stored or fetched figure instead of counting what the page holds");
  const paintFn = EL.slice(EL.indexOf("function _paintDoorCount()"), EL.indexOf("function _wireDoor()"));
  ok(/if \(!n\) \{/.test(paintFn) && /line\.hidden = false;/.test(paintFn),
    "_paintDoorCount() does not keep the line hidden when it has nothing to count");
  ok(/_items \? _items\.length/.test(paintFn),
    "the built library is not authoritative for the door's number once it exists");
}

// ═══════════════ The sandbox · a DOM small enough to see what is touched ═════
// getElementById answers for the door's own elements and for the template, and
// null for everything else — which is exactly the shape of a page whose workspace
// has not been mounted. Every append onto the section is recorded, so "nothing
// mounted" is an assertion rather than an absence of evidence.
function makeDom(opts) {
  opts = opts || {};
  const listeners = { document: {}, window: {} };
  const appended = [];
  const el = (id, extra) => Object.assign({
    id, hidden: false, innerHTML: "", value: "", style: {}, className: "",
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    getAttribute() { return null; }, setAttribute() {},
    addEventListener(t, fn) { (this.__l || (this.__l = {}))[t] = fn; },
    removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    appendChild() {}, scrollIntoView() {}, focus() {}, click() {},
  }, extra || {});

  const section = el("evidence-locker", {
    appendChild(node) { appended.push(node); },
    scrollIntoView() { this.__scrolled = true; },
  });
  const template = el("el-workspace-tpl", {
    content: { cloneNode() { return { __clonedWorkspace: true }; } },
  });
  const door = el("el-door");
  const count = el("el-door-count", { hidden: true });
  const open = el("el-door-open");
  const nodes = {
    "evidence-locker": section, "el-workspace-tpl": template,
    "el-door": door, "el-door-count": count, "el-door-open": open,
  };

  const document = {
    readyState: "complete", cookie: "",
    getElementById(id) { return nodes[id] || null; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    createElement() { return el("created"); },
    addEventListener(t, fn) { (listeners.document[t] || (listeners.document[t] = [])).push(fn); },
    removeEventListener() {},
    dispatchEvent(e) {
      (listeners.document[e && e.type] || []).forEach((fn) => { try { fn(e); } catch (_) {} });
      return true;
    },
    head: el("head"), body: el("body"), documentElement: el("html"),
  };
  const win = {
    document,
    addEventListener(t, fn) { (listeners.window[t] || (listeners.window[t] = [])).push(fn); },
    removeEventListener() {},
    // Immediate timers so the module's own boot fallback runs synchronously. The
    // retry loops it can reach are all bounded by their own counters.
    setTimeout(fn) { try { fn(); } catch (_) {} return 0; }, clearTimeout() {},
    setInterval() { return 0; }, clearInterval() {},
    requestAnimationFrame() { return 0; }, cancelAnimationFrame() {},
    requestIdleCallback() { return 0; },
    matchMedia() { return { matches: false, addEventListener() {}, addListener() {} }; },
    getComputedStyle() { return { getPropertyValue() { return ""; } }; },
    location: {
      href: "https://politidex.fyi" + (opts.pathname || "/"),
      pathname: opts.pathname || "/", search: "", hash: opts.hash || "",
      origin: "https://politidex.fyi",
    },
    history: { replaceState() {}, pushState() {} },
    navigator: { userAgent: "node" },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    fetch() { return Promise.reject(new Error("test-locker-door: no network")); },
    console: { log() {}, warn() {}, error() {}, info() {} },
    CustomEvent: class { constructor(t, o) { this.type = t; Object.assign(this, o || {}); } },
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
  };
  win.window = win; win.self = win;
  win.__t = { appended, listeners, nodes };
  return win;
}

function boot(opts) {
  const win = makeDom(opts);
  const ctx = vm.createContext(win);
  if (opts && opts.data) {
    for (const f of ["cmp-data.js", "spotlight-cards-data.js"]) {
      vm.runInContext(R(f), ctx, { filename: f });
    }
    win.PROFILES = win.CMP_DATA;
  }
  vm.runInContext(EL, ctx, { filename: "evidence-locker.js" });
  return win;
}

// ═══════════════ PHASE 2 · what opens the locker ═════════════════════════════
{
  // ── Cold `/`: the workspace is never mounted ──────────────────────────────
  const cold = boot({ pathname: "/", data: true });
  ok(cold.PDXEvidenceLocker && typeof cold.PDXEvidenceLocker.open === "function",
    "the locker exposes no opener — the door's control would have nothing to call");
  eq(cold.__t.appended.length, 0,
    "the workspace was mounted on a cold homepage — the cards are back on first paint");
  eq(cold.__t.nodes["el-door"].hidden, false, "the door hid itself on a cold homepage");
  eq(cold.PDXEvidenceLocker.mounted(), false, "the locker reports itself mounted on a cold homepage");

  // …and the door still carries a real number, off data that is already in the
  // page. This is the honest floor: no network, no workspace, no promise.
  const n = cold.PDXEvidenceLocker.count();
  ok(n > 0, "the door counted nothing against the shipped evidence data — the line would never appear");
  eq(cold.__t.nodes["el-door-count"].hidden, false,
    "the door's count line stayed hidden even though there was a real number to print");
  ok(/receipts? on file/.test(cold.__t.nodes["el-door-count"].innerHTML),
    "the door's count line does not say how many receipts are on file");
  ok(new RegExp(">" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "<")
      .test(cold.__t.nodes["el-door-count"].innerHTML),
    "the number printed on the door is not the number the page counted");

  // ── The door's own control ────────────────────────────────────────────────
  const clicked = boot({ pathname: "/", data: true });
  const ctrl = clicked.__t.nodes["el-door-open"];
  must(ctrl.__l && typeof ctrl.__l.click === "function", "the door's control has no click handler");
  let defaultPrevented = false;
  ctrl.__l.click({ preventDefault() { defaultPrevented = true; }, button: 0 });
  ok(defaultPrevented, "the door's control navigated away instead of opening the locker in place");
  eq(clicked.__t.appended.length, 1, "clicking the door did not mount the workspace");
  ok(clicked.__t.appended[0].__clonedWorkspace,
    "clicking the door appended something other than a clone of the workspace template");
  eq(clicked.__t.nodes["el-door"].hidden, true, "the door is still showing over the open workspace");
  eq(clicked.PDXEvidenceLocker.mounted(), true, "the locker does not report itself mounted after the door opened");
  eq(clicked.location.hash, "#evidence-locker",
    "opening the door left no address behind — a reload would land on the closed door");

  // A modified click is a real link to /locker, and must be left alone.
  const midClick = boot({ pathname: "/", data: true });
  let prevented2 = false;
  midClick.__t.nodes["el-door-open"].__l.click({ preventDefault() { prevented2 = true; }, metaKey: true });
  ok(!prevented2 && midClick.__t.appended.length === 0,
    "a command-click on the door was hijacked instead of opening /locker in a new tab");
  ok(/href="\/locker"/.test(FIRST_PAINT),
    "the door's control is not a real link to /locker — it would not survive a middle-click or a copy-link");

  // ── The path ──────────────────────────────────────────────────────────────
  const direct = boot({ pathname: "/locker", data: true });
  eq(direct.__t.appended.length, 1, "a direct hit on /locker did not mount the workspace");
  eq(direct.PDXEvidenceLocker.mounted(), true, "/locker did not open the locker");
  const trailing = boot({ pathname: "/locker/", data: true });
  eq(trailing.PDXEvidenceLocker.mounted(), true, "/locker/ (trailing slash) did not open the locker");

  // ── The hash, cold and live ───────────────────────────────────────────────
  const hashCold = boot({ pathname: "/", hash: "#evidence-locker", data: true });
  eq(hashCold.__t.appended.length, 1, "a shared #evidence-locker link did not mount the workspace");
  const live = boot({ pathname: "/", data: true });
  eq(live.__t.appended.length, 0, "precondition: the live-hash case started out mounted");
  const hashHandlers = live.__t.listeners.window.hashchange || [];
  must(hashHandlers.length > 0, "nothing listens for hashchange — an in-page nav link would open nothing");
  live.location.hash = "#evidence-locker";
  hashHandlers.forEach((fn) => fn({ type: "hashchange" }));
  eq(live.__t.appended.length, 1, "navigating to #evidence-locker in-page did not mount the workspace");

  // Every existing deep-link into the locker (a profile's "see all evidence", an
  // issue chip, a saved-team browse) goes through one opener, which mounts first.
  const deep = boot({ pathname: "/", data: true });
  deep._pdxOpenEvidenceLocker({ issue: "water_drought" });
  eq(deep.PDXEvidenceLocker.mounted(), true,
    "a filtered deep-link into the locker did not open the door — the filter would apply to nothing");

  // Mounting is idempotent: a second request must not clone the workspace twice.
  const twice = boot({ pathname: "/locker", data: true });
  twice.PDXEvidenceLocker.open();
  twice.PDXEvidenceLocker.open();
  eq(twice.__t.appended.length, 1, "the workspace was mounted more than once");

  // A page with no template (an older cached shell) must fail closed, not throw.
  const noTpl = makeDom({ pathname: "/locker" });
  delete noTpl.__t.nodes["el-workspace-tpl"];
  const ctx2 = vm.createContext(noTpl);
  vm.runInContext(EL, ctx2, { filename: "evidence-locker.js" });
  eq(noTpl.PDXEvidenceLocker.mounted(), false, "the locker reported a mount with no template to mount");
  eq(noTpl.__t.appended.length, 0, "something was appended to the section with no template present");

  // The surfaces that hang off the workspace markup are told when it arrives.
  ok(/pdx:locker:mounted/.test(EL), "the mount fires no event — the quick-jump bar and density switch could not wire");
  ok((HTML.match(/pdx:locker:mounted/g) || []).length >= 2,
    "index.html's workspace-dependent scripts do not listen for the mount");
  ok(/document\.addEventListener\('pdx:locker:mounted', setup\)/.test(HTML),
    "the quick-jump nav is not wired on mount — window.rebuildEvidenceNav would stay undefined");
}

// ═══════════════ PHASE 3 · the workspace, and the bill number ════════════════
{
  // The filter row: search + person + issue were already there; the bill number
  // is the one this run adds, and it is typed rather than picked.
  ok(/id="el-f-bill"/.test(TEMPLATE), "there is no bill-number filter in the toolbar");
  ok(/for="el-f-bill">Bill number</.test(TEMPLATE), "the bill-number filter has no label");
  ok(/\.el-field \.el-f-text/.test(CSS), "the bill-number input is unstyled — it would not match the row it sits in");

  ok(/_state\.bill/.test(EL), "the bill filter is not part of the locker's filter state");
  const matches = EL.slice(EL.indexOf("function _matches(it)"), EL.indexOf("// Numeric rank for the strength sort"));
  ok(/if \(_state\.bill\)/.test(matches), "_matches() ignores the bill filter");
  ok(/_billKey\(_state\.bill\)/.test(matches), "the bill filter is matched raw rather than through the shared key");
  ok(/b\.key\.indexOf\(bq\)/.test(matches), "the bill filter does not match a partial number");
  ok(/b\.ref; \}\)\.join\(' '\)/.test(matches), "bill numbers are not searchable from the main search box");

  // ── The helpers, against real text ────────────────────────────────────────
  const helpers = EL.slice(EL.indexOf("var _EL_BILL_PRINT"), EL.indexOf("function _billDoorHtml"));
  must(helpers.length > 200, "could not extract the bill-number helpers from evidence-locker.js");
  const bag = { _esc: (s) => String(s) };
  vm.runInNewContext(helpers + "\n;this.refs=_billRefs;this.key=_billKey;", bag);
  const { refs, key } = bag;

  const one = (t) => (refs(t)[0] || {}).ref;
  eq(one("She carried H.B. 461 to the floor"), "H.B. 461", "a dotted Utah bill number is not read");
  eq(one("voted against HB0461 in committee"), "H.B. 461", "the legislature's own HB0461 form is not read");
  eq(one("sponsored HB 461"), "H.B. 461", "an undotted, spaced bill number is not read");
  eq(one("opposed S.B. 186"), "S.B. 186", "a senate bill number is not read");
  eq(one("voted for H.R. 1"), "H.R. 1", "a federal house bill number is not read");
  eq(one("voted against S. 2938"), "S. 2938", "a federal senate bill number is not read");
  eq(one("backed H.J.R. 12"), "H.J.R. 12", "a joint resolution number is not read");

  // Same bill, three spellings, one key — that is what makes the filter work.
  eq(key("H.B. 461"), key("HB0461"), "HB0461 and H.B. 461 do not share a filter key");
  eq(key("H.B. 461"), key("hb 461"), "a lowercase, spaced number does not share a filter key");
  ok(key("H.B. 461").indexOf("461") >= 0, "a reader who types just the digits could not find the bill");
  ok(key("H.B. 4") === "hb4" && key("HB0004") === "hb4", "leading zeros are not normalized away");

  // Things that are not bills.
  eq(refs("drove U.S. 89 through Kanab").length, 0, "a highway number was read as a Senate bill");
  eq(refs("cited 42 U.S.C. 1983 in the filing").length, 0, "a statute citation was read as a Senate bill");
  eq(refs("won by 461 votes").length, 0, "a bare number was read as a bill");
  eq(refs("").length, 0, "empty text produced a bill reference");

  // De-duplicated, and stable.
  eq(refs("H.B. 461 and HB0461 and hb 461").length, 1, "the same bill was read three times");
  eq(refs("H.B. 461 and S.B. 186").length, 2, "two distinct bills in one receipt were not both read");

  // ── Against the shipped library, not a fixture ────────────────────────────
  const live = boot({ pathname: "/", data: true });
  let named = 0, sample = null;
  const scan = (list) => {
    (list || []).forEach((it) => {
      if (!it || !it.headline) return;
      const hits = refs(it.headline + " . " + (it.facts || ""));
      if (hits.length) { named++; sample = sample || hits[0].ref; }
    });
  };
  Object.keys(live.SPOTLIGHT_DATA || {}).forEach((pid) => scan(live.SPOTLIGHT_DATA[pid]));
  Object.keys(live.CMP_DATA || {}).forEach((pid) => scan((live.CMP_DATA[pid] || {}).spotlight));
  ok(named > 0,
    "no receipt in the shipped library names a bill number — the filter and the bill door are dead code");
  ok(/^[A-Z]/.test(String(sample || "")), `the first real bill number read out of the library is malformed: ${sample}`);

  // ── The bill door: one bill object, not a fourth one ──────────────────────
  ok(/function _billDoorHtml\(/.test(EL), "receipts have no door to the measure they name");
  const doorFn = EL.slice(EL.indexOf("function _billDoorHtml("), EL.indexOf("    function _build()"));
  ok(/data-el-bill=/.test(doorFn), "the bill door carries no bill number");
  ok(!/href=/.test(doorFn), "the bill door hard-codes an address instead of asking the bill panel to resolve one");
  ok(/_billDoorHtml\(it\)/.test(EL), "the bill door is never rendered on a card");
  ok(/el-modal-bills/.test(EL), "the bill door is missing from the receipt's own detail view");
  ok(/PDXBillDetail/.test(EL) && /B\.open\(ref, ''\)/.test(EL),
    "the bill door does not hand the number to PDXBillDetail — the app would have two bill surfaces");
  ok(/PDXBills\.open\(ref\)/.test(EL), "the bill door goes dead when the detail panel is absent");
  ok(/\.el-billdoor/.test(CSS), "the bill door is unstyled");

  // The locker must not grow its own bill renderer.
  ok(!/measures|rollcalls|voteDate|externalIds/.test(doorFn),
    "the bill door reaches into measure data — the bill object is being rebuilt inside the locker");

  // A row tap still opens the three things it always opened: the receipt, the
  // person, and now the measure. No fourth object.
  ok(/_openModalItem\(_itemsByUid\[card\.getAttribute\('data-uid'\)\]\)/.test(EL),
    "tapping a row no longer opens the receipt");
  ok(/showProfile\(/.test(EL), "a receipt no longer opens the person it belongs to");
}

// ═══════════════ PHASE 4 · the fence ═════════════════════════════════════════
{
  // Formal roll calls are not copied into the locker. The library is built from
  // curated spotlight evidence and nothing else — no roll list, no vote row, no
  // voting-record read anywhere in the file.
  const build = EL.slice(EL.indexOf("    function _build()"), EL.indexOf("    // ── Dev / curator Triage Workflow"));
  must(build.length > 1000, "could not extract _build() — the ingestion assertion would be vacuous");
  ok(/rec\.spotlight/.test(build) && /SD\[id\]/.test(build),
    "_build() no longer reads the curated spotlight evidence");
  for (const forbidden of ["PDXVotingRecord", "rollcall", "rollCall", "voting-record", "voteDate", "ACCT_SPOTLIGHT"]) {
    ok(build.indexOf(forbidden) < 0, `_build() reads ${forbidden} — formal record is being copied into the locker`);
    ok(EL.indexOf(forbidden) < 0, `evidence-locker.js references ${forbidden} — the locker is ingesting formal record`);
  }
  ok(!/\/api\//.test(EL), "the locker fetches an API — the library is built from data already in the page");

  // The things this run was told not to touch.
  ok(!/DirectionMatch|_pdxDirectionMatch|direction_match/.test(EL),
    "the locker now reaches into Direction Match");
  // (The money theme's own surfaces, by name. "campaign finance" is an ISSUE_MAP
  // keyword and has been in this file's issue vocabulary all along.)
  for (const money of ["finance-lane", "PDXFinance", "_pdxFinance", "itemized", "small-dollar", "letterheadChipMount"]) {
    ok(EL.indexOf(money) < 0, `the locker now reaches into the money theme (${money})`);
  }
  ok(/window\._pdxCategoryOf|_issueMap\(\)/.test(EL),
    "the locker stopped reading the shared issue mapping — mappings were reimplemented instead of reused");

  // The data-only consumers of the evidence index keep working with no workspace
  // mounted: the index is still warmed in the background on a cold homepage.
  for (const api of [
    "_pdxEvidenceOnRecord", "_pdxEvidenceCountForPeople", "_pdxEvidenceIssueKeysForPerson",
    "_pdxEvidenceDepthForPerson", "_pdxEvidenceDepthPill", "_pdxEvidenceInferredStancesForPerson",
  ]) {
    ok(new RegExp("window\\." + api + " = ").test(EL), `${api} is gone — a surface elsewhere on the page reads it`);
  }
  const init = EL.slice(EL.indexOf("    function _init() {"), EL.indexOf("    // Primary path: runs after"));
  ok(/requestIdleCallback\(_kick/.test(init),
    "the closed door no longer warms the evidence index — the on-record counts and depth pills would go quiet");
  ok(/_wireDoor\(\);/.test(init) && /_wireRoutes\(\);/.test(init),
    "_init() does not wire the door and its routes");
  ok(!/_wireModal\(\);/.test(init),
    "_init() still wires the workspace at boot — the wiring belongs to the mount");
}

// ── Result ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ locker door — ${failures.length} of ${passed + failures.length} assertions failed:\n`);
  failures.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
console.log(`\n✓ locker door — ${passed} assertions passed\n`);
