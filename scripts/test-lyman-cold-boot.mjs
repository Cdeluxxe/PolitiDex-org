#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-lyman-cold-boot.mjs — a cold /p/lyman settles on the word-first
// letterhead, and stays there
// ─────────────────────────────────────────────────────────────────────────────
// THE LIVE DEFECT THIS PINS
//
// Hard refresh on /p/lyman settles EMPTY: the eagle placeholder, "No formal
// pattern on file yet", and the seven sourced SAID rows gone. In the SAME
// session, homepage first and then Lyman opened in-app, the identical address
// paints the SAID letterhead with its chips. Nothing about the person differs
// between those two readings — only what had already happened in the tab before
// the letterhead was computed.
//
// test-lyman-letterhead-warm.mjs holds the gate's ANSWERS and passes: cold is
// SAID, an empty payload is still SAID, a crumb is not a term, the warm merge
// does not flip it. It passes because it asks the renderer, once, at a moment of
// its own choosing. THE COLD PAGE IS NOT ONE CALL. It is a mount and then a
// sequence of repaints driven by events, and two things about that sequence were
// wrong — neither of them visible to a harness that re-calls the renderer.
//
//   1. AN EMPTY ANSWER WAS FILED IN SILENCE. memberRecords() answers null until
//      noteMember runs and an array — possibly empty — forever after, and that
//      flip is the whole difference between "the answer is not here" and "the
//      answer is none". saidLanded asks for exactly it, because a lane nobody
//      has heard from is not an empty lane. But noteMember's arrival event was
//      guarded by `items.length &&`, so the one member class whose answer IS
//      empty — a candidate with no ingested roll calls, which is this report —
//      filed that flip with nothing told about it. The letterhead mounted at
//      t=0 on an honest wait and kept it.
//   2. THEN THE 6s DEADLINE CALLED IT A LOADING FAILURE. armBriefDeadline exists
//      so a request that never comes back cannot leave "still loading" on screen
//      forever. It fired here over a payload that had been in memory for five and
//      a half seconds, set _briefGaveUp, and briefGaveUp is a hard veto in
//      saidLead. From that moment the word-first letterhead was unreachable for
//      the life of the document, and the record-first lane printed its empty-file
//      paragraph over seven sourced positions. That is the settled frame in the
//      report.
//
// The homepage-first path never meets either bug: something else in the tab had
// already noted lyman, so saidLanded was true at the FIRST paint, no wait was
// ever armed, and no deadline had anything to fire over.
//
// WHAT THIS FILE HOLDS — TWO BOOTS, NOT ONE
//
//   A. WARM. Roster and CMP already in hand, the lane already noted, then the
//      file opens. Every frame is SAID. (Today's passing case, kept here so the
//      two boots are compared in one place rather than across two files.)
//   B. COLD. A fresh document on /p/lyman: no PROFILES row, no CMP row, no
//      display name anywhere, the hero mounted and bindHero armed from a bare
//      { id } — then the real /member/lyman answer (totalRecords 0, items []) at
//      t=120ms through the shipped fetchMember, then the roster toast, then the
//      6s deadline. The first frame may be a wait and may not be the empty
//      paragraph; every frame from the answer on is SAID; no frame the reader
//      ever held says "No formal pattern on file yet".
//
//   · saidStanceId resolves lyman → phil_lyman with no display name and no
//     PROFILES row — alias tables only, read backwards.
//   · the photo key list is the SAME list on cold /p/ as on an in-app open, so a
//     headshot under either spelling is reachable in both.
//   · nobody else moved: chew_h68 and lee keep the record-first letterhead
//     through the identical cold boot, and a request that genuinely never
//     answers still says so.
//   · no act is invented, phil_lyman is not minted as a second roster id, and
//     saidNoTerm is asked, never re-derived.
//
//   node scripts/test-lyman-cold-boot.mjs
//
// No database and no network: the only payload here is the shape the member
// endpoint documents, handed to the shipped fetchMember over a real timer.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) =>
  ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const hasNot = (h, n, m) => ok(!String(h).includes(n), `${m} — found ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ lyman cold boot: STALE HARNESS — ${m}`); process.exit(2); };

const PID = "lyman";
const CARD_KEY = "phil_lyman";
const CHEW = "chew_h68";
const LEE = "lee";

// The four sentences this file is about, verbatim from word-action.js.
const EMPTY = "No formal pattern on file yet";
const WAIT_BARE = "Still loading the roll-call record";
const WAIT_ONFILE = "Their formal record is on file and still loading";
const FAILED_BARE = "The roll-call record did not load";
const SAID_CLASS = "pdxwa-brief-said";

const WA_SRC = R("word-action.js");
const VR_SRC = R("voting-record.js");
const BB_SRC = R("ballot-breakdown.js");
const HTML = R("index.html");

