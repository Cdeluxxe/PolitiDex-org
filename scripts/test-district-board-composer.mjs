#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for the board composer — THE LAYTON CLUSTER TAKES A VOICE, FAIL CLOSED
// ─────────────────────────────────────────────────────────────────────────────
//   1. THE DOCUMENTS — SD-3, HD-16, SD-7, HD-15 and UT-2 carry the composer host
//      and its module; SD-6, every generated board (HD-29) and every statewide
//      board (ut-gov, both U.S. Senate seats) carry neither.
//   2. THE GATE — the real handler, driven against an in-memory store, for
//      EVERY composer seat. Every unverified POST is 403 and writes nothing; a
//      location_match row is not proof; a flag for one seat opens no other; only
//      a vendor-verified flag for THAT seat writes, and what goes out on the
//      wire has no person in it.
//   3. THE COUNTS ENDPOINT still aggregates and never selects a person row, and
//      reads the same store the composer writes.
//   4. THE ALLOW-LISTS — BOARD_ROUTES length unchanged, no splat.
//   5. district-board.js yields the posting slot only where the host exists.
//   6. THE SERVICE WORKER and the copy walls.
//
//   node scripts/test-district-board-composer.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import {
  COMPOSER_SEATS,
  LOCKED_LINE,
  handle,
  verifiedSeat,
} from "../netlify/lib/district-board-voice-core.mjs";
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

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the composer host is on the Layton cluster's boards and no other");
// ═════════════════════════════════════════════════════════════════════════════
const HOST = 'id="pdx-district-composer"';
const SCRIPT = 'src="/district-composer.js"';
// Board alias → canonical seat key. Named rows, the same five the core lists.
const CLUSTER = {
  "ut-sd-3": "ut-statesenate-3",
  "ut-hd-16": "ut-statehouse-16",
  "ut-sd-7": "ut-statesenate-7",
  "ut-hd-15": "ut-statehouse-15",
  "ut-cd-2": "ut-house-2",
};
const hostBlocks = {};
for (const alias of Object.keys(CLUSTER)) {
  const doc = R(`district-ut-${alias.slice(3)}.html`);
  eq(doc.split(HOST).length - 1, 1, `${alias}: the document has exactly one composer host`);
  ok(doc.includes(`data-pdxdc-seat="${alias}"`), `${alias}: …declared for its own seat`);
  eq(doc.split(SCRIPT).length - 1, 1, `${alias}: …and loads district-composer.js once`);
  ok(doc.indexOf(SCRIPT) > doc.indexOf('src="/district-board.js"'), `${alias}: …after district-board.js`);
  ok(doc.includes(".pdxdc-locked {"), `${alias}: …and styles the locked line`);
  const block = (doc.match(/<div id="pdx-district-composer"[\s\S]*?<\/section>/) || [""])[0];
  ok(/<textarea[^>]*\bdisabled\b/.test(block), `${alias}: the served box is disabled`);
  ok(block.includes(LOCKED_LINE), `${alias}: …with the locked line, verbatim`);
  ok(!/<form/i.test(block), `${alias}: …and no form is served that could submit without the module`);
  hostBlocks[alias] = block;
}
const hostBlock = Object.values(hostBlocks).join("\n");

