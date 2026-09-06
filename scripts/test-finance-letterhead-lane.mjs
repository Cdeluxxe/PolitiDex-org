#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-finance-letterhead-lane.mjs — money is a door on the letterhead, and the
// door is not a grade
// ─────────────────────────────────────────────────────────────────────────────
// Campaign finance is a core impact and it was almost invisible from the top of
// a person file: the identity zone carried the record brief and the ⚖️ Word vs
// Action chip, and the money lane began somewhere below the fold. A 💰 chip now
// sits in that same pill row. The risk in putting it there is exactly the thing
// Phase 2 retired — a 0–100 "Constituents-First" badge — so this file is the
// fence around the SHAPE of the new control rather than around its arithmetic,
// which test-finance-lane.mjs already fences:
//
//   1. IT SITS BEHIND THE RECORD. The letterhead's order is name, office, the
//      formal-record chips, ⚖️, then 💰. A money control that printed above the
//      record brief would have made finance the letterhead's lead read.
//   2. ON A FILE THAT EXISTS IT COUNTS, IT DOES NOT RATE. No %, and no score /
//      grade / level / rank / tier / verdict vocabulary — in the visible text OR
//      in the accessible name, which is the copy nobody proofreads.
//   3. THE CLICK LANDS ON THIS PAGE. Not a new overlay, not the site-level 💰
//      index, not a route change: the money section's own anchor on the profile
//      already being read, with the reveal run first so a deferred stage is
//      mounted before the scroll is measured. Checked by CALLING it against a
//      document, not by reading the onclick attribute.
//   4. AN ABSENT FILE IS NOT A ZERO. The empty chip's figure carries no digit,
//      no dollar sign and no "clean": a grey 0 beside a name is a reading of a
//      person built out of data nobody collected.
//   5. THE MOUNT IS A DISPLAY OBJECT. Twin boot: Direction Match, the formal
//      pattern index, the publication floor and the mapped counts are
//      byte-identical with the control mounted (deferred re-read drained) and
//      with it never mounted. The mount also leaves no new global behind.
//   6. THE SCORING PATHS DO NOT KNOW THE CHIP EXISTS. word-action.js,
//      consistency.js and every file that owns an ordering are scanned for the
//      chip's identifiers as well as the lane's.
//
//   node scripts/test-finance-letterhead-lane.mjs
//
// Real shipped modules in a node:vm sandbox over the REAL FTM_FUNDING seed and
// the real 1,120-person roster, so what is composed here is what a browser
// composes.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const INDEX = R("index.html");
const LANE_SRC = R("finance-lane.js");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const visible = (html) => String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const aria = (html) => (/aria-label="([^"]*)"/.exec(String(html)) || [])[1] || "";
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ finance letterhead: ${msg}`);
  process.exit(1);
};

// ── The real seed, lifted out of index.html ─────────────────────────────────
// Same lift test-finance-lane.mjs performs, for the same reason: a fixture would
// keep passing while the shipped filings broke. `new Function` over the object
// literal only — no page script runs.
function liftSeed() {
  const at = INDEX.indexOf("var FTM_FUNDING = {");
  must(at > 0, "FTM_FUNDING is no longer in index.html");
  const end = INDEX.indexOf("\n    };", at);
  must(end > at, "could not find the end of the FTM_FUNDING literal");
  const literal = INDEX.slice(at + "var FTM_FUNDING = ".length, end + "\n    }".length);
  return new Function("return (" + literal + ");")();
}
const SEED = liftSeed();
const SEED_IDS = Object.keys(SEED);
must(SEED_IDS.length >= 10, `the funding seed is unexpectedly small (${SEED_IDS.length})`);
const AS_OF = (INDEX.match(/var FTM_AS_OF = '([^']*)'/) || [])[1] || "";

// The two people the smoke names, and they have to actually be in the seed or
// the smoke is asserting nothing.
const SMOKE_ON_FILE = ["lee", "curtis"];
for (const id of SMOKE_ON_FILE) {
  must(SEED[id], `the smoke names /p/${id} but there is no filing for it in the seed`);
}

// A lane box with the real roster behind it, so coverage() counts the real
// denominator rather than the seed's own length.
function laneBox(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  vm.runInContext(R("cmp-data.js"), ctx, { filename: "cmp-data.js" });
  win._FTM_BY_ID = {};
  if (!opts.empty) {
    for (const id of SEED_IDS) win._FTM_BY_ID[id] = { id, name: id, funding: SEED[id] };
  }
  win.FTM_AS_OF = AS_OF;
  vm.runInContext(LANE_SRC, ctx, { filename: "finance-lane.js" });
  must(win.PDXFinanceLane, "finance-lane.js did not install PDXFinanceLane");
  return win;
}
const BOX = laneBox();
const L = BOX.PDXFinanceLane;
const ROSTER = BOX.CMP_DATA || {};
must(Object.keys(ROSTER).length > 500, "cmp-data.js did not load a roster");

// THE THIN UTAH HOUSE FILE THE SMOKE ASKS FOR, found rather than typed. A
// hard-coded pid rots the first time the roster is edited; the shape of the
// question — "a state-House member with no filing" — does not.
const THIN_UTAH = Object.keys(ROSTER).filter((id) =>
  /^Utah State Representative$/.test(String((ROSTER[id] || {}).office || "")) &&
  !BOX._FTM_BY_ID[id]);
must(THIN_UTAH.length > 5,
  `the roster carries too few filing-less Utah House members to smoke (${THIN_UTAH.length})`);
const NO_FILE = THIN_UTAH.slice(0, 3).concat(["chew_h68", "nobody_at_all"]);

console.log(`   finance letterhead: ${SEED_IDS.length} filings · ${Object.keys(ROSTER).length} ` +
  `rostered · ${THIN_UTAH.length} Utah House files with none`);

// ── 1 · the control sits behind the record, in the pill row ─────────────────
{
  section("1 · the letterhead is still record-first and the money door is a pill in it");

  const PFF = R("profiles-full.js");
  const MOUNT = "PDXFinanceLane.letterheadChipMount(id)";
  has(PFF, MOUNT, "the letterhead mounts the money control");

  // ORDER IS THE WHOLE CLAIM. Money is a side lane, and a side lane that renders
  // above the name and the formal-record chips is the letterhead's lead read no
  // matter how small its type is.
  const order = [
    ['<h2 class="profile-name">', "the person's name"],
    ['class="profile-office"', "the office and district"],
    ["_recChipsMount()", "the formal-record chips"],
    ["PDXWordAction.compactBadgeMount", "the ⚖️ chip"],
    [MOUNT, "the 💰 chip"],
    ['<span class="profile-party">', "the party pill"],
  ];
  let last = -1;
  let lastWhat = "the top of the letterhead";
  for (const [needle, what] of order) {
    const at = PFF.indexOf(needle);
    ok(at > 0, `the letterhead renders ${what}`);
    ok(at > last, `${what} comes after ${lastWhat}`);
    last = at; lastWhat = what;
  }
  // …and the whole pill row is still inside the identity block, above the ring's
  // own column. A money chip that drifted into .profile-hero-score would be
  // sitting in the slot reserved for the one headline read.
  const scoreCol = PFF.indexOf('<div class="profile-hero-score">');
  ok(scoreCol > 0 && PFF.indexOf(MOUNT) < scoreCol,
    "the money chip is in the identity block, not in the headline-read column");

  // A MOUNT, NOT AN INTERPOLATION, and guarded — a person file must render on a
  // page where finance-lane.js has not arrived.
  const callAt = PFF.indexOf(MOUNT);
  const call = PFF.slice(callAt - 200, callAt + MOUNT.length + 40);
  has(call, "typeof window.PDXFinanceLane.letterheadChipMount === 'function'",
    "the mount is guarded, so a page without the lane still renders a letterhead");
  ok(/\?[\s\S]*:\s*''/.test(call), "…and falls back to nothing rather than to a placeholder");
  for (const id of SMOKE_ON_FILE.concat(NO_FILE.slice(0, 1))) {
    has(L.letterheadChipMount(id), 'class="pdx-mchip-host"',
      `${id}: the mount emits a host the chip can arrive into`);
  }

  // NO NEW NAV ITEM. The control is a pill on one page; it did not become an
  // entry in the site chrome.
  const navBlock = INDEX.slice(INDEX.indexOf("<nav"), INDEX.indexOf("</nav>") + 6);
  ok(navBlock.length > 40, "index.html still has a nav to check");
  for (const bad of ["pdx-mchip", "letterheadChipMount", "chipRead"]) {
    lacks(navBlock, bad, `the site nav gained no money-chip item ("${bad}")`);
  }
}

// ── 2 · on a file that exists it counts, it does not rate ───────────────────
{
  section("2 · a pid with a filing gets a control whose text is counts, never a grade");

  // The vocabulary of a rating, in every form this codebase has ever used for
  // one. "%" is first because the two chips beside this one both carry a
  // percentage, and a third one inches away is how a reader learns that a
  // letterhead grades people.
  const RATING = ["%", "score", "grade", "graded", "level", "rank", "ranked", "rating",
    "tier", "verdict", "/100", "out of 100", "points", "signal", "constituents-first",
    "constituents first", "special-interest heavy", "mixed funding", "a+", "a-", "b+",
    "grassroots", "well-funded", "worst", "best"];

  for (const id of SEED_IDS) {
    const cr = L.chipRead(id);
    eq(cr.state, "file", `${id}: a filing on file reads as \`file\``);
    const html = L.letterheadChipHtml(id);
    ok(html.indexOf("<button") === 0, `${id}: the control is present, as a control`);
    const words = visible(html).toLowerCase();
    const label = aria(html).toLowerCase();
    for (const bad of RATING) {
      lacks(words, bad, `${id}: the chip's text carries no "${bad}"`);
      // THE ACCESSIBLE NAME IS TEXT TOO. It is the longer copy, it is the copy
      // nobody re-reads, and a screen-reader user hearing "score" is being told
      // the same wrong thing louder.
      lacks(label, bad, `${id}: the chip's accessible name carries no "${bad}"`);
    }
    // COUNTS / COMPOSITION / DISCLOSURE — the three things the control is for,
    // and each one is a fact about a document.
    has(words, "itemized", `${id}: the dollars say what kind of dollars they are`);
    has(words, "top source:", `${id}: …the composition names its largest reported source`);
    ok(/\d+ of \d+ filed/.test(words) || /\d+ filings on file/.test(words),
      `${id}: …and the coverage counts ride along`);
    // …and none of the reads it must never feed is named on it.
    for (const k of (L.NEVER_FEEDS || [])) {
      lacks(words, String(k).toLowerCase(), `${id}: the chip does not name ${k}`);
    }
  }

  // The figure is the lane's own composition read, not a second sum computed for
  // the letterhead. Two figures for one filing is how they come to disagree.
  for (const id of SMOKE_ON_FILE) {
    const c = L.read(id);
    ok(c, `${id}: the lane composes a filing`);
    has(visible(L.letterheadChipHtml(id)), c.receiptsFmt,
      `${id}: the chip's figure is the lane's own itemized base`);
  }
}

