import type { Config } from "@netlify/functions";

// ──────────────────────────────────────────────────────────────────────────
// Provisions generator — scheduled wake (every 30 minutes)
// ──────────────────────────────────────────────────────────────────────────
// bill-provisions.mts is a BACKGROUND function (one model call per bill, ~60
// bills a run), and Netlify does not allow `schedule` on a background function.
// This sends the POST that wakes it. The worker keeps its own lock, queue and
// checks; a wake while a run is going is a no-op. Once every generated page has
// a current section (or a recorded reason it cannot have one), a run reads one
// state blob, finds nothing to do and ends — no model call is made.

export default async (): Promise<void> => {
  const origin = process.env.URL || "https://politidex.fyi";
  try {
    const r = await fetch(`${origin}/.netlify/functions/bill-provisions`, { method: "POST", signal: AbortSignal.timeout(10_000) });
    console.log(`bill-provisions-cron: worker woken (HTTP ${r.status})`);
  } catch (e: any) {
    console.log(`bill-provisions-cron: worker not woken — ${e?.message || e}`);
  }
};

export const config: Config = {
  schedule: "*/30 * * * *",
};
