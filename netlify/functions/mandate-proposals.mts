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
//                                       key=<participantKey> (marks youSupported),
//                                       politician=<id> (only proposals linked to
//                                         that politician — powers the "Related
//                                         Proposals" section on a profile)
//   POST /                     submit a proposal
//                                body: { title, description, category?,
//                                        submitterName?, submitterKey?,
//                                        linkedPoliticianIds?: string[],
//                                        linkedRaceIds?: string[] }
//   POST /:id/support          toggle support for a proposal
//                                body: { voterKey }  → { supported, supportCount }

// WHAT SUPPORT IS, AND IS NOT
//
// A support tap is momentum: a count of people who said "this matters, track it".
// It is NOT evidence, and it is walled off from every scored surface on the site.
// No value produced by this function is read by Direction Match, by Word vs
// Action, by a formal pattern tier, by the publication floor, by a formal-act
// count, or by ballot sort order — and the wall is asserted, not just intended
// (scripts/test-support-lane.mjs). Support attaches to a reform proposal, never
// to a person's vote row: there is no endpoint here that upvotes a roll call.
//
// RATE LIMITS: both write routes go through netlify/lib/rate-limit.ts, keyed on
// the participant key AND the client IP, because the participant key is minted
// client-side and rotating it is otherwise a one-line bypass. A count of people
// that a script can inflate is not a count of people.

import type { Config } from "@netlify/functions";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { pdxProposals, pdxProposalVotes } from "../../db/schema.js";
import { checkLimits, clientIp, tooManyRequests, type Limit } from "../lib/rate-limit.js";

// ── Validation limits (defense in depth; the client validates too) ───────────
const TITLE_MIN = 4;
const TITLE_MAX = 140;
const DESC_MIN = 12;
const DESC_MAX = 2000;
const NAME_MAX = 60;
const CATEGORY_MAX = 40;
const KEY_MAX = 128;
// A single proposal can target a handful of politicians/races — enough to link a
// reform to the seats it affects without turning into an unbounded tag dump. Each
// id is itself capped so a malformed client can't store megabytes.
const LINK_ID_MAX = 64;
const MAX_LINKS = 12;
// A generous page size — the Mandate grid shows everything the community has
// proposed, but we cap the payload so a huge table can't blow up a response.
const LIST_LIMIT = 200;

// ── Write-rate limits ────────────────────────────────────────────────────────
// Two ceilings per route (see netlify/lib/rate-limit.ts). The per-key ceiling is
// the tight one; the per-IP ceiling is deliberately loose because one address can
// be a household, an office or a carrier NAT, and a limit tight enough to stop a
// script would lock out a classroom.
//
// The numbers are sized against what a person plausibly does, not against what a
// script can do: three reform proposals in ten minutes is already an unusually
// productive session, and thirty support taps in five minutes is more of the
// Mandate grid than fits on a screen.
const CREATE_LIMIT_KEY: Limit = { max: 3, windowSeconds: 600 };
const CREATE_LIMIT_IP: Limit = { max: 12, windowSeconds: 600 };
const SUPPORT_LIMIT_KEY: Limit = { max: 30, windowSeconds: 300 };
const SUPPORT_LIMIT_IP: Limit = { max: 120, windowSeconds: 300 };

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

// Normalise an incoming list of link ids into a clean, de-duped string array:
// only non-empty strings survive, each is trimmed + hard-capped, and the whole
// list is capped at MAX_LINKS. Anything that isn't an array becomes []. This is
// the sole gate for the JSON that lands in the linked_* columns.
function cleanIdArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of v) {
    const id = clean(item, LINK_ID_MAX);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_LINKS) break;
  }
  return out;
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
  // The people/seats this proposal targets. Empty when unlinked.
  linkedPoliticianIds: string[];
  linkedRaceIds: string[];
};

