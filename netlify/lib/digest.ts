// ─────────────────────────────────────────────────────────────────────────────
// Digest core — shared logic for the Notifications & "What Changed" system
// ─────────────────────────────────────────────────────────────────────────────
// Lives OUTSIDE the functions directory (netlify/lib, not netlify/functions) so
// Netlify never deploys it as its own Function — it is a plain module imported by
// both the interactive endpoint (netlify/functions/pdx-digest.mts) and the
// scheduled email job (netlify/functions/pdx-digest-cron.mts).
//
// It holds three concerns those two share:
//   1. authenticate() — verify a Firebase ID token (same scheme as pdx-sync).
//   2. deriveInterests() — read a user's synced 'saved'/'team' snapshots and
//      distill the politician ids and issue keys they care about. This is how the
//      digest ties into the existing saved team, watched issues and sync with no
//      new client wiring: the data is already in pdx_snapshots.
//   3. buildDigest() — given those interests + a "since" watermark, pull the
//      RELEVANT recent activity: material record events from the roll-call corpus
//      (buildRecordEvents), plus new community evidence and discussion from the
//      community/forum/promoted tables.
//
// Everything here is READ-ONLY against the app's data and deliberately capped so a
// digest can never become a firehose — the product goal is calm and non-spammy.

import crypto from "node:crypto";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  ceePosts,
  ceePromoted,
  ceeItemComments,
  pdxForumThreads,
  pdxSnapshots,
  vrMeasureActions,
  vrMeasureIssues,
  vrMeasures,
  vrMemberVotes,
  vrPositions,
  vrRollcalls,
} from "../../db/schema.js";

// Pure wording / addressing / ordering for record events — see the header of that
// file for why it is separate and dependency-free.
import {
  ACTION_WORD, STAGE_WORD, VOTE_WORD,
  clip, labelForPoliticianId, measureLabel, personPath, rollcallPath, sortRecordEvents,
} from "./digest-record-core.mjs";

// The site's Firebase project — the audience every valid ID token must carry.
// Kept in sync with the other Functions and the client firebaseConfig.
export const FIREBASE_PROJECT_ID = "politidex-979bd";

// Re-exported so consumers keep importing it from this module.
export { labelForPoliticianId };

// ── Firebase ID token verification (mirrors pdx-sync / community) ─────────────
const GOOGLE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let _certCache: { certs: Record<string, string>; expires: number } | null = null;

async function getGoogleCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (_certCache && _certCache.expires > now) return _certCache.certs;
  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) throw new Error("Could not fetch Google signing certs");
  const certs = (await res.json()) as Record<string, string>;
  const cc = res.headers.get("cache-control") || "";
  const m = cc.match(/max-age=(\d+)/);
  const maxAge = m ? parseInt(m[1], 10) : 3600;
  _certCache = { certs, expires: now + maxAge * 1000 };
  return certs;
}

function b64urlToJson(seg: string): any {
  return JSON.parse(Buffer.from(seg, "base64url").toString("utf8"));
}

export interface AuthUser {
  uid: string;
  email: string | null;
}

// Verify the caller's Firebase ID token and return { uid, email }, or null when
// the token is missing/invalid/expired/anonymous. Never throws for a bad token —
// callers decide whether a route needs auth (prefs) or can run public (digest).
export async function authenticate(req: Request): Promise<AuthUser | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  let head: any, payload: any;
  try {
    head = b64urlToJson(parts[0]);
    payload = b64urlToJson(parts[1]);
  } catch {
    return null;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.aud !== FIREBASE_PROJECT_ID) return null;
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) return null;
  if (typeof payload.exp !== "number" || payload.exp < nowSec) return null;
  if (typeof payload.sub !== "string" || !payload.sub) return null;

  let certs: Record<string, string>;
  try {
    certs = await getGoogleCerts();
  } catch {
    // Transient — treat as "not verified" (the caller falls back to public data).
    return null;
  }
  const pem = certs[head.kid];
  if (!pem) return null;

  let ok = false;
  try {
    const pubKey = crypto.createPublicKey(pem);
    const signed = `${parts[0]}.${parts[1]}`;
    const sig = Buffer.from(parts[2], "base64url");
    ok = crypto.verify("RSA-SHA256", Buffer.from(signed), pubKey, sig);
  } catch {
    ok = false;
  }
  if (!ok) return null;

  const provider = payload.firebase?.sign_in_provider;
  const email = typeof payload.email === "string" ? payload.email : null;
  const isAnonymous = provider === "anonymous" || (!email && provider !== "custom");
  if (isAnonymous) return null;

  return { uid: payload.sub, email };
}

