#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for the board poll — ONE POLL PER ISSUE GROUP, FAIL CLOSED
// ─────────────────────────────────────────────────────────────────────────────
//   1. THE DOCUMENTS — SD-3, HD-16, SD-7, HD-15 and UT-2 carry the poll host and
//      its module; HD-29, ut-gov and every other board carry neither.
//   2. THE GATE — the real handler against an in-memory store. Every unverified
//      vote is 403 and writes nothing; a neighbour seat's flag cannot vote here;
//      only a vendor-verified flag for THAT seat writes, once per issue.
//   3. THE WIRE — the tallies read (and the counts endpoint) never return a
//      person.
//   4. THE CLIENT — an open group gets the widget, a closed one only a count;
//      buttons are disabled with the locked line when the server says so.
//   5. THE STORE — migration, band 2, service worker, copy walls.
//
//   node scripts/test-district-board-poll.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { CHOICES, COMPOSER_SEATS, LOCKED_LINE, handle } from "../netlify/lib/district-board-poll-core.mjs";
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

const CLUSTER = {
  "ut-sd-3": "ut-statesenate-3",
  "ut-hd-16": "ut-statehouse-16",
  "ut-sd-7": "ut-statesenate-7",
  "ut-hd-15": "ut-statehouse-15",
  "ut-cd-2": "ut-house-2",
};

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the poll host is on the five composer boards and no other");
// ═════════════════════════════════════════════════════════════════════════════
const HOST = 'id="pdx-district-poll"';
const SCRIPT = 'src="/district-poll.js"';
for (const alias of Object.keys(CLUSTER)) {
  const doc = R(`district-ut-${alias.slice(3)}.html`);
  eq(doc.split(HOST).length - 1, 1, `${alias}: exactly one poll host`);
  ok(doc.includes(`data-pdxdp-seat="${alias}"`), `${alias}: …declared for its own seat`);
  eq(doc.split(SCRIPT).length - 1, 1, `${alias}: …and loads district-poll.js once`);
  ok(doc.indexOf(SCRIPT) > doc.indexOf('src="/district-board.js"'), `${alias}: …after district-board.js`);
}
const boards = readdirSync(ROOT).filter((f) => /^district-ut-.*\.html$/.test(f));
const clusterDocs = Object.keys(CLUSTER).map((a) => `district-ut-${a.slice(3)}.html`);
const leaking = boards.filter((f) => !clusterDocs.includes(f)).filter((f) => {
  const s = R(f); return s.includes(HOST) || s.includes(SCRIPT);
});
eq(leaking.length, 0, `no other board has the poll — ${JSON.stringify(leaking)}`);
for (const f of ["district-ut-hd-29.html", "district-ut-gov.html"]) {
  const s = R(f);
  ok(!s.includes(HOST) && !s.includes(SCRIPT), `${f} has no poll host`);
}
ok(!R("scripts/district-board.template.html").includes(HOST), "the generator's template carries no poll");
const CLIENT = R("district-poll.js");
const CLIENT_SEATS = (() => {
  const m = /var POLL_SEATS = \{([^}]*)\}/.exec(CLIENT);
  return m ? [...m[1].matchAll(/'([a-z0-9-]+)'\s*:/g)].map((x) => x[1]).sort() : [];
})();
eq(CLIENT_SEATS.join(","), Object.keys(CLUSTER).sort().join(","), "the client paints on the same five named rows");
eq(Object.keys(COMPOSER_SEATS).length, 5, "the server gate lists exactly five seats");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the gate: unverified is 403 and writes nothing");
// ═════════════════════════════════════════════════════════════════════════════
function fakeStore(residencyRows) {
  const store = { upserts: [], votes: new Map() };
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
    async countVotes(seatKey) {
      const g = new Map();
      for (const v of store.votes.values()) {
        if (v.seatKey !== seatKey) continue;
        const k = v.issueKey + "|" + v.choice;
        g.set(k, { issueKey: v.issueKey, choice: v.choice, v: (g.get(k)?.v || 0) + 1 });
      }
      return [...g.values()];
    },
    async myVotes(seatKey, hash) {
      return [...store.votes.values()].filter((v) => v.seatKey === seatKey && v.authorHash === hash)
        .map((v) => ({ issueKey: v.issueKey, choice: v.choice }));
    },
    async upsertVote(v) {
      store.upserts.push(v);
      store.votes.set(`${v.seatKey}|${v.issueKey}|${v.authorHash}`, { ...v });
    },
  };
  return store;
}
const API = "https://politidex.fyi/api/district-board-poll";
const post = (body, token) => new Request(API, {
  method: "POST",
  headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) },
  body: JSON.stringify(body),
});
const get = (seat, token) => new Request(`${API}?seat=${seat}`, {
  headers: token ? { authorization: "Bearer " + token } : {},
});
const UID = "uid-alice";

