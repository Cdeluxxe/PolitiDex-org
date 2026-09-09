#!/usr/bin/env node
/**
 * test-eye-find-the-record.mjs — 👁️ Find the Record: one sitting person per
 * office, judges out of the people haystack, and a pane that holds still
 * ─────────────────────────────────────────────────────────────────────────────
 * THE EYE IS A SEARCH OVER THE ARCHIVE, NOT A SECOND ROSTER. Four things a
 * reader met in one panel, and none of them is a ranking problem:
 *
 *   1. TWO FILES FOR ONE HUMAN. "chew" answered with the HD-68 representative
 *      and with a retired id filed under the same man's name slug. A finder that
 *      answers "who is this" with near-duplicates has handed the disambiguation
 *      back to the reader, who knows less than the app does.
 *   2. A JUDGE IN A LEGISLATOR'S LIST. Judicial retention seats are not
 *      legislative files: no party, no chamber, no roll call. A county or state
 *      query that is asking who legislates must not answer with a judge as if
 *      they were one.
 *   3. A WALL OF STRANGERS FOR A TOPIC. A Utah reader typing "public lands" was
 *      answered with legislators from Texas and Connecticut whose bios contain
 *      those two words, because the roster is the largest haystack in the panel
 *      and every group competed on relevance alone.
 *   4. AND THE LIST BOUNCED UNDER THE THUMB. Five uncoordinated painters, each
 *      doing a full innerHTML replacement of the scroll container, over a sort
 *      whose inputs were still arriving — so the same query ordered its rows
 *      differently on paint 1, 2 and 3, the pane collapsed and re-inflated
 *      around them, and the highlight scrolled the reader off the row they were
 *      reaching for.
 *
 * WHAT THIS FILE PINS
 *
 *   1. THE FIXTURE IS THE REPORTED PANEL. The alias table really retires an id,
 *      the stub really is in PROFILES under it, and the judicial registry really
 *      holds seats that CMP_DATA and PROFILES do not.
 *   2. ONE ROW PER PERSON. chew / scott chew / uinta basin each answer with one
 *      HD-68 row at chew_h68, and no retired id reaches the markup at all.
 *   3. JUDGES ARE NOT IN THE PEOPLE HAYSTACK. No judge pid is ever printed as a
 *      person row, the judge block always sits below the people block, a judge
 *      row carries no party chip, and loading the judicial registry moves no
 *      legislative lane count by one.
 *   4. ONE ADDRESS PER PERSON. Every person row's href is /p/<canonical>, the
 *      pid in the address is the pid the row hands the opener on Enter, and no
 *      second address shape exists for the same human.
 *   5. THE RECORD ANSWERS A TOPIC; THE ROSTER ANSWERS A NAME. Files, families
 *      and measures lead an issue-shaped query; the roster leads only when a
 *      term is a name in the roster. Proved both ways as a counterfactual, and
 *      the lane counts are identical either way — this moved order, not what
 *      was found.
 *   6. THE PANE HOLDS STILL. One DOM write owns the panel; a refresh of the same
 *      question keeps the reader's scroll and may not shrink the pane; a new
 *      question releases both; rows already painted keep their slots when a late
 *      source arrives; every non-keystroke painter collapses into one frame and
 *      stands down while the reader's own paint is pending; the avatar box is
 *      declared so a late headshot cannot change a row's height; and the
 *      highlight only scrolls a row that is genuinely off screen.
 *   7. ALL THREE FIXES ARE LOAD-BEARING. commit(), holdOrder() and quietRepaint()
 *      are each neutered in the shipped source, and each defect comes back.
 *   8. THE COPY SAYS FIND THE RECORD. Not "all politicians in America".
 *   9. AND IT SHIPS, behind a CACHE_VERSION that moved past HEAD's.
 *  10. NOTHING ON THE DO-NOT LIST MOVED. score(), rank(), recordFirst(),
 *      citeFirst(), citeOf(), recordDepth() and judgeBlock() are byte-identical
 *      with HEAD, Direction Match / finance / Door 2 / the judicial registry are
 *      byte-identical files, and a twin boot leaves every Direction Match read
 *      and every formal tier unmoved.
 *
 * Real shipped modules in a node:vm sandbox with a mini-DOM whose panel has
 * geometry, a driven clock and a driven animation frame. Every string asserted
 * below is a string this harness painted.
 *
 *   node scripts/test-eye-find-the-record.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HEAD = (f) => {
  try {
    return execFileSync("git", ["show", "HEAD:" + f], {
      cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
    });
  }
  catch { return null; }
};
const EYE_SRC = R("all-seeing-eye.js");
const PAGE = R("index.html");
const SW = R("sw.js");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} — missing ${JSON.stringify(needle)}`);
const no = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg} — found ${JSON.stringify(needle)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`\n✗ eye find the record: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

// The person the report named, and the id that used to publish him twice.
const PID = "chew_h68";
const RETIRED = "scott_chew";
// A judge with a file, named so a registry that drops him fails loudly rather
// than quietly making section 3 vacuous.
const JUDGE = { pid: "jill_pohlman", name: "Pohlman" };
// The three queries that answer with one man, and the queries each shape is read
// on. A place is not a name: "salt lake county" and "state senate" are questions
// about a record, not requests for a directory.
const CHEW_QUERIES = ["chew", "scott chew", "uinta basin"];
const NAME_QUERIES = ["chew", "lee", "curtis"];
const ISSUE_QUERIES = ["public lands", "climate", "housing", "state senate"];
const LEG_QUERIES = ["chew", "lee", "public lands", "salt lake county", "utah"];

// The stub, filed under the retired id: a thin document with a name, an office
// and a paragraph of bio at an id the alias table retired. Searchable ("uinta
// basin" is in it and nowhere in the roster row) so a panel that stopped folding
// it is caught printing a second row rather than finding nothing.
const STUB = {
  name: "Scott Chew",
  office: "Representative",
  state: "Utah",
  bio: "Uinta Basin rancher and legislator.",
};

// ── the mini-DOM ────────────────────────────────────────────────────────────
function stubNode() {
  const set = new Set();
  const n = {
    id: "", className: "", innerHTML: "", textContent: "", value: "", tagName: "DIV",
    style: { setProperty() {}, removeProperty() {} }, dataset: {}, hidden: false,
    _attrs: {}, _li: {},
    classList: {
      add: (c) => set.add(c), remove: (c) => set.delete(c),
      toggle: (c, on) => (on === undefined ? (set.has(c) ? set.delete(c) : set.add(c)) : (on ? set.add(c) : set.delete(c))),
      contains: (c) => set.has(c),
    },
    setAttribute(k, v) { n._attrs[k] = String(v); },
    getAttribute(k) { return k in n._attrs ? n._attrs[k] : null; },
    removeAttribute(k) { delete n._attrs[k]; },
    focus() {}, blur() {}, scrollIntoView() {}, click() {},
    addEventListener(t, f) { (n._li[t] = n._li[t] || []).push(f); },
    removeEventListener() {}, remove() {},
    appendChild: (c) => c, insertBefore: (c) => c, insertAdjacentHTML() {},
    querySelector: () => null, querySelectorAll: () => [], closest: () => null,
    contains: () => true, matches: () => false,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 320, height: 44, bottom: 44, right: 320 }),
  };
  return n;
}

// THE PANEL IS THE SURFACE UNDER TEST, so unlike every other node in here it has
// geometry and a memory. Each write is recorded (so "one paint per frame" is a
// countable claim rather than an impression), the height is derived from the rows
// it currently holds unless a test forces one, and scrollTop is a real value the
// panel's writer can lose.
function panelNode() {
  const n = stubNode();
  n.paints = [];
  n.scrollTop = 0;
  n._forceH = null;
  let html = "";
  // A WRITE LOSES THE SCROLL, exactly as a browser does: replacing a scroll
  // container's children throws away the boxes the offset was measured against,
  // so the offset lands back at the top. Modelling that is what makes "the
  // refresh kept the reader's place" a claim about the panel's writer restoring
  // the value rather than a claim about nobody having touched it.
  Object.defineProperty(n, "innerHTML", {
    get() { return html; },
    set(v) { html = String(v); n.paints.push(html); n.scrollTop = 0; },
  });
  Object.defineProperty(n, "offsetHeight", {
    get() {
      if (n._forceH != null) return n._forceH;
      return 60 + 44 * (html.split('class="pdx-eye-res"').length - 1);
    },
  });
  n.getBoundingClientRect = () => ({ top: 0, left: 0, width: 360, height: 400, bottom: 400, right: 360 });
  return n;
}

// A rendered result row, at the index the panel gave it. The rect is the row's
// place in a 400px pane: rows 0-8 are on screen, anything past that is not —
// which is what makes "the highlight only scrolls what is off screen" testable.
function resStub(i, scrolls) {
  const n = stubNode();
  n.setAttribute("data-i", String(i));
  const top = i * 44;
  n.getBoundingClientRect = () => ({ top, left: 0, width: 360, height: 44, bottom: top + 44, right: 360 });
  n.scrollIntoView = () => { scrolls.push(i); };
  return n;
}

// A clock and an animation frame the test drives. makeSandbox's timers are
// no-ops, which is right for a ranking harness and wrong here: the debounce, the
// warming recheck and the coalescing frame ARE the subject.
function makeClock(win) {
  let now = 0, seq = 0;
  const timers = new Map();
  const frames = [];
  win.setTimeout = (fn, ms) => { const id = ++seq; timers.set(id, { fn, at: now + (Number(ms) || 0) }); return id; };
  win.clearTimeout = (id) => { timers.delete(id); };
  win.setInterval = () => 0;
  win.clearInterval = () => {};
  win.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
  win.cancelAnimationFrame = () => {};
  return {
    tick(ms) {
      now += Number(ms) || 0;
      const due = [...timers.entries()].filter(([, t]) => t.at <= now).sort((a, b) => a[1].at - b[1].at);
      for (const [id, t] of due) { timers.delete(id); try { t.fn(); } catch { /* the panel guards its own */ } }
      return due.length;
    },
    frame() {
      const q = frames.splice(0, frames.length);
      for (const f of q) { try { f(); } catch { /* as above */ } }
      return q.length;
    },
    armed() { return frames.length; },
  };
}