// ── 3 · the click lands on the money section of this page ───────────────────
{
  section("3 · the control's action is the existing finance block on this file, reached by calling it");

  // A document just real enough to answer the question the jump asks of it: is
  // there a node with the section's id, and what sits after it. The anchor is
  // aria-hidden and zero-height in the shipped markup, so "did the focus land on
  // the anchor or on the block it marks" is a real distinction.
  function docBox(opts) {
    opts = opts || {};
    const win = laneBox();
    const CL = win.PDXFinanceLane;
    const log = [];
    const block = {
      id: CL.SECTION_ID + "-block", attrs: { tabindex: null },
      hasAttribute(k) { return this.attrs[k] != null; },
      setAttribute(k, v) { this.attrs[k] = v; },
      getAttribute(k) { return this.attrs[k] == null ? null : this.attrs[k]; },
      focus() { log.push("focus:block"); },
      scrollIntoView() { log.push("scroll:block"); },
    };
    const anchor = {
      id: CL.SECTION_ID, nextElementSibling: block, parentElement: null,
      getAttribute(k) { return k === "aria-hidden" ? "true" : null; },
      hasAttribute() { return true; },
      setAttribute() {},
      focus() { log.push("focus:anchor"); },
      scrollIntoView(o) { log.push("scroll:anchor:" + ((o && o.block) || "")); },
    };
    win.document.getElementById = (id) =>
      (!opts.absent && id === CL.SECTION_ID) ? anchor : null;
    if (!opts.noJump) win._pdxNavJump = (id) => { log.push("navJump:" + id); };
    win._pdxRevealTarget = (id) => { log.push("reveal:" + id); };
    // Every way off this page, wired to shout.
    win.open = (u) => { log.push("windowOpen:" + u); return null; };
    win.PDXPerson = { open: (p) => { log.push("personOpen:" + p); return true; } };
    win.showProfile = (p) => { log.push("showProfile:" + p); };
    win.PDXIssueView = { open: (i) => { log.push("issueOpen:" + i); } };
    win.history = { pushState: (a, b, u) => { log.push("pushState:" + u); } };
    return { win, CL, log, block, anchor };
  }

  // THE NORMAL PATH: the rail's own jump owns the reveal-then-measure, and the
  // focus lands on the block rather than on the invisible marker above it.
  {
    const { CL, log, block } = docBox();
    const ret = CL.openSection();
    eq(ret, false, "openSection() returns false, so an inline handler cannot navigate after it");
    has(log.join(","), "navJump:" + CL.SECTION_ID,
      "the click hands the money section's own id to the profile rail's jump");
    ok(log.indexOf("focus:block") >= 0,
      "…and focus lands on the money block, not on the aria-hidden marker above it");
    ok(log.indexOf("focus:anchor") < 0,
      "…so a keyboard reader is not parked on a zero-height anchor");
    eq(block.getAttribute("tabindex"), "-1",
      "…the block is made focusable without joining the tab order");
    ok(log.indexOf("navJump:" + CL.SECTION_ID) < log.indexOf("focus:block"),
      "the reveal runs before the focus, so a deferred stage exists by the time it is focused");
    // AND NOTHING LEFT THE PAGE.
    for (const exit of ["windowOpen", "personOpen", "showProfile", "issueOpen", "pushState"]) {
      lacks(log.join(","), exit, `the click takes no exit off the person file ("${exit}")`);
    }
  }

  // THE FALLBACK PATH: no rail on the page, so the lane reveals and scrolls the
  // same id itself. Same target, one less helper.
  {
    const { CL, log } = docBox({ noJump: true });
    CL.openSection();
    has(log.join(","), "reveal:" + CL.SECTION_ID,
      "without the rail the lane still reveals the section before scrolling to it");
    has(log.join(","), "scroll:anchor:start",
      "…and scrolls to the section's own anchor on this page");
    lacks(log.join(","), "windowOpen", "…without opening anything");
  }

  // THE DEFERRED STAGE: the node is genuinely not there yet. The jump must be a
  // no-op that returns, not a throw that leaves the letterhead half-wired.
  {
    const { CL, log } = docBox({ absent: true });
    let threw = false;
    try { eq(CL.openSection(), false, "a missing target still returns false"); }
    catch (e) { threw = true; }
    ok(!threw, "a click before the money stage has mounted does not throw");
    lacks(log.join(","), "focus:", "…and focuses nothing, rather than focusing the body");
  }

  // The target exists in the shipped page, and it is the profile's own section
  // rather than the site-level index.
  eq(L.SECTION_ID, "pdxsec-funding", "the control targets the money section on the person file");
  has(INDEX, `id="${L.SECTION_ID}"`, "…and that anchor is emitted by the shipped money section");
  for (const id of SMOKE_ON_FILE.concat(NO_FILE.slice(0, 2))) {
    const html = L.letterheadChipHtml(id);
    has(html, "PDXFinanceLane.openSection()", `${id}: the control's one action is that jump`);
    lacks(html, "#follow-the-money", `${id}: …and it is not the site-level money index`);
    lacks(html, "href=", `${id}: …nor a route change`);
  }
}

