// ─────────────────────────────────────────────────────────────────────────────
// Action layer v1 — bill topic sorter + raw vote mapping generator
// ─────────────────────────────────────────────────────────────────────────────
// Runs PARALLEL to the stance generator (raw-ingest-cron), never inside it. The
// stance generator reads what politicians SAY; this reads what they DID: recent
// federal roll calls, each voted-on measure tagged with the issue keys it touches,
// and one raw record per member per roll call. A later pass can compare the two.
//
// WHAT IT WRITES (pdx_action_bills, pdx_vote_actions — see db/schema.ts):
//   • one bill row per voted-on measure: raw title / summary / official subjects
//     and every issue key the bill's own text matches (presence only — no
//     score, ranking, threshold or cap; the matching signals are kept per key)
//   • one vote row per member per roll call: politician, bill, vote
//     (yes / no / present / not_voting), date, source, question, vote kind and
//     the bill's topic tags
// WHAT IT NEVER DOES: score, pick a support/oppose direction, flag a
// contradiction, or write any table / store a public read uses (vr_*, packs,
// pdx_stated_positions, curated stance files). Tags come from the bill's own
// text only — no vote-derived signal and no curated mapping is read.
//
// SOURCES (federal only in v1):
//   House  — Congress.gov API house-vote list + /members (bioguide ids). Needs
//            CONGRESS_GOV_API_KEY; without it the House side is a logged no-op.
//   Senate — senate.gov LIS XML (vote menu + per-vote document). No key. LIS ids
//            resolve to bioguide through the public congress-legislators dataset;
//            an id that does not resolve keeps its LIS id and no politician.
//   Bill text — Congress.gov bill / subjects / summaries / amendment endpoints
//            when the key is set; otherwise the vote document's own title.
//
// INCOMPLETE / DELAYED DATA:
//   • a roll call whose member list is missing or empty is NOT marked done — it
//     is retried on later runs (MAX_ATTEMPTS), then parked as "incomplete"
//   • a roll call with a vote word outside yes/no/present/not voting (Speaker
//     elections, impeachment "Guilty") is parked "unsupported" — nothing is
//     flattened into the four values
//   • a bill read without a CRS summary (summaries lag passage by weeks) is
//     refetched later (META_REFRESH_*) and re-tagged; its vote rows' tags follow
//   • a re-read that shows a different vote updates the row and stamps revised_at
//
// Pure logic over injected deps (fetch, repo, state store, clock) so
// scripts/test-vote-actions.mjs runs it with no network and no database.

import { BILL_KEY_PATTERNS, MAPPED_KEYS } from "./bill-key-patterns.mjs";
import { ISSUE_KEYS, suggestIssue, mapActionType, canonicalMeasureNumber } from "./vr-normalize.js";
import { ISSUE_TOPIC_VOCAB, DIRECTIONAL_TOPIC_VOCAB, buildTopicRules, buildDirectionalTopicRules } from "./stance-topic-vocab.mjs";
import { RELATED_ISSUE_KEYS } from "./related-issue-keys.mjs";
import coreCategories from "../../db/issue-core-categories.json" with { type: "json" };

// ── Knobs ────────────────────────────────────────────────────────────────────
export const TAGGER_VERSION = "va-tagger-v4"; // v2: no tag-count cap · v3: presence-only · v4: high / low impact tiers
export const STATE_STORE_NAME = "vote-actions-state";
export const STATE_KEY = "state.json";
export const RUN_BUDGET_MS = 22_000;          // scheduled functions stop at ~30 s
export const FETCH_TIMEOUT_MS = 8_000;
export const MAX_ROLLS_PER_RUN = 12;          // detail fetches per run (both chambers)
export const LOOKBACK_DAYS = 120;             // "recent": roll calls newer than this
export const MAX_ATTEMPTS = 6;                // empty / failed detail fetches before "incomplete"
export const META_REFRESH_PER_RUN = 3;        // bills refetched for a late summary per run
export const META_REFRESH_AFTER_DAYS = 3;
export const META_MAX_ATTEMPTS = 6;
export const RETAG_PER_RUN = 200;             // local re-tags after a tagger version bump
export const LIS_INDEX_MAX_AGE_DAYS = 7;
export const MULTI_TOPIC_CATEGORIES = 3;

const CONGRESS_API = "https://api.congress.gov/v3";
const SENATE_LIS = "https://www.senate.gov/legislative/LIS";
export const LEGISLATORS_URL = "https://unitedstates.github.io/congress-legislators/legislators-current.json";
const UA = "PolitiDex vote-actions/1 (+https://politidex.fyi)";

// The tag allow-list: the issue-key register the related-issues map relates.
// Both lists are generated from the same register and must agree.
export const TAG_KEYS = new Set<string>((RELATED_ISSUE_KEYS as string[]).filter((k) => ISSUE_KEYS.has(k)));
const CATEGORY_OF: Record<string, string> = (coreCategories as any).categoryOf || {};

// ── Types ────────────────────────────────────────────────────────────────────
export type Vote = "yes" | "no" | "present" | "not_voting";
export type MemberCast = {
  scheme: "bioguide" | "lis";
  id: string;
  name?: string | null;
  party?: string | null;
  state?: string | null;
  vote: Vote;
  voteRaw: string;
};
export type MeasureRef = {
  billKey: string;
  billType: string;         // hr, s, hamdt, pn …
  num: string;
  number: string | null;    // canonical citation
  measureType: "bill" | "resolution" | "amendment" | "nomination";
  parentBillKey: string | null;
  parentBillType?: string | null;
  parentNum?: string | null;
  feedTitle?: string | null; // whatever title / purpose the vote document carries
};
export type RollRecord = {
  jurisdiction: "us";
  chamber: "house" | "senate";
  congress: number;
  session: number;
  roll: number;
  voteDate: string;          // ISO
  question: string | null;
  voteKind: string;
  isProcedural: boolean | null;
  result: string | null;
  sourceUrl: string;
  sourceLabel: string;
  measure: MeasureRef | null;
  members: MemberCast[];
  unsupported: string[];     // vote words outside the four values
};
export type BillMeta = {
  title: string;
  shortTitle?: string | null;
  summary?: string | null;
  policyArea?: string | null;
  subjects?: string[];
  sourceUrl: string;
  metaSource: "congress_gov" | "senate_xml" | "vote_feed";
  parentBillKey?: string | null;
};
export type ImpactTier = "high" | "low";
// confidence is used ONLY to pick the tier; it never drops or ranks a tag.
export type TagDetail = { key: string; category: string | null; signals: string[]; confidence: number; impactTier: ImpactTier; tierReasons: string[] };
export type TagResult = {
  tags: string[]; highTags: string[]; lowTags: string[]; detail: TagDetail[]; multiTopic: boolean; version: string; untagged?: string;
  billImpact: { majorBill: string | null; scale: string | null; minorBill: string | null };
};
export type BillRow = {
  billKey: string; congress: number; measureType: string; billType: string; number: string | null;
  parentBillKey: string | null; title: string; shortTitle: string | null; summary: string; policyArea: string | null;
  officialSubjects: string[]; topicTags: string[]; tagDetail: TagDetail[]; multiTopic: boolean; taggerVersion: string;
  metaSource: string; hasSummary: boolean; metaAttempts: number; metaFetchedAt: string | null; sourceUrl: string;
  rawRef?: string | null;   // raw-ingest-votes key of the bill-metadata payload
};
export type VoteRow = {
  jurisdiction: string; chamber: string; congress: number; session: number; rollNumber: number; voteDate: string;
  billKey: string; parentBillKey: string | null; measureNumber: string | null; politicianId: string | null;
  memberIdScheme: string; memberId: string; bioguideId: string | null; memberName: string | null;
  party: string | null; state: string | null; vote: Vote; voteRaw: string; question: string | null;
  voteKind: string; isProcedural: boolean | null; result: string | null; topicTags: string[];
  taggerVersion: string; sourceUrl: string; sourceLabel: string;
  rawRef?: string | null;   // raw-ingest-votes key of the roll-call payload
};
export interface VoteActionsRepo {
  getBill(billKey: string): Promise<BillRow | null>;
  upsertBill(row: BillRow): Promise<void>;
  // Upsert by the unique roll/member key; returns how many rows were new and how
  // many changed vote on re-read (revised).
  upsertVotes(rows: VoteRow[]): Promise<{ inserted: number; revised: number }>;
  // Copy a bill's (re-)computed tags onto its vote rows.
  retagVotes(billKey: string, tags: string[], version: string): Promise<number>;
  billsNeedingMeta(opts: { olderThan: string; maxAttempts: number; limit: number }): Promise<BillRow[]>;
  billsWithStaleTags(version: string, limit: number): Promise<BillRow[]>;
}

// ── Small helpers ────────────────────────────────────────────────────────────
const str = (v: unknown) => String(v ?? "").trim();
const pad3 = (n: number) => String(n).padStart(3, "0");
const pad5 = (n: number) => String(n).padStart(5, "0");
const DAY = 86_400_000;

