#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-support-lane.mjs — people-support is momentum, and momentum touches
// nothing that is earned
// ─────────────────────────────────────────────────────────────────────────────
// The People's Mandate lets a visitor back a reform. That is worth carrying: a
// reform with four thousand people behind it is a different political fact from
// one with four, and neither number is anywhere in the formal record.
//
// It is also the most dangerous number on the site, because it looks exactly like
// the numbers that are earned. It is a tally, it renders as a tally, it sits in
// the same scroll as Direction Match and the formal act list, and unlike either of
// those it can be produced by anybody with an opinion and a thumb. This file is
// the fence:
//
//   1. THE WALL, DECLARED AND ENFORCED. No support count reaches Direction Match,
//      Word vs Action, a formal pattern tier, the publication floor, a formal-act
//      count, ballot sort order or Your Match. Statically: no engine file names
//      this lane, a support count, or the proposals tables at all.
//   2. NOT "VOTES". A vote on this site is a roll call — a formal act with a date,
//      a chamber and a citation. The lane's vocabulary never spends that word on a
//      tap, and the shipped headline stat no longer says "total votes".
//   3. NOT EVIDENCE, SAID OUT LOUD. Wherever a count appears, so does the sentence
//      that it is momentum and feeds no score. Body copy, not fine print.
//   4. NOT THE VERDICT PALETTE. The support button used to wear #4ade80/#86efac —
//      the good-green that means "the record came out the way they said it would".
//      A social button in that green says a tap is a kind of vindication. Gone from
//      every support rule, along with every red.
//   5. NOTHING SCALES WITH THE COUNT. No threshold colour, no "trending" band, no
//      intensifying glow. Four backers and four thousand look the same.
//   6. NO SCORE SHAPE. Nothing the lane returns is named like a measurement, and
//      no percentage appears anywhere in it.
//   7. RATE LIMITED, AND PRIVATE ABOUT IT. Both write routes meter on the
//      participant key AND the client IP, because the key is minted in the browser
//      and rotating it would otherwise be a one-line bypass. The stored counter
//      holds a hash, an integer and a window — never a raw address or key.
//
//   node scripts/test-support-lane.mjs
//
// The lane module runs in a node:vm sandbox; the rate-limit arithmetic is imported
// from the same .mjs the Function imports, so what is checked here is what ships.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import {
  bucketKey, evaluate, windowStartSeconds,
} from "../netlify/lib/rate-limit-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const LANE_SRC = R("support-lane.js");
const LANE_CSS = R("support-lane.css");
const APP_CSS = R("app.css");
const INDEX = R("index.html");
const FN = R("netlify/functions/mandate-proposals.mts");
const RL = R("netlify/lib/rate-limit.ts");
const RL_CORE = R("netlify/lib/rate-limit-core.mjs");
const SCHEMA = R("db/schema.ts");

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
const visible = (html) => String(html)
  .replace(/<[^>]*>/g, " ")
  .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
  .replace(/\s+/g, " ").trim();
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ support-lane: ${msg}`);
  process.exit(1);
};

// Comments have to be able to name the thing the code refuses to build ("the
// support button used to be #4ade80"), so every source-level assertion runs over
// a comment-stripped copy.
const strip = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

// ── Boot the lane ────────────────────────────────────────────────────────────
const win = makeSandbox();
vm.runInContext(LANE_SRC, vm.createContext(win), { filename: "support-lane.js" });
const L = win.PDXSupportLane;
must(L && typeof L === "object", "support-lane.js did not define window.PDXSupportLane");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the wall is declared, and the engines have never heard of this lane");

for (const k of [
  "directionMatch", "wordVsAction", "formalPatternTier", "publicationFloor",
  "formalActCounts", "ballotSort", "yourMatch",
]) {
  ok(Array.isArray(L.NEVER_FEEDS) && L.NEVER_FEEDS.indexOf(k) >= 0,
    `NEVER_FEEDS names ${k}`);
}
eq(L.scored, false, "the lane declares itself unscored");
eq(L.evidence, false, "the lane declares itself not evidence");
eq(L.momentum, true, "the lane declares itself momentum");

// The wall in the only form that cannot rot: the modules that produce integrity
// reads do not mention this lane, a support count, or the proposals tables. A
// number cannot leak into a computation that has no name for it.
const ENGINES = [
  "word-action.js", "publication-floor.js", "voting-record.js", "stance-helpers.js",
  "consistency.js", "self-defection.js", "finance-lane.js", "say-vs-do.js",
  "alignment-tool.js",
];
const LEAK = /PDXSupportLane|pdxsup-|supportCount|youSupported|pdx_proposal|proposalVotes|mandate-proposals/;
for (const f of ENGINES) {
  let src;
  try { src = R(f); } catch { continue; }
  ok(!LEAK.test(strip(src)),
    `${f} does not name the support lane, a support count or the proposals tables`);
}

// And the lane itself reaches for nothing on the other side of the wall.
const laneCode = strip(LANE_SRC);
for (const forbidden of [
  "PDXWordAction", "PDXPublicationFloor", "PDXConsistency", "PDXVotingRecord",
  "directionMatch(", "formalPatternIndex", "_pdxRecordMappedCounts",
]) {
  lacks(laneCode, forbidden, `support-lane.js does not call into ${forbidden}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the vocabulary never spends the word 'vote' on a tap");

