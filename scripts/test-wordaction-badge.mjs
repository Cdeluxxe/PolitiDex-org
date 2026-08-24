#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-wordaction-badge.mjs — one chip in the letterhead, one section below
// ─────────────────────────────────────────────────────────────────────────────
// A profile used to tell a reader its ⚖️ Word vs Action score four times before
// the reader reached anything they came for. The ring in the letterhead printed
// the percentage. A full-width strip under it printed the four counts that
// average came out of. A second strip under that printed how much record was
// behind both and over what span. And then, further down the page, ⚖️ Word vs
// Action itself printed all three of those things again, in full, with the
// working — which is the only place any of them is actually explained.
//
// Three of those four stood between the top of a profile and 🌳 All Issues by
// Topic, the surface a reader opens a profile to browse. So the two strips came
// out and one chip went in: the figure, the verdict in the section's own word,
// and a tap that scrolls to the section. Everything the strips said is still
// printed, unabridged, where it is explained.
//
// The chip is small, which makes it easy to get quietly wrong. Five ways, each
// pinned below:
//
//   1. IT SAYS THE READ. The percentage and the word both come out of the same
//      read() the ring and the section run — one call, not a second derivation
//      that agrees today. A letterhead that can disagree with the section it
//      links to is worse than no letterhead.
//   2. IT IS A DOOR, AND THE DOOR LANDS. It jumps to #pdxsec-wordaction, and
//      that anchor is emitted by the section itself. And it is ONE control: the
//      last pass on this app was spent unpicking interactive elements nested
//      inside interactive elements, which the HTML parser silently un-nests and
//      which ejects everything after them out of the row.
//   3. IT FAILS CLOSED, AND IT FILLS. Below the tested floor read() has no
//      percentage, and a chip beside a person's name printing that in dashes is
//      a finding the engine has not made. But the letterhead is built from the
//      synchronous word ledger while the roll-call record is still in flight, so
//      "nothing yet" is the normal first state on a member — the host is emitted
//      empty and repainted on the warm event, or the chip is a thing that only
//      appears on profiles that happened to be warm already.
//   4. IT IS SECONDARY. It sits among the status pills and is sized like them.
//      A chip at ring weight beside a name is the second score this pass removed,
//      wearing a smaller border.
//   5. THE SECTION IS UNTOUCHED. Same mount, same stage, still below the tree.
//      This was a removal above the fold, not a move.
//
//   node scripts/test-wordaction-badge.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, votes seeded the
// way a completed /api/voting-record fetch leaves the cache. No database, no
// network, no browser — so what is asserted is the rendered HTML, never a click.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

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
];
const SRC = new Map(FILES.map((f) => [f, R(f)]));

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — ${JSON.stringify(needle)} missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — ${JSON.stringify(needle)} present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
// A fixture that stopped offering its case passes every assertion resting on it,
// silently. Those probes exit rather than count.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`\n✗ word-action badge: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

const text = (html) => String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
// The exact thing the parser punishes: a <tag> opened while one is already in
// scope. Used on the chip because the row-tap pass proved how invisible it is.
function maxDepth(html, tag) {
  const re = new RegExp("<" + tag + "(?=[\\s>])|</" + tag + "\\s*>", "g");
  let d = 0, max = 0, m;
  while ((m = re.exec(html))) {
    if (m[0][1] === "/") d = Math.max(0, d - 1);
    else { d++; if (d > max) max = d; }
  }
  return max;
}

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
        must(src.indexOf(from) >= 0, `mutation anchor moved in ${f}: ${from.slice(0, 80)}`);
        src = src.replace(from, to);
      }
    }
    vm.runInContext(src, sandbox, { filename: f });
  }
  win.PROFILES = win.CMP_DATA;
  return win;
}

// ── The fixtures ─────────────────────────────────────────────────────────────
// EXEC is warm on load: an executive record is in the shipped data, so read()
// returns a figure with no seeding at all. MEMBER is the harder and much more
// common case — a roll-call record that does not exist until a fetch resolves.
const EXEC = "trump";
const MEMBER = "lee";                    // Mike Lee: cold on load, 57% once seeded
const COLD = "chellie_pingree";

