#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-chew-identity.mjs — one Scott Chew, one file, one address
// ─────────────────────────────────────────────────────────────────────────────
// THE LIVE DEFECT THIS PINS
//
// Utah House District 68 had two current person files in production:
//
//   /p/chew_h68    the roster record — in office since January 2015, a formal
//                  file deep enough to characterise (42 issues, 90 acts on it)
//   /p/scott_chew  a second file with a different photo, about seven topics, a
//                  100% figure on its face, and a record still loading
//
// One officeholder, two addresses, two different-looking answers about the same
// votes — and search, the directory and every link minted off either page carried
// the split forward.
//
// It was not a data-entry accident. The repo ALREADY asserted these are one
// person: PDX_PROFILE_ALIAS (profile-evidence.js) has mapped `scott_chew` →
// `chew_h68` the whole time, which is how /p/chew_h68 lights up the stance cards
// filed under the name slug. What defeated the assertion was ORDER. Both
// window.PDXProfilePid() and PDXPerson.resolve() asked "does this id have a
// record?" BEFORE they asked "has this id been retired?", so the moment a stray
// Firestore PROFILES document appeared under the retired key, the bridge was
// never consulted and the duplicate opened as its own file.
//
// So the fix is one rule stated in three places, and this harness holds it:
//
//   1. ONE HUMAN, PROVED FROM THE REPO. cmp-data.js holds exactly one Scott Chew,
//      the district and the term start match the file, and `scott_chew` is not a
//      roster id at all.
//   2. THE BRIDGE IS DECLARED, AND THE VOTE ROWS ARE NOT MERGED. chew_h68 is
//      documented as canonical; nothing was added to the voting-record retirement
//      table, because no roll-call row was ever filed under `scott_chew` and this
//      pass verified no rows to merge.
//   3. THE BRIDGE OUTRANKS A STRAY DOCUMENT. PDXProfilePid resolves the retired
//      key even when that key has a live PROFILES doc — and still never blanks
//      out a profile whose bridge target is missing.
//   4. BOTH SPELLINGS OPEN ONE FILE. PDXPerson.resolve()/open() land on chew_h68
//      from `scott_chew`, from "Scott Chew", and from the raw roster id, and the
//      address stamped is the canonical one.
//   5. A DISPLAY NAME IS NOT AMBIGUOUS JUST BECAUSE IT IS SHARED. bySlug
//      canonicalises candidates before it decides two records answer to one name.
//   6. THE PUBLIC ROSTER VIEW SHOWS ONE ROW. _cleanProfiles files the record
//      under the canonical id whether or not the canonical id has a document of
//      its own, so the directory and its count cannot advertise both.
//   7. NOTHING ELSE ADVERTISES THE RETIRED ADDRESS. The formal index, the share
//      index and the sitemap's own source name chew_h68 and only chew_h68.
//
// Rules 1–7 all pin the RESOLVER, and every one of them was green while the
// duplicate was still on screen — because the surface a reader meets first does
// not resolve anything, it LISTS. A list asks the inverse question ("I am about
// to print a row per id; which of these are the same person?"), and nobody had
// answered it. So three more rules pin the LISTS, by booting the shipped modules
// and reading what they actually render:
//
//   8. THE SEARCH INDEX LISTS ONE SCOTT CHEW. PDXEye.render("chew") prints the
//      canonical row once and the retired address nowhere — and a phrase that
//      only ever appeared in the duplicate document still reaches that one row,
//      so a duplicate-row defect was not traded for a can't-find-them defect.
//      Two people who genuinely share a name are still two results.
//   9. THE ROSTER STAYS CLOSED TO A RETIRED ADDRESS. Warming a retired id no
//      longer mints a CMP_DATA record for it, which is what keeps the browse
//      grid, the compare add-column, the state filter and My Team at one row
//      without editing any of them. The document itself is not discarded, and a
//      genuinely new id still joins the roster.
//  10. ONE MEMBER, ONE ROW — ACROSS THE WHOLE TABLE. The Evidence Locker's own
//      roster lists each person once, and every alias key in the table is swept
//      for the same properties, because the rule is the table and not one name.
//
//   node scripts/test-chew-identity.mjs
//
// No database, no network: every source of truth here is a committed file.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ chew identity: STALE HARNESS — ${m}`); process.exit(2); };

const CANON = "chew_h68";
const RETIRED_KEY = "scott_chew";

const PE_SRC = R("profile-evidence.js");
const PF_SRC = R("person-file.js");
const DH_SRC = R("data-hygiene.js");

// ── The roster, as the app sees it ───────────────────────────────────────────
function loadGlobal(file, name) {
  const ctx = { console, JSON, Math, Date };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  vm.runInContext(R(file), vm.createContext(ctx), { filename: file });
  return ctx[name];
}
const ROSTER = loadGlobal("cmp-data.js", "CMP_DATA");
must(ROSTER && Object.keys(ROSTER).length > 100, "cmp-data.js did not expose CMP_DATA");