for (const [alias, seat] of Object.entries(CLUSTER)) {
  const h = authorHash(UID, seat);
  const GOOD = { seat: alias, issueKey: "housing", choice: "support" };
  const neighbour = seat === "ut-statesenate-3" ? "ut-statehouse-16" : "ut-statesenate-3";
  const refusals = [
    ["signed out", [], null],
    ["anonymous session", [], "anon"],
    ["signed in, no residency row", [], UID],
    ["location_match verified (a typed location is not proof)",
      [{ seatKey: seat, authorHash: h, status: "verified", method: "location_match" }], UID],
    ["vendor pending", [{ seatKey: seat, authorHash: h, status: "pending", method: "vendor" }], UID],
    ["vendor revoked", [{ seatKey: seat, authorHash: h, status: "revoked", method: "vendor" }], UID],
    ["vendor verified for a NEIGHBOUR seat",
      [{ seatKey: neighbour, authorHash: authorHash(UID, neighbour), status: "verified", method: "vendor" }], UID],
    // The neighbour's flag, even if a row were filed under this seat's key with
    // the neighbour's hash, is another identity and opens nothing.
    ["neighbour-seat hash filed under this seat",
      [{ seatKey: seat, authorHash: authorHash(UID, neighbour), status: "verified", method: "vendor" }], UID],
  ];
  for (const [name, rows, token] of refusals) {
    const s = fakeStore(rows);
    const res = await handle(post(GOOD, token), s.deps);
    eq(res.status, 403, `${alias}, ${name}: vote is 403`);
    eq(s.upserts.length, 0, `${alias}, ${name}: nothing written`);
    eq((await res.json()).error, LOCKED_LINE, `${alias}, ${name}: the refusal is the locked line`);
    const s2 = fakeStore(rows);
    const res2 = await handle(post({ seat: alias, issueKey: "nope", choice: "maybe" }, token), s2.deps);
    eq(res2.status, 403, `${alias}, ${name}: the gate answers before the vote is judged`);
    eq(s2.upserts.length, 0, `${alias}, ${name}: …and writes nothing`);
    const g = await (await handle(get(alias, token), s.deps)).json();
    eq(g.voice.canVote, false, `${alias}, ${name}: GET says the buttons stay off`);
    eq(g.voice.line, LOCKED_LINE, `${alias}, ${name}: …with the locked line`);
  }

  // The one path that writes: vendor-verified for THIS seat.
  const s = fakeStore([{ seatKey: seat, authorHash: h, status: "verified", method: "vendor" }]);
  for (const [bad, why] of [[{ ...GOOD, issueKey: "not_an_issue" }, "unknown issue"],
                            [{ ...GOOD, issueKey: "" }, "no issue"],
                            [{ ...GOOD, choice: "mixed" }, "a fourth choice"],
                            [{ ...GOOD, choice: "" }, "no choice"]]) {
    eq((await handle(post(bad, UID), s.deps)).status, 400, `${alias}, verified, ${why}: 400`);
  }
  eq(s.upserts.length, 0, `${alias}: no refused vote was written`);
  const r1 = await handle(post(GOOD, UID), s.deps);
  eq(r1.status, 200, `${alias}: a verified resident of this seat votes`);
  eq(s.upserts[0].seatKey, seat, `${alias}: …stored under the canonical seat key`);
  eq(s.upserts[0].authorHash, h, `${alias}: …under the seat-scoped hash, never the uid`);
  await handle(post({ ...GOOD, choice: "oppose" }, UID), s.deps);
  const d = await (await handle(get(alias, UID), s.deps)).json();
  const t = d.polls.find((p) => p.issueKey === "housing");
  eq(t.total, 1, `${alias}: changing a vote overwrites it — one person, one vote`);
  eq(t.oppose, 1, `${alias}: …and the count follows the change`);
  eq(d.mine.housing, "oppose", `${alias}: the caller sees their own vote`);
  // Stored per seat + issue: another issue is another poll.
  await handle(post({ ...GOOD, issueKey: "water", choice: "not_sure" }, UID), s.deps);
  const d2 = await (await handle(get(alias), s.deps)).json();
  eq(d2.polls.length, 2, `${alias}: one tally per issue`);
  eq(d2.voice.canVote, false, `${alias}: anyone can read the tallies, signed out`);
  eq(JSON.stringify(d2.mine), "{}", `${alias}: …and a signed-out reader is handed nobody's vote`);
}
eq(CHOICES.join(","), "support,oppose,not_sure", "the three choices are Support / Oppose / Not sure");

