#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-cold-arrival-paints-record.mjs — a cold /p/<pid> from the address bar
// paints the record without a hard refresh
// ─────────────────────────────────────────────────────────────────────────────
// THE REPORT. New tab, paste a shared link to /p/brett_garner. First paint:
// "No formal pattern on file yet" with a nav chip beside it reading VOTES 68
// RECORDS. Hard reload of the same tab: "37 issues · 72 acts · 12 characterised".
// The settled file was right; the first DOCUMENT LOAD was not, and a voter who
// follows a shared link should not have to reload to read the record.
//
// WHY THE FRAME AND NOT THE COPY. test-first-paint-loading-honesty.mjs already
// holds the sentence: briefAbsenceCopy may not print the empty letterhead while a
// member request is outstanding, and it asks that of briefHtml() directly. It
// passes — and the reported arrival still went wrong, because the arrival is not
// one call to briefHtml. It is a MOUNT and then a sequence of REPAINTS, and three
// things about it are different from calling the renderer in a loop:
//
//   1. THE HEADER IS READ AGAINST A MOVING ADDRESS. person-file.js's crawlHeader()
//      compared data-pdx-crawl-for with LIVE location.pathname — and open()
//      rewrites location.pathname (stamp → history.replaceState) to the CANONICAL
//      id the moment the modal opens, while the edge stamped the block at the id
//      that was ASKED for. On every aliased arrival the two strings agreed for
//      exactly as long as it took the modal to mount, and after that the header
//      sitting in the document with six formal rows in it read as no header at
//      all. That is the report's "the modal can mount before crawlRecord() sees
//      the header for this pid", and it is why the seed rows vanished from a paint
//      that had them a tick earlier.
//   2. THE SIGNALS ARE SPELLED THREE WAYS. The prefetch box is keyed by the
//      address's id, _liveRead by whatever fetchMember was handed, the brief by
//      whatever openModal resolved. A one-sided fold missed on exactly the
//      members whose record was hardest to find — and a missed match does not
//      degrade to a wait, it degrades to "nothing is coming", which is the door
//      the empty paragraph comes through.
//   3. THE CHIP AND THE LETTERHEAD WERE ON DIFFERENT SUBSCRIPTIONS. The rows land
//      through PDXVotingRecord.noteMember, which writes _records (what the pill
//      counts) and dispatches 'pdx-record-noted'. The hero and the explore tree
//      listen for it; the identity strip's record chips did not. So the chip could
//      go 0 → 68 in a frame where nothing rebuilt the surfaces beside it.
//
// WHAT THIS FILE HOLDS. A simulated rewrite arrival: the real edge header in the
// document, the real head prefetch box, the real PDXVotingRecord.fetchMember over
// a real two-second network, real timers, the real PDXWordAction.heroMount and the
// real bindHero subscription painting into a real host whose every write is
// recorded. Then:
//
//   1. THE MOUNT SUBSCRIPTIONS ARE ONE SET. Hero, explore tree, record chips and
//      the vote-highlight hydration all listen for the arrival itself.
//   2. THE PREFETCH IS FIRST-PARSE AND ROOT-ANCHORED. A /p/* rewrite may not
//      resolve one asset or one API call relative to /p/.
//   3. THE HEADER IS BOUND TO THE ARRIVAL, not to the bar — through the stamp and
//      through an alias.
//   4. THE ARRIVAL ITSELF, brett_garner, payload at t=2s: no frame from mount to
//      settle prints the empty letterhead, the chip and the letterhead never
//      disagree, and the settled frame is the engine's own brief.
//   5. THE SAME ARRIVAL WITH THE PREFETCH ALREADY RESOLVED before the modal
//      mounts — the hard-reload shape, which is the one that always worked.
//   6. ONE /member/:id PER ARRIVAL. The head's request is adopted, not repeated.
//   7. jknotts is empty first and last; lee loads and then goes deep.
//
//   node scripts/test-cold-arrival-paints-record.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
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
const must = (c, m) => { if (c) return; console.error(`✗ cold arrival paints record: STALE HARNESS — ${m}`); process.exit(2); };

// The sentence the report is about, and the two true things it was standing in
// front of.
const EMPTY = "No formal pattern on file yet";
const WAIT_BARE = "Still loading the roll-call record";
const WAIT_ONFILE = "Their formal record is on file and still loading";

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

