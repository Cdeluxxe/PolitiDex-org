// ─────────────────────────────────────────────────────────────────────────────
// RAW-INGEST WORD GAP · pull pages that can fill Word vs Action gaps first
// ─────────────────────────────────────────────────────────────────────────────
// Word vs Action tests a politician's WORD (stated positions) against their
// ACTION (the formal record: roll-call votes, sponsorships, formal acts). An
// issue with a formal record but no stated position is a GAP: there is action
// to test but no word to test it against.
//
// This module only changes the ORDER of a politician's pull list:
//   rank 0 · GAP      — the page's expected topic (or its harvested topic, for a
//                       frontier page) is a gap issue for that politician
//   rank 1 · NEUTRAL  — anything else (also every page when nothing is known)
//   rank 2 · COVERED  — every topic the page works on already has a stated
//                       position (still allowed, just pulled later)
// The sort is stable, so ties keep the order the planner gave them.
//
// It never filters, scores, promotes or writes anything. Discovery, harvest,
// scoring, promotion, Word vs Action and the allow-list are untouched: the
// gaps are only loaded for politicians the run is already allowed to plan.
// ─────────────────────────────────────────────────────────────────────────────

export const GAP_RANK = 0;
export const NEUTRAL_RANK = 1;
export const COVERED_RANK = 2;

/**
 * Build the per-politician gap index from raw lists.
 * `formal` and `stated` map pid → iterable of issue keys.
 * Returns { pid: { gap: Set, stated: Set } } (only pids with something known).
 */
export function buildWordGaps({ formal = {}, stated = {} } = {}) {
  const out = {};
  const pids = new Set([...Object.keys(formal || {}), ...Object.keys(stated || {})]);
  for (const pid of pids) {
    const st = new Set([...(stated?.[pid] || [])].map(String).filter(Boolean));
    const gap = new Set([...(formal?.[pid] || [])].map(String).filter((k) => k && !st.has(k)));
    if (gap.size || st.size) out[pid] = { gap, stated: st };
  }
  return out;
}

/**
 * Topics a page is expected to produce stances on: its filed topic plus any
 * paired issues. For a frontier page `topic` IS the harvested topic (the one
 * its link text and URL slug pointed to when it was harvested).
 */
export function expectedTopics(src) {
  const t = [src?.topic, ...(Array.isArray(src?.issue_pairs) ? src.issue_pairs : [])];
  return [...new Set(t.filter(Boolean).map(String))];
}

/** One page's rank for its politician (see header). */
export function wordGapRank(src, wordGaps) {
  const g = wordGaps && src ? wordGaps[src.politician_id] : null;
  if (!g) return NEUTRAL_RANK;
  const topics = expectedTopics(src);
  if (!topics.length) return NEUTRAL_RANK;
  if (topics.some((t) => g.gap.has(t))) return GAP_RANK;
  if (topics.every((t) => g.stated.has(t))) return COVERED_RANK;
  return NEUTRAL_RANK;
}

/** Stable sort of pages by word-gap rank (the input order breaks ties). */
export function preferWordGaps(pages, wordGaps) {
  if (!wordGaps || !Array.isArray(pages) || pages.length < 2) return pages;
  return pages
    .map((s, i) => ({ s, i, r: wordGapRank(s, wordGaps) }))
    .sort((a, b) => (a.r - b.r) || (a.i - b.i))
    .map((x) => x.s);
}

/**
 * Reorder a mixed pull list so each politician's own pages are in word-gap
 * order, while every politician keeps the slots they already held. Nobody is
 * moved ahead of anybody else; only pages within one politician swap places.
 */
export function orderPullListByWordGap(sources, wordGaps) {
  if (!wordGaps || !Array.isArray(sources)) return sources;
  const byPid = new Map();
  sources.forEach((s, i) => {
    const pid = s?.politician_id;
    if (!wordGaps[pid]) return;
    if (!byPid.has(pid)) byPid.set(pid, []);
    byPid.get(pid).push(i);
  });
  const out = [...sources];
  for (const idx of byPid.values()) {
    const sorted = preferWordGaps(idx.map((i) => sources[i]), wordGaps);
    idx.forEach((slot, k) => { out[slot] = sorted[k]; });
  }
  return out;
}

