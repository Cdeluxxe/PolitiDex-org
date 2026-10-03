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
// seat opens nothing. Only the signed Veriff webhook writes a vendor row, so a
// seat stays refused until its own check passes; there is no flag, env var or
// test hook that turns it on. The gate is asked BEFORE
// the issue or the choice is looked at, and every refusal returns before the
// upsert is reachable — an unverified POST is 403 and writes nothing.
//
// ── COUNTS ONLY ON THE WIRE ─────────────────────────────────────────────────
// A tally goes out as { issueKey, support, oppose, not_sure, total } and nothing
// else. No author hash, no uid, no name. `mine` is the caller's OWN vote per
// issue, computed here and only for a caller the gate let through — never
// anybody else's. Anyone can read the tallies.
//
// ── THE MONTHLY CAP, AFTER THE GATE ─────────────────────────────────────────
// A verified resident who is not a member gets FIVE poll votes a Mountain-time
// calendar month on this seat, across its issues (netlify/lib/membership-core.mjs).
// A vote used is a row cast or changed this month; once five are used, a new or
// changed vote is 429 with CAP_COPY.vote and writes nothing. Re-sending the vote
// already on file is answered 200 and writes nothing. The cap is asked only
// after the residency gate, so a member with no vendor row for this seat is
// still 403. Tallies still publish to everyone.
//
// Pure over injected dependencies, so scripts/test-district-board-poll.mjs
// drives the real handler against an in-memory fake — no database, no network.

import { authorHash } from "./district-voice-core.mjs";
import { COMPOSER_SEATS, LOCKED_LINE, composerSeat, gate } from "./district-board-voice-core.mjs";
import { CAP_COPY, MONTHLY_VOTES, memberFor, monthStart } from "./membership-core.mjs";

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
//   upsertVote({ seatKey, issueKey, authorHash, choice, capSince?, capLimit? }) → boolean | void
//                                          (with capSince: writes only if this author has
//                                          fewer than capLimit votes on this seat cast or
//                                          changed since then; false if not)
//   findMembership(accountHash)            → voice_membership row | null
//   countVotesSince(seatKey, hash, since)  → integer
//   limit(req, user)                       → Response | null   (optional)
//   now()                                  → Date              (optional)
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

  const values = { seatKey: verdict.seatKey, issueKey, authorHash: hash, choice };
  if (await memberFor(deps, user)) {
    await deps.upsertVote(values);
  } else {
    const current = ((await deps.myVotes(verdict.seatKey, hash)) || [])
      .find((r) => r && issueShape(r.issueKey) === issueKey);
    if (!current || current.choice !== choice) {
      // FAILS CLOSED: no counter means no vote, not an uncapped one.
      const since = monthStart(deps.now ? deps.now() : new Date());
      const used = typeof deps.countVotesSince === "function"
        ? Number(await deps.countVotesSince(verdict.seatKey, hash, since))
        : Infinity;
      if (!(used < MONTHLY_VOTES)) return json({ error: CAP_COPY.vote, code: "monthly_cap" }, 429);
      const wrote = await deps.upsertVote({ ...values, capSince: since, capLimit: MONTHLY_VOTES });
      if (wrote === false) return json({ error: CAP_COPY.vote, code: "monthly_cap" }, 429);
    }
  }

  const poll = tallies(await deps.countVotes(verdict.seatKey)).find((t) => t.issueKey === issueKey) ||
    { issueKey, support: 0, oppose: 0, not_sure: 0, total: 0 };
  return json({ poll, mine: choice }, 200);
}
