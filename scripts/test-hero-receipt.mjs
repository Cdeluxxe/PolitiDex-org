#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for the ABOVE-THE-FOLD HERO RECEIPT (hero-receipt-data.js + hero-receipt.js)
// ─────────────────────────────────────────────────────────────────────────────
// The hero receipt is the first and sometimes only thing a visitor reads. It
// carries a verdict about a named, living person on the front page of the site,
// and it renders from a precomputed seed rather than from the live engine — so
// the two failure modes worth gating are DRIFT (the seed says something the
// engine no longer says) and UNSOURCED PROOF (a verdict with nothing to check).
//
// This harness gates:
//
//   1. NO DRIFT — the shipped hero-receipt-data.js is byte-identical to what
//      scripts/gen-hero-receipt.mjs produces right now from the real
//      PDXReceipts.collect(). Editing the seed by hand, or changing the engine
//      without regenerating, fails here.
//   2. EVERY RECEIPT IS CHECKABLE — name, office line, action, verdict stamp and
//      an http(s) source URL on every single entry. No exceptions, no "mostly".
//   3. THE SEED IS A SUBSET, NOT A REWRITE — every entry's verdict stamp matches
//      the verdict the live engine assigns that same pid + issueKey, and every
//      entry traces back to a receipt the engine actually collected.
//   4. FAIL CLOSED — the renderer hides itself and paints nothing when the seed
//      is missing, empty, malformed, or carries an unsourced or unchecked entry.
//   5. NO INJECTION — hostile text in any field is escaped, never executed.
//   6. BALANCE — the seed is not a single-party wall and is not purely negative.
//   7. PAYLOAD — the critical-path cost stays small enough to justify itself.
//
//   node scripts/test-hero-receipt.mjs
//
// No database, no network, no browser. Exit code is non-zero on the first failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import vm from "node:vm";

import {
  OUT_PATH, MAX_RECEIPTS, collectFromEngine, buildHeroReceipts, buildHeroReceiptData,
} from "./gen-hero-receipt.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const failures = [];
let passed = 0;
const ok = (cond, msg) => { cond ? passed++ : failures.push(msg); };
const eq = (a, b, msg) => ok(Object.is(a, b), `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

// ── Render the seed through the real renderer, in a stub DOM ─────────────────
const RENDERER = readFileSync(join(ROOT, "hero-receipt.js"), "utf8");

function render(seed) {
  const host = {
    hidden: true, _html: "", attrs: {}, ops: [], onclick: null,
    addEventListener(_type, fn) { this.onclick = fn; },
    setAttribute(k, v) { this.attrs[k] = v; this.ops.push("attr:" + k); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
  };
  // A setter rather than a plain field, so the ORDER of paint vs. attribute is
  // observable — see section 8, where that order is the whole contract.
  Object.defineProperty(host, "innerHTML", {
    get() { return this._html; },
    set(v) { this._html = v; this.ops.push("html"); },
    configurable: true, enumerable: true,
  });
  const win = {
    console, Math, JSON,
    document: { getElementById: (id) => (id === "hero-receipt" ? host : null) },
    location: { hash: "" },
  };
  if (seed !== undefined) win.PDX_HERO_RECEIPT = seed;
  win.window = win;
  vm.runInContext(RENDERER, vm.createContext(win), { filename: "hero-receipt.js" });
  return host;
}

// Click "Next receipt" through the renderer's own delegated handler.
function clickNext(host) {
  host.onclick({ target: { closest: (sel) => (sel === ".pdx-hr-next" ? {} : null) } });
}

// ── 1. No drift ──────────────────────────────────────────────────────────────
const shipped = readFileSync(join(ROOT, OUT_PATH), "utf8");
const all = collectFromEngine(ROOT);
const rebuilt = buildHeroReceiptData(buildHeroReceipts(all));

ok(shipped === rebuilt,
  `drift: ${OUT_PATH} does not match the current engine output — run \`node scripts/gen-hero-receipt.mjs\``);
ok(all.length > 0, "drift: the engine collected at least one receipt to choose from");

