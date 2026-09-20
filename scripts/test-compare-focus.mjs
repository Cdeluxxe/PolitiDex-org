#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// COMPARISON FOCUS, DIVERGENCE AND THE SHAPE OF A GAP
// ─────────────────────────────────────────────────────────────────────────────
// The comparison surfaces already lead with the formal record. This harness
// gates the pass that made them usable for an actual choice: a small pinned set
// of issues, a per-row read of whether the records DIVERGED or merely ran out,
// and a lineup you can edit without losing your place.
//
// The failure modes worth a test are not "does the badge render". They are the
// four ways this kind of control quietly turns into a rating:
//
//   1. A GAP LEARNS TO LOOK LIKE A TIE. "Fewer than two records here can be
//      read" and "every record here ran the same way" are opposite facts. If
//      they share a treatment — same fill, same weight, same silence — the
//      reader is told the lineup agrees when what happened is that we do not
//      know. This is the single most important assertion in the file.
//   2. A SPLIT RECORD BECOMES A SIDE. A 3–2 record has a larger number, so it
//      has a `lead`. Counting that lead as a direction manufactures a divergence
//      out of a coin flip. Only a CHARACTERISED record picks a side.
//   3. PINNING BECOMES A WEIGHT. Focus reorders rows and nothing else. The
//      moment it multiplies, filters by default, or reaches a score, the reader
//      is no longer comparing records — they are comparing a thing we computed
//      from their preferences.
//   4. THE COUNTS BECOME A SHARE. "3 diverge, 5 ran the same way, 4 not enough
//      on file" describes our file. The same numbers over a denominator would
//      rate three politicians, which is exactly what the comparison grid is not
//      allowed to do.
//
//   node scripts/test-compare-focus.mjs
//
// No database, no network, no browser. Exit 1 on a failed assertion, 2 when a
// probe target has moved and a contract can no longer be checked at all.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MODULES = ["pdx-learn.js", "stance-helpers.js", "consistency.js", "say-vs-do.js",
                 "voting-record.js", "receipt-cards.js"];
const SRC = Object.fromEntries(MODULES.map((f) => [f, readFileSync(join(ROOT, f), "utf8")]));
const TEXT = Object.fromEntries(
  ["compare-table.js", "issue-compare.js", "app.css", "issue-compare.css", "index.html",
   "consistency.js", "say-vs-do.js"]
    .map((f) => [f, readFileSync(join(ROOT, f), "utf8")]));

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} (${JSON.stringify(needle)} missing)`);
const lacks = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg} (${JSON.stringify(needle)} unexpectedly present)`);
function must(cond, what) {
  if (!cond) {
    console.error("✗ compare-focus harness is STALE — a contract cannot be verified:\n  " + what +
      "\n\n  This is not a passing state. Restore the probe target, or update this\n" +
      "  harness AND re-check the rule it describes.");
    process.exit(2);
  }
}

// Structural probes read a comment-blanked copy so that a rule of the form "this
// function never mentions X" cannot be satisfied by a comment ABOUT X.
function blankComments(s) {
  let out = "", i = 0; const n = s.length; let prev = "";
  const REGEX_OK = "(,=:[!&|?{};+-~*%<>^\n";
  while (i < n) {
    const c = s[i], d = s[i + 1];
    if (c === "/" && d === "/") { while (i < n && s[i] !== "\n") { out += " "; i++; } continue; }
    if (c === "/" && d === "*") {
      out += "  "; i += 2;
      while (i < n && !(s[i] === "*" && s[i + 1] === "/")) { out += (s[i] === "\n" ? "\n" : " "); i++; }
      if (i < n) { out += "  "; i += 2; }
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      out += c; i++;
      while (i < n) {
        if (s[i] === "\\") { out += s[i] + (s[i + 1] || ""); i += 2; continue; }
        out += s[i]; if (s[i] === c) { i++; break; } i++;
      }
      prev = c; continue;
    }
    if (c === "/" && REGEX_OK.indexOf(prev) !== -1) {
      out += c; i++; let inClass = false;
      while (i < n) {
        if (s[i] === "\\") { out += "  "; i += 2; continue; }
        if (s[i] === "[") inClass = true; else if (s[i] === "]") inClass = false;
        if (s[i] === "/" && !inClass) { out += "/"; i++; break; }
        if (s[i] === "\n") { out += "\n"; i++; break; }
        out += " "; i++;
      }
      prev = "/"; continue;
    }
    out += c; i++;
    if (!/\s/.test(c)) prev = c;
  }
  return out;
}
const CODE = Object.fromEntries(["compare-table.js", "issue-compare.js", "consistency.js", "say-vs-do.js"]
  .map((f) => [f, blankComments(TEXT[f])]));

