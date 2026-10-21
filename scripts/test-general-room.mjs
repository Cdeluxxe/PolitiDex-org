#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for THE GENERAL ROOM ON EVERY BOARD, AND LIKES (sw v380)
// ─────────────────────────────────────────────────────────────────────────────
//   1. THE HOLDER TABLE: every composer seat names its roster pid, agrees with
//      district-board.js's own BOARDS pid, and gen-seat-holders.mjs --check is
//      clean.
//   2. THE CURRENT HOLDER'S THREAD: GET ?room=general names the sitting member;
//      a POST lands only with a vendor-verified residency row for THAT seat,
//      under the sitting member's pid whatever the payload says; issue feeds
//      never carry a general row.
//   3. A ROSTER CHANGE: rollHolders() moves the outgoing pid into `previous`;
//      the old rows stay under the old pid, the new holder's thread starts
//      empty, new comments go to the new pid, and a politician who later holds
//      another seat starts a separate thread there.
//   4. PRIOR-HOLDER LINKS open the right old thread, read-only — in the wire
//      and in the composer's own painting and fetch.
//   5. LIKES: one per verified resident, a second is a no-op, unverified 403
//      with nothing written, another seat's comment 404, counts only.
//   6. THE SEARCH MISS lands in the general section.
//   7. Neighbouring boards, BOARD_ROUTES and the composer lists did not move;
//      the migration is additive; no equity/stock/membership/premium copy;
//      the shell moved.
//
//   node scripts/test-general-room.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { handle, COMPOSER_SEATS, LOCKED_LINE, seatHash } from "../netlify/lib/district-board-voice-core.mjs";
import { rollHolders, threadFor } from "../netlify/lib/general-room-core.mjs";
import { SEAT_HOLDERS } from "../netlify/lib/seat-holders.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HEAD = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);

// ── 1 ───────────────────────────────────────────────────────────────────────
section("1 · the holder table");
{
  const seats = Object.keys(COMPOSER_SEATS);
  for (const s of seats) {
    const h = SEAT_HOLDERS[s];
    ok(!!h && /^[a-z][a-z0-9_]*$/.test(h.pid) && !!h.name, `${s} names a sitting pid and a name`);
  }
  eq(Object.keys(SEAT_HOLDERS).sort().join(","), seats.sort().join(","), "the table covers exactly the composer seats");
  // district-board.js's own pid for every board that writes one down.
  const win = makeSandbox();
  vm.runInContext(R("district-board.js"), vm.createContext(win), { filename: "district-board.js" });
  const BOARDS = win.PDXDistrictBoard.BOARDS;
  let compared = 0;
  for (const k of Object.keys(BOARDS)) {
    const b = BOARDS[k];
    if (!b.pid || !SEAT_HOLDERS[b.seat]) continue;
    compared++;
    eq(SEAT_HOLDERS[b.seat].pid, b.pid, `${b.alias}: the general room keys to the pid band 1 names`);
  }
  ok(compared > 50, `the comparison covered the boards that carry a pid (${compared})`);
  let check = "";
  try { check = execFileSync("node", ["scripts/gen-seat-holders.mjs", "--check"], { cwd: ROOT, encoding: "utf8" }); }
  catch (e) { check = "FAILED " + (e.stdout || ""); }
  ok(/up to date/.test(check), "gen-seat-holders.mjs --check is clean");
}

