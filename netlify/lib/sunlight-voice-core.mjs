// ─────────────────────────────────────────────────────────────────────────────
// sunlight-voice-core.mjs — Sunlight Governance, Phase 3: the rate-case entry
// inside District Voice
// ─────────────────────────────────────────────────────────────────────────────
// The live Sunlight Governance entry (Rocky Mountain Power's general rate case,
// Utah PSC Docket No. 24-035-04, in sunlight-entries.js) gets a place on every
// Utah district board. A verified resident of THAT seat can:
//
//   1. COMMENT on the entry            (280 characters, newest first)
//   2. SIGNAL SUPPORT for the entry's narrow ask, "Publish one confidential
//      contract" — one signal per resident per seat, withdrawable
//   3. ASK THEIR OWN REPRESENTATIVE for a public position on that ask, answered
//      yes / no / abstain. The representative is the seat's sitting member from
//      netlify/lib/seat-holders.mjs at write time — never a pid the caller sent.
//
// Anyone can read: the comments, the counts, the district engagement view and
// the PSC filing note. Nothing here changes the entry itself, the stance
// generator, or any District Voice rule.
//
// ── THE GATE IS DISTRICT VOICE'S GATE, UNCHANGED ────────────────────────────
// gate() and seatHash() are imported from district-board-voice-core.mjs, so
// "who may write here" is the board composer's answer, word for word: signed in
// AND a vendor-verified (ID and address) residency row for THIS seat. A typed
// address or saved location opens nothing. The daily comment cap is the
// board's too (membership-core.mjs). This module adds ONE narrowing: the seat
// must be a Utah seat, because the rate case is a Utah PSC docket.
//
// ── THE STORE, AND WHY NO TABLE WAS ADDED ───────────────────────────────────
// cee_item_comments and cee_item_votes are the app's existing item-keyed
// threads ("inline discussion and sentiment on any app item"), addressed by a
// target id. Three target families, one per action, each carrying the seat:
//
//   sunlight_voice:ut-psc-24-035-04:<seat>          a comment   (cee_item_comments)
//   sunlight_support:ut-psc-24-035-04:<seat>        a support   (cee_item_votes)
//   sunlight_ask:ut-psc-24-035-04:<seat>:<pid>      a rep ask   (cee_item_votes)
//
// The underscore in the type and the fourth segment are deliberate: the open
// /api/threads route only accepts /^[a-z]+:…:…$/ targets, so no un-gated path
// can write into these families. The author column holds the SEAT-SCOPED HASH,
// never a Firebase uid, exactly as voice_* tables do, and the name column is
// the fixed "Verified resident".
//
// ── NEUTRAL BY CONSTRUCTION ─────────────────────────────────────────────────
// Counts only. No percentage, no share of a district, no ranking of people and
// no claim that a district believes anything. The engagement view orders
// districts by how many actions verified residents took, and says so.
//
// Pure over injected dependencies, so scripts/test-sunlight-voice.mjs drives
// the real handler against an in-memory store.

import { COMPOSER_SEATS, LOCKED_LINE, COPY as BOARD_COPY, composerSeat, gate, seatHash } from "./district-board-voice-core.mjs";
import { CAP_COPY, DAILY_COMMENTS, dayStart, memberFor } from "./membership-core.mjs";
import { holderFor } from "./general-room-core.mjs";
// The entry file is a plain browser script that also publishes itself on
// globalThis. Importing it here makes it the ONE source for the Filed vs.
// Ordered pair and the manual list of public filings since the order.
import "../../sunlight-entries.js";

const LIVE = globalThis.PDXSunlightEntries;
const LIVE_ENTRY = LIVE && LIVE.byId ? LIVE.byId["UT-PSC-24-035-04"] : null;