// ── One-click unsubscribe tokens (no login required) ──────────────────────────
// A recipient must be able to turn off email digests straight from the email —
// without signing in — both for basic courtesy and because bulk-mail deliverability
// (Gmail/Yahoo one-click unsubscribe, RFC 8058) depends on it. The token is a
// stateless HMAC over the user id, so no extra storage is needed and a link can't
// be forged or point at a different account.
//
// The signing secret is DIGEST_UNSUB_SECRET when set, else the Resend key (always
// present whenever email is actually being sent, so a live unsubscribe link is
// always verifiable). The project id is only a last-ditch fallback for a
// misconfigured environment; when no key is set, no email — and thus no link — is
// ever produced, so it can never be exercised in practice.
function unsubSecret(): string {
  return process.env.DIGEST_UNSUB_SECRET || process.env.RESEND_API_KEY || FIREBASE_PROJECT_ID;
}

export function makeUnsubToken(userId: string): string {
  const mac = crypto.createHmac("sha256", unsubSecret()).update(userId).digest("base64url").slice(0, 32);
  return `${Buffer.from(userId).toString("base64url")}.${mac}`;
}

// Returns the userId when the token is authentic, else null. Constant-time compare.
export function verifyUnsubToken(token: string): string | null {
  const parts = String(token || "").split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  let userId: string;
  try { userId = Buffer.from(parts[0], "base64url").toString("utf8"); } catch { return null; }
  if (!userId) return null;
  const expected = crypto.createHmac("sha256", unsubSecret()).update(userId).digest("base64url").slice(0, 32);
  const a = Buffer.from(parts[1]);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  try { return crypto.timingSafeEqual(a, b) ? userId : null; } catch { return null; }
}

// The single public origin. Every other surface in the repo already uses this
// apex host; the digest was one of the last places still naming the old
// .org domain, which meant every emailed unsubscribe link pointed at a host we
// do not serve. There is exactly one origin, and it is written here once.
const SITE_URL = "https://politidex.fyi";
export function unsubscribeUrl(userId: string): string {
  return `${SITE_URL}/api/pdx-digest/unsubscribe?u=${encodeURIComponent(makeUnsubToken(userId))}`;
}

// ── Interests ────────────────────────────────────────────────────────────────
export interface Interests {
  politicianIds: string[];
  issueKeys: string[];
}

function pushUnique(arr: string[], seen: Set<string>, v: unknown) {
  const s = typeof v === "string" ? v.trim() : "";
  if (s && !seen.has(s)) {
    seen.add(s);
    arr.push(s);
  }
}

// Extract a user's interests from an already-parsed pair of synced snapshots.
// Exported so the interactive endpoint can reuse the exact same distillation when
// a client sends its live snapshots inline. Tolerant of every historical shape.
export function interestsFromSnapshots(saved: any, team: any): Interests {
  const pids: string[] = [];
  const issues: string[] = [];
  const pSeen = new Set<string>();
  const iSeen = new Set<string>();

  // 'saved' — an array of items (receipts, issues, spotlights, politicians).
  const items = Array.isArray(saved?.items) ? saved.items : Array.isArray(saved) ? saved : [];
  for (const it of items) {
    if (!it || typeof it !== "object") continue;
    // Politician association: an explicit polId, a nav.polId, or a 'pol' item key.
    pushUnique(pids, pSeen, it.polId);
    pushUnique(pids, pSeen, it.nav && it.nav.polId);
    if (it.type === "pol" || it.type === "politician") pushUnique(pids, pSeen, it.key);
    // Issue association: an issueKey field, or an 'issue' item whose key IS the issue.
    pushUnique(issues, iSeen, it.issueKey);
    pushUnique(issues, iSeen, it.nav && it.nav.issue);
    if (it.type === "issue") pushUnique(issues, iSeen, it.key);
  }

  // 'team' — { ballot:{seat:pid}, roster:[pid], ... } plus the v2 flat array.
  if (team && typeof team === "object") {
    const ballot = team.ballot && typeof team.ballot === "object" ? team.ballot : {};
    for (const k in ballot) pushUnique(pids, pSeen, ballot[k]);
    const roster = Array.isArray(team.roster) ? team.roster : [];
    for (const r of roster) pushUnique(pids, pSeen, typeof r === "string" ? r : r && r.id);
    const v2 = Array.isArray(team.politidex_team_v2) ? team.politidex_team_v2 : [];
    for (const r of v2) pushUnique(pids, pSeen, r && r.pid);
  }

  return { politicianIds: pids, issueKeys: issues };
}

