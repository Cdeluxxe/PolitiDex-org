#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// test-header-tally.mjs — the glance tally beside Direction Match
// ───────────────────────────────────────────────────────────────────────────
// The ring in the letterhead prints one average. 82% over four backed-up issues
// and 82% over two contradictions and two thin rows are the same figure and not
// remotely the same finding, so the four integers that average came out of sit
// directly under it — and each one is a door into that bucket's list, not a
// decoration.
//
// That makes it three things at once, and this file pins all three:
//
//   · A SUMMARY THAT CANNOT DISAGREE WITH THE SECTION. The header copy, the
//     in-card copy and the shape graph are one builder over one memoised
//     bucketing, so their counts are the same integers by construction rather
//     than by review. Driven here on a real profile, not asserted off source.
//   · A NAVIGATOR THAT LANDS SOMEWHERE. The list it opens now sits behind a
//     closed, deferred lid inside ⚖️ Word vs Action, so a tap from up here has
//     to mount the body, open the fold, select the bucket and scroll — in that
//     order, through the page's own chrome-aware jump so the reader does not
//     land under the sticky rail.
//   · NOT A SECOND SCORE. Counts only, no percentage, formal buckets only, and
//     the public line under it is counts-only too and says so on its face.
//
// And it stays honest about what it does not know: below the two-issue floor it
// renders an empty host rather than four grey zeroes, which read as findings
// ("nothing contradicted!") on a profile the engine has not tested.
//
//   node scripts/test-header-tally.mjs
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m}\n    expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (s, sub, m) => ok(String(s).includes(sub), `${m}\n    missing ${JSON.stringify(sub)}`);
const hasnt = (s, sub, m) => ok(!String(s).includes(sub), `${m}\n    found ${JSON.stringify(sub)}`);
const must = (c, m) => {
  if (c) { passed++; return; }
  console.error(`\n  ✗ STALE HARNESS — ${m}\n`);
  process.exit(1);
};