const HTML = R("index.html");
const WA = R("word-action.js");
const PF = R("person-file.js");
const PROF = R("profiles-full.js");
const VRJS = R("voting-record.js");
const TREE = R("stance-tree.js");

const txt = (h) => String(h || "").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

// The rows the edge actually serves for a pid, read off the same snapshot
// share-preview.ts renders from, in the same " · " line format.
const SNAPSHOT = JSON.parse(R("db/share-index.json")).personRecord || {};
const servedLines = (pid) => (SNAPSHOT[pid] || [])
  .filter((x) => x && x.p && x.i)
  .map((x) => [x.p, x.i, x.c || ""].filter(Boolean).join(" · "));

// ── The edge's header node, as share-preview.ts writes it ────────────────────
// `forPath` is the address the block was GENERATED at (the verbatim arriving id)
// and `data-pid` is the canonical roster id the edge resolved it to. They differ
// on every aliased arrival, which is the whole point of §3.
function fakeHeader(pid, rows, forPath, name) {
  const attrs = { "data-pid": pid, "data-pdx-crawl-for": forPath || "/p/" + pid };
  const lis = rows.map((t) => ({ textContent: t }));
  const h1 = { textContent: name || "The Person This Block Names" };
  const line = { textContent: "State Representative · Utah" };
  return {
    id: "pdx-crawl-person",
    style: { display: "none" },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    hasAttribute: (k) => k in attrs,
    setAttribute() {}, removeAttribute() {},
    querySelector: (sel) => (sel === "h1" ? h1 : null),
    querySelectorAll: (sel) => {
      if (sel === "[data-pdx-crawl-record] li") return lis;
      if (sel === "p") return [line];
      return [];
    },
    innerHTML: "",
  };
}

// ── A document that arrives on /p/<pid> ──────────────────────────────────────
// makeSandbox's window is a stub with no event bus, no timers and no hosts —
// which is fine for a renderer read and useless for a mount. This gives it the
// three things a mount needs and nothing else: a real listener bus, real timers,
// and a querySelector that can find a host that has actually been mounted. Every
// write to a host's innerHTML is recorded, so "which frames did the reader see"
// is answered by the DOM rather than by re-calling the renderer.
function arrival(opts) {
  const o = opts || {};
  const win = makeSandbox();
  const path = o.path || "/p/" + o.pid;
  win.location.pathname = path;
  win.location.href = "https://www.politidex.fyi" + path;

  const bus = new Map();
  win.addEventListener = (t, h) => { if (!bus.has(t)) bus.set(t, []); bus.get(t).push(h); };
  win.removeEventListener = (t, h) => {
    const a = bus.get(t) || []; const i = a.indexOf(h); if (i >= 0) a.splice(i, 1);
  };
  const fired = [];
  win.dispatchEvent = (ev) => {
    fired.push(ev && ev.type);
    for (const h of (bus.get(ev && ev.type) || []).slice()) { try { h(ev); } catch (e) {} }
    return true;
  };
  win.__bus = bus;
  win.__fired = fired;

  const hosts = new Map();
  win.__hosts = hosts;
  win.document.querySelector = (sel) => {
    if (sel === "#pdx-crawl-person") return o.header || null;
    const m = /^\[([a-z0-9-]+)="([^"]+)"\]$/i.exec(String(sel || ""));
    if (m) return hosts.get(m[1] + "=" + m[2]) || null;
    return null;
  };
  win.document.getElementById = (id) => (id === "pdx-crawl-person" ? (o.header || null) : null);

  win.setTimeout = (fn, ms) => setTimeout(fn, ms);
  win.clearTimeout = (t) => clearTimeout(t);
  win.setInterval = () => 0;
  win.clearInterval = () => {};
  // THE BAR MOVES, because in a browser it does: stamp() calls replaceState the
  // moment the file opens, and everything that reads location.pathname after that
  // is reading a different string than the document was served for.
  win.history = {
    replaceState(_s, _t, url) {
      const u = String(url || "");
      win.location.pathname = u.split("?")[0].split("#")[0];
      win.location.href = "https://www.politidex.fyi" + u;
    },
  };
  win.URLSearchParams = URLSearchParams;
  win.AbortController = AbortController;
  // A request that never answers, rather than makeSandbox's rejection: a boot that
  // is not testing the network should neither log nor resolve one.
  win.fetch = o.fetch || (() => new Promise(() => {}));

  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of (o.files || ENGINE_FILES)) vm.runInContext(R(f), ctx, { filename: f });
  win.PROFILES = win.CMP_DATA;
  for (const f of ["profiles-full.js", "person-file.js", "stance-tree.js"]) {
    vm.runInContext(R(f), ctx, { filename: f });
  }
  return win;
}

