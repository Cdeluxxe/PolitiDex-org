#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-door-one-workspace.mjs — Door 1 is one desk, not four products
// ─────────────────────────────────────────────────────────────────────────────
// test-door-one-entry.mjs guards Door 1's NAVIGATION: five doors, four surfaces
// demoted rather than deleted, no stranded anchors. This file guards Door 1's
// WORK — that the four surfaces those doors open are now one continuous loop
// (claim → person → issue → measure → receipt) on one desk, and that making them
// one desk did not let a single reading, ranking or verdict into the chrome.
//
// What it pins:
//
//   1. ONE DESK, WHERE DOOR 1 ALREADY STARTS. The mount sits between the proof
//      strip and the work layer, inside the same region the chooser opens; the
//      stylesheet and script are wired and deferred; both are precached, as a
//      pair, behind a CACHE_VERSION that moved.
//   2. FOUR MODES, ONE OPEN. The rail carries exactly the four ways in, the desk
//      carries exactly one of them, and opening one closes the others.
//   3. WORK_IDS STILL ROUTE. Every one of the four deep-linkable surfaces still
//      opens through the shipped router, and now also selects the desk mode it
//      belongs to — without a fifth door and without touching the router.
//   4. NO STRANDED PRODUCTS. Each of those four surfaces says it is a view of
//      the desk, carries the way back, and says it only once.
//   5. THE HONEST EMPTIES ARE QUOTED, NOT WRITTEN. The claim miss is the locked
//      sentence; the measure refusal is bill-detail's own literal; the empty
//      issue is the floor's own no-vehicle sentence. "No pattern" appears nowhere.
//   6. NO PARTY, NO FIGURE, NO FLOOR MOVED. Not one party token or percentage in
//      the module; the people list is ordered by the formal record and not by
//      buildRanking's own value or by any match reading; the publication floor,
//      the share path and the slice sentence are untouched.
//   7. A MISS DOES NOT INVENT A VOTE. On no-record the desk offers the person's
//      file and nothing else — no measure, no roll call, no issue verdict.
//   8. ONE FOOTER CONTROL, AND IT IS NOT A METER. "Next in Door 1" advances to a
//      mode and states no quantity.
//   9. TWIN BOOT. With the desk loaded and without it, every formal brief and
//      every Direction Match read is byte-identical — the desk wraps four
//      shipped globals and must not perturb what any of them return.
//
//   node scripts/test-door-one-workspace.mjs
//
// Real shipped modules in a node:vm sandbox, the real roster, the real issue
// ledger and the real measure index, plus a mini-DOM — every claim about painted
// markup below is about markup this harness actually painted.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// The record modules, in load order. Everything the desk reads a fact from is
// here, because a desk assertion made against an unloaded module is an assertion
// about this file's own fallback copy.
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
  "consistency.js",
  "voting-record.js",
  "inventory.js",
  "issue-scope.js",
  "word-action.js",
  "profile-spine.js",
  "issue-colors.js",
  "my-stances.js",
  "person-link.js",
  "bills-index.js",
  "bills.js",
  "bill-detail.js",
  "claim-check.js",
  "issue-view.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
const DESK = R("door1-workspace.js");
const HTML = R("index.html");
const CSS = R("door1-workspace.css");
const SW = R("sw.js");
const BILLDETAIL = R("bill-detail.js");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const no = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
// A probe that finds nothing fails loudly. Otherwise a rename turns this whole
// file into a very fast, very green no-op.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ door one workspace: STALE PROBE — ${msg}`);
  process.exit(2);
};

const corpus = buildCorpus(ROOT);
must(corpus && corpus.byMember && corpus.byMember.size > 100,
  "the record corpus did not load enough members to sweep");

// ── A mini-DOM ───────────────────────────────────────────────────────────────
// The desk paints into #pdx-d1-body and nowhere else, and its view chrome
// inserts one slot into each of the four surfaces. Both need real id lookups,
// so the registry pre-creates every id the document carries.
const SURFACES = ["hero-receipt", "say-vs-do", "issue-front-door", "hr1-showcase"];

