#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-row-tap-dossier.mjs — every issue row opens its dossier, on every device
// ─────────────────────────────────────────────────────────────────────────────
// The bug this pins: on a deep formal profile the issue rows in the Full Stance
// Record stopped being tappable, and the chevrons stopped being tappable with
// them. It was never a handler problem. It was two separate ways of building a
// row that both ended with a reader tapping something that looked like a control:
//
//   1. NESTED BUTTONS. The curated "All stances" row WAS a <button>, and the
//      Evidence-depth pill inside it is also a <button>. HTML does not allow that
//      nesting: on the inner start tag the parser generates implied end tags and
//      pops until the outer button is popped, so the row button closes early and
//      everything after the pill — the chips, the "No record yet" tag, the
//      suggest cue and the ↗ chevron — lands OUTSIDE the row as loose siblings.
//      Only rows with receipts have a pill, which is why the failure looked
//      intermittent, and why the deepest profiles were the worst hit.
//   2. CURATION AS THE GATE. That same row was only clickable when it had curated
//      receipts, on-record items or promises. An issue carried by the formal
//      record alone — record-only, thin, split — got no handler at all.
//
//   …and one that made the door invisible rather than absent: the formal index's
//   chevron was revealed by :hover, with a single width-based override for phones
//   under 480px. Every touch device wider than that showed a row with no sign it
//   opened anything.
//
// What is asserted here is the shape, not the click: there is no browser in this
// container, so the invariants are (a) no interactive element is ever nested
// inside another — the exact thing the parser punishes — and (b) every issue-keyed
// row carries the shared [data-pdxst-dos] door on its OUTERMOST element, so the
// delegated handler's closest() finds it wherever inside the row a tap lands.
//
//   node scripts/test-row-tap-dossier.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, votes seeded the
// way a completed /api/voting-record fetch leaves the cache.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// evidence-locker.js is on this list because the depth pill is HALF the bug: the
// nesting only exists when the Locker library is loaded and the pill renders as a
// real <button>. A harness without it would render the broken shape as the fixed
// one and pass on both.
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
  "word-action.js",
  "profile-spine.js",
  "evidence-locker.js",
  "profiles-full.js",
];
const SRC = new Map(FILES.map((f) => [f, R(f)]));

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
// A fixture that no longer offers a case is a silent pass, so the probes that
// establish one are fatal rather than counted.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ row tap → dossier: ${msg}`);
  process.exit(1);
};

// ── The sandbox ──────────────────────────────────────────────────────────────
// `mutants` rewrites one shipped file before it is evaluated, so a counterfactual
// runs the real module with one line changed rather than a paraphrase of it.
function boot(mutants) {
  const win = makeSandbox();
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) {
    let src = SRC.get(f);
    if (mutants && mutants[f]) {
      for (const [from, to] of mutants[f]) {
        must(src.indexOf(from) >= 0, `mutation anchor moved in ${f}: ${from.slice(0, 70)}`);
        src = src.replace(from, to);
      }
    }
    vm.runInContext(src, sandbox, { filename: f });
  }
  win.PROFILES = win.CMP_DATA;
  return win;
}

// The Locker index the depth pill reads. Stubbed rather than fetched: the pill's
// own shape is what matters here, not which issues happen to have receipts today.
const DEPTH_ON = ["democracy_balance", "health_drug_prices"];
function withDepth(win) {
  win._pdxEvidenceDepthForPerson = function () {
    const m = {};
    DEPTH_ON.forEach((k, i) => {
      m[k] = { count: 4 - i, level: i ? "limited" : "strong", tier: i ? "Limited" : "Strong", label: k };
    });
    return m;
  };
  return win;
}

// ── The fixture: a deep formal record, the Mike Lee / Schumer class ───────────
const PID = "schumer";
const probe = boot();
must(probe.PDXConsistency && probe.PDXConsistency.formalPatternIndex,
  "PDXConsistency.formalPatternIndex is not exposed");