// Mount a hero the way openModal mounts one: take heroMount's markup, put the
// inner half in a host node keyed by the uid it chose, and let bindHero find it.
// `frames` is every string the host has ever held, oldest first.
function mountHero(win, pid, p) {
  const html = win.PDXWordAction.heroMount(pid, p || win.CMP_DATA[pid], {});
  const m = /data-pdxwa-hero="([^"]+)"/.exec(html);
  must(m, `heroMount returned no host for ${pid}`);
  const inner = html.replace(/^\s*<div[^>]*>/, "").replace(/<\/div>\s*$/, "");
  const frames = [inner];
  let cur = inner;
  const host = {
    classList: { toggle() {} },
    get innerHTML() { return cur; },
    set innerHTML(v) { cur = String(v); frames.push(cur); },
  };
  win.__hosts.set('data-pdxwa-hero=' + m[1], host);
  return { host, frames, uid: m[1] };
}

// The nav pill's own number, asked the way injectNavPill asks it.
const chipN = (win, pid) => {
  try { return (win._pdxRecordMappedCounts(pid) || {}).total || 0; } catch (e) { return 0; }
};
// THE FAILING ASSERTION FROM THE REPORT, as a function: chip 68 and an empty
// letterhead in the same frame.
const disagrees = (win, pid, html) => chipN(win, pid) > 0 && String(html).includes(EMPTY);

