#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for the residency vendor — DIDIT ON THE FIVE COMPOSER SEATS, FAIL CLOSED
// ─────────────────────────────────────────────────────────────────────────────
//   1. NO VENDOR SECRET IN GIT, and none reaches the browser.
//   2. THE WEBHOOK — unsigned / badly signed / stale / in review / declined /
//      no address check / wrong seat / revoked all write nothing; only a
//      signed, Approved Didit decision with both ID and address checks writes,
//      and only for the seat it named.
//   3. THE START — only the five seats accept it; signed out is refused; no
//      DIDIT_API_KEY or no DIDIT_WORKFLOW_ID is 503 with no session; vendor
//      down is 502; the session carries { uid, seat } on the workflow.
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

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  handleStart,
  handleWebhook,
  sign,
  canonicalJson,
  parseVendorData,
  decisionPassed,
} from "../netlify/lib/residency-vendor-core.mjs";
import { COMPOSER_SEATS, handle as handleVoice, seatHash } from "../netlify/lib/district-board-voice-core.mjs";
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
const WORKFLOW = "11111111-2222-3333-4444-555555555555";
const SECRET = "test-webhook-secret-not-a-secret";
const NOW = new Date("2026-10-11T12:00:00Z");
const NOW_S = Math.floor(NOW.getTime() / 1000);
const UID = "uid-alice-0000000000000000000";
const CLUSTER = {
  "ut-sd-3": "ut-statesenate-3",
  "ut-hd-16": "ut-statehouse-16",
  "ut-sd-7": "ut-statesenate-7",
  "ut-hd-15": "ut-statehouse-15",
  "ut-cd-2": "ut-house-2",
};
// THE STATE'S STATEWIDE SEATS RIDE EVERY UTAH SESSION (residency-vendor-core.mjs
// statewideSeatsFor()): the session's own seat first, then the governor and both
// U.S. Senate seats, in COMPOSER_SEATS order.
const STATEWIDE = ["ut-gov", "ut-us-senate-curtis", "ut-us-senate-lee"];
const bound = (seat, more = []) => {
  const out = [seat];
  for (const k of more.concat(STATEWIDE)) if (out.indexOf(k) < 0) out.push(k);
  return out;
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
const liveSecrets = [process.env.DIDIT_API_KEY, process.env.DIDIT_WEBHOOK_SECRET, process.env.DIDIT_WORKFLOW_ID]
  .filter((v) => typeof v === "string" && v.length >= 8);
const hits = [];
for (const f of tracked) {
  if (!TEXT.test(f) || f === "scripts/test-residency-vendor.mjs") continue;
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  const s = readFileSync(p, "utf8");
  // An assignment of a literal value to a vendor secret name.
  if (/DIDIT_(API_KEY|WEBHOOK_SECRET|WORKFLOW_ID)\s*[:=]\s*["']?[A-Za-z0-9-]{8,}/.test(s)) hits.push(f);
  // A literal key next to Didit's API key header.
  if (/x-api-key["']?\s*[:,]\s*["'][A-Za-z0-9_-]{16,}/i.test(s)) hits.push(f);
  for (const v of liveSecrets) if (s.includes(v)) hits.push(f);
}
eq(hits.length, 0, `no tracked file carries a vendor secret — ${JSON.stringify(hits)}`);
ok(!tracked.some((f) => /(^|\/)\.env(\.|$)/.test(f)), "no .env file is tracked");
for (const f of ["district-composer.js", "district-poll.js", "district-ut-sd-3.html", "district-ut-cd-2.html"]) {
  ok(!/DIDIT_|VERIFF_|x-api-key|x-signature|shared.?secret|webhook.?secret/i.test(R(f)), `${f}: no vendor key, secret or signing in the browser`);
}
for (const f of ["netlify/functions/residency-verify.mts", "netlify/functions/residency-webhook.mts"]) {
  const s = R(f);
  const envs = [...s.matchAll(/process\.env\.([A-Z_]+)/g)].map((m) => m[1]).sort();
  ok(envs.every((n) => ["URL", "DIDIT_API_KEY", "DIDIT_WORKFLOW_ID", "DIDIT_WEBHOOK_SECRET"].includes(n)),
     `${f}: reads only the Didit settings and the site URL from env — ${envs.join(",")}`);
  ok(!/veriff/i.test(s), `${f}: no Veriff call remains`);
  ok(!/console\.(log|error)\([^)]*(raw|payload|body)\b/.test(s), `${f}: never logs a vendor payload`);
}
ok(!/veriff/i.test(R("netlify/lib/residency-vendor-core.mjs")), "the vendor core names no Veriff host, header or code");
ok(/DIDIT_API_KEY/.test(R("netlify/functions/residency-verify.mts")) && /DIDIT_WORKFLOW_ID/.test(R("netlify/functions/residency-verify.mts")),
   "the start reads DIDIT_API_KEY and DIDIT_WORKFLOW_ID");
ok(/DIDIT_WEBHOOK_SECRET/.test(R("netlify/functions/residency-webhook.mts")), "the webhook reads DIDIT_WEBHOOK_SECRET");

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
function hookDeps(store, cfg = { webhookSecret: SECRET }) {
  return { config: () => cfg, findResidency: store.find, writeVerified: store.writeVerified, now: () => NOW };
}
// A Didit session webhook (V3 decision shape). `over` patches the envelope,
// `dec` patches the decision.
function decision(over = {}, seat = "ut-statesenate-3", uid = UID, dec = {}) {
  return {
    event_id: "evt-1",
    webhook_type: "status.updated",
    timestamp: NOW_S,
    session_id: "sess-1",
    status: "Approved",
    workflow_id: WORKFLOW,
    vendor_data: JSON.stringify({ uid, seat }),
    decision: {
      session_id: "sess-1",
      status: "Approved",
      vendor_data: JSON.stringify({ uid, seat }),
      id_verifications: [{ node_id: "id_verification_1", status: "Approved", document_type: "Driving License",
        first_name: "Alice", warnings: [] }],
      poa_verifications: [{ node_id: "feature_poa", status: "Approved", address: "1 Main St – Layton", warnings: [] }],
      ...dec,
    },
    ...over,
  };
}
// Signed the way Didit signs: X-Signature-V2 over the sorted compact JSON,
// X-Signature over the raw bytes, X-Timestamp in seconds.
const hook = (payload, { sig = "v2", ts = NOW_S, secret = SECRET } = {}) => {
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
  const headers = { "content-type": "application/json" };
  if (ts != null) headers["x-timestamp"] = String(ts);
  if (sig === "v2") headers["x-signature-v2"] = sign(secret, canonicalJson(JSON.parse(raw)));
  else if (sig === "raw") headers["x-signature"] = sign(secret, raw);
  else if (sig && typeof sig === "object") Object.assign(headers, sig);
  return new Request("https://politidex.fyi/api/residency-webhook", { method: "POST", headers, body: raw });
};
const noPoa = (() => { const d = decision(); delete d.decision.poa_verifications; return d; })();
const noId = (() => { const d = decision(); delete d.decision.id_verifications; return d; })();

const refusals = [
  ["unsigned", hook(decision(), { sig: null }), 401],
  ["signed with the wrong secret", hook(decision(), { secret: "nope" }), 401],
  ["V2 signature over a different body",
    hook(decision(), { sig: { "x-signature-v2": sign(SECRET, canonicalJson(decision({ status: "Declined" }))) } }), 401],
  ["raw signature over a different body",
    hook(decision(), { sig: { "x-signature": sign(SECRET, JSON.stringify(decision({ status: "Declined" }))) } }), 401],
  ["a non-hex signature", hook(decision(), { sig: { "x-signature-v2": "zz" } }), 401],
  ["only the envelope-only Simple signature",
    hook(decision(), { sig: { "x-signature-simple": sign(SECRET, `${NOW_S}:sess-1:Approved:status.updated`) } }), 401],
  ["no X-Timestamp", hook(decision(), { ts: null }), 401],
  ["a stale X-Timestamp (10 minutes old)", hook(decision(), { ts: NOW_S - 600 }), 401],
  ["a future X-Timestamp (10 minutes ahead)", hook(decision(), { ts: NOW_S + 600 }), 401],
  ["In Review", hook(decision({ status: "In Review" }, undefined, undefined, { status: "In Review" })), 200],
  ["In Progress (no decision yet)", hook({ ...decision({ status: "In Progress" }), decision: undefined }), 200],
  ["Resubmitted", hook(decision({ status: "Resubmitted" })), 200],
  ["Declined", hook(decision({ status: "Declined" }, undefined, undefined, { status: "Declined" })), 200],
  ["Expired", hook(decision({ status: "Expired" })), 200],
  ["Abandoned", hook(decision({ status: "Abandoned" })), 200],
  ["approved envelope, declined decision", hook(decision({}, undefined, undefined, { status: "Declined" })), 200],
  ["approved, but the ID check declined",
    hook(decision({}, undefined, undefined, { id_verifications: [{ node_id: "id_verification_1", status: "Declined" }] })), 200],
  ["approved, but the address check declined",
    hook(decision({}, undefined, undefined, { poa_verifications: [{ node_id: "feature_poa", status: "Declined" }] })), 200],
  ["approved, but the address check is in review",
    hook(decision({}, undefined, undefined, { poa_verifications: [{ node_id: "feature_poa", status: "In Review" }] })), 200],
  ["approved, but no address check", hook(noPoa), 200],
  ["approved, but an empty address check list", hook(decision({}, undefined, undefined, { poa_verifications: [] })), 200],
  ["approved, but no ID check", hook(noId), 200],
  ["approved, but no decision object", hook({ ...decision(), decision: null }), 200],
  ["a transaction event", hook(decision({ webhook_type: "transaction.status.updated" })), 200],
  ["wrong seat: a seat with no board (HD-1)", hook(decision({}, "ut-statehouse-1")), 200],
  ["wrong seat: a seat with no board (HD-57)", hook(decision({}, "ut-statehouse-57")), 200],
  ["wrong seat: a statewide key with no board", hook(decision({}, "ut-us-senate-mlee")), 200],
  ["wrong seat: the statewide alias spelling, padded", hook(decision({}, " ut-gov")), 200],
  ["wrong seat: the alias, not the canonical key", hook(decision({}, "ut-sd-3")), 200],
  ["wrong seat: padded", hook(decision({}, " ut-statesenate-3")), 200],
  ["no vendor_data", hook(decision({ vendor_data: null }, undefined, undefined, { vendor_data: null })), 200],
  ["vendor_data with no uid", hook(decision({ vendor_data: JSON.stringify({ seat: "ut-statesenate-3" }) })), 200],
  ["vendor_data that is not JSON", hook(decision({ vendor_data: "ut-statesenate-3" })), 200],
  ["a body that is not JSON (raw-signed)", hook("not json", { sig: { "x-signature": sign(SECRET, "not json") } }), 200],
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
  // No webhook secret configured: every webhook is refused, even a well-formed one.
  for (const cfg of [{ webhookSecret: "" }, {}, { apiKey: KEY, workflowId: WORKFLOW }]) {
    const s = residencyStore();
    const res = await handleWebhook(hook(decision()), hookDeps(s, cfg));
    eq(res.status, 401, `no DIDIT_WEBHOOK_SECRET ${JSON.stringify(cfg)}: 401`);
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
  // The other accepted forms: X-Signature over the raw bytes, a timestamp
  // inside the window, the v2-pinned singular fields, and non-ASCII content.
  const s1 = residencyStore();
  eq((await (await handleWebhook(hook(decision(), { sig: "raw" }), hookDeps(s1))).json()).written, true,
     "a raw-body X-Signature pass writes");
  const s2 = residencyStore();
  await handleWebhook(hook(decision(), { ts: NOW_S - 240 }), hookDeps(s2));
  eq(s2.writes.length, 1, "a timestamp four minutes old is inside the window");
  const v2 = decision();
  v2.decision.id_verification = v2.decision.id_verifications[0];
  v2.decision.poa = v2.decision.poa_verifications[0];
  delete v2.decision.id_verifications; delete v2.decision.poa_verifications;
  const s3 = residencyStore();
  await handleWebhook(hook(v2), hookDeps(s3));
  eq(s3.writes.length, 1, "a webhook-v2 decision (id_verification + poa) writes");
  const v2noPoa = JSON.parse(JSON.stringify(v2)); delete v2noPoa.decision.poa;
  const s4 = residencyStore();
  await handleWebhook(hook(v2noPoa), hookDeps(s4));
  eq(s4.writes.length, 0, "…and without poa it writes nothing");
  // Key order on the wire does not matter to V2; the canonical form is sorted.
  const shuffled = JSON.stringify(Object.fromEntries(Object.entries(decision()).reverse()));
  const s5 = residencyStore();
  await handleWebhook(hook(shuffled), hookDeps(s5));
  eq(s5.writes.length, 1, "V2 verifies a body whose keys arrive in another order");
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
eq(decisionPassed(noPoa), false, "…and without an address check it does not");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the start: only composer seats (every board), signed in, with the secrets");
// ═════════════════════════════════════════════════════════════════════════════
function verifyUser(req) {
  const h = req.headers.get("authorization") || "";
  if (!h.startsWith("Bearer ")) return null;
  const t = h.slice(7);
  if (t === "anon") return { uid: "anon-uid", isAnonymous: true };
  return { uid: t, isAnonymous: false };
}
// Membership never gates the start. These suites default to a member row only
// to prove it changes nothing; section 7 runs the same starts without one.
const MEMBER = { status: "active", currentPeriodEnd: null };
function startDeps({ rows = [], cfg = { apiKey: KEY, workflowId: WORKFLOW }, vendor, membership = MEMBER } = {}) {
  const calls = [];
  const store = residencyStore(rows);
  const deps = {
    verifyUser: async (req) => verifyUser(req),
    config: () => cfg,
    findResidency: store.find,
    findMembership: async () => membership,
    callbackUrl: (_req, alias) => `https://politidex.fyi/district/${alias}?residency=returned`,
    async createSession(url, headers, body) {
      calls.push({ url, headers, body });
      if (vendor) return vendor();
      return { ok: true, data: { session_id: "sess-1", status: "Not Started", url: "https://verify.didit.me/session/abc" } };
    },
  };
  return { deps, calls, store };
}
const start = (seat, token) => new Request("https://politidex.fyi/api/residency-verify", {
  method: "POST",
  headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) },
  body: JSON.stringify({ seat }),
});
for (const seat of ["ut-hd-1", "ut-statehouse-1", "ut-hd-57", "ut-statehouse-57", "ut-us-senate-mlee", "ut-ag",
                    "ut-cd-5", "ut-house-5", "", "*", "ut-sd-30", "ut-sd-3x"]) {
  const t = startDeps();
  const res = await handleStart(start(seat, UID), t.deps);
  eq(res.status, 404, `start for ${JSON.stringify(seat)} is 404`);
  eq(t.calls.length, 0, `…and no vendor session is created`);
}
// THE NEWLY OPENED BOARDS START A SESSION FOR THEIR OWN SEAT, exactly as the
// five do: SD-6, a generated board, and the statewide boards.
for (const [alias, seat] of [["ut-sd-6", "ut-statesenate-6"], ["ut-hd-29", "ut-statehouse-29"],
                             ["ut-gov", "ut-gov"], ["ut-us-senate-lee", "ut-us-senate-lee"]]) {
  const t = startDeps();
  const res = await handleStart(start(alias, UID), t.deps);
  eq(res.status, 200, `${alias}: a signed-in start is 200`);
  eq(t.calls.length, 1, `${alias}: one session created`);
  const sent = t.calls.length ? JSON.parse(t.calls[0].body) : {};
  eq(sent.vendor_data, JSON.stringify({ uid: UID, seat, seats: bound(seat) }), `${alias}: vendor_data names this seat and the statewide seats`);
  ok(String(sent.callback || "").endsWith(`/district/${alias}?residency=returned`), `${alias}: returns to its own board`);
}
for (const [alias, seat] of Object.entries(CLUSTER)) {
  const t = startDeps();
  const res = await handleStart(start(alias, UID), t.deps);
  eq(res.status, 200, `${alias}: a signed-in start is 200`);
  const d = await res.json();
  eq(d.url, "https://verify.didit.me/session/abc", `${alias}: …returns the Didit session URL`);
  eq(t.calls.length, 1, `${alias}: one session created`);
  eq(t.calls[0].url, "https://verification.didit.me/v3/session/", `${alias}: …at Didit's session endpoint`);
  const sent = JSON.parse(t.calls[0].body);
  eq(sent.workflow_id, WORKFLOW, `${alias}: on the configured workflow`);
  eq(sent.vendor_data, JSON.stringify({ uid: UID, seat, seats: bound(seat) }),
     `${alias}: vendor_data is { uid, seat, seats } for THIS board (no resolved seats sent → this seat and the statewide seats)`);
  ok(sent.callback.endsWith(`/district/${alias}?residency=returned`), `${alias}: returns to the board it started from`);
  eq(t.calls[0].headers["x-api-key"], KEY, `${alias}: authenticated server-side`);
  ok(!JSON.stringify(d).includes(KEY) && !JSON.stringify(d).includes(WORKFLOW), `${alias}: no key or workflow on the wire`);
  // The canonical key works too; a body cannot choose another uid.
  const t2 = startDeps();
  const r2 = await handleStart(new Request("https://politidex.fyi/api/residency-verify", {
    method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + UID },
    body: JSON.stringify({ seat, uid: "uid-mallory" }),
  }), t2.deps);
  eq(r2.status, 200, `${alias}: canonical ${seat} starts too`);
  ok(JSON.parse(t2.calls[0].body).vendor_data.includes(UID) && !t2.calls[0].body.includes("mallory"),
     `${alias}: the uid is the token's, not the body's`);
}
for (const [who, token] of [["signed out", null], ["anonymous", "anon"]]) {
  const t = startDeps();
  const res = await handleStart(start("ut-sd-3", token), t.deps);
  eq(res.status, 403, `${who}: start is 403`);
  eq(t.calls.length, 0, `${who}: no session`);
}
for (const [name, cfg] of [
  ["no DIDIT_API_KEY", { apiKey: "", workflowId: WORKFLOW }],
  ["no DIDIT_WORKFLOW_ID", { apiKey: KEY, workflowId: "" }],
  ["neither", { apiKey: "", workflowId: "" }],
  ["an empty config", {}],
]) {
  for (const alias of Object.keys(CLUSTER)) {
    const t = startDeps({ cfg });
    const res = await handleStart(start(alias, UID), t.deps);
    eq(res.status, 503, `${name} on ${alias}: 503`);
    const d = await res.json();
    eq(d.code, "vendor_unavailable", `${name} on ${alias}: …vendor_unavailable`);
    eq(d.error, "The ID check is not available right now. Posting stays closed on this board.", `${name} on ${alias}: …the not-available line`);
    eq(t.calls.length, 0, `${name} on ${alias}: …no session`);
  }
}
for (const [name, vendor] of [
  ["vendor down (throws)", () => { throw new Error("ECONNREFUSED"); }],
  ["vendor 500", () => ({ ok: false, data: {} })],
  ["vendor returns no URL", () => ({ ok: true, data: { session_id: "sess-1" } })],
  ["vendor returns a non-https URL", () => ({ ok: true, data: { url: "javascript:alert(1)" } })],
  ["vendor returns the URL under another name", () => ({ ok: true, data: { verification_url: "https://verify.didit.me/x" } })],
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
    // the account is a member so the monthly cap (scripts/test-membership-cap.mjs)
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
  await handleWebhook(hook(decision({ status: "In Review" }, "ut-statesenate-3", UID, { status: "In Review" })), hookDeps(store));
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
{
  const docs = readdirSync(ROOT).filter((f) => /^district-[a-z]{2}-(?:(?:hd|sd|cd)-\d+|gov|us-senate-[a-z][a-z0-9_]*)\.html$/.test(f))
    // A read-only board (composer: false in district-board.js BOARDS — the
    // contested Pennsylvania legislative seats) is on no composer list.
    .filter((f) => !new RegExp("composer: false, alias: '" + ((/data-pdxdb-seat="([^"]+)"/.exec(R(f)) || [, "~"])[1]) + "'").test(R("district-board.js")));
  eq(Object.keys(COMPOSER_SEATS).length, docs.length, "one composer seat per board document, and no more");
}
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
ok(/function canProve\(\)[\s\S]*?reason === 'unverified'[\s\S]*?!canPost\(\)/.test(CLIENT),
   "…and never to a reader the server already counts as verified (the function decides who may start)");
// The composer reads /api/membership for ONE thing — whether to show the plain
// "Become a member" link (v428). The residency check itself never asks it.
{
  const fnText = (name) => {
    const at = CLIENT.indexOf(`\n  function ${name}(`);
    if (at < 0) return "";
    const ends = ["\n  function ", "\n  // ── ", "\n  var "].map((m) => CLIENT.indexOf(m, at + 1)).filter((x) => x > at);
    return CLIENT.slice(at, ends.length ? Math.min(...ends) : CLIENT.length);
  };
  ok(["canProve", "prove", "proveHtml"].every((f) => fnText(f).length > 20 && !/MEMBER_API|loadMember|(?<![a-z])_member\b|\/api\/membership/.test(fnText(f))),
     "…which the residency check never asks /api/membership for");
  ok((CLIENT.match(/fetch\(MEMBER_API/g) || []).length === 1, "…the one membership read is the link's");
}
ok(!/localStorage|sessionStorage/.test(CLIENT), "…and keeps nothing on the device");

ok(/v281 - A MEMBER CAN START THE SEAT CHECK[\s\S]*?MIGRATION COST: none - no one-check counter is[\s\S]*?needed/.test(SW),
   "v281's log says no migration and why no counter is needed");

// ═════════════════════════════════════════════════════════════════════════════
section("7 · any signed-in reader can start the seat check; membership is never asked; the year includes one");
// ═════════════════════════════════════════════════════════════════════════════
const NON_MEMBERS = [
  ["no membership row", null],
  ["an inactive membership", { status: "inactive", currentPeriodEnd: null }],
  ["a lapsed membership", { status: "active", currentPeriodEnd: "2020-01-01T00:00:00Z" }],
];
{
  // A SIGNED-IN NON-MEMBER CAN START A SESSION — the Didit URL comes back.
  for (const [who, membership] of NON_MEMBERS) {
    for (const [alias, seat] of Object.entries(CLUSTER)) {
      const t = startDeps({ membership });
      const res = await handleStart(start(alias, UID), t.deps);
      eq(res.status, 200, `${who} on ${alias}: start is 200`);
      const d = await res.json();
      eq(d.url, "https://verify.didit.me/session/abc", `${who} on ${alias}: …the Didit URL is returned`);
      eq(d.seat, alias, `${who} on ${alias}: …for this board`);
      eq(t.calls.length, 1, `${who} on ${alias}: one vendor session`);
      eq(JSON.parse(t.calls[0].body).vendor_data, JSON.stringify({ uid: UID, seat, seats: bound(seat) }),
         `${who} on ${alias}: the session is bound to ${seat}`);
      eq(t.store.writes.length, 0, `${who} on ${alias}: nothing written`);
    }
  }
  // No membership lookup at all, or one that throws: the start does not care.
  const t = startDeps();
  delete t.deps.findMembership;
  eq((await handleStart(start("ut-sd-3", UID), t.deps)).status, 200, "no membership lookup: 200");
  const thrown = startDeps();
  thrown.deps.findMembership = async () => { throw new Error("db down"); };
  eq((await handleStart(start("ut-sd-3", UID), thrown.deps)).status, 200, "membership lookup throws: 200");
  // Signed out is still refused, member row or not.
  for (const membership of [null, MEMBER]) {
    const so = startDeps({ membership });
    const res = await handleStart(start("ut-sd-3", null), so.deps);
    eq(res.status, 403, "signed out: 403");
    eq((await res.json()).code, "signed_out", "…signed_out");
    eq(so.calls.length, 0, "…no session");
  }
  // Non-member with no secrets is 503: nothing is created.
  const off = startDeps({ membership: null, cfg: { apiKey: "", workflowId: "" } });
  const offRes = await handleStart(start("ut-sd-3", UID), off.deps);
  eq(offRes.status, 503, "non-member, no secrets: 503");
  eq((await offRes.json()).code, "vendor_unavailable", "…vendor_unavailable");
  eq(off.calls.length, 0, "…no session");
  // The members-only line is gone from the start function and the composer.
  for (const f of ["netlify/lib/residency-vendor-core.mjs", "netlify/functions/residency-verify.mts", "district-composer.js"]) {
    ok(!/open to members/i.test(R(f)), `${f}: no members-only line`);
  }
  ok(!/not_member|memberFor|findMembership/.test(R("netlify/lib/residency-vendor-core.mjs")),
     "the start function never asks membership");
}
{
  // A MEMBER CAN START A SESSION FOR THE BOARD THEY ARE ON — and only that seat.
  for (const [alias, seat] of Object.entries(CLUSTER)) {
    const t = startDeps();
    const res = await handleStart(start(alias, UID), t.deps);
    eq(res.status, 200, `member on ${alias}: start is 200`);
    eq((await res.json()).seat, alias, `member on ${alias}: …for this board`);
    eq(JSON.parse(t.calls[0].body).vendor_data, JSON.stringify({ uid: UID, seat, seats: bound(seat) }),
       `member on ${alias}: the session is bound to ${seat}`);
    eq(t.store.writes.length, 0, `member on ${alias}: starting writes nothing`);
  }
}
{
  // ONE CHECK. A verified vendor row on any seat refuses another start.
  const rows = [{ seatKey: "ut-house-2", authorHash: authorHash(UID, "ut-house-2"), status: "verified", method: "vendor" }];
  for (const alias of ["ut-sd-3", "ut-hd-16", "ut-sd-7", "ut-hd-15"]) {
    const t = startDeps({ rows });
    const res = await handleStart(start(alias, UID), t.deps);
    eq(res.status, 403, `verified on UT-2 → ${alias} start is 403`);
    const d = await res.json();
    eq(d.code, "already_checked", `…already_checked`);
    ok(/already done/i.test(d.error), "…and says the check is already done");
    eq(t.calls.length, 0, "…no session");
  }
  // A revoked row elsewhere is not a verification and does not block a start.
  const revoked = [{ seatKey: "ut-house-2", authorHash: authorHash(UID, "ut-house-2"), status: "revoked", method: "vendor" }];
  eq((await handleStart(start("ut-sd-3", UID), startDeps({ rows: revoked }).deps)).status, 200,
     "a revoked row on another seat does not count as a verified row");
  // A location_match row elsewhere is not a vendor check; it spends nothing.
  const loc = [{ seatKey: "ut-house-2", authorHash: authorHash(UID, "ut-house-2"), status: "verified", method: "location_match" }];
  eq((await handleStart(start("ut-sd-3", UID), startDeps({ rows: loc }).deps)).status, 200,
     "a location_match row on another seat does not spend the check");
  // Another account's vendor row spends nothing for this one.
  const bob = [{ seatKey: "ut-house-2", authorHash: authorHash("uid-bob", "ut-house-2"), status: "verified", method: "vendor" }];
  eq((await handleStart(start("ut-sd-3", UID), startDeps({ rows: bob }).deps)).status, 200,
     "someone else's vendor row does not spend this account's check");
}
{
  // THE PROOF BUTTON: the board GET answers canVerify for any signed-in, unverified reader.
  const get = (alias, token) => new Request(`https://politidex.fyi/api/district-board-voice?seat=${alias}`, {
    headers: token ? { authorization: "Bearer " + token } : {},
  });
  const readVoice = async (rows, membership, alias, token) => {
    const s = boardDeps(rows);
    s.deps.findMembership = async () => membership;
    const d = await (await handleVoice(get(alias, token), s.deps)).json();
    return d.voice;
  };
  for (const alias of Object.keys(CLUSTER)) {
    for (const [who, token] of [["signed out", null], ["anonymous", "anon"]]) {
      const v = await readVoice([], MEMBER, alias, token);
      eq(v.canVerify, false, `${who} on ${alias}: no proof button`);
      eq(v.line, "Only verified residents of this seat get a voice that counts.", `${who} on ${alias}: the locked line`);
    }
    for (const [who, membership] of NON_MEMBERS) {
      const v = await readVoice([], membership, alias, UID);
      eq(v.reason, "unverified", `${who} on ${alias}: unverified`);
      eq(v.canVerify, true, `${who} on ${alias}: the proof button shows`);
      eq(v.canPost, false, `${who} on ${alias}: box stays off`);
      eq(v.line, "Only verified residents of this seat get a voice that counts.", `${who} on ${alias}: the locked line`);
    }
    const m = await readVoice([], MEMBER, alias, UID);
    eq(m.canVerify, true, `member on ${alias}: the proof button shows`);
    eq(m.canPost, false, `member on ${alias}: …and the box is still off`);
    const text = JSON.stringify(m);
    ok(!/"member"|membership|subscription|\$/i.test(text), `member on ${alias}: no flag or price on the board wire`);
  }
  // Spent on UT-2: no button on SD-3, and the note says why without a price.
  const spent = [{ seatKey: "ut-house-2", authorHash: authorHash(UID, "ut-house-2"), status: "verified", method: "vendor" }];
  const sv = await readVoice(spent, MEMBER, "ut-sd-3", UID);
  eq(sv.canVerify, false, "member verified on UT-2 → no proof button on SD-3");
  ok(/already done/i.test(sv.note) && /this seat was not one of them/i.test(sv.note),
     "…the note says the one check already ran and did not cover this seat");
  ok(!/\$|member/i.test(sv.note), "…with no price and no plan name");
  const home = await readVoice(spent, MEMBER, "ut-cd-2", UID);
  eq(home.canPost, true, "member verified on UT-2 → UT-2 open");
  eq(home.canVerify, false, "…and no proof button there either");
}
{
  // UNSIGNED AND WRONG-SEAT DECISIONS WRITE NOTHING — whatever the flag says.
  for (const [name, req] of [
    ["unsigned", hook(decision(), { sig: null })],
    ["badly signed", hook(decision(), { secret: "nope" })],
    ["wrong seat (no board)", hook(decision({}, "ut-statehouse-57"))],
    ["wrong seat (alias)", hook(decision({}, "ut-sd-3"))],
  ]) {
    const s = residencyStore();
    await handleWebhook(req, hookDeps(s));
    eq(s.writes.length, 0, `${name} decision: nothing written`);
    eq(s.rows.length, 0, `${name} decision: no residency row`);
  }
  ok(!/findMembership|voiceMembership|memberFor/.test(R("netlify/functions/residency-webhook.mts")),
     "the residency webhook does not read membership");
  ok(!/voiceResidency/.test(R("netlify/functions/membership-webhook.mts")), "the payment webhook cannot reach residency");
}
{
  // A MEMBER WITH NO VENDOR ROW IS STILL 403 ON COMMENT AND POLL — and a member
  // verified on a neighbour seat cannot post here.
  for (const [alias, seat] of Object.entries(CLUSTER)) {
    for (const [label, rows] of [
      ["no row", []],
      ["a location_match row", [{ seatKey: seat, authorHash: authorHash(UID, seat), status: "verified", method: "location_match" }]],
      ["a pending row", [{ seatKey: seat, authorHash: authorHash(UID, seat), status: "pending", method: "vendor" }]],
      ["a neighbour seat's vendor row", Object.values(CLUSTER).filter((k) => k !== seat).slice(0, 1)
        .map((k) => ({ seatKey: k, authorHash: authorHash(UID, k), status: "verified", method: "vendor" }))],
    ]) {
      const s = boardDeps(rows); // boardDeps answers an ACTIVE membership
      const c = await handleVoice(boardPost("/api/district-board-voice", { seat: alias, issueKey: "housing", body: "Hi" }, UID), s.deps);
      eq(c.status, 403, `member with ${label} → ${alias} comment 403`);
      const v = await handlePoll(boardPost("/api/district-board-poll", { seat: alias, issueKey: "housing", choice: "support" }, UID), s.deps);
      eq(v.status, 403, `member with ${label} → ${alias} vote 403`);
      eq(s.posts.length + s.votes.length, 0, `member with ${label} → ${alias}: nothing written`);
    }
  }
}
{
  // /ME SAYS IT IN ONE LINE.
  const ME = R("me.html");
  const block = (ME.match(/<!-- pdx:me-membership:begin[\s\S]*?<!-- pdx:me-membership:end -->/) || [""])[0];
  const text = block.replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const lines = [...block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => m[1]);
  const one = lines.filter((l) => /one ID and address check covers every board seat your saved location names/i.test(l));
  eq(one.length, 1, "/me: one line says one check covers every seat the saved location names");
  ok(/a second check is not included/i.test(one[0] || ""), "…and that a second check is not included");
  ok(/membership does not verify residency and does not open a seat/i.test(text), "/me: membership does not open a seat");
  ok(!/membership (opens|unlocks|verifies) (the|a|your) seat/i.test(text), "/me: never says membership opens the seat");
  ok(!/\$3\b|a month\s*—|\/month|per month/i.test(text), "/me: no monthly price is added");
  const copy = [text, R("district-composer.js"), JSON.stringify((await import("../netlify/lib/residency-vendor-core.mjs")).COPY)].join("\n");
  for (const w of ["stock", "stocks", "unit", "units", "share", "shares", "earn", "earns", "profit", "profits",
                   "Form C", "investor", "investors", "equity"]) {
    ok(!new RegExp(`\\b${w.replace(/ /g, "\\s+")}\\b`, "i").test(copy), `no "${w}" on /me's block, the composer or the vendor copy`);
  }
  const boards = readdirSync(ROOT).filter((f) => /^district-[a-z]{2}-(?:(?:hd|sd|cd)-\d+|gov|us-senate-[a-z][a-z0-9_]*)\.html$/.test(f)).concat(["district-composer.js"]);
  // The board's one cap sentence names the $20 membership and links nothing; it
  // is lifted out first, so any other $20, checkout or membership call fails.
  const CAP_LINE = /Verified residents get one comment and five poll votes a month on this seat\. (?:' \+\s*')?A \$20 yearly membership removes the monthly cap\./g;
  // THE ONE PLAIN MEMBERSHIP LINK (v428): district-composer.js names /api/membership
  // and "Become a member" for the link under the locked line — no price, no
  // checkout. Exactly those three places are set aside; any other $20, checkout,
  // membership call or join wording on a board still fails.
  const PLAIN_LINK = (src) => src
    .replace(/   ONE PLAIN DOOR TO MEMBERSHIP \(v428\)\.[\s\S]*?it never opens a seat\./, "")
    .replace("var MEMBER_API = '/api/membership';", "")
    .replace("var MEMBER_LINK = 'Become a member';", "");
  const pay = boards.filter((f) => /\/api\/membership|checkout\.stripe|\$20|become a member/i.test(PLAIN_LINK(R(f).replace(CAP_LINE, ""))));
  eq(pay.length, 0, `no board has a pay button — ${JSON.stringify(pay)}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · one check covers every composer seat the saved location resolves");
// ═════════════════════════════════════════════════════════════════════════════
// TEST LOCATION: what the hallway's seatsForMe() hands district-composer.js —
// the five Layton-cluster seats, a seat with no board, and a statewide row that
// composes no seat key. Test-only; not a real address.
const RESOLVED_ALL = ["ut-statehouse-15", "ut-statehouse-57", "ut-house-2", "", "ut-statesenate-3",
                      "ut-statehouse-16", "ut-statesenate-7"];
const startWith = (seat, token, seats) => new Request("https://politidex.fyi/api/residency-verify", {
  method: "POST",
  headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) },
  body: JSON.stringify({ seat, seats }),
});
const boardGet = (alias, token, deps) => handleVoice(new Request(`https://politidex.fyi/api/district-board-voice?seat=${alias}`,
  { headers: token ? { authorization: "Bearer " + token } : {} }), deps).then((r) => r.json()).then((d) => d.voice);
// Start for real, then hand the webhook the vendor_data the start bound.
async function startThenDecide(alias, resolved, store) {
  const t = startDeps({ rows: store.rows });
  const res = await handleStart(startWith(alias, UID, resolved), t.deps);
  eq(res.status, 200, `start on ${alias} with a resolved location is 200`);
  const vd = JSON.parse(t.calls[0].body).vendor_data;
  const d = decision();
  d.vendor_data = vd;
  d.decision.vendor_data = vd;
  return { vd, res: await handleWebhook(hook(d), hookDeps(store)) };
}
{
  // AN APPROVED UT-2 DECISION WRITES A VERIFIED ROW FOR EVERY RESOLVED SEAT.
  const store = residencyStore();
  const { vd, res } = await startThenDecide("ut-cd-2", RESOLVED_ALL, store);
  const bound = JSON.parse(vd);
  eq(bound.seat, "ut-house-2", "the session's own seat is UT-2");
  eq(bound.seats[0], "ut-house-2", "…and it is first in the covered list");
  eq(bound.seats.slice().sort().join(","), Object.values(CLUSTER).concat(STATEWIDE).sort().join(","),
     "the session covers exactly the five composer seats the location resolved, and the statewide seats");
  ok(!bound.seats.includes("ut-statehouse-57"), "…a resolved seat with no board is dropped");
  const out = await res.json();
  eq(out.written, true, "the webhook reports a write");
  eq(out.seats, 8, "…for eight seats");
  eq(store.writes.length, 8, "eight residency writes");
  for (const seat of Object.values(CLUSTER)) {
    const r = store.rows.find((x) => x.seatKey === seat && x.authorHash === authorHash(UID, seat));
    ok(!!r && r.status === "verified" && r.method === "vendor", `UT-2 decision → verified vendor row on ${seat}`);
  }
  ok(!store.rows.some((r) => r.seatKey === "ut-statehouse-57"), "no row on a seat without a board");
  ok(!store.rows.some((r) => !Object.values(CLUSTER).concat(STATEWIDE).includes(r.seatKey)),
     "…and no row on any seat the session did not bind");
  ok(store.writes.every((w) => Object.keys(w).sort().join(",") === "hash,seatKey"), "nothing from the vendor reaches any write");

  // A SECOND START OPENS NO SESSION ONCE ANY VERIFIED ROW EXISTS — on every board.
  for (const alias of Object.keys(CLUSTER)) {
    const t = startDeps({ rows: store.rows });
    const r = await handleStart(startWith(alias, UID, RESOLVED_ALL), t.deps);
    const d = await r.json();
    ok(r.status === 200 && d.verified === true, `${alias}: a second start answers already verified (${r.status})`);
    eq(t.calls.length, 0, `${alias}: no second Didit session`);
  }
  for (const alias of Object.keys(CLUSTER)) {
    const v = await boardGet(alias, UID, boardDeps(store.rows).deps);
    eq(v.canVerify, false, `${alias}: canVerify false after the one check`);
    eq(v.canPost, true, `${alias}: the composer opens on a covered seat`);
  }
}
{
  // A BOARD WHOSE SEAT HAS A ROW OPENS; A BOARD WHOSE SEAT DOES NOT STILL REFUSES.
  const store = residencyStore();
  await startThenDecide("ut-cd-2", ["ut-statehouse-15", "ut-statesenate-7", "ut-house-2"], store);
  eq(store.writes.length, 6, "a location resolving three composer seats writes those three and the three statewide seats");
  const covered = ["ut-cd-2", "ut-hd-15", "ut-sd-7"];
  for (const alias of Object.keys(CLUSTER)) {
    const s = boardDeps(store.rows);
    const c = await handleVoice(boardPost("/api/district-board-voice", { seat: alias, issueKey: "housing", body: "Hi" }, UID), s.deps);
    const v = await handlePoll(boardPost("/api/district-board-poll", { seat: alias, issueKey: "housing", choice: "support" }, UID), s.deps);
    if (covered.includes(alias)) {
      eq(c.status, 201, `${alias} covered: comment opens`);
      eq(v.status, 200, `${alias} covered: vote opens`);
    } else {
      eq(c.status, 403, `${alias} not covered: comment still 403`);
      eq(v.status, 403, `${alias} not covered: vote still 403`);
      eq(s.posts.length + s.votes.length, 0, `${alias} not covered: nothing written`);
      const g = await boardGet(alias, UID, s.deps);
      eq(g.canVerify, false, `${alias} not covered: no proof button (the one check already ran)`);
      ok(/this seat was not one of them/i.test(g.note), `${alias} not covered: the note says why`);
      // And a start there is refused outright.
      const t = startDeps({ rows: store.rows });
      const r = await handleStart(startWith(alias, UID, RESOLVED_ALL), t.deps);
      eq(r.status, 403, `${alias} not covered: a second start is 403`);
      eq((await r.json()).code, "already_checked", `${alias} not covered: …already_checked`);
      eq(t.calls.length, 0, `${alias} not covered: no second Didit session`);
    }
  }
  const bob = boardDeps(store.rows);
  eq((await handleVoice(boardPost("/api/district-board-voice", { seat: "ut-hd-15", issueKey: "housing", body: "Hi" }, "uid-bob"), bob.deps)).status,
     403, "alice's check opens nothing for bob");
  eq((await boardGet("ut-hd-15", "uid-bob", bob.deps)).canVerify, true, "…and bob can still start his own");
}
{
  // THE BOARD'S OWN SEAT IS ALWAYS COVERED, even if the location did not name it.
  const store = residencyStore();
  await startThenDecide("ut-sd-3", ["ut-statehouse-15"], store);
  eq(store.writes.map((w) => w.seatKey).join(","), bound("ut-statesenate-3", ["ut-statehouse-15"]).join(","),
     "the session's seat first, then the resolved composer seats, then the statewide seats");
}
{
  // A DIDIT DECISION OPENS THE SEATS ITS SESSION BOUND AND NO OTHER — its own
  // seat and the three statewide seats. A generated board's check opens the
  // governor and both U.S. Senate boards; a statewide board's check opens the
  // other two. Every other composer seat still refuses and writes nothing.
  for (const [alias, seat] of [["ut-hd-29", "ut-statehouse-29"], ["ut-gov", "ut-gov"], ["ut-sd-6", "ut-statesenate-6"],
                               ["ut-us-senate-lee", "ut-us-senate-lee"]]) {
    const store = residencyStore();
    await startThenDecide(alias, [], store);
    const want = bound(seat);
    eq(store.writes.map((w) => w.seatKey).join(","), want.join(","), `${alias} decision: rows for ${want.join(", ")}`);
    eq(store.rows[0] && store.rows[0].authorHash, seatHash(UID, seat), `${alias} decision: …under each seat's own hash`);
    const opened = [];
    const leaked = [];
    for (const [k, other] of Object.entries(COMPOSER_SEATS)) {
      const s = boardDeps(store.rows);
      const c = await handleVoice(boardPost("/api/district-board-voice", { seat: other, issueKey: "housing", body: "Hi" }, UID), s.deps);
      const v = await handlePoll(boardPost("/api/district-board-poll", { seat: other, issueKey: "housing", choice: "support" }, UID), s.deps);
      if (want.includes(k)) { if (c.status === 201 && v.status === 200) opened.push(k); }
      else if (c.status !== 403 || v.status !== 403 || s.posts.length + s.votes.length) leaked.push(other);
    }
    eq(opened.sort().join(","), want.slice().sort().join(","), `${alias} decision: comment and vote open on every bound seat`);
    eq(leaked.length, 0, `${alias} decision: every other seat still 403 and writes nothing — ${JSON.stringify(leaked)}`);
  }
}
{
  // A REVOKED ROW IS NEVER OVERTURNED: on the session's seat it stops the whole
  // decision, on another covered seat only that seat is skipped.
  const vd = JSON.stringify({ uid: UID, seat: "ut-house-2", seats: ["ut-house-2", "ut-statehouse-15"] });
  const withVd = () => { const d = decision(); d.vendor_data = vd; d.decision.vendor_data = vd; return d; };
  const own = residencyStore([{ seatKey: "ut-house-2", authorHash: authorHash(UID, "ut-house-2"), status: "revoked", method: "vendor" }]);
  await handleWebhook(hook(withVd()), hookDeps(own));
  eq(own.writes.length, 0, "revoked on the session's seat → nothing written anywhere");
  const other = residencyStore([{ seatKey: "ut-statehouse-15", authorHash: authorHash(UID, "ut-statehouse-15"), status: "revoked", method: "vendor" }]);
  await handleWebhook(hook(withVd()), hookDeps(other));
  eq(other.writes.map((w) => w.seatKey).join(","), "ut-house-2", "revoked on a covered seat → that seat skipped, the rest written");
  eq(other.rows.find((r) => r.seatKey === "ut-statehouse-15").status, "revoked", "…and it stays revoked");
}
{
  // A COVERED LIST CAN ONLY NAME COMPOSER SEATS. Aliases, padded keys and seats
  // with no board inside a signed vendor_data are dropped; the session's seat
  // is still required.
  const vd = JSON.stringify({ uid: UID, seat: "ut-house-2",
    seats: ["ut-sd-3", " ut-statehouse-15", "ut-statehouse-57", "ut-us-senate-mlee", " ut-gov", 7, null, "ut-statesenate-7", "ut-gov"] });
  eq(parseVendorData(vd).seats.join(","), "ut-house-2,ut-statesenate-7,ut-gov", "only exact canonical composer keys survive");
  eq(parseVendorData(JSON.stringify({ uid: UID, seats: ["ut-house-2"] })), null, "no session seat → no decision");
  eq(parseVendorData(JSON.stringify({ uid: UID, seat: "ut-statehouse-57", seats: ["ut-house-2"] })), null,
     "a session seat with no board → no decision, whatever the list says");
}
{
  // SIGNED-OUT STARTS AND UNSIGNED WEBHOOKS STILL WRITE NOTHING.
  for (const [who, token] of [["signed out", null], ["anonymous", "anon"]]) {
    const t = startDeps();
    const r = await handleStart(startWith("ut-cd-2", token, RESOLVED_ALL), t.deps);
    eq(r.status, 403, `${who}: start with a resolved location is 403`);
    eq(t.calls.length + t.store.writes.length, 0, `${who}: no session and nothing written`);
  }
  const vd = JSON.stringify({ uid: UID, seat: "ut-house-2", seats: Object.keys(COMPOSER_SEATS) });
  for (const [name, opts] of [["unsigned", { sig: null }], ["badly signed", { secret: "nope" }], ["stale", { ts: NOW_S - 600 }]]) {
    const d = decision(); d.vendor_data = vd; d.decision.vendor_data = vd;
    const s = residencyStore();
    const r = await handleWebhook(hook(d, opts), hookDeps(s));
    eq(r.status, 401, `${name} five-seat webhook: 401`);
    eq(s.writes.length + s.rows.length, 0, `${name} five-seat webhook: nothing written`);
  }
}
{
  // THE BOARD SENDS THE HALLWAY'S SEATS. district-composer.js reads
  // PDXVoice.seatsForMe() and the five boards load the resolver it reads.
  const DC = R("district-composer.js");
  ok(/seats:\s*resolvedSeats\(\)/.test(DC), "district-composer.js sends the resolved seats with the start");
  ok(/V\.seatsForMe\(\)/.test(DC), "…read from district-voice.js seatsForMe()");
  for (const alias of Object.keys(CLUSTER)) {
    const srcs = [...R(`district-${alias}.html`).matchAll(/\bsrc="([^"]*)"/g)].map((m) => m[1]);
    const at = (u) => srcs.indexOf(u);
    ok(at("/voter-hub-location.js") >= 0 && at("/district-voice.js") > at("/voter-hub-location.js"),
       `district-${alias}.html loads the hallway resolver (voter-hub-location.js, then district-voice.js)`);
    ok(at("/district-voice.js") < at("/district-composer.js"), `district-${alias}.html: …before the composer`);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
