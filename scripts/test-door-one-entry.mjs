#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-door-one-entry.mjs — Door 1 is an entry system, not a brochure
// ─────────────────────────────────────────────────────────────────────────────
// WHAT DOOR 1 WAS. One header, then five full-width sections stacked vertically:
// a live proof strip, a single receipt card, a receipts carousel, an issue
// ranking grid, and the H.R.1 / omnibus showcase. Each one re-explained "what
// they said against what they actually did" before it let the reader do anything,
// so the section that owns the product's whole year-round job read as a brochure:
// several screens of premise on a phone, and no surface to work in. Informative
// and low-agency at once.
//
// WHAT IT IS NOW. A header, five doors, and one strip of live proof. The doors
// are the navigation — person, claim, issue, bill/vote, my people — and the
// sections they used to scroll past are what the doors open.
//
// The properties this file pins, each one a way the restructure could quietly
// undo itself:
//
//   1. THE DOORS EXIST AND ARE THE FIRST THING UNDER THE HEADER. Five of them,
//      one per intent, above the live-proof strip. If they slide below the
//      surfaces they open, the scroll is back.
//   2. THE WORK LAYER STARTS CLOSED, AND CONTAINS ALL FOUR SURFACES. Not
//      deleted, not re-parented at runtime, not left open with a smaller font.
//   3. EVERY DOOR ROUTES TO A MODULE THAT ALREADY SHIPPED. No door invents a
//      surface, and no door hard-codes a scroll offset instead of an intent.
//   4. NO INBOUND ANCHOR IS STRANDED. Every href/hash in the repo that names a
//      surface inside the closed layer is reachable, because the hash handler
//      opens the layer for it.
//   5. THE PHILOSOPHY IS STATED ONCE. The header says it; the doors do not
//      re-say it. This is the "stop restating the same thing in five full-width
//      sections" requirement, measured as a count.
//   6. NOTHING WAS WEAKENED TO GET HERE. Door 1's fail-closed gate still names
//      all five surfaces, the surface-dependent doors prune themselves, no
//      module was re-pointed, no second score or bare percentage appeared, and
//      no party framing entered the chooser.
//
//   node scripts/test-door-one-entry.mjs
//
// Static analysis of the shipped index.html plus a node:vm run of the router and
// the gate. No database, no network, no browser.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const INDEX = readFileSync(join(ROOT, "index.html"), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m}\n    got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const must = (c, m) => { if (!c) { console.error(`✗ door one entry: ${m}`); process.exit(1); } passed++; };

const at = (needle) => INDEX.indexOf(needle);

// ── 1 · The doors, and their position ────────────────────────────────────────
const MODES = ["person", "claim", "issue", "bill", "mine"];
must(at('id="pdx-door-modes"') !== -1,
  "index.html has no #pdx-door-modes. The door chooser IS the restructure — without it Door 1 is\n" +
  "    back to being a header over a stack of sections");