// Lift an object literal / function expression out of a browser IIFE by
// brace-matching its declaration, so the harness runs the SHIPPED code rather
// than a paraphrase of it.
function lift(src, decl, open, label) {
  const start = src.indexOf(decl);
  must(start !== -1, `${label}: declaration is gone (${decl})`);
  const from = src.indexOf(open, start);
  must(from !== -1, `${label}: no ${open} after its declaration`);
  const closer = open === "{" ? "}" : ")";
  let depth = 0, end = -1;
  for (let i = from; i < src.length; i++) {
    if (src[i] === open) depth++;
    else if (src[i] === closer) { depth--; if (depth === 0) { end = i; break; } }
  }
  must(end !== -1, `${label}: unbalanced ${open}`);
  return src.slice(from, end + 1);
}

const slugOf = (s) => String(s == null ? "" : s).toLowerCase()
  .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

// ─────────────────────────────────────────────────────────────────────────────
section("1 · the repo holds exactly one Scott Chew");
// ─────────────────────────────────────────────────────────────────────────────
{
  const chews = Object.keys(ROSTER).filter((id) => slugOf(ROSTER[id] && ROSTER[id].name) === RETIRED_KEY);
  eq(chews.length, 1, `cmp-data.js must hold exactly one record named "Scott Chew" (found ${JSON.stringify(chews)})`);
  eq(chews[0], CANON, "the one Scott Chew record is filed under the canonical id");

  const rec = ROSTER[CANON] || {};
  eq(rec.name, "Scott Chew", "the canonical record still carries the display name the address is judged against");
  has(`${rec.state || ""} ${rec.district || ""} ${rec.office || ""}`, "68",
    "the canonical record is the House District 68 seat");
  has(String(rec.termStart || ""), "2015", "the canonical record is the 2015 seat (this is not a freshman)");

  // The retired key is a NAME SLUG, not a second roster entry. If it ever became
  // one, the resolution below would be wrong rather than merely ordered wrong,
  // and this harness would be asserting a merge nobody verified.
  ok(!ROSTER[RETIRED_KEY],
    `'${RETIRED_KEY}' must not be a cmp-data.js roster id — it is the slug of ${CANON}'s display name`);
}

// ─────────────────────────────────────────────────────────────────────────────
section("2 · the bridge is declared, and no vote row was merged");
// ─────────────────────────────────────────────────────────────────────────────
const PROFILE_ALIAS = (() => {
  const body = lift(PE_SRC, "window.PDX_PROFILE_ALIAS = window.PDX_PROFILE_ALIAS ||", "{", "PDX_PROFILE_ALIAS");
  const ctx = { JSON };
  ctx.window = ctx; ctx.globalThis = ctx;
  return vm.runInContext(`(${body})`, vm.createContext(ctx), { filename: "PDX_PROFILE_ALIAS" });
})();
{
  must(Object.keys(PROFILE_ALIAS).length > 0, "PDX_PROFILE_ALIAS lifted empty");
  eq(PROFILE_ALIAS[RETIRED_KEY], CANON,
    `PDX_PROFILE_ALIAS must bridge '${RETIRED_KEY}' → '${CANON}'`);

  // Which pid is canonical is a decision, so it is written down next to the entry
  // rather than left to be re-derived by the next reader.
  const at = PE_SRC.indexOf(`${RETIRED_KEY}:`);
  must(at !== -1, "the scott_chew entry is gone from profile-evidence.js");
  const note = PE_SRC.slice(Math.max(0, at - 1200), at);
  has(note, "CANONICAL: chew_h68", "the canonical pid is documented at the entry");

  // THE LINE THIS PASS DID NOT CROSS. Merging vote rows is a claim about the
  // DATABASE — that roll calls filed under two ids are one member's record. No
  // rows were ever written under the retired key, so the voting-record retirement
  // tables stay out of it. If a future pass verifies rows to merge, it belongs in
  // all three of these files at once, and this assertion is the reminder.
  const vrAliases = JSON.parse(R("db/vr-pid-aliases.json")).aliases || {};
  ok(!(RETIRED_KEY in vrAliases),
    `db/vr-pid-aliases.json must not claim a voting-record merge for '${RETIRED_KEY}' — ` +
    `no roll-call rows were ever filed under it`);
  const pidTable = lift(R("stance-helpers.js"), "var PDX_PID_ALIASES = ", "{", "PDX_PID_ALIASES");
  ok(!pidTable.includes(`${RETIRED_KEY}:`),
    `PDX_PID_ALIASES must not claim a voting-record merge for '${RETIRED_KEY}'`);
}

// ─────────────────────────────────────────────────────────────────────────────
section("3 · the bridge outranks a stray document filed under the retired key");
// ─────────────────────────────────────────────────────────────────────────────
const PROFILE_PID_SRC = "function (id) " +
  lift(PE_SRC, "window.PDXProfilePid = function (id)", "{", "PDXProfilePid");