// The engine, in the order index.html serves it. Same list the warm harness
// boots, plus profile-evidence.js — which publishes PDX_PROFILE_ALIAS, the table
// that says phil_lyman and lyman are one person. index.html serves that one as a
// PLAIN script, so on a real cold boot it has run before any deferred module has
// parsed; a sandbox without it would pass §4 for the wrong reason.
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "formal-index.js", "issue-colors.js", "consistency.js", "voting-record.js",
  "word-action.js", "stance-tree.js", "profile-spine.js", "profile-evidence.js",
];

// ── A document, with the three things a MOUNT needs ─────────────────────────
// makeSandbox's window has no event bus, no timers and no queryable DOM, which
// is enough to read a renderer and useless for watching a page settle. This adds
// a real listener bus, real timers, and a querySelector that can find a host
// that has actually been mounted — and it records every write to that host, so
// "which frames did the reader see" is answered from the DOM rather than by
// asking the renderer again.
function boot(o) {
  const opts = o || {};
  const win = makeSandbox();
  const path = opts.path || "/";
  win.location.pathname = path;
  win.location.href = "https://www.politidex.fyi" + path;
  win.location.search = "";

  const bus = new Map();
  const fired = [];
  win.addEventListener = (t, h) => { if (!bus.has(t)) bus.set(t, []); bus.get(t).push(h); };
  win.removeEventListener = (t, h) => {
    const a = bus.get(t) || []; const i = a.indexOf(h); if (i >= 0) a.splice(i, 1);
  };
  win.dispatchEvent = (ev) => {
    fired.push(ev && ev.type);
    for (const h of (bus.get(ev && ev.type) || []).slice()) { try { h(ev); } catch (e) {} }
    return true;
  };
  win.__fired = fired;

  const hosts = new Map();
  win.__hosts = hosts;
  win.document.querySelector = (sel) => {
    const m = /^\[([a-z0-9-]+)="([^"]+)"\]$/i.exec(String(sel || ""));
    return m ? (hosts.get(m[1] + "=" + m[2]) || null) : null;
  };
  win.document.getElementById = () => null;

  win.setTimeout = (fn, ms) => setTimeout(fn, ms);
  win.clearTimeout = (t) => clearTimeout(t);
  win.setInterval = () => 0;
  win.clearInterval = () => {};
  win.requestIdleCallback = (fn) => setTimeout(fn, 0);
  win.history = { replaceState() {}, pushState() {} };
  win.URLSearchParams = URLSearchParams;
  win.AbortController = AbortController;
  win.performance = { now: () => 0 };
  win.auth = { currentUser: null };
  const ls = {};
  const store = {
    length: 0, key: () => null,
    getItem: (k) => (Object.prototype.hasOwnProperty.call(ls, k) ? ls[k] : null),
    setItem: (k, v) => { ls[k] = String(v); },
    removeItem: (k) => { delete ls[k]; },
  };
  win.localStorage = store;
  win.sessionStorage = store;
  // The member endpoint, answering the documented shape after a real delay.
  // Anything else is a hang rather than a rejection: a boot that is not testing
  // some other network should neither log nor resolve one.
  const reqs = [];
  win.__reqs = reqs;
  win.fetch = (url) => {
    reqs.push(String(url));
    const hit = (opts.payloads || []).find((p) => String(url).indexOf("/member/" + p.pid) !== -1);
    if (!hit) return new Promise(() => {});
    return new Promise((res) => setTimeout(() => res({
      ok: true, status: 200, headers: { get: () => null },
      json: () => Promise.resolve(hit.body),
    }), hit.ms || 0));
  };

  const ctx = vm.createContext(win);
  // PROFILES is the live Firestore roster. On a cold boot it is an empty object
  // until anonymous sign-in and the fetch behind it land; on a warm one the app
  // is reading full documents out of it.
  win.PROFILES = {};
  win.__err = [];
  for (const f of FILES) {
    try { vm.runInContext(R(f), ctx, { filename: f }); }
    catch (e) { win.__err.push(`${f}: ${e.message}`); }
  }
  win.PROFILES = win.PROFILES || {};
  return win;
}

// Mount a hero the way openModal mounts one (profiles-full.js: heroMount for the
// markup, the inner half living in a host node keyed by the uid it chose), and
// let the shipped bindHero find it. `frames` is every string that host has ever
// held, oldest first.
function mountHero(win, pid, p, opts) {
  const html = win.PDXWordAction.heroMount(pid, p, opts || {});
  const m = /data-pdxwa-hero="([^"]+)"/.exec(html);
  must(m, `heroMount returned no host for ${pid}`);
  const inner = html.replace(/^\s*<div[^>]*>/, "").replace(/<\/div>\s*$/, "");
  const frames = [inner];
  let cur = inner;
  const host = {
    classList: { toggle() {} }, setAttribute() {}, removeAttribute() {},
    get innerHTML() { return cur; },
    set innerHTML(v) { cur = String(v); frames.push(cur); },
  };
  win.__hosts.set("data-pdxwa-hero=" + m[1], host);
  return { host, frames, uid: m[1], shell: html };
}

