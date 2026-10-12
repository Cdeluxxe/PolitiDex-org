#!/usr/bin/env node
/**
 * test-israel-voice.mjs — Support for Israel: every vote row's effect line, and
 * a poll on the issue file that jumps to the topic's comments
 * ─────────────────────────────────────────────────────────────────────────────
 * What this file pins:
 *
 *   1. THE MEASURES ARE THE MAPPED ONES. Every vote row on a member's
 *      israel_support drawer is a measure the curated seed maps to the issue.
 *   2. EVERY ROW PRINTS THE LINE STORED ON ITS PAIR — exactly one paragraph, the
 *      _DOS_EFFECT entry for that measure × israel_support, and no other.
 *   3. THE LINE RULE. One sentence, 140 characters or fewer, no method words, no
 *      midpoint or percentage, and every tally a line prints is a roll the vote
 *      seeds hold for that measure.
 *   4. ABSENT WHEN NOTHING IS STORED. With every israel_support line taken out, a
 *      row prints nothing unless its own pair stores a one-sentence description
 *      short enough to stand (the drawer's own fallback), and then only that.
 *   5. H.R. 815 (118th) STAYS BLANK. The rider audit filed its israel_support
 *      row and recorded it blank because its own text names Division A only by
 *      title; no line was written for it, and none is borrowed from a sibling.
 *   6. THE POLL GATE. Counts are readable signed out; an unverified vote is 403
 *      and writes nothing; a verified resident of the seat writes one row; an
 *      option from another issue's list is 400 and writes nothing.
 *   7. THE JUMP LANDS ON THE FILTERED TOPIC COMMENTS. The issue file prints the
 *      three-pole poll and links /district/<seat>?topic=israel_support; on the
 *      board the composer reads that issue's posts only, titles them with the
 *      issue's name, preselects it, scrolls once and offers "Show every comment".
 *   8. IT SHIPS: CACHE_VERSION moved past v348.
 *
 *   node scripts/test-israel-voice.mjs
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
  console.error(`\n✗ israel voice: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};
const tick = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };

const ISSUE = "israel_support";
const LABEL = "🇮🇱 Support for Israel";
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary|coded|coding|chip|mapped|mapping|filed as|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger|midpoint|median|average)\b|PolitiDex|%|…|\.\.\./i;
const EQUITY = /\b(?:stocks?|shares?|earn(?:s|ed|ing)?|equity|form c|invest(?:ment|or)?s?|dividends?)\b/i;
const norm = (x) => String(x || "").replace(/\s+/g, " ").trim();
// The drawer's own fallback rule (_dosEffectOk): a pair's `did` stands under the
// row only when it is already one short sentence.
const rowRule = (raw) => {
  const s = norm(raw);
  if (!s || s.length > 140 || !/[.!?]$/.test(s)) return "";
  if (/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "";
  return s;
};

// ── the drawer harness ──────────────────────────────────────────────────────
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
function drawerRows(win) {
  const CS = win.PDXConsistency;
  const out = [];
  for (const pid of Object.keys(win.CMP_DATA)) {
    let items = [];
    try { items = CS.dossierItems(pid, ISSUE) || []; } catch { continue; }
    if (!items.length) continue;
    const html = CS.dossierLedgerHtml(pid, ISSUE) || "";
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
section("1 · the drawer's measures are the ones the seed maps");
// ═════════════════════════════════════════════════════════════════════════════
const SEED = JSON.parse(R("db/vr-issue-seed.json")).measures || [];
const mapped = new Set();
for (const m of SEED) for (const i of m.issues || []) if (i.issueKey === ISSUE) mapped.add(`${m.number}|${m.congress}`);
must(mapped.size > 0, "the seed maps nothing to israel_support");
const E = mapOf(CONS, "_DOS_EFFECT");
const M = mapOf(CONS, "_DOS_MECH");
must(E && M, "the effect maps cannot be read out of consistency.js");
const engine = bootEngine(CONS);
const rows = drawerRows(engine).filter((r) => r.lane !== "exec");
must(rows.length > 0, "no member's israel_support drawer prints a vote row");
const acts = [...new Set(rows.map((r) => r.act))].sort();
for (const a of acts) ok(mapped.has(a), `the drawer prints ${a}, which the seed does not map to israel_support`);
console.log(`      ${rows.length} rows on ${new Set(rows.map((r) => r.pid)).size} drawers · ${acts.length} measures`);

// ═════════════════════════════════════════════════════════════════════════════
section("2 · every row prints the line stored on its pair");
// ═════════════════════════════════════════════════════════════════════════════
for (const r of rows) {
  const want = E[`${r.act}|${ISSUE}`];
  ok(!!want, `${r.act}: no line is stored for this vote row`);
  ok(r.eff.length === 1 && r.eff[0] === want, `${r.pid}: ${r.act} prints ${JSON.stringify(r.eff)}, stored ${JSON.stringify(want)}`);
}
for (const a of acts) ok(rows.some((r) => r.act === a && r.eff.length === 1), `${a}: no row prints its line`);

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the line rule");
// ═════════════════════════════════════════════════════════════════════════════
// Every recorded roll's tally, by measure — "N-M" either way round.
const TALLIES = (() => {
  const t = new Map();
  for (const f of readdirSync(join(ROOT, "db")).filter((x) => x.endsWith(".json"))) {
    let j; try { j = JSON.parse(R(`db/${f}`)); } catch { continue; }
    for (const v of j.votes || []) {
      const num = typeof v.measure === "string" ? v.measure : v.measure && v.measure.number;
      if (!num || v.congress == null) continue;
      let tl = null;
      if (v.totals && v.totals.yea != null) tl = [v.totals.yea, v.totals.nay];
      else if (v.partyTotals) {
        const P = Object.values(v.partyTotals);
        if (P.length) tl = [P.reduce((n, p) => n + p.yea, 0), P.reduce((n, p) => n + p.nay, 0)];
      }
      if (!tl) continue;
      const k = `${num}|${v.congress}`;
      const s = t.get(k) || new Set();
      s.add(`${tl[0]}-${tl[1]}`); s.add(`${tl[1]}-${tl[0]}`);
      t.set(k, s);
    }
  }
  return t;
})();
const lineKeys = Object.keys(E).filter((k) => k.endsWith(`|${ISSUE}`));
must(lineKeys.length >= acts.length, "fewer israel_support lines are stored than measures on the drawer");
for (const k of lineKeys) {
  const s = String(E[k]);
  ok(s.length <= 140, `${k}: ${s.length} characters`);
  ok(/[.!?]$/.test(s), `${k}: does not end on a stop`);
  ok(!/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US")), `${k}: more than one sentence`);
  const mw = s.match(METHOD);
  ok(!mw, `${k}: method word ${mw && mw[0]}`);
  const act = k.split("|").slice(0, 2).join("|");
  for (const t of s.match(/\b\d{1,3}-\d{1,3}\b/g) || []) {
    ok((TALLIES.get(act) || new Set()).has(t), `${k}: prints the tally ${t}, which no recorded roll for ${act} holds`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · absent when nothing is stored");
// ═════════════════════════════════════════════════════════════════════════════
{
  let src = CONS;
  for (const k of lineKeys) {
    const entry = `    '${k}':\n      '${E[k]}',\n`;
    must(src.includes(entry), `${k} is not stored in the shape this mutation removes`);
    src = src.replace(entry, "");
  }
  const bare = drawerRows(bootEngine(src)).filter((r) => r.lane !== "exec");
  eq(bare.length, rows.length, "removing the lines changed how many rows the drawer prints");
  let mute = 0;
  for (const r of bare) {
    const fallback = rowRule(M[`${r.act}|${ISSUE}`] && M[`${r.act}|${ISSUE}`].did);
    if (!fallback) { eq(r.eff.length, 0, `${r.pid}: ${r.act} has nothing stored and still prints a line`); mute++; }
    else ok(r.eff.length === 1 && r.eff[0] === fallback, `${r.pid}: ${r.act} prints something other than its own short description`);
  }
  ok(mute > 0, "the mutation reached no row that stores nothing — section 4 proves nothing");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · H.R. 815 (118th) stays blank");
// ═════════════════════════════════════════════════════════════════════════════
{
  const ledger = JSON.parse(R("db/vr-rider-effect-lines.json")).rows || [];
  const row = ledger.find((r) => r.key === "H.R. 815|118|israel_support");
  must(row, "the rider ledger no longer records H.R. 815 × israel_support");
  eq(row.decision, "blank", "the rider ledger records H.R. 815 × israel_support blank");
  ok(norm(row.reason).length > 20, "…with its reason");
  ok(!("H.R. 815|118|israel_support" in E), "no line was written for it");
  ok(!("H.R. 815|118|israel_support" in M), "…and no description was invented for it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the poll gate");
// ═════════════════════════════════════════════════════════════════════════════
const POLL_API = "https://politidex.fyi/api/district-board-poll";
const SEAT = "ut-cd-2", SEAT_KEY = "ut-house-2", NEIGHBOUR = "ut-house-3", UID = "resident-uid";
function pollStore(residency) {
  const s = { upserts: [], votes: [] };
  s.deps = {
    async verifyUser(req) {
      const h = req.headers.get("authorization") || "";
      if (!h.startsWith("Bearer ")) return null;
      const t = h.slice(7);
      return t === "anon" ? { uid: "anon-uid", isAnonymous: true } : { uid: t, isAnonymous: false };
    },
    async findResidency(seatKey, hash) { return residency.find((r) => r.seatKey === seatKey && r.authorHash === hash) || null; },
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
    async myVotes(seatKey, hash) { return s.votes.filter((v) => v.seatKey === seatKey && v.authorHash === hash); },
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
  const open = pollStore([]);
  open.votes = [
    { seatKey: SEAT_KEY, issueKey: ISSUE, authorHash: "a", choice: "support" },
    { seatKey: SEAT_KEY, issueKey: ISSUE, authorHash: "b", choice: "oppose" },
    { seatKey: SEAT_KEY, issueKey: ISSUE, authorHash: "c", choice: "support" },
  ];
  const res = await pollHandle(pget(SEAT), open.deps);
  eq(res.status, 200, "a signed-out read of the seat's counts");
  const body = await res.json();
  const t = (body.polls || []).find((p) => p.issueKey === ISSUE) || {};
  eq(`${t.support}/${t.oppose}/${t.not_sure}/${t.total}`, "2/1/0/3", "signed out, the counts are the store's");
  eq(body.voice && body.voice.canVote, false, "signed out, the poll does not open");
  ok(!JSON.stringify(body).includes("authorHash"), "no author hash on the wire");
  for (const [name, rowsR, token] of [
    ["signed out", [], null],
    ["anonymous", [], "anon"],
    ["signed in, no residency", [], UID],
    ["a typed location", [{ seatKey: SEAT_KEY, authorHash: H, status: "verified", method: "location_match" }], UID],
    ["vendor pending", [{ seatKey: SEAT_KEY, authorHash: H, status: "pending", method: "vendor" }], UID],
    ["a neighbour seat's flag", [{ seatKey: NEIGHBOUR, authorHash: seatHash(UID, NEIGHBOUR), status: "verified", method: "vendor" }], UID],
  ]) {
    const s = pollStore(rowsR);
    const r = await pollHandle(ppost({ seat: SEAT, issueKey: ISSUE, choice: "support" }, token), s.deps);
    eq(r.status, 403, `${name}: the vote`);
    eq(s.upserts.length, 0, `${name}: …and nothing was written`);
  }
  const verified = [{ seatKey: SEAT_KEY, authorHash: H, status: "verified", method: "vendor" }];
  const v = pollStore(verified);
  const w = await pollHandle(ppost({ seat: SEAT, issueKey: ISSUE, choice: "not_sure" }, UID), v.deps);
  eq(w.status, 200, "a vendor-verified resident of the seat votes");
  eq(v.upserts.length, 1, "…and exactly one row is written");
  eq((await w.json()).poll.not_sure, 1, "…and the answer carries the new count");
  const x = pollStore(verified);
  const bad = await pollHandle(ppost({ seat: SEAT, issueKey: ISSUE, choice: "cooling_off" }, UID), x.deps);
  eq(bad.status, 400, "another issue's option is refused on this one");
  eq(x.upserts.length, 0, "…and nothing was written");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the jump lands on the filtered topic comments");
// ═════════════════════════════════════════════════════════════════════════════
function node(id, attrs) {
  return {
    id, innerHTML: "", _a: { ...(attrs || {}) }, _li: {}, scrolls: 0,
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._a, k) ? this._a[k] : null; },
    setAttribute(k, v) { this._a[k] = String(v); },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this._a, k); },
    querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener(t, f) { (this._li[t] = this._li[t] || []).push(f); },
    scrollIntoView() { this.scrolls++; },
  };
}
const jsonRes = (data, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(data) });
const POSTS = [
  { id: 3, issueKey: ISSUE, body: "Keep the aid flowing.", createdAt: "2026-10-03T00:00:00Z", authorHash: "x" },
  { id: 2, issueKey: "housing", body: "Rents.", createdAt: "2026-10-02T00:00:00Z", authorHash: "y" },
  { id: 1, issueKey: ISSUE, body: "Put conditions on it.", createdAt: "2026-10-01T00:00:00Z", authorHash: "z" },
];
{
  const asked = [];
  const deps = {
    async verifyUser() { return null; }, async findResidency() { return null; }, async issueExists() { return true; },
    async listPosts(seatKey, cap, issueKey) { asked.push(issueKey || ""); return POSTS.filter((p) => !issueKey || p.issueKey === issueKey); },
    async insertPost() { throw new Error("a read must never insert"); }, async findMembership() { return null; },
  };
  const b = await (await voiceHandle(new Request(`https://politidex.fyi/api/district-board-voice?seat=${SEAT}&issue=${ISSUE}`), deps)).json();
  eq((b.posts || []).map((p) => p.issueKey).join(","), `${ISSUE},${ISSUE}`, "the topic read returns that issue's posts only");
  eq(asked[0], ISSUE, "…asked of the store by issue");
}
{
  const w = makeSandbox();
  w.window = w;
  const hosts = [];
  let click = null;
  w.document.addEventListener = (t, f) => { if (t === "click") click = f; };
  w.document.querySelectorAll = (sel) => (String(sel).includes("data-pdxip-host") ? hosts : []);
  w.PDXVoice = { seatsForMe: () => [{ board: "/district/ut-hd-16" }, { board: `/district/${SEAT}` }, { board: "/district/ut-us-senate-lee" }] };
  const calls = [];
  w.fetch = (u, init) => {
    calls.push({ url: String(u), method: (init && init.method) || "GET" });
    return jsonRes({ polls: [{ issueKey: ISSUE, support: 5, oppose: 2, not_sure: 1, total: 8 }], mine: {},
      voice: { canVote: false, reason: "unverified", line: "Only verified residents of this seat get a voice that counts.", note: "" } });
  };
  vm.runInContext(R("issue-poll.js"), vm.createContext(w), { filename: "issue-poll.js" });
  const IP = w.PDXIssuePoll;
  const first = IP.html(ISSUE);
  ok(first.length > 0, "the Support for Israel file carries the poll");
  const host = node("", { "data-pdxip-host": ISSUE });
  host.innerHTML = first;
  hosts.push(host);
  await tick();
  const h = host.innerHTML;
  eq(IP.seat(), SEAT, "a located reader reads their own House board first");
  ok(calls.some((c) => c.url === `/api/district-board-poll?seat=${SEAT}`), "…through the boards' own poll endpoint");
  ok(h.includes("On this seat, where do you stand on this issue?"), "the poll asks the three-pole question");
  eq((h.match(/data-pdxip-choice="/g) || []).length, 3, "…with Support, Oppose and Not sure");
  ok(/data-pdxip-count="support">5</.test(h) && /data-pdxip-count="oppose">2</.test(h) && /data-pdxip-count="not_sure">1</.test(h),
    "…each with the wire's count, for anyone");
  ok(!/%|majority|most residents/i.test(h), "no proportion, majority or mood is printed");
  eq((h.match(/data-pdxip-choice="[a-z_]+"[^>]*disabled/g) || []).length, 3, "unverified, every button is off");
  ok(h.includes('data-pdxip-locked="1"'), "…and the locked line is printed");
  const href = `/district/${SEAT}?topic=${ISSUE}#pdx-topic-comments`;
  ok(h.includes(`href="${href}"`), `the jump is ${href}`);
  if (click) {
    const btn = node("", { "data-pdxip-choice": "support", "data-pdxip-issue": ISSUE });
    btn.disabled = true;
    click({ target: { closest: (sel) => (sel === "[data-pdxip-choice]" ? btn : null) } });
  }
  await tick();
  eq(calls.filter((c) => c.method === "POST").length, 0, "a press on a locked button sends nothing");
  ok(!EQUITY.test(h.replace(/<[^>]+>/g, " ")), "the poll carries no equity language");
}
{
  const w = makeSandbox();
  w.window = w;
  const host = node("pdx-district-composer", { "data-pdxdc-seat": SEAT });
  const band = node("pdx-topic-comments");
  w.document.getElementById = (id) => (id === "pdx-district-composer" ? host : id === "pdx-topic-comments" ? band : null);
  w.location = { ...w.location, pathname: `/district/${SEAT}`, search: `?topic=${ISSUE}` };
  w.history = { replaceState() {} };
  w.PDXDistrictBoard = { issueLabel: (k) => (k === ISSUE ? LABEL : k === "housing" ? "Housing" : ""), issues: () => [ISSUE, "housing"] };
  const urls = [];
  w.fetch = (u) => {
    urls.push(String(u));
    const want = /[?&]issue=([^&]+)/.exec(String(u));
    return jsonRes({ posts: POSTS.filter((p) => !want || p.issueKey === decodeURIComponent(want[1])).map(({ authorHash, ...p }) => ({ ...p, mine: false })),
      voice: { canPost: false, reason: "signed_out", line: "Only verified residents of this seat get a voice that counts.", note: "" } });
  };
  vm.runInContext(R("district-composer.js"), vm.createContext(w), { filename: "district-composer.js" });
  await tick();
  ok(urls.some((u) => u.includes(`issue=${ISSUE}`)), `the board asks for that issue's posts — asked ${JSON.stringify(urls)}`);
  const h = host.innerHTML;
  ok(h.includes(`id="pdx-topic-comments" data-pdxdc-topic="${ISSUE}"`), "the posts band is the jump's anchor");
  ok(h.includes(`What residents have said on ${LABEL}`), "…titled with the issue's name");
  ok(h.includes("Keep the aid flowing.") && h.includes("Put conditions on it.") && !h.includes("Rents."), "…printing that issue's posts only");
  ok(new RegExp(`<option value="${ISSUE}" selected>`).test(h), "the issue is preselected in the comment box");
  eq(band.scrolls, 1, "the band scrolls into view once");
  ok(h.includes(">Show every comment<"), "…and offers \"Show every comment\"");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · it ships");
// ═════════════════════════════════════════════════════════════════════════════
{
  const SW = R("sw.js");
  const v = Number((/const CACHE_VERSION = 'v(\d+)';/.exec(SW) || [])[1]);
  ok(v >= 349, `CACHE_VERSION v${v} — issue-poll.js is precached and changed, so the shell must move past v348`);
  ok(SW.includes("'/issue-poll.js',"), "issue-poll.js is precached");
}

if (failures.length) {
  console.error(`\n✗ israel voice: ${failures.length} failure(s), ${passed} passed`);
  for (const f of failures.slice(0, 40)) console.error("   ✗ " + f);
  process.exit(1);
}
console.log(`\n✓ israel voice: all ${passed} assertions passed — every Israel vote row prints its stored line, anyone reads the counts, and the jump lands on the topic`);