// The head prefetch box, published exactly as index.html publishes it — same URL
// shape, same fields — so _adoptPrefetch's full-URL match is the real one.
function publishPrefetch(win, pid) {
  const url = "/api/voting-record/member/" + encodeURIComponent(pid) + "?pageSize=100";
  const box = { pid: pid, url: url, promise: null, session: false, abandon() {} };
  box.promise = win.fetch(url).then((r) => r.json());
  box.promise.catch(() => {});
  win.__pdxVRPrefetch = box;
  return box;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the mount subscriptions are one set");
// ═════════════════════════════════════════════════════════════════════════════
// 'pdx-record-noted' is dispatched by PDXVotingRecord.noteMember, and noteMember
// is the only writer of _records — the array the vote pill counts. So it is not
// one signal among four: it is THE moment the chip can change. Every surface that
// restates the record has to be on it, or the chip moves alone.
{
  const noted = "'pdx-record-noted'";
  const hr = (WA.match(/var HERO_REPAINT = \[[\s\S]*?\];/) || [])[0];
  must(hr, "word-action.js's HERO_REPAINT set is gone");
  has(hr, noted, "the hero repaints on the arrival itself");
  has(hr, "'pdx-voting-warm'", "…and still on the lane warming");
  has(hr, "'pdx-brief-timeout'", "…and still on its own deadline");

  const tr = (TREE.match(/var TREE_REPAINT = \[[\s\S]*?\];/) || [])[0];
  must(tr, "stance-tree.js's TREE_REPAINT set is gone");
  has(tr, noted, "the explore tree repaints on the arrival too — same tick, same event");

  const rc = (PROF.match(/const _bindRecChips = function \(uid\) \{[\s\S]*?\n    \};/) || [])[0];
  must(rc, "profiles-full.js's _bindRecChips is gone");
  has(rc, noted, "the identity strip's record chips are on the same event as the brief");
  has(rc, "detail.canon", "…and accept the canonical id the rows are filed under, not only the asked id");
  has(rc, "if (seen)", "…and do not unsubscribe before the host has ever existed");

  const vrhi = (PROF.match(/if \(!window\.__pdxVrhiBound\) \{[\s\S]*?\n  \}/) || [])[0];
  must(vrhi, "profiles-full.js's vote-highlight binding is gone");
  has(vrhi, "addEventListener('pdx-record-noted'", "the vote highlights settle on the arrival as well");

  // And the dispatch itself: one place, both ids on it.
  const nm = (VRJS.match(/noteMember: function[\s\S]*?\n  {2,4}\},/) || [])[0];
  must(nm, "voting-record.js's noteMember is gone");
  has(nm, "'pdx-record-noted'", "noteMember announces the arrival");
  has(nm, "canon:", "…carrying the canonical id");
  has(nm, "pid:", "…and the id the caller asked for");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the prefetch is first-parse, and nothing resolves relative to /p/");
// ═════════════════════════════════════════════════════════════════════════════
// /p/<pid> is a 200 rewrite to index.html: the document's own base is /p/<pid>,
// so ONE relative src in the shell would make a cold arrival fetch
// /p/voting-record.js and get the HTML shell back with a 200. The request has to
// start from the first HTML parse, at the same absolute URL the live client uses,
// or the "hard reload works" asymmetry in the report is structural.
{
  const head = HTML.slice(0, HTML.indexOf("</head>"));
  has(head, "window.__pdxVRPrefetch", "the prefetch box is published from the head, before any bundle runs");
  has(head, "'/api/voting-record/member/'", "…at the absolute member URL");
  ok(head.indexOf("window.__pdxVRPrefetch") < HTML.indexOf("<body"),
    "…and it is armed at first parse, not at DOMContentLoaded");
  has(head, "'?pageSize=100'", "…with the same query the live client sends");

  // The same URL string on both sides of the hand-over, or _adoptPrefetch's
  // full-URL match silently declines and a second request goes out.
  has(VRJS, "API_BASE = '/api/voting-record'", "voting-record.js's API base is root-anchored");
  has(VRJS, "_adoptPrefetch", "…and it adopts the head's box rather than re-asking");

  // Every asset the shell pulls, root-anchored. src="p/…" or src="./…" would
  // resolve under /p/ on an arrival and under / on the front page — which is
  // exactly a bug that only reproduces from the address bar.
  const rel = [];
  const re = /<(script|link)\b[^>]*\b(?:src|href)="([^"]+)"/gi;
  let m;
  while ((m = re.exec(HTML))) {
    const u = m[2];
    if (/^(https?:|data:|mailto:|#|\/|\{)/i.test(u)) continue;
    rel.push(m[1] + " " + u);
  }
  eq(rel, [], "no script or stylesheet in the shell is relative — a /p/ rewrite cannot re-root them");
  // Same question asked of the fetches the shell itself issues.
  const fetches = (HTML.match(/fetch\((['"])([^'"]+)\1/g) || []).map((s) => s.replace(/^fetch\(['"]/, "").replace(/['"]$/, ""));
  eq(fetches.filter((u) => !/^(https?:|\/)/.test(u)), [],
    "…and no relative fetch either");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the header is bound to the arrival, not to the bar");
// ═════════════════════════════════════════════════════════════════════════════
{
  const ch = (PF.match(/function crawlHeader\(\) \{[\s\S]*?\n  \}/) || [])[0];
  must(ch, "person-file.js's crawlHeader is gone");
  has(ch, "ARRIVAL", "crawlHeader reads the address this document was served for");
  has(PF, "var ARRIVAL = (function ()", "…captured once, at module evaluation");
  has(ch, "data-pdx-crawl-generic", "…and a block generated for another address is still refused");

  const ROWS = servedLines(GARNER).slice(0, 6);
  must(ROWS.length === 6, `the snapshot serves ${ROWS.length} lines for ${GARNER}, not six`);

  // THE STAMP. open() rewrites the bar the moment the modal opens; the rows must
  // survive it, because the letterhead is repainted several times after it.
  const w = arrival({ pid: GARNER, header: fakeHeader(GARNER, ROWS) });
  eq(w.PDXPerson.crawlRecord(GARNER).length, 6, "the six served rows parse on arrival");
  w.PDXPerson.stamp(GARNER);
  eq(w.location.pathname, "/p/" + GARNER, "the stamp put the canonical address in the bar");
  eq(w.PDXPerson.crawlRecord(GARNER).length, 6, "…and the rows are still there after it");
  w.history.replaceState(null, "", "/p/" + GARNER + "#record");
  eq(w.PDXPerson.crawlRecord(GARNER).length, 6, "…and after a section hash is stamped on");

  // THE ALIAS. /p/mike_lee is a real address: the edge stamps the block AT
  // /p/mike_lee and names `lee` in it. This is the arrival where the live-bar
  // comparison broke as soon as the modal opened.
  const ALIAS_PATH = "/p/mike_lee";
  const LROWS = servedLines(LEE).slice(0, 6);
  const wl = arrival({
    pid: LEE, path: ALIAS_PATH,
    header: fakeHeader(LEE, LROWS, ALIAS_PATH),
  });
  eq(wl.PDXPerson.arrivalPid(), "mike_lee", "the arrival id is the one the reader's URL carried");
  eq(wl.PDXPerson.crawlRecord("mike_lee").length, LROWS.length,
    "the rows read for the id in the address");
  eq(wl.PDXPerson.crawlRecord(LEE).length, LROWS.length,
    "…and for the canonical id the edge named");
  wl.PDXPerson.stamp(LEE);
  eq(wl.location.pathname, "/p/" + LEE, "the stamp moved the bar off the address the block was generated at");
  eq(wl.PDXPerson.crawlRecord(LEE).length, LROWS.length,
    "…and the rows are STILL read — this is the defect the report describes");
  ok(wl.PDXPerson.arrivalSkeleton(LEE).length > 0, "…and the skeleton still has its rows too");

  // AND NOBODY ELSE'S ROWS, EVER. The widening is one id: the address's own.
  eq(wl.PDXPerson.crawlRecord(GARNER), [], "a person the block does not name gets nothing");
  eq(wl.PDXPerson.crawlRecord(""), [], "…and an empty id is not a wildcard");
  const generic = fakeHeader(GARNER, ROWS);
  generic.getAttribute = (k) => (k === "data-pdx-crawl-for" ? "/p/somebody_else" : (k === "data-pid" ? GARNER : null));
  const wg = arrival({ pid: GARNER, header: generic });
  eq(wg.PDXPerson.crawlRecord(GARNER), [], "a block generated at another address is refused");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the arrival: brett_garner, payload at t=2s, real mount");
// ═════════════════════════════════════════════════════════════════════════════
// THE WHOLE ARRIVAL, DRIVEN BY THE SHIPPED CODE. The document is on
// /p/brett_garner with the edge's header in it and the head's prefetch box
// published; from there nothing in this section fetches, warms or notes anything
// by hand. person-file.js's own bootAdopt runs off its own timer, adopts the
// box inside fetchMember, and hands the rows to noteMember — exactly the sequence
// the reader gets — and the only thing this section does is mount a hero and read
// the host afterwards.
//
// (The modal itself is not opened: openModal is three thousand lines of renderer
// against a document this harness does not have. heroMount + a real host + the
// real bindHero subscription is the part of the mount this report is about, and
// it is the real code, not a re-implementation.)
{
  const lane = buildUtahLane(ROOT);
  const items = (lane.get(GARNER) || []).slice();
  must(items.length > 60, `the Utah lane holds only ${items.length} items for ${GARNER}`);
  const ROWS = servedLines(GARNER).slice(0, 6);
  must(ROWS.length === 6, `the snapshot serves ${ROWS.length} lines for ${GARNER}, not six`);

  let started = 0, landed = 0;
  const DELAY = 2000;
  const win = arrival({
    pid: GARNER,
    header: fakeHeader(GARNER, ROWS),
    fetch: () => {
      started++;
      return new Promise((res) => setTimeout(() => {
        landed++;
        res({ ok: true, status: 200, json: () => Promise.resolve({ items: items, counts: { votes: items.length } }) });
      }, DELAY));
    },
  });

  const t0 = Date.now();
  publishPrefetch(win, GARNER);
  eq(started, 1, "the head issued exactly one member request");

  // t=0: the modal mounts. This is the frame the report was filed about.
  const m = mountHero(win, GARNER);
  const first = m.frames[0];
  eq(win.PDXVotingRecord.memberRecords(GARNER), null, "nothing has been noted for him yet");
  hasnt(first, EMPTY, "the FIRST mounted frame does not call the file empty");
  ok(first.includes("pdxwa-brief-seed") || first.includes("still loading"),
    "…it is the header's own rows or the loading sentence — never nothing");
  ok(!disagrees(win, GARNER, first), "…and it does not disagree with the chip");
  eq(chipN(win, GARNER), 0, "the chip is counting nothing yet, which is what makes the wait the honest frame");

  // Every frame the reader is shown while the payload is in the air, read off the
  // HOST rather than by asking the renderer again — so a repaint that went
  // backwards is caught even if nothing would have asked.
  const marks = [];
  for (const at of [200, 700, 1200, 1800]) {
    await sleep(Math.max(0, at - (Date.now() - t0)));
    marks.push({ at, html: m.host.innerHTML, chip: chipN(win, GARNER) });
  }
  eq(landed, 0, "the payload has still not landed at t=1.8s");
  eq(started, 1, "…and the arrival machinery adopted the head's request rather than issuing a second");
  for (const s of marks) {
    hasnt(s.html, EMPTY, `t=${s.at}ms: the mounted brief still does not call the file empty`);
    hasnt(s.html, "did not load", `t=${s.at}ms: and no give-up sentence before the deadline`);
    ok(!disagrees(win, GARNER, s.html), `t=${s.at}ms: chip (${s.chip}) and letterhead agree`);
  }
  has(m.host.innerHTML, "pdxwa-brief-seed",
    "the rows the reader can already see behind the modal are what the brief is showing");

  // THE ARRIVAL. Nothing below dispatches anything: the payload lands, the shipped
  // warm hands it to noteMember, and the hero has to rebuild off that alone.
  const beforeLanding = m.frames.length;
  await sleep(Math.max(0, (DELAY + 400) - (Date.now() - t0)));
  eq(landed, 1, "the payload landed at t=2s");
  ok(win.__fired.includes("pdx-record-noted"), "the arrival announced itself");
  eq((win.PDXVotingRecord.memberRecords(GARNER) || []).length, items.length,
    "…and the rows are in memory, under his own id");
  ok(m.frames.length > beforeLanding,
    "the hero rebuilt from the arrival itself — no reload, no second member fetch, no user gesture");

  const settled = m.host.innerHTML;
  const chip = chipN(win, GARNER);
  ok(chip > 0, `the chip now counts ${chip} records`);
  hasnt(settled, EMPTY, "the settled letterhead does not call the file empty");
  hasnt(settled, "still loading", "…and is no longer a wait");
  hasnt(settled, "pdxwa-brief-seed", "…nor the seed, which has handed over to the engine");
  has(settled, "issues on the formal record", "…it is the engine's own census line");
  const sh = win.PDXConsistency.formalPatternIndex.shape(GARNER);
  ok(sh.issues > 0 && sh.read > 0, `the engine read the payload (${sh.issues} issues, ${sh.read} read)`);
  eq(sh.tops.filter((x) => !txt(settled).includes(x.label)).map((x) => x.label), [],
    "every characterised pattern the engine holds is printed");

  // THE WHOLE SEQUENCE, off the host: not one frame the reader could have seen.
  eq(m.frames.filter((h) => h.includes(EMPTY)).length, 0,
    `none of the ${m.frames.length} frames the host held called the file empty`);
  eq(m.frames.filter((h) => disagrees(win, GARNER, h)).length, 0,
    "…and no frame is an empty letterhead beside a counting chip");
  eq(started, 1, "ONE /member/:id for the whole arrival");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the same arrival with the prefetch already resolved");
// ═════════════════════════════════════════════════════════════════════════════
// The hard-reload shape from the report: the document already has the header AND
// a settled prefetch by the time the modal mounts. It is the shape that always
// painted correctly, and it has to keep doing so — including the part that is
// easy to lose, the rows being in memory BEFORE bindHero exists, which is what
// bindHero's one reconciling paint is for.
{
  const lane = buildUtahLane(ROOT);
  const items = (lane.get(STENQUIST) || []).slice();
  must(items.length > 20, `the Utah lane holds only ${items.length} items for ${STENQUIST}`);
  const ROWS = servedLines(STENQUIST).slice(0, 6);
  must(ROWS.length > 0, `the snapshot serves no lines for ${STENQUIST}`);

  let started = 0;
  const win = arrival({
    pid: STENQUIST,
    header: fakeHeader(STENQUIST, ROWS),
    fetch: () => {
      started++;
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ items: items }) });
    },
  });
  publishPrefetch(win, STENQUIST);
  // Let the shipped arrival settle before anything mounts.
  await sleep(120);
  eq(started, 1, "one request — the resolved box was adopted, not repeated");
  eq((win.PDXVotingRecord.memberRecords(STENQUIST) || []).length, items.length,
    "the rows are in memory before the modal mounts");
  ok(chipN(win, STENQUIST) > 0, "…and the chip is already counting");

  const m = mountHero(win, STENQUIST);
  hasnt(m.frames[0], EMPTY, "the first mounted frame is not the empty letterhead");
  hasnt(m.frames[0], "still loading", "…and not a wait for a record that is already here");
  has(m.frames[0], "issues on the formal record", "…it is the engine's own brief on the first frame");
  await sleep(40);
  eq(m.frames.filter((h) => h.includes(EMPTY)).length, 0, "no frame called the file empty");
  eq(m.frames.filter((h) => disagrees(win, STENQUIST, h)).length, 0, "no frame disagreed with the chip");
  eq(started, 1, "still one /member/:id");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · jknotts is empty first and last");
// ═════════════════════════════════════════════════════════════════════════════
// The reviewed empty file, and the limit on everything above. He has no header
// rows and his payload lands with nothing in it, so the letterhead is the true
// sentence on the first frame and on the last — and none of the widening in this
// pass may have bought him a wait that is never coming, or moved his file after
// it settled.
{
  let started = 0;
  const win = arrival({
    pid: JKNOTTS,
    header: fakeHeader(JKNOTTS, []),
    fetch: () => {
      started++;
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ items: [] }) });
    },
  });
  eq(win.PDXPerson.crawlRecord(JKNOTTS).length, 0, "the edge serves him no rows");
  eq(win.PDXWordAction.formalKnown(JKNOTTS), "empty", "…and the index holds a reviewed empty note");
  publishPrefetch(win, JKNOTTS);

  const m = mountHero(win, JKNOTTS);
  has(m.frames[0], EMPTY, "his FIRST mounted frame is the reviewed empty letterhead");
  hasnt(m.frames[0], "still loading", "…not a wait that will never end");
  hasnt(m.frames[0], "pdxwa-brief-seed", "…and no seed rows, because there are none");

  await sleep(150);
  eq((win.PDXVotingRecord.memberRecords(JKNOTTS) || []).length, 0, "his payload landed with nothing in it");
  eq(chipN(win, JKNOTTS), 0, "…the chip counts nothing…");
  has(m.host.innerHTML, EMPTY, "…and he still has the letterhead after settle");
  eq(m.frames.filter((h) => !h.includes(EMPTY)).length, 0,
    "every frame of his arrival said the same true thing");
  const note = win.PDXFormalIndex.emptyNote(JKNOTTS);
  ok(note && note.reason, `the reviewed reason is still on file (${note && note.reason})`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · lee loads, then goes deep");
// ═════════════════════════════════════════════════════════════════════════════
// The honest half of the report, through the mount rather than the renderer: a
// wait or his own rows while the record is in the air, the record afterwards, and
// never the empty letterhead at either end.
{
  const lane = buildUtahLane(ROOT);
  const items = (lane.get(LEE) || []).slice();
  const ROWS = servedLines(LEE).slice(0, 6);
  let started = 0, landed = 0;
  const win = arrival({
    pid: LEE,
    header: fakeHeader(LEE, ROWS),
    fetch: () => {
      started++;
      return new Promise((res) => setTimeout(() => {
        landed++;
        res({ ok: true, status: 200, json: () => Promise.resolve({ items: items }) });
      }, 800));
    },
  });
  publishPrefetch(win, LEE);

  const m = mountHero(win, LEE);
  const first = m.frames[0];
  hasnt(first, EMPTY, `${LEE}: the first mounted frame is not the empty letterhead`);
  ok(first.includes("pdxwa-brief-seed") || first.includes(WAIT_BARE) || first.includes(WAIT_ONFILE) ||
     first.includes("issues on the formal record"),
    `${LEE}: it is his rows, the wait, or the record — one of the three, never nothing`);

  await sleep(1200);
  eq(landed, 1, `${LEE}: his payload landed`);
  const settled = m.host.innerHTML;
  hasnt(settled, EMPTY, `${LEE}: settled, still not called empty`);
  ok(settled.includes("issues on the formal record") || settled.includes("pdxwa-shape"),
    `${LEE}: …and the settled frame is the record`);
  eq(m.frames.filter((h) => h.includes(EMPTY)).length, 0, `${LEE}: no frame called his file empty`);
  eq(m.frames.filter((h) => disagrees(win, LEE, h)).length, 0, `${LEE}: chip and letterhead never disagreed`);
  eq(started, 1, `${LEE}: one /member/:id`);
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ cold arrival paints record: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("   · " + f);
  process.exit(1);
}
console.log(`\n✓ cold arrival paints record: ${passed} assertions passed\n`);