const seed = JSON.parse(shipped.match(/window\.PDX_HERO_RECEIPT = ([\s\S]*?);\n\}\)\(\);/)[1]);
ok(seed.length > 0, "seed: the shipped seed is non-empty");
ok(seed.length <= MAX_RECEIPTS, `seed: at most ${MAX_RECEIPTS} receipts ride the critical path`);

// ── 2. Every receipt is checkable ────────────────────────────────────────────
for (const r of seed) {
  const who = r.pid || "(no pid)";
  ok(!!r.name, `checkable: ${who} has a name`);
  ok(!!r.sub, `checkable: ${who} has an office line — a bare name under a verdict is unplaceable`);
  ok(!!r.did, `checkable: ${who} states what was actually done`);
  ok(!!(r.verdict && r.verdict.label && r.verdict.key), `checkable: ${who} carries a verdict stamp`);
  ok(!!(r.source && /^https?:\/\//i.test(r.source.url || "")),
    `checkable: ${who} cites an http(s) source URL`);
  ok(!!(r.source && r.source.label), `checkable: ${who} names the outlet`);
  // A hero card claiming "Says One Thing · Does Another" must show both halves.
  if (r.verdict && r.verdict.key === "contradicts") {
    ok(!!(r.said && r.said.text),
      `checkable: ${who} is stamped a contradiction, so it must show the stated position too`);
  }
}

// ── 3. The seed is a subset of the engine, not a rewrite ─────────────────────
const byPid = new Map();
for (const r of all) if (!byPid.has(r.pid)) byPid.set(r.pid, r);

for (const r of seed) {
  const live = all.find((x) => x.pid === r.pid && (x.issueKey || "") === (r.issueKey || ""));
  ok(!!live, `subset: ${r.pid} / ${r.issueKey || "—"} still exists in the live engine's output`);
  if (!live) continue;
  eq(r.verdict.key, live.verdict.key, `subset: ${r.pid} verdict key matches the engine`);
  eq(r.verdict.label, live.verdict.label, `subset: ${r.pid} verdict label matches the engine verbatim`);
  eq(r.source.url, live.source.url, `subset: ${r.pid} source URL matches the engine`);
  eq(r.name, live.name, `subset: ${r.pid} name matches the engine`);
  // Text is trimmed for payload, but it must remain a PREFIX of the engine's own
  // wording — never a paraphrase, never a rewrite that shifts what was claimed.
  const stem = (s) => String(s || "").replace(/\s+/g, " ").trim().replace(/…$/, "");
  ok(stem(live.headline).startsWith(stem(r.did)),
    `subset: ${r.pid} "did" text is a verbatim prefix of the engine's headline`);
  if (r.said && live.said) {
    ok(stem(live.said.text).startsWith(stem(r.said.text)),
      `subset: ${r.pid} "said" text is a verbatim prefix of the engine's stated position`);
  }
  // Phase 3 lane boundary: the Official Record has its own surfaces and rules.
  // A floor vote must never be laundered into a Say-vs-Do card on the front page.
  ok(live.category !== "voting", `lane: ${r.pid} is not an Official Record vote`);
}

// ── 4. Fail closed ───────────────────────────────────────────────────────────
const bad = {
  "seed absent entirely": undefined,
  "seed is empty": [],
  "seed is not an array": { nope: true },
  "seed is null": null,
  "entry has no source": [{ name: "A", sub: "S", did: "d", verdict: { key: "contradicts", label: "L" } }],
  "entry source is not http": [{ name: "A", sub: "S", did: "d", verdict: { key: "contradicts", label: "L" }, source: { url: "javascript:alert(1)" } }],
  "entry has no verdict": [{ name: "A", sub: "S", did: "d", source: { url: "https://a.test/x" } }],
  "entry has no office line": [{ name: "A", did: "d", verdict: { key: "contradicts", label: "L" }, source: { url: "https://a.test/x" } }],
  "entry has no name": [{ sub: "S", did: "d", verdict: { key: "contradicts", label: "L" }, source: { url: "https://a.test/x" } }],
  "entry has no action": [{ name: "A", sub: "S", verdict: { key: "contradicts", label: "L" }, source: { url: "https://a.test/x" } }],
};
for (const [label, s] of Object.entries(bad)) {
  const host = render(s);
  ok(host.hidden === true && host.innerHTML === "",
    `fail-closed: renders nothing and stays hidden when ${label}`);
}

// The good path must actually render, or the gate above proves nothing.
{
  const host = render(seed);
  ok(host.hidden === false, "render: a valid seed reveals the slot");
  ok(/pdx-hr-card/.test(host.innerHTML), "render: a valid seed paints a receipt card");
  ok(/pdx-hr-stamp/.test(host.innerHTML), "render: the verdict stamp is painted");
  ok(/href="https?:\/\//.test(host.innerHTML), "render: the source is a real, followable link");
  ok(/rel="noopener noreferrer"/.test(host.innerHTML), "render: outbound source links are rel-protected");
}

// ── 4b. The lane boundary travels with the verdict ───────────────────────────
// A say-vs-do receipt is the PUBLIC lane and is deliberately outside Direction
// Match, the one percentage this product publishes. On a profile the row the
// receipt sits in draws that boundary; on the front page there is no row, and a
// stranger who meets a verdict stamp here and a percentage on a profile must not
// read the second as a score for the first.
//
// hero-receipt.js loads before consistency.js, so it mirrors the two canonical
// strings rather than reading PDXConsistency.LANE_LABELS. This is the pin on the
// mirror: the strings are lifted out of consistency.js's source and compared, so
// a rename there fails here instead of silently forking the vocabulary.
{
  const CONSISTENCY = readFileSync(join(ROOT, "consistency.js"), "utf8");
  const grab = (name) => {
    const m = new RegExp("var\\s+" + name + "\\s*=\\s*'([^']*)'").exec(CONSISTENCY);
    return m ? m[1] : null;
  };
  const LANE = grab("OTS_LANE"), SUB = grab("OTS_SUB"), TAG = grab("PUB_TAG");
  ok(!!LANE && !!SUB && !!TAG,
    "lane: consistency.js no longer declares OTS_LANE / OTS_SUB / PUB_TAG as plain strings — the mirror cannot be checked");
  const want = LANE + " · " + SUB;
  ok(RENDERER.includes("var LANE_FULL = '" + want + "';"),
    `lane: hero-receipt.js's mirrored lane name has drifted from consistency.js — expected "${want}"`);
  ok(RENDERER.includes("var LANE_TAG  = '" + TAG + "';"),
    `lane: hero-receipt.js's mirrored boundary tag has drifted from consistency.js — expected "${TAG}"`);

  const host = render(seed);
  ok(host.innerHTML.includes(want.replace(/&/g, "&amp;")),
    "lane: the card does not name the lane it belongs to");
  ok(host.innerHTML.includes(TAG), "lane: the card does not say the receipt is outside Direction Match");
  // The disclosure has to sit with the verdict, not below the fold of the card.
  ok(host.innerHTML.indexOf("pdx-hr-lane") > host.innerHTML.indexOf("pdx-hr-stamp") &&
     host.innerHTML.indexOf("pdx-hr-lane") < host.innerHTML.indexOf("pdx-hr-who"),
    "lane: the boundary is not printed with the verdict it qualifies");
  // And it stays count-free: this lane never carries a figure.
  ok(!/\d\s*%/.test(host.innerHTML), "lane: a percentage reached a public-lane card");
}

// One bad entry alongside good ones is dropped, not rendered.
{
  const host = render([{ name: "Unsourced", sub: "S", did: "d", verdict: { key: "contradicts", label: "L" } }, seed[0]]);
  ok(!/Unsourced/.test(host.innerHTML), "fail-closed: an unsourced entry is dropped from a mixed seed");
  ok(host.hidden === false, "fail-closed: the remaining sourced entry still renders");
}

// ── 5. No injection ──────────────────────────────────────────────────────────
{
  const host = render([{
    pid: '"><img src=x onerror=alert(1)>', issueKey: "k",
    name: "<script>alert(1)</script>", sub: "<b>S</b>", did: "A & B <em>x</em>",
    party: { label: '"><i>', color: "red;}" },
    said: { text: "</p><script>bad()</script>" },
    verdict: { key: "contradicts", ico: "<svg onload=x>", label: "L</div><script>y()</script>" },
    source: { url: "https://a.test/x?a=1&b=2", label: '"><b>' },
  }]);
  const h = host.innerHTML;
  ok(!/<script/i.test(h), "injection: no <script> tag is ever constructed from seed text");
  ok(!/<img|<svg|<b>|<i>|<em>/i.test(h), "injection: no markup is constructed from seed text");
  ok(h.includes("&lt;script&gt;"), "injection: hostile markup is escaped, not stripped silently");
  ok(h.includes("a=1&amp;b=2"), "injection: ampersands in source URLs are encoded");
}

// ── 6. Balance ───────────────────────────────────────────────────────────────
// The front page cannot read as a single party's rap sheet. These are structural
// gates, not editorial ones: they say the seed must be mixed, never which finding
// is allowed to appear.
{
  const parties = seed.map((r) => (r.party && r.party.label) || "?");
  const distinct = new Set(parties);
  ok(distinct.size > 1, `balance: the seed spans more than one party — got ${[...distinct].join(", ")}`);
  const counts = {};
  for (const p of parties) counts[p] = (counts[p] || 0) + 1;
  const top = Math.max(...Object.values(counts));
  ok(top <= Math.ceil(seed.length * 0.6),
    `balance: no party holds more than 60% of the seed — got ${JSON.stringify(counts)}`);

  const stamps = new Set(seed.map((r) => r.verdict.key));
  ok(stamps.has("consistent"),
    "balance: at least one 'words match actions' receipt rides along, so the hero is not purely negative");
  ok(stamps.has("contradicts"),
    "balance: at least one contradiction, or the hero is not showing the Say-vs-Do proposition");

  eq(new Set(seed.map((r) => r.pid)).size, seed.length,
    "balance: one receipt per person — nobody is the face of the hero twice");
}

// ── 7. Payload ───────────────────────────────────────────────────────────────
// These two files are parser-blocking in the head's critical path. That is only
// defensible while they stay small; this is the tripwire if the seed grows.
{
  const dataGz = gzipSync(Buffer.from(shipped)).length;
  const rendGz = gzipSync(Buffer.from(RENDERER)).length;
  ok(dataGz < 6 * 1024, `payload: seed is ${dataGz} B gzipped (budget 6 KB)`);
  ok(rendGz < 4 * 1024, `payload: renderer is ${rendGz} B gzipped (budget 4 KB)`);
  console.log(`  critical path: ${dataGz} B + ${rendGz} B = ${dataGz + rendGz} B gzipped`);
}

// ── 8. The swap is announced ──────────────────────────────────────────────────
// "Next receipt" replaces the entire card. A sighted reader sees that instantly;
// without a live region a screen-reader user hears nothing at all, because focus
// stays on a button whose label did not change. Two things have to hold:
//   • the region is on the host — the only node that survives a draw. A live
//     region nested inside the replaced markup is destroyed and rebuilt with it,
//     and a region that did not exist before a mutation does not announce it.
//   • it is armed AFTER the first paint, so loading the page does not read the
//     band aloud over whatever the visitor was already being told.
{
  const host = render(seed);
  eq(host.getAttribute("aria-live"), "polite",
    "a11y: the receipt band is a polite live region once it has painted");
  eq(host.ops.join(" → "), "html → attr:aria-live",
    "a11y: the first paint happens BEFORE the region is armed, so page load is silent");

  if (seed.length > 1) {
    clickNext(host);
    eq(host.ops.join(" → "), "html → attr:aria-live → html → attr:aria-live",
      "a11y: the region is already live when the next receipt paints, so the swap is announced");
    ok(host.innerHTML.indexOf("pdx-hr-pos") !== -1,
      "a11y: the position counter is inside the announced region, so \"2 of 6\" is spoken with it");
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`✖ ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  • " + f);
  process.exit(1);
}
console.log(`✓ ${passed} assertions passed — hero receipt: no drift, every claim sourced, fails closed`);
