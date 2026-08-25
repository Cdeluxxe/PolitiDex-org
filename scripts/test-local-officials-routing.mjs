#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-local-officials-routing.mjs — "my local officials" stays local
// ─────────────────────────────────────────────────────────────────────────────
// THE BUG THIS FILE EXISTS TO KEEP FIXED, exactly as a visitor met it on mobile:
// tap "See who represents me", then tap "My local officials", and land on a list
// headed by the President and the federal Cabinet — thirty-nine appointed
// officials and thirteen executive figures, none of them local, most of them not
// even in the visitor's state.
//
// It was not a data error. Every name on that list was real and correctly
// labelled. It was a ROUTING error assembled from three innocent-looking parts:
//
//   1. The button was gated on reps.districtsResolvable — a flag that is true
//      for the whole of Utah. Local rosters are curated county by county, so the
//      offer was made in areas that had no local seats at all.
//   2. compare-hub's local classifier returns nothing when it cannot place the
//      visitor in a county, so those areas render no `local` group.
//   3. jumpToRelevantAccordion() falls back to scrolling #relevant-section when
//      the group it wants is missing — and that section's FIRST groups are
//      president and cabinet, which are added before the state check and are
//      therefore national for every visitor in every state.
//
// So a promise nobody could keep, a silent empty set, and a helpful fallback
// composed into the single worst answer this site can give: other people's
// officials, under your city's name.
//
// The fix is that local coverage stops being inferred and becomes ANSWERED, once,
// by window.pdxLocalSeatsForMe(), read by every entry point and by the jump
// itself. This file holds that answer to four properties:
//
//   A. IT AGREES WITH WHAT RENDERS. The coverage count and the ballot's own
//      `local` group are the same set, in every area. A gate that disagrees with
//      the surface it gates is the original bug in a new costume.
//   B. IT NEVER LEAVES THE COUNTY. No pid it returns is outside the visitor's
//      state, and none belongs to another curated county.
//   C. NO COUNTY, NO CLAIM. An area we cannot place resolves to zero seats —
//      never to the statewide or national field.
//   D. ZERO SEATS ROUTES NOWHERE. jumpToRelevantAccordion('local') with no
//      coverage does not scroll #relevant-section. This is the assertion that
//      would have caught the shipped bug on its own.
//
// And one control: #relevant-section really does contain national figures, so
// property D is guarding something rather than passing vacuously.
//
//   node scripts/test-local-officials-routing.mjs
//
// Real shipped modules in a node:vm sandbox against real profile data. No
// database, no network, no browser.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m}\n    got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const must = (c, m) => { if (!c) { console.error(`✗ local officials routing: ${m}`); process.exit(1); } passed++; };

// ── The sandbox ──────────────────────────────────────────────────────────────
// The same module set the Relevant-to-Me ballot needs to classify and place a
// politician. Loaded in dependency order; anything that throws is recorded rather
// than swallowed, because a silently missing module makes every property below
// pass for the wrong reason.
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "profile-spine.js", "issue-colors.js", "my-stances.js", "voter-hub-location.js",
  "compare-hub.js", "ballot-breakdown.js", "race-sheet.js",
];

// A DOM small enough to reason about and real enough to render into: an id
// registry, one generic element shape, and a scrollIntoView that RECORDS rather
// than no-ops — property D is a statement about what did not get scrolled.
function miniDom(win, ids) {
  const byId = {};
  const el = (id) => {
    const node = {
      id: id || "", className: "", textContent: "",
      style: {}, dataset: {}, children: [], _scrolled: 0, _html: "",
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute(k, v) { this["attr_" + k] = v; },
      getAttribute(k) { return k in this ? this["attr_" + k] ?? null : null; },
      removeAttribute() {}, addEventListener() {}, removeEventListener() {},
      appendChild(c) { this.children.push(c); if (c && c.id) byId[c.id] = c; return c; },
      removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, click() {},
      scrollIntoView() { this._scrolled++; },
      querySelector() { return null; }, querySelectorAll() { return []; },
    };
    // A browser makes every id inside assigned markup addressable, and this test
    // is precisely about whether the jump can address the group the render just
    // emitted. So writing innerHTML registers the ids it contains, the way the
    // real DOM would — otherwise "the group is unreachable" would be an artefact
    // of the harness rather than a claim about the product.
    Object.defineProperty(node, "innerHTML", {
      get() { return node._html; },
      set(v) {
        node._html = String(v == null ? "" : v);
        const re = /\sid="([^"]+)"/g;
        let m;
        while ((m = re.exec(node._html)) !== null) {
          if (!byId[m[1]]) byId[m[1]] = el(m[1]);
        }
      },
    });
    return node;
  };
  (ids || []).forEach((i) => { byId[i] = el(i); });
  win.document.createElement = () => el("");
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = el("body");
  win.document.body.appendChild = function (c) { if (c && c.id) byId[c.id] = c; return c; };
  win.document.querySelector = () => null;
  win.document.querySelectorAll = () => [];
  return byId;
}

