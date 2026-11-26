// ─────────────────────────────────────────────────────────────────────────────
// locked-ground-truth.mjs — every locked, hand-reviewed stance label, as one index
// ─────────────────────────────────────────────────────────────────────────────
// The ingest job used to check scored reads against ONE ground-truth record
// (Talarico on the cost of living). This module loads every locked record in
// db/stance-ground-truth-*.json — the per-topic Massie / Sanders / Talarico
// files (with the cost-of-living file's `additional_records`), the Abbott and
// Hinojosa cost-of-living files, the 77 expansion records and the 27 oppose /
// mixed records for six more politicians (Boebert, Owens, Cole, Thompson, Lee,
// Trump; 2026-11-26) — and indexes them by "<politician_id>|<issue key>".
//
// HOW IT IS USED (read-only; this module never writes a label):
//   · evidence-locker-core.mjs lockerDecision() looks up the candidate's pair:
//     a clear read (support / oppose) that differs from the locked position is
//     not written to the Evidence Locker (a mention carries no position and may
//     still be written, as before).
//   · stated-positions-core.mjs drops Locker entries that contradict a locked
//     label before promotion, and never serves a pipeline card whose stance
//     contradicts one — so an item written before this check cannot surface.
// A locked "mixed" label is contradicted by any single-side read.
//
// Static JSON imports (no directory read at run time), so the bundled functions
// carry the labels with them. scripts/test-locked-ground-truth.mjs fails when a
// locked ground-truth file on disk is not imported here.
// ─────────────────────────────────────────────────────────────────────────────

import gt0 from "../../db/stance-ground-truth-abbott-cost-of-living.json" with { type: "json" };
import gt1 from "../../db/stance-ground-truth-expansion-2026-11.json" with { type: "json" };
import gt2 from "../../db/stance-ground-truth-hinojosa-cost-of-living.json" with { type: "json" };
import gt3 from "../../db/stance-ground-truth-massie-abolish-education.json" with { type: "json" };
import gt4 from "../../db/stance-ground-truth-massie-abortion.json" with { type: "json" };
import gt5 from "../../db/stance-ground-truth-massie-border.json" with { type: "json" };
import gt6 from "../../db/stance-ground-truth-massie-cbdc.json" with { type: "json" };
import gt7 from "../../db/stance-ground-truth-massie-checks-on-executive.json" with { type: "json" };
import gt8 from "../../db/stance-ground-truth-massie-disclosure.json" with { type: "json" };
import gt9 from "../../db/stance-ground-truth-massie-earmarks.json" with { type: "json" };
import gt10 from "../../db/stance-ground-truth-massie-epstein-files.json" with { type: "json" };
import gt11 from "../../db/stance-ground-truth-massie-federal-reserve.json" with { type: "json" };
import gt12 from "../../db/stance-ground-truth-massie-federal-spending.json" with { type: "json" };
import gt13 from "../../db/stance-ground-truth-massie-food-freedom.json" with { type: "json" };
import gt14 from "../../db/stance-ground-truth-massie-foreign-aid.json" with { type: "json" };
import gt15 from "../../db/stance-ground-truth-massie-free-speech.json" with { type: "json" };
import gt16 from "../../db/stance-ground-truth-massie-medical-freedom.json" with { type: "json" };
import gt17 from "../../db/stance-ground-truth-massie-school-choice.json" with { type: "json" };
import gt18 from "../../db/stance-ground-truth-massie-second-amendment.json" with { type: "json" };
import gt19 from "../../db/stance-ground-truth-massie-surveillance.json" with { type: "json" };
import gt20 from "../../db/stance-ground-truth-massie-tariff-authority.json" with { type: "json" };
import gt21 from "../../db/stance-ground-truth-sanders-child-care.json" with { type: "json" };
import gt22 from "../../db/stance-ground-truth-sanders-climate.json" with { type: "json" };
import gt23 from "../../db/stance-ground-truth-sanders-college-cost.json" with { type: "json" };
import gt24 from "../../db/stance-ground-truth-sanders-corporate-accountability.json" with { type: "json" };
import gt25 from "../../db/stance-ground-truth-sanders-drug-prices.json" with { type: "json" };
import gt26 from "../../db/stance-ground-truth-sanders-housing.json" with { type: "json" };
import gt27 from "../../db/stance-ground-truth-sanders-military-spending.json" with { type: "json" };
import gt28 from "../../db/stance-ground-truth-sanders-money-in-politics.json" with { type: "json" };
import gt29 from "../../db/stance-ground-truth-sanders-paid-leave.json" with { type: "json" };
import gt30 from "../../db/stance-ground-truth-sanders-reproductive-rights.json" with { type: "json" };
import gt31 from "../../db/stance-ground-truth-sanders-social-security.json" with { type: "json" };
import gt32 from "../../db/stance-ground-truth-sanders-trade.json" with { type: "json" };
import gt33 from "../../db/stance-ground-truth-sanders-wealth-tax.json" with { type: "json" };
import gt34 from "../../db/stance-ground-truth-sanders-workers-wages.json" with { type: "json" };
import gt35 from "../../db/stance-ground-truth-talarico-cannabis.json" with { type: "json" };
import gt36 from "../../db/stance-ground-truth-talarico-child-care.json" with { type: "json" };
import gt37 from "../../db/stance-ground-truth-talarico-cost-of-living.json" with { type: "json" };
import gt38 from "../../db/stance-ground-truth-talarico-drug-prices.json" with { type: "json" };
import gt39 from "../../db/stance-ground-truth-talarico-healthcare-access.json" with { type: "json" };
import gt40 from "../../db/stance-ground-truth-talarico-money-in-politics.json" with { type: "json" };
import gt41 from "../../db/stance-ground-truth-talarico-paid-leave.json" with { type: "json" };
import gt42 from "../../db/stance-ground-truth-talarico-redistricting.json" with { type: "json" };
import gt43 from "../../db/stance-ground-truth-talarico-reproductive-rights.json" with { type: "json" };
import gt44 from "../../db/stance-ground-truth-talarico-social-security.json" with { type: "json" };
import gt45 from "../../db/stance-ground-truth-talarico-stock-trading.json" with { type: "json" };
import gt46 from "../../db/stance-ground-truth-talarico-supreme-court.json" with { type: "json" };
import gt47 from "../../db/stance-ground-truth-talarico-term-limits.json" with { type: "json" };
import gt48 from "../../db/stance-ground-truth-talarico-voting-access.json" with { type: "json" };
import gt49 from "../../db/stance-ground-truth-talarico-workers-wages.json" with { type: "json" };
import gt50 from "../../db/stance-ground-truth-six-oppose-mixed-2026-11.json" with { type: "json" };