// Read a user's synced snapshots straight from the DB and distill interests. Used
// by the scheduled email job, which has no client to send them. Returns empty
// interests when the user has never synced (they simply get no email that cycle).
export async function deriveInterests(userId: string): Promise<Interests> {
  const rows = await db
    .select()
    .from(pdxSnapshots)
    .where(
      and(
        eq(pdxSnapshots.userId, userId),
        inArray(pdxSnapshots.collection, ["saved", "team"])
      )
    );
  let saved: any = null;
  let team: any = null;
  for (const r of rows) {
    if (r.collection === "saved") saved = r.snapshot;
    else if (r.collection === "team") team = r.snapshot;
  }
  return interestsFromSnapshots(saved, team);
}

// ── Digest builder ───────────────────────────────────────────────────────────
export interface DigestTopics {
  evidence: boolean;
  community: boolean;
  // Material record events — see buildRecordEvents(). Optional so an older caller
  // that only knows the two original topics keeps compiling; it defaults ON,
  // because a digest whose whole justification is "the archive changed" should not
  // need a flag flipped to say so.
  record?: boolean;
}

export interface EvidenceItem {
  source: "community" | "promoted";
  id: number;
  headline: string;
  summary: string;
  sourceUrl: string | null;
  issueKeys: string[];
  createdAt: string;
}