function fnBody(file, head, label, max) {
  const src = CODE[file];
  must(!!src, `${file} could not be read`);
  const at = src.indexOf(head);
  must(at !== -1, `${file} no longer contains ${JSON.stringify(head)} — ${label}`);
  const open = src.indexOf("{", at);
  must(open !== -1, `${label} in ${file} has no body`);
  let depth = 0, i = open, inStr = null, esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) { if (esc) { esc = false; continue; } if (c === "\\") { esc = true; continue; } if (c === inStr) inStr = null; continue; }
    if (c === "'" || c === '"' || c === "`") { inStr = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { i++; break; } }
  }
  must(depth === 0, `could not brace-scan ${label} in ${file}`);
  const body = src.slice(at, i);
  must(body.length > 40 && body.length < (max || 12000),
    `the brace scan of ${label} in ${file} returned ${body.length} chars — the probe has lost its target`);
  return body;
}

// ── Fixtures ─────────────────────────────────────────────────────────────────
// One member with a deep, uniformly-advancing record; a second who runs the same
// way; a third who runs the OPPOSITE way; a member whose record on the issue is
// an even split; a member below the coverage floor; and a member nothing has
// been fetched for at all. Between them every state contrast() can return.
const LABELS = {
  climate_action:  "🌍 Climate Action",
  school_choice:   "🎓 School Choice",
  lower_taxes:     "🧾 Lower Taxes",
  gov_regulation:  "📋 Government Regulation",
  border_security: "🛂 Border Security",
  space_program:   "🚀 Space Program",
};
const UNIFORM_KEY = "school_choice";    // deep, one direction, for every member
const SPLIT_KEY   = "gov_regulation";   // deep ENOUGH to count, and still no side
const SOLO_KEY    = "border_security";  // one judged vote — thin
const NONE_KEY    = "space_program";    // nothing at all

let seq = 0;
const pad = (n) => String(n).padStart(2, "0");
const mkVote = (issueKey, position) => {
  seq++; const id = 2000 + seq;
  return {
    kind: "vote", measureId: id, congress: 119, session: 1, rollNumber: 200 + seq,
    measureType: "bill", number: "H.R. " + id, title: "Measure " + seq + " Act",
    chamber: "house", result: "Passed",
    date: "2025-" + pad((seq % 11) + 1) + "-" + pad((seq % 27) + 1),
    action: "On Passage", position, isProcedural: false,
    source: { url: "https://www.congress.gov/bill/119th-congress/house-bill/" + id, label: "Congress.gov" },
    issues: [{ issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports",
               rationale: "Directly changes the federal policy this issue tracks." }],
  };
};
const many = (n, k, p) => Array.from({ length: n }, () => mkVote(k, p));

const DEEP_YEA = [...many(6, UNIFORM_KEY, "yea"), ...many(6, "climate_action", "yea"),
                  ...many(3, SPLIT_KEY, "yea"), ...many(3, SPLIT_KEY, "nay"),
                  ...many(1, SOLO_KEY, "yea"), ...many(5, "lower_taxes", "yea")];
const DEEP_SAME = [...many(6, UNIFORM_KEY, "yea"), ...many(6, "lower_taxes", "yea"),
                   ...many(5, "climate_action", "yea"), ...many(4, SPLIT_KEY, "yea")];
const DEEP_OPP  = [...many(6, UNIFORM_KEY, "nay"), ...many(6, "lower_taxes", "nay"),
                   ...many(5, "climate_action", "nay"), ...many(4, SPLIT_KEY, "nay")];
const FLOORLESS = many(4, UNIFORM_KEY, "yea");   // below the member coverage floor

