#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-ballot-axes.mjs — 🧩 the splitting lesson, with one worked pair under it
// ─────────────────────────────────────────────────────────────────────────────
// ballot-axes.js holds ONE DECLARED PAIR up side by side. Its three jobs, in
// order: say what the pair is doing on this profile, show this person on each
// half of it, and open the door into each issue's normal dossier. Every gate
// below defends that order or the wall around it:
//
//   1. THE STATUS LEADS, AND NO ESSAY RUNS AHEAD OF IT. Status, then the two
//      columns, then at most one pointer footer — in the markup, on every
//      profile. The concept strip that used to lead the block is gone and must
//      not come back: the splitting rule is taught where a reader meets it (the
//      multi-issue row notes, the dossier, the glossary), and repeating it here
//      buried the one reading only this block produces. The footer that remains
//      is asserted to be a POINTER at the dossier, and to name no topic.
//   2. THE STATUS IS DERIVED FROM THE LIVE ROW STATE. Five states, resolved from
//      the shared row model and nothing else, and the two that COMPARE may only
//      compare like with like: two stated positions, or — where neither side has
//      one — two record patterns, which carry the pattern-only disclosure with
//      them. A stated position is never weighed against the other side's record.
//   3. EACH COLUMN IS A SUMMARY PLUS A DOOR. Issue label, axis question, Said,
//      🏛 Record in the row model's own vocabulary (depth, early signal,
//      pattern-only tag), the ONE percentage Direction Match already resolved for
//      that issue — and one control, which opens the existing dossier. The stance
//      prose that used to live here does not appear in the block at all.
//   4. ONE MOUNT RULE, TESTED BOTH WAYS. Visible only where BOTH halves of the
//      pair are on this profile's browse set. One half → the host is emitted
//      hidden and empty so the post-paint record lane can fill it. Neither half →
//      no markup at all.
//   5. THE DOOR IS THE EXISTING ONE. PDXConsistency.openGap, the same sheet a tree
//      leaf opens, no second report surface, and a door that cannot open says so
//      where the thumb already is instead of swallowing the tap.
//   6. IT IS NOT A SCORE. Rows, verdicts, tallies and the headline Direction Match
//      read are byte-identical with the module unloaded; the only percentages in
//      the block are the per-issue ones the row model published; the two axes are
//      never merged into one verdict; no party framing.
//   7. MOBILE STACKS WITHOUT LOSING THE PAIR READ.
//   8. THE PAIR IS DATA. PAIRS is a registry; no elections wording reaches the
//      shell, the status vocabulary or the column renderer.
//   9. THE ISSUE-FIRST SURFACES STILL WORK. The companion line, the explainer and
//      every host that mounts them are unchanged by this pass.
//
//   node scripts/test-ballot-axes.mjs
//
// Two harnesses. The FULL one runs the shipped modules in a node:vm sandbox over
// real profile data with votes seeded the way a completed /api/voting-record fetch
// leaves the cache — that is where the block, the row model and the status rule
// are read live. The LIGHT one loads the lens alone over the real stance shards
// and the real ISSUE_MAP, with hand-built neighbours, and is where escaping, the
// delegated door and the degraded first-paint paths are exercised. No network, no
// database, no browser. Non-zero exit on any failure.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox as fullSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");

