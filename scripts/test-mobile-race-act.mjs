#!/usr/bin/env node
/**
 * test-mobile-race-act.mjs — the two comparison surfaces, at 360 to 430px
 * ─────────────────────────────────────────────────────────────────────────────
 * Compare-the-field and the act face are the two places on this site where a
 * citizen does the actual comparing, and both were laid out at 1240px. They both
 * survive the trip down to a phone — the field is a flex column below 900px, the
 * snapshot and the Overview cards are single-column below 700px, the act face
 * goes full-bleed at 640 — so this is not a rescue. It is the handful of places
 * where "it still renders" and "a thumb can use it" came apart:
 *
 *   · TARGETS. Nine interactive rules on the act face and two on the race sheet
 *     were sized for a cursor. The worst were the ledger's own topic buttons —
 *     the door into the dossier, the single most-tapped thing on the page — which
 *     were bare text with no padding, and the view filter's pills at roughly 22px.
 *   · STACKED STICKIES. The sheet header is sticky and so is each candidate's
 *     header. The lower one was pinned at a hard-coded 3.9rem against a header
 *     that measures 4.55, so it slid underneath and clipped the name it exists to
 *     keep on screen.
 *   · THE BOTTOM OF THE DEVICE. Both surfaces run edge to edge on a phone, and
 *     neither reserved anything for the home indicator, so the last candidate card
 *     and the last bag chip ended underneath it.
 *   · THE TAB ROW. Three tabs, wildly unequal labels, in a wrapping inline-flex:
 *     no clipping, but a 2 + 1 stack in which the third tab reads as an
 *     afterthought rather than a peer.
 *
 * WHAT THIS FILE IS. A small cascade: both stylesheets are parsed into rules,
 * media queries are evaluated against a given viewport width, and declarations
 * are merged in source order — so "how tall is this control at 390px" is answered
 * by the same stylesheet the browser gets, not by a grep for a number. The act
 * face's sheet is captured from the shipped module in a sandbox rather than
 * scraped out of the source, so what is measured is what ships.
 *
 * WHAT IT IS NOT. It is not a rendered layout. It cannot tell you that a label
 * wrapped badly, only that it was allowed to wrap; it cannot measure text. Where
 * a fact is only checkable as a rule rather than as a pixel, the assertion says
 * so in its own words.
 *
 *   node scripts/test-mobile-race-act.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const section = (t) => console.log(`\n  · ${t}`);
const must = (cond, msg) => {
  if (cond) { passed++; return; }
  console.error(`\n✗ mobile race + act: STALE HARNESS — ${msg}\n`);
  process.exit(2);
};

// ── The act face's stylesheet, captured from the module that ships it ────────
function shippedActCss() {
  const win = makeSandbox();
  win.document.getElementById = () => null;
  win.history = { replaceState() {}, pushState() {} };
  const sheets = [];
  const mk = win.document.createElement;
  win.document.createElement = (tag) => {
    const el = mk(tag);
    if (tag === "style") {
      // Several modules inject a sheet during boot; keep them all and pick.
      const slot = { css: "" };
      sheets.push(slot);
      Object.defineProperty(el, "textContent", {
        set(v) { slot.css = v; }, get() { return slot.css; }, configurable: true,
      });
    }
    el.addEventListener = () => {};
    return el;
  };
  const ctx = vm.createContext(win);
  for (const f of [...ENGINE_FILES, "bill-detail.js"]) {
    vm.runInContext(R(f), ctx, { filename: f });
  }
  // injectCss() runs from ensureOverlay() on the first open. A minimal client
  // stub is enough to get that far; whatever the panel does after is not our
  // business here, so the rest of the open is allowed to fail.
  win.PDXBills = { get: () => new Promise(() => {}), listSync: () => ({ items: [] }) };
  try { win.PDXBillDetail.open(1); } catch (e) { /* the sheet is already in */ }
  const mine = sheets.map((x) => x.css).filter((c) => c.includes(".bd-panel"));
  must(mine.length === 1, `expected exactly one act-face stylesheet, found ${mine.length} of ${sheets.length} injected`);
  return mine[0];
}

