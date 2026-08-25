#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vehicle-rollup.mjs — how much of this record travelled inside something
// bigger, asked once of the whole profile
// ─────────────────────────────────────────────────────────────────────────────
// The 🚂 row tag answers "did THIS issue's formal signal ride inside a package".
// A reader who has met it three or four times down one list asks the obvious next
// question, and had to count the tags themselves to answer it. This is that count.
//
// It is also the single easiest thing in this codebase to turn into a grade by
// accident, so the fence is most of the file:
//
//   1. IT DETECTS NOTHING. Numerator = rows already wearing the tag. Denominator
//      = rows the pattern engine already agreed to read. Both are read back off
//      the index, so the sentence cannot drift from the rows beneath it.
//   2. THE DENOMINATOR IS `read`, NOT `all`. A row the engine refused has no
//      position to have travelled anywhere, and padding the denominator with
//      executive actions and balance keys would shrink the figure on every
//      profile and mean nothing on any of them.
//   3. NO PERCENTAGE, EVER. Counts and named bills. A percentage is the exact
//      shape that invites a league table.
//   4. NO VERDICT AND NO INTENT. Not a score, not a grade, and never "snuck",
//      "buried" or "hidden" — the mechanism, and then the wall that says the
//      votes are real and are counted in full.
//   5. THREE SILENCES. Nothing rode; too few readable issues to characterise
//      anyone; exactly one marked issue, which is a row and not an aggregate.
//      Zero is silent on purpose: "0 of 31" is a clean bill of health in the
//      shape of a statistic.
//   6. IT IS ABOUT THE RECORD, NOT THE VIEW. Filtering the index does not move it.
//   7. NOTHING MOVED. Tiers, counts, per-row tags and Direction Match are
//      identical with the roll-up read and unread.
//
//   node scripts/test-vehicle-rollup.mjs
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
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "profile-spine.js", "profiles-full.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
function boot() {
  const win = makeSandbox();
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const [f, src] of SRC) vm.runInContext(src, sandbox, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
}

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
// The words a reader actually sees: markup, attribute values and the accessible
// twin stripped off, so an assertion about COPY is not answered by aria-hidden.
const visible = (html) => String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ vehicle-rollup: ${msg}`);
  process.exit(1);
};

// ── The seeds ────────────────────────────────────────────────────────────────
const PID = "schumer";
const probe = boot();
must(probe.PDXConsistency && probe.PDXConsistency.vehicle &&
     typeof probe.PDXConsistency.vehicle.rollup === "function",
  "PDXConsistency.vehicle.rollup is not exposed");
const NARROW = probe._PDX_RD_NARROW_AT;
const MIN_READ = probe.PDXConsistency.vehicle.MIN_READ;
const MIN_ISSUES = probe.PDXConsistency.vehicle.MIN_ISSUES;
must(typeof NARROW === "number" && MIN_READ >= 2 && MIN_ISSUES >= 2,
  "the roll-up thresholds are no longer published");

const stated = new Set((probe._resolveStanceList(PID, probe.CMP_DATA[PID]) || [])
  .map((s) => s && s.issueKey).filter(Boolean));
const KEYS = Object.keys(probe.ISSUE_MAP).filter((k) =>
  !stated.has(k) && !/_balance$/.test(k) && !(probe._PDX_RD_NO_POLE || {})[k]);
must(KEYS.length > 30, "the fixture profile no longer offers enough poled issues");
const CARRIER = KEYS[0];

// A standalone vote, or — with {rider} — a PROVISION: two issues, secondary
// mapping, narrow weight, which is what _recordVehicleStats requires before it
// will call an instrument a package. Nothing here teaches the detector anything.
const act = (n, key, position, o) => {
  o = o || {};
  return {
    kind: "vote", rollcallId: 700 + n, measureId: 800 + n,
    number: o.bill || "S. " + (100 + n),
    date: "2025-0" + ((n % 9) + 1) + "-11", action: "On Passage", position: position,
    isProcedural: false, title: o.bill ? "Consolidated Appropriations Act — " + o.bill : "Measure " + n,
    source: { url: "https://www.congress.gov/roll-call-vote/" + (700 + n), label: "Congress.gov" },
    issues: o.rider
      ? [{ issueKey: CARRIER, weight: 90, isPrimary: true, supportMeaning: "yea_supports" },
         { issueKey: key, weight: Math.min(10, NARROW), isPrimary: false, supportMeaning: "yea_supports" }]
      : [{ issueKey: key, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
  };
};
// Build one sandbox around a seed and hand back everything the sections need.
const make = (build) => {
  const w = boot();
  const seed = []; let n = 0;
  build(seed, () => n++);
  w.PDXVotingRecord.noteMember(PID, seed);
  const CS = w.PDXConsistency;
  const html = CS.formalPatternIndex.html(PID, { sort: "strength", mount: "t" });
  const at = html.indexOf('<p class="pdxvru"');
  return {
    w, CS, html, at, seed,
    v: CS.vehicle.rollup(PID),
    line: at < 0 ? "" : html.slice(at, html.indexOf("</p>", at)),
    rows: CS.formalPatternIndex.rows(PID) || [],
  };
};

// DEEP: nine clean standalone runs, then seven issues carried only as provisions
// across three named packages. The Mike Lee–class case.
const DEEP = make((s, i) => {
  KEYS.slice(1, 10).forEach((k) => { for (let j = 0; j < 9; j++) s.push(act(i(), k, "yea")); });
  KEYS.slice(10, 17).forEach((k, x) => {
    for (let j = 0; j < 2; j++) s.push(act(i(), k, "yea", { rider: true, bill: "H.R. " + (2617 + ((x + j) % 3)) }));
  });
  // …and three issues the engine will refuse to read, so the denominator has
  // something to exclude and the `read` wall is actually under test.
  KEYS.slice(17, 20).forEach((k) => { for (let j = 0; j < 3; j++) s.push(act(i(), k, "present")); });
});
// MIXED: the same shape, but each carried issue also has one standalone vote —
// a readable majority rather than the exact case.
const MIXED = make((s, i) => {
  KEYS.slice(1, 10).forEach((k) => { for (let j = 0; j < 9; j++) s.push(act(i(), k, "yea")); });
  KEYS.slice(10, 17).forEach((k, x) => {
    for (let j = 0; j < 3; j++) s.push(act(i(), k, "yea", { rider: true, bill: "H.R. " + (2617 + (x % 2)) }));
    s.push(act(i(), k, "yea"));
  });
});
// NONE: a deep record with nothing package-borne at all.
const NONE = make((s, i) => {
  KEYS.slice(1, 15).forEach((k) => { for (let j = 0; j < 9; j++) s.push(act(i(), k, "yea")); });
});
// THIN: package-borne material, but too little readable record to divide into.
const THIN = make((s, i) => {
  KEYS.slice(1, 3).forEach((k) => { for (let j = 0; j < 9; j++) s.push(act(i(), k, "yea")); });
  KEYS.slice(3, 6).forEach((k, x) => {
    for (let j = 0; j < 2; j++) s.push(act(i(), k, "yea", { rider: true, bill: "H.R. " + (2617 + x) }));
  });
});
// ONE: a deep record with exactly one package-borne issue.
const ONE = make((s, i) => {
  KEYS.slice(1, 15).forEach((k) => { for (let j = 0; j < 9; j++) s.push(act(i(), k, "yea")); });
  for (let j = 0; j < 2; j++) s.push(act(i(), KEYS[20], "yea", { rider: true, bill: "H.R. 2617" }));
});

must(DEEP.v.enough, `the deep fixture produced no roll-up (${JSON.stringify(DEEP.v.quiet)})`);
must(MIXED.v.enough, `the mixed fixture produced no roll-up (${JSON.stringify(MIXED.v.quiet)})`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · it counts the rows, it does not detect anything");
// ═════════════════════════════════════════════════════════════════════════════
{
  [["deep", DEEP], ["mixed", MIXED], ["none", NONE], ["thin", THIN], ["one", ONE]]
    .forEach(([lb, F]) => {
      const tagged = F.CS.vehicle.rows(PID) || [];
      eq(F.v.issues, tagged.length,
        `${lb}: the numerator is exactly the rows already wearing the 🚂 tag`);
      eq(F.v.read, F.rows.filter((x) => x.read).length,
        `${lb}: the denominator is exactly the rows the engine agreed to read`);
      ok(F.v.issues <= F.v.read, `${lb}: the numerator cannot exceed the denominator`);
      const keys = new Set(tagged.map((x) => x.key));
      eq(F.v.keys.filter((k) => keys.has(k)).length, F.v.keys.length,
        `${lb}: every issue it counts is an issue the index tagged`);
    });

  // …and the denominator is `read`, not the whole index: a refused row has no
  // position to have travelled anywhere, and the vehicle field is null there.
  const unread = DEEP.rows.filter((x) => !x.read);
  ok(unread.length > 0, `the deep fixture has unreadable rows to exclude (${unread.length})`);
  eq(unread.filter((x) => x.vehicle).length, 0,
    "an unreadable row carries no vehicle read at all, so none can be counted");
  ok(DEEP.v.read < DEEP.rows.length,
    `the denominator excludes them (${DEEP.v.read} of ${DEEP.rows.length} rows)`);

  // The named vehicles and their counts come off the same rows.
  const names = new Set();
  (DEEP.CS.vehicle.rows(PID) || []).forEach((x) =>
    (x.vehicle.vehicles || []).forEach((nm) => names.add(nm)));
  eq(DEEP.v.vehicles.length, names.size, "every named measure is one the rows named");
  ok(DEEP.v.vehicles.every((e) => e.issues >= 1), "each named measure carried at least one issue");
  const desc = DEEP.v.vehicles.every((e, i, a) => i === 0 || a[i - 1].issues >= e.issues);
  ok(desc, "the measures are ordered by how many issues they carried");
  // `every` is the exact case, and is a subset of the marked rows.
  ok(DEEP.v.every <= DEEP.v.issues, "the every-instrument count is a subset of the marked issues");
  eq(DEEP.v.every, (DEEP.CS.vehicle.rows(PID) || []).filter((x) => x.vehicle.only).length,
    "…and is exactly the rows whose vehicle read says `only`");
  eq(MIXED.v.every, 0, "a readable majority with standalone votes beside it is not the exact case");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · counts and named bills, never a percentage");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(DEEP.at > 0, "the deep profile renders the roll-up");
  eq((DEEP.line.match(/%/g) || []).length, 0, "no percent sign anywhere in the line");
  eq((DEEP.line.match(/\d+(\.\d+)?\s*(percent|per cent)/gi) || []).length, 0,
    "…and no percentage spelled out either");
  has(DEEP.line, `<b>${DEEP.v.issues}</b> of ${DEEP.v.read}`,
    "the line leads with the two counts");
  has(DEEP.line, "readable formal issues", "…and says what the denominator is");
  has(DEEP.line, "advanced or opposed primarily as provisions inside larger packages",
    "…and states the mechanism in the brief's own words");
  DEEP.v.vehicles.slice(0, 3).forEach((e) =>
    has(DEEP.line, e.name, `the carrying measure ${e.name} is named, not summarised away`));
  has(DEEP.line, "no standalone instrument was on file at all",
    "the exact case is reported as a mechanical fact");
  lacks(MIXED.line, "no standalone instrument was on file at all",
    "…and is not claimed where standalone votes exist");

  // Overflow past the cap is counted, not dropped.
  const MANY = make((s, i) => {
    KEYS.slice(1, 10).forEach((k) => { for (let j = 0; j < 9; j++) s.push(act(i(), k, "yea")); });
    KEYS.slice(10, 18).forEach((k, x) => {
      for (let j = 0; j < 2; j++) s.push(act(i(), k, "yea", { rider: true, bill: "H.R. " + (3000 + x) }));
    });
  });
  ok(MANY.v.vehicles.length > 3, `the overflow fixture names many measures (${MANY.v.vehicles.length})`);
  has(MANY.line, "more measure", "past the cap the line counts the rest rather than dropping them");
  eq(visible(MANY.line).split("H.R. ").length - 1, 3, "…and names exactly three");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · it is not a grade, and it names no motive");
// ═════════════════════════════════════════════════════════════════════════════
{
  const COPY = visible(DEEP.line) + " " + visible(MIXED.line) + " " +
    DEEP.CS.vehicle.rollupText(PID);
  ["snuck", "sneak", "buried", "bury", "hidden", "hid ", "slipped", "quietly",
   "evade", "avoid scrutiny", "dodge"].forEach((wd) =>
    lacks(COPY.toLowerCase(), wd, `no intent language ("${wd}")`));
  ["score", "grade", "rating", "rank", "integrity", "accountab", "failing",
   "poor ", "good record", "bad record", "worst", "best"].forEach((wd) =>
    lacks(COPY.toLowerCase(), wd, `no verdict language ("${wd}")`));
  ["Republican", "Democrat", "GOP", "party"].forEach((wd) =>
    lacks(COPY, wd, `no party framing ("${wd}")`));
  ok(visible(DEEP.line).indexOf("🚂") === 0,
    "the line is marked with the same 🚂 the rows wear, so the two read as one system");
  has(DEEP.line, "not how good it is", "the line says plainly that it is not a judgement");
  has(DEEP.line, "The votes are real",
    "…and that the votes it describes are votes the member cast");
  has(DEEP.line, "counted in full above",
    "…which are still counted in full by the record beside it");
  has(DEEP.line, "carries the same note on its own row",
    "…and points back at the per-row disclosure rather than replacing it");
  // No comparative or threshold word turns a count into a characterisation.
  ["most of", "the majority of", "a large share", "unusually", "compared with",
   "more than other", "heavily"].forEach((wd) =>
    lacks(COPY.toLowerCase(), wd, `no comparative characterisation ("${wd}")`));
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · three silences, and zero is one of them");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(NONE.v.quiet, "none", "a deep record with nothing package-borne reports the `none` silence");
  eq(NONE.v.enough, false, "…and is not sayable");
  eq(NONE.at, -1, "…and renders nothing at all");
  ok(NONE.v.read >= MIN_READ, `…even though it is deep enough to divide into (${NONE.v.read})`);
  lacks(NONE.html, "pdxvru", "no empty roll-up shell is left in the markup");
  lacks(NONE.html, `0 of ${NONE.v.read}`, "a clean sheet is never printed as a statistic");

  eq(THIN.v.quiet, "thin_file", "too few readable issues reports the `thin_file` silence");
  eq(THIN.at, -1, "…and renders nothing");
  ok(THIN.v.issues >= MIN_ISSUES,
    `…despite having package-borne material to report (${THIN.v.issues})`);
  ok(THIN.v.read < MIN_READ, `…because the readable file is short (${THIN.v.read} < ${MIN_READ})`);
  ok((THIN.html.match(/class="pdxfpi-veh"/g) || []).length >= THIN.v.issues,
    "the per-row tags still carry the same information on a thin file");

  eq(ONE.v.quiet, "one_issue", "a single marked issue reports the `one_issue` silence");
  eq(ONE.at, -1, "…and renders nothing, because one issue is a row and the row says it");
  eq(ONE.v.issues, 1, "…the fixture really does have exactly one");
  ok(ONE.v.read >= MIN_READ, `…on a file deep enough otherwise (${ONE.v.read})`);
  has(ONE.html, 'class="pdxfpi-veh"', "…and that row still wears its own 🚂 tag");

  // Every silence still ANSWERS — a surface can ask without knowing the thresholds.
  [NONE, THIN, ONE].forEach((F) => {
    ok(F.v && typeof F.v.issues === "number" && typeof F.v.read === "number",
      "a quiet roll-up still returns its counts to a caller that wants them");
    eq(F.CS.vehicle.rollupHtml(PID), "", "…but renders nothing");
    eq(F.CS.vehicle.rollupText(PID), "", "…and has no sentence to read out");
  });
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · where it appears, and that the view does not move it");
// ═════════════════════════════════════════════════════════════════════════════
{
  const head = DEEP.html.indexOf('class="pdxfpi-lede"');
  const segs = DEEP.html.indexOf('class="pdxfpi-segs"');
  const list = DEEP.html.indexOf('class="pdxfpi-list"');
  ok(head > 0 && DEEP.at > head, "it sits below the index's own lede");
  ok(segs < 0 || DEEP.at < segs, "…above the filter controls");
  ok(DEEP.at < list, "…and above the list of rows it summarises");
  eq((DEEP.html.match(/class="pdxvru"/g) || []).length, 1, "exactly one roll-up per index");

  // It is a fact about the record, not about the current filter.
  ["stated", "pattern", "supports", "opposes", "split"].forEach((v) => {
    const h = DEEP.CS.formalPatternIndex.html(PID, { sort: "strength", mount: "f-" + v, view: v });
    const a = h.indexOf('<p class="pdxvru"');
    if (a < 0) { ok(false, `the ${v} view dropped the roll-up`); return; }
    eq(h.slice(a, h.indexOf("</p>", a)), DEEP.line,
      `the ${v} filter leaves the roll-up byte-identical`);
  });
  const az = DEEP.CS.formalPatternIndex.html(PID, { sort: "az", mount: "az" });
  const a = az.indexOf('<p class="pdxvru"');
  eq(az.slice(a, az.indexOf("</p>", a)), DEEP.line, "…as does the A–Z sort");

  // Accessible and hoverable: the full sentence, same numbers, no markup.
  const txt = DEEP.CS.vehicle.rollupText(PID);
  has(txt, `${DEEP.v.issues} of ${DEEP.v.read}`, "the accessible text carries the same counts");
  has(txt, "clear enough to name a direction", "…and spells out what `readable` means");
  eq((txt.match(/[<>]/g) || []).length, 0, "…with no markup in it");
  has(DEEP.line, 'aria-label=', "the rendered line is announced to a screen reader");
  has(DEEP.line, 'data-pdxvru-issues="' + DEEP.v.issues + '"', "…and publishes its counts as data");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · nothing moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Two boots of the deep seed. One is walked through every roll-up surface; the
  // other never learns it exists. If a tier, a count, a tag or Direction Match
  // differs, the roll-up is a gate wearing a sentence.
  const seed = DEEP.seed.map((v) => JSON.parse(JSON.stringify(v)));
  const warm = boot(), cold = boot();
  warm.PDXVotingRecord.noteMember(PID, seed.map((v) => JSON.parse(JSON.stringify(v))));
  cold.PDXVotingRecord.noteMember(PID, seed.map((v) => JSON.parse(JSON.stringify(v))));
  warm.PDXConsistency.vehicle.rollup(PID);
  warm.PDXConsistency.vehicle.rollupHtml(PID);
  warm.PDXConsistency.vehicle.rollupText(PID);

  const sig = (C) => (C.formalPatternIndex.rows(PID) || []).map((x) =>
    [x.key, x.tier, x.tone, x.weight, x.patLabel, x.counts, x.judged, x.held, x.read,
     x.vehicle ? x.vehicle.stowaway + ":" + x.vehicle.provision + "/" + x.vehicle.total : "-"
    ].join("~")).join("|");
  eq(sig(warm.PDXConsistency), sig(cold.PDXConsistency),
    "the formal pattern index is identical with the roll-up read and unread");

  const a = warm.PDXWordAction.read(PID, warm.CMP_DATA[PID]);
  const b = cold.PDXWordAction.read(PID, cold.CMP_DATA[PID]);
  eq(!!a, !!b, "one boot produced a Direction Match read and the other did not");
  if (a && b) {
    eq(a.pct, b.pct, "Direction Match percentage is unmoved");
    eq(a.state, b.state, "Direction Match state is unmoved");
    const led = (r) => (Array.isArray(r.tested) ? r.tested : []).map((t) =>
      [t.issueKey, t.stance, t.weight, t.appliedWeight, t.test && t.test.state,
       t.test && t.test.score, t.test && t.test.token].join("~")).join("|");
    eq(led(a), led(b), "the Direction Match ledger is unmoved");
  }

  // Structurally, too: the scoring lane cannot even name this.
  const WA = R("word-action.js");
  lacks(WA, "rollup", "Direction Match's own source must not mention the roll-up");
  lacks(WA, "stowaway", "…nor the stowaway condition it counts");

  // And the per-row disclosure is exactly as it was.
  eq((DEEP.html.match(/class="pdxfpi-veh"/g) || []).length, DEEP.v.issues,
    "every counted issue still wears its own row tag");
  eq((DEEP.html.match(/data-pdxfpi-vehicle=/g) || []).length, DEEP.v.issues,
    "…and its own row attribute");
  DEEP.v.keys.forEach((k) => {
    const line = DEEP.CS.vehicle.line(PID, k);
    ok(line && line.length > 0, `the row sentence for ${k} still renders`);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · on the profile face it rides above the fold, and only once");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The index can be told not to print its own copy. That is the only knob, and
  // it exists for one caller.
  const off = DEEP.CS.formalPatternIndex.html(PID, { sort: "strength", mount: "off", rollup: false });
  lacks(off, "pdxvru", "rollup:false suppresses the index's own copy");
  eq((off.match(/class="pdxfpi-row/g) || []).length, DEEP.rows.length,
    "…and changes nothing else about the index");
  const on = DEEP.CS.formalPatternIndex.html(PID, { sort: "strength", mount: "on" });
  ok(on.indexOf("pdxvru") > 0, "…and the default is still to print it");

  // The face block: the atlas is a CLOSED <details>, so the line is lifted out
  // above it and the index inside is switched off. Asserted on the shipped source
  // because that surface is a template literal inside the modal renderer.
  const PF = R("profiles-full.js");
  const at = PF.indexOf('<details id="pdxsec-formalatlas" class="modal-section pdxfpi-flat">');
  must(at > 0, "the formal-atlas face block is no longer where this harness looks");
  const block = PF.slice(Math.max(0, at - 2200), at + 600);
  has(block, "rollup: false", "the face mount switches off the index's own copy");
  has(block, "V.rollupHtml(id)", "…and asks for the roll-up itself");
  ok(block.indexOf("V.rollupHtml(id)") < block.indexOf('<details id="pdxsec-formalatlas"'),
    "…and prints it ABOVE the closed atlas, not inside it");
  has(block, 'class="modal-block pdxvru-solo"',
    "…wrapped so the modal's own vertical rhythm places it");
  has(block, "vru ? ", "…and prints nothing at all when there is no roll-up to print");
  const CSS = R("profile-spine.css");
  has(CSS, ".pdxvru-solo + .pdxfpi-flat", "the standalone placement has a rule of its own");
  has(CSS, ".pdxvru-solo > .pdxvru { margin-top: 0; }",
    "…which does not restate how the line looks");

  // One sentence per block, either way.
  eq((off.match(/class="pdxvru"/g) || []).length, 0, "face index: zero copies inside");
  eq((on.match(/class="pdxvru"/g) || []).length, 1, "overlay index: exactly one copy inside");
}

// ── Result ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  failures.forEach((f) => console.error(`   ✗ ${f}`));
  console.error(`\n✗ vehicle-rollup: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ vehicle-rollup: all ${passed} assertions passed`);
console.log(`   deep: ${DEEP.v.issues} of ${DEEP.v.read} across ${DEEP.v.vehicles.length} measures` +
  ` · silent on none / thin_file / one_issue`);