export function congressForDate(d: Date): number {
  // A Congress starts on Jan 3 of an odd year; the first two days belong to the outgoing one.
  const y = d.getUTCFullYear();
  const early = d.getUTCMonth() === 0 && d.getUTCDate() < 3;
  const yy = early ? y - 1 : y;
  return Math.floor((yy - 1789) / 2) + 1;
}
export function sessionForDate(d: Date): number {
  const c = congressForDate(d);
  const start = 1789 + 2 * (c - 1);
  const early = d.getUTCMonth() === 0 && d.getUTCDate() < 3;
  return (early ? d.getUTCFullYear() - 1 : d.getUTCFullYear()) - start + 1;
}
export const sessionYear = (congress: number, session: number) => 1789 + 2 * (congress - 1) + (session - 1);

export function normalizeVoteCast(raw: unknown): Vote | null {
  const s = str(raw).toLowerCase();
  if (s === "yea" || s === "aye" || s === "yes") return "yes";
  if (s === "nay" || s === "no") return "no";
  if (s === "present") return "present";
  if (s === "not voting" || s === "not_voting" || s === "notvoting") return "not_voting";
  return null; // "Guilty", a Speaker candidate's name, "Present, Giving Live Pair" …
}

const PROCEDURAL_KINDS = new Set(["procedural", "motion", "cloture"]);
export function classifyVote(question: string | null, measureType?: string | null): { voteKind: string; isProcedural: boolean | null } {
  let kind = mapActionType(question || "");
  if (measureType === "nomination" && kind === "passage") kind = "nomination";
  if (kind === "unknown") return { voteKind: kind, isProcedural: null };
  return { voteKind: kind, isProcedural: PROCEDURAL_KINDS.has(kind) };
}

const TYPE_MEASURE: Record<string, MeasureRef["measureType"]> = {
  hr: "bill", s: "bill", hres: "resolution", sres: "resolution", hjres: "resolution", sjres: "resolution",
  hconres: "resolution", sconres: "resolution", hamdt: "amendment", samdt: "amendment", suamdt: "amendment", pn: "nomination",
};
// "H.R." → hr, "S.J.Res." → sjres, "S.Amdt." → samdt, "PN" → pn
export const typeCode = (t: unknown) => str(t).toLowerCase().replace(/[^a-z]/g, "");

export function measureRef(congress: number, type: unknown, num: unknown, parent?: { type?: unknown; num?: unknown } | null, feedTitle?: string | null): MeasureRef | null {
  const code = typeCode(type);
  const n = str(num).replace(/^0+(?=\d)/, "");
  if (!code || !n || !TYPE_MEASURE[code]) return null;
  // Nomination numbers carry a part suffix ("PN12-3"); keep it in the key.
  const safeNum = n.replace(/[^0-9a-z-]/gi, "").toLowerCase();
  if (!safeNum) return null;
  const pCode = parent ? typeCode(parent.type) : "";
  const pNum = parent ? str(parent.num).replace(/[^0-9]/g, "") : "";
  const parentBillKey = pCode && pNum && TYPE_MEASURE[pCode] ? `us-${congress}-${pCode}-${pNum}` : null;
  return {
    billKey: `us-${congress}-${code}-${safeNum}`,
    billType: code,
    num: safeNum,
    number: code === "pn" ? `PN ${n}` : canonicalMeasureNumber(`${code}${safeNum}`),
    measureType: TYPE_MEASURE[code],
    parentBillKey,
    parentBillType: parentBillKey ? pCode : null,
    parentNum: parentBillKey ? pNum : null,
    feedTitle: feedTitle ? str(feedTitle) : null,
  };
}

// "S. 5" / "H.R. 1" / "S.Amdt. 13" → { type, num }
export function splitCitation(s: unknown): { type: string; num: string } | null {
  const m = str(s).match(/^([A-Za-z.\s]+?)\s*([0-9][0-9-]*)$/);
  return m ? { type: m[1], num: m[2] } : null;
}

// THE SHARED BILL KEY. pdx_action_bills.bill_key is "us-<congress>-<type>-<num>";
// vr_measures has no key column — its identity is (congress, number) where
// number is canonicalMeasureNumber's citation ("H.R. 5000", "H.Amdt. 90"), the
// same helper that fills pdx_action_bills.number. This derives one from the
// other, so both tables join on one canonical id with no new column:
//   vrMeasureBillKey({ congress: 119, number: "H.R. 5000" }) → "us-119-hr-5000"
// Null for a numberless measure (Speaker election, quorum call).
export function vrMeasureBillKey(m: { congress: number | null | undefined; number: string | null | undefined }): string | null {
  const congress = m && m.congress != null ? Number(m.congress) : NaN;
  if (!Number.isInteger(congress) || congress < 1) return null;
  const c = splitCitation(m.number);
  return c ? measureRef(congress, c.type, c.num)?.billKey || null : null;
}

// House "rules" (H.Res. "Providing for consideration of the bill (H.R. 2102) …")
// set floor terms for other bills. Adopting one is a procedural vote, and the
// measure it really concerns is the first bill it names.
export const RULE_TITLE = /^\s*providing for (?:the )?consideration of\b/i;
export function isRuleResolution(billType: string, title: string | null | undefined): boolean {
  return billType === "hres" && RULE_TITLE.test(str(title));
}
export function ruleTarget(congress: number, title: string | null | undefined): string | null {
  const m = str(title).match(/\((H\.\s?R\.|S\.|H\.\s?J\.\s?Res\.|S\.\s?J\.\s?Res\.|H\.\s?Res\.|H\.\s?Con\.\s?Res\.|S\.\s?Con\.\s?Res\.)\s*(\d+)\)/i);
  return m ? measureRef(congress, m[1], m[2])?.billKey || null : null;
}

// ── House (Congress.gov) parsing ─────────────────────────────────────────────
export function houseVoteListRows(data: any): any[] {
  return data?.houseRollCallVotes || data?.votes || [];
}
export function parseHouseVote(row: any, container: any, congress: number): RollRecord | null {
  const session = Number(row?.sessionNumber ?? row?.session ?? container?.sessionNumber);
  const roll = Number(row?.rollCallNumber ?? row?.rollNumber ?? container?.rollCallNumber);
  const date = row?.startDate || container?.startDate || row?.date;
  if (!Number.isFinite(session) || !Number.isFinite(roll) || !date) return null;
  const voteDate = new Date(date);
  if (Number.isNaN(voteDate.getTime())) return null;
  const c = { ...(row || {}), ...(container || {}) };
  const amdt = c.amendmentNumber != null && str(c.amendmentNumber) !== "";
  const measure = amdt
    ? measureRef(congress, c.amendmentType, c.amendmentNumber, { type: c.legislationType, num: c.legislationNumber }, c.amendmentPurpose || null)
    : measureRef(congress, c.legislationType, c.legislationNumber, null, c.legislationTitle || null);
  const question = str(c.voteQuestion ?? c.question) || null;
  const members: MemberCast[] = [];
  const unsupported: string[] = [];
  for (const m of (Array.isArray(container?.results) ? container.results : [])) {
    const id = str(m.bioguideID || m.bioguideId);
    const rawCast = str(m.voteCast ?? m.votePosition);
    const vote = normalizeVoteCast(rawCast);
    if (!vote) { unsupported.push(rawCast || "(blank)"); continue; }
    if (!id) continue;
    members.push({
      scheme: "bioguide", id, vote, voteRaw: rawCast,
      name: [m.firstName, m.lastName].filter(Boolean).join(" ") || m.name || null,
      party: m.voteParty || m.party || null, state: m.voteState || m.state || null,
    });
  }
  const year = voteDate.getUTCFullYear();
  const sourceUrl = str(container?.sourceDataURL) || `https://clerk.house.gov/evs/${sessionYear(congress, session) || year}/roll${pad3(roll)}.xml`;
  return {
    jurisdiction: "us", chamber: "house", congress, session, roll, voteDate: voteDate.toISOString(),
    question, ...classifyVote(question, measure?.measureType), result: str(c.result) || null,
    sourceUrl, sourceLabel: "Office of the Clerk, U.S. House of Representatives",
    measure, members, unsupported,
  };
}

