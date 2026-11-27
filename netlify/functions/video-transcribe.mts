import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// ──────────────────────────────────────────────────────────────────────────
// Background video transcriber
// ──────────────────────────────────────────────────────────────────────────
// Works the transcript queue the raw-ingest cron fills (video-transcripts.mjs):
// each queued own-channel YouTube video is transcribed once (Gemini via the
// Netlify AI Gateway, which reads the public YouTube URL itself), cached by
// video id, and — when the politician speaks in it — stored as a page-shaped
// raw record and run through the SAME scorer + Evidence Locker writer as a
// campaign page (logCandidateStances → maybeWriteLockerItem). Locker items
// from a video link to the second the cited words are spoken.
//
// Background mode: transcription takes 10–45 s a video, so it runs here (up to
// 15 minutes) and not inside the every-minute cron (30 s). The cron wakes this
// function when a run queued videos; a run that leaves work in the queue wakes
// the next one — unless most of its calls failed (likely a Gemini 429), then
// the chain stops. A run takes up to 3 videos (TRANSCRIBE_PER_RUN) and the
// scheduled wake comes every 3 minutes: ~3 videos every 3–4 minutes. No call
// starts past the 11-min budget and each call is cut off after 2.5 min, so
// the queue work ends inside the 15-min lock. Gemini calls run one at a time, 18 s apart
// (TRANSCRIBE_CALL_DELAY_MS), and a self-wake waits the same pause first so
// the next run's first call is not back-to-back with this run's last. A worker
// lock in the store keeps runs from overlapping, so an extra wake only costs
// a lock check. The function takes no input — it only
// works the queue. Background functions cannot carry a schedule, so the
// every-10-minute schedule (and the "Run now" button) live on
// video-transcribe-cron.mts, which only wakes this function.

import { processTranscriptQueue, scoreIntoLocker, nameFromId, acquireLock, releaseLock, TRANSCRIPT_STORE_NAME, TRANSCRIBE_CALL_DELAY_MS } from "../lib/video-transcripts.mjs";
import { repairStep, LINK_REPAIR_STATE_KEY, LINK_REPAIR_BUDGET_MS } from "../lib/video-link-repair.mjs";
import { processReprocessRequests, scoreRecordIntoLocker } from "../lib/video-reprocess.mjs";
import { RETIRED_STORE_NAME } from "../lib/locker-rescore.mjs";
import reprocessFile from "../../db/video-reprocess.json" with { type: "json" };
import { chamberForRow } from "../lib/raw-ingest-video.mjs";
import { lockerEntriesFor, syncPolitician } from "../lib/stated-positions-core.mjs";
import VS_MEMBER_MAP from "../../db/vr-member-map.json" with { type: "json" };
import { RAW_STORE_NAME, ROSTER, RESOLVER_PEOPLE } from "../lib/raw-ingest-core.mjs";
import { loadReviewFlags, LOCKER_STORE_NAME } from "../lib/evidence-locker-core.mjs";
// Every locked ground-truth label (not only Talarico | cost of living): a clear
// read that contradicts one is never written to the Locker.
import { LOCKED_GROUND_TRUTH_INDEX as groundTruth } from "../lib/locked-ground-truth.mjs";
import reviewFile from "../../db/evidence-locker-review.json" with { type: "json" };

const NAMES = new Map<string, string>();
for (const r of ROSTER as any[]) if (r?.politician_id && r?.name) NAMES.set(r.politician_id, r.name);
export const politicianName = (pid: string): string => NAMES.get(pid) || (RESOLVER_PEOPLE as any)[pid]?.n || nameFromId(pid);

// Roster tier per politician: the transcript queue's tiebreak after video kind.
const TIERS = new Map<string, number>();
for (const r of ROSTER as any[]) if (r?.politician_id && !TIERS.has(r.politician_id)) TIERS.set(r.politician_id, Number(r.tier));
export const politicianTier = (pid: string): number | null => TIERS.get(pid) ?? null;