// ── THE FAKE STORE ──────────────────────────────────────────────────────────
function fakeStore(residencyRows, holders) {
  const store = { posts: [], likes: [], inserts: [], likeInserts: 0 };
  let id = 0;
  store.deps = {
    async verifyUser(req) {
      const h = req.headers.get("authorization") || "";
      if (!h.startsWith("Bearer ")) return null;
      return { uid: h.slice(7), isAnonymous: false };
    },
    async findResidency(seatKey, hash) {
      return residencyRows.find((r) => r.seatKey === seatKey && r.authorHash === hash) || null;
    },
    async issueExists(k) { return k === "housing" || k === "water"; },
    async listPosts(seatKey, cap, issueKey) {
      return store.posts.filter((p) => p.seatKey === seatKey && p.issueKey && (!issueKey || p.issueKey === issueKey)).slice(0, cap);
    },
    async listGeneral(seatKey, pid, cap) {
      return store.posts.filter((p) => p.seatKey === seatKey && !p.issueKey && p.holderPid === pid).slice(0, cap);
    },
    async findMembership() { return { status: "active", currentPeriodEnd: null }; },
    async insertPost(v) {
      store.inserts.push(v);
      const row = { id: ++id, seatKey: v.seatKey, issueKey: v.issueKey, holderPid: v.holderPid || null, body: v.body,
        createdAt: new Date(Date.UTC(2026, 9, 1, 0, id)).toISOString(), authorHash: v.authorHash };
      store.posts.unshift(row);
      return { id: row.id, issueKey: row.issueKey, holderPid: row.holderPid, body: row.body, createdAt: row.createdAt };
    },
    async findTake(tid) {
      const p = store.posts.find((x) => x.id === tid);
      return p ? { id: p.id, seatKey: p.seatKey } : null;
    },
    async insertLike(v) {
      store.likeInserts++;
      if (store.likes.some((l) => l.takeId === v.takeId && l.likerHash === v.likerHash)) return false;
      store.likes.push({ ...v });
      return true;
    },
    async likeCounts(ids, viewer) {
      return ids.map((t) => {
        const ls = store.likes.filter((l) => l.takeId === t);
        return { takeId: t, n: ls.length, mine: !!viewer && ls.some((l) => l.likerHash === viewer) };
      }).filter((r) => r.n > 0);
    },
  };
  if (holders) store.deps.holders = holders;
  return store;
}
const post = (body, token) => new Request("https://politidex.fyi/api/district-board-voice", {
  method: "POST",
  headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) },
  body: JSON.stringify(body),
});
const get = (q, token) => new Request(`https://politidex.fyi/api/district-board-voice?${q}`, {
  headers: token ? { authorization: "Bearer " + token } : {},
});
const vendor = (uid, seat) => ({ seatKey: seat, authorHash: seatHash(uid, seat), status: "verified", method: "vendor" });
const noPerson = (txt, uids, m) => {
  ok(!/authorHash|author_hash|likerHash|liker_hash|"uid"/.test(txt), `${m}: no hash or uid field on the wire`);
  for (const u of uids) ok(!txt.includes(u), `${m}: ${u} is not on the wire`);
};

const GOV = "ut-gov";
const COX = SEAT_HOLDERS[GOV];
const A = "uid-alice", B = "uid-bob";

