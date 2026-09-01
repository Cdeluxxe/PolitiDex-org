#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-seed-yields-to-record.mjs — the seed brief is FIRST PAINT ONLY, and the
// explore stage mounts on a file whose only ledger is its roll call
// ─────────────────────────────────────────────────────────────────────────────
// THE REPORT, second round. The crawl-seed pass stopped a cold /p/steven_lund
// from printing "No formal pattern on file yet" over a record the same page was
// counting — and then never let go of the stand-in. On production the grey seed
// pills and the sentence "the live roll-call read is still arriving" were still
// there minutes later, on a file whose 97-row payload had long since landed,
// while an older agent preview of the same person settled into the coloured
// engine brief. Newest code, worse page.
//
// THE CAUSE, in three parts, none of them a fetch race:
//
//   1. THE SEED'S LICENCE HAD NO END. It printed whenever crawlRecord() still saw
//      the first-byte header AND the engine shape was empty. crawlDone() HIDES
//      that header rather than removing it, so the first half stayed true for the
//      life of the document; and a payload the pattern index can read no issue
//      off leaves the second half true as well. Two true halves, one false page.
//   2. THE WAIT HAD NO END EITHER. briefAbsenceCopy released "still loading" only
//      on PDXConsistency.recordSettled(), and that lane only settles a request it
//      started — which, on a member with no stance ledger, is never. So the
//      arriving sentence was permanent for exactly the members it was written for.
//   3. NOTHING REPAINTED. bindHero listened for two lane events; the arrival
//      paths that actually feed an identity-only profile (a head prefetch adopted
//      inside fetchMember, /compare, the offline pack) dispatch neither, and the
//      warm event that does exist can fire before bindHero's setTimeout(…,0) has
//      armed. PDXVotingRecord.noteMember — the one line every path goes through —
//      announced nothing at all.
//
// AND THE SAME THREE FAILURES ONE STAGE DOWN: 🌳 All Issues by Topic returns ''
// when there are no leaves yet, which left no host for the read to fill, so a
// member with seventy acts on file got no tree — ever. A file with a record and
// no tree is a MOUNT bug, not a thin file.
//
// WHAT THIS FILE HOLDS:
//
//   1. THE SEED LEAVES WHEN THE PAYLOAD LANDS. Six crawl rows at t=0, ninety
//      mapped Utah rows noted, and the seed class, the seed note and the seed
//      heading are gone in the same breath the engine chips appear.
//   2. …ON A FILE WITH NO STATED POSITIONS AT ALL. coverage.scorable === 0 and
//      coverage.warming === false throughout: no gate in this pass may be reached
//      through a stance ledger.
//   3. THE HIDDEN HEADER IS NOT A LICENCE. crawlRecord() still returns its six
//      rows after the payload lands, and the brief is the engine's anyway.
//   4. THE MAPPED GAP IS OURS, AND IT ARRIVES ON A CLOCK. A payload with no
//      readable issue gets one short arriving sentence and then the gap sentence,
//      2 seconds later, with no settle and no stance ledger anywhere in it.
//   5. THE STENQUIST/GARNER CLASS. Index acts, engine-empty first paint: a wait
//      or a seed, never the empty file — and never the seed once rows are in.
//   6. jknotts IS UNCHANGED. Empty payload, empty index, reviewed empty sentence,
//      no seed and no wait.
//   7. THE REPAINT ACTUALLY HAPPENS. A real event bus and a real hero host:
//      noteMember alone repaints the letterhead, an alias's canonical id still
//      matches, and a record already in memory is reconciled at bind time with no
//      event at all.
//   8. THE EXPLORE STAGE MOUNTS. 🌳 All Issues by Topic hosts itself on an
//      identity-only file and fills with the real tree on 'pdx-record-noted'; the
//      flat formal list leaves a host behind for the same reason.
//
//   node scripts/test-seed-yields-to-record.mjs

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
const must = (c, m) => { if (c) return; console.error(`✗ seed yields to record: STALE HARNESS — ${m}`); process.exit(2); };

// The strings this pass is about, quoted once each.
const EMPTY = "No formal pattern on file yet";
const SEED_CLS = "pdxwa-brief-seed";
const SEED_NOTE = "These rows came with the page itself";
const SEED_HEAD = "On the formal record";
const ARRIVING = "roll-call lane is arriving";
const GAP = "none of it is mapped yet";
const ENGINE_COUNT = "issues on the formal record";
const ENGINE_TOPS = "Strongest patterns";

