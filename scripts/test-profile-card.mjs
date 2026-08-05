#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Unit tests for the PROFILE RECORD CARD — profile-card.js
// ─────────────────────────────────────────────────────────────────────────────
// This is the artifact that leaves the app. Everything else PolitiDex renders is
// read next to its own disclosure, its own "what feeds this" breakdown and a tap
// away from the sources; a PNG is read on someone else's timeline with none of
// that. So the card's honesty cannot be a property of the surrounding page — it
// has to be a property of the pixels.
//
// Five contracts, each of which fails silently and each of which would be a lie
// travelling under PolitiDex's name:
//
//   1. NO PERCENTAGE, ANYWHERE. The Promise Follow-Through rate is retired
//      sitewide, and this card does not quietly reintroduce it — nor does it
//      print ⚖️ Word vs Action's pooled figure, which is real but meaningless
//      without the coverage line that sits beside it in the app. The card's
//      signal is the VERDICT, in words, and its evidence is COUNTS. A '%' in the
//      painted text is a failure, however it got there.
//   2. IT SAYS WHAT IT DOESN'T KNOW. Below PDXWordAction's publishing floor, the
//      card prints that nothing has been tested yet — not a confident stamp on
//      one item, and not an empty band that reads as clean. A thin profile
//      produces a thin CARD, out loud.
//   3. THE NUMBERS ARE THE OWNING MODULE'S. Coverage, the breakdown and the
//      pledge ledger are read through PDXWordAction, _pdxRecordMappedCounts and
//      _pdxPromiseTally. This module computes no rate, applies no floor of its
//      own and rounds nothing.
//   4. THE IMAGE AND THE CAPTION AGREE. They are shared in the same gesture. A
//      caption that claimed more than the card would be a second, unsourced
//      claim — so every finding in one is in the other.
//   5. IT IS SELF-CONTAINED. Drawn monogram avatars, never a hotlinked photo:
//      a tainted canvas fails toBlob() at the moment of sharing, on a device the
//      author cannot see. Branding, politidex.fyi and the honesty note are
//      painted in, so the card survives being cropped out of the app.
//
// Section 6 then gates the WIRING — the tier, its suppression on issue rows, and
// the precache. A card nothing dispatches to is not a card.
//
//   node scripts/test-profile-card.mjs
//
// No database, no network, no browser: a recording 2D context stands in for the
// canvas, so the assertions are made against the text that would actually be
// painted. Exit 1 on a failed contract, exit 2 when a contract can no longer be
// verified — a stale harness is not a pass.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const failures = [];
let passed = 0;
const ok = (cond, msg) => { cond ? passed++ : failures.push(msg); };
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ profile card: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

// ── A recording 2D context ───────────────────────────────────────────────────
// Records every fillText call with the font in force, so the tests can assert on
// the TEXT THAT WOULD BE PAINTED rather than on the source that paints it. Widths
// are derived from the font's px size, which is enough for wrapText to behave the
// way it will in a browser (wrap, clamp, ellipsis) instead of never wrapping.
function mkCanvas() {
  const texts = [];
  const rects = [];
  const corners = [];
  let seq = 0;
  const ctx = {
    font: "10px sans-serif", fillStyle: "", strokeStyle: "", lineWidth: 1,
    textAlign: "left", textBaseline: "top",
    // The tiled watermark is painted inside a translate/rotate, so its coordinates
    // are outside the frame BY DESIGN. Tracking the transform lets the geometry
    // assertions below apply to the content only, instead of being loosened until
    // they would also pass for a highlight painted off the bottom edge.
    _warped: 0,
    _px() { const m = /(\d+(?:\.\d+)?)px/.exec(this.font); return m ? Number(m[1]) : 10; },
    measureText(t) { return { width: String(t).length * this._px() * 0.5 }; },
    fillText(t, x, y) { texts.push({ t: String(t), x, y, font: this.font, fill: this.fillStyle, warped: this._warped > 0, seq: seq++ }); },
    fillRect(x, y, w, h) { rects.push({ x, y, w, h, fill: this.fillStyle }); },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
    save() { this._warped++; }, restore() { this._warped = Math.max(0, this._warped - 1); },
    translate() {}, rotate() {}, scale() {},
    beginPath() {}, closePath() {},
    // roundRect() opens every panel with a moveTo at its top-left corner, so this
    // is where a box's top edge is recorded — the geometry tests need the boxes,
    // not just the text, to prove two bands do not overlap.
    moveTo(x, y) { corners.push({ x, y, warped: this._warped > 0, seq: seq++ }); },
    lineTo() {}, arc() {}, arcTo() {},
    quadraticCurveTo() {}, bezierCurveTo() {}, rect() {}, clip() {},
    fill() {}, stroke() {},
    drawImage() { throw new Error("the card must not draw an external image — a tainted canvas breaks toBlob()"); },
  };
  return {
    width: 0, height: 0, _texts: texts, _rects: rects, _corners: corners,
    getContext() { return ctx; },
    toDataURL() { return "data:image/png;base64,AAAA"; },
    toBlob(cb) { cb({ size: 1024, type: "image/png" }); },
  };
}

