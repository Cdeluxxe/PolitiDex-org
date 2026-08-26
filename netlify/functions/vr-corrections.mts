// ─────────────────────────────────────────────────────────────────────────────
// Formal-record corrections — API (moderator-gated, auditable, fail-closed)
// ─────────────────────────────────────────────────────────────────────────────
// The write half of the correction path. Until now, fixing a wrong cell in the
// formal record meant writing a migration and waiting for a deploy — see
// 20260909000000_vr_vote_corrections.sql, eighteen verified position corrections
// written as guarded UPDATEs. That migration was right to be careful and it stays
// exactly as it is. What it could not do was let a moderator who can PROVE a cell is
// wrong record that proof today.
//
// So: this Function proposes and approves corrections into
// vr_vote_correction_overlays, and netlify/lib/vr-corrections.ts lays approved ones
// over reads. Applied migrations are never edited; the stored cell is never mutated.
//
// WHAT A CORRECTION IS ALLOWED TO BE. One cell of vr_member_votes — a member's
// recorded `position` on one roll call, or the `is_party` crossover flag on it —
// moved from the value a reviewer examined to another value in that column's shipped
// vocabulary, with a reason and a citable source. That is the whole surface.
//
// WHAT IT IS NOT ALLOWED TO BE, enforced in this file and again on every read:
//   - NOT A CREATION. If there is no vote row for that member on that roll call,
//     propose() refuses with 404. A missing formal read stays missing and the
//     archive keeps saying so. A correction path that can fill an absent vote is a
//     path to inventing a record, which is the one thing this system may never do.
//   - NOT A DIRECTION. Issue mappings, support_meaning, weights, Direction Match and
//     every publication floor are untouchable from here. Direction is a curator
//     judgement made under db/vr-ingest-runbook.md rule 22, and a wrong direction is
//     still a migration — deliberately, because reading a mapping backwards is the
//     error that runbook exists to prevent and it is not a runtime fix.
//   - NOT A FREE-TEXT EDIT. proposedValue must be in the column's vocabulary. There
//     is no path here that writes a value the schema's own vocabulary lacks.
//   - NOT SILENT. reason and source_url are required at propose time; proposer,
//     reviewer and both timestamps are recorded; the read path emits all of it beside
//     the corrected value so a reader sees that the cell was corrected. A correction
//     nobody can audit is a quiet rewrite with better manners.
//   - NOT A STANDING INSTRUCTION. The value the reviewer examined is stored on the
//     row, re-verified at approval time, and re-verified again on every read. If the
//     cell changes underneath (a re-ingest), the correction stops applying and is
//     marked stale rather than being re-imposed on data nobody reviewed.
//
// Routes (all under /api/vr-corrections):
//   GET  /                    (moderator) the queue - ?status=pending|approved|rejected|all
//   GET  /public              (anyone) approved corrections, without author identity
//   GET  /:id                 (moderator) one correction, full audit row
//   POST /                    (moderator) propose a correction against a named cell
//   POST /:id/approve         (moderator) approve - re-verifies the cell first
//   POST /:id/reject          (moderator) reject, with a note

import type { Config } from "@netlify/functions";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  vrVoteCorrectionOverlays,
  vrMemberVotes,
  vrRollcalls,
} from "../../db/schema.js";
import { verifyUser, type AuthUser } from "../../db/firebase-auth.js";
import {
  CORRECTABLE_FIELDS,
  FIELD_VOCABULARY,
  cellValue,
  refuse,
  type CorrectableField,
} from "../lib/vr-corrections.js";
import { checkLimits, clientIp, tooManyRequests } from "../lib/rate-limit.js";

// ── Helpers ──────────────────────────────────────────────────────────────────
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
const bad = (msg: string) => json({ error: msg }, 400);
const unauth = () => json({ error: "Sign in to do that." }, 401);
const forbidden = () => json({ error: "Not allowed." }, 403);
const notFound = (msg = "Not found.") => json({ error: msg }, 404);
const conflict = (msg: string) => json({ error: msg }, 409);

const STATUSES = new Set(["pending", "approved", "rejected", "superseded"]);
const clampStr = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

