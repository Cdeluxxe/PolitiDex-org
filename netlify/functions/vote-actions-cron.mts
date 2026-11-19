// ─────────────────────────────────────────────────────────────────────────────
// Action layer v1 — scheduled bill topic sorter + raw vote mapping generator
// ─────────────────────────────────────────────────────────────────────────────
// Hourly, at :23. Runs PARALLEL to the stance generator (raw-ingest-cron, every
// minute) and shares none of its caps, rotation, Locker or promotion: the cost
// here is per roll call (one member list covers every politician on it), so the
// limit is roll calls per run (MAX_ROLLS_PER_RUN) and pages per run
// (PAGES_PER_RUN) inside a time budget, not politicians per run.
// Logic: netlify/lib/vote-actions-core.ts.
//
// Every run re-discovers the target Congress's roll calls (the sitting 119th
// first, then each older Congress once the newer one is complete), tags each
// voted-on bill, stores its vote rows and generates its public bill page.
//
// Writes only pdx_action_bills / pdx_vote_actions (+ its own Blobs ledger and
// per-Congress progress, "vote-actions-state"; the unmodified source payloads,
// "raw-ingest-votes"; and the generated bill page records, "bill-pages", which
// the /b/ document reads, plus that store's one page index, "index/pages-v1",
// which site search and the person file's sponsored-bills list read). No score, no direction, no contradiction flag, no
// curated card or stance store is touched.
//
// Without CONGRESS_GOV_API_KEY the House side is skipped (logged), the Senate
// side still runs from senate.gov with vote-document titles only, and no
// Congress is marked complete (Congress.gov is the record of what exists).
//   VOTE_ACTIONS_DISABLED=1   — turn the job off without a deploy
import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { runVoteActions, summaryLine, STATE_STORE_NAME, STATE_KEY, RAW_VOTES_STORE_NAME } from "../lib/vote-actions-core.js";
import { BILL_PAGES_STORE_NAME } from "../lib/vote-actions-pages.js";
import { voteActionsRepo } from "../lib/vote-actions-db.js";
import { loadMemberMap } from "../lib/vr-ingest.js";
import { refreshBillPagesIndex } from "../lib/bill-pages-index.js";
import { groupOf } from "../../scripts/bill-record-core.mjs";
import billDocsFile from "../../db/bill-docs.json" with { type: "json" };

// Bills the build-time snapshot already gives a page: "<sitting>|<number>".
const SNAPSHOT_PAGES = new Set(Object.keys((billDocsFile as any).docs || {}));

export default async (): Promise<void> => {
  const startedAt = Date.now();
  if (process.env.VOTE_ACTIONS_DISABLED === "1") {
    console.log("vote-actions: disabled (VOTE_ACTIONS_DISABLED=1) — no-op.");
    return;
  }
  const store = getStore(STATE_STORE_NAME);
  let doc: any = null;
  try { doc = await store.get(STATE_KEY, { type: "json" }); }
  catch (e: any) { console.log(`vote-actions: state unreadable — starting fresh (${e?.message || e})`); }

  // Raw payloads (unmodified Congress.gov / senate.gov bodies) are kept in a
  // sibling store before parsing. Unavailable store → the run still writes rows.
  let rawStore: any = null;
  try { rawStore = getStore(RAW_VOTES_STORE_NAME); }
  catch (e: any) { console.log(`vote-actions: raw store unavailable — rows only this run (${e?.message || e})`); }
  let pageStore: any = null;
  try { pageStore = getStore(BILL_PAGES_STORE_NAME); }
  catch (e: any) { console.log(`vote-actions: page store unavailable — no pages this run (${e?.message || e})`); }

  const { report, state } = await runVoteActions({
    fetch,
    repo: voteActionsRepo,
    state: doc,
    memberMap: await loadMemberMap(),
    rawStore,
    pageStore,
    existingPages: SNAPSHOT_PAGES,
    apiKey: process.env.CONGRESS_GOV_API_KEY || null,
  });
  try { await store.setJSON(STATE_KEY, state); }
  catch (e: any) { console.log(`vote-actions: state not saved — ${e?.message || e}`); }
  console.log(summaryLine(report));
  for (const err of report.errors.slice(0, 10)) console.log(`vote-actions: ERROR ${err}`);
  // The page index (Blobs "bill-pages", key "index/pages-v1"): one small record
  // of every generated page, read by the edge so site search and the person
  // file's sponsored-bills list include generated pages (bill-pages-index.ts).
  // Refreshed from the store itself, by etag, so it heals on its own.
  // Inside what is left of the ~30 s a scheduled function gets; a backlog is
  // worked off over the next runs.
  const left = 27_000 - (Date.now() - startedAt);
  if (pageStore && left > 1500) {
    await refreshBillPagesIndex(pageStore, { groupOf, budgetMs: left - 1000, log: (l) => console.log(l) });
  }
};

export const config: Config = {
  schedule: "23 * * * *",
};