const WORD_VALUES = Object.keys(L.WORDS).map((k) => L.WORDS[k]);
ok(WORD_VALUES.length >= 4, `the vocabulary is populated (${WORD_VALUES.length} words)`);
for (const v of WORD_VALUES) {
  ok(!/\bvot(e|es|ed|ing|er|ers)\b/i.test(v),
    `vocabulary entry ${JSON.stringify(v)} does not use "vote"`);
  ok(!/\bevidence\b/i.test(v),
    `vocabulary entry ${JSON.stringify(v)} does not call itself evidence`);
}
eq(L.WORDS.kind, "momentum", "the lane names its own kind");
ok(!/total\s+votes/i.test(L.statLabel()), "the headline stat label is not 'total votes'");
has(L.statLabel(), "support", "the headline stat label says what it counts");

// The shipped markup agrees. The Mandate page's headline stat is the one place
// this wording was actually wrong, so the retirement is asserted on the file.
ok(!/id="pp-votes">—<\/span>\s*total votes/.test(INDEX),
  "the Mandate headline stat no longer reads 'total votes'");
has(INDEX, 'id="pp-stat-label"', "the stat label is a labelled element the lane can own");
has(INDEX, 'id="pp-momentum-note"', "the Mandate board has a momentum-note host");
has(INDEX, '<script defer src="/support-lane.js"></script>', "support-lane.js ships");
has(INDEX, 'href="/support-lane.css"', "support-lane.css ships");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · 'not evidence, feeds no score' is said in words, twice");

for (const [name, text] of [["MOMENTUM_NOTE", L.MOMENTUM_NOTE], ["WALL_NOTE", L.WALL_NOTE]]) {
  ok(/not evidence/i.test(text), `${name} says it is not evidence`);
  ok(/feed no score|feeds no score/i.test(text), `${name} says it feeds no score`);
  ok(text.length > 80, `${name} is a sentence, not a word (${text.length} chars)`);
}
has(L.WALL_NOTE, "record", "the person-file note separates momentum from the record");

const note = L.noteHtml();
const wallNote = L.noteHtml({ wall: true });
has(note, 'class="pdxsup-note"', "the note renders with the lane's class");
has(wallNote, "pdxsup-note-wall", "the person-file note renders its own variant");
eq(visible(note), L.MOMENTUM_NOTE, "the rendered note is exactly the lane's sentence");
eq(visible(wallNote), L.WALL_NOTE, "the rendered wall note is exactly the lane's sentence");

// The note has to be able to appear on a person file. The profile's Related
// Proposals block is where a count sits next to a record, so that is where the
// stronger wording is required.
has(INDEX, "_wallNote()", "the profile's Related Proposals block renders the wall note");
has(INDEX, "PDXSupportLane.noteHtml", "the client reads the note from the lane, not a copy");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · counts are counts — no score shape, no percentage, no ramp");

// Nothing the lane exposes is named like a measurement.
const MEASURED = /^(score|pct|percent|percentage|rate|ratio|index|rank|grade|level|points|weight|severity|tier)$/i;
(function walk(v, path, depth) {
  if (depth > 6 || v == null) return;
  if (typeof v !== "object") return;
  for (const k of Object.keys(v)) {
    ok(!MEASURED.test(k), `no measurement-shaped key on the lane (${path}.${k})`);
    walk(v[k], `${path}.${k}`, depth + 1);
  }
})(L, "PDXSupportLane", 0);

const surfaces = [note, wallNote, L.count(0), L.count(4210), L.countText(1), L.countText(9)];
for (const s of surfaces) {
  ok(!/\d\s*%/.test(String(s)), `no percentage in ${JSON.stringify(String(s).slice(0, 40))}`);
  ok(!/\/\s*100/.test(String(s)), `no out-of-100 in ${JSON.stringify(String(s).slice(0, 40))}`);
}

