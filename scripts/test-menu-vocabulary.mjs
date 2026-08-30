#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-menu-vocabulary.mjs — the words for "there was nothing to vote on", and
// the rule that keeps them off the member
// ─────────────────────────────────────────────────────────────────────────────
// An empty formal lane is the most ambiguous thing this app renders. It is
// equally the shape of a member who had clean floor vehicles and did little with
// them, and of an issue on which no clean vehicle ever reached the floor. Today
// we cannot tell those apart, and this file is not the feature that will — it is
// the foundation under it: a locked set of phrasings, a banned list, and light
// awareness of which measures are the ones that must pass.
//
// The fence, because the failure mode here is not a wrong number, it is a
// defamation:
//
//   1. THE THREE PHRASINGS ARE LOCKED, VERBATIM. "No clean vehicle reached the
//      floor" / "Only tested as a provision inside larger packages" /
//      "Procedural gate rather than a policy vote". A future edit that softens
//      or sharpens one of them fails here.
//   2. THE BANNED LIST RUNS ON EVERY MENU SURFACE. Evasion verbs, obstruction
//      verbs, party framing and named scheduling offices, checked against the
//      actual rendered copy of the live refusals and empty states — not against
//      the constant alone.
//   3. THE SUBJECT IS NEVER THE MEMBER. A menu sentence is about the floor, the
//      vehicle or the shape of the file. It borrows no direction word, states no
//      intent, and carries the wall that says so.
//   4. RECORD AND MENU STAY TWO LANES. Personal formal record is what the member
//      did; the menu is what the chamber offered. The vocabulary names both and
//      does not let one stand in for the other.
//   5. THE EMPTY AND THIN STATES ARE READY TO ABSORB IT. The `none` slot used to
//      print a bare blank with no sentence under it. It now names the ambiguity
//      instead of resolving it, and does so without implying the member failed
//      to act.
//   6. THE VEHICLE AWARENESS IS LIGHT AND IT IS REAL. Recognised must-pass
//      families over the corpus's own titles, in an order where a special rule
//      about an appropriations bill is a rule and not an appropriation. An
//      unrecognised measure gets `null`, never a guess.
//   7. NOTHING SHIPPED THAT SHOULD NOT HAVE. No chamber denominator, no "never
//      received a vote" analytics, no scheduling attribution, and the empty-case
//      phrasing is reserved rather than wired to a live surface.
//   8. NOTHING MOVED. Every tier, label, count and Direction Match figure is
//      computed on a boot that renders every menu surface and on a boot that
//      never touches one, and must be identical.
//
//   node scripts/test-menu-vocabulary.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, votes seeded the
// way a completed /api/voting-record fetch leaves the cache.

import { readFileSync, readdirSync } from "node:fs";
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
const visible = (html) => String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
// A STALE PROBE IS A FAILURE, NOT A PASS. Every check below aims at a named
// symbol. If the symbol moves and the probe quietly finds nothing, this file
// reports success while checking nothing — which is the exact way a copy fence
// rots. So a missing target exits 2 instead.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ menu-vocabulary: STALE PROBE — ${msg}`);
  process.exit(2);
};

// ── The boot and the vocabulary ──────────────────────────────────────────────
const PID = "schumer";
const W = boot();
const CS = W.PDXConsistency;
must(CS && CS.menu, "PDXConsistency.menu is not exposed");
const MENU = CS.menu;
must(typeof MENU.say === "function" && typeof MENU.scan === "function" &&
     typeof MENU.kinds === "function" && MENU.PHRASES && MENU.ORDER && MENU.LANES,
  "the menu vocabulary no longer publishes say/scan/kinds/PHRASES/ORDER/LANES");
must(typeof W._rdVehicleClass === "function" && Array.isArray(W._PDX_RD_VEHICLE_CLASSES),
  "the vehicle classifier is not exposed");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the three phrasings are locked, verbatim");
