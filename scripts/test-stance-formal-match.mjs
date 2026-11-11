#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-stance-formal-match.mjs — the narrow formal-record matcher for the
// strongest Evidence Locker claims (profile-locker.js formalMatch) and how
// Word vs Action counts a verified claim.
//
//   · A strong Locker claim on healthcare_costs / cost_living that NAMES a
//     measure (bill number or title) this member's own substantive act on that
//     measure answers, mapped to the same issue key, is promoted to the formal
//     layer and enters Word vs Action's figure as a tested position.
//   · The record's direction is the engine's own verdict: a matched act that
//     runs against the claim counts as a contradiction, not a skip.
//   · A strong claim with no matching record (Khanna's live premiums claim;
//     Talarico's insulin claim, which has no formal record on file) stays a
//     stated position and does not move the figure.
//   · Off-list members, other issues, weak reads, procedural votes, subject
//     words without a named measure and a cold record never match.
//
// The record fixture is Khanna's live voting record on the issues his ledger
// reads (scripts/fixtures/vr-khanna-formal-match.json).
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import assert from "node:assert/strict";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const RECORD = JSON.parse(read("scripts/fixtures/vr-khanna-formal-match.json")).items;
const issueKeys = JSON.parse(read("db/issue-keys.json")).keys;

let failures = 0;
const t = async (name, fn) => {
  try { await fn(); console.log("  ✓", name); }
  catch (e) { failures++; console.error("  ✗", name, "\n    ", e.message); }
};

const html = read("person.html");
const TAGS = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map((m) => ({ attrs: m[1], body: m[2] }));
const ENGINE = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "pdx-issue-family.js", "acct-spotlight-data.js", "say-vs-do.js",
  "exec-action-data.js", "exec-record.js", "exec-record-ui.js", "issue-colors.js", "consistency.js",
  "voting-record.js", "word-action.js", "profile-spine.js", "stance-tree.js", "related-issues.js",
  "profile-evidence.js", "profiles-full.js", "gaps.js",
];
const quiet = { log() {}, warn() {}, error() {}, info() {}, debug() {} };
const boot = ({ locker = true, record = true } = {}) => {
  const win = makeSandbox();
  win.console = quiet;
  const sb = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of ENGINE) vm.runInContext(read(f), sb, { filename: f });
  for (const tg of TAGS) if (!/\bsrc\s*=/.test(tg.attrs) && /window\.PDXStance\s*=/.test(tg.body)) vm.runInContext(tg.body, sb, { filename: "person.html PDXStance" });
  if (locker) vm.runInContext(read("profile-locker.js"), sb, { filename: "profile-locker.js" });
  win.PROFILES = win.CMP_DATA;
  if (record) assert.ok(win.PDXVotingRecord.noteMember("khanna", JSON.parse(JSON.stringify(RECORD))), "record seeded");
  return win;
};

// A Locker spotlight entry, as /api/evidence-locker/items serves it.
const entry = (pid, issueKey, position, excerpt, { confidence = 0.85, url = `https://example.house.gov/${issueKey}/${excerpt.length}`, source_type = "official House issue page" } = {}) => ({
  headline: `${pid} ${position}s ${issueKey} (${source_type}) ${excerpt.length}`,
  facts: `On the official page: “${excerpt}”`,
  date: "Nov 10, 2026", issueKey, impact: "neutral", category: "statement", sourceType: "statement",
  tags: ["Public Statements", "Automated stance read"],
  source: { label: "Source: official House page", url },
  pipeline: { position, confidence, source_type, excerpt, attribution: "Source: official House page", rules_version: "phase8-v2",
    captured: "2026-11-10", strength: confidence >= 0.8 ? "strong" : "weak", layer: "stated", formal_record: false },
});
const ingest = (win, pid, entries) => win.PDXProfileLocker.onBody(JSON.parse(JSON.stringify({ items: { [pid]: entries }, count: entries.length })));
const waRead = (win, pid) => win.PDXWordAction.read(pid, win.CMP_DATA[pid]);
const num = (h) => (String(h).match(/class="pdxwa-num-v">([^<]*)</) || [])[1];

// Khanna's live strong claim on healthcare_costs (names no measure) and a
// claim that names the Inflation Reduction Act, which his record answers.
const LIVE_PREMIUMS = "We must increase coverage, support small businesses, expand primary care, and lower premiums.";
const IRA_CLAIM = "I will keep fighting to protect the Inflation Reduction Act’s $35 insulin cap and lower drug costs for seniors.";

console.log("stance pipeline: formal-record matching for the strongest Locker claims");

const base = boot();
const r0 = waRead(base, "khanna");