const win = boot();
const WA = win.PDXWordAction;
must(WA, "word-action.js did not load in the sandbox");
must(typeof WA.compactBadgeHtml === "function" && typeof WA.compactBadgeMount === "function",
  "PDXWordAction no longer publishes compactBadgeHtml/compactBadgeMount, so the letterhead has\n" +
  "    nothing to mount and every assertion in this file is vacuous");
must(typeof WA.read === "function" && typeof WA.sectionHtml === "function",
  "PDXWordAction lost read() or sectionHtml()");

const P = (id) => win.CMP_DATA[id];
must(P(EXEC) && P(MEMBER) && P(COLD), "one of the three fixture profiles is no longer in the data");

const ISSUE_KEYS = Object.keys(win.ISSUE_MAP || {}).filter((k) => !/_balance$/.test(k));
must(ISSUE_KEYS.length >= 6, "the issue map no longer offers six non-balance keys to seed against");
let seq = 0;
const vote = (issueKey, position) => {
  seq += 1;
  return {
    kind: "vote", rollcallId: 4000 + seq, measureId: 6000 + seq, number: "H.R. " + seq,
    date: "2025-0" + ((seq % 9) + 1) + "-12", action: "On Passage", position: position,
    isProcedural: false, title: "Measure " + seq,
    source: { url: "https://www.congress.gov/roll-call-vote/" + (4000 + seq), label: "Congress.gov" },
    issues: [{ issueKey: issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
  };
};
const DEEP_SEED = [];
for (const k of ISSUE_KEYS.slice(0, 6)) {
  for (let i = 0; i < 4; i++) DEEP_SEED.push(vote(k, i < 3 ? "yea" : "nay"));
}

const X = WA.read(EXEC, P(EXEC));
must(X && X.pct !== null, "the executive fixture no longer reads a percentage, so there is no chip to test");
must(WA.read(MEMBER, P(MEMBER)).pct === null,
  "the member fixture reads a percentage before any roll-call record has been seeded, so section 4\n" +
  "    has no cold-then-warm case to test");
must(WA.read(COLD, P(COLD)).pct === null,
  "the cold fixture now reads a percentage — the fail-closed case has no subject");

const CHIP = WA.compactBadgeHtml(EXEC, P(EXEC));
must(CHIP.length > 0, "the executive profile renders no chip at all");

// ═════════════════════════════════════════════════════════════════════════════
// 1. It says the read — the same read, not a second one that agrees today
// ═════════════════════════════════════════════════════════════════════════════
section("1 · the figure and the word both come out of read()");

has(CHIP, X.pct + "%",
  "the chip does not print the percentage read() returned. It is the one thing it exists to say");
has(CHIP, X.verdict.label,
  "the chip does not print the verdict in the words read() returned — a letterhead that\n" +
  "    paraphrases the section's finding is a second finding");
has(CHIP, "color:" + X.verdict.color,
  "the chip's figure does not carry the verdict colour, so green and red read identically at a glance");

// ONE number. A chip carrying a second integer — a count, a denominator, a span —
// is the strip this pass removed, folded onto one line.
const chipText = text(CHIP);
const numbers = chipText.match(/\d+/g) || [];
eq(numbers.length, 1,
  `the chip prints ${numbers.length} numbers (${JSON.stringify(chipText)}). It is the compact form of a\n` +
  "    section, not a compressed copy of it — the shape, the depth and the span are read where\n" +
  "    they are explained");
eq(chipText, X.pct + "% · " + X.verdict.label,
  "the chip's visible text is no longer exactly the figure, a separator and the verdict word");

// The accessible name has to carry what the pill's typography implies and a
// screen reader cannot see: what the number measures, and that this goes somewhere.
const aria = (/aria-label="([^"]*)"/.exec(CHIP) || [])[1] || "";
has(aria, X.pct + "%", "the chip's accessible name omits the figure");
has(aria, X.verdict.label, "the chip's accessible name omits the verdict");
has(aria, "Direction match",
  "the chip's accessible name does not say what the percentage measures. Sighted readers get that\n" +
  "    from the section it sits above; a screen reader gets a bare number beside a name");
has(aria, "Word vs Action",
  "the chip's accessible name does not say where it leads, so it announces as a figure rather\n" +
  "    than as the control it is");

// ═════════════════════════════════════════════════════════════════════════════
// 2. It cannot disagree with the section it links to
// ═════════════════════════════════════════════════════════════════════════════
section("2 · the chip and ⚖️ Word vs Action print the same finding");

const SECTION = WA.sectionHtml(EXEC, P(EXEC));
must(SECTION.length > 0, "⚖️ Word vs Action renders nothing on the executive fixture");
const secPct = (/<div class="pdxwa-num-v">([^<]*)<\/div>/.exec(SECTION) || [])[1] || "";
const secVerdict = text((/<div class="pdxwa-verdict"[^>]*>([\s\S]*?)<\/div>/.exec(SECTION) || [])[1] || "");
must(/\d/.test(secPct) && secVerdict.length > 0,
  "the section's headline number or verdict line could not be read out of sectionHtml");
eq(secPct, X.pct + "%",
  "the section's headline figure is not the one read() returned, so the fixture cannot show the\n" +
  "    chip agreeing with it");
has(CHIP, secVerdict.replace(/^\S+\s+/, ""),
  `the chip's verdict word and the section's do not match (chip ${JSON.stringify(chipText)}, section\n` +
  `    ${JSON.stringify(secVerdict)}). The chip is a summary of that section and a reader arrives at it\n` +
  "    expecting to find the same sentence");
has(CHIP, secPct,
  "the chip's percentage and the section's headline percentage differ. A reader taps the figure\n" +
  "    to see where it came from and lands on a different figure");

// ═════════════════════════════════════════════════════════════════════════════
// 3. It is a door, it lands, and it is ONE control
// ═════════════════════════════════════════════════════════════════════════════
section("3 · one control, and it reaches the section");

has(CHIP, "pdxsec-wordaction",
  "the chip does not target #pdxsec-wordaction. Replacing a strip with a chip is only honest if\n" +
  "    the detail is one tap away rather than gone");
has(CHIP, "_pdxNavJump",
  "the chip does not go through the page's own chrome-aware jump, so on a phone it can land the\n" +
  "    reader underneath the sticky rail");
has(CHIP, "scrollIntoView",
  "the chip has no fallback for a page where _pdxNavJump has not been defined yet — early in a\n" +
  "    profile's life that is a control that does nothing");
has(SECTION, 'id="pdxsec-wordaction"',
  "⚖️ Word vs Action no longer emits the anchor the chip jumps to. _pdxNavJump no-ops on a missing\n" +
  "    target, so the chip would be inert and look fine");
has(CHIP, "event.stopPropagation()",
  "the chip does not stop the click from continuing. It sits inside the profile letterhead, which\n" +
  "    has handlers of its own");

// The row-tap pass, in one assertion. A <button> opened inside a <button> is
// un-nested by the parser, and everything after it is ejected out of the outer one.
eq(maxDepth(CHIP, "button"), 1,
  "the chip nests a button inside a button. The parser un-nests them and ejects every sibling\n" +
  "    after the inner one out of the control — the exact failure the row-tap pass was spent on");
ok(maxDepth(CHIP, "a") === 0,
  "the chip contains an anchor. It is a same-page jump, and an <a> in a <button> is the same\n" +
  "    nesting fault by another tag name");
eq((CHIP.match(/<button/g) || []).length, 1,
  "the chip is more than one control. It says one thing and goes one place");
eq((CHIP.match(/onclick=/g) || []).length, 1,
  "the chip carries more than one handler, so part of it goes somewhere the rest does not");
ok(/^<button type="button"/.test(CHIP),
  "the chip's outermost element is not the button. Anything outside it is a tap that does nothing");
// Every span inside is decoration, and has to announce as decoration or as text.
ok(!/<span[^>]*onclick/.test(CHIP),
  "a span inside the chip carries its own handler — a second target inside a target");

// ═════════════════════════════════════════════════════════════════════════════
// 4. It fails closed, and it fills when the record lands
// ═════════════════════════════════════════════════════════════════════════════
section("4 · nothing to say, nothing shown — until the record arrives");

eq(WA.compactBadgeHtml(COLD, P(COLD)), "",
  "the chip renders on a profile read() has no percentage for. Beside a person's name, a chip\n" +
  "    reading in dashes is a finding about them that the engine has not made");
const coldMount = WA.compactBadgeMount(COLD, P(COLD));
ok(/data-pdxwa-cbadge-host="[^"]+"><\/span>$/.test(coldMount.trim()),
  "the cold mount is not an exactly-empty host, so the repaint below proves nothing and the CSS\n" +
  "    rule that collapses an empty host has nothing to match");