// ── Stubs, at exactly the public surface the card is allowed to read ─────────
const VERDICTS = {
  consistent: { key: "consistent", ico: "✓", label: "Backs it up", short: "The record backs the words.", tone: "good", color: "#6ee7a0" },
  contradicts: { key: "contradicts", ico: "⚠", label: "Says one thing, does another", short: "The record cuts against the words.", tone: "bad", color: "#f89b9b" },
  mixed: { key: "mixed", ico: "◑", label: "Mixed record", short: "The record cuts both ways.", tone: "warn", color: "#93c5fd" },
  limited: { key: "limited", ico: "…", label: "Not enough on record yet", short: "", tone: "muted", color: "#9fb4d4" },
  no_stance: { key: "no_stance", ico: "—", label: "No stated position on file", short: "", tone: "muted", color: "#9fb4d4" },
  no_record: { key: "no_record", ico: "—", label: "No record on file", short: "", tone: "muted", color: "#9fb4d4" },
  pending: { key: "pending", ico: "⏳", label: "Still loading", short: "", tone: "muted", color: "#9fb4d4" },
};

// A high-coverage member: contradictions, agreements, a settled pledge ledger and
// a deep vote record — the Massie-shaped case.
function thickRead() {
  const item = (id, kind, label, token) => ({
    id, kind, tier: kind === "pledge-tracked" ? "pledge" : "position", label,
    text: label + " — as stated on the record.", issueKey: id, appliedWeight: 1,
    test: { state: "tested", token, reason: null, score: token === "consistent" ? 100 : 0 },
  });
  const untested = [
    { id: "u1", kind: "position", label: "Untested one", test: { state: "untested", reason: "no_action_yet" } },
    { id: "u2", kind: "position", label: "Untested two", test: { state: "untested", reason: "no_action_yet" } },
    { id: "u3", kind: "pledge-tracked", label: "Open pledge", test: { state: "untested", reason: "unresolved" } },
    { id: "u4", kind: "branding", label: "Signature issue", test: { state: "untested", reason: "not_issue_linked" } },
  ];
  const tested = [
    item("guns", "position", "Gun rights", "contradicts"),
    item("spending", "position", "Federal spending", "consistent"),
    item("surveillance", "position", "Surveillance", "consistent"),
    item("trade", "position", "Trade", "mixed"),
    item("earmarks", "pledge-tracked", "No earmarks", "consistent"),
  ];
  return {
    frame: "word-action", pct: 62, token: "mixed", outcomeToken: "mixed",
    verdict: VERDICTS.mixed, publishable: true,
    items: tested.concat(untested), tested, untested,
    counts: { consistent: 3, contradicts: 1, mixed: 1 },
    tiers: {}, testedWeight: 5,
    coverage: { word: 9, scorable: 8, tested: 5, untested: 4, issueLinked: 8, notIssueLinked: 1, recordDerived: 0, warming: false },
    floors: { items: 3, weight: 2.5 },
  };
}

// A thin member: three stated positions, nothing tested, no votes on file.
function thinRead() {
  const untested = [
    { id: "t1", kind: "position", label: "Cut property tax", test: { state: "untested", reason: "no_action_yet" } },
    { id: "t2", kind: "position", label: "Fund the sheriff", test: { state: "untested", reason: "no_action_yet" } },
    { id: "t3", kind: "branding", label: "Water rights", test: { state: "untested", reason: "not_issue_linked" } },
  ];
  return {
    frame: "word-action", pct: null, token: "limited", outcomeToken: "limited",
    verdict: VERDICTS.limited, publishable: false,
    items: untested, tested: [], untested,
    counts: {}, tiers: {}, testedWeight: 0,
    coverage: { word: 3, scorable: 2, tested: 0, untested: 3, issueLinked: 2, notIssueLinked: 1, recordDerived: 0, warming: false },
    floors: { items: 3, weight: 2.5 },
  };
}