const boards = readdirSync(ROOT).filter((f) => /^district-ut-.*\.html$/.test(f));
ok(boards.length > 80, `every board document is swept (${boards.length})`);
const clusterDocs = Object.keys(CLUSTER).map((a) => `district-ut-${a.slice(3)}.html`);
const others = boards.filter((f) => !clusterDocs.includes(f));
eq(others.length, boards.length - 5, "five documents are the cluster, every other is swept");
const leaking = others.filter((f) => { const s = R(f); return s.includes(HOST) || s.includes(SCRIPT); });
eq(leaking.length, 0, `no other board has the host or the module — ${JSON.stringify(leaking)}`);
for (const f of ["district-ut-hd-29.html", "district-ut-sd-6.html", "district-ut-gov.html",
                 "district-ut-us-senate-lee.html", "district-ut-us-senate-curtis.html"]) {
  const s = R(f);
  ok(!s.includes(HOST) && !s.includes(SCRIPT), `${f} stays a reader`);
}
const TPL = R("scripts/district-board.template.html");
ok(!TPL.includes(HOST) && !TPL.includes(SCRIPT), "the generator's template carries no composer");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the gate: unverified is 403 and writes nothing");
// ═════════════════════════════════════════════════════════════════════════════
const SEAT = "ut-statesenate-3";
eq(Object.keys(COMPOSER_SEATS).length, 5, "exactly five seats have a composer");
for (const [alias, seat] of Object.entries(CLUSTER)) eq(COMPOSER_SEATS[seat], alias, `…${alias} is one`);
const CLIENT_SEATS = (() => {
  const m = /var COMPOSER_SEATS = \{([^}]*)\}/.exec(R("district-composer.js"));
  return m ? [...m[1].matchAll(/'([a-z0-9-]+)'\s*:/g)].map((x) => x[1]).sort() : [];
})();
eq(CLIENT_SEATS.join(","), Object.keys(CLUSTER).sort().join(","), "the client paints on the same five named rows");
ok(!/\/district\/\*|RegExp|\bmatch\(/.test(R("netlify/lib/district-board-voice-core.mjs").split("export const COMPOSER_SEATS")[1].split("};")[0]),
   "the server list is rows, not a pattern");

function fakeStore(residencyRows) {
  const store = { inserts: [], posts: [] };
  store.deps = {
    async verifyUser(req) {
      const h = req.headers.get("authorization") || "";
      if (!h.startsWith("Bearer ")) return null;
      const t = h.slice(7);
      if (t === "anon") return { uid: "anon-uid", isAnonymous: true };
      return { uid: t, isAnonymous: false, email: `${t}@example.com`, name: "Real Name" };
    },
    async findResidency(seatKey, hash) {
      return residencyRows.find((r) => r.seatKey === seatKey && r.authorHash === hash) || null;
    },
    async issueExists(k) { return k === "housing" || k === "water"; },
    async listPosts() { return store.posts.slice(); },
    async insertPost(v) {
      store.inserts.push(v);
      const row = { id: store.inserts.length, issueKey: v.issueKey, body: v.body, createdAt: "2026-09-29T00:00:00Z" };
      store.posts.unshift({ ...row, authorHash: v.authorHash });
      return row;
    },
  };
  return store;
}
const post = (body, token) => new Request("https://politidex.fyi/api/district-board-voice", {
  method: "POST",
  headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) },
  body: JSON.stringify(body),
});
const get = (seat, token) => new Request(`https://politidex.fyi/api/district-board-voice?seat=${seat}`, {
  headers: token ? { authorization: "Bearer " + token } : {},
});
const GOOD = { seat: "ut-sd-3", issueKey: "housing", body: "Water rates on the east bench." };

const UID = "uid-alice";
const H = authorHash(UID, SEAT);
const cases = [
  ["signed out", [], null],
  ["anonymous session", [], "anon"],
  ["signed in, no residency row", [], UID],
  ["location_match verified (a typed location is not proof)",
    [{ seatKey: SEAT, authorHash: H, status: "verified", method: "location_match" }], UID],
  ["vendor pending", [{ seatKey: SEAT, authorHash: H, status: "pending", method: "vendor" }], UID],
  ["vendor revoked", [{ seatKey: SEAT, authorHash: H, status: "revoked", method: "vendor" }], UID],
  ["vendor verified for ANOTHER seat",
    [{ seatKey: "ut-statehouse-15", authorHash: authorHash(UID, "ut-statehouse-15"), status: "verified", method: "vendor" }], UID],
  ["vendor verified, but another person's row",
    [{ seatKey: SEAT, authorHash: authorHash("uid-bob", SEAT), status: "verified", method: "vendor" }], UID],
];
for (const [name, rows, token] of cases) {
  const s = fakeStore(rows);
  const res = await handle(post(GOOD, token), s.deps);
  eq(res.status, 403, `${name}: POST is 403`);
  eq(s.inserts.length, 0, `${name}: nothing written`);
  const data = await res.json();
  eq(data.error, LOCKED_LINE, `${name}: the refusal is the locked line`);
  // Even an unverified POST with a bad body is 403, not 400: the gate is asked first.
  const s2 = fakeStore(rows);
  const res2 = await handle(post({ seat: "ut-sd-3", issueKey: "nope", body: "" }, token), s2.deps);
  eq(res2.status, 403, `${name}: the gate answers before the body is judged`);
  eq(s2.inserts.length, 0, `${name}: …and writes nothing`);
}

