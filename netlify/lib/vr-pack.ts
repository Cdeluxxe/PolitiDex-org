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
// Stored in Netlify Blobs (store "vr-packs", key "member:<id>@<mappingVersion>").
// Build is self-contained (its own queries) so it never depends on the read
// Function's internals — keeping the ingest path cleanly separate from the read
// path.
//
// WHY THE KEY CARRIES A MAPPING VERSION. The live /member/:id read is a query, so
// it reflects vr_measure_issues the instant a mapping migration lands. The pack is
// a blob on a six-hour TTL, so for up to six hours it served the OLD mapping —
// and it disagreed about `isPrimary`, which is not cosmetic: _recordDisplayTier
// refuses a direction outright below _RD_MIN_PRIMARY, so one stale flag turns a
// published "Thin supports" into "Not about this issue". Federal wave F4's housing
// PRIMARY flip was live in Postgres while the pack was still serving
// isPrimary: false. Versioning the key makes that window zero: a mapping change
// changes the version, the new key misses, and the pack is rebuilt on the next
// read. The TTL is left alone and now governs only what it was for — roll-call
// freshness within one mapping version. See mappingVersion() below.

import { and, desc, eq, inArray, sql } from "drizzle-orm";
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
import { loadCorrections, applyCorrections } from "./vr-corrections.js";

const ISSUE_KEYS = new Set<string>((issueKeyData as { keys: string[] }).keys);

export const PACK_STORE = "vr-packs";
const PACK_ITEM_CAP = 80; // plenty for offline; keeps the blob small
const FETCH_CAP = 2000;
const PROCEDURAL_TYPES = ["procedural", "motion"];

// A YEA normally advances the measure — that assumption is what every verdict is built
// on. Three common House/Senate questions INVERT it: a yea on a motion to RECOMMIT or to
// COMMIT sends the bill back to committee, and a yea on a motion to TABLE kills it. So on
// those roll calls a yea is a vote AGAINST the measure, and reading it the usual way
// produces a verdict that is not merely weak but backwards. "To commit" is listed
// separately from "recommit" because the House uses the bare form for a Senate bill it
// has not previously committed — S. 1071 roll 319 is one.
//
// This is orthogonal to a mapping's `supportMeaning` (which says whether advancing the
// MEASURE advances the ISSUE) — it corrects the vote→measure step, not the measure→issue
// step. Down-weighting alone cannot fix it: 0.25 × backwards is still backwards.
// Consumed by stance-helpers.js `_voteEffectiveSupport` via item.advanceInverted.
export function yeaBlocksMeasure(question: string | null | undefined): boolean {
  const q = String(question || "").toLowerCase();
  return (
    q.indexOf("recommit") !== -1 ||
    q.indexOf("to commit") !== -1 ||
    q.indexOf("to table") !== -1
  );
}

// ── THE MAPPING VERSION ─────────────────────────────────────────────────────
// A short token that changes whenever the measure→issue mapping changes, and does
// not change otherwise. It is derived from the table itself, so it cannot be
// forgotten: there is no counter for a wave to bump and no wall clock in it.
//
// WHY A CONTENT FINGERPRINT AND NOT max(updated_at). vr_measure_issues has no
// updated_at column, and adding one would not have caught the case this exists
// for. F4's regression was an UPDATE to `is_primary` on a row that already
// existed — the shape of change a hand-bumped counter misses precisely when it
// matters, because the row count does not move and nobody remembers that a flag
// flip is a mapping change. md5 over the table's contents notices it for free.
//
// WHAT IS IN THE FINGERPRINT: exactly the five fields the pack SERVES (see
// PackIssue) plus the row count. `source_url` and `rationale`'s provenance are
// deliberately out of it — a corrected citation URL that the pack never sends
// should not invalidate every member's pack. `rationale` IS in, because the pack
// does send it. The count is carried in the token in the clear so the version is
// legible in a log line and in a blob listing.
//
// COST: one aggregate over ~825 rows, ~5 ms measured against the live table.
// Memoised for MAPPING_VERSION_MEMO_MS inside a warm Function instance so the
// redirect in getMemberPack and the request that follows it share one query. The
// memo is deliberately seconds, not minutes: "the next pack URL after a mapping
// change is a different key" is the acceptance, and a long memo would trade the
// six-hour hole for a smaller one of the same kind.
export const MAPPING_VERSION_MEMO_MS = 5000;
export const MAPPING_VERSION_UNKNOWN = "m0-unknown";
let _mvMemo: { at: number; value: string } | null = null;

