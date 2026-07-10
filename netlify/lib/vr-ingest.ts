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

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getStore } from "@netlify/blobs";
import { db } from "../../db/index.js";
import {
  vrMeasureIssues,
  vrMeasures,
  vrMemberVotes,
  vrRollcalls,
} from "../../db/schema.js";
import issueKeyData from "../../db/issue-keys.json" with { type: "json" };
import { writeMemberPack } from "./vr-pack.js";

const ISSUE_KEYS = new Set<string>((issueKeyData as { keys: string[] }).keys);
const ISSUE_KEYWORDS = (issueKeyData as { keywords?: Record<string, string[]> }).keywords || {};

const CONGRESS_API_BASE = "https://api.congress.gov/v3";
const MEMBER_MAP_STORE = "vr-config";
const MEMBER_MAP_KEY = "member-map"; // { [bioguideId]: rosterSlug }

// ── Types ────────────────────────────────────────────────────────────────────
export type RawMemberVote = {
  bioguideId?: string;
  name?: string;
  state?: string;
  party?: string; // 'R' | 'D' | 'I' | …
  position: string; // yea | nay | present | not_voting (already normalized)
};

export type RawVote = {
  chamber: string; // house | senate
  congress: number;
  session: number;
  rollNumber: number;
  voteDate: string; // ISO
  question: string | null;
  actionType: string; // passage | amendment | cloture | motion | …
  result: string | null;
  requiredMajority?: string;
  totals?: Record<string, number>;
  sourceUrl: string; // roll-call source (required — skipped if missing)
  sourceLabel?: string;
  measure: {
    measureType: string; // bill | resolution | amendment | nomination
    number: string | null;
    title: string;
    congress: number;
    chamber: string;
    sourceUrl: string; // measure source (Congress.gov) — required
    sourceLabel?: string;
    externalIds?: Record<string, string>;
  };
  memberVotes: RawMemberVote[];
};

