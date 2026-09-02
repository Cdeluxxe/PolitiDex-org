#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-issue-family.mjs — one issue family: cores browse, children are the profile
// ─────────────────────────────────────────────────────────────────────────────
// An issue has two levels on this site and, before this pass, three surfaces had
// their own opinion about them. The Door 1 issue shelf browsed thirteen core
// bundles. The person file's topic tree grouped the same keys its own way. The
// seek control reached the whole register. Only one of the three read the parent
// table, and the gap between them was visible to a reader: `lands_preserve` is a
// published key with a label, a chip, four mapped standalone measures and 210
// people carrying a readable formal row (513 mapped records between them), and
// you could open its ledger by TYPING ITS NAME while no branch anywhere on the
// site carried a chip for it. Twenty-four keys were in that position, the whole
// public-lands cluster among them. The figures are the ones section 4 prints, so
// they are checked rather than remembered — the census counts PEOPLE, which is
// why it is not the record total.
//
// The fix was not a second taxonomy. It was to finish the one that already had an
// owner — CORE_NATIONAL_ISSUES, declared next to ISSUE_MAP — and to give every
// surface one place to ask. This file is the fence around that:
//
//   1. ONE TABLE, ONE PARENT EACH. Every published ISSUE_MAP key sits under
//      exactly one core. An orphan is a failure here, not a seek-only curiosity,
//      and a key two cores claim is a failure too. Thirteen cores, no fourteenth,
//      no invented key, and nothing merged: `lands_preserve`, `lands_keep_public`,
//      `lands_local`, `lands_balance` and `enviro_balance` are five keys with five
//      labels and five ledgers, not one chip wearing five hats.
//   2. THE TABLE IS READ, NOT COPIED. PDXIssueFamily answers coreOf / childrenOf /
//      label / crumb straight off the shipped array, the two directions agree, and
//      a core that parents land says land in its own label.
//   3. THE SHELF PAINTS THE TABLE. Selecting the land-capable core paints one chip
//      per child, all five lands_* keys among them, in the table's order.
//   4. THE CHILD IS THE PROFILE. Tapping a child commits THAT key: the census
//      names that key's label, the crumb reads Core → Child, and every row on the
//      pane is the formal-pattern index's own row for that person on that exact
//      key. Zero cousin rows in a `lands_preserve` census.
//   5. A SIBLING IS A DIFFERENT LEDGER. Practical Stewardship opens Practical
//      Stewardship — same branch, different key, different census.
//   6. SEEK STILL WORKS, AND NOW AGREES WITH THE SHELF. Opening a key by name
//      commits that key and switches the highlighted core to the key's parent, so
//      the crumb and the chips cannot contradict each other.
//   7. THE TOPIC TREE READS THE SAME TABLE. Every leaf on a real person file is
//      filed under coreOf(key) — the identical answer Door 1 uses — and no leaf
//      falls into the trailing Other, because nothing is unparented any more.
//   8. ONE PALETTE. A chip wears the issue's own hue, asked of issue-colors.js
//      exactly the way every other surface asks: Door 1's child chip for
//      `lands_preserve` carries the IDENTICAL --pdx-ic token the topic tree emits
//      for that key on /p/lee, the whole branch shares the core's hue because no
//      leaf has a colour of its own, lit and unlit are two steps of that one hue,
//      focus is visible, an empty child is themed like its siblings rather than
//      hidden or greyed, and Door 1 hard-codes no colour anywhere.
//   9. NO FIGURE MOVED. Twin boot with the family module and without it: every
//      formal brief and every Direction Match read is byte-identical. The table
//      names families; it does not read records.
//  10. NO SECOND LANE IN THE COPY. No consistency-ranking heading on a child
//      ledger, no percentage, no grade, no caucus token, no "most conservative".
//  11. THE ASSETS TRAVEL TOGETHER, behind a CACHE_VERSION that moved with them.
//
//   node scripts/test-issue-family.mjs
//
// Real shipped modules in a node:vm sandbox, the real roster, the real record
// corpus and a mini-DOM. Every claim about painted markup is about markup this
// harness painted.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// Load order, as index.html defers them. pdx-issue-family.js sits immediately
// after alignment-tool.js because the table is the only thing it reads.
const BASE = [
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
  "issue-colors.js",
  "consistency.js",
  "voting-record.js",
  "inventory.js",
  "issue-scope.js",
  "word-action.js",
  "profile-spine.js",
  "my-stances.js",
  "person-link.js",
  "bills-index.js",
  "bills.js",
  "bill-detail.js",
  "claim-check.js",
  "issue-view.js",
];
const FAMILY = "pdx-issue-family.js";
const SRC = new Map([...BASE, FAMILY, "stance-tree.js"].map((f) => [f, R(f)]));
const DESK = R("door1-workspace.js");
const CSS = R("door1-workspace.css");
const PAGE = R("index.html");
const SW = R("sw.js");

// The keys the smoke names. Five different questions about the public estate plus
// the sibling that is NOT one of them — held apart here exactly as the table
// holds them apart.
const KEY = "lands_preserve";
const LANDS = ["lands_preserve", "lands_keep_public", "lands_local", "lands_energy", "lands_balance"];
const SIBLING = "enviro_balance";          // ⚖️ Practical Stewardship
const PEOPLE = ["lee", "aaron_bean"];

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
// A probe that finds nothing is not a pass: if the fixture stops offering the
// case, this file says so and stops rather than reporting green over nothing.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ issue family: STALE PROBE — ${msg}`);
  process.exit(2);
};
// The modules' own escaping, so a core label with an ampersand in it (Climate,
// Energy & Land) can be matched against markup rather than asserted around.
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const corpus = buildCorpus(ROOT);
must(corpus && corpus.byMember && corpus.byMember.size > 100,
  "the record corpus did not load enough members to sweep");

