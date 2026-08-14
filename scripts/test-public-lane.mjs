#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// The public lane, beside the formal result — on the row, and never in the score
// ─────────────────────────────────────────────────────────────────────────────
// A profile carries two records and they answer different questions. The FORMAL
// lane — roll-call votes in Congress, signed and vetoed instruments in the White
// House — decides an issue's result and is the only thing inside the profile's
// Direction Match. The PUBLIC lane — sourced statements, news and controversies —
// is a separate test of the same stated position: context, confirmation, tension,
// and never a number in the score.
//
// Until this pass the public lane was only reachable by opening a dossier. At the
// layer where readers actually skim — the issue index and the Stances &
// Connections rows — a record with two sourced items cutting against a stated
// position looked exactly like a record with nothing on file at all.
//
// So both surfaces now print the tally beside the formal result. What that has to
// mean, and what is pinned here:
//
//   · ONE MODEL, TWO SURFACES. Both read PDXConsistency.publicTally() over the
//     same row model, so an index row and a stance row can never report different
//     counts for the same issue, and neither can hand-count its own.
//   · COUNTS, NEVER A PERCENTAGE. No public % anywhere. The formal figure stays
//     the only number on a stance row, and the index — which has never printed a
//     number — still prints none.
//   · THE DISCLOSURE TRAVELS WITH THE TALLY. Every row says the public lane is
//     not in Direction Match, because a row can be deep-linked to on its own and
//     a paragraph at the foot of the surface is not a promise the reader will
//     ever scroll to it. The full sentence ships once per surface as well.
//   · FLAGS ARE NOT DIRECTION. A red flag is counted in its own slot and never
//     added to "cut against" — the same rule saydoScore() applies when it keeps
//     flags out of its denominator.
//   · THE EMPTY STATE IS AN ANSWER. "Nothing on file yet" is true for most issues
//     on most profiles, it is drawn as an absence rather than a finding, and its
//     tap still opens the dossier — on the coverage gap and its ＋ Suggest a lead
//     composer rather than on a column of receipts.
//   · ONE DOOR, ONE SHEET. The tally opens the SAME dossier every other entry
//     point opens; it only asks the sheet to stop on the public column. No second
//     expander, no rebuilt public face.
//   · THE WALL HOLDS. Section 6 proves it rather than asserting it: fabricated
//     public receipts are injected on an issue that already has a formal verdict,
//     the tally moves, and every formal figure — the profile's Direction Match
//     and each issue's own % — comes back byte-identical.
//
//   node scripts/test-public-lane.mjs
//
// Real modules, real bundled data, one node:vm sandbox with a fake DOM. The
// congressional lane needs a warm roll-call record, which offline means seeding
// PDXVotingRecord's cache the way a completed fetch leaves it — the votes are a
// fixture, the receipts they sit beside are the shipped ones. No network.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");