{
  const w = boot();
  const warm = [];
  w.addEventListener = (type, fn) => { if (type === "pdx-consistency-warm") warm.push(fn); };
  w.removeEventListener = (type, fn) => {
    const i = type === "pdx-consistency-warm" ? warm.indexOf(fn) : -1;
    if (i !== -1) warm.splice(i, 1);
  };
  // The mount arms its listener on the next tick; this sandbox's setTimeout is a
  // no-op by default, so run the callback inline.
  w.setTimeout = (fn) => { try { fn(); } catch (e) {} return 0; };

  const cold = w.PDXWordAction.compactBadgeMount(MEMBER, w.CMP_DATA[MEMBER]);
  ok(/data-pdxwa-cbadge-host="[^"]+"><\/span>$/.test(cold.trim()),
    "a member's letterhead already has a figure before any roll-call record has landed, so this\n" +
    "    section is testing a case that no longer exists");
  const uid = (/data-pdxwa-cbadge-host="([^"]+)"/.exec(cold) || [])[1] || "";
  must(uid.length > 0, "the cold host has no id for the repaint to find");
  ok(warm.length > 0,
    "nothing listened for the record warming. On every member profile — which is most of them —\n" +
    "    the letterhead is built while the votes are still in flight, so an unbound host means the\n" +
    "    chip never appears at all and the removal above it is a straight subtraction");

  const host = { innerHTML: "" };
  const realQS = w.document.querySelector;
  w.document.querySelector = (sel) => (sel === '[data-pdxwa-cbadge-host="' + uid + '"]' ? host : null);
  w.PDXVotingRecord.noteMember(MEMBER, DEEP_SEED);
  try { warm.slice().forEach((fn) => fn({ detail: { pid: MEMBER } })); }
  finally { w.document.querySelector = realQS; }

  has(host.innerHTML, "pdxwa-cbadge",
    "the record landed and the chip never arrived in the letterhead — the figure exists and the\n" +
    "    top of the profile stays blank about it for the life of the page");
  const warmRead = w.PDXWordAction.read(MEMBER, w.CMP_DATA[MEMBER]);
  must(warmRead && warmRead.pct !== null, "the seeded member file did not warm the read");
  has(host.innerHTML, warmRead.pct + "%",
    "the repainted chip does not carry the figure the warmed read returned");
  has(host.innerHTML, "pdxsec-wordaction",
    "the repainted chip lost its jump — a chip that arrives late arrives inert");
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. Secondary weight: a badge among badges, not a second headline
// ═════════════════════════════════════════════════════════════════════════════
section("5 · sized like the pills it sits among, and thumb-sized on a phone");