// ── A cascade small enough to read, big enough to be honest ──────────────────
// Rules in source order, each tagged with the media bounds it lives under.
// Nesting deeper than one @media does not occur in either sheet; if it ever
// does, must() below catches it rather than silently mis-parsing.
function parse(css, label) {
  const out = [];
  let i = 0, media = null, depth = 0, order = 0;
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  while (i < src.length) {
    const open = src.indexOf("{", i);
    if (open < 0) break;
    const head = src.slice(i, open).trim();
    if (/^@/.test(head)) {
      must(depth === 0, `${label}: nested at-rules — this parser only handles one level`);
      if (/^@media/.test(head)) {
        const mx = /max-width\s*:\s*(\d+)px/.exec(head);
        const mn = /min-width\s*:\s*(\d+)px/.exec(head);
        media = { max: mx ? +mx[1] : Infinity, min: mn ? +mn[1] : 0, head };
        depth = 1; i = open + 1; continue;
      }
      // @keyframes / @supports: skip the whole block by brace counting.
      let d = 1, k = open + 1;
      while (k < src.length && d > 0) { if (src[k] === "{") d++; else if (src[k] === "}") d--; k++; }
      i = k; continue;
    }
    const close = src.indexOf("}", open);
    if (close < 0) break;
    const decl = src.slice(open + 1, close);
    if (head) out.push({ sels: head.split(",").map((x) => x.trim()), decl, media, order: order++ });
    i = close + 1;
    if (depth === 1) {
      const nx = src.slice(i).match(/^\s*\}/);
      if (nx) { i += nx[0].length; media = null; depth = 0; }
    }
  }
  return out;
}

const RS = parse(R("race-sheet.css"), "race-sheet.css");
const BD = parse(shippedActCss(), "bill-detail injectCss");
must(RS.length > 100, `race-sheet.css parsed into ${RS.length} rules`);
must(BD.length > 100, `the act face's sheet parsed into ${BD.length} rules`);