// Every cluster seat: unverified is 403 and writes nothing; its own flag writes.
for (const [alias, seat] of Object.entries(CLUSTER)) {
  const h = authorHash(UID, seat);
  const refusals = [
    ["signed out", [], null],
    ["signed in, no residency row", [], UID],
    ["location_match verified", [{ seatKey: seat, authorHash: h, status: "verified", method: "location_match" }], UID],
    ["vendor pending", [{ seatKey: seat, authorHash: h, status: "pending", method: "vendor" }], UID],
  ];
  // A flag for a NEIGHBOUR in the cluster opens nothing here.
  const other = seat === SEAT ? "ut-statehouse-16" : SEAT;
  refusals.push(["vendor verified for a neighbouring cluster seat",
    [{ seatKey: other, authorHash: authorHash(UID, other), status: "verified", method: "vendor" }], UID]);
  for (const [name, rows, token] of refusals) {
    const s = fakeStore(rows);
    const res = await handle(post({ ...GOOD, seat: alias }, token), s.deps);
    eq(res.status, 403, `${alias}, ${name}: POST is 403`);
    eq(s.inserts.length, 0, `${alias}, ${name}: nothing written`);
    eq((await res.json()).error, LOCKED_LINE, `${alias}, ${name}: the refusal is the locked line`);
  }
  const s = fakeStore([{ seatKey: seat, authorHash: h, status: "verified", method: "vendor" }]);
  eq(verifiedSeat({ seatKey: seat, status: "verified", method: "vendor" }, seat), alias, `${alias}: verified_seat === ${alias}`);
  const res = await handle(post({ ...GOOD, seat: alias }, UID), s.deps);
  eq(res.status, 201, `${alias}: a verified resident of this seat posts`);
  eq(s.inserts.length, 1, `${alias}: …one row`);
  eq(s.inserts[0].seatKey, seat, `${alias}: …stored per seat, under ${seat}`);
  const g = await handle(get(alias), s.deps);
  eq(g.status, 200, `${alias}: anyone can read the posts`);
  eq((await g.json()).voice.canPost, false, `${alias}: …and a signed-out reader cannot post`);
}

// Every other board takes no post at all, verified or not.
for (const [alias, seat] of [["ut-hd-29", "ut-statehouse-29"], ["ut-sd-6", "ut-statesenate-6"],
                             ["ut-gov", "ut-gov"], ["ut-us-senate-mlee", "ut-us-senate-mlee"]]) {
  const s = fakeStore([{ seatKey: seat, authorHash: authorHash(UID, seat), status: "verified", method: "vendor" }]);
  const res = await handle(post({ ...GOOD, seat: alias }, UID), s.deps);
  eq(res.status, 404, `${alias} has no composer endpoint`);
  eq(s.inserts.length, 0, `${alias}: …and nothing is written`);
  eq((await handle(get(alias), s.deps)).status, 404, `${alias}: …nor a posts read`);
}

