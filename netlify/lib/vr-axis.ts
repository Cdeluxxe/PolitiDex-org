// ─────────────────────────────────────────────────────────────────────────────
// vr-axis.ts — a measure's dominant category, for the Voting Record API
// ─────────────────────────────────────────────────────────────────────────────
// The retired leaf `isPrimary` flag is not read here or anywhere downstream. What
// a measure is mostly about is the topic category holding the most of its mapped
// leaf issues. Keys in a winning category are on-axis; keys outside it are
// off-axis (the rider read). A tie has no winner: every tied category counts as
// on-axis, and nothing — not weight, not party, not order — breaks it.
//   Same count as window._pdxMeasureAxis in stance-helpers.js; the key → category
// table is generated from issue-map.js (scripts/gen-issue-core-categories.mjs).
import table from "../../db/issue-core-categories.json" with { type: "json" };

const CATEGORY_OF: Record<string, string> = (table as { categoryOf: Record<string, string> }).categoryOf;

export function categoryOf(issueKey: string): string {
  return CATEGORY_OF[issueKey] ?? `issue:${issueKey}`;
}

export interface MeasureAxis {
  winner: string | null;
  split: boolean;
  winners: string[];
  onAxisKeys: string[];
  offAxisKeys: string[];
}

export function measureAxis(issueKeys: readonly string[]): MeasureAxis {
  const keys = [...new Set(issueKeys.filter(Boolean))];
  const count = new Map<string, number>();
  for (const k of keys) count.set(categoryOf(k), (count.get(categoryOf(k)) ?? 0) + 1);
  let top = 0;
  for (const n of count.values()) if (n > top) top = n;
  const winners = [...count.keys()].filter((c) => top > 0 && count.get(c) === top).sort();
  const win = new Set(winners);
  return {
    winner: winners.length === 1 ? winners[0] : null,
    split: winners.length > 1,
    winners,
    onAxisKeys: keys.filter((k) => win.has(categoryOf(k))),
    offAxisKeys: keys.filter((k) => !win.has(categoryOf(k))),
  };
}
