#!/usr/bin/env node
/**
 * test-sunlight-voice.mjs — Sunlight Governance, Phase 3: District Voice
 * ─────────────────────────────────────────────────────────────────────────────
 * The live rate-case entry (Utah PSC Docket No. 24-035-04) inside District
 * Voice on Utah district boards. Drives the real handler in
 * netlify/lib/sunlight-voice-core.mjs against an in-memory store, and the real
 * client panel (sunlight-voice.js) against that handler. What this pins:
 *
 *   1. A VERIFIED UTAH RESIDENT CAN COMMENT AND SIGNAL SUPPORT on the entry, and
 *      every refusal (signed out, unverified, location-only, wrong seat,
 *      non-Utah seat) writes nothing — District Voice's gate, unchanged.
 *   2. THE DISTRICT SENTIMENT VIEW REFLECTS ENGAGEMENT: counts per Utah seat,
 *      ordered by total actions, with no percentage.
 *   3. "ASK YOUR REP" IS AVAILABLE and records the yes / no / abstain request
 *      against the seat's sitting member (never a caller-sent pid), once per
 *      resident.
 *   4. THE PSC FILING NOTE prints "none flagged" by default and an update when
 *      a filing dated after the order is flagged.
 *   5. THE PANEL: loaded only on Utah boards, controls off until the server
 *      opens them, neutral copy, and nothing else moved (the entry, the stance
 *      generator, the residency gate).
 *
 *   node scripts/test-sunlight-voice.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import * as SV from "../netlify/lib/sunlight-voice-core.mjs";
import { seatHash, LOCKED_LINE } from "../netlify/lib/district-board-voice-core.mjs";
import { SEAT_HOLDERS } from "../netlify/lib/seat-holders.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const section = (t) => console.log(`   ── ${t}`);
const PARTISAN = /\b(republican|democrat|conservative|liberal|progressive|left-wing|right-wing|corrupt|greed|gop)\b/i;

// ── An in-memory store with the Function's dep surface ──────────────────────
function makeStore() {
  const st = { comments: [], votes: [], residency: [], members: [], nextId: 1, writes: 0 };
  const users = { "tok-hd68": { uid: "uid-resident-68", isAnonymous: false },
    "tok-hd68-b": { uid: "uid-resident-68-b", isAnonymous: false },
    "tok-sd3": { uid: "uid-resident-sd3", isAnonymous: false },
    "tok-unverified": { uid: "uid-nobody", isAnonymous: false },
    "tok-location": { uid: "uid-location-only", isAnonymous: false },
    "tok-wa": { uid: "uid-wa", isAnonymous: false } };
  const verify = (uid, seat, method = "vendor") => st.residency.push({ seatKey: seat, authorHash: seatHash(uid, seat), status: "verified", method });
  verify("uid-resident-68", "ut-statehouse-68");
  verify("uid-resident-68-b", "ut-statehouse-68");
  verify("uid-resident-sd3", "ut-statesenate-3");
  verify("uid-location-only", "ut-statehouse-68", "location_match");
  verify("uid-wa", "wa-statehouse-17-p2");
  let clock = new Date("2026-11-08T18:00:00Z");
  const deps = {
    st,
    tick(ms) { clock = new Date(clock.getTime() + ms); },
    now: () => clock,
    async verifyUser(req) {
      const h = req.headers.get("authorization") || "";
      return users[h.replace(/^Bearer /, "")] || null;
    },
    async findResidency(seatKey, hash) {
      return st.residency.find((r) => r.seatKey === seatKey && r.authorHash === hash) || null;
    },
    async findMembership() { return null; },
    async listComments(target, cap) {
      return st.comments.filter((c) => c.targetId === target && c.status === "active")
        .sort((a, b) => b.createdAt - a.createdAt || b.id - a.id).slice(0, cap);
    },
    async countCommentsSince(target, hash, since) {
      return st.comments.filter((c) => c.targetId === target && c.authorUid === hash && c.createdAt >= since).length;
    },
    async insertComment(v) {
      st.writes++;
      const row = { id: st.nextId++, ...v, status: "active", createdAt: new Date(clock) };
      st.comments.push(row);
      return { id: row.id, body: row.body, createdAt: row.createdAt };
    },
    async voteCount(target, vote) { return st.votes.filter((v) => v.targetId === target && v.vote === vote).length; },
    async hasVote(target, hash) { return st.votes.some((v) => v.targetId === target && v.uid === hash); },
    async addVote(v) {
      if (st.votes.some((x) => x.targetId === v.targetId && x.uid === v.uid)) return false;
      st.writes++;
      st.votes.push({ ...v });
      return true;
    },
    async removeVote(target, hash) {
      st.writes++;
      st.votes = st.votes.filter((v) => !(v.targetId === target && v.uid === hash));
    },
    async engagementRows() {
      const out = new Map();
      for (const c of st.comments) {
        if (c.status !== "active" || !c.targetId.startsWith(SV.TARGET_PREFIXES.comment)) continue;
        const k = "c|" + c.targetId;
        out.set(k, { targetId: c.targetId, kind: "comment", n: (out.get(k)?.n || 0) + 1 });
      }
      for (const v of st.votes) {
        if (!v.targetId.startsWith(SV.TARGET_PREFIXES.support) && !v.targetId.startsWith(SV.TARGET_PREFIXES.ask)) continue;
        const k = "v|" + v.targetId + "|" + v.vote;
        out.set(k, { targetId: v.targetId, kind: "vote", vote: v.vote, n: (out.get(k)?.n || 0) + 1 });
      }
      return [...out.values()];
    },
  };
  return deps;
}

const BASE = "https://politidex.fyi/api/sunlight-voice";
function req(method, { token, query = "", body } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = "Bearer " + token;
  return new Request(BASE + query, { method, headers, body: body ? JSON.stringify(body) : undefined });
}
async function call(deps, method, opts) {
  const res = await SV.handle(req(method, opts), deps);
  return { status: res.status, data: await res.json() };
}

// ═════════════════════════════════════════════════════════════════════════════
// 0 · The entry the panel names is the live entry
// ═════════════════════════════════════════════════════════════════════════════
section("the panel names the live rate-case entry, unchanged");
{
  const w = {}; w.window = w;
  const ctx = vm.createContext(w);
  vm.runInContext(R("sunlight-entries.js"), ctx);
  const e = w.PDXSunlightEntries.byId[SV.ENTRY.id];
  ok(e, "the entry id is not a live Sunlight entry");
  if (e) {
    eq(SV.ENTRY.title, e.title, "entry title");
    eq(SV.ENTRY.href, e.href, "entry href");
    eq(SV.ENTRY.askLabel, e.ask.label, "ask label");
    eq(SV.ENTRY.orderDate, e.orderDate, "order date");
    eq(SV.ORDER_URL, e.source.url, "order URL");
  }
  eq(SV.ENTRY.askLabel, "Publish one confidential contract", "the narrow ask");
}

// ═════════════════════════════════════════════════════════════════════════════
// 1 · A verified Utah resident can comment and signal support
// ═════════════════════════════════════════════════════════════════════════════
section("a verified Utah resident can comment and signal support");
const D = makeStore();
{
  // Reading is open: a signed-out GET gets everything, with the controls off.
  const g = await call(D, "GET", { query: "?seat=ut-hd-68" });
  eq(g.status, 200, "signed-out read");
  eq(g.data.voice.canPost, false, "signed-out canPost");
  eq(g.data.voice.line, LOCKED_LINE, "signed-out sees District Voice's locked line");
  eq(g.data.seat, "ut-hd-68", "seat alias");
  eq(g.data.district.label, "Utah House District 68", "district label");
  eq(g.data.entry.id, SV.ENTRY.id, "entry id on the wire");

  const v = await call(D, "GET", { token: "tok-hd68", query: "?seat=ut-hd-68" });
  eq(v.data.voice.canPost, true, "a vendor-verified HD-68 resident can act");

  const c = await call(D, "POST", { token: "tok-hd68", body: { seat: "ut-hd-68", action: "comment", body: "  When will the Cedar Springs IV pricing be filed publicly?  " } });
  eq(c.status, 201, "comment accepted");
  eq(c.data.comment.body, "When will the Cedar Springs IV pricing be filed publicly?", "comment body trimmed");
  eq(c.data.comment.mine, true, "comment is the caller's");
  ok(!("authorUid" in c.data.comment) && !JSON.stringify(c.data).includes("uid-resident-68"), "a uid or hash leaked on the wire");
  const row = D.st.comments[0];
  eq(row.targetId, "sunlight_voice:ut-psc-24-035-04:ut-statehouse-68", "comment target");
  eq(row.authorUid, seatHash("uid-resident-68", "ut-statehouse-68"), "author column holds the seat-scoped hash, not the uid");
  eq(row.authorName, "Verified resident", "fixed author name");

  const s = await call(D, "POST", { token: "tok-hd68", body: { seat: "ut-hd-68", action: "support" } });
  eq(s.status, 200, "support accepted");
  eq(s.data.support.count, 1, "support count");
  eq(s.data.support.mine, true, "support is the caller's");
  const s2 = await call(D, "POST", { token: "tok-hd68", body: { seat: "ut-hd-68", action: "support" } });
  eq(s2.data.support.count, 1, "a second support from the same resident does not double-count");

  const after = await call(D, "GET", { token: "tok-hd68", query: "?seat=ut-hd-68" });
  eq(after.data.comments.length, 1, "the comment reads back");
  eq(after.data.support.count, 1, "the support reads back");
  eq(after.data.support.mine, true, "the support reads back as mine");
  const anon = await call(D, "GET", { query: "?seat=ut-hd-68" });
  eq(anon.data.comments[0].mine, false, "a signed-out reader is not the author");
  eq(anon.data.support.mine, false, "a signed-out reader has no support");

  // Withdraw and re-signal.
  const off = await call(D, "POST", { token: "tok-hd68", body: { seat: "ut-hd-68", action: "support", on: false } });
  eq(off.data.support.count, 0, "support withdrawn");
  await call(D, "POST", { token: "tok-hd68", body: { seat: "ut-hd-68", action: "support" } });

  // District Voice's daily comment cap still applies.
  const again = await call(D, "POST", { token: "tok-hd68", body: { seat: "ut-hd-68", action: "comment", body: "Second today" } });
  eq(again.status, 429, "the daily comment cap applies");
  D.tick(26 * 3600 * 1000);
  const next = await call(D, "POST", { token: "tok-hd68", body: { seat: "ut-hd-68", action: "comment", body: "Next day" } });
  eq(next.status, 201, "a comment the next day is accepted");

  // Body checks.
  eq((await call(D, "POST", { token: "tok-hd68-b", body: { seat: "ut-hd-68", action: "comment", body: "   " } })).status, 400, "empty comment");
  eq((await call(D, "POST", { token: "tok-hd68-b", body: { seat: "ut-hd-68", action: "comment", body: "x".repeat(281) } })).status, 400, "comment over 280");
  eq((await call(D, "POST", { token: "tok-hd68-b", body: { seat: "ut-hd-68", action: "nope" } })).status, 400, "unknown action");
}
section("every refusal writes nothing; residency rules are District Voice's");
{
  const before = D.st.writes;
  const tries = [
    [undefined, "ut-hd-68", 403, "signed out"],
    ["tok-unverified", "ut-hd-68", 403, "signed in, no residency"],
    ["tok-location", "ut-hd-68", 403, "a location_match row is not proof"],
    ["tok-sd3", "ut-hd-68", 403, "verified for another Utah seat"],
    ["tok-wa", "wa-hd-17-p2", 404, "a non-Utah board"],
    ["tok-hd68", "ut-hd-999", 404, "an unmapped seat"],
  ];
  for (const [token, seat, want, label] of tries) {
    for (const action of ["comment", "support", "ask"]) {
      const r = await call(D, "POST", { token, body: { seat, action, body: "hello" } });
      eq(r.status, want, `${label} · ${action}`);
    }
  }
  eq(D.st.writes, before, "a refused request wrote to the store");
  eq((await call(D, "GET", { query: "?seat=wa-hd-17-p2" })).status, 404, "a non-Utah board has no panel");

  // The SD-3 resident can act on their own seat.
  const sd3 = await call(D, "POST", { token: "tok-sd3", body: { seat: "ut-sd-3", action: "comment", body: "Following this docket." } });
  eq(sd3.status, 201, "a verified SD-3 resident comments on SD-3");
}

// ═════════════════════════════════════════════════════════════════════════════
// 2 · The district sentiment view reflects engagement
// ═════════════════════════════════════════════════════════════════════════════
section("the district sentiment view reflects engagement");
{
  await call(D, "POST", { token: "tok-hd68-b", body: { seat: "ut-hd-68", action: "support" } });
  const g = await call(D, "GET", {});
  eq(g.status, 200, "the statewide view reads without a seat");
  const lines = g.data.sentiment;
  eq(lines.length, 2, "two districts have engagement");
  eq(lines[0].seat, "ut-hd-68", "the most-engaged district is first");
  eq(lines[0].comments, 2, "HD-68 comments");
  eq(lines[0].support, 2, "HD-68 support signals");
  eq(lines[0].asks, 0, "HD-68 rep asks so far");
  eq(lines[0].total, 4, "HD-68 total actions");
  eq(lines[0].href, "/district/ut-hd-68", "the line links the board");
  eq(lines[1].seat, "ut-sd-3", "SD-3 is listed");
  eq(lines[1].label, "Utah Senate District 3", "SD-3 label");
  eq(lines[1].total, 1, "SD-3 total");
  ok(!/%/.test(JSON.stringify(g.data.sentiment)) && !/%/.test(g.data.sentimentNote), "the view carries a percentage");
  ok(/not a vote/i.test(g.data.sentimentNote), "the view does not say engagement is not a vote");

  // More engagement moves the order.
  for (let i = 0; i < 4; i++) {
    D.st.votes.push({ targetId: SV.supportTarget("ut-statesenate-3"), uid: "h" + i, vote: "support" });
  }
  const g2 = await call(D, "GET", {});
  eq(g2.data.sentiment[0].seat, "ut-sd-3", "the view re-orders as engagement changes");
  eq(g2.data.sentiment[0].total, 5, "SD-3 total after new support");

  // Look-alike rows are never counted.
  const rows = [
    { targetId: "sunlightxsupport:ut-psc-24-035-04:ut-statehouse-68", kind: "vote", vote: "support", n: 9 },
    { targetId: "sunlight_support:ut-psc-24-035-04:wa-statehouse-17-p2", kind: "vote", vote: "support", n: 9 },
    { targetId: "sunlight_support:ut-psc-24-035-04:ut-statehouse-68", kind: "vote", vote: "like", n: 9 },
    { targetId: "sunlight_ask:ut-psc-24-035-04:ut-statehouse-68", kind: "vote", vote: "yes_no_abstain", n: 9 },
  ];
  eq(SV.sentimentFrom(rows).length, 0, "look-alike or malformed targets were counted");
  // The open /api/threads route cannot write these families.
  const TARGET_RE = /^[a-z]+:[^\s,:]{1,90}:[a-z0-9][a-z0-9-]{0,90}$/;
  ok(R("netlify/functions/threads.mts").includes(String(TARGET_RE).slice(1, -1)), "threads.mts target shape moved; re-check the families");
  for (const t of [SV.commentTarget("ut-statehouse-68"), SV.supportTarget("ut-statehouse-68"), SV.askTarget("ut-statehouse-68", "chew_h68")]) {
    ok(!TARGET_RE.test(t), `${t} is writable through /api/threads`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 3 · Ask your rep
// ═════════════════════════════════════════════════════════════════════════════
section("\"ask your rep\" is available and records the yes/no/abstain request");
{
  const holder = SEAT_HOLDERS["ut-statehouse-68"];
  const g = await call(D, "GET", { token: "tok-hd68", query: "?seat=ut-hd-68" });
  const a = g.data.ask;
  eq(a.available, true, "the ask is available on a seat with a sitting member");
  eq(a.holder.pid, holder.pid, "the ask names the seat's sitting member");
  eq(a.holder.name, holder.name, "holder name");
  eq(a.question, "Publish one confidential contract", "the ask question");
  eq(JSON.stringify(a.options), JSON.stringify(["yes", "no", "abstain"]), "the requested answers");
  eq(a.requests, 0, "no requests yet");
  eq(a.mine, false, "not asked yet");
  eq(a.position, null, "no public position on record");
  eq(a.positionNote, "No public position on record yet.", "position note");

  // A caller-sent pid is ignored: the request goes to the sitting member.
  const r = await call(D, "POST", { token: "tok-hd68", body: { seat: "ut-hd-68", action: "ask", pid: "someone_else" } });
  eq(r.status, 201, "ask recorded");
  eq(r.data.ask.holder.pid, holder.pid, "the request is to the sitting member, not the payload pid");
  eq(r.data.ask.requests, 1, "one request");
  eq(r.data.ask.added, true, "the request was written");
  const stored = D.st.votes.find((v) => v.targetId.startsWith(SV.TARGET_PREFIXES.ask));
  eq(stored.targetId, `sunlight_ask:ut-psc-24-035-04:ut-statehouse-68:${holder.pid}`, "ask target");
  eq(stored.vote, "yes_no_abstain", "the stored request is the yes/no/abstain question");
  eq(stored.uid, seatHash("uid-resident-68", "ut-statehouse-68"), "the requester is the seat-scoped hash");

  const again = await call(D, "POST", { token: "tok-hd68", body: { seat: "ut-hd-68", action: "ask" } });
  eq(again.status, 200, "a second ask is a no-op");
  eq(again.data.ask.requests, 1, "a second ask does not double-count");
  await call(D, "POST", { token: "tok-hd68-b", body: { seat: "ut-hd-68", action: "ask" } });
  const g2 = await call(D, "GET", { token: "tok-hd68", query: "?seat=ut-hd-68" });
  eq(g2.data.ask.requests, 2, "two residents asked");
  eq(g2.data.ask.mine, true, "reads back as mine");
  const view = (await call(D, "GET", {})).data.sentiment.find((l) => l.seat === "ut-hd-68");
  eq(view.asks, 2, "rep asks count in the district view");

  // A seat with no sitting member on file has no ask, and writes nothing.
  const holders = { ...SEAT_HOLDERS };
  delete holders["ut-statehouse-68"];
  const D2 = makeStore(); D2.holders = holders;
  const none = await call(D2, "GET", { token: "tok-hd68", query: "?seat=ut-hd-68" });
  eq(none.data.ask.available, false, "no holder → no ask");
  eq((await call(D2, "POST", { token: "tok-hd68", body: { seat: "ut-hd-68", action: "ask" } })).status, 404, "no holder → ask refused");
  eq(D2.st.writes, 0, "no holder → nothing written");

  // A sourced public position, when one is entered, reads back.
  const D3 = makeStore(); D3.positions = { [holder.pid]: { position: "yes", date: "2026-11-01", source: "https://example.org/statement" } };
  const p = await call(D3, "GET", { query: "?seat=ut-hd-68" });
  eq(p.data.ask.position && p.data.ask.position.position, "yes", "a sourced position reads back");
  const D4 = makeStore(); D4.positions = { [holder.pid]: { position: "yes" } };
  eq((await call(D4, "GET", { query: "?seat=ut-hd-68" })).data.ask.position, null, "an unsourced position is not printed");
}

// ═════════════════════════════════════════════════════════════════════════════
// 4 · PSC filing note
// ═════════════════════════════════════════════════════════════════════════════
section("the PSC filing update note");
{
  const n = SV.filingsNote();
  eq(n.hasUpdates, false, "no filings flagged by default");
  ok(/No new public PSC filings flagged/.test(n.note), "default note");
  const f = SV.filingsNote([
    { date: "2024-12-01", title: "Old testimony", url: "https://pscdocs.utah.gov/a.pdf" },
    { date: "2026-10-30", title: "Public version of a filed contract", url: "https://pscdocs.utah.gov/b.pdf" },
    { date: "2026-11-02", title: "No URL" },
  ]);
  eq(f.hasUpdates, true, "a filing after the order is an update");
  eq(f.updates.length, 1, "only dated, sourced filings after the order count");
  ok(/A new public filing in Docket No\. 24-035-04/.test(f.note), "update note wording");
  const D5 = makeStore(); D5.filings = [{ date: "2026-10-30", title: "Public version", url: "https://pscdocs.utah.gov/b.pdf" }];
  const g = await call(D5, "GET", { query: "?seat=ut-hd-68" });
  eq(g.data.filings.hasUpdates, true, "the flag reaches the board's read");
}

// ═════════════════════════════════════════════════════════════════════════════
// 5 · The panel
// ═════════════════════════════════════════════════════════════════════════════
section("the panel paints on Utah boards with the server's gate");
function node(tag) {
  const n = { tagName: tag, id: "", className: "", innerHTML: "", value: "", attrs: {}, children: [], parentNode: null, listeners: {},
    setAttribute(k, v) { n.attrs[k] = String(v); if (k === "id") n.id = v; },
    getAttribute(k) { return k in n.attrs ? n.attrs[k] : null; },
    addEventListener(t, f) { (n.listeners[t] ||= []).push(f); },
    closest(sel) { return sel === ".pdxdb-wrap" ? n.wrap || null : null; },
    querySelector() { return null; },
    appendChild(c) { n.children.push(c); c.parentNode = n; return c; },
    insertBefore(c) { n.children.push(c); c.parentNode = n; return c; } };
  return n;
}
async function bootPanel(deps, token, alias) {
  const byId = {};
  const main = node("MAIN");
  const wrap = node("DIV"); wrap.parentNode = main; wrap.nextSibling = null;
  const comp = node("DIV"); comp.setAttribute("data-pdxdc-seat", alias); comp.wrap = wrap;
  byId["pdx-district-composer"] = comp;
  const head = node("HEAD");
  const doc = {
    readyState: "complete", head, body: node("BODY"),
    getElementById: (id) => byId[id] || main.children.find((c) => c.id === id) || head.children.find((c) => c.id === id) || null,
    createElement: (t) => node(t.toUpperCase()),
    addEventListener() {}, querySelector: () => null,
  };
  const pending = [];
  const w = {
    document: doc, Date, JSON, Promise, encodeURIComponent,
    auth: token ? { currentUser: { isAnonymous: false, getIdToken: () => Promise.resolve(token) }, onAuthStateChanged() {} } : null,
    fetch(url, opts) {
      const p = SV.handle(new Request("https://politidex.fyi" + url, { method: opts.method, headers: opts.headers, body: opts.body }), deps)
        .then((res) => ({ ok: res.ok, status: res.status, json: () => res.json() }));
      pending.push(p);
      return p;
    },
  };
  w.window = w;
  vm.runInContext(R("sunlight-voice.js"), vm.createContext(w), { filename: "sunlight-voice.js" });
  for (let i = 0; i < 6; i++) { await Promise.all(pending); await new Promise((r) => setTimeout(r, 0)); }
  const host = main.children.find((c) => c.id === "pdx-sunlight-voice");
  return { w, host };
}
{
  const { host } = await bootPanel(D, "tok-hd68", "ut-hd-68");
  ok(host, "the panel did not mount on a Utah board");
  const h = host ? host.innerHTML : "";
  ok(h.includes('data-sv-entry="UT-PSC-24-035-04"'), "panel names the entry");
  ok(h.includes(SV.ENTRY.title) && h.includes('href="/sunlight#rmp-24-035-04"'), "panel links the entry");
  ok(/data-sv-act="support"(?![^>]*disabled)/.test(h), "support is enabled for a verified resident");
  ok(/data-sv-act="comment"(?![^>]*disabled)/.test(h), "comment is enabled for a verified resident");
  ok(h.includes('data-sv-ask-mine="1"'), "the panel shows the resident already asked");
  ok(/Ask your representative/.test(h) && h.includes(SEAT_HOLDERS["ut-statehouse-68"].name), "the ask names the representative");
  ok(/>yes<[\s\S]*>no<[\s\S]*>abstain</.test(h), "the ask lists yes / no / abstain");
  ok(h.includes('data-sv-sentiment="1"') && h.includes('data-sv-district="ut-hd-68"'), "the panel prints the district view");
  ok(h.includes('data-sv-filings="none"'), "the filing note prints");
  ok(!/%/.test(h.replace(/<style[\s\S]*?<\/style>/g, "")), "the panel prints a percentage");
  ok(!PARTISAN.test(h), "the panel carries partisan language");

  const anon = await bootPanel(D, null, "ut-hd-68");
  const ah = anon.host ? anon.host.innerHTML : "";
  ok(/data-sv-act="support"[^>]*disabled/.test(ah), "support is off for a signed-out reader");
  ok(/data-sv-act="comment"[^>]*disabled/.test(ah), "comment is off for a signed-out reader");
  ok(/data-sv-act="ask"[^>]*disabled/.test(ah), "ask is off for a signed-out reader");
  ok(ah.includes(LOCKED_LINE), "a signed-out reader sees the locked line");
  ok(ah.includes("When will the Cedar Springs IV pricing"), "reading stays open");

  const wa = await bootPanel(D, "tok-wa", "wa-hd-17-p2");
  ok(!wa.host, "the panel mounted on a non-Utah board");
}

section("district-composer.js loads the panel on Utah boards only");
{
  const C = R("district-composer.js");
  ok(/if \(\/\^ut-\/\.test\(seat\)\) loadSunlightVoice\(\);/.test(C), "the composer does not gate the panel on a Utah seat");
  ok(C.includes("s.src = '/sunlight-voice.js'"), "the composer does not load sunlight-voice.js");
  ok(/const CACHE_VERSION = 'v(\d+)'/.test(R("sw.js")) && Number(/const CACHE_VERSION = 'v(\d+)'/.exec(R("sw.js"))[1]) >= 534, "the service worker did not move");
}

section("neutral framing, and nothing else moved");
{
  const copy = JSON.stringify(SV.COPY) + R("sunlight-voice.js").replace(/\/\*[\s\S]*?\*\//g, "");
  ok(!PARTISAN.test(copy), "the panel copy carries partisan or ideological language");
  ok(!/\b(pass|enact) (a|the|new) (law|bill)\b/i.test(copy), "the panel calls for legislation");
  // The stance generator and the core entry do not know about this panel.
  for (const f of ["issue-map.js", "alignment-tool.js", "stance-studio.js", "sunlight-entries.js", "sunlight.html"]) {
    ok(!/sunlight-voice|sunlight_voice|PDXSunlightVoice/.test(R(f)), `${f} names the District Voice panel`);
  }
  // The residency gate is imported, not re-implemented.
  const core = R("netlify/lib/sunlight-voice-core.mjs");
  ok(/import \{[^}]*\bgate\b[^}]*\} from "\.\/district-board-voice-core\.mjs"/.test(core), "the core does not reuse District Voice's gate");
  ok(!/voice_residency|insert\(voiceResidency/.test(R("netlify/functions/sunlight-voice.mts").replace(/\/\/.*$/gm, "")), "the function writes residency");
}

if (failures.length) {
  console.error(`\n✗ sunlight voice: ${failures.length} failure(s)\n` + failures.map((f) => "   · " + f).join("\n"));
  process.exit(1);
}
console.log(`✓ sunlight voice: ${passed} checks passed`);