const WACSS = R("word-action.css");
const APPCSS = R("app.css");
const chipRule = /\.pdxwa-cbadge\s*\{([^}]*)\}/.exec(WACSS);
must(chipRule, "the .pdxwa-cbadge rule is gone from word-action.css");
const chipSize = parseFloat((/font-size:\s*([\d.]+)rem/.exec(chipRule[1]) || [])[1]);
const pillRule = /\.profile-status-monitoring\s*\{([^}]*)\}/.exec(APPCSS);
must(pillRule, "the .profile-status-monitoring rule moved out of app.css — there is no pill to be sized like");
const pillSize = parseFloat((/font-size:\s*([\d.]+)rem/.exec(pillRule[1]) || [])[1]);
must(!Number.isNaN(chipSize) && !Number.isNaN(pillSize),
  "could not read the type size of the chip or of the status pill it sits beside");
ok(chipSize <= pillSize,
  `the chip is set larger than the status pills it sits among (chip ${chipSize}rem, pill ${pillSize}rem).\n` +
  "    The ring is the headline read; a chip that outweighs its neighbours is the second score this\n" +
  "    pass removed, wearing a smaller border");
ok(/border-radius:\s*999px/.test(chipRule[1]),
  "the chip is not drawn as a pill, so it reads as a block among badges rather than as one of them");
