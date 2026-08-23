#!/usr/bin/env node
/**
 * test-act-scope-copy.mjs — one act is one act, and the copy has to say so
 * ─────────────────────────────────────────────────────────────────────────────
 * Project Big Picture put every topic an act touches on every surface that shows
 * the act. That fixed WHAT a reader sees. It did not fix HOW the surfaces talk
 * about it, and the two failures are opposite in shape:
 *
 *   · An ACT-SCOPED face — a record card, a profile vote highlight — carries one
 *     verdict badge. "✓ Matches stance · compares the stated stance on Health
 *     care" sits over a green tick and reads as a finding about their health-care
 *     record. It is one roll call, on one day, against one sentence they said.
 *   · A RECORD-WIDE face — an issue group head, a dossier bucket, the door into
 *     it — carries a pattern word: "Backs it up", "The record points the same way
 *     as the word". That sentence is earned by a record. A row whose entire judged
 *     evidence is one omnibus yea does not have one; it has an act.
 *
 * Neither is a scoring bug and nothing here changes a score. Both are the same
 * lie told at different sizes, and this file pins the fix at both ends with two
 * fixtures that must stay true simultaneously:
 *
 *   (a) a multi-topic act, and a member whose ONLY record on the key is that act
 *       → the act faces name the instrument; the issue face carries the depth
 *         disclosure beside its verdict, and the verdict itself is unchanged.
 *   (b) the same member with three separate measures on the key
 *       → no depth disclosure; the record-wide word stands on its own, exactly as
 *         it did before this pass. The honesty marker must not become wallpaper.
 *
 * Plus a phrase gate over everything the act-scoped paths render, because the
 * cheapest way to reintroduce this is one confident adverb in one template.
 *
 *   node scripts/test-act-scope-copy.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} — missing ${JSON.stringify(needle)}`);
const hasNot = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg} — found ${JSON.stringify(needle)}`);
const section = (t) => console.log(`\n  · ${t}`);

// ── fixture (a): the multi-topic act ─────────────────────────────────────────
const SEED = JSON.parse(readFileSync(join(ROOT, "db/exec-action-seed.json"), "utf8"));
const HR1 = SEED.actions.trump.find((a) => a.documentId === "Public Law 119-21");
if (!HR1 || !HR1.issues || HR1.issues.length < 9) {
  console.error("✗ act-scope copy: the H.R. 1 seed is missing or too small to probe");
  process.exit(1);
}
const MAPPINGS = HR1.issues.map((m) => ({
  issueKey: m.issueKey,
  supportMeaning: m.direction === "opposes" ? "yea_opposes" : "yea_supports",
  isPrimary: !!m.isPrimary,
  weight: typeof m.weight === "number" ? m.weight : 100,
}));
const N = MAPPINGS.length;
const KEY = MAPPINGS[0].issueKey;

const ACT = {
  kind: "vote", rollcallId: 9001, measureId: 1, number: "H.R. 1", date: "2025-07-03",
  action: "On Passage", position: "yea", isProcedural: false, isOmnibus: true,
  title: "One Big Beautiful Bill Act",
  issues: MAPPINGS,
  source: { url: "https://clerk.house.gov/Votes/2025190", label: "Clerk of the House" },
};
// A stated stance on every topic the act touches, so every judgeable comparison
// exists and nothing below is passing because a branch was skipped.
const POSMAP = {};
MAPPINGS.forEach((m) => { POSMAP[m.issueKey] = { stance: "support", text: "Backs it." }; });

// ── fixture (b): the same key, three separate measures ───────────────────────
const DEEP = [ACT].concat([2, 3].map((i) => ({
  kind: "vote", rollcallId: 9000 + i * 10, measureId: 100 + i,
  number: "H.R. " + (200 + i), date: "2025-0" + (4 + i) + "-11",
  action: "On Passage", position: "yea", isProcedural: false,
  title: "A separate measure " + i,
  issues: [{ issueKey: KEY, supportMeaning: "yea_supports", isPrimary: true, weight: 100 }],
  source: { url: "https://example.gov/" + i, label: "Clerk of the House" },
})));

// ── boot the shipped surfaces ─────────────────────────────────────────────────
const win = makeSandbox();
const ctx = vm.createContext(win);
for (const f of [...ENGINE_FILES, "voting-record.js", "profiles-full.js"]) {
  vm.runInContext(readFileSync(join(ROOT, f), "utf8"), ctx, { filename: f });
}
const W = ctx.window;
for (const fn of ["_vrCardHtml", "_vrGroupsHtml", "_pdxVoteHighlightCard",
                  "_polRecordMap", "_pdxOneInstrumentSay"]) {
  if (typeof W[fn] !== "function") {
    console.error(`✗ act-scope copy: window.${fn} is missing — nothing below can be checked`);
    process.exit(1);
  }
}
const strip = (h) => String(h).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

// ── THE PHRASE GATE ───────────────────────────────────────────────────────────
// A standing-pattern claim is a claim about many things. Every phrase here makes
// one, and none of them can be true of a single instrument. "their record on X"
// is allowed only in the negation an act face is now expected to carry, which is
// why the gate looks for the affirmative form specifically.
const BANNED = [
  { re: /\bconsistently\b/i, why: "'consistently' is a claim about many items" },
  { re: /\balways (?:votes?|backs?|supports?|opposes?|advances?)\b/i, why: "'always …' is a lifetime claim" },
  { re: /\bclear pattern\b/i, why: "'clear pattern' is a depth claim" },
  { re: /\brecord shows they\b/i, why: "'record shows they …' speaks for a whole record" },
  { re: /\bpattern on (?:this|that) (?:issue|topic)\b/i, why: "names a pattern from one item" },
  { re: /\btheir record on\b/i, why: "'their record on X' from an act face", allow: /\bnot their record on\b/i },
  { re: /\bmain issue\b/i, why: "'main issue' ranks the topics again" },
  { re: /\b1 of \d+ topics\b/i, why: "an ordinal over topics is a ranking" },
];
function gate(name, html) {
  const txt = strip(html);
  BANNED.forEach((b) => {
    const hit = b.re.test(txt);
    const excused = hit && b.allow ? !b.re.test(txt.replace(b.allow, " ")) : false;
    ok(!hit || excused, `${name}: banned overclaim — ${b.why}`);
  });
}

console.log("── act scope & depth disclosure ──────────────────────────────");

// ─────────────────────────────────────────────────────────────────────────────
section("1. the record card is scoped to this vote, not to the topic's record");
const card = W._vrCardHtml(ACT, POSMAP);
has(card, "on this vote — stated stance on", "record card badge names the instrument first");
has(card, "vs this one roll call", "record card badge says it is one roll call");
has(card, `all ${N} topics are judged below`, "record card still points at the whole list");
has(card, "On this act: this badge compares", "badge tooltip opens with the act scope");
has(card, "It is one roll call, not their record on", "badge tooltip denies the pattern reading");
hasNot(card, "this bill’s main issue", "no 'main issue' left on the record card");
gate("record card", card);

// ─────────────────────────────────────────────────────────────────────────────
section("2. the profile vote highlight prints its scope, it does not hover it");
const hi = W._pdxVoteHighlightCard(ACT, POSMAP);
has(hi, 'class="pdx-vrhi-scope"', "highlight card renders a printed scope line");
has(hi, "On this vote — stated stance on", "highlight scope names the instrument first");
has(hi, `one of ${N} topics it decided`, "highlight scope counts the topics the badge does not cover");
has(hi, "On this act: compares the stated stance on", "highlight tooltip opens with the act scope");
has(hi, "It is not their record on", "highlight tooltip denies the pattern reading");
// The scope is text in the document, not an attribute — the whole point of the change.
ok(strip(hi).includes("On this vote — stated stance on"),
   "highlight scope survives tag-stripping (it is real text, not a title=)");
gate("highlight card", hi);

// ─────────────────────────────────────────────────────────────────────────────
section("3. (a) one instrument on the key → the issue face discloses its depth");
const thinMap = W._polRecordMap([ACT], POSMAP);
const thin = W._vrGroupsHtml([ACT], POSMAP);
ok(thinMap[KEY] && thinMap[KEY].label, "the engine still produces a group verdict for the key");
has(thin, 'class="vr-group-depth"', "single-instrument group carries the depth marker");
has(thin, "on 1 record", "the marker states the inventory");
has(thin, "That is one instrument on this issue, not a pattern across the rest of their record",
    "the marker says in words what it is not");
has(thin, "— H.R. 1", "the marker names the instrument");
// THE VERDICT IS UNTOUCHED. This pass adds scope; it never downgrades a finding.
has(thin, W._pdxEsc ? W._pdxEsc(thinMap[KEY].label) : thinMap[KEY].label,
    "the group verdict word is unchanged by the disclosure");

// ─────────────────────────────────────────────────────────────────────────────
section("4. (b) three measures on the key → the pattern word stands alone");
const deepMap = W._polRecordMap(DEEP, POSMAP);
const deep = W._vrGroupsHtml(DEEP, POSMAP);
ok(deepMap[KEY] && deepMap[KEY].label, "the engine produces a group verdict at depth too");
eq(deepMap[KEY].label, thinMap[KEY].label,
   "same verdict word at both depths — the disclosure is not a downgrade");
// The deep group is the one the key is filed under; the marker must be absent there.
const deepGroup = String(deep).split('<div class="vr-group">')
  .find((g) => g.includes('class="vr-group-n">3 records')) || "";
ok(deepGroup.length > 0, "the deep fixture files a group under the key");
hasNot(deepGroup, "vr-group-depth", "a three-measure group carries no single-instrument marker");
hasNot(deepGroup, "on 1 record", "…and no 'on 1 record' copy");
// Both fixtures rendered from the same code path, so neither can regress alone.
ok(thin.includes("vr-group-depth") && !deepGroup.includes("vr-group-depth"),
   "(a) and (b) disagree about the marker, which is the whole finding");

// ─────────────────────────────────────────────────────────────────────────────
section("5. the single-instrument sentence, as a pure function of the spread");
const say1 = W._pdxOneInstrumentSay({ docs: 1, judged: 1, single: true, ident: "H.R. 1" });
ok(say1 && say1.chip === "on 1 item", "one judged item → 'on 1 item'");
has(say1.sentence, "On one judged item on file — H.R. 1", "the sentence leads with the inventory");
has(say1.sentence, "not a pattern across the issue",
    "the sentence names what it is not");
const say6 = W._pdxOneInstrumentSay({ docs: 1, judged: 6, single: true, ident: "H.R. 1" });
ok(say6 && say6.chip === "on 1 measure", "six judged items from one measure → 'on 1 measure'");
has(say6.sentence, "6 judged items on file, all the same measure", "…and the count is stated");
eq(W._pdxOneInstrumentSay({ docs: 3, judged: 6, single: false, ident: "" }), null,
   "three documents → no marker at all");
eq(W._pdxOneInstrumentSay({ docs: 1, judged: 0, single: true, ident: "x" }), null,
   "nothing judged → no marker (fails closed)");
eq(W._pdxOneInstrumentSay(null), null, "no spread → no marker");

// ─────────────────────────────────────────────────────────────────────────────
section("6. the three consistency faces are wired to the same disclosure");
const CJS = readFileSync(join(ROOT, "consistency.js"), "utf8");
has(CJS, "function _oneInstrumentSay(sp)", "the wording helper exists");
has(CJS, "window._pdxOneInstrumentSay = _oneInstrumentSay",
    "…and is exported so this file can pin it");
has(CJS, "var one = _oneInstrumentVoiceRow(r);", "the dossier bucket head asks for the disclosure");
has(CJS, "var sub = one ? one.sentence : (o.sub || '');",
    "…and replaces the record-wide sub-line with it rather than printing both");
has(CJS, "var _oneIns = _oneInstrumentVoice(pid, p.key, p.off);",
    "the divergence row asks for the disclosure");
has(CJS, 'class="pdxdv-row-1"', "…and prints it on the row's reason line");
has(CJS, "var one = _oneInstrumentVoice(pid, issueKey, null);",
    "the shared dossier door asks for the disclosure");
has(CJS, 'class="pdxdos-door-1"', "…and prints it on the door");
// The accessible name has to carry it too, or the marker is sighted-only.
ok(/_dosDoorLabel\(_issueLabel\(p\.key\), o, '', _oneIns \? _oneIns\.chip : ''\)/.test(CJS),
   "the divergence row's aria-label carries the depth");
ok(/_dosDoorLabel\(_issueLabel\(issueKey\), o, '', one \? one\.chip : ''\)/.test(CJS),
   "the dossier door's aria-label carries the depth");
// No floor was moved to make any of this true.
for (const floor of ["_RD_MIN_JUDGED", "_RD_MEMBER_FLOOR", "_RD_THIN_MIN", "_RD_DOMINANCE"]) {
  ok(!new RegExp(`${floor}\\s*=`).test(CJS), `${floor} is not redefined in consistency.js`);
}

// ─────────────────────────────────────────────────────────────────────────────
section("7. no act-scoped path emits a standing-pattern phrase");
gate("thin issue group", thin);
gate("deep issue group", deep);
gate("single-instrument sentence", say1.sentence + " " + say6.sentence);
// The learn card explains the badge to a first-time reader; it used to teach the
// exact misreading this pass removes.
const LEARN = readFileSync(join(ROOT, "pdx-learn.js"), "utf8");
hasNot(LEARN, "bill’s main issue", "the learn card no longer teaches 'main issue'");
has(LEARN, "it compares the two, on this act alone", "…it teaches the act scope instead");
has(LEARN, "One vote is one vote", "…and states the limit in plain words");

console.log(`\n  ${failures.length ? "✗" : "✓"} ${passed} assertion${passed === 1 ? "" : "s"} passed` +
  (failures.length ? `, ${failures.length} failed` : ""));
if (failures.length) {
  failures.forEach((f) => console.error("    ✗ " + f));
  process.exit(1);
}