// ── Fake DOM ────────────────────────────────────────────────────────────────
const byId = new Map();
const docClick = [];
const warmFns = [];
const TRACE = [];
const mkEl = (tag) => {
  const cls = new Set();
  const el = {
    tagName: (tag || "div").toUpperCase(),
    style: {}, textContent: "", innerHTML: "", className: "", id: "",
    parentNode: null, children: [],
    classList: {
      add: (c) => cls.add(c), remove: (c) => cls.delete(c),
      toggle: (c, on) => { if (on === undefined) { if (cls.has(c)) cls.delete(c); else cls.add(c); } else if (on) cls.add(c); else cls.delete(c); },
      contains: (c) => cls.has(c),
    },
    _classes: cls, _attrs: {}, _sel: new Set(),
    setAttribute(k, v) { el._attrs[k] = String(v); }, getAttribute: (k) => (k in el._attrs ? el._attrs[k] : null),
    removeAttribute(k) { delete el._attrs[k]; }, hasAttribute: (k) => k in el._attrs,
    focus() {}, click() {}, remove() {},
    scrollIntoView() { TRACE.push("scrollIntoView:" + (el.id || el.className)); },
    getBoundingClientRect: () => ({ top: 0, bottom: 0, height: 0 }),
    addEventListener() {}, removeEventListener() {},
    appendChild(c) { if (c) { c.parentNode = el; el.children.push(c); if (c.id) byId.set(c.id, c); } return c; },
    removeChild(c) { if (c) { c.parentNode = null; if (c.id && byId.get(c.id) === c) byId.delete(c.id); } return c; },
    closest(sel) { let n = el; while (n) { if (n._sel.has(sel)) return n; n = n.parentNode; } return null; },
    matches: (sel) => el._sel.has(sel),
    querySelector: (sel) => el._kids[sel] || null,
    querySelectorAll: (sel) => el._kidsAll[sel] || [],
    _kids: {}, _kidsAll: {},
  };
  return el;
};
const ctx = {
  console, JSON, Math, Date,
  setTimeout: (f) => { try { f(); } catch (e) {} return 0; }, clearTimeout() {},
  setInterval: () => 0, clearInterval() {},
  Promise, String, Array, Object, RegExp, Number, Boolean, Error,
  parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
  requestAnimationFrame: (f) => { try { f(); } catch (e) {} return 0; }, cancelAnimationFrame() {},
  requestIdleCallback: (f) => { try { f(); } catch (e) {} return 0; },
  fetch: () => new Promise(() => {}),
  location: { href: "/", search: "", hash: "", pathname: "/" }, history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  getComputedStyle: () => ({ getPropertyValue: () => "" }),
  navigator: { userAgent: "node" },
  document: {
    readyState: "complete", head: mkEl(), body: mkEl(), documentElement: mkEl(),
    createElement: mkEl, createTextNode: () => mkEl("span"),
    getElementById: (id) => byId.get(id) || null,
    querySelector: (sel) => ctx.document._q[sel] || null,
    querySelectorAll: (sel) => ctx.document._qa[sel] || [],
    _q: {}, _qa: {},
    addEventListener: (type, fn) => { if (type === "click") docClick.push(fn); },
    removeEventListener() {},
  },
  CustomEvent: class { constructor(t, o) { this.type = t; Object.assign(this, o || {}); } },
  IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
ctx.addEventListener = (type, fn) => { if (type === "pdx-consistency-warm") warmFns.push(fn); };
ctx.removeEventListener = (type, fn) => {
  const i = type === "pdx-consistency-warm" ? warmFns.indexOf(fn) : -1;
  if (i !== -1) warmFns.splice(i, 1);
};
// A handler whose host is gone removes itself mid-dispatch, so fire over a copy.
const warm = (pid) => { for (const fn of warmFns.slice()) { try { fn({ detail: { pid } }); } catch (e) {} } };
ctx.dispatchEvent = () => true;
ctx.window._pdxRevealTarget = (elId) => { TRACE.push("revealTarget:" + elId); };

const CORE = { lower_taxes: "#7fd4c1", border_security: "#e2a06a" };
ctx.window.PDXIssueColors = {
  isCore: (k) => !!CORE[k],
  getIssueColor: (k) => ({ mapped: !!CORE[k], color: CORE[k] || "#9fb4d4" }),
  styleFor: (k) => (CORE[k] ? `--pdx-ic:${CORE[k]};` : ""),
};

// ── Roster ──────────────────────────────────────────────────────────────────
const PID = "rep_head", QUIET = "rep_quiet", THIN = "rep_bare";
ctx.ISSUE_MAP = {
  lower_taxes: { label: "Lower Taxes" }, healthcare: { label: "Health Care" },
  border_security: { label: "Border Security" }, guns: { label: "Gun Rights" },
};
const stances = ["lower_taxes", "healthcare", "border_security", "guns"]
  .map((k) => ({ issueKey: k, issueStance: "support" }));
ctx.ISSUE_STANCE_DATA = { [PID]: stances, [QUIET]: stances, [THIN]: [] };
ctx.PROFILES = {
  [PID]: { name: "Marta Solano", office: "U.S. Representative", district: "ID-02", state: "Idaho", party: "R" },
  [QUIET]: { name: "Ada Renner", office: "U.S. Representative", district: "ID-03", state: "Idaho", party: "R" },
  [THIN]: { name: "Nobody Yet", office: "U.S. Representative", district: "ID-01", state: "Idaho", party: "D" },
};
ctx.CMP_DATA = { [PID]: {}, [QUIET]: {}, [THIN]: {} };
// The public lane's real source. Curated receipts, not a stubbed row shape: the
// header's line has to come out the far end of the same walk every row prints,
// or the two surfaces are counting different feeds.
const receipt = (key, pid, kind, i) => ({
  id: pid + "-" + key + "-" + i, pid, issueKey: key, category: "statement",
  title: "On the record " + i, date: "2025-05-0" + (i + 1),
  verdict: { key: kind, label: kind },
});
ctx.window.PDXReceipts = {
  collect: () => [
    receipt("lower_taxes", PID, "contradicts", 1), receipt("lower_taxes", PID, "contradicts", 2),
    receipt("lower_taxes", PID, "contradicts", 3), receipt("lower_taxes", PID, "consistent", 4),
    receipt("lower_taxes", PID, "consistent", 5), receipt("lower_taxes", PID, "flag", 6),
  ],
};
ctx.window._getPhotoUrl = () => "";

const sandbox = vm.createContext(ctx);
for (const file of ["stance-helpers.js", "voting-record.js", "exec-record.js", "pdx-learn.js",
                    "consistency.js", "word-action.js"]) {
  vm.runInContext(read(file), sandbox, { filename: file });
}
const C = ctx.window.PDXConsistency;
const WA = ctx.window.PDXWordAction;
must(WA && typeof WA.headerTallyMount === "function",
  "PDXWordAction.headerTallyMount is gone — the profile builder has nothing to mount in the letterhead");
must(typeof WA.headerTallyHtml === "function", "PDXWordAction.headerTallyHtml is gone");
must(typeof C.publicShape === "function",
  "PDXConsistency.publicShape is gone — the header's public line has no owner for its arithmetic");

const SRC = { url: "https://www.congress.gov/roll-call-vote/11", label: "Congress.gov" };
ctx.PDXVotingRecord._records[PID] = [
  { kind: "vote", rollcallId: 11, measureId: 101, number: "H.R. 1", date: "2025-07-03",
    action: "On Passage", position: "yea", isProcedural: false, title: "Tax Act", source: SRC,
    issues: [{ issueKey: "lower_taxes", weight: 100, isPrimary: true, supportMeaning: "yea_supports" }] },
  { kind: "vote", rollcallId: 9, measureId: 109, number: "H.R. 9", date: "2025-03-11",
    action: "On Passage", position: "nay", isProcedural: false, title: "Border Act", source: SRC,
    issues: [{ issueKey: "border_security", weight: 90, isPrimary: true, supportMeaning: "yea_supports" }] },
  { kind: "vote", rollcallId: 7, measureId: 117, number: "H.R. 17", date: "2025-02-04",
    action: "On Passage", position: "yea", isProcedural: false, title: "Coverage Act", source: SRC,
    issues: [{ issueKey: "healthcare", weight: 95, isPrimary: true, supportMeaning: "yea_supports" }] },
];
ctx.PDXVotingRecord._records[THIN] = [];

// The row model, stubbed, so all four buckets exist at once on one profile —
// which no single real seed produces and which is exactly the case the four
// counts are for. `pub` is the shipped per-row public shape, not an invention.
const stubRow = (key, label, token, pub) => ({
  pid: PID, key, label, tier: 1, category: "econ", categoryLabel: "Economy",
  stance: { key, label: "Said a thing", direction: "support", text: "said a thing", source: "" },
  lane: "record", tested: true, scored: true, testability: "high",
  actions: { count: 2, lane: "record", judged: 2 },
  verdict: { token, label: token, cls: "x", ico: "•", color: "#fff", score: null, basis: "action" },
  public: pub || { token: "no_record", count: 0, supporting: 0, contradicting: 0, flags: 0, judged: false },
  evidence: { count: 2, actions: 2, public: 0, total: 2, strength: "documented", sources: [] },
  setAside: null, weights: {}, ov: {},
});
const PUB = { token: "mixed", count: 5, supporting: 2, contradicting: 3, flags: 1, judged: true };
const ROWS = [
  stubRow("lower_taxes", "Lower Taxes", "contradicts", PUB),
  stubRow("healthcare", "Health Care", "mixed"),
  stubRow("border_security", "Border Security", "consistent"),
  stubRow("guns", "Gun Rights", "limited"),
];
const realRows = C.issueRows, realRank = C.rankIssueRows;
const withRows = (rows, fn) => {
  C.issueRows = (p) => (p === PID || p === QUIET ? rows : []);
  C.rankIssueRows = (rs) => rs;
  try { return fn(); } finally { C.issueRows = realRows; C.rankIssueRows = realRank; }
};

const HTALLY = withRows(ROWS, () => WA.headerTallyHtml(PID));
const HMOUNT = withRows(ROWS, () => WA.headerTallyMount(PID));
const SECTION = withRows(ROWS, () => WA.headlineHtml(PID, ctx.PROFILES[PID]));
must(HTALLY && HTALLY.length > 200, "the header tally rendered nothing on a four-bucket profile");

// ═════════════════════════════════════════════════════════════════════════════
// 1. It mounts, and the mount survives a cold record
// ═════════════════════════════════════════════════════════════════════════════
has(HMOUNT, 'class="pdxwa-htally-host"', "mount: no host element for the warm repaint to land in");
has(HMOUNT, "data-pdxwa-htally=", "mount: the host is not addressable, so the warm repaint cannot find it");
has(HMOUNT, 'class="pdxwa-tally pdxwa-htally"', "mount: the host does not carry the tally it exists for");
// Below the two-issue floor the host is emitted EMPTY rather than skipped: the
// header is built from the synchronous word ledger while the roll-call record is
// still in flight, and a mount that returned '' would leave nothing in the DOM
// for the warm repaint to grow into.
const COLD = WA.headerTallyMount(THIN);
has(COLD, 'class="pdxwa-htally-host"', "floor: no host at all on a profile with nothing on file — the warm\n" +
  "    repaint has nowhere to land, so a record that arrives a moment later never reaches the header");
ok(/data-pdxwa-htally="[^"]+"><\/div>$/.test(COLD.trim()),
  `floor: the host is not empty below the floor — four grey zeroes under a letterhead read as findings\n    (${JSON.stringify(COLD)})`);