// ── GET / — list proposals + live stats ──────────────────────────────────────
async function listProposals(url: URL): Promise<Response> {
  const sort = url.searchParams.get("sort") === "new" ? "new" : "top";
  const viewerKey = clean(url.searchParams.get("key"), KEY_MAX);
  // Optional: restrict to proposals linked to one politician (their profile id).
  // Powers the "Related Proposals" section rendered on a politician's profile.
  const politician = clean(url.searchParams.get("politician"), LINK_ID_MAX);

  // Base filter is always "active". When a politician is requested we add a jsonb
  // containment check (`@>`) so only proposals whose linked_politician_ids array
  // includes that id come back — a single indexed-friendly predicate, no join.
  const where = politician
    ? and(
        eq(pdxProposals.status, "active"),
        sql`${pdxProposals.linkedPoliticianIds} @> ${JSON.stringify([politician])}::jsonb`
      )
    : eq(pdxProposals.status, "active");

  const rows = await db
    .select()
    .from(pdxProposals)
    .where(where)
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
    linkedPoliticianIds: r.linkedPoliticianIds ?? [],
    linkedRaceIds: r.linkedRaceIds ?? [],
  }));

  // Live headline stats: how many reforms have been proposed, and how many
  // support taps they have collected between them (the sum of the denormalised
  // counters, so it's a single cheap read).
  //
  // The field is `supportTotal`, not `totalVotes`. "Votes" is the word this site
  // uses for a roll call — a formal act with a date, a chamber and a citation —
  // and spending it on a click blurs the one distinction the whole archive rests
  // on. `totalVotes` is still emitted as a deprecated alias so an older cached
  // client keeps rendering; nothing new should read it.
  const supportTotal = proposals.reduce((sum, p) => sum + p.supportCount, 0);

  return json({
    proposals,
    stats: {
      proposalCount: proposals.length,
      supportTotal,
      // Deprecated alias — see above. Do not add new readers.
      totalVotes: supportTotal,
      // Says out loud what these counts are, so a consumer cannot mistake them
      // for a measurement of anything about a politician.
      kind: "momentum",
      note: "Support counts are momentum — how many people asked for this to be tracked. They are not evidence and feed no score.",
    },
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
  // Optional links to the politicians/races this reform targets — both stay []
  // when the submitter skips the (optional) picker.
  const linkedPoliticianIds = cleanIdArray(body?.linkedPoliticianIds);
  const linkedRaceIds = cleanIdArray(body?.linkedRaceIds);

  if (title.length < TITLE_MIN) {
    return json({ error: `Title must be at least ${TITLE_MIN} characters.` }, 400);
  }
  if (description.length < DESC_MIN) {
    return json({ error: `Description must be at least ${DESC_MIN} characters.` }, 400);
  }

  // Rate limit AFTER validation so a malformed request does not spend a slot, and
  // BEFORE the insert so a passing one cannot land without being counted.
  const gate = await checkLimits("mandate:create", [
    { cls: "key", id: submitterKey || "", limit: CREATE_LIMIT_KEY },
    { cls: "ip", id: clientIp(req), limit: CREATE_LIMIT_IP },
  ]);
  if (!gate.ok) {
    console.log(`mandate-proposals: create rate-limited (${gate.tripped})`);
    return tooManyRequests(gate.retryAfter);
  }

  const [row] = await db
    .insert(pdxProposals)
    .values({ title, description, category, submitterName, submitterKey, linkedPoliticianIds, linkedRaceIds })
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
    linkedPoliticianIds: row.linkedPoliticianIds ?? [],
    linkedRaceIds: row.linkedRaceIds ?? [],
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

  // A toggle is cheap and idempotent, but it is also the endpoint that moves the
  // number on screen, so it is the one worth metering.
  const gate = await checkLimits("mandate:support", [
    { cls: "key", id: voterKey, limit: SUPPORT_LIMIT_KEY },
    { cls: "ip", id: clientIp(req), limit: SUPPORT_LIMIT_IP },
  ]);
  if (!gate.ok) {
    console.log(`mandate-proposals: support rate-limited (${gate.tripped})`);
    return tooManyRequests(gate.retryAfter);
  }

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
