#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-profile-numbers-consistent.mjs — one set of stance numbers per profile,
// and no stale freshness stamps
// ─────────────────────────────────────────────────────────────────────────────
// On one person profile the four stance figures —
//
//   stated   stated positions on file          (the ✒️ list's own row count)
//   on file  issues with a formal record on file
//   deep     formal acts behind that record     ("N formal acts across M issues")
//   tested   Direction Match's "X of Y tested"
//
// — come from PDXConsistency.profileCounts and print identically on every
// surface that shows them: the rail chips, the topic tree tally, the counts
// line under the record, the record brief and the Official Record header.
//
// And the two stale stamps are gone: the counts line's "updated <Mon YYYY>"
// and the Activity pill / footer's "Updated <n> ago".
//
//   node scripts/test-profile-numbers-consistent.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, roll-call votes
// seeded the way a completed /api/voting-record fetch leaves the cache.

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
  "exec-record-ui.js", "issue-colors.js", "formal-index.js", "consistency.js",
  "voting-record.js", "word-action.js", "profile-spine.js", "stance-tree.js",
  "gaps.js", "inventory.js", "profiles-full.js",
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
const eq = (a, b, msg) => ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`✗ profile numbers: STALE HARNESS — ${msg}`);
  process.exit(2);
};
const section = (t) => console.log(`  · ${t}`);
const text = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");
const num = (re, s) => { const m = re.exec(s); return m ? Number(m[1]) : null; };