// ═════════════════════════════════════════════════════════════════════════════
// These are the sentences the brief settled on. They are the deliverable, not an
// implementation detail, so they are pinned character for character.
const LOCKED = {
  no_vehicle: "No clean vehicle reached the floor",
  provision_only: "Only tested as a provision inside larger packages",
  procedural_gate: "Procedural gate rather than a policy vote",
};
Object.keys(LOCKED).forEach((k) => {
  must(MENU.PHRASES[k], `the "${k}" phrasing has been removed from the table`);
  eq(MENU.PHRASES[k].lb, LOCKED[k], `"${k}" prints its locked words`);
  ok(MENU.PHRASES[k].note && MENU.PHRASES[k].note.length > 60,
    `"${k}" carries an explanation, not just a label`);
});
eq(MENU.ORDER.join(","), "no_vehicle,provision_only,procedural_gate",
  "the three cases keep their order: nothing came up, it only came up folded in, it only came up as machinery");
// say() is the only sanctioned way to print one, and it attaches the wall.
const said = MENU.say("provision_only");
must(said, "menu.say('provision_only') returned nothing");
eq(said.lb, LOCKED.provision_only, "say() hands back the locked label");
has(said.note, MENU.WALL, "…with the wall attached by default");
eq(MENU.say("no_such_case"), null,
  "an unknown case returns null rather than silently printing nothing");
eq(MENU.say("provision_only", { wall: false }).note, MENU.PHRASES.provision_only.note,
  "…and the wall can only be dropped deliberately");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the banned list runs on every menu surface");
// ═════════════════════════════════════════════════════════════════════════════
// scan() is only worth anything if it actually catches things, so it is proved
// on a sentence written to fail before it is trusted on sentences written to pass.
ok(MENU.scan("The majority leader blocked a vote and they dodged it").length >= 3,
  "scan() catches evasion, obstruction and a named scheduling office in one line");
ok(MENU.scan("Republican leadership refused to vote on it").length >= 2,
  "scan() catches party framing");
eq(MENU.scan("No standalone measure on this issue came up for a recorded vote.").length, 0,
  "…and passes a sentence about the calendar");

// Now the real copy. Every string this vocabulary can put on screen.
const MENU_COPY = [];
MENU.ORDER.forEach((k) => { MENU_COPY.push(MENU.PHRASES[k].lb); MENU_COPY.push(MENU.PHRASES[k].note); });
MENU_COPY.push(MENU.WALL, MENU.LANES.record, MENU.LANES.menu);
(MENU.CLASSES || []).forEach((c) => MENU_COPY.push(c.label));
MENU_COPY.forEach((t) => {
  const hits = MENU.scan(t);
  eq(hits.length, 0, `menu copy stays off the banned list: "${String(t).slice(0, 48)}…" hit ${JSON.stringify(hits)}`);
});
// And the live surfaces built on top of it — the two refusals, the empty states,
// the roll-up wall and the vehicle disclosure.
[CS.recordDirection.NOTE_NONE, CS.recordDirection.NOTE_THIN,
 CS.vehicle.ROLLUP_WALL, CS.vehicle.NOTE, CS.vehicle.TAG].forEach((t) => {
  must(typeof t === "string" && t.length > 4, "a record-lane copy constant is no longer published");
  eq(MENU.scan(t).length, 0, `record-lane copy stays off the banned list: "${t.slice(0, 44)}…"`);
});

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the subject is never the member");
// ═════════════════════════════════════════════════════════════════════════════
// No direction word, so a sentence about the calendar cannot be mistaken for a
// reading of the record; no percentage, so it cannot be mistaken for a score.
MENU_COPY.concat([CS.recordDirection.NOTE_NONE, CS.recordDirection.NOTE_NONE_FULL, CS.recordDirection.NOTE_THIN])
  .forEach((t) => {
    const low = String(t).toLowerCase();
    ["supports", "opposes", "advanced it", "cut against"].forEach((w) =>
      lacks(low, w, `menu copy borrows no direction word ("${w}")`));
    ok(!/%/.test(low), "menu copy carries no percentage");
    ["grade", "score", "rating", "failed", "should have"].forEach((w) =>
      lacks(low, w, `menu copy makes no judgement ("${w}")`));
  });
