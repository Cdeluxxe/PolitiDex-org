#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-issue-record-ledger.mjs — the issue desk is a record ledger, not a ranking
// ─────────────────────────────────────────────────────────────────────────────
// Picking an issue used to produce an inventory: a list of people ordered by how
// many acts each has on file, captioned with two counts, saying nothing about what
// any of it DID. The one surface that did characterise the same rows — the Eye's
// issue answer — led with "ranked by consistency · who backs up their words
// first", which is the word-vs-action lane wearing the issue desk's clothes. A
// person with no stated position on an issue cannot be inconsistent about it, so
// that ordering sorted a formal record by whether we happen to hold a quote. And
// `lands_preserve` — a shipped key with a label, a chip and formal acts filed
// against it — was reachable from neither, because no bundle listed it.
//
// THE PARENT TABLE HAS SINCE CLOSED THAT GAP: every published ISSUE_MAP key now
// sits under exactly one of the thirteen cores, so `lands_preserve` is a child
// chip on Climate, Energy & Land and the desk prints a Core → Child crumb over
// its census. That moves where the key is REACHED FROM. It must not move what is
// READ: the assertions below are all about the ledger being this key's own record,
// by exact key, and every one of them still holds with a parent overhead.
//
// What this file pins:
//
//   1. THE KEY OPENS AS ITSELF, AND THE READ IS FOR THAT KEY. Selecting
//      `lands_preserve` asks the ledger for `lands_preserve` — not for a bundle
//      that happens to carry the word "land" — and paints people, not the floor's
//      no-vehicle sentence.
//   2. ONE CHARACTERISATION, NOT TWO. Every band, every chip and every tally on
//      the pane is the formal-pattern index's own published row for that person on
//      that key. Nothing on this surface re-reads the record, and the bands are a
//      partition: the five counts sum to the census.
//   3. THE ORDER IS THE PATTERN, NOT THE CONSISTENCY RANKING. Bands print in the
//      index's own fixed order; inside a band it is acts judged, then acts held,
//      then name; and the sequence is provably not buildRanking's.
//   4. THE RESOLVER. "land preserve", "lands preserve", "lands_preserve" and
//      "Protect Public Lands" all land on the same key. An unknown key resolves to
//      nothing rather than to the nearest bundle.
//   5. THE EYE LEADS WITH THE RECORD. On a query that resolves to a tracked key,
//      the formal-record block is the first block, the consistency heading does not
//      run at all, and the person hits stay below. A whole bundle is not a key: it
//      keeps its ranked answer and says "desk", not "ledger".
//   6. NO SECOND LANE IN THE NEW COPY. No percentage, no score, no grade, no
//      caucus token; the wall under the bands is the formal lane's own literal.
//   7. TWIN BOOT, BOTH WAYS. With this pane loaded and without it, every formal
//      brief and every Direction Match read is byte-identical — and painting the
//      ledger does not perturb the briefs of the people it printed.
//   8. THE ASSETS TRAVEL TOGETHER. The four files this pass moved are precached
//      behind a CACHE_VERSION that moved with them.
//
//   node scripts/test-issue-record-ledger.mjs
//
// Real shipped modules in a node:vm sandbox, the real roster, the real issue
// ledger, the real measure index and the real record corpus, plus a mini-DOM.
// Every claim about painted markup below is about markup this harness painted.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// Load order, as index.html defers them. Everything the ledger reads a fact from
// is here: an assertion made against an unloaded module is an assertion about
// this file's own fallback copy.
const FILES = [
  "cmp-data.js",
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  "stance-helpers.js",
  "alignment-tool.js",
  "pdx-issue-family.js",
  "acct-spotlight-data.js",
  "say-vs-do.js",
  "exec-action-data.js",
  "exec-record.js",
  "exec-record-ui.js",
  "consistency.js",
  "voting-record.js",
  "inventory.js",
  "issue-scope.js",
  "word-action.js",
  "profile-spine.js",
  "issue-colors.js",
  "my-stances.js",
  "person-link.js",
  "bills-index.js",
  "bills.js",
  "bill-detail.js",
  "claim-check.js",
  "issue-view.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
const DESK = R("door1-workspace.js");
const EYE = R("all-seeing-eye.js");
const CSS = R("door1-workspace.css");
const HTML = R("index.html");
const SW = R("sw.js");

// The key the smoke names, and the two Utah rows that have a formal row on it.
const KEY = "lands_preserve";
const ALIASES = ["land preserve", "lands preserve", "lands_preserve", "Protect Public Lands"];

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const no = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
// The modules' own escaping, so a core label with an ampersand in it (Climate,
// Energy & Land) is matched against the markup rather than asserted around.
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// A probe that finds nothing fails loudly, rather than turning this file into a
// very fast, very green no-op.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ issue record ledger: STALE PROBE — ${msg}`);
  process.exit(2);
};

const corpus = buildCorpus(ROOT);
must(corpus && corpus.byMember && corpus.byMember.size > 100,
  "the record corpus did not load enough members to sweep");

// ── A mini-DOM ───────────────────────────────────────────────────────────────
// querySelectorAll returns nothing here on purpose: this file asserts against
// painted HTML strings, which is what a reader actually receives.
const SURFACES = ["hero-receipt", "say-vs-do", "issue-front-door", "hr1-showcase"];
const EYE_IDS = ["pdx-eye-input", "pdx-eye-panel", "pdx-eye", "pdx-eye-clear"];

