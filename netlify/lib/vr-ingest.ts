// ─────────────────────────────────────────────────────────────────────────────
// Voting Record — ingest engine (shared library) · Phase 7
// ─────────────────────────────────────────────────────────────────────────────
// Pulls roll-call votes from Congress.gov into the vr_* tables at scale and
// refreshes the affected members' offline packs. It is deliberately SEPARATE from
// the read path (netlify/functions/voting-record.mts): the UI ships against the
// curated seed and simply keeps working; this pipeline layers more FACTUAL records
// on top over time.
//
// SAFE BY DEFAULT (mirrors pdx-digest-cron's email posture): with no
// CONGRESS_GOV_API_KEY set, the fetcher is a clean no-op — it logs "unconfigured"
// and ingests nothing, so the deploy stays green and no secret is ever hard-coded.
//
// WHAT IT INGESTS (objective, verifiable facts only):
//   • measures   — the bill / amendment a vote is on
//   • actions    — the legislative-action timeline (vr_measure_actions): milestone
//                  steps (introduced → passed a chamber → enacted/vetoed/…), each
//                  dated and citable. Additive + idempotent; never clobbers a curated
//                  seed timeline. On for live runs, off for fixture-fed unit tests.
//   • rollcalls  — the recorded vote event (idempotent by chamber+congress+session+number)
//   • memberVotes— how each member voted, ONLY when the member id resolves via the
//                  curated bioguide→roster map (see loadMemberMap). Unmapped members
//                  are skipped and counted, never guessed — mis-attribution is worse
//                  than a gap.
// WHAT IT DOES NOT INVENT: issue mappings + supportMeaning are editorial judgments
// that drive the stance-vs-record verdict, so they stay a CURATION step (the seed).
// An optional, conservative keyword classifier (classifyIssues) can SUGGEST an
// issue at low weight, clearly marked "auto — review", and never overwrites a
// curated mapping. It is OFF by default so the read path is never polluted with an
// unreviewed verdict signal.

import { and, eq, inArray, sql } from "drizzle-orm";
import { getStore } from "@netlify/blobs";
import { db } from "../../db/index.js";
import {
  vrMeasureActions,
  vrMeasureIssues,
  vrMeasureProvisions,
  vrMeasures,
  vrMemberVotes,
  vrRollcalls,
} from "../../db/schema.js";
import memberMapSeed from "../../db/vr-member-map.json" with { type: "json" };
import issueSeedData from "../../db/vr-issue-seed.json" with { type: "json" };
import measureIdentityData from "../../db/vr-measure-identity.json" with { type: "json" };
import { writeMemberPack } from "./vr-pack.js";
import { fetchSenateRollcalls } from "./vr-senate-source.js";
import {
  ISSUE_KEYS,
  canonicalMeasureNumber,
  canonicalizePidMap,
  crossoverFlags,
  normalizeCongressActions,
  normalizeCongressVote,
  normalizePosition,
  originatingChamber,
  splitMeasureNumber,
  suggestIssue,
  type RawAction,
  type RawMemberVote,
  type RawVote,
} from "./vr-normalize.js";

// Re-export the pure helpers/types so existing importers of this module keep working.
export {
  ISSUE_KEYS,
  canonicalMeasureNumber,
  canonicalPid,
  normalizeCongressVote,
  originatingChamber,
} from "./vr-normalize.js";
export type { RawMemberVote, RawVote } from "./vr-normalize.js";

// Committed fallback for the bioguide→roster map. The Blobs override (vr-config /
// member-map) wins when present, but shipping the map in the repo means the ingest
// attributes votes correctly out of the box — no manual Blobs write required to go
// live. Regenerate with scripts/vr-gen-member-map.mjs; push to Blobs (optional
// override) with scripts/vr-load-member-map.mjs.
const SEED_MEMBER_MAP: Record<string, string> =
  (memberMapSeed as { map?: Record<string, string> }).map || {};

const CONGRESS_API_BASE = "https://api.congress.gov/v3";
const MEMBER_MAP_STORE = "vr-config";
const MEMBER_MAP_KEY = "member-map"; // { [bioguideId]: rosterSlug }

// ── Types ────────────────────────────────────────────────────────────────────
export type IngestReport = {
  configured: boolean;
  fetched: number;
  measuresUpserted: number;
  rollcallsUpserted: number;
  memberVotesUpserted: number;
  membersUnmapped: number;
  issuesSuggested: number;
  actionsUpserted: number;
  curatedTitlesResolved: number;
  curatedMeasuresMatched: number;
  curatedIssuesUpserted: number;
  packsWritten: number;
  skipped: number;
  errors: string[];
};

