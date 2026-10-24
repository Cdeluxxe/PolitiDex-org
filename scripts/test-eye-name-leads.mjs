#!/usr/bin/env node
/**
 * test-eye-name-leads.mjs — a name search leads with the person named
 * ─────────────────────────────────────────────────────────────────────────────
 * THE REPORT. On a phone, typing "trump" into the All-Seeing Eye put Donald
 * Trump below the first screen. The formal lane's people order put "does this
 * pid hold a formal record" ahead of "is this the person the reader typed", and
 * a president casts no roll calls. So on any device whose roll-call lanes had
 * already landed, every legislator whose file merely mentions him outranked
 * him; "donald trump" put Byron Donalds, Donald Norcross and Donald Beyer first
 * the same way. The desktop looked fine more often only because its lanes were
 * still cold on the first keystroke.
 *
 * What this file pins:
 *
 *   1. THE BURYING CONDITION IS REAL. With every other roster pid holding a
 *      formal record (a warm device), people other than Donald Trump match
 *      "trump" and hold a record while he holds none.
 *   2. THE NAME LEADS, COLD AND WARM, IN BOTH LANES. "trump", "Trump",
 *      "donald trump", "TRUMP " and the partial "trum" all put Donald Trump at
 *      the top of the politicians list.
 *   3. A PERSONAL NUDGE CANNOT OUTVOTE THE NAME. A teammate whose name only
 *      starts with the query, boosted by My Team and a saved receipt, still
 *      sits below the person whose whole surname was typed — in the public lane
 *      too, which has no record keys at all.
 *   4. THE OLDER NAME PROMISES STILL HOLD. "mike lee" leads with Senator Lee,
 *      "cox" with Governor Cox, "lee" with somebody actually called Lee.
 *   5. THE GUARDS ARE LOAD-BEARING. The previous comparator (record first, name
 *      second) and the public lane without the name partition are re-run and
 *      required to bury Trump, so a green run is not a green no-op.
 *   6. RELEVANCE DID NOT MOVE. score() and rank() are byte-identical with HEAD;
 *      only the order of what already matched changed.
 *   7. THE PHONE PAINT IS LIGHTER AND THE DESKTOP PAINT IS NOT TOUCHED. On a
 *      coarse pointer the lead group keeps six rows and every later group opens
 *      on three; on a desktop pointer every group keeps six. Lane counts are the
 *      same on both.
 *   8. A KEYSTROKE NO LONGER RESOLVES THE WHOLE ROSTER. polIdGroups() is called
 *      from buildIndex() only; the cache key and the warm test count raw ids.
 *   9. THE SHELL MOVED. index.html is precached and changed, so CACHE_VERSION is
 *      past v345 and the touch rule that drops the panel blur ships in it.
 *
 *   node scripts/test-eye-name-leads.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HEAD = (f) => {
  try { return execFileSync("git", ["show", "HEAD:" + f], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};
const EYE_SRC = R("all-seeing-eye.js");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`\n✗ eye name leads: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

const TRUMP = "trump";
// A PROFILES-only near-name: the query starts one of its words but is not one
// of them, so it is a partial-name match and nothing more.
const NEAR_ID = "mike_trumpowski_stub";
const NEAR = { name: "Mike Trumpowski", office: "Candidate", state: "Ohio", bio: "First-time candidate." };

function stubNode() {
  const set = new Set();
  const n = {
    id: "", className: "", innerHTML: "", textContent: "", value: "", tagName: "DIV",
    style: { setProperty() {}, removeProperty() {} }, dataset: {}, hidden: false,
    _attrs: {}, _li: {},
    classList: {
      add: (c) => set.add(c), remove: (c) => set.delete(c),
      toggle: (c) => (set.has(c) ? set.delete(c) : set.add(c)), contains: (c) => set.has(c),
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

const EXTRAS = ["pdx-issue-family.js", "issue-colors.js", "formal-index.js", "bills-index.js",
  "profile-evidence.js", "person-link.js"];

// opts.warm — every roster pid except the ones in opts.noRecord holds a formal
//             record, which is what a device whose roll-call lanes landed sees.
// opts.team — pids on My Team (and saved from), for the personal nudge.
// opts.touch — a coarse pointer.
function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const panel = stubNode(), input = stubNode(), eye = stubNode(), clear = stubNode();
  input.tagName = "TEXTAREA";
  const ids = { "pdx-eye-panel": panel, "pdx-eye-input": input, "pdx-eye": eye, "pdx-eye-clear": clear };
  win.document.getElementById = (id) => ids[id] || null;
  win.history = { replaceState() {}, pushState() {} };
  const store = {};
  if (opts.team) store.politidex_my_politicians = JSON.stringify(opts.team);
  win.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; },
  };
  if (opts.touch) win.matchMedia = () => ({ matches: true, addEventListener() {}, addListener() {} });
  const ctx = vm.createContext(win);
  for (const f of [...ENGINE_FILES, ...EXTRAS]) vm.runInContext(R(f), ctx, { filename: f });
  win.PROFILES = Object.assign({}, win.CMP_DATA, opts.near ? { [NEAR_ID]: NEAR } : {});
  win.PDXSpotlight = { list: () => [], registry: {} };
  win.PDXLazyData = { ensure: () => Promise.resolve(true), loaded: () => true, whenReady: (k, cb) => cb() };
  win._issueLabel = (k) => (win.ISSUE_MAP && win.ISSUE_MAP[k] && win.ISSUE_MAP[k].label) || "";
  win.__pdxEyeBillsLive = (win.PDX_BILLS_INDEX || []).slice();
  win._getPhotoUrl = (id) => `/img/${id}.jpg`;
  if (opts.team) win.PDXSaved = { list: () => opts.team.map((p) => ({ type: "receipt", key: p + "|x|y", polId: p })), has: () => false };
  if (opts.warm) {
    const FI = win.PDXFormalIndex;
    must(FI && typeof FI.acts === "function", "PDXFormalIndex.acts is unavailable");
    const orig = FI.acts.bind(FI);
    const none = new Set(opts.noRecord || []);
    FI.acts = (id) => (none.has(id) ? 0 : (orig(id) || 40));
  }
  vm.runInContext(opts.src || EYE_SRC, ctx, { filename: "all-seeing-eye.js" });
  must(win.PDXEye && typeof win.PDXEye.render === "function", "PDXEye.render is unavailable");
  return {
    win, panel,
    lane(m) { return win.PDXEye.lane(m); },
    search(q) {
      eye.classList.add("is-open");
      input.value = q;
      win.PDXEye.rebuild();
      win.PDXEye.render(q);
      return panel.innerHTML || "";
    },
  };
}

// The people rows in paint order — the politicians groups only, not receipts.
function polGroupIds(h) {
  const out = [];
  for (const cat of ["pol", "polAlso"]) {
    const m = new RegExp(`<div class="pdx-eye-cat" data-cat="${cat}">([\\s\\S]*?)(?=<div class="pdx-eye-cat" data-cat=|$)`).exec(String(h));
    if (!m) continue;
    for (const r of m[1].matchAll(/data-kind="pol" data-id="([^"]*)"/g)) if (!out.includes(r[1])) out.push(r[1]);
  }
  return out;
}
function groupRows(h) {
  const out = {};
  for (const m of String(h).matchAll(/<div class="pdx-eye-cat" data-cat="([^"]+)">([\s\S]*?)(?=<div class="pdx-eye-cat" data-cat=|<div class="pdx-eye-hint|$)/g)) {
    out[m[1]] = (m[2].match(/<div class="pdx-eye-res"/g) || []).length;
  }
  return out;
}
const laneN = (h) => [...String(h).matchAll(/data-eye-lane="([^"]+)"[\s\S]*?class="pdx-eye-lane-n[^"]*"[^>]*>([^<]*)</g)]
  .map((m) => m[1] + "=" + m[2]).join("|");

// The sitting-legislator shells (db/roster-state-legislators-ca-tx-fl-2026-oct.json)
// are identity rows with no formal record anywhere, so the warm fixture does not
// invent one for them either.
const SHELLS = JSON.parse(R("db/roster-state-legislators-ca-tx-fl-2026-oct.json")).rows.map((r) => r.pid);
const WARM = { warm: true, noRecord: [TRUMP, ...SHELLS] };
const QUERIES = ["trump", "Trump", "TRUMP ", "donald trump", "Donald Trump", "trum"];

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the burying condition is real");
// ═════════════════════════════════════════════════════════════════════════════
{
  const b = boot(WARM);
  must(b.win.CMP_DATA[TRUMP] && b.win.CMP_DATA[TRUMP].name === "Donald Trump", "the roster has no Donald Trump at pid trump");
  must(!b.win.PDXFormalIndex.acts(TRUMP), "the fixture gave Donald Trump a formal record — nothing to bury him under");
  b.lane("formal");
  const ids = polGroupIds(b.search("trump"));
  const rivals = ids.filter((id) => id !== TRUMP && b.win.PDXFormalIndex.acts(id) > 0);
  must(rivals.length >= 2, `only ${rivals.length} record-holding rivals match "trump" — the report cannot be reproduced`);
  console.log(`      ${rivals.length} record-holders match "trump" (${rivals.slice(0, 3).join(", ")}); Donald Trump holds none`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the name leads, cold and warm, in both lanes");
// ═════════════════════════════════════════════════════════════════════════════
for (const [label, opts] of [["cold", {}], ["warm", WARM], ["warm touch", { ...WARM, touch: true }]]) {
  const b = boot(opts);
  for (const mode of ["formal", "public"]) {
    b.lane(mode);
    for (const q of QUERIES) {
      const ids = polGroupIds(b.search(q));
      eq(ids[0], TRUMP, `${label}/${mode}/${JSON.stringify(q)}: Donald Trump is not first in the politicians list (${ids.slice(0, 4).join(", ")})`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · a personal nudge cannot outvote the name");
// ═════════════════════════════════════════════════════════════════════════════
const NUDGE = { ...WARM, near: true, team: [NEAR_ID, "chris_garten", "rodric_bray"] };
{
  const b = boot(NUDGE);
  for (const mode of ["formal", "public"]) {
    b.lane(mode);
    const ids = polGroupIds(b.search("trump"));
    must(ids.includes(NEAR_ID), `${mode}: the near-name fixture does not match "trump" at all`);
    eq(ids[0], TRUMP, `${mode}: a teammate outranked the person named (${ids.slice(0, 4).join(", ")})`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the older name promises still hold");
// ═════════════════════════════════════════════════════════════════════════════
{
  const b = boot({ warm: true, noRecord: [TRUMP, "cox"] });
  for (const mode of ["formal", "public"]) {
    b.lane(mode);
    eq(polGroupIds(b.search("mike lee"))[0], "lee", `${mode}/"mike lee": Senator Lee is not first`);
    eq(polGroupIds(b.search("cox"))[0] === "cox" || polGroupIds(b.search("cox"))[0] === "bill_cox_rich", true,
      `${mode}/"cox": the first row is not somebody called Cox`);
    const lee = polGroupIds(b.search("lee"));
    const first = b.win.CMP_DATA[lee[0]] || b.win.PROFILES[lee[0]] || {};
    ok(/(^|[^a-z])lee([^a-z]|$)/i.test(first.name || ""), `${mode}/"lee": the first row (${first.name}) is not called Lee`);
  }
  // And Wilcox still sits below Cox: the name-edge split is untouched.
  b.lane("formal");
  const cox = polGroupIds(b.search("cox"));
  ok(cox.indexOf("cox") < cox.indexOf("ryan_d_wilcox"), `"cox": Wilcox outranked Governor Cox (${cox.join(", ")})`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the guards are load-bearing");
// ═════════════════════════════════════════════════════════════════════════════
{
  const CMP_NEW = "return (b.n - a.n) || (b.f - a.f) || (b.o - a.o) || (b.t - a.t) || (a.i - b.i);";
  const CMP_OLD = "return (b.f - a.f) || (b.n - a.n) || (b.o - a.o) || (b.t - a.t) || (a.i - b.i);";
  must(EYE_SRC.includes(CMP_NEW), "recordFirst()'s comparator is not the name-first one this file guards");
  const recordMutant = EYE_SRC.replace(CMP_NEW, CMP_OLD);
  const m = boot({ ...WARM, src: recordMutant });
  m.lane("formal");
  ok(polGroupIds(m.search("trump"))[0] !== TRUMP, "the record-first mutant still put Trump first — section 2 proves nothing");
  ok(polGroupIds(m.search("donald trump"))[0] !== TRUMP, "the record-first mutant still put Trump first on the full name");

  const PART = "      else pols = namedFirst(pols, q);";
  must(EYE_SRC.includes(PART), "the public lane's name partition is gone");
  const publicMutant = EYE_SRC.replace(PART, "");
  const p = boot({ ...NUDGE, src: publicMutant });
  p.lane("public");
  ok(polGroupIds(p.search("trump"))[0] !== TRUMP, "the public mutant still put Trump first — section 3 proves nothing");
  console.log("      record-first comparator and un-partitioned public lane both bury Trump");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · relevance did not move");
// ═════════════════════════════════════════════════════════════════════════════
{
  const head = HEAD("all-seeing-eye.js");
  const grab = (src, sig) => (src.match(new RegExp("function " + sig + "[\\s\\S]*?\\n    \\}")) || [""])[0];
  if (!head) console.log("      no HEAD copy available — the byte-identity check is skipped");
  else if (!head.includes("function nameStrength(")) {
    for (const sig of ["score\\(", "rank\\(", "subseq\\(", "subseqName\\(", "personalBoost\\("]) {
      const a = grab(head, sig), b = grab(EYE_SRC, sig);
      must(a.length > 0, `HEAD has no ${sig} to compare`);
      eq(b, a, `${sig.replace("\\(", "()")} changed — this pass re-orders matches, it does not re-score them`);
    }
  } else console.log("      HEAD already carries this pass — the byte-identity check is vacuous and skipped");
  const ordering = grab(EYE_SRC, "nameStrength\\(") + grab(EYE_SRC, "namedFirst\\(") + grab(EYE_SRC, "recordFirst\\(");
  must(ordering.length > 0, "the name ordering cannot be read");
  for (const banned of ["party", "pct", "wva", "WordAction", "finance", "raised", "donor", "money", "leader"]) {
    ok(!ordering.includes(banned), `the name ordering reads ${JSON.stringify(banned)}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the phone paint is lighter and the desktop paint is not touched");
// ═════════════════════════════════════════════════════════════════════════════
{
  const desk = boot(), touch = boot({ touch: true });
  for (const mode of ["formal", "public"]) {
    desk.lane(mode); touch.lane(mode);
    for (const q of ["t", "utah", "lee", "health"]) {
      const hd = desk.search(q), ht = touch.search(q);
      const gd = groupRows(hd), gt = groupRows(ht);
      const keys = Object.keys(gd);
      if (!keys.length) continue;
      for (const k of keys) ok(gd[k] <= 6, `desktop ${mode}/${q}: group ${k} painted ${gd[k]} rows`);
      eq(Object.keys(gt).join(","), keys.join(","), `${mode}/${q}: touch printed different groups than desktop`);
      eq(gt[keys[0]], gd[keys[0]], `${mode}/${q}: the lead group lost rows on touch`);
      for (const k of keys.slice(1)) ok(gt[k] === Math.min(3, gd[k]), `touch ${mode}/${q}: group ${k} painted ${gt[k]} rows, want ${Math.min(3, gd[k])}`);
      must(laneN(hd).length > 0, `${mode}/${q}: the lane counts cannot be read off the toggle`);
      eq(laneN(ht), laneN(hd), `${mode}/${q}: the lane counts differ between touch and desktop`);
      eq(polGroupIds(ht)[0], polGroupIds(hd)[0], `${mode}/${q}: the first person differs between touch and desktop`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · a keystroke no longer resolves the whole roster");
// ═════════════════════════════════════════════════════════════════════════════
{
  const CODE = EYE_SRC.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  const calls = (CODE.match(/polIdGroups\(\)/g) || []).length;
  eq(calls, 2, "polIdGroups() is called somewhere other than its definition and buildIndex()");
  ok(/var key = rawPolCount\(\)/.test(CODE), "getIndex()'s cache key resolves the roster again");
  ok(/people: function \(\) \{ return rawPolCount\(\) > 0/.test(CODE), "the people lane's warm test resolves the roster again");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · the shell moved");
// ═════════════════════════════════════════════════════════════════════════════
{
  const SW = R("sw.js");
  const v = Number((/const CACHE_VERSION = 'v(\d+)';/.exec(SW) || [])[1]);
  ok(v >= 346, `CACHE_VERSION v${v} — index.html changed, so a warm device would keep the old shell`);
  const IDX = R("index.html");
  const coarse = /@media \(hover:none\) and \(pointer:coarse\)\{[\s\S]*?\.pdx-eye-panel\{backdrop-filter:none;/.test(IDX);
  ok(coarse, "the touch rule that drops the panel's backdrop blur is not in index.html");
  ok(/\.pdx-eye-actions,\.pdx-eye-rel\{animation:none;\}/.test(IDX), "the touch rule that stops the strip animation is gone");
}

if (failures.length) {
  console.error(`\n✗ eye name leads: ${failures.length} failure(s), ${passed} passed`);
  for (const f of failures) console.error("   ✗ " + f);
  process.exit(1);
}
console.log(`\n✓ eye name leads: all ${passed} assertions passed — the person named leads, cold or warm, on any pointer`);