/** One run-log line per politician with gap info. */
export function wordGapLine(wordGaps, sources = []) {
  const pids = Object.keys(wordGaps || {}).sort();
  if (!pids.length) return "raw-ingest: word gap — no formal-record / stated-position data for this run's politicians (pull order unchanged)";
  const parts = pids.map((pid) => {
    const g = wordGaps[pid];
    const mine = sources.filter((s) => s?.politician_id === pid);
    const ranks = mine.map((s) => wordGapRank(s, wordGaps));
    const n = (r) => ranks.filter((x) => x === r).length;
    const keys = [...g.gap].sort();
    const shown = keys.slice(0, 12).join(", ") + (keys.length > 12 ? `, +${keys.length - 12} more` : "");
    return `${pid}: ${g.gap.size} gap issue(s)${keys.length ? ` (${shown})` : ""}, ${g.stated.size} with a stated position · pull list ${n(GAP_RANK)} gap page(s) first, ${n(NEUTRAL_RANK)} other, ${n(COVERED_RANK)} already-stated last`;
  });
  return `raw-ingest: word gap — ${parts.join(" · ")}`;
}

/** Issue keys from the curated stance cards ({ pid: [card…] }) for these pids. */
export function curatedIssueKeys(curated, pids) {
  const out = {};
  for (const pid of pids) {
    const cards = curated?.[pid];
    if (!Array.isArray(cards)) continue;
    const keys = cards.map((c) => c && c.issueKey).filter(Boolean).map(String);
    if (keys.length) out[pid] = keys;
  }
  return out;
}

/**
 * Production loader (database). Formal record = verdict-bearing issue mappings
 * on measures the politician voted on (roll call) or took a formal position on
 * (sponsorship etc.). Stated = active promoted stated positions, plus the
 * curated stance cards when `curated` is given. Read-only.
 * Returns { formal: { pid: string[] }, stated: { pid: string[] } }.
 */
export async function loadWordGapData(pids, { db, sql, curated = null } = {}) {
  const list = [...new Set((pids || []).map(String).filter(Boolean))];
  const formal = {}, stated = {};
  if (!list.length) return { formal, stated };
  const rowsOf = (r) => (Array.isArray(r) ? r : r?.rows || []);
  const push = (m, pid, key) => { if (pid && key) (m[pid] ||= []).push(String(key)); };
  const formalRows = rowsOf(await db.execute(sql`
    SELECT DISTINCT x.politician_id, mi.issue_key FROM (
      SELECT mv.politician_id, rc.measure_id FROM vr_member_votes mv
        JOIN vr_rollcalls rc ON rc.id = mv.rollcall_id
        WHERE mv.politician_id IN (${sql.join(list.map((p) => sql`${p}`), sql`, `)})
      UNION
      SELECT p.politician_id, p.measure_id FROM vr_positions p
        WHERE p.politician_id IN (${sql.join(list.map((p) => sql`${p}`), sql`, `)})
    ) x
    JOIN vr_measure_issues mi ON mi.measure_id = x.measure_id
    WHERE mi.review_status NOT IN ('proposed', 'rejected')`));
  for (const r of formalRows) push(formal, r.politician_id, r.issue_key);
  const statedRows = rowsOf(await db.execute(sql`
    SELECT politician_id, issue_key FROM pdx_stated_positions
    WHERE status = 'active' AND politician_id IN (${sql.join(list.map((p) => sql`${p}`), sql`, `)})`));
  for (const r of statedRows) push(stated, r.politician_id, r.issue_key);
  if (curated) for (const [pid, keys] of Object.entries(curatedIssueKeys(curated, list))) for (const k of keys) push(stated, pid, k);
  return { formal, stated };
}
