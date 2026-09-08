#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-your-file.mjs — the reader's own eight, and nothing else
// ─────────────────────────────────────────────────────────────────────────────
// Alignment and every ballot comparison in this app need one fact the app had
// no honest place to hold: WHERE THE READER STANDS. Two surfaces looked like
// they were asking and neither was — a Forum chip is a thread's topic, and the
// District Room poll is (district × issue), tallied, behind residency. So Your
// file is the third thing, at #your-file, and it is the small one.
//
// This file guards the four edges that make it that and not something else:
//
//   1. EIGHT ROWS, AND THERE IS NO NINTH. ISSUE_MAP carries 100-odd keys; the
//      locked list is eight of them, hard-coded, and every way a ninth could
//      arrive is closed: it is not painted, set() refuses it, and a snapshot
//      pulled from another device that carries one has it dropped on the way in.
//      The eight are real ISSUE_MAP keys printing the SHIPPED chip label, so
//      this file cannot found a parallel issue vocabulary.
//   2. SAVE + RELOAD KEEPS THE ANSWERS FOR THAT UID. Signed out, the eight
//      still render, every control is disabled and nothing is written. Signed
//      in, an answer survives a cold boot — and a DIFFERENT account on the same
//      device sees none of it, which is the half that is easy to ship broken:
//      without it the pull reconciler would merge one person's file into the
//      next person's snapshot and push it up under their name.
//   3. THE ALIGNMENT PATH CONSUMES THE EIGHT. Not "could read them" — the user
//      side resolves through the file FIRST on those eight keys, the eight are
//      projected into the selection the engine actually scores, and flipping an
//      answer moves a real score. 'Not sure' is the one answer that puts no
//      side in, because a reader's silence gets the same treatment a
//      candidate's does: dropped, never guessed.
//   4. THE FORUM STORE IS UNTOUCHED. Observed, not asserted about comments:
//      drive the whole feature with an instrumented sandbox and there is no
//      fetch at all, PDXForum is never called, #open-forum is never navigated
//      to, and no dd_poll_answers / dd_threads / forum key is written.
//
//   Plus the wiring the brief names: one address, one control in Door 2's
//   existing action row (no new nav pill), and the copy line exactly.
//
//   node scripts/test-your-file.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const YF_JS = R("your-file.js");
const YF_CSS = R("your-file.css");
const ALIGN_JS = R("alignment-tool.js");
const INDEX = R("index.html");
const SYNC_FN = R("netlify/functions/pdx-sync.mts");
const SW = R("sw.js");

// Source-level claims are made against code, not prose: every "must not
// contain" below runs on the comment-stripped file.
const strip = (src) =>
  String(src).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
const YF_CODE = strip(YF_JS);

// The brief's eight slugs, verbatim. Three differ from the shipped ISSUE_MAP
// key; the module records both and stores the shipped one.
const ASKED = [
  "lands_preserve", "housing", "housing_build", "gun_rights",
  "education_public", "education_choice", "energy_production", "taxes_lower",
];
const COPY_LINE =
  "Your positions. Used to compare formal records. Not a vote. Not a district poll.";

// ── The engine files, in load order ─────────────────────────────────────────
// The same set the My Stances suite boots, because the assertion "flipping an
// answer moves a real score" needs the real politician data and the real
// record side-map behind _calcAlignmentScore, not a stand-in for them.
const FILES = [
  "cmp-data.js",
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  "stance-helpers.js",
  "alignment-tool.js",
  "acct-spotlight-data.js",
  "say-vs-do.js",
  "exec-action-data.js",
  "exec-record.js",
  "exec-record-ui.js",
  "consistency.js",
  "voting-record.js",
  "word-action.js",
  "profile-spine.js",
  "issue-colors.js",
  "my-stances.js",
  "your-file.js",
];
const SRC = FILES.map((f) => [f, R(f)]);

