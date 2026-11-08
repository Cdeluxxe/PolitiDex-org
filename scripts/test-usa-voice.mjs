#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-usa-voice.mjs — USA Voice, the one national board at /usa
// ─────────────────────────────────────────────────────────────────────────────
// Drives the real Didit start, the real signed webhook, and the real comment
// and poll handlers for seat "usa" against in-memory fakes. Also checks that the
// board is on the homepage and in the board switcher, that /usa is the only new
// route, that the district rules did not move, and that the worker was bumped.
//
//   node scripts/test-usa-voice.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  handleStart,
  handleWebhook,
  sign,
  canonicalJson,
  decisionPassed,
  nationalDecisionPassed,
  parseVendorData,
  coveredSeats,
} from "../netlify/lib/residency-vendor-core.mjs";
import {
  COMPOSER_SEATS,
  NATIONAL_SEAT,
  anyVerifiedSeat,
  composerSeat,
  handle as handleVoice,
  seatHash,
} from "../netlify/lib/district-board-voice-core.mjs";
import { handle as handlePoll } from "../netlify/lib/district-board-poll-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let pass = 0;
let fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error("  ✗ " + m); } };
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const section = (t) => console.log("── " + t);

const SECRET = "test-webhook-secret-not-a-secret";
const NOW = new Date("2026-11-08T12:00:00Z");
const NOW_S = Math.floor(NOW.getTime() / 1000);
const UID = "uid-usa-reader-000000000000000";
const USER = { uid: UID, isAnonymous: false };

// ── the fakes ───────────────────────────────────────────────────────────────
function store(rows = []) {
  const s = { rows: rows.map((r) => ({ ...r })), writes: [], posts: [], votes: [], sessions: [] };
  s.find = async (seatKey, hash) => s.rows.find((r) => r.seatKey === seatKey && r.authorHash === hash) || null;
  s.findVendorVerified = async (pairs) => s.rows.filter((r) => pairs.some((p) => p.seatKey === r.seatKey && p.authorHash === r.authorHash));
  s.writeVerified = async (seatKey, hash) => {
    s.writes.push({ seatKey, hash });
    const r = s.rows.find((x) => x.seatKey === seatKey && x.authorHash === hash);
    if (r) { if (r.status !== "revoked") { r.status = "verified"; r.method = "vendor"; } }
    else s.rows.push({ seatKey, authorHash: hash, status: "verified", method: "vendor" });
  };
  return s;
}
const vendorRow = (seatKey, status = "verified") => ({ seatKey, authorHash: seatHash(UID, seatKey), status, method: "vendor" });

