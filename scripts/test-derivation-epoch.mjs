// ═══════════════════════════════════════════════════════════════════════════
//  THE DERIVATION EPOCH — one counter, every derived read
// ═══════════════════════════════════════════════════════════════════════════
// Nothing in this app is stored; everything on a profile is derived on read. That
// is the right design and it has one cost: the same derivation is asked for by
// every surface that paints, and a presidential profile paints a lot of surfaces.
// Before this, opening one profile called the position map 1,295 times, rebuilt
// the executive record for every issue on every surface, and re-ranked the whole
// row model five times over — all to produce byte-identical output.
//
// So each derived read is memoized against a shared counter, and the counter is
// bumped at the only places the data underneath can actually change: a full profile
// document merging in from Firestore, a member's roll-call record landing, and a
// lazy detail bundle merging into the roster. A missed bump costs a stale read; a
// spurious bump costs one recomputation. This file holds both ends of that trade to
// the wall:
//
//   · the cache is REAL — a second read inside one epoch is the same object, not
//     an equal one, because an equal one means the work was done again;
//   · the cache is HONEST — what it hands back is exactly what a cold derivation
//     produces, so no surface can be showing a figure the data no longer supports;
//   · the boundaries are WIRED — every event that changes the data bumps it.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");

const mkEl = () => {
  const cls = new Set();
  const el = {
    style: {}, textContent: "", innerHTML: "", hidden: false, className: "", id: "",
    parentNode: null,
    classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), toggle: () => {}, contains: (c) => cls.has(c) },
    _attrs: {},
    setAttribute(k, v) { el._attrs[k] = v; }, getAttribute: (k) => (k in el._attrs ? el._attrs[k] : null),
    focus() {}, scrollIntoView() {}, addEventListener() {}, removeEventListener() {}, remove() {},
    appendChild(c) { if (c) c.parentNode = el; return c; },
    querySelector: () => null, querySelectorAll: () => [], contains: () => true,
  };
  return el;
};
const ctx = {
  console, JSON, Math, Date, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
  Promise, String, Array, Object, RegExp, parseInt, parseFloat, isNaN,
  encodeURIComponent, decodeURIComponent,
  requestAnimationFrame: (f) => setTimeout(f, 0), fetch: () => new Promise(() => {}),
  location: { href: "/", search: "", hash: "" }, history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  document: {
    readyState: "complete", head: mkEl(), body: mkEl(), documentElement: mkEl(),
    createElement: mkEl, createTextNode: mkEl,
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {},
  },
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; ctx.addEventListener = () => {};
ctx.window._getPhotoUrl = () => "";
ctx.window.PDXIssueColors = {
  isCore: () => false, getIssueColor: () => ({ mapped: false, color: "#9fb4d4" }), styleFor: () => "",
};

// ── Two figures, one lane each ──────────────────────────────────────────────
// A member with a roll-call record and a president with an executive one, because
// the two lanes memoize in different files and a cache that is only exercised on
// one of them proves nothing about the other.
const MEMBER = "rep_epoch", PREZ = "trump", ISSUE = "lower_taxes";
ctx.ISSUE_MAP = {
  lower_taxes: { label: "Lower Taxes" },
  healthcare: { label: "Health Care" },
};
const stances = [
  { issueKey: ISSUE, issueStance: "support" },
  { issueKey: "healthcare", issueStance: "support" },
];
ctx.ISSUE_STANCE_DATA = { [MEMBER]: stances, [PREZ]: stances };
ctx.PROFILES = {
  [MEMBER]: { name: "Marta Solano", office: "U.S. Representative", district: "ID-02", state: "Idaho", party: "R" },
  [PREZ]: { name: "The President", office: "President of the United States", party: "R" },
};
ctx.CMP_DATA = { [MEMBER]: {}, [PREZ]: {} };

const sandbox = vm.createContext(ctx);
for (const file of ["stance-helpers.js", "voting-record.js", "exec-record.js", "pdx-learn.js",
                    "consistency.js", "word-action.js"]) {
  vm.runInContext(read(file), sandbox, { filename: file });
}

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);

const C = ctx.window.PDXConsistency;
const WA = ctx.window.PDXWordAction;
const VR = ctx.window.PDXVotingRecord;
const XR = ctx.window.PDXExecRecord;