// ── Congress.gov fetcher (key-gated, no-op + defensive) ──────────────────────
// Returns [] (and logs) when unconfigured or on any error, so a flaky upstream or
// a missing key never breaks the caller. Parsing is intentionally defensive: the
// engine below is source-agnostic and can be fed by any fetcher producing RawVote[].
//
// The live Congress.gov `{chamber}-vote/{congress}` endpoint returns vote SUMMARIES
// only — no chamber field and no per-member positions. Those positions live in a
// separate `/{congress}/{session}/{rollNumber}/members` sub-resource, so this is a
// TWO-STEP fetch: list the roll calls, then pull each one's members, tally the totals
// from them, and hand the enriched object (with an explicit chamber) to the normalizer.
function tallyMemberPositions(members: any[]): Record<string, number> {
  const t: Record<string, number> = { yea: 0, nay: 0, present: 0, notVoting: 0 };
  for (const m of members || []) {
    const p = normalizePosition(m.voteCast || m.votePosition || m.position || m.vote);
    if (p === "yea") t.yea++;
    else if (p === "nay") t.nay++;
    else if (p === "present") t.present++;
    else if (p === "not_voting") t.notVoting++;
  }
  return t;
}
// The list endpoint is NOT sorted by date — offset 0 of house-vote/119 returns rolls
// 240, 306, 241, 116, 122… in an order the API does not document. So `limit: 20` means
// "20 arbitrary roll calls", NOT "the 20 most recent", and re-running it re-fetches the
// same arbitrary slice forever. `offset` pages past it; `recent: true` fixes the ordering
// properly by walking the (cheap, summary-only) list pages, sorting by vote date, and
// keeping the newest `limit` — the expensive per-roll `/members` call is then made ONLY
// for the selected roll calls, so "newest 20" costs the same member fetches as before.
const LIST_PAGE = 250; // the API's max page size, and its own documented ceiling

function voteDateOf(row: any): string {
  return String(row?.startDate || row?.date || row?.voteDate || row?.updateDate || "");
}

