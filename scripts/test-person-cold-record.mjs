#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-person-cold-record.mjs — a cold person file may not erase a record it
// has already shown
// ─────────────────────────────────────────────────────────────────────────────
// THE REPORT. On a cold /p/steven_lund the served HTML printed his formal rows in
// the first byte — Parental Rights 8-2, Water 7-0, Religious Liberty split — and
// then, the moment the app mounted its own letterhead over them, the gold brief
// read "No formal pattern on file yet" on a sheet that was simultaneously showing
// VOTES 97 RECORDS. Same for /p/jeffrey_stenquist (69) and /p/brett_garner (68).
// /p/rosemary_lesser, on the same deploy, painted the real brief. "Same wave,
// different race."
//
// THE CAUSE, and it is not a fetch race. briefAbsenceCopy() asked ONE question
// before it was allowed to print a loading sentence instead of an empty one: is
// this member's read warming? Warming is set by consistency.js only where there
// is a STANCE to test —
//
//   consistency.js: } else if (!warm && hasStance) { pending = true; queueWarm(pid); }
//
// — and lund, stenquist and garner are identity-only roster records with no
// stance ledger at all. So warming was never set for them, the loading branch was
// unreachable, and the function fell through to the empty sentence while the
// static formal index in the same tab counted 97 / 69 / 68 acts for them. lesser
// carries five scorable stances, so she got the wait. "With stated positions" vs
// "without", printed as "has a record" vs "has none".
//
// WHAT THIS FILE HOLDS:
//
//   1. NO MEMBER WITH A FORMAL RECORD GETS THE EMPTY LETTERHEAD ON A COLD MOUNT.
//      Not the three named pids — every one of the 122 roster ids the shipped
//      formal index counts acts for, checked as an invariant rather than a list.
//   2. THE FIRST PAINT USES THE ROWS THE HEADER ALREADY PRINTED. Through the real
//      PDXPerson.crawlRecord against a real crawl header, with no live payload and
//      no static index — the seed brief, in the header's own order.
//   3. THOSE ROWS BELONG TO ONE PERSON. The header's identity guard travels with
//      them: another address, another pid, or a generic block yields nothing, and
//      the copy falls back to a wait rather than to somebody else's rows.
//   4. FIVE REAL SECONDS OF DELAYED FETCH. Header rows on screen, a 90-row member
//      payload that lands at t=5s (inside the 6s brief deadline), and the brief
//      sampled throughout: never the empty sentence, never empty→full→empty, and
//      the settled brief is the engine's own.
//   5. THE EMPTY FILE IS STILL EMPTY. jknotts settles with a reviewed reason and
//      the empty sentence, and nobody gained that sentence in this pass.
//   6. DIRECTION MATCH AND THE FLOORS DID NOT MOVE. Twin boot against HEAD:
//      read() is byte-identical for all 800 roster members, and the only
//      documents that changed are the identity-only records that were wrong.
//
//   node scripts/test-person-cold-record.mjs

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
const must = (c, m) => { if (c) return; console.error(`✗ person cold record: STALE HARNESS — ${m}`); process.exit(2); };

// The sentence this whole pass exists to keep off a cold arrival, quoted once.
const EMPTY = "No formal pattern on file yet";
// The three the report named, and the two controls.
const NAMED = ["steven_lund", "jeffrey_stenquist", "brett_garner"];
const CHARACTERISED = "rosemary_lesser";
const HONESTLY_EMPTY = "jknotts";

// ── The engine stack, and one person-file.js on top of it ────────────────────
// Same list every engine harness in scripts/ boots, plus person-file.js where the
// crawl-header reader is needed: PDXPerson.crawlRecord is the module that owns the
// header, and this file tests the real one rather than a stand-in.
const ENGINE_FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "formal-index.js", "coverage.js", "profile-spine.js",
];

