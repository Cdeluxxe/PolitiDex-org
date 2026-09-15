#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-issue-file-first-screen.mjs — the provisions are the first screen, and
// every mapped measure row says why the bill is on this issue
// ─────────────────────────────────────────────────────────────────────────────
// TWO DEFECTS, ONE PAGE.
//
// 1. /i/<key> on a phone opened on its own letterhead. Chip, scope sentence,
//    inventory, clip note, "How this issue was tested" and its rows, the desk
//    and share jumps, the district room — and then, somewhere past the second
//    swipe, the mapped-measure list, which is the thing the address is for. A
//    file whose first screen is its own letterhead is a letterhead with a record
//    attached.
//
// 2. An H.R. 1949-class row printed a number, a title and a label and said
//    nothing about WHY the bill sits on this issue. The sentence that answers it
//    already existed — the curator's rationale on the measure→issue row, the one
//    piece of curated prose every mapped act has — and it was readable from a
//    member's dossier and from the bill file and nowhere on the list a reader
//    actually arrives at.
//
// WHAT THIS FILE PINS:
//
//   1. THE WHY IS THE MAPPING'S OWN SENTENCE. /i/housing lists H.R. 6644 with a
//      why-line whose every sentence appears inside db/vr-issue-seed.json's
//      rationale for that measure on that key. Nothing summarised, nothing
//      reworded, nothing composed by the renderer.
//   2. TWO SENTENCES, CUT NOT SUMMARISED. A long rationale is cut on a sentence
//      boundary by the cleaner's own abbreviation-aware splitter, so "H.R. 6644"
//      and "Sec. 103" are never shredded, and a single 500-character sentence is
//      cut on a word boundary and says so with an ellipsis.
//   3. NO CURATOR SLANG, ON ANY ROW OF ANY KEY. PRIMARY-as-a-label, weights,
//      isPrimary, seed and migration ids, raw snake_case keys: none of it
//      reaches a why-line, because the cleaner is receipt-cards.js's one reader
//      sentence and not a second implementation of that question.
//   4. AN EMPTY RATIONALE PRINTS THE HONEST BLANK. Never a blank row, never a
//      guess. Asserted on the shipped index (which carries no rationale at all),
//      on fixtures whose rationale is empty, null and whitespace, on one that is
//      entirely curator housekeeping, and on a page with no cleaner loaded.
//   5. THE LANE BADGE IS UNTOUCHED. Subject-of-the-bill vs rode-inside is still
//      the PRIMARY/provision tag and the why-line never restates it.
//   6. THE ROW IS THE DOOR, AND THE WHY IS NOT A SECOND BUTTON. A tap on the
//      row's own space opens the bill file; a tap on one of the row's three
//      controls is still that control's tap; the <li> takes no role, no tabindex
//      and no accessible name, so nothing interactive is nested in anything
//      interactive.
//   7. THE MEASURE LIST IS IN THE FIRST SCREEN ON A PHONE. An analytic layout
//      model of the shipped stylesheets — there is no browser in this harness —
//      puts .d1-led-meas's top above the fold on a 390×844 iPhone and on five
//      more devices, and shows the same model putting it hundreds of pixels
//      below the fold before the reorder.
//   8. DESKTOP IS ONE RENDERER STILL. Every declaration this pass added to
//      issue-file.css is inside the phone block bar the one that keeps desktop
//      identical, the panel mounts the builder's string byte-for-byte, and the
//      letterhead's pieces are in the order they were in.
//   9. THE FILES TRAVEL TOGETHER behind a CACHE_VERSION that moved with them.
//  10. EVERY FIX IS LOAD-BEARING. Six probes, each removing one of them, each
//      expected to be caught above.
//
//   node scripts/test-issue-file-first-screen.mjs
//
// Real shipped modules in a node:vm sandbox, the real roster, the real record
// corpus and the real shipped mapping seed.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// Load order, as index.html defers them. receipt-cards.js is here and is not
// optional: it owns window._pdxReaderRationale, and index.html loads it well
// before the desk for exactly this reason.
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
  "receipt-cards.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
const DESK = R("door1-workspace.js");
const PANEL = R("issue-file.js");
const ADDR = R("pdx-issue-profile.js");
const IFCSS = R("issue-file.css");
const D1CSS = R("door1-workspace.css");
const SW = R("sw.js");
const HTML = R("index.html");
const SEED = JSON.parse(R("db/vr-issue-seed.json"));

const KEY = "housing"; // the key that holds H.R. 6644
const NUM = "H.R. 6644";
// A second pair, for the one claim H.R. 6644 cannot carry: the curator wrote it
// two sentences, so the two-sentence cap is invisible on it.
const CAP_KEY = "israel_support";
const CAP_NUM = "S. 1071";
const SWEEP = ["housing", "climate_action", "cost_living", "lands_preserve", "immigration_enforce"];
const ORIGIN = "https://www.politidex.fyi";
const BLANK = "Mapped to this issue; rationale not written yet";

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
// A probe that finds nothing fails loudly rather than turning this file into a
// very fast, very green no-op.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ issue file first screen: STALE PROBE — ${msg}`);
  process.exit(2);
};

const unesc = (t) => String(t)
  .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const flat = (t) => String(t).replace(/\s+/g, " ").trim().toLowerCase();

const corpus = buildCorpus(ROOT);
must(corpus && corpus.byMember && corpus.byMember.size > 100,
  "the record corpus did not load enough members to sweep");

// ── THE SHIPPED MAPPING SEED IS THE SOURCE OF TRUTH FOR CLAIM 1 ─────────────
// Read straight off db/vr-issue-seed.json rather than out of the corpus, so the
// comparison below is against the file that shipped and not against the
// harness's own projection of it.
const seedRationale = (num, key) => {
  for (const m of SEED.measures || []) {
    if (String(m.number).replace(/\s+/g, " ").trim() !== num) continue;
    for (const i of m.issues || []) if (i.issueKey === key) return String(i.rationale || "");
  }
  return "";
};
const SEED_WHY = seedRationale(NUM, KEY);
must(SEED_WHY.length > 120,
  `db/vr-issue-seed.json no longer carries a rationale for ${NUM} on ${KEY} — pick another measure`);

// ─────────────────────────────────────────────────────────────────────────────
// The harness: a mini-DOM, the two shipped reads stubbed from the one corpus,
// and the arrival an address causes. Same shape as
// scripts/test-issue-file-address.mjs, because it is the same page.
// ─────────────────────────────────────────────────────────────────────────────
function miniDom(win) {
  const byId = {};
  const mk = (id) => {
    const node = {
      id: id || "", className: "", innerHTML: "", textContent: "", value: "",
      style: {}, dataset: {}, children: [], hidden: false, attrs: {},
      firstChild: null,
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) {
        return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null;
      },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {}, removeEventListener() {},
      appendChild(c) {
        this.children.push(c); c.parentNode = this;
        if (c && c.id) byId[c.id] = c;
        return c;
      },
      insertBefore(c) {
        this.children.unshift(c); c.parentNode = this;
        if (c && c.id) byId[c.id] = c;
        return c;
      },
      removeChild() {}, insertAdjacentHTML() {}, remove() {}, focus() {}, click() {},
      scrollIntoView() {}, querySelector() { return null; }, querySelectorAll() { return []; },
    };
    if (id) byId[id] = node;
    return node;
  };
  win.document.createElement = () => mk("");
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = mk("body");
  const bodyAppend = win.document.body.appendChild.bind(win.document.body);
  win.document.body.appendChild = function (c) { if (c && c.id) byId[c.id] = c; return bodyAppend(c); };
  const canonical = mk("");
  canonical.attrs.href = ORIGIN + "/";
  win.document.querySelector = (sel) => (String(sel).indexOf("canonical") >= 0 ? canonical : null);
  ["pdx-eye-input", "pdx-eye-panel", "pdx-eye", "pdx-eye-clear",
    "pdx-door1-workspace", "pdx-d1-body"].forEach(mk);
  return byId;
}

