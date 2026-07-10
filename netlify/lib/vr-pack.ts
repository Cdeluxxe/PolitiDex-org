// ─────────────────────────────────────────────────────────────────────────────
// Voting Record — offline pack builder (shared library)
// ─────────────────────────────────────────────────────────────────────────────
// The single source of truth for the compact, per-member "offline pack": the
// precomputed record the PWA caches (stale-while-revalidate) so a previously
// viewed member's voting record renders with no network. It is written two ways:
//   • lazily, on first read of GET /api/voting-record/member/:id/pack, and
//   • eagerly, by the Phase-7 ingest after new roll calls land (writeMemberPack).
// Both go through THIS module so the shape can never drift between them.
//
// The pack shape mirrors the unfiltered /member/:id response (summary + items +
// pagination fields) so the client can drop it straight in as an offline fallback
// — see PDXVotingRecord.fetchPack in voting-record.js. Every item keeps its
// `issues[].supportMeaning` so the client's stance-vs-record verdicts work offline.
//
// Stored in Netlify Blobs (store "vr-packs", key "member:<id>"). Build is
// self-contained (its own queries) so it never depends on the read Function's
// internals — keeping the ingest path cleanly separate from the read path.

import { and, desc, eq, inArray } from "drizzle-orm";
import { getStore } from "@netlify/blobs";
import { db } from "../../db/index.js";
import {
  vrMeasureIssues,
  vrMeasures,
  vrMemberVotes,
  vrPositions,
  vrRollcalls,
} from "../../db/schema.js";
import issueKeyData from "../../db/issue-keys.json" with { type: "json" };

const ISSUE_KEYS = new Set<string>((issueKeyData as { keys: string[] }).keys);

export const PACK_STORE = "vr-packs";
const PACK_ITEM_CAP = 80; // plenty for offline; keeps the blob small
const FETCH_CAP = 2000;
const PROCEDURAL_TYPES = ["procedural", "motion"];

export function packKey(politicianId: string): string {
  return `member:${politicianId}`;
}

type PackIssue = {
  issueKey: string;
  weight: number;
  isPrimary: boolean;
  supportMeaning: string;
  rationale: string | null;
};

async function loadIssuesByMeasure(measureIds: number[]): Promise<Map<number, PackIssue[]>> {
  const map = new Map<number, PackIssue[]>();
  if (!measureIds.length) return map;
  const rows = await db
    .select()
    .from(vrMeasureIssues)
    .where(inArray(vrMeasureIssues.measureId, measureIds));
  for (const r of rows) {
    if (!ISSUE_KEYS.has(r.issueKey)) continue;
    const list = map.get(r.measureId) ?? [];
    list.push({
      issueKey: r.issueKey,
      weight: r.weight,
      isPrimary: r.isPrimary,
      supportMeaning: r.supportMeaning,
      rationale: r.rationale,
    });
    map.set(r.measureId, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.weight - a.weight);
  }
  return map;
}