eq(WA.headerTallyHtml(THIN), "", "floor: a profile below the two-issue floor still renders a tally");
for (const word of ["Contradicted", "Mixed", "Backed up", "Thin record", "pdxwa-tally-b"]) {
  hasnt(COLD, word, `floor: the empty host still carries "${word}" — that is a shape the engine has not measured`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. Four controls, four buckets, zeros printed
// ═════════════════════════════════════════════════════════════════════════════
eq((HTALLY.match(/data-pdxwa-seg="/g) || []).length, 4,
  "controls: the header does not offer exactly four buckets");
eq((HTALLY.match(/<button /g) || []).length, 4,
  "controls: a count is not a button — the tally is a navigator, and a caption that looks like one is worse\n" +
  "    than a caption that does not");
for (const [tok, short] of [["contradicts", "Contradicted"], ["mixed", "Mixed"],
                            ["consistent", "Backed up"], ["limited", "Thin record"]]) {
  has(HTALLY, `data-pdxwa-seg="${tok}"`, `controls: the "${short}" bucket has no control in the header`);
  has(HTALLY, `>${short}<`, `controls: the header does not use the index's own word for "${tok}" — two vocabularies\n` +
    `    for one bucket is how a header and the list it opens stop being about the same thing`);
}
// The fourth bucket keeps the shipped thin-record honesty label. "Thin = they
// dodged" is a reading this engine has refused everywhere else and the letterhead
// is the last place it should reappear.
hasnt(HTALLY, "dodged", "controls: the thin bucket is editorialised in the letterhead");
hasnt(HTALLY, "Avoided", "controls: the thin bucket is editorialised in the letterhead");
// Zero is printed, not dropped: "nothing contradicted" is a finding.
const ZEROS = withRows([ROWS[2], stubRow("healthcare", "Health Care", "consistent")],
  () => WA.headerTallyHtml(PID));
eq((ZEROS.match(/data-pdxwa-seg="/g) || []).length, 4,
  "controls: an empty bucket is dropped from the header — a reader cannot tell 0 contradicted from\n" +
  "    a bucket the engine does not have");
has(ZEROS, '<span class="pdxwa-tally-n">0</span>', "controls: an empty bucket prints no zero");
has(ZEROS, "pdxwa-tally-i is-zero", "controls: an empty bucket is not drawn quieter than a populated one");

// ═════════════════════════════════════════════════════════════════════════════
// 3. One headline figure — the tally carries no percentage
// ═════════════════════════════════════════════════════════════════════════════
hasnt(HTALLY, "%", "one figure: the header tally prints a percentage — Direction Match is the only percentage\n" +
  "    in the header, and a second one beside it is a second score whatever it is labelled");
hasnt(HTALLY, "pdxwa-num", "one figure: the tally carries the ring's own figure chrome");
for (const w of ["with party", "against party", "party unity", "loyalty"]) {
  hasnt(HTALLY.toLowerCase(), w, `one figure: the header tally prints a party-loyalty metric ("${w}")`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. The header's counts ARE the section's counts
// ═════════════════════════════════════════════════════════════════════════════
// One builder over one memoised bucketing, so this is true by construction — but
// it is the whole claim of putting numbers in two places, so it is measured.
const countsOf = (html) => {
  const out = {};
  const re = /data-pdxwa-seg="([a-z]+)"[\s\S]{0,900}?pdxwa-tally-n">(\d+)</g;
  let m;
  while ((m = re.exec(html))) if (!(m[1] in out)) out[m[1]] = Number(m[2]);
  return out;
};
const headCounts = countsOf(HTALLY);
const cardCounts = countsOf(SECTION);
eq(Object.keys(headCounts).length, 4, "parity: the header's four counts could not be read back");
eq(JSON.stringify(headCounts), JSON.stringify(cardCounts),
  "parity: the letterhead tally and the in-card tally print different integers for the same profile");
eq(JSON.stringify(headCounts), JSON.stringify({ contradicts: 1, mixed: 1, consistent: 1, limited: 1 }),
  "parity: the four counts are not the four rows the row model handed over");
// …and the graph the card draws is bucketed off the same object.
const segs = (SECTION.match(/data-pdxwa-seg="([a-z]+)"/g) || []).map((s) => s.slice(16, -1));
for (const tok of Object.keys(headCounts)) {
  ok(segs.indexOf(tok) !== -1, `parity: the shape graph has no "${tok}" segment for the bucket the header counts`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. Every count is wired to the one selection API
// ═════════════════════════════════════════════════════════════════════════════
const uid = (HTALLY.match(/data-pdxwa-seg-uid="([^"]+)"/) || [])[1] || "";
must(uid.length > 0, "the header controls declare no index namespace");
eq((HTALLY.match(/data-pdxwa-seg-uid="/g) || []).length, 4,
  "wiring: not every header count names the index it addresses");
eq((HTALLY.match(/data-pdxwa-gate="header"/g) || []).length, 4,
  "wiring: a header count is not gated — the gate is what tells the switcher this control sits outside the\n" +
  "    fold, so its target may still be shut or stashed");
eq((HTALLY.match(new RegExp('data-pdxwa-outside="' + uid + '"', "g")) || []).length, 4,
  "wiring: a header count does not declare itself outside the section, so the switcher cannot resolve its\n" +
  "    index by walking up and cannot move it back on a repaint");
has(SECTION, `id="${uid}"`, "wiring: the index the header addresses carries no id of that name");
ok(HTALLY.indexOf('aria-pressed="true"') !== -1,
  "wiring: no header count is marked selected, so the reader cannot see which list is open");
ok(/aria-label="[^"]*Opens that list of issues below/.test(HTALLY),
  "wiring: the counts do not announce that they open a list — an unlabelled integer is a decoration");

// ═════════════════════════════════════════════════════════════════════════════
// 6. A tap lands on the list: mount, open, select, scroll — in that order
// ═════════════════════════════════════════════════════════════════════════════
must(docClick.length > 0, "the delegated switcher was never armed — section 6 is vacuous");
const onClick = (ev) => { for (const fn of docClick) { try { fn(ev); } catch (e) {} } };

const IDX_ID = "pdxsp-lid-wa-index";
const lidEl = mkEl(); lidEl.id = IDX_ID; byId.set(IDX_ID, lidEl);
const section = mkEl(); section._sel.add("[data-pdxwa]");
const ocRoot = mkEl(); ocRoot.id = uid; ocRoot._sel.add(".pdxwa-oc"); section.appendChild(ocRoot);
const TOKENS = ["contradicts", "mixed", "consistent", "limited"];
const PANES = TOKENS.map((t) => { const e = mkEl(); e.setAttribute("data-pdxwa-oc-panel", t); return e; });
const TABS = TOKENS.map((t) => {
  const e = mkEl("button");
  e.setAttribute("data-pdxwa-seg", t); e.setAttribute("data-pdxwa-seg-uid", uid);
  e.setAttribute("role", "tab"); e._sel.add("[data-pdxwa-seg]"); ocRoot.appendChild(e); return e;
});
for (const host of [section, ocRoot]) {
  host._kidsAll["[data-pdxwa-oc-panel]"] = PANES;
  host._kidsAll['[data-pdxwa-seg-uid="' + uid + '"]'] = TABS;
}
section._kids[".pdxwa-oc"] = ocRoot;
// Stashed until the lid opens, exactly as a deferred body is.
byId.delete(uid);

ctx.window.toggleDD = (id) => {
  TRACE.push("toggleDD:" + id);
  if (id === IDX_ID) { lidEl.classList.add("dd-open"); byId.set(uid, ocRoot); }
};
ctx.window._pdxNavJump = (target) => { TRACE.push("navJump:" + target); };
// The profile modal's scroller. Its presence is what makes the chrome-aware jump
// the right call; without it there is nothing for _pdxNavJump to scroll.
const modalBody = mkEl(); modalBody.id = "modal-body"; byId.set("modal-body", modalBody);

// The letterhead copy: outside the section entirely, so the switcher has to
// resolve its index DOWN from the uid. The hardest of the three routes in, which
// is why it is the one driven.
const mkGate = (tok) => {
  const e = mkEl("button");
  e.setAttribute("data-pdxwa-seg", tok);
  e.setAttribute("data-pdxwa-seg-uid", uid);
  e.setAttribute("data-pdxwa-gate", "header");
  e.setAttribute("data-pdxwa-outside", uid);
  e._sel.add("[data-pdxwa-seg]");
  return e;
};
const tap = (el) => { TRACE.length = 0; onClick({ target: el, preventDefault() {} }); };
const paneOn = (tok) => PANES.some((p) => p.getAttribute("data-pdxwa-oc-panel") === tok && p.classList.contains("is-on"));

tap(mkGate("mixed"));
eq(TRACE[0], "toggleDD:" + IDX_ID,
  "jump: the handler did something before it opened the fold. The list is deferred out of the DOM, so a\n" +
  "    selection made first selects nothing and the tap reads as a dead control");
ok(paneOn("mixed"), "jump: the bucket the reader tapped is not the one selected");
ok(TRACE.indexOf("navJump:" + uid) !== -1,
  "jump: the index was not brought up through the page's own jump. scrollIntoView({block:'start'}) puts the\n" +
  "    bucket heading UNDER the sticky section rail, so the reader lands on the one thing they cannot read");
ok(TRACE.indexOf("scrollIntoView:" + uid) === -1,
  "jump: the raw scroll fired as well as the chrome-aware one — two scrolls fight each other");
eq(TABS[1].getAttribute("aria-selected"), "true", "jump: the chips inside the index did not follow the header");
eq(TABS[0].getAttribute("aria-selected"), "false", "jump: a stale chip is still marked selected");

// Re-tapping the bucket that is already open re-focuses it. It must not toggle
// the fold shut and leave the reader on a blank page.
tap(mkGate("mixed"));
ok(TRACE.indexOf("toggleDD:" + IDX_ID) === -1,
  "re-tap: tapping the open bucket again closed the fold — the reader asked to be taken to the list, twice,\n" +
  "    and the second ask took it away");
ok(paneOn("mixed"), "re-tap: the open bucket lost its selection on a second tap");
ok(TRACE.indexOf("navJump:" + uid) !== -1, "re-tap: the index was not re-scrolled into view");

// Switching buckets from the header moves the selection rather than adding one.
tap(mkGate("limited"));
ok(paneOn("limited") && !paneOn("mixed"), "switch: two buckets are selected at once after a header tap");

// No modal scroller — a card, a preview, anything that is not the profile modal.
// The chrome-aware jump has nothing to scroll there, so the plain scroll must
// still fire rather than the tap silently going nowhere.
byId.delete("modal-body");
tap(mkGate("consistent"));
ok(TRACE.indexOf("navJump:" + uid) === -1,
  "fallback: the chrome-aware jump was called with no #modal-body to scroll — it returns early, so the tap\n" +
  "    selects a bucket and never moves the page");
ok(TRACE.indexOf("scrollIntoView:" + uid) !== -1,
  "fallback: neither scroll fired outside the profile modal, so the tap selects a list the reader cannot see");
ok(paneOn("consistent"), "fallback: the bucket was not selected outside the profile modal");
byId.set("modal-body", modalBody);

// ═════════════════════════════════════════════════════════════════════════════
// 7. The warm repaint fills the host and keeps the reader's bucket
// ═════════════════════════════════════════════════════════════════════════════
// The header is built from the synchronous word ledger, before the roll-call
// record lands. When it does, the host is refilled from the same builder — and
// the fresh markup opens on the DEFAULT bucket, which is not necessarily the one
// the reader is standing in. So the repaint has to read the live index back.
must(warmFns.length > 0, "no warm listener was bound by the header mount — section 7 is vacuous");
const hostUid = (HMOUNT.match(/data-pdxwa-htally="([^"]+)"/) || [])[1] || "";
must(hostUid.length > 0, "the mounted host is not addressable");
const hostEl = mkEl();
ctx.document._q['[data-pdxwa-htally="' + hostUid + '"]'] = hostEl;
// The letterhead copy the reader can actually see, and the bucket they are on.
const outsideBtn = mkEl("button");
outsideBtn.setAttribute("data-pdxwa-seg", "limited");
outsideBtn.setAttribute("data-pdxwa-seg-uid", uid);
outsideBtn.setAttribute("data-pdxwa-outside", uid);
ctx.document._qa['[data-pdxwa-outside="' + uid + '"]'] = [outsideBtn];
selectAll("limited");
withRows(ROWS, () => warm(PID));
has(hostEl.innerHTML, 'class="pdxwa-tally pdxwa-htally"',
  "warm: the host was not filled when the record landed — a profile whose shape arrives a moment after the\n" +
  "    header does never gets one");
eq(JSON.stringify(countsOf(hostEl.innerHTML)), JSON.stringify(headCounts),
  "warm: the repainted header prints different integers than the section it summarises");
hasnt(hostEl.innerHTML, "%", "warm: the repainted tally prints a percentage");
eq(outsideBtn.getAttribute("aria-pressed"), "true",
  "warm: the repaint dropped the reader's bucket. The header and the list on screen then disagree about\n" +
  "    which bucket is open, and nothing the reader did caused it");
// A host that has left the page takes its listener with it rather than
// accumulating one per profile opened.
const liveBefore = warmFns.length;
delete ctx.document._q['[data-pdxwa-htally="' + hostUid + '"]'];
warm(PID);
ok(warmFns.length < liveBefore,
  "warm: a listener for a host that is no longer on the page stayed bound — one per profile the reader\n" +
  "    opens, all of them repainting nothing");

function selectAll(tok) {
  for (const p of PANES) p.classList.toggle("is-on", p.getAttribute("data-pdxwa-oc-panel") === tok);
  for (const t of TABS) t.setAttribute("aria-selected", t.getAttribute("data-pdxwa-seg") === tok ? "true" : "false");
  ocRoot._kids["[data-pdxwa-oc-panel].is-on"] =
    PANES.filter((p) => p.getAttribute("data-pdxwa-oc-panel") === tok)[0] || null;
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. The public line: counts, the boundary, and nothing else
// ═════════════════════════════════════════════════════════════════════════════
// Shipped because the numbers already exist per row — publicShape() walks
// publicTally(), which is the one place the directions are named and counted.
const shape = C.publicShape(PID);
eq(shape.against, 3, "public: the roll-up does not sum the rows' contradicting items");
eq(shape.backs, 2, "public: the roll-up does not sum the rows' supporting items");
eq(shape.flags, 1, "public: the roll-up does not sum the rows' red flags");
eq(shape.issues, 1, "public: the roll-up does not count the issues with something on file");
eq(shape.directional, 5, "public: the gate the header reads is not the directional total");
has(HTALLY, 'class="pdxwa-hpub"', "public: the header line did not render on a profile with a public record");
has(HTALLY, "3 cut against", "public: the header does not use the row's own words for the against side");
has(HTALLY, "2 back it up", "public: the header does not use the row's own words for the supporting side");
has(HTALLY, "1 red flag", "public: a red flag on the record is dropped from the roll-up");
has(HTALLY, "Not in Direction Match",
  "public: the boundary tag is missing. This line sits closer to the ring than anything else on the page\n" +
  "    that is not in the ring, and it has to say on its face that it is not in it");
hasnt(HTALLY, "pdxwa-hpub-v\">100", "public: the public line prints something that is not a count");
// It is not a control: there is no public bucket index to land in, so a door up
// here would be a jump with nowhere honest to arrive.
const pubLine = HTALLY.slice(HTALLY.indexOf('class="pdxwa-hpub"'));
hasnt(pubLine, "<button", "public: the public line is a control — it has no list to open");
hasnt(pubLine, "data-pdxwa-seg", "public: the public line addresses the formal index, which does not contain it");
hasnt(pubLine, "%", "public: the public line prints a percentage — the wall between the lanes is that one of them\n" +
  "    is rated and the other is not");
// Nothing pointing either way is not a shape. Four zeroes under a letterhead read
// as findings, so the line is gated on real directional counts.
// A second scored profile with nothing on file in the public lane at all.
const NOPUB = withRows(ROWS, () => WA.headerTallyHtml(QUIET));
must(NOPUB.indexOf("pdxwa-tally-b") !== -1, "the no-public variant rendered no tally at all");
hasnt(NOPUB, "pdxwa-hpub", "public: the line rendered on a profile with nothing on file — '0 cut against · 0 back\n" +
  "    it up' under a letterhead reads as a finding rather than a gap");
hasnt(NOPUB, "Not in Direction Match", "public: the boundary tag rendered with no numbers to bound");

// ═════════════════════════════════════════════════════════════════════════════
// 9. No score drift — the header reads the engine, never the other way
// ═════════════════════════════════════════════════════════════════════════════
const before = withRows(ROWS, () => WA.read(PID, ctx.PROFILES[PID]));
withRows(ROWS, () => { WA.headerTallyHtml(PID); WA.headerTallyMount(PID); });
const after = withRows(ROWS, () => WA.read(PID, ctx.PROFILES[PID]));
must(before && after, "read() returned nothing on the seeded profile");
eq(after.pct, before.pct, "drift: rendering the header tally changed the Direction Match figure");
eq(after.publishable, before.publishable, "drift: rendering the header tally moved the publishability floor");
eq(after.token, before.token, "drift: rendering the header tally changed the headline verdict");
eq(JSON.stringify(after.coverage), JSON.stringify(before.coverage),
  "drift: rendering the header tally changed the coverage the score reports");
// The public lane is summed for display and fed into nothing.
const pubBefore = JSON.stringify(withRows(ROWS, () => WA.read(PID, ctx.PROFILES[PID])).coverage);
withRows(ROWS, () => C.publicShape(PID));
eq(JSON.stringify(withRows(ROWS, () => WA.read(PID, ctx.PROFILES[PID])).coverage), pubBefore,
  "drift: summing the public lane moved the formal coverage — the two lanes are not separate");

// ═════════════════════════════════════════════════════════════════════════════
// 10. Placement and tap targets
// ═════════════════════════════════════════════════════════════════════════════
const PF = read("profiles-full.js");
const CSS = read("word-action.css");
const heroEnd = PF.indexOf('<div class="profile-hero-score">');
const mountAt = PF.indexOf("PDXWordAction.headerTallyMount(");
must(heroEnd !== -1 && mountAt !== -1, "the letterhead or its tally mount is gone from profiles-full.js");
ok(mountAt > heroEnd,
  "placement: the tally is mounted above the ring — it is the shape BEHIND the figure and reads as a\n" +
  "    random block mid-page anywhere else");
const stackAt = PF.indexOf("PDXWordAction.headerStackMount(");
ok(stackAt === -1 || mountAt < stackAt,
  "placement: the header stack's context lines now come between the ring and its shape");
// A full-width sibling of the hero, not a fifth child crushed beside the ring.
ok(/\.pdxwa-htally-host\s*\{/.test(CSS), "placement: the host has no layout rule of its own");
ok(/\.pdxwa-htally-host:empty\s*\{[^}]*display:\s*none/.test(CSS),
  "placement: an empty host still occupies the header — a cold profile gets a gap where a shape is not");
ok(/\.pdxwa-tally-b\s*\{[^}]*min-height:\s*2\.75rem/.test(CSS),
  "mobile: the counts lost their 44px tap target");
ok(/\.pdxwa-tally-b\s*\{[^}]*touch-action:\s*manipulation/.test(CSS),
  "mobile: the counts lost touch-action, so a double tap zooms instead of selecting");
ok(/\.pdxwa-hpub\s*\{/.test(CSS), "public: the header's public line has no style of its own");
// The public line must not inherit the counts' button chrome — it is a different
// kind of thing and has to look like one.
ok(!/\.pdxwa-hpub[^{]*\{[^}]*cursor:\s*pointer/.test(CSS),
  "public: the public line is styled as a control");

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n  ✗ ${failures.length} failed, ${passed} passed\n`);
  for (const f of failures) console.error(`    · ${f}`);
  console.error("");
  process.exit(1);
}
console.log(`  ✓ test-header-tally.mjs — ${passed} assertions`);
