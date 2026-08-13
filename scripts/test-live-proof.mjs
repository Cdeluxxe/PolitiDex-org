#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for the LIVE PROOF strip (live-proof.js)
// ─────────────────────────────────────────────────────────────────────────────
// The strip claims something no other homepage surface claims: that the record
// under it is LIVE — built in this browser, from votes this page actually
// loaded. A claim like that is only worth making if it is impossible to make
// falsely, so this harness gates the ways it could be:
//
//   1. FAIL CLOSED — no engine, no invitation list, no publishable cards, or
//      fewer than two of them, and the host stays [hidden] with nothing painted.
//      No skeleton, no placeholder, no "loading receipts…".
//   2. RE-HIDES — a strip that was showing and then rebuilds to nothing goes
//      back to hidden AND is emptied. A gate that only works on the first pass
//      is not a gate.
//   3. PUBLISHES FROM 'core' ONLY — a card one judged vote deep is true but
//      thin, and this strip's whole claim is depth.
//   4. THE PUBLIC GATE IS THE ONLY GATE — items come from publicCardsFor() +
//      publicTier(), never from a seed, a list, or logic of its own.
//   5. ONE PER MEMBER, NEWEST FIRST, CAPPED — no pile-on, real chronology,
//      no unbounded strip.
//   6. EVERY CHIP OPENS WHAT IT NAMES — the card's own `hash`, verbatim.
//   7. IT COSTS NOTHING — it never calls warm(), so "live" means "built from a
//      record this page really loaded", not "we went and fetched something".
//   8. NO INJECTION — hostile text in any field is escaped, never executed.
//   9. NOT A SAY-VS-DO SURFACE — an Official Record card must not open in the
//      Say-vs-Do lightbox.
//
//   node scripts/test-live-proof.mjs
//
// No database, no network, no browser. Exit code is non-zero on the first failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = readFileSync(join(ROOT, "live-proof.js"), "utf8");
// Source-shape assertions read CODE, not SRC: this file's own header explains the
// reuse policy by NAMING the calls it refuses to make, and a comment that says
// "never PDXReceipts.open()" must not read as a call to it.
const CODE = SRC.replace(/^\s*\/\/.*$/gm, "");
const INDEX = readFileSync(join(ROOT, "index.html"), "utf8");

const failures = [];
let passed = 0;
const ok = (cond, msg) => { cond ? passed++ : failures.push(msg); };
const eq = (a, b, msg) =>
  ok(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

// ── A card the way PDXReceiptCards builds one ────────────────────────────────
function card(over) {
  return Object.assign({
    pid: "member_a", issueKey: "guns",
    name: "Member A", sub: "U.S. Representative · Utah · UT-01",
    party: { label: "R", color: "#f87171" },
    issue: { icon: "🔫", label: "Gun Policy" },
    date: "2025-07-03",
    measureNumber: "H.R. 1",
    verdict: { key: "contradicts", label: "Says One Thing · Does Another", ico: "⚠" },
    hash: "#record=member_a~guns",
  }, over || {});
}

// ── Run the real module against a stub DOM ───────────────────────────────────
// `byPid` maps pid → the array publicCardsFor() returns. `tiers` maps a card's
// (pid~issueKey) to the tier publicTier() reports; anything unlisted is 'core'.
function run(opts) {
  const o = opts || {};
  const host = {
    hidden: true, _html: "", writes: 0, listener: null,
    addEventListener(_t, fn) { this.listener = fn; },
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = v; this.writes++; },
  };
  const timers = [];
  const calls = { publicCardsFor: [], publicTier: 0, warm: 0 };

  const win = {
    PDX_HERO_SHOWCASE: o.pool === undefined ? [{ pid: "member_a" }, { pid: "member_b" }] : o.pool,
    addEventListener() {},
    location: { hash: "" },
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
  };
  if (o.engine !== false) {
    win.PDXReceiptCards = {
      publicCardsFor(pid) {
        calls.publicCardsFor.push(pid);
        return (o.byPid && o.byPid[pid]) || [];
      },
      publicTier(c) {
        calls.publicTier++;
        const k = c.pid + "~" + c.issueKey;
        return o.tiers && Object.prototype.hasOwnProperty.call(o.tiers, k) ? o.tiers[k] : "core";
      },
      warm() { calls.warm++; },
    };
  }

  const doc = {
    readyState: "complete",
    getElementById: (id) => (id === "live-proof" ? host : null),
    createElement: () => ({ id: "", textContent: "" }),
    head: { appendChild() {} },
    documentElement: { appendChild() {} },
    addEventListener() {},
  };
  win.document = doc;
  win.window = win;

  vm.runInNewContext(SRC, win, { filename: "live-proof.js" });
  return { host, timers, calls, win };
}