const fails = [];
let checks = 0;
const ok = (c, m) => { checks++; if (!c) fails.push(m); };
const eq = (a, b, m) =>
  ok(a === b, `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (hay, needle, m) => ok(String(hay).includes(needle), `${m} — ${JSON.stringify(needle)} missing`);
const lacks = (hay, needle, m) => ok(!String(hay).includes(needle), `${m} — ${JSON.stringify(needle)} present`);
const section = (t) => console.log(`  · ${t}`);
// A stale probe is not a pass: if the live data stops offering a case the block
// exists to render, this file says so and stops rather than reporting green over
// an assertion that never ran.
const must = (c, m) => {
  if (c) { checks++; return; }
  console.error(`✗ ballot axes: ${m}`);
  process.exit(2);
};

const SEC = "election_security";
const ACC = "voting_access";

// ═════════════════════════════════════════════════════════════════════════════
// Harness A — the whole product, in a sandbox
// ═════════════════════════════════════════════════════════════════════════════
// ballot-axes.js is LAST, and sandbox B omits it — that is the no-drift proof.
const BASE = [
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
  "issue-colors.js",
  "consistency.js",
  "voting-record.js",
  "word-action.js",
  "profile-spine.js",
  "stance-tree.js",
];
const AXES = "ballot-axes.js";
const SRC = new Map([...BASE, AXES].map((f) => [f, read(f)]));
function boot(withAxes) {
  const win = fullSandbox();
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of BASE) vm.runInContext(SRC.get(f), sandbox, { filename: f });
  if (withAxes) vm.runInContext(SRC.get(AXES), sandbox, { filename: AXES });
  win.PROFILES = win.CMP_DATA;
  return win;
}

// ═════════════════════════════════════════════════════════════════════════════
// Harness B — the lens alone, over real stance data
// ═════════════════════════════════════════════════════════════════════════════
// The block's neighbours are all optional and every call into them is guarded, so
// the light sandbox can leave them out (the degraded first-paint path) or hand
// them a stub whose output is known character for character (escaping, the door).
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

function lightSandbox(opts) {
  opts = opts || {};
  const made = [];
  const noopEl = () => {
    const el = {
      style: {}, textContent: "", className: "", _kids: [], _attrs: {},
      setAttribute(k, v) { this._attrs[k] = String(v); },
      getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null; },
      removeAttribute(k) { delete this._attrs[k]; },
      appendChild(kid) { this._kids.push(kid); kid.parentNode = this; return kid; },
      removeChild(kid) { this._kids = this._kids.filter((k) => k !== kid); return kid; },
      querySelector(sel) {
        return this._kids.find((k) => "." + String(k.className) === sel) || null;
      },
      closest() { return null; },
    };
    made.push(el);
    return el;
  };
  const listeners = { click: [] };
  const ctx = {
    console,
    document: {
      readyState: "complete", head: noopEl(), documentElement: noopEl(),
      createElement: noopEl, getElementById: () => null,
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
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
  vm.runInContext(read(AXES), sandbox, { filename: AXES });
  ctx.__listeners = listeners;
  ctx.__made = made;
  return ctx;
}

// A leaf good enough to render a column, with every field the block reads. The
// SHAPE is the shipped one — the live harness above is what proves the real row
// model still fills it.
const stubLeaf = (key, o) => ({
  pid: "x", key, label: key,
  said: { key: o.said || "none", label: o.saidLabel || "No stated position", stated: !!o.said && o.said !== "none" },
  record: o.record === null ? null : Object.assign(
    { state: "none", label: "No formal record on file yet", depth: "", tone: "muted", directional: false, early: false, earlyNote: "" },
    o.record || {}),
  patternOnly: !!o.patternOnly,
});
const stubTree = (leaves) => ({
  PATTERN_ONLY_NOTE: "Inferred from the formal record pattern.",
  PATTERN_ONLY_TAG: "Not in Direction Match",
  leaf: (pid, key) => leaves[key] || null,
});

const light = lightSandbox({});
const BA = light.PDXBallotAxes;
const ISSUE_MAP = light.ISSUE_MAP;
const STANCES = light.ISSUE_STANCE_DATA || {};
must(!!BA, "ballot-axes.js did not publish window.PDXBallotAxes");

// ── The live fixtures ────────────────────────────────────────────────────────
const A = boot(true), B = boot(false);
must(!!A.PDXBallotAxes, "the module did not publish in the full sandbox");
must(!B.PDXBallotAxes, "sandbox B really is the product without the lens");
const LA = A.PDXBallotAxes, CS = A.PDXConsistency;

// Census over every profile with stance cards: which relations the live data can
// still show. `both` is the mount case, `one` is the hidden-host case.
const census = { same: 0, split: 0, unsettled: 0, one: 0, thin: 0 };
const withBoth = [], withOne = [], withNeither = [];
for (const pid of Object.keys(A.ISSUE_STANCE_DATA || {})) {
  const a = LA.axisState(pid, "security"), b = LA.axisState(pid, "access");
  if (a && b) { withBoth.push(pid); census[LA.statusFor(a, b).key]++; }
  else if (a || b) withOne.push(pid);
  else withNeither.push(pid);
}
must(withBoth.length >= 5, `too few profiles carry both halves of the pair (${withBoth.length})`);
must(withOne.length >= 1, "no profile carries exactly one half of the pair");
must(withNeither.length >= 1, "no profile is off the pair entirely");
must(census.split > 0, "the live data no longer contains a split pair");
must(census.same > 0, "the live data no longer contains a same-direction pair");
must(census.unsettled > 0, "the live data no longer contains a mixed-on-one-side pair");
const allWith = (k) => withBoth.filter((pid) =>
  LA.statusFor(LA.axisState(pid, "security"), LA.axisState(pid, "access")).key === k);
const SPLIT_PID = allWith("split")[0];
const MIXED_PID = allWith("unsettled")[0];
const ONE_PID = withOne[0];
const NONE_PID = withNeither[0];
const nameOf = (pid) => A.CMP_DATA[pid] || { name: "Test Member" };

// The record half of every column arrives after first paint, so it is seeded here
// the way a completed fetch leaves the cache.
const vote = (n, issueKey, position) => ({
  kind: "vote", rollcallId: 700 + n, measureId: 1100 + n, number: "H.R. " + (300 + n),
  date: "2025-0" + ((n % 9) + 1) + "-11", action: "On Passage", position,
  isProcedural: false, title: "Measure " + n,
  source: { url: "https://www.congress.gov/roll-call-vote/" + (700 + n), label: "Congress.gov" },
  issues: [{ issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
});
// SAME_PID: both halves deep and one-way, so both columns reach the SCORED record
// state and the only two percentages in the block have somewhere to come from.
// Every same-direction candidate is seeded in both sandboxes and the first one
// Direction Match actually scores on both axes becomes the fixture — which issue
// the engine scores is the engine's business, not this file's.
const SEED = [];
for (let i = 0; i < 12; i++) SEED.push(vote(i, SEC, "yea"));
for (let i = 0; i < 12; i++) SEED.push(vote(20 + i, ACC, "yea"));
const scoredOn = (win, pid) => {
  const rows = {};
  win.PDXConsistency.issueRows(pid).forEach((r) => { rows[r.key] = r; });
  return [SEC, ACC].every((k) => {
    const d = rows[k] ? win.PDXConsistency.recordPattern.display(rows[k]) : null;
    return !!d && d.state === "scored" && typeof d.pct === "number";
  });
};
let SAME_PID = "";
for (const pid of allWith("same")) {
  A.PDXVotingRecord.noteMember(pid, SEED.map((v) => JSON.parse(JSON.stringify(v))));
  B.PDXVotingRecord.noteMember(pid, SEED.map((v) => JSON.parse(JSON.stringify(v))));
  if (!SAME_PID && scoredOn(A, pid)) SAME_PID = pid;
}
must(!!SAME_PID, "no same-direction profile reaches the scored record state on both axes");
// ONE_PID: the half with nothing stated gets a deep record instead, which is the
// record-only column — pattern-only, disclosed, and never compared against the
// other side's stated position.
const oneStated = LA.axisState(ONE_PID, "security") ? "security" : "access";
const oneSilentKey = oneStated === "security" ? ACC : SEC;
A.PDXVotingRecord.noteMember(ONE_PID, Array.from({ length: 9 }, (_, i) => vote(40 + i, oneSilentKey, "nay")));
// THIN_PID: exactly one formal item on the silent half — a record, and an early one.
const THIN_PID = withOne[1];
must(!!THIN_PID, "the live data no longer offers a second single-half profile");
const thinSilentKey = LA.axisState(THIN_PID, "security") ? ACC : SEC;
A.PDXVotingRecord.noteMember(THIN_PID, [vote(60, thinSilentKey, "yea")]);

const esc = (t) => String(t == null ? "" : t)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const blockOf = (pid) => LA.profileHtml(pid, nameOf(pid));
const colOf = (html, which) => {
  const at = String(html).indexOf('data-pdxbax-axis="' + which + '"');
  if (at < 0) return "";
  const start = String(html).lastIndexOf("<article", at);
  return String(html).slice(start, String(html).indexOf("</article>", at) + 10);
};
const SPLIT_HTML = blockOf(SPLIT_PID);
const SAME_HTML = blockOf(SAME_PID);
const MIXED_HTML = blockOf(MIXED_PID);
must(!!SPLIT_HTML && !!SAME_HTML, "the fixture profiles rendered no block at all");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the module's own self-test, against live data");
// ═════════════════════════════════════════════════════════════════════════════
{
  const st = BA.selfTest();
  ok(st.pass, "selfTest() in the lens-only sandbox: " + (st.failures || []).join(" · "));
  const stFull = LA.selfTest();
  ok(stFull.pass, "selfTest() in the full sandbox: " + (stFull.failures || []).join(" · "));
  ok(BA.KEYS.security === SEC && BA.KEYS.access === ACC, "KEYS names both issue keys");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · vocabulary: the lens never invents a label");
// ═════════════════════════════════════════════════════════════════════════════
// axisMeta prefers the LIVE ISSUE_MAP label over its own fallback, so renaming an
// issue renames it everywhere at once. If that link breaks, a column header and
// the Stance Library start disagreeing about what the issue is called.
{
  const stripIcon = (s) => {
    s = String(s || "").trim();
    const sp = s.indexOf(" ");
    return sp > 0 && /[^\x00-\x7F]/.test(s.slice(0, sp)) ? s.slice(sp + 1).trim() : s;
  };
  for (const [which, key] of [["security", SEC], ["access", ACC]]) {
    const m = BA.axisMeta(which);
    ok(!!ISSUE_MAP[key], key + " is a live ISSUE_MAP key");
    ok(!!m && m.key === key, which + ": axisMeta resolves to " + key);
    eq(m.label, stripIcon(ISSUE_MAP[key].label), which + ": label tracks the live ISSUE_MAP label");
    ok(!!m.chip, which + ": carries the ISSUE_MAP chip");
    ok(!!m.question && !!m.covers, which + ": states its question and what it covers");
    ok(!!m.shortLabel && m.shortLabel.length < m.label.length + 1,
      which + ": has a short label for the status sentence");
    for (const d of ["support", "oppose", "mixed"]) {
      ok(!!m.dir[d] && m.dir[d].length > 8, which + ': names what "' + d + '" means on this axis');
    }
  }
  // The direction copy must actually differ between the axes — that difference IS
  // the two-axis model. Identical copy would mean the block describes one dial.
  ok(BA.axisMeta("security").dir.support !== BA.axisMeta("access").dir.support,
    '"supports" is described differently on each axis');
  ok(BA.axisMeta("security").dir.oppose !== BA.axisMeta("access").dir.oppose,
    '"opposes" is described differently on each axis');
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · facet identity: the legacy keys are NOT axes");
// ═════════════════════════════════════════════════════════════════════════════
// election_integrity, voter_id and democracy_balance are separate live keys with
// their own cards. Treating one as an axis would pull cards written for a
// different question into a column and change what the block claims.
{
  ok(BA.isAxisKey(SEC) && BA.isAxisKey(ACC), "both axis keys are recognised");
  for (const legacy of ["election_integrity", "voter_id", "democracy_balance"]) {
    ok(!!ISSUE_MAP[legacy], legacy + " still exists as its own ISSUE_MAP key");
    ok(!BA.isAxisKey(legacy), legacy + " is NOT treated as an axis");
    eq(BA.otherKey(legacy), "", legacy + " has no companion axis");
  }
  ok(BA.otherKey(SEC) === ACC && BA.otherKey(ACC) === SEC, "the two axes pair to each other");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · status first, on every profile — and no concept strip");
// ═════════════════════════════════════════════════════════════════════════════
// The reader must get THIS PAIR'S READING before anything else in the block. That
// is an order in the markup, not a claim in a comment — and the general lesson
// that used to sit above it is gone, in the module and in the stylesheet.
{
  for (const [label, html] of [["split", SPLIT_HTML], ["same", SAME_HTML], ["mixed", MIXED_HTML]]) {
    const iStatus = html.indexOf("bax-status");
    const iCols = html.indexOf("bax-cols");
    const iFoot = html.indexOf("bax-foot");
    ok(iStatus > -1 && iCols > -1, label + ": the block carries the status band and the two columns");
    ok(iStatus < iCols, label + ": the pair status precedes the two columns");
    ok(iFoot === -1 || iCols < iFoot, label + ": any footer comes last, under the columns");
    // The status is the FIRST thing in the body — nothing renders ahead of it.
    const iBody = html.indexOf('<div class="bax-body">');
    ok(iBody > -1, label + ": the host body is emitted");
    eq(html.slice(iBody + '<div class="bax-body">'.length, iBody + 60).indexOf('<div class="bax-status'), 0,
      label + ": the status band opens the block body");
    // …and it precedes the first thing that names a topic at all.
    const iAxis = Math.min(...[html.indexOf("🔐"), html.indexOf("📩")].filter((n) => n > -1));
    ok(iStatus < iAxis, label + ": the status precedes the first axis on screen");
    lacks(html, "bax-concept", label + ": no concept strip leads the block");
  }
  // The retired strip is gone from the module and leaves no orphan CSS rule.
  lacks(read(AXES), "function conceptHtml", "the concept renderer is deleted, not just unmounted");
  ok(!("CONCEPT" in BA), "…and CONCEPT is no longer exported");
  const CSSFILE = read("ballot-axes.css");
  ok(!/^\.bax-concept/m.test(CSSFILE), "the stylesheet carries no .bax-concept rule");
  // WHAT SURVIVES IS A POINTER, NOT A LESSON. One line, out of the block, at the
  // dossier — and pair-agnostic, so it can never become a topic essay again.
  const iF = SAME_HTML.indexOf('<p class="bax-foot">');
  ok(iF > -1, "the block keeps one footer line");
  const foot = SAME_HTML.slice(iF, SAME_HTML.indexOf("</p>", iF));
  has(foot, "dossier", "the footer says where the full list of a measure's issues lives");
  ok(foot.replace(/<[^>]*>/g, "").length < 160, "…in one line, not a paragraph");
  for (const w of ["election", "ballot", "voting", "voter", "party", "democrat", "republican"]) {
    ok(foot.toLowerCase().indexOf(w) === -1, `the footer copy does not say "${w}"`);
  }
  const footOf = (h) => h.slice(h.indexOf('<p class="bax-foot">'), h.indexOf("</p>", h.indexOf('<p class="bax-foot">')));
  eq(footOf(SPLIT_HTML), footOf(SAME_HTML), "the footer is identical across profiles");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the pair status is read off the live row state");
// ═════════════════════════════════════════════════════════════════════════════
{
  // Recomputed here from PDXConsistency directly — the row model the rest of the
  // profile uses — and compared against what the block printed. If the block ever
  // starts hand-waving a status, these two disagree.
  const expected = (pid) => {
    const rows = {};
    CS.issueRows(pid).forEach((r) => { rows[r.key] = r; });
    const side = (key) => {
      const r = rows[key];
      if (!r) return null;
      const disp = CS.recordPattern.display(r) || null;
      const said = (r.stance && r.stance.key) || "";
      const polar = (said === "support" || said === "oppose") ? said : "";
      const recDir = (disp && disp.directional && (disp.tone === "support" || disp.tone === "oppose")) ? disp.tone : "";
      return { polar, mixed: said === "mixed", stated: !!(polar || said === "mixed"), recDir };
    };
    const a = side(SEC), b = side(ACC);
    if (!a || !b) return null;
    const sig = (s) => !!(s.polar || s.mixed || s.recDir);
    if (a.polar && b.polar) return a.polar === b.polar ? "same" : "split";
    if ((a.mixed || b.mixed) && sig(a) && sig(b)) return "unsettled";
    if (!sig(a) && !sig(b)) return "thin";
    if (!a.stated && !b.stated && a.recDir && b.recDir) return a.recDir === b.recDir ? "same" : "split";
    return "one";
  };
  let compared = 0, drift = 0;
  for (const pid of withBoth) {
    const want = expected(pid);
    if (!want) continue;
    compared++;
    const got = (blockOf(pid).match(/data-pdxbax-status="([a-z]+)"/) || [])[1];
    if (got !== want) { drift++; if (drift === 1) fails.push(`${pid}: printed status "${got}" but the rows say "${want}"`); }
  }
  checks += compared;
  ok(drift === 0, drift + " profile(s) print a status their rows do not support");
  must(compared >= 5, "the live comparison ran on too few profiles");

  // The five states, and the vocabulary each one prints.
  eq(Object.keys(BA.STATUS).join(","), "same,split,unsettled,one,thin",
    "five status states are declared, in the order they degrade");
  has(SPLIT_HTML, 'data-pdxbax-status="split"', "a split pair is tagged as a split");
  has(SPLIT_HTML, BA.STATUS.split.tag, "…under the split status word");
  has(SAME_HTML, 'data-pdxbax-status="same"', "a same-direction pair is tagged as agreeing");
  has(MIXED_HTML, 'data-pdxbax-status="unsettled"', "a stated Mixed is neither agreement nor a split");
  // Quiet when they agree, louder when they split — the brief's one visual rule.
  eq(BA.STATUS.same.tone, "quiet", "agreement is the quiet state");
  eq(BA.STATUS.split.tone, "loud", "a split is the loud one");
  has(SAME_HTML, "tone-quiet", "…and the tone reaches the markup on agreement");
  has(SPLIT_HTML, "tone-loud", "…and on a split");
  // The sentence names both halves. A status word with no axes in it is a label,
  // not something a reader can check against the columns below it.
  const sentence = (h) => h.slice(h.indexOf("bax-status-txt"), h.indexOf("bax-cols"));
  for (const [label, h] of [["split", SPLIT_HTML], ["same", SAME_HTML], ["mixed", MIXED_HTML]]) {
    has(sentence(h), "🔐", label + ": the status sentence names the 🔐 half");
    has(sentence(h), "📩", label + ": …and the 📩 half");
  }
  has(sentence(SPLIT_HTML), "never averaged", "the split sentence refuses the merged reading out loud");
  has(sentence(SAME_HTML), "not one merged score", "the agreement sentence refuses it too");

  // LIKE IS ONLY EVER COMPARED WITH LIKE. A stated position on one axis and a
  // record pattern on the other is "one side", never a split.
  const mixedBasis = LA.statusFor(
    { dir: "support", mixed: false, recDir: "", signal: true, said: { stated: true }, meta: BA.axisMeta("security") },
    { dir: "", mixed: false, recDir: "oppose", signal: true, said: { stated: false }, meta: BA.axisMeta("access") });
  eq(mixedBasis.key, "one", "a stated position is never compared against the other side's record");
  const oneHtml = LA.profileHtml(ONE_PID, nameOf(ONE_PID));
  has(oneHtml, 'data-pdxbax-status="one"',
    "the seeded record-only half reads as one side on record, not as agreement");
  has(oneHtml, 'data-pdxbax-basis="said"', "…and the status says which kind of claim it read");
  // Two record patterns MAY compare — and they carry the pattern-only disclosure.
  const recBasis = LA.statusFor(
    { dir: "", mixed: false, recDir: "support", signal: true, said: { stated: false }, meta: BA.axisMeta("security") },
    { dir: "", mixed: false, recDir: "oppose", signal: true, said: { stated: false }, meta: BA.axisMeta("access") });
  eq(recBasis.key, "split", "two record patterns pointing opposite ways are a split");
  eq(recBasis.basis, "record", "…on the record basis, and it says so");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · each column is a summary plus a door — never a second report");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const which of ["security", "access"]) {
    const col = colOf(SAME_HTML, which);
    const meta = BA.axisMeta(which);
    ok(!!col, which + ": the column renders");
    has(col, esc(meta.label), which + ": prints the precise issue label");
    has(col, esc(meta.question), which + ": prints its own axis question");
    has(col, "<b>Said:</b>", which + ": prints the Said slot");
    has(col, "<b>🏛 Record:</b>", which + ": prints the Record slot");
    has(col, 'data-pdxbax-issue="' + meta.key + '"', which + ": carries its issue key");
    has(col, "“Supports” here =", which + ": spells out what its own direction means");
    has(col, "--pdx-ic:", which + ": paints from the shared per-issue colour tokens");
    has(col, 'class="bax-col-go"', which + ": offers exactly one primary action");
    eq((col.match(/<button/g) || []).length, 1, which + ": …and nothing else is a control");
  }
  // The record slot is the row model's, verbatim: label, depth, the percentage
  // Direction Match already resolved, and the early-signal caveat where it is thin.
  const rows = {}; CS.issueRows(SAME_PID).forEach((r) => { rows[r.key] = r; });
  const disp = CS.recordPattern.display(rows[SEC]);
  must(!!disp && disp.state === "scored", "the seeded fixture no longer reaches the scored record state");
  const secCol = colOf(SAME_HTML, "security");
  has(secCol, disp.label, "the Record label is the row model's own word for it");
  has(secCol, disp.depth, "…printed with the depth it is drawn from");
  has(secCol, 'class="bax-pct"', "…and the issue's Direction Match percentage");
  has(secCol, disp.pct + "%", "…which is the percentage the row model published, unchanged");
  has(secCol, 'data-pdxbax-rec="scored"', "the record state is published for a test to read");

  // A one-item record is a record, and it says out loud that it is early.
  const thinHtml = LA.profileHtml(THIN_PID, nameOf(THIN_PID));
  const thinCol = colOf(thinHtml, thinSilentKey === SEC ? "security" : "access");
  has(thinCol, "bax-early", "a one-item record carries the early-signal caveat");
  has(thinCol, "bax-tag", "…and the pattern-only tag, since nothing was stated there");
  has(thinCol, A.PDXStanceTree.PATTERN_ONLY_TAG, "…in the tree's own words");
  lacks(thinCol, 'class="bax-pct"', "…and no percentage, because Direction Match never scored it");

  // THE PROSE IS GONE. The stance text, its evidence line and its source link are
  // the dossier's job; this block hands over one short topic clause and the door.
  const cards = (A.ISSUE_STANCE_DATA[SPLIT_PID] || []).filter((c) => c && (c.issueKey === SEC || c.issueKey === ACC));
  must(cards.length >= 2, "the split fixture no longer carries cards on both axes");
  let leaked = 0;
  for (const c of cards) {
    const probe = String(c.text || "").replace(/\s+/g, " ").trim().slice(0, 40);
    if (probe && SPLIT_HTML.replace(/\s+/g, " ").indexOf(probe) !== -1) leaked++;
  }
  eq(leaked, 0, "no stance prose from the cards reaches the block");
  lacks(SPLIT_HTML, "<a ", "the block carries no source links of its own");
  lacks(SPLIT_HTML, "http", "…and no outbound URLs — the dossier owns the receipts");
  const clause = (SPLIT_HTML.match(/class="bax-col-clause">([^<]*)</) || [])[1] || "";
  ok(clause.length < 90, "the optional clause is one short line, not a paragraph (" + clause.length + " chars)");
  ok(cards.some((c) => esc(c.topic || "") === clause) || clause === "",
    "…and it is the card's own topic, nothing rewritten here");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · one mount rule, tested on both sides of it");
// ═════════════════════════════════════════════════════════════════════════════
// VISIBLE only where BOTH halves are on this profile's browse set. One half → an
// empty host, hidden, so the post-paint record lane has something to fill. Neither
// half → no markup at all. `hidden` is not a mount.
{
  ok(SPLIT_HTML.indexOf("<section") === 0, "a complete pair mounts a section");
  lacks(SPLIT_HTML.slice(0, SPLIT_HTML.indexOf(">")), " hidden", "…and it is not hidden");
  has(SPLIT_HTML, 'data-pdxbax-pair="elections"', "…tagged with the pair it renders");
  const cold = boot(true).PDXBallotAxes.profileHtml(ONE_PID, nameOf(ONE_PID));
  has(cold, "<section", "a half-covered pair still emits its host");
  has(cold.slice(0, cold.indexOf(">")), " hidden", "…hidden");
  has(cold, '<div class="bax-body"></div>', "…and empty, so nothing renders a half-built pair");
  eq(LA.profileHtml(NONE_PID, nameOf(NONE_PID)), "", "a profile off the pair renders nothing at all");
  eq(LA.profileHtml("__pdx_no_such_politician__", null), "", "an unknown id renders nothing");
  eq(LA.profileHtml("", null), "", "an empty id renders nothing");
  // The same host, once the record lane has landed, is a full block: that is what
  // the hidden shell exists for.
  has(LA.profileHtml(ONE_PID, nameOf(ONE_PID)), "bax-cols",
    "…and once the formal record lands, the same host renders both columns");
  // A member carded only on the LEGACY election keys is not on this pair.
  const legacyOnly = Object.keys(STANCES).find((pid) => {
    const list = STANCES[pid] || [];
    return list.some((c) => c && (c.issueKey === "election_integrity" || c.issueKey === "voter_id"))
      && !list.some((c) => c && (c.issueKey === SEC || c.issueKey === ACC));
  });
  ok(!!legacyOnly, "the stance table still has a legacy-elections-only member to check");
  if (legacyOnly) eq(LA.profileHtml(legacyOnly, nameOf(legacyOnly)), "",
    "a member carded only on legacy election keys mounts nothing (" + legacyOnly + ")");

  // The mount site: directly under the tree, in the browse stage, not replacing it.
  const PF = read("profiles-full.js");
  ok(/PDXBallotAxes\s*&&\s*typeof\s+window\.PDXBallotAxes\.profileHtml/.test(PF),
    "profiles-full.js mounts the block behind a presence guard");
  ok(/PDXBallotAxes\.profileHtml\(id,\s*p\)/.test(PF), "…passing the id and the roster record");
  const iTree = PF.indexOf("PDXStanceTree.sectionHtml(id)");
  const iAxes = PF.indexOf("PDXBallotAxes.profileHtml(id, p)");
  ok(iTree > 0 && iAxes > iTree, "the block sits directly under the tree it explains");
  ok(PF.slice(iTree, iAxes).indexOf("<!--PDXSP:") === -1,
    "…inside the same profile stage, with no other section between them");
  eq((PF.match(/PDXBallotAxes\.profileHtml\(id, p\)/g) || []).length, 1,
    "…and it is called exactly once, so there is only one such block on a profile");
  // The shell takes the pair from data. Elections wording in the component API
  // would make the second pair a rewrite instead of a row in an array.
  ok(Array.isArray(BA.PAIRS) && BA.PAIRS.length >= 1, "PAIRS is a registry the block iterates");
  ok(BA.PAIRS.every((d) => d.id && d.axes && d.axes.length === 2), "…each entry declaring two axes");
  eq(BA.pairDef("elections").id, "elections", "…reachable by id");
  eq(BA.pairDef("__nope__"), null, "…and unknown ids resolve to nothing");
  const shell = read(AXES).slice(read(AXES).indexOf("function statusHtml"), read(AXES).indexOf("function companionHtml"));
  for (const w of ["election", "ballot", "voting", "voter"]) {
    ok(shell.toLowerCase().indexOf("'" + w) === -1 && shell.toLowerCase().indexOf('"' + w) === -1,
      `the shell renderer hard-codes no "${w}" copy`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the door is the existing dossier");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const [which, key] of [["security", SEC], ["access", ACC]]) {
    const col = colOf(SPLIT_HTML, which);
    has(col, 'data-pdxbax-dos="' + key + '"', which + ": the door names the issue it opens");
    has(col, 'data-pdxbax-pid="' + SPLIT_PID + '"', which + ": …for this profile");
    has(col, "data-pdxbax-origin=", which + ": …and hands the sheet a return anchor");
    has(col, "Opens the issue dossier.", which + ": the accessible name says where it goes");
  }
  // No second report surface: nothing here navigates, opens a modal of its own, or
  // reaches for another viewer.
  const MOD = read(AXES);
  lacks(MOD, "location.href", "the module never navigates");
  lacks(MOD, "PDXIssueView.open", "…and opens no second issue viewer");
  eq((MOD.match(/openGap\(/g) || []).length, 1, "exactly one call into the dossier exists");
  ok(typeof A.PDXConsistency.openGap === "function", "…and PDXConsistency.openGap is the one it calls");

  // The delegated handler, exercised. A stub PDXConsistency records the call.
  const calls = [];
  const doorWin = lightSandbox({
    bareData: true,
    stanceList: () => [],
    before(ctx) {
      ctx.PDXStanceTree = stubTree({
        [SEC]: stubLeaf(SEC, { said: "support", saidLabel: "Supports" }),
        [ACC]: stubLeaf(ACC, { said: "oppose", saidLabel: "Opposes" }),
      });
      ctx.PDXConsistency = { openGap: (pid, key, opts) => { calls.push({ pid, key, opts }); return true; } };
    },
  });
  const handler = (doorWin.__listeners.click || [])[0];
  ok(typeof handler === "function", "the block binds one delegated click handler");
  const fakeCol = doorWin.document.createElement();
  fakeCol.className = "bax-col";
  const fakeBtn = {
    _a: { "data-pdxbax-dos": SEC, "data-pdxbax-pid": "abc", "data-pdxbax-origin": "anchor-1" },
    getAttribute(k) { return this._a[k] || null; },
    closest(sel) { return sel === ".bax-col" ? fakeCol : null; },
  };
  let defaulted = 0;
  const fire = () => handler({
    target: { closest: (sel) => (sel === "[data-pdxbax-dos]" ? fakeBtn : null) },
    preventDefault() { defaulted++; },
  });
  fire();
  eq(calls.length, 1, "tapping a column opens the dossier");
  eq(calls[0].key, SEC, "…for the issue that column is about");
  eq(calls[0].pid, "abc", "…on this profile");
  eq(calls[0].opts.arrival, false, "…as a tap, not an arrival");
  eq(calls[0].opts.origin, "anchor-1", "…with the column's own return anchor");
  eq(defaulted, 1, "…and the tap is consumed rather than left to bubble into a link");
  eq(fakeCol._kids.length, 0, "a door that opened leaves no failure note behind");
  // FAIL CLOSED, OUT LOUD. A dossier that cannot open must say so where the thumb
  // already is — a silent swallow reads as "this issue has no report".
  const dead = lightSandbox({
    bareData: true, stanceList: () => [],
    before(ctx) {
      ctx.PDXStanceTree = stubTree({ [SEC]: stubLeaf(SEC, { said: "support" }), [ACC]: stubLeaf(ACC, { said: "oppose" }) });
      ctx.PDXConsistency = { openGap: () => false };
    },
  });
  const deadCol = dead.document.createElement();
  deadCol.className = "bax-col";
  const deadBtn = {
    getAttribute: (k) => ({ "data-pdxbax-dos": SEC, "data-pdxbax-pid": "abc" })[k] || null,
    closest: (sel) => (sel === ".bax-col" ? deadCol : null),
  };
  (dead.__listeners.click || [])[0]({
    target: { closest: (sel) => (sel === "[data-pdxbax-dos]" ? deadBtn : null) }, preventDefault() {},
  });
  eq(deadCol.getAttribute("data-pdxbax-failed"), "1", "a door that cannot open marks its own column");
  eq(deadCol._kids.length, 1, "…and writes one note into it");
  eq(deadCol._kids[0].textContent, dead.PDXBallotAxes.DOOR_FAIL, "…saying what happened, in words");
  eq(deadCol._kids[0]._attrs.role, "status", "…announced to a screen reader");
  ok(/Nothing in this column has changed/.test(dead.PDXBallotAxes.DOOR_FAIL),
    "…and promising the column's own facts are unaffected");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · it is not a score");
// ═════════════════════════════════════════════════════════════════════════════
// Every number the profile publishes is identical with this module unloaded, and
// the only percentages inside the block are the per-issue ones the row model
// already resolved. There is no pair score, and there never can be one.
{
  const rowsA = CS.issueRows(SAME_PID), rowsB = B.PDXConsistency.issueRows(SAME_PID);
  eq(rowsA.length, rowsB.length, "both sandboxes model the same rows");
  const bk = {}; rowsB.forEach((r) => { bk[r.key] = r; });
  let scored = 0;
  rowsA.forEach((a) => {
    const b = bk[a.key];
    ok(!!b, `${a.key}: the row exists in both sandboxes`);
    if (!b) return;
    eq(a.verdict.token, b.verdict.token, `${a.key}: the verdict token is unchanged`);
    eq(a.verdict.score, b.verdict.score, `${a.key}: the verdict score is unchanged`);
    eq(JSON.stringify(a.stance), JSON.stringify(b.stance), `${a.key}: the stated position is unchanged`);
    if (typeof a.verdict.score === "number") scored++;
  });
  ok(scored > 0, "the fixture actually scores something for the comparison to protect");
  eq(JSON.stringify(CS.verdictTally(SAME_PID)), JSON.stringify(B.PDXConsistency.verdictTally(SAME_PID)),
    "the profile's verdict tally is byte-identical");
  eq(JSON.stringify(A.PDXWordAction.read(SAME_PID)), JSON.stringify(B.PDXWordAction.read(SAME_PID)),
    "the headline Direction Match read is byte-identical");
  eq(JSON.stringify(A._polPositionMap(SAME_PID, A.CMP_DATA[SAME_PID])),
     JSON.stringify(B._polPositionMap(SAME_PID, B.CMP_DATA[SAME_PID])),
    "…and the position map is byte-identical");

  // The percentages inside the block, checked one by one against the rows.
  const rowPct = {};
  [SEC, ACC].forEach((k) => {
    const r = rowsA.find((x) => x.key === k);
    const d = r ? CS.recordPattern.display(r) : null;
    if (d && typeof d.pct === "number") rowPct[k] = d.pct;
  });
  const printed = (SAME_HTML.match(/>(\d+)%</g) || []).map((s) => Number(s.replace(/\D/g, "")));
  ok(printed.length > 0, "the scored fixture prints its per-issue percentages");
  ok(printed.length <= 2, "…and at most one per column (" + printed.length + " found)");
  const allowed = Object.values(rowPct);
  printed.forEach((n) => ok(allowed.indexOf(n) !== -1,
    n + "% is a percentage Direction Match published, not one computed here"));
  // The pair itself never gets a number, a grade or a merged verdict word.
  lacks(SAME_HTML, "bax-score", "the block declares no score of its own");
  const statusBand = SAME_HTML.slice(SAME_HTML.indexOf("bax-status"), SAME_HTML.indexOf("bax-cols"));
  ok(!/\d+%/.test(statusBand), "the status band carries no percentage");
  ok(!/\b(overall|combined|average|averaged|blended|elections score)\b/i.test(SAME_HTML),
    "nothing in the block claims a combined reading");
  for (const state of Object.keys(BA.STATUS)) {
    ok(typeof BA.STATUS[state].tag === "string" && !/\d/.test(BA.STATUS[state].tag),
      state + ": the status word is a word, not a figure");
  }
  // No party framing, anywhere in the block.
  ["Democrat", "Republican", "party", "GOP", "partisan"].forEach((w) =>
    ok(!new RegExp("\\b" + w + "\\b", "i").test(SPLIT_HTML + SAME_HTML),
      `the block carries no party framing (${w})`));
  // The block reads the row model and PDXIssueColors; it must not reach into the
  // public lane, which is deliberately outside Direction Match.
  lacks(read(AXES), "publicOpinion", "the module never consults the public lane");
  lacks(read(AXES), "PDXPublic", "…by any door");
}

// ═════════════════════════════════════════════════════════════════════════════
section("10 · two columns, stacked on a phone without losing the pair");
// ═════════════════════════════════════════════════════════════════════════════
{
  const CSS = read("ballot-axes.css");
  ok(/\.bax-cols\s*\{[^}]*grid-template-columns:\s*1fr 1fr/.test(CSS),
    "the pair is two columns wide by default");
  const mq = /@media \(max-width: 640px\) \{[^}]*\.bax-cols\s*\{[^}]*grid-template-columns:\s*1fr[^}]*\}/;
  ok(mq.test(CSS), "…and one column on a phone");
  ok(/\.bax-col\.bax-security\s*\{\s*order:\s*1/.test(CSS) && /\.bax-col\.bax-access\s*\{\s*order:\s*2/.test(CSS),
    "…in a declared order, so the stack still reads as the same pair");
  ok(CSS.indexOf("var(--pdx-ic") !== -1, "columns paint from the shared issue colour tokens");
  ok(/\.bax-status\.is-same/.test(CSS) && /\.bax-status\.is-split/.test(CSS),
    "the status band is styled differently when the axes agree and when they split");
  ok(/\.bax-sec\[hidden\]\s*\{\s*display:\s*none/.test(CSS), "a hidden host really is invisible");

  // Every class the module emits is styled.
  const MOD = read(AXES);
  const emitted = new Set();
  for (const m of MOD.matchAll(/class="([^"]*)"/g)) {
    for (const c of m[1].split(/\s+/)) if (/^bax-[a-z-]+$/.test(c)) emitted.add(c);
  }
  ["bax-security", "bax-access"].forEach((c) => emitted.add(c));
  for (const c of Array.from(emitted).sort()) ok(CSS.indexOf("." + c) !== -1, "ballot-axes.css styles ." + c);
  // …and every state suffix the renderer builds by concatenation.
  for (const s of Object.keys(BA.STATUS)) ok(CSS.indexOf(".is-" + s) !== -1, "…the .is-" + s + " status");
  for (const s of ["s-support", "s-oppose", "s-mixed", "s-none"]) ok(CSS.indexOf("." + s) !== -1, "…the ." + s + " Said face");
  for (const s of ["st-scored", "st-onfile", "st-pending", "st-none"]) ok(CSS.indexOf("." + s) !== -1, "…the ." + s + " record state");
  for (const s of ["tone-support", "tone-oppose", "tone-mixed", "tone-muted", "tone-verdict", "tone-quiet", "tone-loud"])
    ok(CSS.indexOf("." + s) !== -1, "…the ." + s + " tone");
}

// ═════════════════════════════════════════════════════════════════════════════
section("11 · degradation and escaping");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The block is loaded with `defer` alongside its dependencies, so a missing
  // neighbour degrades to nothing rather than to a half-rendered pair. The light
  // sandbox has no PDXStanceTree at all — that IS the first-paint race.
  eq(BA.profileHtml(SPLIT_PID, { name: "Test" }), "",
    "with no row model published yet, the block renders nothing rather than guessing");
  // With the row model present but the glossary absent, the copy still renders —
  // as plain text, with no dead button.
  const noLearn = lightSandbox({
    bareData: true, stanceList: () => [],
    before(ctx) {
      ctx.PDXStanceTree = stubTree({ [SEC]: stubLeaf(SEC, { said: "support" }), [ACC]: stubLeaf(ACC, { said: "support" }) });
    },
  }).PDXBallotAxes;
  const plain = noLearn.profileHtml("x", { name: "Test" });
  has(plain, "the dossier behind each column", "without PDXLearn the footer copy is still printed");
  lacks(plain, "data-pdx-term", "…with no dead glossary control");
  const withLearn = lightSandbox({
    bareData: true, stanceList: () => [],
    before(ctx) {
      ctx.PDXStanceTree = stubTree({ [SEC]: stubLeaf(SEC, { said: "support" }), [ACC]: stubLeaf(ACC, { said: "support" }) });
      ctx.PDXLearn = { term: (k, t) => '<button data-pdx-term="' + k + '">' + t + "</button>" };
    },
  }).PDXBallotAxes;
  const rich = withLearn.profileHtml("x", { name: "Test" });
  has(rich, 'data-pdx-term="omnibus"', "with the glossary loaded the footer links the multi-issue term");
  eq((rich.match(/data-pdx-term=/g) || []).length, 1,
    "…and that is the block's only glossary control — the card teaches by pointing, once");

  // Escaping. Topics, record labels and display names are curated, but they reach
  // innerHTML, and an ampersand in a title is routine.
  const hostile = lightSandbox({
    bareData: true,
    stanceList: () => ([
      { topic: '<img src=x onerror="boom()">', issueKey: SEC, issueStance: "support", text: "prose" },
      { topic: "Access", issueKey: ACC, issueStance: "oppose", text: "prose" },
    ]),
    before(ctx) {
      ctx.PDXStanceTree = stubTree({
        [SEC]: stubLeaf(SEC, {
          said: "support", saidLabel: 'Tom & Jerry <script>alert(1)</script>',
          record: { state: "direction", label: "<b>Ran</b> both ways", depth: "3 & 4 votes", tone: "mixed" },
        }),
        [ACC]: stubLeaf(ACC, { said: "oppose", saidLabel: "Opposes" }),
      });
    },
  }).PDXBallotAxes;
  const hHtml = hostile.profileHtml("x", { name: "<b>Ed</b>" });
  lacks(hHtml, "<script>", "raw <script> never reaches the block");
  lacks(hHtml, "<img src=x", "raw <img> never reaches the block");
  lacks(hHtml, 'onerror="', "no live event handler survives escaping");
  has(hHtml, "&lt;script&gt;", "hostile markup is escaped rather than dropped");
  has(hHtml, "Tom &amp; Jerry", "ampersands are escaped");
  lacks(hHtml, "<b>Ed</b>", "the display name is escaped in the status sentence");
  lacks(hHtml, "<b>Ran</b>", "…and the record label with it");
  lacks(hostile.companionHtml("x", SEC, {}), "<img src=x",
    "the companion line escapes the other axis's topic too");
}

// ═════════════════════════════════════════════════════════════════════════════
section("12 · the issue-first surfaces are unchanged");
// ═════════════════════════════════════════════════════════════════════════════
// The companion line and the explainer run where only ONE key is ever in view —
// a stance card in the library, an issue page. This pass did not touch them, and
// the assertions below are what says so.
{
  const cardSplit = Object.keys(STANCES).find((p) => BA.pairFor(p, null).relation === "split");
  must(!!cardSplit, "the live stance table no longer contains a card-level split");
  eq(BA.companionHtml(cardSplit, "election_integrity", {}), "",
    "the companion line renders nothing for a non-axis key");
  const nonAxisPid = Object.keys(STANCES).find((p) => !BA.pairFor(p, null).count);
  if (nonAxisPid) eq(BA.companionHtml(nonAxisPid, SEC, {}), "",
    "…and nothing for a member with no card on the key in view");
  const cSplit = BA.companionHtml(cardSplit, SEC, {});
  has(cSplit, "bax-companion is-split", "a split is tagged on the companion line");
  has(cSplit, "bax-companion-tag", 'the split carries the "Split" tag');
  has(cSplit, "📩", "the companion line shows the OTHER axis (📩) under a 🔐 card");
  has(BA.companionHtml(cardSplit, ACC, {}), "🔐", "…and the 🔐 axis under a 📩 card");
  const pairedPid = Object.keys(STANCES).find((p) => BA.pairFor(p, null).relation === "paired");
  if (pairedPid) ok(BA.companionHtml(pairedPid, SEC, {}).indexOf("is-split") === -1,
    "a same-direction pair is NOT tagged as a split (" + pairedPid + ")");
  const onePid = Object.keys(STANCES).find((p) => BA.pairFor(p, null).relation === "one");
  if (onePid) {
    const mine = BA.pairFor(onePid, null).security ? SEC : ACC;
    has(BA.companionHtml(onePid, mine, {}), "bax-companion is-gap", "a missing other axis renders as a gap line");
    ok(/no position on record yet/.test(BA.companionHtml(onePid, mine, {})),
      "…which says no position is on record yet, rather than inferring neutrality");
  }
  for (const [activeKey, otherIcon] of [[SEC, "📩"], [ACC, "🔐"]]) {
    const ex = BA.explainerHtml({ activeKey, onKey: 'data-sl-axis="%KEY%"' });
    lacks(ex, "%KEY%", activeKey + ": the cross-link template is fully substituted");
    has(ex, 'data-sl-axis="' + BA.otherKey(activeKey) + '"', activeKey + ": the other axis is linked by key");
    lacks(ex, 'data-sl-axis="' + activeKey + '"', activeKey + ": the axis in view is not a link back to itself");
    has(ex, "You’re here", activeKey + ": the axis in view is marked");
    has(ex, otherIcon, activeKey + ": both axes appear");
    ok(/“Supports” here means/.test(ex), activeKey + ": each tile spells out its own direction");
  }
  lacks(BA.explainerHtml({}), "You’re here", "with no active axis, neither tile claims to be in view");
  lacks(BA.explainerHtml({ activeKey: "voter_id" }), "You’re here", "a legacy key never marks either axis as in view");
}

// ═════════════════════════════════════════════════════════════════════════════
section("13 · host wiring");
// ═════════════════════════════════════════════════════════════════════════════
// A lens nobody mounts is a lens that regressed. Each assertion names the surface
// and the goal it serves.
{
  const INDEX = read("index.html");
  ok(/<script[^>]*src="ballot-axes\.js"/.test(INDEX), "index.html loads ballot-axes.js");
  ok(/<script[^>]*\bdefer\b[^>]*src="ballot-axes\.js"/.test(INDEX),
    "ballot-axes.js is deferred, so ISSUE_MAP and the resolver exist before it runs");
  ok(INDEX.indexOf("ballot-axes.css") !== -1, "index.html links ballot-axes.css");
  ok(INDEX.indexOf('src="stance-tree.js"') < INDEX.indexOf('src="ballot-axes.js"'),
    "…after stance-tree.js, whose row model both columns read");
  const noscripts = [...INDEX.matchAll(/<noscript>[\s\S]*?<\/noscript>/g)].map((m) => m[0]).join("");
  ok(noscripts.indexOf("ballot-axes.css") !== -1, "ballot-axes.css has a <noscript> fallback like its siblings");

  const LIB = read("stance-library.js");
  ok(/key:\s*'ballot'/.test(LIB), "the Stance Library offers a 🗳 Security + Access hot topic");
  ok(LIB.indexOf("isAxisKey") !== -1, "the hot-topic predicate asks the lens what counts as an axis");
  ok(/'election_security'|"election_security"/.test(LIB) && /'voting_access'|"voting_access"/.test(LIB),
    "…and still resolves both keys when the lens has not loaded");
  ok(LIB.indexOf("axesExplainerHtml") !== -1, "the per-issue detail view renders the two-axis explainer");
  ok(LIB.indexOf("axesCompanionHtml") !== -1, "each member card carries the other-axis companion line");
  ok(/getAttribute\('data-sl-axis'\)/.test(LIB), "the explainer's cross-axis link has a handler");

  const ALIGN = read("alignment-tool.js");
  const quick = /ALIGN_QUICK_PICKS\s*=\s*\[([\s\S]*?)\]/.exec(ALIGN);
  ok(!!quick && quick[1].indexOf(SEC) !== -1 && quick[1].indexOf(ACC) !== -1,
    "the Alignment quick picks offer BOTH axes");
  const hot = /ALIGN_HOT_ISSUES\s*=\s*\{([\s\S]*?)\}/.exec(ALIGN);
  ok(!!hot && hot[1].indexOf(SEC) !== -1 && hot[1].indexOf(ACC) !== -1, "both axes carry the 🔥 hot-issue flag");
  const core = /keys:\s*\[([^\]]*election_integrity[^\]]*)\]/.exec(ALIGN);
  ok(!!core && core[1].indexOf(SEC) !== -1 && core[1].indexOf(ACC) !== -1,
    "both axes sit inside the elections CORE_NATIONAL_ISSUES bundle");

  const CMP = read("issue-compare.js");
  ok(CMP.indexOf("axisNoteHtml") !== -1, "Issue Comparison explains the axis it is showing");
  ok(/isAxisKey/.test(CMP), "…gated on the lens, not on a copied key list");
  ok(read("issue-compare.css").indexOf(".ic-axisnote") !== -1, "the comparison note is styled");
  const TABLE = read("compare-table.js");
  ok(TABLE.indexOf("_cmpAxisHint") !== -1, "the comparison table labels each axis row's direction");
  ok(/isAxisHint|isAxisKey/.test(TABLE), "…gated on the lens rather than a copied key list");
  ok(read("ballot-axes.css").indexOf(".bax-tablehint") !== -1, "the table hint is styled in the lens's own stylesheet");

  const SPOT = read("spotlights-data.js");
  ok(SPOT.indexOf("issueKey: 'election_security'") !== -1, "the voter-ID Spotlight lists the 🔐 axis");
  ok(SPOT.indexOf("issueKey: 'voting_access'") !== -1, "…and the 📩 axis");
  ok(/two separate axes/.test(SPOT), "the Spotlight's what-this-is-not section names the two-axis model");

  const LEARN = read("pdx-learn.js");
  ok(/twoaxis:\s*\{/.test(LEARN), "the glossary defines the 'twoaxis' term the Library explainer links");
  ok(/omnibus:\s*\{/.test(LEARN), "…and the 'omnibus' term the block's footer links");

  const SW = read("sw.js");
  const shell = /SHELL_ASSETS\s*=\s*\[([\s\S]*?)\n\];/.exec(SW);
  ok(!!shell, "sw.js still declares a SHELL_ASSETS list");
  ok(!!shell && shell[1].indexOf("'/ballot-axes.js'") !== -1, "the app shell precaches ballot-axes.js");
  ok(!!shell && shell[1].indexOf("'/ballot-axes.css'") !== -1, "…and ballot-axes.css");
}

// ═════════════════════════════════════════════════════════════════════════════
section("14 · the data behind the pair is still the shipped data");
// ═════════════════════════════════════════════════════════════════════════════
{
  const ACCT = read("acct-spotlight-data.js");
  const items = [...ACCT.matchAll(/issueKey:\s*'(election_security|voting_access)'/g)];
  ok(items.length > 0, "the accountability data carries axis-keyed items");
  for (const m of items) ok(!!ISSUE_MAP[m[1]], "receipt issueKey '" + m[1] + "' is a live ISSUE_MAP key");
  const SAYDO = read("say-vs-do.js");
  ok(/String\(it\.category[\s\S]{0,40}===\s*'voting'/.test(SAYDO),
    "say-vs-do still routes formal votes to the Official Record instead of claiming them");
  ok(/no_stance:\s*\{/.test(read("consistency.js")),
    "consistency.js keeps the no_stance verdict, so a silent issue reads honestly");
}

// ── Report ───────────────────────────────────────────────────────────────────
if (fails.length) {
  console.error("✗ ballot axes: " + fails.length + " failure(s)");
  for (const f of fails) console.error("   · " + f);
  process.exit(1);
}
console.log("✓ ballot axes: all " + checks + " assertions passed");
console.log("  " + (light.__shards || []).length + " stance shard(s) the page loads · " +
  Object.keys(STANCES).length + " stance blocks");
console.log("  pair coverage on live data: " + withBoth.length + " both halves · " +
  withOne.length + " one half · " + withNeither.length + " off the pair");
console.log("  status census: " + Object.keys(census).map((k) => census[k] + " " + k).join(" · "));
process.exit(0);