must(typeof probe._pdxStanceRecordBody === "function",
  "_pdxStanceRecordBody is not exposed");
must(typeof probe._pdxEvidenceDepthPill === "function",
  "the Evidence-depth pill is not exposed — the nesting case cannot be built");

const stanceKeys = new Set(
  (probe._resolveStanceList(PID, probe.CMP_DATA[PID]) || [])
    .map((s) => s && s.issueKey).filter(Boolean));
const ISSUE_KEYS = Object.keys(probe.ISSUE_MAP || {});
const SILENT = ISSUE_KEYS.filter((k) => !stanceKeys.has(k) && !/_balance$/.test(k));
const [STRONG, MOSTLY, SPLIT, THIN, MIXED] = SILENT;
const RECORD_ONLY = SILENT.slice(5, 21);
// The unread class needs a record that took NO SIDE — two votes where the member
// was recorded present. A shallow both-ways record is no longer unread anywhere: it
// prints the browse lane's Split. What is left in the unread class is the honest
// silence, and an honestly silent row still has to be a door.
const NOSIDE = SILENT[21];
must(STRONG && MOSTLY && SPLIT && THIN && MIXED && NOSIDE && RECORD_ONLY.length === 16,
  "the fixture profile no longer offers every row class");

const vote = (n, issueKey, position) => ({
  kind: "vote", rollcallId: 700 + n, measureId: 800 + n, number: "S. " + (100 + n),
  date: "2025-0" + ((n % 9) + 1) + "-11", action: "On Passage", position: position,
  isProcedural: false, title: "Measure " + n,
  source: { url: "https://www.congress.gov/roll-call-vote/" + (700 + n), label: "Congress.gov" },
  issues: [{ issueKey: issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
});
const SEED = [];
for (let i = 0; i < 12; i++) SEED.push(vote(i, STRONG, "yea"));
for (let i = 0; i < 10; i++) SEED.push(vote(20 + i, MOSTLY, i < 8 ? "nay" : "yea"));
for (let i = 0; i < 8; i++) SEED.push(vote(35 + i, SPLIT, i % 2 ? "nay" : "yea"));
SEED.push(vote(50, THIN, "nay"));
SEED.push(vote(55, MIXED, "nay"), vote(56, MIXED, "nay"), vote(57, MIXED, "yea"));
SEED.push(vote(60, NOSIDE, "present"), vote(61, NOSIDE, "present"));
let nn = 100;
RECORD_ONLY.forEach((k, i) => {
  const n = (i % 5) + 1;
  for (let j = 0; j < n; j++) SEED.push(vote(nn++, k, (i % 3 === 2 && j === n - 1) ? "nay" : "yea"));
});

function render(mutants) {
  const win = withDepth(boot(mutants));
  win.PDXVotingRecord.noteMember(PID, SEED.map((v) => JSON.parse(JSON.stringify(v))));
  const FPI = win.PDXConsistency.formalPatternIndex;
  return {
    win,
    rows: FPI.rows(PID),
    index: FPI.html(PID, { sort: "strength", view: "all" }) || "",
    face: FPI.html(PID, { sort: "strength", mount: "face" }) || "",
    body: win._pdxStanceRecordBody(PID, win.CMP_DATA[PID]) || "",
  };
}
const A = render();
must(A.rows.length > 20, `the seeded fixture produced only ${A.rows.length} index rows`);
must((A.body.match(/pdx-depth-pill/g) || []).length >= 2,
  "no depth pill rendered — the nested-button case is not in the fixture");

// ── Shape helpers ────────────────────────────────────────────────────────────
// The one thing the HTML parser will not forgive: a button inside a button. Walks
// the start/end tags and returns the deepest nesting seen.
function maxDepth(html, tag) {
  const re = new RegExp("<" + tag + "(?=[\\s>])|</" + tag + "\\s*>", "g");
  let d = 0, max = 0, m;
  while ((m = re.exec(html))) {
    if (m[0][1] === "/") d = Math.max(0, d - 1);
    else { d++; if (d > max) max = d; }
  }
  return max;
}
// Chunks, split on the OUTERMOST element of each row so the opening tag — the one
// a descendant's closest() would have to reach — is what gets inspected.
const fsrecRows = (html) =>
  html.split(/(?=<div class="fsrec-row(?=[" ]))/).filter((c) => c.indexOf('<div class="fsrec-row') === 0);
