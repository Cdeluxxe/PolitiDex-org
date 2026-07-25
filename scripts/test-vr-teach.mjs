#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Voting Record teaching-note priority — never two notes, never a nag
// ─────────────────────────────────────────────────────────────────────────────
// Three notes can want the one slot above the record list: the first-run
// orientation note, the omnibus note, and the procedural note. The rule is that
// exactly one may show, chosen general → specific, and that a note which has been
// dismissed (or has retired itself) hands the slot to the next one on the NEXT
// visit rather than stacking underneath. Two stacked notes stop reading as help
// and start reading as an onboarding wall, which is the specific failure this
// gates against.
//
//   node scripts/test-vr-teach.mjs
//
// Loads pdx-learn.js + voting-record.js in a node:vm sandbox against a minimal
// fake DOM and drives the pure resolver (window._vrTeachHtml). No network, no DB.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const noopEl = () => ({
  style: {}, textContent: "", innerHTML: "",
  setAttribute() {}, appendChild() {}, addEventListener() {},
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  querySelector: () => null, querySelectorAll: () => [],
});

// A fresh sandbox per scenario, sharing one prefs store when asked, so a
// dismissal in one render is visible to the next exactly as it would be live.
// withLearn=false simply never loads pdx-learn.js — the faithful model of a
// visitor whose education layer failed to arrive.
function load(store, withLearn) {
  const ctx = {
    console, JSON, Math, Date, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
    Promise, String, Array, Object, RegExp, parseInt, parseFloat, isNaN,
    encodeURIComponent, decodeURIComponent,
    requestAnimationFrame: (f) => setTimeout(f, 0), fetch: () => new Promise(() => {}),
    location: { href: "/", search: "" }, history: { replaceState() {} },
    document: {
      readyState: "complete", head: noopEl(), body: noopEl(), documentElement: noopEl(),
      createElement: noopEl, createTextNode: noopEl, getElementById: () => null,
      querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
    },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; ctx.addEventListener = () => {};
  if (store) ctx.PDXStore = store;
  const sb = vm.createContext(ctx);
  if (withLearn !== false) {
    vm.runInContext(readFileSync(join(ROOT, "pdx-learn.js"), "utf8"), sb, { filename: "pdx-learn.js" });
  }
  vm.runInContext(readFileSync(join(ROOT, "voting-record.js"), "utf8"), sb, { filename: "voting-record.js" });
  return ctx;
}
const newStore = () => {
  const slots = {};
  return { slots, read: (k, d) => (k in slots ? slots[k] : d), write: (k, v) => { slots[k] = v; } };
};

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

// Record fixtures. `isOmnibus` + 2 issues is what the surface treats as multi-issue.
const plain = { id: 1, number: "H.R. 100", chamber: "house", isProcedural: false, issues: [{ issueKey: "a" }] };
const proc = { id: 2, number: "H.R. 200", chamber: "house", isProcedural: true, issues: [{ issueKey: "a" }] };
const omni = {
  id: 3, number: "H.R. 1", chamber: "house", isOmnibus: true, isProcedural: false,
  issues: [{ issueKey: "a" }, { issueKey: "b" }],
};

// One note, and only one. Counting the wrapper class covers both note flavours
// (.pdxl-note from PDXLearn, .vr-teach for the pre-existing omnibus note).
const noteCount = (html) =>
  (html.match(/class="pdxl-note"/g) || []).length + (html.match(/class="vr-teach"/g) || []).length;

// ── 1. A first-time visitor gets the orientation note, and only that ──────────
{
  const ctx = load(newStore());
  ok(typeof ctx.window._vrTeachHtml === "function", "1: the note resolver is reachable");
  const html = ctx.window._vrTeachHtml([plain, proc, omni]);
  ok(noteCount(html) === 1, `1: exactly one note renders (got ${noteCount(html)})`);
  ok(html.includes('data-pdxl-note="vr-orientation"'), "1: it is the orientation note");
  ok(html.includes("New to voting records?"), "1: with the orientation copy");
  ok(!html.includes("vr-teach"), "1: the omnibus note does not also render");
  ok(!html.includes('data-pdxl-note="vr-procedural"'), "1: the procedural note does not also render");
  // It must actually teach the affordance it is describing.
  ok(html.includes("dotted underline"), "1: it names the affordance");
  ok(html.includes('data-pdx-term='), "1: it contains real tappable terms to demonstrate on");
}

// ── 2. Nothing to read → no note at all ──────────────────────────────────────
// A member with no record must not be greeted by a note about how to read one.
{
  const ctx = load(newStore());
  ok(ctx.window._vrTeachHtml([]) === "", "2: an empty record renders no note");
  ok(ctx.window._vrTeachHtml(undefined) === "", "2: missing items render no note");
}

// ── 3. Once the orientation note retires, the slot passes down the list ──────
{
  const store = newStore();
  let ctx = load(store);
  ok(ctx.window._vrTeachHtml([omni, proc]).includes("vr-orientation"), "3: orientation first");

  // The visitor opens a definition — the orientation note has done its job.
  ctx.window.PDXLearn.openTerm("hr", null, false);

  ctx = load(store); // next page view, same prefs
  let html = ctx.window._vrTeachHtml([omni, proc]);
  ok(noteCount(html) === 1, `3: still exactly one note (got ${noteCount(html)})`);
  ok(!html.includes("vr-orientation"), "3: orientation retired after a definition was opened");
  ok(html.includes("vr-teach"), "3: the omnibus note takes the slot next");
  ok(!html.includes('data-pdxl-note="vr-procedural"'), "3: procedural still waits its turn");

  // Dismiss the omnibus note the way the surface persists it.
  store.slots.pdx_voting_prefs = Object.assign({}, store.slots.pdx_voting_prefs, { omniNoteHidden: 1 });
  ctx = load(store);
  html = ctx.window._vrTeachHtml([omni, proc]);
  ok(noteCount(html) === 1, `3: still exactly one note (got ${noteCount(html)})`);
  ok(html.includes('data-pdxl-note="vr-procedural"'), "3: procedural takes the slot last");

  // And once everything is dismissed the surface is quiet.
  ctx.window.PDXLearn.dismissNote("vr-procedural");
  ctx = load(store);
  ok(ctx.window._vrTeachHtml([omni, proc]) === "", "3: all dismissed → no note, no nag");
}

// ── 4. A note only appears when the thing it explains is on screen ───────────
{
  const store = newStore();
  // Retire orientation so the topical notes are reachable.
  let ctx = load(store);
  ctx.window.PDXLearn.openTerm("hr", null, false);

  ctx = load(store);
  ok(ctx.window._vrTeachHtml([plain]) === "",
    "4: a record with no multi-issue and no procedural votes gets no topical note");
  ok(ctx.window._vrTeachHtml([plain, proc]).includes("vr-procedural"),
    "4: the procedural note appears only once a procedural vote is present");
  ok(ctx.window._vrTeachHtml([plain, omni]).includes("vr-teach"),
    "4: the omnibus note appears only once a multi-issue measure is present");
}

// ── 5. Without the education layer the surface is unchanged ──────────────────
// The orientation and procedural notes are PDXLearn-backed; the omnibus note is
// not. With PDXLearn absent the first two must vanish silently and the omnibus
// note must still work, exactly as it did before the education layer shipped.
{
  const ctx = load(newStore(), false); // pdx-learn.js never loads
  ok(ctx.window.PDXLearn === undefined, "5: the education layer really is absent");
  const html = ctx.window._vrTeachHtml([omni, proc]);
  ok(noteCount(html) === 1, `5: no PDXLearn → still exactly one note (got ${noteCount(html)})`);
  ok(html.includes("vr-teach"), "5: the pre-existing omnibus note is unaffected");
  ok(!html.includes("pdxl-note"), "5: the education-backed notes degrade to nothing");
  ok(ctx.window._vrTeachHtml([proc]) === "",
    "5: no PDXLearn and nothing else eligible → no note, no throw");
}

if (fails.length) {
  console.error("✗ vr-teach: " + fails.length + " failure(s)\n  " + fails.join("\n  "));
  process.exit(1);
}
console.log("✓ vr-teach: all assertions passed (5 cases — one note at a time, in priority order)");
