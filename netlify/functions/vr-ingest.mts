// ─────────────────────────────────────────────────────────────────────────────
// Voting Record — authenticated on-demand ingest + verification · Phase 7
// ─────────────────────────────────────────────────────────────────────────────
// The manual counterpart to vr-ingest-cron: an admin/CI endpoint for triggering a
// bulk ingest and for verifying the integrity of the vr_* tables. It is NOT part
// of the public read path (voting-record.mts) — it is gated behind a bearer token
// so only an operator (or the CLI in scripts/vr-ingest.mjs) can call it.
//
// AUTH: every route requires `Authorization: Bearer <VR_INGEST_TOKEN>`. When
// VR_INGEST_TOKEN is unset the endpoint is DISABLED (503) rather than open — the
// same safe-by-default posture as the rest of the feature. The token is a private
// operator secret set in the Netlify environment; it is never returned or logged.
//
// Routes (all under /api/vr-ingest):
//   GET  /verify        integrity report (row counts + source/issue-key checks)
//   POST /              run an ingest
//        body: { congress?, chamber?: "house"|"senate", limit?, offset?, recent?, classifyIssues? }
//   POST /seed-issues   apply the curated measure→issue mappings (db/vr-issue-seed.json)
//                       onto measures that already exist — no Congress.gov key needed
//
// Automatic mapping proposals (netlify/lib/vr-issue-proposals.ts) — same bearer gate:
//   GET  /proposals                 the review queue
//        ?status=proposed (default) | reviewed | rejected | curated | all, &limit=1..500
//   POST /proposals/:id/review      promote a proposal to a normal mapping
//        body: { issueKey?, weight (0..100), supportMeaning ("yea_supports"|"yea_opposes"),
//                isPrimary?, rationale?, sourceUrl?, reviewer? }
//   POST /proposals/:id/reject      turn a proposal down (kept, so it is not re-proposed)
//        body: { note?, reviewer? }
//   POST /propose-issues            propose for named measures that have no mapping yet
//        body: { measureIds: number[] }   (the ingest does this automatically per run)
// Only rows in status 'proposed' can be reviewed or rejected; curated and reviewed
// mappings are never edited here. Each review/proposal re-packs the affected members.

import type { Config } from "@netlify/functions";
import { applyCuratedIssueSeed, runIngest, verify } from "../lib/vr-ingest.js";
import {
  listProposalQueue,
  proposeIssuesForMeasures,
  rejectIssueProposal,
  reviewIssueProposal,
} from "../lib/vr-issue-proposals-db.js";
import { REVIEW_STATUSES } from "../lib/vr-review-status.js";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Bearer-token gate. Returns null when authorized, or a Response to short-circuit.
function guard(req: Request): Response | null {
  const token = process.env.VR_INGEST_TOKEN;
  if (!token) return json({ error: "Ingest disabled: VR_INGEST_TOKEN not configured" }, 503);
  const header = req.headers.get("authorization") || "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m || m[1] !== token) return json({ error: "Unauthorized" }, 401);
  return null;
}

export default async (req: Request): Promise<Response> => {
  const denied = guard(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/vr-ingest/, "").replace(/\/+$/, "");
  const method = req.method.toUpperCase();

  try {
    if (method === "GET" && (path === "/verify" || path === "")) {
      return json(await verify());
    }

    if (method === "POST" && path === "/seed-issues") {
      return json({ ran: true, seed: await applyCuratedIssueSeed() });
    }

    if (method === "GET" && path === "/proposals") {
      const statusParam = (url.searchParams.get("status") || "proposed").toLowerCase();
      if (statusParam !== "all" && !REVIEW_STATUSES.has(statusParam)) {
        return json({ error: "status must be proposed, reviewed, rejected, curated or all" }, 400);
      }
      const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 100, 1), 500);
      const items = await listProposalQueue(statusParam === "all" ? null : statusParam, limit);
      return json({ status: statusParam, count: items.length, items });
    }

    const reviewMatch = path.match(/^\/proposals\/(\d+)\/(review|reject)$/);
    if (method === "POST" && reviewMatch) {
      let body: any = {};
      try { body = await req.json(); } catch { body = {}; }
      const id = Number(reviewMatch[1]);
      const result = reviewMatch[2] === "review"
        ? await reviewIssueProposal(id, body)
        : await rejectIssueProposal(id, body);
      if (result.ok === false) return json({ error: result.error }, result.status);
      return json({ ok: true, row: result.row, packsWritten: result.packsWritten, errors: result.errors });
    }

    if (method === "POST" && path === "/propose-issues") {
      let body: any = {};
      try { body = await req.json(); } catch { body = {}; }
      const ids = Array.isArray(body.measureIds)
        ? body.measureIds.map(Number).filter((n: number) => Number.isInteger(n) && n > 0)
        : [];
      if (!ids.length) return json({ error: "measureIds must be a non-empty array of measure ids" }, 400);
      if (ids.length > 500) return json({ error: "at most 500 measureIds per call" }, 400);
      return json({ ran: true, proposals: await proposeIssuesForMeasures(ids) });
    }

    if (method === "POST" && (path === "" || path === "/run")) {
      let body: any = {};
      try { body = await req.json(); } catch { body = {}; }
      const congress = Number(body.congress || process.env.VR_INGEST_CONGRESS || 119);
      const chamber = String(body.chamber || "house").toLowerCase();
      if (chamber !== "house" && chamber !== "senate") return json({ error: "chamber must be house or senate" }, 400);
      const limit = Math.min(Math.max(Number(body.limit) || 40, 1), 250);
      // `offset` pages the source list; `recent: true` date-sorts it first (the
      // Congress.gov vote list has no documented order, so without this a repeat run
      // re-fetches the same arbitrary slice). Both default off — existing callers and
      // the scheduled ingest behave exactly as before.
      const offset = Math.max(Number(body.offset) || 0, 0);
      const recent = body.recent === true;
      const classifyIssues = body.classifyIssues === true;
      const report = await runIngest({ congress, chamber, limit, offset, recent, classifyIssues });
      return json({ ran: true, congress, chamber, limit, offset, recent, classifyIssues, report });
    }

    return json({ error: "Not found" }, 404);
  } catch (e: any) {
    console.error("vr-ingest error:", e);
    return json({ error: "Server error", detail: e?.message || String(e) }, 500);
  }
};

export const config: Config = {
  path: ["/api/vr-ingest", "/api/vr-ingest/*"],
};
