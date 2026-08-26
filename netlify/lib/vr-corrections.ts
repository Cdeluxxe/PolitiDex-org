// ─────────────────────────────────────────────────────────────────────────────
// vr-corrections — the read side of the correction path
// ─────────────────────────────────────────────────────────────────────────────
// Loads APPROVED rows from vr_vote_correction_overlays and lays them over member-
// vote rows on their way out of netlify/functions/voting-record.mts. The stored cell
// is never touched. See the migration
// (netlify/database/migrations/20260925000000_create_vr_vote_correction_overlays.sql)
// for why an overlay and not an UPDATE.
//
// THE FIVE REFUSALS, ENFORCED HERE AS WELL AS IN THE DATABASE. The CHECK
// constraints are the floor, not the ceiling: this module re-checks every one of
// them at read time, because a table can be seeded by a migration, a psql session
// or a future writer that has not read this file.
//
//   1. status must be exactly 'approved'. Pending, rejected and superseded rows are
//      not loaded at all.
//   2. THE MATCH GUARD. A correction applies only while the cell still holds
//      storedValue — the value the reviewer examined. If the underlying value has
//      changed since (a re-ingest, a later migration), the correction does NOT
//      apply; the row is emitted uncorrected and flagged stale so a moderator can
//      see that the review needs redoing. This is the difference between a
//      correction and a standing instruction.
//   3. VOCABULARY. proposedValue must be in the shipped vocabulary of its column. A
//      value outside it is dropped, not coerced.
//   4. IT CHANGES SOMETHING. storedValue === proposedValue is dropped as a no-op.
//   5. IT NEVER INVENTS. A correction can only move a cell that exists between
//      values that exist. There is no branch here that creates a row, fills an
//      absent vote, or supplies a direction — a missing formal read stays missing.
//
// AND ONE MORE, WHICH IS THE REASON THE MODULE IS SHAPED THIS WAY: if the table is
// not there, reads are unchanged. The overlay table is applied by the platform on
// deploy, so between shipping this code and that migration landing the loader must
// be a silent no-op rather than a 500 on the person file. loadCorrections() catches,
// logs once, and returns an empty overlay. The formal record renders without it.
//
// DISCLOSURE IS THE PRODUCT. An applied correction attaches a `correction` object to
// the row — from, to, reason, source, when, and that a moderator approved it — so
// the client can say the cell was corrected rather than silently showing a different
// letter than the clerk's page does. Nothing here hides a change.

import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { vrVoteCorrectionOverlays } from "../../db/schema.js";

// The shipped vocabulary of each correctable column, from db/schema.ts.
// '' is the encoding of SQL NULL for the nullable is_party column.
export const CORRECTABLE_FIELDS = ["position", "is_party"] as const;
export const FIELD_VOCABULARY: Record<string, readonly string[]> = {
  position: ["yea", "nay", "present", "not_voting"],
  is_party: ["with_party", "against_party", ""],
};

export type CorrectableField = (typeof CORRECTABLE_FIELDS)[number];

export type CorrectionRow = {
  id: number;
  rollcallId: number;
  politicianId: string;
  field: string;
  storedValue: string;
  proposedValue: string;
  reason: string;
  sourceUrl: string;
  sourceLabel: string | null;
  reviewedAt: Date | string | null;
};

export type Overlay = {
  /** keyed `${rollcallId}:${politicianId}:${field}` */
  byCell: Map<string, CorrectionRow>;
  /** true when the table itself could not be read (not applied yet, or an error) */
  unavailable: boolean;
  /** how many approved rows were loaded, after the read-time refusals */
  loaded: number;
  /** how many approved rows were dropped by a read-time refusal, and why */
  dropped: { id: number; why: string }[];
};

export const emptyOverlay = (unavailable = false): Overlay => ({
  byCell: new Map(),
  unavailable,
  loaded: 0,
  dropped: [],
});

const cellKey = (rollcallId: number, politicianId: string, field: string) =>
  `${rollcallId}:${politicianId}:${field}`;

// Normalise a stored cell to the string form the overlay compares against: SQL NULL
// and undefined both become ''. This is the ONLY place the NULL encoding is decided,
// so the match guard and the vocabulary check cannot disagree about it.
export const cellValue = (v: unknown): string =>
  v === null || v === undefined ? "" : String(v);

