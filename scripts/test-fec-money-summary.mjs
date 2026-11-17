#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-fec-money-summary.mjs — the FEC money summary the offline discovery job
// saves while it has a federal candidate's principal committee open.
//
//   · A federal candidate with no prior money total gets the FEC summary
//     (receipts, disbursements, cash on hand, coverage end) attached, and the
//     existing 💰 receipts chip reads it in its existing words, naming the FEC.
//   · A candidate who already has a newer (or undated, hand-verified) total
//     keeps the existing one — at write time and at read time.
//   · State legislators and anyone not looked up via the FEC are untouched.
//   · The live cron still never calls the FEC API.
//
//   node scripts/test-fec-money-summary.mjs
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import * as M from "../netlify/lib/fec-money-summary.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => fs.readFileSync(path.join(root, f), "utf8");
const FTM_SRC = R("ftm-data.js");
const LANE_SRC = R("finance-lane.js");
const JOB_SRC = R("scripts/discover-raw-ingest-sources-2026-11.mjs");

let passed = 0, failures = 0;
async function t(name, f) {
  try { await f(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures++; console.log(`  ✗ ${name}\n     ${e?.message || e}`); }
}

// The shipped accessor block of ftm-data.js (seed → index → resolver →
// accessors), with its FTM_FEC_SUMMARY block swapped for a fixture table, booted
// beside the real finance-lane.js.
function boot(table = {}) {
  const src = M.replaceFecSummaryBlock(FTM_SRC, table);
  const at = src.indexOf("    var FTM_DATA = [");
  const end = src.indexOf("    // Small escapers so the funding UI is safe", at);
  assert.ok(at > 0 && end > at, "found the ftm-data.js accessor block");
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  vm.runInContext(LANE_SRC, ctx, { filename: "finance-lane.js" });
  vm.runInContext(src.slice(at, end), ctx, { filename: "ftm-data.js#accessors" });
  return win;
}
const visible = (html) => String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

// The FEC's own committee records, as the job reads them: the committee detail
// (website, no money) and the committee's totals for its latest cycle.
const DETAIL = { committee_id: "C00812345", name: "DANA QUILL FOR CONGRESS", website: "DANAQUILLFORCONGRESS.COM", designation: "P" };
const TOTALS = { committee_id: "C00812345", cycle: 2026, receipts: 415384.72, disbursements: 1117401.09, last_cash_on_hand_end_period: 145957.81,
  coverage_end_date: "2026-10-14T00:00:00", cash_on_hand_beginning_period: 847974.18, other_receipts: 594.18 };
const SUMMARY = M.fecMoneySummary({ ...DETAIL, ...TOTALS }, { committeeId: "C00812345", candidateId: "H6MT01234" });
const ROW = { ...SUMMARY, name: "Dana Quill", office: "U.S. House (MT-01) Candidate" };

await t("the summary keeps exactly the four FEC figures, and only when the committee record has them", () => {
  assert.deepEqual(SUMMARY, { receipts: 415384.72, disbursements: 1117401.09, cashOnHand: 145957.81, coverageEnd: "2026-10-14", cycle: 2026,
    committeeId: "C00812345", candidateId: "H6MT01234", source: "https://www.fec.gov/data/committee/C00812345/" });
  assert.equal(M.fecMoneySummary(DETAIL, { committeeId: "C00812345" }), null, "a committee record with no money summary saves nothing");
  assert.equal(M.fecMoneySummary({ ...TOTALS, receipts: 0 }, { committeeId: "C00812345" }), null, "no receipts, no summary");
  assert.deepEqual(Object.keys(M.fecMoneySummary({ receipts: 10 }, { committeeId: "C00812345" })), ["receipts", "committeeId", "source"], "absent fields stay absent, never zero");
  assert.equal(M.latestSummary([{ ...SUMMARY, coverageEnd: "2026-06-30" }, SUMMARY, null]).coverageEnd, "2026-10-14", "the latest report wins between principal committees");
});

await t("a federal candidate with no prior money total gets the FEC summary attached", () => {
  const { table, outcome } = M.mergeFecSummaries({}, new Map([["dana_quill", ROW]]), () => null);
  assert.deepEqual(outcome, { attached: ["dana_quill"], kept_existing: [] });
  assert.deepEqual(table.dana_quill, ROW);
  // It round-trips through the block the job writes.
  assert.deepEqual(M.readFecSummaryBlock(M.replaceFecSummaryBlock(FTM_SRC, table)), table);

  const before = boot({});
  assert.equal(before._pdxFinanceFiling("dana_quill"), null, "no money file before the run");
  const W = boot(table);
  const rec = W._pdxFinanceFiling("dana_quill");
  assert.equal(rec.totalRaised, 415384.72);
  assert.equal(rec.source, "https://www.fec.gov/data/committee/C00812345/");
  assert.deepEqual([rec.fecSummary.receipts, rec.fecSummary.disbursements, rec.fecSummary.cashOnHand, rec.fecSummary.coverageEnd], [415384.72, 1117401.09, 145957.81, "2026-10-14"]);
  assert.deepEqual(JSON.parse(JSON.stringify([rec.topDonors, rec.sectors, rec.funding])), [[], {}, null], "receipts only: nothing itemized is invented");

  // The existing chip reads it in its existing words and names the FEC as the source.
  const L = W.PDXFinanceLane;
  assert.equal(L.chipRead("dana_quill").state, "thin");
  const chip = L.letterheadChipHtml("dana_quill");
  assert.equal(visible(chip), "💰 Partial file · 1 item · FEC");
  assert.match(chip, /Transcribed from the FEC\./);
  assert.doesNotMatch(chip, /AIPAC|OpenSecrets/);
  assert.equal(W._pdxFunding("dana_quill").source, rec.source, "the money section links the same FEC page");
  // Not an itemized filing: the coverage numerator is unchanged.
  assert.deepEqual([...W._pdxFinanceIds()].sort(), [...before._pdxFinanceIds()].sort());
});

await t("a candidate who already has a newer total keeps the existing one", () => {
  const newer = { ...ROW, receipts: 999999, coverageEnd: "2026-11-01" };
  const older = { ...ROW, coverageEnd: "2026-06-30" };
  const r1 = M.mergeFecSummaries({ dana_quill: newer }, new Map([["dana_quill", ROW]]));
  assert.deepEqual(r1.outcome.kept_existing, ["dana_quill"]);
  assert.deepEqual(r1.table.dana_quill, newer, "the newer FEC row stands");
  assert.deepEqual(M.mergeFecSummaries({ dana_quill: older }, new Map([["dana_quill", ROW]])).table.dana_quill, ROW, "an older FEC row is refreshed");

  // A hand-verified filing on the profile: Mike Lee's 2022-cycle record.
  const base = boot({});
  const lee = base._pdxFinanceFiling("lee");
  assert.equal(lee.funding.cycle, "2022");
  const lee2022 = { ...ROW, name: "Mike Lee", coverageEnd: "2022-06-30" };
  assert.deepEqual(M.mergeFecSummaries({}, new Map([["lee", lee2022]]), () => lee).outcome.kept_existing, ["lee"], "the hand figure is newer");
  assert.equal(M.fecSummaryWins({ ...ROW, coverageEnd: "" }, [lee]), false, "an undated FEC report never replaces a figure");
  assert.equal(M.fecSummaryWins(ROW, [{ totalRaised: 5 }]), false, "an undated hand figure is never replaced");
  assert.equal(M.fecSummaryWins(ROW, [{ totalRaised: 5, funding: { asOf: "2026-11-02", cycle: "2026" } }]), false, "a newer asOf wins");

  // And at read time the shipped resolver applies the same rule.
  const W = boot({ lee: lee2022 });
  assert.equal(W._pdxFinanceFiling("lee").totalRaised, lee.totalRaised, "Lee's hand-verified record still reads");
  assert.equal(W.PDXFinanceLane.letterheadChipHtml("lee"), base.PDXFinanceLane.letterheadChipHtml("lee"), "Lee's chip is unchanged");
});

await t("state legislators and anyone not looked up via the FEC are untouched", () => {
  for (const o of ["State Senator (UT SD-3)", "State Representative · Utah HD 68", "Governor · Utah", "Utah State House Candidate", "Secretary of State"]) assert.equal(M.isFederalOffice(o), false, o);
  for (const o of ["U.S. House (MT-01) Candidate", "U.S. Senator · Utah", "U.S. Representative · KY"]) assert.equal(M.isFederalOffice(o), true, o);
  const prior = { other_person: { ...ROW, name: "Other" } };
  const { table } = M.mergeFecSummaries(prior, new Map([["dana_quill", ROW]]));
  assert.deepEqual(table.other_person, prior.other_person, "a row for someone not looked up is carried over as is");
  const W0 = boot({}), W = boot(table);
  for (const pid of ["john_johnson", "jason_thompson", "cox", "bking", "brian_king", "massie"]) {
    assert.deepEqual(JSON.parse(JSON.stringify(W._pdxFinanceFiling(pid))), JSON.parse(JSON.stringify(W0._pdxFinanceFiling(pid))), pid);
    assert.equal(W.PDXFinanceLane.letterheadChipHtml(pid), W0.PDXFinanceLane.letterheadChipHtml(pid), `${pid} chip`);
  }
  // The job selects the federal rows with the same rule, and fills the table only inside its FEC stage.
  assert.match(JOB_SRC, /const federal = live\.filter\(\(r\) => M\.isFederalOffice\(ids\.get\(r\.politician_id\)\.office\)\)/);
  const fecStage = JOB_SRC.slice(JOB_SRC.indexOf("// ── 1. FEC"), JOB_SRC.indexOf("// ── 2. Open States"));
  assert.equal((JOB_SRC.match(/fecMoney\.set\(/g) || []).length, 1);
  assert.match(fecStage, /fecMoney\.set\(/, "only the FEC stage records a summary");
  assert.match(fecStage, /await pool\(federal,/, "and only for the federal rows it looks up");
});

await t("the live cron still never calls the FEC API", () => {
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file) || !fs.existsSync(file)) return;
    seen.add(file);
    for (const m of fs.readFileSync(file, "utf8").matchAll(/(?:^|\n)\s*(?:import|export)\s[^;]*?from\s+["']([^"']+)["']/g)) if (m[1].startsWith(".")) walk(path.resolve(path.dirname(file), m[1]));
  };
  walk(path.join(root, "netlify/functions/raw-ingest-cron.mts"));
  const files = [...seen].map((f) => path.relative(root, f));
  assert.ok(files.includes("netlify/lib/raw-ingest-core.mjs"), "walked the cron's imports");
  assert.ok(!files.some((f) => /fec-money-summary|discover-raw-ingest-sources|ftm-data/.test(f)), `the cron loads none of it: ${files}`);
  for (const f of files) assert.doesNotMatch(R(f), /api\.open\.fec\.gov|FEC_API_KEY|fec-money-summary/, f);
  // The summary rules are pure and the shipped finance data never calls the FEC.
  assert.doesNotMatch(R("netlify/lib/fec-money-summary.mjs"), /\bfetch\(|api\.open\.fec\.gov/);
  assert.doesNotMatch(FTM_SRC, /api\.open\.fec\.gov|\bfetch\(|XMLHttpRequest/);
  // The job is the one place that reads the FEC's totals.
  assert.match(JOB_SRC, /api\.open\.fec\.gov\/v1\/committee\/\$\{pc\.committee_id\}\/totals\//);
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log(`✓ FEC money summary: ${passed} passed, 0 failed`);
