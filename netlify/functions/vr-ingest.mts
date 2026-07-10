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
//        body: { congress?, chamber?: "house"|"senate", limit?, classifyIssues? }
//   POST /seed-issues   apply the curated measure→issue mappings (db/vr-issue-seed.json)
//                       onto measures that already exist — no Congress.gov key needed

import type { Config } from "@netlify/functions";
import { applyCuratedIssueSeed, runIngest, verify } from "../lib/vr-ingest.js";

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

    if (method === "POST" && (path === "" || path === "/run")) {
      let body: any = {};
      try { body = await req.json(); } catch { body = {}; }
      const congress = Number(body.congress || process.env.VR_INGEST_CONGRESS || 119);
      const chamber = String(body.chamber || "house").toLowerCase();
      if (chamber !== "house" && chamber !== "senate") return json({ error: "chamber must be house or senate" }, 400);
      const limit = Math.min(Math.max(Number(body.limit) || 40, 1), 250);
      const classifyIssues = body.classifyIssues === true;
      const report = await runIngest({ congress, chamber, limit, classifyIssues });
      return json({ ran: true, congress, chamber, limit, classifyIssues, report });
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
