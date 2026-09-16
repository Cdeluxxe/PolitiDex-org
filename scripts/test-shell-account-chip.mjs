#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for shell-account-chip.js — ONE account chip for the three side lanes
// ─────────────────────────────────────────────────────────────────────────────
// /mandate, /voice and /money are their own documents now, and each of them
// wants the one piece of chrome a reader looks for before anything else:
// whether they are signed in. The front page's version of that chip lives
// inside compare-hub.js — 758 KB of homepage engine — so the lanes carry this
// small owner of the same contract instead.
//
// The failure modes, every one of which ships looking fine:
//
//   1. THE FIRST PAINT IS "JOIN". This is the bug v208 was written to fix, at
//      three new addresses. Behind a deferred 800 KB SDK, the whole of a cold
//      load is 'unknown'; a returning member told to sign up in the loudest
//      control on the page has been lied to by their own account chip.
//   2. 'unknown' NEVER ENDS. If the SDK is blocked, offline or 404, the quiet
//      pill would sit there for the entire visit with no way to sign in. One
//      bound, six seconds, the same number compare-hub.js uses.
//   3. THE BOUND FIRES ON A DEVICE THAT KNOWS THE READER. For a device with a
//      remembered label, Join is the wrong claim no matter how long the wait
//      is — the inert chip has to stay.
//   4. A SECOND PAINTER. Three shells with three inline painters is three
//      answers to "am I signed in"; a copy that shadows an existing
//      updateNavAuth is two answers on one document.
//   5. THE CHIP GROWS. A Firestore read, a grid rebuild or a fan-out hung off
//      painting a pill is exactly what test-account-chip-cost.mjs §1 forbids on
//      the front page, and a small copy does not get a bigger budget.
//   6. THE LABEL BECOMES A CREDENTIAL, or this file starts writing it.
//      compare-hub.js mints pdx_last_account; one writer, or a sign-out on the
//      front page leaves a ghost these pages keep repainting.
//   7. THE MOUNT IS PRE-FILLED. A chip in the markup is a claim about the
//      reader made by a document that has never met them.
//
// Five sections:
//
//   1. THE THREE SHELLS MOUNT IT ONCE, and the mount ships empty.
//   2. THE THREE STATES — what each one actually paints.
//   3. THE COLD LOAD — first paint is never Join, remembered or not.
//   4. THE BOUND — six seconds, and who it does not apply to.
//   5. THE WALLS — no sign-in UI, no Firestore, no write, no second painter,
//      and the sheet that styles all three states.
//
//   node scripts/test-shell-account-chip.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const CHIP = R("shell-account-chip.js");
const HUB = R("compare-hub.js");
const SW = R("sw.js");
const CSS = R("shell-chrome.css");
const SHELLS = { "mandate.html": R("mandate.html"), "voice.html": R("voice.html"), "money.html": R("money.html") };

const blank = (m) => String(m).replace(/[^\n]/g, " ");
const cssBare = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, blank);
// Every claim about a document is made against its markup, not its prose. All
// three shells DOCUMENT what they refuse to load — "No compare-hub.js (758 KB)" —
// in a comment, and a substring test that cannot tell a refusal from a <script>
// tag fails on the sentence that promises the thing it is checking for.
const htmlBare = (s) => String(s).replace(/<!--[\s\S]*?-->/g, blank);
const jsBare = (s) => cssBare(s).replace(/^[ \t]*\/\/.*$/gm, blank);
const CODE = jsBare(CHIP);

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) => ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) => ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => { if (!cond) { failures.push(`FIXTURE: ${msg}`); report(); } else passed++; };

// ═════════════════════════════════════════════════════════════════════════════
// 1 · THE THREE SHELLS MOUNT IT ONCE
// ═════════════════════════════════════════════════════════════════════════════
section("1 · three shells, one painter, one empty mount");