has(MENU.WALL, "not what the member",
  "the wall says out loud that this is not about the member's choices");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · record and menu stay two lanes");
// ═════════════════════════════════════════════════════════════════════════════
ok(MENU.LANES.record !== MENU.LANES.menu, "the two lanes are not the same words");
has(MENU.LANES.record.toLowerCase(), "member", "the record lane is about the member");
has(MENU.LANES.menu.toLowerCase(), "floor", "the menu lane is about the floor");
lacks(MENU.LANES.menu.toLowerCase(), "member", "…and the menu lane does not name the member at all");

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the empty and thin states are ready to absorb it");
// ═════════════════════════════════════════════════════════════════════════════
// The `none` slot used to be a bare label with an empty note. A blank with no
// sentence under it reads as "this person did nothing".
const NONE = CS.recordDirection.NOTE_NONE;
const NONE_FULL = CS.recordDirection.NOTE_NONE_FULL;
must(typeof NONE_FULL === "string" && NONE_FULL.length > NONE.length,
  "the empty lane's full admission is no longer published");
ok(NONE.length > 80, "the empty lane now has a sentence, not a blank");
has(NONE, "no clean vehicle", "…and it names the other explanation for an empty lane");
has(NONE_FULL, NONE, "the full form is the visible line plus the admission, not a second sentence");
has(NONE_FULL, "cannot yet tell the two apart",
  "…and admits we cannot yet distinguish them, rather than picking one");
