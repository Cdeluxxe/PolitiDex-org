#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for MEMBERSHIP AND THE DAILY CAP — three doors that do not collapse
// ─────────────────────────────────────────────────────────────────────────────
//   1. NO VENDOR ROW — 403 for a comment and a vote, member or not, and nothing
//      is written. A location_match row or a neighbour seat's row is no row.
//   2. VERIFIED NON-MEMBER — the first comment and the first vote of the day
//      write; the second of each does not, and the refusal names the cap. The
//      next Mountain-time day opens again. No counter fails closed.
//   3. VERIFIED MEMBER — no daily cap. A lapsed or inactive flag is capped.
//   4. THE WEBHOOK — unsigned, badly signed, stale, wrong price, pending and
//      foreign events write nothing; only a signed event for STRIPE_PRICE_ID
//      sets or clears the flag, and it never touches residency.
//   5. CHECKOUT — signed in only, returns to /me, carries no uid, writes nothing.
//   6. THE PUBLIC WIRE — no board JSON carries the flag or an account id, and
//      no board grows a pay button.
//   7. THE COPY — /me says the three things, and no equity language anywhere.
//   8. THE STORE — the migration, the SW bump.
//
//   node scripts/test-membership-cap.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { handle as handlePost } from "../netlify/lib/district-board-voice-core.mjs";
import { handle as handleVote } from "../netlify/lib/district-board-poll-core.mjs";
import { authorHash } from "../netlify/lib/district-voice-core.mjs";
import {
  CAP_COPY, accountHash, dayStart, decide, handleMembership, handleWebhook, isMember, stripeSign,
} from "../netlify/lib/membership-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let pass = 0;
let fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; } else { fail++; console.error("  ✗ " + msg); }
}
function eq(a, b, msg) { ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`); }
function section(t) { console.log("── " + t); }

const SEAT = "ut-statesenate-3";
const ALIAS = "ut-sd-3";
const NEIGHBOUR = "ut-statehouse-16";
const UID = "uid-resident";
const H = authorHash(UID, SEAT);
const ACCT = accountHash(UID);
// 10:00 Mountain on 2026-10-03 (MDT, UTC-6).
const NOON = new Date("2026-10-03T16:00:00Z");

// ── one in-memory store behind BOTH board handlers ─────────────────────────
function fakeBoard({ residency = [], membership = null, noCounters = false } = {}) {
  const s = { posts: [], votes: new Map(), writes: 0, clock: NOON };
  s.deps = {
    now: () => s.clock,
    async verifyUser(req) {
      const a = req.headers.get("authorization") || "";
      if (!a.startsWith("Bearer ")) return null;
      return { uid: a.slice(7), isAnonymous: false };
    },
    async findResidency(seatKey, hash) {
      return residency.find((r) => r.seatKey === seatKey && r.authorHash === hash) || null;
    },
    async findMembership(hash) { return membership && hash === ACCT ? membership : null; },
    async issueExists(k) { return k === "housing" || k === "water"; },
    async listPosts() { return s.posts.map((p) => ({ ...p })); },
    async countPostsSince(seatKey, hash, since) {
      return s.posts.filter((p) => p.seatKey === seatKey && p.authorHash === hash && p.createdAt >= since).length;
    },
    async insertPost(v) {
      if (v.capSince && s.posts.some((p) => p.seatKey === v.seatKey && p.authorHash === v.authorHash && p.createdAt >= v.capSince)) return null;
      const row = { id: s.posts.length + 1, seatKey: v.seatKey, issueKey: v.issueKey, body: v.body, authorHash: v.authorHash, createdAt: s.clock };
      s.posts.push(row);
      s.writes++;
      return { id: row.id, issueKey: row.issueKey, body: row.body, createdAt: row.createdAt };
    },
    async countVotes(seatKey) {
      const g = new Map();
      for (const v of s.votes.values()) {
        if (v.seatKey !== seatKey) continue;
        const k = v.issueKey + "|" + v.choice;
        g.set(k, { issueKey: v.issueKey, choice: v.choice, v: (g.get(k)?.v || 0) + 1 });
      }
      return [...g.values()];
    },
    async myVotes(seatKey, hash) {
      return [...s.votes.values()].filter((v) => v.seatKey === seatKey && v.authorHash === hash)
        .map((v) => ({ issueKey: v.issueKey, choice: v.choice }));
    },
    async countVotesSince(seatKey, hash, since) {
      return [...s.votes.values()].filter((v) => v.seatKey === seatKey && v.authorHash === hash && v.updatedAt >= since).length;
    },
    async upsertVote(v) {
      if (v.capSince && [...s.votes.values()].some((x) => x.seatKey === v.seatKey && x.authorHash === v.authorHash && x.updatedAt >= v.capSince)) return false;
      s.votes.set(`${v.seatKey}|${v.issueKey}|${v.authorHash}`, { seatKey: v.seatKey, issueKey: v.issueKey, authorHash: v.authorHash, choice: v.choice, updatedAt: s.clock });
      s.writes++;
      return true;
    },
  };
  if (noCounters) { delete s.deps.countPostsSince; delete s.deps.countVotesSince; }
  return s;
}
const req = (path, body, token) => new Request(`https://politidex.fyi${path}`, {
  method: body ? "POST" : "GET",
  headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
const comment = (s, body = "Fix the bus line.", issueKey = "housing") =>
  handlePost(req("/api/district-board-voice", { seat: ALIAS, issueKey, body }, UID), s.deps);
const vote = (s, choice = "support", issueKey = "housing") =>
  handleVote(req("/api/district-board-poll", { seat: ALIAS, issueKey, choice }, UID), s.deps);
const VERIFIED = [{ seatKey: SEAT, authorHash: H, status: "verified", method: "vendor" }];
const MEMBER = { status: "active", currentPeriodEnd: new Date("2027-10-01T00:00:00Z") };

// ═════════════════════════════════════════════════════════════════════════════
section("1 · no vendor row for this seat: 403, member or not, and nothing written");
// ═════════════════════════════════════════════════════════════════════════════
const NO_ROW = {
  "no row at all": [],
  "a location_match row": [{ seatKey: SEAT, authorHash: H, status: "verified", method: "location_match" }],
  "a pending vendor row": [{ seatKey: SEAT, authorHash: H, status: "pending", method: "vendor" }],
  "a neighbour seat's vendor row": [{ seatKey: NEIGHBOUR, authorHash: authorHash(UID, NEIGHBOUR), status: "verified", method: "vendor" }],
};
for (const [label, residency] of Object.entries(NO_ROW)) {
  for (const membership of [null, MEMBER]) {
    const who = membership ? "member" : "non-member";
    const s = fakeBoard({ residency, membership });
    eq((await comment(s)).status, 403, `${label}, ${who}: comment is 403`);
    eq((await vote(s)).status, 403, `${label}, ${who}: vote is 403`);
    eq(s.writes, 0, `${label}, ${who}: …and nothing was written`);
  }
}
{
  const s = fakeBoard({ membership: MEMBER });
  const r = await handlePost(req("/api/district-board-voice", { seat: ALIAS, issueKey: "housing", body: "x" }), s.deps);
  eq(r.status, 403, "signed out: comment is 403");
  eq(s.writes, 0, "signed out: nothing written");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · verified non-member: one comment and one vote a day on this seat");
// ═════════════════════════════════════════════════════════════════════════════
{
  const s = fakeBoard({ residency: VERIFIED });
  eq((await comment(s)).status, 201, "first comment of the day writes");
  const second = await comment(s, "And another thing.");
  eq(second.status, 429, "second comment the same day is refused");
  const d = await second.json();
  eq(d.code, "daily_cap", "…coded as the daily cap");
  eq(d.error, CAP_COPY.comment, "…with the line that names the cap");
  eq(s.posts.length, 1, "…and only one comment is on file");
  eq((await comment(s, "Other issue.", "water")).status, 429, "a different issue the same day is still the cap");

  eq((await vote(s, "support")).status, 200, "first vote of the day writes");
  const changed = await vote(s, "oppose");
  eq(changed.status, 429, "a changed vote the same day is refused");
  eq((await changed.json()).error, CAP_COPY.vote, "…with the line that names the cap");
  eq([...s.votes.values()][0].choice, "support", "…and the vote on file is unchanged");
  eq((await vote(s, "oppose", "water")).status, 429, "a vote on a second issue the same day is refused");
  const same = await vote(s, "support");
  eq(same.status, 200, "re-sending the vote already on file is answered…");
  eq(s.writes, 2, "…and writes nothing (one comment, one vote, total)");

  // Counts still publish to everyone.
  const pub = await (await handleVote(req(`/api/district-board-poll?seat=${ALIAS}`), s.deps)).json();
  eq(pub.polls.find((p) => p.issueKey === "housing")?.support, 1, "counts still publish to a signed-out reader");
  eq((await (await handlePost(req(`/api/district-board-voice?seat=${ALIAS}`), s.deps)).json()).posts.length, 1,
    "reading stays free");

  // The next Mountain-time day opens again — and 23:59 the same day does not.
  s.clock = new Date("2026-10-04T05:59:00Z"); // 23:59 MDT, Oct 3
  eq((await comment(s, "Late.")).status, 429, "23:59 Mountain the same day: still capped");
  s.clock = new Date("2026-10-04T06:01:00Z"); // 00:01 MDT, Oct 4
  eq((await comment(s, "New day.")).status, 201, "00:01 Mountain the next day: the comment writes");
  eq((await vote(s, "oppose")).status, 200, "…and so does a changed vote");
  eq((await vote(s, "not_sure")).status, 429, "…once");
}
{
  const s = fakeBoard({ residency: VERIFIED, noCounters: true });
  eq((await comment(s)).status, 429, "no counter wired: the comment fails CLOSED");
  eq((await vote(s)).status, 429, "no counter wired: the vote fails CLOSED");
  eq(s.writes, 0, "…and nothing was written");
}
{
  // A race the pre-count misses is still caught by the conditional write.
  const s = fakeBoard({ residency: VERIFIED });
  s.deps.countPostsSince = async () => 0;
  s.deps.countVotesSince = async () => 0;
  await comment(s); await vote(s, "support");
  eq((await comment(s, "Racing.")).status, 429, "a comment that slips past the count is refused by the write");
  eq((await vote(s, "oppose")).status, 429, "a vote that slips past the count is refused by the write");
  eq(s.writes, 2, "…one of each on file");
}
{
  const t0 = new Date("2026-10-03T16:00:00Z");
  eq(dayStart(t0).toISOString(), "2026-10-03T06:00:00.000Z", "dayStart: Mountain midnight in summer time");
  eq(dayStart(new Date("2026-12-15T03:00:00Z")).toISOString(), "2026-12-14T07:00:00.000Z",
    "dayStart: Mountain midnight in standard time, before UTC midnight rolls back");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · verified member: no daily cap");
// ═════════════════════════════════════════════════════════════════════════════
{
  const s = fakeBoard({ residency: VERIFIED, membership: MEMBER });
  for (let i = 0; i < 5; i++) eq((await comment(s, `Post ${i}`)).status, 201, `member comment ${i + 1} writes`);
  for (const c of ["support", "oppose", "not_sure", "support"]) eq((await vote(s, c)).status, 200, `member vote → ${c} writes`);
  eq((await vote(s, "oppose", "water")).status, 200, "member votes on a second issue");
  eq(s.posts.length, 5, "five comments on file");
  eq([...s.votes.values()].find((v) => v.issueKey === "housing").choice, "support", "the last vote stands");
}
for (const [label, row] of [
  ["an inactive flag", { status: "inactive", currentPeriodEnd: null }],
  ["a period that ended a week ago", { status: "active", currentPeriodEnd: new Date("2026-09-26T00:00:00Z") }],
]) {
  const s = fakeBoard({ residency: VERIFIED, membership: row });
  await comment(s);
  eq((await comment(s, "Again.")).status, 429, `${label} is capped like a non-member`);
}
ok(isMember({ status: "active", currentPeriodEnd: null }), "active with no period end is a member");
ok(!isMember(null) && !isMember({ status: "pending" }), "no row and an unknown status are not");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the webhook: only a signed event for our price moves the flag");
// ═════════════════════════════════════════════════════════════════════════════
const WH_SECRET = "whsec_test_only";
const PRICE = "price_member_yearly";
const NOW_S = Math.floor(NOON.getTime() / 1000);
function hookStore(initial = null) {
  const s = { row: initial, writes: [] };
  s.deps = {
    now: () => NOON,
    config: () => ({ webhookSecret: WH_SECRET, priceId: PRICE }),
    findMembership: async (h) => (s.row && s.row.accountHash === h ? s.row : null),
    writeMembership: async (row) => { s.writes.push(row); s.row = { ...row }; },
  };
  return s;
}
function subEvent({ type = "customer.subscription.updated", status = "active", price = PRICE, account = ACCT, id = "sub_1", created = NOW_S } = {}) {
  return {
    id: "evt_" + Math.random().toString(36).slice(2), type, created,
    data: { object: {
      id, object: "subscription", status, metadata: account ? { account } : {},
      items: { data: [{ price: { id: price }, current_period_end: NOW_S + 365 * 86400 }] },
    } },
  };
}
function hook(event, { sign = true, secret = WH_SECRET, ts = NOW_S, header } = {}) {
  const raw = JSON.stringify(event);
  const h = {};
  if (header !== undefined) h["stripe-signature"] = header;
  else if (sign) h["stripe-signature"] = `t=${ts},v1=${stripeSign(secret, ts, raw)}`;
  return new Request("https://politidex.fyi/api/membership-webhook", { method: "POST", headers: h, body: raw });
}
{
  const s = hookStore();
  eq((await handleWebhook(hook(subEvent(), { sign: false }), s.deps)).status, 400, "unsigned: refused");
  eq((await handleWebhook(hook(subEvent(), { secret: "whsec_wrong" }), s.deps)).status, 400, "signed with the wrong secret: refused");
  eq((await handleWebhook(hook(subEvent(), { header: "t=1,v1=zz" }), s.deps)).status, 400, "garbage signature: refused");
  eq((await handleWebhook(hook(subEvent(), { ts: NOW_S - 3600 }), s.deps)).status, 400, "an hour-old signature: refused");
  const tampered = hook(subEvent());
  const body = (await tampered.text()).replace(PRICE, "price_other");
  const hdr = tampered.headers.get("stripe-signature");
  eq((await handleWebhook(new Request(tampered.url, { method: "POST", headers: { "stripe-signature": hdr }, body }), s.deps)).status, 400,
    "a body changed after signing: refused");
  eq(s.writes.length, 0, "…none of those wrote anything");

  const off = hookStore();
  off.deps.config = () => ({ webhookSecret: "", priceId: PRICE });
  eq((await handleWebhook(hook(subEvent()), off.deps)).status, 401, "no webhook secret in env: refused");
  eq(off.writes.length, 0, "…and nothing written");
}
for (const [label, ev] of [
  ["wrong price", subEvent({ price: "price_something_else" })],
  ["a second, foreign price on the subscription", (() => { const e = subEvent(); e.data.object.items.data.push({ price: { id: "price_x" } }); return e; })()],
  ["pending (incomplete)", subEvent({ status: "incomplete" })],
  ["past_due", subEvent({ status: "past_due" })],
  ["no account metadata", subEvent({ account: "" })],
  ["a raw uid in place of the account hash", subEvent({ account: UID })],
  ["checkout.session.completed", { type: "checkout.session.completed", created: NOW_S, data: { object: { id: "cs_1", payment_status: "paid", client_reference_id: ACCT } } }],
  ["invoice.paid", { type: "invoice.paid", created: NOW_S, data: { object: { id: "in_1" } } }],
]) {
  const s = hookStore();
  const r = await handleWebhook(hook(ev), s.deps);
  eq(r.status, 200, `${label}: acknowledged`);
  eq((await r.json()).written, false, `${label}: …written false`);
  eq(s.writes.length, 0, `${label}: …and nothing written`);
}
{
  const s = hookStore();
  const r = await (await handleWebhook(hook(subEvent({ type: "customer.subscription.created" })), s.deps)).json();
  eq(r.written, true, "signed, our price, active: the flag is set");
  eq(s.row.status, "active", "…active");
  eq(s.row.accountHash, ACCT, "…on the account hash");
  ok(!JSON.stringify(s.row).includes(UID), "…and the uid is nowhere in the row");
  ok(isMember(s.row, NOON), "…which the gate reads as a member");

  await handleWebhook(hook(subEvent({ type: "customer.subscription.deleted", status: "canceled", id: "sub_old", created: NOW_S + 10 })), s.deps);
  eq(s.row.status, "active", "a cancel for a DIFFERENT subscription does not clear the flag");
  await handleWebhook(hook(subEvent({ type: "customer.subscription.updated", status: "canceled", created: NOW_S - 100 })), s.deps);
  eq(s.row.status, "active", "an older event arriving late does not clear it");
  await handleWebhook(hook(subEvent({ type: "customer.subscription.deleted", status: "canceled", created: NOW_S + 20 })), s.deps);
  eq(s.row.status, "inactive", "a signed cancel for the current subscription clears it");
  ok(!isMember(s.row, NOON), "…and the gate caps again");
}
{
  const s = hookStore();
  await handleWebhook(hook(subEvent({ type: "customer.subscription.deleted", status: "canceled" })), s.deps);
  eq(s.writes.length, 0, "clearing an account that was never a member writes nothing");
}
eq(decide(subEvent({ status: "trialing" }), PRICE).write, false, "trialing is pending: no write");
{
  const wh = R("netlify/functions/membership-webhook.mts").replace(/\/\/.*$/gm, "");
  ok(!/voiceResidency|voice_residency/.test(wh), "the membership webhook cannot reach residency");
  const core = R("netlify/lib/membership-core.mjs");
  ok(!/writeVerified|voiceResidency|voice_residency"/.test(core.replace(/\/\/.*$/gm, "")), "the membership core writes no residency");
  // The only writer of voice_membership.
  const fnDir = join(ROOT, "netlify/functions");
  const writers = readdirSync(fnDir).filter((f) => /insert\(voiceMembership\)|update\(voiceMembership\)/.test(R("netlify/functions/" + f)));
  eq(writers.join(","), "membership-webhook.mts", "only the webhook writes the membership flag");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · checkout: signed in, returns to /me, writes nothing");
// ═════════════════════════════════════════════════════════════════════════════
function checkoutDeps({ cfg = { secretKey: "sk_test_x", priceId: PRICE }, membership = null } = {}) {
  const s = { calls: [] };
  s.deps = {
    verifyUser: async (r) => {
      const a = r.headers.get("authorization") || "";
      return a.startsWith("Bearer ") ? { uid: a.slice(7), isAnonymous: a.slice(7) === "anon" } : null;
    },
    config: () => cfg,
    findMembership: async () => membership,
    createCheckout: async (params) => { s.calls.push(params); return { ok: true, data: { url: "https://checkout.stripe.com/c/pay/cs_test" } }; },
    origin: () => "https://politidex.fyi",
  };
  return s;
}
const mReq = (method, token) => new Request("https://politidex.fyi/api/membership", {
  method, headers: token ? { authorization: "Bearer " + token } : {},
});
{
  const s = checkoutDeps();
  eq((await handleMembership(mReq("POST"), s.deps)).status, 403, "signed out: no checkout");
  eq((await handleMembership(mReq("POST", "anon"), s.deps)).status, 403, "anonymous: no checkout");
  eq(s.calls.length, 0, "…and Stripe was never called");
  const r = await handleMembership(mReq("POST", UID), s.deps);
  eq(r.status, 200, "signed in: checkout starts");
  eq((await r.json()).url, "https://checkout.stripe.com/c/pay/cs_test", "…and returns only the Checkout URL");
  const p = s.calls[0];
  eq(p.mode, "subscription", "…a subscription");
  eq(p["line_items[0][price]"], PRICE, "…for STRIPE_PRICE_ID");
  ok(p.success_url.startsWith("https://politidex.fyi/me?"), "…returning to /me");
  ok(p.cancel_url.startsWith("https://politidex.fyi/me?"), "…cancel returns to /me too");
  eq(p["subscription_data[metadata][account]"], ACCT, "…carrying the account hash");
  ok(!JSON.stringify(p).includes(UID), "…and never the uid");
  ok(!("writeMembership" in s.deps), "starting checkout has no write to make");

  const off = checkoutDeps({ cfg: { secretKey: "", priceId: "" } });
  eq((await handleMembership(mReq("POST", UID), off.deps)).status, 503, "no Stripe env: 503");
  const already = checkoutDeps({ membership: MEMBER });
  eq((await (await handleMembership(mReq("POST", UID), already.deps)).json()).member, true, "a member is not sent to checkout twice");
  eq(already.calls.length, 0, "…no new session");

  const g = await (await handleMembership(mReq("GET", UID), already.deps)).json();
  eq(JSON.stringify(Object.keys(g).sort()), JSON.stringify(["member", "signedIn"]), "GET /api/membership: the caller's own flag and nothing else");
}
{
  const fn = R("netlify/functions/membership.mts") + R("netlify/functions/membership-webhook.mts");
  for (const k of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID"]) {
    ok(fn.includes(`process.env.${k}`), `${k} is read from env`);
  }
  const client = R("me-membership.js") + R("me.html");
  ok(!/sk_(live|test)_|whsec_|STRIPE_/.test(client), "no Stripe secret or env name reaches the browser");
  ok(!/STRIPE_SECRET_KEY\s*=|STRIPE_WEBHOOK_SECRET\s*=|STRIPE_PRICE_ID\s*=/.test(R("netlify.toml")), "netlify.toml sets no Stripe value");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the public wire: no flag, no account id, no pay button on a board");
// ═════════════════════════════════════════════════════════════════════════════
{
  const nonMember = fakeBoard({ residency: VERIFIED });
  const member = fakeBoard({ residency: VERIFIED, membership: MEMBER });
  for (const s of [nonMember, member]) await comment(s);
  const shape = async (s) => {
    const a = await (await handlePost(req(`/api/district-board-voice?seat=${ALIAS}`, null, UID), s.deps)).text();
    const b = await (await handleVote(req(`/api/district-board-poll?seat=${ALIAS}`, null, UID), s.deps)).text();
    return a + b;
  };
  const nm = await shape(nonMember);
  const m = await shape(member);
  eq(m.replace(/"createdAt":"[^"]*"/g, ""), nm.replace(/"createdAt":"[^"]*"/g, ""),
    "a member and a non-member read byte-identical board JSON");
  for (const [label, text] of [["member", m], ["non-member", nm]]) {
    ok(!text.includes(ACCT), `${label}: no account hash on the board wire`);
    ok(!text.includes(UID), `${label}: no uid on the board wire`);
    ok(!/"member"|membership|subscription/i.test(text), `${label}: no membership flag on the board wire`);
  }
  ok(!/voiceMembership|voice_membership/.test(R("netlify/functions/district-board.mts")), "the public counts endpoint never reads membership");
  const boards = readdirSync(ROOT).filter((f) => /^district-.*\.(html|js)$/.test(f));
  const payOnBoard = boards.filter((f) => /\/api\/membership|checkout\.stripe|\$20|become a member/i.test(R(f)));
  eq(payOnBoard.length, 0, `no board grows a pay button — ${JSON.stringify(payOnBoard)}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the copy: /me says it plainly, and nobody is selling equity");
// ═════════════════════════════════════════════════════════════════════════════
const ME = R("me.html");
const block = (ME.match(/<!-- pdx:me-membership:begin[\s\S]*?<!-- pdx:me-membership:end -->/) || [""])[0];
ok(block.length > 0, "/me carries the membership block");
const text = block.replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
ok(/reading stays free for everyone/i.test(text), "/me: reading is free");
ok(/a verified resident gets one comment and one poll vote a day on that seat/i.test(text), "/me: one comment and one poll vote a day on that seat");
ok(/\$20 a year removes the cap/i.test(text), "/me: $20 a year removes the cap");
ok(/does not verify residency and does not open a seat/i.test(text), "/me: membership is not residency");
ok(/a voice that counts is only a verified resident of that seat/i.test(text), "/me: only a verified resident of that seat has a voice that counts");
ok(/someone outside the district can read and cannot post/i.test(text), "/me: outside the district reads and cannot post");
eq((block.match(/<button\b/gi) || []).length, 0, "/me: the static block carries no second button");
ok(ME.includes('<script defer src="/me-membership.js"></script>'), "/me loads its one control");
const CLIENT = R("me-membership.js");
const copy = [text, CLIENT, R("netlify/lib/membership-core.mjs"), JSON.stringify(CAP_COPY)].join("\n");
for (const w of ["stock", "stocks", "unit", "units", "share", "shares", "shareholder", "earn", "earns", "earnings",
  "profit", "profits", "dividend", "equity", "investor", "investors", "invest", "investment", "returns on", "Form C", "Reg CF", "crowdfund"]) {
  ok(!new RegExp(`\\b${w.replace(/ /g, "\\s+")}\\b`, "i").test(copy), `no "${w}" on the membership block, its script or its core`);
}
for (const line of Object.values(CAP_COPY)) {
  ok(/one (comment|poll vote) a day on this seat/.test(line), "the cap line names the cap");
  ok(!/\$|member|upgrade|pay|unlock|premium|subscribe/i.test(line), `the cap line is not a paywall slogan: ${line}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the store and the shell");
// ═════════════════════════════════════════════════════════════════════════════
const MIG = "netlify/database/migrations/20261110000000_create_voice_membership";
ok(existsSync(join(ROOT, MIG, "migration.sql")) && existsSync(join(ROOT, MIG, "snapshot.json")), "the migration and its snapshot are on disk");
const sqlText = R(MIG + "/migration.sql");
ok(/CREATE TABLE IF NOT EXISTS "voice_membership"/.test(sqlText), "it creates voice_membership, guarded");
ok(!/ALTER TABLE|DROP |"voice_residency"\s*\(/.test(sqlText), "…and alters nothing else");
ok(!/"(uid|user_id|email|customer_id|seat_key)"/.test(sqlText), "…with no uid, email, customer id or seat column");
const SW = R("sw.js");
const v = Number((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]);
ok(v >= 278, `the service worker moved (v${v})`);
ok(/MEMBERSHIP LIFTS THE DAILY CAP[\s\S]*?MIGRATION COST: one new table/.test(SW), "the SW log names the migration");

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