// Every other board takes no vote and has no tallies read, verified or not.
for (const [alias, seat] of [["ut-hd-29", "ut-statehouse-29"], ["ut-sd-6", "ut-statesenate-6"],
                             ["ut-gov", "ut-gov"], ["ut-us-senate-mlee", "ut-us-senate-mlee"]]) {
  const s = fakeStore([{ seatKey: seat, authorHash: authorHash(UID, seat), status: "verified", method: "vendor" }]);
  eq((await handle(post({ seat: alias, issueKey: "housing", choice: "support" }, UID), s.deps)).status, 404,
    `${alias} has no poll endpoint`);
  eq(s.upserts.length, 0, `${alias}: …and nothing is written`);
  eq((await handle(get(alias), s.deps)).status, 404, `${alias}: …nor a tallies read`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the tallies never return a person");
// ═════════════════════════════════════════════════════════════════════════════
{
  const seat = "ut-statesenate-3";
  const h = authorHash(UID, seat);
  const s = fakeStore([
    { seatKey: seat, authorHash: h, status: "verified", method: "vendor" },
    { seatKey: seat, authorHash: authorHash("uid-bob", seat), status: "verified", method: "vendor" },
  ]);
  await handle(post({ seat: "ut-sd-3", issueKey: "housing", choice: "support" }, UID), s.deps);
  await handle(post({ seat: "ut-sd-3", issueKey: "housing", choice: "oppose" }, "uid-bob"), s.deps);
  for (const [who, token] of [["signed out", null], ["unverified", "uid-carol"], ["verified", UID]]) {
    const wire = JSON.stringify(await (await handle(get("ut-sd-3", token), s.deps)).json());
    for (const leak of [h, authorHash("uid-bob", seat), UID, "uid-bob", "authorHash", "author_hash", "@example.com", "Real Name"]) {
      ok(!wire.includes(leak), `GET (${who}) carries no ${leak}`);
    }
    ok(!/"(?:email|address|name|uid|zip|userId|hash)"\s*:/i.test(wire), `GET (${who}) has no person-shaped key`);
  }
  const d = await (await handle(get("ut-sd-3"), s.deps)).json();
  eq(Object.keys(d.polls[0]).sort().join(","), "issueKey,not_sure,oppose,support,total", "a tally is five fields, all counts or the key");
}

// NOTHING CAN FAKE VERIFIED.
const CORE = R("netlify/lib/district-board-poll-core.mjs");
const FNP = R("netlify/functions/district-board-poll.mts");
ok(!/process\.env|Netlify\.env/.test(CORE + FNP), "no environment switch can open the gate");
ok(!/insert\(voiceResidency\)|update\(voiceResidency\)/.test(FNP), "the poll's Function never writes a residency row");
ok(!/\.delete\(/.test(FNP), "…and never deletes anything");
ok(/insert\(voicePollVotes\)/.test(FNP), "votes land in voice_poll_votes");
ok(/import \{[^}]*\bgate\b[^}]*\} from "\.\/district-board-voice-core\.mjs"/.test(CORE), "the poll uses the composer's own gate");
{
  const selects = [...FNP.matchAll(/\.select\(\{([\s\S]*?)\}\)/g)].map((m) => m[1]);
  for (const sel of selects) {
    ok(!/authorHash/.test(sel), `the poll Function never selects an author hash — ${sel.trim()}`);
  }
}

// THE COUNTS ENDPOINT, now reading this store too, still returns no person.
const FN = R("netlify/functions/district-board.mts");
ok(!/\.insert\(|\.update\(|\.delete\(|\.returning\(/.test(FN), "the counts endpoint cannot write");
ok(/countDistinct\(voicePollVotes\.authorHash\)[\s\S]*?\.from\(voicePollVotes\)/.test(FN), "band 3's per-issue polls count voice_poll_votes");
ok(/select\(\{ h: voicePollVotes\.authorHash \}\)[\s\S]*?\.as\("voice_people"\)/.test(FN), "band 2 counts voice_poll_votes in the voice union");
ok(/countDistinct\(voicePeople\.h\)/.test(FN), "…and the union is only ever aggregated");
{
  // Every TOP-LEVEL await db.select returns only aggregates or issue keys.
  const tops = [...FN.matchAll(/await db\s*\.select\(\{([\s\S]*?)\}\)/g)].map((m) => m[1]);
  ok(tops.length >= 8, `the endpoint's returning selects are found (${tops.length})`);
  for (const sel of tops) {
    for (const f of sel.split(",").map((x) => x.trim()).filter(Boolean)) {
      ok(/^v:\s*countDistinct\(/.test(f) || /^issueKey:\s*\w+\.issueKey$/.test(f), `returned field is a count or an issue key — ${f}`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the client: open groups get the poll, closed groups only a count");
// ═════════════════════════════════════════════════════════════════════════════
function fakeEl(tag, attrs) {
  const el = {
    tagName: tag, _a: { ...(attrs || {}) }, children: [], parentNode: null, open: false, textContent: "", _html: "",
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._a, k) ? this._a[k] : null; },
    setAttribute(k, v) { this._a[k] = String(v); },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this._a, k); },
    addEventListener() {},
    removeChild(c) { this.children = this.children.filter((x) => x !== c); c.parentNode = null; },
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
    querySelectorAll(sel) {
      const out = [];
      const test = (n) => {
        if (sel === "details[data-pdxdb-group]") return n.tagName === "details" && n.hasAttribute("data-pdxdb-group");
        if (sel === ".pdxdb-group-h") return n.tagName === "summary";
        const m = /^\[([a-z-]+)\]$/.exec(sel);
        return m ? n.hasAttribute(m[1]) : false;
      };
      const walk = (n) => { for (const c of n.children) { if (test(c)) out.push(c); walk(c); } };
      walk(this);
      return out;
    },
    insertAdjacentHTML(where, html) {
      const m = /^<(\w+)[^>]*?(data-pdxdp-[a-z]+)="([^"]*)"/.exec(html);
      const node = fakeEl(m[1], { [m[2]]: m[3] });
      node._html = html;
      if (where === "beforeend") { node.parentNode = this; this.children.push(node); }
      else { const p = this.parentNode; node.parentNode = p; p.children.splice(p.children.indexOf(this) + 1, 0, node); }
    },
  };
  return el;
}
function append(p, c) { c.parentNode = p; p.children.push(c); return c; }
async function paintPoll(payload) {
  const board = fakeEl("div", { id: "pdx-district-board" });
  const groups = {};
  for (const [key, open] of [["housing", true], ["water", false]]) {
    const d = append(board, fakeEl("details", { "data-pdxdb-group": key }));
    d.open = open;
    append(d, fakeEl("summary"));
    groups[key] = d;
  }
  const host = fakeEl("div", { id: "pdx-district-poll", "data-pdxdp-seat": "ut-sd-3" });
  const els = { "pdx-district-board": board, "pdx-district-poll": host };
  const w = {
    document: {
      readyState: "complete",
      getElementById: (id) => els[id] || null,
      addEventListener() {},
      createElement: () => fakeEl("style"),
      head: fakeEl("head"),
    },
    fetch: async () => ({ ok: true, status: 200, json: async () => payload }),
    PDXDistrictBoard: { issueLabel: (k) => ({ housing: "Housing", water: "Water" }[k] || "") },
  };
  w.window = w;
  vm.runInContext(CLIENT, vm.createContext(w), { filename: "district-poll.js" });
  await new Promise((r) => setTimeout(r, 10));
  return groups;
}
{
  const payload = {
    seat: "ut-sd-3", choices: CHOICES, mine: {},
    polls: [{ issueKey: "housing", support: 2, oppose: 1, not_sure: 0, total: 3 }, { issueKey: "water", support: 0, oppose: 1, not_sure: 0, total: 1 }],
    voice: { canVote: false, reason: "signed_out", line: LOCKED_LINE, note: "Sign in to start." },
  };
  const g = await paintPoll(payload);
  const openW = g.housing.querySelectorAll("[data-pdxdp-poll]");
  const closedW = g.water.querySelectorAll("[data-pdxdp-poll]");
  eq(openW.length, 1, "an open issue group carries one poll");
  eq(closedW.length, 0, "a closed issue group carries no widget");
  const cOpen = g.housing.querySelector("[data-pdxdp-count]");
  const cClosed = g.water.querySelector("[data-pdxdp-count]");
  eq(cClosed && cClosed.textContent, "1 vote", "a closed group shows its count only");
  eq(cOpen && cOpen.textContent, "3 votes", "an open group's header shows its count too");
  const html = openW[0]._html;
  for (const lb of ["Support", "Oppose", "Not sure"]) ok(html.includes(">" + lb), `the poll offers ${lb}`);
  eq((html.match(/<button[^>]*\bdisabled\b/g) || []).length, 3, "unverified: all three buttons are disabled");
  ok(html.includes(LOCKED_LINE), "…with the locked line");
  ok(html.includes("Housing"), "the poll is about that issue");

  const g2 = await paintPoll({ ...payload, mine: { housing: "support" }, voice: { canVote: true, reason: "verified", line: "", note: "" } });
  const h2 = g2.housing.querySelectorAll("[data-pdxdp-poll]")[0]._html;
  eq((h2.match(/<button[^>]*\bdisabled\b/g) || []).length, 0, "verified (server says so): the buttons are live");
  ok(/data-pdxdp-choice="support"[^>]*aria-pressed="true"/.test(h2), "…and the caller's own vote is pressed");

  const g3 = await paintPoll({ error: "x" });
  eq(g3.water.querySelector("[data-pdxdp-count]").textContent, "", "a failed read prints no count, never a zero");
}
ok(!/localStorage/.test(CLIENT), "the poll keeps nothing on the device");

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the store, the service worker and the copy walls");
// ═════════════════════════════════════════════════════════════════════════════
const MIG = R("netlify/database/migrations/20261109000000_create_voice_poll_votes/migration.sql");
ok(/CREATE TABLE IF NOT EXISTS "voice_poll_votes"/.test(MIG), "the migration adds voice_poll_votes");
ok(/UNIQUE INDEX IF NOT EXISTS "voice_poll_votes_seat_issue_author_unique"[\s\S]*?\("seat_key","issue_key","author_hash"\)/.test(MIG),
   "…one vote per person per seat + issue");
ok(/CHECK \("choice" in \('support', 'oppose', 'not_sure'\)\)/.test(MIG), "…and exactly three choices");
ok(!/user_id|email|\bname\b|zip/.test(MIG.replace(/--.*$/gm, "")), "…with no person column");
for (const seat of Object.values(CLUSTER)) {
  const rows = MIG + R("netlify/database/migrations/20261029000000_create_dd_district_discussion_tables/migration.sql");
  ok(rows.includes(`('${seat}', 'UT'`), `${seat} is in dd_districts, so its votes can land`);
}
const SW = R("sw.js");
ok(Number((SW.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1] || 0) >= 271, "the shell moved at least to v271");
ok(SW.includes("'/district-poll.js',"), "the poll module is precached");
ok(/v271 - [\s\S]*?20261109000000_create_voice_poll_votes/.test(SW), "the log names the migration");
ok(!/from\s*=\s*"\/district\/\*"/.test(R("netlify.toml")), "no /district/* splat");
const BANNED = /\b(shares?|stocks?|units?|dues|equity|earn a share|earn|dividend|invest(?:or|ment)?)\b|Reg CF|\d\s*%/i;
for (const [name, src] of [["district-poll.js", CLIENT], ["core", CORE], ["Function", FNP]]) {
  const m = String(src).match(BANNED);
  ok(!m, `${name}: no equity, earn or percentage copy — found ${m && m[0]}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