const makeProfilePid = (profiles, roster) => {
  const fnSrc = PROFILE_PID_SRC;
  const ctx = { JSON, PROFILES: profiles, CMP_DATA: roster };
  ctx.window = ctx; ctx.globalThis = ctx;
  ctx.PDX_PROFILE_ALIAS = PROFILE_ALIAS;
  ctx.ACCT_ALIAS = {};
  return vm.runInContext(`(${fnSrc})`, vm.createContext(ctx), { filename: "PDXProfilePid" });
};
{
  const chewRec = { name: "Scott Chew", office: "Utah State Representative", district: "UT District 68" };

  // (a) no duplicate anywhere — the bridge has always worked here
  eq(makeProfilePid({}, { [CANON]: chewRec })(RETIRED_KEY), CANON,
    "PDXProfilePid resolves the retired key when nothing is filed under it");

  // (b) THE DEFECT. A live PROFILES document under the retired key, exactly as
  //     production had it. The old order returned the duplicate here.
  const stray = { [RETIRED_KEY]: { name: "Scott Chew", bio: "x", score: 100 } };
  eq(makeProfilePid(stray, { [CANON]: chewRec })(RETIRED_KEY), CANON,
    "a stray PROFILES document under the retired key does not defeat the bridge");

  // (c) the canonical id, and an id nobody has ruled on, are untouched
  eq(makeProfilePid(stray, { [CANON]: chewRec })(CANON), CANON,
    "the canonical id resolves to itself");
  eq(makeProfilePid(stray, { [CANON]: chewRec })("nobody_here"), "nobody_here",
    "an id with no entry and no record passes through untouched");

  // (d) fail-safe: a bridge whose TARGET has no record may not blank out a live
  //     profile. The hop still requires the target to exist.
  eq(makeProfilePid(stray, {})(RETIRED_KEY), RETIRED_KEY,
    "with no record for the bridge target, the id it was given is still returned");
}

// ─────────────────────────────────────────────────────────────────────────────
section("4 · both spellings open one file, at the canonical address");
// ─────────────────────────────────────────────────────────────────────────────
function personFile(opts) {
  opts = opts || {};
  const calls = { openModal: [], replace: [] };
  const doc = {
    readyState: "complete", _els: {}, _listeners: {},
    addEventListener(t, f) { (doc._listeners[t] = doc._listeners[t] || []).push(f); },
    getElementById(id) {
      if (!doc._els[id]) {
        const attrs = {};
        doc._els[id] = {
          id, innerHTML: "", className: "", style: {}, attrs,
          addEventListener() {},
          setAttribute(k, v) { attrs[k] = String(v); },
          getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
          removeAttribute(k) { delete attrs[k]; },
          classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
          querySelector() { return null; },
        };
      }
      return doc._els[id];
    },
    querySelector() { return null; },
  };
  const win = {
    document: doc,
    location: { origin: "https://politidex.fyi", pathname: opts.pathname || "/", search: "", hash: "", href: "https://politidex.fyi/" },
    history: { replaceState(a, b, url) { calls.replace.push(url); }, pushState() {} },
    _listeners: {},
    addEventListener(t, f) { (win._listeners[t] = win._listeners[t] || []).push(f); },
    setTimeout() { return 0; }, clearTimeout() {},
    URLSearchParams, encodeURIComponent, console,
    openModal(id) { calls.openModal.push(id); win._pdxCurrentProfileId = id; },
    CMP_DATA: opts.roster || {},
    PROFILES: opts.profiles || {},
    _pdxRosterState: "done",
    PDXPublicationFloor: { clears: () => true },
    PDX_PROFILE_ALIAS: PROFILE_ALIAS,
    ACCT_ALIAS: {},
  };
  win.window = win; win.globalThis = win;
  const ctx = vm.createContext(win);
  // The real resolver, wired the way the document wires it: profile-evidence.js
  // owns PDXProfilePid, person-file.js consults it through window.
  win.PDXProfilePid = makeProfilePid(win.PROFILES, win.CMP_DATA);
  new vm.Script(PF_SRC, { filename: "person-file.js" }).runInContext(ctx);
  return { win, calls, P: win.PDXPerson };
}
{
  const chewRec = { name: "Scott Chew", office: "Utah State Representative", district: "UT District 68" };
  const stray = { [RETIRED_KEY]: { name: "Scott Chew", bio: "x", score: 100 } };

  const both = personFile({ roster: { [CANON]: chewRec }, profiles: stray });
  must(both.P && typeof both.P.resolve === "function", "PDXPerson.resolve did not register");

  eq(both.P.resolve(RETIRED_KEY), CANON,
    "PDXPerson.resolve sends the retired slug to the canonical file even with a duplicate document present");
  eq(both.P.resolve(CANON), CANON, "the canonical id resolves to itself");
  eq(both.P.resolve("Scott Chew"), CANON,
    "the display name resolves to the canonical file (the second spelling this pass pins)");
  eq(both.P.resolve("SCOTT_CHEW"), CANON, "a shouted address still resolves to one file");

  both.P.open(RETIRED_KEY);
  eq(both.calls.openModal[0], CANON, "opening the retired address renders the canonical file");
  ok(String(both.calls.replace[0] || "").endsWith(`/p/${CANON}`),
    `the address is canonicalised on arrival (got ${JSON.stringify(both.calls.replace[0])})`);

  // Nothing about an ordinary arrival changed: an id with a record of its own and
  // no table entry still opens itself, and an unknown id still resolves to ''.
  const plain = personFile({ roster: { lee: { name: "Mike Lee" }, [CANON]: chewRec } });
  eq(plain.P.resolve("lee"), "lee", "an ordinary roster id is untouched by the reordering");
  eq(plain.P.resolve("mike_lee"), "lee", "the display-name slug path still works (mike_lee → lee)");
  eq(plain.P.resolve("nobody_here"), "", "an unknown address still resolves to nothing");
}