// ── A mini-DOM ───────────────────────────────────────────────────────────────
// querySelectorAll returns nothing on purpose: this file asserts against painted
// HTML strings, which is what a reader actually receives.
function miniDom(win) {
  const byId = {};
  const mk = (id) => {
    const node = {
      id: id || "", className: "", innerHTML: "", textContent: "", value: "",
      style: {}, dataset: {}, children: [], hidden: false, attrs: {}, firstChild: null,
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
  ["hero-receipt", "say-vs-do", "issue-front-door", "hr1-showcase",
   "pdx-door1-workspace", "pdx-d1-body"].forEach(mk);
  return byId;
}

// /api/voting-record is not reachable from a test and two shipped reads go through
// it. Both are stubbed from the SAME corpus the sandbox is seeded with, so the
// discovery read returns one issue's slice and the full-record read resolves empty
// (the rows are already warm). Every key asked for is recorded, because "did
// committing this child ask for THIS child" is the thing that was broken.
function stubReads(win) {
  win.__askedIssue = [];
  win.PDXVotingRecord.fetchIssueRecords = function (keys) {
    const ks = (keys || []).slice();
    win.__askedIssue.push(ks.join(","));
    const byPid = {};
    for (const [pid] of corpus.byMember) {
      let items = [];
      for (const k of ks) {
        let part = [];
        try { part = win._pdxRecordIssueItems(pid, k) || []; } catch { part = []; }
        items = items.concat(part);
      }
      if (items.length) byPid[pid] = items;
    }
    return Promise.resolve({ byPid, truncated: false });
  };
  win.PDXVotingRecord.fetchCompare = function () { return Promise.resolve({ byPid: {} }); };
}

function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const sess = {};
  win.sessionStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(sess, k) ? sess[k] : null),
    setItem: (k, v) => { sess[k] = String(v); },
    removeItem: (k) => { delete sess[k]; },
  };
  win.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  win.auth = { currentUser: null };
  win.addEventListener = () => {};
  const byId = miniDom(win);
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  win.__loadErrors = [];
  const files = BASE.slice();
  // THE ONE VARIABLE. `withoutFamily` boots the identical page with the family
  // module left out, which is the byte-identical proof in section 8.
  if (!opts.withoutFamily) files.splice(files.indexOf("alignment-tool.js") + 1, 0, FAMILY);
  for (const f of files) {
    try { vm.runInContext(SRC.get(f), ctx, { filename: f }); }
    catch (e) { win.__loadErrors.push(`${f}: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  stubReads(win);
  win.pdxDoorWork = () => true;
  win.pdxDoor = () => true;
  if (!opts.withoutDesk) vm.runInContext(DESK, ctx, { filename: "door1-workspace.js" });
  if (opts.withTree) vm.runInContext(SRC.get("stance-tree.js"), ctx, { filename: "stance-tree.js" });
  win.__byId = byId;
  return win;
}

const paint = (w) => {
  w.PDXDoor1.sync();
  const h = w.document.getElementById("pdx-d1-body");
  return h ? String(h.innerHTML) : "";
};
const tick = () => new Promise((r) => setTimeout(r, 0));
// Selecting a key is a reader action followed by an async field warm; this is
// exactly the sequence a tap causes.
async function commit(w, key) {
  w.pdxDoor1Open("issue");
  w.pdxDoor1Issue(key);
  await tick(); await tick();
  w.pdxDoor1Issue(key);
  return paint(w);
}
// The chips on a shelf, in paint order: key, label, isOpen — and the issue skin
// the chip carries. `ic` is the inline custom-property string the colour module
// handed over and `themed` is whether the [data-ic] gate is on, which is the pair
// the stylesheet actually reads; a chip painted with a hue but no gate, or a gate
// with no hue, would render as an untyped pill and is caught here rather than
// looked at. The attribute run between `class` and `onclick` is captured loosely
// on purpose: this helper should not have to be rewritten the next time the desk
// adds an aria hook to a chip.
const chipsIn = (html, cls) =>
  [...String(html).matchAll(
    new RegExp(`<button type="button" class="d1-chip${cls}([^"]*)"([^>]*?)\\s*onclick="window\\.pdxDoor1Issue\\('([^']*)'\\)">([^<]*)<`, "g"))]
    .map((m) => ({
      key: m[3],
      label: m[4],
      open: /\bis-open\b/.test(m[1]),
      themed: /\bdata-ic="1"/.test(m[2]),
      ic: (m[2].match(/\sstyle="([^"]*)"/) || [])[1] || "",
    }));
const keyChips = (html) => chipsIn(html, " is-key");
// The crumb's own inner markup, isolated, so an assertion about the crumb cannot
// pass on the census sentence underneath it (or on the "1" in its class name) —
// and the crumb's own skin, read the same way a chip's is.
const crumbOf = (html) =>
  (String(html).match(/<p class="d1-led-crumb"[^>]*>([\s\S]*?)<\/p>/) || [])[1] || "";
const crumbIc = (html) =>
  (String(html).match(/<p class="d1-led-crumb"[^>]*\sstyle="([^"]*)"/) || [])[1] || "";
// The same read, off the OTHER surface: the topic tree's leaf for one key on one
// person file. Deliberately scraped from painted markup rather than asked of
// skinFor(), because "these two surfaces agree" is a claim about what a reader
// receives, not about what a helper returns.
const treeIc = (html, key) =>
  (String(html).match(
    new RegExp(`<div class="pdxtree-leaf[^"]*"\\s+style="([^"]*)"\\s+data-pdxtree-issue="${key}"`)) || [])[1] || "";
const treeBranchIc = (html, core) =>
  (String(html).match(
    new RegExp(`<div class="pdxtree-branch[^"]*"\\s+style="([^"]*)"\\s+data-pdxtree-branch="${core}"`)) || [])[1] || "";

const probe = boot({ withTree: true });
must(probe.__loadErrors.length === 0, `boot errors: ${probe.__loadErrors.join(" | ")}`);
const F = probe.PDXIssueFamily;
must(F, "pdx-issue-family.js did not publish window.PDXIssueFamily");
for (const fn of ["coreOf", "childrenOf", "label", "crumb", "orphans", "duplicates", "profileUrl"])
  must(typeof F[fn] === "function", `PDXIssueFamily.${fn} is not published`);