// A crawl header the way netlify/edge-functions/share-preview.ts writes one:
// stamped for the address it was generated at, carrying the pid it named, and one
// <li> per formal row inside a [data-pdx-crawl-record] section.
function fakeHeader(pid, rows, over) {
  const attrs = Object.assign(
    { "data-pid": pid, "data-pdx-crawl-for": "/p/" + pid },
    (over && over.attrs) || {}
  );
  for (const k of Object.keys(attrs)) if (attrs[k] === null) delete attrs[k];
  const lis = rows.map((t) => ({ textContent: t }));
  return {
    id: "pdx-crawl-person",
    // crawlDone() HIDES this node rather than removing it, which is the whole
    // reason a repaint can keep re-reading it. The stub is hidden from the start
    // so a reader that ever consulted visibility would fail here.
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
  // makeSandbox() stops at the DOM; voting-record.js's request path also needs the
  // two URL/abort globals a browser has. Supplied so the REAL fetchMember runs.
  win.URLSearchParams = URLSearchParams;
  win.AbortController = AbortController;
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  const files = (o.files || ENGINE_FILES).slice();
  if (o.withPersonFile) files.push("profiles-full.js", "person-file.js");
  for (const f of files) {
    vm.runInContext(o.src && o.src[f] ? o.src[f] : R(f), ctx, { filename: f });
  }
  win.PROFILES = win.CMP_DATA;
  return win;
}

const txt = (h) => String(h || "").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const brief = (win, pid) => {
  try { return win.PDXWordAction.briefHtml(pid, win.CMP_DATA[pid]) || ""; } catch (e) { return "THREW: " + e.message; }
};

// The rows the edge actually serves for the named pids, read from the committed
// snapshot rather than invented — so a fixture here is the same line a reader gets.
const SNAPSHOT = JSON.parse(R("db/share-index.json")).personRecord || {};
// Flattened the way share-preview.ts's recordSection() flattens it — the same
// three fields, the same " · " join, the same "must have a pattern and an issue"
// filter. Quoted rather than imagined, so the fixture is the served line.
const servedLines = (pid) => (SNAPSHOT[pid] || [])
  .filter((x) => x && x.p && x.i)
  .map((x) => [x.p, x.i, x.c || ""].filter(Boolean).join(" · "));

// ═════════════════════════════════════════════════════════════════════════════
section("1 · a cold mount, and nobody with a record is called empty");
// ═════════════════════════════════════════════════════════════════════════════
// No crawl header, no member payload, no warm read: the state the gold file
// mounts in on a cold /p/<pid>. The only thing on hand is the static formal index
// the bundle ships, which is exactly what the old code refused to consult.
{
  const win = boot({});
  must(win.PDXWordAction && typeof win.PDXWordAction.briefHtml === "function",
    "PDXWordAction.briefHtml is no longer the brief renderer");
  must(win.PDXFormalIndex && typeof win.PDXFormalIndex.acts === "function",
    "PDXFormalIndex.acts is gone — the static index cannot be read");

  for (const pid of NAMED) {
    const acts = win.PDXFormalIndex.acts(pid);
    const h = brief(win, pid);
    ok(acts > 0, `${pid}: the shipped formal index counts ${acts} acts for them`);
    eq(win.PDXWordAction.formalKnown(pid), "deep", `${pid}: formalKnown() says deep`);
    hasnt(h, EMPTY, `${pid}: a cold mount does NOT print the empty-file letterhead`);
    has(h, "still loading", `${pid}: …it says the record is on file and still loading`);
    has(h, "Their formal record is on file",
      `${pid}: …naming the record as present, which is the fact the index already held`);
    // The proof that the stance ledger was the gate: these three have nothing
    // said on file at all, and that is precisely why the old copy fell through.
    const cov = win.PDXWordAction.read(pid, win.CMP_DATA[pid]).coverage;
    eq(cov.scorable, 0, `${pid}: carries no scorable stance — the identity-only class the defect lived in`);
    eq(cov.warming, false, `${pid}: …so nothing ever set warming for the old gate to unset`);
  }

  // The control, from the same wave and the same deploy. She has a stance ledger,
  // so she always got a wait; she must still get one.
  const les = brief(win, CHARACTERISED);
  hasnt(les, EMPTY, `${CHARACTERISED}: still not called empty`);
  ok(win.PDXWordAction.read(CHARACTERISED, win.CMP_DATA[CHARACTERISED]).coverage.scorable > 0,
    `${CHARACTERISED}: carries stated positions — the "different race" in the report`);

  // ── THE INVARIANT, not the list ────────────────────────────────────────────
  // Three named pids is a bug report. The rule is that the empty letterhead and a
  // counted formal record are mutually exclusive, for everybody, so it is checked
  // over the whole roster: no id the index counts an act for may be called empty,
  // and every id that IS called empty must have none.
  const pids = Object.keys(win.CMP_DATA);
  ok(pids.length > 700, `the roster booted (${pids.length} ids)`);
  const emptyWithRecord = [], recordedWithoutIndex = [];
  let withActs = 0, calledEmpty = 0;
  for (const pid of pids) {
    const acts = win.PDXFormalIndex.acts(pid);
    const isEmpty = brief(win, pid).includes(EMPTY);
    if (acts > 0) withActs++;
    if (isEmpty) calledEmpty++;
    if (acts > 0 && isEmpty) emptyWithRecord.push(pid);
    if (acts === 0 && !isEmpty && win.PDXWordAction.formalKnown(pid) === "deep") recordedWithoutIndex.push(pid);
  }
  ok(withActs > 100, `the shipped index counts acts for ${withActs} roster ids`);
  ok(calledEmpty > 0, `…and ${calledEmpty} ids are still told they have no formal pattern`);
  eq(emptyWithRecord, [], "no roster id with acts on the formal index is served the empty-file letterhead");
  eq(recordedWithoutIndex, [], "…and formalKnown() reports 'deep' only where the index actually has acts");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the first paint uses the rows the header already printed");
// ═════════════════════════════════════════════════════════════════════════════
// Requirement 2's middle tier, in isolation: no live payload, and the static index
// deliberately NOT loaded, so the crawl header is the only source of fact in the
// tab. If the seed path is broken this section is the one that catches it — every
// other section has the index to fall back on.
{
  const ROWS = [
    "Strongly supports · Parental Rights · 8 advanced · 2 against",
    "Strongly supports · Water · 7 advanced · 0 against",
    "Split record · Religious Liberty · 3 advanced · 1 against",
  ];
  const noIndex = ENGINE_FILES.filter((f) => f !== "formal-index.js");
  const win = boot({
    path: "/p/steven_lund",
    header: fakeHeader("steven_lund", ROWS),
    withPersonFile: true,
    files: noIndex,
  });
  must(win.PDXPerson && typeof win.PDXPerson.crawlRecord === "function",
    "person-file.js no longer publishes crawlRecord — the seed path has no reader");
  eq(win.PDXWordAction.formalKnown("steven_lund"), "",
    "with formal-index.js unloaded the static index reports nothing — '' is not 'empty'");

  const parsed = win.PDXPerson.crawlRecord("steven_lund");
  eq(parsed.length, 3, "the reader returns the header's three rows");
  eq(parsed.map((x) => x.pattern), ["Strongly supports", "Strongly supports", "Split record"],
    "…splitting the edge's first field as the pattern");
  eq(parsed.map((x) => x.label), ["Parental Rights", "Water", "Religious Liberty"],
    "…the second as the issue");
  eq(parsed[0].counts, "8 advanced · 2 against",
    "…and REJOINING the rest, because the counts phrase carries its own separator");
  eq(parsed[2].text, ROWS[2], "…while `text` is the line exactly as it was served");

  const h = brief(win, "steven_lund");
  // Issue labels are compared against the FLATTENED brief: an ampersand is
  // &amp; in the markup, and "Privacy & Big-Tech Accountability" is a real row.
  const ht = txt(h);
  hasnt(h, EMPTY, "the brief mounted from the header does NOT print the empty-file letterhead");
  has(h, "pdxwa-brief-seed", "…it is marked as the seed brief");
  has(h, "On the formal record", "…under a heading that claims presence, not a ranking");
  for (const row of parsed) {
    has(ht, row.label, `…printing ${JSON.stringify(row.label)}`);
    has(ht, row.pattern, `…with the pattern the header printed for it`);
  }
  // ORDER IS THE HEADER'S ORDER. The seed brief is a re-read of one document, and
  // reshuffling it would make it a second opinion.
  const at = parsed.map((x) => ht.indexOf(x.label));
  ok(at[0] < at[1] && at[1] < at[2], "…in the order the header printed them");

  // WHAT THE SEED BRIEF IS NOT ALLOWED TO DO. It has rows and no engine, so it
  // may repeat and it may not conclude: no tier chip (that markup is the pattern
  // engine's own claim), no "Strongest patterns" ranking, no total, and a
  // disclosure line saying where the rows came from and what replaces them.
  hasnt(h, "pdxst-pat", "the seed brief borrows none of the engine's pattern-chip markup");
  hasnt(h, "Strongest patterns", "…and makes no claim about which of them is strongest");
  hasnt(h, "issues on the formal record", "…and prints no total, because six is the edge's cap");
  has(h, "These rows came with the page itself", "…and it says where the rows came from");
  has(h, "replaces them the moment it lands", "…and what will replace them");

  // The header is hidden by then (crawlDone), and it still reads.
  eq(win.PDXPerson.crawlRecord("steven_lund").length, 3,
    "a hidden crawl block still reads — which is what lets a repaint keep the rows it showed");

  // The rows the edge really serves, for the three named pids, through the same
  // reader. Fixtures come from the committed snapshot, so this is the served line.
  for (const pid of NAMED) {
    const served = servedLines(pid);
    must(served.length, `db/share-index.json serves no record lines for ${pid}`);
    const w = boot({
      path: "/p/" + pid, header: fakeHeader(pid, served),
      withPersonFile: true, files: noIndex,
    });
    const rows = w.PDXPerson.crawlRecord(pid);
    eq(rows.length, Math.min(6, served.length), `${pid}: all ${rows.length} served lines parse`);
    const hh = brief(w, pid);
    hasnt(hh, EMPTY, `${pid}: the served rows alone keep the empty letterhead off the file`);
    has(hh, "pdxwa-brief-seed", `${pid}: …and produce the seed brief`);
    for (const r of rows) has(txt(hh), r.label, `${pid}: …printing ${JSON.stringify(r.label)}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2b · the live payload alone is enough");
// ═════════════════════════════════════════════════════════════════════════════
// Requirement 1(b), on its own: no crawl header and no static index, only the
// member payload the API answered with — the same rows the vote chip counts. A
// record on hand and no readable pattern in it is a MAPPING GAP, which is ours,
// and the copy has to say so rather than reporting it as an empty file.
{
  const noIndex = ENGINE_FILES.filter((f) => f !== "formal-index.js");
  const lane = buildUtahLane(ROOT);
  const win = boot({ files: noIndex });
  eq(win.PDXWordAction.formalKnown("steven_lund"), "", "the static index is not loaded here");
  eq(win.PDXPerson, undefined, "…and there is no crawl header to read either");

  // The payload, with every issue mapping stripped: 97 real roll-call rows that
  // the pattern engine cannot characterise a single one of.
  const unmapped = (lane.get("steven_lund") || []).map((x) => Object.assign({}, x, { issues: [] }));
  ok(unmapped.length > 90, `the payload is real (${unmapped.length} rows)`);
  win.PDXVotingRecord.noteMember("steven_lund", unmapped);
  eq(win.PDXVotingRecord.memberRecords("steven_lund").length, unmapped.length, "the rows are on hand");
  eq(win.PDXConsistency.formalPatternIndex.shape("steven_lund").read, 0,
    "…and the pattern engine could read none of them");
  ok(win.PDXConsistency.recordSettled("steven_lund"), "…and the record has settled, so this is not a wait");

  const h = brief(win, "steven_lund");
  hasnt(h, EMPTY, "a settled record with nothing mapped is NOT reported as an empty file");
  has(h, "Their roll-call record is on file", "…the copy says the record is there");
  has(h, "none of it is mapped yet", "…and that the mapping is what is missing");
  has(h, "That gap is ours", "…and whose gap that is");
  hasnt(h, "still loading", "…and it does not promise something that is not coming");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the rows name one person, and nobody may borrow them");
// ═════════════════════════════════════════════════════════════════════════════
// The seed path reaches into a node a CDN could have handed us from another
// reader's request. That is the /p/khanna-printing-Lee's-record defect, and the
// answer is not to widen the guard but to keep it: crawlRecord asks the same three
// questions crawlHeader asks, plus "does this block name the person I asked
// about". Every failure is silence — never a fallback to somebody else's rows.
{
  const ROWS = ["Strongly supports · Water · 7 advanced · 0 against"];
  const noIndex = ENGINE_FILES.filter((f) => f !== "formal-index.js");
  const cases = [
    ["a block stamped for another address",
      { path: "/p/steven_lund", header: fakeHeader("steven_lund", ROWS, { attrs: { "data-pdx-crawl-for": "/p/brett_garner" } }) }],
    ["a generic block, written for an address the edge held no record for",
      { path: "/p/steven_lund", header: fakeHeader("steven_lund", ROWS, { attrs: { "data-pdx-crawl-generic": "1" } }) }],
    ["a block carrying no pid at all",
      { path: "/p/steven_lund", header: fakeHeader("steven_lund", ROWS, { attrs: { "data-pid": null } }) }],
    ["no block at all",
      { path: "/p/steven_lund" }],
  ];
  for (const [label, o] of cases) {
    const w = boot(Object.assign({ withPersonFile: true, files: noIndex }, o));
    eq(w.PDXPerson.crawlRecord("steven_lund"), [], `${label}: no rows are read`);
    const h = brief(w, "steven_lund");
    hasnt(h, "pdxwa-brief-seed", `${label}: …and no seed brief is mounted`);
    hasnt(h, "Water", `${label}: …and nothing from it is printed`);
  }

  // A VALID block for one person cannot answer for another. Same node, same
  // address, a different question.
  const w = boot({
    path: "/p/steven_lund", header: fakeHeader("steven_lund", ROWS),
    withPersonFile: true, files: noIndex,
  });
  eq(w.PDXPerson.crawlRecord("steven_lund").length, 1, "the person the block names gets their row");
  eq(w.PDXPerson.crawlRecord("brett_garner"), [], "…and nobody else does");
  eq(w.PDXPerson.crawlRecord(""), [], "…and an empty id is not a wildcard");
  hasnt(brief(w, "brett_garner"), "Water", "the other member's brief prints none of it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · five real seconds of delayed fetch");
// ═════════════════════════════════════════════════════════════════════════════
// The sandbox the brief asked for: three rows in the crawl header, a member fetch
// that takes five seconds, a ninety-row payload. Real timers, a real
// PDXVotingRecord.fetchMember, and the brief sampled while the request is in
// flight. Five seconds is inside the 6s brief deadline on purpose — the "did not
// load" sentence is a different fact and must not appear here.
{
  const lane = buildUtahLane(ROOT);
  const items = (lane.get("steven_lund") || []).slice(0, 90);
  must(items.length === 90, `the Utah lane holds fewer than 90 items for steven_lund (${items.length})`);

  const ROWS = servedLines("steven_lund").slice(0, 3);
  must(ROWS.length === 3, "the snapshot serves fewer than three record lines for steven_lund");

  let fetchStarted = 0, fetchDone = 0;
  const DELAY = 5000;
  const win = boot({
    path: "/p/steven_lund",
    header: fakeHeader("steven_lund", ROWS),
    withPersonFile: true,
    realTimers: true,
    fetch: (url) => {
      fetchStarted++;
      return new Promise((res) => setTimeout(() => {
        fetchDone++;
        res({ ok: true, status: 200, json: () => Promise.resolve({ items: items, counts: { votes: items.length } }) });
      }, DELAY));
    },
  });

  // THE CALL SITE, QUOTED. voting-record.js's own profile path fetches, notes the
  // member, then dispatches the repaint event bindHero listens for. The sequence
  // is mirrored here rather than re-invented, and its source is asserted so this
  // sandbox cannot drift from the shipped one.
  const VR_SRC = R("voting-record.js");
  has(VR_SRC, "PDXVotingRecord.noteMember(job.id, _state.items)",
    "voting-record.js still notes the member from its own fetch");
  has(VR_SRC, "'pdx-voting-warm'", "…and still dispatches the repaint event this brief listens for");
  has(R("word-action.js"), "'pdx-voting-warm'", "…which word-action.js's hero binding still listens for");

  const t0 = Date.now();
  const inflight = win.PDXVotingRecord.fetchMember("steven_lund", { pageSize: 100 });
  eq(fetchStarted, 1, "exactly one /member/:id request went out");

  // THE FIRST MOUNTED BRIEF. This is the frame the report was about.
  const first = brief(win, "steven_lund");
  hasnt(first, EMPTY, "the FIRST mounted brief does not contain the empty-file letterhead");
  has(first, "pdxwa-brief-seed", "…it is the seed brief, built from the header's rows");
  for (const line of ROWS) {
    const issue = line.split(" · ")[1];
    has(txt(first), issue, `…printing ${JSON.stringify(issue)}, which the header had already shown`);
  }
  eq(win.PDXVotingRecord.memberRecords("steven_lund"), null,
    "…with no member payload on hand yet — the rows came from the document itself");

  // MID-FLIGHT REPAINTS. bindHero re-runs the brief on every warm event, and the
  // record has still not landed. It must not go backwards.
  const samples = [];
  for (const at of [1200, 3000, 4600]) {
    await new Promise((r) => setTimeout(r, at - (Date.now() - t0)));
    samples.push({ at: at, html: brief(win, "steven_lund") });
  }
  ok(fetchDone === 0, "the payload has still not landed at t=4.6s");
  for (const s of samples) {
    hasnt(s.html, EMPTY, `t=${s.at}ms: still no empty-file letterhead`);
    has(s.html, "pdxwa-brief-seed", `t=${s.at}ms: the rows the reader was already shown are still there`);
    hasnt(s.html, "did not load", `t=${s.at}ms: and no give-up sentence before the 6s deadline`);
  }

  const data = await inflight;
  ok(fetchDone === 1 && data && Array.isArray(data.items), "the payload landed");
  eq(data.items.length, 90, "…ninety rows of it");
  // The shipped sequence: note the member, then repaint.
  win.PDXVotingRecord.noteMember("steven_lund", data.items);
  try { win.dispatchEvent(new win.CustomEvent("pdx-voting-warm", { detail: { pid: "steven_lund" } })); } catch (e) {}

  const settled = brief(win, "steven_lund");
  eq(win.PDXVotingRecord.memberRecords("steven_lund").length, 90, "the record is on hand");
  ok(win.PDXConsistency.recordSettled("steven_lund"), "…and the engine calls it settled");
  hasnt(settled, EMPTY, "the settled brief does not print the empty-file letterhead either");
  hasnt(settled, "pdxwa-brief-seed", "…it is no longer the seed brief");
  hasnt(settled, "These rows came with the page itself", "…and the seed's disclosure line is gone");

  // AND IT IS THE ENGINE'S OWN BRIEF, row for row. The shape index is the source
  // of truth once it has one; the seed was only ever standing in for it.
  const sh = win.PDXConsistency.formalPatternIndex.shape("steven_lund");
  ok(sh.issues > 0 && sh.read > 0, `the pattern index read the payload (${sh.issues} issues, ${sh.read} read)`);
  has(settled, "issues on the formal record", "the settled brief prints the engine's own count line");
  has(settled, "Strongest patterns", "…and the engine's own ranking");
  const t = txt(settled);
  const orphans = [];
  for (const top of sh.tops) {
    if (!t.includes(top.label)) orphans.push(top.label);
  }
  eq(orphans, [], "every characterised pattern the engine holds is printed in the settled brief");
  ok(sh.tops.length > 0, `…and there were ${sh.tops.length} of them to print`);

  // NO SECOND REQUEST. Requirement 5: one /member/:id in flight, and the answer
  // that landed is not re-asked for.
  win.PDXVotingRecord.fetchMember("steven_lund", { pageSize: 100 });
  eq(fetchStarted, 1, "a second caller is served the same promise — still one request");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the empty file is still empty");
// ═════════════════════════════════════════════════════════════════════════════
// The sentence has to keep meaning something. It is reserved for ids that are
// empty after settle, and jknotts is the reviewed case: a former-member record
// from before the earliest session on file, whose name looks like a garbled John
// Knotwell. He gets the empty sentence and the reviewed reason — never a pattern
// borrowed from a wait that is not happening.
{
  const lane = buildUtahLane(ROOT);
  const win = boot({});
  for (const pid of NAMED.concat([CHARACTERISED, HONESTLY_EMPTY])) {
    win.PDXVotingRecord.noteMember(pid, lane.get(pid) || []);
  }

  const jk = brief(win, HONESTLY_EMPTY);
  eq(win.PDXFormalIndex.acts(HONESTLY_EMPTY), 0, `${HONESTLY_EMPTY}: the index counts no acts`);
  eq(win.PDXWordAction.formalKnown(HONESTLY_EMPTY), "empty", `${HONESTLY_EMPTY}: formalKnown() says empty, not absent`);
  ok(win.PDXConsistency.recordSettled(HONESTLY_EMPTY), `${HONESTLY_EMPTY}: the record settles`);
  has(jk, EMPTY, `${HONESTLY_EMPTY}: …and after settle he still gets the empty-file letterhead`);
  hasnt(jk, "still loading", `${HONESTLY_EMPTY}: …not a wait that is never going to end`);
  hasnt(jk, "pdxwa-brief-seed", `${HONESTLY_EMPTY}: …and no seed rows, because there are none`);
  const note = win.PDXFormalIndex.emptyNote(HONESTLY_EMPTY);
  ok(note && note.reason && note.note, `${HONESTLY_EMPTY}: the reviewed empty reason is on file (${note && note.reason})`);

  // The four with a record settle into the engine's brief, not into either
  // absence sentence. This is the "after settle, the brief is the engine's" half
  // of requirement 2, for every pid the report named plus the control.
  for (const pid of NAMED.concat([CHARACTERISED])) {
    const h = brief(win, pid);
    const sh = win.PDXConsistency.formalPatternIndex.shape(pid);
    ok(sh.issues > 0, `${pid}: the engine read ${sh.issues} issues of formal record`);
    hasnt(h, EMPTY, `${pid}: settles without the empty-file letterhead`);
    hasnt(h, "still loading", `${pid}: …and without a wait`);
    has(h, "Strongest patterns", `${pid}: …into a characterised brief`);
    const missing = sh.tops.filter((x) => !txt(h).includes(x.label)).map((x) => x.label);
    eq(missing, [], `${pid}: …printing every characterised pattern the engine holds`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · Direction Match and the floors did not move");
// ═════════════════════════════════════════════════════════════════════════════
// A twin boot: HEAD's word-action.js in one sandbox, the working copy in another,
// over the whole roster. read() carries the Direction Match figure, its floors,
// its coverage and its token, so byte-identical read() output for 800 members is
// the strongest available statement that this pass touched arithmetic nowhere.
// Then the documents themselves: the ONLY briefs allowed to differ are the ones
// that were wrong, and each must have moved OFF the empty sentence, never onto it.
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

    const readMoved = [], gained = [], movedNotEmpty = [], stillEmpty = [];
    let docsMoved = 0;
    for (const pid of pids) {
      const p = B.CMP_DATA[pid];
      let ra, rb;
      try { ra = JSON.stringify(A.PDXWordAction.read(pid, p)); } catch (e) { ra = "A-THREW"; }
      try { rb = JSON.stringify(B.PDXWordAction.read(pid, p)); } catch (e) { rb = "B-THREW"; }
      if (ra !== rb) readMoved.push(pid);

      const ha = brief(A, pid), hb = brief(B, pid);
      const wasEmpty = ha.includes(EMPTY), nowEmpty = hb.includes(EMPTY);
      if (nowEmpty && !wasEmpty) gained.push(pid);
      if (ha === hb) { if (nowEmpty) stillEmpty.push(pid); continue; }
      docsMoved++;
      // Every document that moved moved for one reason: it used to say the file
      // was empty and there was a record in the tab all along.
      if (!(wasEmpty && !nowEmpty)) movedNotEmpty.push(pid);
    }
    eq(readMoved, [],
      "read() — the Direction Match figure, its floors, its coverage and its token — is identical to HEAD for every roster member");
    eq(gained, [], "no member gained the empty-file letterhead in this pass");
    eq(movedNotEmpty, [],
      "every brief that changed changed in exactly one way: off the empty-file letterhead");
    // ── AND THE BASELINE HAS MOVED, WHICH IS THE POINT OF SAYING SO HERE ──────
    // When this section was written, HEAD was the deploy the report was filed
    // against: the three named pids really did print the empty-file letterhead in
    // a bare sandbox, and `docsMoved > 0` was the proof the pass had fixed them.
    // HEAD now CONTAINS that fix, so a bare boot — no crawl header, no payload —
    // is expected to be byte-identical for every member, and this pass's own
    // change is invisible from here: it is about what happens once a record LANDS,
    // which needs a payload in the tab (see scripts/test-seed-yields-to-record.mjs
    // for that half). So the claim is inverted rather than deleted: FIRST PAINT
    // DID NOT MOVE AT ALL.
    eq(docsMoved, 0,
      "no brief changed on a bare cold boot — this pass changes what happens when the " +
      "record arrives, not what the file says before it does");
    ok(stillEmpty.length > 0, `${stillEmpty.length} briefs still say the file is empty, unchanged`);
    // The report's own three, on both sides, still off the sentence.
    for (const pid of NAMED) {
      hasnt(brief(A, pid), EMPTY, `${pid}: HEAD already keeps the empty-file letterhead off them`);
      hasnt(brief(B, pid), EMPTY, `${pid}: …and so does this pass`);
      has(brief(B, pid), "Their formal record is on file",
        `${pid}: …naming the record the index already counts for them`);
    }
    ok(!brief(A, CHARACTERISED).includes(EMPTY) && !brief(B, CHARACTERISED).includes(EMPTY),
      `${CHARACTERISED}: was never called empty and still is not`);
    ok(brief(A, HONESTLY_EMPTY).includes(EMPTY) && brief(B, HONESTLY_EMPTY).includes(EMPTY),
      `${HONESTLY_EMPTY}: was honestly empty and still is`);
  }
}

console.log("");
if (failures.length) {
  console.error(`✗ person cold record: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ person cold record: a cold /p/<pid> never erases a formal record it already showed — ${passed} assertions passed\n`);