// ── Fake DOM ────────────────────────────────────────────────────────────────
// Enough for the gap sheet to mount and for the two delegated click handlers to
// be held and called: the tap into the public column is behaviour, and the only
// way to test behaviour rather than source text is to invoke it.
const byId = new Map();
const docClick = [];
const mkEl = () => {
  const cls = new Set();
  const el = {
    style: {}, textContent: "", innerHTML: "", hidden: false, className: "", id: "",
    parentNode: null, scrollTop: 0, offsetTop: 0, offsetParent: null,
    classList: {
      add: (c) => cls.add(c), remove: (c) => cls.delete(c),
      toggle: (c, on) => { if (on) cls.add(c); else cls.delete(c); },
      contains: (c) => cls.has(c),
    },
    _classes: cls, _attrs: {},
    setAttribute(k, v) { el._attrs[k] = v; }, getAttribute: (k) => (k in el._attrs ? el._attrs[k] : null),
    focus() {}, scrollIntoView() { el._scrolledIntoView = true; },
    addEventListener() {}, removeEventListener() {}, remove() {},
    appendChild(c) {
      if (c) { c.parentNode = el; if (c.id) byId.set(c.id, c); }
      return c;
    },
    removeChild(c) {
      if (c) { c.parentNode = null; if (c.id && byId.get(c.id) === c) byId.delete(c.id); }
      return c;
    },
    // The public column is written into the sheet body as an HTML STRING — there is
    // no parser here — so the one selector the focus pass uses is answered from that
    // string. Present in the markup → a node whose offset chain reaches the sheet,
    // which is exactly what the real DOM would hand back.
    querySelector(sel) {
      if (el._kids[sel]) return el._kids[sel];
      if (sel === "[data-pdxgap-public]" && /data-pdxgap-public=/.test(String(el.innerHTML))) {
        if (!el._pubNode) {
          el._pubNode = mkEl();
          el._pubNode.offsetTop = 420;
          el._pubNode.offsetParent = el._sheet || null;
        }
        return el._pubNode;
      }
      return null;
    },
    querySelectorAll: () => [],
    _kids: {},
  };
  return el;
};
const newEl = () => {
  const back = mkEl(), sheet = mkEl(), body = mkEl();
  sheet.parentNode = back;
  back._kids[".pdxgap-sheet"] = sheet;
  back._kids[".pdxgap-x"] = mkEl();
  sheet._kids[".pdxgap-body"] = body;
  body._sheet = sheet;          // so the offset walk terminates where openGap expects
  return back;
};
const ctx = {
  console, JSON, Math, Date, setTimeout, clearTimeout,
  setInterval: () => 0, clearInterval() {},
  Promise, String, Array, Object, RegExp, parseInt, parseFloat, isNaN, isFinite,
  encodeURIComponent, decodeURIComponent, Set, Map, Intl,
  requestAnimationFrame: (f) => setTimeout(f, 0), cancelAnimationFrame() {},
  requestIdleCallback: (f) => setTimeout(f, 0),
  fetch: () => new Promise(() => {}),
  location: { href: "/", pathname: "/", search: "", hash: "", origin: "https://politidex.fyi" },
  history: { replaceState() {} },
  navigator: { userAgent: "node" },
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  getComputedStyle: () => ({ getPropertyValue: () => "" }),
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
  CustomEvent: class { constructor(t, o) { this.type = t; Object.assign(this, o || {}); } },
  Image: class {},
  document: {
    readyState: "complete", head: mkEl(), body: mkEl(), documentElement: mkEl(),
    createElement: newEl, createTextNode: mkEl,
    getElementById: (id) => byId.get(id) || null,
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener: (type, fn) => { if (type === "click") docClick.push(fn); },
    removeEventListener() {},
    dispatchEvent: () => true,
  },
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
ctx.addEventListener = () => {}; ctx.removeEventListener = () => {};
ctx.dispatchEvent = () => true;
ctx.window._pdxNavJump = () => {};
ctx.window._pdxRevealTarget = () => {};
ctx.window._getPhotoUrl = () => "";

const sandbox = vm.createContext(ctx);
// The real roster and the real receipts. gaps.js is loaded because the empty
// tally's control is the app's existing coverage-gap composer, not a new one —
// with the module absent the copy degrades, and that fallback is asserted too.
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
  "pdx-learn.js",
  "gaps.js",
  "consistency.js",
  "voting-record.js",
  "word-action.js",
];
// say-vs-do.js reads window.PROFILES, which the app fills from Firestore. The
// bundled roster is the same shape, so point it there before the modules
// initialise or the receipt layer collects nothing at all.
ctx.PROFILES = ctx.CMP_DATA;
for (const f of FILES) vm.runInContext(read(f), sandbox, { filename: f });
ctx.PROFILES = ctx.CMP_DATA;

const CS = ctx.window.PDXConsistency;
const WA = ctx.window.PDXWordAction;

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (s, sub, m) => ok(String(s).includes(sub), `${m} — missing ${JSON.stringify(sub)}`);
const hasnt = (s, sub, m) => ok(!String(s).includes(sub), `${m} — should not contain ${JSON.stringify(sub)}`);
const say = (s) => console.log("  · " + s);

// ── Warm the congressional lane ─────────────────────────────────────────────
// A president's formal record is bundled and warm on load; a member's arrives from
// the Voting Record API, so offline every congressional row reads "not enough
// record yet" and the formal half of the row under test would not exist. These are
// two fabricated roll calls seeded the way a completed fetch leaves the cache, on
// issues where this member's SHIPPED public receipts already sit — so the pairing
// the surface has to draw (real tally, formal result) is real on both sides of the
// assertion even though the votes themselves are a fixture.
const MEMBER = "michael_guest";
const PREZ = "trump";
const M_ISSUE = "border_security";      // shipped receipt: 1 backing item
const seedVote = (id, issueKey, position, meaning) => ({
  kind: "vote", rollcallId: id, measureId: 900 + id, number: "H.R. " + id, date: "2025-04-0" + (id % 9 + 1),
  action: "On Passage", position: position, isProcedural: false,
  title: "Fixture measure " + id,
  source: { url: "https://www.congress.gov/roll-call-vote/" + id, label: "Congress.gov" },
  issues: [{ issueKey: issueKey, weight: 95, isPrimary: true, supportMeaning: meaning }],
});
ok(ctx.PDXVotingRecord && ctx.PDXVotingRecord._records,
  "harness: PDXVotingRecord no longer exposes its cache, so the congressional lane cannot be warmed");
