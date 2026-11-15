// ─────────────────────────────────────────────────────────────────────────────
// raw-ingest-coverage.mjs — coverage gap report for the stance generator
// ─────────────────────────────────────────────────────────────────────────────
// READ-ONLY. Summarises where the Evidence Locker is thin so the rotation can
// be steered by hand. Three lists:
//   · politicians with fewer than GAP_MIN_STRONG strong Locker items in total
//     (all topics together);
//   · topics with strong items for fewer than GAP_MIN_POLITICIANS politicians;
//   · politicians with frontier pages waiting but no strong item on any topic.
// Inputs are the Locker baseline counts ("pid|topic" → { strong, weak }, from
// lockerBaselineCounts: hidden items excluded, older stated reads regraded as
// for the baseline), the roster and the fresh-page frontier. Nothing here
// scores, promotes or writes; the cron logs one line from it and the admin
// endpoint (/api/admin/raw-ingest-coverage) returns the full lists.

import { SCORED_TOPICS, NO_POLE_TOPICS, hasRulesFor } from "./stance-score-core.mjs";

export const GAP_MIN_STRONG = 3;
export const GAP_MIN_POLITICIANS = 5;
// Ids named per list in the cron's log line (the endpoint returns all).
export const GAP_LOG_NAMES = 8;

/** Topics the report covers: scored issue keys with a position pole. */
export const reportTopics = (topics = SCORED_TOPICS) => topics.filter((t) => hasRulesFor(t) && !NO_POLE_TOPICS.has(t));

/**
 * Pure. Returns { generated_at, thresholds, totals, politicians_under_strong,
 * topics_under_politicians, frontier_waiting_no_strong }.
 */
export function coverageGaps({ roster = [], counts = {}, frontier = {}, topics = SCORED_TOPICS, minStrong = GAP_MIN_STRONG, minPoliticians = GAP_MIN_POLITICIANS, now = new Date() } = {}) {
  const strongBy = new Map(); // pid → total strong
  const topicPols = new Map(); // topic → Set(pid) with ≥ 1 strong
  const topicsBy = new Map(); // pid → Set(topic) with ≥ 1 strong
  for (const [k, c] of Object.entries(counts || {})) {
    const i = k.indexOf("|");
    if (i < 0) continue;
    const pid = k.slice(0, i), topic = k.slice(i + 1);
    const s = Number(c?.strong) || 0;
    if (!s) continue;
    strongBy.set(pid, (strongBy.get(pid) || 0) + s);
    (topicPols.get(topic) || topicPols.set(topic, new Set()).get(topic)).add(pid);
    (topicsBy.get(pid) || topicsBy.set(pid, new Set()).get(pid)).add(topic);
  }
  const rosterIds = [...new Set((roster || []).map((r) => r?.politician_id).filter(Boolean))];
  const nameOf = new Map((roster || []).map((r) => [r?.politician_id, r?.name || null]));
  const tierOf = new Map((roster || []).map((r) => [r?.politician_id, r?.tier ?? null]));
  const waiting = (pid) => (Array.isArray(frontier?.[pid]) ? frontier[pid].length : 0);

  const politicians_under_strong = rosterIds
    .map((pid) => ({ politician_id: pid, name: nameOf.get(pid), tier: tierOf.get(pid), strong: strongBy.get(pid) || 0, topics_with_strong: [...(topicsBy.get(pid) || [])].sort(), frontier_waiting: waiting(pid) }))
    .filter((x) => x.strong < minStrong)
    .sort((a, b) => a.strong - b.strong || (Number(a.tier) || 9) - (Number(b.tier) || 9) || a.politician_id.localeCompare(b.politician_id));

  const topics_under_politicians = reportTopics(topics)
    .map((t) => ({ topic: t, politicians: topicPols.get(t)?.size || 0, politician_ids: [...(topicPols.get(t) || [])].sort() }))
    .filter((x) => x.politicians < minPoliticians)
    .sort((a, b) => a.politicians - b.politicians || a.topic.localeCompare(b.topic));

  const frontierIds = Object.keys(frontier || {}).filter((pid) => waiting(pid) > 0);
  const frontier_waiting_no_strong = frontierIds
    .filter((pid) => !(strongBy.get(pid) > 0))
    .map((pid) => ({ politician_id: pid, name: nameOf.get(pid) ?? null, tier: tierOf.get(pid) ?? null, frontier_waiting: waiting(pid), frontier_topics: [...new Set(frontier[pid].map((x) => x?.topic).filter(Boolean))].sort() }))
    .sort((a, b) => b.frontier_waiting - a.frontier_waiting || a.politician_id.localeCompare(b.politician_id));

  return {
    generated_at: now.toISOString(),
    thresholds: { min_strong_per_politician: minStrong, min_politicians_per_topic: minPoliticians },
    totals: {
      roster: rosterIds.length,
      topics: reportTopics(topics).length,
      politicians_with_frontier: frontierIds.length,
      politicians_under_strong: politicians_under_strong.length,
      topics_under_politicians: topics_under_politicians.length,
      frontier_waiting_no_strong: frontier_waiting_no_strong.length,
    },
    politicians_under_strong,
    topics_under_politicians,
    frontier_waiting_no_strong,
  };
}

const names = (xs, f, n = GAP_LOG_NAMES) => (xs.length ? `${xs.slice(0, n).map(f).join(", ")}${xs.length > n ? `, … +${xs.length - n}` : ""}` : "none");

/** One log line for the cron. */
export function coverageGapLine(r) {
  const t = r.thresholds;
  return `raw-ingest: coverage gaps — ${r.politicians_under_strong.length}/${r.totals.roster} politician(s) under ${t.min_strong_per_politician} strong item(s): ${names(r.politicians_under_strong, (x) => `${x.politician_id} (${x.strong})`)}`
    + ` · ${r.topics_under_politicians.length}/${r.totals.topics} topic(s) with strong items for under ${t.min_politicians_per_topic} politician(s): ${names(r.topics_under_politicians, (x) => `${x.topic} (${x.politicians})`)}`
    + ` · ${r.frontier_waiting_no_strong.length} politician(s) with frontier pages waiting and no strong item: ${names(r.frontier_waiting_no_strong, (x) => `${x.politician_id} (${x.frontier_waiting} waiting)`)}`
    + ` · full lists: GET /api/admin/raw-ingest-coverage`;
}