// Chamber per politician (member map, else the official host on the roster
// row) — names a C-SPAN item for the right chamber in the link repair pass.
const MEMBERS = new Map<string, any>();
for (const m of ((VS_MEMBER_MAP as any).members || [])) if (m?.slug && (m.serving119 !== false || !MEMBERS.has(m.slug))) MEMBERS.set(m.slug, m);
const CHAMBERS = new Map<string, string | null>();
for (const r of ROSTER as any[]) if (r?.politician_id && !CHAMBERS.has(r.politician_id)) CHAMBERS.set(r.politician_id, chamberForRow(r, MEMBERS.get(r.politician_id) || null));
export const politicianChamber = (pid: string): string | null => CHAMBERS.get(pid) ?? null;

// The whole run must end inside the 15-minute background limit: the link
// repair pass gets what the queue left, up to its own budget.
export const RUN_LIMIT_MS = 13 * 60_000;

// A run where more than half of its transcription calls failed (retry-later or
// given up) is most likely being rate-limited: it does not wake the next run.
// The queue stays put and the next cron wake (or a later run) picks it up.
export const MAX_FAILURE_SHARE = 0.5;
export function tooManyFailures(summary: any): boolean {
  const failures = (Number(summary?.failed) || 0) + (Number(summary?.retry_later) || 0);
  const calls = failures + (Number(summary?.transcribed) || 0);
  return calls > 0 && failures / calls > MAX_FAILURE_SHARE;
}

export async function transcribeRun(deps: { store?: any; rawStore?: any; lockerStore?: any; retiredStore?: any; generate?: any; log?: (l: string) => void; wake?: () => Promise<void>; sleep?: (ms: number) => Promise<void>; callDelayMs?: number; callTimeoutMs?: number; clock?: () => number; repair?: boolean; sync?: ((pid: string) => Promise<void>) | null; reprocess?: any } = {}) {
  const clock = deps.clock ?? Date.now;
  const startedAt = clock();
  const log = deps.log ?? ((l: string) => console.log(l));
  const lockerStore = deps.lockerStore ?? getStore(LOCKER_STORE_NAME);
  const flags = loadReviewFlags(reviewFile);
  const writes: any[] = [];
  const transcriptStore = deps.store ?? getStore({ name: TRANSCRIPT_STORE_NAME, consistency: "strong" });
  const rawStore = deps.rawStore ?? getStore(RAW_STORE_NAME);
  // On-demand re-processing (db/video-reprocess.json): each request once.
  // Re-transcriptions join the queue below; rescoring runs here.
  const retiredStore = deps.retiredStore ?? (deps.lockerStore ? null : getStore(RETIRED_STORE_NAME));
  let reprocessSync: any;
  const syncFor = async (pid: string) => {
    if (deps.sync !== undefined) { if (deps.sync) await deps.sync(pid); return; }
    if (reprocessSync === undefined) reprocessSync = await statedSync(lockerStore, flags, log);
    if (reprocessSync) await reprocessSync(pid);
  };
  const reprocessed = await processReprocessRequests(deps.reprocess ?? reprocessFile, { transcriptStore, rawStore, lockerStore, retiredStore, flags, gt: groundTruth, log, sync: syncFor })
    .catch((e: any) => { log(`video-reprocess: error — ${e?.message || e}`); return { done: [], skipped: [] }; });
  const summary = await processTranscriptQueue({
    // Strong consistency: a run woken right after another one finished must not
    // list the queue entries (or the worker lock) that run just deleted. With
    // the default eventual consistency it did: the next run "picked" 4 deleted
    // entries, made no progress, and so never woke the run after it.
    store: transcriptStore,
    rawStore,
    nameOf: politicianName,
    tierOf: politicianTier,
    ...(deps.generate ? { generate: deps.generate } : {}),
    ...(deps.sleep ? { sleep: deps.sleep } : {}),
    ...(deps.callDelayMs !== undefined ? { callDelayMs: deps.callDelayMs } : {}),
    ...(deps.callTimeoutMs !== undefined ? { callTimeoutMs: deps.callTimeoutMs } : {}),
    clock,
    log,
    onRecord: async (rec: any) => {
      // A re-transcribed video: its existing items are re-read first (moved, never doubled).
      const r = rec?.retranscribed
        ? await scoreRecordIntoLocker(rec, { lockerStore, rawStore, retiredStore, gt: groundTruth, flags, log })
        : await scoreIntoLocker(rec, { lockerStore, gt: groundTruth, flags, log });
      writes.push(...r.writes);
      if (rec?.retranscribed && ((r as any).rescored?.rescored || (r as any).rescored?.retired)) {
        try { await syncFor(rec.politician_id); } catch (e: any) { log(`video-reprocess: stated positions for ${rec.politician_id} recompute later — ${e?.message || e}`); }
      }
    },
  });
  log(`video-transcribe: ${writes.length} Evidence Locker item(s) written${writes.length ? ` (${writes.map((w) => `${w.politician_id}|${w.topic} ${w.strength}`).join(", ")})` : ""}`);
  // One-time Locker pass: timestamp links cut from clock-digit transcripts and
  // C-SPAN chamber labels (video-link-repair.mjs). Under the worker lock, in
  // what is left of the run; a finished pass only retries pending resyncs.
  if (!summary.locked && deps.repair !== false) {
    const budgetMs = Math.min(LINK_REPAIR_BUDGET_MS, RUN_LIMIT_MS - (clock() - startedAt));
    if (budgetMs > 30_000 && await acquireLock(transcriptStore, Date.now())) {
      try {
        const prev = await transcriptStore.get(LINK_REPAIR_STATE_KEY, { type: "json" }).catch(() => null);
        if (!(prev?.done && !(prev.pending_sync || []).length)) {
          // Lazy: the database is only opened when some politician's items moved.
          let real: any;
          const sync = deps.sync !== undefined ? deps.sync : async (pid: string) => {
            if (real === undefined) real = await statedSync(lockerStore, flags, log);
            if (!real) throw new Error("database unavailable");
            await real(pid);
          };
          const next = await repairStep(prev, { lockerStore, transcriptStore, flags, chamberOf: politicianChamber, sync, budgetMs, log });
          await transcriptStore.setJSON(LINK_REPAIR_STATE_KEY, { ...next, updated_at: new Date().toISOString() });
        }
      } catch (e: any) {
        log(`video-link-repair: error — ${e?.message || e} (the next run resumes)`);
      } finally {
        await releaseLock(transcriptStore);
      }
    }
  }
  // More waiting and this run got through some: hand the rest to a fresh run.
  const progressed = summary.transcribed + summary.cache_hits + summary.failed + summary.retry_later > 0;
  if (!summary.locked && summary.remaining > 0 && progressed) {
    if (tooManyFailures(summary)) {
      log(`video-transcribe: ${summary.failed + summary.retry_later} of ${summary.failed + summary.retry_later + summary.transcribed} transcription call(s) failed — not waking the next run`);
      return { ...summary, writes };
    }
    // Same pause as between calls, so the next run's first call does not land
    // straight after this run's last one (tokens-per-minute limit).
    const pause = deps.callDelayMs ?? TRANSCRIBE_CALL_DELAY_MS;
    if (pause > 0) await (deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms))))(pause);
    try { await (deps.wake ?? wakeSelf)(); } catch (e: any) { log(`video-transcribe: next run not woken — ${e?.message || e}`); }
  }
  return { ...summary, writes, reprocessed };
}

