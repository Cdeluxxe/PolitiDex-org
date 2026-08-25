#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-menu-context.mjs — the institutional half of an issue dossier, and the
// four things it is not allowed to become
// ─────────────────────────────────────────────────────────────────────────────
// The issue dossier has always shown one thing: what this member's formal file
// holds on this issue. A lane with two package votes therefore reads as a member
// who barely engaged — when what the file may actually record is an issue that
// only ever came up folded inside something else. Phase C puts the second half
// beside the first: a short, closed, grey note saying what there was to vote on,
// wherever the data we already hold genuinely supports saying it.
//
// The fence, because the failure mode here is not a wrong number, it is an
// accusation dressed as context:
//
//   1. IT APPEARS EXACTLY WHERE IT SAYS IT DOES. One disclosure, inside the 🏛️
//      Official Record column of the issue dossier, under the multi-issue
//      provenance count and above the record itself. Not twice, not elsewhere.
//   2. THE LOCKED PHRASES ARE THE ONLY ONES IT ASSERTS, and "Only tested as a
//      provision inside larger packages" prints only where every mapped
//      instrument really was a package. Where packages merely dominated, the
//      smaller shipped sentence is used instead.
//   3. "No clean vehicle reached the floor" STAYS RESERVED. Nothing counts the
//      chamber, so nothing may claim the chamber offered nothing. Checked
//      against every rendered dossier and against the source of every module.
//   4. THE SUBJECT IS THE FLOOR. Banned list over every rendered context on live
//      members, both shapes; no direction word, no percentage, no member name,
//      no scheduling office, no chamber denominator.
//   5. IT IS CONTEXT, NOT A VERDICT. Closed by default, no score, no tier, and
//      silent wherever the record does not support it.
//   6. NOTHING MOVED. Every tier, label, count and Direction Match figure on a
//      boot that renders the context and on a boot that never touches it.
//
//   node scripts/test-menu-context.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, votes seeded the
// way a completed /api/voting-record fetch leaves the cache.

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

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
const visible = (h) => String(h).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
// A stale probe is a failure, not a pass: if a symbol moves and the probe finds
// nothing, this file reports success while checking nothing.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ menu-context: STALE PROBE — ${msg}`);
  process.exit(2);
};

const PID = "schumer";
const W = boot();
const CS = W.PDXConsistency;
must(CS && CS.menu, "PDXConsistency.menu is not exposed");
const MENU = CS.menu;
must(typeof MENU.context === "function" && typeof MENU.contextHtml === "function",
  "PDXConsistency.menu no longer publishes context/contextHtml");
must(typeof CS.gapViewHtml === "function", "the issue dossier's view builder is not exposed");

const LOCKED = {
  no_vehicle: "No clean vehicle reached the floor",
  provision_only: "Only tested as a provision inside larger packages",
  procedural_gate: "Procedural gate rather than a policy vote",
};

// ── The fixture: one file holding all four shapes at once ────────────────────
// Nine clean, standalone issues so the file is deep enough to read at all; one
// issue that exists ONLY as narrow provisions inside must-pass measures; one
// that is provisions AND standalone votes together; one whose every act is floor
// machinery. Four populations, one member, so the gate is tested on what the
// data says rather than on which member happened to be picked.
const NARROW = W._PDX_RD_NARROW_AT;
const stated = new Set((W._resolveStanceList(PID, W.CMP_DATA[PID]) || [])
  .map((s) => s && s.issueKey).filter(Boolean));
const KEYS = Object.keys(W.ISSUE_MAP).filter((k) =>
  !stated.has(k) && !/_balance$/.test(k) && !(W._PDX_RD_NO_POLE || {})[k]);
must(KEYS.length > 20, "the fixture profile no longer offers enough poled issues");
const CARRIER = KEYS[0];
const ONLY_KEY = KEYS[11];   // provisions and nothing else
const MOST_KEY = KEYS[12];   // provisions plus standalone votes
const PROC_KEY = KEYS[13];   // every act procedural
const CLEAN_KEY = KEYS[1];   // ordinary standalone record — must stay silent