function miniDom(win) {
  const byId = {};
  const mk = (id) => {
    const node = {
      id: id || "", className: "", innerHTML: "", textContent: "", value: "",
      style: {}, dataset: {}, children: [], hidden: false, attrs: {},
      firstChild: null,
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { this.children.push(c); c.parentNode = this; if (c && c.id) byId[c.id] = c; return c; },
      insertBefore(c) { this.children.unshift(c); c.parentNode = this; if (c && c.id) byId[c.id] = c; return c; },
      removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, click() {},
      scrollIntoView() {}, querySelector() { return null; }, querySelectorAll() { return []; },
    };
    if (id) byId[id] = node;
    return node;
  };
  win.document.createElement = () => mk("");
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = mk("body");
  win.document.body.appendChild = function (c) { if (c && c.id) byId[c.id] = c; return c; };
  SURFACES.forEach(mk);
  EYE_IDS.forEach(mk);
  mk("pdx-door1-workspace");
  mk("pdx-d1-body");
  win.__mk = mk;
  return byId;
}

// ── THE ONE THING THIS HARNESS STANDS IN FOR ─────────────────────────────────
// /api/voting-record is not reachable from a test, and two different shipped
// reads go through it. Both are stubbed from the SAME corpus, so the seam this
// pass had to close is reproduced rather than papered over:
//
//   · fetchIssueRecords(keys) is how the issue lane DISCOVERS a field. It returns
//     one issue's slice and deliberately never warms PDXVotingRecord._records,
//     because an issue slice must not be mistaken for a whole record.
//   · fetchCompare(pids) is how the ledger then warms those people's FULL records,
//     which is what the formal-pattern index reads. Here the corpus is already
//     seeded through noteMember, so this resolves empty and the rows are warm from
//     the start — the ordering of the two reads is what section 1 checks.
//
// Every key asked for is recorded, because "did selecting this key ask for THIS
// key" is one of the things that was broken.
function stubReads(win) {
  win.__askedIssue = [];
  win.__askedCompare = [];
  win.PDXVotingRecord.fetchIssueRecords = function (keys) {
    const ks = (keys || []).slice();
    win.__askedIssue.push(ks.join(","));
    const byPid = {};
    for (const [pid] of corpus.byMember) {
      let items = [];
      for (const k of ks) {
        let part = [];
        try { part = win._pdxRecordIssueItems(pid, k) || []; } catch { part = []; }
        items = items.concat(part);
      }
      if (items.length) byPid[pid] = items;
    }
    return Promise.resolve({ byPid, truncated: false });
  };
  win.PDXVotingRecord.fetchCompare = function (pids) {
    win.__askedCompare.push((pids || []).join(","));
    return Promise.resolve({ byPid: {} });
  };
}