// Recompute a politician's stated-position cards after their Locker items
// moved (same as locker-rescore-cron). Null when the database is unavailable:
// the repair keeps those politicians pending for a later run.
async function statedSync(lockerStore: any, flags: any, log: (l: string) => void): Promise<((pid: string) => Promise<void>) | null> {
  try {
    const [{ db: client }, { pdxStatedPositions }, orm, { dbAdapter }] = await Promise.all([
      import("../../db/index.js"), import("../../db/schema.js"), import("drizzle-orm"), import("../lib/stated-positions-core.mjs"),
    ]);
    const db = (dbAdapter as any)(client, pdxStatedPositions, orm);
    return async (pid: string) => { await syncPolitician(pid, await lockerEntriesFor(lockerStore, pid, flags), { db, log }); };
  } catch (e: any) {
    log(`video-link-repair: database unavailable — moved items' stated positions recompute on a later run (${e?.message || e})`);
    return null;
  }
}

async function wakeSelf(): Promise<void> {
  const origin = process.env.URL || "https://politidex.fyi";
  await fetch(`${origin}/.netlify/functions/video-transcribe`, { method: "POST", signal: AbortSignal.timeout(4_000) });
}

export default async (): Promise<void> => {
  await transcribeRun();
};

export const config: Config = {
  background: true,
};
