// ─────────────────────────────────────────────────────────────────────────────
// Raw ingest — scheduled cron · Phase 3 (raw store only)
// ─────────────────────────────────────────────────────────────────────────────
// Every 4 hours (6 runs/day) pulls the 8 configured pages — 5 politicians
// (Talarico, Hinojosa, Abbott, Paxton, Cornyn) across 2 topics (cost_living,
// healthcare_costs); see SOURCES in raw-ingest-core.mjs — and stores each one
// untouched (HTML, URL, timestamp, source type) as its own record in the
// "raw-ingest" Blobs store. ~48 records/day. A failed source writes nothing and
// does not stop the others.
//
// Phase 5: after each record is stored, the existing Phase 4 scorer runs on it
// and LOGS a candidate stance (position + confidence) and whether the rules
// found a clear position. LOG ONLY — no candidate is written to the raw store,
// the ground-truth file, or any live stance store. Every run logs one
// "raw-ingest: OK …" / "raw-ingest: FAIL …" line per source plus a summary.
//
// Phase 6:
//   · DISCOVERY — before pulling, each politician in SOURCES gets one extra
//     known URL checked (issues index / newsroom; DISCOVERY_PATTERNS). New
//     stable pages join this run's pull list, total capped at
//     MAX_SOURCES_PER_RUN (11, i.e. under 12). Every new URL is logged.
//   · EVIDENCE LOCKER — after a candidate is logged, it becomes an item in the
//     "evidence-locker" Blobs store at one of three strengths: strong (clear
//     position, confidence ≥ 0.8), weak (clear, 0.3–0.79, incl. implication-
//     driven reads) or mention (< 0.3 or no clear position, with topic mentions
//     and an excerpt). Ground-truth pair: a clear read must match the
//     ground-truth position; anything else: campaign/official page only. A
//     strong item is never overwritten; every write and skip is logged.
//     The ground-truth file is imported read-only and never written.
//
// Coverage pass:
//   · ROTATION — the scheduled run no longer pulls only the fixed five. It
//     plans each run from ROSTER (planRun): politicians with a district board
//     and stated positions first, then those with one of the two, taking whole
//     politicians from a persisted cursor until the run reaches
//     MAX_SOURCES_PER_RUN (11). The next run continues from where this one
//     stopped, so successive runs check different people.
//   · OFFICIAL SOURCES — each planned politician's official pattern (state
//     legislature page, House/Senate newsroom, governor/agency newsroom) is
//     checked with the existing stable-page test and joins the pull list when
//     it is stable and not already included. Its slot is reserved in the plan,
//     so the cap holds either way.
//   · REVIEW FLAGS — db/evidence-locker-review.json is passed to the Locker
//     writer; a flagged item (reviewed / needs_edit / hidden) is never written
//     over. Logged as "evidence-locker: FLAGGED …".
//   · RUN LOG — one "raw-ingest: run plan …" line (politicians, cursor) before
//     pulling and one "raw-ingest: run included …" line (politicians and source
//     types actually pulled) after discovery.
//
// All-topics pass:
//   · Every stored page is scored against EVERY issue key in the register
//     (SCORED_TOPICS — cost_living and healthcare_costs keep their calibrated
//     rules; the rest read stance-topic-vocab.mjs). The page's own topic is
//     handled exactly as before; another topic yields a candidate only when the
//     page carries directional language on it (explicit or implied). Each
//     candidate goes through the same Locker writer and thresholds, keyed by its
//     own issue key, so one page can write items on several issues.
//   · Sources, discovery, roster, official-source check, review flags and the
//     per-run cap are unchanged.
//   · TOPIC LOG — "stance-score: run topics …" (candidates per topic) and
//     "evidence-locker: topics with new items this run …" (items per topic, by
//     strength) close every run; the report carries the same under `topics`.

