#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-scope-honest-copy.mjs — the product does not promise more than it holds
// ─────────────────────────────────────────────────────────────────────────────
// Three separate ways this app used to overstate itself, all of them in copy
// rather than in code, which is exactly why nothing caught them:
//
//   1. A VERDICT IT DOES NOT DELIVER. The middle nav pill read "Check a Claim".
//      The All-Seeing Eye behind it does not rule a claim true or false — it
//      finds the formal record behind the claim and shows the receipts either
//      way. The label promised an adjudication.
//
//   2. A BALLOT IT DOES NOT HAVE. "Your complete ballot", "every contest you'll
//      actually vote on", "see your full ballot", "covers your whole ballot".
//      PolitiDex holds candidate records for the seats it has researched; a real
//      ballot also carries judicial retention, bond and school-board questions,
//      special districts and write-ins. A voter who trusted the word "complete"
//      could arrive at the polls having never seen half of it.
//
//   3. A THIRD DOOR THAT DOES NOT EXIST. The nav comment was headed "THREE
//      PILLS, THREE DOORS" and named a front step as a door. The product has
//      two: Door 1 is The Record, Door 2 is Your Ballot.
//
// And one measurement that was quietly making decisions it was never entitled
// to make: Direction Match — an INTEGRITY read, a person against their own word
// — was the sort key that ordered every candidate field in the app, and shared
// the word "Match" with the voter-alignment read printed beside it.
//
// What must stay true:
//
//   1. THE PILL NAMES THE BEHAVIOUR. No surface says "Check a Claim"; the pill
//      and its mobile twin say "Find the Record", and both still open the eye.
//   2. NO COMPLETENESS CLAIM. No shipped client file promises a complete / full
//      / whole ballot or "every contest".
//   3. THE BOUNDARY IS DRAWN. Your Ballot states it is not an official ballot,
//      in BOTH its states, and points at the official source using the app's
//      own existing election-authority table rather than a second list.
//   4. TWO DOORS. The nav documents two doors, keeps the THREE PILLS landmark
//      other suites slice on, and does not call the front step a door.
//   5. DIRECTION MATCH IS NOT A SORT KEY. _ballotCandidates orders a field by
//      officeholder-then-name, and nothing in it compares two `.score` values.
//   6. ONE NAME PER MEASUREMENT. Formal-record alignment with the voter is
//      "Your Record Match", resolved from one exported helper; the integrity
//      read is "Word vs Action" or "Direction Match" and never a bare number
//      without a kicker saying what it measured.
//
//   node scripts/test-scope-honest-copy.mjs

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const lacks = (h, n, m) => ok(!String(h).includes(n), `${m} — still contains ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ scope-honest copy: STALE HARNESS — ${m}`); process.exit(2); };

const INDEX = R("index.html");
// Copy lives in markup and in emitted template strings; comments are where the
// DOCTRINE lives. Some checks need one and some need the other, so both views
// are built up front rather than re-derived per assertion.
const HTML = INDEX.replace(/<!--[\s\S]*?-->/g, "");
const SHIPPED = readdirSync(ROOT)
  .filter((f) => f.endsWith(".js") && !f.startsWith("sw") && !f.includes(".min."));
// Strip JS line/block comments AND the <!-- … --> notes these modules leave
// inside the markup they emit, so a doctrine note about a retired string is
// never mistaken for the string itself.
const CODE = (f) => R(f)
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "")
  .replace(/<!--[\s\S]*?-->/g, "");
