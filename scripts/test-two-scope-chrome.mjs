#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-two-scope-chrome.mjs — one archive, two scopes, stated before it costs
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex answers two different questions at two different resolutions:
//
//   NATIONAL — the record. Anyone in the roster, from any state, year-round.
//   UTAH — the ballot. District-mapped seats, curated local rosters, dates.
//
// The engines already knew this. pdxRepsForMe() returns districtsResolvable and
// blanks the district rows outside Utah; the ballot workspace has a 'district'
// gate whose copy says PolitiDex draws Utah's lines only. But every one of those
// admissions was a per-ROW disclosure that only appeared after the reader had
// set a location and hit the blank — while Door 2 opened by promising a national
// ballot product to everybody. The scope was discoverable only by
// disappointment.
//
// And underneath the copy there was a real one: outside Utah, _ballotCandidates
// answered the three DISTRICT seats by STATE. An Ohio visitor's "State Senate"
// field was every Ohio state senator the roster holds — 33 districts' worth of
// real people, presented as the field for one seat. Every name was true and
// almost none of them was on that ballot, which is the worst kind of wrong
// answer.
//
// What must stay true:
//
//   1. THE SCOPES ARE STATED IN THE CHROME, worded once, before the reader
//      spends anything — and the ballot scope names Utah as the current limit.
//   2. IT STATES, IT DOES NOT GATE. The scope module holds no roster, no seat
//      list, no pick store; the honest blanks stay owned by the modules that
//      already own them.
//   3. NO COVERAGE FIGURE. No state count, no percentage, no "N tracked" — a
//      number in a scope statement is a coverage claim.
//   4. NO PLAUSIBLE STRANGERS. Outside Utah, the three district seats resolve no
//      field at all unless a district actually matches. Statewide seats still do.
//   5. THE BLANKS STILL EXPLAIN THEMSELVES where they appear, in the words the
//      product already used.
//   6. WHO REPRESENTS ME IS A FRONT STEP, NOT A THIRD DOOR.
//   7. DOOR 2 DOES NOT PROMISE A NATIONAL COMPLETE BALLOT.
//
//   node scripts/test-two-scope-chrome.mjs

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const CODE = (f) => R(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/<!--[\s\S]*?-->/g, "");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ two-scope chrome: STALE HARNESS — ${m}`); process.exit(2); };

const INDEX = R("index.html");
const HTML = INDEX.replace(/<!--[\s\S]*?-->/g, "");
const SC_SRC = R("scope-chrome.js");
const SC_CODE = CODE("scope-chrome.js");

// ─────────────────────────────────────────────────────────────────────────────
// 1 · Both scopes, worded once
// ─────────────────────────────────────────────────────────────────────────────
section("1 · the two scopes are stated, and Utah is named as the ballot limit");

function sandbox(reps) {
  const els = {};
  const mk = (id) => ({
    id, innerHTML: "", parentNode: null, children: [],
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); return c; },
  });
  const hub = mk("vh-intro");
  const depthParent = mk("depth-parent");
  const depth = mk("tracker-depth-line");
  depth.parentNode = depthParent;
  els["tracker-depth-line"] = depth;
  // Created nodes have to become findable by id, or slot()'s idempotency check
  // never sees the slot it made last time and this harness measures its own
  // amnesia instead of the module's behaviour.
  const made = [];
  const doc = {
    readyState: "complete",
    addEventListener() {},
    getElementById(id) {
      if (els[id]) return els[id];
      return made.find((n) => n.id === id) || null;
    },
    createElement() { const n = mk(""); made.push(n); return n; },
    querySelector(sel) { return sel.includes("vh-intro") ? hub : null; },
    querySelectorAll() { return []; },
  };
  const win = {
    document: doc, addEventListener() {}, setTimeout() { return 0; },
    pdxRepsForMe: reps === undefined ? undefined : () => reps,
  };
  win.window = win;
  win.globalThis = win;
  const ctx = vm.createContext(win);
  new vm.Script(SC_SRC, { filename: "scope-chrome.js" }).runInContext(ctx);
  return { S: win.PDXScope, hub, depthParent, els };
}

const { S, hub, depthParent } = sandbox(undefined);
must(S && Array.isArray(S.SCOPES), "PDXScope did not register in a sandbox");

eq(S.BALLOT_STATE, "Utah", "the ballot scope is no longer Utah — the copy and the resolver would now disagree");
eq(S.SCOPES.length, 2, "there are no longer exactly two scopes");
const ids = S.SCOPES.map((s) => s.id).sort();
eq(ids.join(","), "ballot,national", "the two declared scopes are not the national record and the mapped ballot");
for (const sc of S.SCOPES) ok(sc.where && sc.what && sc.body, `scope ${sc.id} is declared without where/what/body`);
const ballot = S.SCOPES.find((s) => s.id === "ballot");
has(ballot.body, "Utah", "the ballot scope does not name Utah as its limit");
has(ballot.body, "today", "the ballot scope does not present its limit as current rather than permanent");

// The strip actually paints into Door 2, and the one-line form into the archive.
S.sync();
ok(hub.children.length === 1, `the scope strip did not mount into Door 2's intro (${hub.children.length} children)`);
has(hub.children[0].innerHTML, "One archive · two scopes", "the strip does not state that there is one archive");
ok(depthParent.children.length === 1, "the one-line scope note did not mount into the archive header");
has(depthParent.children[0].innerHTML, "national", "the archive header does not say the archive is national");

