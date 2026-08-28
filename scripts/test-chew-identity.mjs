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

// ── Report ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ chew identity: ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f) => console.error(`   • ${f}`));
  process.exit(1);
}
console.log(`✓ chew identity: one Scott Chew — ${CANON} is the file, ${RETIRED_KEY} is an address that reaches it — ${passed} assertions passed`);