// ── THE ENTRY ───────────────────────────────────────────────────────────────
// The id, title and ask label are the ones sunlight-entries.js publishes;
// scripts/test-sunlight-voice.mjs pins the two to each other.
export const ENTRY = Object.freeze({
  id: "UT-PSC-24-035-04",
  slug: "ut-psc-24-035-04",
  title: "Rocky Mountain Power general rate case, Utah PSC Docket No. 24-035-04",
  href: "/sunlight/rocky-mountain-power#rmp-24-035-04",
  docket: "24-035-04",
  orderDate: "2025-04-25",
  askLabel: "Publish one confidential contract",
});

// The three answers a representative is asked to give. A request records the
// question and these options; it does not pick one on the representative's
// behalf.
export const ASK_OPTIONS = Object.freeze(["yes", "no", "abstain"]);
export const ASK_VOTE = "yes_no_abstain";
export const SUPPORT_VOTE = "support";

// ── PUBLIC POSITIONS ON RECORD ──────────────────────────────────────────────
// A manual table: pid → { position: 'yes'|'no'|'abstain', date, source }.
// A row lands here only with a public source. Empty in this pass: no Utah
// officeholder has stated a public position on the ask yet.
export const REP_POSITIONS = Object.freeze({});

// ── PSC FILING UPDATES (THE MANUAL FLAG) ────────────────────────────────────
// The list lives in sunlight-entries.js (FILINGS_SINCE_ORDER), so /sunlight and
// every Utah board read the same rows. Rows dated after the April 25, 2025
// order print as an "Update" note with a link. Empty in this pass.
// The public order the entry cites (the same URL sunlight-entries.js carries).
export const ORDER_URL = "https://pscdocs.utah.gov/electric/24docs/2403504/3395032403504,2303540,and2303544o4-25-2025.pdf";
export const FILING_UPDATES = Object.freeze(((LIVE_ENTRY && LIVE_ENTRY.filingsSinceOrder) || []).slice());

// ── FILED VS. ORDERED ───────────────────────────────────────────────────────
// The utility's application and the PSC's order, by title, date and public
// link, exactly as sunlight-entries.js carries them. No figures.
export const FILED_VS_ORDERED = Object.freeze(((LIVE_ENTRY && LIVE_ENTRY.filedVsOrdered) || []).map((r) => Object.freeze({
  step: String(r.step), label: String(r.label), date: String(r.date),
  dateLabel: LIVE.longDate(r.date), title: String(r.title), url: String(r.url),
})));

export const POST_MAX = 280;
export const COMMENTS_CAP = 20;
export const AUTHOR_NAME = "Verified resident";

export const COPY = Object.freeze({
  kick: "Sunlight Governance in District Voice",
  frame: "Verified residents of this seat. Counts are actions taken, not a measure of opinion.",
  noSeat: "This board is not a Utah board, so the Utah rate case is not open here.",
  empty: "Write something first.",
  tooLong: "Keep it to " + POST_MAX + " characters.",
  noHolder: "This seat has no sitting member on file, so there is no representative to ask.",
  noAction: "Unknown action.",
  emptyComments: "No comments from this seat yet.",
  emptySentiment: "No district has engagement on this entry yet.",
  noPosition: "No public position on record yet.",
  noFilings: "No new public PSC filings flagged since the April 25, 2025 order.",
  sentimentNote: "Each count is how many verified residents of that seat took the action. It is engagement, not a vote, and not a share of the district.",
});

// ── TARGET IDS ──────────────────────────────────────────────────────────────
const PREFIX = { comment: "sunlight_voice", support: "sunlight_support", ask: "sunlight_ask" };
const PID_RE = /^[a-z][a-z0-9_]*$/;