const DOM_IDS = [
  "relevant-browse-grid", "relevant-count-badge", "relevant-location-text",
  "relevant-grid-hint", "relevant-guided-status", "relevant-section",
  // compare-hub syncs its compare-tray chrome once at load; without these it
  // throws partway through the file and half the module is silently absent.
  "chub-empty", "chub-count", "chub-launch-bar", "chub-sel-pills",
  "chub-launch-btn", "chub-launch-hint",
];

function boot(loc) {
  const win = makeSandbox();
  const store = {}, sess = {};
  win.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; },
  };
  win.sessionStorage = {
    getItem: (k) => (k in sess ? sess[k] : null),
    setItem: (k, v) => { sess[k] = String(v); }, removeItem: (k) => { delete sess[k]; },
  };
  win.auth = { currentUser: null };
  win._cmpSelected = new Set();
  const byId = miniDom(win, DOM_IDS);
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  // Defined in index.html rather than a module, and read by the card renderer.
  // Returning null is the "no score on file" answer, which is what keeps this
  // test about routing rather than about scoring.
  win._pdxDisplayScore = () => null;
  const loadErrors = [];
  for (const f of FILES) {
    try { vm.runInContext(R(f), sandbox, { filename: f }); }
    catch (e) { loadErrors.push(`${f}: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
  win._hasUserLocation = !!(loc && loc.state);
  win._currentVoterLocation = loc || null;
  return { win, byId, loadErrors };
}

const base = boot({ state: "Utah", city: "Provo", county: "Utah County", district: "3" });
must(base.loadErrors.length === 0,
  "the sandbox could not load a module, so every property below would pass against a stub:\n    " +
  base.loadErrors.join("\n    "));
must(typeof base.win.pdxLocalSeatsForMe === "function",
  "window.pdxLocalSeatsForMe is not exported. It is the single answer every local entry point is\n" +
  "    gated on; without it each caller goes back to inferring coverage from the state, which is the\n" +
  "    bug this file is named after");
must(typeof base.win.jumpToRelevantAccordion === "function",
  "window.jumpToRelevantAccordion is not exported — the routing under test does not exist");

// The areas worth asking about: two curated counties, a curated county whose
// local roster happens to be empty, an out-of-state area, an area we cannot
// place, and no location at all.
const AREAS = [
  { label: "Utah County (curated)",      loc: { state: "Utah", city: "Provo", county: "Utah County", district: "3" } },
  { label: "Davis County (curated)",     loc: { state: "Utah", city: "Bountiful", county: "Davis", district: "1" } },
  { label: "Washington County",          loc: { state: "Utah", city: "St. George", county: "Washington County", district: "2" } },
  { label: "Salt Lake County",           loc: { state: "Utah", city: "Salt Lake City", county: "Salt Lake County", district: "2" } },
  { label: "Weber County",               loc: { state: "Utah", city: "Ogden", county: "Weber County", district: "1" } },
  { label: "Ohio (outside coverage)",    loc: { state: "Ohio", city: "Columbus", county: "Franklin County", district: "" } },
  { label: "Utah, county unresolved",    loc: { state: "Utah", city: "", county: "", district: "" } },
  { label: "National pseudo-location",   loc: { state: "National" } },
  { label: "no location at all",         loc: null },
];

const runs = AREAS.map((a) => {
  const r = boot(a.loc);
  let threw = null;
  try { r.win.renderRelevantToMe(); } catch (e) { threw = e; }
  return { ...a, ...r, threw, cov: r.win.pdxLocalSeatsForMe(),
           groups: r.win._relevantLastOfficeGroups || {} };
});

// ── A · The gate agrees with what renders ────────────────────────────────────
// Stated as an identity over sets, not a count comparison: a gate that promised
// three seats and opened a group of two would be just as broken as one that
// promised seats where the group does not exist.
const sorted = (a) => (a || []).slice().sort().join(",");
runs.forEach((r) => {
  ok(!r.threw, `${r.label}: rendering the ballot threw — ${r.threw && r.threw.message}`);
  eq(sorted(r.cov.pids), sorted(r.groups.local),
    `${r.label}: pdxLocalSeatsForMe disagrees with the local group the ballot actually renders.\n` +
    "    These two must be the same set by construction — the coverage answer gates a button whose\n" +
    "    only job is to open that group, so any drift is a promise the surface cannot keep");
  eq(r.cov.ok, (r.groups.local || []).length > 0,
    `${r.label}: the ok flag and the rendered local group disagree about whether coverage exists`);
});

// ── B · It never leaves the county ───────────────────────────────────────────
// The reported symptom was out-of-state people. This is that symptom, negated,
// at the resolver rather than at the surface.
const CURATED = ["Davis", "Utah", "Washington", "Weber", "Salt Lake", "Grand"];
runs.filter((r) => r.cov.ok).forEach((r) => {
  const stray = [];
  const foreignCounty = [];
  r.cov.pids.forEach((pid) => {
    const d = r.win.CMP_DATA[pid];
    if (!d) { stray.push(pid + " (no record)"); return; }
    const st = r.win._pdxNormalizeState ? r.win._pdxNormalizeState(d.state || "", pid) : (d.state || "");
    const homeState = String(r.loc.state).toLowerCase();
    const declared = String(st || "").toLowerCase();
    // A local record may file its COUNTY in the state field ("Salt Lake County"
    // for a Salt Lake City mayor). That is data shape, and it is accepted only
    // when it names this visitor's own county.
    const countyShaped = declared.replace(/\s*county\s*/g, "").trim() ===
      String(r.cov.county || "").toLowerCase().replace(/\s*county\s*/g, "").trim();
    if (declared && declared !== homeState && !countyShaped) stray.push(`${pid} (${d.state})`);
    // No pid may name a DIFFERENT curated county than the visitor's.
    const mine = String(r.cov.county || "").replace(/\s*County\s*/g, "").trim();
    const label = ((r.win._pdxNormalizeState ? "" : "") + " " + (d.office || "") + " " + (d.state || "")).toLowerCase();
    CURATED.forEach((c) => {
      if (c === mine) return;
      // "Utah" is the state name as well as a county name, so it can never be
      // read as a foreign-county signal.
      if (c === "Utah") return;
      if (label.indexOf(c.toLowerCase()) !== -1) foreignCounty.push(`${pid} (${d.office})`);
    });
  });
  eq(stray.length, 0,
    `${r.label}: the local set contains someone from outside the visitor's state — this IS the\n` +
    "    reported bug, measured at the resolver: " + JSON.stringify(stray));
  eq(foreignCounty.length, 0,
    `${r.label}: the local set names another curated county's officials, so two neighbouring\n` +
    "    visitors would be shown each other's mayors: " + JSON.stringify(foreignCounty));
});