// ─────────────────────────────────────────────────────────────────────────────
section("5 · a shared display name is not an ambiguous one");
// ─────────────────────────────────────────────────────────────────────────────
{
  // bySlug refuses to pick when two RECORDS answer to one name — correctly, since
  // a name that two people share is not an address. But the duplicate and the
  // roster record share a name BY DEFINITION, so without canonicalising the
  // candidates first, fixing resolve() would have turned "Scott Chew" from the
  // wrong file into no file at all.
  has(PF_SRC, "var cid = canonId(id);", "bySlug no longer canonicalises its candidates");
  const twoPeople = personFile({
    roster: { [CANON]: { name: "Scott Chew" }, someone_else: { name: "John Smith" } },
    profiles: { [RETIRED_KEY]: { name: "Scott Chew", bio: "x" }, other_smith: { name: "John Smith", bio: "y" } },
  });
  eq(twoPeople.P.resolve("Scott Chew"), CANON,
    "two ids that canonicalise to one id are one match");
  eq(twoPeople.P.resolve("John Smith"), "",
    "two ids that are genuinely two records are still ambiguous, and still pick neither");
}

// ─────────────────────────────────────────────────────────────────────────────
section("6 · the public roster view shows one row, under the canonical id");
// ─────────────────────────────────────────────────────────────────────────────
function cleanProfiles(profiles, roster) {
  const ctx = { console, JSON, Math, Date, PROFILES: profiles };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  ctx.CMP_DATA = roster;
  ctx.PDX_PROFILE_ALIAS = PROFILE_ALIAS;
  ctx.ACCT_ALIAS = {};
  const sb = vm.createContext(ctx);
  vm.runInContext(DH_SRC, sb, { filename: "data-hygiene.js" });
  ctx.PDXProfilePid = makeProfilePid(profiles, roster);
  must(typeof ctx._cleanProfiles === "function", "data-hygiene.js did not expose _cleanProfiles");
  return ctx._cleanProfiles();
}
{
  const chewRec = { name: "Scott Chew", office: "Utah State Representative", district: "UT District 68" };
  const roster = { [CANON]: chewRec };
  const strayDoc = { name: "Scott Chew", office: "Utah State Representative", bio: "rancher", score: 100 };

  // (a) THE PRODUCTION SHAPE: the canonical record lives only in cmp-data.js, so
  //     the retired doc sits alone in its name group and used to look unique.
  const alone = cleanProfiles({ [RETIRED_KEY]: strayDoc, jane: { name: "Jane Doe", bio: "b" } }, roster);
  ok(!alone.profiles[RETIRED_KEY], "the retired id is not a row in the public roster view");
  ok(!!alone.profiles[CANON], "the record is kept, filed under the canonical id");
  eq(alone.profiles[CANON].name, "Scott Chew", "and it is the same record, not an empty shell");
  eq(alone.kept, 2, "one Scott Chew row plus one unrelated row");
  ok((alone.retiredIds || []).indexOf(RETIRED_KEY) !== -1,
    "the re-filing is reported, not silent");

  // (b) both documents present: the canonical id wins its name group outright,
  //     however rich the duplicate is.
  const both = cleanProfiles({
    [RETIRED_KEY]: strayDoc,
    [CANON]: { name: "Scott Chew", bio: "thin but canonical" },
  }, roster);
  eq(Object.keys(both.profiles).length, 1, "one person, one row");
  ok(!!both.profiles[CANON], "the canonical id is the row that survives");
  eq(both.profiles[CANON].bio, "thin but canonical",
    "a retired key does not win its group on richness");

  // (c) unrelated duplicates still collapse the way they always did — richest wins
  const dup = cleanProfiles({
    a_smith: { name: "John Smith", bio: "long bio", issues: ["x"] },
    b_smith: { name: "John Smith", bio: "short" },
  }, {});
  eq(Object.keys(dup.profiles).length, 1, "the ordinary duplicate rule is unchanged");
  ok(!!dup.profiles.a_smith, "and it still keeps the richest record");
}