function voiceDeps(s, user = USER) {
  return {
    verifyUser: async () => user,
    findResidency: s.find,
    findVendorVerified: s.findVendorVerified,
    issueExists: async (k) => k === "healthcare" || k === "campaign_finance",
    listPosts: async (seatKey) => s.posts.filter((p) => p.seatKey === seatKey && p.issueKey),
    listGeneral: async (seatKey, pid) => s.posts.filter((p) => p.seatKey === seatKey && p.holderPid === pid),
    insertPost: async (v) => { const row = { id: s.posts.length + 1, createdAt: NOW.toISOString(), ...v }; s.posts.push(row); return row; },
    findMembership: async () => null,
    countPostsSince: async () => 0,
    findTake: async (id) => s.posts.find((p) => p.id === id) || null,
    insertLike: async () => true,
    likeCounts: async () => [],
    countVotes: async () => [],
    myVotes: async () => [],
    countVotesSince: async () => 0,
    upsertVote: async (v) => { s.votes.push(v); return true; },
    now: () => NOW,
  };
}
const get = (q) => new Request("https://politidex.fyi/api/x?" + q, { method: "GET" });
const post = (body) => new Request("https://politidex.fyi/api/x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const read = async (res) => ({ status: res.status, data: await res.json() });

function decision({ status = "Approved", ids, poa, seat = NATIONAL_SEAT } = {}) {
  const vd = JSON.stringify({ uid: UID, seat, seats: [seat] });
  const d = {
    session_id: "sess-usa",
    status,
    vendor_data: vd,
    id_verifications: ids || [{ status: "Approved", document_type: "Driving License", issuing_state: "USA", issuing_state_name: "United States of America" }],
  };
  if (poa !== undefined) d.poa_verifications = poa;
  return { webhook_type: "status.updated", session_id: "sess-usa", status, vendor_data: vd, decision: d };
}
const hook = (payload) => {
  const raw = JSON.stringify(payload);
  return new Request("https://politidex.fyi/api/residency-webhook", {
    method: "POST",
    headers: { "content-type": "application/json", "x-timestamp": String(NOW_S), "x-signature-v2": sign(SECRET, canonicalJson(payload)) },
    body: raw,
  });
};
const hookDeps = (s) => ({ config: () => ({ webhookSecret: SECRET }), findResidency: s.find, writeVerified: s.writeVerified, now: () => NOW });

// ─────────────────────────────────────────────────────────────────────────────
section("1 · the national seat is one named seat, outside the district list");
eq(NATIONAL_SEAT, "usa", "the national seat key is usa");
eq(composerSeat("usa"), "usa", "composerSeat() admits usa");
eq(composerSeat("USA "), "usa", "composerSeat() normalizes case and space");
ok(!Object.prototype.hasOwnProperty.call(COMPOSER_SEATS, "usa"), "usa is not a district composer seat");
ok(seatHash(UID, "usa").length === 32, "a national author hash exists");
ok(seatHash(UID, "usa") !== seatHash(UID, "ut-statesenate-3"), "the national hash is not a district hash");
eq(JSON.stringify(coveredSeats("usa", ["ut-statesenate-3", "ut-gov"])), JSON.stringify(["usa"]), "a national session covers usa and nothing else");
eq(JSON.stringify(parseVendorData(JSON.stringify({ uid: UID, seat: "usa", seats: ["usa", "ut-gov"] }))),
  JSON.stringify({ uid: UID, seat: "usa", seats: ["usa"] }), "national vendor_data parses to usa only");

// ─────────────────────────────────────────────────────────────────────────────
section("2 · the decision: an approved U.S. ID passes; non-U.S. and declined do not");
ok(nationalDecisionPassed(decision()), "approved session with a U.S. driver's license passes");
for (const [doc, st] of [["Passport", "USA"], ["Identity Card", "US"], ["Naturalization Certificate", "USA"], ["Residence Permit", "United States"]]) {
  ok(nationalDecisionPassed(decision({ ids: [{ status: "Approved", document_type: doc, issuing_state: st }] })), `approved U.S. ${doc} (${st}) passes`);
}
ok(nationalDecisionPassed(decision({ poa: [{ status: "Approved" }] })), "an address check is allowed but not needed");
ok(!nationalDecisionPassed(decision({ ids: [{ status: "Approved", document_type: "Passport", issuing_state: "CAN" }] })), "a Canadian passport is rejected");
ok(!nationalDecisionPassed(decision({ ids: [{ status: "Approved", document_type: "Passport", issuing_state: "MEX", issuing_state_name: "Mexico" }] })), "a Mexican passport is rejected");
ok(!nationalDecisionPassed(decision({ ids: [{ status: "Approved", document_type: "Passport", issuing_state: "USA", issuing_state_name: "Canada" }] })), "conflicting issuer fields are rejected");
ok(!nationalDecisionPassed(decision({ ids: [{ status: "Approved", document_type: "Passport" }] })), "a document with no issuing country is rejected");
ok(!nationalDecisionPassed(decision({ status: "Declined" })), "a declined session is rejected");
ok(!nationalDecisionPassed(decision({ ids: [{ status: "Declined", issuing_state: "USA" }] })), "a declined ID check is rejected");
ok(!nationalDecisionPassed(decision({ status: "In Review" })), "an in-review session is rejected");
ok(!nationalDecisionPassed(decision({ ids: [] })), "no ID check is rejected");
// The district rule did not move: it still needs the address check.
ok(!decisionPassed(decision({ seat: "ut-statesenate-3" })), "a district decision without an address check still fails");
ok(decisionPassed(decision({ seat: "ut-statesenate-3", poa: [{ status: "Approved" }] })), "a district decision with ID + address still passes");

// ─────────────────────────────────────────────────────────────────────────────
section("3 · the signed webhook writes usa only for an approved U.S. ID");
{
  const s = store();
  const r = await read(await handleWebhook(hook(decision()), hookDeps(s)));
  eq(r.data.written, true, "approved U.S. ID session: written");
  eq(s.writes.length, 1, "exactly one row written");
  eq(s.writes[0].seatKey, "usa", "the row is for usa");
  eq(s.writes[0].hash, seatHash(UID, "usa"), "under the national hash");
}
for (const [what, payload] of [
  ["non-U.S. document", decision({ ids: [{ status: "Approved", document_type: "Passport", issuing_state: "GBR" }] })],
  ["declined session", decision({ status: "Declined" })],
  ["approved envelope, declined ID", decision({ ids: [{ status: "Declined", issuing_state: "USA" }] })],
]) {
  const s = store();
  const r = await read(await handleWebhook(hook(payload), hookDeps(s)));
  eq(r.data.written, false, `${what}: nothing written`);
  eq(s.writes.length, 0, `${what}: no row`);
}
{
  const s = store([vendorRow("usa", "revoked")]);
  const r = await read(await handleWebhook(hook(decision()), hookDeps(s)));
  eq(r.data.written, false, "a revoked usa row is never overturned");
}
{
  // A district session still needs its address check — no national shortcut.
  const s = store();
  const r = await read(await handleWebhook(hook(decision({ seat: "ut-statesenate-3" })), hookDeps(s)));
  eq(r.data.written, false, "a district session without an address check still writes nothing");
}

// ─────────────────────────────────────────────────────────────────────────────
section("4 · the start reuses the same Didit session");
function startDeps(s, user = USER) {
  return {
    verifyUser: async () => user,
    config: () => ({ apiKey: "k", workflowId: "w" }),
    findResidency: s.find,
    findVendorVerified: s.findVendorVerified,
    createSession: async (url, headers, body) => { s.sessions.push({ url, body: JSON.parse(body) }); return { ok: true, data: { url: "https://verify.didit.me/session/abc" } }; },
    callbackUrl: (req, alias) => `https://politidex.fyi/${alias === "usa" ? "usa" : "district/" + alias}?residency=returned`,
  };
}
{
  const s = store();
  const r = await read(await handleStart(post({ seat: "usa", seats: ["ut-statesenate-3"] }), startDeps(s)));
  eq(r.status, 200, "an unverified reader gets a session");
  eq(r.data.url, "https://verify.didit.me/session/abc", "the vendor URL comes back");
  eq(s.sessions.length, 1, "one session created");
  eq(s.sessions[0].body.workflow_id, "w", "on the same configured workflow");
  eq(JSON.parse(s.sessions[0].body.vendor_data).seats.join(","), "usa", "bound to usa only");
  eq(s.sessions[0].body.callback, "https://politidex.fyi/usa?residency=returned", "and returns to /usa");
}
{
  const s = store([vendorRow("ut-statesenate-3")]);
  const r = await read(await handleStart(post({ seat: "usa" }), startDeps(s)));
  eq(r.data.verified, true, "a reader with an approved district check is already in");
  eq(s.sessions.length, 0, "and no second session is created");
}
{
  const s = store([vendorRow("usa")]);
  const r = await read(await handleStart(post({ seat: "usa" }), startDeps(s)));
  eq(r.data.verified, true, "a reader with a usa row is already in");
}
{
  const s = store();
  const r = await read(await handleStart(post({ seat: "usa" }), startDeps(s, null)));
  eq(r.status, 403, "signed out cannot start");
}
{
  // A national row does not count as a district check, so district rules hold.
  const s = store([vendorRow("usa")]);
  eq(await anyVerifiedSeat({ findVendorVerified: s.findVendorVerified }, UID), "", "a usa row is not a district check");
  const r = await read(await handleStart(post({ seat: "ut-sd-3" }), startDeps(s)));
  eq(r.status, 200, "a usa-verified reader can still start a district check");
  ok(!!r.data.url, "and gets a district session");
}

// ─────────────────────────────────────────────────────────────────────────────
section("5 · the room, the chat and the poll open on exactly that check");
async function voiceState(rows, user = USER) {
  const s = store(rows);
  const room = await read(await handleVoice(get("seat=usa&room=general"), voiceDeps(s, user)));
  const chat = await read(await handleVoice(get("seat=usa&issue=healthcare"), voiceDeps(s, user)));
  const poll = await read(await handlePoll(get("seat=usa"), voiceDeps(s, user)));
  return { s, room, chat, poll };
}
{
  const v = await voiceState([vendorRow("usa")]);
  eq(v.room.status, 200, "the room reads");
  eq(v.room.data.seat, "usa", "the room is usa's");
  eq(v.room.data.general.holder.name, "USA Voice", "the room's thread is the board's own");
  eq(v.room.data.voice.canPost, true, "approved U.S. ID: the room opens");
  eq(v.chat.data.voice.canPost, true, "approved U.S. ID: the chat opens");
  eq(v.poll.data.voice.canVote, true, "approved U.S. ID: the poll opens");
  const p = await read(await handleVoice(post({ seat: "usa", room: "general", body: "Hello, country." }), voiceDeps(v.s)));
  eq(p.status, 201, "a room comment is written");
  eq(p.data.post.body, "Hello, country.", "with its body");
  ok(!("authorHash" in p.data.post), "and no author on the wire");
  const c = await read(await handleVoice(post({ seat: "usa", issueKey: "healthcare", body: "Lower premiums." }), voiceDeps(v.s)));
  eq(c.status, 201, "an issue comment is written");
  const vt = await read(await handlePoll(post({ seat: "usa", issueKey: "healthcare", choice: "support" }), voiceDeps(v.s)));
  eq(vt.status, 200, "a vote is written");
  eq(v.s.votes[0].seatKey, "usa", "on usa");
}
{
  const v = await voiceState([vendorRow("ut-statehouse-16")]);
  eq(v.room.data.voice.canPost, true, "an approved district check also opens the room");
  eq(v.poll.data.voice.canVote, true, "and the poll");
}
for (const [what, rows, user] of [
  ["no check on file", [], USER],
  ["revoked on usa", [vendorRow("usa", "revoked"), vendorRow("ut-statesenate-3")], USER],
  ["a location match only", [{ seatKey: "usa", authorHash: seatHash(UID, "usa"), status: "verified", method: "location_match" }], USER],
  ["signed out", [vendorRow("usa")], null],
]) {
  const v = await voiceState(rows, user);
  eq(v.room.data.voice.canPost, false, `${what}: the room stays closed`);
  eq(v.poll.data.voice.canVote, false, `${what}: the poll stays closed`);
  ok(/U\.S\./.test(v.room.data.voice.line), `${what}: the locked line names the U.S. check`);
  const p = await read(await handleVoice(post({ seat: "usa", room: "general", body: "x" }), voiceDeps(v.s, user)));
  eq(p.status, 403, `${what}: a post is refused`);
  eq(v.s.posts.length, 0, `${what}: nothing written`);
  const vt = await read(await handlePoll(post({ seat: "usa", issueKey: "healthcare", choice: "oppose" }), voiceDeps(v.s, user)));
  eq(vt.status, 403, `${what}: a vote is refused`);
  eq(v.s.votes.length, 0, `${what}: no vote written`);
}
{
  const v = await voiceState([]);
  eq(v.room.data.voice.canVerify, true, "an unverified signed-in reader is offered the Didit check");
}
{
  // District boards are untouched: a usa row opens no district seat.
  const s = store([vendorRow("usa")]);
  const d = await read(await handleVoice(get("seat=ut-sd-3"), voiceDeps(s)));
  eq(d.data.voice.canPost, false, "a usa row does not open a district board");
  eq(d.data.voice.canVerify, true, "and the district check can still be started there");
  eq(d.data.voice.line, "Only verified residents of this seat get a voice that counts.", "the district locked line is unchanged");
}

// ─────────────────────────────────────────────────────────────────────────────
section("6 · the board is on the homepage and in the switcher");
const INDEX = R("index.html");
const VOICE = R("voice.html");
const USA = R("usa.html");
ok(/<a[^>]*href="\/usa"[^>]*>Open USA Voice<\/a>/.test(INDEX), "the homepage links /usa");
ok(/data-pdx-home-board="usa"[\s\S]{0,200}USA Voice/.test(INDEX), "the homepage card is labelled USA Voice");
for (const [name, html] of [["/voice", VOICE], ["/usa", USA]]) {
  const sw = (html.match(/<ul[^>]*data-pdx-board-switcher="1"[\s\S]*?<\/ul>/) || [""])[0];
  ok(!!sw, `${name}: carries the board switcher`);
  ok(/<a href="\/usa"[^>]*>USA Voice<\/a>/.test(sw), `${name}: the switcher lists USA Voice at /usa`);
  ok(/<a href="\/voice"[^>]*>District Voice<\/a>/.test(sw), `${name}: the switcher lists District Voice`);
}
ok(/<h1[^>]*>USA Voice<\/h1>/.test(USA), "/usa is titled USA Voice");
ok(/id="pdx-usa-voice" data-pdxus-seat="usa"/.test(USA), "/usa mounts the national board host");
ok(/<script defer src="\/usa-voice.js"><\/script>/.test(USA), "/usa loads usa-voice.js");
ok(!/(src|href)="(?!\/|https?:|#|data:)/.test(USA), "every same-origin path in usa.html is root-absolute");

// ─────────────────────────────────────────────────────────────────────────────
section("7 · no new routes but /usa, no new gates, no equity or membership language");
const TOML = R("netlify.toml");
ok(/from = "\/usa"\n\s*to = "\/usa.html"\n\s*status = 200/.test(TOML), "/usa rewrites to usa.html");
ok(/from = "\/usa\/"\n\s*to = "\/usa.html"/.test(TOML), "/usa/ is the same document");
ok(!/from = "\/usa\/\*/.test(TOML), "no /usa splat");
const fnPaths = readdirSync(join(ROOT, "netlify/functions")).join(",");
ok(!/usa|national/i.test(fnPaths), "no new Function");
const JS = R("usa-voice.js");
const userText = (s) => s.replace(/<!--[\s\S]*?-->/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
for (const [name, text] of [["usa.html", userText(USA)], ["usa-voice.js", userText(JS)], ["home card", (INDEX.match(/pdx:home-usa-voice:begin[\s\S]*?pdx:home-usa-voice:end/) || [""])[0]]]) {
  ok(!/\b(equity|equities|shares?|shareholders?|stake|dividends?|membership|become a member|members only|dues|\$\d)\b/i.test(text.replace(/data-pdx-[a-z-]+/g, "")), `${name}: no equity or membership language`);
}
for (const api of ["/api/district-board-voice", "/api/district-board-poll", "/api/residency-verify"]) {
  ok(JS.includes(`'${api}'`), `usa-voice.js reuses ${api}`);
}
ok(!/\/api\/(?!district-board-voice|district-board-poll|residency-verify)/.test(JS), "usa-voice.js calls no other endpoint");

// ─────────────────────────────────────────────────────────────────────────────
section("8 · the one migration, and the worker");
const MIG = readdirSync(join(ROOT, "netlify/database/migrations")).filter((f) => /usa_national_board/.test(f));
eq(MIG.length, 1, "one migration adds the national board row");
const SQL = R("netlify/database/migrations/" + MIG[0] + "/migration.sql");
ok(/national/.test(R("netlify/database/migrations/" + MIG[0] + "/snapshot.json")), "the migration carries its snapshot");
ok(/\('usa', 'US', 'national', 0, 'USA Voice'\)/.test(SQL), "the row is ('usa', 'US', 'national', 0, 'USA Voice')");
ok(/'house', 'statesenate', 'statehouse', 'gov', 'us-senate', 'national'/.test(SQL), "the seat-key check keeps every district class");
const SW = R("sw.js");
ok(/const CACHE_VERSION = 'v537';/.test(SW), "the worker moved to v537");
ok(SW.includes("'/usa.html',") && SW.includes("'/usa-voice.js',"), "the worker precaches /usa and its module");
ok(/const USA_NAV_RE = \/\^\\\/usa\\\/\?\$\/;/.test(SW), "the worker answers /usa offline with its own document");

console.log("");
if (fail) { console.error(`✗ usa voice: ${fail} failed, ${pass} passed`); process.exit(1); }
console.log(`✓ usa voice: all ${pass} assertions passed`);