// ── C · No county, no claim ──────────────────────────────────────────────────
// Widening is the tempting fix and the wrong one: a located visitor with no
// county has a real, sayable answer ("we cannot place you"), and substituting
// the statewide or national field for it is how the section filled with strangers.
const byLabel = (l) => runs.find((r) => r.label === l);

const noCounty = byLabel("Utah, county unresolved");
eq(noCounty.cov.resolved, true,
  "county unresolved: a located visitor reads as unresolved, so the surface says nothing instead of\n" +
  "    naming the gap. Located-with-no-coverage and not-located-yet are different claims");
eq(noCounty.cov.ok, false,
  "county unresolved: coverage came back true without a county to place anyone in. There is no\n" +
  "    honest way to name a mayor for an area we cannot locate");
eq(noCounty.cov.pids.length, 0,
  "county unresolved: local seats were returned for a visitor we cannot place — widening to the\n" +
  "    state field is precisely what surfaced strangers under the visitor's own city name");

const ohio = byLabel("Ohio (outside coverage)");
eq(ohio.cov.resolved, true, "Ohio: a located visitor outside curated coverage reads as unresolved");
eq(ohio.cov.ok, false,
  "Ohio: local coverage claimed outside the curated counties. Nothing in the roster can answer for\n" +
  "    Franklin County, and saying otherwise routes the visitor to someone else's officials");

const national = byLabel("National pseudo-location");
eq(national.cov.resolved, false,
  '"National" is a pseudo-location, not a place. Treating it as resolved would let the band assert a\n' +
  "    local gap for a visitor who has not told us where they are");
const nowhere = byLabel("no location at all");
eq(nowhere.cov.resolved, false,
  "no location: coverage reported an answer before the visitor gave us anywhere to answer about");
eq(nowhere.cov.ok, false, "no location: coverage came back ok with no location at all");