// ── 2 ───────────────────────────────────────────────────────────────────────
section("2 · the current holder's thread");
{
  const s = fakeStore([vendor(A, GOV), vendor(B, "ut-statesenate-3")]);
  const g0 = await handle(get(`seat=${GOV}&room=general`), s.deps);
  eq(g0.status, 200, "anyone reads the general room");
  const d0 = await g0.json();
  eq(d0.room, "general", "the read says it is the general room");
  eq(d0.general.holder.pid, COX.pid, "…for the sitting member's pid");
  eq(d0.general.holder.name, COX.name, "…by name");
  eq(d0.general.current, true, "…and it is the current thread");
  eq(d0.posts.length, 0, "an empty room is an empty list");
  eq(d0.voice.canPost, false, "a signed-out reader cannot post");

  for (const [why, tok] of [["signed out", null], ["no residency row", "uid-carol"], ["verified for another seat", B]]) {
    const before = s.inserts.length;
    const r = await handle(post({ seat: GOV, room: "general", body: "Roads first." }, tok), s.deps);
    eq(r.status, 403, `${why}: a general post is 403`);
    eq(s.inserts.length, before, `${why}: nothing written`);
    eq((await r.json()).error, LOCKED_LINE, `${why}: the refusal is the locked line`);
  }
  const r1 = await handle(post({ seat: GOV, room: "general", body: "First general comment.", holder: "someone_else", holderPid: "someone_else" }, A), s.deps);
  eq(r1.status, 201, "a vendor-verified resident of the seat posts to the general room");
  eq(s.inserts.at(-1).holderPid, COX.pid, "…under the SITTING member's pid, whatever the payload sent");
  eq(s.inserts.at(-1).issueKey, null, "…with no issue");
  eq((await r1.json()).holder, COX.pid, "…and the reply says whose thread it joined");
  await handle(post({ seat: GOV, room: "general", body: "Second general comment." }, A), s.deps);
  const empty = await handle(post({ seat: GOV, room: "general", body: "   " }, A), s.deps);
  eq(empty.status, 400, "an empty general comment is 400");

  const d1 = await (await handle(get(`seat=${GOV}&room=general`, A), s.deps)).json();
  eq(d1.posts.map((p) => p.body).join("|"), "Second general comment.|First general comment.", "newest first");
  eq(d1.voice.canPost, true, "the verified resident may post here");
  eq(d1.posts[0].mine, true, "…and sees their own comment as theirs");
  noPerson(JSON.stringify(d1), [A], "general GET");

  await handle(post({ seat: GOV, issueKey: "housing", body: "An issue comment." }, A), s.deps);
  const feed = await (await handle(get(`seat=${GOV}`), s.deps)).json();
  eq(feed.posts.map((p) => p.body).join("|"), "An issue comment.", "the issue feed carries no general comment");
  const gAgain = await (await handle(get(`seat=${GOV}&room=general`), s.deps)).json();
  ok(!gAgain.posts.some((p) => p.issueKey), "the general room carries no issue comment");
}

// ── 3 ───────────────────────────────────────────────────────────────────────
section("3 · a roster change");
{
  const now = {};
  for (const [k, h] of Object.entries(SEAT_HOLDERS)) now[k] = { pid: h.pid, name: h.name };
  eq(JSON.stringify(rollHolders(SEAT_HOLDERS, now)), JSON.stringify(Object.fromEntries(Object.keys(SEAT_HOLDERS).sort().map((k) => [k, SEAT_HOLDERS[k]]))),
    "no roster change, no history change");
  now[GOV] = { pid: "new_governor", name: "New Governor" };
  const T2 = rollHolders(SEAT_HOLDERS, now);
  eq(T2[GOV].pid, "new_governor", "the incoming member is the holder");
  eq(T2[GOV].previous[0] && T2[GOV].previous[0].pid, COX.pid, "the outgoing member is the first previous holder");
  eq(T2["ut-statesenate-3"].pid, SEAT_HOLDERS["ut-statesenate-3"].pid, "a neighbouring seat did not move");
  eq(T2["ut-statesenate-3"].previous.length, 0, "…and gained no history");

  const s = fakeStore([vendor(A, GOV)]);
  await handle(post({ seat: GOV, room: "general", body: "Under the old holder." }, A), s.deps);
  s.deps.holders = T2;
  const fresh = await (await handle(get(`seat=${GOV}&room=general`, A), s.deps)).json();
  eq(fresh.general.holder.pid, "new_governor", "after the change the board opens the new holder's thread");
  eq(fresh.posts.length, 0, "…which starts empty");
  eq(fresh.general.previous.map((h) => h.pid).join(","), COX.pid, "…with the old holder listed as previous");
  const r = await handle(post({ seat: GOV, room: "general", body: "Under the new holder." }, A), s.deps);
  eq(r.status, 201, "a verified resident posts to the new thread");
  eq(s.inserts.at(-1).holderPid, "new_governor", "…under the new pid");
  const old = s.posts.find((p) => p.body === "Under the old holder.");
  eq(old && old.holderPid, COX.pid, "the old row is still under the old pid");
  const past = await (await handle(get(`seat=${GOV}&room=general&holder=${COX.pid}`, A), s.deps)).json();
  eq(past.general.holder.pid, COX.pid, "the previous holder's thread opens by pid");
  eq(past.general.current, false, "…marked as not current");
  eq(past.posts.map((p) => p.body).join("|"), "Under the old holder.", "…with exactly its own rows");
  eq(past.voice.canPost, false, "…and it is read-only, even for a verified resident");
  const stray = await (await handle(get(`seat=${GOV}&room=general&holder=lee`), s.deps)).json();
  eq(stray.general.holder.pid, "new_governor", "a pid this seat never had falls back to the current thread");
  eq(threadFor(GOV, "lee", T2).pid, "new_governor", "…by the same rule in the core");

  // The same politician, later on a DIFFERENT seat: a separate thread.
  const moved = { ...now, "ut-statesenate-3": { pid: COX.pid, name: COX.name } };
  const T3 = rollHolders(T2, moved);
  s.deps.holders = T3;
  const sd3 = await (await handle(get(`seat=ut-statesenate-3&room=general`), s.deps)).json();
  eq(sd3.general.holder.pid, COX.pid, "the member now holds SD-3");
  eq(sd3.posts.length, 0, "…and starts a separate, empty thread there — nothing carried over");
  const govPast = await (await handle(get(`seat=${GOV}&room=general&holder=${COX.pid}`), s.deps)).json();
  eq(govPast.posts.length, 1, "…while their governor-seat thread keeps its rows");
}

