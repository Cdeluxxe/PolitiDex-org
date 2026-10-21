#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-district-boards-federal-voice.mjs — the gate on every U.S. House and
// U.S. Senate board outside Utah
// ─────────────────────────────────────────────────────────────────────────────
// The 436 boards outside Utah take a comment, a poll vote and a Didit residency
// check through the SAME handlers every Utah board uses. This suite drives those
// real handlers (district-board-voice-core, district-board-poll-core,
// residency-vendor-core) over an in-memory fake, the way
// scripts/test-district-board-composer.mjs and scripts/test-residency-vendor.mjs
// do, and asserts what was written.
//
// WHAT THIS SUITE PROVES:
//   1. Every federal seat is a composer seat on the server, and a signed-out, an
//      anonymous, an unverified, a location_match and a pending caller is 403 on
//      a POST and on a vote there — and nothing is written.
//   2. A vendor-verified row for ONE seat opens that seat's composer and poll
//      and no other: not the next district, not the other Senate seat's board
//      under another state, not a Utah board.
//   3. The residency check binds only seats in the board's own state, whatever
//      the browser sends, and the webhook writes only those.
//   4. Without the vendor configured, the start is 503 and writes nothing.
//   5. The counts endpoint returns counts and never a person row.
//   6. The five Layton-cluster composer boards' rows, documents and gate are as
//      they were.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { planBoards } from "./gen-district-boards.mjs";
import { COMPOSER_SEATS, LOCKED_LINE, handle as voiceHandle, seatHash } from "../netlify/lib/district-board-voice-core.mjs";
import { handle as pollHandle } from "../netlify/lib/district-board-poll-core.mjs";
import { coveredSeats, handleStart, handleWebhook, parseVendorData, sign, vendorData } from "../netlify/lib/residency-vendor-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);
function report() {
  if (failures.length) {
    console.log(`\n   ${passed} passed, ${failures.length} failed\n`);
    for (const f of failures.slice(0, 60)) console.log(`   ✗ ${f}`);
    process.exit(1);
  }
  console.log(`\n   ✓ federal board voice: all ${passed} assertions passed`);
}

const FED = planBoards().boards.filter((b) => b.federal);
const HOUSE = FED.filter((b) => b.usHouse);
const SENATE = FED.filter((b) => b.statewide);