function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const sess = opts.session || {};
  win.sessionStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(sess, k) ? sess[k] : null),
    setItem: (k, v) => { sess[k] = String(v); },
    removeItem: (k) => { delete sess[k]; },
  };
  win.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  win.auth = { currentUser: null };
  win.addEventListener = () => {};
  const byId = miniDom(win);
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  win.__loadErrors = [];
  for (const [f, src] of SRC) {
    try { vm.runInContext(src, ctx, { filename: f }); }
    catch (e) { win.__loadErrors.push(`${f}: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
  // The record corpus, seeded the way a completed /api/voting-record read leaves
  // it, so every count this pane prints is a count over real rows.
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  stubReads(win);
  win.__routed = [];
  win.pdxDoorWork = (id) => { win.__routed.push("work:" + id); return true; };
  win.pdxDoor = (mode) => { win.__routed.push("door:" + mode); return true; };
  if (!opts.withoutDesk) vm.runInContext(DESK, ctx, { filename: "door1-workspace.js" });
  if (opts.withEye) {
    win._issueLabel = (k) => (win.ISSUE_MAP[k] && win.ISSUE_MAP[k].label) || "";
    vm.runInContext(EYE, ctx, { filename: "all-seeing-eye.js" });
  }
  win.__ctx = ctx;
  win.__byId = byId;
  return win;
}

const paint = (w) => {
  w.PDXDoor1.sync();
  const h = w.document.getElementById("pdx-d1-body");
  return h ? String(h.innerHTML) : "";
};
const tick = () => new Promise((r) => setTimeout(r, 0));

// The field the issue lane discovers is warmed asynchronously; opening a key and
// then letting the microtask queue drain is exactly the sequence a reader causes.
async function openKey(w, key) {
  w.pdxDoor1Open("issue");
  w.pdxDoor1Issue(key);
  await tick(); await tick();
  w.pdxDoor1Issue(key);
  return paint(w);
}

const probe = boot({ withEye: true });
must(probe.PDXDoor1 && typeof probe.PDXDoor1.sync === "function",
  `the desk did not export sync() — boot errors: ${probe.__loadErrors.join(" | ")}`);
must(typeof probe.PDXDoor1.issueKeyFor === "function", "PDXDoor1.issueKeyFor is not published");
must(typeof probe.PDXDoor1._ledger === "function", "PDXDoor1._ledger is not published");
must(probe.PDXEye && typeof probe.PDXEye.render === "function", "the Eye did not publish render()");
const FPI = probe.PDXConsistency && probe.PDXConsistency.formalPatternIndex;
must(FPI && typeof FPI.rowFor === "function" && typeof FPI.band === "function" &&
     Array.isArray(FPI.LEDGER_BANDS),
  "the formal-pattern index does not publish rowFor / band / LEDGER_BANDS, so this pane would be\n" +
  "    reading a characterisation of its own");
must(probe.ISSUE_MAP && probe.ISSUE_MAP[KEY], `${KEY} is no longer a shipped ISSUE_MAP key`);
// The key's parent, read off the shipped table rather than named here, because a
// literal copied into a test is a second taxonomy in miniature.
const PARENT = (probe.CORE_NATIONAL_ISSUES || [])
  .filter((c) => c && (c.keys || []).indexOf(KEY) >= 0)[0] || null;
must(!!PARENT,
  `${KEY} is in none of the thirteen bundles — every published key is supposed to have exactly ` +
  `one parent, so this is an orphan (see scripts/test-issue-family.mjs)`);
must(PARENT.key !== KEY, `${KEY} is a core, not a child — this file reads a child's ledger`);
must(corpus.byMember.has("lee") && corpus.byMember.has("curtis"),
  "the corpus no longer carries lee and curtis");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · The key opens as itself, and the read is for that key");

const LEDGER = await (async () => {
  const w = boot();
  const html = await openKey(w, KEY);
  return { w, html };
})();

{
  const { w, html } = LEDGER;
  // The read that was wrong: a key in no bundle used to warm nothing, and the
  // desk then printed the record lane's own empty over a record that exists.
  const asked = w.__askedIssue.join(" | ");
  has(asked, KEY, `selecting ${KEY} never asked the ledger for ${KEY} (asked: ${asked || "nothing"})`);
  ok(w.__askedIssue.some((a) => a.split(",").indexOf(KEY) >= 0),
    `${KEY} was never asked for as a key of its own`);
  // …and the pane is the ledger, not the floor's empty sentence.
  const EMPTY = w.PDXConsistency.menu.PHRASES.no_vehicle.note;
  no(html, EMPTY, `${KEY} printed the no-vehicle sentence over a record that has rows on file`);
  has(html, "d1-led-census", "the ledger printed no census");
  has(html, "d1-led-band", "the ledger printed no bands");
  // The desk says out loud WHERE this key sits — one family, named — and it says
  // it about the key rather than about the family: the scope line and the crumb
  // both print the child's own label, and neither promises a bundle reading.
  has(html, `inside ${esc(PARENT.label)}`,
    `the desk did not place ${KEY} under its parent core`);
  has(html, `Scoped to <b>${esc(w.ISSUE_MAP[KEY].label)}</b>`,
    "the desk did not scope the pane to this key alone");
  has(html, "not the whole bundle", "the desk did not say the read is the key, not its family");
  no(html, "not inside any of the tracked issues above",
    `${KEY} has a parent now and the desk still calls it unparented`);
  // THE CRUMB, under the census: Core label → Child label.
  const CRUMB = `${PARENT.label} → ${w.ISSUE_MAP[KEY].label}`;
  has(html, "d1-led-crumb", "the census printed no Core → Child crumb");
  const crumbBlock = html.slice(html.indexOf("d1-led-crumb"));
  for (const bit of [esc(PARENT.label), "→", esc(w.ISSUE_MAP[KEY].label)]) {
    has(crumbBlock.slice(0, crumbBlock.indexOf("</p>")), bit,
      `the crumb is missing "${bit}" (wanted ${CRUMB})`);
  }

  const led = w.PDXDoor1._ledger(null, KEY);
  must(led && led.people > 20,
    `the ledger found ${led ? led.people : 0} people on ${KEY} — too few for the bands below to mean anything`);
  // Counts, named. Nothing on this pane is a share of anything.
  has(html, `<b>${led.people}</b> people`, "the census does not lead with the number of people");
  has(html, `${led.by.advanced} advanced`, "the census does not name the advanced count");
  has(html, `${led.by.against} cut against`, "the census does not name the opposed count");
  has(html, `${led.by.both} ran both ways`, "the census does not name the split count");
  console.log(`      ${KEY}: ${led.people} readable rows · ` +
    Object.keys(led.by).map((k) => `${k} ${led.by[k]}`).join(" · ") +
    ` · ${led.measures.length} measures`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · One characterisation, not two");

{
  const { w, html } = LEDGER;
  const led = w.PDXDoor1._ledger(null, KEY);
  const F = w.PDXConsistency.formalPatternIndex;

  // EVERY row's band, chip and tally re-derived from the index's own published
  // row. If this pane ever computes a tier itself, this loop is where it shows.
  const bad = [];
  const seen = Object.create(null);
  let rows = 0;
  for (const band of led.bands) {
    for (const r of band.rows) {
      rows++;
      if (seen[r.pid]) bad.push(`${r.pid}: in two bands (${seen[r.pid]} and ${band.id})`);
      seen[r.pid] = band.id;
      const x = F.rowFor(r.pid, KEY);
      if (!x) { bad.push(`${r.pid}: printed a row the index does not publish`); continue; }
      if (F.band(x) !== band.id) bad.push(`${r.pid}: banded ${band.id}, index says ${F.band(x)}`);
      if (r.label !== (x.patLabel || "")) bad.push(`${r.pid}: chip "${r.label}" is not the index's "${x.patLabel}"`);
      if (r.tone !== (x.tone || "muted")) bad.push(`${r.pid}: tone ${r.tone} is not the index's ${x.tone}`);
      // The tally is the index's own counts (or the split brief's sideCounts),
      // plus the no-side count. No arithmetic of this pane's own.
      let n = (x.counts || (x.pat && x.pat.sideCounts) || "");
      if (x.noSideCount) n += (n ? " · " : "") + x.noSideCount;
      if (r.tally !== n) bad.push(`${r.pid}: tally "${r.tally}" is not the index's "${n}"`);
    }
  }
  eq(bad.slice(0, 6).join(" | "), "", `${bad.length} row(s) disagree with the formal-pattern index`);
  must(rows > 20, `only ${rows} rows were checked against the index`);

  // The bands are a PARTITION. Package-borne rows are a disclosure that cuts
  // across them, never a sixth band and never a demotion, so the five sum to N.
  const sum = Object.keys(led.by).reduce((a, k) => a + led.by[k], 0);
  eq(sum, led.people, "the five bands do not sum to the census — a row was dropped or double-counted");
  eq(rows, led.people, "the bands hold a different number of rows than the census claims");
  ok(led.pkg <= led.people, "more package-only rows than rows");

  // The same read, reached the way the PERSON file reaches it: the index's row
  // for that person on that key, taken out of the whole-file list. Two surfaces,
  // one characterisation — this is the assertion that "no second reading" rests on.
  const drift = [];
  for (const band of led.bands) {
    for (const r of band.rows) {
      const mine = (F.rows(r.pid) || []).filter((q) => q && q.key === KEY)[0] || null;
      if (!mine) continue;               // the person file folds its own tail; the key may not be listed
      if (F.band(mine) !== band.id) drift.push(`${r.pid}: person file ${F.band(mine)}, ledger ${band.id}`);
      if ((mine.patLabel || "") !== r.label) drift.push(`${r.pid}: person file "${mine.patLabel}", ledger "${r.label}"`);
    }
  }
  eq(drift.slice(0, 6).join(" | "), "",
    `${drift.length} person(s) are characterised differently on the issue desk than on their own file`);

  // The named rows the smoke asks for, pinned to the index rather than to a
  // literal this file made up.
  for (const pid of ["lee", "curtis", "maloy"]) {
    const x = F.rowFor(pid, KEY);
    if (!x) { console.log(`      ${pid}: no formal row on ${KEY} in this corpus`); continue; }
    const band = F.band(x);
    has(html, `id="d1-led-${pid}-${KEY}"`, `${pid} has an index row on ${KEY} and the ledger did not print it`);
    const row = html.slice(html.indexOf(`id="d1-led-${pid}-${KEY}"`));
    has(row.slice(0, 900), x.patLabel, `${pid}'s printed chip is not the index's own label`);
    has(html.slice(0, html.indexOf(`id="d1-led-${pid}-${KEY}"`)), `is-${band}`,
      `${pid} is printed outside the ${band} band it belongs to`);
    console.log(`      ${pid}: ${band} · ${x.patLabel} (${x.counts || (x.pat && x.pat.sideCounts) || "—"})`);
  }

  // Thin stays thin, split stays split: neither is promoted into a pattern band.
  for (const band of led.bands) {
    for (const r of band.rows) {
      const x = F.rowFor(r.pid, KEY);
      if (!x) continue;
      if (x.tier === "thin") eq(band.id, "thin", `${r.pid}: a thin read was filed as ${band.id}`);
      if (x.tier === "split") eq(band.id, "both", `${r.pid}: a split read was filed as ${band.id}`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · The order is the pattern, not the consistency ranking");

{
  const { w, html } = LEDGER;
  const led = w.PDXDoor1._ledger(null, KEY);
  const F = w.PDXConsistency.formalPatternIndex;

  // Band order is the index's own fixed order, read off the markup.
  const at = (s) => html.indexOf(s);
  const order = F.LEDGER_BANDS.filter((b) => led.by[b.id] > 0).map((b) => b.id);
  must(order.length >= 3, `only ${order.length} bands have rows, so their order proves little`);
  for (let i = 1; i < order.length; i++) {
    ok(at(`is-${order[i - 1]}`) >= 0 && at(`is-${order[i - 1]}`) < at(`is-${order[i]}`),
      `band ${order[i]} printed before ${order[i - 1]} — the partition's order is fixed`);
  }
  // The two tail bands print under one folded heading, and only once it is long.
  if (led.tail >= (F.TAIL_MIN || 4)) {
    has(html, "d1-led-tail", "a long tail did not fold");
    ok(at("d1-led-tail") > at("is-both") || led.by.both === 0,
      "the tail folded above a pattern band");
  }

  // Inside a band: acts judged, then acts held, then name. Never a reading.
  const misordered = [];
  for (const band of led.bands) {
    for (let i = 1; i < band.rows.length; i++) {
      const a = band.rows[i - 1], b = band.rows[i];
      const okPair = a.judged > b.judged ||
        (a.judged === b.judged && a.held > b.held) ||
        (a.judged === b.judged && a.held === b.held && String(a.name).localeCompare(String(b.name)) <= 0);
      if (!okPair) misordered.push(`${band.id}: ${a.name} before ${b.name}`);
    }
  }
  eq(misordered.slice(0, 5).join(" | "), "", `${misordered.length} pair(s) are out of the band's own order`);

  // …and it is provably NOT the ranking. buildRanking orders by consistency —
  // word against action — which is the ordering this pass exists to stop leading
  // an issue. If the ledger's sequence ever becomes that sequence, the pane has
  // quietly inherited it.
  const ranked = (w.PDXIssueView.buildRanking({ key: KEY, keys: [KEY], label: KEY }, KEY) || [])
    .map((r) => r && r.id).filter(Boolean);
  must(ranked.length > 10, `buildRanking returned ${ranked.length} rows, so this comparison is vacuous`);
  const printed = [];
  for (const band of led.bands) for (const r of band.rows) printed.push(r.pid);
  const shared = printed.filter((p) => ranked.indexOf(p) >= 0);
  must(shared.length > 10, "the two orderings barely overlap, so comparing them proves nothing");
  ok(shared.join(",") !== ranked.filter((p) => shared.indexOf(p) >= 0).join(","),
    "the ledger's sequence IS buildRanking's sequence — the consistency ordering came back in");

  // And the ordering is named on the surface, so a reader is not left to guess.
  has(html, "clearest pattern first", "the pane does not say what its order is");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · The resolver: one key, several ways of typing it");

{
  const D = probe.PDXDoor1;
  for (const q of ALIASES) {
    eq(D.issueKeyFor(q), KEY, `"${q}" did not resolve to ${KEY}`);
  }
  // A key ISSUE_MAP does not carry is not an issue, and is not folded into the
  // nearest bundle to make an answer.
  must(!probe.ISSUE_MAP["not_an_issue_key_at_all"], "probe: the fake key is somehow real");
  eq(D.issueKeyFor("not_an_issue_key_at_all"), "", "an unknown key resolved to something");
  eq(D.issueKeyFor(""), "", "an empty query resolved to a key");
  eq(D.issueKeyFor("zzzz no such issue anywhere"), "", "a nonsense query resolved to a key");
  // The typeahead is a real control over the whole register, not the thirteen.
  const tracked = D.trackedKeys();
  ok(tracked.length > 50, `only ${tracked.length} tracked keys are openable by name`);
  ok(tracked.indexOf(KEY) >= 0, `${KEY} is not in the openable register`);
  const shelf = probe.CORE_NATIONAL_ISSUES.length;
  eq(shelf, 13, "the shelf is no longer the curated thirteen");
  // Every core bundle's own name still opens it — the shelf did not stop working.
  for (const c of probe.CORE_NATIONAL_ISSUES) {
    eq(D.issueKeyFor(c.key), c.key, `the shelf key ${c.key} stopped resolving`);
  }
  // The submit path: a hit opens, a miss is refused and recorded rather than
  // being rounded to the nearest bundle.
  const w = boot();
  eq(w.PDXDoor1._seek("land preserve"), false, "the typeahead's submit did not swallow the form event");
  has(paint(w), "d1-led-census", "opening by name did not open the ledger");
  const m = boot();
  m.pdxDoor1Open("issue");
  m.PDXDoor1._seek("zzzz no such issue anywhere");
  const mh = paint(m);
  has(mh, "d1-seek-miss", "a miss was not said out loud");
  no(mh, "d1-led-census", "a miss opened somebody else's ledger");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · The Eye leads with the record, and the ranking does not run");

{
  const w = boot({ withEye: true });
  const panel = () => String(w.document.getElementById("pdx-eye-panel").innerHTML || "");
  for (const q of ["land preserve", KEY]) {
    w.PDXEye.render(q);
    const h = panel();
    const iKey = h.indexOf('class="pdx-eye-ans pdx-eye-key"');
    ok(iKey >= 0, `"${q}": the Eye printed no formal-record block`);
    has(h, `data-eye-key="${KEY}"`, `"${q}": the block is not about ${KEY}`);
    has(h, `data-eye-key-go="${KEY}"`, `"${q}": there is no door into the ledger`);
    has(h, "Open the record ledger", `"${q}": the door does not say what it opens`);
    // FIRST. Not merely present — a person hit that leads is the reported bug.
    const iPol = h.indexOf('data-kind="pol"');
    const iCat = h.indexOf('class="pdx-eye-cat"');
    ok(iPol < 0 || iKey < iPol, `"${q}": a person hit printed above the issue's record block`);
    ok(iCat < 0 || iKey < iCat, `"${q}": a result category printed above the issue's record block`);
    // The banned heading. Withheld, not relabelled: the whole ranked answer block
    // does not run on this path.
    no(h, "backs up their words", `"${q}": the consistency heading ran on an issue-key query`);
    no(h, "Ranked by consistency", `"${q}": the consistency heading ran on an issue-key query`);
    no(h, 'data-ans="1"', `"${q}": the ranked issue answer block ran on an issue-key query`);
    no(h, "%", `"${q}": a percentage reached the Eye's issue block`);
    // The lens tells the truth about where the key sits: one named family, and
    // not a claim that the family itself has been read.
    has(h, `inside ${esc(PARENT.label)}`, `"${q}": the lens does not place the key honestly`);
    no(h, "in none of the thirteen bundles",
      `"${q}": the lens still calls a parented key unparented`);
  }
  // A person whose NAME merely contains the word is still a result — just not the
  // answer to a question about public lands.
  w.PDXEye.render("Landsman");
  const nh = panel();
  ok(nh.indexOf('class="pdx-eye-ans pdx-eye-key"') === -1,
    "a person name resolved to an issue key");
  has(nh, 'data-kind="pol"', "the person hit stopped working");

  // A WHOLE BUNDLE IS NOT A KEY. It keeps the ranked answer it has always had —
  // there is no single record to read for thirteen keys at once — and its door
  // says desk, not ledger.
  // Queried the way a reader types a bundle — a word, not a slug — because the
  // ranked answer this branch must KEEP is parsed from plain language.
  const CORE_WORD = "guns";
  must(probe.CORE_NATIONAL_ISSUES.some((c) => c && c.key === CORE_WORD),
    `${CORE_WORD} is no longer one of the thirteen, so this branch is testing nothing`);
  eq(probe.PDXDoor1.issueKeyFor(CORE_WORD), CORE_WORD, `${CORE_WORD} stopped resolving to itself`);
  const bare = boot({ withEye: true });
  bare.PDXEye.render(CORE_WORD);
  const ansAlone = String(bare.document.getElementById("pdx-eye-panel").innerHTML || "");
  must(ansAlone.indexOf('data-ans="1"') >= 0,
    `the Eye has no ranked answer for "${CORE_WORD}" at all, so this branch cannot show it was kept`);
  w.PDXEye.render(CORE_WORD);
  const bh = panel();
  has(bh, `data-eye-key="${CORE_WORD}"`, "a bundle query printed no record door");
  has(bh, "one of the thirteen", "a bundle was not named as one of the thirteen");
  has(bh, "Open the issue desk", "a bundle's door claimed to open a single key's ledger");
  no(bh, "in none of the thirteen bundles", "a bundle was said to be in none of the thirteen");
  no(bh, "Open the record ledger", "a bundle's door claimed a single key's ledger");
  ok(bh.indexOf('data-ans="1"') >= 0,
    "a bundle lost the ranked answer it has always had — nothing else here replaces it");
  ok(bh.indexOf(`data-eye-key="${CORE_WORD}"`) < bh.indexOf('data-ans="1"'),
    "the ranked answer printed above the record door on a bundle query");

  // The Eye's door and the desk's shelf go through ONE resolver, so a hit in the
  // Eye opens exactly what the desk opens.
  has(EYE, "window.PDXDoor1", "the Eye no longer asks the desk to resolve a key");
  has(EYE, "issueKeyFor", "the Eye resolves issue keys by some other means than the desk's own resolver");
  has(EYE, "data-eye-key-go", "the Eye's door lost its handle");
  has(HTML, "pdx-eye-key", "index.html carries no styling for the Eye's record block");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · No second lane in the new copy");

{
  const { w, html } = LEDGER;
  // The whole pane, both faces, plus the seek control.
  const shelf = (() => { const s = boot(); s.pdxDoor1Open("issue"); return paint(s); })();
  // ── ONE CARVE-OUT, AND IT IS THE OFFICE ───────────────────────────────────
  // The brief asks each row for name and OFFICE, and some offices are named after
  // a caucus: "House Republican Conference Chair", "Assistant House Democratic
  // Leader". That is the office's own name, taken off the roster field the whole
  // site prints, on a row that carries no caucus mark of its own. Those spans are
  // removed before the sweep rather than the sweep being weakened — everything
  // else the pane paints is measured for every token below.
  const OFFICE = /<span class="d1-led-o">[\s\S]*?<\/span>/g;
  must(OFFICE.test(html), "the ledger prints no office on a row any more");
  const ALL = (html + "\n" + shelf).replace(OFFICE, "");
  // …and the office is the roster's string, not one this pane composed.
  {
    const led0 = w.PDXDoor1._ledger(null, KEY);
    const withOffice = [];
    for (const b of led0.bands) for (const r of b.rows) if (r.office) withOffice.push(r);
    must(withOffice.length > 5, "no ledger row carries an office, so this check is vacuous");
    const ranked = w.PDXIssueView.buildRanking({ key: KEY, keys: [KEY], label: KEY }, KEY) || [];
    const composed = [];
    for (const r of withOffice) {
      const src = ranked.filter((x) => x && x.id === r.pid)[0];
      if (src && r.office !== String(src.sub || "")) composed.push(r.pid);
    }
    eq(composed.slice(0, 5).join(" "), "",
      `${composed.length} office string(s) are not the roster field the issue lane already carries`);
  }
  must(ALL.indexOf("d1-led-band") >= 0 && ALL.indexOf("d1-seek") >= 0,
    "the sweep painted neither the bands nor the seek control, so its walls are vacuous");

  no(ALL, "%", "a percentage reached the ledger. Every figure here is a count of rows on this pane");
  for (const wd of ["Republican", "Democrat", "GOP", "party", "partisan", "(R)", "(D)"]) {
    ok(ALL.toLowerCase().indexOf(wd.toLowerCase()) === -1,
      `"${wd}" reached the ledger's markup. No caucus token is a band, a sort or a mark here`);
  }
  for (const wd of ["consistency", "backs up their words", "score", "grade", "Mandate",
                    "most conservative", "loyalty"]) {
    ok(ALL.indexOf(wd) === -1,
      `"${wd}" reached the ledger's markup. The formal record is not a ranking and hosts no second lane`);
  }
  no(ALL, "No pattern", "\"No pattern\" reached the ledger. An empty lane is a fact about what we hold");

  // The wall under the bands is the formal lane's own literal, quoted whole —
  // including the sentence that says none of this feeds Direction Match.
  const WALL = w.PDXConsistency.formalPatternIndex.WALL;
  must(WALL && WALL.indexOf("Direction Match") >= 0, "the formal lane's wall no longer names the match");
  has(html, WALL, "the ledger prints something other than the formal lane's own wall sentence");
  // …and that is the ONLY place the match is named.
  eq(html.split(WALL).join("").indexOf("Direction Match"), -1,
    "Direction Match is named on the ledger outside the wall that walls it off");

  // The band headings are the index's own, so the person file and the issue desk
  // describe the same finding in the same words.
  for (const b of w.PDXConsistency.formalPatternIndex.LEDGER_BANDS) {
    if (!w.PDXDoor1._ledger(null, KEY).by[b.id]) continue;
    has(html, b.lb, `the ${b.id} band is not printed under the index's own heading`);
    has(html, b.note, `the ${b.id} band is not printed with the index's own note`);
  }

  // A row's tap is the shipped dossier gateway, with the key in the key's slot.
  has(html, 'class="d1-led-go pdxst-open"', "a ledger row does not open through the shipped gateway");
  has(html, `data-pdxst-dos="${KEY}"`, "the gateway was handed something other than the issue key");
  has(html, 'data-pdxst-focus="record"', "the gateway does not land the reader on the record");
  has(R("consistency.js"), "data-pdxst-dos", "the gateway attribute this pane writes is not the shipped one");

  // Measures are named and open the existing explainer, and PRIMARY vs provision
  // is a label on the row — not a cap, a gate or a discount.
  const led = w.PDXDoor1._ledger(null, KEY);
  if (led.measures.length) {
    has(html, "d1-led-bills", "the ledger named no measures");
    has(html, "PRIMARY", "the measure rows do not say which were about this issue");
    has(html, "window.pdxDoor1Bill(", "a measure row does not open the existing explainer");
  } else {
    console.log("      no measure in the index maps to this key — measure rows pinned by shape only");
  }

  // The sheet ships the classes the pane paints. A class with no rule is a row
  // with no layout on a phone.
  for (const cls of ["d1-led-census", "d1-led-band", "d1-led-people", "d1-led-pat",
                     "d1-led-tail", "d1-led-meas", "d1-led-wall", "d1-seek", "d1-led-more"]) {
    has(CSS, "." + cls, `the stylesheet has no rule for .${cls}`);
  }
  no(CSS, ".d1-led-party", "the sheet still styles a caucus chip the pane no longer paints");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · Twin boot, both ways");

{
  const A = boot({ withoutDesk: true });
  const B = boot();
  must(A.PDXWordAction && typeof A.PDXWordAction.heroHtml === "function",
    "word-action.js did not boot without the desk");
  const prof = (w, pid) => (w.PROFILES && w.PROFILES[pid]) || null;
  for (const pid of ["lee", "curtis", "aaron_bean", "maloy"]) {
    eq(String(B.PDXWordAction.heroHtml(pid, prof(B, pid)) || ""),
       String(A.PDXWordAction.heroHtml(pid, prof(A, pid)) || ""),
      `${pid}: the formal brief is not byte-identical with the ledger loaded`);
  }
  const drifted = [], dm = [];
  for (const [pid] of corpus.byMember) {
    if (String(B.PDXWordAction.heroHtml(pid, prof(B, pid)) || "") !==
        String(A.PDXWordAction.heroHtml(pid, prof(A, pid)) || "")) drifted.push(pid);
    for (const sc of Object.keys(A.PDXConsistency.SCOPES)) {
      if (JSON.stringify(B.PDXConsistency.scopedOverall(sc, pid)) !==
          JSON.stringify(A.PDXConsistency.scopedOverall(sc, pid))) dm.push(`${pid}/${sc}`);
    }
  }
  eq(drifted.slice(0, 6).join(" "), "", `${drifted.length} formal brief(s) moved when the ledger loaded`);
  eq(dm.slice(0, 6).join(" "), "", `Direction Match drifted on ${dm.length} reads`);
  console.log(`      ${corpus.byMember.size} members swept: no drift in any brief or Direction Match read`);

  // …and PAINTING the ledger does not move them either. The pane warms records
  // and reads a shared index; a cache it dirties would show up here and nowhere
  // else, on exactly the people it just printed.
  const C = boot();
  const before = {};
  for (const pid of ["lee", "curtis", "maloy", "aaron_bean"]) {
    before[pid] = String(C.PDXWordAction.heroHtml(pid, prof(C, pid)) || "");
    before[pid + "|dm"] = JSON.stringify(C.PDXConsistency.scopedOverall("all", pid));
    before[pid + "|fpi"] = JSON.stringify(C.PDXConsistency.formalPatternIndex.rows(pid));
  }
  await openKey(C, KEY);
  await openKey(C, "housing");
  for (const pid of ["lee", "curtis", "maloy", "aaron_bean"]) {
    eq(String(C.PDXWordAction.heroHtml(pid, prof(C, pid)) || ""), before[pid],
      `${pid}: the formal brief moved after the ledger painted`);
    eq(JSON.stringify(C.PDXConsistency.scopedOverall("all", pid)), before[pid + "|dm"],
      `${pid}: Direction Match moved after the ledger painted`);
    eq(JSON.stringify(C.PDXConsistency.formalPatternIndex.rows(pid)), before[pid + "|fpi"],
      `${pid}: the formal-pattern index moved after the ledger painted`);
  }

  // The extraction that made one row of the index reachable is an extraction, not
  // a rewrite: the row the ledger asks for is the row the list already contained.
  const F = probe.PDXConsistency.formalPatternIndex;
  const off = [];
  for (const pid of ["lee", "curtis", "maloy", "chip_roy", "pallone"]) {
    for (const r of F.rows(pid) || []) {
      const one = F.rowFor(pid, r.key);
      if (!one) { off.push(`${pid}/${r.key}: rowFor returned nothing`); continue; }
      if (JSON.stringify(one) !== JSON.stringify(r)) off.push(`${pid}/${r.key}: rowFor differs from rows()`);
    }
  }
  eq(off.slice(0, 5).join(" | "), "", `${off.length} index row(s) differ between rows() and rowFor()`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · The assets travel together");

{
  // The four files this pass moved. They are one change: the ledger paints with
  // door1-workspace.css, reads consistency.js's published row, and is opened from
  // all-seeing-eye.js — a stale copy of any one of them is a broken pane.
  for (const f of ["/", "/consistency.js", "/door1-workspace.js", "/door1-workspace.css"]) {
    has(SW, `'${f}'`, `${f} is not precached, so it can go stale on its own`);
  }
  // all-seeing-eye.js is a RUNTIME entry, not a precached one. It still cannot go
  // stale against this pass, because the runtime cache NAME carries CACHE_VERSION
  // — which is the whole reason the bump is not skippable: the old Eye would call
  // a resolver the new desk publishes and the key hit would silently not appear.
  no(SW, "'/all-seeing-eye.js'", "all-seeing-eye.js became a precache entry and this note is stale");
  has(SW, "RUNTIME_CACHE = `politidex-runtime-${CACHE_VERSION}`",
    "the runtime cache name no longer carries CACHE_VERSION, so a runtime entry can outlive a bump");
  const m = SW.match(/CACHE_VERSION\s*=\s*'v(\d+)'/);
  must(m, "sw.js no longer carries a CACHE_VERSION this file can read");
  const v = Number(m[1]);
  ok(v >= 108, `CACHE_VERSION is v${v} — the shell moved and the version did not`);
  has(SW, `// v${v} - `, `there is no log entry for v${v} naming what moved`);
  // The entry runs from its marker to the constant it explains, so a multi-line
  // manifest is read whole rather than by its first line.
  const iLog = SW.indexOf(`// v${v} - `);
  const entry = SW.slice(iLog, SW.indexOf("const CACHE_VERSION", iLog));
  must(entry.length > 200, `the v${v} entry is too short to be naming anything`);
  // THE LOG IS THE RECORD OF WHY EACH SHELL FILE MOVED. A bump renames both cache
  // buckets, so it invalidates every one of these files at once whether or not
  // this particular pass touched them; what the log owes a reader is the version
  // at which each of them last changed under this pane. Asserted over the whole
  // log rather than the newest entry, because a later pass that moves only the
  // desk must not be forced to claim it moved consistency.js too.
  const LOG = SW.slice(0, SW.indexOf("const CACHE_VERSION"));
  for (const f of ["door1-workspace.js", "door1-workspace.css", "consistency.js",
                   "all-seeing-eye.js", "index.html"]) {
    has(LOG, f, `the version log never names ${f} among the files this pane travels with`);
  }
  // The NEWEST entry still has to name the desk, its stylesheet and the page —
  // any bump that reaches this pane reaches those three.
  for (const f of ["door1-workspace.js", "door1-workspace.css", "index.html"]) {
    has(entry, f, `the v${v} entry does not name ${f} among the files that must travel together`);
  }
  has(entry, "Direction Match", `the v${v} entry does not say what did NOT move`);
  // The pane is wired into the page it paints on.
  has(HTML, "door1-workspace.js", "the desk script is not wired into index.html");
  has(HTML, "door1-workspace.css", "the desk stylesheet is not wired into index.html");
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ issue record ledger: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("   · " + f);
  process.exit(1);
}
console.log(`✓ issue record ledger: all ${passed} assertions passed — 1 key, 5 bands, 1 characterisation, 0 rankings\n`);
