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
//      RELEVANT recent activity from the community/forum/promoted tables.
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
} from "../../db/schema.js";

// The site's Firebase project — the audience every valid ID token must carry.
// Kept in sync with the other Functions and the client firebaseConfig.
export const FIREBASE_PROJECT_ID = "politidex-979bd";

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

const SITE_URL = "https://politidex.org";
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

export interface Digest {
  since: number;
  now: number;
  evidence: EvidenceItem[];
  community: CommunityItem[];
  counts: { evidence: number; community: number; total: number };
}

// Per-group ceiling. A digest is a nudge, not a feed: we surface the most recent
// handful and let the user click through for the rest. Keeps email + in-app calm.
const GROUP_CAP = 8;
// How far back to look when a caller has no watermark yet (first-ever digest).
const DEFAULT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

function clip(s: unknown, n: number): string {
  const str = String(s == null ? "" : s).trim();
  return str.length > n ? str.slice(0, n - 1).trimEnd() + "…" : str;
}

// Build the "What Changed" digest for one set of interests since `sinceMs`.
// Only the SERVER-KNOWABLE groups live here — new community evidence and new
// discussion tied to the user's people/issues. Promise-status and team-membership
// changes are detected on the client (they live in static/local data) and merged
// into the same UI there.
export async function buildDigest(
  interests: Interests,
  sinceMs: number,
  topics: DigestTopics = { evidence: true, community: true }
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

  return {
    since,
    now,
    evidence,
    community,
    counts: {
      evidence: evidence.length,
      community: community.length,
      total: evidence.length + community.length,
    },
  };
}