// ─────────────────────────────────────────────────────────────────────────────
section("7 · nothing else advertises the retired address");
// ─────────────────────────────────────────────────────────────────────────────
{
  // The formal file — the reason chew_h68 is the canonical pid rather than a
  // coin flip. The acts are counted under this id.
  const FX = R("formal-index.js");
  const row = FX.match(/'chew_h68':\s*\[(\d+),\s*(\d+)\]/);
  must(row, "formal-index.js no longer carries a COUNTS row for chew_h68");
  ok(Number(row[1]) > 0, "the canonical pid is the one with the formal acts on file");
  ok(!FX.includes(RETIRED_KEY), "the formal index does not carry a second entry for the retired key");

  // The share/preview index and the sitemap are both generated from cmp-data.js
  // through the publication floor, so the retired key cannot appear in either —
  // but it is asserted rather than assumed, because that is the surface a reader
  // would find in a search result.
  const share = JSON.parse(R("db/share-index.json"));
  ok(!!share.people[CANON], "the share index lists the canonical person file");
  ok(!share.people[RETIRED_KEY], "the share index does not list the retired address");
  const genSitemap = R("scripts/gen-sitemap.mjs");
  has(genSitemap, "cmp-data.js", "the sitemap is still generated from the roster the floor reads");
}