const READS = { thick: thickRead(), thin: thinRead() };

function mkCtx() {
  const canvases = [];
  const toasts = [];
  const opened = [];
  const listeners = {};
  const noopEl = () => ({
    style: {}, textContent: "", innerHTML: "", value: "", children: [],
    classList: { add() {}, remove() {}, contains: () => false },
    setAttribute() {}, getAttribute: () => null, removeAttribute() {},
    appendChild() {}, removeChild() {}, addEventListener() {},
    querySelector: () => null, querySelectorAll: () => [], click() {},
    getBoundingClientRect: () => ({ left: 10, top: 10, right: 90, bottom: 40, width: 80, height: 30 }),
    contains: () => false, isConnected: true, parentNode: null,
  });
  const ctx = {
    console,
    document: {
      readyState: "complete",
      body: Object.assign(noopEl(), { appendChild(c) { return c; }, removeChild() {} }),
      head: noopEl(), documentElement: noopEl(),
      createElement(tag) {
        if (String(tag).toLowerCase() === "canvas") { const c = mkCanvas(); canvases.push(c); return c; }
        return noopEl();
      },
      getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
      addEventListener(n, fn) { (listeners[n] = listeners[n] || []).push(fn); },
      removeEventListener() {},
      execCommand() { return true; },
    },
    navigator: {},
    location: { origin: "https://politidex.fyi", pathname: "/", hash: "" },
    setTimeout: (fn) => { try { fn(); } catch (e) {} return 0; },
    clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: (fn) => { try { fn(); } catch (e) {} return 0; },
    atob: (s) => Buffer.from(s, "base64").toString("binary"),
    Blob: class { constructor(parts, o) { this.parts = parts; this.type = (o || {}).type; this.size = 1; } },
    File: class { constructor(parts, name, o) { this.parts = parts; this.name = name; this.type = (o || {}).type; } },
    Uint8Array, JSON, Math, Date, Promise, Object, Array, String, Number, Boolean, Error, RegExp,
    encodeURIComponent, decodeURIComponent, isNaN, parseInt, parseFloat,
    _canvases: canvases, _toasts: toasts, _opened: opened, _listeners: listeners,
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  ctx.addEventListener = (n, fn) => { (listeners[n] = listeners[n] || []).push(fn); };
  ctx.open = (u) => { opened.push(u); return null; };
  ctx.innerWidth = 420; ctx.innerHeight = 900;
  ctx._showToast = (m) => { toasts.push(String(m)); };

  ctx.PROFILES = {
    massie: { name: "Thomas Massie", office: "U.S. House", state: "KY", district: "4", party: "Republican",
              kept: 27, broken: 8, pending: 2 },
    thinguy: { name: "Dale Newcomer", office: "State House", state: "UT", district: "12", party: "Democrat" },
    blank: { name: "Blank Slate", office: "City Council", state: "UT", party: "Independent" },
    // A name long enough to wrap to two lines, so the identity band's text column
    // is taller than the avatar. Same record as Massie — only the name differs.
    longname: { name: "Bartholomew Fitzgerald-Wintergreen", office: "U.S. House", state: "CA",
                district: "12", party: "Democrat", kept: 27, broken: 8, pending: 2 },
  };
  ctx.PDXConsistency = { VERDICTS, warm() {} };
  ctx.PDXWordAction = {
    read(pid) {
      if (pid === "massie") return READS.thick;
      if (pid === "longname") return READS.thick;
      if (pid === "thinguy") return READS.thin;
      return { coverage: { word: 0, scorable: 0, tested: 0, untested: 0, warming: false },
               items: [], tested: [], untested: [], counts: {}, verdict: VERDICTS.no_stance,
               publishable: false, pct: null, token: "no_stance" };
    },
    dots(pid, p, o) {
      const r = this.read(pid);
      const rank = { contradicts: 0, mixed: 1, consistent: 2, limited: 3 };
      const rows = (r.tested || []).slice().sort((a, b) => rank[a.test.token] - rank[b.test.token]);
      return rows.slice(0, (o && o.limit) || 3).map((it) => ({
        item: it, tier: {}, issueKey: it.issueKey, title: it.label, word: it.text,
        sources: [], outcome: it.test, verdict: VERDICTS[it.test.token] || null,
        actions: [{ text: "H.R. 22 · On Passage · Voted Yea", kind: "vote" }],
      }));
    },
  };
  ctx._pdxRecordMappedCounts = (pid) =>
    pid === "massie" ? { votes: 41, issues: 9, total: 118, issueKeys: [] } : null;
  ctx._pdxPromiseTally = (p) => {
    const kept = p && p.kept ? p.kept : 0, broken = p && p.broken ? p.broken : 0, pending = p && p.pending ? p.pending : 0;
    return { kept, broken, resolved: kept + broken, pending, partial: 0, unresolved: pending, tracked: kept + broken + pending };
  };
  ctx._pdxOfficeLine = (p) => "🏛️ " + [p.office, p.district ? "District " + p.district : "", p.state].filter(Boolean).join(" • ");
  ctx.pdxShareUrl = (pid) => "https://politidex.fyi/?p=" + pid;
  ctx.PDXReceiptCards = { warm: () => Promise.resolve(null) };
  return ctx;
}

const SRC = read("profile-card.js");
// The module is heavily commented, and its comments quote the very things the
// contracts below forbid ("X% Kept Word", "a bare 68%"). So source-level probes
// run against the code with comments stripped, or the prose would answer for the
// code. `[^:]` keeps `https://` out of the line-comment match.
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const ctx = mkCtx();
vm.createContext(ctx);
new vm.Script(SRC, { filename: "profile-card.js" }).runInContext(ctx);
const PC = ctx.window.PDXProfileCard;
must(!!PC, "profile-card.js no longer registers window.PDXProfileCard");
must(typeof PC.read === "function" && typeof PC.share === "function" && typeof PC.brief === "function",
     "PDXProfileCard no longer exposes read/brief/share");

// Painted text, in draw order.
const paint = async (pid) => {
  const before = ctx._canvases.length;
  const d = PC.read(pid);
  must(!!d, `PDXProfileCard.read('${pid}') returns nothing — the fixture no longer reaches the card`);
  await PC.share(pid, null);
  const c = ctx._canvases[ctx._canvases.length - 1];
  must(ctx._canvases.length > before && c, `sharing '${pid}' painted no canvas`);
  // Content only — the watermark is painted in a rotated space and is not text a
  // reader parses.
  const all = c._texts.filter((t) => !t.warped);
  return { d, canvas: c, lines: all.map((t) => t.t), all };
};

const run = async () => {

const thick = await paint("massie");
const thin = await paint("thinguy");
const THICK = thick.lines.join("\n");
const THIN = thin.lines.join("\n");

// ── 1. No percentage, anywhere ───────────────────────────────────────────────
{
  // The whole point of the pass. Not "no promise percentage" — no percentage.
  const pctLines = thick.lines.filter((t) => /%/.test(t)).concat(thin.lines.filter((t) => /%/.test(t)));
  ok(pctLines.length === 0,
     "no-rate: the painted card contains a percentage — " + JSON.stringify(pctLines.slice(0, 3)) +
     " — and an image travels without the coverage line that would make a rate mean anything");
  ok(!/%/.test(PC._caption(thick.d)) && !/%/.test(PC._caption(thin.d)),
     "no-rate: the caption prints a percentage, so the same claim leaves the app as text");
  ok(!/%/.test(PC._shortPost(thick.d)),
     "no-rate: the 280-character post prints a percentage");
  // …and the figure is not merely unprinted, it is never read. r.pct existing and
  // being ignored is one refactor away from being interpolated by accident.
  ok(!/\.pct\b/.test(CODE), "no-rate: the module reads PDXWordAction's pooled .pct at all — it must not have it in hand");
  ok(!/\bkept\s*\/|\/\s*\(\s*\w*kept|100\s*\*/.test(CODE),
     "no-rate: the module contains a rate calculation of its own, which is how a retired score comes back");
  ok(/PLEDGE RECEIPTS/.test(THICK) && /27 KEPT/.test(THICK) && /8 BROKEN/.test(THICK),
     "no-rate: the pledge ledger is printed as counts — retiring the rate must not have cost the receipts");
  ok(/2 OPEN/.test(THICK),
     "no-rate: pledges still open are printed, so 'settled' is not silently read as 'all of them'");
}

// ── 2. It says what it doesn't know ──────────────────────────────────────────
{
  ok(/DOES WHAT THEY SAY MATCH WHAT THEY DO\?/.test(THICK) && /DOES WHAT THEY SAY MATCH WHAT THEY DO\?/.test(THIN),
     "hierarchy: both cards lead with the one question, so the primary signal is unmistakable");
  ok(/MIXED RECORD/.test(THICK.toUpperCase()),
     "hierarchy: a publishable read prints its verdict in words as the headline");

  // The thin case is the one that matters: an empty band reads as clean.
  ok(/NOT ENOUGH ON RECORD YET/.test(THIN.toUpperCase()),
     "thin: a member below the publishing floor gets the honest verdict, not a blank signal band");
  ok(/no record to test/i.test(THIN) || /nothing they have said/i.test(THIN),
     "thin: the card states in prose that nothing has been tested — silence would read as a clean record");
  ok(/NOTHING HAS BEEN TESTED YET/.test(THIN),
     "thin: the breakdown heading says there is nothing to break down rather than heading three zeroes");
  ok(!/BACKS THEM UP/.test(THIN),
     "thin: with no tested items the card claims no highlight");
  ok(/STILL MISSING/.test(THIN),
     "thin: with no contradictions to cite the card names the GAPS — the honest lowlight");
  ok(/no matching vote yet/i.test(THIN),
     "thin: the gap is named specifically (positions with no vote against them), not as a generic apology");
  const sig = PC._signalLine(READS.thin, VERDICTS.limited);
  ok(!/backs|contradic/i.test(sig),
     "thin: the sub-verdict line below the floor makes no finding in either direction");
  ok(PC.read("blank") === null,
     "thin: a person with no documented word at all yields NO card — a report card on nothing is a fabrication, not a thin card");
  ctx._toasts.length = 0;
  await PC.share("blank", null);
  ok(ctx._toasts.some((t) => /no documented record/i.test(t)),
     "thin: sharing an empty record says so and paints nothing");
}

// ── 3. The numbers are the owning module's ───────────────────────────────────
{
  const d = thick.d;
  ok(d.coverage.tested === READS.thick.coverage.tested && d.coverage.scorable === READS.thick.coverage.scorable,
     "sources: coverage is PDXWordAction's own count, unadjusted");
  ok(d.breakdown.consistent === 3 && d.breakdown.contradicts === 1 && d.breakdown.mixed === 1,
     "sources: the breakdown is PDXWordAction's counts map, not a recount of the items");
  ok(d.coverage.votes === 41,
     "sources: 'votes on record' comes from _pdxRecordMappedCounts");
  ok(/41 MAPPED VOTES/.test(THICK.toUpperCase()),
     "sources: the coverage line prints the MAPPED vote count — the 118 on file include votes that can test nothing anyone said, and printing those would overstate coverage");
  ok(/5 OF 8 TESTABLE/.test(THICK.toUpperCase()),
     "sources: the coverage line prints tested-of-testable, so a reader can see how much of the word was actually put to the test");
  ok(/COVERAGE:/.test(THICK.toUpperCase()) && /COVERAGE:/.test(THIN.toUpperCase()),
     "sources: coverage is stated outright on both cards, not only where it flatters");
  ok(thin.d.coverage.votes === null && /votes still loading/i.test(THIN),
     "sources: with no vote record read the card says so rather than printing a zero it did not verify");
  // The legend paints its number and its label as separate runs (different weight
  // and colour), so the pairing is asserted by adjacency rather than by substring.
  const legendPair = (lines, label) => {
    const i = lines.indexOf(label);
    return i > 0 ? lines[i - 1] : null;
  };
  ok(legendPair(thick.lines, "BACKED UP") === "3" && legendPair(thick.lines, "CONTRADICTED") === "1",
     "sources: the breakdown is painted as a labelled count beside each label");
  ok(legendPair(thin.lines, "BACKED UP") === "0" && legendPair(thin.lines, "CONTRADICTED") === "0",
     "sources: a record with nothing tested shows honest zeroes rather than an absent breakdown");
  ok(!/MIN_TESTED|coverage\.tested\s*>=|tested\.length\s*>=/.test(CODE) && /publishable/.test(CODE),
     "sources: the card applies no publishing floor of its own — PDXWordAction owns that decision and the card obeys `publishable`");
  ok(/_pdxPromiseTally/.test(CODE) && !/p\.kept\s*\+\s*p\.broken/.test(CODE),
     "sources: the pledge ledger is read through the honesty guard rather than added up locally");
}

// ── 4. The image and the caption agree ───────────────────────────────────────
{
  const cap = PC._caption(thick.d);
  ok(/Thomas Massie/.test(cap) && /Mixed record/.test(cap),
     "parity: the caption names the person and gives the same verdict as the image");
  ok(/3 backed up/.test(cap) && /1 contradicted/.test(cap),
     "parity: the caption carries the same breakdown counts as the image");
  ok(/41 mapped vote/.test(cap) && /5 of 8 testable/.test(cap),
     "parity: the caption carries the same coverage as the image");
  ok(/27 kept/.test(cap) && /8 broken/.test(cap) && /not a percentage/.test(cap),
     "parity: the caption states the pledge counts AND that no percentage is published");
  ok(/politidex\.fyi\/\?p=massie/.test(cap),
     "parity: the caption links the profile, so a reader can check every claim on the image");
  ok(/Check it yourself/.test(cap),
     "parity: the caption invites verification rather than asserting authority");
  const thinCap = PC._caption(thin.d);
  ok(/Not enough on record yet/.test(thinCap) && !/backed up/.test(thinCap),
     "parity: the thin card's caption is as thin as the card");
  const post = PC._shortPost(thick.d);
  ok(post.length <= 280, `parity: the short post fits a 280-character limit (was ${post.length})`);
  ok(/Mixed record/.test(post), "parity: the short post leads with the verdict, not with a number");
}

// ── 5. It is self-contained ──────────────────────────────────────────────────
{
  ok(!/new Image\(|\.src\s*=|drawImage/.test(CODE),
     "offline: the card loads no external image — a tainted canvas fails toBlob() at the moment of sharing");
  ok(PC._initials("Thomas Massie") === "TM" && PC._initials("") === "★",
     "offline: the avatar is a drawn monogram with a fallback, so there is always something in the frame");
  ok(/POLITI/.test(THICK) && /DEX/.test(THICK), "branding: the wordmark is painted on");
  ok(thick.lines.some((t) => /B O U N D   B Y   T R U T H/.test(t)),
     "branding: 'Bound by Truth' is painted on");
  ok(/politidex\.fyi/.test(THICK) && /politidex\.fyi/.test(THIN),
     "branding: the address is painted on every card, so a cropped screenshot still points home");
  ok(/RECORD CARD/.test(THICK) && /WORD  vs  ACTION/.test(THICK),
     "branding: the card names what it is and which read it comes from");
  ok(/sourced votes and documented positions/.test(THICK) && /sourced votes and documented positions/.test(THIN),
     "honesty: the note about what the card is built from is on every card, thin ones included");
  ok(/too thin to carry one/.test(THICK),
     "honesty: the note states the fail-closed rule, which is the claim that makes the rest credible");
  ok(thick.canvas.width === 1080 && thick.canvas.height === 1350,
     "format: the card is 1080×1350 — the portrait frame the feeds crop least");
  // Nothing may be painted below the frame: an overflowing highlight silently
  // drops off the bottom of the image, which is a citation the reader cannot see.
  const over = thick.all.filter((t) => t.y > 1350 - 40).concat(thin.all.filter((t) => t.y > 1350 - 40));
  ok(over.length === 0,
     "format: text is painted past the bottom edge — " + JSON.stringify(over.slice(0, 2).map((t) => t.t)));
  ok(thick.all.every((t) => t.x >= 0 && t.x <= 1080),
     "format: every line starts inside the frame");
  // Wrapping is real, and clamps rather than overflowing.
  const wctx = mkCanvas().getContext();
  wctx.font = "400 28px Barlow";
  const lines = PC._wrapText(wctx, "word ".repeat(80), 400, 2);
  ok(lines.length === 2 && /…$/.test(lines[1]),
     "format: over-long text is clamped to its reserved lines with an ellipsis, never overrun");
  // A two-line name makes the identity band's text column taller than the avatar.
  // If the band's height is taken from the avatar alone, the party chip is drawn
  // underneath the signal box — the one element on the card that must be legible.
  const wide = await paint("longname");
  const nameRuns = wide.all.filter((t) => /Bartholomew|Fitzgerald/.test(t.t));
  must(nameRuns.length === 2, "the long-name fixture no longer wraps to two lines, so it proves nothing");
  const chip = wide.all.find((t) => t.t === "DEMOCRAT");
  const head = wide.all.find((t) => /DOES WHAT THEY SAY MATCH WHAT THEY DO\?/.test(t.t));
  must(!!chip && !!head, "the party chip or the signal heading is no longer painted as its own run");
  // The box opened right after the chip's label is the signal band. Measure against
  // its TOP EDGE, not against the heading inside it — the heading sits ~44px down,
  // so a chip that overhangs the band's border would clear the heading and the test
  // would pass on a card that visibly overlaps.
  const band = wide.canvas._corners.find((c) => c.seq > chip.seq && !c.warped);
  must(!!band && band.y < head.y && head.y - band.y < 90,
       "the signal band is no longer the next rounded box drawn after the party chip");
  // The chip label sits on a middle baseline 17px above the chip's bottom edge.
  ok(chip.y + 17 < band.y,
     `format: with a two-line name the party chip (bottom ${chip.y + 17}) collides with the signal band ` +
     `(top ${band.y}) — the identity band's height must come from whichever column is taller`);
  // A proof block whose rows would not fit must not print its heading either. An
  // orphan heading reads as a section the card meant to fill and silently could
  // not, which is a worse signal than the section simply not being there.
  const HEADS = [/^WHERE THE RECORD/, /^AND WHAT IS STILL UNTESTED$/];
  const isHead = (t) => HEADS.some((h) => h.test(t));
  for (const shot of [thick, thin, wide]) {
    shot.lines.forEach((t, i) => {
      if (!isHead(t)) return;
      const next = shot.lines[i + 1];
      ok(!!next && !isHead(next) && !/^PLEDGE RECEIPTS|^Built only from/.test(next),
         `format: '${t}' is painted with nothing under it (next run: ${JSON.stringify(next)}) — ` +
         `the heading must be drawn with the first row that fits, not before measuring it`);
    });
  }
}

// ── 6. Highlights, lowlights, and what they are drawn from ───────────────────
{
  ok(thick.d.highlights.length === 2 && thick.d.highlights.every((h) => h.token === "consistent"),
     "proof: highlights are cases where the record BACKS the word, capped at two");
  ok(thick.d.lowlights.length === 1 && thick.d.lowlights[0].token === "contradicts",
     "proof: the lowlight is the clearest contradiction — dots() sorts contradictions first, so the strongest is taken off the front");
  ok(thick.d.lowlightKind === "contradicts",
     "proof: the lowlight block knows which KIND it is showing, so its heading cannot say 'contradicts' over a mixed row");
  ok(/WHERE THE RECORD BACKS THEM UP/.test(THICK) && /WHERE THE RECORD CONTRADICTS THEM/.test(THICK),
     "proof: both directions are labelled in the reader's words");
  ok(/H\.R\. 22 · On Passage · Voted Yea/.test(THICK),
     "proof: each cited case names the FORMAL ACTION behind it — a highlight with no vote under it is an assertion");
  ok(/Gun rights/.test(THICK) && /Federal spending/.test(THICK),
     "proof: the cited cases are the issue labels PDXWordAction returned");
  // A card with agreements and no contradictions must not therefore look flawless.
  const gaps = PC._gapsOf(READS.thick);
  ok(gaps.length >= 2 && gaps.some((g) => /no matching vote/.test(g.title)) && gaps.some((g) => /still open/.test(g.title)),
     "proof: the gap list names untested positions AND open pledges, so a clean-looking record still shows what is unproven");
  ok(gaps.every((g) => !/%/.test(g.title + g.action)),
     "proof: no gap line smuggles a rate back in");
  ok(/held against no one|counts for or against/.test(gaps.map((g) => g.action).join(" ")),
     "proof: a gap says explicitly that it is not being counted against them — an unproven thing is not a mark");
}

// ── 7. The wiring ────────────────────────────────────────────────────────────
{
  const html = read("index.html");
  ok(/<script defer src="profile-card\.js"><\/script>/.test(html), "wiring: index.html loads profile-card.js");
  ok(html.indexOf("share-anywhere.js") > html.indexOf("profile-card.js"),
     "wiring: the resolver loads after the card it chooses");
  const sw = read("sw.js");
  ok(/'\/profile-card\.js'/.test(sw),
     "wiring: the service worker precaches the card, or a repeat visitor silently drops to a single-receipt share");

  const SA = read("share-anywhere.js");
  const SA_CODE = SA.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  must(/var TIERS = \{/.test(SA_CODE), "share-anywhere.js no longer declares a TIERS map");
  const tiers = SA_CODE.slice(SA_CODE.indexOf("var TIERS = {"), SA_CODE.indexOf("var _tier"));
  ok(tiers.indexOf("summary:") !== -1 && tiers.indexOf("summary:") < tiers.indexOf("record:"),
     "wiring: the summary card is the TOP tier — a whole-person share must prefer the whole read over one receipt");
  must(/function summaryFor/.test(SA_CODE), "share-anywhere.js no longer resolves the summary tier");
  const sf = SA_CODE.slice(SA_CODE.indexOf("function summaryFor"), SA_CODE.indexOf("var TIERS"));
  ok(/if \(issueKey\) return null;/.test(sf),
     "wiring: an issueKey SUPPRESSES the summary tier — a share button in a row about one bill must still send that bill");
  ok(/pc\.brief/.test(sf) && !/pc\.read/.test(sf),
     "wiring: tier resolution uses the cheap memoised brief(), not the full card build, because every list row asks on every keystroke");
  must(/function dispatch/.test(SA_CODE), "share-anywhere.js no longer has a dispatch()");
  const dsp = SA_CODE.slice(SA_CODE.indexOf("function dispatch"), SA_CODE.indexOf("function fallback"));
  ok(/st\.tier === 'summary'/.test(dsp) && /pc\.share\(st\.pid, btn\)/.test(dsp),
     "wiring: dispatch routes the summary tier to PDXProfileCard.share");
  ok(/st\.card &&/.test(dsp) && /st\.receipt &&/.test(dsp),
     "wiring: dispatch steps DOWN to a weaker artifact when the card module is missing, rather than falling all the way to a link");
  ok(/pdxsa-t-summary/.test(read("say-vs-do.css")),
     "wiring: the new tier has its own accent, so the control is not left styleless");
  ok(!/#6ee7a0|#f89b9b|--pdxsa-c:\s*rgba\(110/.test(
       read("say-vs-do.css").slice(read("say-vs-do.css").indexOf("pdxsa-t-summary"),
                                   read("say-vs-do.css").indexOf("pdxsa-t-summary") + 90)),
     "wiring: the summary tier's accent is colourless — a green rim would announce the verdict on the button before the reader saw what it rests on");
}

// ── 8. Fail-open ─────────────────────────────────────────────────────────────
{
  // Every dependency is optional, because the card is offered from surfaces that
  // load in different orders and a share that throws is worse than a thin card.
  const bare = mkCtx();
  delete bare.PDXWordAction; delete bare.PDXConsistency;
  delete bare._pdxRecordMappedCounts; delete bare._pdxPromiseTally; delete bare._pdxOfficeLine;
  vm.createContext(bare);
  new vm.Script(SRC, { filename: "profile-card.js" }).runInContext(bare);
  const BPC = bare.window.PDXProfileCard;
  ok(BPC && BPC.read("massie") === null,
     "fail-open: with PDXWordAction absent the card reports that it has nothing rather than throwing");
  ok(BPC.available("massie") === false && BPC.summaryHint("massie") === "",
     "fail-open: availability and the hint answer honestly with no engine loaded");
  let threw = false;
  try { await BPC.share("massie", null); } catch (e) { threw = true; }
  ok(!threw, "fail-open: sharing with no engine loaded resolves quietly instead of rejecting into a dead tap");

  // The memo must not outlive the record it was read from.
  must(typeof PC._bust === "function", "PDXProfileCard no longer exposes its cache-buster");
  const warmHooks = Object.keys(ctx._listeners).filter((k) => /warm|acctSpotlight/.test(k));
  ok(warmHooks.length >= 2,
     "memo: the brief cache is dropped when a record settles — otherwise a share button says 'nothing tested yet' for the rest of the session");
  ok(/share\s*=\s*function|function share\(pid, btn\)/.test(CODE) && /warm\(pid\)\.then/.test(CODE),
     "memo: share() warms the record inside the same gesture and re-reads it, so a tap from a cold profile is not needlessly thin");
}

  // ── report ─────────────────────────────────────────────────────────────────
  if (failures.length) {
    console.error("\n✗ profile card: " + failures.length + " failure(s)\n");
    failures.forEach((f) => console.error("  · " + f));
    console.error("");
    process.exit(1);
  }
  console.log("✓ profile card: all " + passed + " assertions passed");
  console.log("  1080×1350 · " + thick.lines.length + " painted lines on a deep record, " +
              thin.lines.length + " on a thin one · no percentage in either");
};

run().catch((e) => { console.error(e); process.exit(1); });