must(SHIPPED.length > 50, `the shipped-file sweep found the client modules (${SHIPPED.length})`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the pill names what happens, not a verdict");
// ═════════════════════════════════════════════════════════════════════════════
{
  const EYE = "Find the Record";
  eq((INDEX.match(/👁️ Find the Record<\/a>/g) || []).length, 2,
    "the eye entry is labelled 'Find the Record' in exactly two places (desktop bar + mobile menu)");
  // Comment-stripped: the nav's own note explains what "Check a Claim" promised
  // and why it went, and a doctrine note quoting a retired string is the record
  // of the decision, not the string coming back.
  for (const f of ["index.html", ...SHIPPED]) {
    lacks(f === "index.html" ? HTML : CODE(f), "Check a Claim",
      `${f} still says "Check a Claim" — the eye does not adjudicate a claim, it finds the record behind it`);
  }
  // The label change must not have broken what the control does.
  // Scoped to the eye entries specifically: #say-vs-do is also the receipts band's
  // anchor, so the footer link, the pulse chip and the dropdown item all share it.
  const pills = [...HTML.matchAll(/<a href="#say-vs-do"[^>]*>(👁️[^<]*)<\/a>/g)];
  eq(pills.length, 2, "both eye entries (desktop bar + mobile menu) survive");
  for (const [whole, label] of pills) {
    has(label, EYE, "a #say-vs-do entry is not labelled with the behaviour");
    has(whole, "window.pdxOpenEye", "…and it no longer opens the All-Seeing Eye");
  }
  // The tooltip has to describe finding, not judging.
  ok(!/title="[^"]*checks it against the voting record/.test(HTML),
    "the eye tooltip still says it 'checks' a claim — it reports the record, it does not return a verdict");
  has(HTML, "finds the voting record behind it",
    "the eye tooltip does not describe what it actually does");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · nothing claims a complete ballot");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Phrases that assert coverage the corpus cannot back. Each is checked against
  // code-with-comments-stripped so a note explaining the retirement is allowed
  // to quote the phrase it retired.
  // Anchored on a word boundary. Without it "declined to complete Ballotpedia's
  // questionnaire" — a sourced fact in the stance corpus about a candidate — reads
  // as the product promising a complete ballot.
  const OVERCLAIMS = [
    /\bcomplete ballot\b/,
    /\bfull ballot\b/,
    /\bwhole ballot\b/,
    /\bentire ballot\b/,
    /\bevery contest on your\b/,
    /\bevery contest you\b/,
    /\bevery seat on your ballot\b/,
  ];
  const SURFACES = ["index.html", ...SHIPPED, "your-ballot.css", "app.css", "ballot-workspace.css"];
  for (const f of SURFACES) {
    const src = f.endsWith(".css")
      ? R(f).replace(/\/\*[\s\S]*?\*\//g, "")
      : (f === "index.html" ? HTML : CODE(f));
    for (const p of OVERCLAIMS) {
      ok(!p.test(src.toLowerCase()),
        `${f} promises ${p} — PolitiDex holds the contests it has researched, which is never the whole ballot`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the official-ballot boundary is stated, in both states");
// ═════════════════════════════════════════════════════════════════════════════
{
  const YB = R("your-ballot.js");
  has(YB, "function officialNote()", "your-ballot.js has no official-ballot boundary helper");
  has(YB, "Not an official ballot", "the boundary does not say the plain thing");
  // Reuse, not a second list of official links to keep in sync.
  has(YB, "window.PDX_ELECTION_DATA", "the boundary invents its own official-source list");
  has(INDEX, "window.PDX_ELECTION_DATA = ", "…but index.html no longer defines that table");
  has(YB, "county clerk", "the boundary abandons the phrasing the Key Dates footer already uses");
  has(INDEX, "county clerk", "…which index.html no longer uses either");
  // Both states of the section: the set-location card and the located ballot.
  eq((YB.match(/officialNote\(\)/g) || []).length, 3,
    "the boundary is defined once and rendered in both states (empty + located)");
  const setloc = YB.slice(YB.indexOf("function renderEmpty"), YB.indexOf("function renderBallot"));
  has(setloc, "officialNote()", "the set-location state does not carry the boundary");
  const located = YB.slice(YB.indexOf("function renderBallot"), YB.indexOf("function updateProgress"));
  has(located, "officialNote()", "the located state does not carry the boundary");
  has(R("your-ballot.css"), ".yb-official", "the boundary has no style, so it will inherit whatever it lands in");
  // It must read as a limit, not as an alarm: no red, no warning glyph.
  const style = R("your-ballot.css").slice(R("your-ballot.css").indexOf(".yb-official"));
  ok(!/#f87171|#ef4444|rgba\(239, ?68, ?68/.test(style.slice(0, 400)),
    "the boundary is drawn in an alarm colour — it is a scope statement, not a failure");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · two doors, and a front step that is not called one");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Other suites slice index.html at this literal; it is a landmark, not prose.
  has(INDEX, "THREE PILLS", "the nav pill structure is no longer documented — several suites slice on this");
  lacks(INDEX, "THREE DOORS", "the nav still claims three doors; the product has two");
  const nav = INDEX.slice(INDEX.indexOf("THREE PILLS"), INDEX.indexOf("THREE PILLS") + 6000);
  has(nav, "TWO DOORS", "the nav comment does not state the real door count");
  has(nav, "Door 1", "…and does not name Door 1");
  has(nav, "Door 2", "…or Door 2");
  lacks(nav, "the record door", "the nav still calls a pill 'the record door' instead of Door 1");
  lacks(nav, "the ballot door", "the nav still calls a pill 'the ballot door' instead of Door 2");
  has(nav, "front step", "the front step is no longer identified as the step before both doors");
  // Order is still find → record → learn → build → decide.
  ok(nav.indexOf("#who-represents-me") < nav.indexOf("#say-vs-do"),
    "the lookup no longer comes before the record entry in the bar");
  ok(nav.indexOf("#say-vs-do") < nav.indexOf("#my-politicians"),
    "the record entry no longer comes before the ballot entry in the bar");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · Direction Match does not order a field");
// ═════════════════════════════════════════════════════════════════════════════
{
  const BB = R("ballot-breakdown.js");
  const fnStart = BB.indexOf("function _ballotCandidates(raceKey)");
  must(fnStart !== -1, "_ballotCandidates has been renamed — this section probes the wrong function");
  const body = BB.slice(fnStart, BB.indexOf("window._ballotCandidates = _ballotCandidates"));
  const bodyCode = body.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  has(bodyCode, "results.sort(", "the field is no longer sorted at all — order must be deterministic");
  ok(!/return\s+sb\s*-\s*sa|return\s+sa\s*-\s*sb/.test(bodyCode),
    "_ballotCandidates still compares two scores — Direction Match is ordering the field again");
  ok(!/\.score\b/.test(bodyCode.slice(bodyCode.indexOf("results.sort("))),
    "the comparator still reads `.score`");
  has(bodyCode, "localeCompare", "the comparator is not falling back to a stable alphabetical order");
  has(bodyCode, "STATUS_RANK", "the comparator does not put the sitting officeholder first");
  // `.score` must still TRAVEL — the cards that display Direction Match need it.
  has(bodyCode, "score: _liveDirectionMatch(pid, d).pct",
    "the Direction Match figure no longer rides with each row, so the cards lose their read");
  // And the auto-fill must not pick by it either.
  const home = BB.slice(BB.indexOf("function _homeResolveSlots"), BB.indexOf("window._homeResolveSlots"));
  ok(!/\.score/.test(home), "_homeResolveSlots picks a slot by Direction Match");
  // No surface offers it as a sort control.
  for (const f of SHIPPED) {
    ok(!/sortBy\s*[:=]\s*["']?direction/i.test(CODE(f)),
      `${f} offers a sort-by-Direction-Match control`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · one name per measurement");
// ═════════════════════════════════════════════════════════════════════════════
{
  const AT = R("alignment-tool.js");
  has(AT, "window.pdxMatchLabel", "there is no single owner of the voter-alignment label");
  // Exercise it for real: the record lane must be the locked name, the stated
  // lane must NOT be (it is not built from a record, and saying so would be a
  // new falsehood rather than a fixed ambiguity).
  const src = AT.slice(AT.indexOf("var ALIGN_MODE_KEY"), AT.indexOf("window.pdxMatchLabel") + 200);
  const sandbox = { window: {}, localStorage: { getItem: () => null, setItem: () => {} }, console };
  sandbox.window.localStorage = sandbox.localStorage;
  const ctx = vm.createContext(sandbox);
  new vm.Script(src, { filename: "alignment-tool.js#modelabel" }).runInContext(ctx);
  must(typeof sandbox.window.pdxMatchLabel === "function", "pdxMatchLabel did not evaluate");
  eq(sandbox.window.pdxMatchLabel({ mode: "record" }), "Your Record Match",
    "the formal-record lane is not called Your Record Match");
  eq(sandbox.window.pdxMatchLabel({ mode: "stated" }), "Your Match",
    "the stated lane is called a record match, which it is not");
  eq(sandbox.window.pdxMatchLabel(), "Your Match",
    "the default lane (stated) is mislabelled");

  // No surface may hardcode the label where the number is mode-dependent. The
  // only literals left are this helper's own two returns and the typeof-guard
  // fallbacks, all of which are the correct answer when no mode is resolved.
  // Rendered labels must come from the helper. Static EXPLAINER prose may name
  // the label directly — but only where the same sentence says which lane it is
  // describing ("how their stated positions fit yours"), because that is the
  // stated lane's own correct name. A bare label with no lane in sight is the
  // ambiguity this section exists to prevent.
  const LABEL_RE = /🎯\s*Your Match(?![ ·]*(record|stated))/g;
  const namesLane = (c, i) => /stated position/i.test(c.slice(Math.max(0, i - 160), i + 200));
  for (const f of ["index.html", ...SHIPPED]) {
    if (f === "alignment-tool.js") continue;
    const c = f === "index.html" ? HTML : CODE(f);
    for (const m of c.matchAll(LABEL_RE)) {
      ok(namesLane(c, m.index),
        `${f}:${c.slice(0, m.index).split("\n").length} hardcodes "🎯 Your Match" without naming the lane — ` +
        `a rendered label must come from window.pdxMatchLabel`);
    }
  }
  // …and every file that renders the figure resolves its label from the helper.
  for (const f of ["alignment-tool.js", "compare-hub.js", "compare-table.js", "profiles-full.js"]) {
    has(R(f), "pdxMatchLabel", `${f} renders the match figure with a label it owns privately`);
  }
  // The record ruler on the race sheet carries the locked name.
  has(R("race-sheet.js"), "label: 'Your Record Match'", "the race sheet's record ruler lost the locked name");
  has(R("race-sheet.js"), "label: 'Your Match · stated'", "…and the stated ruler lost its own");

  // Integrity read: only the two permitted names, and never an unlabelled chip.
  const SLOT = R("compare-hub.js");
  const slotFn = SLOT.slice(SLOT.indexOf("window._pdxLedgerSlot = function"), SLOT.indexOf("window._pdxOfficeLine"));
  must(slotFn.length > 500 && slotFn.length < 4000, "_pdxLedgerSlot could not be sliced — this probe is stale");
  const branches = (slotFn.match(/return \{ state:/g) || []).length;
  must(branches >= 4, `_pdxLedgerSlot's return branches were found (${branches})`);
  eq((slotFn.match(/label: 'Word vs Action'/g) || []).length, branches,
    "a branch of _pdxLedgerSlot returns a read without naming itself Word vs Action");
  // Every chip that prints the slot's verdict prints its job beside it.
  for (const [file, kicker] of [["your-ballot.js", "yb-score-job"], ["compare-hub.js", "bs-seat-score-job"]]) {
    has(R(file), kicker, `${file} prints a Word vs Action verdict with no kicker saying what was measured`);
  }
  has(R("your-ballot.css"), ".yb-score .yb-score-job", "the ballot-card kicker has no style");
  has(SLOT, ".bs-seat-score-job{", "the seat-tile kicker has no style");
  // And it stays quieter than the finding it introduces.
  const jobSize = /\.bs-seat-score-job\{font-size:([\d.]+)rem/.exec(SLOT);
  const lblSize = /\.bs-seat-score-lbl\{font-size:([\d.]+)rem/.exec(SLOT);
  must(jobSize && lblSize, "the seat-tile kicker/label type scale is no longer declared inline");
  ok(parseFloat(jobSize[1]) < parseFloat(lblSize[1]),
    "the kicker is set larger than the finding it introduces — that inverts the demotion");
}

console.log("");
if (failures.length) {
  console.error(`✗ scope-honest copy: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ scope-honest copy: the eye finds records, the ballot states its edges, two doors, and Direction Match ranks nothing — ${passed} assertions passed\n`);