import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import {
  runRawIngest, discoverSources, planRun, runPlanLine, sourceKind,
  RAW_STORE_NAME, SOURCES, ROTATION_STORE_NAME, ROTATION_KEY, MAX_SOURCES_PER_RUN,
} from "../lib/raw-ingest-core.mjs";
import { logCandidateStances, SCORED_TOPICS } from "../lib/stance-score-core.mjs";
import { maybeWriteLockerItem, loadReviewFlags, LOCKER_STORE_NAME } from "../lib/evidence-locker-core.mjs";
import groundTruth from "../../db/stance-ground-truth-talarico-cost-of-living.json" with { type: "json" };
import reviewFile from "../../db/evidence-locker-review.json" with { type: "json" };

async function readCursor(store: any, log: (l: string) => void): Promise<number> {
  if (!store) return 0;
  try {
    const doc = await store.get(ROTATION_KEY, { type: "json" });
    const c = Number(doc?.cursor);
    return Number.isFinite(c) && c >= 0 ? Math.trunc(c) : 0;
  } catch (e: any) {
    log(`raw-ingest: rotation cursor unreadable — starting at 0 (${e?.message || e})`);
    return 0;
  }
}

// Exported so the test suite can invoke this exact entry point with fakes.
// `lockerStore` and `discover` are opt-in so each phase can be exercised on its
// own; the scheduled entry point below turns both on.
export async function run(deps: {
  fetch: typeof fetch; store: any; now?: () => Date; log?: (l: string) => void;
  lockerStore?: any; groundTruth?: any; discover?: boolean | { patterns?: any[]; max?: number };
  sources?: any[];
  // Coverage pass: plan the run from the roster (see header). `rotationStore`
  // persists the cursor between runs; `cursor` overrides it (tests).
  rotate?: boolean | { roster?: any[]; max?: number; cursor?: number };
  rotationStore?: any;
  reviewFlags?: any;
}) {
  const log = deps.log ?? ((l: string) => console.log(l));
  let sources = deps.sources ?? SOURCES;
  let discovered: any[] = [];
  let plan: any = null;
  if (deps.rotate && !deps.sources) {
    const ro = typeof deps.rotate === "object" ? deps.rotate : {};
    const cursor = typeof ro.cursor === "number" ? ro.cursor : await readCursor(deps.rotationStore, log);
    const max = ro.max ?? MAX_SOURCES_PER_RUN;
    plan = planRun(cursor, { ...(ro.roster ? { roster: ro.roster } : {}), max });
    sources = plan.sources;
    console.log(`raw-ingest: run plan — cursor ${plan.cursor} → ${plan.next_cursor} · ${plan.politicians.length} politician(s): ${plan.politicians.join(", ")} · ${plan.sources.length} page(s) + ${plan.patterns.length} official pattern(s) (cap ${max})`);
    const d = await discoverSources(sources, { fetch: deps.fetch, log, patterns: plan.patterns, max, restrict: false });
    sources = d.sources;
    discovered = d.added;
    if (deps.rotationStore) {
      try { await deps.rotationStore.setJSON(ROTATION_KEY, { cursor: plan.next_cursor, updated_at: (deps.now ?? (() => new Date()))().toISOString(), last_politicians: plan.politicians }); }
      catch (e: any) { log(`raw-ingest: rotation cursor not saved — ${e?.message || e}`); }
    }
  } else if (deps.discover) {
    const opts = typeof deps.discover === "object" ? deps.discover : {};
    const d = await discoverSources(sources, { fetch: deps.fetch, log, ...opts });
    sources = d.sources;
    discovered = d.added;
  }
  const included = runPlanLine(sources);
  console.log(`raw-ingest: run included ${included.count} source(s) · politicians: ${included.politicians.join(", ")} · source kinds: ${JSON.stringify(included.kinds)} · source types: ${JSON.stringify(included.source_types)}`);
  const lockerWrites: any[] = [];
  const gt = deps.groundTruth ?? groundTruth;
  const flags = loadReviewFlags(deps.reviewFlags ?? reviewFile);
  // Every page is scored against every topic (SCORED_TOPICS): its own topic as
  // before, plus each other issue key it carries directional language on. Each
  // candidate goes through the same Locker writer, so one page can land items
  // on several issues — each under its own issue key.
  const topicsScored: Record<string, number> = {};
  const onRecord = async (rec: any) => {
    const candidates = logCandidateStances(rec, { log });
    for (const c of candidates) topicsScored[c.topic] = (topicsScored[c.topic] || 0) + 1;
    if (!deps.lockerStore) return;
    if (!candidates.length) {
      log(`evidence-locker: SKIP ${rec?.politician_id}|${rec?.topic}${rec?.source_id ? "|" + rec.source_id : ""} — no scored candidate`);
      return;
    }
    for (const candidate of candidates) {
      const w = await maybeWriteLockerItem(candidate, rec, { store: deps.lockerStore, gt, log, flags });
      if (w.written) lockerWrites.push({ key: w.key, politician_id: candidate.politician_id, topic: candidate.topic, strength: w.item?.strength, ...(candidate.topic !== rec.topic ? { page_topic: rec.topic } : {}) });
    }
  };
  const report: any = await runRawIngest({ ...deps, onRecord }, sources);
  report.discovered = discovered.map((s: any) => ({ politician_id: s.politician_id, topic: s.topic, url: s.url, kind: sourceKind(s), ...(s.official_kind ? { official_kind: s.official_kind } : {}) }));
  report.included = {
    ...included,
    sources: sources.map((s: any) => ({ politician_id: s.politician_id, topic: s.topic, url: s.url, source_type: s.source_type, kind: sourceKind(s) })),
  };
  if (plan) report.plan = { cursor: plan.cursor, next_cursor: plan.next_cursor, politicians: plan.politicians, planned_size: plan.size };
  report.locker_writes = lockerWrites;
  // Which topics produced candidates / items this run.
  const itemsByTopic: Record<string, { strong: number; weak: number; mention: number }> = {};
  for (const w of lockerWrites) {
    const t = (itemsByTopic[w.topic] ||= { strong: 0, weak: 0, mention: 0 });
    if (w.strength in t) (t as any)[w.strength] += 1;
  }
  report.topics = { scored_against: SCORED_TOPICS.length, candidates: topicsScored, items: itemsByTopic };
  log(`stance-score: run topics — ${Object.keys(topicsScored).length ? Object.entries(topicsScored).map(([t, n]) => `${t} ×${n}`).join(", ") : "none"} (each page scored against ${SCORED_TOPICS.length} topics)`);
  if (deps.lockerStore) {
    const by = (s: string) => lockerWrites.filter((w) => w.strength === s).length;
    log(`evidence-locker: run complete — ${lockerWrites.length} new item(s) written (${by("strong")} strong, ${by("weak")} weak, ${by("mention")} mention)`);
    const tl = Object.entries(itemsByTopic).map(([t, c]) => `${t} ${c.strong + c.weak + c.mention} (${c.strong} strong, ${c.weak} weak, ${c.mention} mention)`);
    log(`evidence-locker: topics with new items this run — ${tl.length ? tl.join("; ") : "none"}`);
  }
  const okCount = report.results.filter((r: any) => r.ok).length;
  // 200 all sources stored · 207 some failed (the rest still stored) · 502 none stored
  const status = report.ok ? 200 : okCount > 0 ? 207 : 502;
  return new Response(JSON.stringify(report), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async (): Promise<Response> =>
  run({
    fetch: globalThis.fetch,
    store: getStore(RAW_STORE_NAME),
    lockerStore: getStore(LOCKER_STORE_NAME),
    discover: true,
    rotate: true,
    rotationStore: getStore(ROTATION_STORE_NAME),
  });

// Every 4 hours, on the hour (00, 04, 08, 12, 16, 20 UTC).
export const config: Config = {
  schedule: "0 */4 * * *",
};