const vote = (n, issueKey, position) => ({
  kind: "vote", rollcallId: 700 + n, measureId: 1100 + n, number: "H.R. " + (300 + n),
  date: "2025-0" + ((n % 9) + 1) + "-11", action: "On Passage", position,
  isProcedural: false, title: "Measure " + n,
  source: { url: "https://www.congress.gov/roll-call-vote/" + (700 + n), label: "Congress.gov" },
  issues: [{ issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
});

// massie is the file the mismatch was reported on (31 stated on the chip, 12 on
// the counts line; "7 of 7 tested" beside "1 of 12 tested"); khanna is a second
// member with a different stated/testable split.
for (const PID of ["massie", "khanna"]) {
  section(`${PID} · the four numbers are one set`);
  const win = boot();
  const p = win.CMP_DATA[PID];
  must(!!p, `${PID} is no longer on the roster`);
  const CS = win.PDXConsistency, WA = win.PDXWordAction;
  const said = CS.issueRows(PID).filter((r) => r.stance && r.stance.key).map((r) => r.key);
  must(said.length >= 4, `${PID} no longer offers four stated issues`);
  const SEED = [];
  said.slice(0, 4).forEach((k, j) => { for (let i = 0; i < 6; i++) SEED.push(vote(j * 10 + i, k, i < 5 ? "yea" : "nay")); });
  win.PDXVotingRecord.noteMember(PID, SEED);

  const c = CS.profileCounts(PID, p);
  must(c && c.warming === false, `${PID}: the counts object is still warming after the seed`);
  must(c.onRecord > 0 && c.acts > 0 && c.stated > 0, `${PID}: the fixture holds no record to compare`);

  // ── the source of truth agrees with what it summarises ──────────────────
  eq(c.stated, WA.statedCount(PID), `${PID}: counts.stated is the ✒️ list's own row count`);
  const sh = CS.formalPatternIndex.shape(PID);
  eq(c.acts, sh.judged, `${PID}: counts.acts is the formal index's judged total`);
  eq(c.onRecord, sh.issues, `${PID}: the depth figure's issues are the on-file issues`);
  const cov = WA.read(PID, p).coverage;
  eq(c.tested, cov.tested, `${PID}: counts.tested is Direction Match's tested figure`);
  eq(c.scorable, cov.scorable, `${PID}: counts.scorable is Direction Match's denominator`);

  // ── the rail chips ──────────────────────────────────────────────────────
  const chips = win._pdxNavChips(PID, p);
  eq(num(/^(\d+) Stated$/, chips.positions && chips.positions.value), c.stated, `${PID}: 🎯 chip states the stated count`);
  eq(num(/^(\d+) on file$/, chips.record && chips.record.value), c.onRecord, `${PID}: 🏛 Record chip states the on-file count`);
  ok(String(chips.record.note).includes(`${c.tested} of ${c.scorable} tested`), `${PID}: Record chip note carries the one tested figure`);
  ok(String(chips.wordaction.note).includes(`tested on ${c.tested} of ${c.scorable}`), `${PID}: ⚖️ chip note carries the same tested figure`);
  if (chips.standout) {
    eq(num(/^(\d+) formal acts?$/, chips.standout.value), c.acts, `${PID}: standout chip states the depth figure`);
    ok(String(chips.standout.note).includes(`across ${c.onRecord} issue`), `${PID}: …across the on-file issues`);
  }
  Object.keys(chips).forEach((k) => {
    ok(!/tested/.test(chips[k].value) || k === "wordaction",
      `${PID}: the ${k} chip prints a second "tested" figure (${chips[k].value})`);
  });

  // ── the counts line ─────────────────────────────────────────────────────
  const inv = win.PDXInventory.text(PID, p);
  eq(num(/(\d+) formal acts? across/, inv), c.acts, `${PID}: counts line acts`);
  eq(num(/across (\d+) issues?/, inv), c.onRecord, `${PID}: counts line issues`);
  eq(num(/(\d+) stated positions? on file/, inv), c.stated, `${PID}: counts line stated`);
  ok(inv.includes(`${c.tested} of ${c.scorable} tested`), `${PID}: counts line tested (${inv})`);

  // ── the topic tree tally ────────────────────────────────────────────────
  const tree = text(win.PDXStanceTree.sectionHtml(PID, p));
  eq(num(/(\d+) with a stated position/, tree), c.stated, `${PID}: tree tally stated`);
  eq(num(/(\d+) with a formal record on file/, tree), c.onRecord, `${PID}: tree tally on file`);
  ok(tree.includes(`${c.tested} of ${c.scorable} tested by Direction Match`), `${PID}: tree tally tested`);

  // ── the record brief ────────────────────────────────────────────────────
  const brief = text(WA.briefHtml(PID, p));
  const bIss = num(/(\d+) issues? on the formal record/, brief);
  if (bIss !== null) {
    eq(bIss, c.onRecord, `${PID}: brief issues on the formal record`);
    eq(num(/(\d+) votes? and formal actions? read/, brief), c.acts, `${PID}: brief acts read`);
  }

  // ── the Official Record header ──────────────────────────────────────────
  const or = text(CS.officialRecordSectionHtml(PID, p));
  ok(!/issues? tested against/.test(or), `${PID}: the Official Record header prints a second "tested" total`);

  // ── no stale stamps on the rendered surfaces ────────────────────────────
  const all = [inv, tree, brief, or, JSON.stringify(chips)].join(" ");
  ok(!/Jul 2026/i.test(all), `${PID}: a "Jul 2026" stamp is still rendered`);
  ok(!/\d+mo ago/i.test(all), `${PID}: a "<n>mo ago" stamp is still rendered`);
  ok(!/\bupdated\b/i.test(inv), `${PID}: the counts line still prints a freshness clause`);
  ok(!chips.activity, `${PID}: the Activity chip still carries an "Updated <n> ago" figure`);
}

section("trump · the executive lane's depth sentence counts the on-file issues");
{
  const win = boot();
  const PID = "trump", p = win.CMP_DATA[PID];
  must(!!p && !!win.PDXExecRecord, "the executive fixture is gone");
  const c = win.PDXConsistency.profileCounts(PID, p);
  // The profile's own summary block (its term scope), not a bare summary() call.
  const vol = (win.PDXConsistency.execRecordSummary.pick(PID) || {}).volume || "";
  must(!!vol, "the executive volume sentence rendered nothing");
  eq(num(/across (\d+) issues?/, vol), c.onRecord, "the volume sentence's issues are the on-file issues");
  const chips = win._pdxNavChips(PID, p);
  eq(num(/^(\d+) on file$/, chips.record && chips.record.value), c.onRecord, "trump: Record chip on file");
  eq(num(/^(\d+) Stated$/, chips.positions && chips.positions.value), c.stated, "trump: 🎯 chip stated");
  const tree = text(win.PDXStanceTree.sectionHtml(PID, p));
  eq(num(/(\d+) with a formal record on file/, tree), c.onRecord, "trump: tree tally on file");
  eq(num(/(\d+) with a stated position/, tree), c.stated, "trump: tree tally stated");
  const inv = win.PDXInventory.text(PID, p);
  if (/stated positions? on file/.test(inv)) eq(num(/(\d+) stated positions? on file/, inv), c.stated, "trump: counts line stated");
  ok(!/Jul 2026|\d+mo ago|\bupdated\b/i.test(inv + JSON.stringify(chips)), "trump: a stale stamp is still rendered");
}

section("source · the stale stamps are gone from the profile");
{
  const PF = R("profiles-full.js"), INV = R("inventory.js");
  ok(!/_pdxActivityRel/.test(PF), "profiles-full.js still derives the Activity relative time");
  ok(!/'Updated ' \+/.test(PF), "profiles-full.js still prints 'Updated ' + a relative time");
  ok(!/chip\('Last updated'/.test(PF), "the Activity footer still prints a 'Last updated' chip");
  const invCode = INV.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok(!/'updated '/.test(invCode), "inventory.js still composes an 'updated' clause");
  ok(!/MONTHS/.test(invCode), "inventory.js still formats a month-and-year stamp");
}

if (failures.length) {
  console.error(`\n✗ profile numbers: ${failures.length} failure(s)\n`);
  failures.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
console.log(`\n✓ profile numbers: all ${passed} assertions passed — one set of numbers, no stale dates`);