// THE ONE PATH THAT WRITES: vendor-verified for ut-sd-3.
const VERIFIED = [{ seatKey: SEAT, authorHash: H, status: "verified", method: "vendor" }];
eq(verifiedSeat(VERIFIED[0], SEAT), "ut-sd-3", "a vendor-verified row carries verified_seat === ut-sd-3");
eq(verifiedSeat({ ...VERIFIED[0], method: "location_match" }, SEAT), "", "a location_match row carries no verified seat");
{
  const s = fakeStore(VERIFIED);
  for (const [bad, why] of [[{ ...GOOD, issueKey: "not_an_issue" }, "unknown issue"],
                            [{ ...GOOD, issueKey: "" }, "no issue"],
                            [{ ...GOOD, body: "   " }, "empty body"],
                            [{ ...GOOD, body: "x".repeat(281) }, "281 characters"]]) {
    const res = await handle(post(bad, UID), s.deps);
    eq(res.status, 400, `verified, ${why}: 400`);
  }
  eq(s.inserts.length, 0, "no refused post was written");

  const res = await handle(post(GOOD, UID), s.deps);
  eq(res.status, 201, "verified resident of SD-3: 201");
  eq(s.inserts.length, 1, "…exactly one row written");
  eq(s.inserts[0].seatKey, SEAT, "…stored per seat, under the canonical key");
  eq(s.inserts[0].authorHash, H, "…under the seat-scoped hash, never the uid");
  const out = await res.json();
  eq(Object.keys(out.post).sort().join(","), "body,createdAt,id,issueKey,mine", "the returned post has five fields and no person");
}

// GET: open to all, and no person on the wire.
{
  const s = fakeStore(VERIFIED);
  await handle(post(GOOD, UID), s.deps);
  for (const [who, token, canPost] of [["signed out", null, false], ["unverified", "uid-bob", false], ["verified", UID, true]]) {
    const res = await handle(get("ut-sd-3", token), s.deps);
    eq(res.status, 200, `GET (${who}) reads`);
    const d = await res.json();
    eq(d.voice.canPost, canPost, `GET (${who}) canPost`);
    if (!canPost) eq(d.voice.line, LOCKED_LINE, `GET (${who}) prints the locked line`);
    eq(d.posts.length, 1, `GET (${who}) sees the post`);
    const wire = JSON.stringify(d);
    for (const leak of [H, UID, "uid-bob", "authorHash", "author_hash", "@example.com", "Real Name"]) {
      ok(!wire.includes(leak), `GET (${who}) wire carries no ${leak}`);
    }
    ok(!/"(?:email|address|name|uid|zip|userId)"\s*:/i.test(wire), `GET (${who}) wire has no person-shaped key`);
    eq(d.posts[0].mine, who === "verified", `GET (${who}) 'mine' is computed server-side`);
  }
}