// Build the compact pack for one member, newest-first, capped to PACK_ITEM_CAP.
export async function buildMemberPack(politicianId: string) {
  const voteRows = await db
    .select({
      measureId: vrMeasures.id,
      measureType: vrMeasures.measureType,
      number: vrMeasures.number,
      title: vrMeasures.title,
      parentId: vrMeasures.parentId,
      status: vrMeasures.status,
      rollcallId: vrRollcalls.id,
      chamber: vrRollcalls.chamber,
      voteDate: vrRollcalls.voteDate,
      question: vrRollcalls.question,
      actionType: vrRollcalls.actionType,
      result: vrRollcalls.result,
      rcSourceUrl: vrRollcalls.sourceUrl,
      rcSourceLabel: vrRollcalls.sourceLabel,
      position: vrMemberVotes.position,
      isParty: vrMemberVotes.isParty,
    })
    .from(vrMemberVotes)
    .innerJoin(vrRollcalls, eq(vrMemberVotes.rollcallId, vrRollcalls.id))
    .innerJoin(vrMeasures, eq(vrRollcalls.measureId, vrMeasures.id))
    .where(eq(vrMemberVotes.politicianId, politicianId))
    .orderBy(desc(vrRollcalls.voteDate))
    .limit(FETCH_CAP);

  const posRows = await db
    .select({
      measureId: vrMeasures.id,
      measureType: vrMeasures.measureType,
      number: vrMeasures.number,
      title: vrMeasures.title,
      parentId: vrMeasures.parentId,
      status: vrMeasures.status,
      chamber: vrMeasures.chamber,
      actionType: vrPositions.actionType,
      supports: vrPositions.supports,
      actedAt: vrPositions.actedAt,
      posSourceUrl: vrPositions.sourceUrl,
      posSourceLabel: vrMeasures.sourceLabel,
    })
    .from(vrPositions)
    .innerJoin(vrMeasures, eq(vrPositions.measureId, vrMeasures.id))
    .where(eq(vrPositions.politicianId, politicianId))
    .limit(FETCH_CAP);

  const measureIds = [
    ...new Set([...voteRows.map((r) => r.measureId), ...posRows.map((r) => r.measureId)]),
  ];
  const issuesByMeasure = await loadIssuesByMeasure(measureIds);

  const items: any[] = [];
  for (const v of voteRows) {
    if (!v.rcSourceUrl) continue; // verifiability: never emit an unsourced record
    items.push({
      kind: "vote",
      measureId: v.measureId,
      measureType: v.measureType,
      number: v.number,
      title: v.title,
      chamber: v.chamber,
      status: v.status,
      date: v.voteDate ? new Date(v.voteDate).toISOString() : null,
      action: v.question,
      actionType: v.actionType,
      position: v.position,
      result: v.result,
      isParty: v.isParty,
      supports: null,
      isProcedural: PROCEDURAL_TYPES.includes(v.actionType),
      isAmendment: v.measureType === "amendment",
      parentMeasureId: v.parentId ?? null,
      rollcallId: v.rollcallId,
      issues: issuesByMeasure.get(v.measureId) ?? [],
      source: { url: v.rcSourceUrl, label: v.rcSourceLabel },
    });
  }
  for (const p of posRows) {
    if (!p.posSourceUrl) continue;
    items.push({
      kind: "position",
      measureId: p.measureId,
      measureType: p.measureType,
      number: p.number,
      title: p.title,
      chamber: p.chamber,
      status: p.status,
      date: p.actedAt ? new Date(p.actedAt).toISOString() : null,
      action: p.actionType,
      actionType: p.actionType,
      position: p.actionType,
      result: null,
      isParty: null,
      supports: p.supports,
      isProcedural: false,
      isAmendment: p.measureType === "amendment",
      parentMeasureId: p.parentId ?? null,
      rollcallId: null,
      issues: issuesByMeasure.get(p.measureId) ?? [],
      source: { url: p.posSourceUrl, label: p.posSourceLabel ?? null },
    });
  }

  // Newest first, then cap.
  items.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const total = items.length;
  const votesOnly = items.filter((i) => i.kind === "vote");
  const withParty = votesOnly.filter((i) => i.isParty === "with_party").length;
  const againstParty = votesOnly.filter((i) => i.isParty === "against_party").length;
  const capped = items.slice(0, PACK_ITEM_CAP);

  return {
    politicianId,
    pack: true,
    generatedAt: new Date().toISOString(),
    filters: {
      issue: null, chamber: null, actionType: null, position: null, result: null,
      q: null, from: null, to: null, hideProcedural: false, sort: "date",
    },
    summary: {
      totalRecords: total,
      votes: votesOnly.length,
      positions: total - votesOnly.length,
      withParty,
      againstParty,
    },
    items: capped,
    page: 1,
    pageSize: PACK_ITEM_CAP,
    total,
    totalPages: 1,
    hasMore: total > PACK_ITEM_CAP,
  };
}

// Read the cached pack (or null). Best-effort — never throws.
export async function getCachedPack(politicianId: string): Promise<any | null> {
  try {
    const store = getStore(PACK_STORE);
    return (await store.get(packKey(politicianId), { type: "json" })) as any;
  } catch {
    return null;
  }
}

// Build (unless `pack` supplied) and persist the pack. Returns the pack it wrote.
export async function writeMemberPack(politicianId: string, pack?: any): Promise<any> {
  const finalPack = pack ?? (await buildMemberPack(politicianId));
  try {
    await getStore(PACK_STORE).setJSON(packKey(politicianId), finalPack);
  } catch {
    /* serve/return fresh even if the blob write fails */
  }
  return finalPack;
}

// Remove a member's cached pack (used to invalidate; the next read rebuilds).
export async function deletePack(politicianId: string): Promise<void> {
  try {
    await getStore(PACK_STORE).delete(packKey(politicianId));
  } catch {
    /* ignore */
  }
}
