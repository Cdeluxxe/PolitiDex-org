#!/usr/bin/env node
/**
 * test-stock-trading-voice.mjs — the stock-trading drawer's effect lines, and
 * a poll on the issue file that jumps to the topic's comments
 * ─────────────────────────────────────────────────────────────────────────────
 * What this file pins:
 *
 *   1. THE MEASURES ARE THE MAPPED ONES. Every vote row on a member's
 *      stock_trading_ban drawer is a measure the issue seed already maps to the
 *      issue (H.R. 7008, 119th) — no row comes from a mapping this pass made.
 *   2. EVERY ROW PRINTS ITS STORED LINE. Each stock_trading_ban row, and each
 *      H.R. 7008 row on the gov_transparency drawer (the disclosure / notice
 *      side of the same act), prints exactly one effect paragraph and it is the
 *      line stored on that measure × issue pair in _DOS_EFFECT.
 *   3. THE LINE RULE. One sentence, 140 characters or fewer, no method words,
 *      no midpoint, and the tally it ends on is the roll the vote seeds hold.
 *   4. ABSENT WHEN NOTHING IS STORED. With the pair's line taken out of the
 *      table the same rows print no effect paragraph at all.
 *   5. THE POLL GATE. Counts are readable signed out; an unverified vote —
 *      signed out, anonymous, a typed location, a neighbour seat's flag — is
 *      403 and writes nothing; a vendor-verified resident of that seat writes.
 *   6. THE TOPIC READ. GET /api/district-board-voice?issue=<key> returns that
 *      issue's posts only, and the plain read is unchanged.
 *   7. THE JUMP LANDS ON THE TOPIC'S COMMENTS. The issue file's link is
 *      /district/<seat>?topic=stock_trading_ban#pdx-topic-comments on a named
 *      board; on that board the composer reads the topic, asks for that issue's
 *      posts, titles the band for it, prints only its posts, preselects it and
 *      scrolls the band into view once.
 *   8. THE ISSUE-FILE POLL. Painted for stock_trading_ban and for no other
 *      issue; the reader's own federal seat first; counts off the wire; buttons
 *      off and no POST unless the server says canVote; no equity copy.
 *   9. IT SHIPS. issue-poll.js is precached and loaded once by index.html, and
 *      CACHE_VERSION moved past v346.
 *
 *   node scripts/test-stock-trading-voice.mjs
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";
import { handle as pollHandle } from "../netlify/lib/district-board-poll-core.mjs";
import { handle as voiceHandle, seatHash } from "../netlify/lib/district-board-voice-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`\n✗ stock-trading voice: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};
const tick = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };

const ISSUE = "stock_trading_ban";
const ACT = "H.R. 7008|119";
const PAIRS = [`${ACT}|stock_trading_ban`, `${ACT}|gov_transparency`];
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary|coded|coding|chip|mapped|mapping|filed as|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger|midpoint|median|average)\b|PolitiDex|%|…|\.\.\./i;
const EQUITY = /\b(?:stocks?|shares?|earn(?:s|ed|ing)?|equity|form c|invest(?:ment|or)?s?|dividends?)\b/i;

// ── the drawer harness: the shipped engine, the real vote corpus ────────────
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js",
];
const CONS = R("consistency.js");
const corpus = buildCorpus(ROOT);
function mapOf(src, name) {
  const at = src.indexOf(`var ${name} = {`);
  if (at < 0) return null;
  const end = src.indexOf("\n  };", at);
  return vm.runInNewContext("(" + src.slice(at + `var ${name} = `.length, end + 4) + ")");
}
function bootEngine(src) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of FILES) vm.runInContext(f === "consistency.js" ? src : R(f), ctx, { filename: f });
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  return win;
}
const dec = (h) => String(h || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
// Every row on one issue's drawers, across the roster: { pid, act, eff[] }.
function drawerRows(win, key) {
  const CS = win.PDXConsistency;
  const out = [];
  for (const pid of Object.keys(win.CMP_DATA)) {
    let items = [];
    try { items = CS.dossierItems(pid, key) || []; } catch { continue; }
    if (!items.length) continue;
    const html = CS.dossierLedgerHtml(pid, key) || "";
    const effs = new Map();
    for (const m of html.matchAll(/<tr class="pdxlg-effr" data-pdxlg-effr="(\d+)">([\s\S]*?)<\/tr>/g)) {
      effs.set(Number(m[1]), (effs.get(Number(m[1])) || []).concat(dec(m[2])));
    }
    for (const m of html.matchAll(/<tr data-pdxlg-row="(\d+)">/g)) {
      const i = Number(m[1]), d = items[i] || {}, it = d.item || {};
      out.push({ pid, lane: d.lane, act: `${String(it.number || "").trim()}|${it.congress}`, eff: effs.get(i) || [] });
    }
  }
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the drawer's measures are the ones the seed already maps");
// ═════════════════════════════════════════════════════════════════════════════
const E = mapOf(CONS, "_DOS_EFFECT");
must(E, "_DOS_EFFECT cannot be read out of consistency.js");
const engine = bootEngine(CONS);
const stockRows = drawerRows(engine, ISSUE);
must(stockRows.length > 0, "no member's stock_trading_ban drawer prints a row");
const seeded = new Set();
for (const m of JSON.parse(R("db/vr-issue-seed.json")).measures || []) {
  for (const iss of m.issues || []) if (iss.issueKey === ISSUE) seeded.add(`${m.number}|${m.congress}`);
}
must(seeded.has(ACT), `the issue seed no longer maps ${ACT} to ${ISSUE}`);
const acts = [...new Set(stockRows.filter((r) => r.lane !== "exec").map((r) => r.act))];
for (const a of acts) ok(seeded.has(a), `${ISSUE} drawer prints ${a}, which the seed does not map to the issue`);
console.log(`      ${stockRows.length} rows on ${new Set(stockRows.map((r) => r.pid)).size} drawers · measures: ${acts.join(", ")}`);

// ═════════════════════════════════════════════════════════════════════════════
section("2 · every row prints the line stored on its measure × issue pair");
// ═════════════════════════════════════════════════════════════════════════════
const transRows = drawerRows(engine, "gov_transparency").filter((r) => r.act === ACT);
must(transRows.length > 0, `no gov_transparency drawer prints ${ACT}`);
for (const [key, rows] of [[ISSUE, stockRows], ["gov_transparency", transRows]]) {
  for (const r of rows) {
    const want = E[`${r.act}|${key}`];
    if (!want) { eq(r.eff.length, 0, `${r.pid} × ${key}: ${r.act} has nothing stored but prints a line`); continue; }
    ok(r.eff.length === 1 && r.eff[0] === want,
      `${r.pid} × ${key}: ${r.act} prints ${JSON.stringify(r.eff)}, stored ${JSON.stringify(want)}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the line rule");
// ═════════════════════════════════════════════════════════════════════════════
const ROLL280 = (() => {
  for (const f of readdirSync(join(ROOT, "db")).filter((x) => x.endsWith(".json"))) {
    let j; try { j = JSON.parse(R(`db/${f}`)); } catch { continue; }
    for (const v of j.votes || []) {
      const num = typeof v.measure === "string" ? v.measure : v.measure && v.measure.number;
      if (num !== "H.R. 7008" || v.congress !== 119 || v.chamber !== "house" || v.rollNumber !== 280) continue;
      if (v.totals && v.totals.yea != null) return [v.totals.yea, v.totals.nay];
      const P = Object.values(v.partyTotals || {});
      if (P.length) return [P.reduce((n, p) => n + p.yea, 0), P.reduce((n, p) => n + p.nay, 0)];
    }
  }
  return null;
})();
must(ROLL280, "the vote seeds hold no tally for H.R. 7008's passage roll (House 280)");
for (const k of PAIRS) {
  const s = String(E[k] || "");
  must(s, `${k}: no line is stored`);
  ok(s.length <= 140, `${k}: ${s.length} characters`);
  ok(/[.!?]$/.test(s), `${k}: does not end on a stop`);
  ok(!/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US")), `${k}: more than one sentence`);
  const mw = s.match(METHOD);
  ok(!mw, `${k}: method word ${mw && mw[0]}`);
  ok(/^Would\b/.test(s), `${k}: the act never became law, so the line must open "Would"`);
  ok(s.endsWith(`; the House passed it ${ROLL280[0]}-${ROLL280[1]}.`),
    `${k}: does not end on the recorded tally ${ROLL280.join("-")}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · absent when nothing is stored");
// ═════════════════════════════════════════════════════════════════════════════
{
  const entry = `    '${ACT}|stock_trading_ban':\n      '${E[`${ACT}|stock_trading_ban`]}',\n`;
  must(CONS.includes(entry), "the stock-trading line is not stored in the shape this mutation removes");
  const bare = bootEngine(CONS.replace(entry, ""));
  const rows = drawerRows(bare, ISSUE);
  eq(rows.length, stockRows.length, "removing the line changed how many rows the drawer prints");
  eq(rows.filter((r) => r.eff.length).length, 0, "with no line stored, a stock-trading row still prints an effect paragraph");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the poll gate: anyone reads, an unverified vote is 403 and writes nothing");
// ═════════════════════════════════════════════════════════════════════════════
const POLL_API = "https://politidex.fyi/api/district-board-poll";
const SEAT = "ut-cd-2", SEAT_KEY = "ut-house-2", NEIGHBOUR = "ut-house-3";
const UID = "resident-uid";
function pollStore(residency) {
  const s = { upserts: [], votes: [] };
  s.deps = {
    async verifyUser(req) {
      const h = req.headers.get("authorization") || "";
      if (!h.startsWith("Bearer ")) return null;
      const t = h.slice(7);
      return t === "anon" ? { uid: "anon-uid", isAnonymous: true } : { uid: t, isAnonymous: false };
    },
    async findResidency(seatKey, hash) {
      return residency.find((r) => r.seatKey === seatKey && r.authorHash === hash) || null;
    },
    async issueExists(k) { return k === ISSUE; },
    async countVotes(seatKey) {
      const g = new Map();
      for (const v of s.votes) {
        if (v.seatKey !== seatKey) continue;
        const k = v.issueKey + "|" + v.choice;
        g.set(k, { issueKey: v.issueKey, choice: v.choice, v: (g.get(k)?.v || 0) + 1 });
      }
      return [...g.values()];
    },
    async myVotes(seatKey, hash) {
      return s.votes.filter((v) => v.seatKey === seatKey && v.authorHash === hash);
    },
    async findMembership() { return { status: "active", currentPeriodEnd: null }; },
    async upsertVote(v) {
      s.upserts.push(v);
      s.votes = s.votes.filter((x) => !(x.seatKey === v.seatKey && x.issueKey === v.issueKey && x.authorHash === v.authorHash));
      s.votes.push({ ...v });
      return true;
    },
  };
  return s;
}
const pget = (seat, token) => new Request(`${POLL_API}?seat=${seat}`, { headers: token ? { authorization: "Bearer " + token } : {} });
const ppost = (body, token) => new Request(POLL_API, {
  method: "POST",
  headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) },
  body: JSON.stringify(body),
});
{
  const H = seatHash(UID, SEAT_KEY);
  const seed = [
    { seatKey: SEAT_KEY, issueKey: ISSUE, authorHash: "a", choice: "support" },
    { seatKey: SEAT_KEY, issueKey: ISSUE, authorHash: "b", choice: "support" },
    { seatKey: SEAT_KEY, issueKey: ISSUE, authorHash: "c", choice: "not_sure" },
  ];
  const open = pollStore([]);
  open.votes = seed.map((v) => ({ ...v }));
  const res = await pollHandle(pget(SEAT), open.deps);
  eq(res.status, 200, "a signed-out read of the seat's counts");
  const body = await res.json();
  const t = (body.polls || []).find((p) => p.issueKey === ISSUE) || {};
  eq(`${t.support}/${t.oppose}/${t.not_sure}/${t.total}`, "2/0/1/3", "signed out, the counts are the store's");
  eq(body.voice && body.voice.canVote, false, "signed out, the poll does not open");
  ok(!JSON.stringify(body).includes('"a"') && !JSON.stringify(body).includes("authorHash"), "no author hash on the wire");

  const refusals = [
    ["signed out", [], null],
    ["anonymous", [], "anon"],
    ["signed in, no residency", [], UID],
    ["a typed location", [{ seatKey: SEAT_KEY, authorHash: H, status: "verified", method: "location_match" }], UID],
    ["vendor pending", [{ seatKey: SEAT_KEY, authorHash: H, status: "pending", method: "vendor" }], UID],
    ["a neighbour seat's flag", [{ seatKey: NEIGHBOUR, authorHash: seatHash(UID, NEIGHBOUR), status: "verified", method: "vendor" }], UID],
  ];
  for (const [name, rows, token] of refusals) {
    const s = pollStore(rows);
    const r = await pollHandle(ppost({ seat: SEAT, issueKey: ISSUE, choice: "oppose" }, token), s.deps);
    eq(r.status, 403, `${name}: the vote`);
    eq(s.upserts.length, 0, `${name}: …and nothing was written`);
  }
  const v = pollStore([{ seatKey: SEAT_KEY, authorHash: H, status: "verified", method: "vendor" }]);
  const w = await pollHandle(ppost({ seat: SEAT, issueKey: ISSUE, choice: "oppose" }, UID), v.deps);
  eq(w.status, 200, "a vendor-verified resident of the seat votes");
  eq(v.upserts.length, 1, "…and exactly one row is written");
  const wb = await w.json();
  eq(wb.poll && wb.poll.oppose, 1, "…and the answer carries the new count");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the topic read: ?issue= returns that issue's posts only");
// ═════════════════════════════════════════════════════════════════════════════
const VOICE_API = "https://politidex.fyi/api/district-board-voice";
const POSTS = [
  { id: 3, issueKey: ISSUE, body: "Ban it.", createdAt: "2026-10-03T00:00:00Z", authorHash: "x" },
  { id: 2, issueKey: "housing", body: "Rents.", createdAt: "2026-10-02T00:00:00Z", authorHash: "y" },
  { id: 1, issueKey: ISSUE, body: "Disclose it.", createdAt: "2026-10-01T00:00:00Z", authorHash: "z" },
];
function voiceDeps(asked) {
  return {
    async verifyUser() { return null; },
    async findResidency() { return null; },
    async issueExists() { return true; },
    // A store that honours the filter, as the Postgres wiring does.
    async listPosts(seatKey, cap, issueKey) {
      asked.push(issueKey || "");
      return POSTS.filter((p) => !issueKey || p.issueKey === issueKey).slice(0, cap);
    },
    async insertPost() { throw new Error("a read must never insert"); },
    async findMembership() { return null; },
  };
}
{
  const asked = [];
  const r = await voiceHandle(new Request(`${VOICE_API}?seat=${SEAT}&issue=${ISSUE}`), voiceDeps(asked));
  eq(r.status, 200, "a signed-out topic read");
  const b = await r.json();
  eq((b.posts || []).map((p) => p.issueKey).join(","), `${ISSUE},${ISSUE}`, "the topic read returns that issue's posts only");
  eq(b.issue, ISSUE, "…and says which issue it read");
  eq(asked[0], ISSUE, "…and asks the store for that issue");
  const all = await (await voiceHandle(new Request(`${VOICE_API}?seat=${SEAT}`), voiceDeps([]))).json();
  eq((all.posts || []).length, 3, "the plain read is the whole feed, unchanged");
  const odd = await (await voiceHandle(new Request(`${VOICE_API}?seat=${SEAT}&issue=DROP%20TABLE`), voiceDeps([]))).json();
  eq((odd.posts || []).length, 3, "a key of the wrong shape falls back to the whole feed");
  // A store that ignored the filter still cannot leak another issue's post.
  const leaky = { ...voiceDeps([]), async listPosts() { return POSTS.slice(); } };
  const lb = await (await voiceHandle(new Request(`${VOICE_API}?seat=${SEAT}&issue=${ISSUE}`), leaky)).json();
  eq((lb.posts || []).every((p) => p.issueKey === ISSUE), true, "a store that ignores the filter is filtered by the core");
  ok(R("netlify/functions/district-board-voice.mts").includes("eq(voiceTakes.issueKey, issueKey)"),
    "the Postgres read narrows on issue_key");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the jump lands on the topic's comments");
// ═════════════════════════════════════════════════════════════════════════════
function node(id, attrs) {
  const n = {
    id, innerHTML: "", _a: { ...(attrs || {}) }, _li: {}, scrolls: 0,
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._a, k) ? this._a[k] : null; },
    setAttribute(k, v) { this._a[k] = String(v); },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this._a, k); },
    querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener(t, f) { (this._li[t] = this._li[t] || []).push(f); },
    scrollIntoView() { this.scrolls++; },
  };
  return n;
}
function jsonRes(data, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(data) });
}
async function bootBoard(search) {
  const w = makeSandbox();
  w.window = w;
  const host = node("pdx-district-composer", { "data-pdxdc-seat": SEAT });
  const band = node("pdx-topic-comments");
  w.document.getElementById = (id) => (id === "pdx-district-composer" ? host : id === "pdx-topic-comments" ? band : null);
  w.location = { ...w.location, pathname: `/district/${SEAT}`, search };
  w.history = { replaceState() {} };
  w.PDXDistrictBoard = { issueLabel: (k) => (k === ISSUE ? "Ban Congressional Stock Trading" : k === "housing" ? "Housing" : ""), issues: () => [ISSUE, "housing"] };
  const urls = [];
  w.fetch = (u) => {
    urls.push(String(u));
    const want = /[?&]issue=([^&]+)/.exec(String(u));
    const posts = POSTS.filter((p) => !want || p.issueKey === decodeURIComponent(want[1]))
      .map(({ authorHash, ...p }) => ({ ...p, mine: false }));
    return jsonRes({ posts, voice: { canPost: false, reason: "signed_out", line: "Only verified residents of this seat get a voice that counts.", note: "" } });
  };
  vm.runInContext(R("district-composer.js"), vm.createContext(w), { filename: "district-composer.js" });
  await tick();
  return { w, host, band, urls };
}
{
  const B = await bootBoard(`?topic=${ISSUE}`);
  eq(B.w.PDXDistrictComposer.topic(), ISSUE, "the board reads ?topic=");
  ok(B.urls.some((u) => u.includes(`seat=${SEAT}`) && u.includes(`issue=${ISSUE}`)), `the board asks for that issue's posts — asked ${JSON.stringify(B.urls)}`);
  const h = B.host.innerHTML;
  ok(h.includes(`id="pdx-topic-comments" data-pdxdc-topic="${ISSUE}"`), "the posts band is the jump's anchor, marked with the topic");
  ok(h.includes("What residents have said on Ban Congressional Stock Trading"), "…titled for the issue");
  ok(h.includes("Ban it.") && h.includes("Disclose it.") && !h.includes("Rents."), "…and prints that issue's posts only");
  ok(new RegExp(`<option value="${ISSUE}" selected>`).test(h), "the composer's issue is preselected");
  eq(B.band.scrolls, 1, "the band is scrolled into view once");
  B.w.PDXDistrictComposer.mount(B.host);
  await tick();
  eq(B.band.scrolls, 1, "…and a later read does not pull the reader back");
  ok(h.includes('data-pdxdc-topic-all="1"'), "a way back to every comment is offered");

  const P = await bootBoard("");
  eq(P.w.PDXDistrictComposer.topic(), "", "with no topic, none is read");
  ok(P.urls.every((u) => !u.includes("issue=")), "…and the plain feed is asked for");
  ok(P.host.innerHTML.includes("What residents have said</h2>") && P.host.innerHTML.includes("Rents."), "…and printed whole, as before");
  eq(P.band.scrolls, 0, "…and nothing scrolls");
  const T = (await bootBoard("")).w.PDXDistrictComposer.topicFrom;
  eq(T("?topic=stock_trading_ban&x=1"), ISSUE, "topicFrom reads the key");
  eq(T("?topic=%3Cscript%3E"), "", "…and refuses any other shape");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the issue-file poll");
// ═════════════════════════════════════════════════════════════════════════════
async function bootPoll(opts) {
  const w = makeSandbox();
  w.window = w;
  const hosts = [];
  let click = null;
  w.document.addEventListener = (t, f) => { if (t === "click") click = f; };
  w.document.querySelectorAll = (sel) => (String(sel).includes("data-pdxip-host") ? hosts : []);
  if (opts.located) w.PDXVoice = { seatsForMe: () => opts.located.map((s) => ({ board: `/district/${s}` })) };
  if (opts.signedIn) w.auth = { currentUser: { isAnonymous: false, getIdToken: () => Promise.resolve("tok") }, onAuthStateChanged() {} };
  const calls = [];
  w.fetch = (u, init) => {
    calls.push({ url: String(u), method: (init && init.method) || "GET" });
    if (init && init.method === "POST") return jsonRes({ error: "Only verified residents of this seat get a voice that counts.", code: "unverified" }, 403);
    return jsonRes({
      polls: [{ issueKey: ISSUE, support: 4, oppose: 1, not_sure: 2, total: 7 }],
      mine: {},
      voice: { canVote: !!opts.canVote, reason: opts.canVote ? "verified" : "unverified", line: opts.canVote ? "" : "Only verified residents of this seat get a voice that counts.", note: "" },
    });
  };
  vm.runInContext(R("issue-poll.js"), vm.createContext(w), { filename: "issue-poll.js" });
  const IP = w.PDXIssuePoll;
  const first = IP.html(ISSUE);
  const host = node("", { "data-pdxip-host": ISSUE });
  host.innerHTML = first;
  hosts.push(host);
  await tick();
  const press = (attr, val) => {
    if (!click) return;
    const btn = node("", { [attr]: val, "data-pdxip-issue": ISSUE });
    btn.disabled = !opts.canVote && attr === "data-pdxip-choice";
    click({ target: { closest: (sel) => (sel === `[${attr}]` ? btn : null) } });
  };
  return { w, IP, host, first, calls, press };
}
{
  const L = await bootPoll({ located: ["ut-hd-16", "ut-us-senate-lee", "ut-cd-2"] });
  eq(L.IP.html("lands_preserve"), "", "every other issue file carries no poll");
  eq(L.IP.seat(), SEAT, "a located reader reads their own House board first");
  ok(L.calls.some((c) => c.url === `/api/district-board-poll?seat=${SEAT}`), "…through the boards' own poll endpoint");
  const h = L.host.innerHTML;
  ok(/data-pdxip-count="support">4</.test(h) && /data-pdxip-count="oppose">1</.test(h) && /data-pdxip-count="not_sure">2</.test(h),
    "the counts are the wire's, for anyone");
  ok(!/%|majority|most residents/i.test(h), "no proportion, majority or mood is printed");
  ok(/data-pdxip-seat="ut-us-senate-lee"/.test(h) && !/data-pdxip-seat="ut-hd-16"/.test(h),
    "the reader's federal seats are offered and a state seat is not");
  const href = `/district/${SEAT}?topic=${ISSUE}#pdx-topic-comments`;
  ok(h.includes(`href="${href}"`), `the jump is ${href}`);
  eq(L.IP.jumpHref(SEAT, ISSUE), href, "…and jumpHref agrees");
  ok((h.match(/data-pdxip-choice="[a-z_]+"[^>]*disabled/g) || []).length === 3, "unverified, all three buttons are off");
  ok(h.includes('data-pdxip-locked="1"'), "…and the locked line is printed");
  L.press("data-pdxip-choice", "support");
  await tick();
  eq(L.calls.filter((c) => c.method === "POST").length, 0, "a press on a locked button sends nothing");

  const U = await bootPoll({});
  eq(U.IP.seat(), "", "an unlocated reader is not given a seat");
  ok(U.first.includes("Choose a Utah seat to read its votes.") && !/data-pdxip-count=/.test(U.first), "…and no count until one is chosen");
  eq((U.first.match(/data-pdxip-seat=/g) || []).length, 6, "…from Utah's six federal boards");
  U.press("data-pdxip-seat", "ut-cd-4");
  await tick();
  eq(U.IP.seat(), "ut-cd-4", "picking a seat reads it");
  ok(U.host.innerHTML.includes(`href="/district/ut-cd-4?topic=${ISSUE}#pdx-topic-comments"`), "…and the jump follows the pick");

  // The server's 403 is what a vote meets if the buttons were somehow opened.
  const V = await bootPoll({ located: [SEAT], signedIn: true, canVote: true });
  ok(!/data-pdxip-choice="support"[^>]*disabled/.test(V.host.innerHTML), "verified per the server, the buttons open");
  V.press("data-pdxip-choice", "support");
  await tick();
  eq(V.calls.filter((c) => c.method === "POST").length, 1, "…a press sends one vote");
  ok(V.host.innerHTML.includes('data-pdxip-locked="1"'), "…and a 403 closes the poll again");

  // Every board the poll can name is a named row the boards already serve.
  const pollClient = R("district-poll.js");
  const toml = R("netlify.toml");
  for (const b of L.IP.BOARDS) {
    ok(pollClient.includes(`'${b.seat}': 1`), `${b.seat} is a poll seat`);
    ok(toml.includes(`/district/${b.seat}"`), `${b.seat} has its named board route`);
    ok(readdirSync(ROOT).includes(`district-${b.seat}.html`), `${b.seat} has a board document`);
  }
  ok(!/from\s*=\s*"\/district\/\*"/.test(toml), "no /district/* splat");
  const copy = Object.values(L.IP.COPY).join(" ") + " " + ["topicHd", "topicEmpty", "topicAll"]
    .map((k) => R("district-composer.js").match(new RegExp(`${k}: '([^']*)'`))?.[1] || "").join(" ");
  ok(!EQUITY.test(copy), `the new copy carries equity language: ${copy.match(EQUITY)}`);
  ok(R("issue-file.js").includes("issuePoll(key) +"), "the issue file's letterhead prints the poll slot");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · it ships");
// ═════════════════════════════════════════════════════════════════════════════
{
  const SW = R("sw.js");
  const v = Number((/const CACHE_VERSION = 'v(\d+)';/.exec(SW) || [])[1]);
  ok(v >= 347, `CACHE_VERSION v${v} — precached files changed, so the shell must move past v346`);
  ok(SW.includes("'/issue-poll.js',"), "issue-poll.js is precached");
  eq((R("index.html").match(/src="\/issue-poll\.js"/g) || []).length, 1, "index.html loads issue-poll.js once");
}

if (failures.length) {
  console.error(`\n✗ stock-trading voice: ${failures.length} failure(s), ${passed} passed`);
  for (const f of failures.slice(0, 40)) console.error("   ✗ " + f);
  process.exit(1);
}
console.log(`\n✓ stock-trading voice: all ${passed} assertions passed — every row prints its stored line, anyone reads the counts, and the jump lands on the topic`);
