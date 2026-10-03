#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for the residency vendor — VERIFF ON THE FIVE COMPOSER SEATS, FAIL CLOSED
// ─────────────────────────────────────────────────────────────────────────────
//   1. NO VENDOR SECRET IN GIT, and none reaches the browser.
//   2. THE WEBHOOK — unsigned / badly signed / pending / declined / no address
//      check / wrong seat / revoked all write nothing; only a signed, approved
//      document + address decision writes, and only for the seat it named.
//   3. THE START — only the five seats accept it; signed out is refused; no
//      secrets is 503; vendor down is 502; the session carries { uid, seat }.
//   4. THE GATES — after a fixture verified row (an insert into this test's
//      own in-memory store, not an env backdoor), that seat's comment and vote
//      POSTs succeed and a neighbour seat's are still 403. Also end to end: a
//      signed UT-2 decision opens UT-2 and not SD-3.
//   5. THE COUNTS ENDPOINT still never returns a person.
//   6. No backdoor, the hub cannot downgrade a vendor row, and the SW moved.
//
//   node scripts/test-residency-vendor.mjs
//
// No database, no network. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  handleStart,
  handleWebhook,
  sign,
  parseVendorData,
  decisionPassed,
} from "../netlify/lib/residency-vendor-core.mjs";
import { COMPOSER_SEATS, handle as handleVoice } from "../netlify/lib/district-board-voice-core.mjs";
import { handle as handlePoll } from "../netlify/lib/district-board-poll-core.mjs";
import { authorHash } from "../netlify/lib/district-voice-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let pass = 0;
let fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; } else { fail++; console.error("  ✗ " + msg); }
}
function eq(a, b, msg) { ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`); }
function section(t) { console.log("── " + t); }

// Test-only values. Not secrets: they exist only inside this file.
const KEY = "test-api-key-not-a-secret";
const SECRET = "test-shared-secret-not-a-secret";
const UID = "uid-alice-0000000000000000000";
const CLUSTER = {
  "ut-sd-3": "ut-statesenate-3",
  "ut-hd-16": "ut-statehouse-16",
  "ut-sd-7": "ut-statesenate-7",
  "ut-hd-15": "ut-statehouse-15",
  "ut-cd-2": "ut-house-2",
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · no vendor secret in git, and none reaches the browser");
// ═════════════════════════════════════════════════════════════════════════════
let tracked = [];
try {
  tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 })
    .split("\n").filter(Boolean);
} catch { tracked = []; }
ok(tracked.length > 100, `git ls-files lists the repo (${tracked.length})`);
const TEXT = /\.(m?js|mts|ts|json|toml|html|md|env|txt|ya?ml|sql|sh|cjs)$|(^|\/)\.env/;
const liveSecrets = [process.env.VERIFF_API_KEY, process.env.VERIFF_SHARED_SECRET]
  .filter((v) => typeof v === "string" && v.length >= 8);
const hits = [];
for (const f of tracked) {
  if (!TEXT.test(f) || f === "scripts/test-residency-vendor.mjs") continue;
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  const s = readFileSync(p, "utf8");
  // An assignment of a literal value to a vendor secret name.
  if (/VERIFF_(API_KEY|SHARED_SECRET)\s*[:=]\s*["']?[A-Za-z0-9-]{8,}/.test(s)) hits.push(f);
  // A Veriff-style key/secret shape (UUID) next to a Veriff header name.
  if (/x-auth-client["']?\s*[:,]\s*["'][0-9a-f]{8}-[0-9a-f]{4}-/i.test(s)) hits.push(f);
  for (const v of liveSecrets) if (s.includes(v)) hits.push(f);
}
eq(hits.length, 0, `no tracked file carries a vendor secret — ${JSON.stringify(hits)}`);
ok(!tracked.some((f) => /(^|\/)\.env(\.|$)/.test(f)), "no .env file is tracked");
for (const f of ["district-composer.js", "district-poll.js", "district-ut-sd-3.html", "district-ut-cd-2.html"]) {
  ok(!/VERIFF_|x-auth-client|x-hmac-signature|shared.?secret/i.test(R(f)), `${f}: no vendor key, secret or signing in the browser`);
}
for (const f of ["netlify/functions/residency-verify.mts", "netlify/functions/residency-webhook.mts"]) {
  const s = R(f);
  const envs = [...s.matchAll(/process\.env\.([A-Z_]+)/g)].map((m) => m[1]).sort();
  ok(envs.every((n) => ["URL", "VERIFF_API_KEY", "VERIFF_API_URL", "VERIFF_SHARED_SECRET"].includes(n)),
     `${f}: reads only the Veriff secrets and the site URL from env — ${envs.join(",")}`);
  ok(!/console\.(log|error)\([^)]*(raw|payload|body)\b/.test(s), `${f}: never logs a vendor payload`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the webhook: only a signed, approved document + address decision writes");
// ═════════════════════════════════════════════════════════════════════════════
function residencyStore(rows = []) {
  const s = { rows: rows.map((r) => ({ ...r })), writes: [] };
  s.find = async (seatKey, hash) => s.rows.find((r) => r.seatKey === seatKey && r.authorHash === hash) || null;
  s.writeVerified = async (seatKey, hash) => {
    s.writes.push({ seatKey, hash });
    const r = s.rows.find((x) => x.seatKey === seatKey && x.authorHash === hash);
    if (r) { if (r.status !== "revoked") { r.status = "verified"; r.method = "vendor"; } }
    else s.rows.push({ seatKey, authorHash: hash, status: "verified", method: "vendor" });
  };
  return s;
}
function hookDeps(store, cfg = { apiKey: KEY, sharedSecret: SECRET }) {
  return { config: () => cfg, findResidency: store.find, writeVerified: store.writeVerified };
}
function decision(over = {}, seat = "ut-statesenate-3", uid = UID) {
  return {
    status: "success",
    verification: {
      id: "sess-1",
      status: "approved",
      code: 9001,
      vendorData: JSON.stringify({ uid, seat }),
      person: { firstName: "ALICE", addresses: [{ fullAddress: "1 Main St" }] },
      document: { type: "DRIVERS_LICENSE", country: "US", number: "X1" },
      additionalVerifiedData: { proofOfAddress: { nameMatch: true, fraud: { riskLevel: "LOW_RISK" } } },
      ...over,
    },
    technicalData: { ip: "203.0.113.1" },
  };
}
const hook = (payload, { sig = "good", client = KEY } = {}) => {
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
  const headers = { "content-type": "application/json" };
  if (sig === "good") headers["x-hmac-signature"] = sign(SECRET, raw);
  else if (sig) headers["x-hmac-signature"] = sig;
  if (client) headers["x-auth-client"] = client;
  return new Request("https://politidex.fyi/api/residency-webhook", { method: "POST", headers, body: raw });
};

const refusals = [
  ["unsigned", hook(decision(), { sig: null }), 401],
  ["signed with the wrong secret", hook(decision(), { sig: sign("nope", JSON.stringify(decision())) }), 401],
  ["signature over a different body", hook(decision(), { sig: sign(SECRET, JSON.stringify(decision({ code: 9102 }))) }), 401],
  ["a non-hex signature", hook(decision(), { sig: "zz" }), 401],
  ["the wrong X-AUTH-CLIENT", hook(decision(), { client: "someone-else" }), 401],
  ["pending (review)", hook(decision({ status: "review", code: 9121 })), 200],
  ["resubmission requested", hook(decision({ status: "resubmission_requested", code: 9103 })), 200],
  ["declined", hook(decision({ status: "declined", code: 9102 })), 200],
  ["expired", hook(decision({ status: "expired", code: 9104 })), 200],
  ["abandoned / canceled", hook(decision({ status: "abandoned", code: 9104 })), 200],
  ["approved status with a non-approved code", hook(decision({ code: 9102 })), 200],
  ["no decision yet (verification null)", hook({ status: "success", verification: null }), 200],
  ["an event webhook (started)", hook({ id: "sess-1", action: "started", code: 7001 }), 200],
  ["approved, but no document check", hook(decision({ document: null })), 200],
  ["approved, but no address check", hook(decision({ additionalVerifiedData: {} })), 200],
  ["approved, but the address name did not match",
    hook(decision({ additionalVerifiedData: { proofOfAddress: { nameMatch: false } } })), 200],
  ["approved, but the address document is HIGH_RISK",
    hook(decision({ additionalVerifiedData: { proofOfAddress: { fraud: { riskLevel: "HIGH_RISK" } } } })), 200],
  ["wrong seat: a neighbour board with no composer", hook(decision({}, "ut-statesenate-6")), 200],
  ["wrong seat: a generated board", hook(decision({}, "ut-statehouse-29")), 200],
  ["wrong seat: statewide", hook(decision({}, "ut-gov")), 200],
  ["wrong seat: the alias, not the canonical key", hook(decision({}, "ut-sd-3")), 200],
  ["wrong seat: padded", hook(decision({}, " ut-statesenate-3")), 200],
  ["no vendorData", hook(decision({ vendorData: null })), 200],
  ["vendorData with no uid", hook(decision({ vendorData: JSON.stringify({ seat: "ut-statesenate-3" }) })), 200],
  ["vendorData that is not JSON", hook(decision({ vendorData: "ut-statesenate-3" })), 200],
  ["a body that is not JSON (signed)", hook("not json"), 200],
];
for (const [name, req, status] of refusals) {
  const s = residencyStore();
  const res = await handleWebhook(req, hookDeps(s));
  eq(res.status, status, `${name}: ${status}`);
  eq(s.writes.length, 0, `${name}: nothing written`);
  const d = await res.json();
  ok(d.written !== true, `${name}: not reported as written`);
}
{
  // No secrets configured: every webhook is refused, even a well-formed one.
  for (const cfg of [{ apiKey: "", sharedSecret: "" }, { apiKey: KEY, sharedSecret: "" }, { apiKey: "", sharedSecret: SECRET }]) {
    const s = residencyStore();
    const res = await handleWebhook(hook(decision()), hookDeps(s, cfg));
    eq(res.status, 401, `missing secret ${JSON.stringify(Object.keys(cfg).filter((k) => !cfg[k]))}: 401`);
    eq(s.writes.length, 0, "…and nothing written");
  }
}
{
  // A revoked row is never overturned by a later pass.
  const h = authorHash(UID, "ut-statesenate-3");
  const s = residencyStore([{ seatKey: "ut-statesenate-3", authorHash: h, status: "revoked", method: "vendor" }]);
  const res = await handleWebhook(hook(decision()), hookDeps(s));
  eq(res.status, 200, "revoked: acknowledged");
  eq(s.writes.length, 0, "revoked: nothing written");
  eq(s.rows[0].status, "revoked", "revoked: still revoked");
}
// THE ONE PATH THAT WRITES, for every seat — and only that seat.
for (const [alias, seat] of Object.entries(CLUSTER)) {
  const s = residencyStore();
  const res = await handleWebhook(hook(decision({}, seat)), hookDeps(s));
  eq(res.status, 200, `${alias}: a signed pass is 200`);
  eq(s.writes.length, 1, `${alias}: exactly one residency write`);
  eq(s.writes[0].seatKey, seat, `${alias}: …for the seat the session named`);
  eq(s.writes[0].hash, authorHash(UID, seat), `${alias}: …keyed on the seat-scoped hash of the uid`);
  eq(Object.keys(s.writes[0]).sort().join(","), "hash,seatKey", `${alias}: nothing from the vendor reaches the write`);
}
{
  // An upgrade from location_match keeps one row and flips it to vendor.
  const seat = "ut-house-2";
  const h = authorHash(UID, seat);
  const s = residencyStore([{ seatKey: seat, authorHash: h, status: "verified", method: "location_match" }]);
  await handleWebhook(hook(decision({}, seat)), hookDeps(s));
  eq(s.rows.length, 1, "location_match → vendor: still one row");
  eq(s.rows[0].method, "vendor", "…now method vendor");
}
eq(parseVendorData(JSON.stringify({ uid: UID, seat: "ut-statesenate-3" }))?.seat, "ut-statesenate-3", "vendorData parses");
eq(decisionPassed(decision()), true, "the fixture decision passes");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the start: only the five seats, signed in, with the secrets");
// ═════════════════════════════════════════════════════════════════════════════
function verifyUser(req) {
  const h = req.headers.get("authorization") || "";
  if (!h.startsWith("Bearer ")) return null;
  const t = h.slice(7);
  if (t === "anon") return { uid: "anon-uid", isAnonymous: true };
  return { uid: t, isAnonymous: false };
}
function startDeps({ rows = [], cfg = { apiKey: KEY, sharedSecret: SECRET, apiUrl: "" }, vendor } = {}) {
  const calls = [];
  const store = residencyStore(rows);
  const deps = {
    verifyUser: async (req) => verifyUser(req),
    config: () => cfg,
    findResidency: store.find,
    callbackUrl: (_req, alias) => `https://politidex.fyi/district/${alias}?residency=returned`,
    async createSession(url, headers, body) {
      calls.push({ url, headers, body });
      if (vendor) return vendor();
      return { ok: true, data: { status: "success", verification: { id: "sess-1", url: "https://alchemy.veriff.com/v/abc" } } };
    },
  };
  return { deps, calls, store };
}
const start = (seat, token) => new Request("https://politidex.fyi/api/residency-verify", {
  method: "POST",
  headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) },
  body: JSON.stringify({ seat }),
});
for (const seat of ["ut-sd-6", "ut-statesenate-6", "ut-hd-29", "ut-statehouse-29", "ut-gov", "ut-us-senate-lee",
                    "ut-cd-1", "ut-house-1", "ut-hd-68", "", "*", "ut-sd-30", "ut-sd-3x"]) {
  const t = startDeps();
  const res = await handleStart(start(seat, UID), t.deps);
  eq(res.status, 404, `start for ${JSON.stringify(seat)} is 404`);
  eq(t.calls.length, 0, `…and no vendor session is created`);
}
for (const [alias, seat] of Object.entries(CLUSTER)) {
  const t = startDeps();
  const res = await handleStart(start(alias, UID), t.deps);
  eq(res.status, 200, `${alias}: a signed-in start is 200`);
  const d = await res.json();
  eq(d.url, "https://alchemy.veriff.com/v/abc", `${alias}: …returns the vendor URL`);
  eq(t.calls.length, 1, `${alias}: one session created`);
  const sent = JSON.parse(t.calls[0].body);
  eq(sent.verification.vendorData, JSON.stringify({ uid: UID, seat }), `${alias}: vendorData is { uid, seat } for THIS board`);
  ok(sent.verification.callback.endsWith(`/district/${alias}?residency=returned`), `${alias}: returns to the board it started from`);
  eq(t.calls[0].headers["x-auth-client"], KEY, `${alias}: authenticated server-side`);
  eq(t.calls[0].headers["x-hmac-signature"], sign(SECRET, t.calls[0].body), `${alias}: …and signed`);
  ok(!JSON.stringify(d).includes(KEY) && !JSON.stringify(d).includes(SECRET), `${alias}: no secret on the wire`);
  // The canonical key works too; a body cannot choose another uid.
  const t2 = startDeps();
  const r2 = await handleStart(new Request("https://politidex.fyi/api/residency-verify", {
    method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + UID },
    body: JSON.stringify({ seat, uid: "uid-mallory" }),
  }), t2.deps);
  eq(r2.status, 200, `${alias}: canonical ${seat} starts too`);
  ok(JSON.parse(t2.calls[0].body).verification.vendorData.includes(UID), `${alias}: the uid is the token's, not the body's`);
}
for (const [who, token] of [["signed out", null], ["anonymous", "anon"]]) {
  const t = startDeps();
  const res = await handleStart(start("ut-sd-3", token), t.deps);
  eq(res.status, 403, `${who}: start is 403`);
  eq(t.calls.length, 0, `${who}: no session`);
}
{
  const t = startDeps({ cfg: { apiKey: "", sharedSecret: "", apiUrl: "" } });
  const res = await handleStart(start("ut-sd-3", UID), t.deps);
  eq(res.status, 503, "no secrets: 503");
  eq((await res.json()).code, "vendor_unavailable", "…vendor_unavailable");
  eq(t.calls.length, 0, "…no session");
}
for (const [name, vendor] of [
  ["vendor down (throws)", () => { throw new Error("ECONNREFUSED"); }],
  ["vendor 500", () => ({ ok: false, data: {} })],
  ["vendor returns no URL", () => ({ ok: true, data: { verification: {} } })],
  ["vendor returns a non-https URL", () => ({ ok: true, data: { verification: { url: "javascript:alert(1)" } } })],
]) {
  const t = startDeps({ vendor });
  const res = await handleStart(start("ut-sd-3", UID), t.deps);
  eq(res.status, 502, `${name}: 502`);
  eq(t.store.writes.length, 0, `${name}: nothing written`);
}
{
  const h = authorHash(UID, "ut-statesenate-3");
  const t = startDeps({ rows: [{ seatKey: "ut-statesenate-3", authorHash: h, status: "revoked", method: "vendor" }] });
  eq((await handleStart(start("ut-sd-3", UID), t.deps)).status, 403, "revoked: start refused");
  eq(t.calls.length, 0, "…no session");
}
ok(!/writeVerified|insert\(|update\(/.test(R("netlify/functions/residency-verify.mts")), "the start Function cannot write residency");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · after a verified row, that seat opens and its neighbours do not");
// ═════════════════════════════════════════════════════════════════════════════
function boardDeps(rows) {
  const s = { posts: [], votes: [] };
  s.deps = {
    verifyUser: async (req) => verifyUser(req),
    findResidency: async (seatKey, hash) => rows.find((r) => r.seatKey === seatKey && r.authorHash === hash) || null,
    issueExists: async (k) => k === "housing",
    listPosts: async () => s.posts.slice(),
    insertPost: async (v) => { s.posts.push(v); return { id: s.posts.length, issueKey: v.issueKey, body: v.body, createdAt: "2026-09-30T00:00:00Z" }; },
    countVotes: async () => s.votes.map((v) => ({ issueKey: v.issueKey, choice: v.choice, v: 1 })),
    myVotes: async (seatKey, hash) => s.votes.filter((v) => v.seatKey === seatKey && v.authorHash === hash),
    upsertVote: async (v) => { s.votes.push(v); },
    // These suites test the RESIDENCY gate, which is asked before membership;
    // the account is a member so the daily cap (scripts/test-membership-cap.mjs)
    // stays out of their way. Every 403 here is still a 403 for a member.
    findMembership: async () => ({ status: "active", currentPeriodEnd: null }),
  };
  return s;
}
const boardPost = (path, body, token) => new Request(`https://politidex.fyi${path}`, {
  method: "POST",
  headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) },
  body: JSON.stringify(body),
});
for (const [alias, seat] of Object.entries(CLUSTER)) {
  // FIXTURE: a test-only row in this file's own store.
  const rows = [{ seatKey: seat, authorHash: authorHash(UID, seat), status: "verified", method: "vendor" }];
  const s = boardDeps(rows);
  const c = await handleVoice(boardPost("/api/district-board-voice", { seat: alias, issueKey: "housing", body: "Fix the road." }, UID), s.deps);
  ok(c.status === 200 || c.status === 201, `${alias}: comment POST succeeds (${c.status})`);
  const v = await handlePoll(boardPost("/api/district-board-poll", { seat: alias, issueKey: "housing", choice: "support" }, UID), s.deps);
  eq(v.status, 200, `${alias}: vote POST is 200`);
  for (const [nAlias] of Object.entries(CLUSTER).filter(([a]) => a !== alias)) {
    const n = boardDeps(rows);
    const nc = await handleVoice(boardPost("/api/district-board-voice", { seat: nAlias, issueKey: "housing", body: "Hi" }, UID), n.deps);
    eq(nc.status, 403, `${alias} verified → ${nAlias} comment still 403`);
    const nv = await handlePoll(boardPost("/api/district-board-poll", { seat: nAlias, issueKey: "housing", choice: "support" }, UID), n.deps);
    eq(nv.status, 403, `${alias} verified → ${nAlias} vote still 403`);
    eq(n.posts.length + n.votes.length, 0, `${alias} verified → ${nAlias}: nothing written`);
  }
}
{
  // END TO END: a signed UT-2 decision opens UT-2 and nothing else.
  const store = residencyStore();
  await handleWebhook(hook(decision({}, "ut-house-2")), hookDeps(store));
  const s = boardDeps(store.rows);
  eq((await handlePoll(boardPost("/api/district-board-poll", { seat: "ut-cd-2", issueKey: "housing", choice: "oppose" }, UID), s.deps)).status,
     200, "UT-2 decision → UT-2 vote 200");
  eq((await handlePoll(boardPost("/api/district-board-poll", { seat: "ut-sd-3", issueKey: "housing", choice: "oppose" }, UID), s.deps)).status,
     403, "UT-2 decision → SD-3 vote 403");
  eq((await handleVoice(boardPost("/api/district-board-voice", { seat: "ut-sd-3", issueKey: "housing", body: "x" }, UID), s.deps)).status,
     403, "UT-2 decision → SD-3 comment 403");
  eq((await handlePoll(boardPost("/api/district-board-poll", { seat: "ut-cd-2", issueKey: "housing", choice: "oppose" }, "uid-bob"), s.deps)).status,
     403, "UT-2 decision for alice → bob still 403 on UT-2");
  // A pending decision after that changes nothing either way.
  const before = JSON.stringify(store.rows);
  await handleWebhook(hook(decision({ status: "review", code: 9121 }, "ut-statesenate-3")), hookDeps(store));
  eq(JSON.stringify(store.rows), before, "a later pending decision writes nothing");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the counts endpoint never returns a person");
// ═════════════════════════════════════════════════════════════════════════════
{
  const FN_RAW = R("netlify/functions/district-board.mts");
  const UNION = (FN_RAW.match(/const voicePeople = db[\s\S]*?\.as\("voice_people"\);/) || [""])[0];
  ok(!!UNION, "band 2's voice union is found");
  ok(/select\(\{ v: countDistinct\(voicePeople\.h\) \}\)/.test(FN_RAW), "…and it is only ever aggregated");
  const FN = FN_RAW.replace(UNION, "");
  for (const m of FN.matchAll(/\.select\(\{([\s\S]*?)\}\)/g)) {
    for (const f of m[1].split(",").map((x) => x.trim()).filter(Boolean)) {
      ok(/^v:\s*countDistinct\(/.test(f) || /^issueKey:\s*\w+\.issueKey$/.test(f), `counts select is an aggregate or issue key — ${f}`);
    }
  }
  const resSel = [...FN.matchAll(/\.select\(\{([^}]*)\}\)\s*\.from\(voiceResidency\)/g)].map((m) => m[1].trim());
  ok(resSel.length >= 1 && resSel.every((f) => /^v:\s*countDistinct\(voiceResidency\.authorHash\)$/.test(f)),
     `residency is only ever counted by the counts endpoint — ${JSON.stringify(resSel)}`);
  ok(!/uid|authorHash\s*:/.test(FN.replace(/countDistinct\([^)]*\)/g, "").replace(/\/\/.*$/gm, "")),
     "no uid or author hash is put on the wire");
  // Every vendor handler response is free of the uid and the hash.
  const store = residencyStore();
  const res = await handleWebhook(hook(decision()), hookDeps(store));
  const text = await res.text();
  ok(!text.includes(UID) && !text.includes(authorHash(UID, "ut-statesenate-3")), "the webhook answers with no person in it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · no backdoor, no downgrade, the shell moved");
// ═════════════════════════════════════════════════════════════════════════════
const CORE = R("netlify/lib/residency-vendor-core.mjs");
ok(!/process\.env|Netlify\.env/.test(CORE), "the vendor core reads no environment");
ok(!/process\.env|Netlify\.env/.test(R("netlify/lib/district-board-voice-core.mjs") + R("netlify/lib/district-board-poll-core.mjs")),
   "the gates read no environment");
const ALLF = ["netlify/functions/residency-verify.mts", "netlify/functions/residency-webhook.mts",
              "netlify/functions/district-board-voice.mts", "netlify/functions/district-board-poll.mts"].map(R).join("\n");
ok(!/VERIFY_BYPASS|FORCE_VERIFIED|SKIP_VERIFY|RESIDENCY_(DEV|TEST|MOCK)|DEV_VERIFIED/i.test(ALLF + CORE), "no flag stamps verified");
eq(Object.keys(COMPOSER_SEATS).length, 5, "still exactly five composer seats");
{
  const hub = R("netlify/functions/district-voice.mts");
  const note = (hub.match(/async function noteResidency[\s\S]*?\n\}/) || [""])[0];
  ok(/ne\(voiceResidency\.method, "vendor"\)/.test(note), "the hub's location recorder never overwrites a vendor row");
  ok(!/method: "vendor"/.test(hub), "…and never writes method vendor");
}
{
  const writers = ["netlify/functions/residency-webhook.mts"];
  const all = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "netlify/functions"], { cwd: ROOT, encoding: "utf8" })
    .split("\n").filter((f) => /\.m?ts$/.test(f));
  const vendorWriters = all.filter((f) => /method: "vendor"/.test(R(f)));
  eq(vendorWriters.join(","), writers.join(","), "the signed webhook is the only Function that writes method vendor");
}
const SW = R("sw.js");
ok(Number(((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]) || 0) >= 272, "the shell moved at least to v272");
ok(/v272 - PROVE YOU LIVE HERE[\s\S]*?MIGRATION COST: none[\s\S]*?No database migration/.test(SW), "v272's log says no migration");
const CLIENT = R("district-composer.js");
ok(CLIENT.includes("Prove you live here"), "the composer carries the Prove you live here control");
ok(/reason !== 'unverified'/.test(CLIENT), "…shown only to a signed-in, unverified reader");
ok(!/localStorage|sessionStorage/.test(CLIENT), "…and keeps nothing on the device");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
