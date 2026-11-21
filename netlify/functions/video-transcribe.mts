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
// the chain stops. Gemini calls run one at a time, 1.5 s apart. A worker
// lock in the store keeps runs from overlapping, so an extra wake only costs
// a lock check. The function takes no input — it only
// works the queue.

import { processTranscriptQueue, scoreIntoLocker, nameFromId, TRANSCRIPT_STORE_NAME } from "../lib/video-transcripts.mjs";
import { RAW_STORE_NAME, ROSTER, RESOLVER_PEOPLE } from "../lib/raw-ingest-core.mjs";
import { loadReviewFlags, LOCKER_STORE_NAME } from "../lib/evidence-locker-core.mjs";
import groundTruth from "../../db/stance-ground-truth-talarico-cost-of-living.json" with { type: "json" };
import reviewFile from "../../db/evidence-locker-review.json" with { type: "json" };

const NAMES = new Map<string, string>();
for (const r of ROSTER as any[]) if (r?.politician_id && r?.name) NAMES.set(r.politician_id, r.name);
export const politicianName = (pid: string): string => NAMES.get(pid) || (RESOLVER_PEOPLE as any)[pid]?.n || nameFromId(pid);

// A run where more than half of its transcription calls failed (retry-later or
// given up) is most likely being rate-limited: it does not wake the next run.
// The queue stays put and the next cron wake (or a later run) picks it up.
export const MAX_FAILURE_SHARE = 0.5;
export function tooManyFailures(summary: any): boolean {
  const failures = (Number(summary?.failed) || 0) + (Number(summary?.retry_later) || 0);
  const calls = failures + (Number(summary?.transcribed) || 0);
  return calls > 0 && failures / calls > MAX_FAILURE_SHARE;
}

export async function transcribeRun(deps: { store?: any; rawStore?: any; lockerStore?: any; generate?: any; log?: (l: string) => void; wake?: () => Promise<void>; sleep?: (ms: number) => Promise<void>; callDelayMs?: number } = {}) {
  const log = deps.log ?? ((l: string) => console.log(l));
  const lockerStore = deps.lockerStore ?? getStore(LOCKER_STORE_NAME);
  const flags = loadReviewFlags(reviewFile);
  const writes: any[] = [];
  const summary = await processTranscriptQueue({
    store: deps.store ?? getStore(TRANSCRIPT_STORE_NAME),
    rawStore: deps.rawStore ?? getStore(RAW_STORE_NAME),
    nameOf: politicianName,
    ...(deps.generate ? { generate: deps.generate } : {}),
    ...(deps.sleep ? { sleep: deps.sleep } : {}),
    ...(deps.callDelayMs !== undefined ? { callDelayMs: deps.callDelayMs } : {}),
    log,
    onRecord: async (rec: any) => {
      const r = await scoreIntoLocker(rec, { lockerStore, gt: groundTruth, flags, log });
      writes.push(...r.writes);
    },
  });
  log(`video-transcribe: ${writes.length} Evidence Locker item(s) written${writes.length ? ` (${writes.map((w) => `${w.politician_id}|${w.topic} ${w.strength}`).join(", ")})` : ""}`);
  // More waiting and this run got through some: hand the rest to a fresh run.
  const progressed = summary.transcribed + summary.cache_hits + summary.failed + summary.retry_later > 0;
  if (!summary.locked && summary.remaining > 0 && progressed) {
    if (tooManyFailures(summary)) {
      log(`video-transcribe: ${summary.failed + summary.retry_later} of ${summary.failed + summary.retry_later + summary.transcribed} transcription call(s) failed — not waking the next run`);
      return { ...summary, writes };
    }
    try { await (deps.wake ?? wakeSelf)(); } catch (e: any) { log(`video-transcribe: next run not woken — ${e?.message || e}`); }
  }
  return { ...summary, writes };
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
