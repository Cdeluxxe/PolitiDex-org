#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-first-paint-loading-honesty.mjs — a file that is still loading is never
// called empty, and the first frame is the one that has to be true
// ─────────────────────────────────────────────────────────────────────────────
// THE REPORT. Two addresses, one deploy. /p/lee's first paint read "Still loading
// the roll-call record — no formal pattern can be read until it lands." — honest.
// /p/brett_garner's first paint, in the same frame, read "No formal pattern on
// file yet…" while the crawl header behind the modal was already listing six
// characterised rows and the nav chip a moment later read VOTES 68 RECORDS. After
// settle his brief was right (37 issues · 72 acts). "The lie is only the first
// frame."
//
// THE CAUSE. The empty sentence was the FALL-THROUGH of briefAbsenceCopy(): it
// printed when every reader of "what does this tab hold" answered nothing —
// warming (needs a stance ledger, which lee has and garner does not), the crawl
// rows, the static index and the live payload. On a cold arrival all four can
// legitimately answer nothing for one paint, because the record is still in the
// air. So silence from the readers was being printed as knowledge: nothing on
// file. Lee's stance ledger bought him a wait; garner's absence of one bought him
// a lie about a record the same page was counting.
//
// THE FIX THIS FILE GUARDS. The default inverted. The wait is what an unanswered
// question prints, and the empty letterhead now takes POSITIVE knowledge: the
// member request has landed (noteMember ran) or gave up or was never asked, AND
// no reader anywhere holds a record. The signal that makes garner's first frame
// honest is the REQUEST — window.__pdxVRPrefetch, published in the head before
// any script runs, and PDXVotingRecord._liveRead, claimed at request time — which
// is true at first paint on every cold /p/<pid> in a way that no reader of the
// ANSWER can be.
//
// WHAT THIS FILE HOLDS:
//
//   1. THE FRAME THE REPORT WAS FILED ABOUT. Every reader blinded and a member
//      request in flight — the production shape — for the whole roster: not one
//      brief prints the empty letterhead, and garner's says it is still loading.
//      Twinned against HEAD, which is where the sentence came from.
//   2. THREE REAL SECONDS OF DELAYED PAYLOAD. Garner's six served crawl rows on
//      screen, his 68-row lane landing at t=3s, real timers and the real
//      fetchMember: the first mounted brief and every repaint before the payload
//      carry the rows or a wait and never the empty sentence, and the settled
//      brief is the engine's own.
//   3. THE CHIP AND THE PARAGRAPH CANNOT BOTH BE TRUE. Wherever
//      _pdxRecordMappedCounts — the source of the VOTES · N RECORDS pill — counts
//      a row, the empty letterhead is absent. Checked over the whole lane.
//   4. THE EMPTY LETTERHEAD STILL MEANS SOMETHING. With a request in flight, the
//      only ids that print it across 800 members are the ten hand-reviewed empty
//      notes; jknotts prints it on the first frame and after settle, with his
//      reviewed reason, and never a wait that is not happening.
//   5. LEE IS UNTOUCHED. His sentence is still the wait, his brief is never the
//      empty letterhead cold or settled, and the class that prints his sentence
//      on a bare boot is the same size it was at HEAD.
//   6. AND THE DOOR ONLY OPENS ON KNOWLEDGE. A request that landed with zero rows
//      prints the empty letterhead; one still in the air never does; nobody who
//      was never asked moved at all. Twin boot: read() — Direction Match, its
//      floors, its coverage, its token — byte-identical for 800 members.
//
//   node scripts/test-first-paint-loading-honesty.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildUtahLane } from "./gen-crawl-record.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) =>
  ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const hasnt = (h, n, m) => ok(!String(h).includes(n), `${m} — still contains ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ first paint loading honesty: STALE HARNESS — ${m}`); process.exit(2); };

// The sentence under test, and the two waits it is not allowed to replace.
const EMPTY = "No formal pattern on file yet";
const WAIT_BARE = "Still loading the roll-call record — no formal pattern can be read until it lands.";
const WAIT_ONFILE = "Their formal record is on file and still loading";

// The report's own pids. GARNER is the frame that lied; LEE is the frame that was
// already honest and must stay exactly as it was; STENQUIST is the same class as
// garner on the same deploy; JKNOTTS is the one file that really is empty.
const GARNER = "brett_garner";
const STENQUIST = "jeffrey_stenquist";
const LEE = "lee";
const JKNOTTS = "jknotts";