// The prior-holder line's two doors, asserted on the painted markup.
function prevFaults(html, who) {
  const f = [];
  const item = (new RegExp(`<span class="pdxdc-g-prev-i">Previous: (?:(?!</span>).)*data-pdxdc-g-holder="${who.pid}"(?:(?!</span>).)*</span>`).exec(html) || [""])[0];
  if (!item) { f.push("no Previous line for the prior holder"); return f; }
  const person = /<a class="pdxdc-g-prev-p" href="([^"]+)">([^<]+)<\/a>/.exec(item);
  if (!person) f.push("the prior holder's name does not link anywhere");
  else {
    if (person[1] !== `/p/${who.pid}`) f.push(`the name links ${person[1]}, not /p/${who.pid}`);
    if (person[2] !== who.name) f.push(`the person link reads ${person[2]}`);
  }
  const thread = /<a class="pdxdc-g-prev-a" data-pdxdc-g-holder="([^"]+)" href="([^"]+)">/.exec(item);
  if (!thread) f.push("the old-thread link is gone");
  else if (thread[1] !== who.pid || thread[2] !== `?general=${who.pid}#pdx-general-room`) f.push(`the old-thread link is ${thread[2]}`);
  // The person link must sit outside the thread-swapping element.
  if (person && /data-pdxdc-g-holder/.test(item.slice(0, item.indexOf("pdxdc-g-prev-p")))) f.push("the person link is inside the thread handler's element");
  return f;
}

// ── 4 ───────────────────────────────────────────────────────────────────────
section("4 · prior-holder links, in the composer");
{
  const T2 = rollHolders(SEAT_HOLDERS, { ...Object.fromEntries(Object.entries(SEAT_HOLDERS).map(([k, h]) => [k, { pid: h.pid, name: h.name }])),
    [GOV]: { pid: "new_governor", name: "New Governor" } });
  const s = fakeStore([vendor(A, GOV)], T2);
  // An old-thread row, written while the old holder sat.
  s.posts.push({ id: 900, seatKey: GOV, issueKey: null, holderPid: COX.pid, body: "From the old thread.", createdAt: "2026-01-01T00:00:00Z", authorHash: "x" });

  const win = makeSandbox();
  const slot = { innerHTML: "", querySelector() { return null; } };
  const host = { innerHTML: "", attrs: { "data-pdxdc-seat": "ut-gov" },
    getAttribute(k) { return this.attrs[k] ?? null; }, setAttribute(k, v) { this.attrs[k] = v; }, querySelector() { return null; } };
  win.document.getElementById = (id) => (id === "pdx-district-composer" ? host : null);
  win.document.querySelector = (sel) => (sel === "[data-pdxdb-general]" ? slot : null);
  win.location = { search: "", pathname: "/district/ut-gov" };
  win.history = { replaceState(_s, _t, u) { win.location.last = u; } };
  const urls = [];
  win.fetch = async (u, init) => {
    urls.push(String(u));
    const req = new Request("https://politidex.fyi" + u, { method: init?.method || "GET", headers: init?.headers, body: init?.body });
    return handle(req, s.deps);
  };
  vm.runInContext(R("district-composer.js"), vm.createContext(win), { filename: "district-composer.js" });
  const C = win.PDXDistrictComposer;
  const settle = () => new Promise((r) => setTimeout(r, 20));
  await settle();
  ok(urls.some((u) => /room=general/.test(u) && !/holder=/.test(u)), "the board reads the current general thread on load");
  ok(slot.innerHTML.includes("General · New Governor"), "the section is titled General · <the sitting member>");
  // A NAMED PRIOR HOLDER IS REACHABLE BOTH WAYS (v383): the name opens their
  // person file, and the link beside it still opens their old thread here.
  eq(prevFaults(slot.innerHTML, COX).length, 0,
    `Previous: <name> links the person file and the old thread — ${JSON.stringify(prevFaults(slot.innerHTML, COX))}`);
  ok(!/<a class="pdxdc-g-prev-p" href="\/p\/new_governor"/.test(slot.innerHTML), "the current holder is listed as a previous one");
  urls.length = 0;
  C.openHolder(COX.pid);
  await settle();
  ok(urls.some((u) => u.includes(`room=general&holder=${COX.pid}`)), "the link asks for that holder's thread");
  ok(slot.innerHTML.includes(`General · ${COX.name}`), "…paints it under the old holder's name");
  ok(slot.innerHTML.includes("From the old thread."), "…with its own rows");
  ok(!slot.innerHTML.includes("data-pdxdc-g-form"), "…and no posting field: the old thread is read-only");
  ok(slot.innerHTML.includes("General · New Governor"), "…with a way back to the current thread");
  eq(win.location.last, `/district/ut-gov?general=${COX.pid}#pdx-general-room`, "…and the address names the thread");
  eq(C.generalFrom(`?general=${COX.pid}`), COX.pid, "?general=<pid> opens that thread directly");
  eq(C.generalFrom("?general=Bad Pid"), "", "…and a malformed pid opens nothing");
}

// MUTATIONS: a prior name that does not link the person file, or links the
// wrong pid, fails the same check — over the same server, store and rollover.
async function priorHtml(src) {
  const T2 = rollHolders(SEAT_HOLDERS, { ...Object.fromEntries(Object.entries(SEAT_HOLDERS).map(([k, h]) => [k, { pid: h.pid, name: h.name }])),
    [GOV]: { pid: "new_governor", name: "New Governor" } });
  const s = fakeStore([vendor(A, GOV)], T2);
  const win = makeSandbox();
  const slot = { innerHTML: "", querySelector() { return null; } };
  const host = { innerHTML: "", attrs: { "data-pdxdc-seat": "ut-gov" },
    getAttribute(k) { return this.attrs[k] ?? null; }, setAttribute(k, v) { this.attrs[k] = v; }, querySelector() { return null; } };
  win.document.getElementById = (id) => (id === "pdx-district-composer" ? host : null);
  win.document.querySelector = (sel) => (sel === "[data-pdxdb-general]" ? slot : null);
  win.location = { search: "", pathname: "/district/ut-gov" };
  win.history = { replaceState() {} };
  win.fetch = async (u, init) => handle(new Request("https://politidex.fyi" + u, { method: init?.method || "GET", headers: init?.headers, body: init?.body }), s.deps);
  vm.runInContext(src, vm.createContext(win), { filename: "district-composer.js" });
  await new Promise((r) => setTimeout(r, 20));
  return slot.innerHTML;
}
{
  const SRC = R("district-composer.js");
  eq(prevFaults(await priorHtml(SRC), COX).length, 0, "the mutation harness does not reproduce the real prior-holder line");
  const noLink = SRC.replace(`'<a class="pdxdc-g-prev-p" href="/p/' + encodeURIComponent(pp.pid) + '">' + esc(ppName) + '</a>'`, "esc(ppName)");
  ok(noLink !== SRC, "the no-person-link mutation found nothing to replace");
  ok(prevFaults(await priorHtml(noLink), COX).length > 0, "a prior name that does not link the person file passed");
  const wrongPid = SRC.replace(`'<a class="pdxdc-g-prev-p" href="/p/' + encodeURIComponent(pp.pid)`, `'<a class="pdxdc-g-prev-p" href="/p/' + encodeURIComponent(G.holder.pid)`);
  ok(wrongPid !== SRC, "the wrong-pid mutation found nothing to replace");
  ok(prevFaults(await priorHtml(wrongPid), COX).length > 0, "a prior name linking the wrong pid passed");
}

// ── 5 ───────────────────────────────────────────────────────────────────────
section("5 · likes");
{
  const SD3 = "ut-statesenate-3";
  const s = fakeStore([vendor(A, GOV), vendor(B, GOV), vendor(A, SD3)]);
  await handle(post({ seat: GOV, room: "general", body: "Like me." }, A), s.deps);
  await handle(post({ seat: GOV, issueKey: "water", body: "Issue comment to like." }, A), s.deps);
  await handle(post({ seat: SD3, issueKey: "water", body: "On another seat." }, A), s.deps);
  const gId = s.posts.find((p) => p.body === "Like me.").id;
  const iId = s.posts.find((p) => p.body === "Issue comment to like.").id;
  const otherId = s.posts.find((p) => p.body === "On another seat.").id;

  for (const [why, tok] of [["signed out", null], ["unverified", "uid-carol"]]) {
    const before = s.likes.length;
    const r = await handle(post({ seat: GOV, action: "like", postId: gId }, tok), s.deps);
    eq(r.status, 403, `${why}: a like is 403`);
    eq(s.likes.length, before, `${why}: nothing written`);
  }
  const l1 = await handle(post({ seat: GOV, action: "like", postId: gId }, A), s.deps);
  eq(l1.status, 200, "a verified resident likes a general comment");
  const d1 = await l1.json();
  eq(d1.likes, 1, "…the count is 1");
  eq(d1.added, true, "…and a row was added");
  const l2 = await handle(post({ seat: GOV, action: "like", postId: gId }, A), s.deps);
  const d2 = await l2.json();
  eq(l2.status, 200, "a second like answers 200");
  eq(d2.likes, 1, "…the count does not move");
  eq(d2.added, false, "…nothing was added");
  eq(s.likes.filter((l) => l.takeId === gId).length, 1, "…one row in the store");
  await handle(post({ seat: GOV, action: "like", postId: gId }, B), s.deps);
  const li = await handle(post({ seat: GOV, action: "like", postId: iId }, B), s.deps);
  eq(li.status, 200, "an issue comment takes a like too");
  const lx = await handle(post({ seat: GOV, action: "like", postId: otherId }, A), s.deps);
  eq(lx.status, 404, "a comment from another seat is 404 on this one");
  eq((await handle(post({ seat: GOV, action: "like", postId: "abc" }, A), s.deps)).status, 404, "a malformed id is 404");
  ok(s.likes.every((l) => l.likerHash === seatHash(A, GOV) || l.likerHash === seatHash(B, GOV)),
    "every like is stored under the liker's seat-scoped hash");
  ok(s.likes.every((l) => !l.likerHash.includes("uid-")), "…never a uid");

  const ga = await (await handle(get(`seat=${GOV}&room=general`), s.deps)).json();
  eq(ga.posts.find((p) => p.id === gId).likes, 2, "anyone reads the count: two residents, two likes");
  eq(ga.posts.find((p) => p.id === gId).liked, false, "…and a signed-out reader liked nothing");
  const gb = await (await handle(get(`seat=${GOV}&room=general`, B), s.deps)).json();
  eq(gb.posts.find((p) => p.id === gId).liked, true, "a liker sees their own like");
  const fa = await (await handle(get(`seat=${GOV}`), s.deps)).json();
  eq(fa.posts.find((p) => p.id === iId).likes, 1, "the issue feed carries counts too");
  for (const [m, d] of [["general", ga], ["issue", fa]]) {
    const txt = JSON.stringify(d);
    noPerson(txt, [A, B, seatHash(A, GOV), seatHash(B, GOV)], `${m} read with likes`);
    for (const p of d.posts) eq(Object.keys(p).sort().join(","), "body,createdAt,id,issueKey,liked,likes,mine", `${m} post ${p.id}: counts only`);
  }
  noPerson(JSON.stringify(d1) + JSON.stringify(d2), [A, seatHash(A, GOV)], "the like reply");
}

// ── 6 ───────────────────────────────────────────────────────────────────────
section("6 · the search miss lands in the general section");
{
  const win = makeSandbox();
  win.__PDX_DISTRICT_BOARD_SEAT = GOV;
  win.document.getElementById = (id) => (id === "pdx-district-composer" ? {} : null);
  const ctx = vm.createContext(win);
  win.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
  for (const f of ["cmp-data.js", "issue-map.js", "issue-colors.js", "stance-sides.js"]) vm.runInContext(R(f), ctx, { filename: f });
  win.PDXStances = { all: () => [], count: () => 0 };
  win.PDXYourFile = { answered: () => [], position: () => null };
  vm.runInContext(R("district-board.js"), ctx, { filename: "district-board.js" });
  const Bd = win.PDXDistrictBoard;
  Bd.setQuery("zzzz");
  const h = Bd.tableHtml("ok", [{ kind: "vote", measureId: 1, number: "H.B. 1", title: "A Bill", congress: null,
    measureIdent: null, issues: [{ issueKey: "housing", weight: 1 }] }], [], []);
  Bd.setQuery("");
  const door = /<p class="pdxdb-find-door" data-pdxdb-find-door=""><a class="pdxdb-find-door-a" href="([^"]*)">([^<]*)<\/a><\/p>/.exec(h);
  ok(!!door, "a miss prints the door");
  eq(door && door[1], "#pdx-general-room", "…pointing at the general section");
  eq(door && door[2], "Start a thread about this", "…reading Start a thread about this");
  const slot = Bd.generalSlotHtml();
  ok(/<section class="pdxdb-band pdxdb-band--general" data-pdxdb-band="general" id="pdx-general-room" data-pdxdb-general="">/.test(slot),
    "the board prints the general section that door lands in");
  const src = R("district-board.js");
  ok(/seatHtml\(\) \+\s*generalSlotHtml\(\) \+\s*roomHtml\(/.test(src) && src.indexOf("generalSlotHtml() +") < src.indexOf("tableHtml(tState"),
    "the general section sits under the seat and above the issue groups");
}

