// GET /api/admin/raw-ingest-coverage — the stance generator's coverage gap
// report (netlify/lib/raw-ingest-coverage.mjs), for the curator only (the
// existing /admin Firebase login, verified server-side). READ-ONLY: it lists
// the Evidence Locker and reads the frontier; it never writes, scores or
// promotes anything.
//   ?min_strong=N        politicians under N strong items (default 3)
//   ?min_politicians=N   topics with strong items for under N politicians (default 5)
import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { requireAdmin } from "../lib/admin-auth.mjs";
import { ROSTER, ROTATION_STORE_NAME } from "../lib/raw-ingest-core.mjs";
import { lockerBaselineCounts, loadReviewFlags, LOCKER_STORE_NAME } from "../lib/evidence-locker-core.mjs";
import { readFreshState } from "../lib/raw-ingest-fresh.mjs";
import { coverageGaps, GAP_MIN_STRONG, GAP_MIN_POLITICIANS } from "../lib/raw-ingest-coverage.mjs";
import reviewFile from "../../db/evidence-locker-review.json" with { type: "json" };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const intParam = (url: URL, k: string, d: number) => {
  const n = Number(url.searchParams.get(k));
  return Number.isInteger(n) && n > 0 && n <= 1000 ? n : d;
};

export async function handle(req: Request, deps: { lockerStore?: any; rotationStore?: any; auth?: any; roster?: any[]; now?: () => Date } = {}): Promise<Response> {
  const who = await requireAdmin(req, deps.auth);
  if (!who.ok) return json(who.status, { error: who.status === 401 ? "sign in required" : "not the curator account" });
  const url = new URL(req.url);
  const roster = deps.roster ?? ROSTER;
  const notes: string[] = [];
  const log = (l: string) => notes.push(l);
  const counts = await lockerBaselineCounts(deps.lockerStore ?? getStore(LOCKER_STORE_NAME), {
    flags: loadReviewFlags(reviewFile), pids: roster.map((r: any) => r.politician_id), log,
  });
  const fresh = await readFreshState(deps.rotationStore ?? getStore(ROTATION_STORE_NAME), log);
  const report = coverageGaps({
    roster, counts, frontier: fresh.frontier,
    minStrong: intParam(url, "min_strong", GAP_MIN_STRONG),
    minPoliticians: intParam(url, "min_politicians", GAP_MIN_POLITICIANS),
    now: (deps.now ?? (() => new Date()))(),
  });
  return json(200, { ...report, ...(notes.length ? { notes } : {}) });
}

export default (req: Request) => handle(req);

export const config: Config = {
  path: "/api/admin/raw-ingest-coverage",
  method: ["GET"],
};
