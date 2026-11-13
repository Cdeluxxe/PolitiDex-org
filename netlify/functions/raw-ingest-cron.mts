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

// Every-minute pass:
//   · SCHEDULE — every minute ("* * * * *") instead of every 4 hours.
//   · CAPS — up to MAX_POLITICIANS_PER_RUN (8) politicians, MAX_SOURCES_PER_
//     POLITICIAN (6) sources each and MAX_SOURCES_PER_RUN (36) sources in total
//     per run. Fetch ceilings keep a run inside RUN_BUDGET_MS (25 s); each run
//     logs "raw-ingest: run duration …" or "raw-ingest: SLOW RUN …".
//   · Record shape, Locker writer, thresholds, review flags and rotation logic
//     are unchanged. (Notes below that mention the 4-hour schedule or a cap of
//     11 describe earlier passes.)

// Extra source types pass:
//   · Five more source classes join the rotation (raw-ingest-source-types.mjs):
//     a member's own house.gov / senate.gov press releases and issue sections,
//     Congress.gov member / lead-author pages, state legislature member pages,
//     governor / statewide releases, and more campaign Issues / Priorities
//     sub-pages. Every URL is one the site already cites for that politician.
//   · Same caps, schedule, record shape and Locker writer. A politician with
//     more pages than their per-run slots rotates through them by cycle.
//   · RUN LOG — "raw-ingest: run included …" adds "source classes" (pages per
//     class; "existing" = the pages configured before this pass).

// Official social pass (YouTube only for now):
//   · Official / campaign YouTube channels already cited on the site
//     (raw-ingest-social.mjs). One channel = one source slot; each new recent
//     video becomes its own raw item record — type "video", date, link,
//     excerpt, weight "mention" — with no scoring and no Locker write.
//   · Excerpt = transcript first; on failure/empty, the description, logged as
//     "raw-ingest: TRANSCRIPT FALLBACK …". "raw-ingest: youtube — …" closes the
//     run with the transcript vs. fallback tally (also report.youtube).
//   · Social slots are filled last (after every official / campaign page), so
//     the caps and the priority of official pages are unchanged.

// Roster priority + baseline pass:
//   · ROSTER grows beyond the previous 13 to more sitting members with a
//     district board and/or stated positions. Tier 1 = board + several stated
//     positions; tier 2 = board or stated positions; tier 3 = the rest of the
//     previous 13.
//   · PER-ISSUE BASELINE — before each run the Locker is counted per
//     politician + issue; a pair with 1 strong or 3 weak items (any mix of the
//     same weight; mentions do not count) is filled. Pages on a filled issue are
//     not chased (left out of the pull list); a politician with every issue
//     filled is deprioritised — behind everyone else, and in only one rotation
//     cycle out of three. New finds on a filled issue are still stored.
//   · ROTATION — planRun works in cycles from a persisted state ({ cycle, done })
//     instead of a bare cursor; the per-run cap, the 4-hour schedule,
//     official-source checks, review flags, scoring and Locker thresholds are
//     unchanged.
//   · RUN LOG — "raw-ingest: roster …" (size, tiers), "raw-ingest: run plan …"
//     (who, tier, deprioritised, filled issues skipped) and "raw-ingest:
//     baseline progress …" (which politician + issue pairs are filled).

import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import {
  runRawIngest, discoverSources, planRun, runPlanLine, sourceKind, normaliseRotationState,
  rosterSummary, baselineLine, ROSTER, BASELINE_STRONG, BASELINE_WEAK,
  RAW_STORE_NAME, SOURCES, ROTATION_STORE_NAME, ROTATION_KEY, MAX_SOURCES_PER_RUN,
  MAX_POLITICIANS_PER_RUN, MAX_SOURCES_PER_POLITICIAN, RUN_BUDGET_MS,
} from "../lib/raw-ingest-core.mjs";
import { logCandidateStances, SCORED_TOPICS } from "../lib/stance-score-core.mjs";
import { maybeWriteLockerItem, loadReviewFlags, lockerBaselineCounts, LOCKER_STORE_NAME } from "../lib/evidence-locker-core.mjs";
import { appendRunSuggestions, SUGGESTIONS_STORE_NAME } from "../lib/raw-ingest-suggestions.mjs";
import groundTruth from "../../db/stance-ground-truth-talarico-cost-of-living.json" with { type: "json" };
import reviewFile from "../../db/evidence-locker-review.json" with { type: "json" };

