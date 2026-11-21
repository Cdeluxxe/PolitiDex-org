// ─────────────────────────────────────────────────────────────────────────────
// RAW-INGEST SCOPE · the one switch that narrows the scheduled pipeline
// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT: OFF. INGEST_ALLOW_LIST is [] so every scheduled run plans from the
// whole roster (video / speech evidence included). It stays as a dormant
// option: put ids back in it (e.g. ["thomas_massie"]) to narrow the run.
//
// While INGEST_ALLOW_LIST holds ids, every scheduled raw-ingest-cron run plans,
// pulls, discovers, harvests and scores ONLY those politicians. Everyone else is
// skipped: nothing of theirs is fetched, nothing is written for them, and their
// existing raw records, Locker items, stated positions and frontier entries are
// left exactly as they are.
//
// TO LIFT THE RESTRICTION: set INGEST_ALLOW_LIST to [] (or null) — the default. No other code
// has to change — every consumer treats an empty list as "whole roster".
//
// Ids may be written in the public form ("thomas_massie"); INGEST_ID_ALIASES
// maps them to the id the ingest roster uses ("massie"). Both forms match.
// ─────────────────────────────────────────────────────────────────────────────

export const INGEST_ALLOW_LIST = [];

export const INGEST_ID_ALIASES = { thomas_massie: "massie" };

// Separate rotation-state key while scoped, so a scoped run never overwrites
// the whole-roster cycle position. Lifting the scope resumes that cycle as-is.
export const SCOPED_ROTATION_SUFFIX = ":scope:";

/** The allow-list as a Set of roster ids (both alias forms), or null when off. */
export function scopeIds(list = INGEST_ALLOW_LIST) {
  if (!Array.isArray(list) || !list.length) return null;
  const ids = new Set();
  for (const raw of list) {
    const id = String(raw || "").trim();
    if (!id) continue;
    ids.add(id);
    if (INGEST_ID_ALIASES[id]) ids.add(INGEST_ID_ALIASES[id]);
    for (const [from, to] of Object.entries(INGEST_ID_ALIASES)) if (to === id) ids.add(from);
  }
  return ids.size ? ids : null;
}

/** Whether one politician id is inside the scope (always true when off). */
export function inScope(ids, pid) {
  return !ids || ids.has(String(pid || ""));
}

/** Rows (roster entries, sources, discovered pages) inside the scope. */
export function filterToScope(ids, rows) {
  if (!ids || !Array.isArray(rows)) return rows;
  return rows.filter((r) => inScope(ids, r && r.politician_id));
}

/** The rotation-state key for this scope (the base key when off). */
export function scopedRotationKey(baseKey, ids) {
  if (!ids) return baseKey;
  return baseKey + SCOPED_ROTATION_SUFFIX + [...ids].sort().join(",");
}

/** One run-log line naming the scope and what it skipped. */
export function scopeLine(ids, { rosterSize = 0, kept = 0, pulledOutside = 0 } = {}) {
  if (!ids) return "raw-ingest: scope — off (whole roster)";
  return `raw-ingest: scope — allow-list on (${[...ids].sort().join(", ")}) · ${kept} of ${rosterSize} roster politician(s) in scope, ${Math.max(0, rosterSize - kept)} skipped · ${pulledOutside} pull(s) for politicians outside the allow-list`;
}