// ── Seeds ───────────────────────────────────────────────────────────────────
const SRC_C = { url: "https://www.congress.gov/roll-call-vote/11", label: "Congress.gov" };
VR.noteMember(MEMBER, [
  {
    kind: "vote", rollcallId: 11, measureId: 101, number: "H.R. 1", date: "2025-07-03",
    action: "On Passage", position: "yea", isProcedural: false,
    title: "One Big Beautiful Bill Act", source: SRC_C,
    issues: [{ issueKey: ISSUE, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
  },
  {
    kind: "vote", rollcallId: 9, measureId: 109, number: "H.R. 9", date: "2025-03-11",
    action: "On Passage", position: "nay", isProcedural: false,
    title: "Taxpayer Relief Act", source: SRC_C,
    issues: [{ issueKey: ISSUE, weight: 90, isPrimary: true, supportMeaning: "yea_supports" }],
  },
]);
const SRC_X = "https://www.federalregister.gov/documents/2025/1";
const inForce = [{ status: "in_force", effectiveAt: "2025-02-01", sourceUrl: SRC_X, sourceLabel: "Federal Register" }];
const EO = (id, dir, plain) => ({
  actionClass: "executive_order", term: "47", documentId: id,
  title: "Order " + id, actedAt: "2025-01-30",
  sourceUrl: SRC_X, sourceLabel: "Federal Register", status: inForce,
  issues: [{ issueKey: ISSUE, direction: dir, weight: 100, isPrimary: true, plain }],
});
ctx.EXEC_ACTIONS = { [PREZ]: [EO("EO 14001", "advances", "The order lowered federal withholding rates.")] };

// ═════════════════════════════════════════════════════════════════════════════
// 1 · The counter itself
// ═════════════════════════════════════════════════════════════════════════════
ok(typeof ctx.window.PDXDataEpoch === "function",
  "epoch: PDXDataEpoch() is not published, so every cache below is keyed on nothing shared");
ok(typeof ctx.window.PDXDataChanged === "function",
  "epoch: PDXDataChanged() is not published, so nothing can announce that the data moved");
const e0 = ctx.window.PDXDataEpoch();
ok(typeof e0 === "number" && e0 > 0, "epoch: the counter does not start at a real value");
ctx.window.PDXDataChanged();
ok(ctx.window.PDXDataEpoch() === e0 + 1, "epoch: announcing a change does not advance the counter");
eq(ctx.window.PDXDataEpoch(), ctx.window.PDXDataEpoch(),
  "epoch: reading the counter advances it, so nothing can ever be cached against it");

// ═════════════════════════════════════════════════════════════════════════════
// 2 · The cache is real — same epoch, same object
// ═════════════════════════════════════════════════════════════════════════════
// Identity, not equality. Two equal arrays mean the whole row model was rebuilt to
// produce the same answer, which is exactly the cost this removed. The assertion
// is deliberately mechanical: it fails the moment a memo is dropped, and it cannot
// be satisfied by a derivation that is merely fast today.
const rows1 = C.issueRows(MEMBER);
const rows2 = C.issueRows(MEMBER);
ok(Array.isArray(rows1) && rows1.length > 0, "cache: this fixture produces no rows, so the reads below are vacuous");
ok(rows1 === rows2, "cache: the row model is rebuilt on every read — one profile paint asks for it from five\n" +
  "    surfaces, and each rebuild is the full two-lane derivation over every issue");
ok(WA.read(MEMBER) && C.issueRows(MEMBER) === rows1,
  "cache: a render in between drops the row model");
// The president's lane too.
const prows1 = C.issueRows(PREZ), prows2 = C.issueRows(PREZ);
ok(prows1 === prows2, "cache: the executive row model is rebuilt on every read");
const xr1 = XR.actionsFor(PREZ), xr2 = XR.actionsFor(PREZ);
ok(xr1 === xr2, "cache: the executive action list is rebuilt on every read — it is filtered, sourced-checked\n" +
  "    and sorted from scratch each time, once per issue per surface");

// Different politicians are different answers. A cache keyed too loosely is worse
// than no cache: it reports one person's record under another's name.
ok(C.issueRows(MEMBER) !== C.issueRows(PREZ), "cache: two politicians share one cached row model");
ok(JSON.stringify(C.issueRows(MEMBER)) !== JSON.stringify(C.issueRows(PREZ)),
  "cache: two politicians resolve to the same row model, so one of them is being shown the other's record");

// An explicit key list is NOT cached, and that is deliberate: those callers are
// asking for one named slice in one named order, not for "this profile's index".
const slice1 = C.issueRows(MEMBER, [ISSUE]);
const slice2 = C.issueRows(MEMBER, [ISSUE]);
ok(slice1 !== slice2, "cache: an explicitly-keyed slice is served from the whole-profile cache");
eq(slice1.length, 1, "cache: an explicitly-keyed slice no longer returns exactly the keys it was given");

// ═════════════════════════════════════════════════════════════════════════════
// 3 · The cache is honest — a cold rebuild says the same thing
// ═════════════════════════════════════════════════════════════════════════════
// The whole risk of memoizing a derived read is that the cached answer outlives
// the data. So: take the rendered surfaces, force every cache to drop, render
// again, and require the two to be identical. The only permitted difference is
// the per-render uid the index has always stamped on its own elements.
const norm = (s) => String(s || "").replace(/[a-z_]+-\d+/g, "UID");
const before = {
  read: JSON.stringify(WA.read(MEMBER)),
  headline: norm(WA.headlineHtml(MEMBER, ctx.PROFILES[MEMBER])),
  section: norm(WA.sectionHtml(MEMBER, ctx.PROFILES[MEMBER])),
  chip: WA.searchBadgeHTML(MEMBER),
  prez: norm(WA.headlineHtml(PREZ, ctx.PROFILES[PREZ])),
  prezRead: JSON.stringify(WA.read(PREZ)),
};
ctx.window.PDXDataChanged();
const rowsAfter = C.issueRows(MEMBER);
ok(rowsAfter !== rows1, "invalidation: the row model survived a declared data change — the counter is being\n" +
  "    read but not respected, which is a stale profile that never repaints");
eq(JSON.stringify(rowsAfter), JSON.stringify(rows1),
  "honesty: a cold rebuild of the row model disagrees with what was being served from cache");
eq(JSON.stringify(WA.read(MEMBER)), before.read, "honesty: the integrity read changes when the caches are dropped");
eq(norm(WA.headlineHtml(MEMBER, ctx.PROFILES[MEMBER])), before.headline,
  "honesty: the profile headline changes when the caches are dropped");
eq(norm(WA.sectionHtml(MEMBER, ctx.PROFILES[MEMBER])), before.section,
  "honesty: the word-vs-action section changes when the caches are dropped");
eq(WA.searchBadgeHTML(MEMBER), before.chip, "honesty: the search chip changes when the caches are dropped");
eq(norm(WA.headlineHtml(PREZ, ctx.PROFILES[PREZ])), before.prez,
  "honesty: the presidential headline changes when the caches are dropped");
eq(JSON.stringify(WA.read(PREZ)), before.prezRead,
  "honesty: the presidential integrity read changes when the caches are dropped");

// ═════════════════════════════════════════════════════════════════════════════
// 4 · The boundaries are wired
// ═════════════════════════════════════════════════════════════════════════════
// A roll-call record landing is one of the two moments the data under a profile
// actually changes. It is also the one that happens WHILE the reader is looking at
// the profile — the warm repaint — so a missed bump here is a reader watching a
// section redraw with the pre-record answer still in it.
const eBefore = ctx.window.PDXDataEpoch();
VR.noteMember(MEMBER, [{
  kind: "vote", rollcallId: 12, measureId: 120, number: "H.R. 12", date: "2025-08-01",
  action: "On Passage", position: "yea", isProcedural: false,
  title: "A Later Act", source: SRC_C,
  issues: [{ issueKey: ISSUE, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
}]);
ok(ctx.window.PDXDataEpoch() > eBefore,
  "boundary: a member's roll-call record landing does not announce a data change, so every surface\n" +
  "    that already derived a read keeps showing the answer from before the votes arrived");
ok(C.issueRows(MEMBER) !== rowsAfter, "boundary: the row model was not rebuilt after the record landed");

const eClear = ctx.window.PDXDataEpoch();
VR.clearCache();
ok(ctx.window.PDXDataEpoch() > eClear,
  "boundary: dropping the vote records does not announce a data change, so reads built on those\n" +
  "    records outlive them");

// The firebase merge is the other boundary. It is not loadable here (it needs the
// SDK), so the wiring is checked where it lives: the profile-merge path has to
// announce the change, next to the other two caches it already busts.
const boot = read("firebase-boot.js");
ok(/_pdxEnsureFullProfile[\s\S]{0,4000}PDXDataChanged/.test(boot),
  "boundary: a full profile document merging in from Firestore does not announce a data change, so a\n" +
  "    profile opened before its own document arrives keeps the bundled answer forever");

// The third boundary: a lazy bundle landing. Most of the roster's detail — stances,
// spotlights, executive actions — is not in the initial payload, so a read taken
// before the bundle for a politician merges is computed from a strictly smaller set
// of inputs than the same read taken after. Nothing about that read is wrong at the
// time; it simply stops being the answer the app would now give. Without a bump the
// two coexist, and the surface that asked first keeps its figure — which is how a
// homepage card and the profile it links to end up publishing different percentages
// for the same politician.
const lazy = read("pdx-lazy-data.js");
ok(/s\.onload = function[\s\S]{0,1200}PDXDataChanged/.test(lazy),
  "boundary: a lazy bundle merging into the roster does not announce a data change, so every figure\n" +
  "    derived before it landed survives it — including ones already painted on screen");

// ═════════════════════════════════════════════════════════════════════════════
// 5 · The second signal — data replaced without an announcement
// ═════════════════════════════════════════════════════════════════════════════
// The epoch covers every change that comes through the app's own paths. It cannot
// cover a data table being swapped out from underneath the module, which is what a
// harness does — and a cache that answers from a table that no longer exists is
// reporting a record nobody can see. So the executive caches carry a second signal:
// the identity of the raw list they were built from.
const beforeSwap = XR.actionsFor(PREZ);
ok(beforeSwap.kept.length === 1, "swap: this fixture's executive record is not the size the assertions assume");
ctx.EXEC_ACTIONS = { [PREZ]: [EO("EO 14001", "advances", "Kept."), EO("EO 14002", "opposes", "Added.")] };
const afterSwap = XR.actionsFor(PREZ);
eq(afterSwap.kept.length, 2,
  "swap: the executive action list was served from a cache built on a table that has since been\n" +
  "    replaced — no epoch bump accompanies a wholesale swap, so identity is the only signal");
ok(C.execActions.forIssue(PREZ, ISSUE).touched >= 2,
  "swap: the per-issue executive records were served from a cache built on the replaced table");

// ═════════════════════════════════════════════════════════════════════════════
// 6 · The third signal — the same question asked at two different scopes
// ═════════════════════════════════════════════════════════════════════════════
// The executive lane can be read over a whole career or over the current term
// only, and BOTH are on a serving president's profile at once: scopedRead() paints
// the current-term figure directly beneath the all-time one, as a comparison.
//
// The scope is a SETTING inside consistency.js, read at the bottom of the chain,
// not an argument threaded down it. So "this politician, this epoch" does not name
// one answer, and a cache keyed on that alone hands the all-time row model to the
// current-term read — which publishes one number under the other one's heading and
// then says the two are the same.
//
// The assertion is order-independence: read all-time, then current-term, then both
// again, and each scope must give its own answer every time regardless of which
// one warmed the cache first.
ctx.EXEC_ACTIONS = {
  [PREZ]: [
    EO("EO 14001", "advances", "The order lowered federal withholding rates."),
    // A previous term, pulling the other way. Inside the current term this action
    // does not exist; over all time it is half the record. If the two scopes ever
    // agree here, one of them is answering with the other's rows.
    Object.assign(EO("EO 13001", "opposes", "The earlier order raised the same rates."), { term: "45" }),
  ],
};

const atScope = (scope, fn) => C.execActions.withScope(scope, fn);
const rowsAt = (scope) => JSON.stringify(atScope(scope, () => C.issueRows(PREZ)));

const all1 = rowsAt("all_time");
const cur1 = rowsAt("current_term");
const all2 = rowsAt("all_time");
const cur2 = rowsAt("current_term");
ok(all1 !== cur1,
  "scope: the all-time and current-term row models are identical on a fixture built to make them\n" +
  "    differ — the current-term read was served the all-time rows");
eq(all2, all1,
  "scope: the all-time row model changed after a current-term read ran between the two, so the two\n" +
  "    scopes are overwriting each other in one cache slot");
eq(cur2, cur1,
  "scope: the current-term row model is not stable across repeat reads");

// Same property one level up, in word-action.js — the ranked row model and the
// bucketed issue index are memoized there too, from the rows above, and the search
// chip is the shortest published statement of what that index says.
const badgeAt = (scope) => atScope(scope, () => WA.searchBadgeHTML(PREZ));
const bAll = badgeAt("all_time"), bCur = badgeAt("current_term");
ok(bAll !== bCur,
  "scope: the issue index reads the same at both scopes on a record where the terms disagree — the\n" +
  "    ranked rows in word-action.js are cached blind to the scope the engine is reading at");
eq(badgeAt("all_time"), bAll, "scope: the all-time issue index moved once a current-term read had run");
eq(badgeAt("current_term"), bCur, "scope: the current-term issue index is not stable across repeat reads");

// And the per-issue executive pool, which is the memo the two reads above share.
const tAll = atScope("all_time", () => C.execActions.forIssue(PREZ, ISSUE).touched);
const tCur = atScope("current_term", () => C.execActions.forIssue(PREZ, ISSUE).touched);
ok(tAll > tCur,
  "scope: the current term touches as many executive actions as all time does, on a record whose\n" +
  "    earlier term is not in the current one — the per-issue pool is cached blind to the scope");
eq(atScope("all_time", () => C.execActions.forIssue(PREZ, ISSUE).touched), tAll,
  "scope: the all-time executive pool was displaced by the current-term one");

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ derivation epoch: ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}\n`));
  process.exit(1);
}
console.log(`✓ derivation epoch: all ${passed} assertions passed — one counter, three boundaries, no stale reads`);