// ── A small real DOM ────────────────────────────────────────────────────────
// The shared sandbox returns null from getElementById, which your-file.js
// treats as "there is no page to build in" — the panel would refuse to open and
// none of the painted markup below could be observed.
function makeDom() {
  const win = makeSandbox();
  const nodes = [];
  function node(tag) {
    const n = {
      tagName: String(tag || "div").toUpperCase(),
      id: "", className: "", innerHTML: "", textContent: "", hidden: false,
      children: [], parentNode: null, attrs: {}, disabled: false, scrollTop: 0,
      style: { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
      insertBefore(c, ref) {
        c.parentNode = this;
        const i = this.children.indexOf(ref);
        if (i < 0) this.children.push(c); else this.children.splice(i, 0, c);
        return c;
      },
      removeChild(c) {
        const i = this.children.indexOf(c);
        if (i >= 0) this.children.splice(i, 1);
        return c;
      },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      closest() { return null; },
      focus() {}, click() {}, remove() {}, scrollIntoView() {},
      insertAdjacentHTML() {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    };
    nodes.push(n);
    return n;
  }
  const body = node("body");
  const winOn = {};
  const docOn = {};
  const doc = {
    readyState: "complete", cookie: "",
    body, head: node("head"), documentElement: node("html"),
    createElement: (t) => node(t),
    getElementById: (id) => nodes.find((n) => n.id === id) || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(t, fn) { if (typeof fn === "function") (docOn[String(t)] = docOn[String(t)] || []).push(fn); },
    removeEventListener() {}, dispatchEvent() { return true; },
  };
  win.document = doc;
  win.__nodes = nodes;
  win.__winOn = winOn;
  win.__docOn = docOn;
  win.addEventListener = (t, fn) => { if (typeof fn === "function") (winOn[String(t)] = winOn[String(t)] || []).push(fn); };
  win.removeEventListener = () => {};
  // Every event this feature dispatches, captured — this is how "the forum was
  // never poked" and "a change is announced once" are both observable.
  win.__events = [];
  win.dispatchEvent = (ev) => { win.__events.push(ev); return true; };
  win.location = {
    href: "https://www.politidex.fyi/", pathname: "/", search: "", hash: "",
    origin: "https://www.politidex.fyi",
  };
  win.__pushed = [];
  win.history = {
    pushState(s, t, u) { win.__pushed.push(String(u)); const h = String(u).indexOf("#"); win.location.hash = h < 0 ? "" : String(u).slice(h); },
    replaceState() {},
  };
  // No fetch is allowed to succeed silently: every call is recorded AND
  // rejected, so a stray network reach shows up as a URL in this list.
  win.__fetched = [];
  win.fetch = (u, o) => { win.__fetched.push(String(u)); return Promise.reject(new Error("no network in test")); };
  return win;
}

// A uid-namespaced PDXStore faithful to the real one's contract: read/write are
// raw JSON over one backing map, defineCollection / registerSnapshot /
// registerReconciler are recorded, and a write marks its named collection dirty.
function makeStore(backing) {
  const slots = backing || {};
  const st = {
    __slots: slots,
    __collections: {},
    __snapshots: {},
    __reconcilers: {},
    __dirty: {},
    __account: null,
    read(k, d) {
      const raw = Object.prototype.hasOwnProperty.call(slots, k) ? slots[k] : null;
      if (raw == null) return d === undefined ? null : d;
      try { return JSON.parse(raw); } catch (e) { return d === undefined ? null : d; }
    },
    write(k, v, opts) {
      slots[k] = JSON.stringify(v);
      const col = opts && opts.collection;
      if (col && !(opts && opts.dirty === false)) st.__dirty[col] = true;
      return true;
    },
    defineCollection(name, spec) { st.__collections[name] = spec || {}; },
    registerSnapshot(name, fn) { st.__snapshots[name] = fn; },
    registerReconciler(name, fn) { st.__reconcilers[name] = fn; },
    markDirty(name) { st.__dirty[name] = true; },
    isDirty(name) { return !!st.__dirty[name]; },
    getAccount() { return st.__account; },
  };
  return st;
}

// One booted app. `uid` signs a member in (null = signed out); `backing` and
// `store` let a second boot share the first boot's storage, which is what makes
// "save + reload" a reload rather than a re-read.
function boot(opts) {
  const o = opts || {};
  const win = makeDom();
  const store = o.store || makeStore(o.backing || {});
  const raw = o.rawStorage || {};
  win.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(raw, k) ? raw[k] : null),
    setItem: (k, v) => { raw[k] = String(v); },
    removeItem: (k) => { delete raw[k]; },
  };
  win.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  if (o.store !== null) win.PDXStore = store;
  if (o.account !== undefined) store.__account = o.account;
  else if (o.uid) store.__account = o.uid;
  win.auth = {
    currentUser: o.uid ? { uid: o.uid, isAnonymous: false } : null,
    onAuthStateChanged() {},
  };
  // A spy standing exactly where the forum's only client bridge stands. If any
  // part of this feature reaches for it, the call is recorded.
  win.__forumCalls = [];
  win.PDXForum = {
    openForTopic: (t) => { win.__forumCalls.push("openForTopic:" + t); },
    startThreadFor: (t) => { win.__forumCalls.push("startThreadFor:" + t); },
  };
  const ctx = vm.createContext(win);
  win.__loadErrors = [];
  for (const [f, src] of SRC) {
    try { vm.runInContext(src, ctx, { filename: f }); }
    catch (e) { win.__loadErrors.push(`${f}: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
  win.__store = store;
  win.__raw = raw;
  return win;
}

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
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ your-file: ${msg}`);
  process.exit(1);
};

const probe = boot({ uid: "u_probe" });
must(probe.PDXYourFile, `window.PDXYourFile is not exposed — boot errors: ${probe.__loadErrors.join(" | ")}`);
const YF = probe.PDXYourFile;
must(typeof YF.set === "function" && typeof YF.level === "function",
  "PDXYourFile is missing set()/level()");
must(probe.ISSUE_MAP && Object.keys(probe.ISSUE_MAP).length > 40,
  `ISSUE_MAP did not load — boot errors: ${probe.__loadErrors.join(" | ")}`);
must(typeof probe._calcAlignmentScore === "function",
  "_calcAlignmentScore is not exposed — the alignment path cannot be observed");
must(probe._alignIssues && typeof probe._alignIntensity === "object",
  "the engine's selection/intensity state is not exposed — the projection cannot be observed");

// THE READER'S SIDE, AS THE TWO SCORING LANES WILL RESOLVE IT.
// Both lanes read `_alignMigrateLevel(_alignIntensity[key] || ALIGN_DEFAULT_LEVEL)`
// over the picked set, and this pass did not change either line. Your file gets
// consumed by pushing its answers THROUGH the tool's own public entry points
// (alignSetIntensity / alignToggleIssue), so what the lanes read IS the engine's
// own state — there is no second resolver that could drift out of step with the
// first, and no engine lane to keep in step with a module that loads after it.
const sideOf = (win, k) => (win._alignIssues && win._alignIssues.has(k))
  ? (win._alignIntensity[k] || win.ALIGN_DEFAULT_LEVEL || "support")
  : null;

const rowsOf = (html) => (String(html).match(/data-pdxyf-row="([^"]+)"/g) || []).map((m) => m.slice(16, -1));
const answeredMap = (win) => win.PDXYourFile.answers();

// ═════════════════════════════════════════════════════════════════════════════
section("1 · eight rows, and there is no ninth");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(YF.KEYS.length, 8, "the locked list is not eight issues long");
  eq(YF.ISSUES.map((r) => r.ask).join(","), ASKED.join(","),
    "the eight issues asked for are not the eight the brief names");

  // Shipped vocabulary: every stored key is a real ISSUE_MAP key with a label,
  // so a row here and the same issue anywhere else are the same issue.
  const MAP = probe.ISSUE_MAP;
  YF.KEYS.forEach((k) => {
    ok(!!MAP[k], `stored key "${k}" is not in ISSUE_MAP — the file invented a slug`);
    ok(!!(MAP[k] && MAP[k].label), `stored key "${k}" has no shipped label to print`);
  });
  // And the three renamed rows resolved to the shipped slug rather than the ask.
  const byAsk = {};
  YF.ISSUES.forEach((r) => { byAsk[r.ask] = r.key; });
  eq(byAsk.education_public, "public_schools", "education_public did not resolve to the shipped slug");
  eq(byAsk.education_choice, "school_choice", "education_choice did not resolve to the shipped slug");
  eq(byAsk.taxes_lower, "lower_taxes", "taxes_lower did not resolve to the shipped slug");
  ["education_public", "education_choice", "taxes_lower"].forEach((a) => {
    ok(!MAP[a], `"${a}" exists in ISSUE_MAP after all — the mapping table is stale`);
  });

  // The painted panel: eight rows, in the locked order, four options each.
  const w = boot({ uid: "u1" });
  const html = w.PDXYourFile.bodyHtml();
  must(html.length > 400, `the panel painted nothing — boot errors: ${w.__loadErrors.join(" | ")}`);
  const rows = rowsOf(html);
  eq(rows.length, 8, "the panel does not paint exactly eight rows");
  eq(rows.join(","), YF.KEYS.join(","), "the painted rows are not the locked list, in order");
  eq((html.match(/data-pdxyf-set="/g) || []).length, 32,
    "expected four options on each of eight rows");
  ["Support", "Oppose", "Mixed", "Not sure"].forEach((lb) => {
    has(html, ">" + lb + "<", `the "${lb}" option is not painted`);
  });
  // The shipped label, not one this file wrote.
  has(html, MAP.lands_preserve.label, "the row does not print the shipped chip label");

  // ISSUE_MAP is far wider than the eight, and the extra keys are not rows.
  const extras = Object.keys(MAP).filter((k) => YF.KEYS.indexOf(k) < 0);
  ok(extras.length > 30, `ISSUE_MAP should be much wider than eight — ${extras.length} other keys`);
  extras.forEach((k) => {
    ok(String(html).indexOf('data-pdxyf-row="' + k + '"') < 0,
      `ISSUE_MAP key "${k}" leaked into the panel as a ninth row`);
  });

  // The list is hard-coded, not derived: no walk of the issue vocabulary.
  ["Object.keys(ISSUE_MAP", "Object.keys(window.ISSUE_MAP", "CORE_NATIONAL_ISSUES", "ISSUE_ORDER"].forEach((needle) => {
    lacks(YF_CODE, needle, "your-file.js derives its list from the issue vocabulary");
  });

  // set() refuses a ninth key, and the accessors refuse to answer for one.
  const ninth = extras[0];
  eq(w.PDXYourFile.set(ninth, "support"), false, "set() accepted a key outside the eight");
  eq(w.PDXYourFile.position(ninth), null, "position() answered for a key outside the eight");
  eq(w.PDXYourFile.level(ninth), null, "level() answered for a key outside the eight");
  eq(Object.keys(answeredMap(w)).length, 0, "a refused write still stored something");
  // …and an invalid position, on a real key.
  eq(w.PDXYourFile.set("housing", "abstain"), false, "set() accepted a fifth position");
  eq(w.PDXYourFile.set("housing", ""), false, "set() accepted an empty position");

  // THE CROSS-DEVICE DOOR. A snapshot pulled from another device (or an older
  // shell) carrying a ninth key has it dropped on the way in, so the panel
  // cannot grow a row nobody shipped.
  const rec = w.__store.__reconcilers.yourFile;
  must(typeof rec === "function", "no 'yourFile' reconciler was registered — a pull cannot land");
  const poisoned = { version: 1, updatedAt: 9, answers: {} };
  poisoned.answers.lands_preserve = { position: "support", updatedAt: 9 };
  poisoned.answers[ninth] = { position: "oppose", updatedAt: 9 };
  poisoned.answers.__proto__x = { position: "support", updatedAt: 9 };
  rec(poisoned, { dirty: false });
  const after = answeredMap(w);
  eq(Object.keys(after).length, 1, "the pull did not land exactly the one legal answer");
  eq(after.lands_preserve.position, "support", "the legal answer did not survive the pull");
  ok(!after[ninth], `the ninth key "${ninth}" survived a cross-device pull`);
  eq(rowsOf(w.PDXYourFile.bodyHtml()).length, 8, "the panel grew a row after a pull");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · save + reload keeps the answers for that uid");
// ═════════════════════════════════════════════════════════════════════════════
{
  // ── Signed out: the eight still show, nothing saves, and it says why.
  const out = boot({ uid: null });
  const outHtml = out.PDXYourFile.bodyHtml();
  eq(rowsOf(outHtml).length, 8, "a signed-out reader does not see the eight");
  has(outHtml, "Sign in to keep your file.", 'the signed-out panel is missing "Sign in to keep your file."');
  eq((outHtml.match(/disabled aria-disabled="true"/g) || []).length, 32,
    "signed out, all 32 controls should be disabled");
  eq(out.PDXYourFile.set("housing", "support"), false, "a signed-out write was accepted");
  eq(Object.keys(answeredMap(out)).length, 0, "a signed-out write persisted something");
  eq(Object.keys(out.__store.__slots).length, 0, "a signed-out session wrote to the store");
  eq(out.__store.isDirty("yourFile"), false, "a signed-out session marked the collection for a push");

  // ── Signed in: all eight answered, all eight stored, and the collection is
  // queued for the push that carries them to the uid's own snapshot row.
  const backing = {};
  const w = boot({ uid: "u_alice", backing });
  const PLAN = {
    lands_preserve: "support", housing: "mixed", housing_build: "support",
    gun_rights: "oppose", public_schools: "support", school_choice: "oppose",
    energy_production: "mixed", lower_taxes: "unsure",
  };
  Object.keys(PLAN).forEach((k) => {
    ok(w.PDXYourFile.set(k, PLAN[k]) === true, `set(${k}) was refused while signed in`);
  });
  eq(w.PDXYourFile.answered().length, 8, "not all eight answers were recorded");
  eq(w.__store.isDirty("yourFile"), true, "the answers were never queued for a push");
  has(Object.keys(w.__store.__collections).join(","), "yourFile",
    "the 'yourFile' collection was never declared");
  const snap = w.__store.__snapshots.yourFile;
  must(typeof snap === "function", "no 'yourFile' snapshot provider — nothing can be pushed");
  eq(Object.keys(snap().answers).length, 8, "the pushed snapshot does not carry the eight");

  // One answer per issue: re-answering REPLACES, it does not accumulate.
  w.PDXYourFile.set("gun_rights", "support");
  eq(w.PDXYourFile.position("gun_rights"), "support", "re-answering did not replace the answer");
  eq(w.PDXYourFile.answered().length, 8, "re-answering added a row");

  // The key it wrote is this account's, and the guest key stayed empty.
  const keys = Object.keys(backing);
  eq(keys.length, 1, `expected exactly one storage key, got ${JSON.stringify(keys)}`);
  has(keys[0], "u_alice", "the stored key is not namespaced to the signed-in uid");
  ok(!Object.prototype.hasOwnProperty.call(backing, YF.KEY),
    "a signed-in answer was written to the shared guest key");

  // ── THE RELOAD. A cold boot over the same storage, same uid: the answers are
  // still there, all eight, unchanged.
  const w2 = boot({ uid: "u_alice", backing });
  eq(w2.PDXYourFile.answered().length, 8, "a reload lost the answers");
  Object.keys(PLAN).forEach((k) => {
    const want = k === "gun_rights" ? "support" : PLAN[k];
    eq(w2.PDXYourFile.position(k), want, `a reload changed the answer for ${k}`);
  });
  eq(rowsOf(w2.PDXYourFile.bodyHtml()).filter((k) => k).length, 8, "the reloaded panel is not the eight");
  eq((w2.PDXYourFile.bodyHtml().match(/aria-pressed="true"/g) || []).length, 8,
    "the reloaded panel does not show the eight answers as pressed");
  eq(w2.__store.isDirty("yourFile"), false, "a plain reload marked the collection dirty");

  // ── …FOR THAT UID. A different account on the same device sees none of it,
  // and cannot push it back up under their own name.
  const bob = boot({ uid: "u_bob", backing });
  eq(bob.PDXYourFile.answered().length, 0, "a second account on this device can read the first's file");
  eq(Object.keys(bob.__store.__snapshots.yourFile().answers).length, 0,
    "the second account's push would carry the first account's answers");
  bob.PDXYourFile.set("housing", "oppose");
  eq(bob.PDXYourFile.position("housing"), "oppose", "the second account cannot answer");
  eq(Object.keys(backing).length, 2, "the two accounts are sharing one storage key");

  // Signing back in restores the first account's file — the outgoing one was
  // isolated, never cleared.
  const back = boot({ uid: "u_alice", backing });
  eq(back.PDXYourFile.answered().length, 8, "signing back in did not restore the file");
  eq(back.PDXYourFile.position("housing"), "mixed", "the other account's answer bled through");

  // The live account switch, not just a cold boot with a different uid.
  const sw = boot({ uid: "u_alice", backing });
  eq(sw.PDXYourFile.answered().length, 8, "the switch fixture did not start with the file");
  sw.PDXYourFile.setAccount("u_bob");
  eq(sw.PDXYourFile.answered().length, 1, "an account switch did not repoint the file");
  sw.PDXYourFile.setAccount(null);
  eq(sw.PDXYourFile.answered().length, 0, "signing out did not fall back to the empty guest file");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the alignment path consumes the eight");
// ═════════════════════════════════════════════════════════════════════════════
{
  const w = boot({ uid: "u_align" });
  const LEVELS = w.ALIGN_LEVELS || ["strongly_support", "support", "neutral", "oppose", "strongly_oppose"];

  // The read-first hop, per answer. Support and Oppose are sides; Mixed is the
  // engine's neutral; 'Not sure' is NOT a level, which is what keeps a reader's
  // own silence out of the match instead of guessed at.
  w.PDXYourFile.set("lands_preserve", "support");
  eq(sideOf(w, "lands_preserve"), "support", "a Support answer is not read as a support level");
  w.PDXYourFile.set("lands_preserve", "oppose");
  eq(sideOf(w, "lands_preserve"), "oppose", "an Oppose answer is not read as an oppose level");
  w.PDXYourFile.set("lands_preserve", "mixed");
  eq(sideOf(w, "lands_preserve"), "neutral", "a Mixed answer is not read as neutral");
  w.PDXYourFile.set("lands_preserve", "unsure");
  eq(sideOf(w, "lands_preserve"), null, "'Not sure' put a side into the match");
  ok(LEVELS.indexOf("unsure") < 0, "'unsure' became an alignment level");

  // It answers ONLY for the eight. The other 110 keys fall through to the
  // signature, exactly as before this file existed.
  const extras = Object.keys(w.ISSUE_MAP).filter((k) => YF.KEYS.indexOf(k) < 0);
  extras.forEach((k) => {
    ok(sideOf(w, k) === null, `the file answered for "${k}", which is not one of the eight`);
    ok(!(k in w._alignIntensity), `the file wrote a level for "${k}", which is not one of the eight`);
  });

  // PRECEDENCE: the file is read FIRST — it REPLACES whatever the signature was
  // holding for one of its eight, rather than losing a tie to it. Seed a
  // contradicting level (and its membership, the way the tool itself would) and
  // then answer the file: the answer is what the lanes resolve.
  w.alignSetIntensity("gun_rights", "strongly_support");
  eq(sideOf(w, "gun_rights"), "strongly_support", "the seeded signature level did not take");
  w.PDXYourFile.set("gun_rights", "oppose");
  eq(sideOf(w, "gun_rights"), "oppose", "the signature overrode Your file on one of the eight");

  // The same precedence on the path that matters across devices: a signature
  // pulled from another device is a full REPLACEMENT of the selection, so it can
  // arrive holding a stale level for one of the eight — or none at all. adopt()
  // is what puts the reader's own answers back on top.
  w.alignSetIntensity("gun_rights", "strongly_support");
  eq(sideOf(w, "gun_rights"), "strongly_support", "the stale level did not take");
  w.PDXYourFile.adopt();
  eq(sideOf(w, "gun_rights"), "oppose", "adopt() did not restore the file's own side over a stale one");

  // PROJECTION: the engine only scores issues the reader has PICKED, and a
  // dozen surfaces gate their match readout on that set being non-empty — so a
  // sided answer has to land in it, through the tool's own entry point.
  const fresh = boot({ uid: "u_proj" });
  eq(fresh._alignIssues.size, 0, "the selection did not start empty");
  eq(fresh._calcAlignmentScore("curtis"), null, "an empty selection should score nothing");
  fresh.PDXYourFile.set("lands_preserve", "support");
  fresh.PDXYourFile.set("energy_production", "oppose");
  ok(fresh._alignIssues.has("lands_preserve"), "a sided answer was not projected into the selection");
  ok(fresh._alignIssues.has("energy_production"), "the second sided answer was not projected");
  eq(fresh._alignIssues.size, 2, "projection added something that was not answered");
  // 'Not sure' withdraws the side this file put there, rather than leaving a
  // stale one behind.
  fresh.PDXYourFile.set("energy_production", "unsure");
  ok(!fresh._alignIssues.has("energy_production"), "'Not sure' left its old side in the selection");
  eq(fresh._alignIssues.size, 1, "'Not sure' removed more than its own issue");

  // A COLD BOOT ADOPTS THEM. The alignment read has the reader's sides without
  // the panel ever being opened on this device — which is the whole point of a
  // file that other surfaces compare against.
  const cold = boot({ uid: "u_proj2", backing: (() => {
    const b = {};
    const seed = boot({ uid: "u_proj2", backing: b });
    seed.PDXYourFile.set("lands_preserve", "support");
    seed.PDXYourFile.set("gun_rights", "oppose");
    return b;
  })() });
  eq(cold._alignIssues.size, 0, "the cold boot's selection was populated before adopt()");
  cold.PDXYourFile.adopt();
  eq(cold._alignIssues.size, 2, "a cold boot did not adopt the file's sides");
  eq(sideOf(cold, "gun_rights"), "oppose", "the adopted side is not the file's side");

  // AND IT MOVES A REAL SCORE. Same politician, same selection, one answer
  // flipped: the number the engine returns has to change, or "reads these
  // eight" is decoration.
  const scored = boot({ uid: "u_score" });
  const PIDS = Object.keys(scored.CMP_DATA || {});
  must(PIDS.length > 0, "CMP_DATA is empty — no politician to score against");
  let moved = 0, sameCount = 0;
  const CHECK = ["lands_preserve", "gun_rights", "lower_taxes", "energy_production"];
  CHECK.forEach((key) => {
    const a = boot({ uid: "u_s_a" });
    a.PDXYourFile.set(key, "support");
    const b = boot({ uid: "u_s_b" });
    b.PDXYourFile.set(key, "oppose");
    PIDS.forEach((pid) => {
      const sa = a._calcAlignmentScore(pid);
      const sb = b._calcAlignmentScore(pid);
      if (sa == null || sb == null) return;
      if (sa !== sb) moved++; else sameCount++;
    });
  });
  ok(moved > 0, `flipping an answer never moved a score (${moved} moved / ${sameCount} identical)`);
  ok(moved > sameCount / 4, `flipping an answer barely reached the score (${moved} moved / ${sameCount} identical)`);

  // The breakdown lane reads the same resolved side, so the number and the
  // explanation of the number cannot disagree.
  const bd = boot({ uid: "u_bd" });
  bd.PDXYourFile.set("lands_preserve", "oppose");
  // The first pid the engine will actually score — a candidate with no signal on
  // the answered issue scores null in both lanes, which would make this vacuous.
  const scorable = PIDS.filter((pid) => bd._calcAlignmentScore(pid) != null);
  ok(scorable.length > 0, "no politician scores against an answered file");
  const brk = bd._calcAlignmentBreakdown(scorable[0]);
  ok(brk && typeof brk === "object", "the breakdown lane returned nothing for an answered file");
  // Both lanes are looking at the same answer, so they cannot disagree about it:
  // the breakdown's own per-issue row has to report the FILE's level, not the
  // signature default the engine would otherwise have used.
  const brkRow = (brk && brk.issues ? brk.issues : []).filter((r) => r && r.key === "lands_preserve")[0];
  ok(!!brkRow, "the breakdown does not name the issue the file answered");
  eq(brkRow && brkRow.intensity, "oppose",
    "the breakdown row reports a different user side than Your file holds");
  // AND THE TWO LANES WERE NOT TOUCHED TO GET ANY OF THIS. Both still resolve the
  // user side the way HEAD does; the file reaches them through the selection they
  // already read. That is what keeps this pass out of the pinned half of the
  // alignment engine (see AT_SEAMS in scripts/v103-chrome-seams.mjs) — and it is
  // also why the two lanes cannot disagree with each other about an answer.
  eq((strip(ALIGN_JS).match(/var _userIntensity = _alignMigrateLevel\(_alignIntensity\[issueKey\] \|\| ALIGN_DEFAULT_LEVEL\);/g) || []).length, 2,
    "a scoring lane's user-side resolution was rewritten — the projection is supposed to make that unnecessary");

  // Read-only in that direction: the alignment tool never writes the file.
  const AC = strip(ALIGN_JS);
  ["PDXYourFile.set", "PDXYourFile.setAccount"].forEach((n) => {
    lacks(AC, n, "alignment-tool.js writes into Your file");
  });
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the Forum store is untouched");
// ═════════════════════════════════════════════════════════════════════════════
{
  // OBSERVED. Drive the whole feature — open, answer all eight, re-answer,
  // withdraw, take a pull, close — and then look at what left the module.
  const w = boot({ uid: "u_quiet" });
  w.PDXYourFile.open();
  YF.KEYS.forEach((k, i) => w.PDXYourFile.set(k, ["support", "oppose", "mixed", "unsure"][i % 4]));
  w.PDXYourFile.set("housing", "oppose");
  w.__store.__reconcilers.yourFile({ version: 1, updatedAt: 1, answers: { housing: { position: "support", updatedAt: 1 } } }, { dirty: true });
  w.PDXYourFile.close();

  eq(w.__fetched.length, 0, `the feature made ${w.__fetched.length} network call(s): ${w.__fetched.join(", ")}`);
  eq(w.__forumCalls.length, 0, `the feature called PDXForum: ${w.__forumCalls.join(", ")}`);
  const hashes = w.__pushed.filter((u) => u.indexOf("#") >= 0).map((u) => u.slice(u.indexOf("#")));
  hashes.forEach((h) => eq(h, "#your-file", `the feature navigated to "${h}"`));
  ok(w.__pushed.length > 0, "the overlay never stamped its address");
  eq(w.location.hash, "", "closing the file did not put the address back");

  // The only storage this feature owns is its own key.
  Object.keys(w.__store.__slots).forEach((k) => {
    ok(k.indexOf(YF.KEY) === 0, `the feature wrote a foreign storage key: "${k}"`);
  });
  // (Other modules in the sandbox use raw localStorage; what matters is that
  // THIS feature's data went through the store, so it can be pushed at all.)
  Object.keys(w.__raw).forEach((k) => {
    ok(k.indexOf(YF.KEY) < 0, `the feature bypassed PDXStore to write raw localStorage: "${k}"`);
  });
  // And the only collection it dirtied is its own.
  eq(Object.keys(w.__store.__dirty).join(","), "yourFile",
    "the feature marked a collection other than its own for a push");
  // Every event it fired is its own.
  w.__events.forEach((ev) => {
    ok(String(ev && ev.type).indexOf("pdx-your-file") === 0,
      `the feature dispatched a foreign event: "${ev && ev.type}"`);
  });

  // AND AT SOURCE. There is no POST in the file at all, and none of the forum,
  // room or poll vocabulary.
  ["fetch(", "XMLHttpRequest", "sendBeacon", "/api/", "PDXForum", "open-forum",
   "dd_poll_answers", "dd_threads", "dd_replies", "PDXDistrictRoom", "pdx_forum",
   "startThreadFor", "openForTopic", "residency"].forEach((needle) => {
    lacks(YF_CODE, needle, "your-file.js reaches for the forum / room / poll layer");
  });
  // Nor any of the things the brief ruled out.
  ["stripe", "Stripe", "grant", "Grant", "pack", "party", "myMatch", "my_match"].forEach((needle) => {
    lacks(YF_CODE, needle, "your-file.js reaches into ruled-out territory");
  });

  // The server half is an allow-list widening and nothing more: one collection
  // added, no new table, no new endpoint.
  has(SYNC_FN, '"yourFile"', "the sync function does not allow the 'yourFile' collection");
  ["saved", "team", "evidence", "impact", "stances"].forEach((c) => {
    has(SYNC_FN, `"${c}"`, `the sync function dropped the '${c}' collection`);
  });
  lacks(SYNC_FN, "dd_poll_answers, ", "the sync function started writing poll answers");
  eq((SYNC_FN.match(/CREATE TABLE/gi) || []).length, 0, "the sync function grew a table");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · one address, one control in Door 2, and the copy");
// ═════════════════════════════════════════════════════════════════════════════
{
  // ONE ADDRESS, and it is documented in the module that owns it.
  eq(YF.HASH, "#your-file", "the overlay does not own #your-file");
  has(YF_JS, "#your-file", "the module does not document its address");
  lacks(YF_CODE, "#open-forum", "the module knows the forum's address");

  // THE COPY, exactly.
  eq(YF.COPY.line, COPY_LINE, "the panel's one line is not the copy the brief specifies");
  has(boot({ uid: "u_copy" }).PDXYourFile.bodyHtml() + boot({ uid: null }).PDXYourFile.bodyHtml(),
    "Sign in to keep your file.", "the signed-out line is not painted");
  const head = boot({ uid: "u_copy2" });
  head.PDXYourFile.open();
  const panel = head.__nodes.find((n) => n.id === "pdx-your-file-head");
  ok(panel && String(panel.innerHTML).indexOf(COPY_LINE) >= 0,
    "the copy line is not painted on the panel");

  // THE PAGE LOADS IT — script and stylesheet both.
  has(INDEX, 'src="/your-file.js"', "index.html does not load your-file.js");
  has(INDEX, 'href="/your-file.css"', "index.html does not load your-file.css");
  // After the engine, because the projection calls into it.
  ok(INDEX.indexOf('src="/alignment-tool.js"') < INDEX.indexOf('src="/your-file.js"'),
    "your-file.js loads before the alignment engine it projects into");

  // DOOR 2: ONE control, in the action row that was already there. Comments are
  // stripped first: the markup carries one such control, and the note next to it
  // that explains why is not a second one.
  const INDEX_TAGS = INDEX.replace(/<!--[\s\S]*?-->/g, " ");
  const wrm = INDEX_TAGS.slice(INDEX_TAGS.indexOf('id="who-represents-me"'));
  const wrmBlock = wrm.slice(0, 20000);
  eq((INDEX_TAGS.match(/data-pdxyf-open/g) || []).length, 1,
    "there is not exactly one control that opens Your file");
  has(wrmBlock, "data-pdxyf-open", "the Your file control is not in the Who Represents Me door");
  has(wrmBlock, "Your file", 'the control is not labelled "Your file"');
  // In the existing row, not a new one: it sits alongside the two controls that
  // were already there, inside the same .wrm-ctarow.
  const row = wrmBlock.slice(wrmBlock.indexOf('class="wrm-ctarow"'));
  const rowEnd = row.indexOf("</div>");
  has(row.slice(0, rowEnd), "data-pdxyf-open", "the control was not put in the existing action row");
  has(row.slice(0, rowEnd), "See who represents me", "the existing action row lost a control");
  has(row.slice(0, rowEnd), "Find it on the map", "the existing action row lost a control");
  // NOT A NAV PILL.
  const nav = INDEX_TAGS.slice(0, INDEX_TAGS.indexOf('id="who-represents-me"'));
  lacks(nav.slice(Math.max(0, nav.length - 400000)).match(/<nav[\s\S]*?<\/nav>/g)?.join(" ") || "",
    "data-pdxyf-open", "the control was added to the nav");
  // A real anchor, so it can be copied and middle-clicked.
  has(wrmBlock, 'href="#your-file"', "the control is not a real link to the address");

  // THE SHELL WAS INVALIDATED. /alignment-tool.js and / are precached, and both
  // changed, so a stale shell would serve the old engine against the new file.
  const ver = (SW.match(/CACHE_VERSION\s*=\s*'(v\d+)'/) || [])[1];
  ok(ver && Number(ver.slice(1)) >= 161, `the service worker cache version was not bumped (${ver})`);
  lacks(SW.match(/SHELL_ASSETS[\s\S]{0,4000}/)?.[0] || "", "/your-file.js",
    "your-file.js was precached into the shell");

  // NOT A SCORECARD, AND NOT A METER. No verdict palette on the reader's own
  // positions: a reader's position cannot come out right or wrong.
  ["#16a34a", "#22c55e", "#dc2626", "#ef4444", "#15803d", "#b91c1c"].forEach((hex) => {
    lacks(YF_CSS, hex, "the verdict palette is used on the reader's own positions");
  });
  ["grade", "score", "rank", "percentile", "0-100"].forEach((n) => {
    lacks(strip(YF_CSS).toLowerCase(), n, "the panel carries scorecard vocabulary");
  });
  lacks(YF_CODE, "Math.round(", "the panel computes a number");
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ your-file: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error("   · " + f));
  process.exit(1);
}
console.log(`\n✓ your-file: ${passed} assertions passed — eight rows and no ninth, saved per uid, consumed by the alignment path, forum untouched\n`);