eq(L.count(0), "0", "zero is zero, not 'none yet' and not hidden");
eq(L.count(-8), "0", "a negative count floors at zero");
eq(L.count("13"), "13", "a numeric string counts");
eq(L.count(null), "0", "a missing count is zero");
eq(L.countText(1), "1 person backing this", "one backer is one person");
ok(/^3 people backing this$/.test(L.countText(3)), "three backers are people");
ok(/backing/i.test(L.countText(0)), "zero still gets the noun");

// A big number is a big number: same words, no band, no adjective.
const small = L.countText(4).replace(/^\d+/, "N");
const large = L.countText(41000).replace(/^[\d,]+/, "N");
eq(small.replace("person", "people"), large,
  "the wording at 4 backers and at 41,000 is identical apart from the number");

// Escaping — the note is static, but noteHtml must still not be an injection.
const evil = L.noteHtml({ wall: false });
ok(!/<script/i.test(evil), "the note emits no script tag");

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the palette is not the verdict palette, and nothing scales with the count");

// The hues that mean something specific elsewhere: green = the record matched the
// stated position, red = it did not.
const VERDICT_HUES = [
  "#4ade80", "#86efac", "#6ee7a0", "#a7f3d0",
  "#f87171", "#f89b9b", "#fca5a5", "#ef4444",
  "rgba(74,222,128", "rgba(248,113,113", "rgba(239,68,68",
];