ctx.PDXVotingRecord._records[MEMBER] = [
  seedVote(1, M_ISSUE, "yea", "yea_supports"),
  seedVote(2, M_ISSUE, "nay", "yea_supports"),
  seedVote(3, "gov_transparency", "yea", "yea_supports"),
];
if (typeof ctx.window.PDXDataChanged === "function") ctx.window.PDXDataChanged();

const rowsOfModel = (pid) => CS.issueRows(pid) || [];
const mRows = rowsOfModel(MEMBER);
const pRows = rowsOfModel(PREZ);
ok(mRows.length > 0, "harness: the congressional row model is empty");
ok(pRows.length > 0, "harness: the executive row model is empty");
const mTested = mRows.filter((r) => r.tested);
ok(mTested.length > 0, "harness: the seeded votes did not give the member a single tested issue,\n" +
  "    so the formal half of the row under test is not actually present");
ok(pRows.filter((r) => r.tested).length > 0, "harness: the executive lane has no tested issue");
ok(mRows.some((r) => r.public && r.public.count > 0),
  "harness: this member has no shipped public receipts, so the tally under test would be empty everywhere");
ok(pRows.some((r) => r.public && r.public.count > 0),
  "harness: the president has no shipped public receipts on any issue");

// ═════════════════════════════════════════════════════════════════════════════
// 1. One model, published, and it counts what the row model counted
// ═════════════════════════════════════════════════════════════════════════════
say("1 · one tally model, read by both surfaces");
ok(typeof CS.publicTally === "function", "model: publicTally() is not published, so the two surfaces cannot share it");
ok(typeof CS.publicCoverage === "function", "model: publicCoverage() is not published");

for (const [who, rows] of [["congressional", mRows], ["executive", pRows]]) {
  let checked = 0, empties = 0, withFlags = 0;
  for (const r of rows) {
    const p = r.public || {};
    const t = CS.publicTally(r);
    // The counts are the row model's own. Not recomputed, not re-bucketed.
    eq(t.count, p.count || 0, `model (${who}): the tally invented its own item count on ${r.key}`);
    eq(t.against, p.contradicting || 0, `model (${who}): "cut against" does not match the row model on ${r.key}`);
    eq(t.backs, p.supporting || 0, `model (${who}): "backs it up" does not match the row model on ${r.key}`);
    eq(t.flags, p.flags || 0, `model (${who}): the red-flag count does not match the row model on ${r.key}`);
    // A flag is heat, not direction. It gets its own slot and is never folded into
    // the directional pair — the rule saydoScore() already applies to its denominator.
    eq(t.directional, (p.contradicting || 0) + (p.supporting || 0),
      `model (${who}): flags were folded into the directional count on ${r.key}`);
    ok(!/%/.test(t.text), `model (${who}): the tally text prints a percentage on ${r.key}`);
    ok(!/\d+\s*%/.test(t.tag + t.note), `model (${who}): the disclosure prints a percentage on ${r.key}`);
    if (t.empty) {
      empties++;
      eq(t.text, "Nothing on file yet", `model (${who}): an empty lane says something other than the honest empty state on ${r.key}`);
    } else {
      ok(/cut against|cuts against/.test(t.text), `model (${who}): a populated tally does not report what cut against on ${r.key}`);
      ok(/back it up|backs it up/.test(t.text), `model (${who}): a populated tally does not report what backed it up on ${r.key}`);
      if (t.flags) { withFlags++; has(t.text, "red flag", `model (${who}): a red flag on file is not reported on ${r.key}`); }
    }
    checked++;
  }
  ok(checked > 0, `model (${who}): nothing was checked`);
  ok(empties > 0, `model (${who}): no row exercises the empty state, so it is untested here`);
  if (who === "executive") ok(withFlags > 0, "model (executive): no row exercises the red-flag slot");
}

// The tally is a READER. It must not touch the row it was handed — a surface that
// renders twice would otherwise report different counts the second time.
const probe = pRows.filter((r) => r.public && r.public.count > 0)[0];
ok(!!probe, "model: no populated row to test purity against");
const beforeProbe = JSON.stringify(probe.public);
CS.publicTally(probe); CS.publicTally(probe);
eq(JSON.stringify(probe.public), beforeProbe, "model: publicTally() mutated the row model it read");