// Painting twice does not stack two strips.
S.sync();
eq(hub.children.length, 1, "a second sync stacked a second scope strip");

// ─────────────────────────────────────────────────────────────────────────────
// 2 · It states, it does not gate
// ─────────────────────────────────────────────────────────────────────────────
section("2 · the scope module holds no data and decides nothing");

for (const banned of ["CMP_DATA", "TEAM_POSITIONS", "_ballotCandidates", "_ballotLoad", "localStorage", "ISSUE_STANCE_DATA"]) {
  ok(!SC_CODE.includes(banned),
     `scope-chrome.js reads ${banned} — a label on a truth must not become a second source of it`);
}
// It reads the resolver rather than the raw location, so it cannot disagree with
// the module that decides what "your districts are mapped" means.
has(SC_CODE, "pdxRepsForMe", "scope-chrome.js does not read the location resolver");
ok(!SC_CODE.includes("_currentVoterLocation"),
   "scope-chrome.js reads the raw location — that is a second reading of what districtsResolvable already answers");
// No resolver at all still prints the standing statement, because it is true
// regardless of who is looking.
const noResolver = sandbox(undefined);
noResolver.S.sync();
ok(noResolver.hub.children.length === 1, "with no resolver loaded the standing scope statement disappeared");

// ─────────────────────────────────────────────────────────────────────────────
// 3 · No coverage figure anywhere in the scope chrome
// ─────────────────────────────────────────────────────────────────────────────
section("3 · no number becomes a coverage claim");