function stubReads(win) {
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
}

// compare-hub.js is not in this load order for the reason
// scripts/test-issue-file-address.mjs gives; its one export is stubbed the same
// way, and section 7 asserts the desk still ASKS for it.
function browseTypeStub(win) {
  win._pdxBrowseType = function (pid) {
    const d = (win.CMP_DATA || {})[pid];
    const o = String((d && d.office) || "").toLowerCase();
    if (!o) return "other";
    if (o.indexOf("u.s. senat") >= 0) return "senator";
    if (o.indexOf("u.s. rep") >= 0 || o.indexOf("u.s. house") >= 0 ||
        o.indexOf("congress") >= 0) return "representative";
    if (o.indexOf("state sen") >= 0 || o.indexOf("senate president") >= 0) return "state_senator";
    if (o.indexOf("state rep") >= 0 || o.indexOf("state house") >= 0 ||
        o.indexOf("house speaker") >= 0) return "state_rep";
    return "other";
  };
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
  const p = opts.path || "/";
  win.location = { href: ORIGIN + p, pathname: p, search: "", hash: "", origin: ORIGIN };
  win.history = {
    replaceState(a, b, u) { win.location.pathname = String(u); },
    pushState() {},
  };
  win.PDXShareLinks = { notice() { return true; } };
  win.__listeners = {};
  win.addEventListener = (t, f) => { (win.__listeners[t] = win.__listeners[t] || []).push(f); };
  // The document's own delegated listeners, recorded — the row door is one.
  win.__docListeners = {};
  miniDom(win);
  win.document.addEventListener = (t, f) => {
    (win.__docListeners[t] = win.__docListeners[t] || []).push(f);
  };
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
  stubReads(win);
  win.__routed = [];
  win.pdxDoorWork = (id) => { win.__routed.push("work:" + id); return true; };
  win.pdxDoor = (mode) => { win.__routed.push("door:" + mode); return true; };
  browseTypeStub(win);
  // A `delete` on a contextified sandbox does not reach the module's `window`,
  // so the cleaner is unset by assignment.
  if (opts.noCleaner) { win._pdxReaderRationale = undefined; win.PDXReceiptCards = undefined; }
  vm.runInContext(opts.desk || DESK, ctx, { filename: "door1-workspace.js" });
  vm.runInContext(opts.panel || PANEL, ctx, { filename: "issue-file.js" });
  vm.runInContext(ADDR, ctx, { filename: "pdx-issue-profile.js" });
  // The bill file the row door opens, recorded rather than painted.
  win.__opened = [];
  win.PDXBillDetail = { open(num, sit) { win.__opened.push(`${num}@${sit}`); return true; } };
  win.__ctx = ctx;
  return win;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

function warmAll(w) {
  const P = w.CMP_DATA || [];
  const ids = Array.isArray(P) ? P.map((x) => x && x.id) : Object.keys(P);
  must(ids.length > 100, "the roster did not load, so nothing can be warmed");
  for (const pid of ids) {
    if (!pid) continue;
    try { w.PDXVotingRecord.noteMember(pid, corpus.byMember.get(pid) || []); } catch { /* not a member */ }
  }
  return w;
}
async function arriveAt(w) {
  const first = w.PDXIssueProfile.adopt();
  await tick(); await tick();
  if (first) w.PDXIssueProfile.adopt();
  await tick(); await tick(); await tick();
  w.PDXIssueFile.repaint();
  return first;
}
const headOf = (w) => {
  const h = w.document.getElementById("pdx-issue-file-head");
  return h ? String(h.innerHTML) : "";
};
const ledgerOf = (w) => {
  const h = w.document.getElementById("pdx-issue-file-ledger");
  return h ? String(h.innerHTML) : "";
};

// ── THE ONE SEAM THE FIXTURES USE ───────────────────────────────────────────
// door1-workspace.js:977 reads a member's acts on a key through
// window._pdxRecordIssueItems, and ledgerMeasures takes the mapping object off
// each item's issues[]. So a fixture that wants a different rationale changes
// exactly that, and every other fact on the row — the number, the title, the
// label, the roll calls, the names — is still the shipped corpus's.
const rewriteRationale = (w, num, val) => {
  const real = w._pdxRecordIssueItems;
  must(typeof real === "function", "voting-record.js no longer publishes _pdxRecordIssueItems");
  w._pdxRecordIssueItems = function (pid, k) {
    return (real.call(this, pid, k) || []).map((it) => {
      if (num && String(it.number).replace(/\s+/g, " ").trim() !== num) return it;
      return Object.assign({}, it, {
        issues: (it.issues || []).map((g) =>
          (g && g.issueKey === k ? Object.assign({}, g, { rationale: val }) : g)),
      });
    });
  };
  return w;
};

// One row, cut out of the list by the number printed on it.
const rowOf = (html, num) => {
  const at = html.indexOf(`<span class="d1-led-bnum">${num}</span>`);
  if (at < 0) return "";
  const open = html.lastIndexOf('<li class="d1-led-b">', at);
  if (open < 0) return "";
  const end = html.indexOf("</li>", at);
  return end < 0 ? html.slice(open) : html.slice(open, end + 5);
};
const whysIn = (html) =>
  [...String(html).matchAll(/<span class="d1-led-bwhy">([\s\S]*?)<\/span>/g)].map((m) => unesc(m[1]));
const rowsIn = (html) => String(html).split('<li class="d1-led-b">').slice(1)
  .map((r) => (r.indexOf("</li>") < 0 ? r : r.slice(0, r.indexOf("</li>"))));

const smoke = boot({ path: `/i/${KEY}` });
must(smoke.__loadErrors.length === 0,
  `a module failed to load: ${smoke.__loadErrors.join(" | ")}`);
must(typeof smoke._pdxReaderRationale === "function",
  "receipt-cards.js no longer publishes window._pdxReaderRationale — the why-line has no cleaner");
must(smoke.PDXReceiptCards && smoke.PDXReceiptCards.guards &&
     typeof smoke.PDXReceiptCards.guards.splitSentences === "function",
  "receipt-cards.js no longer exposes guards.splitSentences — the clip has no splitter");
must(smoke.ISSUE_MAP && smoke.ISSUE_MAP[KEY], `${KEY} is no longer a shipped ISSUE_MAP key`);
must(typeof smoke.PDXDoor1.billRowTap === "function",
  "PDXDoor1.billRowTap is not published — the row door cannot be driven");
const split = (t) => smoke.PDXReceiptCards.guards.splitSentences(t);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the why-line is the mapping's own sentence, off the shipped seed");
// ═════════════════════════════════════════════════════════════════════════════
const w1 = warmAll(boot({ path: `/i/${KEY}` }));
eq(await arriveAt(w1), KEY, `/i/${KEY} did not resolve to its own key`);
const LED = ledgerOf(w1);
must(LED.indexOf('<section class="d1-led-meas"') >= 0,
  `/i/${KEY} painted no measure list at all`);
const ROW = rowOf(LED, NUM);
must(ROW, `${NUM} is not on /i/${KEY}'s measure list — the record corpus no longer reaches it`);

const why = whysIn(ROW)[0] || "";
ok(why, `${NUM}'s row carries no why-line at all`);
ok(why !== BLANK, `${NUM}'s row printed the honest blank over a rationale the seed does carry`);

// NOTHING COMPOSED. Every sentence printed appears inside the seed's own
// rationale for this measure on this key — modulo the leading capital the
// cleaner restores when it strips a "Primary:" label off the front of a sentence.
const seedFlat = flat(SEED_WHY);
const sents = split(why);
ok(sents.length >= 1, "the why-line split into no sentences at all");
for (const s of sents) {
  const f = flat(s).replace(/[.!?]+$/, "");
  ok(f.length > 12, `a why-line sentence is a fragment: ${JSON.stringify(s)}`);
  ok(seedFlat.indexOf(f) >= 0,
    `a why-line sentence is not in the shipped rationale — it was composed, not quoted: ${JSON.stringify(s)}`);
}
// …and it starts where the curator started, so it is a prefix of their prose and
// not a sentence plucked out of the middle of it.
ok(seedFlat.indexOf(flat(sents[0]).replace(/[.!?]+$/, "")) <= 12,
  "the why-line does not begin where the curator's rationale begins");
console.log(`      /i/${KEY} · ${NUM} · ${sents.length} sentence(s), ${why.length} chars, every one off the seed`);
console.log(`      "${why.slice(0, 92)}${why.length > 92 ? "…" : ""}"`);

// THE LANE BADGE IS STILL THE LANE BADGE, and the why does not restate it.
has(ROW, '<span class="d1-led-btag is-primary">PRIMARY</span>',
  `${NUM}'s row lost the lane badge that says the issue is the bill's own subject`);
for (const slang of ["PRIMARY", "isPrimary", "weight", "seed"]) {
  no(why, slang, `the why-line prints curator slang ("${slang}")`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · two sentences, cut on a boundary, never summarised");
// ═════════════════════════════════════════════════════════════════════════════
{
  // THE CAP IS DECLARED, NOT SCATTERED. One number, one place.
  has(DESK, "var WHY_SENT = 2;", "the two-sentence cap is no longer a named constant in the desk");
  has(DESK, "var WHY_CHARS = 220;", "the why-line's length budget is no longer a named constant");
  has(DESK, "guards.splitSentences",
    "the desk clips with a splitter of its own instead of the cleaner's abbreviation-aware one");

  // THE ROW PRINTS THE CLEANED RATIONALE'S OWN FIRST SENTENCES, in order, from
  // the top. On this measure the curator wrote exactly two and both are printed.
  const full = smoke._pdxReaderRationale(SEED_WHY);
  must(full, "the cleaner refused the seed rationale outright — pick another measure");
  const allSents = split(full);
  eq(sents.length, Math.min(2, allSents.length), "the why-line is not clipped to two sentences");
  eq(flat(why), flat(allSents.slice(0, 2).join(" ")),
    "the printed two sentences are not the cleaned rationale's own first two");

  // AND THE CAP IS OBSERVABLE ON SHIPPED DATA, not only on a fixture: the seed
  // carries 141 rationales of three sentences or more. This is one of them whose
  // first two sentences also fit inside the line budget, so what the row prints
  // is the SENTENCE cap doing the work and not the character cut standing in for
  // it — the difference between "clipped to two sentences" and "clipped to 220
  // characters and two sentences would have been shorter anyway".
  const capFull = smoke._pdxReaderRationale(seedRationale(CAP_NUM, CAP_KEY));
  must(capFull && split(capFull).length > 2,
    `db/vr-issue-seed.json no longer carries a 3+ sentence rationale for ${CAP_NUM} on ${CAP_KEY}`);
  {
    const w = warmAll(boot({ path: `/i/${CAP_KEY}` }));
    must(await arriveAt(w) === CAP_KEY, `/i/${CAP_KEY} did not resolve`);
    const r = rowOf(ledgerOf(w), CAP_NUM);
    must(r, `${CAP_NUM} is not on /i/${CAP_KEY}'s measure list any more`);
    const t = whysIn(r)[0] || "";
    const ts = split(t);
    eq(ts.length, 2, `${CAP_NUM}'s why-line on /i/${CAP_KEY} is not clipped to two sentences`);
    eq(flat(t), flat(split(capFull).slice(0, 2).join(" ")),
      `${CAP_NUM}'s why-line is not the cleaned rationale's own first two sentences`);
    console.log(`      /i/${CAP_KEY} · ${CAP_NUM} · ${split(capFull).length} written → 2 printed`);
  }

  // A CITATION IS NEVER SHREDDED. The splitter the desk borrows is the one that
  // knows "H.R. 6644" and "Sec. 103" are not sentence ends; a naive splitter
  // would turn the first why-line on this page into a fragment.
  const cite = "Sec. 103 of H.R. 6644 amends 42 U.S.C. 4333. The second sentence begins here.";
  eq(split(cite).length, 2, "the borrowed splitter shreds a legislative citation across sentences");

  // A THREE-SENTENCE RATIONALE PRINTS TWO, THROUGH THE SHIPPED RENDERER — and
  // the third sentence is nowhere on the card, cut rather than compressed.
  {
    const three = "This Act rewrites the housing title outright. " +
      "Affordability is the subject of the bill and not a rider on it. " +
      "A third sentence the row has no room for.";
    must(split(three).length === 3, "the three-sentence fixture no longer splits into three");
    const w = rewriteRationale(warmAll(boot({ path: `/i/${KEY}` })), NUM, three);
    await arriveAt(w);
    const t = whysIn(rowOf(ledgerOf(w), NUM))[0] || "";
    must(t, "the three-sentence fixture painted no row");
    eq(split(t).length, 2, "a three-sentence rationale did not clip to two");
    has(three, t.replace(/\s+$/, ""), "the two printed sentences are not a prefix of the three written");
    no(t, "no room for", "the third sentence reached the card");
  }

  // A SINGLE OVERLONG SENTENCE IS CUT ON A WORD BOUNDARY AND SAYS SO.
  {
    const long = "This measure " +
      "reauthorises a named program and its reporting duties ".repeat(12) + "once.";
    must(long.length > 400 && split(long).length === 1,
      "the overlong-sentence fixture is no longer one sentence");
    const w = rewriteRationale(warmAll(boot({ path: `/i/${KEY}` })), NUM, long);
    await arriveAt(w);
    const t = whysIn(rowOf(ledgerOf(w), NUM))[0] || "";
    must(t, "the overlong-rationale fixture painted no row");
    ok(t.length <= 221, `the overlong sentence printed as a paragraph (${t.length} chars)`);
    eq(t.slice(-1), "…", "the cut sentence does not say it was cut");
    const body = t.slice(0, -1);
    eq(long.indexOf(body), 0, "the cut is not a verbatim prefix of what the curator wrote");
    ok(/\S$/.test(body) && /\s/.test(long.charAt(body.length)),
      "the cut landed mid-word instead of on a word boundary");
    console.log(`      one ${long.length}-char sentence → ${t.length} chars, cut on a word, prefix intact`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · no curator slang on any row of any key");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The words a note between curators uses and a sentence for a reader does not,
  // swept over every why-line on every key this harness can warm.
  const LEAK = [
    /\bweight(ed|ing|s)?\b/i, /\bisPrimary\b/, /\bseed(ed|s)?\b/i, /\bmigration\b/i,
    /\.sql\b/i, /\btaxonomy\b/i, /\bingest(ed|ion)?\b/i, /\bbackfill\b/i,
    /\bmapp(ed|ing)\s+(?:at|to)\s+\d/i, /\b[a-z]{3,}_[a-z][a-z_]*\b/,
    /^(?:primary|secondary|note|internal|todo)\s*:/i, /\bPRIMARY\b/,
    /\bDirection Match\b/i, /\bWVA\b/, /\bWord-Action\b/i,
  ];
  let seen = 0, keys = 0, blanks = 0;
  for (const k of SWEEP) {
    if (!smoke.ISSUE_MAP[k]) continue;
    const w = warmAll(boot({ path: `/i/${k}` }));
    if (await arriveAt(w) !== k) continue;
    keys++;
    const led = ledgerOf(w);
    // EVERY ROW HAS ONE, AND EXACTLY ONE.
    for (const r of rowsIn(led)) {
      const n = (r.match(/<span class="d1-led-bwhy">/g) || []).length;
      eq(n, 1, `a measure row on /i/${k} carries ${n} why-lines instead of exactly one`);
    }
    for (const t of whysIn(led)) {
      seen++;
      ok(t.trim().length > 0, `/i/${k} printed an empty why-line instead of the honest blank`);
      if (t === BLANK) { blanks++; continue; }
      for (const re of LEAK) {
        ok(!re.test(t),
          `/i/${k}: a why-line still reads as a note between curators (${re}): ${JSON.stringify(t.slice(0, 120))}`);
      }
    }
  }
  must(keys >= 3, `only ${keys} of the swept keys resolved — the sweep is not a sweep`);
  must(seen >= 6, `only ${seen} why-lines were swept across ${keys} keys`);
  console.log(`      ${seen} why-line(s) across ${keys} key(s) · ${blanks} honest blank(s) · 0 leaks`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · an empty rationale prints the honest blank, never nothing");
// ═════════════════════════════════════════════════════════════════════════════
{
  // (a) THE SHIPPED INDEX. bills-index.js carries no rationale field at all, so
  // a measure this ledger knows only from the index is the real-world empty case
  // and it must already be saying so on today's data.
  const w = warmAll(boot({ path: "/i/climate_action" }));
  must(await arriveAt(w) === "climate_action", "/i/climate_action did not resolve");
  const led = ledgerOf(w);
  const idxBlanks = whysIn(led).filter((t) => t === BLANK).length;
  ok(idxBlanks > 0,
    "no row on /i/climate_action prints the honest blank, yet the shipped index carries no rationale — " +
    "either the index grew one or the blank stopped printing");
  // The blank is a row like any other: same span, and the label is still there.
  for (const r of rowsIn(led)) {
    if (r.indexOf(BLANK) < 0) continue;
    has(r, 'class="d1-led-bwhy"', "the honest blank is printed outside the why-line's own span");
    ok(/class="d1-led-btag/.test(r), "a row with no rationale lost its lane badge too");
  }
  console.log(`      /i/climate_action · ${idxBlanks} index-only row(s) → "${BLANK}"`);

  // (b) A FIXTURE WITH NO SENTENCE. The mapping is there, the prose is not —
  // '' and null and whitespace all reach the same words.
  for (const [label, val] of [["empty string", ""], ["null", null], ["whitespace", "   \n  "]]) {
    const wf = rewriteRationale(warmAll(boot({ path: `/i/${KEY}` })), NUM, val);
    await arriveAt(wf);
    const r = rowOf(ledgerOf(wf), NUM);
    must(r, `the ${label} fixture painted no ${NUM} row`);
    eq(whysIn(r)[0], BLANK, `a ${label} rationale does not print the honest blank`);
    // NEVER A BLANK ROW: the span is there, it is not empty, and the row still
    // says everything else it said.
    no(r, '<span class="d1-led-bwhy"></span>', `the ${label} fixture printed an empty span`);
    has(r, `<span class="d1-led-bnum">${NUM}</span>`, `the ${label} fixture lost the row's identity`);
    has(r, "Who voted on it", `the ${label} fixture lost the row's roll-call control`);
  }

  // (c) A FIXTURE WHOSE RATIONALE IS ENTIRELY CURATOR HOUSEKEEPING. Whatever the
  // cleaner makes of it, the reader never sees the weighting note or the raw key;
  // and where the cleaner publishes nothing, "nothing" arrives as the blank.
  {
    const note = "Weighted 80 rather than 100. Secondary: filed under housing_support before the retaxonomy.";
    const wh = rewriteRationale(warmAll(boot({ path: `/i/${KEY}` })), NUM, note);
    await arriveAt(wh);
    const r = rowOf(ledgerOf(wh), NUM);
    must(r, "the housekeeping fixture painted no row");
    const t = whysIn(r)[0] || "";
    ok(t.trim().length > 0, "a wholly-internal rationale printed an empty line");
    no(r, "Weighted 80", "the curator's weighting note reached the card");
    no(r, "housing_support", "a raw issue key reached the card");
    if (!smoke._pdxReaderRationale(note)) {
      eq(t, BLANK, "a rationale the cleaner refuses does not fall back to the honest blank");
    }
    console.log(`      housekeeping-only rationale → "${t.slice(0, 60)}"`);
  }

  // (d) NO CLEANER ON THE PAGE. receipt-cards.js loads before the desk and is
  // precached, but a document that somehow renders without it must print the
  // blank rather than the raw working field.
  {
    const wn = warmAll(boot({ path: `/i/${KEY}`, noCleaner: true }));
    await arriveAt(wn);
    const r = rowOf(ledgerOf(wn), NUM);
    must(r, "the no-cleaner boot painted no row");
    eq(whysIn(r)[0], BLANK,
      "with no cleaner on the page the row does not fall back to the honest blank");
    no(r, "Primary:", "with no cleaner on the page the raw rationale was published");
  }
  // And the honest blank is spelled once, in the renderer that prints it.
  has(DESK, `var WHY_BLANK = '${BLANK}';`, "the honest blank is no longer a named constant in the desk");
  eq((DESK.match(/Mapped to this issue; rationale not written yet/g) || []).length, 1,
    "the honest blank is spelled more than once in the desk");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the row is the door, and the why-line is not a second button");
// ═════════════════════════════════════════════════════════════════════════════
{
  // THE MARKUP FIRST. The why is a <span>, the <li> announces nothing, and the
  // row holds no control it did not already hold.
  // Every row on this key, plus every row on the key with the longest list, so
  // the sweep is over more than one shape of card.
  const wide = warmAll(boot({ path: "/i/climate_action" }));
  must(await arriveAt(wide) === "climate_action", "/i/climate_action did not resolve");
  const WIDE = ledgerOf(wide);
  const rows = rowsIn(LED).concat(rowsIn(WIDE));
  must(rows.length >= 4, `too few measure rows to sweep (${rows.length})`);
  for (const r of rows) {
    const whySpan = /<span class="d1-led-bwhy">([\s\S]*?)<\/span>/.exec(r);
    must(whySpan, "a measure row has no why-line span to check");
    no(whySpan[0], "<button", "the why-line grew a button inside it");
    no(whySpan[0], "<a ", "the why-line grew an anchor inside it");
    no(whySpan[0], "onclick", "the why-line became a control");
    no(whySpan[0], 'role="', "the why-line announces itself as a control");
    no(whySpan[0], "tabindex", "the why-line took a focus stop of its own");
    // Buttons inside buttons: the parser closes the outer one early and drops
    // everything after the nested one out of the row.
    eq((r.match(/<button\b/g) || []).length, (r.match(/<\/button>/g) || []).length,
      "a measure row leaves a button unclosed");
    ok(!/<button[^>]*>(?:(?!<\/button>)[\s\S])*<button/.test(r),
      "a measure row nests a button inside a button");
  }
  // The <li> is a POINTER target and nothing more — no role, no tabindex, no
  // accessible name. Announcing a row that contains three buttons would give a
  // screen reader four names for one row; see the note over billRowTap.
  no(LED, '<li class="d1-led-b" ',
    "the measure row grew an attribute — it is announced, or it is a door twice");
  eq((LED.match(/<li class="d1-led-b">/g) || []).length,
    (LED.match(/<li class="d1-led-b/g) || []).length,
    "a measure row's opening tag is no longer the one the desk has always printed");

  // THE TAP. Driven through the shipped delegate over a tree shaped like the row.
  const w5 = w1;
  const mkNode = (tag, cls, opens) => {
    const n = {
      tag,
      cls: String(cls || "").split(/\s+/).filter(Boolean),
      attrs: {}, kids: [], parent: null, clicked: 0,
      click() { this.clicked++; if (opens) w5.pdxDoor1Bill(NUM, "119", this); },
      getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; },
      contains(o) { let p = o; while (p) { if (p === this) return true; p = p.parent; } return false; },
      closest(sel) {
        const want = String(sel).split(",").map((s) => s.trim()).filter(Boolean);
        let p = this;
        while (p) {
          for (const s of want) {
            if (s.charAt(0) === ".") { if (p.cls.indexOf(s.slice(1)) >= 0) return p; continue; }
            const dot = s.indexOf(".");
            if (dot > 0) {
              if (p.tag === s.slice(0, dot) && p.cls.indexOf(s.slice(dot + 1)) >= 0) return p;
              continue;
            }
            if (s.charAt(0) === "[") {
              const m = /^\[([a-z-]+)="([^"]*)"\]$/.exec(s);
              if (m && p.attrs[m[1]] === m[2]) return p;
              continue;
            }
            if (p.tag === s) return p;
          }
          p = p.parent;
        }
        return null;
      },
      querySelector(sel) {
        const want = String(sel).replace(/^\./, "");
        const walk = (node) => {
          for (const k of node.kids) {
            if (k.cls.indexOf(want) >= 0) return k;
            const d = walk(k);
            if (d) return d;
          }
          return null;
        };
        return walk(this);
      },
    };
    return n;
  };
  const adopt = (parent, kids) => {
    parent.kids = kids;
    for (const k of kids) k.parent = parent;
    return parent;
  };
  // The row as measuresHtml prints it: two identity doors, the label, the
  // why-line, the names, and the roll-call button.
  const build = () => {
    const num = mkNode("button", "d1-bdoor is-num", true);
    const ttl = mkNode("button", "d1-bdoor is-ttl", true);
    const tag = mkNode("span", "d1-led-btag is-primary", false);
    const whyEl = mkNode("span", "d1-led-bwhy", false);
    const cite = mkNode("button", "d1-cite", true);
    const row = adopt(mkNode("li", "d1-led-b", false), [num, ttl, tag, whyEl, cite]);
    const list = adopt(mkNode("ul", "d1-led-bills", false), [row]);
    return { row, num, ttl, tag, whyEl, cite, list };
  };

  // (a) A tap on the row's own space opens the bill file.
  {
    const t = build();
    w5.__opened.length = 0;
    w5.PDXDoor1.billRowTap({ target: t.row });
    eq(w5.__opened.join(","), `${NUM}@119`, "a tap on the row's own space did not open the bill file");
    eq(t.num.clicked, 1, "the row's tap did not go through the number's existing door");
    eq(t.ttl.clicked + t.cite.clicked, 0, "the row's tap opened the same file more than once");
  }
  // (b) A tap on the WHY-LINE — the row's own space, not a control — opens the
  // same one thing. That is the whole reason it may be plain text.
  {
    const t = build();
    w5.__opened.length = 0;
    w5.PDXDoor1.billRowTap({ target: t.whyEl });
    eq(w5.__opened.join(","), `${NUM}@119`, "a tap on the why-line did not open the bill file");
  }
  // (c) The lane badge is row space too.
  {
    const t = build();
    w5.__opened.length = 0;
    w5.PDXDoor1.billRowTap({ target: t.tag });
    eq(w5.__opened.join(","), `${NUM}@119`, "a tap on the lane badge did not open the bill file");
  }
  // (d) A tap on a control the row already held is THAT control's tap, and the
  // delegate neither double-opens nor synthesises a second click.
  for (const which of ["num", "ttl", "cite"]) {
    const t = build();
    w5.__opened.length = 0;
    w5.PDXDoor1.billRowTap({ target: t[which] });
    eq(w5.__opened.length, 0, `the delegate re-opened the bill file over the ${which} control's own tap`);
    eq(t[which].clicked, 0, `the delegate synthesised a click on the ${which} control the reader already tapped`);
  }
  // (e) A tap outside any row, and a malformed event, do nothing at all.
  {
    const t = build();
    w5.__opened.length = 0;
    w5.PDXDoor1.billRowTap({ target: t.list });
    w5.PDXDoor1.billRowTap({});
    w5.PDXDoor1.billRowTap(null);
    eq(w5.__opened.length, 0, "a tap outside every row opened a bill file");
  }
  // (f) A card with no number has no door to open and must not throw reaching
  // for one — the "On file" row.
  {
    const bare = adopt(mkNode("li", "d1-led-b", false), [mkNode("span", "d1-led-bnum", false)]);
    w5.__opened.length = 0;
    w5.PDXDoor1.billRowTap({ target: bare });
    eq(w5.__opened.length, 0, "a card with no number opened something");
  }
  // (g) ONE LISTENER, ON THE DOCUMENT, BOUND ONCE.
  // The page binds several delegated click listeners; exactly one of them is the
  // row door, bound once, on the document.
  const clicks = w1.__docListeners.click || [];
  eq(clicks.filter((f) => f === w1.PDXDoor1.billRowTap).length, 1,
    `the row door is bound ${clicks.filter((f) => f === w1.PDXDoor1.billRowTap).length} times instead of once`);
  // The affordance is in the stylesheet, and only on a row that HAS a door.
  has(D1CSS, ".d1-led-b:has(.d1-bdoor) { cursor: pointer; }",
    "the row gives a reader no cursor cue that it is tappable");
  no(D1CSS, ".d1-led-b { cursor: pointer",
    "every measure row claims to be tappable, including the ones with no bill file to open");
  console.log("      row tap → bill file · badge and why are row space · 3 controls keep their own taps · 1 listener");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the measure list is in the first screen on a phone");
// ═════════════════════════════════════════════════════════════════════════════
// THERE IS NO BROWSER IN THIS HARNESS, so this is an analytic model of the two
// shipped stylesheets over the markup this file painted — the equivalent layout
// assertion the work order allows. It is built to be UNKIND to the fix and KIND
// to the defect:
//
//   · the AFTER number is an UPPER bound. Every margin, border and padding in
//     the path is counted, characters are assumed wide (0.58em), and the chrome
//     bar's title and crumb are allowed to wrap to two lines.
//   · the BEFORE number is a LOWER bound. Only the type in the blocks above the
//     measures is counted — no padding, no border, no margin, no gap — and
//     characters are assumed narrow (0.46em).
//
// So a pass means the measures really are above the fold, and the reproduction
// of the defect really is a reproduction.
{
  const REM = 16;
  // lvh is the large viewport (toolbar hidden); dvh is what the reader can
  // actually see with the toolbar up. The fold this claim is about is dvh: the
  // pixels on screen when the page opens, not the pixels the box thinks it has.
  const DEVICES = [
    { name: "iPhone SE (375×667)", w: 375, dvh: 553 },
    { name: "iPhone 14 (390×844)", w: 390, dvh: 745 },
    { name: "iPhone 15 Pro Max (430×932)", w: 430, dvh: 833 },
    { name: "Pixel 7 (412×915)", w: 412, dvh: 859 },
    { name: "Galaxy S23 (360×780)", w: 360, dvh: 724 },
    { name: "Galaxy Z Fold outer (344×882)", w: 344, dvh: 800 },
  ];

  // ── Every number below is read back out of the stylesheet it describes ─────
  // A font size or a padding that moves in the CSS fails HERE, rather than
  // quietly turning this model into fiction.
  const ruleOf = (css, sel) => {
    const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = new RegExp("\\n" + esc + "\\s*\\{([^}]*)\\}").exec(css) ||
      new RegExp(esc + "\\s*\\{([^}]*)\\}").exec(css);
    must(m, `the layout model describes ${sel}, which no longer has a rule`);
    return m[1];
  };
  const T = (css, sel, fs, lh, mt, mb) => {
    const body = ruleOf(css, sel);
    must(body.indexOf(`font-size: ${fs}rem`) >= 0,
      `${sel}'s font-size is not ${fs}rem any more — the layout model is stale`);
    return { fs: fs * REM, lh, mt: mt * REM, mb: mb * REM };
  };
  const TY = {
    chip: T(IFCSS, ".pdxif-chip", 0.72, 1.25, 0, 0.4),
    scope: T(IFCSS, ".pdxif-scope", 0.85, 1.5, 0, 0),
    inv: T(IFCSS, ".pdxif-inv", 0.76, 1.5, 0.6, 0),
    busy: T(IFCSS, ".pdxif-busy", 0.76, 1.5, 0.6, 0),
    clip: T(IFCSS, ".pdxif-clip", 0.74, 1.55, 0.4, 0),
    dscope: T(D1CSS, ".d1-scope", 0.74, 1.5, 0.7, 0),
    lead: T(D1CSS, ".d1-lead", 0.74, 1.5, 0.9, 0.5),
    empty: T(D1CSS, ".d1-empty", 0.78, 1.6, 0.8, 0),
    n: T(D1CSS, ".d1-led-n", 0.9, 1.5, 0, 0),
    splitp: T(D1CSS, ".d1-led-split", 0.78, 1.6, 0.35, 0),
    m: T(D1CSS, ".d1-led-m", 0.76, 1.5, 0.4, 0),
  };
  // The ledger's scope line is re-margined by the panel; the model counts the
  // larger of the two above the measures and the smaller below the letterhead.
  must(/#pdx-issue-file-ledger > \.d1-scope \{ margin-top: 0\.55rem; \}/.test(IFCSS),
    "the panel no longer re-margins the ledger's scope line — the layout model is stale");
  const DSCOPE_MT_HI = 0.7 * REM, DSCOPE_MT_LO = 0.55 * REM;

  // The phone block, by brace match rather than by guess.
  const blockAt = (css, at) => {
    let depth = 0, i = css.indexOf("{", at);
    const start = i;
    for (; i < css.length; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") { depth--; if (!depth) break; }
    }
    return css.slice(start + 1, i);
  };
  const at480 = IFCSS.indexOf("@media (max-width: 480px) {");
  must(at480 >= 0, "issue-file.css no longer carries the max-width:480 phone block");
  const phone = blockAt(IFCSS, at480);
  const at420 = IFCSS.indexOf("@media (max-width: 420px) {");
  must(at420 >= 0, "issue-file.css no longer carries the max-width:420 chrome block");
  const narrowCss = blockAt(IFCSS, at420);

  // The chrome bar and the scroller, base and narrowed. `flex: none` on the bar
  // is why every pixel of it sits above the record rather than scrolling with it.
  must(/\.pdxif-top \{[^}]*flex: none;/.test(IFCSS),
    "the chrome bar scrolls now — the layout model assumes it is pinned");
  const pad3 = (css, sel) => {
    const m = /padding:\s*([\d.]+)rem\s+([\d.]+)rem\s+([\d.]+)rem/.exec(ruleOf(css, sel));
    must(m, `${sel} no longer declares a three-value padding — the layout model is stale`);
    return { t: Number(m[1]) * REM, x: Number(m[2]) * REM, b: Number(m[3]) * REM };
  };
  const chrome = (narrow) => {
    const top = narrow ? pad3(narrowCss, "  .pdxif-top") : pad3(IFCSS, ".pdxif-top");
    const body = narrow ? pad3(narrowCss, "  .pdxif-body") : pad3(IFCSS, ".pdxif-body");
    const titleFs = narrow
      ? Number((/\.pdxif-title \{ font-size: ([\d.]+)rem/.exec(narrowCss) || [, 0])[1]) * REM
      : 1.12 * REM;
    const kickFs = narrow
      ? Number((/\.pdxif-kick \{ font-size: ([\d.]+)rem/.exec(narrowCss) || [, 0])[1]) * REM
      : 0.58 * REM;
    must(titleFs > 0 && kickFs > 0, "the chrome bar's phone type no longer declares a size");
    return { top, body, titleFs, kickFs };
  };
  // The identity card's own box, restated on .pdxif-hid by the phone block.
  must(/\.pdxif-hid,\s*\n\s*\.pdxif-htail \{\s*\n\s*padding: 0\.75rem 0\.8rem 0\.7rem;/.test(phone),
    "the phone block no longer gives the letterhead's halves the card's padding");
  must(/\.pdxif-hid \{ margin: 0\.9rem 0 0; \}/.test(phone),
    "the phone block no longer gives the identity half the letterhead's top margin");
  const HID_BOX = 0.9 * REM + (0.75 + 0.7) * REM + 2;  // margin + padding + 2 borders
  const HID_PAD_X = 0.8 * REM + 1 + 4;                 // padding + border + the family rail
  const MEAS_MT = (() => {
    const m = /#pdx-issue-file-ledger > \.d1-led-meas \{[^}]*margin-top:\s*([\d.]+)rem/.exec(phone);
    must(m, "the phone block no longer sets the measure list's own top margin");
    return Number(m[1]) * REM;
  })();

  // Text height, from a character count and an available width. `wide` inflates
  // the per-character advance (the upper-bound direction) and deflates it for
  // the lower bound.
  const lines = (chars, avail, fs, wide) =>
    Math.max(1, Math.ceil((chars * fs * (wide ? 0.58 : 0.46)) / Math.max(40, avail)));
  const th = (t, chars, avail, wide, mtOverride) => {
    if (!chars) return 0;
    const mt = mtOverride === undefined ? t.mt : mtOverride;
    return mt + t.mb + lines(chars, avail, t.fs, wide) * t.fs * t.lh;
  };
  const strip = (h) => unesc(String(h).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
  const textOf = (html, cls) => {
    const m = new RegExp(`<(\\w+)[^>]*class="${cls}(?=["\\s])[^"]*"[^>]*>([\\s\\S]*?)</\\1>`).exec(html);
    return m ? strip(m[2]) : "";
  };

  const head = headOf(w1);
  must(head.indexOf('class="pdxif-hid"') >= 0 && head.indexOf('class="pdxif-htail"') >= 0,
    "the letterhead is not two halves any more — there is nothing for `order` to move");
  const L = {
    chip: textOf(head, "pdxif-chip").length,
    scope: textOf(head, "pdxif-scope").length,
    inv: textOf(head, "pdxif-inv").length,
    busy: textOf(head, "pdxif-busy").length,
    clip: textOf(head, "pdxif-clip").length,
    dscope: textOf(LED, "d1-scope").length,
    empty: textOf(LED, "d1-empty").length,
    n: textOf(LED, "d1-led-n").length,
    splitp: textOf(LED, "d1-led-split").length,
    m: textOf(LED, "d1-led-m").length,
    lead: textOf(LED, "d1-lead").length,
    proc: strip((/<div class="pdxif-proc">([\s\S]*?)<p class="pdxif-jumps">/.exec(head) || [, ""])[1]).length,
  };
  must(L.scope > 20 && L.dscope > 20,
    "the letterhead's scope sentence or the ledger's own is empty — the model has nothing to measure");

  let reproduced = 0;
  for (const d of DEVICES) {
    const c = chrome(d.w <= 420);
    // The chrome bar: kicker, the issue's name, the crumb, a border. Not part of
    // the scroll, so every pixel is above the record in both orders.
    const bar = (titleLines, crumbLines) =>
      c.top.t + c.top.b +
      c.kickFs * 1.1 + 0.15 * REM +
      titleLines * c.titleFs * 1.2 +
      0.28 * REM + crumbLines * 0.68 * REM * 1.2 + 1;
    const inner = d.w - c.body.x * 2;
    const hidText = inner - HID_PAD_X * 2;

    // ── AFTER: identity, then the ledger's scope line, then the measures ────
    let after = bar(2, 2) + c.body.t + HID_BOX;
    after += th(TY.chip, L.chip, hidText, true);
    after += th(TY.scope, L.scope, hidText, true);
    after += th(TY.inv, L.inv, hidText, true);
    after += th(TY.busy, L.busy, hidText, true);
    after += th(TY.clip, L.clip, hidText, true);
    after += th(TY.dscope, L.dscope, inner, true, DSCOPE_MT_HI);
    after += th(TY.empty, L.empty, inner, true);
    after += MEAS_MT;

    // ── BEFORE: the letterhead whole — inventory, process block, jumps — then
    // the ledger's census, ordering note and slice, and only THEN the measures.
    // Type only: the cards' padding and borders, the district room, the slice
    // chips and the five pattern bands all count as ZERO.
    let before = bar(1, 1) + c.body.t;
    before += th(TY.chip, L.chip, hidText, false);
    before += th(TY.scope, L.scope, hidText, false);
    before += th(TY.inv, L.inv, hidText, false);
    before += th(TY.busy, L.busy, hidText, false);
    before += th(TY.clip, L.clip, hidText, false);
    before += lines(L.proc, hidText, 0.72 * REM, false) * 0.72 * REM * 1.5;
    before += 2.4 * REM; // the two jump buttons, one row
    before += th(TY.dscope, L.dscope, inner, false, DSCOPE_MT_LO);
    before += th(TY.n, L.n, inner, false);
    before += th(TY.splitp, L.splitp, inner, false);
    before += th(TY.m, L.m, inner, false);
    before += th(TY.lead, L.lead, inner, false);
    before += th(TY.empty, L.empty, inner, false);

    const A = Math.round(after), B = Math.round(before);
    ok(A <= d.dvh,
      `${d.name}: the measure list starts ${A - d.dvh}px below the fold (top at ${A}px, fold at ${d.dvh}px)`);
    if (B > d.dvh) reproduced++;
    console.log(`      ${d.name.padEnd(30)} measures at ≤${String(A).padStart(3)}px ` +
      `(fold ${d.dvh}px) · was ≥${String(B).padStart(3)}px`);
  }
  ok(reproduced >= 4,
    `the model puts the OLD order above the fold on ${DEVICES.length - reproduced} of ` +
    `${DEVICES.length} devices — if the defect does not reproduce, this model stopped modelling it`);

  // ── AND THE ORDER IS THE ORDER THE WORK ORDER NAMES ───────────────────────
  const orderOf = (sel) => {
    const m = new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[^{}]*\\{[^}]*order:\\s*(\\d+)")
      .exec(phone);
    return m ? Number(m[1]) : null;
  };
  const oHid = orderOf(".pdxif-hid");
  const oLed = orderOf("#pdx-issue-file-ledger");
  const oTail = orderOf(".pdxif-htail");
  must(oHid !== null && oLed !== null && oTail !== null,
    "the phone block no longer orders the three items of the scroller");
  ok(oHid < oLed, "the identity is not above the record");
  ok(oLed < oTail, "the record is not above the letterhead's elaboration — the essay still leads");
  const oScope = orderOf("#pdx-issue-file-ledger > .d1-scope");
  const oMeas = orderOf("#pdx-issue-file-ledger > .d1-led-meas");
  const oRest = orderOf("#pdx-issue-file-ledger > *");
  must(oScope !== null && oMeas !== null && oRest !== null,
    "the phone block no longer orders the ledger's own children");
  ok(oScope < oMeas, "the scope sentence is not above the measures it files them against");
  ok(oMeas < oRest, "the measures are not above the member patterns — the wrong half folded");
  // NOTHING IS HIDDEN. Reordering was the ask; hiding was not.
  no(phone, "display: none", "the phone block hides a block instead of moving it");
  no(phone, "visibility:", "the phone block hides a block instead of moving it");
  no(phone, "max-height", "the phone block clamps a block instead of moving it");
  no(phone, "font-size", "the phone block shrinks type to buy screen space");
  // …and nothing shrinks, which in a column flex box is the difference between a
  // scroll and a squash.
  must(/\.pdxif-hid,\s*\n\s*#pdx-issue-file-ledger,\s*\n\s*\.pdxif-htail \{ flex: 0 0 auto;/.test(phone),
    "the three items of the scroller may shrink, so a long record squashes instead of scrolling");
  must(/#pdx-issue-file-ledger > \* \{ order: \d+; flex: 0 0 auto;/.test(phone),
    "the ledger's children may shrink, so a long band squashes instead of scrolling");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · desktop is one renderer still");
// ═════════════════════════════════════════════════════════════════════════════
{
  // (a) THE PANEL MOUNTS THE BUILDER'S STRING AND NOTHING ELSE. The equality
  // that makes "one renderer" a fact rather than an intention.
  eq(LED, w1.PDXDoor1.issueProfile(KEY),
    "the ledger host is not byte-identical to PDXDoor1.issueProfile(key) any more");
  eq(w1.PDXIssueProfile.html(KEY), w1.PDXDoor1.issueProfile(KEY),
    "the address module stopped delegating to the one builder");

  // (b) EVERY DECLARATION THIS PASS ADDED TO issue-file.css IS PHONE-SCOPED,
  // except the one that makes the two halves invisible at every other width —
  // which is the declaration that keeps desktop identical.
  ok(/\.pdxif-hid,\s*\n\.pdxif-htail \{ display: contents; \}/.test(IFCSS),
    "the letterhead's halves are not `display: contents` outside the phone block, " +
    "so desktop grew two boxes it did not have");
  // Nothing else outside a media block mentions them.
  const stripMedia = (css) => {
    let out = "", i = 0;
    for (;;) {
      const at = css.indexOf("@media", i);
      if (at < 0) { out += css.slice(i); return out; }
      out += css.slice(i, at);
      let depth = 0, j = css.indexOf("{", at);
      for (; j < css.length; j++) {
        if (css[j] === "{") depth++;
        else if (css[j] === "}") { depth--; if (!depth) break; }
      }
      i = j + 1;
    }
  };
  const outside = stripMedia(IFCSS).replace(/\/\*[\s\S]*?\*\//g, "");
  eq((outside.match(/pdxif-hid|pdxif-htail/g) || []).length, 2,
    "the letterhead's halves are styled outside the phone block beyond the one contents rule");
  // The block that carries the reorder is a phone-width max-width query, and no
  // query this file does not expect arrived with it.
  const qs = [...IFCSS.matchAll(/@media\s*\(([^)]*)\)/g)].map((m) => m[1].trim());
  ok(qs.indexOf("max-width: 480px") >= 0, "the reorder is not inside a max-width:480 query");
  for (const one of qs) {
    ok(/^(min-width|max-width|prefers-reduced-motion|prefers-color-scheme)/.test(one),
      `issue-file.css grew a media query this file does not expect: ${one}`);
  }
  // And no hand-authored colour arrived with it — the family's hue still comes
  // off the one palette as a custom property.
  eq([...IFCSS.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]).join(","), "",
    "issue-file.css authors a colour by hand");
  has(IFCSS, ".pdxif-head[data-ic] > .pdxif-hid",
    "the family rail and wash do not reach the letterhead's halves once the parent stops painting");

  // (c) THE LETTERHEAD'S PIECES ARE IN THE ORDER THEY WERE IN. The two wrappers
  // are a re-nesting, not a re-ordering.
  const head = headOf(w1);
  let last = -1;
  for (const cls of ["pdxif-hid", "pdxif-chip", "pdxif-scope", "pdxif-htail", "pdxif-jumps"]) {
    const at = head.indexOf(`class="${cls}`);
    ok(at > last, `the letterhead prints ${cls} out of order`);
    last = at;
  }
  ok(head.indexOf('class="pdxif-inv"') < head.indexOf('class="pdxif-htail"'),
    "the inventory is no longer above the block that elaborates it");
  // The process block still ends immediately above the two jumps, which is the
  // shape scripts/test-issue-file-address.mjs reads it out by.
  ok(/<div class="pdxif-proc">[\s\S]*?<\/div>(?=<p class="pdxif-jumps">)/.test(head),
    "the process block no longer sits immediately above the two jumps");

  // (d) NO NEW SCORE, NO PARTY SORT, NO NEW KEY. Swept over what this pass added
  // to the desk: the why-line's three helpers and the row door.
  const cut = (from, to) => {
    const a = DESK.indexOf(from), b = DESK.indexOf(to);
    must(a >= 0 && b > a, `this pass's source could not be isolated from the desk (${from})`);
    return DESK.slice(a, b);
  };
  const added = cut("var WHY_BLANK", "function measuresHtml") +
    cut("var ROW_CTL", "window.PDXDoor1 = {");
  must(added.length > 800, "this pass's own source is smaller than it was written");
  for (const t of ["Republican", "Democrat", "GOP", "Direction Match", "WVA",
    "percent", "score", "ranking", ".sort(", "issueKeys", "ISSUE_MAP"]) {
    no(added, t, `this pass's source mentions "${t}"`);
  }
  // The why-line reads the mapping it was handed and nothing else.
  has(DESK, "m && m.rationale",
    "the desk no longer carries the mapping's own rationale onto the face");
  // The desk still asks compare-hub.js for the one office classifier rather than
  // keeping a second one — the stub in this harness is why that has to be said.
  has(DESK, "_pdxBrowseType", "the desk stopped asking for the one office classifier");
  console.log("      panel == builder · 1 contents rule outside the phone block · 0 hex · letterhead order held");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the files travel together behind a version that moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  const v = Number((/const CACHE_VERSION = 'v(\d+)'/.exec(SW) || [, 0])[1]);
  must(v > 0, "CACHE_VERSION is not readable from sw.js any more");
  ok(v >= 202, `sw.js CACHE_VERSION is v${v} — this pass changed issue-file.js, issue-file.css, ` +
    "door1-workspace.js and door1-workspace.css, all four precached, so the shell has to move");
  for (const f of ["/issue-file.js", "/issue-file.css", "/door1-workspace.js", "/door1-workspace.css"]) {
    has(SW, `'${f}'`, `${f} is not in the precache list, so the four files do not travel together`);
  }
  has(SW, "const SHELL_CACHE = `${SHELL_PREFIX}${CACHE_VERSION}`",
    "the shell cache name no longer carries CACHE_VERSION, so a bump does not drop the stale panel");
  // The cleaner has to be on the page BEFORE the desk renders a row.
  ok(HTML.indexOf('src="/receipt-cards.js"') < HTML.indexOf('src="/door1-workspace.js"'),
    "index.html loads the desk before the cleaner it takes its reader sentence from");
  console.log(`      shell v${v} · panel, stylesheet and desk travel together · cleaner loads first`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · every fix is load-bearing");
// ═════════════════════════════════════════════════════════════════════════════
{
  const probes = [
    {
      name: "the mapping's rationale stops reaching the face and every row goes blank",
      run: async () => {
        const src = DESK.replace("      if (!s.rat && rat) s.rat = String(rat);", "");
        must(src !== DESK, "probe 1 matched nothing — the face's rationale carry was reworded");
        const w = warmAll(boot({ path: `/i/${KEY}`, desk: src }));
        await arriveAt(w);
        return whysIn(rowOf(ledgerOf(w), NUM))[0] === BLANK;
      },
    },
    {
      name: "the cleaner is skipped and the curator's working field is published raw",
      run: async () => {
        const src = DESK.replace(
          "      if (fn(f)) { try { t = String(f(raw) || ''); } catch (e) { t = ''; } }",
          "      t = raw;");
        must(src !== DESK, "probe 2 matched nothing — the cleaner call was reworded");
        const w = warmAll(boot({ path: `/i/${KEY}`, desk: src }));
        await arriveAt(w);
        const t = whysIn(rowOf(ledgerOf(w), NUM))[0] || "";
        return /^\s*primary\s*:/i.test(t) || /\bweight/i.test(t) || t !== why;
      },
    },
    {
      name: "the two-sentence cap is dropped and the row prints the whole rationale",
      run: async () => {
        const src = DESK.replace("  var WHY_SENT = 2;", "  var WHY_SENT = 99;");
        must(src !== DESK, "probe 3 matched nothing — the sentence cap was reworded");
        const w = warmAll(boot({ path: `/i/${CAP_KEY}`, desk: src }));
        await arriveAt(w);
        return split(whysIn(rowOf(ledgerOf(w), CAP_NUM))[0] || "").length > 2;
      },
    },
    {
      name: "the honest blank is dropped and an unwritten rationale prints nothing",
      run: async () => {
        const src = DESK.replace("    if (!t) return WHY_BLANK;", "    if (!t) return '';");
        must(src !== DESK, "probe 4 matched nothing — the honest blank's guard was reworded");
        const w = warmAll(boot({ path: "/i/climate_action", desk: src }));
        await arriveAt(w);
        return ledgerOf(w).indexOf('<span class="d1-led-bwhy"></span>') >= 0;
      },
    },
    {
      name: "the row door stops respecting the controls inside it and double-opens",
      run: async () => {
        const src = DESK.replace("      if (ctl && row.contains && row.contains(ctl)) return;", "");
        must(src !== DESK, "probe 5 matched nothing — the row door's control check was reworded");
        const w = boot({ path: `/i/${KEY}`, desk: src });
        const btn = {
          tag: "button", cls: ["d1-bdoor", "is-num"], clicked: 0,
          click() { this.clicked++; }, contains: () => false,
        };
        const row = {
          tag: "li", cls: ["d1-led-b"], contains: (o) => o === btn,
          querySelector: () => btn, closest: () => row,
        };
        btn.closest = (sel) => (String(sel).indexOf("button") >= 0 ? btn : row);
        w.PDXDoor1.billRowTap({ target: btn });
        return btn.clicked > 0;
      },
    },
    {
      name: "the phone reorder is removed and the record goes back below the letterhead",
      run: async () => {
        const at = IFCSS.indexOf("@media (max-width: 480px) {");
        must(at >= 0, "probe 6 matched nothing — the phone block is gone");
        const rule = /#pdx-issue-file-ledger > \.d1-led-meas \{ order:/;
        return rule.test(IFCSS) && !rule.test(IFCSS.slice(0, at));
      },
    },
  ];
  for (const pr of probes) {
    const caught = await pr.run();
    ok(caught, `LOAD-BEARING PROBE NOT CAUGHT — ${pr.name}`);
    console.log(`      · ${pr.name} → ${caught ? "caught" : "NOT CAUGHT"}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Report
// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ issue file first screen: ${failures.length} failure(s)`);
  failures.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
console.log(`\n✓ issue file first screen: all ${passed} assertions passed — ` +
  "the provisions lead, every row says why, and the row is the door");