// What a reader would call the frame they are looking at.
const lane = (h) => {
  const s = String(h || "");
  if (s.indexOf(SAID_CLASS) !== -1) return "SAID";
  if (s.indexOf(EMPTY) !== -1) return "EMPTY";
  if (s.indexOf(FAILED_BARE) !== -1 || s.indexOf("did not load") !== -1) return "FAILED";
  if (s.indexOf(WAIT_BARE) !== -1 || s.indexOf(WAIT_ONFILE) !== -1) return "WAIT";
  return "RECORD";
};
const lanes = (frames) => frames.map(lane);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The /member/:id answer for a person with no ingested roll calls, in the shape
// netlify/functions/voting-record.mts builds (summary + paginate).
const emptyPayload = (pid) => ({
  politicianId: pid,
  summary: { totalRecords: 0, votes: 0, positions: 0, withParty: 0, againstParty: 0 },
  items: [], page: 1, pageSize: 100, total: 0,
});

// person-file.js's warm(), reproduced call for call rather than paraphrased: the
// same query every warming caller in the app uses, the same `data && data.items`
// guard, the same noteMember. The point of routing the answer through the shipped
// fetchMember is that everything the wait predicates read — the _liveRead claim
// at REQUEST time, the arrival event at answer time — is the real thing.
function warm(win, pid) {
  const VR = win.PDXVotingRecord;
  return VR.fetchMember(pid, { pageSize: 100 }).then((data) => {
    if (data && data.items) VR.noteMember(pid, data.items);
    return data;
  });
}

