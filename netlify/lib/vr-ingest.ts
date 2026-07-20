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
import { writeMemberPack } from "./vr-pack.js";
import {
  ISSUE_KEYS,
  canonicalMeasureNumber,
  crossoverFlags,
  normalizeCongressActions,
  normalizeCongressVote,
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
export async function fetchRollcallsFromCongress(opts: {
  congress: number;
  chamber: string;
  limit?: number;
}): Promise<RawVote[]> {
  const apiKey = process.env.CONGRESS_GOV_API_KEY;
  if (!apiKey) {
    console.log("vr-ingest: CONGRESS_GOV_API_KEY not set — ingest is a no-op.");
    return [];
  }
  const limit = Math.min(Math.max(opts.limit || 20, 1), 250);
  const url =
    `${CONGRESS_API_BASE}/${opts.chamber}-vote/${opts.congress}` +
    `?format=json&limit=${limit}&api_key=${encodeURIComponent(apiKey)}`;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) {
      console.warn(`vr-ingest: Congress.gov ${res.status} for ${opts.chamber}/${opts.congress}`);
      return [];
    }
    const data: any = await res.json();
    const rows: any[] = data?.votes || data?.houseRollCallVotes || data?.senateVotes || [];
    return rows.map(normalizeCongressVote).filter((v): v is RawVote => !!v);
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
export async function loadMemberMap(): Promise<Record<string, string>> {
  try {
    const store = getStore(MEMBER_MAP_STORE);
    const map = (await store.get(MEMBER_MAP_KEY, { type: "json" })) as Record<string, string> | null;
    if (map && typeof map === "object" && Object.keys(map).length) return map;
  } catch {
    /* fall through to the committed seed */
  }
  return { ...SEED_MEMBER_MAP };
}

// Find-or-create a measure (there is no natural unique index on measures, so this
// is a manual idempotent upsert keyed by type+congress+chamber+number).
async function upsertMeasure(m: RawVote["measure"]): Promise<number> {
  const existing = await db
    .select({ id: vrMeasures.id })
    .from(vrMeasures)
    .where(
      and(
        eq(vrMeasures.measureType, m.measureType),
        eq(vrMeasures.congress, m.congress),
        eq(vrMeasures.chamber, m.chamber),
        m.number ? eq(vrMeasures.number, m.number) : sql`${vrMeasures.number} IS NULL`
      )
    )
    .limit(1);
  if (existing.length) {
    await db
      .update(vrMeasures)
      .set({ title: m.title, sourceUrl: m.sourceUrl, sourceLabel: m.sourceLabel || "Congress.gov", updatedAt: new Date() })
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
    const found = await db
      .select({ id: vrMeasures.id })
      .from(vrMeasures)
      .where(
        and(
          eq(vrMeasures.measureType, entry.measureType),
          eq(vrMeasures.congress, entry.congress),
          eq(vrMeasures.chamber, entry.chamber),
          number ? eq(vrMeasures.number, number) : sql`${vrMeasures.number} IS NULL`
        )
      )
      .limit(1);
    if (!found.length) { out.measuresSkipped++; continue; } // not ingested yet — no-op
    out.measuresMatched++;
    const measureId = found[0].id;
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
    curatedMeasuresMatched: 0, curatedIssuesUpserted: 0, packsWritten: 0, skipped: 0, errors: [],
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
          set: { result: v.result, totals: v.totals || {}, measureId, updatedAt: new Date() },
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

// ── Top-level: fetch from Congress.gov, then load. No-op when unconfigured. ────
export async function runIngest(opts: {
  congress: number;
  chamber: string;
  limit?: number;
  classifyIssues?: boolean;
}): Promise<IngestReport> {
  if (!process.env.CONGRESS_GOV_API_KEY) {
    return {
      configured: false, fetched: 0, measuresUpserted: 0, rollcallsUpserted: 0,
      memberVotesUpserted: 0, membersUnmapped: 0, issuesSuggested: 0, actionsUpserted: 0,
      curatedMeasuresMatched: 0, curatedIssuesUpserted: 0, packsWritten: 0, skipped: 0,
      errors: ["CONGRESS_GOV_API_KEY not configured — ingest skipped"],
    };
  }
  const raw = await fetchRollcallsFromCongress(opts);
  return ingestVotes(raw, { classifyIssues: opts.classifyIssues, ingestActions: true });
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