const ENGINE_FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "formal-index.js", "coverage.js", "profile-spine.js",
];

// A crawl header as netlify/edge-functions/share-preview.ts writes one: stamped
// for the address it was generated at, carrying the pid it named, one <li> per
// row. crawlDone() hides rather than removes it, so the stub starts hidden.
function fakeHeader(pid, rows) {
  const attrs = { "data-pid": pid, "data-pdx-crawl-for": "/p/" + pid };
  const lis = rows.map((t) => ({ textContent: t }));
  return {
    id: "pdx-crawl-person",
    style: { display: "none" },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    hasAttribute: (k) => k in attrs,
    setAttribute() {}, removeAttribute() {},
    querySelectorAll: (sel) => (sel === "[data-pdx-crawl-record] li" ? lis : []),
    innerHTML: "",
  };
}

function boot(opts) {
  const o = opts || {};
  const win = makeSandbox();
  if (o.path) {
    win.location.pathname = o.path;
    win.location.href = "https://www.politidex.fyi" + o.path;
  }
  if (o.header) {
    win.document.querySelector = (s) => (s === "#pdx-crawl-person" ? o.header : null);
    win.document.getElementById = (s) => (s === "pdx-crawl-person" ? o.header : null);
  }
  if (o.realTimers) {
    win.setTimeout = (fn, ms) => setTimeout(fn, ms);
    win.clearTimeout = (t) => clearTimeout(t);
  }
  if (o.fetch) win.fetch = o.fetch;
  win.URLSearchParams = URLSearchParams;
  win.AbortController = AbortController;
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  // A blinded boot leaves the static formal index out of the bundle, which is the
  // state a first paint is in for any id the generated index has no acts for —
  // and the state garner's frame behaved as if he were in.
  const files = (o.files || ENGINE_FILES).filter((f) => !(o.blind && f === "formal-index.js"));
  for (const f of files) {
    vm.runInContext(o.src && o.src[f] ? o.src[f] : R(f), ctx, { filename: f });
  }
  win.PROFILES = win.CMP_DATA;
  if (o.withPersonFile) {
    for (const f of ["profiles-full.js", "person-file.js"]) vm.runInContext(R(f), ctx, { filename: f });
  }
  return win;
}

const txt = (h) => String(h || "").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const brief = (win, pid) => {
  try { return win.PDXWordAction.briefHtml(pid, win.CMP_DATA[pid]) || ""; } catch (e) { return "THREW: " + e.message; }
};

// THE REQUEST, PUBLISHED THE WAY THE PAGE PUBLISHES IT. index.html's head writes
// this box before any bundle script runs; PDXVotingRecord.fetchMember adopts it
// and claims _liveRead at request time. Both are asserted against their real
// sources below rather than assumed.
const askFor = (win, pid) => { win.__pdxVRPrefetch = { pid: pid, url: "/api/member/" + pid, promise: null, session: 1 }; };
const claimFor = (win, pid) => { try { win.PDXVotingRecord._liveRead[pid] = true; } catch (e) {} };

const SNAPSHOT = JSON.parse(R("db/share-index.json")).personRecord || {};
const servedLines = (pid) => (SNAPSHOT[pid] || [])
  .filter((x) => x && x.p && x.i)
  .map((x) => [x.p, x.i, x.c || ""].filter(Boolean).join(" · "));

