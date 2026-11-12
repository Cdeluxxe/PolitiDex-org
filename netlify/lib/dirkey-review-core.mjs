// ═══════════════════════════════════════════════════════════════════════════
// dirkey-review-core.mjs — finishing a review on an automatic directional-key
// row (person-directional-keys-auto.json)
// ────────────────────────────────────────────────────────────────────────────
// The second-model check (dirkey-verify-core.mjs) tags a row `needs_review:
// true`. When a person has looked at it, markReviewed writes an internal
// `reviewed` object on the row and clears the tag:
//   reviewed: { reviewed: true, reviewed_at: "YYYY-MM-DD", note?: "one line" }
// Only a row that is currently tagged (or was already reviewed) can be marked,
// so a reviewed row is always one that was flagged. reopenReview puts the tag
// back and removes the object. The row's own read (position, confidence,
// quote, sources, bill) is never changed.
//
// WHAT THE PAGE SEES. person-directional-keys.js turns these two fields into a
// per-row label in the automatic section only — publicStatus below is the same
// rule — and nothing else: the note, the date and the object are never shown.
//   needs_review: true            → "Under review"
//   reviewed.reviewed, not tagged → "Cross-checked"
//   neither                       → no label
//
// Pure: scripts/review-dirkey-auto.mjs reads and writes the file.
// ═══════════════════════════════════════════════════════════════════════════
import { reviewQueue } from "./dirkey-verify-core.mjs";

export const NOTE_MAX = 200;
export const STATUS_LABELS = Object.freeze({ under_review: "Under review", cross_checked: "Cross-checked" });

/** The public label for a row: "under_review", "cross_checked" or null. */
export function publicStatus(row) {
  if (!row) return null;
  if (row.needs_review === true) return "under_review";
  if (row.reviewed && row.reviewed.reviewed === true) return "cross_checked";
  return null;
}

const day = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) throw new Error("reviewed_at is not a date");
  return x.toISOString().slice(0, 10);
};
const cleanNote = (s) => String(s ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, NOTE_MAX);

/** Find a row: { pid, row: "stance" | "bill_match", key, bill? } → { list, index } or an error. */
function locate(table, { pid, row = "stance", key, bill = "" }) {
  const p = table?.people?.[pid];
  if (!p) return { error: `no automatic person "${pid}"` };
  if (row !== "stance" && row !== "bill_match") return { error: `row must be "stance" or "bill_match"` };
  const list = row === "stance" ? "stances" : "mappings";
  const rows = p[list] || [];
  const matches = rows.map((r, i) => [r, i]).filter(([r]) => r.key === key && (row === "stance" || !bill || r.bill === bill || r.name === bill));
  if (!matches.length) return { error: `no ${row} row on "${key}"${bill ? ` for ${bill}` : ""} for ${pid}` };
  if (matches.length > 1) return { error: `${matches.length} ${row} rows on "${key}" for ${pid}; name the bill` };
  return { list, index: matches[0][1] };
}

function withRow(table, pid, list, index, next) {
  const p = table.people[pid];
  const rows = p[list].slice();
  rows[index] = next;
  const people = { ...table.people, [pid]: { ...p, [list]: rows } };
  const out = { ...table, people };
  if (table.verify) {
    const queue = reviewQueue(out);
    out.verify = { ...table.verify, tagged_for_review: queue.length, review_queue: queue };
  }
  return out;
}

/**
 * Mark a tagged row reviewed: clear needs_review, write `reviewed`, refresh the
 * table's review queue. → { ok: true, table } | { ok: false, error }
 */
export function markReviewed(table, { pid, row = "stance", key, bill = "", note = "", at = new Date() } = {}) {
  const loc = locate(table, { pid, row, key, bill });
  if (loc.error) return { ok: false, error: loc.error };
  const cur = table.people[pid][loc.list][loc.index];
  if (cur.needs_review !== true && !(cur.reviewed && cur.reviewed.reviewed === true)) {
    return { ok: false, error: `${pid} ${key} is not tagged for review` };
  }
  let reviewed_at;
  try { reviewed_at = day(at); } catch (e) { return { ok: false, error: e.message }; }
  const n = cleanNote(note);
  const { needs_review: _drop, reviewed: _old, ...base } = cur;
  return { ok: true, table: withRow(table, pid, loc.list, loc.index, { ...base, reviewed: { reviewed: true, reviewed_at, ...(n ? { note: n } : {}) } }) };
}

/** Put a reviewed row back under review. → { ok: true, table } | { ok: false, error } */
export function reopenReview(table, { pid, row = "stance", key, bill = "" } = {}) {
  const loc = locate(table, { pid, row, key, bill });
  if (loc.error) return { ok: false, error: loc.error };
  const cur = table.people[pid][loc.list][loc.index];
  if (!(cur.reviewed && cur.reviewed.reviewed === true)) return { ok: false, error: `${pid} ${key} has not been reviewed` };
  const { reviewed: _drop, ...base } = cur;
  return { ok: true, table: withRow(table, pid, loc.list, loc.index, { ...base, needs_review: true }) };
}