export type IngestReport = {
  configured: boolean;
  fetched: number;
  measuresUpserted: number;
  rollcallsUpserted: number;
  memberVotesUpserted: number;
  membersUnmapped: number;
  issuesSuggested: number;
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

// Map one Congress.gov vote object into a RawVote. Defensive: returns null when
// the shape is unrecognisable or a required source is missing (verifiability).
export function normalizeCongressVote(v: any): RawVote | null {
  if (!v || typeof v !== "object") return null;
  const chamber = String(v.chamber || v.chamberCode || "").toLowerCase();
  if (chamber !== "house" && chamber !== "senate") return null;
  const rollNumber = Number(v.rollCallNumber ?? v.rollNumber ?? v.number);
  const congress = Number(v.congress);
  const session = Number(v.sessionNumber ?? v.session ?? 1);
  if (!Number.isFinite(rollNumber) || !Number.isFinite(congress)) return null;
  const voteDate = v.startDate || v.date || v.updateDate;
  if (!voteDate) return null;
  const sourceUrl = v.url || v.sourceUrl;
  if (!sourceUrl) return null;

  const rawMembers: any[] = v.members || v.votePositions || v.positions || [];
  const memberVotes: RawMemberVote[] = rawMembers.map((m: any) => ({
    bioguideId: m.bioguideId || m.bioguideID || m.memberId,
    name: m.name || m.fullName,
    state: m.state,
    party: m.party || m.partyCode,
    position: normalizePosition(m.votePosition || m.position || m.vote),
  })).filter((m) => !!m.position);

  const mm = v.legislation || v.bill || v.measure || {};
  const measureType = String(mm.type || v.legislationType || "bill").toLowerCase();
  return {
    chamber,
    congress,
    session,
    rollNumber,
    voteDate: new Date(voteDate).toISOString(),
    question: v.voteQuestion || v.question || null,
    actionType: mapActionType(v.voteType || v.question || ""),
    result: v.result || v.voteResult || null,
    requiredMajority: v.requiredMajority || "simple",
    totals: normalizeTotals(v.voteTotals || v.totals),
    sourceUrl,
    sourceLabel: chamber === "house" ? "U.S. House Clerk" : "U.S. Senate",
    measure: {
      measureType: ["bill", "resolution", "amendment", "nomination"].includes(measureType) ? measureType : "bill",
      number: mm.number ? `${mm.type || ""} ${mm.number}`.trim() : (v.legislationNumber || null),
      title: mm.title || v.legislationTitle || v.voteQuestion || `Roll call ${rollNumber}`,
      congress,
      chamber,
      sourceUrl: mm.url || `https://www.congress.gov/roll-call-vote/${congress}/${chamber}/${rollNumber}`,
      sourceLabel: "Congress.gov",
      externalIds: mm.congressGovId ? { congressGovId: String(mm.congressGovId) } : {},
    },
    memberVotes,
  };
}

function normalizePosition(p: any): string {
  const s = String(p || "").toLowerCase().trim();
  if (s === "yea" || s === "yes" || s === "aye") return "yea";
  if (s === "nay" || s === "no") return "nay";
  if (s === "present") return "present";
  if (s.indexOf("not") !== -1 || s === "") return "not_voting";
  return "";
}

function mapActionType(q: string): string {
  const s = String(q || "").toLowerCase();
  if (s.indexOf("amendment") !== -1) return "amendment";
  if (s.indexOf("cloture") !== -1) return "cloture";
  if (s.indexOf("passage") !== -1 || s.indexOf("concur") !== -1) return "passage";
  if (s.indexOf("nomination") !== -1) return "nomination";
  if (s.indexOf("veto") !== -1) return "veto_override";
  if (s.indexOf("motion") !== -1 || s.indexOf("recommit") !== -1 || s.indexOf("quorum") !== -1) return "motion";
  return "passage";
}

function normalizeTotals(t: any): Record<string, number> {
  if (!t || typeof t !== "object") return {};
  return {
    yea: Number(t.yea ?? t.yeas ?? t.yes ?? 0) || 0,
    nay: Number(t.nay ?? t.nays ?? t.no ?? 0) || 0,
    present: Number(t.present ?? 0) || 0,
    notVoting: Number(t.notVoting ?? t.not_voting ?? t.notvoting ?? 0) || 0,
  };
}

// ── Member resolution (curated map; never guesses) ───────────────────────────
export async function loadMemberMap(): Promise<Record<string, string>> {
  try {
    const store = getStore(MEMBER_MAP_STORE);
    const map = (await store.get(MEMBER_MAP_KEY, { type: "json" })) as Record<string, string> | null;
    return map && typeof map === "object" ? map : {};
  } catch {
    return {};
  }
}

// Compute each member's party-crossover flag from the majority party position.
function crossoverFlags(memberVotes: RawMemberVote[]): Map<RawMemberVote, string | null> {
  const flags = new Map<RawMemberVote, string | null>();
  const byParty: Record<string, Record<string, number>> = {};
  memberVotes.forEach((m) => {
    if (!m.party || (m.position !== "yea" && m.position !== "nay")) return;
    (byParty[m.party] = byParty[m.party] || {})[m.position] = ((byParty[m.party] || {})[m.position] || 0) + 1;
  });
  const majority: Record<string, string> = {};
  Object.keys(byParty).forEach((p) => {
    majority[p] = (byParty[p].yea || 0) >= (byParty[p].nay || 0) ? "yea" : "nay";
  });
  memberVotes.forEach((m) => {
    if (!m.party || (m.position !== "yea" && m.position !== "nay") || !majority[m.party]) {
      flags.set(m, null);
    } else {
      flags.set(m, m.position === majority[m.party] ? "with_party" : "against_party");
    }
  });
  return flags;
}

// Optional, conservative keyword classifier: suggest ONE issue for a measure when
// exactly one ISSUE_MAP issue's keywords clearly match its title. Marked as auto
// and never overwrites a curated mapping (onConflictDoNothing).
function suggestIssue(title: string): string | null {
  const t = String(title || "").toLowerCase();
  if (!t) return null;
  const hits: string[] = [];
  for (const key of Object.keys(ISSUE_KEYWORDS)) {
    const kws = ISSUE_KEYWORDS[key] || [];
    if (kws.some((kw) => kw && t.indexOf(String(kw).toLowerCase()) !== -1)) hits.push(key);
  }
  return hits.length === 1 && ISSUE_KEYS.has(hits[0]) ? hits[0] : null;
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

// ── Core loader: idempotent upserts. No network — unit-testable with fixtures. ─
export async function ingestVotes(
  rawVotes: RawVote[],
  opts: { classifyIssues?: boolean; memberMap?: Record<string, string> } = {}
): Promise<IngestReport> {
  const report: IngestReport = {
    configured: true, fetched: rawVotes.length, measuresUpserted: 0, rollcallsUpserted: 0,
    memberVotesUpserted: 0, membersUnmapped: 0, issuesSuggested: 0, packsWritten: 0, skipped: 0, errors: [],
  };
  const memberMap = opts.memberMap || (await loadMemberMap());
  const affectedMembers = new Set<string>();

  for (const v of rawVotes) {
    try {
      if (!v.sourceUrl || !v.measure?.sourceUrl) { report.skipped++; continue; } // verifiability gate

      const measureId = await upsertMeasure(v.measure);
      report.measuresUpserted++;

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
      memberVotesUpserted: 0, membersUnmapped: 0, issuesSuggested: 0, packsWritten: 0, skipped: 0,
      errors: ["CONGRESS_GOV_API_KEY not configured — ingest skipped"],
    };
  }
  const raw = await fetchRollcallsFromCongress(opts);
  return ingestVotes(raw, { classifyIssues: opts.classifyIssues });
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

  // Every mapped issue key must be in the shipped allow-list.
  const issueRows = await db.selectDistinct({ k: vrMeasureIssues.issueKey }).from(vrMeasureIssues);
  const badKeys = issueRows.map((r) => r.k).filter((k) => !ISSUE_KEYS.has(k));
  if (badKeys.length) problems.push(`unknown issue keys in vr_measure_issues: ${badKeys.join(", ")}`);

  return { ok: problems.length === 0, counts, issues: problems };
}