export function commentTarget(seatKey) { return `${PREFIX.comment}:${ENTRY.slug}:${seatKey}`; }
export function supportTarget(seatKey) { return `${PREFIX.support}:${ENTRY.slug}:${seatKey}`; }
export function askTarget(seatKey, pid) { return `${PREFIX.ask}:${ENTRY.slug}:${seatKey}:${pid}`; }
export const TARGET_PREFIXES = Object.freeze({
  comment: `${PREFIX.comment}:${ENTRY.slug}:`,
  support: `${PREFIX.support}:${ENTRY.slug}:`,
  ask: `${PREFIX.ask}:${ENTRY.slug}:`,
});

// target id → { kind, seatKey } for a Utah composer seat, else null. Strict, so
// a row that merely resembles a family is never counted.
export function parseTarget(id) {
  const s = String(id == null ? "" : id);
  for (const kind of ["comment", "support", "ask"]) {
    const p = TARGET_PREFIXES[kind];
    if (!s.startsWith(p)) continue;
    const rest = s.slice(p.length).split(":");
    if (kind === "ask" ? rest.length !== 2 || !PID_RE.test(rest[1]) : rest.length !== 1) return null;
    const seatKey = utahSeat(rest[0]);
    return seatKey && seatKey === rest[0] ? { kind, seatKey, pid: kind === "ask" ? rest[1] : "" } : null;
  }
  return null;
}

// ── THE SEAT ────────────────────────────────────────────────────────────────
// A canonical Utah composer seat, or ''.
export function utahSeat(raw) {
  const k = composerSeat(raw);
  return k && k.startsWith("ut-") ? k : "";
}

export function seatLabel(seatKey) {
  const k = String(seatKey || "");
  let m;
  if ((m = /^ut-statehouse-(\d+)$/.exec(k))) return `Utah House District ${m[1]}`;
  if ((m = /^ut-statesenate-(\d+)$/.exec(k))) return `Utah Senate District ${m[1]}`;
  if ((m = /^ut-house-(\d+)$/.exec(k))) return `U.S. House, Utah District ${m[1]}`;
  if (k === "ut-gov") return "Utah Governor (statewide)";
  if (/^ut-us-senate-/.test(k)) {
    const h = holderFor(k);
    return `U.S. Senate, Utah (statewide)${h ? " · " + h.name : ""}`;
  }
  return k;
}

export function boardHref(seatKey) {
  const alias = COMPOSER_SEATS[seatKey];
  return alias ? `/district/${alias}` : "";
}

export function normalizeBody(v) {
  return String(v == null ? "" : v).replace(/\r\n?/g, "\n").trim();
}

// ── THE DISTRICT ENGAGEMENT VIEW ────────────────────────────────────────────
// rows: [{ targetId, kind: 'comment'|'vote', vote?, n }] as the store groups
// them. One line per Utah seat with any engagement, ordered by total actions
// (then by label, so a tie never reads as a rank between people).
export function sentimentFrom(rows) {
  const by = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    const t = parseTarget(r && r.targetId);
    if (!t) continue;
    if (t.kind === "support" && r.vote !== SUPPORT_VOTE) continue;
    if (t.kind === "ask" && r.vote !== ASK_VOTE) continue;
    if (t.kind === "comment" && r.kind !== "comment") continue;
    const n = Math.max(0, Math.floor(Number(r.n) || 0));
    if (!n) continue;
    const line = by.get(t.seatKey) || {
      seat: COMPOSER_SEATS[t.seatKey], seatKey: t.seatKey, label: seatLabel(t.seatKey),
      href: boardHref(t.seatKey), comments: 0, support: 0, asks: 0, total: 0,
    };
    if (t.kind === "comment") line.comments += n;
    else if (t.kind === "support") line.support += n;
    else line.asks += n;
    line.total = line.comments + line.support + line.asks;
    by.set(t.seatKey, line);
  }
  return [...by.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

// ── THE FILING NOTE ─────────────────────────────────────────────────────────
export function filingsNote(updates = FILING_UPDATES) {
  return LIVE.filingsNote(Array.isArray(updates) ? updates : []);
}

export function positionFor(pid, table = REP_POSITIONS) {
  const p = pid && table && Object.prototype.hasOwnProperty.call(table, pid) ? table[pid] : null;
  if (!p || !ASK_OPTIONS.includes(p.position) || !/^https:\/\//.test(String(p.source || ""))) return null;
  return { position: p.position, date: String(p.date || ""), source: String(p.source) };
}

// The only shape a comment leaves in: no author hash, no uid, no name.
export function publicComment(row, viewerHash) {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.createdAt,
    mine: !!viewerHash && row.authorUid === viewerHash,
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "private, no-store" },
  });
}