// ── Senate (senate.gov LIS XML) parsing ──────────────────────────────────────
const decodeXml = (s: string) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d))).replace(/&amp;/g, "&");
export function xmlTag(xml: string, name: string): string {
  const m = String(xml || "").match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? decodeXml(m[1]).trim() : "";
}
const xmlBlocks = (xml: string, name: string) => String(xml || "").match(new RegExp(`<${name}>[\\s\\S]*?</${name}>`, "g")) || [];

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
// Wall-clock time in Washington → UTC, honouring daylight time.
export function easternToUtc(y: number, mo: number, d: number, h = 12, mi = 0): Date {
  const guess = Date.UTC(y, mo, d, h + 5, mi);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23", day: "numeric" }).formatToParts(new Date(guess));
  const hh = Number(parts.find((p) => p.type === "hour")?.value);
  const dd = Number(parts.find((p) => p.type === "day")?.value);
  let diff = hh - h;
  if (dd !== d) diff += dd > d || (d > 25 && dd === 1) ? 24 : -24;
  return new Date(guess - diff * 3_600_000);
}
// "January 9, 2025, 02:57 PM"
export function parseSenateDate(s: string): Date | null {
  const m = str(s).match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})(?:,?\s*(\d{1,2}):(\d{2})\s*([AP]M))?/i);
  if (!m) return null;
  const mo = MONTHS[m[1].slice(0, 3).toLowerCase()];
  if (mo == null) return null;
  let h = m[4] ? Number(m[4]) % 12 : 12;
  if (m[6] && m[6].toUpperCase() === "PM") h += 12;
  return easternToUtc(Number(m[3]), mo, Number(m[2]), h, m[5] ? Number(m[5]) : 0);
}
// Vote menu rows → { roll, date (noon ET, year from the session) }
export function parseSenateMenu(xml: string, congress: number, session: number): Array<{ roll: number; date: string }> {
  const year = sessionYear(congress, session);
  const out: Array<{ roll: number; date: string }> = [];
  for (const b of xmlBlocks(xml, "vote")) {
    const roll = Number(xmlTag(b, "vote_number"));
    const dm = xmlTag(b, "vote_date").match(/^(\d{1,2})-([A-Za-z]{3})/);
    if (!Number.isFinite(roll) || roll <= 0 || !dm) continue;
    const mo = MONTHS[dm[2].toLowerCase()];
    if (mo == null) continue;
    out.push({ roll, date: easternToUtc(year, mo, Number(dm[1])).toISOString() });
  }
  return out;
}
export const senateXmlUrl = (c: number, s: number, roll: number) => `${SENATE_LIS}/roll_call_votes/vote${c}${s}/vote_${c}_${s}_${pad5(roll)}.xml`;
export const senateHtmUrl = (c: number, s: number, roll: number) => `${SENATE_LIS}/roll_call_votes/vote${c}${s}/vote_${c}_${s}_${pad5(roll)}.htm`;
export const senateMenuUrl = (c: number, s: number) => `${SENATE_LIS}/roll_call_lists/vote_menu_${c}_${s}.xml`;

export function parseSenateVote(xml: string, congress: number, session: number, roll: number): RollRecord | null {
  if (!/<roll_call_vote[\s>]/.test(String(xml || ""))) return null;
  const docC = Number(xmlTag(xml, "congress"));
  const docS = Number(xmlTag(xml, "session"));
  const docR = Number(xmlTag(xml, "vote_number"));
  // The document must be the roll it claims to be — a mismatch is dropped whole.
  if ((docC && docC !== congress) || (docS && docS !== session) || (docR && docR !== roll)) return null;
  const voteDate = parseSenateDate(xmlTag(xml, "vote_date"));
  if (!voteDate) return null;
  const question = xmlTag(xml, "vote_question_text") || xmlTag(xml, "question") || null;
  const doc = xmlBlocks(xml, "document")[0] || "";
  const am = xmlBlocks(xml, "amendment")[0] || "";
  const amdtNo = splitCitation(xmlTag(am, "amendment_number"));
  let measure: MeasureRef | null = null;
  if (amdtNo) {
    const parent = splitCitation(xmlTag(am, "amendment_to_document_number"));
    measure = measureRef(congress, amdtNo.type, amdtNo.num, parent ? { type: parent.type, num: parent.num } : null, xmlTag(am, "amendment_purpose") || null);
  } else {
    const dtype = xmlTag(doc, "document_type");
    const dnum = xmlTag(doc, "document_number");
    measure = measureRef(congress, dtype, dnum, null, xmlTag(doc, "document_title") || xmlTag(doc, "document_short_title") || xmlTag(xml, "vote_title") || null);
  }
  const members: MemberCast[] = [];
  const unsupported: string[] = [];
  for (const b of xmlBlocks(xml, "member")) {
    const id = xmlTag(b, "lis_member_id");
    const rawCast = xmlTag(b, "vote_cast");
    const vote = normalizeVoteCast(rawCast);
    if (!vote) { unsupported.push(rawCast || "(blank)"); continue; }
    if (!id) continue;
    members.push({
      scheme: "lis", id, vote, voteRaw: rawCast,
      name: [xmlTag(b, "first_name"), xmlTag(b, "last_name")].filter(Boolean).join(" ") || xmlTag(b, "member_full") || null,
      party: xmlTag(b, "party") || null, state: xmlTag(b, "state") || null,
    });
  }
  return {
    jurisdiction: "us", chamber: "senate", congress, session, roll, voteDate: voteDate.toISOString(),
    question, ...classifyVote(question, measure?.measureType), result: xmlTag(xml, "vote_result") || null,
    sourceUrl: senateHtmUrl(congress, session, roll), sourceLabel: "U.S. Senate (LIS roll-call vote)",
    measure, members, unsupported,
  };
}

// LIS id → bioguide, from the public congress-legislators dataset.
export function lisIndexFrom(legislators: any[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of legislators || []) {
    const lis = p?.id?.lis, bio = p?.id?.bioguide;
    if (lis && bio && !out[lis]) out[lis] = bio;
  }
  return out;
}

// ── The topic sorter ─────────────────────────────────────────────────────────
// PRESENCE ONLY. A key is a tag when any content signal in the bill's own text
// matches it — no threshold, no ranking, no tag cap. Each tag is then given an
// impact tier (high / low, see "Impact tiers" below); the tier never drops a tag.
// Signals (and only these):
//   pattern  — the bill-key patterns (subject + instrument (+ facet), not ceded)
//              read over the title / short title / summary
//   keyword  — the existing keyword matcher (suggestIssue) over the title + summary
//              and over each legislative subject term
//   vocab    — the stance generator's topic vocabulary MENTION rules (no direction)
//              over the title and over the summary
//   subject  — a legislative subject term the vocabulary or keyword matcher reads
// Nothing vote-derived and no curated mapping is consulted; the policy area is
// stored on the bill but is not a signal.
// A pattern field is a RegExp OR a predicate object with .test() (healthcare's
// `cedes` is one). Only a real RegExp is rebuilt without g / y; a predicate is
// used as-is; anything else counts as absent rather than throwing.
type Tester = { test: (t: string) => boolean };
const stateless = (re: RegExp | Tester | undefined | null): Tester | null => {
  if (re instanceof RegExp) return new RegExp(re.source, String(re.flags || "").replace(/g|y/g, ""));
  return re && typeof (re as Tester).test === "function" ? (re as Tester) : null;
};

export function patternHits(text: string): string[] {
  const hits: string[] = [];
  if (!text) return hits;
  for (const key of MAPPED_KEYS as string[]) {
    const P: any = (BILL_KEY_PATTERNS as any)[key];
    if (!P) continue;
    const subject = stateless(P.subject), instrument = stateless(P.instrument);
    if (!subject || !instrument || !subject.test(text) || !instrument.test(text)) continue;
    const facet = stateless(P.facet);
    if (facet && !facet.test(text)) continue;
    const cedes = stateless(P.cedes);
    if (cedes && cedes.test(text)) continue;
    hits.push(key);
  }
  return hits;
}

let _rules: Record<string, RegExp> | null = null;
function mentionRules(): Record<string, RegExp> {
  if (_rules) return _rules;
  const out: Record<string, RegExp> = {};
  for (const [k, r] of Object.entries({ ...buildTopicRules(ISSUE_TOPIC_VOCAB), ...buildDirectionalTopicRules(DIRECTIONAL_TOPIC_VOCAB) }) as Array<[string, any]>) {
    if (TAG_KEYS.has(k) && r?.mention) out[k] = new RegExp(r.mention.source, "i");
  }
  return (_rules = out);
}

export type TagInput = {
  measureType: string; title?: string | null; shortTitle?: string | null; summary?: string | null;
  policyArea?: string | null; subjects?: string[] | null;
};

// ── Impact tiers ─────────────────────────────────────────────────────────────
// Every matched key is still a tag (topic_tags holds them all and vote rows copy
// the full list). The tier only says how prominently a later surface should show
// it. A tag is HIGH when ANY of these holds, otherwise LOW:
//   1. its confidence is at or above HIGH_TIER_MIN_CONFIDENCE (25)
//   2. the bill is an appropriations / NDAA / reconciliation / major authorization bill
//   3. the bill's text carries large-scale language or a dollar figure ≥ $10 million
//   4. one of its signals is an official legislative subject term
// Exception: a private relief bill or a single-facility naming bill is LOW
// whatever else matched — those are the incidental-noise shape the tiers exist for.
//
// Confidence (tiering only — never a filter, never a rank). The strongest signal:
//   pattern over the title 40 · pattern over title + summary 30 · keyword over the
//   title 20 · keyword over title + summary 15 · vocabulary mention in the title 15
//   · vocabulary mention in the summary 10 · a subject term 30
// plus 10 for each further text LOCATION (title / summary / subjects) that names
// the key. Two matchers reading the same word in the same place are one piece of
// evidence, so they add nothing.
export const HIGH_TIER_MIN_CONFIDENCE = 25;
export const SIGNAL_POINTS: Record<string, number> = {
  "pattern:title": 40, "pattern:text": 30, "keyword:title": 20, "keyword:text": 15,
  "vocab:title": 15, "vocab:summary": 10, subject: 30,
};
export const EXTRA_LOCATION_POINTS = 10;
export const SCALE_DOLLARS_MIN = 10_000_000;