/** File name → parsed file, for the coverage test. */
export const GROUND_TRUTH_FILES = {
  "stance-ground-truth-abbott-cost-of-living.json": gt0,
  "stance-ground-truth-expansion-2026-11.json": gt1,
  "stance-ground-truth-hinojosa-cost-of-living.json": gt2,
  "stance-ground-truth-massie-abolish-education.json": gt3,
  "stance-ground-truth-massie-abortion.json": gt4,
  "stance-ground-truth-massie-border.json": gt5,
  "stance-ground-truth-massie-cbdc.json": gt6,
  "stance-ground-truth-massie-checks-on-executive.json": gt7,
  "stance-ground-truth-massie-disclosure.json": gt8,
  "stance-ground-truth-massie-earmarks.json": gt9,
  "stance-ground-truth-massie-epstein-files.json": gt10,
  "stance-ground-truth-massie-federal-reserve.json": gt11,
  "stance-ground-truth-massie-federal-spending.json": gt12,
  "stance-ground-truth-massie-food-freedom.json": gt13,
  "stance-ground-truth-massie-foreign-aid.json": gt14,
  "stance-ground-truth-massie-free-speech.json": gt15,
  "stance-ground-truth-massie-medical-freedom.json": gt16,
  "stance-ground-truth-massie-school-choice.json": gt17,
  "stance-ground-truth-massie-second-amendment.json": gt18,
  "stance-ground-truth-massie-surveillance.json": gt19,
  "stance-ground-truth-massie-tariff-authority.json": gt20,
  "stance-ground-truth-sanders-child-care.json": gt21,
  "stance-ground-truth-sanders-climate.json": gt22,
  "stance-ground-truth-sanders-college-cost.json": gt23,
  "stance-ground-truth-sanders-corporate-accountability.json": gt24,
  "stance-ground-truth-sanders-drug-prices.json": gt25,
  "stance-ground-truth-sanders-housing.json": gt26,
  "stance-ground-truth-sanders-military-spending.json": gt27,
  "stance-ground-truth-sanders-money-in-politics.json": gt28,
  "stance-ground-truth-sanders-paid-leave.json": gt29,
  "stance-ground-truth-sanders-reproductive-rights.json": gt30,
  "stance-ground-truth-sanders-social-security.json": gt31,
  "stance-ground-truth-sanders-trade.json": gt32,
  "stance-ground-truth-sanders-wealth-tax.json": gt33,
  "stance-ground-truth-sanders-workers-wages.json": gt34,
  "stance-ground-truth-talarico-cannabis.json": gt35,
  "stance-ground-truth-talarico-child-care.json": gt36,
  "stance-ground-truth-talarico-cost-of-living.json": gt37,
  "stance-ground-truth-talarico-drug-prices.json": gt38,
  "stance-ground-truth-talarico-healthcare-access.json": gt39,
  "stance-ground-truth-talarico-money-in-politics.json": gt40,
  "stance-ground-truth-talarico-paid-leave.json": gt41,
  "stance-ground-truth-talarico-redistricting.json": gt42,
  "stance-ground-truth-talarico-reproductive-rights.json": gt43,
  "stance-ground-truth-talarico-social-security.json": gt44,
  "stance-ground-truth-talarico-stock-trading.json": gt45,
  "stance-ground-truth-talarico-supreme-court.json": gt46,
  "stance-ground-truth-talarico-term-limits.json": gt47,
  "stance-ground-truth-talarico-voting-access.json": gt48,
  "stance-ground-truth-talarico-workers-wages.json": gt49,
  "stance-ground-truth-six-oppose-mixed-2026-11.json": gt50,
};