// A correction's public face: what changed, why, and on what source. Deliberately
// NO author identity - moderator emails and uids are never emitted to a reader. The
// trust claim is "a moderator approved this, here is the evidence", not "this person
// did it", and publishing the roster of who touched what is a different decision
// than the one this feature needs.
function publicShape(r: any) {
  return {
    id: r.id,
    politicianId: r.politicianId,
    chamber: r.chamber,
    congress: r.congress,
    session: r.session,
    rollNumber: r.rollNumber,
    field: r.field,
    from: r.storedValue,
    to: r.proposedValue,
    reason: r.reason,
    sourceUrl: r.sourceUrl,
    sourceLabel: r.sourceLabel || "",
    correctedAt: r.reviewedAt,
    by: "moderator",
  };
}

// The moderator's face: the whole audit row, including who proposed and who
// reviewed. Self-review is not blocked - a one-person moderation roster is the
// reality here - but it is VISIBLE, because proposedBy and reviewedBy are both
// returned and a reviewer approving their own proposal shows up as the same value.
function auditShape(r: any) {
  return {
    ...publicShape(r),
    status: r.status,
    storedValue: r.storedValue,
    proposedValue: r.proposedValue,
    proposedBy: r.proposedBy,
    proposedByLabel: r.proposedByLabel || "",
    proposedAt: r.proposedAt,
    reviewedBy: r.reviewedBy,
    reviewedByLabel: r.reviewedByLabel || "",
    reviewedAt: r.reviewedAt,
    reviewNote: r.reviewNote || "",
    selfReviewed: !!(r.reviewedBy && r.reviewedBy === r.proposedBy),
  };
}

// Resolve the roll call a correction names. Either by its id, or by the identity a
// human actually has in front of them from a clerk page: chamber + congress +
// session + roll number.
async function resolveRollcall(body: any) {
  const id = Number(body?.rollcallId || 0);
  if (id > 0) {
    const [rc] = await db
      .select({
        id: vrRollcalls.id,
        chamber: vrRollcalls.chamber,
        congress: vrRollcalls.congress,
        session: vrRollcalls.session,
        rollNumber: vrRollcalls.rollNumber,
      })
      .from(vrRollcalls)
      .where(eq(vrRollcalls.id, id))
      .limit(1);
    return rc || null;
  }
  const chamber = clampStr(body?.chamber, 12).toLowerCase();
  const congress = Number(body?.congress || 0);
  const rollNumber = Number(body?.rollNumber || 0);
  if (!chamber || !congress || !rollNumber) return null;
  const conds: any[] = [
    eq(vrRollcalls.chamber, chamber),
    eq(vrRollcalls.congress, congress),
    eq(vrRollcalls.rollNumber, rollNumber),
  ];
  if (body?.session != null && Number(body.session) > 0) {
    conds.push(eq(vrRollcalls.session, Number(body.session)));
  }
  const rows = await db
    .select({
      id: vrRollcalls.id,
      chamber: vrRollcalls.chamber,
      congress: vrRollcalls.congress,
      session: vrRollcalls.session,
      rollNumber: vrRollcalls.rollNumber,
    })
    .from(vrRollcalls)
    .where(and(...conds))
    .limit(2);
  // Ambiguous is not resolved by picking one. Sessions exist for a reason.
  if (rows.length !== 1) return null;
  return rows[0];
}

// ── GET / (moderator queue) ──────────────────────────────────────────────────
async function listQueue(url: URL, viewer: AuthUser | null): Promise<Response> {
  if (!viewer) return unauth();
  if (!viewer.isModerator) return forbidden();
  const want = clampStr(url.searchParams.get("status") || "pending", 16);
  const conds: any[] = [];
  if (want !== "all") {
    if (!STATUSES.has(want)) return bad(`Unknown status "${want}".`);
    conds.push(eq(vrVoteCorrectionOverlays.status, want));
  }
  const pid = clampStr(url.searchParams.get("politicianId"), 80);
  if (pid) conds.push(eq(vrVoteCorrectionOverlays.politicianId, pid));

  const rows = await db
    .select()
    .from(vrVoteCorrectionOverlays)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(vrVoteCorrectionOverlays.proposedAt))
    .limit(500);

  // Every row is re-run through the read-time refusals, so the queue shows a
  // moderator which approved rows would NOT actually apply, and why.
  return json({
    status: want,
    total: rows.length,
    items: rows.map((r: any) => {
      const why = refuse(r as any);
      return { ...auditShape(r), wouldApply: !why, refusedBecause: why || null };
    }),
  });
}

