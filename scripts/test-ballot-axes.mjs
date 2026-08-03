#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for the two-axis elections lens (ballot-axes.js)
// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex scores elections on two INDEPENDENT ISSUE_MAP keys — election_security
// (🔐 eligibility verification, roll maintenance, chain of custody, audits, fraud
// enforcement) and voting_access (📩 registration, early voting, mail ballots, drop
// boxes, return deadlines). One measure routinely moves both at once and in opposite
// directions, so each axis is read in its OWN direction: "supports" is pro-safeguard
// under 🔐 and pro-access under 📩.
//
// That makes three things worth gating, because each fails silently:
//
//   1. Direction copy. If an axis loses its direction sentence, a split renders as
//      "supports / opposes" with nothing saying what either word means on that axis —
//      which reads as a contradiction the data does not claim.
//   2. Facet identity. election_integrity and voter_id are LEGACY keys with their own
//      lean and their own cards. If either were ever treated as a facet, cards would
//      be counted toward an axis they were not written for.
//   3. Host wiring. The lens is only useful where it is mounted. Six surfaces mount it
//      (profile, Stance Library, Alignment quick picks, Issue Comparison, the voter-ID
//      Spotlight, the glossary) and a lens nobody calls is a lens that regressed.
//
//   node scripts/test-ballot-axes.mjs
//
// Runs the module in a node:vm sandbox over the REAL ISSUE_MAP and the REAL stance
// shards the page loads, so the relation census below is live coverage, not fixtures.
// No network, no database, no browser. Non-zero exit on any failure.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");

const fails = [];
let checks = 0;
const ok = (c, m) => { checks++; if (!c) fails.push(m); };

const SEC = "election_security";
const ACC = "voting_access";

// ── The sandbox ──────────────────────────────────────────────────────────────
// The lens reads window._resolveStanceList and window.ISSUE_MAP and nothing else it
// cannot live without, so the sandbox loads the same stance shards index.html loads
// (in the page's order), stance-helpers.js for the resolver, and the ISSUE_MAP literal
// lifted out of alignment-tool.js. PDXStance / PDXLearn / PDXIssueView are left absent
// on purpose in the base sandbox: every call to them is guarded, and their absence is
// the degraded path a first-paint race would actually hit.
function extractIssueMap(src) {
  const marker = /var\s+ISSUE_MAP\s*=\s*/.exec(src);
  if (!marker) throw new Error("could not find `var ISSUE_MAP =` in alignment-tool.js");
  let i = marker.index + marker[0].length;
  if (src[i] !== "{") throw new Error("expected `{` after `var ISSUE_MAP =`");
  let depth = 0, inS = null, inC = null;
  for (let j = i; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inC === "line") { if (c === "\n") inC = null; continue; }
    if (inC === "block") { if (c === "*" && n === "/") { inC = null; j++; } continue; }
    if (inS) { if (c === "\\") { j++; continue; } if (c === inS) inS = null; continue; }
    if (c === "'" || c === '"' || c === "`") { inS = c; continue; }
    if (c === "/" && n === "/") { inC = "line"; j++; continue; }
    if (c === "/" && n === "*") { inC = "block"; j++; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (!depth) return src.slice(i, j + 1); }
  }
  throw new Error("unbalanced braces while reading the ISSUE_MAP literal");
}