async function fetchVoteListPage(
  chamber: string,
  congress: number,
  apiKey: string,
  limit: number,
  offset: number
): Promise<{ rows: any[]; count: number }> {
  const url =
    `${CONGRESS_API_BASE}/${chamber}-vote/${congress}` +
    `?format=json&limit=${limit}&offset=${offset}&api_key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    console.warn(`vr-ingest: Congress.gov ${res.status} for ${chamber}/${congress} @${offset}`);
    return { rows: [], count: 0 };
  }
  const data: any = await res.json();
  const rows: any[] =
    data?.[`${chamber}RollCallVotes`] ||
    data?.houseRollCallVotes ||
    data?.senateRollCallVotes ||
    data?.votes ||
    [];
  return { rows, count: Number(data?.pagination?.count ?? rows.length) };
}

export async function fetchRollcallsFromCongress(opts: {
  congress: number;
  chamber: string;
  limit?: number;
  offset?: number;
  recent?: boolean;
}): Promise<RawVote[]> {
  const apiKey = process.env.CONGRESS_GOV_API_KEY;
  if (!apiKey) {
    console.log("vr-ingest: CONGRESS_GOV_API_KEY not set — ingest is a no-op.");
    return [];
  }
  const chamber = opts.chamber === "senate" ? "senate" : "house";
  const limit = Math.min(Math.max(opts.limit || 20, 1), 250);
  const offset = Math.max(Number(opts.offset) || 0, 0);
  try {
    let rows: any[];
    if (opts.recent) {
      // Walk every summary page (1 request per 250 roll calls — no member sub-fetches),
      // then take the newest `limit` after `offset`. This is the only way to get a
      // date-ordered window out of an endpoint that returns no documented order.
      const all: any[] = [];
      let seen = 0;
      let total = Infinity;
      while (seen < total && all.length < 5000) {
        const page = await fetchVoteListPage(chamber, opts.congress, apiKey, LIST_PAGE, seen);
        if (!page.rows.length) break;
        all.push(...page.rows);
        seen += page.rows.length;
        total = page.count || seen;
      }
      all.sort((a, b) => voteDateOf(b).localeCompare(voteDateOf(a)));
      rows = all.slice(offset, offset + limit);
    } else {
      rows = (await fetchVoteListPage(chamber, opts.congress, apiKey, limit, offset)).rows;
    }

    const out: RawVote[] = [];
    for (const row of rows) {
      const session = Number(row.sessionNumber ?? row.session ?? 1);
      const num = Number(row.rollCallNumber ?? row.rollNumber ?? row.number);
      // Pull the per-member positions (sequentially, so a bulk run doesn't hammer the
      // API). A failed sub-fetch degrades to no member votes rather than dropping the
      // roll call — the measure + roll call are still worth recording.
      let members: any[] = [];
      // The members sub-resource ALSO returns per-vote metadata the list endpoint omits
      // entirely — voteQuestion ("On Motion to Recommit"), amendmentNumber/amendmentType
      // — which is what lets a vote be classified as procedural vs substantive and lets
      // an amendment become its own measure. We already make this call for the
      // positions, so merging its metadata costs no extra request.
      let meta: Record<string, any> = {};
      if (Number.isFinite(session) && Number.isFinite(num)) {
        try {
          const memUrl =
            `${CONGRESS_API_BASE}/${chamber}-vote/${opts.congress}/${session}/${num}/members` +
            `?format=json&api_key=${encodeURIComponent(apiKey)}`;
          const mres = await fetch(memUrl, { headers: { accept: "application/json" } });
          if (mres.ok) {
            const md: any = await mres.json();
            const container =
              md?.[`${chamber}RollCallVoteMemberVotes`] ||
              md?.houseRollCallVoteMemberVotes ||
              md?.senateRollCallVoteMemberVotes ||
              {};
            members = Array.isArray(container?.results) ? container.results : [];
            const { results: _drop, ...rest } = container as Record<string, any>;
            meta = rest || {};
          } else {
            console.warn(`vr-ingest: members ${mres.status} for ${chamber} roll ${num}`);
          }
        } catch (e: any) {
          console.warn(`vr-ingest: members fetch failed for ${chamber} roll ${num} —`, e?.message || String(e));
        }
      }
      // Explicit chamber (list items don't carry one) + derived totals (summary has none).
      // `meta` is spread AFTER `row` so the richer sub-resource fields win, but only
      // where present — a failed sub-fetch leaves `meta` empty and the row stands alone.
      const normalized = normalizeCongressVote(
        { ...row, ...meta, members, voteTotals: tallyMemberPositions(members) },
        chamber
      );
      if (normalized) out.push(normalized);
    }
    return out;
  } catch (e: any) {
    console.warn("vr-ingest: fetch failed —", e?.message || String(e));
    return [];
  }
}

// ── Legislative actions fetcher (the "how it moved" timeline) ────────────────
// Pulls a measure's action history from Congress.gov and reduces it to milestone
// rows for vr_measure_actions. Key-gated + defensive: returns [] (never throws) when
// unconfigured, on a non-bill number (nominations have no bill-actions endpoint), or
// on any upstream error, so a flaky call never breaks an ingest run.
export async function fetchMeasureActions(m: {
  measureType: string;
  congress: number;
  number: string | null;
}): Promise<RawAction[]> {
  const apiKey = process.env.CONGRESS_GOV_API_KEY;
  if (!apiKey) return [];
  const parts = splitMeasureNumber(m.number);
  if (!parts) return []; // e.g. a nomination label — no bill-actions endpoint
  const billPage = `https://www.congress.gov/bill/${m.congress}th-congress/${
    { hr: "house-bill", s: "senate-bill", hres: "house-resolution", sres: "senate-resolution",
      hjres: "house-joint-resolution", sjres: "senate-joint-resolution",
      hconres: "house-concurrent-resolution", sconres: "senate-concurrent-resolution" }[parts.billType] ||
    "house-bill"
  }/${parts.num}/all-actions`;
  const url =
    `${CONGRESS_API_BASE}/bill/${m.congress}/${parts.billType}/${parts.num}/actions` +
    `?format=json&limit=250&api_key=${encodeURIComponent(apiKey)}`;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return [];
    const data: any = await res.json();
    return normalizeCongressActions(data?.actions || [], { fallbackSourceUrl: billPage });
  } catch (e: any) {
    console.warn("vr-ingest: actions fetch failed —", e?.message || String(e));
    return [];
  }
}

// Idempotent upsert of a measure's action timeline. vr_measure_actions has no natural
// unique index (a measure can legitimately have two same-stage rows historically), so
// idempotency is a per-(measure, stage, date) existence check: a stage already present
// with the same date is left untouched. Additive — never deletes an existing row (so
// curated seed timelines are never clobbered by a later live pull).
export async function upsertMeasureActions(measureId: number, actions: RawAction[]): Promise<number> {
  let written = 0;
  for (const a of actions) {
    if (!a.sourceUrl) continue;
    const dateVal = a.actionDate ? new Date(a.actionDate) : null;
    const existing = await db
      .select({ id: vrMeasureActions.id })
      .from(vrMeasureActions)
      .where(
        and(
          eq(vrMeasureActions.measureId, measureId),
          eq(vrMeasureActions.stage, a.stage),
          dateVal ? eq(vrMeasureActions.actionDate, dateVal) : sql`${vrMeasureActions.actionDate} IS NULL`
        )
      )
      .limit(1);
    if (existing.length) continue;
    await db.insert(vrMeasureActions).values({
      measureId,
      stage: a.stage,
      chamber: a.chamber,
      actionDate: dateVal,
      text: a.text || "",
      sourceUrl: a.sourceUrl,
      sourceLabel: a.sourceLabel || "Congress.gov",
      sortOrder: ({
        introduced: 10, referred_committee: 15, reported_committee: 20, passed_house: 30,
        passed_senate: 40, resolving_differences: 50, to_president: 60, enacted: 70,
        vetoed: 71, veto_overridden: 72, failed: 80,
      } as Record<string, number>)[a.stage] ?? 90,
    });
    written++;
  }
  return written;
}

// ── Member resolution (curated map; never guesses) ───────────────────────────
// Blobs override (vr-config / member-map) wins when present and non-empty; otherwise
// the committed seed map (db/vr-member-map.json) is used. Either way, a bioguide the
// map doesn't know is skipped, never guessed.
//
// Whichever source wins, every slug is then run through db/vr-pid-aliases.json. A
// retired id (one a merge migration has already folded into another) resolves to its
// canonical id here, at the single point where a bioguide becomes a politician_id —
// so the ingest cannot re-open a split the merge just closed, not even from a stale
// Blobs override written before the merge.
export async function loadMemberMap(): Promise<Record<string, string>> {
  let map: Record<string, string> | null = null;
  try {
    const override = (await getStore(MEMBER_MAP_STORE).get(MEMBER_MAP_KEY, { type: "json" })) as
      | Record<string, string>
      | null;
    if (override && typeof override === "object" && Object.keys(override).length) map = override;
  } catch {
    /* fall through to the committed seed */
  }
  return canonicalizePidMap(map || SEED_MEMBER_MAP);
}

// Find-or-create a measure (there is no natural unique index on measures, so this
// is a manual idempotent upsert keyed by type+congress+chamber+number).
//
// NUMBERLESS VOTES: a few roll calls have no measure at all (Speaker elections,
// approving the Journal, quorum calls). Matching those on `number IS NULL` made every
// one of them collapse into whichever numberless row existed first — so a Speaker
// election, an amendment and an unrelated vote ended up sharing one measure row, and
// any issue mapping on it would have been attributed to all three. When there is no
// number, key on the title too: it is derived from the vote question, so it is stable
// across re-runs (still idempotent) but distinct per kind of vote.
// A title the vote feed had to invent because the roll-call endpoints carry no measure
// title: the bare legal citation ("H.R. 4758") or a "Roll call 78" fallback. Real titles
// (seeded, curated, or backfilled from the bill resource) must never be overwritten by
// one of these on a re-ingest — otherwise every re-run silently degrades the measure list.
function isProvisionalTitle(title: string | null | undefined, number: string | null | undefined): boolean {
  const t = String(title || "").trim();
  if (!t) return true;
  if (/^Roll call \d+$/i.test(t)) return true;
  return !!number && t === String(number).trim();
}

async function upsertMeasure(m: RawVote["measure"]): Promise<number> {
  const existing = await db
    .select({ id: vrMeasures.id, title: vrMeasures.title })
    .from(vrMeasures)
    .where(
      and(
        eq(vrMeasures.measureType, m.measureType),
        eq(vrMeasures.congress, m.congress),
        eq(vrMeasures.chamber, m.chamber),
        m.number
          ? eq(vrMeasures.number, m.number)
          : and(sql`${vrMeasures.number} IS NULL`, eq(vrMeasures.title, m.title))
      )
    )
    .limit(1);
  if (existing.length) {
    const keepTitle =
      isProvisionalTitle(m.title, m.number) && !isProvisionalTitle(existing[0].title, m.number);
    await db
      .update(vrMeasures)
      .set({
        ...(keepTitle ? {} : { title: m.title }),
        sourceUrl: m.sourceUrl,
        sourceLabel: m.sourceLabel || "Congress.gov",
        updatedAt: new Date(),
      })
      .where(eq(vrMeasures.id, existing[0].id));
    return existing[0].id;
  }
  const [row] = await db
    .insert(vrMeasures)
    .values({
      measureType: m.measureType,
      congress: m.congress,
      chamber: m.chamber,
      number: m.number,
      title: m.title,
      sourceUrl: m.sourceUrl,
      sourceLabel: m.sourceLabel || "Congress.gov",
      externalIds: m.externalIds || {},
      status: "pending",
    })
    .returning({ id: vrMeasures.id });
  return row.id;
}

// ── Curated measure identity (what the bill IS; keyed by natural identity) ────
// The roll-call endpoints carry no measure title, so a measure first seen through a
// vote lands as "Roll call 310" and stays unmappable — nobody can judge a vote on a
// bill nobody can name. db/vr-measure-identity.json holds identities read from the
// GPO BILLSTATUS bulk-data record for each measure's own (congress, type, number) and
// verified against the bill number, roll-call number and vote date we already hold.
//
// This is IDENTITY ONLY: it never writes an issue mapping. Naming a bill and deciding
// which issues it speaks to are separate judgements, and applyCuratedIssueSeed() owns
// the second one. It also never creates a measure, so an entry matching nothing is a
// harmless no-op.
//
// Non-destructive by construction: the title is replaced only while it is still
// provisional (isProvisionalTitle), and summary/introducedAt are filled only when
// empty. A better human-written title always wins, and re-running changes nothing.
type CuratedMeasureIdentity = {
  measures: Array<{
    congress: number;
    chamber: string;
    number: string;
    title: string;
    officialTitle?: string;
    identityTitleType?: string;
    summary?: string;
    summarySource?: string;
    introducedAt?: string;
    sponsorName?: string;
    policyArea?: string;
    laws?: string[];
    congressGovUrl?: string;
    source?: { label?: string; url?: string };
  }>;
};

const MEASURE_IDENTITY = (measureIdentityData as CuratedMeasureIdentity).measures || [];

export async function applyCuratedMeasureIdentity(
  seed: CuratedMeasureIdentity["measures"] = MEASURE_IDENTITY
): Promise<{ measuresMatched: number; measuresSkipped: number; titlesResolved: number }> {
  const out = { measuresMatched: 0, measuresSkipped: 0, titlesResolved: 0 };
  for (const entry of seed) {
    const number = canonicalMeasureNumber(entry.number);
    if (!number || !entry.title) continue;
    // Match on (congress, canonical number) across EVERY matching row — not
    // measureType, because the roll-call feeds and Congress.gov disagree about how to
    // type a resolution, and not chamber, because a measure number already names its
    // originating chamber while the row may have been created from the other
    // chamber's roll call. Not LIMIT 1, because the same number can legitimately
    // exist twice while a merge is pending; both rows deserve the real title.
    const found = await db
      .select({
        id: vrMeasures.id,
        title: vrMeasures.title,
        summary: vrMeasures.summary,
        introducedAt: vrMeasures.introducedAt,
        externalIds: vrMeasures.externalIds,
      })
      .from(vrMeasures)
      .where(and(eq(vrMeasures.congress, entry.congress), eq(vrMeasures.number, number)));
    if (!found.length) { out.measuresSkipped++; continue; }
    out.measuresMatched++;

    const provenance: Record<string, unknown> = {};
    if (entry.source?.label) provenance.identitySource = entry.source.label;
    if (entry.source?.url) provenance.billStatusUrl = entry.source.url;
    if (entry.officialTitle) provenance.officialTitle = entry.officialTitle;
    if (entry.identityTitleType) provenance.identityTitleType = entry.identityTitleType;
    if (entry.summarySource) provenance.summarySource = entry.summarySource;
    if (entry.congressGovUrl) provenance.congressGovUrl = entry.congressGovUrl;
    if (entry.sponsorName) provenance.sponsorName = entry.sponsorName;
    if (entry.policyArea) provenance.policyArea = entry.policyArea;
    if (entry.laws?.length) provenance.laws = entry.laws;

    for (const row of found) {
      const takeTitle = isProvisionalTitle(row.title, number);
      const patch: Record<string, unknown> = {
        externalIds: { ...provenance, ...((row.externalIds as Record<string, unknown>) || {}) },
        updatedAt: new Date(),
      };
      if (takeTitle) patch.title = entry.title;
      if (entry.summary && !String(row.summary || "").trim()) patch.summary = entry.summary;
      if (entry.introducedAt && !row.introducedAt) patch.introducedAt = new Date(`${entry.introducedAt}T00:00:00Z`);
      await db.update(vrMeasures).set(patch).where(eq(vrMeasures.id, row.id));
      if (takeTitle) out.titlesResolved++;
    }
  }
  return out;
}

// ── Curated issue mappings (editorial; keyed by natural measure identity) ─────
// issue mappings + supportMeaning drive the stance-vs-record verdict, so they are a
// human CURATION step, never auto-invented. This applies db/vr-issue-seed.json onto
// measures that ALREADY EXIST (from the seed migration or a live ingest), matched by
// (measureType, congress, chamber, canonical number). An entry that matches nothing
// yet is a harmless no-op — it can never create a measure — so a mistyped bill number
// simply never takes effect. Curated rows are authoritative: they overwrite an
// earlier auto-suggestion for the same (measure, issue). Unknown issue keys are
// rejected so the read path only ever sees allow-listed keys.
type CuratedIssueSeed = {
  measures: Array<{
    measureType: string;
    congress: number;
    chamber: string;
    number: string;
    sourceUrl?: string;
    issues: Array<{
      issueKey: string;
      weight?: number;
      isPrimary?: boolean;
      supportMeaning?: string;
      rationale?: string;
      sourceUrl?: string;
    }>;
  }>;
};

const ISSUE_SEED = (issueSeedData as CuratedIssueSeed).measures || [];

export async function applyCuratedIssueSeed(
  seed: CuratedIssueSeed["measures"] = ISSUE_SEED
): Promise<{ measuresMatched: number; measuresSkipped: number; issuesUpserted: number; badKeys: string[]; matchedMeasureIds: number[] }> {
  const out = { measuresMatched: 0, measuresSkipped: 0, issuesUpserted: 0, badKeys: [] as string[], matchedMeasureIds: [] as number[] };
  for (const entry of seed) {
    const number = canonicalMeasureNumber(entry.number);
    // Match on (congress, chamber, canonical number) — NOT measureType, and NOT
    // limited to one row. Congress.gov and the roll-call feeds disagree about how
    // to type a measure (a House resolution arrives typed 'bill' often enough),
    // and the same number can exist twice while a merge is pending. Matching on
    // type made a curated mapping silently no-op in both cases; matching every
    // row means the worst case is an idempotent re-upsert. The null-number branch
    // still needs the type to identify anything at all, so it keeps it.
    const found = await db
      .select({ id: vrMeasures.id })
      .from(vrMeasures)
      .where(
        number
          ? and(
              eq(vrMeasures.congress, entry.congress),
              eq(vrMeasures.chamber, entry.chamber),
              eq(vrMeasures.number, number)
            )
          : and(
              eq(vrMeasures.measureType, entry.measureType),
              eq(vrMeasures.congress, entry.congress),
              eq(vrMeasures.chamber, entry.chamber),
              sql`${vrMeasures.number} IS NULL`
            )
      );
    if (!found.length) { out.measuresSkipped++; continue; } // not ingested yet — no-op
    out.measuresMatched++;
    for (const row of found) {
      const measureId = row.id;
      out.matchedMeasureIds.push(measureId);
      for (const iss of entry.issues) {
        if (!ISSUE_KEYS.has(iss.issueKey)) { out.badKeys.push(iss.issueKey); continue; }
        const supportMeaning = iss.supportMeaning === "yea_opposes" ? "yea_opposes" : "yea_supports";
        const values = {
          measureId,
          issueKey: iss.issueKey,
          weight: typeof iss.weight === "number" ? iss.weight : 100,
          isPrimary: !!iss.isPrimary,
          supportMeaning,
          rationale: iss.rationale || "",
          sourceUrl: iss.sourceUrl || entry.sourceUrl || null,
        };
        await db
          .insert(vrMeasureIssues)
          .values(values)
          .onConflictDoUpdate({
            target: [vrMeasureIssues.measureId, vrMeasureIssues.issueKey],
            set: {
              weight: values.weight,
              isPrimary: values.isPrimary,
              supportMeaning: values.supportMeaning,
              rationale: values.rationale,
              sourceUrl: values.sourceUrl,
            },
          });
        out.issuesUpserted++;
      }
    }
  }
  return out;
}

// ── Core loader: idempotent upserts. No network — unit-testable with fixtures. ─
export async function ingestVotes(
  rawVotes: RawVote[],
  opts: { classifyIssues?: boolean; memberMap?: Record<string, string>; applyIssueSeed?: boolean; ingestActions?: boolean } = {}
): Promise<IngestReport> {
  const report: IngestReport = {
    configured: true, fetched: rawVotes.length, measuresUpserted: 0, rollcallsUpserted: 0,
    memberVotesUpserted: 0, membersUnmapped: 0, issuesSuggested: 0, actionsUpserted: 0,
    curatedTitlesResolved: 0, curatedMeasuresMatched: 0, curatedIssuesUpserted: 0, packsWritten: 0, skipped: 0, errors: [],
  };
  const memberMap = opts.memberMap || (await loadMemberMap());
  const affectedMembers = new Set<string>();

  for (const v of rawVotes) {
    try {
      if (!v.sourceUrl || !v.measure?.sourceUrl) { report.skipped++; continue; } // verifiability gate

      const measureId = await upsertMeasure(v.measure);
      report.measuresUpserted++;

      // Optional: backfill the legislative-action timeline from Congress.gov for this
      // measure (idempotent + additive; never clobbers a curated seed timeline). On by
      // default for live runs, off for fixture-fed unit tests (no network).
      if (opts.ingestActions) {
        try {
          const acts = await fetchMeasureActions({
            measureType: v.measure.measureType, congress: v.measure.congress, number: v.measure.number,
          });
          if (acts.length) report.actionsUpserted += await upsertMeasureActions(measureId, acts);
        } catch (e: any) {
          report.errors.push(`actions ${v.measure.number ?? measureId}: ${e?.message || String(e)}`);
        }
      }

      // Optional issue suggestion (never overwrites a curated mapping).
      if (opts.classifyIssues) {
        const suggested = suggestIssue(v.measure.title);
        if (suggested) {
          await db
            .insert(vrMeasureIssues)
            .values({
              measureId, issueKey: suggested, weight: 40, isPrimary: false,
              supportMeaning: "yea_supports",
              rationale: "auto-suggested from bill title — review before trusting the verdict",
              sourceUrl: v.measure.sourceUrl,
            })
            .onConflictDoNothing({ target: [vrMeasureIssues.measureId, vrMeasureIssues.issueKey] });
          report.issuesSuggested++;
        }
      }

      // Roll call — idempotent on (chamber, congress, session, rollNumber).
      //
      // The conflict branch is a REPAIR path, not a plain refresh. Before it existed a
      // row written by an earlier, buggier pull kept its defects forever: every House
      // roll call ingested while the classifier read voteType instead of the question
      // landed with question = NULL and action_type = 'passage', and no later pull —
      // however correct — could overwrite either field. So a motion to recommit stayed
      // recorded as a full-weight passage vote until someone wrote a migration for that
      // one row by hand. Now a correct later pull heals it.
      //
      // Non-destructive by construction, in both directions:
      //   • question is filled ONLY when the stored one is NULL/blank and the incoming
      //     one is present. A stored question is never replaced and never blanked — an
      //     incoming NULL leaves the row alone, so a pull from an endpoint that omits
      //     the question cannot erase text an earlier pull (or a migration) supplied.
      //   • action_type follows the question. It is re-derived only when the stored
      //     value provably came from no information: the stored question was blank, or
      //     the type is the explicit 'unknown', or it is the weak 'passage' default
      //     sitting on a question IDENTICAL to the incoming one whose own derivation
      //     says otherwise. That last case is the pre-fix classifier's signature, and
      //     matching on identical text is what makes the re-derivation sound —
      //     excluded.action_type IS mapActionType() of that same string. A curated or
      //     migration-corrected type on a row with a real question is left alone.
      // Nothing here invents text: every value written is either already in the row or
      // came from the incoming record.
      const storedQ = sql`coalesce(btrim(${vrRollcalls.question}), '')`;
      const incomingQ = sql`coalesce(btrim(excluded.question), '')`;
      const [rc] = await db
        .insert(vrRollcalls)
        .values({
          measureId, chamber: v.chamber, congress: v.congress, session: v.session,
          rollNumber: v.rollNumber, voteDate: new Date(v.voteDate), question: v.question,
          actionType: v.actionType, result: v.result, requiredMajority: v.requiredMajority || "simple",
          totals: v.totals || {}, sourceUrl: v.sourceUrl, sourceLabel: v.sourceLabel || "Congress.gov",
        })
        .onConflictDoUpdate({
          target: [vrRollcalls.chamber, vrRollcalls.congress, vrRollcalls.session, vrRollcalls.rollNumber],
          set: {
            result: v.result,
            totals: v.totals || {},
            measureId,
            question: sql`CASE WHEN ${storedQ} = '' AND ${incomingQ} <> ''
                               THEN excluded.question
                               ELSE ${vrRollcalls.question} END`,
            actionType: sql`CASE
                 WHEN ${incomingQ} = '' THEN ${vrRollcalls.actionType}
                 WHEN ${storedQ} = '' THEN excluded.action_type
                 WHEN ${vrRollcalls.actionType} = 'unknown' THEN excluded.action_type
                 WHEN ${vrRollcalls.actionType} = 'passage'
                  AND lower(${storedQ}) = lower(${incomingQ})
                  AND excluded.action_type <> 'passage' THEN excluded.action_type
                 ELSE ${vrRollcalls.actionType} END`,
            updatedAt: new Date(),
          },
        })
        .returning({ id: vrRollcalls.id });
      report.rollcallsUpserted++;

      // Member votes — only for resolvable members (never guess an attribution).
      const flags = crossoverFlags(v.memberVotes);
      for (const mv of v.memberVotes) {
        const pid = mv.bioguideId ? memberMap[mv.bioguideId] : null;
        if (!pid) { report.membersUnmapped++; continue; }
        await db
          .insert(vrMemberVotes)
          .values({ rollcallId: rc.id, politicianId: pid, position: mv.position, isParty: flags.get(mv) ?? null })
          .onConflictDoUpdate({
            target: [vrMemberVotes.rollcallId, vrMemberVotes.politicianId],
            set: { position: mv.position, isParty: flags.get(mv) ?? null },
          });
        report.memberVotesUpserted++;
        affectedMembers.add(pid);
      }
    } catch (e: any) {
      report.errors.push(e?.message || String(e));
    }
  }

  // Apply the curated measure→issue mappings (H.R. 1 above all) onto the measures
  // that now exist, and refresh the packs of everyone whose verdict-bearing issue
  // data therefore changed. Idempotent; skip only when a caller opts out (unit tests).
  if (opts.applyIssueSeed !== false) {
    try {
      // Identity first, mapping second: a curated mapping is only reviewable once the
      // measure has a real name, and applyCuratedMeasureIdentity() writes no mappings.
      const idRes = await applyCuratedMeasureIdentity();
      report.curatedTitlesResolved = idRes.titlesResolved;
    } catch (e: any) {
      report.errors.push(`curated measure identity failed: ${e?.message || e}`);
    }
    try {
      const seedRes = await applyCuratedIssueSeed();
      report.curatedMeasuresMatched = seedRes.measuresMatched;
      report.curatedIssuesUpserted = seedRes.issuesUpserted;
      if (seedRes.badKeys.length) {
        report.errors.push(`curated issue seed had unknown keys: ${[...new Set(seedRes.badKeys)].join(", ")}`);
      }
      if (seedRes.matchedMeasureIds.length) {
        const voters = await db
          .selectDistinct({ pid: vrMemberVotes.politicianId })
          .from(vrMemberVotes)
          .innerJoin(vrRollcalls, eq(vrMemberVotes.rollcallId, vrRollcalls.id))
          .where(inArray(vrRollcalls.measureId, seedRes.matchedMeasureIds));
        for (const r of voters) affectedMembers.add(r.pid);
      }
    } catch (e: any) {
      report.errors.push(`curated issue seed: ${e?.message || String(e)}`);
    }
  }

  // Refresh the offline packs for everyone whose record changed.
  for (const pid of affectedMembers) {
    try { await writeMemberPack(pid); report.packsWritten++; }
    catch (e: any) { report.errors.push(`pack ${pid}: ${e?.message || String(e)}`); }
  }

  return report;
}

// ── Top-level: fetch from the chamber's source, then load. ────────────────────
// The House pull requires a Congress.gov API key and is a clean no-op without one.
// The Senate pull is served by the curated seed (netlify/lib/vr-senate-source.ts),
// which needs NO key — so only the House is gated on the key here.
export async function runIngest(opts: {
  congress: number;
  chamber: string;
  limit?: number;
  offset?: number;
  recent?: boolean;
  classifyIssues?: boolean;
}): Promise<IngestReport> {
  const chamber = String(opts.chamber).toLowerCase();
  const hasCongressKey = !!process.env.CONGRESS_GOV_API_KEY;
  if (chamber !== "senate" && !hasCongressKey) {
    return {
      configured: false, fetched: 0, measuresUpserted: 0, rollcallsUpserted: 0,
      memberVotesUpserted: 0, membersUnmapped: 0, issuesSuggested: 0, actionsUpserted: 0,
      curatedTitlesResolved: 0, curatedMeasuresMatched: 0, curatedIssuesUpserted: 0, packsWritten: 0, skipped: 0,
      errors: ["CONGRESS_GOV_API_KEY not configured — House ingest skipped"],
    };
  }
  const raw = await fetchChamberRollcalls(opts);
  // The action-timeline backfill hits Congress.gov, so only attempt it when a key is
  // present; without one it is a no-op regardless (fetchMeasureActions is key-gated).
  return ingestVotes(raw, { classifyIssues: opts.classifyIssues, ingestActions: hasCongressKey });
}

// Chamber router: the House pulls from the Congress.gov API; the Senate has no such
// API resource, so it pulls from the dedicated Senate source layer (curated seed today,
// live senate.gov XML next). Both return the same RawVote[] shape, so ingestVotes and
// everything downstream stay chamber-agnostic.
async function fetchChamberRollcalls(opts: {
  congress: number;
  chamber: string;
  limit?: number;
  offset?: number;
  recent?: boolean;
}): Promise<RawVote[]> {
  if (String(opts.chamber).toLowerCase() === "senate") {
    return fetchSenateRollcalls({ congress: opts.congress, limit: opts.limit });
  }
  return fetchRollcallsFromCongress(opts);
}

// ── Verification: an integrity report over the vr_* tables ────────────────────
export async function verify(): Promise<{
  ok: boolean;
  counts: Record<string, number>;
  issues: string[];
}> {
  const problems: string[] = [];
  const counts: Record<string, number> = {};
  const count = async (label: string, q: any): Promise<number> => {
    const [r] = await q;
    counts[label] = Number(r?.n ?? 0);
    return counts[label];
  };

  await count("measures", db.select({ n: sql<number>`count(*)` }).from(vrMeasures));
  await count("rollcalls", db.select({ n: sql<number>`count(*)` }).from(vrRollcalls));
  await count("memberVotes", db.select({ n: sql<number>`count(*)` }).from(vrMemberVotes));
  await count("measureIssues", db.select({ n: sql<number>`count(*)` }).from(vrMeasureIssues));
  await count("measureActions", db.select({ n: sql<number>`count(*)` }).from(vrMeasureActions));
  await count("measureProvisions", db.select({ n: sql<number>`count(*)` }).from(vrMeasureProvisions));

  // Verifiability: no measure/rollcall may lack a source (schema enforces NOT NULL,
  // but empty strings would slip through — check for those too).
  const unsourcedMeasures = await count(
    "unsourcedMeasures",
    db.select({ n: sql<number>`count(*)` }).from(vrMeasures).where(sql`coalesce(${vrMeasures.sourceUrl}, '') = ''`)
  );
  if (unsourcedMeasures > 0) problems.push(`${unsourcedMeasures} measures with no source URL`);

  const unsourcedRollcalls = await count(
    "unsourcedRollcalls",
    db.select({ n: sql<number>`count(*)` }).from(vrRollcalls).where(sql`coalesce(${vrRollcalls.sourceUrl}, '') = ''`)
  );
  if (unsourcedRollcalls > 0) problems.push(`${unsourcedRollcalls} rollcalls with no source URL`);

  const unsourcedActions = await count(
    "unsourcedActions",
    db.select({ n: sql<number>`count(*)` }).from(vrMeasureActions).where(sql`coalesce(${vrMeasureActions.sourceUrl}, '') = ''`)
  );
  if (unsourcedActions > 0) problems.push(`${unsourcedActions} measure actions with no source URL`);

  // Every mapped issue key must be in the shipped allow-list.
  const issueRows = await db.selectDistinct({ k: vrMeasureIssues.issueKey }).from(vrMeasureIssues);
  const badKeys = issueRows.map((r) => r.k).filter((k) => !ISSUE_KEYS.has(k));
  if (badKeys.length) problems.push(`unknown issue keys in vr_measure_issues: ${badKeys.join(", ")}`);

  // No two measures may share a natural identity (type, congress, chamber, number) —
  // a duplicate means measure-number canonicalization let a bill split across rows.
  const dups = await db
    .select({
      t: vrMeasures.measureType, c: vrMeasures.congress, ch: vrMeasures.chamber,
      num: vrMeasures.number, n: sql<number>`count(*)`,
    })
    .from(vrMeasures)
    .where(sql`${vrMeasures.number} is not null`)
    .groupBy(vrMeasures.measureType, vrMeasures.congress, vrMeasures.chamber, vrMeasures.number)
    .having(sql`count(*) > 1`);
  counts.duplicateMeasureGroups = dups.length;
  if (dups.length) {
    problems.push(
      `duplicate measures: ${dups.map((d) => `${d.num} (${d.ch}/${d.c}) ×${d.n}`).join(", ")}`
    );
  }

  // Member-vote attribution health (visibility, not a hard failure).
  await count(
    "distinctMembersWithVotes",
    db.select({ n: sql<number>`count(distinct ${vrMemberVotes.politicianId})` }).from(vrMemberVotes)
  );
  counts.memberMapEntries = Object.keys(SEED_MEMBER_MAP).length;

  // The flagship measure must stay mapped so its verdict signal never goes dark.
  const hr1Issues = await count(
    "flagshipHr1Issues",
    db
      .select({ n: sql<number>`count(*)` })
      .from(vrMeasureIssues)
      .innerJoin(vrMeasures, eq(vrMeasureIssues.measureId, vrMeasures.id))
      .where(and(eq(vrMeasures.number, "H.R. 1"), eq(vrMeasures.congress, 119)))
  );
  if (counts.measures > 0 && hr1Issues === 0) {
    problems.push("flagship H.R. 1 (119) has no issue mappings");
  }

  return { ok: problems.length === 0, counts, issues: problems };
}