// ── GET /public ──────────────────────────────────────────────────────────────
// The trust surface: every correction the archive has made to the formal record,
// with its reason and source. Public on purpose - a correction log nobody can read
// is not a correction log.
async function listPublic(url: URL): Promise<Response> {
  const conds: any[] = [eq(vrVoteCorrectionOverlays.status, "approved")];
  const pid = clampStr(url.searchParams.get("politicianId"), 80);
  if (pid) conds.push(eq(vrVoteCorrectionOverlays.politicianId, pid));
  const rows = await db
    .select()
    .from(vrVoteCorrectionOverlays)
    .where(and(...conds))
    .orderBy(desc(vrVoteCorrectionOverlays.reviewedAt))
    .limit(500);
  const usable = rows.filter((r: any) => !refuse(r as any));
  return json({
    // Counts, not a grade. This is an inventory of corrections made, in the same
    // voice as the coverage inventory: what is held, not how good it is.
    total: usable.length,
    note:
      "Corrections a moderator approved against the formal record, each with the " +
      "reason and the source it was verified against. The stored ingest value is " +
      "unchanged; these are applied over it on read.",
    items: usable.map(publicShape),
  });
}

// ── GET /:id (moderator) ─────────────────────────────────────────────────────
async function getOne(id: number, viewer: AuthUser | null): Promise<Response> {
  if (!viewer) return unauth();
  if (!viewer.isModerator) return forbidden();
  const [row] = await db
    .select()
    .from(vrVoteCorrectionOverlays)
    .where(eq(vrVoteCorrectionOverlays.id, id))
    .limit(1);
  if (!row) return notFound();
  const why = refuse(row as any);
  return json({ ...auditShape(row), wouldApply: !why, refusedBecause: why || null });
}