const signalKind = (sig: string) => (sig.startsWith("subject:") ? "subject" : sig);
const signalLocations = (sig: string): string[] => {
  if (sig.startsWith("subject:")) return ["subjects"];
  if (sig.endsWith(":title")) return ["title"];
  if (sig === "vocab:summary") return ["summary"];
  return ["title", "summary"]; // pattern:text / keyword:text read both
};
export function signalConfidence(signals: string[]): number {
  let best = 0;
  const locs = new Set<string>();
  for (const sig of signals) {
    best = Math.max(best, SIGNAL_POINTS[signalKind(sig)] || 0);
    // A text-wide match only proves a location when it is the only reading there.
    if (sig === "pattern:text" || sig === "keyword:text") locs.add("text"); else signalLocations(sig).forEach((l) => locs.add(l));
  }
  if (locs.has("text")) { locs.delete("text"); if (!locs.has("title") && !locs.has("summary")) locs.add("summary"); }
  return Math.min(100, best + EXTRA_LOCATION_POINTS * Math.max(0, locs.size - 1));
}

export const MAJOR_BILL = [
  { kind: "appropriations", re: /\bappropriations?\b|\bcontinuing resolution\b|\bminibus\b|\bomnibus\b/i },
  { kind: "ndaa", re: /\bnational defense authorization\b|\bNDAA\b/i },
  { kind: "reconciliation", re: /\breconciliation\b|\bOne Big Beautiful Bill\b/i },
  { kind: "major_authorization", re: /\b(?:re)?authorization act\b|\bfarm bill\b|\bagriculture improvement act\b|\bsurface transportation\b|\bwater resources development act\b/i },
];
export function majorBillKind(title: string): string | null {
  for (const m of MAJOR_BILL) if (m.re.test(title)) return m.kind;
  return null;
}

// "every" counts as scale language except in a time / interval phrase ("every 2 years").
export const SCALE_LANGUAGE =
  /\b(?:nationwide|nation-wide|national(?:ly)? in scope|all (?:50 )?states|each state|every (?:state|american|individual|person|household|family|citizen|resident|taxpayer|county|community|school|worker|employer)s?|every(?:one|body)|every\b(?!\s+(?:\d|one\b|two\b|three\b|four\b|five\b|ten\b|other\b|year|month|week|day|fiscal|quarter|calendar|session|congress))|all (?:individuals|americans|persons|people|citizens|residents|taxpayers|households|workers|employers|eligible)|throughout the united states|across the (?:country|nation|united states))\b/i;

export function largestDollarAmount(text: string): number {
  let max = 0;
  const re = /\$\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(thousand|million|billion|trillion|[mbt]n?)?\b/gi;
  for (const m of String(text || "").matchAll(re)) {
    const n = Number(m[1].replace(/,/g, ""));
    const u = String(m[2] || "").toLowerCase();
    const mult = u === "thousand" ? 1e3 : u.startsWith("m") ? 1e6 : u.startsWith("b") ? 1e9 : u.startsWith("t") ? 1e12 : 1;
    if (Number.isFinite(n)) max = Math.max(max, n * mult);
  }
  return max;
}
export function scaleSignal(text: string): string | null {
  const m = String(text || "").match(SCALE_LANGUAGE);
  if (m) return `scale-language:${m[0].toLowerCase()}`;
  const d = largestDollarAmount(text);
  return d >= SCALE_DOLLARS_MIN ? `dollar-amount:${d}` : null;
}

export const MINOR_BILL = [
  { kind: "private_bill", re: /^\s*(?:a bill )?for the relief of\b/i },
  { kind: "facility_rename", re: /\b(?:to )?(?:designate|rename|redesignate)\b[^.]{0,160}\b(?:post office|postal (?:service )?facility|facility of the united states postal service|courthouse|federal building|(?:va |veterans affairs )?(?:clinic|medical center|outpatient clinic)|community[- ]based outpatient clinic|station|highway|bridge|building)\b|\bas the [^.]{0,80}\b(?:post office|clinic|courthouse|federal building)\b/i },
];
export function minorBillKind(title: string): string | null {
  for (const m of MINOR_BILL) if (m.re.test(title)) return m.kind;
  return null;
}

// Every key any signal matches becomes a tag; detail lists the signals per key,
// a confidence and the impact tier. Tags that span 3+ topic categories mark the
// bill multi_topic (unchanged — counted over all tags).
export function tagMeasure(m: TagInput): TagResult {
  const base = { version: TAGGER_VERSION };
  if (m.measureType === "nomination") return { ...base, tags: [], highTags: [], lowTags: [], detail: [], multiTopic: false, billImpact: { majorBill: null, scale: null, minorBill: null }, untagged: "nomination" };
  const found = new Map<string, Set<string>>();
  const hit = (key: string | null, signal: string) => {
    if (!key || !TAG_KEYS.has(key)) return;
    if (!found.has(key)) found.set(key, new Set());
    found.get(key)!.add(signal);
  };

  const title = [m.title, m.shortTitle].map(str).filter(Boolean).join(" — ");
  const summary = str(m.summary);
  const full = [title, summary].filter(Boolean).join(" — ");

  // 1. Bill-key patterns, over title alone and over the whole text.
  for (const k of patternHits(title)) hit(k, "pattern:title");
  for (const k of patternHits(full)) hit(k, summary ? "pattern:text" : "pattern:title");
  // 2. The existing keyword matcher.
  hit(suggestIssue(title), "keyword:title");
  if (summary) hit(suggestIssue(full), "keyword:text");
  // 3. Topic vocabulary mentions.
  for (const [k, re] of Object.entries(mentionRules())) {
    if (title && re.test(title)) hit(k, "vocab:title");
    if (summary && re.test(summary)) hit(k, "vocab:summary");
  }
  // 4. Legislative subject terms, one term at a time.
  for (const term of (m.subjects || []).map(str).filter(Boolean)) {
    hit(suggestIssue(term), `subject:${term}`);
    for (const [k, re] of Object.entries(mentionRules())) if (re.test(term)) hit(k, `subject:${term}`);
  }

  const tags = [...found.keys()].sort();
  const majorBill = majorBillKind(title);
  const scale = scaleSignal(full);
  const minorBill = minorBillKind(title);
  const detail: TagDetail[] = tags.map((key) => {
    const signals = [...found.get(key)!];
    const confidence = signalConfidence(signals);
    const reasons: string[] = [];
    if (confidence >= HIGH_TIER_MIN_CONFIDENCE) reasons.push(`confidence:${confidence}`);
    if (majorBill) reasons.push(`major-bill:${majorBill}`);
    if (scale) reasons.push(scale);
    if (signals.some((x) => x.startsWith("subject:"))) reasons.push("subject-term");
    const impactTier: ImpactTier = !minorBill && reasons.length ? "high" : "low";
    if (minorBill) reasons.unshift(`minor-bill:${minorBill}`);
    return { key, category: CATEGORY_OF[key] || null, signals, confidence, impactTier, tierReasons: reasons };
  });
  const cats = new Set(detail.map((d) => d.category).filter(Boolean));
  return {
    ...base, tags,
    highTags: detail.filter((d) => d.impactTier === "high").map((d) => d.key),
    lowTags: detail.filter((d) => d.impactTier === "low").map((d) => d.key),
    detail, multiTopic: cats.size >= MULTI_TOPIC_CATEGORIES,
    billImpact: { majorBill, scale, minorBill },
    ...(tags.length ? {} : { untagged: title || summary || (m.subjects || []).length ? "no-signal" : "no-text" }),
  };
}