const MAP = probe.ISSUE_MAP || {};
const CORES = probe.CORE_NATIONAL_ISSUES || [];
must(CORES.length > 0 && Object.keys(MAP).length > 50, "the register did not load");
for (const k of [...LANDS, SIBLING])
  must(MAP[k] && MAP[k].label, `${k} is no longer a published ISSUE_MAP key`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · One table, one parent each");

const PUBLISHED = Object.keys(MAP).filter((k) => MAP[k] && MAP[k].label);
{
  // THE ASSERTION THIS WHOLE PASS EXISTS FOR. A published key with no parent is
  // a key with a ledger and no door into it — reachable only by typing its name,
  // which is what `lands_preserve` was. It is a failure, not a category.
  const orphans = F.orphans();
  eq(orphans.join(", "), "",
    `${orphans.length} published ISSUE_MAP key(s) sit under no core — give each one an honest ` +
    `parent in CORE_NATIONAL_ISSUES (alignment-tool.js) rather than a fourteenth list`);
  // …and the other direction: a key two cores claim would paint two chips for one
  // ledger and make crumb() a coin flip.
  const dupes = F.duplicates();
  eq(dupes.join(", "), "", `${dupes.length} key(s) are claimed by more than one core`);
  // Counted independently of the module, so a bug in index() cannot hide behind it.
  const byHand = {};
  CORES.forEach((c) => (c.keys || []).forEach((k) => { byHand[k] = (byHand[k] || 0) + 1; }));
  const wrong = PUBLISHED.filter((k) => byHand[k] !== 1);
  eq(wrong.slice(0, 8).join(", "), "",
    `${wrong.length} published key(s) are not listed exactly once across the thirteen cores`);
  must(PUBLISHED.length > 100, `only ${PUBLISHED.length} published keys — too few to be the register`);
  console.log(`      ${PUBLISHED.length} published keys · ${CORES.length} cores · 0 orphans · 0 duplicates`);

  // NO KEY WAS INVENTED TO MAKE THE TABLE CLOSE. Everything a core lists is a key
  // the register already carried.
  const ghosts = [];
  CORES.forEach((c) => (c.keys || []).forEach((k) => { if (!MAP[k]) ghosts.push(`${c.key}/${k}`); }));
  eq(ghosts.slice(0, 8).join(", "), "", `${ghosts.length} core entr(ies) name a key ISSUE_MAP does not carry`);
  // NO FOURTEENTH CORE. The shelf, the colour system and the tree all count these.
  eq(CORES.length, 13, "the core set is no longer the curated thirteen");
  const ids = CORES.map((c) => c.key);
  eq(new Set(ids).size, 13, "two cores share an id");
  ids.forEach((id) => ok(F.isCore(id), `${id}: the table does not recognise its own core id`));
  // TWO SHIPPED NAME COLLISIONS, NAMED HERE RATHER THAN ASSERTED AWAY. Two core
  // ids are also published ISSUE_MAP keys in their own right — `healthcare` (the
  // core '🏥 Healthcare Costs & Access' and the child '🏥 Expand Healthcare
  // Access') and `election_integrity`. That predates this pass: both cores already
  // listed their own id among their keys, so the child is self-parented and the
  // desk's resolver reads the id as the CORE, which is the shipped behaviour every
  // other surface depends on (typing a bundle's name opens the bundle). This pass
  // did not create the collision and does not resolve it — renaming a key is off
  // limits — but it must not GROW, so the set is pinned.
  const collisions = ids.filter((id) => MAP[id] && MAP[id].label).sort();
  eq(collisions.join(","), "election_integrity,healthcare",
    "the set of names that are both a core and a published key changed — a new collision makes " +
    "that child chip unreachable, because the desk resolves the name to the core");
  collisions.forEach((id) => {
    eq(F.coreOf(id), id, `${id}: the colliding key is not parented by the core of the same name`);
    ok(F.childrenOf(id).indexOf(id) >= 0,
      `${id}: the core does not list the key of the same name, so that key has no parent`);
  });
  ids.filter((id) => collisions.indexOf(id) < 0).forEach((id) => {
    eq(F.coreOf(id), "", `${id}: a core id resolved to a parent of its own`);
  });

  // NOTHING WAS MERGED. Five different questions about the public estate, plus the
  // sibling that is a different question again: five distinct keys, five distinct
  // labels, five distinct ledgers. "Fold them into one chip" would have made the
  // orphan list close too, and it would have been a lie.
  const labels = [...LANDS, SIBLING].map((k) => MAP[k].label);
  eq(new Set(labels).size, labels.length, "two of the land-cluster keys now share a label");
  eq(new Set([...LANDS, SIBLING]).size, 6, "the land-cluster keys collapsed into fewer keys");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · The table is read, not copied");

const LANDCORE = (() => {
  const id = F.coreOf(KEY);
  must(id, `${KEY} has no parent, so there is no land-capable core to test`);
  return CORES.filter((c) => c.key === id)[0];
})();
{
  // Both directions off one source, and they agree in both.
  const bad = [];
  PUBLISHED.forEach((k) => {
    const id = F.coreOf(k);
    if (!id) { bad.push(`${k}: no parent`); return; }
    if (F.childrenOf(id).indexOf(k) < 0) bad.push(`${k}: coreOf says ${id}, childrenOf(${id}) omits it`);
  });
  eq(bad.slice(0, 6).join(" | "), "", `${bad.length} key(s) disagree between coreOf and childrenOf`);
  const back = [];
  CORES.forEach((c) => F.childrenOf(c.key).forEach((k) => {
    if (F.coreOf(k) !== c.key) back.push(`${c.key}/${k}`);
  }));
  eq(back.slice(0, 6).join(" | "), "", `${back.length} child(ren) do not name the core that lists them`);

  // Display order is the TABLE'S order, not an alphabetisation this module chose,
  // so two paints of the same data cannot reshuffle the chips.
  CORES.forEach((c) => {
    const want = (c.keys || []).filter((k) => MAP[k] && MAP[k].label);
    eq(F.childrenOf(c.key).join(","), want.join(","),
      `${c.key}: childrenOf is not the declared order of its published keys`);
  });
  // Labels come from the table and ISSUE_MAP. Nothing is renamed in transit.
  CORES.forEach((c) => eq(F.label(c.key), c.label, `${c.key}: label() is not the declared label`));
  eq(F.label("no_such_core"), "", "an unknown core id produced a label");
  eq(F.coreOf("no_such_key_at_all"), "", "an off-register key resolved to a family");
  eq(F.childrenOf("no_such_core").length, 0, "an unknown core id produced children");
  eq(F.crumb("no_such_key_at_all").coreLabel, "", "an off-register key produced a family crumb");

  // THE CRUMB the smoke names, from the table rather than from a literal here.
  const c = F.crumb(KEY);
  eq(c.core, LANDCORE.key, "the crumb names the wrong family");
  eq(c.text, `${LANDCORE.label}${F.ARROW}${MAP[KEY].label}`, "the crumb is not Core label → Child label");
  has(c.text, "→", "the crumb has no arrow between the two levels");
  console.log(`      crumb: ${c.text}`);

  // LABEL HONESTY. A core that parents the public-estate keys cannot have a label
  // that denies them — the rename this pass was allowed to make, and the only kind
  // of rename it made. Checked against the register's own categorisation rather
  // than against a word this file picked.
  const landKids = F.childrenOf(LANDCORE.key).filter((k) => MAP[k] && MAP[k].cat === "land");
  must(landKids.length >= 5, `${LANDCORE.key} parents only ${landKids.length} cat:'land' keys`);
  has(LANDCORE.label.toLowerCase(), "land",
    `${LANDCORE.key} parents ${landKids.length} land keys and its label does not say land`);

  // NO NUMBER LEAVES THIS MODULE, and it reads nothing but the table. Asserted
  // against the source with its comments stripped, because the prose above the
  // code names the record modules it is not allowed to touch.
  const CODE = R(FAMILY).replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
  // (The audit reads do sort — key strings, alphabetically, so a failure message
  // reads the same twice. Ordering CHILDREN is what would be a ranking, and the
  // declared-order assertion above is what forbids it.)
  for (const banned of ["PDXConsistency", "PDXVotingRecord", "PDXWordAction", "buildRanking",
                        "Math.", "%", "party", "score"]) {
    no(CODE, banned, `pdx-issue-family.js reaches for ${banned} — the table names families, ` +
      `it does not read records, order people or produce a figure`);
  }
  // The two things it IS allowed to read, and nothing else on the window.
  const globals = [...new Set([...CODE.matchAll(/window\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))].sort();
  eq(globals.join(","), "CORE_NATIONAL_ISSUES,ISSUE_MAP,PDXIssueFamily",
    "pdx-issue-family.js touches a global other than the parent table and the register");
  // The permalink hook is a NAME and nothing more: nothing in the repo routes it,
  // and no chip, crumb or ledger waits on it.
  eq(F.profileUrl(KEY), `#issue=${KEY}`, "profileUrl does not name the child's address");
  eq(F.profileUrl(""), "", "profileUrl invented an address for no key");
  no(DESK, "profileUrl", "the desk gated something on the permalink hook");
  no(SRC.get("stance-tree.js"), "profileUrl", "the topic tree gated something on the permalink hook");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · The shelf paints the table");

const SHELF = await (async () => {
  const w = boot();
  w.pdxDoor1Open("issue");
  w.pdxDoor1Issue(LANDCORE.key);
  await tick(); await tick();
  return { w, html: paint(w) };
})();
{
  const { html } = SHELF;
  // THE CHIP THAT WAS MISSING. Five land keys, five chips, each its own key.
  const kids = keyChips(html);
  const painted = kids.map((c) => c.key);
  for (const k of LANDS) {
    ok(painted.indexOf(k) >= 0, `${k}: no child chip on ${LANDCORE.key} (painted: ${painted.join(", ")})`);
    has(html, `window.pdxDoor1Issue('${k}')`, `${k}: the chip does not commit that key`);
  }
  // Every child the table files here, and nothing else — the shelf is the table.
  eq(painted.join(","), F.childrenOf(LANDCORE.key).join(","),
    "the child chips are not childrenOf(core), in the table's order");
  kids.forEach((c) =>
    eq(c.label, esc(MAP[c.key].label), `${c.key}: the chip is not the key's own label`));
  // The core itself is lit, and exactly one core is.
  const lit = chipsIn(html, "").filter((c) => c.open && F.isCore(c.key));
  eq(lit.length, 1, "the core shelf does not light exactly one core");
  eq(lit[0].key, LANDCORE.key, "the wrong core is lit");
  // A CORE IS A TABLE OF CONTENTS. With no child picked, the pane keeps the
  // inventory sentence it has always had and characterises nobody "on" a family.
  no(html, "d1-led-census", "picking a core alone opened a ledger for thirteen keys at once");
  no(html, "d1-led-crumb", "a core with no child picked printed a child crumb");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · The child is the profile — exact key in, exact key out");

const CHILD = await (async () => {
  const w = boot();
  const html = await commit(w, KEY);
  return { w, html };
})();
{
  const { w, html } = CHILD;
  const FPI = w.PDXConsistency.formalPatternIndex;
  const led = w.PDXDoor1._ledger(null, KEY);
  must(led && led.people > 20, `the ledger found ${led ? led.people : 0} people on ${KEY}`);

  // The read is for this key, by name.
  ok(w.__askedIssue.some((a) => a.split(",").indexOf(KEY) >= 0), `${KEY} was never asked for as itself`);
  // THE HEADING is this child's own label, and the crumb over it names the family.
  has(html, `readable formal row on <b>${esc(MAP[KEY].label)}</b>`,
    "the census does not name the child it is about");
  has(html, "d1-led-crumb", "the census printed no Core → Child crumb");
  const crumb = crumbOf(html);
  must(crumb, "the crumb block could not be isolated from the painted census");
  has(crumb, esc(LANDCORE.label), "the crumb does not name the family");
  has(crumb, "→", "the crumb has no arrow");
  has(crumb, esc(MAP[KEY].label), "the crumb does not name the child");
  has(crumb, `window.pdxDoor1Issue('${LANDCORE.key}')`, "the crumb's family is not a way back to it");

  // ZERO COUSIN ROWS. Every row on the pane is the index's own published row for
  // that person ON THIS KEY. A cousin row — someone printed because they have a
  // record on `lands_keep_public` — would show up here and nowhere else.
  const bad = [], cousins = [];
  let rows = 0;
  for (const band of led.bands) {
    for (const r of band.rows) {
      rows++;
      const x = FPI.rowFor(r.pid, KEY);
      if (!x) { bad.push(`${r.pid}: printed with no index row on ${KEY}`); continue; }
      if (FPI.band(x) !== band.id) bad.push(`${r.pid}: banded ${band.id}, index says ${FPI.band(x)}`);
      if (r.label !== (x.patLabel || "")) bad.push(`${r.pid}: chip is not the index's`);
      for (const other of [...LANDS.filter((k) => k !== KEY), SIBLING]) {
        const o = FPI.rowFor(r.pid, other);
        if (o && !FPI.rowFor(r.pid, KEY)) cousins.push(`${r.pid} via ${other}`);
      }
    }
  }
  eq(bad.slice(0, 6).join(" | "), "", `${bad.length} row(s) are not this key's own index row`);
  eq(cousins.slice(0, 6).join(" | "), "", `${cousins.length} row(s) were carried in by a cousin key`);
  must(rows > 20, `only ${rows} rows were checked`);
  eq(rows, led.people, "the bands hold a different number of rows than the census claims");
  // The measures listed are mapped to this key, not to the family.
  const off = (led.measures || []).filter((m) => m && m.key && m.key !== KEY);
  eq(off.length, 0, `${off.length} measure(s) on the pane are mapped to some other key`);
  console.log(`      ${KEY}: ${led.people} readable rows · ${led.measures.length} measures · ` +
    `crumb ${LANDCORE.label} → ${MAP[KEY].label}`);

  // The scope line says the read is the CHILD, not the family.
  has(html, `Scoped to <b>${esc(MAP[KEY].label)}</b>`, "the pane does not scope itself to the child");
  has(html, "not the whole bundle", "the pane does not say the read is the key, not its family");
  // …and the sibling chips are still beside it, each still its own door.
  const kids = keyChips(html);
  for (const k of LANDS.filter((x) => x !== KEY))
    ok(kids.some((c) => c.key === k), `${k}: the sibling chip vanished once a child was committed`);
  eq(kids.filter((c) => c.open).map((c) => c.key).join(","), KEY,
    "the committed child is not the one and only lit chip");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · A sibling is a different ledger");

// THE STRONGEST FORM OF "NO REMAP TO A COUSIN" AVAILABLE. The land branch carries
// keys with hundreds of readable rows (Protect Public Lands, Energy & Resource
// Development) sitting beside keys whose formal file is genuinely empty (Keep
// Public Lands Public, Local Land Control, Practical Stewardship). If committing a
// child ever widened to its family — or fell back to the nearest cousin that has
// a record — the empty ones are exactly where it would show, as a census full of
// somebody else's rows. So each is opened as itself and each is required to print
// its OWN file, however thin that file is.
{
  const FPIp = probe.PDXConsistency.formalPatternIndex;
  const countOn = (k) => {
    let n = 0;
    for (const [pid] of corpus.byMember) if (FPIp.rowFor(pid, k)) n++;
    return n;
  };
  const kids = F.childrenOf(LANDCORE.key);
  const FULL = kids.filter((k) => k !== KEY && countOn(k) > 100);
  const EMPTY = [SIBLING, "lands_keep_public", "lands_local"].filter((k) => countOn(k) === 0);
  must(FULL.length > 0, "the land branch no longer has a second key with a deep formal file");
  must(EMPTY.length >= 2,
    "the land branch no longer has two keys with an empty formal file, which is where a cousin " +
    "remap would show");

  for (const k of [FULL[0], ...EMPTY]) {
    const w = boot();
    const html = await commit(w, k);
    const led = w.PDXDoor1._ledger(null, k);
    must(led, `${k} produced no ledger at all`);
    eq(led.key, k, `${k}: the ledger is keyed to something else`);
    // The census is about THIS key, by its own label.
    has(html, `readable formal row on <b>${esc(MAP[k].label)}</b>`,
      `${k}: the census names some other issue`);
    for (const other of [...LANDS, SIBLING].filter((x) => x !== k)) {
      no(html, `readable formal row on <b>${esc(MAP[other].label)}</b>`,
        `${k}: the census printed ${other}'s label`);
    }
    // Same family, named the same way, and the crumb still says which child.
    const cr = crumbOf(html);
    has(cr, esc(LANDCORE.label), `${k}: the crumb does not name its family`);
    has(cr, esc(MAP[k].label), `${k}: the crumb does not name the child being read`);
    // Every printed row is this key's own index row — and on an empty key that
    // means there are none, rather than a cousin's.
    const strays = [];
    for (const band of led.bands) for (const r of band.rows)
      if (!FPIp.rowFor(r.pid, k)) strays.push(r.pid);
    eq(strays.slice(0, 5).join(", "), "", `${k}: ${strays.length} row(s) have no index row on this key`);
    eq(led.people, countOn(k), `${k}: the census is not the size of this key's own file`);
    console.log(`      ${k}: ${led.people} rows · ${F.label(F.coreOf(k))} → ${MAP[k].label}`);
  }
  // And the two deep files on the same branch are different sets of people, not
  // one set printed twice under two labels.
  const a = new Set(), b = new Set();
  for (const [pid] of corpus.byMember) {
    if (FPIp.rowFor(pid, KEY)) a.add(pid);
    if (FPIp.rowFor(pid, FULL[0])) b.add(pid);
  }
  ok(a.size !== b.size || [...a].some((p) => !b.has(p)),
    `${KEY} and ${FULL[0]} print the identical set of people — two labels over one read`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · Seek still works, and now agrees with the shelf");

{
  // OPEN on a uniquely resolved key commits that key AND switches the highlighted
  // core to the key's parent, which is what stops the crumb and the chips from
  // contradicting each other.
  const D = probe.PDXDoor1;
  for (const q of ["land preserve", "lands_preserve", "Protect Public Lands"])
    eq(D.issueKeyFor(q), KEY, `"${q}" stopped resolving to ${KEY}`);
  eq(D.issueKeyFor("zzz nothing at all"), "", "a nonsense query resolved to a key");

  const w = boot();
  w.pdxDoor1Open("issue");
  eq(w.PDXDoor1._seek("land preserve"), false, "the seek form event was not swallowed");
  await tick(); await tick();
  const html = paint(w);
  has(html, "d1-led-census", "seek did not open the ledger");
  has(html, `readable formal row on <b>${esc(MAP[KEY].label)}</b>`, "seek opened somebody else's key");
  const lit = chipsIn(html, "").filter((c) => c.open && F.isCore(c.key));
  eq(lit.length, 1, "seek left no core lit, or lit more than one");
  eq(lit[0].key, LANDCORE.key, "seek did not switch the lit core to the key's parent");
  // Crumb and chips agree, which is the whole point of switching it.
  const kids = keyChips(html);
  eq(kids.filter((c) => c.open).map((c) => c.key).join(","), KEY,
    "seek lit a core whose child chips do not include the key it opened");
  has(crumbOf(html), esc(LANDCORE.label),
    "the crumb after seek names a different family than the lit core");
  // The seek control still reaches the whole register, not the thirteen.
  ok(D.trackedKeys().length > 50, "the seek control stopped reaching the whole register");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · The topic tree reads the same table");

{
  const w = boot({ withTree: true });
  must(w.PDXStanceTree && typeof w.PDXStanceTree.leaves === "function",
    "stance-tree.js did not publish leaves()");
  for (const pid of PEOPLE) {
    const leaves = w.PDXStanceTree.leaves(pid) || [];
    must(leaves.length > 8, `${pid}: only ${leaves.length} leaves — too few to prove a grouping`);
    // THE SAME ANSWER DOOR 1 USES. Not a parallel map, not "close enough".
    const wrong = leaves.filter((lf) => lf.topic !== F.coreOf(lf.key));
    eq(wrong.slice(0, 5).map((lf) => `${lf.key}→${lf.topic}≠${F.coreOf(lf.key)}`).join(" | "), "",
      `${pid}: ${wrong.length} leaf/leaves are filed under a topic coreOf does not name`);
    // …and nothing falls through, because nothing is unparented.
    const orphaned = leaves.filter((lf) => !lf.topic);
    eq(orphaned.map((lf) => lf.key).join(", "), "",
      `${pid}: ${orphaned.length} leaf/leaves landed in the trailing Other`);
    const groups = w.PDXStanceTree.groups(pid) || [];
    eq(groups.some((g) => !g.topicKey), false, `${pid}: the tree painted an Other branch`);
    const invented = groups.filter((g) => !F.isCore(g.key));
    eq(invented.map((g) => g.key).join(", "), "", `${pid}: the tree painted a branch that is not a core`);
    // Branch order is the table's order, which is Door 1's shelf order too.
    const want = CORES.map((c) => c.key).filter((k) => groups.some((g) => g.key === k));
    eq(groups.map((g) => g.key).join(","), want.join(","),
      `${pid}: the tree's branches are not in the table's declared order`);
    console.log(`      /p/${pid}: ${leaves.length} leaves in ${groups.length} families, 0 in Other`);
  }
  // The tree grouped by the table WITHOUT a map of its own: the module names no
  // core id anywhere in it.
  const tree = SRC.get("stance-tree.js");
  const named = CORES.map((c) => c.key).filter((id) => tree.indexOf(`'${id}'`) >= 0 || tree.indexOf(`"${id}"`) >= 0);
  eq(named.join(", "), "", `stance-tree.js hard-codes ${named.length} core id(s) — that is a second taxonomy`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · One palette — the chips wear the issue's own hue");

// The bug this section fences: the desk painted core and child chips as untyped
// dark pills while every other surface that names an issue — the person file's
// topic tree, the formal brief rows, the compare table, the Eye's issue hits —
// already coloured by issue-colors.js. A reader who had learned Climate, Energy &
// Land as green on /p/lee arrived at Door 1 and found its children in no family
// at all.
//
// The fix is not a palette. It is the same request every other surface makes:
// styleFor(key) hands back --pdx-ic / -soft / -wash / -ink, the surface emits it
// with the [data-ic] gate, and the stylesheet spends the variables without ever
// learning which issue it got. So the assertions below are about IDENTITY with a
// surface that already shipped, not about any particular green.
{
  // Which hexes the colour module owns. A Door 1 rule naming one of these would
  // be a second copy of the palette even on the day it happened to agree.
  const ICS = SRC.get("issue-colors.js");
  const PALETTE = [...new Set([...ICS.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map((m) => m[0].toUpperCase()))];
  must(PALETTE.length >= 13, `issue-colors.js declares only ${PALETTE.length} colours`);

  const w = boot({ withTree: true });
  const html = await commit(w, KEY);
  const tree = String(w.PDXStanceTree.html(PEOPLE[0]) || "");
  must(tree, `the topic tree painted nothing for /p/${PEOPLE[0]}`);

  // ── THE ASSERT THE SMOKE NAMES ─────────────────────────────────────────────
  // Door 1's child chip for lands_preserve carries the same token the topic tree
  // uses for that key on /p/lee. Not the same-looking colour, not a hex compared
  // by eye — the identical custom-property string, because both surfaces made the
  // same one call. This is the assertion that fails the day someone gives the desk
  // a palette of its own.
  const chip = keyChips(html).find((c) => c.key === KEY);
  must(chip, `${KEY} has no child chip to read a skin off`);
  const leafIc = treeIc(tree, KEY);
  must(leafIc, `/p/${PEOPLE[0]}'s tree has no leaf for ${KEY} to compare against`);
  ok(chip.themed, `${KEY}: the chip carries no data-ic gate, so its hue cannot reach the CSS`);
  eq(chip.ic, leafIc,
    `${KEY}: the Door 1 chip is not the token the topic tree uses on /p/${PEOPLE[0]}`);
  for (const step of ["--pdx-ic:", "--pdx-ic-soft:", "--pdx-ic-wash:", "--pdx-ic-ink:"])
    has(chip.ic, step, `${KEY}: the chip's skin is missing ${step}`);
  console.log(`      ${KEY}: desk chip === /p/${PEOPLE[0]} tree leaf === ${chip.ic.split(";")[0]}`);

  // ── ONE HUE PER FAMILY, INCLUDING THE KEYS THAT HAVE NO COLOUR OF THEIR OWN ─
  // No key below a core carries its own entry in the palette; every one of them
  // resolves through the parent table to the core's hue. That is the "inherit the
  // parent core's hue" clause, and it is why there is no fourteenth colour: the
  // whole branch is one family to look at, exactly as the tree paints it.
  const kids = keyChips(html);
  must(kids.length >= 5, `only ${kids.length} child chips to compare`);
  const offFamily = kids.filter((c) => c.ic !== leafIc).map((c) => c.key);
  eq(offFamily.slice(0, 5).join(", "), "",
    `${offFamily.length} child chip(s) on ${LANDCORE.key} wear a hue that is not the family's`);
  const unthemed = kids.filter((c) => !c.themed).map((c) => c.key);
  eq(unthemed.slice(0, 5).join(", "), "", `${unthemed.length} child chip(s) painted with no hue at all`);
  // The lit core chip took the same hue its branch has on the person file.
  const core = chipsIn(html, "").find((c) => c.key === LANDCORE.key);
  must(core, "the lit core chip could not be read off the shelf");
  eq(core.ic, treeBranchIc(tree, LANDCORE.key),
    `${LANDCORE.key}: the core chip is not the token the tree's branch uses`);
  // …and the crumb over the census carries it too, which is the third place a
  // reader sees the family named on this pane.
  eq(crumbIc(html), leafIc, "the crumb does not carry the family's hue");
  // Every core on the shelf is themed, and thirteen cores means thirteen hues:
  // no two families collapsed into one colour by an accident of the lookup.
  const cores = chipsIn(html, "").filter((c) => F.isCore(c.key));
  eq(cores.filter((c) => !c.themed).map((c) => c.key).join(", "), "", "a core chip painted with no hue");
  const hues = new Set(cores.map((c) => (c.ic.match(/--pdx-ic:([^;]*)/) || [])[1]));
  eq(hues.size, cores.length, `${cores.length} cores are sharing ${hues.size} hues`);

  // ── LIT AND UNLIT ARE TWO STEPS OF THE ONE HUE ─────────────────────────────
  // The state a reader can see is carried in the CSS, not in a second token: the
  // same four variables reach both rules and the difference is which step they
  // spend. So an unlit chip is the quiet fill and a lit one is the loud one, and
  // nothing about that depends on which issue it is.
  const ruleFor = (sel) => {
    const i = CSS.indexOf(sel + " {");
    return i < 0 ? "" : CSS.slice(i, CSS.indexOf("}", i) + 1);
  };
  const unlit = ruleFor(".d1-chip[data-ic]");
  const lit = ruleFor(".d1-chip[data-ic].is-open");
  must(unlit && lit, "the [data-ic] chip rules are not in door1-workspace.css");
  has(unlit, "var(--pdx-ic-soft", "the unlit chip does not use the quiet step of the hue");
  has(lit, "var(--pdx-ic-wash", "the lit chip does not use the loud step of the hue");
  ok(unlit.indexOf("--pdx-ic-wash") < 0, "the unlit chip already spends the loud step, so lit reads the same");
  has(unlit, "var(--pdx-ic,", "the unlit chip's border is not the hue");
  has(lit, "var(--pdx-ic,", "the lit chip's border is not the hue");
  has(unlit, "var(--pdx-ic-ink", "the unlit chip's label is not the readable step of the hue");
  // KEYBOARD FOCUS IS VISIBLE. The chips were reachable by tab before this pass
  // and drew the browser default over a dark pill; a hue-tinted ring is only an
  // improvement if there is a ring at all, so both halves are asserted.
  has(CSS, ".d1-chip:focus-visible", "a Door 1 chip has no focus ring");
  has(ruleFor(".d1-chip:focus-visible"), "outline", "the chip's focus rule draws no outline");
  has(ruleFor(".d1-chip[data-ic]:focus-visible"), "var(--pdx-ic-ink",
    "the themed chip's focus ring is not tinted with the hue it belongs to");

  // ── AN EMPTY CHILD IS STILL A REAL KEY ─────────────────────────────────────
  // Keep Public Lands Public holds no readable row and no mapped measure. The
  // honest answer to that is a census that says so — not a hidden chip, not a
  // cousin's ledger painted under this key's name, and not a chip greyed out of
  // its family so a reader reads "broken" where the site means "nothing yet".
  const EMPTY = "lands_keep_public";
  const eHtml = await commit(w, EMPTY);
  const eChip = keyChips(eHtml).find((c) => c.key === EMPTY);
  must(eChip, `${EMPTY}: the chip is gone once its own ledger is open`);
  eq(eChip.ic, leafIc, `${EMPTY}: the empty child was painted outside its family's hue`);
  ok(eChip.themed, `${EMPTY}: the empty child lost its hue gate`);
  ok(eChip.open, `${EMPTY}: tapping the empty child did not light it`);
  eq(treeIc(tree, EMPTY), leafIc,
    `${EMPTY}: the tree and the desk disagree about the empty key's hue`);
  const eLed = w.PDXDoor1._ledger(null, EMPTY);
  must(eLed, `${EMPTY}: no ledger object at all`);
  eq(eLed.people, 0, `${EMPTY} is no longer the empty case this section is about`);
  eq((eLed.measures || []).length, 0, `${EMPTY} now has mapped measures — pick another empty key`);
  has(eHtml, `<b>0</b> people have a readable formal row on <b>${esc(MAP[EMPTY].label)}</b>.`,
    "the empty census does not say 0 people on this key's own label");
  has(eHtml, "No measure on file is mapped to this key yet.",
    "the empty census dropped the no-measure sentence");
  // The blank-lane sentence is still the floor's own words, not this file's.
  const NOTE = (w.PDXConsistency.menu.PHRASES.no_vehicle || {}).note || "";
  must(NOTE, "the menu's no_vehicle phrase is gone, so there is nothing to inherit");
  has(eHtml, esc(NOTE), "the empty pane stopped carrying the menu/calendar sentence");
  eq(crumbIc(eHtml), leafIc, "the empty child's crumb lost the family hue");
  has(crumbOf(eHtml), esc(MAP[EMPTY].label), "the empty child's crumb does not name it");
  console.log(`      ${EMPTY}: themed, lit, 0 rows · 0 measures, census and calendar sentence intact`);

  // ── NO SECOND PALETTE ANYWHERE IN THE PASS ─────────────────────────────────
  // The desk names no colour of its own at all: every hue it emits arrived from
  // styleFor(). A hex in this module would be a colour no other surface could be
  // changed with.
  const jsHex = [...DESK.matchAll(/#[0-9A-Fa-f]{3,8}\b/g)].map((m) => m[0]);
  eq(jsHex.slice(0, 5).join(" "), "",
    `door1-workspace.js hard-codes ${jsHex.length} colour(s) of its own`);
  // …and it asks for a skin rather than reading the palette's tables. The whole
  // surface it touches is the three read-only questions every other consumer
  // asks; reaching CORE_ISSUE_COLORS or ALIASES directly would be re-deriving a
  // resolution that already has one owner.
  const ASKED = ["styleFor", "getIssueColor", "isCore"];
  const iSkin = DESK.indexOf("function colors()");
  must(iSkin > 0, "the desk's issue-skin helpers are not where this audit looks for them");
  const SKIN = DESK.slice(iSkin, DESK.indexOf("function coreOf(", iSkin));
  must(SKIN.indexOf("window.PDXIssueColors") > 0 && SKIN.indexOf("skinAttrs") > 0,
    "the issue-skin block could not be isolated from door1-workspace.js");
  const touchedIC = [...new Set([...SKIN.matchAll(/\bC\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))];
  must(touchedIC.length > 0, "the desk names no PDXIssueColors member at all");
  const reached = touchedIC.filter((m) => ASKED.indexOf(m) < 0);
  eq(reached.join(", "), "",
    `the desk reaches ${reached.length} palette member(s) beyond ${ASKED.join("/")}`);
  // And no chip or crumb rule in the stylesheet names a hex the palette owns. The
  // hexes those rules DO carry are var() fallbacks in the neutral chrome range —
  // what a chip looks like on a page where the colour module did not load — which
  // is the same fallback discipline every other [data-ic] surface uses.
  const chipRules = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => /d1-chip|d1-led-crumb|d1-crumb-/.test(m[1]));
  must(chipRules.length >= 8, `only ${chipRules.length} chip/crumb rules found to audit`);
  const stolen = [];
  for (const r of chipRules)
    for (const h of r[2].matchAll(/#[0-9A-Fa-f]{3,8}\b/g))
      if (PALETTE.indexOf(h[0].toUpperCase()) >= 0) stolen.push(`${r[1].trim()} → ${h[0]}`);
  eq(stolen.slice(0, 4).join(" | "), "",
    `${stolen.length} Door 1 rule(s) hard-code a hex issue-colors.js owns`);
  // Every themed rule reads the hue through the variables, so the palette stays
  // the one place a colour changes.
  const themedRules = chipRules.filter((m) => m[1].indexOf("[data-ic]") >= 0);
  must(themedRules.length >= 4, `only ${themedRules.length} [data-ic] rules to audit`);
  const mute = themedRules.filter((m) => m[2].indexOf("var(--pdx-ic") < 0).map((m) => m[1].trim());
  eq(mute.join(" | "), "", `${mute.length} [data-ic] rule(s) do not spend the hue variables`);
  // The gate spelling is the shared one. issue-compare.css and app.css already
  // read [data-ic]; a private attribute here would need a private stylesheet.
  has(DESK, 'data-ic="1"', "the desk does not emit the shared [data-ic] gate");
  console.log(`      ${PALETTE.length} palette colours, 0 copied into Door 1; ` +
    `${themedRules.length} themed rules, all through var(--pdx-ic*)`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · No figure moved");

{
  const A = boot({ withoutFamily: true, withoutDesk: true });
  const B = boot({ withTree: true });
  must(A.PDXWordAction && typeof A.PDXWordAction.heroHtml === "function",
    "word-action.js did not boot without the family module");
  must(!A.PDXIssueFamily, "the family module loaded on the boot that is supposed to omit it");
  const prof = (w, pid) => (w.PROFILES && w.PROFILES[pid]) || null;
  const drifted = [], dm = [];
  for (const [pid] of corpus.byMember) {
    if (String(B.PDXWordAction.heroHtml(pid, prof(B, pid)) || "") !==
        String(A.PDXWordAction.heroHtml(pid, prof(A, pid)) || "")) drifted.push(pid);
    for (const sc of Object.keys(A.PDXConsistency.SCOPES)) {
      if (JSON.stringify(B.PDXConsistency.scopedOverall(sc, pid)) !==
          JSON.stringify(A.PDXConsistency.scopedOverall(sc, pid))) dm.push(`${pid}/${sc}`);
    }
  }
  eq(drifted.slice(0, 6).join(" "), "",
    `${drifted.length} formal brief(s) moved when the family table loaded`);
  eq(dm.slice(0, 6).join(" "), "", `Direction Match drifted on ${dm.length} reads`);
  console.log(`      ${corpus.byMember.size} members swept: no drift in any brief or Direction Match read`);

  // …and painting a child ledger does not move them either.
  const C = boot();
  const before = {};
  for (const pid of [...PEOPLE, "curtis", "maloy"]) {
    before[pid] = String(C.PDXWordAction.heroHtml(pid, prof(C, pid)) || "");
    before[pid + "|dm"] = JSON.stringify(C.PDXConsistency.scopedOverall("all", pid));
  }
  await commit(C, KEY);
  await commit(C, SIBLING);
  for (const pid of [...PEOPLE, "curtis", "maloy"]) {
    eq(String(C.PDXWordAction.heroHtml(pid, prof(C, pid)) || ""), before[pid],
      `${pid}: the formal brief moved after a child ledger painted`);
    eq(JSON.stringify(C.PDXConsistency.scopedOverall("all", pid)), before[pid + "|dm"],
      `${pid}: Direction Match moved after a child ledger painted`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("10 · No second lane in the copy");

{
  const panes = [CHILD.html, SHELF.html];
  for (const html of panes) {
    // The word-vs-action lane's headline does not run on a family or a ledger.
    for (const banned of ["backs up their words", "Ranked by consistency", "ranked by consistency",
                          "most conservative", "Most conservative"]) {
      no(html, banned, `a consistency ranking heading reached the issue family pane ("${banned}")`);
    }
    for (const banned of ["%", "Grade", "grade of", "Republicans first", "by party"]) {
      no(html, banned, `a second lane reached the issue family pane ("${banned}")`);
    }
  }
  // The crumb is copy: two labels and an arrow, no figure of any kind.
  const crumb = crumbOf(CHILD.html);
  eq(/\d/.test(crumb.replace(/<[^>]*>/g, "")), false, "the crumb printed a number");
  // The new stylesheet block names no issue and no party.
  for (const id of CORES.map((c) => c.key)) no(CSS, id, `door1-workspace.css names an issue (${id})`);
  for (const p of ["republican", "democrat", "-party"]) no(CSS.toLowerCase(), p, `door1-workspace.css names a party (${p})`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("11 · The assets travel together");

{
  // The family module is a SHELL asset: a warm device holding the previous
  // version would pair the new desk and the new tree with no table reader at all,
  // and because both are guarded that failure would be silent — the lands_* chips
  // simply absent again, which is the exact bug this pass closes.
  has(SW, "'/pdx-issue-family.js'", "the family module is not precached");
  for (const f of ["'/'", "'/alignment-tool.js'", "'/door1-workspace.js'",
                   "'/door1-workspace.css'", "'/stance-tree.js'"]) {
    has(SW, f, `${f} is not precached, so it can go stale against the table`);
  }
  // AND THE PALETTE, for the same reason in the other direction: the desk's chips
  // now get their colour from it, and a stylesheet that spends var(--pdx-ic*)
  // paired with a page whose colour module never loaded is a chip with a gate and
  // no hue. Both halves are guarded — the fallbacks in the CSS are what a reader
  // sees — but the pairing should not be left to a cache.
  has(SW, "'/issue-colors.js'", "the colour module is not precached, so a chip's hue can go stale");
  has(PAGE, "/issue-colors.js", "the colour module is not wired into index.html");
  const m = SW.match(/CACHE_VERSION\s*=\s*'v(\d+)'/);
  must(m, "sw.js no longer carries a CACHE_VERSION this file can read");
  const v = Number(m[1]);
  ok(v >= 109, `CACHE_VERSION is v${v} — the shell moved and the version did not`);
  has(SW, `// v${v} - `, `there is no log entry for v${v} naming what moved`);
  const iLog = SW.indexOf(`// v${v} - `);
  const entry = SW.slice(iLog, SW.indexOf("const CACHE_VERSION", iLog));
  must(entry.length > 200, `the v${v} entry is too short to be naming anything`);
  for (const f of ["pdx-issue-family.js", "alignment-tool.js", "door1-workspace.js",
                   "door1-workspace.css", "stance-tree.js", "index.html", "issue-colors.js"]) {
    has(entry, f, `the v${v} entry does not name ${f} among the files that must travel together`);
  }
  has(entry, "Direction Match", `the v${v} entry does not say what did NOT move`);
  // Wired into the page, after the table it reads.
  has(PAGE, "/pdx-issue-family.js", "the family module is not wired into index.html");
  ok(PAGE.indexOf("/alignment-tool.js") < PAGE.indexOf("/pdx-issue-family.js"),
    "the family module is loaded before the table it reads");
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ issue family: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("   · " + f);
  process.exit(1);
}
console.log(`✓ issue family: all ${passed} assertions passed — 13 cores, ${PUBLISHED.length} children, 0 orphans, 1 table\n`);