await t("fixture: Khanna's record is warm, the figure publishes, healthcare_costs has no curated card", () => {
  assert.ok(issueKeys.includes("healthcare_costs") && issueKeys.includes("cost_living"));
  assert.equal(base.PDXProfileLocker.curatedOn("khanna", "healthcare_costs"), false);
  const hc = base._pdxRecordIssueItems("khanna", "healthcare_costs").map((i) => i.number);
  assert.ok(hc.includes("H.R. 5376"), hc.join());
  assert.equal(r0.publishable, true);
  assert.equal(typeof r0.pct, "number");
  assert.ok(!r0.items.some((i) => i.issueKey === "healthcare_costs" && i.scored !== false), "healthcare_costs is not in the figure yet");
});

await t("a claim naming a measure on the member's record is promoted to the formal layer and counted by Word vs Action", () => {
  const w = boot();
  ingest(w, "khanna", [entry("khanna", "healthcare_costs", "support", IRA_CLAIM)]);
  const m = w.PDXProfileLocker.formalMatch("khanna", "healthcare_costs");
  assert.ok(m, "matched");
  assert.equal(m.verified, true); assert.equal(m.layer, "formal");
  assert.equal(m.token, "consistent", "voted yea on the IRA, which the record maps as support");
  assert.deepEqual(JSON.parse(JSON.stringify(m.measures.map((x) => x.number))), ["H.R. 5376"]);
  assert.ok(m.records.every((x) => x.number === "H.R. 5376"), "tested against the matched measure only");
  // The stored Locker item itself is untouched: still the stated layer.
  assert.equal(w.PDXProfileLocker.forIssue("khanna", "healthcare_costs")[0].pipeline.formal_record, false);

  const r = waRead(w, "khanna");
  const it = r.items.find((i) => i.kind === "position-verified");
  assert.ok(it, "the verified claim is a word item");
  assert.equal(it.issueKey, "healthcare_costs"); assert.equal(it.tier, "position"); assert.equal(it.scored, true);
  assert.equal(it.test.state, "tested"); assert.equal(it.test.token, "consistent"); assert.equal(it.test.basis, "formal-match");
  assert.equal(it.test.score, 100);
  assert.ok(r.tested.includes(it));
  assert.equal(r.tested.length, r0.tested.length + 1);
  assert.ok(r.testedWeight > r0.testedWeight, `${r.testedWeight} > ${r0.testedWeight}`);
  assert.ok(r.pct > r0.pct, `figure moves: ${r0.pct} → ${r.pct}`);
  // The named action is the matched vote, and the rendered figure moves too.
  const wa = w.PDXWordAction.sectionHtml("khanna", w.CMP_DATA.khanna) || "";
  const wa0 = base.PDXWordAction.sectionHtml("khanna", base.CMP_DATA.khanna) || "";
  assert.ok(String(num(wa) || "").includes(String(r.pct)), `section prints the new figure (${num(wa)} vs ${r.pct})`);
  assert.notEqual(num(wa), num(wa0), "rendered figure differs from the unmatched profile");
});

await t("a matched record that runs against the claim is counted as a contradiction, not skipped", () => {
  const w = boot();
  ingest(w, "khanna", [entry("khanna", "healthcare_costs", "support", "I support the Lower Health Care Premiums for All Americans Act to cut what families pay.")]);
  const m = w.PDXProfileLocker.formalMatch("khanna", "healthcare_costs");
  assert.ok(m, "matched by title");
  assert.deepEqual(JSON.parse(JSON.stringify(m.measures.map((x) => x.number))), ["H.R. 6703"]);
  assert.equal(m.token, "contradicts", "voted nay on the bill the claim backs");
  const it = waRead(w, "khanna").items.find((i) => i.kind === "position-verified");
  assert.equal(it.test.token, "contradicts"); assert.equal(it.test.score, 0);
  assert.ok(waRead(w, "khanna").pct < r0.pct);
});

await t("a strong claim with no matching record stays a stated position and does not move the figure", () => {
  const w = boot();
  ingest(w, "khanna", [entry("khanna", "healthcare_costs", "support", LIVE_PREMIUMS)]);
  const P = w.PDXProfileLocker;
  assert.equal(P.strengthOf(P.forIssue("khanna", "healthcare_costs")[0]), "strong");
  assert.ok(P.promotedStance("khanna", "healthcare_costs"), "still a promoted Said line");
  assert.equal(P.formalMatch("khanna", "healthcare_costs"), null, "no measure named → no match");
  const r = waRead(w, "khanna");
  assert.ok(!r.items.some((i) => i.kind === "position-verified"));
  assert.equal(r.pct, r0.pct); assert.equal(r.testedWeight, r0.testedWeight); assert.equal(r.tested.length, r0.tested.length);
  const wa = w.PDXWordAction.sectionHtml("khanna", w.CMP_DATA.khanna) || "";
  assert.equal(num(wa), num(base.PDXWordAction.sectionHtml("khanna", base.CMP_DATA.khanna) || ""));
  assert.ok(/not formal actions|not a formal act/i.test(wa), "the stated row still says it is not a formal act");
});