function makeSandbox(opts) {
  opts = opts || {};
  const noopEl = () => ({ style: {}, textContent: "", setAttribute() {}, appendChild() {} });
  const ctx = {
    console,
    document: {
      readyState: "complete", head: noopEl(), documentElement: noopEl(),
      createElement: noopEl, getElementById: () => null,
      querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
    },
    setTimeout, clearTimeout, JSON, Math, Date,
  };
  ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  ctx.navigator = { userAgent: "node" };
  ctx.location = { href: "", search: "", hash: "" };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  const sandbox = vm.createContext(ctx);

  if (!opts.bareData) {
    const html = read("index.html");
    const shards = [];
    const tagRe = /<script[^>]*\bsrc="([^"]*stances[^"]*\.js)"/g;
    let tag;
    while ((tag = tagRe.exec(html))) {
      const f = tag[1];
      if (f === "my-stances.js" || shards.includes(f)) continue;
      try { readFileSync(join(ROOT, f)); } catch (e) { continue; }   // not shipped
      shards.push(f);
    }
    if (!shards.length) throw new Error("no stance shards found in index.html script tags");
    for (const f of shards) vm.runInContext(read(f), sandbox, { filename: f });
    vm.runInContext(read("stance-helpers.js"), sandbox, { filename: "stance-helpers.js" });
    ctx.__shards = shards;
  }
  if (opts.stanceList) ctx._resolveStanceList = opts.stanceList;
  vm.runInContext("window.ISSUE_MAP = " + extractIssueMap(read("alignment-tool.js")),
    sandbox, { filename: "issue-map.js" });
  if (opts.before) opts.before(ctx);
  vm.runInContext(read("ballot-axes.js"), sandbox, { filename: "ballot-axes.js" });
  return ctx;
}

const win = makeSandbox({});
const BA = win.PDXBallotAxes;
const ISSUE_MAP = win.ISSUE_MAP;
const STANCES = win.ISSUE_STANCE_DATA || {};

// ── 1. The module's own self-test, against live data ─────────────────────────
ok(!!BA, "ballot-axes.js publishes window.PDXBallotAxes");
if (!BA) { report(); }
const st = BA.selfTest();
ok(st.pass, "PDXBallotAxes.selfTest(): " + (st.failures || []).join(" · "));
ok(BA.KEYS.security === SEC && BA.KEYS.access === ACC, "KEYS names both facet keys");

// ── 2. Vocabulary: the lens never invents a label ────────────────────────────
// axisMeta prefers the LIVE ISSUE_MAP label over its own fallback, so renaming an
// issue renames it everywhere at once. If that link breaks, the profile section and
// the Stance Library header start disagreeing about what the axis is called.
const stripIcon = (s) => {
  s = String(s || "").trim();
  const sp = s.indexOf(" ");
  return sp > 0 && /[^\x00-\x7F]/.test(s.slice(0, sp)) ? s.slice(sp + 1).trim() : s;
};
for (const [which, key] of [["security", SEC], ["access", ACC]]) {
  const m = BA.axisMeta(which);
  ok(!!ISSUE_MAP[key], key + " is a live ISSUE_MAP key");
  ok(!!m && m.key === key, which + ": axisMeta resolves to " + key);
  ok(m.label === stripIcon(ISSUE_MAP[key].label),
    which + ": label tracks the live ISSUE_MAP label (got " + m.label + ")");
  ok(!!m.chip, which + ": carries the ISSUE_MAP chip");
  ok(!!m.question && !!m.covers, which + ": states its question and what it covers");
  for (const d of ["support", "oppose", "mixed"]) {
    ok(!!m.dir[d] && m.dir[d].length > 8, which + ': names what "' + d + '" means on this axis');
  }
}
// The direction copy must actually differ between the axes — that difference IS the
// two-axis model. Identical copy would mean the lens is describing one dial.
ok(BA.axisMeta("security").dir.support !== BA.axisMeta("access").dir.support,
  '"supports" is described differently on each axis');
ok(BA.axisMeta("security").dir.oppose !== BA.axisMeta("access").dir.oppose,
  '"opposes" is described differently on each axis');