// ── 4 · an absent file is not a zero ───────────────────────────────────────
{
  section("4 · a pid with no finance gets an honest empty, never a badge-as-zero");

  for (const id of NO_FILE) {
    const cr = L.chipRead(id);
    eq(cr.state, "empty", `${id}: no filing reads as \`empty\``);
    const html = L.letterheadChipHtml(id);
    ok(html.length > 60, `${id}: the state renders rather than vanishing into "no chip"`);
    // THE FIGURE SLOT IS WHERE A ZERO WOULD LIVE. Whatever the empty state puts
    // in it, it may not be a number: "$0", "0 sources", "0%" and a bare "0" are
    // all readings of a person assembled out of data nobody collected.
    const fig = (/<span class="pdx-mchip-fig">([^<]*)<\/span>/.exec(html) || [])[1] || "";
    ok(fig.length > 0, `${id}: the empty state still says something in the figure slot`);
    ok(!/\d/.test(fig), `${id}: …and it is not a digit ("${fig}")`);
    for (const bad of ["$", "%", "0"]) {
      lacks(fig, bad, `${id}: the empty figure carries no "${bad}"`);
    }
    const words = visible(html).toLowerCase();
    has(words, "no money file on hand", `${id}: it says plainly that nothing is on file`);
    // NOR A FAKE CLEAN. The other half of the same failure: an absence dressed
    // as a finding in the person's favour.
    for (const bad of ["clean", "no concerns", "nothing to report", "no issues", "clear",
      "in the clear", "unremarkable", "good", "score", "grade", "level", "rank", "/100"]) {
      lacks(words, bad, `${id}: the empty state does not say "${bad}"`);
    }
    // The reason a blank is blank goes in the long form, where there is room.
    const label = aria(html);
    has(label, "missing data", `${id}: the accessible name carries the coverage disclosure`);
    has(label, "not a finding about the person", `${id}: …including that it is not a finding`);
    has(label, "money section on this file", `${id}: …and where to go for the source gap`);
  }

  // NO COLOUR GRADE ACROSS THE STATES. One class, no inline style, in all three
  // — a chip that went green on a filing and grey on an absence would be
  // delivering a verdict about coverage.
  const states = [SEED_IDS[0], NO_FILE[0]];
  const classes = states.map((id) => (/class="(pdx-mchip)"/.exec(L.letterheadChipHtml(id)) || [])[1]);
  eq(new Set(classes).size, 1, "the on-file and empty states render under one chip class");
  for (const id of states) {
    ok(!/style="/.test(L.letterheadChipHtml(id)), `${id}: no inline colour of its own`);
    ok(!/aria-hidden="true">💰<\/span>[\s\S]*<(svg|canvas|img)/.test(L.letterheadChipHtml(id)),
      `${id}: no graph rode up onto the letterhead`);
  }

  // …AND THE ROSTER IS DEEP ENOUGH FOR THIS TO MATTER. If filings covered the
  // roster the empty state would be a corner case; they cover a small minority,
  // so it is the common case and the assertions above are the common path.
  const cov = L.coverage();
  ok(cov.onFile < cov.roster / 10,
    `filings cover a small minority of the roster (${cov.onFile} of ${cov.roster}), ` +
    "so the empty chip is the one most readers see");
  eq(cov.thin, true, "…and the lane says so itself");
}

// ── 5 · the mount is a display object: twin boot ────────────────────────────
{
  section("5 · Direction Match and the formal pattern index are byte-identical with the control and without");

  const FILES = [
    "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
    "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
    "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
    "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
    "publication-floor.js", "profile-spine.js", "profiles-full.js",
  ];
  const SRC = FILES.map((f) => [f, R(f)]);
  const { byMember } = buildCorpus(ROOT);
  const ranked = [...byMember.entries()].sort((a, b) => b[1].length - a[1].length);
  const [PID, items] = ranked[0];
  const [PID2, items2] = ranked[1] || [];
  must(items.length > 40, `the deepest corpus member is too thin (${PID}: ${items.length})`);

  // THE LANE SHIPS IN BOTH BOOTS. This is not test-finance-lane.mjs §7's question
  // ("does loading the lane move a record read") asked a second time — the lane,
  // the filing index and the accessor are identical on both sides here, and so is
  // the DOM. The only difference is whether the letterhead control was mounted
  // and its deferred re-read allowed to run, which is the one thing §7 never
  // does: §7 loads the lane and never renders anything out of it.
  const snapshot = (mountControl) => {
    const win = makeSandbox();
    const ctx = vm.createContext(win);
    // A REAL TIMER QUEUE AND A DOCUMENT THAT CAN FIND A HOST, installed on BOTH
    // sides. The sandbox ships a no-op setTimeout and a querySelector that always
    // returns null, and under those two the chip's deferred re-read exits on its
    // first line — the drain would be decorative and this section would be
    // asserting about a code path it never entered. (It was, until a mutation
    // that made the re-read poke PDXVotingRecord sailed through.)
    const queue = [];
    win.setTimeout = (fn) => { queue.push(fn); return queue.length; };
    const hosts = new Map();
    let repaints = 0;
    win.document.querySelector = (sel) => {
      const uid = (/data-pdx-mchip-host="([^"]+)"/.exec(String(sel)) || [])[1];
      return (uid && hosts.get(uid)) || null;
    };
    const register = (html, pid) => {
      const uid = (/data-pdx-mchip-host="([^"]+)"/.exec(html) || [])[1];
      const state = (/data-pdx-mchip-state="([^"]+)"/.exec(html) || [])[1] || null;
      if (!uid) return null;
      hosts.set(uid, {
        firstChild: { getAttribute: (k) => (k === "data-pdx-mchip-state" ? state : null) },
        set innerHTML(v) { repaints++; },
        get innerHTML() { return ""; },
      });
      return { uid, pid, state };
    };
    const drain = () => {
      let n = 0;
      while (queue.length && n < 20000) { const fn = queue.shift(); try { fn(); } catch (e) {} n++; }
    };

    win.PROFILES = win.CMP_DATA;
    for (const [f, src] of SRC) vm.runInContext(src, ctx, { filename: f });
    win.PROFILES = win.CMP_DATA;
    win._FTM_BY_ID = {};
    win.FTM_AS_OF = AS_OF;
    vm.runInContext(LANE_SRC, ctx, { filename: "finance-lane.js" });
    const before = Object.keys(win).sort().join(",");

    // The ids a letterhead calls this for: the member under test, everyone with a
    // filing, and forty rostered people with none — so all three states mount and
    // the empty one, which is the common case, is the bulk of them.
    const ids = [PID].concat(PID2 ? [PID2] : []).concat(SEED_IDS)
      .concat(Object.keys(win.CMP_DATA).slice(0, 40));
    const attachIndex = () => {
      for (const id of SEED_IDS) win._FTM_BY_ID[id] = { id, name: id, funding: SEED[id] };
      // …including a filing on the member under test, which is the strongest form
      // of the question: does a filing on THIS person, rendered on THIS person's
      // letterhead, move THIS person's record read?
      win._FTM_BY_ID[PID] = { id: PID, name: PID, funding: SEED[SEED_IDS[0]] };
    };
    let mounted = 0;
    const mountRound = () => {
      const out = [];
      for (const id of ids) {
        const html = win.PDXFinanceLane.letterheadChipMount(id);
        if (html && html.indexOf("pdx-mchip-host") >= 0) { mounted++; out.push(register(html, id)); }
      }
      return out.filter(Boolean);
    };

    let expectedRepaints = 0;
    if (mountControl) {
      // FIRST, THE RACE THE DEFERRED RE-READ EXISTS FOR: a letterhead built before
      // index.html's Follow-the-Money IIFE has attached its index. Every chip
      // mounts empty, the index arrives, and the queued re-reads repaint — which
      // is the only branch of that callback that ever writes to the DOM.
      const cold = mountRound();
      attachIndex();
      expectedRepaints = cold.filter((h) =>
        h.state === "empty" && win.PDXFinanceLane.chipRead(h.pid).state !== "empty").length;
      drain();
      // THEN THE WARM CASE: mounted with the index already in place. Nothing here
      // may repaint — a chip that is already telling the truth is never rewritten
      // under a reader — so this round adds nothing to the expected count.
      mountRound();
      drain();
    } else {
      attachIndex();
    }
    const after = Object.keys(win).sort().join(",");
    win._pdxFinanceSignal = (pid) => win.PDXFinanceLane.read(pid);
    must(win._pdxFinanceSignal(PID), "the finance seed did not attach to the test member");

    const out = [];
    const readMember = (pid, list, tag) => {
      win.PDXVotingRecord.noteMember(pid, list);
      // A THIRD MOUNT ROUND, AFTER THE ROLL-CALL RECORD LANDED. On a warm profile
      // this is the real ordering, and it is the one ordering in which a mount
      // that wrote to PDXVotingRecord could not be papered over by a later
      // noteMember() call.
      if (mountControl) { mountRound(); drain(); }
      const wa = win.PDXWordAction.read(pid, win.CMP_DATA[pid]);
      out.push([tag, wa && wa.pct, wa && wa.token, wa && wa.verdict, wa && wa.publishable,
        JSON.stringify((wa && wa.counts) || null), JSON.stringify((wa && wa.tiers) || null),
        JSON.stringify((wa && wa.floors) || null), JSON.stringify((wa && wa.coverage) || null)].join("|"));
      const rows = (win.PDXConsistency.formalPatternIndex.rows(pid) || []).map((r) =>
        [r.key, r.tier, r.token, r.n, r.adv, r.opp, r.confidence].join(":"));
      out.push([tag + ":tiers", rows.length, win.PDXConsistency.formalPatternIndex.count(pid),
        rows.join(",")].join("|"));
      const fl = win.PDXPublicationFloor.read(pid);
      out.push([tag + ":floor", fl.publishable, fl.cited, fl.promises, (fl.reasons || []).join(";")].join("|"));
      out.push([tag + ":mapped", JSON.stringify(win._pdxRecordMappedCounts(pid) || null)].join("|"));
    };
    readMember(PID, items, "dm");
    // A SECOND MEMBER, so the comparison is not resting on one file's arithmetic.
    if (PID2) readMember(PID2, items2, "dm2");
    return { snap: out.join("\n"), mounted, repaints, expectedRepaints,
             leaked: before === after ? "" : "yes" };
  };

  const off = snapshot(false);
  const on = snapshot(true);
  ok(off.snap.length > 300, `the record snapshot has something in it (${off.snap.length} chars)`);
  ok(on.mounted > 100, `the mounted boot really mounted the control (${on.mounted} hosts)`);
  eq(off.mounted, 0, "…and the unmounted boot mounted none");
  // THE DRAIN IS LOAD-BEARING, AND EXACT. If nothing repainted the deferred
  // re-read never ran; if more repainted than gained a filing, the callback is
  // rewriting chips that were already telling the truth.
  ok(on.expectedRepaints >= SEED_IDS.length,
    `the cold round really did leave chips to repaint (${on.expectedRepaints})`);
  eq(on.repaints, on.expectedRepaints,
    "the deferred re-read repaints exactly the chips that went from no file to a file");
  eq(off.repaints, 0, "…and nothing repainted in the boot that mounted nothing");
  eq(on.snap, off.snap,
    "Direction Match, the formal pattern index, the publication floor and the mapped counts " +
    "are identical with the letterhead control mounted and without it");
  // THE MOUNT LEFT NOTHING BEHIND. A control that installed a global on its way
  // past would be a finance read any later engine could pick up.
  eq(on.leaked, "", "mounting the control installed no new global on the window");
  console.log(`   twin boot · ${on.mounted} chips mounted · ${on.repaints} deferred repaints · ` +
    `${off.snap.length}-char record snapshot identical either way`);
}

