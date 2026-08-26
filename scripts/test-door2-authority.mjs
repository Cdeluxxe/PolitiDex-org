#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-door2-authority.mjs — Door 2 is one workspace with views, not four tools
// ─────────────────────────────────────────────────────────────────────────────
// Door 2 accumulated four surfaces that all did something with a ballot: the
// one-seat-at-a-time workspace, "Your Ballot" (every tracked contest listed at
// once), "My Voting Team" (the picks, side by side) and the finished-slate page.
// They never actually disagreed — all four read window.TEAM_POSITIONS and the
// same pick store, so the counts were consistent by construction. The defect was
// legibility, and it was worse than a disagreement would have been: two
// identical counters under two different headings do not read as one tool
// showing itself twice, they read as two products that happen to agree. A reader
// who has just set six picks in the workspace and then meets "MY VOTING TEAM
// 0/6 … 6 of 6 picks set" one screen down cannot tell which one to trust.
//
// So one surface is named the authority and the rest say what they are.
//
// What must stay true:
//
//   1. ONE AUTHORITY, NAMED. PDXDoor2.AUTHORITY is the workspace, and the views
//      are declared rather than discovered.
//   2. THE SPINE COMPUTES NOTHING. No seat list, no pick state, no count, no
//      order of its own. Every number it prints is read from
//      PDXBallotWorkspace — a fourth opinion is the whole problem.
//   3. NO SCORE, NO PARTY, NO DIRECTION MATCH in the view chrome, and no second
//      progress meter competing with the workspace rail.
//   4. NO COMPLETENESS CLAIM. The views describe what they show in
//      coverage-bounded words, and the official-ballot boundary stays owned by
//      your-ballot.js rather than restated here.
//   5. BROCHURE CTAs ARE DEMOTED, NOT DELETED — re-aimed at the workspace, and
//      re-worded, because a link that keeps its old promise and changes its
//      destination is its own small lie. Nav and footer links are untouched:
//      a reader who asks for My Voting Team by name should get it.
//   6. THE WORKSPACE IS STILL THE PRIMARY LOOP, and nothing in this pass moved,
//      merged or deleted a surface.
//   7. STALE DOCTRINE IS CORRECTED. Nothing in the markup still calls a view the
//      page's primary destination.
//
//   node scripts/test-door2-authority.mjs

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const CODE = (f) => R(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ door 2 authority: STALE HARNESS — ${m}`); process.exit(2); };

const INDEX = R("index.html");
const HTML = INDEX.replace(/<!--[\s\S]*?-->/g, "");
const SPINE = R("door2-spine.js");
const SPINE_CODE = CODE("door2-spine.js");

// ─────────────────────────────────────────────────────────────────────────────
// 1 · The module, in a sandbox with a workspace to read
// ─────────────────────────────────────────────────────────────────────────────
section("1 · one authority, declared views");

function mkEl(id) {
  const attrs = {};
  const node = {
    id, innerHTML: "", attrs, children: [], firstChild: null,
    setAttribute(k, v) { attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
    removeAttribute(k) { delete attrs[k]; },
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    appendChild(c) { node.children.push(c); c.parentNode = node; if (!node.firstChild) node.firstChild = c; return c; },
    insertBefore(c) { node.children.unshift(c); c.parentNode = node; node.firstChild = c; return c; },
    scrollIntoView() { node._scrolled = true; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  return node;
}

function sandbox(opts) {
  opts = opts || {};
  const els = {};
  const made = [];
  const doc = {
    readyState: "complete",
    addEventListener() {},
    getElementById(id) { return els[id] || null; },
    createElement() { const n = mkEl(""); made.push(n); return n; },
    querySelectorAll(sel) { return (opts.selectors && opts.selectors[sel]) || []; },
    querySelector() { return null; },
  };
  for (const id of opts.ids || []) els[id] = mkEl(id);
  const win = {
    document: doc, addEventListener() {}, setTimeout() { return 0; },
    PDXBallotWorkspace: opts.workspace || null,
  };
  win.window = win;
  win.globalThis = win;
  const ctx = vm.createContext(win);
  new vm.Script(SPINE, { filename: "door2-spine.js" }).runInContext(ctx);
  return { win, els, made, D: win.PDXDoor2 };
}

const base = sandbox({});
must(base.D && Array.isArray(base.D.VIEWS), "PDXDoor2 did not register in a sandbox");

eq(base.D.AUTHORITY, "ballot-workspace", "the Door 2 authority is no longer the ballot workspace");
has(HTML, 'id="ballot-workspace"', "the authority surface is not in the document");
eq(base.D.VIEWS.length, 3, "the declared view list changed size");
// A view's mount is either static markup or a section a module creates for
// itself (your-ballot.js sets section.id = MOUNT_ID at first paint), so both
// count — but a declared view with NO mount anywhere is a strip painted into
// nothing.
const SHIPPED = readdirSync(ROOT).filter((f) => f.endsWith(".js") && !f.startsWith("sw") && !f.includes(".min."));
const MOUNT_SRC = HTML + "\n" + SHIPPED.map((f) => R(f)).join("\n");
must(MOUNT_SRC.length > 100000, `the mount sweep found the client modules (${SHIPPED.length})`);
for (const v of base.D.VIEWS) {
  ok(MOUNT_SRC.includes(`id="${v.id}"`) || MOUNT_SRC.includes(`'${v.id}'`) || MOUNT_SRC.includes(`"${v.id}"`),
     `the declared view ${v.id} has no mount in the document and no module that creates one`);
  ok(v.label && v.job, `${v.id} is declared without a label or a job description`);
  ok(v.id !== base.D.AUTHORITY, "a view is declared as the authority as well");
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 · It computes nothing — every number comes from the workspace
// ─────────────────────────────────────────────────────────────────────────────
section("2 · the count is read, never derived");

const withWs = sandbox({ workspace: { _decided: () => 4, _seats: () => [1, 2, 3, 4, 5, 6] } });
const p = withWs.D.progress();
ok(p.ok, "progress() reported no answer with a workspace present");
eq(p.decided, 4, "progress() did not report the workspace's decided count");
eq(p.total, 6, "progress() did not report the workspace's seat count");

// No workspace means NO COUNT, not a zero. A zero next to "seats decided" is a
// finding; silence is the truth when the surface that knows has not loaded.
const noWs = sandbox({ workspace: null }).D.progress();
ok(!noWs.ok, "progress() invents an answer when the workspace has not loaded");
const stripNoWs = sandbox({ workspace: null }).D._strip(base.D.VIEWS[0]);
ok(!/\d/.test(stripNoWs.replace(/[^0-9]/g, "")) || !/d2-view-count/.test(stripNoWs),
   "a view strip printed a count with no workspace to read it from");

// And it holds no store of its own.
for (const banned of ["TEAM_POSITIONS", "_ballotLoad", "_ballotCandidates", "localStorage", "_pdxVoterBallot"]) {
  ok(!SPINE_CODE.includes(banned),
     `door2-spine.js reads ${banned} directly — that is a fourth opinion about the ballot`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 · The chrome carries no finding
// ─────────────────────────────────────────────────────────────────────────────
section("3 · no score, no party, no second progress meter");

for (const banned of ["Direction Match", "Word vs Action", "Record Match", "Republican", "Democrat", "party", "grade"]) {
  ok(!SPINE_CODE.includes(banned),
     `the Door 2 view chrome prints ${JSON.stringify(banned)} — the views label sections, they do not judge people`);
}
const CSS = R("door2-spine.css");
// A second animated meter is the exact "two products keeping two scores"
// impression this pass removes, so the count is styled as a fact.
for (const banned of ["@keyframes", "transition: width", "linear-gradient(90deg"]) {
  ok(!CSS.includes(banned), `door2-spine.css declares ${JSON.stringify(banned)} — that is a progress bar competing with the rail`);
}
has(CSS, "tabular-nums", "the view count is not set in tabular figures, so it jitters as it climbs");

// ─────────────────────────────────────────────────────────────────────────────
// 4 · No completeness claim, and the boundary stays where it lives
// ─────────────────────────────────────────────────────────────────────────────
section("4 · coverage-bounded words only");

for (const p of [/\bcomplete ballot\b/i, /\bfull ballot\b/i, /\bwhole ballot\b/i, /\bevery contest on your\b/i, /\bofficial ballot\b/i]) {
  ok(!p.test(SPINE_CODE), `door2-spine.js copy matches ${p} — the views must not make a coverage claim`);
}
// The official-ballot boundary is stated once, by the surface that owns it.
has(R("your-ballot.js"), "official ballot", "the official-ballot boundary note left your-ballot.js");

// ─────────────────────────────────────────────────────────────────────────────
// 5 · Demotion: re-aimed, re-worded, and scoped
// ─────────────────────────────────────────────────────────────────────────────
section("5 · brochure CTAs are demoted; nav and footer are not");

ok(Array.isArray(base.D.DEMOTE) && base.D.DEMOTE.length >= 2, "the demotion list is empty or missing");
for (const e of base.D.DEMOTE) {
  ok(e.sel && e.label, "a demotion entry re-aims a link without re-wording it — the old promise would survive the new destination");
  // Every declared selector must actually match something in the shipped markup,
  // or the demotion silently does nothing.
  const attr = /href="([^"]+)"/.exec(e.sel);
  must(attr, `a demotion selector no longer targets an href (${e.sel})`);
  has(HTML, `href="${attr[1]}"`, `the demotion selector ${e.sel} matches nothing in the document`);
}
// It is an explicit list, not a sweep: a sweep would eventually catch a
// legitimate "back to my team" link and quietly redirect it.
ok(!/querySelectorAll\(['"]a\[href/.test(SPINE_CODE),
   "door2-spine.js sweeps anchors by href pattern — that will eventually redirect a legitimate back-link");
has(HTML, "← Back to building your Voting Team",
    "the in-context back-link into My Voting Team was removed — demotion was supposed to re-aim brochure CTAs, not delete navigation");

// The nav pill and the footer links keep pointing at the view by name.
const navHits = [...HTML.matchAll(/href="#my-politicians"/g)].length;
ok(navHits >= 4, `the My Voting Team links were deleted rather than demoted (${navHits} left)`);

// Demotion is recorded reversibly, so what it changed can be audited on a page.
has(SPINE_CODE, "data-door2-was", "demotion does not record the href it replaced");
has(CSS, "a.d2-demoted", "demotion has no visual weight change — a class name alone is not a demotion");

// ─────────────────────────────────────────────────────────────────────────────
// 6 · Nothing moved, and the primary loop is intact
// ─────────────────────────────────────────────────────────────────────────────
section("6 · the workspace still owns the loop");

// The spine only ever appends its own slot; it must not re-parent a surface.
for (const banned of ["removeChild", "replaceChild", "outerHTML", ".remove()"]) {
  ok(!SPINE_CODE.includes(banned),
     `door2-spine.js calls ${banned} — the views were supposed to be labelled, not moved`);
}
// The workspace's own entry points are untouched.
has(R("ballot-workspace.js"), "pdxBallotWorkspaceOpen", "the workspace's seat-open entry point is gone");
has(SPINE_CODE, "PDXBallotWorkspace", "the spine no longer reads the workspace it points at");
// And it resyncs off the same three writers the workspace does, rather than polling.
for (const w of ["ballotPickCard", "_updateTeamPositionsForLocation", "_pdxRaceSheetRefresh"]) {
  has(SPINE_CODE, w, `the spine does not resync on ${w}, so a pick can leave the view chrome stale`);
}
ok(!/setInterval/.test(SPINE_CODE), "door2-spine.js polls on an interval instead of following the writers");

// ─────────────────────────────────────────────────────────────────────────────
// 7 · The stale doctrine note is gone
// ─────────────────────────────────────────────────────────────────────────────
section("7 · no view still calls itself the page's primary destination");

ok(!/This is the page's PRIMARY destination — the one place voters build/.test(INDEX),
   "the My Voting Team comment still claims to be the page's primary destination");
// The correction is recorded rather than silently dropped, so the change is
// legible where the old claim used to be.
has(INDEX, "A VIEW of the Door 2 ballot workspace",
    "My Voting Team is no longer documented as a view of the workspace");
has(INDEX, 'src="/door2-spine.js"', "index.html does not load door2-spine.js");
has(INDEX, "door2-spine.css", "index.html does not load door2-spine.css");

// ─────────────────────────────────────────────────────────────────────────────
// 8 · The official-ballot boundary, on the surface that finishes the loop
// ─────────────────────────────────────────────────────────────────────────────
// Section 4 checks that the VIEWS make no coverage claim. This one checks the
// other half: that the claim they must not make is affirmatively DENIED on the
// workspace itself, at the moment a reader is most likely to conclude the
// opposite — a filled progress bar and a rail with every seat decided.
//
// The three failure modes, each asserted:
//
//   · A SECOND VOICE. The sentence carries a link that resolves against
//     PDX_ELECTION_DATA for the reader's current state. A copy of the sentence
//     living in ballot-workspace.js would eventually name a different authority
//     than Door 1 names to the same reader on the same day. So the workspace
//     borrows and never writes, and has no fallback string of its own.
//   · A SOFTENED BOUNDARY. With your-ballot.js absent the workspace prints
//     NOTHING. "Coverage may vary" would let a reader believe the caveat had been
//     made when it had not, which is worse than its visible absence.
//   · A BURIED BOUNDARY. The note shipping after the progress bar, or under a
//     rule that hides it, is the same as not shipping it.
//
// Both halves are RUN, not grepped: officialNote/officialLink are lifted out of
// the two shipped modules and executed against a stub location, so what is
// asserted is the sentence a reader actually gets.
section("8 · the official-ballot boundary is stated where the loop finishes");

const YB = R("your-ballot.js");
const BW = R("ballot-workspace.js");
const BW_CODE = CODE("ballot-workspace.js");

// ── Lift and run Door 1's sentence ───────────────────────────────────────────
const lift = (src, name, from) => {
  const i = src.indexOf(`function ${name}(`);
  must(i > 0, `${from} no longer defines ${name}() — the boundary moved`);
  let d = 0, j = src.indexOf("{", i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === "{") d++;
    else if (src[k] === "}" && --d === 0) return src.slice(i, k + 1);
  }
  must(false, `could not read ${name}() out of ${from}`);
};

const ybNote = (state) => {
  const box = {};
  const win = {
    _currentVoterLocation: state ? { state } : {},
    PDX_ELECTION_DATA: { links: { Utah: { label: "vote.utah.gov", url: "https://vote.utah.gov/" } } },
  };
  const ctx = vm.createContext({ window: win, out: box });
  vm.runInContext(
    "function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}\n" +
    lift(YB, "officialLink", "your-ballot.js") + "\n" +
    lift(YB, "officialNote", "your-ballot.js") + "\n" +
    ";out.note=officialNote();out.link=officialLink();",
    ctx, { filename: "your-ballot.js:officialNote" });
  return box;
};

const utah = ybNote("Utah");
const nowhere = ybNote("");
has(utah.note, "Not an official ballot", "Door 1's sentence no longer denies the claim outright");
has(utah.note, "vote.utah.gov", "the sentence does not name the reader's own state authority");
has(utah.note, "https://vote.utah.gov/", "and does not link it");
eq(nowhere.link.label, "vote.org", "with no location on file the national fallback is gone");
has(nowhere.note, "vote.org", "so a located-nowhere reader still gets an authority to check");
has(utah.note, "county clerk", "the sentence drops the county-clerk backstop Key Dates already uses");
has(utah.note, 'rel="noopener noreferrer"', "the outbound authority link is not hardened");
has(utah.note, 'target="_blank"', "the authority link navigates away from a half-worked ballot");
// It says what is missing by NAME. "Coverage may vary" is not a caveat.
for (const w of ["measures", "judicial retention", "local seats"]) {
  has(utah.note, w, `the sentence does not name ${w} as absent from the corpus`);
}
ok(!/\d\s*%/.test(utah.note), "the boundary note carries a figure — it is a boundary, not a score");

// ── The workspace borrows it, and holds no copy ──────────────────────────────
const wsNote = (host) => {
  const box = {};
  const ctx = vm.createContext({ window: host, out: box });
  vm.runInContext(lift(BW, "officialNote", "ballot-workspace.js") + "\n;out.html=officialNote();",
    ctx, { filename: "ballot-workspace.js:officialNote" });
  return box.html;
};

const wsOn = wsNote({ _pdxOfficialBallotNote: () => utah.note });
has(wsOn, "Not an official ballot", "the workspace does not render Door 1's sentence");
has(wsOn, "vote.utah.gov", "and drops the state authority link on the way through");
has(wsOn, 'class="bw-official"', "the borrowed sentence is not wrapped for the workspace's own styling");
// No module, no sentence — and no substitute for it.
eq(wsNote({}), "", "with your-ballot.js absent the workspace invents a boundary of its own");
eq(wsNote({ _pdxOfficialBallotNote: () => "" }), "", "an empty sentence is passed through as empty");
eq(wsNote({ _pdxOfficialBallotNote: () => { throw new Error("x"); } }), "",
   "a throwing exporter takes the whole workspace down with it");
// The sentence exists once. The workspace must not contain its own wording.
ok(!BW_CODE.includes("Not an official ballot"),
   "ballot-workspace.js carries its own copy of the boundary sentence — two copies drift");
for (const soft of ["coverage may vary", "may not be complete", "roughly", "approximate ballot"]) {
  ok(!BW_CODE.toLowerCase().includes(soft),
     `ballot-workspace.js softens the boundary with "${soft}"`);
}
has(BW_CODE, "_pdxOfficialBallotNote", "the workspace no longer reads the one exported sentence");
has(YB, "window._pdxOfficialBallotNote = officialNote",
    "your-ballot.js no longer exports the sentence it owns");
has(YB, "window._pdxOfficialBallotLink = officialLink",
    "your-ballot.js no longer exports the authority link it owns");

// ── No completeness regress, anywhere in the loop ────────────────────────────
// "official ballot" is exempted for these two files: they are the surfaces that
// say "NOT an official ballot", and a blanket ban would forbid the caveat itself.
for (const [f, src] of [["ballot-workspace.js", BW_CODE], ["your-ballot.js", CODE("your-ballot.js")]]) {
  for (const pat of [/\bcomplete ballot\b/i, /\bfull ballot\b/i, /\bwhole ballot\b/i,
                     /\byour entire ballot\b/i, /\bevery contest\b/i, /\bevery race on\b/i,
                     /\ball the races\b/i]) {
    ok(!pat.test(src), `${f} copy matches ${pat} — that is a coverage claim this product cannot make`);
  }
}
// The counter counts what we cover out of what we cover, and says so.
has(BW_CODE, "Every seat PolitiDex has candidate records for is below",
    "the workspace's own sub-copy no longer bounds what the rail contains");
ok(!/Every seat is below/.test(BW_CODE), "the unbounded 'every seat is below' claim came back");

// ── Placement: above the completion mechanics, and not hidden ────────────────
const iNote = BW.indexOf("officialNote() +");
const iProg = BW.indexOf('bw-prog"');
const iRail = BW.indexOf('\'<div class="bw-body">\' + railHtml(');
ok(iNote > 0, "the workspace no longer renders the note in sync()");
ok(iProg > iNote, "the progress bar prints before the boundary — the claim lands before the denial");
ok(iRail > iNote, "the seat rail prints before the boundary");
const BWCSS = R("ballot-workspace.css");
const rule = BWCSS.slice(BWCSS.indexOf(".bw-official"), BWCSS.indexOf(".bw-official") + 400);
ok(BWCSS.includes(".bw-official"), "the note ships with no styling of its own");
for (const hide of ["display:none", "display: none", "visibility:hidden", "visibility: hidden",
                    "font-size:0", "opacity:0", "opacity: 0"]) {
  ok(!rule.includes(hide), `.bw-official is suppressed with ${hide}`);
}
// The workspace mounts in the document, so the note has somewhere to land.
has(HTML, 'id="ballot-workspace"', "the workspace mount is gone from the document");
has(INDEX, 'src="/your-ballot.js"', "index.html no longer loads the module that owns the sentence");

console.log("");
if (failures.length) {
  console.error(`✗ door 2 authority: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ door 2 authority: one workspace, ${base.D.VIEWS.length} views that say so, and no second opinion about the ballot — ${passed} assertions passed\n`);