// ── 3. Facet identity: the legacy keys are NOT facets ────────────────────────
// election_integrity (lean R), voter_id (lean R) and democracy_balance are separate
// live keys with their own cards. Treating one as a facet would silently pull cards
// written for a different question into an axis.
ok(BA.isAxisKey(SEC) && BA.isAxisKey(ACC), "both facet keys are recognised");
for (const legacy of ["election_integrity", "voter_id", "democracy_balance"]) {
  ok(!!ISSUE_MAP[legacy], legacy + " still exists as its own ISSUE_MAP key");
  ok(!BA.isAxisKey(legacy), legacy + " is NOT treated as a facet");
  ok(BA.otherKey(legacy) === "", legacy + " has no companion axis");
}
ok(BA.otherKey(SEC) === ACC && BA.otherKey(ACC) === SEC, "the two axes pair to each other");

// ── 4. The relation census, over the real stance table ───────────────────────
// 'split' is the case this whole vertical exists to show, so the harness fails if the
// live data no longer exercises it — a green run against zero splits would be a test
// asserting nothing.
const census = { split: 0, paired: 0, one: 0, none: 0 };
const splitPids = [];
for (const pid of Object.keys(STANCES)) {
  const pair = BA.pairFor(pid, null);
  const rel = pair.relation || "none";
  census[rel]++;
  if (rel === "split") splitPids.push(pid);
}
ok(census.split > 0, "the live stance table contains at least one split pair");
ok(census.paired > 0, "the live stance table contains at least one same-direction pair");
ok(census.one > 0, "the live stance table contains at least one single-axis member");
ok(census.split + census.paired + census.one === census.split + census.paired + census.one,
  "relation census is internally consistent");

// Every split renders as a split: both axis rows, the split tone, and a sentence that
// names both axes rather than leaving the reader to infer the tension.
let splitRenderFails = 0;
for (const pid of splitPids) {
  const html = BA.profileHtml(pid, { name: "Test Member" });
  const good = html
    && html.indexOf("bax-verdict is-split") !== -1
    && html.indexOf("bax-security") !== -1
    && html.indexOf("bax-access") !== -1
    && html.indexOf("is-gap") === -1
    && html.indexOf("not a scoring error") !== -1;
  if (!good) { splitRenderFails++; if (splitRenderFails === 1) fails.push("split pair renders without the split read: " + pid); }
}
checks += splitPids.length;
ok(splitRenderFails === 0, splitRenderFails + " split pair(s) render without the split read");

// A member carded on one axis gets the muted "one axis" read and an explicit coverage
// gap — never a neutral position inferred from silence.
const onePid = Object.keys(STANCES).find((p) => BA.pairFor(p, null).relation === "one");
if (onePid) {
  const html = BA.profileHtml(onePid, null);
  ok(html.indexOf("bax-verdict is-one") !== -1, "single-axis member gets the one-axis verdict");
  ok(html.indexOf("bax-row is-gap") !== -1, "the uncarded axis renders as a gap row");
  ok(/coverage gap, not a neutral stance/.test(html), "the gap row says it is a gap, not a neutral stance");
}

// ── 5. Self-gating ───────────────────────────────────────────────────────────
// The section must vanish for anyone with nothing on either axis. A member carded on
// the LEGACY keys only is the case that matters: those cards are real, they are just
// not answers to either axis's question.
ok(BA.profileHtml("__pdx_no_such_politician__", null) === "", "unknown id renders nothing");
ok(BA.profileHtml("", null) === "", "empty id renders nothing");
const legacyOnly = Object.keys(STANCES).find((pid) => {
  const list = STANCES[pid] || [];
  return list.some((c) => c && (c.issueKey === "election_integrity" || c.issueKey === "voter_id"))
    && !list.some((c) => c && (c.issueKey === SEC || c.issueKey === ACC));
});
ok(!!legacyOnly, "the stance table still has a legacy-elections-only member to check");
if (legacyOnly) {
  ok(BA.profileHtml(legacyOnly, null) === "",
    "a member carded only on legacy election keys renders nothing (" + legacyOnly + ")");
}
// A card with no readable direction is not a position.
const noDir = makeSandbox({
  bareData: true,
  stanceList: () => [{ topic: "Elections", issueKey: SEC, issueStance: "", text: "n/a" }],
}).PDXBallotAxes;
ok(noDir.profileHtml("x", null) === "", "a card with no readable direction is not counted as a position");