// ── 6 · the scoring paths do not know the chip exists ──────────────────────
{
  section("6 · word-action.js, consistency.js and the ordering owners name no finance identifier");

  // The lane's identifiers AND the chip's. test-finance-lane.mjs fences the
  // first set; the second set is new surface and is the one a well-meaning
  // "just read the chip state here" edit would reach for.
  const FIN = /PDXFinanceLane|_pdxFinance|_financeSignal|smallDollar|selfFunded|largeIndividual|pdx-mchip|letterheadChip|chipRead|pdxsec-funding|_FTM_BY_ID|FTM_AS_OF|FTM_FUNDING/;
  // Everything the Do-not list names: Direction Match / Word vs Action, the
  // consistency and formal-tier paths, the publication floor, the record lane,
  // ballot ordering, and the Eye's own rank.
  const SCORING = ["word-action.js", "consistency.js", "publication-floor.js",
    "voting-record.js", "stance-helpers.js", "alignment-tool.js", "say-vs-do.js",
    "support-lane.js", "self-defection.js", "all-seeing-eye.js", "profile-evidence.js"];
  for (const f of SCORING) {
    const src = R(f);
    ok(src.length > 100, `${f} is present to scan`);
    const hit = (src.match(FIN) || [])[0];
    ok(!hit, `${f} names no finance identifier${hit ? ` (found "${hit}")` : ""}`);
  }
  // The two letterhead chips sit inches apart and know nothing about each other.
  ok(!/pdx-mchip|letterheadChip/.test(R("word-action.js")),
    "the ⚖️ letterhead badge knows nothing about the 💰 one beside it");
  ok(!/pdxwa-|compactBadge/.test(LANE_SRC),
    "…and the 💰 chip reads nothing off the ⚖️ one");
  // The lane still says so about itself, in the two ways a later reader checks.
  eq(L.scored, false, "the lane declares itself unscored");
  for (const k of ["directionMatch", "wordVsAction", "formalPatternTier",
    "publicationFloor", "ballotSort"]) {
    ok((L.NEVER_FEEDS || []).indexOf(k) >= 0, `NEVER_FEEDS still names ${k}`);
  }
  // NO PARTY FRAMING, anywhere on the control. A filing is a document; a party
  // is not one of its facts.
  for (const id of SEED_IDS.concat(NO_FILE)) {
    const both = (visible(L.letterheadChipHtml(id)) + " " + aria(L.letterheadChipHtml(id))).toLowerCase();
    for (const bad of ["republican", "democrat", "democratic", "gop", "left-wing",
      "right-wing", "partisan", "party"]) {
      lacks(both, bad, `${id}: the control carries no party framing ("${bad}")`);
    }
  }
  // NO INVENTED FILINGS: the ids the chip speaks in the `file` state are exactly
  // the ids the shipped index holds, and not one more.
  const spoken = Object.keys(ROSTER).filter((id) => L.chipRead(id).state === "file").sort();
  eq(spoken.join(","), SEED_IDS.filter((id) => ROSTER[id]).sort().join(","),
    "the control claims a filing for exactly the rostered people who have one");
}