// ── POST / (propose) ─────────────────────────────────────────────────────────
async function propose(req: Request, viewer: AuthUser | null): Promise<Response> {
  if (!viewer) return unauth();
  if (!viewer.isModerator) return forbidden();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Expected a JSON body.");
  }

  const field = clampStr(body?.field, 24) as CorrectableField;
  if (!CORRECTABLE_FIELDS.includes(field)) {
    return bad(
      `field must be one of ${CORRECTABLE_FIELDS.join(", ")}. Nothing else in the ` +
        `formal record is correctable from here - issue mappings, support_meaning ` +
        `and weights are curator judgements and stay migration-bound.`
    );
  }
  const vocab = FIELD_VOCABULARY[field];
  // "" is the legal encoding of NULL for is_party, so an explicitly empty string is
  // a real value here and is only rejected when the vocabulary lacks it. The default
  // is a single space precisely so a MISSING field never lands on a legal value.
  const proposedValue =
    typeof body?.proposedValue === "string" ? body.proposedValue.trim() : " ";
  if (!vocab.includes(proposedValue)) {
    return bad(
      `proposedValue must be one of ${vocab
        .map((v) => (v === "" ? '"" (no flag)' : v))
        .join(", ")}.`
    );
  }
  const politicianId = clampStr(body?.politicianId, 80);
  if (!politicianId) return bad("politicianId is required.");
  const reason = clampStr(body?.reason, 2000);
  if (reason.length < 12) {
    return bad(
      "A reason of at least 12 characters is required - a correction without one is an assertion."
    );
  }
  const sourceUrl = clampStr(body?.sourceUrl, 500);
  if (!/^https?:\/\//i.test(sourceUrl)) {
    return bad(
      "A citable http(s) sourceUrl is required - a correction without one is an opinion."
    );
  }
  const sourceLabel = clampStr(body?.sourceLabel, 120);

  const rc = await resolveRollcall(body);
  if (!rc) {
    return notFound(
      "No single roll call matches that identity. Pass rollcallId, or chamber + " +
        "congress + rollNumber (plus session when the number repeats across sessions)."
    );
  }

  // THE CELL MUST ALREADY EXIST. This is the refusal that keeps the correction path
  // from becoming a way to invent a vote: if the archive holds no formal read for
  // this member on this roll call, it says so, and no correction can change that.
  const [cell] = await db
    .select({ position: vrMemberVotes.position, isParty: vrMemberVotes.isParty })
    .from(vrMemberVotes)
    .where(
      and(
        eq(vrMemberVotes.rollcallId, rc.id),
        eq(vrMemberVotes.politicianId, politicianId)
      )
    )
    .limit(1);
  if (!cell) {
    return notFound(
      `No recorded vote for ${politicianId} on that roll call. A correction can move ` +
        `an existing cell between recorded values; it cannot create a vote. If the ` +
        `member did vote, that is an ingest gap - the vote has to be ingested with ` +
        `its source before it can be corrected.`
    );
  }

  const storedValue = cellValue(field === "position" ? cell.position : cell.isParty);
  if (!vocab.includes(storedValue)) {
    return conflict(
      `The stored ${field} is "${storedValue}", which is outside that column's ` +
        `vocabulary. That is an ingest problem, not a correction.`
    );
  }
  if (storedValue === proposedValue) {
    return conflict(
      `The stored ${field} is already "${storedValue}". Nothing to correct - the ` +
        `record may already have been fixed.`
    );
  }

  // One APPROVED correction per cell per field (the partial unique index enforces
  // it). Say so rather than letting the insert fail with a constraint name.
  const [existing] = await db
    .select({ id: vrVoteCorrectionOverlays.id })
    .from(vrVoteCorrectionOverlays)
    .where(
      and(
        eq(vrVoteCorrectionOverlays.rollcallId, rc.id),
        eq(vrVoteCorrectionOverlays.politicianId, politicianId),
        eq(vrVoteCorrectionOverlays.field, field),
        eq(vrVoteCorrectionOverlays.status, "approved")
      )
    )
    .limit(1);
  if (existing) {
    return conflict(
      `Correction #${existing.id} is already approved for that cell. Supersede it ` +
        `by rejecting it first - corrections are not stacked.`
    );
  }

  const [row] = await db
    .insert(vrVoteCorrectionOverlays)
    .values({
      rollcallId: rc.id,
      politicianId,
      field,
      storedValue,
      proposedValue,
      chamber: rc.chamber,
      congress: rc.congress,
      session: rc.session,
      rollNumber: rc.rollNumber,
      reason,
      sourceUrl,
      sourceLabel,
      // PENDING. Proposing is not approving, even for a moderator: the second look
      // is where the stored value gets re-verified, and collapsing the two steps
      // would remove the only place that check happens before a reader sees it.
      status: "pending",
      proposedBy: viewer.uid,
      proposedByLabel: viewer.name || viewer.email || "",
    })
    .returning();

  return json(
    { ...auditShape(row), wouldApply: false, refusedBecause: "not approved yet" },
    201
  );
}

// ── POST /:id/approve ────────────────────────────────────────────────────────
async function approve(
  id: number,
  req: Request,
  viewer: AuthUser | null
): Promise<Response> {
  if (!viewer) return unauth();
  if (!viewer.isModerator) return forbidden();
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // A note is optional.
  }

  const [row] = await db
    .select()
    .from(vrVoteCorrectionOverlays)
    .where(eq(vrVoteCorrectionOverlays.id, id))
    .limit(1);
  if (!row) return notFound();
  if (row.status === "approved") return conflict("Already approved.");
  if (row.status !== "pending") {
    return conflict(
      `Correction #${id} is ${row.status} - only a pending correction can be approved.`
    );
  }

  // RE-VERIFY AT APPROVAL. The row records the value the proposer examined; between
  // propose and approve an ingest may have moved it. Approving against a value
  // nobody reviewed is exactly the failure the match guard exists to prevent, so
  // this fails closed rather than approving optimistically.
  const [cell] = await db
    .select({ position: vrMemberVotes.position, isParty: vrMemberVotes.isParty })
    .from(vrMemberVotes)
    .where(
      and(
        eq(vrMemberVotes.rollcallId, row.rollcallId),
        eq(vrMemberVotes.politicianId, row.politicianId)
      )
    )
    .limit(1);
  if (!cell) {
    return conflict(
      "The vote this correction points at is no longer in the record. Nothing to correct."
    );
  }
  const current = cellValue(row.field === "position" ? cell.position : cell.isParty);
  if (current !== row.storedValue) {
    return conflict(
      `The cell now holds "${current}", not the "${row.storedValue}" this correction ` +
        `was written against. Re-verify against the current value and propose again.`
    );
  }

  // And the read-time refusals, applied here too, so an unusable row cannot be
  // approved into a state where the read path silently drops it.
  const why = refuse(row as any);
  if (why) return conflict(`This correction cannot be approved: ${why}.`);

  const [updated] = await db
    .update(vrVoteCorrectionOverlays)
    .set({
      status: "approved",
      reviewedBy: viewer.uid,
      reviewedByLabel: viewer.name || viewer.email || "",
      reviewedAt: new Date(),
      reviewNote: clampStr(body?.note, 2000),
    })
    .where(eq(vrVoteCorrectionOverlays.id, id))
    .returning();

  return json({ ...auditShape(updated), wouldApply: true, refusedBecause: null });
}