ok(!/!important/.test(chipRule[1]),
  "the chip's skin reaches for !important, which is how a secondary element wins a fight it should\n" +
  "    not be in");
ok(/\.pdxwa-cbadge-host:empty\s*\{[^}]*display:\s*none/.test(WACSS),
  "an empty chip host still takes room. .profile-meta is a flex row with a gap, so a cold\n" +
  "    letterhead carries a visible hole between two badges");
ok(/@media \(hover: none\), \(pointer: coarse\) \{[^@]*\.pdxwa-cbadge \{[^}]*min-height:/.test(WACSS),
  "the chip has no thumb target on a coarse pointer. It is a door, and a door the height of one\n" +
  "    line of 0.6rem type is a door that misses");
ok(/\.pdxwa-cbadge:focus-visible\s*\{[^}]*outline:/.test(WACSS),
  "the chip has no focus ring, so a keyboard reader cannot see where they are on it");

// ═════════════════════════════════════════════════════════════════════════════
// 6. The strips are gone from the profile; the section is exactly where it was
// ═════════════════════════════════════════════════════════════════════════════
section("6 · a removal above the fold, not a move");

const PF = R("profiles-full.js");
const SPINE = R("profile-spine.js");
eq(PF.indexOf("PDXWordAction.headerTallyMount("), -1,
  "the four-count strip is mounted on the profile again — the mid-page telling of ⚖️ Word vs Action\n" +
  "    this pass removed");
eq(PF.indexOf("PDXWordAction.headerStackMount("), -1,
  "the depth-and-span strip is mounted on the profile again — same objection, one line lower");
ok(R("word-action.js").indexOf("function headerTallyHtml") !== -1 &&
   R("word-action.js").indexOf("function headerStackHtml") !== -1,
  "the strip builders were deleted rather than unmounted. This pass removed them from ONE surface;\n" +
  "    scripts/test-header-tally.mjs and scripts/test-issue-index.mjs still drive them");

const bodyAt = PF.indexOf("const _profileBody = ");
must(bodyAt !== -1, "the profile body template moved out of profiles-full.js");
const secMount = PF.indexOf("PDXWordAction.sectionHtml(", bodyAt);
must(secMount !== -1, "the ⚖️ Word vs Action section is no longer mounted on the profile at all");
eq((PF.slice(bodyAt).match(/PDXWordAction\.sectionHtml\(/g) || []).length, 1,
  "the full section is mounted more than once — this pass was supposed to leave it alone");

// The stage the section sits in, resolved the way the assembler resolves it: the
// nearest PDXSP sentinel above the mount, not its line number.
const stageOf = (needle) => {
  const at = PF.indexOf(needle, bodyAt);
  if (at === -1) return null;
  const tags = PF.slice(bodyAt, at).match(/<!--PDXSP:([a-z0-9:_-]+)-->/g) || [];
  return tags.length ? tags[tags.length - 1].replace(/<!--PDXSP:|-->/g, "") : "identity";
};
eq(stageOf("PDXWordAction.sectionHtml("), "verdict",
  "⚖️ Word vs Action changed stage. Its place in the spine is what makes it 'lower on the page',\n" +
  "    and the chip's whole promise is that tapping it gets there");
eq(stageOf("PDXWordAction.compactBadgeMount("), "identity",
  "the chip is not in the identity stage, so it is not high on the profile — it is another block\n" +
  "    somewhere in the body, which is the thing being removed");

const STAGE_KEYS = (SPINE.match(/\{\s*key:\s*'([a-z]+)'/g) || []).map((m) => /'([a-z]+)'/.exec(m)[1]);
must(STAGE_KEYS.length > 5 && STAGE_KEYS[0] === "identity",
  "the stage list could not be read out of profile-spine.js");
ok(STAGE_KEYS.indexOf("identity") < STAGE_KEYS.indexOf("explore"),
  "the identity stage no longer reads before the topic tree's stage, so 'high on the profile' is\n" +
  "    not where the chip is");
ok(STAGE_KEYS.indexOf("explore") < STAGE_KEYS.indexOf("verdict"),
  "⚖️ Word vs Action now reads ABOVE 🌳 All Issues by Topic. The chip is a way DOWN to the section;\n" +
  "    above the tree the section is the wall the strips were");

// The section's own content, untouched: the anchor, the title, the headline
// number, the verdict line, the shape and the depth caption all still in it.
for (const needle of ['id="pdxsec-wordaction"', "Word vs Action", 'class="pdxwa-num-v"',
                      'class="pdxwa-verdict"', "Direction match"]) {
  has(SECTION, needle,
    `⚖️ Word vs Action no longer renders ${JSON.stringify(needle)} — this pass was not supposed to touch it`);
}
has(SECTION, "issues tested",
  "the section lost its denominator caption — the depth the removed strip used to preview is only\n" +
  "    honest to remove because the section still carries it");

// ═════════════════════════════════════════════════════════════════════════════
// 7. Counterfactuals — the same modules with one line changed
// ═════════════════════════════════════════════════════════════════════════════
// Each mutation is a way this could regress that still renders a plausible chip.
section("7 · five regressions, each caught by the assertions above");

const cf = (label, mutants, probe) => {
  let broke = false;
  try { broke = probe(boot(mutants)); } catch (e) { broke = true; }
  ok(broke, `counterfactual ${label} produced a chip this file would have accepted`);
};

// M1 — the door points somewhere else. Renders identically; goes nowhere useful.
cf("M1 (the jump target drifts to another section)", {
  "word-action.js": [[
    "        jumpAttr('pdxsec-wordaction') +\n        ' aria-label=\"'",
    "        jumpAttr('pdxsec-stancetree') +\n        ' aria-label=\"'",
  ]],
}, (w) => w.PDXWordAction.compactBadgeHtml(EXEC, w.CMP_DATA[EXEC]).indexOf("pdxsec-wordaction") === -1);

// M2 — it stops failing closed. Every cold profile grows a chip with no figure in it.
cf("M2 (the null-read guard is dropped)", {
  "word-action.js": [[
    "      if (!r || r.pct === null || r.pct === undefined) return '';",
    "      if (!r) return '';",
  ]],
}, (w) => w.PDXWordAction.compactBadgeHtml(COLD, w.CMP_DATA[COLD]) !== "");

// M3 — the figure stops coming from the read. Agrees with the section until it doesn't.
cf("M3 (the chip derives its own percentage)", {
  "word-action.js": [[
    "      var r = read(pid, p);\n      if (!r || r.pct === null",
    "      var r = read(pid, p);\n      if (r && r.pct !== null) { r = { pct: 99, verdict: r.verdict }; }\n      if (!r || r.pct === null",
  ]],
}, (w) => w.PDXWordAction.compactBadgeHtml(EXEC, w.CMP_DATA[EXEC]).indexOf(X.pct + "%") === -1);

// M4 — the chip goes back to being interpolated rather than mounted. Correct on a
// warm executive, permanently blank on every member profile in the app.
cf("M4 (the warm repaint is unbound)", {
  "word-action.js": [[
    "      try { setTimeout(function () { bindCompactBadge(uid, pid, p); }, 0); } catch (e) {}",
    "",
  ]],
}, (w) => {
  const warm = [];
  w.addEventListener = (type, fn) => { if (type === "pdx-consistency-warm") warm.push(fn); };
  w.setTimeout = (fn) => { try { fn(); } catch (e) {} return 0; };
  w.PDXWordAction.compactBadgeMount(MEMBER, w.CMP_DATA[MEMBER]);
  return warm.length === 0;
});

// M5 — a second control inside the chip. The parser un-nests it and the label,
// the separator and the verdict word land outside the button as loose text.
{
  const nested = CHIP.replace(
    '<span class="pdxwa-cbadge-sep" aria-hidden="true">·</span>',
    '<button type="button" class="pdxwa-cbadge-sep">·</button>');
  ok(maxDepth(nested, "button") === 2,
    "counterfactual M5: nesting a button inside the chip did not register as nested, so the depth\n" +
    "    probe that guards against it is not measuring anything");
}

// ── Report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ word-action badge: ${failures.length} failed, ${passed} passed\n`);
  for (const f of failures) console.error(`   · ${f}`);
  console.error("");
  process.exit(1);
}
console.log(`\n✓ word-action badge: all ${passed} assertions passed — one chip up top, one section below\n`);