console.log("lyman cold boot / two boots, one letterhead");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the harness is asking the shipped gate");
// ═════════════════════════════════════════════════════════════════════════════
const W0 = boot({});
must(W0.__err.length === 0, `the engine did not load cleanly: ${W0.__err.join(" | ")}`);
{
  const WA = W0.PDXWordAction;
  must(WA, "word-action.js no longer publishes PDXWordAction");
  ["heroMount", "heroHtml", "saidLeadApplies", "saidStanceId", "saidRowSet", "saidNoTerm",
    "saidEmptyLegal", "saidPayloadHasAct"].forEach((k) => {
    must(typeof WA[k] === "function", `PDXWordAction.${k} is gone — this file cannot ask the gate`);
  });
  const VR = W0.PDXVotingRecord;
  must(VR && typeof VR.noteMember === "function" && typeof VR.memberRecords === "function" &&
    typeof VR.fetchMember === "function", "voting-record.js no longer publishes the record lane");
  must(W0.CMP_DATA && W0.CMP_DATA[PID], "lyman is no longer in cmp-data.js — the subject of this report is gone");
  must(!W0.CMP_DATA[CARD_KEY],
    "cmp-data.js has grown a phil_lyman roster row — this report is about ONE roster row");
  const CARDS = (W0.ISSUE_STANCE_DATA || {})[CARD_KEY] || [];
  must(CARDS.filter((c) => c && c.source && c.source.url).length >= 2,
    "phil_lyman's cited cards are gone — every assertion below would pass vacuously");
  must(!(W0.ISSUE_STANCE_DATA || {})[PID],
    "ISSUE_STANCE_DATA has grown a `lyman` key — the two-identity case this file pins is gone");
  // memberRecords' contract, which is the whole of saidLanded: null before, array
  // after, and an EMPTY array is an answer.
  eq(VR.memberRecords("nobody_at_all"), null, "memberRecords answers null for a member nobody has noted");
  VR.noteMember("harness_probe", []);
  eq(VR.memberRecords("harness_probe"), [], "…and an empty array once the lane has answered with nothing");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · BOOT A — roster and CMP already warm, then the file opens");
// ═════════════════════════════════════════════════════════════════════════════
// The passing case, and the one the reporter reached by visiting the homepage
// first: something in the tab had already noted lyman, so the lane's answer was
// in hand before the letterhead was ever computed. Held here so the two boots
// are one comparison and not two files.
{
  const W = boot({ path: "/" });
  const row = W.CMP_DATA[PID];
  W.PROFILES[PID] = Object.assign({}, row);          // the roster document landed
  // The lane answered for this member before the open — a /compare matrix, a
  // browse warm, the drain queue. Empty, because that is what it holds.
  W.PDXVotingRecord.noteMember(PID, []);
  const p = Object.assign({ id: PID }, row);
  const m = mountHero(W, PID, p);
  await sleep(40);

  eq(lanes(m.frames).filter((x, i, a) => x !== a[i - 1]), ["SAID"],
    "boot A: the warm open painted something other than the word-first letterhead");
  ok(m.frames.every((f) => f.indexOf(SAID_CLASS) !== -1), "boot A: a frame lost the SAID letterhead");
  m.frames.forEach((f, i) => hasNot(f, EMPTY, `boot A frame ${i}: the empty-file paragraph was printed`));
  has(m.shell, "is-shape", "boot A: the hero stack is not flagged as a letterhead");
  // The rows themselves, one per cited card, each wearing the tag that says what
  // kind of fact it is. The letterhead prints no URL — the citation lives behind
  // the row's door — so the tag IS the sourced claim on this surface.
  const set = W.PDXWordAction.saidRowSet(PID, p);
  must(set && set.shown && set.rows, "saidRowSet no longer hands the brief a capped row list");
  eq(set.shown.length, Math.min(set.rows.length, W.PDXWordAction.SAID_CAP),
    "boot A: the row set is not the gate's own cap applied to its own rows");
  eq((m.frames[0].match(/pdxwa-said-row/g) || []).length, set.shown.length,
    "boot A: the letterhead printed a different number of rows than the gate handed it");
  eq((m.frames[0].match(/pdxwa-said-tag/g) || []).length, set.shown.length,
    "boot A: a row printed without the SAID tag that marks it a documented position");
  ok(set.cited > 0 && set.shown.length > 0,
    `boot A: ${set.shown.length} rows shown against ${set.cited} cited positions`);
  ok(set.rows.length <= set.shown.length || /pdxwa-shape-more/.test(m.frames[0]),
    "boot A: rows were capped away without saying how many more there are");
  has(m.frames[0], W.PDXWordAction.SAID_EYEBROW, "boot A: the eyebrow is not the reviewed sentence");
  ok(W.PDXWordAction.saidLeadApplies(PID, p), "boot A: the gate does not claim this file");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · BOOT B — a fresh document on /p/lyman");
// ═════════════════════════════════════════════════════════════════════════════
// The reported arrival, in order and on real timers:
//
//   t=0     the document exists on /p/lyman. PROFILES is empty (sign-in and the
//           roster fetch are still out), and the CMP row is removed too — the
//           bundle can be served stale from an older service-worker shell, and
//           the report's frame has no display name anywhere in it.
//   t=0     the head's prefetch box is published (index.html), and the arrival
//           warm issues /member/lyman?pageSize=100 through the shipped
//           fetchMember. A request is now claimed for this member, which is what
//           makes the first frame a WAIT and not an empty file.
//   t=0     the hero mounts and bindHero is armed from a bare { id } — no name,
//           no roster row, nothing but the address.
//   t=120ms the answer: totalRecords 0, items []. THIS is the flip saidLanded
//           asks for, and it used to be filed in silence.
//   t≈1s    the roster toast resolves: the CMP row and the Firestore document
//           arrive, the derivation epoch bumps, and the surfaces repaint.
//   t≈6s    armBriefDeadline's timer fires over a payload that landed five and a
//           half seconds ago.
const B = (() => {
  const W = boot({ path: "/p/" + PID, payloads: [{ pid: PID, ms: 120, body: emptyPayload(PID) }] });
  must(W.__err.length === 0, `boot B did not load cleanly: ${W.__err.join(" | ")}`);
  const row = W.CMP_DATA[PID];
  delete W.CMP_DATA[PID];
  return { W, row };
})();
{
  const { W, row } = B;
  const WA = W.PDXWordAction;
  must(!W.CMP_DATA[PID] && !W.PROFILES[PID] && !Object.keys(W.PROFILES).length,
    "boot B is not cold — a roster row is already in hand");

  // The head's hand-over box, published exactly as index.html publishes it, at
  // the same absolute URL — so fetchMember's full-URL adoption is the real one
  // and briefAsked reads the box the browser would have.
  const purl = "/api/voting-record/member/" + encodeURIComponent(PID) + "?pageSize=100";
  has(HTML.slice(0, HTML.indexOf("</head>")), "window.__pdxVRPrefetch",
    "index.html no longer publishes the head prefetch box — boot B's t=0 is a fiction");
  W.__pdxVRPrefetch = { pid: PID, url: purl, promise: null, session: false, abandon() {} };

  const warming = warm(W, PID);
  // A BARE { id }. bindHero captures the person object it was mounted with and
  // re-renders from it on every repaint, so this is the object every frame below
  // is computed against — no name, no photo, no office, nothing the roster knows.
  const bare = { id: PID };
  const m = mountHero(W, PID, bare);
  await sleep(40);

  const first = m.frames[0];
  hasNot(first, EMPTY,
    "boot B first paint: the empty-file paragraph was printed while the lane had not answered yet");
  ok(lane(first) === "WAIT" || lane(first) === "SAID",
    `boot B first paint: expected an honest wait (or SAID), got ${lane(first)}`);

  await warming;
  await sleep(40);
  const afterAnswer = m.frames[m.frames.length - 1];
  has(afterAnswer, SAID_CLASS,
    "boot B: the lane answered empty and the letterhead did not become the word-first one — this is the report");
  ok(W.__fired.indexOf("pdx-record-noted") !== -1,
    "boot B: the empty answer was filed without announcing itself, so no surface could learn the lane had answered");
  eq(W.PDXVotingRecord.memberRecords(PID), [], "boot B: the lane's answer is not the empty array it was handed");
  ok(WA.saidLeadApplies(PID, bare), "boot B: the gate refuses the file even with the answer in hand");
  // And it got there on the arrival alone. No consistency warm, no section load,
  // no timeout had to rescue it.
  eq(W.__fired.filter((t) => t === "pdx-consistency-warm" || t === "pdx-voting-warm").length, 0,
    "boot B: the repaint was rescued by another surface's event, so the arrival still announces nothing");

  // ── the roster toast ──────────────────────────────────────────────────────
  // "Loading the latest roster…" resolves: the bundle row and the Firestore
  // document both land, and every derived read is invalidated. The letterhead is
  // recomputed from the bare { id } it was mounted with, and it may not change
  // its mind.
  W.CMP_DATA[PID] = row;
  W.PROFILES[PID] = Object.assign({}, row, { photo: "" });
  if (typeof W.PDXDataChanged === "function") W.PDXDataChanged();
  W.dispatchEvent(new W.CustomEvent("pdx-consistency-warm", { detail: { pid: PID } }));
  await sleep(40);
  has(m.frames[m.frames.length - 1], SAID_CLASS, "boot B: the roster toast took the letterhead off SAID");

  // ── the 6s deadline ───────────────────────────────────────────────────────
  // The wait armed at t=0 comes due. A give-up is a statement about a request
  // that did not come back; this one came back at t=120ms, so there is nothing
  // to give up on — and the repaint it dispatches is still owed, because
  // whatever is on screen is a wait that is over.
  await sleep(6300);
  const settled = m.frames[m.frames.length - 1];
  has(settled, SAID_CLASS,
    "boot B: the 6s deadline fired over a payload already in memory and vetoed the word-first letterhead");
  hasNot(settled, FAILED_BARE, "boot B: a loading failure was declared over a record that loaded");

  // ── and now the whole boot, frame by frame ────────────────────────────────
  const seq = lanes(m.frames);
  console.log(`      boot B frames: ${seq.join(" → ")}`);
  eq(seq.filter((x) => x === "EMPTY").length, 0,
    `boot B: the reader was shown the empty-file paragraph — frames were ${seq.join(" → ")}`);
  eq(seq.filter((x) => x === "FAILED").length, 0,
    `boot B: the reader was told the record did not load — frames were ${seq.join(" → ")}`);
  eq(seq[seq.length - 1], "SAID", `boot B: the settled frame is ${seq[seq.length - 1]}`);
  // Once SAID, always SAID: the letterhead may not flip back on any later frame.
  const firstSaid = seq.indexOf("SAID");
  ok(firstSaid !== -1 && seq.slice(firstSaid).every((x) => x === "SAID"),
    `boot B: the letterhead changed its mind after settling — ${seq.join(" → ")}`);
  m.frames.forEach((f, i) => hasNot(f, EMPTY, `boot B frame ${i}: the empty-file paragraph`));

  // ONE REQUEST FOR THIS MEMBER, and it is the head's URL. The arrival warm and
  // the hero between them may not spend two.
  const mine = W.__reqs.filter((u) => u.indexOf("/member/" + PID) !== -1);
  eq(mine.length, 1, `boot B: ${mine.length} requests went out for this member`);
  eq(mine[0], purl, "boot B: the request is not the absolute URL the head prefetches");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · lyman → phil_lyman with no name and no PROFILES row");
// ═════════════════════════════════════════════════════════════════════════════
// The hop that makes the cards reachable at all, asked in the frame the report
// was filed from: the alias tables, read backwards, with nothing to slug.
{
  const W = boot({ path: "/p/" + PID });
  delete W.CMP_DATA[PID];
  const WA = W.PDXWordAction;
  const bare = { id: PID };
  eq(Object.keys(W.PROFILES).length, 0, "§4 is not asking the nameless frame — PROFILES has rows");
  eq(W.CMP_DATA[PID], undefined, "§4 is not asking the nameless frame — the CMP row is in hand");
  eq(WA.saidStanceId(PID, bare), CARD_KEY,
    "saidStanceId does not reach phil_lyman from a bare { id } with no display name anywhere");
  const set = WA.saidRowSet(PID, bare);
  const cited = ((W.ISSUE_STANCE_DATA || {})[CARD_KEY] || []).filter((c) => c && c.source && c.source.url).length;
  eq(set.cited, cited, "the cited row count does not match phil_lyman's sourced cards");
  ok(set.cited > 0, "no sourced card was reachable from the address alone");
  // …and the tables it read are the three the gate names, all of them live on a
  // cold boot because index.html serves profile-evidence.js as a plain script.
  ok(W.PDX_PROFILE_ALIAS && W.PDX_PROFILE_ALIAS[CARD_KEY] === PID,
    "PDX_PROFILE_ALIAS no longer carries phil_lyman → lyman");
  const tag = (HTML.match(/<script\b[^>]*src="\/profile-evidence\.js"[^>]*>/) || [])[0];
  must(tag, "index.html no longer serves profile-evidence.js");
  hasNot(tag, "defer", "profile-evidence.js is deferred now — the alias table is no longer live at first paint");
  // NOT via a minted second roster row.
  eq(W.CMP_DATA[CARD_KEY], undefined, "phil_lyman was minted as a roster row to make the hop work");
  eq((W.ISSUE_STANCE_DATA || {})[PID], undefined, "the cards were copied onto the roster id");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the photo asks the same keys cold as it does in-app");
// ═════════════════════════════════════════════════════════════════════════════
// _getPhotoUrl is the only reader of a headshot — the hero, the quick view and
// every card go through it, and profiles-full.js falls back to
// `<div class="ph-fallback">${p.icon}</div>`, which on lyman is the eagle in the
// report. The KEY LIST is what this section holds: whatever the roster has or
// has not landed, the same spellings must be tried, or a face filed under
// phil_lyman is reachable in one boot and not the other. Lifted out of the
// shipped IIFE by brace matching rather than re-typed.
{
  const liftFn = (name) => {
    const decl = `function ${name}(`;
    const start = BB_SRC.indexOf(decl);
    must(start !== -1, `ballot-breakdown.js no longer declares ${name}() — the photo hop cannot be read`);
    const from = BB_SRC.indexOf("{", BB_SRC.indexOf(")", start));
    let depth = 0, end = -1;
    for (let i = from; i < BB_SRC.length; i++) {
      if (BB_SRC[i] === "{") depth++;
      else if (BB_SRC[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
    }
    must(end !== -1, `${name}(): unbalanced braces`);
    return BB_SRC.slice(start, end + 1);
  };
  const code = ["_photoSlug", "_photoUnder", "_photoKeys", "_getPhotoUrl"].map(liftFn).join("\n");
  has(BB_SRC, "window._getPhotoUrl = _getPhotoUrl",
    "ballot-breakdown.js no longer publishes _getPhotoUrl — the hero's photo has no reader");

  // The tables as each boot holds them, and nothing else different between them.
  const tables = (w) => ({
    PROFILES: w.PROFILES || {}, CMP_DATA: w.CMP_DATA || {}, BROWSE_PHOTOS: w.BROWSE_PHOTOS || {},
    PDX_PROFILE_ALIAS: w.PDX_PROFILE_ALIAS || {}, STANCE_ALIASES: w.STANCE_ALIASES || {},
    PDX_PID_ALIASES: w.PDX_PID_ALIASES || {},
  });
  const mk = (over) => {
    const ctx = Object.assign({ console, JSON, Object, String, Math }, over);
    ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
    vm.runInContext(code + "\n;", vm.createContext(ctx), { filename: "photo-hop" });
    return ctx;
  };

  const WC = boot({ path: "/p/" + PID });                 // cold: no PROFILES, no CMP row
  const rowC = WC.CMP_DATA[PID];
  delete WC.CMP_DATA[PID];
  const WW = boot({ path: "/" });                          // warm in-app: both in hand
  WW.PROFILES[PID] = Object.assign({}, WW.CMP_DATA[PID]);

  const cold = mk(tables(WC));
  const inApp = mk(tables(WW));
  const kCold = cold._photoKeys(PID);
  const kWarm = inApp._photoKeys(PID);
  console.log(`      cold /p/ keys: [${kCold.join(", ")}]   in-app: [${kWarm.join(", ")}]`);
  eq(kCold.slice().sort(), kWarm.slice().sort(),
    "the photo key list on a cold /p/ arrival is not the list an in-app open asks");
  ok(kCold.indexOf(PID) === 0 && kWarm.indexOf(PID) === 0,
    "the address's own id is no longer tried first — a resolved photo could move");
  ok(kCold.indexOf(CARD_KEY) !== -1, "the cold key list never reaches phil_lyman");
  ok(kWarm.indexOf(CARD_KEY) !== -1, "the in-app key list never reaches phil_lyman");

  // And therefore: a headshot under either spelling resolves in BOTH boots.
  const FACE = "https://example.org/faces/phil-lyman.jpg";
  const underCard = (w) => mk(Object.assign(tables(w), { BROWSE_PHOTOS: { [CARD_KEY]: FACE } }));
  eq(underCard(WC)._getPhotoUrl(PID), FACE, "cold /p/lyman: a photo filed under phil_lyman does not resolve");
  eq(underCard(WW)._getPhotoUrl(PID), FACE, "in-app lyman: a photo filed under phil_lyman does not resolve");
  // …and where nobody has a face, nothing is invented. The eagle is the honest
  // answer for lyman today: the bundle carries no photo for him at all.
  eq(cold._getPhotoUrl(PID), "", "a photo was invented on the cold path");
  eq(inApp._getPhotoUrl(PID), "", "a photo was invented on the in-app path");
  must(!rowC.photo, "cmp-data.js has grown a photo for lyman — the eagle half of the report is gone");
  has(R("profiles-full.js"), "window._getPhotoUrl(id)",
    "the profile hero no longer reads its photo through _getPhotoUrl — this section asks the wrong function");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the two seams, at source");
// ═════════════════════════════════════════════════════════════════════════════
// Both fixes are one line each, and both are the kind a later pass would put
// back if nothing said why they are there.
{
  const nm = (VR_SRC.match(/noteMember: function[\s\S]*?\n {4}\},/) || [])[0];
  must(nm, "voting-record.js's noteMember is gone");
  hasNot(nm, "if (items.length && (!had",
    "noteMember guards its arrival event on items.length again — an empty answer is filed in silence");
  has(nm, "var gained = items.length ? (!had || had.length < items.length) : !had;",
    "noteMember no longer announces a FIRST arrival whatever its length");
  has(nm, "'pdx-record-noted'", "noteMember no longer announces the arrival at all");
  has(nm, "canon:", "…carrying the canonical id");
  has(nm, "pid:", "…and the id the caller asked for");
  has(WA_SRC, "var HERO_REPAINT = ['pdx-consistency-warm', 'pdx-voting-warm', 'pdx-brief-timeout',",
    "the hero's repaint set moved — boot B's repaint may no longer be subscribed");
  has((WA_SRC.match(/var HERO_REPAINT = \[[\s\S]*?\];/) || [""])[0], "'pdx-record-noted'",
    "the hero no longer repaints on the arrival itself");

  has(WA_SRC, "function briefGaveUp(pid) { return !!_briefGaveUp[pid] && !briefNoted(pid); }",
    "briefGaveUp no longer yields to a payload in memory — a landed record can be called a loading failure again");
  has(WA_SRC, "if (!briefNoted(pid)) _briefGaveUp[pid] = true;",
    "armBriefDeadline declares a give-up over a filed payload again");
  // saidLead is untouched, and so is the door the user's report may not widen.
  has(WA_SRC, "if (!saidLanded(pid)) return null;",
    "saidLanded is no longer a gate on the word-first letterhead");
  has(WA_SRC, "if (!saidNoTerm(pid)) return null;", "saidNoTerm is no longer a gate");
  has(WA_SRC, "if (briefHeaderRowN(pid) > 0) return false;", "saidEmptyLegal's header veto moved");
  has(WA_SRC, "if (formalHasRecord(pid)) return false;", "saidEmptyLegal's index veto moved");
  has(WA_SRC, "if (saidPayloadHasAct(pid)) return false;", "saidEmptyLegal's payload veto moved");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · nobody else moved, and a real failure still says so");
// ═════════════════════════════════════════════════════════════════════════════
// (a) THE TWO RECORD-FIRST FILES, THROUGH THE IDENTICAL COLD BOOT — each one
// answered with the payload it actually has. chew_h68 is 118 measures in the
// shipped static index and zero rows in the pattern index: the file whose
// letterhead rests entirely on the formalHasRecord veto, so its member answer is
// honestly empty and the arrival this pass now announces must not move it. lee is
// a federal record, so lee's answer carries roll calls. Neither may be handed the
// word lane by anything here.
const CONTROLS = [
  { pid: CHEW, rows: [] },
  { pid: LEE, rows: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
      kind: "vote", rollcallId: 9000 + n, measureId: 9500 + n, number: "S. " + (100 + n),
      date: "2025-03-0" + n, action: "On Passage", position: "yea", isProcedural: false,
      title: "Measure " + n,
      issues: [{ issueKey: "lands_local", weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
      source: { url: "https://www.congress.gov/roll-call-vote/" + (9000 + n), label: "Congress.gov" },
    })) },
];
for (const c of CONTROLS) {
  const pid = c.pid;
  const body = Object.assign(emptyPayload(pid), {
    items: c.rows, total: c.rows.length,
    summary: { totalRecords: c.rows.length, votes: c.rows.length, positions: 0, withParty: 0, againstParty: 0 },
  });
  const W = boot({ path: "/p/" + pid, payloads: [{ pid, ms: 80, body }] });
  const p = Object.assign({ id: pid }, W.CMP_DATA[pid] || {});
  must(W.CMP_DATA[pid], `${pid} is no longer in cmp-data.js — §7 has no control`);
  const w = warm(W, pid);
  const m = mountHero(W, pid, p);
  await w; await sleep(40);
  eq(W.PDXVotingRecord.memberRecords(pid).length, c.rows.length,
    `${pid}: the control's own payload did not reach the lane`);
  if (c.rows.length) {
    const shape = W.PDXConsistency.formalPatternIndex.shape(pid) || {};
    must((shape.read || 0) >= 1,
      `${pid}: the seeded roll calls did not reach the pattern index — this control would pass for the wrong reason`);
    ok(!W.PDXWordAction.saidNoTerm(pid), `${pid}: saidNoTerm reads no formal term over eight roll calls`);
  } else {
    ok(!W.PDXWordAction.saidEmptyLegal(pid),
      `${pid}: the word lane's door opened over the shipped static index — that veto is this letterhead`);
  }
  ok(!W.PDXWordAction.saidLeadApplies(pid, p), `${pid}: the word-first letterhead claimed a record-first file`);
  m.frames.forEach((f, i) => hasNot(f, SAID_CLASS, `${pid} frame ${i}: the SAID letterhead was painted`));
  m.frames.forEach((f, i) => hasNot(f, EMPTY, `${pid} frame ${i}: the empty-file paragraph over a real record`));
}
// (b) A REQUEST THAT GENUINELY NEVER ANSWERS STILL FAILS OUT LOUD. The give-up
// now yields to a filed payload — it may not yield to a missing one, or "the
// record did not load" becomes unsayable and a network failure reads as an empty
// file. Same boot as B with the answer withheld.
{
  const W = boot({ path: "/p/" + PID });        // no payload registered: the fetch hangs
  delete W.CMP_DATA[PID];
  W.__pdxVRPrefetch = { pid: PID, url: "/api/voting-record/member/" + PID + "?pageSize=100", promise: null, session: false, abandon() {} };
  W.PDXVotingRecord.fetchMember(PID, { pageSize: 100 });
  const m = mountHero(W, PID, { id: PID });
  await sleep(40);
  eq(lane(m.frames[0]), "WAIT", "a member request in flight does not print a wait");
  eq(W.PDXVotingRecord.memberRecords(PID), null, "§7b is not testing an unanswered lane — rows are in hand");
  await sleep(6300);
  const settled = m.frames[m.frames.length - 1];
  eq(lane(settled), "FAILED",
    "a member request that never came back no longer says the record did not load — a network failure now reads as something else");
  hasNot(settled, EMPTY, "a loading failure was printed as an empty file");
  ok(W.__fired.indexOf("pdx-brief-timeout") !== -1, "the 6s deadline no longer repaints anything");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · no invented act, no second roster id");
// ═════════════════════════════════════════════════════════════════════════════
{
  const { W } = B;
  const VR = W.PDXVotingRecord;
  eq(VR.memberRecords(PID), [], "boot B's payload is not exactly what the endpoint answered");
  eq(VR.memberRecords(CARD_KEY), null, "rows were filed under phil_lyman as well — that is a second identity");
  eq(W.CMP_DATA[CARD_KEY], undefined, "phil_lyman is in the roster after boot B");
  ok(W.PDXWordAction.saidNoTerm(PID), "saidNoTerm stopped holding for lyman — an act was invented somewhere");
  ok(!W.PDXWordAction.saidPayloadHasAct(PID), "the payload predicate found an act in an empty payload");
  // The index judges nothing for him either, and that is where "no formal
  // pattern" would have to come from if it were true.
  const FX = W.PDXFormalIndex;
  must(FX, "formal-index.js no longer publishes PDXFormalIndex");
  eq(FX.acts(PID), 0, "the shipped index has grown acts for lyman");
  eq(FX.emptyNote(PID), null, "the shipped index has grown a reviewed empty note for lyman");
  // And the service worker was told, because both changed files are precached.
  const SW = R("sw.js");
  const ver = (SW.match(/const CACHE_VERSION = '([^']+)'/) || [])[1];
  must(ver, "sw.js no longer declares CACHE_VERSION");
  has(SW, "'/word-action.js'", "word-action.js is no longer a shell asset — this check is moot");
  has(SW, "'/voting-record.js'", "voting-record.js is no longer a shell asset — this check is moot");
  ok(/^v(\d+)$/.test(ver) && Number(ver.slice(1)) >= 174,
    `sw.js CACHE_VERSION is ${ver} — a warm device keeps serving the old word-action.js and voting-record.js`);
  has(SW, "v174", "sw.js has no changelog entry for the bump");
}

// ── result ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ lyman cold boot: ${failures.length} of ${failures.length + passed} checks failed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`\n✓ lyman cold boot: ${passed} checks passed — two boots, one letterhead\n`);
// §7b leaves a member request deliberately in flight, and the record lane holds a
// retry timer over it. Every assertion above has already been made, so the file
// says so and goes rather than idling out someone's suite.
process.exit(0);