/** The records one file holds: a single record (plus `additional_records`) or `{ records: [...] }`. */
export function recordsOf(file) {
  if (!file || typeof file !== "object") return [];
  if (Array.isArray(file.records)) return file.records;
  return [file, ...(Array.isArray(file.additional_records) ? file.additional_records : [])];
}

export const isLocked = (r) => !!r && r.locked === true && (r.status == null || r.status === "active");

/** Every locked record, in file order. */
export const LOCKED_GROUND_TRUTH = Object.freeze(Object.values(GROUND_TRUTH_FILES).flatMap(recordsOf).filter(isLocked));

export const pairKey = (pid, topic) => `${pid}|${topic}`;

/** records → Map("<pid>|<topic>" → record). Throws on two locked labels for one pair that disagree. */
export function groundTruthIndex(records = LOCKED_GROUND_TRUTH) {
  const m = new Map();
  for (const r of records) {
    const k = pairKey(r.politician_id, r.topic);
    const was = m.get(k);
    if (was && was.position !== r.position) throw new Error(`locked ground truth disagrees with itself on ${k}: ${was.position} vs ${r.position}`);
    if (!was) m.set(k, r);
  }
  return m;
}

export const LOCKED_GROUND_TRUTH_INDEX = groundTruthIndex();

/**
 * The locked record for one pair, or null. `gt` may be an index (Map), an
 * array of records, or a single record (the older one-record form).
 */
export function lockedLabelFor(gt, pid, topic) {
  if (!gt) return null;
  if (gt instanceof Map) return gt.get(pairKey(pid, topic)) || null;
  if (Array.isArray(gt)) return gt.find((r) => r.politician_id === pid && r.topic === topic) || null;
  return gt.politician_id === pid && gt.topic === topic ? gt : null;
}

/**
 * Does a read contradict a locked label? Only a clear read (support / oppose)
 * can: "no clear position" and "mixed" reads are never stances on their own.
 * Returns the locked record it contradicts, or null.
 */
export function contradictsLockedLabel(gt, pid, topic, position) {
  if (position !== "support" && position !== "oppose") return null;
  const r = lockedLabelFor(gt, pid, topic);
  return r && r.position !== position ? r : null;
}