const PROFILES = {
  deepA: { name: "Rep. Deep A",   office: "U.S. House", district: "TX-01", state: "TX", party: "R" },
  sameB: { name: "Rep. Same B",   office: "U.S. House", district: "TX-02", state: "TX", party: "D" },
  oppC:  { name: "Rep. Opposed C",office: "U.S. House", district: "TX-03", state: "TX", party: "D" },
  thinD: { name: "Rep. Thin D",   office: "U.S. House", district: "TX-04", state: "TX", party: "R" },
  coldE: { name: "Rep. Cold E",   office: "U.S. House", district: "TX-05", state: "TX", party: "D" },
};
const STORE = { deepA: DEEP_YEA, sameB: DEEP_SAME, oppC: DEEP_OPP, thinD: FLOORLESS };

const noopEl = () => ({
  style: {}, textContent: "", hidden: false, className: "", innerHTML: "",
  classList: { add() {}, remove() {}, contains: () => false, toggle() {} },
  setAttribute() {}, getAttribute: () => null, appendChild() {}, removeChild() {},
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
  removeEventListener() {}, focus() {}, scrollIntoView() {}, closest: () => null,
  insertAdjacentHTML() {}, remove() {},
});
function boot() {
  const ctx = {
    console,
    document: {
      readyState: "complete", head: noopEl(), body: noopEl(), documentElement: noopEl(),
      createElement: noopEl, getElementById: () => null, querySelector: () => null,
      querySelectorAll: () => [], addEventListener() {}, dispatchEvent() {},
    },
    location: { hash: "", origin: "https://politidex.fyi", pathname: "/" },
    navigator: {},
    setTimeout: (fn) => { if (typeof fn === "function") fn(); return 0; },
    clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0,
    JSON, Math, Date, Promise, encodeURIComponent, decodeURIComponent,
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  ctx.addEventListener = () => {};
  ctx.ISSUE_MAP = ctx.window.ISSUE_MAP = Object.fromEntries(
    Object.entries(LABELS).map(([k, label]) => [k, { label }]));
  ctx.ISSUE_STANCE_DATA = ctx.window.ISSUE_STANCE_DATA = {};
  ctx.PROFILES = ctx.window.PROFILES = JSON.parse(JSON.stringify(PROFILES));
  ctx.CMP_DATA = ctx.window.CMP_DATA = JSON.parse(JSON.stringify(PROFILES));
  const sandbox = vm.createContext(ctx);
  for (const f of MODULES) vm.runInContext(SRC[f], sandbox, { filename: f });
  ctx.window.PDXVotingRecord.memberRecords = (pid) => STORE[pid] || null;
  ctx.window.PDXVotingRecord.fetchMember = (pid) => Promise.resolve({ items: STORE[pid] || [] });
  ctx.window.PDXVotingRecord.noteMember = () => {};
  ctx.window.PDXVotingRecord.fetchCompare = () => Promise.resolve({});
  return ctx;
}

const A = boot();
const PC = A.window.PDXConsistency;
must(!!PC && !!PC.recordDirection, "PDXConsistency.recordDirection is not exported");
const RD = PC.recordDirection;
must(typeof RD.contrast === "function", "recordDirection.contrast is not exported");
must(typeof RD.contrastHtml === "function", "recordDirection.contrastHtml is not exported");
must(!!RD.CTR && Array.isArray(RD.CTR_ORDER), "the contrast vocabulary (CTR / CTR_ORDER) is not exported");

const ctr = (pids, key) => RD.contrast(pids, key);

// ── 1. The five states, read off real records ────────────────────────────────
{
  const align = ctr(["deepA", "sameB"], UNIFORM_KEY);
  eq(align.state, "align", "two deep records that both advance the issue read as ALIGN");
  eq(align.advances, 2, "both slots counted on the advancing side");
  eq(align.opposes, 0, "no slot counted against");
  ok(align.comparable === true, "two readable records clear the compare floor");
  ok(align.gap === false, "an aligned row is not a gap");

  const diverge = ctr(["deepA", "oppC"], UNIFORM_KEY);
  eq(diverge.state, "diverge", "one record advancing and one cutting against reads as DIVERGE");
  ok(diverge.advances > 0 && diverge.opposes > 0, "a divergence needs a slot on each side");

  const three = ctr(["deepA", "sameB", "oppC"], UNIFORM_KEY);
  eq(three.state, "diverge", "one dissenter in a lineup of three still makes the row a divergence");
  eq(three.oneWay, 3, "every readable record in that lineup picked a side");

  const thin = ctr(["deepA", "thinD"], SOLO_KEY);
  eq(thin.state, "thin", "fewer than two readable records reads as THIN, not as agreement");
  ok(thin.gap === true, "the thin state is flagged as a gap in our file");
  ok(thin.comparable === false, "a thin row never claims to be comparable");

  const none = ctr(["deepA", "sameB"], NONE_KEY);
  ok(none.state === "thin" || none.state === "cold",
     "an issue with nothing on file for anyone is thin or cold — never align");
  ok(none.state !== "align", "nothing on file must never read as records running the same way");

  const cold = ctr(["coldE"], UNIFORM_KEY);
  eq(cold.state, "cold", "a lineup whose records have not been fetched is COLD");
  eq(RD.contrastHtml(cold), "", "the cold state renders nothing at all — the same silence as the floor note");
}

// ── 2. A SPLIT RECORD IS NOT A SIDE ──────────────────────────────────────────
// deepA's gov_regulation record is 3 for and 3 against: deep enough to be counted
// and read, and it has still not picked a side. A row containing it is neither a
// clean divergence nor a match, and the only thing standing between those two
// wrong answers is that the read consults `characterised` and not `lead`.
{
  const split = RD.slot("deepA", SPLIT_KEY, { label: LABELS[SPLIT_KEY] });
  must(!!split, "the split fixture no longer produces a readable slot");
  eq(split.state, "speaks", "the split record is readable — it is not a gap");
  eq(split.counted, true, "the split record is deep enough to be counted");
  eq(split.characterised, false, "the split record has NOT been characterised as running one way");

  const withAlly = ctr(["deepA", "sameB"], SPLIT_KEY);
  eq(withAlly.state, "mixed", "a record that ran both ways makes the row MIXED, not aligned");
  eq(withAlly.bothWays, 1, "the split record is counted as having run both ways");
  eq(withAlly.advances + withAlly.opposes, 1, "only the characterised record contributed a direction");

  const withOpp = ctr(["deepA", "oppC"], SPLIT_KEY);
  ok(withOpp.state !== "diverge",
     "a split record must never be counted as a side and manufacture a divergence");
  eq(withOpp.state, "mixed", "a split against a one-way record is mixed, and says so");

  const realDiverge = ctr(["sameB", "oppC"], SPLIT_KEY);
  eq(realDiverge.state, "diverge",
     "two records that each picked a side, and picked opposite ones, is the only thing that diverges");

  // Precedence, deliberately: a real divergence between two records is a finding
  // and outranks the third record's ambivalence. What must never happen is the
  // reverse — the ambivalent record being READ as one of the two sides.
  const three = ctr(["deepA", "sameB", "oppC"], SPLIT_KEY);
  eq(three.state, "diverge",
     "two records on opposite sides still make the row a divergence, third record or not");
  eq(three.bothWays, 1, "and the both-ways record is still counted as neither side");
  eq(three.advances + three.opposes, 2, "exactly the two characterised records picked a side");
  has(RD.CTR.mixed.why.toLowerCase(), "not a clean split",
      "the mixed state explains itself as neither a split nor a match");
}

// ── 3. The read is not ordinal, and it is not a rating ───────────────────────
{
  const shape = ctr(["deepA", "oppC"], UNIFORM_KEY);
  const keys = Object.keys(shape).join(",").toLowerCase();
  ["pct", "score", "rank", "weight", "percent", "share", "rate", "grade"].forEach((w) => {
    lacks(keys, w, `the contrast read carries no ${w} field — it is a description, not a rating`);
  });
  const words = JSON.stringify(shape) + JSON.stringify(RD.CTR);
  lacks(words, "%", "no percentage appears anywhere in the contrast vocabulary");
  ["Republican", "Democrat", "GOP", "partisan", "liberal", "conservative"].forEach((w) => {
    lacks(words, w, `the contrast vocabulary uses no party framing (${w})`);
  });
  ["hypocri", "integrity", "honest", "lied", "broke their word"].forEach((w) => {
    lacks(words.toLowerCase(), w, `the contrast vocabulary passes no verdict on a person (${w})`);
  });
  RD.CTR_ORDER.forEach((k) => {
    ok(!!RD.CTR[k], `every state in CTR_ORDER has a vocabulary entry (${k})`);
  });
  has(RD.CTR.thin.why.toLowerCase(), "not agreement",
      "the thin state says out loud, in its own words, that it is not agreement");
  has(RD.CTR.thin.why.toLowerCase(), "gap",
      "the thin state names itself a gap in our file rather than a finding about anyone");
}

// ── 4. A GAP MUST NOT LOOK LIKE A TIE ────────────────────────────────────────
// The single most important rule in the pass. Solid fill means we read something;
// dashed and untinted means we did not.
{
  const thinHtml = RD.contrastHtml(ctr(["deepA", "thinD"], SOLO_KEY));
  const alignHtml = RD.contrastHtml(ctr(["deepA", "sameB"], UNIFORM_KEY));
  const divHtml = RD.contrastHtml(ctr(["deepA", "oppC"], UNIFORM_KEY));
  ok(thinHtml && alignHtml && divHtml, "all three readable states render markup");
  has(thinHtml, "is-thin", "the gap badge carries its own state class");
  has(alignHtml, "is-align", "the aligned badge carries its own state class");
  has(divHtml, "is-diverge", "the divergent badge carries its own state class");
  ok(thinHtml !== alignHtml, "the gap badge and the aligned badge are not the same markup");
  ok(!thinHtml.includes("is-align") && !alignHtml.includes("is-thin"),
     "the two states never share a class");

  const css = TEXT["consistency.js"];
  const rule = (sel) => {
    const at = css.indexOf(sel);
    must(at !== -1, `the ${sel} style rule is gone — the gap treatment cannot be checked`);
    return css.slice(at, css.indexOf("}", at));
  };
  const thinCss = rule(".pdx-rdctr.is-thin");
  const alignCss = rule(".pdx-rdctr.is-align");
  const divCss = rule(".pdx-rdctr.is-diverge");
  has(thinCss, "dashed", "the gap badge is drawn with a DASHED border — the visual grammar of absence");
  has(thinCss, "background:transparent", "the gap badge has no fill, so it cannot read as a settled outcome");
  lacks(alignCss, "dashed", "the aligned badge is solid — we read something");
  lacks(divCss, "dashed", "the divergent badge is solid — we read something");
  ok(/background:rgba/.test(alignCss) && /background:rgba/.test(divCss),
     "both findings carry a fill the gap deliberately does not");

  // …and the same rule again on the row itself, in app.css.
  const app = TEXT["app.css"];
  has(app, 'tr[data-rdstate="thin"]', "the gap state is carried onto the comparison ROW, not just the badge");
  const rowAt = app.indexOf('#cmp-table tr[data-rdstate="thin"] td.cmp-issue-label');
  must(rowAt !== -1, "the hatched treatment for a thin comparison row is gone");
  const rowCss = app.slice(rowAt, app.indexOf("}", rowAt));
  has(rowCss, "repeating-linear-gradient", "a thin row is hatched, so it cannot be mistaken for a calm tie");
  has(app, ".cmp-issue-fbtn.fb-rdthin", "the gap filter chip has its own treatment");
  const chipAt = app.indexOf(".cmp-issue-fbtn.fb-rdthin {");
  must(chipAt !== -1, "the gap filter chip rule is gone");
  has(app.slice(chipAt, app.indexOf("}", chipAt)), "dashed",
      "the gap chip is the only dashed chip in the toolbar — it is not a finding");
}

// ── 5. Focus is a store, a cap and an order — never a weight ─────────────────
{
  const src = TEXT["compare-table.js"];
  const code = CODE["compare-table.js"];
  has(src, "window.PDXCompareFocus", "the pin store is published for other comparison surfaces to share");
  const capAt = code.indexOf("_CMP_FOCUS_MAX = ");
  must(capAt !== -1, "the focus cap constant is gone");
  const cap = parseInt(code.slice(capAt + 17, capAt + 20), 10);
  ok(cap >= 3 && cap <= 6, `the focus cap is small on purpose (got ${cap})`);
  has(src, "_CMP_FOCUS_LS", "the pinned set is persisted, so it survives a reload");

  const add = fnBody("compare-table.js", "function _cmpFocusAdd(", "the pin-add path");
  has(add, "_CMP_FOCUS_MAX", "adding a pin checks the cap");
  lacks(add, "shift(", "a full focus REFUSES rather than silently evicting the reader's oldest pin");
  lacks(add, "splice(", "a full focus never drops an existing pin to make room");

  // The sort: pinned first, absolutely, and then in the reader's own pin order.
  const data = fnBody("compare-table.js", "function _cmpIssueData(", "the issue row builder");
  has(data, "a.pinned !== b.pinned", "pinned rows sort ahead of everything else");
  has(data, "a.pinAt - b.pinAt", "inside the pinned band the order is the reader's own pin order");
  ["pct", "percent", "rankScore", "* weight", "weight *"].forEach((w) => {
    lacks(data, w, `pinning never multiplies or scores anything (${w})`);
  });

  // Pinning reorders. It must not filter by default: the rest of the record has
  // to stay on screen, which is what the band-break row exists to say.
  has(src, "Everything else on the record", "the unpinned remainder is labelled, not hidden");
  const view = fnBody("compare-table.js", "function _cmpApplyIssueView(", "the row filter");
  has(view, "!pinned", "a pinned row is exempt from the overflow cap");
  has(view, "mode === 'focus'", "focusing the view is an explicit opt-in filter mode");
  has(view, "data-rdstate", "the record filters read the state stamped on the row");
  has(view, "|| ''", "a row with no stamped record state fails the record filters rather than passing them");
}

// ── 6. Counts, never a share ─────────────────────────────────────────────────
{
  const scan = fnBody("compare-table.js", "function _cmpPaintRecordScan(", "the record scan strip");
  lacks(scan, "%", "the scan strip prints counts and never a percentage");
  lacks(scan, "Math.round", "nothing in the scan strip is divided and rounded into a rate");
  lacks(scan, "toFixed", "nothing in the scan strip is formatted as a statistic");
  has(scan, "not a match", "the gap line says in its own sentence that those rows are not a match");
  ["Republican", "Democrat", "GOP", "hypocri", "integrity"].forEach((w) => {
    lacks(scan, w, `the scan strip carries no party framing or verdict (${w})`);
  });

  const paint = fnBody("compare-table.js", "function _cmpPaintRecordContrast(", "the contrast painter");
  has(paint, "RD.contrast(", "the row badge asks the shared function rather than re-deriving the state");
  has(paint, "RD.contrastHtml(", "the row badge asks the shared function for its words too");
  lacks(paint, "characterised", "the surface does not re-read the record itself");
  lacks(paint, "'Records diverge'", "the surface never writes the vocabulary — one module owns the wording");
}

// ── 7. The lineup keeps its context ──────────────────────────────────────────
{
  const src = TEXT["compare-table.js"];
  const rebuild = fnBody("compare-table.js", "function _cmpRebuild(", "the in-place rebuild");
  has(rebuild, "scrollTop", "a rebuild restores the reader's scroll position");
  has(rebuild, "_cmpKeepView", "a rebuild flags itself so the filter and expansion are not reset");
  // _buildCmpTable is the whole overlay; the ceiling is raised for this one probe.
  const build = fnBody("compare-table.js", "function _buildCmpTable(", "the table builder", 60000);
  has(build, "if (!_cmpKeepView)", "only a fresh open resets the filter and expansion");
  ["cmpAddRacePeers", "_cmpToggleTeam"].forEach((f) => {
    const at = src.indexOf(f);
    must(at !== -1, `${f} is gone — the add/remove context contract cannot be checked`);
  });
  const removeBody = fnBody("compare-table.js", "function removeCmpPid(", "the remove-a-person path");
  has(removeBody, "_cmpRebuild(", "dropping someone from the lineup keeps the reader's place");
  has(src, "window._cmpAddPick", "a person can be added from inside the open comparison");
  const pick = fnBody("compare-table.js", "window._cmpAddPick = function (", "the inline add");
  has(pick, "_cmpRebuild(", "adding someone keeps the reader's place too");
  lacks(pick, "closeCompare(", "adding a person no longer closes the board out from under the reader");
}

// ── 8. issue-compare shares the store; it does not keep a second one ─────────
{
  const src = TEXT["issue-compare.js"];
  has(src, "window.PDXCompareFocus", "the issue grid reads the same pin store as the side-by-side");
  lacks(src, "localStorage.setItem('pdx_cmp_focus'", "the issue grid does not persist its own copy of the pins");
  lacks(src, "pdx_cmp_focus", "the issue grid never touches the storage key directly");
  has(src, "'pdx-compare-focus'", "the issue grid re-renders when the pinned set changes anywhere");
  const picker = fnBody("issue-compare.js", "function pickerOptionsHtml(", "the issue picker");
  has(picker, "focusKeys()", "pinned issues lead the picker");
  lacks(picker, "compare(", "the picker order never consults the record comparison");
  lacks(picker, "comparable", "the picker order never consults readability");
  // Every sort in the two comparison surfaces stays clear of the record read.
  ["compare-table.js", "issue-compare.js"].forEach((f) => {
    (CODE[f].match(/\.sort\([^)]*\)/g) || []).forEach((m) => {
      lacks(m, "compare(", `no sort in ${f} ranks on the record comparison`);
      lacks(m, "comparable", `no sort in ${f} ranks on readability`);
    });
  });
  has(TEXT["issue-compare.css"], ".ic-pin", "the issue grid ships a pin control");
  const icPinFull = TEXT["issue-compare.css"].indexOf(".ic-pin.is-full");
  must(icPinFull !== -1, "the 'focus is full' state has no treatment");
}