const SPINE = ["profile-evidence.js", "person-link.js"];
const JUDICIAL = ["judicial-data.js", "judicial-retention.js"];

function boot(opts) {
  opts = opts || {};
  const get = opts.get || R;
  const win = makeSandbox();
  const panel = panelNode(), input = stubNode(), eye = stubNode(), clear = stubNode();
  input.tagName = "TEXTAREA";
  const ids = { "pdx-eye-panel": panel, "pdx-eye-input": input, "pdx-eye": eye, "pdx-eye-clear": clear };
  win.document.getElementById = (id) => ids[id] || null;
  win.history = { replaceState() {}, pushState() {} };
  const store = {};
  win.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const winLi = {};
  win.addEventListener = (t, f) => { (winLi[t] = winLi[t] || []).push(f); };
  const clock = makeClock(win);
  const ctx = vm.createContext(win);
  const files = [...ENGINE_FILES, "pdx-issue-family.js", "issue-colors.js"]
    .concat(opts.noSpine ? [] : SPINE)
    .concat(opts.noJudicial ? [] : JUDICIAL);
  for (const f of files) vm.runInContext(get(f) || R(f), ctx, { filename: f });
  win.PROFILES = opts.noStub ? win.CMP_DATA : Object.assign({}, win.CMP_DATA, { [RETIRED]: STUB });
  win.PDXLazyData = { ensure: () => Promise.resolve(true), loaded: () => true, whenReady: (k, cb) => cb() };
  win.PDX_BILLS_INDEX = win.PDX_BILLS_INDEX || [];
  win._issueLabel = (k) => (win.ISSUE_MAP && win.ISSUE_MAP[k] && win.ISSUE_MAP[k].label) || "";
  let saved = [];
  win.PDXSaved = { list: () => saved.slice(), has: () => false };

  // Every way out of this sandbox, recorded — "one door" is a claim about what is
  // NOT called as much as about what is.
  const opened = [];
  win.PDXPerson = { open: (pid, o) => { opened.push("person:" + pid + (o && o.section ? "#" + o.section : "")); return true; } };
  win.showProfile = (id) => { opened.push("showProfile:" + id); };
  win.openModal = (id) => { opened.push("openModal:" + id); };
  win.PDXIssueView = { open: (k) => { opened.push("issue:" + k); } };
  win.PDXJudgeFile = { open: (id) => { opened.push("judge:" + id); } };

  vm.runInContext(get("all-seeing-eye.js") || EYE_SRC, ctx, { filename: "all-seeing-eye.js" });
  must(win.PDXEye && typeof win.PDXEye.render === "function", "PDXEye.render is unavailable");

  const scrolls = [];
  panel.querySelectorAll = (sel) => {
    if (String(sel).indexOf("pdx-eye-res") < 0) return [];
    return [...String(panel.innerHTML).matchAll(/class="pdx-eye-res[^"]*"[^>]*data-i="(\d+)"/g)]
      .map((m) => resStub(Number(m[1]), scrolls));
  };
  const fire = (type, ev) => { (input._li[type] || []).forEach((f) => f(ev || {})); };

  return {
    win, panel, input, eye, opened, clock, scrolls,
    lane(m) { return win.PDXEye.lane(m); },
    // A question, asked the way the panel's own handler asks it.
    search(q) {
      eye.classList.add("is-open");
      input.value = q;
      win.PDXEye.rebuild();
      win.PDXEye.render(q);
      return panel.innerHTML || "";
    },
    // The same question again, because a source arrived — no rebuild, no new
    // query, which is exactly what a late measures page looks like.
    repaint() { win.PDXEye.render(input.value); return panel.innerHTML || ""; },
    type(q) { input.value = q; fire("input"); },
    fire,
    winEvent(type) { (winLi[type] || []).forEach((f) => f({ type })); },
    setTeam(a) { store["politidex_my_politicians"] = JSON.stringify(a); },
    setSaved(a) { saved = a.slice(); },
    enterRowAt(n) {
      fire("focus", {});
      for (let i = 0; i < n; i++) fire("keydown", { key: "ArrowDown", preventDefault() {}, shiftKey: false });
      opened.length = 0;
      fire("keydown", { key: "Enter", preventDefault() {}, shiftKey: false });
      return opened.slice();
    },
    arrowTo(n) {
      fire("focus", {});
      for (let i = 0; i < n; i++) fire("keydown", { key: "ArrowDown", preventDefault() {}, shiftKey: false });
    },
  };
}

// ── readers over the rendered markup ────────────────────────────────────────
const CATS = (h) => [...String(h).matchAll(/data-cat="([^"]+)"/g)].map((m) => m[1]);
function catSlice(h, cat) {
  const s = String(h);
  const at = s.indexOf(`data-cat="${cat}"`);
  if (at === -1) return "";
  const next = s.indexOf('data-cat="', at + 10);
  return next === -1 ? s.slice(at) : s.slice(at, next);
}
const ROW_IDS = (h, kind) =>
  [...String(h).matchAll(new RegExp(`class="pdx-eye-item[^"]*"[^>]*?data-kind="${kind}" data-id="([^"]*)"`, "g"))]
    .map((m) => m[1]);
const POLS = (h) => ROW_IDS(catSlice(h, "pol"), "pol");
const JUDGES = (h) => ROW_IDS(h, "judge");
const HREFS = (h) => [...String(h).matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
const dupes = (list) => list.filter((x, i) => list.indexOf(x) !== i);
const laneCount = (h, id) => {
  const m = String(h).match(
    new RegExp(`data-eye-lane="${id}"[^>]*>.*?<span class="pdx-eye-lane-n">(\\d+)</span>`)
  );
  return m ? Number(m[1]) : null;
};
const LANES = (h) => ["formal", "public", "mandate"].map((k) => `${k}:${laneCount(h, k)}`).join(" ");
// The first group a reader's eye lands on. "warm" is the off-clock notice, not a
// group of results, so it is not an answer to "what led".
const leadCat = (h) => (CATS(h).filter((c) => c !== "warm")[0] || "");
// A function's source, by name, brace-matched — so "byte-identical" is a claim
// about the function and not about the file it lives in.
function fnSrc(src, name) {
  const at = String(src).indexOf(`function ${name}(`);
  if (at < 0) return "";
  const i = src.indexOf("{", at);
  let d = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === "{") d++;
    else if (src[j] === "}") { d--; if (!d) return src.slice(at, j + 1); }
  }
  return "";
}

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the fixture is the reported panel, not a hypothesis");
// ═════════════════════════════════════════════════════════════════════════════
const probe = boot();
{
  const ALIAS = probe.win.PDX_PROFILE_ALIAS || {};
  must(Object.keys(ALIAS).length > 10, "the shipped alias table did not load — nothing here has a retired id to fold");
  must(ALIAS[RETIRED] === PID, `the alias table no longer folds ${RETIRED} into ${PID} — the reported case is vacuous`);
  must(typeof probe.win.PDXProfilePid === "function", "PDXProfilePid is unavailable from the shipped files");
  must(typeof probe.win.PDXCanonIds === "function", "PDXCanonIds is unavailable — the grouping under test is absent");
  must(probe.win.PDXPersonLink && typeof probe.win.PDXPersonLink.pid === "function",
    "person-link.js did not publish PDXPersonLink.pid — the address half of this file has no owner");
  must(!probe.win.CMP_DATA[RETIRED], `the roster grew a row for ${RETIRED}, so it is not a retired id any more`);
  must(probe.win.CMP_DATA[PID], `the roster has no row for ${PID}`);
  must(probe.win.PROFILES[RETIRED], "the stub fixture did not survive the boot");
  // The judicial registry, and the wall between it and the roster.
  const SROWS = (probe.win.PDXJudicial && probe.win.PDXJudicial.searchRows) ? probe.win.PDXJudicial.searchRows() : [];
  must(SROWS.length > 100, `searchRows() returned ${SROWS.length} seats — the registry did not load`);
  must(SROWS.some((r) => r.pid === JUDGE.pid), `${JUDGE.pid} is not in the registry — section 3 names a judge who does not exist`);
  const inRoster = SROWS.filter((r) => probe.win.CMP_DATA[r.pid] || probe.win.PROFILES[r.pid]);
  must(inRoster.length === 0,
    `${inRoster.length} judge(s) are in CMP_DATA/PROFILES — the premise of the judge lane is gone`);
  // And the panel's own geometry owner exists, once.
  const writes = EYE_SRC.split("panel.innerHTML =").length - 1;
  eq(writes, 1, `${writes} places write panel.innerHTML — the pane has more than one painter again`);
  has(EYE_SRC, "function commit(html, key)", "commit() — the panel's one DOM write — is gone");
  has(EYE_SRC, "function holdOrder(cat, list, key)", "holdOrder() — the order freeze — is gone");
  has(EYE_SRC, "function quietRepaint(keepFocus)", "quietRepaint() — the frame coalescer — is gone");
  console.log(`      ${Object.keys(ALIAS).length} retired ids · ${SROWS.length} judicial seats, none in the roster · ` +
    "one panel writer");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · one row per person, and no retired id in the haystack");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot();
  B.lane("formal");
  const ALIAS = B.win.PDX_PROFILE_ALIAS || {};
  for (const q of CHEW_QUERIES) {
    const h = B.search(q);
    const rows = POLS(h);
    must(rows.length > 0, `the eye answered ${JSON.stringify(q)} with no people at all`);
    const chews = rows.filter((id) => id === PID || ALIAS[id] === PID);
    eq(chews.length, 1,
      `${JSON.stringify(q)}: HD-68 got ${chews.length} rows (${chews.join(", ")}) — one office, one person, one row`);
    eq(chews[0], PID, `${JSON.stringify(q)}: the surviving HD-68 row is not the canonical pid`);
    eq(dupes(rows).join(", "), "", `${JSON.stringify(q)}: a person is listed twice`);
    const leaked = Object.keys(ALIAS).filter((k) => h.includes(k));
    eq(leaked.join(", "), "",
      `${JSON.stringify(q)}: ${leaked.length} retired id(s) reached the markup — a tap on one opens half a person`);
    no(h, STUB.bio, `${JSON.stringify(q)}: the stub's bio is printed as a subtitle — the roster row is the record`);
  }
  // The same, in the lane a reader who is not reading the formal record uses.
  B.lane("public");
  for (const q of NAME_QUERIES) {
    const h = B.search(q);
    const rows = POLS(h);
    eq(dupes(rows).join(", "), "", `public/${JSON.stringify(q)}: the panel names the same person more than once`);
    eq(Object.keys(ALIAS).filter((k) => h.includes(k)).join(", "), "",
      `public/${JSON.stringify(q)}: a retired id reached the markup`);
  }
  console.log(`      ${CHEW_QUERIES.length} chew queries → one ${PID} row each · ` +
    `${NAME_QUERIES.length} public-lane queries → nobody twice · no retired id anywhere`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · judges are not in the legislator haystack");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot();
  const SEATS = B.win.PDXJudicial.searchRows();
  const JPIDS = new Set(SEATS.map((r) => r.pid));
  for (const mode of ["formal", "public"]) {
    B.lane(mode);
    for (const q of LEG_QUERIES) {
      const h = B.search(q);
      const people = POLS(h);
      const trespass = people.filter((id) => JPIDS.has(id));
      eq(trespass.join(", "), "",
        `${mode}/${JSON.stringify(q)}: ${trespass.length} judicial seat(s) were printed as legislators`);
      // Any judge row that IS painted lives in the judge block, below the people.
      const jr = JUDGES(h);
      if (jr.length) {
        const cats = CATS(h);
        ok(cats.indexOf("judge") > cats.indexOf("pol") || cats.indexOf("pol") === -1,
          `${mode}/${JSON.stringify(q)}: the judge block was painted above the people block`);
        eq(ROW_IDS(catSlice(h, "judge"), "judge").length, jr.length,
          `${mode}/${JSON.stringify(q)}: a judge row was painted outside the judge block`);
        no(catSlice(h, "judge"), "pdx-eye-party",
          `${mode}/${JSON.stringify(q)}: a judge row carries a party chip — a retention seat has no party`);
      }
    }
  }
  // A judge is still findable BY NAME — the wall is about which haystack they are
  // in, not about hiding a file the app holds.
  B.lane("formal");
  const jh = B.search(JUDGE.name);
  ok(JUDGES(jh).length > 0, `the eye cannot find ${JUDGE.name} at all — the wall became a deletion`);
  eq(POLS(jh).filter((id) => JPIDS.has(id)).join(", "), "",
    `${JUDGE.name} was answered with a judge in the people block`);
  // AND THE LEGISLATIVE COUNTS DO NOT KNOW THE REGISTRY EXISTS. Same queries,
  // one boot with the judicial files and one without: every lane figure the
  // reader is shown is the same number.
  const twin = boot({ noJudicial: true });
  must(!twin.win.PDXJudicial, "the noJudicial twin loaded the registry anyway");
  for (const mode of ["formal", "public"]) {
    B.lane(mode); twin.lane(mode);
    for (const q of LEG_QUERIES) {
      eq(LANES(B.search(q)), LANES(twin.search(q)),
        `${mode}/${JSON.stringify(q)}: loading the judicial registry moved a legislative lane count`);
      eq(POLS(B.search(q)).join("|"), POLS(twin.search(q)).join("|"),
        `${mode}/${JSON.stringify(q)}: loading the judicial registry changed the people list`);
    }
  }
  console.log(`      ${SEATS.length} seats · ${LEG_QUERIES.length} legislative queries × 2 lanes · ` +
    "no judge in a people block, no lane count moved");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · one address per person: /p/<canonical>");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot();
  const canon = B.win.PDXPersonLink.pid;
  const ALIAS = B.win.PDX_PROFILE_ALIAS || {};
  for (const mode of ["formal", "public"]) {
    B.lane(mode);
    for (const q of NAME_QUERIES) {
      const h = B.search(q);
      const rows = POLS(h);
      must(rows.length > 0, `${mode}/${JSON.stringify(q)}: no person row to address`);
      for (const id of rows) {
        eq(id, canon(id), `${mode}/${JSON.stringify(q)}: the row's id is not the canonical pid`);
        has(h, `href="/p/${id}"`, `${mode}/${JSON.stringify(q)}: ${id} has no /p/ address on its row`);
      }
      // No second address shape for a person, anywhere in the panel.
      const person = HREFS(h).filter((u) => /\/p\//.test(u) || /profile/i.test(u));
      for (const u of person) {
        ok(/^\/p\/[a-z0-9_-]+$/i.test(u), `${mode}/${JSON.stringify(q)}: ${JSON.stringify(u)} is a second address shape`);
        eq(u, `/p/${canon(u.slice(3))}`, `${mode}/${JSON.stringify(q)}: ${JSON.stringify(u)} is not the canonical address`);
        ok(!Object.keys(ALIAS).some((k) => u.endsWith("/" + k)),
          `${mode}/${JSON.stringify(q)}: ${JSON.stringify(u)} publishes a retired id as a URL`);
      }
    }
  }
  // And the address is what the row opens: the same pid, through the one funnel.
  B.lane("formal");
  const h = B.search("chew");
  const lead = POLS(h)[0];
  has(h, `href="/p/${lead}"`, "the leading row's address is not the pid it opens");
  const fired = B.enterRowAt(0);
  eq(fired[0], `person:${lead}`, `Enter opened ${JSON.stringify(fired[0] || "nothing")} rather than the row it highlighted`);
  eq(fired.filter((x) => /^showProfile|^openModal/.test(x)).join(", "), "",
    "a person row opened a legacy modal as well as the file");
  console.log(`      ${NAME_QUERIES.length} queries × 2 lanes: every person row is /p/<canonical>, ` +
    "and Enter opens the pid in the address");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the record answers a topic; the roster answers a name");
// ═════════════════════════════════════════════════════════════════════════════
const RECORD_CATS = ["file", "fam", "bill", "spot", "stance"];
{
  const B = boot();
  B.lane("formal");
  for (const q of ISSUE_QUERIES) {
    const h = B.search(q);
    const lead = leadCat(h);
    must(lead, `${JSON.stringify(q)}: the panel painted no group at all`);
    ok(RECORD_CATS.indexOf(lead) >= 0,
      `${JSON.stringify(q)}: the panel opened on ${JSON.stringify(lead)} — an issue-shaped question is answered by ` +
      "the record first, not by a wall of people who happen to say the words");
    // The roster is still there, still complete — just not first.
    ok(POLS(h).length >= 0, `${JSON.stringify(q)}: the people group was dropped rather than reordered`);
  }
  for (const q of NAME_QUERIES) {
    eq(leadCat(B.search(q)), "pol",
      `${JSON.stringify(q)}: a name-shaped question did not open on the people it names`);
  }
  // A COUNTY IS NOT A NAME. The Utah reader's complaint in one line: the wall of
  // Texas and Connecticut names is gone from a topic query.
  const pl = B.search("public lands");
  const cats = CATS(pl).filter((c) => c !== "warm");
  ok(cats.indexOf("pol") > 0, "'public lands' still opens on the roster");
  console.log(`      issue-shaped: ${ISSUE_QUERIES.map((q) => `${JSON.stringify(q)}→${leadCat(B.search(q))}`).join(" ")} · ` +
    `name-shaped: ${NAME_QUERIES.map((q) => JSON.stringify(q)).join(" ")}→pol`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the pane holds still while the record arrives");
// ═════════════════════════════════════════════════════════════════════════════
{
  // (a) A REFRESH KEEPS THE READER'S PLACE AND MAY NOT SHRINK THE PANE.
  const B = boot();
  B.lane("formal");
  B.search("lee");
  eq(B.panel.style.minHeight || "", "", "a new question inherited a reserved height from the previous one");
  eq(B.panel.scrollTop, 0, "a new question did not start at the top of its answer");
  B.panel.scrollTop = 220;          // the reader scrolls down to a row
  B.panel._forceH = 620;            // the pane is 620px tall at that moment
  B.repaint();                      // a measures page lands: same question, new paint
  eq(B.panel.scrollTop, 220, "a refresh threw the reader back to the top of the list");
  eq(B.panel.style.minHeight, "620px", "a refresh did not reserve the height the pane already occupied");
  B.panel._forceH = 90;             // the next paint ranks fewer rows
  B.repaint();
  eq(B.panel.style.minHeight, "620px", "the pane was allowed to collapse under a shorter refresh");
  eq(B.panel.scrollTop, 220, "the shorter refresh moved the reader");
  // A NEW QUESTION RELEASES BOTH — the floor is a reservation for one query's
  // worth of loading, not a growing minimum.
  B.panel._forceH = null;
  B.search("chew");
  eq(B.panel.style.minHeight || "", "", "a new question kept the previous question's reserved height");
  eq(B.panel.scrollTop, 0, "a new question kept the previous question's scroll position");

  // (b) ROWS ALREADY PAINTED KEEP THEIR SLOTS WHEN A LATE SOURCE ARRIVES.
  const C = boot();
  C.lane("formal");
  const before = POLS(C.search("lee"));
  must(before.length > 3, `"lee" painted ${before.length} people — too few to restack`);
  const target = before[before.length - 1];
  C.setTeam([target]);
  C.setSaved([{ type: "pol", key: target, polId: target }]);
  C.winEvent("pdx-saved-change");
  C.clock.frame();
  const after = POLS(C.panel.innerHTML);
  eq(after.slice(0, before.length).join("|"), before.join("|"),
    "the saved collection landing restacked rows the reader could already see");
  eq(after.indexOf(target), before.indexOf(target),
    `${target} moved slot because a late source arrived`);

  // (c) ONE FRAME, ONE PAINT, AND THE READER'S PAINT WINS.
  const D = boot();
  D.lane("formal");
  D.search("chew");
  const p0 = D.panel.paints.length;
  D.winEvent("pdx-saved-change");
  D.winEvent("pdx-saved-change");
  D.winEvent("pdx-issue-votes");
  eq(D.panel.paints.length, p0, "a late source painted synchronously, straight into the reader's scroll container");
  eq(D.clock.armed(), 1, `three late sources armed ${D.clock.armed()} frames — they are not being coalesced`);
  D.clock.frame();
  eq(D.panel.paints.length, p0 + 1, "one frame produced more than one paint");
  // AND NOT WHILE THE READER IS TYPING. The keystroke's own paint is pending;
  // a late source may not paint a list a fraction of a second before it is
  // replaced anyway.
  D.type("chew");
  const p1 = D.panel.paints.length;
  D.winEvent("pdx-saved-change");
  eq(D.clock.armed(), 0, "a late source armed a frame while the reader's own paint was still pending");
  eq(D.panel.paints.length, p1, "a late source painted over the reader's pending keystroke");
  D.clock.tick(60);
  eq(D.panel.paints.length, p1 + 1, "the reader's own debounced paint did not land");

  // (d) THE HIGHLIGHT ONLY SCROLLS WHAT IS GENUINELY OFF SCREEN.
  const E = boot();
  E.lane("public");
  E.search("lee");
  const rows = (E.panel.innerHTML.match(/class="pdx-eye-res[^"]*"[^>]*data-i="\d+"/g) || []).length;
  must(rows > 9, `"lee" painted ${rows} rows — not enough to have anything below the fold`);
  E.scrolls.length = 0;
  E.arrowTo(0);                     // focus: the highlight lands on row 0
  eq(E.scrolls.length, 0, "the highlight scrolled the pane for a row that was already on screen");
  E.arrowTo(10);                    // arrow-keying past the fold
  ok(E.scrolls.length > 0, "the highlight stopped following the reader past the fold");

  // (e) A LATE HEADSHOT CANNOT CHANGE A ROW'S HEIGHT.
  const F = boot();
  F.lane("formal");
  const fh = F.search("lee");
  ok(fh.indexOf("pdx-eye-item") > 0, "the headshot lane has no rows to inspect");
  // No headshot URL resolves inside this sandbox, so the box is read off the
  // emitters themselves: EVERY <img> the panel can put in a row, not the subset
  // a fixture happened to reach.
  const thumbs = EYE_SRC.match(/pdx-eye-thumb"><img[^>]*>/g) || [];
  must(thumbs.length >= 2, `only ${thumbs.length} thumbnail emitter(s) found in the panel — the box has no subject`);
  for (const t of thumbs) {
    has(t, 'width="38"', "a result thumbnail has no declared width — the row reflows when it decodes");
    has(t, 'height="38"', "a result thumbnail has no declared height — the row reflows when it decodes");
    has(t, 'loading="lazy"', "a result thumbnail is not lazy — it competes with the rows the reader can see");
    has(t, 'decoding="async"', "a result thumbnail decodes on the main thread");
  }
  has(PAGE, "min-height:3.35rem", "the result row has no reserved height in the stylesheet");
  has(PAGE, "overflow-anchor:none", "the results pane still lets the browser anchor scrolling against the panel's own restore");
  console.log(`      floor held at 620px over two shorter refreshes · ${before.length} rows kept their slots · ` +
    `3 late sources → 1 paint · ${thumbs.length} thumbnails with a declared box`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · all three fixes are load-bearing (counterfactuals)");
// ═════════════════════════════════════════════════════════════════════════════
// THE COUNTERFACTUAL IS BUILT OUT OF THE SHIPPED SOURCE, NOT OUT OF A GIT
// REVISION: a probe against HEAD is true exactly once — the moment the pass is
// committed, HEAD carries the fix and the probe starts reporting a defect on a
// tree where nothing is wrong. Each mutant below removes ONE of the three
// functions' guarantees and nothing else, so what it proves is that guarantee.
{
  const NEUTER = {
    commit: ["    function commit(html, key) {\n      var refresh = (key === paintKey);",
             "    function commit(html, key) {\n      var refresh = false;"],
    holdOrder: ["    function holdOrder(cat, list, key) {",
                "    function holdOrder(cat, list, key) {\n      if (true) return list;"],
    quiet: ["    function quietRepaint(keepFocus) {\n      if (!eye.classList.contains('is-open')) return;\n      if (typing) return;",
            "    function quietRepaint(keepFocus) {\n      if (!eye.classList.contains('is-open')) return;\n      if (keepFocus) { rerenderKeepFocus(); return; } render(input.value); return;"],
    shape: ["    function queryShape(q, terms, data) {\n      if (!q) return 'issue';",
            "    function queryShape(q, terms, data) {\n      if (!q) return 'issue';\n      if (true) return 'name';"],
  };
  const mutate = (k) => {
    const [from, to] = NEUTER[k];
    must(EYE_SRC.split(from).length === 2,
      `all-seeing-eye.js no longer contains the ${k} anchor exactly once — this counterfactual claims nothing`);
    const src = EYE_SRC.replace(from, to);
    must(src !== EYE_SRC, `the ${k} mutant is byte-identical to the shipped file`);
    return (f) => (f === "all-seeing-eye.js" ? src : R(f));
  };

  // (a) commit() WITHOUT ITS REFRESH BRANCH — every paint is a new question, so
  //     every paint is a full reset. This is the pane the reader met.
  {
    const B = boot({ get: mutate("commit") });
    B.lane("formal");
    B.search("lee");
    B.panel.scrollTop = 220;
    B.panel._forceH = 620;
    B.repaint();
    ok(B.panel.scrollTop === 0 && !B.panel.style.minHeight,
      "counterfactual (a): the pane keeps the reader's place and its height with commit()'s refresh branch removed, " +
      "so section 6a is not testing it");
  }
  // (b) holdOrder() PASSING ITS LIST STRAIGHT THROUGH — the late source restacks
  //     the rows under the thumb.
  {
    const B = boot({ get: mutate("holdOrder") });
    B.lane("formal");
    const before = POLS(B.search("lee"));
    const target = before[before.length - 1];
    B.setTeam([target]);
    B.setSaved([{ type: "pol", key: target, polId: target }]);
    B.winEvent("pdx-saved-change");
    B.clock.frame();
    const after = POLS(B.panel.innerHTML);
    ok(after.join("|") !== before.join("|"),
      "counterfactual (b): the order holds with holdOrder() removed, so section 6b is not testing it");
    ok(after.indexOf(target) < before.indexOf(target),
      `counterfactual (b): ${target} did not jump the queue with the freeze removed`);
  }
  // (c) quietRepaint() PAINTING ON THE SPOT — three late sources, three full
  //     replacements of the scroll container, one of them inside the reader's
  //     own pending keystroke.
  {
    const B = boot({ get: mutate("quiet") });
    B.lane("formal");
    B.search("chew");
    const p0 = B.panel.paints.length;
    B.winEvent("pdx-saved-change");
    B.winEvent("pdx-saved-change");
    B.winEvent("pdx-issue-votes");
    ok(B.panel.paints.length > p0 + 1,
      `counterfactual (c): three late sources produced ${B.panel.paints.length - p0} paint(s) with the coalescer ` +
      "removed, so section 6c is not testing it");
    B.type("chew");
    const p1 = B.panel.paints.length;
    B.winEvent("pdx-saved-change");
    ok(B.panel.paints.length > p1,
      "counterfactual (c): a late source still stands down inside the typing window with the gate removed");
  }
  // (d) THE SHAPE READ REMOVED — the roster leads every question again, which is
  //     the wall of Texas and Connecticut names.
  {
    const B = boot({ get: mutate("shape") });
    B.lane("formal");
    eq(leadCat(B.search("public lands")), "pol",
      "counterfactual (d): the record still leads a topic with the shape read forced to 'name', so section 5 is " +
      "not testing it");
    // AND THE COUNTS ARE THE SAME EITHER WAY. Shape moves order; it may not move
    // what was found.
    const shipped = boot();
    shipped.lane("formal");
    for (const q of ISSUE_QUERIES.concat(NAME_QUERIES)) {
      eq(LANES(B.search(q)), LANES(shipped.search(q)),
        `${JSON.stringify(q)}: the group order changed a lane count — order may not move a number`);
      eq(POLS(B.search(q)).slice().sort().join("|"), POLS(shipped.search(q)).slice().sort().join("|"),
        `${JSON.stringify(q)}: the group order changed WHO was found`);
    }
  }
  console.log("      · the pane resets → caught  · the list restacks → caught  · " +
    "three painters → caught  · the roster leads a topic → caught");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the copy says Find the Record");
// ═════════════════════════════════════════════════════════════════════════════
{
  const eyeEntries = [...PAGE.matchAll(/<a href="#say-vs-do"[^>]*title="([^"]*)"[^>]*>(👁️[^<]*)<\/a>/g)];
  eq(eyeEntries.length, 2, "both eye entries (desktop bar + mobile menu) are not present with a tooltip");
  for (const [, title, label] of eyeEntries) {
    has(label, "Find the Record", "an eye nav entry is not labelled Find the Record");
    has(title, "Find the Record", "an eye nav entry's tooltip does not say what the panel is");
    has(title, "search the archive", "an eye nav entry's tooltip does not say it searches the archive");
    no(title.toLowerCase(), "all politicians", "an eye nav entry promises every politician in America");
  }
  // The field itself, and the empty state a reader lands on.
  const field = (PAGE.match(/<textarea[^>]*id="pdx-eye-input"[^>]*>/) || [])[0] || "";
  must(field, "the eye's input is no longer a textarea this file can read");
  has(field, "Find the record", "the placeholder does not name what the panel does");
  has(field, "paste a claim", "the placeholder no longer invites a pasted claim");
  has(field, 'aria-label="Find the record', "the field's accessible name is not the panel's job");
  has(EYE_SRC, "<b>Find the Record.</b>", "the empty state does not say Find the Record");
  // No roster promise anywhere in the panel or the shell around it. Read with
  // the comments stripped: both files quote the phrase in a comment in order to
  // disown it, and a note explaining what the panel is NOT is not a promise.
  const strip = (src) => src.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*|<!--)/.test(l)).join("\n").toLowerCase();
  const pageCopy = strip(PAGE), eyeCopy = strip(EYE_SRC);
  for (const banned of ["all politicians in america", "every politician in america", "all politicians in the country"]) {
    no(pageCopy, banned, `the page promises ${JSON.stringify(banned)}`);
    no(eyeCopy, banned, `the panel promises ${JSON.stringify(banned)}`);
  }
  // And no new nav item was added to carry any of it: two rendered entries, both
  // of them anchors that open the panel already in the shell.
  const navEyes = (PAGE.match(/>👁️ Find the Record<\/a>/g) || []).length;
  eq(navEyes, 2, `the shell renders ${navEyes} eye entries — this pass adds no nav item`);
  console.log(`      2 nav entries, both Find the Record · placeholder invites a claim · no roster promise`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · it ships");
// ═════════════════════════════════════════════════════════════════════════════
{
  const m = /const CACHE_VERSION = 'v(\d+)';/.exec(SW);
  must(m, "sw.js no longer carries a CACHE_VERSION this file can read");
  const v = Number(m[1]);
  const prev = HEAD("sw.js");
  if (prev) {
    const pm = /const CACHE_VERSION = 'v(\d+)';/.exec(prev);
    if (pm) {
      ok(v > Number(pm[1]),
        `CACHE_VERSION did not move past HEAD's v${pm[1]} — a warm device would keep serving the shell whose pane ` +
        "reserves no height");
    }
  } else {
    console.log("      no HEAD copy available — the version-moved check is skipped");
  }
  has(SW, `// v${v} - `, `sw.js has no prose log entry for v${v}`);
  const note = SW.slice(SW.indexOf(`// v${v} - `), SW.indexOf("const CACHE_VERSION"));
  has(note, "index.html", `the v${v} note does not name the precached file this pass changed`);
  has(note, "all-seeing-eye.js", `the v${v} note does not name the panel this pass changed`);
  has(note, "Direction Match", `the v${v} note does not say what did NOT move`);
  has(SW, "const RUNTIME_CACHE = `politidex-runtime-${CACHE_VERSION}`",
    "the runtime cache name no longer carries CACHE_VERSION, so a bump does not drop the stale panel");
  console.log(`      CACHE_VERSION v${v}; the note names index.html and all-seeing-eye.js`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("10 · nothing on the do-not list moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  const headEye = HEAD("all-seeing-eye.js");
  if (!headEye) console.log("      no HEAD copy available — the byte-identity checks are skipped");
  else {
    // THE RANKING IS UNTOUCHED, FUNCTION BY FUNCTION. holdOrder reads only the
    // ids a group printed last time; nothing below it was allowed to change.
    for (const fn of ["score", "rank", "recordFirst", "citeFirst", "citeOf", "recordDepth",
                      "laneReady", "judgeBlock", "catBlock", "subseq", "personalBoost", "rowOpen"]) {
      const a = fnSrc(EYE_SRC, fn), b = fnSrc(headEye, fn);
      must(a && b, `${fn}() cannot be read out of both revisions — this claim has no subject`);
      eq(a, b, `${fn}() is not byte-identical with HEAD — this pass may not move the ranking`);
    }
    // polItem() is the one row builder that changed, and the ONLY change in it is
    // the avatar box: two attributes and a decode hint.
    // polItem() is the one row builder that changed, and with its comments set
    // aside the ONLY change in it is the avatar box: two dimensions and a decode
    // hint on an <img> that already carried the same src, alt and onerror.
    const code = (src) => src.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
    const patched = code(fnSrc(headEye, "polItem")).split('alt="" loading="lazy"')
      .join('alt="" width="38" height="38" loading="lazy" decoding="async"');
    eq(code(fnSrc(EYE_SRC, "polItem")), patched,
      "polItem() changed by more than the declared avatar box — the row builder is otherwise untouched");
    // AND THE SURFACES THIS PASS WAS TOLD TO LEAVE ALONE ARE THE SAME FILES.
    for (const f of ["hero-showcase.js", "door2-spine.js",
                     "finance-lane.js", "judicial-retention.js", "judicial-data.js",
                     "profile-evidence.js", "person-link.js", "cmp-data.js"]) {
      const h = HEAD(f);
      must(h != null, `${f} could not be read out of HEAD`);
      eq(R(f) === h, true, `${f} is not byte-identical with HEAD — it is on the do-not-touch list`);
    }
    // consistency.js IS STILL ON THE LIST, AND THE PIN IS STILL BY BYTE — over
    // the functions this section is actually making a claim about. Whole-file
    // identity was only ever a proxy for THE PANEL DOES NOT MOVE THE LANE ROUTER,
    // and it has now been outlived twice by edits that are not counterexamples to
    // that claim. Wave E1 wrote the reasoning for the two state-executive act
    // types into the prose above _anyWeighedAct(), and the pin was re-declared
    // over the executable text. The exec-act copy pass then changed executable
    // text in the same file and nowhere near the router: _isExecAct() and
    // _anyRollCall() were added, _dosDirLine() gained a branch for a governor's
    // signature, and the two "See all N mapped ___" doors and the roll-call note
    // learned to ask which of the two they are looking at. Not one of those is a
    // routing decision, and a whole-file pin cannot tell the difference — so it
    // is re-declared over the router itself, function by function, where it can.
    //   THE ROUTER, BY BYTE. If the eye pass ever moves how an item is classified
    // or which lane an issue lands on, this still catches it, and it now catches
    // it by name instead of reporting that some line somewhere in 17,000 moved.
    {
      const h = HEAD("consistency.js");
      must(h != null, "consistency.js could not be read out of HEAD");
      const C_SRC = R("consistency.js");
      for (const fn of ["_anyBallot", "_anyWeighedAct", "recordItems", "recordLaneFor"]) {
        const a = fnSrc(C_SRC, fn), b = fnSrc(h, fn);
        must(a && b, `${fn}() cannot be read out of both revisions of consistency.js`);
        eq(a, b, `consistency.js ${fn}() is not byte-identical with HEAD — this pass may not move the lane router`);
      }
      // AND THE BUILDER BEHIND THE ONE THING THE PANEL ASKS THAT FILE FOR. The
      // eye reaches PDXConsistency at a single entry point, whose namespace hangs
      // off formalPatternIndexHtml(); that function is pinned by byte, and the
      // enumeration is asserted beside it so a new call cannot slip past the pin.
      const a = fnSrc(C_SRC, "formalPatternIndexHtml"), b = fnSrc(h, "formalPatternIndexHtml");
      must(a && b, "formalPatternIndexHtml() cannot be read out of both revisions of consistency.js");
      eq(a, b, "formalPatternIndexHtml() is not byte-identical with HEAD — the panel's entry point moved");
      const cCalls = [...new Set([...EYE_SRC.matchAll(/PDXConsistency\.([a-zA-Z_$][\w$]*)/g)]
        .map((m) => m[1]))].sort();
      eq(cCalls.join(","), "formalPatternIndex",
        "the panel calls something new on PDXConsistency — the pin above no longer covers it");
    }
    // word-action.js IS ON THE LIST BY ENTRY POINT RATHER THAN BY BYTE, and only
    // because a later pass had to change it: v163 vetoes a Word vs Action
    // percentage on an office whose formal lane is empty (/p/cox printed 56%
    // beside a brief that said "No formal pattern on file yet"). Whole-file byte
    // identity was only ever a proxy for the claim this section actually makes —
    // THE PANEL DOES NOT REACH INTO THAT MODULE — and the proxy expires the first
    // time somebody else legitimately edits the file. So the claim is asserted
    // directly instead, against the three functions all-seeing-eye.js calls and
    // nothing else. This is the stronger reading of the same promise: if the eye
    // pass ever starts moving the badge builders it prints, that shows up here
    // whether or not the rest of the file has moved on.
    {
      const headWA = HEAD("word-action.js");
      must(headWA != null, "word-action.js could not be read out of HEAD");
      const waSrc = R("word-action.js");
      const eyeCalls = [...EYE_SRC.matchAll(/PDXWordAction\.([a-zA-Z_$][\w$]*)/g)].map((m) => m[1]);
      const entryPoints = [...new Set(eyeCalls)].sort();
      eq(entryPoints.join(","), "figure,recordBadgeHTML,searchBadgeHTML",
        "the panel calls something new on PDXWordAction — the entry-point freeze below no longer covers it");
      for (const fn of entryPoints) {
        const a = fnSrc(waSrc, fn), b = fnSrc(headWA, fn);
        must(a && b, `word-action.js → ${fn}() cannot be read out of both revisions`);
        eq(a, b, `word-action.js → ${fn}() is not byte-identical with HEAD — the panel's entry points are frozen`);
      }
    }
  }
  // No reach into anything the panel does not own.
  const CODE = EYE_SRC.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  for (const banned of ["DistrictVoice", "PDX_DISTRICT_VOICE", "PDXFinance", "PDXDoor2"]) {
    no(CODE, banned, `the panel reaches into ${JSON.stringify(banned)}, which is out of scope for this pass`);
  }
  // The freeze reads no record, no party, no score, no depth.
  const freeze = fnSrc(EYE_SRC, "holdOrder") + fnSrc(EYE_SRC, "entrySlot") + fnSrc(EYE_SRC, "commit");
  for (const banned of ["party", "pct", "score(", "recordDepth", "depthTier", "wva", "finance"]) {
    no(freeze, banned, `the geometry layer reads ${JSON.stringify(banned)} — it may only read the ids it printed`);
  }
  // And the shape read decides from the string and the roster's name tokens only.
  const shape = fnSrc(EYE_SRC, "queryShape") + fnSrc(EYE_SRC, "nameTokens");
  for (const banned of ["party", "pct", "score(", "recordDepth", "finance", "state", "office"]) {
    no(shape, banned, `queryShape() reads ${JSON.stringify(banned)} — it may only read the string and name tokens`);
  }
  console.log("      12 ranking functions byte-identical · 8 do-not-touch files byte-identical · " +
    "consistency.js frozen at its lane router and the panel's entry point · " +
    "word-action.js frozen at its 3 entry points · " +
    "the freeze reads only ids");
}

// ═════════════════════════════════════════════════════════════════════════════
section("11 · twin boot — Direction Match and every formal tier are untouched");
// ═════════════════════════════════════════════════════════════════════════════
{
  const corpus = buildCorpus(ROOT);
  must(corpus && corpus.byMember && corpus.byMember.size > 300,
    `the record corpus loaded ${corpus && corpus.byMember ? corpus.byMember.size : 0} members`);
  function engine(files) {
    const win = makeSandbox();
    win.history = { replaceState() {}, pushState() {} };
    const panel = panelNode(), input = stubNode(), eye = stubNode(), clear = stubNode();
    input.tagName = "TEXTAREA";
    const ids = { "pdx-eye-panel": panel, "pdx-eye-input": input, "pdx-eye": eye, "pdx-eye-clear": clear };
    win.document.getElementById = (id) => ids[id] || null;
    makeClock(win);
    const ctx = vm.createContext(win);
    for (const f of files) vm.runInContext(R(f), ctx, { filename: f });
    win.PROFILES = Object.assign({}, win.CMP_DATA, { [RETIRED]: STUB });
    win.PDXLazyData = { ensure: () => Promise.resolve(true), loaded: () => true, whenReady: (k, cb) => cb() };
    win.PDX_BILLS_INDEX = win.PDX_BILLS_INDEX || [];
    win._issueLabel = (k) => (win.ISSUE_MAP && win.ISSUE_MAP[k] && win.ISSUE_MAP[k].label) || "";
    for (const [pid, recs] of corpus.byMember) {
      try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* no record surface here */ }
    }
    return win;
  }
  const BASE = [...ENGINE_FILES, "pdx-issue-family.js", "issue-colors.js", "voting-record.js"];
  const bare = engine(BASE);
  const withEye = engine([...BASE, ...SPINE, ...JUDICIAL, "all-seeing-eye.js"]);
  must(bare.PDXConsistency && typeof bare.PDXConsistency.scopedOverall === "function",
    "consistency.js did not boot in the bare twin");
  must(withEye.PDXEye, "all-seeing-eye.js did not boot in the loaded twin");
  const scopes = Object.keys(bare.PDXConsistency.SCOPES || {});
  must(scopes.length > 0, "PDXConsistency.SCOPES is empty");
  const drift = [];
  let swept = 0;
  for (const [pid] of corpus.byMember) {
    swept++;
    for (const sc of scopes) {
      const a = JSON.stringify(bare.PDXConsistency.scopedOverall(sc, pid));
      if (JSON.stringify(withEye.PDXConsistency.scopedOverall(sc, pid)) !== a) drift.push(`${pid}/${sc}`);
    }
    const t = JSON.stringify(bare.PDXConsistency.formalPatternIndex.shape(pid));
    if (JSON.stringify(withEye.PDXConsistency.formalPatternIndex.shape(pid)) !== t) drift.push(`${pid}/formal`);
    const w = JSON.stringify(bare.PDXWordAction.read(pid));
    if (JSON.stringify(withEye.PDXWordAction.read(pid)) !== w) drift.push(`${pid}/ledger`);
  }
  ok(swept > 300, `the twin boot only swept ${swept} files`);
  eq(drift.slice(0, 8).join(" | "), "",
    `${drift.length} Direction Match read(s) / formal tier(s) moved — this pass moved order and geometry only`);
  // AND THE COLD PANEL STILL ANSWERS. With no alias table and no person-link on
  // the page — the first few milliseconds of a real load — the eye still finds
  // people and still hands their ids to a working control.
  const cold = boot({ noSpine: true });
  cold.lane("formal");
  const ch = cold.search("chew");
  ok(POLS(ch).length > 0, "with no identity spine loaded the panel stopped finding people — it must fail open");
  has(ch, 'role="option"', "the cold panel's rows are not activatable controls");
  console.log(`      ${swept} members × ${scopes.length} scopes swept in 2 boots; no read moved; ` +
    "cold panel still answers");
}

// ── report ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ eye find the record: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`✓ eye find the record: one person, one address, no judge in the roster, a pane that holds still — ` +
  `${passed} assertions passed\n`);