export async function mappingVersion(): Promise<string> {
  const now = Date.now();
  if (_mvMemo && now - _mvMemo.at < MAPPING_VERSION_MEMO_MS) return _mvMemo.value;
  let value = MAPPING_VERSION_UNKNOWN;
  try {
    const rows = (await db.execute(sql`
      select count(*)::int as n,
             coalesce(md5(string_agg(
               measure_id || ':' || issue_key || ':' || weight || ':' ||
               is_primary || ':' || support_meaning || ':' || coalesce(rationale, ''),
               ',' order by id)), 'empty') as h
        from vr_measure_issues
    `)) as any;
    const row = (Array.isArray(rows) ? rows[0] : rows?.rows?.[0]) || null;
    if (row && row.h) value = `m${Number(row.n) || 0}-${String(row.h).slice(0, 12)}`;
  } catch {
    // FAIL CLOSED, NOT SILENT. A version we could not compute must not collapse
    // onto a version we could: MAPPING_VERSION_UNKNOWN is its own key, so a pack
    // built while the mapping table was unreadable can never be served as though
    // it were a pack of a known mapping. It also expires from the memo in seconds,
    // so the next read tries again.
    value = MAPPING_VERSION_UNKNOWN;
  }
  _mvMemo = { at: now, value };
  return value;
}

// Only for tests and the ingest, which change the mapping table underneath a
// process that has already read it. Not a cache-control knob for the read path.
export function resetMappingVersionMemo(): void {
  _mvMemo = null;
}

