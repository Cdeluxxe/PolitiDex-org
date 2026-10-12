#!/usr/bin/env node
/**
 * test-money-out-voice.mjs — Get Money Out of Politics: two effect lines, a
 * seven-option poll that jumps to the topic's comments, and a nested chip
 * ─────────────────────────────────────────────────────────────────────────────
 * What this file pins:
 *
 *   1. THE MAPPINGS. campaign_finance's drawer rows are exactly the measures the
 *      seed maps to it — H.R. 1 (117th) and H.R. 5746 (117th) — both secondary,
 *      with H.R. 5746's primary row still voting_access. The migration inserts
 *      that one row, secondary, and nothing else.
 *   2. EVERY ROW PRINTS ITS STORED LINE, and only that line, on both measures.
 *   3. THE LINE RULE. One sentence, 140 characters or fewer, no method words, no
 *      midpoint, opens "Would have" (neither became law), carries a term from its
 *      own pair's mapping rationale and ends on the roll the vote seeds hold.
 *   4. ABSENT WHEN NOTHING IS STORED: with a line taken out, its rows print none.
 *   5. THE POLL GATE AND ITS OPTIONS. Counts are readable signed out; an
 *      unverified vote is 403 and writes nothing; a verified resident's option
 *      writes one row; a pole on this issue, or an option on another issue, is
 *      400 and writes nothing. The CHECK, the core and both clients carry the
 *      same seven keys in the same order.
 *   6. THE JUMP LANDS ON THE FILTERED TOPIC COMMENTS: the issue file links to
 *      /district/<seat>?topic=campaign_finance#pdx-topic-comments; the board
 *      reads that issue's posts only, titles them with the issue's name,
 *      preselects it, scrolls once and offers "Show every comment".
 *   7. THE NESTED CHIP. Get Money Out of Politics is drawn beneath Transparency &
 *      Anti-Corruption on Door 1's key shelf, while both keep their core.
 *   8. IT SHIPS: CACHE_VERSION moved past v347.
 *
 *   node scripts/test-money-out-voice.mjs
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";
import { handle as pollHandle, ISSUE_CHOICES, CHOICES } from "../netlify/lib/district-board-poll-core.mjs";
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
  console.error(`\n✗ money-out voice: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};
const tick = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };

const ISSUE = "campaign_finance";
const LABEL = "💸 Get Money Out of Politics";
// [the pair, the House roll its line ends on, a term the pair's rationale holds,
//  the word the line carries for it]
const PAIRS = [
  ["H.R. 1|117|campaign_finance", 62, "$10,000", "$10,000"],
  ["H.R. 1|117|campaign_finance", 62, "600 percent", "six to one"],
  ["H.R. 5746|117|campaign_finance", 9, "Super PAC", "super PAC"],
  ["H.R. 5746|117|campaign_finance", 9, "DISCLOSE", "name their donors"],
];
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary|coded|coding|chip|mapped|mapping|filed as|weight(?:ed)?|scor(?:e|ed|ing)|rationale|archive|ledger|midpoint|median|average)\b|PolitiDex|%|…|\.\.\./i;
// Every new string is held to the equity wall, the ban_stock_buys option's label
// included ("Ban members’ personal trading while in office").
const EQUITY = /\b(?:stocks?|shares?|earn(?:s|ed|ing)?|equity|form c|invest(?:ment|or)?s?|dividends?)\b/i;

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
section("1 · the mappings");
// ═════════════════════════════════════════════════════════════════════════════
const SEED = JSON.parse(R("db/vr-issue-seed.json")).measures || [];
const seedRow = (num, cong) => SEED.find((m) => m.number === num && m.congress === cong);
const mapped = new Set();
for (const m of SEED) for (const i of m.issues || []) if (i.issueKey === ISSUE) mapped.add(`${m.number}|${m.congress}`);
eq([...mapped].sort().join(","), "H.R. 1|117,H.R. 5746|117", "the measures the seed maps to campaign_finance");
const ratOf = (num, cong) => ((seedRow(num, cong) || {}).issues || []).find((i) => i.issueKey === ISSUE) || {};
for (const [num, cong] of [["H.R. 1", 117], ["H.R. 5746", 117]]) {
  const r = ratOf(num, cong);
  eq(r.isPrimary, false, `${num} (${cong}th) is a secondary row on campaign_finance`);
  ok(String(r.rationale || "").length > 80, `${num} (${cong}th) carries a rationale`);
}
const h5746 = seedRow("H.R. 5746", 117);
eq((h5746.issues || []).filter((i) => i.isPrimary).map((i) => i.issueKey).join(","), "voting_access",
  "H.R. 5746's primary row is still voting_access");
{
  const sql = R("netlify/database/migrations/20261114000000_vr_campaign_finance_hr5746_secondary.sql");
  const inserts = [...sql.matchAll(/\(m\.id, '([a-z_]+)', (\d+), (true|false),/g)];
  eq(inserts.map((m) => `${m[1]}:${m[3]}`).join(","), "campaign_finance:false", "the migration inserts one secondary campaign_finance row");
  ok(/WHERE number = 'H\.R\. 5746' AND congress = 117/.test(sql), "…on H.R. 5746 (117th) only");
  ok(/ON CONFLICT \(measure_id, issue_key\) DO NOTHING/.test(sql), "…idempotently");
  ok(sql.includes(String(ratOf("H.R. 5746", 117).rationale).replace(/'/g, "''")), "…with the seed's own rationale");
}
const E = mapOf(CONS, "_DOS_EFFECT");
must(E, "_DOS_EFFECT cannot be read out of consistency.js");
const engine = bootEngine(CONS);
const rows = drawerRows(engine, ISSUE);
must(rows.length > 0, "no member's campaign_finance drawer prints a row");
const acts = [...new Set(rows.filter((r) => r.lane !== "exec").map((r) => r.act))].sort();
eq(acts.join(","), "H.R. 1|117,H.R. 5746|117", "the drawer prints the two mapped measures and nothing else");
console.log(`      ${rows.length} rows on ${new Set(rows.map((r) => r.pid)).size} drawers · ${acts.join(", ")}`);

// ═════════════════════════════════════════════════════════════════════════════
section("2 · every row prints the line stored on its pair");
// ═════════════════════════════════════════════════════════════════════════════
for (const r of rows) {
  const want = E[`${r.act}|${ISSUE}`];
  ok(want && r.eff.length === 1 && r.eff[0] === want,
    `${r.pid}: ${r.act} prints ${JSON.stringify(r.eff)}, stored ${JSON.stringify(want)}`);
}
for (const a of acts) ok(rows.some((r) => r.act === a && r.eff.length === 1), `${a}: no row prints its line`);

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the line rule");
// ═════════════════════════════════════════════════════════════════════════════
function rollTally(num, cong, roll) {
  for (const f of readdirSync(join(ROOT, "db")).filter((x) => x.endsWith(".json"))) {
    let j; try { j = JSON.parse(R(`db/${f}`)); } catch { continue; }
    for (const v of j.votes || []) {
      const n = typeof v.measure === "string" ? v.measure : v.measure && v.measure.number;
      if (n !== num || v.congress !== cong || v.chamber !== "house" || v.rollNumber !== roll) continue;
      if (v.totals && v.totals.yea != null) return [v.totals.yea, v.totals.nay];
      const P = Object.values(v.partyTotals || {});
      if (P.length) return [P.reduce((x, p) => x + p.yea, 0), P.reduce((x, p) => x + p.nay, 0)];
    }
  }
  return null;
}
for (const [k, roll, term, word] of PAIRS) {
  const s = String(E[k] || "");
  must(s, `${k}: no line is stored`);
  const [num, cong] = k.split("|");
  ok(s.length <= 140, `${k}: ${s.length} characters`);
  ok(/[.!?]$/.test(s), `${k}: does not end on a stop`);
  ok(!/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US")), `${k}: more than one sentence`);
  const mw = s.match(METHOD);
  ok(!mw, `${k}: method word ${mw && mw[0]}`);
  ok(/^Would have\b/.test(s), `${k}: neither act became law, so the line opens "Would have"`);
  ok(String(ratOf(num, Number(cong)).rationale || "").includes(term), `${k}: the pair's rationale does not hold "${term}"`);
  ok(s.includes(word), `${k}: the line does not carry "${word}" from its rationale`);
  const t = rollTally(num, Number(cong), roll);
  must(t, `${k}: the vote seeds hold no tally for House roll ${roll}`);
  ok(s.endsWith(`; the House passed it ${t[0]}-${t[1]}.`), `${k}: does not end on the recorded tally ${t.join("-")}`);
}
ok(!mapOf(CONS, "_DOS_MECH")["H.R. 5746|117|campaign_finance"] && !mapOf(CONS, "_DOS_MECH")["H.R. 1|117|campaign_finance"],
  "_DOS_MECH is untouched: the lines come from the mapping rationale, not a new description");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · absent when nothing is stored");
// ═════════════════════════════════════════════════════════════════════════════
{
  let src = CONS;
  for (const k of ["H.R. 1|117|campaign_finance", "H.R. 5746|117|campaign_finance"]) {
    const entry = `    '${k}':\n      '${E[k]}',\n`;
    must(src.includes(entry), `${k} is not stored in the shape this mutation removes`);
    src = src.replace(entry, "");
  }
  const bare = drawerRows(bootEngine(src), ISSUE);
  eq(bare.length, rows.length, "removing the lines changed how many rows the drawer prints");
  eq(bare.filter((r) => r.eff.length).length, 0, "with no line stored, a campaign_finance row still prints an effect paragraph");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the poll gate and its seven options");
// ═════════════════════════════════════════════════════════════════════════════
const OPTS = ["cap_individual", "cap_total", "public_match", "cooling_off", "ban_stock_buys", "dark_money", "none"];
eq((ISSUE_CHOICES[ISSUE] || []).join(","), OPTS.join(","), "the core's options for campaign_finance");
eq(CHOICES.join(","), "support,oppose,not_sure", "every other issue keeps the three poles");
{
  const quoted = OPTS.map((o) => `'${o}'`).join(", ");
  const mig = R("netlify/database/migrations/20261115000000_voice_poll_campaign_finance_choices/migration.sql");
  ok(mig.includes(`"choice" in ('support', 'oppose', 'not_sure') or ("issue_key" = 'campaign_finance' and "choice" in (${quoted}))`),
    "the CHECK admits the seven options on campaign_finance only");
  ok(R("db/schema.ts").includes(`${"${t.issueKey}"} = 'campaign_finance' and ${"${t.choice}"} in (${quoted})`),
    "schema.ts carries the same CHECK");
  const clientKeys = (src) => {
    const a = src.indexOf("campaign_finance: {");
    const b = src.indexOf("]", a);
    return [...src.slice(a, b).matchAll(/key: '([a-z_]+)'/g)].map((m) => m[1]).join(",");
  };
  eq(clientKeys(R("district-poll.js")), OPTS.join(","), "the board widget asks the same seven, in order");
  eq(clientKeys(R("issue-poll.js")), OPTS.join(","), "the issue file asks the same seven, in order");
}
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
    async issueExists(k) { return k === ISSUE || k === "housing"; },
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
    { seatKey: SEAT_KEY, issueKey: ISSUE, authorHash: "a", choice: "cooling_off" },
    { seatKey: SEAT_KEY, issueKey: ISSUE, authorHash: "b", choice: "cooling_off" },
    { seatKey: SEAT_KEY, issueKey: ISSUE, authorHash: "c", choice: "public_match" },
    // A pole that the CHECK would refuse on this issue never reaches a tally.
    { seatKey: SEAT_KEY, issueKey: ISSUE, authorHash: "d", choice: "support" },
  ];
  const res = await pollHandle(pget(SEAT), open.deps);
  eq(res.status, 200, "a signed-out read of the seat's counts");
  const body = await res.json();
  const t = (body.polls || []).find((p) => p.issueKey === ISSUE) || {};
  eq(OPTS.map((o) => t[o]).join("/") + "/" + t.total, "0/0/1/2/0/0/0/3", "signed out, the counts are the store's, per option");
  ok(!("support" in t), "a pole is not a key of this issue's tally");
  eq(body.voice && body.voice.canVote, false, "signed out, the poll does not open");
  eq((body.issueChoices || {})[ISSUE] && body.issueChoices[ISSUE].join(","), OPTS.join(","), "the read publishes the options");
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
    const r = await pollHandle(ppost({ seat: SEAT, issueKey: ISSUE, choice: "cooling_off" }, token), s.deps);
    eq(r.status, 403, `${name}: the vote`);
    eq(s.upserts.length, 0, `${name}: …and nothing was written`);
  }
  const verified = [{ seatKey: SEAT_KEY, authorHash: H, status: "verified", method: "vendor" }];
  const v = pollStore(verified);
  const w = await pollHandle(ppost({ seat: SEAT, issueKey: ISSUE, choice: "dark_money" }, UID), v.deps);
  eq(w.status, 200, "a vendor-verified resident of the seat picks an option");
  eq(v.upserts.length, 1, "…and exactly one row is written");
  eq((await w.json()).poll.dark_money, 1, "…and the answer carries the new count");
  for (const [issueKey, choice, why] of [[ISSUE, "support", "a pole on this issue"], ["housing", "cooling_off", "an option on another issue"], [ISSUE, "lobby_ban", "an option nobody offered"]]) {
    const s = pollStore(verified);
    const r = await pollHandle(ppost({ seat: SEAT, issueKey, choice }, UID), s.deps);
    eq(r.status, 400, `${why}: refused`);
    eq(s.upserts.length, 0, `${why}: …and nothing was written`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the jump lands on the filtered topic comments");
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
  { id: 3, issueKey: ISSUE, body: "Cap the donations.", createdAt: "2026-10-03T00:00:00Z", authorHash: "x" },
  { id: 2, issueKey: "housing", body: "Rents.", createdAt: "2026-10-02T00:00:00Z", authorHash: "y" },
  { id: 1, issueKey: ISSUE, body: "Match small donors.", createdAt: "2026-10-01T00:00:00Z", authorHash: "z" },
];
{
  // The server half: ?issue= reads that issue's posts only.
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
  // The issue file's half: the link.
  const w = makeSandbox();
  w.window = w;
  const hosts = [];
  let click = null;
  w.document.addEventListener = (t, f) => { if (t === "click") click = f; };
  w.document.querySelectorAll = (sel) => (String(sel).includes("data-pdxip-host") ? hosts : []);
  w.PDXVoice = { seatsForMe: () => [{ board: `/district/${SEAT}` }] };
  const calls = [];
  w.fetch = (u, init) => {
    calls.push({ url: String(u), method: (init && init.method) || "GET" });
    return jsonRes({ polls: [{ issueKey: ISSUE, cap_individual: 2, cap_total: 0, public_match: 1, cooling_off: 4, ban_stock_buys: 0, dark_money: 3, none: 0, total: 10 }],
      mine: {}, voice: { canVote: false, reason: "unverified", line: "Only verified residents of this seat get a voice that counts.", note: "" } });
  };
  vm.runInContext(R("issue-poll.js"), vm.createContext(w), { filename: "issue-poll.js" });
  const IP = w.PDXIssuePoll;
  const host = node("", { "data-pdxip-host": ISSUE });
  host.innerHTML = IP.html(ISSUE);
  hosts.push(host);
  await tick();
  const h = host.innerHTML;
  ok(h.includes("What is the best way to get money out of politics?"), "the issue file asks the question");
  eq((h.match(/data-pdxip-choice="/g) || []).length, 7, "…with seven options");
  ok(/data-pdxip-count="cooling_off">4</.test(h) && /data-pdxip-count="dark_money">3</.test(h), "…each with the wire's count, for anyone");
  ok(!/data-pdxip-choice="support"/.test(h), "…and no pole");
  eq((h.match(/data-pdxip-choice="[a-z_]+"[^>]*disabled/g) || []).length, 7, "unverified, every option is off");
  const href = `/district/${SEAT}?topic=${ISSUE}#pdx-topic-comments`;
  ok(h.includes(`href="${href}"`), `the jump is ${href}`);
  if (click) {
    const btn = node("", { "data-pdxip-choice": "cooling_off", "data-pdxip-issue": ISSUE });
    btn.disabled = true;
    click({ target: { closest: (sel) => (sel === "[data-pdxip-choice]" ? btn : null) } });
  }
  await tick();
  eq(calls.filter((c) => c.method === "POST").length, 0, "a press on a locked option sends nothing");
  ok(IP.html("stock_trading_ban").includes("On this seat, where do you stand on this issue?"), "the stock-trading file keeps its three-pole poll");
  const copy = h.replace(/<[^>]+>/g, " ");
  ok(!EQUITY.test(copy), `the new copy carries equity language: ${copy.match(EQUITY)}`);
}
{
  // The board's half: the composer on ?topic=campaign_finance.
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
  ok(h.includes("Cap the donations.") && h.includes("Match small donors.") && !h.includes("Rents."), "…printing that issue's posts only");
  ok(new RegExp(`<option value="${ISSUE}" selected>`).test(h), "the issue is preselected in the comment box");
  eq(band.scrolls, 1, "the band scrolls into view once");
  ok(h.includes(">Show every comment<"), "…and offers \"Show every comment\"");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the nested chip");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = makeSandbox();
  w.window = w;
  const ctx = vm.createContext(w);
  for (const f of ["cmp-data.js", "alignment-tool.js", "pdx-issue-family.js", "issue-colors.js", "door1-workspace.js"]) {
    vm.runInContext(R(f), ctx, { filename: f });
  }
  const F = w.PDXIssueFamily;
  eq(F.subParentOf(ISSUE), "gov_transparency", "Get Money Out of Politics nests under Transparency & Anti-Corruption");
  eq(F.subChildrenOf("gov_transparency").join(","), ISSUE, "…and Transparency names it as its one nested chip");
  eq(F.coreOf(ISSUE), F.coreOf("gov_transparency"), "both keep the same core");
  eq(F.coreOf(ISSUE), "checks_and_balances", "…which is Checks & Balances, unchanged");
  ok(F.childrenOf("checks_and_balances").includes(ISSUE), "campaign_finance is still a child of its core");
  eq(F.subParentOf("gov_transparency"), "", "the parent is not itself nested");
  const shelf = w.PDXDoor1._keyShelf("checks_and_balances", "");
  const nest = (/<span class="d1-chip-nest">([\s\S]*?)<\/span><button|<span class="d1-chip-nest">([\s\S]*?)<\/span><\/div>/.exec(shelf) || []);
  const inner = nest[1] || nest[2] || "";
  ok(/pdxDoor1Issue\('gov_transparency'\)[\s\S]*pdxDoor1Issue\('campaign_finance'\)/.test(inner),
    "on Door 1's shelf the Money Out of Politics chip sits beneath Transparency, in one stack");
  ok(/class="d1-chip is-key is-sub"[^>]*data-d1-sub-of="gov_transparency"/.test(inner), "…marked as the nested chip");
  eq((shelf.match(/pdxDoor1Issue\('campaign_finance'\)/g) || []).length, 1, "…and printed once");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · it ships");
// ═════════════════════════════════════════════════════════════════════════════
{
  const v = Number((/const CACHE_VERSION = 'v(\d+)';/.exec(R("sw.js")) || [])[1]);
  ok(v >= 348, `CACHE_VERSION v${v} — precached files changed, so the shell must move past v347`);
}

if (failures.length) {
  console.error(`\n✗ money-out voice: ${failures.length} failure(s), ${passed} passed`);
  for (const f of failures.slice(0, 40)) console.error("   ✗ " + f);
  process.exit(1);
}
console.log(`\n✓ money-out voice: all ${passed} assertions passed — two mapped measures, two stored lines, seven options behind the gate, and the jump lands on the topic`);