// The lane's own stylesheet, comment-stripped so it can explain what it retired.
const laneCss = LANE_CSS.replace(/\/\*[\s\S]*?\*\//g, " ");
for (const hue of VERDICT_HUES) {
  lacks(laneCss.toLowerCase(), hue.toLowerCase(), `support-lane.css avoids ${hue}`);
}

// The shipped support rules in app.css. Sliced to the support block so the check
// is about support styling and not about the Mandate section's live-dot chrome.
const cssStart = APP_CSS.indexOf(".pp-support-btn {");
must(cssStart > 0, "could not find the .pp-support-btn rule in app.css");
const cssEnd = APP_CSS.indexOf("@media (max-width: 640px)", cssStart);
must(cssEnd > cssStart, "could not find the end of the support block in app.css");
const supportCss = APP_CSS.slice(cssStart, cssEnd).replace(/\/\*[\s\S]*?\*\//g, " ");
for (const hue of VERDICT_HUES) {
  lacks(supportCss.toLowerCase(), hue.toLowerCase(),
    `the shipped .pp-support* rules avoid ${hue}`);
}
has(supportCss, "#f5c842", "the support button wears the Mandate's gold");

// Nothing keyed to how high the count is.
for (const css of [laneCss, supportCss]) {
  ok(!/nth-child/.test(css), "no positional styling (nth-child) in the support lane");
  ok(!/\.(is|pp)-(hot|trending|viral|popular|top|winning|leading)\b/.test(css),
    "no threshold/heat class in the support lane");
}
ok(!/pp-support-count[^{]*\{[^}]*(hot|threshold)/.test(supportCss),
  "the count's own rule has no threshold branch");

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the class prefix belongs to this lane alone");

// A stylesheet that silently restyles another module's surface is the bug that
// ships. Every class support-lane.css defines must be unreferenced everywhere
// except this lane and the page that hosts it.
const defined = [...new Set(
  (laneCss.match(/\.pdxsup-[a-z0-9-]+/g) || []).map((c) => c.slice(1))
)];
ok(defined.length >= 2, `support-lane.css defines classes (${defined.length})`);
const OTHERS = [
  "consistency.js", "word-action.js", "self-defection.js", "voting-record.js",
  "profiles-full.js", "profile-spine.js", "finance-lane.js", "app.css",
  "person-file.css", "self-defection.css",
];
for (const f of OTHERS) {
  let src;
  try { src = R(f); } catch { continue; }
  for (const c of defined) {
    ok(src.indexOf(c) < 0, `${f} does not use ${c} (prefix collision)`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the API says momentum, and carries no measurement");

const fn = strip(FN);
has(fn, "supportTotal", "the list response emits supportTotal");
has(fn, '"momentum"', "the stats block names its kind");
ok(/note:\s*"[^"]*momentum[^"]*"/i.test(fn), "the stats block ships the momentum sentence");
ok(/totalVotes: supportTotal/.test(fn),
  "the old field name survives only as an alias of the new one");
// No scored field anywhere in the DTO or the stats.
for (const forbidden of ["score", "percent", "grade", "rankIndex", "severity"]) {
  ok(!new RegExp(`\\b${forbidden}\\s*[:=]`).test(fn),
    `the API emits no field named ${forbidden}`);
}
// The function touches the proposals tables and the counter, and nothing else.
ok(/import \{ pdxProposals, pdxProposalVotes \} from "\.\.\/\.\.\/db\/schema\.js";/.test(fn),
  "the function imports only the two proposals tables from the schema");
for (const t of ["vrMeasures", "vrMemberVotes", "vrPositions", "pdxSnapshots"]) {
  lacks(fn, t, `the function does not touch ${t}`);
}

// Support attaches to reforms. There is no endpoint here for backing a person or
// upvoting a roll call — a poll about a fact is not a fact.
ok(!/\/support\/politician|upvote|voteRow|rollcall/i.test(fn),
  "there is no endpoint for backing a person or a roll-call row");

// ═════════════════════════════════════════════════════════════════════════════
section("8 · both write routes are metered, on the key AND the address");

has(fn, 'from "../lib/rate-limit.js"', "the function imports the limiter");
for (const [name, route] of [["create", "mandate:create"], ["support", "mandate:support"]]) {
  has(fn, `checkLimits("${route}"`, `the ${name} route calls the limiter`);
  ok(new RegExp(`checkLimits\\("${route}"[\\s\\S]{0,400}?cls: "key"`).test(fn),
    `the ${name} route meters the participant key`);
  ok(new RegExp(`checkLimits\\("${route}"[\\s\\S]{0,400}?cls: "ip"`).test(fn),
    `the ${name} route meters the client address`);
}
// The gate must sit before the write, or it is decoration.
const createGate = fn.indexOf('checkLimits("mandate:create"');
const createWrite = fn.indexOf(".insert(pdxProposals)");
ok(createGate > 0 && createWrite > createGate,
  "the create limiter runs before the insert");
const supportGate = fn.indexOf('checkLimits("mandate:support"');
const supportWrite = fn.indexOf(".insert(pdxProposalVotes)");
ok(supportGate > 0 && supportWrite > supportGate,
  "the support limiter runs before the vote insert");
has(fn, "tooManyRequests(gate.retryAfter)", "a tripped limit returns 429 with a retry hint");

// The per-key ceiling is the tight one; the per-IP ceiling is looser on purpose,
// because one address can be a household, an office or a carrier NAT.
const nums = (name) => {
  const m = fn.match(new RegExp(`${name}: Limit = \\{ max: (\\d+), windowSeconds: (\\d+) \\}`));
  return m ? { max: +m[1], win: +m[2] } : null;
};
const ck = nums("CREATE_LIMIT_KEY"), ci = nums("CREATE_LIMIT_IP");
const sk = nums("SUPPORT_LIMIT_KEY"), si = nums("SUPPORT_LIMIT_IP");
for (const [n, v] of [["CREATE_LIMIT_KEY", ck], ["CREATE_LIMIT_IP", ci],
                      ["SUPPORT_LIMIT_KEY", sk], ["SUPPORT_LIMIT_IP", si]]) {
  ok(v && v.max > 0 && v.win > 0, `${n} is a real positive ceiling`);
}
ok(ci.max > ck.max, "the per-address create ceiling is looser than the per-key one");
ok(si.max > sk.max, "the per-address support ceiling is looser than the per-key one");
ok(sk.max > ck.max, "supporting is cheaper than proposing");

// ═════════════════════════════════════════════════════════════════════════════
section("9 · the counter stores a hash, an integer and a window — nothing else");

const rl = strip(RL);
// The insert names exactly three columns. If a raw actor ever joins them, this
// fails, and it fails on the line that would have written it.
const values = rl.match(/\.values\(\{([^}]*)\}\)/);
must(values, "could not find the counter insert in rate-limit.ts");
for (const forbidden of ["ip", "addr", "voterKey", "participant", "userAgent", "actor:"]) {
  ok(values[1].indexOf(forbidden) < 0,
    `the counter row does not store ${forbidden} — got: ${values[1].trim()}`);
}
has(values[1], "bucket", "the counter row stores the hashed bucket");
has(values[1], "hits", "the counter row stores the count");
has(values[1], "windowStart", "the counter row stores the window");

// And the logs do not leak what the table refuses to store.
const logLines = rl.match(/console\.(log|warn|error)\([^)]*\)/g) || [];
for (const line of logLines) {
  for (const forbidden of ["a.id", "voterKey", "clientIp", "ip)", "bucket"]) {
    ok(line.indexOf(forbidden) < 0, `log line does not print ${forbidden} — ${line}`);
  }
}

// Fail-open, on purpose and in writing: a counter outage must not eat a real
// person's proposal.
ok(/allowing|continue/.test(rl), "an unreachable counter allows the request");
has(rl, "delete(pdxRateLimits)", "expired counters are swept");
has(rl, '"retry-after"', "the 429 carries a Retry-After header");
// The 429 body must not say which of the two limits was hit — that is telling a
// caller which one to rotate around.
const body429 = rl.slice(rl.indexOf("export function tooManyRequests"));
lacks(body429, "tripped", "the 429 body does not name the actor class that tripped");

// The schema comment and columns match the claim.
ok(/pdxRateLimits = pgTable\(\s*"pdx_rate_limits"/.test(SCHEMA),
  "the counter table is declared in the Drizzle schema");
const tbl = SCHEMA.slice(SCHEMA.indexOf('"pdx_rate_limits"'));
const tblBody = tbl.slice(0, tbl.indexOf("(t) =>"));
for (const forbidden of ["ipAddress", "voter_key", "participant_key", "user_agent"]) {
  ok(tblBody.indexOf(forbidden) < 0, `the table has no ${forbidden} column`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("10 · the limiter's arithmetic, exercised directly");

// Same module the Function imports — not a re-typed copy.
const W = 600;
const t0 = 1_760_000_000_000; // fixed; the maths must not need a real clock
const start = windowStartSeconds(t0, W);
eq(start % W, 0, "a window starts on a multiple of its length");
eq(windowStartSeconds(start * 1000, W), start, "the first instant is inside the window");
eq(windowStartSeconds((start + W - 1) * 1000, W), start, "the last second is inside the window");
eq(windowStartSeconds((start + W) * 1000, W), start + W, "the next second is the next window");

// `max` is inclusive: "3 per window" allows the 3rd and refuses the 4th, because a
// limit that refuses the 3rd is a limit of 2 and the copy would be lying.
const lim = { max: 3, windowSeconds: W };
eq(evaluate(1, lim, t0).allowed, true, "the 1st request is allowed");
eq(evaluate(3, lim, t0).allowed, true, "the 3rd request is allowed (max is inclusive)");
eq(evaluate(4, lim, t0).allowed, false, "the 4th request is refused");

// retryAfter is time left in the window, never zero.
eq(evaluate(9, lim, start * 1000).retryAfter, W, "at the window's start, retry after a full window");
eq(evaluate(9, lim, (start + W - 1) * 1000).retryAfter, 1, "at the window's end, retry after a second");
ok(evaluate(9, lim, (start + W - 1) * 1000 + 999).retryAfter >= 1, "retryAfter never reaches zero");

// The stored key is a hash and nothing but. This is the privacy claim, checked.
const IP = "203.0.113.47";
const KEY = "pk-abcdef0123456789";
const b = bucketKey("mandate:support", "ip", IP, start);
ok(/^[0-9a-f]{40}$/.test(b), "the bucket key is 40 hex characters");
lacks(b, "203", "the bucket key does not contain the address");
lacks(b, "113", "the bucket key does not contain any octet of the address");
lacks(bucketKey("mandate:support", "key", KEY, start), "abcdef",
  "the bucket key does not contain the participant key");
eq(bucketKey("mandate:support", "ip", IP, start), b, "the same actor in the same window is the same bucket");
ok(bucketKey("mandate:support", "ip", IP, start + W) !== b, "the next window is a different bucket");
ok(bucketKey("mandate:create", "ip", IP, start) !== b, "a different endpoint is a different bucket");
ok(bucketKey("mandate:support", "key", IP, start) !== b, "a different actor class is a different bucket");
ok(bucketKey("mandate:support", "ip", "203.0.113.48", start) !== b, "a different address is a different bucket");
// Rows from the same actor in different windows are not equal by value, so the
// table cannot be read back as one actor's activity over time.
const windows = [0, 1, 2, 3].map((i) => bucketKey("mandate:support", "ip", IP, start + i * W));
eq(new Set(windows).size, 4, "one actor's four windows are four unrelated keys");

// The core carries no database and no clock of its own.
ok(!/drizzle|from "\.\.\/\.\.\/db/.test(RL_CORE), "the arithmetic core imports no database");
ok(!/Date\.now\(\)/.test(strip(RL_CORE)), "the arithmetic core takes its clock as an argument");

// ── Result ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  failures.forEach((f) => console.error(`   ✗ ${f}`));
  console.error(`\n✗ support-lane: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ support-lane: all ${passed} assertions passed`);
console.log(`   momentum only · ${L.NEVER_FEEDS.length} walled surfaces · ` +
  `2 routes metered on key + address · no verdict hue, no ramp, no score`);