// ═════════════════════════════════════════════════════════════════════════════
section("0 · the two signals this pass reads are the ones the page writes");
// ═════════════════════════════════════════════════════════════════════════════
{
  const HTML = R("index.html"), VR = R("voting-record.js"), WA = R("word-action.js");
  has(HTML, "window.__pdxVRPrefetch", "index.html's head still publishes the prefetch box");
  has(VR, "_liveRead", "voting-record.js still claims _liveRead for a member request");
  has(WA, "__pdxVRPrefetch", "word-action.js reads the prefetch box…");
  has(WA, "_liveRead", "…and the live-read claim");
  has(WA, WAIT_BARE, "the wait sentence /p/lee printed is still in the file, character for character");
  // The empty paragraph exists as ONE string literal, so there is one door to
  // guard. (The sentence also appears in comments quoting the report; the count
  // here is of the literal, which is what can be printed.)
  eq(WA.split("'" + EMPTY).length - 1, 1, "the empty-file letterhead is one string literal in word-action.js");
  has(WA, "var EMPTY_FILE_COPY", "…held in a named constant rather than inlined at a branch");
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the frame the report was filed about");
// ═════════════════════════════════════════════════════════════════════════════
// Every reader blinded — no crawl header, no static index, no payload, no stance
// ledger — and a member request in flight. This is what garner's first paint
// actually had on hand, and the whole roster is checked in it, because the rule
// is not about three ids: an unanswered question may not be printed as an answer.
{
  const win = boot({ blind: true });
  must(win.PDXWordAction && typeof win.PDXWordAction.briefHtml === "function",
    "PDXWordAction.briefHtml is no longer the brief renderer");
  must(!win.PDXFormalIndex || win.PDXFormalIndex.acts(GARNER) === 0,
    "the blinded boot still loaded a formal index — the reproduction is not blind");

  const pids = Object.keys(win.CMP_DATA);
  ok(pids.length > 700, `the roster booted blinded (${pids.length} ids)`);

  const called = [];
  for (const pid of pids) {
    askFor(win, pid);
    claimFor(win, pid);
    if (brief(win, pid).includes(EMPTY)) called.push(pid);
  }
  eq(called, [],
    "with a request in flight and every reader blinded, NOT ONE of the roster's briefs calls the file empty");

  // And the named frame, in the two shapes the signal can arrive in: the head's
  // box alone (the first paint, before person-file.js has warmed anything) and
  // the fetcher's own claim alone (after it has).
  for (const pid of [GARNER, STENQUIST]) {
    const cov = win.PDXWordAction.read(pid, win.CMP_DATA[pid]).coverage;
    eq(cov.scorable, 0, `${pid}: identity-only, no scorable stance — the class the sentence lived in`);
    eq(cov.warming, false, `${pid}: …and nothing ever set warming, so the old loading branch was unreachable`);

    const w1 = boot({ blind: true });
    askFor(w1, pid);
    const h1 = brief(w1, pid);
    hasnt(h1, EMPTY, `${pid}: the head's prefetch box alone keeps the empty letterhead off the first frame`);
    has(h1, WAIT_BARE, `${pid}: …it prints the same wait /p/lee printed`);

    const w2 = boot({ blind: true });
    claimFor(w2, pid);
    const h2 = brief(w2, pid);
    hasnt(h2, EMPTY, `${pid}: the fetcher's own live-read claim alone does the same`);
    has(h2, WAIT_BARE, `${pid}: …with the same sentence`);
  }

  // ── THE TWIN, which is where the sentence came from ────────────────────────
  let headWA = null;
  try {
    headWA = execFileSync("git", ["show", "HEAD:word-action.js"], { cwd: ROOT, encoding: "utf8" });
  } catch { /* no baseline in this environment */ }
  if (!headWA) {
    console.log("      (no git baseline available — the twin boot did not run here)");
  } else {
    const A = boot({ blind: true, src: { "word-action.js": headWA } });
    const before = [];
    for (const pid of [GARNER, STENQUIST, LEE]) {
      askFor(A, pid);
      if (brief(A, pid).includes(EMPTY)) before.push(pid);
    }
    if (before.length) {
      // HEAD is the deploy the report was filed against: the reproduction fires.
      has(before.join(","), GARNER, `the baseline really does call ${GARNER}'s in-flight frame empty`);
      hasnt(before.join(","), LEE, `…and really does not do it to ${LEE}, which is the report's whole comparison`);
    } else {
      console.log("      (the baseline already contains this fix — the reproduction no longer fires from here)");
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · three real seconds of delayed payload, with the header on screen");
// ═════════════════════════════════════════════════════════════════════════════
// The sandbox the report describes: garner's six served crawl rows in the
// document, his 68-row lane arriving at t=3s through the real
// PDXVotingRecord.fetchMember, real timers, the real PDXPerson.crawlRecord
// reading the real header. Three seconds is inside the 6s brief deadline, so the
// give-up sentence is a different fact and must not appear.
{
  const lane = buildUtahLane(ROOT);
  const items = (lane.get(GARNER) || []).slice();
  must(items.length > 60, `the Utah lane holds only ${items.length} items for ${GARNER}`);

  const ROWS = servedLines(GARNER).slice(0, 6);
  must(ROWS.length === 6, `the snapshot serves ${ROWS.length} record lines for ${GARNER}, not six`);

  let fetchStarted = 0, fetchDone = 0;
  const DELAY = 3000;
  const win = boot({
    path: "/p/" + GARNER,
    header: fakeHeader(GARNER, ROWS),
    withPersonFile: true,
    realTimers: true,
    fetch: () => {
      fetchStarted++;
      return new Promise((res) => setTimeout(() => {
        fetchDone++;
        res({ ok: true, status: 200, json: () => Promise.resolve({ items: items, counts: { votes: items.length } }) });
      }, DELAY));
    },
  });

  must(win.PDXPerson && typeof win.PDXPerson.crawlRecord === "function",
    "PDXPerson.crawlRecord is gone — the crawl header reader cannot be tested");
  eq(win.PDXPerson.crawlRecord(GARNER).length, 6, "the real reader takes all six served rows off the header");

  const t0 = Date.now();
  askFor(win, GARNER);
  const inflight = win.PDXVotingRecord.fetchMember(GARNER, { pageSize: 100 });
  eq(fetchStarted, 1, "exactly one /member/:id request went out");
  eq(win.PDXVotingRecord.memberRecords(GARNER), null, "…and nothing has been noted for him yet");

  // THE FIRST MOUNTED BRIEF — the frame in the report.
  const first = brief(win, GARNER);
  hasnt(first, EMPTY, "the FIRST mounted brief does not call the file empty");
  ok(first.includes("pdxwa-brief-seed") || first.includes("still loading"),
    "…it is the header's rows or a wait — one or the other, which is all requirement 3 allows");
  has(first, "pdxwa-brief-seed", "…and here it is the seed brief, because the header had rows");
  for (const line of ROWS) {
    has(txt(first), line.split(" · ")[1], `…printing ${JSON.stringify(line.split(" · ")[1])}, already visible behind the modal`);
  }
  hasnt(first, "did not load", "…and no give-up sentence three seconds before the deadline");

  // EVERY REPAINT BEFORE THE PAYLOAD. bindHero re-runs the brief on each warm
  // event; none of those frames may go backwards to "nothing on file".
  const samples = [];
  for (const at of [400, 1200, 2100, 2800]) {
    await new Promise((r) => setTimeout(r, at - (Date.now() - t0)));
    samples.push({ at, html: brief(win, GARNER) });
  }
  eq(fetchDone, 0, "the payload has still not landed at t=2.8s");
  for (const s of samples) {
    hasnt(s.html, EMPTY, `t=${s.at}ms: still not called empty`);
    has(s.html, "pdxwa-brief-seed", `t=${s.at}ms: the rows the reader was already shown are still there`);
    hasnt(s.html, "did not load", `t=${s.at}ms: and still no give-up sentence`);
  }

  const data = await inflight;
  ok(fetchDone === 1 && data && Array.isArray(data.items), "the payload landed at t=3s");
  win.PDXVotingRecord.noteMember(GARNER, data.items);
  try { win.dispatchEvent(new win.CustomEvent("pdx-voting-warm", { detail: { pid: GARNER } })); } catch (e) {}

  const settled = brief(win, GARNER);
  ok(win.PDXVotingRecord.memberRecords(GARNER).length === items.length, "the record is on hand");
  hasnt(settled, EMPTY, "the settled brief does not call the file empty");
  hasnt(settled, "still loading", "…and is no longer a wait");
  hasnt(settled, "pdxwa-brief-seed", "…nor the seed, which has handed over to the engine");
  const sh = win.PDXConsistency.formalPatternIndex.shape(GARNER);
  ok(sh.issues > 0 && sh.read > 0, `the engine read the payload (${sh.issues} issues, ${sh.read} read)`);
  has(settled, "issues on the formal record", "…and the settled brief prints the engine's own count line");
  const missing = sh.tops.filter((x) => !txt(settled).includes(x.label)).map((x) => x.label);
  eq(missing, [], "every characterised pattern the engine holds is printed");

  // THE WHOLE SEQUENCE, IN ORDER: no empty frame anywhere on the way there.
  const frames = [first].concat(samples.map((s) => s.html), [settled]);
  eq(frames.filter((h) => h.includes(EMPTY)).length, 0,
    `none of the ${frames.length} frames from mount to settle called the file empty`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the vote chip and the empty paragraph cannot both be true");
// ═════════════════════════════════════════════════════════════════════════════
// The report's sharpest detail is the chip: VOTES 68 RECORDS on a sheet that said
// nothing was on file. The pill's count comes from _pdxRecordMappedCounts, so the
// brief now asks that same function, and the two statements are checked together
// over every id the lane holds rows for.
{
  const lane = buildUtahLane(ROOT);
  const win = boot({});
  must(typeof win._pdxRecordMappedCounts === "function",
    "_pdxRecordMappedCounts is gone — the chip's own count cannot be read");

  const both = [];
  let counted = 0;
  for (const [pid, rows] of lane) {
    if (!win.CMP_DATA[pid] || !rows || !rows.length) continue;
    win.PDXVotingRecord.noteMember(pid, rows);
    const n = (win._pdxRecordMappedCounts(pid) || {}).total || 0;
    if (n <= 0) continue;
    counted++;
    if (brief(win, pid).includes(EMPTY)) both.push(`${pid} (chip ${n})`);
  }
  ok(counted > 50, `the chip counts a record for ${counted} lane members`);
  eq(both, [], "no member whose chip counts a record is told nothing is on file");

  const n = (win._pdxRecordMappedCounts(GARNER) || {}).total || 0;
  ok(n > 0, `${GARNER}: the chip counts ${n} records for him`);
  hasnt(brief(win, GARNER), EMPTY, `${GARNER}: …and his brief agrees`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the empty letterhead still means something");
// ═════════════════════════════════════════════════════════════════════════════
// If the sentence became unreachable this pass would have replaced one lie with
// another. It is reserved for the ten hand-reviewed empty notes, and that is
// checked as an invariant with a request in flight — the state in which the old
// code handed it out to anybody.
{
  const win = boot({});
  const pids = Object.keys(win.CMP_DATA);
  const called = [], unreviewed = [];
  for (const pid of pids) {
    askFor(win, pid);
    claimFor(win, pid);
    if (!brief(win, pid).includes(EMPTY)) continue;
    called.push(pid);
    if (win.PDXWordAction.formalKnown(pid) !== "empty") unreviewed.push(pid);
  }
  eq(unreviewed, [], "every id still called empty is one of the hand-reviewed empty notes");
  ok(called.length > 0 && called.includes(JKNOTTS),
    `${called.length} reviewed-empty files still print the letterhead, ${JKNOTTS} among them`);

  // jknotts, first frame and settled. No crawl rows, no lane, n === 0.
  const jw = boot({ path: "/p/" + JKNOTTS, withPersonFile: true });
  eq(jw.PDXPerson.crawlRecord(JKNOTTS).length, 0, `${JKNOTTS}: the header serves him no rows`);
  askFor(jw, JKNOTTS);
  const jfirst = brief(jw, JKNOTTS);
  has(jfirst, EMPTY, `${JKNOTTS}: the FIRST frame is the reviewed empty letterhead, request in flight or not`);
  hasnt(jfirst, "still loading", `${JKNOTTS}: …not a wait that is never going to end`);
  hasnt(jfirst, "pdxwa-brief-seed", `${JKNOTTS}: …and no seed rows, because there are none`);

  jw.PDXVotingRecord.noteMember(JKNOTTS, []);
  const jset = brief(jw, JKNOTTS);
  eq(jw.PDXVotingRecord.memberRecords(JKNOTTS).length, 0, `${JKNOTTS}: the payload landed with nothing in it`);
  has(jset, EMPTY, `${JKNOTTS}: …and after settle he still gets the letterhead`);
  eq(jfirst, jset, `${JKNOTTS}: his document did not move between the two frames`);
  const note = jw.PDXFormalIndex.emptyNote(JKNOTTS);
  ok(note && note.reason && note.note, `${JKNOTTS}: the reviewed reason is still on file (${note && note.reason})`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · lee is untouched");
// ═════════════════════════════════════════════════════════════════════════════
// The honest half of the report. His sentence was already right, so the only
// acceptable outcome for him is no change at all — cold, in flight, and settled.
{
  const win = boot({});
  const cov = win.PDXWordAction.read(LEE, win.CMP_DATA[LEE]).coverage;
  ok(cov.scorable > 0, `${LEE}: carries a stance ledger (${cov.scorable} scorable) — the reason he got a wait`);

  const cold = brief(win, LEE);
  hasnt(cold, EMPTY, `${LEE}: cold, he is not called empty`);
  askFor(win, LEE);
  const inflight = brief(win, LEE);
  hasnt(inflight, EMPTY, `${LEE}: with the request in flight, still not called empty`);
  eq(inflight, cold, `${LEE}: …and the request did not change his document either way`);

  win.PDXVotingRecord.noteMember(LEE, buildUtahLane(ROOT).get(LEE) || []);
  hasnt(brief(win, LEE), EMPTY, `${LEE}: settled, still not called empty`);

  // HIS SENTENCE, AND EVERYONE ELSE'S. The wait he printed is shared copy; the
  // class that prints it on a bare boot is compared to HEAD's, so this pass
  // cannot have quietly widened or narrowed it there.
  let headWA = null;
  try {
    headWA = execFileSync("git", ["show", "HEAD:word-action.js"], { cwd: ROOT, encoding: "utf8" });
  } catch { /* no baseline */ }
  if (!headWA) {
    console.log("      (no git baseline available — the wait class was not compared)");
  } else {
    const A = boot({ src: { "word-action.js": headWA } });
    const B = boot({});
    const pids = Object.keys(B.CMP_DATA);
    const clsA = pids.filter((pid) => brief(A, pid).includes(WAIT_BARE));
    const clsB = pids.filter((pid) => brief(B, pid).includes(WAIT_BARE));
    ok(clsA.length > 100, `${clsA.length} briefs printed lee's sentence on a bare boot at HEAD`);
    eq(clsB, clsA, "…and exactly the same ids print it now — the wait class did not move on a bare boot");
    const onA = pids.filter((pid) => brief(A, pid).includes(WAIT_ONFILE));
    const onB = pids.filter((pid) => brief(B, pid).includes(WAIT_ONFILE));
    eq(onB, onA, "the on-file wait class did not move either");
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the door only opens on knowledge, and nothing else moved");
// ═════════════════════════════════════════════════════════════════════════════
// The three releases, stated as behaviour rather than as source: a request that
// LANDED with nothing in it prints the letterhead; a request still in the air
// never does; an id nobody ever asked about is left exactly as it was. The last
// of those is the reason this pass gates on the request instead of on settle —
// recordSettled() is false in a bare sandbox, so a settle gate would have moved
// hundreds of documents that were never wrong.
{
  // LANDED WITH NOTHING: the wait ends, honestly.
  const w1 = boot({ blind: true });
  askFor(w1, GARNER);
  hasnt(brief(w1, GARNER), EMPTY, `${GARNER}: in flight, blinded — not called empty`);
  w1.PDXVotingRecord.noteMember(GARNER, []);
  has(brief(w1, GARNER), EMPTY,
    `${GARNER}: blinded, and the payload came back with nothing — NOW the file is called empty`);
  ok(w1.PDXVotingRecord.memberRecords(GARNER) !== null,
    "…because noteMember ran, which is the knowledge the sentence takes");

  // NEVER ASKED: unchanged. Twinned over the whole roster, documents and read().
  let headWA = null;
  try {
    headWA = execFileSync("git", ["show", "HEAD:word-action.js"], { cwd: ROOT, encoding: "utf8" });
  } catch { /* no baseline */ }
  if (!headWA) {
    console.log("      (no git baseline available — the twin boot did not run here)");
  } else {
    const A = boot({ src: { "word-action.js": headWA } });
    const B = boot({});
    const pids = Object.keys(B.CMP_DATA);
    const readMoved = [], gained = [];
    let docsMoved = 0;
    for (const pid of pids) {
      const p = B.CMP_DATA[pid];
      let ra, rb;
      try { ra = JSON.stringify(A.PDXWordAction.read(pid, p)); } catch (e) { ra = "A-THREW"; }
      try { rb = JSON.stringify(B.PDXWordAction.read(pid, p)); } catch (e) { rb = "B-THREW"; }
      if (ra !== rb) readMoved.push(pid);
      const ha = brief(A, pid), hb = brief(B, pid);
      if (hb.includes(EMPTY) && !ha.includes(EMPTY)) gained.push(pid);
      if (ha !== hb) docsMoved++;
    }
    eq(readMoved, [],
      "read() — Direction Match, its floors, its coverage and its token — is identical to HEAD for every roster member");
    eq(gained, [], "no member gained the empty-file letterhead in this pass");
    eq(docsMoved, 0,
      "and no brief moved at all on a bare cold boot: with nobody asking, this pass says exactly what HEAD said");
  }
}

console.log("");
if (failures.length) {
  console.error(`✗ first paint loading honesty: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ first paint loading honesty: a loading file is never called empty, and the first frame is true — ${passed} assertions passed\n`);
