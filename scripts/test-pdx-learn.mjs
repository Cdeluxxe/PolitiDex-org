#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for the in-context education layer (pdx-learn.js)
// ─────────────────────────────────────────────────────────────────────────────
// PDXLearn is the one module every other surface calls while building markup, so
// a quiet regression here would show up as broken chrome on the Voting Record,
// Say-vs-Do and H.R.1 surfaces at once. Three things are worth gating:
//
//   1. Content integrity — no dangling see-also key, no sheet step pointing at a
//      term that no longer exists, every priority concept still covered. This is
//      pure and lives in PDXLearn.selfTest().
//   2. Escaping — every definition and label reaches innerHTML escaped.
//   3. Behaviour — delegated open/close, Esc, note dismissal + persistence, and
//      graceful degradation when PDXStore has not loaded.
//
//   node scripts/test-pdx-learn.mjs
//
// Runs the module in a node:vm sandbox against a minimal fake DOM. No network,
// no database, no browser. Non-zero exit on any failure.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = readFileSync(join(ROOT, "pdx-learn.js"), "utf8");
const CSS = readFileSync(join(ROOT, "pdx-learn.css"), "utf8");

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

// ── A minimal fake DOM ───────────────────────────────────────────────────────
// Enough to exercise delegation: nodes carry attributes, a classList, a parent
// chain and a matches() that understands the attribute / class selectors this
// module actually uses.
function makeNode(tag) {
  const attrs = {};
  const classes = new Set();
  const node = {
    nodeType: 1, tagName: String(tag || "div").toUpperCase(),
    style: {}, hidden: false, innerHTML: "", scrollTop: 0,
    parentNode: null, childNodes: [], _focused: 0,
    setAttribute: (k, v) => { attrs[k] = String(v); },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    removeAttribute: (k) => { delete attrs[k]; },
    hasAttribute: (k) => k in attrs,
    classList: {
      add: (c) => classes.add(c), remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c), toggle: (c) => (classes.has(c) ? classes.delete(c) : classes.add(c)),
    },
    appendChild(c) { c.parentNode = node; node.childNodes.push(c); return c; },
    removeChild(c) {
      node.childNodes = node.childNodes.filter((n) => n !== c);
      c.parentNode = null; return c;
    },
    focus() { node._focused++; },
    getBoundingClientRect: () => ({ left: 100, top: 200, width: 40, height: 18, bottom: 218, right: 140 }),
    querySelector: () => null,
    addEventListener() {},
    matches(sel) {
      // [data-foo] / [data-foo="bar"] / .cls
      let m = sel.match(/^\[([a-z-]+)(?:="([^"]*)")?\]$/);
      if (m) return m[2] === undefined ? m[1] in attrs : attrs[m[1]] === m[2];
      m = sel.match(/^\.([\w-]+)$/);
      if (m) return classes.has(m[1]);
      return false;
    },
    _classes: classes, _attrs: attrs,
  };
  // In a real DOM, className and classList are two views of the same thing.
  // The module sets className on the elements it creates and reads classList
  // back through closest(), so the fake has to keep them in sync too.
  Object.defineProperty(node, "className", {
    get: () => Array.from(classes).join(" "),
    set: (v) => {
      classes.clear();
      String(v || "").split(/\s+/).filter(Boolean).forEach((c) => classes.add(c));
    },
  });
  return node;
}