// Coverage is a count over the rows it was given, with the denominator stated.
const cov = CS.publicCoverage(PREZ, pRows);
eq(cov.total, pRows.length, "coverage: the denominator is not the row set it was handed");
eq(cov.issues, pRows.filter((r) => r.public && r.public.count > 0).length,
  "coverage: the numerator does not match the rows that actually hold public items");
ok(cov.issues <= cov.total, "coverage: more issues have a public record than exist");

// A row the public record DECIDED is labelled as such and still walled out of the
// score. This is the one case where both keys on a row read "Public", and the note
// has to say why without implying the item entered Direction Match.
const decided = { pid: PREZ, key: "x", label: "X", public: { count: 2, supporting: 0, contradicting: 2, flags: 0 },
                  verdict: { basis: "public_record" } };
const dt = CS.publicTally(decided);
ok(dt.decided, "decided: a public-record verdict is not marked as one");
has(dt.note, "never counted in Direction Match", "decided: the wall is dropped on the row the public record decided");
has(dt.note, "decided this row", "decided: the note does not say the public record decided the row");
const notDecided = CS.publicTally({ pid: PREZ, key: "y", label: "Y", public: { count: 1, supporting: 1, contradicting: 0, flags: 0 },
                                    verdict: { basis: "actions" } });
ok(!notDecided.decided, "decided: a formally decided row is marked as public-decided");
has(notDecided.note, "separate test of the same stance", "wall: the standard note does not say the lane is a separate test");
has(notDecided.note, "never counted in Direction Match", "wall: the standard note does not say the lane is outside the score");

// ═════════════════════════════════════════════════════════════════════════════
// 2. The Stances & Connections row: formal % and public counts, together
// ═════════════════════════════════════════════════════════════════════════════
say("2 · stance rows — both lanes on one row");
const stanceRowsOf = (html) => String(html).split(/<div class="pdxst-row["\s]/).slice(1);
const pubLineRe = /<div class="pdxst-pub[^"]*"[\s\S]*?<\/button><\/div>/;

