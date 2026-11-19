// ─────────────────────────────────────────────────────────────────────────────
// pipeline-positions — which pipeline positions a person file shows, at the edge
// ─────────────────────────────────────────────────────────────────────────────
// Pipeline positions are the stance cards the raw-ingest cron promotes from
// Evidence Locker items into pdx_stated_positions. The person file reads them
// from GET /api/stated-positions and merges them into the curated list in
// stance-helpers.js (_resolveStanceListMerged), so the page's position count is
// the curated cards plus one pipeline card per issue key the curated list does
// not carry — curated always wins.
//
// Three edge surfaces have to count the same thing the page counts:
//   · /sitemap.xml          the floor merge (sitemap-person-pipeline.ts)
//   · the person share card  og:description and the card footnote
//   · the person crawl block the line naming how many positions are on file
// So this module holds the one counting rule they share (pipelineFill) and the
// one read they share (pipelineKeys): GET /api/stated-positions?view=keys, held
// for PIPELINE_TTL_MS inside a warm isolate, one in-flight request shared, every
// failure soft (an empty answer, so each surface prints the curated count only).
//
// No Blobs and no database here; `fetch` is the only I/O.

export type PipelineKeys = Record<string, string[]>;

export const PIPELINE_KEYS_PATH = "/api/stated-positions?view=keys";
export const PIPELINE_TTL_MS = 5 * 60_000;
export const PIPELINE_TIMEOUT_MS = 2000;

// The pipeline cards a file shows: the first id (in stance-helpers.js's
// _pipelineFor order — the pid, then its alias and display-name slug) that has
// any, minus the issue keys the curated list already carries, one per key.
export function pipelineFill(keys: PipelineKeys | null | undefined, ids: string[], curatedKeys: string[] = []): string[] {
  if (!keys) return [];
  let list: string[] | null = null;
  for (const id of ids || []) {
    if (id && Array.isArray(keys[id]) && keys[id].length) { list = keys[id]; break; }
  }
  if (!list) return [];
  const taken = new Set(curatedKeys || []);
  const out: string[] = [];
  for (const k of list) {
    if (typeof k !== "string" || !k || taken.has(k)) continue;
    taken.add(k);
    out.push(k);
  }
  return out;
}

let _cache: { at: number; data: PipelineKeys | null } | null = null;
let _inflight: Promise<PipelineKeys | null> | null = null;

export function resetPipelineKeys(): void {
  _cache = null;
  _inflight = null;
}

// The live keys, or null when they could not be read in time.
export async function pipelineKeys(origin: string): Promise<PipelineKeys | null> {
  const now = Date.now();
  if (_cache && now - _cache.at < PIPELINE_TTL_MS) return _cache.data;
  if (_inflight) return _inflight;
  _inflight = (async () => {
    let data: PipelineKeys | null = null;
    try {
      const res = await fetch(origin + PIPELINE_KEYS_PATH, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(PIPELINE_TIMEOUT_MS),
      });
      if (res.ok) {
        const body: any = await res.json();
        if (body && body.keys && typeof body.keys === "object") data = body.keys as PipelineKeys;
      }
    } catch { data = null; }
    // A failed read is remembered briefly, so a cold database is not asked once
    // per request; a success is remembered for the full window.
    _cache = { at: data ? Date.now() : Date.now() - PIPELINE_TTL_MS + 15_000, data };
    return data;
  })().finally(() => { _inflight = null; });
  return _inflight;
}