// NOTHING CAN FAKE VERIFIED. No env switch, no test hook, no residency writer.
const CORE = R("netlify/lib/district-board-voice-core.mjs");
const FNV = R("netlify/functions/district-board-voice.mts");
ok(!/process\.env|Netlify\.env/.test(CORE + FNV), "no environment switch can open the gate");
ok(!/insert\(voiceResidency\)|update\(voiceResidency\)/.test(FNV), "the composer's Function never writes a residency row");
ok(!/\.update\(|\.delete\(/.test(FNV), "…and never updates or deletes anything");
ok(/insert\(voiceTakes\)/.test(FNV), "posts land in voice_takes");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the counts endpoint never returns a person row");
// ═════════════════════════════════════════════════════════════════════════════
const FN = R("netlify/functions/district-board.mts");
const selects = [...FN.matchAll(/\.select\(\{([\s\S]*?)\}\)/g)].map((m) => m[1]);
ok(selects.length >= 8, `the endpoint's selects are all found (${selects.length})`);
for (const sel of selects) {
  const fields = sel.split(",").map((x) => x.trim()).filter(Boolean);
  for (const f of fields) {
    const okField = /^v:\s*countDistinct\(/.test(f) || /^issueKey:\s*\w+\.issueKey$/.test(f);
    ok(okField, `every selected field is an aggregate or an issue key — ${f}`);
  }
}
ok(!/\.insert\(|\.update\(|\.delete\(|\.returning\(/.test(FN), "the counts endpoint cannot write");
ok(!/authorHash\s*[,}]|userId\s*[,}]|\.body\b/.test(FN.replace(/countDistinct\([^)]*\)/g, "")),
   "no person column is read outside an aggregate");
ok(/countDistinct\(voiceTakes\.authorHash\)[\s\S]*?\.from\(voiceTakes\)[\s\S]*?eq\(voiceTakes\.seatKey, seat\)/.test(FN),
   "band 2 counts voice_takes per seat — the store the composer writes");
{
  const seats = (FN.match(/const BOARD_SEATS[^=]*=\s*\{([\s\S]*?)\};/) || ["", ""])[1];
  for (const seat of Object.values(CLUSTER)) {
    ok(seats.includes(`"${seat}": 1`), `band 2 counts ${seat} — its posts move its own board's count`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the allow-lists did not grow");
// ═════════════════════════════════════════════════════════════════════════════
const dvWin = makeSandbox();
vm.runInContext(R("district-voice.js"), vm.createContext(dvWin), { filename: "district-voice.js" });
// 85 district rows + the three statewide Utah seats (governor, both U.S. Senate
// seats), which open as readers with no composer of their own.
eq(Object.keys(dvWin.PDXVoice.BOARD_ROUTES).length, 88, "BOARD_ROUTES length is unchanged");
eq(Object.keys(dvWin.PDXVoice.BOARD_ROUTES).length, boards.length, "…one row per board document");
ok(!/from\s*=\s*"\/district\/\*"/.test(R("netlify.toml")), "no /district/* splat");

// ═════════════════════════════════════════════════════════════════════════════
section("5 · district-board.js yields the posting slot only to a real host");
// ═════════════════════════════════════════════════════════════════════════════
function paintBoard(withComposer) {
  const w = makeSandbox();
  const mk = (id, attrs) => ({
    id, innerHTML: "", _a: attrs || {},
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._a, k) ? this._a[k] : null; },
    setAttribute(k, v) { this._a[k] = String(v); },
  });
  const els = { "pdx-district-board": mk("pdx-district-board", { "data-pdxdb-seat": "ut-sd-3" }) };
  if (withComposer) els["pdx-district-composer"] = mk("pdx-district-composer", { "data-pdxdc-seat": "ut-sd-3" });
  w.document.getElementById = (id) => els[id] || null;
  vm.runInContext(R("district-board.js"), vm.createContext(w), { filename: "district-board.js" });
  w.PDXDistrictBoard.mount(els["pdx-district-board"]);
  return els["pdx-district-board"].innerHTML;
}
const withHost = paintBoard(true);
const without = paintBoard(false);
ok(without.includes('data-pdxdb-compose="off"'), "a board without the host keeps the disabled seam");
ok(!withHost.includes('data-pdxdb-compose="off"'), "a composer board leaves the slot to its composer");
ok(withHost.includes("Who is in the room"), "…and still paints band 2");

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the service worker and the copy walls");
// ═════════════════════════════════════════════════════════════════════════════
const SW = R("sw.js");
ok(Number(((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]) || 0) >= 270, "the shell moved at least to v270");
ok(SW.includes("'/district-composer.js',"), "the composer module is precached");
ok(/v256[\s\S]*?MIGRATION COST: none/.test(SW), "the log says no migration");
ok(/v270 - THE LAYTON CLUSTER[\s\S]*?MIGRATION COST: none/.test(SW), "…and v270's log says no migration either");
const CLIENT = R("district-composer.js");
const BANNED = /\b(shares?|stocks?|units?|dues|equity|earn a share|dividend|invest(?:or|ment)?)\b|Reg CF|\d\s*%/i;
for (const [name, src] of [["district-composer.js", CLIENT], ["core", CORE], ["the cluster's composer hosts", hostBlock]]) {
  const m = String(src).match(BANNED);
  ok(!m, `${name}: no equity or percentage copy — found ${m && m[0]}`);
}
ok(!/localStorage/.test(CLIENT), "the composer keeps nothing on the device");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