for (const [who, pid, rows] of [["congressional", MEMBER, mRows], ["executive", PREZ, pRows]]) {
  const html = CS.stancesSectionHtml(pid);
  ok(html && html.length > 500, `stances (${who}): the section did not render`);
  const rowHtmls = stanceRowsOf(html);
  ok(rowHtmls.length > 0, `stances (${who}): no rows rendered`);
  let seenTally = 0, seenEmpty = 0;
  rowHtmls.forEach((rowHtml, i) => {
    const m = rowHtml.match(pubLineRe);
    ok(!!m, `stances (${who}): row ${i} carries no public line at all`);
    if (!m) return;
    const line = m[0];
    // NO NUMBER IN THIS LANE. Not a percentage, and not a bare "57" either — the
    // formal figure is the only scored thing on the row and it lives above.
    ok(!/%/.test(line), `stances (${who}): the public line on row ${i} prints a percentage`);
    has(line, ">Public<", `stances (${who}): row ${i} does not name the lane`);
    has(line, "Not in Direction Match", `stances (${who}): row ${i} drops the non-score disclosure`);
    has(line, 'data-pdxst-focus="public"', `stances (${who}): row ${i} has no path into the public receipts`);
    has(line, "data-pdxst-dos=", `stances (${who}): row ${i}'s public control does not name the issue it opens`);
    if (/data-pdxst-pub="empty"/.test(line)) { seenEmpty++; has(line, "Nothing on file yet", `stances (${who}): row ${i} hides an empty lane`); }
    else seenTally++;
    // Exactly one formal figure per row, and it is outside the public line.
    const pcts = (rowHtml.match(/class="pdxst-pct"/g) || []).length;
    ok(pcts <= 1, `stances (${who}): row ${i} prints more than one percentage`);
    ok(!/class="pdxst-pct"/.test(line), `stances (${who}): the public line on row ${i} carries the formal percentage`);
  });
  ok(seenEmpty > 0, `stances (${who}): no row shows the empty public state`);
  if (who === "executive") ok(seenTally > 0, `stances (${who}): no row shows a populated public tally`);
  // The lane key on the result line, so a row the public record decided is not
  // presented as a formal finding.
  has(html, 'class="pdxst-lane"', `stances (${who}): the result line does not name which lane decided it`);
  // The full sentence, once per surface, with the coverage count.
  eq((html.match(/class="pdxst-wall"/g) || []).length, 1,
    `stances (${who}): the surface-level public-lane note is missing or duplicated`);
  const wall = (html.match(/<div class="pdxst-wall">[\s\S]*?<\/div>/) || [""])[0];
  has(wall, "separate test of the same stance", `stances (${who}): the note does not say the lane is a separate test`);
  has(wall, "never counted in Direction Match", `stances (${who}): the note does not say the lane is outside the score`);
  has(wall, "only scored figure", `stances (${who}): the note does not say which figure IS the scored one`);
  ok(!/\d+%/.test(wall), `stances (${who}): the public-lane note prints a percentage of its own`);
  const pc = CS.publicCoverage(pid);
  has(wall, "Public · " + pc.issues + " of " + pc.total,
    `stances (${who}): the note's coverage count does not match the model's`);
  // The existing 🧾 receipts link into the Evidence drawer is a different door and
  // is not replaced by this one.
  if (rows.some((r) => r.evidence && r.evidence.public > 0)) {
    has(html, "pdxsec-evidence", `stances (${who}): the existing public-receipts link into the evidence drawer was dropped`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. The issue index row: the tally beside the bucket, still no number
// ═════════════════════════════════════════════════════════════════════════════
say("3 · index rows — the tally beside the formal result");
// The index block only, bounded at both ends: the panels around it carry the
// score's own percentage, and an unbounded slice would hand every "no number here"
// assertion below a string containing the profile's Direction Match.
const ocOf = (html) => {
  const s = String(html);
  const i = s.indexOf('<div class="pdxwa-oc"');
  if (i === -1) return "";
  const f = s.indexOf('class="pdxwa-oc-pubfoot"', i);
  if (f === -1) return "";
  const e = s.indexOf("</div>", s.indexOf("</p>", f));
  return s.slice(i, e === -1 ? s.length : e + 6);
};

for (const [who, pid] of [["congressional", MEMBER], ["executive", PREZ]]) {
  const idx = ocOf(WA.headlineHtml(pid, ctx.PROFILES[pid]));
  ok(idx.length > 0, `index (${who}): the index did not render`);
  const rowCount = (idx.match(/<button type="button" class="pdxwa-oc-row/g) || []).length;
  const pubCount = (idx.match(/class="pdxwa-oc-pub[ "]/g) || []).length;
  ok(rowCount > 0, `index (${who}): no rows rendered`);
  eq(pubCount, rowCount, `index (${who}): the public tally does not appear on every row`);
  // NO SECOND SCOREBOARD — and the public lane did not become one either.
  eq((idx.replace(/<[^>]+>/g, " ").match(/%/g) || []).length, 0,
    `index (${who}): the index prints a percentage — there is exactly one score on a profile`);
  // A <button> inside a <button> is invalid markup browsers repair unpredictably.
  // The tally is a SIBLING in the same <li>, which is also what keeps the row's own
  // handler and its origin-id contract untouched.
  const rowInner = idx.match(/<button type="button" class="pdxwa-oc-row[\s\S]*?<\/button>/g) || [];
  ok(rowInner.length === rowCount, `index (${who}): the row buttons do not close where expected`);
  ok(!rowInner.some((b) => /pdxwa-oc-pub/.test(b)),
    `index (${who}): the public tally is nested inside the row button`);
  eq((idx.match(/data-pdxwa-dos="/g) || []).length, rowCount,
    `index (${who}): the public control reuses the row's own tap attributes`);
  eq((idx.match(/data-pdxwa-pub="/g) || []).length, rowCount,
    `index (${who}): the public control does not name the issue it opens`);
  eq((idx.match(/data-pdxwa-pub-origin="pdxwa-oc-/g) || []).length, rowCount,
    `index (${who}): the public control does not carry its row's id, so closing the dossier\n` +
    `    cannot return the reader to the line they left`);
  has(idx, "Not in Direction Match", `index (${who}): the index rows drop the non-score disclosure`);
  const tags = (idx.match(/Not in Direction Match/g) || []).length;
  eq(tags, rowCount, `index (${who}): the disclosure is not on every row`);
  has(idx, ">Public<", `index (${who}): the rows do not name the lane`);
  // The bucket cue is the formal verdict's word and the tally is not inside it.
  const cues = idx.match(/<span class="pdxwa-oc-cue"[\s\S]*?<\/span>/g) || [];
  ok(cues.length > 0, `index (${who}): the formal result cue is gone from the rows`);
  ok(!cues.some((c) => /Public|cut against|Nothing on file/.test(c)),
    `index (${who}): the public tally leaked into the formal result cue`);
  // The coverage count, once, in words, under the denominator it shares.
  eq((idx.match(/class="pdxwa-oc-pubfoot"/g) || []).length, 1,
    `index (${who}): the profile-level public note is missing or duplicated`);
  const foot = (idx.match(/<p class="pdxwa-oc-pubfoot">[\s\S]*?<\/p>/) || [""])[0];
  has(foot, "Public record on file for", `index (${who}): the note does not state the public lane's coverage`);
  has(foot, "a count, not a score", `index (${who}): the note does not say the count is not a score`);
  has(foot, "none of it is inside the Direction Match", `index (${who}): the note does not name what it is outside of`);
  ok(!/\d+%/.test(foot), `index (${who}): the coverage note prints a percentage`);
  // Its denominator is the index's own row count, not a second one.
  has(foot, " of " + rowCount + " issue", `index (${who}): the note's denominator is not the index's own`);
  // The row still says what it always said.
  has(idx, 'class="pdxwa-oc-issue"', `index (${who}): the issue name left the row`);
  has(idx, 'class="pdxwa-oc-foot"', `index (${who}): the index's own denominator line was dropped`);
}

// Empty and populated are drawn differently, and both are on the same index.
const prezIdx = ocOf(WA.headlineHtml(PREZ, ctx.PROFILES[PREZ]));
ok((prezIdx.match(/data-pdxwa-pub-state="empty"/g) || []).length > 0,
  "index: no row shows the empty public state");
ok((prezIdx.match(/data-pdxwa-pub-state="tally"/g) || []).length > 0,
  "index: no row shows a populated public tally");
has(prezIdx, "pdxwa-oc-pub-0", "index: the empty state is not drawn any quieter than a populated tally");
// And the counts on the row are the model's, for a named issue.
const named = pRows.filter((r) => r.public && r.public.count > 0 && r.tested)[0];
ok(!!named, "index: no tested row with public items to check the printed counts against");
if (named) {
  const t = CS.publicTally(named);
  const seg = prezIdx.slice(prezIdx.indexOf('data-pdxwa-pub="' + named.key + '"'));
  has(seg.slice(0, 700), t.text, "index: the printed tally does not match the model's own words");
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. The empty state is honest, and it is a door
// ═════════════════════════════════════════════════════════════════════════════
say("4 · the empty state — named, quiet, and actionable");
const emptyRow = pRows.filter((r) => !r.public || !r.public.count)[0];
ok(!!emptyRow, "empty: no row without public items to test");
const et = CS.publicTally(emptyRow);
eq(et.text, "Nothing on file yet", "empty: the empty lane does not say so plainly");
eq(et.count, 0, "empty: an empty lane reports items");
ok(et.empty, "empty: the empty lane is not marked as empty");
// With the coverage-gap module present the control is the app's existing lead
// composer — the one door this product already has for "we have not documented
// this yet" — not a new one invented for this row.
eq(et.cta, "＋ Suggest a lead", "empty: the empty state offers no lead path while PDXGaps is loaded");
has(et.tag, "Not in Direction Match", "empty: an empty lane drops the disclosure");
// Fail closed: no gaps module, no invented composer — the tap still opens the
// dossier, it just does not promise a form that is not there.
const savedGaps = ctx.window.PDXGaps;
ctx.window.PDXGaps = undefined;
eq(CS.publicTally(emptyRow).cta, "🧾 The public side",
  "empty: with no coverage-gap module the row still advertises a lead composer it cannot open");
ctx.window.PDXGaps = savedGaps;
// A populated lane's control names the receipts instead.
eq(CS.publicTally(named).cta, "🧾 Public receipts", "empty: a populated lane does not offer its receipts");

// The dossier's own empty branch is what the tap lands on, and it is the shipped
// coverage gap with its composer — reused, not rebuilt.
const emptySheet = CS.gapViewHtml(PREZ, emptyRow.key);
has(emptySheet, 'data-pdxgap-public="empty"', "empty: the dossier's empty public branch carries no landing hook");
has(emptySheet, "nothing on file for this issue yet", "empty: the dossier stops naming the absence");
has(emptySheet, "not a verdict", "empty: the dossier stops saying an absence of coverage is not a finding");

// ═════════════════════════════════════════════════════════════════════════════
// 5. One door, one sheet — the tap lands on the public column
// ═════════════════════════════════════════════════════════════════════════════
say("5 · the tap lands on the public column, in the same sheet");
const withPub = pRows.filter((r) => r.public && r.public.count > 0)[0];
const fullSheet = CS.gapViewHtml(PREZ, withPub.key);
eq((fullSheet.match(/data-pdxgap-public=/g) || []).length, 1,
  "landing: the dossier carries no single public-column hook, or carries more than one");
has(fullSheet, 'data-pdxgap-public="tally"', "landing: a dossier WITH receipts does not mark its public column");
// The wall the dossier already printed is still there — this pass adds a hook, it
// does not renegotiate the boundary.
has(fullSheet, "never merged into the formal figure", "landing: the dossier's own separation note was dropped");

// Behaviour. The handlers are delegated on the document, so they are held and
// called with a synthetic event — source text cannot prove where a sheet stops.
ok(docClick.length > 0, "landing: no delegated click handler was registered");
const fire = (attrs, selectors) => {
  const target = {
    closest: (sel) => (selectors.indexOf(sel) === -1 ? null : { getAttribute: (k) => (k in attrs ? attrs[k] : null) }),
  };
  const e = { target: target, preventDefault() { e._d = true; }, key: "" };
  docClick.forEach((fn) => { try { fn(e); } catch (err) { failures.push("landing: a click handler threw — " + err.message); } });
  return e;
};
const sheetState = () => {
  const back = byId.get("pdxc-gap-back");
  const sheet = back && back._kids[".pdxgap-sheet"];
  const body = sheet && sheet._kids[".pdxgap-body"];
  return { back, sheet, body };
};

// The plain row tap: the sheet opens at the top, as it always has.
fire({ "data-pdxwa-dos": withPub.key, "data-pdxwa-dos-pid": PREZ, "data-pdxwa-dos-origin": "pdxwa-oc-x" },
  ["[data-pdxwa-dos]"]);
let st = sheetState();
ok(st.sheet, "landing: the row tap did not mount a sheet");
eq(st.sheet.scrollTop, 0, "landing: a plain row tap scrolled the sheet away from the top");
ok(!(st.body._pubNode && st.body._pubNode._classes.has("pdxgap-lit")),
  "landing: a plain row tap lit the public column, which is not what it asked for");

// The tally tap: same sheet, stopped on the public column, and marked.
st.body._pubNode = null;
fire({ "data-pdxwa-pub": withPub.key, "data-pdxwa-pub-pid": PREZ, "data-pdxwa-pub-origin": "pdxwa-oc-x" },
  ["[data-pdxwa-pub]"]);
st = sheetState();
has(st.body.innerHTML, "data-pdxgap-public", "landing: the tally tap did not fill the sheet with a dossier");
ok(st.sheet.scrollTop > 0, "landing: the tally tap opened the sheet at the top rather than on the public column");
ok(st.body._pubNode && st.body._pubNode._classes.has("pdxgap-lit"),
  "landing: the public column is not marked on arrival, so the sheet appears to have opened mid-scroll for no reason");

// The stance row's own public control takes the same path, through the same option.
const stRowId = "pdxst-row-" + PREZ + "-" + withPub.key;
st.sheet.scrollTop = 0; st.body._pubNode = null;
fire({ "data-pdxst-dos": withPub.key, "data-pdxst-pid": PREZ, "data-pdxst-origin": stRowId, "data-pdxst-focus": "public" },
  ["[data-pdxst-dos]"]);
st = sheetState();
ok(st.sheet.scrollTop > 0, "landing: the stance row's public control does not land on the public column");
ok(st.body._pubNode && st.body._pubNode._classes.has("pdxgap-lit"),
  "landing: the stance row's public control does not mark the column it landed on");

// And openGap still refuses to consume a tap it cannot honour.
eq(CS.openGap("", "", { focus: "public" }), false, "landing: openGap claims success for an empty target");

// ═════════════════════════════════════════════════════════════════════════════
// 6. The wall, proved: public items never move a formal number
// ═════════════════════════════════════════════════════════════════════════════
say("6 · the score path, untouched — proved by injection");
// Not asserted, measured. Every formal figure on the president's profile is
// snapshotted; fabricated public receipts are then injected on an issue that
// already has a formal verdict — one cutting against, one backing it up, one legal
// red flag, which is every slot the tally can print; the caches are busted the way
// a real data merge busts them; and the formal figures are read again.
//
// The receipts are filed under a SEPARATE ACCT_SPOTLIGHT key that normalises to the
// same politician. That is what makes the injection visible at all: collect()'s
// cache key counts top-level keys, so appending to an existing array would be
// silently cached, and a test that cannot see its own fixture proves nothing.
const TARGET = pRows.filter((r) => r.tested && r.verdict.basis !== "public_record")[0];
ok(!!TARGET, "wall: no formally decided issue to inject against");
const snap = () => {
  const read = WA.read(PREZ, ctx.PROFILES[PREZ]) || {};
  const rows = rowsOfModel(PREZ);
  return {
    pct: read.pct, verdict: read.verdict || "", scorable: read.scorable, word: read.word,
    rows: rows.filter((r) => r.verdict.basis !== "public_record")
      .map((r) => r.key + "=" + r.verdict.token + ":" + r.verdict.score + ":" + r.evidence.actions).join("|"),
  };
};
const before = snap();
ok(typeof before.pct === "number", "wall: the profile has no Direction Match to hold constant");
const FAKE = "TRUMP";           // normalises to the same pid; a new key busts the receipt cache
const fake = (headline, impact, category) => ({
  headline: headline, impact: impact, category: category, issueKey: TARGET.key,
  date: "2025-06-01", why: "public-lane test fixture",
  source: { url: "https://example.test/public-lane-fixture", label: "Fixture" },
});
ctx.window.ACCT_SPOTLIGHT[FAKE] = [
  // 'rhetoric' rather than 'policy' for the item that cuts against: verdictOf() only
  // reads a negative item as a contradiction when it can see a stated position or the
  // item is explicitly a rhetoric-vs-reality one, and this fixture's pid is a spelling
  // of the president rather than a roster entry with stances of its own.
  fake("Fixture item that cuts against the stated position", "negative", "rhetoric"),
  fake("Fixture item that backs up the stated position", "positive", "policy"),
  fake("Fixture legal matter on the same issue", "negative", "legal"),
];
ctx.window.PDXDataChanged();
// The receipt layer memoises its cache key for one microtask — a real merge always
// arrives off a promise, so the key is always re-read before the next paint. This
// test is synchronous, so it hands the queue back once to get the same guarantee.
await Promise.resolve();
const after = snap();
const movedRow = rowsOfModel(PREZ).filter((r) => r.key === TARGET.key)[0];
const movedTally = CS.publicTally(movedRow);
// The fixture landed — otherwise the equality below is a tautology.
ok(movedTally.count >= 3, `wall: the injected public items never reached the public lane (count ${movedTally.count})`);
ok(movedTally.against >= 1 && movedTally.backs >= 1 && movedTally.flags >= 1,
  "wall: the injected items did not populate all three tally slots");
// …and not one formal number moved.
eq(after.pct, before.pct, "wall: injecting PUBLIC items moved the profile's Direction Match");
eq(after.verdict, before.verdict, "wall: injecting public items changed the profile's formal verdict word");
eq(after.scorable, before.scorable, "wall: injecting public items changed how many issues the score could test");
eq(after.word, before.word, "wall: injecting public items changed the stated-position denominator");
eq(after.rows, before.rows, "wall: injecting public items moved a formally decided issue's result or evidence count");
// Nor did the surfaces start printing one.
const dirtyIdx = ocOf(WA.headlineHtml(PREZ, ctx.PROFILES[PREZ]));
eq((dirtyIdx.replace(/<[^>]+>/g, " ").match(/%/g) || []).length, 0,
  "wall: with public items on file the index started printing a percentage");
const dirtyStances = CS.stancesSectionHtml(PREZ);
const dirtyLine = (dirtyStances.slice(dirtyStances.indexOf('data-pdxst-dos="' + TARGET.key + '"')).match(pubLineRe) || [""])[0];
ok(!/%/.test(dirtyLine), "wall: a populated public lane printed a percentage on the stance row");
// Put the data back and confirm the read is reversible — a fixture that leaks would
// make every later assertion in the suite describe a roster we do not ship.
delete ctx.window.ACCT_SPOTLIGHT[FAKE];
ctx.window.PDXDataChanged();
await Promise.resolve();
const restored = snap();
eq(restored.pct, before.pct, "wall: the profile's Direction Match did not survive removing the fixture");
eq(restored.rows, before.rows, "wall: the row results did not survive removing the fixture");
eq(CS.publicTally(rowsOfModel(PREZ).filter((r) => r.key === TARGET.key)[0]).count,
  CS.publicTally(TARGET).count, "wall: the public tally did not return to its shipped count");

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ public lane: ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}\n`));
  process.exit(1);
}
console.log(`✓ public lane: all ${passed} assertions passed — two lanes on the row, one score, ` +
  `one door into the receipts`);