// ─────────────────────────────────────────────────────────────────────────────
section("8 · the search index lists one Scott Chew");
// ─────────────────────────────────────────────────────────────────────────────
// Sections 3–6 pinned the RESOLVER. They were satisfied while the reported
// defect was still on screen, because the surface a reader meets first does not
// resolve anything — it LISTS. The All-Seeing Eye built its haystack from the
// union of every CMP_DATA and PROFILES key, so `scott_chew` was one more
// officeholder in the bag, and a query for "chew" printed two current Utah House
// District 68 files: the 90-act formal record and a photo stub whose own address
// already redirected to it.
//
// So this section boots the SHIPPED module against the production shape and reads
// the markup it renders. Three things have to hold at once, and the third is why
// this is not simply a filter:
//
//   ONE ROW.  The retired address is not a second person, so it is not a second
//             result — and the row that survives is the canonical one.
//   NO LOSS.  The duplicate document holds a bio and topics of its own. A term
//             that only ever appeared THERE must still reach the person it was
//             about, or a duplicate-row defect has been traded for a
//             can't-find-them defect.
//   NO REACH. Two people who genuinely share a name are still two results. The
//             collapse is driven by the alias table alone — never by a name
//             match, never by a district match, never by a guess.
function eyePanel(opts) {
  opts = opts || {};
  const els = {};
  const mkEl = () => {
    const cls = new Set();
    const el = {
      style: { setProperty() {}, removeProperty() {} },
      textContent: "", innerHTML: "", value: "", className: "", id: "", hidden: false,
      classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), toggle() {}, contains: (c) => cls.has(c) },
      _attrs: {},
      setAttribute(k, v) { el._attrs[k] = String(v); },
      getAttribute(k) { return k in el._attrs ? el._attrs[k] : null; },
      removeAttribute(k) { delete el._attrs[k]; },
      focus() {}, blur() {}, scrollIntoView() {}, addEventListener() {}, removeEventListener() {},
      remove() {}, appendChild(c) { return c; }, insertBefore(c) { return c; },
      querySelector: () => null, querySelectorAll: () => [], contains: () => true, closest: () => null,
      getBoundingClientRect: () => ({ top: 0, left: 0, width: 300, height: 40, bottom: 40, right: 300 }),
    };
    return el;
  };
  const getEl = (id) => { if (!els[id]) { els[id] = mkEl(); els[id].id = id; } return els[id]; };
  const ctx = {
    console: { log() {}, warn() {}, error() {} }, JSON, Math, Date,
    Promise, Set, Map, Object, Array, String, Number, Boolean, RegExp, Error, Symbol,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
    requestAnimationFrame: () => 0, fetch: () => new Promise(() => {}),
    location: { href: "/", search: "", hash: "", pathname: "/", origin: "https://politidex.fyi" },
    history: { replaceState() {}, pushState() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: { userAgent: "node" },
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } },
    document: {
      readyState: "complete", head: mkEl(), body: mkEl(), documentElement: mkEl(),
      createElement: mkEl, createTextNode: mkEl, getElementById: getEl,
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    },
    CMP_DATA: opts.roster || {},
    PROFILES: opts.profiles || {},
    ACCT_SPOTLIGHT: {}, ACCT_ALIAS: {},
    ISSUE_STANCE_DATA: opts.stances || {},
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  ctx.addEventListener = () => {}; ctx.removeEventListener = () => {};
  ctx._getPhotoUrl = () => "";
  const sb = vm.createContext(ctx);
  // The document wires these in this order: profile-evidence.js owns the resolver
  // and the two list helpers; the eye reads them off window at query time.
  vm.runInContext(PE_SRC, sb, { filename: "profile-evidence.js" });
  vm.runInContext(R("all-seeing-eye.js"), sb, { filename: "all-seeing-eye.js" });
  return {
    ctx,
    search(q) {
      ctx.PDXEye.render(q);
      return getEl("pdx-eye-panel").innerHTML || "";
    },
  };
}
// Every id the rendered panel points at, in order, and the same restricted to
// one result category ("pol" = the Politicians block, "stance" = receipts).
const panelIds = (html) => [...String(html).matchAll(/data-kind="pol" data-id="([^"]*)"/g)].map((m) => m[1]);
function catSlice(html, cat) {
  const at = String(html).indexOf(`data-cat="${cat}"`);
  if (at === -1) return "";
  const next = String(html).indexOf('data-cat="', at + 10);
  return String(html).slice(at, next === -1 ? undefined : next);
}
{
  must(typeof R("all-seeing-eye.js") === "string", "all-seeing-eye.js is gone");
  // THE PRODUCTION SHAPE, exactly as reported: chew_h68 is a roster record with
  // no Firestore document, and `scott_chew` is a Firestore document with no
  // roster record. Each source knows about exactly one of them.
  const STUB = {
    name: "Scott Chew", office: "Utah State Representative", district: "District 68",
    state: "Utah", party: "R", score: 100, __lite: true,
    bio: "A rancher who runs cattle in the Uinta Basin.",
  };
  const eye = eyePanel({ roster: ROSTER, profiles: { [RETIRED_KEY]: STUB } });
  must(eye.ctx.PDXEye && typeof eye.ctx.PDXEye.render === "function",
    "all-seeing-eye.js did not publish PDXEye.render — the harness can no longer read the surface");

  // (a) ONE ROW. This is the acceptance line: query "chew", get one Scott Chew.
  const html = eye.search("chew");
  const pols = panelIds(catSlice(html, "pol"));
  eq(pols.filter((id) => id === CANON).length, 1,
    `a query for "chew" lists the canonical file exactly once (got ${JSON.stringify(pols)})`);
  eq(pols.filter((id) => id === RETIRED_KEY).length, 0,
    `a query for "chew" does not list the retired address as a second officeholder (got ${JSON.stringify(pols)})`);
  ok(!html.includes(RETIRED_KEY),
    "the retired id appears nowhere in the rendered panel — not in a row, a share action or a related chip");

  // (b) NO LOSS. "Uinta Basin" exists ONLY in the duplicate document's bio. The
  //     row that survived has to carry it, or collapsing the pair quietly made a
  //     real person unfindable by their own record.
  const deep = eye.search("uinta basin");
  const deepIds = panelIds(catSlice(deep, "pol"));
  eq(deepIds.length, 1, "a term only the duplicate document carried still finds exactly one person");
  eq(deepIds[0], CANON, "and it finds them at the canonical address");

  // (c) NO REACH. Two people, one name — still two results. The eye collapses on
  //     the alias table and nothing else; it does not fuzzy-match names, offices
  //     or districts, so this is the assertion that keeps the fix honest.
  const twins = eyePanel({
    roster: {
      smith_h1: { name: "John Smith", office: "Utah State Representative", district: "District 1", state: "Utah" },
      smith_s2: { name: "John Smith", office: "Utah State Senator", district: "District 2", state: "Utah" },
    },
    profiles: {},
  });
  const twinIds = panelIds(catSlice(twins.search("john smith"), "pol"));
  eq(twinIds.length, 2,
    `two different people who share a name are still two results (got ${JSON.stringify(twinIds)})`);

  // (d) A RECEIPT IS TAGGED TO A PERSON. 18 of the 29 retired ids carry a curated
  //     stance block — that is the documented convention, the block is filed under
  //     the roster record's display-name slug. Every receipt row minted from one
  //     used to read the slug back out as a name, file itself under the retired id
  //     for My Team and Share, and aim "Jump to politician" at a redirect.
  const withReceipt = eyePanel({
    roster: ROSTER,
    profiles: { [RETIRED_KEY]: STUB },
    stances: {
      [RETIRED_KEY]: [{
        topic: "Carbon Capture & CO2 Storage", icon: "⚡", pos: "support",
        issueKey: "lands_energy", text: "Enacted carbon-capture legislation.",
        evidence: "Sponsored HB 452 (2024).",
      }],
    },
  });
  const receipts = withReceipt.search("carbon capture");
  const rIds = panelIds(catSlice(receipts, "stance"));
  ok(rIds.length > 0, "the receipt for the curated block is still reachable by its topic");
  eq(rIds.indexOf(RETIRED_KEY), -1,
    `a receipt row is tagged to the canonical pid, not the stance key (got ${JSON.stringify(rIds)})`);
  ok(rIds.indexOf(CANON) !== -1, "and the pid it is tagged to is the one the person file opens at");
  has(catSlice(receipts, "stance"), "Scott Chew",
    "the receipt row names the person from the roster record, not the slug read back as words");
}