const LUND = "steven_lund";
const CLASS = ["jeffrey_stenquist", "brett_garner"];
const HONESTLY_EMPTY = "jknotts";

const ENGINE_FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "formal-index.js", "coverage.js", "profile-spine.js", "stance-tree.js",
];

// A crawl header the way netlify/edge-functions/share-preview.ts writes one, and
// HIDDEN from the start — crawlDone() hides rather than removes, which is the
// whole reason the seed could outlive the payload.
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

// ── A HOST A REPAINT CAN ACTUALLY LAND IN ───────────────────────────────────
// makeSandbox()'s document returns null for every lookup and its window swallows
// listeners, which is right for a pure engine read and useless for testing a
// repaint. `live: true` installs the two things the binders need and nothing
// else: a real listener registry, and a querySelector that answers for hosts the
// test has registered by their exact selector string.
function liveDom(win, header) {
  const listeners = {};
  win.addEventListener = (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); };
  win.removeEventListener = (t, fn) => {
    const a = listeners[t] || [];
    const i = a.indexOf(fn);
    if (i !== -1) a.splice(i, 1);
  };
  win.dispatchEvent = (ev) => {
    (listeners[(ev && ev.type) || ""] || []).slice().forEach((fn) => { try { fn(ev); } catch (e) {} });
    return true;
  };
  win.__listeners = listeners;
  win.__hosts = {};
  win.__host = (sel) => {
    const el = {
      innerHTML: "", outerHTML: "",
      classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
      querySelector() { return null; }, querySelectorAll() { return []; },
      getAttribute() { return null; },
    };
    win.__hosts[sel] = el;
    return el;
  };
  win.document.querySelector = (s) => {
    if (s === "#pdx-crawl-person") return header || null;
    return Object.prototype.hasOwnProperty.call(win.__hosts, s) ? win.__hosts[s] : null;
  };
  win.document.getElementById = (s) => (s === "pdx-crawl-person" ? (header || null) : null);
}

function boot(opts) {
  const o = opts || {};
  const win = makeSandbox();
  if (o.path) {
    win.location.pathname = o.path;
    win.location.href = "https://www.politidex.fyi" + o.path;
  }
  if (o.header && !o.live) {
    win.document.querySelector = (s) => (s === "#pdx-crawl-person" ? o.header : null);
    win.document.getElementById = (s) => (s === "pdx-crawl-person" ? o.header : null);
  }
  if (o.live) liveDom(win, o.header || null);
  if (o.fetch) win.fetch = o.fetch;
  if (o.realTimers) {
    win.setTimeout = (fn, ms) => setTimeout(fn, ms);
    win.clearTimeout = (t) => clearTimeout(t);
  }
  win.URLSearchParams = URLSearchParams;
  win.AbortController = AbortController;
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  const files = (o.files || ENGINE_FILES).slice();
  if (o.withPersonFile) files.push("profiles-full.js", "person-file.js");
  for (const f of files) vm.runInContext(o.src && o.src[f] ? o.src[f] : R(f), ctx, { filename: f });
  win.PROFILES = win.CMP_DATA;
  // person-file.js kicks its own cold arrival from a setTimeout, which under real
  // timers would spend this test's clock polling a roster for a modal that does
  // not exist here. Naming a file is the poll's own first stop condition (see
  // attempt), so it is used rather than worked around.
  if (o.noArrival) win._pdxCurrentProfileId = "__harness__";
  return win;
}

const txt = (h) => String(h || "").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const brief = (win, pid) => {
  try { return win.PDXWordAction.briefHtml(pid, win.CMP_DATA[pid]) || ""; } catch (e) { return "THREW: " + e.message; }
};
const tick = () => new Promise((r) => setTimeout(r, 0));

// The rows the edge really serves, read from the committed snapshot.
const SNAPSHOT = JSON.parse(R("db/share-index.json")).personRecord || {};
const servedLines = (pid) => (SNAPSHOT[pid] || [])
  .filter((x) => x && x.p && x.i)
  .map((x) => [x.p, x.i, x.c || ""].filter(Boolean).join(" · "));

const LANE = buildUtahLane(ROOT);
const laneRows = (pid) => (LANE.get(pid) || []).slice();