export interface CommunityItem {
  source: "thread" | "comment";
  id: number;
  title: string;
  snippet: string;
  link: { type: string | null; ref: string | null; label: string | null } | null;
  targetId?: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL RECORD EVENTS — what the digest is actually for
// ─────────────────────────────────────────────────────────────────────────────
// The other two groups are about the community. This one is about the archive:
// the formal record on the people and issues a reader tracks CHANGED, and here is
// the change with its citation.
//
// The four kinds, and what each one is:
//
//   "vote"     — a person the reader tracks has a newly recorded roll-call vote.
//                A formal act: dated, attributed to a chamber, with a clerk or
//                Congress.gov URL. Watermarked on when the row was INGESTED, so a
//                back-filled historical vote does announce itself once — which is
//                right, because for this reader it genuinely is new information.
//   "position" — a new sponsorship, co-sponsorship, amicus filing or committee
//                action by a tracked person. Watermarked on when the act HAPPENED
//                (vr_positions carries no ingest timestamp), which is the
//                conservative direction: a 2023 co-sponsorship loaded today is
//                never announced as this week's news.
//   "action"   — a new dated stage on a measure mapped to an issue the reader
//                follows: reported from committee, passed a chamber, enacted,
//                vetoed. The measure moved.
//   "mapping"  — a measure on a followed issue was added to the archive, or its
//                record was corrected (a citation repaired, a title
//                disambiguated, an issue mapping changed). Coverage expansion and
//                correction are the same event from a reader's side: what the site
//                holds about this issue is not what it held last week.
//
// WHAT IS NOT IN HERE, ON PURPOSE:
//   • No aggregate over people. No "worst of the week", no counts by party, no
//     ranking of anybody against anybody. Every item is ONE act with ONE citation.
//   • No verdict, no score, no percentage. This group reports that the record
//     moved; whether that is good is not the digest's to say. Nothing in it reads
//     Direction Match, and nothing in it feeds it.
//   • No party field, anywhere.
//   • Nothing without a source URL. Every table read here has a NOT NULL
//     source_url, and any row that somehow lacks one is dropped rather than sent —
//     an emailed claim a reader cannot check is the one thing worse than silence.
export interface RecordEvent {
  kind: "vote" | "position" | "action" | "mapping";
  // Stable-ish id for de-duping in a client; scoped by kind.
  id: number;
  // One line naming the act. Descriptive, never prosecutorial.
  headline: string;
  // The act's own words where the data has them ("House passed, 218–214").
  detail: string;
  // ISO date of the ACT (not of the ingest), or null when the row carries none.
  date: string | null;
  // The citation. Always present — an item without one is never emitted.
  sourceUrl: string;
  sourceLabel: string;
  // Where this lands on PolitiDex: a Phase-1 person file (/p/<pid>) for a
  // person-anchored act, a roll-call address (/vote/<congress>/<chamber>/<roll>)
  // for a measure-anchored one. Null only when neither address exists, in which
  // case a consumer links the citation itself.
  path: string | null;
  // The tracked person this act belongs to, when it is person-anchored.
  politicianId: string | null;
  // The followed issue keys this act touches, when it is issue-anchored.
  issueKeys: string[];
}

export interface Digest {
  since: number;
  now: number;
  evidence: EvidenceItem[];
  community: CommunityItem[];
  record: RecordEvent[];
  counts: { evidence: number; community: number; record: number; total: number };
}

// Per-group ceiling. A digest is a nudge, not a feed: we surface the most recent
// handful and let the user click through for the rest. Keeps email + in-app calm.
const GROUP_CAP = 8;
// How far back to look when a caller has no watermark yet (first-ever digest).
const DEFAULT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

// ── Record events ────────────────────────────────────────────────────────────
//
// The wording, the addressing and the ordering of a record event are pure
// transforms, and they live in ./digest-record-core.mjs so the test suite can RUN
// them rather than read them as text. Everything below is the part that needs the
// database: which rows to read, and how to narrow them to this reader.

const IN_CAP = 200; // ceiling on an IN (…) list, so one huge team cannot blow up a query

// Build the record-event group. Returns at most `cap` items, newest act first.
//
// Four independent reads, each already narrowed by the reader's interests and the
// watermark, then merged and dated. Anything without a source URL is dropped on the
// way out — see the note on RecordEvent.
export async function buildRecordEvents(
  interests: Interests,
  sinceDate: Date,
  cap: number
): Promise<RecordEvent[]> {
  const pids = interests.politicianIds.slice(0, IN_CAP);
  const issues = interests.issueKeys.slice(0, IN_CAP);
  const out: RecordEvent[] = [];

  // 1 · New roll-call votes by a tracked person.
  if (pids.length) {
    const rows = await db
      .select({
        id: vrMemberVotes.id,
        pid: vrMemberVotes.politicianId,
        position: vrMemberVotes.position,
        voteDate: vrRollcalls.voteDate,
        question: vrRollcalls.question,
        chamber: vrRollcalls.chamber,
        congress: vrRollcalls.congress,
        rollNumber: vrRollcalls.rollNumber,
        srcUrl: vrRollcalls.sourceUrl,
        srcLabel: vrRollcalls.sourceLabel,
        number: vrMeasures.number,
        shortTitle: vrMeasures.shortTitle,
        title: vrMeasures.title,
      })
      .from(vrMemberVotes)
      .innerJoin(vrRollcalls, eq(vrMemberVotes.rollcallId, vrRollcalls.id))
      .innerJoin(vrMeasures, eq(vrRollcalls.measureId, vrMeasures.id))
      .where(and(inArray(vrMemberVotes.politicianId, pids), gt(vrMemberVotes.createdAt, sinceDate)))
      .orderBy(desc(vrMemberVotes.createdAt))
      .limit(cap * 4);
    for (const r of rows) {
      if (!r.srcUrl) continue;
      out.push({
        kind: "vote",
        id: r.id,
        headline: `${labelForPoliticianId(r.pid)} ${VOTE_WORD[r.position] || "has a recorded vote"} on ` +
          measureLabel(r.number, r.shortTitle, r.title),
        detail: clip(r.question || "", 160),
        date: r.voteDate ? (r.voteDate as Date).toISOString() : null,
        sourceUrl: r.srcUrl,
        sourceLabel: r.srcLabel || "Congress.gov",
        // The person file is the spine: a vote is part of a person's record, and
        // the record is what /p/<pid> publishes.
        path: personPath(r.pid),
        politicianId: r.pid,
        issueKeys: [],
      });
    }
  }

  // 2 · New formal non-roll-call actions by a tracked person, dated after the
  //     watermark. See the note on RecordEvent for why this one keys on the act's
  //     own date rather than on ingest time.
  if (pids.length) {
    const rows = await db
      .select({
        id: vrPositions.id,
        pid: vrPositions.politicianId,
        actionType: vrPositions.actionType,
        actedAt: vrPositions.actedAt,
        note: vrPositions.note,
        srcUrl: vrPositions.sourceUrl,
        number: vrMeasures.number,
        shortTitle: vrMeasures.shortTitle,
        title: vrMeasures.title,
        measureSrcLabel: vrMeasures.sourceLabel,
      })
      .from(vrPositions)
      .innerJoin(vrMeasures, eq(vrPositions.measureId, vrMeasures.id))
      .where(and(inArray(vrPositions.politicianId, pids), gt(vrPositions.actedAt, sinceDate)))
      .orderBy(desc(vrPositions.actedAt))
      .limit(cap * 4);
    for (const r of rows) {
      if (!r.srcUrl) continue;
      out.push({
        kind: "position",
        id: r.id,
        headline: `${labelForPoliticianId(r.pid)} ${ACTION_WORD[r.actionType] || "took a formal action on"} ` +
          measureLabel(r.number, r.shortTitle, r.title),
        detail: clip(r.note || "", 160),
        date: r.actedAt ? (r.actedAt as Date).toISOString() : null,
        sourceUrl: r.srcUrl,
        sourceLabel: r.measureSrcLabel || "Congress.gov",
        path: personPath(r.pid),
        politicianId: r.pid,
        issueKeys: [],
      });
    }
  }

  // 3 · A measure on a followed issue moved a stage.
  if (issues.length) {
    const rows = await db
      .select({
        id: vrMeasureActions.id,
        stage: vrMeasureActions.stage,
        text: vrMeasureActions.text,
        actionDate: vrMeasureActions.actionDate,
        srcUrl: vrMeasureActions.sourceUrl,
        srcLabel: vrMeasureActions.sourceLabel,
        measureId: vrMeasureActions.measureId,
        number: vrMeasures.number,
        shortTitle: vrMeasures.shortTitle,
        title: vrMeasures.title,
        issueKey: vrMeasureIssues.issueKey,
      })
      .from(vrMeasureActions)
      .innerJoin(vrMeasures, eq(vrMeasureActions.measureId, vrMeasures.id))
      .innerJoin(vrMeasureIssues, eq(vrMeasureIssues.measureId, vrMeasures.id))
      .where(and(inArray(vrMeasureIssues.issueKey, issues), gt(vrMeasureActions.createdAt, sinceDate)))
      .orderBy(desc(vrMeasureActions.createdAt))
      .limit(cap * 4);
    // The issue join fans out one action into one row per mapped issue; fold them
    // back so a multi-issue bill is ONE item that names its issues, not four items
    // that look like four separate events.
    const byAction = new Map<number, RecordEvent>();
    for (const r of rows) {
      if (!r.srcUrl) continue;
      const seen = byAction.get(r.id);
      if (seen) {
        if (r.issueKey && seen.issueKeys.indexOf(r.issueKey) < 0) seen.issueKeys.push(r.issueKey);
        continue;
      }
      byAction.set(r.id, {
        kind: "action",
        id: r.id,
        headline: `${measureLabel(r.number, r.shortTitle, r.title)} ${STAGE_WORD[r.stage] || "moved"}`,
        detail: clip(r.text || "", 160),
        date: r.actionDate ? (r.actionDate as Date).toISOString() : null,
        sourceUrl: r.srcUrl,
        sourceLabel: r.srcLabel || "Congress.gov",
        path: null,
        politicianId: null,
        issueKeys: r.issueKey ? [r.issueKey] : [],
      });
    }
    for (const ev of byAction.values()) out.push(ev);
  }

  // 4 · A measure on a followed issue was added, or its record was corrected.
  //     updated_at defaults to now() at insert, so this one read covers both — and
  //     the two are distinguished by comparing created_at to the watermark.
  if (issues.length) {
    const rows = await db
      .select({
        id: vrMeasures.id,
        number: vrMeasures.number,
        shortTitle: vrMeasures.shortTitle,
        title: vrMeasures.title,
        srcUrl: vrMeasures.sourceUrl,
        srcLabel: vrMeasures.sourceLabel,
        createdAt: vrMeasures.createdAt,
        updatedAt: vrMeasures.updatedAt,
        congress: vrMeasures.congress,
        chamber: vrMeasures.chamber,
        issueKey: vrMeasureIssues.issueKey,
      })
      .from(vrMeasures)
      .innerJoin(vrMeasureIssues, eq(vrMeasureIssues.measureId, vrMeasures.id))
      .where(and(inArray(vrMeasureIssues.issueKey, issues), gt(vrMeasures.updatedAt, sinceDate)))
      .orderBy(desc(vrMeasures.updatedAt))
      .limit(cap * 4);
    const byMeasure = new Map<number, RecordEvent>();
    for (const r of rows) {
      if (!r.srcUrl) continue;
      const seen = byMeasure.get(r.id);
      if (seen) {
        if (r.issueKey && seen.issueKeys.indexOf(r.issueKey) < 0) seen.issueKeys.push(r.issueKey);
        continue;
      }
      const isNew = (r.createdAt as Date).getTime() > sinceDate.getTime();
      byMeasure.set(r.id, {
        kind: "mapping",
        id: r.id,
        headline: isNew
          ? `${measureLabel(r.number, r.shortTitle, r.title)} was added to the record`
          : `The record for ${measureLabel(r.number, r.shortTitle, r.title)} was updated`,
        detail: isNew
          ? "New coverage on an issue you follow."
          : "A citation, title or issue mapping on this measure changed.",
        date: (r.updatedAt as Date).toISOString(),
        sourceUrl: r.srcUrl,
        sourceLabel: r.srcLabel || "Congress.gov",
        path: null,
        politicianId: null,
        issueKeys: r.issueKey ? [r.issueKey] : [],
      });
    }
    for (const ev of byMeasure.values()) out.push(ev);
  }

  // One on-site address pass for the measure-anchored items: a roll call on the
  // same measure gives them a /vote/<congress>/<chamber>/<roll> home. Done as a
  // single extra read rather than one per item.
  const needPath = out.filter((e) => !e.path && (e.kind === "action" || e.kind === "mapping"));
  if (needPath.length) {
    // The action rows carry their measure id in `id`-adjacent form only, so resolve
    // by measure for the "mapping" kind (whose id IS the measure id) and leave the
    // "action" kind to its citation when no roll call is on file.
    const measureIds = [...new Set(needPath.filter((e) => e.kind === "mapping").map((e) => e.id))];
    if (measureIds.length) {
      const rcs = await db
        .select({
          measureId: vrRollcalls.measureId,
          congress: vrRollcalls.congress,
          chamber: vrRollcalls.chamber,
          rollNumber: vrRollcalls.rollNumber,
        })
        .from(vrRollcalls)
        .where(inArray(vrRollcalls.measureId, measureIds))
        .orderBy(desc(vrRollcalls.voteDate))
        .limit(IN_CAP);
      const path = new Map<number, string>();
      for (const rc of rcs) {
        if (path.has(rc.measureId)) continue; // newest wins
        const p = rollcallPath(rc.congress, rc.chamber, rc.rollNumber);
        if (p) path.set(rc.measureId, p);
      }
      for (const e of needPath) {
        if (e.kind === "mapping" && path.has(e.id)) e.path = path.get(e.id) || null;
      }
    }
  }

  // Newest act first; undated last. See sortRecordEvents() for why the tiebreak
  // is kind-then-id and not anything that could read as importance.
  sortRecordEvents(out);
  return out.slice(0, cap);
}

// Build the "What Changed" digest for one set of interests since `sinceMs`.
// Only the SERVER-KNOWABLE groups live here — new community evidence and new
// discussion tied to the user's people/issues. Promise-status and team-membership
// changes are detected on the client (they live in static/local data) and merged
// into the same UI there.
export async function buildDigest(
  interests: Interests,
  sinceMs: number,
  topics: DigestTopics = { evidence: true, community: true, record: true }
): Promise<Digest> {
  const now = Date.now();
  const since = Number.isFinite(sinceMs) && sinceMs > 0 ? sinceMs : now - DEFAULT_WINDOW_MS;
  const sinceDate = new Date(since);

  const issueSet = new Set(interests.issueKeys);
  const polSet = new Set(interests.politicianIds);
  const hasIssues = issueSet.size > 0;
  const hasPols = polSet.size > 0;

  const evidence: EvidenceItem[] = [];
  const community: CommunityItem[] = [];
  let record: RecordEvent[] = [];

  // ── Evidence group: new community submissions + graduated evidence on the
  //    issues the user watches. (Community posts are issue-tagged, not
  //    person-tagged, so this group keys on issues.) ─────────────────────────
  if (topics.evidence && hasIssues) {
    const posts = await db
      .select()
      .from(ceePosts)
      .where(and(eq(ceePosts.status, "active"), gt(ceePosts.createdAt, sinceDate)))
      .orderBy(desc(ceePosts.createdAt))
      .limit(200);
    for (const p of posts) {
      const keys = (p.issueKeys || []) as string[];
      const relevant =
        keys.some((k) => issueSet.has(k)) || (p.categoryKey ? issueSet.has(p.categoryKey) : false);
      if (!relevant) continue;
      evidence.push({
        source: "community",
        id: p.id,
        headline: clip(p.headline, 160),
        summary: clip(p.summary, 240),
        sourceUrl: p.sourceUrl || null,
        issueKeys: keys.filter((k) => issueSet.has(k)),
        createdAt: (p.createdAt as Date).toISOString(),
      });
      if (evidence.length >= GROUP_CAP) break;
    }

    if (evidence.length < GROUP_CAP) {
      const promoted = await db
        .select()
        .from(ceePromoted)
        .where(gt(ceePromoted.createdAt, sinceDate))
        .orderBy(desc(ceePromoted.createdAt))
        .limit(100);
      for (const g of promoted) {
        const keys = (g.issueKeys || []) as string[];
        const relevant =
          keys.some((k) => issueSet.has(k)) || (g.categoryKey ? issueSet.has(g.categoryKey) : false);
        if (!relevant) continue;
        evidence.push({
          source: "promoted",
          id: g.id,
          headline: clip(g.headline, 160),
          summary: clip(g.summary, 240),
          sourceUrl: g.sourceUrl || null,
          issueKeys: keys.filter((k) => issueSet.has(k)),
          createdAt: (g.createdAt as Date).toISOString(),
        });
        if (evidence.length >= GROUP_CAP) break;
      }
    }
  }

  // ── Community group: new discussion tied to the user's people or issues —
  //    forum threads deep-linked to them, and inline item-comments on their
  //    people (targetId "<type>:<politicianId>:<slug>"). ─────────────────────
  if (topics.community && (hasPols || hasIssues)) {
    const threads = await db
      .select()
      .from(pdxForumThreads)
      .where(and(eq(pdxForumThreads.status, "active"), gt(pdxForumThreads.createdAt, sinceDate)))
      .orderBy(desc(pdxForumThreads.createdAt))
      .limit(200);
    for (const t of threads) {
      const ref = t.linkRef || "";
      const relevant =
        (t.linkType === "politician" && polSet.has(ref)) ||
        (t.linkType === "issue" && issueSet.has(ref));
      if (!relevant) continue;
      community.push({
        source: "thread",
        id: t.id,
        title: clip(t.title, 160),
        snippet: clip(t.body, 200),
        link: { type: t.linkType, ref: t.linkRef, label: t.linkLabel },
        createdAt: (t.createdAt as Date).toISOString(),
      });
      if (community.length >= GROUP_CAP) break;
    }

    if (community.length < GROUP_CAP && hasPols) {
      const comments = await db
        .select()
        .from(ceeItemComments)
        .where(and(eq(ceeItemComments.status, "active"), gt(ceeItemComments.createdAt, sinceDate)))
        .orderBy(desc(ceeItemComments.createdAt))
        .limit(300);
      for (const c of comments) {
        const segs = String(c.targetId || "").split(":");
        const pid = segs.length >= 2 ? segs[1] : "";
        if (!pid || !polSet.has(pid)) continue;
        community.push({
          source: "comment",
          id: c.id,
          title: `New comment · ${segs[0] || "item"}`,
          snippet: clip(c.body, 200),
          link: null,
          targetId: c.targetId,
          createdAt: (c.createdAt as Date).toISOString(),
        });
        if (community.length >= GROUP_CAP) break;
      }
    }
  }

  // ── Record group: the archive itself changed on something the reader tracks.
  //    Defaults ON when a caller does not mention the topic at all — see the
  //    `record?` field on DigestTopics. ─────────────────────────────────────────
  if (topics.record !== false && (hasPols || hasIssues)) {
    record = await buildRecordEvents(interests, sinceDate, GROUP_CAP);
  }

  return {
    since,
    now,
    evidence,
    community,
    record,
    counts: {
      evidence: evidence.length,
      community: community.length,
      record: record.length,
      total: evidence.length + community.length + record.length,
    },
  };
}