// ── POST /:id/reject ─────────────────────────────────────────────────────────
async function reject(
  id: number,
  req: Request,
  viewer: AuthUser | null
): Promise<Response> {
  if (!viewer) return unauth();
  if (!viewer.isModerator) return forbidden();
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // A note is optional, though rejecting without one is unkind to the next reader.
  }
  const [row] = await db
    .select({
      id: vrVoteCorrectionOverlays.id,
      status: vrVoteCorrectionOverlays.status,
    })
    .from(vrVoteCorrectionOverlays)
    .where(eq(vrVoteCorrectionOverlays.id, id))
    .limit(1);
  if (!row) return notFound();
  if (row.status === "rejected") return conflict("Already rejected.");

  // An approved row is retired as "superseded" rather than "rejected": it DID apply
  // to reads for a while, and the audit trail should not claim it was always refused.
  const nextStatus = row.status === "approved" ? "superseded" : "rejected";
  const [updated] = await db
    .update(vrVoteCorrectionOverlays)
    .set({
      status: nextStatus,
      reviewedBy: viewer.uid,
      reviewedByLabel: viewer.name || viewer.email || "",
      reviewedAt: new Date(),
      reviewNote: clampStr(body?.note, 2000),
    })
    .where(eq(vrVoteCorrectionOverlays.id, id))
    .returning();
  return json({ ...auditShape(updated), wouldApply: false, refusedBecause: nextStatus });
}

// ── Router ───────────────────────────────────────────────────────────────────
export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname
    .replace(/^\/api\/vr-corrections/, "")
    .replace(/\/+$/, "");
  const method = req.method.toUpperCase();
  const viewer = await verifyUser(req);

  try {
    // Writes are cheap to make and expensive to review, so they are rate-limited per
    // moderator. Reads are not: the public correction log is the trust surface and
    // throttling it would be throttling the disclosure.
    if (method === "POST") {
      const decision = await checkLimits("vr-corrections", [
        { cls: "user", id: viewer?.uid || "", limit: { max: 60, windowSeconds: 3600 } },
        { cls: "ip", id: clientIp(req), limit: { max: 60, windowSeconds: 3600 } },
      ]);
      if (!decision.ok) return tooManyRequests(decision.retryAfter);
    }

    if (path === "" || path === "/") {
      if (method === "GET") return await listQueue(url, viewer);
      if (method === "POST") return await propose(req, viewer);
      return json({ error: "Method not allowed" }, 405);
    }
    if (path === "/public" && method === "GET") return await listPublic(url);

    const m = path.match(/^\/(\d+)(\/[a-z-]+)?$/);
    if (m) {
      const id = parseInt(m[1], 10);
      const sub = m[2] || "";
      if (!sub && method === "GET") return await getOne(id, viewer);
      if (sub === "/approve" && method === "POST") return await approve(id, req, viewer);
      if (sub === "/reject" && method === "POST") return await reject(id, req, viewer);
      return json({ error: "Method not allowed" }, 405);
    }

    return notFound();
  } catch (e: any) {
    console.error("vr-corrections api error:", e);
    return json({ error: "Server error", detail: e?.message || String(e) }, 500);
  }
};

export const config: Config = {
  path: ["/api/vr-corrections", "/api/vr-corrections/*"],
};