// Read-time validity. Returns '' when the row is usable, or the reason it is not.
export function refuse(row: CorrectionRow): string {
  if (!CORRECTABLE_FIELDS.includes(row.field as CorrectableField)) {
    return `field "${row.field}" is not correctable`;
  }
  const vocab = FIELD_VOCABULARY[row.field] || [];
  if (!vocab.includes(row.proposedValue)) {
    return `proposed value "${row.proposedValue}" is outside the ${row.field} vocabulary`;
  }
  if (!vocab.includes(row.storedValue)) {
    return `stored value "${row.storedValue}" is outside the ${row.field} vocabulary`;
  }
  if (row.storedValue === row.proposedValue) return "proposes no change";
  if (!row.reason || row.reason.trim().length < 12) return "no reason recorded";
  if (!/^https?:\/\//i.test(row.sourceUrl || "")) return "no citable source recorded";
  return "";
}

// Load every APPROVED correction for the given politicians. Never throws: a missing
// table (the migration has not been applied yet) or any read error yields an empty
// overlay marked unavailable, and the caller renders the record without it.
export async function loadCorrections(politicianIds: string[]): Promise<Overlay> {
  const ids = [...new Set((politicianIds || []).filter(Boolean))];
  if (!ids.length) return emptyOverlay();
  let rows: CorrectionRow[];
  try {
    rows = (await db
      .select({
        id: vrVoteCorrectionOverlays.id,
        rollcallId: vrVoteCorrectionOverlays.rollcallId,
        politicianId: vrVoteCorrectionOverlays.politicianId,
        field: vrVoteCorrectionOverlays.field,
        storedValue: vrVoteCorrectionOverlays.storedValue,
        proposedValue: vrVoteCorrectionOverlays.proposedValue,
        reason: vrVoteCorrectionOverlays.reason,
        sourceUrl: vrVoteCorrectionOverlays.sourceUrl,
        sourceLabel: vrVoteCorrectionOverlays.sourceLabel,
        reviewedAt: vrVoteCorrectionOverlays.reviewedAt,
      })
      .from(vrVoteCorrectionOverlays)
      .where(
        and(
          eq(vrVoteCorrectionOverlays.status, "approved"),
          inArray(vrVoteCorrectionOverlays.politicianId, ids)
        )
      )) as CorrectionRow[];
  } catch (e: any) {
    // Expected before the migration lands. Logged, not surfaced: an uncorrected
    // record is the honest fallback, and a 500 on the person file is not.
    console.warn("vr-corrections: overlay unavailable —", e?.message || String(e));
    return emptyOverlay(true);
  }

  const out = emptyOverlay();
  for (const row of rows) {
    const why = refuse(row);
    if (why) {
      out.dropped.push({ id: row.id, why });
      continue;
    }
    // Last approved wins only in the impossible case of two rows for one cell; the
    // partial unique index makes that unreachable, and this keeps it deterministic.
    out.byCell.set(cellKey(row.rollcallId, row.politicianId, row.field), row);
    out.loaded++;
  }
  return out;
}

export type VoteRowish = {
  rollcallId?: number | null;
  politicianId?: string | null;
  position?: string | null;
  isParty?: string | null;
  [k: string]: unknown;
};

// Lay the overlay over one row. Returns a NEW object when something changed and the
// same object when nothing did, so callers can map without copying the whole page.
//
// THE MATCH GUARD LIVES HERE. A correction whose storedValue no longer matches the
// cell is not applied; the row keeps its stored value and gains
// `correctionStale`, which is a signal to a moderator that the review has to be
// redone against the new value — never a licence to apply it anyway.
export function applyCorrection<T extends VoteRowish>(
  row: T,
  overlay: Overlay,
  politicianId?: string
): T {
  if (!overlay || !overlay.byCell.size) return row;
  const pid = String(row.politicianId || politicianId || "");
  const rid = Number(row.rollcallId || 0);
  if (!pid || !rid) return row;

  let next: any = null;
  const applied: any[] = [];
  const stale: any[] = [];

  for (const field of CORRECTABLE_FIELDS) {
    const c = overlay.byCell.get(cellKey(rid, pid, field));
    if (!c) continue;
    const col = field === "position" ? "position" : "isParty";
    const current = cellValue((row as any)[col]);
    if (current !== c.storedValue) {
      stale.push({
        field,
        reviewedValue: c.storedValue,
        currentValue: current,
        note: "the cell no longer holds the value this correction was reviewed against",
      });
      continue;
    }
    next = next || { ...row };
    next[col] = c.proposedValue === "" ? null : c.proposedValue;
    applied.push({
      field,
      from: c.storedValue,
      to: c.proposedValue,
      reason: c.reason,
      sourceUrl: c.sourceUrl,
      sourceLabel: c.sourceLabel || "",
      correctedAt: c.reviewedAt || null,
      by: "moderator",
    });
  }

  if (!applied.length && !stale.length) return row;
  next = next || { ...row };
  // DISCLOSURE, not a silent edit: the row carries what changed and why.
  if (applied.length) next.corrections = applied;
  if (stale.length) next.correctionsStale = stale;
  return next as T;
}

// Map a page of rows through the overlay in one call.
export function applyCorrections<T extends VoteRowish>(
  rows: T[],
  overlay: Overlay,
  politicianId?: string
): T[] {
  if (!overlay || !overlay.byCell.size) return rows;
  return rows.map((r) => applyCorrection(r, overlay, politicianId));
}

// A one-line summary for the payload, so a client can disclose that the record it is
// showing includes corrections without walking every row. Counts only — this is not
// a quality score and it does not grade a file.
export function correctionSummary(rows: VoteRowish[]): {
  corrected: number;
  stale: number;
} {
  let corrected = 0;
  let stale = 0;
  for (const r of rows || []) {
    if (Array.isArray((r as any).corrections) && (r as any).corrections.length) corrected++;
    if (Array.isArray((r as any).correctionsStale) && (r as any).correctionsStale.length) stale++;
  }
  return { corrected, stale };
}