function miniDom(win) {
  const byId = {};
  const mk = (id) => {
    const node = {
      id: id || "", className: "", innerHTML: "", textContent: "",
      style: {}, dataset: {}, children: [], hidden: false, attrs: {},
      firstChild: null,
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { this.children.push(c); c.parentNode = this; if (c && c.id) byId[c.id] = c; return c; },
      insertBefore(c) { this.children.unshift(c); c.parentNode = this; if (c && c.id) byId[c.id] = c; return c; },
      removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, click() {},
      scrollIntoView() {}, querySelector() { return null; }, querySelectorAll() { return []; },
    };
    if (id) byId[id] = node;
    return node;
  };
  win.document.createElement = () => mk("");
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = mk("body");
  win.document.body.appendChild = function (c) { if (c && c.id) byId[c.id] = c; return c; };
  mk("pdx-eye-input");
  SURFACES.forEach(mk);
  win.__mk = mk;
  return byId;
}

function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const sess = opts.session || {};
  win.sessionStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(sess, k) ? sess[k] : null),
    setItem: (k, v) => { sess[k] = String(v); },
    removeItem: (k) => { delete sess[k]; },
  };
  win.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  win.auth = { currentUser: null };
  win.addEventListener = () => {};
  const byId = miniDom(win);
  // The mount, unless this boot is testing a page that does not carry one.
  if (!opts.noMount) { win.__mk("pdx-door1-workspace"); win.__mk("pdx-d1-body"); }
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  win.__loadErrors = [];
  for (const [f, src] of SRC) {
    try { vm.runInContext(src, ctx, { filename: f }); }
    catch (e) { win.__loadErrors.push(`${f}: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
  // The record corpus, seeded the way a completed /api/voting-record fetch
  // leaves it — so every count the desk prints is a count over real rows.
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  // The router the desk hooks. index.html owns the real one; these are the two
  // entry points it exposes, recorded so the wrapper can be observed.
  win.__routed = [];
  win.pdxDoorWork = (id) => { win.__routed.push("work:" + id); return true; };
  win.pdxDoor = (mode) => { win.__routed.push("door:" + mode); return true; };
  if (!opts.withoutDesk) vm.runInContext(DESK, ctx, { filename: "door1-workspace.js" });
  win.__session = sess;
  win.__byId = byId;
  return win;
}

const paint = (w) => {
  w.PDXDoor1.sync();
  const h = w.document.getElementById("pdx-d1-body");
  return h ? String(h.innerHTML) : "";
};
const stripOf = (w, id) => {
  const s = w.document.getElementById("d1-strip-" + id);
  return s ? String(s.innerHTML) : "";
};

const probe = boot();
must(probe.PDXDoor1 && typeof probe.PDXDoor1.sync === "function",
  `the desk did not export sync() — boot errors: ${probe.__loadErrors.join(" | ")}`);
must(typeof probe.pdxDoor1Open === "function", "pdxDoor1Open is not exposed");
must(probe.PDXIssueView && typeof probe.PDXIssueView.buildRanking === "function",
  "the issue ledger is not available to the desk");
must(probe.PDXConsistency && probe.PDXConsistency.menu && probe.PDXConsistency.menu.PHRASES,
  "the floor's own empty-lane vocabulary is not published any more");
must(Array.isArray(probe.CORE_NATIONAL_ISSUES) && probe.CORE_NATIONAL_ISSUES.length > 5,
  "the core issue set is not loaded");
must(probe.PDXDoor1._measures().length > 5,
  `the measure index did not load (${probe.PDXDoor1._measures().length} rows)`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · One desk, mounted where Door 1 already starts, shipped whole");

{
  const iBridge = HTML.indexOf('id="pdx-door-truth"');
  const iModes = HTML.indexOf('id="pdx-door-modes"');
  const iProof = HTML.indexOf('id="live-proof"');
  const iDesk = HTML.indexOf('id="pdx-door1-workspace"');
  const iWork = HTML.indexOf('id="pdx-door-work"');
  ok(iDesk > 0, "the desk has no mount in the document");
  ok(iBridge > 0 && iDesk > iBridge, "the desk sits above the Door 1 bridge that introduces it");
  ok(iModes > 0 && iDesk > iModes,
    "the desk sits above the chooser. The chooser is still Door 1's navigation and the desk is\n" +
    "    what it opens into — inverted, the reader meets a working surface before being told what\n" +
    "    the four ways in are");
  ok(iProof > 0 && iDesk > iProof, "the desk pushed the proof strip below it");
  ok(iWork > 0 && iDesk < iWork,
    "the desk is not above the work layer. The four surfaces are views OF it, and a view that\n" +
    "    precedes the thing it is a view of is just a fifth product with a label");
  has(HTML, 'id="pdx-d1-body"', "the desk body mount is missing");
  // A section, not a nav item: the brief forbids a fifth door.
  ok(/<section id="pdx-door1-workspace" hidden>/.test(HTML),
    "the desk mount is not a static [hidden] section — it must exist before its deferred script\n" +
    "    lands, and stay closed until the script finds a surface to work with");

  has(HTML, 'href="/door1-workspace.css"', "the desk stylesheet is not linked");
  ok(/<script defer src="\/door1-workspace\.js"><\/script>/.test(HTML),
    "the desk script is not loaded with defer, like every other module on this page");
  // It reads these four. Loading first would mean a first paint against four
  // absent modules, i.e. four honest-empty lines on a page that has the data.
  for (const dep of ["claim-check.js", "issue-view.js", "bill-detail.js", "person-link.js"]) {
    ok(HTML.indexOf(`src="/${dep}"`) < HTML.indexOf('src="/door1-workspace.js"'),
      `the desk loads before ${dep}, which owns facts it prints`);
  }
  // sw.js's own precache comment warns against splitting a feature's JS from its
  // CSS. Both, behind a version that moved, or a returning device paints the
  // two-region desk as one unstyled column.
  has(SW, "'/door1-workspace.js'", "the desk script is not precached");
  has(SW, "'/door1-workspace.css'", "the desk stylesheet is not precached");
  const ver = /const CACHE_VERSION = 'v(\d+)';/.exec(SW);
  ok(ver && Number(ver[1]) >= 105,
    `CACHE_VERSION did not move past v104 for the new pair (found ${ver ? ver[0] : "nothing"})`);
  has(SW, "// v105 - ", "the version bump carries no log entry saying which files moved and why");

  // Two regions, and the stylesheet is what makes them two.
  has(CSS, ".d1-rail", "the stylesheet has no rail");
  has(CSS, ".d1-desk", "the stylesheet has no desk");
  ok(/#pdx-door1-workspace\[hidden\]/.test(CSS),
    "the stylesheet does not honour the mount's [hidden] state, so a closed desk still paints");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · Four modes on the rail, exactly one on the desk");

{
  const w = boot();
  const MODES = w.PDXDoor1.MODES.map((m) => m.key);
  eq(MODES.join(" "), "claim person issue measure",
    "the rail no longer carries exactly the four ways in, in loop order");
  const html = paint(w);
  has(html, "d1-rail", "the desk paints no rail");
  eq((html.match(/class="d1-mode[ "]/g) || []).length, 4,
    "the rail does not carry exactly four mode buttons");
  // One desk. Not four stacked panels with three of them collapsed.
  eq((html.match(/data-d1-mode="/g) || []).length, 1,
    "the desk painted more than one mode at once — which is the stack this feature replaces");
  eq((html.match(/aria-current="true"/g) || []).length, 1,
    "the rail marks more or fewer than one mode as current");
  eq((html.match(/class="d1-mode is-open/g) || []).length, 1,
    "more than one mode is styled open");

  for (const m of MODES) {
    w.pdxDoor1Open(m);
    const h = paint(w);
    has(h, `data-d1-mode="${m}"`, `opening the ${m} mode did not put it on the desk`);
    eq((h.match(/data-d1-mode="/g) || []).length, 1,
      `opening the ${m} mode left another mode on the desk as well`);
  }
  // An unknown mode changes nothing rather than blanking the desk.
  const before = paint(w);
  eq(w.pdxDoor1Open("finance"), false, "the desk accepted a mode that is not on the rail");
  eq(paint(w), before, "a rejected mode still repainted the desk");

  // The rail's counts are counts of things that happened, and nothing at zero.
  const fresh = boot();
  const rail0 = paint(fresh);
  no(rail0, "d1-mode-n", "the rail printed a tally before the reader had done anything — a row of\n" +
    "    zeroes is a scoreboard telling a reader they are behind before they have started");
  fresh.pdxDoor1Issue(fresh.CORE_NATIONAL_ISSUES[0].key);
  const rail1 = paint(fresh);
  has(rail1, "1 opened", "opening an issue did not register on the rail");
  fresh.pdxDoor1Issue(fresh.CORE_NATIONAL_ISSUES[0].key);
  eq((paint(fresh).match(/1 opened/g) || []).length, 1,
    "opening the same issue twice counted twice — the rail counts distinct things opened");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · WORK_IDS still route, and now also select a mode");

{
  // The router itself is untouched: still four ids, still five doors.
  ok(/var WORK_IDS = \[([^\]]*)\]/.test(HTML), "the router no longer declares WORK_IDS");
  const ids = /var WORK_IDS = \[([^\]]*)\]/.exec(HTML)[1];
  for (const id of SURFACES) {
    has(ids, `'${id}'`, `WORK_IDS no longer lists ${id}, so its deep link is stranded`);
  }
  eq((HTML.match(/window\.pdxDoor&&window\.pdxDoor\('/g) || []).length, 5,
    "the chooser no longer carries exactly five doors — the desk must not have added a fifth");

  const w = boot();
  // Every deep-linkable surface reaches its mode through the shipped router.
  const WANT = { "hero-receipt": "claim", "say-vs-do": "claim", "issue-front-door": "issue", "hr1-showcase": "measure" };
  for (const id of SURFACES) {
    const r = boot();
    r.pdxDoorWork(id);
    has(r.__routed, "work:" + id,
      `wrapping the router swallowed the call for ${id} — the surface no longer opens at all`);
    eq(r.PDXDoor1._mode(), WANT[id], `a deep link to #${id} did not select the ${WANT[id]} mode`);
  }
  // And every chooser door.
  const DOORS = { person: "person", claim: "claim", issue: "issue", bill: "measure", bills: "measure", receipts: "claim" };
  for (const d of Object.keys(DOORS)) {
    const r = boot();
    r.pdxDoor(d);
    has(r.__routed, "door:" + d, `wrapping the chooser swallowed the ${d} door`);
    eq(r.PDXDoor1._mode(), DOORS[d], `the ${d} door did not select the ${DOORS[d]} mode`);
  }
  // 'mine' is Door 2's business and must not move this desk.
  const m = boot();
  m.pdxDoor1Open("issue");
  m.pdxDoor("mine");
  eq(m.PDXDoor1._mode(), "issue", "the ballot door moved the Door 1 desk");
  // Wrapping is idempotent: a second boot must not stack two wrappers.
  const twice = boot();
  vm.runInContext(DESK, vm.createContext(twice), { filename: "door1-workspace.js(2)" });
  twice.pdxDoorWork("hr1-showcase");
  eq(twice.__routed.filter((x) => x === "work:hr1-showcase").length, 1,
    "a second boot stacked a second router wrapper, so one call routes twice");
  ok(w.PDXDoor1.VIEWS.length === 4, "the desk no longer declares all four views");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · No stranded products: four surfaces, four view strips");

{
  const w = boot();
  paint(w);
  for (const v of w.PDXDoor1.VIEWS) {
    const s = stripOf(w, v.id);
    ok(s.length > 0, `#${v.id} carries no view strip, so it still reads as its own product`);
    has(s, "A VIEW of the Door 1 workspace",
      `#${v.id}'s strip does not say what it is a view of`);
    has(s, v.job, `#${v.id}'s strip does not say what job it does that the desk does not`);
    has(s, "PDXDoor1.toDesk(", `#${v.id}'s strip carries no way back to the desk`);
    const host = w.document.getElementById(v.id);
    eq(host.getAttribute("data-door1-of"), "pdx-door1-workspace",
      `#${v.id} does not record which surface owns its loop`);
    eq(host.getAttribute("data-door1-mode"), v.mode,
      `#${v.id} does not record which desk mode it belongs to`);
  }
  // Idempotent: repainting must not stack strips.
  const host = w.document.getElementById("say-vs-do");
  const n = host.children.length;
  paint(w); paint(w);
  eq(host.children.length, n, "each repaint inserted another view strip");

  // The strip is a label, never a heading. A fifth <h2> is a fifth product.
  const strip = w.PDXDoor1._strip(w.PDXDoor1.VIEWS[0]);
  for (const t of ["<h1", "<h2", "<h3", "<h4"]) {
    no(strip, t, `the view strip carries a ${t} — it must read as a label ON the section, not as a\n` +
      "    section of its own");
  }
  // Nothing is labelled a view until there is a desk to be a view of. On a page
  // with no mount — an older cached index.html, or any page that carries the
  // surfaces but not the desk — the strips must never appear.
  const bare = boot({ noMount: true });
  ok(bare.PDXDoor1 && typeof bare.PDXDoor1.views === "function", "probe: the desk did not boot at all");
  bare.PDXDoor1.views();
  eq(stripOf(bare, "say-vs-do"), "",
    "a surface was labelled a view of a desk that never mounted");
  eq(bare.PDXDoor1.sync(), false, "the desk reported a successful paint with no mount to paint into");
  ok(bare.document.getElementById("say-vs-do").getAttribute("data-door1-of") === null,
    "a surface was stamped as owned by a desk that never mounted");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · The honest empties are quoted, not written");

{
  const D = probe.PDXDoor1;
  // The claim miss. One sentence, and the second clause is the whole point.
  eq(D.CLAIM_MISS,
    "No matching formal act on file yet — not the same as they never did it.",
    "the claim miss is not the locked sentence");
  // The measure refusal is bill-detail's own literal, character for character.
  // Two copies that cannot drift beats one copy this module cannot reach.
  has(BILLDETAIL, D.MEASURE_NO_MAP,
    "the desk's measure refusal is no longer the exact sentence bill-detail.js prints. A reader who\n" +
    "    meets an unmapped measure on the desk and again on its own page must be told the same thing");
  eq(D.MEASURE_NO_MAP,
    "No topics are mapped to this measure yet, so a vote on it is not counted on any issue.",
    "the measure refusal drifted from the shipped wording");
  // The empty issue lane is the floor's own no-vehicle sentence.
  eq(D._emptyIssueNote(), probe.PDXConsistency.menu.PHRASES.no_vehicle.note,
    "the empty issue lane no longer uses the floor's own no-vehicle sentence");
  // The phrase the brief forbids, anywhere in the module or the sheet.
  for (const bad of ["no pattern", "No pattern"]) {
    no(DESK, bad, `"${bad}" appears in the desk. An empty lane is a fact about the calendar and about\n` +
      "    what we hold — never a finding that a person has no pattern");
  }

  // An unmapped measure prints the refusal and no derived key.
  const w = boot();
  const rows = w.PDXDoor1._measures();
  const bare = rows.find((b) => !(b.issueKeys || []).filter(Boolean).length && !b.primaryIssue);
  if (bare) {
    w.pdxDoor1Measure(bare.number);
    has(paint(w), D.MEASURE_NO_MAP, `${bare.number} has no mapping and the desk did not say so`);
  } else {
    // Nothing in the shipped index is unmapped, which is the healthy state. The
    // refusal is still pinned above, and the renderer is exercised directly.
    ok(true, "");
    console.log("      every measure in the index carries a mapping — refusal pinned by literal only");
  }

  // A stowaway note only where the index already marks a package, and in the
  // floor's own words. No detector runs on this desk.
  const pkg = rows.find((b) => b.isOmnibus);
  must(pkg, "no measure in the index is marked as a package any more");
  const stow = D._stowaway(pkg);
  ok(stow && stow.note === probe.PDXConsistency.menu.PHRASES.provision_only.note,
    "the stowaway note is not the floor's own provision-only sentence");
  eq(stow.tag, probe.PDXConsistency.vehicle.TAG, "the stowaway tag is not the shipped tag");
  const plain = rows.find((b) => !b.isOmnibus);
  if (plain) eq(D._stowaway(plain), null, `${plain.number} is not marked a package and got a package note`);
  w.pdxDoor1Measure(pkg.number);
  has(paint(w), probe.PDXConsistency.vehicle.TAG, "a package measure carries no package mark on the desk");

  // An issue key we hold no bundle for is refused, not folded into the nearest
  // bundle. lands_preserve is a real ISSUE_MAP key that belongs to no core
  // bundle, which is exactly the shape that must not be approximated.
  eq(D._resolveIssue("lands_preserve"), null,
    "a key outside every core bundle resolved to a bundle anyway — the desk would answer a\n" +
    "    question nobody asked");
  const lp = boot();
  eq(lp.pdxDoor1Issue("lands_preserve"), false, "an unbundled key was accepted as a pick");
  lp.pdxDoor1Open("issue");
  has(paint(lp), lp.PDXConsistency.menu.PHRASES.no_vehicle.note,
    "an unbundled issue key printed something other than the honest empty");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · No party, no figure, no floor moved");

{
  // THE WALLS, MEASURED WHERE THEY MATTER: on what the desk PAINTS. The module's
  // own prose says at length that it reads no party field and no match figure,
  // so a substring ban on the source would fail on the sentences promising the
  // wall. Every mode is painted and every wall is checked against the markup.
  const modes = ["claim", "person", "issue", "measure"];
  const painted = [];
  {
    const p = boot();
    // Real picks, so the issue and measure desks are painted full rather than
    // as their "pick one above" prompt.
    const anyIssue = p.CORE_NATIONAL_ISSUES[0].key;
    const anyMeasure = p.PDXDoor1._measures()[0].number;
    p.pdxDoor1Issue(anyIssue);
    painted.push(paint(p));
    p.pdxDoor1Measure(anyMeasure);
    painted.push(paint(p));
    for (const m of modes) { p.pdxDoor1Open(m); painted.push(paint(p)); }
  }
  const ALL = painted.join("\n");
  must(ALL.indexOf("d1-people") >= 0 && ALL.indexOf("d1-meas") >= 0,
    "the sweep never painted a full issue list and a full measure face, so its walls are vacuous");
  for (const wd of ["Republican", "Democrat", "GOP", "party", "partisan", "(R)", "(D)"]) {
    ok(ALL.toLowerCase().indexOf(wd.toLowerCase()) === -1,
      `"${wd}" reached the desk's markup. Party is never a group, a sort or a mark here`);
  }
  ok(ALL.indexOf("%") === -1,
    "a percentage reached the desk's markup. Every figure on this site carries its denominator on\n" +
    "    the surface that computes it, and this surface computes none");
  for (const wd of ["Direction Match", "consistency score", "grade", "Mandate"]) {
    ok(ALL.indexOf(wd) === -1,
      `"${wd}" reached the desk's markup. It states no verdict and hosts no second lane — it opens\n` +
      "      the surfaces that do, under those surfaces' own rules");
  }
  // And at source level, the reads that would BE those walls coming down. The
  // desk must not touch the match brain, the party field, or buildRanking's own
  // composite ordering value.
  for (const probe of ["_calcAlignment", "scopedOverall", "_msPriorityWeight", "PDXFinance", "PDXMandate"]) {
    no(DESK, probe, `the desk calls ${probe}. It reads no engine that produces a reading`);
  }
  ok(!/\.party\b/.test(DESK), "the desk reads the party field off a ledger row");
  // The comparator itself, read out of the source: only the three keys the desk
  // names above the list may appear in it. buildRanking's own `value` orders the
  // ledger's own view and must never order a record-first one.
  const iSort = DESK.indexOf("keep.sort(");
  must(iSort > 0, "the people list no longer has a comparator to read");
  const cmp = DESK.slice(iSort, DESK.indexOf("});", iSort));
  for (const bad of ["value", "tier", "party", "confidence", "consistent"]) {
    no(cmp, bad, `the people-list comparator reads "${bad}". It orders by acts on the formal record,\n` +
      "      then total documented evidence, then name — and by nothing else");
  }
  has(DESK, "voteCount", "the desk no longer orders the people list by acts on the formal record");

  const w = boot();
  // A real issue with real rows behind it, so the ordering assertion is not vacuous.
  const rich = w.CORE_NATIONAL_ISSUES
    .map((c) => [c, w.PDXDoor1._people(c, "")])
    .filter((p) => p[1] && p[1].length >= 3)[0];
  must(rich, "no core issue has three people with a formal row on it any more");
  const [core, people] = rich;
  // Record-first, and provably so: the list is non-increasing in acts on file,
  // then in total documented evidence, then alphabetical — the exact three keys
  // the desk names above the list, and no fourth.
  const keyOf = (r) => [-(r.voteCount || 0), -(r.evidenceCount || 0), String(r.name || "")];
  let ordered = true;
  for (let i = 1; i < people.length; i++) {
    const a = keyOf(people[i - 1]), b = keyOf(people[i]);
    const cmp = a[0] - b[0] || a[1] - b[1] || a[2].localeCompare(b[2]);
    if (cmp > 0) ordered = false;
  }
  ok(ordered, `the ${core.key} people list is not ordered by the formal record it says orders it`);
  ok(people.some((r) => (r.voteCount || 0) + (r.receiptCount || 0) > 0),
    "probe: no row on the list carries anything on the formal record, so the order proves nothing");
  w.pdxDoor1Issue(core.key);
  const html = paint(w);
  has(html, "d1-people", "the issue desk painted no people list");
  no(html, "iv-row-party", "the issue desk carried the ledger's party chip onto the list");
  ok(/formal act|receipt/.test(html),
    "the people list does not say what it is counting. A row with a bare name states a finding by\n" +
    "    being on the list at all");
  // The baseline is marked, in the alignment lane's own words, where it applies.
  const based = people.filter((p) => p.tierKey === "voted");
  if (based.length) {
    has(html, w._PDX_ALIGN_BASE_TAG,
      "rows resting on the record baseline are not marked with the shipped baseline tag");
  }
  // Every name is a real address, so it can be followed and opened in a tab.
  has(html, 'href="/p/', "the people list names people without linking to their files");

  // The floor, the share path and the slice sentence are untouched. Nothing in
  // this pass may have moved a publication rule.
  const untouched = [
    ["receipt-cards.js", "the publication floor"],
    ["share-anywhere.js", "the share path"],
    ["word-action.js", "the formal brief renderer"],
    ["consistency.js", "the floor's own lane vocabulary"],
    ["issue-view.js", "the issue ledger"],
    ["claim-check.js", "the claim resolver"],
    ["bill-detail.js", "the measure face"],
  ];
  for (const [f, what] of untouched) {
    ok(R(f).indexOf("door1-workspace") === -1 && R(f).indexOf("PDXDoor1") === -1,
      `${what} (${f}) now knows about the desk. The desk reads shipped modules; no shipped module\n` +
      "      may be edited to serve it, or the loop becomes the thing that owns the record");
  }
  has(R("word-action.js"), "not a career score.",
    "the brief's slice sentence is no longer in word-action.js — this pass must not have moved it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · A claim miss does not invent a vote");

{
  // The real claim resolver, driven over a stubbed network and a stubbed receipt
  // store. Both are dependencies of the module under test, not the module under
  // test: claim-check.js does the reading and the phase transitions, and the
  // desk renders whatever state it lands in.
  const drive = (reply, cards) => {
    const w = boot();
    w.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(reply) });
    w.PDXReceiptCards = {
      warm: () => Promise.resolve(cards === null ? null : (cards || [])),
      find: () => (cards && cards.length ? cards[0] : null),
    };
    return w;
  };
  const CLAIM = "Senator Mike Lee voted to gut protections for public lands in the West last year";
  const reading = { resolved: true, pid: "lee", issueKey: "climate_action", direction: "opposes",
    display: { politician: "Mike Lee", issue: "Climate Action" }, confidence: 0.9 };

  // NO RECORD: the record loaded and holds no matching act.
  const miss = drive(reading, []);
  miss.pdxDoor1Open("claim");
  await miss.PDXClaimCheck.check(CLAIM);
  const h = paint(miss);
  has(h, miss.PDXDoor1.CLAIM_MISS, "the claim miss did not print the locked sentence");
  has(h, "d1-out-miss", "the claim miss is not painted as a miss");
  // The one honest door, and nothing more. Naming a measure or a roll call here
  // would be the desk inventing the act it just said it does not hold.
  has(h, "/p/lee", "the miss does not offer the one thing it can honestly offer: the person's file");
  no(h, "pdxDoor1Bill", "the miss offered a measure. There is no act on file to open");
  no(h, "who voted", "the miss offered a roll call for an act it just said is not on file");
  no(h, "d1-card", "the miss painted a receipt card");
  eq((h.match(/class="d1-door"/g) || []).length, 1,
    "the miss offered more than one door onward");

  // UNRESOLVED: a finding about the sentence, not about the record. The locked
  // miss sentence must NOT appear — it would read as an acquittal of a person
  // the resolver never identified.
  const unread = drive({ resolved: false, reason: "We could not tell which person this is about." }, []);
  unread.pdxDoor1Open("claim");
  await unread.PDXClaimCheck.check(CLAIM);
  const u = paint(unread);
  has(u, "could not read that as a claim about one person and one issue",
    "an unreadable claim is not distinguished from an empty record");
  no(u, unread.PDXDoor1.CLAIM_MISS,
    "an unreadable claim printed the no-record sentence, which names a formal lane for a person\n" +
    "    the resolver never identified");
  no(u, "/p/", "an unresolved claim offered a person's file");

  // UNAVAILABLE: a dropped request is not a finding either.
  const down = boot();
  down.fetch = () => Promise.reject(new Error("offline"));
  down.pdxDoor1Open("claim");
  await down.PDXClaimCheck.check(CLAIM);
  const d = paint(down);
  has(d, "connection problem on our side, not a finding about the claim",
    "a dropped request is not distinguished from a finding");
  no(d, down.PDXDoor1.CLAIM_MISS, "a dropped request printed the no-record sentence");

  // A HIT routes onward, and the receipt itself is rendered by its own renderer.
  const card = { pid: "lee", issueKey: "climate_action", measureNumber: "H.R. 1",
    headline: "Voted for H.R. 1", instrument: { key: "vote", label: "Floor vote" },
    date: "2025-05-22", source: { url: "https://example.gov/roll", label: "House Clerk" } };
  const hit = drive(reading, [card]);
  hit.PDXReceipts = { cardHTML: () => '<div class="pdxr-card">RENDERED BY ITS OWN RENDERER</div>' };
  hit.pdxDoor1Open("claim");
  await hit.PDXClaimCheck.check(CLAIM);
  const r = paint(hit);
  has(r, "RENDERED BY ITS OWN RENDERER",
    "the desk did not use the shipped receipt renderer — it is re-drawing a card it does not own");
  has(r, "/p/lee", "the hit does not open the person's file");
  has(r, "pdxDoor1Issue('climate_action')", "the hit does not open the issue dossier");
  has(r, "pdxDoor1Bill('H.R. 1')", "the hit does not open the measure the act was cast on");
  no(r, "[object Object]", "the desk printed a structured field as text");
  no(r, hit.PDXDoor1.CLAIM_MISS, "a hit printed the no-record sentence");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · One footer control, and it is not a meter");

{
  const w = boot();
  const html = paint(w);
  eq((html.match(/class="d1-next"/g) || []).length, 1,
    "the desk footer does not carry exactly one control");
  has(html, "Next in Door 1", "the footer control is not the one the brief names");
  // No meter, no share, no completion figure — the whole reason the footer says
  // a mode name instead of a number.
  for (const bad of ["d1-prog", "of 4", "1 of ", "complete", "Complete"]) {
    no(html, bad, `the footer carries "${bad}" — the desk states no quantity of progress`);
  }
  // It advances to a mode the reader has not used, and eventually to the rail.
  const seen = [];
  for (let i = 0; i < 4; i++) { seen.push(w.PDXDoor1._mode()); w.pdxDoor1Next(); }
  eq(new Set(seen).size, 4, `"Next in Door 1" repeated a mode instead of advancing (${seen.join(" ")})`);
  eq(w.PDXDoor1._next(w.PDXDoor1._mode()), null,
    "after every mode has been used the footer still claims there is a next one");
  has(paint(w), "back to the rail", "with every mode used the footer does not fall back to the rail");
  eq(w.pdxDoor1Next(), false, "the exhausted footer still reports that it advanced");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · Twin boot — the desk wraps four globals and perturbs none of them");

{
  const A = boot({ withoutDesk: true });
  const B = boot();
  must(A.PDXWordAction && typeof A.PDXWordAction.heroHtml === "function",
    "word-action.js did not boot without the desk");
  const prof = (w, pid) => (w.PROFILES && w.PROFILES[pid]) || null;
  // The four files the brief names, byte for byte.
  for (const pid of ["lee", "curtis", "bmoore", "aaron_bean"]) {
    eq(String(B.PDXWordAction.heroHtml(pid, prof(B, pid)) || ""),
       String(A.PDXWordAction.heroHtml(pid, prof(A, pid)) || ""),
      `${pid}: the formal brief is not byte-identical with the desk loaded`);
  }
  // And the whole corpus: every brief, every Direction Match scope, every shape.
  const drifted = [], dm = [];
  for (const [pid] of corpus.byMember) {
    if (String(B.PDXWordAction.heroHtml(pid, prof(B, pid)) || "") !==
        String(A.PDXWordAction.heroHtml(pid, prof(A, pid)) || "")) drifted.push(pid);
    for (const sc of Object.keys(A.PDXConsistency.SCOPES)) {
      if (JSON.stringify(B.PDXConsistency.scopedOverall(sc, pid)) !==
          JSON.stringify(A.PDXConsistency.scopedOverall(sc, pid))) dm.push(`${pid}/${sc}`);
    }
  }
  eq(drifted.slice(0, 6).join(" "), "", `${drifted.length} formal brief(s) moved when the desk loaded`);
  eq(dm.slice(0, 6).join(" "), "", `Direction Match drifted on ${dm.length} reads`);
  console.log(`      ${corpus.byMember.size} members swept: no drift in any brief or Direction Match read`);

  // The wrapped globals still return what they returned. A wrapper that swallows
  // a return value is a wrapper that breaks a caller silently.
  const c = boot();
  eq(c.pdxDoorWork("say-vs-do"), true, "the router wrapper dropped the router's return value");
  eq(c.pdxDoor("issue"), true, "the chooser wrapper dropped the chooser's return value");
  // And a throwing wrappee does not take the desk down with it.
  const t = boot({ withoutDesk: true });
  t.pdxDoorWork = () => { throw new Error("boom"); };
  vm.runInContext(DESK, vm.createContext(t), { filename: "door1-workspace.js" });
  let threw = false;
  try { t.pdxDoorWork("say-vs-do"); } catch { threw = true; }
  ok(!threw, "a throwing router took the desk's wrapper down with it");
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ door one workspace: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("   · " + f);
  process.exit(1);
}
console.log(`✓ door one workspace: all ${passed} assertions passed — 4 modes, 1 desk, 4 WORK_IDS routing, 0 stranded products\n`);