// ── 9. Scoring is untouched ──────────────────────────────────────────────────
// Direction Match and the consistency score were explicitly out of scope. The
// cheapest way to keep them out of scope is to prove nothing they compute has
// ever heard of a pin.
{
  ["consistency.js", "say-vs-do.js"].forEach((f) => {
    lacks(CODE[f], "PDXCompareFocus", `${f} does not read the pinned set`);
    lacks(CODE[f], "pdx_cmp_focus", `${f} does not read the pin store`);
    lacks(CODE[f], "pinAt", `${f} has no notion of pin order`);
  });
  const contrast = fnBody("consistency.js", "function _rdContrastRead(", "the contrast read");
  has(contrast, "_rdCompareRead(", "the contrast read is a consumer of the existing compare read");
  has(contrast, "s.characterised", "only a characterised record contributes a direction");
  lacks(contrast, "directionMatch", "the contrast read never touches Direction Match");
  lacks(contrast, "consistencyScore", "the contrast read never touches the consistency score");
  // The same lineup read twice returns the same thing: no hidden state, nothing
  // that could drift between the badge and the floor note.
  const one = JSON.stringify(ctr(["deepA", "oppC"], UNIFORM_KEY));
  const two = JSON.stringify(ctr(["deepA", "oppC"], UNIFORM_KEY));
  eq(one, two, "the contrast read is pure — two calls on one lineup agree");
  const flipped = ctr(["oppC", "deepA"], UNIFORM_KEY);
  eq(flipped.state, "diverge", "the read does not depend on the order the lineup was passed in");
}

// ── 10. The mount points exist ───────────────────────────────────────────────
{
  const html = TEXT["index.html"];
  has(html, 'id="cmp-focus-rail"', "the focused-issue rail has a mount inside the comparison header");
  has(html, 'id="cmp-addpop"', "the inline add control has a mount inside the comparison header");
  const src = TEXT["compare-table.js"];
  has(src, "function _cmpRenderFocusRail(", "the rail has a renderer");
  has(src, "function _cmpRenderAddPop(", "the inline add has a renderer");
  has(src, "id=\"cmp-rdscan\"", "the record scan strip has a row in the table");
  has(src, "window._cmpJumpToIssue", "a rail chip can scroll its row into view");
}

if (failures.length) {
  console.error(`✗ compare focus + divergence: ${failures.length} failed of ${passed + failures.length}`);
  failures.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
console.log(`✔ compare focus + divergence: ${passed} checks passed`);