for (const m of MODES) {
  ok(INDEX.indexOf(`window.pdxDoor('${m}')`) !== -1,
    `door "${m}" has no button wired to window.pdxDoor. Five intents were specified because they are\n` +
    "    the five things a visitor arrives wanting; a missing one is a direction they cannot choose");
}
eq((INDEX.match(/window\.pdxDoor&&window\.pdxDoor\('/g) || []).length, MODES.length,
  "the chooser does not carry exactly five doors. More is the brochure creeping back in a new shape;\n" +
  "    fewer is an intent with no entry point");

const POS = {
  bridge: at('id="pdx-door-truth"'),
  modes: at('id="pdx-door-modes"'),
  proof: at('id="live-proof"'),
  work: at('id="pdx-door-work"'),
  sayvsdo: at('id="say-vs-do"'),
};
ok(POS.bridge < POS.modes,
  "the doors sit above Door 1's own header, so the header no longer introduces them");
ok(POS.modes < POS.proof,
  "the live-proof strip comes BEFORE the doors. Proof is meant to be visible and secondary — first\n" +
  "    is not secondary, and it puts content between the header and the navigation again");
ok(POS.proof < POS.work,
  "the work layer opens above the proof strip, which buries the one piece of live evidence that\n" +
  "    survives on the first screen");
ok(POS.work < POS.sayvsdo,
  "#say-vs-do is outside the work layer, so the longest of the demoted sections is still a mandatory\n" +
  "    scroll on the main Door 1 path");

// ── 2 · The work layer starts closed and holds all four surfaces ─────────────
const WORK_SURFACES = ["hero-receipt", "say-vs-do", "issue-front-door", "hr1-showcase"];
const workOpen = at('<div id="pdx-door-work">');
const workClose = at("</div><!-- /#pdx-door-work -->");
must(workOpen !== -1 && workClose > workOpen,
  "#pdx-door-work is not a closed container in the document. The surfaces it should hold would then\n" +
  "    be sitting in the open, which is the layout this pass replaced");
for (const id of WORK_SURFACES) {
  const p = at(`id="${id}"`);
  ok(p > workOpen && p < workClose,
    `#${id} is not inside the work layer, so it is still on the mandatory scroll path`);
}
ok(/#pdx-door-work\{display:none;\}/.test(INDEX),
  "the work layer does not start closed. Shipping it open means the doors decorate a scroll rather\n" +
  "    than replace one");
ok(/#pdx-door-work\.is-open\{display:block;\}/.test(INDEX),
  "there is no open state for the work layer, so nothing a door does can reveal it");

// Each demoted surface keeps its own id, its own module and its own self-gating.
// Demotion is a navigation change; anything more would be a rewrite.
for (const [id, script] of [
  ["hero-receipt", "/hero-receipt.js"],
  ["live-proof", "/live-proof.js"],
]) {
  ok(INDEX.indexOf(`src="${script}" defer`) !== -1,
    `${id}'s module lost its deferred script tag — the restructure must not move anything onto the\n` +
    "    critical path");
}
for (const id of WORK_SURFACES) {
  const tagStart = at(`id="${id}"`);
  const tagEnd = INDEX.indexOf(">", tagStart);
  ok(INDEX.slice(tagStart, tagEnd).includes("hidden"),
    `#${id} no longer ships hidden. Its module self-gates to hidden when it has nothing sourced, and\n` +
    "    that gate is what keeps a door from opening onto an empty promise");
}

// ── 3 · Every door routes to a module that already shipped ───────────────────
// The router is extracted and run in a sandbox, so this is a statement about what
// each door DOES rather than about what the markup says it does.
const routerSrc = (() => {
  const start = INDEX.indexOf("window.pdxDoor(mode) · the five doors");
  must(start !== -1, "the router's own comment header is gone — the extraction below cannot be trusted");
  const open = INDEX.lastIndexOf("<script>", start);
  const close = INDEX.indexOf("</script>", start);
  return INDEX.slice(open + "<script>".length, close);
})();

function runRouter(over) {
  const calls = [];
  const el = (id) => ({
    id, style: {}, hidden: false,
    classList: { _s: new Set(), add(c) { this._s.add(c); calls.push(`class+${id}:${c}`); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    setAttribute(k, v) { calls.push(`attr:${id}:${k}=${v}`); },
    getAttribute: () => null,
    scrollIntoView() { calls.push(`scroll:${id}`); },
  });
  const nodes = {};
  const ctx = {
    console, Math, JSON, String, Array, Object, Number, Boolean, RegExp, Set,
    setTimeout: (fn) => { fn(); return 1; },
    requestAnimationFrame: (fn) => { fn(); return 1; },
    location: { hash: "" },
    document: {
      readyState: "complete",
      getElementById: (id) => (nodes[id] = nodes[id] || el(id)),
      addEventListener: () => {},
    },
    addEventListener: () => {},
    ...over,
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  ctx.calls = calls; ctx.nodes = nodes;
  vm.runInContext(routerSrc, vm.createContext(ctx), { filename: "index.html[pdxDoor]" });
  return ctx;
}

{
  // person / claim → the All-Seeing Eye, with the field's prompt naming the job
  const r = runRouter({});
  const seen = [];
  r.pdxOpenEye = (q) => seen.push(["eye", q === undefined ? null : q]);
  r.pdxDoor("person");
  ok(seen.some((s) => s[0] === "eye"),
    "the person door does not open the All-Seeing Eye. The Eye is the person surface — a door that\n" +
    "    scrolls somewhere instead is a scroll target wearing an intent's label");
  ok(r.calls.some((c) => /attr:pdx-eye-input:placeholder=.*name/i.test(c)),
    "the person door does not tell the search field it is searching for a person, so two different\n" +
    "    doors land on an identical-looking field and the choice was cosmetic");

  const r2 = runRouter({});
  const seen2 = [];
  r2.pdxOpenEye = (q) => seen2.push(["eye", q]);
  r2.pdxDoor("claim");
  ok(seen2.length > 0, "the claim door does not open the Eye, where claim-check.js splices its block in");
  ok(r2.calls.some((c) => /attr:pdx-eye-input:placeholder=.*claim/i.test(c)),
    "the claim door does not put a claim-shaped prompt in the field. Claim and person share one\n" +
    "    field by design, and the prompt is the only thing that says which job it is doing");
}
{
  // issue → PDXIssueView, and the layer opens on the issue surface
  const r = runRouter({});
  let mounted = 0;
  r.PDXIssueView = { mountFrontDoor: () => { mounted++; } };
  r.pdxDoor("issue");
  eq(mounted, 1,
    "the issue door does not ask PDXIssueView to paint its front door, so the door can open onto a\n" +
    "    surface that has not rendered yet and read as broken");
  ok(r.calls.includes("class+pdx-door-work:is-open"),
    "the issue door does not open the work layer, so it scrolls to a display:none section");
  ok(r.calls.includes("scroll:issue-front-door"),
    "the issue door opens the layer but does not land on the issue ledger inside it");
  ok(!r.calls.includes("scroll:hr1-showcase") && !r.calls.includes("scroll:say-vs-do"),
    "the issue door lands the reader on a different surface than the one it named");
}
{
  // bill/vote → the H.R.1 showcase, which IS the multi-issue split of one measure
  const r = runRouter({});
  let mounted = 0;
  r.PDXHR1 = { mount: () => { mounted++; } };
  r.pdxDoor("bill");
  eq(mounted, 1, "the bill/vote door does not ask PDXHR1 to paint the measure split");
  ok(r.calls.includes("scroll:hr1-showcase"),
    "the bill/vote door does not land on the one-measure split view it promises");
}
{
  // my people → the lookup band's own resolver, never a new list
  const r = runRouter({});
  let focused = 0, found = 0;
  r.PDXWhoRepresentsMe = { focus: () => { focused++; } };
  r.pdxDoor("mine");
  eq(focused, 1, "the my-people door does not go through the lookup band, which owns the coverage rules");
  const r2 = runRouter({});
  r2.pdxFindMyReps = () => { found++; };
  r2.pdxDoor("mine");
  eq(found, 1, "with the band's focus() absent the my-people door does not fall back to pdxFindMyReps");
  // And it must never route through the local jump, whose own guard exists
  // precisely because that path could reach the national slate.
  ok(!/case 'mine':[\s\S]{0,600}jumpToRelevantAccordion/.test(routerSrc),
    "the my-people door calls jumpToRelevantAccordion directly. Local routing has exactly one\n" +
    "    coverage-guarded entry, and adding a second is how the national-slate bug came back");
}
{
  // A door with no module behind it must be a silent no-op, not a thrown error on
  // a button press. These five controls are all of Door 1's navigation now.
  const r = runRouter({});
  let threw = null;
  try { MODES.forEach((m) => r.pdxDoor(m)); r.pdxDoor("nonsense"); } catch (e) { threw = e; }
  ok(!threw, `a door threw with no modules loaded: ${threw && threw.message}. A dead button beats a dead page`);
}
{
  // The hash handler is what keeps every inbound anchor alive.
  for (const id of WORK_SURFACES) {
    const r = runRouter({ location: { hash: "#" + id } });
    ok(r.calls.includes("class+pdx-door-work:is-open"),
      `an inbound link to #${id} does not open the work layer, so it scrolls to a display:none\n` +
      "    element and appears to do nothing");
  }
  const r = runRouter({ location: { hash: "#voter-hub" } });
  ok(!r.calls.includes("class+pdx-door-work:is-open"),
    "an unrelated hash opens the work layer, which un-demotes the sections on any navigation at all");
}

// ── 4 · No inbound anchor is stranded ────────────────────────────────────────
// Collected from the shipped source rather than from a list kept by hand, so a
// new link to a demoted section fails this test instead of failing a visitor.
{
  const routerBlock = routerSrc;
  const declared = (routerBlock.match(/var WORK_IDS = \[([^\]]*)\]/) || ["", ""])[1];
  for (const id of WORK_SURFACES) {
    ok(declared.includes(`'${id}'`),
      `#${id} is inside the closed layer but is not in the hash handler's WORK_IDS, so every link\n` +
      "    and shared hash that names it lands on nothing");
  }
}

// ── 5 · The philosophy is stated once ────────────────────────────────────────
// The brief's words: "stop restating the same philosophy in five different
// full-width sections". Measured on the header and the chooser, which is all a
// visitor sees before choosing.
{
  // Comments are provenance for the next maintainer and aria-labels are the one
  // place a screen reader gets the thesis, so neither is a restatement. What
  // counts is what a sighted visitor reads twice.
  const head = INDEX.slice(POS.bridge, POS.proof)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\saria-label="[^"]*"/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "");
  const restatements = (head.match(/said[^.<]{0,20}(against|vs\.?|versus)[^.<]{0,20}did/gi) || []).length;
  ok(restatements <= 1,
    `the said-against-did premise is restated ${restatements} times between the header and the proof\n` +
    "    strip. Once is a thesis; twice on one screen is the brochure this pass removed");
  ok(head.indexOf("Pick a direction") !== -1,
    "the header no longer tells the visitor to pick a direction, which is the one instruction an\n" +
    "    entry system needs to give");
  // Every door's supporting line must describe what the door DOES, not re-argue
  // why records matter. Enforced as a length cap: a door subtitle is a label.
  const subs = (INDEX.slice(POS.modes, POS.proof).match(/class="pdm-sub">([^<]*)</g) || [])
    .map((m) => m.slice(m.indexOf(">") + 1, -1));
  eq(subs.length, MODES.length, "not every door carries a supporting line saying what it opens");
  const longSubs = subs.filter((t) => t.length > 60);
  eq(longSubs.length, 0,
    "a door's supporting line has grown into a paragraph, which is how the explainer sections got\n" +
    "    here in the first place: " + JSON.stringify(longSubs));
}

// ── 6 · Nothing was weakened to get here ─────────────────────────────────────
{
  const gate = (INDEX.match(/var IDS = \[[^\]]*\]/) || [""])[0];
  for (const id of ["live-proof", ...WORK_SURFACES]) {
    ok(gate.includes(`'${id}'`),
      `Door 1's fail-closed gate no longer counts #${id}. Demoting a surface must not stop the header\n` +
      "    from failing closed against it");
  }
  ok(/DOOR_SURFACE = \{ issue: 'issue-front-door', bill: 'hr1-showcase' \}/.test(INDEX),
    "the two doors whose surfaces can legitimately be empty no longer declare which surface they\n" +
    "    depend on, so a door can be offered onto a section that never came up — the same broken\n" +
    "    promise the local-officials button was just fixed for");
  ok(/host\.style\.display = shown > 0/.test(INDEX),
    "the chooser does not hide itself when every door has been pruned, leaving an empty navigation");

  // No party framing anywhere in the chooser or the router.
  const chooser = INDEX.slice(POS.bridge, POS.work);
  for (const w of ["Republican", "Democrat", "GOP", "party loyalty", "partisan"]) {
    ok(chooser.toLowerCase().indexOf(w.toLowerCase()) === -1,
      `the word "${w}" appears in Door 1's entry system. The doors sort by intent, never by side`);
  }
  // No second score and no bare figure. A door is a direction, not a reading.
  ok(!/%/.test(chooser),
    "a percentage appeared in Door 1's entry system. Every figure on this site carries its\n" +
    "    denominator on the surface that computes it, and a navigation control computes nothing");
  for (const w of ["Direction Match", "consistency score", "grade"]) {
    ok(chooser.indexOf(w) === -1,
      `"${w}" appears in the entry system. The doors state no verdict about anyone — they open the\n` +
      "    surfaces that do, under those surfaces' own lane rules");
  }
  // Formal-record-first is not weakened: the person door's own label says so.
  ok(/Formal record first/i.test(chooser),
    "the person door no longer says the formal record comes first. That ordering is the product's\n" +
    "    whole claim, and the door into a profile is where a visitor is told it");
}

if (failures.length) {
  console.error(`\n✗ door one entry: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
console.log(`✓ door one entry: all ${passed} assertions passed — 5 doors, 4 surfaces demoted not deleted, 0 stranded anchors`);