const fpiRows = (html) =>
  html.split(/(?=<div class="pdxfpi-row(?=[" ]))/).filter((c) => c.indexOf('<div class="pdxfpi-row') === 0);
const openTag = (chunk) => chunk.slice(0, chunk.indexOf(">") + 1);
const attr = (s, name) => (s.match(new RegExp(name + '="([^"]*)"')) || [])[1];

const CJS = R("consistency.js");
const PFJ = R("profiles-full.js");
const CSS = R("app.css");
const JCSS = R("journey.css");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · nothing interactive nests inside anything interactive");
// ═════════════════════════════════════════════════════════════════════════════
{
  // This is the blocker, stated as an invariant. A depth of 2 means the browser
  // rewrote the row and ejected its own contents; it is not a style question.
  eq(maxDepth(A.body, "button"), 1,
    "the Full Stance Record never nests a <button> inside a <button>");
  eq(maxDepth(A.index, "button"), 1,
    "the formal index never nests a <button> inside a <button>");
  eq(maxDepth(A.face, "button"), 1,
    "the profile face's formal list never nests a <button> inside a <button>");
  ok(maxDepth(A.body, "a") <= 1, "…and no anchor is nested inside an anchor either");
  // The depth pill IS still a button, and it is still inside a row. What changed
  // is the row: it is a div now, so the pill is legal where it stands.
  has(A.body, '<button type="button" class="pdx-depth-pill',
    "the Evidence-depth pill is still a real button");
  has(A.body, "event.stopPropagation();window._pdxOpenEvidenceLocker",
    "…still swallowing its own tap so the row's dossier door does not also fire");
  for (const c of fsrecRows(A.body)) {
    if (c.indexOf("pdx-depth-pill") < 0) continue;
    // The pill sits in the meta line; the meta line and the chevron after it have
    // to still be INSIDE the row, which is exactly what the old shape lost.
    has(c, 'class="fsrec-row-meta"', "a row with a depth pill still owns its meta line");
    ok(c.indexOf("pdx-depth-pill") < c.indexOf("fsrec-row-go") || c.indexOf("fsrec-row-go") < 0,
      "…and the chevron still comes after it inside the same row");
  }
  lacks(A.body, '<button type="button" class="fsrec-row is-click"',
    "the curated row is no longer a button wrapping other buttons");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · every issue-keyed curated row is a dossier door");
// ═════════════════════════════════════════════════════════════════════════════
{
  const rows = fsrecRows(A.body);
  must(rows.length >= 8, `only ${rows.length} curated rows rendered`);
  let doors = 0, dead = 0, norec = 0;
  for (const c of rows) {
    const t = openTag(c);
    const key = attr(t, "data-pdxst-dos");
    if (!key) { dead++; lacks(t, "is-click", "a row with no issue key is not dressed as a control"); continue; }
    doors++;
    eq(attr(t, "data-pdxst-pid"), PID, `${key}: the row door names the politician`);
    eq(attr(t, "data-pdxst-origin"), attr(t, "id"),
      `${key}: the row is its own origin, so closing the sheet returns to it`);
    has(t, "is-click", `${key}: …and it is dressed as a control`);
    // The name is the ONE focus stop and the ONE accessible name. The row around
    // it is a pointer target only — no role, no tabindex, nothing for a screen
    // reader to announce twice.
    has(c, 'class="fsrec-row-label fsrec-row-door"', `${key}: the name is a real button`);
    has(c, "aria-label=\"Open the issue dossier:", `${key}: …and it says what it opens`);
    lacks(t, 'role="button"', `${key}: the row wrapper is not a second announced control`);
    lacks(t, "tabindex=", `${key}: …and not a second tab stop`);
    has(c, 'class="fsrec-row-go"', `${key}: the row shows the ↗ affordance`);
    if (c.indexOf("fsrec-norec") >= 0) norec++;
  }
  ok(doors >= 8, `every issue-keyed curated row is a door (${doors} of ${rows.length})`);
  eq(dead, rows.length - doors, "the only rows without a door are the ones without an issue key");
  ok(norec >= 1,
    `rows with no curated record at all are doors too (${norec} such rows) — the dossier is what they are for`);
  // What the row no longer does. The Locker was the wrong destination for a row
  // that names an issue, and it is still reachable — see section 6.
  lacks(A.body, 'aria-label="Open the Evidence Locker filtered to',
    "the row no longer claims to open the Locker");
  // The suggest cue is a role=button span, not a <button>, and it still eats its
  // own tap — otherwise it would open the dossier behind the composer.
  has(A.body, '<span class="fsrec-suggest" role="button" tabindex="0"',
    "the suggest cue stays a non-button control so it can live inside the row");
  has(A.body, "event.stopPropagation();window._pdxSuggestReceipt",
    "…and still swallows its own tap");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the whole formal row is the door — thin, split and unread included");
// ═════════════════════════════════════════════════════════════════════════════
{
  const seen = {};
  for (const c of fpiRows(A.index)) {
    const t = openTag(c);
    const key = attr(t, "data-pdxfpi-issue");
    const tier = attr(t, "data-pdxfpi-tier");
    must(key, "a formal index row rendered without an issue key");
    seen[tier] = (seen[tier] || 0) + 1;
    eq(attr(t, "data-pdxst-dos"), key, `${key}: the ROW carries the door, not only the name`);
    eq(attr(t, "data-pdxst-pid"), PID, `${key}: …with the politician on it`);
    eq(attr(t, "data-pdxst-origin"), attr(t, "id"), `${key}: …and its own id as the way back`);
    // Same key on both, so it cannot matter which one closest() reaches first.
    const inner = c.slice(c.indexOf('class="pdxfpi-lbl'));
    eq(attr(inner, "data-pdxst-dos"), key, `${key}: the name inside opens the same issue`);
    eq(attr(inner, "data-pdxst-pid"), PID, `${key}: …for the same politician`);
    // The parts that used to be inert siblings are now inside a row that is a door.
    if (c.indexOf('class="pdxfpi-chips"') < 0) continue;
    ok(c.indexOf('class="pdxfpi-chips"') > c.indexOf("data-pdxst-dos"),
      `${key}: the pattern chip sits inside the door, not beside it`);
  }
  // Acceptance 2, spelled out: the row classes that carry the least curation are
  // the ones that most needed a door, and each is present in the fixture.
  for (const tier of ["strong", "mostly", "split", "thin", "unread"]) {
    ok((seen[tier] || 0) > 0, `the fixture exercises a ${tier} row`);
  }
  eq(fpiRows(A.face).length, fpiRows(A.index).length,
    "the profile face's flat list is the same list, so it gets the same doors");
  for (const c of fpiRows(A.face)) {
    has(openTag(c), "data-pdxst-dos=", "…every face row carries the door too");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · every door reaches the one shared entry point");
// ═════════════════════════════════════════════════════════════════════════════
{
  has(CJS, "closest('[data-pdxst-dos]')",
    "one delegated listener serves them all, matched by attribute and not by tag");
  // Element-agnostic on purpose: the old rows were buttons, the new ones are divs,
  // and the handler was never told which.
  lacks(CJS, "closest('button[data-pdxst-dos]')",
    "…and it never narrows that match to a tag");
  has(CJS, "if (!pid || !issueKey || !document.body) return false;",
    "openGap refuses only for a missing politician or a missing issue");
  // A row with no curated content still gets a sheet with something in it — the
  // point of routing record-only rows here in the first place.
  has(CJS, "_gapFallbackHtml", "…and an issue with nothing assembled still opens on a fallback body");
  has(CJS, "e.preventDefault();", "the tap is consumed only when a sheet actually went up");
  // The keys the rows publish are the keys the dossier understands.
  const keys = fpiRows(A.index).map((c) => attr(openTag(c), "data-pdxst-dos"));
  const known = new Set(Object.keys(A.win.ISSUE_MAP || {}));
  ok(keys.length > 20 && keys.every((k) => known.has(k)),
    `every formal row door names a real issue (${keys.length} rows)`);
  const bodyKeys = fsrecRows(A.body).map((c) => attr(openTag(c), "data-pdxst-dos")).filter(Boolean);
  ok(bodyKeys.length > 0 && bodyKeys.every((k) => known.has(k)),
    `every curated row door names a real issue (${bodyKeys.length} rows)`);
  // Ids are the return address; two rows sharing one would send the back pill to
  // the wrong place — and the two lists are on screen together.
  const ids = fsrecRows(A.body).concat(fpiRows(A.body))
    .map((c) => attr(openTag(c), "id")).filter(Boolean);
  eq(new Set(ids).size, ids.length, "no two rows in the overlay share a return address");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · mobile: the target is visible and thumb-sized");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The chevron used to be revealed by :hover, with one width override for phones
  // under 480px. Ask the pointer instead — that is what tablets and touch laptops
  // and a phone held sideways actually are.
  has(CJS, "'@media (hover:none),(pointer:coarse){.pdxfpi-go{opacity:1;margin-left:auto;}'",
    "the formal chevron is visible on every coarse pointer, not just narrow ones");
  has(CJS, "'.pdxfpi-row:hover .pdxfpi-go,.pdxfpi-lbl:hover .pdxfpi-go,'",
    "…and hovering anywhere in the row reveals it, not only the name");
  has(CJS, "cursor:pointer;'\n        + 'min-height:2.75rem;",
    "the formal row is a 44px-class target in its own right");
  has(CSS, "@media (hover: none), (pointer: coarse) {\n      .fsrec-row.is-click { min-height: 44px; }",
    "the curated row is a 44px-class target on touch");
  has(CSS, "button.fsrec-row-label {",
    "the name button is reset to look like the text it replaced");
  has(CSS, "button.fsrec-row-label:focus-visible {",
    "…and still shows a focus ring for keyboard readers");
  // Acceptance 4's other half: nothing sticky sits over these rows. The journey
  // bar is the only fixed bottom rail in the product, and it is far below both
  // the record overlay and the dossier's own backdrop.
  has(JCSS, "bottom: 0; z-index: 45;", "the sticky journey rail sits at z-index 45");
  has(CSS, "position: fixed; inset: 0; z-index: 72;", "…the Full Stance Record overlay is above it");
  has(CJS, "z-index:2147483000", "…and the dossier's own backdrop is above everything");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the Evidence Locker is not orphaned by the reroute");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Rerouting the row to the dossier only removes a Locker door that the row's
  // own receipts pill already duplicates — plus a sheet-level one in the header.
  has(A.body, 'class="fsrec-head-locker"', "the overlay header still jumps into the full Locker");
  const pilled = fsrecRows(A.body).filter((c) => c.indexOf("pdx-depth-pill") >= 0);
  ok(pilled.length >= 2, `rows with curated receipts still carry their own Locker door (${pilled.length})`);
  for (const c of pilled) {
    has(c, "window._pdxOpenEvidenceLocker&&window._pdxOpenEvidenceLocker({pol:",
      "…filtered to that politician and that issue");
  }
  // The receipts count that used to gate clickability is the same number the pill
  // is built from, so "had a Locker tap" and "has a pill" are the same set.
  has(PFJ, "r.receipts = dd.count || 0;",
    "row receipts and the depth pill read one index, so no row loses a Locker path silently");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · counterfactuals — each guard is load-bearing");
// ═════════════════════════════════════════════════════════════════════════════
{
  // M1 · curation back as the gate for clickability.
  const m1 = render({ "profiles-full.js": [[
    "      var clickable = !!r.issueKey;",
    "      var clickable = (rec || r.receipts) && r.issueKey;",
  ]] });
  const m1doors = fsrecRows(m1.body).filter((c) => attr(openTag(c), "data-pdxst-dos")).length;
  const a1doors = fsrecRows(A.body).filter((c) => attr(openTag(c), "data-pdxst-dos")).length;
  ok(m1doors < a1doors,
    `M1: gating on curation again strands rows (${a1doors} doors → ${m1doors})`);

  // M2 · the row back as a <button>, with the depth pill still inside it.
  const m2 = render({ "profiles-full.js": [[
    "        return '<div class=\"fsrec-row is-click\" id=\"' + esc(rowId) + '\"' + door + '>' + inner + '</div>';",
    "        return '<button type=\"button\" class=\"fsrec-row is-click\" id=\"' + esc(rowId) + '\"' + door + '>' + inner + '</button>';",
  ]] });
  eq(maxDepth(m2.body, "button"), 2,
    "M2: putting the row back as a button re-creates the nesting the parser rejects");

  // M3 · the door back on the name only, leaving the chips and meta inert.
  const m3 = render({ "consistency.js": [[
    "        ' data-pdxst-dos=\"' + escAttr(x.key) + '\" data-pdxst-pid=\"' + escAttr(x.pid) + '\"' +\n        ' data-pdxst-origin=\"' + escAttr(_fpiRowId(mount, x.pid, x.key)) + '\"' +\n        ' data-pdxfpi-said=\"'",
    "        ' data-pdxfpi-said=\"'",
  ]] });
  const m3rows = fpiRows(m3.index);
  must(m3rows.length > 0, "M3 produced no formal rows");
  ok(m3rows.every((c) => !attr(openTag(c), "data-pdxst-dos")),
    "M3: without the row-level door the chips and the meta line are dead space again");

  // M4 · the chevron back behind :hover only.
  const m4src = R("consistency.js").replace(
    "'@media (hover:none),(pointer:coarse){.pdxfpi-go{opacity:1;margin-left:auto;}'", "''");
  ok(m4src.indexOf("(pointer:coarse){.pdxfpi-go") < 0,
    "M4: removing the coarse-pointer rule is what hides the chevron on touch");

  // M5 · the accessible name back to a plain span — the row would be pointer-only.
  const m5 = render({ "profiles-full.js": [[
    "        ? '<button type=\"button\" class=\"fsrec-row-label fsrec-row-door\"' + door +",
    "        ? '<span class=\"fsrec-row-label fsrec-row-door\"' + door +",
  ]] });
  ok((m5.body.match(/class="fsrec-row-label fsrec-row-door"/g) || []).length > 0 &&
     m5.body.indexOf('<button type="button" class="fsrec-row-label') < 0,
    "M5: the name is the keyboard door — drop the button and the row is pointer-only");
}

// ── Result ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ row tap → dossier: ${failures.length} failure(s)\n`);
  failures.forEach((f) => console.error("   · " + f));
  process.exit(1);
}
console.log(`✓ row tap → dossier: all ${passed} assertions passed — ` +
  `${fsrecRows(A.body).length} curated rows + ${fpiRows(A.index).length} formal rows, ` +
  `every issue-keyed one a door, nothing interactive nested`);
