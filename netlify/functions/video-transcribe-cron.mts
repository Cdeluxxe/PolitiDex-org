import type { Config } from "@netlify/functions";

// ──────────────────────────────────────────────────────────────────────────
// Video transcriber — scheduled wake (every 10 minutes)
// ──────────────────────────────────────────────────────────────────────────
// video-transcribe.mts is a BACKGROUND function (a batch of videos takes
// minutes, far past the 30 s limit of a scheduled function), and Netlify does
// not allow `schedule` on a background function. Until now it only ran when
// something woke it: the raw-ingest cron (only on a run that queued new videos)
// or its own self-wake chain (which deliberately stops after a run where most
// Gemini calls failed). Once that chain stopped, nothing restarted it and the
// queue sat untouched.
//
// This function is the visible schedule + "Run now" button for that worker.
// It does nothing but send the same POST the raw-ingest cron sends. The
// worker keeps its own batch size, lock, transcription, scoring, Evidence
// Locker writes and queue handling exactly as before; if a run is already
// going, the worker lock turns this wake into a no-op.
//
// Every 10 minutes (was 15): a 4-video run with 18 s between Gemini calls
// takes ~1–4 minutes, so a run normally ends before the next wake; one that
// runs long (11-min budget) still holds the 15-min worker lock, so the wake
// that overlaps it is a no-op. A run that dies leaves a lock that expires
// after 15 min, i.e. at most two wakes are skipped.

export default async (): Promise<void> => {
  const origin = process.env.URL || "https://politidex.fyi";
  try {
    const r = await fetch(`${origin}/.netlify/functions/video-transcribe`, { method: "POST", signal: AbortSignal.timeout(10_000) });
    console.log(`video-transcribe-cron: worker woken (HTTP ${r.status})`);
  } catch (e: any) {
    console.log(`video-transcribe-cron: worker not woken — ${e?.message || e}`);
  }
};

export const config: Config = {
  schedule: "*/10 * * * *",
};