// ── THE FAKE ────────────────────────────────────────────────────────────────
function fakeStore(rows) {
  const s = { residency: rows.slice(), takes: [], votes: [], likes: [], written: [] };
  s.deps = {
    async verifyUser(req) {
      const h = req.headers.get("authorization") || "";
      if (!h.startsWith("Bearer ")) return null;
      const t = h.slice(7);
      if (t === "anon") return { uid: "anon-uid", isAnonymous: true };
      return { uid: t, isAnonymous: false };
    },
    async findResidency(seatKey, hash) {
      return s.residency.find((r) => r.seatKey === seatKey && r.authorHash === hash) || null;
    },
    async findVendorVerified(pairs) {
      return s.residency.filter((r) => pairs.some((p) => p.seatKey === r.seatKey && p.authorHash === r.authorHash));
    },
    async issueExists(k) { return k === "housing" || k === "water"; },
    async findMembership() { return { status: "active", currentPeriodEnd: null }; },
    async listPosts() { return s.takes.slice(); },
    async listGeneral() { return []; },
    async insertPost(v) {
      s.takes.push(v);
      return { id: s.takes.length, issueKey: v.issueKey, body: v.body, createdAt: "2026-10-21T00:00:00Z" };
    },
    async countVotes(seatKey) {
      const m = new Map();
      for (const v of s.votes.filter((x) => x.seatKey === seatKey)) {
        const k = `${v.issueKey}|${v.choice}`;
        m.set(k, { issueKey: v.issueKey, choice: v.choice, v: (m.get(k)?.v || 0) + 1 });
      }
      return [...m.values()];
    },
    async myVotes(seatKey, hash) { return s.votes.filter((v) => v.seatKey === seatKey && v.authorHash === hash); },
    async upsertVote(v) {
      s.votes = s.votes.filter((x) => !(x.seatKey === v.seatKey && x.authorHash === v.authorHash && x.issueKey === v.issueKey));
      s.votes.push({ seatKey: v.seatKey, issueKey: v.issueKey, authorHash: v.authorHash, choice: v.choice });
      return true;
    },
    async writeVerified(seatKey, hash) {
      s.written.push(seatKey);
      s.residency.push({ seatKey, authorHash: hash, status: "verified", method: "vendor" });
    },
  };
  return s;
}
const hdr = (token) => ({ "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) });
const postTo = (url, body, token) => new Request(url, { method: "POST", headers: hdr(token), body: JSON.stringify(body) });
const comment = (seat, token) => postTo("https://politidex.fyi/api/district-board-voice",
  { seat, issueKey: "housing", body: "A short take on housing." }, token);
const vote = (seat, token) => postTo("https://politidex.fyi/api/district-board-poll",
  { seat, issueKey: "housing", choice: "support" }, token);
const vendorRow = (uid, seatKey, extra) => ({ seatKey, authorHash: seatHash(uid, seatKey), status: "verified", method: "vendor", ...extra });

// ═════════════════════════════════════════════════════════════════════════════
section("1 · every federal seat is gated, and a refusal writes nothing");
// ═════════════════════════════════════════════════════════════════════════════
ok(FED.length > 400, "the plan still opens the boards outside Utah");
for (const b of FED) eq(COMPOSER_SEATS[b.seat], b.alias, `${b.seat}: a composer seat on the server`);
{
  const UID = "uid-ref";
  const cases = [
    ["signed out", [], null],
    ["anonymous", [], "anon"],
    ["no residency row", [], UID],
  ];
  // Every federal seat, every way of being refused.
  for (const b of FED) {
    const seatCases = cases.concat([
      ["a location_match row", [vendorRow(UID, b.seat, { method: "location_match" })], UID],
      ["a pending vendor row", [vendorRow(UID, b.seat, { status: "pending" })], UID],
      ["a revoked vendor row", [vendorRow(UID, b.seat, { status: "revoked" })], UID],
    ]);
    for (const [why, rows, token] of seatCases) {
      const s = fakeStore(rows);
      const r1 = await voiceHandle(comment(b.alias, token), s.deps);
      const r2 = await pollHandle(vote(b.alias, token), s.deps);
      eq(r1.status, 403, `${b.alias} · ${why}: comment is 403`);
      eq(r2.status, 403, `${b.alias} · ${why}: vote is 403`);
      eq(s.takes.length + s.votes.length, 0, `${b.alias} · ${why}: nothing written`);
      if (why === "no residency row") eq((await r1.json()).error, LOCKED_LINE, `${b.alias}: the refusal is the locked line`);
    }
  }
  // A typed zip, a saved location or a claimed residency in the body is not read.
  const s = fakeStore([]);
  const forged = postTo("https://politidex.fyi/api/district-board-voice",
    { seat: "mo-cd-5", issueKey: "housing", body: "x", zip: "64106", state: "MO", district: "5", verified: true, residency: "verified" }, UID);
  eq((await voiceHandle(forged, s.deps)).status, 403, "a body that claims residency is still 403");
  eq(s.takes.length, 0, "…and writes nothing");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a verified flag opens its own seat and no other");
// ═════════════════════════════════════════════════════════════════════════════
{
  const UID = "uid-mo5";
  const s = fakeStore([vendorRow(UID, "mo-house-5")]);
  eq((await voiceHandle(comment("mo-cd-5", UID), s.deps)).status, 201, "MO-5 verified: the comment lands");
  eq((await pollHandle(vote("mo-cd-5", UID), s.deps)).status, 200, "MO-5 verified: the vote lands");
  eq(s.takes.length, 1, "one take written");
  eq(s.takes[0].seatKey, "mo-house-5", "…on MO-5");
  eq(s.votes.length, 1, "one vote written");
  eq(s.votes[0].seatKey, "mo-house-5", "…on MO-5");
  ok(!("uid" in s.takes[0]) && s.takes[0].authorHash === seatHash(UID, "mo-house-5"), "the take carries the seat hash, not the uid");
  // Every OTHER federal seat, and a Utah one, stays shut for the same account.
  const others = FED.filter((b) => b.seat !== "mo-house-5").map((b) => b.alias).concat(["ut-cd-2", "ut-hd-16", "ut-us-senate-lee"]);
  for (const alias of others) {
    const before = s.takes.length + s.votes.length;
    eq((await voiceHandle(comment(alias, UID), s.deps)).status, 403, `MO-5's flag does not open ${alias}'s composer`);
    eq((await pollHandle(vote(alias, UID), s.deps)).status, 403, `MO-5's flag does not open ${alias}'s poll`);
    eq(s.takes.length + s.votes.length, before, `${alias}: nothing written`);
  }
  // A row for one seat, presented under another seat's hash, is still that seat's.
  const swapped = fakeStore([{ seatKey: "mo-house-4", authorHash: seatHash(UID, "mo-house-5"), status: "verified", method: "vendor" }]);
  eq((await voiceHandle(comment("mo-cd-4", UID), swapped.deps)).status, 403, "a row filed under MO-4 with MO-5's hash opens nothing");
  // The neighbouring Senate seat in the same state is its own seat.
  const sen = SENATE.filter((b) => b.seat.startsWith("mo-"));
  eq(sen.length, 2, "Missouri has two Senate boards");
  const s2 = fakeStore([vendorRow(UID, sen[0].seat)]);
  eq((await voiceHandle(comment(sen[0].alias, UID), s2.deps)).status, 201, `${sen[0].alias}: its own flag opens it`);
  eq((await voiceHandle(comment(sen[1].alias, UID), s2.deps)).status, 403, `${sen[1].alias}: the other Senate seat's flag does not`);
  eq((await pollHandle(vote(sen[1].alias, UID), s2.deps)).status, 403, `${sen[1].alias}: …nor its poll`);
  // The GET says the same thing the POST does.
  const g = await voiceHandle(new Request("https://politidex.fyi/api/district-board-voice?seat=mo-cd-4",
    { headers: hdr(UID) }), s.deps);
  const gj = await g.json();
  eq(gj.voice && gj.voice.canPost, false, "MO-4's GET: canPost is false for MO-5's resident");
  ok(!/"uid"|uid-mo5|authorHash/.test(JSON.stringify(gj)), "MO-4's GET carries no uid and no author hash");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · one check binds only the board's own state");
// ═════════════════════════════════════════════════════════════════════════════
{
  const mo = SENATE.filter((b) => b.seat.startsWith("mo-")).map((b) => b.seat).sort();
  const got = coveredSeats("mo-cd-5", ["mo-house-5", "tx-house-2", "ut-house-2", "ut-statehouse-16", "ca-us-senate-padilla", "mo-house-1"]);
  eq(got[0], "mo-house-5", "the board's own seat is first");
  ok(got.every((k) => k.startsWith("mo-")), `no seat outside Missouri is bound — got ${JSON.stringify(got)}`);
  ok(mo.every((k) => got.includes(k)), "both Missouri Senate seats ride the check");
  ok(!got.some((k) => /gov/.test(k)), "no governor seat outside Utah");
  // The webhook re-filters what comes back, so a forged vendor_data cannot widen it.
  const forged = JSON.stringify({ uid: "u1", seat: "mo-house-5", seats: ["mo-house-5", "tx-house-2", "ut-house-2", "nope"] });
  const parsed = parseVendorData(forged);
  eq(JSON.stringify(parsed.seats), JSON.stringify(["mo-house-5"]), "parseVendorData drops every seat in another state");
  // Utah is unchanged: a Utah check still binds Utah districts and the three statewide seats.
  const ut = coveredSeats("ut-hd-16", ["ut-statesenate-7", "ut-house-2", "mo-house-5"]);
  eq(ut.slice(0, 3).join(","), "ut-statehouse-16,ut-statesenate-7,ut-house-2", "Utah: the board's seat, then the resolved ones");
  ok(["ut-gov", "ut-us-senate-curtis", "ut-us-senate-lee"].every((k) => ut.includes(k)), "Utah: the three statewide seats ride along");
  ok(!ut.includes("mo-house-5"), "Utah: a Missouri seat is never bound");

  // The real webhook, signed, writes exactly the covered Missouri seats.
  const SECRET = "test-secret";
  const s = fakeStore([]);
  const body = JSON.stringify({
    webhook_type: "status.updated", status: "Approved",
    vendor_data: vendorData("u-web", "mo-house-5", ["tx-house-2", "ut-statehouse-16"]),
    decision: { status: "Approved", id_verifications: [{ status: "Approved" }], poa_verifications: [{ status: "Approved" }] },
  });
  const now = new Date("2026-10-21T12:00:00Z");
  const ts = String(Math.floor(now.getTime() / 1000));
  const req = new Request("https://politidex.fyi/api/residency-webhook", {
    method: "POST", headers: { "content-type": "application/json", "x-timestamp": ts, "x-signature": sign(SECRET, body) }, body,
  });
  const res = await handleWebhook(req, { ...s.deps, config: async () => ({ webhookSecret: SECRET }), now: () => now });
  eq(res.status, 200, "the signed webhook is accepted");
  eq(s.written.slice().sort().join(","), ["mo-house-5"].concat(mo).sort().join(","),
    "the webhook writes MO-5 and both Missouri Senate seats, and nothing in Texas or Utah");
  // An unsigned one writes nothing.
  const t = fakeStore([]);
  const bad = new Request("https://politidex.fyi/api/residency-webhook", { method: "POST", headers: { "x-timestamp": ts }, body });
  eq((await handleWebhook(bad, { ...t.deps, config: async () => ({ webhookSecret: SECRET }), now: () => now })).status, 401, "unsigned: 401");
  eq(t.written.length, 0, "…and nothing written");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · no vendor configured: the start is 503 and the box stays locked");
// ═════════════════════════════════════════════════════════════════════════════
for (const b of [HOUSE[0], SENATE[0], FED.filter((x) => x.alias === "mo-cd-5")[0]]) {
  const s = fakeStore([]);
  let created = 0;
  const deps = { ...s.deps, config: async () => ({ apiKey: "", workflowId: "" }),
    createSession: async () => { created++; return { ok: true, data: { url: "https://example.com" } }; },
    callbackUrl: (req, alias) => `https://politidex.fyi/district/${alias}?residency=returned` };
  const r = await handleStart(postTo("https://politidex.fyi/api/residency-verify", { seat: b.alias }, "u-start"), deps);
  eq(r.status, 503, `${b.alias}: no vendor configured is 503`);
  eq(created + s.written.length, 0, `${b.alias}: no session, no row`);
  eq((await voiceHandle(comment(b.alias, "u-start"), s.deps)).status, 403, `${b.alias}: the composer stays shut`);
  // Configured, the start names this board's own seat and returns to its own address.
  let sent = null;
  const deps2 = { ...deps, config: async () => ({ apiKey: "k", workflowId: "w" }),
    createSession: async (url, h, bodyStr) => { sent = JSON.parse(bodyStr); return { ok: true, data: { url: "https://verify.example/s" } }; } };
  const r2 = await handleStart(postTo("https://politidex.fyi/api/residency-verify", { seat: b.alias }, "u-start"), deps2);
  eq(r2.status, 200, `${b.alias}: a configured start returns the session`);
  eq(JSON.parse(sent.vendor_data).seat, b.seat, `${b.alias}: the session's seat is this board's`);
  eq(sent.callback, `https://politidex.fyi/district/${b.alias}?residency=returned`, `${b.alias}: the callback is this board`);
  eq(s.written.length, 0, `${b.alias}: starting a check writes nothing`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the counts endpoint never returns a person row");
// ═════════════════════════════════════════════════════════════════════════════
{
  const FN = R("netlify/functions/district-board.mts");
  const selects = [...FN.matchAll(/\.select\(\{([^}]*)\}\)/g)].map((m) => m[1].trim());
  ok(selects.length >= 8, "the Function's queries could be read");
  for (const sel of selects) {
    const fields = sel.split(",").map((f) => f.trim()).filter(Boolean);
    for (const f of fields) {
      ok(/^v: count(?:Distinct)?\(/.test(f) || /^issueKey: [a-zA-Z]+\.issueKey$/.test(f) || /^h: [a-zA-Z]+\.authorHash$/.test(f),
        `district-board.mts selects only counts and issue keys — "${f}"`);
    }
  }
  // An author hash appears only inside the union that countDistinct() reads.
  ok(/countDistinct\(voicePeople\.h\)/.test(FN), "the author-hash union is only ever counted");
  const resp = (/return json\(\{\s*seat,([\s\S]*?)\n    \}\);/.exec(FN) || [])[1] || "";
  ok(resp.length > 0, "the response literal could be read");
  ok(!/\b(?:uid|userId|authorHash|email|name|address|pid)\b/.test(resp), "the response names no person field");
  eq([...resp.matchAll(/^\s{6}([a-z]+)\b/gm)].map((m) => m[1]).join(","), "counts,stores,rooms", "the response is seat, counts, stores and rooms");
  for (const b of FED) ok(new RegExp(`"${b.seat}": 1,`).test(FN), `${b.seat}: the counts endpoint answers it`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the five Layton-cluster composer boards are as they were");
// ═════════════════════════════════════════════════════════════════════════════
{
  const CLUSTER = { "ut-sd-3": "ut-statesenate-3", "ut-hd-16": "ut-statehouse-16", "ut-sd-7": "ut-statesenate-7",
    "ut-hd-15": "ut-statehouse-15", "ut-cd-2": "ut-house-2" };
  const keys = Object.keys(COMPOSER_SEATS);
  eq(keys.slice(0, 6).join(","), "ut-statesenate-3,ut-statehouse-16,ut-statesenate-7,ut-statehouse-15,ut-house-2,ut-statesenate-6",
    "COMPOSER_SEATS still opens with the hand rows, in order");
  // The five documents' bytes, pinned before any board outside Utah took a voice.
  const DIGEST = {
    "ut-sd-3": "3dbc896c67a0d23b1b5fc9aba834623982aba9978f72f201c5abbdad45a275a4",
    "ut-hd-16": "718ec1fa246c12577490ad0c69638283e4b6818bae5bb354155b2b1c5c6a7cb8",
    "ut-sd-7": "2b66dd11b3ac00c97a307c4cbc5c63f28b63f1a676b91175230bb22eed6b2788",
    "ut-hd-15": "d0d9eaea4aa011ba8d4dd6484544d0d2ac5066bb82883bd4bf27d8347e5b5c15",
    "ut-cd-2": "7e506b096ad50c72716b8f4efdd630a6d6ce4e49dc67704f37a9d344e7459e15",
  };
  for (const [alias, seat] of Object.entries(CLUSTER)) {
    eq(COMPOSER_SEATS[seat], alias, `${alias}: still a composer seat`);
    const d = createHash("sha256").update(R(`district-${alias}.html`)).digest("hex");
    eq(d, DIGEST[alias], `district-${alias}.html is byte-identical`);
    const UID = `uid-${alias}`;
    const s = fakeStore([vendorRow(UID, seat)]);
    eq((await voiceHandle(comment(alias, UID), s.deps)).status, 201, `${alias}: its verified resident still posts`);
    eq((await pollHandle(vote(alias, UID), s.deps)).status, 200, `${alias}: …and votes`);
    const n = fakeStore([]);
    eq((await voiceHandle(comment(alias, UID), n.deps)).status, 403, `${alias}: an unverified caller is still 403`);
    eq(n.takes.length, 0, `${alias}: …and writes nothing`);
  }
}

report();
