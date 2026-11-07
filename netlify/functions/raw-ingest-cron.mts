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
//   · EVIDENCE LOCKER — after a candidate is logged, a clear position at
//     confidence ≥ 0.8 becomes a finished item in the "evidence-locker" Blobs
//     store (ground-truth pair: must match the ground-truth position; anything
//     else: campaign/official page only). Write-once; every write is logged.
//     The ground-truth file is imported read-only and never written.

import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { runRawIngest, discoverSources, RAW_STORE_NAME, SOURCES } from "../lib/raw-ingest-core.mjs";
import { logCandidateStance } from "../lib/stance-score-core.mjs";
import { maybeWriteLockerItem, LOCKER_STORE_NAME } from "../lib/evidence-locker-core.mjs";
import groundTruth from "../../db/stance-ground-truth-talarico-cost-of-living.json" with { type: "json" };

// Exported so the test suite can invoke this exact entry point with fakes.
// `lockerStore` and `discover` are opt-in so each phase can be exercised on its
// own; the scheduled entry point below turns both on.
export async function run(deps: {
  fetch: typeof fetch; store: any; now?: () => Date; log?: (l: string) => void;
  lockerStore?: any; groundTruth?: any; discover?: boolean | { patterns?: any[]; max?: number };
  sources?: any[];
}) {
  const log = deps.log ?? ((l: string) => console.log(l));
  let sources = deps.sources ?? SOURCES;
  let discovered: any[] = [];
  if (deps.discover) {
    const opts = typeof deps.discover === "object" ? deps.discover : {};
    const d = await discoverSources(sources, { fetch: deps.fetch, log, ...opts });
    sources = d.sources;
    discovered = d.added;
  }
  const lockerWrites: any[] = [];
  const gt = deps.groundTruth ?? groundTruth;
  const onRecord = async (rec: any) => {
    const candidate = logCandidateStance(rec, { log });
    if (!deps.lockerStore || !candidate) return;
    const w = await maybeWriteLockerItem(candidate, rec, { store: deps.lockerStore, gt, log });
    if (w.written) lockerWrites.push({ key: w.key, politician_id: candidate.politician_id, topic: candidate.topic });
  };
  const report: any = await runRawIngest({ ...deps, onRecord }, sources);
  report.discovered = discovered.map((s: any) => ({ politician_id: s.politician_id, topic: s.topic, url: s.url }));
  report.locker_writes = lockerWrites;
  if (deps.lockerStore) log(`evidence-locker: run complete — ${lockerWrites.length} new item(s) written`);
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
  });

// Every 4 hours, on the hour (00, 04, 08, 12, 16, 20 UTC).
export const config: Config = {
  schedule: "0 */4 * * *",
};