// ─────────────────────────────────────────────────────────────────────────────
section("9 · the roster stays closed to a retired address");
// ─────────────────────────────────────────────────────────────────────────────
// The single line that fanned this defect across the whole app. `scott_chew` is
// not in cmp-data.js, so every Object.keys(CMP_DATA) surface — the browse grid,
// the compare add-column, the state filter, My Team, the ballot breakdown —
// was safe on the bundled data alone. But the Firestore lazy-loader, on finding
// no CMP_DATA entry for an id it had just fetched, CREATED one. The Evidence
// Locker warms every Utah legislator it can see in PROFILES, so the retired key
// was fetched on an ordinary visit and joined the roster itself, and from then on
// every one of those lists was faithfully rendering a second officeholder.
//
// Fixing it at the loader is what makes the rest of those surfaces need no edit
// at all: an id the app has already ruled is an ADDRESS never becomes a record.
function firebaseBoot(opts) {
  opts = opts || {};
  const roster = Object.assign({}, opts.roster || {});
  const profiles = Object.assign({}, opts.profiles || {});
  const fetched = [];
  const mkEl = () => ({
    style: { setProperty() {} }, innerHTML: "", textContent: "", className: "",
    classList: { add() {}, remove() {}, contains: () => false },
    setAttribute() {}, getAttribute: () => null, appendChild: (c) => c,
    addEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
  });
  const docFor = (id) => ({
    get() {
      fetched.push(id);
      const d = opts.docs && opts.docs[id];
      return Promise.resolve({ exists: !!d, data: () => d });
    },
    onSnapshot() {}, set: () => Promise.resolve(),
  });
  const ctx = {
    console: { log() {}, warn() {}, error() {} }, JSON, Math, Date,
    Promise, Set, Map, Object, Array, String, Number, RegExp, Error,
    setTimeout: () => 0, clearTimeout() {}, encodeURIComponent, decodeURIComponent,
    fetch: () => new Promise(() => {}),
    location: { href: "/", search: "", hash: "", pathname: "/", origin: "https://politidex.fyi" },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document: {
      readyState: "complete", body: mkEl(), head: mkEl(), createElement: mkEl,
      getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
      addEventListener() {},
    },
    CMP_DATA: roster, ACCT_ALIAS: {},
    firebase: {
      initializeApp: () => ({}),
      firestore: () => ({ collection: () => ({ doc: docFor, get: () => Promise.resolve({ size: 0, forEach() {} }), onSnapshot() {} }) }),
      auth: () => ({
        currentUser: null, onAuthStateChanged: () => () => {},
        signInAnonymously: () => Promise.reject(new Error("no auth")),
        signOut: () => Promise.resolve(),
      }),
    },
    // firebase-boot.js patches document.addEventListener and keeps the original
    // under this name; the document defines it before the script runs.
    _originalAddEventListener() {},
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  ctx.addEventListener = () => {};
  const sb = vm.createContext(ctx);
  vm.runInContext(PE_SRC, sb, { filename: "profile-evidence.js" });
  vm.runInContext(R("firebase-boot.js"), sb, { filename: "firebase-boot.js" });
  // The lightweight index is what puts a retired key in PROFILES in the first
  // place; seed it directly rather than faking a paginated REST response.
  Object.keys(profiles).forEach((id) => { ctx.PROFILES[id] = profiles[id]; });
  return { ctx, fetched };
}
{
  const chewRec = ROSTER[CANON];
  const strayDoc = { name: "Scott Chew", office: "Utah State Representative", bio: "rancher", score: 100 };
  const boot = firebaseBoot({
    roster: { [CANON]: Object.assign({}, chewRec) },
    profiles: { [RETIRED_KEY]: Object.assign({ __lite: true }, strayDoc) },
    docs: { [RETIRED_KEY]: strayDoc, newcomer: { name: "Brand New", office: "Utah State Representative" } },
  });
  must(typeof boot.ctx._pdxEnsureFullProfile === "function",
    "firebase-boot.js no longer publishes _pdxEnsureFullProfile");

  // (a) THE DEFECT. Warming the retired key used to mint a roster entry for it.
  await boot.ctx._pdxEnsureFullProfile(RETIRED_KEY);
  ok(boot.ctx.CMP_DATA[RETIRED_KEY] === undefined,
    "warming a retired address does not create a roster record for it — this is what keeps the " +
    "browse grid, the compare add-column, the state filter and My Team at one row without editing any of them");

  // (b) NOTHING WAS DELETED. The document is still there and still readable; only
  //     its promotion to "a person on the roster" was refused.
  ok(!!boot.ctx.PROFILES[RETIRED_KEY], "the Firestore document itself is untouched in PROFILES");
  eq(boot.ctx.PROFILES[RETIRED_KEY].bio, "rancher", "and it is the full document, not a shell");

  // (c) AN ID NOBODY HAS RULED ON IS STILL ADMITTED. The guard is the alias table,
  //     not "is it missing from cmp-data.js" — otherwise a genuinely new
  //     officeholder arriving from Firestore would never reach the roster.
  boot.ctx.PROFILES.newcomer = { name: "Brand New", office: "Utah State Representative", __lite: true };
  await boot.ctx._pdxEnsureFullProfile("newcomer");
  ok(!!boot.ctx.CMP_DATA.newcomer,
    "an id with no alias entry still joins the roster when its document arrives");

  // (d) AND AN EXISTING ROSTER RECORD STILL RECEIVES ITS FULL DOCUMENT. That merge
  //     is the whole purpose of this function and is not what changed.
  const boot2 = firebaseBoot({
    roster: { [CANON]: Object.assign({}, chewRec) },
    docs: { [CANON]: { bio: "the deep file's own bio" } },
  });
  await boot2.ctx._pdxEnsureFullProfile(CANON);
  eq(boot2.ctx.CMP_DATA[CANON].bio, "the deep file's own bio",
    "a live roster record still merges its full document in place");
  eq(boot2.ctx.CMP_DATA[CANON].name, "Scott Chew",
    "and the merge is additive — the roster record's own fields survive it");
}

// ─────────────────────────────────────────────────────────────────────────────
section("10 · the Locker's member roster, and the sweep across every alias");
// ─────────────────────────────────────────────────────────────────────────────
// The Locker's _roster() scan did double duty: it is the member list the section
// renders and filters by, AND the list it hands to _pdxEnsureFullProfile. So it
// both listed the stub as its own member and was the thing that warmed it into
// CMP_DATA. Section 9 closed the roster; this closes the list.
{
  const EL = R("evidence-locker.js");
  const from = EL.indexOf("    function _isUtahLeg(office) {");
  must(from !== -1, "evidence-locker.js: the roster-classification block is gone");
  const tail = EL.indexOf("      return utah.concat(rest);", from);
  must(tail !== -1, "evidence-locker.js: _roster no longer returns utah.concat(rest)");
  const BLOCK = EL.slice(from, EL.indexOf("\n    }", tail) + 6);

  const ctx = { console, JSON, Math, Date, Object, Array, String, RegExp };
  ctx.window = ctx; ctx.globalThis = ctx;
  ctx.CMP_DATA = ROSTER;
  ctx.PROFILES = { [RETIRED_KEY]: { name: "Scott Chew", office: "Utah State Representative", __lite: true } };
  ctx.ACCT_ALIAS = {};
  const sb = vm.createContext(ctx);
  vm.runInContext(PE_SRC, sb, { filename: "profile-evidence.js" });
  vm.runInContext("(function(){ " + BLOCK + "\n window.__roster = _roster; })();", sb, { filename: "el-roster" });
  must(typeof ctx.__roster === "function", "evidence-locker.js: _roster could not be lifted");

  const utah = ctx.__roster("utah");
  const chews = utah.filter((id) => id === CANON || id === RETIRED_KEY);
  eq(chews.length, 1, `the Locker lists one Scott Chew (got ${JSON.stringify(chews)})`);
  eq(chews[0], CANON, "and it is the canonical member, which is also the id it warms");
  eq(utah.length, new Set(utah).size, "no member appears twice in the Locker roster");
  utah.forEach((id) => {
    if (id === CANON) return;
    ok(!PROFILE_ALIAS[id], `the Locker roster carries no retired address (found ${JSON.stringify(id)})`);
  });

  // THE SWEEP. Chew is the reported case, not the only one: the table holds 29
  // ids, and the rule has to be the table rather than one name. Every key must
  // read as an address, resolve to a live roster record, collapse into that
  // record in a list, and never be a roster id in its own right.
  const keys = Object.keys(PROFILE_ALIAS);
  ok(keys.length >= 29, `the alias table still holds the full set (found ${keys.length})`);
  const canon = ctx.PDXCanonIds(keys.concat(Object.keys(ROSTER)));
  keys.forEach((k) => {
    ok(ctx.PDXRetiredPid(k), `PDXRetiredPid reads '${k}' as an address, not a person`);
    ok(!ROSTER[k], `'${k}' is not a cmp-data.js roster id`);
    ok(!!ROSTER[PROFILE_ALIAS[k]], `'${k}' resolves to a live roster record`);
    eq(canon.ids.indexOf(k), -1, `'${k}' does not survive PDXCanonIds as its own entry`);
    ok((canon.groups[PROFILE_ALIAS[k]] || []).indexOf(k) !== -1,
      `'${k}' is folded into ${PROFILE_ALIAS[k]}'s group, so its text is not lost`);
  });
  eq(canon.ids.length, new Set(canon.ids).size, "PDXCanonIds returns each person once");

  // Fail open, both helpers. A list that cannot place an id keeps the row: showing
  // a duplicate is cosmetic, hiding a real officeholder is not.
  ok(!ctx.PDXRetiredPid("nobody_here"), "an id nobody has ruled on is not treated as retired");
  ok(!ctx.PDXRetiredPid(""), "an empty id is not treated as retired");
  eq(ctx.PDXCanonIds(["nobody_here"]).ids[0], "nobody_here", "an unplaceable id survives a canonical list");
  eq(ctx.PDXCanonIds([]).ids.length, 0, "an empty bag yields an empty list");
  eq(ctx.PDXCanonIds(null).ids.length, 0, "a missing bag yields an empty list rather than a throw");
  const stable = ctx.PDXCanonIds([CANON, "aromero", RETIRED_KEY, "aromero"]);
  eq(stable.ids.join(","), `${CANON},aromero`,
    "first-seen order is preserved, so no caller's existing sort shifts");
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ chew identity: ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f) => console.error(`   • ${f}`));
  process.exit(1);
}
console.log(`✓ chew identity: one Scott Chew — ${CANON} is the file, ${RETIRED_KEY} is an address that reaches it — ${passed} assertions passed`);