// ═════════════════════════════════════════════════════════════════════════════
section("1 · six crawl rows at t=0, ninety mapped rows at t=1, and the seed is gone");
// ═════════════════════════════════════════════════════════════════════════════
{
  const rows = servedLines(LUND);
  must(rows.length >= 6, `db/share-index.json serves only ${rows.length} record lines for ${LUND}`);
  const items = laneRows(LUND).slice(0, 90);
  must(items.length === 90, `the Utah lane holds ${items.length} rows for ${LUND}, not 90`);

  const win = boot({ path: "/p/" + LUND, header: fakeHeader(LUND, rows.slice(0, 6)), withPersonFile: true });
  eq(win.PDXPerson.crawlRecord(LUND).length, 6, "the header's six rows parse — the edge's own cap");

  const first = brief(win, LUND);
  has(first, SEED_CLS, "t=0: the first paint is the seed brief");
  has(first, SEED_NOTE, "t=0: …disclosing where its rows came from");
  has(first, SEED_HEAD, "t=0: …under the seed's own heading");
  hasnt(first, EMPTY, "t=0: and never the empty-file letterhead");

  win.PDXVotingRecord.noteMember(LUND, items);
  const after = brief(win, LUND);
  eq(win.PDXVotingRecord.memberRecords(LUND).length, 90, "the payload is in memory");
  hasnt(after, SEED_CLS, "the seed class is gone the moment the payload is in memory");
  hasnt(after, SEED_NOTE, "…and so is its disclosure line");
  hasnt(after, SEED_HEAD, "…and its heading");
  hasnt(after, ARRIVING, "…and nothing is still described as arriving");
  hasnt(after, EMPTY, "…and the file is not called empty");
  has(after, ENGINE_COUNT, "the engine's own count line is there instead");
  has(after, ENGINE_TOPS, "…and the engine's own ranking");
  const sh = win.PDXConsistency.formalPatternIndex.shape(LUND);
  ok(sh.issues > 0 && sh.characterised > 0,
    `the engine read the payload (${sh.issues} issues · ${sh.judged} acts · ${sh.characterised} characterised)`);
  const orphans = sh.tops.filter((t) => !txt(after).includes(t.label)).map((t) => t.label);
  eq(orphans, [], "every characterised pattern the engine holds is printed");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · …on a file with no stated positions at all");
// ═════════════════════════════════════════════════════════════════════════════
// The identity-only class, stated as the invariant rather than assumed: this is
// the exact shape that made every warming-gated branch unreachable, and the pass
// must clear it without a stance ledger appearing anywhere.
{
  const win = boot({ path: "/p/" + LUND, header: fakeHeader(LUND, servedLines(LUND).slice(0, 6)), withPersonFile: true });
  const before = win.PDXWordAction.read(LUND, win.CMP_DATA[LUND]).coverage;
  eq(before.scorable, 0, `${LUND}: carries no scorable stance before the payload`);
  eq(before.warming, false, `${LUND}: …and nothing ever set warming`);

  win.PDXVotingRecord.noteMember(LUND, laneRows(LUND).slice(0, 90));
  const cov = win.PDXWordAction.read(LUND, win.CMP_DATA[LUND]).coverage;
  eq(cov.scorable, 0, `${LUND}: still carries no scorable stance after it`);
  eq(cov.warming, false, `${LUND}: …and warming was never set at any point`);

  const h = brief(win, LUND);
  hasnt(h, SEED_CLS, "the seed is gone with coverage.scorable === 0");
  has(h, ENGINE_COUNT, "…and the engine brief mounted with coverage.scorable === 0");
  // The source-level half of the same claim: the seed gate asks the record, not
  // the ledger.
  const WA = R("word-action.js");
  const i = WA.indexOf("function briefSeedHtml");
  must(i !== -1, "word-action.js no longer defines briefSeedHtml");
  const gate = WA.slice(i, i + 400);
  has(gate, "briefLiveN(pid) > 0", "briefSeedHtml does not refuse on the payload being in memory");
  ok(!/hasStance|coverage\.scorable|\.warming/.test(gate),
    "briefSeedHtml's guard consults a stance ledger — the identity-only class is what it must not depend on");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the hidden header is not a licence");
// ═════════════════════════════════════════════════════════════════════════════
// crawlDone() hides the header; it stays readable for the life of the document.
// That is a feature for a repaint that still has no engine rows, and it must not
// be a reason to keep the stand-in over a payload.
{
  const win = boot({ path: "/p/" + LUND, header: fakeHeader(LUND, servedLines(LUND).slice(0, 6)), withPersonFile: true });
  win.PDXVotingRecord.noteMember(LUND, laneRows(LUND).slice(0, 90));
  eq(win.PDXPerson.crawlRecord(LUND).length, 6,
    "the hidden crawl block still reads after the payload — nothing was deleted to fix this");
  const h = brief(win, LUND);
  hasnt(h, SEED_CLS, "…and the brief is the engine's anyway");
  has(h, ENGINE_COUNT, "…printing the engine's count line over a header that is still there");
  // Repainted twice more: the seed must not come back on a later pass either.
  hasnt(brief(win, LUND), SEED_CLS, "a second repaint does not restore the seed");
  hasnt(brief(win, LUND), SEED_NOTE, "…nor its disclosure line");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · a payload with nothing mapped: one short wait, then OUR gap");
// ═════════════════════════════════════════════════════════════════════════════
// Requirement 4, on the clock. The rows are real and the index can read no issue
// off them, so the honest sentence is the mapping gap — and the release from the
// arriving sentence may not be recordSettled(), which never fires on a file
// nothing queued a read for.
{
  const unmapped = laneRows(LUND).map((x) => Object.assign({}, x, { issues: [] }));
  ok(unmapped.length > 90, `the unmapped payload is real (${unmapped.length} rows)`);

  const win = boot({
    path: "/p/" + LUND, header: fakeHeader(LUND, servedLines(LUND).slice(0, 6)),
    withPersonFile: true, live: true, realTimers: true,
  });
  // The lane is forced to report "not settled" for the whole section: the point
  // is that the copy releases WITHOUT it.
  win.PDXConsistency.recordSettled = () => false;
  win.PDXVotingRecord.noteMember(LUND, unmapped);

  const t0 = brief(win, LUND);
  hasnt(t0, SEED_CLS, "t=0 after the payload: not the seed, even with the header still in the document");
  hasnt(t0, EMPTY, "…and not the empty file");
  has(t0, ARRIVING, "…one short sentence saying the lane is arriving");
  eq(win.PDXConsistency.formalPatternIndex.shape(LUND).issues, 0,
    "…over a shape the index can read nothing from");

  // The deadline this pass arms is 2s, and it announces itself so a repaint can
  // happen without anything else coming along.
  let fired = 0;
  win.addEventListener("pdx-brief-timeout", (ev) => {
    if (!ev || !ev.detail || ev.detail.pid === LUND) fired++;
  });
  await new Promise((r) => setTimeout(r, 2300));
  ok(fired > 0, "the payload deadline fired on its own, so nothing waits for another surface");

  const late = brief(win, LUND);
  hasnt(late, ARRIVING, "t=2.3s: the arriving sentence has stopped");
  hasnt(late, SEED_CLS, "…and the seed did not come back");
  hasnt(late, EMPTY, "…and the file is still not called empty");
  has(late, GAP, "…the copy names the mapping gap");
  has(late, "That gap is ours", "…and says whose it is");
  ok(!win.PDXConsistency.recordSettled(LUND),
    "…all of it with the lane still reporting that it never settled");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the Stenquist/Garner class");
// ═════════════════════════════════════════════════════════════════════════════
// Index acts, no crawl header, no payload: the first engine-empty paint may be a
// wait or a seed, never the empty file — and once rows are in, it is the engine's.
{
  for (const pid of CLASS) {
    const cold = boot({ path: "/p/" + pid });
    ok(cold.PDXFormalIndex.acts(pid) > 0,
      `${pid}: the shipped index counts ${cold.PDXFormalIndex.acts(pid)} acts`);
    const k = cold.PDXWordAction.formalKnown(pid);
    ok(k === "deep" || k === "thin", `${pid}: formalKnown() reports a record on file (${k})`);
    const c = brief(cold, pid);
    hasnt(c, EMPTY, `${pid}: the first engine-empty paint is not the empty file`);
    ok(c.includes("still loading") || c.includes(ARRIVING) || c.includes(SEED_CLS),
      `${pid}: …it is a wait or a seed`);

    const warm = boot({ path: "/p/" + pid, header: fakeHeader(pid, servedLines(pid).slice(0, 6)), withPersonFile: true });
    has(brief(warm, pid), SEED_CLS, `${pid}: with the served header, the first paint is the seed`);
    warm.PDXVotingRecord.noteMember(pid, laneRows(pid));
    const h = brief(warm, pid);
    hasnt(h, EMPTY, `${pid}: after the payload, not the empty file`);
    hasnt(h, SEED_CLS, `${pid}: …and not the seed`);
    hasnt(h, "still loading", `${pid}: …and not a wait`);
    has(h, ENGINE_COUNT, `${pid}: it is the engine's own brief`);
    const sh = warm.PDXConsistency.formalPatternIndex.shape(pid);
    ok(sh.issues > 0, `${pid}: …over ${sh.issues} issues the engine read from ${laneRows(pid).length} rows`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · jknotts is unchanged");
// ═════════════════════════════════════════════════════════════════════════════
// The reviewed empty file. Empty payload, empty index: the sentence means
// something only if it is still printed here, and it must not be traded for a
// wait that is never coming or a seed there are no rows for.
{
  const win = boot({ path: "/p/" + HONESTLY_EMPTY, withPersonFile: true });
  eq(win.PDXFormalIndex.acts(HONESTLY_EMPTY), 0, "the index counts no acts for him");
  eq(win.PDXWordAction.formalKnown(HONESTLY_EMPTY), "empty", "formalKnown() says empty, not absent");
  const cold = brief(win, HONESTLY_EMPTY);
  has(cold, EMPTY, "the cold brief is the reviewed empty sentence");
  hasnt(cold, "still loading", "…not a wait");
  hasnt(cold, ARRIVING, "…not an arrival");
  hasnt(cold, SEED_CLS, "…and not a seed");

  win.PDXVotingRecord.noteMember(HONESTLY_EMPTY, []);
  const after = brief(win, HONESTLY_EMPTY);
  eq(after, cold, "an empty payload changes not one byte of it");
  const note = win.PDXFormalIndex.emptyNote(HONESTLY_EMPTY);
  ok(note && note.reason, `the reviewed reason is on file (${note && note.reason})`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the repaint actually happens");
// ═════════════════════════════════════════════════════════════════════════════
// Requirement 3, driven through a real listener registry and a real hero host.
// noteMember is the one line every arrival path goes through, so noteMember alone
// has to be enough — no warm queue, no stance ledger, no second event.
{
  const VR_SRC = R("voting-record.js");
  has(VR_SRC, "'pdx-record-noted'", "voting-record.js does not announce the arrival it just took");
  has(R("word-action.js"), "'pdx-record-noted'", "…and word-action.js's hero does not listen for it");

  const win = boot({
    path: "/p/" + LUND, header: fakeHeader(LUND, servedLines(LUND).slice(0, 6)),
    live: true, realTimers: true, withPersonFile: true, noArrival: true,
    // The arrival still warms the record endpoint on its way past. Nothing here
    // reads the answer, so it is a promise that never settles rather than
    // makeSandbox's rejection, which would print a network error into the run.
    fetch: () => new Promise(() => {}),
  });
  const mount = win.PDXWordAction.heroMount(LUND, win.CMP_DATA[LUND], {});
  has(mount, SEED_CLS, "the mounted hero starts as the seed brief");
  const uid = (mount.match(/data-pdxwa-hero="([^"]+)"/) || [])[1];
  must(uid, "heroMount stopped stamping its host id — the repaint has no host to find");
  const host = win.__host('[data-pdxwa-hero="' + uid + '"]');
  await tick();                                   // bindHero's setTimeout(…,0)

  // ONE CALL, NO EVENT OF OUR OWN. This is the path that was silent.
  win.PDXVotingRecord.noteMember(LUND, laneRows(LUND).slice(0, 90));
  has(host.innerHTML, ENGINE_COUNT, "noteMember alone repainted the hero into the engine brief");
  hasnt(host.innerHTML, SEED_CLS, "…and the seed is gone from the host, not just from a fresh read");
  hasnt(host.innerHTML, SEED_NOTE, "…disclosure line and all");

  // THE RECONCILING PAINT. The record can already be in memory when the listener
  // is armed, in which case the event was dispatched to nobody.
  const late = boot({ path: "/p/" + LUND, header: fakeHeader(LUND, servedLines(LUND).slice(0, 6)), live: true, realTimers: true });
  late.PDXVotingRecord.noteMember(LUND, laneRows(LUND).slice(0, 90));
  const m2 = late.PDXWordAction.heroMount(LUND, late.CMP_DATA[LUND], {});
  const uid2 = (m2.match(/data-pdxwa-hero="([^"]+)"/) || [])[1];
  const host2 = late.__host('[data-pdxwa-hero="' + uid2 + '"]');
  host2.innerHTML = "STALE";
  await tick(); await tick();
  has(host2.innerHTML, ENGINE_COUNT,
    "a record already in memory is reconciled at bind time, with no event at all");

  // THE HOST THAT HAS NOT LANDED YET. bindHero is armed beside markup the caller
  // is still assembling, so a missing host must not end the subscription.
  const slow = boot({ path: "/p/" + LUND, header: fakeHeader(LUND, servedLines(LUND).slice(0, 6)), live: true, realTimers: true });
  const m3 = slow.PDXWordAction.heroMount(LUND, slow.CMP_DATA[LUND], {});
  const uid3 = (m3.match(/data-pdxwa-hero="([^"]+)"/) || [])[1];
  await tick(); await tick();                     // binds, finds nothing, keeps listening
  const host3 = slow.__host('[data-pdxwa-hero="' + uid3 + '"]');
  slow.PDXVotingRecord.noteMember(LUND, laneRows(LUND).slice(0, 90));
  has(host3.innerHTML, ENGINE_COUNT,
    "a host that appeared after the bind still gets its repaint — a missing host is 'not yet', not 'gone'");

  // BOTH IDS TRAVEL, AND EITHER MATCHES. Every aliased pid depends on this.
  const ev = boot({ path: "/p/" + LUND, live: true, realTimers: true });
  const m4 = ev.PDXWordAction.heroMount(LUND, ev.CMP_DATA[LUND], {});
  const uid4 = (m4.match(/data-pdxwa-hero="([^"]+)"/) || [])[1];
  const host4 = ev.__host('[data-pdxwa-hero="' + uid4 + '"]');
  await tick();
  // Straight into the cache, then the epoch bumped by hand: this is the shape of
  // every arrival path that lands rows without announcing them, and the event
  // under test carries ONLY the canonical id — which is what an aliased member's
  // repaint depends on.
  ev.PDXVotingRecord._records[LUND] = laneRows(LUND).slice(0, 90);
  ev.PDXDataChanged();
  ev.dispatchEvent(new ev.CustomEvent("pdx-record-noted", { detail: { canon: LUND, n: 90 } }));
  has(host4.innerHTML, ENGINE_COUNT, "an event carrying only the canonical id still repaints this hero");
  const other = ev.__host('[data-pdxwa-hero="nobody"]');
  eq(other.innerHTML, "", "…and an event for somebody else repaints nobody");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the explore stage mounts on an identity-only file");
// ═════════════════════════════════════════════════════════════════════════════
// Requirement 8. The tree's leaves come from the roll-call read, so at first
// paint there are none — and returning '' left no host for the read to fill.
// Seventy acts and no tree is a mount bug.
{
  const TR_COLD = boot({ path: "/p/" + LUND, live: true, realTimers: true });
  must(TR_COLD.PDXStanceTree && typeof TR_COLD.PDXStanceTree.sectionHtml === "function",
    "stance-tree.js no longer publishes sectionHtml");
  eq(TR_COLD.PDXConsistency.issueRows(LUND).length, 0, "there are no leaves at first paint");
  const sec = TR_COLD.PDXStanceTree.sectionHtml(LUND);
  has(sec, "pdxsec-stancetree", "the section mounts anyway, because the index counts acts for this file");
  has(sec, "All Issues by Topic", "…under its own heading");
  has(sec, "pdxtree-body", "…with a body a late read can be drawn into");
  has(txt(sec), "topic tree is being built", "…saying which half is still arriving");

  const host = (sec.match(/data-pdxtree-host="([^"]+)"/) || [])[1];
  must(host, "the section stopped stamping its host id");
  const body = TR_COLD.__host('[data-pdxtree-host="' + host + '"] .pdxtree-body');
  await tick();
  TR_COLD.PDXVotingRecord.noteMember(LUND, laneRows(LUND));
  ok(body.innerHTML.length > 2000, `the tree filled itself on the arrival (${body.innerHTML.length} bytes)`);
  has(body.innerHTML, "pdxtree", "…with the real tree markup");
  hasnt(body.innerHTML, "topic tree is being built", "…and the wait line is gone");
  const rows = TR_COLD.PDXConsistency.issueRows(LUND);
  ok(rows.length > 20, `…over ${rows.length} issues the engine read for a file with no stated position`);

  // A FILE WITH NOTHING BEHIND IT STILL GETS NOTHING. The host is not a licence
  // to mount an empty stage on everybody.
  eq(TR_COLD.PDXStanceTree.sectionHtml(HONESTLY_EMPTY), "",
    `${HONESTLY_EMPTY}: no record, no tree, no empty stage`);

  // 🏛 THE FLAT FORMAL LIST leaves a host behind for the same reason. Its gate
  // reads FPI.count(id), which is zero until the payload lands.
  const PF = R("profiles-full.js");
  has(PF, "_atlasLateHost", "the flat formal list has no late host, so its gate is still read once and for ever");
  has(PF, "data-pdx-atlas-late", "…and no marker a late read could find");
  const gi = PF.indexOf("const _atlasExpected");
  must(gi !== -1, "profiles-full.js no longer defines _atlasExpected");
  const exp = PF.slice(gi, gi + 700);
  has(exp, "memberRecords", "the atlas's expectation test does not consult the rows in memory");
  has(exp, "PDXFormalIndex", "…nor the shipped static index");
  ok(!/scorable|hasStance|warming/.test(exp),
    "the atlas's expectation test consults a stance ledger — the identity-only class is what it is for");
  const bi = PF.indexOf("const _bindAtlasLate");
  must(bi !== -1, "profiles-full.js no longer defines _bindAtlasLate");
  has(PF.slice(bi, bi + 900), "pdx-record-noted", "the atlas host does not listen for the arrival itself");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · the roster poll does not spin the tab");
// ═════════════════════════════════════════════════════════════════════════════
// Requirement 7. The poll used to be 120ms × a 15s ceiling — up to 125 ticks,
// each one re-asking a question whose answer cannot change between ticks, on the
// same thread that is mounting the file. The window is unchanged; the number of
// ticks and the cost of each one are not.
{
  const PF = R("person-file.js");
  has(PF, "var MAX_TRIES", "person-file.js's roster poll has no retry cap");
  has(PF, "var STEP_MAX", "…and no ceiling on its backoff");
  has(PF, "Math.pow(STEP_GROW, tries)", "…and the gap between attempts does not grow");
  // Same rename as in test-person-file-perf.mjs: the poll's exits were funnelled
  // through stopWait() in v103 so the unknown-pid notice could be gated on the
  // wait still being open. _adoptSettled is still what ends the poll.
  has(PF, "if (window._pdxCurrentProfileId) { stopWait(); return; }",
    "…and it does not stop when a file is already named");
  ok(/function stopWait\(\)\s*\{[^}]*_adoptSettled = true/.test(PF),
    "…and its single exit no longer settles the poll");
  // The cached roster scan: bySlug walks both rosters and slugs every name in
  // them, which is what made each tick expensive.
  has(PF, "_slugCache", "bySlug is not memoised, so every poll tick rescans both rosters");
  has(PF, "function rosterGen", "…and there is no generation stamp to invalidate it against");

  // The numbers, read out of the file rather than restated: the tick budget must
  // still cover the ceiling, or an honest not-found answer would come early.
  const num = (name) => {
    const m = PF.match(new RegExp("var " + name + " = (\\d+(?:\\.\\d+)?);"));
    must(m, `person-file.js no longer declares ${name}`);
    return Number(m[1]);
  };
  const STEP = num("STEP"), STEP_MAX = num("STEP_MAX"), GROW = num("STEP_GROW"),
    MAX_TRIES = num("MAX_TRIES"), CEILING = num("CEILING");
  let waited = 0, ticks = 0;
  while (waited < CEILING && ticks < MAX_TRIES) {
    waited += Math.min(STEP_MAX, Math.round(STEP * Math.pow(GROW, ticks)));
    ticks++;
  }
  ok(waited >= CEILING,
    `the tick budget still covers the ${CEILING}ms window (${ticks} ticks, ${waited}ms) — an early cap would ` +
    "call a real person unknown");
  ok(ticks <= 25, `…in ${ticks} attempts rather than ${Math.ceil(CEILING / STEP)}`);
  ok(MAX_TRIES > ticks,
    `MAX_TRIES (${MAX_TRIES}) is the belt-and-braces stop, above the ${ticks} a normal clock needs`);

  // And the cache actually caches: one scan per roster generation, whatever the
  // poll does. Counted through a getter on the roster the scan walks.
  // PDXPerson.resolve is the question the poll asks on every tick, and bySlug's
  // full double-roster scan is what it costs when the answer is "nobody". The
  // scan is counted through a getter on the roster it walks.
  // PDXPerson.resolve is the question the poll asks on every tick, and bySlug's
  // full double-roster walk is what it costs when the answer is "nobody". The
  // WALK is what is counted — a Proxy whose ownKeys trap fires for `for…in` and
  // not for the single-key lookups resolve() makes on the way there.
  const win = boot({ path: "/p/nobody_at_all", withPersonFile: true });
  let scans = 0;
  win.PROFILES = new Proxy(win.CMP_DATA, {
    ownKeys(t) { scans++; return Reflect.ownKeys(t); },
  });
  win._pdxRosterState = "loading";
  const UNKNOWN = "nobody_at_all_zzz";
  eq(win.PDXPerson.resolve(UNKNOWN), "", "the fixture id really does resolve to nobody");
  const afterOne = scans;
  ok(afterOne > 0, "…and answering it once really did walk the roster");
  for (let i = 0; i < 20; i++) win.PDXPerson.resolve(UNKNOWN);
  eq(scans, afterOne, "twenty more ticks in the same roster generation walk it no further");
  win._pdxRosterState = "done";
  eq(win.PDXPerson.resolve(UNKNOWN), "", "…the answer is the same after the roster lands");
  ok(scans > afterOne, "…and a roster that has since landed invalidates the cache");
}

// ═════════════════════════════════════════════════════════════════════════════
section("10 · Direction Match's two loading sentences did not move");
// ═════════════════════════════════════════════════════════════════════════════
// THE ONE EXCEPTION THIS PASS TOOK, PROVED RATHER THAN ASSERTED. shapeMatchHtml's
// wait copy split on `formalKnown(pid) === 'deep'`; formalKnown gained a fourth
// answer ('thin'), so that literal would have silently re-worded Direction Match
// on any file the index counts acts for across fewer than eight measures. Both
// sites now ask formalHasRecord() — 'deep' or 'thin' — and the bytes therefore
// moved. scripts/test-person-crawl-block.mjs takes the exception; this is the
// behavioural half: HEAD's word-action.js beside the working copy, over every
// roster member whose read is WARMING, which is the only state those two lines
// are reachable in.
{
  let headWA = null;
  try {
    headWA = execFileSync("git", ["show", "HEAD:word-action.js"], { cwd: ROOT, encoding: "utf8" });
  } catch { /* no baseline in this environment */ }
  if (!headWA) {
    console.log("      (no git baseline available — the twin boot did not run here)");
  } else {
    const A = boot({ src: { "word-action.js": headWA } });
    const B = boot({});
    const pids = Object.keys(B.CMP_DATA);
    ok(pids.length > 700, `both twins booted the roster (${pids.length} ids)`);

    // The Direction Match block, cut out of the rendered brief by its own class.
    const dm = (win, pid) => {
      const h = brief(win, pid);
      const i = h.indexOf('class="pdxwa-shape-dm"');
      return i === -1 ? "" : h.slice(i);
    };
    let warming = 0, withGap = 0;
    const moved = [], briefsMoved = [];
    for (const pid of pids) {
      const cov = B.PDXWordAction.read(pid, B.CMP_DATA[pid]).coverage;
      if (cov.warming) warming++;
      const a = dm(A, pid), b = dm(B, pid);
      if (a) withGap++;
      if (a !== b) moved.push(pid);
      if (brief(A, pid) !== brief(B, pid)) briefsMoved.push(pid);
    }
    ok(warming > 50, `${warming} roster members are in the warming state these lines live in`);
    ok(withGap > 50, `…and ${withGap} render the Direction Match gap block this compares`);
    eq(moved, [], "the Direction Match block is byte-identical to HEAD for every roster member");
    eq(briefsMoved, [],
      "…and so is the whole brief, on a cold boot with no payload — this pass changes what " +
      "happens when the record LANDS, and nothing about the page before it does");

    // The wording split itself, on both sides of the new boundary. No shipped id
    // is 'thin' today (every indexed member clears eight measures), which is
    // exactly why the literal had to go before one is.
    const thin = pids.filter((pid) => B.PDXWordAction.formalKnown(pid) === "thin");
    eq(thin, [], "no shipped id reads as 'thin' yet, so no Direction Match sentence could have changed silently");
    const deep = pids.filter((pid) => B.PDXWordAction.formalKnown(pid) === "deep");
    ok(deep.length > 100, `…and ${deep.length} read as 'deep', unchanged from the three-answer version`);
  }
}

console.log("");
if (failures.length) {
  console.error(`✗ seed yields to record: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ seed yields to record: the seed is first paint only, and the explore stage mounts on a roll-call-only file — ${passed} assertions passed\n`);