for (const p of [/\b\d+\s*states?\b/i, /\b\d+\s*%/, /\b\d+\s*politicians\b/i, /\bcomplete\b/i, /\bfull ballot\b/i, /\bevery contest\b/i]) {
  ok(!p.test(SC_CODE), `scope-chrome.js copy matches ${p} — that is a coverage claim, not a scope statement`);
}
for (const banned of ["Direction Match", "Word vs Action", "Record Match", "Republican", "Democrat"]) {
  ok(!SC_CODE.includes(banned), `scope-chrome.js prints ${JSON.stringify(banned)} — the chrome states geography, nothing else`);
}
// And the strip is styled as a masthead, not as a warning.
const CSS = R("scope-chrome.css");
ok(!/@keyframes/.test(CSS), "the scope statement animates — standing text that fades in reads as a promotion");
ok(!/rgba\(245,\s*158,\s*11/.test(CSS) && !/#f59e0b/i.test(CSS),
   "the scope statement is styled in warning amber — a working limit must not look like a fault");

// ─────────────────────────────────────────────────────────────────────────────
// 4 · No plausible strangers: district seats outside Utah resolve nothing
// ─────────────────────────────────────────────────────────────────────────────
section("4 · outside Utah, a district seat has no field rather than the wrong one");

const BB = CODE("ballot-breakdown.js");
must(BB.includes("function _ballotCandidates"), "_ballotCandidates was renamed — this probe is stale");
const FN_START = BB.indexOf("function _ballotCandidates");
const FN = BB.slice(FN_START, BB.indexOf("ORDER:", FN_START) > 0 ? BB.indexOf("ORDER:", FN_START) : FN_START + 12000);
must(FN.length > 2000, `_ballotCandidates could not be sliced (${FN.length})`);

// The two state-legislative seats must refuse outright: those are district seats
// and PolitiDex draws Utah's lines only.
const ssBlock = FN.slice(FN.indexOf("raceKey === 'statesenate'"), FN.indexOf("raceKey === 'local'"));
must(ssBlock.length > 100, "the state-legislature branches could not be sliced");
ok(!/state\\s\*sen\|senator/.test(ssBlock) || /match = false/.test(ssBlock),
   "the State Senate branch still answers by state outside Utah");
eq((ssBlock.match(/match = false;/g) || []).length, 2,
   "both state-legislative seats must refuse outside Utah — matching a district seat by state is a different question with a much longer answer");

// The U.S. House seat may still answer, but only on a real district match.
const houseBlock = FN.slice(FN.indexOf("raceKey === 'house'"), FN.indexOf("raceKey === 'governor'"));
must(houseBlock.length > 400, "the U.S. House branch could not be sliced");
ok(!/var distMatch = true/.test(houseBlock),
   "the U.S. House branch still starts from 'the district matches' and only narrows when it can — that is how a whole state delegation became one seat's field");
has(houseBlock, "userDistNum && polDistNum",
    "the U.S. House branch no longer requires both districts to be readable before it matches");

// Statewide seats are untouched: every state has two senators and a governor.
for (const key of ["'senate'", "'governor'"]) {
  const i = FN.indexOf("raceKey === " + key);
  must(i > 0, `the ${key} branch could not be found`);
  has(FN.slice(i, i + 400), "polStateName.toLowerCase() === userState.toLowerCase()",
      `the ${key} branch no longer resolves from the reader's state — statewide seats resolve everywhere`);
}

// The resolver's own contract is unchanged: Utah-only district geometry, stated.
const VHL = CODE("voter-hub-location.js");
has(VHL, "districtsResolvable: utah", "pdxRepsForMe no longer reports Utah-only district geometry");

// ─────────────────────────────────────────────────────────────────────────────
// 5 · The blanks still explain themselves, in the product's own words
// ─────────────────────────────────────────────────────────────────────────────
section("5 · every blank still says which fact is missing");

has(CODE("who-represents-me.js"), "PolitiDex only maps districts in Utah so far",
    "who-represents-me.js no longer explains why the district rows are blank");
has(CODE("ballot-workspace.js"), "PolitiDex draws district lines for Utah only",
    "the workspace's district gate no longer explains itself");
has(HTML, "which we map in Utah so far",
    "the standing Who Represents Me scope paragraph is gone");
// And the reader-specific line in the new chrome says the same thing in one line
// rather than re-arguing it.
const outLine = sandbox({ located: true, national: false, state: "Ohio", area: "Columbus", districtsResolvable: false }).S.line();
has(outLine, "Columbus", "the out-of-state line does not name where the reader set");
has(outLine, "U.S. Senate and Governor", "the out-of-state line does not say which seats DO resolve");
has(outLine, "needs a district map", "the out-of-state line does not say what the blank seats are missing");
has(outLine, "Utah", "the out-of-state line does not name the state whose lines are mapped");

const inLine = sandbox({ located: true, national: false, state: "Utah", area: "Provo", districtsResolvable: true }).S.line();
has(inLine, "Provo", "the in-state line does not name where the reader set");
ok(!/needs a district map/.test(inLine), "a Utah reader is told their district seats need a map they already have");

const coldLine = sandbox({ located: false, national: false, state: "", area: "", districtsResolvable: false }).S.line();
ok(!/Ohio|Provo|blank/.test(coldLine), "the pre-location line speculates about a reader we know nothing about");

// ─────────────────────────────────────────────────────────────────────────────
// 6 · Who Represents Me is the front step, not a third door
// ─────────────────────────────────────────────────────────────────────────────
section("6 · a front step, not a door");

const SHIPPED = readdirSync(ROOT).filter((f) => f.endsWith(".js") && !f.startsWith("sw") && !f.includes(".min."));
for (const f of ["index.html", ...SHIPPED]) {
  const src = f === "index.html" ? HTML : CODE(f);
  ok(!/third door/i.test(src), `${f} calls something a third door`);
  ok(!/three doors/i.test(src), `${f} says the product has three doors`);
}
// The nav still offers it by name, and it still leads into the ballot loop.
has(HTML, 'href="#who-represents-me"', "the front step lost its nav entry");
has(CODE("who-represents-me.js"), "pdxBallotWorkspaceOpen",
    "Who Represents Me no longer hands off into the Door 2 workspace, which is the whole point of a front step");

// ─────────────────────────────────────────────────────────────────────────────
// 7 · Door 2 does not promise a national complete ballot
// ─────────────────────────────────────────────────────────────────────────────
section("7 · Door 2's own opening does not overpromise");

const hubIntro = HTML.slice(HTML.indexOf('id="voter-hub"'), HTML.indexOf('id="voter-hub"') + 30000);
must(hubIntro.includes("BUILD YOUR VOTING"), "the Door 2 intro could not be sliced — this probe is stale");
has(hubIntro, "For each seat PolitiDex can resolve for you",
    "the Door 2 opening still promises to fill every seat rather than the ones it can resolve");
has(hubIntro, "says so instead of filling in a stranger",
    "the Door 2 opening does not state what happens to a seat it cannot resolve");
has(INDEX, 'src="/scope-chrome.js"', "index.html does not load scope-chrome.js");
has(INDEX, "scope-chrome.css", "index.html does not load scope-chrome.css");

console.log("");
if (failures.length) {
  console.error(`✗ two-scope chrome: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ two-scope chrome: one archive, two scopes stated up front, and no district seat answered by state — ${passed} assertions passed\n`);
