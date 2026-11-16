// ─────────────────────────────────────────────────────────────────────────────
// Action layer v1 — scheduled bill topic sorter + raw vote mapping generator
// ─────────────────────────────────────────────────────────────────────────────
// Hourly, at :23. Runs PARALLEL to the stance generator (raw-ingest-cron, every
// minute) and shares none of its caps, rotation, Locker or promotion: the cost
// here is per roll call (one member list covers every politician on it), so the
// limit is roll calls per run (MAX_ROLLS_PER_RUN) inside a time budget, not
// politicians per run. Logic: netlify/lib/vote-actions-core.ts.
//
// Writes only pdx_action_bills / pdx_vote_actions (+ its own Blobs ledger,
// "vote-actions-state", and the unmodified source payloads, "raw-ingest-votes"). Nothing public reads them; no score, no direction, no
// contradiction flag, no curated card or stance store is touched.
//
// Without CONGRESS_GOV_API_KEY the House side is skipped (logged) and the Senate
// side still runs from senate.gov with vote-document titles only.
//   VOTE_ACTIONS_DISABLED=1   — turn the job off without a deploy
//   VOTE_ACTIONS_LOOKBACK_DAYS — "recent" window (default 120)
import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { runVoteActions, summaryLine, STATE_STORE_NAME, STATE_KEY, LOOKBACK_DAYS, RAW_VOTES_STORE_NAME } from "../lib/vote-actions-core.js";
import { voteActionsRepo } from "../lib/vote-actions-db.js";
import { loadMemberMap } from "../lib/vr-ingest.js";

export default async (): Promise<void> => {
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

  const lookback = Number(process.env.VOTE_ACTIONS_LOOKBACK_DAYS);
  const { report, state } = await runVoteActions({
    fetch,
    repo: voteActionsRepo,
    state: doc,
    memberMap: await loadMemberMap(),
    rawStore,
    apiKey: process.env.CONGRESS_GOV_API_KEY || null,
    lookbackDays: Number.isFinite(lookback) && lookback > 0 ? Math.min(lookback, 730) : LOOKBACK_DAYS,
  });
  try { await store.setJSON(STATE_KEY, state); }
  catch (e: any) { console.log(`vote-actions: state not saved — ${e?.message || e}`); }
  console.log(summaryLine(report));
  for (const err of report.errors.slice(0, 10)) console.log(`vote-actions: ERROR ${err}`);
};

export const config: Config = {
  schedule: "23 * * * *",
};