// ── 1 · Fail closed ──────────────────────────────────────────────────────────
{
  const a = run({ engine: false });
  eq(a.host.hidden, true, "fail closed: no PDXReceiptCards → the strip stays hidden");
  eq(a.host.writes, 0, "fail closed: no engine → nothing is painted at all");

  const b = run({ pool: [] });
  eq(b.host.hidden, true, "fail closed: an empty invitation list paints nothing");
  eq(b.calls.publicCardsFor.length, 0, "fail closed: an empty list asks the gate nothing");

  const c = run({ byPid: {} });
  eq(c.host.hidden, true, "fail closed: members with no publishable card paint nothing");
  eq(c.host.writes, 0, "fail closed: no cards → no skeleton, no placeholder, no empty strip");

  const one = run({ byPid: { member_a: [card()] } });
  eq(one.host.hidden, true,
     "fail closed: a single publishable card is the hero receipt again, not a strip");
}

// ── 2 · It shows when there is real proof, and re-hides when there is not ─────
{
  const two = run({
    byPid: {
      member_a: [card()],
      member_b: [card({ pid: "member_b", issueKey: "health", name: "Member B",
                        date: "2025-09-11", hash: "#record=member_b~health" })],
    },
  });
  eq(two.host.hidden, false, "two publishable core cards from two members → the strip shows");
  ok(two.host._html.includes("Member A") && two.host._html.includes("Member B"),
     "both members appear in the strip");
  ok(two.host._html.indexOf("Member B") < two.host._html.indexOf("Member A"),
     "newest vote first — Sep 11 outranks Jul 3, by the card's own ISO date");

  // Same run, rebuilt against a shrunken record: the timed re-check must undo it.
  two.win.PDXReceiptCards.publicCardsFor = () => [];
  two.timers[0]();
  eq(two.host.hidden, true, "re-hides: a rebuild that comes back empty puts the gate back up");
  eq(two.host._html, "", "re-hides: the stale strip is emptied, not merely hidden");
}

// ── 3 · 'thin' never publishes ───────────────────────────────────────────────
{
  const thin = run({
    byPid: {
      member_a: [card()],
      member_b: [card({ pid: "member_b", issueKey: "health", name: "Member B",
                        hash: "#record=member_b~health" })],
    },
    tiers: { "member_b~health": "thin" },
  });
  eq(thin.host.hidden, true,
     "a card one judged vote deep is true but thin — it cannot make up the second slot");
}

// ── 4 · Malformed cards are dropped, not printed ─────────────────────────────
{
  for (const [field, bad] of [["date", ""], ["hash", ""], ["name", ""], ["verdict", null]]) {
    const r = run({
      byPid: {
        member_a: [card()],
        member_b: [card({ pid: "member_b", issueKey: "health", name: "Member B",
                          hash: "#record=member_b~health", [field]: bad })],
      },
    });
    eq(r.host.hidden, true,
       `a card with no ${field} cannot be printed — it would paint a dead chip`);
  }
}

