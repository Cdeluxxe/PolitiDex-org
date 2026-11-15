// ─────────────────────────────────────────────────────────────────────────────
// stated-positions-backfill — one-time: every existing Evidence Locker item →
// pdx_stated_positions
// ─────────────────────────────────────────────────────────────────────────────
// Scheduled (production only). Each run checks a marker in the
// "stated-positions-backfill" Blobs store: once the pass has completed, the run
// logs "already complete" and returns without reading the Locker or writing the
// database. Until then it runs netlify/lib/stated-positions-backfill.mjs inside
// a time budget, saving progress so a long pass or a database hiccup resumes on
// the next run instead of starting over.
//
// It uses the promotion step's own read, thresholds and database adapter
// (stated-positions-core.mjs); it writes only pdx_stated_positions with
// provenance 'pipeline', withdraws (never deletes) a promotion that no longer
// qualifies, and never touches the Locker, the curated cards or the raw-ingest
// cron. The closing "stated-positions-backfill: complete — …" log line (also
// saved in the marker under `summary`) is the run's report.

import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { LOCKER_STORE_NAME, loadReviewFlags } from "../lib/evidence-locker-core.mjs";
import { runBackfill, summaryLine, BACKFILL_VERSION } from "../lib/stated-positions-backfill.mjs";
import reviewFile from "../../db/evidence-locker-review.json" with { type: "json" };

export const MARKER_STORE_NAME = "stated-positions-backfill";
export const MARKER_KEY = `${BACKFILL_VERSION}.json`;

export default async (): Promise<Response> => {
  const marker = getStore(MARKER_STORE_NAME);
  const saved: any = await marker.get(MARKER_KEY, { type: "json" }).catch(() => null);
  if (saved?.complete) {
    console.log(`stated-positions-backfill: already complete (${saved.completed_at}) — nothing to do`);
    return Response.json({ complete: true, already: true });
  }
  let db: any;
  try {
    const [{ db: client }, { pdxStatedPositions: t }, orm, { dbAdapter }] = await Promise.all([
      import("../../db/index.js"), import("../../db/schema.js"), import("drizzle-orm"), import("../lib/stated-positions-core.mjs"),
    ]);
    db = {
      ...dbAdapter(client, t, orm),
      async activePoliticianIds() {
        const rows = await client.selectDistinct({ pid: t.politicianId }).from(t).where(orm.eq(t.status, "active"));
        return rows.map((r: any) => r.pid);
      },
    };
  } catch (e: any) {
    console.log(`stated-positions-backfill: database unavailable — retrying next run (${e?.message || e})`);
    return Response.json({ complete: false, error: "database unavailable" }, { status: 503 });
  }
  try {
    const { state, complete } = await runBackfill({
      store: getStore(LOCKER_STORE_NAME),
      db,
      flags: loadReviewFlags(reviewFile),
      state: saved,
      budgetMs: 20000,
    });
    await marker.setJSON(MARKER_KEY, { ...state, ...(complete ? { summary: summaryLine(state.tallies) } : {}) });
    return Response.json({ complete, done: state.done.length });
  } catch (e: any) {
    console.log(`stated-positions-backfill: ERROR — ${e?.message || e}; retrying next run`);
    return Response.json({ complete: false, error: String(e?.message || e) }, { status: 500 });
  }
};

// Every 10 minutes until the marker says complete (then each run is a single
// Blobs read). Runs only on the published production deploy.
export const config: Config = {
  schedule: "*/10 * * * *",
};