// ── 7 · smoke ──────────────────────────────────────────────────────────────
{
  section("7 · /p/lee and /p/curtis against a thin Utah House file");

  const line = (id) => {
    const cr = L.chipRead(id);
    const w = visible(L.letterheadChipHtml(id));
    return `   /p/${id} · ${cr.state} · ${w}`;
  };
  for (const id of SMOKE_ON_FILE) {
    console.log(line(id));
    eq(L.chipRead(id).state, "file", `/p/${id}: the control reads the filing`);
  }
  const thin = THIN_UTAH[0];
  console.log(line(thin) + `  (${(ROSTER[thin] || {}).name})`);
  eq(L.chipRead(thin).state, "empty", `/p/${thin}: no filing, and the control says so`);
  // The one-line rule holds across all three, so the letterhead cannot grow a row.
  for (const id of SMOKE_ON_FILE.concat([thin])) {
    const w = visible(L.letterheadChipHtml(id));
    ok(w.split("·").length <= 4, `/p/${id}: a figure plus at most three highlights`);
    ok(w.indexOf("\n") < 0, `/p/${id}: …on one line`);
    has(w, "💰", `/p/${id}: …under the money glyph`);
  }
}

// ── Result ──────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  failures.forEach((f) => console.error(`   ✗ ${f}`));
  console.error(`\n✗ finance letterhead: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ finance letterhead: all ${passed} assertions passed`);