const act = (n, key, o) => {
  o = o || {};
  return {
    kind: "vote", rollcallId: 700 + n, measureId: 800 + n,
    number: o.bill || "S. " + (100 + n),
    date: "2025-0" + ((n % 9) + 1) + "-11", action: "On Passage", position: "yea",
    isProcedural: !!o.proc,
    title: o.title || (o.bill ? "Consolidated Appropriations Act, 2026" : "Measure " + n),
    source: { url: "https://www.congress.gov/roll-call-vote/" + (700 + n), label: "Congress.gov" },
    issues: o.rider
      ? [{ issueKey: CARRIER, weight: 90, isPrimary: true, supportMeaning: "yea_supports" },
         { issueKey: key, weight: Math.min(10, NARROW), isPrimary: false, supportMeaning: "yea_supports" }]
      : [{ issueKey: key, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
  };
};
const seedOf = () => {
  const s = []; let n = 0;
  KEYS.slice(1, 10).forEach((k) => { for (let j = 0; j < 9; j++) s.push(act(n++, k)); });
  for (let j = 0; j < 8; j++) s.push(act(n++, ONLY_KEY, { rider: true, bill: "H.R. " + (7000 + j) }));
  for (let j = 0; j < 6; j++) s.push(act(n++, MOST_KEY, { rider: true, bill: "H.R. " + (7500 + j) }));
  for (let j = 0; j < 3; j++) s.push(act(n++, MOST_KEY));
  for (let j = 0; j < 4; j++) s.push(act(n++, PROC_KEY, { proc: true, title: "Motion to Proceed" }));
  return s;
};
W.PDXVotingRecord.noteMember(PID, seedOf());

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the gate: context only where the record licenses it");
// ═════════════════════════════════════════════════════════════════════════════
const cOnly = MENU.context(PID, ONLY_KEY);
const cMost = MENU.context(PID, MOST_KEY);
const cProc = MENU.context(PID, PROC_KEY);
const cClean = MENU.context(PID, CLEAN_KEY);
must(cOnly, "the package-only fixture produced no context to inspect");
must(cMost, "the mixed package fixture produced no context to inspect");
must(cProc, "the procedural fixture produced no context to inspect");

eq(cOnly.state, "provision_only", "every instrument a package → the package case");
eq(cMost.state, "provision_mostly", "packages plus standalone votes → the smaller claim");
eq(cProc.state, "procedural_gate", "every act floor machinery → the procedural case");
eq(cClean, null, "an ordinary standalone record gets no institutional note at all");
eq(MENU.context(PID, ""), null, "no issue, no context");
eq(MENU.context("", ONLY_KEY), null, "no member, no context");
// The executive lane has no vehicle to ride, so the whole idea is out of scope.
eq(MENU.context(PID, ONLY_KEY, { lane: "exec" }), null,
  "the exec lane is skipped rather than given a legislative-vehicle sentence");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · 'Only' is earned, never assumed");
// ═════════════════════════════════════════════════════════════════════════════
// The locked phrase is a universal claim. It may be printed only where the
// stowaway tally says every mapped instrument on the issue really was a package.
eq(cOnly.lb, LOCKED.provision_only, "the package-only case prints its locked words");
eq(cOnly.menu, "provision_only", "…and tags itself as a menu fact");
ok(cOnly.v && cOnly.v.only === true, "…and the data underneath it says `only`");
ok(cMost.v && cMost.v.only === false, "the mixed case is genuinely not `only`");
ok(cMost.lb !== LOCKED.provision_only,
  "…so it does not borrow the universal phrase — it says the smaller true thing");
eq(cMost.menu, null, "…and claims no locked phrasing at all");
eq(cProc.lb, LOCKED.procedural_gate, "the procedural case prints its locked words");
eq(cProc.menu, "procedural_gate", "…and tags itself as a menu fact");
// Counts in the body have to match the tally they came from.
has(cOnly.facts, String(cOnly.v.total), "the package case says how many instruments it counted");
has(cMost.note, `${cMost.v.provision} of ${cMost.v.total}`,
  "the mixed case shows the ratio rather than rounding it up to 'all'");
// Every case carries the wall that keeps a floor fact off the member.
[["package-only", cOnly], ["mixed", cMost], ["procedural", cProc]].forEach(([n, c]) => {
  has(c.note, MENU.WALL, `the ${n} case carries the wall`);
});

// ═════════════════════════════════════════════════════════════════════════════
section("3 · 'No clean vehicle reached the floor' stays reserved");
// ═════════════════════════════════════════════════════════════════════════════
// Nothing in this app counts what the chamber scheduled, so nothing in it may
// claim the chamber offered nothing. The phrase exists in the vocabulary table
// for the day the data supports it and must reach no surface before then.
eq(MENU.PHRASES.no_vehicle.lb, LOCKED.no_vehicle, "the reserved phrasing is still on file");
const SHIPPED = readdirSync(ROOT).filter((f) => /\.js$/.test(f));
must(SHIPPED.length > 40, "the module sweep found almost nothing to sweep");
SHIPPED.forEach((f) => {
  const src = R(f);
  lacks(src, "_menuSay('no_vehicle')", `${f} does not wire the reserved phrase`);
  lacks(src, 'menu.say("no_vehicle")', `${f} does not wire the reserved phrase`);
  lacks(src, "say('no_vehicle')", `${f} does not wire the reserved phrase`);
});
// …and the context reader itself can never return it, on any shape.
[cOnly, cMost, cProc].forEach((c) => {
  ok(c.menu !== "no_vehicle", `${c.state} never resolves to the reserved case`);
  lacks(c.lb + " " + c.facts + " " + c.note, LOCKED.no_vehicle,
    `${c.state} never quotes the reserved phrase in its body`);
});

// ═════════════════════════════════════════════════════════════════════════════
section("4 · where it appears in the dossier, and how much room it takes");
// ═════════════════════════════════════════════════════════════════════════════
const sheet = CS.gapViewHtml(PID, ONLY_KEY);
must(sheet && sheet.length > 400, "the issue dossier rendered nothing to inspect");
const mounts = (sheet.match(/data-pdxgap-menu=/g) || []).length;
eq(mounts, 1, "the dossier carries the institutional note exactly once");
has(sheet, `data-pdxgap-menu="provision_only"`, "…addressed by the case it is making");
has(sheet, LOCKED.provision_only, "…and printing the locked phrase where a reader can see it");
// Position: inside the 🏛️ column, below its sub-header, above the record itself.
const iSide = sheet.indexOf("pdxgap-side-h");
const iMenu = sheet.indexOf("data-pdxgap-menu");
const iActs = Math.max(sheet.indexOf("pdxgap-acts"), sheet.indexOf("pdxgap-side-empty"));
const iShare = sheet.indexOf("pdxgap-share");
must(iSide >= 0 && iActs >= 0 && iShare >= 0, "the 🏛️ column no longer has the landmarks this checks against");
ok(iMenu > iSide, "the note sits below the Official Record heading, not above it");
ok(iMenu < iActs, "…and above the record it is context for");
ok(iMenu < iShare, "…and well inside the column rather than trailing it");
// Weight: the same collapsed disclosure the multi-issue provenance count uses,
// closed by default. Context beside the record — never a second verdict.
has(sheet, `<details class="pdxgap-side-sub pdxgap-omni pdxgap-menu"`,
  "the note reuses the provenance disclosure's own weight rather than inventing a louder one");
const frag = sheet.slice(iMenu - 120, iMenu + 60);
lacks(frag, " open", "the disclosure is closed by default");
lacks(frag, "pdxgap-pill", "it carries no score pill");
// A dossier the note has nothing to say about is unchanged.
const quiet = CS.gapViewHtml(PID, CLEAN_KEY);
lacks(quiet, "data-pdxgap-menu", "a clean record's dossier gets no note bolted on");
// Both shapes render, and the flat one is for a surface already inside a drawer.
const flat = MENU.contextHtml(PID, ONLY_KEY, { mode: "flat" });
has(flat, `data-pdxdos-menu="provision_only"`, "the flat shape is addressable too");
lacks(flat, "<details", "…and does not put a drawer inside a drawer");
eq(MENU.contextHtml(PID, CLEAN_KEY), "", "no context, no markup — the caller can print unconditionally");

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the subject is the floor, on every live dossier");
// ═════════════════════════════════════════════════════════════════════════════
// The banned list, run over real rendered context for real members — evasion
// verbs, obstruction verbs, party framing, named scheduling offices.
const corpus = buildCorpus(ROOT);
must(corpus && corpus.byMember && corpus.byMember.size > 50,
  "the record corpus did not load enough members to sweep");
const LW = boot();
const LCS = LW.PDXConsistency;
const seen = { provision_only: 0, provision_mostly: 0, procedural_gate: 0 };
const bad = [];
let sweptMembers = 0, sweptSheets = 0;
for (const [pid, recs] of corpus.byMember) {
  try { LW.PDXVotingRecord.noteMember(pid, recs); } catch (e) { continue; }
  for (const key of Object.keys(LW.ISSUE_MAP)) {
    const c = LCS.menu.context(pid, key);
    if (!c) continue;
    seen[c.state] = (seen[c.state] || 0) + 1;
    const txt = visible(LCS.menu.contextHtml(pid, key)) + " " +
                visible(LCS.menu.contextHtml(pid, key, { mode: "flat" }));
    const hits = LCS.menu.scan(txt);
    if (hits.length) bad.push(`${pid}/${key}: ${hits.join(", ")}`);
    if (txt.indexOf(LOCKED.no_vehicle) >= 0) bad.push(`${pid}/${key}: reserved phrase rendered`);
    if (/\d\s?%/.test(txt)) bad.push(`${pid}/${key}: a percentage reached the note`);
  }
  if (++sweptMembers >= 40) break;
}
must(seen.provision_only > 20, "the live sweep found almost no package-only lanes to check");
must(seen.provision_mostly > 5, "the live sweep found almost no mixed package lanes to check");
eq(bad.length, 0, `no live dossier context uses banned language — ${bad.slice(0, 4).join(" | ")}`);
console.log(`      swept ${sweptMembers} members · ${seen.provision_only} package-only · ` +
  `${seen.provision_mostly} package-mostly · ${seen.procedural_gate} procedural`);
// …and the same sweep over whole assembled dossiers, since the note ships inside one.
const deep = [];
for (const [pid, recs] of corpus.byMember) {
  try { LW.PDXVotingRecord.noteMember(pid, recs); } catch (e) { continue; }
  for (const key of Object.keys(LW.ISSUE_MAP)) {
    if (!LCS.menu.context(pid, key)) continue;
    const html = LCS.gapViewHtml(pid, key);
    if (String(html).indexOf("data-pdxgap-menu") < 0) continue;
    sweptSheets++;
    if (String(html).indexOf(LOCKED.no_vehicle) >= 0) deep.push(`${pid}/${key}: reserved phrase`);
    if ((String(html).match(/data-pdxgap-menu=/g) || []).length !== 1) deep.push(`${pid}/${key}: duplicated`);
    break;
  }
  if (sweptSheets >= 12) break;
}
must(sweptSheets >= 8, "not enough assembled dossiers carried the note to check placement live");
eq(deep.length, 0, `every live dossier mounts the note once and keeps the reserved phrase off it — ${deep.slice(0, 3).join(" | ")}`);

// ═════════════════════════════════════════════════════════════════════════════
section("6 · no denominators, no scheduling attribution, no verdict");
// ═════════════════════════════════════════════════════════════════════════════
// The brief drew these walls explicitly: this phase is descriptive context. It
// does not count the chamber, it does not name who set the calendar, and it does
// not read as a judgement about the member.
const ALL_TEXT = [cOnly, cMost, cProc]
  .map((c) => `${c.lb} ${c.facts} ${c.note}`).join(" ").toLowerCase();
[
  "never received a vote", "never got a vote", "never came up for a vote",
  "of all bills", "of the bills the chamber", "chamber-wide", "calendar control",
  "scheduled", "was not scheduled", "agenda control", "leadership", "caucus",
  "majority", "minority", "chose not to bring", "brought to the floor by",
].forEach((p) => lacks(ALL_TEXT, p, "the context stays off chamber analytics and scheduling power"));
// No direction word borrowed from the record, and no verdict vocabulary.
["advanced it", "opposed it", "consistent", "contradicts", "score", "grade",
 "match", "rating", "hypocris", "should have", "ought to"].forEach((p) =>
  lacks(ALL_TEXT, p, "the context states no direction and no judgement"));
// …and it never names the member, so it cannot be read as a sentence about them.
lacks(ALL_TEXT, "schumer", "the context never names the member it sits beside");
lacks(ALL_TEXT, "the member's", "…and makes no possessive claim about them either");
// The two lanes stay named and separate.
has(MENU.LANES.record, "member", "the record lane is still the member's own");
has(MENU.LANES.menu, "floor", "the menu lane is still the floor's");

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the vehicle family is named honestly or not at all");
// ═════════════════════════════════════════════════════════════════════════════
// "That is a reconciliation act" is a universal claim about the vehicles named
// beside it. Where four measures between them produced one recognised family,
// the honest verb is "include".
must(typeof MENU.kindSay === "function", "the shared kinds sentence is not exposed");
eq(MENU.kindSay(null), "", "nothing recognised, nothing said");
eq(MENU.kindSay({ vehicles: [], classes: [] }), "", "no classes, no sentence");
const one = { vehicles: ["H.R. 1"], classes: ["reconciliation"] };
const many = { vehicles: ["H.R. 1", "H.R. 2", "H.R. 3"], classes: ["reconciliation"] };
has(MENU.kindSay(one), "That is a reconciliation act",
  "one vehicle, one family — the universal claim is true and is made");
has(MENU.kindSay(many), "Those include a reconciliation act",
  "three vehicles, one recognised family — the claim narrows to what was checked");
lacks(MENU.kindSay(many), "That is", "…and does not over-claim");
// An unrecognised measure still gets no guess.
eq(MENU.kinds({ classes: [] }), "", "an unclassified vehicle is left unclassified");

// ═════════════════════════════════════════════════════════════════════════════
section("8 · nothing moved");
// ═════════════════════════════════════════════════════════════════════════════
// The context describes; it may not read into anything. Every tier, label, count
// and Direction Match figure, on a boot that renders the note everywhere and on
// a boot that never touches it.
const fingerprint = (w, readContext) => {
  w.PDXVotingRecord.noteMember(PID, seedOf());
  const cs = w.PDXConsistency;
  if (readContext) {
    [ONLY_KEY, MOST_KEY, PROC_KEY, CLEAN_KEY].forEach((k) => {
      cs.menu.context(PID, k);
      cs.menu.contextHtml(PID, k);
      cs.menu.contextHtml(PID, k, { mode: "flat" });
      cs.gapViewHtml(PID, k);
    });
    cs.formalPatternIndex.html(PID, { sort: "strength", mount: "t" });
    cs.vehicle.rollupHtml(PID);
  }
  const rows = (cs.formalPatternIndex.rows(PID) || []).map((r) => [
    r.key, r.tier || "", r.patLabel || "", r.read ? 1 : 0,
    r.total || 0, r.judged || 0, (r.why && r.why.id) || "",
  ].join("|")).sort().join("\n");
  let dm = "";
  try { dm = JSON.stringify(cs.directionMatch ? cs.directionMatch(PID) : null); } catch (e) { dm = "err"; }
  return rows + "\n##\n" + dm;
};
const hotW = boot(), coldW = boot();
const hot = fingerprint(hotW, true);
const cold = fingerprint(coldW, false);
must(hot.length > 200, "the fingerprint came back empty — the probe has gone stale");
eq(hot, cold, "rendering the institutional context moves no tier, count, label or Direction Match figure");

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n   ${passed} checks passed`);
if (failures.length) {
  console.error(`\n✗ menu-context: ${failures.length} failed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log("✓ menu-context: the dossier's institutional half is present, placed, walled and silent where it must be\n");
