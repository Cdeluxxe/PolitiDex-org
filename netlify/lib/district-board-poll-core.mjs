// ─────────────────────────────────────────────────────────────────────────────
// District board poll — one poll per issue group, on the Layton composer boards
// ─────────────────────────────────────────────────────────────────────────────
// The five boards that take a comment (SD-3, HD-16, SD-7, HD-15, UT-2) also take
// ONE vote per issue on their table: Support / Oppose / Not sure, for that issue
// on this seat. The seat list, the gate and the locked line are the composer's
// own, imported from district-board-voice-core.mjs rather than copied, so the
// poll can never open on a seat the composer does not, or for a caller the
// composer would refuse.
//
// ── THE GATE IS THE COMPOSER'S, AND IT FAILS CLOSED ─────────────────────────
// signed in + a voice_residency row for THIS seat with status 'verified' AND
// method 'vendor'. A location_match row, a typed zip or a flag for a neighbour
// seat opens nothing. No vendor is wired, so today every vote is refused; there
// is no flag, env var or test hook that turns it on. The gate is asked BEFORE
// the issue or the choice is looked at, and every refusal returns before the
// upsert is reachable — an unverified POST is 403 and writes nothing.
//
// ── COUNTS ONLY ON THE WIRE ─────────────────────────────────────────────────
// A tally goes out as { issueKey, support, oppose, not_sure, total } and nothing
// else. No author hash, no uid, no name. `mine` is the caller's OWN vote per
// issue, computed here and only for a caller the gate let through — never
// anybody else's. Anyone can read the tallies.
//
// Pure over injected dependencies, so scripts/test-district-board-poll.mjs
// drives the real handler against an in-memory fake — no database, no network.

import { authorHash } from "./district-voice-core.mjs";
import { COMPOSER_SEATS, LOCKED_LINE, composerSeat, gate } from "./district-board-voice-core.mjs";

export { COMPOSER_SEATS, LOCKED_LINE };

export const CHOICES = ["support", "oppose", "not_sure"];

export const COPY = {
  noSeat: "This board does not take votes.",
  noIssue: "Choose an issue from this seat's table.",
  badChoice: "Choose Support, Oppose or Not sure.",
};

function issueShape(v) {
  const k = String(v == null ? "" : v).trim().toLowerCase();
  return /^[a-z0-9_]+$/.test(k) ? k : "";
}

// One tally per issue from grouped rows { issueKey, choice, v }. Whitelisted
// field by field; a row carrying anything else cannot pass it through.
export function tallies(rows) {
  const out = new Map();
  for (const r of rows || []) {
    const k = issueShape(r && r.issueKey);
    if (!k || !CHOICES.includes(r.choice)) continue;
    let t = out.get(k);
    if (!t) { t = { issueKey: k, support: 0, oppose: 0, not_sure: 0, total: 0 }; out.set(k, t); }
    const n = Number(r.v);
    const c = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    t[r.choice] += c;
    t.total += c;
  }
  return [...out.values()];
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "private, no-store" },
  });
}

// deps:
//   verifyUser(req)                        → { uid, isAnonymous } | null
//   findResidency(seatKey, hash)           → { seatKey, status, method } | null
//   issueExists(issueKey)                  → boolean
//   countVotes(seatKey)                    → [{ issueKey, choice, v }]  (grouped)
//   myVotes(seatKey, hash)                 → [{ issueKey, choice }]
//   upsertVote({ seatKey, issueKey, authorHash, choice })
//   limit(req, user)                       → Response | null   (optional)
export async function handle(req, deps) {
  const method = String(req.method || "GET").toUpperCase();
  const url = new URL(req.url);

  if (method === "GET") {
    const seatKey = composerSeat(url.searchParams.get("seat"));
    if (!seatKey) return json({ error: COPY.noSeat, code: "no_seat" }, 404);
    const user = await deps.verifyUser(req);
    const hash = user && !user.isAnonymous && user.uid ? authorHash(user.uid, seatKey) : "";
    const row = hash ? await deps.findResidency(seatKey, hash) : null;
    const verdict = gate(user, row, seatKey);
    const polls = tallies(await deps.countVotes(seatKey));
    const mine = {};
    if (verdict.ok && hash) {
      for (const r of (await deps.myVotes(seatKey, hash)) || []) {
        const k = issueShape(r && r.issueKey);
        if (k && CHOICES.includes(r.choice)) mine[k] = r.choice;
      }
    }
    return json({
      seat: COMPOSER_SEATS[seatKey],
      choices: CHOICES,
      polls,
      mine,
      voice: {
        canVote: verdict.ok,
        reason: verdict.ok ? "verified" : verdict.code,
        line: verdict.ok ? "" : LOCKED_LINE,
        note: verdict.ok ? "" : verdict.note || "",
      },
    });
  }

  if (method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload = {};
  try { payload = (await req.json()) || {}; } catch { payload = {}; }

  const seatKey = composerSeat(payload.seat);
  if (!seatKey) return json({ error: COPY.noSeat, code: "no_seat" }, 404);

  const user = await deps.verifyUser(req);
  if (deps.limit) {
    const limited = await deps.limit(req, user);
    if (limited) return limited;
  }
  const hash = user && !user.isAnonymous && user.uid ? authorHash(user.uid, seatKey) : "";
  const row = hash ? await deps.findResidency(seatKey, hash) : null;
  const verdict = gate(user, row, seatKey);
  if (!verdict.ok || !hash) {
    return json({
      error: verdict.message || LOCKED_LINE,
      note: verdict.note || "",
      code: verdict.code || "signed_out",
    }, verdict.status || 403);
  }

  const issueKey = issueShape(payload.issueKey);
  if (!issueKey || !(await deps.issueExists(issueKey))) {
    return json({ error: COPY.noIssue, code: "bad_issue" }, 400);
  }
  const choice = String(payload.choice == null ? "" : payload.choice);
  if (!CHOICES.includes(choice)) return json({ error: COPY.badChoice, code: "bad_choice" }, 400);

  await deps.upsertVote({ seatKey: verdict.seatKey, issueKey, authorHash: hash, choice });

  const poll = tallies(await deps.countVotes(verdict.seatKey)).find((t) => t.issueKey === issueKey) ||
    { issueKey, support: 0, oppose: 0, not_sure: 0, total: 0 };
  return json({ poll, mine: choice }, 200);
}