await t("Talarico's insulin claim has no formal record on file: stated position only", () => {
  const w = boot();
  const claim = "James Talarico capped insulin at $25 a month in Texas and got it through a Republican legislature.";
  ingest(w, "james_talarico", [entry("james_talarico", "healthcare_costs", "support", claim, { source_type: "campaign issue page", url: "https://jamestalarico.com/issue/health-care/" })]);
  assert.ok(w.PDXProfileLocker.FORMAL_MATCH_MEMBERS.james_talarico, "on the starting list");
  assert.ok(w.PDXProfileLocker.promotedStance("james_talarico", "healthcare_costs"));
  assert.equal(w.PDXProfileLocker.formalMatch("james_talarico", "healthcare_costs"), null);
  const before = waRead(boot({ record: false }), "james_talarico");
  const after = waRead(w, "james_talarico");
  assert.equal(after.pct, before.pct); assert.equal(after.tested.length, before.tested.length);
});

await t("the matcher stays narrow: issues, members, strength, named measure, substantive act, warm record", () => {
  // Another issue key the record also answers is out of scope.
  const w1 = boot();
  ingest(w1, "khanna", [entry("khanna", "social_security", "support", "I voted for the Social Security Fairness Act of 2023 and will protect it.")]);
  assert.equal(w1.PDXProfileLocker.formalMatch("khanna", "social_security"), null, "issue not in the starting set");
  // A weak read never matches.
  const w2 = boot();
  ingest(w2, "khanna", [entry("khanna", "healthcare_costs", "support", IRA_CLAIM, { confidence: 0.7 })]);
  assert.equal(w2.PDXProfileLocker.formalMatch("khanna", "healthcare_costs"), null);
  // A subject word without the measure's name is not a match.
  const w3 = boot();
  ingest(w3, "khanna", [entry("khanna", "healthcare_costs", "support", "I will cap insulin at $35 and fight inflation in drug prices.")]);
  assert.equal(w3.PDXProfileLocker.formalMatch("khanna", "healthcare_costs"), null);
  // A member off the starting list is not matched even with the same record.
  const w4 = boot();
  w4.PDXVotingRecord.noteMember("ro_offlist", JSON.parse(JSON.stringify(RECORD)));
  ingest(w4, "ro_offlist", [entry("ro_offlist", "healthcare_costs", "support", IRA_CLAIM)]);
  assert.equal(w4.PDXProfileLocker.formalMatch("ro_offlist", "healthcare_costs"), null);
  // Cold record: stays stated until the record is warm, then matches.
  const w5 = boot({ record: false });
  ingest(w5, "khanna", [entry("khanna", "healthcare_costs", "support", IRA_CLAIM)]);
  assert.equal(w5.PDXProfileLocker.formalMatch("khanna", "healthcare_costs"), null, "cold record");
  w5.PDXVotingRecord.noteMember("khanna", JSON.parse(JSON.stringify(RECORD)));
  assert.ok(w5.PDXProfileLocker.formalMatch("khanna", "healthcare_costs"), "warm record");
  // Procedural votes and amendments on a named measure do not count.
  const w6 = boot({ record: false });
  w6.PDXVotingRecord.noteMember("khanna", JSON.parse(JSON.stringify(RECORD)).map((r) => r.number === "H.R. 5376" ? { ...r, isProcedural: true } : r));
  ingest(w6, "khanna", [entry("khanna", "healthcare_costs", "support", IRA_CLAIM)]);
  assert.equal(w6.PDXProfileLocker.formalMatch("khanna", "healthcare_costs"), null);
  // Bill-number matching: "H.R. 5376" / "HR 5376" match; "H.R. 53760" and "S. 5376" do not.
  const M = w1.PDXProfileLocker.measureNamedIn;
  const ira = { number: "H.R. 5376", title: "Inflation Reduction Act of 2022" };
  assert.ok(M("Backed H.R. 5376 all the way.", ira)); assert.ok(M("Backed HR 5376.", ira));
  assert.ok(M("the inflation reduction act", ira));
  assert.ok(!M("Backed H.R. 53760.", ira)); assert.ok(!M("Backed S. 5376.", ira));
  assert.ok(!M("We fought inflation.", ira));
});

await t("a curated card on the issue still wins: no verified item is added over it", () => {
  const w = boot();
  // cost_living: Khanna has no curated card, so use AOC's curated cost_living card instead.
  assert.equal(w.PDXProfileLocker.curatedOn("aoc", "cost_living"), true);
  ingest(w, "aoc", [entry("aoc", "cost_living", "support", "She helped pass the American Rescue Plan Act to lower costs for families.")]);
  assert.equal(w.PDXProfileLocker.formalMatch("aoc", "cost_living"), null, "promotedStance stands down under a curated card");
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log("formal match: all checks pass");