for (const [f, src0] of Object.entries(SHELLS)) {
  const src = htmlBare(src0);
  has(src, '<script defer src="/shell-account-chip.js"></script>',
    `${f}: does not load the shared chip — its bar would have an empty account slot forever`);
  eq((src.match(/shell-account-chip\.js/g) || []).length, 1,
    `${f}: the chip file is referenced more than once`);
  // THE MOUNT, AND IT IS EMPTY. A pre-filled slot is a claim about a reader
  // this document has never met, and it is the claim v208 exists to stop.
  const m = /<div id="pdx-shell-acct"([^>]*)>([\s\S]*?)<\/div>/.exec(src);
  ok(!!m, `${f}: #pdx-shell-acct is not on the document`);
  if (m) {
    eq(m[2].trim(), "", `${f}: the account slot ships pre-rendered markup`);
    has(m[1], 'data-pdx-acct-sig="unknown"',
      `${f}: the slot does not declare its state as unknown — paint()'s signature guard reads this attribute, ` +
      "and a slot that starts blank invites a first paint of something else");
  }
  lacks(src, "Join the People",
    `${f}: the Join CTA is IN THE MARKUP — a cold load would show it before Firebase has answered, which is ` +
    "the whole of the bug this contract exists to prevent");
  // NO SECOND PAINTER. These shells do not load the homepage engine, and they
  // do not write an inline chip of their own.
  lacks(src, "compare-hub.js", `${f}: loads compare-hub.js — 758 KB of homepage engine to paint one pill`);
  eq((src.match(/updateNavAuth\s*=(?!=)/g) || []).length, 0,
    `${f}: the document assigns updateNavAuth itself — two painters is two answers to "am I signed in"`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 2 · THE THREE STATES
// ═════════════════════════════════════════════════════════════════════════════
section("2 · unknown is quiet, in is a chip, out is Join");

// One sandbox per case, with a real mount and a capturable timer, so every
// claim below is what the module actually writes rather than what this file
// believes it writes.
function run(opts) {
  const o = opts || {};
  const w = makeSandbox();
  const mount = { id: "pdx-shell-acct", innerHTML: "", _attrs: {},
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null; } };
  if (o.sig) mount.setAttribute("data-pdx-acct-sig", o.sig);
  w.document.getElementById = (id) => (o.noMount ? null : (id === "pdx-shell-acct" ? mount : null));
  w.document.readyState = "complete";
  if (o.auth !== undefined) w.PDXAuth = o.auth;
  if (o.last) w.localStorage = { getItem: (k) => (k === "pdx_last_account" ? JSON.stringify(o.last) : null), setItem() {}, removeItem() {} };
  const timers = [];
  w.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
  const ctx = vm.createContext(w);
  vm.runInContext(CHIP, ctx, { filename: "shell-account-chip.js" });
  return { w, mount, timers, fire: () => timers.forEach((t) => t.fn()) };
}

// 'unknown': the quiet pill, inert, and no address of any kind.
{
  const { mount } = run({ auth: { state: "unknown", user: null, known: false } });
  has(mount.innerHTML, "pdx-acct--wait", "unknown: the quiet pill is not painted");
  has(mount.innerHTML, "Checking account", "unknown: the caption v208 specified is gone");
  has(mount.innerHTML, 'aria-disabled="true"', "unknown: the pill is not marked inert");
  lacks(mount.innerHTML, "href", "unknown: the pill carries an address — a control that navigates on a guess");
  lacks(mount.innerHTML, "Join", "unknown: JOIN IS PAINTED BEFORE FIREBASE ANSWERED. This is the v208 bug.");
  eq(mount.getAttribute("data-pdx-acct-sig"), "unknown|", "unknown: the signature attribute was not updated");
}
// 'in': the chip, anchored at the one address that answers "my file".
{
  const { mount } = run({ auth: { state: "in", user: { displayName: "Ada", isAnonymous: false }, known: true } });
  has(mount.innerHTML, 'href="/me"', "in: the chip does not link to /me");
  has(mount.innerHTML, "Ada", "in: the reader's own label is not printed");
  has(mount.innerHTML, "pdx-acct--in", "in: the signed-in class is missing, so the sheet cannot style it");
  lacks(mount.innerHTML, "Join", "in: a signed-in reader is being offered Join");
  lacks(mount.innerHTML, "/mandate", "in: the chip links into a lane — /me is the one answer to \"my file\"");
}
// 'out': Join, and only now. It is a plain link to the room that owns sign-in.
{
  const { mount } = run({ auth: { state: "out", user: null, known: true } });
  has(mount.innerHTML, "Join the People", "out: the Join CTA is not painted once Firebase has answered");
  has(mount.innerHTML, 'href="/"', "out: Join is not a trip to the front page, which owns the sign-in modal");
  lacks(mount.innerHTML, "Checking", "out: the wait caption survives an answer");
}
// AN ANONYMOUS SESSION IS SIGNED OUT. The roster warm signs one in; it is not
// an account, and a chip that treats it as one names a stranger "Member".
{
  const { w } = run({ auth: { state: "", user: null, known: true } });
  const S = w.PDXShellChip;
  must(S && typeof S.state === "function", "shell-account-chip.js no longer publishes its state reader");
  eq(S.state({ isAnonymous: true, displayName: "Member" }), "out",
    "states: an anonymous session reads as signed IN — the roster warm would name every stranger a member");
  eq(S.state({ isAnonymous: false, displayName: "Ada" }), "in", "states: a real session does not read as signed in");
  eq(S.state(null, "unknown"), "unknown", "states: an explicit 'unknown' is overridden");
  eq(S.state(null, "bogus"), "out", "states: an unrecognised state does not fall through to the published one");
}

// ═════════════════════════════════════════════════════════════════════════════
// 3 · THE COLD LOAD
// ═════════════════════════════════════════════════════════════════════════════
section("3 · the first paint of a cold visit is never Join");

// NO PDXAuth AT ALL. This is the real first frame: the inline stub publishes
// 'unknown' and the chip runs before firebase-boot.js has said anything.
{
  const { mount } = run({ auth: undefined });
  lacks(mount.innerHTML, "Join",
    "cold: with no PDXAuth published at all the chip paints Join — a document whose SDK has not landed does not " +
    "know whether this reader has an account");
  has(mount.innerHTML, "Checking account", "cold: the quiet pill is not the first frame");
}
// A DEVICE THAT HAS PAINTED A CHIP BEFORE wears its own label, still inert.
// Nothing here claims anything that is not already true on this device.
{
  const { mount } = run({ auth: { state: "unknown", user: null, known: false }, last: { uid: "u1", label: "Ada" } });
  has(mount.innerHTML, "Ada", "remembered: the device's own label is not used during the wait");
  has(mount.innerHTML, "pdx-acct--wait", "remembered: the label is painted as a live chip rather than a waiting one");
  has(mount.innerHTML, 'aria-disabled="true"', "remembered: the remembered pill is not inert");
  lacks(mount.innerHTML, 'href="/me"',
    "remembered: the waiting pill is a working link to /me — the session behind it has not been confirmed");
}
// THE SIGNATURE GUARD. Firebase re-announces the same session several times per
// visit; a repaint per announcement throws away the markup it just wrote.
{
  const { w, mount } = run({ auth: { state: "in", user: { displayName: "Ada", isAnonymous: false }, known: true } });
  const firstHtml = mount.innerHTML;
  mount.innerHTML = "SENTINEL";
  w.PDXShellChip.paint({ displayName: "Ada", isAnonymous: false }, "in");
  eq(mount.innerHTML, "SENTINEL",
    "signature: the same session repainted the chip — compare-hub.js's guard exists because Firebase announces " +
    "one session many times");
  ok(firstHtml.indexOf("Ada") >= 0, "signature: the first paint did not happen at all");
  w.PDXShellChip.paint(null, "out");
  has(mount.innerHTML, "Join the People", "signature: a state CHANGE was swallowed by the guard");
}

// ═════════════════════════════════════════════════════════════════════════════
// 4 · THE BOUND
// ═════════════════════════════════════════════════════════════════════════════
section("4 · six seconds, and who it does not apply to");

const MS = (/var UNKNOWN_MS = (\d+);/.exec(CODE) || [, ""])[1];
eq(MS, "6000", "bound: UNKNOWN_MS is not six seconds");
const HUB_MS = (/var NAV_UNKNOWN_MS = (\d+);/.exec(jsBare(HUB)) || [, ""])[1];
eq(MS, HUB_MS,
  `bound: the lanes wait ${MS}ms and the front page waits ${HUB_MS}ms — one contract, one number, or the same ` +
  "reader gets two different answers depending on which door they came through");

// NO REMEMBERED ACCOUNT: the wait runs out and the reader gets a control.
{
  const { mount, fire } = run({ auth: { state: "unknown", user: null, known: false } });
  has(mount.innerHTML, "Checking account", "bound: the quiet pill is not the first frame");
  fire();
  has(mount.innerHTML, "Join the People",
    "bound: 'unknown' never ends on a device with no remembered account — a blocked SDK would leave a reader " +
    "with a spinner and no way to sign in for the whole visit");
}
// A REMEMBERED ACCOUNT: the pill stays. For this reader Join is the wrong
// claim no matter how long the wait is.
{
  const { mount, fire } = run({ auth: { state: "unknown", user: null, known: false }, last: { uid: "u1", label: "Ada" } });
  fire();
  lacks(mount.innerHTML, "Join",
    "bound: the timeout offered Join to a device that has painted this reader's own chip before");
  has(mount.innerHTML, "Ada", "bound: the remembered label was dropped by the timeout");
}
// AND THE BOUND DOES NOT FIGHT AN ANSWER. If Firebase landed first, the timer
// must not repaint over it.
{
  const { w, mount, fire } = run({ auth: { state: "unknown", user: null, known: false } });
  w.PDXAuth = { state: "in", user: { displayName: "Ada", isAnonymous: false }, known: true };
  w.PDXShellChip.paint(w.PDXAuth.user, "in");
  fire();
  has(mount.innerHTML, "Ada", "bound: the timeout repainted over a session Firebase had already announced");
  lacks(mount.innerHTML, "Join", "bound: the timeout offered Join to a signed-in reader");
}

// ═════════════════════════════════════════════════════════════════════════════
// 5 · THE WALLS
// ═════════════════════════════════════════════════════════════════════════════
section("5 · it paints a pill, and that is the whole job");

// NO SIGN-IN UI. The front page owns the modal; Join is a plain <a href="/">,
// which works with JavaScript off, on a middle-click and on a cmd-click.
["openAuthModal", "signInWithPopup", "signInWithEmail", "createUserWith", "GoogleAuthProvider"].forEach((n) =>
  lacks(CODE, n, `walls: the chip opens sign-in UI of its own (${n}) — the front page owns that room`));
// NO FIRESTORE, NO GRID, NO FAN-OUT. test-account-chip-cost.mjs §1 is that
// painting the chip paints the chip; a small copy gets a smaller budget, not a
// bigger one.
["collection(", "firestore", ".get()", "onSnapshot", "renderRelevantToMe", "myteamBrowseFilter"].forEach((n) =>
  lacks(CODE, n, `walls: painting a pill reads or rebuilds something (${n})`));
// NO WRITE TO THE LABEL. One writer, on the front page, or a sign-out there
// leaves a ghost these three documents would keep repainting.
lacks(CODE, "setItem", "walls: the chip writes storage — compare-hub.js mints pdx_last_account and it is the one writer");
lacks(CODE, "removeItem", "walls: the chip clears storage it does not own");
has(CODE, "localStorage.getItem", "walls: the chip no longer reads the remembered label, so a cold load has nothing honest to show");
// THE LABEL IS ESCAPED. It comes out of storage, and storage on a shared device
// is not a trusted source of markup.
has(CODE, "function esc(", "walls: there is no escaper");
ok(/esc\(label\)/.test(CODE), "walls: the label is interpolated into markup unescaped");
// NO SECOND updateNavAuth. If the document already has one, this file stands
// down rather than shadowing it.
has(CODE, "if (typeof window.updateNavAuth !== 'function')",
  "walls: the chip overwrites an existing updateNavAuth rather than standing down");
// NO PATH SNIFF. One file, three addresses, and six spellings of them.
lacks(CODE, "location.pathname",
  "walls: the chip sniffs the path — /mandate, /mandate/ and /mandate.html are three spellings of one document");
// NO MOUNT, NO PAINT, NO THROW: the courts.html contract, which is what lets
// the front page load this file harmlessly if it ever does.
{
  const { mount } = run({ noMount: true, auth: { state: "out", user: null, known: true } });
  eq(mount.innerHTML, "", "mount: the chip painted into a document that has no account slot");
}

// THE SHEET STYLES ALL THREE STATES, in the one place all three shells load.
const CSS_BARE = cssBare(CSS);
[".pdx-acct", ".pdx-acct--wait", ".pdx-acct--in", ".pdx-acct--join", ".pdx-acct-lb"].forEach((s) =>
  has(CSS_BARE, s, `css: shell-chrome.css has no rule for ${s} — that state would paint unstyled`));
ok(/prefers-reduced-motion[\s\S]{0,200}\.pdx-acct-dot \{ animation: none/.test(CSS_BARE),
  "css: the waiting dot animates for a reader who asked for no motion");

// PRECACHED WITH THE SHELLS THAT NEED IT. A room whose chip arrives late shows
// an empty account slot on exactly the visit a warm device should be fastest.
const SHELL_LIST = (/const SHELL_ASSETS = \[([\s\S]*?)\n\];/.exec(SW) || [, ""])[1];
must(!!SHELL_LIST, "sw.js no longer declares SHELL_ASSETS as one literal array");
["'/shell-account-chip.js'", "'/shell-chrome.css'"].forEach((a) =>
  has(SHELL_LIST, a, `sw: ${a} is not precached, and all three side lanes need it on first paint`));

// ═════════════════════════════════════════════════════════════════════════════
function report() {
  console.log(
    `\n${failures.length ? "✗" : "✓"} shell account chip: ${passed} checks passed` +
    (failures.length ? `, ${failures.length} failed` : "")
  );
  if (failures.length) {
    failures.forEach((f) => console.error(`   ✗ ${f}`));
    process.exit(1);
  }
}
report();