function entryOut() {
  return { id: ENTRY.id, title: ENTRY.title, href: ENTRY.href, askLabel: ENTRY.askLabel };
}

async function sentimentOf(deps) {
  try {
    return sentimentFrom(typeof deps.engagementRows === "function" ? await deps.engagementRows() : []);
  } catch {
    return [];
  }
}

// deps:
//   verifyUser(req)                       → { uid, isAnonymous } | null
//   findResidency(seatKey, hash)          → { seatKey, status, method } | null
//   listComments(target, cap)             → [{ id, body, createdAt, authorUid }], newest first
//   countCommentsSince(target, hash, since) → integer
//   insertComment({ targetId, authorUid, authorName, body }) → row
//   voteCount(target, vote)               → integer
//   hasVote(target, hash)                 → boolean
//   addVote({ targetId, uid, vote })      → true if written
//   removeVote(target, hash)              → void
//   engagementRows()                      → [{ targetId, kind, vote?, n }]
//   findMembership(accountHash)           → (optional) the daily cap's member read
//   holders                               → (optional) seat → holder table
//   limit(req, user)                      → Response | null (optional)
//   now()                                 → Date (optional)
export async function handle(req, deps) {
  const method = String(req.method || "GET").toUpperCase();
  const url = new URL(req.url);
  const holders = deps && deps.holders && typeof deps.holders === "object" ? deps.holders : undefined;

  if (method === "GET") {
    const rawSeat = url.searchParams.get("seat");
    const sentiment = await sentimentOf(deps);
    const base = { entry: entryOut(), sentiment, sentimentEmpty: sentiment.length ? "" : COPY.emptySentiment,
      sentimentNote: COPY.sentimentNote, filedVsOrdered: FILED_VS_ORDERED.map((r) => ({ ...r })),
      filings: filingsNote(deps.filings || FILING_UPDATES) };
    if (!rawSeat) return json(base);
    const seatKey = utahSeat(rawSeat);
    if (!seatKey) return json({ error: COPY.noSeat, code: "no_seat" }, 404);

    const user = await deps.verifyUser(req);
    const hash = user && !user.isAnonymous ? seatHash(user.uid, seatKey) : "";
    const row = hash ? await deps.findResidency(seatKey, hash) : null;
    const verdict = gate(user, row, seatKey);
    const holder = holderFor(seatKey, holders);

    const crow = (await deps.listComments(commentTarget(seatKey), COMMENTS_CAP)) || [];
    const comments = crow.map((r) => publicComment(r, hash));
    const sTarget = supportTarget(seatKey);
    const aTarget = holder ? askTarget(seatKey, holder.pid) : "";
    return json({
      ...base,
      seat: COMPOSER_SEATS[seatKey],
      district: { label: seatLabel(seatKey), href: boardHref(seatKey) },
      comments,
      commentsEmpty: comments.length ? "" : COPY.emptyComments,
      support: {
        count: Number(await deps.voteCount(sTarget, SUPPORT_VOTE)) || 0,
        mine: !!hash && verdict.ok && !!(await deps.hasVote(sTarget, hash)),
      },
      ask: holder ? {
        available: true,
        holder: { pid: holder.pid, name: holder.name },
        question: ENTRY.askLabel,
        options: ASK_OPTIONS.slice(),
        requests: Number(await deps.voteCount(aTarget, ASK_VOTE)) || 0,
        mine: !!hash && verdict.ok && !!(await deps.hasVote(aTarget, hash)),
        position: positionFor(holder.pid, deps.positions || REP_POSITIONS),
        positionNote: positionFor(holder.pid, deps.positions || REP_POSITIONS) ? "" : COPY.noPosition,
      } : { available: false, note: COPY.noHolder },
      voice: {
        canPost: verdict.ok,
        reason: verdict.ok ? "verified" : verdict.code,
        line: verdict.ok ? "" : LOCKED_LINE,
        note: verdict.ok ? BOARD_COPY.open : verdict.note || "",
      },
      limits: { postMax: POST_MAX, commentsCap: COMMENTS_CAP },
    });
  }

  if (method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload = {};
  try { payload = (await req.json()) || {}; } catch { payload = {}; }

  const seatKey = utahSeat(payload.seat);
  if (!seatKey) return json({ error: COPY.noSeat, code: "no_seat" }, 404);

  const user = await deps.verifyUser(req);
  if (deps.limit) {
    const limited = await deps.limit(req, user);
    if (limited) return limited;
  }
  const hash = user && !user.isAnonymous ? seatHash(user.uid, seatKey) : "";
  const row = hash ? await deps.findResidency(seatKey, hash) : null;
  const verdict = gate(user, row, seatKey);
  // A REFUSAL WRITES NOTHING: every store write is below this line.
  if (!verdict.ok || !hash) {
    return json({ error: verdict.message || LOCKED_LINE, note: verdict.note || BOARD_COPY.signedOut, code: verdict.code || "signed_out" }, verdict.status || 403);
  }

  const action = String(payload.action || "");

  if (action === "comment") {
    const body = normalizeBody(payload.body);
    if (!body) return json({ error: COPY.empty, code: "empty" }, 400);
    if ([...body].length > POST_MAX) return json({ error: COPY.tooLong, code: "too_long" }, 400);
    const target = commentTarget(seatKey);
    if (!(await memberFor(deps, user))) {
      // The board's daily cap. FAILS CLOSED: no counter means no comment.
      const since = dayStart(deps.now ? deps.now() : new Date());
      const used = typeof deps.countCommentsSince === "function"
        ? Number(await deps.countCommentsSince(target, hash, since))
        : Infinity;
      if (!(used < DAILY_COMMENTS)) return json({ error: CAP_COPY.comment, code: "daily_cap" }, 429);
    }
    const saved = await deps.insertComment({ targetId: target, authorUid: hash, authorName: AUTHOR_NAME, body });
    return json({ comment: publicComment({ ...saved, authorUid: hash }, hash) }, 201);
  }

  if (action === "support") {
    const target = supportTarget(seatKey);
    if (payload.on === false) await deps.removeVote(target, hash);
    else await deps.addVote({ targetId: target, uid: hash, vote: SUPPORT_VOTE });
    return json({
      support: { count: Number(await deps.voteCount(target, SUPPORT_VOTE)) || 0, mine: !!(await deps.hasVote(target, hash)) },
    });
  }

  if (action === "ask") {
    // The representative is the seat's sitting member NOW; a pid in the
    // payload is ignored.
    const holder = holderFor(seatKey, holders);
    if (!holder) return json({ error: COPY.noHolder, code: "no_holder" }, 404);
    const target = askTarget(seatKey, holder.pid);
    const added = !!(await deps.addVote({ targetId: target, uid: hash, vote: ASK_VOTE }));
    return json({
      ask: {
        holder: { pid: holder.pid, name: holder.name },
        question: ENTRY.askLabel,
        options: ASK_OPTIONS.slice(),
        requests: Number(await deps.voteCount(target, ASK_VOTE)) || 0,
        mine: true,
        added,
      },
    }, added ? 201 : 200);
  }

  return json({ error: COPY.noAction, code: "bad_action" }, 400);
}
