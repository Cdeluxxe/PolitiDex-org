#!/usr/bin/env node
/**
 * test-eye-formal-family.mjs — Formal answers with files; a family opens the desk
 * ─────────────────────────────────────────────────────────────────────────────
 * Two things went wrong at once in the Eye, and both of them turned a formal
 * question into something else.
 *
 * The first was an address that could not be honoured. A core issue — "Climate,
 * Energy & Land" — is a FAMILY of keys, not a key: resolveIssue() gives a core an
 * empty focusKey and issueProfileHtml() paints a census for one key, so there is
 * nothing for /i/climate_energy to mount. The row was an anchor on that path
 * anyway. Tapping it navigated, the panel refused the empty body, and the reader
 * was left on the front page having been promised a file.
 *
 * The second was a reading standing in for the record. Formal opened with the
 * Word-vs-Action ranking — "Climate, Energy & Land · Ranked by consistency · who
 * backs up their words first", party letters down the rows, "See all 882 people
 * ranked" beneath — which is a characterisation of 882 people, not the formal
 * file the query asked for.
 *
 * What this file pins:
 *
 *   1. THE CONSISTENCY RANKING IS NOT A FORMAL ANSWER. Zero "ranked by
 *      consistency", zero "backs up their words", zero "See all N people ranked"
 *      anywhere in painted Formal markup — and the same query in Public still
 *      paints all three, so the absence is a lane rule and not a dead feature.
 *   2. A FAMILY ROW IS A DOOR, NOT AN ADDRESS. Every family row the Eye paints is
 *      a <button>, carries no /i/ href, and keeps its key, its label and its tint.
 *   3. ACTIVATING IT OPENS THE DESK ON THAT FAMILY. The tap calls the desk's one
 *      issue entry point, pdxDoor1Issue(core), and never PDXIssueView — and what
 *      the desk paints is the child shelf plus the sentence saying this is a
 *      family of N keys rather than a single file.
 *   4. A LEAF IS STILL AN ADDRESS. /i/lands_preserve opens the leaf file, stamped;
 *      /i/climate_energy mounts no census, stamps nothing, and lands on the family
 *      shelf with that same sentence and an honest notice.
 *
 * Real shipped modules in a node:vm sandbox: the real ISSUE_MAP, the real family
 * table, the real roster, the real record corpus, and issue-view.js LOADED — so
 * "the ranking is not here" is a claim about a live builder that could have run.
 *
 *   node scripts/test-eye-formal-family.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// Load order, as index.html defers them. issue-view.js is in here on purpose:
// it is the module that builds the ranking, and a test that proves its absence
// while it is unloaded proves nothing.
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
const PANEL = R("issue-file.js");
const ADDR = R("pdx-issue-profile.js");

const LEAF = "lands_preserve";
const CORE = "climate_energy";
const ORIGIN = "https://www.politidex.fyi";
// The two queries the smoke names, plus the family's own words.
const QUERIES = ["land pres", "lands preserve", "climate", "climate energy"];
// The reading, in the words the defect report quoted.
const RANKING = ["Ranked by consistency", "ranked by consistency", "backs up their words", "people ranked"];

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const has = (hay, needle, msg) => ok(String(hay).indexOf(needle) >= 0, `${msg} — missing ${JSON.stringify(needle)}`);
const no = (hay, needle, msg) => ok(String(hay).indexOf(needle) < 0, `${msg} — found ${JSON.stringify(needle)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ eye formal family: STALE HARNESS — ${msg}`);
  process.exit(2);
};

const corpus = buildCorpus(ROOT);
must(corpus && corpus.byMember && corpus.byMember.size > 100,
  "the record corpus did not load enough members to sweep");

// ── a DOM real enough for both doors ────────────────────────────────────────
// The Eye needs classes that actually stick (it will not paint into a closed
// panel), and the desk and the arrival need ids, a canonical link and a history.
function mkNode(id, reg) {
  const set = new Set();
  const n = {
    id: id || "", className: "", innerHTML: "", textContent: "", value: "", tagName: "DIV",
    style: { setProperty() {}, removeProperty() {} }, dataset: {}, children: [], hidden: false,
    attrs: {}, firstChild: null,
    classList: {
      add: (c) => set.add(c), remove: (c) => set.delete(c),
      toggle: (c, on) => (on === undefined ? (set.has(c) ? set.delete(c) : set.add(c)) : (on ? set.add(c) : set.delete(c))),
      contains: (c) => set.has(c),
    },
    setAttribute(k, v) { n.attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(n.attrs, k) ? n.attrs[k] : null; },
    removeAttribute(k) { delete n.attrs[k]; },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    // Registered on append, at every depth: the file panel builds its overlay,
    // its title host and its ledger with createElement and only then hangs the
    // whole tree off the body, so a getElementById that only knows about
    // directly-appended nodes cannot see the ledger the census lands in.
    appendChild(c) { n.children.push(c); if (c && c.id && reg) reg(c); return c; },
    insertBefore(c) { n.children.unshift(c); if (c && c.id && reg) reg(c); return c; },
    removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, blur() {}, click() {},
    scrollIntoView() {}, querySelector() { return null; }, querySelectorAll() { return []; },
    closest() { return null; }, contains() { return true; },
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 320, height: 44, bottom: 44, right: 320 }),
  };
  return n;
}

// THE RESULT ROWS, WIRED. wire() reaches for .pdx-eye-res wrappers and hangs the
// row's click on the .pdx-eye-item inside each one; section 3 needs to press one.
// So the panel synthesises those wrappers from the markup it was just given —
// one per data-i, cached per innerHTML so the node wire() attached to is the same
// node the test clicks.
function eyePanelNode(reg) {
  const p = mkNode("pdx-eye-panel", reg);
  let cachedHtml = null;
  let cached = [];
  function wrappers() {
    const html = String(p.innerHTML || "");
    if (html === cachedHtml) return cached;
    cachedHtml = html;
    cached = [];
    for (const m of html.matchAll(/class="pdx-eye-res" data-i="(\d+)"/g)) {
      const item = mkNode("", reg);
      const clicks = [];
      item.addEventListener = (t, f) => { if (t === "click") clicks.push(f); };
      item.__clicks = clicks;
      const res = mkNode("", reg);
      res.setAttribute("data-i", m[1]);
      res.__item = item;
      res.querySelector = (sel) => (String(sel).indexOf("pdx-eye-item") >= 0 ? item : null);
      cached.push(res);
    }
    return cached;
  }
  p.querySelectorAll = (sel) => (String(sel) === ".pdx-eye-res" ? wrappers() : []);
  p.__rows = wrappers;
  return p;
}

function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const sess = {};
  win.sessionStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(sess, k) ? sess[k] : null),
    setItem: (k, v) => { sess[k] = String(v); },
    removeItem: (k) => { delete sess[k]; },
  };
  win.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  win.auth = { currentUser: null };
  // The arrival as the browser presents it after the 200 rewrite: the bar says
  // /i/<something> and the document is index.html.
  const path = opts.path || "/";
  win.location = { href: ORIGIN + path, pathname: path, search: "", hash: "", origin: ORIGIN };
  win.__replaced = [];
  win.history = {
    replaceState(a, b, u) { win.__replaced.push(String(u)); win.location.pathname = String(u); },
    pushState(a, b, u) { win.__replaced.push(String(u)); },
  };
  win.__notices = [];
  win.PDXShareLinks = {
    notice(id, kicker, message) { win.__notices.push({ id, kicker, message }); return true; },
  };
  win.__listeners = {};
  win.addEventListener = (t, f) => { (win.__listeners[t] = win.__listeners[t] || []).push(f); };

  const byId = {};
  const reg = (n) => { if (n && n.id) byId[n.id] = n; };
  const mk = (id) => { const n = mkNode(id, reg); reg(n); return n; };
  ["pdx-eye", "pdx-eye-input", "pdx-eye-clear", "pdx-door1-workspace", "pdx-d1-body"].forEach(mk);
  const panel = eyePanelNode(reg);
  byId["pdx-eye-panel"] = panel;
  byId["pdx-eye-input"].tagName = "TEXTAREA";
  win.document.createElement = () => mkNode("", reg);
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = mk("body");
  const canonical = mkNode("", reg);
  canonical.attrs.href = ORIGIN + "/";
  win.__canonical = canonical;
  win.document.querySelector = (sel) => (String(sel).indexOf("canonical") >= 0 ? canonical : null);
  win.__byId = byId;

  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  win.__loadErrors = [];
  for (const [f, src] of SRC) {
    try { vm.runInContext(src, ctx, { filename: f }); }
    catch (e) { win.__loadErrors.push(`${f}: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  // The two shipped reads that go through /api/voting-record, answered from the
  // one corpus so both doors discover the same field.
  win.PDXVotingRecord.fetchIssueRecords = function (keys) {
    const ks = (keys || []).slice();
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
  win.PDXVotingRecord.fetchCompare = function () { return Promise.resolve({ byPid: {} }); };
  win.__routed = [];
  win.pdxDoorWork = (id) => { win.__routed.push("work:" + id); return true; };
  win.pdxDoor = (mode) => { win.__routed.push("door:" + mode); return true; };
  vm.runInContext(DESK, ctx, { filename: "door1-workspace.js" });
  win._issueLabel = (k) => (win.ISSUE_MAP[k] && win.ISSUE_MAP[k].label) || "";
  win.PDXSpotlight = { list: () => [] };
  win.PDXLazyData = { ensure: () => Promise.resolve(true), loaded: () => true, whenReady: (k, cb) => cb() };
  win.PDX_BILLS_INDEX = win.PDX_BILLS_INDEX || [];
  vm.runInContext(EYE, ctx, { filename: "all-seeing-eye.js" });
  vm.runInContext(PANEL, ctx, { filename: "issue-file.js" });
  vm.runInContext(ADDR, ctx, { filename: "pdx-issue-profile.js" });

  win.__panel = panel;
  win.__eye = byId["pdx-eye"];
  win.__input = byId["pdx-eye-input"];
  return win;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

function search(w, q, lane) {
  w.PDXEye.lane(lane || "formal");
  w.__eye.classList.add("is-open");
  w.__input.value = q;
  w.PDXEye.rebuild();
  w.PDXEye.render(q);
  return String(w.__panel.innerHTML || "");
}
const deskPaint = (w) => {
  w.PDXDoor1.sync();
  const h = w.document.getElementById("pdx-d1-body");
  return h ? String(h.innerHTML) : "";
};
// The same sequence a cold /i/ arrival causes: adopt, let the field warm, adopt
// again for the row the second pass discovers.
async function arrive(w) {
  const first = w.PDXIssueProfile.adopt();
  await tick(); await tick();
  if (first) w.PDXIssueProfile.adopt();
  return first;
}
// Every row the panel painted, as {tag, kind, key, idx}.
const ROWS = (html) =>
  [...String(html).matchAll(/<(a|button)\b[^>]*class="pdx-eye-item[^"]*"[^>]*?data-i="(\d+)"[^>]*?data-kind="([^"]+)"[^>]*?data-key="([^"]*)"/g)]
    .map((m) => ({ tag: m[1], idx: Number(m[2]), kind: m[3], key: m[4] }));
// The whole open tag of one row, which is where the href would be.
function rowTag(html, kind, key) {
  const re = new RegExp(`<(?:a|button)\\b[^>]*class="pdx-eye-item[^"]*"[^>]*data-kind="${kind}" data-key="${key}"[^>]*>`);
  const m = re.exec(String(html));
  return m ? m[0] : "";
}
function clickRow(w, idx) {
  for (const res of w.__panel.__rows()) {
    if (res.getAttribute("data-i") !== String(idx)) continue;
    const ev = {
      button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
      preventDefault() {}, stopPropagation() {},
    };
    (res.__item.__clicks || []).forEach((f) => f(ev));
    return true;
  }
  return false;
}

// ── the harness has to be pointed at something real ─────────────────────────
const probe = boot();
must(!probe.__loadErrors.length || probe.PDXDoor1,
  `the desk did not load — boot errors: ${probe.__loadErrors.join(" | ")}`);
must(probe.PDXEye && typeof probe.PDXEye.render === "function", "PDXEye.render is unavailable");
must(typeof probe.PDXEye.lane === "function", "PDXEye.lane() is not published — there is no lane to test");
must(probe.PDXIssueView && typeof probe.PDXIssueView.answer === "function",
  "PDXIssueView.answer is not published — the ranking this file excludes does not exist to exclude");
must(probe.PDXIssueFamily && typeof probe.PDXIssueFamily.isCore === "function",
  "PDXIssueFamily.isCore is not published — there is no family table");
must(probe.PDXIssueFamily.isCore(CORE), `${CORE} is no longer one of the cores`);
must(probe.ISSUE_MAP && probe.ISSUE_MAP[LEAF], `${LEAF} is no longer a shipped ISSUE_MAP key`);
must(probe.PDXIssueFamily.coreOf(LEAF) === CORE, `${LEAF} no longer sits under ${CORE}`);
must(probe.PDXIssueProfile && typeof probe.PDXIssueProfile.adopt === "function",
  "pdx-issue-profile.js did not publish PDXIssueProfile.adopt()");
must(probe.PDXIssueFile && typeof probe.PDXIssueFile.open === "function",
  "issue-file.js did not publish PDXIssueFile.open() — the arrival has no stage");
// THE ROW EXTRACTOR AND THE CLICK PATH HAVE TO WORK, or this file is a fast green
// no-op — which is the failure mode every claim below depends on not happening.
{
  const html = search(probe, "climate");
  const fam = ROWS(html).filter((r) => r.kind === "family")[0];
  must(fam && fam.key, "no family row was painted for 'climate' — the extractor found nothing to test");
  must(probe.__panel.__rows().length > 0, "the panel synthesised no .pdx-eye-res wrappers — wire() has nothing to bind");
  let tapped = 0;
  const realIssue = probe.pdxDoor1Issue;
  probe.pdxDoor1Issue = function (k) { tapped++; return realIssue.call(probe, k); };
  must(clickRow(probe, fam.idx), `the family row at data-i="${fam.idx}" has no click handler bound`);
  must(tapped > 0, "clicking a row ran nothing — the activation path in this harness is dead");
  probe.pdxDoor1Issue = realIssue;
}
const KIDS = probe.PDXIssueFamily.childrenOf(CORE) || [];
must(KIDS.length > 1, `${CORE} has ${KIDS.length} child key(s) — it is not a family any more`);
const CORE_LABEL = probe.PDXIssueFamily.label(CORE) || CORE;

console.log(`\n👁️  eye formal — the file answers, the family opens the desk (${CORE}, ${KIDS.length} keys)`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the consistency ranking is not a formal answer");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot();
  for (const q of QUERIES) {
    const formal = search(B, q, "formal");
    ok(formal.length > 200, `formal "${q}" painted nothing at all`);
    for (const phrase of RANKING) {
      no(formal, phrase, `formal "${q}" still leads with the consistency ranking`);
    }
    // "See all 882 people ranked" — the count moves with the roster, so the shape
    // is what is banned, not the number the report happened to see.
    ok(!/See all \d+ (?:person|people) ranked/.test(formal),
      `formal "${q}" printed a "See all N people ranked" footer`);
    ok(!/data-ans-row=/.test(formal), `formal "${q}" painted an answer row from the ranking`);
    ok(!/data-ans-act=/.test(formal), `formal "${q}" painted the ranking's action strip`);
    // AND THE LANE THAT OWNS IT STILL HAS IT. Without this, deleting the builder
    // outright would pass section 1 — and that is a different change from the one
    // this pass made.
    const pub = search(B, q, "public");
    has(pub, "Ranked by consistency", `public "${q}" lost the ranking — this is a lane rule, not a deletion`);
    has(pub, "backs up their words", `public "${q}" lost the ranking's own words`);
    ok(/See all \d+ (?:person|people) ranked/.test(pub), `public "${q}" lost the "See all N people ranked" footer`);
  }
  // The Mandate lane is untouched by this pass and holds no ranking either.
  const mand = search(B, "land pres", "mandate");
  for (const phrase of RANKING) no(mand, phrase, "the mandate lane painted the consistency ranking");
  console.log(`      ${QUERIES.length} queries · formal: 0 rankings · public: ${QUERIES.length} rankings`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a family row is a door, not an address");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot();
  let famRows = 0;
  for (const q of QUERIES) {
    const html = search(B, q, "formal");
    for (const row of ROWS(html)) {
      if (row.kind !== "family") continue;
      famRows++;
      // A CORE MOUNTS NO FILE, so the row may not cite one. Not a lower-ranked
      // address, not a disabled anchor: no href at all.
      eq(row.tag, "button", `the ${row.key} family row is an <${row.tag}> — a core has no file to link to`);
      const tag = rowTag(html, "family", row.key);
      ok(!!tag, `the ${row.key} family row's open tag could not be read`);
      no(tag, "href", `the ${row.key} family row still carries an href`);
      ok(probe.PDXIssueFamily.isCore(row.key),
        `a family row was painted for ${JSON.stringify(row.key)}, which is not one of the cores`);
      // Everything else about the row survives: the key it opens, the tint the
      // family owns, and a sub-line that says where the tap goes.
      has(tag, 'type="button"', `the ${row.key} family row is not a real button`);
      has(tag, 'data-ic="on"', `the ${row.key} family row lost its family tint`);
      has(tag, probe.PDXIssueColors.styleFor(row.key), `the ${row.key} family row's tint is not the family's own`);
    }
    // And the leaf rows are still addresses, in the same painted panel.
    const leaf = ROWS(html).filter((r) => r.kind === "issuefile" && r.key === LEAF)[0];
    if (leaf) {
      eq(leaf.tag, "a", `the ${LEAF} file row is an <${leaf.tag}> — a leaf file has an address`);
      has(html, `href="/i/${LEAF}"`, `"${q}" printed the ${LEAF} row without its /i/ address`);
    }
  }
  ok(famRows >= QUERIES.length, `only ${famRows} family row(s) were painted across ${QUERIES.length} queries`);
  const html = search(B, "climate", "formal");
  has(html, "opens the issue desk", "the family row does not say where the tap goes");
  console.log(`      ${famRows} family rows swept · 0 anchors · 0 hrefs`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · activating it opens the desk on that family, not a ranking");
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = boot();
  const html = search(B, "climate", "formal");
  const fam = ROWS(html).filter((r) => r.kind === "family" && r.key === CORE)[0];
  ok(!!fam, `no ${CORE} family row was painted for "climate"`);
  const picks = [];
  const realIssue = B.pdxDoor1Issue;
  B.pdxDoor1Issue = function (k) { picks.push(k); return realIssue.call(B, k); };
  // THE RANKING IS NOT A DESTINATION EITHER. Its three entry points are counted,
  // because "the block is not painted" and "the block is not opened" are two
  // different claims and the row used to make both false.
  // warmVotes and the buildRanking it calls to learn whose records to read are
  // deliberately NOT counted: they are the record read the desk needs before it
  // can print anything at all, and they paint nothing. What may not happen is the
  // READING — the panel, the answer and its coverage line.
  const viewCalls = [];
  for (const m of ["open", "answer", "coverage"]) {
    const real = B.PDXIssueView[m];
    B.PDXIssueView[m] = function () { viewCalls.push(m); return real.apply(B.PDXIssueView, arguments); };
  }
  ok(clickRow(B, fam ? fam.idx : -1), "the family row could not be activated");
  // The desk's own entry point, and only that key. It is called more than once
  // on purpose — pdxDoor1Issue hands off to pdxDoor1Open when the desk is not
  // already in issue mode, and the desk re-picks the stored key on the way in —
  // so what is pinned is WHICH key was opened, not how many times.
  ok(picks.length >= 1, "the family row did not call the desk's issue entry point at all");
  eq(picks.filter((k) => k !== CORE).join(","), "",
    `the family row opened the desk on ${JSON.stringify(picks)} — ${CORE} was expected`);
  eq(viewCalls.join(","), "", `the family row reached PDXIssueView (${viewCalls.join(",")}) instead of the desk`);
  // What the desk paints: the child shelf, in the family's own tint, plus the
  // sentence that says this is a family rather than a file.
  const desk = deskPaint(B);
  has(desk, `is a family of ${KIDS.length} keys, not a single file`,
    "the desk does not say the core is a family rather than a file");
  has(desk, CORE_LABEL.replace(/&/g, "&amp;"), "the desk did not name the family it opened on");
  let chips = 0;
  for (const k of KIDS) {
    if (desk.indexOf(k) >= 0) chips++;
  }
  ok(chips === KIDS.length, `the desk painted ${chips} of ${KIDS.length} child keys`);
  has(desk, probe.PDXIssueColors.styleFor(CORE), "the desk's family shelf is not in the family's tint");
  // NO CENSUS FOR A FAMILY. issueProfileHtml scopes to one key, and this is the set.
  eq(B.PDXIssueProfile.html(CORE), "", "a leaf census was painted for the family itself");
  for (const phrase of RANKING) no(desk, phrase, "the desk painted the consistency ranking");
  console.log(`      pdxDoor1Issue(${CORE}) · ${chips} child keys · 0 PDXIssueView calls`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · a leaf is still an address; a family is not");
// ═════════════════════════════════════════════════════════════════════════════
{
  // THE LEAF, COLD. /i/lands_preserve is the address the smoke taps, and it still
  // opens the one census, stamped and titled.
  const w = boot({ path: `/i/${LEAF}` });
  const key = await arrive(w);
  eq(key, LEAF, "the leaf address did not adopt its own key");
  const body = w.PDXIssueProfile.html(LEAF);
  ok(body.length > 200, `${LEAF} paints no census, so this section proves nothing`);
  const led = w.document.getElementById("pdx-issue-file-ledger");
  ok(!!led, "the file panel never mounted for the leaf address");
  if (led) eq(String(led.innerHTML), body, "the panel body is not the one leaf census");
  ok(!!w.document.getElementById("pdx-issue-file"), "no file panel covered the homepage");
  // THE STAMP. The bar is already on /i/<leaf> — that is how the reader got here,
  // and replaceState is skipped when the path already matches — so what proves the
  // address was adopted rather than merely tolerated is the canonical link.
  eq(String(w.__canonical.attrs.href || ""), ORIGIN + `/i/${LEAF}`,
    "the canonical link was not pointed at the leaf file");
  eq(w.__notices.length, 0, "the leaf address raised a notice, so something did not resolve");
}
{
  // THE FAMILY, COLD. Same door, same modules, an id that has no file: nothing
  // may claim one exists.
  const w = boot({ path: `/i/${CORE}` });
  const key = await arrive(w);
  eq(key, CORE, "the family address did not read its own key off the path");
  eq(w.PDXIssueProfile.html(CORE), "", "a leaf census was painted for a core with no file");
  const led = w.document.getElementById("pdx-issue-file-ledger");
  eq(led ? String(led.innerHTML).trim() : "", "", "the file panel mounted a body for a family address");
  ok(!(w.PDXIssueFile.isOpen && w.PDXIssueFile.isOpen()), "the file panel opened on a family address");
  // NOT STAMPED. The bar, the title and the canonical are for files; this address
  // is not one, so none of them may be rewritten to say it is.
  eq(w.__replaced.filter((u) => String(u).indexOf(`/i/${CORE}`) >= 0).length, 0,
    "the family address was stamped as a file address");
  eq(String(w.__canonical.attrs.href || ""), ORIGIN + "/",
    "the canonical link was pointed at a family address that mounts no file");
  no(String(w.document.title || ""), CORE, "the document title was rewritten to a family id");
  // The reader is told, in the same words the desk uses, and the desk is open on it.
  const notice = w.__notices.filter((n) => n.id === "pdx-issue-family")[0];
  ok(!!notice, "arriving at a family address explained nothing");
  if (notice) {
    has(notice.message, `is a family of ${KIDS.length} keys, not a single file`,
      "the notice does not say the id is a family rather than a file");
    has(notice.message, CORE_LABEL, "the notice does not name the family");
    no(notice.message, "%", "the notice carries a percentage");
  }
  const desk = deskPaint(w);
  has(desk, `is a family of ${KIDS.length} keys, not a single file`,
    "the family shelf does not say the id is a family rather than a file");
  let chips = 0;
  for (const k of KIDS) if (desk.indexOf(k) >= 0) chips++;
  eq(chips, KIDS.length, `the family shelf painted ${chips} of ${KIDS.length} child keys`);
  for (const phrase of RANKING) no(desk, phrase, "the family shelf painted the consistency ranking");
  console.log(`      /i/${LEAF} → census · /i/${CORE} → ${KIDS.length}-key shelf, 0 stamps`);
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ eye formal family: ${failures.length} failure(s), ${passed} passed`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\n✓ eye formal family: all ${passed} assertions passed`);
console.log(`  formal answers with files · ${CORE} opens the desk · /i/${LEAF} still opens`);