// ── 6. Escaping ──────────────────────────────────────────────────────────────
// Stance text, topics and source labels are curated, but they reach innerHTML, and a
// curly quote or an ampersand in a bill title is routine. Everything goes through esc().
const hostile = makeSandbox({
  bareData: true,
  stanceList: () => ([
    {
      topic: '<img src=x onerror="boom()">', issueKey: SEC, issueStance: "support",
      text: 'Tom & Jerry <script>alert(1)</script> "quoted"',
      source: { label: "<b>Clerk</b>", url: 'https://x.test/a?b=1&c="2"' },
    },
    { topic: "Access", issueKey: ACC, issueStance: "oppose", text: "plain" },
  ]),
}).PDXBallotAxes;
const hHtml = hostile.profileHtml("x", { name: '<b>Ed</b>' });
ok(hHtml.indexOf("<script>") === -1, "raw <script> never reaches the profile section");
ok(hHtml.indexOf("<img src=x") === -1, "raw <img> never reaches the profile section");
ok(hHtml.indexOf('onerror="') === -1, "no live event handler survives escaping");
ok(hHtml.indexOf("&lt;script&gt;") !== -1, "hostile markup is escaped rather than dropped");
ok(hHtml.indexOf("Tom &amp; Jerry") !== -1, "ampersands are escaped");
ok(hHtml.indexOf('b=1&amp;c=&quot;2&quot;') !== -1, "the source href is attribute-escaped");
ok(hHtml.indexOf("<b>Ed</b>") === -1, "the display name is escaped in the verdict sentence");
ok(hostile.companionHtml("x", SEC, {}).indexOf("<img src=x") === -1,
  "the companion line escapes the other axis's topic");

// ── 7. The companion line ────────────────────────────────────────────────────
// This is what makes a split legible on an issue-FIRST surface, where only one key is
// ever in view. It must stay silent unless the member is actually carded on the key
// being shown, or it would render a stray line under every card in the library.
ok(BA.companionHtml(splitPids[0], "election_integrity", {}) === "",
  "the companion line renders nothing for a non-facet key");
const nonFacetPid = Object.keys(STANCES).find((p) => !BA.pairFor(p, null).count);
if (nonFacetPid) {
  ok(BA.companionHtml(nonFacetPid, SEC, {}) === "",
    "the companion line renders nothing for a member with no card on the key in view");
}
const cSplit = BA.companionHtml(splitPids[0], SEC, {});
ok(cSplit.indexOf("bax-companion is-split") !== -1, "a split is tagged on the companion line");
ok(cSplit.indexOf("bax-companion-tag") !== -1, 'the split carries the "Split" tag');
ok(cSplit.indexOf("📩") !== -1, "the companion line shows the OTHER axis (📩) under a 🔐 card");
ok(BA.companionHtml(splitPids[0], ACC, {}).indexOf("🔐") !== -1,
  "the companion line shows the OTHER axis (🔐) under a 📩 card");
const pairedPid = Object.keys(STANCES).find((p) => BA.pairFor(p, null).relation === "paired");
if (pairedPid) {
  const cPaired = BA.companionHtml(pairedPid, SEC, {});
  ok(cPaired && cPaired.indexOf("is-split") === -1,
    "a same-direction pair is NOT tagged as a split (" + pairedPid + ")");
}
if (onePid) {
  const mine = BA.pairFor(onePid, null).security ? SEC : ACC;
  const cGap = BA.companionHtml(onePid, mine, {});
  ok(cGap.indexOf("bax-companion is-gap") !== -1, "a missing other axis renders as a gap line");
  ok(/no position on record yet/.test(cGap), "the gap line says no position is on record yet");
}