const live = (r, w) => !r.media || (w <= r.media.max && w >= r.media.min);
// Every declaration that lands on this exact selector at this width, later
// winning. Equal-specificity only, which is all either sheet uses for layout.
function computed(rules, sel, w) {
  const box = {};
  rules.filter((r) => live(r, w) && r.sels.includes(sel)).forEach((r) => {
    r.decl.split(";").forEach((d) => {
      const c = d.indexOf(":");
      if (c > 0) box[d.slice(0, c).trim()] = d.slice(c + 1).trim();
    });
  });
  return box;
}
const px = (v) => {
  if (v == null) return NaN;
  const m = /^([\d.]+)(px|rem)$/.exec(String(v).trim());
  return m ? (m[2] === "rem" ? +m[1] * 16 : +m[1]) : NaN;
};
const pad = (box, side) => {
  const one = box["padding-" + side];
  if (one != null) return px(one);
  const all = box.padding;
  if (all == null) return 0;
  const p = all.trim().split(/\s+/).map(px);
  if (p.some(Number.isNaN)) return NaN;
  const top = p[0], bottom = p.length >= 3 ? p[2] : p[0];
  return side === "top" ? top : bottom;
};
// The height a finger meets: an explicit min-height or height if there is one,
// otherwise the box the padding and the line make. Deliberately generous — if
// this over-estimates and the assertion still fails, the target is genuinely
// too small.
function targetPx(rules, sel, w) {
  const box = computed(rules, sel, w);
  const mh = px(box["min-height"]);
  if (!Number.isNaN(mh)) return mh;
  const h = px(box.height);
  if (!Number.isNaN(h)) return h;
  let fs = 16, lh = 1.3;
  const shand = /(?:^|\s)([\d.]+)rem\s*\/\s*([\d.]+)/.exec(box.font || "");
  if (shand) { fs = +shand[1] * 16; lh = +shand[2]; }
  else if (box["font-size"]) {
    fs = px(box["font-size"]) || 16;
    if (box["line-height"]) lh = parseFloat(box["line-height"]) || lh;
  }
  const t = pad(box, "top"), b = pad(box, "bottom");
  return (Number.isNaN(t) ? 0 : t) + (Number.isNaN(b) ? 0 : b) + fs * lh;
}
// Anything the sheet itself declares to be a pointer target.
const pointers = (rules, prefix) => [...new Set(
  rules.filter((r) => /cursor\s*:\s*pointer/.test(r.decl))
    .flatMap((r) => r.sels)
    .filter((s) => s.startsWith(prefix) && !/[:[]/.test(s))
)];

const PHONES = [360, 390, 414, 430];
console.log(`\n📱 mobile race + act — ${RS.length} race rules, ${BD.length} act rules, at ${PHONES.join("/")}px`);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · every pointer on both surfaces is 44px on a phone");
// ═════════════════════════════════════════════════════════════════════════════
{
  const RS_TARGETS = pointers(RS, ".rs-");
  const BD_TARGETS = pointers(BD, ".bd-");
  ok(RS_TARGETS.length >= 10, `the race sheet declares a real set of targets (${RS_TARGETS.length})`);
  ok(BD_TARGETS.length >= 8, `the act face declares a real set of targets (${BD_TARGETS.length})`);
  for (const w of PHONES) {
    for (const [name, rules, sels] of [["race sheet", RS, RS_TARGETS], ["act face", BD, BD_TARGETS]]) {
      const small = sels
        .map((s) => ({ s, h: targetPx(rules, s, w) }))
        .filter((x) => !(x.h >= 44));
      eq(small.length, 0,
        `${w}px, ${name}: ${small.map((x) => `${x.s} is ${Math.round(x.h)}px`).join(", ")} — under the 44px this pass promises`);
    }
  }
  // The two that motivated the pass, named so a regression says which one.
  eq(targetPx(BD, ".bd-vf-btn", 390) >= 44, true, "the topic filter's pills are tappable");
  eq(targetPx(BD, ".bd-omni-link", 390) >= 44, true, "the ledger's dossier door is tappable");
  // The three doors this pass added: the prose fold, the roll-call drawer, and
  // the drawer's own position filter. Every one of them is a thumb target now.
  eq(targetPx(BD, ".bd-fold-sum", 390) >= 44, true, "the prose fold opens with a real target");
  eq(targetPx(BD, ".bd-roll-sum", 390) >= 44, true, "the roll-call drawer opens with a real target");
  eq(targetPx(BD, ".bd-rf-btn", 390) >= 44, true, "the roll-call filter's pills are tappable");
  eq(targetPx(BD, ".bd-close", 390) >= 44, true, "the act face closes with a real target");
  eq(targetPx(RS, ".rs-name", 390) >= 44, true, "a candidate's name opens their profile with a real target");
  // Desktop keeps its own smaller chrome — this was a phone problem, and the fix
  // is scoped to phones rather than inflating every control everywhere.
  ok(targetPx(BD, ".bd-vf-btn", 1200) < 44, "the desktop filter pill was needlessly inflated too");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the two sticky headers stack instead of overlapping");
// ═════════════════════════════════════════════════════════════════════════════
{
  const hd = computed(RS, ".rs-hd", 390);
  eq(hd.position, "sticky", "the sheet header is still the sticky one");
  eq(hd.top, "0", "…pinned to the top of the scroller");
  const panehd = computed(RS, ".rs-panehd", 390);
  eq(panehd.position, "sticky", "the candidate header is still sticky on a phone");
  // Its offset must be the measured header height, not a literal.
  ok(/var\(--rs-hd-h/.test(panehd.top || ""),
    `the candidate header pins to a hard-coded offset (${panehd.top}) instead of the header's own height`);
  const declared = px(computed(RS, ".rs-sheet", 390)["--rs-hd-h"]);
  ok(!Number.isNaN(declared), "the header height is not written down anywhere");
  // Recompute it from the header's own rules: padding twice over the tallest
  // child, which is the 44px close button.
  const close = Math.max(px(computed(RS, ".rs-close", 390)["min-height"]) || 0,
                         px(computed(RS, ".rs-hd-ico", 390).height) || 0);
  const real = pad(hd, "top") + pad(hd, "bottom") + close;
  ok(declared >= real,
    `--rs-hd-h is ${declared}px but the header measures ${real}px — the candidate header will tuck underneath it`);
  ok(declared <= real + 16, `--rs-hd-h is ${declared}px against a ${real}px header — that is a visible gap, not a clearance`);
  // Side by side, the pane header stops being sticky at all, so none of this
  // applies and nothing above needs a desktop equivalent.
  eq(computed(RS, ".rs-panehd", 1200).position, "static", "the pane header is still static side by side");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · nothing ends underneath the hardware");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const w of PHONES) {
    const sheet = computed(RS, ".rs-sheet", w);
    const bottom = sheet["padding-bottom"] || sheet.padding || "";
    ok(/env\(safe-area-inset-bottom/.test(bottom),
      `${w}px: the race sheet reserves nothing for the home indicator (${bottom})`);
    const scroll = computed(BD, ".bd-scroll", w);
    const bd = scroll["padding-bottom"] || scroll.padding || "";
    ok(/env\(safe-area-inset-bottom/.test(bd),
      `${w}px: the act face reserves nothing for the home indicator (${bd})`);
  }
  // The pattern is the app's own — same function, same 0px fallback, as the
  // profile deck and the modal footer already use.
  const APP = R("app.css");
  ok(/env\(safe-area-inset-bottom,\s*0px\)/.test(APP), "the app-wide safe-area pattern moved or changed shape");
  // Full-bleed on a phone means the sheet's own height is the viewport's, and
  // 100vh is the wrong viewport when a URL bar is in play.
  const panel = computed(BD, ".bd-panel", 390);
  ok(/dvh/.test(panel["max-height"] || ""),
    `the act panel is ${panel["max-height"]} tall on a phone — 100vh hides its own bottom behind the URL bar`);
  ok(/100vh/.test((BD.filter((r) => r.sels.includes(".bd-panel")).map((r) => r.decl).join(";")) || ""),
    "there is no 100vh fallback left for a browser that cannot parse dvh");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the tab row: three peers, no clipping, no sideways");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const w of [360, 390]) {
    const modes = computed(RS, ".rs-modes", w);
    eq(modes.display, "grid", `${w}px: the tab row is not a three-column grid`);
    eq(modes["grid-template-columns"], "repeat(3, 1fr)", `${w}px: the three tabs are not equal width`);
    eq(modes.width, "100%", `${w}px: the tab row does not use the width it has`);
    for (const sel of [".rs-vtab", ".rs-mode"]) {
      const t = computed(RS, sel, w);
      eq(t["white-space"], "normal", `${w}px: ${sel} still refuses to wrap, so a long label overflows its column`);
      ok(targetPx(RS, sel, w) >= 44, `${w}px: ${sel} is under 44px`);
    }
  }
  // Overview is a peer of the two rulers, not a third-class control: same size,
  // same shape, and the class that means "can order the field" is still only on
  // the two that can.
  for (const w of [360, 1200]) {
    const a = computed(RS, ".rs-vtab", w), b = computed(RS, ".rs-mode", w);
    eq(a["min-height"], b["min-height"], `${w}px: the Overview tab is a different height from the rulers`);
    eq(a["font-size"], b["font-size"], `${w}px: the Overview tab is a different size from the rulers`);
  }
  // A ruler that cannot rank still has to read as gated at arm's length.
  const gated = computed(RS, ".rs-mode.is-gated", 390);
  ok(Object.keys(gated).length >= 2,
    "the gated ruler's only phone cue is the desktop one (dimmed italic), which reads as nothing at 0.78rem");
  ok(/dashed/.test(gated["border-style"] || "") || /rgba\(251, 191, 36/.test(gated["border-color"] || ""),
    "the gated tab carries no visible edge cue on a phone");
  ok(!/display\s*:\s*none/.test(JSON.stringify(gated)), "a gated ruler is hidden rather than dimmed");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · one column, and no sideways mystery");
// ═════════════════════════════════════════════════════════════════════════════
{
  for (const w of PHONES) {
    eq(computed(RS, ".rs-grid", w).display, "flex", `${w}px: the ranked field is not a stacked column`);
    eq(computed(RS, ".rs-grid", w)["flex-direction"], "column", `${w}px: the ranked field does not stack`);
    eq(computed(RS, ".rs-ovgrid", w)["grid-template-columns"], "1fr", `${w}px: the Overview cards are not full width`);
    eq(computed(RS, ".rs-snap-cells", w)["grid-template-columns"], "1fr", `${w}px: the snapshot cells are not stacked`);
    // Every wrapping strip on both surfaces genuinely wraps rather than running off.
    for (const [rules, sel] of [[RS, ".rs-ctx-chips"], [RS, ".rs-ovpeek"], [RS, ".rs-ovacts"],
                                [BD, ".bd-viewfilter"], [BD, ".bd-lh-chips"],
                                [BD, ".bd-rf"], [BD, ".bd-rf-pills"]]) {
      eq(computed(rules, sel, w)["flex-wrap"], "wrap", `${w}px: ${sel} does not wrap`);
    }
  }
  // NO CRITICAL CONTROL IN AN UNCUED SIDEWAYS SCROLLER. Both sheets are allowed
  // horizontal scroll — the race sheet uses it for true side-by-side panes — but
  // only above the phone range.
  for (const [name, rules] of [["race sheet", RS], ["act face", BD]]) {
    const sideways = rules.filter((r) => /overflow-x\s*:\s*(auto|scroll)/.test(r.decl) && live(r, 430));
    eq(sideways.length, 0,
      `${name}: ${sideways.map((r) => r.sels.join(",")).join(" / ")} scrolls sideways on a phone with no peek cue`);
  }
  // …and it is still there where it belongs.
  ok(RS.some((r) => /overflow-x\s*:\s*auto/.test(r.decl) && live(r, 1200)),
    "side-by-side panes lost their horizontal track on a wide screen");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the act face hides nothing to fit");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The whole point of the Big Picture work is that a phone gets the same topic
  // map a desktop does. A mobile-only display:none on any of it would undo that
  // silently, so the phone block is checked for the vocabulary of hiding.
  const phoneOnly = BD.filter((r) => r.media && r.media.max <= 640);
  ok(phoneOnly.length >= 8, `the act face's phone block parsed (${phoneOnly.length} rules)`);
  for (const r of phoneOnly) {
    const sel = r.sels.join(",");
    ok(!/display\s*:\s*none/.test(r.decl), `${sel} is hidden on a phone`);
    // A max-height in viewport units is the panel sizing itself to the device,
    // not content being folded away; anything else caps what can be read.
    const caps = /(max-height\s*:\s*[^;]+)/.exec(r.decl);
    ok(!caps || /\d+(dvh|vh|svh)/.test(caps[1]), `${sel} caps its own content at ${caps && caps[1]}`);
    ok(!/line-clamp|content-visibility/.test(r.decl), `${sel} is clamped on a phone`);
  }
  // Same question of the race sheet's phone block.
  for (const r of RS.filter((x) => x.media && x.media.max <= 640)) {
    const sel = r.sels.join(",");
    ok(!/display\s*:\s*none/.test(r.decl) || /rs-share-txt/.test(sel),
      `${sel} is hidden on a phone`);
    ok(!/line-clamp|content-visibility/.test(r.decl), `${sel} is clamped on a phone`);
  }
  // The two filter rules that DO hide are the reader's own choice, and they are
  // width-independent: the same two rules, keyed to the same attribute, at every
  // size. A phone must not get a third.
  const hiders = BD.filter((r) => /display\s*:\s*none/.test(r.decl) && r.sels.some((s) => s.includes("bd-omni-row")));
  eq(hiders.length, 2, "the ledger's filter is no longer exactly two rules");
  ok(hiders.every((r) => !r.media), "the ledger's filter behaves differently on a phone");
  ok(hiders.every((r) => /data-bd-view="(main|other)"/.test(r.sels.join(","))),
    "a ledger row is hidden by something other than the view the reader chose");
  // WHAT IS ALLOWED TO BE FOLDED, AND WHAT IS NOT. Two things on this face ship
  // closed: the section-by-section prose, and a roll call's list of names. Both
  // are the reader's own tap away and both are native <details>, so they work
  // with no JS and find-in-page reaches them once open. Nothing else folds —
  // and in particular the topic ledger and the one-instrument sentence under it
  // are never a tap away, because they are the point of the face.
  const SRC = R("bill-detail.js");
  const note = SRC.slice(SRC.indexOf("function coTravelSection"), SRC.indexOf("  var POS_SLOTS"));
  must(note.length > 400, "coTravelSection moved");
  ok(!/<details|hidden|aria-expanded/.test(note),
    "the one-instrument sentence ships collapsed, so the fact that made the panel worth keeping is a tap away");
  const ledger = SRC.slice(SRC.indexOf("function omnibusSection"), SRC.indexOf("function coTravelSection"));
  must(ledger.length > 400, "omnibusSection moved");
  ok(!/<details/.test(ledger), "the topic ledger ships collapsed");
  // The two that do fold, folded the honest way: a real disclosure element with
  // no `open` attribute, rather than CSS that hides text from find-in-page too.
  for (const [what, mark] of [["the prose fold", '<details class="bd-fold">'],
                              ["the roll-call drawer", '<details class="bd-rolldrop">']]) {
    ok(SRC.includes(mark), `${what} is not a native closed <details>`);
  }
  // A closed drawer is not a truncation: every member row is still built, so no
  // count on this face is computed from what happens to be on screen.
  ok(/var rows = '';/.test(SRC) && !/slice\(0,\s*\d+\)/.test(SRC.slice(SRC.indexOf("function rollcallsSection"),
    SRC.indexOf("function statusLabelResult"))),
    "the roll list is being truncated rather than folded");
  for (const cls of [".bd-onebag", ".bd-onebag-l", ".bd-fold", ".bd-fold-sum", ".bd-rolldrop",
                     ".bd-roll-sum", ".bd-rf", ".bd-rf-btn", ".bd-rf-in"]) {
    ok(BD.some((r) => r.sels.includes(cls)), `the new chrome is unstyled (${cls})`);
  }
  // The drawer's own filters hide rows, and like the ledger's they are the
  // reader's choice: width-independent, keyed to an attribute the reader set,
  // and never touching a row the reader did not filter out.
  const rollHiders = BD.filter((r) => /display\s*:\s*none/.test(r.decl) && r.sels.some((x) => x.includes("bd-vote-row")));
  ok(rollHiders.length >= 2, "the roll-call filter no longer hides anything, so it does nothing");
  ok(rollHiders.every((r) => !r.media), "the roll-call filter behaves differently on a phone");
  ok(rollHiders.every((r) => /data-bd-roll-view=|bd-vhide/.test(r.sels.join(","))),
    "a member row is hidden by something other than the filter or the search the reader used");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the snapshot cell keeps its own label off its own arrow");
// ═════════════════════════════════════════════════════════════════════════════
{
  const arrow = computed(RS, ".rs-snap-go", 390);
  eq(arrow.position, "absolute", "the snapshot arrow is no longer positioned over the cell");
  const right = px(arrow.right);
  const cell = computed(RS, ".rs-snap-cell:not(.is-empty)", 390);
  const reserved = px(cell["padding-right"]);
  ok(!Number.isNaN(reserved),
    "a snapshot cell with a door reserves no room for the arrow, so a long name runs underneath it");
  ok(reserved > right, `the reserved column (${reserved}px) is narrower than the arrow's offset (${right}px)`);
  // Only the cells that have an arrow pay for it.
  ok(Number.isNaN(px(computed(RS, ".rs-snap-cell.is-empty", 390)["padding-right"])),
    "an empty cell reserves room for an arrow it does not have");
  // It is still a door, and still 44px.
  ok(targetPx(RS, ".rs-snap-cell", 390) >= 44, "the snapshot cell is under 44px");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the running order a phone actually meets");
// ═════════════════════════════════════════════════════════════════════════════
{
  // A phone renders one column, so declaration order IS the hierarchy. Race
  // first, then the control that reshapes it, then the view.
  const SRC = R("race-sheet.js");
  const body = SRC.slice(SRC.indexOf("function bodyHtml"), SRC.indexOf("function ensureOverlay"));
  must(body.length > 1000, "bodyHtml moved");
  const code = body.replace(/^\s*\/\/.*$/gm, "");
  for (const [branch, from] of [["overview", code.indexOf("if (view === 'overview')")], ["ranked", code.lastIndexOf("return head +")]]) {
    const seg = code.slice(from, from + 1400);
    const ictx = seg.indexOf("ctx +");
    const itabs = seg.indexOf('rs-controls');
    ok(ictx >= 0 && itabs >= 0, `${branch}: the context strip or the tab row is no longer in this branch`);
    ok(ictx < itabs, `${branch}: the tabs are declared before the race they reshape`);
  }
  // The thin-axis disclosure stays inside the control block, under the rank line.
  const ranked = code.slice(code.lastIndexOf("return head +"));
  const iRank = ranked.indexOf("rankLine +");
  const iThin = ranked.indexOf("thinAxisNote(");
  const iPanes = ranked.indexOf("panes +");
  ok(iRank >= 0 && iThin > iRank && iThin < iPanes,
    "the thin-axis note no longer sits between the rank line and the field it qualifies");
  // And the act face still leads with the ledger, then the bag.
  const BDSRC = R("bill-detail.js").replace(/^\s*\/\/.*$/gm, "");
  const io = BDSRC.indexOf("omnibusSection(m, issues) +");
  const ib = BDSRC.indexOf("coTravelSection(m, issues, data.rollcalls) +");
  must(io > 0 && ib > 0, "the act face's section assembly moved");
  ok(ib > io, "the one-instrument note no longer follows the topic ledger it qualifies");
  ok(ib - io < 120, "the one-instrument note drifted away from the ledger it belongs to");
  // And the census leads the face: letterhead, then the folded prose, then
  // everything else. On a phone this order IS the hierarchy.
  const ilh = BDSRC.indexOf("letterheadHtml(m, issues, data) +");
  const ifold = BDSRC.indexOf("foldSection(m) +");
  must(ilh > 0 && ifold > 0, "the letterhead or the prose fold left the assembly");
  ok(ilh < ifold, "the prose is assembled before the census it used to bury");
  ok(ifold < io, "the prose fold is assembled after the topic ledger instead of under the census");
}

// ═════════════════════════════════════════════════════════════════════════════
if (failures.length) {
  console.error(`\n✗ mobile race + act: ${failures.length} failed, ${passed} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\n✓ mobile race + act: all ${passed} assertions passed — both surfaces usable at 360px, nothing hidden to get there\n`);