// ── 5 · One per member, newest first, capped ─────────────────────────────────
{
  const many = run({
    pool: [{ pid: "m1" }, { pid: "m2" }, { pid: "m3" }, { pid: "m4" }],
    byPid: {
      m1: [card({ pid: "m1", issueKey: "a", name: "One", date: "2025-12-31", hash: "#record=m1~a" }),
           card({ pid: "m1", issueKey: "b", name: "One", date: "2025-01-01", hash: "#record=m1~b" })],
      m2: [card({ pid: "m2", issueKey: "a", name: "Two", date: "2025-02-02", hash: "#record=m2~a" })],
      m3: [card({ pid: "m3", issueKey: "a", name: "Three", date: "2025-03-03", hash: "#record=m3~a" })],
      m4: [card({ pid: "m4", issueKey: "a", name: "Four", date: "2025-04-04", hash: "#record=m4~a" })],
    },
  });
  const chips = many.host._html.match(/data-pdxlp-hash="/g) || [];
  eq(chips.length, 3, "the strip is capped at three chips");
  eq((many.host._html.match(/>One</g) || []).length, 1,
     "one chip per member — a member with two publishable cards is not a pile-on");
  ok(many.host._html.includes("#record=m1~a") && !many.host._html.includes("#record=m1~b"),
     "the member's own best card wins, in the order publicCardsFor already ranked");
  ok(many.host._html.indexOf(">One<") < many.host._html.indexOf(">Four<") &&
     many.host._html.indexOf(">Four<") < many.host._html.indexOf(">Three<"),
     "chips are ordered newest vote first across members");
  ok(!many.host._html.includes(">Two<"),
     "the cap drops the oldest, not a random three — Two's Feb vote is the one left out");
}

// ── 6 · Every chip opens exactly what it names ───────────────────────────────
{
  const r = run({
    byPid: {
      member_a: [card()],
      member_b: [card({ pid: "member_b", issueKey: "health", name: "Member B",
                        hash: "#record=member_b~health" })],
    },
  });
  ok(r.host._html.includes('data-pdxlp-hash="#record=member_a~guns"') &&
     r.host._html.includes('data-pdxlp-hash="#record=member_b~health"'),
     "each chip carries the card's own hash verbatim — it cannot open a different record");
  ok(/data-pdxlp-hash/.test(CODE) && !/#record=/.test(CODE),
     "the module never composes a record address of its own; it only forwards the card's");
}

// ── 7 · It costs nothing to fetch ────────────────────────────────────────────
{
  const r = run({ byPid: { member_a: [card()] } });
  eq(r.calls.warm, 0, "the strip never warms a member — it reads what the page already loaded");
  ok(!/\.warm\s*\(/.test(CODE), "no warm() call exists in the source at all");
}

// ── 8 · No injection ─────────────────────────────────────────────────────────
{
  const hostile = '<img src=x onerror="alert(1)">';
  const r = run({
    byPid: {
      member_a: [card({ name: hostile })],
      member_b: [card({ pid: "member_b", issueKey: "health", name: "Member B",
                        hash: '#record="><script>x</script>' })],
    },
  });
  ok(!r.host._html.includes("<img src=x"), "a hostile name is escaped, never executed");
  ok(!r.host._html.includes("<script>"), "a hostile hash cannot break out of its attribute");
  ok(r.host._html.includes("&lt;img"), "the hostile text is still shown, escaped");
}

// ── 9 · An Official Record card does not open on a Say-vs-Do surface ─────────
{
  ok(!/PDXReceipts\s*\.\s*open\s*\(/.test(CODE),
     "the strip never calls PDXReceipts.open() — a formal legislative action is not a Say-vs-Do receipt");
  ok(/handleHash/.test(CODE),
     "it hands off to receipt-cards.js's own arrival handler, the same path a shared image takes");
}

// ── 10 · Wired into the page, and into Door 1's gate ─────────────────────────
{
  ok(/<div id="live-proof" hidden><\/div>/.test(INDEX),
     "index: the host ships hidden and empty");
  ok(/<script src="\/live-proof\.js" defer><\/script>/.test(INDEX),
     "index: the module is deferred — it is below the fold and off the critical path");
  ok(!/live-proof\.css/.test(INDEX),
     "index: no stylesheet request — an empty strip costs the page nothing");
  const gate = (INDEX.match(/var IDS = \[[^\]]*\]/) || [""])[0];
  ok(gate.includes("'live-proof'"),
     "index: Door 1's header counts the strip among the surfaces it fails closed with");
  ok(INDEX.indexOf('id="live-proof"') > INDEX.indexOf('id="pdx-door-truth"') &&
     INDEX.indexOf('id="live-proof"') < INDEX.indexOf('id="say-vs-do"'),
     "index: the strip sits inside Door 1, under its header and above the receipts band");
}

// ── Report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ live-proof: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error("  ✗ " + f));
  console.error("");
  process.exit(1);
}
console.log(`✓ live-proof: ${passed} assertions passed`);
