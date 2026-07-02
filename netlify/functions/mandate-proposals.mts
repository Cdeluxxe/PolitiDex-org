// ─────────────────────────────────────────────────────────────────────────────
// The People's Mandate — community reform proposals API ("Forging Tomorrow")
// ─────────────────────────────────────────────────────────────────────────────
// The participation layer behind the Mandate page. It lets any visitor submit a
// reform idea, lists what the community has proposed, and records one-click
// support so proposals can be ranked by how many people back them.
//
// Storage is Netlify Database (managed Postgres) via Drizzle — the same stack the
// sync + community functions use. Two tables back this: `pdx_proposals` (one row
// per idea, with a denormalised `support_count`) and `pdx_proposal_votes` (one
// row per participant per proposal, uniquely indexed to stop double-voting).
//
// IDENTITY (intentionally lightweight for now): there is no auth wall. Each
// browser mints a stable random "participant key" and sends it as `submitterKey`
// / `voterKey`. That key is all we need to attribute a submission and to enforce
// one support per participant per proposal. This keeps the flow approachable and
// anonymous while remaining trivially upgradeable: when Firebase auth is wired in
// the client simply sends the verified uid in the same field — no schema change.
//
// Routes (all under /api/mandate-proposals):
//   GET  /                     list proposals + live stats
//                                query: sort=top|new (default top),
//                                       key=<participantKey> (marks youSupported)
//   POST /                     submit a proposal
//                                body: { title, description, category?,
//                                        submitterName?, submitterKey? }
//   POST /:id/support          toggle support for a proposal
//                                body: { voterKey }  → { supported, supportCount }

import type { Config } from "@netlify/functions";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { pdxProposals, pdxProposalVotes } from "../../db/schema.js";

// ── Validation limits (defense in depth; the client validates too) ───────────
const TITLE_MIN = 4;
const TITLE_MAX = 140;
const DESC_MIN = 12;
const DESC_MAX = 2000;
const NAME_MAX = 60;
const CATEGORY_MAX = 40;
const KEY_MAX = 128;
// A generous page size — the Mandate grid shows everything the community has
// proposed, but we cap the payload so a huge table can't blow up a response.
const LIST_LIMIT = 200;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Trim + hard-cap an incoming string; returns "" for anything non-string.
function clean(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

// The public shape of a proposal row. `youSupported` is filled per-request from
// the caller's participant key so the UI can render its support button as active.
type ProposalDTO = {
  id: number;
  title: string;
  description: string;
  category: string | null;
  submitterName: string;
  supportCount: number;
  createdAt: string;
  youSupported: boolean;
};

// ── GET / — list proposals + live stats ──────────────────────────────────────
async function listProposals(url: URL): Promise<Response> {
  const sort = url.searchParams.get("sort") === "new" ? "new" : "top";
  const viewerKey = clean(url.searchParams.get("key"), KEY_MAX);

  const rows = await db
    .select()
    .from(pdxProposals)
    .where(eq(pdxProposals.status, "active"))
    .orderBy(
      // "top" ranks by support then recency; "new" is purely chronological. In
      // both cases newest breaks ties so a fresh proposal is never buried.
      sort === "new" ? desc(pdxProposals.createdAt) : desc(pdxProposals.supportCount),
      desc(pdxProposals.createdAt)
    )
    .limit(LIST_LIMIT);

  // Which of these proposals has THIS participant already supported? One small
  // query keyed by their participant key lets every card render the right state.
  let supportedIds = new Set<number>();
  if (viewerKey && rows.length) {
    const mine = await db
      .select({ proposalId: pdxProposalVotes.proposalId })
      .from(pdxProposalVotes)
      .where(eq(pdxProposalVotes.voterKey, viewerKey));
    supportedIds = new Set(mine.map((r) => r.proposalId));
  }

  const proposals: ProposalDTO[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    submitterName: r.submitterName,
    supportCount: r.supportCount,
    createdAt: r.createdAt.toISOString(),
    youSupported: supportedIds.has(r.id),
  }));

  // Live headline stats: total proposals + total support votes cast across all of
  // them (the sum of the denormalised counters, so it's a single cheap read).
  const totalVotes = proposals.reduce((sum, p) => sum + p.supportCount, 0);

  return json({
    proposals,
    stats: { proposalCount: proposals.length, totalVotes },
    sort,
  });
}