// ── Congress.gov bill text (key-gated) ───────────────────────────────────────
const stripHtml = (s: string) => decodeXml(String(s || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const congressGovPage = (c: number, code: string, num: string) => {
  const slug: Record<string, string> = {
    hr: "house-bill", s: "senate-bill", hres: "house-resolution", sres: "senate-resolution",
    hjres: "house-joint-resolution", sjres: "senate-joint-resolution", hconres: "house-concurrent-resolution",
    sconres: "senate-concurrent-resolution", hamdt: "house-amendment", samdt: "senate-amendment", suamdt: "senate-amendment",
  };
  const ord = (n: number) => { const a = n % 100, b = n % 10; return `${n}${a >= 11 && a <= 13 ? "th" : b === 1 ? "st" : b === 2 ? "nd" : b === 3 ? "rd" : "th"}`; };
  if (code === "pn") return `https://www.congress.gov/nomination/${ord(c)}-congress/${num.split("-")[0]}`;
  const isAmdt = code.endsWith("amdt");
  return `https://www.congress.gov/${isAmdt ? "amendment" : "bill"}/${ord(c)}-congress/${slug[code] || "house-bill"}/${num}`;
};

export class RateLimited extends Error {}

const JSON_ACCEPT = "application/json";
const XML_ACCEPT = "application/xml,text/xml,*/*";
type RawFetch = { ok: boolean; status: number; contentType: string | null; body: string | null };
// One GET, body read as text exactly as served. 429 stops the run.
async function fetchRaw(fetchFn: typeof fetch, url: string, accept: string): Promise<RawFetch> {
  const res = await fetchFn(url, { headers: { accept, "user-agent": UA }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (res.status === 429) throw new RateLimited(`429 from ${new URL(url).hostname}`);
  return { ok: !!res.ok, status: res.status, contentType: res.headers?.get?.("content-type") || null, body: res.ok ? await res.text() : null };
}
async function getJson(fetchFn: typeof fetch, url: string): Promise<any | null> {
  const r = await fetchRaw(fetchFn, url, JSON_ACCEPT);
  return r.ok ? JSON.parse(r.body as string) : null;
}
async function getText(fetchFn: typeof fetch, url: string): Promise<string | null> {
  const r = await fetchRaw(fetchFn, url, XML_ACCEPT);
  return r.ok ? r.body : null;
}
const withKey = (url: string, key: string) => `${url}${url.includes("?") ? "&" : "?"}format=json&api_key=${encodeURIComponent(key)}`;

// ── Raw payload store (Blobs "raw-ingest-votes") ─────────────────────────────
// Same philosophy as the stance side's "raw-ingest" store: every fetched source
// is kept unmodified BEFORE it is parsed, in a JSON envelope with its URL, fetch
// time, source type and HTTP status, so a parser fix or a new field re-parses
// what is stored instead of refetching. A SIBLING store (not a prefix inside
// "raw-ingest"), because the Evidence Locker and the stated-positions backfill
// list the whole "raw-ingest" store and read every blob there as a stance page.
//   house/<congress>/<session>/roll-<00000>/<fetched_at>.json   House member votes (+ its vote-list row)
//   senate/<congress>/<session>/roll-<00000>/<fetched_at>.json  Senate LIS vote XML
//   bills/<bill_key>/<fetched_at>.json                          Congress.gov bill / subjects / summaries
//                                                               (or amendment / nomination) responses
// Bodies are stored as served. Only the request URL is cleaned: the api_key
// query parameter is dropped so no secret is ever written to the store.
// A failed store write is logged and the run continues; the row's raw_ref is NULL.
export const RAW_VOTES_STORE_NAME = "raw-ingest-votes";
export interface RawStore {
  setJSON(key: string, value: unknown): Promise<unknown>;
  get(key: string, opts: { type: "json" }): Promise<any>;
  list?(opts: { prefix: string }): Promise<{ blobs: Array<{ key: string }> }>;
}
export type RawResponse = { part: string; url: string; http_status: number | null; content_type: string | null; body: string | null; error?: string };
export type RollEnvelope = {
  kind: "house_vote" | "senate_vote"; chamber: "house" | "senate"; congress: number; session: number; roll: number;
  url: string; fetched_at: string; source_type: string; http_status: number; content_type: string | null;
  body_chars: number; body: string; list_row?: any;
};
export type BillEnvelope = {
  kind: "bill_meta"; bill_key: string; congress: number; measure: MeasureRef; fetched_at: string;
  source_type: string; responses: RawResponse[];
};
const tsKey = (iso: string) => iso.replace(/[:.]/g, "-");
export const rollRawPrefix = (chamber: string, c: number, s: number, roll: number) => `${chamber}/${c}/${s}/roll-${pad5(roll)}/`;
export const rollRawKey = (chamber: string, c: number, s: number, roll: number, fetchedAt: string) => `${rollRawPrefix(chamber, c, s, roll)}${tsKey(fetchedAt)}.json`;
export const billRawPrefix = (billKey: string) => `bills/${billKey}/`;
export const billRawKey = (billKey: string, fetchedAt: string) => `${billRawPrefix(billKey)}${tsKey(fetchedAt)}.json`;
export function publicUrl(url: string): string {
  try { const u = new URL(url); u.searchParams.delete("api_key"); return u.toString(); }
  catch { return String(url).replace(/([?&])api_key=[^&]*&?/g, "$1").replace(/[?&]$/, ""); }
}
async function putRaw(store: RawStore | null | undefined, key: string, value: unknown, log: (l: string) => void): Promise<string | null> {
  if (!store) return null;
  try { await store.setJSON(key, value); return key; }
  catch (e: any) { log(`vote-actions: RAW STORE WRITE FAILED ${RAW_VOTES_STORE_NAME}/${key} — ${e?.message || e}; continuing`); return null; }
}

// A stored roll-call envelope → the same RollRecord the live path parses.
export function rollFromEnvelope(env: RollEnvelope): RollRecord | null {
  if (!env || !env.body) return null;
  if (env.kind === "house_vote") {
    const d = JSON.parse(env.body);
    return d ? parseHouseVote(env.list_row, d.houseRollCallVoteMemberVotes || {}, env.congress) : null;
  }
  return parseSenateVote(env.body, env.congress, env.session, env.roll);
}

// Fetch half of the bill text read: the raw responses, in the same order and
// with the same stop conditions as before (no key → nothing; no bill → no
// subjects / summaries). Null without a key.
export async function fetchBillMetaRaw(fetchFn: typeof fetch, apiKey: string | null | undefined, congress: number, m: MeasureRef): Promise<RawResponse[] | null> {
  if (!apiKey) return null;
  const out: RawResponse[] = [];
  const pull = async (part: string, url: string): Promise<RawFetch | null> => {
    try {
      const r = await fetchRaw(fetchFn, withKey(url, apiKey), JSON_ACCEPT);
      out.push({ part, url: publicUrl(withKey(url, apiKey)), http_status: r.status, content_type: r.contentType, body: r.body });
      return r;
    } catch (e: any) {
      if (e instanceof RateLimited) throw e;
      out.push({ part, url: publicUrl(withKey(url, apiKey)), http_status: null, content_type: null, body: null, error: String(e?.message || e).slice(0, 200) });
      return null;
    }
  };
  if (m.measureType === "amendment") { await pull("amendment", `${CONGRESS_API}/amendment/${congress}/${m.billType}/${m.num}`); return out; }
  if (m.measureType === "nomination") { await pull("nomination", `${CONGRESS_API}/nomination/${congress}/${m.num.split("-")[0]}`); return out; }
  const base = `${CONGRESS_API}/bill/${congress}/${m.billType}/${m.num}`;
  const main = await pull("bill", base);
  let b: any = null;
  try { b = main?.ok ? JSON.parse(main.body as string)?.bill : null; } catch { b = null; }
  if (!b) return out;
  await pull("subjects", `${base}/subjects`);
  await pull("summaries", `${base}/summaries`);
  return out;
}

// Parse half: raw responses (live or stored) → BillMeta. Pure, no network.
export function billMetaFromResponses(responses: RawResponse[] | null | undefined, congress: number, m: MeasureRef): BillMeta {
  const page = congressGovPage(congress, m.billType, m.num);
  const fallback: BillMeta = {
    title: m.feedTitle || m.number || m.billKey, sourceUrl: page,
    metaSource: m.feedTitle ? "senate_xml" : "vote_feed", subjects: [], summary: "",
  };
  if (!responses) return fallback;
  const json = (part: string): any => {
    const r = responses.find((x) => x.part === part);
    if (!r || r.body == null || !(r.http_status && r.http_status >= 200 && r.http_status < 300)) return null;
    try { return JSON.parse(r.body); } catch { return null; }
  };
  try {
    if (m.measureType === "amendment") {
      const a = json("amendment")?.amendment;
      if (!a) return fallback;
      const purpose = str(a.purpose), desc = str(a.description);
      return {
        title: purpose || desc || fallback.title, summary: purpose && desc && desc !== purpose ? desc : "",
        subjects: [], sourceUrl: page, metaSource: "congress_gov",
      };
    }
    if (m.measureType === "nomination") {
      const n = json("nomination")?.nomination;
      return n ? { title: str(n.description) || fallback.title, summary: "", subjects: [], sourceUrl: page, metaSource: "congress_gov" } : fallback;
    }
    const b = json("bill")?.bill;
    if (!b) return fallback;
    const subj = json("subjects");
    const sums = json("summaries");
    const summaries: any[] = Array.isArray(sums?.summaries) ? sums.summaries : [];
    summaries.sort((x, y) => str(y.updateDate || y.actionDate).localeCompare(str(x.updateDate || x.actionDate)));
    const subjects: string[] = (subj?.subjects?.legislativeSubjects || []).map((s: any) => str(s?.name)).filter(Boolean);
    return {
      title: str(b.title) || fallback.title,
      shortTitle: null,
      summary: summaries.length ? stripHtml(summaries[0].text).slice(0, 6000) : "",
      policyArea: str(b.policyArea?.name || subj?.subjects?.policyArea?.name) || null,
      subjects,
      sourceUrl: page, metaSource: "congress_gov",
    };
  } catch {
    return fallback;
  }
}

export async function fetchBillMeta(fetchFn: typeof fetch, apiKey: string | null | undefined, congress: number, m: MeasureRef): Promise<BillMeta> {
  return billMetaFromResponses(await fetchBillMetaRaw(fetchFn, apiKey, congress, m), congress, m);
}

// ── Building rows ────────────────────────────────────────────────────────────
export function buildBillRow(congress: number, m: MeasureRef, meta: BillMeta, tags: TagResult, prev?: BillRow | null, now = new Date()): BillRow {
  return {
    billKey: m.billKey, congress, measureType: m.measureType, billType: m.billType, number: m.number,
    parentBillKey: m.parentBillKey, title: str(meta.title) || m.billKey, shortTitle: meta.shortTitle ?? null,
    summary: str(meta.summary), policyArea: meta.policyArea ?? null, officialSubjects: meta.subjects || [],
    topicTags: tags.tags, tagDetail: tags.detail, multiTopic: tags.multiTopic, taggerVersion: tags.version,
    metaSource: meta.metaSource, hasSummary: !!str(meta.summary), metaAttempts: (prev?.metaAttempts || 0) + 1,
    metaFetchedAt: now.toISOString(), sourceUrl: meta.sourceUrl,
  };
}

export function buildVoteRows(r: RollRecord, bill: BillRow, ids: { memberMap: Record<string, string>; lis: Record<string, string> }, rawRef: string | null = null): { rows: VoteRow[]; unmapped: number } {
  let unmapped = 0;
  const rows = r.members.map((m) => {
    const bioguide = m.scheme === "bioguide" ? m.id : ids.lis[m.id] || null;
    const pid = bioguide ? ids.memberMap[bioguide] || null : null;
    if (!pid) unmapped++;
    return {
      jurisdiction: r.jurisdiction, chamber: r.chamber, congress: r.congress, session: r.session, rollNumber: r.roll,
      voteDate: r.voteDate, billKey: bill.billKey, parentBillKey: bill.parentBillKey, measureNumber: bill.number,
      politicianId: pid, memberIdScheme: m.scheme, memberId: m.id, bioguideId: bioguide, memberName: m.name ?? null,
      party: m.party ?? null, state: m.state ?? null, vote: m.vote, voteRaw: m.voteRaw, question: r.question,
      voteKind: r.voteKind, isProcedural: r.isProcedural, result: r.result, topicTags: bill.topicTags,
      taggerVersion: bill.taggerVersion, sourceUrl: r.sourceUrl, sourceLabel: r.sourceLabel, rawRef,
    };
  });
  return { rows, unmapped };
}

// ── Shared per-roll assembly (live run AND replay go through these) ──────────
// A new bill row from its parsed text. `at` is the fetch time of the payload it
// was parsed from (the live run passes the time it fetched; replay passes the
// envelope's fetched_at), so a replay rebuilds the identical row.
export function billFromMeta(rec: RollRecord, meta: BillMeta, at: Date, rawRef: string | null): { bill: BillRow; tags: TagResult } {
  const m = rec.measure!;
  const tags = tagMeasure({ measureType: m.measureType, title: meta.title, shortTitle: meta.shortTitle, summary: meta.summary, policyArea: meta.policyArea, subjects: meta.subjects });
  if (!m.parentBillKey && isRuleResolution(m.billType, meta.title)) m.parentBillKey = ruleTarget(rec.congress, meta.title);
  const bill = { ...buildBillRow(rec.congress, m, meta, tags, null, at), rawRef };
  return { bill, tags };
}
// The vote rows for one roll call against its bill row.
export function rowsForRoll(rec: RollRecord, bill: BillRow, ids: { memberMap: Record<string, string>; lis: Record<string, string> }, rawRef: string | null) {
  if (rec.voteKind === "passage" && isRuleResolution(bill.billType, bill.title)) { rec.voteKind = "rule"; rec.isProcedural = true; }
  return buildVoteRows(rec, bill, ids, rawRef);
}

// ── Re-parse from stored payloads (no network) ──────────────────────────────
// Rebuilds one roll call's bill row and vote rows from what the run stored.
// Bill text comes from, in order: the explicit billRef (the stored bill row's
// raw_ref), else `storedBill` as-is (a row whose payload was never stored is not
// overwritten with a fallback title), else the newest stored bill payload for
// that key, else the vote document's own title — the same fallback the live run
// uses without a key.
export type ReplayResult =
  | { ok: true; rollRef: string; rec: RollRecord; bill: BillRow; billRebuilt: boolean; rows: VoteRow[]; unmapped: number }
  | { ok: false; rollRef: string; reason: string };
const newestKey = async (store: RawStore, prefix: string): Promise<string | null> => {
  if (!store.list) return null;
  const { blobs = [] } = (await store.list({ prefix })) || ({} as any);
  return blobs.map((b) => b.key).sort().pop() || null;
};
export async function replayRoll(
  store: RawStore, rollRef: string,
  ids: { memberMap: Record<string, string>; lis: Record<string, string> },
  opts: { billRef?: string | null; storedBill?: BillRow | null } = {},
): Promise<ReplayResult> {
  const env = (await store.get(rollRef, { type: "json" })) as RollEnvelope | null;
  if (!env) return { ok: false, rollRef, reason: "payload not found" };
  let rec: RollRecord | null;
  try { rec = rollFromEnvelope(env); } catch (e: any) { return { ok: false, rollRef, reason: `unparseable: ${e?.message || e}` }; }
  if (!rec || !rec.members.length) return { ok: false, rollRef, reason: "no member positions" };
  if (rec.unsupported.length) return { ok: false, rollRef, reason: "unsupported vote words" };
  if (!rec.measure) return { ok: false, rollRef, reason: "no measure" };
  let bill: BillRow | null = null, billRebuilt = false;
  const billRef = opts.billRef || (opts.storedBill ? null : await newestKey(store, billRawPrefix(rec.measure.billKey)));
  if (billRef) {
    const benv = (await store.get(billRef, { type: "json" })) as BillEnvelope | null;
    if (benv) {
      bill = billFromMeta(rec, billMetaFromResponses(benv.responses, rec.congress, rec.measure), new Date(benv.fetched_at), billRef).bill;
      billRebuilt = true;
    }
  }
  if (!bill && opts.storedBill) bill = opts.storedBill;
  if (!bill) { bill = billFromMeta(rec, billMetaFromResponses(null, rec.congress, rec.measure), new Date(env.fetched_at), null).bill; billRebuilt = true; }
  const { rows, unmapped } = rowsForRoll(rec, bill, ids, rollRef);
  return { ok: true, rollRef, rec, bill, billRebuilt, rows, unmapped };
}

// Re-parses the newest stored payload of every stored roll call (or `limit` of
// them) and, with write, upserts the rebuilt rows through the same repo. Safe to
// repeat: the upsert is keyed exactly like the live run, so re-parsing unchanged
// payloads inserts and revises nothing. Never fetches.
export type ReplayReport = { rolls: number; rebuilt: number; skipped: Array<{ rollRef: string; reason: string }>; rows: number; inserted: number; revised: number; billsWritten: number; errors: string[] };
export async function replayRawRolls(deps: {
  store: RawStore; repo?: VoteActionsRepo | null; memberMap: Record<string, string>; lis: Record<string, string>;
  write?: boolean; limit?: number; chambers?: Array<"house" | "senate">; log?: (l: string) => void;
}): Promise<ReplayReport> {
  const log = deps.log || ((l: string) => console.log(l));
  const report: ReplayReport = { rolls: 0, rebuilt: 0, skipped: [], rows: 0, inserted: 0, revised: 0, billsWritten: 0, errors: [] };
  if (!deps.store.list) { report.errors.push("store cannot list"); return report; }
  const newest = new Map<string, string>();
  for (const ch of deps.chambers || ["house", "senate"]) {
    const { blobs = [] } = (await deps.store.list({ prefix: `${ch}/` })) || ({} as any);
    for (const { key } of blobs) {
      const dir = key.slice(0, key.lastIndexOf("/") + 1);
      if (!newest.has(dir) || key > newest.get(dir)!) newest.set(dir, key);
    }
  }
  const refs = [...newest.values()].sort().slice(0, deps.limit ?? Infinity);
  for (const rollRef of refs) {
    report.rolls++;
    try {
      let storedBill: BillRow | null = null;
      if (deps.repo) {
        const env = (await deps.store.get(rollRef, { type: "json" })) as RollEnvelope | null;
        const m = env ? rollFromEnvelope(env)?.measure : null;
        if (m) storedBill = await deps.repo.getBill(m.billKey);
      }
      const r = await replayRoll(deps.store, rollRef, { memberMap: deps.memberMap, lis: deps.lis }, { billRef: storedBill?.rawRef || null, storedBill });
      if (r.ok === false) { report.skipped.push({ rollRef, reason: r.reason }); continue; }
      report.rebuilt++;
      report.rows += r.rows.length;
      if (deps.write && deps.repo) {
        if (r.billRebuilt && r.bill.rawRef) {
          await deps.repo.upsertBill({ ...r.bill, metaAttempts: storedBill?.metaAttempts ?? r.bill.metaAttempts });
          report.billsWritten++;
        }
        const w = await deps.repo.upsertVotes(r.rows);
        report.inserted += w.inserted;
        report.revised += w.revised;
      }
    } catch (e: any) {
      report.errors.push(`${rollRef}: ${String(e?.message || e).slice(0, 160)}`);
    }
  }
  log(`vote-actions: REPLAY ${deps.write ? "write" : "dry run"} — rolls ${report.rolls} · rebuilt ${report.rebuilt} · skipped ${report.skipped.length} · rows ${report.rows} · new ${report.inserted} · revised ${report.revised} · bills ${report.billsWritten} · errors ${report.errors.length}`);
  return report;
}

// ── Run state (Blobs) ────────────────────────────────────────────────────────
// ledger: "<chamber>|<congress>|<session>|<roll>" → { status, attempts, date, at }
//   status: done | incomplete (retrying) | parked (gave up) | unsupported | no_measure
export type LedgerEntry = { status: string; attempts: number; date: string; at: string; note?: string };
export type RunState = { ledger: Record<string, LedgerEntry>; lis?: { at: string; map: Record<string, string> } | null; lastRun?: any };
export function normaliseState(doc: any): RunState {
  const d = doc && typeof doc === "object" ? doc : {};
  return { ledger: d.ledger && typeof d.ledger === "object" ? d.ledger : {}, lis: d.lis || null, lastRun: d.lastRun || null };
}
// The number part of a bill key ("us-119-pn-12-3" → "12-3").
export const billNumFromKey = (b: { billKey: string; congress: number; billType: string }) =>
  b.billKey.slice(`us-${b.congress}-${b.billType}-`.length);
export const rollKey = (chamber: string, c: number, s: number, roll: number) => `${chamber}|${c}|${s}|${roll}`;
const FINAL = new Set(["done", "parked", "unsupported", "no_measure"]);

// ── The run ──────────────────────────────────────────────────────────────────
export type RunDeps = {
  fetch: typeof fetch;
  repo: VoteActionsRepo;
  state?: any;                       // RunState doc (already read)
  memberMap: Record<string, string>; // bioguide → roster slug
  apiKey?: string | null;
  now?: () => Date;
  log?: (l: string) => void;
  budgetMs?: number;
  maxRolls?: number;
  lookbackDays?: number;
  chambers?: Array<"house" | "senate">;
  clock?: () => number;
  rawStore?: RawStore | null;        // Blobs "raw-ingest-votes"; absent → nothing stored, raw_ref NULL
};
export type RunReport = {
  congress: number; candidates: { house: number; senate: number }; processed: number;
  done: number; incomplete: number; parked: number; unsupported: number; noMeasure: number;
  billsTagged: number; billsUntagged: number; votesInserted: number; votesRevised: number; membersUnmapped: number;
  metaRefreshed: number; retagged: number; rateLimited: boolean; budgetHit: boolean; errors: string[];
  tagCounts: Record<string, number>; houseConfigured: boolean;
};

async function houseCandidates(deps: RunDeps, congress: number, cutoff: number, ledger: Record<string, LedgerEntry>) {
  const rows: any[] = [];
  let offset = 0, total = Infinity;
  while (offset < total && offset < 5000) {
    const d = await getJson(deps.fetch, withKey(`${CONGRESS_API}/house-vote/${congress}?limit=250&offset=${offset}`, deps.apiKey!));
    const page = houseVoteListRows(d);
    if (!page.length) break;
    rows.push(...page);
    offset += page.length;
    total = Number(d?.pagination?.count ?? offset);
  }
  return rows
    .map((row) => ({ row, session: Number(row.sessionNumber), roll: Number(row.rollCallNumber), date: new Date(row.startDate || row.date || 0) }))
    .filter((x) => Number.isFinite(x.session) && Number.isFinite(x.roll) && x.date.getTime() >= cutoff)
    .filter((x) => !FINAL.has(ledger[rollKey("house", congress, x.session, x.roll)]?.status || ""))
    .map((x) => ({ chamber: "house" as const, congress, session: x.session, roll: x.roll, date: x.date.toISOString(), row: x.row }));
}

async function senateCandidates(deps: RunDeps, congress: number, cutoff: number, now: Date, ledger: Record<string, LedgerEntry>) {
  const sessions = new Set<number>([sessionForDate(now)]);
  const cut = new Date(cutoff);
  if (congressForDate(cut) === congress) sessions.add(sessionForDate(cut));
  const out: any[] = [];
  for (const s of sessions) {
    const xml = await getText(deps.fetch, senateMenuUrl(congress, s));
    if (!xml) continue;
    for (const v of parseSenateMenu(xml, congress, s)) {
      if (new Date(v.date).getTime() < cutoff) continue;
      if (FINAL.has(ledger[rollKey("senate", congress, s, v.roll)]?.status || "")) continue;
      out.push({ chamber: "senate" as const, congress, session: s, roll: v.roll, date: v.date });
    }
  }
  return out;
}

async function ensureLisIndex(deps: RunDeps, state: RunState, now: Date, log: (l: string) => void): Promise<Record<string, string>> {
  const fresh = state.lis && now.getTime() - new Date(state.lis.at).getTime() < LIS_INDEX_MAX_AGE_DAYS * DAY;
  if (fresh && state.lis) return state.lis.map;
  try {
    const d = await getJson(deps.fetch, LEGISLATORS_URL);
    const map = Array.isArray(d) ? lisIndexFrom(d) : {};
    if (Object.keys(map).length) {
      state.lis = { at: now.toISOString(), map };
      log(`vote-actions: LIS → bioguide index refreshed (${Object.keys(map).length} senators)`);
      return map;
    }
  } catch (e: any) {
    if (e instanceof RateLimited) throw e;
    log(`vote-actions: LIS index unavailable — ${e?.message || e}`);
  }
  return state.lis?.map || {};
}

export async function runVoteActions(deps: RunDeps): Promise<{ report: RunReport; state: RunState }> {
  const now = (deps.now || (() => new Date()))();
  const clock = deps.clock || (() => Date.now());
  const started = clock();
  const budget = deps.budgetMs ?? RUN_BUDGET_MS;
  const overBudget = () => clock() - started > budget;
  const log = deps.log || ((l: string) => console.log(l));
  const state = normaliseState(deps.state);
  const congress = congressForDate(now);
  const cutoff = now.getTime() - (deps.lookbackDays ?? LOOKBACK_DAYS) * DAY;
  const chambers = deps.chambers || ["house", "senate"];
  const report: RunReport = {
    congress, candidates: { house: 0, senate: 0 }, processed: 0, done: 0, incomplete: 0, parked: 0, unsupported: 0, noMeasure: 0,
    billsTagged: 0, billsUntagged: 0, votesInserted: 0, votesRevised: 0, membersUnmapped: 0, metaRefreshed: 0, retagged: 0,
    rateLimited: false, budgetHit: false, errors: [], tagCounts: {}, houseConfigured: !!deps.apiKey,
  };
  const ledgerSet = (key: string, status: string, date: string, note?: string) => {
    const prev = state.ledger[key];
    state.ledger[key] = { status, attempts: (prev?.attempts || 0) + (status === "done" ? 0 : 1), date, at: now.toISOString(), ...(note ? { note } : {}) };
  };

  try {
    // 1. Candidates: every roll call in the window not yet final, newest first.
    let cands: any[] = [];
    if (chambers.includes("house")) {
      if (deps.apiKey) {
        try { const h = await houseCandidates(deps, congress, cutoff, state.ledger); report.candidates.house = h.length; cands.push(...h); }
        catch (e: any) { if (e instanceof RateLimited) throw e; report.errors.push(`house list: ${e?.message || e}`); }
      } else log("vote-actions: CONGRESS_GOV_API_KEY not set — House side skipped this run.");
    }
    if (chambers.includes("senate")) {
      try { const s = await senateCandidates(deps, congress, cutoff, now, state.ledger); report.candidates.senate = s.length; cands.push(...s); }
      catch (e: any) { if (e instanceof RateLimited) throw e; report.errors.push(`senate menu: ${e?.message || e}`); }
    }
    cands.sort((a, b) => b.date.localeCompare(a.date) || a.chamber.localeCompare(b.chamber) || b.roll - a.roll);
    const lis = cands.some((c) => c.chamber === "senate") ? await ensureLisIndex(deps, state, now, log) : (state.lis?.map || {});

    // 2. Each roll call: detail → measure → bill tags → vote rows.
    for (const c of cands) {
      if (report.processed >= (deps.maxRolls ?? MAX_ROLLS_PER_RUN)) break;
      if (overBudget()) { report.budgetHit = true; break; }
      report.processed++;
      const key = rollKey(c.chamber, c.congress, c.session, c.roll);
      let rec: RollRecord | null = null;
      let rollRef: string | null = null;
      // One fetch time per roll call: its payload, its new bill's payload and
      // that bill row's meta_fetched_at all carry it, so a replay is identical.
      const fetchedAt = (deps.now || (() => new Date()))().toISOString();
      try {
        const house = c.chamber === "house";
        const url = house ? withKey(`${CONGRESS_API}/house-vote/${c.congress}/${c.session}/${c.roll}/members`, deps.apiKey!) : senateXmlUrl(c.congress, c.session, c.roll);
        const r = await fetchRaw(deps.fetch, url, house ? JSON_ACCEPT : XML_ACCEPT);
        if (r.ok && r.body) {
          // Stored unmodified BEFORE parsing; a failed write never stops the run.
          const env: RollEnvelope = {
            kind: house ? "house_vote" : "senate_vote", chamber: c.chamber, congress: c.congress, session: c.session, roll: c.roll,
            url: publicUrl(url), fetched_at: fetchedAt, source_type: house ? "Congress.gov house-vote member votes" : "senate.gov LIS roll call vote XML",
            http_status: r.status, content_type: r.contentType, body_chars: r.body.length, body: r.body,
            ...(house ? { list_row: c.row } : {}),
          };
          rollRef = await putRaw(deps.rawStore, rollRawKey(c.chamber, c.congress, c.session, c.roll, fetchedAt), env, log);
          rec = rollFromEnvelope(env);
        }
      } catch (e: any) {
        if (e instanceof RateLimited) throw e;
        report.errors.push(`${key}: ${e?.message || e}`);
      }
      const attempts = (state.ledger[key]?.attempts || 0) + 1;
      if (!rec || !rec.members.length) {
        if (rec && rec.unsupported.length) { ledgerSet(key, "unsupported", c.date, rec.unsupported.slice(0, 3).join(", ")); report.unsupported++; continue; }
        const parked = attempts >= MAX_ATTEMPTS;
        ledgerSet(key, parked ? "parked" : "incomplete", c.date, rec ? "no member positions yet" : "detail unavailable");
        parked ? report.parked++ : report.incomplete++;
        log(`vote-actions: ${parked ? "PARKED" : "RETRY LATER"} ${key} — ${rec ? "no member positions yet" : "detail unavailable"} (attempt ${attempts})`);
        continue;
      }
      if (rec.unsupported.length) {
        // A mixed vocabulary (Speaker election ballots, "Guilty") is never flattened.
        ledgerSet(key, "unsupported", c.date, rec.unsupported.slice(0, 3).join(", "));
        report.unsupported++;
        log(`vote-actions: UNSUPPORTED ${key} — vote words ${[...new Set(rec.unsupported)].slice(0, 3).join(", ")}`);
        continue;
      }
      if (!rec.measure) { ledgerSet(key, "no_measure", c.date, rec.question || ""); report.noMeasure++; continue; }

      // One roll call's bill / tag / write step failing must not end the run:
      // it is retried on later runs like a missing member list, then parked.
      try {
        let bill = await deps.repo.getBill(rec.measure.billKey);
        if (!bill) {
          const responses = await fetchBillMetaRaw(deps.fetch, deps.apiKey, rec.congress, rec.measure);
          const metaRef = responses
            ? await putRaw(deps.rawStore, billRawKey(rec.measure.billKey, fetchedAt), {
                kind: "bill_meta", bill_key: rec.measure.billKey, congress: rec.congress, measure: { ...rec.measure },
                fetched_at: fetchedAt, source_type: "Congress.gov bill metadata", responses,
              } satisfies BillEnvelope, log)
            : null;
          const meta = billMetaFromResponses(responses, rec.congress, rec.measure);
          const built = billFromMeta(rec, meta, new Date(fetchedAt), metaRef);
          const tags = built.tags;
          bill = built.bill;
          await deps.repo.upsertBill(bill);
          tags.tags.length ? report.billsTagged++ : report.billsUntagged++;
          log(`vote-actions: BILL ${bill.billKey} ${bill.number || ""} — tags high [${tags.highTags.join(", ")}] low [${tags.lowTags.join(", ")}]${tags.untagged ? ` (untagged: ${tags.untagged})` : ""}${tags.multiTopic ? " multi-topic" : ""} · ${meta.metaSource}`);
        }
        const { rows, unmapped } = rowsForRoll(rec, bill, { memberMap: deps.memberMap, lis }, rollRef);
        const w = await deps.repo.upsertVotes(rows);
        report.votesInserted += w.inserted;
        report.votesRevised += w.revised;
        report.membersUnmapped += unmapped;
        for (const t of bill.topicTags) report.tagCounts[t] = (report.tagCounts[t] || 0) + 1;
        ledgerSet(key, "done", c.date);
        report.done++;
      } catch (e: any) {
        if (e instanceof RateLimited) throw e;
        const msg = String(e?.message || e).slice(0, 160);
        const parked = attempts >= MAX_ATTEMPTS;
        ledgerSet(key, parked ? "parked" : "incomplete", c.date, `processing error: ${msg}`);
        parked ? report.parked++ : report.incomplete++;
        report.errors.push(`${key}: ${msg}`);
        log(`vote-actions: ${parked ? "PARKED" : "RETRY LATER"} ${key} — processing error: ${msg} (attempt ${attempts})`);
      }
    }

    // 3. Late summaries: refetch a few bills read without one, then re-tag.
    if (deps.apiKey && !overBudget()) {
      const stale = await deps.repo.billsNeedingMeta({ olderThan: new Date(now.getTime() - META_REFRESH_AFTER_DAYS * DAY).toISOString(), maxAttempts: META_MAX_ATTEMPTS, limit: META_REFRESH_PER_RUN });
      for (const b of stale) {
        if (overBudget()) { report.budgetHit = true; break; }
        const m = measureRef(b.congress, b.billType, billNumFromKey(b), null);
        if (!m) continue;
        m.parentBillKey = b.parentBillKey;
        const at = (deps.now || (() => new Date()))().toISOString();
        const responses = await fetchBillMetaRaw(deps.fetch, deps.apiKey, b.congress, m);
        const metaRef = responses
          ? await putRaw(deps.rawStore, billRawKey(b.billKey, at), {
              kind: "bill_meta", bill_key: b.billKey, congress: b.congress, measure: { ...m }, fetched_at: at,
              source_type: "Congress.gov bill metadata", responses,
            } satisfies BillEnvelope, log)
          : null;
        const meta = billMetaFromResponses(responses, b.congress, m);
        const tags = tagMeasure({ measureType: b.measureType, title: meta.title, shortTitle: meta.shortTitle, summary: meta.summary, policyArea: meta.policyArea, subjects: meta.subjects });
        // The row keeps its old text when the refetch found nothing, so it keeps its old raw_ref too.
        const fresh = meta.metaSource === "congress_gov";
        const row = { ...buildBillRow(b.congress, m, fresh ? meta : { ...meta, title: b.title, summary: b.summary }, tags, b, new Date(at)), rawRef: fresh ? metaRef : b.rawRef ?? null };
        await deps.repo.upsertBill(row);
        if (row.topicTags.join() !== b.topicTags.join() || row.taggerVersion !== b.taggerVersion) await deps.repo.retagVotes(row.billKey, row.topicTags, row.taggerVersion);
        report.metaRefreshed++;
      }
    }

    // 4. Tagger version bump: re-tag stored bills from their stored text (no fetch).
    if (!overBudget()) {
      for (const b of await deps.repo.billsWithStaleTags(TAGGER_VERSION, RETAG_PER_RUN)) {
        const tags = tagMeasure({ measureType: b.measureType, title: b.title, shortTitle: b.shortTitle, summary: b.summary, policyArea: b.policyArea, subjects: b.officialSubjects });
        await deps.repo.upsertBill({ ...b, topicTags: tags.tags, tagDetail: tags.detail, multiTopic: tags.multiTopic, taggerVersion: tags.version });
        await deps.repo.retagVotes(b.billKey, tags.tags, tags.version);
        report.retagged++;
      }
    }
  } catch (e: any) {
    if (e instanceof RateLimited) { report.rateLimited = true; log(`vote-actions: RATE LIMITED — ${e.message}; stopping this run`); }
    else report.errors.push(e?.message || String(e));
  }

  // Keep the ledger bounded to the window (+30 days of slack).
  const keepAfter = cutoff - 30 * DAY;
  for (const [k, v] of Object.entries(state.ledger)) if (new Date(v.date).getTime() < keepAfter) delete state.ledger[k];
  state.lastRun = { at: now.toISOString(), ms: clock() - started, ...report, tagCounts: undefined };
  return { report, state };
}

export function summaryLine(r: RunReport): string {
  const top = Object.entries(r.tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `${k}:${n}`).join(" ");
  return `vote-actions: run — congress ${r.congress} · candidates house ${r.candidates.house} senate ${r.candidates.senate} · processed ${r.processed} (done ${r.done}, retry ${r.incomplete}, parked ${r.parked}, unsupported ${r.unsupported}, no measure ${r.noMeasure}) · bills tagged ${r.billsTagged} untagged ${r.billsUntagged} · votes new ${r.votesInserted} revised ${r.votesRevised} · off-roster members ${r.membersUnmapped} · late summaries ${r.metaRefreshed} · retagged ${r.retagged}${r.rateLimited ? " · RATE LIMITED" : ""}${r.budgetHit ? " · budget reached" : ""}${r.houseConfigured ? "" : " · house skipped (no key)"}${top ? ` · tags ${top}` : ""}${r.errors.length ? ` · errors ${r.errors.length}` : ""}`;
}
