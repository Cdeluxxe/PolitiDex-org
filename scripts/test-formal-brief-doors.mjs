#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-formal-brief-doors.mjs — the formal brief's rows count, open and explain
// ─────────────────────────────────────────────────────────────────────────────
// Three defects on one block, all of them the same shape: the profile's formal
// record summary was the only surface in the product that stated a finding and
// then gave the reader nowhere to go with it.
//
//   1. THE SPLIT PRINTED NO ARITHMETIC. A one-sided row read "Mostly advances ·
//      7 advanced · 0 against"; the row directly under it, making the least
//      flattering claim available, read "Split" and stopped. The two integers were
//      on file the whole time — the shallow-split publication rule
//      (_RD_TOKENS.record_split, counted:false) withholds the margin, and the
//      surface had no way to say "the numbers exist". So the row that showed no
//      arithmetic was the one a reader would most suspect of hiding it.
//   2. THE ROWS WERE NOT DOORS. Naming an issue opens that issue's Official
//      Record dossier everywhere else on the site — the topic tree, the standout
//      strip, the atlas. In the brief, the four strongest facts on the page were
//      inert text.
//   3. THE TITLES EXPLAINED NOTHING. "🦺 Stronger Gun Safety Laws" is a curated
//      scope with an argued boundary — background checks and red-flag orders in,
//      carry and suppressors out under the other facet — and all of that prose
//      existed only as source comments over ISSUE_MAP.
//
// This file is the fence around the fix, and most of it is about what did NOT
// move: no floor lowered, no tier changed, no count invented, no scope prose
// generated, Direction Match byte-identical.
//
//   node scripts/test-formal-brief-doors.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// issue-scope.js sits where index.html puts it: after alignment-tool.js (it reads
// ISSUE_MAP) and after stance-helpers.js (it asks that file which keys have no
// pole rather than keeping a second copy of the list).
const BASE = [
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
  "coverage.js",
  "profile-spine.js",
  "profiles-full.js",
];
const WITH_SCOPE = BASE.slice(0, BASE.indexOf("alignment-tool.js") + 1)
  .concat(["issue-scope.js"])
  .concat(BASE.slice(BASE.indexOf("alignment-tool.js") + 1));

const CACHE = new Map();
const src = (f) => { if (!CACHE.has(f)) CACHE.set(f, R(f)); return CACHE.get(f); };
function boot(files) {
  const win = makeSandbox();
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of files) vm.runInContext(src(f), sandbox, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
}