async function readRotationState(store: any, log: (l: string) => void): Promise<any> {
  if (!store) return normaliseRotationState(null);
  try {
    return normaliseRotationState(await store.get(ROTATION_KEY, { type: "json" }));
  } catch (e: any) {
    log(`raw-ingest: rotation state unreadable — starting a fresh cycle (${e?.message || e})`);
    return normaliseRotationState(null);
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
  // persists the rotation state between runs.
  // `state` overrides the stored rotation state and `counts` the Locker
  // per-issue baseline counts ("pid|topic" → { strong, weak }) (tests).
  rotate?: boolean | { roster?: any[]; max?: number; state?: any; counts?: Record<string, { strong?: number; weak?: number }> };
  rotationStore?: any;
  reviewFlags?: any;
}) {
  const log = deps.log ?? ((l: string) => console.log(l));
  const startedAt = Date.now();
  let sources = deps.sources ?? SOURCES;
  let discovered: any[] = [];
  let plan: any = null;
  let roster: any[] = ROSTER;
  let counts: Record<string, any> = {};
  const flags = loadReviewFlags(deps.reviewFlags ?? reviewFile);
  if (deps.rotate && !deps.sources) {
    const ro = typeof deps.rotate === "object" ? deps.rotate : {};
    roster = ro.roster ?? ROSTER;
    const pids = roster.map((r: any) => r.politician_id);
    const state = ro.state !== undefined ? normaliseRotationState(ro.state) : await readRotationState(deps.rotationStore, log);
    counts = ro.counts ?? await lockerBaselineCounts(deps.lockerStore, { flags, pids, log });
    const max = ro.max ?? MAX_SOURCES_PER_RUN;
    plan = planRun(state, { roster, max, counts, maxPoliticians: MAX_POLITICIANS_PER_RUN, perPolitician: MAX_SOURCES_PER_POLITICIAN });
    const rs = rosterSummary(roster, counts);
    const tierOf = new Map(roster.map((r: any) => [r.politician_id, r.tier]));
    log(`raw-ingest: roster — ${rs.size} politician(s) (${Object.entries(rs.tiers).map(([t, n]) => `tier ${t}: ${n}`).join(", ")}) · ${rs.reached.length} politician + issue pair(s) filled`);
    const dep = new Set(plan.deprioritised);
    const who = plan.politicians.map((p: string) => `${p} (t${tierOf.get(p)}${dep.has(p) ? ", deprioritised: every issue filled" : ""})`);
    const skip = plan.skipped.length ? ` · not chased (filled): ${plan.skipped.map((x: any) => `${x.politician_id}|${x.topic}`).join(", ")}` : "";
    console.log(`raw-ingest: run plan — cycle ${plan.cycle} · ${plan.politicians.length} politician(s): ${who.join(", ")} · ${plan.sources.length} page(s) + ${plan.patterns.length} official pattern(s) (cap ${max}) · ${plan.remaining_in_cycle.length} left this cycle${skip}`);
    const d = await discoverSources(plan.sources, { fetch: deps.fetch, log, patterns: plan.patterns, max, restrict: false });
    sources = d.sources;
    discovered = d.added;
    if (deps.rotationStore) {
      try { await deps.rotationStore.setJSON(ROTATION_KEY, { ...plan.state, updated_at: (deps.now ?? (() => new Date()))().toISOString(), last_politicians: plan.politicians }); }
      catch (e: any) { log(`raw-ingest: rotation state not saved — ${e?.message || e}`); }
    }
  } else if (deps.discover) {
    const opts = typeof deps.discover === "object" ? deps.discover : {};
    const d = await discoverSources(sources, { fetch: deps.fetch, log, ...opts });
    sources = d.sources;
    discovered = d.added;
  }
  const included = runPlanLine(sources);
  console.log(`raw-ingest: run included ${included.count} source(s) · politicians: ${included.politicians.join(", ")} · source kinds: ${JSON.stringify(included.kinds)} · source types: ${JSON.stringify(included.source_types)} · source classes: ${JSON.stringify(included.source_classes)}`);
  const lockerWrites: any[] = [];
  const gt = deps.groundTruth ?? groundTruth;
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
  // YouTube: how often the transcript worked vs. the description fallback.
  const yt = report.results.filter((r: any) => r.youtube);
  if (yt.length) {
    const sum = (k: string) => yt.reduce((n: number, r: any) => n + (r.youtube[k] || 0), 0);
    report.youtube = { channels: yt.length, videos: sum("videos"), stored: sum("stored"), already_stored: sum("seen"), transcript: sum("transcript"), description_fallback: sum("fallback") };
    const tried = report.youtube.transcript + report.youtube.description_fallback;
    log(`raw-ingest: youtube — ${yt.length} channel(s), ${report.youtube.stored} new video record(s) · transcript ${report.youtube.transcript}/${tried}, description fallback ${report.youtube.description_fallback}/${tried} · ${report.youtube.already_stored} already stored`);
  }
  report.discovered = discovered.map((s: any) => ({ politician_id: s.politician_id, topic: s.topic, url: s.url, kind: sourceKind(s), ...(s.official_kind ? { official_kind: s.official_kind } : {}) }));
  report.included = {
    ...included,
    sources: sources.map((s: any) => ({ politician_id: s.politician_id, topic: s.topic, url: s.url, source_type: s.source_type, kind: sourceKind(s), ...(s.source_class ? { source_class: s.source_class } : {}) })),
  };
  if (plan) report.plan = { cycle: plan.cycle, classes: plan.classes, politicians: plan.politicians, deprioritised: plan.deprioritised, skipped: plan.skipped, remaining_in_cycle: plan.remaining_in_cycle, planned_size: plan.size, roster_size: roster.length, state: plan.state };
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
  if (plan) {
    // Baseline progress after this run's writes (recounted from the Locker when
    // anything new landed; the injected/pre-run counts otherwise).
    const ro = typeof deps.rotate === "object" ? deps.rotate : {};
    const after = lockerWrites.length && deps.lockerStore && !ro.counts
      ? await lockerBaselineCounts(deps.lockerStore, { flags, pids: roster.map((r: any) => r.politician_id), log })
      : counts;
    const rs = rosterSummary(roster, after);
    report.baseline = { strong: BASELINE_STRONG, weak: BASELINE_WEAK, reached: rs.reached, counts: after };
    log(baselineLine(roster, after));
  }
  // Time guardrail: every run logs its duration against the budget; a run over
  // it logs SLOW RUN (if that is regular, lower MAX_POLITICIANS_PER_RUN to 5–6).
  const durationMs = Date.now() - startedAt;
  report.duration_ms = durationMs;
  report.budget_ms = RUN_BUDGET_MS;
  log(durationMs > RUN_BUDGET_MS
    ? `raw-ingest: SLOW RUN — ${durationMs}ms (budget ${RUN_BUDGET_MS}ms, ${report.results.length} source(s), ${MAX_POLITICIANS_PER_RUN} politician cap) · consider lowering MAX_POLITICIANS_PER_RUN toward 5–6`
    : `raw-ingest: run duration — ${durationMs}ms (budget ${RUN_BUDGET_MS}ms, ${report.results.length} source(s))`);
  const okCount = report.results.filter((r: any) => r.ok).length;
  // 200 all sources stored · 207 some failed (the rest still stored) · 502 none stored
  const status = report.ok ? 200 : okCount > 0 ? 207 : 502;
  return new Response(JSON.stringify(report), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// The scheduled entry point. `run` is unchanged; this wrapper only tees the
// lines it already logs (still printed to the function log as before) and,
// after the run, hands them and the report to the suggestions log
// (raw-ingest-suggestions.mjs). A suggestions failure never touches the run.
export async function scheduled(deps: { run?: typeof run; suggestionsStore?: any; now?: () => Date; [k: string]: any } = {}): Promise<Response> {
  const lines: string[] = [];
  const log = (l: string) => { lines.push(l); console.log(l); };
  const { run: runFn = run, suggestionsStore, now, ...rest } = deps;
  // The production stores, built only when a caller (a test) has not injected all three.
  const productionStores = () => ({
    store: getStore(RAW_STORE_NAME),
    lockerStore: getStore(LOCKER_STORE_NAME),
    rotationStore: getStore(ROTATION_STORE_NAME),
  });
  const res = await runFn({
    fetch: globalThis.fetch,
    discover: true,
    rotate: true,
    ...(rest.store && rest.lockerStore && rest.rotationStore ? {} : productionStores()),
    ...rest,
    log,
  } as any);
  try {
    const report = await res.clone().json();
    await appendRunSuggestions(suggestionsStore ?? getStore(SUGGESTIONS_STORE_NAME), { lines, report, now: (now ?? (() => new Date()))() });
  } catch (e: any) {
    console.log(`raw-ingest-suggestions: not written — ${e?.message || e}`);
  }
  return res;
}

export default async (): Promise<Response> => scheduled();

// Every minute. Each run is sized (caps + fetch ceilings in raw-ingest-core)
// to finish inside RUN_BUDGET_MS (~25 s), under the 30 s function limit.
export const config: Config = {
  schedule: "* * * * *",
};