// THE KEY SHAPE: `member:<politicianId>@<mappingVersion>`.
//   member:massie@m825-e21bb4b7021e
// A mapping change changes the suffix, so the old key is simply never asked for
// again — old blobs become unreachable rather than deleted, which is what makes
// this safe to rely on. Nothing walks the store looking for them, and a blob left
// behind costs a few KB and answers no request.
export function packKey(politicianId: string, mv: string): string {
  return `member:${politicianId}@${mv}`;
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

// ── MEASURE IDENTITY, PROJECTED ─────────────────────────────────────────────
// Deliberately duplicated from netlify/functions/voting-record.mts rather than
// shared: this file's whole contract is that a pack rehydrates to the SAME item
// shape the live read produces, and the two are already written as mirrored
// literals for exactly that reason. See the long note on the live copy for why
// only three keys of external_ids cross the wire.
//
// `session` is the Utah session code as stored ("2025GS"), never reformatted —
// it is the string the Legislature's own bill pages use, so a reader who
// searches for it finds the bill.
function measureIdent(externalIds: unknown) {
  if (!externalIds || typeof externalIds !== "object") return null;
  const x = externalIds as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const session = str(x.utahSession);
  const readFrom = str(x.mappingReadFrom);
  const readFromUrl = str(x.mappingTextUrl);
  const officialTitle = str(x.officialTitle);
  // congress.gov before the BILLSTATUS XML: both are citable and both are already
  // on file, but one of them is a page a reader can actually read.
  const billUrl = str(x.congressGovUrl) || str(x.billStatusUrl);
  if (!session && !readFrom && !readFromUrl && !officialTitle && !billUrl) return null;
  return { session, readFrom, readFromUrl, officialTitle, billUrl };
}

// Build the compact pack for one member, newest-first, capped to PACK_ITEM_CAP.
export async function buildMemberPack(politicianId: string) {
  const rawVoteRows = await db
    .select({
      measureId: vrMeasures.id,
      measureType: vrMeasures.measureType,
      number: vrMeasures.number,
      title: vrMeasures.title,
      parentId: vrMeasures.parentId,
      status: vrMeasures.status,
      rollcallId: vrRollcalls.id,
      chamber: vrRollcalls.chamber,
      // The (congress, session, roll number) tuple. Carried so a client can build
      // the CANONICAL public roll-call page — clerk.house.gov/Votes/<year><roll>,
      // senate.gov/.../vote_<c>_<s>_<roll> — instead of printing whatever URL the
      // ingest happened to store (an api.congress.gov endpoint, a bill page, a
      // press release). See receipt-cards.js `canonicalCitation`.
      congress: vrRollcalls.congress,
      session: vrRollcalls.session,
      rollNumber: vrRollcalls.rollNumber,
      voteDate: vrRollcalls.voteDate,
      question: vrRollcalls.question,
      actionType: vrRollcalls.actionType,
      result: vrRollcalls.result,
      rcSourceUrl: vrRollcalls.sourceUrl,
      rcSourceLabel: vrRollcalls.sourceLabel,
      // The measure's own provenance bag, projected below to the three
      // reader-facing keys in it — see measureIdent(). The tuple above is the
      // citation for a FEDERAL roll call and is null on every state one, so
      // without this a Utah row in an offline pack cannot say which session's
      // H.B. 208 it is.
      externalIds: vrMeasures.externalIds,
      position: vrMemberVotes.position,
      isParty: vrMemberVotes.isParty,
    })
    .from(vrMemberVotes)
    .innerJoin(vrRollcalls, eq(vrMemberVotes.rollcallId, vrRollcalls.id))
    .innerJoin(vrMeasures, eq(vrRollcalls.measureId, vrMeasures.id))
    .where(eq(vrMemberVotes.politicianId, politicianId))
    .orderBy(desc(vrRollcalls.voteDate))
    .limit(FETCH_CAP);

  // CORRECTIONS OVERLAY. The offline pack is the one read that OUTLIVES the request:
  // it is cached in Blobs and served to a device that may not come back for days. A
  // corrected cell that is right online and wrong in the pack is the worst version of
  // this feature, so the overlay is applied here on exactly the same terms as the
  // live read. If the overlay table is not there yet, this is a no-op.
  const voteRows = applyCorrections(
    rawVoteRows as any[],
    await loadCorrections([politicianId]),
    politicianId
  );

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
      externalIds: vrMeasures.externalIds,
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
      advanceInverted: yeaBlocksMeasure(v.question),
      isAmendment: v.measureType === "amendment",
      parentMeasureId: v.parentId ?? null,
      rollcallId: v.rollcallId,
      congress: v.congress ?? null,
      session: v.session ?? null,
      rollNumber: v.rollNumber ?? null,
      measureIdent: measureIdent(v.externalIds),
      issues: issuesByMeasure.get(v.measureId) ?? [],
      source: { url: v.rcSourceUrl, label: v.rcSourceLabel },
      // Disclosure travels with the row into the offline pack, so an offline reader
      // sees the same "this cell was corrected, here is why" the live read shows.
      ...(v.corrections ? { corrections: v.corrections } : {}),
      ...(v.correctionsStale ? { correctionsStale: v.correctionsStale } : {}),
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
      advanceInverted: false, // a co-sponsorship / amicus has no procedural inversion
      isAmendment: p.measureType === "amendment",
      parentMeasureId: p.parentId ?? null,
      rollcallId: null,
      // A co-sponsorship / amicus has no roll call, so it has no roll-call page.
      congress: null,
      session: null,
      rollNumber: null,
      measureIdent: measureIdent(p.externalIds),
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

// Read the cached pack for one mapping version (or null). Best-effort — never
// throws. `mv` is required rather than defaulted: a caller that reads a pack
// without saying which mapping version it wants is the bug this parameter exists
// to make unwritable.
export async function getCachedPack(politicianId: string, mv: string): Promise<any | null> {
  try {
    const store = getStore(PACK_STORE);
    return (await store.get(packKey(politicianId, mv), { type: "json" })) as any;
  } catch {
    return null;
  }
}

// Build (unless `pack` supplied) and persist the pack under the CURRENT mapping
// version. Returns the pack it wrote, with the version it was written under
// stamped on it — so a client, a log line or a test can say which mapping a pack
// in hand was built from without re-deriving it.
//   `mv` is optional here, unlike on the read: the ingest calls this without one
// (netlify/lib/vr-ingest.ts), and "write it under whatever the mapping is right
// now" is the only thing it could mean.
export async function writeMemberPack(
  politicianId: string,
  pack?: any,
  mv?: string,
): Promise<any> {
  const version = mv ?? (await mappingVersion());
  const built = pack ?? (await buildMemberPack(politicianId));
  const finalPack = { ...built, mappingVersion: version };
  try {
    await getStore(PACK_STORE).setJSON(packKey(politicianId, version), finalPack);
  } catch {
    /* serve/return fresh even if the blob write fails */
  }
  return finalPack;
}

// Remove a member's cached pack for one mapping version (used to invalidate; the
// next read rebuilds). Defaults to the current version.
//
// NOT THE INVALIDATION MECHANISM ANY MORE, and deliberately not extended into
// one. Versioning the key retires old packs by making them unreachable, which is
// the property worth having: a delete sweep can fail, time out, or miss a key and
// nothing tells you, whereas a key that is never requested cannot be served.
export async function deletePack(politicianId: string, mv?: string): Promise<void> {
  try {
    const version = mv ?? (await mappingVersion());
    await getStore(PACK_STORE).delete(packKey(politicianId, version));
  } catch {
    /* ignore */
  }
}