// ── 8. The explainer ─────────────────────────────────────────────────────────
// Renders at the top of either axis in the Stance Library: the axis in view is marked,
// the other is a link, and the %KEY% template is fully substituted (a leftover token
// would ship a literal "%KEY%" into the DOM and a dead tile).
for (const [activeKey, otherIcon] of [[SEC, "📩"], [ACC, "🔐"]]) {
  const ex = BA.explainerHtml({ activeKey, onKey: 'data-sl-axis="%KEY%"' });
  ok(ex.indexOf("%KEY%") === -1, activeKey + ": the cross-link template is fully substituted");
  ok(ex.indexOf('data-sl-axis="' + BA.otherKey(activeKey) + '"') !== -1,
    activeKey + ": the other axis is linked by key");
  ok(ex.indexOf('data-sl-axis="' + activeKey + '"') === -1,
    activeKey + ": the axis already in view is NOT a link back to itself");
  ok(ex.indexOf("You’re here") !== -1, activeKey + ": the axis in view is marked");
  ok(ex.indexOf(otherIcon) !== -1, activeKey + ": both axes appear");
  ok(/“Supports” here means/.test(ex), activeKey + ": each tile spells out its own direction");
}
const exNeutral = BA.explainerHtml({});
ok(exNeutral && exNeutral.indexOf("You’re here") === -1,
  "with no active axis, neither tile claims to be the one in view");
ok(BA.explainerHtml({ activeKey: "voter_id" }).indexOf("You’re here") === -1,
  "a legacy key never marks either axis as in view");

// ── 9. Graceful degradation ──────────────────────────────────────────────────
// The lens is loaded with `defer` alongside its dependencies, so it must render
// something honest if a neighbour has not published yet. The base sandbox has no
// PDXStance / PDXLearn / PDXIssueView at all — everything above already ran that way.
ok(BA.profileHtml(splitPids[0], null).indexOf("bax-pill") !== -1,
  "without PDXStance the section falls back to its own stance pill");
ok(BA.profileHtml(splitPids[0], null).indexOf("bax-btn") === -1,
  "without PDXIssueView no dead ranking button is rendered");
const withHosts = makeSandbox({
  before(ctx) {
    ctx.PDXIssueView = { open() {} };
    ctx.PDXStance = { stancePill: (s) => '<span class="pdxs-pill">' + s + "</span>" };
    ctx.PDXLearn = { term: (k, t) => '<button data-pdx-term="' + k + '">' + t + "</button>" };
  },
}).PDXBallotAxes;
const rich = withHosts.profileHtml(splitPids[0], null);
ok(rich.indexOf("pdxs-pill") !== -1, "with PDXStance the canonical stance pill is used");
ok(rich.indexOf('data-pdx-term="twoaxis"') !== -1, 'the section links the "twoaxis" glossary term');
ok(rich.indexOf("PDXIssueView.open('" + SEC + "')") !== -1, "the 🔐 ranking button is offered");
ok(rich.indexOf("PDXIssueView.open('" + ACC + "')") !== -1, "the 📩 ranking button is offered");
ok(withHosts.explainerHtml({ activeKey: SEC }).indexOf('data-pdx-term="twoaxis"') !== -1,
  "the explainer links the glossary term too");

// ── 10. Every class the module emits is styled ────────────────────────────────
const MOD = read("ballot-axes.js");
const CSS = read("ballot-axes.css");
const emitted = new Set();
for (const m of MOD.matchAll(/class="([^"]*)"/g)) {
  for (const c of m[1].split(/\s+/)) if (/^bax-[a-z-]+$/.test(c)) emitted.add(c);
}
// Two classes are built by concatenation (`'bax-' + which`) and one by state suffix,
// so they are named here rather than scraped.
["bax-security", "bax-access"].forEach((c) => emitted.add(c));
for (const c of Array.from(emitted).sort()) {
  ok(CSS.indexOf("." + c) !== -1, "ballot-axes.css styles ." + c);
}
for (const state of ["is-split", "is-paired", "is-one", "is-gap", "is-here", "is-link"]) {
  ok(CSS.indexOf("." + state) !== -1, "ballot-axes.css styles the ." + state + " state");
}