const WA_SRC = R("word-action.js");
const WA_CSS = R("word-action.css");
const IS_SRC = R("issue-scope.js");
const C_SRC = R("consistency.js");
const SH_SRC = R("stance-helpers.js");
const SW_SRC = R("sw.js");
const IDX_SRC = R("index.html");
const AT_SRC = R("alignment-tool.js");

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
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ formal brief doors: ${msg}`);
  process.exit(1);
};
const txt = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// ── The fixtures ─────────────────────────────────────────────────────────────
// One member, two records, because the block has two mounts and the brief asks
// for the same three things from both:
//   WIDE  — above the shape gate, so the letterhead renders.
//   SLIM  — below it, so the brief renders.
// Both carry one one-sided issue (which already printed its counts) and one
// SHALLOW split — four judged items, two a side. Four is under
// _RD_SPLIT_MIN_JUDGED, so the engine's publication decision withholds the
// margin, which is precisely the row that used to read "Split" and nothing else.
const PID = "schumer";

const probe = boot(WITH_SCOPE);
must(probe.PDXIssueScope, "issue-scope.js did not publish window.PDXIssueScope");
must(probe.PDXWordAction && typeof probe.PDXWordAction.heroMount === "function",
  "word-action.js does not publish heroMount");
const GATE = probe.PDXWordAction.SHAPE_MIN;
const SPLIT_MIN_JUDGED = probe._PDX_RD_SPLIT_MIN_JUDGED;
const SPLIT_MIN_SIDE = probe._PDX_RD_SPLIT_MIN_SIDE;
const MEMBER_FLOOR = probe._PDX_RD_MEMBER_FLOOR;
must(Number.isInteger(GATE) && Number.isInteger(SPLIT_MIN_JUDGED) &&
     Number.isInteger(SPLIT_MIN_SIDE) && Number.isInteger(MEMBER_FLOOR),
  "the published floors are not integers — the fixture cannot be built against them");

const NO_POLE = probe._PDX_RD_NO_POLE || {};
const POLED = Object.keys(probe.ISSUE_MAP || {})
  .filter((k) => !/_balance$/.test(k) && !NO_POLE[k]);
const TOP_KEY = "gun_safety";   // the acceptance case: a curated, documented key
const SPLIT_KEY = "cost_living"; // poled, and deliberately WITHOUT scope prose
must(POLED.indexOf(TOP_KEY) >= 0 && POLED.indexOf(SPLIT_KEY) >= 0,
  "a fixture issue key is no longer polable — the fixture needs new keys");
const FILLER = POLED.filter((k) => k !== TOP_KEY && k !== SPLIT_KEY);

const vote = (n, issueKey, position) => ({
  kind: "vote", rollcallId: 700 + n, measureId: 800 + n, number: "S. " + (100 + n),
  date: "2025-0" + ((n % 9) + 1) + "-11", action: "On Passage", position: position,
  isProcedural: false, title: "Measure " + n,
  source: { url: "https://www.congress.gov/roll-call-vote/" + (700 + n), label: "Congress.gov" },
  issues: [{ issueKey: issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
});
// `spread` filler issues, `depth` votes on each. Both records clear the member
// coverage floor — that floor is about how much of the MEMBER's file we hold, and
// lowering it is not what this pass does — but only the wide one clears the shape
// gate, which counts ISSUES. So the slim record is the same depth spread over four
// issues instead of sixteen, which is exactly the population the brief exists for.
function seed(spread, depth) {
  const out = [];
  let n = 0;
  for (let j = 0; j < 5; j++) out.push(vote(n++, TOP_KEY, "yea"));
  const judged = SPLIT_MIN_JUDGED - 2;             // 4 judged: one short of publishing
  for (let j = 0; j < judged; j++) {
    out.push(vote(n++, SPLIT_KEY, j < judged / 2 ? "yea" : "nay"));
  }
  FILLER.slice(0, spread).forEach((k) => {
    for (let j = 0; j < depth; j++) out.push(vote(n++, k, "yea"));
  });
  return out;
}
const WIDE = [GATE + 4, 1];
const SLIM = [2, MEMBER_FLOOR - 2];
const A = boot(WITH_SCOPE);
A.PDXVotingRecord.noteMember(PID, seed.apply(null, WIDE));
const B = boot(WITH_SCOPE);
B.PDXVotingRecord.noteMember(PID, seed.apply(null, SLIM));

const shapeA = A.PDXConsistency.formalPatternIndex.shape(PID);
const shapeB = B.PDXConsistency.formalPatternIndex.shape(PID);
must(A.PDXWordAction.shapeApplies(PID) === true,
  `the wide fixture (${shapeA && shapeA.issues} issues) did not clear the shape gate of ${GATE}`);
must(B.PDXWordAction.shapeApplies(PID) === false,
  `the slim fixture (${shapeB && shapeB.issues} issues) cleared the gate — the brief mount is untested`);
must(shapeA.strongN > 0 && shapeA.splitN > 0 && shapeB.strongN > 0 && shapeB.splitN > 0,
  "a fixture produced no split or no top — the two row kinds would go untested");

const LETTERHEAD = A.PDXWordAction.heroMount(PID, A.CMP_DATA[PID], {});
const BRIEF = B.PDXWordAction.heroMount(PID, B.CMP_DATA[PID], {});
const MOUNTS = [["letterhead", LETTERHEAD], ["brief", BRIEF]];

// Every <li class="pdxwa-shape-row"> in a mount, sliced out whole.
function rows(html) {
  const out = [];
  const re = /<li class="pdxwa-shape-row"/g;
  let m;
  while ((m = re.exec(html))) {
    const end = html.indexOf("</li>", m.index);
    out.push(html.slice(m.index, end + 5));
  }
  return out;
}
// The door element's own contents, by span depth — the only honest way to ask
// "is the ⓘ inside the door", which is the question the whole no-interception
// design rests on.
function doorInner(row) {
  const at = row.indexOf('<span class="pdxwa-shape-door"');
  if (at < 0) return null;
  let i = row.indexOf(">", at) + 1;
  const start = i;
  let depth = 1;
  while (i < row.length && depth > 0) {
    const open = row.indexOf("<span", i);
    const close = row.indexOf("</span>", i);
    if (close < 0) break;
    if (open >= 0 && open < close) { depth++; i = open + 5; }
    else { depth--; i = close + 7; if (depth === 0) return row.slice(start, close); }
  }
  return row.slice(start);
}
const ROWS_A = rows(LETTERHEAD);
const ROWS_B = rows(BRIEF);
must(ROWS_A.length >= 2 && ROWS_B.length >= 2,
  "a mount rendered fewer than two rows — top and split are both required");

// ═════════════════════════════════════════════════════════════════════════════
// 1. THE SPLIT TALLY — the same count phrase as a one-sided row
// ═════════════════════════════════════════════════════════════════════════════
section("1 · the split says how it split");
const PHRASE = /(\d+) advanced · (\d+) against/;
{
  MOUNTS.forEach(([name, html]) => {
    const rs = rows(html);
    const split = rs.find((r) => r.indexOf('data-pdxst-dos="' + SPLIT_KEY + '"') >= 0);
    const top = rs.find((r) => r.indexOf('data-pdxst-dos="' + TOP_KEY + '"') >= 0);
    ok(!!split, `${name}: the split row did not render`);
    ok(!!top, `${name}: the one-sided row did not render`);
    if (!split || !top) return;
    // The characterisation itself is untouched: the row still says Split.
    has(txt(split), "Split", `${name}: the split row stopped calling itself a split`);
    // …and now it says how.
    const m = PHRASE.exec(txt(split));
    ok(!!m, `${name}: the split row still prints no tally — the bare "Split" defect`);
    if (m) {
      eq(Number(m[1]), 2, `${name}: the split row's advanced count is not the seeded 2`);
      eq(Number(m[2]), 2, `${name}: the split row's against count is not the seeded 2`);
    }
    // ONE PHRASE, NOT TWO. The one-sided row's wording is the wording, character
    // for character apart from the integers — a split that says "2 for / 2 against"
    // is a second vocabulary for the same fact.
    const tm = PHRASE.exec(txt(top));
    ok(!!tm, `${name}: the one-sided row lost its counts`);
    if (m && tm) {
      const shape = (s) => s.replace(/\d+/g, "N");
      eq(shape(m[0]), shape(tm[0]),
        `${name}: the split and one-sided rows print two different count phrases`);
    }
    // Exactly once per row. The chip already prints the phrase where the engine
    // published it, and the row must not print it a second time beside it.
    rs.forEach((r) => {
      const n = (txt(r).match(/advanced · \d+ against/g) || []).length;
      ok(n <= 1, `${name}: a row printed its tally ${n} times`);
    });
  });
}
{
  // …AND NO FLOOR MOVED TO GET IT. The publication decision is unchanged: the
  // shallow split still withholds `counts`, `counted` is still false, and every
  // surface that reads those fields reads exactly what it read before.
  const rowSplit = shapeA.splits.find((x) => x.key === SPLIT_KEY);
  ok(!!rowSplit, "the split row is not in the shape summary");
  eq(rowSplit.tier, "split", "the split row's tier changed");
  eq(rowSplit.counts, "", "the shallow split published `counts` — a floor was lowered");
  eq(rowSplit.sideCounts, "2 advanced · 2 against",
    "sideCounts is not the two integers off the index");
  eq(A._PDX_RD_SPLIT_MIN_JUDGED, 6, "the split publication floor moved");
  eq(A._PDX_RD_SPLIT_MIN_SIDE, 2, "the smaller-side floor moved");
  eq(A._PDX_RD_MEMBER_FLOOR, 12, "the member coverage floor moved");
  eq(A._PDX_RD_MIN_JUDGED, 4, "the per-issue judged floor moved");
  eq(A._PDX_RD_TOKENS.record_split.counted, false,
    "record_split now claims to be counted — the withholding rule was rewritten");
  eq(A._PDX_RD_TOKENS.record_split_deep.counted, true,
    "record_split_deep stopped publishing its counts");
  // The tally is ARITHMETIC AND NOTHING ELSE. No direction word, no lead, no rate,
  // no tier — two integers and the word between them.
  const phrase = A._recordSidePhrase;
  ok(typeof phrase === "function", "stance-helpers.js does not publish _recordSidePhrase");
  eq(phrase({ advances: 3, opposes: 1, judged: 4 }), "3 advanced · 1 against",
    "the shared phrase is not the shipped wording");
  eq(phrase({ advances: 0, opposes: 0 }), "",
    "the shared phrase invented a tally out of two zeroes");
  eq(phrase(null), "", "the shared phrase does not fail closed on nothing");
  eq(phrase({ advances: 2 }), "", "the shared phrase printed half a tally");
  ok(!/%/.test(rowSplit.sideCounts), "the tally carries a percentage");
  ["mostly", "strongly", "leans", "supports", "opposes"].forEach((w) => {
    lacks(rowSplit.sideCounts.toLowerCase(), w,
      `the tally borrowed the direction word "${w}"`);
  });
  // AND WHERE THERE IS NOTHING TO PRINT, IT SAYS SO — never a bare tier label.
  has(WA_SRC, "no count on file yet",
    "the row has no wording for a characterised row with no counts on file");
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. EVERY ROW IS A DOOR INTO THE DOSSIER
// ═════════════════════════════════════════════════════════════════════════════
section("2 · title and pattern bar open the dossier");
{
  MOUNTS.forEach(([name, html]) => {
    rows(html).forEach((row) => {
      const key = (/data-pdxst-dos="([^"]+)"/.exec(row) || [])[1];
      ok(!!key, `${name}: a row carries no dossier key`);
      has(row, 'data-pdxst-pid="' + PID + '"', `${name}: a row's door names no pid`);
      const origin = (/data-pdxst-origin="([^"]+)"/.exec(row) || [])[1];
      ok(!!origin, `${name}: a row's door carries no origin to return focus to`);
      has(row, 'id="' + origin + '"',
        `${name}: the origin names an element that is not this row`);
      // The bar is inside the door with the title: the brief asks for both to open
      // the dossier, and a chip that is a sibling of the door is not tappable.
      const inner = doorInner(row);
      ok(!!inner, `${name}: the row has no door element`);
      has(inner, 'class="pdxwa-shape-lbl', `${name}: the title is not inside the door`);
      has(inner, 'class="pdxwa-shape-bar"', `${name}: the pattern bar is not inside the door`);
      // ONE FOCUS STOP. A thumb gets the whole door; a keyboard gets one control.
      const btns = (inner.match(/<button/g) || []).length;
      eq(btns, 1, `${name}: the door holds ${btns} focusable controls, not one`);
      // NO NESTED BUTTONS, anywhere in the row — the markup rule the atlas row
      // established and the reason the door is a <span>.
      const seq = row.match(/<button|<\/button>/g) || [];
      let depth = 0, worst = 0;
      seq.forEach((t) => { if (t === "<button") { depth++; worst = Math.max(worst, depth); } else depth--; });
      ok(worst <= 1, `${name}: a row nests buttons ${worst} deep`);
      ok(row.indexOf('<span class="pdxwa-shape-door"') >= 0 ||
         row.indexOf("pdxst-dos") < 0,
        `${name}: a row carries dossier attributes without a door element`);
    });
  });
  // THE SAME ENTRY POINT AS THE TOPIC TREE. Not a second handler and not a second
  // openGap call: the attribute contract is what consistency.js's one delegated
  // gateway already listens for.
  has(C_SRC, "closest('[data-pdxst-dos]')",
    "consistency.js no longer resolves doors with closest('[data-pdxst-dos]')");
  has(C_SRC, "data-pdxst-origin", "the gateway no longer reads an origin");
  // The row marks a door and stops. word-action.js does own a second, older door
  // mechanism for its Direction Match rows (data-pdxwa-dos, with its own listener
  // and its own openGap call) — the point here is that the shape row did NOT get a
  // third: it carries the topic tree's attributes and is opened by the topic tree's
  // handler, so there is one behaviour to keep working rather than two.
  const ROW_FN = WA_SRC.slice(
    WA_SRC.indexOf("── ONE ROW OF THE BLOCK"),
    WA_SRC.indexOf("function shapeRowsHtml"));
  ok(ROW_FN.length > 1500, "the row renderer region could not be isolated");
  lacks(ROW_FN, ".openGap(",
    "the shape row calls openGap itself instead of marking a door for the gateway");
  lacks(ROW_FN, "addEventListener",
    "the shape row arms its own listener instead of using the shared gateway");
  has(ROW_FN, "data-pdxst-dos=", "the shape row does not carry the shared door attribute");
  // The row also asks the sheet to land on the record column, the way the atlas's
  // own record doors do.
  MOUNTS.forEach(([name, html]) => {
    rows(html).forEach((row) => {
      has(row, 'data-pdxst-focus="record"', `${name}: a door does not ask for the record column`);
    });
  });
  // Fail closed: no pid, no door. A control that goes nowhere is worse than text.
  has(WA_SRC, "var door = !!(owner && key);",
    "the row no longer gates its door on having a pid and a key");
  // Thumb target, stated in the stylesheet rather than hoped for.
  has(WA_CSS, ".pdxwa-shape-door", "the door has no styling");
  const doorCss = WA_CSS.slice(WA_CSS.indexOf(".pdxwa-shape-door {"),
    WA_CSS.indexOf("}", WA_CSS.indexOf(".pdxwa-shape-door {")));
  has(doorCss, "min-height: 2.75rem", "the door is not a 2.75rem thumb target");
  has(doorCss, "cursor: pointer", "the door does not read as tappable");
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. THE KEY EXPLAINS ITSELF
// ═════════════════════════════════════════════════════════════════════════════
section("3 · the issue key explains itself");
const S = probe.PDXIssueScope;
{
  const st = S.selfTest();
  ok(st.ok, `issue-scope selfTest failed: ${JSON.stringify(st.problems)}`);
  ok(st.keys >= 20, `only ${st.keys} keys carry locked scope prose`);

  // The acceptance case, in order: the key first, then the record.
  const g = S.read(TOP_KEY);
  ok(!!g, "gun_safety has no scope entry");
  eq(g.defined, true, "gun_safety reads as undefined");
  eq(g.label, probe.ISSUE_MAP[TOP_KEY].label, "the scope card renames the issue");
  eq(g.chip, probe.ISSUE_MAP[TOP_KEY].chip, "the scope card rewrites the position statement");
  has(g.inn, "background-check", "gun_safety's scope does not name background checks");
  has(g.inn, "red-flag", "gun_safety's scope does not name red-flag orders");
  has(g.out, "Protect Gun Rights", "gun_safety's boundary does not point at its cousin key");
  has(g.pole, "pro-regulation", "gun_safety does not say which way a count points");
  has(g.note, "not mirror images", "gun_safety loses the two-facet caveat");
  // …and the row a reader taps it from carries the control.
  const gRow = ROWS_A.find((r) => r.indexOf('data-pdxst-dos="' + TOP_KEY + '"') >= 0);
  has(gRow, 'data-pdxis-key="' + TOP_KEY + '"', "the gun_safety row has no key control");

  // NOT INVENTED. Every locked entry is a real key, and every phrase in it is
  // traceable to the comment block over that key in alignment-tool.js.
  Object.keys(S.SCOPE).forEach((k) => {
    ok(!!probe.ISSUE_MAP[k], `the locked table names ${k}, which is not an issue key`);
    const e = S.SCOPE[k];
    ok(!!(e.inn || e.note), `${k}'s entry says nothing`);
    Object.keys(e).forEach((f) => {
      const v = String(e[f] || "");
      // No figure, no party label, no grade. The notes DO say things like "carries
      // no party lean on purpose" and "the two facets are scored independently" —
      // those are the shipped disclaimers, and forbidding the words would forbid
      // the sentence that exists to prevent the frame.
      lacks(v, "%", `${k}.${f} carries a percentage`);
      ["Democrat", "Republican", "grade", "lean:"].forEach((w) => {
        lacks(v, w, `${k}.${f} carries the word "${w}" — a scope note is none of those`);
      });
    });
  });
  // A sample of the transcription, checked against the source it came from rather
  // than against itself: if the scope in alignment-tool.js narrows, this fails.
  [["gov_regulation", "Congressional Review Act"],
   ["permitting_reform", "lead-agency"],
   ["civil_service_control", "competitive service"],
   ["israel_support", "weapons transfers"],
   ["election_security", "chain-of-custody"],
   ["water", "conservation-based"],
   ["energy_production", "reopened acreage"],
   ["edu_parental", "further from state review"],
   ["deportations", "place in removal proceedings"],
   ["privacy_rights", "age verification"],
   ["public_schools", "levy protection"]].forEach(([k, phrase]) => {
    has(S.SCOPE[k].inn, phrase, `${k}'s locked scope no longer names "${phrase}"`);
    ok(AT_SRC.toLowerCase().indexOf(phrase.toLowerCase()) >= 0,
      `"${phrase}" is not in alignment-tool.js — the scope note is not transcribed`);
  });

  // THE HONEST BLANK. `cost_living` is a real, polable key with no scope argument
  // on file — nothing in the shipped mapping evidence characterises it, so nothing
  // was argued out over it — and the card says exactly that instead of describing
  // the label back. It replaced `water` in August 2026, when water's own comment
  // block was written and transcribed; the fixture needs a key that is still blank,
  // not the key that used to be.
  const w = S.read(SPLIT_KEY);
  ok(!!w, "a key in ISSUE_MAP failed to read at all");
  eq(w.defined, false, `${SPLIT_KEY} gained a scope entry — the fallback case needs another key`);
  eq(w.inn, "", "an undefined key returned scope prose from somewhere");
  has(S.NO_DEF, "No definition on file yet", "the fallback copy is not the shipped wording");
  eq(w.pole, S.POLE_DEFAULT, "a poled key with no entry lost its polarity sentence");
  has(w.pole, "The title above is the direction",
    "the default polarity sentence stopped pointing at the title");

  // NO DIRECTION WHERE THE ENGINE REFUSES ONE. The balance family and the engine's
  // no-pole table get the refusal, not a borrowed direction word.
  eq(S.read("gun_balance").pole, S.POLE_BALANCE, "a *_balance key was given a direction");
  const anyNoPole = Object.keys(NO_POLE)[0];
  eq(S.read(anyNoPole).pole, S.POLE_NONE, `${anyNoPole} was given a direction the record refuses`);
  Object.keys(NO_POLE).forEach((k) => {
    if (!probe.ISSUE_MAP[k]) return;
    eq(S.read(k).poled, false, `${k} reads as poled`);
  });
  // …and the list is read from the engine, not copied.
  has(IS_SRC, "window._PDX_RD_NO_POLE",
    "issue-scope.js keeps its own copy of the no-pole list");

  // Not about a person, at all. Nothing in the module reads a pid, a record or a
  // stance, and the card says so on its face.
  lacks(IS_SRC, "PDXVotingRecord", "the glossary reads the voting record");
  lacks(IS_SRC, "issueRows", "the glossary reads a member's issue rows");
  lacks(IS_SRC, ".lean", "the glossary reads a party lean");
  // ── THE CARD ITSELF ──────────────────────────────────────────────────────
  // The order is the argument: the label and its position statement, then what a
  // count here means, then the boundary — in, then out.
  const card = S.cardHtml(TOP_KEY);
  has(card, "pdxis-hd", "the card has no header");
  has(txt(card), txt(g.label), "the card does not lead with the issue label");
  has(txt(card), txt(g.chip), "the card does not carry the shipped position statement");
  has(card, "What a count here means", "the card does not explain the polarity");
  has(card, "What it covers", "the card does not state the scope");
  has(card, "What it does not", "the card does not state the boundary");
  ok(card.indexOf("What a count here means") < card.indexOf("What it covers"),
    "the card explains its scope before it explains its counts");
  ok(txt(card).indexOf(txt(g.label)) < card.indexOf("What a count here means"),
    "the card does not lead with the label the reader tapped");
  has(card, "says nothing about this one’s record",
    "the card does not disclaim that it is about the key rather than the person");
  lacks(card, "%", "the scope card carries a percentage");
  lacks(card, PID, "the scope card names a politician");
  // The undefined key gets the blank, in the card, not just in the read.
  const blank = S.cardHtml(SPLIT_KEY);
  has(blank, S.NO_DEF, "an undefined key's card does not say the definition is missing");
  lacks(blank, "What it does not", "an undefined key's card invented a boundary section");
  eq(S.cardHtml("not_a_real_issue_key"), "", "the card rendered for an unknown key");

  // The control itself: present for a real key, absent for a key that is not in
  // the vocabulary, and a sibling rather than a child of the door.
  const ctl = S.controlHtml(TOP_KEY);
  has(ctl, 'data-pdxis-key="' + TOP_KEY + '"', "the control does not name its key");
  has(ctl, 'aria-haspopup="dialog"', "the control does not announce what it opens");
  eq(S.controlHtml("not_a_real_issue_key"), "",
    "the control rendered for a key that is not in the issue vocabulary");
  eq(S.read("not_a_real_issue_key"), null, "an unknown key read as something");
  MOUNTS.forEach(([name, html]) => {
    rows(html).forEach((row) => {
      has(row, "data-pdxis-key=", `${name}: a row lost its key control`);
      const inner = doorInner(row) || "";
      lacks(inner, "data-pdxis-key",
        `${name}: the key control is INSIDE the dossier door — a tap on it would open the record`);
      ok(row.indexOf("data-pdxis-key") > row.indexOf('class="pdxwa-shape-bar"'),
        `${name}: the key control is not the trailing control on the row`);
    });
  });
  // No stopPropagation anywhere: the sibling placement is the mechanism, and a
  // second mechanism is a second thing to keep in sync.
  lacks(IS_SRC, ".stopPropagation(", "issue-scope.js intercepts the row's tap");
  lacks(IS_SRC, "capture: true", "issue-scope.js listens ahead of the dossier gateway");
}
{
  // FAILS CLOSED. Without the module the rows keep their doors, their tallies and
  // their chips, and lose only the ⓘ.
  const noScope = boot(BASE);
  noScope.PDXVotingRecord.noteMember(PID, seed.apply(null, WIDE));
  const bare = noScope.PDXWordAction.heroMount(PID, noScope.CMP_DATA[PID], {});
  lacks(bare, "pdxis-key", "the ⓘ rendered without issue-scope.js loaded");
  has(bare, 'data-pdxst-dos="' + SPLIT_KEY + '"',
    "the split row lost its door when the glossary was absent");
  ok(PHRASE.test(txt(bare)), "the tally disappeared when the glossary was absent");
  // …and the rest of the hero is byte-identical with the glossary loaded.
  const stripCtl = (h) => h.replace(/<button type="button" class="pdxis-key"[\s\S]*?<\/button>/g, "");
  eq(stripCtl(LETTERHEAD), bare,
    "loading issue-scope.js changed the hero beyond adding its own control");
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. WVA AND DIRECTION MATCH ARE UNTOUCHED
// ═════════════════════════════════════════════════════════════════════════════
section("4 · no score moved");
{
  const DM = "bennie_thompson";
  const before = boot(BASE);
  const after = boot(WITH_SCOPE);
  [before, after].forEach((w) => w.PDXVotingRecord.noteMember(DM, seed.apply(null, WIDE)));
  const hb = before.PDXWordAction.heroRead(DM, before.CMP_DATA[DM]);
  const ha = after.PDXWordAction.heroRead(DM, after.CMP_DATA[DM]);
  must(hb && hb.pct !== null, `${DM} publishes no Direction Match figure — the case is untestable`);
  eq(JSON.stringify(ha), JSON.stringify(hb), "Direction Match changed");
  // The demoted ring inside the block, markup and all.
  const strip = (h) => h.replace(/<button type="button" class="pdxis-key"[\s\S]*?<\/button>/g, "");
  const dmOf = (h) => {
    const at = h.indexOf('<div class="pdxwa-shape-dm"');
    return at < 0 ? "" : h.slice(at);
  };
  const hA = after.PDXWordAction.heroMount(DM, after.CMP_DATA[DM], {});
  const hB = before.PDXWordAction.heroMount(DM, before.CMP_DATA[DM], {});
  ok(dmOf(hB).length > 0, "the Direction Match block did not render");
  eq(strip(dmOf(hA)), dmOf(hB), "the Direction Match block's markup changed");
  // And no second percentage arrived with the tally.
  const outside = LETTERHEAD.slice(0, LETTERHEAD.indexOf('<div class="pdxwa-shape-dm"'));
  eq((outside.match(/%/g) || []).length, 0,
    "a percentage appeared in the record block outside Direction Match");
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. SHIPPED — the module is wired, cached and versioned
// ═════════════════════════════════════════════════════════════════════════════
section("5 · wired, cached, versioned");
{
  has(IDX_SRC, 'src="/issue-scope.js"', "index.html does not load issue-scope.js");
  ok(IDX_SRC.indexOf('src="/issue-scope.js"') > IDX_SRC.indexOf('src="/alignment-tool.js"'),
    "issue-scope.js loads before the ISSUE_MAP it reads");
  ok(IDX_SRC.indexOf('src="/issue-scope.js"') > IDX_SRC.indexOf('src="/stance-helpers.js"'),
    "issue-scope.js loads before the no-pole table it reads");
  has(SW_SRC, "'/issue-scope.js',", "the service worker does not precache issue-scope.js");
  // AT LEAST v81, not exactly v81. This pass added a shell asset and its bump is
  // v81, which is the floor this test defends; a later pass that ships its own
  // shell change bumps past it and must not have to edit this line to do so. The
  // pin that matters is that v81's own arrival is still explained in sw.js.
  const ver = (/const CACHE_VERSION = '(v\d+)';/.exec(SW_SRC) || [])[1];
  ok(/^v\d+$/.test(String(ver)) && Number(String(ver).slice(1)) >= 81,
    `CACHE_VERSION is ${ver} — a new shell asset needs a bump to v81 or later`);
  has(SW_SRC, "// v81 —", "the cache bump was not explained");
  // The doctrinal comments are part of the deliverable.
  ok(IS_SRC.slice(0, IS_SRC.indexOf("(function")).length > 2000,
    "issue-scope.js shipped without its wall");
  has(IS_SRC, "IT IS NOT GENERATED COPY", "the no-invented-copy rule is not written down");
  has(IS_SRC, "IT MAKES NO CLAIM ABOUT A PERSON", "the no-claim rule is not written down");
  has(SH_SRC, "THE TWO-SIDED TALLY, IN ONE PLACE",
    "the shared tally lost the comment explaining why it exists");
  has(C_SRC, "FOUR FIELDS FOR THE DOOR AND THE TALLY",
    "the flattened row lost the comment explaining its new fields");
  has(WA_SRC, "ONE ROW OF THE BLOCK: A DOOR, ITS TALLY, AND A KEY",
    "the row renderer lost its wall");
}

// ── Result ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ formal brief doors — ${failures.length} failed, ${passed} passed`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`\n✓ formal brief doors: all ${passed} assertions passed — ` +
  `${ROWS_A.length} letterhead rows + ${ROWS_B.length} brief rows, every one a door with a tally ` +
  `and a key; ${S.selfTest().keys} issue keys carry locked scope prose`);
