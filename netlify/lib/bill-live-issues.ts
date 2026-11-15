// ─────────────────────────────────────────────────────────────────────────────
// Live bill → issue keys — the overlay bill pages and person bill lists share
// ─────────────────────────────────────────────────────────────────────────────
// /b/ documents and person bill lists were built only from the migration replay
// (scripts/gen-bill-docs.mjs → db/bill-docs.json), so a mapping that lives only in
// the database, such as a reviewed automatic proposal, did not show until someone
// wrote it into a migration and regenerated the docs.
//
// The live half is GET /api/voting-record/measures?view=bill-issue-keys: one
// "<sitting>|<number>" → [issue keys] table read from vr_measure_issues, VERDICT-
// BEARING ROWS ONLY (curated and reviewed; proposed and rejected never), memoised
// on the same mapping version that names the member packs (vr-pack.ts
// mappingVersion()), so a review or rejection changes the table on the next read.
//
// THE MERGE IS ADDITIVE. The snapshot stays the source of every label and every
// effect line it holds; the live table can only ADD keys to it. Every snapshot key
// is a curated row the migrations wrote (proposals are never in a migration), so a
// curated mapping prints exactly as before, and no live row can take one away. A
// key with no issue label is never printed, the same rule the generator applies.
// A live-only key has no stored effect line, so it is listed bare, which is how
// the page already prints any issue that has no line.
//
// No imports on purpose: the edge (Deno), the Function, the browser copy in
// person-bills.js and the tests all run this same logic.

export type DocIssue = { issue: string; key: string; line: string };

export type LiveBillIssues = {
  mappingVersion: string;
  bills: Record<string, string[]>;
};

const KEY_RE = /^[A-Za-z0-9_]+$/;

export function billKey(sitting: string, number: string): string {
  return `${String(sitting || "").trim()}|${String(number || "").replace(/\s+/g, " ").trim()}`;
}

// Look a bill up in the live table: the sitting as written, then upper-cased (a
// state session code is case-insensitive in an address, as in billDocFor).
export function liveKeysFor(live: LiveBillIssues | null | undefined, sitting: string, number: string): string[] | null {
  if (!live || !live.bills) return null;
  const a = live.bills[billKey(sitting, number)];
  if (a) return a;
  const b = live.bills[billKey(String(sitting || "").toUpperCase(), number)];
  return b || null;
}

// Snapshot issues ∪ live keys, in the snapshot's own order (by label).
export function mergeDocIssues(
  snapshot: DocIssue[],
  liveKeys: string[] | null | undefined,
  labelFor: (key: string) => string
): DocIssue[] {
  if (!liveKeys || !liveKeys.length) return snapshot;
  const have = new Set(snapshot.map((x) => x.key).filter(Boolean));
  const added: DocIssue[] = [];
  for (const k of liveKeys) {
    if (typeof k !== "string" || !KEY_RE.test(k) || have.has(k)) continue;
    const issue = labelFor(k);
    if (!issue) continue;
    have.add(k);
    added.push({ issue, key: k, line: "" });
  }
  if (!added.length) return snapshot;
  return [...snapshot, ...added].sort((p, q) => p.issue.localeCompare(q.issue));
}

// ── The live table, from mapping rows (the Function's half) ──────────────────
// One row per (measure, issue) pair joined with its measure. The Function's query
// already filters to verdict-bearing rows in SQL; this filters again so the table
// cannot carry a proposal or a rejected row even if a caller forgets to.
export type LiveMappingRow = {
  sitting: string;
  number: string | null;
  sourceUrl: string | null;
  issueKey: string;
  reviewStatus?: string | null;
};

const HIDDEN_STATUSES = new Set(["proposed", "rejected"]);

export function liveBillTable(
  rows: LiveMappingRow[],
  isKnownKey: (k: string) => boolean
): Record<string, string[]> {
  const sets = new Map<string, Set<string>>();
  for (const r of rows) {
    if (HIDDEN_STATUSES.has(String(r.reviewStatus ?? "curated"))) continue;
    if (!r.sourceUrl || !r.number || !r.sitting || !KEY_RE.test(r.issueKey) || !isKnownKey(r.issueKey)) continue;
    const key = billKey(r.sitting, r.number);
    const set = sets.get(key) ?? new Set<string>();
    set.add(r.issueKey);
    sets.set(key, set);
  }
  const bills: Record<string, string[]> = {};
  for (const key of [...sets.keys()].sort()) bills[key] = [...sets.get(key)!].sort();
  return bills;
}