lacks(NONE_FULL.toLowerCase(), "they have not", "…without turning the gap into an omission by the member");
eq(MENU.scan(NONE_FULL).length, 0, "…and the full form stays off the banned list too");
const THIN = CS.recordDirection.NOTE_THIN;
has(THIN, "Few chances to vote", "the thin note allows for a short menu, not just a short record");
has(THIN, "not read as reluctance", "…and says the absence is not being read as a choice");
// And the live slot actually carries it.
const slot = (function () {
  const keys = Object.keys(W.ISSUE_MAP || {});
  for (const k of keys) {
    const s = CS.recordDirection.slot ? CS.recordDirection.slot(PID, k) : null;
    if (s && s.state === "none") return s;
  }
  return null;
})();
if (slot) {
  eq(slot.note, NONE, "an empty slot renders the empty-lane sentence");
  has(slot.aria, NONE_FULL, "…and a screen reader hears the full admission, never the trimmed one");
} else {
  // Not a stale probe: a profile can legitimately have no empty issue lane. The
  // constant is still pinned above, which is the part that must not rot.
  ok(true, "no empty lane on the fixture profile — the constant is pinned regardless");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the vehicle awareness is light and it is real");
// ═════════════════════════════════════════════════════════════════════════════
// Titles taken from the shipped corpus, not invented for the test.
const CASES = [
  ["National Defense Authorization Act for Fiscal Year 2026", "ndaa"],
  ["James M. Inhofe National Defense Authorization Act for Fiscal Year 2023", "ndaa"],
  ["Consolidated Appropriations Act, 2024", "omnibus"],
  ["Continuing Appropriations Act, 2027", "cr"],
  ["Full-Year Continuing Appropriations and Extensions Act, 2025", "cr"],
  ["An act to provide for reconciliation pursuant to title II of H. Con. Res. 14.", "reconciliation"],
  ["American Rescue Plan Act of 2021", "reconciliation"],
  ["Ukraine Security Supplemental Appropriations Act, 2024", "supplemental"],
  ["Department of State, Foreign Operations, and Related Programs Appropriations Act, 2024", "approps"],
  ["Bipartisan Background Checks Act of 2021", null],
  ["Assault Weapons Ban of 2022", null],
  ["ACES Act", null],
];
CASES.forEach(([title, want]) => {
  const c = W._rdVehicleClass(title, "");
  eq(c ? c.key : null, want, `"${title.slice(0, 46)}…" classes as ${want || "nothing"}`);
});
// ORDER IS THE WHOLE DESIGN. A special rule that provides for consideration of an
// appropriations bill is a procedural gate, not an appropriation — if the generic
// pattern won that race, every rule in the corpus would be miscalled a spending act.
const RULE = "Providing for consideration of the bill (H.R. 8595) making appropriations " +
  "for national security, Department of State, and related programs, and for other purposes.";
eq(W._rdVehicleClass(RULE, "H. Res. 1383").key, "rule",
  "a rule about an appropriations bill is a rule");
// An unrecognised measure gets nothing, and nothing is not "ordinary".
eq(W._rdVehicleClass("", ""), null, "an untitled instrument is not classified");
// `instanceof` is useless across the vm realm boundary, so the shape is duck-checked.
ok(W._PDX_RD_VEHICLE_CLASSES.every((c) => c.key && c.label && c.re && typeof c.re.test === "function"),
  "every recognised family has a key, a reader-facing label and a pattern");
// kinds() turns classes into words a sentence can hold.
eq(MENU.kinds({ classes: ["omnibus"] }), "an omnibus appropriations act", "one family reads as itself");
eq(MENU.kinds({ classes: ["omnibus", "ndaa"] }),
  "an omnibus appropriations act and a defence authorization", "two families are joined");
eq(MENU.kinds({ classes: [] }), "", "no recognised family says nothing at all");
eq(MENU.kinds(null), "", "…and a missing read says nothing rather than throwing");

// ═════════════════════════════════════════════════════════════════════════════
section("7 · nothing shipped that should not have");
// ═════════════════════════════════════════════════════════════════════════════
// The empty case is RESERVED. Knowing that no clean vehicle reached the floor
// needs chamber-level data we do not hold, and printing the phrase before we hold
// it would be asserting the very thing the vocabulary exists to be careful about.
const SHIPPED = readdirSync(ROOT).filter((f) => f.endsWith(".js"));
let wired = [];
SHIPPED.forEach((f) => {
  const src = R(f);
  if (/_menuSay\(\s*['"]no_vehicle['"]|say\(\s*['"]no_vehicle['"]/.test(src)) wired.push(f);
});
eq(wired.length, 0,
  `the empty-case phrasing is reserved, not wired to a live surface (found in ${wired.join(", ")})`);
// No chamber-level analytics arrived with the vocabulary.
const CONS = R("consistency.js");
const MENU_BLOCK = CONS.slice(CONS.indexOf("var _MENU_LANES"), CONS.indexOf("var _VEH_TAG"));
must(MENU_BLOCK.length > 500, "the menu vocabulary block moved or was renamed");
["scheduled", "denominator", "never received a vote", "calendar control"].forEach((w) =>
  lacks(MENU_BLOCK, w, `the vocabulary block ships no chamber analytics ("${w}")`));
ok(!/%/.test(MENU_BLOCK.replace(/\/\/.*$/gm, "")), "…and no percentage");

// ═════════════════════════════════════════════════════════════════════════════
section("8 · nothing moved");
// ═════════════════════════════════════════════════════════════════════════════
// Every tier, label, count and Direction Match figure, computed once on a boot
// that renders every menu surface and once on a boot that never touches one.
// The vocabulary describes; it may not read into anything.
const NARROW = W._PDX_RD_NARROW_AT;
const stated = new Set((W._resolveStanceList(PID, W.CMP_DATA[PID]) || [])
  .map((s) => s && s.issueKey).filter(Boolean));
const KEYS = Object.keys(W.ISSUE_MAP).filter((k) =>
  !stated.has(k) && !/_balance$/.test(k) && !(W._PDX_RD_NO_POLE || {})[k]);
must(KEYS.length > 20, "the fixture profile no longer offers enough poled issues");
const CARRIER = KEYS[0];
const act = (n, key, position, o) => {
  o = o || {};
  return {
    kind: "vote", rollcallId: 700 + n, measureId: 800 + n,
    number: o.bill || "S. " + (100 + n),
    date: "2025-0" + ((n % 9) + 1) + "-11", action: "On Passage", position: position,
    isProcedural: false,
    title: o.title || (o.bill ? "Consolidated Appropriations Act, 2026" : "Measure " + n),
    source: { url: "https://www.congress.gov/roll-call-vote/" + (700 + n), label: "Congress.gov" },
    issues: o.rider
      ? [{ issueKey: CARRIER, weight: 90, isPrimary: true, supportMeaning: "yea_supports" },
         { issueKey: key, weight: Math.min(10, NARROW), isPrimary: false, supportMeaning: "yea_supports" }]
      : [{ issueKey: key, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
  };
};
// Nine clean issues so the file is deep enough to read at all, then TWO issues
// that exist only as provisions. One is eight one-sided riders — the population
// the package sentence is for, which since the August 2026 relaxation READS at
// thin with the 🚂 disclosure attached rather than refusing. The other ran both
// ways, which is the shape the uniform wall still turns away, and is therefore the
// row the locked provision_only phrasing is asserted on below.
const PKG_KEY = KEYS[11];
const PKG_MIX = KEYS[12];
const seedOf = () => {
  const s = []; let n = 0;
  KEYS.slice(1, 10).forEach((k) => { for (let j = 0; j < 9; j++) s.push(act(n++, k, "yea")); });
  for (let j = 0; j < 8; j++) {
    s.push(act(n++, PKG_KEY, "yea", { rider: true, bill: "H.R. " + (7000 + j) }));
  }
  for (let j = 0; j < 3; j++) {
    s.push(act(n++, PKG_MIX, j === 2 ? "nay" : "yea",
      { rider: true, bill: "H.R. " + (7100 + j) }));
  }
  return s;
};
const fingerprint = (w, readMenu) => {
  w.PDXVotingRecord.noteMember(PID, seedOf());
  const cs = w.PDXConsistency;
  if (readMenu) {
    // Touch every menu surface there is, in the order a profile would.
    cs.formalPatternIndex.html(PID, { sort: "strength", mount: "t" });
    cs.vehicle.rollupHtml(PID);
    (cs.formalPatternIndex.rows(PID) || []).forEach((r) => {
      cs.menu.kinds(r.vehicle || null);
      if (r.why) cs.menu.scan(r.why.note || "");
    });
    cs.menu.say("provision_only");
  }
  const rows = (cs.formalPatternIndex.rows(PID) || []).map((r) => [
    r.key, r.tier || "", r.patLabel || "", r.read ? 1 : 0,
    r.total || 0, r.judged || 0, (r.why && r.why.id) || "",
  ].join("|"));
  let dm = "";
  try {
    const d = w.PDXConsistency.directionMatch
      ? w.PDXConsistency.directionMatch(PID) : null;
    dm = d ? JSON.stringify(d) : "";
  } catch (e) { dm = "throw"; }
  try {
    const sc = w.PDXSayVsDo && w.PDXSayVsDo.score ? w.PDXSayVsDo.score(PID) : null;
    dm += "||" + (sc ? JSON.stringify(sc) : "");
  } catch (e) { dm += "||throw"; }
  return rows.join("\n") + "\n@@\n" + dm;
};
const hot = fingerprint(boot(), true);
const cold = fingerprint(boot(), false);
ok(hot.length > 100, "the fingerprint actually captured rows");
eq(hot, cold,
  "every tier, label, count, refusal and score is identical whether or not a menu surface was rendered");

// AND THE LIVE PACKAGE ROW SPEAKS THE LOCKED WORDS FROM THE MENU BLOCK, which is
// where a statement about the menu belongs. There used to be a `vehicle_only`
// refusal on the formal-pattern index carrying this phrase, and it is gone: it was
// a refusal printed over three dated, sourced votes, while the stance tree on the
// same profile read Split off the same engine. A row holding judged acts now always
// characterises itself, and the menu fact travels beside that finding.
const hotW = boot();
hotW.PDXVotingRecord.noteMember(PID, seedOf());
const hotRows = hotW.PDXConsistency.formalPatternIndex.rows(PID) || [];
const pkgRow = hotRows.filter((r) => r.key === PKG_MIX)[0];
must(pkgRow, "the package row that ran both ways vanished from the index");
eq(pkgRow.why, null, "a row holding judged acts carries no refusal reason");
eq(pkgRow.tier, "split", "…it reads Split, and the two counts are the whole claim");
eq(pkgRow.deferred, true, "…quoted from the browse lane, so no score moved");
const pkg = { why: hotW.PDXConsistency.menu.context(PID, PKG_MIX) || {} };
eq(pkg.why.state, "provision_only",
  "the menu block is where the package-only sentence lives now");
// …AND THE ONE-SIDED PACKAGE ROW READS INSTEAD OF REFUSING, at the tier its own
// acts earn, with the vehicle sentence carried beside the read rather than standing
// in for it or shrinking it. The banned list runs over that sentence too: a read is
// not a licence to say what a refusal may not.
const pkgRead = hotRows.filter((r) => r.key === PKG_KEY)[0];
must(pkgRead, "the one-sided package row vanished from the index");
eq(pkgRead.tier, "strong", "eight one-sided riders read at the tier eight one-way acts earn");
eq(pkgRead.why, null, "…and carry no refusal");
ok(pkgRead.vehicle && pkgRead.vehicle.only, "…and wear the 🚂 disclosure");
const readNote = hotW.PDXConsistency.vehicle.note(PID, PKG_KEY) || "";
has(readNote, "omnibus appropriations act",
  "the read names the family of measure that carried the policy too");
eq(MENU.scan(readNote).length, 0, "…and stays off the banned list");
eq(MENU.scan((hotW.PDXConsistency.recordPattern.display(pkgRead.row) || {}).note || "").length, 0,
  "…as does the display read's own package disclosure");
eq(pkg.why.lb, LOCKED.provision_only, "the menu block speaks the locked phrase");
eq(pkg.why.menu, "provision_only", "…and tags which menu case it is");
has(pkg.why.facts + " " + (hotW.PDXConsistency.vehicle.note(PID, PKG_MIX) || ""),
  "omnibus appropriations act",
  "…and names the family of measure that carried the policy");
has(pkg.why.note, MENU.WALL, "…and carries the wall");
eq(MENU.scan(pkg.why.lb + " " + pkg.why.facts + " " + pkg.why.note).length, 0,
  "…and the whole menu sentence stays off the banned list");
// The classes ride beside the counts and never into them.
const vs = hotW._pdxRecordVehicleStats(PID, PKG_MIX);
must(vs, "the vehicle read for the package row is gone");
ok(Array.isArray(vs.classes) && vs.classes.indexOf("omnibus") >= 0,
  "the read carries the recognised family");
eq(vs.major, true, "…and says a must-pass family was recognised");
eq(vs.provision, vs.total, "…while the counts are exactly the counts they were");
eq(vs.only, true, "…and the 'only' claim is unchanged by classification");

// ── Result ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ menu-vocabulary: ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f) => console.error("   · " + f));
  process.exit(1);
}
console.log(`\n✓ the menu vocabulary holds — ${passed} assertions passed`);
console.log(`   ${MENU.ORDER.length} locked phrasings, ${MENU.AVOID.length} banned formulations, ` +
  `${(MENU.CLASSES || []).length} recognised vehicle families`);