// ── 11. Host wiring ──────────────────────────────────────────────────────────
// A lens nobody mounts is a lens that regressed. Each assertion below names the
// surface and the goal it serves.
const INDEX = read("index.html");
ok(/<script[^>]*src="ballot-axes\.js"/.test(INDEX), "index.html loads ballot-axes.js");
ok(/<script[^>]*\bdefer\b[^>]*src="ballot-axes\.js"/.test(INDEX),
  "ballot-axes.js is deferred, so ISSUE_MAP and the resolver exist before it runs");
ok(INDEX.indexOf("ballot-axes.css") !== -1, "index.html links ballot-axes.css");
const noscripts = [...INDEX.matchAll(/<noscript>[\s\S]*?<\/noscript>/g)].map((m) => m[0]).join("");
ok(noscripts.indexOf("ballot-axes.css") !== -1,
  "ballot-axes.css has a <noscript> fallback like its sibling stylesheets");

const PROFILES = read("profiles-full.js");
ok(/PDXBallotAxes\s*&&\s*typeof\s+window\.PDXBallotAxes\.profileHtml/.test(PROFILES),
  "profiles-full.js mounts the section behind a presence guard");
ok(/PDXBallotAxes\.profileHtml\(id,\s*p\)/.test(PROFILES),
  "the profile passes the id and the roster record to profileHtml");

const LIB = read("stance-library.js");
ok(/key:\s*'ballot'/.test(LIB), "the Stance Library offers a 🗳 Security + Access hot topic");
ok(LIB.indexOf("isAxisKey") !== -1,
  "the hot-topic predicate asks the lens what counts as a facet rather than hard-coding it");
ok(/'election_security'|"election_security"/.test(LIB) && /'voting_access'|"voting_access"/.test(LIB),
  "the hot-topic predicate still resolves both keys when the lens has not loaded");
ok(LIB.indexOf("axesExplainerHtml") !== -1, "the per-issue detail view renders the two-axis explainer");
ok(LIB.indexOf("axesCompanionHtml") !== -1, "each member card carries the other-axis companion line");
ok(LIB.indexOf("data-sl-axis") !== -1, "the explainer's cross-axis link has a click handler");
ok(/getAttribute\('data-sl-axis'\)/.test(LIB), "the handler reads the key off the clicked tile");

const ALIGN = read("alignment-tool.js");
const quick = /ALIGN_QUICK_PICKS\s*=\s*\[([\s\S]*?)\]/.exec(ALIGN);
ok(!!quick && quick[1].indexOf(SEC) !== -1 && quick[1].indexOf(ACC) !== -1,
  "the Alignment quick picks offer BOTH axes");
const hot = /ALIGN_HOT_ISSUES\s*=\s*\{([\s\S]*?)\}/.exec(ALIGN);
ok(!!hot && hot[1].indexOf(SEC) !== -1 && hot[1].indexOf(ACC) !== -1,
  "both axes carry the 🔥 hot-issue flag");
const core = /keys:\s*\[([^\]]*election_integrity[^\]]*)\]/.exec(ALIGN);
ok(!!core && core[1].indexOf(SEC) !== -1 && core[1].indexOf(ACC) !== -1,
  "both axes sit inside the elections CORE_NATIONAL_ISSUES bundle");