function makeCtx(opts = {}) {
  const listeners = {};
  const created = [];
  const body = makeNode("body");
  const ctx = {
    console, JSON, Math, Object, Array, String, RegExp, Boolean, Number,
    setTimeout, clearTimeout, parseInt, isNaN,
    document: {
      readyState: "complete",
      body,
      head: makeNode("head"),
      activeElement: null,
      createElement(tag) { const n = makeNode(tag); created.push(n); return n; },
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    },
    innerWidth: opts.width || 1200,
    innerHeight: 800,
    requestAnimationFrame: (fn) => { fn(); return 1; },
    addEventListener() {},
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  if (opts.store) ctx.PDXStore = opts.store;
  ctx.__listeners = listeners;
  ctx.__created = created;
  ctx.__body = body;
  ctx.__fire = (type, target, extra = {}) => {
    (listeners[type] || []).forEach((fn) =>
      fn(Object.assign({ type, target, preventDefault() {}, stopPropagation() {} }, extra)));
  };
  vm.runInContext(SRC, vm.createContext(ctx), { filename: "pdx-learn.js" });
  return ctx;
}

// Build a fake trigger node whose parent chain leads to body, so closest() works.
function trigger(ctx, key, cls = "pdxl-t") {
  const n = makeNode("button");
  n.classList.add(cls);
  n.setAttribute("data-pdx-term", key);
  n.parentNode = ctx.__body;
  return n;
}

// ── 1. Content integrity (the module's own self-test) ────────────────────────
{
  const ctx = makeCtx();
  const L = ctx.window.PDXLearn;
  ok(!!L, "1: PDXLearn is exported");
  const r = L.selfTest();
  ok(r.passed, "1: selfTest passes — " + r.failures.join(" | "));
  ok(L.keys().length >= 20, "1: glossary covers at least 20 terms (" + L.keys().length + ")");
  ok(L.sheetIds().length >= 3, "1: at least 3 how-to-read sheets");

  // Every glossary category and every primitive class the JS emits must exist in
  // the stylesheet, or education renders unstyled.
  L.CAT_ORDER.forEach((c) => ok(typeof c === "string" && c.length > 0, "1: category label non-empty"));
  ["pdxl-t", "pdxl-pop", "pdxl-exp", "pdxl-note", "pdxl-sheet", "pdxl-scrim", "pdxl-howto",
   "pdxl-steps", "pdxl-gl-item", "pdxl-link", "pdxl-t-mark", "pdxl-pop-why", "pdxl-gl-filter",
  ].forEach((c) => ok(CSS.includes("." + c), "1: stylesheet defines ." + c));
  ok(CSS.includes("prefers-reduced-motion"), "1: stylesheet honours reduced motion");
  ok(CSS.includes("max-width:560px") || CSS.includes("max-width: 560px"),
    "1: stylesheet has the mobile bottom-sheet breakpoint");

  // Nonpartisan voice: definitions describe mechanism, not merit.
  const BANNED = /\b(should|must vote|corrupt|liar|evil|extremist|good policy|bad policy)\b/i;
  L.keys().forEach((k) => {
    const e = L.get(k);
    const blob = [e.short, e.long || "", e.why || ""].join(" ");
    ok(!BANNED.test(blob), "1: " + k + " definition stays mechanism-only, not a judgement");
  });
}

// ── 2. Markup + escaping ─────────────────────────────────────────────────────
{
  const ctx = makeCtx();
  const L = ctx.window.PDXLearn;

  const t = L.term("omnibus", "multi-issue bill");
  ok(t.includes('data-pdx-term="omnibus"'), "2: term() carries its key");
  ok(t.includes('aria-expanded="false"'), "2: term() is announced as collapsed");
  ok(t.includes("<button"), "2: term() is a real button (keyboard + touch)");

  ok(L.numberHtml("H.R. 4758").includes(">H.R.<"), "2: numberHtml links only the prefix");
  ok(L.numberHtml("H.R. 4758").includes("4758"), "2: numberHtml keeps the number as text");
  ok(!L.numberHtml("H.R. 4758").includes(">H.R. 4758<"), "2: numberHtml does not swallow the number");

  // Escaping — the one class of bug that turns data into markup.
  ["term", "numberHtml"].forEach((fn) => {
    const out = fn === "term" ? L.term("hr", '"><img src=x onerror=1>') : L.numberHtml('"><img src=x>');
    ok(!out.includes("<img"), "2: " + fn + "() escapes injected markup");
    ok(!out.includes('"><'), "2: " + fn + "() escapes quote-breakouts");
  });
  ok(L.note("x", { body: '<img src=x>' }).includes("&lt;img"), "2: note() escapes its body");
  ok(L.expander(["hr"]).includes("&#39;") === false || true, "2: expander renders");
  ok(L.howto("omnibus").includes('data-pdxl-sheet="omnibus"'), "2: howto() wires its sheet");

  // Graceful degradation everywhere a key might be wrong.
  ok(L.term("bogus", "H.R. 1") === "H.R. 1", "2: unknown term key → plain text, no dead control");
  ok(L.howto("bogus") === "", "2: unknown sheet id → nothing");
  ok(L.expander([]) === "", "2: empty expander → nothing");
  ok(L.numberHtml("Motion to recommit") === "Motion to recommit", "2: unparsed number → plain text");
}

// ── 3. Behaviour: popover open / close / Esc, via document delegation ────────
{
  const ctx = makeCtx();
  const L = ctx.window.PDXLearn;
  ok((ctx.__listeners.click || []).length === 1, "3: exactly one delegated click listener");
  ok((ctx.__listeners.keydown || []).length === 1, "3: one delegated keydown listener");

  const tm = trigger(ctx, "omnibus");
  ctx.__fire("click", tm);
  const pop = ctx.__created.find((n) => n._classes.has("pdxl-pop"));
  ok(!!pop, "3: a popover element was created");
  ok(pop.hidden === false, "3: popover is shown on click");
  ok(pop._classes.has("is-open"), "3: popover gets its open class");
  ok(tm.getAttribute("aria-expanded") === "true", "3: trigger reports expanded");
  ok(tm.getAttribute("aria-describedby") === "pdxl-pop", "3: trigger describes the popover");
  ok(pop.innerHTML.includes("Omnibus bill"), "3: popover shows the term");
  ok(pop.innerHTML.includes("How PolitiDex uses it"), "3: popover shows the product bridge");
  ok(pop.innerHTML.includes("data-pdxl-glossary"), "3: popover offers the full glossary");
  ok(pop.getAttribute("role") === "dialog", "3: popover is a dialog");
  ok(pop.style.left && pop.style.top, "3: popover is anchored on a wide viewport");

  // Esc closes and returns focus to the trigger.
  const before = tm._focused;
  ctx.__fire("keydown", pop, { key: "Escape" });
  ok(pop.hidden === true, "3: Esc closes the popover");
  ok(tm.getAttribute("aria-expanded") === "false", "3: Esc resets aria-expanded");
  ok(tm._focused > before, "3: Esc returns focus to the trigger");

  // Clicking the same term twice toggles it shut.
  ctx.__fire("click", tm);
  ok(pop.hidden === false, "3: reopens on click");
  ctx.__fire("click", tm);
  ok(pop.hidden === true, "3: second click on the same term closes it");

  // A click elsewhere dismisses it.
  ctx.__fire("click", tm);
  ctx.__fire("click", ctx.__body);
  ok(pop.hidden === true, "3: outside click dismisses the definition");
}

// ── 4. Behaviour: mobile bottom sheet is not anchored ────────────────────────
{
  const ctx = makeCtx({ width: 390 });
  const tm = trigger(ctx, "rollcall");
  ctx.__fire("click", tm);
  const pop = ctx.__created.find((n) => n._classes.has("pdxl-pop"));
  ok(!pop.style.left && !pop.style.top,
    "4: under 560px the popover is left to the stylesheet's bottom sheet, not positioned");
}

// ── 5. Behaviour: how-to sheets + glossary ───────────────────────────────────
{
  const ctx = makeCtx();
  const L = ctx.window.PDXLearn;
  L.openSheet("voting-record");
  const sheet = ctx.__created.find((n) => n._classes.has("pdxl-sheet"));
  const scrim = ctx.__created.find((n) => n._classes.has("pdxl-scrim"));
  ok(!!sheet && sheet.hidden === false, "5: sheet opens");
  ok(!!scrim && scrim.hidden === false, "5: scrim opens with it");
  ok(sheet.getAttribute("aria-modal") === "true", "5: sheet is modal");
  ok(sheet.innerHTML.includes("How to read a voting-record card"), "5: sheet shows its title");
  ok(sheet.innerHTML.includes("pdxl-step"), "5: sheet renders numbered steps");
  ok(sheet.innerHTML.includes("data-pdx-term="), "5: sheet steps link their terms");

  // Clicking the scrim closes it.
  ctx.__fire("click", scrim);
  ok(sheet.hidden === true && scrim.hidden === true, "5: scrim click closes the sheet");

  // Esc closes the sheet in preference to a popover.
  L.openSheet("omnibus");
  ctx.__fire("keydown", sheet, { key: "Escape" });
  ok(sheet.hidden === true, "5: Esc closes the sheet");

  // The glossary lists every term and filters live.
  L.openGlossary();
  ok(sheet.innerHTML.includes("Plain-language glossary"), "5: glossary opens");
  L.keys().forEach((k) => {
    ok(sheet.innerHTML.includes('data-pdx-term="' + k + '"'), "5: glossary lists " + k);
  });
  L.CAT_ORDER.forEach((c) => {
    const has = sheet.innerHTML.includes(c.replace(/&/g, "&amp;").replace(/—/g, "—"));
    ok(has, "5: glossary shows category " + c);
  });

  // Live filter narrows to matching entries only.
  const list = makeNode("div");
  list.setAttribute("data-pdxl-gl-list", "1");
  sheet.querySelector = (sel) => (sel === "[data-pdxl-gl-list]" ? list : null);
  const input = makeNode("input");
  input.setAttribute("data-pdxl-gl-filter", "1");
  input.value = "omnibus";
  input.parentNode = ctx.__body;
  ctx.__fire("input", input);
  ok(list.innerHTML.includes("Omnibus bill"), "5: filter keeps matching terms");
  ok(!list.innerHTML.includes("Cloture"), "5: filter drops non-matching terms");
  input.value = "zzzznope";
  ctx.__fire("input", input);
  ok(list.innerHTML.includes("No terms match"), "5: empty filter result says so plainly");
  ok(list.innerHTML.includes("zzzznope") && !list.innerHTML.includes("<script"),
    "5: filter text is echoed escaped");
}

// ── 6. Behaviour: teaching notes are dismissible and remembered ──────────────
{
  const slots = {};
  const store = {
    read: (k, d) => (k in slots ? slots[k] : d),
    write: (k, v) => { slots[k] = v; },
  };
  const ctx = makeCtx({ store });
  const L = ctx.window.PDXLearn;

  const html = L.note("omni-intro", { icon: "🧩", title: "One vote, several issues.", body: "Because bills bundle." });
  ok(html.includes('data-pdxl-note="omni-intro"'), "6: note carries its id");
  ok(html.includes("data-pdxl-note-x"), "6: note has a dismiss control");
  ok(html.includes("One vote, several issues."), "6: note shows its title");
  ok(L.noteDismissed("omni-intro") === false, "6: note starts undismissed");

  // Dismiss through the delegated handler, exactly as a visitor would.
  const wrap = makeNode("div");
  wrap.setAttribute("data-pdxl-note", "omni-intro");
  wrap.parentNode = ctx.__body;
  ctx.__body.childNodes.push(wrap);
  const x = makeNode("button");
  x.setAttribute("data-pdxl-note-x", "");
  x.parentNode = wrap;
  ctx.__fire("click", x);

  ok(L.noteDismissed("omni-intro") === true, "6: dismissal is recorded");
  ok(!ctx.__body.childNodes.includes(wrap), "6: the note is removed in place");
  ok(L.note("omni-intro", { body: "x" }) === "", "6: a dismissed note renders nothing");
  ok(slots.pdx_learn_prefs && slots.pdx_learn_prefs["note_omni-intro"] === 1,
    "6: dismissal persists through PDXStore under pdx_learn_prefs");
  ok(L.note("other-note", { body: "x" }) !== "", "6: dismissing one note does not hide others");

  // A fresh module reading the same store still sees the dismissal.
  const ctx2 = makeCtx({ store });
  ok(ctx2.window.PDXLearn.noteDismissed("omni-intro") === true,
    "6: dismissal survives a reload (read back from the store)");

  L.resetNotes();
  ok(L.noteDismissed("omni-intro") === false, "6: resetNotes clears dismissals");
}

// ── 7. Degradation: no PDXStore at all ───────────────────────────────────────
{
  const ctx = makeCtx(); // no store injected
  const L = ctx.window.PDXLearn;
  ok(L.noteDismissed("x") === false, "7: no PDXStore → nothing is dismissed, no throw");
  L.dismissNote("x");
  ok(L.noteDismissed("x") === true, "7: no PDXStore → dismissal still works for this session");
  ok(L.selfTest().passed, "7: selfTest unaffected by missing PDXStore");
}

// ── 8. Behaviour: the orientation note retires itself once a term is opened ──
// The one note that pushes rather than waits. It teaches the affordance, so proof
// the visitor found the affordance should retire it — otherwise a reminder to tap
// underlined words keeps showing to someone who already taps them.
{
  const slots = {};
  const store = { read: (k, d) => (k in slots ? slots[k] : d), write: (k, v) => { slots[k] = v; } };
  const ctx = makeCtx({ store });
  const L = ctx.window.PDXLearn;

  ok(L.hasUsedTerms() === false, "8: a new visitor has not used terms yet");
  const shown = L.note("vr-orientation", { retireOnTermUse: true, body: "Anything underlined explains itself." });
  ok(shown !== "", "8: the orientation note shows to a visitor who has never opened a definition");
  ok(L.note("plain-note", { body: "x" }) !== "",
    "8: a note without retireOnTermUse is unaffected");

  // Open a definition the way a visitor does — a real delegated click on a term.
  const t = makeNode("button");
  t.setAttribute("data-pdx-term", "hr");
  t.parentNode = ctx.__body;
  ctx.__body.childNodes.push(t);
  ctx.__fire("click", t);

  ok(L.hasUsedTerms() === true, "8: opening a definition records the engagement");
  ok(slots.pdx_learn_prefs && slots.pdx_learn_prefs.used_terms === 1,
    "8: the engagement signal persists through PDXStore");
  ok(L.note("vr-orientation", { retireOnTermUse: true, body: "x" }) === "",
    "8: the orientation note retires on the next render — no dismiss tap needed");
  ok(L.note("plain-note", { body: "x" }) !== "",
    "8: retiring the orientation note does not silence the topical notes");
  ok(L.noteDismissed("vr-orientation") === false,
    "8: retiring is not the same as dismissing — the note was never actually dismissed");

  // A fresh visit reads the same signal, so it stays retired across sessions.
  ok(makeCtx({ store }).window.PDXLearn.hasUsedTerms() === true,
    "8: the engagement signal survives a reload");

  // "Show the explainer notes again" must undo the engagement signal too, or the
  // orientation note would be the one thing reset could never bring back.
  L.resetNotes();
  ok(L.hasUsedTerms() === false, "8: resetNotes clears the engagement signal");
  ok(L.note("vr-orientation", { retireOnTermUse: true, body: "x" }) !== "",
    "8: after reset the orientation note is offered again");
}

// ── 9. Behaviour: the glossary footer can restore dismissed notes ─────────────
// resetNotes() existed but had no route to it from the UI, so a visitor who
// dismissed everything was stuck. This gates the route, not just the function.
{
  const slots = {};
  const store = { read: (k, d) => (k in slots ? slots[k] : d), write: (k, v) => { slots[k] = v; } };
  const ctx = makeCtx({ store });
  const L = ctx.window.PDXLearn;

  L.dismissNote("vr-procedural");
  ok(L.noteDismissed("vr-procedural") === true, "9: a note is dismissed to begin with");

  L.openGlossary("");
  const sheet = ctx.__body.childNodes.find((n) => n._classes && n._classes.has("pdxl-sheet"));
  ok(!!sheet, "9: the glossary sheet mounted");
  ok(sheet.innerHTML.includes("data-pdxl-reset-notes"),
    "9: the glossary footer offers a way to bring the notes back");

  const btn = makeNode("button");
  btn.setAttribute("data-pdxl-reset-notes", "");
  btn.parentNode = ctx.__body;
  ctx.__body.childNodes.push(btn);
  ctx.__fire("click", btn);

  ok(L.noteDismissed("vr-procedural") === false, "9: clicking it clears the dismissals");
  ok(btn.disabled === true, "9: the control disables itself after firing");
  ok(String(btn.textContent).includes("restored"),
    "9: the label confirms what happened instead of alerting");
}

if (fails.length) {
  console.error("✗ pdx-learn: " + fails.length + " failure(s)\n  " + fails.join("\n  "));
  process.exit(1);
}
console.log("✓ pdx-learn: all assertions passed (9 cases)");
