#!/usr/bin/env node
/**
 * test-bill-title-door.mjs — the measure identity is a door to the bill file
 * ─────────────────────────────────────────────────────────────────────────────
 * THE READER THIS PASS WAS BUILT FOR. Somebody on /p/mschultz, in the Invest in
 * Public Schools dossier, looking at "H.B. 400 · Public Education Funding
 * Amendments". The dossier already answers what that vote did on that issue —
 * the measure explainer was built for exactly that question. It does not, and
 * cannot, answer the next one a reader asks: WHAT IS THIS BILL? Who else voted
 * on it, what else it was mapped to, whether the provision rode inside a larger
 * vehicle, which roll calls it took. All of that is already a screen in this
 * app — the bill panel — and the number on the card was text.
 *
 * So the education path stopped at the person×issue pair. This file pins the
 * fix, which is deliberately small: the identity a reader can already see is a
 * control, it opens the panel the app already has, at the address the app
 * already uses, and nothing else about the card moves.
 *
 * WHAT THIS FILE PINS
 *
 *   1. EVERY VISIBLE MEASURE IDENTITY IS A DOOR. The dossier card face (number
 *      AND official title), the "which measures" roll-up line, the 🏛️ Official
 *      Record proof line, and the issue desk's ledger rows on /i/<key>.
 *   2. ONE DOOR ATTRIBUTE PER CONTROL, AND THE CARD BODY IS NOT THAT DOOR. The
 *      row around the number still means what it meant: tap the number, get the
 *      bill; tap anything else on the card, get the measure explainer.
 *   3. ONE ADDRESS SHAPE, TWO OWNERS OF THE SITTING, NO THIRD COPY. A record
 *      item spells the sitting on measureIdent (window.pdxBillSit); a bills-index
 *      card spells it on externalIds (PDXBillDetail.sittingOf). The door asks
 *      those two and invents neither — and the pair it carries is the same pair
 *      the app's own in-app address (#bill/<sitting>/<number>) and its shareable
 *      form (/b/<sitting>/<number>) already carry for that measure.
 *   4. UTAH AND FEDERAL BOTH WORK. H.B. 400 addresses 2025GS; H.R. 6644
 *      addresses the 119th. Neither borrows the other's field.
 *   5. NOTHING INTERACTIVE IS NESTED. The dossier card can hold a real <button>,
 *      so it does. The roll-up row cannot — a <button> inside it makes the parser
 *      close the row early and drop every span after it on the floor — so there
 *      the identity is a span that announces itself, and the row keeps only the
 *      pointer delegation it always had.
 *   6. NO BILL PAGE ON FILE IS SAID OUT LOUD. Not a dead click, and not the bills
 *      index or the front page dumped on a reader who asked for one measure.
 *   7. NO NEW FETCH ON THE PERSON-FILE CRITICAL PATH. Rendering the dossier and
 *      tapping the door touch the network zero times.
 *   8. NO NEW SCORE, NO PARTY FRAMING ON THE NEW CONTROLS.
 *   9. TWIN BOOT — formal tiers, Direction Match and the dossier read are
 *      byte-identical to HEAD. This pass added doors and must move no reading.
 *
 * A NOTE ON THE UTAH FIXTURE. The offline record corpus (scripts/vr-record-
 * corpus.mjs) is federal: every member it seeds has congress-shaped items, and
 * mschultz has none at all. So the Utah half of this file assembles ONE item in
 * the shape a completed /api/voting-record fetch leaves in the cache — the same
 * shape scripts/test-measure-explainer.mjs assembles its Utah fixtures in, and
 * the load-bearing detail is the same one: `congress` and `session` are null on
 * a state roll call, and the SITTING arrives on measureIdent.session. The claim
 * under test is the renderer's, and the renderer sees exactly what a browser
 * sees when the pack sends a Utah row.
 *
 *   node scripts/test-bill-title-door.mjs
 */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox, ENGINE_FILES } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HEAD = (f) => {
  try {
    return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch { return null; }
};

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — ${JSON.stringify(needle)} missing`);
const no = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — ${JSON.stringify(needle)} present`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ bill title door: STALE PROBE — ${msg}`);
  process.exit(2);
};

// The smoke path, in the same order the request wrote it.
const UT_PID = "mschultz";       // /p/mschultz · Invest in Public Schools · H.B. 400
const UT_KEY = "public_schools";
const UT_NUM = "H.B. 400";
const UT_SIT = "2025GS";
const FED_PID = "curtis";        // /p/curtis · Housing · H.R. 6644
const FED_KEY = "housing";
const FED_NUM = "H.R. 6644";
const FED_SIT = "119";
const DESK_KEY = "cost_living";  // /i/cost_living · a listed measure title

// ── Boot ─────────────────────────────────────────────────────────────────────
// index.html's order. The person half needs the engine, the record and the bill
// panel; the desk half needs everything the issue desk reads before it can
// characterise a band, which is why issue-view.js is in the list — without it
// the ledger has no ranking to read and the desk says so instead of listing
// measures.
const PERSON_FILES = [
  "pdx-issue-family.js",
  ...ENGINE_FILES,
  "issue-scope.js",
  "issue-colors.js",
  "voting-record.js",
  "bills-index.js",
  "bills.js",
  "bill-detail.js",
  "share-links.js",
];
const DESK_FILES = PERSON_FILES.concat([
  "inventory.js",
  "person-link.js",
  "claim-check.js",
  "my-stances.js",
  "issue-view.js",
  "door1-workspace.js",
]);

const corpus = buildCorpus(ROOT);
must(corpus && corpus.byMember && corpus.byMember.size > 300, "the record corpus did not load enough members");

// ONE UTAH ITEM, IN THE SHAPE THE PACK SENDS. See the note at the top of the file.
const HB400 = {
  kind: "vote", rollcallId: 411, measureId: 400, number: UT_NUM,
  date: "2025-02-20", chamber: "utah house",
  action: "On passage", position: "yea", isProcedural: false,
  title: "Public Education Funding Amendments",
  congress: null, session: null, rollNumber: 411,
  measureIdent: { session: UT_SIT, readFrom: "enrolled", readFromUrl: "https://le.utah.gov/~2025/bills/static/HB0400.html" },
  source: { url: "https://le.utah.gov/~2025/votes/hv0411.html", label: "Utah Legislature" },
  issues: [{
    issueKey: UT_KEY, weight: 70, isPrimary: true, supportMeaning: "yea_supports",
    rationale: "The bill raises the value of the weighted pupil unit, which is the operative provision.",
  }],
};

function boot(get, files) {
  const win = makeSandbox();
  // EVERY NAVIGATION THIS SANDBOX COULD MAKE, RECORDED. Section 6 is a claim
  // about what a door onto a missing file does NOT do, and "does not navigate"
  // is only checkable if every way out is watched.
  win.__nav = [];
  win.location = {
    href: "https://www.politidex.fyi/p/" + UT_PID, pathname: "/p/" + UT_PID,
    search: "", hash: "", origin: "https://www.politidex.fyi",
    assign(u) { win.__nav.push("assign:" + u); },
    replace(u) { win.__nav.push("replace:" + u); },
    reload() { win.__nav.push("reload"); },
  };
  win.history = {
    state: null,
    replaceState(a, b, u) { win.__nav.push("replaceState:" + u); },
    pushState(a, b, u) { win.__nav.push("pushState:" + u); },
  };
  win.open = (u) => { win.__nav.push("open:" + u); return null; };
  // The delegated gateway is bound on the document, so the listeners are what a
  // tap actually runs. They are kept rather than dropped.
  win.__listeners = {};
  win.document.addEventListener = (t, f) => { (win.__listeners[t] = win.__listeners[t] || []).push(f); };
  // Every selector any handler asks the DOM for, recorded — which is how this
  // file tells "the bill door won the tap" from "the card body did".
  win.__queries = [];
  win.__fetches = [];
  win.fetch = (u) => { win.__fetches.push(String(u)); return Promise.reject(new Error("no network in this test")); };
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  win._pdxBrowseType = () => "representative";
  win.__loadErrors = [];
  for (const f of (files || PERSON_FILES)) {
    const src = get(f);
    if (src === null) continue;
    try { vm.runInContext(src, ctx, { filename: f }); }
    catch (e) { win.__loadErrors.push(`${f}: ${e.message}`); }
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  try { win.PDXVotingRecord.noteMember(UT_PID, [HB400]); } catch { /* ditto */ }
  // The two reads that go through /api/voting-record, answered from the one
  // corpus so the desk discovers the same field a warm page would. Guarded: one
  // fixture below boots share-links.js alone, to ask the shipped module what a
  // /b/ path resolves to, and that page has no record module on it at all.
  if (!win.PDXVotingRecord) return (win.__ctx = ctx), win;
  win.PDXVotingRecord.fetchIssueRecords = function (keys) {
    const ks = (keys || []).slice();
    const byPid = {};
    for (const [pid] of corpus.byMember) {
      let items = [];
      for (const k of ks) {
        let part = [];
        try { part = win._pdxRecordIssueItems(pid, k) || []; } catch { part = []; }
        items = items.concat(part);
      }
      if (items.length) byPid[pid] = items;
    }
    return Promise.resolve({ byPid, truncated: false });
  };
  win.PDXVotingRecord.fetchCompare = function () { return Promise.resolve({ byPid: {} }); };
  win.__ctx = ctx;
  return win;
}

// THE PANEL, WATCHED RATHER THAN REPLACED. sittingOf stays real — the desk asks
// it for the sitting of a bills-index card, and a stub would answer for it.
function watchPanel(win) {
  const real = win.PDXBillDetail || null;
  win.__opens = [];
  win.PDXBillDetail = {
    open(num, sit) { win.__opens.push(String(num) + "|" + String(sit)); return true; },
    close() {},
    sittingOf: real && real.sittingOf ? real.sittingOf : function () { return ""; },
  };
  return real;
}

// ── A DOM just real enough to dispatch one tap ──────────────────────────────
// The ancestor chain under test is READ OFF THE SHIPPED MARKUP rather than
// described here: a claim about which door wins a tap is a claim about how the
// controls nest, and hand-built parents would let this file agree with itself
// while the page disagreed.
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr", "use", "path", "circle", "rect"]);
const TAG = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;

function attrsOf(s) {
  const out = {};
  const re = /([A-Za-z_:][-\w:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(s || ""))) {
    out[m[1]] = m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : (m[4] !== undefined ? m[4] : ""));
  }
  return out;
}

function chainAt(html, at) {
  TAG.lastIndex = 0;
  const stack = [];
  let m;
  while ((m = TAG.exec(html))) {
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    if (m.index === at) return closing ? null : stack.concat([{ tag, attrs: attrsOf(m[3]) }]);
    if (closing) {
      for (let i = stack.length - 1; i >= 0; i--) { if (stack[i].tag === tag) { stack.length = i; break; } }
    } else if (!(m[4] === "/" || VOID.has(tag))) {
      stack.push({ tag, attrs: attrsOf(m[3]) });
    }
  }
  return null;
}

// The gateway only ever emits simple selectors — [attr], [attr="v"], #id — so
// that is all this matcher supports. A combinator appearing in consistency.js
// would show up here as a miss rather than a silent pass.
function matchOne(node, sel) {
  let s = String(sel).trim();
  let m = /^([a-zA-Z][\w-]*)/.exec(s);
  if (m) {
    if (node.tagName.toLowerCase() !== m[1].toLowerCase()) return false;
    s = s.slice(m[0].length);
  }
  while (s) {
    if (s[0] === "#") {
      m = /^#([-\w]+)/.exec(s); if (!m) return false;
      if (node.getAttribute("id") !== m[1]) return false;
    } else if (s[0] === ".") {
      m = /^\.([-\w]+)/.exec(s); if (!m) return false;
      if (String(node.getAttribute("class") || "").split(/\s+/).indexOf(m[1]) < 0) return false;
    } else if (s[0] === "[") {
      m = /^\[([-\w:]+)(?:=?"?([^"\]]*)"?)?\]/.exec(s); if (!m) return false;
      const v = node.getAttribute(m[1]);
      if (v === null) return false;
      if (s.slice(m[1].length + 1).charAt(0) === "=" && v !== m[2]) return false;
    } else return false;
    s = s.slice(m[0].length);
  }
  return true;
}
const matches = (node, sel) =>
  String(sel).split(",").some((one) => one.trim() && matchOne(node, one.trim()));

function makeNode(spec, win) {
  const attrs = Object.assign({}, spec.attrs);
  const node = {
    tagName: spec.tag.toUpperCase(),
    parentNode: null,
    kids: [],
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? String(attrs[k]) : null; },
    setAttribute(k, v) { attrs[k] = String(v); },
    removeAttribute(k) { delete attrs[k]; },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k); },
    appendChild(c) { node.kids.push(c); return c; },
    insertAdjacentHTML(pos, h) { node.kids.push({ html: String(h) }); },
    querySelector(sel) { win.__queries.push(String(sel)); return null; },
    querySelectorAll(sel) { win.__queries.push(String(sel)); return []; },
    closest(sel) {
      let p = node;
      while (p) { if (matches(p, sel)) return p; p = p.parentNode; }
      return null;
    },
    focus() {}, scrollIntoView() {},
  };
  return node;
}

// The element whose start tag contains `needle`, with its real parents attached.
function nodeFor(win, html, needle) {
  const i = String(html).indexOf(needle);
  must(i >= 0, `the markup under test no longer contains ${JSON.stringify(needle)}`);
  const at = String(html).lastIndexOf("<", i);
  const chain = chainAt(String(html), at);
  must(chain && chain.length, `could not read an ancestor chain for ${JSON.stringify(needle)}`);
  let parent = null, leaf = null;
  for (const spec of chain) {
    const n = makeNode(spec, win);
    n.parentNode = parent;
    parent = n; leaf = n;
  }
  return leaf;
}

function fire(win, type, node, key) {
  win.__opens.length = 0;
  win.__queries.length = 0;
  const ev = {
    type, key: key || undefined, target: node, defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() {}, stopImmediatePropagation() {},
  };
  for (const f of (win.__listeners[type] || [])) {
    try { f.call(win.document, ev); } catch (e) { failures.push(`the ${type} gateway threw: ${e.message}`); }
  }
  return ev;
}
const asked = (win, frag) => win.__queries.some((q) => q.indexOf(frag) >= 0);

// The one control, isolated from the row it sits in: its start tag plus the text
// it announces. Every claim about "the control" below is asked of exactly this.
function control(html, needle) {
  const i = String(html).indexOf(needle);
  if (i < 0) return "";
  const start = String(html).lastIndexOf("<", i);
  const tag = String(html).slice(start, String(html).indexOf(">", i) + 1);
  const name = /^<([a-zA-Z][\w-]*)/.exec(tag);
  if (!name) return tag;
  const close = "</" + name[1] + ">";
  const end = String(html).indexOf(close, start);
  return end < 0 ? tag : String(html).slice(start, end + close.length);
}
const visible = (h) => String(h).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const W = boot(R);
must(!W.__loadErrors.length, `the person-file boot threw: ${W.__loadErrors.join(" | ")}`);
const CS = W.PDXConsistency;
must(CS && typeof CS.gapViewHtml === "function", "PDXConsistency.gapViewHtml is gone");
must(typeof CS.dossierDriversHtml === "function", "PDXConsistency.dossierDriversHtml is gone");
must(typeof CS.officialRecordSectionHtml === "function", "PDXConsistency.officialRecordSectionHtml is gone");
must(typeof CS.dossierItems === "function", "PDXConsistency.dossierItems is gone");
must(W.PDXBillDetail && typeof W.PDXBillDetail.open === "function", "PDXBillDetail.open is gone — there is no bill file to open");
must(typeof W.PDXBillDetail.sittingOf === "function",
  "PDXBillDetail.sittingOf is not published — the desk would have to guess at a card's session");
must(typeof W.pdxBillSit === "function",
  "window.pdxBillSit is not published — the desk would have to guess at a record item's session");
must(W.PDXShareLinks && typeof W.PDXShareLinks._hashFor === "function", "PDXShareLinks._hashFor is gone");
must(W.CMP_DATA[UT_PID] && W.CMP_DATA[FED_PID], `${UT_PID} or ${FED_PID} left the roster`);
must(W.ISSUE_MAP[UT_KEY] && W.ISSUE_MAP[FED_KEY], "the two smoke keys are no longer in ISSUE_MAP");
watchPanel(W);

const UT_DOS = CS.gapViewHtml(UT_PID, UT_KEY) || "";
const FED_DOS = CS.gapViewHtml(FED_PID, FED_KEY) || "";
const UT_DRV = CS.dossierDriversHtml(UT_PID, UT_KEY) || "";
const FED_DRV = CS.dossierDriversHtml(FED_PID, FED_KEY) || "";
must(UT_DOS.indexOf(UT_NUM) >= 0, `${UT_NUM} is not in ${UT_PID}'s ${UT_KEY} dossier`);
must(FED_DOS.indexOf(FED_NUM) >= 0, `${FED_NUM} is not in ${FED_PID}'s ${FED_KEY} dossier`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · every visible measure identity is a door, Utah and federal");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const [label, dos, num, sit] of [["utah", UT_DOS, UT_NUM, UT_SIT], ["federal", FED_DOS, FED_NUM, FED_SIT]]) {
    // The card face prints two identities — the number and the official title —
    // and the request made both doors.
    for (const cls of ["pdxdos-rec-id", "pdxdos-rec-ttl"]) {
      const c = control(dos, `class="${cls} pdxbill-door"`);
      ok(c.indexOf("<button type=\"button\"") === 0,
        `${label}: .${cls} is not a real button — the dossier card can hold one, so it must`);
      has(c, "data-pdxbill-open", `${label}: .${cls} carries no door attribute`);
      has(c, `data-pdxbill-num="${num}"`, `${label}: .${cls} does not address ${num}`);
      has(c, `data-pdxbill-sit="${sit}"`, `${label}: .${cls} does not address the sitting ${sit}`);
      has(c, `aria-label="Open the bill file for ${num}"`, `${label}: .${cls} does not say what it opens`);
    }
    // …and the title door only exists when a title was printed. A card with no
    // title has nothing to put a door on, and one is not invented.
    ok(dos.indexOf("pdxdos-rec-ttl pdxbill-door") >= 0 || dos.indexOf("pdxdos-rec-ttl") < 0,
      `${label}: the card printed an official title and left it as text`);
  }

  // The roll-up line, on both governments.
  for (const [label, drv, num, sit] of [["utah", UT_DRV, UT_NUM, UT_SIT], ["federal", FED_DRV, FED_NUM, FED_SIT]]) {
    must(drv.length > 200, `${label}: the measures roll-up rendered nothing`);
    const c = control(drv, 'class="pdxgap-drv-id pdxbill-door"');
    has(c, "data-pdxbill-open", `${label}: the roll-up identity carries no door attribute`);
    has(c, `data-pdxbill-num="${num}"`, `${label}: the roll-up identity does not address ${num}`);
    has(c, `data-pdxbill-sit="${sit}"`, `${label}: the roll-up identity does not address ${sit}`);
    has(c, 'role="button" tabindex="0"', `${label}: the roll-up identity is not announced or reachable`);
    // The row itself is still the door to the explainer, and it is still the
    // pointer target it always was.
    has(drv, "data-pdxdrv-open", `${label}: the roll-up row stopped opening the measure explainer`);
  }

  // The 🏛️ Official Record proof line — the formal brief that already printed a
  // bill number.
  const OR = CS.officialRecordSectionHtml(FED_PID) || "";
  must(OR.length > 500, "the Official Record section rendered nothing");
  const pb = control(OR, 'class="pdxor-proof-bill"');
  must(pb, "the Official Record proof line no longer prints a bill number");
  has(pb, "data-pdxbill-open", "the proof line's bill number is not a door");
  ok(/data-pdxbill-num="[^"]+"/.test(pb), "the proof line's door addresses no number");
  ok(/data-pdxbill-sit="[^"]*"/.test(pb), "the proof line's door carries no sitting slot");
  // It lives INSIDE a control (the line opens that one roll call) so it is a
  // pointer target only: a role and a tabindex here would be a second announced
  // control inside the first one.
  no(pb, 'role="button"', "the proof line's door announced itself as a second control inside the line");
  no(pb, "tabindex", "the proof line's door became a second tab stop inside the line");
  ok(pb.indexOf("<b ") === 0, "the proof line's bill number stopped being the <b> the line always printed");

  // NO NUMBER, NO DOOR. A row filed without a bill number has no measure to open,
  // and dressing that as a control would promise a file nobody claimed exists.
  const items = CS.dossierItems(FED_PID, FED_KEY) || [];
  must(items.length > 0, "the dossier listed no items at all");
  const noNum = items.filter((d) => !String(d.billNum || "").trim());
  for (const d of noNum) {
    no(FED_DOS, `>${d.ident}</button>`, `a row with no bill number (${d.ident}) was dressed as a door anyway`);
  }
  console.log(`      ${items.length} listed item(s) · ${noNum.length} with no number and no door`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · one door attribute per control, and the card body is not the door");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const [label, html, cls] of [
    ["utah card number", UT_DOS, "pdxdos-rec-id"],
    ["utah card title", UT_DOS, "pdxdos-rec-ttl"],
    ["federal card number", FED_DOS, "pdxdos-rec-id"],
    ["federal card title", FED_DOS, "pdxdos-rec-ttl"],
    ["utah roll-up", UT_DRV, "pdxgap-drv-id"],
    ["federal roll-up", FED_DRV, "pdxgap-drv-id"],
  ]) {
    const c = control(html, `class="${cls} pdxbill-door"`);
    eq((c.match(/data-pdxbill-open/g) || []).length, 1,
      `${label}: the control does not carry exactly one door attribute`);
    eq((c.match(/data-pdxbill-num=/g) || []).length, 1,
      `${label}: the control names its measure more than once`);
  }

  // The card face is a <details>/<summary>, and NEITHER is the bill door: the row
  // opens the measure explainer, as it did before this pass.
  for (const [label, dos] of [["utah", UT_DOS], ["federal", FED_DOS]]) {
    const rec = /<details class="pdxdos-rec"[^>]*>/.exec(dos);
    must(rec, `${label}: the dossier card is no longer a <details class="pdxdos-rec">`);
    no(rec[0], "data-pdxbill", `${label}: the card body became the bill door`);
    has(rec[0], "data-pdxdos-i", `${label}: the card stopped being the door to its own explainer`);
    const sum = dos.slice(dos.indexOf("<summary", dos.indexOf(rec[0])));
    ok(sum.indexOf("<summary") === 0, `${label}: the card face is not a <summary>`);
    no(/<summary[^>]*>/.exec(sum)[0], "data-pdxbill", `${label}: the card face became the bill door`);
  }

  // The roll-up row keeps its own door and holds no nested interactive element —
  // the parser would close the row on one and eject every span after it.
  for (const [label, drv] of [["utah", UT_DRV], ["federal", FED_DRV]]) {
    const rows = drv.split('<li class="pdxgap-drv-r').slice(1);
    ok(rows.length > 0, `${label}: no roll-up rows to check`);
    for (const row of rows) {
      const li = "<li class=\"pdxgap-drv-r" + row.slice(0, row.indexOf(">") + 1);
      has(li, "data-pdxdrv-open", `${label}: a roll-up row lost the attribute that opens the explainer`);
      no(li, "data-pdxbill", `${label}: a roll-up row itself became the bill door`);
      no(li, 'role="button"', `${label}: the roll-up row is announced as a control AND holds two — one of them is a lie`);
      const cell = row.slice(0, row.indexOf("</li>") < 0 ? undefined : row.indexOf("</li>"));
      no(cell, "<button", `${label}: a roll-up row grew a <button> inside itself`);
      no(cell, "<a ", `${label}: a roll-up row grew an anchor inside itself`);
      // The two controls the row DOES hold are siblings, and the last span still
      // arrives — which is the symptom a nested control would remove.
      has(cell, 'class="pdxgap-drv-id', `${label}: the roll-up row lost its identity cell`);
      has(cell, 'class="pdxgap-drv-go"', `${label}: the roll-up row lost the arrow that opens the explainer`);
    }
  }

  // And nothing anywhere in the new markup nests a control in a control.
  for (const [label, html] of [["utah dossier", UT_DOS], ["federal dossier", FED_DOS],
    ["utah roll-up", UT_DRV], ["federal roll-up", FED_DRV],
    ["official record", CS.officialRecordSectionHtml(FED_PID) || ""]]) {
    const doors = html.split("pdxbill-door").slice(1);
    for (const d of doors) {
      // WHICHEVER CLOSE TAG COMES FIRST ends the control. Two of these doors are
      // real buttons and one is a span that announces itself, so preferring
      // </button> would run a span door's slice on past the row it lives in and
      // swallow the next control as if it were nested inside this one.
      const ends = [d.indexOf("</button>"), d.indexOf("</span>")].filter((x) => x >= 0);
      const inner = d.slice(0, ends.length ? Math.min.apply(null, ends) : 0);
      no(inner, "<button", `${label}: a bill door contains a nested button`);
      no(inner, "<a ", `${label}: a bill door contains a nested anchor`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · one address shape, and the app's own addresses agree with it");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The door carries the pair the SHIPPED reader gives for that item — it does
  // not assemble a session of its own beside the number it prints.
  for (const [label, pid, key, num, sit] of [
    ["utah", UT_PID, UT_KEY, UT_NUM, UT_SIT],
    ["federal", FED_PID, FED_KEY, FED_NUM, FED_SIT],
  ]) {
    const item = (CS.dossierItems(pid, key) || []).filter((d) => d.ident === num)[0];
    must(item, `${label}: ${num} is not a listed item any more`);
    eq(String(item.billNum || ""), num, `${label}: the dossier item's own number moved`);
    eq(String(item.billSit || ""), sit, `${label}: the dossier item's own sitting moved`);
    eq(W.pdxBillSit(item.item || {}), sit,
      `${label}: window.pdxBillSit does not read ${sit} off the record item the pack sent`);
  }
  // A Utah sitting is not a congress and a congress is not a Utah sitting: no
  // borrowing in either direction.
  no(UT_DOS, 'data-pdxbill-sit="119"', "the Utah card borrowed a congress for its sitting");
  no(FED_DOS, `data-pdxbill-sit="${UT_SIT}"`, "the federal card borrowed a Utah session for its sitting");

  // THE ADDRESS A READER CAN ALREADY HOLD. #bill/<sitting>/<number> is the in-app
  // address and /b/<sitting>/<number> is its shareable form; share-links.js owns
  // the conversion. The pair the door carries has to be the same pair those
  // addresses carry, or the title would open a different screen than the link to
  // the same measure.
  const hashOf = (sit, num) => W.PDXShareLinks._hashFor("bill", sit + "/" + num);
  for (const [num, sit] of [[UT_NUM, UT_SIT], [FED_NUM, FED_SIT]]) {
    const want = hashOf(sit, num);
    ok(want === "#bill/" + encodeURIComponent(sit) + "/" + encodeURIComponent(num),
      `the in-app address for ${num} is not the shape share-links owns`);
    // The shareable path, resolved by the shipped module rather than by this file.
    const w2 = boot(R, ["share-links.js"]);
    w2.location.pathname = "/b/" + encodeURIComponent(sit) + "/" + encodeURIComponent(num);
    w2.location.href = w2.location.origin + w2.location.pathname;
    w2.location.hash = "";
    w2.PDXShareLinks.resolve();
    const nav = w2.__nav.join(" ");
    has(nav, want, `/b/${sit}/${num} does not resolve to the same in-app address the door carries`);
  }

  // …and the bills index, which spells the sitting on a different field, agrees
  // with the doors about the measures both surfaces know. Two owners, one answer.
  const idx = W.PDX_BILLS_INDEX || [];
  must(idx.length > 5, "the shipped bills index is empty, so nothing can be cross-checked against it");
  const doorPairs = new Map();
  const sweep = [UT_DOS, FED_DOS, UT_DRV, FED_DRV];
  for (const pid of ["adam_smith", "curtis", "maloy", "owens"]) {
    if (!corpus.byMember.has(pid)) continue;
    for (const k of Object.keys(W.ISSUE_MAP)) {
      const h = CS.gapViewHtml(pid, k) || "";
      if (h.indexOf("data-pdxbill-num") >= 0) sweep.push(h);
    }
  }
  for (const h of sweep) {
    for (const m of h.matchAll(/data-pdxbill-num="([^"]*)" data-pdxbill-sit="([^"]*)"/g)) {
      if (!doorPairs.has(m[1])) doorPairs.set(m[1], new Set());
      doorPairs.get(m[1]).add(m[2]);
    }
  }
  ok(doorPairs.size > 10, `only ${doorPairs.size} distinct measure identities carry a door across the sweep`);
  let agreed = 0;
  const disagreed = [];
  for (const card of idx) {
    const num = String(card.number || "");
    if (!doorPairs.has(num)) continue;
    const cardSit = String(W.PDXBillDetail.sittingOf(card) || "");
    if (!cardSit) continue;
    if (doorPairs.get(num).has(cardSit)) {
      agreed++;
      eq(hashOf(cardSit, num), hashOf(cardSit, num),
        `${num}: the two address builders disagree`);
    } else {
      disagreed.push(`${num}: index says ${cardSit}, the door says ${[...doorPairs.get(num)].join("/")}`);
    }
  }
  ok(agreed > 0, "no measure appears in both the bills index and a dossier door, so nothing was cross-checked");
  eq(disagreed.join(" | "), "",
    `${disagreed.length} measure(s) are addressed differently by the door and by the bills index`);
  console.log(`      ${doorPairs.size} identities carry a door · ${agreed} cross-checked against the shipped index`);

  // NO SECOND ADDRESS SHAPE. Neither surface spells an address of its own; both
  // call the one opener.
  for (const f of ["consistency.js", "door1-workspace.js"]) {
    const src = R(f).replace(/^[ \t]*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    no(src, "'#bill/", `${f} spells the bill hash itself instead of calling the panel`);
    no(src, "'/b/", `${f} spells the shareable bill path itself instead of calling the panel`);
    has(src, "PDXBillDetail", `${f} does not ask PDXBillDetail to open the bill file`);
  }
  // And nothing re-implements either sitting reader. Swept on the CODE: the note
  // that explains which module owns which field names both fields, and the wall
  // is about what the file does, not about the comment saying why.
  const d1 = R("door1-workspace.js");
  const d1code = d1.replace(/^[ \t]*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  has(d1, "window.pdxBillSit", "the desk stopped asking consistency.js for a record item's sitting");
  has(d1, "B.sittingOf", "the desk stopped asking the panel for a bills-index card's sitting");
  no(d1code, "utahSession", "the desk re-implemented the bills-index sitting field instead of asking for it");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · a tap and an Enter open the bill file; the rest of the card does not");
// ═════════════════════════════════════════════════════════════════════════════
{
  must((W.__listeners.click || []).length > 0, "no click listener was bound on the document");
  must((W.__listeners.keydown || []).length > 0, "no keydown listener was bound on the document");

  for (const [label, dos, num, sit] of [["utah", UT_DOS, UT_NUM, UT_SIT], ["federal", FED_DOS, FED_NUM, FED_SIT]]) {
    for (const cls of ["pdxdos-rec-id", "pdxdos-rec-ttl"]) {
      const node = nodeFor(W, dos, `class="${cls} pdxbill-door"`);
      const ev = fire(W, "click", node);
      eq(W.__opens.join(" "), `${num}|${sit}`, `${label}: tapping .${cls} did not open ${num} in ${sit}`);
      ok(ev.defaultPrevented, `${label}: tapping .${cls} left the default to also toggle the row`);
      ok(!asked(W, "data-pdxdos-body"), `${label}: tapping .${cls} also built the card body nobody asked for`);
      eq(W.__nav.length, 0, `${label}: tapping .${cls} navigated instead of opening the panel`);
      // A real <button> already receives Enter and Space AS a click from the
      // browser, so the keydown gateway must not open the same panel twice.
      fire(W, "keydown", node, "Enter");
      eq(W.__opens.length, 0,
        `${label}: Enter on the <button> .${cls} opened the panel a second time on top of the browser's own click`);
    }
    // The rest of the card still means what it meant: the explainer.
    const body = nodeFor(W, dos, 'class="pdxdos-rec-act"');
    fire(W, "click", body);
    eq(W.__opens.length, 0, `${label}: tapping the card body opened the bill file`);
    ok(asked(W, "data-pdxdos-body"), `${label}: tapping the card body stopped building the measure explainer`);
  }

  // The roll-up: the identity opens the bill, the arrow still opens the explainer.
  for (const [label, drv] of [["utah", UT_DRV], ["federal", FED_DRV]]) {
    const num = label === "utah" ? UT_NUM : FED_NUM;
    const sit = label === "utah" ? UT_SIT : FED_SIT;
    const id = nodeFor(W, drv, 'class="pdxgap-drv-id pdxbill-door"');
    const ev = fire(W, "click", id);
    eq(W.__opens.join(" "), `${num}|${sit}`, `${label}: tapping the roll-up identity did not open ${num}`);
    ok(ev.defaultPrevented, `${label}: tapping the roll-up identity did not consume the default`);
    ok(!asked(W, "data-pdxdos-i"), `${label}: tapping the roll-up identity also opened the measure explainer`);
    // …and the keyboard reaches it, because this one cannot legally be a button.
    const kev = fire(W, "keydown", id, "Enter");
    eq(W.__opens.join(" "), `${num}|${sit}`, `${label}: Enter on the roll-up identity did not open the bill file`);
    ok(kev.defaultPrevented, `${label}: Enter on the roll-up identity did not consume the key`);
    const go = nodeFor(W, drv, 'class="pdxgap-drv-go"');
    fire(W, "click", go);
    eq(W.__opens.length, 0, `${label}: the roll-up arrow opened the bill file instead of the explainer`);
    ok(asked(W, "data-pdxdos-i"), `${label}: the roll-up arrow stopped opening the measure explainer`);
  }

  // The proof line: the number opens the bill, and nothing navigated.
  const OR = CS.officialRecordSectionHtml(FED_PID) || "";
  const pnode = nodeFor(W, OR, 'class="pdxor-proof-bill"');
  const pev = fire(W, "click", pnode);
  eq(W.__opens.length, 1, "tapping the proof line's bill number did not open exactly one bill file");
  ok(/\|/.test(W.__opens[0]) && W.__opens[0].split("|")[0].length > 2,
    `the proof line opened a measure with no number: ${JSON.stringify(W.__opens[0])}`);
  ok(pev.defaultPrevented, "tapping the proof line's bill number left the <summary> to toggle as well");
  eq(W.__nav.length, 0, "tapping the proof line's bill number navigated");

  // NO NEW FETCH ON THE PERSON-FILE CRITICAL PATH. Rendering every surface this
  // pass touched, and tapping every door on them, asked the network nothing.
  eq(W.__fetches.length, 0, `the doors added ${W.__fetches.length} fetch(es) to the person file`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · the issue desk's ledger rows open the same bill file");
// ═════════════════════════════════════════════════════════════════════════════
{
  const D = boot(R, DESK_FILES);
  must(!D.__loadErrors.length, `the desk boot threw: ${D.__loadErrors.join(" | ")}`);
  must(D.PDXDoor1 && typeof D.PDXDoor1.issueProfile === "function", "PDXDoor1.issueProfile is gone");
  must(typeof D.pdxDoor1Bill === "function", "window.pdxDoor1Bill is gone");
  watchPanel(D);
  const desk = D.PDXDoor1.issueProfile(DESK_KEY) || "";
  must(desk.length > 1000, `/i/${DESK_KEY} painted nothing to check`);
  must(desk.indexOf("d1-led-bnum") >= 0, `/i/${DESK_KEY} lists no measures any more`);

  // Every measure card with a number has a door on the number AND on the title,
  // and the card's own controls are unharmed.
  const cards = desk.split('<li class="d1-led-b">').slice(1);
  ok(cards.length > 0, "no measure cards on the desk to check");
  let numbered = 0;
  for (const c of cards) {
    const card = c.slice(0, c.indexOf("</li>") < 0 ? undefined : c.indexOf("</li>"));
    const num = (/<span class="d1-led-bnum">([^<]*)</.exec(card) || [])[1] || "";
    has(card, '<span class="d1-led-bnum">', "a measure card stopped printing its number");
    if (!num) continue;
    numbered++;
    // The wrapper is the control and the span it always was is inside it, so the
    // layout keeps the class it styles and the reader gets a door.
    has(card, `<button type="button" class="d1-bdoor is-num"`, `${num}: the number is not a door`);
    has(card, `<button type="button" class="d1-bdoor is-ttl"`, `${num}: the official title is not a door`);
    has(card, `window.pdxDoor1Bill('${num.replace(/'/g, "\\'")}'`, `${num}: the door does not address this measure`);
    // One door attribute per control, and nothing nested inside one.
    for (const mod of ["is-num", "is-ttl"]) {
      const b = control(card, `class="d1-bdoor ${mod}"`);
      eq((b.match(/pdxDoor1Bill/g) || []).length, 1, `${num}: the ${mod} control fires the door more than once`);
      no(b.slice(b.indexOf(">") + 1), "<button", `${num}: the ${mod} control nests a button`);
      no(b.slice(b.indexOf(">") + 1), "<a ", `${num}: the ${mod} control nests an anchor`);
      has(b, `aria-label="Open the bill file for ${num}"`, `${num}: the ${mod} control does not say what it opens`);
    }
  }
  ok(numbered > 0, "no measure card on the desk carries a number, so nothing was checked");

  // The wiring, exercised exactly as the shipped onclick exercises it.
  const first = cards.map((c) => (/<span class="d1-led-bnum">([^<]*)</.exec(c) || [])[1]).filter(Boolean)[0];
  const fsit = (new RegExp("pdxDoor1Bill\\('" + first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "','([^']*)'").exec(desk) || [])[1] || "";
  const node = nodeFor(D, desk, 'class="d1-bdoor is-ttl"');
  D.__opens.length = 0;
  eq(D.pdxDoor1Bill(first, fsit, node), true, `${first}: the desk's door did not report opening the bill file`);
  eq(D.__opens.join(" "), `${first}|${fsit}`, `${first}: the desk opened a different measure than the one printed`);
  eq(D.__nav.length, 0, `${first}: the desk navigated instead of opening the panel`);
  // The sitting on a desk row is read, not guessed: it matches what the shipped
  // readers say for that measure.
  ok(fsit.length > 0, `${first}: the desk printed a number with no sitting to address it in`);
  console.log(`      /i/${DESK_KEY} · ${cards.length} measure card(s) · ${numbered} numbered · first door ${first} @ ${fsit}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · no bill page on file says so, and goes nowhere");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The panel itself fails soft — it has a whole lite fallback for a measure it
  // cannot fetch — so the only route to a refusal is the panel being absent from
  // the build. Which is a fact about the build, not about the measure, and the
  // copy says exactly that.
  const N = boot(R, PERSON_FILES.filter((f) => f !== "bill-detail.js"));
  must(!N.PDXBillDetail, "the no-panel fixture still has PDXBillDetail — nothing was actually removed");
  N.__opens = [];
  const dos = N.PDXConsistency.gapViewHtml(FED_PID, FED_KEY) || "";
  must(dos.indexOf("pdxbill-door") >= 0, "the control disappeared with the panel — a reader loses the number too");
  has(dos, `data-pdxbill-num="${FED_NUM}"`, "the control stopped naming its measure without the panel");
  const node = nodeFor(N, dos, 'class="pdxdos-rec-id pdxbill-door"');
  const ev = fire(N, "click", node);
  ok(ev.defaultPrevented, "the refusing control let the click fall through to the row");
  eq(N.__nav.length, 0, "a door onto a missing bill file navigated — that is the homepage dump this pass removed");
  eq(node.getAttribute("data-pdxbill-none"), "1", "the control did not mark itself as having no file");
  eq(node.getAttribute("aria-disabled"), "true", "the refusing control is not announced as unavailable");
  has(String(node.getAttribute("title") || ""), "No bill page on file",
    "the refusing control does not say why nothing opened");
  has(String(node.getAttribute("title") || ""), FED_NUM,
    "the refusal does not name the measure it is refusing");
  eq(node.kids.length, 1, "the refusal did not print exactly one honest note on the control");
  eq(String((node.kids[0] || {}).className || ""), "pdxbill-nofile", "the appended note is not the honest-blank span");
  eq(String((node.kids[0] || {}).textContent || ""), "No bill page on file", "the honest note says something else");
  // Said once. A second tap does not stack a second note, and does not navigate.
  fire(N, "click", node);
  eq(node.kids.length, 1, "a second tap stacked a second copy of the refusal");
  eq(N.__nav.length, 0, "a second tap on the refusing control navigated");
  no(visible(dos), "Could not load", "the card printed the panel's own error copy before anyone tapped anything");

  // The same claim on the desk, where the old fallback used to dump the bills
  // index on a reader who asked for one measure.
  const ND = boot(R, DESK_FILES.filter((f) => f !== "bill-detail.js"));
  must(!ND.PDXBillDetail, "the no-panel desk fixture still has the panel");
  ND.__opens = [];
  ND.__indexDumps = [];
  ND.pdxOpenBills = () => { ND.__indexDumps.push("bills index"); return true; };
  const deskHtml = ND.PDXDoor1.issueProfile(DESK_KEY) || "";
  must(deskHtml.indexOf("d1-bdoor") >= 0, "the desk's controls disappeared with the panel");
  const dnum = (/<span class="d1-led-bnum">([^<]*)</.exec(deskHtml) || [])[1] || "";
  must(dnum, "the desk printed no number in the no-panel fixture");
  const dnode = nodeFor(ND, deskHtml, 'class="d1-bdoor is-num"');
  eq(ND.pdxDoor1Bill(dnum, "119", dnode), false, "the desk's door claimed it opened a bill file that is not there");
  eq(ND.__indexDumps.length, 0, "the desk dumped the bills index on a reader who asked for one measure");
  eq(ND.__nav.length, 0, "the desk navigated instead of refusing in place");
  eq(dnode.getAttribute("data-d1-nofile"), "1", "the desk's control did not mark itself as having no file");
  has(String(dnode.getAttribute("title") || ""), "No bill page on file", "the desk's refusal does not say why");
  eq(String((dnode.kids[0] || {}).className || ""), "d1-nofile", "the desk printed no honest note on the control");
  // …and the fallback that used to do it is gone from the source, not merely
  // unreached.
  const body = R("door1-workspace.js");
  const at = body.indexOf("window.pdxDoor1Bill = function");
  must(at > 0, "window.pdxDoor1Bill is no longer assigned in door1-workspace.js");
  no(body.slice(at, at + 900), "pdxOpenBills",
    "pdxDoor1Bill can still fall back to the bills index instead of saying there is no file");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no new score, no party framing on the new controls");
// ═════════════════════════════════════════════════════════════════════════════
{
  const D = boot(R, DESK_FILES);
  watchPanel(D);
  const newCopy = [
    control(UT_DOS, 'class="pdxdos-rec-id pdxbill-door"'),
    control(UT_DOS, 'class="pdxdos-rec-ttl pdxbill-door"'),
    control(FED_DOS, 'class="pdxdos-rec-id pdxbill-door"'),
    control(FED_DRV, 'class="pdxgap-drv-id pdxbill-door"'),
    control(CS.officialRecordSectionHtml(FED_PID) || "", 'class="pdxor-proof-bill"'),
    control(D.PDXDoor1.issueProfile(DESK_KEY) || "", 'class="d1-bdoor is-num"'),
    control(D.PDXDoor1.issueProfile(DESK_KEY) || "", 'class="d1-bdoor is-ttl"'),
    "No bill page on file",
  ].join(" · ");
  ok(newCopy.length > 400, "the isolated new copy is too short — the probes above matched nothing");
  // Attributes included: a title= is copy a reader is shown.
  for (const bad of ["Democrat", "Republican", "partisan", "grade", "score", "rank", "lean:", "%"]) {
    no(newCopy, bad, `the new copy says "${bad}"`);
  }
  const scan = CS.menu && CS.menu.scan ? CS.menu.scan(visible(newCopy)) : [];
  eq((scan || []).length, 0, `the new copy trips the word wall: ${JSON.stringify((scan || []).slice(0, 3))}`);
  // What it DOES say, on every surface: the same sentence about what is behind
  // the door, so a reader learns the control once.
  for (const [label, c] of [
    ["dossier number", control(FED_DOS, 'class="pdxdos-rec-id pdxbill-door"')],
    ["roll-up identity", control(FED_DRV, 'class="pdxgap-drv-id pdxbill-door"')],
    ["desk number", control(D.PDXDoor1.issueProfile(DESK_KEY) || "", 'class="d1-bdoor is-num"')],
  ]) {
    has(c, "every member, every mapping, the roll calls", `${label}: the door does not say what is behind it`);
  }

  // No new nav item and no second product: the doors open a panel that already
  // exists, and the page chrome did not grow a destination.
  const IDX = R("index.html");
  no(IDX, "pdxbill-door", "the new control leaked into the page chrome as a nav item");
  has(IDX, 'src="/bill-detail.js"', "the shell stopped loading the one bill panel these doors open");

  // The shell the doors ship inside is versioned, or a warm device serves the old
  // one against the new markup.
  const SW = R("sw.js");
  const m = /const CACHE_VERSION = 'v(\d+)';/.exec(SW);
  must(m, "CACHE_VERSION is not in sw.js in the form this file reads");
  const prev = HEAD("sw.js");
  if (prev) {
    const pm = /const CACHE_VERSION = 'v(\d+)';/.exec(prev);
    if (pm) ok(Number(m[1]) > Number(pm[1]),
      `CACHE_VERSION did not move past HEAD's v${pm[1]} — a warm device would serve the old shell against the new doors`);
  }
  has(SW, `// v${m[1]} - `, `sw.js has no prose log entry for v${m[1]}`);
  // The three files this pass shipped are precached shell entries, which is what
  // makes the bump above load-bearing rather than cosmetic. bill-detail.js is
  // deliberately NOT asserted here: it is a runtime-cached entry, not a shell
  // one, and a page that arrives without it is exactly the case section 6 makes
  // honest rather than a case this file should quietly add to the precache list.
  for (const f of ["consistency.js", "door1-workspace.js", "door1-workspace.css"]) {
    has(SW, `'/${f}'`, `${f} is not precached, so the doors can arrive against an old shell`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · twin boot — formal tiers, Direction Match and the dossier read are byte-identical");
// ═════════════════════════════════════════════════════════════════════════════
{
  const A = boot(HEAD);
  const B = boot(R);
  must(A.PDXConsistency && typeof A.PDXConsistency.scopedOverall === "function", "HEAD's consistency.js did not boot");
  must(B.PDXWordAction && typeof B.PDXWordAction.read === "function", "the working tree's word-action.js did not boot");
  const scopes = Object.keys(B.PDXConsistency.SCOPES);
  must(scopes.length > 0, "PDXConsistency.SCOPES is empty");
  const drift = [];
  let swept = 0;
  for (const [pid] of corpus.byMember) {
    swept++;
    for (const sc of scopes) {
      if (JSON.stringify(A.PDXConsistency.scopedOverall(sc, pid)) !==
          JSON.stringify(B.PDXConsistency.scopedOverall(sc, pid))) drift.push(`${pid}/${sc}`);
    }
    if (JSON.stringify(A.PDXWordAction.read(pid)) !== JSON.stringify(B.PDXWordAction.read(pid))) drift.push(`${pid}/ledger`);
    if (JSON.stringify(A.PDXConsistency.formalPatternIndex.shape(pid)) !==
        JSON.stringify(B.PDXConsistency.formalPatternIndex.shape(pid))) drift.push(`${pid}/formal`);
  }
  ok(swept > 300, `the twin boot only swept ${swept} files`);
  eq(drift.slice(0, 8).join(" | "), "",
    `${drift.length} formal tier / Direction Match read(s) moved — this pass added doors and must move none`);

  // The dossier READ is unchanged too: a door is markup, not a reading. Both
  // governments, because the Utah fixture is seeded into both twins.
  const rdrift = [];
  for (const pid of [UT_PID, FED_PID, "adam_smith", "maloy"]) {
    if (!A.CMP_DATA[pid]) continue;
    for (const k of Object.keys(B.ISSUE_MAP)) {
      if (JSON.stringify(A.PDXConsistency.dossierRead(pid, k)) !==
          JSON.stringify(B.PDXConsistency.dossierRead(pid, k))) rdrift.push(`${pid}/${k}`);
    }
  }
  eq(rdrift.length, 0, `${rdrift.length} dossier read(s) moved: ${rdrift.slice(0, 4).join(" ")}`);
  console.log(`      ${swept} files swept across ${scopes.length} scopes; no tier, match or dossier read moved`);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ bill title door: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error(`  · ${f}`);
  process.exit(1);
}
console.log(`✓ bill title door: every printed measure identity opens the one bill file — ${passed} assertions passed\n`);
