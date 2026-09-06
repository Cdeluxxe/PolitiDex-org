#!/usr/bin/env node
/**
 * test-eye-one-person-per-office.mjs — the finder names one person per office
 * ─────────────────────────────────────────────────────────────────────────────
 * THE READER THIS PASS WAS BUILT FOR. Somebody in Vernal types "chew" into the
 * All-Seeing Eye. Utah has one Representative Chew, HD-68, and the panel used to
 * answer with a pile: two rows for him, one of them a stub with a bio and no
 * record, and a chip underneath naming him a third time under an id that has
 * been retired for a year. Three of those four things are the same human. A
 * finder that answers "who is this" with a list of near-duplicates has handed
 * the disambiguation back to the reader, who has strictly less to go on than the
 * app does.
 *
 * The people lane and the receipt lane already resolved their rows through
 * PDXCanonIds, so the duplicate ROW was fixed. What this file pins is the rest of
 * the panel, and the door at the end of it:
 *
 *   1. THE FIXTURE REPRODUCES THE PILE. The retired id really is retired, the
 *      stub really is in PROFILES, eighteen curated stance blocks really are
 *      filed under a retired key, and the seeded Spotlight really does name one
 *      officeholder under two spellings. None of this is hypothesised.
 *   2. ONE ROW PER PERSON. chew / scott chew / uinta basin each answer with one
 *      HD-68 row, at pid chew_h68, and no retired id appears anywhere in the
 *      markup. No query prints the same person twice.
 *   3. THE STUB DOES NOT OUTRANK THE CANONICAL FILE. The surviving row's name,
 *      office and district are the roster's, not the stub's bio.
 *   4. EVERY PERSON-SHAPED EMITTER ASKS THE SAME TABLE. Proved as a
 *      counterfactual against the previous revision, which prints two chips for
 *      one person and carries `scott_chew` into the markup — and which drops the
 *      canonical row's only chip on the floor, because his curated block is
 *      filed under the stub's name slug.
 *   5. A PERSON HIT OPENS THE PERSON FILE. /p/<pid> in the markup, the same pid
 *      through the same funnel on Enter, one door for the whole panel, and no
 *      medium card that has to be tapped again.
 *   6. THE OVERLAY IS A TOOL. Query, results, one clear close. No scrim, no
 *      scroll lock, no second Door 1 stack behind it, nothing interactive nested
 *      inside anything else interactive.
 *   7. ISSUE AND BILL HITS KEEP THE DOORS THEY HAVE. /i/<key> and
 *      /b/<sitting>/<number>; no third address shape was invented.
 *   8. NOTHING ON THE DO-NOT LIST MOVED. score(), rank() and formalFirst() are
 *      byte-identical with the previous revision, and permuting every party
 *      letter in the roster does not move a single row.
 *   9. AND IT SHIPS. all-seeing-eye.js is a runtime cache entry, so a warm device
 *      only gets any of this behind a CACHE_VERSION that moved.
 *  10. TWIN BOOT: every Direction Match read and every formal-record tier across
 *      the corpus is byte-identical with this panel loaded and without it, and
 *      with the identity spine loaded and without it.
 *
 * Real shipped modules in a node:vm sandbox, the real roster, the real alias
 * table, the real stance library. Two fixtures, both of them the reported defect
 * reproduced on purpose: a PROFILES stub filed under the retired id, and a
 * Spotlight that names the same officeholder twice.
 *
 *   node scripts/test-eye-one-person-per-office.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HEAD = (f) => {
  try { return execFileSync("git", ["show", "HEAD:" + f], { cwd: ROOT, encoding: "utf8" }); }
  catch { return null; }
};
const EYE_SRC = R("all-seeing-eye.js");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} — missing ${JSON.stringify(needle)}`);
const no = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg} — found ${JSON.stringify(needle)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`\n✗ eye one person per office: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

// The person the report named, and the id that used to publish him twice.
const PID = "chew_h68";
const RETIRED = "scott_chew";
// The three queries the Tests line names, and the three the Smoke names.
const CHEW_QUERIES = ["chew", "scott chew", "uinta basin"];
const SMOKE_QUERIES = ["chew", "lee", "moore"];

// ── fixture 1: the stub, filed under the retired id ─────────────────────────
// This is what production has: a thin document with a name, an office and a
// paragraph of bio, at an id the alias table retired. It is searchable — "uinta
// basin" is in it and nowhere in the roster row — so if the panel ever stops
// folding it, this fixture is a second row for one representative rather than a
// query that quietly finds nothing.
const STUB = {
  name: "Scott Chew",
  office: "Representative",
  state: "Utah",
  bio: "Uinta Basin rancher and legislator.",
};

// ── fixture 2: the Spotlight that names one man twice ───────────────────────
// A curator writing this up has no reason to know which of two ids the app
// considers live, and both spellings are correct English. The panel's job is to
// notice they are one person.
const SPOT = {
  slug: "uinta-basin-water",
  title: "Uinta Basin Water Rights",
  place: "Uintah County",
  eyebrow: "Investigation",
  blurb: "Who signed the leases, and who voted on the money that paid for them.",
  searchKeywords: "uinta basin water rights leases",
  groups: [{
    label: "On the record",
    people: [
      { id: RETIRED, name: "Scott Chew", strength: "strong", topic: "water" },
      { id: PID, name: "Rep. Chew", strength: "strong", topic: "water" },
    ],
  }],
};

// ── boot ────────────────────────────────────────────────────────────────────
function stubNode() {
  const set = new Set();
  const n = {
    id: "", className: "", innerHTML: "", textContent: "", value: "", tagName: "DIV",
    style: { setProperty() {}, removeProperty() {} }, dataset: {}, hidden: false,
    _attrs: {}, _li: {},
    classList: {
      add: (c) => set.add(c), remove: (c) => set.delete(c),
      toggle: (c) => (set.has(c) ? set.delete(c) : set.add(c)), contains: (c) => set.has(c),
    },
    setAttribute(k, v) { n._attrs[k] = String(v); },
    getAttribute(k) { return k in n._attrs ? n._attrs[k] : null; },
    removeAttribute(k) { delete n._attrs[k]; },
    focus() {}, blur() {}, scrollIntoView() {}, click() {},
    // Listeners are KEPT: section 5 activates a row the way a keyboard does, and
    // "the same funnel" is only checkable if the handler actually runs.
    addEventListener(t, f) { (n._li[t] = n._li[t] || []).push(f); },
    removeEventListener() {}, remove() {},
    appendChild: (c) => c, insertBefore: (c) => c, insertAdjacentHTML() {},
    querySelector: () => null, querySelectorAll: () => [], closest: () => null,
    contains: () => true, matches: () => false,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 320, height: 44, bottom: 44, right: 320 }),
  };
  return n;
}

// The roving-highlight machinery reads the rendered rows back out of the DOM, so
// a panel whose querySelectorAll returns nothing has no active row and Enter has
// nothing to open. These stand-ins are synthesised from the markup the panel just
// wrote, which keeps the index the eye reasons about (data-i) the panel's own.
function resStub(i) {
  const n = stubNode();
  n.setAttribute("data-i", String(i));
  return n;
}

const SPINE = ["profile-evidence.js", "person-link.js"];

function boot(opts) {
  opts = opts || {};
  const get = opts.get || R;
  const win = makeSandbox();
  const panel = stubNode(), input = stubNode(), eye = stubNode(), clear = stubNode();
  input.tagName = "TEXTAREA";
  const ids = { "pdx-eye-panel": panel, "pdx-eye-input": input, "pdx-eye": eye, "pdx-eye-clear": clear };
  win.document.getElementById = (id) => ids[id] || null;
  win.history = { replaceState() {}, pushState() {} };
  const ctx = vm.createContext(win);
  // profile-evidence.js (the alias table and PDXCanonIds) and person-link.js (the
  // /p/ address and the one open funnel) are NOT in ENGINE_FILES, so a suite that
  // does not name them exercises the panel's documented fail-open path rather
  // than the canonical grouping. Both are named here on purpose; `opts.noSpine`
  // is the twin that leaves them out.
  const files = [...ENGINE_FILES, "pdx-issue-family.js", "issue-colors.js"]
    .concat(opts.noSpine ? [] : SPINE);
  for (const f of files) vm.runInContext(get(f) || R(f), ctx, { filename: f });

  let roster = win.CMP_DATA;
  if (opts.party) {
    // Same roster, same names, same offices, every party letter rotated. Nothing
    // about who this person is has changed, so nothing about the order may.
    const rot = { R: "D", D: "I", I: "R" };
    const swapped = {};
    for (const [id, rec] of Object.entries(win.CMP_DATA || {})) {
      const p = String((rec && rec.party) || "").trim().charAt(0).toUpperCase();
      swapped[id] = { ...rec, party: rot[p] || rec.party };
    }
    win.CMP_DATA = swapped;
    roster = swapped;
  }
  win.PROFILES = opts.noStub ? roster : Object.assign({}, roster, { [RETIRED]: STUB });
  win.PDXSpotlight = {
    list: () => (opts.noSpotlight ? [] : [SPOT]),
    registry: opts.noSpotlight ? {} : { [SPOT.slug]: SPOT },
  };
  win.PDXLazyData = { ensure: () => Promise.resolve(true), loaded: () => true, whenReady: (k, cb) => cb() };
  win.PDX_BILLS_INDEX = win.PDX_BILLS_INDEX || [];
  win._issueLabel = (k) => (win.ISSUE_MAP && win.ISSUE_MAP[k] && win.ISSUE_MAP[k].label) || "";

  // Every way out of this sandbox, recorded. "One door" is a claim about what is
  // NOT called as much as what is.
  const opened = [];
  win.PDXPerson = { open: (pid, o) => { opened.push("person:" + pid + (o && o.section ? "#" + o.section : "")); return true; } };
  win.showProfile = (id) => { opened.push("showProfile:" + id); };
  win.openModal = (id) => { opened.push("openModal:" + id); };
  win.PDXIssueView = { open: (k) => { opened.push("issue:" + k); } };
  win.PDXJudgeFile = { open: (id) => { opened.push("judge:" + id); } };

  vm.runInContext(get("all-seeing-eye.js") || EYE_SRC, ctx, { filename: "all-seeing-eye.js" });
  must(win.PDXEye && typeof win.PDXEye.render === "function", "PDXEye.render is unavailable");

  panel.querySelectorAll = (sel) => {
    if (String(sel).indexOf("pdx-eye-res") < 0) return [];
    return [...String(panel.innerHTML).matchAll(/class="pdx-eye-res[^"]*"[^>]*data-i="(\d+)"/g)]
      .map((m) => resStub(Number(m[1])));
  };
  const fire = (type, ev) => { (input._li[type] || []).forEach((f) => f(ev)); };

  return {
    win, panel, input, eye, opened,
    lane(m) { return win.PDXEye.lane(m); },
    search(q) {
      eye.classList.add("is-open");
      input.value = q;
      win.PDXEye.rebuild();
      win.PDXEye.render(q);
      return panel.innerHTML || "";
    },
    // The keyboard path, which is the one the smoke describes ("Enter opens the
    // person file"). Focus is what resets the highlight to row 0 — the panel's own
    // handler does it — and each ArrowDown steps one row down from there, so the
    // row this activates is the row at index n of the rendered list rather than
    // whatever the previous query left highlighted.
    enterRowAt(n) {
      fire("focus", {});
      for (let i = 0; i < n; i++) fire("keydown", { key: "ArrowDown", preventDefault() {}, shiftKey: false });
      opened.length = 0;
      fire("keydown", { key: "Enter", preventDefault() {}, shiftKey: false });
      return opened.slice();
    },
  };
}

// ── readers over the rendered markup ────────────────────────────────────────
// Every person-shaped thing the panel prints, in the two shapes it prints them:
// a result row and a related chip. Both carry data-kind + data-id, which is what
// the activation path reads back, so this is the same string the reader's tap
// travels on.
const PERSON_IDS = (h) =>
  [...String(h).matchAll(/data-kind="(?:pol|judge)" data-id="([^"]*)"/g)].map((m) => m[1]);
const ROW_IDS = (h) =>
  [...String(h).matchAll(/class="pdx-eye-item[^"]*"[^>]*?data-kind="(?:pol|judge)" data-id="([^"]*)"/g)]
    .map((m) => m[1]);
const CHIPS = (h) =>
  [...String(h).matchAll(/class="pdx-eye-rel-chip" data-kind="pol" data-id="([^"]*)"[^>]*>([\s\S]*?)<\/button>/g)]
    .map((m) => ({ id: m[1], label: m[2].replace(/<[^>]*>/g, "").trim() }));
const HREFS = (h) => [...String(h).matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
const dupes = (list) => list.filter((x, i) => list.indexOf(x) !== i);
// The rendered rows in the order a reader arrows through them, one per result
// wrapper. The index into THIS list is the index the roving highlight uses, which
// is how "Enter opens the row it highlighted" is checkable at all.
const ALL_ROWS = (h) => String(h).split('<div class="pdx-eye-res"').slice(1).map((chunk) => {
  const m = /data-kind="([^"]+)"(?:\s+data-(?:id|key|slug)="([^"]*)")?/.exec(chunk);
  return m ? { kind: m[1], id: m[2] || "" } : { kind: "", id: "" };
});

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the fixture is the reported pile, not a hypothesis");
// ═════════════════════════════════════════════════════════════════════════════
const probe = boot();
{
  const ALIAS = probe.win.PDX_PROFILE_ALIAS || {};
  must(Object.keys(ALIAS).length > 10, "the shipped alias table did not load — nothing here has a retired id to fold");
  must(ALIAS[RETIRED] === PID,
    `the shipped alias table no longer folds ${RETIRED} into ${PID} — the reported case is vacuous`);
  must(typeof probe.win.PDXProfilePid === "function", "PDXProfilePid is unavailable from the shipped files");
  must(typeof probe.win.PDXCanonIds === "function", "PDXCanonIds is unavailable — the grouping under test is absent");
  must(probe.win.PDXPersonLink && typeof probe.win.PDXPersonLink.pid === "function",
    "person-link.js did not publish PDXPersonLink.pid — the address half of this file has no owner");
  must(!probe.win.CMP_DATA[RETIRED], `the roster grew a row for ${RETIRED}, so it is not a retired id any more`);
  must(probe.win.CMP_DATA[PID], `the roster has no row for ${PID}`);
  must(probe.win.PROFILES[RETIRED], "the stub fixture did not survive the boot");

  // EIGHTEEN CURATED BLOCKS ARE FILED UNDER A KEY THE ROSTER DOES NOT HOLD. This
  // is the reason the collapse took a chip with it, and it is a property of the
  // shipped stance library rather than of this fixture.
  const SD = probe.win.ISSUE_STANCE_DATA || {};
  const stranded = Object.keys(SD).filter((k) => ALIAS[k] && !probe.win.CMP_DATA[k]);
  must(stranded.length > 5,
    `only ${stranded.length} curated stance block(s) are filed under a retired id — the stranded-block case is vacuous`);
  must(stranded.indexOf(RETIRED) >= 0, `${RETIRED}'s curated block is no longer the stranded one this file reads`);
  must((SD[RETIRED] || []).length > 0, `${RETIRED} holds no curated stances, so there is no chip to lose`);
  must((SD[PID] || []).length === 0,
    `${PID} now holds his own curated block, so reading the table by raw key would have worked all along`);
  console.log(`      ${Object.keys(ALIAS).length} retired ids · ${stranded.length} curated blocks filed under one ` +
    `· ${(SD[RETIRED] || []).length} stances stranded at ${RETIRED}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · one row per person, and the retired id is nowhere in the markup");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot();
  B.lane("formal");
  const ALIAS = B.win.PDX_PROFILE_ALIAS || {};
  for (const q of CHEW_QUERIES) {
    const h = B.search(q);
    const rows = ROW_IDS(h);
    must(rows.length > 0, `the eye answered ${JSON.stringify(q)} with no people at all`);
    // Exactly one Chew. Other people who happen to be called Scott are other
    // people and are allowed their own row; what may not happen is one man twice.
    const chews = rows.filter((id) => id === PID || ALIAS[id] === PID);
    eq(chews.length, 1,
      `${JSON.stringify(q)}: HD-68 got ${chews.length} rows (${chews.join(", ")}) — one office, one person, one row`);
    eq(chews[0], PID, `${JSON.stringify(q)}: the surviving HD-68 row is not the canonical pid`);
    eq(dupes(rows).join(", "), "", `${JSON.stringify(q)}: a person is listed twice`);
    // And no retired id ANYWHERE in the panel — not in a row, not in a chip, not
    // in an href, not in a data attribute a handler will read back.
    const leaked = Object.keys(ALIAS).filter((k) => h.includes(k));
    eq(leaked.join(", "), "",
      `${JSON.stringify(q)}: ${leaked.length} retired id(s) reached the markup — a tap on one opens a document ` +
      "that names half a person");
  }
  console.log(`      ${CHEW_QUERIES.length} queries · one ${PID} row each · no retired id in any markup`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the stub does not outrank the canonical file");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot();
  B.lane("formal");
  // "uinta basin" matches ONLY the stub's bio: nothing in the roster row says it.
  // So this is the query where a panel that preferred the thin document would be
  // caught printing it.
  const h = B.search("uinta basin");
  const rows = ROW_IDS(h);
  eq(rows.length >= 1 && rows[0], PID,
    "the stub's own text found the stub rather than the file it is a stub of");
  no(h, STUB.bio, "the stub's bio is printed as a result subtitle — the roster row is the document of record");
  const rec = B.win.CMP_DATA[PID];
  must(rec && rec.name && rec.office, "the roster row for HD-68 has no name or office to compare against");
  has(h, rec.name, "the surviving row does not print the roster's own name");
  // The office line is the roster's. The stub says "Representative"; the record
  // says which chamber, which state and which district.
  has(h, "District 68", "the surviving row does not print the district the roster gives him");
  // And with the stub absent entirely, the same query answers with the same
  // person — the fold is not what makes him findable, it is what stops him being
  // findable twice.
  const clean = boot({ noStub: true });
  clean.lane("formal");
  eq(ROW_IDS(clean.search("chew"))[0], PID, "without the stub the canonical row stopped leading 'chew'");
  console.log(`      "uinta basin" → ${PID} (${rec.name}), record letterhead, stub bio unprinted`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · every person-shaped emitter asks the same table (counterfactual)");
// ═════════════════════════════════════════════════════════════════════════════
{
  // THE COUNTERFACTUAL IS BUILT OUT OF THE SHIPPED SOURCE, NOT OUT OF A GIT
  // REVISION. It used to be `git show HEAD:all-seeing-eye.js`, which was true
  // exactly once: the moment this pass was committed, HEAD carried the fix, the
  // two revisions became the same file, and the three vacuity guards below fired
  // on a tree where nothing was wrong — a harness that reports a defect the day
  // its own fix ships is a harness nobody will believe the second time.
  //
  // So the "before" is now the live file with the two functions this pass added
  // neutered in place: canonPid folded back to the identity it replaced, and
  // stanceListFor folded back to the raw ISSUE_STANCE_DATA dip it replaced. That
  // is a stricter counterfactual than the revision diff ever was — it isolates
  // these two functions rather than every difference between two commits — and
  // it cannot go stale, because the thing it removes is the thing being claimed.
  const NEUTER = [
    // canonPid: hand back whatever was passed in, the way every call site read
    // its id before there was one place to ask.
    ["    function canonPid(raw) {\n      if (!raw) return '';",
     "    function canonPid(raw) {\n      if (!raw) return '';\n      if (true) return String(raw);"],
    // stanceListFor: the raw table dip, which misses a block filed under a
    // retired id because the roster key and the library key are not the same key.
    ["    function stanceListFor(id) {\n      if (!id) return [];",
     "    function stanceListFor(id) {\n      if (!id) return [];\n      if (true) return (window.ISSUE_STANCE_DATA || {})[id] || [];"],
  ];
  let beforeEye = EYE_SRC;
  for (const [from, to] of NEUTER) {
    must(beforeEye.split(from).length === 2,
      `all-seeing-eye.js no longer opens with ${JSON.stringify(from.slice(0, 40))} exactly once — ` +
      "the counterfactual cannot be built and this section is claiming nothing");
    beforeEye = beforeEye.replace(from, to);
  }
  must(beforeEye !== EYE_SRC, "neutering the two functions changed nothing, so they are not what this pass added");

  const now = boot();
  const then = boot({ get: (f) => (f === "all-seeing-eye.js" ? beforeEye : R(f)) });

  // (a) THE SPOTLIGHT'S CHIPS. One person named twice by a curator.
  now.lane("public"); then.lane("public");
  const hNow = now.search("uinta basin water"), hThen = then.search("uinta basin water");
  const cNow = CHIPS(hNow), cThen = CHIPS(hThen);
  must(cThen.length > 0, "the previous revision printed no related chips for the seeded Spotlight — the fixture missed");
  ok(cThen.length > cNow.length || cThen.some((c) => c.id === RETIRED),
    "the build with canonPid neutered already printed one chip per person at the canonical id, so canonPid is " +
    "not what collapses them");
  eq(cNow.length, 1, `${cNow.length} chips for one officeholder (${cNow.map((c) => c.id).join(", ")})`);
  eq(cNow[0].id, PID, "the surviving chip does not carry the canonical pid — a tap on it opens the retired document");
  has(cNow[0].label, (now.win.CMP_DATA[PID] || {}).name || "Chew",
    "the chip is labelled from the curator's spelling rather than the record's own name");
  no(hNow, RETIRED, "the retired id still reaches the markup through the Spotlight's chips");
  has(hThen, RETIRED,
    "the build with canonPid neutered does not leak the retired id either — the fixture is not load-bearing");

  // (b) THE CANONICAL ROW'S OWN CHIP. The collapse fixed the duplicate and took
  // his only "On record" chip with it, because the block is filed under the slug.
  now.lane("formal"); then.lane("formal");
  const relOf = (h) => (String(h).match(/<div class="pdx-eye-rel">[\s\S]*?<\/div>/) || [""])[0];
  const relNow = relOf(now.search("chew")), relThen = relOf(then.search("chew"));
  eq(relThen, "",
    "the build with stanceListFor neutered already carried a chip on the HD-68 row — the stranded-block case is vacuous");
  ok(relNow.length > 0,
    `the canonical HD-68 row carries no related chip, though ${RETIRED} holds ` +
    `${(now.win.ISSUE_STANCE_DATA[RETIRED] || []).length} curated stances that are his`);
  console.log(`      chips for one man: ${cThen.length} before → ${cNow.length} after; ` +
    `HD-68's own chip: ${relThen ? "present" : "absent"} before → ${relNow ? "present" : "absent"} after`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · a person hit opens the person file, through one door");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot();
  B.lane("formal");
  const h = B.search("chew");
  // The advertised address, in the markup, before anything is tapped.
  has(h, `href="/p/${PID}"`, "the HD-68 row does not advertise /p/<pid> as its address");
  has(h, `data-pdx-person-link="${PID}"`,
    "the row's click target is not the canonical pid, so the link and the app would open two people");
  const bad = HREFS(h).filter((u) => /^(#|javascript:)/.test(u));
  eq(bad.join(", "), "", "a result advertises a dead address rather than the document it opens");

  // And the keyboard path, which is the one the smoke describes.
  const at5 = ALL_ROWS(h).findIndex((r) => r.kind === "pol" && r.id === PID);
  must(at5 >= 0, "the HD-68 row is not in the rendered list, so there is nothing to activate");
  const fired = B.enterRowAt(at5);
  eq(fired.length >= 1 && fired[0], `person:${PID}`,
    `Enter on the first row called ${JSON.stringify(fired.join(" → ")) || "nothing"} — a person hit goes to the ` +
    "person-file opener, resolved, first");
  eq(fired.filter((s) => s.startsWith("person:")).length, 1,
    "the person file was opened more than once for one activation");
  eq(fired.filter((s) => s.startsWith("showProfile:")).length, 0,
    "the fallback fired as well as the funnel — one activation, one open");

  // ONE DOOR IN THE SOURCE. Both person-shaped navigate arms delegate to it, and
  // it is the only place in the panel that reaches the opener at all — which is
  // what makes "a click and an Enter cannot disagree" a property rather than a
  // coincidence.
  const door = (EYE_SRC.match(/function personDoor\(raw\) \{[\s\S]*?\n    \}/) || [""])[0];
  ok(door.length > 0, "all-seeing-eye.js has no personDoor() — there is no single person door to check");
  has(door, "PDXPersonLink", "the person door does not go through person-link.js, the funnel Phase 1 established");
  has(door, "PDXPerson", "the person door does not reach the person-file opener");
  has(door, "showProfile", "the person door has no fallback for a page where person-file.js has not run");
  const nav = (EYE_SRC.match(/function navigate\(kind, data\) \{[\s\S]*?\n    \}/) || [""])[0];
  ok(nav.length > 0, "all-seeing-eye.js has no navigate()");
  has(nav, "if (kind === 'pol') { personDoor(", "a people row no longer goes through the one person door");
  has(nav, "else if (kind === 'judge') { personDoor(", "a judge row no longer goes through the one person door");
  // NO MEDIUM CARD. The panel opens the file; it does not render a second summary
  // of its own, and it does not reach past the opener into the roster renderer.
  const CODE = EYE_SRC.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  no(CODE, "window.openModal(", "the eye calls openModal directly, bypassing the funnel that owns the address");
  no(CODE, "PDXJudgeFile", "the eye renders the judge file itself instead of letting the intercept answer");
  eq((CODE.match(/PDXPerson\.open\(/g) || []).length, 1,
    "the person-file opener is called from more than one place in the panel");
  console.log(`      /p/${PID} advertised, Enter → ${fired.join(" → ")}, one personDoor, one PDXPerson.open`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the overlay is a finder: query, results, one clear close");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot();
  B.lane("formal");
  const h = B.search("chew");
  // ONE CLOSE CONTROL, and it is the one the shell gives it.
  const closeFn = (EYE_SRC.match(/function close\(\) \{[\s\S]*?\n    \}/) || [""])[0];
  ok(closeFn.length > 0, "all-seeing-eye.js has no close()");
  has(closeFn, "is-open", "close() no longer closes the panel");
  for (const banned of ["scrim", "overflow", "scroll-lock", "no-scroll", "backdrop", "inert", "aria-modal"]) {
    no(closeFn, banned, `close() manages ${JSON.stringify(banned)} — a finder that locks the page is a second homepage`);
  }
  const openFn = (EYE_SRC.match(/function open\(\) \{[\s\S]*?\n    \}/) || [""])[0];
  for (const banned of ["scrim", "overflow", "scroll-lock", "no-scroll", "backdrop", "aria-modal"]) {
    no(openFn, banned, `open() paints ${JSON.stringify(banned)} — the overlay is a dropdown, not a modal`);
  }
  // The results are a listbox of options, not a page.
  has(h, 'role="option"', "the results are no longer options in a listbox");
  no(h, 'role="dialog"', "the panel declares itself a dialog — it is a finder over the page, not a second one");
  // NOTHING INTERACTIVE IS NESTED. The row is one control; the chips and the
  // action strip are its SIBLINGS. A control inside a control makes the parser
  // close the outer one early and drops the rest of the row.
  const res = (String(h).match(/<div class="pdx-eye-res"[\s\S]*?(?=<div class="pdx-eye-res"|<div class="pdx-eye-cat"|$)/) || [""])[0];
  must(res.length > 100, "no result wrapper could be read out of the markup");
  let depth = 0, worst = 0;
  for (const m of res.matchAll(/<(\/?)(a|button)\b/g)) { depth += m[1] ? -1 : 1; worst = Math.max(worst, depth); }
  eq(worst, 1, `a result nests interactive markup ${worst} deep — the row, its chips and its actions are siblings`);
  console.log(`      close() removes one class · results are options · interactive depth ${worst}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · issue and bill hits keep the doors they already have");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot();
  B.lane("formal");
  const shapes = new Set();
  for (const q of ["chew", "lee", "climate", "public lands", "education", "hb 400", "h.r. 22"]) {
    for (const u of HREFS(B.search(q))) {
      const m = /^\/([a-z]+)\//.exec(u);
      if (m) shapes.add("/" + m[1] + "/");
    }
  }
  // Three address shapes, all of them shapes the app already owned. A fourth is
  // a third door onto something that already has one.
  const allowed = new Set(["/p/", "/i/", "/b/"]);
  const invented = [...shapes].filter((s) => !allowed.has(s));
  eq(invented.join(", "), "", `the panel advertises ${invented.length} address shape(s) the app did not already own`);
  ok(shapes.has("/p/"), "no person address is advertised anywhere in the panel");
  const nav = (EYE_SRC.match(/function navigate\(kind, data\) \{[\s\S]*?\n    \}/) || [""])[0];
  has(nav, "PDXIssueView", "an issue hit no longer opens the issue surface that owns /i/");
  has(nav, "issuefile", "the published issue file lost its own arm");
  has(nav, "kind === 'bill'", "a bill hit lost its arm — /b/ is not this panel's to reinvent");
  console.log(`      address shapes advertised: ${[...shapes].sort().join(" ") || "(none)"}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · nothing on the do-not list moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  const headEye = HEAD("all-seeing-eye.js");
  must(headEye, "the previous revision is unreachable, so 'no new score' has nothing to be measured against");
  // NO NEW SCORE. The three functions that decide what wins are byte-identical.
  const grab = (src, sig) => (src.match(new RegExp("function " + sig + "[\\s\\S]*?\\n    \\}")) || [""])[0];
  for (const sig of ["score\\(", "rank\\(", "formalFirst\\("]) {
    const a = grab(headEye, sig), b = grab(EYE_SRC, sig);
    must(a.length > 0, `the previous revision has no ${sig.replace("\\(", "()")} to compare`);
    eq(b, a, `${sig.replace("\\(", "()")} changed — this pass groups people, it does not re-rank them`);
  }
  // NO PARTY SORT. Rotate every letter in the roster; not one row moves.
  const plain = boot(), rot = boot({ party: true });
  for (const mode of ["formal", "public"]) {
    plain.lane(mode); rot.lane(mode);
    for (const q of SMOKE_QUERIES.concat(["uinta basin"])) {
      eq(PERSON_IDS(rot.search(q)).join("|"), PERSON_IDS(plain.search(q)).join("|"),
        `${mode}/${q}: the order moved when every party letter was rotated`);
    }
  }
  // AND NONE OF THE SURFACES THIS PASS WAS TOLD TO LEAVE ALONE ARE TOUCHED.
  const CODE = EYE_SRC.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  for (const banned of ["DistrictVoice", "PDX_DISTRICT_VOICE", "PACK_TTL", "packTtl"]) {
    no(CODE, banned, `the panel reaches into ${JSON.stringify(banned)}, which is out of scope for this pass`);
  }
  console.log("      score/rank/formalFirst byte-identical · party rotation rejected in 2 lanes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · the smoke: one Chew, one Lee, one Moore, and Enter opens the file");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot();
  B.lane("formal");
  const ALIAS = B.win.PDX_PROFILE_ALIAS || {};
  const canon = (id) => ALIAS[id] || id;
  for (const q of SMOKE_QUERIES) {
    const h = B.search(q);
    const people = PERSON_IDS(h).map(canon);
    must(people.length > 0, `the eye answered the smoke query ${JSON.stringify(q)} with nobody`);
    // People who share a surname are different people and keep their own rows.
    // What the smoke is about is the SAME person appearing twice.
    eq(dupes(people).join(", "), "",
      `${JSON.stringify(q)}: the panel names the same person more than once (${dupes(people).join(", ")})`);
    const leaked = Object.keys(ALIAS).filter((k) => h.includes(k));
    eq(leaked.join(", "), "", `${JSON.stringify(q)}: a retired id reached the markup`);
    // And the address bar matches what a tap would open: the href on the leading
    // row and the pid its handler hands the opener are the same person.
    const rows = ALL_ROWS(h);
    const at = rows.findIndex((r) => r.kind === "pol" || r.kind === "judge");
    must(at >= 0, `${JSON.stringify(q)}: no person row to activate`);
    const lead = rows[at].id;
    has(h, `href="/p/${lead}"`, `${JSON.stringify(q)}: the leading person row's address is not the pid it opens`);
    const fired = B.enterRowAt(at);
    eq(fired[0], `person:${lead}`,
      `${JSON.stringify(q)}: Enter opened ${JSON.stringify(fired[0] || "nothing")} rather than the row it highlighted`);
  }
  console.log(`      ${SMOKE_QUERIES.map((q) => JSON.stringify(q)).join(" ")} — no person twice, address bar matches`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("10 · it ships: the eye is a runtime cache entry");
// ═════════════════════════════════════════════════════════════════════════════
{
  const SW = R("sw.js");
  const v = Number(String((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1] || 0));
  ok(v >= 139,
    `sw.js CACHE_VERSION is v${v || "?"} — the panel changed and a warm device would keep serving the copy that ` +
    "prints one person twice");
  has(SW, "const RUNTIME_CACHE = `politidex-runtime-${CACHE_VERSION}`",
    "the runtime cache name no longer carries CACHE_VERSION, so a bump does not drop the stale panel");
  console.log(`      CACHE_VERSION v${v}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("11 · twin boot — Direction Match and every formal tier are untouched");
// ═════════════════════════════════════════════════════════════════════════════
{
  const corpus = buildCorpus(ROOT);
  must(corpus && corpus.byMember && corpus.byMember.size > 300,
    `the record corpus loaded ${corpus && corpus.byMember ? corpus.byMember.size : 0} members`);

  // The arithmetic, booted three ways: the engine alone, the engine with this
  // panel executed on top of it, and the panel with the identity spine that does
  // the grouping. A finder may not be able to move a reading, and a grouping may
  // not either — the collapse changes which ROWS a query prints, and nothing else.
  function engine(files) {
    const win = makeSandbox();
    win.history = { replaceState() {}, pushState() {} };
    const panel = stubNode(), input = stubNode(), eye = stubNode(), clear = stubNode();
    input.tagName = "TEXTAREA";
    const ids = { "pdx-eye-panel": panel, "pdx-eye-input": input, "pdx-eye": eye, "pdx-eye-clear": clear };
    win.document.getElementById = (id) => ids[id] || null;
    const ctx = vm.createContext(win);
    for (const f of files) vm.runInContext(R(f), ctx, { filename: f });
    win.PROFILES = Object.assign({}, win.CMP_DATA, { [RETIRED]: STUB });
    win.PDXSpotlight = { list: () => [SPOT], registry: { [SPOT.slug]: SPOT } };
    win.PDXLazyData = { ensure: () => Promise.resolve(true), loaded: () => true, whenReady: (k, cb) => cb() };
    win.PDX_BILLS_INDEX = win.PDX_BILLS_INDEX || [];
    win._issueLabel = (k) => (win.ISSUE_MAP && win.ISSUE_MAP[k] && win.ISSUE_MAP[k].label) || "";
    for (const [pid, recs] of corpus.byMember) {
      try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* no record surface here */ }
    }
    return win;
  }
  const BASE = [...ENGINE_FILES, "pdx-issue-family.js", "issue-colors.js", "voting-record.js"];
  const bare = engine(BASE);
  const withEye = engine([...BASE, ...SPINE, "all-seeing-eye.js"]);
  const coldEye = engine([...BASE, "all-seeing-eye.js"]);
  must(bare.PDXConsistency && typeof bare.PDXConsistency.scopedOverall === "function",
    "consistency.js did not boot in the bare twin");
  must(withEye.PDXEye, "all-seeing-eye.js did not boot in the loaded twin");

  const scopes = Object.keys(bare.PDXConsistency.SCOPES || {});
  must(scopes.length > 0, "PDXConsistency.SCOPES is empty");
  const drift = [];
  let swept = 0;
  for (const [pid] of corpus.byMember) {
    swept++;
    for (const sc of scopes) {
      const a = JSON.stringify(bare.PDXConsistency.scopedOverall(sc, pid));
      if (JSON.stringify(withEye.PDXConsistency.scopedOverall(sc, pid)) !== a) drift.push(`${pid}/${sc}/eye`);
      if (JSON.stringify(coldEye.PDXConsistency.scopedOverall(sc, pid)) !== a) drift.push(`${pid}/${sc}/spine`);
    }
    const t = JSON.stringify(bare.PDXConsistency.formalPatternIndex.shape(pid));
    if (JSON.stringify(withEye.PDXConsistency.formalPatternIndex.shape(pid)) !== t) drift.push(`${pid}/formal/eye`);
    if (JSON.stringify(coldEye.PDXConsistency.formalPatternIndex.shape(pid)) !== t) drift.push(`${pid}/formal/spine`);
    const w = JSON.stringify(bare.PDXWordAction.read(pid));
    if (JSON.stringify(withEye.PDXWordAction.read(pid)) !== w) drift.push(`${pid}/ledger/eye`);
  }
  ok(swept > 300, `the twin boot only swept ${swept} files`);
  eq(drift.slice(0, 8).join(" | "), "",
    `${drift.length} Direction Match read(s) / formal tier(s) moved — this pass groups people and must move none`);

  // AND THE COLD PANEL STILL ANSWERS. With no alias table and no person-link on
  // the page — the state the first few milliseconds of a real load are in — the
  // eye still finds people and still hands their raw ids to a working control.
  // There is no /p/ href in that state and there must not be one invented here:
  // person-link.js is the module that owns the address, and a panel that spelled
  // an address itself would be a second opinion on where a person lives. The row
  // degrades to the <button> it was before Phase 1, which opens the same file
  // through the same handler.
  const cold = boot({ noSpine: true });
  cold.lane("formal");
  const ch = cold.search("chew");
  const coldRows = ROW_IDS(ch);
  ok(coldRows.length > 0, "with no identity spine loaded the panel stopped finding people — it must fail open");
  ok(coldRows.every((id) => id.length > 0), "the cold panel printed a person row with no id to open");
  has(ch, 'role="option"', "the cold panel's rows are not activatable controls");
  has(ch, "<button", "the cold panel did not fall back to a button where it cannot spell an address");
  console.log(`      ${swept} files × ${scopes.length} scopes swept in 3 boots; no read moved; cold panel still answers`);
}

// ── report ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ eye one person per office: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`✓ eye one person per office: one row, one chip, one door per person — ${passed} assertions passed\n`);