// ── 7 ───────────────────────────────────────────────────────────────────────
section("7 · neighbours, routes, migration, copy, shell");
{
  // THE PIN IS UTAH'S. Every other state's U.S. House and U.S. Senate boards
  // are read-only rows appended after Utah's (scripts/test-district-boards-
  // federal.mjs reads them); this room is a composer room, so what it pins is
  // Utah's rows, which none of that may move.
  const routes = (src) => { const m = /var BOARD_ROUTES = \{([\s\S]*?)\n  \};/.exec(src || ""); return m ? [...m[1].matchAll(/^\s*'(ut-[a-z0-9_-]+)'\s*:/gm)].length : -1; };
  const head = HEAD("district-voice.js");
  if (head) eq(routes(R("district-voice.js")), routes(head), "BOARD_ROUTES' Utah rows unchanged in number");
  ok(routes(R("district-voice.js")) > 80, "BOARD_ROUTES still lists every board");
  // district-voice.js later took the seat-line wording (seatLine(), v381), so
  // its byte pin narrowed to the part this room depends on: BOARD_ROUTES itself.
  const routesBody = (src) => String((/var BOARD_ROUTES = \{([\s\S]*?)\n  \};/.exec(src || "") || [])[1] || "")
    .split("\n").filter((l) => !/^\s*'(?!ut-)[a-z]{2}-[a-z0-9_-]+'\s*:/.test(l)).join("\n");
  if (head) eq(routesBody(R("district-voice.js")), routesBody(head), "BOARD_ROUTES' Utah rows are byte-identical");
  for (const f of ["netlify/functions/district-board.mts", "district-poll.js"]) {
    const h = HEAD(f);
    if (h && f !== "netlify/functions/district-board.mts") eq(R(f), h, `${f} is byte-identical`);
  }
  // netlify.toml's pin narrowed to the part this room depends on — the generated
  // district-board routes — once the Utah ballot-question pages added rules of
  // their own elsewhere in the file.
  // Each generated board is one comment line, three rewrites and a blank line;
  // the blocks whose rewrites name a non-Utah alias are set aside on both sides.
  const boardRules = (src) => {
    const blk = (/# @generated district-boards begin[\s\S]*?# @generated district-boards end/.exec(src || "") || [])[0];
    if (!blk) return blk;
    return blk.split(/\n(?=# )/).filter((part) => !/from = "\/district\/(?!ut-)[a-z]{2}-/.test(part)).join("\n");
  };
  const tomlHead = HEAD("netlify.toml");
  if (tomlHead) {
    ok(!!boardRules(R("netlify.toml")), "netlify.toml still carries the generated district-board routes");
    eq(boardRules(R("netlify.toml")), boardRules(tomlHead), "netlify.toml's district-board routes are byte-identical");
  }
  const headCore = HEAD("netlify/lib/district-board-voice-core.mjs");
  if (headCore) {
    const seatsOf = (s) => (/export const COMPOSER_SEATS = \{([\s\S]*?)\n\};/.exec(s) || [])[1];
    eq(seatsOf(R("netlify/lib/district-board-voice-core.mjs")), seatsOf(headCore), "the server's composer seats are unchanged");
  }
  const docs = readdirSync(ROOT).filter((f) => /^district-ut-.*\.html$/.test(f));
  for (const d of docs) { const h = HEAD(d); if (h) ok(R(d) === h, `${d} is unchanged`); }
  const res = R("netlify/lib/residency-vendor-core.mjs"), resH = HEAD("netlify/lib/residency-vendor-core.mjs");
  if (resH) eq(res, resH, "the residency gate did not move");
  const mem = R("netlify/lib/membership-core.mjs"), memH = HEAD("netlify/lib/membership-core.mjs");
  if (memH) eq(mem, memH, "the membership cap did not move");

  const MIG = R("netlify/database/migrations/20261117000000_voice_general_room_and_likes/migration.sql");
  ok(/ADD COLUMN IF NOT EXISTS "holder_pid" text/.test(MIG), "the migration adds holder_pid to voice_takes");
  ok(/CREATE TABLE IF NOT EXISTS "voice_take_likes"/.test(MIG), "…and one small likes table");
  ok(/CREATE UNIQUE INDEX IF NOT EXISTS "voice_take_likes_take_liker_unique"/.test(MIG), "…with one like per (comment, liker)");
  ok(!/DROP TABLE|DELETE FROM|UPDATE "voice_takes"/i.test(MIG), "…and rewrites or drops nothing");
  ok(!/"uid"|user_id/.test(MIG), "the likes table holds no uid");

  const comp = R("district-composer.js");
  const copy = (/var COPY = \{([\s\S]*?)\n  \};/.exec(comp) || [])[1] || "";
  const newCopy = copy.split("// The general room.")[1] || "";
  ok(newCopy.length > 0, "the general-room copy is in the composer's COPY");
  ok(!/equity|stock|shares?\b|membership|member\b|members\b|premium|subscri|price/i.test(newCopy),
    "the new copy carries no equity, stock, membership or premium language");
  const SW = R("sw.js");
  const v = Number((/const CACHE_VERSION = 'v(\d+)'/.exec(SW) || [])[1]);
  ok(v >= 380, "the shell moved to v380 or later");
  ok(SW.includes("// v380 - THE GENERAL ROOM ON EVERY BOARD"), "the worker carries the v380 note");
}

if (failures.length) {
  console.error(`\n   ✗ general room: ${failures.length} failed, ${passed} passed`);
  for (const f of failures.slice(0, 50)) console.error("     - " + f);
  process.exit(1);
}
console.log(`\n   ✓ general room: all ${passed} assertions passed`);