// ── POST / — submit a proposal ───────────────────────────────────────────────
async function createProposal(req: Request): Promise<Response> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const title = clean(body?.title, TITLE_MAX);
  const description = clean(body?.description, DESC_MAX);
  const category = clean(body?.category, CATEGORY_MAX) || null;
  const submitterKey = clean(body?.submitterKey, KEY_MAX) || null;
  // Empty name → "Anonymous" so the participation flow never demands a real name.
  const submitterName = clean(body?.submitterName, NAME_MAX) || "Anonymous";

  if (title.length < TITLE_MIN) {
    return json({ error: `Title must be at least ${TITLE_MIN} characters.` }, 400);
  }
  if (description.length < DESC_MIN) {
    return json({ error: `Description must be at least ${DESC_MIN} characters.` }, 400);
  }

  const [row] = await db
    .insert(pdxProposals)
    .values({ title, description, category, submitterName, submitterKey })
    .returning();

  console.log(`mandate-proposals: new proposal #${row.id} "${title}"`);

  const dto: ProposalDTO = {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    submitterName: row.submitterName,
    supportCount: row.supportCount,
    createdAt: row.createdAt.toISOString(),
    youSupported: false,
  };
  return json({ ok: true, proposal: dto }, 201);
}

// ── POST /:id/support — toggle support for a proposal ─────────────────────────
// One tap adds support; tapping again removes it. The unique (proposal_id,
// voter_key) index makes the "already supported?" check race-safe, and the
// denormalised counter is bumped in the same direction so lists stay accurate.
async function toggleSupport(id: number, req: Request): Promise<Response> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const voterKey = clean(body?.voterKey, KEY_MAX);
  if (!voterKey) return json({ error: "Missing voterKey" }, 400);

  const [proposal] = await db
    .select({ id: pdxProposals.id })
    .from(pdxProposals)
    .where(and(eq(pdxProposals.id, id), eq(pdxProposals.status, "active")))
    .limit(1);
  if (!proposal) return json({ error: "Proposal not found" }, 404);

  // Has this participant already supported it?
  const [existing] = await db
    .select({ id: pdxProposalVotes.id })
    .from(pdxProposalVotes)
    .where(and(eq(pdxProposalVotes.proposalId, id), eq(pdxProposalVotes.voterKey, voterKey)))
    .limit(1);

  let supported: boolean;
  if (existing) {
    // Toggle OFF — remove the vote and decrement (guarded so it never goes < 0).
    await db.delete(pdxProposalVotes).where(eq(pdxProposalVotes.id, existing.id));
    await db
      .update(pdxProposals)
      .set({ supportCount: sql`GREATEST(${pdxProposals.supportCount} - 1, 0)` })
      .where(eq(pdxProposals.id, id));
    supported = false;
  } else {
    // Toggle ON — insert the vote (ignore a race that duplicates it) and bump.
    const inserted = await db
      .insert(pdxProposalVotes)
      .values({ proposalId: id, voterKey })
      .onConflictDoNothing({
        target: [pdxProposalVotes.proposalId, pdxProposalVotes.voterKey],
      })
      .returning({ id: pdxProposalVotes.id });
    if (inserted.length) {
      await db
        .update(pdxProposals)
        .set({ supportCount: sql`${pdxProposals.supportCount} + 1` })
        .where(eq(pdxProposals.id, id));
    }
    supported = true;
  }

  // Return the authoritative fresh count so the client can reconcile its
  // optimistic update with the real number.
  const [fresh] = await db
    .select({ supportCount: pdxProposals.supportCount })
    .from(pdxProposals)
    .where(eq(pdxProposals.id, id))
    .limit(1);

  return json({ ok: true, id, supported, supportCount: fresh?.supportCount ?? 0 });
}

// ── Router ───────────────────────────────────────────────────────────────────
export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/mandate-proposals/, "").replace(/\/+$/, "");
  const method = req.method.toUpperCase();

  try {
    // /:id/support  (POST)
    const supportMatch = path.match(/^\/(\d+)\/support$/);
    if (supportMatch) {
      if (method !== "POST") return json({ error: "Method not allowed" }, 405);
      return await toggleSupport(parseInt(supportMatch[1], 10), req);
    }

    // /  (GET list, POST create)
    if (path === "" || path === "/") {
      if (method === "GET") return await listProposals(url);
      if (method === "POST") return await createProposal(req);
      return json({ error: "Method not allowed" }, 405);
    }

    return json({ error: "Not found" }, 404);
  } catch (e: any) {
    console.error("mandate-proposals error:", e);
    return json({ error: "Server error", detail: e?.message || String(e) }, 500);
  }
};

export const config: Config = {
  path: ["/api/mandate-proposals", "/api/mandate-proposals/*"],
};