// At least one curated area must actually resolve seats, or A/B above are vacuous
// and this whole file proves only that nothing works.
const covered = runs.filter((r) => r.cov.ok);
must(covered.length >= 2,
  "fewer than two areas resolved any local seats at all, so the agreement and containment properties\n" +
  "    above are passing over empty sets. Either the local rosters are gone or the classifier is");

// ── D · Zero coverage routes nowhere ─────────────────────────────────────────
// The assertion that would have caught the shipped bug by itself.
const jumpRuns = ["Weber County", "Ohio (outside coverage)", "Utah, county unresolved"].map((l) => {
  const r = boot(byLabel(l).loc);
  try { r.win.renderRelevantToMe(); } catch (e) {}
  const section = r.byId["relevant-section"];
  const before = section._scrolled;
  r.win._showToast = (m) => { r.win.__toast = m; };
  r.win.openLocationModal = () => { r.win.__modal = true; };
  try { r.win.jumpToRelevantAccordion("local"); } catch (e) { r.win.__threw = e; }
  return { label: l, run: r, section, before, cov: r.win.pdxLocalSeatsForMe() };
});
jumpRuns.forEach((j) => {
  ok(!j.run.win.__threw, `${j.label}: the local jump threw — ${j.run.win.__threw && j.run.win.__threw.message}`);
  eq(j.cov.ok, false, `${j.label}: expected an area with no local coverage; the case is mis-chosen`);
  eq(j.section._scrolled, j.before,
    `${j.label}: with no local seats, jumpToRelevantAccordion('local') still scrolled the visitor to\n` +
    "    #relevant-section. That section leads with the President and Cabinet groups, so this single\n" +
    "    line is the whole reported bug: tap 'my local officials', get the federal executive");
  ok(typeof j.run.win.__toast === "string" && j.run.win.__toast.length > 0,
    `${j.label}: the local jump went nowhere and said nothing. A tap that produces no visible result\n` +
    "    reads as a broken button; the gap has to be stated");
  ok(/local offices|set your area/i.test(j.run.win.__toast || ""),
    `${j.label}: the message does not say what is missing — got ${JSON.stringify(j.run.win.__toast)}`);
});

// The control. If #relevant-section did NOT contain national figures, property D
// would be guarding nothing and could be deleted. It does, so it cannot.
const ctrl = byLabel("Ohio (outside coverage)");
const ctrlHtml = ctrl.byId["relevant-browse-grid"].innerHTML || "";
ok((ctrl.groups.president || []).length > 0 && (ctrl.groups.cabinet || []).length > 0,
  "control: the ballot no longer renders president/cabinet groups for an out-of-coverage visitor, so\n" +
  "    the scroll-fallback property above may be guarding nothing. Re-derive it before deleting");
ok(ctrlHtml.indexOf("relevant-browse-group-local") === -1,
  "control: an area with no local seats still emitted a local group container. The jump would find\n" +
  "    it, expand it, and present an empty list as the visitor's local government");

// A curated area, by contrast, must emit the group the button promises to open.
const good = covered[0];
ok((good.byId["relevant-browse-grid"].innerHTML || "").indexOf("relevant-browse-group-local") !== -1,
  `${good.label}: coverage says there are local seats but the ballot rendered no local group for the\n` +
  "    button to open — the offer would be honoured by a scroll to nothing");

// And the jump into a covered area must land ON that group, not on the section.
{
  const r = boot(good.loc);
  try { r.win.renderRelevantToMe(); } catch (e) {}
  r.win.toggleBrowseAccordion = () => {};
  const section = r.byId["relevant-section"];
  const secBefore = section._scrolled;
  try { r.win.jumpToRelevantAccordion("local"); } catch (e) { r.win.__threw = e; }
  ok(!r.win.__threw, `${good.label}: the local jump threw on a covered area — ${r.win.__threw && r.win.__threw.message}`);
  const group = r.byId["relevant-browse-group-local"];
  ok(!!group, `${good.label}: the local group is not addressable by id, so the jump cannot target it`);
  ok(group && group._scrolled > 0,
    `${good.label}: the jump did not scroll to the local group it exists to open`);
  eq(section._scrolled, secBefore,
    `${good.label}: the jump scrolled the whole ballot section as well as the local group, which puts\n` +
    "    the President and Cabinet groups back in the visitor's way on the one path that was working");
}

if (failures.length) {
  console.error(`\n✗ local officials routing: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
console.log(`✓ local officials routing: all ${passed} assertions passed — ${AREAS.length} areas, one coverage answer, no route out of the county`);