const CMP = read("issue-compare.js");
ok(CMP.indexOf("axisNoteHtml") !== -1, "Issue Comparison explains the axis it is showing");
ok(/isAxisKey/.test(CMP), "the comparison note is gated on the lens, not on a copied key list");
ok(/PDXIssueCompare\.selectIssue\(/.test(CMP), "the note offers a jump to the other axis");
ok(read("issue-compare.css").indexOf(".ic-axisnote") !== -1, "the comparison note is styled");

// The head-to-head table lists the two axes as adjacent rows, where the same word
// points opposite ways — so each facet row carries its own direction line.
const TABLE = read("compare-table.js");
ok(TABLE.indexOf("_cmpAxisHint") !== -1, "the comparison table labels each facet row's direction");
ok(/_cmpAxisHint\(iss\.issueKey\)/.test(TABLE), "the hint is rendered into the issue row's label cell");
ok(/isAxisKey/.test(TABLE), "the table hint is gated on the lens rather than a copied key list");
ok(CSS.indexOf(".bax-tablehint") !== -1, "the table hint is styled in the lens's own stylesheet");

const SPOT = read("spotlights-data.js");
ok(SPOT.indexOf("issueKey: 'election_security'") !== -1,
  "the voter-ID Spotlight lists the 🔐 axis in its related issues");
ok(SPOT.indexOf("issueKey: 'voting_access'") !== -1,
  "the voter-ID Spotlight lists the 📩 axis in its related issues");
ok(/two separate axes/.test(SPOT),
  "the Spotlight's what-this-is-not section names the two-axis model");
ok(/two independent axes/.test(SPOT),
  "the Spotlight's stance-scale note says the library judges two independent axes");

const LEARN = read("pdx-learn.js");
ok(/twoaxis:\s*\{/.test(LEARN), "the glossary defines the 'twoaxis' term the lens links to");
ok(/'twoaxis'/.test(LEARN), "'twoaxis' is cross-referenced from a related glossary entry");

// The lens renders inside two surfaces that ARE precached, so leaving it out of the
// shell would make the first offline profile view drop the two-axis read entirely.
const SW = read("sw.js");
const shell = /SHELL_ASSETS\s*=\s*\[([\s\S]*?)\n\];/.exec(SW);
ok(!!shell, "sw.js still declares a SHELL_ASSETS list");
ok(!!shell && shell[1].indexOf("'/ballot-axes.js'") !== -1, "the app shell precaches ballot-axes.js");
ok(!!shell && shell[1].indexOf("'/ballot-axes.css'") !== -1, "the app shell precaches ballot-axes.css");

// ── 12. Receipts land on real issues ─────────────────────────────────────────
// Say-vs-Do groups a receipt under the ISSUE_MAP label for its issueKey, so a facet
// receipt with a key the map does not know would render under a blank heading. Formal
// votes are deliberately NOT Say-vs-Do receipts — they are the Official Record — which
// is why the facet items carrying category 'voting' are expected to be excluded there.
const ACCT = read("acct-spotlight-data.js");
const facetItems = [...ACCT.matchAll(/issueKey:\s*'(election_security|voting_access)'/g)];
ok(facetItems.length > 0, "the accountability data carries facet-keyed items");
for (const m of facetItems) {
  ok(!!ISSUE_MAP[m[1]], "receipt issueKey '" + m[1] + "' is a live ISSUE_MAP key");
}
const SAYDO = read("say-vs-do.js");
ok(/String\(it\.category[\s\S]{0,40}===\s*'voting'/.test(SAYDO),
  "say-vs-do still routes formal votes to the Official Record instead of claiming them");
const CONSIST = read("consistency.js");
ok(/no_stance:\s*\{/.test(CONSIST),
  "consistency.js keeps the no_stance verdict, so a receipt with no stated position reads honestly");

// ── Report ───────────────────────────────────────────────────────────────────
function report() {
  if (fails.length) {
    console.error("✗ ballot axes: " + fails.length + " failure(s)");
    for (const f of fails) console.error("   · " + f);
    process.exit(1);
  }
  console.log("✓ ballot axes: all " + checks + " assertions passed");
  console.log("  " + (win.__shards || []).length + " stance shard(s) the page loads · " +
    Object.keys(STANCES).length + " stance blocks");
  console.log("  facet relations on live data: " + census.split + " split · " +
    census.paired + " same-direction · " + census.one + " single-axis");
  process.exit(0);
}
report();
